/* TitanFX presets. Each preset is GLSL ES 3.00: full-screen fragment passes ("frag" defines vec4 fx(vec2 fragCoord), premultiplied
   alpha) and GPU-instanced particle passes ("vert" + "ifrag", attribute-less: everything derives from gl_InstanceID, so nothing is uploaded).
   Shared uniforms (see engine.js): uRes uTime uInt uQ uScale uLight uFlash uBg uInk uAcc uBolt uFilm.
   Colour model: premultiplied; alpha 0 with rgb > 0 composites as additive light, rgb 0 with alpha > 0 darkens. Presets keep average
   alpha low so overlay text stays WCAG AA (verified in notes/agents/fx-v2.md). */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX) return;

  var P = "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y; }\nfloat asp(){ return uRes.x/uRes.y; }\n";
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
    "    if (tm > .02){ float th = tm*.3; if (th > bh){ bh = th; bn = vec2((p.x-x)/tw*.5, 0.); } }",
    "  }",
    "}",
    "vec3 backdrop(vec2 uv){",
    "  vec3 base = mix(uBg*.5, uBg*(.9+.2*uLight), smoothstep(-.5,.5,uv.y));",
    "  base = mix(base, base*.72 + uAcc*.1, uLight);",
    "  vec3 c = base;",
    "  for (int l=0;l<3;l++){",
    "    float fl = float(l);",
    "    vec2 g = uv*(2.6+fl*2.4) + vec2(fl*13., fl*7.);",
    "    vec2 id = floor(g), f = fract(g)-.5;",
    "    vec2 j = (h22(id+fl)-.5)*.45;",
    "    float rad = .18+.22*h21(id+3.+fl);",
    "    float glow = smoothstep(rad, rad*.55, length(f-j));",
    "    vec3 col = mix(uAcc*1.3, vec3(1.,.82,.6), h21(id+9.)) ;",
    "    col = mix(col, col.bgr*.8+vec3(.1), step(.78, h21(id+21.)));",
    "    c += col*glow*(.5-.12*fl)*step(.35,h21(id+5.));",
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
    "  float dens = mix(.2, 1., min(I,1.)) ;",
    "  float bh = 0.; vec2 bn = vec2(0.); float trail = 0.;",
    "  if (FROSTV < .5) sliders(p, floor(a*14.), dens*.9, bh, bn, trail);",
    "  if (uQ > .5) beads(p, 26., 1.3, dens*.55, bh, bn);",
    "  beads(p, 64., 7.7, dens*.7, bh, bn);",
    "  if (uQ > 1.5) beads(p, 110., 3.1, dens*.5, bh, bn);",
    "  vec3 col = vec3(0.); float al = 0.;",
    // condensation: milky haze that sliding drops and beads wipe clear
    "  float haze = fbmQ(p*vec2(2.5,3.5) + vec2(0., uTime*.01), uQ > 1.5 ? 4 : 2);",
    "  float fogA = (.05 + .07*haze)*smoothstep(0.,.8,I)*(1.-trail*.95)*(1.-smoothstep(0.,.05,bh));",
    "  if (FROSTV > .5) {",
    "    float fr = fbmQ(p*9.+vec2(3.,1.), uQ > 1.5 ? 4 : 3); float edge = smoothstep(.1,.62, length(p*vec2(.62,1.)));",
    "    float crys = 1.-abs(2.*vn(p*34.+fr*3.)-1.);",
    "    fogA = (.06+.1*haze + edge*(.1 + .22*pow(crys,3.)*fr))*smoothstep(0.,.7,I);",
    "    fogA *= 1. - smoothstep(0.,.05,bh);",
    "  }",
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
    "    float la = smoothstep(0.,.1,bh)*(.5+.2*uLight)*clamp(I*1.2,.35,1.);",
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

  FX.register("rain-on-glass", { glsl: "#define STORMV 0.\n#define FROSTV 0.\n" + RAIN, passes: [{ frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" }], layer: "front", still: 20 });
  FX.register("storm", { glsl: "#define STORMV 1.\n#define FROSTV 0.\n" + RAIN, passes: [{ frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" }], layer: "front", lightning: true, still: 20 });
  FX.register("glass-frost", { glsl: "#define STORMV 0.\n#define FROSTV 1.\n" + RAIN, passes: [{ frag: "vec4 fx(vec2 fc){ return rainFx(fc); }" }], layer: "front", still: 20 });

  /* ===================== instanced particle vertex shaders ===================== */
  // Shared header for instanced passes: attribute-less quad from gl_VertexID, per-instance hashes from gl_InstanceID.
  var VHEAD = "#version 300 es\nprecision highp float;\nuniform vec2 uRes; uniform float uTime, uInt, uQ, uScale, uLight, uFlash;\nout vec4 vA; out vec2 vQ;\n" +
    "float h11(float p){ return fract(sin(p*127.1+31.7)*43758.5453); }\n" +
    "void emit(vec2 ndc, vec2 halfPx, vec2 corner, vec4 a){\n" +
    "  gl_Position = vec4(ndc + corner*halfPx*2./uRes, 0., 1.); vQ = corner; vA = a; }\n" +
    "void cull(){ gl_Position = vec4(2.,2.,2.,1.); vQ = vec2(0.); vA = vec4(0.); }\n";

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
    "  float fogA = smoothstep(.3,.85,w)*(.12+.14*smoothstep(.4,-.5,p.y));",
    "  float fall = exp(-r*.95);",
    "  float dust = .55+.9*fbmQ(p*2.4+vec2(t*.04,-t*.02), 2);",
    "  float la = rr*fall*dust*rays*(.22+fogA*2.);",
    "  vec3 lc = mix(vec3(1.,.86,.62), uAcc*1.35+vec3(.2,.15,.05), warm);",
    "  vec3 fc2 = mix(vec3(.66,.72,.8), uBg*.55+vec3(.18,.17,.16), .35);",
    "  fc2 = mix(fc2, mix(vec3(.55,.5,.45), uInk*.5, .4), uLight*.7);",
    "  float fa = fogA*I*mix(.55,.9,uLight);",
    "  vec3 col = fc2*fa + lc*la*I*.3;",
    "  return vec4(col, fa*.85 + la*I*.03);",
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
      "    float x = p.x*(1.05+fi*.4) + t*(.012+fi*.006)*(mod(fi,2.)<.5?1.:-1.);",
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
      "  vec3 c = acc*I*.34;",
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
    "  gl_Position = vec4(vec2(x,y) + cr*px*2./uRes, 0., 1.);",
    "  vQ = corner; vA = vec4(lantern?1.:0., fade*(lantern ? .9+.1*sin(uTime*3.+r1*20.) : .7), r4, r2);",
    "}"].join("\n");
  FX.register("lanterns", {
    layer: "front", still: 14, glsl: P,
    passes: [{ count: [60, 90, 120, 150], vert: LANTV, ifrag: [
      "vec4 fxi(){",
      "  float d = length(vQ);",
      "  if (vA.x > .5) {",
      "    float body = smoothstep(1.,.55,length(vQ*vec2(.95,.8)));",
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
        "  float scan = (1.-lines)*.04*I;",
        "  vec3 c = sc*(band*.22*wob*I + scan*.4);",
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
