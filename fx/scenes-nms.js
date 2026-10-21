/* fx/scenes-nms.js: NATURE / SPACE / MATERIAL+MAGIC scenes for TitanFXK (Grok, fx builder #2, 2026-10-20).
   One module, "scene": a full-screen HDR fragment scene picked by s.kind, drawn opaque as the base of a stack (put particles and
   { mod:"post" } after it). Every scene reads touch/mouse: K.ptr position, drag (accumulated into an orbit/turn), and taps.
   Quality: reads the tier from window.TitanQuality (Low/Medium/High/Ultra/Max) when it exists, else High; never auto-downgrades
   (the kit's frame governor is the only safety net). Ports and credits: fx/CREDITS.md.
   Kinds (batch 1): "nebula" (Star Nest volumetric fractal, MIT), "blackhole" (geodesic-bent rays + Doppler accretion disk),
   "rainforest" (layered swaying canopy + screen-space god rays + mist), "bubbles" (thin-film soap interference),
   "shatter" (polar-Voronoi glass fracture with per-shard refraction).
   Theme use:  T.mytheme = { stack: [ { mod:"scene", kind:"blackhole" }, { mod:"post", bloom:1.2 } ] }  or  K.preset("blackhole"). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var TIERS = { low: .45, medium: .65, high: .85, ultra: 1, max: 1.35 };
  K.tier = function () { var Q = window.TitanQuality, v = null;
    try { v = Q && (typeof Q.level === "function" ? Q.level() : Q.level || Q.tier); } catch (e) {}
    if (!v) try { v = localStorage.getItem("tr_quality_v1"); } catch (e) {}
    var m = /[?&]q=(low|medium|high|ultra|max)/i.exec(location.search); if (m) v = m[1];
    return TIERS[String(v || "high").toLowerCase()] || .85; };
  var HEAD = "#version 300 es\nprecision highp float;\nNOISE\nuniform vec2 uRes, uP, uTapP, uDrag; uniform float uT, uDown, uTap, uQ; out vec4 o;\n" +
    "float h31(vec3 p){ p = fract(p*vec3(.1031,.1030,.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }\n" +
    "mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,s,-s,c); }\n" +
    "vec3 aspectP(){ vec2 uv = gl_FragCoord.xy/uRes; return vec3((uv-.5)*vec2(uRes.x/uRes.y,1.), 0.); }\n";
  var S = {};
  /* ---- SPACE: nebula. Port of "Star Nest" by Pablo Roman Andrioli (Kali), Shadertoy XlfGRj, MIT. Drag turns the camera,
     tap fires a warp surge; volume steps scale with tier. Recoloured toward a nebula palette, HDR so post bloom catches stars. */
  S.nebula = [
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes-.5; uv.y *= uRes.y/uRes.x;",
    "  float surge = exp(-uTap*1.4)*step(0.,uTap); vec3 dir = vec3(uv*(.8+surge*.5), 1.);",
    "  float time = uT*(.01+surge*.08)+.25+surge*.0;",
    "  float a1 = .5+uDrag.x*2.+sin(uT*.03)*.2, a2 = .8+uDrag.y*2.;",
    "  dir.xz *= rot(a1); dir.xy *= rot(a2);",
    "  vec3 from = vec3(1.,.5,.5) + vec3(time*2., time, -2.); from.xz *= rot(a1); from.xy *= rot(a2);",
    "  float s = .1, fade = 1.; vec3 v = vec3(0.); int VS = int(clamp(14.*uQ+3., 8., 22.));",
    "  for (int r=0;r<22;r++){ if (r>=VS) break; vec3 p = from+s*dir*.5; p = abs(vec3(.85)-mod(p,vec3(1.7)));",
    "    float pa = 0., a = 0.; for (int i=0;i<17;i++){ p = abs(p)/dot(p,p)-.53; a += abs(length(p)-pa); pa = length(p); }",
    "    float dm = max(0., .3-a*a*.001); a *= a*a; if (r>6) fade *= 1.-dm;",
    "    v += fade; v += vec3(s, s*s, s*s*s*s)*a*.0015*fade; fade *= .73; s += .1; }",
    "  v = mix(vec3(length(v)), v, .85)*.01*(20./float(VS+6));",
    "  vec3 c = v*vec3(.9,.75,1.15); c = pow(c, vec3(1.35))*.75;",
    "  vec2 q = (gl_FragCoord.xy/uRes-uP)*vec2(uRes.x/uRes.y,1.); c += vec3(.6,.4,1.)*exp(-dot(q,q)*40.)*.35*uDown;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: black hole. Photon paths bent by the Schwarzschild term (a = -1.5 h^2 r / |r|^5, rs = 1), the technique popularised by
     Riccardo Antonelli's "starless" and many Shadertoy Gargantua ports; written fresh here. Disk 2.6..12 rs, Keplerian swirl,
     temperature ramp and relativistic beaming (D^3). Drag orbits the camera; tap = a flare that rides the disk. */
  S.blackhole = [
    "vec3 sky(vec3 d){ vec3 q = d*260.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5;",
    "  float st = step(.9965,h)*exp(-dot(f,f)*30.)*(2.+8.*h31(id+7.)); vec3 sc = mix(vec3(1.,.8,.6), vec3(.6,.75,1.), h31(id+3.));",
    "  float n = fbm(d.xy*2.+d.z)*fbm(d.yz*3.+4.); vec3 neb = mix(vec3(.05,.02,.09), vec3(.25,.08,.15), n)*n*1.4 + vec3(.02,.05,.1)*fbm(d.xz*5.);",
    "  return sc*st + neb*.6; }",
    "void main(){ vec3 a = aspectP(); vec2 uv = a.xy;",
    "  float yaw = uDrag.x*3.+uT*.03, pit = clamp(.26+uDrag.y*1.5, -1.2, 1.2), dist = 19.-3.*uDown;",
    "  vec3 ro = dist*vec3(sin(yaw)*cos(pit), sin(pit), -cos(yaw)*cos(pit)); vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*1.6 + rt*uv.x + up*uv.y);",
    "  vec3 p = ro, v = rd; vec3 hh = cross(p,v); float h2 = dot(hh,hh); vec3 col = vec3(0.); float tr = 1.;",
    "  int N = int(90.+130.*uQ); float flare = exp(-uTap*.6)*step(0.,uTap);",
    "  for (int i=0;i<300;i++){ if (i>=N) break; float r = length(p); if (r < 1.) { tr = 0.; break; } if (r > 45.) break;",
    "    float dt = clamp(.07*r, .015, 1.2); vec3 pp = p; v += -1.5*h2*p/pow(r,5.)*dt; p += v*dt;",
    "    if (pp.y*p.y < 0.) { vec3 x = mix(pp, p, pp.y/(pp.y-p.y)); float R = length(x.xz);",
    "      if (R > 2.6 && R < 12.) { vec2 sw = rot(uT*2.2/pow(R,1.5))*x.xz; float n = fbm(sw*1.3)*.6+fbm(vec2(R*4., atan(sw.y,sw.x)*2.))*.5;",
    "        float T = pow(2.6/R, .8); vec3 bb = mix(vec3(1.,.28,.05), mix(vec3(1.,.72,.38), vec3(.85,.9,1.), smoothstep(.6,1.,T)), T);",
    "        vec3 vd = normalize(vec3(-x.z,0.,x.x)); float D = 1./(1.-.55*dot(vd, -normalize(v))*inversesqrt(R*.5)); ",
    "        float fl = flare*exp(-pow(mod(atan(sw.y,sw.x)-uTap*1.5,6.2832)-3.,2.)*2.)*smoothstep(7.,3.,R)*3.;",
    "        float I = (n*n*1.6+.08+fl)*smoothstep(2.6,3.2,R)*smoothstep(12.,6.,R)*T*T*1.1*pow(D,3.);",
    "        float al = clamp(I*.6+.2, 0., .97);",
    "        col += tr*bb*I; tr *= 1.-al; } } }",
    "  col += tr*sky(normalize(v));",
    "  float r0 = length(uv); col += vec3(.5,.3,.15)*exp(-r0*3.)*.04;",
    "  o = vec4(col, 1.); }"].join("\n");
  /* ---- NATURE: rainforest canopy. Five parallax foliage layers (fbm leaf clumps, hanging vines, trunks) swaying on a wind field,
     aerial-perspective mist between them, and screen-space god rays (GPU Gems 3 ch.13, K. Mitchell: radial occlusion sampling toward
     the sun). The pointer steers the sun; a tap sends a gust through the leaves. Fireflies/leaves/pollen come from particles. */
  S.rainforest = [
    "float gustT(){ return exp(-uTap*.9)*step(0.,uTap); }",
    "float leaves(vec2 p, float L){ float A = uRes.x/uRes.y; float g = gustT();",
    "  float w = sin(uT*.6+p.y*2.+L)*.012*(1.+L*.4) + sin(uT*1.7+p.x*9.)*.004 + g*sin(uT*9.+p.x*6.)*.02*(1.+L);",
    "  p.x += w*smoothstep(.2,1.,p.y); vec2 uv = vec2(p.x/A+.5, p.y); vec2 q = p*(2.6+L*.7)+vec2(L*13.7, L*3.1);",
    "  float n = fbm(q*vec2(1.,1.3)) + .3*vn(q*11.) + .15*vn(q*31.);",
    "  float top = smoothstep(-.01,.01, p.y - (.97 - .055*L + (n-.6)*(.22+.05*L)));",
    "  float sd = abs(uv.x-.5)*2.; float side = smoothstep(-.01,.01, sd - (1.08 - .075*L + (n-.6)*.3))*step(1.5,L);",
    "  float under = smoothstep(.01,-.01, p.y - (.03 + .028*L + (n-.5)*.14 + .05*vn(vec2(p.x*40.,L))));",
    "  float vine = 0.; for (int k=0;k<3;k++){ float fk = float(k); float x0 = (h21(vec2(fk,L))-.5)*A*.9; float len = .15+.35*h21(vec2(L,fk+4.));",
    "    vine = max(vine, smoothstep(.0025+.001*L, .0, abs(p.x-x0-sin(p.y*7.+uT*.8+fk)*.012))*smoothstep(.95-len-.08*L, 1.-len-.08*L, p.y)); }",
    "  float trunk = 0.; for (int k=0;k<2;k++){ float fk = float(k); float x0 = (h21(vec2(L*7.,fk))-.5)*A*1.1; float wd = (.004+.01*h21(vec2(fk,L*3.)))*(1.+L*.6);",
    "    trunk = max(trunk, smoothstep(wd, wd*.6, abs(p.x-x0+sin(p.y*3.+fk)*.015*(1.-p.y)))); }",
    "  return clamp(max(max(max(top, side), under), max(vine, trunk)), 0., 1.); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = vec2((uv.x-.5)*A, uv.y);",
    "  vec2 sun = vec2(mix(.25,.75,uP.x), 1.08);",
    "  vec3 skyC = mix(vec3(.3,.45,.36), vec3(.95,.93,.7), smoothstep(.6,0.,length((uv-sun)*vec2(A,1.))));",
    "  vec3 c = skyC; float occ = 0.;",
    "  for (int i=0;i<5;i++){ float L = float(i); float par = (uP.x-.5)*.04*(L+1.); float m = leaves(p+vec2(par,0.), L);",
    "    float depth = 1.-L/5.; vec3 lc = mix(vec3(.02,.06,.03), vec3(.1,.3,.16), depth*.8); lc += vec3(.35,.45,.1)*vn(p*60.+L)*.08*depth;",
    "    vec3 mist = mix(vec3(.2,.34,.28), vec3(.5,.62,.48), uv.y)*(1.-.35*smoothstep(.2,.9,abs(uv.x-.5)*2.)); c = mix(c, mix(lc, mist, depth*depth*.75), m);",
    "    c = mix(c, mist, .07*(1.-uv.y)*(1.+fbm3(p*3.+vec2(uT*.03,L))));",          // mist between layers
    "    occ = max(occ, m); }",
    "  vec2 d = (sun-uv); float NS = 24.+24.*uQ; float sh = 0., w = 1.;",
    "  for (int k=0;k<56;k++){ if (float(k)>=NS) break; vec2 s = uv + d*(float(k)/NS)*.9; vec2 sp = vec2((s.x-.5)*A, s.y);",
    "    float mm = 0.; for (int i=0;i<3;i++){ float L = float(i)*2.; mm = max(mm, leaves(sp+vec2((uP.x-.5)*.04*(L+1.),0.), L)); }",
    "    sh += (1.-mm)*w; w *= .965; }",
    "  sh /= NS*.6; vec3 rays = vec3(1.,.93,.7)*pow(sh,2.)*.35*(.6+.4*fbm3(vec2(atan(d.y,d.x)*8.,uT*.1)));",
    "  c += rays*(1.-occ*.5); c += vec3(1.,.95,.75)*exp(-length((uv-sun)*vec2(A,1.))*6.)*.9;",
    "  float hz = fbm(p*vec2(1.5,4.)+vec2(uT*.02,0.)); c = mix(c, vec3(.55,.7,.6)+rays*.6, smoothstep(.45,.9,hz)*.25*(1.-uv.y*.5));",
    "  o = vec4(c*.8, 1.); }"].join("\n");
  /* ---- MATERIAL: soap bubbles. Analytic spheres with thin-film interference (Glassner/Belcour-style 3-wavelength approximation:
     I = .5 + .5 cos(4 pi n d cos(theta_t) / lambda)), film thickness draining downward with swirling Marangoni noise, Fresnel rim,
     reflected softbox highlights and a refracted bokeh backdrop. Bubbles drift on a CPU spring system: drag pushes, tap pops. */
  S.bubbles = [
    "uniform vec4 uB[10]; uniform float uPop[10];",
    "vec3 back(vec2 p){ vec3 c = mix(vec3(.01,.012,.03), vec3(.05,.03,.08), p.y+.5);",
    "  for (int k=0;k<9;k++){ float fk = float(k); vec2 bp = vec2(sin(fk*3.1+uT*.05)*.9, fract(fk*.37+uT*.008)*1.2-.6); vec3 bc = .5+.5*cos(fk*1.7+vec3(0,2,4));",
    "    c += bc*smoothstep(.06,.05,length(p-bp))*.12 + bc*exp(-length(p-bp)*7.)*.06; } return c; }",
    "vec3 film(float d, float ct){ vec3 lam = vec3(650.,510.,475.); return .5+.5*cos(6.2832*2.*1.33*d*ct/lam); }",
    "void main(){ vec3 a = aspectP(); vec2 p = a.xy; vec3 c = back(p);",
    "  for (int i=0;i<10;i++){ vec4 b = uB[i]; if (b.w <= 0.) continue; vec2 d = (p-b.xy)/b.w; float r2 = dot(d,d);",
    "    float pop = uPop[i]; if (pop > 0.) { float ring = exp(-pow(sqrt(r2)-1.-pop*3.,2.)*60.)*(1.-pop); c += vec3(.8,.9,1.)*ring*.5; continue; }",
    "    if (r2 > 1.) continue; vec3 n = vec3(d, sqrt(1.-r2)); float ct = n.z;",
    "    float sw = fbm(n.xy*2.5+vec2(uT*.08, -uT*.05)+float(i)*7.) + .5*fbm(n.xy*6.-uT*.1);",
    "    float thick = mix(180., 900., smoothstep(.9,-.9,n.y)*.6+sw*.6);",
    "    float F = .04+.96*pow(1.-ct, 5.); vec3 ir = film(thick, sqrt(1.-(1.-ct*ct)/1.77));",
    "    vec3 refr = back(p - d*b.w*.08*(1.-ct));",
    "    vec3 R = reflect(vec3(0,0,-1), n); float box = smoothstep(.12,.0,length(max(abs(R.xy-vec2(-.45,.5))-vec2(.18,.12),0.)))*step(0.,R.z);",
    "    float box2 = smoothstep(.2,.0,length(R.xy-vec2(.6,-.3)))*.4; vec3 env = vec3(1.,.98,.95)*(box*3.+box2) + vec3(.2,.25,.4)*(R.y*.5+.5)*.3;",
    "    vec3 sc = refr*(1.-F*.6) + ir*(F*1.4+.08)*(.5+env) + env*F*ir*1.5;",
    "    c = mix(c, sc, smoothstep(1.,.985,r2)); c += ir*exp(-pow(1.-sqrt(r2),2.)*900.)*.25; }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MATERIAL: glass shatter. A pane in front of a night-city bokeh; a tap is an impact: radial + concentric cracks race out
     (polar Voronoi, F2-F1 edges), every shard tilts on its own so the city refracts and glints differently through it, a white
     stress flash rides the crack front, then the pane slowly heals with a light sweep. Drag tilts the whole pane (specular). */
  S.shatter = [
    "vec3 city(vec2 p){ vec3 c = mix(vec3(.02,.01,.04), vec3(.08,.03,.1), p.y+.5);",
    "  for (int k=0;k<24;k++){ float fk = float(k); vec2 bp = vec2(fract(fk*.618)*2.4-1.2, fract(fk*.437)*1.2-.6) + vec2(sin(uT*.1+fk),0.)*.03;",
    "    vec3 bc = mix(vec3(1.,.55,.2), vec3(.3,.6,1.), step(.5, fract(fk*.73))); if (fract(fk*.31)>.75) bc = vec3(1.,.25,.45);",
    "    float r = .025+.06*fract(fk*.53); c += bc*smoothstep(r, r*.85, length(p-bp))*.35*(.6+.4*sin(fk+uT*.7)); }",
    "  return c; }",
    "vec3 vor(vec2 x){ vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.; vec2 id = vec2(0.);",
    "  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 cid = n+g; cid.x = mod(cid.x, 14.); vec2 o2 = g + .15 + .7*h22(cid) - f; float d = dot(o2,o2);",
    "    if (d < d1) { d2 = d1; d1 = d; id = cid; } else if (d < d2) d2 = d; }",
    "  return vec3(sqrt(d2)-sqrt(d1), id); }",
    "void main(){ vec3 a = aspectP(); vec2 p = a.xy; float A = uRes.x/uRes.y; vec2 ip = (uTapP-.5)*vec2(A,1.);",
    "  float tau = uTap < 0. ? 99. : uTap; float heal = smoothstep(9.,11.,tau); float front = tau*2.2;",
    "  vec2 q = p-ip; float r = length(q), ang = atan(q.y,q.x);",
    "  vec3 v = vor(vec2((ang/6.2832+.5)*14., log(r+.02)*3.2));",
    "  float on = smoothstep(front, front-.15, r)*(1.-heal)*step(tau, 11.);",
    "  float crack = smoothstep(.06, .0, v.x)*on; float shard = on;",
    "  vec2 tilt = (h22(v.yz+3.)-.5)*.06*shard*smoothstep(0.,.5,r) + (uDrag)*.05;",
    "  vec3 bgc = city(p + tilt); vec3 n = normalize(vec3(tilt*8., 1.));",
    "  float spec = pow(clamp(dot(reflect(normalize(vec3(p, -1.5)), n), normalize(vec3(-.3,.5,.8))), 0., 1.), 60.);",
    "  vec3 c = bgc*(1.-.15*shard) + vec3(.7,.85,1.)*spec*(.3+shard*1.2);",
    "  c += vec3(.85,.92,1.)*crack*(.5+1.5*exp(-tau*1.5));",
    "  c += vec3(.9,.95,1.)*exp(-pow((r-front)*25.,2.))*(1.-heal)*step(tau,3.)*1.5;",            // stress flash on the crack front
    "  c += vec3(1.,.95,.9)*exp(-r*r*400.)*exp(-tau*3.)*6.;",                                   // impact point
    "  float sweep = exp(-pow((p.x+p.y*.5) - (tau-9.)*1.4 + 1.2, 2.)*30.)*step(9.,tau)*step(tau,11.5); c += vec3(.6,.8,1.)*sweep*.8;",
    "  c += vec3(.7,.8,1.)*.025*smoothstep(.0,.6,1.-abs(p.y-p.x*.3-.2))*(1.-shard);",            // faint pane sheen
    "  o = vec4(c, 1.); }"].join("\n");

  K.scenes = S;
  K.mod("scene", function (gl, s, K) {
    var src = S[s.kind]; if (!src) return null;
    var pr = K.compile(K.FSQ, HEAD.replace("NOISE", K.NOISE) + src); if (!pr) return null;
    var drag = [0, 0], lastX = null, lastY = null, tapAt = -1, tapP = [.5, .5], tapSeen = K.ptr.tap, bubbles = null, pops = null;
    if (s.kind === "bubbles") { bubbles = []; pops = new Float32Array(10); for (var i = 0; i < 10; i++) bubbles.push(newB(i, true)); }
    function newB(i, any) { var A = innerWidth / innerHeight; return { x: (Math.random() - .5) * A * .9, y: any ? Math.random() - .5 : -.75, vx: 0, vy: 0, r: .07 + Math.random() * .13 * (s.big || 1), seed: Math.random() * 9 }; }
    return { name: "scene", step: function (c) {
      var p = c.ptr; if (p.down) { if (lastX != null) { drag[0] += p.x - lastX; drag[1] += p.y - lastY; } lastX = p.x; lastY = p.y; } else lastX = lastY = null;
      if (p.tap !== tapSeen) { tapSeen = p.tap; tapAt = c.t; tapP = [p.tx, p.ty]; if (bubbles) popAt(p.tx, p.ty); }
      if (bubbles && !c.still) { var A = c.w / c.h, px = (p.x - .5) * A, py = p.y - .5;
        bubbles.forEach(function (b, i) { if (pops[i] > 0) { pops[i] += c.dt * 1.6; if (pops[i] >= 1) { pops[i] = 0; bubbles[i] = newB(i); } return; }
          b.vy += (.035 + Math.sin(c.t * .7 + b.seed) * .02) * c.dt; b.vx += Math.sin(c.t * .5 + b.seed * 3) * .02 * c.dt;
          var dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy) + 1e-3; if (p.down && d < .45) { var f = (.45 - d) * 3 * c.dt; b.vx += dx / d * f + p.vx * .02 * c.dt; b.vy += dy / d * f + p.vy * .02 * c.dt; }
          bubbles.forEach(function (o2, j) { if (j === i || pops[j] > 0) return; var ex = b.x - o2.x, ey = b.y - o2.y, ed = Math.hypot(ex, ey) + 1e-4, m = b.r + o2.r; if (ed < m) { b.vx += ex / ed * (m - ed) * 2 * c.dt; b.vy += ey / ed * (m - ed) * 2 * c.dt; } });
          b.vx *= .985; b.vy *= .985; b.x += b.vx * c.dt; b.y += b.vy * c.dt; if (b.y - b.r > .62) bubbles[i] = newB(i); if (Math.abs(b.x) > A * .5 + b.r) b.vx *= -1; }); }
      function popAt(tx, ty) { var A = c.w / c.h, X = (tx - .5) * A, Y = ty - .5; bubbles.forEach(function (b, i) { if (pops[i] === 0 && Math.hypot(b.x - X, b.y - Y) < b.r) pops[i] = .001; }); }
    }, draw: function (c) {
      gl.disable(gl.BLEND); gl.useProgram(pr.p); var u = pr.u;
      gl.uniform2f(u.uRes, c.w, c.h); gl.uniform2f(u.uP, c.ptr.x, c.ptr.y); gl.uniform2f(u.uTapP, tapP[0], tapP[1]); gl.uniform2f(u.uDrag, drag[0], drag[1]);
      gl.uniform1f(u.uT, c.t); gl.uniform1f(u.uDown, c.ptr.down); gl.uniform1f(u.uTap, tapAt < 0 ? -1 : c.t - tapAt); gl.uniform1f(u.uQ, K.tier() * Math.max(.5, c.q));
      if (bubbles) { var B = new Float32Array(40); bubbles.forEach(function (b, i) { B.set([b.x, b.y, 0, b.r], i * 4); }); gl.uniform4fv(u.uB, B); gl.uniform1fv(u.uPop, pops); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, dispose: function () { gl.deleteProgram(pr.p); } };
  });
  /* Presets themes can pull in: K.preset("rainforest") returns a full stack (scene + companions + post). */
  var POST = function (o) { return Object.assign({ mod: "post", bloom: 1, threshold: .65, exposure: 1.15, aberr: .3, grain: .025, vig: .4 }, o || {}); };
  K.presets = K.presets || {};
  Object.assign(K.presets, {
    nebula: [{ mod: "scene", kind: "nebula" }, { mod: "particles", count: .008, shape: "mote", size: 2.5, curl: .3, speed: .01, life: .02, c1: [.8, .7, 1], c2: [.5, .8, 1], alpha: .5, blend: "add", glint: 1, rake: .6 }, POST({ bloom: 1.3, threshold: .55 })],
    blackhole: [{ mod: "scene", kind: "blackhole" }, POST({ bloom: 1.5, threshold: .7, exposure: 1.05, aberr: .45 })],
    rainforest: [{ mod: "scene", kind: "rainforest" },
      { mod: "particles", count: .00025, shape: "petal", size: 13, gravity: .05, drift: [.02, 0], curl: .8, scale: 1.2, speed: .05, life: .08, spawn: "top", c1: [.25, .45, .12], c2: [.55, .5, .15], alpha: .8, blend: "alpha", rake: 1 },
      { mod: "particles", count: .0006, shape: "mote", size: 8, curl: 1.4, scale: 2, speed: .04, life: .1, c1: [.75, 1, .3], c2: [1, .85, .3], alpha: .9, blend: "add", glint: 1, rake: .8 },
      { mod: "particles", count: .004, shape: "dot", size: 1.2, curl: .6, scale: 3, speed: .02, life: .05, drift: [.005, .003], c1: [1, .95, .7], c2: [.9, 1, .8], alpha: .18, blend: "add", rake: .5 },
      POST({ bloom: .9, threshold: .75, aberr: .15, dof: .25, focusY: .45 })],
    bubbles: [{ mod: "scene", kind: "bubbles" }, POST({ bloom: .8, threshold: .8, aberr: .2 })],
    shatter: [{ mod: "scene", kind: "shatter" }, { mod: "particles", count: .0008, shape: "spark", size: 2.5, curl: .5, speed: .05, life: .3, c1: [.8, .9, 1], c2: [1, .9, .8], alpha: .35, blend: "add", rake: 2, glint: 1 }, POST({ bloom: 1.1, threshold: .7, aberr: .5 })]
  });
  K.preset = function (id) { return (K.presets[id] || []).map(function (x) { return Object.assign({}, x); }); };
})();
