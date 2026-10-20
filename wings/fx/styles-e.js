/* TitanFX style presets, second batch (owner, 2026-10-20: "Make sure theres at least one theme for all of these and expand with more";
   the "20 insane Claude animation styles" video, styles the first batch did not have a theme for). One preset per new theme:
     style-y2k        Millennium Chrome (y2k): a liquid-chrome coin with chrome blobs that orbit and merge into it, a pastel studio
                      reflected in the metal, four-point sparkles and a retro grid floor
     style-papercut   Paper Hills (papercut): rolling hills cut from layered card with drop shadows, a paper sun, clouds and
                      hot-air balloons; moment: a balloon carries a gold paper coin up the page
     style-sketch     Sketchbook (sketch): pencil doodles (a star, a spiral, a light bulb, a coin, an arrow, a heart, loops) draw
                      themselves in the margins with a little pencil, are gone over once more, then erased; moment: a big
                      sketched coin, hatched in
     style-physics    Free Fall (freefall): a real 2D rigid-body simulation in JavaScript: coins rain from above, bounce, roll
                      and heap up in the corners, a tap knocks them about, and when the heap is full the floor opens and
                      they pour away; the coins' positions reach the shader through a tiny data texture (uTex) and are
                      drawn there as lit metal discs; moment: a jackpot of coins pours from the top
     style-guilloche  Treasury Note (banknote): engraved guilloche rosettes and border bands in banknote green, two crossing
                      families of wavy lines whose phases drift so the moiré shimmers; moment: a red treasury seal stamps in
     style-topo       Survey Map (contour): glowing contour lines of a slowly reshaping terrain, every fifth an index contour,
                      coloured by height, with a soft hillshade; moment: a survey ping rings out from a peak
     style-glass      Cathedral Glass (cathedral): a twelve-fold rose window and lancet windows of leaded Voronoi glass in
                      jewel colours, lit from behind by a slow-moving sun, casting coloured light shafts with dust in them;
                      moment: the sun comes out and the glass blazes
   Loads after wings/fx/presets.js. Premultiplied output (rgb*a); light themes paint with alpha only and never add light, and the
   engine's text-safe mask attenuates every pass over text (notes/agents/styles-20.md, section 3). */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;

  /* shared GLSL: screen coords in units of screen height (centre 0, y up), small SDF kit (as wings/fx/styles-d.js) */
  var H = [
    "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }",
    "float asp(){ return uRes.x/uRes.y; }",
    "float px(){ return 1.5/uRes.y; }",
    "mat2 r2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float ease(float x){ x=clamp(x,0.,1.); return x*x*(3.-2.*x); }",
    "float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }",
    "float sdCyl(vec3 p, float r, float h, float e){ vec2 d = vec2(length(p.xz)-r+e, abs(p.y)-h+e); return min(max(d.x,d.y),0.)+length(max(d,0.))-e; }",
    "float sdTor(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }",
    // a four-point sparkle: two thin crossed rays and a soft core, sz in screen-height units
    "float spark(vec2 d, float sz){ vec2 a = abs(d)/sz; float rays = exp(-a.x*28.)*exp(-a.y*2.6) + exp(-a.y*28.)*exp(-a.x*2.6); return rays*.8 + exp(-dot(a,a)*30.); }"
  ].join("\n") + "\n";

  /* =====================================================================================================================
     1. style-y2k · Millennium Chrome (light, pale lavender). A chrome coin turns slowly in the upper corner while three liquid-chrome
        blobs orbit it, stretch toward it and merge into its rim (smooth union), all reflecting a pastel studio: white sky, a pink
        horizon band, periwinkle floor and two softboxes, with a thin-film rainbow at grazing angles. Four-point sparkles twinkle across
        the page and a retro perspective grid scrolls along the floor. Moment "shine": a glint sweeps the chrome and the sparkles burst.
     ===================================================================================================================== */
  FX.register("style-y2k", {
    layer: "front", still: 4.2, safe: 0.97,
    moments: [{ name: "shine", every: [20, 44], dur: 2.4 }],
    glsl: H + [
      "float gT;",
      "vec3 orb(float i){ float a = gT*(.42+.09*i) + i*2.094; float r = .86 + .12*sin(gT*.7+i*1.7); return vec3(cos(a)*r, sin(a*1.3+i)*.42, sin(a)*r*.55); }",
      "float mapC(vec3 p){",
      "  vec3 c = p; c.xz = r2(gT*.55)*c.xz; c.yz = r2(.32)*c.yz;",                    // the coin turns about its vertical axis, tilted toward us
      "  vec3 cz = c.xzy;",
      "  float coin = sdCyl(cz, .56, .055, .025);",
      "  coin = min(coin, sdTor(cz-vec3(0., .052, 0.), vec2(.47, .028)));",               // raised rims on both faces
      "  coin = min(coin, sdTor(cz+vec3(0., .052, 0.), vec2(.47, .028)));",
      "  float b = 1e3;",
      "  for (int i=0;i<3;i++){ float fi = float(i); b = smin(b, length(p-orb(fi)) - (.15+.04*fi), .3); }",
      "  return smin(coin, b, .16);",
      "}",
      "vec3 nrmC(vec3 p){ vec2 e = vec2(.0025,0.); return normalize(vec3(mapC(p+e.xyy)-mapC(p-e.xyy), mapC(p+e.yxy)-mapC(p-e.yxy), mapC(p+e.yyx)-mapC(p-e.yyx))); }",
      "vec3 envY(vec3 r){",
      "  float y = r.y;",
      "  vec3 sky = mix(vec3(.78,.76,.98), vec3(1.), smoothstep(.02,.62,y));",
      "  vec3 flo = mix(vec3(.50,.58,.98), vec3(.88,.84,1.), smoothstep(-.12,-.9,y));",   // the floor brightens away from the horizon
      "  vec3 c = y > 0. ? sky : flo;",
      "  c += vec3(1.,.50,.82)*exp(-sq((y-.11)/.06))*.55;",                              // pink band just above the horizon
      "  c = mix(c, vec3(.10,.11,.30), exp(-sq(y/.055))*.92);",                          // the dark horizon line that makes chrome read as chrome
      "  c += vec3(1.)*smoothstep(.88,.97, dot(r, normalize(vec3(-.55,.62,.56))))*1.1;", // key softbox
      "  c += vec3(.72,.94,1.)*smoothstep(.92,.99, dot(r, normalize(vec3(.75,.15,.64))))*.7;",
      "  return c;",
      "}",
      "vec4 chrome(vec2 p, float a, float I){",
      "  vec2 C = a > .9 ? vec2(a*.5-.24, .1) : vec2(a*.5-.05, .34); float S = a > .9 ? .21 : .15;",
      "  vec2 q = (p-C)/S; if (abs(q.x) > 1.55 || abs(q.y) > 1.3) return vec4(0.);",
      "  vec3 ro = vec3(0.,0.,3.4), rd = normalize(vec3(q*.62, -1.85));",
      "  float t = 1.6, hit = 0.; int N = uQ > 2.5 ? 72 : uQ > 1.5 ? 56 : uQ > .5 ? 42 : 30;",
      "  for (int i=0;i<72;i++){ if (i >= N) break; float h = mapC(ro+rd*t); if (h < .0015) { hit = 1.; break; } t += h; if (t > 5.4) break; }",
      "  if (hit < .5) return vec4(0.);",
      "  vec3 pos = ro+rd*t, n = nrmC(pos), r = reflect(rd, n);",
      "  float fres = pow(1.-clamp(dot(n,-rd),0.,1.), 3.);",
      "  vec3 col = envY(r)*(.82+.18*fres);",
      "  col += hsv(fres*.7 + n.y*.15 + uTime*.015, .38, 1.)*fres*.32;",              // thin-film rainbow at grazing angles
      "  float k = mK();",
      "  if (k >= 0.) { float band = exp(-sq((q.x+q.y*.6) - (k*5.-2.5))*5.); col += vec3(1.)*band*.7; }",
      "  col = min(col, vec3(1.));",
      "  float edge = smoothstep(1.55,1.25, abs(q.x))*smoothstep(1.3,1.05, abs(q.y));",
      "  float al = .9*edge*I;",
      "  return vec4(col*al, al);",
      "}",
      "vec4 sparks(vec2 p, float a, float I){",
      "  float k = mK(), burst = k >= 0. ? exp(-sq((k-.25)*5.)) : 0.;",
      "  vec2 g = p*vec2(5.2, 5.2); vec2 id = floor(g); vec4 acc = vec4(0.);",
      "  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){",
      "    vec2 c = id+vec2(float(i),float(j)); float rnd = h21(c);",
      "    if (rnd > .34 + .3*burst) continue;",
      "    vec2 o = h22(c*1.7+3.1); vec2 sp = (c+o)/5.2;",
      "    float ph = h21(c+9.3)*6.283, sp2 = .55+h21(c+4.4)*1.1;",
      "    float tw = pow(max(0., sin(uTime*sp2+ph)), 6.); tw = max(tw, burst*(.4+.6*h21(c+2.)));",
      "    float sz = .016 + .02*h21(c+7.7);",
      "    float s = spark(p-sp, sz)*tw;",
      "    vec3 sc = mix(vec3(.43,.25,.82), vec3(.85,.24,.62), h21(c+1.3));",
      "    acc += vec4(sc*s, s);",
      "  }",
      "  acc = min(acc, vec4(1.)); return acc*.42*I;",
      "}",
      "vec4 grid(vec2 p, float a, float I){",
      "  float yh = -.16; if (p.y > yh) return vec4(0.);",
      "  float z = .11/(yh-p.y+.0005); float x = p.x*z;",
      "  vec2 g = vec2(x*1.8, z*1.1 - uTime*.18);",
      "  vec2 w = fwidth(g)*1.2; vec2 f = abs(fract(g)-.5);",
      "  float lx = 1.-smoothstep(0., w.x, .5-f.x), ly = 1.-smoothstep(0., w.y, .5-f.y);",
      "  float L = max(lx, ly) * smoothstep(0., .05, yh-p.y) * smoothstep(9., 1.5, z);",
      "  vec3 gc = mix(vec3(.43,.31,.85), vec3(.84,.30,.66), smoothstep(-.5, yh, p.y));",
      "  float al = L*.13*I;",
      "  return vec4(gc*al, al);",
      "}",
      "vec4 y2k(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); gT = uTime;",
      "  vec4 gr = grid(p, a, I), sk = sparks(p, a, I), ch = chrome(p, a, I);",
      "  vec4 c = gr; c = sk + c*(1.-sk.a); c = ch + c*(1.-ch.a);",
      "  return c;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return y2k(fc); }" }]
  });
  /* =====================================================================================================================
     2. style-papercut · Paper Hills (light, cream card). Four layers of rolling hills cut from coloured card along the bottom, each
        casting a soft shadow on the layer behind and drifting at its own depth with the pointer; a paper sun with cut rays, clouds
        made of overlapping discs, two striped hot-air balloons rising slowly, and paper fibre over everything. Moment "lift": a
        third balloon floats up carrying a gold paper coin.
     ===================================================================================================================== */
  FX.register("style-papercut", {
    layer: "front", still: 9, safe: 0.97,
    moments: [{ name: "lift", every: [26, 52], dur: 9 }],
    glsl: H + [
      "float fib(vec2 p){ return vn(p*420.)*.6 + vn(p*130.+3.)*.4; }",                  // paper fibre
      "float hill(float x, float i){ float t = uTime*.004*(1.+i); x += t + uPar.x*(.6+i*.9);",
      "  return -.5 + .19 - .043*i + .035*sin(x*(2.4+i*.7)+i*1.9) + .02*sin(x*(5.1+i)+i*4.1) + .012*sin(x*11.3+i*7.); }",
      "vec3 hillC(float i){ return i < .5 ? vec3(.64,.78,.66) : i < 1.5 ? vec3(.44,.66,.50) : i < 2.5 ? vec3(.29,.52,.38) : vec3(.86,.68,.36); }",
      "float disc(vec2 p, vec2 c, float r){ return length(p-c)-r; }",
      "float cloud(vec2 p, vec2 c, float s){ float d = disc(p, c, .05*s); d = min(d, disc(p, c+vec2(.055,.012)*s, .04*s)); d = min(d, disc(p, c+vec2(-.05,.004)*s, .035*s)); d = min(d, max(p.y-(c.y-.012*s), abs(p.x-c.x)-.085*s)); return d; }",
      "float balloon(vec2 p, vec2 c, float s, out float stripe, out float basket){",
      "  vec2 q = (p-c)/s; float body = length(q*vec2(1.,.92)-vec2(0.,.02))-.05; float neck = max(abs(q.x)-.018+q.y*.4, abs(q.y+.055)-.02);",
      "  stripe = step(.5, fract(atan(q.x, .06)*2.2)); float bk = max(abs(q.x)-.013, abs(q.y+.1)-.009); basket = step(bk, 0.);",
      "  float rope = max(abs(abs(q.x)-.011)-.0012, abs(q.y+.082)-.015);",
      "  return min(min(body, neck), min(bk, rope))*s; }",
      "vec4 over(vec4 top, vec4 under){ return top + under*(1.-top.a); }",
      "vec4 card(float d, vec3 c, float shadowFrom, float al, vec2 p){",               // a paper piece: fill inside, a soft shadow just outside below-right
      "  float px1 = 1.2/uRes.y; float inside = 1.-smoothstep(-px1, px1, d);",
      "  float f = fib(p); vec3 cc = c*(.95+.08*f);",
      "  float sh = (1.-inside)*exp(-max(shadowFrom,0.)/.012)*.22;",
      "  return vec4(cc*inside*al, inside*al) + vec4(vec3(.12,.10,.08)*sh*(1.-inside), sh*(1.-inside));",
      "}",
      "vec4 papercut(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); vec4 col = vec4(0.);",
      // sun with cut rays, upper right
      "  vec2 sc = vec2(a*.5-.16, .33); float sd = disc(p, sc, .055);",
      "  float ang = atan(p.y-sc.y, p.x-sc.x), rr = length(p-sc); float rays = rr - (.075 + .018*step(.5, fract(ang*12./6.2832 + uTime*.01)));",
      "  vec4 sun = card(min(sd, max(rays, .052-rr)), vec3(.98,.76,.32), disc(p+vec2(-.006,.008), sc, .058), .75, p);",
      "  col = over(sun, col);",
      // clouds drifting
      "  for (int i=0;i<3;i++){ float fi = float(i); float x = mod(uTime*.008*(1.+fi*.4) + fi*.9, a+.4) - a*.5 - .2; vec2 c = vec2(x, .2 + .09*fi - .02*sin(fi*3.)); float s = .9+.35*h11(fi);",
      "    vec4 cl = card(cloud(p, c, s), vec3(1.,.99,.97), cloud(p+vec2(-.006,.009), c, s), .7, p); col = over(cl, col); }",
      // balloons rising (two always, a third with a coin at the moment)
      "  float k = mK();",
      "  for (int i=0;i<3;i++){ float fi = float(i);",
      "    float cyc = 38.+fi*11.; float ph = fract(uTime/cyc + fi*.37); vec2 c = vec2((fi-.9)*a*.32 + .05*sin(uTime*.05+fi*2.), -.42 + ph*1.05);",
      "    float vis = smoothstep(0.,.08,ph)*(1.-smoothstep(.85,1.,ph));",
      "    if (i == 2) { if (k < 0.) continue; c = vec2(a*.12, -.45 + k*1.0); vis = smoothstep(0.,.08,k)*(1.-smoothstep(.85,1.,k)); }",
      "    float st, bk; float d = balloon(p, c, .9+.25*fi*.5, st, bk);",
      "    vec3 bc = mix(i == 0 ? vec3(.86,.36,.30) : i == 1 ? vec3(.30,.52,.80) : vec3(.92,.70,.22), vec3(1.,.97,.9), st*.85); bc = mix(bc, vec3(.55,.37,.22), bk);",
      "    float sd2 = balloon(p+vec2(-.005,.008), c, .9+.25*fi*.5, st, bk);",
      "    vec4 b = card(d, bc, sd2, .78*vis, p); col = over(b, col);",
      "    if (i == 2) { vec2 cc = c + vec2(0., -.13); float cd = disc(p, cc, .024); vec4 coin = card(cd, vec3(.86,.66,.22), disc(p+vec2(-.004,.006), cc, .025), .9*vis, p);",
      "      float rim = abs(length(p-cc)-.018) < .0018 ? 1. : 0.; coin.rgb *= 1.-.3*rim; col = over(coin, col); }",
      "  }",
      // hills, back to front; each casts its shadow on the layers behind it
      "  for (int i=0;i<4;i++){ float fi = float(i); float h = hill(p.x, fi); float d = p.y - h;",
      "    float hs = hill(p.x - .006, fi); float sdist = p.y - hs - .008;",
      "    vec4 hl = card(d, hillC(fi), sdist, .72 - .04*fi, p); col = over(hl, col); }",
      "  return col*I*.95;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return papercut(fc); }" }]
  });
  /* =====================================================================================================================
     3. style-sketch · Sketchbook (light, drawing paper). Five margin slots each draw a doodle in one pencil line (star, spiral, light
        bulb, coin, swoosh arrow, heart, loop-de-loops), a small pencil riding the tip; a sketcher's second, lighter pass follows,
        the drawing holds, then smudges as it is erased and a new one starts somewhere else. Graphite mostly, now and then blue or
        red pencil, with pixel-scale grain. Moment "doodle": a big coin is sketched in the upper corner and hatched in.
     ===================================================================================================================== */
  FX.register("style-sketch", {
    layer: "front", still: 5.2, safe: 0.97,
    moments: [{ name: "doodle", every: [24, 48], dur: 8 }],
    glsl: H + [
      "float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-8),0.,1.); return length(pa-ba*h); }",
      "vec4 over(vec4 top, vec4 under){ return top + under*(1.-top.a); }",
      // doodle k, point i, in a unit box: xy, z = 1 pen down on the way to this point, 0 a pen lift
      "int dN(int k){ return k==0 ? 11 : k==1 ? 33 : k==2 ? 33 : k==3 ? 41 : k==4 ? 19 : k==5 ? 25 : 41; }",
      "const vec3 BULB[13] = vec3[13](vec3(-.26,-.78,1.), vec3(.26,-.78,1.), vec3(.356,-.508,1.), vec3(-.26,-.88,0.), vec3(.26,-.88,1.),",
      "  vec3(-.18,-.98,0.), vec3(.18,-.98,1.), vec3(0.,.78,0.), vec3(0.,1.,1.), vec3(.64,.45,0.), vec3(.82,.57,1.), vec3(-.64,.45,0.), vec3(-.82,.57,1.));",
      "vec3 dP(int k, int i){",
      "  float fi = float(i);",
      "  if (k==0){ float an = 1.5708 + fi*.62832; float r = mod(fi,2.) < .5 ? 1. : .42; return vec3(r*cos(an), r*sin(an), 1.); }",
      "  if (k==1){ float s = fi/32.; float an = s*14.; float r = .1+.9*s; return vec3(r*cos(an), r*sin(an), 1.); }",
      "  if (k==2){ if (i < 20){ float an = -.96 + fi/19.*5.06; return vec3(.62*cos(an), .62*sin(an), 1.); } return BULB[i-20]; }",
      "  if (k==3){ if (i < 21){ float an = .3 + fi/20.*6.6; return vec3(cos(an), sin(an), 1.); }",
      "    if (i < 38){ float an = 1. + (fi-21.)/16.*6.2832; return vec3(.72*cos(an), .72*sin(an), i==21 ? 0. : 1.); }",
      "    return i==38 ? vec3(-.12,.22,0.) : i==39 ? vec3(.04,.36,1.) : vec3(.04,-.34,1.); }",
      "  if (k==4){ if (i < 16){ float s = fi/15.; return vec3(-1.+2.*s, .35*sin(s*3.6-.4), 1.); }",
      "    vec2 tip = vec2(1., .35*sin(3.2)); vec2 dir = normalize(vec2(2., 1.26*cos(3.2)));",
      "    return i==16 ? vec3(tip - r2(.5)*dir*.32, 0.) : i==17 ? vec3(tip, 1.) : vec3(tip - r2(-.5)*dir*.32, 1.); }",
      "  if (k==5){ float s = fi/24.*6.2832; float x = 16.*pow(sin(s),3.), y = 13.*cos(s)-5.*cos(2.*s)-2.*cos(3.*s)-cos(4.*s); return vec3(x/17., y/17.+.1, 1.); }",
      "  float s = fi/40.; return vec3(-1.+2.*s-.25*sin(s*25.), -.05+.3*cos(s*25.), 1.);",
      "}",
      "vec2 wob(float seed, float fi, float w){ return w*(vec2(h11(seed+fi*1.37), h11(seed+fi*2.11+.3))-.5); }",
      // distance (unit-box units) to the part of the line drawn so far; prog 0..1 along the points
      "float doodle(vec2 q, int k, float prog, float seed, float w){",
      "  int M = dN(k); float d = 1e3; vec3 a = dP(k,0); a.xy += wob(seed, 0., w);",
      "  float n = prog*float(M-1);",
      "  for (int i=1;i<41;i++){ if (i >= M) break; float fi = float(i); if (fi-1. >= n) break;",
      "    vec3 b = dP(k,i); b.xy += wob(seed, fi, w);",
      "    if (b.z > .5){ vec2 e = mix(a.xy, b.xy, clamp(n-(fi-1.),0.,1.)); d = min(d, sdSeg(q, a.xy, e)); }",
      "    a = b; }",
      "  return d;",
      "}",
      "vec2 tipAt(int k, float prog, float seed, float w){",
      "  int M = dN(k); float n = prog*float(M-1); int i0 = int(floor(n)); int i1 = min(i0+1, M-1);",
      "  vec2 a = dP(k,i0).xy + wob(seed, float(i0), w), b = dP(k,i1).xy + wob(seed, float(i1), w); return mix(a, b, fract(n));",
      "}",
      // a little yellow pencil whose point is at t, leaning up and to the right
      "vec4 pencil(vec2 p, vec2 t, float al){",
      "  vec2 u = normalize(vec2(.5,.86)), v = vec2(-u.y,u.x); vec2 d = p-t; float x = dot(d,u), y = dot(d,v);",
      "  float L = .075, Wd = .0058; if (x < 0. || x > L) return vec4(0.);",
      "  float cone = .016; float hw = x < cone ? Wd*x/cone : Wd; if (abs(y) > hw + .6/uRes.y) return vec4(0.);",
      "  float e = 1.-smoothstep(hw-.6/uRes.y, hw+.6/uRes.y, abs(y));",
      "  vec3 c = x < .0045 ? vec3(.18,.18,.2) : x < cone ? vec3(.89,.76,.58) : x < L-.012 ? mix(vec3(.96,.76,.18), vec3(.80,.58,.10), step(.0019, abs(y))*step(abs(y), .0036)) : x < L-.008 ? vec3(.70,.71,.74) : vec3(.93,.55,.60);",
      "  return vec4(c*e*al, e*al);",
      "}",
      "vec3 inkC(float h){ return h < .2 ? vec3(.16,.31,.66) : h < .3 ? vec3(.74,.24,.19) : vec3(.17,.18,.21); }",
      "vec4 sketch(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); vec4 col = vec4(0.);",
      "  float pxs = 1./uRes.y; float grain = .5 + .5*vn(fc*.8);",
      "  float km = mK();",
      "  for (int j=0;j<6;j++){ float fj = float(j);",
      "    int k; vec2 c; float sz, ph, sd, prog, al;",
      "    if (j < 5){",
      "      float T = 15. + 2.5*fj; float ct = (uTime + fj*4.7)/T; float cyc = floor(ct); ph = fract(ct);",
      "      sd = h11(cyc*13.17 + fj*71.3); k = int(floor(h11(sd*91.7)*6.99));",
      "      float side = mod(fj,2.) < .5 ? -1. : 1.; sz = .05 + .028*h11(sd+2.3);",
      "      c = vec2(side*(a*.5 - .03 - sz - .06*h11(sd+4.1)), mix(-.39,.39,(fj+.5)/5.) + .05*(h11(sd+6.)-.5));",
      "      prog = ease(ph/.34); al = 1.-smoothstep(.8,.92,ph);",
      "    } else {",
      "      if (km < 0.) continue; k = 3; sd = .37; ph = km*.92; sz = a < .8 ? .085 : .12;",
      "      c = vec2(a*.5 - sz - (a < .8 ? .04 : .1), .27); prog = ease(km/.4); al = 1.-smoothstep(.84,.97,km);",
      "    }",
      "    if (al <= 0. || length(p-c) > sz*1.3 + .085) continue;                           // nothing of this doodle (or its pencil) reaches the pixel",
      "    vec2 q = r2((h11(sd+8.)-.5)*.6)*(p-c)/sz;",
      "    float smear = 1. + 2.2*smoothstep(.8,.92,ph);",                                // the line widens and greys as it is rubbed out
      "    float w = 1.25*pxs*smear*(j==5 ? 1.35 : 1.);",
      "    float d1 = doodle(q, k, prog, sd*17., .07)*sz;",
      "    float d2 = doodle(q, k, clamp(prog*1.1-.1,0.,1.), sd*29.+3., .11)*sz;",      // a second, lighter pass a little behind the first
      "    float ink = (1.-smoothstep(w*.35, w*1.1, d1)) + .5*(1.-smoothstep(w*.3, w, d2));",
      "    if (k == 3 && j == 5){",                                                      // hatching on the lower right of the big coin
      "      float hr = clamp((km-.38)/.3,0.,1.); float r = length(q);",
      "      float side = dot(q, vec2(.707,-.707)); float hl = abs(fract((q.x+q.y)*5.)-.5)*2.;",
      "      float on = step(r, .93)*step(.72, r)*smoothstep(-.2,.2,side) + step(r,.66)*smoothstep(.1,.5,side);",
      "      float rev = step((q.x - q.y + 1.5)/3., hr);",
      "      ink += .55*on*rev*(1.-smoothstep(.12, .12 + 1.5*w/sz, hl));",
      "    }",
      "    vec3 ic = j == 5 ? vec3(.17,.18,.21) : inkC(h11(sd+9.));",
      "    float A = clamp(ink,0.,1.)*grain*al*.82/ (smear*.7+.3);",
      "    col = over(vec4(ic*A, A), col);",
      "    if (prog < 1. && al > 0.) {",                                                    // the pencil rides the tip while drawing
      "      vec2 tp = c + transpose(r2((h11(sd+8.)-.5)*.6))*tipAt(k, prog, sd*17., .07)*sz;",
      "      col = over(pencil(p, tp, .9*smoothstep(0.,.05,ph)*(1.-smoothstep(.9,1.,prog))), col);",
      "    }",
      "  }",
      "  return col*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return sketch(fc); }" }]
  });
  /* =====================================================================================================================
     4. style-physics · Free Fall (dark). The only preset with real physics: a small impulse solver (discs with mass, spin,
        restitution and friction against each other, the walls and the floor, 6 sub-steps) runs in the canvas hook at 30 fps.
        Coins spawn above the screen near the side margins, bounce, roll and heap up; a tap anywhere knocks nearby coins away;
        when the heap is full it holds, then the floor opens and the coins pour away, and the rain starts again. Positions are
        packed into a 64x4 RGBA data texture (16-bit x and y, angle, radius, metal, impact glint) read with texelFetch, so the
        coins are drawn at full screen resolution as lit, reeded metal discs with a star device that turns as they roll.
        Moment "jackpot": a dozen coins pour from the top centre. Reduced motion: one frame of a settled heap (pre-simulated).
     ===================================================================================================================== */
  var PHY = { cs: [], last: -1, A: 1.6, open: 0, hold: 0, spawnT: 0, seed: 7, kick: null, burst: 0, seen: -1e9, cap: 30, floor: 0, floorT: -9 };
  function phyRnd() { PHY.seed = (PHY.seed * 16807) % 2147483647; return (PHY.seed - 1) / 2147483646; }
  function phyCoin(x, y, vx, vy) {
    var r = (0.026 + 0.02 * phyRnd()) * (PHY.A < 0.8 ? 0.72 : 1), k = phyRnd();                // smaller coins on a narrow phone screen
    PHY.cs.push({ x: x, y: y, vx: vx, vy: vy, a: phyRnd() * 6.28, w: (phyRnd() - 0.5) * 6, r: r, m: r * r, k: k < 0.45 ? 0 : k < 0.8 ? 1 : 2, hit: 0 });
  }
  function phySpawn() {
    var A = PHY.A, side = phyRnd() < 0.5, mx = Math.min(0.3 * A, 0.34);
    phyCoin(side ? 0.04 + phyRnd() * mx : A - 0.04 - phyRnd() * mx, 1.08 + phyRnd() * 0.1, (phyRnd() - 0.5) * 0.5, -0.2 - phyRnd() * 0.4);
  }
  function phyStep(dt) {
    var cs = PHY.cs, A = PHY.A, n = cs.length, SUB = 6, h = dt / SUB, G = 2.6, i, j, s, c, d;
    for (s = 0; s < SUB; s++) {
      for (i = 0; i < n; i++) {
        c = cs[i]; c.vy -= G * h; c.vx *= 1 - 0.15 * h; c.w *= 1 - 0.4 * h;
        c.x += c.vx * h; c.y += c.vy * h; c.a += c.w * h;
        if (c.x < c.r) { c.x = c.r; if (c.vx < 0) c.vx = -c.vx * 0.35; }
        if (c.x > A - c.r) { c.x = A - c.r; if (c.vx > 0) c.vx = -c.vx * 0.35; }
        if (!PHY.open && c.y < c.r + PHY.floor) {
          c.y = c.r + PHY.floor;
          if (c.vy < 0) {
            var jn = -c.vy * c.m * 1.32; if (-c.vy > 0.35) c.hit = Math.max(c.hit, Math.min(1, -c.vy * 0.8));
            c.vy = -c.vy * 0.32; if (c.vy < 0.04) c.vy = 0;
            var vc = c.vx + c.w * c.r, jt = -vc / (3 / c.m), lim = 0.5 * jn;                // floor friction turns sliding into rolling
            jt = Math.max(-lim, Math.min(lim, jt)); c.vx += jt / c.m; c.w += 2 * jt / (c.m * c.r);
          }
          c.vx *= 1 - 1.2 * h; c.w *= 1 - 1.2 * h;                                          // rolling resistance
        }
      }
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        var a = cs[i], b = cs[j], dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        d = Math.sqrt(dx * dx + dy * dy); if (d >= rr || d < 1e-6) continue;
        var nx = dx / d, ny = dy / d, ov = rr - d, ia = 1 / a.m, ib = 1 / b.m, it = ia + ib;
        a.x -= nx * ov * ia / it * 0.85; a.y -= ny * ov * ia / it * 0.85; b.x += nx * ov * ib / it * 0.85; b.y += ny * ov * ib / it * 0.85;
        var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          var J = -(1 + 0.3) * vn / it;
          a.vx -= J * nx * ia; a.vy -= J * ny * ia; b.vx += J * nx * ib; b.vy += J * ny * ib;
          if (-vn > 0.45) { var hh = Math.min(1, -vn * 0.7); a.hit = Math.max(a.hit, hh); b.hit = Math.max(b.hit, hh); }
          var tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - b.w * b.r - a.w * a.r;   // contact friction: spin
          var Jt = -vt / (3 * it), L = 0.4 * J; Jt = Math.max(-L, Math.min(L, Jt));
          a.vx -= Jt * tx * ia; a.vy -= Jt * ty * ia; b.vx += Jt * tx * ib; b.vy += Jt * ty * ib;
          a.w -= 2 * Jt * ia / a.r; b.w -= 2 * Jt * ib / b.r;
        }
      }
    }
    for (i = 0; i < n; i++) { c = cs[i]; c.hit *= Math.exp(-dt * 5); if (c.vx * c.vx + c.vy * c.vy < 0.0004 && c.y < 0.6) { c.vx *= 0.8; c.vy *= 0.8; c.w *= 0.8; } }
  }
  function phyTick(t, still) {
    var A = window.innerWidth / Math.max(1, window.innerHeight);
    if (Math.abs(A - PHY.A) > 0.01) { var sc = A / PHY.A; PHY.cs.forEach(function (c) { c.x = Math.min(A - c.r, c.x * sc); }); PHY.A = A; }
    PHY.cap = A > 1.1 ? 26 : A > 0.7 ? 20 : 14;
    if (t - PHY.floorT > 1) {                                                                 // coins rest on top of a full-width bottom bar (phones), not behind it
      PHY.floorT = t; var nav = document.querySelector("nav.wings"), f = 0;
      if (nav) { var rc = nav.getBoundingClientRect(); if (rc.width > window.innerWidth * 0.9 && rc.bottom >= window.innerHeight - 2 && rc.height < window.innerHeight * 0.2) f = (window.innerHeight - rc.top) / window.innerHeight; }
      PHY.floor = f;
    }
    if (PHY.last < 0) {                                                                       // first frame: pre-simulate a settled heap
      for (var k = 0; k < Math.round(PHY.cap * 0.7); k++) { phySpawn(); for (var s0 = 0; s0 < 14; s0++) phyStep(1 / 30); }
      for (var s1 = 0; s1 < 150; s1++) phyStep(1 / 30);
      PHY.last = t; PHY.spawnT = t; return;
    }
    if (still) return;
    var dt = Math.min(1 / 20, Math.max(0, t - PHY.last)); PHY.last = t;
    if (PHY.kick) {                                                                           // a tap: knock nearby coins away and up
      var kx = PHY.kick[0], ky = PHY.kick[1]; PHY.kick = null;
      PHY.cs.forEach(function (c) { var dx = c.x - kx, dy = c.y - ky, d = Math.sqrt(dx * dx + dy * dy); if (d < 0.22) { var f = (1 - d / 0.22) * 1.6; c.vx += dx / (d + 0.02) * f * 0.5; c.vy += f + 0.3; c.w += (phyRnd() - 0.5) * 20; c.hit = 0.6; } });
    }
    if (PHY.burst > 0 && t - PHY.spawnT > 0.12) { PHY.burst--; PHY.spawnT = t; phyCoin(PHY.A / 2 + (phyRnd() - 0.5) * 0.3, 1.1, (phyRnd() - 0.5) * 1.6, -0.3); }
    if (PHY.open) {
      if (t - PHY.open > 3.2 || !PHY.cs.length) { PHY.open = 0; PHY.hold = 0; PHY.spawnT = t; }
    } else if (PHY.cs.length >= PHY.cap) {
      if (!PHY.hold) PHY.hold = t; else if (t - PHY.hold > 9) { PHY.open = t; PHY.cs.forEach(function (c) { c.vy -= 0.1; }); }
    } else if (t - PHY.spawnT > 0.7 + 0.9 * phyRnd() && !PHY.burst) { PHY.spawnT = t; phySpawn(); }
    phyStep(dt);
    PHY.cs = PHY.cs.filter(function (c) { return c.y > -0.3; });
  }
  try {
    window.addEventListener("pointerdown", function (e) {
      if (performance.now() / 1000 - PHY.seen > 1) return;                                  // only while this effect is drawing
      PHY.kick = [e.clientX / Math.max(1, window.innerHeight), 1 - e.clientY / Math.max(1, window.innerHeight)];
    }, { passive: true });
    window.addEventListener("titan:fx", function (e) { var d = e.detail || {}; if (d.type === "moment" && d.preset === "style-physics") PHY.burst = 12; });
  } catch (e) { /* no window events: the rain still falls */ }
  function physicsCanvas(c, w, h, t, info) {
    PHY.seen = performance.now() / 1000;
    phyTick(t, info && info.still);
    var img = c.createImageData(w, h), D = img.data, cs = PHY.cs, n = Math.min(cs.length, w), i;
    for (i = 0; i < D.length; i += 4) D[i + 3] = 255;
    function put(x, y, r, g, b) { var o = (y * w + x) * 4; D[o] = r; D[o + 1] = g; D[o + 2] = b; }
    for (i = 0; i < n; i++) {
      var q = cs[i], X = Math.max(0, Math.min(65535, Math.round(q.x / 4 * 65535))), Y = Math.max(0, Math.min(65535, Math.round((q.y + 0.25) / 1.5 * 65535)));
      var ang = ((q.a % 6.2832) + 6.2832) % 6.2832;
      put(i, 0, X >> 8, X & 255, Y >> 8);
      put(i, 1, Y & 255, Math.round(ang / 6.2832 * 255) & 255, Math.round(q.r / 0.07 * 255));
      put(i, 2, q.k, Math.round(Math.min(1, q.hit) * 255), 0);
    }
    put(0, 3, n, 0, 0);
    c.putImageData(img, 0, 0);
    return true;
  }
  FX.register("style-physics", {
    layer: "front", still: 3, safe: 0.97,
    moments: [{ name: "jackpot", every: [30, 60], dur: 3 }],
    canvas: { w: 64, h: 4, fps: 30, nearest: true, draw: physicsCanvas },
    glsl: "uniform sampler2D uTex; uniform vec2 uTexRes;\n" + H + [
      "vec4 over(vec4 top, vec4 under){ return top + under*(1.-top.a); }",
      "vec4 T(int x, int y){ return texelFetch(uTex, ivec2(x,y), 0); }",
      "float b8(float v){ return floor(v*255.+.5); }",
      "float sdStar(vec2 p, float r, float rf){",                                          // five-point star (iq)
      "  const vec2 k1 = vec2(.809017,-.587785); const vec2 k2 = vec2(-k1.x,k1.y);",
      "  p.x = abs(p.x); p -= 2.*max(dot(k1,p),0.)*k1; p -= 2.*max(dot(k2,p),0.)*k2; p.x = abs(p.x); p.y -= r;",
      "  vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0.,1.); float h = clamp(dot(p,ba)/dot(ba,ba),0.,r);",
      "  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);",
      "}",
      "vec3 metal(float k){ return k < .5 ? vec3(.96,.76,.34) : k < 1.5 ? vec3(.80,.83,.88) : vec3(.82,.50,.32); }",
      "vec4 physics(vec2 fc){",
      "  vec2 w = fc/uRes.y; float I = clamp(uInt,0.,1.3); float px = 1./uRes.y;",
      "  int n = int(b8(T(0,3).r)); vec4 col = vec4(0.);",
      "  vec3 Ld = normalize(vec3(-.5,.65,.85));",
      "  for (int i=0;i<64;i++){ if (i >= n) break;",
      "    vec4 a = T(i,0), b = T(i,1), e = T(i,2);",
      "    vec2 c = vec2((b8(a.r)*256.+b8(a.g))/65535.*4., (b8(a.b)*256.+b8(b.r))/65535.*1.5-.25); float r = b8(b.b)/255.*.07;",
      "    vec2 d = w-c; float L = length(d); if (L > r + .022) continue;",
      "    float sh = (1.-smoothstep(r-.004, r+.02, length(d-vec2(.004,-.007))))*.45;",           // soft contact shadow, down and right
      "    float inside = 1.-smoothstep(r-px, r+px, L);",
      "    vec4 shadow = vec4(0.,0.,0., sh*(1.-inside));",
      "    if (inside <= 0.) { col = over(shadow, col); continue; }",
      "    float ang = b8(b.g)/255.*6.2832; vec2 q = r2(-ang)*d/r; float rq = length(q);",
      "    vec3 m = metal(b8(e.r)); float glint = e.g;",
      "    vec3 nrm = normalize(vec3(d/r*.55, 1.));",                                              // a slightly domed face
      "    float rim = smoothstep(.80,.84,rq);",
      "    if (rim > 0.) nrm = normalize(vec3(d/r*(rq > .93 ? 1.6 : .2), 1.));",                    // raised rim with a bevelled edge
      "    vec2 Lq = r2(-ang)*Ld.xy;",
      "    float st = sdStar(q, .42, .45), st2 = sdStar(q + Lq*.05, .42, .45);",
      "    float dev = 1.-smoothstep(-.02, .02, st);",
      "    float bev = clamp((st2-st)/.05, -1., 1.)*dev;",                                          // the device's lit and shaded edges
      "    float dif = max(dot(nrm, Ld), 0.);",
      "    float spec = pow(max(dot(reflect(-Ld, nrm), vec3(0.,0.,1.)), 0.), 22.);",
      "    vec3 cc = m*(.35 + .75*dif) + vec3(1.)*spec*(.45 + 1.2*glint);",
      "    cc *= 1. - .18*(1.-rim)*(1.-dev);",                                                       // the field sits a little lower
      "    cc += m*bev*.35;",
      "    float reed = rq > .95 ? .5+.5*cos(atan(q.y,q.x)*70.) : 1.;  cc *= mix(1., .78+.22*reed, rim);",
      "    float bead = exp(-sq((rq-.74)/.018)); float dots = step(.6, cos(atan(q.y,q.x)*24.)); cc *= 1. - .25*bead*(1.-dots); cc += m*.25*bead*dots;",
      "    cc += vec3(1.,.95,.8)*glint*.25*exp(-sq(rq/.6));",
      "    vec4 coin = vec4(cc*inside*.88, inside*.88);",
      "    col = over(coin, over(shadow, col));",
      "  }",
      "  return col*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return physics(fc); }" }]
  });
  /* =====================================================================================================================
     5. style-guilloche · Treasury Note (light, note paper). The engraver's guilloche: a large rosette in the upper corner and a
        smaller one opposite, each a band of two crossing families of wavy rings (r + a·sin(nθ+φ)), an inner petal rosette, and
        fine wavy border bands down both edges. Line width is one device pixel (fwidth), the phases drift slowly so the moiré
        shimmers like a note tilted under a lamp. Banknote green ink at engraving strength (alpha only, never light).
        Moment "seal": a serrated red treasury seal stamps onto the smaller rosette, ink pressed unevenly.
     ===================================================================================================================== */
  FX.register("style-guilloche", {
    layer: "front", still: 6, safe: 0.97,
    moments: [{ name: "seal", every: [26, 50], dur: 7 }],
    glsl: H + [
      "vec4 over(vec4 top, vec4 under){ return top + under*(1.-top.a); }",
      "float gl1(float v, float s){ float px = fwidth(v); float d = abs(fract(v/s - .5) - .5)*s; return 1.-smoothstep(0., px*1.25, d); }",
      "float rosette(vec2 q, float R0, float R1, float n, float m, float ph, float s){",
      "  float r = length(q); if (r > R1 + .03) return 0.;",
      "  float th = atan(q.y, q.x);",
      "  float band = smoothstep(R0-.012, R0+.012, r)*(1.-smoothstep(R1-.012, R1+.012, r));",
      "  float a = (R1-R0)*.2;",
      "  float v1 = r + a*sin(n*th + ph) + a*.35*sin(m*th - ph*1.3);",
      "  float v2 = r - a*sin(n*th + ph*.8 + 1.2) + a*.35*sin(m*th + ph*1.1);",
      "  float L = max(gl1(v1, s), .85*gl1(v2, s))*band;",
      "  float pr = r*(1. + .32*cos((n*.5)*th + ph*.6)) ;",                              // the petal rosette inside the band
      "  float pet = gl1(pr + .012*sin(m*th - ph), s*1.3)*(1.-smoothstep(R0*.82, R0*.92, pr))*smoothstep(R0*.12, R0*.22, r);",
      "  return max(L, pet*.8);",
      "}",
      "float border(vec2 p, float a, float t){",
      "  float x = abs(p.x), e = a*.5 - .045; float m = smoothstep(e-.026, e-.016, x)*(1.-smoothstep(e+.012, e+.022, x));",
      "  if (m <= 0.) return 0.;",
      "  float v1 = x + .006*sin(p.y*58. + t*.25), v2 = x + .006*sin(p.y*58. + 3.1416 - t*.2);",
      "  return m*max(gl1(v1, .0045), .8*gl1(v2, .0045));",
      "}",
      "vec4 guilloche(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec4 col = vec4(0.);",
      "  vec2 cA = vec2(a*.5 - (a < .8 ? .06 : .14), .36); float RA = a < .8 ? .24 : .3;",
      "  vec2 cB = vec2(-a*.5 + (a < .8 ? .07 : .16), -.34); float RB = a < .8 ? .17 : .21;",
      "  float A1 = rosette(r2(t*.004)*(p-cA), RA*.62, RA, 18., 7., t*.06, .0052);",
      "  float B1 = rosette(r2(-t*.005)*(p-cB), RB*.6, RB, 14., 5., 1.7 + t*.07, .0048);",
      "  float bo = a > .8 ? border(p, a, t) : 0.;",
      "  float ink = max(max(A1, B1), bo);",
      "  vec3 g = mix(vec3(.08,.30,.22), vec3(.10,.24,.36), .5+.5*sin(p.x*3.+p.y*2.+t*.05));",   // green drifting toward blue-green, as printed notes do
      "  float al = ink*.55;",
      "  col = vec4(g*al, al);",
      "  float km = mK();",
      "  if (km >= 0.) {",                                                                      // the treasury seal stamps in
      "    float sc = 1. + .45*(1.-smoothstep(0.,.07,km)); float fa = smoothstep(0.,.05,km)*(1.-smoothstep(.85,1.,km));",
      "    vec2 q = (p-cB)/(RB*.72*sc); float r = length(q), th = atan(q.y,q.x);",
      "    float edge = 1. + .05*step(.5, fract(th*36./6.2832));",
      "    float disc = 1.-smoothstep(edge-.02, edge+.02, r);",
      "    float ring = 1.-smoothstep(.0, .025, abs(r-.8)) ; float ring2 = 1.-smoothstep(.0, .015, abs(r-.66));",
      "    float an = th + 1.5708; float st = r*(1.+.4*cos(5.*an)) ;",                          // a five-point star at the centre
      "    float star = 1.-smoothstep(.36, .38, st);",
      "    float press = .55 + .45*vn(p*260.);",
      "    float sealInk = clamp(disc*(.32 + .55*ring + .55*ring2 + .55*star), 0., 1.)*press*fa;",
      "    vec3 sc3 = vec3(.66,.20,.11); float sa = sealInk*.7;",
      "    col = over(vec4(sc3*sa, sa), col);",
      "  }",
      "  return col*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return guilloche(fc); }" }]
  });
  /* =====================================================================================================================
     6. style-topo · Survey Map (dark, night chart). A domain-warped fbm terrain drifts and slowly reshapes; its contour lines are
        drawn one device pixel wide (fwidth), every fifth an index contour a little brighter and wider, coloured from deep teal in
        the valleys through mint to sand on the peaks, over a faint hillshade. Moment "ping": a survey ring expands from a
        point, lighting the contours it crosses, with a cross-hair marker at its centre.
     ===================================================================================================================== */
  FX.register("style-topo", {
    layer: "front", still: 8, safe: 0.97,
    moments: [{ name: "ping", every: [22, 44], dur: 5 }],
    glsl: H + [
      "float hgt(vec2 q, float t){",
      "  vec2 w = .35*vec2(fbmQ(q*.8 + vec2(t*.010, 0.), 3), fbmQ(q*.8 + vec2(5.2, -t*.012), 3));",
      "  return fbmQ(q*1.25 + w + vec2(t*.006, 0.), uQ > 1.5 ? 5 : 4);",
      "}",
      "vec4 topo(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  float h = hgt(p, t); float f = h*17.;",
      "  float fw = fwidth(f); float d = abs(fract(f - .5) - .5);",
      "  float idx = step(abs(mod(floor(f + .5), 5.)), .5);",                               // every fifth line is an index contour
      "  float ln = 1. - smoothstep(0., fw*(1.1 + .9*idx), d);",
      "  float e = .01; float hx = hgt(p + vec2(e,0.), t) - h, hy = hgt(p + vec2(0.,e), t) - h;",
      "  float shade = clamp(.5 + (hx*-.7 + hy*.7)*28., 0., 1.);",                              // hillshade, light from the upper left
      "  vec3 lo = vec3(.10,.42,.52), mid = vec3(.36,.88,.74), hi = vec3(.95,.80,.52);",
      "  float hh = clamp((h - .25)/.55, 0., 1.);",
      "  vec3 c = hh < .5 ? mix(lo, mid, hh*2.) : mix(mid, hi, hh*2. - 1.);",
      "  float al = ln*(.30 + .22*idx);",
      "  vec3 col = c*al + vec3(.05,.12,.13)*shade*.22;",
      "  float A = al + .05*shade;",
      "  float km = mK();",
      "  if (km >= 0.) {",
      "    float cyc = floor(uTime/37.); vec2 cc = vec2((h11(cyc*3.1) - .5)*a*.7, (h11(cyc*7.7) - .5)*.6);",
      "    float R = km*.95, ring = exp(-sq((length(p - cc) - R)/.012))*(1. - km);",
      "    float lit = ring*ln*1.6 + ring*.25;",
      "    vec2 q = abs(p - cc); float cross = (step(q.x, .0016)*step(q.y, .028) + step(q.y, .0016)*step(q.x, .028))*step(.008, length(p - cc));",
      "    float mk = (cross + (1. - smoothstep(0., .002, abs(length(p - cc) - .016))))*smoothstep(0., .1, km)*(1. - smoothstep(.75, 1., km));",
      "    col += vec3(1.,.72,.30)*(lit + mk*.8); A += lit*.6 + mk*.8;",
      "  }",
      "  return vec4(col, min(A, 1.))*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return topo(fc); }" }]
  });
  /* =====================================================================================================================
     7. style-glass · Cathedral Glass (dark, a nave at dusk). A rose window in the upper corner: twelve-fold mirrored Voronoi panes
        between stone rings, leaded (F2-F1 edges), each pane a jewel colour (ruby, sapphire, emerald, amber, amethyst) with
        streaky glass and a soft glow that follows a slow sun moving behind it. On wide screens two pointed lancet windows run
        down the margins. Coloured light shafts fall from the rose across the page with dust motes drifting in them.
        Moment "sunburst": the sun comes out from behind cloud, the glass blazes and the shafts brighten.
     ===================================================================================================================== */
  FX.register("style-glass", {
    layer: "front", still: 7, safe: 0.97,
    moments: [{ name: "sunburst", every: [24, 46], dur: 6 }],
    glsl: H + [
      "vec3 vor(vec2 x){",                                                                  // F1, F2, cell id hash
      "  vec2 n = floor(x), f = fract(x); float F1 = 8., F2 = 8., id = 0.;",
      "  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(float(i),float(j)); vec2 o = h22(n+g)*.8+.1; vec2 r = g+o-f; float d = dot(r,r);",
      "    if (d < F1){ F2 = F1; F1 = d; id = h21(n+g); } else if (d < F2) F2 = d; }",
      "  return vec3(sqrt(F1), sqrt(F2), id);",
      "}",
      "vec3 jewel(float h){ return h < .22 ? vec3(.78,.08,.12) : h < .42 ? vec3(.10,.24,.78) : h < .58 ? vec3(.06,.56,.30) : h < .8 ? vec3(.96,.62,.12) : vec3(.48,.16,.64); }",
      "vec4 pane(vec2 x, float sc, float glow, float lw){",                                    // leaded glass at scale sc; returns premultiplied
      "  vec3 v = vor(x*sc); float edge = (v.y - v.x);",
      "  float lead = 1. - smoothstep(lw*.55, lw, edge);",
      "  vec3 c = jewel(v.z); float streak = .75 + .35*vn(x*sc*vec2(9., 2.) + v.z*20.);",       // streaky, uneven glass
      "  vec3 g = c*streak*glow*(1.1 - .5*v.x);",
      "  return vec4(mix(g, vec3(0.), lead), 1.);",
      "}",
      "vec4 glass(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime; float px = 1.5/uRes.y;",
      "  float me = mEnv();",
      "  vec2 sun = vec2(.25*sin(t*.03), .2*cos(t*.023));",                                    // the sun drifts behind the glass
      "  vec2 c = vec2(a*.5 - (a < .8 ? .1 : .2), .34); float R = a < .8 ? .2 : .27;",
      "  vec4 col = vec4(0.);",
      "  vec2 d = p - c; float r = length(d);",
      // light shafts falling from the rose, down and to the left, tinted by the panes they pass through
      "  float ang = atan(d.y, d.x); float down = smoothstep(-2.9, -2.3, ang)*(1. - smoothstep(-1.75, -1.25, ang));",
      "  float bands = pow(.5+.5*sin(ang*26. + t*.05), 3.)*(.6 + .4*vn(vec2(ang*8., t*.05)));",
      "  float fall = exp(-max(r - R, 0.)*1.4)*step(R, r);",
      "  vec3 tint = jewel(fract(floor(ang*6.)*.37 + .11));",
      "  float sh = down*bands*fall*(.10 + .14*me);",
      "  vec2 mp = p*vec2(22., 22.) + vec2(0., t*.15); vec2 mc = floor(mp); vec2 mo = h22(mc); float mote = step(.9, h21(mc+3.))*(1. - smoothstep(.0, .06, length(fract(mp) - mo)));",
      "  vec3 shaft = mix(vec3(1.,.9,.7), tint, .55)*(sh + mote*down*fall*.35);",
      "  col = vec4(shaft, (sh + mote*down*fall*.35)*.5);",
      // the rose window
      "  if (r < R*1.06) {",
      "    float th = atan(d.y, d.x); float seg = 6.2832/12.; float tm = mod(th + seg*.5, seg) - seg*.5; tm = abs(tm);",
      "    vec2 q = r*vec2(cos(tm), sin(tm));",
      "    float sunL = .55 + .9*exp(-dot(d/R - sun, d/R - sun)*1.6) + .9*me;",
      "    vec4 g = pane(q/R, 6., sunL, .07);",
      "    float stone = max(max(1. - smoothstep(.0, px*1.5/R + .02, abs(r/R - 1.)), 1. - smoothstep(.0, .02, abs(r/R - .62))), 1. - smoothstep(.0, .018, abs(r/R - .3)));",
      "    float spoke = (1. - smoothstep(.0, .012, abs(sin(tm))*r/R))*step(.3, r/R);",
      "    float frame = clamp(stone + spoke, 0., 1.);",
      "    float inside = 1. - smoothstep(R - px, R + px, r);",
      "    vec3 gc = mix(g.rgb, vec3(.03,.025,.04), frame);",
      "    float al = inside*.74;",
      "    col = vec4(gc*al, al) + col*(1. - al);",
      "  }",
      // two lancet windows down the margins on wide screens
      "  if (a > 1.1) {",
      "    float lx = a*.5 - .07; float u = (abs(p.x) - lx)/.032; float top = .26 + .07*sqrt(max(0., 1. - abs(u)));",
      "    float inL = step(abs(u), 1.)*step(p.y, top)*step(-.4, p.y);",
      "    if (inL > 0.) {",
      "      float sunL = .5 + .45*exp(-sq(p.y - sun.y*1.5)*6.) + .9*me;",
      "      vec4 g = pane(vec2(p.x*sign(p.x), p.y), 9., sunL, .06);",
      "      float fr = 1. - smoothstep(.82, .9, abs(u)); float al = inL*.68;",
      "      vec3 gc = mix(vec3(.03,.025,.04), g.rgb, fr);",
      "      col = vec4(gc*al, al) + col*(1. - al);",
      "    }",
      "  }",
      "  return col*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return glass(fc); }" }]
  });
})();
