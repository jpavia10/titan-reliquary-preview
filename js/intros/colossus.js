/* The Mint intro (Grok, 2026-10-20, v2: minting, from first principles). Five hard-cut stations of a coin mint, each with
   its own camera, then the payoff:
   1 POUR    low side view: a crucible tips, a white-hot stream falls into an ingot mould, sparks, heat bloom.
   2 ROLL    two giant chromed rolls spin and squeeze the cooling strip, glow fading orange -> steel as it thins.
   3 BLANK   top-down: the strip feeds under a punch that slams three times; each hit drops a blank.
   4 UPSET   the blanks rattle edge-on down a chute and through the upsetting mill, coming out with a raised rim.
   5 STRIKE  the upper die drops onto one blank: white flash, shockwave ring, camera shake.
   6 TRAY    the struck coin spins out, flips, lands on a tray of coins, a light sweep catches its relief, and the
             legend around its rim reads TITAN RELIQUARY.
   Sound: pour hiss + roar, roll rumble, three punch thuds, blank clatter, the strike (sub + crack + metal), the coin's ring.
   Canvas 2D. Lite drops sparks/shadows; reduced motion shows the final tray still. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var T = { pour: [0, 0.75], roll: [0.75, 1.35], blank: [1.35, 1.95], upset: [1.95, 2.45], strike: [2.45, 3.0], tray: [3.0, 4.8] }, HIT = 2.72;
  function steel(g, x0, y0, x1, y1, hot) {
    var gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, K.mixc("#5d6268", "#ff7a1a", hot)); gr.addColorStop(0.35, K.mixc("#e9edf2", "#fff2b0", hot)); gr.addColorStop(0.55, K.mixc("#8a9097", "#ffb02a", hot)); gr.addColorStop(1, K.mixc("#3a3e44", "#c23a08", hot)); return gr;
  }
  function face(R) {                                         // the struck coin's face, rendered once
    var s = Math.ceil(R * 2 + 4), c = K.mk(s, s), g = c.getContext("2d"), cx = s / 2, cy = s / 2, i;
    var gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R); gr.addColorStop(0, "#f6d68a"); gr.addColorStop(0.4, "#c8902e"); gr.addColorStop(0.8, "#8a5a16"); gr.addColorStop(1, "#4a2c08");
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, K.PI2); g.fill();
    g.lineWidth = R * 0.07; g.strokeStyle = "#f6d987"; g.beginPath(); g.arc(cx, cy, R * 0.955, 0, K.PI2); g.stroke();
    g.fillStyle = "#7a4e14"; for (i = 0; i < 72; i++) { var a = i / 72 * K.PI2; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, R * 0.012, 0, K.PI2); g.fill(); }
    // legend around the rim
    var str = "TITAN \u2022 RELIQUARY \u2022 MMXXVI \u2022", fs = R * 0.17; g.font = "700 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
    var tot = 0, ws = []; for (i = 0; i < str.length; i++) { ws.push(g.measureText(str[i]).width + fs * 0.08); tot += ws[i]; }
    var a0 = -Math.PI / 2 - (tot / (R * 0.72)) / 2;
    for (i = 0; i < str.length; i++) { var aa = a0 + (ws[i] / 2) / (R * 0.72); g.save(); g.translate(cx + Math.cos(aa) * R * 0.72, cy + Math.sin(aa) * R * 0.72); g.rotate(aa + Math.PI / 2);
      g.fillStyle = "#3a2004"; g.fillText(str[i], 1.2, 1.2); g.fillStyle = "#ffe9a8"; g.fillText(str[i], 0, 0); g.restore(); a0 += ws[i] / (R * 0.72); }
    // central device: a reliquary casket in relief, with a small sun behind it
    g.save(); g.translate(cx, cy + R * 0.05); var u = R * 0.2;
    function relief(fn) { g.save(); g.translate(1.2, 1.4); g.fillStyle = "rgba(50,28,4,.9)"; fn(); g.restore(); g.save(); g.translate(-0.8, -0.8); g.fillStyle = "rgba(255,248,215,.9)"; fn(); g.restore(); g.fillStyle = "#e0ac48"; fn(); }
    for (i = 0; i < 16; i++) { var b = i / 16 * K.PI2; relief(function () { g.save(); g.rotate(b); g.fillRect(-u * 0.04, -u * 2.2, u * 0.08, u * 0.6); g.restore(); }); }
    relief(function () { g.beginPath(); g.moveTo(-u * 1.3, -u * 0.2); g.lineTo(0, -u * 1.3); g.lineTo(u * 1.3, -u * 0.2); g.closePath(); g.fill(); });
    relief(function () { g.fillRect(-u * 1.15, -u * 0.2, u * 2.3, u * 1.4); });
    relief(function () { g.fillRect(-u * 1.35, u * 1.2, u * 2.7, u * 0.25); });
    g.fillStyle = "#8a5a18"; g.fillRect(-u * 0.12, u * 0.2, u * 0.24, u * 0.6); g.restore();
    g.font = "700 " + R * 0.1 + "px " + K.MONO; g.fillStyle = "#7a4e14"; g.fillText("No. 34", cx, cy + R * 0.55);
    return c;
  }
  function plainCoin(g, x, y, r, sx, rim) {                 // blank / tray coin, sx = horizontal squash for spin
    g.save(); g.translate(x, y); g.scale(Math.max(0.04, Math.abs(sx)), 1);
    var gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r); gr.addColorStop(0, "#fff0c4"); gr.addColorStop(0.6, "#d0a048"); gr.addColorStop(1, "#7a4e14");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, K.PI2); g.fill(); if (rim) { g.strokeStyle = "#f2d07a"; g.lineWidth = r * 0.12; g.beginPath(); g.arc(0, 0, r * 0.92, 0, K.PI2); g.stroke(); } g.restore();
  }
  function sparks(g, x, y, t, n, spread, lite) { if (lite) n = Math.ceil(n / 3); for (var i = 0; i < n; i++) { var ph = (t * 1.7 + K.hash(i)) % 1, a = -Math.PI / 2 + (K.hash(i + 9) - 0.5) * spread, v = 160 + 220 * K.hash(i + 3);
      var px = x + Math.cos(a) * v * ph, py = y + Math.sin(a) * v * ph + 300 * ph * ph; g.strokeStyle = "rgba(255," + (200 - ph * 120 | 0) + ",80," + (1 - ph) + ")"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px, py); g.lineTo(px - Math.cos(a) * 7, py - Math.sin(a) * 7 - 6 * ph); g.stroke(); } }
  function label(g, W, H, s, k) { g.font = "600 " + Math.max(12, W * 0.03) + "px " + K.MONO; g.textAlign = "left"; g.textBaseline = "top"; g.fillStyle = "rgba(255,200,120,.75)"; g.fillText("0" + k + " \u2014 " + s, 18, H - 44); g.fillStyle = "rgba(255,200,120,.35)"; g.fillRect(18, H - 26, W * 0.3, 1); }
  I.reg("colossus", {
    dur: 4.8, still: 4.6,
    init: function (C) { C.R = Math.min(C.W, C.H) * 0.36; C.face = face(C.R); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, lite = C.lite, i, M = Math.min(W, H), cx = W / 2, cy = H * 0.46, e, k;
      var shake = 0;
      [1.52, 1.7, 1.88].forEach(function (h) { var d = t - h; if (d > 0 && d < 0.12) shake = Math.max(shake, 5 * (1 - d / 0.12)); });
      if (t > HIT && t < HIT + 0.35) shake = 16 * (1 - (t - HIT) / 0.35);
      g.save(); if (shake && !lite) g.translate((K.hash(t * 97) - 0.5) * shake, (K.hash(t * 61) - 0.5) * shake);
      var bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8); bg.addColorStop(0, "#26221e"); bg.addColorStop(1, "#08070a"); g.fillStyle = bg; g.fillRect(-20, -20, W + 40, H + 40);

      if (t < T.pour[1]) {                                         // 1 POUR
        e = seg(t, 0, 0.75); var tip = K.eio(seg(t, 0, 0.25)) * 0.9, z = 1 + e * 0.12; g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
        var mx = cx - M * 0.32, my = cy + M * 0.38, mw = M * 0.64, mh = M * 0.18;
        g.fillStyle = steel(g, 0, my, 0, my + mh, 0); g.fillRect(mx - 8, my - 8, mw + 16, mh + 16);
        var fill = K.eo2(seg(t, 0.2, 0.75)); var hot = g.createLinearGradient(0, my, 0, my + mh); hot.addColorStop(0, "#fff8d0"); hot.addColorStop(0.4, "#ffb030"); hot.addColorStop(1, "#d04a08"); g.fillStyle = hot; g.fillRect(mx, my + mh * (1 - fill), mw, mh * fill);
        g.save(); g.translate(cx + M * 0.2, cy - M * 0.42); g.rotate(-tip); g.fillStyle = steel(g, -M * 0.16, 0, M * 0.16, 0, 0.15); g.beginPath(); g.moveTo(-M * 0.16, -M * 0.2); g.lineTo(M * 0.16, -M * 0.2); g.lineTo(M * 0.12, M * 0.1); g.lineTo(-M * 0.12, M * 0.1); g.closePath(); g.fill();
        g.fillStyle = "#ffe8a0"; g.fillRect(-M * 0.15, -M * 0.2, M * 0.3, 5); g.restore();
        if (tip > 0.4) { var sx0 = cx + M * 0.03, sy0 = cy - M * 0.36, w = M * 0.035 * (1 + 0.15 * Math.sin(t * 40)); var sg = g.createLinearGradient(sx0 - w, 0, sx0 + w, 0); sg.addColorStop(0, "#ff8a20"); sg.addColorStop(0.5, "#fffbe0"); sg.addColorStop(1, "#ff8a20"); g.fillStyle = sg;
          g.beginPath(); g.moveTo(sx0 - w * 0.6, sy0); g.quadraticCurveTo(sx0 - w * 1.1, cy, sx0 - w, my + mh * (1 - fill)); g.lineTo(sx0 + w, my + mh * (1 - fill)); g.quadraticCurveTo(sx0 + w * 1.1, cy, sx0 + w * 0.6, sy0); g.fill();
          if (!lite) sparks(g, sx0, my + mh * (1 - fill), t, 30, 2.2, lite); }
        g.globalCompositeOperation = "lighter"; var hb = g.createRadialGradient(cx, my, 0, cx, my, M * 0.7); hb.addColorStop(0, "rgba(255,140,40," + 0.45 * fill + ")"); hb.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = hb; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
        g.restore(); label(g, W, H, "POUR  \u00b7  1,064 \u00b0C", 1);
      } else if (t < T.roll[1]) {                                  // 2 ROLL
        e = seg(t, T.roll[0], T.roll[1]); var rr = M * 0.3, gap = M * 0.05, ang = t * 9;
        var heat = 1 - e * 0.85, sy = cy, sxp = K.lerp(-W * 0.2, W * 0.1, e);
        // strip: thick on the left, thin on the right
        g.fillStyle = steel(g, 0, sy - gap, 0, sy + gap, heat); g.fillRect(-20, sy - gap * 2.2, cx + 20, gap * 4.4); g.fillStyle = steel(g, 0, sy - gap, 0, sy + gap, heat * 0.6); g.fillRect(cx, sy - gap * 0.9, W, gap * 1.8);
        for (i = 0; i < 14; i++) { var lx = ((i * 60 + t * 600) % (W + 60)) - 30; g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(lx, sy - (lx < cx ? gap * 2.2 : gap * 0.9), 2, lx < cx ? gap * 4.4 : gap * 1.8); }
        [-1, 1].forEach(function (sd) { var ry = sy + sd * (rr + gap * 0.9); g.save(); g.translate(cx, ry); g.fillStyle = steel(g, -rr, -rr, rr, rr, 0); g.beginPath(); g.arc(0, 0, rr, 0, K.PI2); g.fill();
          g.rotate(ang * -sd); for (var j = 0; j < 8; j++) { g.rotate(K.PI2 / 8); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(rr * 0.2, -2, rr * 0.75, 4); } g.fillStyle = "#2a2d32"; g.beginPath(); g.arc(0, 0, rr * 0.22, 0, K.PI2); g.fill(); g.restore(); });
        g.globalCompositeOperation = "lighter"; var nip = g.createRadialGradient(cx, sy, 0, cx, sy, M * 0.25); nip.addColorStop(0, "rgba(255,150,50," + heat * 0.6 + ")"); nip.addColorStop(1, "rgba(255,80,0,0)"); g.fillStyle = nip; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
        if (!lite) sparks(g, cx - gap, sy - gap, t, 14, 1.2, lite);
        label(g, W, H, "ROLLING MILL  \u00b7  18 \u2192 1.9 mm", 2);
      } else if (t < T.blank[1]) {                                 // 3 BLANK (top-down)
        e = seg(t, T.blank[0], T.blank[1]); var bw = M * 0.42, br = bw * 0.36, holes = 0, hitT = [1.52, 1.7, 1.88];
        hitT.forEach(function (h) { if (t > h) holes++; }); var feed = holes * br * 2.4 + (t > hitT[2] ? (t - hitT[2]) * 300 : 0);
        g.fillStyle = steel(g, cx - bw, 0, cx + bw, 0, 0); g.fillRect(cx - bw, -20, bw * 2, H + 40);
        g.fillStyle = "#0e0d0f"; for (i = 0; i < holes; i++) { g.beginPath(); g.arc(cx, cy + feed - i * br * 2.4, br, 0, K.PI2); g.fill(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5; g.stroke(); }
        // the punch: a cylinder seen from above, scaling to show it descend
        var last = -1; hitT.forEach(function (h) { if (t > h - 0.12) last = h; }); var pd = last < 0 ? 0 : (t < last ? 1 - (last - t) / 0.12 : Math.max(0, 1 - (t - last) / 0.1));
        var ps = 1.45 - pd * 0.45; g.save(); if (!lite) { g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 30 * (1 - pd); g.shadowOffsetY = 20 * (1 - pd); }
        g.fillStyle = steel(g, cx - br * ps, cy - br * ps, cx + br * ps, cy + br * ps, 0); g.beginPath(); g.arc(cx, cy, br * ps * 1.02, 0, K.PI2); g.fill(); g.restore();
        g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, br * ps * 0.7, 0, K.PI2); g.stroke();
        if (pd > 0.95) { g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,240,200,.35)"; g.beginPath(); g.arc(cx, cy, br * 1.6, 0, K.PI2); g.fill(); g.globalCompositeOperation = "source-over"; }
        label(g, W, H, "BLANKING PRESS  \u00b7  3 HITS", 3);
      } else if (t < T.upset[1]) {                                 // 4 UPSET (edge-on chute)
        e = seg(t, T.upset[0], T.upset[1]); var ch = cy + M * 0.1, rc = M * 0.16;
        g.save(); g.translate(cx, ch); g.rotate(-0.12); g.fillStyle = steel(g, 0, 0, 0, 30, 0); g.fillRect(-W, 0, W * 2, 34); g.restore();
        g.fillStyle = steel(g, cx - M * 0.18, 0, cx + M * 0.18, 0, 0); g.fillRect(cx - M * 0.1, ch - M * 0.5, M * 0.2, M * 0.38); g.fillRect(cx - M * 0.1, ch + 26, M * 0.2, M * 0.28);   // mill dies
        g.fillStyle = "#ffcf5a"; g.fillRect(cx - M * 0.1, ch - M * 0.12 - 3, M * 0.2, 3);
        for (k = 0; k < 6; k++) { var px = K.lerp(-W * 0.3, W * 1.3, (e * 1.3 + k * 0.16) % 1.4 / 1.4) , py = ch - rc - (px - cx) * Math.tan(-0.12) - 2 + Math.abs(Math.sin(t * 30 + k)) * -4;
          var rim = px > cx; g.save(); g.translate(px, py); g.scale(0.35, 1); plainCoin(g, 0, 0, rc, 1, rim); g.restore();
          if (Math.abs(px - cx) < 20 && !lite) sparks(g, cx, ch - rc, t, 8, 1.0, lite); }
        label(g, W, H, "UPSETTING MILL  \u00b7  RAISING THE RIM", 4);
      } else if (t < T.strike[1]) {                                // 5 STRIKE (low side view)
        var dz = t < HIT ? K.ei3(seg(t, T.strike[0], HIT)) : 1 - K.eo2(seg(t, HIT + 0.05, 3.0)) * 0.3, dw = M * 0.34, base = cy + M * 0.22;
        g.fillStyle = steel(g, cx - dw, 0, cx + dw, 0, 0); g.fillRect(cx - dw, base, dw * 2, M * 0.5);                  // anvil die
        g.fillStyle = "#e2b04a"; g.fillRect(cx - dw * 0.8, base - M * 0.035, dw * 1.6, M * 0.035);                      // the blank
        var top = K.lerp(-M * 0.9, base - M * 0.035 - M * 0.6, dz); g.fillStyle = steel(g, cx - dw, 0, cx + dw, 0, 0); g.fillRect(cx - dw, top, dw * 2, M * 0.6);
        g.fillStyle = "#1b1c1f"; g.fillRect(cx - dw * 1.4, top - M * 0.5, dw * 2.8, M * 0.5);
        if (t >= HIT) { var f = seg(t, HIT, HIT + 0.28); g.globalCompositeOperation = "lighter"; var fg = g.createRadialGradient(cx, base, 0, cx, base, M * 0.9); fg.addColorStop(0, "rgba(255,250,235," + (1 - K.eo2(f)) + ")"); fg.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = fg; g.fillRect(-20, -20, W + 40, H + 40);
          g.strokeStyle = "rgba(255,220,150," + (1 - f) + ")"; g.lineWidth = 6 * (1 - f) + 1; g.beginPath(); g.ellipse(cx, base, M * 1.4 * K.eo3(f), M * 0.3 * K.eo3(f), 0, 0, K.PI2); g.stroke(); g.globalCompositeOperation = "source-over";
          if (!lite) sparks(g, cx - dw * 0.8, base, t, 16, 2.6, lite), sparks(g, cx + dw * 0.8, base, t + 0.3, 16, 2.6, lite); }
        label(g, W, H, "COINING PRESS  \u00b7  1,200 kN", 5);
      } else {                                                     // 6 TRAY
        e = seg(t, T.tray[0], 4.0); var R = C.R;
        // tray of struck coins (perspective rows)
        var ty = cy + R * 0.2; g.fillStyle = "#121014"; g.fillRect(-20, ty - R * 0.2, W + 40, H);
        for (k = 0; k < 18; k++) { if (Math.floor(k / 6) === 0 && false) continue; var row = Math.floor(k / 6), col = k % 6, rs = 0.8 + row * 0.18, rx = (col - 2.5) * R * 0.6 * rs + (row % 2) * R * 0.3, ry = ty + R * 0.45 + row * R * 0.28 * rs; g.save(); g.translate(cx + rx, ry); g.scale(1, 0.38); g.fillStyle = "#4a2c08"; g.beginPath(); g.arc(0, 8, R * 0.27 * rs, 0, K.PI2); g.fill(); plainCoin(g, 0, 0, R * 0.27 * rs, 1, 1); g.restore(); }
        // the hero coin: flies in spinning, lands with a damped wobble
        var fl = K.eo3(e), spin = (1 - fl) * 9 + (t > 4.0 ? Math.sin((t - 4.0) * 14) * Math.exp(-(t - 4.0) * 5) * 0.15 : 0), sx = Math.cos(spin * Math.PI);
        var hx = cx, hy = K.lerp(-R * 1.4, cy - R * 0.25, fl) - Math.sin(fl * Math.PI) * R * 0.3;
        if (!lite) { g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(hx, ty + R * 0.7, R * fl, R * 0.18 * fl, 0, 0, K.PI2); g.fill(); }
        g.save(); g.translate(hx, hy); var sc = K.lerp(0.5, 1, fl); g.scale(Math.max(0.05, Math.abs(sx)) * sc, sc);
        if (sx < 0) { plainCoin(g, 0, 0, R, 1, 1); } else g.drawImage(C.face, -C.face.width / 2, -C.face.height / 2);
        // edge thickness
        g.restore(); if (Math.abs(sx) < 0.98) { g.fillStyle = "#8a5a18"; g.fillRect(hx + R * sc * Math.abs(sx) * (sx > 0 ? 1 : -1) - 3, hy - R * sc, 6 * (1 - Math.abs(sx)) + 1, R * 2 * sc); }
        // light sweep across the relief
        var lw = seg(t, 3.9, 4.5); if (lw > 0 && lw < 1) { g.save(); g.beginPath(); g.arc(hx, hy, R, 0, K.PI2); g.clip(); g.globalCompositeOperation = "lighter"; var lx2 = hx - R * 1.4 + R * 2.8 * lw;
          var lg = g.createLinearGradient(lx2 - R * 0.3, hy - R, lx2 + R * 0.3, hy + R); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,240,200,.35)"); lg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = lg; g.fillRect(hx - R, hy - R, R * 2, R * 2); g.restore(); }
        var gl2 = seg(t, 4.15, 4.35) * (1 - seg(t, 4.35, 4.7)); if (gl2 > 0) { g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,240,200," + gl2 + ")"; var gx = hx + R * 0.5, gy = hy - R * 0.55; g.fillRect(gx - 22, gy - 1, 44, 2); g.fillRect(gx - 1, gy - 22, 2, 44); g.globalCompositeOperation = "source-over"; }
        var nm = seg(t, 4.0, 4.4); if (nm > 0) { g.globalAlpha = nm; var tf = Math.min(W * 0.085, 48); g.font = "700 " + tf + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000"; g.fillText("TITAN RELIQUARY", cx + 1, H * 0.86 + 2); g.fillStyle = "#f0cf86"; g.fillText("TITAN RELIQUARY", cx, H * 0.86); g.font = "600 " + Math.max(10, W * 0.028) + "px " + K.MONO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#e8c47a"; g.fillText("THE MINT  \u00b7  STRUCK 20 OCT 2026  \u00b7  PROOF", cx, H * 0.86 + tf * 0.8); g.globalAlpha = 1; }
      }
      g.restore();
      // hard-cut flash between stations
      [T.roll[0], T.blank[0], T.upset[0], T.strike[0], T.tray[0]].forEach(function (c0) { var d = t - c0; if (d >= 0 && d < 0.06) { g.fillStyle = "rgba(255,255,255," + 0.25 * (1 - d / 0.06) + ")"; g.fillRect(0, 0, W, H); } });
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.15, 0.6, { type: "lowpass", f: 900, to: 2200, shape: [[0.1, 0.18], [0.5, 0.15], [0.6, 0.0001]] }); A.tone(0.1, 55, 0.65, { type: "sawtooth", v: 0.06, lp: 200 });   // pour roar + hiss
      A.tone(0.75, 41, 0.6, { type: "sawtooth", v: 0.1, lp: 160 }); A.noise(0.75, 0.6, { type: "bandpass", f: 220, q: 1.5, v: 0.18 });                                        // roll rumble
      [1.52, 1.7, 1.88].forEach(function (h) { A.tone(h, 70, 0.22, { to: 35, v: 0.35 }); A.noise(h, 0.07, { type: "lowpass", f: 2200, v: 0.45 }); A.bell(h + 0.01, 3300, 0.12, 0.03, [[1, 1], [1.6, 0.6]]); });   // punch thuds
      for (var i = 0; i < 16; i++) { var s = 1.97 + i * 0.03 + K.hash(i) * 0.02; A.bell(s, 2600 + K.hash(i + 4) * 2400, 0.08, 0.025, [[1, 1], [2.3, 0.5]]); A.noise(s, 0.02, { type: "highpass", f: 3000, v: 0.12 }); }   // blank clatter
      A.tone(HIT, 48, 0.8, { to: 28, v: 0.55 }); A.noise(HIT, 0.12, { type: "lowpass", f: 4000, v: 0.7 }); A.noise(HIT, 0.9, { type: "lowpass", f: 600, to: 120, v: 0.2 }); A.bell(HIT, 180, 1.2, 0.08, [[1, 1], [2.76, 0.5], [5.4, 0.3]]);   // the strike
      A.bell(4.02, 2093, 1.8, 0.07, [[1, 1], [2.32, 0.45], [4.25, 0.25], [6.1, 0.12]]); A.bell(4.1, 2093 * 1.005, 1.5, 0.03, [[1, 1], [2.32, 0.4]]);                                                   // the coin rings
      A.bell(4.0, 3200, 0.1, 0.03, [[1, 1]]); A.bell(4.12, 3500, 0.08, 0.02, [[1, 1]]); A.bell(4.2, 3800, 0.06, 0.015, [[1, 1]]);                                                              // landing chatter
    }
  });
})();
