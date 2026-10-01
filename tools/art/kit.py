"""Shared Blender (bpy / Cycles) helpers for the Titan Reliquary theme art.

Everything procedural: no downloaded textures, no HDRIs. See notes/agents/theme-art.md.
Units: 1 Blender unit = 1 coin radius-ish (a coin is radius 1.0 unless said otherwise).
"""
import math
import os
import random

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFilter, ImageFont

V = Vector
FONT_SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
FONT_SERIF_R = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
FONT_DJV = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


# --------------------------------------------------------------------------- scene / render
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def setup_render(res=(1600, 1000), samples=64, bounces=12, exposure=0.0, look="Medium High Contrast", threads=4,
                 clamp=10.0):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.render.resolution_x, s.render.resolution_y = res
    s.render.resolution_percentage = 100
    s.render.threads_mode = "FIXED"
    s.render.threads = threads
    c = s.cycles
    c.device = "CPU"
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.02
    c.max_bounces = bounces
    c.diffuse_bounces = min(6, bounces)
    c.glossy_bounces = bounces
    c.transmission_bounces = bounces
    c.transparent_max_bounces = bounces
    c.volume_bounces = 2
    c.sample_clamp_indirect = clamp
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    try:
        c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
        c.denoising_prefilter = "ACCURATE"
    except Exception:
        pass
    c.volume_step_rate = 1.5
    c.volume_max_steps = 128
    s.view_settings.view_transform = "AgX"
    for nm in ("AgX - " + look, look):
        try:
            s.view_settings.look = nm
            break
        except Exception:
            pass
    s.view_settings.exposure = exposure
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGB"
    s.render.image_settings.color_depth = "8"
    s.render.film_transparent = False
    return s


def render_to(path):
    s = bpy.context.scene
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


