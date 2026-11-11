/* wings/plate.js: every theme is a photograph (owner 2026-11-08: "I explicitly didnt want 3d worlds because your implementation is poor ...
   have my slaves make super high quality third spaces as images then layering on it to get 3d effects or other features"; "Do it for all
   50"). One WebGL2 canvas (#tr-plate, z 0, behind the app) shows the current theme's photograph with the app's own live layers on it:
   relief parallax on its depth, the light mask's flicker, glow and shafts, an aurora, caustics or lightning where the room has them,
   particles in three depths (dust in the light, rain, snow, embers, bubbles, fireflies, leaves) and a film grain. The same canvas is
     the backdrop  behind the collection: dimmed a little, 30 frames a second, it drifts slowly and shifts with a scroll or the mouse;
     the opening  after the 1080p film (splash.js through TitanRoom.engineOpening): the camera pushes into the photo as its light comes up;
     the room     Step inside (wings/room-shell.js): full brightness, drag to pan, pinch, tap, tilt, Look sliders;
     the Atmosphere's live view behind the theme picker.
   The photographs come from the image AIs through the art queue as layer sets (art/rooms/{id}/: back.webp, front.webp = the nearest
   object on its own layer, map.webp = depth + light; tools/rooms/prep_plates.py). All 50 themes have their set since 2026-11-11
   (artreq_20261108-1500). A theme without one would fall back to its own picture (art/themes/{id}.webp) with a depth and light map
   estimated from it (tools/rooms/prep_hero_plates.py; "hero" below).
   Nothing here is drawn as a scene: no code-built world loads any more (fx/kit.js K.worlds = false).

   TitanPlate.has(id) / .list / .current() / .whenReady(id, ms) / .opening({dur, onTitle, onEnd}) -> { seek(t, hold), stop() }
     .arrive(id) / .room(id) -> the room's handle / .look, .getLook(id, k), .setLook(id, k, v), .resetLook(id) / .debug()
   TitanRoomPlate.has(id) / .mount(box, id) = the room's handle (wings/room-shell.js). */
