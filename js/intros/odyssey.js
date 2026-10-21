/* Odyssey intro (Grok, 2026-10-20). A captain's chart on the table under a swinging lantern. The brass compass rose spins, hunts
   and settles on north; a ship's mark sails the route across the chart, its wake drawn as a dotted line past islands and a sea
   monster in the margin; where it drops anchor the name is inked onto the chart in a banner, as a cartographer would letter it.
   The lantern sways the light and shadows across the paper the whole time. Sound: waves on the hull, timbers, the compass
   needle ticking, a ship's bell at anchor. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  function chart(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(21), i;
    g.fillStyle = "#e8d9b0"; g.fillRect(0, 0, W, H);
    for (i = 0; i < 1500; i++) { g.fillStyle = "rgba(110,80,40," + r() * 0.06 + ")"; g.fillRect(r() * W, r() * H, 2, 2); }
    var st = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); st.addColorStop(0, "rgba(0,0,0,0)"); st.addColorStop(1, "rgba(90,55,20,.35)"); g.fillStyle = st; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(90,70,40,.18)"; g.lineWidth = 0.8;                   // rhumb lines
    for (i = 0; i < 16; i++) { var a = i / 16 * K.PI2; g.beginPath(); g.moveTo(W * 0.72, H * 0.2); g.lineTo(W * 0.72 + Math.cos(a) * W * 2, H * 0.2 + Math.sin(a) * W * 2); g.stroke(); }
    [[0.24, 0.3, 0.15], [0.66, 0.56, 0.1], [0.28, 0.72, 0.12]].forEach(function (s) {   // islands with hatched coasts
      g.fillStyle = "#cdbb8a"; g.strokeStyle = "rgba(70,50,30,.7)"; g.lineWidth = 1.2; g.beginPath();
      for (var k = 0; k <= 24; k++) { var aa = k / 24 * K.PI2, rr = W * s[2] * (0.75 + 0.35 * Math.sin(aa * 3 + s[0] * 9)); g.lineTo(W * s[0] + Math.cos(aa) * rr, H * s[1] + Math.sin(aa) * rr * 0.7); }
      g.closePath(); g.fill(); g.stroke(); for (k = 0; k < 4; k++) { g.beginPath(); g.ellipse(W * s[0], H * s[1], W * s[2] * (1.1 + k * 0.12), W * s[2] * 0.7 * (1.1 + k * 0.12), 0, 0, K.PI2); g.strokeStyle = "rgba(70,90,110," + (0.25 - k * 0.05) + ")"; g.stroke(); } });
    g.save(); g.translate(W * 0.82, H * 0.82); g.strokeStyle = "rgba(60,50,40,.7)"; g.lineWidth = 2;       // a sea serpent in the margin
    g.beginPath(); for (i = 0; i < 5; i++) { g.arc(-i * 22, 0, 10, Math.PI, 0); } g.stroke(); g.beginPath(); g.arc(12, -6, 6, 0, K.PI2); g.stroke(); g.restore();
    return c;
  }
  var ROUTE = [[0.08, 0.9], [0.18, 0.62], [0.42, 0.45], [0.5, 0.28], [0.62, 0.18]];
  function at(u, W, H) { var n = ROUTE.length - 1, s = Math.min(n - 1e-6, u * n), i = Math.floor(s), f = s - i, a = ROUTE[i], b = ROUTE[i + 1]; return [K.lerp(a[0], b[0], f) * W, K.lerp(a[1], b[1], f) * H, Math.atan2((b[1] - a[1]) * H, (b[0] - a[0]) * W)]; }
  I.reg("odyssey", {
    dur: 4.4, still: 4.1,
    init: function (C) { C.map = chart(Math.round(C.W), Math.round(C.H)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i;
      g.drawImage(C.map, 0, 0, W, H);
      // compass rose: spins, hunts, settles
      var cx = W * 0.72, cy = H * 0.2, R = Math.min(W, H) * 0.12, sp = seg(t, 0.1, 1.4), ang = (1 - K.eoel(sp)) * 9 + Math.sin(t * 3) * 0.02 * (1 - sp);
      g.save(); g.translate(cx, cy); g.strokeStyle = "#7a5a20"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R, 0, K.PI2); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, R * 0.85, 0, K.PI2); g.stroke(); g.rotate(ang);
      for (i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.fillStyle = i % 2 ? "#c9a24a" : (i === 0 ? "#9a2a1a" : "#2a3a5a"); g.beginPath(); g.moveTo(0, -R * (i % 2 ? 0.6 : 0.95)); g.lineTo(R * 0.1, 0); g.lineTo(-R * 0.1, 0); g.closePath(); g.fill(); g.restore(); }
      g.fillStyle = "#2a1a10"; g.font = "700 " + R * 0.25 + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("N", 0, -R * 1.18); g.restore();
      // the route, dotted behind the ship
      var u = K.eio(seg(t, 1.0, 3.1)); g.fillStyle = "#8a2a1a";
      for (var k = 0; k <= u; k += 0.012) { var p = at(k, W, H); g.beginPath(); g.arc(p[0], p[1], 1.6, 0, K.PI2); g.fill(); }
      if (u > 0) { var q = at(u, W, H), bob = Math.sin(t * 5) * 0.08; g.save(); g.translate(q[0], q[1]); g.rotate(q[2] + Math.PI / 2 + bob); g.fillStyle = "#3a2414";
        g.beginPath(); g.moveTo(0, -12); g.lineTo(6, 8); g.lineTo(-6, 8); g.closePath(); g.fill(); g.fillStyle = "#f3e8cc"; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 0); g.lineTo(0, 2); g.fill(); g.restore(); }
      // the name in a ribbon banner where she anchors
      var bn = K.eo3(seg(t, 3.1, 3.6));
      if (bn > 0) { var fs = Math.min(W * 0.085, 50), bw = Math.min(W * 0.86, fs * 9.5) * bn, bx = W / 2, by = H * 0.4;
        g.save(); g.translate(bx, by); g.fillStyle = "#f3e8cc"; g.strokeStyle = "#5a3a1a"; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-bw / 2, -fs * 0.6); g.quadraticCurveTo(0, -fs * 0.95, bw / 2, -fs * 0.6); g.lineTo(bw / 2 + fs * 0.6, 0); g.lineTo(bw / 2, fs * 0.6); g.quadraticCurveTo(0, fs * 0.25, -bw / 2, fs * 0.6); g.lineTo(-bw / 2 - fs * 0.6, 0); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.rect(-bw / 2, -fs, bw, fs * 2); g.clip(); g.fillStyle = "#3a2414"; g.font = "italic 600 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Titan Reliquary", 0, -fs * 0.08); g.restore(); }
      // the lantern: a swinging pool of warm light over everything
      var lx = W * 0.5 + Math.sin(t * 1.7) * W * 0.12, ly = H * 0.42, lg = g.createRadialGradient(lx, ly, 10, lx, ly, Math.max(W, H) * 0.7);
      lg.addColorStop(0, "rgba(255,200,120,.12)"); lg.addColorStop(0.5, "rgba(0,0,0,.12)"); lg.addColorStop(1, "rgba(10,5,0,.7)"); g.fillStyle = lg; g.fillRect(0, 0, W, H);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      for (var i = 0; i < 3; i++) A.noise(i * 1.5, 2.0, { type: "lowpass", f: 600, to: 250, shape: [[0.8, 0.12], [2.0, 0.0001]] });   // waves on the hull
      A.noise(0.6, 0.5, { type: "bandpass", f: 220, q: 9, v: 0.06 }); A.noise(2.4, 0.5, { type: "bandpass", f: 260, q: 9, v: 0.06 });   // timbers
      for (i = 0; i < 12; i++) A.noise(0.1 + i * 0.1 * (1 + i * 0.08), 0.012, { type: "highpass", f: 5000, v: 0.08 });                    // compass needle
      A.bell(3.15, 740, 2.2, 0.12, [[1, 1], [2.0, 0.4], [2.9, 0.2]]); A.bell(3.55, 740, 2.0, 0.09, [[1, 1], [2.0, 0.4], [2.9, 0.2]]);   // two bells: at anchor
    }
  });
})();