# --------------------------------------------------------------------------- nodes / materials
def hexc(h, a=1.0):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda x: ((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92  # sRGB -> linear
    return (f(r), f(g), f(b), a)


def _new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    return m, nt


def principled(nt, **kw):
    n = nt.nodes.new("ShaderNodeBsdfPrincipled")
    n.location = (0, 0)
    for k, v in kw.items():
        name = k.replace("_", " ")
        if name in n.inputs:
            n.inputs[name].default_value = v
    return n


def link(nt, a, ia, b, ib):
    nt.links.new(a.outputs[ia] if isinstance(ia, (int, str)) else ia, b.inputs[ib])


def out_node(nt):
    return next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")


def tex_coord(nt):
    return nt.nodes.new("ShaderNodeTexCoord")


def noise(nt, scale=5.0, detail=8.0, rough=0.55, coord=None, w=0.0, kind="obj", dist=0.0):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    if "Distortion" in n.inputs:
        n.inputs["Distortion"].default_value = dist
    tc = coord or tex_coord(nt)
    nt.links.new(tc.outputs["Object" if kind == "obj" else "Generated" if kind == "gen" else "UV"], n.inputs["Vector"])
    return n


def maprange(nt, src, lo, hi, a=0.0, b=1.0, clamp=True):
    m = nt.nodes.new("ShaderNodeMapRange")
    m.inputs["From Min"].default_value = lo
    m.inputs["From Max"].default_value = hi
    m.inputs["To Min"].default_value = a
    m.inputs["To Max"].default_value = b
    m.clamp = clamp
    nt.links.new(src, m.inputs["Value"])
    return m


def bump(nt, height_out, strength=0.3, dist=0.05):
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = strength
    b.inputs["Distance"].default_value = dist
    nt.links.new(height_out, b.inputs["Height"])
    return b


def mix_rgb(nt, fac, c1, c2, blend="MIX"):
    m = nt.nodes.new("ShaderNodeMix")
    m.data_type = "RGBA"
    m.blend_type = blend
    nt.links.new(fac, m.inputs["Factor"]) if not isinstance(fac, (int, float)) else setattr(m.inputs["Factor"], "default_value", fac)
    for sock, c in ((m.inputs["A"], c1), (m.inputs["B"], c2)):
        if isinstance(c, tuple):
            sock.default_value = c
        else:
            nt.links.new(c, sock)
    return m


def finish(nt, shader_out, vol=None, disp=None):
    o = out_node(nt)
    nt.links.new(shader_out, o.inputs["Surface"])
    if vol is not None:
        nt.links.new(vol, o.inputs["Volume"])
    if disp is not None:
        nt.links.new(disp, o.inputs["Displacement"])


def simple(name, color, rough=0.5, metal=0.0, **kw):
    m, nt = _new_mat(name)
    p = principled(nt, Base_Color=color if len(color) == 4 else color + (1,), Roughness=rough, Metallic=metal, **kw)
    finish(nt, p.outputs["BSDF"])
    return m


def textured(name, color, rough=0.5, metal=0.0, rvar=0.15, scale=6.0, bump_str=0.15, bump_scale=60.0, color2=None, **kw):
    """Principled surface with procedural roughness variation + fine bump (smudges, micro-grain)."""
    m, nt = _new_mat(name)
    p = principled(nt, Metallic=metal, **kw)
    n1 = noise(nt, scale=scale, detail=6, rough=0.6)
    r = maprange(nt, n1.outputs["Fac"], 0.3, 0.7, max(0, rough - rvar), min(1, rough + rvar))
    nt.links.new(r.outputs["Result"], p.inputs["Roughness"])
    if color2 is not None:
        n2 = noise(nt, scale=scale * 0.7, detail=5, rough=0.5)
        c = mix_rgb(nt, n2.outputs["Fac"], color, color2)
        nt.links.new(c.outputs["Result"], p.inputs["Base Color"])
    else:
        p.inputs["Base Color"].default_value = color
    nb = noise(nt, scale=bump_scale, detail=10, rough=0.7)
    b = bump(nt, nb.outputs["Fac"], bump_str, 0.02)
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    finish(nt, p.outputs["BSDF"])
    return m


def emissive(name, color, strength=10.0):
    m, nt = _new_mat(name)
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = color if len(color) == 4 else color + (1,)
    e.inputs["Strength"].default_value = strength
    finish(nt, e.outputs["Emission"])
    return m


def glass(name, color, ior=1.5, rough=0.0, absorb=None, fake_shadow=True):
    """Coloured glass. fake_shadow lets shadow rays pass (tinted) so lights stay low-noise."""
    m, nt = _new_mat(name)
    g = nt.nodes.new("ShaderNodeBsdfGlass")
    g.inputs["Color"].default_value = color if len(color) == 4 else color + (1,)
    g.inputs["IOR"].default_value = ior
    g.inputs["Roughness"].default_value = rough
    if fake_shadow:
        lp = nt.nodes.new("ShaderNodeLightPath")
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        tr.inputs["Color"].default_value = color if len(color) == 4 else color + (1,)
        mx = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(lp.outputs["Is Shadow Ray"], mx.inputs["Fac"])
        nt.links.new(g.outputs["BSDF"], mx.inputs[1])
        nt.links.new(tr.outputs["BSDF"], mx.inputs[2])
        finish(nt, mx.outputs["Shader"])
    else:
        finish(nt, g.outputs["BSDF"])
    return m


def assign(obj, mat, slot=None):
    if slot is None:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    else:
        while len(obj.data.materials) <= slot:
            obj.data.materials.append(None)
        obj.data.materials[slot] = mat


# --- named materials used by many themes
def m_silver(name="silver", tone=1.0, rough=0.26, metal=1.0, tarnish=0.55):
    c = (0.78 * tone, 0.78 * tone, 0.76 * tone, 1)
    return coin_material(name, c, (0.20, 0.17, 0.13, 1), rough=rough, tarnish=tarnish, metal=metal)


def m_gold(name="gold"):
    return coin_material(name, hexc("#e8b64a"), hexc("#5a3510"), rough=0.2, tarnish=0.4)


def m_bronze(name="bronze"):
    return coin_material(name, hexc("#b8763c"), hexc("#2a160a"), rough=0.3, tarnish=0.7)


def coin_material(name, base, dark, rough=0.25, tarnish=0.5, metal=1.0):
    """Metal coin: ambient-occlusion toning in the recesses, roughness smudges, micro scratches."""
    m, nt = _new_mat(name)
    p = principled(nt, Metallic=metal)
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = 0.09
    ao.samples = 8
    ao.inputs["Color"].default_value = (1, 1, 1, 1)
    r = maprange(nt, ao.outputs["AO"], 0.25, 0.95, 1.0, 0.0)  # 1 where occluded
    nz = noise(nt, scale=30, detail=7, rough=0.6)
    mixf = nt.nodes.new("ShaderNodeMath")
    mixf.operation = "MULTIPLY"
    nt.links.new(r.outputs["Result"], mixf.inputs[0])
    nt.links.new(maprange(nt, nz.outputs["Fac"], 0.25, 0.75, 0.55, 1.15).outputs["Result"], mixf.inputs[1])
    mixf2 = nt.nodes.new("ShaderNodeMath")
    mixf2.operation = "MULTIPLY"
    mixf2.inputs[1].default_value = tarnish
    nt.links.new(mixf.outputs["Value"], mixf2.inputs[0])
    mixf2.use_clamp = True
    col = mix_rgb(nt, mixf2.outputs["Value"], base, dark)
    nt.links.new(col.outputs["Result"], p.inputs["Base Color"])
    n2 = noise(nt, scale=22, detail=6, rough=0.5)
    rr = maprange(nt, n2.outputs["Fac"], 0.3, 0.7, rough * 0.7, rough * 1.5)
    # tarnished (occluded) areas are rougher
    ra = nt.nodes.new("ShaderNodeMath")
    ra.operation = "ADD"
    nt.links.new(rr.outputs["Result"], ra.inputs[0])
    nt.links.new(mixf2.outputs["Value"], ra.inputs[1])
    ra.use_clamp = True
    nt.links.new(ra.outputs["Value"], p.inputs["Roughness"])
    nb = noise(nt, scale=140, detail=3, rough=0.8)
    b = bump(nt, nb.outputs["Fac"], 0.08, 0.01)
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    finish(nt, p.outputs["BSDF"])
    return m


def m_brass(name="brass", rough=0.28):
    return textured(name, hexc("#c9953c"), rough=rough, metal=1.0, rvar=0.12, scale=4, bump_str=0.1, bump_scale=90,
                    color2=hexc("#7a5420"))


def m_chrome(name="chrome", rough=0.04):
    return textured(name, (0.9, 0.9, 0.92, 1), rough=rough, metal=1.0, rvar=0.03, scale=3, bump_str=0.02)


def m_velvet(name, color, sheen=(0.9, 0.9, 0.9, 1)):
    m, nt = _new_mat(name)
    p = principled(nt, Base_Color=color, Roughness=0.85, Sheen_Weight=1.0, Sheen_Roughness=0.35)
    if "Sheen Tint" in p.inputs:
        p.inputs["Sheen Tint"].default_value = sheen
    nb = noise(nt, scale=500, detail=2, rough=0.9)
    b = bump(nt, nb.outputs["Fac"], 0.25, 0.01)
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    finish(nt, p.outputs["BSDF"])
    return m


def m_marble(name, c1, c2, vein=hexc("#8a8a90"), rough=0.12, scale=2.2):
    m, nt = _new_mat(name)
    p = principled(nt, Roughness=rough, Specular_IOR_Level=0.6)
    tc = tex_coord(nt)
    n = noise(nt, scale=scale, detail=12, rough=0.62, coord=tc, dist=1.2)
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.wave_type = "BANDS"
    wv.bands_direction = "DIAGONAL"
    wv.inputs["Scale"].default_value = 2.0
    wv.inputs["Distortion"].default_value = 9.0
    wv.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    nt.links.new(n.outputs["Fac"], wv.inputs["Phase Offset"]) if "Phase Offset" in wv.inputs else None
    vr = maprange(nt, wv.outputs["Fac"], 0.55, 0.9, 0.0, 1.0)
    base = mix_rgb(nt, n.outputs["Fac"], c1, c2)
    col = mix_rgb(nt, vr.outputs["Result"], base.outputs["Result"], vein)
    nt.links.new(col.outputs["Result"], p.inputs["Base Color"])
    finish(nt, p.outputs["BSDF"])
    return m


def m_wood(name, c1, c2, rough=0.35, scale=3.0, stretch=(1, 14, 1)):
    """Walnut-ish: stretched noise + wave rings, satin varnish."""
    m, nt = _new_mat(name)
    p = principled(nt, Roughness=rough, Coat_Weight=0.4, Coat_Roughness=0.1)
    tc = tex_coord(nt)
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (stretch[0] * scale, stretch[1] * scale, stretch[2] * scale)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 1.0
    n.inputs["Detail"].default_value = 10
    n.inputs["Roughness"].default_value = 0.6
    n.inputs["Distortion"].default_value = 0.6
    nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = 1.2
    wv.inputs["Distortion"].default_value = 6.0
    wv.inputs["Detail"].default_value = 3
    nt.links.new(mp.outputs["Vector"], wv.inputs["Vector"])
    f = nt.nodes.new("ShaderNodeMath")
    f.operation = "ADD"
    nt.links.new(n.outputs["Fac"], f.inputs[0])
    nt.links.new(wv.outputs["Fac"], f.inputs[1])
    col = mix_rgb(nt, maprange(nt, f.outputs["Value"], 0.4, 1.4).outputs["Result"], c1, c2)
    nt.links.new(col.outputs["Result"], p.inputs["Base Color"])
    b = bump(nt, n.outputs["Fac"], 0.2, 0.01)
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    finish(nt, p.outputs["BSDF"])
    return m


def m_stone(name, c1, c2, rough=0.8, scale=3.0, bump_s=0.6, sub=None):
    m, nt = _new_mat(name)
    p = principled(nt, Roughness=rough)
    n = noise(nt, scale=scale, detail=12, rough=0.65)
    col = mix_rgb(nt, maprange(nt, n.outputs["Fac"], 0.35, 0.65).outputs["Result"], c1, c2)
    nt.links.new(col.outputs["Result"], p.inputs["Base Color"])
    n2 = noise(nt, scale=scale * 6, detail=12, rough=0.7)
    b = bump(nt, n2.outputs["Fac"], bump_s, 0.05)
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    finish(nt, p.outputs["BSDF"])
    return m


# --------------------------------------------------------------------------- lights / world / camera
def world(top=(0.02, 0.02, 0.03), horizon=None, strength=1.0, bottom=None):
    w = bpy.data.worlds.new("W")
    w.use_nodes = True
    bpy.context.scene.world = w
    nt = w.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_WORLD":
            nt.nodes.remove(n)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    if horizon is None:
        bg.inputs["Color"].default_value = top if len(top) == 4 else top + (1,)
    else:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = 0.0
        mr.inputs["From Max"].default_value = 1.0
        nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        cs = ramp.color_ramp.elements
        cs[0].position = 0.35
        cs[0].color = (bottom or horizon) if len((bottom or horizon)) == 4 else (bottom or horizon) + (1,)
        cs[1].position = 0.75
        cs[1].color = top if len(top) == 4 else top + (1,)
        mid = cs.new(0.5)
        mid.color = horizon if len(horizon) == 4 else horizon + (1,)
        nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    o = next(n for n in nt.nodes if n.type == "OUTPUT_WORLD")
    nt.links.new(bg.outputs["Background"], o.inputs["Surface"])
    return w


def look_at(obj, target, up="Y"):
    d = (V(target) - obj.location)
    obj.rotation_euler = d.to_track_quat("-Z", up).to_euler()


def area(name, loc, target, size, power, color=(1, 1, 1), size_y=None, shape=None, spread=None, visible_cam=True):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = color[:3]
    ld.size = size
    if size_y:
        ld.shape = "RECTANGLE"
        ld.size_y = size_y
    elif shape:
        ld.shape = shape
    if spread is not None:
        ld.spread = math.radians(spread)
    o = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(o)
    o.location = loc
    look_at(o, target)
    o.visible_camera = visible_cam
    if not visible_cam:
        o.visible_glossy = False
        o.visible_transmission = False
    return o


def spot(name, loc, target, power, color=(1, 1, 1), angle=40, blend=0.4, radius=0.05):
    ld = bpy.data.lights.new(name, "SPOT")
    ld.energy = power
    ld.color = color[:3]
    ld.spot_size = math.radians(angle)
    ld.spot_blend = blend
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(o)
    o.location = loc
    look_at(o, target)
    return o


def point(name, loc, power, color=(1, 1, 1), radius=0.05):
    ld = bpy.data.lights.new(name, "POINT")
    ld.energy = power
    ld.color = color[:3]
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(o)
    o.location = loc
    return o


def sun(name, rot_deg, power, color=(1, 1, 1), angle=1.0):
    ld = bpy.data.lights.new(name, "SUN")
    ld.energy = power
    ld.color = color[:3]
    ld.angle = math.radians(angle)
    o = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(o)
    o.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    return o


def camera(loc, target, lens=85, fstop=4.0, focus=None, sensor=36.0, roll=0.0):
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_width = sensor
    cd.clip_start = 0.01
    cd.clip_end = 400
    cd.dof.use_dof = fstop is not None
    if fstop:
        cd.dof.aperture_fstop = fstop
        cd.dof.focus_distance = focus if focus else (V(target) - V(loc)).length
    o = bpy.data.objects.new("cam", cd)
    bpy.context.collection.objects.link(o)
    o.location = loc
    look_at(o, target)
    if roll:
        o.rotation_euler.rotate_axis("Z", math.radians(roll))
    bpy.context.scene.camera = o
    return o


# --------------------------------------------------------------------------- geometry
def link_obj(name, mesh):
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return o


def from_bm(name, bm, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    return link_obj(name, me)


def plane(name, size, loc=(0, 0, 0), rot=(0, 0, 0), sx=None, sy=None, mat=None, subdiv=0):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=max(1, subdiv + 1), y_segments=max(1, subdiv + 1), size=1.0)
    o = from_bm(name, bm, smooth=False)
    o.scale = ((sx or size), (sy or size), 1)
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    if mat:
        assign(o, mat)
    return o


def box(name, size, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, bevel=0.0, segs=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, profile=0.7, affect="EDGES")
    o = from_bm(name, bm, smooth=bevel > 0)
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    if mat:
        assign(o, mat)
    return o


def cylinder(name, r, h, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, segs=96, bevel=0.0, r2=None, caps=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r, radius2=(r if r2 is None else r2),
                          depth=h)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=3, profile=0.7, affect="EDGES")
    o = from_bm(name, bm, smooth=True)
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    if mat:
        assign(o, mat)
    return o


def sphere(name, r, loc=(0, 0, 0), mat=None, segs=48):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=r)
    o = from_bm(name, bm)
    o.location = loc
    if mat:
        assign(o, mat)
    return o


