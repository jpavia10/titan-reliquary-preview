/* TitanFX style presets (notes/agents/styles-20.md, section 1): style-wireframe, style-glass, style-mesh, style-deco, style-halftone (Solar Observatory, Hyperborean Vault, Samadhi, Nocturne, Conservator).
   Loads after wings/fx/presets.js. */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;

  /* shared GLSL helpers (the engine prelude already provides h11 h21 h22 vn fbm fbmQ hsv mK mEnv and all uniforms) */
  var COMMON = [
    "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }",
    "float asp(){ return uRes.x/uRes.y; }",
    "float cssPx(){ return uScale/uRes.y; }",
    "vec4 fin(vec3 c, float al){ return vec4(c*mix(1.,.5,uLight), al*mix(1.,2.,uLight)); }",
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
    // coverage of a line of half-width hw (screen-height units) at distance d, anti-aliased over about one pixel
    "float cov(float d, float hw){ float aa = 1./uRes.y; float h = max(hw, .5*aa); return 1. - smoothstep(h, h + aa*1.2, d); }"
  ].join("\n") + "\n";

  /* ===================================================================================================================
     style-wireframe  (Solar Observatory)
     A slowly turning wireframe armillary sphere, top right: a latitude-longitude planet, a tilted ecliptic band with
     zodiac ticks, a fixed brass meridian ring with degree ticks, a thin orbit ring with a small moon, the polar axis,
     and a faint perspective floor grid running to the horizon. Everything is analytic (no geometry, no textures): the
     sphere is a ray-sphere hit, the rings are ray-plane hits, lines are anti-aliased with screen-space derivatives.
     Gold for the brass frame, pale blue for the planet grid; back hemisphere and far ring arcs are dimmed (depth).
     The pointer tilts the whole instrument a few degrees. Moment "scan": a bright latitude band sweeps over the planet.
     =================================================================================================================== */
  var WF = [
    "mat3 rX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }",
    "mat3 rY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }",
    "mat3 rZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }",
    // unit-spaced lines at integer x: sin() keeps it continuous across the atan seam; lines denser than ~3 px fade out (no moire at the limb)
    "float lineAA(float x, float k){",
    "  float s = sin(PI*x); float w = fwidth(s) + 1e-4;",
    "  return (1. - smoothstep(0., k*w, abs(s))) * (1. - smoothstep(.16, .38, fwidth(x)));",
    "}",
    // annulus of radius r0 and half-width hw in the plane through the origin with normal N, hit by the orthographic view ray
    // returns (band fill, edge lines, ticks); dz = depth of the hit (+1 near the viewer, -1 far side)
    "vec3 annulus(vec2 q, vec3 N, float r0, float hw, float ticks, float ph, out float dz){",
    "  float zt = -(N.x*q.x + N.y*q.y)/N.z;",
    "  vec3 h = vec3(q, zt); float r = length(h); dz = zt/max(r, 1e-3);",
    "  vec3 e1 = normalize(vec3(N.y, -N.x, 0.)); vec3 e2 = cross(N, e1);",
    "  float ang = atan(dot(h, e2), dot(h, e1)) + ph;",
    "  float aa = fwidth(r) + 1e-4; float d = abs(r - r0); float h0 = max(hw, .55*aa);",
    "  float band = 1. - smoothstep(h0, h0 + aa, d);",
    "  float edge = (1. - smoothstep(.45*aa, 1.3*aa, abs(d - hw))) * step(.0001, hw);",
    "  float tw = max(aa*ticks/(6.2831853*r0), .02);",
    "  float tk = (1. - smoothstep(0., tw, abs(fract(ang*ticks/6.2831853 + .5) - .5))) * (1. - smoothstep(hw*.55, hw + aa, d)) * step(.5, ticks);",
    "  return vec3(band, edge, tk);",
    "}",
    "float rd(float dz){ return mix(.22, 1., smoothstep(-.55, .55, dz)); }",
    "vec4 fx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt, 0., 1.3); float t = uTime;",
    "  vec3 gold = mix(uAcc, vec3(1., .8, .42), .4), blue = vec3(.56, .76, 1.);",
    "  float kk = .35 + .45*uScale;",
    "  vec3 c = vec3(0.);",
    "  float km = mK();",
    // ---- the instrument: top right, radius follows the aspect so it never crowds a phone's title
    "  float R = clamp(a*.2, .1, .16);",
    "  vec2 C = vec2(a*.5 - R*mix(1.6, 1.2, smoothstep(1., .6, a)) - .012, .5 - R*1.75 - .03);",
    "  vec2 q = (p - C)/R; float rq = length(q);",
    "  if (rq < 2.15) {",
    "    float tx = uPtr.y*.16, ty = uPtr.x*.2;",
    "    mat3 V = rX(.42 + tx) * rY(ty);",
    "    mat3 AX = V * rZ(.41);",
    "    mat3 M = AX * rY(t*.05 + 1.1);",
    "    float z2 = 1. - rq*rq; float zz = sqrt(max(z2, 0.));",
    "    float inside = clamp(z2/(fwidth(z2) + 1e-4), 0., 1.);",
    "    vec3 nf = normalize(vec3(q, zz)); vec3 nb = vec3(nf.xy, -nf.z);",
    "    vec3 lf = nf*M, lb = nb*M;",
    "    float lit = max(dot(nf, normalize(vec3(-.55, .55, .62))), 0.);",
    "    float depth = mix(.2, 1., pow(zz, .6));",
    "    float latF = asin(clamp(lf.y, -1., 1.)), lonF = atan(lf.x, lf.z);",
    "    float gF = max(lineAA(latF*3.8197, kk), lineAA(lonF*3.8197, kk)*(1. - smoothstep(.8, .96, abs(lf.y))));",
    "    float gB = 0.;",
    "    if (uQ > .5) { float latB = asin(clamp(lb.y, -1., 1.)), lonB = atan(lb.x, lb.z); gB = max(lineAA(latB*3.8197, kk), lineAA(lonB*3.8197, kk)*(1. - smoothstep(.8, .96, abs(lb.y)))); }",
    "    float scanB = 0.;",
    "    if (km >= 0.) { float sl = mix(-1.45, 1.45, km); scanB = exp(-pow((latF - sl)/.075, 2.))*sin(PI*km); }",
    "    c += blue*(gF*(.3 + .62*lit)*depth + gB*.15*depth)*inside;",
    "    c += blue*inside*(lit*.05 + .012);",
    "    c += gold*scanB*inside*(.55 + 1.2*gF);",
    "    float limb = 1. - smoothstep(0., 1.5*fwidth(rq) + 1e-4, abs(rq - 1.));",
    "    c += mix(blue, gold, .4)*limb*.5;",
    "    c += gold*exp(-max(rq - 1., 0.)*26.)*.05*step(1., rq);",
    "    float dz; vec3 an; float dp;",
    // equator (gold, on the surface)
    "    an = annulus(q, AX*vec3(0., 1., 0.), 1.004, .007, 0., 0., dz); dp = rd(dz);",
    "    c += gold*an.x*.75*dp;",
    // ecliptic band: a flat band just outside the sphere, tilted against the equator, with zodiac ticks
    "    an = annulus(q, V*rZ(.41 + .43)*vec3(0., 1., 0.), 1.2, .075, 36., t*.012, dz); dp = rd(dz);",
    "    c += gold*(an.x*.075 + an.y*.55 + an.z*.5)*dp*(1. + 1.2*scanB);",
    // fixed brass meridian ring with degree ticks
    "    an = annulus(q, V*rZ(.41)*vec3(cos(.3), 0., sin(.3)), 1.42, .02, 72., 0., dz); dp = rd(dz);",
    "    c += mix(gold, vec3(1.), .15)*(an.y*.5 + an.z*.42 + an.x*.06)*dp;",
    // orbit ring + moon
    "    vec3 No = normalize(vec3(.16, .86, .48));",
    "    an = annulus(q, No, 1.72, .004, 0., 0., dz); dp = rd(dz);",
    "    c += blue*an.x*.55*dp;",
    "    vec3 e1 = normalize(vec3(No.y, -No.x, 0.)); vec3 e2 = cross(No, e1);",
    "    float th = t*.11 + 1.3; vec3 mp = 1.72*(cos(th)*e1 + sin(th)*e2);",
    "    float md = length(q - mp.xy); float mdp = rd(mp.z/1.72);",
    "    c += mix(blue, gold, .5)*((1. - smoothstep(.0, 1.4*fwidth(md) + 1e-4, abs(md - .1)))*.8 + exp(-md*md*900.)*.9)*mdp;",
    // polar axis rod
    "    vec3 Ax = AX*vec3(0., 1., 0.);",
    "    float ad = seg(q, -1.62*Ax.xy, 1.62*Ax.xy)*R;",
    "    float dash = step(.35, fract(dot(q, Ax.xy)*5.5));",
    "    c += gold*cov(ad, .0009)*dash*.5*mix(.45, 1., smoothstep(-.4, .4, Ax.z));",
    "  }",
    // ---- perspective floor grid to the horizon
    "  float hY = -.18; float yy = hY - p.y;",
    "  if (yy > 0. && uQ > .5) {",
    "    float zf = .26/yy; float xf = p.x*zf*9.; float zs = zf*4. + t*.32;",
    "    float gl = max(lineAA(xf, kk*.8), lineAA(zs, kk*.8));",
    "    float fade = smoothstep(.004, .09, yy)*(1. - smoothstep(.2, .34, yy)*.6)*(.35 + .65*smoothstep(a*.7, -a*.25, p.x));",
    "    c += mix(blue, gold, .3)*gl*fade*.36;",
    "  }",
    "  float hl = exp(-pow((p.y - hY)/.0016, 2.));",
    "  c += gold*hl*.2*(.45 + .55*smoothstep(a*.8, -a*.25, p.x)) + gold*exp(-pow((p.y - hY + .012)/.06, 2.))*.014;",
    "  c *= I*1.2;",
    "  return fin(c, max(max(c.r, c.g), c.b)*.1);",
    "}"
  ].join("\n");

  FX.register("style-wireframe", {
    layer: "front", still: 20, tap: true, glsl: COMMON,
    moments: [{ name: "scan", every: [26, 60], dur: 7 }],
    passes: [{ frag: WF }]
  });

  /* ===================================================================================================================
     style-glass  (Hyperborean Vault)
     Glassmorphism's backdrop: five large, soft aurora colour fields (teal, green, violet, blue, magenta-violet) that
     drift on slow Lissajous paths and breathe, domain-warped so their edges are never geometric; two glass orbs with a
     lit rim and a caustic crescent; fine frost glints that twinkle only where the colour is. The frosted panels in
     styles/atmo/glacier.css (backdrop blur over page-level colour fields) pick this look up in the UI.
     Moments: "aurora-surge" (violet and magenta swell), "glint-sweep" (a diagonal specular sheen crosses the glass).
     =================================================================================================================== */
  var GLASS_LIB = [
    "const vec3 GC[5] = vec3[5](vec3(.10,.85,.80), vec3(.22,1.,.52), vec3(.58,.32,.98), vec3(.20,.52,1.), vec3(.84,.34,.95));",
    // x, y (x in units of the aspect), radius, stretch
    "const vec4 GB[5] = vec4[5](vec4(-.30,.32,.46,1.7), vec4(.30,.40,.40,1.5), vec4(.02,-.12,.50,1.4), vec4(-.38,-.30,.42,1.6), vec4(.40,-.26,.38,1.8));"
  ].join("\n") + "\n";
  var GLASS = [
    "vec3 orb(vec2 p, vec2 oc, float R){",
    "  vec2 f = p - oc; float r = length(f); vec2 n = f/max(r, 1e-4);",
    "  float rim = exp(-pow((r - R)/.0034, 2.));",
    "  float hl = pow(max(0., dot(n, normalize(vec2(-.6, .8)))), 9.)*exp(-pow((r - R*.93)/.018, 2.));",
    "  float cr = pow(max(0., dot(n, normalize(vec2(.6, -.8)))), 5.)*exp(-pow((r - R*.86)/.04, 2.));",
    "  float body = smoothstep(R, R*.15, r);",
    "  return vec3(.8, .97, 1.)*(rim*.3 + hl*.5) + vec3(.3, .9, .8)*cr*.22 + vec3(.3, .8, .9)*body*.05;",
    "}",
    "vec4 fx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt, 0., 1.3); float t = uTime;",
    "  float k = mK(); float surge = (k >= 0. && uMoment.w < .5) ? mEnv() : 0.;",
    "  float sweepK = (k >= 0. && uMoment.w > .5) ? k : -1.;",
    "  vec2 w = vec2(vn(p*1.05 + vec2(t*.02, 3.)), vn(p*1.05 + vec2(7., -t*.016))) - .5;",
    "  vec2 pw = p + w*.24;",
    "  vec3 c = vec3(0.); float cs = 0.;",
    "  for (int i = 0; i < 5; i++) {",
    "    float fi = float(i); vec4 b = GB[i];",
    "    vec2 ctr = vec2(b.x*a + .2*a*sin(t*(.07 + .013*fi) + fi*1.9), b.y + .13*cos(t*(.052 + .011*fi) + fi*2.7));",
    "    vec2 d = rot(fi*1.1 + t*(.016 + .004*fi))*(pw - ctr)*vec2(1., b.w);",
    "    float r = b.z*(.75 + .35*min(a, 1.6))*(1. + .1*sin(t*.2 + fi*2.3));",
    "    float f = exp(-dot(d, d)/(r*r*.55));",
    "    float wg = (.62 + .38*sin(t*.11 + fi*1.7))*(1. + surge*(mod(fi, 2.) < .5 ? 1.2 : .45));",
    "    c += GC[i]*f*wg; cs += f*wg;",
    "  }",
    "  vec3 o1 = orb(p, vec2(-.34*a + .05*sin(t*.06), .12 + .04*cos(t*.05)), min(.13, a*.26));",
    "  vec3 o2 = orb(p, vec2(.36*a + .04*sin(t*.05 + 3.), -.18 + .04*cos(t*.043 + 1.)), min(.075, a*.15));",
    "  c += o1 + o2;",
    // frost glints: only where the colour is
    "  vec2 g = fc/(uScale*10.); vec2 id = floor(g); vec2 f2 = fract(g) - .5; float r1 = h21(id);",
    "  vec2 q2 = f2 - (h22(id + 4.) - .5)*.4;",
    "  float tw = pow(max(0., .5 + .5*sin(t*(.5 + 1.6*h21(id + 3.)) + r1*60.)), 5.);",
    "  float star = (exp(-abs(q2.x)*18.)*exp(-abs(q2.y)*9.) + exp(-abs(q2.y)*18.)*exp(-abs(q2.x)*9.))*.7 + exp(-dot(q2, q2)*60.);",
    "  float sp = step(.955, r1)*tw*star*(.2 + 1.3*min(cs, 1.2));",
    "  c += vec3(.8, .97, 1.)*sp*.7;",
    "  if (sweepK >= 0.) {",
    "    float u = dot(p, normalize(vec2(1., .55))); float pos = mix(-a*.8 - .2, a*.8 + .2, sweepK);",
    "    float band = exp(-pow((u - pos)/.09, 2.))*sin(PI*sweepK);",
    "    c += vec3(.8, .97, 1.)*band*(.1 + .12*vn(p*30.)) + vec3(.8, .97, 1.)*sp*band*1.5;",
    "  }",
    "  c *= .94 + .12*h21(floor(fc/uScale));",
    "  c = (1. - exp(-c*1.15))*mix(.22, .3, smoothstep(.5, 1.5, a))*I;",
    "  return fin(c, max(max(c.r, c.g), c.b)*.12);",
    "}"
  ].join("\n");

  FX.register("style-glass", {
    layer: "front", still: 22, tap: true, glsl: COMMON + GLASS_LIB,
    front: { rate: 0.3, size: 0.12, alpha: 0.06, kind: 1, color: [0.6, 0.95, 1.0] },
    moments: [{ name: "aurora-surge", every: [30, 70], dur: 10 }, { name: "glint-sweep", every: [26, 60], dur: 3.8 }],
    passes: [{ frag: GLASS }]
  });

  /* ===================================================================================================================
     style-mesh  (Samadhi)
     A gradient mesh: six soft colour fields (saffron, rose, plum, indigo, gold, apricot-rose) blended as a weighted mean
     (so colours flow into each other, never add up to white), the whole mesh pushed through a slowly moving noise warp,
     a faint satin fold shading and film grain. The fields breathe (about 18 s) and orbit very slowly (minutes per turn).
     No edge anywhere. Moment "bloom": the gold field swells and warms the mesh.
     =================================================================================================================== */
  var MESH_LIB = [
    "const vec3 MC[6] = vec3[6](vec3(1.,.56,.14), vec3(1.,.30,.48), vec3(.62,.20,.66), vec3(.30,.32,.92), vec3(1.,.82,.34), vec3(1.,.50,.36));",
    // x (units of aspect), y, radius, orbit speed (rad/s)
    "const vec4 MB[6] = vec4[6](vec4(-.34,.28,.40,.016), vec4(.34,.16,.38,-.013), vec4(-.04,-.26,.42,.011), vec4(.38,-.32,.38,-.017), vec4(.08,.38,.26,.020), vec4(-.40,-.22,.34,-.012));"
  ].join("\n") + "\n";
  var MESH = [
    "vec4 fx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt, 0., 1.3); float t = uTime;",
    "  float env = mEnv();",
    "  vec2 wp = vec2(fbmQ(p*1.2 + vec2(t*.012, 0.), 3), fbmQ(p*1.2 + vec2(5., -t*.01), 3)) - .5;",
    "  vec2 pw = p + wp*.34;",
    "  vec3 acc = vec3(0.); float ws = 0., cs = 0.;",
    "  for (int i = 0; i < 6; i++) {",
    "    float fi = float(i); vec4 b = MB[i];",
    "    float ph = t*b.w + fi*1.7;",
    "    vec2 ctr = vec2(b.x*a, b.y) + vec2(cos(ph)*.14*a, sin(ph)*.09);",
    "    vec2 d = pw - ctr; float r = b.z*(.72 + .38*min(a, 1.6))*(1. + .14*sin(t*.35 + fi*1.9));",
    "    float q = dot(d, d)/(r*r); float boost = 1. + (i == 4 ? 2.2 : .35)*env;",
    "    float wg = exp(-q*3.2)*boost;                 // sharpened weights: each colour keeps its own region",
    "    acc += MC[i]*wg; ws += wg; cs += exp(-q)*boost;",
    "  }",
    "  vec3 col = acc/(ws + 1e-6);",
    "  float cv = 1. - exp(-cs*1.5);",
    "  float fold = .5 + .5*sin((pw.x*1.7 + pw.y*1.1)*3.2 + fbmQ(pw*1.6, 2)*6. + t*.03);",
    "  col *= .88 + .24*fold;",
    "  float gn = h21(floor(fc/max(1., uScale*.8)) + floor(t*8.)*(1. - uStatic)*17.3) - .5;",
    "  vec3 c = col*cv*mix(.17, .22, smoothstep(.5, 1.5, a))*I + vec3(max(gn, 0.))*.03*cv*I;",
    "  return fin(c, cv*.04*I + max(-gn, 0.)*.03*cv);",
    "}"
  ].join("\n");

  FX.register("style-mesh", {
    layer: "front", still: 30, glsl: COMMON + MESH_LIB,
    moments: [{ name: "bloom", every: [40, 90], dur: 14 }],
    passes: [{ frag: MESH }]
  });

  /* ===================================================================================================================
     style-deco  (Nocturne)
     Gold art-deco geometry, elegant and sparse: a sunburst fan of alternating long and short rays with concentric dotted
     arcs from each bottom corner, a stepped, nested ziggurat arch at the top centre, and a double-ruled proscenium frame
     with chamfered corners. Everything is drawn analytically in brass; a slow shimmer runs along the lines.
     Moment "brass-sweep": a diagonal band of brass light crosses the whole composition.
     =================================================================================================================== */
  var DECO = [
    "vec4 fx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt, 0., 1.3); float t = uTime;",
    "  vec3 brass = mix(uAcc, vec3(1., .82, .46), .35);",
    "  float px = 1./uRes.y; float u1 = cssPx(); float hw = .8*u1;",
    "  float k = mK(); float band = 0.;",
    "  if (k >= 0.) { float u = dot(p, normalize(vec2(1., .55))); float pos = mix(-a*.75 - .3, a*.75 + .3, k); band = exp(-pow((u - pos)/.11, 2.))*sin(PI*k); }",
    "  float sh = .66 + .34*sin(p.x*2.2 - p.y*1.3 + t*.35) + band*1.6;",
    // ---- sunburst fans from both bottom corners
    "  vec2 pm = vec2(abs(p.x), p.y); vec2 f = pm - vec2(a*.5, -.5);",
    "  float r = length(f); float th = atan(f.y, -f.x);",
    "  float Rf = min(.62, a*.62); float N = 12.; float cellA = PI*.5/N;",
    "  float u = th/cellA; float n = floor(u + .5);",
    "  float lr = Rf*(mod(n, 2.) < .5 ? 1. : .58);",
    "  float rd = abs(fract(u + .5) - .5)*cellA*r;",
    "  float ray = cov(rd, hw*.9)*smoothstep(lr, lr*.7, r)*smoothstep(.015, .05, r);",
    "  float wedge = mod(floor(u), 2.)*smoothstep(Rf, Rf*.15, r);",
    "  float arcs = 0.;",
    "  for (int i = 0; i < 4; i++) {",
    "    float ra = Rf*(.26 + .22*float(i)); float dots = (i == 1 || i == 3) ? step(.5, fract(u*2.)) : 1.;",
    "    arcs += cov(abs(r - ra), hw*(i == 3 ? 1.3 : .8))*dots;",
    "  }",
    "  float tip = exp(-(pow(r - lr, 2.) + rd*rd)/(.0055*.0055))*(.55 + .45*sin(t*1.1 + n*2.3));",
    // ---- stepped ziggurat arches, top centre
    "  float zk = mix(1., 1.35, smoothstep(.6, 1.5, a));",
    "  float v = .5 - p.y; float ax = abs(p.x); float sw = .028*zk*mix(1., 1.5, smoothstep(.6, 1.5, a)), sh2 = .018*zk;",
    "  float nn = floor(ax/sw); float xi = ax/sw - nn; float ch = 0.;",
    "  float ext = 1. - smoothstep(4., 5.4, ax/sw);",
    "  for (int j = 0; j < 4; j++) {",
    "    float Yk = (.05 + float(j)*.03)*zk; float ty = Yk + nn*sh2;",
    "    float tread = cov(abs(v - ty), hw*.9);",
    "    float riser = cov(xi*sw, hw*.9)*step(Yk + (nn - 1.)*sh2 - px, v)*step(v, Yk + nn*sh2 + px)*step(1., nn);",
    "    ch += (tread + riser)*ext;",
    "  }",
    // ---- double-ruled proscenium frame, chamfered corners
    "  vec2 dq = abs(p) - vec2(a*.5, .5);",
    "  float sd = max(max(dq.x, dq.y), (abs(p.x) + abs(p.y) - (a*.5 + .5 - .05))*.7071);",
    "  float fr = cov(abs(sd + 6.*u1), hw) + cov(abs(sd + 10.*u1), hw*.8);",
    "  float geo = ray*.9 + arcs*.75 + tip*.8 + ch*.8 + fr*.6;",
    "  vec3 c = brass*(geo*1.2*sh + wedge*.09*(.6 + .4*sh)) + brass*band*.04;",
    "  c *= I;",
    "  return fin(c, max(max(c.r, c.g), c.b)*.08);",
    "}"
  ].join("\n");

  FX.register("style-deco", {
    layer: "front", still: 9, glsl: COMMON,
    moments: [{ name: "brass-sweep", every: [24, 60], dur: 5.5 }],
    passes: [{ frag: DECO }]
  });

  /* ===================================================================================================================
     style-halftone  (Conservator, a light theme)
     Soft large shapes printed as an ink dot screen: a coin (lit from the upper left, solid rim, inner circle), a loupe with
     its handle and cast shadow, and a few paper folds. Three screens at 15, 45 and 75 degrees in oxblood, iron-gall ink and
     bronze, with a little misregistration between them (the screens drift a pixel or so; moment "misregister" lets them
     slip further and settle). Light themes (uLight = 1): ink is composited as normal alpha, so the effect only ever darkens
     the paper, at a very low opacity. On a dark theme the same dots are added as light instead.
     =================================================================================================================== */
  var HALF = [
    // one ink screen: rotated dot grid in canvas pixels, dot radius grows with the tone
    "float dots(vec2 fc, float ang, float T, vec2 off, float cell){",
    "  vec2 g = rot(ang)*(fc + off)/cell; vec2 id = floor(g); vec2 f = fract(g) - .5;",
    "  float rad = sqrt(clamp(T, 0., 1.))*.64*(.9 + .2*h21(id + ang));",
    "  float aa = 1.1/cell;",
    "  return smoothstep(rad + aa, rad - aa, length(f))*smoothstep(.012, .05, T);",
    "}",
    "vec4 fx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt, 0., 1.3); float t = uTime;",
    "  float cell = 7.5*uScale; float mis = mK() >= 0. ? mEnv() : 0.;",
    // coin
    "  float Rc = min(.24, a*.42); vec2 Cc = vec2(a*.5 - Rc*.9, .5 - Rc*1.1) + .01*vec2(sin(t*.04), cos(t*.05));",
    "  vec2 f1 = (p - Cc)/Rc; float rc = length(f1);",
    "  float inC = smoothstep(1., .985, rc); float rim = smoothstep(.8, .82, rc)*inC;",
    "  float lite = dot(f1, vec2(-.6, .75))*.5 + .5;",
    "  float body = mix(.85, .1, smoothstep(.05, .95, lite));",
    "  float inner = exp(-pow((rc - .66)/.02, 2.));",
    "  float Tc = inC*(body*(1. - rim) + rim*.95 + inner*.55);",
    // loupe
    "  float Rl = min(.19, a*.33); vec2 Cl = vec2(-a*.5 + Rl*1.35, -.12) + .008*vec2(cos(t*.045), sin(t*.038));",
    "  vec2 fl = (p - Cl)/Rl; float rl = length(fl);",
    "  float ringL = exp(-pow((rl - 1.)/.09, 2.));",
    "  vec2 hd = normalize(vec2(-.62, -.78)); float hs = dot(fl, hd); float hp = length(fl - hd*hs);",
    "  float handle = smoothstep(.1, .07, hp)*smoothstep(1., 1.15, hs)*smoothstep(2.35, 2.2, hs);",
    "  float shadow = smoothstep(1.3, 1.02, length(fl - vec2(.16, -.2)))*smoothstep(.98, 1.08, rl)*.18;",
    "  float Tl = ringL*.85 + handle*.9 + shadow;",
    // paper folds
    "  float uf = p.x*.78 + p.y*.62;",
    "  float fold = pow(.5 + .5*sin(uf*3.1 + vn(p*1.1)*2.4), 3.)*.16;",
    "  float crease = exp(-pow((p.x*.6 - p.y*.8 + .12 + .05*vn(p*2.))/.035, 2.))*.3;",
    "  float Tf = fold + crease;",
    "  float T1 = .9*Tc + .2*Tl, T2 = .45*Tc + Tl + Tf, T3 = .65*Tc + .35*Tf;",
    "  float mr = 1. + 5.*mis;",
    "  vec2 o1 = vec2(1.1, -.7)*uScale*mr + .6*uScale*vec2(sin(t*.07), cos(t*.06));",
    "  vec2 o3 = vec2(-.8, .9)*uScale*mr + .6*uScale*vec2(cos(t*.05 + 1.), sin(t*.08));",
    "  float c1 = dots(fc, .262, T1, o1, cell), c2 = dots(fc, .785, T2, vec2(0.), cell), c3 = dots(fc, 1.309, T3, o3, cell);",
    "  float A = .17*I;",
    "  vec3 ox = vec3(.48, .18, .18);",
    "  vec3 ink = (ox*c1 + uInk*c2 + uAcc*c3);",
    "  float al = min(c1 + c2 + c3, 1.);",
    "  return vec4(mix(uAcc*al*.5*A*2., ink*A, uLight), al*A*uLight);",
    "}"
  ].join("\n");

  FX.register("style-halftone", {
    layer: "front", still: 10, glsl: COMMON,
    moments: [{ name: "misregister", every: [28, 70], dur: 6 }],
    passes: [{ frag: HALF }]
  });
})();
