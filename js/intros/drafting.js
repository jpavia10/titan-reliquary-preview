/* Drafting Room intro (Grok, 2026-10-20). The coin is drawn as a working drawing on blueprint film, in the order a draughtsman
   would: centre lines, a compass (you see its legs turn) swings the outline, a projection carries it across to a side elevation,
   dimensions with arrowheads and figures go on, then the title block is lettered. The sheet sits a few degrees off square and
   drifts under the lamp. Sound: the pencil's scratch follows each stroke, the compass point clicks in, a ruler is laid down. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var INK = "rgba(236,244,255,", GOLD = "#ffd27a";
  function line(g, x1, y1, x2, y2, p) { if (p <= 0) return; g.beginPath(); g.moveTo(x1, y1); g.lineTo(K.lerp(x1, x2, p), K.lerp(y1, y2, p)); g.stroke(); }
  function arrow(g, x, y, ang, s) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang - 0.3) * s, y - Math.sin(ang - 0.3) * s); g.lineTo(x - Math.cos(ang + 0.3) * s, y - Math.sin(ang + 0.3) * s); g.closePath(); g.fill(); }
  var STROKES = [[0.35, 0.95], [0.5, 1.1], [1.05, 1.95], [1.9, 2.4], [2.35, 2.95], [2.9, 3.6]];   // when the pencil moves (for the sound)
  I.reg("drafting", {
    dur: 4.1, still: 3.8,
    init: function (C) { var M = Math.min(C.W, C.H); C.R = Math.min(C.W * 0.27, C.H * 0.17); C.cx = C.W * (C.portrait ? 0.4 : 0.38); C.cy = C.H * (C.portrait ? 0.36 : 0.42); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, R = C.R, cx = C.cx, cy = C.cy, i;
      g.fillStyle = "#0c2a50"; g.fillRect(0, 0, W, H);
      var lamp = g.createRadialGradient(W * 0.45, H * 0.35, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.8); lamp.addColorStop(0, "rgba(120,170,230,.22)"); lamp.addColorStop(1, "rgba(0,0,0,.35)"); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      g.save(); var dr = K.eio(seg(t, 0, 4.1)); g.translate(W / 2, H / 2); g.rotate(-0.035 + 0.012 * dr); g.scale(1.04 - 0.03 * dr, 1.04 - 0.03 * dr); g.translate(-W / 2, -H / 2);
      // grid
      var ga = K.sm(seg(t, 0, 0.4)) * 0.12, gs = Math.max(16, W / 22); g.strokeStyle = INK + ga + ")"; g.lineWidth = 0.6; g.beginPath();
      for (var x = 0; x < W * 1.1; x += gs) { g.moveTo(x, -20); g.lineTo(x, H + 20); } for (var y = 0; y < H * 1.1; y += gs) { g.moveTo(-20, y); g.lineTo(W + 20, y); } g.stroke();
      // centre lines (dash-dot), drawn from the edges inward
      g.strokeStyle = INK + "0.55)"; g.lineWidth = 0.9; g.setLineDash([14, 4, 2, 4]);
      line(g, cx - R * 1.35, cy, cx + R * 1.35, cy, K.eo3(seg(t, 0.35, 0.8))); line(g, cx, cy - R * 1.35, cx, cy + R * 1.35, K.eo3(seg(t, 0.5, 0.95))); g.setLineDash([]);
      // the compass: legs from a pivot above the centre, pencil leg sweeping the outline
      var ca = seg(t, 1.05, 1.9), ang = -Math.PI / 2 + ca * K.PI2;
      g.strokeStyle = INK + "0.95)"; g.lineWidth = 2; if (ca > 0) { g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, ang); g.stroke(); }
      g.lineWidth = 1; g.strokeStyle = INK + "0.5)"; if (ca > 0.999) { g.beginPath(); g.arc(cx, cy, R * 0.86, 0, K.PI2); g.stroke(); }   // the rim
      var cv = seg(t, 0.95, 1.05) * (1 - seg(t, 1.9, 2.1));
      if (cv > 0) { var px = cx + Math.cos(ang) * R, py = cy + Math.sin(ang) * R, hx = (cx + px) / 2, hy = (cy + py) / 2 - R * 0.9;
        g.save(); g.globalAlpha = cv; g.strokeStyle = "#cfd9e6"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(hx, hy); g.lineTo(px, py); g.stroke();
        g.fillStyle = "#e9eef5"; g.beginPath(); g.arc(hx, hy, 5, 0, K.PI2); g.fill(); g.fillRect(hx - 2, hy - 18, 4, 14); g.restore(); }
      // projection to the side elevation (the edge view, thickness)
      var ex = cx + R * 1.9, th = R * 0.16;
      g.strokeStyle = INK + "0.3)"; g.lineWidth = 0.7; g.setLineDash([3, 4]);
      line(g, cx + 2, cy - R, ex + th, cy - R, K.eo3(seg(t, 1.9, 2.2))); line(g, cx + 2, cy + R, ex + th, cy + R, K.eo3(seg(t, 1.95, 2.25))); g.setLineDash([]);
      g.strokeStyle = INK + "0.95)"; g.lineWidth = 1.8; var ep = K.eo3(seg(t, 2.1, 2.4));
      if (ep > 0) { g.strokeRect(ex, cy - R * ep, th, R * 2 * ep); g.lineWidth = 0.8; line(g, ex + th * 0.2, cy - R * ep, ex + th * 0.2, cy + R * ep, 1); line(g, ex + th * 0.8, cy - R * ep, ex + th * 0.8, cy + R * ep, 1); }
      // dimensions
      g.fillStyle = INK + "0.95)"; g.strokeStyle = INK + "0.85)"; g.lineWidth = 0.9;
      var d1 = K.eo3(seg(t, 2.35, 2.7)), dy = cy + R * 1.3;
      if (d1 > 0) { line(g, cx - R, cy + R * 0.2, cx - R, dy + 6, d1); line(g, cx + R, cy + R * 0.2, cx + R, dy + 6, d1); line(g, cx - R, dy, cx + R, dy, d1);
        if (d1 > 0.95) { arrow(g, cx - R, dy, Math.PI, 8); arrow(g, cx + R, dy, 0, 8); g.font = "600 " + Math.max(11, R * 0.16) + "px " + K.MONO; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText("\u00d8 38.10", cx, dy - 3); } }
      var d2 = K.eo3(seg(t, 2.6, 2.95)), ty2 = cy - R - R * 0.3;
      if (d2 > 0) { line(g, ex, cy - R - 4, ex, ty2 - 6, d2); line(g, ex + th, cy - R - 4, ex + th, ty2 - 6, d2); line(g, ex - 24, ty2, ex + th + 24, ty2, d2);
        if (d2 > 0.95) { arrow(g, ex, ty2, 0, 7); arrow(g, ex + th, ty2, Math.PI, 7); g.font = "600 " + Math.max(10, R * 0.13) + "px " + K.MONO; g.textAlign = "left"; g.textBaseline = "bottom"; g.fillText("2.50", ex + th + 6, ty2 - 3); } }
      // the title block, lettered stroke by stroke (characters appear in order)
      var tb = seg(t, 2.85, 3.0);
      if (tb > 0) {
        var bw = Math.min(W * 0.8, 380), bh = Math.max(76, bw * 0.28), bx = W - bw - W * 0.07, by = H - bh - H * (C.portrait ? 0.1 : 0.08);
        g.strokeStyle = INK + (0.9 * tb) + ")"; g.lineWidth = 1.6; g.strokeRect(bx, by, bw, bh); g.lineWidth = 0.8; line(g, bx, by + bh * 0.6, bx + bw, by + bh * 0.6, tb); line(g, bx + bw * 0.55, by + bh * 0.6, bx + bw * 0.55, by + bh, tb);
        var T1 = "TITAN RELIQUARY", T2 = "SCALE 2:1", T3 = "SHEET 1 OF 1", n = seg(t, 3.0, 3.6);
        g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = GOLD; g.font = "700 " + Math.round(bh * 0.3) + "px " + K.GEO;
        g.fillText(T1.slice(0, Math.ceil(n * T1.length)), bx + 12, by + bh * 0.31);
        g.fillStyle = INK + "0.85)"; g.font = "600 " + Math.round(bh * 0.15) + "px " + K.MONO;
        if (n > 0.5) { g.fillText(T2.slice(0, Math.ceil((n - 0.5) * 2 * T2.length)), bx + 12, by + bh * 0.8); g.fillText(T3.slice(0, Math.ceil((n - 0.5) * 2 * T3.length)), bx + bw * 0.55 + 12, by + bh * 0.8); }
      }
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      STROKES.forEach(function (s, i) { var d = s[1] - s[0]; A.noise(s[0], d, { type: "bandpass", f: 3600 + i * 300, q: 1.8, shape: [[0.04, 0.07], [d * 0.5, 0.09], [d, 0.0001]] }); });
      A.noise(1.0, 0.02, { type: "highpass", f: 3000, v: 0.2 }); A.tone(1.0, 2200, 0.05, { v: 0.05 });           // compass point in
      A.noise(1.88, 0.08, { type: "lowpass", f: 600, v: 0.18 }); A.tone(1.88, 160, 0.1, { v: 0.1 });               // ruler down
      for (var k = 0; k < 15; k++) A.noise(3.0 + k * 0.04, 0.025, { type: "bandpass", f: 4200, q: 2.5, v: 0.06 }); // lettering ticks
    }
  });
})();
