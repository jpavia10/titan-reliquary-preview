  /* ============================== TREASURY NOTE (banknote, light): a guilloche rosette is engraved line by line, the wordmark is printed in fine intaglio lines, the serial number types in and the seal stamps ============================== */
  function noteRose(g, cx, cy, R, n, m, ph, k, col) {   // one guilloche ring family as a closed curve, drawn to fraction k
    var N = 720, i, lim = Math.floor(N * k);
    g.strokeStyle = col; g.beginPath();
    for (i = 0; i <= lim; i++) {
      var th = i / N * PI2, r = R * (1 + 0.16 * Math.sin(n * th + ph) + 0.06 * Math.sin(m * th - ph * 1.3));
      if (i === 0) g.moveTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r); else g.lineTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
    }
    g.stroke();
  }
  STYLES.banknote = {
    dur: 3.3, still: 3.0,
    init: function (C) {
      var W = C.W, H = C.H;
      C.L = wordmark(C, { cy: H * 0.44, track: 0.1, font: function (s) { return "700 " + s + "px " + SERIF; }, maxSize: C.portrait ? 104 : 100, gap: 0.24 });
      var pc = document.createElement("canvas"); pc.width = 4; pc.height = 4; var q = pc.getContext("2d");
      q.fillStyle = "#14271f"; q.fillRect(0, 0, 4, 2);                                     // fine horizontal intaglio lines
      C.lines = C.g.createPattern(pc, "repeat");
      C.serial = "TR 00" + String(306).padStart(3, "0") + " A";
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, L = C.L, i;
      var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#f1f3e8"); bg.addColorStop(0.5, "#e9ecdc"); bg.addColorStop(1, "#eef0e4");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // 1. the rosette behind the wordmark, engraved ring by ring
      var cx = W / 2, cy = L.cy, R = Math.min(W, H) * (C.portrait ? 0.36 : 0.3);
      g.lineWidth = 1; g.globalAlpha = 0.5;
      for (i = 0; i < 14; i++) {
        var k = eo3(seg(t, 0.05 + i * 0.05, 0.75 + i * 0.05)); if (k <= 0) continue;
        noteRose(g, cx, cy, R * (0.62 + i * 0.028), 18, 7, i * 0.22 + t * 0.15, k, i % 2 ? "#1f5e43" : "#2c5a6e");
      }
      g.globalAlpha = 1;
      // 2. a double frame like the border of a note
      var fk = eo3(seg(t, 0.3, 1.0)), m = Math.min(W, H) * 0.05;
      g.strokeStyle = "rgba(20,39,31," + (0.7 * fk).toFixed(3) + ")"; g.lineWidth = 2; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
      g.lineWidth = 1; g.strokeRect(m + 6, m + 6, W - 2 * m - 12, H - 2 * m - 12);
      // 3. the wordmark printed in fine lines, rising out of the paper (pressed: light first, then full ink)
      var pk = eo3(seg(t, 0.8, 1.7));
      if (pk > 0) {
        L.lines.forEach(function (ln) {
          g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
          ln.glyphs.forEach(function (gl) {
            g.globalAlpha = pk; g.fillStyle = "#f6f7ef"; g.fillText(gl.ch, gl.x, ln.base);   // a paper knock-out under the letters
            g.fillStyle = C.lines; g.fillText(gl.ch, gl.x, ln.base);
            g.globalAlpha = pk * 0.9; g.lineWidth = 1.2; g.strokeStyle = "#14271f"; g.strokeText(gl.ch, gl.x, ln.base);
          });
        });
        g.globalAlpha = 1;
      }
      // 4. the serial number types in, red, top left and bottom right
      var sn = Math.floor(C.serial.length * seg(t, 1.6, 2.2)), s = C.serial.slice(0, sn);
      g.fillStyle = "#a8321d"; g.font = "700 " + clamp(W * 0.04, 14, 24) + "px " + '"Courier New", ui-monospace, monospace';
      g.textAlign = "left"; g.fillText(s, m + 18, Math.max(m + 40, 92));                         // clear of the sound and Skip buttons g.textAlign = "right"; g.fillText(s, W - m - 18, H - m - 22);
      // 5. the seal stamps on the right of the wordmark
      var sk = seg(t, 2.1, 2.45);
      if (sk > 0) {
        var sr = Math.min(W, H) * 0.07, sx = C.portrait ? W - m - sr * 1.6 : L.cx + L.w / 2 + sr * 1.4, sy = C.portrait ? L.cy + L.h / 2 + sr * 1.8 : L.cy;
        if (sx + sr > W - m) sx = W - m - sr * 1.4;
        var sc = 1 + 0.5 * (1 - eo3(sk));
        g.save(); g.translate(sx, sy); g.scale(sc, sc); g.rotate(-0.2); g.globalAlpha = 0.85 * Math.min(1, sk * 2);
        g.fillStyle = "#a8321d"; g.beginPath();
        for (i = 0; i <= 72; i++) { var an = i / 72 * PI2, rr = sr * (i % 2 ? 1 : 1.07); g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        g.closePath(); g.fill();
        g.strokeStyle = "#f3e9df"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, sr * 0.8, 0, PI2); g.stroke(); g.beginPath(); g.arc(0, 0, sr * 0.66, 0, PI2); g.stroke();
        g.fillStyle = "#f3e9df"; g.beginPath();
        for (i = 0; i < 10; i++) { var a2 = -Math.PI / 2 + i * Math.PI / 5, r2 = (i % 2 ? 0.2 : 0.46) * sr; g.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2); }
        g.closePath(); g.fill(); g.restore(); g.globalAlpha = 1;
        if (!C.cued && sk > 0.3) { C.cued = true; C.cue("land"); }
      }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.06, C.frame); g.globalCompositeOperation = "source-over";
    }
  };
