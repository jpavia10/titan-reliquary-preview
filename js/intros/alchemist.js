/* The Alchemist intro v2 (Grok, 2026-10-20), rebuilt from scratch on the GPU. Owner: the old art style was "lazy".
   Three long, full-bleed moments, like The Mint v4:
     1 THE ATHANOR (0-1.8 s)   a raymarched hand-blown flask on an iron tripod over a blue burner flame; the emerald elixir
                               boils (bubbles climb, the surface churns), steam curls out of the neck, the light floods the
                               oak bench, and at the peak the elixir turns to gold.
     2 THE OPUS (1.8-3.5 s)    the vapour bursts into a full-screen Navier-Stokes fluid: six unseen wands drive an emerald
                               vortex while molten gold blooms inside; the squared-circle sigil draws itself ring by ring,
                               sparks spiral inward and everything is drawn into the centre.
     3 AURUM (3.5-5.2 s)       a drop of liquid gold rises out of the flash over an obsidian floor with the sigil burning in it,
                               wobbles, settles, a light sweeps it, gold dust drifts up and the name is set below.
   HDR, bloom and ACES. Fluid is replayed deterministically from t=0, so seek(t) frames are exact. Canvas 2D fallback (Lite / no GPU). */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function init2d(C) {
      var W = C.W, H = C.H, fs = Math.min(W * (C.portrait ? 0.2 : 0.11), 120); C.fs = fs;
      C.lines = C.portrait ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"];
      var g = C.g; C.glyph = [];
      C.lines.forEach(function (ln, li) { var f = li === 1 && C.portrait ? fs * 0.56 : fs; g.font = "800 " + f + "px " + K.SERIF; var tw = g.measureText(ln).width, x = W / 2 - tw / 2, y = H * 0.4 + li * fs * 0.95;
        for (var i = 0; i < ln.length; i++) { var w = g.measureText(ln[i]).width; if (ln[i] !== " ") C.glyph.push({ ch: ln[i], x: x, y: y, f: f, w: w }); x += w; } });
      var n = C.glyph.length; C.glyph.forEach(function (gl, i) { gl.t0 = 1.0 + i * (2.0 / n); gl.t1 = gl.t0 + 0.42; });
      C.bub = []; var r = K.rng(12); for (var i = 0; i < 90; i++) C.bub.push([r(), r(), r()]);
    }
  function draw2d(C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      g.fillStyle = "#050f0a"; g.fillRect(0, 0, W, H);
      var lamp = g.createRadialGradient(W * 0.5, H * 0.35, 10, W * 0.5, H * 0.45, Math.max(W, H) * 0.7); lamp.addColorStop(0, "rgba(223,183,90,.12)"); lamp.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      var done = seg(t, 3.15, 3.5), heat = done * (1 - 0.6 * seg(t, 3.5, 4.4));
      // the flask and flame (bottom left), the pipe up to the first letter
      var fx = W * 0.16, fy = H * 0.82, fr = Math.min(W, H) * 0.07;
      var fl = 0.8 + 0.2 * Math.sin(t * 30) * Math.sin(t * 11); g.fillStyle = "rgba(90,160,255,.8)"; g.beginPath(); g.ellipse(fx, fy + fr * 1.55, fr * 0.25, fr * 0.5 * fl, 0, 0, K.PI2); g.fill();
      g.fillStyle = "rgba(255,220,120,.25)"; g.beginPath(); g.arc(fx, fy, fr * 1.2, 0, K.PI2); g.fill();
      g.save(); g.beginPath(); g.arc(fx, fy, fr, 0, K.PI2); g.clip(); var lvl = fy + fr * (0.1 + 0.6 * seg(t, 1.0, 3.1)); g.fillStyle = "#e0a52a"; g.fillRect(fx - fr, lvl + Math.sin(t * 9) * 2, fr * 2, fr * 2);
      for (i = 0; i < 14; i++) { var b = C.bub[i], by = fy + fr - ((b[1] + t * (0.8 + b[2])) % 1) * fr * 1.6; g.fillStyle = "rgba(255,240,180,.7)"; g.beginPath(); g.arc(fx + (b[0] - 0.5) * fr * 1.4, by, 1.5 + b[2] * 2, 0, K.PI2); g.fill(); } g.restore();
      g.strokeStyle = "rgba(220,240,230,.5)"; g.lineWidth = 1.5; g.beginPath(); g.arc(fx, fy, fr, 0, K.PI2); g.stroke();
      var G0 = C.glyph[0], pipe = [[fx, fy - fr], [fx, G0.y + G0.f * 0.25], [G0.x + G0.w * 0.5, G0.y + G0.f * 0.25]];
      g.strokeStyle = "rgba(220,240,230,.35)"; g.lineWidth = 6; g.beginPath(); g.moveTo(pipe[0][0], pipe[0][1]); g.lineTo(pipe[1][0], pipe[1][1]); g.lineTo(pipe[2][0], pipe[2][1]); g.stroke();
      var run = seg(t, 0.5, 1.0); if (run > 0) { var L1 = pipe[0][1] - pipe[1][1], L2 = Math.abs(pipe[2][0] - pipe[1][0]), d = run * (L1 + L2);
        g.strokeStyle = "#f0b93a"; g.lineWidth = 3; g.beginPath(); g.moveTo(pipe[0][0], pipe[0][1]); if (d < L1) g.lineTo(fx, pipe[0][1] - d); else { g.lineTo(pipe[1][0], pipe[1][1]); g.lineTo(pipe[1][0] + (d - L1) * Math.sign(pipe[2][0] - pipe[1][0]), pipe[1][1]); } g.stroke(); }
      // the glass letters: outline, then the gold rising inside each (clip to the glyph)
      C.glyph.forEach(function (gl, k) {
        g.font = "800 " + gl.f + "px " + K.SERIF; g.textBaseline = "alphabetic"; g.textAlign = "left";
        var fillK = K.eio(seg(t, gl.t0, gl.t1)), top = gl.y - gl.f * 0.75, bot = gl.y + 2, lv = K.lerp(bot, top, fillK);
        if (fillK > 0) { g.save(); g.fillStyle = "#fff"; g.globalCompositeOperation = "source-over";
          g.beginPath(); g.rect(gl.x - 4, lv, gl.w + 8, bot - lv + 4); g.clip();
          var gg = g.createLinearGradient(0, top, 0, bot); gg.addColorStop(0, K.mixc("#ffd86a", "#fff6d0", heat)); gg.addColorStop(1, "#b07a18"); g.fillStyle = gg;
          if (heat > 0) { g.shadowColor = "rgba(255,190,80,.9)"; g.shadowBlur = 24 * heat; }
          g.fillText(gl.ch, gl.x, gl.y); g.restore();
          if (fillK < 1) { g.save(); g.globalCompositeOperation = "source-atop"; g.restore(); }
        }
        g.strokeStyle = "rgba(220,240,230," + (0.35 + 0.25 * Math.sin(t * 2 + k)) + ")"; g.lineWidth = Math.max(1.2, gl.f * 0.018); g.strokeText(gl.ch, gl.x, gl.y);
        g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.8; g.save(); g.beginPath(); g.rect(gl.x, top, gl.w * 0.35, gl.f); g.clip(); g.strokeText(gl.ch, gl.x + 1, gl.y - 1); g.restore();   // glass highlight
        if (fillK > 0 && fillK < 1) for (i = 0; i < 4; i++) { var b = C.bub[(k * 4 + i) % 90], by = bot - ((b[1] + t * 1.5) % 1) * (bot - lv); g.fillStyle = "rgba(255,245,200,.8)"; g.beginPath(); g.arc(gl.x + gl.w * (0.2 + 0.6 * b[0]), by, 1.2 + b[2], 0, K.PI2); g.fill(); }
      });
      // steam when full
      var st = seg(t, 3.4, 4.4);
      if (st > 0) { for (i = 0; i < 14; i++) { var b2 = C.bub[30 + i], a = st - b2[2] * 0.4; if (a <= 0) continue; var x = W * (0.25 + b2[0] * 0.5) + Math.sin(a * 6 + i) * 14, y = H * 0.32 - a * H * 0.25;
        var sg = g.createRadialGradient(x, y, 0, x, y, 10 + a * 40); sg.addColorStop(0, "rgba(240,236,220," + 0.16 * (1 - a) + ")"); sg.addColorStop(1, "rgba(240,236,220,0)"); g.fillStyle = sg; g.fillRect(x - 60, y - 60, 120, 120); } }
    }

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
  /* ---------- The Alchemist v2: three long, full-bleed moments ---------- */
  var P3 = { flask: [0, 1.8], opus: [1.8, 3.5], gold: [3.5, 5.2] };
  var SIG = [
    "float sdTri(vec2 p,float r){const float k=1.7320508;p.x=abs(p.x)-r;p.y=p.y+r/k;if(p.x+k*p.y>0.)p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.;p.x-=clamp(p.x,-2.*r,0.);return -length(p)*sign(p.y);}",
    "float sdSq(vec2 p,float b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}",
    /* the squared circle: circle > triangle > circle > square > circle, each drawn round in turn by prog */
    "float sig(vec2 p,float prog,float w){float an=fract(atan(p.y,p.x)/6.2831853+.25);float g=0.;float d,e;",
    " d=abs(length(p)-.42);e=clamp(prog*5.,0.,1.);g+=exp(-d*d/(w*w))*step(an,e);",
    " d=abs(length(p)-.445);g+=.5*exp(-d*d/(w*w*.3))*step(an,e);",
    " d=abs(sdTri(vec2(p.x,p.y),.3637));e=clamp(prog*5.-1.,0.,1.);g+=exp(-d*d/(w*w))*step(an,e);",
    " d=abs(length(p)-.21);e=clamp(prog*5.-2.,0.,1.);g+=exp(-d*d/(w*w))*step(an,e);",
    " d=abs(sdSq(p,.1485));e=clamp(prog*5.-3.,0.,1.);g+=exp(-d*d/(w*w))*step(an,e);",
    " d=abs(length(p)-.1485);e=clamp(prog*5.-4.,0.,1.);g+=exp(-d*d/(w*w))*step(an,e);",
    " d=length(p);g+=step(.99,prog)*exp(-d*d/(w*w*4.))*1.5;",
    " return g;}"
  ].join("\n");
  /* moment 1 (the athanor) and moment 3 (the gold): raymarched */
  var SCENE = [
    "uniform vec2 R;uniform float T,st,lt,boil,glow,goldk,steam,rise,rip,rot,sweep,flash,lit;",
    SIG,
    "vec3 env(vec3 r){float y=r.y;vec3 c=mix(vec3(.006,.008,.007),vec3(.05,.045,.04),smoothstep(-.3,.9,y));",
    " c+=vec3(1.,.86,.66)*smoothstep(.88,.97,dot(r,normalize(vec3(-.65,.5,.6))))*5.;",
    " c+=vec3(.55,.75,1.)*smoothstep(.9,.985,dot(r,normalize(vec3(.8,.25,.45))))*2.;",
    " c+=vec3(1.)*smoothstep(.97,.995,dot(r,normalize(vec3(.1,1.,.2))))*3.;return c;}",
    "mat2 rm(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}",
    "float sdCylY(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}",
    "float sdTor(vec3 p,float R0,float r){vec2 q=vec2(length(p.xz)-R0,p.y);return length(q)-r;}",
    "int mat;",
    "float lvl(vec3 p){return -.12+boil*(.035*sin(p.x*9.+T*13.)*sin(p.z*8.-T*11.)+.02*sin(length(p.xz)*20.-T*18.));}",
    "vec3 BUB(int i){float fi=float(i);float sp=.6+h21(vec2(fi,3.))*.9;float y=-.9+fract(h21(vec2(fi,7.))+T*sp*(.4+boil))*.85;",
    " float r=.55*sqrt(h21(vec2(fi,1.)))*(1.-.3*(y+.9));float a=h21(vec2(fi,2.))*6.283+T*.7;return vec3(cos(a)*r,y,sin(a)*r);}",
    "float glass(vec3 p){float b=length(p)-1.;float nk=sdCylY(p-vec3(0,1.45,0),.26,.75);float lip=sdTor(p-vec3(0,2.2,0),.28,.035);return min(abs(min(b,nk))-.022,lip);}",
    "float map(vec3 p){mat=0;float d=1e3,e;",
    " if(st<.5){",
    "  e=p.y+1.62;if(e<d){d=e;mat=1;}",                                                                      /* oak bench */
    "  e=sdTor(p-vec3(0,-1.05,0),.62,.035);for(int i=0;i<3;i++){float a=float(i)*2.094+.5;vec3 q=p-vec3(cos(a)*.62,-1.33,sin(a)*.62);e=min(e,sdCylY(q,.03,.29));}if(e<d){d=e;mat=2;}",   /* iron tripod */
    "  e=min(sdCylY(p-vec3(0,-1.5,0),.2,.12),sdCylY(p-vec3(0,-1.32,0),.07,.08));if(e<d){d=e;mat=5;}",        /* brass burner */
    "  float liq=max(length(p)-.975,p.y-lvl(p));if(liq<d){d=liq;mat=3;}",                                     /* the elixir */
    "  float bb=1e3;for(int i=0;i<12;i++){bb=min(bb,length(p-BUB(i))-.035-.03*h21(vec2(float(i),9.)));}if(bb<d){d=bb;mat=4;}",
    "  e=sdCylY(p-vec3(1.9,-1.17,-1.3),.28,.45);e=min(e,sdCylY(p-vec3(1.9,-.5,-1.3),.1,.3));if(e<d){d=e;mat=6;}",   /* a stoppered vial behind */
    "  e=sdCylY(p-vec3(-2.2,-1.,-1.8),.38,.62);if(e<d){d=e;mat=6;}",
    " } else {",
    "  e=p.y+1.;if(e<d){d=e;mat=7;}",                                                                          /* obsidian floor */
    "  vec3 q=p-vec3(0,mix(-1.6,.15,rise),0);q.xz=rm(rot)*q.xz;float rr=.82*smoothstep(0.,.35,rise);",
    "  float wob=rip*(.012*sin(q.y*9.-T*14.)*sin(atan(q.z,q.x)*5.+T*3.)+.006*sin(length(q.xz)*14.-T*20.));",
    "  e=length(q*vec3(1.,1.+.07*rip*sin(T*16.),1.))-rr+wob;if(e<d){d=e;mat=8;}",
    " }",
    " return d;}",
    "vec3 nrm(vec3 p){vec2 e=vec2(.0015,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}",
    "float march(vec3 ro,vec3 rd,out bool h){float t=0.;h=false;for(int i=0;i<120;i++){float d=map(ro+rd*t);if(d<.0007*t){h=true;break;}t+=d*.9;if(t>22.)break;}return t;}",
    "float marchG(vec3 ro,vec3 rd,float tmax){float t=0.;for(int i=0;i<70;i++){float d=glass(ro+rd*t);if(d<.001)return t;t+=d;if(t>tmax)break;}return -1.;}",
    "vec3 elix(){return mix(vec3(.12,1.,.48),vec3(1.,.66,.18),goldk);}",
    "vec3 shade(vec3 ro,vec3 rd,float t){vec3 p=ro+rd*t;map(p);int mm=mat;vec3 n=nrm(p),r=reflect(rd,n);float fr=pow(1.-max(dot(n,-rd),0.),5.);vec3 c=vec3(0);",
    " vec3 L=-p+vec3(0,-.3,0);float ld=length(L);L/=ld;float gl=max(dot(n,L),0.)*glow*1.6/(1.+ld*ld*.9);",
    " vec3 F=vec3(0,-1.15,0)-p;float fd=length(F);F/=fd;float fl=max(dot(n,F),0.)*.6/(1.+fd*fd*3.);",
    " float key=max(dot(n,normalize(vec3(-.65,.5,.6))),0.);",
    " if(mm==1){float gr=fbm(vec2(p.x*1.2+fbm(p.xz*2.)*.6,p.z*14.));vec3 a=mix(vec3(.05,.025,.012),vec3(.16,.08,.035),gr);c=a*(.12+.5*key)+a*elix()*gl*1.6+a*vec3(.3,.5,1.)*fl*2.+env(r)*.04*(.3+fr);}",
    " else if(mm==2){c=vec3(.03)*(.2+key)+elix()*gl*.5+vec3(.4,.6,1.)*fl+env(r)*.15*(.2+fr);}",
    " else if(mm==5){vec3 b=vec3(.9,.6,.3);c=env(r)*b*.6+b*elix()*gl*.4+b*vec3(.4,.6,1.)*fl*2.;}",
    " else if(mm==3){float sub=fbm(p.xz*3.+vec2(T*.6,-T*.4)+p.y*2.);float core=exp(-dot(p,p)*1.4);vec3 e2=elix();",
    "  c=e2*(.18+2.4*core*(.4+1.2*sub*sub))*glow+env(r)*(.06+.9*fr);c+=e2*boil*.6*smoothstep(-.2,-.1,p.y);}",
    " else if(mm==4){c=mix(elix(),vec3(1.),.6)*2.2*glow+env(r)*.3;}",
    " else if(mm==6){c=env(r)*(.05+.6*fr)+elix()*gl*.25+vec3(.02,.015,.03);}",
    " else if(mm==8){vec3 g=vec3(1.,.74,.36);vec3 rr2=r;rr2.xz=rm(T*.25)*rr2.xz;vec3 ev=env(rr2)*.6+vec3(1.,.8,.55)*(.25*smoothstep(-.1,.8,rr2.y)+1.6*smoothstep(.55,.95,rr2.y)*smoothstep(.2,.6,abs(rr2.x)+.3)+.9*exp(-pow(rr2.y*6.,2.))*(.5+.5*sin(atan(rr2.z,rr2.x)*3.)));c=ev*mix(g,vec3(1.),fr*.7);",
    "  if(r.y<0.){vec3 q=p+r*((-1.-p.y)/r.y);c+=g*sig(q.xz/2.6,1.,.012)*lit*1.4;}",
    "  c+=g*.03;float sw=exp(-pow(dot(p.xy,vec2(.8,.6))-mix(-2.,2.,sweep),2.)*10.)*step(.01,sweep)*step(sweep,.99);c+=vec3(1.,.93,.78)*sw*1.6;}",
    " else {c=env(r)*.05;}",
    " float ao=clamp(map(p+n*.08)/.08,.35,1.);return c*ao;}",
    "void main(){vec2 s=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);vec3 ro,ta;float f=2.0;",
    " if(st<.5){float k=smoothstep(0.,1.,lt);ro=vec3(1.4-1.1*k,.7-.3*k,8.6-2.4*k);ta=vec3(0,.15,0);if(R.x<R.y){ro=vec3(.9-.7*k,.5-.2*k,7.4-1.9*k);ta=vec3(0,.35,0);}}",
    " else {ro=vec3(.0,.55,5.4)+vec3(.35*sin(lt*1.4),.15*lt,-.6*lt);ta=vec3(0,.1,0);f=2.1;}",
    " if(R.x<R.y)f*=st<.5?.78:.7;else{f*=st<.5?.68:.74;if(st>.5)ta.y-=.2;else ta.y+=.2;}vec3 w=normalize(ta-ro),u=normalize(cross(w,vec3(0,1,0))),v=cross(u,w);vec3 rd=normalize(s.x*u+s.y*v+f*w);",
    " vec3 col;bool h;float t=march(ro,rd,h);",
    " if(st<.5){",
    "  col=vec3(.003,.004,.004)+elix()*glow*.018*exp(-dot(s,s)*3.)+vec3(.05,.035,.02)*smoothstep(.3,-.6,s.x)*.15;",
    "  if(h)col=shade(ro,rd,t);",
    "  float tg=marchG(ro,rd,h?t:22.);",                                                                      /* hand-blown glass over everything */
    "  if(tg>0.){vec3 p=ro+rd*tg;vec2 e=vec2(.002,0);vec3 n=normalize(vec3(glass(p+e.xyy)-glass(p-e.xyy),glass(p+e.yxy)-glass(p-e.yxy),glass(p+e.yyx)-glass(p-e.yyx)));",
    "   float fr=.04+.96*pow(1.-abs(dot(n,rd)),5.);vec3 r=reflect(rd,n);col=col*(.9-.3*fr)+env(r)*fr*1.3+elix()*glow*.06*(1.-fr);",
    "   col+=vec3(1.,.9,.75)*pow(max(dot(r,normalize(vec3(-.65,.5,.6))),0.),60.)*3.;}",
    "  vec3 fp=vec3(0,-1.2,0);for(int i=0;i<5;i++){vec3 q=fp+vec3(0,float(i)*.05,0);vec3 w2=q-ro;float along=dot(w2,rd);if(h&&along>t)continue;",   /* blue burner flame */
    "   float dd=length(w2-rd*along);float fk=.85+.15*sin(T*31.+float(i))*sin(T*13.);col+=vec3(.25,.45,1.6)*exp(-dd*dd*(900.-float(i)*120.))*fk*.5*(1.-float(i)*.15)+vec3(.8,.9,1.)*exp(-dd*dd*6000.)*.15;}",
    "  if(steam>0.){float ts=4.,acc=0.;vec3 sc=vec3(0);for(int i=0;i<22;i++){vec3 p=ro+rd*ts;if(h&&ts>t)break;",   /* steam from the neck */
    "    float y=p.y-2.1;if(y>0.){float wdt=.12+.32*y;float den=fbm(vec2(p.x*1.6+sin(p.y*1.7-T*1.6)*.45,p.y*1.3-T*1.5))*exp(-(p.x*p.x+p.z*p.z)/(wdt*wdt))*smoothstep(0.,.2,y)*steam;",
    "     den=smoothstep(.45,.85,den/max(steam,.001))*steam*exp(-(p.x*p.x+p.z*p.z)/(wdt*wdt));acc+=den*.1;sc+=den*.1*(1.-acc)*(vec3(.7,.75,.72)*.3+elix()*glow*.4*exp(-y*.8));}ts+=.25;}",
    "   col=col*(1.-min(acc,.85))+sc;}",
    "  col+=elix()*boil*.15*exp(-dot(s+vec2(0.,.05),s+vec2(0.,.05))*5.);",
    " } else {",
    "  col=vec3(.004,.003,.003)+vec3(.03,.02,.012)*smoothstep(.6,-.1,s.y)+vec3(1.,.6,.2)*.025*exp(-dot(s,s)*2.);",
    "  if(h){vec3 p=ro+rd*t;map(p);int mm=mat;col=shade(ro,rd,t);",
    "   if(mm==7){vec3 n=vec3(0,1,0);vec3 r2=reflect(rd,n);bool h2;float t2=march(p+n*.01,r2,h2);vec3 rc=h2?shade(p+n*.01,r2,t2):env(r2)*.08;",
    "    float sg=sig(p.xz/2.6,1.,.008+.004*length(p.xz));float fr=.05+.95*pow(1.-max(dot(n,-rd),0.),4.);",
    "    col=vec3(.006)+rc*fr*.8+vec3(1.,.62,.2)*sg*lit*(1.4+.6*sin(T*3.+length(p.xz)*4.))*exp(-length(p.xz)*.15);",
    "    col=mix(col,vec3(.03,.02,.012),smoothstep(4.,11.,t));vec2 dq=p.xz;col+=vec3(1.,.6,.2)*.12*rise*exp(-dot(dq,dq)*1.2);}}",
    " }",
    " col+=vec3(1.,.85,.6)*flash*exp(-dot(s,s)*3.)*3.;",
    " o=vec4(col,1.);}"
  ].join("\n");
  /* moment 2 (the opus): the GPU fluid sim, emerald smoke and molten gold, under the sigil */
  var CMP = [
    "uniform sampler2D DY;uniform vec2 R;uniform float T,circ,flash,lt;",
    SIG,
    "void main(){vec2 s=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);vec2 px=1./vec2(textureSize(DY,0));vec4 d=texture(DY,uv);",
    " float sm=d.r,gd=d.g;float gx=texture(DY,uv+vec2(px.x,0)*2.).r-texture(DY,uv-vec2(px.x,0)*2.).r,gy=texture(DY,uv+vec2(0,px.y)*2.).r-texture(DY,uv-vec2(0,px.y)*2.).r;",
    " float sg=sig(s,circ,.0045+.002*(1.-circ));",
    " vec3 bg=vec3(.003,.008,.006)+vec3(.01,.04,.028)*exp(-dot(s,s)*2.5);",
    " float lig=clamp(.5+(-gx*.8+gy*1.3)*6.,.1,1.6);float den=1.-exp(-sm*2.2);",
    " vec3 smoke=mix(vec3(.01,.12,.07),vec3(.12,.7,.42),smoothstep(.1,1.2,sm))*den*lig*(.8+.4*vn(uv*vec2(40.,40.)+T))*.9;",
    " smoke*=1.+sg*1.5+exp(-dot(s,s)*8.)*circ;",
    " vec3 gold=vec3(1.,.55,.12)*(1.-exp(-gd*2.))*2.2+vec3(1.,.85,.5)*smoothstep(.8,2.5,gd)*1.2;",
    " vec3 col=bg*(1.-den)+smoke+gold+vec3(1.,.72,.3)*sg*3.4;",
    " col+=vec3(1.,.85,.55)*flash*exp(-dot(s,s)*(6.-4.*flash))*6.;",
    " o=vec4(col,1.);}"
  ].join("\n");
  var SPV = "#version 300 es\nprecision highp float;uniform float T;uniform int st;uniform vec2 sc;out float a;out vec3 c;" +
    "float h(float n){return fract(sin(n*12.9898)*43758.5453);}" +
    "void main(){float id=float(gl_VertexID);a=0.;c=vec3(0);gl_Position=vec4(2.,2.,0.,1.);gl_PointSize=0.;" +
    " if(st==1){float b=1.95+h(id)*1.35;float life=.7+h(id+4.)*.6;float age=T-b;if(age<0.||age>life)return;float k=age/life;" +
    "  float r0=.12+.5*sqrt(h(id+1.));float r=r0*(1.-k*k*.92);float an=h(id+2.)*6.283+age*(1.1/(r+.06))*(h(id+3.)>.5?1.:1.);" +
    "  vec2 p=vec2(cos(an),sin(an))*r;gl_Position=vec4(p*sc*2.,0.,1.);gl_PointSize=mix(2.6,1.,k);a=sin(k*3.1416);c=mix(vec3(1.,.8,.45)*2.4,vec3(.4,1.,.6)*1.2,step(.82,h(id+5.)));}" +
    " else if(st==2){float life=2.2+h(id)*2.;float age=mod(T-3.5+h(id+1.)*life,life);float k=age/life;" +
    "  vec2 p=vec2((h(id+2.)-.5)*1.3+sin(T*.7+id)*.04,-1.1+k*2.4+h(id+3.)*.3);gl_Position=vec4(p,0.,1.);gl_PointSize=1.+2.*h(id+6.);a=sin(k*3.1416)*.35*smoothstep(3.5,4.,T);c=vec3(1.,.75,.4)*1.6;}}";
  var SPF = "#version 300 es\nprecision highp float;in float a;in vec3 c;out vec4 o;void main(){vec2 q=gl_PointCoord-.5;float f=exp(-dot(q,q)*14.);o=vec4(c*a*f,0.);}";
  function setupGPU(C) {
    var G = GPU(C, 1); if (!G) return null; var Po = Post(G); if (!Po) return null;
    var Sc = G.prog(SCENE), Cm = G.prog(CMP), Sp = G.prog(SPF, SPV); if (!Sc || !Cm || !Sp) return null;
    var asp = C.W / C.H, fh = asp >= 1 ? 200 : Math.round(200 / asp), fw = Math.round(fh * asp);
    if (asp < 1) { fw = 200; fh = Math.round(200 / asp); }
    var F = Fluid(G, fw, fh, "void main(){o=vec4(0);}"); if (!F) return null;
    return { G: G, Po: Po, Sc: Sc, Cm: Cm, Sp: Sp, F: F, simT: -1, m: Math.min(C.W, C.H) };
  }
  /* deterministic fluid: replays from zero when time runs backwards, fixed 60 Hz steps, so any seek(t) gives the same frame */
  var DT = 1 / 60;
  function emit(M, C, ts) {
    var F = M.F, sx = M.m / C.W, sy = M.m / C.H, k, a, r, p;
    function P(x, y) { return [0.5 + x * sx, 0.5 + y * sy]; }
    if (ts < 0.25) for (k = 0; k < 8; k++) { a = k / 8 * K.PI2 + ts * 3; p = P(Math.cos(a) * 0.03, Math.sin(a) * 0.03);   // vapour bursts from the flask
      F.splat(p, 0.0004, [Math.cos(a) * 1.1 * sx, Math.sin(a) * 1.1 * sy], [0.09, 0, 0, 0]); }
    if (ts > 0.1 && ts < 1.45) for (k = 0; k < 6; k++) { a = k / 6 * K.PI2 + ts * 2.4; r = 0.36 - 0.08 * K.seg(ts, 0.8, 1.45);   // the vortex: six wands circling
      p = P(Math.cos(a) * r, Math.sin(a) * r);
      F.splat(p, 0.0006, [(-Math.sin(a) * 0.9 - Math.cos(a) * 0.25) * sx, (Math.cos(a) * 0.9 - Math.sin(a) * 0.25) * sy], [0.04, 0, 0, 0]); }
    if (ts > 0.45 && ts < 1.5) for (k = 0; k < 3; k++) { a = k / 3 * K.PI2 - ts * 3.2; r = 0.16 * (1 - K.seg(ts, 0.9, 1.5));   // molten gold blooms inside the circle
      p = P(Math.cos(a) * r, Math.sin(a) * r);
      F.splat(p, 0.00025, [-Math.sin(a) * 0.6 * sx, Math.cos(a) * 0.6 * sy], [0, 0.07, 0, 0]); }
    if (ts > 1.4 && ts < 1.62) for (k = 0; k < 10; k++) { a = k / 10 * K.PI2 + ts; r = 0.3;   // everything is drawn into the centre
      p = P(Math.cos(a) * r, Math.sin(a) * r); F.splat(p, 0.001, [-Math.cos(a) * 1.4 * sx, -Math.sin(a) * 1.4 * sy], [0, 0.015, 0, 0]); }
  }
  function sim(M, C, ts) {
    if (M.simT < 0 || ts < M.simT - 1e-6) { M.F.reset(); M.simT = 0; }
    var n = 0; while (M.simT + DT <= ts + 1e-6 && n < 240) { emit(M, C, M.simT); M.F.step(DT, 0, 14); M.simT += DT; n++; }
  }
  I.reg("alchemist", {
    dur: 5.2, still: 5.1,
    init: function (C) { C.M = C.lite ? null : setupGPU(C); if (!C.M) init2d(C); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg; g.clearRect(0, 0, W, H);
      var M = C.M; if (!M || C._glDead) { if (!C.glyph) init2d(C); draw2d(C, t * 4.4 / 5.2); return; }
      var G = M.G, x = G.x, st = t < P3.flask[1] ? 0 : t < P3.opus[1] ? 1 : 2, P = st === 0 ? P3.flask : st === 1 ? P3.opus : P3.gold, lt = seg(t, P[0], P[1]), expo = 1, bloom = 0.8;
      if (st === 1) {
        sim(M, C, t - P3.opus[0]);
        var fl = Math.max(1 - seg(t, 1.8, 1.98), seg(t, 3.28, 3.5));
        G.run(M.Cm, { DY: M.F.D.r, R: [G.W, G.H], T: t, circ: K.eio(seg(t, 1.95, 3.0)), flash: fl, lt: lt }, M.Po.hdr);
        bloom = 0.9;
      } else {
        var u = { R: [G.W, G.H], T: t, st: st, lt: lt, boil: 0, glow: 0, goldk: 0, steam: 0, rise: 0, rip: 0, rot: 0, sweep: 0, flash: 0, lit: 0 };
        if (st === 0) { u.glow = 0.35 + 0.65 * K.eio(seg(t, 0.15, 1.0)); u.boil = 0.25 + 0.75 * seg(t, 0.5, 1.6); u.steam = seg(t, 0.4, 1.3); u.goldk = K.eio(seg(t, 1.35, 1.8)); u.flash = K.ei3(seg(t, 1.62, 1.8)) * 0.35; u.glow += u.flash; expo = seg(t, 0, 0.35); }
        else { u.rise = K.eo3(seg(lt, 0, 0.5)); u.rip = (1 - K.eio(seg(lt, 0.15, 0.75))) * smoothRise(lt); u.rot = (1 - K.eo3(seg(lt, 0, 0.9))) * 3.5 + lt * 0.3; u.sweep = seg(lt, 0.48, 0.8); u.lit = K.eio(seg(lt, 0.05, 0.4)); u.flash = 1 - seg(t, 3.5, 3.75); expo = 1.1; bloom = 0.6; }
        G.run(M.Sc, u, M.Po.hdr);
      }
      if (st > 0) { x.enable(x.BLEND); x.blendFunc(x.ONE, x.ONE); G.run(M.Sp, { T: t, st: st, sc: [M.m / W, M.m / H] }, M.Po.hdr, st === 1 ? 24000 : 700); x.disable(x.BLEND); }
      M.Po.out({ bloom: bloom, haze: 0, T: t, expo: expo });
      if (st === 2) { var nm = seg(t, 4.3, 4.85); if (nm > 0) { var tf = Math.min(W * 0.085, H * 0.06, 58); g.save(); g.globalAlpha = nm; g.font = "700 " + tf + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; if ("letterSpacing" in g) g.letterSpacing = (tf * 0.08 * (1.4 - nm * 0.4)) + "px";
        var bd = g.createLinearGradient(0, H * 0.85 - tf * 1.6, 0, H); bd.addColorStop(0, "rgba(4,3,2,0)"); bd.addColorStop(0.35, "rgba(4,3,2,.62)"); bd.addColorStop(1, "rgba(4,3,2,.8)"); g.fillStyle = bd; g.fillRect(0, H * 0.85 - tf * 1.6, W, H);
        g.fillStyle = "rgba(0,0,0,.7)"; g.fillText("TITAN RELIQUARY", W / 2 + 1, H * 0.85 + 2); g.fillStyle = "#f4d58e"; g.fillText("TITAN RELIQUARY", W / 2, H * 0.85);
        g.font = "600 " + tf * 0.26 + "px " + K.MONO; g.fillStyle = "#cfe3c4"; g.fillText("THE ALCHEMIST  \u00b7  OPUS MAGNUM  \u00b7  AURUM", W / 2, H * 0.85 + tf * 0.85); g.restore(); } }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 1.85, { type: "lowpass", f: 260, shape: [[0.2, 0.1], [1.6, 0.14], [1.85, 0.0001]] });                      // burner roar
      for (var i = 0; i < 46; i++) { var s = 0.3 + i * 0.032 + K.hash(i) * 0.03; A.tone(s, 220 + K.hash(i * 7) * 420, 0.05, { v: 0.035 + 0.03 * (s / 1.8), to: 700 + K.hash(i * 3) * 700 }); }   // the boil quickening
      A.bell(0.25, 1760, 1.4, 0.025, [[1, 1], [2.71, 0.3], [5.1, 0.12]]);                                                   // glass ring
      A.noise(1.75, 1.7, { type: "bandpass", f: 300, to: 2400, q: 1.4, shape: [[0.1, 0.18], [1.3, 0.12], [1.7, 0.0001]] });    // the vortex rising
      A.tone(1.8, 55, 1.7, { to: 82, type: "sawtooth", v: 0.05, lp: 260 });
      [0, 1, 2, 3, 4].forEach(function (k) { A.bell(1.95 + k * 0.21, [392, 466, 523, 622, 784][k], 1.2, 0.02, [[1, 1], [2.0, 0.25], [3.0, 0.1]]); });   // each ring of the sigil
      A.tone(3.42, 46, 1.6, { to: 30, v: 0.5 }); A.noise(3.42, 0.6, { type: "lowpass", f: 1800, to: 120, v: 0.25 });        // convergence boom
      [523, 659, 784, 1046].forEach(function (f, k) { A.bell(3.6 + k * 0.05, f, 2.4, 0.03, [[1, 1], [2.32, 0.35], [4.25, 0.15]]); });   // the gold rings out
    }
  });
  function smoothRise(lt) { return K.seg(lt, 0.02, 0.2); }
})();
