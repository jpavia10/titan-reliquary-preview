/* Midnight Gallery intro (Grok, 2026-10-20). A heist, first person. Pitch dark gallery; red security lasers criss-cross the
   frame, made visible by drifting dust. One by one they cut out (a keypad chirps for each), then a flashlight clicks on and
   sweeps the wall, finding a gilt frame; inside the frame, lit only by the beam, is the name. Sound: low HVAC hum, laser
   buzz, keypad chirps, the flashlight click, a soft vibraphone chord. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var LZ = [[0, 0.2, 1, 0.55], [0, 0.7, 1, 0.3], [0.1, 0, 0.9, 1], [0.85, 0, 0.2, 1], [0, 0.42, 1, 0.48], [0.5, 0, 0.35, 1]];
  I.reg("afterhours", {
    dur: 4.4, still: 4.1,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      g.fillStyle = "#07060a"; g.fillRect(0, 0, W, H);
      var fon = seg(t, 2.0, 2.05), sw = K.eio(seg(t, 2.05, 3.4));
      var bx = W * K.lerp(0.15, 0.5, sw), by = H * K.lerp(0.75, 0.45, sw) + Math.sin(t * 9) * 2, br = Math.min(W, H) * K.lerp(0.32, 0.5, sw);
      // the wall + frame, revealed only where the beam is (a faint ambient after it settles)
      var amb = seg(t, 3.4, 4.2) * 0.35;
      function wall() {
        g.fillStyle = "#2a2230"; g.fillRect(0, 0, W, H);
        for (i = 0; i < 14; i++) { g.fillStyle = i % 2 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.02)"; g.fillRect(i * W / 14, 0, W / 14, H); }
        var fw = Math.min(W * 0.84, 460), fh = fw * 0.62, fx = W / 2 - fw / 2, fy = H * 0.45 - fh / 2;
        var gg = g.createLinearGradient(fx, fy, fx + fw, fy + fh); gg.addColorStop(0, "#f4d58a"); gg.addColorStop(0.5, "#8a5a1e"); gg.addColorStop(1, "#e9c16a");
        g.fillStyle = gg; g.fillRect(fx - 18, fy - 18, fw + 36, fh + 36); g.fillStyle = "#3a2a10"; g.fillRect(fx - 6, fy - 6, fw + 12, fh + 12);
        g.fillStyle = "#14101c"; g.fillRect(fx, fy, fw, fh);
        var fs = Math.min(fw * 0.085, 40); g.font = "500 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#efe6d4"; g.fillText("TITAN RELIQUARY", W / 2, fy + fh * 0.46);
        g.font = "400 " + fs * 0.32 + "px " + K.MONO; g.fillStyle = "#b8a98e"; g.fillText("OIL ON NIGHT  \u00b7  2026  \u00b7  ON LOAN", W / 2, fy + fh * 0.64);
        g.fillStyle = "#d8c9a8"; g.fillRect(W / 2 - 34, fy + fh + 40, 68, 22); g.fillStyle = "#3a2a10"; g.font = "600 9px " + K.MONO; g.fillText("NO. 34", W / 2, fy + fh + 51);
      }
      if (fon > 0) {
        g.save(); g.globalAlpha = amb; wall(); g.restore();
        g.save(); g.beginPath(); g.arc(bx, by, br, 0, K.PI2); g.clip(); wall();
        var bg = g.createRadialGradient(bx, by, br * 0.1, bx, by, br); bg.addColorStop(0, "rgba(255,240,200,.32)"); bg.addColorStop(0.7, "rgba(0,0,0,0)"); bg.addColorStop(1, "rgba(0,0,0,.9)"); g.fillStyle = bg; g.fillRect(0, 0, W, H); g.restore();
      }
      // dust motes, lit by lasers and beam
      for (i = 0; i < 70; i++) { var x = (K.hash(i) * W + t * 9 * (K.hash(i + 9) - 0.5) * 6 + W) % W, y = (K.hash(i + 40) * H + t * 6) % H; g.fillStyle = "rgba(255,220,220," + (0.08 + 0.2 * K.hash(i + 7)) + ")"; g.fillRect(x, y, 1.2, 1.2); }
      // lasers: each cuts out at its own time
      g.globalCompositeOperation = "lighter";
      LZ.forEach(function (l, k) { var off = 0.5 + k * 0.22; if (t > off) return; var fl = 0.8 + 0.2 * Math.sin(t * 60 + k);
        [[6, 0.12], [2, 0.5], [0.8, 1]].forEach(function (p) { g.strokeStyle = "rgba(255,30,40," + p[1] * fl + ")"; g.lineWidth = p[0]; g.beginPath(); g.moveTo(l[0] * W, l[1] * H); g.lineTo(l[2] * W, l[3] * H); g.stroke(); });
        g.fillStyle = "rgba(255,60,60,.9)"; g.beginPath(); g.arc(l[0] * W, l[1] * H, 3, 0, K.PI2); g.fill(); });
      g.globalCompositeOperation = "source-over";
      // keypad status bottom-left
      var arm = Math.max(0, LZ.length - Math.max(0, Math.floor((t - 0.5) / 0.22) + 1)); if (t < 0.5) arm = LZ.length;
      g.font = "600 11px " + K.MONO; g.textAlign = "left"; g.fillStyle = arm ? "#ff4050" : "#5dff9a"; g.fillText(arm ? "ZONES ARMED " + arm : "DISARMED", 18, H - 26);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0, 60, 4.3, { type: "sawtooth", v: 0.03, lp: 180 }); A.tone(0, 2400, 1.8, { type: "sine", v: 0.008 });
      for (var k = 0; k < 6; k++) A.tone(0.5 + k * 0.22, 1600 + k * 120, 0.06, { type: "square", v: 0.03 });
      A.noise(2.0, 0.03, { type: "highpass", f: 3000, v: 0.2 }); A.tone(2.0, 180, 0.05, { type: "square", v: 0.06 });
      [261.63, 329.63, 392, 493.88].forEach(function (f, i) { A.bell(3.2 + i * 0.06, f, 1.4, 0.05, [[1, 1], [4, 0.2]]); });
    }
  });
})();