def torus(name, R, r, loc=(0, 0, 0), rot=(0, 0, 0), mat=None, seg=96, rseg=24):
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ring = []
        for j in range(rseg):
            b = 2 * math.pi * j / rseg
            x = (R + r * math.cos(b)) * math.cos(a)
            y = (R + r * math.cos(b)) * math.sin(a)
            z = r * math.sin(b)
            ring.append(bm.verts.new((x, y, z)))
        verts.append(ring)
    for i in range(seg):
        for j in range(rseg):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % rseg], verts[i][(j + 1) % rseg]))
    o = from_bm(name, bm)
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    if mat:
        assign(o, mat)
    return o


def gem(name, rng, size=(0.3, 0.3, 0.12), loc=(0, 0, 0), rot=(0, 0, 0), mat=None, n=14):
    """Faceted shard: convex hull of jittered points on a flattened ellipsoid."""
    bm = bmesh.new()
    pts = []
    for _ in range(n):
        u = rng.uniform(0, 2 * math.pi)
        v = rng.uniform(-1, 1)
        s = math.sqrt(1 - v * v)
        pts.append((size[0] * s * math.cos(u) * rng.uniform(0.8, 1.05), size[1] * s * math.sin(u) * rng.uniform(0.8, 1.05),
                    size[2] * v))
    for p in pts:
        bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=list(bm.verts))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    o = from_bm(name, bm, smooth=False)
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    if mat:
        assign(o, mat)
    return o


