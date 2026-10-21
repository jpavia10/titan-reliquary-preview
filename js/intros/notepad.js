/* Notepad intro (Grok, 2026-10-20). The joke played straight: a Notepad window, a caret, and someone typing. The camera starts
   tight on the caret and pulls back as the lines fill; the typing has a human rhythm (pauses between words, a typo caught and
   backspaced), the Ln/Col status counts along, Ctrl+S drops the * from the title and a "Saved" note slides in, then the text
   is select-all highlighted and the window lets go to the app. Sound: real-feeling keystrokes (each key slightly different,
   a deeper space bar, the backspace), the Ctrl+S double tap. Canvas 2D. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var LINES = ["TITAN RELIQUARY", "===============", "", "coins: catalogued", "stories: sourced", "vault: open"];
  var TYPO = { line: 5, at: 7, wrong: "oepn" };          // types "oepn", sees it, backspaces 3, types "pen"
  function script(rnd) {                                    // [{t, kind, line, text}] keystrokes with a human rhythm
    var ev = [], t = 0.25;
    LINES.forEach(function (ln, li) {
      if (li === 1) { ev.push({ t: t, k: "fill", li: li }); t += 0.12; ev.push({ t: t, k: "enter", li: li }); t += 0.06; return; }   // the rule line is held-key fast
      var tgt = ln, i = 0, buf = "";
      while (i < tgt.length) {
        if (li === TYPO.line && i === TYPO.at && !ev.typo) {
          ev.typo = true; for (var w = 0; w < TYPO.wrong.length; w++) { buf += TYPO.wrong[w]; t += 0.03 + rnd() * 0.02; ev.push({ t: t, k: "key", li: li, text: buf }); }
          t += 0.16; for (var b = 0; b < 3; b++) { buf = buf.slice(0, -1); t += 0.055; ev.push({ t: t, k: "bs", li: li, text: buf }); }
          i = TYPO.at + 1; t += 0.04; continue;
        }
        var ch = tgt[i]; buf += ch; i++;
        t += ch === " " ? 0.04 : ch === "." ? 0.014 : 0.018 + rnd() * 0.018;
        if (tgt[i - 2] === " " && ch !== ".") t += 0.02;
        ev.push({ t: t, k: ch === " " ? "space" : ch === "." ? "dot" : "key", li: li, text: buf });
      }
      if (li < LINES.length - 1) { t += 0.08; ev.push({ t: t, k: "enter", li: li }); t += 0.03; }
    });
    return ev;
  }
  function stateAt(C, t) {
    var lines = [""], li = 0, last = -1;
    for (var i = 0; i < C.ev.length; i++) { var e = C.ev[i]; if (e.t > t) break; last = e.t;
      if (e.k === "enter") { li++; lines[li] = ""; } else if (e.k === "fill") lines[li] = LINES[1]; else lines[li] = e.text; }
    return { lines: lines, li: li, idle: t - last };
  }
  I.reg("notepad", {
    dur: 4.3, still: 3.6,
    init: function (C) {
      C.ev = script(K.rng(9)); var end = C.ev[C.ev.length - 1].t; C.tEnd = end; C.tSave = end + 0.22; C.tSel = C.tSave + 0.45; this.dur = Math.min(4.6, C.tSel + 0.75); this.still = C.tSave + 0.3;
      var fs = Math.round(Math.max(16, Math.min(C.W * 0.056, 28))); C.fs = fs; C.lh = Math.round(fs * 1.45);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, fs = C.fs, lh = C.lh, S = stateAt(C, t);
      var TB = 34, MB = 30, SB = 26, mx = 16, top = TB + MB;
      var font = "400 " + fs + "px " + '"Cascadia Code", Consolas, "Lucida Console", ' + K.MONO;
      g.font = font; var cw = g.measureText("M").width;
      // camera: tight on the caret, pulling back as the page fills
      var caretX = mx + cw * (S.lines[S.li] || "").length, caretY = top + 14 + S.li * lh + lh * 0.5;
      var z = K.lerp(2.1, 1, K.eio(seg(t, 0.2, C.tEnd + 0.1))), fx = K.lerp(caretX, W / 2, K.eio(seg(t, 0.2, C.tEnd + 0.1))), fy = K.lerp(caretY, H / 2, K.eio(seg(t, 0.2, C.tEnd + 0.1)));
      var hw = W / (2 * z), hh = H / (2 * z); fx = K.clamp(fx, hw, W - hw); fy = K.clamp(fy, hh, H - hh);   // the camera never leaves the window
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-fx, -fy);
      // window chrome
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#f3f3f3"; g.fillRect(0, 0, W, TB); g.fillStyle = "#000"; g.font = "400 13px " + K.SANS; g.textBaseline = "middle"; g.textAlign = "left";
      var saved = t >= C.tSave, dirty = !saved && C.ev[0].t < t;
      g.fillText((dirty ? "*" : "") + (saved ? "reliquary.txt" : "Untitled") + " - Notepad", 40, TB / 2);
      g.fillStyle = "#1a5fb4"; g.fillRect(14, TB / 2 - 7, 14, 14); g.fillStyle = "#fff"; g.fillRect(17, TB / 2 - 4, 8, 1.5); g.fillRect(17, TB / 2 - 1, 8, 1.5); g.fillRect(17, TB / 2 + 2, 6, 1.5);
      g.fillStyle = "#000"; g.font = "300 15px " + K.SANS; g.textAlign = "center"; ["\u2013", "\u25a1", "\u2715"].forEach(function (s, i) { g.fillText(s, W - 22 - (2 - i) * 46, TB / 2); });
      g.fillStyle = "#fbfbfb"; g.fillRect(0, TB, W, MB); g.fillStyle = "#1b1b1b"; g.font = "400 13px " + K.SANS; g.textAlign = "left";
      ["File", "Edit", "View"].forEach(function (s, i) { g.fillText(s, 14 + i * 50, TB + MB / 2); });
      var flash = t >= C.tSave - 0.12 && t < C.tSave + 0.1; if (flash) { g.fillStyle = "rgba(0,95,184,.12)"; g.fillRect(8, TB + 4, 40, MB - 8); }
      g.fillStyle = "#e5e5e5"; g.fillRect(0, top - 1, W, 1);
      // text, the select-all highlight sweeping down it
      var sel = seg(t, C.tSel, C.tSel + 0.35); g.font = font; g.textBaseline = "middle";
      S.lines.forEach(function (ln, i) { var y = top + 14 + i * lh + lh * 0.5;
        var sw = sel > 0 ? Math.min(1, sel * LINES.length - i) : 0;
        if (sw > 0) { g.fillStyle = "#0078d7"; g.fillRect(mx, y - lh / 2, Math.max(cw * 0.5, cw * ln.length) * sw, lh); }
        g.fillStyle = sw >= 1 ? "#fff" : i === 0 ? "#000" : "#111"; g.fillText(ln, mx, y);
        if (i === 0 && ln) { g.fillStyle = sw >= 1 ? "#fff" : "#000"; g.fillText(ln, mx + 0.6, y); } });
      // the caret: solid while typing, blinking when idle
      if (sel <= 0 && (S.idle < 0.5 || Math.floor(t / 0.53) % 2 === 0)) { g.fillStyle = "#000"; g.fillRect(caretX + 1, caretY - lh * 0.42, 1.6, lh * 0.84); }
      // status bar
      g.fillStyle = "#f3f3f3"; g.fillRect(0, H - SB, W, SB); g.fillStyle = "#1b1b1b"; g.font = "400 12px " + K.SANS; g.textBaseline = "middle";
      var col = (S.lines[S.li] || "").length + 1, sb = "Ln " + (S.li + 1) + ", Col " + col; g.textAlign = "left"; g.fillText(sb, 14, H - SB / 2);
      g.textAlign = "right"; g.fillText(W < 420 ? "UTF-8" : "100%    Windows (CRLF)    UTF-8", W - 14, H - SB / 2);
      g.restore();
      // the save note (screen space, not under the camera)
      var sn = seg(t, C.tSave, C.tSave + 0.25) * (1 - seg(t, C.tSel + 0.3, C.tSel + 0.55));
      if (sn > 0) { var bw = 150, bx = W - bw - 16, by = H - SB - 54 + (1 - K.eo3(sn)) * 20; g.globalAlpha = sn; g.fillStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 12;
        g.fillRect(bx, by, bw, 38); g.shadowBlur = 0; g.fillStyle = "#107c10"; g.fillRect(bx, by, 4, 38); g.fillStyle = "#000"; g.font = "600 13px " + K.SANS; g.textAlign = "left"; g.fillText("\u2713  Saved", bx + 16, by + 19); g.globalAlpha = 1; }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      C.ev.forEach(function (e, i) {
        var f = 2200 + K.hash(i * 3.1) * 1600, v = 0.1 + K.hash(i) * 0.05;
        if (e.k === "space") { A.noise(e.t, 0.05, { type: "bandpass", f: 900, q: 1.5, v: 0.16 }); A.tone(e.t, 140, 0.05, { v: 0.05 }); }
        else if (e.k === "enter") { A.noise(e.t, 0.06, { type: "bandpass", f: 1300, q: 1.2, v: 0.18 }); A.noise(e.t + 0.04, 0.04, { type: "bandpass", f: 2600, q: 2, v: 0.06 }); }
        else if (e.k === "fill") { for (var k = 0; k < 8; k++) A.noise(e.t - 0.1 + k * 0.014, 0.012, { type: "bandpass", f: 3000, q: 3, v: 0.06 }); }
        else if (e.k === "bs") A.noise(e.t, 0.04, { type: "bandpass", f: 1700, q: 2, v: 0.14 });
        else { A.noise(e.t, 0.025, { type: "bandpass", f: f, q: 2.5, v: v }); A.noise(e.t + 0.012, 0.02, { type: "lowpass", f: 600, v: v * 0.6 }); }
      });
      A.noise(C.tSave - 0.12, 0.03, { type: "bandpass", f: 1500, q: 2, v: 0.12 }); A.noise(C.tSave - 0.04, 0.03, { type: "bandpass", f: 2400, q: 2, v: 0.12 });
      A.tone(C.tSave + 0.05, 1046, 0.18, { v: 0.05 }); A.tone(C.tSave + 0.12, 1568, 0.25, { v: 0.04 });
      A.noise(C.tSel - 0.06, 0.03, { type: "bandpass", f: 2000, q: 2, v: 0.1 });
    }
  });
})();
