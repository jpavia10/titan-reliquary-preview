/* Paper Hills intro (Grok, 2026-10-20). Overhead to side, a craft knife at work. A blank cream sheet; the blade tip enters
   and draws a hill line across it in one confident stroke, the cut line glowing; the sheet lifts away and the camera pivots
   to a low side view as layer after layer of cut paper stands up into hills with drop shadows, back to front, colours
   deepening with distance. A paper moon rises; the last layer cut is the name. Sound: the blade scoring paper, paper lifts
   and flaps, a kalimba lullaby. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var COL = ["#f4c9a8", "#e9a48a", "#c97a7a", "#8f5878", "#4f3a63", "#2b2440"];
  function hill(x, k, W) { var u = x / W; return Math.sin(u * (3 + k * 0.7) + k * 1.9) * 0.04 + Math.sin(u * (9 + k) + k) * 0.015; }
  I.reg("papercut", {
    dur: 4.4, still: 4.1,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, x, k;
      var cut = K.eio(seg(t, 0.15, 1.2)), lift = K.eio(seg(t, 1.25, 1.75));
      var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#fbe8d2"); sky.addColorStop(1, "#f6d3b5"); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // moon rising
      var my = H * K.lerp(0.5, 0.2, K.eo3(seg(t, 1.6, 3.6))); g.fillStyle = "#fff6e2"; g.shadowColor = "rgba(120,60,40,.25)"; g.shadowBlur = 10; g.beginPath(); g.arc(W * 0.7, my, Math.min(W, H) * 0.08, 0, K.PI2); g.fill(); g.shadowBlur = 0;
      // standing layers (back to front)
      for (k = 0; k < COL.length; k++) { var e = K.eob(seg(t, 1.5 + k * 0.17, 1.95 + k * 0.17), 1.4); if (e <= 0) continue;
        var base = H * (0.42 + k * 0.09), rise = (1 - e) * H * 0.4;
        g.save(); g.shadowColor = "rgba(60,20,30,.35)"; g.shadowBlur = 14; g.shadowOffsetY = -4; g.fillStyle = COL[k]; g.beginPath(); g.moveTo(0, H);
        for (x = 0; x <= W; x += 6) g.lineTo(x, base + rise + hill(x, k, W) * H); g.lineTo(W, H); g.closePath(); g.fill(); g.restore();
      }
      var tl = seg(t, 2.6, 3.1); if (tl > 0) { var fs = Math.min(W * 0.1, 56); g.save(); g.globalAlpha = tl; g.font = "800 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = "#1a1530"; g.fillText("TITAN RELIQUARY", W / 2 + 2, H * 0.86 + 3); g.fillStyle = "#f6d3b5"; g.fillText("TITAN RELIQUARY", W / 2, H * 0.86 - 5 * (1 - tl)); g.restore(); }
      // the flat sheet being cut (overhead), lifting away
      if (lift < 1) { g.save(); g.globalAlpha = 1 - lift; g.translate(W / 2, H / 2 - lift * H * 0.6); g.rotate(-lift * 0.25); g.translate(-W / 2, -H / 2);
        g.fillStyle = "#f7efe3"; g.fillRect(0, 0, W, H); g.strokeStyle = "rgba(180,150,120,.15)"; for (x = 0; x < W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        var cx = W * cut; g.strokeStyle = "#5a3a2a"; g.lineWidth = 1.4; g.beginPath(); for (x = 0; x <= cx; x += 4) { var yy = H * 0.55 + hill(x, 2, W) * H * 2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
        var ky = H * 0.55 + hill(cx, 2, W) * H * 2; g.fillStyle = "rgba(255,180,80,.6)"; g.beginPath(); g.arc(cx, ky, 4, 0, K.PI2); g.fill();
        if (cut < 1) { g.save(); g.translate(cx, ky); g.rotate(-0.7); g.fillStyle = "#c9ced6"; g.beginPath(); g.moveTo(0, 0); g.lineTo(14, -40); g.lineTo(24, -36); g.closePath(); g.fill(); g.fillStyle = "#e0a530"; g.fillRect(12, -110, 14, 74); g.restore(); }
        g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.15, 1.05, { type: "bandpass", f: 3200, to: 4200, q: 4, shape: [[0.2, 0.08], [1.0, 0.07], [1.05, 0.0001]] });
      A.noise(1.25, 0.4, { type: "lowpass", f: 1200, to: 400, v: 0.12 });
      for (var k = 0; k < 6; k++) A.noise(1.6 + k * 0.17, 0.07, { type: "bandpass", f: 700, q: 1, v: 0.18 });
      [523.25, 659.25, 783.99, 659.25, 880, 783.99, 1046.5].forEach(function (f, i) { A.bell(1.7 + i * 0.28, f, 1.0, 0.05, [[1, 1], [5.4, 0.15]]); });
    }
  });
})();
