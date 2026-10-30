/* fx/valhalla.js: Gilded Armory (valhalla) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   A Norse hall at night by hearthfire: the long fire burns in its stone-lined pit down the middle of the floor, carved posts hold the
   roof in two rows, painted round shields hang on the plank walls, and at the far end on the dais the hoard (gold, coin and arm rings)
   catches the firelight. Smoke climbs to the rafters and out of the smoke hole, where a shaft of cold moonlight comes down; sparks rise
   from the fire (the first engine's mead-hall embers, now from a real fire). Moment "the fire roars": a log settles and the fire surges
   with a gust of sparks. Touch: sparks burst from where you tapped and the fire answers. Room (walk camera): walk the hall, turn to the
   shields, rise into the rafters. Quality: march steps, flame and smoke samples, shadows and the render scale follow the tier. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "uniform float uFlick, uRoar;",
    "const vec3 FIRE = vec3(1.,.42,.12), HOT = vec3(1.,.78,.45), MOON = vec3(.5,.62,.9), GOLD = vec3(1.,.68,.25);",
    "const float HW = 3.6;",                                                  // half width of the hall
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = max(length(p/(r*r)), 1e-5); return k0*(k0-1.)/k1; }",
    "float sdCylX(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.yz), p.x)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float roofY(float x){ return 6.4 - abs(x)*.9; }",
    // ids: 0 earth floor, 1 plank walls, 2 posts and rafters, 3 hearth stones, 4 shield face, 5 shield boss, 6 gold, 7 roof thatch
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(p.y, 0.);",
    "  U(r, min(HW - abs(p.x), min(15.5 - p.z, p.z + 6.)), 1.);",
    "  U(r, (roofY(p.x) - p.y)*.74, 7.);",
    "  float hole = sdBox(vec3(p.x, 0., p.z - 5.5), vec3(.45, 9., .6));",   // the smoke hole above the fire
    "  r.x = r.y > 6.5 ? max(r.x, -hole) : r.x;",
    "  vec3 q = vec3(abs(p.x) - 2.15, p.y, mod(p.z + 1.25, 2.5) - 1.25); float ang = atan(q.z, q.x);",
    "  float post = max(length(q.xz) - .2 - .015*sin(ang*8.) - .02*sin(p.y*9.)*smoothstep(3.,4.,p.y), p.y - roofY(2.15));",   // carved posts
    "  vec3 rf = vec3(p.x, p.y - roofY(p.x) + .2, mod(p.z + 1.25, 2.5) - 1.25); post = min(post, sdBox(rf, vec3(HW, .12, .1)));",   // rafters
    "  post = min(post, sdBox(vec3(abs(p.x) - 2.15, p.y - 4.35, p.z - 4.5), vec3(.12, .14, 11.)));",   // the beams on the posts
    "  U(r, post, 2.);",
    "  vec3 h = p - vec3(0., 0., 5.5); float rim = sdBox(h, vec3(.72, .07, 3.15)) - .07, pit = sdBox(h - vec3(0., .08, 0.), vec3(.58, .1, 3.02));",
    "  U(r, max(rim + .04*vn(h.xz*7.), -pit), 3.);",                                   // the stone-lined hearth
    "  vec3 s = vec3(HW - abs(p.x), p.y - 2.3, mod(p.z + .625, 1.25) - .625);",       // shields along both walls
    "  float sh = max(sdCylX(s, .4, .04), abs(p.z - 4.5) - 9.5); U(r, sh, 4.);",
    "  U(r, max(length(s - vec3(.06, 0., 0.)) - .1, abs(p.z - 4.5) - 9.5), 5.);",
    "  vec3 o = p - vec3(0., 0., 12.4);",                                              // the hoard on the dais
    "  U(r, sdBox(o - vec3(0., .18, .4), vec3(2.2, .18, 1.6)), 3.);",
    "  U(r, min(sdEll(o - vec3(0., .36, .2), vec3(1.3, .55, .9)), sdEll(o - vec3(.9, .36, -.5), vec3(.5, .25, .4))) + .03*vn(o.xz*8.), 6.);",
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    "float fireK(){ return (1. + .35*uFlick + .9*uRoar)*uLook.x; }",
    "vec3 fireLight(vec3 p, vec3 n){ vec3 s = vec3(0.);",                 // the long fire as three flickering lights
    "  for (int k=0;k<3;k++){ vec3 l = vec3(0., .7, 3.9 + float(k)*1.6); vec3 d = l-p; float r = length(d); d /= r;",
    "    float sh = (TIER > 1 && k == 1) ? shadow(p + n*.03, d, 8.) : 1.; s += FIRE*max(dot(n,d),0.)*sh/(.25 + r*r*.3); }",
    "  return s*fireK()*2.2; }",
    "vec3 moonShaft(vec3 p){ vec3 L = normalize(vec3(.25, 1., -.15)); float t = (6.6 - p.y)/L.y; vec3 q = p + L*t;",   // moonlight through the smoke hole
    "  return MOON*smoothstep(.06, -.06, sdBox(vec3(q.x, 0., q.z - 5.5), vec3(.42, 1., .57)))*step(p.y, 6.4)*uLook.y; }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) return vec3(.12,.09,.06)*(.7 + .5*vn(p.xz*2.) + .2*vn(p.xz*vec2(30.,4.)));",
    "  if (id < 1.5) { float pl = smoothstep(.04,.0,abs(fract(p.y*2.4)-.5)-.46); return vec3(.16,.1,.06)*(.65 + .5*vn(vec2(p.z*.6, p.y*24.)))*(1. - .6*pl); }",
    "  if (id < 2.5) return vec3(.14,.085,.045)*(.7 + .5*vn(p.xz*5. + p.y*.4));",
    "  if (id < 3.5) return vec3(.08,.075,.07)*(.5 + .7*vn(p.xz*6.))*(1. - .5*smoothstep(.9,.6,abs(p.x))*step(p.y,.3));",   // stones, sooty near the fire
    "  if (id < 4.5) { float sx = floor(p.z/1.25 + .5); vec3 s = vec3(HW - abs(p.x), p.y - 2.3, mod(p.z + .625, 1.25) - .625); float a = atan(s.y, s.z), h = h21(vec2(sx, sign(p.x)));",
    "    vec3 c1 = h < .33 ? vec3(.5,.08,.05) : h < .66 ? vec3(.06,.14,.32) : vec3(.55,.42,.1), c2 = vec3(.62,.58,.5);",
    "    float pat = h < .5 ? step(0., sin(a*2.)) : step(.5, fract(a/1.5708 + .25));",
    "    return mix(c1, c2, pat)*(.7 + .4*vn(s.yz*12.))*(1. - .5*smoothstep(.34, .4, length(s.yz))); }",
    "  if (id < 5.5) return vec3(.2,.18,.15);",
    "  if (id < 6.5) return GOLD;",
    "  return vec3(.09,.07,.04)*(.7 + .5*vn(p.xz*vec2(2.,9.)));",
    "}",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p); float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  vec3 c = a*(fireLight(p, n) + vec3(.012,.012,.02)*oc + moonShaft(p)*max(dot(n, normalize(vec3(.25,1.,-.15))),0.)*1.6);",
    "  if (id > 2.5 && id < 3.5 && abs(p.z - 5.5) < 3.1 && abs(p.x) < .6 && p.y < .14) { float co = vn(p.xz*7. + vec2(0., uT*.15)); c += mix(vec3(.35,.04,.01), FIRE, co*co)*smoothstep(.3,.8,co + .2*uFlick)*fireK()*.9; }",   // the bed of coals
    "  if ((id > 4.5 && id < 6.5)) { vec3 l = vec3(0., .8, 5.5); vec3 h = normalize(normalize(l - p) - rd); float sp = pow(max(dot(n,h),0.), id > 5.5 ? 30. : 50.);",
    "    c += (id > 5.5 ? GOLD : vec3(.9))*HOT*sp*fireK()*(id > 5.5 ? 2.2 : .8)/(1. + .05*dot(l-p,l-p));",
    "    if (id > 5.5) c += GOLD*step(.985, h21(floor(p.xz*30.) + floor(uT*2.)))*fireK()*.8; }",
    "  return c; }",
    "float flame(vec3 x){ vec3 h = x - vec3(0., .14, 5.5); if (abs(h.x) > .6 || abs(h.z) > 3. || h.y < 0. || h.y > 2.2) return 0.;",   // tongues of fire along the pit
    "  float n = fbm3(vec3(h.x*4.2, h.y*3.2 - uT*2.8, h.z*2.6 + uT*.4)), top = 1. + .45*vn(vec2(h.z*1.4, uT*.8)) + .6*uRoar;",
    "  float shape = (1. - h.y/top) - abs(h.x)*1.5;",
    "  return smoothstep(.3, .62, n*.95 + shape*.85 - .3)*smoothstep(3., 2.5, abs(h.z))*smoothstep(0., .06, h.y); }",
    "vec3 fireVol(vec3 ro, vec3 rd, float tEnd){ vec3 bmin = vec3(-.62,.14,2.45), bmax = vec3(.62,2.4,8.55), ir = 1./rd;",   // the flames, sampled finely inside their own box
    "  vec3 t0 = (bmin-ro)*ir, t1 = (bmax-ro)*ir, lo = min(t0,t1), hi = max(t0,t1); float ta = max(max(lo.x,lo.y),max(lo.z,0.)), tb = min(min(hi.x,hi.y),min(hi.z,tEnd));",
    "  if (tb <= ta) return vec3(0.); int N = 10 + 8*int(uTier); float dt = (tb-ta)/float(N), j = h21(gl_FragCoord.xy + fract(uT*.41)*57.); vec3 acc = vec3(0.); float tr = 1.;",
    "  for (int i=0;i<40;i++){ if (i >= N) break; vec3 x = ro + rd*(ta + (float(i)+j)*dt); float fl = flame(x), hy = x.y - .14;",
    "    vec3 c = mix(vec3(1.,.55,.2)*.9, mix(FIRE*.85, vec3(.45,.07,.02), smoothstep(.45, 1.3, hy)), smoothstep(.05, .45, hy));",
    "    acc += c*fl*dt*3.2*fireK()*tr/(1. + .25*max(0., 7. - length(x - ro))); tr *= exp(-fl*dt*6.); }",   // up close the flames are thinner, not a white wall
    "  return acc; }",
    "vec3 volume(vec3 ro, vec3 rd, float tEnd){ int N = 6 + 6*int(uTier); float dt = min(tEnd, 28.)/float(N), tr = 1.;",
    "  vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.37)*91.);",
    "  for (int i=0;i<30;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt;",
    "    float sm = (.002 + .02*fbm3(x*.5 + vec3(0., -uT*.25, 0.))*smoothstep(1.5, 5.5, x.y))*uLook.z;",
    "    float r = length(x - vec3(0., .8, 5.5)); acc += (FIRE*fireK()*1.6/(1. + r*r*.25) + moonShaft(x)*1.2)*sm*dt*tr; tr *= exp(-sm*dt); }",
    "  return acc + fireVol(ro, rd, tEnd); }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 embers(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",
    "  for (int i=0;i<26;i++){ if (i >= 14 + 4*int(uTier)) break; vec2 h = h22(vec2(float(i), 5.7)); float life = 3. + 2.5*h.y, age = mod(uT*.7 + h.x*life*5.3, life);",
    "    vec3 x = vec3((h.x-.5)*.9 + .35*sin(age*1.7 + h.y*6.), .4 + age*1.15*(1. + .6*uRoar), 3.2 + 4.6*h.y + .3*sin(age*2.3));",
    "    vec3 dx = x-ro; float z = dot(dx, uCF); if (z < .4 || length(dx) > tHit) continue;",
    "    vec2 q = (uv-toScreen(x))*a; float rad = .016/(z*uFov);",
    "    s += mix(HOT, FIRE, age/life)*smoothstep(rad, 0., length(q))*smoothstep(life, .4*life, age)*(.6 + .4*sin(uT*11. + h.x*50.))*1.8; } return s*fireK(); }",
    "vec3 sparks(vec2 uv, vec2 c0, float age, float seed){ vec3 s = vec3(0.); if (age < 0. || age > 1.6) return s; vec2 a = vec2(ASP(),1.);",
    "  for (int i=0;i<24;i++){ vec2 h = h22(vec2(float(i), seed)); float an = h.x*6.283, sp = .2 + .45*h.y;",
    "    vec2 v = vec2(cos(an), sin(an)*.7 + .45)*sp, p0 = c0*a + v*age + vec2(0., -.35)*age*age, v2 = v + vec2(0., -.7)*age, d = uv*a - p0, dir = normalize(v2);",
    "    float along = clamp(dot(d, -dir), 0., .016), w = length(d + dir*along); s += mix(HOT, FIRE, min(age*1.4, 1.))*(smoothstep(.003, 0., w)*1.4 + smoothstep(.012, 0., w)*.2)*exp(-age*2.)*(1. - age/1.6); }",
    "  return s; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.06; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 30.); vec3 col = vec3(0.);",
    "  if (t < 30.) { vec3 p = ro+rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); col = shade(p, n, rd, mapM(p).y); }",
    "  else col = MOON*.15*uLook.y;",                                        // the night sky through the smoke hole
    "  col = mix(col, vec3(.01,.006,.004), 1. - exp(-t*.025));",
    "  col += volume(ro, rd, t) + embers(uv, ro, t);",
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z >= 0. && tp.z < 1.6) col += sparks(uv, tp.xy, tp.z, float(i)*7.3 + floor(tp.x*40.))*tp.w; }",
    "  return col; }"
  ].join("\n");
  function sm(a, b, k) { return a + (b - a) * k; }
  K.stage("valhalla", {
    kind: "ray", glsl: G, grade: .82,
    roomCam: { mode: "walk", pos: [.7, 1.55, 11.0], target: [-.1, 1.1, 2.0], fov: 1.04, walk: [0, 0, -1], bounds: [[-1.6, .6, 2], [1.6, 5, 11.4]] },   // on the dais by the hoard, the fire below
    cam: { mode: "walk", pos: [1.2, 1.9, -3.4], target: [-.3, 2.6, 9], fov: 1.04, walk: [0, 0, 1], bounds: [[-1.6, .6, -5.6], [1.6, 5., 10.5]] },
    steps: [40, 60, 86, 120], shadowSteps: [0, 0, 14, 22], scale: { low: .4 },
    moments: [{ name: "the fire roars", every: [25, 45], dur: 4.5 }],
    onTap: function (x, y, S) { S.data.breath = 1; if (S.view.mode === "opening") S.startMoment(0); },
    step: function (c, S) {
      var D = S.data, dt = Math.min(c.dt || 0, .1), m = S.moment;
      if (D.f == null) { D.f = 0; D.f2 = 0; D.breath = 0; D.roar = 0; }
      D.f2 = sm(D.f2, Math.random() - .5, Math.min(1, dt * 10)); D.f = sm(D.f, D.f2 + .25 * Math.sin(c.t * 1.7), Math.min(1, dt * 5));
      D.breath = Math.max(0, D.breath - dt * .8);
      var k = m ? (c.t - m.t0) / m.dur : 1; D.roar = m ? Math.max(0, Math.sin(Math.min(1, k) * Math.PI)) * (k < .15 ? k / .15 : 1) : sm(D.roar, 0, Math.min(1, dt * 2));
      if (c.still) { D.f = 0; D.f2 = 0; }
    },
    uniforms: function (gl, u, c, S) { var D = S.data; gl.uniform1f(u.uFlick, D.f || 0); gl.uniform1f(u.uRoar, Math.min(1.4, (D.roar || 0) + .8 * (D.breath || 0))); },
    post: { bloom: 1, threshold: .62, knee: .5, exposure: 1.1, aberr: .07, grain: .04, vig: .6 },
    room: { name: "The hall by hearthfire", yaw: [-.75, .75], pitch: [-.2, .45], move: [-2, 11], up: [0, 2.8], unit: "m", sound: "fire",
      look: [{ id: "fire", label: "Hearthfire", min: 0, max: 2, def: 1 }, { id: "moon", label: "Moon through the roof", min: 0, max: 2.5, def: 1 },
        { id: "smoke", label: "Smoke", min: 0, max: 2, def: 1 }, { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: sparks burst from where you tapped and the fire answers.",
      opening: { dur: 5.8, from: { yaw: .12, pitch: -.2, move: 9.5, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.4, at: [.5, .3] } }
  });
})();