(function () {
  "use strict";
  var html = document.documentElement;
  var SCRIPT = document.querySelector('script[src*="wings/plate.js"]');
  var BASE = (function () { var m = SCRIPT && /^(.*?)wings\/plate\.js/.exec(SCRIPT.getAttribute("src")); return m ? m[1] : ""; })();
  var VER = (function () { var m = SCRIPT && /\?v=([^&]+)/.exec(SCRIPT.src); return m ? "?v=" + m[1] : ""; })();

  /* per theme: name of the room, pan0 = where an upright phone starts across the wide photo (-1 left .. 1 right: on the subject),
     tint = the colour of its light, and o: d dust, r rain, s snow, e embers, b bubbles, f fireflies, l leaves, sl rain slant,
     fl flicker + hz, sh shafts, au aurora, ca caustics, lt lightning, dep depth, lit light strength, light = a light theme (no dimming),
     fd = the front object's depth (a full layer set from the art queue; without it the theme's own picture stands in) */
  function C(name, pan0, tint, o) {
    o = o || {};
    return { name: name, pan0: pan0, tint: tint, fx1: [o.d || 0, o.r || 0, o.s || 0, o.e || 0], fx2: [o.b || 0, o.f || 0, o.l || 0, o.sl || 0],
      flick: o.fl || 0, hz: o.hz || 1, shaft: o.sh || 0, aurora: o.au || 0, caustics: o.ca || 0, lightning: o.lt || 0,
      dep: o.dep == null ? 1 : o.dep, lit: o.lit == null ? 1 : o.lit, light: !!o.light, fd: o.fd || 0, hero: !o.fd };
  }
  var P = {
    afterhours: C("The gallery after closing", 0, [.78, .86, 1], { d: 1, sh: 1, fd: .563 }),
    neon: C("The alley in the rain", 0, [1, .55, .92], { r: 1, sl: .12, fl: .22, hz: 9, fd: .508 }),
    zen: C("The garden at first light", -.2, [1, .9, .74], { d: .6, l: 1, sh: .7, fd: .889 }),
    supercell: C("Out on the plains", -.1, [1, .8, .6], { r: 1, sl: .32, lt: 1, fd: .935 }),
    abyss: C("The wreck", -.45, [.55, .9, 1], { d: .8, b: 1, sh: 1, ca: 1, fd: .83 }),
    colossus: C("The Mint by night", 0, [1, .56, .26], { d: .5, e: 1, fl: .3, hz: 3, sh: .4, fd: .8 }),
    dynasty: C("The lantern pond", .3, [1, .42, .22], { f: 1, fl: .18, hz: 2, fd: .934 }),
    glacier: C("Inside the ice", .35, [.62, .92, 1], { s: 1, fl: .05, hz: 2, sh: .6, au: 1, fd: .821 }),
    valhalla: C("The hall by hearthfire", 0, [1, .6, .3], { d: .5, e: 1, fl: .3, hz: 4, sh: .8, fd: .744 }),
    kaleido: C("The prism room", .3, [1, .95, .9], { d: .5, sh: .6, fd: .892 }),
    conservator: C("The conservator's desk", 0, [1, .92, .8], { d: .4, light: 1, lit: .4, fd: .943 }),
    nocturne: C("The jazz cellar", -.1, [1, .75, .45], { d: .5, fl: .12, hz: 2, sh: .5, fd: .879 }),
    odyssey: C("On deck at first light", .2, [1, .75, .45], { d: .4, fl: .25, hz: 3, fd: .923 }),
    cursedwing: C("The closed wing", 0, [1, .6, .3], { d: .6, fl: .35, hz: 4, fd: .85 }),
    notepad: C("The white gallery", 0, [1, 1, 1], { light: 1, dep: .7, lit: .4, fd: .918 }),
    construct: C("The terminal room", -.4, [.45, 1, .55], { d: .3, fl: .08, hz: 12, fd: .838 }),
    xeno: C("The containment lab", .1, [.45, .95, 1], { b: 1, fl: .05, hz: 2, fd: .984 }),
    solaris: C("The solar observatory", 0, [1, .8, .5], { d: .3, f: .3, fl: .1, hz: 2, fd: .914 }),
    alchemist: C("The alchemist's study", 0, [1, .7, .4], { d: .4, e: .6, fl: .3, hz: 3, fd: .903 }),
    samadhi: C("The meditation hall", 0, [1, .8, .62], { d: .5, sh: .5, fl: .1, hz: 2, fd: .977 }),
    silkroad: C("The caravanserai", .1, [1, .8, .55], { d: .4, fl: .15, hz: 3, fd: .948 }),
    arcade: C("The arcade", 0, [1, .5, 1], { d: .2, fl: .1, hz: 8, dep: .8, fd: .668 }),
    pulp: C("The treasure chamber", 0, [1, .9, .5], { light: 1, d: .6, sh: .8, fl: .2, hz: 3, fd: .449 }),
    drafting: C("The drafting room", .3, [1, .85, .6], { d: .6, sh: .4, fd: .652 }),
    diorama: C("The clay vault", -.3, [1, .95, .85], { light: 1, d: .2, dep: .8, lit: .6, fd: .945 }),
    bauhaus: C("The Bauhaus workshop", -.3, [1, 1, 1], { light: 1, dep: .7, lit: .4, fd: .909 }),
    terminal: C("The station hall", -.1, [.85, .9, 1], { d: .8, sh: 1, fd: .928 }),
    obsidian: C("The obsidian sun", -.25, [1, .8, .4], { e: .3, d: .3, fl: .1, hz: 2, fd: .909 }),
    lightwell: C("The light well", .1, [1, .85, .6], { d: 1, sh: 1, fd: .954 }),
    saltflat: C("The salt mirror", .35, [1, .78, .68], { d: .15, fd: .735 }),
    sahel: C("The heliostat towers", 0, [1, .8, .5], { d: .9, sl: .3, sh: .6, fd: .927 }),
    orbit: C("The cupola", 0, [.7, .85, 1], { d: .2, fd: .973 }),
    glasshouse: C("The palm house in the rain", 0, [1, .8, .5], { r: .7, d: .3, fl: .05, hz: 2, fd: .91 }),
    canopy: C("The cloud forest", .1, [1, .95, .7], { d: .7, f: .4, l: .5, sh: 1, fd: .915 }),
    silverscreen: C("The picture palace", 0, [.9, .92, 1], { d: 1, sh: 1, fl: .15, hz: 18, fd: .96 }),
    darkroom: C("The darkroom", .1, [1, .25, .18], { d: .3, fl: .03, fd: .885 }),
    tourbillon: C("The watchmaker's bench", -.2, [1, .85, .6], { d: .3, sh: .3, fd: .813 }),
    kintsugi: C("The tea room", .4, [1, .8, .4], { d: .3, fl: .05, hz: 2, fd: .933 }),
    horizon: C("The event horizon", .3, [1, .6, .3], { d: .3, fl: .05, fd: .697 }),
    rift: C("The garage at 2 a.m.", .1, [.45, 1, .55], { d: .5, fl: .15, hz: 6, fd: .829 }),
    lumen: C("The light grid", 0, [.45, .8, 1], { d: .3, fl: .1, hz: 4, fd: .945 }),
    ferro: C("The ferrofluid", 0, [.6, .75, 1], { d: .2, fd: .671 }),
    marbled: C("The bindery", -.3, [1, .95, .85], { light: 1, d: .4, dep: .8, lit: .6, fd: .817 }),
    cathedral: C("The nave at dusk", 0, [1, .85, .7], { d: .9, sh: 1, fd: .926 }),
    contour: C("The map room", 0, [.45, .85, 1], { d: .3, fl: .05, hz: 2, fd: .669 }),
    banknote: C("The engraving workshop", 0, [1, 1, 1], { light: 1, d: .4, dep: .8, lit: .6, fd: .88 }),
    freefall: C("The physics lab", 0, [1, .95, .85], { d: .4, fd: .807 }),
    sketch: C("The attic studio", 0, [1, 1, 1], { light: 1, d: .3, dep: .8, lit: .5, fd: .626 }),
    papercut: C("The paper hills", 0, [1, .95, .85], { light: 1, d: .15, dep: .7, lit: .6, fd: .631 }),
    y2k: C("The chrome lounge", -.1, [1, .92, 1], { light: 1, d: .2, dep: .8, lit: .5, fd: .821 })
  };
  var LOOK = [
    { id: "light", label: "Light", min: 0, max: 1.6, def: 1 },
    { id: "parts", label: "Particles", min: 0, max: 1.6, def: 1 },
    { id: "depth", label: "Depth", min: 0, max: 1.6, def: 1 },
    { id: "grain", label: "Film grain", min: 0, max: 1.5, def: .6 }
  ];
  var KEY = "titan.plate.look.v1", BACK_DIM = .8;
  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function lsSet(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode: this visit only */ } }
  var LK = lsGet(), DEF = {}; LOOK.forEach(function (c) { DEF[c.id] = c.def; });
  function getLook(id, k) { var s = LK[id]; return s && s[k] != null ? s[k] : DEF[k] != null ? DEF[k] : 1; }
  function setLook(id, k, v) { if (DEF[k] == null || !isFinite(+v)) return; LK[id] = LK[id] || {}; LK[id][k] = +v; lsSet(LK); poke(); }
  function resetLook(id) { delete LK[id]; lsSet(LK); poke(); }
  var GL2 = null;
  function gl2() { if (GL2 == null) { try { GL2 = !!window.WebGL2RenderingContext && !!document.createElement("canvas").getContext("webgl2"); } catch (e) { GL2 = false; } } return GL2; }
  function has(id) { return !!P[id] && !!window.WebGL2RenderingContext; }
  var TOUCH = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  function lite() { try { return localStorage.getItem("tr_lite_v1") === "1"; } catch (e) { return false; } }
  function still() { var m = html.dataset.motion; return m === "calm" || m === "off" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches && m !== "full"); }
  function tier() { try { var q = window.TitanQuality && TitanQuality.tier && String(TitanQuality.tier()).toLowerCase(); if (/^(low|medium|high|ultra|max)$/.test(q)) return q; } catch (e) { /* ignore */ } return "high"; }
  function theme() { return html.dataset.atmo || "afterhours"; }
  function upright() { return innerHeight > innerWidth; }

  var VS = "#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
  var FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uBack, uFront, uMap;",
    "uniform vec2 uRes, uImg, uPan, uCam;",
    "uniform float uZoom, uTime, uLight, uParts, uDepth, uGrain, uFrontD, uFlash, uFlick, uHz, uShaft, uAur, uCaus, uDim, uExpo, uSharp, uHasF;",
    "uniform int uIt, uLay;",
    "uniform vec3 uTint, uTap;",
    "uniform vec4 uFx1, uFx2;",
    "out vec4 o;",
    "float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }",
    "float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);",
    "  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }",
    "vec2 img(vec2 fr){ float s = max(uRes.x / uImg.x, uRes.y / uImg.y) * uZoom; vec2 vis = uRes / (uImg * s);",
    "  vec2 c = .5 + uPan * max(vec2(0.), 1. - vis) * .5; return c + (fr - uRes * .5) / (uImg * s); }",
    "float dot1(vec2 q, float sz, float seed, float keep){ vec2 c = floor(q), f = fract(q); if (h1(c + seed) > keep) return 0.;",
    "  vec2 at = .2 + .6 * h2(c + seed * 1.7); return smoothstep(sz, sz * .2, length(f - at)); }",
    "void main(){",
    "  vec2 fr = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);",
    "  vec2 uv = img(fr); float t = uTime;",
    "  float asp = uImg.x / uImg.y;",
    "  float ring = 0.; vec2 tdir = vec2(0.);",
    "  if (uTap.z >= 0. && uTap.z < 2.4) { vec2 d = (fr / uRes - uTap.xy) * vec2(uRes.x / uRes.y, 1.); float r = length(d);",
    "    ring = exp(-pow((r - uTap.z * .42) * 18., 2.)) * (1. - uTap.z / 2.4); tdir = d / max(r, 1e-4); }",
    "  uv += tdir * ring * .006;",
    /* relief parallax: the photo's own depth decides how far each point moves with the camera (near moves most) */
    "  vec2 cam = uCam * uDepth; vec2 b = uv;",
    "  for (int i = 0; i < 6; i++) { if (i >= uIt) break; float d = texture(uMap, clamp(b, .001, .999)).r; b = uv - cam * (d - .35); }",
    "  b = clamp(b, .001, .999);",
    "  vec3 col = texture(uBack, b).rgb;",
    "  if (uSharp > 0.) { vec2 tx = 1. / uImg;",
    "    vec3 nb = texture(uBack, b + vec2(tx.x, 0.)).rgb + texture(uBack, b - vec2(tx.x, 0.)).rgb + texture(uBack, b + vec2(0., tx.y)).rgb + texture(uBack, b - vec2(0., tx.y)).rgb;",
    "    col += (col - nb * .25) * uSharp; }",
    "  float L = texture(uMap, b).g, Lb = textureLod(uMap, b, 3.).g, Lw = textureLod(uMap, b, 5.).g;",
    "  float lamp = vn(vec2(t * uHz + h1(floor(b * vec2(7., 4.))) * 40., h1(floor(b * vec2(7., 4.)) + 3.) * 9.));",
    "  float fl = 1. + uFlick * (lamp - .5) * 2.;",
    "  col += col * L * (fl - 1.) * 1.3 * uLight;",
    /* glow and shafts are screened on: they lift the dark around a light, never push a lit area to white */
    "  vec3 add = uTint * (Lb * .26 + Lw * .14) * fl * uLight;",
    "  if (uShaft > 0.) { float s = vn(b * vec2(9., 3.) + vec2(t * .12, -t * .05)) * vn(b * vec2(3., 11.) - vec2(t * .07, 0.));",
    "    add += uTint * L * s * .4 * uShaft * uLight; }",
    "  col = 1. - (1. - col) * (1. - clamp(add, 0., 1.));",
    "  if (uAur > 0.) { float a = Lb * smoothstep(.42, .05, b.y) * (.55 + .45 * vn(vec2(b.x * 9. + t * .25, t * .12)));",
    "    col += a * mix(vec3(.1, .95, .55), vec3(.55, .25, 1.), .5 + .5 * sin(t * .23 + b.x * 7.)) * .38 * uAur * uLight; }",
    "  if (uCaus > 0.) { vec2 q = b * vec2(16., 9.) + vec2(t * .25, t * .1); float c = vn(q) + vn(q * 1.7 - t * .2);",
    "    c = pow(1. - abs(c - 1.), 8.); col += uTint * c * .22 * smoothstep(.45, .85, b.y) * uCaus * uLight; }",
    "  if (uFlash > 0.) col += col * uFlash * (.5 + 2.2 * Lb) + vec3(.8, .85, 1.) * uFlash * .12;",
    "  col *= 1. + .45 * ring + .3 * exp(-max(uTap.z, 0.) * 2.) * step(0., uTap.z) * Lb;",
    /* the front object: its own nearer layer (a full layer set only) */
    "  if (uHasF > 0.) { vec2 f = clamp(uv - cam * (uFrontD - .35), .001, .999); vec4 F = texture(uFront, f);",
    "    vec3 fc = F.rgb * (1. + Lw * .25 * uLight) + uTint * Lw * .08 * uLight; col = mix(col, fc, F.a); }",
    /* particles in up to three depths, each layer moving with its own parallax */
    "  float P = uParts;",
    "  for (int k = 0; k < 3; k++) { if (k >= uLay) break; float z = .3 + .32 * float(k), fk = float(k); vec2 pu = uv - cam * (z - .35); vec2 a2 = vec2(asp, 1.);",
    "    float lit = textureLod(uMap, clamp(pu, .001, .999), 3.).g;",
    "    if (uFx1.x > 0.) { vec2 q = pu * a2 * (12. + 9. * fk) + vec2(t * .03, -t * .012 * (1. + fk)); q += .2 * vec2(sin(t * .6 + fk), cos(t * .5 + fk * 2.));",
    "      col += uTint * dot1(q, .05 + .02 * fk, fk * 7., .45) * (.05 + 1.6 * lit) * .55 * uFx1.x * P; }",
    "    if (uFx1.y > 0.) { vec2 q = vec2((pu.x + pu.y * uFx2.w) * asp * (34. + 18. * fk), pu.y * (2.4 + fk) - t * (2.4 + .8 * fk));",
    "      vec2 c = floor(q), g = fract(q); float x = .15 + .7 * h1(c + fk);",
    "      float s = smoothstep(.06, .0, abs(g.x - x)) * smoothstep(.0, .12, g.y) * smoothstep(.55, .25, g.y) * step(h1(c + 9. + fk), .55);",
    "      col += vec3(.75, .8, .9) * s * (.07 + .9 * lit) * uFx1.y * P; }",
    "    if (uFx1.z > 0.) { vec2 q = pu * a2 * (8. + 7. * fk) + vec2(sin(t * .4 + fk * 2.) * .4, -t * (.22 + .1 * fk));",
    "      col += vec3(.92, .96, 1.) * dot1(q, .07 + .03 * fk, fk * 5. + 1., .5) * (.25 + .9 * lit) * .6 * uFx1.z * P; }",
    "    if (uFx1.w > 0.) { vec2 q = pu * a2 * (10. + 8. * fk) + vec2(sin(t * .9 + fk) * .3, t * (.35 + .15 * fk));",
    "      float e = dot1(q, .05 + .015 * fk, fk * 3. + 2., .4) * (.6 + .4 * sin(t * 7. + h1(floor(q)) * 30.));",
    "      col += vec3(1., .5, .15) * e * pow(lit, .7) * 2.4 * uFx1.w * P; }",
    "    if (uFx2.x > 0.) { vec2 q = pu * a2 * (9. + 7. * fk) + vec2(sin(t * 1.3 + pu.y * 9.) * .08, t * (.28 + .12 * fk));",
    "      vec2 c = floor(q), g = fract(q); vec2 at = .2 + .6 * h2(c + fk); float r = length(g - at), sz = .05 + .03 * h1(c + 4.);",
    "      float ring2 = smoothstep(sz, sz * .75, r) - smoothstep(sz * .7, sz * .35, r);",
    "      col += vec3(.75, .95, 1.) * ring2 * step(h1(c + 6. + fk), .4) * (.25 + lit) * .7 * uFx2.x * P; }",
    "    if (uFx2.y > 0.) { vec2 q = pu * a2 * (6. + 5. * fk); q += .35 * vec2(sin(t * .3 + floor(q.y) * 1.7), cos(t * .27 + floor(q.x) * 2.3));",
    "      float bl = smoothstep(.2, 1., sin(t * (1.2 + .4 * fk) + h1(floor(q)) * 40.));",
    "      col += vec3(.95, 1., .45) * dot1(q, .06, fk * 11. + 3., .35) * bl * (1. - lit * .6) * .9 * uFx2.y * P; }",
    "    if (uFx2.z > 0. && k > 0) { vec2 q = pu * a2 * (3. + 3. * fk) + vec2(t * .05 + sin(t * .7 + fk) * .2, -t * (.09 + .05 * fk));",
    "      vec2 c = floor(q), g = fract(q) - (.2 + .6 * h2(c + fk)); float an = t * (1. + h1(c)) + h1(c + 2.) * 6.;",
    "      g = mat2(cos(an), -sin(an), sin(an), cos(an)) * g; float lf = smoothstep(.06, .03, length(g * vec2(1., 2.2))) * step(h1(c + 8. + fk), .3);",
    "      col = mix(col, mix(vec3(.75, .22, .06), vec3(.95, .55, .1), h1(c + 5.)) * (.45 + lit), lf * .85 * min(uFx2.z * P, 1.)); }",
    "  }",
    "  col += uTint * ring * .18;",
    "  vec2 vg = (fr / uRes - .5) * vec2(uRes.x / uRes.y, 1.);",
    "  col *= mix(.7, 1., smoothstep(1.15, .3, length(vg)));",
    "  col *= uDim * uExpo;",
    "  col += (h1(fr + fract(t * 37.) * 91.) - .5) * .045 * uGrain * uExpo;",
    "  o = vec4(clamp(col, 0., 1.), 1.);",
    "}"
  ].join("\n");

  /* ------------------------------------------------------------------ GL ------------------------------------------------------------------ */
  var SOFT = false, cv = null, gl = null, prog = null, U = {}, tex = {}, blank = null, cur = null, loadSeq = 0, waiting = [];
  var st = { mode: "backdrop", pan: [0, 0], vel: [0, 0], zoom: 1.06, tilt: [0, 0], tap: [0, 0, -1], flash: 0, dim: BACK_DIM, expo: 0, swell: 1,
    acam: [0, 0], ptr: [0, 0], ptrT: [0, 0], scr: 0, scrT: 0, raf: 0, hold: 0, last: 0, frames: 0, t0: performance.now(), anim: null, lastMove: null };
  function img(src) { return new Promise(function (ok, no) { var i = new Image(); i.decoding = "async"; i.onload = function () { ok(i); }; i.onerror = function () { no(new Error("could not load " + src)); }; i.src = src; }); }
  function ensure() {
    if (cv) return !!gl;
    if (!gl2()) return false;
    cv = document.createElement("canvas"); cv.id = "tr-plate"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;transition:opacity .9s ease;contain:strict";
    document.body.insertBefore(cv, document.body.firstChild);
    gl = cv.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, depth: false, stencil: false, powerPreference: "default" });
    if (!gl) return false;
    /* a renderer with no graphics chip (SwiftShader, llvmpipe: a computer without a GPU, a test runner) draws on the CPU, and every frame
       of the photo there stalls the whole page: fewer, smaller frames. A real GPU never gets here (the owner's rule: no automatic downscaling) */
    try { var dbg = gl.getExtension("WEBGL_debug_renderer_info"), rn = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || ""); SOFT = /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render/i.test(rn); } catch (e) { SOFT = false; }
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); stopLoop(); prog = null; building = null; tex = {}; blank = null; if (cur) cur.ready = false; }, false);
    cv.addEventListener("webglcontextrestored", function () { if (cur) show(cur.id, true); }, false);
    return true;
  }
  /* the shader is built in the background (KHR_parallel_shader_compile where the browser has it): asking for its status at once
     blocks the page until the driver is done, which on a slow one (a phone at boot, a software renderer) held up the opening film */
  var building = null;
  function build() {
    if (prog) return Promise.resolve(prog);
    if (building) return building;
    building = new Promise(function (ok, no) {
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
      var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS), p = gl.createProgram();
      gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      var ext = gl.getExtension("KHR_parallel_shader_compile");
      function done() {
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { building = null; return no(new Error(gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p))); }
        gl.useProgram(p);
        var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(p, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        ["uBack", "uFront", "uMap", "uRes", "uImg", "uPan", "uCam", "uZoom", "uTime", "uLight", "uParts", "uDepth", "uGrain", "uFrontD", "uFlash", "uFlick", "uHz",
          "uShaft", "uAur", "uCaus", "uDim", "uExpo", "uSharp", "uHasF", "uIt", "uLay", "uTint", "uTap", "uFx1", "uFx2"].forEach(function (n) { U[n] = gl.getUniformLocation(p, n); });
        gl.uniform1i(U.uBack, 0); gl.uniform1i(U.uFront, 1); gl.uniform1i(U.uMap, 2);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        prog = p; ok(p);
      }
      if (!ext) return done();
      (function poll() { if (!gl || gl.isContextLost()) { building = null; return no(new Error("context lost")); } if (gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR)) done(); else setTimeout(poll, 40); })();
    });
    return building;
  }
  function upload(unit, key, src, mip) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    var t = tex[key] || gl.createTexture(); tex[key] = t; gl.bindTexture(gl.TEXTURE_2D, t);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  }

  /* show(id): fetch the theme's photograph, then swap it in. A photo already on screen dips to dark first and the new one comes up with
     a short push in (the "arrive"), so a theme change never flashes the page behind. */
  function show(id, now) {
    var c = P[id]; if (!c || !ensure()) return Promise.resolve(false);
    var seq = ++loadSeq, dir = BASE + "art/rooms/" + id + "/";
    var list = [img((c.hero ? BASE + "art/themes/" + id + ".webp" : dir + "back.webp") + VER), img(dir + "map.webp" + VER)];
    if (!c.hero) list.push(img(dir + "front.webp" + VER));
    list.push(build());
    return Promise.all(list).then(function (a) {
      if (seq !== loadSeq) return false;                                  // a later theme won
      return new Promise(function (ok) {
        function swap() {
          if (seq !== loadSeq) return ok(false);
          gl.useProgram(prog);
          upload(0, "back", a[0], false); upload(2, "map", a[1], true); upload(1, "front", c.hero ? null : a[2], false);
          cur = { id: id, c: c, size: [a[0].naturalWidth, a[0].naturalHeight], ready: true };
          gl.uniform3fv(U.uTint, c.tint); gl.uniform4fv(U.uFx1, c.fx1); gl.uniform4fv(U.uFx2, c.fx2);
          gl.uniform1f(U.uFlick, c.flick); gl.uniform1f(U.uHz, c.hz); gl.uniform1f(U.uShaft, c.shaft); gl.uniform1f(U.uAur, c.aurora); gl.uniform1f(U.uCaus, c.caustics);
          gl.uniform1f(U.uFrontD, c.fd || .9); gl.uniform1f(U.uHasF, c.hero ? 0 : 1); cur.sharp = cur.size[0] < 1500 ? .35 : .18;
          st.pan = [upright() ? c.pan0 : 0, 0]; st.vel = [0, 0]; st.zoom = 1.06; st.tilt = [0, 0]; st.tap = [0, 0, -1]; st.flash = 0;
          st.dim = target();
          if (!now && st.mode === "backdrop" && !still()) arrive(); else if (!st.anim) st.expo = 1;
          cv.style.opacity = "1"; st.last = 0; draw(performance.now()); loop();
          waiting = waiting.filter(function (w) { if (w.id === id) { w.ok(true); return false; } return true; });
          ok(true);
        }
        if (cur && cur.ready && st.frames && !now && !still()) dip(swap); else swap();
      });
    }).catch(function (e) { if (window.console) console.warn("[plate]", e); return false; });
  }

  /* ------------------------------------------------------------------ the loop ------------------------------------------------------------------ */
  var held = false;                                                     // an opaque shell over the app (The Cabinet): nothing to draw
  function off() { return held || html.dataset.ui === "field"; }
  function target() { return st.mode !== "backdrop" || html.classList.contains("tr-atmos") || !cur || cur.c.light ? 1 : BACK_DIM; }
  function loop() { if (!cur || st.raf || st.hold) return; st.raf = requestAnimationFrame(frame); }
  function stopLoop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; if (st.hold) clearTimeout(st.hold); st.hold = 0; }
  function frame(now) {
    st.raf = 0;
    if (!cur || !cur.ready || document.hidden || off()) return;
    /* the 1080p film covers the screen: a few frames so the shader is built and the photo is up, then wait for it to end */
    if (st.frames > 2 && html.classList.contains("ts-filmplay")) { st.hold = setTimeout(function () { st.hold = 0; loop(); }, 300); return; }
    var busy = st.mode !== "backdrop" || st.anim;                       /* the Atmosphere: full brightness, but backdrop cost (it builds its ring meanwhile) */
    /* behind the collection: 24 a second (dust and light move slowly; every frame of it is a repaint of the whole page under it) */
    var cap = SOFT ? (busy ? 66 : 1000) : lite() ? 50 : busy && !(TOUCH && st.mode === "room") ? 15.5 : st.mode === "room" ? 32 : 41;
    if (now - st.last >= cap) {
      var real = st.last ? Math.min(.5, (now - st.last) / 1000) : .016, dt = Math.min(.05, real); st.last = now;
      st.dim += (target() - st.dim) * Math.min(1, real * 2.5);            // brightness follows real time, even on a slow frame
      step(dt); draw(now);
    }
    if (!still() || st.anim || Math.abs(st.dim - target()) > .005) loop();
  }
  function step(dt) {
    if (Math.abs(st.vel[0]) > 1e-4 || Math.abs(st.vel[1]) > 1e-4) {           // a flick keeps gliding, then settles
      st.pan[0] = Math.max(-1, Math.min(1, st.pan[0] + st.vel[0])); st.pan[1] = Math.max(-1, Math.min(1, st.pan[1] + st.vel[1]));
      st.vel[0] *= Math.pow(.04, dt); st.vel[1] *= Math.pow(.04, dt);
    }
    if (st.tap[2] >= 0) { st.tap[2] += dt; if (st.tap[2] > 2.6) st.tap[2] = -1; }
    st.flash *= Math.pow(.02, dt);
    if (cur.c.lightning && !still() && Math.random() < dt / (st.mode === "backdrop" ? 40 : 14)) st.flash = Math.max(st.flash, (st.mode === "backdrop" ? .3 : .55) + Math.random() * .45);
    var k = 1 - Math.pow(.02, dt);
    st.ptr[0] += (st.ptrT[0] - st.ptr[0]) * k * .25; st.ptr[1] += (st.ptrT[1] - st.ptr[1]) * k * .25;
    st.scr += (st.scrT - st.scr) * k * .2;
    if (st.anim) animate(st.anim, dt);
  }
  function scale() {
    var T = tier(), room = st.mode !== "backdrop";
    var cap = room ? { low: 1, medium: 1.25, high: 1.5, ultra: 2, max: 2 }[T] : (TOUCH ? { low: .75, medium: 1, high: 1.25, ultra: 1.5, max: 2 } : { low: 1, medium: 1, high: 1.25, ultra: 1.5, max: 2 })[T];
    var sc = Math.min(window.devicePixelRatio || 1, cap || 1.25) * (lite() || SOFT ? .6 : 1);
    /* never more pixels than the photo has where it is shown: past that the shader only interpolates (a 1600 px photo on a 2560 px
       screen drew 2.8 million pixels a frame for nothing); the room keeps a little more for crisp particles and grain */
    if (cur) { var fit = Math.max(innerWidth / cur.size[0], innerHeight / cur.size[1]) * st.zoom; sc = Math.min(sc, Math.max(SOFT ? .3 : .5, (room ? 1.3 : 1.05) * (SOFT ? .6 : 1) / fit)); }
    return sc;
  }
  function resize() { var s = scale(), w = Math.max(2, Math.round(innerWidth * s)), h = Math.max(2, Math.round(innerHeight * s)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
  function vis() { var s = Math.max(cv.width / cur.size[0], cv.height / cur.size[1]) * st.zoom; return [cv.width / (cur.size[0] * s), cv.height / (cur.size[1] * s)]; }
  function draw(now) {
    if (!cur || !cur.ready || !prog) return;
    resize(); gl.viewport(0, 0, cv.width, cv.height);
    var id = cur.id, S = still(), t = S ? 4 : (now - st.t0) / 1000, room = st.mode !== "backdrop", idle = S ? 0 : room ? .12 : .2;
    var atm = html.classList.contains("tr-atmos"), back = !room && !atm;   /* the Atmosphere: no scroll camera, backdrop quality */
    var cx = st.pan[0] * .55 + st.tilt[0] + st.acam[0] + st.ptr[0] + Math.sin(t * .11) * idle * .2;
    var cy = st.pan[1] * .4 + st.tilt[1] + st.acam[1] + st.ptr[1] + (back ? (st.scr - .5) * .7 : 0) + Math.cos(t * .09) * idle * .12;
    var light = getLook(id, "light") * cur.c.lit * st.swell, parts = S ? 0 : getLook(id, "parts") * (back ? .8 : 1), T = tier();
    gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uImg, cur.size[0], cur.size[1]);
    gl.uniform2f(U.uPan, st.pan[0], st.pan[1]); gl.uniform2f(U.uCam, cx * .045, cy * .03);
    gl.uniform1f(U.uZoom, st.zoom); gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uLight, light); gl.uniform1f(U.uParts, parts); gl.uniform1f(U.uDepth, getLook(id, "depth") * cur.c.dep); gl.uniform1f(U.uGrain, getLook(id, "grain"));
    gl.uniform1f(U.uFlash, st.flash); gl.uniform3f(U.uTap, st.tap[0], st.tap[1], st.tap[2]);
    gl.uniform1f(U.uDim, st.dim); gl.uniform1f(U.uExpo, st.expo);
    gl.uniform1i(U.uIt, room ? 6 : T === "low" ? 2 : 3); gl.uniform1i(U.uLay, room ? 3 : T === "low" ? 1 : 2);
    gl.uniform1f(U.uSharp, room ? cur.sharp : 0);                         /* the crispness pass only where it is looked at */
    gl.drawArrays(gl.TRIANGLES, 0, 3); st.frames++;
  }
  function poke() { if (!cur) return; if (still() && !st.raf) { st.last = 0; draw(performance.now()); } else loop(); }

  /* ------------------------------------------------------------------ moves ------------------------------------------------------------------ */
  function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function out3(k) { return 1 - Math.pow(1 - k, 3); }
  function smooth(a, b, x) { var k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); }
  function animate(A, dt) {
    if (!A.hold) A.t += dt;
    var k = Math.max(0, Math.min(1, A.t / A.dur));
    if (A.kind === "dip") { st.expo = A.from * (1 - k); }
    else if (A.kind === "arrive") { st.zoom = 1.2 + (1.06 - 1.2) * out3(k); st.expo = .2 + .8 * smooth(0, .6, k); st.acam = [(1 - out3(k)) * -.35, 0]; }
    else if (A.kind === "open") {
      /* the opening: out of the dark, the camera pushes in from far and to one side, the light swells as the name comes up */
      st.zoom = 1.55 + (1.06 - 1.55) * ease(k); st.expo = smooth(0, .42, k);
      st.acam = [(1 - ease(k)) * -.9, (1 - ease(k)) * .35];
      st.swell = 1 + .55 * Math.exp(-Math.pow((k - .62) / .12, 2));
      if (!A.titled && k >= .55) { A.titled = true; if (A.o.onTitle) try { A.o.onTitle(); } catch (e) { /* ignore */ } }
    }
    if (k >= 1 && !A.hold) {
      st.anim = null; st.acam = [0, 0]; st.swell = 1; if (A.kind !== "dip") { st.expo = 1; st.zoom = 1.06; }
      var fn = A.kind === "open" ? A.o.onEnd : A.done; if (fn) try { fn(); } catch (e) { if (window.console) console.warn("[plate]", e); }
    }
  }
  function dip(then) { st.anim = { kind: "dip", t: 0, dur: .22, from: st.expo || 1, done: then }; loop(); }
  function arrive() { st.anim = { kind: "arrive", t: 0, dur: 1.5 }; st.expo = .2; loop(); }
  function opening(o) {
    o = o || {}; st.mode = "opening";
    var A = st.anim = { kind: "open", t: 0, dur: o.dur || 5.6, o: o, titled: false };
    if (cur) st.pan = [upright() ? cur.c.pan0 : 0, 0];
    st.expo = 0; st.zoom = 1.55; st.dim = 1; st.last = 0; loop();
    return {
      seek: function (t, hold) { A.t = t; A.hold = !!hold; if (st.anim !== A) st.anim = A; animate(A, 0); st.last = 0; draw(performance.now()); loop(); },
      stop: function () { if (st.anim === A) { st.anim = null; st.acam = [0, 0]; st.swell = 1; st.expo = 1; st.zoom = 1.06; } st.mode = "backdrop"; poke(); },
      get t() { return A.t; }
    };
  }

  /* ------------------------------------------------------------------ the room ------------------------------------------------------------------ */
  function room(id) {
    if (!cur || cur.id !== id) show(id, true);
    st.mode = "room"; st.zoom = 1.06; st.vel = [0, 0]; st.tilt = [0, 0]; st.ptrT = [0, 0];
    if (cur) st.pan = [upright() ? cur.c.pan0 : 0, 0];
    st.last = 0; loop();
    var c = P[id], stopped = false;
    return {
      ready: Promise.resolve(), name: c.name, look: LOOK,
      pan: function () { return st.pan[0]; },
      get: function (k) { return getLook(id, k); },
      set: function (k, v) { setLook(id, k, v); },
      reset: function () { st.pan = [upright() ? c.pan0 : 0, 0]; st.vel = [0, 0]; st.zoom = 1.06; resetLook(id); },
      /* a drag in screen pixels: the photo follows the finger (1:1 at this zoom) */
      drag: function (dx, dy) {
        if (!cur) return; var v = vis(), s = scale(), rx = Math.max(1e-3, 1 - v[0]), ry = Math.max(1e-3, 1 - v[1]);
        var px = -(dx * s / cv.width) * v[0] / (rx * .5), py = -(dy * s / cv.height) * v[1] / (ry * .5);
        if (1 - v[0] <= 1e-3) px = -dx / innerWidth * .6;                // nothing to pan across: the drag only moves the camera
        if (1 - v[1] <= 1e-3) py = -dy / innerHeight * .5;
        st.pan[0] = Math.max(-1, Math.min(1, st.pan[0] + px)); st.pan[1] = Math.max(-1, Math.min(1, st.pan[1] + py));
        st.vel = [0, 0]; st.lastMove = [px, py, performance.now()]; poke();
      },
      release: function () { var m = st.lastMove; if (m && performance.now() - m[2] < 90) { st.vel = [m[0] * .8, m[1] * .8]; loop(); } },
      pinch: function (f) { st.zoom = Math.max(1.06, Math.min(1.9, st.zoom * f)); poke(); },
      tilt: function (x, y) { st.tilt = [x, y]; poke(); },
      tap: function (x, y) { st.tap = [x, y, 0]; if (c.lightning) st.flash = .9; loop(); },
      opening: function (onTitle, onEnd) { var op = opening({ onTitle: onTitle, onEnd: function () { st.mode = "room"; if (onEnd) onEnd(); } }); st.mode = "room"; return op; },
      stop: function () {
        if (stopped) return; stopped = true;
        if (st.anim && st.anim.kind === "open") { st.anim = null; st.acam = [0, 0]; st.swell = 1; st.expo = 1; }
        st.mode = "backdrop"; st.zoom = 1.06; st.tilt = [0, 0]; st.vel = [0, 0]; st.tap = [0, 0, -1];
        if (cur) st.pan = [upright() ? cur.c.pan0 : 0, 0];
        poke();
      },
      debug: function () { return debug(); }
    };
  }

  function debug() {
    return { id: cur && cur.id, ready: !!(cur && cur.ready), soft: SOFT, hero: !!(cur && cur.c.hero), mode: st.mode, frames: st.frames, loop: !!st.raf, hold: !!st.hold,
      w: cv && cv.width, h: cv && cv.height, pan: st.pan.slice(), zoom: +st.zoom.toFixed(3), dim: +st.dim.toFixed(3), expo: +st.expo.toFixed(3),
      anim: st.anim ? st.anim.kind : null, canvases: document.querySelectorAll("canvas#tr-plate").length, size: cur ? cur.size.slice() : null };
  }
  function whenReady(id, ms) {
    if (cur && cur.ready && cur.id === id && st.frames > 0) return Promise.resolve(true);
    return new Promise(function (ok) { var w = { id: id, ok: ok }; waiting.push(w); setTimeout(function () { if (waiting.indexOf(w) >= 0) { waiting.splice(waiting.indexOf(w), 1); ok(false); } }, ms || 5000); });
  }

  /* ------------------------------------------------------------------ boot ------------------------------------------------------------------ */
  function start() {
    if (has(theme()) && !off()) show(theme(), true);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.attributeName === "data-atmo") { var id = theme(); if (has(id) && (!cur || cur.id !== id)) show(id); else if (!has(id) && cv) { cv.style.opacity = "0"; cur = null; } }
        else if (m.attributeName === "data-ui") { if (off()) { if (cv) cv.style.opacity = "0"; stopLoop(); } else if (cur) { cv.style.opacity = "1"; poke(); } else if (has(theme())) show(theme(), true); }
        else poke();
      });
    }).observe(html, { attributes: true, attributeFilter: ["data-atmo", "data-motion", "data-ui", "class"] });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && cur) { st.last = 0; loop(); } });
    addEventListener("resize", function () { if (cur) { if (st.mode === "backdrop") st.pan = [upright() ? cur.c.pan0 : 0, 0]; poke(); } });
    addEventListener("titan:thunder", function () { if (cur && cur.c.lightning) { st.flash = st.mode === "backdrop" ? .6 : 1; loop(); } });
    /* behind the collection the photo answers the page: a scroll moves the camera down the room, the mouse leans it a little */
    addEventListener("scroll", function (e) {
      var el = e.target && e.target.scrollHeight ? e.target : document.scrollingElement; if (!el) return;
      var span = el.scrollHeight - el.clientHeight; if (span < 40) return;
      st.scrT = Math.max(0, Math.min(1, el.scrollTop / span)); if (!still()) loop();
    }, { capture: true, passive: true });
    if (!TOUCH) addEventListener("pointermove", function (e) { if (st.mode !== "backdrop") return; st.ptrT = [(e.clientX / innerWidth - .5) * .6, (e.clientY / innerHeight - .5) * .4]; }, { passive: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);

  window.TitanPlate = {
    has: has, list: Object.keys(P), cfg: function (id) { return P[id] || null; }, current: function () { return cur ? cur.id : null; },
    whenReady: whenReady, opening: opening, arrive: function (id) { if (id && cur && cur.id !== id) return show(id); if (!still()) arrive(); return Promise.resolve(true); },
    hold: function (on) { held = !!on; if (!held) { st.last = 0; loop(); } }, room: room, show: show, look: LOOK, getLook: getLook, setLook: setLook, resetLook: resetLook, debug: debug
  };
  window.TitanRoomPlate = { has: has, mount: function (box, id) { return room(id); }, ROOMS: Object.keys(P) };
})();
