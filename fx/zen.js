/* fx/zen.js: Zen Garden (zen) on the GPU kit, through the stage library (fx/stage.js). Claude, 2026-10-30 (replaces the converted
   first-engine world; owner: "why wouldnt it have interactive sand or a legit intro").
   A karesansui at the end of a late-autumn afternoon, seen from the wooden veranda: white gravel raked in straight lines that bend into
   rings around three rock groups with moss at their feet, a stone lantern, a clay wall with a tiled coping at the back and a maple
   leaning over it, dropping red leaves. Low warm sun from the left; the rocks throw long shadows across the grooves.
   The sand is real and it remembers: its grooves live in a height map on the GPU (512 x 512 over the garden). A tap drops a pebble and
   rakes a ring around where it fell; in the room you rake it yourself: drag a finger and five tines draw a fresh line behind it,
   wherever you take them. The room is its own place: you kneel at the edge of the gravel, close to it, the rake in your hand.
   Moment "wind": the maple lets go of a gust of leaves. Opening: the camera comes down over the wall while a fresh line rakes itself
   across the garden and rings the near rock. Quality: march steps (rocks, lantern, wall, veranda), the shadows, the leaf count and the
   render scale follow the tier (fx/stage.js). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K || !K.stage) return;
  var GX = 6.5, GZ0 = -.2, GZ1 = 12;                   // the gravel: x in [-GX, GX], z in [GZ0, GZ1] (the height map covers it)
  var ROCKS = [[-1.9, 6.6, 1.05], [2.3, 8.4, .8], [.55, 3.9, .5]];   // x, z, size
  var G = [
    "uniform sampler2D uH; uniform vec4 uStroke;",
    "const vec3 SUN = vec3(1.,.78,.55), SKY = vec3(.55,.62,.78);",
    "const float GX = " + GX.toFixed(2) + ", GZ0 = " + GZ0.toFixed(2) + ", GZ1 = " + GZ1.toFixed(2) + ";",
    "const vec3 R0 = vec3(" + ROCKS[0][0] + ",0.," + ROCKS[0][1] + "), R1 = vec3(" + ROCKS[1][0] + ",0.," + ROCKS[1][1] + "), R2 = vec3(" + ROCKS[2][0] + ",0.," + ROCKS[2][1] + ");",
    "vec3 LDIR(){ return normalize(vec3(.75,-.42,-.5)); }",                     // the way the sunlight travels
    "float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = max(length(p/(r*r)), 1e-5); return k0*(k0-1.)/k1; }",
    "float sdCylY(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r,h); return min(max(d.x,d.y),0.) + length(max(d,0.)); }",
    "float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }",
    "void U(inout vec2 r, float d, float id){ if (d < r.x) r = vec2(d, id); }",
    "float rock(vec3 p, vec3 c, float s, float seed){ vec3 q = (p - c)/s;",
    "  q.xz = mat2(cos(seed),-sin(seed),sin(seed),cos(seed))*q.xz;",   // a standing stone and its low companion, split along a few faces
    "  float d = sdEll(q - vec3(0.,.62,0.), vec3(.62,1.,.52)); d = smin(d, sdEll(q - vec3(.62,.22,.28), vec3(.55,.36,.45)), .18);",
    "  d = max(d, dot(q, normalize(vec3(.9,.35,.2))) - .5); d = max(d, dot(q, normalize(vec3(-.6,.5,.62))) - .52); d = max(d, dot(q - vec3(0.,1.2,0.), normalize(vec3(.3,1.,-.4))) );",
    "  d += .07*vn(q.xy*3.1 + seed) + (TIER > 0 ? .04*vn(q.zy*7.3 + seed*2.) + .02*vn(q.xz*17.) : .02); return max(d*s*.75, -p.y - .2); }",   // Low: one layer of weathering
    // ids: 0 gravel, 1 rock, 2 moss, 3 lantern stone, 4 clay wall, 5 tiles, 6 veranda wood, 7 maple
    "vec2 mapM(vec3 p){",
    "  vec2 r = vec2(1e3, 0.);",
    "  if (p.y < 2.2 && p.z > 1.) { float b0 = length(p - R0 - vec3(0.,.63,0.)) - 1.8, b1 = length(p - R1 - vec3(0.,.48,0.)) - 1.4, b2 = length(p - R2 - vec3(0.,.3,0.)) - .9;",
"    vec4 k = b0 < b1 ? (b0 < b2 ? vec4(R0.xz, 1.05, .7) : vec4(R2.xz, .5, 4.2)) : (b1 < b2 ? vec4(R1.xz, .8, 2.1) : vec4(R2.xz, .5, 4.2));",   // only the nearest stone in full; the other two by their bounding balls
"    float far = b0 < b1 ? (b0 < b2 ? min(b1, b2) : min(b0, b1)) : (b1 < b2 ? min(b0, b2) : min(b0, b1));",
"    U(r, min(rock(p, vec3(k.x, 0., k.y), k.z, k.w), max(far, .02)), 1.);",
    "    float ms = min(min(length(p.xz - R0.xz) - 1.25, length(p.xz - R1.xz) - .95), length(p.xz - R2.xz) - .62) + .35*vn(p.xz*1.7) + (TIER > 0 ? .12*vn(p.xz*5.) : .06);",   // moss at the rock feet, ragged
    "    U(r, max(p.y - .05 - .06*vn(p.xz*7.) + .08*smoothstep(-.3,.0,ms), ms), 2.); }",
    "  vec3 l = p - vec3(-4.6,0.,9.6);",                                                 // the stone lantern
    "  if (length(l) < 3.) { float d = sdCylY(l - vec3(0.,.35,0.), .2, .35); d = min(d, sdBox(l - vec3(0.,.78,0.), vec3(.32,.08,.32)) - .02);",
    "    d = min(d, sdBox(l - vec3(0.,1.02,0.), vec3(.22,.16,.22))); d = min(d, sdBox(l - vec3(0.,1.24,0.), vec3(.42,.05,.42)) - .03);",
    "    d = min(d, sdEll(l - vec3(0.,1.4,0.), vec3(.16,.14,.16))); U(r, d, 3.); }",
    "  U(r, sdBox(p - vec3(0.,.8,GZ1 + .6), vec3(12.,.8,.25)), 4.);",                    // the clay wall
    "  U(r, sdBox(p - vec3(0.,1.68,GZ1 + .6), vec3(12.,.08 + .05*(1.-abs(fract(p.x*3.)-.5)*2.),.42)) - .02, 5.);",   // its tiled coping
    "  U(r, sdBox(p - vec3(0.,.42,-1.15), vec3(12.,.04,.95)), 6.);",                     // the veranda deck and its edge beam
    "  U(r, sdBox(p - vec3(0.,.22,-.22), vec3(12.,.2,.07)), 6.);",
    "  vec3 m = p - vec3(3.3,0.,13.3);",                                                   // the maple behind the wall, leaning in
    "  if (length(m - vec3(-1.,3.,0.)) < 5.) { float tr = sdCylY(vec3(m.x + .35*m.y - .15*sin(m.y*1.3), m.y - 1.8, m.z), .16 + .07*smoothstep(3.,0.,m.y), 1.8);",
    "    tr = min(tr, sdCylY(vec3((m.x + 1.2) + .9*(m.y - 3.), m.y - 3.3, m.z + .2), .07, .6));",
    "    float can = sdEll(m - vec3(-1.4,4.,-.2), vec3(1.3,.55,1.)); can = min(can, sdEll(m - vec3(-.1,4.6,.3), vec3(1.1,.5,.9)));",   // the crown: tiers of leaf clusters, ragged
    "    can = min(can, sdEll(m - vec3(-2.6,3.4,-.5), vec3(.95,.42,.8))); can = min(can, sdEll(m - vec3(.6,3.7,-.4), vec3(.8,.4,.7))); can = min(can, sdEll(m - vec3(-1.9,4.9,.2), vec3(.7,.35,.6)));",
    "    if (can < .9) { can += (TIER > 0 ? .5*fbm3(m*2.1) : .3*vn(m*2.1)) - .22; if (TIER > 0) can = max(can, -(fbm3(m*3.7 + 2.) - .6)*.6); }",   // the leaf noise only near the crown; the holes from Medium up
    "    U(r, min(tr, can*.5), 7.); }",
    "  return r; }",
    "float map(vec3 p){ return mapM(p).x; }",
    K.stage.RAY,
    "vec2 guv(vec2 xz){ return vec2((xz.x + GX)/(2.*GX), (xz.y - GZ0)/(GZ1 - GZ0)); }",
    "float H(vec2 xz){ vec2 u = guv(xz); if (u.x < 0. || u.x > 1. || u.y < 0. || u.y > 1.) return .5; return texture(uH, u).r; }",
    "float sunShadow(vec3 p){ if (TIER < 1) return 1.; vec3 L = -LDIR(); float r = 1., t = .03;",   // only the solid things throw shadows on the sand
    "  for (int i=0;i<24;i++){ if (i >= 10 + 7*int(uTier)) break; float h = map(p + L*t); r = min(r, 9.*h/t); t += clamp(h, .04, .6); if (r < .02 || t > 14.) break; } return clamp(r, 0., 1.); }",
    "vec3 gravel(vec3 p, vec3 rd){",
    "  float e = 12./512., h = H(p.xz), hx = H(p.xz + vec2(e,0.)) - H(p.xz - vec2(e,0.)), hz = H(p.xz + vec2(0.,e)) - H(p.xz - vec2(0.,e));",
    "  float amp = .024*uLook.y; vec3 n = normalize(vec3(-hx*amp/(2.*e), 1., -hz*amp/(2.*e)));",
    "  vec2 g = p.xz*55.; float grain = h21(floor(g)), sp = step(.985, h21(floor(g*1.7) + 3.1));",
    "  vec3 a = vec3(.78,.76,.72)*(.86 + .14*grain)*(.9 + .1*vn(p.xz*1.3));",
    "  vec3 L = -LDIR(); float sh = sunShadow(p + vec3(0.,.01,0.)), dl = max(dot(n,L),0.), cav = mix(.72, 1., smoothstep(.15,.85,h));",
    "  vec3 c = a*(SUN*dl*sh*1.55*uLook.x + SKY*.22*cav + vec3(.05,.04,.035));",
    "  c += SUN*sp*pow(max(dot(reflect(rd, n), L), 0.), 30.)*sh*.6*uLook.x;",           // a few grains catch the sun
    "  return c; }",
    "vec3 albedo(float id, vec3 p){",
    "  if (id < 1.5) { float st = vn(p.xy*4. + p.z) + .4*vn(vec2(p.y*22., p.x*2.)); return vec3(.2,.19,.18)*(.5 + .55*st) + vec3(.04,.06,.02)*smoothstep(.55,.85,vn(p.xz*3. + p.y))*smoothstep(1.,.1,p.y); }",   // weathered stone, banded, lichen low down
    "  if (id < 2.5) return vec3(.12,.2,.05)*(.6 + .6*vn(p.xz*14.));",
    "  if (id < 3.5) return vec3(.32,.31,.28)*(.65 + .5*vn(p.xy*8. + p.z*3.));",
    "  if (id < 4.5) return vec3(.62,.48,.34)*(.75 + .3*vn(vec2(p.x*.8, p.y*6.)));",
    "  if (id < 5.5) return vec3(.12,.12,.13);",
    "  if (id < 6.5) { float gr = vn(vec2(p.x*.6, p.z*30.)); return vec3(.32,.2,.11)*(.65 + .5*gr); }",
    "  return mix(vec3(.12,.08,.05), vec3(.62,.12,.05), smoothstep(1.6,2.4,p.y))*(.7 + .5*vn(p.xy*6.)); }",
    "vec3 shade(vec3 p, vec3 n, vec3 rd, float id){",
    "  vec3 a = albedo(id, p), L = -LDIR(); float oc = TIER > 0 ? ao(p,n) : 1.;",
    "  float sh = (TIER > 1 && id < 3.5) ? shadow(p + n*.02, L, 10.) : 1.;",
    "  vec3 c = a*(SUN*max(dot(n,L),0.)*sh*1.5*uLook.x + SKY*.42*(.55 + .45*n.y)*oc + vec3(.07,.06,.05) + vec3(.16,.14,.12)*max(-n.z, 0.)*.6);",   // the gravel throws light back onto the stones
    "  if (id > 6.5) c += vec3(.5,.1,.03)*pow(max(dot(-rd, L), 0.), 3.)*.5*uLook.x;",    // sun through the maple
    "  return c; }",
    "vec3 sky(vec3 rd){ vec3 L = -LDIR(); float g = max(dot(rd, L), 0.);",
    "  vec3 c = mix(vec3(.96,.7,.48), vec3(.36,.46,.66), smoothstep(-.02,.55,rd.y)) + SUN*(pow(g, 40.)*1.5 + pow(g, 4.)*.2)*uLook.x;",
    "  float ridge = .05 + .05*vn(vec2(atan(rd.x, rd.z)*6., 1.)) + .03*vn(vec2(atan(rd.x, rd.z)*23., 2.));",   // a wooded hill beyond the wall
    "  c = mix(c, mix(vec3(.16,.2,.17), vec3(.5,.42,.36), .35), smoothstep(ridge + .004, ridge - .004, rd.y)*smoothstep(-.1, .02, rd.y));",
    "  c *= 1. - .25*smoothstep(.0,.6,rd.y)*vn(rd.xz*4. + uT*.005); return c; }",
    "vec2 toScreen(vec3 x){ vec3 d = x-uCO; float z = dot(d,uCF); return vec2(dot(d,uCR)/(z*uFov)/ASP(), dot(d,uCU)/(z*uFov)) + .5; }",
    "vec4 leaves(vec2 uv, vec3 ro, float tHit){ vec4 s = vec4(0.); vec2 a = vec2(ASP(),1.); int N = int(float(6 + 6*int(uTier) + int(momentK()*16.))*uLook.z);",   // maple leaves drifting down
    "  for (int i=0;i<40;i++){ if (i >= N) break; vec3 h = vec3(h22(vec2(float(i), 4.4)), h21(vec2(float(i), 9.3))); float life = 9. + 5.*h.z, age = mod(uT*.5*(1. + momentK()) + h.x*life*3.1, life);",
    "    vec3 x = vec3(2.6 + (h.x - .5)*5. - age*.35, 4.2 - age*.42, 13. - age*(.55 + .4*h.y)) + vec3(sin(age*1.7 + h.y*9.)*.35, 0., cos(age*1.3)*.2);",
    "    if (x.y < 0.) continue; vec3 dx = x - ro; float z = dot(dx, uCF); if (z < .3 || length(dx) > tHit) continue;",
    "    vec2 q = (uv - toScreen(x))*a; float an = age*3. + h.x*6.; q = mat2(cos(an),-sin(an),sin(an),cos(an))*q; float rr = .028/(z*uFov);",
    "    float leaf = smoothstep(rr, rr*.6, length(q*vec2(1., 1.9 + .8*sin(age*4. + h.y*7.))));",
    "    vec3 lc = mix(vec3(.62,.1,.03), vec3(.85,.35,.06), h.y)*(.6 + .5*max(dot(-LDIR(), normalize(vec3(sin(an),.6,cos(an)))),0.))*uLook.x;",
    "    s.rgb = mix(s.rgb, lc, leaf); s.a = max(s.a, leaf); }",
    "  return s; }",
    "void bsp(vec3 ro, vec3 rd, vec3 c, float r, inout float t0, inout float t1){ vec3 oc = ro - c; float b = dot(oc, rd), h = b*b - dot(oc,oc) + r*r;",
"  if (h > 0.) { h = sqrt(h); t0 = min(t0, max(-b - h, 0.)); t1 = max(t1, -b + h); } }",
"vec3 render(vec2 uv){",
    "  vec2 par = (uPtr-.5)*.05; vec3 ro = uCO + uCR*par.x + uCU*par.y*.6, rd = camRay(uv);",
    "  float tg = rd.y < -.001 ? -ro.y/rd.y : 1e4; vec3 pg = ro + rd*tg;",
    "  bool onG = tg < 1e3 && abs(pg.x) < GX && pg.z > GZ0 && pg.z < GZ1;",
    "  float tm = onG ? tg : 60., t, t0 = 1e4, t1 = -1.; vec3 col;",
"  if (onG) {",                                                                         // a ray that lands on the gravel only searches where a rock or the lantern stands
"    bsp(ro, rd, vec3(R0.x,.63,R0.z), 1.8, t0, t1); bsp(ro, rd, vec3(R1.x,.48,R1.z), 1.45, t0, t1); bsp(ro, rd, vec3(R2.x,.3,R2.z), 1.1, t0, t1); bsp(ro, rd, vec3(-4.6,.8,9.6), 1.05, t0, t1);",
"    float te = min(t1, tg); t = (t1 < 0. || t0 > tg) ? tm : t0 + march(ro + rd*t0, rd, te - t0); if (t > te) t = tm;",
"  } else t = march(ro, rd, tm);",
    "  if (t >= tm && onG) col = gravel(pg, rd), t = tg;",
    "  else if (t < tm) { vec3 p = ro + rd*t, n = nrm(p); vec2 hm = mapM(p); if (TIER > 0) { p -= n*hm.x; n = nrm(p); } col = shade(p, n, rd, hm.y); }",
    "  else { col = tg < 1e3 ? vec3(.18,.2,.12)*(.6 + .4*vn(pg.xz*.5)) : sky(rd); }",   // moss beyond the gravel, or the sky
    "  col = mix(col, vec3(.62,.58,.56), 1. - exp(-t*.012));",
    "  vec4 lv = leaves(uv, ro, t); col = mix(col, lv.rgb, lv.a);",
    "  return col; }"
  ].join("\n");

  /* ---------- the sand: a height map (R channel, 0 = groove bottom, 1 = ridge) ping-ponged by a small pass ---------- */
  var SIM = [
    "#version 300 es\nprecision highp float; out vec4 o; uniform sampler2D uPrev; uniform vec4 uA; uniform vec4 uB; uniform float uMode;",
    "const float GX = " + GX.toFixed(2) + ", GZ0 = " + GZ0.toFixed(2) + ", GZ1 = " + GZ1.toFixed(2) + ";",
    "const vec3 R0 = vec3(" + ROCKS[0].join(",") + "), R1 = vec3(" + ROCKS[1].join(",") + "), R2 = vec3(" + ROCKS[2].join(",") + ");",
    "float tines(float off, float w){ float x = off/w; if (abs(x) > 1.) return -1.; return .5 + .5*cos(x*3.14159*5.); }",   // five tines across the rake
    "float pattern(vec2 p){",                                                               // the garden as it was raked this morning
    "  float h = .5 + .5*cos(p.y*3.14159*2./.16);",
    "  vec3 R[3] = vec3[3](R0, R1, R2); float best = 1.;",
    "  for (int i=0;i<3;i++){ float d = length(p - R[i].xy) - R[i].z*1.35; if (d < R[i].z*1.6) { float ring = .5 + .5*cos(d*3.14159*2./.16); float k = smoothstep(R[i].z*1.6, R[i].z*1.2, d); h = mix(h, ring, k); } }",
    "  return h; }",
    "void main(){ vec2 u = gl_FragCoord.xy/vec2(textureSize(uPrev, 0)); vec2 p = vec2(-GX + u.x*2.*GX, GZ0 + u.y*(GZ1 - GZ0));",
    "  if (uMode < .5) { o = vec4(pattern(p), 0., 0., 1.); return; }",                      // 0: the morning pattern
    "  float h = texture(uPrev, u).r;",
    "  if (uMode < 1.5) {",                                                                 // 1: a rake stroke from uA.xy to uA.zw, half width uB.x
    "    vec2 a = uA.xy, b = uA.zw, ba = b - a; float L = length(ba); vec2 dir = L > 1e-4 ? ba/L : vec2(1.,0.);",
    "    float s = clamp(dot(p - a, dir), 0., L), off = dot(p - a, vec2(-dir.y, dir.x)), along = length(p - a - dir*s - vec2(-dir.y, dir.x)*off);",
    "    float t = along < 1e-3 ? tines(off, uB.x) : -1.; if (t >= 0.) h = mix(h, t, smoothstep(uB.x, uB.x*.85, abs(off))*.95);",
    "  } else {",                                                                          // 2: a pebble: rings around uA.xy, out to uB.x
    "    float d = length(p - uA.xy); if (d < uB.x) { float ring = .5 + .5*cos(d*3.14159*2./.16); h = mix(h, ring, smoothstep(uB.x, uB.x*.8, d)*smoothstep(.05, .12, d)); }",
    "  }",
    "  o = vec4(h, 0., 0., 1.); }"
  ].join("\n");
  var sim = null, tex = [], fbo = [], cur = 0, RES = 512, queue = [], lastStroke = null;
  function simInit(gl) {
    sim = K.compile(K.FSQ, SIM); if (!sim) return;
    var half = gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"), IF = half ? gl.RGBA16F : gl.RGBA8, TY = half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    for (var i = 0; i < 2; i++) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, IF, RES, RES, 0, gl.RGBA, TY, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      tex.push(t); fbo.push(f);
    }
    queue.push({ mode: 0 });
  }
  function pass(gl, q) {
    var src = cur, dst = 1 - cur;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[dst]); gl.viewport(0, 0, RES, RES); gl.disable(gl.BLEND); gl.useProgram(sim.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[src]); gl.uniform1i(sim.u.uPrev, 0);
    gl.uniform1f(sim.u.uMode, q.mode); gl.uniform4f(sim.u.uA, q.a ? q.a[0] : 0, q.a ? q.a[1] : 0, q.b ? q.b[0] : 0, q.b ? q.b[1] : 0); gl.uniform4f(sim.u.uB, q.w || .3, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3); cur = dst;
  }
  /* where a screen point lands on the gravel (the camera is the stage's, kept in S.cam) */
  function ground(S, x, y) {
    var B = S.cam; if (!B) return null; var asp = S.c ? S.c.w / S.c.h : 1, fov = (S.camFov || 1.02), px = (x - .5) * asp, py = y - .5;
    var d = [B.f[0] + (px * B.r[0] + py * B.u[0]) * fov, B.f[1] + (px * B.r[1] + py * B.u[1]) * fov, B.f[2] + (px * B.r[2] + py * B.u[2]) * fov];
    if (d[1] > -.001) return null; var t = -B.pos[1] / d[1], gx = B.pos[0] + d[0] * t, gz = B.pos[2] + d[2] * t;
    if (Math.abs(gx) > GX || gz < GZ0 || gz > GZ1) return null; return [gx, gz];
  }
  var autoPath = null;
  K.stage("zen", {
    kind: "ray", glsl: G, grade: .9,
    cam: { pos: [.35, 1.25, -1.35], target: [-.15, .2, 7.5], fov: 1.02 },
    roomCam: { pos: [.2, .62, .25], target: [.05, -.35, 3.2], fov: 1.05 },
    steps: [32, 56, 86, 120], shadowSteps: [0, 0, 14, 22], scale: { low: .36 },
    moments: [{ name: "wind", every: [25, 50], dur: 9 }],
    init: function (gl, S) { simInit(gl); },
    onTap: function (x, y, S) {
      /* a pebble: in the room only on a short tap (the room shell sends it on release); a press that starts a rake drops nothing */
      var g = ground(S, x, y); if (g && !(S.view.mode === "room" && (K.ptr.down || S.data.raking))) queue.push({ mode: 2, a: g, w: .75 });
      if (S.view.mode === "opening") S.startMoment(0);
    },
    step: function (c, S) {
      var v = c.view || {}, D = S.data;
      /* the room: a finger drag rakes (the room shell leaves one-finger drags to the world: room.drag "world") */
      if (v.mode === "room" && c.ptr.down) {
        var g = ground(S, c.ptr.x, c.ptr.y);
        if (g && lastStroke) { var dx = g[0] - lastStroke[0], dz = g[1] - lastStroke[1]; if (dx * dx + dz * dz > .0016) { queue.push({ mode: 1, a: lastStroke, b: g, w: .32 }); lastStroke = g; D.raking = true; } }
        else lastStroke = g;
      } else { lastStroke = null; D.raking = false; }
      /* the opening rakes a line by itself: a slow S across the garden, then a ring round the near rock */
      if (v.mode === "opening") {
        if (!autoPath) { autoPath = { t0: c.t, last: null }; }
        var k = Math.min(1, (c.t - autoPath.t0) / 4.2), x = -5.6 + k * 11.2, z = 2.3 + Math.sin(k * 3.1) * .7, p = [x, z];
        if (autoPath.last && k < 1) queue.push({ mode: 1, a: autoPath.last, b: p, w: .32 }); autoPath.last = p;
      } else autoPath = null;
      if (queue.length > 24) queue.splice(0, queue.length - 24);
    },
    pre: function (gl, c, S) { if (!sim) return; while (queue.length) pass(gl, queue.shift()); },
    uniforms: function (gl, u, c, S) { gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tex[cur] || null); if (u.uH) gl.uniform1i(u.uH, 3); },
    dispose: function (gl) { tex.forEach(function (t) { gl.deleteTexture(t); }); fbo.forEach(function (f) { gl.deleteFramebuffer(f); }); if (sim) gl.deleteProgram(sim.p); tex = []; fbo = []; sim = null; },
    post: { bloom: .55, threshold: .82, knee: .5, exposure: 1.05, aberr: .04, grain: .03, vig: .45 },
    room: { name: "Kneeling at the gravel", yaw: [-.6, .6], pitch: [-.3, .35], move: [-1, 1.6], up: [-.2, 1.2], unit: "m", sound: "sand", drag: "world",
      look: [{ id: "sun", label: "Sun", min: .2, max: 1.8, def: 1 }, { id: "grooves", label: "Grooves", min: .3, max: 2.2, def: 1 },
        { id: "leaves", label: "Falling leaves", min: 0, max: 2, def: 1 }, { id: "speed", label: "Pace", min: 0, max: 3, def: 1 }],
      touch: "Drag a finger across the gravel to rake it; tap to drop a pebble and ring it.",
      opening: { dur: 5.6, from: { yaw: .08, pitch: -.35, move: -2.2, up: 4.2 }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: 4.6, at: [.62, .38] } }
  });
})();