# --------------------------------------------------------------------------- coins
def _font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default(size)


def _arc_text(draw, text, cx, cy, radius, mid_angle_deg, size, fill=255, font=FONT_SERIF, bottom=False, spacing=1.0):
    """Draw text along a circle. bottom=True reads left-to-right along the lower arc."""
    f = _font(font, size)
    widths = [draw.textlength(ch, font=f) * spacing for ch in text]
    total = sum(widths)
    ang_total = total / radius
    a = math.radians(mid_angle_deg) + (ang_total / 2 if not bottom else -ang_total / 2)
    for ch, w in zip(text, widths):
        da = w / radius
        am = a - da / 2 if not bottom else a + da / 2
        # glyph on its own layer, rotated to tangent
        gs = size * 2
        layer = Image.new("L", (gs, gs), 0)
        ImageDraw.Draw(layer).text((gs / 2, gs / 2), ch, font=f, fill=255, anchor="mm")
        rot = math.degrees(am) - 90 if not bottom else math.degrees(am) + 90
        layer = layer.rotate(rot, resample=Image.BICUBIC, expand=False)
        px = cx + radius * math.cos(am)
        py = cy - radius * math.sin(am)
        draw._image.paste(fill, (int(px - gs / 2), int(py - gs / 2)), layer)
        a = a - da if not bottom else a + da


