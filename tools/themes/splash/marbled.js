  /* ============================== MARBLED ENDPAPERS (marbled, light): ink drops fall on the bath and push each other into rings, a comb pulls them into chevrons, the wordmark appears on a cartouche ============================== */
  var MB_PIG = ["#23306b", "#7a1f2b", "#c2913a", "#4b6c8f", "#efe4cc", "#7a1f2b", "#23306b", "#c2913a"];
  STYLES.marbled = {
    dur: 3.3, still: 3.0,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i, M = Math.min(W, H);
      C.drops = [];                                                                         // where and when each drop lands
      var cen = []; for (i = 0; i < 6; i++) cen.push([W * (0.1 + 0.8 * rnd()), H * (0.08 + 0.84 * rnd())]);
      for (i = 0; i < 6; i++) C.drops.push({ x: cen[i][0], y: cen[i][1], r: M * (0.16 + 0.08 * rnd()), t: 0.04 + i * 0.05, c: MB_PIG[(i * 3) % MB_PIG.length] });   // the ground colours
      for (i = 0; i < 24; i++) { var cc = cen[i % 6]; C.drops.push({ x: cc[0] + (rnd() - 0.5) * M * 0.06, y: cc[1] + (rnd() - 0.5) * M * 0.06, r: M * (0.04 + 0.06 * rnd()), t: 0.34 + i * 0.042, c: MB_PIG[(i + 1) % MB_PIG.length] }); }   // drops inside drops: rings
      C.drops.push({ x: W / 2, y: H * 0.47, r: M * 0.2, t: 1.35, c: "#efe4cc" });            // a last big cream drop opens a clear field for the name
      C.N = 120;
      C.L = wordmark(C, { cy: H * 0.47, track: 0.08, font: function (s) { return "600 italic " + s + "px " + SERIF; }, maxSize: C.portrait ? 92 : 88, gap: 0.24 });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, L = C.L, D = C.drops, N = C.N, i, j, k, n;
      g.fillStyle = "#f3ecdc"; g.fillRect(0, 0, W, H);
      // build every landed drop's outline, then push it by each later drop (Jaffer's ink-drop map: p' = c + (p-c)·sqrt(1 + r²/|p-c|²))
      var polys = [];
      for (i = 0; i < D.length; i++) {
        var d = D[i], gk = eo3(seg(t, d.t, d.t + 0.35)); if (gk <= 0) break;
        var P = []; for (k = 0; k < N; k++) { var an = k / N * PI2; P.push([d.x + Math.cos(an) * d.r * gk, d.y + Math.sin(an) * d.r * gk]); }
        for (j = 0; j < polys.length; j++) {
          var Q = polys[j].p, r2 = (d.r * gk) * (d.r * gk);
          for (n = 0; n < N; n++) { var dx = Q[n][0] - d.x, dy = Q[n][1] - d.y, l2 = dx * dx + dy * dy + 1e-6, s = Math.sqrt(1 + r2 / l2); Q[n][0] = d.x + dx * s; Q[n][1] = d.y + dy * s; }
        }
        polys.push({ p: P, c: d.c });
      }
      // the comb: tines drawn down the bath pull everything near them down a little (the nonpareil chevrons)
      var ck = eo3(seg(t, 1.75, 2.35));
      if (ck > 0) {
        var sp = W / 14, lam = sp * 0.32, A = H * 0.045 * ck;
        polys.forEach(function (o) { o.p.forEach(function (q) { var u = (q[0] / sp) % 1, dd = Math.min(u, 1 - u) * sp; q[1] += A * Math.exp(-dd / lam) * (Math.floor(q[0] / sp) % 2 ? 1 : -1); }); });   // alternate tines push up and down
      }
      polys.forEach(function (o) {
        g.fillStyle = o.c; g.beginPath(); g.moveTo(o.p[0][0], o.p[0][1]);
        for (n = 1; n < N; n++) g.lineTo(o.p[n][0], o.p[n][1]);
        g.closePath(); g.fill();
        g.strokeStyle = "rgba(40,24,18,.18)"; g.lineWidth = 1; g.stroke();
      });
      // the cartouche with the name
      var wa = eo3(seg(t, 2.1, 2.8));
      if (wa > 0) {
        var bw = Math.min(L.w + 70, W - 24), bh = L.h + 56;
        g.save(); g.globalAlpha = wa; g.fillStyle = "#f7f1e3"; g.shadowColor = "rgba(60,30,20,.25)"; g.shadowBlur = 16; g.shadowOffsetY = 4;
        g.fillRect(L.cx - bw / 2, L.cy - bh / 2, bw, bh); g.shadowColor = "transparent";
        g.strokeStyle = "#7a1f2b"; g.lineWidth = 1.5; g.strokeRect(L.cx - bw / 2 + 6, L.cy - bh / 2 + 6, bw - 12, bh - 12);
        L.lines.forEach(function (ln, li) { g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = li === 0 ? "#7a1f2b" : "#23306b";
          ln.glyphs.forEach(function (gl) { g.fillText(gl.ch, gl.x, ln.base); }); });
        g.restore();
        if (!C.cued) { C.cued = true; C.cue("land"); }
      }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.06, C.frame); g.globalCompositeOperation = "source-over";
    }
  };
