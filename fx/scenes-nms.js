/* fx/scenes-nms.js: NATURE / SPACE / MATERIAL+MAGIC scenes for TitanFXK (Grok, fx builder #2, 2026-10-20).
   One module, "scene": a full-screen HDR fragment scene picked by s.kind, drawn opaque as the base of a stack (put particles and
   { mod:"post" } after it). Every scene reads touch/mouse: K.ptr position, drag (accumulated into an orbit/turn), and taps.
   Quality: reads the tier from window.TitanQuality (Low/Medium/High/Ultra/Max) when it exists, else High; never auto-downgrades
   (the kit's frame governor is the only safety net). Ports and credits: fx/CREDITS.md.
   Kinds (batch 2): "aurora", "galaxy", "lava", "crystals", "arcane". Kinds (batch 1): "nebula" (Star Nest volumetric fractal, MIT), "blackhole" (geodesic-bent rays + Doppler accretion disk),
   "rainforest" (layered swaying canopy + screen-space god rays + mist), "bubbles" (thin-film soap interference),
   "shatter" (polar-Voronoi glass fracture with per-shard refraction).
   Theme use:  T.mytheme = { stack: [ { mod:"scene", kind:"blackhole" }, { mod:"post", bloom:1.2 } ] }  or  K.preset("blackhole"). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var TIERS = { low: .45, medium: .65, high: .85, ultra: 1, max: 1.35 };
  /* Quality: TitanQuality.tier() first, then localStorage tr_quality (legacy tr_quality_v1), ?q= override; default High. Never auto-downgrades. */
  K.tier = function () { var Q = window.TitanQuality, v = null;
    try { v = Q && (typeof Q.tier === "function" ? Q.tier() : typeof Q.level === "function" ? Q.level() : Q.tier || Q.level); } catch (e) {}
    if (!v) try { v = localStorage.getItem("tr_quality") || localStorage.getItem("tr_quality_v1"); } catch (e) {}
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
  /* ===================== batch 2 (fx builder #2): aurora, galaxy, lava, crystals, arcane ===================== */
  /* ---- NATURE: aurora. Curtains follow nimitz's "Auroras" (Shadertoy XtGGRt) approach: a stack of planes sampled with
     rotated triangle noise, each a step higher and redder; re-written for this kit. Over a snow ridge and a still lake that
     mirrors the sky. Drag looks around, tap sends a substorm surge rippling along the curtains. */
  S.aurora = [
    "float tri(float x){ return clamp(abs(fract(x)-.5),.01,.49); } vec2 tri2(vec2 p){ return vec2(tri(p.x)+tri(p.y), tri(p.y+tri(p.x))); }",
    "float triN(vec2 p, float spd){ float z = 1.8, z2 = 2.5, rz = 0.; p *= rot(p.x*.06); vec2 bp = p;",
    "  for (int i=0;i<5;i++){ vec2 dg = tri2(bp*1.85)*.75; dg *= rot(uT*spd); p -= dg/z2; bp *= 1.3; z2 *= .45; z *= .42; p *= 1.21+(rz-1.)*.02; rz += tri(p.x+tri(p.y))*z; p *= -mat2(.95534,.29552,-.29552,.95534); }",
    "  return clamp(1./pow(rz*29.,1.3),0.,.55); }",
    "vec4 aur(vec3 ro, vec3 rd, float surge){ vec4 col = vec4(0.), avg = vec4(0.); int N = int(18.+26.*uQ);",
    "  for (int i=0;i<50;i++){ if (i>=N) break; float fi = float(i)*50./float(N); float of = .006*h21(gl_FragCoord.xy)*smoothstep(0.,15.,fi);",
    "    float pt = ((.8+pow(fi,1.4)*.002)-ro.y)/(rd.y*2.+.4); pt -= of; vec3 bpos = ro + pt*rd; vec2 p = bpos.zx;",
    "    float rzt = triN(p+vec2(surge*.3*sin(p.y*3.),0.), .06+surge*.2);",
    "    vec4 c2 = vec4(0,0,0,rzt); c2.rgb = (sin(1.-vec3(2.15,-.5,1.2)+fi*.043)*.5+.5)*rzt;",
    "    avg = mix(avg, c2, .5); col += avg*exp2(-fi*.065-2.5)*smoothstep(0.,5.,fi); }",
    "  col *= clamp(rd.y*15.+.4,0.,1.); return col*.75*(1.+surge*1.5); }",
    "vec3 stars(vec3 d){ vec3 q = d*300.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5; return vec3(.9,.95,1.)*step(.997,h)*exp(-dot(f,f)*25.)*(1.+2.*h31(id+2.)); }",
    "vec3 sky(vec3 rd, vec3 ro, float surge){ vec3 c = mix(vec3(.01,.015,.03), vec3(.04,.06,.1), pow(1.-max(rd.y,0.),3.));",
    "  c += stars(rd)*smoothstep(0.,.1,rd.y); vec4 a = aur(ro, rd, surge); return c*(1.-a.a) + a.rgb; }",
    "void main(){ vec3 a = aspectP(); vec2 uv = a.xy; float surge = uTap<0. ? 0. : exp(-uTap*.5)*smoothstep(0.,.3,uTap);",
    "  vec3 ro = vec3(0,0,-6.7); vec3 rd = normalize(vec3(uv, 1.3));",
    "  rd.yz *= rot(-.1-clamp(uDrag.y,-.4,.3)); rd.xz *= rot(uDrag.x*1.5+sin(uT*.025)*.15);",
    "  vec3 c; float hz = .035*fbm3(vec2(atan(rd.x,rd.z)*4.,1.)) + .012*fbm(vec2(atan(rd.x,rd.z)*20.,3.));",
    "  if (rd.y > hz) c = sky(rd, ro, surge);",
    "  else if (rd.y > -.02+hz*.2 && rd.y <= hz) { float s = fbm(vec2(atan(rd.x,rd.z)*30., rd.y*90.)); c = vec3(.04,.05,.08)*(.4+s) + sky(vec3(rd.x,.1,rd.z),ro,surge)*.08; }",
    "  else { vec3 rr = rd; rr.y = abs(rr.y); vec2 w = rd.xz/max(-rd.y,.01)*.5; float rip = fbm(w*3.+uT*.1)*.006; rr.y += rip; rr = normalize(rr);",
    "    float F = .25+.75*pow(1.-abs(rd.y),5.); c = sky(rr, ro, surge)*F*.7 + vec3(.005,.008,.012); }",
    "  vec2 q = (gl_FragCoord.xy/uRes-uP)*vec2(uRes.x/uRes.y,1.); c += vec3(.2,1.,.6)*exp(-dot(q,q)*30.)*.05*uDown;",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- SPACE: galaxy. A barred spiral rendered as a thin volume: logarithmic arms (pitch 14 deg) warped by fbm, blue star-forming
     knots on the arm crests, brown dust lanes on their inner edges, a warm bulge and a halo of field stars. Raymarched through the
     disk so dust really occludes and the inclination is a true 3D tilt. Drag tilts/turns it; tap = a supernova in an arm. */
  S.galaxy = [
    "float dens(vec3 p, out float dust, out float knots){ float r = length(p.xz), a = atan(p.z,p.x) - uT*.04/(.3+r);",
    "  float arm = .5+.5*cos(2.*(a - log(r+.05)*4.));",
    "  float w = fbm(p.xz*3.+3.)*.9; float arms = pow(clamp(arm+w*.35-.15,0.,1.), 3.);",
    "  float disk = exp(-r*1.5)*exp(-abs(p.y)*(14.+6.*r));",
    "  dust = pow(clamp(.5+.5*cos(2.*(a - log(r+.05)*4.)+.55)+fbm(p.xz*7.)*.4-.4,0.,1.),2.)*disk*smoothstep(.05,.25,r)*3.;",
    "  knots = pow(fbm(p.xz*14.+9.),4.)*arms*disk*18.;",
    "  return arms*disk*2.5 + exp(-r*r*30.-p.y*p.y*90.)*1.6; }",
    "void main(){ vec3 A = aspectP(); vec2 uv = A.xy;",
    "  float inc = clamp(1.05+uDrag.y*2.,.15,1.5), spin = uDrag.x*2.;",
    "  vec3 ro = vec3(0., sin(inc), -cos(inc))*2.4; vec3 fw = normalize(-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*1.5+rt*uv.x+up*uv.y); ro.xz *= rot(spin); rd.xz *= rot(spin);",
    "  vec3 bg = vec3(0.); { vec3 q = rd*220.; vec3 id = floor(q); float h = h31(id); vec3 f = fract(q)-.5; bg = mix(vec3(1.,.85,.7),vec3(.7,.8,1.),h31(id+1.))*step(.996,h)*exp(-dot(f,f)*30.)*(1.+3.*h31(id+5.)); }",
    "  float t0 = (-ro.y-.25*sign(rd.y))/rd.y, t1 = (-ro.y+.25*sign(rd.y))/rd.y; if (abs(rd.y)<1e-3){ t0 = 0.; t1 = 6.; } t0 = max(t0,0.); t1 = min(t1, 7.);",
    "  int N = int(28.+44.*uQ); float dt = (t1-t0)/float(N); float t = t0 + dt*h21(gl_FragCoord.xy+uT);",
    "  vec3 col = vec3(0.); float tr = 1.;",
    "  vec2 snP = vec2(cos(5.1),sin(5.1))*.42; float sn = uTap<0. ? 0. : exp(-uTap*.45)*smoothstep(0.,.08,uTap);",
    "  for (int i=0;i<80;i++){ if (i>=N || t>t1 || tr<.02) break; vec3 p = ro+rd*t; float du, kn; float d = dens(p, du, kn);",
    "    float r = length(p.xz); vec3 em = mix(vec3(1.,.78,.5), vec3(.75,.85,1.), smoothstep(.1,.7,r))*d + vec3(.4,.6,1.)*kn + vec3(1.,.35,.5)*kn*.4*fbm(p.xz*20.);",
    "    em += vec3(1.,.95,.9)*sn*30.*exp(-dot(p.xz-snP,p.xz-snP)*900.-p.y*p.y*900.);",
    "    col += tr*em*dt*1.1; tr *= exp(-du*dt*30.); t += dt; }",
    "  col += bg*tr; col += vec3(1.,.8,.6)*sn*.02/(length(uv - (vec2(dot(vec3(snP.x,0.,snP.y)-ro,rt), dot(vec3(snP.x,0.,snP.y)-ro,up))/dot(vec3(snP.x,0.,snP.y)-ro,fw)*1.5))+.01);",
    "  o = vec4(col, 1.); }"].join("\n");
  /* ---- NATURE: lava field. Flow-noise magma (after Inigo Quilez's domain warping and Perlin/Neyret "flow noise") with black basalt crust
     plates (Voronoi) that split along glowing seams, rafts drift with the current, crust edges cool from orange to black, heat shimmer
     above it all. Drag stirs the flow, hold heats the crust under your finger, tap bursts a lava fountain. */
  S.lava = [
    "vec3 vor(vec2 x){ vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.; vec2 id = vec2(0.);",
    "  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 o2 = g + .5+.4*sin(uT*.15+6.28*h22(n+g)) - f; float d = dot(o2,o2);",
    "    if (d<d1){ d2 = d1; d1 = d; id = n+g; } else if (d<d2) d2 = d; } return vec3(sqrt(d2)-sqrt(d1), id); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 p = (uv-.5)*vec2(A,1.);",
    "  vec2 P = vec2(p.x, p.y/(.55+.45*(1.-uv.y)))*2.2;",   // fake perspective: farther toward the top
    "  vec2 fl = vec2(.06,.03)*uT + uDrag*.8; float sh = (fbm3(P*6.+uT*2.)-.5)*.012*(1.-uv.y); P += sh;",
    "  vec2 q = vec2(fbm(P+fl), fbm(P+vec2(5.2,1.3)-fl*.7)); vec2 r = vec2(fbm(P+4.*q+vec2(1.7,9.2)+uT*.05), fbm(P+4.*q+vec2(8.3,2.8)-uT*.04));",
    "  float m = fbm(P+4.*r);",
    "  vec3 v = vor(P*2.4+q*1.2); float seam = smoothstep(.0,.16+.06*sin(uT*.6+v.y*3.), v.x);",
    "  vec2 fp = (uP-.5)*vec2(A,1.); float heat = exp(-dot(p-fp,p-fp)*25.)*uDown;",
    "  float tap = uTap<0. ? 0. : exp(-uTap*.7); vec2 tp = (uTapP-.5)*vec2(A,1.); float burst = exp(-dot(p-tp,p-tp)*(120./(.2+max(uTap,0.)*.6)))*tap;",
    "  float crust = clamp(seam*(.75+.5*h21(v.yz)) - heat*.9 - burst*1.5, 0., 1.);",
    "  float T = clamp(m*1.3 + (1.-crust)*.9 - crust*.6 + heat*.6 + burst*2., 0., 3.);",
    "  vec3 magma = (vec3(1.,.25,.02)*T + vec3(1.,.7,.2)*pow(T,3.)*.25 + vec3(1.,.95,.8)*pow(max(T-1.6,0.),2.)*.6)*.6;",
    "  float rough = fbm(P*14.+v.yz); vec3 rock = vec3(.035,.03,.03)*(.5+rough) + vec3(.6,.15,.02)*pow(1.-seam,6.)*.8;",
    "  vec3 n = normalize(vec3(dFdx(rough), dFdy(rough), .02)); rock += vec3(.9,.4,.15)*pow(max(dot(n, normalize(vec3(0.,-.4,1.))),0.),12.)*.15*(1.-crust*.3);",
    "  vec3 c = mix(magma, rock, smoothstep(.25,.6,crust));",
    "  c += vec3(1.,.3,.05)*.12*smoothstep(.3,1.,uv.y)*(.6+.4*fbm3(vec2(uv.x*3.,uT*.2)));",   // glow haze on the far field
    "  c *= .85+.15*(1.-smoothstep(.2,1.2,length(p)));",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MATERIAL: crystal geode. Raymarched cluster of hexagonal quartz/amethyst prisms (Inigo Quilez's hexagonal-prism SDF and
     smooth-min) growing out of a split geode; glass shading with Fresnel, an internal-path approximation with RGB dispersion
     (three IORs), inner veils and a slow caustic light that orbits. Drag turns it; hold draws the light to your finger; tap = resonance
     pulse that rings up through every crystal. */
  S.crystals = [
    "float sdHex(vec3 p, vec2 h){ const vec3 k = vec3(-.8660254,.5,.57735); p = abs(p); p.xy -= 2.*min(dot(k.xy,p.xy),0.)*k.xy;",
    "  vec2 d = vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x),h.x))*sign(p.y-h.x), p.z-h.y); return min(max(d.x,d.y),0.)+length(max(d,0.)); }",
    "float xtal(vec3 p, vec3 base, vec3 dir, float r, float len){ vec3 z = normalize(dir); vec3 x = normalize(cross(z, vec3(.3,1.,.2))); vec3 y = cross(z,x);",
    "  vec3 q = p-base; q = vec3(dot(q,x),dot(q,y),dot(q,z)); q.z -= len*.5;",
    "  float body = sdHex(q, vec2(r, len*.5)); float tip = dot(vec3(abs(q.xy), q.z-len*.5), normalize(vec3(.8,.46,.9)))-r*.55; return max(body, tip); }",
    "float map(vec3 p, out float id){ float d = 1e3; id = 0.;",
    "  for (int i=0;i<9;i++){ float fi = float(i); vec3 h = vec3(h21(vec2(fi,1.)),h21(vec2(fi,2.)),h21(vec2(fi,3.)));",
    "    vec3 dir = normalize(vec3((h.x-.5)*1.3, .9, (h.y-.5)*1.1)); vec3 b = vec3((h.x-.5)*.7, -.75, (h.y-.5)*.5);",
    "    float c = xtal(p, b, dir, .1+.09*h.z, .7+1.*h.z*(i==0?1.6:1.)); if (c<d){ d = c; id = fi; } }",
    "  float rock = length(p-vec3(0.,-1.3,0.))-.8 + fbm3(p.xz*4.)*.12; if (rock<d){ d = rock; id = -1.; } return d; }",
    "vec3 nrm(vec3 p){ float id; vec2 e = vec2(.0015,0.); return normalize(vec3(map(p+e.xyy,id)-map(p-e.xyy,id), map(p+e.yxy,id)-map(p-e.yxy,id), map(p+e.yyx,id)-map(p-e.yyx,id))); }",
    "vec3 env(vec3 d, vec3 L){ vec3 c = mix(vec3(.02,.015,.04), vec3(.08,.05,.14), d.y*.5+.5); c += vec3(1.,.85,1.)*pow(max(dot(d,L),0.),40.)*1.2 + vec3(.5,.3,1.)*pow(max(dot(d,L),0.),6.)*.4; return c; }",
    "void main(){ vec3 A = aspectP(); vec2 uv = A.xy; float yaw = uDrag.x*3.+uT*.08, pit = clamp(.25+uDrag.y,-.1,1.);",
    "  vec3 ro = 3.4*vec3(sin(yaw)*cos(pit), sin(pit), -cos(yaw)*cos(pit)); vec3 fw = normalize(vec3(0.,-.05,0.)-ro), rt = normalize(cross(vec3(0,1,0),fw)), up = cross(fw,rt);",
    "  vec3 rd = normalize(fw*1.8+rt*uv.x+up*uv.y);",
    "  vec3 L = normalize(vec3(cos(uT*.3), .7, sin(uT*.3))); if (uDown>.5) L = normalize(rt*(uP.x-.5)*3.+up*(uP.y-.2)*3.-fw*.6);",
    "  float pulse = uTap<0. ? 0. : exp(-uTap*.8);",
    "  float t = 0., id = 0.; bool hit = false; int N = int(50.+60.*uQ);",
    "  for (int i=0;i<120;i++){ if (i>=N) break; float d = map(ro+rd*t, id); if (d<.001){ hit = true; break; } t += d*.9; if (t>8.) break; }",
    "  vec3 c = env(rd, L)*.6;",
    "  if (hit){ vec3 p = ro+rd*t, n = nrm(p);",
    "    if (id < 0.){ float ao = clamp(map(p+n*.08,id)/.08,0.,1.); vec3 rc = vec3(.08,.07,.07)*(.4+fbm(p.xz*9.))*(max(dot(n,L),0.)+.15)*ao; c = rc + vec3(.5,.2,.9)*.08*ao; }",
    "    else { float F = .04+.96*pow(1.-max(dot(-rd,n),0.),5.); vec3 refl = env(reflect(rd,n), L);",
    "      vec3 tint = mix(vec3(.75,.45,1.), vec3(.9,.92,1.), h21(vec2(id,7.)));",
    "      vec3 tr3; for (int k=0;k<3;k++){ float ior = 1.53+float(k)*.025; vec3 rr = refract(rd, n, 1./ior); vec3 pin = p+rr*.35;",
    "        float veil = fbm(pin.xy*6.+pin.z*4.+id); vec3 e = env(refract(rr, -nrm(pin), ior+.0001)+rr*.0001, L)*(.6+veil*1.4);",
    "        tr3[k] = e[k]; }",
    "      float glow = pow(max(dot(normalize(L+-rd), n),0.),80.)*1.2;",
    "      float ring = exp(-pow((p.y+.8) - uTap*1.6, 2.)*30.)*pulse;",
    "      c = mix(tr3*tint*1.2, refl, F) + vec3(1.)*glow + tint*vec3(.8,.6,1.)*ring*3. + tint*.06; } }",
    "  o = vec4(c, 1.); }"].join("\n");
  /* ---- MAGIC: arcane circle. A summoning sigil drawn procedurally (concentric rings, rotating rune bands, an inscribed heptagram and
     orbiting glyph seals), lit like burning gold leaf on a dark slate floor seen in perspective, with a volumetric light column and a
     swirling vortex of sparks (particles layer in the preset). Drag spins the outer ring; hold charges it; tap = a castF flash. */
  S.arcane = [
    "float ring(float r, float R, float w){ return smoothstep(w, 0., abs(r-R)); }",
    "float rune(vec2 p, float seed){ vec2 g = floor(p*vec2(5.,3.)); vec2 f = fract(p*vec2(5.,3.)); float h = h21(g+seed);",
    "  float v = step(.5,h)*(1.-smoothstep(.0,.12,abs(f.x-.5))) + step(.4,fract(h*7.))*(1.-smoothstep(.0,.12,abs(f.y-.5))) + step(.75,fract(h*13.))*(1.-smoothstep(.0,.1,abs(f.x-f.y)));",
    "  return clamp(v,0.,1.)*step(abs(p.y-.5),.42); }",
    "float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
    "float sigil(vec2 p, float ch){ float r = length(p), a = atan(p.y,p.x); float s = 0.; float w = .007+.003*ch;",
    "  s += ring(r,.92,w)+ring(r,.86,w)+ring(r,.62,w)+ring(r,.56,w)+ring(r,.22,w*1.4);",
    "  float a1 = a + uT*.15 + uDrag.x*3.; float u1 = fract(a1/6.2832*48.); s += rune(vec2(u1, (r-.865)/.055+.5), floor(a1/6.2832*48.))*step(.865,r)*step(r,.915);",
    "  float a2 = a - uT*.22; float u2 = fract(a2/6.2832*28.); s += rune(vec2(u2, (r-.565)/.055+.5), floor(a2/6.2832*28.)+50.)*step(.565,r)*step(r,.615);",
    "  vec2 q = p*rot(-uT*.08); float hs = 1e3; for (int i=0;i<7;i++){ float t0 = float(i)*6.2832/7., t1 = float(i+3)*6.2832/7.; hs = min(hs, seg(q, .56*vec2(cos(t0),sin(t0)), .56*vec2(cos(t1),sin(t1)))); }",
    "  s += smoothstep(w*1.2,0.,hs);",
    "  for (int i=0;i<7;i++){ float t0 = float(i)*6.2832/7. + uT*.08; vec2 c = .74*vec2(cos(t0),sin(t0)); float d = length(p-c); s += ring(d,.07,w)+ring(d,.045,w*.8)*step(.5,fract(uT*.5+float(i)*.3)+.3); }",
    "  s += ring(r,.11,w)*(.5+.5*sin(uT*3.)); return clamp(s,0.,1.); }",
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; float A = uRes.x/uRes.y; vec2 sp = (uv-vec2(.5,.55))*vec2(A,1.);",
    "  float ch = smoothstep(0.,1.5,uDown) + (uTap<0. ? 0. : exp(-uTap*1.2)); float castF = uTap<0. ? 0. : exp(-uTap*2.5);",
    "  vec3 ro = vec3(0.,1.25,-1.45); vec3 rd = normalize(vec3(sp.x, sp.y-.15, 1.)); rd.yz *= rot(-.48);",
    "  vec3 c = mix(vec3(.01,.008,.02), vec3(.03,.02,.05), uv.y);",
    "  if (rd.y < 0.){ float t = -ro.y/rd.y; vec3 hp = ro+rd*t; vec2 p = hp.xz-vec2(0.,.15);",
    "    float slate = fbm(p*8.)*.5+fbm(p*30.)*.3; vec3 floorc = vec3(.025,.022,.03)*(.6+slate);",
    "    float sg = sigil(p, ch), glowS = sigil(p*1.0, ch);",
    "    float pr = length(p); vec3 gold = mix(vec3(1.,.55,.15), vec3(1.,.85,.55), sg); vec3 arc = mix(vec3(.35,.6,1.), vec3(.8,.4,1.), .5+.5*sin(atan(p.y,p.x)*3.+uT));",
    "    vec3 em = mix(gold, arc, .35+.35*ch)*sg*(2.2+2.5*ch+6.*castF);",
    "    floorc += mix(gold,arc,.5)*exp(-pr*2.2)*(.08+.25*ch) + arc*exp(-abs(pr-.9)*12.)*.04*(1.+ch);",
    "    c = floorc + em; c *= exp(-t*.08); }",
    "  float col = exp(-abs(sp.x)*(10.-4.*ch))*smoothstep(-.35,.6,sp.y)*(.08+.35*ch+1.2*castF); c += mix(vec3(.5,.7,1.),vec3(1.,.8,.5),.4)*col*(.7+.3*fbm3(vec2(sp.x*8., sp.y*2.-uT*1.5)));",
    "  c += vec3(1.,.9,.8)*castF*.6*exp(-dot(sp,sp)*3.);",
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
    aurora: [{ mod: "scene", kind: "aurora" }, { mod: "particles", count: .0015, shape: "dot", size: 1.4, gravity: .02, curl: .5, scale: 2, speed: .02, life: .06, spawn: "top", c1: [.9, .95, 1], c2: [.7, .9, 1], alpha: .5, blend: "add", rake: .4 }, POST({ bloom: 1.1, threshold: .5, aberr: .15 })],
    galaxy: [{ mod: "scene", kind: "galaxy" }, POST({ bloom: 1, threshold: .8, exposure: 1, aberr: .25 })],
    lava: [{ mod: "scene", kind: "lava" }, { mod: "particles", count: .0012, shape: "spark", size: 3, gravity: -.12, curl: 1.2, scale: 1.6, speed: .06, life: .12, spawn: "bottom", c1: [1, .5, .1], c2: [1, .85, .4], alpha: .8, blend: "add", glint: 1, rake: 1.5 }, POST({ bloom: 1, threshold: .85, exposure: 1, aberr: .3 })],
    crystals: [{ mod: "scene", kind: "crystals" }, { mod: "particles", count: .0008, shape: "mote", size: 3, curl: .6, scale: 2, speed: .015, life: .05, c1: [.85, .7, 1], c2: [.7, .9, 1], alpha: .5, blend: "add", glint: 1, rake: .5 }, POST({ bloom: .9, threshold: .85, aberr: .35 })],
    arcane: [{ mod: "scene", kind: "arcane" }, { mod: "particles", count: .003, shape: "spark", size: 2.6, gravity: -.06, curl: 2.2, scale: 1.4, speed: .09, life: .1, spawn: "bottom", c1: [.5, .7, 1], c2: [1, .8, .4], alpha: .8, blend: "add", glint: 1, rake: 1.6 }, { mod: "particles", count: .0005, shape: "mote", size: 7, curl: 1.5, scale: 1.2, speed: .04, life: .08, c1: [.8, .5, 1], c2: [.5, .8, 1], alpha: .7, blend: "add", rake: .8 }, POST({ bloom: 1.5, threshold: .5, aberr: .35 })],
    shatter: [{ mod: "scene", kind: "shatter" }, { mod: "particles", count: .0008, shape: "spark", size: 2.5, curl: .5, speed: .05, life: .3, c1: [.8, .9, 1], c2: [1, .9, .8], alpha: .35, blend: "add", rake: 2, glint: 1 }, POST({ bloom: 1.1, threshold: .7, aberr: .5 })]
  });
  K.preset = function (id) { return (K.presets[id] || []).map(function (x) { return Object.assign({}, x); }); };
})();
