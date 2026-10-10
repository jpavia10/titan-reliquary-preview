/* TitanFX style presets (notes/agents/styles-20.md, section 1): style-particles, style-liquid, style-holo, style-neon, style-vhs (Midnight Gallery, The Mint, Prism, Neon Vault).
   Loads after wings/fx/presets.js. Shader conventions are the engine's: premultiplied output, rgb > 0 with alpha ~0 = additive light,
   a little alpha = darkening; every preset is layer "front" (the text-safe mask attenuates it over text) and keeps its average alpha low. */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;

  var VHEAD = FX.vhead;   // engine-owned vertex header: uniforms, h11/h21/rot2, mK(), mEnv(), warp() (parallax + tap push), cull()

  /* ---------- shared GLSL ---------- */
  var P = "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }\nfloat asp(){ return uRes.x/uRes.y; }\n";
  // copies of the small helpers the fx-v3 presets use (presets.js keeps them private)
  var LIB = [
    "vec4 fin(vec3 c, float al){ return vec4(c*mix(1.,.5,uLight), al*mix(1.,2.,uLight)); }",
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float ridge(vec2 q){ return 1.-abs(2.*vn(q)-1.); }"
  ].join("\n") + "\n";
  // particle fragment output: additive light on dark themes, ink specks on light ones
  var PO = "float h11(float p){ return fract(sin(p*127.1+31.7)*43758.5453); }\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }\n" +
    "vec4 pout(vec3 c, float e, float ak){ vec3 cc = mix(c, uInk*.55, uLight); return vec4(cc*e*mix(1.,.7,uLight), e*ak*mix(1.,2.4,uLight)); }\n";

  /* =====================================================================================================================
     1. style-particles  (Midnight Gallery / afterhours)
     Cold moonlight on black marble. Three soft shafts fall from the top left; a fine depth-layered dust (a flowing sheet of points
     on a slow wave, free motes, a few out-of-focus bokeh discs) glows where it crosses the light. The pointer stirs the dust.
     Moment "gather" (every 45-90 s, 8 s): the dust streams into the silhouette of a real coin (the density map is drawn from the
     engine's coin photo into the canvas texture: edges and detail become stipple; the procedural rim ring + reeding ticks keep the
     outline when no photo has loaded) and then drifts apart again. Still frame = beams, sheet and a few bokeh discs.
     ===================================================================================================================== */
  // shared by the fragment and the vertex pass: where the lamp is, the three shafts, the coin's place on screen
  var PBEAM = [
    "vec2 pSrc(float a){ return vec2(-a*.5-.1, .66); }",
    "float pShaft(vec2 p, float a, float t, float noise){",
    "  vec2 S = pSrc(a); vec2 d = p-S; float L = length(d); float ang = atan(d.x, -d.y);",
    "  float c0 = atan(-S.x, S.y);",                                       // aim at the screen centre whatever the aspect
    "  float w0 = .11 + .05*sin(t*.05), w1 = .075 + .03*sin(t*.043+2.), w2 = .12 + .04*sin(t*.037+4.);",
    "  float b = exp(-pow((ang-(c0-.30+.05*sin(t*.05)))/w0, 2.))*.75",
    "          + exp(-pow((ang-(c0+.02+.04*sin(t*.043+2.1)))/w1, 2.))*1.",
    "          + exp(-pow((ang-(c0+.33+.05*sin(t*.037+4.2)))/w2, 2.))*.6;",
    "  return b*smoothstep(0.,.5,L)*exp(-L*.5)*mix(1., noise, .62); }",
    "float pCoinR(float a){ return min(.30, a*.36); }",
    "vec2 pCoinC(float a, float seed){ float R = pCoinR(a); return vec2((a*.5-R-.05)*(h11(seed) > .5 ? 1. : -1.), .07); }"
  ].join("\n") + "\n";

  var PART_FRAG = [
    "vec4 fx(vec2 fc){",
    "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
    "  vec2 S = pSrc(a); vec2 d = p-S; float ang = atan(d.x,-d.y), L = length(d);",
    // streaky volumetric noise stretched along each shaft (angle across, distance along)
    "  float nz = fbmQ(vec2(ang*16., L*.9 - t*.035), uQ>1.5?4:2)*1.5 + .25*fbmQ(vec2(ang*43.+3., L*2.1 - t*.06), 2);",
    "  float env = 0.;",
    "  if (uMoment.z > 0. && uMoment.x >= 0.) env = smoothstep(.3,2.2,uMoment.x)*(1.-smoothstep(uMoment.z-2.6, uMoment.z-.6, uMoment.x));",
    "  float bm = pShaft(p, a, t, nz)*(1.+.4*env);",
    "  vec3 moon = vec3(.55,.72,1.);",
    "  vec3 c = moon*(bm*.62 + exp(-pow(length(p-pSrc(a))/.6,2.))*.16);",
    // a faint pool of light where the shafts land, and a cold haze low in the room
    "  float pool = exp(-pow((p.x-a*.1)/(a*.55),2.))*smoothstep(-.1,-.6,p.y)*.05;",
    "  float haze = smoothstep(.35,.8,fbmQ(p*1.2+vec2(t*.012,0.),3))*.05;",
    "  c += vec3(.4,.55,.9)*(pool + haze);",
    // moment: a halo and a thin bright rim behind the gathering coin
    "  if (env > 0.) { float R = pCoinR(a); vec2 C = pCoinC(a, uMoment.y); float r = length(p-C);",
    "    c += (vec3(.5,.66,1.)*exp(-pow(r/(R*1.25),2.))*.13 + vec3(.8,.88,1.)*exp(-pow((r-R*.97)/(R*.035),2.))*.22)*env; }",
    "  c *= I*.62;",
    "  return fin(c, haze*I*.5 + max(max(c.r,c.g),c.b)*.05);",
    "}"
  ].join("\n");

  var PART_VERT = VHEAD + "uniform sampler2D uTex; uniform vec2 uTexRes;\n" + PBEAM + [
    "uint ihash(uint x){ x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }",
    "float hr(uint n){ return float(ihash(n) >> 8) / 16777216.; }",
    "float vnz(vec2 q){ vec2 i=floor(q), f=fract(q); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }",
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  uint id = uint(gl_InstanceID);",
    "  float r1=hr(id*8u+1u), r2=hr(id*8u+2u), r3=hr(id*8u+3u), r4=hr(id*8u+4u), r5=hr(id*8u+5u), r6=hr(id*8u+6u), r7=hr(id*8u+7u);",
    "  float a = uRes.x/uRes.y, t = uTime; vec2 hw = vec2(a*.5, .5);",
    "  vec2 pos; float dz = 1.; float px; float bright; float kind = 0.;",
    "  if (r5 < .46) {",
    // the sheet: scattered points on a slowly rolling wave seen from low down (perspective: far = dense and small)
    "    float Z = 1.+5.*pow(r1,.7);",
    "    float u = fract(r2 + t*.011*(.5+r3));",
    "    float X = (u*2.-1.)*(a*.5+.15)*Z/.62;",
    "    float W = .09*sin(X*.9+Z*.7-t*.30) + .05*sin(X*1.8-Z*1.3+t*.43) + .03*sin(X*3.3+Z*2.1-t*.7+r4*.6);",
    "    pos = vec2(X*.62/Z, .08 - (1.-W)*.62/Z + (r4-.5)*.1/Z);",
    "    dz = .6 + .8/Z; px = (1.2+1.6*r3)*uUScale*(1.5/Z+.6); bright = (.48+.4*r6)*(1.3-.1*Z)*smoothstep(6.1,3.8,Z); kind = 0.;",
    "  } else if (r5 < .992) {",
    // free motes drifting on a slow breeze, wrapped around the field
    "    float mx = fract(r1 + t*.007*(.4+r3)); float my = fract(r4 - t*.0045*(.5+r2));",
    "    pos = vec2((mx*2.-1.)*(a*.5+.1) + .02*sin(t*.2*(.5+r6)+r1*40.), (my*2.-1.)*.62 + .014*sin(t*.17+r3*30.));",
    "    dz = .9+.5*r2; px = (1.1+2.0*r3*r3)*uUScale; bright = .44+.46*r6; kind = r5 < .8 ? 0. : 1.;",
    "  } else {",
    // out-of-focus bokeh near the camera: big, dim, strong parallax
    "    float mx = fract(r1 + t*.004*(.4+r3)); float my = fract(r4 - t*.003*(.5+r2));",
    "    pos = vec2((mx*2.-1.)*(a*.5+.12), (my*2.-1.)*.65);",
    "    dz = 2.4; px = (12.+26.*r3)*uUScale*mix(.62,1.,smoothstep(.45,1.4,a)); bright = .09+.12*r6; kind = 2.;",
    "  }",
    // pointer stir: a soft push and swirl around the pointer (no pointer yet = no stir)
    "  vec2 st = pos-uPtr; float sd = dot(st,st); float act = step(.0001, abs(uPtr.x)+abs(uPtr.y));",
    "  float sk = exp(-sd/.05)*act*(kind > 1.5 ? 1.4 : 1.);",
    "  pos += (normalize(st+1e-4)*.06 + vec2(-st.y, st.x)/(sqrt(sd)+.06)*.035)*sk;",
    // moment: stream into the coin's silhouette, hold, drift apart (per-particle delays)
    "  float g = 0.;",
    "  if (uMoment.z > 0. && uMoment.x >= 0. && kind < 1.5) {",
    "    float tm = uMoment.x, dur = uMoment.z;",
    "    float R = pCoinR(a); vec2 C = pCoinC(a, uMoment.y);",
    "    bool ok = false; vec2 tq = vec2(0.);",
    "    for (int k=0;k<8;k++) {",
    "      uint kk = id*64u + uint(k)*3u + 16u;",
    "      vec2 q = vec2(hr(kk), hr(kk+1u))*2.-1.;",
    "      if (!ok && dot(q,q) <= 1. && textureLod(uTex, vec2(q.x*.5+.5, .5-q.y*.5), 0.).r > hr(kk+2u)) { tq = q; ok = true; }",
    "    }",
    "    if (ok) {",
    "      float gin = smoothstep(0., 1., (tm-.3-r2*1.2)/1.6);",
    "      float gout = smoothstep(0., 1., (tm-(dur-2.6)-r3*.9)/1.7);",
    "      g = gin*(1.-gout);",
    "      vec2 tgt = C + tq*R + vec2(sin(t*1.3+r1*30.), cos(t*1.1+r4*30.))*.0035;",
    "      vec2 dir = tgt-pos; vec2 perp = vec2(-dir.y, dir.x);",
    "      vec2 burst = normalize(tgt-C+1e-4)*gout*.12*(.4+r6);",
    "      pos = mix(pos, tgt, g) + perp*sin(g*PI)*.25*(r4-.5) + burst*(1.-gout*.0);",
    "    }",
    "  }",
    // the moonlight catches the dust (lit where it ends up, so the gathered coin glows too)
    "  float lit = pShaft(pos, a, t, .6+.8*vnz(pos*vec2(3.,9.)+t*.02));",
    "  bright *= kind > 1.5 ? .5+lit : mix(.42 + 1.5*min(lit, 1.2), 1.15, g);",
    "  bright *= 1. + g*.6;",
    "  if (g == 0. && uMoment.z > 0. && uMoment.x >= 0.) bright *= 1. - .55*smoothstep(.3,2.2,uMoment.x)*(1.-smoothstep(uMoment.z-2.6,uMoment.z-.6,uMoment.x));",
    "  px *= mix(1., .85, g);",
    "  if (r7 > .25+.75*min(uInt,1.)) { cull(); return; }",
    "  gl_Position = vec4(warp(pos/hw, dz) + corner*px*2./uRes, 0., 1.); vQ = corner; vA = vec4(r3, bright, g, kind);",
    "}"
  ].join("\n");
  PART_VERT = PART_VERT.replace(/uUScale/g, "uScale");

  var PART_IFRAG = PO + [
    "vec4 fxi(){",
    "  float d = length(vQ); if (d > 1.) return vec4(0.);",
    "  float core = exp(-d*d*5.), disc = smoothstep(1.,.9,d), rim = smoothstep(.62,.95,d)*disc;",
    "  float a = vA.w > 1.5 ? disc*.3 + rim*.7 : core;",
    "  vec3 c = mix(vec3(.6,.76,1.), vec3(.93,.96,1.), core*(vA.w > 1.5 ? 0. : 1.));",
    "  c = mix(c, vec3(1.,.9,.7), vA.z*.5);",
    "  float e = a*vA.y*uInt;",
    "  return pout(c, e, .05);",
    "}"
  ].join("\n");

  // density map for the gather moment (red channel): a coin photo's edges and detail, always with the rim ring and reeding ticks
  var pState = { key: "" };
  function drawCoinMap(cx, w, h, t, info) {
    var key = info.coin ? "photo" : "ring";
    if (pState.key === key) return false;
    pState.key = key; 
    var R = w / 2, i;
    cx.globalCompositeOperation = "source-over";
    cx.fillStyle = "#000"; cx.fillRect(0, 0, w, h);
    if (info.coin) {
      cx.drawImage(info.coin, 0, 0, w, h);
      var im = cx.getImageData(0, 0, w, h), px = im.data, n = w * h, L = new Float32Array(n), B = new Float32Array(n), x, y, v, k;
      for (i = 0; i < n; i++) L[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) / 255;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {          // cheap 7 x 7 box blur = low-pass for a high-pass detail map
        var s = 0, c = 0, yy, xx;
        for (yy = Math.max(0, y - 3); yy <= Math.min(h - 1, y + 3); yy++) for (xx = Math.max(0, x - 3); xx <= Math.min(w - 1, x + 3); xx++) { s += L[yy * w + xx]; c++; }
        B[y * w + x] = s / c;
      }
      var D = new Float32Array(n), hist = new Uint32Array(256), cnt = 0, mx = 0.0001;
      for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
        k = y * w + x;
        var gx = L[k + 1] - L[k - 1], gy = L[k + w] - L[k - w];
        v = 0.55 * Math.abs(L[k] - B[k]) + 0.9 * Math.sqrt(gx * gx + gy * gy);
        D[k] = v; if (v > mx) mx = v;
      }
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {                    // percentile scale: the busiest 8 % of the coin saturates
        var ex = (x + 0.5 - R) / R, ey = (y + 0.5 - R) / R;
        if (ex * ex + ey * ey < 0.8) { hist[Math.min(255, Math.floor(D[y * w + x] / mx * 255))]++; cnt++; }
      }
      var acc = 0, p92 = 255;
      for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc > cnt * 0.08) { p92 = i; break; } }
      var norm = 1 / (Math.max(2, p92) / 255 * mx);
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        k = y * w + x;
        var dx = (x + 0.5 - R) / R, dy = (y + 0.5 - R) / R, rr = Math.sqrt(dx * dx + dy * dy);
        v = rr > 1 ? 0 : Math.min(1, D[k] * norm);
        v = rr > 1 ? 0 : 0.03 + 0.97 * Math.pow(v, 1.5);
        px[k * 4] = px[k * 4 + 1] = px[k * 4 + 2] = Math.round(v * 255); px[k * 4 + 3] = 255;
      }
      cx.putImageData(im, 0, 0);
    } else {
      cx.fillStyle = "rgba(255,255,255,.14)"; cx.beginPath(); cx.arc(R, R, R * 0.97, 0, 6.2832); cx.fill();   // faint filled disc
      cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = w * 0.02; cx.beginPath(); cx.arc(R, R, R * 0.82, 0, 6.2832); cx.stroke();   // inner ring
      cx.lineWidth = w * 0.012;
      for (i = 0; i < 5; i++) {                                                                                    // a five-point star in the field
        var a0 = -1.5708 + i * 1.2566, a1 = a0 + 2.5133;
        cx.beginPath(); cx.moveTo(R + Math.cos(a0) * R * 0.46, R + Math.sin(a0) * R * 0.46); cx.lineTo(R + Math.cos(a1) * R * 0.46, R + Math.sin(a1) * R * 0.46); cx.stroke();
      }
    }
    cx.strokeStyle = "rgba(255,255,255,.8)"; cx.lineWidth = w * 0.028; cx.beginPath(); cx.arc(R, R, R * 0.95, 0, 6.2832); cx.stroke();   // the outline
    cx.strokeStyle = "rgba(255,255,255,.55)"; cx.lineWidth = w * 0.012;
    for (i = 0; i < 90; i++) {                                                                                       // reeding ticks inside the rim
      var an = i * 0.069813;
      cx.beginPath(); cx.moveTo(R + Math.cos(an) * R * 0.88, R + Math.sin(an) * R * 0.88); cx.lineTo(R + Math.cos(an) * R * 0.99, R + Math.sin(an) * R * 0.99); cx.stroke();
    }
    return true;
  }

  FX.register("style-particles", {
    layer: "front", still: 24, tap: "warp", glsl: P + LIB + PBEAM,
    canvas: { w: 128, h: 128, fps: 6, draw: drawCoinMap },
    front: { rate: 0.3, size: 0.15, alpha: 0.08, kind: 0, color: [0.62, 0.76, 1.0] },
    moments: [{ name: "gather", every: [45, 90], dur: 8 }],
    passes: [
      { frag: PART_FRAG },
      { count: [2400, 4800, 8000, 11000], glow: 0.8, vert: PART_VERT, ifrag: PART_IFRAG }
    ]
  });


  /* =====================================================================================================================
     2. style-liquid  (The Mint / colossus)
     Molten silver. Ten metaballs (2D SDF, smooth-min) crawl along the left, right and bottom edges, merging and pulling apart
     very slowly; the centre stays calm. Shading reads as chrome: the surface normal comes from the SDF gradient (with a little
     noise so flat areas still move) and looks up a small procedural environment (bright sky, a horizon line, two window
     softboxes, an ember-lit floor); a dark Fresnel edge and an ember-orange rim light finish the metal, and a warm glow bleeds
     out of it. Moments: "drip" (a bead swells on an edge blob, stretches, pinches off and falls the length of the screen) and
     "swell" (the blobs grow and fuse for a few seconds). Still frame = a calm arrangement.
     ===================================================================================================================== */
  var LQ_BLOBS = [   // [anchor as a fraction of the half width (-1 left .. 1 right), x sway, y centre, y sway, radius, speed, phase]
    [-1.00, 0.06, 0.36, 0.12, 0.115, 0.11, 0.0],
    [-1.00, 0.07, 0.10, 0.13, 0.125, 0.09, 1.7],
    [-1.00, 0.06, -0.17, 0.13, 0.115, 0.13, 3.1],
    [-0.98, 0.05, -0.42, 0.07, 0.125, 0.10, 5.0],
    [1.00, 0.06, 0.30, 0.13, 0.120, 0.10, 4.2],
    [1.00, 0.07, 0.03, 0.14, 0.115, 0.08, 2.4],
    [1.00, 0.06, -0.24, 0.13, 0.125, 0.12, 0.6],
    [0.98, 0.05, -0.46, 0.06, 0.110, 0.09, 5.3],
    [-0.40, 0.12, -0.53, 0.03, 0.110, 0.09, 0.9],
    [0.36, 0.12, -0.53, 0.03, 0.120, 0.07, 3.8]
  ];
  function nf(x) { x = +x; return (x % 1 === 0) ? x.toFixed(1) : String(x); }
  function dripBlob(b) {   // GLSL for a blob's centre (matches lqD's motion)
    return "vec2(" + nf(b[0]) + "*(hx+.09*(1.-rs)) + " + nf(b[1]) + "*rs*sin(t*" + nf(b[5] * 1.3) + "+" + nf(b[6]) + "), " + nf(b[2]) + " + " + nf(b[3]) + "*sin(t*" + nf(b[5]) + "+" + nf(b[6] + 1.3) + "))";
  }
  var LQ_FIELD = (function () {
    var g = [
      "float lqSmin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }",
      "float lqSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
      // the field: nine edge blobs, the swell moment and the drip (bead + neck)
      "float lqD(vec2 p, float hx, float rs, float t, float swell){",
      "  float d = 1e3, k = .2*rs + .02, grow = 1. + .32*swell; vec2 c; float r;"
    ];
    LQ_BLOBS.forEach(function (b) {
      g.push("  c = vec2(" + nf(b[0]) + "*(hx+.09*(1.-rs)) + " + nf(b[1]) + "*rs*sin(t*" + nf(b[5] * 1.3) + "+" + nf(b[6]) + "), " + nf(b[2]) + " + " + nf(b[3]) + "*sin(t*" + nf(b[5]) + "+" + nf(b[6] + 1.3) + "));");
      g.push("  r = " + nf(b[4] * 0.76) + "*rs*grow*(1.+.12*sin(t*" + nf(b[5] * 1.7) + "+" + nf(b[6] + 2.1) + "));");
      g.push("  d = lqSmin(d, length(p-c) - r, k);");
    });
    g.push(
      "  if (uMoment.z > 0. && uMoment.w < .5 && uMoment.x >= 0.) {",
      "    float side = h11(uMoment.y) > .5 ? 1. : -1.; float tau = uMoment.x - .9;",
      // the bead grows from the lower inner side of the top blob on that edge (same motion as its blob), then falls clear of the column
      "    vec2 bc = side > 0. ? " + dripBlob(LQ_BLOBS[4]) + " : " + dripBlob(LQ_BLOBS[0]) + ";",
      "    float rb = .09*rs;",
      "    vec2 o = bc + vec2(-side*.55*rb, -.5*rb);",
      "    float swl = smoothstep(0., .9, uMoment.x);",
      "    float fall = tau > 0. ? .03*tau + .15*tau*tau : 0.;",
      "    vec2 hc = o + vec2(-side*(.16*rs*smoothstep(0.,1.6,tau)) + .004*rs*sin(tau*3.), -fall);",
      "    float rn = .022*rs*(1.-smoothstep(.6, 1.5, tau))*swl;",
      "    float rh = (.02 + .026*swl + .012*smoothstep(0., 1.6, tau))*rs;",
      "    vec2 q = p - hc; q.y *= .78 + .22*(1.-smoothstep(0., 1.5, tau));",
      "    float dh = length(q) - rh;",
      "    if (rn > .002*rs) { float dn = lqSeg(p, o, hc) - rn; dh = lqSmin(dh, dn, .03*rs); }",
      "    d = lqSmin(d, dh, .03*rs);",
      "  }",
      "  return d; }",
      "vec3 lqEnv(vec3 r, float t){",
      "  float y = r.y;",
      "  vec3 sky = mix(vec3(.10,.12,.17), vec3(1.25,1.22,1.18), smoothstep(.62,.0,y)*smoothstep(-.02,.0,y)+smoothstep(.0,.0001,y)*.0);",
      "  sky = mix(vec3(1.25,1.22,1.18), vec3(.15,.17,.22), smoothstep(.02,.8,y));",
      "  vec3 gnd = mix(vec3(.34,.115,.03), vec3(.012,.008,.006), smoothstep(-.02,-.32,y));",         // ember-lit floor: hot at the horizon, black below
      "  vec3 c = mix(gnd, sky, smoothstep(-.05,.05,y));",
      "  float bx = r.x + .08*sin(t*.12);",                                                       // window softboxes slide through the reflection
      "  float box = smoothstep(.1,.075,abs(bx+.42)) + smoothstep(.06,.04,abs(bx-.14)) + smoothstep(.05,.035,abs(bx-.62));",
      "  c += vec3(1.3,1.25,1.2)*box*smoothstep(.02,.18,y)*smoothstep(.85,.5,y);",
      "  c += vec3(1.,.5,.15)*exp(-pow((y+.12)/.05,2.))*.45;",                                      // ember streak under the horizon
      "  return c; }"
    );
    return g.join("\n");
  })();

  FX.register("style-liquid", {
    layer: "front", still: 14, tap: true, glsl: P + LIB + LQ_FIELD,
    front: { rate: 0.4, size: 0.07, alpha: 0.11, kind: 2, color: [1.0, 0.5, 0.16] },
    moments: [{ name: "drip", every: [20, 48], dur: 6.5 }, { name: "swell", every: [34, 75], dur: 8 }],
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float hx = a*.5; float rs = clamp(a/1.4, .5, 1.); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  float swell = (uMoment.z > 0. && uMoment.w > .5 && uMoment.x >= 0.) ? sin(PI*clamp(uMoment.x/uMoment.z,0.,1.)) : 0.;",
      "  float d = lqD(p, hx, rs, t, swell);",
      "  float aa = 1.6*uScale/uRes.y;",
      "  vec3 c = vec3(0.); float al = 0.;",
      // ember light bleeding out of the metal
      "  float glowD = exp(-max(d,0.)/(.045*rs+.012));",
      "  c += vec3(1.,.4,.09)*glowD*.11*(1.-smoothstep(-.01,.006,d));",
      "  if (d < aa) {",
      "    float e = .0035;",
      "    vec2 g = vec2(lqD(p+vec2(e,0.),hx,rs,t,swell)-lqD(p-vec2(e,0.),hx,rs,t,swell), lqD(p+vec2(0.,e),hx,rs,t,swell)-lqD(p-vec2(0.,e),hx,rs,t,swell));",
      "    g = g/(length(g)+1e-5);",
      "    float ph = clamp(-d/(.075*rs+.02), 0., 1.);",
      "    vec2 nz = (vec2(fbmQ(p*6.+vec2(t*.07,0.), 3), fbmQ(p*6.+vec2(7.,-t*.05), 3)) - .5)*1.1;",
      "    vec3 n = normalize(vec3(g*(1.-ph) + nz*(.4+.6*ph), .45 + .9*ph) + vec3(0., .16, 0.));",
      "    vec3 r = vec3(2.*n.z*n.x, 2.*n.z*n.y, 2.*n.z*n.z-1.);",
      "    vec3 m = lqEnv(r, t);",
      "    float fre = pow(1.-n.z, 2.2);",
      "    m = mix(m, vec3(.05,.03,.02), clamp(fre*.75, 0., .8));",                         // dark Fresnel edge
      "    float rim = smoothstep(-.016*rs-.003, 0., d)*(.5 + .5*(.5-.5*g.y));",            // ember-orange rim light, strongest underneath
      "    m = mix(m, vec3(1.,.5,.12)*1.4, rim*.8);",
      "    float cov = smoothstep(aa, -aa, d);",
      "    float ai = clamp(I*.95, 0., .8)*cov;",
      "    c += m*ai; al += ai*.9;",
      "  }",
      "  return vec4(c, clamp(al, 0., .8));",
      "}"].join("\n") }]
  });

  /* =====================================================================================================================
     3. style-holo  (Prism / kaleido)
     Holographic foil. A thin-film interference field (optical path = a diagonal coordinate warped by slow noise) cycles
     the full spectrum, but only soft diagonal bands of it are lit, so most of the screen stays clear; a ribbed micro-texture
     rides on the bands and a field of fine diffraction glints (four-point stars that flash as the foil "tilts") sparkles across
     them. The tilt follows the pointer (the engine's smoothed parallax, uPar) and nudges with scrolling. Moment "foil-sweep":
     one broad bright rainbow band crosses the screen and the glints flare inside it. Still frame = bands and glints frozen mid-sweep.
     ===================================================================================================================== */
  var HOLO_LIB = [
    "vec3 foil(float x){ return .66+.34*cos(6.2832*(x+vec3(0.,.3333,.6667))); }",
    "float star4(vec2 f, float k){ return (exp(-abs(f.x)*k)*exp(-abs(f.y)*k*.14) + exp(-abs(f.y)*k)*exp(-abs(f.x)*k*.14))*.6 + exp(-dot(f,f)*k*k*.09); }"
  ].join("\n") + "\n";

  FX.register("style-holo", {
    layer: "front", still: 17, tap: true, glsl: P + LIB + HOLO_LIB,
    front: { rate: 0.4, size: 0.12, alpha: 0.08, kind: 1, color: [0.92, 0.82, 1.0] },
    moments: [{ name: "foil-sweep", every: [24, 55], dur: 5.5 }],
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  vec2 tl = -uPar*38.;",                                                            // smoothed pointer tilt (about +-.6) plus scroll nudge
      "  vec2 dv = vec2(.82,.57), pv = vec2(-.57,.82);",
      "  float u = dot(p, dv), v = dot(p, pv);",
      "  float n = fbmQ(p*1.25 + vec2(t*.018, -t*.012) + tl*.35, uQ>1.5 ? 4 : 3);",
      "  float thick = u*.9 + n*1.5 + dot(tl, dv)*.9 + t*.03;",
      "  float band = pow(.5+.5*sin(u*6.4 - t*.24 + n*2.6 + dot(tl,dv)*1.5), 2.8);",
      "  float k = mK(); float env = 0.; float sw = 0.;",
      "  if (k >= 0.) { env = sin(PI*k); float pos = mix(-1.15, 1.15, k); float ds = u - pos; sw = exp(-ds*ds/.025)*env; band = max(band, sw); }",
      "  vec3 c = foil(thick*1.3)*band*.95 + vec3(1.,.97,1.)*pow(band,12.)*.3;",
      "  float rib = pow(.5+.5*sin(v*250. + n*14.), 3.);",                                 // fine foil ribbing
      "  c += foil(thick*2.1+.2)*rib*band*.1;",
      // glints: four-point stars in a cell grid that flash as the tilt changes
      "  vec2 gp = p*46. + 100.; vec2 id = floor(gp); vec2 fq = fract(gp)-.5;",
      "  float rh = h21(id); vec2 jit = (h22(id+3.)-.5)*.5;",
      "  float on = step(.8, rh);",
      "  float tw = pow(max(0., sin(t*(.8+rh*2.) + rh*60. + dot(tl, vec2(9.,7.))*3.)), 14.);",
      "  float glint = on*tw*star4((fq-jit)*1.1, 12.)*(.3 + 1.1*band + 2.*sw);",
      "  c += hsv(fract(rh*7. + thick*.5), .5, 1.)*glint*1.4;",
      "  float edge = .6+.4*smoothstep(.1,.8,length(p*vec2(.7,1.)));",
      "  c *= edge*I*.75;",
      "  return fin(c, max(max(c.r,c.g),c.b)*.045);",
      "}"].join("\n") }]
  });

  /* =====================================================================================================================
     4. style-neon  (Neon Vault / neon)
     Neon tubes drawn as signed-distance strokes: a thin outline frame hugging the screen edge (bent from two pieces, with gaps),
     a coin sign (ring, inner ring, a dollar sign) and three outline stars in cyan and magenta. Each tube has a hot near-white core,
     a tight halo and a wide bloom, and breathes a few percent. Glyphs sit in the margins (anchored to the screen edges, scaled for
     phones) and the engine's text mask keeps them off the words. Moment "flicker" (every 26-60 s, 3.2 s): about half the signs
     stutter on and off like a failing tube with a 60 Hz buzz in the halo, then catch and settle. Still frame = every tube lit.
     ===================================================================================================================== */
  var NEON_LIB = [
    "vec2 rr(vec2 p, float a){ float c=cos(a), s=sin(a); return vec2(c*p.x-s*p.y, s*p.x+c*p.y); }",
    "float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }",
    "float sdArcL(vec2 p, vec2 sc, float ra){ p.x = abs(p.x); return (sc.y*p.x > sc.x*p.y) ? length(p-sc*ra) : abs(length(p)-ra); }",
    "float sdRBox(vec2 p, vec2 b, float r){ vec2 q = abs(p)-b+r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }",
    // outline star (Inigo Quilez's sdStar5, taken as an absolute distance)
    "float sdStar5(vec2 p, float r, float rf){",
    "  const vec2 k1 = vec2(.809016994375, -.587785252292); const vec2 k2 = vec2(-k1.x, k1.y);",
    "  p.x = abs(p.x); p -= 2.*max(dot(k1,p),0.)*k1; p -= 2.*max(dot(k2,p),0.)*k2; p.x = abs(p.x); p.y -= r;",
    "  vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0.,1.); float h = clamp(dot(p,ba)/dot(ba,ba), 0., r);",
    "  return length(p-ba*h); }",
    // a dollar sign: two 240-degree arcs form the S, one bar goes through it; s = the arcs' radius
    "float dollarD(vec2 p, float s){",
    "  vec2 sc = vec2(.8660254, -.5);",
    "  float d1 = sdArcL(rr(p-vec2(0.,s), -1.0472), sc, s);",
    "  float d2 = sdArcL(rr(p+vec2(0.,s), 2.0944), sc, s);",
    "  float d3 = sdSeg(p, vec2(0.,-2.4*s), vec2(0.,2.4*s));",
    "  return min(min(d1,d2),d3); }",
    // one neon tube: hot core + tight halo + wide bloom (d in screen-height units, w = core sigma, g = gain)
    "vec3 tube(float d, vec3 col, float w, float g, float seg){",
    "  float core = exp(-d*d/(w*w));",
    "  float h1 = exp(-d/(w*5.)), h2 = exp(-d/(w*20.));",
    "  return (col*(h1*.55*seg + h2*.26) + mix(col, vec3(1.), .75)*core*1.05*seg)*g; }",
    // per-sign flicker: gentle breathing always; in the moment about half the signs stutter, then settle
    "float neonFlk(float id, out float buzz){",
    "  float base = .94 + .06*sin(uTime*(1.1+id*.55)+id*5.);",
    "  buzz = 0.;",
    "  if (uMoment.z > 0. && uMoment.x >= 0.) {",
    "    float k = uMoment.x;",
    "    float hit = step(.45, h11(id*3.7 + floor(uMoment.y)));",
    "    float stab = smoothstep(2.3, 2.9, k);",
    "    float st = step(.42, h11(floor(k*17.)*1.7 + id*11.3 + uMoment.y));",
    "    base *= mix(1., mix(.1 + .9*st, 1., stab), hit);",
    "    buzz = hit*(1.-stab);",
    "  }",
    "  return base; }"
  ].join("\n") + "\n";

  FX.register("style-neon", {
    layer: "front", still: 9, tap: true, glsl: P + LIB + NEON_LIB,
    front: { rate: 0.4, size: 0.09, alpha: 0.1, kind: 2, color: [1.0, 0.25, 0.7] },
    moments: [{ name: "flicker", every: [26, 60], dur: 3.2 }],
    passes: [{ frag: [
      "vec4 fx(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float hx = a*.5; float I = clamp(uInt,0.,1.3); float t = uTime;",
      "  float w = 1.5*uScale/uRes.y;",                                               // core sigma: about 1.5 css px at any resolution
      "  float rs = clamp(a/1.25, .5, 1.);",                                          // phones: smaller signs
      "  vec3 C = vec3(.1,.88,1.), M = vec3(1.,.14,.72);",
      "  vec3 c = vec3(0.); float bz; float f;",
      // 1. the frame: two bent pieces with gaps, cyan on the left and magenta on the right
      "  { f = neonFlk(0., bz);",
      "    float df = abs(sdRBox(p, vec2(hx-.028, .5-.028), .05));",
      "    float g1 = smoothstep(.075,.11,abs(p.x-.2)) + step(p.y, 0.);",              // gap near the top, centred a bit right
      "    float g2 = smoothstep(.07,.1,abs(p.y+.08)) + step(0., p.x);",               // gap on the left edge
      "    float g3 = smoothstep(.07,.1,abs(p.x+.25)) + step(0., p.y);",               // gap near the bottom, left of centre
      "    float seg = clamp(min(min(g1, g2), g3), 0., 1.);",
      "    vec3 fc3 = mix(C, M, smoothstep(-.2,.2, p.x/hx*.6 + p.y*.25));",
      "    c += tube(df, fc3, w, .75*f*(1.+.1*bz*sin(t*377.)), seg); }",
      // 2. the coin sign, high in the right margin
      "  { f = neonFlk(1., bz);",
      "    vec2 cc = vec2(hx - .2*rs - .02, .17*rs + .1); float R = .125*rs; vec2 q = p-cc;",
      "    cc.y += .006*sin(t*.4); q = p-cc;",
      "    float ring = abs(length(q)-R);",
      "    float ring2 = abs(length(q)-R*.78);",
      "    float ang = atan(q.y,q.x); float tick = step(.5, fract(ang*7.6394)) * step(R*.84, length(q)) * step(length(q), R*.93);",   // dashed band between the rings
      "    float dd = dollarD(q, R*.26);",
      "    float gk = f*(1.+.1*bz*sin(t*377.));",
      "    c += tube(ring, C, w*1.15, 1.15*gk, 1.) + tube(ring2, C, w*.8, .5*gk, 1.) + tube(dd, M, w*1.1, 1.05*gk, 1.);",
      "    c += C*tick*.05*gk; }",
      // 3. outline stars, left margin and top right
      "  { f = neonFlk(2., bz); vec2 sp = vec2(-hx + .17*rs + .02, .22 + .02*sin(t*.5)); float sr = .07*rs;",
      "    float ds = abs(sdStar5(rr(p-sp, .12*sin(t*.3)), sr, .45)); c += tube(ds, M, w, 1.05*f*(1.+.1*bz*sin(t*377.)), 1.); }",
      "  { f = neonFlk(3., bz); vec2 sp = vec2(-hx + .12*rs + .02, -.2 + .015*sin(t*.4+1.)); float sr = .05*rs;",
      "    float ds = abs(sdStar5(rr(p-sp, -.2), sr, .45)); c += tube(ds, C, w*.9, 1.0*f*(1.+.1*bz*sin(t*377.)), 1.); }",
      "  { f = neonFlk(4., bz); vec2 sp = vec2(hx - .13*rs - .02, -.28 + .012*sin(t*.45+2.)); float sr = .06*rs;",
      "    float ds = abs(sdStar5(rr(p-sp, .35), sr, .45)); c += tube(ds, M, w, 1.0*f*(1.+.1*bz*sin(t*377.)), 1.); }",
      "  c *= I*.78;",
      "  return fin(c, max(max(c.r,c.g),c.b)*.05);",
      "}"].join("\n") }]
  });

  /* =====================================================================================================================
     5. style-vhs  (Neon Vault / neon; runs combined as "style-neon+style-vhs*0.7")
     A VHS tape: a tracking band that drifts up the screen (streaky tape noise that slides sideways line by line, with magenta and
     cyan chroma-split copies of the streaks), faint scanlines, fine tape grain and short white drop-outs, a head-switching noise
     strip along the bottom edge and, in the moment "tear" (every 22-50 s, 2.4 s), a violent tear that climbs out of it. A small
     "PLAY" on-screen display is drawn into the canvas texture. Still frame = the band parked mid screen.
     ===================================================================================================================== */
  var vhsOsd = { sec: -1 };
  function drawOsd(cx, w, h, t, info) {
    var sec = info.still ? 1 : Math.floor(t);
    if (vhsOsd.sec === sec) return false;
    vhsOsd.sec = sec;
    cx.clearRect(0, 0, w, h);
    cx.font = "bold 30px ui-monospace, 'Courier New', monospace"; cx.textBaseline = "top";
    var s = sec % 60, m = Math.floor(sec / 60) % 60, txt = "SP  0:" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    cx.fillStyle = "rgba(255,255,255,.95)"; cx.fillText("▶ PLAY", 6, 4);
    cx.font = "bold 22px ui-monospace, 'Courier New', monospace"; cx.fillText(txt, 6, 44);
    return true;
  }

  FX.register("style-vhs", {
    layer: "front", still: 7, glsl: P + LIB,
    canvas: { w: 256, h: 80, fps: 2, draw: drawOsd },
    moments: [{ name: "tear", every: [22, 50], dur: 2.4 }],
    passes: [{ frag: [
      "uniform sampler2D uTex; uniform vec2 uTexRes;",
      "vec4 fx(vec2 fc){",
      "  float t = uTime; vec2 uv = fc/uRes; float I = clamp(uInt,0.,1.3);",
      "  vec2 px = fc/uScale;",                                                       // css-pixel coordinates (device independent)
      "  float tf = floor(t*14.);",                                                   // tape noise runs at 14 fps
      "  float k = (uMoment.z > 0. && uMoment.x >= 0.) ? uMoment.x/uMoment.z : -1.;",
      "  float env = k < 0. ? 0. : sin(PI*clamp(k,0.,1.));",
      "  vec3 c = vec3(0.); float al = 0.;",
      // faint scanlines (3 css px pitch) and a slow brightness roll
      "  float ln = pow(.5+.5*cos(px.y*2.0944), 3.);",
      "  al += ln*.085;",
      "  c += vec3(.45,.55,1.)*exp(-pow((uv.y-fract(t*.037))/.17,2.))*.02;",
      // tracking band, drifting up
      "  float yb = fract(t*.05 + .15 + .1*env);",
      "  float bh = .038 + .016*sin(t*.7) + .03*env;",
      "  float inB = exp(-pow((uv.y-yb)/bh,2.));",
      "  float row = floor(px.y/2.);",
      "  float jit = (h11(row*1.7 + tf*3.1) - .5);",
      "  float off = jit*(90.+160.*env)*inB;",
      "  float segw = 6. + 30.*h11(row + tf);",
      "  float nz  = step(.45, h21(vec2(floor((px.x+off)/segw),      row + tf*13.)));",
      "  float nzR = step(.45, h21(vec2(floor((px.x+off-6.)/segw),   row + tf*13.)));",
      "  float nzB = step(.45, h21(vec2(floor((px.x+off+6.)/segw),   row + tf*13.)));",
      "  c += (vec3(1.,.12,.62)*nzR + vec3(.1,.9,1.)*nzB + vec3(.9,.92,1.)*nz*.55)*inB*.3;",
      "  al += inB*.05;\n      c += vec3(.8,.85,1.)*exp(-pow((uv.y-yb-bh*.9)/.0025,2.))*.1*(1.-env*.3);",
      // head-switching strip at the bottom edge, and the tear that climbs out of it
      "  float hh = .045 + .1*env;",
      "  float kb = 1.-smoothstep(0., hh, uv.y);",
      "  float hsh = (h11(row*2.1 + tf*5.) - .5)*kb*(150.+500.*env);",
      "  float hn = step(.38, h21(vec2(floor((px.x+hsh)/9.), row + tf*9.)));",
      "  c += vec3(.85,.9,1.)*hn*kb*(.34+.4*env);",
      "  c += (vec3(1.,.12,.62)*step(.5, h21(vec2(floor((px.x+hsh-7.)/9.), row+tf*9.))) + vec3(.1,.9,1.)*step(.5, h21(vec2(floor((px.x+hsh+7.)/9.), row+tf*9.))))*kb*.12*(1.+2.*env);",
      "  c += vec3(.8,.85,1.)*exp(-pow((uv.y-.05-.1*env)/.003,2.))*(.08+.12*env);",
      "  al += kb*.05;",
      // tape grain and the odd drop-out dash
      "  float gr = h21(px + tf*17.);",
      "  c += vec3(.8,.85,1.)*step(.982, gr)*.07;",
      "  float dro = step(.9975, h11(row*3.3 + floor(t*2.7)*7.1));",
      "  float dx = h11(row + floor(t*2.7)*3.1)*.8;",
      "  c += vec3(.95)*dro*step(dx, uv.x)*step(uv.x, dx + .05 + .1*h11(row))*.4;",
      // on-screen display: PLAY and the counter (bottom left on wide screens, under the header on phones)
      "  float H = uRes.y/uScale;",
      "  vec2 oc = uRes.x < uRes.y ? vec2(16., H - 118.) : vec2(24., 28.);",
      "  vec2 ot = (px - oc)/vec2(160., 50.);",
      "  if (ot.x > 0. && ot.x < 1. && ot.y > 0. && ot.y < 1.) {",
      "    float vv = 1.-ot.y;",
      "    float rr0 = texture(uTex, vec2(ot.x+.012, vv)).a, gg0 = texture(uTex, vec2(ot.x, vv)).a, bb0 = texture(uTex, vec2(ot.x-.012, vv)).a;",
      "    c += vec3(rr0*1.2, gg0*1.2, bb0*1.2)*(1.-.8*env);",
      "  }",
      "  c *= I*.8;",
      "  return fin(c, al*I);",
      "}"].join("\n") }]
  });
})();
