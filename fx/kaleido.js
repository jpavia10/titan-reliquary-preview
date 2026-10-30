/* fx/kaleido.js: Prism (kaleido) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   A dark studio with a black glass floor: a thin beam of white light comes in from high on the left, strikes a tall cut-glass prism and
   leaves it fanned out into the spectrum (the first engine's kaleidoscope and hologram light, now light you can follow through the
   air), which lays a rainbow across the floor and up the far wall. Cut crystal shards turn slowly in the air and flash colour as they
   catch it; in the foreground a silver coin rests on a faceted crystal block. Moment "flare": the beam brightens and the fan sweeps.
   Touch: a burst of rainbow glints from where you tapped. Room: orbit the prism, walk up to it, rise into the beam. Quality: march
   steps, the floor's mirror, the haze samples and the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 PR = vec3(.1,2.5,7.);",                                         // the prism
    "const vec3 SRC = vec3(-2.3,9.5,6.7);",                                     // where the beam comes from (high on the left)
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdTri(vec3 p, vec2 h){ vec3 q = abs(p); return max(q.z - h.y, max(q.x*.866025 + p.y*.5, -p.y) - h.x*.5); }",   // a triangular prism along z
    "float sdOct(vec3 p, float s){ p = abs(p); return (p.x + p.y + p.z - s)*.57735; }",
    "float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "vec3 spectrum(float x){ x = clamp(x, 0., 1.); return clamp(vec3(1.5 - abs(4.*x - 3.2), 1.5 - abs(4.*x - 2.), 1.5 - abs(4.*x - .8)), 0., 1.); }",
    "float sweep(){ return .06*sin(uT*.13) + .1*momentK()*sin(uMoment.x*1.3); }",
    "vec3 shardPos(int i){ vec3 h = vec3(h22(vec2(float(i), 4.2)), h21(vec2(float(i), 8.8)));",
    "  return vec3((h.x - .5)*6., .8 + 3.6*h.y, 3.5 + 7.*h.z) + vec3(sin(uT*.11 + h.x*9.), .4*sin(uT*.17 + h.y*7.), cos(uT*.09 + h.z*6.))*.35; }",
    // ids: 0 floor (black glass), 1 back wall, 2 prism glass, 3 shards, 4 crystal block, 5 silver coin
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(min(16. - p.z, p.z + 8.), 1.);",
    "  vec3 q = p - PR; q.xy = rot(.05 + sweep())*q.xy; U(r, sdTri(q, vec2(1.55, .75)) - .01, 2.);",
    "  for (int i=0;i<7;i++){ vec3 s = p - shardPos(i); float a = uT*.2 + float(i); s.xz = rot(a)*s.xz; s.xy = rot(a*.7)*s.xy; U(r, sdOct(s, .16 + .05*mod(float(i),3.)), 3.); }",
    "  vec3 b = p - vec3(1.75,0.,4.1); b.xz = rot(.5)*b.xz; float bl = sdBox(b - vec3(0.,.4,0.), vec3(.38,.4,.38));",
    "  bl = max(bl, (abs(b.x) + abs(b.z))*.7071 - .46); bl = max(bl, (abs(b.x) + b.y - .8)*.7071 - .12);",   // chamfered crystal block
    "  U(r, bl, 4.);",
    "  vec3 c = b - vec3(.0,.83,.0); c.xy = rot(.12)*c.xy; U(r, sdCylY(c, .2, .018) - .004, 5.);",
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    // the light: a beam from SRC to the prism's left face, a line through the glass, and the fan out of the right face
    "vec3 E(){ return PR + vec3(-.45, .12, 0.); }",
    "vec3 X(){ return PR + vec3(.42, -.05, 0.); }",
    "vec3 fanD(){ return normalize(vec3(.5, -.62 - sweep(), -.6)); }",
    "float beamK(){ return (1. + 1.2*momentK())*uLook.x; }",
    "float segD(vec3 p, vec3 a, vec3 b){ vec3 pa = p - a, ba = b - a; return length(pa - ba*clamp(dot(pa,ba)/dot(ba,ba), 0., 1.)); }",
    "float beam(vec3 x){ return exp(-pow(segD(x, SRC, E())/.05, 2.)); }",
    "vec3 fan(vec3 x){ vec3 v = x - X(), D = fanD(), N = normalize(cross(D, vec3(0.,1.,0.))), B = normalize(cross(N, D));",   // the spectrum: hue by angle across the fan
    "  float along = dot(v, D); if (along < 0.) return vec3(0.); float a = atan(dot(v, B), along), w = .05 + along*.035;",
    "  float hue = (a + .2)/.4; if (hue < 0. || hue > 1.) return vec3(0.);",
    "  return spectrum(hue)*exp(-pow(dot(v, N)/w, 2.))*smoothstep(0., .05, hue)*smoothstep(1., .95, hue)/(1. + along*.12); }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) return vec3(.006,.006,.008);",
    "  if (id < 1.5) return vec3(.03,.03,.035);",
    "  return vec3(.5); }",
    "vec3 env(vec3 rd){ return vec3(.006,.006,.012) + vec3(.02,.02,.03)*smoothstep(-.1,.6,rd.y); }",
    "vec3 glass(vec3 p, vec3 n, vec3 rd, float strength){",   // cut glass: a rim of reflection, dispersion as the view bends through it, glints of the fan
    "  float fr = .06 + .94*pow(1. - max(dot(-rd, n), 0.), 4.); vec3 c = env(reflect(rd, n))*fr*3.;",
    "  for (int k=0;k<3;k++){ vec3 t = refract(rd, n, .66 - .02*float(k)); float g = pow(max(dot(t, normalize(X() - E())), 0.), 8.); c[k] += g*.25*beamK(); }",
    "  c += spectrum(fract(dot(n, vec3(.6,.3,.7))*2. + dot(rd, n)))*pow(fr, 2.)*.5*strength;",
    "  return c; }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  if (id > 1.5 && id < 2.5) { vec3 c = glass(p, n, rd, 1.) + vec3(.03,.035,.05);",
    "    vec3 tin = refract(rd, n, .67); float dm = 9.; for (int k=0;k<8;k++) dm = min(dm, segD(p + tin*float(k)*.2, E(), X()));",   // the beam seen through the glass
    "    c += vec3(1.,.98,.95)*exp(-pow(dm/.045, 2.))*beamK()*2.2 + vec3(.6,.7,1.)*exp(-pow(dm/.25, 2.))*beamK()*.15;",
    "    return c; }",
    "  if (id > 2.5 && id < 4.5) { vec3 c = glass(p, n, rd, id > 3.5 ? .6 : 1.4)*(id > 3.5 ? .8 : 1.);",
    "    c += fan(p)*(id > 3.5 ? .45 : 1.2)*beamK() + spectrum(fract(dot(n, vec3(.3,.8,.5))*3. + uT*.05))*pow(max(dot(reflect(rd,n), -fanD()), 0.), 12.)*1.2*uLook.z; return c*(id > 2.5 && id < 3.5 ? uLook.z : 1.); }",
    "  if (id > 4.5) { vec3 h = normalize(-fanD() - rd); float an = pow(max(dot(n,h),0.), 40.);",                    // silver: it shows the colours that reach it
    "    vec3 rr = reflect(rd, n); return vec3(.12,.12,.13)*(.4 + .6*max(n.y,0.)) + fan(p + rr*.5)*1.2*beamK() + spectrum(fract(rr.x*2. + rr.z))*an*.8 + env(rr)*2.; }",
    "  vec3 a = albedo(id, p); vec3 c = a*(.3 + .7*smoothstep(-1.,4.,p.y)) + fan(p)*a*40.*beamK();",                 // what the fan paints on the floor and the wall
    "  c += fan(p)*(id < .5 ? .5 : .7)*beamK();",
    "  return c; }",
    "vec2 raySeg(vec3 ro, vec3 rd, vec3 a, vec3 b){ vec3 ba = b - a, oa = ro - a; float d1 = dot(rd, ba), bb = dot(ba, ba), d3 = dot(rd, oa), d4 = dot(ba, oa);",   // closest approach of a view ray to a segment: (distance, t on the ray)
    "  float den = bb - d1*d1, s = clamp((d4 - d1*d3)/max(den, 1e-5), 0., 1.); vec3 q = a + ba*s; float t = max(dot(q - ro, rd), 0.); return vec2(length(ro + rd*t - q), t); }",
    "vec3 beamGlow(vec3 ro, vec3 rd, float tEnd){ vec2 h = raySeg(ro, rd, SRC, E()); if (h.y > tEnd) return vec3(0.);",
    "  return vec3(1.,.98,.94)*(exp(-pow(h.x/.03, 2.))*1.4 + exp(-pow(h.x/.18, 2.))*.18*uLook.y)*beamK(); }",
    "vec3 haze(vec3 ro, vec3 rd, float tEnd){ int N = 16 + 8*int(uTier); float dt = min(tEnd, 22.)/float(N); vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.27)*67.);",
    "  for (int i=0;i<40;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt; float den = (.035 + .05*vn(x.xz*.6 + uT*.03))*uLook.y;",
    "    acc += fan(x)*14.*den*dt*beamK(); }",
    "  return acc; }",
    "vec3 glints(vec2 uv){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",                // a burst of rainbow glints from each tap
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 2.) continue;",
    "    for (int k=0;k<14;k++){ vec2 h = h22(vec2(float(k), float(i) + tp.x*7.)); float an = h.x*6.283, rr = tp.z*(.12 + .2*h.y); vec2 q = tp.xy*a + vec2(cos(an), sin(an))*rr;",
    "      float d = length(uv*a - q), st = smoothstep(.012, 0., d) + .5*smoothstep(.003, 0., min(abs(uv.x*a.x - q.x), abs(uv.y - q.y)))*smoothstep(.04, 0., d);",
    "      s += spectrum(h.y)*st*exp(-tp.z*1.8)*2.*tp.w; } } return s; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.07; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float tf = rd.y < -.001 ? -ro.y/rd.y : 1e4, tm = min(tf, 40.), t = march(ro, rd, tm); bool flr = t >= tm && tf < 40.; vec3 col;",
    "  if (flr) { t = tf; vec3 p = ro + rd*t; col = shade(p, vec3(0.,1.,0.), rd, 0.);",          // black glass: a mirror
    "    vec3 r = reflect(rd, vec3(0.,1.,0.)); vec3 rc = env(r);",
    "    if (TIER > 0) { float t2 = march(p + r*.01, r, 30.); if (t2 < 30.) { vec3 q = p + r*t2; q -= nrm(q)*map(q); rc = shade(q, nrm(q), r, mapM(q).y); } rc += haze(p, r, min(t2, 20.))*.8; }",
    "    else rc += fan(p + r*2.)*.3*beamK();",
    "    col += rc*mix(.25, .9, pow(1. - max(dot(-rd, vec3(0.,1.,0.)), 0.), 3.)); }",
    "  else if (t < 40.) { vec3 p = ro + rd*t; p -= nrm(p)*map(p); col = shade(p, nrm(p), rd, mapM(p).y); }",
    "  else col = env(rd);",
    "  col += haze(ro, rd, t) + beamGlow(ro, rd, t) + glints(uv);",
    "  return col; }"
  ].join("\n");
  K.stage("kaleido", {
    kind: "ray", glsl: G, grade: .85,
    cam: { pos: [.9, 1.45, -2.2], target: [-.1, 2.2, 7], fov: 1.04 },
    steps: [36, 56, 84, 120], shadowSteps: [0, 0, 0, 0], scale: { low: .4 },
    moments: [{ name: "flare", every: [25, 50], dur: 8 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: 1.1, threshold: .55, knee: .5, exposure: 1.1, aberr: .25, grain: .025, vig: .55 },
    room: { name: "The prism studio", yaw: [-.65, .65], pitch: [-.2, .4], move: [-3, 5.5], up: [0, 2.4], unit: "m", sound: "glass",
      look: [{ id: "light", label: "Light", min: 0, max: 2, def: 1 }, { id: "haze", label: "Haze", min: 0, max: 2.5, def: 1 },
        { id: "crystals", label: "Crystals", min: 0, max: 2, def: 1 }, { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: a burst of rainbow glints from where you tapped.",
      opening: { dur: 5.6, from: { yaw: -.45, pitch: .35, move: 4.2, up: 1.6 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.3, at: [.55, .5] } }
  });
})();
