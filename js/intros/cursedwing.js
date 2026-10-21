/* The Cursed Wing intro (Grok, 2026-10-20). Pitch dark, wind under a door. A candle is carried in from the left, its small warm
   pool of light swaying with the hand; it passes along a crypt wall and the carved inscription only exists where the light
   falls (the cuts throw shadows away from the flame as it moves, so the letters read as real relief). It stops at the name;
   then the heavy door beside it shifts open a crack and cold light spills across the floor. Sound: wind moaning, the candle's
   soft flutter, footsteps, the long creak of the door. Canvas 2D: the wall is cached; the relief is two offset passes per frame. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function wall(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(13), bh = Math.max(28, H / 16), bw = bh * 2.2;
    g.fillStyle = "#2a2320"; g.fillRect(0, 0, W, H);
    for (var y = 0, row = 0; y < H; y += bh, row++) for (var x = -(row % 2) * bw / 2; x < W; x += bw) { var l = 38 + r() * 18; g.fillStyle = "rgb(" + (l | 0) + "," + (l * 0.88 | 0) + "," + (l * 0.82 | 0) + ")"; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
    for (var i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.04)"; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    return c;
  }
  I.reg("cursedwing", {
    dur: 4.5, still: 3.6,
    init: function (C) { C.wall = wall(Math.round(C.W), Math.round(C.H)); C.fs = Math.min(C.W * (C.portrait ? 0.12 : 0.07), 72); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, fs = C.fs;
      // the candle's path: in from the left, to the name, a sway from the hand
      var w = K.eio(seg(t, 0.2, 2.6)), cx = K.lerp(-W * 0.1, W * 0.46, w) + Math.sin(t * 2.2) * 6, cy = H * 0.5 + Math.sin(t * 3.1) * 4 + Math.sin(w * Math.PI * 4) * 5;
      var fl = 0.9 + 0.06 * Math.sin(t * 27) + 0.04 * Math.sin(t * 41 + 2), R = Math.min(W, H) * 0.8 * fl;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      g.save(); var lg = g.createRadialGradient(cx, cy, 0, cx, cy, R); lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(0.45, "rgba(0,0,0,.25)"); lg.addColorStop(1, "rgba(0,0,0,1)");
      g.drawImage(C.wall, 0, 0, W, H);
      // the inscription in relief: a shadow pass offset away from the flame, then a lit lip toward it
      var ty = H * 0.42, lines = C.portrait ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"];
      g.font = "600 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
      lines.forEach(function (ln, li) { var y = ty + li * fs * 1.15, dx = W / 2 - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy) + 1, ox = dx / d * 3, oy = dy / d * 3;
        g.fillStyle = "rgba(0,0,0,.75)"; g.fillText(ln, W / 2 + ox, y + oy); g.fillStyle = "#4a3e36"; g.fillText(ln, W / 2, y); g.fillStyle = "rgba(255,205,150,.55)"; g.fillText(ln, W / 2 - ox * 0.5, y - oy * 0.5); });
      g.font = "italic 400 " + fs * 0.3 + "px " + K.SERIF; g.fillStyle = "#6a5a4e"; g.fillText("here rest the coins, and what they remember", W / 2, ty + (lines.length) * fs * 1.15 + fs * 0.2);
      // the door, opening a crack at the right
      var dop = K.eo3(seg(t, 3.0, 4.0)), dx0 = W * 0.82;
      g.fillStyle = "#120c09"; g.fillRect(dx0, H * 0.16, W * 0.3, H * 0.84);
      if (dop > 0) { g.fillStyle = "rgba(170,190,230," + 0.8 * dop + ")"; g.fillRect(dx0 - 2, H * 0.16, 3 + dop * 14, H * 0.84);
        g.save(); g.globalCompositeOperation = "lighter"; var sp = g.createLinearGradient(dx0, 0, dx0 - W * 0.6, 0); sp.addColorStop(0, "rgba(120,140,190," + 0.35 * dop + ")"); sp.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = sp; g.beginPath(); g.moveTo(dx0, H * 0.16); g.lineTo(dx0 + 10 * dop, H); g.lineTo(dx0 - W * 0.7, H); g.closePath(); g.fill(); g.restore(); }
      // darkness everywhere but the candle's pool (and the door spill)
      g.fillStyle = lg; g.fillRect(0, 0, W, H); g.restore();
      g.save(); g.globalCompositeOperation = "lighter"; var warm = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.8); warm.addColorStop(0, "rgba(255,150,60,.18)"); warm.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = warm; g.fillRect(0, 0, W, H);
      if (dop > 0) { g.fillStyle = "rgba(150,170,220," + 0.25 * dop + ")"; g.fillRect(dx0 - 2, H * 0.16, 3 + dop * 14, H * 0.84); } g.restore();
      // the candle itself
      g.fillStyle = "#e9dcc0"; g.fillRect(cx - 5, cy + 6, 10, 28); g.fillStyle = "#6a5a40"; g.fillRect(cx - 12, cy + 32, 24, 4);
      g.fillStyle = "rgba(255,200,90,.95)"; g.beginPath(); g.ellipse(cx + Math.sin(t * 9) * 1.5, cy - 2, 3.5, 9 * fl, Math.sin(t * 7) * 0.1, 0, K.PI2); g.fill();
      g.fillStyle = "#fff8e0"; g.beginPath(); g.ellipse(cx, cy + 1, 1.5, 4, 0, 0, K.PI2); g.fill();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 4.5, { type: "bandpass", f: 400, to: 700, q: 8, shape: [[0.5, 0.08], [2.0, 0.14], [3.0, 0.07], [4.5, 0.0001]] });   // wind moan
      A.noise(0, 4.5, { type: "bandpass", f: 900, to: 500, q: 10, shape: [[1.0, 0.04], [2.5, 0.08], [4.5, 0.0001]] });
      [0.4, 0.95, 1.5, 2.05, 2.55].forEach(function (s, i) { A.noise(s, 0.09, { type: "lowpass", f: 300, v: 0.2 }); A.tone(s, 70, 0.1, { v: 0.12 }); });   // footsteps on stone
      A.noise(0.2, 3.0, { type: "lowpass", f: 120, q: 0.5, shape: [[0.3, 0.05], [3.0, 0.0001]] });                       // candle flutter
      var o = A.tone(3.0, 180, 1.0, { type: "sawtooth", v: 0.07, to: 120, glide: 1.0, lp: 1400, q: 8, a: 0.1 }); if (o) { try { var lfo = A.ctx.createOscillator(), lg = A.ctx.createGain(); lfo.frequency.value = 23; lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency); lfo.start(A.t0 + 3.0); lfo.stop(A.t0 + 4.1); A.nodes.push(lfo); } catch (e) {} }   // the creak
    }
  });
})();
