/* fx/abyss.js: Shipwreck (abyss) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   Forty fathoms down. A wooden ship lies rolled on its side in the sand, its planking gone in places so the ribs show, a broken mast
   leaning out of it; kelp stands in the foreground and an open chest has spilled gold coins on the seabed. Light comes from far above:
   the first engine's god rays, now real shafts through blue-green water (where they fall is the moving surface seen from that point, so
   the rays and the caustics that net the sand and the hull always agree), with the water swallowing everything with distance.
   Marine snow drifts down past you. Moment "shoal": a school of fish turns through the light. Touch: bubbles rise from where you tapped.
   Room: orbit the wreck, swim toward it, rise toward the light. Quality: march steps, the caustic octaves, the ray samples and the render
   scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 SUN = vec3(.55,.9,1.);",
    "const vec3 DEEP = vec3(.002,.012,.026), SHALLOW = vec3(.012,.075,.1);",
    "const vec3 HULL = vec3(-.6,.55,10.5), CHEST = vec3(1.25,0.,2.7);",
    "vec3 LDIR(){ return normalize(vec3(-.18,-1.,-.12)); }",                 // the way the light falls from the surface
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = max(length(p/(r*r)), 1e-5); return k0*(k0-1.)/k1; }",
    "float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }",
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float sandH(vec2 p){ float h = .07*sin(p.x*1.9 + 1.2*sin(p.y*.45)) + .5*vn(p*.12) - .25 + .08*vn(p*.9); return h*smoothstep(.9, 2.6, length(p - CHEST.xz - vec2(0.,-.4))); }",   // level where the chest sits
    "vec3 hullLocal(vec3 p){ vec3 q = p - HULL; q.xz = rot(.62)*q.xz; q.xy = rot(.32)*q.xy; q.yz = rot(-.1)*q.yz; return q; }",   // turned across the view, rolled, bow up
    // ids: 0 sand, 1 hull planking, 2 ribs and mast, 3 chest, 4 gold, 5 rock, 6 kelp
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2((p.y - sandH(p.xz))*.85, 0.);",
    "  vec3 q = hullLocal(p);",
    "  if (length(q) < 9.) {",
    "    float e = sdEll(q, vec3(1.75,1.55,6.2)), sh = max(abs(e) - .09, q.y - .5);",
    "    float holes = vn(q.zy*vec2(.55,.9)+3.)*.65 + vn(q.zy*1.7)*.35; sh = max(sh, (holes - .6)*.9);",
    "    U(r, sh, 1.);",
    "    float rib = max(max(abs(e + .07) - .07, abs(mod(q.z, .85) - .425) - .06), q.y - .45);",
    "    rib = min(rib, sdBox(q - vec3(0.,-1.45,0.), vec3(.13,.16,5.6)));",          // the keel
    "    rib = min(rib, sdCap(q, vec3(0.,.4,1.4), vec3(0.,5.6,1.9), .13));",         // the mast, broken off
    "    rib = min(rib, sdCap(q, vec3(-1.6,4.1,1.75), vec3(1.4,4.6,1.8), .07));",     // its yard
    "    U(r, rib, 2.);",
    "  }",
    "  vec3 c = p - CHEST; c.xz = rot(-.45)*c.xz;",                                  // the chest, open, coins spilled in front
    "  float ch = max(sdBox(c - vec3(0.,.25,0.), vec3(.42,.25,.28)) - .02, -sdBox(c - vec3(0.,.42,0.), vec3(.37,.2,.23)));",
    "  vec3 lid = c - vec3(0.,.52,.3); lid.yz = rot(-1.15)*lid.yz; ch = min(ch, sdBox(lid - vec3(0.,0.,-.28), vec3(.43,.04,.29)) - .015);",
    "  U(r, ch, 3.);",
    "  float pile = min(sdEll(c - vec3(-.05,-.03,-.58), vec3(.55,.1,.36)), sdEll(c - vec3(.35,-.02,-1.05), vec3(.26,.06,.2)));",   // a heap and a spill
    "  pile = min(pile, sdEll(c - vec3(-.45,-.02,-1.2), vec3(.18,.05,.15))) + .025*vn(c.xz*9.);",
    "  U(r, min(pile, sdBox(c - vec3(0.,.36,0.), vec3(.36,.05,.22))), 4.);",
    "  U(r, min(sdEll(p - vec3(-3.,0.,6.), vec3(1.,.8,.9)) + .12*vn(p.xz*3.), sdEll(p - vec3(3.6,0.,12.), vec3(1.3,1.1,1.2)) + .15*vn(p.xy*2.5)), 5.);",
    "  for (int i=0;i<3;i++){ float fi = float(i); vec3 b = vec3(-.35 + .3*fi, 0., 3.6 + 1.1*mod(fi*1.7, 2.)), k = p - b;",   // kelp beyond the chest, swaying
    "    float h = 3.6 + fi*.8, y = clamp(k.y, 0., h); k.xz -= vec2(sin(y*.6 + uT*.5 + fi*2.), cos(y*.45 + uT*.4 + fi))*.28*y/h;",
    "    vec3 kk = vec3(k.x, k.y - y, k.z); float blade = length(kk*vec3(1.,1.,5.)) - .035 - .025*sin(y*2.3+fi);",   // a stipe with a flat blade along it
    "    U(r, min(length(kk) - .014, blade*.2)*.8, 6.); }",
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    "float caustic(vec2 p){ vec2 i = p; float c = 0., t = uT*.35; int N = 2 + int(uTier);",           // a net of light from the moving surface
    "  for (int n=0;n<5;n++){ if (n >= N) break; float s = t*(1. - 3.5/float(n+1)); i = p + vec2(cos(s-i.x)+sin(s+i.y), sin(s-i.y)+cos(s+i.x));",
    "    c += 1./max(length(vec2(p.x/(sin(i.x+s)/.012), p.y/(cos(i.y+s)/.012))), .002); }",
    "  c /= float(N); c = 1.15 - pow(c, 1.4); return min(pow(abs(c), 7.), 6.); }",
    "vec2 surfAt(vec3 p){ vec3 L = -LDIR(); return p.xz + L.xz*(40.-p.y)/L.y; }",   // where the light reaching p came through the surface
    "float sunAt(vec3 p){ float d = 40.-p.y; return exp(-d*.035)*uLook.x; }",
    "vec3 water(vec3 rd){ float u = max(rd.y, 0.); return mix(DEEP, SHALLOW, smoothstep(-.6, .9, rd.y)) + SUN*.35*pow(u, 6.)*uLook.x; }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) return vec3(.42,.38,.3)*(.75 + .35*vn(p.xz*2.5) + .15*vn(p.xz*18.));",
    "  if (id < 1.5) { vec3 q = hullLocal(p); float pl = smoothstep(.06,.0,abs(fract(q.y*3.2)-.5)-.44);",
    "    return mix(vec3(.16,.13,.09), vec3(.09,.12,.1), vn(q.zy*1.3))*(.7+.5*vn(q.zy*vec2(.6,14.)))*(1.-.5*pl); }",
    "  if (id < 2.5) return vec3(.12,.1,.07)*(.7+.5*vn(p.xy*4.));",
    "  if (id < 3.5) return vec3(.1,.07,.04)*(.7+.4*vn(p.xy*9.));",
    "  if (id < 4.5) return vec3(.55,.36,.1)*(.7+.5*vn(p.xz*40.));",
    "  if (id < 5.5) return vec3(.18,.2,.19)*(.7+.5*vn(p.xz*5.));",
    "  return vec3(.16,.2,.06); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id, float t){",
    "  vec3 a = albedo(id, p), L = -LDIR();",
    "  float sh = TIER > 1 ? shadow(p+n*.02, L, 8.) : 1., ca = caustic(surfAt(p)*.55);",
    "  float oc = TIER > 0 ? ao(p,n) : 1., dl = max(dot(n,L),0.);",
    "  vec3 c = a*SUN*sunAt(p)*(.25 + 1.1*min(ca, 3.))*dl*sh*1.1 + a*SHALLOW*(.4+.5*n.y)*oc*uLook.x;",
    "  if (id > 3.5 && id < 4.5) { vec2 u = p.xz*16., cc = floor(u), f = fract(u)-.5; float best = 9.; vec3 cn = n; float cg = 0.;",   // a heap of coins: discs at random tilts
    "    for (int j=0;j<4;j++){ vec2 o = vec2(float(j/2), float(j%2)) - .5 + step(.0, f) - .5; vec2 hh = h22(cc+o); vec2 d = f - o - (hh-.5)*.5; float r = length(d);",
    "      if (r < .42 && r < best) { best = r; cn = normalize(n + vec3(hh.x-.5, 0., hh.y-.5)*1.4); cg = hh.x; } }",
    "    float rim = smoothstep(.34,.42,best)*step(best,.42); vec3 h = normalize(L-rd), gold = vec3(1.,.66,.18);",
    "    c = a*SHALLOW*.6 + gold*SUN*sunAt(p)*(.15 + .5*min(ca,3.))*(max(dot(cn,L),0.)*.45 + pow(max(dot(cn,h),0.), 20.)*3.5)*sh*(1.-.6*rim);",
    "    c += gold*step(.97, h21(cc + floor(uT*1.3 + cg*9.)))*sunAt(p)*1.5*sh; }",
    "  return c; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 rays(vec3 ro, vec3 rd, float tEnd){ int N = 9 + 7*int(uTier); float dt = min(tEnd, 30.)/float(N); vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.29)*83.);",
    "  for (int i=0;i<32;i++){ if (i >= N) break; float tt = (float(i)+j)*dt; vec3 x = ro + rd*tt; vec2 s = surfAt(x);",
    "    float sh = smoothstep(.62, .9, vn(s*.85 + vec2(uT*.05, uT*.035)))*.75 + smoothstep(.55,.95, vn(s*.3 - uT*.02))*.35;",
    "    acc += SUN*sunAt(x)*sh*exp(-tt*.05)*dt*.16*smoothstep(-2., 6., x.y); }",
    "  return acc*uLook.x*(.6+.4*uLook.y); }",
    "vec3 snow(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",   // marine snow, drifting down past you
    "  for (int i=0;i<40;i++){ if (i >= 16 + 8*int(uTier)) break; vec3 h = vec3(h22(vec2(float(i), 2.3)), h21(vec2(float(i), 5.9)));",
    "    vec3 x = uCO + uCF*(1. + 7.*h.z) + uCR*(h.x-.5)*6. + vec3(0., 3. - mod(uT*.12 + h.y*6., 6.), 0.) + vec3(sin(uT*.2+h.x*9.),0.,cos(uT*.17+h.y*7.))*.3;",
    "    vec3 dx = x-ro; float z = dot(dx, uCF); if (z < .5 || length(dx) > tHit) continue;",
    "    vec2 q = (uv-toScreen(x))*a; s += SHALLOW*2.2*smoothstep(.01/(z*uFov), 0., length(q))*exp(-z*.12); } return s*uLook.z; }",
    "vec3 bubbles(vec2 uv){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",                  // a stream of bubbles from each tap
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 4.) continue;",
    "    for (int k=0;k<10;k++){ vec2 h = h22(vec2(float(k), float(i)+tp.x*13.)); float age = tp.z - h.x*.6; if (age < 0.) continue;",
    "      vec2 c = tp.xy*a + vec2((h.y-.5)*.06 + .015*sin(age*7.+h.x*20.), age*(.12+.08*h.y)); float r = .006 + .012*h.y, d = length(uv*a - c);",
    "      s += SUN*(smoothstep(r, r*.7, d)*smoothstep(r*.4, r*.8, d)*.9 + smoothstep(r*.45, 0., length(uv*a - c - vec2(-.3,.3)*r))*.8)*exp(-age*.5); } }",
    "  return s; }",
    "vec3 shoal(vec2 uv, vec3 ro, float tHit){ if (uMoment.x < 0.) return vec3(0.); vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.); float k = uMoment.x/uMoment.z;",
    "  vec3 c0 = vec3(-9. + 18.*k, 3.2 + sin(k*5.)*.8, 9. + cos(k*3.)*1.5);",
    "  for (int i=0;i<30;i++){ vec3 h = vec3(h22(vec2(float(i), uMoment.y)), h21(vec2(float(i), 4.4)));",
    "    vec3 x = c0 + (h-.5)*vec3(3.,1.6,2.5) + vec3(0., sin(uT*2.+h.x*9.)*.15, 0.); vec3 dx = x-ro; float z = dot(dx, uCF); if (z < .5 || length(dx) > tHit) continue;",
    "    vec2 q = (uv-toScreen(x))*a; float sz = .09/(z*uFov); q /= vec2(sz, sz*.38); float d = length(q) - 1.;",
    "    float flash = pow(max(sin(uT*3.+h.y*20.),0.), 12.); s += mix(-DEEP*4., SUN*.8, flash*.6)*smoothstep(.15, -.15, d)*exp(-z*.05); } return s; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.08; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 40.); vec3 col = water(rd), wc = col;",
    "  if (t < 40.) { vec3 p = ro+rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); vec2 m = mapM(p);",
    "    col = mix(shade(p, n, rd, m.y, t), wc, 1. - exp(-t*.075*uLook.y)); }",
    "  col += rays(ro, rd, t) + snow(uv, ro, t) + shoal(uv, ro, t);",
    "  col += bubbles(uv);",
    "  return col; }"
  ].join("\n");
  K.stage("abyss", {
    kind: "ray", glsl: G, grade: .82,
    roomCam: { mode: "walk", pos: [1.45, .42, 1.7], target: [-.6, 2.2, 10.5], fov: 1.06, bounds: [[-3, .3, -1], [3, 3, 7]] },   // down on the sand by the chest, looking up at the wreck and the light
    cam: { pos: [1.8, 1.35, -2.4], target: [-.3, 1.7, 9.5], fov: 1.02 },
    steps: [44, 64, 90, 120], shadowSteps: [0, 0, 14, 22], scale: { low: .42 },
    moments: [{ name: "shoal", every: [30, 60], dur: 14 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: .8, threshold: .7, knee: .5, exposure: 1.15, aberr: .1, grain: .035, vig: .6 },
    room: { name: "Forty fathoms, at the wreck", yaw: [-.6, .6], pitch: [-.15, .4], move: [-3, 5], up: [0, 2.4], unit: "m", sound: "underwater",
      look: [{ id: "light", label: "Light from above", min: 0, max: 2, def: 1 }, { id: "murk", label: "Murk", min: .3, max: 2, def: 1 },
        { id: "snow", label: "Marine snow", min: 0, max: 2.5, def: 1 }, { id: "speed", label: "Current", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: a stream of bubbles rises from where you tapped.",
      opening: { dur: 5.8, from: { yaw: .45, pitch: .38, move: -2.5, up: 2.3 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.6, at: [.62, .3] } }
  });
})();
