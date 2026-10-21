/* TitanFX presets for the new Classic themes #37-#50 (Grok, theme-37-50 worker, 2026-10-20). Owner: "Classic is going to end up
   with about 50 themes so if you have any other cool ideas just go for it", "ALWAYS ASSUME A CAPABLE GPU", device floor
   Galaxy S24 Ultra (Adreno 750). Full-fidelity raymarched / volumetric shaders, one per theme; low uQ tiers only cut step counts.
   Concepts: /workspace/themes-review/NEW_THEMES_37_50.md (copied to notes/agents/themes-37-50.md). Premultiplied output. */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;
  var H = [
    "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }",
    "mat2 r2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }"
  ].join("\n") + "\n";

  /* ===== #37 style-ferro · Ferrofluid (ferro). A pool of mirror-black ferrofluid seen at a low grazing angle fills the lower part of
     the page. A hexagonal Rosensweig spike lattice stands up wherever the magnetic field is strong: under the pointer, under a slow
     wandering magnet, and in a ring after each tap. Heightfield raymarch with binary refinement, analytic-ish normals, GGX-like
     specular from two studio softbox strips plus a cyan rim, Fresnel-weighted environment. Moment "surge": the magnet passes
     beneath the whole pool and every spike rises in a travelling wave. ===== */
  FX.register("style-ferro", {
    layer: "front", still: 3.0, safe: 0.97, fps: 60,
    moments: [{ name: "surge", every: [18, 36], dur: 3.2 }],
    glsl: H + [
      "float field(vec2 q){",                       // q = pool-plane coords (x across, z depth)
      "  vec2 m1 = vec2(sin(uTime*.23)*1.3, 2.2+sin(uTime*.17)*.7);",
      "  float f = exp(-dot(q-m1,q-m1)*1.6)*.85;",
      "  vec2 pp = vec2(uPtr.x*3.2, 1.2+ (uPtr.y+.5)*3.);",
      "  f += exp(-dot(q-pp,q-pp)*2.2);",
      "  if (uTap.w > 0. && uTap.z < 2.4) { vec2 tp = vec2(uTap.x*3.2, 1.2+(uTap.y+.5)*3.); float d = length(q-tp); f += exp(-sq((d-uTap.z*1.3)/.35))*exp(-uTap.z*1.2)*1.2*uTap.w; }",
      "  float k = mK(); if (k >= 0.) { float x = mix(-5., 5., k); f += exp(-sq((q.x-x)/.9))*1.1*smoothstep(0.,.1,k)*(1.-smoothstep(.85,1.,k)); }",
      "  return clamp(f, 0., 1.4);",
      "}",
      "float hex(vec2 q){",                         // distance to nearest hex lattice point (spike centres)
      "  vec2 s = vec2(1., 1.7320508); vec2 a = mod(q, s)-.5*s, b = mod(q-.5*s, s)-.5*s;",
      "  return min(dot(a,a), dot(b,b));",
      "}",
      "float hgt(vec2 q){",
      "  float f = field(q); float sc = 3.6; float d = sqrt(hex(q*sc))/sc;",
      "  float spike = max(0., 1.-d*sc*1.9); spike = spike*spike*(3.-2.*spike);",
      "  float h = spike*(.06+ .38*f)*smoothstep(.08,.5,f);",
      "  h += .04*f + .006*sin(q.x*7.+uTime*1.3)*sin(q.y*5.-uTime);",       // the swell beneath and a faint surface shiver
      "  return h;",
      "}",
      "vec3 env(vec3 r){",
      "  vec3 c = vec3(.02,.024,.03) + vec3(.10,.12,.16)*smoothstep(0.,.7,r.y);",
      "  c += vec3(1.,.97,.92)*smoothstep(.985,.998, dot(r, normalize(vec3(-.5,.8,-.3))))*6.;",      // key softbox
      "  c += vec3(.9,.95,1.)*exp(-sq((r.x-.35)*5.))*smoothstep(.1,.5,r.y)*1.1 + vec3(.9,.95,1.)*exp(-sq((r.x+.45)*7.))*smoothstep(.1,.5,r.y)*1.2;",                       // strip light
      "  c += vec3(.2,.85,1.)*exp(-sq((r.y-.05)*10.))*.9;",                                              // cyan horizon rim
      "  c += uAcc*exp(-sq((r.x+.6)*6.))*smoothstep(.1,.5,r.y)*.6;",
      "  return c;",
      "}",
      "vec4 ferro(vec2 fc){",
      "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3);",
      "  vec3 ro = vec3(0., .95, -1.2), rd = normalize(vec3(p.x, p.y-.12, 1.25));",
      "  rd.yz = r2(-.08)*rd.yz;",
      "  if (rd.y > -.02) return vec4(0.);",
      "  float t = (ro.y-.45)/-rd.y, tmax = (ro.y)/-rd.y + 1.;",
      "  int N = uQ > 2.5 ? 96 : uQ > 1.5 ? 72 : 48; float dt = (tmax-t)/float(N); float lt = t; bool hit = false;",
      "  for (int i=0;i<96;i++){ if (i>=N) break; vec3 x = ro+rd*t; float h = x.y-hgt(x.xz); if (h < 0.) { hit = true; break; } lt = t; t += dt; }",
      "  if (!hit) { lt = t-dt; t = tmax; }",
      "  for (int i=0;i<6;i++){ float m = .5*(t+lt); vec3 x = ro+rd*m; if (x.y-hgt(x.xz) < 0.) t = m; else lt = m; }",
      "  vec3 x = ro+rd*t; vec2 e = vec2(.004,0.);",
      "  vec3 n = normalize(vec3(hgt(x.xz-e.xy)-hgt(x.xz+e.xy), 2.*e.x, hgt(x.xz-e.yx)-hgt(x.xz+e.yx)));",
      "  vec3 r = reflect(rd, n); float fr = .04 + .96*pow(1.-max(dot(n,-rd),0.), 5.);",
      "  vec3 col = env(r)*(.4+fr) + vec3(.004) + vec3(.15,.75,1.)*pow(1.-n.y,3.)*.4;",
      "  float fog = exp(-max(t-1.6,0.)*.55); float al = I*fog*smoothstep(-.02,-.07,rd.y);",
      "  col = min(col, vec3(2.));",
      "  return vec4(col*al, al);",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return ferro(fc); }" }]
  });
})();
