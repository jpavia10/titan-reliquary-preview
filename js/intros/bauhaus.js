/* Bauhaus intro (Grok, 2026-10-20). A poster composes itself on a strict grid, the way a Dessau print would be laid up: a red
   circle rolls in and stops dead on a grid line, a blue square drops and squashes, a yellow triangle pivots on its corner into
   place, black bars slide in as rules, and then the name is set in heavy geometric type, letter by letter snapping onto the
   baseline. Every move is a hard ease with a small overshoot; nothing floats. Sound: wood blocks and a felt kick on each landing,
   a short marimba figure as the type sets. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  I.reg("bauhaus", {
    dur: 3.9, still: 3.6,
    init: function (C) { var W = C.W, H = C.H; C.u = Math.min(W / 6, H / 10); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, u = C.u, seg = K.seg, ox = (W - u * 6) / 2, oy = (H - u * 10) / 2;
      g.fillStyle = "#f2efe6"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(17,17,17," + 0.08 * K.sm(seg(t, 0, 0.3)) + ")"; g.lineWidth = 1; g.beginPath();
      for (var i = 0; i <= 6; i++) { g.moveTo(ox + i * u, 0); g.lineTo(ox + i * u, H); } for (i = 0; i <= 10; i++) { g.moveTo(0, oy + i * u); g.lineTo(W, oy + i * u); } g.stroke();
      // red circle rolls in from the left, stops on column 4
      var c = K.eob(seg(t, 0.25, 0.85), 1.1), cr = u * 1.6, cx = K.lerp(-cr, ox + u * 4, c), cy = oy + u * 2.6;
      g.save(); g.translate(cx, cy); g.rotate(c * 6); g.fillStyle = "#c32a17"; g.beginPath(); g.arc(0, 0, cr, 0, K.PI2); g.fill(); g.fillStyle = "#f2efe6"; g.fillRect(-2, -cr, 4, cr * 0.25); g.restore();
      // blue square drops onto row 6 and squashes
      var b = seg(t, 0.75, 1.25), by = K.lerp(-u * 3, oy + u * 4.2, K.ei2(Math.min(1, b * 1.25))), sq = b > 0.8 ? Math.sin((b - 0.8) / 0.2 * Math.PI) * 0.18 : 0;
      g.fillStyle = "#1d4ea1"; var s = u * 2.2; g.fillRect(ox + u * 0.5 - s * sq / 2, by + s * sq, s * (1 + sq), s * (1 - sq));
      // yellow triangle pivots on its corner into place
      var tr = K.eob(seg(t, 1.2, 1.75), 1.4); g.save(); g.translate(ox + u * 5.6, oy + u * 6.4); g.rotate((1 - tr) * -Math.PI / 2);
      g.fillStyle = "#f2c230"; g.beginPath(); g.moveTo(0, 0); g.lineTo(-u * 2.8, 0); g.lineTo(-u * 1.4, -u * 2.4); g.closePath(); g.fill(); g.restore();
      // black rules slide in
      var r1 = K.eo3(seg(t, 1.6, 1.95)), r2 = K.eo3(seg(t, 1.75, 2.1));
      g.fillStyle = "#111"; g.fillRect(ox - u * 0.5, oy + u * 6.6, (u * 7) * r1, u * 0.22); g.fillRect(ox + u * 6.3 - u * 6.8 * r2, oy + u * 9.3, u * 6.8 * r2, u * 0.12);
      g.save(); g.translate(ox + u * 0.25, oy + u * 1.0); g.rotate(-Math.PI / 2); g.fillRect(-u * 3.6 * K.eo3(seg(t, 1.9, 2.2)), -u * 0.06, u * 3.6 * K.eo3(seg(t, 1.9, 2.2)), u * 0.12); g.restore();
      // the type: each letter drops onto the baseline and snaps
      var lines = ["TITAN", "RELIQUARY"], fs = [u * 1.3, u * 0.78];
      g.textBaseline = "alphabetic"; g.textAlign = "left";
      var k = 0;
      lines.forEach(function (ln, li) { g.font = "900 " + fs[li] + "px " + K.GEO; var x = ox + u * 0.0, base = oy + u * (li ? 8.95 : 8.05);
        for (var j = 0; j < ln.length; j++, k++) { var a = seg(t, 2.1 + k * 0.06, 2.3 + k * 0.06); if (a > 0) { var y = base - (1 - K.eob(a, 2.2)) * u * 0.7;
          g.fillStyle = li === 0 && j === 0 ? "#c32a17" : "#111"; g.fillText(ln[j], x, y); } x += g.measureText(ln[j]).width + fs[li] * 0.02; } });
      var cap = seg(t, 3.2, 3.5); if (cap > 0) { g.globalAlpha = cap; g.fillStyle = "#111"; g.font = "500 " + u * 0.2 + "px " + K.GEO; g.fillText("AUSSTELLUNG \u00b7 DIE SAMMLUNG \u00b7 2026", ox, oy + u * 9.75); g.globalAlpha = 1; }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      function block(s, f) { A.tone(s, f, 0.09, { v: 0.2, a: 0.001 }); A.noise(s, 0.02, { type: "bandpass", f: f * 3, q: 4, v: 0.1 }); }
      A.tone(0.85, 90, 0.2, { v: 0.35, to: 50 }); block(0.85, 620);
      A.tone(1.25, 70, 0.25, { v: 0.4, to: 40 }); block(1.25, 440);
      block(1.75, 880); block(1.95, 740); block(2.1, 990); block(2.2, 1180);
      [523.25, 659.25, 783.99, 659.25, 523.25, 392, 523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 783.99].forEach(function (f, i) { A.tone(2.3 + i * 0.06, f, 0.25, { v: 0.06 }); A.tone(2.3 + i * 0.06, f * 4, 0.05, { v: 0.015 }); });   // marimba
    }
  });
})();
