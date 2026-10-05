/* TitanFX presets. Each preset is GLSL ES 3.00: full-screen fragment passes ("frag" defines vec4 fx(vec2 fragCoord), premultiplied
   alpha) and GPU-instanced particle passes ("vert" + "ifrag", attribute-less: everything derives from gl_InstanceID, so nothing is uploaded).
   Shared uniforms (see engine.js): uRes uTime uInt uQ uScale uLight uFlash uBg uInk uAcc uBolt uFilm.
   Colour model: premultiplied; alpha 0 with rgb > 0 composites as additive light, rgb 0 with alpha > 0 darkens. Presets keep average
   alpha low so overlay text stays WCAG AA (verified in notes/agents/fx-v2.md). */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX) return;

  var P = "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }\nfloat asp(){ return uRes.x/uRes.y; }\n";   // uPar = pointer parallax + scroll drift (fx-v3)
  // fixed-size-in-CSS-px helper: 1 CSS px expressed in screen-height units
  var PX = "float cssPx(){ return uScale/uRes.y; }\n";

  /* ===================== rain on glass (own implementation of the classic droplet-on-pane look) ===================== */
  var RAIN = P + PX + [
    "void addDrop(inout float bh, inout vec2 bn, vec2 d, float r, float stretch){",
    "  vec2 q = vec2(d.x, d.y/stretch); float k = dot(q,q)/(r*r); float h = 1.-k;",
    "  if (h > bh) { bh = h; bn = q/r; }",
    "}",
    // static beads that swell, hang and slowly dry
    "void beads(vec2 p, float scale, float seed, float dens, inout float bh, inout vec2 bn){",
    "  vec2 g = p*scale + vec2(0., uTime*0.0); vec2 id = floor(g);",
    "  float r1 = h21(id+seed), r2 = h21(id*1.7+seed+3.), r3 = h21(id+seed+7.);",
    "  if (r1 > dens) return;",
    "  float life = fract(uTime*(0.012+0.02*r3)+r2);",
    "  float sz = smoothstep(0.,.12,life)*smoothstep(1.,.78,life);",
    "  vec2 c = vec2(.5) + (vec2(r2, r3)-.5)*.36;",
    "  float rr = (.13+.12*r3)*sz;",
    "  addDrop(bh, bn, (fract(g)-c)/scale, rr/scale, 1.0+.25*r2);",
    "}",
    // sliding drops with stick-slip motion, a wet trail, beads left behind and growth when they swallow beads
    "void sliders(vec2 p, float cols, float dens, inout float bh, inout vec2 bn, inout float trail){",
    "  float a = asp(); float cid = floor((p.x + a*.5)*cols);",
    "  for (int k=0;k<2;k++){",
    "    float id = cid*2.+float(k)+0.5;",
    "    float r1=h11(id*1.31), r2=h11(id*2.17+4.), r3=h11(id*3.7+9.);",
    "    if (r1 > dens) continue;",
    "    float cyc = 1.5, speed = (.03+.06*r2)*(.7+.6*min(uInt,1.3))*(STORMV>.5?1.5:1.);",
    "    float ph = fract(uTime*speed/cyc + r3*3.7);",
    "    float tau = ph*cyc;",
    "    float y = .78 - tau + .016*sin(tau*55.+sin(tau*21.)*2.5+r1*6.);",
    "    float x = (cid+.5)/cols - a*.5 + (r3-.5)*.4/cols + .0035*sin(tau*28.+r1*9.);",
    "    float rad = (.0058+.0048*r3)*(1.+.25*r2);",
    "    float grow = 1.;",
    "    for (int j=0;j<5;j++){",
    "      float u = (float(j)+.2+.6*h11(id+float(j)*7.1))/5.*.92+.04;",
    "      float by = .78 - u*cyc;",
    "      float passed = step(u, ph);",
    "      grow += passed*.05 + .3*smoothstep(.03,0.,abs(ph-u)*cyc);",
    "      float age = (ph-u)*cyc;",
    "      float vis = passed*smoothstep(.75,.15,age)*(1.-smoothstep(.82,.98,ph));",
    "      float bx = x + (h11(id*5.+float(j))-.5)*rad*2.2;",
    "      float br = rad*(.2+.28*h11(id+float(j)*5.))*vis;",
    "      if (br > 0.0005) addDrop(bh, bn, p-vec2(bx, by+.016*sin(u*55.)), br, 1.1);",
    "    }",
    "    float spawn = smoothstep(0.,.04,ph)*(1.-smoothstep(.93,1.,ph));",
    "    addDrop(bh, bn, p-vec2(x,y), rad*grow*spawn, 1.4);",
    "    float dy = p.y - y; float L = .26+.2*r2;",
    "    float tw = rad*.5;",
    "    float tm = step(0.,dy)*smoothstep(L,0.,dy)*smoothstep(tw,tw*.35,abs(p.x-x-.002*sin(dy*60.)))*spawn;",
    "    trail = max(trail, tm);",
    "    if (tm > .02){ float th = tm*.13; if (th > bh){ bh = th; bn = vec2((p.x-x)/tw*.5, 0.); } }",
    "  }",
    "}",
    "vec3 neonPal(float h, float g){ return h < .3 ? vec3(1.,.12,.55) : (h < .55 ? vec3(.1,.85,1.) : (h < .75 ? vec3(.62,.25,1.) : (g < .5 ? vec3(1.,.62,.15) : vec3(.2,1.,.7)))); }",
    "vec3 backdrop(vec2 uv){",
    "  vec3 base = mix(uBg*1.5+.05, uBg*2.1+.09, smoothstep(-.5,.5,uv.y)); base = mix(base, uBg*(.9+.2*uLight), uLight);",
    "  base = mix(base, base*.72 + uAcc*.1, uLight);",
    "  vec3 c = base;",
    "  for (int l=0;l<3;l++){",
    "    float fl = float(l);",
    "    vec2 g = uv*(2.6+fl*2.4) + vec2(fl*13., fl*7.);",
    "    vec2 id = floor(g), f = fract(g)-.5;",
    "    vec2 j = (h22(id+fl)-.5)*.45;",
    "    float rad = .18+.22*h21(id+3.+fl);",
    "    float glow = smoothstep(rad, rad*.55, length(f-j));",
    "    vec3 col = NEONV > .5 ? neonPal(h21(id+9.), h21(id+14.)) : mix(uAcc*1.3, vec3(1.,.82,.6), h21(id+9.));",
    "    col = mix(col, col.bgr*.8+vec3(.1), step(.78, h21(id+21.)));",
    "    c += col*glow*(.5-.12*fl)*step(.35,h21(id+5.))*(1.+NEONV*1.1);",
    "  }",
    "  return c;",
    "}",
    "float bolt(vec2 p, float x0, float seed){",
    "  float y = p.y;",
    "  float off = (vn(vec2(y*6.,seed))-.5)*.14 + (vn(vec2(y*21.,seed+5.))-.5)*.045 + (vn(vec2(y*57.,seed+9.))-.5)*.014;",
    "  float x = x0 + off + (y-.5)*.16;",
    "  float d = abs(p.x-x);",
    "  float endY = -.12 - .22*fract(seed*.37);",
    "  float vis = smoothstep(endY, endY+.08, y) * smoothstep(.6,.4,y);",
    "  return (exp(-d*260.)*.9 + exp(-d*22.)*.35)*vis;",
    "}",
    "vec4 rainFx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp();",
    "  float I = clamp(uInt, 0., 1.3);",
    "  float dens = mix(.2, 1., min(I,1.)) * mix(1., .3, FROSTV);",
    "  float bh = 0.; vec2 bn = vec2(0.); float trail = 0.;",
    "  if (FROSTV < .5) sliders(p, floor(a*14.), dens*.9, bh, bn, trail);",
    "  if (uQ > .5) beads(p, 26., 1.3, dens*.38, bh, bn);",
    "  beads(p, 64., 7.7, dens*.5, bh, bn);",
    "  if (uQ > 1.5) beads(p, 110., 3.1, dens*.5, bh, bn);",
    "  vec3 col = vec3(0.); float al = 0.;",
    // condensation: milky haze that sliding drops and beads wipe clear
    "  float haze = fbmQ(p*vec2(2.5,3.5) + vec2(0., uTime*.01), uQ > 1.5 ? 4 : 2);",
    "  float fogA = (.05 + .07*haze)*smoothstep(0.,.8,I)*(1.-trail*.95)*(1.-smoothstep(0.,.05,bh));",
    "  if (FROSTV > .5) {",
    "    float fr = fbmQ(p*9.+vec2(3.,1.), uQ > 1.5 ? 4 : 3); float edge = smoothstep(.38,.95, length(p*vec2(.55,1.))); edge *= edge;",
    "    float crys = 1.-abs(2.*vn(p*34.+fr*3.)-1.);",
    "    fogA = (.012+.03*haze + edge*(.08 + .5*pow(crys,5.)*fr))*smoothstep(0.,.7,I);",
    "    fogA *= 1. - smoothstep(0.,.05,bh);",
    "  }",
    "  fogA *= mix(1., .4, uLight);",
    "  vec3 fogc = mix(vec3(.74,.82,.92), vec3(.3,.36,.45), uLight*.7);",
    "  col += fogc*fogA; al += fogA;",
    "  if (bh > .002) {",
    "    vec3 N = normalize(vec3(bn*1.15, sqrt(max(.18, 1.-dot(bn,bn)))));",
    "    vec3 lens = backdrop(p*.55 - bn*.2);",
    "    float rim = smoothstep(.55,1.,length(bn));",
    "    float fl = uFlash;",
    "    lens *= 1. + fl*2.2;",
    "    lens = mix(lens, mix(vec3(0.), uInk*.35, uLight), rim*.45);",
    "    vec3 L = normalize(vec3(-.45,.7,.6));",
    "    float spec = pow(max(dot(reflect(-L,N), vec3(0.,0.,1.)),0.), 70.);",
    "    float lowRim = pow(clamp(dot(bn, vec2(.5,-.85)),0.,1.),3.)*rim;",
    "    float la = smoothstep(.04,.45,bh)*(.36+.2*uLight)*clamp(I*1.2,.35,1.);",
    "    col = col*(1.-la) + lens*la;",
    "    al = al*(1.-la) + la;",
    "    col += vec3(1.,.97,.92)*(spec*.95 + lowRim*.18)*(1.+fl*1.5)*la;",
    "  }",
    "  if (STORMV > .5) {",
    // wind-driven rain streaks
    "    vec2 q = vec2(p.x*cos(.16)-p.y*sin(.16), p.x*sin(.16)+p.y*cos(.16));",
    "    float st = 0.;",
    "    for (int l=0;l<2;l++){",
    "      float fl = float(l); vec2 g = vec2(q.x*(70.+fl*45.), q.y*(2.2+fl*1.2) + uTime*(2.4+fl*1.1));",
    "      vec2 id = floor(g); float r = h21(id+fl*11.); vec2 f = fract(g);",
    "      float xx = abs(f.x-(.3+.4*h21(id+2.)));",
    "      st += step(.55, r)*smoothstep(.1,.0,xx)*smoothstep(0.,.35,f.y)*smoothstep(1.,.35,f.y)*(.5-.15*fl);",
    "    }",
    "    vec3 sc = mix(vec3(.72,.82,.95), vec3(.2,.26,.36), uLight*.8);",
    "    float sa = st*.1*clamp(I,0.,1.2);",
    "    col += sc*sa; al += sa;",
    "    float sky = smoothstep(-.5,.5,p.y);",
    "    vec3 fcol = vec3(.72,.82,1.);",
    "    col += fcol*uFlash*(.09+.2*sky);",
    "    float b = bolt(p, uBolt.x*a*.5, uBolt.z)*uBolt.y;",
    "    col += vec3(.82,.9,1.)*b*.9; al += b*.35;",
    "    float dark = .12*clamp(I,0.,1.)*(1.-uFlash);",
    "    al += dark; col *= 1.;",
    "  }",
    "  return vec4(col, clamp(al,0.,.9));",
    "}"
  ].join("\n") + "\n";

  FX.register("rain-on-glass", { glsl: "#define STORMV 0.\n#define FROSTV 0.\n#define NEONV 0.\n" + RAIN, passes: [{ frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" }], layer: "front", still: 20 });
  FX.register("storm", { glsl: "#define STORMV 1.\n#define FROSTV 0.\n#define NEONV 0.\n" + RAIN, passes: [{ frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" }], layer: "front", lightning: true, still: 20 });
  FX.register("glass-frost", { glsl: "#define STORMV 0.\n#define FROSTV 1.\n#define NEONV 0.\n" + RAIN, passes: [{ frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" }], layer: "front", still: 20 });

  /* ===================== instanced particle vertex shaders ===================== */
  // Shared header for instanced passes: attribute-less quad from gl_VertexID, per-instance hashes from gl_InstanceID.
  var VHEAD = FX.vhead;   // engine-owned: uniforms, h11/h21/rot2, mEnv(), warp() (parallax + tap push), emit(), cull()

  /* ===================== embers: instanced sparks + heat shimmer ===================== */
  FX.register("embers", {
    layer: "front", still: 9,
    glsl: P,
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3);",
        "  float y01 = fc.y/uRes.y;",
        "  float flick = .8 + .2*vn(vec2(uTime*3.1, 1.));",
        "  float glow = pow(1.-y01, 3.2)*flick*(.4+.6*vn(vec2(p.x*3.+uTime*.3, 2.)));",
        "  vec2 q = vec2(p.x*7., p.y*2.8 - uTime*.9);",
        "  q += vec2(fbmQ(q*.7+uTime*.2, 2)*1.3, 0.);",
        "  float rid = 1.-abs(2.*vn(q)-1.);",
        "  float shim = pow(rid, 5.)*smoothstep(.15,-.5,p.y+.05)*.5;",
        "  vec3 hot = mix(vec3(1.,.42,.1), uAcc, .15);",
        "  vec3 c = hot*(glow*.3 + shim*.1)*I;",
        "  float al = (glow*.045 + shim*.03)*I*mix(.4,2.,uLight);",
        "  return vec4(c, al);",
        "}"].join("\n") },
      { count: [160, 320, 520, 760],
        vert: VHEAD + [
          "void main(){",
          "  float fi = float(gl_InstanceID);",
          "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
          "  float r1=h11(fi), r2=h11(fi+11.1), r3=h11(fi+23.7), r4=h11(fi+37.3);",
          "  float life = 5.5+7.*r2; float age = fract(uTime/life + r1);",
          "  float asp = uRes.x/uRes.y;",
          "  float rise = (.55+1.1*r3);",
          "  float y = -1.08 + age*2.2*rise;",
          "  float x0 = (r1*2.-1.) * (1.0 + .0*asp);",
          "  float x = x0 + sin(age*(5.+7.*r2)+r1*40.)*.05*(.3+age) + age*.12*sin(uTime*.2+r4*6.);",
          "  float fade = smoothstep(0.,.05,age)*(1.-smoothstep(.45,1.,age));",
          "  float flick = .55+.45*sin(uTime*(7.+13.*r2)+r1*60.);",
          "  float px = (1.2+3.4*r3*r3)*uScale;",
          "  float bright = fade*flick*(.5+.5*r4);",
          "  if (r4 > .25+.75*min(uInt,1.)) { cull(); return; }",
          "  emit(vec2(x,y), vec2(px*5.5, px*(5.5+4.*rise)), corner, vec4(1.-age, bright, r3, 0.));",
          "}"].join("\n"),
        ifrag: [
          "vec4 fxi(){",
          "  vec2 q = vQ*vec2(1.,.72); float d = length(q);",
          "  float core = exp(-d*d*34.); float halo = exp(-d*5.)*.22;",
          "  vec3 col = mix(vec3(1.,.28,.04), vec3(1.,.82,.45), core*(.4+.6*vA.x));",
          "  col = mix(col, uTint*1.2, .12);",
          "  float e = (core + halo)*vA.y*uInt;",
          "  return vec4(col*e, e*mix(.35,.95,uLight)*.9);",
          "}"].join("\n") }
    ]
  });

  /* ===================== snow: depth-layered bokeh flakes, slow wind gusts ===================== */
  var SNOWV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi), r2=h11(fi+5.3), r3=h11(fi+17.9), r4=h11(fi+41.1);",
    "  float z = floor(r1*5.)/4.;",
    "  float asp = uRes.x/uRes.y;",
    "  float speed = .05+.17*z; float span = 2.4;",
    "  float age = fract(uTime*speed/span*.9 + r2);",
    "  float y = 1.12 - age*span;",
    "  float gust = sin(uTime*.13+z*1.7)*.2 + sin(uTime*.37+r3*2.)*.07*(1.+z) + pow(max(0.,sin(uTime*.071+.6)),3.)*.35;",
    "  float x = (r3*2.-1.)*1.15 + gust*(.5+z) + sin(uTime*(.5+r4)+r2*30.)*.02*(1.-.5*z) + (y)*.08*gust;",
    "  float px = (1.1+10.*z*z*(.6+.6*r4))*uScale;",
    "  float focus = abs(z-.62);",
    "  float blur = smoothstep(.05,.55,focus);",
    "  if (r4 > .2+.8*min(uInt,1.)) { cull(); return; }",
    "  float br = (.35+.65*z)*(1.-.55*blur)*smoothstep(0.,.04,age)*(1.-smoothstep(.93,1.,age));",
    "  emit(vec2(x,y), vec2(px), corner, vec4(blur, br, z, r2));",
    "}"].join("\n");
  var SNOWF = [
    "vec4 fxi(){",
    "  float d = length(vQ); if (d > 1.) return vec4(0.);",
    "  float sharp = smoothstep(1.,.55,d);",
    "  float soft = smoothstep(1.,0.,d);",
    "  float ring = smoothstep(.2,0.,abs(d-.82))*.5;",
    "  float a = mix(sharp, soft*.5+ring*vA.x, vA.x)*vA.y;",
    "  vec3 col = mix(vec3(.93,.97,1.), vec3(.26,.34,.5), uLight*.75);",
    "  return vec4(col*a, a*mix(.55,.92,uLight));",
    "}"].join("\n");
  FX.register("snow", {
    layer: "front", still: 11, glsl: P,
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){ vec2 p = P(fc); float I=clamp(uInt,0.,1.3);",
        "  float m = fbmQ(vec2(p.x*1.6+uTime*.012, p.y*2.2), uQ>1.5?4:2);",
        "  float low = smoothstep(.2,-.55,p.y);",
        "  float a = (.04+.08*m)*low*I;",
        "  vec3 c = mix(vec3(.78,.86,.96), vec3(.42,.5,.62), uLight*.7);",
        "  return vec4(c*a, a*mix(.7,1.,uLight)); }"].join("\n") },
      { count: [220, 480, 800, 1200], vert: SNOWV, ifrag: SNOWF }
    ]
  });

  /* ===================== fog + volumetric god rays ===================== */
  var FOGLIB = P + [
    "vec4 fogRays(vec2 fc, float rays, float warm){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
    "  vec2 L = vec2(-a*.5-.12, .66);",
    "  vec2 dl = p-L; float ang = atan(dl.y, dl.x); float r = length(dl);",
    "  float rr = vn(vec2(ang*13., t*.05))*.55 + vn(vec2(ang*33., -t*.04+3.))*.3 + vn(vec2(ang*71., t*.07))*.15;",
    "  rr = smoothstep(.38,.85, rr);",
    "  vec2 q = p*1.5 + vec2(t*.02, 0.);",
    "  float w = fbmQ(q + fbmQ(q*1.3 - t*.03, 2), uQ>1.5?5:3);",
    "  float fogA = smoothstep(.22,.8,w)*(.2+.22*smoothstep(.4,-.5,p.y));",
    "  float fall = exp(-r*.95);",
    "  float dust = .55+.9*fbmQ(p*2.4+vec2(t*.04,-t*.02), 2);",
    "  float la = rr*fall*dust*rays*(.3+fogA*2.4);",
    "  vec3 lc = mix(vec3(1.,.86,.62), uAcc*1.35+vec3(.2,.15,.05), warm);",
    "  vec3 fc2 = mix(vec3(.66,.72,.8), uBg*.55+vec3(.18,.17,.16), .35);",
    "  fc2 = mix(fc2, mix(vec3(.55,.5,.45), uInk*.5, .4), uLight*.7);",
    "  float fa = fogA*I*mix(1.5,1.1,uLight);",
    "  vec3 col = fc2*fa + lc*la*I*.55;",
    "  return vec4(col, fa*.85 + la*I*.04);",
    "}"
  ].join("\n") + "\n";
  FX.register("fog", { layer: "front", still: 17, glsl: FOGLIB, passes: [{ frag: "vec4 fx(vec2 fc){ return fogRays(fc, 1., .4); }" }] });
  FX.register("godrays", { layer: "front", still: 17, glsl: FOGLIB, passes: [{ frag: "vec4 fx(vec2 fc){ return fogRays(fc, 2.1, .6); }" }] });

  /* dust: motes drifting inside light shafts (Midnight Gallery, Roman Treasury, Captain's Cabin) */
  var DUSTV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi), r2=h11(fi+7.7), r3=h11(fi+19.1), r4=h11(fi+33.3);",
    "  float asp = uRes.x/uRes.y;",
    "  vec2 c = vec2((r1*2.-1.)*1.1, (r2*2.-1.)*1.05);",
    "  vec2 pos = c + vec2(sin(uTime*(.07+.1*r3)+r1*30.)*.08, cos(uTime*(.05+.09*r4)+r2*30.)*.07 - uTime*.006*(.3+r3));",
    "  pos.y = mod(pos.y+1.1, 2.2)-1.1;",
    "  // inside the beam cone from the top-left corner: brightness by angular distance to the beam axis",
    "  vec2 q = vec2(pos.x*asp*.5, pos.y*.5) - vec2(-asp*.5-.12, .66);",
    "  float ang = atan(q.y,q.x); float beam = smoothstep(.5,.0,abs(ang+.78)) ;",
    "  float tw = .5+.5*sin(uTime*(.6+r3*1.8)+r1*50.);",
    "  float px = (.8+2.2*r4*r4)*uScale;",
    "  if (r4 > .3+.7*min(uInt,1.)) { cull(); return; }",
    "  float b = (.25+.75*beam)*tw*(.4+.6*r3);",
    "  emit(pos, vec2(px*3.), corner, vec4(b, 0., 0., 0.));",
    "}"].join("\n");
  FX.register("dust", {
    layer: "front", still: 8, glsl: FOGLIB,
    passes: [
      { frag: "vec4 fx(vec2 fc){ return fogRays(fc, 1.8, .55)*vec4(1.,1.,1.,.5); }" },
      { count: [90, 160, 260, 380], vert: DUSTV,
        ifrag: "vec4 fxi(){ float d=length(vQ); float a=exp(-d*d*5.)*vA.x; vec3 c=mix(vec3(1.,.92,.75), uTint*1.4, .2); return vec4(c*a*uInt*.8, a*uInt*.1*mix(.2,1.,uLight)); }" }
    ]
  });

  /* ===================== caustics: underwater light ===================== */
  var CAUSTICLIB = P + [
    "float causticField(vec2 q, float t){",
    "  vec2 w = vec2(vn(q*1.3+t*.7), vn(q*1.3-t*.5+5.))-.5;",
    "  q += w*1.7;",
    "  float a = 1.-abs(2.*vn(q*2.1+vec2(t,-t*.8))-1.);",
    "  float b = 1.-abs(2.*vn(q*3.7-vec2(t*.9,t*.6)+13.)-1.);",
    "  return pow(a*b, 2.6)*2.2 + pow(a, 14.)*.25;",
    "}"
  ].join("\n") + "\n";
  FX.register("caustics", {
    layer: "front", still: 6, glsl: CAUSTICLIB,
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3); float t = uTime*.32;",
        "  vec2 q = p*2.6;",
        "  float sep = .012*(uQ>.5?1.:0.);",
        "  vec3 c = vec3(causticField(q+vec2(sep,0.), t), causticField(q, t), causticField(q-vec2(sep,0.), t));",
        "  float top = smoothstep(-.55,.55,p.y);",
        "  float beams = pow(.5+.5*sin(p.x*6.5 + p.y*1.6 + sin(uTime*.2+p.x*2.)*1.6), 5.)*smoothstep(-.4,.6,p.y)*.35;",
        "  vec3 tint = mix(vec3(.3,.85,1.), uAcc, .15);",
        "  vec3 light = (c*tint*(.35+.65*top) + beams*tint*.5)*I*.22;",
        "  vec3 deep = vec3(.0,.08,.12)*(.35*I)*(1.-top*.6);",
        "  float al = .035*I + .0*top;",
        "  return vec4(light + deep*.3, al*mix(1.,2.,uLight));",
        "}"].join("\n") },
      { count: [40, 90, 150, 220],
        vert: DUSTV.replace("float beam = smoothstep(.5,.0,abs(ang+.78)) ;", "float beam = 1.;").replace("pos.y = mod(pos.y+1.1, 2.2)-1.1;", "pos.y = mod(pos.y+1.1, 2.2)-1.1;"),
        ifrag: "vec4 fxi(){ float d=length(vQ); float a=exp(-d*d*6.)*vA.x; return vec4(vec3(.6,.9,1.)*a*uInt*.5, a*uInt*.12); }" }
    ]
  });

  /* ===================== aurora ===================== */
  FX.register("aurora", {
    layer: "front", still: 30, glsl: P,
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec3 acc = vec3(0.);",
      "  for (int i=0;i<3;i++){",
      "    if (i>=2 && uQ<1.) break;",
      "    float fi = float(i);",
      "    float x = p.x*max(1., 1.2/a)*(1.05+fi*.4) + t*(.012+fi*.006)*(mod(fi,2.)<.5?1.:-1.);",
      "    float wave = vn(vec2(x*1.3, t*.045+fi*7.))*1.6 + vn(vec2(x*3.1, -t*.06+fi*3.))*.5;",
      "    float base = .06 + fi*.07 + (wave-1.)*.22;",
      "    float d = p.y - base;",
      "    float edge = smoothstep(-.02,.012,d)*exp(-max(d,0.)*(4.2-fi*.7));",
      "    float streak = .55+.45*vn(vec2(x*46.+fi*5., t*.35));",
      "    streak = mix(1., streak, smoothstep(0.,.25,d));",
      "    float sway = .6+.4*vn(vec2(x*.7+fi, t*.08));",
      "    float v = edge*streak*sway;",
      "    vec3 g = vec3(.15,1.,.55), te = vec3(.1,.8,.8), vi = vec3(.62,.28,.95);",
      "    vec3 col = mix(mix(g, te, smoothstep(0.,.2,d)), vi, smoothstep(.18,.5,d));",
      "    col = mix(col, col*(uAcc*1.2+.3), .12);",
      "    acc += col*v*(.62-fi*.12);",
      "  }",
      "  float sky = smoothstep(-.3,.5,p.y);",
      "  vec2 g2 = fc/uScale/9.; vec2 id = floor(g2); float sr = h21(id);",
      "  float star = step(.985, sr)*smoothstep(.3,0.,length(fract(g2)-.5-.3*(h22(id)-.5)))*(.5+.5*sin(t*(1.+3.*h21(id+1.))+sr*40.))*sky*.55;",
      "  vec3 c = acc*I*.5 + vec3(star)*I;",
      "  float al = max(max(c.r,c.g),c.b)*.28*mix(1.,1.8,uLight);",
      "  return vec4(c, al);",
      "}"].join("\n") }]
  });

  /* ===================== stars (Observatory, Caravanserai) ===================== */
  FX.register("stars", {
    layer: "front", still: 5, glsl: P,
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float ang = t*.0035; vec2 q = vec2(p.x*cos(ang)-p.y*sin(ang), p.x*sin(ang)+p.y*cos(ang));",
        "  vec3 c = vec3(0.);",
        "  float dens = .5+.5*min(I,1.);",
        "  for (int l=0;l<3;l++){",
        "    if (l>=2 && uQ<1.) break;",
        "    float fl = float(l); float sc = 22.+fl*26.;",
        "    vec2 g = q*sc+fl*31.; vec2 id = floor(g); vec2 f = fract(g)-.5;",
        "    float r = h21(id+fl*5.); vec2 j = (h22(id+3.)-.5)*.5;",
        "    float on = step(1.-.07*dens*(1.-.25*fl), r);",
        "    float d = length(f-j);",
        "    float tw = .65+.35*sin(t*(.8+2.4*h21(id+8.))+r*60.);",
        "    float core = smoothstep(.07+.05*h21(id), 0., d);",
        "    float cross = (1./(1.+900.*abs(f.x-j.x)*abs(f.y-j.y)))*smoothstep(.35,0.,d)*step(.92,r*1.0+h21(id+4.)*.08+.0)*.6;",
        "    vec3 sc2 = mix(vec3(.75,.85,1.), vec3(1.,.88,.7), h21(id+2.));",
        "    c += sc2*(core+cross)*tw*on*(.55+.45*h21(id+6.));",
        "  }",
        "  float sky = smoothstep(-.45,.45,p.y);",
        "  float mw = smoothstep(.2,0.,abs(dot(q, normalize(vec2(1.,-.55)))-.05))*fbmQ(q*3.+4.,3)*.18;",
        "  c = (c*.9 + vec3(.55,.62,.85)*mw)*sky*I;",
        "  float al = max(max(c.r,c.g),c.b)*mix(.25,.9,uLight);",
        "  return vec4(c*mix(1.,.5,uLight), al);",
        "}"].join("\n") }
    ]
  });

  /* ===================== prism / kaleidoscope: light leaks, dispersion beams, glints ===================== */
  FX.register("prism", {
    layer: "front", still: 8, glsl: P,
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec3 acc = vec3(0.);",
      "  for (int i=0;i<3;i++){",
      "    float fi = float(i);",
      "    vec2 c = vec2(sin(t*.06*(fi+1.)+fi*2.1)*a*.62, cos(t*.045*(fi+1.4)+fi*1.3)*.55);",
      "    float r = .42+.18*sin(t*.1+fi);",
      "    float leak = exp(-pow(length(p-c)/r,2.)*2.2);",
      "    acc += hsv(fract(t*.018+fi*.31), .62, 1.)*leak*.34;",
      "  }",
      "  float ang = .5+.22*sin(t*.09); vec2 dir = vec2(cos(ang), sin(ang)), nrm = vec2(-dir.y, dir.x);",
      "  vec2 o = vec2(-a*.55, -.5); vec2 d0 = p-o; float s = dot(d0, dir); float dd = dot(d0, nrm);",
      "  float w = .016+.01*sin(t*.3); float dl = .02+.012*sin(t*.17);",
      "  vec3 beam = vec3(exp(-pow(dd/w,2.)), exp(-pow((dd-dl)/w,2.)), exp(-pow((dd-2.*dl)/w,2.)));",
      "  beam *= smoothstep(0.,.3,s)*smoothstep(1.9,.5,s);",
      "  acc += beam*vec3(1.,1.,1.)*.55 + hsv(fract(dd*9.+t*.03),.7,1.)*smoothstep(.06,0.,abs(dd-dl))*.0;",
      "  vec3 rb = hsv(fract(dd*14.+.1), .75, 1.)*smoothstep(.2,0.,abs(dd-.07))*smoothstep(0.,.3,s)*smoothstep(1.9,.5,s)*.22;",
      "  acc += rb;",
      "  float glint = 0.;",
      "  vec2 g = p*4.5 + vec2(3.,1.); vec2 id = floor(g); vec2 f = fract(g)-.5; vec2 j = (h22(id)-.5)*.5;",
      "  float on = step(.55, h21(id+4.)); float tw = pow(max(0.,sin(t*(.6+h21(id)*1.4)+h21(id+2.)*30.)),10.);",
      "  vec2 fq = f-j; float star = (exp(-abs(fq.x)*38.)*exp(-abs(fq.y)*5.5) + exp(-abs(fq.y)*38.)*exp(-abs(fq.x)*5.5))*.6 + exp(-dot(fq,fq)*160.);",
      "  vec3 gc = hsv(fract(h21(id)+t*.02),.3,1.);",
      "  acc += gc*star*tw*on*.9*(uQ>.5?1.:0.);",
      "  float vig = smoothstep(.2,.9,length(p*vec2(.7,1.)));",
      "  acc *= .55+.6*vig;",
      "  vec3 c = acc*I*.5;",
      "  float al = max(max(c.r,c.g),c.b)*.12*mix(1.,2.,uLight);",
      "  return vec4(c, al);",
      "}"].join("\n") }]
  });

  /* ===================== smoke / incense: drifting ribbons (Blue Note, Alchemist, Temple Garden) ===================== */
  var SMOKELIB = P + [
    "vec4 smokeFx(vec2 fc, float rise, float warm){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
    "  vec2 q = vec2(p.x*1.4, p.y*1.1 - t*.035*rise);",
    "  vec2 w = vec2(fbmQ(q*1.2+vec2(0.,t*.03),3), fbmQ(q*1.2+vec2(5.,-t*.02),3));",
    "  q += (w-.5)*1.9;",
    "  float f = fbmQ(q*1.3, uQ>1.5?5:3);",
    "  float ribbon = smoothstep(.46,.6,f)*smoothstep(.85,.58,f);",
    "  float body = smoothstep(.3,.7,f)*.5;",
    "  float rise2 = smoothstep(-.55,.1,p.y)*(1.-smoothstep(.1,.6,p.y)*.6);",
    "  float d = (ribbon*.8 + body*.5)*rise2;",
    "  vec3 sc = mix(vec3(.68,.7,.76), uAcc*.8+vec3(.35), warm);",
    "  sc = mix(sc, mix(vec3(.4,.38,.36), uInk*.5, .5), uLight*.7);",
    "  float aa = d*.14*I;",
    "  vec3 lit = vec3(1.,.8,.55)*pow(ribbon,2.)*.06*I*warm*(1.-uLight);",
    "  return vec4(sc*aa + lit, aa);",
    "}"
  ].join("\n") + "\n";
  FX.register("smoke", { layer: "front", still: 12, glsl: SMOKELIB, passes: [{ frag: "vec4 fx(vec2 fc){ return smokeFx(fc, 1., .5); }" }] });
  FX.register("incense", { layer: "front", still: 12, glsl: SMOKELIB, passes: [{ frag: "vec4 fx(vec2 fc){ return smokeFx(fc, .7, .15)*.8; }" }] });

  /* ===================== candle / torch / lantern flicker light ===================== */
  FX.register("candle", {
    layer: "front", still: 3, glsl: P,
    passes: [{ frag: [
      "float flameFlick(float t, float s){ return .72 + .16*vn(vec2(t*5.3, s)) + .09*sin(t*11.+s*6.) + .05*vn(vec2(t*17., s+3.)); }",
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec3 acc = vec3(0.);",
      "  for (int i=0;i<3;i++){",
      "    if (i>=2 && uQ<1.) break;",
      "    float fi = float(i);",
      "    vec2 c = vec2((fi==0.? -.42 : fi==1. ? .5 : .05)*a, fi==0.? -.4 : fi==1. ? -.46 : -.62);",
      "    c += vec2(vn(vec2(t*.8,fi))-.5, vn(vec2(t*.7,fi+4.))-.5)*.012;",
      "    float f = flameFlick(t*(1.+.15*fi), fi*9.);",
      "    float d = length((p-c)*vec2(1.,.85));",
      "    float core = exp(-d*d*28.), halo = exp(-d*2.6), wide = exp(-d*1.0);",
      "    acc += vec3(1.,.55,.18)*(core*.35+halo*.22+wide*.06)*f*(fi==2.?.7:1.);",
      "  }",
      "  float breathe = flameFlick(t*.7, 40.);",
      "  vec3 amb = vec3(1.,.5,.15)*breathe*(.025+.03*smoothstep(.6,-.5,p.y));",
      "  float vig = smoothstep(.35,1.05,length(p*vec2(.62,1.)));",
      "  vec3 c = (acc + amb)*I*.5*(.75+.5*vig);",
      "  vec3 warm = c;",
      "  float dark = vig*.2*I*(.7+.3*breathe);",
      "  float al = dark + max(max(warm.r,warm.g),warm.b)*.05*mix(1.,2.,uLight);",
      "  return vec4(warm*mix(1.,.55,uLight), al);",
      "}"].join("\n") }]
  });

  /* ===================== drifting lanterns / petals (Imperial Treasury) ===================== */
  var LANTV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi), r2=h11(fi+3.1), r3=h11(fi+9.7), r4=h11(fi+21.3);",
    "  bool lantern = fi < 14.;",
    "  float asp = uRes.x/uRes.y;",
    "  float speed = lantern ? .012+.012*r2 : .04+.05*r2;",
    "  float span = 2.5;",
    "  float age = fract(uTime*speed/span + r1);",
    "  float y = lantern ? -1.15 + age*span : 1.1 - age*span;",
    "  float x = (r3*2.-1.)*1.05 + sin(uTime*(lantern?.12:.4+r4)+r1*40.)*(lantern?.05:.08) + (lantern?0.:age*.2*sin(uTime*.05));",
    "  float px = lantern ? (14.+16.*r4)*uScale : (3.+3.*r4)*uScale;",
    "  if (!lantern && fi > 10.+90.*min(uInt,1.3)) { cull(); return; }",
    "  if (lantern && fi > 3.+11.*min(uInt,1.)) { cull(); return; }",
    "  float fade = smoothstep(0.,.1,age)*(1.-smoothstep(.85,1.,age));",
    "  float rot = lantern ? 0. : uTime*(.4+r2)+r1*6.;",
    "  vec2 cr = lantern ? corner : vec2(corner.x*cos(rot)-corner.y*sin(rot), (corner.x*sin(rot)+corner.y*cos(rot))*.55);",
    "  gl_Position = vec4(warp(vec2(x,y),1.) + cr*px*2./uRes, 0., 1.);",
    "  vQ = corner; vA = vec4(lantern?1.:0., fade*(lantern ? .9+.1*sin(uTime*3.+r1*20.) : .7), r4, r2);",
    "}"].join("\n");
  FX.register("lanterns", {
    layer: "front", still: 14, glsl: P,
    passes: [{ count: [60, 90, 120, 150], vert: LANTV, ifrag: [
      "vec4 fxi(){",
      "  float d = length(vQ);",
      "  if (vA.x > .5) {",
      "    vec2 bq = abs(vQ*vec2(1.15,.9)); float body = smoothstep(1.,.7,max(bq.x*1.05, bq.y)) * (.7+.5*smoothstep(.8,0.,bq.y));",
      "    float glow = exp(-d*2.2)*.55;",
      "    vec3 c = mix(vec3(1.,.5,.12), vec3(1.,.8,.4), exp(-d*d*4.));",
      "    float e = (body*.5 + glow)*vA.y*uInt;",
      "    return vec4(c*e, e*mix(.3,.8,uLight));",
      "  }",
      "  float pet = smoothstep(1.,.6,length(vQ*vec2(1.,1.5)));",
      "  vec3 c = mix(vec3(1.,.72,.78), vec3(.9,.35,.45), vA.z);",
      "  c = mix(c, vec3(1.,.82,.5), step(.7, vA.w)*.6);",
      "  float e = pet*vA.y*uInt*.85;",
      "  return vec4(c*e*.9, e*.7);",
      "}"].join("\n") }]
  });

  /* ===================== scanlines + fog (Black Site) ===================== */
  FX.register("scanlines", {
    layer: "front", still: 5, glsl: P + FOGLIB.replace(P, ""),
    passes: [
      { frag: "vec4 fx(vec2 fc){ vec4 f = fogRays(fc, 0., 0.); return f*vec4(.7,.8,.9,.8); }" },
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float lines = .5+.5*sin(fc.y/uScale*3.14159*.9);",
        "  float sweepY = fract(t*.07)*1.4-.7;",
        "  float band = exp(-pow((p.y-sweepY)/.07,2.));",
        "  float wob = .9+.1*sin(t*40.);",
        "  vec3 sc = mix(vec3(.3,.9,.75), uAcc, .15);",
        "  float scan = (1.-lines)*.1*I;",
        "  vec3 c = sc*(band*.45*wob*I + scan*.4);",
        "  float al = scan*.9*mix(1.,1.5,uLight);",
        "  float vig = smoothstep(.4,1.1,length(p*vec2(.6,1.)))*.18*I;",
        "  return vec4(c, al+vig);",
        "}"].join("\n") }
    ]
  });

  /* ===================== film: grain, vignette, gate weave, halation (finishing layer) ===================== */
  FX.register("film", {
    layer: "front", still: 3, glsl: P,
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  float F = clamp(uFilm,0.,1.); if (F <= 0.) return vec4(0.);",
      "  float t = uTime; vec2 uv = fc/uRes; float a = asp();",
      "  vec2 weave = vec2(sin(t*1.9)+.6*sin(t*4.3+1.), sin(t*2.3+2.)+.5*sin(t*5.1))*.6/uRes*uScale*uStatic*0. + vec2(sin(t*1.9)+.6*sin(t*4.3+1.), sin(t*2.3+2.)+.5*sin(t*5.1))*.7/uRes*uScale*(1.-uStatic);",
      "  vec2 d = (uv-.5-weave)*vec2(a,1.);",
      "  float vig = smoothstep(.5,1.12,length(d*1.05))*.34*F;",
      "  float fr = floor(t*24.)*(1.-uStatic);",
      "  float g = (h21(floor(fc/max(1.,uScale*.9)) + fr*17.3) - .5)*.1*F;",
      "  float edge = pow(smoothstep(.45,1.1,length(d)), 3.);",
      "  vec3 hal = vec3(1.,.38,.16)*edge*.07*F;",
      "  float flick = 1.+.04*sin(t*13.)*(1.-uStatic);",
      "  vec3 c = (vec3(max(g,0.)) + hal)*flick;",
      "  return vec4(c, vig + max(-g,0.));",
      "}"].join("\n") }]
  });

  /* =====================================================================================================================
     fx-v3: one signature preset per theme. Each declares `moments` (rare events, see engine.js), `front` (sparse large
     out-of-focus layer), `tap` (ripple / push on click or touch) and, for bright particle passes, `glow` (cheap bloom).
     Shader conventions are the same as above: premultiplied, alpha 0 + rgb = additive light, rgb 0 + alpha = darkening.
     ===================================================================================================================== */
  var L3 = [
    "float ridge(vec2 q){ return 1.-abs(2.*vn(q)-1.); }",
    "float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
    "float flick(float t, float s){ return .72 + .16*vn(vec2(t*5.3, s)) + .09*sin(t*11.+s*6.) + .05*vn(vec2(t*17., s+3.)); }",
    "vec4 fin(vec3 c, float al){ return vec4(c*mix(1.,.5,uLight), al*mix(1.,2.,uLight)); }",
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float causticF(vec2 q, float t){ vec2 w = vec2(vn(q*1.3+t*.7), vn(q*1.3-t*.5+5.))-.5; q += w*1.7; float a = 1.-abs(2.*vn(q*2.1+vec2(t,-t*.8))-1.); float b = 1.-abs(2.*vn(q*3.7-vec2(t*.9,t*.6)+13.)-1.); return pow(a*b, 2.6)*2.2 + pow(a, 14.)*.25; }",
    "float star4(vec2 f, float k){ return (exp(-abs(f.x)*k)*exp(-abs(f.y)*k*.14) + exp(-abs(f.y)*k)*exp(-abs(f.x)*k*.14))*.6 + exp(-dot(f,f)*k*k*.09); }",
    "vec4 shaftFx(vec2 p, vec2 L, vec3 lc, float rays){",
    "  float t = uTime; vec2 dl = p-L; float ang = atan(dl.y, dl.x); float r = length(dl);",
    "  float rr = vn(vec2(ang*13., t*.05))*.55 + vn(vec2(ang*33., -t*.04+3.))*.3 + vn(vec2(ang*71., t*.07))*.15;",
    "  rr = smoothstep(.38,.85, rr);",
    "  float w = fbmQ(p*1.5+vec2(t*.02,0.), uQ>1.5?4:2);",
    "  float la = rr*exp(-r*.95)*(.35+w*1.7)*rays;",
    "  return vec4(lc*la, la); }",
    "vec4 smokeV(vec2 p, vec3 tint, float rise, float dens){",
    "  float t = uTime; vec2 q = vec2(p.x*1.4, p.y*1.1 - t*.035*rise);",
    "  vec2 w = vec2(fbmQ(q*1.2+vec2(0.,t*.03),3), fbmQ(q*1.2+vec2(5.,-t*.02),3));",
    "  q += (w-.5)*1.9; float f = fbmQ(q*1.3, uQ>1.5?5:3);",
    "  float ribbon = smoothstep(.46,.6,f)*smoothstep(.85,.58,f), body = smoothstep(.3,.7,f)*.5;",
    "  float d = (ribbon*.8 + body*.5)*smoothstep(-.55,.1,p.y)*(1.-smoothstep(.1,.6,p.y)*.6)*dens;",
    "  return vec4(tint, d); }"
  ].join("\n") + "\n";
  var G3 = P + PX + L3;
  // pointer-facing output helper for particle fragments: additive light on dark themes, ink specks on light ones
  var PO = "float h11(float p){ return fract(sin(p*127.1+31.7)*43758.5453); }\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }\nvec3 hsv(float h, float s, float v){ vec3 k=clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.); return v*mix(vec3(1.),k,s); }\nvec4 pout(vec3 c, float e, float ak){ vec3 cc = mix(c, uInk*.55, uLight); return vec4(cc*e*mix(1.,.7,uLight), e*ak*mix(1.,2.4,uLight)); }\n";

  function N(x) { x = +x; return (x % 1 === 0) ? x.toFixed(1) : String(x); }
  /* generic particle vertex: rise/fall, sway, wind, flicker, spin; `mod` is GLSL that may edit x, y, px, bright, age */
  function PV(o) {
    var d = { dir: 1, speed: 0.05, span: 2.4, sway: 0.04, swf: 0.5, s0: 1.5, s1: 3, dens: 0.2, fin: 0.04, fout: 0.9, flk: 0, ff: 8, wind: 0, bmin: 0.4, sx: 1, sy: 1, spin: 0, dz: 1, x0: 1.12, mod: "" };
    for (var k in o) d[k] = o[k];
    return VHEAD + [
      "void main(){",
      "  float fi = float(gl_InstanceID);",
      "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
      "  float r1=h11(fi), r2=h11(fi+5.3), r3=h11(fi+17.9), r4=h11(fi+41.1);",
      "  float asp = uRes.x/uRes.y;",
      "  float age = fract(uTime*" + N(d.speed) + "*(.6+.8*r2)/" + N(d.span) + " + r1);",
      "  float y = " + (d.dir > 0 ? "-1.12+age*" + N(d.span) : "1.12-age*" + N(d.span)) + ";",
      "  float x = (r3*2.-1.)*" + N(d.x0) + " + sin(uTime*" + N(d.swf) + "*(.5+r4)+r2*30.)*" + N(d.sway) + "*(.4+age) + " + N(d.wind) + "*(age-.5)*" + N(d.span) + ";",
      "  float px = (" + N(d.s0) + "+" + N(d.s1) + "*r3*r3)*uScale;",
      "  float fade = smoothstep(0.," + N(d.fin) + ",age)*(1.-smoothstep(" + N(d.fout) + ",1.,age));",
      "  float bright = fade*(1.-" + N(d.flk) + "*(.5+.5*sin(uTime*" + N(d.ff) + "*(.5+r2)+r1*60.)))*(" + N(d.bmin) + "+(1.-" + N(d.bmin) + ")*r4);",
      d.mod,
      "  if (r4 > " + N(d.dens) + "+(1.-" + N(d.dens) + ")*min(uInt,1.)) { cull(); return; }",
      "  vec2 cr = corner;",
      d.spin ? "  cr = rot2(corner, uTime*" + N(d.spin) + "*(.5+r2)+r1*6.);" : "",
      "  cr *= vec2(" + N(d.sx) + "," + N(d.sy) + ");",
      "  gl_Position = vec4(warp(vec2(x,y)," + N(d.dz) + ") + cr*px*2./uRes, 0., 1.); vQ = corner; vA = vec4(age, bright, r3, r2);",
      "}"].join("\n");
  }
  var F_SOFT = function (col, ak, k) { return PO + "vec4 fxi(){ float d = length(vQ); float e = exp(-d*d*" + N(k || 5) + ")*vA.y*uInt; vec3 c = " + col + "; return pout(c, e, " + N(ak || 0.3) + "); }"; };
  var F_GLINT = function (col, ak) { return PO + "vec4 fxi(){ vec2 q = vQ; float s = (exp(-abs(q.x)*14.)*exp(-abs(q.y)*2.4)+exp(-abs(q.y)*14.)*exp(-abs(q.x)*2.4))*.75 + exp(-dot(q,q)*12.); float e = s*vA.y*uInt; vec3 c = " + col + "; return pout(c, e, " + N(ak || 0.25) + "); }"; };
  function T3(def) { def.layer = "front"; return def; }

  /* ---------- 1. kaleido / Prism: refracting caustic lattice with chromatic split, spectrum sweep, glint flares ---------- */
  FX.register("prismatic", T3({
    still: 11, safe: 0.97, tap: true, glsl: G3,
    front: { rate: 0.5, size: 0.13, alpha: 0.1, kind: 1, color: [0.75, 0.88, 1.0] },
    moments: [{ name: "spectrum-sweep", every: [28, 65], dur: 9 }, { name: "flare", every: [28, 65], dur: 4 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec2 q = p*2.3; float sep = uQ>.5 ? .022 : 0.;",
        "  vec3 sp = vec3(causticF(q+vec2(sep,0.), t*.22), causticF(q, t*.22), causticF(q-vec2(sep,0.), t*.22));",
        "  float m = max(max(sp.r,sp.g),sp.b);",
        "  vec3 hue = hsv(fract(t*.01+p.x*.22+p.y*.16+m*.12), .7, 1.);",
        "  vec3 c = (sp*.5 + hue*m*.6)*.5;",
        "  for (int i=0;i<2;i++){ float fi = float(i); vec2 cc = vec2(sin(t*.05*(fi+1.)+fi*2.1)*a*.6, cos(t*.04*(fi+1.4)+fi*1.3)*.5);",
        "    c += hsv(fract(t*.015+fi*.33), .6, 1.)*exp(-pow(length(p-cc)/.5,2.)*2.)*.16; }",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    if (uMoment.w < .5) { float pos = mix(-a, a, k); float dd = (p.x*.84+p.y*.54)-pos; c += (hsv(fract(dd*3.5+.05), .85, 1.)*.9+.25)*exp(-dd*dd/.012)*sin(PI*k)*.9; }",
        "    else { vec2 fp = vec2((h11(uMoment.y)-.5)*a*1.2, (h11(uMoment.y+3.)-.5)*.8); vec2 f = p-fp; float rr = length(f), env = sin(PI*k);",
        "      c += (hsv(fract(rr*4.-t*.2), .7, 1.)*exp(-pow((rr-.15-k*.25)/.03,2.))*.9 + (exp(-abs(f.x)*16.)*exp(-abs(f.y)*3.)+exp(-abs(f.y)*16.)*exp(-abs(f.x)*3.))*.9 + exp(-rr*rr*60.))*env; }",
        "  }",
        "  float edge = .55+.6*smoothstep(.2,.9,length(p*vec2(.7,1.)));",
        "  c *= edge*I*.47;",
        "  return fin(c, max(max(c.r,c.g),c.b)*.1);",
        "}"].join("\n") },
      { count: [26, 50, 80, 110], glow: 0.9, vert: PV({ speed: 0.03, sway: 0.06, swf: 0.3, s0: 4, s1: 9, dens: 0.2, fin: 0.2, fout: 0.8, flk: 0.95, ff: 2.6, bmin: 0.25 }),
        ifrag: F_GLINT("hsv(fract(vA.z*3.+vA.x*.5+uTime*.03), .45, 1.)", 0.25) }
    ]
  }));

  /* ---------- 2. afterhours / Midnight Gallery: cold moonlight shafts from a skylight, dust in the beam, case-glint ---------- */
  var MOONBEAM = "  vec2 qq = vec2(x*asp*.5, y*.5) - vec2(asp*.5+.14,.7); float cs = dot(normalize(qq), normalize(vec2(-.72,-.69))); bright *= .12+.88*smoothstep(.78,.97,cs);";
  FX.register("moonlit", T3({
    still: 9, tap: "warp", glsl: G3,
    front: { rate: 0.35, size: 0.16, alpha: 0.09, kind: 0, color: [0.7, 0.8, 1.0] },
    moments: [{ name: "case-glint", every: [30, 75], dur: 7 }, { name: "moon-cloud", every: [40, 90], dur: 12 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec4 s = shaftFx(p, vec2(a*.5+.14,.7), vec3(.62,.74,1.), 1.7);",
        "  float cloud = 1. - .6*(uMoment.w > .5 ? mEnv() : 0.);",
        "  float pool = exp(-pow((p.x+a*.1)/(.55*a),2.))*smoothstep(-.1,-.55,p.y)*.07;",
        "  vec3 c = s.rgb*.5*cloud + vec3(.5,.62,.9)*pool;",
        "  float k = mK();",
        "  if (k >= 0. && uMoment.w < .5) { float u = p.x*.8+p.y*.6, pos = mix(-a*.6-.5, a*.6+.5, k); float band = exp(-pow((u-pos)/.05,2.))*sin(PI*k)*(.55+.45*vn(p*34.)); c += vec3(.8,.88,1.)*band*.6; }",
        "  float haze = smoothstep(.3,.8,fbmQ(p*1.3+vec2(t*.015,0.),3))*.05*cloud;",
        "  c = (c + vec3(.45,.55,.8)*haze)*I*.5;",
        "  return fin(c, haze*I*.6 + max(max(c.r,c.g),c.b)*.06);",
        "}"].join("\n") },
      { count: [60, 110, 170, 240], vert: PV({ dir: -1, speed: 0.012, sway: 0.08, swf: 0.15, s0: 1, s1: 2, dens: 0.3, fin: 0.1, fout: 0.9, flk: 0.6, ff: 1.5, bmin: 0.3, mod: MOONBEAM }),
        ifrag: F_SOFT("vec3(.8,.88,1.)", 0.1, 4) }
    ]
  }));

  /* ---------- 3. conservator: daylight on paper. Dust motes, window-frame shadows, a brass loupe gliding past. Ink-toned, very low alpha ---------- */
  FX.register("loupe", T3({
    still: 8, tap: true, glsl: G3, gain: 0.9,
    front: { rate: 0.3, size: 0.14, alpha: 0.07, kind: 0, color: [0.45, 0.33, 0.18] },
    moments: [{ name: "loupe-pass", every: [32, 80], dur: 11 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float u = p.x*.8+p.y*.6;",
        "  float bars = smoothstep(.45,.55,.5+.5*sin(u*4.2+t*.01+vn(p*1.2)*1.4)) * smoothstep(.3,.9,.5+.5*sin(p.y*1.7-p.x*.4+1.3));",
        "  float al = bars*.035*I;",
        "  vec3 c = vec3(.30,.20,.08)*al;",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    vec2 C = vec2(mix(-a*.7, a*.7, k), -.12+.18*sin(k*3.)+ (h11(uMoment.y)-.5)*.3); vec2 f = p-C; float r = length(f);",
        "    float ring = exp(-pow((r-.19)/.0075,2.)), inner = smoothstep(.19,.0,r)*.4, env = sin(PI*k);",
        "    float hand = exp(-pow(dot(f, normalize(vec2(.75,-.66)))/.01,2.))*smoothstep(.0,.35,dot(f, normalize(vec2(.66,.75))))*smoothstep(.55,.2,dot(f, normalize(vec2(.66,.75))))*step(.19,r)*.5;",
        "    float la = (ring*.2 + inner*.012 + hand*.14)*env*I;",
        "    c += vec3(.5,.36,.12)*la;  al += la;",
        "    float gl = pow(max(0., dot(normalize(f+1e-4), normalize(vec2(-.6,.8)))), 14.)*exp(-pow((r-.19)/.012,2.))*env;",
        "    c += vec3(.35)*gl*.3*(1.-uLight*.0); al += gl*.04;",
        "  }",
        "  return vec4(c, al);",
        "}"].join("\n") },
      { count: [36, 60, 90, 120], vert: PV({ dir: -1, speed: 0.01, sway: 0.1, swf: 0.2, s0: 1, s1: 2.4, dens: 0.3, fin: 0.12, fout: 0.88, flk: 0.5, ff: 1.2, bmin: 0.35, sx: 1.2, sy: 0.8, spin: 0.15 }),
        ifrag: F_SOFT("vec3(.75,.62,.4)", 0.22, 3) }
    ]
  }));

  /* ---------- 4. colossus / The Mint: molten sparks on gravity arcs, forge glow, PRESS-STRIKE (flash + shock ring + spark burst) ---------- */
  var SPARKV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi), r2=h11(fi+11.1), r3=h11(fi+23.7), r4=h11(fi+37.3);",
    "  float life = 2.2+2.6*r2; float ph = uTime/life + r1; float age = fract(ph);",
    "  float tt = age*life; float asp = uRes.x/uRes.y;",
    "  vec2 v = vec2((r3-.5)*.75, .5+.7*r2*r4); float g = -.62;",
    "  vec2 pos = vec2((h11(floor(ph)*3.1+fi)*2.-1.)*.9, -1.08) + v*tt + vec2(0., .5*g*tt*tt);",
    "  vec2 vel = v + vec2(0., g*tt);",
    "  float fade = smoothstep(0.,.03,age)*(1.-smoothstep(.55,1.,age));",
    "  float cool = age;",
    "  if (r4 > .22+.78*min(uInt,1.)) { cull(); return; }",
    "  float px = (1.4+2.6*r3)*uScale; float len = (3.+9.*length(vel));",
    "  vec2 dir = normalize(vec2(vel.x*asp*.5, vel.y*.5)+1e-4);",
    "  vec2 cx = corner.x*dir*len + corner.y*vec2(-dir.y, dir.x);",
    "  gl_Position = vec4(warp(pos,1.) + cx*px*2./uRes, 0., 1.); vQ = corner;",
    "  vA = vec4(cool, fade*(.4+.6*r4)*(.6+.4*sin(uTime*18.+r1*40.)), r3, r2);",
    "}"].join("\n");
  var STRIKEV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi+3.), r2=h11(fi+9.1), r3=h11(fi+21.7);",
    "  float t = uMoment.x; float asp = uRes.x/uRes.y;",
    "  if (t < 0. || r3 > min(uInt,1.)*.7+.3) { cull(); return; }",
    "  float a = r1*6.2832, sp = .35+1.5*r2*r2;",
    "  vec2 C = vec2(0., -.18);",
    "  float run = (1.-exp(-t*2.4))/2.4;",
    "  vec2 pos = C + vec2(cos(a), sin(a))*sp*run + vec2(0., -.42*t*t*.5);",
    "  vec2 vel = vec2(cos(a), sin(a))*sp*exp(-t*2.4) + vec2(0., -.42*t);",
    "  vec2 dir = normalize(vec2(vel.x*asp*.5, vel.y*.5)+1e-4);",
    "  float len = 2.+7.*length(vel)/(.35+sp); float px = (1.3+2.*r3)*uScale;",
    "  float fade = exp(-t*(.9+.8*r2))*smoothstep(0.,.02,t);",
    "  vec2 cx = corner.x*dir*len + corner.y*vec2(-dir.y, dir.x);",
    "  gl_Position = vec4(warp(pos,1.) + cx*px*2./uRes, 0., 1.); vQ = corner; vA = vec4(t*.5, fade, r3, r2);",
    "}"].join("\n");
  var SPARKF = PO + "vec4 fxi(){ float d = length(vQ*vec2(.55,1.4)); float core = exp(-d*d*9.), halo = exp(-d*3.2)*.3; vec3 c = mix(vec3(1.,.28,.05), vec3(1.,.9,.6), core*(1.-vA.x*.8)); float e = (core+halo)*vA.y*uInt; return pout(c, e, .5); }";
  FX.register("mint-forge", T3({
    still: 10, tap: true, glsl: G3, depth: 1,
    front: { rate: 0.55, size: 0.08, alpha: 0.16, kind: 2, color: [1.0, 0.5, 0.15] },
    moments: [{ name: "press-strike", every: [24, 60], dur: 3.6 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float y01 = fc.y/uRes.y; float fl = flick(t*.9, 5.);",
        "  float glow = pow(1.-y01, 3.4)*fl*(.4+.6*vn(vec2(p.x*3.+t*.3, 2.)));",
        "  vec2 q = vec2(p.x*7., p.y*2.8 - t*.9); q += vec2(fbmQ(q*.7+t*.2, 2)*1.3, 0.);",
        "  float shim = pow(ridge(q), 5.)*smoothstep(.15,-.5,p.y+.05)*.5;",
        "  vec3 c = vec3(1.,.42,.1)*(glow*.32 + shim*.1);",
        "  float al = (glow*.04 + shim*.03);",
        "  float tm = uMoment.x;",
        "  if (tm >= 0.) {",
        "    float fl2 = exp(-tm*6.5)*smoothstep(0.,.015,tm);",
        "    c += vec3(1.,.82,.5)*fl2*.5; al += fl2*.05;",
        "    vec2 f = (p-vec2(0.,-.18))*vec2(1.,1.4); float r = length(f); float rr = (1.-exp(-tm*3.))*.9;",
        "    float ring = exp(-pow((r-rr)/(.02+.05*tm),2.))*exp(-tm*1.8);",
        "    c += vec3(1.,.7,.35)*ring*.4; al += ring*.05;",
        "    c += vec3(1.,.5,.15)*exp(-r*r*5.)*exp(-tm*2.5)*.35;",
        "  }",
        "  c *= I;",
        "  return fin(c, al*I);",
        "}"].join("\n") },
      { count: [90, 180, 300, 420], vert: SPARKV, ifrag: SPARKF, glow: 1.0 },
      { count: [40, 70, 100, 130], vert: STRIKEV, ifrag: SPARKF, glow: 1.0 }
    ]
  }));

  /* ---------- 5. nocturne / Blue Note: blue smoke, a swinging spotlight cone, art-deco sunburst glints ---------- */
  FX.register("bluenote", T3({
    still: 13, safe: 0.88, tap: "warp", glsl: G3,
    front: { rate: 0.4, size: 0.15, alpha: 0.09, kind: 0, color: [1.0, 0.82, 0.5] },
    moments: [{ name: "spotlight-swing", every: [28, 70], dur: 10 }, { name: "brass-glint", every: [28, 70], dur: 3.2 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec4 sm = smokeV(p, vec3(.52,.62,.9), 1., 1.);",
        "  float env = uMoment.w < .5 ? mEnv() : 0.;",
        "  vec2 A = vec2(-a*.22, .8); vec2 d = p-A; float ang = atan(d.x, -d.y);",
        "  float axis = .24+.1*sin(t*.11) + env*.5*sin(mK()*PI*2.);",
        "  float cone = smoothstep(.3,.04,abs(ang-axis))*exp(-length(d)*.42);",
        "  float vol = cone*(.22+sm.a*2.4);",
        "  vec2 gp = A + vec2(sin(axis), -cos(axis))*1.05; float pool = exp(-dot((p-gp)*vec2(1.,2.4),(p-gp)*vec2(1.,2.4))*5.)*.14;",
        "  vec3 c = sm.rgb*sm.a*.14 + vec3(1.,.88,.62)*(vol*.3*(1.+env*.35) + pool*(1.+env*.5));",
        "  vec2 B = vec2(0.,-.82); vec2 e = p-B; float ae = atan(e.x, e.y); float re = length(e);",
        "  float rays = pow(abs(sin(ae*13.)), 14.)*smoothstep(.25,.5,re)*smoothstep(1.3,.6,re);",
        "  float shimmer = .35+.65*pow(.5+.5*sin(re*7.-t*.7+ae*3.), 3.);",
        "  float arcs = exp(-pow((fract(re*5.)-.5)/.04,2.))*smoothstep(.3,.5,re)*smoothstep(1.,.6,re)*.5;",
        "  c += vec3(1.,.78,.36)*(rays*.5+arcs)*shimmer*.1;",
        "  if (uMoment.w > .5 && mK() >= 0.) { float k = mK(); vec2 gq = vec2(((h11(uMoment.y)-.5)*.9)*a, (h11(uMoment.y+4.)-.2)*.5); vec2 f = p-gq; float env2 = sin(PI*k); c += vec3(1.,.85,.5)*(star4(f*1.2, 26.)*.9)*env2*1.2; }",
        "  c *= I*.9;",
        "  return fin(c, sm.a*.05*I + max(max(c.r,c.g),c.b)*.04);",
        "}"].join("\n") },
      { count: [30, 50, 80, 110], vert: PV({ dir: -1, speed: 0.01, sway: 0.08, swf: 0.15, s0: 1, s1: 2, dens: 0.3, flk: 0.7, ff: 1.5, bmin: 0.3,
          mod: "  vec2 qq = vec2(x*asp*.5, y*.5) - vec2(-asp*.22*.5, .4); float cs = dot(normalize(qq), vec2(.24,-.97)); bright *= .15+.85*smoothstep(.85,.99,cs);" }),
        ifrag: F_SOFT("vec3(1.,.9,.65)", 0.1, 4) }
    ]
  }));

  /* ---------- 6. odyssey / Captain's Cabin: swaying lantern, rolling-horizon tint, sea spray, rogue-wave moment ---------- */
  FX.register("voyage", T3({
    still: 7, safe: 0.86, tap: true, glsl: G3,
    front: { rate: 0.5, size: 0.1, alpha: 0.12, kind: 0, color: [0.8, 0.9, 1.0] },
    moments: [{ name: "wave-crest", every: [25, 65], dur: 8 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float env = mEnv();",
        "  float roll = .03*sin(t*.33) + .014*sin(t*.87+1.) + env*.075*sin(mK()*11.);",
        "  vec2 pr = rot(roll)*p;",
        "  float hy = -.08 + .02*sin(t*.4) + env*.05*sin(mK()*7.);",
        "  float below = smoothstep(hy+.02, hy-.1, pr.y);",
        "  float glowH = exp(-pow((pr.y-hy)/.1,2.));",
        "  vec3 c = vec3(1.,.62,.28)*glowH*.17 + vec3(.1,.34,.42)*below*.11;",
        "  float sw = vn(vec2(pr.x*3.+t*.3, pr.y*40.))*smoothstep(.0,-.4,pr.y-hy)*.025*(.4+.6*env+.4);",
        "  c += vec3(.6,.8,.9)*sw;",
        "  float swing = sin(t*.72)*(.16+.1*env);",
        "  vec2 Lp = vec2(swing*a*.5, .62-.04*abs(swing)*6.);",
        "  float fl = flick(t, 2.);",
        "  float d = length((p-Lp)*vec2(1.,.9));",
        "  c += vec3(1.,.56,.2)*(exp(-d*d*30.)*.35 + exp(-d*2.4)*.16 + exp(-d*.9)*.05)*fl;",
        "  float al = max(max(c.r,c.g),c.b)*.06 + below*.05*I;",
        "  return fin(c*I*.9, al);",
        "}"].join("\n") },
      { count: [50, 100, 160, 220], vert: PV({ dir: -1, speed: 0.4, span: 2.4, sway: 0.03, swf: 3, s0: 0.9, s1: 1.8, dens: 0.15, fin: 0.05, fout: 0.9, wind: -1.5, sx: 3.2, sy: 0.8, bmin: 0.3,
          mod: "  y = -.1 + (y+1.12)*.25*(.5+r3) - (r4*.9) + sin(uTime*.5+r1*9.)*.1; bright *= (.35+.65*smoothstep(-.9,.1,y))*(1.+3.*mEnv());" }),
        ifrag: F_SOFT("vec3(.85,.93,1.)", 0.14, 3.5) }
    ]
  }));

  /* ---------- 7. cursedwing / Forbidden Wing: candle flicker, shadows crawling in from the edges, cold-breath gust ---------- */
  FX.register("crypt", T3({
    still: 4, tap: true, glsl: G3,
    front: { rate: 0.3, size: 0.12, alpha: 0.1, kind: 0, color: [1.0, 0.55, 0.2] },
    moments: [{ name: "cold-breath", every: [30, 80], dur: 7 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float env = mEnv(); float k = mK();",
        "  float live = 1. - .85*env;",
        "  vec3 acc = vec3(0.);",
        "  for (int i=0;i<3;i++){",
        "    if (i>=2 && uQ<1.) break;",
        "    float fi = float(i);",
        "    vec2 c = vec2((fi==0.? -.45 : fi==1. ? .52 : .05)*a, fi==0.? -.38 : fi==1. ? -.46 : -.64);",
        "    c += vec2(vn(vec2(t*.8,fi))-.5, vn(vec2(t*.7,fi+4.))-.5)*.012;",
        "    float f = flick(t*(1.+.15*fi), fi*9.) * (live + .15*vn(vec2(t*22.,fi))*env);",
        "    float d = length((p-c)*vec2(1.,.85));",
        "    acc += vec3(1.,.5,.15)*(exp(-d*d*28.)*.3 + exp(-d*2.6)*.2 + exp(-d)*.05)*f*(fi==2.?.7:1.);",
        "  }",
        "  float ang = atan(p.y, p.x); float rr = length(p*vec2(.62,1.));",
        "  float edge = smoothstep(.3,1.1,rr); edge *= edge;",
        "  float n = fbmQ(vec2(ang*2.6 + t*.05, rr*2.8 - t*.045 - env*.6), uQ>1.5?4:3);",
        "  float shadow = smoothstep(.42,.72,n)*edge*(.55+.5*env+.35*(.5+.5*sin(t*.2)));",
        "  float vig = smoothstep(.35,1.05,rr)*.12;",
        "  vec3 amb = vec3(1.,.5,.15)*exp(-rr*rr*1.3)*.075*flick(t*.7, 40.)*live;",
        "  vec3 c2 = (acc*.5 + amb*(1.-shadow*1.6))*I;",
        "  float al = shadow*.34*I + vig*I + max(max(c2.r,c2.g),c2.b)*.04;",
        "  if (k >= 0.) {",
        "    float sx = mix(-1.3, 1.3, k)*a*.5; float mist = fbmQ(vec2((p.x-sx)*2.2, p.y*3.+t*.2), 3);",
        "    float mw = exp(-pow((p.x-sx)/(.55*a),2.))*smoothstep(.35,.8,mist);",
        "    c2 += vec3(.62,.78,.95)*mw*env*.2; al += mw*env*.05;",
        "  }",
        "  return fin(c2, al);",
        "}"].join("\n") },
      { count: [14, 24, 36, 48], vert: PV({ dir: 1, speed: 0.03, sway: 0.06, swf: 0.4, s0: 1, s1: 1.8, dens: 0.3, flk: 0.7, ff: 3, bmin: 0.3, x0: 0.6,
          mod: "  x = (r3*2.-1.)*.55 + sin(uTime*.4*(.5+r4)+r2*30.)*.06*(.4+age); y = -.55 + age*1.3; bright *= 1. - .8*mEnv();" }),
        ifrag: F_SOFT("vec3(1.,.55,.2)", 0.14, 5) }
    ]
  }));

  /* ---------- 8. abyss / Shipwreck: caustic light from above, marine snow in two depths, a whale passing in the haze ---------- */
  var MSNOW = PO + "vec4 fxi(){ float d = length(vQ); float e = exp(-d*d*4.5)*vA.y*uInt; vec3 c = vec3(.7,.9,1.); return pout(c, e, .22); }";
  FX.register("deepsea", T3({
    still: 6, safe: 0.86, tap: true, glsl: G3,
    front: { rate: 0.35, size: 0.1, alpha: 0.1, kind: 0, color: [0.6, 0.9, 1.0] },
    moments: [{ name: "whale", every: [35, 90], dur: 22 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float top = smoothstep(-.55,.55,p.y);",
        "  vec2 q = p*2.4; float sep = uQ>.5 ? .011 : 0.;",
        "  vec3 cs = vec3(causticF(q+vec2(sep,0.), t*.28), causticF(q, t*.28), causticF(q-vec2(sep,0.), t*.28));",
        "  float beams = pow(.5+.5*sin(p.x*5.5 + p.y*1.5 + sin(t*.17+p.x*2.)*1.6), 5.)*smoothstep(-.4,.6,p.y)*.3;",
        "  vec3 tint = vec3(.25,.78,.95);",
        "  vec3 c = (cs*tint*(.3+.7*top) + beams*tint*.5)*.2;",
        "  float al = .03 + (1.-top)*.05;",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    float dir = h11(uMoment.y) > .5 ? 1. : -1.;",
        "    float cx = mix(-1.35, 1.35, k)*a*.5*dir; float cy = .12 + .1*sin(k*4.+uMoment.y);",
        "    vec2 f = vec2((p.x-cx)*dir, p.y-cy); float u = f.x/.62;",
        "    float body = .105*pow(clamp(1.-u*u,0.,1.),.5)*(.4+.6*smoothstep(-1.,.25,u));",
        "    float bend = .035*sin(u*3.-t*.9)*(1.-u)*.5;",
        "    float sil = smoothstep(body+.02, body-.015, abs(f.y-bend))*step(-1.02,u)*step(u,1.0);",
        "    vec2 tf = vec2(f.x+.66, f.y-bend*2.); float fl = sin(t*1.1)*.05;",
        "    sil = max(sil, smoothstep(.03,.0, length(vec2(tf.x*.55, abs(tf.y)-.06-fl*.5)) - .03)*step(tf.x,.03));",
        "    vec2 pf = vec2(f.x-.18, f.y+.08); sil = max(sil, smoothstep(.02,.0, length(vec2(pf.x*.8-pf.y*.5, pf.y*1.4+pf.x*.4))-.07)*.8);",
        "    float env = sin(PI*k);",
        "    float back = exp(-pow((p.x-cx)/(.9*a*.5),2.))*exp(-pow((p.y-cy)/.28,2.));",
        "    c += vec3(.12,.42,.55)*back*env*.18;",
        "    c *= 1. - sil*env*.9; al = al*(1.-sil*env) + sil*env*.5;",
        "  }",
        "  return fin(c*I, al*I);",
        "}"].join("\n") },
      { count: [60, 110, 170, 240], vert: PV({ dir: -1, speed: 0.025, sway: 0.05, swf: 0.2, s0: 1, s1: 3.4, dens: 0.25, fin: 0.1, fout: 0.9, bmin: 0.3, dz: 0.7 }), ifrag: MSNOW },
      { count: [16, 28, 40, 54], vert: PV({ dir: -1, speed: 0.04, sway: 0.08, swf: 0.2, s0: 3, s1: 8, dens: 0.3, fin: 0.1, fout: 0.9, bmin: 0.25, dz: 1.6 }), ifrag: MSNOW }
    ]
  }));

  /* ---------- 9. neon / Night City: rain on glass over a neon-lit street: coloured lenses, big out-of-focus signs, passing headlights ---------- */
  var NEONPAL = "vec3 npal(float h){ return h < .3 ? vec3(1.,.12,.55) : (h < .55 ? vec3(.1,.85,1.) : (h < .75 ? vec3(.62,.25,1.) : (h < .9 ? vec3(1.,.62,.15) : vec3(.2,1.,.7)))); }\n";
  var BOKEHV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi), r2=h11(fi+5.3), r3=h11(fi+17.9), r4=h11(fi+41.1);",
    "  vec2 pos = vec2((r1*2.-1.)*1.05, -.92+r2*1.25);",
    "  pos.x += sin(uTime*.05*(.5+r3)+r1*30.)*.03; pos.y += sin(uTime*.04*(.5+r4)+r2*30.)*.02;",
    "  float px = (26.+72.*r3*r3)*uScale;",
    "  float pulse = .75+.25*sin(uTime*(.4+r3*1.2)+r1*20.);",
    "  float sgn = (uMoment.w > .5 && uMoment.x >= 0. && r4 > .55) ? (.4+1.8*mEnv()*step(.0,sin(uTime*37.+r1*9.))) : 1.;",
    "  if (r4 > .3+.7*min(uInt,1.)) { cull(); return; }",
    "  emit(pos, vec2(px), corner, vec4(r4, pulse*(.3+.7*r3)*sgn, r2, r3));",
    "}"].join("\n");
  var BOKEHF = PO + NEONPAL + "vec4 fxi(){ float d = length(vQ); float disc = smoothstep(1.,.82,d); float rim = smoothstep(.55,.95,d)*disc; float e = (disc*.35 + rim*.55)*vA.y*uInt; return pout(npal(fract(vA.x*1.37+vA.z*.3)), e, .3); }";
  var CARV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float k = mK();",
    "  if (k < 0. || uMoment.w > .5 || fi > 3.) { cull(); return; }",
    "  float dir = h11(uMoment.y) > .5 ? 1. : -1.;",
    "  float lag = fi < 2. ? 0. : .09;",
    "  float kk = clamp(k*1.25 - lag, 0., 1.);",
    "  vec2 pos = vec2(mix(-1.4,1.4,kk)*dir, -.45 - mod(fi,2.)*.09 - .1*h11(uMoment.y+2.));",
    "  float px = (fi < 2. ? 62. : 46.)*uScale; float fade = sin(PI*kk);",
    "  vec4 a = vec4(fi < 2. ? 0. : 1., fade, 0., 0.);",
    "  emit(pos, vec2(px, px*.8), corner, a);",
    "}"].join("\n").replace("sin(PI*kk)", "sin(3.14159*kk)");
  var CARF = PO + "vec4 fxi(){ float d = length(vQ); float e = (exp(-d*d*3.)*.9 + smoothstep(1.,.8,d)*.25)*vA.y*uInt; vec3 c = vA.x < .5 ? vec3(1.,.93,.78) : vec3(1.,.15,.12); return pout(c, e, .3); }";
  FX.register("nightcity", {
    layer: "front", still: 20, safe: 0.9, tap: true, depth: 1,
    glsl: "#define STORMV 0.\n#define FROSTV 0.\n#define NEONV 1.\n" + RAIN,
    front: { rate: 0.5, size: 0.14, alpha: 0.13, kind: 1, color: [1.0, 0.25, 0.65] },
    moments: [{ name: "headlights", every: [22, 55], dur: 6 }, { name: "sign-flicker", every: [30, 75], dur: 3.2 }],
    passes: [
      { frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" },
      { count: [14, 22, 30, 40], vert: BOKEHV, ifrag: BOKEHF, glow: 0.8 },
      { count: [4, 4, 4, 4], vert: CARV, ifrag: CARF, glow: 1.0 }
    ]
  });

  /* ---------- 10. notepad / Private Bank: black on white. Paper fibre, drifting ink-bleed, one slow ink drop. Alpha stays under ~0.04 ---------- */
  FX.register("paperink", T3({
    still: 9, tap: true, glsl: G3, gain: 0.85,
    moments: [{ name: "ink-drop", every: [35, 90], dur: 12 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec2 q = vec2(p.x*80., p.y*5.); q.y += vn(p*9.)*3.;",
        "  float fib = smoothstep(.8,.97, vn(q))*smoothstep(.35,.7, vn(p*3.+7.));",
        "  float bleed = smoothstep(.52,.82, fbmQ(p*vec2(1.3,1.7)+vec2(t*.006,-t*.004), 3));",
        "  float al = (fib*.016 + bleed*.011)*I;",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    vec2 C = (h22(vec2(uMoment.y, 4.))-.5)*vec2(asp()*.9, .8); float tt = uMoment.x;",
        "    float r = .03 + .2*(1.-exp(-tt*.55)); vec2 f = p-C; float ang = atan(f.y,f.x), rr = length(f);",
        "    float wob = 1. + .5*(fbmQ(vec2(ang*2.+uMoment.y, tt*.1), 2)-.5) + .2*sin(ang*7.+uMoment.y);",
        "    float edge = smoothstep(r*wob, r*wob*.8, rr);",
        "    float feather = ridge(vec2(ang*5.+uMoment.y, rr*20.-tt*2.))*smoothstep(r*wob*1.35, r*wob*.9, rr)*.35;",
        "    float ink = (edge*.6+feather)*exp(-tt*.3)*smoothstep(0.,.1,tt)*(1.-smoothstep(.7,1.,k));",
        "    al += ink*.08*I;",
        "  }",
        "  return vec4(vec3(0.), al);",
        "}"].join("\n") },
      { count: [10, 16, 24, 30], vert: PV({ dir: -1, speed: 0.012, sway: 0.1, swf: 0.2, s0: 1, s1: 2.6, dens: 0.3, flk: 0.3, ff: 1, bmin: 0.4, sx: 2.4, sy: 0.5, spin: 0.2 }),
        ifrag: F_SOFT("vec3(.2)", 0.14, 3) }
    ]
  }));

  /* ---------- 11. construct / Black Site: falling green phosphor code with CRT scanlines and bloom; a glitch tear moment ---------- */
  var CODELIB = G3 + [
    "vec2 codeRain(vec2 q, float cw, float chh){",
    "  float col = floor(q.x/cw);",
    "  if (h11(col*1.7+3.) > .6) return vec2(0.);",
    "  float spd = 5.+10.*h11(col+7.), len = 8.+22.*h11(col+13.);",
    "  float total = ceil(uRes.y/chh) + len + 6.;",
    "  float hp = mod(uTime*spd + h11(col+21.)*total, total);",
    "  float row = floor((uRes.y - q.y)/chh); float dist = hp - row;",
    "  if (dist < 0. || dist > len) return vec2(0.);",
    "  vec2 uv = vec2(fract(q.x/cw), fract((uRes.y-q.y)/chh));",
    "  float gid = floor(uTime*(.8+h11(col+row*.37)*2.5)*.5 + h11(col*3.1+row*7.7)*50.);",
    "  vec2 g = floor(vec2(uv.x*5., uv.y*7.));",
    "  float bit = step(.45, h21(g + gid*13.1 + col*.91 + row*2.3));",
    "  float inner = step(.14,uv.x)*step(uv.x,.86)*step(.1,uv.y)*step(uv.y,.9);",
    "  float body = pow(1.-dist/len, 1.7), head = smoothstep(1.2,0.,dist);",
    "  float halo = (body*.3 + head*.6)*smoothstep(.75,.1,length(uv-.5));",
    "  return vec2(bit*inner*(body+head*1.5) + halo*.5, head*bit*inner);",
    "}"].join("\n") + "\n";
  FX.register("phosphor", T3({
    still: 7, safe: 0.94, tap: true, glsl: CODELIB,
    moments: [{ name: "glitch", every: [22, 55], dur: 2.6 }],
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec2 q = fc - uPar*uRes.y; float cw = 15.*uScale, chh = 19.*uScale;",
      "  float k = mK(); vec3 ch; vec2 r;",
      "  if (k >= 0.) {",
      "    float env = sin(PI*k); float band = floor(q.y/(uRes.y*.025)); float fr = floor(t*14.);",
      "    float gs = step(.8, h11(band*3.3+fr))*env;",
      "    float xo = (h11(band+fr)-.5)*uRes.x*.09*gs; float off = 3.*uScale*(1.+gs*3.);",
      "    vec2 a1 = codeRain(q+vec2(xo+off,0.), cw, chh), a2 = codeRain(q+vec2(xo,0.), cw, chh), a3 = codeRain(q+vec2(xo-off,0.), cw, chh);",
      "    r = a2; ch = vec3(a1.x*.6, a2.x, a3.x*.9+.2*gs);",
      "    ch += gs*.25 + env*.04;",
      "  } else { r = codeRain(q, cw, chh); ch = vec3(.15,1.,.4)*r.x; }",
      "  float scan = .72 + .28*(.5+.5*sin(fc.y/uScale*PI*.9));",
      "  vec3 c = (ch*(k>=0. ? vec3(.2,1.,.5) : vec3(1.)) + vec3(.75,1.,.85)*r.y*.7)*scan;",
      "  float uvy = fc.y/uRes.y; float refresh = exp(-pow((fract(t*.09)-uvy)/.05,2.))*.035;",
      "  float vig = smoothstep(.45,1.15,length(p*vec2(.62,1.)));",
      "  c = (c*.52 + vec3(.1,.8,.3)*refresh)*I*(1.+.03*sin(t*60.));",
      "  return fin(c, max(max(c.r,c.g),c.b)*.05 + vig*.14*I);",
      "}"].join("\n") }]
  }));

  /* ---------- 12. xeno / Xenohold: bioluminescent spores, a hexagonal containment-field lattice that shimmers, field-surge ring ---------- */
  var HEXLIB = G3 + [
    "float hexD(vec2 p){ p = abs(p); return max(dot(p, vec2(.5,.8660254)), p.x); }",
    "vec4 hexCell(vec2 p){ vec2 r = vec2(1.,1.7320508), h = r*.5; vec2 a = mod(p, r)-h, b = mod(p-h, r)-h; vec2 g = dot(a,a) < dot(b,b) ? a : b; return vec4(g, p-g); }"
  ].join("\n") + "\n";
  FX.register("spores", T3({
    still: 10, tap: true, glsl: HEXLIB,
    front: { rate: 0.45, size: 0.11, alpha: 0.14, kind: 0, color: [0.85, 0.3, 1.0] },
    moments: [{ name: "field-surge", every: [26, 62], dur: 7 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec4 hc = hexCell(p*6.5); float e = .5 - hexD(hc.xy);",
        "  float line = smoothstep(.06,.0,e); vec2 id = hc.zw;",
        "  float wave = pow(.5+.5*sin(dot(id,vec2(.7,.5))*.4 - t*.55 + h21(id)*1.3), 5.);",
        "  vec3 teal = mix(vec3(.1,.85,1.), uAcc, .15);",
        "  float lat = line*wave;",
        "  float ex = smoothstep(.5,1.,abs(p.x)/(a*.5)); float curtain = ex*ex*(.45+.55*vn(vec2(p.y*5.+t*.7, p.x*2.)));",
        "  float haze = fbmQ(p*vec2(1.3,1.7)+vec2(t*.01,t*.014), 3);",
        "  vec3 c = teal*(lat*.3 + curtain*.15) + mix(vec3(.1,.5,.7), vec3(.5,.1,.7), haze)*smoothstep(.45,.8,haze)*.05;",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    vec2 C = (h22(vec2(uMoment.y,1.))-.5)*vec2(a,.8); float d = length(p-C), r = k*1.5;",
        "    float ring = exp(-pow((d-r)/.17,2.))*(1.-k);",
        "    c += vec3(.3,1.,.85)*(line*ring*1.0 + ring*.08);",
        "  }",
        "  c *= I*.9;",
        "  return fin(c, max(max(c.r,c.g),c.b)*.06);",
        "}"].join("\n") },
      { count: [40, 80, 120, 160], glow: 1.1, vert: PV({ dir: 1, speed: 0.035, sway: 0.07, swf: 0.35, s0: 3.5, s1: 9, dens: 0.2, fin: 0.1, fout: 0.85, flk: 0.75, ff: 1.6, bmin: 0.25, dz: 0.9, mod: "  bright *= 1.+2.*mEnv();" }),
        ifrag: PO + "vec4 fxi(){ float d = length(vQ); vec3 c = vA.z < .2 ? vec3(.5,1.,.3) : (vA.z > .75 ? vec3(.95,.25,.95) : vec3(.1,.9,1.)); float e = (exp(-d*d*9.) + exp(-d*3.)*.35 + smoothstep(.95,.7,d)*smoothstep(.45,.8,d)*.25)*vA.y*uInt; return pout(c, e, .3); }" }
    ]
  }));

  /* ---------- 13. solaris / Solar Observatory: coronagraph glow, slowly turning stars, shooting star + prominence moments ---------- */
  FX.register("coronagraph", T3({
    still: 6, tap: true, glsl: G3,
    front: { rate: 0.3, size: 0.12, alpha: 0.07, kind: 0, color: [1.0, 0.8, 0.5] },
    moments: [{ name: "shooting-star", every: [22, 60], dur: 2.6 }, { name: "prominence", every: [40, 90], dur: 9 }],
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec2 pole = vec2(a*.35,.95); vec2 qd = rot(t*.004)*(p-pole);",
      "  vec3 c = vec3(0.); float dens = .5+.5*min(I,1.);",
      "  for (int l=0;l<3;l++){",
      "    if (l>=2 && uQ<1.) break;",
      "    float fl = float(l); float sc = 20.+fl*24.;",
      "    vec2 g = qd*sc+fl*31.; vec2 id = floor(g); vec2 f = fract(g)-.5;",
      "    float r = h21(id+fl*5.); vec2 j = (h22(id+3.)-.5)*.5;",
      "    float on = step(1.-.07*dens*(1.-.25*fl), r); float d = length(f-j);",
      "    float tw = .65+.35*sin(t*(.8+2.4*h21(id+8.))+r*60.);",
      "    float core = smoothstep(.07+.05*h21(id), 0., d);",
      "    float cross = (1./(1.+900.*abs(f.x-j.x)*abs(f.y-j.y)))*smoothstep(.35,0.,d)*step(.92,r+h21(id+4.)*.08)*.6;",
      "    c += mix(vec3(.75,.85,1.), vec3(1.,.88,.7), h21(id+2.))*(core+cross)*tw*on*(.55+.45*h21(id+6.));",
      "  }",
      "  c *= smoothstep(-.5,.4,p.y)*.9;",
      "  vec2 C = vec2(a*.5+.02,.5); float R = .2; vec2 f = p-C; float r = length(f), an = atan(f.y,f.x);",
      "  float outside = step(R, r);",
      "  float corona = exp(-(r-R)*5.5)*outside*(.6+.4*vn(vec2(an*5.+t*.04, r*3.)));",
      "  float streamer = pow(vn(vec2(an*4.+t*.02, 1.)),2.)*exp(-(r-R)*2.2)*outside;",
      "  c += vec3(1.,.82,.5)*(corona*.3 + streamer*.24);",
      "  float occ = smoothstep(R, R-.006, r);",
      "  float k = mK();",
      "  if (k >= 0.) {",
      "    if (uMoment.w < .5) {",
      "      float sgn = h11(uMoment.y) > .5 ? 1. : -1.; vec2 D = normalize(vec2(-sgn, -.42));",
      "      vec2 S = vec2(sgn*(.15+.35*h11(uMoment.y+2.))*a*.6, .22+.3*h11(uMoment.y+5.));",
      "      vec2 hd = S + D*1.25*k; float d = seg(p, hd - D*.34, hd); float along = clamp(dot(p-hd,-D)/.34, 0., 1.);",
      "      float env = sin(PI*k);",
      "      c += vec3(.9,.95,1.)*(exp(-d*d*180000.)*pow(1.-along,1.6) + exp(-length(p-hd)*70.)*.8)*env*1.5;",
      "    } else {",
      "      float aa = 1.15+h11(uMoment.y)*1.1; vec2 dir = vec2(cos(aa), sin(aa)); vec2 pc = C + dir*(R+.02); float env = sin(PI*k);",
      "      float d = abs(length(p-pc)-.085); float hf = step(.0, dot(p-C, dir) - R*.9);",
      "      c += vec3(1.,.62,.25)*exp(-d*d*9000.)*hf*env*(.7+.3*sin(t*3.))*1.1;",
      "    }",
      "  }",
      "  c *= I;",
      "  return fin(c, max(max(c.r,c.g),c.b)*.1 + occ*.9*mix(1.,.0,uLight));",
      "}"].join("\n") }]
  }));

  /* ---------- 14. alchemist / The Alchemist: emerald vapour, a slowly turning hermetic ring with runic ticks, sparks; transmutation moment ---------- */
  FX.register("athanor", T3({
    still: 8, safe: 0.96, tap: true, glsl: G3,
    front: { rate: 0.4, size: 0.13, alpha: 0.1, kind: 0, color: [0.2, 0.95, 0.55] },
    moments: [{ name: "transmutation", every: [28, 70], dur: 8 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec4 sm = smokeV(p, vec3(.15,.95,.55), 1.1, 1.);",
        "  float k = mK(); float gm = k >= 0. ? smoothstep(.15,.6,k)*(1.-smoothstep(.85,1.,k)) : 0.;",
        "  vec3 col = mix(vec3(.2,1.,.6), vec3(1.,.8,.3), gm);",
        "  vec2 C = vec2(a*.28,-.06); vec2 f = p-C; float r = length(f), an = atan(f.y,f.x); float spin = t*.03;",
        "  float ringA = exp(-pow((r-.46)/.004,2.)) + .6*exp(-pow((r-.395)/.003,2.)) + .5*exp(-pow((r-.18)/.003,2.));",
        "  float ticks = step(.397,r)*step(r,.458)*pow(abs(sin((an+spin)*18.)),20.);",
        "  float tri = 10.;",
        "  for (int i=0;i<3;i++){",
        "    float a0 = -spin*1.3 + float(i)*2.0944, a1 = a0+2.0944;",
        "    vec2 A = .38*vec2(cos(a0),sin(a0)), B = .38*vec2(cos(a1),sin(a1));",
        "    vec2 A2 = .38*vec2(cos(a0+1.0472),sin(a0+1.0472)), B2 = .38*vec2(cos(a1+1.0472),sin(a1+1.0472));",
        "    tri = min(tri, min(seg(f,A,B), seg(f,A2,B2)));",
        "  }",
        "  float lines = exp(-tri*tri*90000.);",
        "  float fl = flick(t, 7.);",
        "  float rg = (ringA*.55 + ticks*.4 + lines*.5 + exp(-pow((r-.46)/.05,2.))*.06)*(.6+.4*fl)*(1.+gm*1.6);",
        "  vec3 c = sm.rgb*sm.a*.17 + col*rg*.55;",
        "  c += vec3(1.,.85,.5)*exp(-pow((k-.3)/.04,2.))*exp(-r*2.)*.3*step(0.,k);",
        "  c *= I;",
        "  return fin(c, sm.a*.04*I + max(max(c.r,c.g),c.b)*.05);",
        "}"].join("\n") },
      { count: [30, 55, 85, 120], glow: 1.0, vert: PV({ dir: 1, speed: 0.06, sway: 0.05, swf: 0.5, s0: 1.5, s1: 3.5, dens: 0.25, fin: 0.05, fout: 0.8, flk: 0.5, ff: 6, bmin: 0.35,
          mod: "  x = .56+(r3*2.-1.)*.5 + sin(uTime*.5*(.5+r4)+r2*30.)*.05*(.4+age); y = -.55+age*1.7; bright *= 1.+2.5*mEnv();" }),
        ifrag: PO + "vec4 fxi(){ float d = length(vQ); vec3 c = mix(vec3(.2,1.,.6), vec3(1.,.82,.35), step(.55,vA.z)); float e = (exp(-d*d*10.)+exp(-d*3.5)*.3)*vA.y*uInt; return pout(c, e, .3); }" }
    ]
  }));

  /* ---------- 15. glacier / Polar Vault: aurora curtains, frost creeping in from the edges, diamond dust; aurora-flare moment ---------- */
  FX.register("polar-ice", T3({
    still: 30, safe: 0.9, tap: true, glsl: G3,
    front: { rate: 0.35, size: 0.12, alpha: 0.09, kind: 1, color: [0.7, 0.9, 1.0] },
    moments: [{ name: "aurora-flare", every: [28, 75], dur: 11 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float env = mEnv(); vec3 acc = vec3(0.);",
        "  for (int i=0;i<3;i++){",
        "    if (i>=2 && uQ<1.) break;",
        "    float fi = float(i);",
        "    float x = p.x*max(1., 1.2/a)*(1.05+fi*.4) + t*(.012+fi*.006)*(mod(fi,2.)<.5?1.:-1.);",
        "    float wave = vn(vec2(x*1.3, t*.045+fi*7.))*1.6 + vn(vec2(x*3.1, -t*.06+fi*3.))*.5;",
        "    float base = .06 + fi*.07 + (wave-1.)*.22;",
        "    float d = p.y - base;",
        "    float edge = smoothstep(-.02,.012,d)*exp(-max(d,0.)*(4.2-fi*.7 - env*1.4));",
        "    float streak = .55+.45*vn(vec2(x*46.+fi*5., t*.35));",
        "    streak = mix(1., streak, smoothstep(0.,.25,d));",
        "    float v = edge*streak*(.6+.4*vn(vec2(x*.7+fi, t*.08)));",
        "    vec3 g = vec3(.15,1.,.55), te = vec3(.1,.8,.8), vi = vec3(.62,.28,.95);",
        "    vec3 col = mix(mix(g, te, smoothstep(0.,.2,d)), vi, smoothstep(.18,.5,d));",
        "    col = mix(col, vec3(1.,.3,.62), env*.55*smoothstep(.1,.4,d));",
        "    acc += col*v*(.62-fi*.12)*(1.+1.0*env);",
        "  }",
        "  float sky = smoothstep(-.3,.5,p.y);",
        "  vec2 g2 = fc/uScale/9.; vec2 id = floor(g2); float sr = h21(id);",
        "  float star = step(.985, sr)*smoothstep(.3,0.,length(fract(g2)-.5-.3*(h22(id)-.5)))*(.5+.5*sin(t*(1.+3.*h21(id+1.))+sr*40.))*sky*.5;",
        "  vec3 c = acc*I*.5 + vec3(star)*I;",
        "  float e = min(min(fc.x, uRes.x-fc.x), min(fc.y, uRes.y-fc.y))/uRes.y;",
        "  float cr = .05 + .05*(.5+.5*sin(t*.03)) + .02*sin(t*.11);",
        "  float fn = fbmQ(p*9.+vec2(3.,1.), uQ>1.5?4:3); float bound = cr*(.45+1.2*fn);",
        "  float fa = smoothstep(bound, bound*.25, e); float crys = pow(ridge(p*38.+fn*3.), 5.)*fn;",
        "  float frost = fa*(.18+.82*crys);",
        "  c += vec3(.75,.9,1.)*frost*.3*I;",
        "  float al = max(max(c.r,c.g),c.b)*.28*mix(1.,1.8,uLight) + fa*.04*I;",
        "  return vec4(c, al);",
        "}"].join("\n") },
      { count: [40, 80, 120, 170], glow: 0.7, vert: PV({ dir: -1, speed: 0.03, sway: 0.05, swf: 0.4, s0: 1.4, s1: 3.2, dens: 0.3, fin: 0.1, fout: 0.9, flk: 0.95, ff: 3.5, bmin: 0.2, mod: "  bright *= 1.+1.2*mEnv();" }),
        ifrag: F_GLINT("vec3(.75,.92,1.)", 0.2) }
    ]
  }));

  /* ---------- 16. valhalla / Hoard Hall: hearth glow and rising embers on one side, snow and cold light blowing in at the door on the other ---------- */
  FX.register("mead-hall", T3({
    still: 9, tap: true, glsl: G3,
    front: { rate: 0.4, size: 0.1, alpha: 0.11, kind: 0, color: [1.0, 0.5, 0.2] },
    moments: [{ name: "log-crack", every: [24, 60], dur: 2.8 }, { name: "door-gust", every: [30, 75], dur: 8 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float logE = uMoment.w < .5 ? mEnv() : 0., gustE = uMoment.w > .5 ? mEnv() : 0.;",
        "  vec2 H = vec2(-a*.5-.05,-.62); vec2 dd = p-H; float d = length(dd*vec2(.8,1.));",
        "  float fl = flick(t*.9, 3.)*(1.+1.3*logE);",
        "  float sh = .7+.3*vn(vec2(atan(dd.y,dd.x)*3., t*1.5));",
        "  float hearth = exp(-d*1.5)*.34 + exp(-d*d*4.)*.3;",
        "  vec3 c = vec3(1.,.45,.12)*hearth*fl*sh;",
        "  float dx = a*.5 - p.x;",
        "  float door = exp(-dx*3.2)*(.6+.4*vn(vec2(p.y*2.+t*.2, 1.)))*smoothstep(-.75,.1,p.y);",
        "  c += vec3(.5,.72,1.)*door*.15*(1.+1.2*gustE);",
        "  float blow = smoothstep(.45,.8, fbmQ(vec2(p.x*2.2+t*(.2+.8*gustE), p.y*3.5), 3))*exp(-dx*1.6)*(.3+gustE);",
        "  c += vec3(.7,.82,.95)*blow*.1;",
        "  c *= I*.8;",
        "  return fin(c, max(max(c.r,c.g),c.b)*.05 + blow*.02*I);",
        "}"].join("\n") },
      { count: [60, 110, 160, 220], glow: 1.0, vert: PV({ dir: 1, speed: 0.12, sway: 0.05, swf: 0.5, s0: 1.4, s1: 3.2, dens: 0.25, fin: 0.05, fout: 0.45, flk: 0.55, ff: 12, bmin: 0.4,
          mod: "  x = -.55+(r3*2.-1.)*.5 + sin(uTime*.5*(.5+r4)+r2*30.)*.05*(.4+age); y = -1.1+age*2.0; bright *= 1.+(uMoment.w < .5 ? 2.5*mEnv() : 0.);" }),
        ifrag: PO + "vec4 fxi(){ vec2 q = vQ*vec2(1.,.8); float d = length(q); float core = exp(-d*d*30.), halo = exp(-d*5.)*.25; vec3 c = mix(vec3(1.,.28,.05), vec3(1.,.82,.45), core*.8); float e = (core+halo)*vA.y*uInt; return pout(c, e, .5); }" },
      { count: [50, 90, 140, 200], vert: PV({ dir: -1, speed: 0.12, sway: 0.03, swf: 0.8, s0: 1.2, s1: 5, dens: 0.25, fin: 0.04, fout: 0.95, bmin: 0.35, wind: -0.9,
          mod: "  x = x*.55+.5 - (uMoment.w > .5 ? mEnv()*1.5*(.3+r4) : 0.);" }),
        ifrag: F_SOFT("vec3(.86,.93,1.)", 0.4, 3.5) }
    ]
  }));

  /* ---------- 17. dynasty / Imperial Treasury: paper lanterns drifting up, tumbling gold-leaf flecks that glint, a lantern release ---------- */
  var LANTF = PO + "vec4 fxi(){ vec2 b = abs(vQ*vec2(1.,.84)); float d = length(vQ); float body = smoothstep(1.,.78, max(b.x*1.05, b.y)); float ribs = .8+.2*sin(vQ.y*14.);\n" +
    "  float glw = exp(-d*2.1)*.5; vec3 c = mix(vec3(1.,.28,.08), vec3(1.,.72,.3), exp(-d*d*4.)); float e = (body*.55*ribs + glw)*vA.y*uInt; return pout(c, e, .4); }";
  var RELEASEV = VHEAD + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float k = mK();",
    "  if (k < 0. || fi > 11.) { cull(); return; }",
    "  float r2 = h11(fi+5.3), r3 = h11(fi+17.9);",
    "  float kk = clamp(k*1.25 - r3*.22, 0., 1.);",
    "  float x = (h11(uMoment.y)-.5)*.8 + (fi/11.-.5)*1.15 + sin(uTime*.4+fi*2.1)*.05;",
    "  float y = -1.25 + kk*(2.9 + .4*r2);",
    "  float px = (26.+22.*r2)*uScale; float fade = smoothstep(0.,.12,kk)*(1.-smoothstep(.85,1.,kk));",
    "  emit(vec2(x,y), vec2(px, px*1.18), corner, vec4(1., fade, r2, r3));",
    "}"].join("\n");
  FX.register("lantern-feast", T3({
    still: 14, safe: 0.86, tap: true, glsl: G3,
    front: { rate: 0.4, size: 0.13, alpha: 0.12, kind: 0, color: [1.0, 0.35, 0.18] },
    moments: [{ name: "lantern-release", every: [30, 70], dur: 14 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float haze = fbmQ(p*vec2(1.2,1.5)+vec2(t*.01,t*.007), 3);",
        "  float low = exp(-(p.y+.75)*1.6);",
        "  vec3 c = vec3(1.,.38,.14)*(low*.07 + smoothstep(.45,.8,haze)*.035);",
        "  float rr = length(p*vec2(.62,1.)); float vig = smoothstep(.5,1.1,rr);",
        "  c += vec3(.5,.06,.05)*vig*.05;",
        "  return fin(c*I, max(max(c.r,c.g),c.b)*.1);",
        "}"].join("\n") },
      { count: [10, 14, 18, 22], glow: 1.0, vert: PV({ dir: 1, speed: 0.013, span: 2.5, sway: 0.05, swf: 0.12, s0: 14, s1: 20, dens: 0.35, fin: 0.1, fout: 0.85, flk: 0.12, ff: 4, bmin: 0.7, dz: 1.1, sy: 1.18 }), ifrag: LANTF },
      { count: [40, 70, 100, 140], glow: 0.7, vert: PV({ dir: -1, speed: 0.05, sway: 0.08, swf: 0.8, s0: 2, s1: 3.5, dens: 0.25, fin: 0.1, fout: 0.9, bmin: 0.4, sx: 1, sy: 0.45, spin: 1.6,
          mod: "  float rg = uTime*1.6*(.5+r2)+r1*6.; bright *= .1+.9*pow(abs(sin(rg)),10.);" }),
        ifrag: PO + "vec4 fxi(){ float e = smoothstep(1.,.6,max(abs(vQ.x), abs(vQ.y)*1.6))*vA.y*uInt; return pout(vec3(1.,.82,.4), e, .5); }" },
      { count: [12, 12, 12, 12], glow: 1.0, vert: RELEASEV, ifrag: LANTF }
    ]
  }));

  /* ---------- 18. zen / Temple Garden: falling petals, rain ripples spreading over still water, a gust that sweeps the petals + one great ripple ---------- */
  FX.register("garden", T3({
    still: 12, tap: true, glsl: G3,
    front: { rate: 0.4, size: 0.09, alpha: 0.13, kind: 2, color: [1.0, 0.72, 0.8] },
    moments: [{ name: "petal-gust", every: [25, 65], dur: 9 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float water = smoothstep(.1,-.3,p.y);",
        "  vec2 g = vec2(p.x*3.2, p.y*3.2*2.2); vec2 id = floor(g), f = fract(g)-.5;",
        "  float r1 = h21(id), r2 = h21(id+4.);",
        "  float age = fract(t*.12*(.6+.8*r2)+r1); float on = step(.5, h21(id+9.));",
        "  vec2 cc = (h22(id+2.)-.5)*.5; float d = length(f-cc);",
        "  float ring = (exp(-pow((d-age*.5)/.035,2.)) + .5*exp(-pow((d-age*.5+.12)/.03,2.)))*pow(1.-age,2.)*on;",
        "  vec3 c = vec3(.75,.88,.95)*ring*water*.4;",
        "  float mist = smoothstep(.4,.8, fbmQ(p*vec2(1.2,3.)+vec2(t*.02,0.), 3))*exp(-pow((p.y+.08)/.25,2.))*.07;",
        "  c += vec3(.7,.8,.85)*mist;",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    float rr = length((p-vec2(0.,-.3))*vec2(1.,2.1)); float rad = k*1.1;",
        "    float big = (exp(-pow((rr-rad)/.035,2.)) + .6*exp(-pow((rr-rad+.14)/.03,2.)) + .35*exp(-pow((rr-rad+.28)/.03,2.)))*sin(PI*k);",
        "    c += vec3(.8,.92,1.)*big*.55*smoothstep(.35,-.15,p.y);",
        "  }",
        "  c *= I;",
        "  return fin(c, max(max(c.r,c.g),c.b)*.06);",
        "}"].join("\n") },
      { count: [30, 60, 90, 120], vert: PV({ dir: -1, speed: 0.06, sway: 0.09, swf: 1.1, s0: 4, s1: 7, dens: 0.25, fin: 0.05, fout: 0.95, bmin: 0.5, sx: 1, sy: 0.55, spin: 1.3,
          mod: "  x -= mEnv()*1.2*(.3+r4); y -= mEnv()*.12*r3;" }),
        ifrag: PO + "vec4 fxi(){ float e = smoothstep(1.,.55,length(vQ*vec2(.9,1.5)))*vA.y*uInt; return pout(mix(vec3(1.,.8,.86), vec3(.95,.5,.65), vA.z), e, .55); }" }
    ]
  }));

  /* ---------- 19. samadhi: two curling saffron incense columns, slow golden motes, a singing-bowl ring that radiates ---------- */
  FX.register("incense-curl", T3({
    still: 10, safe: 0.93, tap: true, glsl: G3,
    front: { rate: 0.3, size: 0.15, alpha: 0.09, kind: 0, color: [1.0, 0.72, 0.3] },
    moments: [{ name: "singing-bowl", every: [30, 75], dur: 9 }],
    passes: [
      { frag: [
        "float stick(vec2 p, float x0, float ph){",
        "  float t = uTime; float y = p.y+.78; if (y < 0.) return 0.;",
        "  float amp = .012 + .1*y*y;",
        "  float xc = x0 + amp*sin(y*5.5+t*.6+ph) + (fbmQ(vec2(y*2.5-t*.18+ph*3., ph), 3)-.5)*.5*y*y;",
        "  float w = .004 + .07*y;",
        "  return exp(-pow((p.x-xc)/w,2.))*(1.-smoothstep(.3,1.45,y))*smoothstep(0.,.1,y)*(.6+.4*vn(vec2(y*14.-t*.5, ph)));",
        "}",
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  vec4 sm = smokeV(p, vec3(1.,.72,.3), .7, .8);",
        "  float s = stick(p, -.16*a, 0.) + .8*stick(p, .12*a, 3.7);",
        "  vec3 sc = vec3(1.,.72,.3);",
        "  vec3 c = sc*(s*.3 + sm.a*.1);",
        "  float k = mK();",
        "  if (k >= 0.) {",
        "    vec2 f = p-vec2(0.,-.7); float rr = length(f*vec2(1.,1.15)); float ring = 0.;",
        "    for (int i=0;i<3;i++){ float r = k*1.4 - float(i)*.15; if (r > 0.) ring += exp(-pow((rr-r)/.035,2.))*(1.-k)*(1.-float(i)*.25); }",
        "    c += vec3(1.,.82,.42)*ring*.4*smoothstep(0.,.08,k);",
        "  }",
        "  c *= I;",
        "  return fin(c, max(max(c.r,c.g),c.b)*.07 + sm.a*.02*I);",
        "}"].join("\n") },
      { count: [30, 55, 85, 120], glow: 0.9, vert: PV({ dir: 1, speed: 0.02, sway: 0.06, swf: 0.3, s0: 2, s1: 5, dens: 0.3, fin: 0.1, fout: 0.9, flk: 0.5, ff: 1, bmin: 0.3, mod: "  bright *= 1.+1.5*mEnv();" }),
        ifrag: F_SOFT("vec3(1.,.78,.35)", 0.2, 5) }
    ]
  }));

  /* ---------- 20. silkroad / Caravanserai: dense desert stars, a milky-way band, drifting sand haze, a distant lamp; sandstorm moment ---------- */
  FX.register("dunes", T3({
    still: 5, tap: true, glsl: G3,
    front: { rate: 0.4, size: 0.18, alpha: 0.1, kind: 0, color: [0.9, 0.7, 0.4] },
    moments: [{ name: "sandstorm", every: [30, 80], dur: 12 }],
    passes: [
      { frag: [
        "vec4 fx(vec2 fc){",
        "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
        "  float env = mEnv();",
        "  float ang = t*.0035; vec2 q = rot(ang)*p;",
        "  vec3 c = vec3(0.); float dens = .55+.45*min(I,1.);",
        "  for (int l=0;l<3;l++){",
        "    if (l>=2 && uQ<1.) break;",
        "    float fl = float(l); float sc = 24.+fl*26.;",
        "    vec2 g = q*sc+fl*31.; vec2 id = floor(g); vec2 f = fract(g)-.5;",
        "    float r = h21(id+fl*5.); vec2 j = (h22(id+3.)-.5)*.5;",
        "    float on = step(1.-.09*dens*(1.-.2*fl), r); float d = length(f-j);",
        "    float tw = .6+.4*sin(t*(.8+2.6*h21(id+8.))+r*60.);",
        "    float core = smoothstep(.07+.05*h21(id), 0., d);",
        "    float cross = (1./(1.+900.*abs(f.x-j.x)*abs(f.y-j.y)))*smoothstep(.35,0.,d)*step(.92,r+h21(id+4.)*.08)*.6;",
        "    c += mix(vec3(.85,.9,1.), vec3(1.,.8,.6), h21(id+2.))*(core+cross)*tw*on*(.55+.45*h21(id+6.));",
        "  }",
        "  float sky = smoothstep(-.4,.45,p.y);",
        "  float mw = smoothstep(.22,0.,abs(dot(q, normalize(vec2(1.,-.5)))-.05))*fbmQ(q*3.+4.,3)*.22;",
        "  c = (c + vec3(.7,.65,.8)*mw)*sky*(1.-.7*env);",
        "  float hz = fbmQ(vec2(p.x*.9 - t*.06*(1.+3.*env), p.y*5.), 3);",
        "  float haze = smoothstep(.4,.8,hz)*smoothstep(.2,-.6,p.y)*(.07+.1*env);",
        "  c += vec3(.9,.7,.4)*haze*1.3;",
        "  vec2 Lp = vec2(-a*.36,-.5); float ld = length(p-Lp)*1.; c += vec3(1.,.55,.2)*(exp(-ld*ld*40.)*.2 + exp(-ld*3.)*.06)*flick(t,9.)*(1.-.5*env);",
        "  c *= I;",
        "  return fin(c, max(max(c.r,c.g),c.b)*.1 + haze*.4*I);",
        "}"].join("\n") },
      { count: [50, 90, 140, 200], vert: PV({ dir: 1, speed: 0.1, sway: 0.0, swf: 1, s0: 0.9, s1: 1.4, dens: 0.3, fin: 0.03, fout: 0.97, bmin: 0.4, sx: 2.2, sy: 0.7,
          mod: "  y = -.9+r2*.95+sin(uTime*.7+r1*20.)*.03; x = fract(r1+uTime*.1*(.6+.8*r2))*2.5-1.25; r4 *= 1.-.7*mEnv(); bright = (.35+.65*r4)*(1.+2.5*mEnv())*smoothstep(0.,.05,age)*.9;" }),
        ifrag: F_SOFT("vec3(.95,.78,.5)", 0.3, 3.5) }
    ]
  }));


  /* ===================== aliases: the World manifest vocabulary ===================== */
  var A = {
    "light-rain": "rain-on-glass*0.45",
    "snow-on-glass": "glass-frost*0.9+snow*0.55",
    "hearth": "embers*0.9+candle*0.5",
    "mint": "embers*1.1+fog*0.25",
    "hoard-hall": "embers*0.8+snow*0.45",
    "torch": "candle*1.1+dust*0.4",
    "lantern-sway": "candle*0.9+dust*0.45",
    "polar": "aurora*1+snow*0.6",
    "observatory": "stars*1+dust*0.2",
    "caravanserai": "stars*0.9+candle*0.7",
    "blue-note": "smoke*1+rain-on-glass*0.25",
    "alchemist": "smoke*0.9+embers*0.6",
    "black-site": "scanlines*1",
    "temple": "rain-on-glass*0.4+incense*0.9",
    "night-city": "rain-on-glass*1",
    "shipwreck": "caustics*1+dust*0.3",
    "midnight-gallery": "dust*1"
  };
  Object.keys(A).forEach(function (k) { FX.alias(k, A[k]); });
})();
