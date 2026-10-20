  /* ============================== SKETCHBOOK (sketch, light): a pencil traces the wordmark, hatches it in, then doodles a star, a light bulb and a swoosh around it ============================== */
  var HAND = '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", "Marker Felt", cursive';
  function polyPart(g, pts, k) {                  // stroke the first fraction k of a polyline; returns the tip
    if (k <= 0 || pts.length < 2) return null;
    var n = k * (pts.length - 1), i, last = Math.floor(n), f = n - last, tip;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i <= last && i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (last < pts.length - 1) { tip = [lerp(pts[last][0], pts[last + 1][0], f), lerp(pts[last][1], pts[last + 1][1], f)]; g.lineTo(tip[0], tip[1]); }
    else tip = pts[pts.length - 1];
    g.stroke(); return tip;
  }
  function sketchPencil(g, x, y, s, a) {          // a yellow pencil whose point is at (x, y), leaning up and to the right
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(-1.05); var L = s, w = s * 0.075, cone = s * 0.2;
    g.fillStyle = "#e9cfa6"; g.beginPath(); g.moveTo(0, 0); g.lineTo(cone, -w); g.lineTo(cone, w); g.closePath(); g.fill();
    g.fillStyle = "#2a2b31"; g.beginPath(); g.moveTo(0, 0); g.lineTo(cone * 0.3, -w * 0.3); g.lineTo(cone * 0.3, w * 0.3); g.closePath(); g.fill();
    g.fillStyle = "#f2c230"; g.fillRect(cone, -w, L - cone - s * 0.14, w * 2);
    g.fillStyle = "#cf9a16"; g.fillRect(cone, -w * 0.25, L - cone - s * 0.14, w * 0.5);
    g.fillStyle = "#b3b5bb"; g.fillRect(L - s * 0.14, -w, s * 0.05, w * 2);
    g.fillStyle = "#ee8f9a"; g.fillRect(L - s * 0.09, -w, s * 0.09, w * 2);
    g.restore();
  }
  STYLES.sketch = {
    dur: 3.2, still: 2.9,
    init: function (C) {
      var W = C.W, H = C.H, i;
      C.L = wordmark(C, { cy: H * 0.44, track: 0.06, font: function (s) { return "800 " + s + "px " + GEO; }, maxSize: C.portrait ? 112 : 104, gap: 0.22 });
      var pc = document.createElement("canvas"); pc.width = pc.height = 10; var q = pc.getContext("2d");
      q.strokeStyle = "rgba(38,40,48,.8)"; q.lineWidth = 1.2; q.beginPath();
      q.moveTo(-2, 12); q.lineTo(12, -2); q.moveTo(-2, 2); q.lineTo(2, -2); q.moveTo(8, 12); q.lineTo(12, 8); q.stroke();
      C.hatch = C.g.createPattern(pc, "repeat");
      var L = C.L, l0 = L.lines[0], lN = L.lines[L.lines.length - 1], g0 = l0.glyphs[l0.glyphs.length - 1];
      var x0 = Math.min.apply(null, L.lines.map(function (ln) { return ln.glyphs[0].x; }));
      var x1 = Math.max.apply(null, L.lines.map(function (ln) { var e = ln.glyphs[ln.glyphs.length - 1]; return e.x + e.w; }));
      C.box = [x0, l0.top, x1, lN.base];
      var sr = l0.size * 0.3, sx = Math.min(W - sr * 1.3, g0.x + g0.w + sr * 1.1), sy = l0.top - sr * 0.4;   // a star at the top right
      if (g0.x + g0.w + sr * 0.2 > sx - sr) sy = l0.top - sr * 1.5;                                            // no room beside the word: above it
      C.star = []; for (i = 0; i <= 10; i++) { var an = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? sr * 0.42 : sr; C.star.push([sx + Math.cos(an) * r + (C.rnd() - 0.5) * 2, sy + Math.sin(an) * r + (C.rnd() - 0.5) * 2]); }
      var uy = lN.base + lN.size * 0.24, uw = x1 - x0;                                                        // a swoosh under the last line
      C.swoosh = []; for (i = 0; i <= 40; i++) { var s = i / 40; C.swoosh.push([x0 - uw * 0.02 + uw * 1.04 * s, uy + Math.sin(s * 3.3 - 0.3) * lN.size * 0.07 - s * lN.size * 0.05]); }
      var br = l0.size * 0.2, bx = Math.max(br * 1.6, x0 - br * 1.5), by = l0.top - br * 0.6;               // a light bulb at the top left
      if (bx + br * 1.1 > x0) { bx = x0 + br * 1.4; by = l0.top - br * 2.6; }                                  // no room beside the word: above it
      C.bulb = []; for (i = 0; i <= 22; i++) { var ba = 0.96 + Math.PI / 2 + i / 22 * (2 * Math.PI - 1.92); C.bulb.push([bx + Math.cos(ba) * br, by + Math.sin(ba) * br]); }
      C.bulb.push([bx + br * 0.45, by + br * 1.25], [bx - br * 0.45, by + br * 1.25], [C.bulb[0][0], C.bulb[0][1]]);
      C.bpos = [bx, by, br];
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, L = C.L, B = C.box, tip = null, tk;
      var bg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
      bg.addColorStop(0, "#fbfaf5"); bg.addColorStop(1, "#ebe7dc"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.lineJoin = "round"; g.lineCap = "round";
      // 1. the pencil traces every letter at once (the dash restarts on each contour), and a lighter second pass follows
      tk = seg(t, 0.12, 1.4);
      L.lines.forEach(function (ln, li) {
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
        var len = ln.size * 4.4, k1 = eo3(tk), k2 = eo3(seg(t, 0.4, 1.7));
        if (k1 > 0) {
          g.setLineDash([len * k1, len * 3]); g.strokeStyle = "rgba(34,36,44,.88)"; g.lineWidth = Math.max(1.6, ln.size * 0.024);
          ln.glyphs.forEach(function (gl) { g.strokeText(gl.ch, gl.x, ln.base); });
        }
        if (k2 > 0) {
          g.setLineDash([len * k2, len * 3]); g.strokeStyle = "rgba(34,36,44,.34)"; g.lineWidth = Math.max(1, ln.size * 0.013);
          ln.glyphs.forEach(function (gl, gi) { g.strokeText(gl.ch, gl.x + 1.5 + (gi % 2), ln.base - 1.2 + (gi % 3 - 1) * 0.6); });
        }
        if (li === L.lines.length - 1 && k1 > 0 && k1 < 1) { var e = ln.glyphs[ln.glyphs.length - 1]; tip = [lerp(B[0], e.x + e.w, k1), ln.base - ln.size * 0.35 * Math.abs(Math.sin(t * 9))]; }
      });
      g.setLineDash([]);
      // 2. hatching sweeps across the letters from the left
      var hk = seg(t, 1.15, 2.05);
      if (hk > 0) {
        g.save(); g.beginPath(); g.rect(B[0] - 4, B[1] - 20, (B[2] - B[0] + 8) * eo3(hk), B[3] - B[1] + 60); g.clip();
        g.fillStyle = C.hatch; g.globalAlpha = 0.85;
        L.lines.forEach(function (ln) { g.font = ln.font; ln.glyphs.forEach(function (gl) { g.fillText(gl.ch, gl.x, ln.base); }); });
        g.restore();
        if (hk < 1) tip = [B[0] + (B[2] - B[0]) * eo3(hk), lerp(B[3], B[1], (t * 7) % 1)];
      }
      // 3. doodles: the star, the swoosh (blue pencil), the light bulb with its rays
      g.strokeStyle = "rgba(34,36,44,.85)"; g.lineWidth = 2;
      var sk = seg(t, 1.5, 1.95), wk = seg(t, 1.75, 2.3), bk = seg(t, 2.0, 2.55), r;
      r = polyPart(g, C.star, eo3(sk)); if (sk > 0 && sk < 1) tip = r;
      g.strokeStyle = "rgba(43,80,166,.9)"; g.lineWidth = 3;
      r = polyPart(g, C.swoosh, eo3(wk)); if (wk > 0 && wk < 1) tip = r;
      g.strokeStyle = "rgba(34,36,44,.85)"; g.lineWidth = 2;
      r = polyPart(g, C.bulb, eo3(bk)); if (bk > 0 && bk < 1) tip = r;
      if (bk >= 1) {
        var bx = C.bpos[0], by = C.bpos[1], br = C.bpos[2], rk = eo3(seg(t, 2.55, 2.8));
        [-2.3, -1.57, -0.84].forEach(function (an) { g.beginPath(); g.moveTo(bx + Math.cos(an) * br * 1.35, by + Math.sin(an) * br * 1.35); g.lineTo(bx + Math.cos(an) * br * (1.35 + 0.45 * rk), by + Math.sin(an) * br * (1.35 + 0.45 * rk)); g.stroke(); });
      }
      // a handwritten subtitle
      var ta = eo3(seg(t, 2.2, 2.8)); g.globalAlpha = ta; g.fillStyle = "#2b50a6"; g.textAlign = "center";
      g.font = "700 " + clamp(W * 0.045, 16, 26) + "px " + HAND; g.fillText("a sketchbook of coins", W / 2, B[3] + clamp(H * 0.11, 44, 90)); g.globalAlpha = 1;
      if (tip) sketchPencil(g, tip[0], tip[1], clamp(Math.min(W, H) * 0.16, 60, 120), 0.95);
      if (!C.cued && t > 2.05) { C.cued = true; C.cue("land"); }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.07, C.frame); g.globalCompositeOperation = "source-over";
    }
  };
