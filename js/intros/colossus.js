/* The Mint intro (Grok, 2026-10-20, v3: GPU). Coin minting as real-time GPU simulation, in six hard-cut stations:
   1 POUR    a Navier-Stokes fluid sim (velocity, vorticity confinement, pressure projection, mould as a solid): molten metal
             streams from a tipping crucible, splashes and pools in the ingot mould; colour from a blackbody ramp on the dye's
             temperature, surface normals from the dye field, heat haze in post driven by the same field.
   2 ROLL    raymarched SDF rolling mill: two brushed-steel rolls squeeze the glowing strip, which cools as it thins.
   3 BLANK   top-down raymarch: the punch drops three times, each hit leaves a hole in the strip.
   4 UPSET   blanks roll on edge through the upsetting mill and come out with a raised rim.
   5 STRIKE  the hammer die drops onto the blank: HDR flash, a shockwave ring, camera shake, a burst of sparks.
   6 TRAY    the struck coin, raymarched with its relief (device + TITAN RELIQUARY legend) from a height map, spins and lands on
             a velvet tray of coins; a light sweep runs across the relief.
   Sparks are stateless GPU particles; everything renders into an HDR buffer with 5-level bloom, ACES tonemap, grain and
   vignette. The fx/ library (fx/fluid.js, fx/post.js) is a single page-background canvas with no deterministic seek, so the
   same algorithms run inline here in the intro's own WebGL2 context (fixed 1/60 s steps: seeking and skipping replay exactly).
   Fallback without WebGL2 + float targets (and the reduced-motion still): the Canvas 2D version below. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var T = { pour: [0, 0.75], roll: [0.75, 1.35], blank: [1.35, 1.95], upset: [1.95, 2.45], strike: [2.45, 3.0], tray: [3.0, 4.8] }, HIT = 2.72;
  function steel(g, x0, y0, x1, y1, hot) {
    var gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, K.mixc("#5d6268", "#ff7a1a", hot)); gr.addColorStop(0.35, K.mixc("#e9edf2", "#fff2b0", hot)); gr.addColorStop(0.55, K.mixc("#8a9097", "#ffb02a", hot)); gr.addColorStop(1, K.mixc("#3a3e44", "#c23a08", hot)); return gr;
  }
  function face(R) {                                         // the struck coin's face, rendered once
    var s = Math.ceil(R * 2 + 4), c = K.mk(s, s), g = c.getContext("2d"), cx = s / 2, cy = s / 2, i;
    var gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R); gr.addColorStop(0, "#f6d68a"); gr.addColorStop(0.4, "#c8902e"); gr.addColorStop(0.8, "#8a5a16"); gr.addColorStop(1, "#4a2c08");
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, K.PI2); g.fill();
    g.lineWidth = R * 0.07; g.strokeStyle = "#f6d987"; g.beginPath(); g.arc(cx, cy, R * 0.955, 0, K.PI2); g.stroke();
    g.fillStyle = "#7a4e14"; for (i = 0; i < 72; i++) { var a = i / 72 * K.PI2; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, R * 0.012, 0, K.PI2); g.fill(); }
    // legend around the rim
    var str = "TITAN \u2022 RELIQUARY \u2022 MMXXVI \u2022", fs = R * 0.17; g.font = "700 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
    var tot = 0, ws = []; for (i = 0; i < str.length; i++) { ws.push(g.measureText(str[i]).width + fs * 0.08); tot += ws[i]; }
    var a0 = -Math.PI / 2 - (tot / (R * 0.72)) / 2;
    for (i = 0; i < str.length; i++) { var aa = a0 + (ws[i] / 2) / (R * 0.72); g.save(); g.translate(cx + Math.cos(aa) * R * 0.72, cy + Math.sin(aa) * R * 0.72); g.rotate(aa + Math.PI / 2);
      g.fillStyle = "#3a2004"; g.fillText(str[i], 1.2, 1.2); g.fillStyle = "#ffe9a8"; g.fillText(str[i], 0, 0); g.restore(); a0 += ws[i] / (R * 0.72); }
    // central device: a reliquary casket in relief, with a small sun behind it
    g.save(); g.translate(cx, cy + R * 0.05); var u = R * 0.2;
    function relief(fn) { g.save(); g.translate(1.2, 1.4); g.fillStyle = "rgba(50,28,4,.9)"; fn(); g.restore(); g.save(); g.translate(-0.8, -0.8); g.fillStyle = "rgba(255,248,215,.9)"; fn(); g.restore(); g.fillStyle = "#e0ac48"; fn(); }
    for (i = 0; i < 16; i++) { var b = i / 16 * K.PI2; relief(function () { g.save(); g.rotate(b); g.fillRect(-u * 0.04, -u * 2.2, u * 0.08, u * 0.6); g.restore(); }); }
    relief(function () { g.beginPath(); g.moveTo(-u * 1.3, -u * 0.2); g.lineTo(0, -u * 1.3); g.lineTo(u * 1.3, -u * 0.2); g.closePath(); g.fill(); });
    relief(function () { g.fillRect(-u * 1.15, -u * 0.2, u * 2.3, u * 1.4); });
    relief(function () { g.fillRect(-u * 1.35, u * 1.2, u * 2.7, u * 0.25); });
    g.fillStyle = "#8a5a18"; g.fillRect(-u * 0.12, u * 0.2, u * 0.24, u * 0.6); g.restore();
    g.font = "700 " + R * 0.1 + "px " + K.MONO; g.fillStyle = "#7a4e14"; g.fillText("No. 34", cx, cy + R * 0.55);
    return c;
  }
  function plainCoin(g, x, y, r, sx, rim) {                 // blank / tray coin, sx = horizontal squash for spin
    g.save(); g.translate(x, y); g.scale(Math.max(0.04, Math.abs(sx)), 1);
    var gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r); gr.addColorStop(0, "#fff0c4"); gr.addColorStop(0.6, "#d0a048"); gr.addColorStop(1, "#7a4e14");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, K.PI2); g.fill(); if (rim) { g.strokeStyle = "#f2d07a"; g.lineWidth = r * 0.12; g.beginPath(); g.arc(0, 0, r * 0.92, 0, K.PI2); g.stroke(); } g.restore();
  }
  function sparks(g, x, y, t, n, spread, lite) { if (lite) n = Math.ceil(n / 3); for (var i = 0; i < n; i++) { var ph = (t * 1.7 + K.hash(i)) % 1, a = -Math.PI / 2 + (K.hash(i + 9) - 0.5) * spread, v = 160 + 220 * K.hash(i + 3);
      var px = x + Math.cos(a) * v * ph, py = y + Math.sin(a) * v * ph + 300 * ph * ph; g.strokeStyle = "rgba(255," + (200 - ph * 120 | 0) + ",80," + (1 - ph) + ")"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px, py); g.lineTo(px - Math.cos(a) * 7, py - Math.sin(a) * 7 - 6 * ph); g.stroke(); } }
  function label(g, W, H, s, k) { g.font = "600 " + Math.max(12, W * 0.03) + "px " + K.MONO; g.textAlign = "left"; g.textBaseline = "top"; g.fillStyle = "rgba(255,200,120,.75)"; g.fillText("0" + k + " \u2014 " + s, 18, H - 44); g.fillStyle = "rgba(255,200,120,.35)"; g.fillRect(18, H - 26, W * 0.3, 1); }
  /* ---------- inline GPU kit (WebGL2, HDR): fluid sim, stateless GPU particles, bloom + ACES post ---------- */
  function GPU(C, scale) {
    var cv = document.createElement("canvas"); cv.className = "ts-mo ts-mogl"; cv.setAttribute("aria-hidden", "true");
    var x = null; try { x = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" }); } catch (e) { x = null; }
    if (!x || !x.getExtension("EXT_color_buffer_float")) return null; x.getExtension("OES_texture_float_linear");
    var d = Math.min(window.devicePixelRatio || 1, 2) * (scale || 1); cv.width = Math.round(C.W * d); cv.height = Math.round(C.H * d);
    var VQ = "#version 300 es\nin vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    var HD = "#version 300 es\nprecision highp float;precision highp sampler2D;in vec2 uv;out vec4 o;\n" +
      "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n" +
      "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}\n" +
      "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+1.7;a*=.5;}return s;}\n";
    var buf = x.createBuffer(); x.bindBuffer(x.ARRAY_BUFFER, buf); x.bufferData(x.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), x.STATIC_DRAW);
    var G = { x: x, cv: cv, HD: HD, W: cv.width, H: cv.height, progs: [] };
    G.prog = function (fs, vs) {
      function sh(ty, src) { var s = x.createShader(ty); x.shaderSource(s, src); x.compileShader(s); if (!x.getShaderParameter(s, x.COMPILE_STATUS)) { if (window.console) console.warn("intro gpu", x.getShaderInfoLog(s)); return null; } return s; }
      var a = sh(x.VERTEX_SHADER, vs || VQ), b = sh(x.FRAGMENT_SHADER, vs ? fs : HD + fs); if (!a || !b) return null;
      var p = x.createProgram(); x.attachShader(p, a); x.attachShader(p, b); x.bindAttribLocation(p, 0, "p"); x.linkProgram(p); if (!x.getProgramParameter(p, x.LINK_STATUS)) return null;
      var U = {}, n = x.getProgramParameter(p, x.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var inf = x.getActiveUniform(p, i); U[inf.name] = { l: x.getUniformLocation(p, inf.name), t: inf.type }; }
      return { p: p, U: U };
    };
    G.fbo = function (w, h, lin) { var t = x.createTexture(); x.bindTexture(x.TEXTURE_2D, t); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, lin === false ? x.NEAREST : x.LINEAR); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, lin === false ? x.NEAREST : x.LINEAR);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_S, x.CLAMP_TO_EDGE); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_T, x.CLAMP_TO_EDGE); x.texImage2D(x.TEXTURE_2D, 0, x.RGBA16F, w, h, 0, x.RGBA, x.HALF_FLOAT, null);
      var f = x.createFramebuffer(); x.bindFramebuffer(x.FRAMEBUFFER, f); x.framebufferTexture2D(x.FRAMEBUFFER, x.COLOR_ATTACHMENT0, x.TEXTURE_2D, t, 0); var ok = x.checkFramebufferStatus(x.FRAMEBUFFER) === x.FRAMEBUFFER_COMPLETE; x.bindFramebuffer(x.FRAMEBUFFER, null);
      return ok ? { t: t, f: f, w: w, h: h } : null; };
    G.dbl = function (w, h) { var a = G.fbo(w, h), b = G.fbo(w, h); if (!a || !b) return null; return { r: a, w: b, swap: function () { var t = this.r; this.r = this.w; this.w = t; } }; };
    G.tex = function (src) { var t = x.createTexture(); x.bindTexture(x.TEXTURE_2D, t); x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, true); x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, x.RGBA, x.UNSIGNED_BYTE, src); x.generateMipmap(x.TEXTURE_2D);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, x.LINEAR_MIPMAP_LINEAR); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, x.LINEAR); x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, false); return t; };
    G.run = function (P, u, target, n) {           // u: {name: number|[..]|{t:texture}}; textures bound to units in order
      x.useProgram(P.p); var unit = 0;
      for (var k in u) { var e = P.U[k]; if (!e) continue; var v = u[k];
        if (v && v.t !== undefined) { x.activeTexture(x.TEXTURE0 + unit); x.bindTexture(x.TEXTURE_2D, v.t); x.uniform1i(e.l, unit++); }
        else if (typeof v === "number") { if (e.t === x.INT) x.uniform1i(e.l, v); else x.uniform1f(e.l, v); }
        else if (v.length === 2) x.uniform2f(e.l, v[0], v[1]); else if (v.length === 3) x.uniform3f(e.l, v[0], v[1], v[2]); else x.uniform4f(e.l, v[0], v[1], v[2], v[3]); }
      if (target) { x.bindFramebuffer(x.FRAMEBUFFER, target.f); x.viewport(0, 0, target.w, target.h); } else { x.bindFramebuffer(x.FRAMEBUFFER, null); x.viewport(0, 0, cv.width, cv.height); }
      if (n) x.drawArrays(x.POINTS, 0, n); else { x.bindBuffer(x.ARRAY_BUFFER, buf); x.enableVertexAttribArray(0); x.vertexAttribPointer(0, 2, x.FLOAT, false, 0, 0); x.drawArrays(x.TRIANGLES, 0, 3); }
    };
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); C._glDead = true; cv.style.display = "none"; });
    C._gl = { cv: cv, x: x }; C.root.insertBefore(cv, C.cv);
    return G;
  }
  /* Navier-Stokes (stable fluids): velocity, dye, curl/vorticity confinement, pressure projection, solid mask */
  var FL = {
    adv: "uniform sampler2D V,S,B;uniform vec2 tx;uniform float dt,dis;void main(){vec2 c=uv-dt*texture(V,uv).xy*tx;o=dis*texture(S,c)*(1.-texture(B,uv).r);}",
    spl: "uniform sampler2D S;uniform vec2 pt,asp;uniform vec4 col;uniform float r;void main(){vec2 d=(uv-pt)*asp;o=texture(S,uv)+col*exp(-dot(d,d)/r);}",
    frc: "uniform sampler2D V,D;uniform float dt,g;void main(){vec4 v=texture(V,uv);float m=texture(D,uv).g;v.y-=g*m*dt;o=v;}",
    crl: "uniform sampler2D V;uniform vec2 tx;void main(){float L=texture(V,uv-vec2(tx.x,0)).y,R=texture(V,uv+vec2(tx.x,0)).y,T=texture(V,uv+vec2(0,tx.y)).x,Bm=texture(V,uv-vec2(0,tx.y)).x;o=vec4(.5*(R-L-T+Bm),0,0,1);}",
    vor: "uniform sampler2D V,Q;uniform vec2 tx;uniform float k,dt;void main(){float L=texture(Q,uv-vec2(tx.x,0)).x,R=texture(Q,uv+vec2(tx.x,0)).x,T=texture(Q,uv+vec2(0,tx.y)).x,Bm=texture(Q,uv-vec2(0,tx.y)).x,c=texture(Q,uv).x;vec2 f=.5*vec2(abs(T)-abs(Bm),abs(R)-abs(L));f/=length(f)+1e-4;f*=k*c;f.y*=-1.;o=texture(V,uv)+vec4(f*dt,0,0);}",
    div: "uniform sampler2D V,B;uniform vec2 tx;void main(){float L=texture(V,uv-vec2(tx.x,0)).x,R=texture(V,uv+vec2(tx.x,0)).x,T=texture(V,uv+vec2(0,tx.y)).y,Bm=texture(V,uv-vec2(0,tx.y)).y;o=vec4(.5*(R-L+T-Bm),0,0,1);}",
    prs: "uniform sampler2D P,Dv;uniform vec2 tx;void main(){float L=texture(P,uv-vec2(tx.x,0)).x,R=texture(P,uv+vec2(tx.x,0)).x,T=texture(P,uv+vec2(0,tx.y)).x,Bm=texture(P,uv-vec2(0,tx.y)).x;o=vec4((L+R+T+Bm-texture(Dv,uv).x)*.25,0,0,1);}",
    grd: "uniform sampler2D P,V,B;uniform vec2 tx;void main(){float L=texture(P,uv-vec2(tx.x,0)).x,R=texture(P,uv+vec2(tx.x,0)).x,T=texture(P,uv+vec2(0,tx.y)).x,Bm=texture(P,uv-vec2(0,tx.y)).x;vec2 v=texture(V,uv).xy-.5*vec2(R-L,T-Bm);o=vec4(v*(1.-texture(B,uv).r),0,1);}",
    clr: "uniform sampler2D S;uniform float k;void main(){o=texture(S,uv)*k;}"
  };
  function Fluid(G, w, h, solid) {
    var P = {}; for (var k in FL) { P[k] = G.prog(FL[k]); if (!P[k]) return null; }
    var F = { V: G.dbl(w, h), D: G.dbl(w, h), Pr: G.dbl(w, h), Dv: G.fbo(w, h), Q: G.fbo(w, h), B: G.fbo(w, h), tx: [1 / w, 1 / h], asp: [w / h, 1] };
    if (!F.V || !F.D || !F.Pr || !F.Dv || !F.Q || !F.B) return null;
    G.run(G.prog(solid), {}, F.B);
    F.reset = function () { [F.V, F.D, F.Pr].forEach(function (d) { G.run(P.clr, { S: d.r, k: 0 }, d.w); d.swap(); }); };
    F.splat = function (pt, r, vel, dye) { G.run(P.spl, { S: F.V.r, pt: pt, asp: F.asp, col: [vel[0], vel[1], 0, 0], r: r }, F.V.w); F.V.swap(); G.run(P.spl, { S: F.D.r, pt: pt, asp: F.asp, col: dye, r: r }, F.D.w); F.D.swap(); };
    F.step = function (dt, grav, vort) {
      G.run(P.frc, { V: F.V.r, D: F.D.r, dt: dt, g: grav }, F.V.w); F.V.swap();
      G.run(P.crl, { V: F.V.r, tx: F.tx }, F.Q); G.run(P.vor, { V: F.V.r, Q: F.Q, tx: F.tx, k: vort, dt: dt }, F.V.w); F.V.swap();
      G.run(P.div, { V: F.V.r, B: F.B, tx: F.tx }, F.Dv); G.run(P.clr, { S: F.Pr.r, k: 0.8 }, F.Pr.w); F.Pr.swap();
      for (var i = 0; i < 22; i++) { G.run(P.prs, { P: F.Pr.r, Dv: F.Dv, tx: F.tx }, F.Pr.w); F.Pr.swap(); }
      G.run(P.grd, { P: F.Pr.r, V: F.V.r, B: F.B, tx: F.tx }, F.V.w); F.V.swap();
      G.run(P.adv, { V: F.V.r, S: F.V.r, B: F.B, tx: [1, 1], dt: dt, dis: 0.995 }, F.V.w); F.V.swap();
      G.run(P.adv, { V: F.V.r, S: F.D.r, B: F.B, tx: [1, 1], dt: dt, dis: 0.998 }, F.D.w); F.D.swap();
    };
    return F;
  }
  /* bloom (threshold, 5-level down/up chain) + ACES tonemap + grain + vignette, optional heat-haze offset */
  var PST = {
    thr: "uniform sampler2D S;void main(){vec3 c=texture(S,uv).rgb;float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(.9,2.2,l),1);}",
    dn: "uniform sampler2D S;uniform vec2 tx;void main(){vec3 c=texture(S,uv).rgb*4.;c+=texture(S,uv+tx*vec2(-1,-1)).rgb+texture(S,uv+tx*vec2(1,-1)).rgb+texture(S,uv+tx*vec2(-1,1)).rgb+texture(S,uv+tx*vec2(1,1)).rgb;c+=2.*(texture(S,uv+tx*vec2(2,0)).rgb+texture(S,uv-tx*vec2(2,0)).rgb+texture(S,uv+tx*vec2(0,2)).rgb+texture(S,uv-tx*vec2(0,2)).rgb);o=vec4(c/16.,1);}",
    up: "uniform sampler2D S,A;uniform vec2 tx;void main(){vec3 c=texture(S,uv+tx*vec2(-1,-1)).rgb+texture(S,uv+tx*vec2(1,-1)).rgb+texture(S,uv+tx*vec2(-1,1)).rgb+texture(S,uv+tx*vec2(1,1)).rgb;o=vec4(c*.25+texture(A,uv).rgb,1);}",
    fin: "uniform sampler2D S,Bl,Hz;uniform float bloom,haze,T,expo;vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}" +
      "void main(){vec2 q=uv;float hz=texture(Hz,uv).r*haze;q+=hz*.012*vec2(vn(uv*40.+vec2(0,T*6.))-.5,vn(uv*40.+vec2(9,T*7.))-.5);vec3 c=texture(S,q).rgb+texture(Bl,q).rgb*bloom;" +
      "c=aces(c*expo);c=pow(c,vec3(1./2.2));c*=1.-.35*smoothstep(.45,1.1,length((uv-.5)*vec2(1.,1.3)));c+=(h21(uv*vec2(1311,977)+T)-.5)*.025;o=vec4(c,1);}"
  };
  function Post(G) {
    var P = {}; for (var k in PST) { P[k] = G.prog(PST[k]); if (!P[k]) return null; }
    var hdr = G.fbo(G.W, G.H), L = [], w = G.W >> 1, h = G.H >> 1; if (!hdr) return null;
    for (var i = 0; i < 5; i++) { L.push(G.fbo(Math.max(2, w), Math.max(2, h))); w >>= 1; h >>= 1; }
    var U = L.map(function (l) { return G.fbo(l.w, l.h); });
    return { hdr: hdr, out: function (o) {
      G.run(P.thr, { S: hdr }, L[0]);
      for (var i = 1; i < 5; i++) G.run(P.dn, { S: L[i - 1], tx: [1 / L[i - 1].w, 1 / L[i - 1].h] }, L[i]);
      G.run(P.dn, { S: L[4], tx: [1 / L[4].w, 1 / L[4].h] }, U[4]);
      for (i = 3; i >= 0; i--) G.run(P.up, { S: U[i + 1], A: L[i], tx: [0.5 / U[i + 1].w, 0.5 / U[i + 1].h] }, U[i]);
      G.run(P.fin, { S: hdr, Bl: U[0], Hz: o.hz || hdr, bloom: o.bloom, haze: o.haze || 0, T: o.T, expo: o.expo || 1 }, null);
    } };
  }
  /* ---------- The Mint, GPU path: timeline ---------- */
  var S2 = { pour: [0, 1.35], roll: [1.35, 1.9], blank: [1.9, 2.4], upset: [2.4, 2.8], strike: [2.8, 3.3], tray: [3.3, 5.0] }, HIT2 = 3.02, PUNCH = [2.02, 2.17, 2.32];
  function station(t) { var k = ["pour", "roll", "blank", "upset", "strike", "tray"]; for (var i = 0; i < 6; i++) if (t < S2[k[i]][1]) return i; return 5; }
  var SOLID = "void main(){vec2 p=uv;float m=0.;" +          /* the ingot mould walls + floor (fluid obstacle) */
    "if(p.y<.2)m=1.;if(p.y<.36&&(abs(p.x-.2)<.025||abs(p.x-.8)<.025))m=1.;if(p.x<.01||p.x>.99)m=1.;o=vec4(m,0,0,1);}";
  var SCENE = [
    "uniform sampler2D D,TX;uniform vec2 R;uniform float T,st,lt,heat,tip,hit,spin,land,sweep;",
    "vec3 bb(float k){k=clamp(k,0.,1.);return mix(mix(vec3(.25,.02,0.),vec3(1.,.25,.02),smoothstep(0.,.4,k)),mix(vec3(1.,.6,.15),vec3(1.,.95,.8),smoothstep(.7,1.,k)),smoothstep(.35,.75,k))*(.5+2.2*k*k);}",
    "vec3 env(vec3 r){float y=r.y;vec3 c=mix(vec3(.03,.025,.03),vec3(.55,.5,.48),smoothstep(-.2,.8,y));c=mix(c,vec3(.01),exp(-y*y*60.)*.7);",
    " c+=vec3(1.,.92,.8)*smoothstep(.93,.985,dot(r,normalize(vec3(-.55,.65,.5))))*3.2;c+=vec3(1.,.55,.2)*smoothstep(.9,.99,dot(r,normalize(vec3(.8,-.1,.5))))*heat*4.;",
    " c+=vec3(.5,.6,.8)*smoothstep(.95,.995,dot(r,normalize(vec3(.7,.5,.4))))*2.;return c;}",
    "float sdBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}",
    "float sdCylZ(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xy),p.z))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}",
    "float sdCylY(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}",
    "float relief(vec2 q){return texture(TX,q*.5+.5).r;}",
    "int mat;float glow;",
    "float coin(vec3 p,float r,float h,float rel){float d=sdCylZ(p,r,h);float rim=smoothstep(r*.86,r*.9,length(p.xy))*h*.35;",
    " if(rel>0.&&abs(p.z)>h*.3&&length(p.xy)<r){d-=relief(p.xy/r)*h*.35*rel*step(0.,p.z);} return d-rim;}",
    "float map(vec3 p){mat=0;glow=0.;float d=1e3,e;",
    " if(st<1.5){",                                                           /* ROLL: two chromed rolls (axis z) + the hot strip */
    "  float a=T*9.;vec3 q=p-vec3(0,.62,0);e=sdCylZ(q,.55,1.2);if(e<d){d=e;mat=1;} q=p-vec3(0,-.62,0);e=sdCylZ(q,.55,1.2);if(e<d){d=e;mat=1;}",
    "  float th=mix(.12,.05,smoothstep(-.1,.1,p.x));e=sdBox(p-vec3(0,0,0),vec3(3.,th,.9),.01);if(e<d){d=e;mat=2;glow=heat*(1.-smoothstep(-.5,2.,p.x)*.6);}",
    " } else if(st<2.5){",                                                    /* BLANK: top-down strip with punched holes + the punch */
    "  e=sdBox(p,vec3(.9,.04,3.),.005);for(int i=0;i<3;i++){float fi=float(i);if(fi<lt){vec3 hq=p-vec3(0,0,(floor(lt)-fi)*.95+fract(lt)*0.);e=max(e,-sdCylY(hq,.42,.2));}}",
    "  if(e<d){d=e;mat=1;} float pz=mix(1.4,.0,hit);e=sdCylY(p-vec3(0,.25+pz,0),.43,.2);if(e<d){d=e;mat=3;}",
    " } else if(st<3.5){",                                                    /* UPSET: blanks rolling on edge through the mill */
    "  e=sdBox(p-vec3(0,-.52,0),vec3(4.,.06,.4),.01);if(e<d){d=e;mat=3;} e=sdBox(p-vec3(0,.75,0),vec3(.35,.6,.5),.03);if(e<d){d=e;mat=1;}",
    "  for(int i=0;i<6;i++){float fi=float(i);float x=mod(lt*4.5-fi*1.1+3.,6.6)-3.3;vec3 q=p-vec3(x,-.08,0);float an=-x/.42;q.xy=mat2(cos(an),-sin(an),sin(an),cos(an))*q.xy;",
    "   e=coin(q,.42,.06+.02*step(0.,x),0.);if(e<d){d=e;mat=4;}}",
    " } else if(st<4.5){",                                                    /* STRIKE: hammer die drops onto the blank on the anvil die */
    "  e=sdCylY(p-vec3(0,-.75,0),.75,.55);if(e<d){d=e;mat=1;} e=sdCylY(p-vec3(0,-.15,0),.6,.05);if(e<d){d=e;mat=4;}",
    "  float hy=mix(2.4,.0,hit);e=sdCylY(p-vec3(0,.5+hy,0),.75,.4);if(e<d){d=e;mat=1;}",
    " } else {",                                                              /* TRAY: the hero coin + a velvet tray of struck coins */
    "  vec3 q=p-vec3(0,mix(2.6,.15,land),mix(-1.,0.,land));float a=spin;q.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*q.xz;float tl=-1.05+.35*(1.-land);q.yz=mat2(cos(tl),-sin(tl),sin(tl),cos(tl))*q.yz;",
    "  e=coin(q,1.,.085,1.);if(e<d){d=e;mat=5;}",
    "  e=p.y+1.05;if(e<d){d=e;mat=6;}",
    "  vec3 c=p-vec3(0,-.98,-2.2);vec2 id=floor((c.xz+.62)/1.24);c.xz=mod(c.xz+.62,1.24)-.62;if(abs(id.x)<4.&&id.y<1.&&id.y>-4.){c.yz=mat2(0,-1,1,0)*c.yz;e=coin(c,.55,.05,0.);if(e<d){d=e;mat=4;}}",
    " }",
    " return d;}",
    "vec3 nrm(vec3 p){vec2 e=vec2(.0015,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}",
    "void main(){vec2 s=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);vec3 col=vec3(0.);",
    " if(st<.5){",                                                            /* POUR: 2.5D foundry + the fluid */
    "  vec2 p=uv;vec4 d=texture(D,p);float m=d.g,tp=d.r;",
    "  col=mix(vec3(.012,.01,.012),vec3(.05,.035,.03),p.y)+vec3(.9,.3,.05)*heat*.06*exp(-length((p-vec2(.5,.25))*vec2(1.,2.))*3.);",
    "  float mould=step(p.y,.36)*step(.175,p.x)*step(p.x,.825)*(1.-step(.2,p.y)*step(.225,p.x)*step(p.x,.775));col=mix(col,vec3(.035,.03,.032)+vec3(.12,.05,.02)*heat*smoothstep(.36,.2,p.y)*.4,mould);",
    "  vec2 cp=p-vec2(.66,.82);float a=-tip*1.1;cp=mat2(cos(a),-sin(a),sin(a),cos(a))*cp;float cru=step(abs(cp.x),.16-cp.y*.25)*step(abs(cp.y),.13);col=mix(col,vec3(.12,.1,.1)*(.6+.8*smoothstep(-.16,.16,cp.x)),cru);",
    "  col+=vec3(1.,.5,.15)*3.*smoothstep(.01,0.,abs(cp.y-.13))*step(abs(cp.x),.13)*cru;",
    "  float e=1./R.y*2.;float mx=texture(D,p+vec2(e,0)).g-texture(D,p-vec2(e,0)).g,my=texture(D,p+vec2(0,e)).g-texture(D,p-vec2(0,e)).g;vec3 n=normalize(vec3(-mx*6.,-my*6.,1.));",
    "  vec3 mol=bb(tp*.9)*(.7+.5*n.z)+env(reflect(vec3(0,0,-1),n))*.25*(1.-tp);float k=smoothstep(.05,.35,m);col=mix(col,mol,k);",
    " } else {",
    "  vec3 ro,ta;float f=1.8;",
    "  if(st<1.5){ro=vec3(-.8+lt*.9,.35,5.4);ta=vec3(0.,0.,0.);} else if(st<2.5){ro=vec3(.0,6.5,1.2);ta=vec3(0,0,0);} else if(st<3.5){ro=vec3(lt*.6-.3,.6,7.5);ta=vec3(0,0,0);} else if(st<4.5){ro=vec3(.3,.4,7.);ta=vec3(0,.1,0);} else {ro=vec3(.0,2.4+.8*(1.-land),4.6);ta=vec3(0,0.,0);}",
    "  vec3 w=normalize(ta-ro),u=normalize(cross(w,vec3(0,1,0))),v=cross(u,w);vec3 rd=normalize(s.x*u+s.y*v+f*w);",
    "  float tt=0.;bool h=false;for(int i=0;i<110;i++){float dd=map(ro+rd*tt);if(dd<.0007*tt){h=true;break;}tt+=dd*.9;if(tt>14.)break;}",
    "  col=mix(vec3(.01,.009,.011),vec3(.06,.05,.05),smoothstep(-.4,.6,s.y))+vec3(1.,.5,.15)*heat*.05;",
    "  if(h){vec3 p=ro+rd*tt;map(p);int mm=mat;float gw=glow;vec3 n=nrm(p),r=reflect(rd,n);float fr=pow(1.-max(dot(n,-rd),0.),5.);",
    "   vec3 tint=mm==5||mm==4?vec3(1.,.76,.38):mm==2?vec3(.9,.8,.7):vec3(.85,.87,.9);float rough=mm==1?.35:mm==3?.6:.12;",
    "   vec3 e=env(r)*mix(tint,vec3(1.),fr);vec3 dif=tint*max(dot(n,normalize(vec3(-.5,.7,.5))),0.)*.25;",
    "   if(mm==1){float br=vn(vec2(atan(p.y-(p.y>0.?.62:-.62),p.x)*40.,p.z*3.));e*=.75+.35*br;}",
    "   if(mm==6){vec3 vel=vec3(.08,.015,.025)*(.6+.4*fbm(p.xz*30.));col=vel*(.4+.6*max(dot(n,normalize(vec3(-.5,.7,.5))),0.));}",
    "   else col=mix(e,dif+e*.5,rough);",
    "   if(mm==2)col+=bb(gw*.85)*gw;",
    "   if(mm==5){float sw=exp(-pow((p.x+p.y*.6)-mix(-2.,2.,sweep),2.)*18.)*step(.01,sweep)*step(sweep,.99);col+=vec3(1.,.9,.7)*sw*.9;}",
    "   float ao=clamp(map(p+n*.08)/.08,.25,1.);col*=ao;}",
    "  if(st>3.5&&st<4.5&&hit>.99){float since=T-3.02;float rr=since*6.;float ring=exp(-pow(length(s*vec2(1.,3.)+vec2(0,.22))-rr,2.)*120.)*exp(-since*5.);col+=vec3(1.,.8,.5)*ring*3.+vec3(1.,.95,.85)*exp(-since*22.)*3.*exp(-dot(s,s)*6.);}",
    " }",
    " o=vec4(col,1.);}"
  ].join("\n");
  /* sparks: stateless GPU particles (ballistic, born from emitters on the timeline), additive into the HDR buffer */
  var SPV = "#version 300 es\nprecision highp float;uniform float T,asp;uniform int st;out float a;out vec3 c;" +
    "float h(float n){return fract(sin(n*12.9898)*43758.5453);}" +
    "void main(){float id=float(gl_VertexID);float b,life;vec2 o0,v0;" +
    " if(st==0){b=.35+h(id)*1.0;o0=vec2(.5+(h(id+1.)-.5)*.3,.22+h(id+5.)*.06);float an=1.57+(h(id+2.)-.5)*2.6;float sp=.25+h(id+3.)*.7;v0=vec2(cos(an),sin(an))*sp;life=.35+h(id+4.)*.5;}" +
    " else if(st==1){b=1.35+h(id)*.55;o0=vec2(.46,.5);float an=3.14+(h(id+2.)-.5)*1.4;float sp=.3+h(id+3.)*.8;v0=vec2(cos(an),sin(an))*sp;life=.25+h(id+4.)*.35;}" +
    " else if(st==4){b=3.02+h(id)*.04;o0=vec2(.5+(h(id+1.)-.5)*.35,.42);float an=(h(id+2.)-.5)*3.0+1.57;float sp=.4+h(id+3.)*1.4;v0=vec2(cos(an)*1.6,sin(an)*.5)*sp;life=.3+h(id+4.)*.6;}" +
    " else {gl_Position=vec4(2.,2.,0.,1.);gl_PointSize=0.;a=0.;c=vec3(0);return;}" +
    " float age=T-b;if(age<0.||age>life){gl_Position=vec4(2.,2.,0.,1.);gl_PointSize=0.;a=0.;c=vec3(0);return;}" +
    " vec2 p=o0+v0*age+vec2(0.,-1.3)*age*age;float k=age/life;gl_Position=vec4((p*2.-1.)*vec2(1.,1.),0.,1.);gl_PointSize=mix(3.,1.,k);a=(1.-k);c=mix(vec3(1.,.9,.6)*2.2,vec3(1.,.35,.05)*.8,k)*(st==4?.35:1.);}";
  var SPF = "#version 300 es\nprecision highp float;in float a;in vec3 c;out vec4 o;void main(){vec2 q=gl_PointCoord-.5;float f=exp(-dot(q,q)*14.);o=vec4(c*a*f,0.);}";
  function heightTex(C) {                                  // relief height map of the coin face (device + legend), white = high
    var s = 512, c = K.mk(s, s), g = c.getContext("2d"), cx = s / 2, R = s * 0.48, i; g.fillStyle = "#000"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#fff"; g.lineWidth = R * 0.05; g.beginPath(); g.arc(cx, cx, R * 0.95, 0, K.PI2); g.stroke();
    g.fillStyle = "#fff"; for (i = 0; i < 80; i++) { var a = i / 80 * K.PI2; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.86, cx + Math.sin(a) * R * 0.86, R * 0.014, 0, K.PI2); g.fill(); }
    var str = "TITAN \u2022 RELIQUARY \u2022 MMXXVI \u2022", fs = R * 0.15; g.font = "700 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
    var tot = 0, ws = []; for (i = 0; i < str.length; i++) { ws.push(g.measureText(str[i]).width + fs * 0.08); tot += ws[i]; } var rr = R * 0.72, a0 = -Math.PI / 2 - (tot / rr) / 2;
    for (i = 0; i < str.length; i++) { var aa = a0 + ws[i] / 2 / rr; g.save(); g.translate(cx + Math.cos(aa) * rr, cx + Math.sin(aa) * rr); g.rotate(aa + Math.PI / 2); g.fillText(str[i], 0, 0); g.restore(); a0 += ws[i] / rr; }
    var u = R * 0.2; g.save(); g.translate(cx, cx + R * 0.05); g.shadowColor = "#fff"; g.shadowBlur = 6;
    for (i = 0; i < 16; i++) { g.save(); g.rotate(i / 16 * K.PI2); g.fillRect(-u * 0.04, -u * 2.2, u * 0.08, u * 0.6); g.restore(); }
    g.beginPath(); g.moveTo(-u * 1.3, -u * 0.2); g.lineTo(0, -u * 1.3); g.lineTo(u * 1.3, -u * 0.2); g.closePath(); g.fill(); g.fillRect(-u * 1.15, -u * 0.2, u * 2.3, u * 1.4); g.fillRect(-u * 1.35, u * 1.2, u * 2.7, u * 0.25);
    g.fillStyle = "#555"; g.fillRect(-u * 0.12, u * 0.2, u * 0.24, u * 0.6); g.restore(); g.font = "700 " + R * 0.1 + "px " + K.MONO; g.fillStyle = "#fff"; g.fillText("No. 34", cx, cx + R * 0.55);
    return c;
  }
  function setupGPU(C) {
    var G = GPU(C, 1); if (!G) return null;
    var gw = 160, gh = Math.round(160 * C.H / C.W); var F = Fluid(G, gw, Math.max(96, Math.min(400, gh)), SOLID); if (!F) return null;
    var Po = Post(G); if (!Po) return null; var Sc = G.prog(SCENE); if (!Sc) return null;
    var Sp = G.prog(SPF, SPV); if (!Sp) return null; var tx = G.tex(heightTex(C));
    return { G: G, F: F, Po: Po, Sc: Sc, Sp: Sp, tx: { t: tx }, simT: -1 };
  }
  function pourStep(M, t) {                                // fixed 1/60 s steps; replays from zero on a backward seek
    var F = M.F, dt = 1 / 60; if (M.simT < 0 || t < M.simT - 1e-4) { F.reset(); M.simT = 0; }
    var n = 0; while (M.simT + dt <= Math.min(t, S2.pour[1]) + 1e-6 && n++ < 120) { var s = M.simT;
      if (s > 0.28 && s < 1.15) { var w = 0.5 + 0.5 * Math.sin(s * 23); F.splat([0.53 + 0.006 * Math.sin(s * 17), 0.74], 0.00005, [-0.05 + 0.03 * w, -1.6], [0.3, 0.7, 0, 0]); }
      F.step(dt, 3.2, 18); M.simT += dt; }
  }
  function draw2d(C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, lite = C.lite, i, M = Math.min(W, H), cx = W / 2, cy = H * 0.46, e, k;
      var shake = 0;
      [1.52, 1.7, 1.88].forEach(function (h) { var d = t - h; if (d > 0 && d < 0.12) shake = Math.max(shake, 5 * (1 - d / 0.12)); });
      if (t > HIT && t < HIT + 0.35) shake = 16 * (1 - (t - HIT) / 0.35);
      g.save(); if (shake && !lite) g.translate((K.hash(t * 97) - 0.5) * shake, (K.hash(t * 61) - 0.5) * shake);
      var bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8); bg.addColorStop(0, "#26221e"); bg.addColorStop(1, "#08070a"); g.fillStyle = bg; g.fillRect(-20, -20, W + 40, H + 40);

      if (t < T.pour[1]) {                                         // 1 POUR
        e = seg(t, 0, 0.75); var tip = K.eio(seg(t, 0, 0.25)) * 0.9, z = 1 + e * 0.12; g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
        var mx = cx - M * 0.32, my = cy + M * 0.38, mw = M * 0.64, mh = M * 0.18;
        g.fillStyle = steel(g, 0, my, 0, my + mh, 0); g.fillRect(mx - 8, my - 8, mw + 16, mh + 16);
        var fill = K.eo2(seg(t, 0.2, 0.75)); var hot = g.createLinearGradient(0, my, 0, my + mh); hot.addColorStop(0, "#fff8d0"); hot.addColorStop(0.4, "#ffb030"); hot.addColorStop(1, "#d04a08"); g.fillStyle = hot; g.fillRect(mx, my + mh * (1 - fill), mw, mh * fill);
        g.save(); g.translate(cx + M * 0.2, cy - M * 0.42); g.rotate(-tip); g.fillStyle = steel(g, -M * 0.16, 0, M * 0.16, 0, 0.15); g.beginPath(); g.moveTo(-M * 0.16, -M * 0.2); g.lineTo(M * 0.16, -M * 0.2); g.lineTo(M * 0.12, M * 0.1); g.lineTo(-M * 0.12, M * 0.1); g.closePath(); g.fill();
        g.fillStyle = "#ffe8a0"; g.fillRect(-M * 0.15, -M * 0.2, M * 0.3, 5); g.restore();
        if (tip > 0.4) { var sx0 = cx + M * 0.03, sy0 = cy - M * 0.36, w = M * 0.035 * (1 + 0.15 * Math.sin(t * 40)); var sg = g.createLinearGradient(sx0 - w, 0, sx0 + w, 0); sg.addColorStop(0, "#ff8a20"); sg.addColorStop(0.5, "#fffbe0"); sg.addColorStop(1, "#ff8a20"); g.fillStyle = sg;
          g.beginPath(); g.moveTo(sx0 - w * 0.6, sy0); g.quadraticCurveTo(sx0 - w * 1.1, cy, sx0 - w, my + mh * (1 - fill)); g.lineTo(sx0 + w, my + mh * (1 - fill)); g.quadraticCurveTo(sx0 + w * 1.1, cy, sx0 + w * 0.6, sy0); g.fill();
          if (!lite) sparks(g, sx0, my + mh * (1 - fill), t, 30, 2.2, lite); }
        g.globalCompositeOperation = "lighter"; var hb = g.createRadialGradient(cx, my, 0, cx, my, M * 0.7); hb.addColorStop(0, "rgba(255,140,40," + 0.45 * fill + ")"); hb.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = hb; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
        g.restore(); label(g, W, H, "POUR  \u00b7  1,064 \u00b0C", 1);
      } else if (t < T.roll[1]) {                                  // 2 ROLL
        e = seg(t, T.roll[0], T.roll[1]); var rr = M * 0.3, gap = M * 0.05, ang = t * 9;
        var heat = 1 - e * 0.85, sy = cy, sxp = K.lerp(-W * 0.2, W * 0.1, e);
        // strip: thick on the left, thin on the right
        g.fillStyle = steel(g, 0, sy - gap, 0, sy + gap, heat); g.fillRect(-20, sy - gap * 2.2, cx + 20, gap * 4.4); g.fillStyle = steel(g, 0, sy - gap, 0, sy + gap, heat * 0.6); g.fillRect(cx, sy - gap * 0.9, W, gap * 1.8);
        for (i = 0; i < 14; i++) { var lx = ((i * 60 + t * 600) % (W + 60)) - 30; g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(lx, sy - (lx < cx ? gap * 2.2 : gap * 0.9), 2, lx < cx ? gap * 4.4 : gap * 1.8); }
        [-1, 1].forEach(function (sd) { var ry = sy + sd * (rr + gap * 0.9); g.save(); g.translate(cx, ry); g.fillStyle = steel(g, -rr, -rr, rr, rr, 0); g.beginPath(); g.arc(0, 0, rr, 0, K.PI2); g.fill();
          g.rotate(ang * -sd); for (var j = 0; j < 8; j++) { g.rotate(K.PI2 / 8); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(rr * 0.2, -2, rr * 0.75, 4); } g.fillStyle = "#2a2d32"; g.beginPath(); g.arc(0, 0, rr * 0.22, 0, K.PI2); g.fill(); g.restore(); });
        g.globalCompositeOperation = "lighter"; var nip = g.createRadialGradient(cx, sy, 0, cx, sy, M * 0.25); nip.addColorStop(0, "rgba(255,150,50," + heat * 0.6 + ")"); nip.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = nip; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
        if (!lite) sparks(g, cx - gap, sy - gap, t, 14, 1.2, lite);
        label(g, W, H, "ROLLING MILL  \u00b7  18 \u2192 1.9 mm", 2);
      } else if (t < T.blank[1]) {                                 // 3 BLANK (top-down)
        e = seg(t, T.blank[0], T.blank[1]); var bw = M * 0.42, br = bw * 0.36, holes = 0, hitT = [1.52, 1.7, 1.88];
        hitT.forEach(function (h) { if (t > h) holes++; }); var feed = holes * br * 2.4 + (t > hitT[2] ? (t - hitT[2]) * 300 : 0);
        g.fillStyle = steel(g, cx - bw, 0, cx + bw, 0, 0); g.fillRect(cx - bw, -20, bw * 2, H + 40);
        g.fillStyle = "#0e0d0f"; for (i = 0; i < holes; i++) { g.beginPath(); g.arc(cx, cy + feed - i * br * 2.4, br, 0, K.PI2); g.fill(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.stroke(); }
        // the punch: a cylinder seen from above, scaling to show it descend
        var last = -1; hitT.forEach(function (h) { if (t > h - 0.12) last = h; }); var pd = last < 0 ? 0 : (t < last ? 1 - (last - t) / 0.12 : Math.max(0, 1 - (t - last) / 0.1));
        var ps = 1.45 - pd * 0.45; g.save(); if (!lite) { g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 30 * (1 - pd); g.shadowOffsetY = 20 * (1 - pd); }
        g.fillStyle = steel(g, cx - br * ps, cy - br * ps, cx + br * ps, cy + br * ps, 0); g.beginPath(); g.arc(cx, cy, br * ps * 1.02, 0, K.PI2); g.fill(); g.restore();
        g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, br * ps * 0.7, 0, K.PI2); g.stroke();
        if (pd > 0.95) { g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,240,200,.35)"; g.beginPath(); g.arc(cx, cy, br * 1.6, 0, K.PI2); g.fill(); g.globalCompositeOperation = "source-over"; }
        label(g, W, H, "BLANKING PRESS  \u00b7  3 HITS", 3);
      } else if (t < T.upset[1]) {                                 // 4 UPSET (edge-on chute)
        e = seg(t, T.upset[0], T.upset[1]); var ch = cy + M * 0.1, rc = M * 0.16;
        g.save(); g.translate(cx, ch); g.rotate(-0.12); g.fillStyle = steel(g, 0, 0, 0, 30, 0); g.fillRect(-W, 0, W * 2, 34); g.restore();
        g.fillStyle = steel(g, cx - M * 0.18, 0, cx + M * 0.18, 0, 0); g.fillRect(cx - M * 0.1, ch - M * 0.5, M * 0.2, M * 0.38); g.fillRect(cx - M * 0.1, ch + 26, M * 0.2, M * 0.28);   // mill dies
        g.fillStyle = "#ffcf5a"; g.fillRect(cx - M * 0.1, ch - M * 0.12 - 3, M * 0.2, 3);
        for (k = 0; k < 6; k++) { var px = K.lerp(-W * 0.3, W * 1.3, (e * 1.3 + k * 0.16) % 1.4 / 1.4) , py = ch - rc - (px - cx) * Math.tan(-0.12) - 2 + Math.abs(Math.sin(t * 30 + k)) * -4;
          var rim = px > cx; g.save(); g.translate(px, py); g.scale(0.35, 1); plainCoin(g, 0, 0, rc, 1, rim); g.restore();
          if (Math.abs(px - cx) < 20 && !lite) sparks(g, cx, ch - rc, t, 8, 1.0, lite); }
        label(g, W, H, "UPSETTING MILL  \u00b7  RAISING THE RIM", 4);
      } else if (t < T.strike[1]) {                                // 5 STRIKE (low side view)
        var dz = t < HIT ? K.ei3(seg(t, T.strike[0], HIT)) : 1 - K.eo2(seg(t, HIT + 0.05, 3.0)) * 0.3, dw = M * 0.34, base = cy + M * 0.22;
        g.fillStyle = steel(g, cx - dw, 0, cx + dw, 0, 0); g.fillRect(cx - dw, base, dw * 2, M * 0.5);                  // anvil die
        g.fillStyle = "#e2b04a"; g.fillRect(cx - dw * 0.8, base - M * 0.035, dw * 1.6, M * 0.035);                      // the blank
        var top = K.lerp(-M * 0.9, base - M * 0.035 - M * 0.6, dz); g.fillStyle = steel(g, cx - dw, 0, cx + dw, 0, 0); g.fillRect(cx - dw, top, dw * 2, M * 0.6);
        g.fillStyle = "#1b1c1f"; g.fillRect(cx - dw * 1.4, top - M * 0.5, dw * 2.8, M * 0.5);
        if (t >= HIT) { var f = seg(t, HIT, HIT + 0.28); g.globalCompositeOperation = "lighter"; var fg = g.createRadialGradient(cx, base, 0, cx, base, M * 0.9); fg.addColorStop(0, "rgba(255,250,235," + (1 - K.eo2(f)) + ")"); fg.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = fg; g.fillRect(-20, -20, W + 40, H + 40);
          g.strokeStyle = "rgba(255,220,150," + (1 - f) + ")"; g.lineWidth = 6 * (1 - f) + 1; g.beginPath(); g.ellipse(cx, base, M * 1.4 * K.eo3(f), M * 0.3 * K.eo3(f), 0, 0, K.PI2); g.stroke(); g.globalCompositeOperation = "source-over";
          if (!lite) sparks(g, cx - dw * 0.8, base, t, 16, 2.6, lite), sparks(g, cx + dw * 0.8, base, t + 0.3, 16, 2.6, lite); }
        label(g, W, H, "COINING PRESS  \u00b7  1,200 kN", 5);
      } else {                                                     // 6 TRAY
        e = seg(t, T.tray[0], 4.0); var R = C.R;
        // tray of struck coins (perspective rows)
        var ty = cy + R * 0.2; g.fillStyle = "#121014"; g.fillRect(-20, ty - R * 0.2, W + 40, H);
        for (k = 0; k < 18; k++) { if (Math.floor(k / 6) === 0 && false) continue; var row = Math.floor(k / 6), col = k % 6, rs = 0.8 + row * 0.18, rx = (col - 2.5) * R * 0.6 * rs + (row % 2) * R * 0.3, ry = ty + R * 0.45 + row * R * 0.28 * rs; g.save(); g.translate(cx + rx, ry); g.scale(1, 0.38); g.fillStyle = "#4a2c08"; g.beginPath(); g.arc(0, 8, R * 0.27 * rs, 0, K.PI2); g.fill(); plainCoin(g, 0, 0, R * 0.27 * rs, 1, 1); g.restore(); }
        // the hero coin: flies in spinning, lands with a damped wobble
        var fl = K.eo3(e), spin = (1 - fl) * 9 + (t > 4.0 ? Math.sin((t - 4.0) * 14) * Math.exp(-(t - 4.0) * 5) * 0.15 : 0), sx = Math.cos(spin * Math.PI);
        var hx = cx, hy = K.lerp(-R * 1.4, cy - R * 0.25, fl) - Math.sin(fl * Math.PI) * R * 0.3;
        if (!lite) { g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(hx, ty + R * 0.7, R * fl, R * 0.18 * fl, 0, 0, K.PI2); g.fill(); }
        g.save(); g.translate(hx, hy); var sc = K.lerp(0.5, 1, fl); g.scale(Math.max(0.05, Math.abs(sx)) * sc, sc);
        if (sx < 0) { plainCoin(g, 0, 0, R, 1, 1); } else g.drawImage(C.face, -C.face.width / 2, -C.face.height / 2);
        // edge thickness
        g.restore(); if (Math.abs(sx) < 0.98) { g.fillStyle = "#8a5a18"; g.fillRect(hx + R * sc * Math.abs(sx) * (sx > 0 ? 1 : -1) - 3, hy - R * sc, 6 * (1 - Math.abs(sx)) + 1, R * 2 * sc); }
        // light sweep across the relief
        var lw = seg(t, 3.9, 4.5); if (lw > 0 && lw < 1) { g.save(); g.beginPath(); g.arc(hx, hy, R, 0, K.PI2); g.clip(); g.globalCompositeOperation = "lighter"; var lx2 = hx - R * 1.4 + R * 2.8 * lw;
          var lg = g.createLinearGradient(lx2 - R * 0.3, hy - R, lx2 + R * 0.3, hy + R); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,240,200,.35)"); lg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = lg; g.fillRect(hx - R, hy - R, R * 2, R * 2); g.restore(); }
        var gl2 = seg(t, 4.15, 4.35) * (1 - seg(t, 4.35, 4.7)); if (gl2 > 0) { g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,240,200," + gl2 + ")"; var gx = hx + R * 0.5, gy = hy - R * 0.55; g.fillRect(gx - 22, gy - 1, 44, 2); g.fillRect(gx - 1, gy - 22, 2, 44); g.globalCompositeOperation = "source-over"; }
        var nm = seg(t, 4.0, 4.4); if (nm > 0) { g.globalAlpha = nm; var tf = Math.min(W * 0.085, 48); g.font = "700 " + tf + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000"; g.fillText("TITAN RELIQUARY", cx + 1, H * 0.86 + 2); g.fillStyle = "#f0cf86"; g.fillText("TITAN RELIQUARY", cx, H * 0.86); g.font = "600 " + Math.max(10, W * 0.028) + "px " + K.MONO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#e8c47a"; g.fillText("THE MINT  \u00b7  STRUCK 20 OCT 2026  \u00b7  PROOF", cx, H * 0.86 + tf * 0.8); g.globalAlpha = 1; }
      }
      g.restore();
      // hard-cut flash between stations
      [T.roll[0], T.blank[0], T.upset[0], T.strike[0], T.tray[0]].forEach(function (c0) { var d = t - c0; if (d >= 0 && d < 0.06) { g.fillStyle = "rgba(255,255,255," + 0.25 * (1 - d / 0.06) + ")"; g.fillRect(0, 0, W, H); } });
  }
  I.reg("colossus", {
    dur: 5.0, still: 4.8,
    init: function (C) { C.R = Math.min(C.W, C.H) * 0.36; C.face = face(C.R); C.M = C.lite ? null : setupGPU(C); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg; g.clearRect(0, 0, W, H);
      var M = C.M; if (!M || C._glDead) { draw2d(C, t * 4.8 / 5.0); return; }
      var G = M.G, x = G.x, st = station(t), lt = 0, hit = 0, heat = 0, tip = 0, land = 0, spin = 0, sweep = 0, shake = 0, i;
      if (st === 0) { pourStep(M, t); tip = K.eio(seg(t, 0.05, 0.4)); heat = 1; }
      else if (st === 1) { lt = t - S2.roll[0]; heat = 1 - seg(t, S2.roll[0], S2.roll[1]) * 0.6; }
      else if (st === 2) { var n = 0; PUNCH.forEach(function (p) { if (t > p) n++; }); lt = n; var last = -9; PUNCH.forEach(function (p) { if (t > p - 0.1) last = p; });
        hit = last < 0 ? 0 : t < last ? 1 - (last - t) / 0.1 : Math.max(0, 1 - (t - last) / 0.09); hit = K.ei3(Math.min(1, hit)); PUNCH.forEach(function (p) { var d = t - p; if (d > 0 && d < 0.1) shake = Math.max(shake, 6 * (1 - d / 0.1)); }); }
      else if (st === 3) { lt = t - S2.upset[0]; }
      else if (st === 4) { hit = t < HIT2 ? K.ei3(seg(t, S2.strike[0] + 0.05, HIT2)) : 1; heat = t > HIT2 ? Math.exp(-(t - HIT2) * 4) : 0; if (t > HIT2 && t < HIT2 + 0.35) shake = 18 * (1 - (t - HIT2) / 0.35); }
      else { land = K.eo3(seg(t, S2.tray[0], 4.25)); spin = (1 - land) * 14 + (t > 4.25 ? Math.sin((t - 4.25) * 16) * Math.exp(-(t - 4.25) * 6) * 0.12 : 0); sweep = seg(t, 4.2, 4.85); }
      C.cv.style.transform = G.cv.style.transform = shake ? "translate(" + (K.hash(t * 97) - 0.5) * shake + "px," + (K.hash(t * 61) - 0.5) * shake + "px)" : "";
      G.run(M.Sc, { D: M.F.D.r, TX: M.tx, R: [G.W, G.H], T: t, st: st, lt: lt, heat: heat, tip: tip, hit: hit, spin: spin, land: land, sweep: sweep }, M.Po.hdr);
      x.enable(x.BLEND); x.blendFunc(x.ONE, x.ONE); G.run(M.Sp, { T: t, st: st, asp: W / H }, M.Po.hdr, st === 0 ? 9000 : st === 4 ? 8000 : st === 1 ? 4000 : 1); x.disable(x.BLEND);
      M.Po.out({ bloom: st === 0 ? 0.9 : 0.7, haze: st === 0 ? 1.0 : st === 1 ? 0.5 : 0, hz: st <= 1 ? M.F.D.r : null, T: t, expo: 1.0 });
      // crisp type on top: station plate, then the name under the landed coin
      var lab = ["POUR \u00b7 1,064 \u00b0C", "ROLLING MILL \u00b7 18 \u2192 1.9 mm", "BLANKING PRESS \u00b7 3 HITS", "UPSETTING MILL \u00b7 RAISING THE RIM", "COINING PRESS \u00b7 1,200 kN", ""][st];
      if (lab) { g.font = "600 " + Math.max(12, Math.min(W, H) * 0.03) + "px " + K.MONO; g.textAlign = "left"; g.textBaseline = "top"; g.fillStyle = "rgba(255,200,130,.8)"; g.fillText("0" + (st + 1) + " \u2014 " + lab, 18, H - 44); g.fillStyle = "rgba(255,200,130,.35)"; g.fillRect(18, H - 24, Math.min(W, H) * 0.3, 1); }
      var nm = seg(t, 4.35, 4.75); if (nm > 0) { var tf = Math.min(W * 0.085, H * 0.06, 54); g.save(); g.globalAlpha = nm; g.font = "700 " + tf + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; if ("letterSpacing" in g) g.letterSpacing = (tf * 0.08 * (1.4 - nm * 0.4)) + "px";
        g.fillStyle = "rgba(0,0,0,.7)"; g.fillText("TITAN RELIQUARY", W / 2 + 1, H * 0.86 + 2); g.fillStyle = "#f2d290"; g.fillText("TITAN RELIQUARY", W / 2, H * 0.86);
        g.font = "600 " + tf * 0.26 + "px " + K.MONO; g.fillStyle = "#e8c47a"; g.fillText("THE MINT  \u00b7  STRUCK 20 OCT 2026  \u00b7  PROOF", W / 2, H * 0.86 + tf * 0.85); g.restore(); }
    },
    dispose: function (C) { if (C.cv) C.cv.style.transform = ""; },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.3, 0.9, { type: "lowpass", f: 900, to: 2400, shape: [[0.1, 0.2], [0.8, 0.16], [0.9, 0.0001]] }); A.tone(0.25, 55, 1.0, { type: "sawtooth", v: 0.07, lp: 200 }); A.noise(0.4, 0.8, { type: "bandpass", f: 3000, q: 0.8, v: 0.04 });   // pour roar, sizzle
      A.tone(1.35, 41, 0.55, { type: "sawtooth", v: 0.1, lp: 160 }); A.noise(1.35, 0.55, { type: "bandpass", f: 220, q: 1.5, v: 0.18 });          // roll rumble
      PUNCH.forEach(function (h) { A.tone(h, 70, 0.22, { to: 35, v: 0.35 }); A.noise(h, 0.07, { type: "lowpass", f: 2200, v: 0.45 }); A.bell(h + 0.01, 3300, 0.12, 0.03, [[1, 1], [1.6, 0.6]]); });
      for (var i = 0; i < 16; i++) { var s = 2.42 + i * 0.024 + K.hash(i) * 0.015; A.bell(s, 2600 + K.hash(i + 4) * 2400, 0.08, 0.025, [[1, 1], [2.3, 0.5]]); A.noise(s, 0.02, { type: "highpass", f: 3000, v: 0.12 }); }
      A.tone(HIT2, 48, 0.9, { to: 26, v: 0.6 }); A.noise(HIT2, 0.12, { type: "lowpass", f: 4500, v: 0.75 }); A.noise(HIT2, 1.0, { type: "lowpass", f: 600, to: 120, v: 0.22 }); A.bell(HIT2, 180, 1.3, 0.09, [[1, 1], [2.76, 0.5], [5.4, 0.3]]);
      A.bell(4.27, 2093, 1.9, 0.07, [[1, 1], [2.32, 0.45], [4.25, 0.25], [6.1, 0.12]]); A.bell(4.33, 2093 * 1.005, 1.5, 0.03, [[1, 1], [2.32, 0.4]]);
      A.bell(4.26, 3200, 0.1, 0.03, [[1, 1]]); A.bell(4.37, 3500, 0.08, 0.02, [[1, 1]]); A.bell(4.45, 3800, 0.06, 0.015, [[1, 1]]);
    }
  });
})();
