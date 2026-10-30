/* TitanFX presets: celebrations (Claude, 2026-10-30). Owner: "I should be able to add any of the available effects on any scene ...
   If I want fireworks and explosions on my zen garden then so be it." Two effects that no theme had, made to be added on top of any
   theme (wings/fx/layers.js), in the same form as every other preset (wings/fx/presets.js):
     fireworks   rockets rise and burst: peony, ring, gold willow and two-tone shells, sparks with drag and gravity, a crackle at the
                 end, the sky lit by each burst; a tap launches a shell where you touched
     explosions  a fireball that blooms out of turbulent fire into smoke, a shockwave ring, a white flash, debris sparks on arcs;
                 a tap sets one off where you touched
   Premultiplied: rgb with low alpha is light added over the page; smoke is alpha with dark rgb. Positions are in screen heights
   (x across -asp/2..asp/2, y -.5...5), the same space as the tap (uTap.xy). */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;
  var VHEAD = FX.vhead;
  var P = "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }\nfloat asp(){ return uRes.x/uRes.y; }\n";
  /* what the particle passes need on top of the engine's vertex head */
  var VX = "float asp(){ return uRes.x/uRes.y; }\nvec3 hsv(float h, float s, float v){ vec3 k=clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.); return v*mix(vec3(1.),k,s); }\n";

  /* ===================== fireworks ===================== */
  /* six shells in flight at a time (NB), one more for a tap; every instance belongs to one shell: instance 0 of a shell is its rocket */
  var FW = [
    "const float NB = 6.;",
    "float hs(float a, float b){ return fract(sin(a*91.7+b*47.3)*43758.5453); }",
    /* a shell's clock: cycle number, seconds since its launch, launch point, burst point, rise time, kind, hue */
    "void shell(float s, out float cyc, out float a, out vec2 l0, out vec2 b, out float rise, out float kind, out float hue){",
    "  float T = 2.5 + 2.1*hs(s, 1.); float off = hs(s, 2.)*T + s*.61;",
    "  float u = (uTime + off)/T; cyc = floor(u); a = fract(u)*T;",
    "  float A = asp(); float r1 = hs(s, cyc+3.), r2 = hs(s, cyc+5.), r3 = hs(s, cyc+7.);",
    "  b = vec2((r1-.5)*A*.78, .05 + .33*r2); l0 = vec2(b.x + (r3-.5)*.18, -.56); rise = .85 + .45*r3;",
    "  kind = floor(hs(s, cyc+11.)*4.); hue = hs(s, cyc+13.);",
    "}"
  ].join("\n");
  FX.register("fireworks", {
    layer: "front", still: 2.4, tap: "own",   // "own": the taps reach the shader (a shell at the finger) without the engine's ripple ring
    glsl: P + FW,
    passes: [
      /* the sky lit by each burst, and a faint haze of smoke where shells went off */
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt, 0., 1.4); vec3 c = vec3(0.); float al = 0.;",
        "  for (int i = 0; i < 6; i++) {",
        "    float cyc, a, rise, kind, hue; vec2 l0, b; shell(float(i), cyc, a, l0, b, rise, kind, hue);",
        "    float t = a - rise; if (t < 0.) continue;",
        "    float d = length(p - b); vec3 col = kind > 1.5 && kind < 2.5 ? vec3(1., .72, .3) : hsv(hue, .7, 1.);",
        "    float fl = exp(-t*3.2)*exp(-d*d*6.);",
        "    float haze = smoothstep(0., .6, t)*exp(-t*.45)*exp(-d*d*9.)*(.6 + .4*vn(p*7. + vec2(0., uTime*.2)));",
        "    c += col*fl*.26 + col*haze*.03; al += haze*.03;",
        "  }",
        "  if (uTap.w > 0.) { float t = uTap.z, d = length(p - uTap.xy); c += hsv(fract(floor(uTime*.37)*.31), .5, 1.)*exp(-t*3.2)*exp(-d*d*6.)*.32*uTap.w; }",
        "  return vec4(c*I*(1. - .85*uLight), al*I*mix(1., 2.5, uLight));",   // over a light page the glow would only wash it out
        "}"].join("\n") },
      /* rockets and sparks */
      { count: [1100, 2200, 3600, 5200],
        vert: VHEAD + VX + FW + [
          "void main(){",
          "  float fi = float(gl_InstanceID); vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
          "  float s = mod(fi, NB + 1.), k = floor(fi/(NB + 1.));",
          "  float cyc, a, rise, kind, hue; vec2 l0, b; bool tap = s > NB - .5;",
          "  if (tap) { if (uTap.w <= 0.) { cull(); return; } cyc = floor(uTime*.37); a = uTap.z + .001; rise = 0.; l0 = b = uTap.xy; kind = mod(cyc, 4.); hue = fract(cyc*.31); }",
          "  else shell(s, cyc, a, l0, b, rise, kind, hue);",
          "  if (h11(fi*.37 + cyc) > .35 + .65*min(uInt, 1.)) { cull(); return; }",
          "  vec2 pos, vel; float br, len, wid; vec3 col;",
          "  if (k < .5) {",                                   // the rocket: rises on a slowing arc with a spark tail
          "    if (tap || a > rise) { cull(); return; }",
          "    float u = a/rise, e = 1. - (1.-u)*(1.-u); pos = mix(l0, b, e); vel = (b - l0)*(2.*(1.-u))/rise;",
          "    br = 1.2; len = 18.; wid = 2.4; col = vec3(1., .82, .55);",
          "  } else {",
          "    float t = a - rise; float life = (kind > 1.5 && kind < 2.5 ? 3.2 : 1.9) + .5*h11(fi + cyc*3.);",
          "    if (t < 0. || t > life) { cull(); return; }",
          "    float r1 = h11(k*1.31 + cyc*7.7 + s*13.1), r2 = h11(k*2.71 + cyc*3.3 + s*5.9), ang = r1*6.2832;",
          "    float sp = kind < .5 ? .56*sqrt(r2) : kind < 1.5 ? .52*(.93 + .07*r2) : kind < 2.5 ? .36*sqrt(r2) : .48*(r2 < .5 ? .55 : 1.)*(.92 + .08*h11(k));",
          "    vec2 dir = vec2(cos(ang), sin(ang)); float drag = kind > 1.5 && kind < 2.5 ? 1.2 : 2.6, g = kind > 1.5 && kind < 2.5 ? .16 : .11;",
          "    float ex = (1. - exp(-drag*t))/drag;",
          "    pos = b + dir*sp*ex*2.2 - vec2(0., .5*g*t*t); vel = dir*sp*exp(-drag*t)*2.2 - vec2(0., g*t);",
          "    float f = 1. - t/life; br = (t < .08 ? 1.6 : 1.)*f*f*(.6 + .4*h11(fi));",
          "    if (t > life*.62) br *= step(.5, fract(uTime*(11. + 9.*r2) + r1*7.)) + .25;",   // the crackle at the end
          "    vec3 c1 = hsv(hue, .82, 1.), c2 = hsv(fract(hue + .5), .8, 1.);",
          "    col = kind > 1.5 && kind < 2.5 ? vec3(1., .66, .25) : kind > 2.5 ? (r2 < .5 ? c2 : c1) : c1;",
          "    col = mix(vec3(1.), col, smoothstep(0., .25, t));",
          "    len = 5. + 34.*length(vel); wid = 2.2 + 1.*h11(fi + 3.);",
          "  }",
          "  float px = uScale; vec2 dn = normalize(vel + vec2(1e-5)); vec2 o = dn*corner.x*len*px + vec2(-dn.y, dn.x)*corner.y*wid*px;",
          "  vec2 ndc = pos/vec2(asp()*.5, .5);",
          "  gl_Position = vec4(warp(ndc, 1.) + o*2./uRes, 0., 1.); vQ = corner; vA = vec4(col, br);",
          "}"].join("\n"),
        ifrag: [
          "vec4 fxi(){",
          "  float d = length(vQ); float core = exp(-vQ.y*vQ.y*9.)*(1. - smoothstep(.2, 1., abs(vQ.x)));",
          "  float halo = exp(-d*d*2.2)*.4; float k = vA.w*uInt;",
          "  vec3 hot = mix(vA.rgb, vec3(1.), core*.22);",          // a little white-hot at the middle of each streak
          /* the streak's core covers what is behind it in its own colour (so it reads over a bright world as well as a night sky);
             only a small halo is light added on top, which is what washed a bright world out to white */
          "  return vec4(hot*(core*1.35 + halo*.4)*k, clamp(core*k, 0., 1.)*.92 + halo*k*.12);",   // the core covers what is behind (a bright world too); the halo is light added
          "}"].join("\n") }
    ]
  });

  /* ===================== explosions ===================== */
  var EX = [
    "const float NE = 3.;",
    "float hx(float a, float b){ return fract(sin(a*73.1+b*31.9)*43758.5453); }",
    "void blast(float s, out float cyc, out float t, out vec2 c, out float R){",
    "  float T = 6.5 + 4.*hx(s, 1.); float off = hx(s, 2.)*T + s*2.3; float u = (uTime + off)/T; cyc = floor(u); t = fract(u)*T;",
    "  float A = asp(); c = vec2((hx(s, cyc+3.)-.5)*A*.72, -.22 + .3*hx(s, cyc+5.)); R = .16 + .12*hx(s, cyc+7.);",
    "}",
    /* a fireball at c of size R, t seconds after it went off: the flash, the shockwave, turbulent fire that cools to dark smoke */
    "void fireball(vec2 p, vec2 c, float R, float t, float seed, inout vec3 col, inout float al){",
    "  if (t < 0. || t > 6.5) return;",
    "  float w = abs(length(p - c) - t*.85*(1. + R)); col += vec3(1., .88, .7)*exp(-w*w*1400.)*exp(-t*3.5)*.8;",
    "  col += vec3(1., .9, .75)*exp(-t*10.)*.55;",
    "  vec2 q = p - c; q.y -= .05*t*t*(1. + R*3.);",           // the fireball rises as it cools
    "  float r = R*(1. - exp(-6.*t))*(1. + .35*t);",
    "  float d = length(q)/max(r, 1e-3); if (d > 1.8) return;",
    "  vec2 nq = q/max(r, .02)*1.8 + vec2(seed*7.1, -t*1.1);",
    "  float n = fbmQ(nq*2.2 + fbmQ(nq*3.1 + seed, 2)*1.6, 4);",
    "  float body = smoothstep(1., .55, d + (n - .5)*1.1);",
    "  float heat = clamp(body*(1.6 - d*1.2)*exp(-t*.7)*(.55 + n), 0., 1.8);",
    "  vec3 fire = mix(vec3(.35, .03, 0.), vec3(1., .32, .04), smoothstep(.05, .45, heat)); fire = mix(fire, vec3(1., .8, .35), smoothstep(.45, .95, heat)); fire = mix(fire, vec3(1., .97, .9), smoothstep(.95, 1.5, heat));",
    "  float smoke = body*smoothstep(.25, 1.4, t)*(1. - smoothstep(4., 6.5, t))*(.6 + .5*n);",
    "  col = col*(1. - smoke*.6) + vec3(.07, .06, .055)*smoke + fire*heat*1.25;",
    "  al = max(al, max(clamp(heat*.9, 0., 1.)*.55, smoke*.62));",
    "}"
  ].join("\n");
  FX.register("explosions", {
    layer: "front", still: .35, tap: "own",
    glsl: P + EX,
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt, 0., 1.4); vec3 c = vec3(0.); float al = 0.;",
        "  for (int i = 0; i < 3; i++) { float cyc, t, R; vec2 o; blast(float(i), cyc, t, o, R); fireball(p, o, R, t, hx(float(i), cyc), c, al); }",
        "  if (uTap.w > 0.) fireball(p, uTap.xy, .2, uTap.z, fract(floor(uTime*.5)*.37), c, al);",
        "  al = clamp(al, 0., .8)*I; c *= I;",
        "  return vec4(c, al);",
        "}"].join("\n") },
      /* debris: sparks thrown out on arcs, trailing as they fall */
      { count: [500, 1000, 1800, 2600],
        vert: VHEAD + VX + EX.replace(/void fireball[\s\S]*$/, "") + [
          "void main(){",
          "  float fi = float(gl_InstanceID); vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
          "  float s = mod(fi, NE + 1.), k = floor(fi/(NE + 1.));",
          "  float cyc, t, R; vec2 c;",
          "  if (s > NE - .5) { if (uTap.w <= 0.) { cull(); return; } cyc = floor(uTime*.5); t = uTap.z; c = uTap.xy; R = .2; }",
          "  else blast(s, cyc, t, c, R);",
          "  if (h11(fi*.37 + cyc) > .3 + .7*min(uInt, 1.)) { cull(); return; }",
          "  float life = 1.3 + 1.6*h11(k + cyc*3.1); if (t > life) { cull(); return; }",
          "  float ang = h11(k*1.7 + cyc*9.3 + s)*6.2832, sp = (.35 + .9*h11(k*2.3 + cyc))*(.6 + R*2.);",
          "  vec2 dir = vec2(cos(ang), abs(sin(ang))*.8 + .2*sin(ang)); dir = normalize(dir);",
          "  float drag = 1.8, ex = (1. - exp(-drag*t))/drag, g = .5;",
          "  vec2 pos = c + dir*sp*ex - vec2(0., .5*g*t*t), vel = dir*sp*exp(-drag*t) - vec2(0., g*t);",
          "  float f = 1. - t/life; float br = f*(t < .06 ? 2. : 1.);",
          "  vec3 col = mix(vec3(1., .95, .8), vec3(1., .45, .08), smoothstep(0., .5, t/life));",
          "  float len = 4. + 28.*length(vel), wid = 1.8 + 1.4*h11(fi);",
          "  float px = uScale; vec2 dn = normalize(vel + vec2(1e-5)); vec2 o = dn*corner.x*len*px + vec2(-dn.y, dn.x)*corner.y*wid*px;",
          "  gl_Position = vec4(warp(pos/vec2(asp()*.5, .5), 1.) + o*2./uRes, 0., 1.); vQ = corner; vA = vec4(col, br);",
          "}"].join("\n"),
        ifrag: [
          "vec4 fxi(){",
          "  float core = exp(-vQ.y*vQ.y*8.)*(1. - smoothstep(.15, 1., abs(vQ.x))); float e = core*vA.w*uInt;",
          "  return vec4(vA.rgb*e*1.6, clamp(e, 0., 1.)*.75);",
          "}"].join("\n") }
    ]
  });
})();
