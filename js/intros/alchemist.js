/* The Alchemist intro (Grok, 2026-10-20). A night laboratory: the name stands as hand-blown glass, empty and catching the lamp.
   A flask over a flame boils, and molten gold runs along a glass pipe into the first letter; the letters fill one after
   another from the bottom (the surface sloshes, bubbles climb), and when the last is full the whole word blooms with heat and
   vents a curl of steam. Sound: the burner, a rolling boil, glassy ticks as each letter fills, a hiss of steam. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  I.reg("alchemist", {
    dur: 4.4, still: 4.1,
    init: function (C) {
      var W = C.W, H = C.H, fs = Math.min(W * (C.portrait ? 0.2 : 0.11), 120); C.fs = fs;
      C.lines = C.portrait ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"];
      var g = C.g; C.glyph = [];
      C.lines.forEach(function (ln, li) { var f = li === 1 && C.portrait ? fs * 0.56 : fs; g.font = "800 " + f + "px " + K.SERIF; var tw = g.measureText(ln).width, x = W / 2 - tw / 2, y = H * 0.4 + li * fs * 0.95;
        for (var i = 0; i < ln.length; i++) { var w = g.measureText(ln[i]).width; if (ln[i] !== " ") C.glyph.push({ ch: ln[i], x: x, y: y, f: f, w: w }); x += w; } });
      var n = C.glyph.length; C.glyph.forEach(function (gl, i) { gl.t0 = 1.0 + i * (2.0 / n); gl.t1 = gl.t0 + 0.42; });
      C.bub = []; var r = K.rng(12); for (var i = 0; i < 90; i++) C.bub.push([r(), r(), r()]);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      g.fillStyle = "#050f0a"; g.fillRect(0, 0, W, H);
      var lamp = g.createRadialGradient(W * 0.5, H * 0.35, 10, W * 0.5, H * 0.45, Math.max(W, H) * 0.7); lamp.addColorStop(0, "rgba(223,183,90,.12)"); lamp.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      var done = seg(t, 3.15, 3.5), heat = done * (1 - 0.6 * seg(t, 3.5, 4.4));
      // the flask and flame (bottom left), the pipe up to the first letter
      var fx = W * 0.16, fy = H * 0.82, fr = Math.min(W, H) * 0.07;
      var fl = 0.8 + 0.2 * Math.sin(t * 30) * Math.sin(t * 11); g.fillStyle = "rgba(90,160,255,.8)"; g.beginPath(); g.ellipse(fx, fy + fr * 1.55, fr * 0.25, fr * 0.5 * fl, 0, 0, K.PI2); g.fill();
      g.fillStyle = "rgba(255,220,120,.25)"; g.beginPath(); g.arc(fx, fy, fr * 1.2, 0, K.PI2); g.fill();
      g.save(); g.beginPath(); g.arc(fx, fy, fr, 0, K.PI2); g.clip(); var lvl = fy + fr * (0.1 + 0.6 * seg(t, 1.0, 3.1)); g.fillStyle = "#e0a52a"; g.fillRect(fx - fr, lvl + Math.sin(t * 9) * 2, fr * 2, fr * 2);
      for (i = 0; i < 14; i++) { var b = C.bub[i], by = fy + fr - ((b[1] + t * (0.8 + b[2])) % 1) * fr * 1.6; g.fillStyle = "rgba(255,240,180,.7)"; g.beginPath(); g.arc(fx + (b[0] - 0.5) * fr * 1.4, by, 1.5 + b[2] * 2, 0, K.PI2); g.fill(); } g.restore();
      g.strokeStyle = "rgba(220,240,230,.5)"; g.lineWidth = 1.5; g.beginPath(); g.arc(fx, fy, fr, 0, K.PI2); g.stroke();
      var G0 = C.glyph[0], pipe = [[fx, fy - fr], [fx, G0.y + G0.f * 0.25], [G0.x + G0.w * 0.5, G0.y + G0.f * 0.25]];
      g.strokeStyle = "rgba(220,240,230,.35)"; g.lineWidth = 6; g.beginPath(); g.moveTo(pipe[0][0], pipe[0][1]); g.lineTo(pipe[1][0], pipe[1][1]); g.lineTo(pipe[2][0], pipe[2][1]); g.stroke();
      var run = seg(t, 0.5, 1.0); if (run > 0) { var L1 = pipe[0][1] - pipe[1][1], L2 = Math.abs(pipe[2][0] - pipe[1][0]), d = run * (L1 + L2);
        g.strokeStyle = "#f0b93a"; g.lineWidth = 3; g.beginPath(); g.moveTo(pipe[0][0], pipe[0][1]); if (d < L1) g.lineTo(fx, pipe[0][1] - d); else { g.lineTo(pipe[1][0], pipe[1][1]); g.lineTo(pipe[1][0] + (d - L1) * Math.sign(pipe[2][0] - pipe[1][0]), pipe[1][1]); } g.stroke(); }
      // the glass letters: outline, then the gold rising inside each (clip to the glyph)
      C.glyph.forEach(function (gl, k) {
        g.font = "800 " + gl.f + "px " + K.SERIF; g.textBaseline = "alphabetic"; g.textAlign = "left";
        var fillK = K.eio(seg(t, gl.t0, gl.t1)), top = gl.y - gl.f * 0.75, bot = gl.y + 2, lv = K.lerp(bot, top, fillK);
        if (fillK > 0) { g.save(); g.fillStyle = "#fff"; g.globalCompositeOperation = "source-over";
          g.beginPath(); g.rect(gl.x - 4, lv, gl.w + 8, bot - lv + 4); g.clip();
          var gg = g.createLinearGradient(0, top, 0, bot); gg.addColorStop(0, K.mixc("#ffd86a", "#fff6d0", heat)); gg.addColorStop(1, "#b07a18"); g.fillStyle = gg;
          if (heat > 0) { g.shadowColor = "rgba(255,190,80,.9)"; g.shadowBlur = 24 * heat; }
          g.fillText(gl.ch, gl.x, gl.y); g.restore();
          if (fillK < 1) { g.save(); g.globalCompositeOperation = "source-atop"; g.restore(); }
        }
        g.strokeStyle = "rgba(220,240,230," + (0.35 + 0.25 * Math.sin(t * 2 + k)) + ")"; g.lineWidth = Math.max(1.2, gl.f * 0.018); g.strokeText(gl.ch, gl.x, gl.y);
        g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.8; g.save(); g.beginPath(); g.rect(gl.x, top, gl.w * 0.35, gl.f); g.clip(); g.strokeText(gl.ch, gl.x + 1, gl.y - 1); g.restore();   // glass highlight
        if (fillK > 0 && fillK < 1) for (i = 0; i < 4; i++) { var b = C.bub[(k * 4 + i) % 90], by = bot - ((b[1] + t * 1.5) % 1) * (bot - lv); g.fillStyle = "rgba(255,245,200,.8)"; g.beginPath(); g.arc(gl.x + gl.w * (0.2 + 0.6 * b[0]), by, 1.2 + b[2], 0, K.PI2); g.fill(); }
      });
      // steam when full
      var st = seg(t, 3.4, 4.4);
      if (st > 0) { for (i = 0; i < 14; i++) { var b2 = C.bub[30 + i], a = st - b2[2] * 0.4; if (a <= 0) continue; var x = W * (0.25 + b2[0] * 0.5) + Math.sin(a * 6 + i) * 14, y = H * 0.32 - a * H * 0.25;
        var sg = g.createRadialGradient(x, y, 0, x, y, 10 + a * 40); sg.addColorStop(0, "rgba(240,236,220," + 0.16 * (1 - a) + ")"); sg.addColorStop(1, "rgba(240,236,220,0)"); g.fillStyle = sg; g.fillRect(x - 60, y - 60, 120, 120); } }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 4.3, { type: "lowpass", f: 300, q: 0.5, shape: [[0.2, 0.08], [4.0, 0.08], [4.3, 0.0001]] });   // burner roar
      for (var i = 0; i < 40; i++) { var s = 0.6 + i * 0.065 + K.hash(i) * 0.05; A.tone(s, 300 + K.hash(i * 7) * 500, 0.05, { v: 0.05, to: 900 + K.hash(i * 3) * 600 }); }   // boil: rising blips
      C.glyph.forEach(function (gl, k) { A.bell(gl.t1, 1568 + (k % 5) * 196, 0.5, 0.03, [[1, 1], [2.7, 0.3]]); });
      A.noise(3.4, 1.0, { type: "highpass", f: 4000, shape: [[0.05, 0.14], [1.0, 0.0001]] });
    }
  });
})();
