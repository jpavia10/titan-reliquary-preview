/* fx/cursedwing.js: The Cursed Wing (cursedwing) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30.
   The sealed wing of the house at night, in a storm: a narrow vaulted stone corridor with ribbed pointed arches, candles guttering in the
   wall niches over pools of black wax, and in every niche a reliquary box shut with a blood-red seal. At the far end a door is chained
   and sealed. Through the tall lancet windows on the left the storm flickers, and when lightning comes it throws the window tracery
   across the floor. Along the right wall the mortar has cracked, and something behind it glows red and breathes (the first engine's
   crypt effect, now something you can walk up to). Moment "lightning": the storm breaks over the windows. Touch: the cracks flare where
   you tapped, as if something pressed against the wall. Room (walk camera): walk the corridor, turn to the niches and the windows, look
   up into the vault. Quality: march steps, the shadows, the dust samples and the render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var G = [
    "uniform float uBolt;",                                                     // the lightning, 0..1 (JS: flickering strokes)
    "const vec3 CANDLE = vec3(1.,.6,.28), BLOOD = vec3(.9,.06,.04), STORM = vec3(.55,.65,1.);",
    "const float HW = 1.7, BAY = 2.8;",
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdBox2(vec2 p, vec2 b){ vec2 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,q.y),0.); }",
    "float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float bayZ(float z){ return mod(z, BAY) - .5*BAY; }",
    "float arch(vec2 q, float w, float h){ return min(sdBox2(q - vec2(0., h*.5), vec2(w, h*.5)), max(length(vec2(abs(q.x) + w*.8, q.y - h)) - w*1.8, h - q.y)); }",   // a pointed-arch opening: straight to h, then the point
    // ids: 0 flagstones, 1 walls + vault, 2 ribs, 3 niche box, 4 red seal, 5 candle wax, 6 window glass, 7 the door, 8 chain
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(p.y, 0.);",
    "  float lz = bayZ(p.z), lb = mod(p.z + .5*BAY, BAY) - .5*BAY;",
    "  float sec = arch(vec2(p.x, p.y), HW, 3.1);",                                      // the corridor's section (negative in the air)
    "  float rock = -sec;",
    "  rock = max(rock, -max(arch(vec2(lz, p.y - .95), .4, .9), p.x - HW - .45));",       // niches in the right wall
    "  rock = max(rock, -max(arch(vec2(lz, p.y - 1.), .32, 1.6), -p.x - HW - .5));",       // lancet windows in the left
    "  rock = min(rock, min(20.5 - p.z, p.z + 6.));",
    "  U(r, rock, 1.);",
    "  float rib = max(max(-.12 - sec, abs(lb) - .1), 3.05 - p.y);",                     // ribs over the vault and shafts down the walls, at every bay
    "  rib = min(rib, sdBox(vec3(abs(p.x) - HW + .06, p.y - 1.55, lb), vec3(.1, 1.55, .12)));",
    "  U(r, rib, 2.);",
    "  vec3 b = vec3(p.x - HW - .2, p.y - 1.08, lz); U(r, sdBox(b, vec3(.17,.13,.22)) - .01, 3.);",        // a reliquary in each niche
    "  U(r, sdCylY(vec3(b.y - .02, b.x + .185, b.z), .055, .012), 4.);",                    // its seal, on the front
    "  vec3 cq = vec3(p.x - HW - .1, p.y - .95, lz - .3); U(r, min(sdCylY(cq - vec3(0.,.12,0.), .025, .12), sdCylY(cq, .07, .02) - .01), 5.);",   // a candle on its pool of wax
    "  U(r, max(abs(p.x + HW + .32) - .01, arch(vec2(lz, p.y - 1.), .32, 1.6)), 6.);",       // the glass, deep in each window
    "  vec3 d = p - vec3(0.,0.,20.4); U(r, max(sdBox(d - vec3(0.,1.3,0.), vec3(.8,1.3,.1)), arch(vec2(d.x, d.y), .75, 1.9)), 7.);",   // the sealed door
    "  vec3 ch = d - vec3(0.,1.3,-.14); float chain = abs(abs(ch.x) - abs(ch.y)*.95) - .03; U(r, max(max(chain, abs(ch.z) - .03), max(abs(ch.x) - .7, abs(ch.y) - .8)), 8.);",
    "  U(r, sdCylY(vec3(ch.x, ch.z + .04, ch.y), .14, .025), 4.);",                           // the great seal on the chains
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    "float fl(float z){ return .85 + .15*sin(uT*9. + z*3.) + .08*sin(uT*23. + z*7.); }",
    "vec3 candles(vec3 p, vec3 n){ vec3 s = vec3(0.); float z0 = floor(p.z/BAY)*BAY + .5*BAY;",
    "  for (int k=-1;k<=1;k++){ float z = z0 + float(k)*BAY; if (z > 19.5) continue; vec3 l = vec3(HW + .1, 1.2, z + .3), d = l - p; float r = length(d); d /= r;",
    "    float sh = (TIER > 1 && k == 0) ? shadow(p + n*.02, d, 8.) : 1.; s += CANDLE*fl(z)*max(dot(n, d), 0.)*sh/(.1 + r*r*.9); }",
    "  return s*6.*uLook.x; }",
    "float cracks(vec3 p){ if (p.x < HW - .01) return 0.; vec2 u = vec2(p.z, p.y)*1.4; float c = abs(vn(u*1.3) - .5) + abs(vn(u*2.9 + 3.) - .5)*.5;",   // red light through the cracks
    "  float breath = .55 + .45*sin(uT*.7 + p.z*.3), tap = 0.;",
    "  for (int i=0;i<6;i++){ vec4 tp = uTaps[i]; if (tp.z < 0. || tp.z > 4.) continue; vec3 r = camRay(tp.xy); if (r.x < .01) continue; vec3 h = uCO + r*((HW - uCO.x)/r.x);",
    "    tap += exp(-length(h.zy - p.zy)*1.4)*exp(-tp.z*.7)*3.*tp.w; }",
    "  return smoothstep(.07, .0, c)*(breath + tap)*smoothstep(.6, 1.2, p.y)*uLook.z; }",
    "float stormLight(vec3 p){ vec3 L = normalize(vec3(.75, -.45, .2)); if (p.x > HW - .05) return 0.;",   // the windows thrown across the floor by the flashes
    "  float t = (-HW - .3 - p.x)/(-L.x); vec3 q = p - L*t; float lz = bayZ(q.z); vec2 wq = vec2(lz, q.y - 1.);",
    "  float w = smoothstep(.02, -.02, arch(wq, .32, 1.6)); w *= smoothstep(.0,.03,abs(lz)) * smoothstep(.0,.03,abs(wq.y - 1.05));",   // with its tracery
    "  return w; }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < .5) { vec2 g = abs(fract(p.xz*vec2(.9,.6)) - .5); return vec3(.09,.085,.08)*(.6 + .6*vn(p.xz*3.))*(1. - .6*smoothstep(.45,.5,max(g.x,g.y))); }",
    "  if (id < 1.5) { vec2 u = vec2(p.z + p.x, p.y)*vec2(2.2,3.6); u.x += .5*mod(floor(u.y),2.); vec2 b = abs(fract(u) - .5);",
    "    return vec3(.1,.095,.09)*(.6 + .5*h21(floor(u)))*(1. - .55*smoothstep(.44,.5,max(b.x*.8,b.y)))*(.8 + .3*vn(p.zy*2.)); }",
    "  if (id < 2.5) return vec3(.12,.115,.11)*(.7 + .4*vn(p.zy*5.));",
    "  if (id < 3.5) return vec3(.1,.06,.035)*(.7 + .5*vn(p.zy*20.));",
    "  if (id < 4.5) return BLOOD*.45;",
    "  if (id < 5.5) return vec3(.015);",
    "  if (id < 6.5) return vec3(.05,.06,.08);",
    "  if (id < 7.5) return vec3(.07,.045,.03)*(.7 + .5*vn(vec2(p.x*12., p.y*.8)));",
    "  return vec3(.12,.11,.1); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p); float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  vec3 c = a*(candles(p, n) + vec3(.025,.027,.04)*oc + STORM*((.5 + uBolt*5.)*stormLight(p) + .05 + uBolt*.35)*max(dot(n, -normalize(vec3(.75,-.45,.2))), .15)*uLook.y);",
    "  if (id > 5.5 && id < 6.5) c += STORM*(.16 + 1.2*uBolt)*uLook.y*(.6 + .4*vn(p.zy*6. + uT*.4));",   // the storm in the glass
    "  if (id > 3.5 && id < 4.5) { vec3 h = normalize(normalize(vec3(HW + .1, 1.2, floor(p.z/BAY)*BAY + .5*BAY + .3) - p) - rd); c += BLOOD*pow(max(dot(n,h),0.), 30.)*.8*uLook.x; }",
    "  c += BLOOD*cracks(p)*1.8;",
    "  return c; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec3 flames(vec2 uv, vec3 ro, float tHit){ vec3 s = vec3(0.); vec2 a = vec2(ASP(),1.); float z0 = floor(ro.z/BAY)*BAY + .5*BAY;",   // candle flames, drawn as small glows in place
    "  for (int k=0;k<9;k++){ float z = z0 + float(k)*BAY; if (z > 19.5) break; vec3 x = vec3(HW + .1, 1.23 + .01*sin(uT*11. + z), z + .3), dx = x - ro; float zz = dot(dx, uCF);",
    "    if (zz < .3 || length(dx) > tHit + .1) continue; vec2 q = (uv - toScreen(x))*a; float rad = .045/(zz*uFov);",
    "    s += CANDLE*(smoothstep(rad, 0., length(q*vec2(1.6,.8)))*2.5 + exp(-dot(q,q)/(rad*rad*30.))*.25)*fl(z); } return s*uLook.x; }",
    "vec3 dust(vec3 ro, vec3 rd, float tEnd){ int N = 8 + 5*int(uTier); float dt = min(tEnd, 18.)/float(N); vec3 acc = vec3(0.); float j = .25 + .5*h21(gl_FragCoord.xy + fract(uT*.3)*71.);",
    "  for (int i=0;i<24;i++){ if (i >= N) break; vec3 x = ro + rd*(float(i)+j)*dt; float den = (.01 + .02*vn(x.zy*.7 + uT*.05))*uLook.w;",
    "    acc += (STORM*stormLight(x)*(.3 + uBolt*4.) + CANDLE*.04)*den*dt; } return acc; }",
    "vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.06; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float t = march(ro, rd, 30.); vec3 col = vec3(0.);",
    "  if (t < 30.) { vec3 p = ro + rd*t; p -= nrm(p)*map(p); vec3 n = nrm(p); col = shade(p, n, rd, mapM(p).y); }",
    "  col = mix(col, vec3(.004,.004,.008), 1. - exp(-t*.06));",
    "  col += flames(uv, ro, t) + dust(ro, rd, t);",
    "  return col; }"
  ].join("\n");
  function sm(a, b, k) { return a + (b - a) * k; }
  K.stage("cursedwing", {
    kind: "ray", glsl: G, grade: .82,
    cam: { mode: "walk", pos: [0., 1.6, -3.5], target: [.15, 2.35, 18], fov: 1.05, walk: [0, 0, 1], bounds: [[-1.1, .6, -5.5], [1.1, 3.4, 18.5]] },
    steps: [40, 60, 86, 120], shadowSteps: [0, 0, 14, 22], scale: { low: .4 },
    moments: [{ name: "lightning", every: [9, 22], dur: 1.6 }],
    onTap: function (x, y, S) { if (S.view.mode === "opening") S.startMoment(0); },
    step: function (c, S) {
      var D = S.data, m = S.moment;
      if (D.bolt == null) D.bolt = 0;
      if (m && !c.still) { var a = c.t - m.t0; D.bolt = (a < .08 ? 1 : a < .16 ? .2 : a < .26 ? .85 : a < .5 ? .1 * (1 - a) : Math.max(0, .5 - a) ) * (.7 + .3 * Math.random()); }
      else D.bolt = sm(D.bolt, 0, Math.min(1, (c.dt || 0) * 6));
    },
    uniforms: function (gl, u, c, S) { gl.uniform1f(u.uBolt, S.data.bolt || 0); },
    post: { bloom: .95, threshold: .62, knee: .5, exposure: 1.15, aberr: .08, grain: .045, vig: .65 },
    room: { name: "The sealed wing", yaw: [-.7, .7], pitch: [-.2, .5], move: [-2, 16], up: [0, 1.4], unit: "m", sound: "storm",
      look: [{ id: "candles", label: "Candles", min: 0, max: 2, def: 1 }, { id: "storm", label: "Storm", min: 0, max: 2, def: 1 },
        { id: "walls", label: "Something in the walls", min: 0, max: 2.5, def: 1 }, { id: "dust", label: "Dust", min: 0, max: 2.5, def: 1 }],
      touch: "Tap the right wall: the cracks flare where you tapped, as if something pressed against it.",
      opening: { dur: 5.8, from: { yaw: .55, pitch: .1, move: 5, up: 0 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 3.6, at: [.75, .5] } }
  });
})();
