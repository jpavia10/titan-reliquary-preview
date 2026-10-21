/* Titan Reliquary · theme intros, shared kit (Grok, 2026-10-20). Loaded after js/motion-splash.js, before the js/intros/*.js scenes.
   Owner, 2026-10-20: "the secondary scene splash screens are incredibly lazy ... random sigil with particle to title is generic".
   So every theme gets its own choreographed opening: its own composition, camera, timing, reveal and sound. This file is only
   the plumbing they share, so no scene looks like another:
     TitanIntro.reg(id, style)   style = { dur, still, wipe?, init(C), draw(C, t), sound(C)?, dispose(C)? }; registered as a
                                 "native" style in TitanOpening (plays at its real 2-5 s length, a tap skips, Calm = one still frame)
     TitanIntro.gl(C, frag, o)   a WebGL (2, else 1) layer under the 2D canvas running one fragment shader; null when Lite, no GL,
                                 or the context is lost, so every scene has a 2D path. Uniforms: R (px), T (s), U0, U1 (vec4), TX (texture)
     TitanIntro.audio(C)         Web Audio for the scene: null before any user gesture, when muted (tr_mute_v1) or interface sounds
                                 are off. Helpers A.tone / A.noise / A.bell schedule at seconds from the scene start; stop() fades out.
   Rules: draw(C, t) is a pure function of t (frames can drop without stutter, ?splashhold + seek(t) gives test frames). */
