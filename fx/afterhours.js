/* fx/afterhours.js: Midnight Gallery (afterhours) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   The gallery after closing, standing at the near end of a tall, narrow hall: tall windows down the right wall let the moon in, and its
   light crosses the room in shafts you can see in the haze (the theme's signature, the diagonal moonbeams from the upper right of the
   first engine's effect), landing as window shapes with their crossbars on the black marble and climbing the left wall, where paintings
   hang in gilt frames, each under its own warm picture light. Pilasters between the bays, a cornice, a museum bench, a marble ovoid on a
   plinth down the hall, and at the far end a doorway into a room still lit warm. Dust drifts through the beams (and shows only in them). The light a point gets from
   the moon is the window pattern seen from that point (analytic, so the floor patches and the shafts in the air always agree), with the
   moon's size softening the edges with distance; slow clouds make the light breathe.
   Touch: a ring of moonlight runs across the marble from where you tapped. Moment "moonrise": the moon clears the clouds for a while.
   Room (walk camera): turn to the paintings or the windows, walk down the hall, rise toward the cornice. Quality: march steps, the
   floor's mirror, the shadows, the haze samples and the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 MOON = vec3(.62,.74,1.);",
    "const vec3 WARM = vec3(1.,.74,.46);",
    "const float WX = 1.6, BAY = 3.2, END = 26.;",       // half width of the hall, bay length, the end wall
    "vec3 LDIR(){ return normalize(vec3(-.62,-.66,-.3)); }",   // the way the moonlight travels: in at the right windows, down and across to the paintings
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdBox2(vec2 p, vec2 b){ vec2 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,q.y),0.); }",
    "float bayZ(float z){ return mod(z, BAY) - .5*BAY; }",  // position inside a bay: 0 at the bay's centre (window, painting)
    "float winHole(float lz, float y){ return sdBox2(vec2(lz, y-4.25), vec2(.62, 1.85)); }",   // the window opening in the wall plane
    "float map(vec3 p){",
    "  float d = min(p.y, 7.-p.y);",                                        // floor, ceiling
    "  d = min(d, p.x+WX);",                                                // left wall
    "  d = min(d, min(31.-p.z, p.z+8.));",                                  // the lit room's back wall, the wall behind you
    "  d = max(d, p.x-WX-.5);",                                             // nothing outside the windows but the night
    "  float lz = bayZ(p.z);",
    "  d = min(d, max(abs(p.x-WX-.25)-.25, -winHole(lz, p.y)));",           // right wall: a slab with the windows cut through
    "  vec3 m = vec3(p.x-WX-.25, p.y-4.25, lz); d = min(d, min(sdBox(m, vec3(.03,1.85,.025)), sdBox(m-vec3(0.,.55,0.), vec3(.03,.025,.62))));",   // mullion + transom
    "  d = min(d, max(abs(p.z-END-.25)-.25, -sdBox2(vec2(p.x, p.y-1.45), vec2(.72,1.45))));",   // the end wall with its doorway
    "  vec3 q = vec3(abs(p.x)-WX, p.y, mod(p.z+.5*BAY, BAY)-.5*BAY);",
    "  d = min(d, sdBox(q-vec3(0.,3.5,0.), vec3(.17,3.5,.21)));",          // pilasters between the bays
    "  d = min(d, sdBox(vec3(abs(p.x)-WX, p.y-6.45, 0.), vec3(.13,.1,1e3)));",   // cornice
    "  d = min(d, sdBox(vec3(p.x+WX, p.y-2.3, lz), vec3(.045,.6,.76)));",  // picture frames
    "  d = min(d, sdBox(vec3(p.x+WX-.17, p.y-3.08, lz), vec3(.03,.025,.32)));",   // picture lights
    "  vec3 bq = p-vec3(0.,0.,6.4); bq.x = abs(bq.x); d = min(d, min(sdBox(bq-vec3(0.,.44,0.), vec3(.9,.045,.24)), sdBox(bq-vec3(.72,.2,0.), vec3(.04,.2,.2))) - .01);",  // bench: a slab on two legs
    "  d = min(d, sdBox(p-vec3(0.,.55,12.8), vec3(.3,.55,.3)));",         // plinth
    "  vec3 e = p-vec3(0.,1.32,12.8); e.xy = mat2(.94,-.34,.34,.94)*e.xy; float k0 = length(e/vec3(.3,.2,.24)), k1 = length(e/vec3(.3,.2,.24)/vec3(.3,.2,.24));",
    "  d = min(d, k0*(k0-1.)/k1);",                                        // the marble ovoid (an ellipsoid bound)
    "  return d; }",
    K.stage.RAY,
    "float matId(vec3 p){",
    "  float lz = bayZ(p.z);",
    "  if (p.y < .003) return 0.;",                                                       // marble floor
    "  if (p.z > END+.45) return 10.;",                                                   // the room beyond the doorway
    "  if (p.y > 6.99) return 1.;",                                                       // ceiling
    "  if (abs(p.x+WX-.17) < .05 && abs(p.y-3.08) < .05 && abs(lz) < .34) return 6.;",    // picture light
    "  if (p.x < -WX+.1 && abs(p.y-2.3) < .62 && abs(lz) < .78) return abs(lz) < .66 && abs(p.y-2.3) < .5 ? 5. : 4.;",   // canvas, frame
    "  if (p.y < 1.6 && length(p.xz-vec2(0.,12.8)) < .5) return p.y > 1.105 ? 8. : 7.;",   // ovoid, plinth
    "  if (abs(p.z-6.4) < .3 && p.y < .55 && abs(p.x) < .95) return 9.;",                  // bench
    "  if (p.x > WX+.005 && p.x < WX+.52 && winHole(lz, p.y) < .01) return 11.;",         // window reveal, mullions
    "  if (abs(abs(p.x)-WX) < .18 && (abs(mod(p.z+.5*BAY, BAY)-.5*BAY) < .22 || abs(p.y-6.45) < .11)) return 3.;",   // pilaster, cornice
    "  return 2.; }",                                                                     // plaster
    "float clouds(){ return .72 + .28*smoothstep(.3,.7,fbm(vec2(uT*.035, 3.1))); }",
    "float moonK(){ return (.85 + .75*momentK())*clouds()*uLook.x; }",
    // the moon seen from p through the window pattern of the right wall (soft by distance: the moon is half a degree wide)
    "float moonVis(vec3 p){ vec3 L = -LDIR(); float t = (WX-p.x)/L.x; if (t < 0.) return 1.; vec3 q = p + L*t;",
    "  float lz = bayZ(q.z), s = .02 + t*.012, w = smoothstep(s, -s, winHole(lz, q.y));",
    "  w *= smoothstep(.02, .02+s, abs(lz)) * smoothstep(.02, .02+s, abs(q.y-4.8));",    // the crossbars' shadows
    "  w *= .78 + .22*vn(q.zy*.6 + vec2(uT*.06, 0.));",                                 // thin cloud crossing the moon
    "  return w; }",
    "vec3 sky(vec3 rd){ vec3 L = -LDIR(); float g = max(dot(rd, L), 0.);",
    "  vec3 c = mix(vec3(.012,.02,.045), vec3(.05,.08,.16), smoothstep(-.1,.6,rd.y)) + MOON*(pow(g, 6.)*.25 + pow(g, 400.)*4.)*clouds();",
    "  c *= .8 + .4*fbm(rd.zy*3. + vec2(uT*.01, 0.)); return c*uLook.x; }",
    "vec3 glass(vec3 ro, vec3 rd){ vec3 L = -LDIR(); float tw = (WX+.25-ro.x)/max(rd.x,.001); vec3 q = ro+rd*tw;",   // frosted panes lit by the moon behind them
    "  float g = max(dot(rd, L), 0.), fr = .75 + .25*fbm(q.zy*7.) + .1*vn(q.zy*40.);",
    "  return sky(rd)*.5 + MOON*(.16 + .55*g*g)*fr*clouds()*uLook.x*(.85+.6*momentK()); }",
    "vec3 lamp(vec3 p, vec3 n, float bz){ vec3 L0 = vec3(-WX+.24, 3.04, bz), d = L0-p; float r = length(d); d /= r;",
    "  float cone = smoothstep(.55, .9, dot(-d, normalize(vec3(-.35,-1.,0.))));",
    "  return WARM*max(dot(n,d),0.)*cone/(.4+r*r*1.4); }",
    "vec3 lamps(vec3 p, vec3 n){ float b = floor(p.z/BAY)*BAY + .5*BAY; vec3 s = lamp(p,n,b-BAY) + lamp(p,n,b) + lamp(p,n,b+BAY);",
    "  vec3 dl = vec3(0.,2.6,29.)-p; float rl = length(dl); s += WARM*vec3(1.,.85,.7)*max(dot(n, dl/rl),0.)*2.2/(1.+rl*rl*.5)*step(END+.4, p.z);",   // the room beyond
    "  return s*uLook.z; }",
    "vec3 canvas(vec3 p){ float lz = bayZ(p.z), y = p.y-2.3, h = h21(vec2(floor(p.z/BAY), 7.)); vec2 u = vec2(lz/.66, y/.5);",
    "  vec3 c;",
    "  if (h < .34) { c = mix(vec3(.28,.05,.04), vec3(.42,.12,.05), smoothstep(-.9,.9,u.y));",   // colour fields
    "    c = mix(c, vec3(.5,.22,.07), smoothstep(.12,.0,sdBox2(u-vec2(0.,.42), vec2(.78,.28)))); c = mix(c, vec3(.14,.03,.05), smoothstep(.12,.0,sdBox2(u+vec2(0.,.4), vec2(.78,.3)))); }",
    "  else if (h < .67) { float hz = -.1 + .18*fbm(vec2(u.x*2.,h*9.));",                          // a night landscape
    "    c = mix(vec3(.08,.1,.12), vec3(.22,.24,.2), smoothstep(-.2,1.,u.y)); c = mix(c, vec3(.04,.05,.03)*(.7+.6*fbm(u*6.)), step(u.y, hz));",
    "    c += vec3(.5,.45,.3)*smoothstep(.07,.05,length(u-vec2(.45,.55))); }",
    "  else { c = vec3(.06,.045,.03)*(.7+.6*fbm(u*3.)); float o = length(u*vec2(1.3,1.) - vec2(0.,.1));",             // a dark old portrait
    "    c = mix(c, vec3(.32,.22,.15)*(.8+.3*fbm(u*9.)), smoothstep(.45,.3,o)); c = mix(c, vec3(.05,.04,.04), smoothstep(.3,.6,-u.y+.1)*step(abs(u.x),.62)*.8); }",
    "  return c*(.85+.3*fbm(u*40.)); }",                                                   // the canvas weave
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) { vec2 w = p.xz*.55; float v = abs(fbm(w + vec2(fbm(w*2.1)*1.8, fbm(w*1.7+4.)*1.2)) - .5);",
    "    return vec3(.045,.048,.056) + vec3(.3,.31,.34)*smoothstep(.03,.0,v) + vec3(.05)*smoothstep(.12,.0,v); }",
    "  if (id < 1.5) { vec2 c = abs(fract(p.xz/vec2(1.07,1.6))-.5); return vec3(.02,.024,.034)*(.75 + .5*step(max(c.x,c.y), .4)); }",   // coffers
    "  if (id < 2.5) return vec3(.05,.058,.075)*(.9+.2*fbm(p.zy*2.));",
    "  if (id < 3.5) return vec3(.075,.078,.085)*(.85+.3*fbm(p.zy*5.));",
    "  if (id < 4.5) return vec3(.42,.3,.12)*(.6+.6*fbm(p.zy*30.));",
    "  if (id < 5.5) return canvas(p);",
    "  if (id < 6.5) return vec3(.3,.25,.15);",
    "  if (id < 7.5) return vec3(.04,.04,.045);",
    "  if (id < 8.5) return vec3(.62,.62,.6)*(.9+.1*fbm(p.xy*8.));",
    "  if (id < 9.5) return vec3(.09,.05,.03)*(.8+.4*fbm(p.xz*12.));",
    "  if (id < 10.5) return vec3(.3,.22,.15);",
    "  return vec3(.06,.065,.08); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p), L = -LDIR();",
    "  float mv = moonVis(p)*moonK(), dl = max(dot(n,L),0.), sh = 1.;",
    "  if (TIER > 1 && mv*dl > .01) sh = shadow(p+n*.02, L, 12.);",
    "  float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  vec3 amb = (vec3(.035,.045,.08) + MOON*.12*moonK()*(1.-smoothstep(0.,4.,p.y))*(.5+.5*n.y))*oc;",   // sky fill + the moonlit floor's bounce
    "  vec3 c = a*(MOON*mv*sh*dl*7. + amb) + a*lamps(p,n)*2.6;",
    "  if (id > 3.5 && id < 4.5 || id > 7.5 && id < 8.5) { vec3 h = normalize(L-rd); c += (MOON*mv*sh*.6 + WARM*.1*uLook.z)*pow(max(dot(n,h),0.), 40.)*(id < 5. ? 1.2 : .4); }",   // gilt and marble catch the light
    "  if (id > 5.5 && id < 6.5) c += WARM*.9*uLook.z;",
    "  return c; }",
    // a ring of moonlight from each tap, on whatever the tap touched: the tap's ray meets the hall (floor, walls, ceiling), the ring runs outward
    "vec3 tapHit(vec2 s){ vec3 r = camRay(s); float t = 1e4;",
    "  if (r.y < -.001) t = min(t, -uCO.y/r.y); if (r.y > .001) t = min(t, (7.-uCO.y)/r.y);",
    "  if (r.x < -.001) t = min(t, (-WX-uCO.x)/r.x); if (r.x > .001) t = min(t, (WX-uCO.x)/r.x); return uCO + r*t; }",
    "float tapLight(vec3 p){ float s = 0.; for (int i=0;i<6;i++){ vec4 t = uTaps[i]; if (t.z < 0. || t.z > 5.) continue; float d = length(p - tapHit(t.xy));",
    "  s += (exp(-pow((d-t.z*1.6)/.12,2.))*exp(-t.z*.8) + .7*exp(-d*d*5.)*exp(-t.z*2.2))*t.w; } return s; }",
    "vec3 haze(vec3 ro, vec3 rd, float tEnd){ int N = 14 + 6*int(uTier); float dt = min(tEnd, 30.)/float(N), tr = 1.; vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.37)*97.);",
    "  for (int i=0;i<32;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt;",
    "    float den = (.014 + .02*fbm3(x*.4 + vec3(0.,uT*.04,uT*.02)))*uLook.y;",
    "    acc += (MOON*moonVis(x)*moonK()*2.4 + WARM*.05*uLook.z*step(END+.4, x.z))*den*dt*tr; tr *= exp(-den*dt*.5); }",
    "  return acc; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 hit(vec3 ro, vec3 rd, float t){ vec3 p = ro+rd*t; return p - nrm(p)*map(p); }",   // the march stops a little short; land on the surface
    "vec3 motes(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",   // dust near you, seen only where it drifts through a beam
    "  for (int i=0;i<36;i++){ vec3 h = vec3(h22(vec2(float(i), 1.3)), h21(vec2(float(i), 8.1)));",
    "    vec3 x = vec3(-1.4 + 2.8*h.x, .4 + 3.6*h.y, uCO.z + 1.2 + 7.*h.z) + vec3(sin(uT*.07+h.x*9.), .5*sin(uT*.05+h.y*7.), cos(uT*.06+h.z*8.))*.35;",
    "    vec3 dx = x-ro; float z = dot(dx, uCF); if (z < .5 || length(dx) > tHit) continue;",
    "    vec2 q = (uv-toScreen(x))*a; float rad = .012/(z*uFov), b = moonVis(x)*moonK();",
    "    s += MOON*b*smoothstep(rad, 0., length(q))*(.6+.4*sin(uT*2.+h.x*30.))*1.6; } return s*min(uLook.y, 1.5); }",
    "vec3 surf(vec3 ro, vec3 rd, float t, float maxT){ if (t >= maxT) return rd.x > 0. ? glass(ro, rd) : sky(rd); vec3 p = hit(ro, rd, t); return shade(p, nrm(p), rd, matId(p)); }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.06; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 45.); vec3 col = surf(ro, rd, t, 45.);",
    "  if (t < 45.) { vec3 p = hit(ro, rd, t);",
    "    if (p.y < .003) {",                                                                    // marble: a polished mirror
    "      vec3 n2 = normalize(vec3((fbm(p.xz*5.)-.5)*.01, 1., (fbm(p.zx*5.+3.)-.5)*.01)), r = reflect(rd, n2);",
    "      float fr = .06 + .94*pow(1.-max(dot(-rd,n2),0.), 5.), t2 = 40.; vec3 rc;",
    "      if (TIER > 0) { t2 = march(p+n2*.01, r, 40.); rc = surf(p+n2*.01, r, t2, 40.); }",
    "      else { float tw = (WX-p.x)/max(r.x,.01); vec3 q = p + r*tw; rc = r.x > .01 && winHole(bayZ(q.z), q.y) < 0. ? glass(p, r) : vec3(.01,.012,.02); }",   // just the windows
    "      rc += haze(p, r, min(t2, 20.))*.7; col = col + rc*mix(.28, 1., fr);",
    "    }",
    "    col += MOON*tapLight(p)*.5*(.4+.6*uLook.x);",
    "    col = mix(col, vec3(.008,.011,.02), 1.-exp(-t*.018)); }",
    "  col += haze(ro, rd, t) + motes(uv, ro, t);",
    "  return col; }"
  ].join("\n");
  K.stage("afterhours", {
    kind: "ray", glsl: G, grade: .78,
    roomCam: { mode: "walk", pos: [.45, 1.18, 5.3], target: [-1.6, 2.15, 8.0], fov: 1.0, walk: [0, 0, 1], bounds: [[-1.2, .6, 2], [1.2, 4.2, 11.6]] },   // on the bench, before a painting
    cam: { mode: "walk", pos: [.75, 1.62, -1.2], target: [-1.6, 2.3, 7.4], fov: 1.02, walk: [0, 0, 1], bounds: [[-1.1, .5, -7], [1.1, 5.2, 11.6]] },
    steps: [64, 80, 100, 130], shadowSteps: [0, 0, 16, 24],
    moments: [{ name: "moonrise", every: [40, 80], dur: 12 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },   // the opening's touch clears the moon
    post: { bloom: .85, threshold: .7, knee: .5, exposure: 1.1, aberr: .05, grain: .035, vig: .55 },
    room: { name: "The long gallery after closing", yaw: [-.6, .55], pitch: [-.25, .4], move: [-5, 9], up: [0, 2.2], unit: "m", sound: "smoke",
      look: [{ id: "moon", label: "Moonlight", min: 0, max: 2, def: 1 }, { id: "haze", label: "Haze", min: 0, max: 2, def: 1 },
        { id: "lamps", label: "Picture lights", min: 0, max: 2.5, def: 1 }, { id: "speed", label: "Clouds", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere in the hall: a ring of moonlight runs out over the marble, the walls or the paintings from where you tapped.",
      opening: { dur: 5.8, from: { yaw: -.5, pitch: .05, move: -3, up: .2 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.4, at: [.5, .2] } }
  });
})();