def coin_height(res=2048, style="dollar", year="1921", top="LIBERTY", bottom="IN GOD WE TRUST", seed=1, wear=0.5):
    """Height map 0..1 (1 = highest relief) of a stylised coin face. Polar mapping done by the mesh."""
    rng = np.random.default_rng(seed)
    N = res
    c = N / 2
    R = N / 2 * 0.985
    img = Image.new("L", (N, N), 0)
    d = ImageDraw.Draw(img)
    # field level (low), raised rim, beaded ring
    d.ellipse((c - R, c - R, c + R, c + R), fill=70)
    rim_o, rim_i = R, R * 0.925
    d.ellipse((c - rim_o, c - rim_o, c + rim_o, c + rim_o), fill=255)
    d.ellipse((c - rim_i, c - rim_i, c + rim_i, c + rim_i), fill=70)
    # dentils / beads inside the rim
    nb = 120
    for i in range(nb):
        a = 2 * math.pi * i / nb
        rr = R * 0.885
        x, y = c + rr * math.cos(a), c - rr * math.sin(a)
        b = N * 0.0055
        d.ellipse((x - b, y - b, x + b, y + b), fill=200)
    if style == "dollar":
        # sun rays
        for i in range(36):
            a = 2 * math.pi * i / 36
            a1, a2 = a - 0.04, a + 0.04
            r0, r1 = R * 0.22, R * 0.62
            pts = [(c + r0 * math.cos(a), c - r0 * math.sin(a)),
                   (c + r1 * math.cos(a1), c - r1 * math.sin(a1)),
                   (c + r1 * math.cos(a2), c - r1 * math.sin(a2))]
            d.polygon(pts, fill=150)
        # central disc + numerals
        r0 = R * 0.28
        d.ellipse((c - r0, c - r0, c + r0, c + r0), fill=210)
        d.ellipse((c - r0 * 0.86, c - r0 * 0.86, c + r0 * 0.86, c + r0 * 0.86), fill=120)
        f = _font(FONT_SERIF, int(N * 0.11))
        d.text((c, c), "$1", font=f, fill=255, anchor="mm")
        # laurel
        for k in range(2):
            for i in range(14):
                t = 0.15 + 0.7 * i / 13
                a = math.radians(-70 - 22 * 1) if k == 0 else math.radians(-110 + 22 * 1)
                th = math.radians(200 + 140 * t) if k == 0 else math.radians(-20 - 140 * t)
                rr = R * 0.70
                x, y = c + rr * math.cos(th), c - rr * math.sin(th)
                lw, lh = N * 0.02, N * 0.045
                leaf = Image.new("L", (int(lh * 3), int(lh * 3)), 0)
                ImageDraw.Draw(leaf).ellipse((lh * 1.5 - lw, lh * 1.5 - lh, lh * 1.5 + lw, lh * 1.5 + lh), fill=235)
                leaf = leaf.rotate(math.degrees(th) + 90 + (35 if k == 0 else -35), resample=Image.BICUBIC)
                img.paste(235, (int(x - lh * 1.5), int(y - lh * 1.5)), leaf)
        _arc_text(d, top, c, c, R * 0.80, 90, int(N * 0.085), font=FONT_SERIF, spacing=1.25)
        _arc_text(d, bottom, c, c, R * 0.805, 270, int(N * 0.05), font=FONT_SERIF, bottom=True, spacing=1.2)
        f = _font(FONT_SERIF, int(N * 0.058))
        d.text((c, c + R * 0.52), year, font=f, fill=255, anchor="mm")
        for sx in (-1, 1):
            for j in range(3):
                x = c + sx * R * (0.72 + 0.0)
                y = c - R * (0.17 - 0.17 * j)
                _star(d, x, y, N * 0.022, 255)
    elif style == "ancient":
        # laureate head-ish medallion: concentric rings and a Greek-key band, big central meander star
        for k, rr in enumerate((0.78, 0.74)):
            d.ellipse((c - R * rr, c - R * rr, c + R * rr, c + R * rr), outline=210, width=int(N * 0.006))
        for i in range(24):
            a = 2 * math.pi * i / 24
            _star(d, c + R * 0.82 * math.cos(a), c - R * 0.82 * math.sin(a), N * 0.014, 220)
        _star(d, c, c, N * 0.2, 255, pts=8, inner=0.55)
        _star(d, c, c, N * 0.12, 150, pts=8, inner=0.5)
        f = _font(FONT_SERIF, int(N * 0.07))
        d.text((c, c + R * 0.5), year, font=f, fill=255, anchor="mm")
        _arc_text(d, top, c, c, R * 0.62, 90, int(N * 0.065), font=FONT_SERIF, spacing=1.3)
    h = img.filter(ImageFilter.GaussianBlur(N * 0.0018))
    a = np.asarray(h, dtype=np.float32) / 255.0
    # wear: high points abraded, fine noise
    nz = rng.normal(0, 1, (N // 8, N // 8)).astype(np.float32)
    nz = np.asarray(Image.fromarray(((nz - nz.min()) / (nz.max() - nz.min()) * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC),
                    dtype=np.float32) / 255.0
    a = a - wear * 0.07 * np.clip(a - 0.5, 0, 1) * nz
    a = a + 0.012 * (rng.normal(0, 1, (N, N)).astype(np.float32))
    return np.clip(a, 0, 1)


def _star(d, x, y, r, fill, pts=5, inner=0.4):
    P = []
    for i in range(pts * 2):
        a = math.pi / pts * i - math.pi / 2
        rr = r if i % 2 == 0 else r * inner
        P.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d.polygon(P, fill=fill)


def make_coin(name="coin", mat=None, radius=1.0, thick=0.16, relief=0.045, style="dollar", year="1921", top="LIBERTY",
              bottom="IN GOD WE TRUST", seed=1, rings=260, segs=720, hres=2048, wear=0.5, loc=(0, 0, 0), rot=(0, 0, 0)):
    """A coin as a real mesh: polar grid displaced by a text-derived height map, reeded edge, flat reverse."""
    H = coin_height(hres, style, year, top, bottom, seed, wear)
    N = H.shape[0]

    def samp(u, v):  # bilinear
        x = u * (N - 1)
        y = v * (N - 1)
        x0 = np.clip(np.floor(x).astype(int), 0, N - 2)
        y0 = np.clip(np.floor(y).astype(int), 0, N - 2)
        fx, fy = x - x0, y - y0
        return (H[y0, x0] * (1 - fx) * (1 - fy) + H[y0, x0 + 1] * fx * (1 - fy) + H[y0 + 1, x0] * (1 - fx) * fy
                + H[y0 + 1, x0 + 1] * fx * fy)

    r = np.linspace(0.0, 1.0, rings)[:, None] ** 0.9
    th = np.linspace(0, 2 * math.pi, segs, endpoint=False)[None, :]
    u = 0.5 + 0.5 * 0.985 * r * np.cos(th)
    v = 0.5 - 0.5 * 0.985 * r * np.sin(th)
    z = thick / 2 + relief * samp(u, v)
    X = radius * r * np.cos(th) * np.ones_like(z)
    Y = radius * r * np.sin(th) * np.ones_like(z)
    top_v = np.stack([X, Y, z], -1).reshape(-1, 3)
    # rim wall + bottom face
    ztop = z[-1]
    wall_top = np.stack([radius * np.cos(th[0]), radius * np.sin(th[0]), ztop], -1)
    wall_bot = np.stack([radius * np.cos(th[0]), radius * np.sin(th[0]), -thick / 2 * np.ones(segs)], -1)
    bot_c = np.array([[0, 0, -thick / 2]])
    verts = np.concatenate([top_v, wall_top, wall_bot, bot_c])
    nt0 = rings * segs
    faces = []
    idx = np.arange(rings * segs).reshape(rings, segs)
    a = idx[:-1, :]
    b = idx[:-1, (np.arange(segs) + 1) % segs]
    c2 = idx[1:, (np.arange(segs) + 1) % segs]
    d2 = idx[1:, :]
    quads = np.stack([a, b, c2, d2], -1).reshape(-1, 4)
    # centre fan: first ring collapsed -> degenerate quads become tris; keep as quads (zero-area ok)
    wt = nt0 + np.arange(segs)
    wb = nt0 + segs + np.arange(segs)
    wq = np.stack([wt, wb, np.roll(wb, -1), np.roll(wt, -1)], -1)
    bc = nt0 + 2 * segs
    bf = np.stack([wb, np.roll(wb, -1), np.full(segs, bc)], -1)
    # last top ring to wall_top shares position with idx[-1]; connect
    lt = idx[-1]
    wq2 = np.stack([lt, np.roll(lt, -1), np.roll(wt, -1), wt], -1)
    me = bpy.data.meshes.new(name)
    allf = [q.tolist() for q in quads] + [q.tolist() for q in wq2] + [q.tolist() for q in wq] + [t.tolist() for t in bf]
    # drop degenerate centre quads' repeated vertex
    clean = []
    for f in allf:
        if len(set(f)) == len(f):
            clean.append(f)
        else:
            u2 = list(dict.fromkeys(f))
            if len(u2) >= 3:
                clean.append(u2)
    me.from_pydata(verts.tolist(), [], clean)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    o = link_obj(name, me)
    o.location = loc
    o.rotation_euler = tuple(math.radians(a) for a in rot)
    if mat:
        assign(o, mat)
    return o


# --------------------------------------------------------------------------- volumes / fx
def fog_box(center, size, density=0.02, anisotropy=0.5, color=(1, 1, 1, 1), name="fog"):
    o = box(name, size, loc=center)
    m, nt = _new_mat(name)
    v = nt.nodes.new("ShaderNodeVolumeScatter")
    v.inputs["Density"].default_value = density
    v.inputs["Anisotropy"].default_value = anisotropy
    v.inputs["Color"].default_value = color
    out = out_node(nt)
    nt.links.new(v.outputs["Volume"], out.inputs["Volume"])
    o.data.materials.append(m)
    o.display_type = "WIRE"
    o.visible_shadow = False
    return o


def sprinkle(n, fn, rng):
    for i in range(n):
        fn(i, rng)


def rng(seed):
    return random.Random(seed)


# --------------------------------------------------------------------------- post-processing (PIL/numpy)
def post(path_in, path_out, bloom=0.25, bloom_r=0.012, grain=0.012, vignette=0.28, ca=1.2, lift=0.0, tint=None, warm=0.0):
    """Photographic finish: highlight bloom, chromatic fringe, vignette, film grain. Writes PNG master."""
    im = Image.open(path_in).convert("RGB")
    W, Hh = im.size
    a = np.asarray(im, dtype=np.float32) / 255.0
    if ca:
        r = np.asarray(im.split()[0].transform(im.size, Image.AFFINE, (1 + ca / 2000, 0, -ca * W / 4000, 0, 1 + ca / 2000, -ca * Hh / 4000),
                                                 resample=Image.BICUBIC), dtype=np.float32) / 255
        b = np.asarray(im.split()[2].transform(im.size, Image.AFFINE, (1 - ca / 2000, 0, ca * W / 4000, 0, 1 - ca / 2000, ca * Hh / 4000),
                                                 resample=Image.BICUBIC), dtype=np.float32) / 255
        a[..., 0] = r
        a[..., 2] = b
    if bloom:
        lum = a.max(-1, keepdims=True)
        hi = np.clip((lum - 0.72) / 0.28, 0, 1) ** 1.5 * a
        himg = Image.fromarray((np.clip(hi, 0, 1) * 255).astype(np.uint8))
        acc = np.zeros_like(a)
        for k, wgt in ((1, 0.5), (2.5, 0.3), (6, 0.2)):
            acc += wgt * np.asarray(himg.filter(ImageFilter.GaussianBlur(W * bloom_r * k)), dtype=np.float32) / 255.0
        a = 1 - (1 - a) * (1 - np.clip(acc * bloom, 0, 1))
    if vignette:
        yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
        rr = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - Hh / 2) / (Hh / 2)) ** 2) / 1.414
        a *= (1 - vignette * rr ** 2.2)[..., None]
    if lift:
        a = a * (1 - lift) + lift
    if warm:
        a[..., 0] *= 1 + warm
        a[..., 2] *= 1 - warm
    if grain:
        g = np.random.default_rng(7).normal(0, grain, (Hh, W, 1)).astype(np.float32)
        lum = a.mean(-1, keepdims=True)
        a = a + g * (0.4 + 0.6 * (1 - np.abs(lum - 0.5) * 2))
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path_out)
    return path_out


def encode_webp(png, out_full, out_card, full=(1600, 1000), card=(640, 400), max_full=250_000, max_card=60_000):
    im = Image.open(png).convert("RGB")
    for path, size, cap in ((out_full, full, max_full), (out_card, card, max_card)):
        r = im.resize(size, Image.LANCZOS)
        q = 82
        while True:
            r.save(path, "WEBP", quality=q, method=6)
            if os.path.getsize(path) <= cap or q <= 40:
                break
            q -= 4
        print(f"  {os.path.basename(path)} {os.path.getsize(path)//1024} KB q={q}")
