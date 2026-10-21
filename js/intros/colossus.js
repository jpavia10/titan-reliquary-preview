/* The Mint intro (Grok, 2026-10-20). Scale. Dawn mist; the camera starts at a pair of colossal bronze feet on a plinth,
   a tiny figure beside them for scale, and cranes up the full height of a titan statue in one long move as the sun breaks
   behind its shoulder. The statue holds a coin aloft; at the top the sunrise ignites the coin's rim and its face reads as
   the name, struck. Sound: a rising brass swell, a deep anvil strike when the sun breaks, a ringing coin. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  I.reg("colossus", {
    dur: 4.5, still: 4.2,
    init: function (C) {},
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      var cam = K.eio(seg(t, 0.1, 3.0)), TH = H * 3.2, oy = K.lerp(-(TH - H), 0, cam);   // world y of screen top shifts up
      var sun = K.eo3(seg(t, 2.2, 3.6));
      var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, K.mixc("#1c2340", "#f0b36a", sun * 0.6)); sky.addColorStop(1, K.mixc("#4a4660", "#ffd9a0", sun)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.save(); g.translate(0, oy); // world coords: y from 0 (top of statue region) to TH (ground)
      var cx = W * 0.44, s = Math.min(W, 520) / 260;
      // sun behind the shoulder
      var sx = cx + 70 * s, sy = TH * 0.2 + (1 - sun) * 120; var sg = g.createRadialGradient(sx, sy, 0, sx, sy, 260 * s); sg.addColorStop(0, "rgba(255,240,200," + sun + ")"); sg.addColorStop(0.3, "rgba(255,180,90," + sun * 0.6 + ")"); sg.addColorStop(1, "rgba(255,150,80,0)"); g.fillStyle = sg; g.fillRect(0, sy - 300 * s, W, 600 * s);
      var br = g.createLinearGradient(cx - 90 * s, 0, cx + 90 * s, 0); br.addColorStop(0, "#1d150f"); br.addColorStop(0.55, K.mixc("#3a2a1a", "#a8743a", sun)); br.addColorStop(1, "#140e0a"); g.fillStyle = br;
      var y0 = TH * 0.12;
      // body: legs, torso, raised arm, head
      g.beginPath(); g.moveTo(cx - 60 * s, TH - 90 * s); g.lineTo(cx - 40 * s, TH * 0.55); g.lineTo(cx - 70 * s, TH * 0.32); g.lineTo(cx - 50 * s, TH * 0.22); g.lineTo(cx + 50 * s, TH * 0.22); g.lineTo(cx + 70 * s, TH * 0.32); g.lineTo(cx + 40 * s, TH * 0.55); g.lineTo(cx + 60 * s, TH - 90 * s); g.lineTo(cx + 10 * s, TH - 90 * s); g.lineTo(cx, TH * 0.6); g.lineTo(cx - 10 * s, TH - 90 * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx + 40 * s, TH * 0.235); g.lineTo(cx + 62 * s, y0 + 20 * s); g.lineTo(cx + 80 * s, y0 + 20 * s); g.lineTo(cx + 62 * s, TH * 0.25); g.fill();
      g.beginPath(); g.ellipse(cx, TH * 0.2, 26 * s, 34 * s, 0, 0, K.PI2); g.fill();
      // drapery folds rim-lit
      g.strokeStyle = "rgba(255,190,110," + (0.15 + 0.5 * sun) + ")"; g.lineWidth = 2; for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx + (20 + i * 7) * s, TH * 0.25); g.quadraticCurveTo(cx + (40 + i * 3) * s, TH * 0.4, cx + (25 + i * 5) * s, TH * 0.55); g.stroke(); }
      // plinth, tiny figure
      g.fillStyle = "#2a2420"; g.fillRect(cx - 120 * s, TH - 90 * s, 240 * s, 90 * s); g.fillStyle = "#3a322a"; g.fillRect(cx - 130 * s, TH - 96 * s, 260 * s, 10 * s);
      g.fillStyle = "#0c0a08"; g.fillRect(cx + 150 * s, TH - 20 * s, 4 * s, 14 * s); g.beginPath(); g.arc(cx + 152 * s, TH - 23 * s, 2.5 * s, 0, K.PI2); g.fill();
      // the coin held aloft
      var ccx = cx + 72 * s, ccy = y0, cr = 56 * s; var cg = g.createRadialGradient(ccx - cr * 0.3, ccy - cr * 0.3, 0, ccx, ccy, cr); cg.addColorStop(0, K.mixc("#6a5030", "#fff0b0", sun)); cg.addColorStop(1, K.mixc("#3a2a18", "#c88a2a", sun)); g.fillStyle = cg; g.beginPath(); g.arc(ccx, ccy, cr, 0, K.PI2); g.fill();
      g.strokeStyle = "rgba(255,240,190," + sun + ")"; g.lineWidth = 3 * s; g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(ccx, ccy, cr * 0.86, 0, K.PI2); g.stroke();
      g.restore();
      // ground mist
      var mg = g.createLinearGradient(0, H * 0.6, 0, H); mg.addColorStop(0, "rgba(220,210,230,0)"); mg.addColorStop(1, "rgba(220,210,230," + 0.5 * (1 - cam) + ")"); g.fillStyle = mg; g.fillRect(0, 0, W, H);
      // name, struck below the coin as the camera arrives
      var nm = seg(t, 3.0, 3.5); if (nm > 0) { var fs = Math.min(W * 0.1, 58); g.save(); g.globalAlpha = nm; g.font = "700 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.letterSpacing = (8 * (1 - nm)) + "px";
        g.fillStyle = "rgba(40,20,10,.5)"; g.fillText("TITAN RELIQUARY", W / 2 + 2, H * 0.88 + 2); g.fillStyle = "#ffe7b0"; g.fillText("TITAN RELIQUARY", W / 2, H * 0.88);
        g.font = "500 " + fs * 0.26 + "px " + K.MONO; g.fillStyle = "#f6d9a8"; g.fillText("STRUCK AT DAWN  \u00b7  THE MINT", W / 2, H * 0.88 + fs * 0.85); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      [98, 146.83, 196, 246.94].forEach(function (f, i) { A.tone(0.1 + i * 0.2, f, 3.6 - i * 0.2, { type: "sawtooth", v: 0.03, lp: 500, to: f * 1.0, a: 1.5 }); });
      A.tone(2.25, 55, 1.5, { to: 40, v: 0.3 }); A.noise(2.25, 0.3, { type: "lowpass", f: 600, v: 0.3 }); A.bell(2.25, 220, 2.0, 0.08, [[1, 1], [2.7, 0.4], [5.2, 0.2]]);
      A.bell(3.0, 2093, 1.4, 0.05, [[1, 1], [2.32, 0.4], [4.1, 0.2]]);
    }
  });
})();
