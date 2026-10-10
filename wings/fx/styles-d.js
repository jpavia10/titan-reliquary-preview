/* TitanFX style presets (notes/agents/styles-20.md, section 1): style-comic, style-blueprint, style-clay, style-bauhaus
   (Pulp Adventure, Drafting Room, Clay Diorama, Bauhaus). Loads after wings/fx/presets.js.
   All four are full-screen fragment passes (premultiplied: rgb*a with alpha a paints ink; alpha 0 adds light). Three of the four themes
   are light, so they paint ink at low alpha and never add light; the engine's text-safe mask attenuates every pass over text.
   Lettering (the comic burst, the blueprint dimension label) is drawn into the engine's per-layer canvas (def.canvas -> uTex). */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;

  /* shared GLSL: screen coords in units of screen height (centre 0, y up), AA from the pixel footprint, small SDF kit */
  var H = [
    "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }",
    "float asp(){ return uRes.x/uRes.y; }",
    "float px(){ return 1.5/uRes.y; }",
    "float aa(float d, float w){ return 1.-smoothstep(-w, w, d); }",
    "float line(float d, float w){ return 1.-smoothstep(w*.5, w*.5+px(), abs(d)); }",
    "mat2 r2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }",
    "float sdTri(vec2 p, float r){ const float k=1.7320508; p.x=abs(p.x)-r; p.y=p.y+r/k; if(p.x+k*p.y>0.) p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.; p.x-=clamp(p.x,-2.*r,0.); return -length(p)*sign(p.y); }",
    "float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
    "float ease(float x){ x=clamp(x,0.,1.); return x*x*(3.-2.*x); }",
    "float easeBack(float x){ x=clamp(x,0.,1.); float c=1.7; return 1.+(c+1.)*pow(x-1.,3.)+c*pow(x-1.,2.); }"
  ].join("\n") + "\n";
  var TEX = "uniform sampler2D uTex; uniform vec2 uTexRes;\n";

  /* =====================================================================================================================
     1. style-comic · Pulp Adventure (light). Ben-Day dot fields that breathe in soft blobs (red and blue screens at 45 and 15
        degrees), ink speed lines raking in from a corner, and the moment: a POW! / KAPOW! / WHAM! starburst that pops in near an
        edge, holds, and shrinks away. Ink on newsprint: alpha only, never light.
     ===================================================================================================================== */
  function comicCanvas(c, w, h) {
    if (c.__done) return false;
    var words = ["POW!", "KAPOW!", "WHAM!"], cw = w / 3;
    c.clearRect(0, 0, w, h);
    for (var i = 0; i < 3; i++) {
      var cx = cw * i + cw / 2, cy = h / 2, R = Math.min(cw, h) * 0.47, r = R * 0.62, n = 14;
      c.beginPath();
      for (var k = 0; k <= n * 2; k++) {
        var a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = (k % 2 ? r : R) * (0.92 + 0.08 * Math.sin(k * 7.3 + i));
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.78;
        if (k) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.closePath();
      c.fillStyle = "#ffd400"; c.fill();
      c.lineWidth = 6; c.strokeStyle = "#17120d"; c.lineJoin = "round"; c.stroke();
      var fs = Math.round(R * (words[i].length > 4 ? 0.42 : 0.56));
      c.font = "900 " + fs + "px Impact, 'Arial Black', sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.save(); c.translate(cx, cy); c.rotate(-0.12);
      c.lineWidth = Math.max(4, fs * 0.16); c.strokeStyle = "#17120d"; c.strokeText(words[i], 0, 0);
      c.fillStyle = "#c8102e"; c.fillText(words[i], 0, 0);
      c.restore();
    }
    c.__done = 1;
    return true;
  }
  FX.register("style-comic", {
    layer: "front", still: 7, gain: 1, safe: 0.97,
    canvas: { w: 768, h: 256, fps: 1, draw: comicCanvas },
    moments: [{ name: "pow", every: [22, 48], dur: 3.2 }],
    glsl: H + TEX + [
      "float bdots(vec2 p, float cell, float ang, float rad){ vec2 q = r2(ang)*p/cell; vec2 f = fract(q)-.5; return 1.-smoothstep(rad-.08, rad+.04, length(f)); }",
      "vec4 comic(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float t = uTime; float I = clamp(uInt,0.,1.3);",
      "  float b1 = smoothstep(.52,.78, fbmQ(p*1.6+vec2(t*.012, -t*.008), 3));",
      "  float b2 = smoothstep(.55,.8, fbmQ(p*1.4+vec2(9.-t*.01, 3.+t*.009), 3));",
      "  float cell = .0105 + .002*uQ;",
      "  float red = bdots(p, cell, .785, .18+.22*b1)*b1;",
      "  float blu = bdots(p+.003, cell*1.15, .26, .16+.2*b2)*b2*(1.-red);",
      // speed lines from the top-right corner: thin radial streaks with gaps, fading toward the centre
      "  vec2 C = vec2(a*.5+.05, .55); vec2 d = p-C; float ang = atan(d.y, d.x), r = length(d);",
      "  float st = smoothstep(.86,.98, vn(vec2(ang*60., floor(t*.6)*3.1)))*smoothstep(.95,.35, r)*smoothstep(.12,.3,r);",
      "  vec3 ink = vec3(.09,.07,.05);",
      "  vec3 c = vec3(.70,.06,.12)*red*.16 + vec3(.12,.31,.66)*blu*.14 + ink*st*.10;",
      "  float al = red*.16 + blu*.14 + st*.10;",
      "  float k = mK();",
      "  if (k >= 0.) {",
      "    float cellI = mod(floor(uMoment.y*3.), 3.);",
      "    vec2 spots[3]; spots[0] = vec2(a*.5-.2, .26); spots[1] = vec2(-a*.5+.2, -.12); spots[2] = vec2(a*.5-.22, -.3);",
      "    vec2 S = spots[int(mod(floor(uMoment.y*7.), 3.))];",
      "    float s = easeBack(k/.18)*(1.-ease((k-.8)/.2));",
      "    vec2 q = (p-S)/max(.001, .19*s); q = r2(.08)*q;",
      "    if (abs(q.x) < 1. && abs(q.y) < .5) {",
      "      vec2 uv = vec2((cellI + (q.x*.5+.5))/3., .5 - q.y);",
      "      vec4 tx = texture(uTex, uv);",
      "      c = c*(1.-tx.a) + tx.rgb*tx.a*.92; al = al*(1.-tx.a) + tx.a*.92;",
      "    }",
      "  }",
      "  return vec4(c, al)*I*.9;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return comic(fc); }" }]
  });

  /* =====================================================================================================================
     2. style-blueprint · Drafting Room (dark prussian blue). A real coin from the collection drawn to scale like an engineering
        drawing: outer rim, dashed inner rim, reeding ticks, dash-dot centre lines, a dimension line with arrowheads and its label
        (from the collection records, e.g. "ITALY 50 LIRE · Ø 24.8 mm"), construction lines that draw themselves on, and a pair of
        meshing gears turning in the opposite corner. Every ~26 s (and at a moment) the sheet is redrawn with the next coin.
     ===================================================================================================================== */
  var BP = [["SWITZERLAND 1 FRANC", "Ø 23.2 mm"], ["GERMANY 1 MARK", "Ø 23.5 mm"], ["ITALY 50 LIRE", "Ø 24.8 mm"], ["FRANCE 1 FRANC", "Ø 24 mm"],
            ["NETHERLANDS 25 CENTS", "Ø 19 mm"], ["UNITED KINGDOM 2 PENCE", "Ø 25.9 mm"]];
  var BP_CYCLE = 26;
  function bpCanvas(c, w, h, t) {
    var i = ((Math.floor((t || 0) / BP_CYCLE) % BP.length) + BP.length) % BP.length;
    if (c.__i === i) return false;
    c.__i = i;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#ffd27a"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "600 " + Math.round(h * 0.34) + "px ui-monospace, Menlo, Consolas, monospace";
    c.fillText(BP[i][1], w / 2, h * 0.3);
    c.fillStyle = "#f3f8ff"; c.font = "600 " + Math.round(h * 0.2) + "px ui-monospace, Menlo, Consolas, monospace";
    c.fillText(BP[i][0], w / 2, h * 0.76);
    return true;
  }
  FX.register("style-blueprint", {
    layer: "front", still: 18, safe: 0.95,
    canvas: { w: 512, h: 96, fps: 1, draw: bpCanvas },
    moments: [{ name: "redraw", every: [40, 80], dur: 4 }],
    glsl: H + TEX + "#define CYC " + BP_CYCLE.toFixed(1) + "\n" + [
      "float gear(vec2 p, float R, float n, float a){ p = r2(a)*p; float ang = atan(p.y,p.x); float teeth = smoothstep(-.25,.25, cos(ang*n)); float r = R*(.9 + .1*teeth); return length(p)-r; }",
      "vec4 blueprint(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float t = uTime; float I = clamp(uInt,0.,1.3); float w = px();",
      "  float ph = mod(t, CYC)/CYC;",
      "  float reveal = ease(ph/.35), fade = 1.-ease((ph-.9)/.1);",
      "  float R = .2; vec2 C = vec2(a*.5 - max(.26, a*.18), .14);",
      "  if (a < .8) C = vec2(a*.12, .2);",
      "  vec2 q = p-C; float r = length(q); float th = atan(q.y,q.x); float u = fract(th/6.2831853+.25);",
      "  float L = 0.;",
      "  L += line(r-R, w*1.2)*step(u, reveal);",                                  // outer rim draws itself on
      "  float dash = step(.5, fract(th*34./6.2831853));",
      "  L += line(r-R*.86, w)*dash*.7*step(u, reveal*1.1-.05);",                 // dashed inner rim
      "  float tick = smoothstep(.55,.6, fract(th*90./6.2831853))*step(r, R)*step(R*.94, r);",
      "  L += tick*.8*step(.35, reveal);",                                        // reeding
      "  float dd = step(.5, fract((q.x+q.y)*18.));",
      "  L += line(q.y, w)*step(abs(q.x), R*1.25)*step(.5, fract(q.x*14.))*.55*step(.15, reveal);",   // centre lines (dash-dot)
      "  L += line(q.x, w)*step(abs(q.y), R*1.25)*step(.5, fract(q.y*14.))*.55*step(.15, reveal);",
      "  float dy = -R*1.38;",
      "  float dim = line(q.y-dy, w)*step(abs(q.x), R)*step(.5, reveal);",
      "  dim += line(abs(q.x)-R, w)*step(dy-.03, q.y)*step(q.y, dy+.03)*step(.5, reveal);",
      "  vec2 ah = vec2(abs(q.x), q.y-dy); float arr = step(ah.x, R)*step(R-.024, ah.x)*step(abs(ah.y), (ah.x-(R-.024))*.45);",
      "  dim += arr*step(.5, reveal);",
      "  L += dd*0.;",
      // construction arc + leader line
      "  L += line(r-R*1.18, w*.8)*step(.08, u)*step(u, .2)*step(.25, reveal)*.6;",
      "  L += line(sdSeg(q, vec2(R*.7, R*.7), vec2(R*1.25, R*1.05)), w)*step(.6, reveal)*.7;",
      // label under the dimension line (canvas)
      "  vec2 lb = (q - vec2(0., dy - .055))/vec2(.3, .056);",
      "  float lab = 0.; vec3 labc = vec3(0.);",
      "  if (abs(lb.x) < 1. && abs(lb.y) < 1. && reveal > .55) { vec4 tx = texture(uTex, vec2(lb.x*.5+.5, .5-lb.y*.5)); lab = tx.a; labc = tx.rgb; }",
      // gears in the opposite corner
      "  vec2 G = vec2(-a*.5 + .14, -.36); if (a < .8) G = vec2(-a*.5+.1, -.38);",
      "  float g1 = gear(p-G, .075, 12., t*.25), g2 = gear(p-G-vec2(.128,.04), .055, 9., -t*.25*12./9.+.2);",
      "  float gl = line(g1, w)*.8 + line(g2, w)*.8 + line(length(p-G)-.018, w)*.6 + line(length(p-G-vec2(.128,.04))-.014, w)*.6;",
      "  vec3 ink = vec3(.93,.96,1.), amber = vec3(1.,.82,.48);",
      "  float k = mK(); float flash = k >= 0. ? sin(3.14159*k)*.6 : 0.;",
      "  vec3 c = ink*(L*.42 + gl*.3) + amber*dim*.6 + labc*lab*.85;",
      "  c *= fade*(1.+flash);",
      // faint scan of the drafting arm across the sheet
      "  float arm = exp(-pow((p.x - (-a*.5 + fract(t*.02)*a))*40., 2.))*.04;",
      "  c += ink*arm;",
      "  return vec4(c*I*.8, 0.);",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return blueprint(fc); }" }]
  });

  /* =====================================================================================================================
     3. style-clay · Clay Diorama (light). A tiny clay diorama seen through an orthographic ISOMETRIC camera: a rounded tile floor
        with grid grooves, two coin stacks, a little vault with a round door, a pink sphere and a blue torus that bob, soft key
        light, sky fill, contact shadows and occlusion. Raymarched only inside its own box (lower right on wide screens, lower
        centre on phones); the moment drops a clay coin that squashes on landing.
     ===================================================================================================================== */
  FX.register("style-clay", {
    layer: "front", still: 6, safe: 0.97,
    moments: [{ name: "drop", every: [24, 50], dur: 2.6 }],
    glsl: H + [
      "float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }",
      "float sdCyl(vec3 p, float r, float h, float e){ vec2 d = vec2(length(p.xz)-r+e, abs(p.y)-h+e); return min(max(d.x,d.y),0.)+length(max(d,0.))-e; }",
      "float sdTor(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }",
      "float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }",
      "float gT;",
      "vec2 mapS(vec3 p){",
      "  float t = gT; vec2 res = vec2(p.y+.0, 0.);",                                   // floor plane y=0
      "  float tile = sdRBox(p-vec3(0.,-.06,0.), vec3(1.05,.06,1.05), .05); res = vec2(tile, 0.);",
      "  float d;",
      "  d = sdCyl(p-vec3(-.45,.09,.35), .2, .09, .03); for (int i=1;i<3;i++){ d = min(d, sdCyl(p-vec3(-.45,.09+.18*float(i),.35), .2, .09, .03)); } if (d < res.x) res = vec2(d, 1.);",
      "  d = sdCyl(p-vec3(-.05,.09,.62), .17, .09, .03); d = min(d, sdCyl(p-vec3(-.05,.27,.62), .17, .09, .03)); if (d < res.x) res = vec2(d, 1.);",
      "  d = sdRBox(p-vec3(.42,.28,-.25), vec3(.32,.28,.26), .09); if (d < res.x) res = vec2(d, 2.);",
      "  d = sdCyl((p-vec3(.42,.3,.03)).xzy, .16, .03, .015); if (d < res.x) res = vec2(d, 3.);",
      "  d = length(p-vec3(-.4,.26+.05*sin(t*1.3),-.45))-.2; if (d < res.x) res = vec2(d, 4.);",
      "  vec3 tp = p-vec3(.15,.13+.04*sin(t*1.1+1.),.15); tp.xy = r2(.5+.2*sin(t*.7))*tp.xy; d = sdTor(tp, vec2(.15,.065)); if (d < res.x) res = vec2(d, 5.);",
      "  float k = uMoment.z > 0. ? uMoment.x/uMoment.z : -1.;",
      "  if (k >= 0.) {",
      "    float fall = clamp(k/.35,0.,1.); float y = mix(1.6, .07, fall*fall);",
      "    float sq = k > .35 ? exp(-(k-.35)*9.)*sin((k-.35)*30.)*.5 : 0.;",
      "    vec3 cp = p-vec3(.55,y,.55); cp.y /= (1.-.45*sq); cp.xz /= (1.+.25*sq);",
      "    d = sdCyl(cp, .18, .045, .02)*(1.-.45*abs(sq)); d *= (1.-.6*smoothstep(.85,1.,k)) + .6*smoothstep(.85,1.,k)*4.;",
      "    if (d < res.x) res = vec2(d, 6.);",
      "  }",
      "  return res;",
      "}",
      "vec3 nrm(vec3 p){ vec2 e = vec2(.002,0.); return normalize(vec3(mapS(p+e.xyy).x-mapS(p-e.xyy).x, mapS(p+e.yxy).x-mapS(p-e.yxy).x, mapS(p+e.yyx).x-mapS(p-e.yyx).x)); }",
      "float shad(vec3 ro, vec3 rd){ float s = 1., t = .02; for (int i=0;i<14;i++){ float h = mapS(ro+rd*t).x; s = min(s, 10.*h/t); t += clamp(h,.02,.2); if (s < .01 || t > 2.5) break; } return clamp(s,0.,1.); }",
      "float occ(vec3 p, vec3 n){ float o = 0., sc = 1.; for (int i=1;i<5;i++){ float h = .04*float(i); o += (h-mapS(p+n*h).x)*sc; sc *= .7; } return clamp(1.-2.*o,0.,1.); }",
      "vec3 matC(float m, vec3 p){",
      "  if (m < .5) { vec2 g = abs(fract(p.xz*2.5+.5)-.5); float groove = smoothstep(.0,.04, min(g.x,g.y)); return mix(vec3(.85,.74,.66), vec3(.96,.9,.84), groove); }",
      "  if (m < 1.5) return vec3(1.,.83,.42);",
      "  if (m < 2.5) return vec3(.72,.86,.78);",
      "  if (m < 3.5) return vec3(.67,.32,.17);",
      "  if (m < 4.5) return vec3(.96,.71,.76);",
      "  if (m < 5.5) return vec3(.66,.85,.92);",
      "  return vec3(1.,.8,.35);",
      "}",
      "vec4 clay(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); gT = uTime;",
      "  vec2 C = a > .9 ? vec2(a*.5-.36, -.2) : vec2(0., -.17); float S = a > .9 ? .3 : .24;",
      "  vec2 q = (p-C)/S; if (abs(q.x) > 1.25 || abs(q.y) > 1.15) return vec4(0.);",
      // orthographic isometric camera
      "  vec3 fw = normalize(vec3(-1.,-.82,-1.)), rt = normalize(cross(fw, vec3(0.,1.,0.))), up = cross(rt, fw);",
      "  vec3 ro = vec3(2.2,2.,2.2) + (rt*q.x + up*q.y)*1.05, rd = fw;",
      "  float t = 0., m = -1.; int N = uQ > 2.5 ? 64 : uQ > 1.5 ? 48 : uQ > .5 ? 36 : 26;",
      "  for (int i=0;i<64;i++){ if (i >= N) break; vec2 h = mapS(ro+rd*t); if (h.x < .0015) { m = h.y; break; } t += h.x; if (t > 6.) break; }",
      "  if (m < 0.) return vec4(0.);",
      "  vec3 pos = ro+rd*t, n = nrm(pos); vec3 L = normalize(vec3(-.4,.9,.35));",
      "  float dif = clamp(dot(n,L),0.,1.); float sh = uQ > .5 ? shad(pos+n*.004, L) : 1.; float ao = occ(pos, n);",
      "  float sky = .55+.45*n.y; float rim = pow(1.-clamp(dot(n,-rd),0.,1.), 3.);",
      "  vec3 base = matC(m, pos);",
      "  vec3 col = base*(.42*sky*ao + .7*dif*sh) + vec3(1.,.95,.9)*rim*.12 + vec3(1.)*pow(clamp(dot(reflect(-L,n),-rd),0.,1.),24.)*.15;",
      "  float edge = smoothstep(1.25,1.0, abs(q.x))*smoothstep(1.15,.9, abs(q.y));",
      "  float al = .78*edge*I;",
      "  return vec4(col*al, al);",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return clay(fc); }" }]
  });

  /* =====================================================================================================================
     4. style-bauhaus · Bauhaus (light). A poster assembling itself: a red circle, a blue square, a yellow triangle, black bars
        and a quarter circle slide between grid positions near the edges every few seconds (eased, with a small overshoot), flat
        primary colours with crisp edges, a faint construction grid. Runs with style-kinetic (the moving type) on top.
     ===================================================================================================================== */
  FX.register("style-bauhaus", {
    layer: "front", still: 3, safe: 0.97,
    moments: [{ name: "compose", every: [30, 60], dur: 3 }],
    glsl: H + [
      "vec2 slot(float id, float step, float a){",
      "  float hx = h11(id*13.1+step*7.7), hy = h11(id*5.3+step*3.1);",
      "  float side = h11(id*2.7+step) > .5 ? 1. : -1.;",
      "  float x = side*(a*.5 - .09 - hx*min(.24, a*.18));",
      "  float y = (hy-.5)*.86;",
      "  return vec2(x, y);",
      "}",
      "vec2 path(float id, float t, float a, float per){",
      "  float s = floor(t/per + id*.37), f = fract(t/per + id*.37);",
      "  float m = easeBack(clamp((f-.72)/.28, 0., 1.));",
      "  return mix(slot(id, s, a), slot(id, s+1., a), m);",
      "}",
      "vec4 bauhaus(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float t = uTime; float I = clamp(uInt,0.,1.3); float w = px();",
      "  float k = mK(); float per = k >= 0. ? 1.6 : 5.5;",
      "  vec3 red = vec3(.71,.14,.09), blue = vec3(.11,.31,.63), yel = vec3(.95,.76,.19), blk = vec3(.07);",
      "  vec3 c = vec3(0.); float al = 0.;",
      "  float d;",
      "  d = length(p - path(1., t, a, per)) - .11; float m1 = aa(d, w); c = mix(c, red, m1); al = max(al, m1*.26);",
      "  vec2 q = p - path(2., t+1.3, a, per); q = r2(.25*floor(t/per+2.)*1.5708)*q; d = sdBox(q, vec2(.085)); float m2 = aa(d, w); c = mix(c, blue, m2); al = max(al, m2*.24);",
      "  q = p - path(3., t+2.6, a, per); d = sdTri(q, .1); float m3 = aa(d, w); c = mix(c, yel, m3); al = max(al, m3*.32);",
      "  q = p - path(4., t+3.4, a, per); q = r2(.7854*floor(t/per+4.))*q; d = sdBox(q, vec2(.16, .016)); float m4 = aa(d, w); c = mix(c, blk, m4); al = max(al, m4*.22);",
      "  q = p - path(5., t+4.2, a, per); d = max(length(q)-.09, max(-q.x, -q.y)); float m5 = aa(d, w); c = mix(c, red, m5); al = max(al, m5*.2);",
      "  q = p - path(6., t+.6, a, per); d = abs(length(q)-.07)-.012; float m6 = aa(d, w); c = mix(c, blk, m6); al = max(al, m6*.22);",
      // construction grid, very faint
      "  vec2 g = abs(fract(p*6.)-.5); float grid = (1.-smoothstep(0., w*6., min(g.x,g.y)))*.035;",
      "  c = mix(c, blk, grid*(1.-step(.001, al))); al = max(al, grid);",
      "  return vec4(c*al, al)*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return bauhaus(fc); }" }]
  });
})();
