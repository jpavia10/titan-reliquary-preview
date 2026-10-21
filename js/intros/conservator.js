/* Conservator intro (Grok, 2026-10-20). On the bench under a daylight lamp lies a coin dark with grime. A cotton swab works it
   in small circles and the grime comes away where it passes, showing bright metal (your featured coin's photo when one is
   cached, otherwise a struck silver blank). A loupe glides in and magnifies the cleaned field, then an accession tag on a
   string is laid beside it and typed. Sound: the soft rub of the swab follows its speed, the tick of the loupe on the bench,
   the typewriter on the tag. Canvas 2D: the grime is a mask rebuilt from the swab's path, so any frame can be drawn alone. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var T0 = 0.45, T1 = 2.35;
  function swab(C, t) {                                   // the swab tip at time t (spirals in small loops over the coin)
    var u = K.clamp((t - T0) / (T1 - T0), 0, 1), R = C.R, a = u * 26, rr = R * (0.85 - 0.75 * u) + R * 0.12 * Math.sin(u * 40);
    return [C.cx + Math.cos(a) * rr + Math.cos(a * 4.3) * R * 0.12, C.cy + Math.sin(a) * rr + Math.sin(a * 3.7) * R * 0.12];
  }
  function face(C) {                                       // the clean coin
    var s = Math.round(C.R * 2), c = K.mk(s, s), g = c.getContext("2d");
    g.save(); g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, K.PI2); g.clip();
    if (C.coin) g.drawImage(C.coin, 0, 0, s, s);
    else { var gr = g.createRadialGradient(s * 0.35, s * 0.3, 4, s / 2, s / 2, s * 0.7); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#c9ccd2"); gr.addColorStop(1, "#7d8189"); g.fillStyle = gr; g.fillRect(0, 0, s, s);
      g.strokeStyle = "rgba(60,60,70,.5)"; g.lineWidth = s * 0.02; g.beginPath(); g.arc(s / 2, s / 2, s * 0.44, 0, K.PI2); g.stroke();
      g.fillStyle = "rgba(70,70,80,.55)"; g.font = "700 " + s * 0.36 + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TR", s / 2, s / 2 + s * 0.02);
      g.font = "600 " + s * 0.07 + "px " + K.SERIF; for (var i = 0; i < 14; i++) { g.save(); g.translate(s / 2, s / 2); g.rotate(-Math.PI * 0.85 + i * 0.13); g.fillText("TITAN RELIQUARY"[i] || "", 0, -s * 0.38); g.restore(); } }
    g.restore(); return c;
  }
  function grime(C) {
    var s = Math.round(C.R * 2), c = K.mk(s, s), g = c.getContext("2d"), r = K.rng(31);
    g.beginPath(); g.arc(s / 2, s / 2, s / 2 + 1, 0, K.PI2); g.clip(); g.fillStyle = "#3b3020"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 260; i++) { g.fillStyle = ["rgba(40,70,50,.35)", "rgba(20,15,8,.4)", "rgba(110,80,40,.3)"][i % 3]; g.beginPath(); g.arc(r() * s, r() * s, 2 + r() * s * 0.08, 0, K.PI2); g.fill(); }
    return c;
  }
  I.reg("conservator", {
    dur: 4.3, still: 4.0, needs: ["coin"],
    init: function (C) {
      var W = C.W, H = C.H; C.R = Math.min(W * 0.3, H * 0.19); C.cx = W / 2; C.cy = H * 0.4;
      C.face = face(C); C.dirt = grime(C); C.mask = K.mk(C.face.width, C.face.height);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, R = C.R, i;
      // the bench: linen-white mat under a daylight lamp
      g.fillStyle = "#efe7d6"; g.fillRect(0, 0, W, H);
      var lamp = g.createRadialGradient(W * 0.45, H * 0.35, 10, W / 2, H * 0.45, Math.max(W, H) * 0.75); lamp.addColorStop(0, "rgba(255,255,255,.65)"); lamp.addColorStop(1, "rgba(120,95,60,.25)"); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(127,82,24,.12)"; g.lineWidth = 1; for (var y = 0; y < H; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // coin shadow + clean face
      g.fillStyle = "rgba(60,40,20,.25)"; g.beginPath(); g.ellipse(C.cx + R * 0.06, C.cy + R * 0.1, R * 1.02, R * 1.02, 0, 0, K.PI2); g.fill();
      g.drawImage(C.face, C.cx - R, C.cy - R, R * 2, R * 2);
      // grime minus everything the swab has touched so far
      var mg = C.mask.getContext("2d"), s = C.mask.width; mg.globalCompositeOperation = "source-over"; mg.clearRect(0, 0, s, s); mg.drawImage(C.dirt, 0, 0);
      mg.globalCompositeOperation = "destination-out"; mg.lineCap = "round"; mg.lineJoin = "round"; mg.strokeStyle = "rgba(0,0,0,.55)"; mg.lineWidth = R * 0.42;
      var tt = Math.min(t, T1); if (tt > T0) { mg.beginPath(); var p = swab(C, T0); mg.moveTo(p[0] - C.cx + R, p[1] - C.cy + R);
        for (var k = T0; k <= tt; k += 1 / 90) { p = swab(C, k); mg.lineTo(p[0] - C.cx + R, p[1] - C.cy + R); } mg.stroke();
        mg.strokeStyle = "rgba(0,0,0,1)"; mg.lineWidth = R * 0.26; mg.stroke(); }
      if (t > T1) { mg.globalAlpha = K.eo3(seg(t, T1, T1 + 0.4)); mg.fillRect(0, 0, s, s); mg.globalAlpha = 1; }
      g.drawImage(C.mask, C.cx - R, C.cy - R, R * 2, R * 2);
      // a fresh sheen where it is clean
      var sh = seg(t, T1, T1 + 0.8); if (sh > 0) { g.save(); g.beginPath(); g.arc(C.cx, C.cy, R, 0, K.PI2); g.clip(); var sx = C.cx - R * 1.5 + sh * R * 3;
        var sg = g.createLinearGradient(sx - R * 0.3, 0, sx + R * 0.3, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,255,.45)"); sg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sg; g.fillRect(C.cx - R, C.cy - R, R * 2, R * 2); g.restore(); }
      // the swab (stick + cotton) while working
      var sa = seg(t, 0.2, 0.45) * (1 - seg(t, T1, T1 + 0.3));
      if (sa > 0) { var q = swab(C, Math.max(T0, Math.min(t, T1))), off = (1 - sa) * W * 0.6;
        g.save(); g.translate(q[0] + off, q[1] + off * 0.3); g.rotate(-0.6); g.fillStyle = "rgba(60,40,20,.18)"; g.fillRect(6, 4, W, 6);
        g.fillStyle = "#e9dcc0"; g.fillRect(8, -3, W, 6); var cg = g.createRadialGradient(-2, -2, 1, 0, 0, 13); cg.addColorStop(0, "#fff"); cg.addColorStop(1, "#d9cfbd"); g.fillStyle = cg; g.beginPath(); g.ellipse(0, 0, 16, 10, 0, 0, K.PI2); g.fill(); g.restore(); }
      // the loupe: glides in, magnifies a spot on the clean field
      var lp = K.eo3(seg(t, 2.6, 3.1)), lr = R * 0.5;
      if (lp > 0) { var lx = K.lerp(W + lr, C.cx + R * 0.55, lp), ly = C.cy - R * 0.45;
        g.save(); g.beginPath(); g.arc(lx, ly, lr, 0, K.PI2); g.clip(); var z = 2.2; g.drawImage(C.face, (lx - C.cx + R) - lr / z, (ly - C.cy + R) - lr / z, lr * 2 / z, lr * 2 / z, lx - lr, ly - lr, lr * 2, lr * 2);
        var lg = g.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, 2, lx, ly, lr); lg.addColorStop(0, "rgba(255,255,255,.25)"); lg.addColorStop(0.8, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(40,30,20,.35)"); g.fillStyle = lg; g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); g.restore();
        g.strokeStyle = "#2b2418"; g.lineWidth = Math.max(4, lr * 0.1); g.beginPath(); g.arc(lx, ly, lr, 0, K.PI2); g.stroke(); }
      // the accession tag on its string, typed
      var tg = K.eo3(seg(t, 2.9, 3.3));
      if (tg > 0) { var tw = Math.min(W * 0.62, 300), th = tw * 0.42, tx = W / 2 - tw / 2, ty = C.cy + R * 1.35 + (1 - tg) * 30;
        g.save(); g.globalAlpha = tg; g.strokeStyle = "#a08050"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(C.cx - R * 0.6, C.cy + R * 0.85); g.quadraticCurveTo(tx - 10, ty - 30, tx + 14, ty + th / 2); g.stroke();
        g.fillStyle = "#fbf7ee"; g.shadowColor = "rgba(60,40,20,.25)"; g.shadowBlur = 8; g.shadowOffsetY = 2; g.beginPath(); g.moveTo(tx, ty + th * 0.25); g.lineTo(tx + th * 0.25, ty); g.lineTo(tx + tw, ty); g.lineTo(tx + tw, ty + th); g.lineTo(tx + th * 0.25, ty + th); g.lineTo(tx, ty + th * 0.75); g.closePath(); g.fill(); g.shadowColor = "transparent";
        g.strokeStyle = "#7f5218"; g.beginPath(); g.arc(tx + 14, ty + th / 2, 4, 0, K.PI2); g.stroke();
        var lines = ["ACC. TR-2026.1", "TITAN RELIQUARY", "cleaned \u00b7 documented"], ch = seg(t, 3.25, 4.0), tot = 0; lines.forEach(function (l) { tot += l.length; });
        var shown = Math.floor(ch * tot); g.fillStyle = "#221c12"; g.textAlign = "left"; g.textBaseline = "middle";
        lines.forEach(function (l, li) { var n = Math.max(0, Math.min(l.length, shown)); shown -= l.length; g.font = (li === 1 ? "700 " + Math.round(th * 0.2) : "500 " + Math.round(th * 0.13)) + "px " + (li === 1 ? K.SERIF : K.MONO); g.fillText(l.slice(0, n), tx + 32, ty + th * (0.24 + li * 0.27)); });
        g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      var shape = []; for (var k = 0; k <= 1; k += 0.05) shape.push([k * (T1 - T0), 0.05 + 0.05 * Math.abs(Math.sin(k * 26 * 2))]); shape.push([T1 - T0 + 0.1, 0.0001]);
      A.noise(T0, T1 - T0 + 0.1, { type: "bandpass", f: 1400, q: 0.7, shape: shape });                    // the rub, pulsing with each loop
      A.tone(3.1, 3100, 0.06, { v: 0.06 }); A.noise(3.1, 0.03, { type: "highpass", f: 3000, v: 0.12 });       // loupe on the bench
      for (var i = 0; i < 18; i++) A.noise(3.25 + i * 0.04, 0.025, { type: "bandpass", f: 1800 + (i % 4) * 300, q: 2, v: 0.12 });   // the typewriter
    }
  });
})();
