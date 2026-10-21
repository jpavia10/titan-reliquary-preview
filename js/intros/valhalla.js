/* Valhalla intro (Grok, 2026-10-20). A storm at night over a standing runestone, camera low and rising. Each lightning strike
   lights the whole scene for a beat and burns the next runes into the stone (TITAN RELIQUARY in Elder Futhark, drawn as cut
   strokes, so no rune font is needed); the last strike burns the Latin name under them, which cools from white-hot to ember.
   Sparks drift up off the cuts. Sound: rain, thunder that follows each flash, the hiss of the burn, a long war horn at the end. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  // runes as strokes in a 0..1 x 0..1 box (x right, y down)
  var RU = {
    T: [[0.5, 0, 0.5, 1], [0.5, 0, 0.15, 0.3], [0.5, 0, 0.85, 0.3]], I: [[0.5, 0, 0.5, 1]], A: [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.25], [0.3, 0.3, 0.75, 0.55]],
    N: [[0.5, 0, 0.5, 1], [0.25, 0.35, 0.75, 0.6]], R: [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.25], [0.75, 0.25, 0.3, 0.5], [0.3, 0.5, 0.75, 1]],
    E: [[0.2, 0, 0.2, 1], [0.8, 0, 0.8, 1], [0.2, 0, 0.5, 0.3], [0.5, 0.3, 0.8, 0]], L: [[0.35, 0, 0.35, 1], [0.35, 0, 0.75, 0.3]], K: [[0.7, 0, 0.3, 0.3], [0.3, 0.3, 0.7, 0.6]],
    W: [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.22], [0.75, 0.22, 0.3, 0.45]]
  };
  var WORDS = [["T", "I", "T", "A", "N"], ["R", "E", "L", "I", "K", "W", "A", "R", "I"]];
  var STRIKES = [0.45, 1.25, 2.05, 2.75];
  function bolt(rnd, x, y0, y1, w) {                    // one bolt: a jagged path with two branches
    var P = [[x, y0]], y = y0, cx = x; while (y < y1) { y += (y1 - y0) * (0.05 + rnd() * 0.07); cx += (rnd() - 0.5) * w; P.push([cx, y]); }
    var br = []; for (var b = 0; b < 2; b++) { var s = P[2 + Math.floor(rnd() * (P.length - 4))], q = [[s[0], s[1]]], bx = s[0], by = s[1]; for (var k = 0; k < 5; k++) { by += (y1 - y0) * 0.06; bx += (rnd() - 0.3) * w * (b ? 1 : -1); q.push([bx, by]); } br.push(q); }
    return { p: P, br: br };
  }
  function path(g, P) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.stroke(); }
  function armory(W, H, lit) {                         // the hall wall: timber, shields, crossed swords, axes, spears (lit = the flash pass)
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(61), i;
    if (!lit) { g.fillStyle = "#120c08"; g.fillRect(0, 0, W, H); for (i = 0; i < W; i += 38) { g.fillStyle = i % 76 ? "#18100a" : "#140d08"; g.fillRect(i, 0, 36, H); } }
    var M = Math.min(W, H), sh = [[0.14, 0.22], [0.86, 0.22], [0.1, 0.5], [0.9, 0.5], [0.5, 0.12]];
    function metal(a) { return lit ? "rgba(225,232,255," + a + ")" : "rgba(255,170,90," + a * 0.55 + ")"; }
    // spears racked behind
    for (i = 0; i < 6; i++) { var sx = W * (0.24 + i * 0.105); g.strokeStyle = lit ? "rgba(200,210,240,.35)" : "#3a2616"; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, H * 0.08); g.lineTo(sx + 4, H * 0.62); g.stroke();
      g.fillStyle = metal(0.9); g.beginPath(); g.moveTo(sx, H * 0.03); g.lineTo(sx - 6, H * 0.09); g.lineTo(sx + 6, H * 0.09); g.closePath(); g.fill(); }
    // crossed swords
    [[0.3, 0.36], [0.7, 0.36]].forEach(function (p) { [-0.6, 0.6].forEach(function (a) { g.save(); g.translate(W * p[0], H * p[1]); g.rotate(a); var L = M * 0.34;
      g.fillStyle = metal(lit ? 0.95 : 0.7); g.fillRect(-3, -L / 2, 6, L * 0.8); g.fillStyle = lit ? "rgba(255,220,150,.9)" : "#7a5320"; g.fillRect(-L * 0.12, L * 0.3, L * 0.24, 6); g.fillStyle = lit ? "rgba(160,170,200,.6)" : "#2a1a10"; g.fillRect(-3, L * 0.32, 6, L * 0.14); g.restore(); }); });
    // round shields: planks, painted halves, iron rim, gold boss
    sh.forEach(function (p, k) { var x = W * p[0], y = H * p[1], R = M * (k === 4 ? 0.1 : 0.12);
      if (!lit) { g.fillStyle = ["#5a1a14", "#1f3550", "#2a3a22", "#5a1a14", "#6a4a1a"][k]; g.beginPath(); g.arc(x, y, R, 0, K.PI2); g.fill();
        g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, k * 0.7, k * 0.7 + Math.PI); g.fill();
        g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = 1; for (var q = -R; q < R; q += R / 4) { g.beginPath(); g.moveTo(x + q, y - R); g.lineTo(x + q, y + R); g.stroke(); } }
      g.strokeStyle = metal(lit ? 0.9 : 0.6); g.lineWidth = R * 0.08; g.beginPath(); g.arc(x, y, R, 0, K.PI2); g.stroke();
      g.fillStyle = lit ? "rgba(255,245,210,.95)" : "#c08a2a"; g.beginPath(); g.arc(x, y, R * 0.22, 0, K.PI2); g.fill(); });
    // a bearded axe either side
    [0.2, 0.8].forEach(function (px, k) { var x = W * px, y = H * 0.66; g.strokeStyle = lit ? "rgba(200,210,240,.5)" : "#3a2616"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - M * 0.2); g.lineTo(x, y + M * 0.12); g.stroke();
      g.fillStyle = metal(0.9); g.beginPath(); var d = k ? -1 : 1; g.moveTo(x, y - M * 0.18); g.quadraticCurveTo(x + d * M * 0.11, y - M * 0.2, x + d * M * 0.12, y - M * 0.08); g.quadraticCurveTo(x + d * M * 0.05, y - M * 0.1, x, y - M * 0.11); g.fill(); });
    return c;
  }
  I.reg("valhalla", {
    dur: 4.3, still: 3.9,
    init: function (C) {
      var W = C.W, H = C.H, r = K.rng(808);
      C.bolts = STRIKES.map(function (s, i) { return bolt(r, W * (0.2 + 0.6 * r()), -10, H * (0.35 + 0.15 * r()), W * 0.12); });
      C.sw = Math.min(W * 0.62, H * 0.42); C.sh = C.sw * 1.55;               // the stone
      var st = K.mk(Math.round(C.sw), Math.round(C.sh)), g = st.getContext("2d"), sw = st.width, sh = st.height;
      g.beginPath(); g.moveTo(sw * 0.12, sh); g.bezierCurveTo(sw * 0.02, sh * 0.5, sw * 0.18, sh * 0.06, sw * 0.5, sh * 0.02); g.bezierCurveTo(sw * 0.86, sh * 0.04, sw * 1.0, sh * 0.45, sw * 0.9, sh); g.closePath();
      var gr = g.createLinearGradient(0, 0, sw, sh); gr.addColorStop(0, "#4a4440"); gr.addColorStop(1, "#1d1a18"); g.fillStyle = gr; g.fill(); g.save(); g.clip();
      for (var i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,.16)" : "rgba(255,240,220,.06)"; g.fillRect(r() * sw, r() * sh, 1 + r() * 3, 1 + r() * 3); }
      g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; for (i = 0; i < 7; i++) { g.beginPath(); var yy = r() * sh; g.moveTo(0, yy); g.bezierCurveTo(sw * 0.3, yy + 20 * r(), sw * 0.6, yy - 20 * r(), sw, yy + 10); g.stroke(); }
      g.restore(); C.stone = st;
      C.sparks = []; for (i = 0; i < 70; i++) C.sparks.push([r(), r(), r(), r()]);
      C.hall = armory(Math.round(W), Math.round(H * 0.8), false); C.hallLit = armory(Math.round(W), Math.round(H * 0.8), true);
      C.rain = []; for (i = 0; i < 110; i++) C.rain.push([r(), r(), 0.7 + r() * 0.6]);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i, j;
      var flash = 0; STRIKES.forEach(function (s) { var d = t - s; if (d >= 0 && d < 0.5) flash = Math.max(flash, Math.exp(-d * 9) * (d < 0.06 || (d > 0.1 && d < 0.14) ? 1 : 0.6)); });
      var rise = K.eio(seg(t, 0, 4.3)), camY = K.lerp(H * 0.1, -H * 0.02, rise), zs = K.lerp(1.05, 0.98, rise);
      // sky: storm clouds, lifted by the flash
      var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, K.mixc("#0b0d14", "#9aa6c8", flash * 0.8)); sky.addColorStop(0.65, K.mixc("#120c08", "#4a4860", flash * 0.6)); sky.addColorStop(1, "#060403"); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // the armory wall behind the stone: torchlit, and every metal edge catches the flash
      var tf = 0.75 + 0.15 * Math.sin(t * 23) + 0.1 * Math.sin(t * 37 + 1);
      g.save(); g.translate(0, camY * 0.5); g.globalAlpha = 0.55 + 0.15 * tf; g.drawImage(C.hall, 0, 0, W, H * 0.8);
      if (flash > 0) { g.globalCompositeOperation = "lighter"; g.globalAlpha = flash; g.drawImage(C.hallLit, 0, 0, W, H * 0.8); g.globalCompositeOperation = "source-over"; }
      g.globalAlpha = 1; [0.04, 0.96].forEach(function (px, k) { var x = W * px, y = H * 0.42, fl = tf + 0.1 * Math.sin(t * 31 + k * 3);
        var tg = g.createRadialGradient(x, y, 2, x, y, Math.min(W, H) * 0.45 * fl); tg.addColorStop(0, "rgba(255,170,70,.5)"); tg.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = tg; g.fillRect(0, 0, W, H);
        g.fillStyle = "#3a2414"; g.fillRect(x - 3, y, 6, 40); g.fillStyle = "rgba(255,200,90,.95)"; g.beginPath(); g.ellipse(x, y - 8 * fl, 6, 14 * fl, Math.sin(t * 9 + k) * 0.15, 0, K.PI2); g.fill(); });
      g.restore();
      // a window of storm sky above the wall, where the bolt is seen
      // the bolt itself
      STRIKES.forEach(function (s, k) { var d = t - s; if (d < 0 || d > 0.22) return; var B = C.bolts[k], a = d < 0.06 || (d > 0.1 && d < 0.14) ? 1 : 0.35;
        g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(190,210,255," + 0.35 * a + ")"; g.lineWidth = 9; path(g, B.p); g.strokeStyle = "rgba(255,255,255," + a + ")"; g.lineWidth = 2.2; path(g, B.p); g.lineWidth = 1.2; B.br.forEach(function (q) { path(g, q); }); g.restore(); });
      // ground
      g.save(); g.translate(0, camY); g.fillStyle = K.mixc("#0a0806", "#3a3a44", flash * 0.5); g.beginPath(); g.moveTo(0, H * 0.8); g.quadraticCurveTo(W * 0.5, H * 0.74, W, H * 0.82); g.lineTo(W, H * 2); g.lineTo(0, H * 2); g.fill();
      // the stone (lit by the flash, then by its own runes)
      var sx = W / 2 - C.sw * zs / 2, sy = H * 0.8 - C.sh * zs + 6;
      g.drawImage(C.stone, sx, sy, C.sw * zs, C.sh * zs);
      if (flash > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = flash * 0.5; g.drawImage(C.stone, sx, sy, C.sw * zs, C.sh * zs); g.restore(); }
      // runes: line k is burned by strike k; each stroke is drawn in over 0.25 s after the strike
      var rs = C.sw * zs * 0.16, cx = W / 2;
      WORDS.forEach(function (wd, li) {
        var s = STRIKES[li], age = t - s; if (age < 0) return;
        var colw = rs * 0.62, w = wd.length * colw, x0 = cx - w / 2, y0 = sy + C.sh * zs * (0.2 + li * 0.2);
        var heat = Math.exp(-age * 1.6), col = K.mixc("#ff5a1a", "#fff3c8", heat);
        g.save(); g.lineCap = "round"; g.shadowColor = "#ff6a00"; g.shadowBlur = 8 + 18 * heat;
        wd.forEach(function (ch, k) { var dr = seg(age, k * 0.03, k * 0.03 + 0.22); if (dr <= 0) return;
          RU[ch].forEach(function (L) { var x1 = x0 + k * colw + L[0] * rs * 0.55, y1 = y0 + L[1] * rs, x2 = x0 + k * colw + L[2] * rs * 0.55, y2 = y0 + L[3] * rs;
            g.strokeStyle = "#0b0705"; g.lineWidth = rs * 0.13; g.shadowBlur = 0; g.beginPath(); g.moveTo(x1, y1); g.lineTo(K.lerp(x1, x2, dr), K.lerp(y1, y2, dr)); g.stroke();
            g.strokeStyle = col; g.lineWidth = rs * 0.06; g.shadowBlur = 8 + 18 * heat; g.stroke(); }); });
        g.restore();
      });
      g.restore();
      // the name, burned by the last strike, cooling
      var la = t - STRIKES[3];
      if (la > 0) { var heat2 = Math.exp(-la * 1.3), fs = Math.min(W * 0.085, 54);
        g.save(); g.textAlign = "center"; g.textBaseline = "middle"; g.font = "700 " + fs + "px " + K.SERIF; g.shadowColor = "#ff5a00"; g.shadowBlur = 10 + 30 * heat2;
        g.globalAlpha = Math.min(1, la * 6); g.fillStyle = K.mixc("#d9772e", "#fff6dc", heat2);
        var ny = H * 0.88 + camY * 0.2; g.fillText("TITAN RELIQUARY", W / 2, ny); g.restore();
      }
      // sparks off the cuts
      if (t > STRIKES[0]) { g.save(); g.globalCompositeOperation = "lighter"; C.sparks.forEach(function (p) { var bt = STRIKES[Math.floor(p[3] * 3)], a = t - bt; if (a < 0 || a > 1.6) return;
        var x = W / 2 + (p[0] - 0.5) * C.sw * 0.8 + Math.sin(a * 3 + p[2] * 9) * 10, y = H * 0.5 - a * (40 + p[1] * 90) + (p[1] - 0.5) * C.sh * 0.4;
        g.fillStyle = "rgba(255," + (140 + p[2] * 90 | 0) + ",60," + (1 - a / 1.6) + ")"; g.fillRect(x, y, 2, 2); }); g.restore(); }
      // rain
      g.strokeStyle = "rgba(190,200,230," + (0.18 + flash * 0.5) + ")"; g.lineWidth = 1; g.beginPath();
      C.rain.forEach(function (d) { var y = ((d[1] + t * 1.7 * d[2]) % 1) * H, x = d[0] * W + y * 0.18; g.moveTo(x, y); g.lineTo(x + 4, y + 20 * d[2]); }); g.stroke();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 4.3, { type: "highpass", f: 1800, q: 0.4, shape: [[0.2, 0.06], [4.0, 0.06], [4.3, 0.0001]] });
      STRIKES.forEach(function (s, i) {
        A.noise(s, 0.12, { type: "highpass", f: 3000, v: 0.25 });                                       // the crack
        A.noise(s + 0.12 + i * 0.03, 2.2, { type: "lowpass", f: 260, to: 90, q: 0.7, shape: [[0.05, 0.5], [0.4, 0.3], [1.2, 0.12], [2.2, 0.0001]] });   // thunder
        A.noise(s + 0.05, 0.6, { type: "bandpass", f: 5200, q: 1.5, shape: [[0.02, 0.06], [0.6, 0.0001]] });   // the burn hiss
      });
      A.tone(2.95, 98, 1.3, { type: "sawtooth", v: 0.14, lp: 700, a: 0.25, to: 110, glide: 0.4 });   // the horn
      A.tone(2.95, 147, 1.2, { type: "sawtooth", v: 0.06, lp: 900, a: 0.3 });
    }
  });
})();
