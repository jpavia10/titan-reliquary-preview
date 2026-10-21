/* Treasury Note intro (Grok, 2026-10-20). Security printing, in three machines. A geometric lathe traces guilloche rosettes
   (spirograph curves accumulating in fine green line), the intaglio press platen slams down and lifts to leave the portrait
   frame and the name in raised ink with a sheen sweep, then the numbering head clicks the serial in red digit by digit.
   Sound: lathe whirr, the press thump and hiss, numbering clacks. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function rose(g, cx, cy, R, r, d, k, frac, lw) { g.beginPath(); var n = Math.floor(900 * frac); for (var i = 0; i <= n; i++) { var a = i / 900 * K.PI2 * k, x = (R - r) * Math.cos(a) + d * Math.cos((R - r) / r * a), y = (R - r) * Math.sin(a) - d * Math.sin((R - r) / r * a); i ? g.lineTo(cx + x, cy + y) : g.moveTo(cx + x, cy + y); } g.lineWidth = lw; g.stroke(); }
  I.reg("banknote", {
    dur: 4.4, still: 4.1,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      g.fillStyle = "#1a1f1a"; g.fillRect(0, 0, W, H);
      var nw = Math.min(W * 0.96, 620), nh = Math.min(nw * 0.5, H * 0.5), nx = W / 2 - nw / 2, ny = H / 2 - nh / 2;
      var press = seg(t, 1.6, 1.75), lift = seg(t, 1.9, 2.3), slam = press * (1 - lift);
      var sc = 1 - slam * 0.015; g.save(); g.translate(W / 2, H / 2); g.scale(sc, sc); g.translate(-W / 2, -H / 2);
      g.fillStyle = "#e8e4d2"; g.fillRect(nx, ny, nw, nh); g.fillStyle = "rgba(120,140,110,.08)"; for (i = 0; i < 60; i++) g.fillRect(nx, ny + i * nh / 60, nw, 1);
      // lathe: guilloche rosettes
      var la = K.eio(seg(t, 0.1, 1.5)); g.strokeStyle = "rgba(30,100,70,.8)";
      rose(g, nx + nh * 0.5, ny + nh * 0.5, nh * 0.42, nh * 0.11, nh * 0.2, 11, la, 0.8); rose(g, nx + nw - nh * 0.5, ny + nh * 0.5, nh * 0.42, nh * 0.13, nh * 0.18, 13, la, 0.8);
      g.strokeStyle = "rgba(40,110,80,.25)"; g.lineWidth = 0.5; g.beginPath(); for (i = 0; i <= 200 * la; i++) { var x = nx + nw * i / 200; g.lineTo(x, ny + nh * 0.12 + Math.sin(i * 0.5) * 4); } g.stroke(); g.beginPath(); for (i = 0; i <= 200 * la; i++) { x = nx + nw * i / 200; g.lineTo(x, ny + nh * 0.88 + Math.sin(i * 0.5 + 1) * 4); } g.stroke();
      // intaglio: appears at the press
      if (press >= 1) { g.save(); g.fillStyle = "#24302a"; var fs = Math.min(nw * 0.062, 40); g.font = "700 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
        var tw = g.measureText("TITAN RELIQUARY").width; g.fillStyle = "rgba(232,228,210,.92)"; g.fillRect(W / 2 - tw / 2 - 8, ny + nh * 0.42 - fs * 0.65, tw + 16, fs * 1.3); g.fillStyle = "#24302a"; g.shadowColor = "rgba(0,0,0,.35)"; g.shadowOffsetY = 1.5; g.shadowBlur = 1; g.fillText("TITAN RELIQUARY", W / 2, ny + nh * 0.42); g.shadowBlur = 0; g.shadowOffsetY = 0;
        g.font = "500 " + fs * 0.32 + "px " + K.SERIF; g.fillText("THIS NOTE IS LEGAL TENDER FOR ALL RELICS PUBLIC AND PRIVATE", W / 2, ny + nh * 0.6);
        g.strokeStyle = "#24302a"; g.lineWidth = 2; g.strokeRect(nx + 8, ny + 8, nw - 16, nh - 16); g.lineWidth = 0.6; g.strokeRect(nx + 13, ny + 13, nw - 26, nh - 26);
        g.font = "800 " + fs * 0.6 + "px " + K.SERIF; g.fillText("34", nx + nh * 0.32, ny + nh * 0.75); g.fillText("34", nx + nw - nh * 0.32, ny + nh * 0.25);
        var sh = seg(t, 2.3, 2.9); if (sh > 0 && sh < 1) { var sx = nx + nw * sh; var sg = g.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,240,.35)"); sg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sg; g.fillRect(nx, ny, nw, nh); }
        g.restore(); }
      // numbering head
      var ser = "TR 00000034", nd = Math.floor(seg(t, 2.8, 3.6) * ser.length + 0.001); if (nd > 0) { g.font = "700 " + Math.min(nw * 0.035, 18) + "px " + K.MONO; g.fillStyle = "#b8202a"; g.textAlign = "left"; g.fillText(ser.slice(0, nd), nx + nw * 0.62, ny + nh * 0.8); g.textAlign = "right"; g.fillText(ser.slice(0, nd), nx + nw * 0.38, ny + nh * 0.22); }
      g.restore();
      // the press platen
      if (press > 0 && lift < 1) { var py = K.lerp(-H * 0.6, ny - 6, K.ei3(press)) - K.eio(lift) * H * 0.7; g.fillStyle = "#3a3f44"; g.fillRect(nx - 30, py - H * 0.5, nw + 60, H * 0.5 + nh + 12); g.fillStyle = "#5a6066"; g.fillRect(nx - 30, py + nh + 4, nw + 60, 8); }
      // lathe stylus
      if (la < 1) { var a = la * K.PI2 * 11, R = nh * 0.42, r = nh * 0.11, d = nh * 0.2, sx2 = nx + nh * 0.5 + (R - r) * Math.cos(a) + d * Math.cos((R - r) / r * a), sy2 = ny + nh * 0.5 + (R - r) * Math.sin(a) - d * Math.sin((R - r) / r * a);
        g.fillStyle = "rgba(120,255,180,.9)"; g.beginPath(); g.arc(sx2, sy2, 2.5, 0, K.PI2); g.fill(); g.strokeStyle = "rgba(200,200,200,.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(sx2, sy2); g.lineTo(sx2 + 40, ny - 40); g.stroke(); }
      g.font = "500 10px " + K.MONO; g.fillStyle = "rgba(200,220,200,.55)"; g.textAlign = "center"; g.fillText(t < 1.6 ? "GEOMETRIC LATHE" : t < 2.8 ? "INTAGLIO PRESS \u00b7 40 T" : "NUMBERING", W / 2, ny + nh + 34);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.1, 220, 1.4, { type: "sawtooth", to: 330, v: 0.025, lp: 900, a: 0.1 }); A.noise(0.1, 1.4, { type: "bandpass", f: 2000, q: 4, v: 0.04 });
      A.tone(1.72, 50, 0.4, { to: 30, v: 0.35 }); A.noise(1.72, 0.12, { type: "lowpass", f: 800, v: 0.4 }); A.noise(1.9, 0.5, { type: "highpass", f: 2500, to: 1000, v: 0.08 });
      for (var k = 0; k < 11; k++) { A.noise(2.8 + k * 0.073, 0.03, { type: "bandpass", f: 2200, q: 3, v: 0.25 }); A.tone(2.8 + k * 0.073, 600, 0.02, { type: "square", v: 0.02 }); }
      A.bell(3.75, 784, 1.0, 0.04, [[1, 1], [3, 0.2]]);
    }
  });
})();
