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
  /* ---------- The Mint v4: three long, full-bleed moments ---------- */
  var M3 = { pour: [0, 1.9], strike: [1.9, 3.45], hero: [3.45, 5.0] }, CONTACT = 1.9 + 1.55 * 0.36;
  var SCENE = [
    "uniform sampler2D TX;uniform vec2 R;uniform float T,st,lt,tip,fill,flow,dsc,form,lift,rise,rot,sweep,heat;",
    "vec3 bb(float k){k=clamp(k,0.,1.);return mix(mix(vec3(.3,.03,0.),vec3(1.,.28,.03),smoothstep(0.,.4,k)),mix(vec3(1.,.62,.16),vec3(1.,.95,.82),smoothstep(.7,1.,k)),smoothstep(.35,.75,k))*(.4+2.6*k*k);}",
    "vec3 env(vec3 r){float y=r.y;vec3 c=mix(vec3(.012,.011,.013),vec3(.16,.15,.15),smoothstep(-.2,.9,y));",
    " c+=vec3(1.,.95,.88)*smoothstep(.9,.975,dot(r,normalize(vec3(-.6,.55,.55))))*4.;c+=vec3(.75,.82,1.)*smoothstep(.93,.99,dot(r,normalize(vec3(.75,.35,.5))))*2.2;",
    " c+=vec3(1.)*smoothstep(.975,.995,dot(r,normalize(vec3(.0,1.,.15))))*2.5;c+=vec3(1.,.5,.15)*heat*smoothstep(.6,1.,-y)*1.5;return c;}",
    "float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}",
    "float sdBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}",
    "float sdCylY(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}",
    "float rel(vec2 q){return texture(TX,q*.5+.5).r;}",
    "mat2 rm(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}",
    "int mat;float emi;",
    "vec3 LIP;",
    "float map(vec3 p){mat=0;emi=0.;float d=1e3,e;",
    " if(st<.5){",
    "  e=p.y+1.32;if(e<d){d=e;mat=6;}",                                                                     /* foundry floor */
    "  vec3 m=p-vec3(-.15,-1.05,0.);e=max(sdBox(m,vec3(1.25,.27,.62),.03),-sdBox(m-vec3(0,.2,0),vec3(1.05,.3,.45),.02));if(e<d){d=e;mat=1;}",   /* cast-iron ingot mould */
    "  float lvl=mix(-1.2,-.84,fill);vec3 q=m-vec3(0,0,0);float pool=max(sdBox(q-vec3(0,.05,0),vec3(1.04,.29,.44),.02),p.y-lvl-.012*sin(length(p.xz-vec2(.25,0.))*22.-T*14.)*fill);",
    "  vec3 cq=p-vec3(1.05,.55,0.);cq.xy=rm(tip)*cq.xy;",                                                    /* the crucible, tipping about its pivot */
    "  float cup=max(sdCylY(cq,.5,.55),-sdCylY(cq-vec3(0,.12,0),.42,.55));cup=min(cup,sdBox(cq-vec3(-.55,.42,0),vec3(.1,.04,.12),.02));if(cup<d){d=cup;mat=2;}",
    "  vec3 wp=p;float inner=max(sdCylY(cq-vec3(0,.12,0),.41,.55),wp.y-(.55+.25-tip*.32));",            /* metal inside the crucible: level stays horizontal as it tips */
    "  float liq=min(pool,inner);",
    "  if(flow>0.){vec3 a=LIP;for(int i=0;i<24;i++){float s=float(i)/23.;vec3 c=a+vec3(-.28*s-.12*s*s,-1.65*s*s-.25*s,0.)+vec3(.015*sin(T*20.+s*9.),0,.015*cos(T*17.+s*7.));",
    "    if(c.y<lvl)break;liq=smin(liq,length(p-c)-mix(.07,.05,s)*flow,.12);}}",
    "  if(liq<d){d=liq;mat=3;emi=1.;}",
    " } else if(st<1.5){",                                                                                    /* the strike, slow motion */
    "  e=p.y+1.6;if(e<d){d=e;mat=6;}",
    "  e=sdCylY(p-vec3(0,-1.,0),1.35,.55);if(e<d){d=e;mat=1;}",                                               /* lower die */
    "  float r=mix(1.0,1.05,form);vec3 q=p-vec3(0,-.36,0);float b=sdCylY(q,r,.09);",                          /* the blank, spreading as it is struck */
    "  if(length(q.xz)<r&&q.y>0.){b-=rel(vec2(q.x,-q.z)/r)*.07*form;b-=smoothstep(r*.86,r*.92,length(q.xz))*.04*form;}",
    "  if(b<d){d=b;mat=4;emi=heat*(.25+rel(vec2(q.x,-q.z)/r));}",
    "  float top=-.36+.09+.07*form;float dy=mix(2.6,top+.6,dsc)+lift*2.4;e=sdCylY(p-vec3(0,dy,0),1.25,.6);if(e<d){d=e;mat=1;}",   /* upper die */
    " } else {",                                                                                              /* the hero coin */
    "  e=p.y+1.25;if(e<d){d=e;mat=7;}",
    "  vec3 q=p-vec3(0,mix(-1.9,.34,rise),0);q.xz=rm(rot)*q.xz;q.yz=rm(.12*(1.-rise))*q.yz;",
    "  vec3 c=q.xzy;float b=sdCylY(c,1.,.09);if(length(c.xz)<1.&&c.y>0.){b-=rel(c.xz)*.06;b-=smoothstep(.86,.92,length(c.xz))*.035;}",
    "  if(c.y<0.&&length(c.xz)<1.){b-=rel(vec2(-c.x,-c.z))*.04;}",
    "  if(b<d){d=b;mat=5;}",
    " }",
    " return d;}",
    "vec3 nrm(vec3 p){vec2 e=vec2(.0012,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}",
    "float march(vec3 ro,vec3 rd,out bool h){float t=0.;h=false;for(int i=0;i<140;i++){float d=map(ro+rd*t);if(d<.0006*t){h=true;break;}t+=d*.85;if(t>18.)break;}return t;}",
    "vec3 shade(vec3 ro,vec3 rd,float t,vec3 hot){vec3 p=ro+rd*t;map(p);int mm=mat;float em=emi;vec3 n=nrm(p),r=reflect(rd,n);float fr=pow(1.-max(dot(n,-rd),0.),5.);",
    " vec3 c;vec3 L=hot-p;float ld=length(L);L/=ld;float hl=max(dot(n,L),0.)/(1.+ld*ld*.6);",
    " if(mm==3){float k=.82+.18*sin(T*3.+p.x*2.);c=bb(k)+env(r)*.15;}",
    " else if(mm==1){c=env(r)*.12+vec3(.05,.045,.045)*(.3+.7*max(dot(n,normalize(vec3(-.5,.8,.4))),0.))+vec3(1.,.45,.12)*hl*heat*2.;c*=.8+.4*vn(p.xz*14.+p.y*9.);}",
    " else if(mm==2){c=env(r)*mix(vec3(.25,.24,.24),vec3(1.),fr)*.5+vec3(.06,.05,.05)*max(dot(n,normalize(vec3(-.5,.8,.4))),0.)+vec3(1.,.45,.12)*hl*heat*1.5;c*=.75+.4*vn(vec2(atan(p.z,p.x-1.05)*8.,p.y*6.));}",
    " else if(mm==4||mm==5){vec3 g=vec3(1.,.77,.4);c=env(r)*mix(g,vec3(1.),fr)+g*max(dot(n,normalize(vec3(-.5,.8,.4))),0.)*.08;c+=bb(.75)*em*1.5;",
    "  if(mm==5){float sw=exp(-pow(dot(p.xy,vec2(.8,.6))-mix(-2.,2.,sweep),2.)*14.)*step(.01,sweep)*step(sweep,.99);c+=vec3(1.,.92,.75)*sw*1.2;}}",
    " else if(mm==6){c=vec3(.02,.018,.018)*(.5+.5*vn(p.xz*6.))+vec3(1.,.45,.12)*hl*heat*.8;}",
    " else {c=env(r)*.05+vec3(.01);}",
    " float ao=clamp(map(p+n*.06)/.06,.3,1.);return c*ao;}",
    "void main(){vec2 s=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);vec3 ro,ta;float f=1.9;",
    " LIP=vec3(1.05,.55,0.)+vec3(rm(-tip)*vec2(-.6,.46),0.)*0.;{vec2 l=vec2(-.62,.46);l=vec2(cos(tip)*l.x-sin(tip)*l.y,sin(tip)*l.x+cos(tip)*l.y);LIP=vec3(1.05+l.x,.55+l.y,0.);}",
    " if(st<.5){ro=mix(vec3(-1.2,.9,7.8),vec3(-.6,.25,4.6),smoothstep(0.,1.,lt));ta=vec3(.25,-.35,0.);}",
    " else if(st<1.5){ro=mix(vec3(.4,.05,4.4),vec3(.0,3.0,2.2),smoothstep(.55,.95,lt));ro.x+=.3*sin(lt*1.2);ta=vec3(0,-.35,0);f=2.1;}",
    " else {ro=vec3(.0,.3,5.2)+vec3(.15*sin(lt*1.3),0.,-.45*lt);ta=vec3(0,.1,0);f=2.15;}",
    " if(R.x<R.y)f*=st<.5?.68:.8;vec3 w=normalize(ta-ro),u=normalize(cross(w,vec3(0,1,0))),v=cross(u,w);vec3 rd=normalize(s.x*u+s.y*v+f*w);",
    " vec3 hot=st<.5?vec3(.2,-.7,0.):vec3(0.,-.2,0.);",
    " vec3 col=mix(vec3(.006,.005,.006),vec3(.03,.025,.025),smoothstep(-.5,.7,s.y))+vec3(1.,.45,.12)*heat*.035*exp(-dot(s+vec2(0.,.2),s+vec2(0.,.2))*2.);",
    " bool h;float t=march(ro,rd,h);",
    " if(h){vec3 p=ro+rd*t;map(p);int mm=mat;col=shade(ro,rd,t,hot);",
    "  if(mm==7){vec3 n=vec3(0,1,0);vec3 r2=reflect(rd,n);bool h2;float t2=march(p+n*.01,r2,h2);vec3 rc=h2?shade(p+n*.01,r2,t2,hot):env(r2)*.1;col=vec3(.008)+rc*.35*(.4+.6*pow(1.-max(dot(n,-rd),0.),3.));}",
    "  if(mm==6&&st<.5){vec3 n=vec3(0,1,0);vec3 r2=reflect(rd,n);bool h2;float t2=march(p+n*.01,r2,h2);if(h2){map(p+n*.01+r2*t2);if(mat==3)col+=shade(p+n*.01,r2,t2,hot)*.18;}}",
    " }",
    " if(st>.5&&st<1.5){float since=T-"+CONTACT.toFixed(3)+";if(since>0.){float ring=exp(-pow(length(s*vec2(1.,2.6)+vec2(0,.12))-.45-since*1.2,2.)*90.)*exp(-since*4.);col+=vec3(1.,.7,.4)*ring*.5+vec3(1.,.85,.6)*exp(-since*12.)*.35*exp(-dot(s,s)*6.);}}",
    " col=mix(col,col*.4+vec3(.02,.015,.012),smoothstep(10.,17.,t)*0.);",
    " o=vec4(col,1.);}"
  ].join("\n");
  var SPV = "#version 300 es\nprecision highp float;uniform float T,asp;uniform int st;uniform vec2 at;out float a;out vec3 c;" +
    "float h(float n){return fract(sin(n*12.9898)*43758.5453);}" +
    "void main(){float id=float(gl_VertexID);float b,life;vec2 v0;" +
    " if(st==0){b=.55+h(id)*1.3;float an=1.57+(h(id+2.)-.5)*2.4;float sp=.18+h(id+3.)*.55;v0=vec2(cos(an)/asp,sin(an))*sp;life=.4+h(id+4.)*.6;}" +
    " else if(st==1){b=" + CONTACT.toFixed(3) + "+h(id)*.06;float an=h(id+2.)*6.283;float sp=.35+h(id+3.)*.9;v0=vec2(cos(an)/asp*1.3,sin(an)*.28+.15)*sp;life=.5+h(id+4.)*.8;}" +
    " else {gl_Position=vec4(2.,2.,0.,1.);gl_PointSize=0.;a=0.;c=vec3(0);return;}" +
    " float age=(T-b)*(st==1?.45:1.);if(age<0.||age>life){gl_Position=vec4(2.,2.,0.,1.);gl_PointSize=0.;a=0.;c=vec3(0);return;}" +
    " vec2 p=at+v0*age+vec2(0.,-.9)*age*age;float k=age/life;gl_Position=vec4(p*2.-1.,0.,1.);gl_PointSize=mix(3.,1.,k);a=1.-k;c=mix(vec3(1.,.9,.6)*2.,vec3(1.,.35,.05)*.7,k);}";
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
    var G = GPU(C, 1); if (!G) return null; var Po = Post(G); if (!Po) return null; var Sc = G.prog(SCENE); if (!Sc) return null;
    var Sp = G.prog(SPF, SPV); if (!Sp) return null; return { G: G, Po: Po, Sc: Sc, Sp: Sp, tx: { t: G.tex(heightTex(C)) } };
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
    dur: 5.0, still: 4.9,
    init: function (C) { C.R = Math.min(C.W, C.H) * 0.36; C.face = face(C.R); C.M = C.lite ? null : setupGPU(C); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg; g.clearRect(0, 0, W, H);
      var M = C.M; if (!M || C._glDead) { draw2d(C, t * 4.8 / 5.0); return; }
      var G = M.G, x = G.x, st = t < M3.pour[1] ? 0 : t < M3.strike[1] ? 1 : 2, P = st === 0 ? M3.pour : st === 1 ? M3.strike : M3.hero, lt = seg(t, P[0], P[1]);
      var u = { TX: M.tx, R: [G.W, G.H], T: t, st: st, lt: lt, tip: 0, fill: 0, flow: 0, dsc: 0, form: 0, lift: 0, rise: 0, rot: 0, sweep: 0, heat: 0 }, shake = 0, at = [0.5, 0.3];
      if (st === 0) { u.tip = 1.15 * K.eio(seg(t, 0.1, 1.0)); u.flow = seg(t, 0.55, 0.75) * (1 - seg(t, 1.65, 1.85)); u.fill = K.eio(seg(t, 0.7, 1.85)); u.heat = 1; at = [0.47, 0.3 + 0.08 * u.fill]; }
      else if (st === 1) { u.dsc = K.ei3(seg(lt, 0.0, 0.36)); u.form = K.eio(seg(lt, 0.36, 0.6)); u.lift = K.eio(seg(lt, 0.6, 0.82)); u.heat = 0.9 * u.form * (1 - K.eio(seg(lt, 0.7, 1.0))); at = [0.5, 0.43];
        var d = t - CONTACT; if (d > 0 && d < 0.4) shake = 14 * (1 - d / 0.4); }
      else { u.rise = K.eo3(seg(lt, 0.0, 0.55)); u.rot = (1 - K.eo3(seg(lt, 0, 0.8))) * 5.2 + Math.sin(lt * 2) * 0.06; u.sweep = seg(lt, 0.5, 0.85); }
      C.cv.style.transform = G.cv.style.transform = shake ? "translate(" + (K.hash(t * 97) - 0.5) * shake + "px," + (K.hash(t * 61) - 0.5) * shake + "px)" : "";
      G.run(M.Sc, u, M.Po.hdr);
      x.enable(x.BLEND); x.blendFunc(x.ONE, x.ONE); G.run(M.Sp, { T: t, st: st, asp: W / H, at: at }, M.Po.hdr, st === 0 ? 6000 : st === 1 ? 9000 : 1); x.disable(x.BLEND);
      M.Po.out({ bloom: st === 2 ? 0.55 : 0.8, haze: 0, T: t, expo: st === 2 ? 1.15 : 1.0 });
      if (st === 2) { var nm = seg(t, 4.35, 4.8); if (nm > 0) { var tf = Math.min(W * 0.085, H * 0.06, 58); g.save(); g.globalAlpha = nm; g.font = "700 " + tf + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; if ("letterSpacing" in g) g.letterSpacing = (tf * 0.08 * (1.4 - nm * 0.4)) + "px";
        g.fillStyle = "rgba(0,0,0,.7)"; g.fillText("TITAN RELIQUARY", W / 2 + 1, H * 0.86 + 2); g.fillStyle = "#f2d290"; g.fillText("TITAN RELIQUARY", W / 2, H * 0.86);
        g.font = "600 " + tf * 0.26 + "px " + K.MONO; g.fillStyle = "#e8c47a"; g.fillText("THE MINT  \u00b7  STRUCK 20 OCT 2026  \u00b7  PROOF", W / 2, H * 0.86 + tf * 0.85); g.restore(); } }
    },
    dispose: function (C) { if (C.cv) C.cv.style.transform = ""; },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.0, 38, 1.9, { type: "sawtooth", v: 0.06, lp: 140 });                                              // furnace drone
      A.noise(0.1, 0.6, { type: "bandpass", f: 400, q: 2, v: 0.08 }); A.tone(0.15, 90, 0.5, { to: 70, type: "triangle", v: 0.05 });   // crucible grinds as it tips
      A.noise(0.55, 1.3, { type: "lowpass", f: 700, to: 1800, shape: [[0.1, 0.22], [1.0, 0.16], [1.2, 0.0001]] }); A.noise(0.6, 1.2, { type: "bandpass", f: 3200, q: 0.8, v: 0.05 });   // pour roar + sizzle
      A.tone(1.9, 60, 0.7, { to: 52, type: "sawtooth", v: 0.05, lp: 300 });                                       // hydraulic descent
      A.tone(CONTACT, 44, 1.4, { to: 24, v: 0.7 }); A.noise(CONTACT, 0.14, { type: "lowpass", f: 4000, v: 0.7 }); A.noise(CONTACT, 1.2, { type: "lowpass", f: 500, to: 90, v: 0.25 });
      A.bell(CONTACT, 170, 1.6, 0.09, [[1, 1], [2.76, 0.5], [5.4, 0.3]]); A.noise(3.05, 0.4, { type: "highpass", f: 2500, v: 0.05 });   // die lifts, hiss
      A.bell(3.6, 2093, 2.2, 0.06, [[1, 1], [2.32, 0.45], [4.25, 0.25], [6.1, 0.12]]); A.bell(4.35, 1568, 0.9, 0.03, [[1, 1], [2.32, 0.3]]);   // hero ring
    }
  });
})();
