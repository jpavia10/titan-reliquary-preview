/* fx/dynasty.js: Dynasty (dynasty) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   A lantern feast at night: across a still lotus pond stands an imperial pavilion, cinnabar lacquer columns and beams picked out in gold
   leaf under a sweeping roof whose eaves turn up at the corners, red lanterns hanging from them. Sky lanterns rise from beyond it into
   the indigo night (the first engine's lantern feast, now real lanterns in a real sky), a thin waterfall falls from the rocks at the
   side, gold leaf drifts in the air, and the pond mirrors all of it until a ripple breaks it. Moment "release": a flight of lanterns
   goes up together. Touch: a lantern is let go where you tapped (and the pond rings if you tapped the water). Room: orbit the pavilion,
   glide across the pond, rise with the lanterns. Quality: march steps, the pond's mirror, the lantern count and the render scale follow
   the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 RED = vec3(.62,.06,.035), GOLD = vec3(1.,.72,.3), LANT = vec3(1.,.34,.1), NIGHT = vec3(.012,.016,.05);",
    "const vec3 PAV = vec3(0.,0.,9.);",
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = max(length(p/(r*r)), 1e-5); return k0*(k0-1.)/k1; }",
    "float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float roofY(vec3 q){ float m = max(abs(q.x)/3.3, abs(q.z)/2.6); return 4.75 - 1.5*m*m + 1.15*pow(m, 7.); }",   // a hipped roof, eaves turned up at the corners
    // ids: 0 water, 1 stone (platform, rocks), 2 lacquer, 3 gold leaf, 4 roof tiles, 5 lantern, 6 lotus pad, 7 hills, 8 waterfall
    "vec2 mapM(vec3 p){",
    "  if (p.y > 9.5) return vec2(p.y - 8.5, 7.);",                                      // nothing up there but sky (the march leaves quickly)
    "  vec2 r = vec2(1e3, 0.);",                                                         // the pond is not in the march: render meets it exactly
    "  vec3 q = p - PAV; float bound = sdBox(q - vec3(0.,2.7,0.), vec3(3.55,2.75,2.85));",
    "  if (bound > .4) U(r, bound, 2.); else {",                                          // the pavilion only when the ray is near it
    "    U(r, sdBox(q - vec3(0.,.22,0.), vec3(3.,.22,2.3)) - .03, 1.);",
    "    U(r, sdBox(q - vec3(0.,.5,0.), vec3(2.7,.06,2.05)), 1.);",
    "    vec3 c = vec3(abs(q.x) - 2.25, q.y - 1.75, abs(q.z) - 1.55); vec3 c2 = vec3(abs(q.x) - .75, q.y - 1.75, abs(q.z) - 1.55);",
    "    U(r, min(sdCylY(c, .13, 1.2), sdCylY(c2, .13, 1.2)), 2.);",                          // eight columns
    "    U(r, sdBox(vec3(q.x, q.y - 3.1, abs(q.z) - 1.55), vec3(2.55,.16,.12)), 2.);",       // the beams
    "    U(r, sdBox(vec3(abs(q.x) - 2.25, q.y - 3.1, q.z), vec3(.12,.16,1.75)), 2.);",
    "    U(r, min(sdBox(vec3(q.x, q.y - 3.32, abs(q.z) - 1.55), vec3(2.6,.06,.15)), sdCylY(vec3(abs(q.x) - 2.25, q.y - 2.88, abs(q.z) - 1.55), .17, .06)), 3.);",   // gilded bands, capitals
    "    float m = max(abs(q.x)/3.3, abs(q.z)/2.6);",
    "    U(r, max((abs(q.y - roofY(q)) - .09)*.55, m - 1.), 4.);",
    "    U(r, max(sdBox(vec3(q.x, q.y - 4.8, q.z), vec3(1.1,.08,.06)), -1.), 3.);",           // the gilded ridge
    "    U(r, min(length(q - vec3(1.15,5.02,0.)) - .14, length(q - vec3(-1.15,5.02,0.)) - .14), 3.);",
    "    vec3 l = vec3(abs(q.x) - 3.05, q.y - 3.15, abs(q.z) - 2.4); U(r, sdEll(l, vec3(.2,.27,.2)), 5.);",   // lanterns at the eave corners
    "    vec3 l2 = vec3(abs(q.x) - 1.1, q.y - 2.85, q.z + 2.05); U(r, sdEll(l2, vec3(.2,.27,.2)), 5.);",
    "  }",
    "  vec3 w = p - vec3(-6.2,0.,11.); float rk = sdEll(w, vec3(2.4,5.,3.5)); U(r, rk > 1.5 ? rk - .65 : rk + .5*vn(p.yz*1.3) + .15*vn(p.yz*5.), 1.);",   // the rocks of the waterfall (noise only near them)
    "  U(r, max(abs(p.x + 3.95 + .05*sin(p.y*2.)) - .06, max(abs(p.z - 10.6) - .45, p.y - 4.2)), 8.);",
    "  if (p.z > 24.) U(r, (p.y - (2.2 + 3.*vn(vec2(p.x*.06, 3.)) + 1.5*vn(vec2(p.x*.2, 7.))))*.5 + max(0., 30. - p.z), 7.); else U(r, 30. - p.z, 7.);",   // hills far behind
    "  vec3 lp = p - vec3(1.6,0.,3.2); float pads = 1e3; if (abs(lp.y) < .3 && length(lp.xz - vec2(0.,1.)) < 4.) for (int i=0;i<5;i++){ vec2 o = vec2(sin(float(i)*2.3)*1.6, cos(float(i)*1.7)*1.2 + float(i)*.5);",
    "    vec2 d = lp.xz - o; float a = atan(d.y, d.x); pads = min(pads, max(length(d) - .38 - .03*sin(a*7.), abs(lp.y - .012) - .008)); }",
    "  U(r, pads < 100. ? pads : max(abs(lp.y) - .2, length(lp.xz - vec2(0.,1.)) - 3.9), 6.);",
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    // lanterns in the sky: rising from beyond the pavilion, drifting, each a warm glow (and their reflections, via the pond)
    "vec3 lanternPos(int i, float tt){ vec3 h = vec3(h22(vec2(float(i), 1.7)), h21(vec2(float(i), 6.3))); float life = 26. + 14.*h.z, age = mod(tt*.6 + h.x*life, life);",
    "  return vec3((h.x - .5)*16. + sin(age*.15 + h.y*6.)*1.5 + age*.12, 1.5 + age*.42, 14. + 18.*h.y + age*.25); }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 skyLanterns(vec3 ro, vec3 rd, float tHit){ vec3 s = vec3(0.); int N = 7 + 12*int(uTier) + int(momentK()*12.);",
    "  for (int i=0;i<60;i++){ if (i >= N) break; vec3 x = lanternPos(i, uT + (i >= 7 + 12*int(uTier) ? 40. : 0.)); vec3 dx = x - ro; float tt = dot(dx, rd); if (tt < .5 || tt > tHit) continue;",
    "    float d = length(dx - rd*tt), rad = .16, fl = .85 + .15*sin(uT*3. + float(i)*7.);",
    "    s += LANT*(smoothstep(rad, rad*.5, d)*2.5 + exp(-d*d/(rad*rad*9.))*.35)*fl*exp(-tt*.012); } return s*uLook.y; }",
    "vec3 tapLanterns(vec3 ro, vec3 rd){ vec3 s = vec3(0.); for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 14.) continue;",   // a lantern let go from each tap
    "  vec3 x = uCO + camRay(tp.xy)*6. + vec3(sin(tp.z*.4)*.3, tp.z*.45, 0.); vec3 dx = x - ro; float tt = dot(dx, rd); if (tt < .3) continue;",
    "  float d = length(dx - rd*tt); s += LANT*(smoothstep(.14, .06, d)*2.6 + exp(-d*d/.12)*.4)*smoothstep(14., 9., tp.z)*tp.w; } return s; }",
    "vec3 sky(vec3 rd){ vec3 c = mix(vec3(.03,.025,.06), NIGHT, smoothstep(0.,.5,rd.y)) + LANT*.04*exp(-max(rd.y,0.)*6.)*uLook.y;",   // the festival glow low over the hills
    "  vec2 sc = rd.xz/(rd.y+.3)*80.; c += vec3(.9)*step(.988, h21(floor(sc)))*smoothstep(.2,.0,length(fract(sc)-.5))*smoothstep(.1,.4,rd.y)*.5; return c; }",
    "vec3 lights(vec3 p, vec3 n){ vec3 s = vec3(0.);",                   // the lanterns on the pavilion light it
    "  for (int k=0;k<6;k++){ vec3 l = PAV + (k < 4 ? vec3(k < 2 ? 3.05 : -3.05, 3.15, mod(float(k),2.) < .5 ? 2.4 : -2.4) : vec3(k == 4 ? 1.1 : -1.1, 2.85, -2.05));",
    "    vec3 d = l - p; float r = length(d); s += LANT*max(dot(n, d/r), 0.)/(.2 + r*r*.5); }",
    "  return s*1.1*uLook.x; }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < 1.5) return vec3(.13,.12,.12)*(.7 + .5*vn(p.xz*3. + p.y));",
    "  if (id < 2.5) return RED*(.85 + .25*vn(p.xy*8.));",
    "  if (id < 3.5) return GOLD;",
    "  if (id < 4.5) { vec3 q = p - PAV; float m = max(abs(q.x)/3.3, abs(q.z)/2.6), t = smoothstep(.0,.1,abs(fract((abs(q.x) > abs(q.z)*1.27 ? q.z : q.x)*5.)-.5)-.38);",
    "    return mix(vec3(.05,.08,.08)*(.7 + .4*t), GOLD*.6, smoothstep(.95,.98,m)); }",   // tiles in rows, a gilded eave
    "  if (id < 5.5) return LANT;",
    "  if (id < 6.5) return vec3(.05,.12,.04)*(.7 + .5*vn(p.xz*9.));",
    "  if (id < 7.5) return vec3(.01,.012,.02);",
    "  return vec3(.6); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  if (id > 4.5 && id < 5.5) { vec3 q = p - PAV; float rib = .75 + .25*smoothstep(.0,.15,abs(fract(q.y*14.)-.5)); return LANT*(.75 + .12*sin(uT*2.5 + p.x))*rib*uLook.x; }",
    "  vec3 a = albedo(id, p), moon = normalize(vec3(-.4,.6,-.5)); float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  vec3 c = a*(lights(p, n) + vec3(.02,.025,.05)*(.5 + .5*n.y)*oc + vec3(.05,.06,.1)*max(dot(n, moon), 0.));",
    "  if (id > 7.5) { float f = vn(vec2(p.z*8., p.y*3. + uT*5.)); c = vec3(.5,.6,.7)*(.15 + .5*f*f)*uLook.z; }",   // falling water
    "  if (id > 1.5 && id < 3.5) { for (int k=0;k<2;k++){ vec3 l = PAV + vec3(k == 0 ? 1.1 : -1.1, 2.85, -2.05); vec3 h = normalize(normalize(l - p) - rd);",   // lacquer and gold catch the lanterns
    "    c += (id > 2.5 ? GOLD*.7 : vec3(1.,.6,.4)*.5)*pow(max(dot(n,h),0.), id > 2.5 ? 20. : 60.)*uLook.x/(1. + .2*dot(l-p,l-p)); } }",
    "  return c; }",
    "float pondRipple(vec2 p){ float s = .4*vn(p*2.5 + vec2(uT*.2, 0.)) + .6*vn(p*6. - vec2(0., uT*.3));",
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 4.) continue; vec3 r = camRay(tp.xy); if (r.y > -.01) continue; vec2 c = (uCO + r*(-uCO.y/r.y)).xz;",
    "    float d = length(p - c); s += sin(d*14. - tp.z*9.)*exp(-pow(d - tp.z*.9, 2.)*3.)*exp(-tp.z*.8)*2.; } return s; }",
    "vec3 surf(vec3 ro, vec3 rd, float t, float maxT){ if (t >= maxT) return sky(rd) + skyLanterns(ro, rd, 1e4); vec3 p = ro + rd*t; p -= nrm(p)*map(p); return shade(p, nrm(p), rd, mapM(p).y) + skyLanterns(ro, rd, t); }",
    "vec3 gold(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",   // gold leaf drifting in the air near you
    "  for (int i=0;i<24;i++){ if (i >= 6 + 7*int(uTier)) break; vec3 h = vec3(h22(vec2(float(i), 9.1)), h21(vec2(float(i), 3.3)));",
    "    vec3 x = uCO + uCF*(1.5 + 6.*h.z) + uCR*(h.x - .5)*4. + uCU*(1.5 - mod(uT*.08 + h.y*3., 3.)) + vec3(sin(uT*.3 + h.x*9.), 0., cos(uT*.25 + h.y*7.))*.3;",
    "    vec3 dx = x - ro; float z = dot(dx, uCF); if (z < .5 || length(dx) > tHit) continue; vec2 q = (uv - toScreen(x))*a;",
    "    s += GOLD*smoothstep(.007/(z*uFov), 0., length(q))*pow(max(sin(uT*4. + h.x*40.), 0.), 6.)*2.; } return s; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.07; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float tw = rd.y < -.001 ? -ro.y/rd.y : 1e4, tm = min(tw, 70.), t = march(ro, rd, tm); bool water = t >= tm && tw < 70.;",
    "  vec3 col = water ? vec3(0.) : surf(ro, rd, t, 70.);",
    "  if (water) t = tw;",
    "  if (t < 70.) { vec3 p = ro + rd*t;",
    "    if (water) { float rp = pondRipple(p.xz); vec3 n2 = normalize(vec3(rp*.03, 1., rp*.02)), r = reflect(rd, n2);",   // the pond: a dark mirror
    "      float fr = .04 + .96*pow(1. - max(dot(-rd, n2), 0.), 5.); vec3 rc;",
    "      if (TIER > 0) { float t2 = march(p + vec3(0.,.02,0.), r, 60.); rc = surf(p + vec3(0.,.02,0.), r, t2, 60.); }",
    "      else rc = sky(r) + LANT*.25*smoothstep(.3,.0,abs(r.x - .1))*smoothstep(.05,.4,r.y)*uLook.y;",   // Low: the lanterns as a glow in the mirror
    "      col = vec3(.004,.006,.01) + rc*mix(.35, 1., fr); }",
    "    col = mix(col, NIGHT*.6, 1. - exp(-t*.015)); }",
    "  col += tapLanterns(ro, rd) + gold(uv, ro, t);",
    "  return col; }"
  ].join("\n");
  K.stage("dynasty", {
    kind: "ray", glsl: G, grade: .85,
    roomCam: { mode: "walk", pos: [0, 1.55, 9.6], target: [-.4, 7.5, 26], fov: 1.08, walk: [0, 0, 1], bounds: [[-2.4, .9, 7.2], [2.4, 3.2, 10.8]] },   // under the pavilion roof, the lanterns going up
    cam: { pos: [1.4, 1.5, -6.5], target: [-.3, 3.1, 9], fov: 1.04 },
    steps: [32, 56, 84, 120], shadowSteps: [0, 0, 0, 0], scale: { low: .36 },
    moments: [{ name: "release", every: [30, 55], dur: 16 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: 1.05, threshold: .6, knee: .5, exposure: 1.1, aberr: .06, grain: .03, vig: .55 },
    room: { name: "The lantern pond", yaw: [-.6, .6], pitch: [-.2, .45], move: [-3, 9.5], up: [0, 2.8], unit: "m", sound: "waterfall",
      look: [{ id: "lanterns", label: "Pavilion lanterns", min: 0, max: 2, def: 1 }, { id: "sky", label: "Sky lanterns", min: 0, max: 2.5, def: 1 },
        { id: "falls", label: "Waterfall", min: 0, max: 2, def: 1 }, { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: a lantern is let go from where you tapped (and the pond rings if you tapped the water).",
      opening: { dur: 5.8, from: { yaw: -.25, pitch: .45, move: -2.5, up: 2.6 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.5, at: [.5, .2] } }
  });
})();
