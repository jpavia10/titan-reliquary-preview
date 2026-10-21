/* Neon Vault intro (Grok, 2026-10-20). Night, rain, a wet street. The camera dollies in on a sign mounted at an angle on a brick
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
  function brick(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), bh = Math.max(14, H / 46), bw = bh * 2.4, r = K.rng(77);
    g.fillStyle = "#08060d"; g.fillRect(0, 0, W, H);
    for (var y = 0, row = 0; y < H; y += bh, row++) for (var x = -(row % 2) * bw / 2; x < W; x += bw) {
      var l = 9 + r() * 8; g.fillStyle = "rgb(" + (l + 6 | 0) + "," + (l * 0.6 | 0) + "," + (l + 10 | 0) + ")"; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3); }
    return c;
  }
  I.reg("neon", {
    dur: 3.9, still: 3.6,
    init: function (C) {
      var W = C.W, H = C.H, M = Math.min(W, H), s1 = Math.min(W * (C.portrait ? 0.2 : 0.11), 120);
      C.wall = brick(Math.round(W * 1.2), Math.round(H * 0.8));
      C.word = tubes(WORD, "400 %px " + SCRIPT, s1, "#35e6ff", 0.02);
      C.titan = tubes("TITAN", "800 %px " + K.SANS, s1 * 0.5, "#ff3fa4", 0.25);
      C.tag = tubes("VAULT OPEN", "700 %px " + K.SANS, Math.max(12, s1 * 0.18), "#ffd23f", 0.12);
      var r = K.rng(4242); C.ev = flickers(WORD.length, 0.75, 0.11, r); C.evT = flickers(5, 1.9, 0.06, r);
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
        var w0 = C.word.total, x0 = -w0 / 2;
        C.word.forEach(function (L, k) { var v = lit(C.ev[k], t); g.drawImage(L.off, x0 + L.x, -L.h / 2); if (v) { g.globalCompositeOperation = "lighter"; g.drawImage(L.on, x0 + L.x, -L.h / 2); g.globalCompositeOperation = "source-over"; } });
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
      A.tone(2.45, 90, 0.4, { type: "triangle", v: 0.25, to: 50 });   // the clunk when it all holds
    }
  });
})();
