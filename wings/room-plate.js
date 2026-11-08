/* wings/room-plate.js: the image room (owner 2026-10-30, after trying the Midnight Gallery and Neon Vault rooms: the code-drawn rooms
   look like low-quality 3D and run poorly on a phone; an image AI makes each room as a photograph and the app lays its own live light,
   particles, depth and sound over it). Loaded with wings/room-shell.js on the first Step inside; used for a theme whose layer set is in
   art/rooms/{id}/ (tools/rooms/prep_plates.py: back.webp, front.webp, map.webp = depth + light, plate.json).

   One WebGL2 canvas (#troom-plate) between the world (#fxk, z 0) and the effects (#titan-fx, z 7), so any effect added to the theme
   plays over the photograph; the GPU world behind holds still while the room is open (html.tr-plate, fx/kit.js). The photo covers the
   screen; a drag pans across it (on an upright phone the wide room is wider than the screen), and the camera moves with it, so near
   things slide past far ones (relief parallax on the back plate's depth, the front object as its own nearer layer). The light mask
   drives the live light: flicker per lamp, a glow, moving shafts, an aurora or caustics where the room has them; particles (dust in the
   light, rain, snow, embers, bubbles, fireflies, leaves) drift through it in three depths. A tap sends a ripple and a surge of light.

   TitanRoomPlate.has(id) -> bool        .mount(box, id) -> { ready, name, look[], drag(dx, dy), pinch(f), tap(x, y), set(k, v), stop(), debug() } */
