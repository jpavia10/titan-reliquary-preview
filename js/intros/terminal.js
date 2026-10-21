/* Grand Terminal intro (Grok, 2026-10-20). A station departures board, seen slightly from below. Every flap starts blank and
   rattles through the alphabet to its letter (real split-flap order, each column a beat behind the last), so the name and the
   platform settle like a train being announced; then the station chime plays and ON TIME starts to blink. The camera pushes in
   slowly under the clatter. Sound: the clatter is built from the actual flips (denser when more flaps move), then the three-note
   station chime. Canvas 2D: every character's top and bottom half is cached once, a flip is two clipped blits. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var SET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:";
  var ROWS = ["TITAN", "RELIQUARY", "", "PLATFORM 1", "ON TIME"], FLIP = 0.05;
  I.reg("terminal", {
    dur: 3.7, still: 3.2,
    init: function (C) {
      var W = C.W, H = C.H, cols = C.portrait ? 10 : 14; C.cols = cols;
      var cw = Math.floor(Math.min((W * 0.84) / (cols * 1.08 + 0.3), (H * 0.55) / (ROWS.length * 1.6))), ch = Math.round(cw * 1.4); C.cw = cw; C.ch = ch;
      C.tiles = {};
      SET.split("").forEach(function (c) {
        var t = K.mk(cw, ch), g = t.getContext("2d"), r = cw * 0.08;
        g.fillStyle = "#16181c"; g.beginPath(); g.moveTo(r, 0); g.arcTo(cw, 0, cw, ch, r); g.arcTo(cw, ch, 0, ch, r); g.arcTo(0, ch, 0, 0, r); g.arcTo(0, 0, cw, 0, r); g.fill();
        var gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, "rgba(255,255,255,.06)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
        g.fillStyle = "#f1ecdf"; g.font = "700 " + Math.round(ch * 0.72) + "px " + K.HEAVY; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(c, cw / 2, ch * 0.54);
        g.fillStyle = "#050607"; g.fillRect(0, ch / 2 - 0.75, cw, 1.5);
        C.tiles[c] = t;
      });
      C.cells = [];
      ROWS.forEach(function (row, j) { var txt = (row + "                    ").slice(0, cols);
        for (var i = 0; i < cols; i++) { var tg = txt[i], n = SET.indexOf(tg), st = 0.25 + j * 0.09 + i * 0.07 + K.hash(i * 7 + j * 13) * 0.05, from = n > 14 ? n - 14 : 0;   // long trips start part way, like a board already mid-cycle
          C.cells.push({ i: i, j: j, tg: tg, from: from, n: n, st: st, end: st + (n - from) * FLIP }); } });
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, cw = C.cw, ch = C.ch, cols = C.cols, gap = Math.max(2, cw * 0.08), i;
      g.fillStyle = "#07080a"; g.fillRect(0, 0, W, H);
      var push = K.lerp(0.94, 1.03, K.eio(K.seg(t, 0, 3.7))), bw = cols * (cw + gap) + gap * 3, bh = ROWS.length * (ch + gap * 2.2) + ch * 1.2;
      g.save(); g.translate(W / 2, H * 0.47); g.scale(push, push * 0.97); g.transform(1, 0, 0, 1, 0, 0);
      // the board housing, lit from above
      g.fillStyle = "#0f1114"; g.fillRect(-bw / 2, -bh / 2, bw, bh); g.strokeStyle = "rgba(255,196,61,.35)"; g.lineWidth = 2; g.strokeRect(-bw / 2, -bh / 2, bw, bh);
      var lit = g.createLinearGradient(0, -bh / 2, 0, bh / 2); lit.addColorStop(0, "rgba(255,230,180,.08)"); lit.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lit; g.fillRect(-bw / 2, -bh / 2, bw, bh);
      g.fillStyle = "#ffc43d"; g.font = "700 " + Math.round(ch * 0.42) + "px " + K.SANS; g.textAlign = "left"; g.textBaseline = "middle";
      g.fillText("DEPARTURES", -bw / 2 + gap * 2, -bh / 2 + ch * 0.5);
      g.textAlign = "right"; g.fillStyle = "rgba(255,196,61,.7)"; var clk = 19 * 60 + 9 + Math.floor(t / 3.7); g.fillText(Math.floor(clk / 60) + ":" + ("0" + clk % 60).slice(-2), bw / 2 - gap * 2, -bh / 2 + ch * 0.5);
      var x0 = -bw / 2 + gap * 2.5, y0 = -bh / 2 + ch * 1.1;
      for (i = 0; i < C.cells.length; i++) {
        var c = C.cells[i], x = x0 + c.i * (cw + gap), y = y0 + c.j * (ch + gap * 2.2), k, a, b, p;
        if (t < c.st) { a = b = SET[c.from]; p = 1; }
        else if (t >= c.end) { a = b = c.tg; p = 1; }
        else { k = Math.floor((t - c.st) / FLIP); p = ((t - c.st) % FLIP) / FLIP; a = SET[c.from + k]; b = SET[c.from + k + 1] || c.tg; }
        if (c.j === 4 && t > 2.75 && c.tg !== " " && Math.floor((t - 2.75) * 2.4) % 2 === 1) { g.globalAlpha = 0.35; }
        var A = C.tiles[a] || C.tiles[" "], B = C.tiles[b] || C.tiles[" "];
        // static halves: new top, old bottom; then the falling flap
        g.drawImage(B, 0, 0, cw, ch / 2, x, y, cw, ch / 2);
        g.drawImage(p < 0.5 ? A : B, 0, ch / 2, cw, ch / 2, x, y + ch / 2, cw, ch / 2);
        if (p < 1) {
          var s = Math.cos(p * Math.PI);
          if (s > 0) { g.drawImage(A, 0, 0, cw, ch / 2, x, y + ch / 2 - ch / 2 * s, cw, ch / 2 * s); g.fillStyle = "rgba(0,0,0," + (0.4 * (1 - s)) + ")"; g.fillRect(x, y + ch / 2 - ch / 2 * s, cw, ch / 2 * s); }
          else { g.drawImage(B, 0, ch / 2, cw, ch / 2, x, y + ch / 2, cw, ch / 2 * -s); g.fillStyle = "rgba(255,255,255," + (0.12 * (1 + s)) + ")"; g.fillRect(x, y + ch / 2, cw, ch / 2 * -s); }
        }
        g.globalAlpha = 1;
      }
      // ON TIME lamp
      if (t > 2.3) { var lx = x0 + cols * (cw + gap) - gap - ch * 0.25, ly = y0 + 4 * (ch + gap * 2.2) + ch / 2; g.fillStyle = Math.floor((t - 2.3) * 2.4) % 2 ? "#2a3a22" : "#7dff6a"; g.beginPath(); g.arc(lx, ly, Math.max(3, ch * 0.09), 0, K.PI2); g.fill(); }
      g.restore();
      // the concourse light falling over the board
      var v = g.createRadialGradient(W / 2, H * 0.2, 10, W / 2, H * 0.5, Math.max(W, H) * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.6)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      var flips = [];
      C.cells.forEach(function (c) { for (var k = 0; k < (c.n - c.from); k++) flips.push(c.st + k * FLIP); });
      flips.sort(function (a, b) { return a - b; });
      var step = Math.max(1, Math.ceil(flips.length / 260)), i;                 // at most ~260 click voices; denser stretches stay denser
      for (i = 0; i < flips.length; i += step) A.noise(flips[i], 0.012, { type: "bandpass", f: 2500 + (i % 7) * 260, q: 4, v: 0.05 + 0.02 * Math.min(step, 3) });
      [[2.35, 783.99], [2.62, 659.25], [2.89, 523.25]].forEach(function (n) { A.bell(n[0], n[1], 1.6, 0.11, [[1, 1], [2, 0.25], [3, 0.08]]); });
    }
  });
})();
