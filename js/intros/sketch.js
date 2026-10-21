/* Sketchbook intro (Grok, 2026-10-20). Over-the-shoulder at a desk. A graphite pencil drops into frame and draws, fast and
   loose: construction circles, a box in two-point perspective, then a reliquary casket emerges from the guide lines; every
   line boils (redrawn with jitter at 8 fps like hand animation). Hatching floods the shadow side in quick strokes, a thumb
   smudge passes, and the name is lettered underneath, then underlined twice. Sound: pencil scratch per stroke, paper rustle,
   the tap of the pencil set down. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function S(cx, cy, s) { var L = [], a, i;
    for (a = 0; a < 2; a++) { var c = []; for (i = 0; i <= 24; i++) c.push([cx + Math.cos(i / 24 * K.PI2) * s * (0.9 + a * 0.15), cy - s * 0.2 + Math.sin(i / 24 * K.PI2) * s * (0.9 + a * 0.15)]); L.push({ p: c, w: 0.5, guide: 1 }); }
    var b = [[-1, 0], [0, 0.45], [1, 0], [0, -0.45]].map(function (q) { return [cx + q[0] * s, cy + q[1] * s * 0.7 - s * 0.35]; });
    L.push({ p: [b[0], b[1], b[2], b[3], b[0]], w: 1.4 });
    L.push({ p: [b[0], [b[0][0], b[0][1] + s * 0.8], [b[1][0], b[1][1] + s * 0.8], [b[2][0], b[2][1] + s * 0.8], b[2]], w: 1.4 });
    L.push({ p: [b[1], [b[1][0], b[1][1] + s * 0.8]], w: 1.2 });
    L.push({ p: [b[3], [cx, cy - s * 1.25], b[1]], w: 1.2 }); L.push({ p: [b[0], [cx, cy - s * 1.25], b[2]], w: 1.2 });
    L.push({ p: [[cx, cy - s * 1.25], [cx, cy - s * 1.6]], w: 1.2 }); L.push({ p: [[cx - s * 0.18, cy - s * 1.45], [cx + s * 0.18, cy - s * 1.45]], w: 1.2 });
    return L; }
  function jl(g, p, f, seed, n) { g.beginPath(); var r = K.rng(seed * 97 + f * 13); for (var i = 0; i < n; i++) { var x = p[i][0] + (r() - 0.5) * 2.2, y = p[i][1] + (r() - 0.5) * 2.2; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  I.reg("sketch", {
    dur: 4.4, still: 4.1,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i, f = Math.floor(t * 8);
      g.fillStyle = "#f4efe4"; g.fillRect(0, 0, W, H); var r0 = K.rng(3); g.fillStyle = "rgba(120,100,70,.05)"; for (i = 0; i < 400; i++) g.fillRect(r0() * W, r0() * H, 1, 1);
      g.strokeStyle = "rgba(90,140,200,.25)"; g.lineWidth = 1; for (var y = 40; y < H; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      var s = Math.min(W, H) * 0.22, cx = W / 2, cy = H * 0.42, L = S(cx, cy, s), tip = null;
      g.lineCap = "round"; g.lineJoin = "round";
      L.forEach(function (l, k) { var e = seg(t, 0.15 + k * 0.17, 0.32 + k * 0.17); if (e <= 0) return; var n = Math.max(2, Math.ceil(l.p.length * e));
        var p = l.p.slice(0, n); if (e < 1) { var a = l.p[n - 2], b = l.p[n - 1], fr = l.p.length * e - (n - 1); p[n - 1] = [K.lerp(a[0], b[0], fr + 1), K.lerp(a[1], b[1], fr + 1)]; tip = p[n - 1]; }
        g.strokeStyle = l.guide ? "rgba(60,60,70," + (0.3 * (1 - seg(t, 2.8, 3.4) * 0.6)) + ")" : "rgba(40,40,48,.88)"; g.lineWidth = l.w; jl(g, p, f, k, p.length); });
      // hatching on the shadow face
      var hh = seg(t, 1.9, 2.7); if (hh > 0) { g.save(); g.beginPath(); g.moveTo(cx, cy - s * 0.035); g.lineTo(cx + s, cy - s * 0.35); g.lineTo(cx + s, cy + s * 0.45); g.lineTo(cx, cy + s * 0.765); g.closePath(); g.clip(); g.strokeStyle = "rgba(40,40,48,.55)"; g.lineWidth = 0.9;
        var n = Math.floor(28 * hh), rr = K.rng(f + 1); for (i = 0; i < n; i++) { var x0 = cx + i * s / 26; g.beginPath(); g.moveTo(x0 + (rr() - 0.5) * 2, cy + s * 0.8); g.lineTo(x0 + s * 0.5 + (rr() - 0.5) * 2, cy - s * 0.6); g.stroke(); } g.restore(); if (hh < 1) tip = [cx + s * hh, cy + s * 0.2]; }
      // ground shadow smudge
      var sm = seg(t, 2.6, 3.0); if (sm > 0) { g.fillStyle = "rgba(60,60,70," + 0.12 * sm + ")"; g.beginPath(); g.ellipse(cx + s * 0.3, cy + s * 0.8, s * 1.2, s * 0.18, 0, 0, K.PI2); g.fill(); }
      // lettering
      var fs = Math.min(W * 0.12, 60), le = seg(t, 2.9, 3.6), str = "TITAN RELIQUARY"; if (le > 0) { g.font = "400 " + fs + "px 'Caveat','Segoe Print','Bradley Hand',cursive"; g.textAlign = "left"; g.textBaseline = "middle";
        var full = g.measureText(str).width, x0 = W / 2 - full / 2, nch = Math.ceil(str.length * le), part = str.slice(0, nch); g.fillStyle = "#2a2a32"; g.save(); g.translate(Math.sin(f) * 0.4, 0); g.fillText(part, x0, H * 0.74); g.restore();
        if (le < 1) tip = [x0 + g.measureText(part).width, H * 0.74 + fs * 0.2];
        var u1 = seg(t, 3.6, 3.8), u2 = seg(t, 3.8, 3.95); g.strokeStyle = "#2a2a32"; g.lineWidth = 1.6;
        if (u1 > 0) { g.beginPath(); g.moveTo(x0, H * 0.74 + fs * 0.5); g.lineTo(x0 + full * u1, H * 0.74 + fs * 0.46); g.stroke(); tip = u1 < 1 ? [x0 + full * u1, H * 0.74 + fs * 0.46] : tip; }
        if (u2 > 0) { g.beginPath(); g.moveTo(x0 + 8, H * 0.74 + fs * 0.62); g.lineTo(x0 + 8 + (full - 16) * u2, H * 0.74 + fs * 0.6); g.stroke(); if (u2 < 1) tip = [x0 + 8 + (full - 16) * u2, H * 0.74 + fs * 0.6]; } }
      // the pencil
      var pr = t > 3.95 ? K.eio(seg(t, 3.95, 4.3)) : 0; if (!tip) tip = [cx - s * 1.2, cy - s * 1.4]; var px = K.lerp(tip[0], W * 0.88, pr), py = K.lerp(tip[1], H * 0.92, pr);
      g.save(); g.translate(px, py); g.rotate(-0.55); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(6, -170, 14, 170); g.fillStyle = "#e8c07a"; g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -22); g.lineTo(6, -22); g.fill(); g.fillStyle = "#333"; g.beginPath(); g.moveTo(0, 0); g.lineTo(-2, -6); g.lineTo(2, -6); g.fill();
      g.fillStyle = "#3a7a4a"; g.fillRect(-6, -170, 12, 148); g.fillStyle = "#c9c9c9"; g.fillRect(-6, -186, 12, 16); g.fillStyle = "#e88a9a"; g.fillRect(-6, -198, 12, 12); g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      for (var k = 0; k < 11; k++) A.noise(0.15 + k * 0.17, 0.16, { type: "bandpass", f: 3600 + (k % 3) * 500, q: 2.5, v: 0.07 });
      for (k = 0; k < 14; k++) A.noise(1.9 + k * 0.055, 0.04, { type: "bandpass", f: 4200, q: 3, v: 0.06 });
      A.noise(2.6, 0.35, { type: "lowpass", f: 900, v: 0.05 });
      for (k = 0; k < 15; k++) A.noise(2.9 + k * 0.045, 0.035, { type: "bandpass", f: 3800, q: 2, v: 0.05 });
      A.noise(3.6, 0.2, { type: "bandpass", f: 3000, q: 2, v: 0.08 }); A.noise(3.8, 0.15, { type: "bandpass", f: 3200, q: 2, v: 0.08 });
      A.tone(4.25, 1200, 0.05, { type: "triangle", v: 0.06 }); A.noise(4.25, 0.03, { type: "highpass", f: 2000, v: 0.12 });
    }
  });
})();
