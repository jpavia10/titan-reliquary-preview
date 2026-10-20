  /* ============================== SURVEY MAP (contour, dark): contour lines rise level by level out of the dark, a sweep passes, the wordmark settles in with its coordinates ============================== */
  function ctHeight(x, y, hills) {                // a few round hills plus a gentle ripple, in screen-height units
    var h = 0.08 * Math.sin(x * 6.1 + y * 2.3) * Math.sin(y * 4.7 - x * 1.9), i;
    for (i = 0; i < hills.length; i++) { var o = hills[i], dx = x - o[0], dy = y - o[1]; h += o[2] * Math.exp(-(dx * dx + dy * dy) / (o[3] * o[3])); }
    return h;
  }
  function ctContours(W, H, hills, nLev) {        // marching squares once at start: for each level, a flat list of segment end points
    var S = H / 120, nx = Math.ceil(W / S) + 1, ny = 121, v = new Float32Array(nx * ny), out = [], i, j, k, lo = 1e9, hi = -1e9;
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { var z = ctHeight(i * S / H, j * S / H, hills); v[j * nx + i] = z; lo = Math.min(lo, z); hi = Math.max(hi, z); }
    var levels = []; for (k = 0; k < nLev; k++) levels.push(lo + (hi - lo) * (0.04 + 0.92 * k / (nLev - 1)));   // evenly over the terrain's own range
    for (k = 0; k < levels.length; k++) {
      var L = levels[k], seg2 = [];
      for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
        var a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
        var m = (a > L ? 1 : 0) | (b > L ? 2 : 0) | (c > L ? 4 : 0) | (d > L ? 8 : 0); if (m === 0 || m === 15) continue;
        var x0 = i * S, y0 = j * S, pts = [];
        if ((m & 1) !== (m >> 1 & 1)) pts.push([x0 + S * (L - a) / (b - a), y0]);
        if ((m >> 1 & 1) !== (m >> 2 & 1)) pts.push([x0 + S, y0 + S * (L - b) / (c - b)]);
        if ((m >> 2 & 1) !== (m >> 3 & 1)) pts.push([x0 + S * (L - d) / (c - d), y0 + S]);
        if ((m >> 3 & 1) !== (m & 1)) pts.push([x0, y0 + S * (L - a) / (d - a)]);
        if (pts.length >= 2) seg2.push(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
        if (pts.length === 4) seg2.push(pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
      }
      out.push(seg2);
    }
    return out;
  }
  STYLES.contour = {
    dur: 3.2, still: 2.9,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, A = W / H, hills = [], i;
      for (i = 0; i < 13; i++) hills.push([rnd() * A, rnd(), (rnd() < 0.3 ? -0.2 : 0.18) + rnd() * 0.3, 0.07 + rnd() * 0.16]);
      C.cts = ctContours(W, H, hills, 18);
      C.L = wordmark(C, { cy: H * 0.45, track: 0.18, font: function (s) { return "700 " + s + "px " + GEO; }, maxSize: C.portrait ? 96 : 92, gap: 0.3 });
      C.coord = "N 40° 44′ 54″   W 73° 59′ 08″   ELEV 306";
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, L = C.L, i, k;
      g.fillStyle = "#0b1315"; g.fillRect(0, 0, W, H);
      // contour lines rise level by level, low to high; every fifth line is an index contour
      for (k = 0; k < C.cts.length; k++) {
        var a = eo3(seg(t, 0.05 + k * 0.07, 0.5 + k * 0.07)); if (a <= 0) continue;
        var hh = k / (C.cts.length - 1), idx = k % 5 === 0;
        var lo = [26, 107, 132], mi = [92, 224, 189], hi = [242, 204, 133], u = hh < 0.5 ? hh * 2 : hh * 2 - 1, A0 = hh < 0.5 ? lo : mi, B0 = hh < 0.5 ? mi : hi;   // valley teal, mint, peak sand
        var r = Math.round(lerp(A0[0], B0[0], u)), gg = Math.round(lerp(A0[1], B0[1], u)), b = Math.round(lerp(A0[2], B0[2], u));
        g.strokeStyle = "rgba(" + r + "," + gg + "," + b + "," + ((idx ? 0.85 : 0.5) * a).toFixed(3) + ")"; g.lineWidth = idx ? 1.8 : 1;
        var s = C.cts[k]; g.beginPath();
        for (i = 0; i < s.length; i += 4) { g.moveTo(s[i], s[i + 1]); g.lineTo(s[i + 2], s[i + 3]); }
        g.stroke();
      }
      // a radar sweep passes across once, brightening what it touches
      var sw = seg(t, 0.9, 2.0);
      if (sw > 0 && sw < 1) {
        var sx = lerp(-W * 0.1, W * 1.1, eo3(sw)), gr = g.createLinearGradient(sx - 120, 0, sx + 20, 0);
        gr.addColorStop(0, "rgba(111,227,196,0)"); gr.addColorStop(0.85, "rgba(111,227,196,.16)"); gr.addColorStop(1, "rgba(255,200,120,.5)");
        g.fillStyle = gr; g.fillRect(sx - 120, 0, 140, H);
      }
      // the wordmark: a dark plate behind it, letters fade up with wide tracking
      var wa = eo3(seg(t, 1.2, 2.0));
      if (wa > 0) {
        g.globalAlpha = 0.72 * wa; g.fillStyle = "#0b1315";
        g.fillRect(L.cx - L.w / 2 - 24, L.cy - L.h / 2 - 22, L.w + 48, L.h + 44); g.globalAlpha = 1;
        g.strokeStyle = "rgba(255,181,71," + (0.8 * wa).toFixed(3) + ")"; g.lineWidth = 1.5; g.strokeRect(L.cx - L.w / 2 - 24, L.cy - L.h / 2 - 22, L.w + 48, L.h + 44);
        L.lines.forEach(function (ln, li) {
          g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
          ln.glyphs.forEach(function (gl, gi) { var k2 = eo3(seg(t, 1.25 + gi * 0.03 + li * 0.15, 1.75 + gi * 0.03 + li * 0.15)); if (k2 <= 0) return;
            g.globalAlpha = k2; g.fillStyle = li === 0 ? "#ffb547" : "#eef6f4"; g.fillText(gl.ch, gl.x, ln.base + (1 - k2) * 10); });
        });
        g.globalAlpha = 1;
      }
      // coordinates type in under the plate
      var cn = Math.floor(C.coord.length * seg(t, 1.9, 2.6));
      g.fillStyle = "#9fb5b0"; g.textAlign = "center"; g.font = "600 " + clamp(W * 0.028, 11, 15) + "px " + '"Courier New", ui-monospace, monospace';
      g.fillText(C.coord.slice(0, cn), W / 2, L.cy + L.h / 2 + clamp(H * 0.08, 40, 70));
      if (!C.cued && t > 1.8) { C.cued = true; C.cue("land"); }
    }
  };