(function () {
  "use strict";
  var O = window.TitanOpening;
  if (!O || !O._debug || !O._debug.STYLES || window.TitanIntro) return;
  var S = O._debug.STYLES, K = O._debug.K;

  /* ---------------- WebGL layer ---------------- */
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var HEAD = "precision highp float;uniform vec2 R;uniform float T;uniform vec4 U0;uniform vec4 U1;uniform sampler2D TX;\n" +
    "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n" +
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}\n";
  function gl(C, frag, o) {
    o = o || {};
    if (C.lite || C._glDead) return null;
    var L = C._gl;
    if (!L) {
      var cv = document.createElement("canvas"); cv.className = "ts-mo ts-mogl"; cv.setAttribute("aria-hidden", "true");
      var opt = { alpha: !!o.alpha, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false };
      var x = null; try { x = cv.getContext("webgl2", opt) || cv.getContext("webgl", opt); } catch (e) { x = null; }
      if (!x) { C._glDead = true; return null; }
      function sh(type, src) { var s = x.createShader(type); x.shaderSource(s, src); x.compileShader(s); if (!x.getShaderParameter(s, x.COMPILE_STATUS)) { if (window.console) console.warn("intro shader", x.getShaderInfoLog(s)); return null; } return s; }
      var vs = sh(x.VERTEX_SHADER, VS), fs = sh(x.FRAGMENT_SHADER, HEAD + frag);
      if (!vs || !fs) { C._glDead = true; return null; }
      var pr = x.createProgram(); x.attachShader(pr, vs); x.attachShader(pr, fs); x.linkProgram(pr);
      if (!x.getProgramParameter(pr, x.LINK_STATUS)) { C._glDead = true; return null; }
      x.useProgram(pr);
      var b = x.createBuffer(); x.bindBuffer(x.ARRAY_BUFFER, b); x.bufferData(x.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), x.STATIC_DRAW);
      var loc = x.getAttribLocation(pr, "p"); x.enableVertexAttribArray(loc); x.vertexAttribPointer(loc, 2, x.FLOAT, false, 0, 0);
      var tex = x.createTexture(); x.bindTexture(x.TEXTURE_2D, tex);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, o.nearest ? x.NEAREST : x.LINEAR); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, o.nearest ? x.NEAREST : x.LINEAR);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_S, x.CLAMP_TO_EDGE); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_T, x.CLAMP_TO_EDGE);
      x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, 1, 1, 0, x.RGBA, x.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, true);
      cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); C._glDead = true; cv.style.display = "none"; });
      L = C._gl = { cv: cv, x: x, u: { R: x.getUniformLocation(pr, "R"), T: x.getUniformLocation(pr, "T"), U0: x.getUniformLocation(pr, "U0"), U1: x.getUniformLocation(pr, "U1"), TX: x.getUniformLocation(pr, "TX") } };
      C.root.insertBefore(cv, C.cv);
      L.tex = function (src) { if (C._glDead) return; try { x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, x.RGBA, x.UNSIGNED_BYTE, src); } catch (e) { /* tainted or lost */ } };
      L.draw = function (t, u0, u1) {
        if (C._glDead) return false;
        x.viewport(0, 0, cv.width, cv.height);
        x.uniform2f(L.u.R, cv.width, cv.height); x.uniform1f(L.u.T, t);
        u0 = u0 || [0, 0, 0, 0]; u1 = u1 || [0, 0, 0, 0];
        x.uniform4f(L.u.U0, u0[0], u0[1], u0[2], u0[3]); x.uniform4f(L.u.U1, u1[0], u1[1], u1[2], u1[3]); x.uniform1i(L.u.TX, 0);
        x.drawArrays(x.TRIANGLES, 0, 3); return true;
      };
    }
    var sc = o.scale || (C.small ? 0.75 : 0.6), d = Math.min(window.devicePixelRatio || 1, 2) * sc;
    var w = Math.max(2, Math.round(C.W * d)), h = Math.max(2, Math.round(C.H * d));
    if (L.cv.width !== w || L.cv.height !== h) { L.cv.width = w; L.cv.height = h; }
    return L;
  }
  function glFree(C) {
    var L = C._gl; if (!L) return; C._gl = null;
    try { var e = L.x.getExtension("WEBGL_lose_context"); if (e) e.loseContext(); } catch (er) { /* ignore */ }
    L.cv.width = 1; L.cv.height = 1; if (L.cv.parentNode) L.cv.parentNode.removeChild(L.cv);
  }

  /* ---------------- sound ---------------- */
  var own = null, NB = null;
  function audioOn() {
    try { if (localStorage.getItem("tr_mute_v1") === "1") return false; var u = JSON.parse(localStorage.getItem("titan.uisound.v1") || "null"); if (u && u.on === false) return false; } catch (e) { /* ignore */ }
    return true;
  }
  function audio(C) {
    if (!audioOn() || /[?&]splashhold\b/.test(location.search)) return null;
    var ctx = null, out = null;
    try { var b = window.TitanGen && window.TitanGen.uiBus && window.TitanGen.uiBus(); if (b && b.ctx && b.input) { ctx = b.ctx; out = b.input; } } catch (e) { /* ignore */ }
    if (!ctx) {
      var ua = navigator.userActivation; if (ua && !ua.hasBeenActive) return null;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { if (!own) { own = new AC(); } } catch (e) { return null; }
      ctx = own; out = own.destination;
    }
    try { if (ctx.state === "suspended") ctx.resume(); } catch (e) { /* ignore */ }
    var m = ctx.createGain(); m.gain.value = 0.9; m.connect(out);
    if (!NB || NB.sampleRate !== ctx.sampleRate) {
      var n = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), s = 9871;
      for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
      NB = buf;
    }
    var t0 = ctx.currentTime + 0.03, A = { ctx: ctx, out: m, t0: t0, nodes: [] };
    function at(s) { return t0 + Math.max(0, s); }
    function env(gn, s, a, d, v, curve) {          // attack a, then exponential decay over d
      var g = gn.gain; g.setValueAtTime(0.0001, at(s)); g.linearRampToValueAtTime(v, at(s) + a); g.exponentialRampToValueAtTime(0.0001, at(s) + a + d);
    }
    A.tone = function (s, f, d, o) {
      o = o || {};
      var os = ctx.createOscillator(), gn = ctx.createGain(); os.type = o.type || "sine"; os.frequency.setValueAtTime(f, at(s));
      if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, at(s) + (o.glide || d));
      if (o.detune) os.detune.value = o.detune;
      env(gn, s, o.a || 0.005, d, o.v || 0.2);
      var last = gn;
      if (o.lp) { var f2 = ctx.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = o.lp; f2.Q.value = o.q || 0.7; gn.connect(f2); last = f2; }
      os.connect(gn); last.connect(o.dest || m); os.start(at(s)); os.stop(at(s) + (o.a || 0.005) + d + 0.05); A.nodes.push(os); return os;
    };
    A.noise = function (s, d, o) {
      o = o || {};
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
      src.buffer = NB; src.loop = true; f.type = o.type || "bandpass"; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f || 1200, at(s)); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at(s) + d);
      if (o.shape) { var g = gn.gain; g.setValueAtTime(0.0001, at(s)); o.shape.forEach(function (k) { g.linearRampToValueAtTime(Math.max(0.0001, k[1]), at(s) + k[0]); }); }
      else env(gn, s, o.a || 0.002, d, o.v || 0.2);
      src.connect(f); f.connect(gn); gn.connect(o.dest || m); src.start(at(s), Math.random() * 1.5); src.stop(at(s) + d + 0.1); A.nodes.push(src); return src;
    };
    A.bell = function (s, f, d, v, parts) {          // inharmonic partials: bowls, bells, chimes
      (parts || [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]]).forEach(function (p, i) { A.tone(s, f * p[0], d / (1 + i * 0.6), { v: v * p[1], a: 0.004 }); });
    };
    A.stop = function () {
      try { m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setValueAtTime(m.gain.value, ctx.currentTime); m.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12); } catch (e) { /* ignore */ }
      setTimeout(function () { A.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* done */ } }); try { m.disconnect(); } catch (e) { /* ignore */ } }, 180);
    };
    C._aud = A; return A;
  }

  /* ---------------- small shared drawing helpers ---------------- */
  function pixelText(text, px, font, color) {        // crisp 1-bit text for low-res pixel scenes (alpha thresholded)
    var c = K.mk(Math.ceil(px * text.length * 0.8) + 8, Math.ceil(px * 1.4)), g = c.getContext("2d");
    g.font = font.replace("%", px); g.textBaseline = "top"; g.fillStyle = "#fff"; g.fillText(text, 2, 1);
    var w = Math.ceil(g.measureText(text).width) + 4, d = g.getImageData(0, 0, c.width, c.height), p = d.data, cc = K.parse(color) || [255, 255, 255];
    for (var i = 0; i < p.length; i += 4) { var on = p[i + 3] > 110; p[i] = cc[0]; p[i + 1] = cc[1]; p[i + 2] = cc[2]; p[i + 3] = on ? 255 : 0; }
    g.putImageData(d, 0, 0); c.tw = w; return c;
  }

  function reg(id, st) {
    st.native = true;
    var d = st.dispose;
    st.dispose = function (C) { try { if (C._aud) C._aud.stop(); } catch (e) { /* ignore */ } C._aud = null; glFree(C); if (d) d(C); };
    S[id] = st;
  }
  window.TitanIntro = { reg: reg, gl: gl, audio: audio, pixelText: pixelText, K: K, ids: function () { return Object.keys(S).filter(function (k) { return S[k].native; }); } };
})();
