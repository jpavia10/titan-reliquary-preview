/* fx/neon.js: Neon Vault (neon) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30. Replaces the shared-module
   stack in fx/themes.js (atmos signs + volume smoke + rain particles) with a place.
   A narrow street at 2 a.m. after rain, seen from the kerb: tall facades with dark windows close in on both sides, blade signs stand out
   from the walls and tube shapes glow on the brick (rings, arrows, bars, a diamond: never letters), each in its own colour, humming and
   now and then stuttering. Their light smears down the wet asphalt in long streaks and sits sharp in the puddles, where the rain breaks
   it into rings; fog hangs in the street lit by the signs; rain falls in two depths. Moment "stutter": one sign fails and catches again.
   Touch: a lit splash where you tapped. Room (walk camera): walk up the street, turn to the signs, rise to the fire escapes' height.
   Quality: march steps, the fog samples, the puddle mirror and the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const float HW = 2.6;",                                                  // the facades stand at x = +-HW
    "const vec3 SC[6] = vec3[6](vec3(1.,.2,.62), vec3(.15,.85,1.), vec3(1.,.6,.18), vec3(.62,.35,1.), vec3(1.,.25,.5), vec3(.2,1.,.75));",
    "const vec3 SP[6] = vec3[6](vec3(-1.95,4.2,5.), vec3(HW-.02,4.6,8.2), vec3(-1.95,5.,11.5), vec3(HW-.02,3.8,14.), vec3(-1.95,6.2,19.), vec3(HW-.02,5.2,22.));",
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdBox2(vec2 p, vec2 b){ vec2 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,q.y),0.); }",
    "float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; return length(pa - ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.)); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float stutter(int i){ if (uMoment.x < 0. || int(uMoment.w + .5) != 0) return 1.; int k = int(mod(uMoment.y, 6.)); if (k != i) return 1.;",
    "  float a = uMoment.x; return a > 2.2 ? 1. : step(.45, fract(sin(floor(a*17.)*12.9898 + float(i))*43758.5)); }",
    "float hum(int i){ return (.92 + .08*sin(uT*(50. + float(i)*7.)))*stutter(i)*uLook.x; }",
    // ids: 0 asphalt, 1 kerb + pavement, 2 facade, 3 window glass, 4 sign panels, 5..10 tube light of sign 0..5
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(p.y + .015*smoothstep(.0,.3,abs(p.x)-1.7), 0.);",
    "  U(r, sdBox(vec3(abs(p.x) - 2.2, p.y - .07, p.z), vec3(.4,.075,60.)), 1.);",
    "  vec3 f = vec3(HW - abs(p.x), p.y, p.z); float fac = f.x;",
    "  vec2 wc = vec2(mod(p.z + .9, 1.8) - .9, mod(p.y - 3.6, 2.2) - 1.1); float win = sdBox2(wc, vec2(.5,.7));",
    "  fac = max(fac, -max(min(win, 1e3), max(-f.x - .12, 3. - p.y)));",         // window recesses above the shopfronts
    "  U(r, min(fac, p.z + 6.), 2.);",
    "  U(r, max(f.x + .1, max(win, 3. - p.y)) + .002, 3.);",                     // the glass, set back in each recess
    "  U(r, min(sdBox(p - vec3(-1.95,4.6,5.), vec3(.6,1.6,.05)), sdBox(p - vec3(-1.95,5.4,11.5), vec3(.6,1.8,.05))), 4.);",   // blade signs
    "  U(r, sdBox(p - vec3(-1.95,6.6,19.), vec3(.6,1.4,.05)), 4.);",
    "  U(r, sdBox(vec3(p.x + HW - .05, p.y - 4.6, p.z - 5.), vec3(.05,.08,.03)), 4.);",
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    // the tubes: drawn on each sign's plane as a 2D shape (distance to the tube), lit by its own colour
    "float tubeD(int i, vec3 p){ vec2 u;",
    "  if (i == 0) { u = vec2(p.x + 1.95, p.y - 4.6); float d = 1e3; for (int k=0;k<3;k++) d = min(d, abs(length(u - vec2(0., -1. + float(k))) - .3)); return d; }",   // three rings down a blade
    "  if (i == 1) { u = vec2(p.z - 8.2, p.y - 4.6); return min(abs(length(u) - .85), abs(length(u) - .55)); }",   // a coin ring on the wall
    "  if (i == 2) { u = vec2(p.x + 1.95, p.y - 5.4); float d = seg(u, vec2(-.35,1.4), vec2(.35,.9)); d = min(d, seg(u, vec2(.35,.9), vec2(-.35,.4)));",
    "    d = min(d, seg(u, vec2(-.35,.4), vec2(.35,-.1))); d = min(d, seg(u, vec2(.35,-.1), vec2(0.,-1.4))); d = min(d, min(seg(u, vec2(0.,-1.4), vec2(-.3,-1.)), seg(u, vec2(0.,-1.4), vec2(.3,-1.)))); return d; }",   // a zig-zag arrow
    "  if (i == 3) { u = vec2(p.z - 14., p.y - 3.8); return min(abs(sdBox2(u, vec2(1.1,.45))), seg(u, vec2(-.7,0.), vec2(.7,0.))); }",   // a bar in a frame
    "  if (i == 4) { u = vec2(p.x + 1.95, p.y - 6.6); return min(abs(abs(u.x) + abs(u.y)*.6 - .5), abs(abs(u.x) + abs(u.y)*.6 - .25)); }",   // a diamond
    "  u = vec2(p.z - 22., p.y - 5.2); float d = 1e3; for (int k=0;k<4;k++) d = min(d, seg(u, vec2(-.6 + .4*float(k), -1.2), vec2(-.6 + .4*float(k), 1.2))); return d; }",   // upright strips
    "vec3 tubes(vec3 p){ vec3 s = vec3(0.); for (int i=0;i<6;i++){ if (length(p - SP[i]) > 2.4) continue; float d = tubeD(i, p);",
    "  s += SC[i]*(smoothstep(.035, .0, d)*4. + smoothstep(.25, .0, d)*.5)*hum(i); } return s; }",
    "vec3 signLight(vec3 p, vec3 n){ vec3 s = vec3(0.); for (int i=0;i<6;i++){ vec3 d = SP[i] - p + vec3(sign(-SP[i].x)*.3, 0., 0.); float r = length(d);",
    "  s += SC[i]*hum(i)*max(dot(n, d/r), 0.)*2.2/(.6 + r*r*.35); } return s; }",
    "vec3 sky(vec3 rd){ return mix(vec3(.02,.012,.04), vec3(.09,.04,.12), smoothstep(.1,.6,rd.y))*(.6 + .4*vn(rd.xz*6. + uT*.02)); }",
    "float puddle(vec2 p){ return smoothstep(.52, .62, vn(p*vec2(.55,.32) + 4.)); }",
    "float ripples(vec2 p){ float s = 0.; vec2 c = floor(p*2.2);",
    "  for (int k=0;k<4;k++){ vec2 o = vec2(float(k/2), float(k%2)); vec2 h = h22(c + o); float ph = fract(uT*.9 + h.x), r = length(p*2.2 - c - o - h);",
    "    s += exp(-pow((r - ph*.6)/.04, 2.))*(1. - ph); } return s*min(uLook.z, 2.); }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) { float pud = puddle(p.xz), dash = step(abs(p.x), .06)*step(.5, fract(p.z*.25))*(1. - pud);",
    "    return mix(vec3(.05,.05,.055)*(.7 + .6*vn(p.xz*3.) + .3*h21(floor(p.xz*60.))), vec3(.012,.012,.016), pud) + vec3(.16,.15,.12)*dash*(.6 + .4*vn(p.xz*9.)); }",
    "  if (id < 1.5) return vec3(.07,.068,.07)*(.8 + .4*vn(p.xz*vec2(1.,5.)));",
    "  if (id < 2.5) { vec2 u = vec2(p.z, p.y)*vec2(4.,9.); u.x += .5*mod(floor(u.y),2.); vec2 b = abs(fract(u)-.5);",
    "    return mix(vec3(.11,.06,.06), vec3(.04), smoothstep(.42,.48,max(b.x*.9,b.y)))*(.6 + .6*h21(floor(u)))*(p.y < 3. ? .55 : 1.); }",
    "  if (id < 3.5) return vec3(.02,.02,.03);",
    "  return vec3(.03); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p), c = a*(signLight(p, n) + vec3(.03,.018,.05)*(.6 + .4*n.y) + vec3(.05,.025,.07)*smoothstep(4.,14.,p.y));",   // the city glow from the low clouds
    "  if (id > 3.5 || abs(abs(p.x) - HW) < .02) c += tubes(p);",
    "  if (id > 2.5 && id < 3.5) { float lit = step(.72, h21(floor(vec2(p.z/1.8, p.y/2.2)) + sign(p.x)*3.)); c += vec3(1.,.7,.4)*.16*lit*(.7 + .3*vn(p.zy*3.)); }",   // a few rooms awake
    "  return c; }",
    // the signs' light on wet asphalt: a long streak toward you for each, sharp in the puddles (the reflection of each light, stretched)
    "vec3 wet(vec3 p, vec3 rd, float pud){ vec3 r = reflect(rd, vec3(0.,1.,0.)), s = vec3(0.);",
    "  for (int i=0;i<6;i++){ vec3 d = normalize(SP[i] - p); vec3 e = r - d; float k = mix(30., 260., pud), lat = dot(e, uCR), ver = dot(e, uCU);",
    "    s += SC[i]*hum(i)*exp(-lat*lat*k*6. - ver*ver*k*.05)*mix(.45, 1.3, pud); }",
    "  return s; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 fog(vec3 ro, vec3 rd, float tEnd){ int N = 10 + 6*int(uTier); float dt = min(tEnd, 26.)/float(N); vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.33)*71.);",
    "  for (int i=0;i<30;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt; float den = (.008 + .024*fbm3(x*.3 + vec3(uT*.05, 0., uT*.03)))*smoothstep(7., .5, x.y)*uLook.y;",
    "    for (int k=0;k<6;k++){ vec3 d = SP[k] - x; acc += SC[k]*hum(k)*den*dt*1.4/(.3 + dot(d,d)*.5); } }",
    "  return acc; }",
    "vec3 rain(vec2 uv){ vec3 s = vec3(0.); for (int k=0;k<2;k++){ float sc = k == 0 ? 60. : 26.; vec2 u = uv*vec2(sc*ASP(), sc*.12) + vec2(0., uT*(k == 0 ? 2.6 : 4.2));",
    "  u.x += uv.y*sc*.08; vec2 c = floor(u), f = fract(u); float h = h21(c), on = step(.72, h);",
    "  s += vec3(.55,.6,.8)*on*smoothstep(.06, .0, abs(f.x - h))*smoothstep(0., .4, f.y)*smoothstep(1., .6, f.y)*(k == 0 ? .1 : .16); } return s*uLook.z; }",
    "vec3 tapHit(vec2 sc){ vec3 r = camRay(sc); float t = 1e4;",                   // where a tap lands: the street or a facade
    "  if (r.y < -.001) t = min(t, -uCO.y/r.y); if (r.x < -.001) t = min(t, (-HW-uCO.x)/r.x); if (r.x > .001) t = min(t, (HW-uCO.x)/r.x); return uCO + r*min(t, 40.); }",
    "vec3 tapCol(vec4 tp){ return SC[int(mod(floor(tp.x*17. + tp.y*5.), 6.))]; }",
    "vec3 splashOn(vec3 p){ vec3 s = vec3(0.); for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 2.5) continue; float d = length(p - tapHit(tp.xy));",   // the ring of light where it landed
    "  s += tapCol(tp)*(exp(-pow((d - tp.z*1.3)/.07, 2.)) + .6*exp(-pow((d - tp.z*.8)/.06, 2.)) + 1.5*exp(-d*d*8.)*exp(-tp.z*3.))*exp(-tp.z*1.4)*tp.w; } return s*1.6; }",
    "vec3 droplets(vec2 uv){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > .9) continue; vec2 c0 = toScreen(tapHit(tp.xy));",
    "    for (int k=0;k<12;k++){ vec2 h = h22(vec2(float(k), float(i) + tp.x)); vec2 v = vec2(h.x - .5, .3 + .5*h.y)*.45, q = c0*a + v*tp.z + vec2(0., -.9)*tp.z*tp.z;",
    "      s += tapCol(tp)*smoothstep(.005, .0, length(uv*a - q))*1.6; } }",
    "  return s; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.07; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 50.); vec3 col;",
    "  if (t < 50.) { vec3 p = ro+rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); float id = mapM(p).y; col = shade(p, n, rd, id);",
    "    if (id < 1.5 && n.y > .9) { float pud = id < .5 ? puddle(p.xz) : .15, rp = ripples(p.xz);",
    "      col += wet(p, rd, pud)*(1. + rp*1.5*pud);",
    "      if (TIER > 1 && pud > .2) { vec3 r = reflect(rd, normalize(vec3(rp*.02, 1., rp*.02))); float t2 = march(p + vec3(0.,.01,0.), r, 30.);",
    "        if (t2 < 30.) { vec3 q = p + r*t2; q -= nrm(q)*map(q); col += shade(q, nrm(q), r, mapM(q).y)*.6*pud; } else col += sky(r)*.5*pud; } }",
    "    col += splashOn(p);",
    "    col = mix(col, vec3(.02,.012,.03), 1. - exp(-t*.03)); }",
    "  else col = sky(rd);",
    "  col += fog(ro, rd, t) + rain(uv) + droplets(uv);",
    "  return col; }"
  ].join("\n");
  K.stage("neon", {
    kind: "ray", glsl: G, grade: .85,
    cam: { mode: "walk", pos: [.35, 1.6, -2.5], target: [-.1, 3.4, 20], fov: 1.04, walk: [0, 0, 1], bounds: [[-1.3, .6, -5], [1.3, 6.5, 16]] },
    steps: [48, 64, 90, 120], shadowSteps: [0, 0, 0, 0], scale: { low: .44 },
    moments: [{ name: "stutter", every: [12, 30], dur: 3 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: 1.15, threshold: .55, knee: .45, exposure: 1.05, aberr: .3, grain: .035, vig: .5 },
    room: { name: "The street at 2 a.m.", yaw: [-.55, .55], pitch: [-.25, .35], move: [-2.5, 14], up: [0, 3.6], unit: "m", sound: "neon",
      look: [{ id: "signs", label: "Neon", min: 0, max: 2, def: 1 }, { id: "fog", label: "Fog", min: 0, max: 2, def: 1 },
        { id: "rain", label: "Rain", min: 0, max: 2.5, def: 1 }, { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Tap the street or a wall: a splash of neon light runs out from where you tapped.",
      opening: { dur: 5.6, from: { yaw: -.2, pitch: -.22, move: 5.5, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.6, at: [.5, .2] } }
  });
})();
