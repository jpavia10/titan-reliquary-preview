#!/usr/bin/env python3
"""Photoreal theme art for Titan Reliquary, rendered procedurally in Blender (Cycles, CPU, OIDN denoise).

    pip install bpy pillow
    nice -n 10 python3 tools/art/render_themes.py --only kaleido --samples 64 --res 1600x1000
    python3 tools/art/render_themes.py --all           # one at a time
    python3 tools/art/render_themes.py --only kaleido --draft   # 800x500 / 24 samples, writes art/_masters/<n>-draft.png

Outputs: art/_masters/<name>.png (gitignored), art/themes/<name>.webp (1600x1000) and <name>-card.webp (640x400).
One function per theme below (register with @theme). Shared helpers live in kit.py.
"""
import argparse
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit as K  # noqa: E402
from kit import V, hexc  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
THEMES = {}
POST = {}


def theme(name, **post):
    def deco(fn):
        THEMES[name] = fn
        POST[name] = post
        return fn
    return deco


# --------------------------------------------------------------------------- kaleido
def _backlight_mat():
    m, nt = K._new_mat("backlight")
    tc = K.tex_coord(nt)
    n = K.noise(nt, scale=2.2, detail=3, rough=0.5, coord=tc)
    col = K.mix_rgb(nt, n.outputs["Fac"], hexc("#ff9f6a"), hexc("#ff7ad0"))
    col2 = K.mix_rgb(nt, K.maprange(nt, n.outputs["Fac"], 0.55, 0.9).outputs["Result"], col.outputs["Result"], hexc("#9fd8ff"))
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Strength"].default_value = 2.2
    nt.links.new(col2.outputs["Result"], e.inputs["Color"])
    K.finish(nt, e.outputs["Emission"])
    return m


