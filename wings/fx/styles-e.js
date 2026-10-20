/* TitanFX style presets, second batch (owner, 2026-10-20: "Make sure theres at least one theme for all of these and expand with more";
   the "20 insane Claude animation styles" video, styles the first batch did not have a theme for). One preset per new theme:
     style-y2k        Millennium Chrome (y2k): a liquid-chrome coin with chrome blobs that orbit and merge into it, a pastel studio
                      reflected in the metal, four-point sparkles and a retro grid floor
     style-papercut   Paper Hills (papercut): rolling hills cut from layered card with drop shadows, a paper sun, clouds and
                      hot-air balloons; moment: a balloon carries a gold paper coin up the page
     style-sketch     Sketchbook (sketch): pencil doodles (a star, a spiral, a light bulb, a coin, an arrow, a heart, loops) draw
                      themselves in the margins with a little pencil, are gone over once more, then erased; moment: a big
                      sketched coin, hatched in
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
})();
