/* Clay Diorama intro (Grok, 2026-10-20). Stop-motion, shot on twos: the clock is stepped to 12 frames a second and every frame
   the clay "boils" a little (outlines jitter, as hand-moved plasticine does). On a little turntable stage, lumps of clay plop
   down and are pushed into a tiny museum (steps, columns, a pediment), a clay sun bobs up behind it on a wire, and a clay
   sign pops up out of the ground with the name pressed into it, thumbprints and all. The miniature is shot with a tilt-shift
   look (top and bottom of the frame blurred). Sound: wet clay plops and squelches on each beat, a pocket-music-box tune. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function blob(g, x, y, w, h, col, f, seed) {         // a clay lump: a wobbly rounded rect, re-jittered every frame
    var r = K.rng(seed * 131 + f * 7), n = 18; g.fillStyle = "rgba(70,40,25,.22)"; g.beginPath(); g.ellipse(x + w * 0.08, y + h * 0.5, w * 0.55, Math.max(3, h * 0.12), 0, 0, K.PI2); g.fill(); g.fillStyle = col; g.beginPath();
    for (var i = 0; i <= n; i++) { var a = i / n * K.PI2, rx = w / 2 * (1 + (r() - 0.5) * 0.06), ry = h / 2 * (1 + (r() - 0.5) * 0.06), c = Math.cos(a), s = Math.sin(a);
      var px = x + Math.sign(c) * Math.pow(Math.abs(c), 0.45) * rx, py = y + Math.sign(s) * Math.pow(Math.abs(s), 0.45) * ry; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.ellipse(x - w * 0.2, y - h * 0.25, w * 0.18, h * 0.12, -0.3, 0, K.PI2); g.fill();
    g.fillStyle = "rgba(0,0,0,.08)"; g.beginPath(); g.arc(x + w * (r() - 0.5) * 0.5, y + h * (r() - 0.5) * 0.4, Math.min(w, h) * 0.08, 0, K.PI2); g.fill();   // a thumbprint
  }
  var BEATS = [0.3, 0.55, 0.8, 1.05, 1.3, 1.55, 1.8, 2.1, 2.5, 2.9];
  I.reg("diorama", {
    dur: 4.2, still: 3.9,
    init: function (C) { C.u = Math.min(C.W / 8, C.H / 12); },
    draw: function (C, t0) {
      var t = Math.floor(t0 * 12) / 12, f = Math.floor(t0 * 12), g = C.g, W = C.W, H = C.H, u = C.u, seg = K.seg, cx = W / 2, by = H * 0.6;
      var bgd = g.createLinearGradient(0, 0, 0, H); bgd.addColorStop(0, "#9cc3d5"); bgd.addColorStop(0.7, "#e9dccb"); g.fillStyle = bgd; g.fillRect(0, 0, W, H);
      g.fillStyle = "#e6d9c9"; g.beginPath(); g.ellipse(cx, by + u * 0.9, u * 4.2, u * 1.1, 0, 0, K.PI2); g.fill();                  // the turntable
      g.fillStyle = "#d8c6b2"; g.fillRect(cx - u * 4.2, by + u * 0.9, u * 8.4, u * 0.4); g.beginPath(); g.ellipse(cx, by + u * 1.3, u * 4.2, u * 1.1, 0, 0, Math.PI); g.fill();
      function pop(k) { var a = seg(t, BEATS[k], BEATS[k] + 0.25); return a <= 0 ? 0 : K.eob(a, 2.6); }
      // the clay sun on its wire
      var sn = pop(8); if (sn > 0) { var sy = by - u * 3 - u * 2.2 * sn; g.strokeStyle = "#8a7a6a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx + u * 2.6, by); g.lineTo(cx + u * 2.6, sy); g.stroke(); blob(g, cx + u * 2.6, sy, u * 1.2, u * 1.2, "#e8a13a", f, 9); }
      // the museum: steps, columns, pediment
      var p0 = pop(0); if (p0) blob(g, cx, by + u * 0.25, u * 5.6 * p0, u * 0.6, "#9a7458", f, 1);
      var p1 = pop(1); if (p1) blob(g, cx, by - u * 0.2, u * 4.8 * p1, u * 0.5, "#b48a66", f, 2);
      for (var k = 0; k < 4; k++) { var pc = pop(2 + Math.min(k, 3)); if (pc) blob(g, cx - u * 1.8 + k * u * 1.2, by - u * 0.45 - u * 1.2 * pc, u * 0.6, u * 2.4 * pc, "#e8cfae", f, 3 + k); }
      var pp = pop(6); if (pp) { g.save(); g.translate(cx, by - u * 3.1 - (1 - pp) * u); g.fillStyle = "#c25a2c"; var rr = K.rng(f * 3); g.beginPath(); g.moveTo(-u * 2.7 * pp, u * 0.3); g.lineTo(u * 2.7 * pp, u * 0.3); g.lineTo(0 + (rr() - 0.5) * 3, -u * 1.0 * pp); g.closePath(); g.fill(); g.restore(); }
      // the sign pops out of the ground, name pressed in
      var ps = pop(9);
      if (ps) { var sw = Math.min(W * 0.84, u * 7.4), sh2 = u * 1.5, sx = cx, sy2 = by + u * 2.9 - (ps - 1) * u * 0.2;
        g.save(); g.translate(sx, sy2); g.scale(1, ps); blob(g, 0, 0, sw, sh2, "#a9481f", f, 20);
        var fs = Math.min(sh2 * 0.48, sw / 10.5); g.font = "800 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = "rgba(60,20,8,.6)"; g.fillText("TITAN RELIQUARY", 1, 2); g.fillStyle = "#f6dfc8"; g.fillText("TITAN RELIQUARY", 0, 0); g.restore(); }
      // tilt-shift: blur the top and bottom bands (copy the frame through a blur filter, masked by gradients)
      if (!C.lite && g.filter !== undefined) {
        g.save(); g.filter = "blur(4px)"; g.globalAlpha = 0.85;
        g.beginPath(); g.rect(0, 0, W, H * 0.22); g.rect(0, H * 0.86, W, H * 0.14); g.clip(); g.drawImage(C.cv, 0, 0, C.cv.width, C.cv.height, 0, 0, W, H); g.restore(); }
      var vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,40,30,.25)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      BEATS.forEach(function (s, i) { A.tone(s, 180 - i * 6, 0.12, { v: 0.22, to: 90 }); A.noise(s, 0.08, { type: "lowpass", f: 900, to: 250, v: 0.16 }); });   // plop + squelch
      [784, 988, 1175, 988, 784, 659, 784, 988, 1319, 1175, 988].forEach(function (f, i) { A.bell(1.0 + i * 0.25, f, 0.6, 0.035, [[1, 1], [3.0, 0.15]]); });   // music box
    }
  });
})();
