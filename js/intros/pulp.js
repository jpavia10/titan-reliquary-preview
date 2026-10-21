/* Pulp Adventure intro (Grok, 2026-10-20). A comic page assembles itself: three panels slam down one after another, each
   tilted, each with a hard camera punch-in: a biplane banking past a searchlit idol, a fist throwing a "KRAKK!", a hand
   snatching a relic. The last panel tears outward into a full-bleed splash with the name as a pulp masthead on a halftone
   sunburst. Sound: paper slaps, a swish, a punch, a brass stab. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function dots(g, x, y, w, h, col, s) { g.fillStyle = col; for (var yy = 0; yy < h; yy += s) for (var xx = (yy / s) % 2 ? s / 2 : 0; xx < w; xx += s) { g.beginPath(); g.arc(x + xx, y + yy, s * 0.28, 0, K.PI2); g.fill(); } }
  function burst(g, cx, cy, R, n, a, b, rot) { for (var i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, rot + i / n * K.PI2, rot + (i + 1) / n * K.PI2); g.fill(); } }
  function word(g, s, x, y, fs, rot, fill) { g.save(); g.translate(x, y); g.rotate(rot); g.font = "900 " + fs + "px " + K.HEAVY; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = fs * 0.22; g.strokeStyle = "#111"; g.strokeText(s, 0, 0); g.fillStyle = fill; g.fillText(s, 0, 0); g.restore(); }
  var P = [
    { t: 0.15, r: [0.06, 0.06, 0.88, 0.27], a: -0.03 }, { t: 0.75, r: [0.06, 0.36, 0.5, 0.3], a: 0.025 }, { t: 1.3, r: [0.6, 0.36, 0.34, 0.3], a: -0.04 }];
  function scene(g, k, x, y, w, h, tt) {
    if (k === 0) { var sk = g.createLinearGradient(0, y, 0, y + h); sk.addColorStop(0, "#f2a33a"); sk.addColorStop(1, "#c4312a"); g.fillStyle = sk; g.fillRect(x, y, w, h);
      g.fillStyle = "#3a1a2a"; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.35, y + h * 0.35); g.lineTo(x + w * 0.5, y + h * 0.45); g.lineTo(x + w * 0.6, y + h * 0.2); g.lineTo(x + w, y + h); g.fill();
      g.fillStyle = "#111"; var px = x + w * (0.1 + tt * 0.5), py = y + h * 0.4; g.save(); g.translate(px, py); g.rotate(-0.2); g.fillRect(-26, -3, 52, 6); g.fillRect(-20, -12, 40, 4); g.fillRect(-8, -2, 34, 10); g.restore();
      word(g, "VRRROOM!", x + w * 0.62, y + h * 0.78, Math.min(h * 0.2, w * 0.1), -0.1, "#fff04a"); }
    else if (k === 1) { burst(g, x + w * 0.5, y + h * 0.5, w, 18, "#ffd23a", "#ff7a1a", tt); dots(g, x, y, w, h, "rgba(140,30,0,.25)", 7);
      g.fillStyle = "#e9b48a"; g.strokeStyle = "#111"; g.lineWidth = 3; var fx = x + w * (0.2 + tt * 0.25); g.beginPath(); g.roundRect ? g.roundRect(fx - 30, y + h * 0.45, 60, 46, 10) : g.rect(fx - 30, y + h * 0.45, 60, 46); g.fill(); g.stroke();
      word(g, "KRAKK!", x + w * 0.55, y + h * 0.3, Math.min(h * 0.26, w * 0.2), 0.15, "#ff2e3a"); }
    else { g.fillStyle = "#1a2f5a"; g.fillRect(x, y, w, h); dots(g, x, y, w, h, "rgba(90,160,255,.3)", 6);
      var gy = y + h * 0.55; g.fillStyle = "#f3c43a"; g.strokeStyle = "#111"; g.lineWidth = 3; g.beginPath(); g.arc(x + w * 0.5, gy, w * 0.18, 0, K.PI2); g.fill(); g.stroke();
      g.fillStyle = "#e9b48a"; g.beginPath(); g.rect(x + w * 0.5 - 10, y + h * (0.05 + 0.25 * (1 - tt)), 20, h * 0.3); g.fill(); g.stroke(); word(g, "GOT IT!", x + w * 0.5, y + h * 0.88, h * 0.13, -0.05, "#fff"); }
  }
  I.reg("pulp", {
    dur: 4.3, still: 4.0,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      g.fillStyle = "#efe3c4"; g.fillRect(0, 0, W, H); dots(g, 0, 0, W, H, "rgba(160,120,60,.12)", 9);
      var spl = K.eio(seg(t, 2.0, 2.5));
      g.save(); var zx = 1 + Math.max(0, 0.06 - (t % 0.6) * 0.2) * (t < 1.9 ? 1 : 0); g.translate(W / 2, H / 2); g.scale(zx, zx); g.translate(-W / 2, -H / 2);
      P.forEach(function (p, k) { var e = seg(t, p.t, p.t + 0.22); if (e <= 0) return; var x = p.r[0] * W, y = p.r[1] * H, w = p.r[2] * W, h = p.r[3] * H, s = 1 + (1 - K.eob(e, 1.6)) * 0.6;
        g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(p.a * (1 - spl)); g.scale(s, s); g.translate(-x - w / 2, -y - h / 2);
        g.fillStyle = "#111"; g.fillRect(x - 5 + 6, y - 5 + 7, w + 10, h + 10); g.fillStyle = "#111"; g.fillRect(x - 5, y - 5, w + 10, h + 10);
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); scene(g, k, x, y, w, h, seg(t, p.t, p.t + 1.6)); g.restore(); g.restore(); });
      g.restore();
      // splash: a final panel tears up from the bottom, full bleed
      if (spl > 0) { var top = K.lerp(H * 1.02, 0, spl); g.save(); g.beginPath(); g.moveTo(0, H); g.lineTo(0, top + 20);
        for (var x = 0; x <= W; x += 18) g.lineTo(x, top + (K.hash(x) * 26)); g.lineTo(W, H); g.closePath(); g.clip();
        burst(g, W / 2, H * 0.48, Math.max(W, H), 28, "#c4312a", "#e8562e", t * 0.15); dots(g, 0, 0, W, H, "rgba(255,200,60,.22)", 8);
        var fs = Math.min(W * 0.16, 96), m = K.eob(seg(t, 2.45, 2.8), 2);
        g.save(); g.translate(W / 2, H * 0.46); g.scale(m, m); g.font = "400 " + fs * 0.28 + "px " + K.HEAVY; g.textAlign = "center"; g.fillStyle = "#fff04a"; g.fillText("THRILLING TALES OF", 0, -fs * 0.95); g.restore();
        word(g, "TITAN", W / 2, H * 0.46, fs * m, -0.06, "#ffe14a"); word(g, "RELIQUARY", W / 2, H * 0.46 + fs * 0.95 * m, fs * 0.55 * m, -0.06, "#fff");
        g.save(); g.globalAlpha = seg(t, 2.9, 3.3); g.fillStyle = "#111"; g.fillRect(W * 0.06, H * 0.86, 90, 26); g.fillStyle = "#fff04a"; g.font = "800 12px " + K.SANS; g.textAlign = "left"; g.fillText("10\u00a2  No. 34", W * 0.06 + 10, H * 0.86 + 17); g.restore(); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      [0.15, 0.75, 1.3].forEach(function (s) { A.noise(s + 0.18, 0.08, { type: "lowpass", f: 1800, v: 0.35 }); A.tone(s + 0.18, 90, 0.12, { to: 50, v: 0.12 }); });
      A.noise(0.2, 0.6, { type: "bandpass", f: 600, to: 2400, q: 2, v: 0.08 });
      A.noise(0.95, 0.12, { type: "lowpass", f: 900, v: 0.5 }); A.tone(0.95, 120, 0.2, { to: 40, v: 0.2 });
      A.noise(2.0, 0.4, { type: "highpass", f: 1500, to: 600, v: 0.18 });
      [[2.45, [233.08, 293.66, 349.23, 466.16]], [2.8, [261.63, 329.63, 392, 523.25]]].forEach(function (c) { c[1].forEach(function (f) { A.tone(c[0], f, c[0] > 2.6 ? 1.2 : 0.25, { type: "sawtooth", v: 0.035, lp: 2600, a: 0.01 }); }); });
    }
  });
})();
