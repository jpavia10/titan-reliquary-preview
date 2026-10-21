/* Dynasty intro (Grok, 2026-10-20). A silk handscroll is unrolled across the screen right to left, the roller turning as it goes,
   showing an ink landscape: far peaks in pale wash, nearer ones darker, mist lying between them, a pine on the near ridge.
   As the painting finishes, the name is written down the margin in brush strokes (each letter bleeds in) and a red
   sun rises behind the far peaks. Sound: guzheng plucks on a pentatonic run as the scroll opens, the slide of silk, a deep gong as the sun rises. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function painting(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(88), i, L;
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#efe2c4"); bg.addColorStop(1, "#e2cfa5"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (i = 0; i < 1800; i++) { g.fillStyle = "rgba(120,90,40," + r() * 0.05 + ")"; g.fillRect(r() * W, r() * H, 1, 3); }    // silk weave
    [[0.38, "rgba(60,60,70,.22)", 0.16], [0.5, "rgba(40,40,48,.38)", 0.22], [0.64, "rgba(25,25,30,.62)", 0.2], [0.8, "rgba(15,15,18,.85)", 0.14]].forEach(function (l, k) {
      g.fillStyle = l[1]; g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W; x += 6) { var u = x / W, y = H * l[0] - H * l[2] * (Math.pow(Math.abs(Math.sin(u * (3 + k) + k * 1.7)), 1.6) * 0.8 + 0.25 * Math.sin(u * 17 + k) * Math.sin(u * 5)); g.lineTo(x, y); }
      g.lineTo(W, H); g.closePath(); g.fill();
      var mist = g.createLinearGradient(0, H * l[0] - H * 0.04, 0, H * l[0] + H * 0.06); mist.addColorStop(0, "rgba(239,226,196,0)"); mist.addColorStop(0.6, "rgba(239,226,196,.85)"); mist.addColorStop(1, "rgba(239,226,196,0)"); g.fillStyle = mist; g.fillRect(0, H * l[0] - H * 0.04, W, H * 0.1);
    });
    // a pine on the near ridge
    var px = W * 0.28, py = H * 0.72; g.strokeStyle = "rgba(15,12,10,.9)"; g.lineWidth = 3; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 10, py - H * 0.08, px - 6, py - H * 0.16); g.stroke();
    for (i = 0; i < 6; i++) { var by = py - H * (0.04 + i * 0.022), bw = W * (0.07 - i * 0.008); g.fillStyle = "rgba(15,20,15,.8)"; g.beginPath(); g.ellipse(px + (i % 2 ? 1 : -1) * bw * 0.4, by, bw, H * 0.008, (i % 2 ? -0.2 : 0.2), 0, K.PI2); g.fill(); }
    // two birds
    g.strokeStyle = "rgba(20,20,20,.7)"; g.lineWidth = 1.2; [[0.62, 0.2], [0.67, 0.23]].forEach(function (b) { g.beginPath(); g.moveTo(W * b[0] - 7, H * b[1]); g.quadraticCurveTo(W * b[0] - 3, H * b[1] - 4, W * b[0], H * b[1]); g.quadraticCurveTo(W * b[0] + 3, H * b[1] - 4, W * b[0] + 7, H * b[1]); g.stroke(); });
    return c;
  }
  var NOTES = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
  I.reg("dynasty", {
    dur: 4.4, still: 4.1,
    init: function (C) { C.paint = painting(Math.round(C.W), Math.round(C.H * 0.84)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, top = H * 0.08, ph = H * 0.84;
      g.fillStyle = "#130306"; g.fillRect(0, 0, W, H);
      var u = K.eio(seg(t, 0.2, 2.3)), edge = W * (1 - u);                     // unrolled from the right: the roller sits at `edge`
      g.drawImage(C.paint, edge, 0, W - edge, ph, edge, top, W - edge, ph);
      g.fillStyle = "#6a1a1e"; g.fillRect(edge, top - 6, W - edge, 6); g.fillRect(edge, top + ph, W - edge, 6);   // brocade borders
      g.fillStyle = "#c9a13a"; g.fillRect(edge, top - 2, W - edge, 1); g.fillRect(edge, top + ph + 1, W - edge, 1);
      // the roller: a lacquered rod with a shaded cylinder of rolled silk, rotating (stripes move)
      var rr = Math.max(12, W * 0.035) * (1 - 0.5 * u) + 8, rx = edge - rr * 0.2;
      var cg = g.createLinearGradient(rx - rr, 0, rx + rr, 0); cg.addColorStop(0, "#7a6440"); cg.addColorStop(0.45, "#efe2c4"); cg.addColorStop(1, "#6a5634"); g.fillStyle = cg; g.fillRect(rx - rr, top - 4, rr * 2, ph + 8);
      g.fillStyle = "rgba(80,60,30,.25)"; for (var k = 0; k < 6; k++) { var sx = rx - rr + ((k / 6 + t * 1.8) % 1) * rr * 2; g.fillRect(sx, top - 4, 1.5, ph + 8); }
      g.fillStyle = "#3a0c10"; g.fillRect(rx - rr * 0.35, top - 18, rr * 0.7, 14); g.fillRect(rx - rr * 0.35, top + ph + 4, rr * 0.7, 14);
      g.fillStyle = "#c9a13a"; g.fillRect(rx - rr * 0.35, top - 6, rr * 0.7, 3); g.fillRect(rx - rr * 0.35, top + ph + 4, rr * 0.7, 3);
      // the name, brushed down the left margin, letter by letter (each bleeds from a blot into its shape)
      var fs = Math.min(W * 0.065, H * 0.045), x = W * 0.12, txt = "TITANRELIQUARY", y0 = top + ph * 0.1;
      g.save(); g.textAlign = "center"; g.textBaseline = "middle";
      for (var i = 0; i < txt.length; i++) { var a = seg(t, 2.2 + i * 0.07, 2.42 + i * 0.07); if (a <= 0) continue;
        var cx = x + (i >= 5 ? fs * 1.3 : 0), cy = y0 + (i >= 5 ? i - 5 : i) * fs * 1.12 + (i >= 5 ? fs * 0.6 : 0);
        g.globalAlpha = a; g.fillStyle = "rgba(20,14,10,.9)"; g.font = "700 " + fs + "px " + K.SERIF; g.shadowColor = "rgba(20,14,10,.6)"; g.shadowBlur = (1 - a) * 10 + 1; g.fillText(txt[i], cx, cy); }
      g.restore();
      // the red sun rises behind the far peaks (drawn under the painting's ink by "multiply")
      var sr = K.eo3(seg(t, 2.9, 3.8));
      if (sr > 0) { var sx = W * 0.66, sy = top + ph * K.lerp(0.36, 0.2, sr), r = Math.min(W, H) * 0.075;
        g.save(); g.beginPath(); g.rect(edge, top, W - edge, ph * 0.36); g.clip(); g.globalCompositeOperation = "multiply"; g.globalAlpha = Math.min(1, sr * 2);
        var sg = g.createRadialGradient(sx, sy, r * 0.2, sx, sy, r); sg.addColorStop(0, "#c8141c"); sg.addColorStop(0.85, "#d92a22"); sg.addColorStop(1, "rgba(217,42,34,0)"); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, r, 0, K.PI2); g.fill(); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.2, 2.1, { type: "bandpass", f: 3000, q: 0.6, shape: [[0.3, 0.04], [1.8, 0.05], [2.1, 0.0001]] });          // silk sliding
      for (var i = 0; i < 8; i++) { var s = 0.3 + i * 0.24, f = NOTES[i]; A.tone(s, f, 1.1, { type: "triangle", v: 0.12, a: 0.002 }); A.tone(s, f * 2.01, 0.4, { v: 0.04, a: 0.002 }); A.tone(s + 0.06, f * 0.995, 0.8, { type: "triangle", v: 0.03 }); }   // guzheng run with bends
      A.tone(2.95, 98, 3.0, { v: 0.2, a: 0.01 }); A.tone(2.95, 147, 2.6, { v: 0.08 }); A.tone(2.95, 211, 2.0, { v: 0.05 }); A.noise(2.95, 0.6, { type: "bandpass", f: 400, q: 1.5, v: 0.08 });   // gong
    }
  });
})();
