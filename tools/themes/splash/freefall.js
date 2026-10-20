  /* ============================== FREE FALL (freefall, dark): coins rain down and bounce into a heap, then the letters drop in one by one and bounce to rest ============================== */
  function bounceOut(x) {                         // the standard bounce: three ever-smaller bounces after the first landing
    x = clamp(x, 0, 1);
    if (x < 1 / 2.75) return 7.5625 * x * x;
    if (x < 2 / 2.75) { x -= 1.5 / 2.75; return 7.5625 * x * x + 0.75; }
    if (x < 2.5 / 2.75) { x -= 2.25 / 2.75; return 7.5625 * x * x + 0.9375; }
    x -= 2.625 / 2.75; return 7.5625 * x * x + 0.984375;
  }
  function ffCoin(g, x, y, r, a, k) {             // a lit metal disc with a reeded rim and a star that turns with it
    var m = k === 0 ? ["#fff1b8", "#f2c14e", "#8a6214"] : k === 1 ? ["#ffffff", "#c9ced8", "#5d6470"] : ["#ffd9bf", "#d0814f", "#6b3417"];
    var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, m[0]); gr.addColorStop(0.55, m[1]); gr.addColorStop(1, m[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, PI2); g.fill();
    g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = Math.max(1, r * 0.08); g.beginPath(); g.arc(x, y, r * 0.8, 0, PI2); g.stroke();
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath();
    for (var i = 0; i < 10; i++) { var an = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 0.2 : 0.46) * r; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    g.closePath(); g.fill(); g.restore();
  }
  STYLES.freefall = {
    dur: 3.2, still: 2.9,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i;
      C.L = wordmark(C, { cy: H * 0.4, track: 0.05, font: function (s) { return "900 " + s + "px " + HEAVY; }, maxSize: C.portrait ? 112 : 108, gap: 0.2 });
      // a heap of coins resting on the floor: rows that get shorter toward the top, each coin dropped from a different height and time
      var R = Math.min(W, H) * (C.portrait ? 0.045 : 0.034), row = 0, cs = [], cols = Math.floor(W / (2 * R)) + 1;
      while (cs.length < 70 && row < 5) {
        var span = cols - row * Math.max(2, Math.floor(cols * 0.18)), x0 = (W - span * 2 * R) / 2 + R + (row % 2) * R;
        for (i = 0; i < span && cs.length < 70; i++) {
          var r = R * (0.8 + 0.25 * rnd());
          cs.push({ x: x0 + i * 2 * R + (rnd() - 0.5) * R * 0.3, y: H - R - row * R * 1.72 - (r - R), r: r, t0: 0.05 + rnd() * 1.1 + row * 0.18, d: 0.55 + rnd() * 0.25,
            h: H * (0.5 + rnd() * 0.6), a: rnd() * 6.28, sp: (rnd() - 0.5) * 7, k: rnd() < 0.45 ? 0 : rnd() < 0.6 ? 1 : 2 });
        }
        row++;
      }
      C.cs = cs;
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, L = C.L, i;
      var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0b0e14"); bg.addColorStop(1, "#151a24"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // a faint measuring grid, like the back wall of a physics lab
      g.strokeStyle = "rgba(160,180,220,.07)"; g.lineWidth = 1; var gs = Math.max(28, Math.min(W, H) / 14);
      g.beginPath(); for (i = gs; i < W; i += gs) { g.moveTo(i, 0); g.lineTo(i, H); } for (i = gs; i < H; i += gs) { g.moveTo(0, i); g.lineTo(W, i); } g.stroke();
      // coins: fall, land with a bounce, keep turning until they rest
      C.cs.forEach(function (c) {
        var k = (t - c.t0) / c.d; if (k <= 0) return;
        var y = c.y - (1 - bounceOut(k)) * c.h, a = c.a + c.sp * Math.min(1, k) * (1 - 0.5 * Math.min(1, k));
        var near = Math.pow(bounceOut(k), 6); if (near > 0.05) { g.fillStyle = "rgba(0,0,0," + (0.35 * near).toFixed(3) + ")"; g.beginPath(); g.ellipse(c.x + c.r * 0.12, c.y + c.r * 0.92, c.r * 0.9 * Math.min(1, k), c.r * 0.18, 0, 0, PI2); g.fill(); }
        ffCoin(g, c.x, y, c.r, a, c.k);
      });
      // the letters drop one by one, bounce and settle, tilting as they land
      L.lines.forEach(function (ln, li) {
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
        ln.glyphs.forEach(function (gl, gi) {
          var t0 = 0.55 + li * 0.32 + gi * 0.07, k = (t - t0) / 0.8; if (k <= 0) return;
          var b = bounceOut(k), dy = -(1 - b) * (ln.base + ln.size), rot = (1 - Math.min(1, k * 1.3)) * (gi % 2 ? 0.25 : -0.22);
          var cx = gl.x + gl.w / 2;
          g.save(); g.translate(cx, ln.base + dy); g.rotate(rot); g.translate(-cx, -ln.base);
          g.fillStyle = li === 0 ? "#ffcc4d" : "#f3f5f9"; g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 14; g.shadowOffsetY = 6;
          g.fillText(gl.ch, gl.x, ln.base); g.restore();
        });
      });
      var sa = eo3(seg(t, 2.1, 2.7)); g.globalAlpha = sa; g.fillStyle = "#cdd3df"; g.textAlign = "center";
      g.font = "600 " + clamp(W * 0.03, 12, 17) + "px " + SANS; g.fillText("9.81 m/s²  ·  tap to knock the coins", W / 2, L.cy + L.h / 2 + clamp(H * 0.07, 30, 60)); g.globalAlpha = 1;
      if (!C.cued && t > 1.5) { C.cued = true; C.cue("land"); }
    }
  };
