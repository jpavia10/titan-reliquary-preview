/* Neon Vault intro v3 (Grok, 2026-10-20): GPU. 1 a raymarched rain-soaked alley at 2 a.m., the sign dark, a sodium lamp
   buzzing; 2 close on the brick: each tube of "Reliquary" strikes with its own stutter, TITAN snaps on in pink, the VAULT OPEN tag
   blinks, the wall and the fog take the colour; 3 the camera pulls back and up over the wet street as the puddles mirror the
   sign through rain rings and steam, and the last 0.4 s washes to #0a0614 and clears so the live fx street shows through (wipe).
   HDR + bloom + ACES. The 2D scene below (OLD) is the Lite / no-GPU fallback.
   Older notes: (Grok, 2026-10-20). Night, rain, a wet street. The camera dollies in on a sign mounted at an angle on a brick
   wall: its glass tubes are dark, then the transformer kicks and each letter of "Reliquary" strikes with its own stutter, the
   block-letter TITAN above it buzzes on in hot pink, and a small VAULT OPEN tag starts its slow blink. The wall and the puddle
   take the sign's colour as it lights; the puddle mirrors it with ripples. Sound: rain, the transformer hum that grows with
   every lit tube, an electric tick at each flicker, a solid clunk when everything holds. Canvas 2D (cached tube layers). */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var SCRIPT = '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive';
  var WORD = "Reliquary";
  function tubes(text, font, size, color, track) {    // one canvas per letter: dark glass / lit tube with halo
    var g0 = K.mk(10, 10).getContext("2d"); g0.font = font.replace("%", size);
    var out = [], x = 0, pad = size * 0.6;
    text.split("").forEach(function (ch) {
      var w = g0.measureText(ch).width, cw = Math.ceil(w + pad * 2), ch2 = Math.ceil(size * 1.6 + pad * 2);
      function lay(lit) { var c = K.mk(cw, ch2), g = c.getContext("2d"); g.font = font.replace("%", size); g.textBaseline = "middle"; g.lineJoin = "round";
        if (lit) { g.shadowColor = color; g.shadowBlur = size * 0.45; g.strokeStyle = color; g.lineWidth = size * 0.11; g.strokeText(ch, pad, ch2 / 2); g.shadowBlur = size * 0.15; g.strokeText(ch, pad, ch2 / 2);
          g.shadowBlur = 0; g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = size * 0.035; g.strokeText(ch, pad, ch2 / 2); }
        else { g.strokeStyle = "rgba(150,150,170,.22)"; g.lineWidth = size * 0.09; g.strokeText(ch, pad, ch2 / 2); g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = size * 0.025; g.strokeText(ch, pad, ch2 / 2); }
        return c; }
      out.push({ x: x - pad, w: cw, h: ch2, off: lay(false), on: lay(true) }); x += w + (track || 0) * size;
    });
    out.total = x; return out;
  }
  function flickers(n, start, gap, rnd) {             // each tube's strike pattern: [t, on] pairs, deterministic
    var ev = [];
    for (var i = 0; i < n; i++) { var s = start + i * gap + rnd() * gap * 0.6, e = [[s, 1], [s + 0.04, 0], [s + 0.09, 1]];
      if (rnd() < 0.55) e.push([s + 0.15 + rnd() * 0.1, 0], [s + 0.28 + rnd() * 0.12, 1]);
      if (i === 5) e.push([s + 0.7, 0], [s + 0.78, 1], [s + 0.82, 0], [s + 1.0, 1]);   // one tube that struggles
      ev.push(e); }
    return ev;
  }
  function lit(e, t) { var v = 0; for (var i = 0; i < e.length; i++) { if (t >= e[i][0]) v = e[i][1]; else break; } return v; }
  function brick(W, H) {                               // wet, grimy brick: per-brick tone + speckle, mortar, water stains, a torn poster, a wet sheen
    var c = K.mk(W, H), g = c.getContext("2d"), bh = Math.max(14, H / 46), bw = bh * 2.4, r = K.rng(77), i;
    g.fillStyle = "#14101a"; g.fillRect(0, 0, W, H);
    for (var y = 0, row = 0; y < H; y += bh, row++) for (var x = -(row % 2) * bw / 2; x < W; x += bw) {
      var l = 14 + r() * 14; g.fillStyle = "rgb(" + (l + 10 | 0) + "," + (l * 0.55 | 0) + "," + (l * 0.7 | 0) + ")"; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
      g.fillStyle = "rgba(255,255,255,.035)"; g.fillRect(x + 1.5, y + 1.5, bw - 3, 1.5);
      for (i = 0; i < 6; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,.25)" : "rgba(255,230,220,.05)"; g.fillRect(x + r() * bw, y + r() * bh, 1 + r() * 2, 1 + r() * 2); } }
    for (i = 0; i < 18; i++) { var sx = r() * W, sw = 4 + r() * 22, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.3 + r() * 0.3, "rgba(0,0,0," + (0.2 + r() * 0.3) + ")"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(sx, 0, sw, H); }
    g.save(); g.translate(W * 0.16, H * 0.62); g.rotate(-0.05); g.fillStyle = "rgba(200,190,160,.18)"; g.fillRect(0, 0, W * 0.1, H * 0.16); g.fillStyle = "rgba(160,40,40,.2)"; g.fillRect(4, 6, W * 0.07, H * 0.03); g.restore();
    var sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0, "rgba(0,0,0,.35)"); sh.addColorStop(0.5, "rgba(120,140,170,.05)"); sh.addColorStop(1, "rgba(0,0,0,.45)"); g.fillStyle = sh; g.fillRect(0, 0, W, H);
    return c;
  }
  function fogTex(W, H) {                               // soft drifting haze, tileable enough to scroll
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(9);
    for (var i = 0; i < 40; i++) { var x = r() * W, y = r() * H, rad = (0.1 + r() * 0.25) * Math.max(W, H), gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255," + (0.05 + r() * 0.08) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    return c;
  }
  var OLD = {
    dur: 3.9, still: 3.6,
    init: function (C) {
      var W = C.W, H = C.H, M = Math.min(W, H), s1 = Math.min(W * (C.portrait ? 0.2 : 0.11), 120);
      C.wall = brick(Math.round(W * 1.2), Math.round(H * 0.8));
      C.word = tubes(WORD, "400 %px " + SCRIPT, s1, "#35e6ff", 0.02);
      C.titan = tubes("TITAN", "800 %px " + K.SANS, s1 * 0.5, "#ff3fa4", 0.25);
      C.tag = tubes("VAULT OPEN", "700 %px " + K.SANS, Math.max(12, s1 * 0.18), "#ffd23f", 0.12);
      var r = K.rng(4242); C.ev = flickers(WORD.length, 0.75, 0.11, r); C.evT = flickers(5, 1.9, 0.06, r);
      C.fog = fogTex(Math.round(W * 0.5), Math.round(H * 0.5)); C.bl = K.mk(Math.max(8, Math.round(W / 8)), Math.max(8, Math.round(H / 8))); C.blg = C.bl.getContext("2d");
      C.drops = []; for (var i = 0; i < (C.lite ? 70 : 150); i++) C.drops.push([r(), r(), 0.6 + r() * 0.8]);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i, horizon = H * (C.portrait ? 0.6 : 0.66);
      var dolly = K.eio(seg(t, 0, 3.9)), zs = K.lerp(0.82, 1.06, dolly);
      var nOn = 0; C.ev.forEach(function (e) { nOn += lit(e, t); }); var tOn = 0; C.evT.forEach(function (e) { tOn += lit(e, t); });
      var glow = (nOn / WORD.length) * 0.75 + (tOn / 5) * 0.25;
      function scene(mirror) {
        g.save();
        g.translate(W / 2, horizon * 0.5); g.scale(zs, zs);
        g.transform(1, -0.06, 0.0, 1, 0, 0);            // the sign hangs on an angled wall
        g.drawImage(C.wall, -C.wall.width / 2, -C.wall.height / 2 - horizon * 0.1);
        var gr = g.createRadialGradient(0, 0, 10, 0, 0, Math.max(W, H) * 0.6);
        gr.addColorStop(0, "rgba(53,230,255," + 0.45 * glow + ")"); gr.addColorStop(0.45, "rgba(255,63,164," + 0.2 * glow + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.fillRect(-W, -H, W * 2, H * 2);
        var w0 = C.word.total, x0 = -w0 / 2, s1 = C.word[0].h;
        // transformer box, conduit and cable to the sign
        g.fillStyle = "#2a2a30"; g.fillRect(w0 * 0.5 + s1 * 0.1, -s1 * 1.3, s1 * 0.5, s1 * 0.38); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(w0 * 0.5 + s1 * 0.1, -s1 * 1.3, s1 * 0.5, 2);
        g.fillStyle = "#ffd23f"; g.fillRect(w0 * 0.5 + s1 * 0.16, -s1 * 1.22, s1 * 0.08, s1 * 0.05);
        g.strokeStyle = "#0c0b10"; g.lineWidth = Math.max(2, s1 * 0.025); g.beginPath(); g.moveTo(w0 * 0.5 + s1 * 0.35, -s1 * 0.92); g.bezierCurveTo(w0 * 0.5 + s1 * 0.3, -s1 * 0.2, w0 * 0.3, s1 * 0.45, w0 * 0.25, s1 * 0.1); g.stroke();
        g.beginPath(); g.moveTo(w0 * 0.5 + s1 * 0.35, -s1 * 1.3); g.lineTo(w0 * 0.5 + s1 * 0.35, -H); g.lineWidth = Math.max(3, s1 * 0.04); g.stroke();
        // standoff clips behind every tube
        for (var m = 0; m < C.word.length; m++) { var mx = x0 + C.word[m].x + C.word[m].w / 2; g.fillStyle = "#3a3a44"; g.fillRect(mx - 2, s1 * 0.1, 4, 6); g.fillRect(mx - 2, -s1 * 0.16, 4, 6); g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(mx - 2, s1 * 0.1, 4, 1); }
        C.word.forEach(function (L, k) { var v = lit(C.ev[k], t); g.drawImage(L.off, x0 + L.x, -L.h / 2); if (v) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.85 + 0.15 * K.hash(Math.floor(t * 50) + k * 7); g.drawImage(L.on, x0 + L.x, -L.h / 2); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; } });
        var tw = C.titan.total, ty = -C.word[0].h * 0.55;
        C.titan.forEach(function (L, k) { var v = lit(C.evT[k], t); g.drawImage(L.off, -tw / 2 + L.x, ty - L.h / 2); if (v) { g.globalCompositeOperation = "lighter"; g.drawImage(L.on, -tw / 2 + L.x, ty - L.h / 2); g.globalCompositeOperation = "source-over"; } });
        var blink = t > 2.75 && (Math.floor((t - 2.75) * 1.6) % 2 === 0), gw = C.tag.total, gy = C.word[0].h * 0.42;
        C.tag.forEach(function (L) { g.drawImage(blink ? L.on : L.off, gw * 0.1 + L.x, gy - L.h / 2); });
        g.restore();
      }
      g.fillStyle = "#030208"; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.rect(0, 0, W, horizon); g.clip(); scene(false); g.restore();
      // the puddle: the scene mirrored about the horizon, in strips shifted by ripples, darkened
      g.save(); g.beginPath(); g.rect(0, horizon, W, H - horizon); g.clip();
      g.fillStyle = "#020106"; g.fillRect(0, horizon, W, H - horizon);
      var strips = C.lite ? 10 : 22, sh = (H - horizon) / strips;
      for (i = 0; i < strips; i++) { var y = horizon + i * sh, dx = Math.sin(t * 3 + i * 0.9) * (2 + i * 0.5);
        var d = C.dpr, sy = horizon - (i + 1) * sh;                 // copy the lit band above the horizon back onto itself, flipped (one blit per strip)
        g.setTransform(d, 0, 0, -d, dx * d, 2 * horizon * d); g.globalAlpha = 0.75 * (1 - i / strips * 0.75);
        g.drawImage(C.cv, 0, Math.max(0, sy * d), C.cv.width, sh * d, 0, sy, W, sh); g.setTransform(d, 0, 0, d, 0, 0); }
      g.globalAlpha = 1; var fg = g.createLinearGradient(0, horizon, 0, H); fg.addColorStop(0, "rgba(3,2,8,.05)"); fg.addColorStop(1, "rgba(3,2,8,.8)"); g.fillStyle = fg; g.fillRect(0, horizon, W, H - horizon);
      g.restore();
      // rain, lit by the sign
      g.strokeStyle = "rgba(170,230,255," + (0.12 + 0.25 * glow) + ")"; g.lineWidth = 1; g.beginPath();
      C.drops.forEach(function (d) { var y = ((d[1] + t * 1.4 * d[2]) % 1) * H, x = d[0] * W - y * 0.08; g.moveTo(x, y); g.lineTo(x - 2.5, y + 16 * d[2]); });
      g.stroke();
      // volumetric haze the neon scatters through (drifting, coloured by the sign), then bloom from a downsampled copy
      if (glow > 0) { g.save(); g.globalCompositeOperation = "lighter";
        var fx = (t * 18) % W; g.globalAlpha = 0.06 + 0.16 * glow; g.drawImage(C.fog, -fx, 0, W, H); g.drawImage(C.fog, W - fx, 0, W, H);
        var sy2 = horizon * 0.5, hz = g.createRadialGradient(W / 2, sy2, 0, W / 2, sy2, Math.max(W, H) * 0.7); hz.addColorStop(0, "rgba(53,230,255," + 0.1 * glow + ")"); hz.addColorStop(0.35, "rgba(255,63,164," + 0.05 * glow + ")"); hz.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = 1; g.fillStyle = hz; g.fillRect(0, 0, W, H);
        if (!C.lite) { C.blg.clearRect(0, 0, C.bl.width, C.bl.height); C.blg.drawImage(C.cv, 0, 0, C.bl.width, C.bl.height); g.globalAlpha = 0.2 * glow; g.imageSmoothingEnabled = true; g.drawImage(C.bl, 0, 0, W, H); g.globalAlpha = 0.12 * glow; g.drawImage(C.bl, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1); }
        // wet ground: the sign smeared vertically on the asphalt
        g.globalAlpha = 0.18 * glow; var st = g.createLinearGradient(0, horizon, 0, H); st.addColorStop(0, "rgba(53,230,255,.6)"); st.addColorStop(1, "rgba(53,230,255,0)"); g.fillStyle = st;
        for (var q = 0; q < 9; q++) { var qx = W * (0.2 + q * 0.075) + Math.sin(t * 2 + q) * 3; g.fillRect(qx, horizon, 2 + (q % 3) * 2, (H - horizon) * (0.5 + 0.4 * K.hash(q))); }
        g.restore(); }
      // a grade: the hum of light on the lens
      if (glow > 0) { g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(40,20,60," + 0.08 * glow + ")"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 3.9, { type: "highpass", f: 2500, q: 0.4, shape: [[0.3, 0.05], [3.5, 0.05], [3.9, 0.0001]] });   // rain
      A.noise(0, 3.9, { type: "lowpass", f: 500, q: 0.4, shape: [[0.3, 0.04], [3.9, 0.0001]] });
      var hum = A.ctx.createGain(); hum.gain.value = 0; hum.connect(A.out);
      var o = A.ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 60; var f = A.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 520; o.connect(f); f.connect(hum);
      o.start(A.t0); o.stop(A.t0 + 4); A.nodes.push(o);
      var all = C.ev.concat(C.evT), n = all.length;
      all.forEach(function (e) { e.forEach(function (p) { A.noise(p[0], 0.03, { type: "bandpass", f: p[1] ? 4200 : 1800, q: 2, v: p[1] ? 0.12 : 0.05 }); }); });
      for (var s = 0; s <= 3.9; s += 0.05) { var k = 0; all.forEach(function (e) { k += lit(e, s); }); hum.gain.setValueAtTime(0.0001 + 0.07 * k / n, A.t0 + s); }
      hum.gain.linearRampToValueAtTime(0.0001, A.t0 + 3.95);
      A.tone(0.7, 120, 3.1, { type: "square", v: 0.012, lp: 900, a: 0.4 }); A.noise(0.7, 0.25, { type: "highpass", f: 6000, v: 0.06 });
      A.tone(2.45, 90, 0.4, { type: "triangle", v: 0.25, to: 50 });   // the clunk when it all holds
    }
  };
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
  /* ---------- Neon Vault v3: three long moments on the GPU, ending on the live street ---------- */
  var NP = { street: [0, 1.7], strike: [1.7, 3.5], pull: [3.5, 5.2] }, FADE0 = 4.8, NDUR = 5.2;
  var NSC = [
    "uniform sampler2D TX;uniform vec2 R;uniform float T,f,lamp,master,wet;uniform vec3 ro,ta;uniform vec4 La,Lb,Lc,Ba,Bb;",
    "const vec3 CY=vec3(.2,.9,1.);const vec3 PK=vec3(1.,.22,.62);const vec3 YL=vec3(1.,.78,.2);const vec3 NA=vec3(1.,.55,.2);",
    "float litL(float u){float i=0.;i+=step(Ba.x,u)+step(Ba.y,u)+step(Ba.z,u)+step(Ba.w,u)+step(Bb.x,u)+step(Bb.y,u)+step(Bb.z,u)+step(Bb.w,u);",
    " if(i<.5)return La.x;if(i<1.5)return La.y;if(i<2.5)return La.z;if(i<3.5)return La.w;if(i<4.5)return Lb.x;if(i<5.5)return Lb.y;if(i<6.5)return Lb.z;if(i<7.5)return Lb.w;return Lc.x;}",
    "vec2 suv(vec3 p){return vec2((p.x+2.3)/4.6,(p.y-1.55)/2.3);}",
    /* sign emission at sign-uv q, blur by lod; mip chain gives the halo */
    "vec3 emit(vec2 q,float lod){if(q.x<0.||q.x>1.||q.y<0.||q.y>1.)return vec3(0);vec3 c=vec3(0);float ll=litL(q.x);",
    " for(int k=0;k<4;k++){float l=lod+float(k)*1.6;vec4 m=textureLod(TX,q,l);float w=k==0?1.:(.3/float(k));",
    "  c+=w*(m.r*CY*ll+m.g*PK*Lc.y*1.7+m.b*YL*Lc.z);}",
    " vec4 m0=textureLod(TX,q,lod);c=c*master*1.15+m0.r*vec3(.9)*ll*master*(lod<1.?1.:0.)+(m0.r+m0.g+m0.b)*vec3(.05,.05,.06)*(1.-master*.5);return c;}",
    "vec3 slight(){return (CY*(La.x+La.y+La.z+La.w+Lb.x+Lb.y+Lb.z+Lb.w+Lc.x)/9.+PK*Lc.y*.7+YL*Lc.z*.15)*master;}",
    "float brick(vec2 q,out float mo,out float id){float bh=.17,bw=.4;float row=floor(q.y/bh);float x=q.x/bw+.5*mod(row,2.);vec2 fq=fract(vec2(x,q.y/bh));",
    " mo=1.-smoothstep(.0,.06,min(min(fq.x,1.-fq.x)*bw,min(fq.y,1.-fq.y)*bh)/.02*.02*3.);id=h21(vec2(floor(x),row));return id;}",
    "vec3 wallAlb(vec2 q){float mo,id;brick(q,mo,id);vec3 b=mix(vec3(.2,.07,.055),vec3(.33,.13,.09),id)*(.6+.5*fbm(q*6.));b=mix(b,vec3(.07,.065,.06),mo);",
    " b*=1.-.55*smoothstep(.3,.8,fbm(vec2(q.x*3.,q.y*.4)));return b;}",
    "float ib(vec3 ro,vec3 rd,vec3 c,vec3 b,out vec3 n){vec3 m=1./rd,o=ro-c,k=abs(m)*b,t1=-m*o-k,t2=-m*o+k;float tn=max(max(t1.x,t1.y),t1.z),tf=min(min(t2.x,t2.y),t2.z);",
    " if(tn>tf||tf<0.)return 1e9;n=-sign(rd)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz);return tn;}",
    /* trace the alley: floor, two side walls, back wall, a dumpster */
    "float trace(vec3 o,vec3 d,out int id,out vec3 n){float t=1e9;id=0;float s;",
    " if(d.y<0.){s=-o.y/d.y;if(s>0.&&s<t){t=s;id=1;n=vec3(0,1,0);}}",
    " if(d.x<0.){s=(-2.8-o.x)/d.x;if(s>0.&&s<t){t=s;id=2;n=vec3(1,0,0);}}",
    " if(d.x>0.){s=(2.8-o.x)/d.x;if(s>0.&&s<t){t=s;id=2;n=vec3(-1,0,0);}}",
    " if(d.z<0.){s=(-8.-o.z)/d.z;if(s>0.&&s<t){t=s;id=3;n=vec3(0,0,1);}}",
    " vec3 bn;s=ib(o,d,vec3(2.15,.55,-4.6),vec3(.6,.55,1.),bn);if(s<t){t=s;id=4;n=bn;}",
    " if(t>1e8){id=0;t=60.;}return t;}",
    "vec3 lights(vec3 p,vec3 n){vec3 c=vec3(0);vec3 L=vec3(0,2.5,-7.7)-p;float d=length(L);c+=CY*max(dot(n,L/d),0.)*2.6/(1.+d*d*.25)*(La.x+La.y+La.z+La.w+Lb.x+Lb.y+Lb.z+Lb.w+Lc.x)/9.*master;",
    " L=vec3(0,3.45,-7.7)-p;d=length(L);c+=PK*max(dot(n,L/d),0.)*2.2/(1.+d*d*.25)*Lc.y*master;",
    " L=vec3(2.6,3.6,1.)-p;d=length(L);c+=NA*max(dot(n,L/d),0.)*2.2/(1.+d*d*.15)*lamp;",
    " return c+vec3(.02,.02,.03);}",
    "vec3 surf(vec3 o,vec3 d,float t,int id,vec3 n,float lod){vec3 p=o+d*t;",
    " if(id==3){vec3 a=wallAlb(p.xy);vec2 q=suv(p);return a*lights(p,n)+a*textureLod(TX,q,7.).rgb*0.+a*emit(q,6.)*.9+emit(q,lod);}",
    " if(id==2){vec3 a=wallAlb(vec2(p.z,p.y)+vec2(sign(p.x)*7.,0));float wetS=smoothstep(.9,0.,p.y)*.6;return a*(1.-wetS*.5)*lights(p,n);}",
    " if(id==4){vec3 a=vec3(.035,.05,.05)*(.6+.4*vn(p.xy*30.))*(1.-.5*fbm(p.zy*5.));return a*lights(p,n)*1.4+vec3(.6)*a*pow(max(n.y,0.),4.)*.2;}",
    " if(id==1){return vec3(.025,.024,.028)*(.6+.6*fbm(p.xz*3.))*lights(p,n);}",
    " return vec3(.004,.004,.008);}",
    "void main(){vec2 s=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);vec3 w=normalize(ta-ro),u=normalize(cross(w,vec3(0,1,0))),v=cross(u,w);vec3 rd=normalize(s.x*u+s.y*v+f*w);",
    " int id;vec3 n;float t=trace(ro,rd,id,n);vec3 p=ro+rd*t;vec3 col=surf(ro,rd,t,id,n,0.);",
    " if(id==1){",                                                                                              /* the wet street: puddles + rain rings, mirror the sign */
    "  float pd=smoothstep(.48,.6,fbm(p.xz*.55+3.))*wet;vec2 g=p.xz*4.;vec2 ci=floor(g);vec2 rp=vec2(0);",
    "  for(int j=0;j<4;j++){vec2 c2=ci+vec2(j%2,j/2);float ph=fract(T*1.7+h21(c2));vec2 dd=g-c2-vec2(h21(c2+.3),h21(c2+.7));float rr=length(dd);rp+=dd/(rr+1e-3)*sin((rr-ph*.9)*40.)*exp(-rr*6.)*(1.-ph)*.5;}",
    "  vec3 nn=normalize(vec3(rp.x*.12+(vn(p.xz*9.)-.5)*.25*(1.-pd),1.,rp.y*.12+(vn(p.xz*9.+5.)-.5)*.6*(1.-pd)));",
    "  vec3 r=reflect(rd,nn);int id2;vec3 n2;float t2=trace(p+nn*.002,r,id2,n2);float rough=mix(3.2,.4,pd);",
    "  vec3 rc=surf(p,r,t2,id2,n2,rough);if(id2==3){vec3 q=p+r*t2;rc+=emit(suv(q)+vec2(0.,(vn(p.xz*vec2(2.,40.))-.5)*.08*(1.-pd)),rough+1.5)*.6;}",
    "  float fr=mix(.04,1.,pow(1.-max(dot(nn,-rd),0.),5.));col=col*(1.-pd*.8)+rc*mix(.25,.95,pd)*mix(fr,1.,.35);}",
    /* height fog with in-scatter from the tubes and the lamp */
    " float fogd=1.-exp(-t*.045);vec3 fc=vec3(.01,.008,.018);",
    " vec3 Lp=vec3(0,2.7,-7.6);vec3 w2=Lp-ro;float al=clamp(dot(w2,rd),0.,t);float dd=length(w2-rd*al);vec3 isc=slight()*.35/(1.+dd*dd*1.2);",
    " w2=vec3(2.6,3.6,1.)-ro;al=clamp(dot(w2,rd),0.,t);dd=length(w2-rd*al);isc+=NA*lamp*.4/(1.+dd*dd*3.);",
    " col=mix(col,fc,fogd)+isc*(.6+.5*fbm(vec2(rd.x*6.+T*.15,rd.y*5.)));",
    " vec3 sp=vec3(1.1,0.,-3.3);float stm=0.;for(int i=0;i<10;i++){float tt=mix(.5,min(t,14.),float(i)/9.);vec3 q=ro+rd*tt;vec2 dx=q.xz-sp.xz;float y=q.y;",   /* manhole steam */
    "  stm+=fbm(vec2(q.x*1.6+sin(y*1.4-T)*.4,y*1.2-T*.9))*exp(-dot(dx,dx)/(.12+.18*y))*smoothstep(3.,0.,y)*.06;}",
    " col+=stm*(slight()*.7+NA*lamp*.3+vec3(.03));",
    /* rain: three depth layers of streaks, lit by the sign */
    " vec3 rl=slight()*.6+NA*lamp*.35+vec3(.05);float rn=0.;for(int i=0;i<3;i++){float sc=10.+float(i)*14.;vec2 q=s*vec2(sc*1.6,sc*.1)+vec2(s.y*sc*.05,T*(5.+float(i)*2.));",
    "  vec2 c=floor(q);vec2 fq=fract(q);float hh=h21(c+float(i)*17.);rn+=step(.9,hh)*smoothstep(.03,0.,abs(fq.x-.5-(hh-.5)*.6)*.45)*smoothstep(0.,.3,fq.y)*smoothstep(1.,.6,fq.y)*(.5-float(i)*.13);}",
    " col+=rl*rn*.2;o=vec4(col,1.);}"
  ].join("\n");
  function signTex(C) {                                         // R: "Reliquary" script tubes, G: TITAN block tubes, B: VAULT OPEN tag
    var w = 2048, h = 1024, c = K.mk(w, h), g = c.getContext("2d"), bx = [];
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.lineJoin = "round"; g.lineCap = "round";
    var fs = 300; g.font = "400 " + fs + "px " + SCRIPT; var tw = g.measureText(WORD).width; if (tw > w * 0.9) { fs *= w * 0.9 / tw; g.font = "400 " + fs + "px " + SCRIPT; tw = g.measureText(WORD).width; }
    var x0 = (w - tw) / 2, y0 = h * 0.6; g.textBaseline = "middle"; g.strokeStyle = "rgb(255,0,0)"; g.lineWidth = fs * 0.06; g.globalCompositeOperation = "lighter";
    var x = x0; for (var i = 0; i < WORD.length; i++) { var cw = g.measureText(WORD[i]).width; g.strokeText(WORD[i], x, y0); x += cw; if (i < WORD.length - 1) bx.push(x / w); }
    var f2 = fs * 0.5; g.font = "800 " + f2 + "px " + K.SANS; if ("letterSpacing" in g) g.letterSpacing = f2 * 0.25 + "px"; var t2 = g.measureText("TITAN").width;
    g.strokeStyle = "rgb(0,255,0)"; g.lineWidth = f2 * 0.11; g.strokeText("TITAN", (w - t2) / 2, h * 0.2);
    var f3 = fs * 0.15; g.font = "700 " + f3 + "px " + K.SANS; if ("letterSpacing" in g) g.letterSpacing = f3 * 0.15 + "px"; var t3 = g.measureText("VAULT OPEN").width;
    g.strokeStyle = "rgb(0,0,255)"; g.lineWidth = f3 * 0.1; g.strokeText("VAULT OPEN", w - t3 - w * 0.08, h * 0.9); g.strokeRect(w - t3 - w * 0.08 - f3 * 0.4, h * 0.9 - f3 * 0.8, t3 + f3 * 0.6, f3 * 1.6);
    while (bx.length < 8) bx.push(2);
    return { c: c, bx: bx };
  }
  function nsetup(C) {
    var G = GPU(C, C.W * C.H > 2.2e6 ? 0.75 : 1); if (!G) return null; var Po = Post(G); if (!Po) return null; var Sc = G.prog(NSC); if (!Sc) return null;
    var S = signTex(C), tx = G.tex(S.c), X = G.x; X.texParameteri(X.TEXTURE_2D, X.TEXTURE_WRAP_S, X.CLAMP_TO_EDGE); X.texParameteri(X.TEXTURE_2D, X.TEXTURE_WRAP_T, X.CLAMP_TO_EDGE); X.bindTexture(X.TEXTURE_2D, null);
    var r = K.rng(4242); return { G: G, Po: Po, Sc: Sc, tx: { t: tx }, bx: S.bx, ev: flickers(WORD.length, 1.95, 0.12, r), evT: flickers(1, 2.95, 0.1, r)[0] };
  }
  function cam(t, port) {
    var e, ro, ta;
    if (t < NP.street[1]) { e = K.eio(K.seg(t, 0, NP.street[1])); ro = [0.35 - 0.15 * e, 0.4 + 0.15 * e, 7.5 - 3.5 * e]; ta = [0, 1.9, -8]; }
    else if (t < NP.strike[1]) { e = K.eio(K.seg(t, NP.strike[0], NP.strike[1])); ro = [0.9 - 0.7 * e, 2.3 + 0.25 * e, -3.0 - 1.4 * e]; ta = [0, 2.65, -8]; }
    else { e = K.eio(K.seg(t, NP.pull[0], NDUR)); ro = [0.2 - 0.2 * e, 0.5 + 1.2 * e, -2.5 + 7.5 * e]; ta = [0, 2.3 - 0.3 * e, -8]; }
    if (port) { ro[2] += t < NP.street[1] ? 1.5 : t < NP.strike[1] ? 1.6 : 1.2; }
    return { ro: ro, ta: ta };
  }
  I.reg("neon", {
    dur: NDUR, still: 4.6, wipe: true,
    init: function (C) { C.N = C.lite ? null : nsetup(C); if (!C.N) { OLD.init(C); C.old = true; } C.revealed = false; },
    draw: function (C, t) {
      if (C.old || C._glDead) { if (!C.old) { OLD.init(C); C.old = true; } OLD.draw(C, Math.min(t * 3.9 / NDUR, 3.9)); var k0 = K.seg(t, FADE0, NDUR); C.cv.style.opacity = 1 - k0; if (k0 > 0 && !C.revealed) { C.revealed = true; C.reveal(); } return; }
      var N = C.N, G = N.G, g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      var L = []; for (i = 0; i < WORD.length; i++) L.push(lit(N.ev[i], t)); if (t > 3.6) L[5] = (Math.sin(t * 23) > 0.93 && t < 4.4) ? 0 : 1;
      if (t > 1.15 && t < 1.25) L[0] = 1;                                 // a tube tries early, then dies
      var titan = lit(N.evT, t), tag = t > 3.25 ? (((t - 3.25) % 0.9) < 0.55 ? 1 : 0) : 0, master = t < 1.1 ? 0 : 1;
      var c = cam(t, H > W), lamp = 0.55 + 0.45 * (Math.sin(t * 40) > -0.6 || t > 1.0 ? 1 : 0.2);
      G.run(N.Sc, { TX: N.tx, R: [G.W, G.H], T: t, f: H > W ? 1.25 : 1.55, lamp: lamp, master: master, wet: 1, ro: c.ro, ta: c.ta,
        La: [L[0], L[1], L[2], L[3]], Lb: [L[4], L[5], L[6], L[7]], Lc: [L[8], titan, tag, 0], Ba: N.bx.slice(0, 4), Bb: N.bx.slice(4, 8) }, N.Po.hdr);
      var fl = 0; for (i = 0; i < 9; i++) { var e0 = N.ev[i][0][0]; if (t > e0 && t < e0 + 0.06) fl = 0.12; }
      N.Po.out({ bloom: 0.7 + fl, haze: 0, T: t, expo: 1.15 * K.seg(t, 0, 0.4) });
      // the last 0.4 s: wash to #0a0614, then clear to transparent so the live fx street shows through
      var k = seg(t, FADE0, NDUR); g.clearRect(0, 0, W, H);
      if (k > 0) { if (!C.revealed) { C.revealed = true; C.reveal(); } G.cv.style.opacity = String(1 - K.eio(k)); g.fillStyle = "rgba(10,6,20," + (Math.min(1, k * 2.5) * (1 - k)) + ")"; g.fillRect(0, 0, W, H); }
      else G.cv.style.opacity = "1";
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, NDUR, { type: "highpass", f: 1800, shape: [[0.3, 0.09], [4.8, 0.09], [NDUR, 0.0001]] });            // rain
      A.noise(0, NDUR, { type: "lowpass", f: 500, shape: [[0.3, 0.05], [4.8, 0.05], [NDUR, 0.0001]] });
      A.tone(0.4, 34, 1.4, { to: 26, v: 0.18 }); A.noise(0.4, 1.4, { type: "lowpass", f: 260, to: 60, v: 0.12 });      // distant thunder
      A.tone(1.1, 70, 0.3, { type: "triangle", v: 0.2, to: 40 }); A.noise(1.1, 0.05, { type: "bandpass", f: 3000, v: 0.2 });   // the breaker throws
      A.tone(1.9, 120, 3.1, { type: "sawtooth", v: 0.035, lp: 480 }); A.tone(1.9, 60, 3.1, { type: "square", v: 0.02, lp: 220 });   // transformer hum
      var N = C.N; if (N) N.ev.forEach(function (e) { e.forEach(function (p) { if (p[1]) A.noise(p[0], 0.04, { type: "bandpass", f: 2600 + K.hash(p[0] * 9) * 2000, v: 0.12 }); }); });
      A.noise(2.95, 0.05, { type: "bandpass", f: 1800, v: 0.18 }); A.tone(3.1, 90, 0.4, { type: "triangle", v: 0.22, to: 50 });   // TITAN, the clunk when it holds
    }
  });
})();
