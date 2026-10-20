  /* ============================== MILLENNIUM CHROME (y2k, light): chrome letters pop up over a pastel grid, a glint sweeps them, sparkles burst ============================== */
  function chromeFill(g, x0, y0, y1) {             // the Y2K chrome ramp: white sky, a dark horizon line, periwinkle floor, a pink kiss at the bottom
    var gr = g.createLinearGradient(x0, y0, x0, y1);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.36, "#c9c6f2"); gr.addColorStop(0.5, "#2d2f6a"); gr.addColorStop(0.53, "#6f78d8");
    gr.addColorStop(0.78, "#cdd6ff"); gr.addColorStop(0.92, "#f6b8e4"); gr.addColorStop(1, "#ffffff");
    return gr;
  }
  function sparkle(g, x, y, r, col, a) {
    if (a <= 0.01 || r <= 0.5) return;
    g.save(); g.globalAlpha = a; g.fillStyle = col; g.translate(x, y); g.beginPath();
    g.moveTo(0, -r); g.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); g.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
    g.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); g.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r); g.fill(); g.restore();
  }
  STYLES.y2k = {
    dur: 3.0, still: 2.6,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i;
      C.L = wordmark(C, { cy: H * 0.46, track: 0.06, font: function (s) { return "900 italic " + s + "px " + HEAVY; }, maxSize: C.portrait ? 120 : 118, gap: 0.16 });
      C.sp = []; for (i = 0; i < 26; i++) C.sp.push({ x: rnd(), y: rnd() * 0.8 + 0.05, r: 6 + rnd() * 16, t: 0.6 + rnd() * 1.9, c: rnd() < 0.5 ? "#6d3fd0" : "#d63aa0" });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, L = C.L, i;
      var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#f5f3ff"); bg.addColorStop(0.55, pal.bg); bg.addColorStop(1, "#e3dcfb");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // the retro grid: horizon just under the wordmark, lines rushing toward the viewer
      var hy = H * 0.66, ga = eo3(seg(t, 0, 0.6));
      g.save(); g.globalAlpha = 0.5 * ga; g.strokeStyle = "#8a6fe0"; g.lineWidth = 1.2;
      for (i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(W / 2 + i * W * 0.02, hy); g.lineTo(W / 2 + i * W * 0.26, H); g.stroke(); }
      for (i = 0; i < 12; i++) { var z = ((i + (t * 1.6) % 1) / 12), y = hy + (H - hy) * z * z; g.globalAlpha = 0.5 * ga * z; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.restore();
      var hz = g.createLinearGradient(0, hy - 30, 0, hy + 6); hz.addColorStop(0, "rgba(246,184,228,0)"); hz.addColorStop(1, "rgba(246,184,228,.55)");
      g.fillStyle = hz; g.fillRect(0, hy - 30, W, 36);
      // chrome letters: each pops up from the horizon with a little overshoot, then the glint sweeps the whole word
      var top = L.cy - L.h / 2, bot = L.cy + L.h / 2;
      L.lines.forEach(function (ln, li) {
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
        var fill = chromeFill(g, 0, ln.top, ln.base + ln.size * 0.06);
        ln.glyphs.forEach(function (gl, gi) {
          var t0 = 0.35 + li * 0.25 + gi * 0.045, k = seg(t, t0, t0 + 0.55); if (k <= 0) return;
          var p = eob(k, 1.8), dy = (1 - p) * H * 0.18, sy = 0.35 + 0.65 * p;
          g.save(); g.translate(gl.x + gl.w / 2, ln.base + dy); g.scale(1, sy); g.translate(-(gl.x + gl.w / 2), -ln.base);
          g.globalAlpha = Math.min(1, k * 2.2);
          g.lineWidth = Math.max(3, ln.size * 0.07); g.strokeStyle = "#2d2f6a"; g.lineJoin = "round"; g.strokeText(gl.ch, gl.x, ln.base);
          g.fillStyle = fill; g.fillText(gl.ch, gl.x, ln.base);
          g.restore();
        });
      });
      // the glint: a soft white diagonal band clipped to the letters
      var gk = seg(t, 1.6, 2.4);
      if (gk > 0 && gk < 1) {
        g.save(); g.beginPath();
        L.lines.forEach(function (ln) { g.font = ln.font; ln.glyphs.forEach(function (gl) { g.rect(gl.x - 2, ln.top - ln.size * 0.1, gl.w + 4, ln.size * 0.95); }); });
        g.clip();
        var gx = lerp(-W * 0.3, W * 1.3, gk), gg = g.createLinearGradient(gx - 80, 0, gx + 80, 0);
        gg.addColorStop(0, "rgba(255,255,255,0)"); gg.addColorStop(0.5, "rgba(255,255,255,.85)"); gg.addColorStop(1, "rgba(255,255,255,0)");
        g.globalCompositeOperation = "lighter"; g.fillStyle = gg;
        L.lines.forEach(function (ln) { g.font = ln.font; ln.glyphs.forEach(function (gl) { g.fillText(gl.ch, gl.x, ln.base); }); });
        g.restore();
      }
      // a small subtitle in the period's lowercase sans
      var sa = eo3(seg(t, 1.5, 2.1)); g.globalAlpha = sa; g.fillStyle = "#4a28a6"; g.textAlign = "center";
      g.font = "700 " + clamp(W * 0.034, 12, 18) + "px " + GEO; g.fillText("m i l l e n n i u m   c h r o m e", W / 2, bot + clamp(H * 0.06, 26, 54)); g.globalAlpha = 1;
      // sparkles pop and twinkle
      C.sp.forEach(function (s) { var k = seg(t, s.t, s.t + 0.5), a = k > 0 ? Math.sin(Math.min(1, k) * Math.PI) : 0; sparkle(g, s.x * W, s.y * H, s.r * (0.4 + 0.6 * a), s.c, a * 0.85); });
      if (!C.cued && t > 1.6) { C.cued = true; C.cue("land"); }
    }
  };
