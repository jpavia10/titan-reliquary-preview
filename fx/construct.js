/* fx/construct.js: The Construct (construct) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   A corridor made of code: green phosphor glyphs fall in columns down both walls and down translucent curtains hung across the corridor
   at different depths, so the rain moves against itself as you move (the first engine's falling ASCII, now a place); each stream has a
   bright white head and a fading trail, glyphs flicker as they change, and the black glass floor mirrors all of it. The glyphs are
   made-up marks on a 5x7 grid (never letters you can read). No march: every surface is a plane, met exactly, so it is crisp and cheap.
   Moment "deja vu": a bright wave runs down the corridor through every column. Touch: the code flips bright in a ring from where you
   tapped. Room (walk camera): walk the corridor, turn to the walls, rise. Quality: the number of curtains and the render scale follow
   the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 PHOS = vec3(.18,1.,.42), HEAD = vec3(.85,1.,.9);",
    "const float WX = 2.4, CW = .16, CH = .22;",                            // corridor half width; glyph cell width and height (metres)
    "float glyph(vec2 cell, vec2 f, float t){ float id = floor(h21(cell)*40. + t*(.5 + 3.*h21(cell + 7.))*step(.6, h21(cell + 3.)));",   // a made-up mark on a 5x7 grid, changing now and then
    "  vec2 g = floor(f*vec2(5.,7.)); if (f.x < .08 || f.x > .92 || f.y < .06 || f.y > .94) return 0.;",
    "  float b = step(.55, h21(g + vec2(id*1.7, id*3.1)));",
    "  b = max(b, step(.5, h21(vec2(id, 9.)))*step(abs(g.x - 2.), .1));",            // many marks have a stem
    "  return b; }",
    "float rain(vec2 u, float seed, float dens, float t){ float cx = floor(u.x/CW); float hc = h21(vec2(cx, seed)); if (hc > dens) return 0.;",   // one plane of rain: columns, each a falling stream
    "  float speed = 1.2 + 2.2*h21(vec2(cx, seed + 1.)), len = 6. + 18.*h21(vec2(cx, seed + 2.)), period = 26. + 20.*hc;",
    "  float row = floor(u.y/CH), head = mod(uT*speed + hc*period*3., period) - 4.;",   // rows count down from the top; the head falls
    "  float d = head - row; if (d < 0. || d > len) return 0.;",
    "  vec2 f = fract(vec2(u.x/CW, u.y/CH)); float far = clamp(t*uFov/uRes.y/(CW/5.)*1.2 - 1., 0., 1.), g = mix(glyph(vec2(cx, row + seed*13.), f, uT), .4, far);",
    "  float trail = d < 1. ? 2.6 : pow(1. - d/len, 1.6);",
    "  return g*trail; }",
    "float wave(vec3 p){ if (uMoment.x < 0.) return 0.; float z = uCO.z + uMoment.x*14. - 2.; return exp(-pow((p.z - z)/1.2, 2.))*2.2; }",
    "float tapRingAt(vec3 p){ float s = 0.; for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 3.) continue; vec3 r = camRay(tp.xy);",
    "  float t = r.x > .01 ? (WX - uCO.x)/r.x : r.x < -.01 ? (-WX - uCO.x)/r.x : 30.; if (r.y < -.01) t = min(t, -uCO.y/r.y); vec3 h = uCO + r*min(t, 30.);",
    "  float d = length(p - h); s += exp(-pow((d - tp.z*2.2)/.25, 2.))*exp(-tp.z*.9)*tp.w; } return s; }",
    "vec3 lit(float g, vec3 p){ float k = clamp(g, 0., 3.); return (g > 2. ? HEAD : PHOS)*k*(1. + wave(p) + 1.6*tapRingAt(p)); }",
    "vec3 layers(vec3 ro, vec3 rd, float maxT){ vec3 acc = vec3(0.);",
    "  for (int s=0;s<2;s++){ float sx = s == 0 ? -WX : WX; if (rd.x*(sx - ro.x) <= 0.) continue; float t = (sx - ro.x)/rd.x; if (t > maxT) continue;",   // the two walls
    "    vec3 p = ro + rd*t; if (p.y < 0. || p.y > 5.5) continue; float g = rain(vec2(p.z, 5.5 - p.y), float(s)*17.3, .8*uLook.y, t);",
    "    acc += lit(g, p)*exp(-t*.07)*uLook.x; acc += PHOS*.012*exp(-t*.05); }",
    "  int N = 3 + int(uTier);",
    "  for (int k=0;k<7;k++){ if (k >= N) break; float z0 = (floor(ro.z/7.) + 1. + float(k))*7. + 2.;",   // curtains of rain across the corridor, every 7 m
    "    if (rd.z <= 0.) break; float t = (z0 - ro.z)/rd.z; if (t > maxT) continue; vec3 p = ro + rd*t; if (abs(p.x) > WX || p.y < 0. || p.y > 5.5) continue;",
    "    float g = rain(vec2(p.x + 40., 5.5 - p.y), floor(z0/7.)*5.1 + 3., .28*uLook.y, t); acc += lit(g, p)*exp(-t*.07)*uLook.x*.8; }",
    "  return acc; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.06; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  vec3 col = vec3(.0,.012,.006)*(1. + rd.y);",
    "  float tf = rd.y < -.001 ? -ro.y/rd.y : 1e4;",
    "  col += layers(ro, rd, min(tf, 60.));",
    "  if (tf < 60.) { vec3 p = ro + rd*tf, r = reflect(rd, vec3(0.,1.,0.)); float rip = .02*vn(p.xz*3. + uT*.2);",   // the black glass floor
    "    vec3 rr = normalize(r + vec3(rip, 0., rip)); col += layers(p, rr, 40.)*.45*(.4 + .6*pow(1. - max(-rd.y, 0.), 4.));",
    "    vec2 gl = abs(fract(p.xz/vec2(1., 1.)) - .5); col += PHOS*.035*smoothstep(.49, .5, max(gl.x, gl.y))*exp(-tf*.08) + PHOS*1.2*tapRingAt(p)*.2; }",
    "  col *= .92 + .08*sin(gl_FragCoord.y*3.14159*.5);",                            // phosphor scan lines
    "  return col; }"
  ].join("\n");
  K.stage("construct", {
    kind: "ray", glsl: G, grade: .9,
    cam: { mode: "walk", pos: [.3, 1.7, 0], target: [-.1, 2.1, 20], fov: 1.04, walk: [0, 0, 1], bounds: [[-1.9, .5, -50], [1.9, 4.5, 80]] },
    moments: [{ name: "deja vu", every: [18, 40], dur: 4 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: 1.2, threshold: .45, knee: .5, exposure: 1.05, aberr: .3, grain: .04, vig: .6 },
    room: { name: "Inside the code", yaw: [-.7, .7], pitch: [-.3, .4], move: [-8, 30], up: [0, 2.6], unit: "m", sound: "plasma",
      look: [{ id: "code", label: "Phosphor", min: 0, max: 2, def: 1 }, { id: "rain", label: "Rain of code", min: .2, max: 1.4, def: 1 },
        { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: the code flips bright in a ring from where you tapped.",
      opening: { dur: 5.6, from: { yaw: 0, pitch: -.3, move: -6, up: 2.4 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.2, at: [.5, .55] } }
  });
})();
