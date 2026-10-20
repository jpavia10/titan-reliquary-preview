/* TitanFX style presets, second batch (owner, 2026-10-20: "Make sure theres at least one theme for all of these and expand with more";
   the "20 insane Claude animation styles" video, styles the first batch did not have a theme for). One preset per new theme:
     style-y2k        Millennium Chrome (y2k): a liquid-chrome coin with chrome blobs that orbit and merge into it, a pastel studio
                      reflected in the metal, four-point sparkles and a retro grid floor
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
})();
