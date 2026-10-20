  /* ============================== CATHEDRAL GLASS (cathedral, dark): a rose window lights pane by pane from the centre out, light shafts fall from it, the wordmark appears in the coloured light ============================== */
  var JEWEL = ["#c8141f", "#1a3dc8", "#0f8f4d", "#f29d1e", "#7a28a4"];
  STYLES.cathedral = {
    dur: 3.3, still: 3.0,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, k, i;
      var R = Math.min(W, H) * (C.portrait ? 0.34 : 0.3), cx = W / 2, cy = C.portrait ? H * 0.3 : H * 0.36;
      C.rose = { x: cx, y: cy, R: R };
      // panes: a centre disc, then rings of 8, 16 and 24 wedges; each lights at its own time, spiralling out
      var rings = [[0, 0.18, 1], [0.18, 0.42, 8], [0.42, 0.7, 16], [0.7, 1, 24]], P = [];
      rings.forEach(function (rg, ri) {
        for (i = 0; i < rg[2]; i++) {
          var a0 = i / rg[2] * PI2 - Math.PI / 2, a1 = (i + 1) / rg[2] * PI2 - Math.PI / 2;
          P.push({ r0: rg[0] * R, r1: rg[1] * R, a0: a0, a1: a1, c: ri === 0 ? "#f29d1e" : JEWEL[(i * (ri + 1) + ri) % 5], t: 0.15 + ri * 0.28 + (i / rg[2]) * 0.3 + rnd() * 0.08 });
        }
      });
      C.panes = P;
      C.L = wordmark(C, { cy: C.portrait ? H * 0.68 : H * 0.76, track: 0.12, font: function (s) { return "600 " + s + "px " + SERIF; }, maxSize: C.portrait ? 92 : 84, gap: 0.26 });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, L = C.L, ro = C.rose, i;
      var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0d0b14"); bg.addColorStop(1, "#07060b"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // light shafts from the window (drawn under the glass)
      var sk = eo3(seg(t, 1.2, 2.3));
      if (sk > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (i = 0; i < 7; i++) {
          var an = Math.PI / 2 + (i - 3) * 0.12, w = 0.05, len = H * 1.1, col = JEWEL[i % 5];
          var gr = g.createLinearGradient(ro.x, ro.y, ro.x + Math.cos(an) * len, ro.y + Math.sin(an) * len);
          gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
          g.globalAlpha = 0.16 * sk; g.fillStyle = gr; g.beginPath(); g.moveTo(ro.x, ro.y);
          g.lineTo(ro.x + Math.cos(an - w) * len, ro.y + Math.sin(an - w) * len); g.lineTo(ro.x + Math.cos(an + w) * len, ro.y + Math.sin(an + w) * len); g.closePath(); g.fill();
        }
        g.restore(); g.globalAlpha = 1;
      }
      // the rose: unlit panes are dark glass; each lights with a flash, then glows
      C.panes.forEach(function (p) {
        var k = seg(t, p.t, p.t + 0.35), lit = eo3(k);
        g.beginPath();
        if (p.r0 === 0) g.arc(ro.x, ro.y, p.r1, 0, PI2);
        else { g.arc(ro.x, ro.y, p.r1, p.a0, p.a1); g.arc(ro.x, ro.y, p.r0, p.a1, p.a0, true); g.closePath(); }
        g.fillStyle = "#15111d"; g.fill();
        if (lit > 0) {
          g.globalAlpha = lit; g.fillStyle = p.c; g.fill();
          if (k < 1) { g.globalAlpha = (1 - k) * 0.6; g.fillStyle = "#fff6e0"; g.fill(); }
          g.globalAlpha = 1;
        }
        g.strokeStyle = "#050407"; g.lineWidth = Math.max(2, ro.R * 0.02); g.stroke();
      });
      g.strokeStyle = "#2a2433"; g.lineWidth = Math.max(4, ro.R * 0.05); g.beginPath(); g.arc(ro.x, ro.y, ro.R, 0, PI2); g.stroke();
      var gl2 = eo3(seg(t, 0.9, 2.2));                                                      // light coming through: a warm bloom over the glass, darker toward the stone
      if (gl2 > 0) {
        var bl = g.createRadialGradient(ro.x - ro.R * 0.2, ro.y - ro.R * 0.25, 0, ro.x, ro.y, ro.R);
        bl.addColorStop(0, "rgba(255,240,210,.32)"); bl.addColorStop(0.55, "rgba(255,220,160,.08)"); bl.addColorStop(1, "rgba(0,0,0,.28)");
        g.save(); g.globalAlpha = gl2; g.fillStyle = bl; g.beginPath(); g.arc(ro.x, ro.y, ro.R, 0, PI2); g.fill();
        g.globalCompositeOperation = "lighter"; var halo = g.createRadialGradient(ro.x, ro.y, ro.R * 0.9, ro.x, ro.y, ro.R * 1.5);
        halo.addColorStop(0, "rgba(242,157,30,.18)"); halo.addColorStop(1, "rgba(242,157,30,0)"); g.fillStyle = halo; g.fillRect(ro.x - ro.R * 1.6, ro.y - ro.R * 1.6, ro.R * 3.2, ro.R * 3.2); g.restore();
      }
      // the wordmark in the light, cream with a warm glow
      var wa = eo3(seg(t, 1.8, 2.6));
      if (wa > 0) {
        g.save(); g.globalAlpha = wa; g.shadowColor = "rgba(242,157,30,.7)"; g.shadowBlur = 24;
        L.lines.forEach(function (ln, li) { g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = li === 0 ? "#f5cf7f" : "#f5f1ea";
          ln.glyphs.forEach(function (gl) { g.fillText(gl.ch, gl.x, ln.base); }); });
        g.restore();
        if (!C.cued) { C.cued = true; C.cue("land"); }
      }
      g.globalCompositeOperation = "lighter"; grain(g, W, H, 0.03, C.frame); g.globalCompositeOperation = "source-over";
    }
  };
