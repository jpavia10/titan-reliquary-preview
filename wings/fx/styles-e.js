/* TitanFX style presets, second batch (owner, 2026-10-20: "Make sure theres at least one theme for all of these and expand with more";
   the "20 insane Claude animation styles" video, styles the first batch did not have a theme for). One preset per new theme:
     style-y2k        Millennium Chrome (y2k): a liquid-chrome coin with chrome blobs that orbit and merge into it, a pastel studio
                      reflected in the metal, four-point sparkles and a retro grid floor
     style-papercut   Paper Hills (papercut): rolling hills cut from layered card with drop shadows, a paper sun, clouds and
                      hot-air balloons; moment: a balloon carries a gold paper coin up the page
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
})();
