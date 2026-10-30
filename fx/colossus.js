/* fx/colossus.js: The Mint (colossus) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   The coining room at night, lit only by what is hot: a brick furnace at the back with fire in its arched mouth, and in front of it the
   old screw press, cast iron, with its balancier arm and the two iron balls that drive the screw. To the right a crucible on its stand
   pours a thread of molten silver into a row of ingot moulds that glow white where the metal is still liquid (the first engine's
   molten-silver effect, now real metal in real moulds). Smoke hangs under the beams in the fire's light; embers rise.
   Moment "strike": the arm is swung, the screw drives the ram down and the die rings with a flash and a shower of sparks.
   Touch: sparks burst from where you tapped and the furnace breathes. Room: orbit the press, walk up to it, rise to the arm.
   Quality: march steps, shadows from the furnace, the smoke samples and the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "uniform float uArm, uRam, uFlick, uStrike;",       // the arm's angle, the ram's drop, the fire's flicker, the strike's flash
    "const vec3 FIRE = vec3(1.,.38,.1);",
    "const vec3 HOT = vec3(1.,.82,.58);",
    "const vec3 PRESS = vec3(.6,0.,4.5);",
    "const vec3 FL = vec3(-.75,.95,7.75);",             // the light at the furnace mouth
    "const vec3 MOULD = vec3(1.0,.8,2.95);",            // the first ingot mould, on the casting table
    "const vec3 ML = MOULD + vec3(.08,.4,.18);",          // the light from the molten silver
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdBox2(vec2 p, vec2 b){ vec2 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,q.y),0.); }",
    "float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }",
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    // ids: 0 floor, 1 brick, 2 iron, 3 fire, 4 molten silver, 5 the pour, 6 mould, 7 timber
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(p.y, 0.);",
    "  U(r, min(9.3-p.z, min(p.z+6., 7.-abs(p.x))), 1.);",                        // walls
    "  vec3 b = vec3(p.x, p.y-6.55, mod(p.z+1., 2.2)-1.1); U(r, min(7.2-p.y, sdBox(b, vec3(8.,.2,.14))), 7.);",   // ceiling + beams
    "  vec3 q = p - vec3(-.75,0.,8.4);",                                          // the furnace: brick block, arched mouth, hood, flue
    "  float fb = sdBox(q-vec3(0.,1.3,0.), vec3(1.3,1.3,.9)) - .03;",
    "  float mo = min(sdBox2(q.xy-vec2(0.,.75), vec2(.5,.45)), length(q.xy-vec2(0.,1.2))-.5);",
    "  fb = max(fb, -max(mo, abs(q.z+.9)-.6));",
    "  fb = min(fb, sdBox(q-vec3(0.,3.05,.15), vec3(1.05-.25*clamp(q.y-2.6,0.,1.),.45,.75)));",
    "  fb = min(fb, sdBox(q-vec3(0.,5.,.35), vec3(.42,1.6,.42)));",
    "  U(r, fb, 1.);",
    "  U(r, max(mo, abs(q.z+.28)-.02), 3.);",                                     // the fire at the back of the mouth
    "  vec3 c = p - PRESS;",                                                      // the press
    "  float pr = min(sdBox(c-vec3(0.,.2,0.), vec3(.82,.2,.6)) - .02, sdBox(c-vec3(0.,.48,0.), vec3(.68,.1,.48)) - .015);",   // a stepped base
    "  pr = min(pr, sdBox(c-vec3(0.,.62,0.), vec3(.4,.06,.4)));",
    "  vec3 cc = c; cc.x = abs(cc.x)-.58; pr = min(pr, sdCylY(cc-vec3(0.,1.62,0.), .095, 1.05));",   // round columns with collars
    "  vec3 cy = cc; cy.y = abs(cy.y-1.62)-.92; pr = min(pr, sdCylY(cy, .14, .06) - .01);",
    "  pr = min(pr, max(sdBox(c-vec3(0.,2.74,0.), vec3(.84,.22,.21)) - .04, -(length(c.xy-vec2(0.,2.2))-.42)));",   // the crown, arched underneath
    "  float ang = atan(c.z, c.x);",
    "  pr = min(pr, .7*sdCylY(c-vec3(0.,2.5-uRam,0.), .095 + .009*sin(ang + c.y*62. - uArm), 1.12));",   // the screw: its thread turns with the arm
    "  pr = min(pr, sdBox(c-vec3(0.,1.24-uRam,0.), vec3(.24,.1,.24)) - .01);",
    "  vec3 m = c - vec3(0.,3.66-uRam,0.); m.xz = rot(uArm)*m.xz;",
    "  pr = min(pr, sdCap(m, vec3(-1.35,0.,0.), vec3(1.35,0.,0.), .045)); pr = min(pr, min(length(m-vec3(1.47,0.,0.)), length(m+vec3(1.47,0.,0.)))-.21);",
    "  pr = min(pr, sdCylY(m, .15, .1));",
    "  U(r, pr, 2.);",
    "  vec3 o = p - MOULD; o.xz = rot(-.5)*o.xz;",
    "  U(r, min(sdBox(o-vec3(0.,-.04,.85), vec3(.32,.035,1.15)), sdBox(vec3(abs(o.x)-.26, o.y+.42, abs(o.z-.85)-1.), vec3(.035,.4,.035))), 2.);",   // the casting table
    "  float k = clamp(floor(o.z/.46+.5), 0., 4.); o.z -= k*.46;",   // five ingot moulds
    "  U(r, max(sdBox(o-vec3(0.,.07,0.), vec3(.17,.07,.21)), -sdBox(o-vec3(0.,.13,0.), vec3(.12,.06,.16))), 6.);",
    "  U(r, sdBox(o-vec3(0.,.055+.05*(1.-k*.18),0.), vec3(.12,.012,.16)), 4.);",
    "  vec3 cr = p - MOULD - vec3(-.12,.86,-.1); cr.xy = rot(-.95)*cr.xy;",                   // the crucible, tipped
    "  U(r, max(sdCylY(cr, .18, .2), -sdCylY(cr-vec3(0.,.05,0.), .14, .2)), 2.);",
    "  vec3 sq = p - MOULD; U(r, min(sdCap(sq, vec3(-.36,-.02,-.36), vec3(-.24,1.,-.2), .022), sdCap(sq, vec3(-.36,-.02,.22), vec3(-.24,1.,.02), .022)), 2.);",   // its stand
    "  U(r, sdCap(sq, vec3(-.24,.98,-.2), vec3(-.24,.98,.02), .02), 2.);",
    "  U(r, sdCap(sq, vec3(-.02,.76,-.08), vec3(.0,.12,-.02), .014+.004*sin(p.y*30.-uT*9.)), 5.);",   // the thread of silver
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    "float fireK(){ return (1. + .35*uFlick)*uLook.x; }",
    "float shadowT(vec3 p, vec3 n, vec3 L, float far){ if (TIER < 2) return 1.; vec3 d = L-p; float r = length(d); return shadow(p+n*.02, d/r, 10.); }",
    "vec3 light(vec3 p, vec3 n, vec3 L0, vec3 col, float sh){ vec3 d = L0-p; float r = length(d); d /= r; return col*max(dot(n,d),0.)*sh/(.3+r*r*.35); }",
    "vec3 albedo(float id, vec3 p, vec3 n){",
    "  if (id < .5) { vec2 g = abs(fract(p.xz*vec2(.8,.6))-.5); float j = smoothstep(.47,.5,max(g.x,g.y));",
    "    return mix(vec3(.11,.095,.085)*(.6+.6*fbm(p.xz*1.3)), vec3(.03), j)*(.75+.35*fbm(p.xz*9.)); }",
    "  if (id < 1.5) { vec2 u = abs(n.x) > .5 ? p.zy : p.xy; u *= vec2(4.,7.); u.x += .5*mod(floor(u.y),2.); vec2 f = abs(fract(u)-.5);",
    "    float mo = smoothstep(.42,.48,max(f.x*1.,f.y)); vec3 br = vec3(.33,.13,.07)*(.6+.7*h21(floor(u)))*(.7+.4*fbm(p.xy*3.)); return mix(br, vec3(.08,.07,.06), mo)*(.55+.45*smoothstep(0.,4.,9.3-p.z+abs(p.x))); }",
    "  if (id < 2.5) { float r = fbm(p.xy*6.+p.z*2.); return mix(vec3(.03,.034,.031), vec3(.07,.035,.016), smoothstep(.55,.8,r))*(.75+.5*fbm(p.xy*20.+p.z*5.)); }",   // painted cast iron, rust where it rubs
    "  if (id < 6.5) return vec3(.06,.055,.05);",
    "  return vec3(.07,.045,.03)*(.7+.5*fbm(vec2(p.x*.6, p.y*9.)));",
    "}",
    "vec3 emit(float id, vec3 p){",
    "  if (id > 2.5 && id < 3.5) { float f = fbm(vec2(p.x*3., p.y*2.5 - uT*1.6)); return FIRE*(.45 + 2.4*f*f + .4*uFlick)*(1.3-.6*clamp(p.y-.4,0.,1.))*fireK(); }",
    "  if (id > 3.5 && id < 4.5) { float s = fbm(p.xz*9. + vec2(uT*.05, 0.)); return HOT*(1.6 + 1.6*s)*uLook.y; }",   // the skin on the molten metal
    "  if (id > 4.5 && id < 5.5) return HOT*(3. + .8*sin(p.y*40.-uT*12.))*uLook.y;",
    "  return vec3(0.); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p, n), e = emit(id, p);",
    "  if (dot(e, e) > 0.) return e;",
    "  float oc = TIER > 0 ? ao(p,n) : 1., hot = smoothstep(.45,.0,length(p-MOULD-vec3(0.,.1,0.)))*step(5.5, id)*step(id, 6.5);",
    "  vec3 fd = normalize(p-FL); float fc = smoothstep(-.35,.5, -fd.z);",            // the mouth throws its light forward
    "  vec3 c = a*light(p, n, FL, FIRE*7.*fireK()*fc, shadowT(p, n, FL, 12.));",
    "  c += a*light(p, n, ML, HOT*1.4*uLook.y, 1.);",
    "  c += a*light(p, n, PRESS+vec3(0.,.9,-.3), HOT*14.*uStrike, 1.);",
    "  c += a*vec3(.018,.024,.04)*(.5+.5*n.y)*oc + HOT*hot*.25*uLook.y;",                 // cold night through the high windows; the mould glows near the metal
    "  if (id > 1.5 && id < 2.5) { vec3 h = normalize(normalize(FL-p)-rd); c += FIRE*fc*.5*pow(max(dot(n,h),0.), 30.)*fireK()*shadowT(p, n, FL, 12.);",   // cast iron catches the fire
    "    h = normalize(normalize(ML-p)-rd); c += HOT*.25*pow(max(dot(n,h),0.), 40.)*uLook.y; }",
    "  if (id < .5) { vec3 h = normalize(normalize(FL-p)-rd); c += FIRE*.25*pow(max(dot(n,h),0.), 18.)*fireK()*fc; }",   // a sheen on the worn flags
    "  return c*oc; }",
    // sparks on screen: a burst from a point (uv), age in seconds
    "vec3 sparks(vec2 uv, vec2 c0, float age, float seed, float n){ vec3 s = vec3(0.); if (age < 0. || age > 1.6) return s; vec2 a = vec2(ASP(),1.);",
    "  for (int i=0;i<28;i++){ if (float(i) >= n) break; vec2 h = h22(vec2(float(i), seed)); float an = h.x*6.283, sp = .25 + .55*h.y;",
    "    vec2 v = vec2(cos(an), sin(an)*.8+.35)*sp, p0 = c0*a + v*age + vec2(0.,-.55)*age*age, v2 = v + vec2(0.,-1.1)*age, d = uv*a - p0;",
    "    vec2 dir = normalize(v2); float along = clamp(dot(d, -dir), 0., .018), w = length(d + dir*along);",
    "    s += mix(HOT, FIRE, min(age*1.4, 1.))*(smoothstep(.003, .0, w)*1.4 + smoothstep(.012, .0, w)*.25)*exp(-age*2.2)*(1.-age/1.6); } return s; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 smoke(vec3 ro, vec3 rd, float tEnd){ int N = 8 + 5*int(uTier); float dt = min(tEnd, 22.)/float(N), tr = 1.; vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.31)*91.);",
    "  for (int i=0;i<28;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt;",
    "    float den = (.003 + .024*fbm3(x*.45 + vec3(uT*.03,-uT*.12,0.))*smoothstep(1.,5.5,x.y))*uLook.z;",
    "    vec3 fd = normalize(x-FL); float fc = smoothstep(-.35,.5, -fd.z), r1 = length(x-FL), r2 = length(x-ML);",
    "    acc += (FIRE*fireK()*fc*5./(1.+r1*r1*.35) + HOT*uLook.y*1.2/(1.+r2*r2*.6))*den*dt*tr; tr *= exp(-den*dt*.4); }",
    "  return acc; }",
    "vec3 embers(vec2 uv, vec3 ro, vec3 rd, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",   // embers out of the furnace mouth, drifting up and into the room
    "  for (int i=0;i<20;i++){ vec2 h = h22(vec2(float(i), 3.7)); float life = 3.5 + 2.5*h.y, age = mod(uT*.6 + h.x*life*7.1, life);",
    "    vec3 x = FL + vec3((h.x-.5)*.9 + .3*sin(age*1.4 + h.y*6.), .25 + age*.8 + .1*sin(age*3.+h.x*9.), -.15 - age*(.25 + .5*h.y));",
    "    vec3 dx = x-ro; float z = dot(dx, uCF); if (z < .4 || length(dx) > tHit) continue;",
    "    vec2 sp = toScreen(x), q = (uv-sp)*a; float rad = .02/(z*uFov), fl = .6 + .4*sin(uT*9. + h.x*40.);",
    "    s += mix(HOT, FIRE, age/life)*smoothstep(rad, 0., length(q))*smoothstep(life, .5*life, age)*fl*(1.5+h.y); } return s*uLook.x; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.07; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 30.); vec3 col = vec3(0.);",
    "  if (t < 30.) { vec3 p = ro+rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); col = shade(p, n, rd, mapM(p).y);",
    "    col = mix(col, vec3(.01,.008,.008), 1.-exp(-t*.03)); }",
    "  col += smoke(ro, rd, t) + embers(uv, ro, rd, t);",
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z >= 0. && tp.z < 1.6) col += sparks(uv, tp.xy, tp.z, float(i)*7.3+floor(tp.x*40.), 24.)*tp.w; }",
    "  if (uMoment.x > 0. && uMoment.w < .5) { vec2 dz = toScreen(PRESS+vec3(0.,.95,-.25)); col += sparks(uv, dz, uMoment.x - .55*uMoment.z*.4/.55, uMoment.y, 28.)*1.2;",
    "    col += HOT*uStrike*.6*exp(-length((uv-dz)*vec2(ASP(),1.))*9.); }",
    "  return col; }"
  ].join("\n");
  function smooth(a, b, k) { return a + (b - a) * k; }
  K.stage("colossus", {
    kind: "ray", glsl: G, grade: .8,
    cam: { pos: [-.6, 1.55, -1.5], target: [.55, 1.8, 4.5], fov: 1.05 },
    steps: [44, 64, 90, 120], shadowSteps: [0, 0, 16, 24], scale: { low: .44 },
    moments: [{ name: "strike", every: [18, 36], dur: 3.2 }],
    onTap: function (x, y, S) { S.data.breath = 1; if (S.view.mode === "opening") S.startMoment(0); },
    step: function (c, S) {
      var D = S.data, m = S.moment, dt = Math.min(c.dt || 0, .1);
      if (D.arm == null) { D.arm = .35; D.spin = 0; D.ram = 0; D.flick = 0; D.f2 = 0; D.breath = 0; D.strike = 0; }
      /* the strike: the arm is swung (a turn and a half in about a second), the ram drops 12 cm, hits at 40 %, rings, rises */
      if (m && !c.still) {
        var k = (c.t - m.t0) / m.dur;
        D.spin = k < .42 ? smooth(D.spin, 7.5, Math.min(1, dt * 6)) : smooth(D.spin, 0, Math.min(1, dt * 1.6));
        D.ram = k < .4 ? .12 * Math.pow(k / .4, 2) : .12 * Math.max(0, 1 - (k - .4) / .45);
        D.strike = k >= .4 ? Math.exp(-(k - .4) * m.dur * 5) : 0;
      } else { D.spin = smooth(D.spin, 0, Math.min(1, dt * 1.6)); D.ram = smooth(D.ram, 0, Math.min(1, dt * 3)); D.strike = 0; }
      D.arm += D.spin * dt + (c.still ? 0 : .02 * Math.sin(c.t * .4) * dt);
      /* the fire: two speeds of flicker, and a breath after a touch */
      D.f2 = smooth(D.f2, Math.random() - .5, Math.min(1, dt * 9)); D.flick = smooth(D.flick, D.f2 + .6 * Math.sin(c.t * 1.3) * .3, Math.min(1, dt * 4));
      D.breath = Math.max(0, D.breath - dt * .7);
      if (c.still) { D.flick = 0; D.f2 = 0; }
    },
    uniforms: function (gl, u, c, S) { var D = S.data;
      gl.uniform1f(u.uArm, D.arm || 0); gl.uniform1f(u.uRam, D.ram || 0); gl.uniform1f(u.uFlick, (D.flick || 0) + 1.2 * (D.breath || 0)); gl.uniform1f(u.uStrike, D.strike || 0); },
    post: { bloom: 1.05, threshold: .62, knee: .5, exposure: 1.1, aberr: .07, grain: .04, vig: .6 },
    room: { name: "The coining room at night", yaw: [-.7, .7], pitch: [-.15, .35], move: [-2.5, 3.4], up: [0, 2.1], unit: "m", sound: "metal",
      look: [{ id: "fire", label: "Furnace", min: 0, max: 2, def: 1 }, { id: "metal", label: "Molten silver", min: 0, max: 2, def: 1 },
        { id: "smoke", label: "Smoke", min: 0, max: 2, def: 1 }, { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: sparks burst from where you tapped and the furnace breathes.",
      opening: { dur: 5.8, from: { yaw: -.6, pitch: .1, move: 2.8, up: .3 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.4, at: [.56, .44] } }
  });
})();