@theme("kaleidoscope", bloom=0.35, bloom_r=0.01, grain=0.010, vignette=0.34, ca=2.2)
def kaleidoscope(scene):
    """Looking into a Victorian brass kaleidoscope: three first-surface mirrors, jewel-glass chips and a silver
    dollar in the object cell, lit from behind; everything else is the aubergine optician's parlour."""
    import bmesh
    rg = K.rng(11)
    S = 0.80                                   # global scale of the instrument
    K.world(top=hexc("#05030a"), horizon=hexc("#1a0f2a"), strength=0.5)
    side = 1.2
    ri = side / (2 * math.sqrt(3))            # inradius
    L = 5.4
    mirror = K.simple("mirror", (0.93, 0.92, 0.95, 1), rough=0.0, metal=1.0)
    for i in range(3):
        a = math.radians(90 + 120 * i)         # direction of the face normal (pointing outward)
        p = K.plane(f"mir{i}", 1, loc=(ri * math.cos(a), ri * math.sin(a), L / 2), sx=side / 2, sy=L / 2, mat=mirror)
        p.rotation_euler = (math.radians(90), 0, a - math.radians(90))
    # eyepiece: brass tube with a chunky bezel, hole radius ~ inradius so the view is a clean disc
    hole = ri * 0.985
    brass = K.m_brass("brass", rough=0.22)
    K.torus("bezel", hole + 0.06 * S, 0.06 * S, loc=(0, 0, -0.02), mat=brass, seg=160, rseg=32)
    bm = bmesh.new()
    segs = 192
    r0, r1 = hole + 0.02, 0.98 * S
    vi = [bm.verts.new((r0 * math.cos(2 * math.pi * i / segs), r0 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    vo = [bm.verts.new((r1 * math.cos(2 * math.pi * i / segs), r1 * math.sin(2 * math.pi * i / segs), 0)) for i in range(segs)]
    for i in range(segs):
        bm.faces.new((vi[i], vi[(i + 1) % segs], vo[(i + 1) % segs], vo[i]))
    face = K.from_bm("endface", bm, smooth=True)
    K.assign(face, K.m_brass("brass2", rough=0.3))
    for k, (R, r) in enumerate(((0.80, 0.025), (0.9, 0.04), (0.985, 0.05))):
        K.torus(f"ring{k}", R * S, r * S, loc=(0, 0, -0.02), mat=brass, seg=192, rseg=24)
    K.cylinder("tube", 0.98 * S, L + 1.3, loc=(0, 0, (L + 1.3) / 2), mat=brass, segs=192, caps=False)
    K.cylinder("cap", 0.97 * S, 0.04, loc=(0, 0, L + 0.8), mat=_backlight_mat(), segs=96)
    # jewel chips: dense, overlapping, in saturated glass
    jewels = ["#ee3f9a", "#8a5cff", "#18c7d4", "#ffb21e", "#27d68a", "#ff5a3c", "#4a6bff", "#ffd8f0", "#c01c6a"]
    for i in range(240):
        ang = rg.uniform(0, 2 * math.pi)
        rad = rg.uniform(0.0, 1.0) ** 0.6 * 0.62
        x, y = rad * math.cos(ang), rad * math.sin(ang)
        col = hexc(rg.choice(jewels))
        sz = rg.uniform(0.05, 0.12)
        K.gem(f"j{i}", rg, size=(sz, sz * rg.uniform(0.7, 1.2), sz * 0.5), loc=(x, y, L + 0.5 + rg.uniform(0, 0.35)),
              rot=(rg.uniform(-35, 35), rg.uniform(-35, 35), rg.uniform(0, 360)),
              mat=K.glass(f"jg{i}", col, ior=1.55, rough=0.0))
    for i in range(34):
        ang = rg.uniform(0, 2 * math.pi)
        rad = rg.uniform(0.1, 1.0) * 0.6
        K.sphere(f"b{i}", rg.uniform(0.03, 0.07), loc=(rad * math.cos(ang), rad * math.sin(ang), L + 0.6 + rg.uniform(0, 0.3)),
                 mat=K.glass(f"bg{i}", hexc(rg.choice(jewels)), ior=1.6, rough=0.0), segs=24)
    # the silver dollar in the cell, face toward the eyepiece (-Z), tilted so the relief catches the key light
    K.make_coin("coin", K.m_silver("silver", 1.18, rough=0.34, metal=0.8), radius=0.27, thick=0.06, relief=0.02, year="1921", seed=3,
                loc=(0.04, -0.03, L + 0.42), rot=(180 + 14, 8, 24), rings=220, segs=520, hres=1536)
    K.area("key", (0.45, 0.35, L - 0.15), (0.0, 0.0, L + 0.5), 0.5, 900, color=(1.0, 0.97, 0.92), visible_cam=False)
    K.area("fill", (-0.4, -0.3, L + 0.1), (0.0, 0.0, L + 0.5), 0.5, 120, color=(0.95, 0.6, 0.95), visible_cam=False)
    K.area("key2", (-0.2, 0.45, L - 0.1), (0.0, 0.0, L + 0.5), 0.4, 200, color=(0.7, 0.9, 1.0), visible_cam=False)
    # parlour: dark aubergine velvet far behind, warm bokeh lamps
    K.plane("backwall", 60, loc=(0, 0, 26), mat=K.m_velvet("wall", hexc("#2a1648")))
    for i in range(70):
        K.sphere(f"bk{i}", rg.uniform(0.12, 0.45), loc=(rg.uniform(-14, 14), rg.uniform(-8, 8), 22 - rg.uniform(0, 6)),
                 mat=K.emissive(f"bk{i}", hexc(rg.choice(["#ee6fd6", "#ffc6ee", "#a78bff", "#e8b45a", "#6fd6de", "#ffd08a"])),
                                rg.uniform(0.8, 3.0)), segs=32)
    # front-of-brass lighting (softboxes beside the camera) so the bezel and rings glint
    K.area("sbL", (-4.0, 3.2, -4.0), (0, 0, 0.0), 3.0, 2200, color=(1.0, 0.84, 0.66), size_y=1.2)
    K.area("sbR", (4.2, -1.8, -3.0), (0, 0, 0.0), 2.4, 900, color=(0.85, 0.55, 1.0), size_y=0.8)
    K.area("rim", (0.0, 4.5, 0.5), (0, 0, 0.5), 2.0, 1200, color=(1.0, 0.8, 0.9), size_y=0.5)
    K.camera((0, 0, -4.15), (0, 0, 3.0), lens=85, fstop=9.0, focus=4.4)


# --------------------------------------------------------------------------- kaleido = "Prism"
def _spectrum(t):
    """t in 0..1 (red -> violet) to a saturated linear RGB colour."""
    import colorsys
    h = (1 - t) * 0.78            # 0.78 = violet, 0 = red
    r, g, b = colorsys.hsv_to_rgb(h, 1.0, 1.0)
    return (r, g, b)


@theme("kaleido", bloom=0.5, bloom_r=0.012, grain=0.011, vignette=0.38, ca=2.6)
def prism(scene):
    """A jeweler's light-box: a white beam enters a crystal prism, fans into a spectrum and lands on a silver dollar
    standing on black obsidian. Beams are real spot lights in a thin haze, so the shafts are physically lit."""
    import bmesh
    rg = K.rng(5)
    K.world(top=hexc("#030208"), horizon=hexc("#0a0614"), strength=0.35)
    # obsidian floor (polished, slightly warm black) + faint micro-scratches
    floor = K.plane("floor", 60, loc=(0, 0, 0), mat=K.textured("obsidian", hexc("#07060a"), rough=0.05, metal=0.0, rvar=0.03,
                                                              scale=3, bump_str=0.05, bump_scale=300, specular_ior_level=0.9))
    # crystal prism: equilateral triangle, side 1.7, height 2.3, bevelled
    bm = bmesh.new()
    side, h = 1.7, 2.3
    R = side / math.sqrt(3)
    pts = [(R * math.cos(math.radians(90 + 120 * i)), R * math.sin(math.radians(90 + 120 * i))) for i in range(3)]
    b0 = [bm.verts.new((x, y, 0)) for x, y in pts]
    b1 = [bm.verts.new((x, y, h)) for x, y in pts]
    bm.faces.new(b0[::-1])
    bm.faces.new(b1)
    for i in range(3):
        bm.faces.new((b0[i], b0[(i + 1) % 3], b1[(i + 1) % 3], b1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.018, segments=3, profile=0.6, affect="EDGES")
    pr = K.from_bm("prism", bm, smooth=False)
    pr.location = (-0.3, 0.2, 0.0)
    pr.rotation_euler = (0, 0, math.radians(0))
    gm = K.glass("crystal", (0.97, 0.99, 1.0, 1), ior=1.55, rough=0.0, fake_shadow=False)
    K.assign(pr, gm)
    # beam geometry: entry from the left at height 1.15, aimed so the exit fan goes +X toward the coin
    zb = 1.15
    exit_pt = (0.38, 0.2, zb)
    coin_x = 6.3
    fan = [(-12 + 24 * i / 12.0) for i in range(13)]          # degrees, red -> violet, deliberately exaggerated
    K.fog_box((2.5, 0.0, 2.0), (22, 12, 5.5), density=0.045, anisotropy=0.55)
    K.spot("beam_in", (-6.5, 0.2, zb), (-0.9, 0.2, zb), 2600, color=(1, 0.98, 0.94), angle=3.2, blend=0.15, radius=0.012)
    for i, ang in enumerate(fan):
        t = i / (len(fan) - 1)
        c = _spectrum(t)
        tgt = (exit_pt[0] + math.cos(math.radians(ang)) * 6.0, exit_pt[1] + math.sin(math.radians(ang)) * 6.0, zb - 0.02 * i)
        K.spot(f"band{i}", exit_pt, tgt, 4200, color=c, angle=2.8, blend=0.25, radius=0.010)
    # silver dollar standing on its edge, face turned toward the prism and a little toward the camera
    K.make_coin("coin", K.m_silver("silver", 1.15, rough=0.3), radius=1.05, thick=0.14, relief=0.04, year="1921", seed=4,
                loc=(coin_x, 0.2, 1.06), rot=(90, 0, 90 + 28), rings=300, segs=800, hres=2048, wear=0.7)
    # soft strips for glass edge highlights and coin sheen
    K.area("stripL", (-4.5, -5.5, 3.2), (0, 0.2, 1.2), 0.25, 2200, color=(0.85, 0.9, 1.0), size_y=3.0)
    K.area("stripR", (7.5, -4.8, 2.8), (coin_x, 0.2, 1.2), 0.3, 900, color=(1.0, 0.9, 0.8), size_y=2.2)
    K.area("top", (2.5, -1.0, 6.0), (2.5, 0.2, 0.0), 1.5, 120, color=(0.7, 0.75, 1.0), size_y=6)
    # bokeh dust motes / distant lamps far behind
    for i in range(40):
        K.sphere(f"bk{i}", rg.uniform(0.08, 0.3), loc=(rg.uniform(-12, 18), rg.uniform(10, 24), rg.uniform(0.5, 7)),
                 mat=K.emissive(f"bk{i}", _spectrum(rg.random()) + (1,), rg.uniform(0.8, 3.5)), segs=32)
    K.camera((2.6, -10.5, 2.35), (2.6, 0.2, 1.0), lens=42, fstop=2.8, focus=10.6)


# --------------------------------------------------------------------------- driver
def render(name, res, samples, draft=False):
    scene = K.reset()
    K.setup_render(res=res, samples=samples, bounces=24 if name in ("kaleido", "kaleidoscope") else 12)
    THEMES[name](scene)
    mdir = os.path.join(ROOT, "art", "_masters")
    os.makedirs(mdir, exist_ok=True)
    raw = os.path.join(mdir, f"{name}{'-draft' if draft else ''}-raw.png")
    t = time.time()
    K.render_to(raw)
    print(f"  {name}: rendered {res} @ {samples} spp in {time.time() - t:.0f}s")
    out = os.path.join(mdir, f"{name}{'-draft' if draft else ''}.png")
    K.post(raw, out, **POST.get(name, {}))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma list of themes")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--samples", type=int, default=64)
    ap.add_argument("--res", default="1600x1000")
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--no-encode", action="store_true")
    a = ap.parse_args()
    names = list(THEMES) if a.all else (a.only or "").split(",")
    res = tuple(int(x) for x in a.res.split("x"))
    samples = a.samples
    if a.draft:
        res, samples = (800, 500), 24
    for n in names:
        if n not in THEMES:
            print("unknown theme", n, "available:", ", ".join(THEMES))
            continue
        png = render(n, res, samples, a.draft)
        if not a.draft and not a.no_encode:
            tdir = os.path.join(ROOT, "art", "themes")
            os.makedirs(tdir, exist_ok=True)
            K.encode_webp(png, os.path.join(tdir, f"{n}.webp"), os.path.join(tdir, f"{n}-card.webp"))


if __name__ == "__main__":
    main()
