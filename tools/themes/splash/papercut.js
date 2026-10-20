  /* ============================== PAPER HILLS (papercut, light): card hills slide up layer by layer, the sun pops, a balloon rises, cut-paper letters drop in ============================== */
  function paperShadow(g, blur, dx, dy, a) { g.shadowColor = "rgba(40,32,20," + a + ")"; g.shadowBlur = blur; g.shadowOffsetX = dx; g.shadowOffsetY = dy; }
  function noShadow(g) { g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0; }
  STYLES.papercut = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H;
      C.L = wordmark(C, { cy: H * 0.4, track: 0.04, font: function (s) { return "800 " + s + "px " + GEO; }, maxSize: C.portrait ? 112 : 104, gap: 0.22 });
      C.hills = [{ c: "#a3c7a8", base: 0.62, amp: 0.045, f: 2.2, ph: 0.4 }, { c: "#70a880", base: 0.7, amp: 0.04, f: 3.1, ph: 2.1 },
                 { c: "#4a8560", base: 0.78, amp: 0.035, f: 2.6, ph: 4.0 }, { c: "#dcae5c", base: 0.87, amp: 0.03, f: 3.7, ph: 1.2 }];
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, L = C.L, i;
      var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#dceef0"); sky.addColorStop(0.6, pal.bg); sky.addColorStop(1, pal.bg);
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // the sun pops in with cut rays
      var sk = eob(seg(t, 0.15, 0.7), 1.8), sx = W * 0.8, sy = H * 0.15, sr = Math.min(W, H) * 0.075 * sk;
      if (sk > 0) {
        g.save(); paperShadow(g, 8, 3, 5, 0.25); g.fillStyle = "#f6c25a"; g.beginPath();
        for (i = 0; i < 24; i++) { var an = i / 24 * PI2 + t * 0.15, rr = i % 2 ? sr * 1.32 : sr * 1.08; g.lineTo(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr); }
        g.closePath(); g.fill(); g.fillStyle = "#fad27a"; g.beginPath(); g.arc(sx, sy, sr, 0, PI2); g.fill(); g.restore();
      }
      // two paper clouds drift in from the sides
      [[0.18, 0.12, 1, 0.1], [0.62, 0.27, -1, 0.3]].forEach(function (cl) {
        var k = eo3(seg(t, cl[3], cl[3] + 1.2)); if (k <= 0) return;
        var cx = W * cl[0] + cl[2] * (1 - k) * W * 0.5 + t * 6, cy = H * cl[1], cr = Math.min(W, H) * 0.045;
        g.save(); paperShadow(g, 7, 2, 4, 0.18); g.fillStyle = "#fffdf7"; g.beginPath();
        g.arc(cx - cr * 1.1, cy + cr * 0.2, cr * 0.75, 0, PI2); g.arc(cx, cy - cr * 0.15, cr, 0, PI2); g.arc(cx + cr * 1.15, cy + cr * 0.25, cr * 0.7, 0, PI2);
        g.rect(cx - cr * 1.1, cy + cr * 0.2, cr * 2.25, cr * 0.75); g.fill(); g.restore();
      });
      // a balloon rises behind the hills
      var bk = seg(t, 0.4, 3.1), bx = W * 0.22, by = lerp(H * 0.95, H * 0.2, eo3(bk)), br = Math.min(W, H) * 0.05;
      if (bk > 0) {
        g.save(); paperShadow(g, 8, 3, 5, 0.25);
        g.fillStyle = "#d9584a"; g.beginPath(); g.ellipse(bx, by, br, br * 1.12, 0, 0, PI2); g.fill(); noShadow(g);
        g.fillStyle = "#fff6e4"; g.beginPath(); g.ellipse(bx, by, br * 0.38, br * 1.12, 0, 0, PI2); g.fill();
        g.strokeStyle = "#6b4a2a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx - br * 0.4, by + br * 1.0); g.lineTo(bx - br * 0.2, by + br * 1.6); g.moveTo(bx + br * 0.4, by + br * 1.0); g.lineTo(bx + br * 0.2, by + br * 1.6); g.stroke();
        g.fillStyle = "#8a5a32"; g.fillRect(bx - br * 0.24, by + br * 1.58, br * 0.48, br * 0.32); g.restore();
      }
      // card hills slide up one layer at a time, each with a drop shadow on the layer behind
      C.hills.forEach(function (hl, hi) {
        var k = eo3(seg(t, 0.05 + hi * 0.16, 0.65 + hi * 0.16)); if (k <= 0) return;
        var off = (1 - k) * H * 0.35;
        g.save(); paperShadow(g, 10, 0, -4, 0.22); g.fillStyle = hl.c; g.beginPath(); g.moveTo(0, H);
        for (var x = 0; x <= W + 8; x += 8) { var u = x / W; g.lineTo(x, H * hl.base + off - H * (hl.amp * Math.sin(u * PI2 * hl.f / 2 + hl.ph) + 0.4 * hl.amp * Math.sin(u * PI2 * hl.f * 1.7 + hl.ph * 2))); }
        g.lineTo(W, H); g.closePath(); g.fill(); g.restore();
      });
      // cut-paper letters drop in, each slightly rotated, landing with a shadow
      L.lines.forEach(function (ln, li) {
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
        ln.glyphs.forEach(function (gl, gi) {
          var t0 = 0.85 + li * 0.25 + gi * 0.05, k = seg(t, t0, t0 + 0.45); if (k <= 0) return;
          var p = eob(k, 1.4), rot = (1 - p) * (gi % 2 ? 0.5 : -0.45) + (gi % 3 - 1) * 0.035, dy = -(1 - p) * H * 0.3;
          var cx = gl.x + gl.w / 2;
          g.save(); g.translate(cx, ln.base + dy); g.rotate(rot); g.translate(-cx, -ln.base);
          paperShadow(g, 6, 2, 4, 0.28 * p);
          g.fillStyle = li === 0 ? "#c1502a" : "#2f6a4a"; g.fillText(gl.ch, gl.x, ln.base);
          noShadow(g); g.restore();
        });
      });
      if (!C.cued && t > 1.7) { C.cued = true; C.cue("land"); }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.09, C.frame); g.globalCompositeOperation = "source-over";
    }
  };
