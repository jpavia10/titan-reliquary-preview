/* fx/glacier.js: Hyperborean Vault (glacier) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   A bullion reserve cut into Arctic bedrock, at night: a concrete wedge stands out of the snow slope with its door open, a corridor
   lit warm runs into the mountain to the stacked gold bars at the end, and over the door a panel of light shimmers ice-blue (the first
   engine's polar-ice glass, now a lit artwork on the facade). Above it all the aurora moves in curtains over the stars and tints the snow.
   Snow drifts past on the wind. Moment "surge": the aurora flares and runs. Touch: a ring of ice glitter spreads from where you tapped and
   the aurora brightens toward it. Room: orbit the entrance, walk up to the door and in, rise up the slope. Quality: march steps, the
   aurora layers, the snow and the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "const vec3 WARM = vec3(1.,.72,.42), ICE = vec3(.45,.85,1.), GOLD = vec3(1.,.7,.28);",
    "const vec3 DOOR = vec3(0.,1.15,3.4);",                        // the light standing in the open door
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float slope(vec2 p){ float z = p.y; return max(0., min(z-4.5, 52.-z*.9))*.42 + (4.*vn(p*.05) + 4.5*(1.-abs(2.*vn(vec2(p.x*.09, z*.04)+7.)-1.)))*smoothstep(3.,16.,z) + 1.4*vn(p*.13)*smoothstep(3.,12.,z) + .25*vn(p*.4) + .06*vn(p*2.3) - .1; }",
    "float corridor(vec3 p){ return sdBox(p - vec3(0.,1.25,10.), vec3(.95,1.25,6.6)); }",
    // ids: 0 snow, 1 concrete, 2 the art panel, 3 steel door leaf, 4 corridor walls, 5 gold, 6 lamps
    "vec2 mapM(vec3 p){",
    "  float cor = corridor(p);",
    "  vec2 r = vec2(max((p.y - slope(p.xz))*.6, -cor), 0.);",
    "  vec3 q = p - vec3(0.,1.85,5.4); float w = sdBox(q, vec3(1.3,1.85,2.4)); w = max(w, dot(q - vec3(0.,1.85,-2.4), normalize(vec3(0.,1.,.42))));",   // the wedge
    "  w = max(w, -sdBox(p - vec3(0.,1.1,3.2), vec3(.66,1.1,.42)));",                     // the door, open into the corridor
    "  w = max(w, -cor); U(r, w, 1.);",
    "  U(r, sdBox(p - vec3(0.,2.95,2.99), vec3(1.12,.52,.015)), 2.);",                     // the light panel on the facade
    "  vec3 g = p - vec3(0.,0.,14.6); g.x = abs(g.x) - .45; vec3 gb = g; gb.x = mod(gb.x + .13, .26) - .13; gb.y = mod(gb.y, .1) - .05; gb.z = mod(gb.z + .07, .14) - .07;",
    "  float stack = max(sdBox(gb, vec3(.11,.04,.055)), sdBox(g - vec3(.1,.35 - .12*abs(g.z+.2),-.2), vec3(.4,.35,.7)));",   // stacked bars, a stepped pile each side
    "  U(r, max(stack, -p.y), 5.);",
    "  vec3 lp = p - vec3(0.,2.47,0.); lp.z = mod(lp.z - 4.6, 2.6) - 1.3; U(r, max(sdBox(lp, vec3(.5,.025,.08)), abs(p.z - 10.4) - 5.8), 6.);",   // lamps along the corridor
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    // the aurora (after nimitz's triangle-noise curtains), layered up the view ray
    "float tri(float x){ return clamp(abs(fract(x)-.5),.01,.49); }",
    "vec2 tri2(vec2 p){ return vec2(tri(p.x)+tri(p.y), tri(p.y+tri(p.x))); }",
    "float triNoise(vec2 p, float spd){ float z = 1.8, z2 = 2.5, rz = 0.; p *= rot(p.x*.06); vec2 bp = p; mat2 m2 = mat2(.95,.31,-.31,.95);",
    "  for (int i=0;i<4;i++){ vec2 dg = tri2(bp*1.85)*.75; dg *= rot(uT*spd); p -= dg/z2; bp *= 1.3; z2 *= .45; z *= .42; p *= 1.21 + (rz-1.)*.02; rz += tri(p.x+tri(p.y))*z; p *= -m2; }",
    "  return clamp(1./pow(rz*29., 1.3), 0., .55); }",
    "float surgeK(){ return 1. + 1.3*momentK(); }",
    "vec3 aurora(vec3 rd){ if (rd.y < .02) return vec3(0.); vec4 col = vec4(0.), avg = vec4(0.); int N = 14 + 8*int(uTier); float j = h21(gl_FragCoord.xy);",
    "  for (int i=0;i<40;i++){ if (i >= N) break; float fi = float(i)*40./float(N), of = .006*j*smoothstep(0.,15.,fi), pt = ((.8+pow(fi,1.4)*.002))/(rd.y*2.+.4) - of;",
    "    vec2 p = (pt*rd).zx*2.6 + vec2(-4., uT*.01); float rzt = triNoise(p, .06*(.6 + .8*momentK())); vec4 c2 = vec4((sin(1.-vec3(2.15,-.5,1.2)+fi*.043)*.5+.5)*rzt, rzt);",
    "    avg = mix(avg, c2, .5); col += avg*exp2(-fi*.065-2.5)*smoothstep(0.,5.,fi); }",
    "  return col.rgb*clamp(rd.y*15.+.4, 0., 1.)*1.1*(40./float(N))*uLook.x*surgeK(); }",
    "vec3 sky(vec3 rd){ vec3 c = mix(vec3(.006,.012,.025), vec3(.01,.03,.05), smoothstep(0.,.5,rd.y));",
    "  vec2 sc = rd.xz/(rd.y+.25)*90.; float st = step(.985, h21(floor(sc)))*smoothstep(.22,.0,length(fract(sc)-.5))*smoothstep(.0,.3,rd.y)*(.5+.5*sin(uT*2.+h21(floor(sc)+3.)*30.));",
    "  return c + vec3(.8,.85,1.)*st*.6 + aurora(rd); }",
    "vec3 skyLight(){ return vec3(.02,.06,.05)*uLook.x*surgeK() + vec3(.012,.016,.03); }",   // what the aurora and the night give the snow
    "vec3 lampLight(vec3 p, vec3 n){ if (p.z < 3.) return vec3(0.); vec3 s = vec3(0.); float z0 = floor((p.z - 4.6 + 1.3)/2.6)*2.6 + 4.6;",
    "  for (int k=-1;k<=1;k++){ vec3 l = vec3(0.,2.4,z0 + float(k)*2.6); if (l.z > 16.4 || l.z < 3.5) continue; vec3 d = l-p; float r = length(d); s += WARM*max(dot(n, d/r),0.)/(.4+r*r*.8); }",
    "  return s*1.6*uLook.y/(1. + .8*step(3.6, uCO.z)); }",   // standing in the corridor the lamps are near: softer
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) return vec3(.82,.86,.92)*(.92+.08*vn(p.xz*3.));",
    "  if (id < 1.5) return vec3(.22,.22,.23)*(.75+.35*vn(p.xy*vec2(1.5,6.)+p.z));",
    "  if (id < 2.5) return vec3(.05);",
    "  if (id < 3.5) return vec3(.18,.19,.2);",
    "  if (id < 4.5) return vec3(.3,.29,.27);",
    "  if (id < 5.5) return GOLD;",
    "  return vec3(1.); }",
    "vec3 panel(vec3 p){ vec2 u = vec2(p.x*9., (p.y-2.95)*9.); vec2 c = floor(u), f = fract(u)-.5; float h = h21(c);",   // prisms catching light, a slow wave through them
    "  float w = .5+.5*sin(uT*.8 + c.x*.35 + c.y*.6 + h*6.) + .8*momentK(), tri = smoothstep(.45,.3,abs(f.x)+abs(f.y)*.6);",
    "  return ICE*(.15 + 1.4*w*w*tri)*(.6+.8*h)*uLook.z; }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  if (id > 1.5 && id < 2.5) return panel(p);",
    "  if (id > 5.5) return WARM*3.*uLook.y;",
    "  vec3 a = albedo(id, p); float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  vec3 dd = DOOR-p; float r = length(dd); dd /= r; float cone = smoothstep(-.1,.6, dd.z);",
    "  float sh = (TIER > 1 && p.z < 3.2) ? shadow(p+n*.03, dd, 12.) : 1.;",
    "  vec3 c = a*(skyLight()*(.6+.4*n.y)*oc + WARM*4.*uLook.y*max(dot(n,dd),0.)*cone*sh/(.4+r*r*.3) + lampLight(p,n));",
    "  vec3 pd = vec3(0.,2.95,2.7)-p; float pr = length(pd); c += a*ICE*.35*uLook.z*max(dot(n,pd/pr),0.)/(.5+pr*pr*.8);",
    "  if (id > 4.5 && id < 5.5) { vec3 h = normalize(normalize(vec3(0.,2.4,13.)-p) - rd); c += GOLD*pow(max(dot(n,h),0.), 24.)*1.8*uLook.y; c += GOLD*.08*uLook.y; }",
    "  if (id < .5) { float gl = step(.9985, h21(floor(p.xz*60.)))*pow(max(dot(reflect(rd,n), normalize(vec3(.2,.6,.8))),0.), 4.); c += vec3(.8,.95,1.)*gl*.8; }",   // ice crystals in the snow
    "  return c; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 snowfall(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.); int N = 18 + 10*int(uTier);",
    "  for (int i=0;i<48;i++){ if (i >= N) break; vec3 h = vec3(h22(vec2(float(i), 6.1)), h21(vec2(float(i), 2.2)));",
    "    float fall = mod(uT*(.35+.3*h.x) + h.y*5., 5.);",
    "    vec3 x = uCO + uCF*(1.2 + 7.*h.z) + uCR*((h.x-.5)*5. + mod(uT*.6 + h.z*4., 4.) - 2.) + uCU*(2.5 - fall);",
    "    vec3 dx = x-ro; float z = dot(dx, uCF); if (z < .5 || length(dx) > tHit) continue;",
    "    vec2 q = (uv-toScreen(x))*a; float rr = .009/(z*uFov); s += vec3(.75,.8,.9)*exp(-dot(q,q)/(rr*rr))*(.3+.7*exp(-z*.2)); } return s*.5; }",
    "vec3 glitter(vec2 uv){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.);",                // a ring of ice glitter from each tap
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 3.) continue; vec2 d = (uv-tp.xy)*a; float r = length(d), ring = exp(-pow((r - tp.z*.22)/.03, 2.));",
    "    float sp = step(.9, h21(floor(uv*uRes/3.) + floor(tp.z*12.))); s += ICE*(ring*.25 + ring*sp*1.6)*exp(-tp.z*1.1)*tp.w; } return s; }",
    "float tapSky(vec3 rd){ float s = 0.; for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 4.) continue; vec3 d = camRay(tp.xy);",
    "  s += smoothstep(.75, 1., dot(rd, d))*exp(-tp.z*.8)*tp.w; } return s; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.07; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 110.); vec3 col;",
    "  if (t < 110.) { vec3 p = ro+rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); col = shade(p, n, rd, mapM(p).y);",
    "    col = mix(col, vec3(.01,.02,.035), 1.-exp(-t*.025)); }",
    "  else col = sky(rd)*(1. + 1.5*tapSky(rd));",
    "  col += snowfall(uv, ro, t) + glitter(uv);",
    "  return col; }"
  ].join("\n");
  K.stage("glacier", {
    kind: "ray", glsl: G, grade: .85,
    roomCam: { mode: "walk", pos: [.1, 1.45, 13.3], target: [0, 1.75, 1.5], fov: 1.05, walk: [0, 0, -1], bounds: [[-.75, .5, 4], [.75, 2.3, 15.6]] },   // inside the vault by the gold, the door and the aurora ahead
    cam: { pos: [1.3, 1.3, -8.2], target: [-.1, 3.25, 3.], fov: 1.04 },
    steps: [56, 72, 96, 128], shadowSteps: [0, 0, 14, 22], scale: { low: .44 },
    moments: [{ name: "surge", every: [30, 60], dur: 14 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    post: { bloom: .9, threshold: .6, knee: .5, exposure: 1.1, aberr: .06, grain: .03, vig: .5 },
    room: { name: "The vault door under the aurora", yaw: [-.75, .75], pitch: [-.15, .45], move: [-3, 7.6], up: [0, 2.6], unit: "m", sound: "blizzard",
      look: [{ id: "aurora", label: "Aurora", min: 0, max: 2, def: 1 }, { id: "vault", label: "Vault light", min: 0, max: 2, def: 1 },
        { id: "panel", label: "Light panel", min: 0, max: 2.5, def: 1 }, { id: "speed", label: "Wind", min: 0, max: 3, def: 1 }],
      touch: "Tap anywhere: a ring of ice glitter spreads from where you tapped and the aurora brightens toward it.",
      opening: { dur: 5.8, from: { yaw: .3, pitch: .45, move: -2.5, up: 1.4 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.5, at: [.5, .78] } }
  });
})();
