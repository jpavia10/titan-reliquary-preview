/* Silk Road intro (Grok, 2026-10-20). Dusk over the dunes, a long lens. A caravan walks into frame along the crest, camels in
   silhouette against a huge low sun, the heat shimmering the horizon; the camera tracks with them in parallax (far ridges slow,
   near sand fast), and the name is revealed in the gold of the sky behind them as they pass, as if the caravan were uncovering
   it. Stars prick out at the top as the sun touches the sand. Sound: camel bells swinging with each step, wind across sand, a
   long low oud-like drone and a short phrase on it. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function camel(g, x, y, s, ph, rider) {            // a walking camel silhouette, legs swinging with phase ph
    g.save(); g.translate(x, y); g.scale(s, s); g.beginPath();
    g.moveTo(-30, -20); g.quadraticCurveTo(-22, -42, -10, -30); g.quadraticCurveTo(-2, -46, 8, -30); g.quadraticCurveTo(16, -22, 22, -26); g.lineTo(30, -44); g.lineTo(38, -42); g.lineTo(36, -36); g.lineTo(28, -20); g.quadraticCurveTo(26, -10, 18, -8); g.lineTo(-24, -8); g.quadraticCurveTo(-34, -10, -30, -20); g.fill();
    [[-20, 0], [-14, Math.PI], [12, Math.PI], [18, 0]].forEach(function (L) { var a = Math.sin(ph + L[1]) * 0.35; g.save(); g.translate(L[0], -10); g.rotate(a); g.fillRect(-2, 0, 4, 26); g.restore(); });
    if (rider) { g.beginPath(); g.moveTo(-6, -40); g.lineTo(2, -40); g.lineTo(0, -60); g.closePath(); g.fill(); g.beginPath(); g.arc(-1, -63, 4, 0, K.PI2); g.fill(); }
    g.restore();
  }
  I.reg("silkroad", {
    dur: 4.6, still: 4.2,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i, hz = H * 0.62;
      var sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#0a1426"); sky.addColorStop(0.55, "#7a3a3a"); sky.addColorStop(1, "#f0a24a"); g.fillStyle = sky; g.fillRect(0, 0, W, hz);
      var st = seg(t, 2.6, 4.2); if (st > 0) for (i = 0; i < 40; i++) { g.fillStyle = "rgba(255,245,220," + st * K.hash(i + 3) * 0.9 + ")"; g.fillRect(K.hash(i) * W, K.hash(i + 50) * hz * 0.35, 1.5, 1.5); }
      // the sun, low and enormous, sinking
      var sr = Math.min(W, H) * 0.32, sy = hz - sr * 0.25 + K.eio(seg(t, 0, 4.6)) * sr * 0.4; var sg = g.createRadialGradient(W * 0.5, sy, sr * 0.2, W * 0.5, sy, sr * 1.6); sg.addColorStop(0, "rgba(255,210,120,1)"); sg.addColorStop(0.4, "rgba(255,160,80,.6)"); sg.addColorStop(1, "rgba(255,120,60,0)"); g.fillStyle = sg; g.fillRect(0, 0, W, hz);
      g.fillStyle = "#ffd88a"; g.beginPath(); g.arc(W * 0.5, sy, sr, 0, K.PI2); g.fill();
      // the name, in the sky, uncovered behind the caravan's lead camel
      var lead = K.lerp(-W * 0.2, W * 1.15, seg(t, 0.2, 3.6));
      var fs = Math.min(W * 0.08, 50); g.save(); g.beginPath(); g.rect(0, 0, Math.max(0, lead - W * 0.05), hz); g.clip();
      g.font = "600 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(60,20,20,.55)"; g.fillText("TITAN RELIQUARY", W / 2, hz * 0.3);
      g.fillStyle = "#f9f0dc"; g.shadowColor = "rgba(255,200,120,.8)"; g.shadowBlur = 14; g.fillText("TITAN RELIQUARY", W / 2, hz * 0.3 - 2); g.restore();
      // ridges in parallax (far to near)
      [[0.0, "#5a2c2a", 0.15, 0.25], [0.05, "#3a1c22", 0.35, 0.5], [0.1, "#1f1018", 0.7, 1.0]].forEach(function (L, k) {
        var off = t * W * L[2] * 0.18; g.fillStyle = L[1]; g.beginPath(); g.moveTo(0, H);
        for (var x = 0; x <= W; x += 8) { var u = (x + off) / W; g.lineTo(x, hz + H * L[0] + Math.sin(u * (2 + k) * 3.1 + k) * H * 0.03 * L[3] + Math.sin(u * 9 + k) * H * 0.008); }
        g.lineTo(W, H); g.closePath(); g.fill();
        if (k === 1) {                                                                          // the caravan walks the middle crest
          g.fillStyle = "#1a0d12";
          for (var c = 0; c < 5; c++) { var cx = lead - c * Math.min(W, H) * 0.3, uu = (cx + off) / W, cy = hz + H * L[0] + Math.sin(uu * 3 * 3.1 + 1) * H * 0.03 * L[3] + Math.sin(uu * 9 + 1) * H * 0.008;
            if (cx > -60 && cx < W + 60) camel(g, cx, cy + 3, Math.min(W, H) / 420 * (c === 0 ? 1.15 : 1), t * 7 + c * 1.3, c % 2 === 0); }
        }
      });
      // heat shimmer on the horizon
      g.save(); g.globalAlpha = 0.25; for (i = 0; i < 8; i++) { var y = hz - 6 + i * 2; g.drawImage(C.cv, 0, y * C.dpr, C.cv.width, 2 * C.dpr, Math.sin(t * 8 + i) * 2, y, W, 2); } g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 4.6, { type: "bandpass", f: 900, to: 1300, q: 0.6, shape: [[0.5, 0.06], [4.0, 0.05], [4.6, 0.0001]] });   // wind across sand
      for (var i = 0; i < 12; i++) { var s = 0.3 + i * 0.29; A.bell(s, i % 2 ? 1480 : 1245, 0.5, 0.035, [[1, 1], [2.4, 0.3], [3.9, 0.12]]); }   // camel bells, swinging
      A.tone(0.2, 73.42, 4.3, { type: "sawtooth", v: 0.05, lp: 600, q: 2, a: 0.4 });                                          // drone
      [[1.6, 293.66], [1.85, 311.13], [2.1, 369.99], [2.5, 392], [2.75, 369.99], [3.2, 293.66]].forEach(function (n) { A.tone(n[0], n[1], 0.5, { type: "triangle", v: 0.07, a: 0.003, lp: 1800 }); A.tone(n[0] + 0.01, n[1] * 2, 0.2, { v: 0.02 }); });   // the oud phrase (hijaz)
    }
  });
})();
