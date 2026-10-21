/* The Construct intro (Grok, 2026-10-20). First person, falling forward: the camera dives down a tunnel of glyph rain that
   accelerates and rolls, then brakes hard in front of a wall of characters. The wall is the featured coin rendered in glyphs
   (luminance -> character density; a struck disc with "TR" when no photo is cached), its characters still cycling until they
   lock one by one, and a prompt types the load line under it. Sound: a rising data wind, chirps as streams pass, a sub drop when
   the camera brakes, key ticks while the prompt types. Canvas 2D with a pre-rendered glyph atlas (one drawImage per glyph). */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var GL = "\u30a2\u30a4\u30a6\u30a8\u30ab\u30ad\u30af\u30b1\u30b3\u30b5\u30b7\u30b9\u30bb\u30bd\u30bf\u30c1\u30c4\u30c6\u30c8\u30ca012345789$#+=<>*:".split("");
  var RAMP = " .:-=+*%#@";
  var PROMPT = "> mount /reliquary --all", OK = "  [ OK ]";
  function atlas(sz) {                                // GL glyphs x 3 brightness rows (dim, green, white head)
    var c = K.mk(GL.length * sz, sz * 3), g = c.getContext("2d"); g.font = "700 " + Math.round(sz * 0.8) + "px " + K.MONO; g.textAlign = "center"; g.textBaseline = "middle";
    ["#0b5d22", "#33ff66", "#eaffef"].forEach(function (col, r) { g.fillStyle = col; if (r === 2) { g.shadowColor = "#7dff9e"; g.shadowBlur = sz * 0.3; }
      GL.forEach(function (ch, i) { g.fillText(ch, i * sz + sz / 2, r * sz + sz / 2); }); });
    return c;
  }
  function wallCells(C) {                            // the coin as characters
    var cols = C.portrait ? 30 : 44, rows = Math.round(cols * 0.55 * (C.portrait ? 1 : 0.8)), cells = [], i, j;
    var src = K.mk(cols, rows), g = src.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000"; g.fillRect(0, 0, cols, rows);
    var cx = cols / 2, cy = rows / 2, r = rows * 0.46;
    g.save(); g.translate(cx, cy); g.scale(1, 0.5); g.beginPath(); g.arc(0, 0, r * 2, 0, K.PI2); g.restore();
    if (C.coin) { g.save(); g.clip(); g.drawImage(C.coin, cx - r * 2, cy - r, r * 4, r * 2); g.restore(); }
    else { g.save(); g.clip(); var gr = g.createRadialGradient(cx - r * 0.6, cy - r * 0.4, 1, cx, cy, r * 2); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#444"); g.fillStyle = gr; g.fillRect(0, 0, cols, rows);
      g.fillStyle = "#111"; g.font = "700 " + rows * 0.55 + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.save(); g.translate(cx, cy); g.scale(2, 1); g.fillText("TR", 0, 1); g.restore(); g.restore(); }
    g.lineWidth = 1; g.strokeStyle = "#ccc"; g.save(); g.translate(cx, cy); g.scale(1, 0.5); g.beginPath(); g.arc(0, 0, r * 2, 0, K.PI2); g.restore(); g.stroke();
    var d; try { d = g.getImageData(0, 0, cols, rows).data; } catch (e) { if (C.coin) { C.coin = null; return wallCells(C); } return { cols: cols, rows: rows, cells: [] }; }
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) { var k = (j * cols + i) * 4, l = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255;
      var ch = RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))]; if (ch !== " ") cells.push({ i: i, j: j, ch: ch, l: l, lock: 2.75 + K.hash(i * 17 + j * 131) * 0.7 }); }
    return { cols: cols, rows: rows, cells: cells };
  }
  I.reg("construct", {
    dur: 4.4, still: 4.1, needs: ["coin"],
    init: function (C) {
      var sz = C.small ? 22 : 26; C.sz = sz; C.atlas = atlas(sz);
      C.st = []; for (var i = 0; i < (C.lite ? 160 : 300); i++) C.st.push({ a: C.rnd() * K.PI2, r: 2.2 + C.rnd() * 3.2, z: C.rnd() * 40, len: 4 + Math.floor(C.rnd() * 10), g: Math.floor(C.rnd() * GL.length), sp: 0.7 + C.rnd() * 0.6 });
      C.wall = wallCells(C);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, sz = C.sz, A = C.atlas, i, k;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      // camera: accelerating dive, then a hard brake at 2.45 s; roll eases with speed
      var dive = t < 2.45 ? 2.2 * t + 7.5 * t * t * t / 3 : 0, travel = Math.min(dive, 2.2 * 2.45 + 7.5 * Math.pow(2.45, 3) / 3);
      var brake = seg(t, 2.45, 2.75), roll = Math.sin(t * 0.9) * 0.35 * (1 - brake), fov = Math.min(W, H) * 0.9, cx = W / 2, cy = H / 2;
      var tunnelA = 1 - K.eo3(seg(t, 2.4, 2.9));
      if (tunnelA > 0) {
        g.save(); g.translate(cx, cy); g.rotate(roll); g.globalAlpha = tunnelA;
        for (i = 0; i < C.st.length; i++) { var s = C.st[i], z = ((s.z - travel * s.sp) % 40 + 40) % 40 + 0.35;
          var x = Math.cos(s.a) * s.r, y0 = Math.sin(s.a) * s.r;
          for (k = 0; k < s.len; k++) { var zz = z + k * 0.45; if (zz > 40) break; var sc = 3 / zz, px = x * fov / zz, py = y0 * fov / zz, gs = sz * sc;
            if (gs < 2 || gs > sz * 3.2 || Math.abs(px) > W || Math.abs(py) > H) continue;   // glyphs too close to the lens are culled, not smeared
            var row = k === 0 ? 2 : (zz > 14 ? 0 : 1), gi = (s.g + k * 7 + Math.floor(t * 9 + i)) % GL.length;
            g.globalAlpha = tunnelA * Math.min(1, zz / 2.5) * Math.min(1, 6 / zz) * (1 - k / s.len * 0.7);
            g.drawImage(A, gi * sz, row * sz, sz, sz, px - gs / 2, py - gs / 2, gs, gs); } }
        g.restore(); g.globalAlpha = 1;
        var sp = 1 - brake; if (t < 2.5) { var gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.2); gr.addColorStop(0, "rgba(180,255,200," + 0.25 * sp * K.seg(t, 0.6, 2.4) + ")"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      }
      // the wall: arrives from depth with the brake (overshoot), its glyphs cycle until each locks
      if (t > 2.3) {
        var Wl = C.wall, cw = Math.min(W * 0.92 / Wl.cols, H * 0.5 / (Wl.rows * 1.25)), chh = cw * 1.25;
        var zin = K.eob(seg(t, 2.3, 2.85), 1.2), scl = K.lerp(0.15, 1, zin), ww = Wl.cols * cw * scl, wh = Wl.rows * chh * scl, ox = cx - ww / 2, oy = H * 0.42 - wh / 2;
        g.font = "700 " + Math.max(4, cw * 1.2 * scl) + "px " + K.MONO; g.textAlign = "center"; g.textBaseline = "middle";
        for (i = 0; i < Wl.cells.length; i++) { var c = Wl.cells[i], locked = t >= c.lock;
          var ch = locked ? c.ch : GL[Math.floor(K.hash(i + Math.floor(t * 20)) * GL.length)];
          g.fillStyle = locked ? (c.l > 0.8 ? "#eaffef" : c.l > 0.45 ? "#33ff66" : "#169a3b") : "rgba(51,255,102,.55)";
          g.fillText(ch, ox + (c.i + 0.5) * cw * scl, oy + (c.j + 0.5) * chh * scl); }
        // the prompt types below the wall
        var ty = oy + wh + chh * 2.2, fs = Math.max(12, Math.min(W * 0.038, 20)); g.font = "500 " + fs + "px " + K.MONO; g.textAlign = "left";
        var n = Math.floor(seg(t, 2.85, 3.55) * PROMPT.length), tx = Math.max(14, cx - g.measureText(PROMPT + OK).width / 2);
        g.fillStyle = "#33ff66"; g.fillText(PROMPT.slice(0, n), tx, ty);
        if (t > 3.7) { g.fillStyle = "#eaffef"; g.fillText(OK, tx + g.measureText(PROMPT).width, ty); }
        var nm = seg(t, 3.8, 4.15); if (nm > 0) { g.globalAlpha = nm; g.fillStyle = "#b8ffcc"; g.font = "700 " + fs * 1.15 + "px " + K.MONO; g.fillText("TITAN_RELIQUARY", tx, ty + fs * 1.9); g.globalAlpha = 1; }
        if (n < PROMPT.length || Math.floor(t * 2.6) % 2) { g.fillStyle = "#33ff66"; var cxp = t > 3.8 ? tx + g.measureText("TITAN_RELIQUARY").width + 4 : tx + g.measureText(PROMPT.slice(0, n)).width + 2; g.fillRect(cxp, (t > 3.8 ? ty + fs * 1.9 : ty) - fs * 0.5, fs * 0.55, fs); }
      }
      // scanline grain over everything
      g.fillStyle = "rgba(0,0,0,.18)"; for (var y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.0, 2.5, { type: "bandpass", f: 180, to: 3800, q: 1.4, shape: [[0.1, 0.03], [1.5, 0.12], [2.42, 0.22], [2.5, 0.0001]] });   // data wind rising with the dive
      A.tone(0.0, 40, 2.45, { type: "sawtooth", v: 0.05, to: 160, lp: 500 });
      for (var i = 0; i < 16; i++) { var s = 0.3 + i * 0.13 - i * i * 0.0028; A.tone(s, 1800 + (i * 377) % 2200, 0.03, { type: "square", v: 0.025 }); }   // streams passing
      A.tone(2.46, 70, 0.9, { v: 0.4, to: 32, glide: 0.6 }); A.noise(2.46, 0.25, { type: "lowpass", f: 300, v: 0.3 });   // the brake
      for (var k = 0; k < PROMPT.length; k += 1) A.noise(2.85 + k * 0.7 / PROMPT.length, 0.02, { type: "bandpass", f: 3200 + (k % 3) * 600, q: 3, v: 0.09 });
      A.tone(3.7, 880, 0.12, { type: "square", v: 0.04 }); A.tone(3.82, 1320, 0.25, { type: "square", v: 0.04 });
    }
  });
})();
