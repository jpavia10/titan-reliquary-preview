/* fx/xeno.js: Xenohold (xeno) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   A containment hold for strange artifacts: tall glass tanks stand in the dark on hexagonal deck plates, each full of glowing liquid
   with something suspended in it (a pod with lights under its skin) and bubbles rising past it. Bioluminescent growth has crept over the
   floor and the walls in spots of cyan and violet (the first engine's spores, now growing in a place), mist lies low on the deck and
   spores drift in the air. Moment "pulse": the specimens wake and their light runs up the tanks. Touch: a puff of glowing spores bursts
   from where you tapped. Room: orbit the tanks, walk among them, rise. Quality: march steps, the tank interiors, the mist samples and
   the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 CYAN = vec3(.1,.95,.85), VIOLET = vec3(.6,.25,1.), AMBER = vec3(1.,.55,.15);",
    "const vec3 T0 = vec3(-1.35,0.,5.2), T1 = vec3(1.25,0.,7.6), T2 = vec3(-.4,0.,11.);",   // the three tanks
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "vec3 tankC(int i){ return i == 0 ? T0 : i == 1 ? T1 : T2; }",
    "vec3 tankCol(int i){ return i == 0 ? CYAN : i == 1 ? VIOLET : mix(CYAN, AMBER, .6); }",
    "float pulse(){ return 1. + 1.4*momentK(); }",
    // ids: 0 deck, 1 walls, 2 tank metal, 3 tank glass, 4 cables
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(p.y, 0.);",
    "  U(r, min(min(9. - abs(p.x), 18. - p.z), min(p.z + 6., 7.5 - p.y)), 1.);",
    "  for (int i=0;i<3;i++){ vec3 q = p - tankC(i);",
    "    U(r, min(sdCylY(q - vec3(0.,.22,0.), .78, .22) - .02, sdCylY(q - vec3(0.,3.55,0.), .7, .16) - .02), 2.);",   // base and cap
    "    U(r, max(abs(length(q.xz) - .6) - .02, abs(q.y - 1.9) - 1.5), 3.);",                                      // the glass
    "    vec3 rq = q; rq.xz = abs(rq.xz) - .45; U(r, max(length(rq.xz) - .035, abs(q.y - 1.9) - 1.5), 2.); }",       // four rods
    "  vec3 c = vec3(p.x, p.y - 7.3, p.z); U(r, min(length(c.xy - vec2(-1.35, 0.)) - .06, length(c.xy - vec2(1.25, 0.)) - .06), 4.);",   // cables overhead
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    "float growth(vec3 p, vec3 n){ vec2 u = abs(n.y) > .5 ? p.xz : (abs(n.x) > .5 ? p.zy : p.xy); vec2 c = floor(u*3.), f = fract(u*3.) - .5;",   // bioluminescent spots in patches
    "  float pch = smoothstep(.55, .75, vn(u*.35 + 2.)), s = 0.;",
    "  for (int k=0;k<4;k++){ vec2 o = vec2(float(k/2), float(k%2)) - .5 + step(0., f) - .5; vec2 h = h22(c + o); float d = length(f - o - (h - .5)*.6);",
    "    s += smoothstep(.12*h.y + .03, 0., d)*(.5 + .5*sin(uT*(.6 + h.x) + h.y*30.)); }",
    "  return s*pch; }",
    "vec3 tankLight(vec3 p, vec3 n){ vec3 s = vec3(0.); for (int i=0;i<3;i++){ vec3 l = tankC(i) + vec3(0.,1.9,0.), d = l - p; float r = length(d);",
    "  s += tankCol(i)*max(dot(n, d/r), 0.)*1.5*pulse()/(.6 + r*r*.45); } return s*uLook.x; }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) { vec2 h = p.xz*1.6; vec2 a = vec2(h.x + h.y*.577, h.y*1.155); vec2 g = fract(a) - .5; float e = max(abs(g.x), abs(g.y));",   // hex-ish deck plates
    "    return vec3(.05,.055,.06)*(.75 + .4*vn(p.xz*4.))*(1. - .5*smoothstep(.44,.5,e)); }",
    "  if (id < 1.5) return vec3(.035,.04,.045)*(.7 + .5*vn(p.zy*2.));",
    "  if (id < 2.5) return vec3(.1,.105,.11)*(.7 + .4*vn(p.xy*12.));",
    "  return vec3(.03); }",
    // inside a tank: the chord through the liquid, the specimen hanging in it, bubbles
    "vec3 tankInside(int i, vec3 ro, vec3 rd){ vec3 c = tankC(i), o = ro - c; vec2 od = o.xz, dd = rd.xz; float a = dot(dd,dd), b = dot(od,dd), cc = dot(od,od) - .58*.58, disc = b*b - a*cc;",
    "  if (disc < 0.) return vec3(0.); float t1 = (-b + sqrt(disc))/a, L = max(t1, 0.); vec3 col = tankCol(i);",
    "  vec3 g = col*(1. - exp(-L*1.6))*.9*pulse();",
    "  vec3 sc = c + vec3(0., 1.85 + .08*sin(uT*.6 + float(i)), 0.), oc = ro - sc; float bb = dot(oc, rd), c2 = dot(oc, oc) - .3*.3, h = bb*bb - c2;",   // the specimen
    "  if (h > 0.) { float ts = -bb - sqrt(h); if (ts > 0. && ts < L) { vec3 q = ro + rd*ts, n = normalize(q - sc); float sp = smoothstep(.62, .8, vn(n.xy*5. + n.z*3. + float(i)*4.));",
    "    float rim = pow(1. - max(dot(-rd, n), 0.), 3.); g = g*.35 + vec3(.02,.015,.03) + col*rim*.9 + col*sp*(1.2 + 1.5*momentK())*(.6 + .4*sin(uT*2. + n.y*6.)); } }",
    "  float bub = 0.; for (int k=0;k<6;k++){ vec2 hh = h22(vec2(float(k), float(i))); vec3 bp = c + vec3((hh.x - .5)*.7, mod(uT*(.3 + .4*hh.y) + hh.x*3.4, 3.) + .45, (hh.y - .5)*.7);",
    "    vec3 ob = ro - bp; float b2 = dot(ob, rd), c3 = dot(ob, ob) - .03*.03; if (b2*b2 - c3 > 0. && -b2 > 0. && -b2 < L) bub += 1.; }",
    "  return (g + col*bub*.6)*uLook.x; }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p); float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  vec3 c = a*(tankLight(p, n) + vec3(.01,.015,.02)*oc);",
    "  if (id < 1.5) { float g = growth(p, n); c += mix(CYAN, VIOLET, step(.5, vn(p.xz*.2 + p.y*.2)))*g*.9*uLook.y; }",
    "  if (id > 1.5 && id < 2.5) { vec3 h = normalize(normalize(vec3(0.,2.,8.) - p) - rd); c += vec3(.4,.6,.6)*pow(max(dot(n,h),0.), 40.)*.3; }",
    "  if (id > 3.5) c = vec3(.01) + AMBER*step(.97, fract(p.z*.7 - uT*.3))*.6;",                // cables with a running light
    "  return c; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 spores(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.); int N = 18 + 8*int(uTier);",   // spores drifting; puffs from taps
    "  for (int i=0;i<44;i++){ if (i >= N) break; vec3 h = vec3(h22(vec2(float(i), 2.9)), h21(vec2(float(i), 7.7)));",
    "    vec3 x = uCO + uCF*(1.2 + 7.*h.z) + uCR*(h.x - .5)*5. + uCU*((h.y - .5)*3. + .25*sin(uT*.2 + h.x*8.)) + vec3(sin(uT*.13 + h.y*9.), 0., cos(uT*.11 + h.z*5.))*.4;",
    "    vec3 dx = x - ro; float z = dot(dx, uCF); if (z < .4 || length(dx) > tHit) continue; vec2 q = (uv - toScreen(x))*a; float rr = .01/(z*uFov);",
    "    s += mix(CYAN, VIOLET, h.x)*exp(-dot(q,q)/(rr*rr))*(.5 + .5*sin(uT*1.5 + h.y*20.))*.9; }",
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 3.) continue;",
    "    for (int k=0;k<16;k++){ vec2 h = h22(vec2(float(k), float(i) + tp.x*9.)); float an = h.x*6.283; vec2 q = tp.xy*a + vec2(cos(an), sin(an))*tp.z*(.05 + .14*h.y)*(1. - .2*tp.z) + vec2(0., .02*tp.z*tp.z);",
    "      s += mix(CYAN, VIOLET, h.y)*smoothstep(.009, 0., length(uv*a - q))*exp(-tp.z*1.2)*1.8*tp.w; } }",
    "  return s*uLook.z; }",
    "vec3 mist(vec3 ro, vec3 rd, float tEnd){ int N = 8 + 5*int(uTier); float dt = min(tEnd, 20.)/float(N); vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.31)*61.);",
    "  for (int i=0;i<24;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt; float den = .05*smoothstep(1.,0.,x.y)*(.4 + .6*vn(x.xz*.8 + uT*.05))*uLook.w;",
    "    vec3 l = vec3(0.); for (int k=0;k<3;k++){ vec3 d = tankC(k) + vec3(0.,1.2,0.) - x; l += tankCol(k)/(1. + dot(d,d)*.6); }",
    "    acc += (l*pulse()*uLook.x + vec3(.01,.02,.02))*den*dt; } return acc; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.07; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 30.); vec3 col = vec3(0.);",
    "  if (t < 30.) { vec3 p = ro + rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); float id = mapM(p).y; col = shade(p, n, rd, id);",
    "    if (id > 2.5 && id < 3.5) { int ti = 0; float best = 1e3; for (int i=0;i<3;i++){ float d = length((p - tankC(i)).xz); if (d < best) { best = d; ti = i; } }",   // glass: reflection rim + what is inside
    "      float fr = .05 + .95*pow(1. - max(dot(-rd, n), 0.), 4.); col = tankInside(ti, p, refract(rd, n, .75))*(1. - fr) + vec3(.08,.12,.12)*fr + tankCol(ti)*.04; } }",
    "  col = mix(col, vec3(.004,.008,.01), 1. - exp(-t*.05));",
    "  col += mist(ro, rd, t) + spores(uv, ro, t);",
    "  return col; }"
  ].join("\n");
  K.stage("xeno", {
    kind: "ray", glsl: G, grade: .85,
    cam: { pos: [.4, 1.55, -1.6], target: [-.1, 1.95, 7.5], fov: 1.04 },
    steps: [40, 60, 86, 120], shadowSteps: [0, 0, 0, 0], scale: { low: .4 },
    moments: [{ name: "pulse", every: [20, 40], dur: 6 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: 1.1, threshold: .55, knee: .5, exposure: 1.1, aberr: .12, grain: .035, vig: .6 },
    room: { name: "The containment hold", yaw: [-.6, .6], pitch: [-.2, .4], move: [-3, 4.5], up: [0, 2.2], unit: "m", sound: "coral",
      look: [{ id: "tanks", label: "Specimens", min: 0, max: 2, def: 1 }, { id: "growth", label: "Growth", min: 0, max: 2.5, def: 1 },
        { id: "spores", label: "Spores", min: 0, max: 2.5, def: 1 }, { id: "mist", label: "Mist", min: 0, max: 2.5, def: 1 }],
      touch: "Tap anywhere: a puff of glowing spores bursts from where you tapped.",
      opening: { dur: 5.6, from: { yaw: .35, pitch: .3, move: 3.5, up: 1.6 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.3, at: [.5, .45] } }
  });
})();