(function () {
  "use strict";
  var html = document.documentElement;
  var BASE = (function () { var s = document.querySelector('script[src*="wings/room"]'), m = s && /^(.*?)wings\/room/.exec(s.getAttribute("src")); return m ? m[1] : ""; })();
  /* pan0 = where an upright phone starts across the wide photo (-1 left .. 1 right: on the subject); fx weights: dust, rain, snow, embers |
     bubbles, fireflies, leaves, slant; tint = the colour of the room's light */
  var ROOMS = {
    afterhours: { pan0: 0, name: "The gallery after closing", tint: [0.78, 0.86, 1.0], flick: 0.0, hz: 1, fx1: [1, 0, 0, 0], fx2: [0, 0, 0, 0], shaft: 1 },
    neon: { pan0: 0, name: "The alley in the rain", tint: [1.0, 0.55, 0.92], flick: 0.22, hz: 9, fx1: [0, 1, 0, 0], fx2: [0, 0, 0, 0.12], shaft: 0 },
    zen: { pan0: 0.15, name: "The garden at first light", tint: [1.0, 0.9, 0.74], flick: 0.0, hz: 1, fx1: [0.6, 0, 0, 0], fx2: [0, 0, 1, 0], shaft: 0.7 },
    supercell: { pan0: -0.1, name: "Out on the plains", tint: [1.0, 0.8, 0.6], flick: 0.0, hz: 1, fx1: [0, 1, 0, 0], fx2: [0, 0, 0, 0.32], shaft: 0, lightning: 1 },
    abyss: { pan0: -0.45, name: "The wreck", tint: [0.55, 0.9, 1.0], flick: 0.0, hz: 1, fx1: [0.8, 0, 0, 0], fx2: [1, 0, 0, 0], shaft: 1, caustics: 1 },
    colossus: { pan0: -0.7, name: "The Mint by night", tint: [1.0, 0.56, 0.26], flick: 0.3, hz: 3, fx1: [0.5, 0, 0, 1], fx2: [0, 0, 0, 0], shaft: 0.4 },
    dynasty: { pan0: -0.75, name: "The lantern pond", tint: [1.0, 0.42, 0.22], flick: 0.18, hz: 2, fx1: [0, 0, 0, 0], fx2: [0, 1, 0, 0], shaft: 0 },
    glacier: { pan0: 0.35, name: "Inside the ice", tint: [0.62, 0.92, 1.0], flick: 0.05, hz: 2, fx1: [0, 0, 1, 0], fx2: [0, 0, 0, 0], shaft: 0.6, aurora: 1 },
    valhalla: { pan0: 0, name: "The hall by hearthfire", tint: [1.0, 0.6, 0.3], flick: 0.3, hz: 4, fx1: [0.5, 0, 0, 1], fx2: [0, 0, 0, 0], shaft: 0.8 }
  };
  var LOOK = [
    { id: "light", label: "Light", min: 0, max: 1.6, def: 1 },
    { id: "parts", label: "Particles", min: 0, max: 1.6, def: 1 },
    { id: "depth", label: "Depth", min: 0, max: 1.6, def: 1 },
    { id: "grain", label: "Film grain", min: 0, max: 1.5, def: 0.6 }
  ];
  var KEY = "titan.plate.look.v1";
  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function lsSet(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode */ } }
  function gl2() { try { return !!window.WebGL2RenderingContext && !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; } }
  var GL2 = null;
  function has(id) { if (!ROOMS[id]) return false; if (GL2 == null) GL2 = gl2(); return GL2; }

  var VS = "#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
  var FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uBack, uFront, uMap;",
    "uniform vec2 uRes, uImg, uPan, uCam;",
    "uniform float uZoom, uTime, uLight, uParts, uDepth, uGrain, uFrontD, uFlash, uFlick, uHz, uShaft, uAur, uCaus;",
    "uniform vec3 uTint, uTap;",
    "uniform vec4 uFx1, uFx2;",
    "out vec4 o;",
    "float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }",
    "float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);",
    "  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }",
    "vec2 img(vec2 fr){ float s = max(uRes.x / uImg.x, uRes.y / uImg.y) * uZoom; vec2 vis = uRes / (uImg * s);",
    "  vec2 c = .5 + uPan * max(vec2(0.), 1. - vis) * .5; return c + (fr - uRes * .5) / (uImg * s); }",
    /* one particle per cell in a grid that drifts; returns its brightness at q (0 outside), with a size and a shape */
    "float dot1(vec2 q, float sz, float seed, float keep){ vec2 c = floor(q), f = fract(q); if (h1(c + seed) > keep) return 0.;",
    "  vec2 at = .2 + .6 * h2(c + seed * 1.7); return smoothstep(sz, sz * .2, length(f - at)); }",
    "void main(){",
    "  vec2 fr = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);",
    "  vec2 uv = img(fr); float t = uTime;",
    "  float asp = uImg.x / uImg.y;",
    /* the tap: a ring that runs out from the touch and bends the picture a little */
    "  float ring = 0.; vec2 tdir = vec2(0.);",
    "  if (uTap.z >= 0. && uTap.z < 2.4) { vec2 d = (fr / uRes - uTap.xy) * vec2(uRes.x / uRes.y, 1.); float r = length(d);",
    "    ring = exp(-pow((r - uTap.z * .42) * 18., 2.)) * (1. - uTap.z / 2.4); tdir = d / max(r, 1e-4); }",
    "  uv += tdir * ring * .006;",
    /* relief parallax: the back plate's own depth decides how far each point moves with the camera (near moves most) */
    "  vec2 cam = uCam * uDepth; vec2 b = uv;",
    "  for (int i = 0; i < 6; i++) { float d = texture(uMap, clamp(b, .001, .999)).r; b = uv - cam * (d - .35); }",
    "  b = clamp(b, .001, .999);",
    "  vec3 col = texture(uBack, b).rgb;",
    "  vec2 tx = 1. / uImg;",
    "  vec3 nb = texture(uBack, b + vec2(tx.x, 0.)).rgb + texture(uBack, b - vec2(tx.x, 0.)).rgb + texture(uBack, b + vec2(0., tx.y)).rgb + texture(uBack, b - vec2(0., tx.y)).rgb;",
    "  col += (col - nb * .25) * .35;",                                                    /* a little crispness back (the plates are 1376 px) */
    "  float L = texture(uMap, b).g, Lb = textureLod(uMap, b, 3.).g, Lw = textureLod(uMap, b, 5.).g;",
    /* the light lives: each lamp flickers on its own (cells of the frame), the glow breathes, shafts drift */
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
    /* the front object: its own nearer layer */
    "  vec2 f = clamp(uv - cam * (uFrontD - .35), .001, .999); vec4 F = texture(uFront, f);",
    "  vec3 fc = F.rgb * (1. + Lw * .25 * uLight) + uTint * Lw * .08 * uLight;",
    "  col = mix(col, fc, F.a);",
    /* particles in three depths, each layer moving with its own parallax */
    "  float P = uParts;",
    "  for (int k = 0; k < 3; k++) { float z = .3 + .32 * float(k), fk = float(k); vec2 pu = uv - cam * (z - .35); vec2 a2 = vec2(asp, 1.);",
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
    "  col += (h1(fr + fract(t * 37.) * 91.) - .5) * .045 * uGrain;",
    "  o = vec4(clamp(col, 0., 1.), 1.);",
    "}"
  ].join("\n");

  function load(src) { return new Promise(function (ok, no) { var i = new Image(); i.decoding = "async"; i.onload = function () { ok(i); }; i.onerror = no; i.src = src; }); }

  function mount(box, id) {
    var R = ROOMS[id], dir = BASE + "art/rooms/" + id + "/", saved = lsGet()[id] || {};
    var look = {}; LOOK.forEach(function (c) { look[c.id] = saved[c.id] != null ? saved[c.id] : c.def; });
    var cv = document.createElement("canvas"); cv.id = "troom-plate"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;opacity:0;transition:opacity .9s ease;background:#000;touch-action:none";
    document.body.appendChild(cv);
    html.classList.add("tr-plate");
    var gl = cv.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "default" });
    var st = { pan: [R.pan0 || 0, 0], vel: [0, 0], zoom: 1.06, tilt: [0, 0], tap: [0, 0, -1], flash: 0, t0: performance.now(), raf: 0, last: 0, stopped: false, frames: 0, ready: false, size: [1376, 768], front: .9 };
    var prog, U = {}, tex = {};
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    function texture(im, mip) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      return t;
    }
    function scale() {
      var Q = window.TitanQuality, tier = Q && Q.tier ? String(Q.tier()).toLowerCase() : "high";
      var cap = { low: 1, medium: 1.25, high: 1.5, ultra: 2, max: 2 }[tier] || 1.5;
      return Math.min(window.devicePixelRatio || 1, cap);
    }
    function resize() { var s = scale(), w = Math.round(innerWidth * s), h = Math.round(innerHeight * s); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
    function vis() { var s = Math.max(cv.width / st.size[0], cv.height / st.size[1]) * st.zoom; return [cv.width / (st.size[0] * s), cv.height / (st.size[1] * s)]; }
    var ready = Promise.all([load(dir + "back.webp"), load(dir + "front.webp"), load(dir + "map.webp"),
      fetch(dir + "plate.json").then(function (r) { return r.json(); }).catch(function () { return {}; })]).then(function (a) {
      if (st.stopped) return;
      if (!gl) throw new Error("no WebGL2");
      st.size = [a[3].w || a[0].naturalWidth, a[3].h || a[0].naturalHeight]; st.front = a[3].front != null ? a[3].front : .9;
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ["uBack", "uFront", "uMap", "uRes", "uImg", "uPan", "uCam", "uZoom", "uTime", "uLight", "uParts", "uDepth", "uGrain", "uFrontD", "uFlash", "uFlick", "uHz",
        "uShaft", "uAur", "uCaus", "uTint", "uTap", "uFx1", "uFx2"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE0); tex.back = texture(a[0], false);
      gl.activeTexture(gl.TEXTURE1); tex.front = texture(a[1], false);
      gl.activeTexture(gl.TEXTURE2); tex.map = texture(a[2], true);
      gl.uniform1i(U.uBack, 0); gl.uniform1i(U.uFront, 1); gl.uniform1i(U.uMap, 2);
      gl.uniform3fv(U.uTint, R.tint); gl.uniform4fv(U.uFx1, R.fx1); gl.uniform4fv(U.uFx2, R.fx2);
      gl.uniform1f(U.uFlick, R.flick); gl.uniform1f(U.uHz, R.hz); gl.uniform1f(U.uShaft, R.shaft || 0); gl.uniform1f(U.uAur, R.aurora || 0); gl.uniform1f(U.uCaus, R.caustics || 0);
      gl.uniform1f(U.uFrontD, st.front);
      st.ready = true; resize(); draw(performance.now()); cv.style.opacity = "1";
      loop();
    });
    ready.catch(function (e) { if (window.console) console.warn("room plate", e); });

    var still = function () { return html.dataset.motion === "off"; };
    var TOUCH = matchMedia("(pointer: coarse)").matches;
    function loop() { if (st.stopped || st.raf) return; st.raf = requestAnimationFrame(frame); }
    function frame(now) {
      st.raf = 0; if (st.stopped) return;
      if (document.hidden) return;                                     // resumes on visibilitychange
      var cap = TOUCH ? 32 : 15.5;
      if (now - st.last >= cap) {
        var dt = Math.min(.05, (now - st.last) / 1000 || .016); st.last = now;
        if (Math.abs(st.vel[0]) > 1e-4 || Math.abs(st.vel[1]) > 1e-4) {     // a flick keeps gliding, then settles
          st.pan[0] = Math.max(-1, Math.min(1, st.pan[0] + st.vel[0])); st.pan[1] = Math.max(-1, Math.min(1, st.pan[1] + st.vel[1]));
          st.vel[0] *= Math.pow(.04, dt); st.vel[1] *= Math.pow(.04, dt);
        }
        if (st.tap[2] >= 0) { st.tap[2] += dt; if (st.tap[2] > 2.6) st.tap[2] = -1; }
        st.flash *= Math.pow(.02, dt);
        if (R.lightning && Math.random() < dt / 14) st.flash = Math.max(st.flash, .55 + Math.random() * .45);
        draw(now);
      }
      if (!still()) loop();
    }
    function draw(now) {
      if (!st.ready) return;
      resize(); gl.viewport(0, 0, cv.width, cv.height);
      var t = still() ? 4 : (now - st.t0) / 1000, idle = still() ? 0 : .12;
      var cx = st.pan[0] * .55 + st.tilt[0] + Math.sin(t * .11) * idle * .2, cy = st.pan[1] * .4 + st.tilt[1] + Math.cos(t * .09) * idle * .12;
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform2f(U.uImg, st.size[0], st.size[1]);
      gl.uniform2f(U.uPan, st.pan[0], st.pan[1]); gl.uniform2f(U.uCam, cx * .045, cy * .03);
      gl.uniform1f(U.uZoom, st.zoom); gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uLight, look.light); gl.uniform1f(U.uParts, still() ? 0 : look.parts); gl.uniform1f(U.uDepth, look.depth); gl.uniform1f(U.uGrain, look.grain);
      gl.uniform1f(U.uFlash, st.flash);
      gl.uniform3f(U.uTap, st.tap[0], st.tap[1], st.tap[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3); st.frames++;
    }
    function onVis() { if (!document.hidden) { st.last = 0; loop(); } }
    function onThunder() { if (R.lightning) st.flash = 1; }
    document.addEventListener("visibilitychange", onVis);
    addEventListener("titan:thunder", onThunder);
    addEventListener("resize", function () { if (st.ready && !st.raf) draw(performance.now()); });
    function poke() { if (still() && st.ready) draw(performance.now()); else loop(); }

    return {
      ready: ready, name: R.name, look: LOOK,
      get: function (k) { return look[k]; },
      set: function (k, v) { if (!(k in look)) return; look[k] = +v; var all = lsGet(); all[id] = look; lsSet(all); poke(); },
      reset: function () { st.pan = [R.pan0 || 0, 0]; st.vel = [0, 0]; st.zoom = 1.06; LOOK.forEach(function (c) { look[c.id] = c.def; }); var all = lsGet(); delete all[id]; lsSet(all); poke(); },
      /* a drag in screen pixels: the photo follows the finger (1:1 at this zoom) */
      drag: function (dx, dy) {
        var v = vis(), s = window.devicePixelRatio ? scale() : 1, rx = Math.max(1e-3, 1 - v[0]), ry = Math.max(1e-3, 1 - v[1]);
        var px = -(dx * s / cv.width) * v[0] / (rx * .5), py = -(dy * s / cv.height) * v[1] / (ry * .5);
        if (1 - v[0] <= 1e-3) px = -dx / innerWidth * .6;                // nothing to pan across: the drag only moves the camera
        if (1 - v[1] <= 1e-3) py = -dy / innerHeight * .5;
        st.pan[0] = Math.max(-1, Math.min(1, st.pan[0] + px)); st.pan[1] = Math.max(-1, Math.min(1, st.pan[1] + py));
        st.vel = [0, 0]; st.lastMove = [px, py, performance.now()];
        poke();
      },
      /* the finger lifts: a flick keeps the photo gliding for a moment */
      release: function () { var m = st.lastMove; if (m && performance.now() - m[2] < 90) { st.vel = [m[0] * .8, m[1] * .8]; loop(); } },
      pinch: function (f) { st.zoom = Math.max(1.06, Math.min(1.9, st.zoom * f)); poke(); },
      tilt: function (x, y) { st.tilt = [x, y]; poke(); },
      tap: function (x, y) { st.tap = [x, y, 0]; if (R.lightning) st.flash = .9; loop(); },
      stop: function () {
        st.stopped = true; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0;
        document.removeEventListener("visibilitychange", onVis); removeEventListener("titan:thunder", onThunder);
        html.classList.remove("tr-plate");
        try { if (gl) { Object.keys(tex).forEach(function (k) { gl.deleteTexture(tex[k]); }); var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } } catch (e) { /* ignore */ }
        if (cv.parentNode) cv.parentNode.removeChild(cv);
      },
      debug: function () { return { id: id, ready: st.ready, frames: st.frames, pan: st.pan.slice(), zoom: st.zoom, w: cv.width, h: cv.height, look: JSON.parse(JSON.stringify(look)), flash: st.flash }; }
    };
  }
  window.TitanRoomPlate = { has: has, mount: mount, ROOMS: Object.keys(ROOMS) };
})();
