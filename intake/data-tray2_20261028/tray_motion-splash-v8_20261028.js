/* Titan Reliquary · motion splashes: a short opening per theme in that theme's style (notes/agents/styles-20.md, section 4).
   Loaded before splash.js. Exposes window.TitanOpening.

   The setting (Scene Studio > Settings > Opening, localStorage "titan.opening"):
     both    (default, owner 2026-10-11: "Grok splash missing. You can put the new motion after before main pages") the opening film,
             then the theme's motion splash, then the app (a tap skips straight to the app); a stored "mix" from tr110 counts as "both"
     film    the film every time
     motion  the theme's motion splash every time
     none    no opening
   Motion Off (TitanMotion) = no opening at all (index.html never shows the splash). Motion Calm = ONE still frame of the theme's splash
   for about a second, then a fade (never the film).

   TitanOpening.choice()  -> "mix"|"film"|"motion"|"none"        TitanOpening.set(v)
   TitanOpening.pick()    -> "film"|"motion"|"none"               what to run for this launch (decided once per page load)
   TitanOpening.play(root, themeId, featured, done[, opts])       runs the motion splash inside #tr-splash; returns {stop(), feature(f)}
        done({wiped})  is called when the timeline ends. The splash holds its last frame; the caller dissolves it into the app
        (wiped:true = the splash already cleared itself to transparent, the caller can clean up at once).
   TitanOpening.mount(sheet)                                       the "Opening" row in Scene Studio > Settings

   Every splash is one 2D canvas, drawn as a pure function of time t (seconds), so a frame dropped is never a stutter, and
   TitanOpening._debug.seek(t) (with ?splashhold) gives deterministic frames for tests.
   URL overrides (tests): ?opening=motion|film|none   ?theme=<id> (the splash only, not the app)   ?splashhold (no clock, frames from seek()) */
(function () {
  "use strict";
  if (window.TitanOpening) return;
  var html = document.documentElement;
  var KEY = "titan.opening", COINKEY = "titan.opening.coin";
  var MODES = ["both", "film", "motion", "none"];
  var PI2 = Math.PI * 2;

  /* ============================== setting ============================== */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode: this visit only */ } }
  function qs(name) { var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(location.search); return m ? decodeURIComponent(m[1]) : null; }
  function choice() { var v = lsGet(KEY); if (v === "mix") v = "both"; return MODES.indexOf(v) >= 0 ? v : "both"; }
  function set(v) {
    if (MODES.indexOf(v) < 0) return;
    lsSet(KEY, v);
    try { window.dispatchEvent(new CustomEvent("titan:opening", { detail: { choice: v } })); } catch (e) { /* old browser */ }
  }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function motionLevel() {
    if (window.TitanMotion && window.TitanMotion.level) return window.TitanMotion.level();
    try { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches ? "calm" : "full"; } catch (e) { return "full"; }
  }
  var picked = null;
  function pick() {
    if (picked) return picked;
    var lv = motionLevel(), f = qs("opening"), c = choice(), r;
    if (lv === "off") r = "none";
    else if (f === "motion" || f === "film" || f === "none") r = f;          // test override: remembers nothing
    else if (c === "both") r = "film";                                       // the film first; splash.js runs the theme motion after it (after())
    else r = c;
    if (lv === "calm" && r === "film") r = "motion";                         // Calm: no film, one still frame of the theme splash
    picked = r;
    return r;
  }
  /* true when the theme's motion should follow the film (Opening "both", Motion Full, no test override) */
  function after() { return pick() === "film" && qs("opening") !== "film" && choice() === "both" && motionLevel() === "full"; }
  function themeId() {
    var t = qs("theme") || html.getAttribute("data-atmo") || "afterhours";
    return /^[a-z0-9_-]+$/i.test(t) ? t : "afterhours";
  }

  /* ============================== tiny helpers ============================== */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eo3(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function eo2(x) { x = clamp(x, 0, 1); return 1 - (1 - x) * (1 - x); }
  function ei2(x) { x = clamp(x, 0, 1); return x * x; }
  function ei3(x) { x = clamp(x, 0, 1); return x * x * x; }
  function eio(x) { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eob(x, s) { x = clamp(x, 0, 1); s = s == null ? 1.6 : s; var c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); }
  function eoel(x) { x = clamp(x, 0, 1); return x === 0 || x === 1 ? x : Math.pow(2, -9 * x) * Math.sin((x * 10 - 0.75) * (PI2 / 3)) + 1; }
  function bounce(x) { x = clamp(x, 0, 1); var n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mk(w, h, willRead) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h == null ? w : h)); return c; }
  function ctx2(c, willRead) { return c.getContext("2d", willRead ? { willReadFrequently: true } : undefined); }
  function parseColor(s) {
    s = String(s || "").trim();
    var m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = /^#([0-9a-f]{6})/i.exec(s);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function rgb(c, a) { var p = typeof c === "string" ? (parseColor(c) || [128, 128, 128]) : c; return a == null || a >= 1 ? "rgb(" + (p[0] | 0) + "," + (p[1] | 0) + "," + (p[2] | 0) + ")" : "rgba(" + (p[0] | 0) + "," + (p[1] | 0) + "," + (p[2] | 0) + "," + (+a).toFixed(3) + ")"; }
  function mixc(a, b, t) { var p = parseColor(a) || [0, 0, 0], q = parseColor(b) || [0, 0, 0]; return rgb([lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)]); }
  function lum(c) { var p = parseColor(c) || [0, 0, 0]; return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255; }

  /* ============================== palettes ============================== */
  // Token values copied from styles/atmo/{id}.css and the six new themes' palettes (notes/agents/styles-20.md, section 2).
  // The live theme reads the computed tokens off <html>; ?theme=<id> (a test override) and a missing token use this table.
  var PAL = {
    afterhours: { bg: "#04060b", bg2: "#070a11", surface: "#0a0e16", ink: "#edf1f8", muted: "#8e99ae", gold: "#cdb271", soft: "#e6d6a8" },
    colossus:   { bg: "#170f06", bg2: "#1f1409", surface: "#251a0c", ink: "#fbeed4", muted: "#c09a5e", gold: "#f2a93b", soft: "#ffd98c" },
    kaleido:    { bg: "#130b20", bg2: "#190f2b", surface: "#1d1231", ink: "#f6f0fb", muted: "#c3afdc", gold: "#ee6fd6", soft: "#ffc6ee" },
    neon:       { bg: "#0a0614", bg2: "#0e0a1c", surface: "#150e28", ink: "#f5f0ff", muted: "#cdc0ec", gold: "#35e6ff", soft: "#a6f3ff" },
    solaris:    { bg: "#050507", bg2: "#0a0a0e", surface: "#111116", ink: "#fff4dc", muted: "#d3c6a6", gold: "#ffb52e", soft: "#ffe08a" },
    glacier:    { bg: "#050b12", bg2: "#0a1420", surface: "#0b1724", ink: "#eef8fd", muted: "#b7cee0", gold: "#7fdcff", soft: "#cbf1ff" },
    samadhi:    { bg: "#100807", bg2: "#1a0f0b", surface: "#26150f", ink: "#fff5e8", muted: "#efd3be", gold: "#ffc78f", soft: "#ffe3c4" },
    nocturne:   { bg: "#070b16", bg2: "#0a0f1e", surface: "#0d1424", ink: "#eae6da", muted: "#8f96ad", gold: "#cfa95f", soft: "#ecd096" },
    conservator: { bg: "#f1eadb", bg2: "#e7ddc5", surface: "#fbf7ee", ink: "#221c12", muted: "#5c4f3c", gold: "#7f5218", soft: "#7a2e2e", light: true },
    notepad:    { bg: "#ffffff", bg2: "#ffffff", surface: "#ffffff", ink: "#000000", muted: "#2e2e2e", gold: "#000000", soft: "#0000cc", light: true },
    construct:  { bg: "#000000", bg2: "#010a04", surface: "#04160a", ink: "#33ff66", muted: "#2ed461", gold: "#33ff66", soft: "#b8ffcc" },
    odyssey:    { bg: "#04121a", bg2: "#071a24", surface: "#0a2230", ink: "#f2e8d5", muted: "#9db3b8", gold: "#ffb347", soft: "#ffd9a0" },
    cursedwing: { bg: "#0a0507", bg2: "#0e070a", surface: "#150b0e", ink: "#f2e8dc", muted: "#b8a09a", gold: "#ea5f43", soft: "#f8b6a5" },
    abyss:      { bg: "#03111c", bg2: "#051826", surface: "#082233", ink: "#e6f6f8", muted: "#9cbdc9", gold: "#4fd6e2", soft: "#b2eef3" },
    xeno:       { bg: "#030a0a", bg2: "#061312", surface: "#0a1a19", ink: "#e9f6ee", muted: "#a4d1c4", gold: "#55f5c6", soft: "#b4ffe6" },
    alchemist:  { bg: "#050f0a", bg2: "#0a1b12", surface: "#0c2016", ink: "#f4ecd4", muted: "#c4d0b4", gold: "#dfb75a", soft: "#f5dfa0" },
    valhalla:   { bg: "#0b0806", bg2: "#150e09", surface: "#1a120b", ink: "#f8ecd6", muted: "#d0ba99", gold: "#f39a3d", soft: "#ffd18a" },
    dynasty:    { bg: "#130306", bg2: "#1e080d", surface: "#2a0b11", ink: "#fff4e6", muted: "#efcdc2", gold: "#f4c531", soft: "#ffe58f" },
    zen:        { bg: "#0a0c0d", bg2: "#101315", surface: "#151a1d", ink: "#f3efe5", muted: "#cdd0c6", gold: "#b9d58a", soft: "#dcebbc" },
    silkroad:   { bg: "#050b16", bg2: "#0a1426", surface: "#0d1a33", ink: "#f9f0dc", muted: "#dbd0b4", gold: "#e8ba4c", soft: "#f8de98" },
    // the six new themes
    arcade:     { bg: "#0b0820", bg2: "#100b2c", surface: "#161038", ink: "#f6f3ff", muted: "#cfc8f2", gold: "#ffd23f", soft: "#ffe88a", teal: "#40e0d0" },
    pulp:       { bg: "#f6ecd2", bg2: "#efe1bf", surface: "#fffaee", ink: "#17120d", muted: "#3b3127", gold: "#b3101f", soft: "#b3101f", yellow: "#ffd400", blue: "#1f4fa8", light: true },
    drafting:   { bg: "#0c2a50", bg2: "#0f3059", surface: "#11355f", ink: "#f3f8ff", muted: "#cfe0f5", gold: "#ffd27a", soft: "#ffe3a8" },
    diorama:    { bg: "#f3ece4", bg2: "#efe4d7", surface: "#fffaf5", ink: "#2a2320", muted: "#4c423d", gold: "#a9481f", soft: "#c25a2c", light: true },
    bauhaus:    { bg: "#f2efe6", bg2: "#e8e3d5", surface: "#ffffff", ink: "#111111", muted: "#2f2f2f", gold: "#c32a17", soft: "#c32a17", blue: "#1d4ea1", yellow: "#f2c230", light: true },
    terminal:   { bg: "#0d0f12", bg2: "#12151a", surface: "#171b20", ink: "#f6f3ea", muted: "#d2cdbe", gold: "#ffc43d", soft: "#ffd978" }
  };
  function palette(id, tableOnly) {
    var base = PAL[id] || PAL.afterhours, out = {}, k;
    for (k in base) out[k] = base[k];
    // a theme switch starts before the new theme's stylesheet has loaded, so its live colours are still the old theme's: use the table
    var live = !tableOnly && (!qs("theme") || qs("theme") === html.getAttribute("data-atmo"));
    if (live && html.getAttribute("data-atmo") === id) {
      try {
        var cs = getComputedStyle(html), map = { bg: "--bg", bg2: "--bg2", surface: "--surface", ink: "--ink", muted: "--muted", gold: "--gold", soft: "--gold-soft" };
        for (k in map) { var v = (cs.getPropertyValue(map[k]) || "").trim(); if (v && parseColor(v)) out[k] = v; }
      } catch (e) { /* keep the table */ }
    }
    if (out.light == null) out.light = lum(out.bg) > 0.5;
    return out;
  }

  /* ============================== fonts ============================== */
  var SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
  var SANS = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  var MONO = '"Cascadia Code", "Cascadia Mono", Consolas, "SF Mono", ui-monospace, Menlo, "DejaVu Sans Mono", monospace';
  var HEAVY = '"Arial Black", "Helvetica Neue", Helvetica, "Segoe UI", system-ui, sans-serif';
  var GEO = '"Futura", "Century Gothic", "Avenir Next", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  var fontsReady = null;
  function loadFonts() {
    if (fontsReady) return fontsReady;
    var fs = document.fonts;
    if (!fs || !fs.load) { fontsReady = Promise.resolve(); return fontsReady; }
    fontsReady = Promise.all(["500", "600", "700"].map(function (w) { return fs.load(w + " 40px Fraunces", "TITAN RELIQUARY").catch(function () {}); }));
    return fontsReady;
  }

  /* ============================== kit (shared drawing helpers) ============================== */
  var spriteCache = {};
  function sprite(color, size) {                    // soft round glow, tinted; cached
    var key = color + "|" + size, c = spriteCache[key];
    if (c) return c;
    c = mk(size, size); var g = ctx2(c), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r), p = parseColor(color) || [255, 255, 255];
    gr.addColorStop(0, "rgba(" + p.join(",") + ",1)"); gr.addColorStop(0.25, "rgba(" + p.join(",") + ",.5)"); gr.addColorStop(0.6, "rgba(" + p.join(",") + ",.12)"); gr.addColorStop(1, "rgba(" + p.join(",") + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    spriteCache[key] = c; return c;
  }
  var grainTile = null;
  function grain(g, W, H, alpha, frame) {          // film / paper grain: one cached noise tile at a jumping offset
    if (!grainTile) {
      grainTile = mk(128, 128); var gg = ctx2(grainTile), id = gg.createImageData(128, 128), r = rng(7);
      for (var i = 0; i < id.data.length; i += 4) { var v = 128 + (r() - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      gg.putImageData(id, 0, 0);
    }
    var ox = (frame * 37) % 128, oy = (frame * 61) % 128;
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = "overlay";
    for (var x = -ox; x < W; x += 128) for (var y = -oy; y < H; y += 128) g.drawImage(grainTile, x, y);
    g.restore();
  }
  function textW(g, s, track) { var w = 0; for (var i = 0; i < s.length; i++) w += g.measureText(s[i]).width + (i < s.length - 1 ? track : 0); return w; }
  /* Wordmark layout: lines of tracked capitals, each glyph with its own position, centred on (cx, cy).
     o: { lines:[..], font:(size)->css font, track: em, maxW: px, justify: bool (each line fills maxW), gap: em, cx, cy, capH: 0.7 } */
  function wordLayout(g, o) {
    var lines = o.lines, fw = o.maxW, track = o.track || 0, out = { lines: [], size: 0 }, i, j, size;
    function widthAt(text, sz) { g.font = o.font(sz); return textW(g, text, track * sz); }
    var sizes = [], ref = 100;
    if (o.justify) { for (i = 0; i < lines.length; i++) sizes.push(Math.min(o.maxSize || 999, ref * fw / widthAt(lines[i], ref))); }
    else {
      var wmax = 0; for (i = 0; i < lines.length; i++) wmax = Math.max(wmax, widthAt(lines[i], ref));
      size = Math.min(o.maxSize || 999, ref * fw / wmax); for (i = 0; i < lines.length; i++) sizes.push(size);
    }
    var gap = o.gap == null ? 0.28 : o.gap, capH = o.capH || 0.7, totalH = 0;
    for (i = 0; i < lines.length; i++) totalH += sizes[i] * capH + (i ? sizes[i] * gap : 0);
    var y = o.cy - totalH / 2;
    for (i = 0; i < lines.length; i++) {
      var sz = sizes[i], text = lines[i], w = widthAt(text, sz), x = o.cx - w / 2, gl = [];
      g.font = o.font(sz);
      for (j = 0; j < text.length; j++) { var cw = g.measureText(text[j]).width; gl.push({ ch: text[j], x: x, w: cw, cx: x + cw / 2 }); x += cw + track * sz; }
      out.lines.push({ text: text, size: sz, base: y + sz * capH, top: y, h: sz * capH, w: w, x: o.cx - w / 2, glyphs: gl, font: o.font(sz) });
      y += sz * capH + sz * gap;
      out.size = Math.max(out.size, sz);
    }
    out.cx = o.cx; out.cy = o.cy; out.h = totalH;
    var wm = 0; out.lines.forEach(function (l) { wm = Math.max(wm, l.w); }); out.w = wm;
    return out;
  }
  function drawWord(g, L, fill, alphaFn) {         // draw a layout's glyphs (alphaFn(lineIndex, glyphIndex, glyph) -> 0..1 or null)
    g.textBaseline = "alphabetic"; g.textAlign = "left";
    L.lines.forEach(function (ln, li) {
      g.font = ln.font;
      ln.glyphs.forEach(function (gl, gi) { var a = alphaFn ? alphaFn(li, gi, gl, ln) : 1; if (a <= 0.003) return; g.globalAlpha = a; g.fillStyle = typeof fill === "function" ? fill(li, gi, gl, ln) : fill; g.fillText(gl.ch, gl.x, ln.base); });
    });
    g.globalAlpha = 1;
  }
  /* Sample points inside a mask drawn by drawFn(g2, W, H); returns {x:Float32Array,y:Float32Array} of exactly n points (jittered grid, shuffled) */
  function maskPoints(W, H, drawFn, n, rnd, scale) {
    scale = scale || 1;
    var c = mk(W * scale, H * scale), g = ctx2(c, true); g.scale(scale, scale); drawFn(g, W, H);
    var d = g.getImageData(0, 0, c.width, c.height).data, pts = [], step = Math.max(1, Math.floor(Math.sqrt((c.width * c.height) / (n * 6)))), x, y;
    for (y = 0; y < c.height; y += step) for (x = 0; x < c.width; x += step) {
      var px = x + rnd() * step, py = y + rnd() * step, ix = Math.min(c.width - 1, px | 0), iy = Math.min(c.height - 1, py | 0);
      if (d[(iy * c.width + ix) * 4 + 3] > 110) pts.push(px / scale, py / scale);
    }
    c.width = 1;
    var m = pts.length / 2, X = new Float32Array(n), Y = new Float32Array(n), i, order = [];
    if (!m) { for (i = 0; i < n; i++) { X[i] = W / 2; Y[i] = H / 2; } return { x: X, y: Y }; }
    for (i = 0; i < m; i++) order.push(i);
    for (i = m - 1; i > 0; i--) { var j = (rnd() * (i + 1)) | 0, t = order[i]; order[i] = order[j]; order[j] = t; }
    for (i = 0; i < n; i++) { var k = order[i % m]; X[i] = pts[k * 2] + (i >= m ? (rnd() - 0.5) * step : 0); Y[i] = pts[k * 2 + 1] + (i >= m ? (rnd() - 0.5) * step : 0); }
    return { x: X, y: Y };
  }
  function fitRect(w, h, bw, bh, fillPad) { var s = Math.min(w / bw, h / bh); return s; }

  /* ---------- the featured coin ---------- */
  var coinImg = null, coinUrl = null, coinLoading = false;
  function loadCoin(url, cb) {
    if (!url) return cb && cb(null);
    if (coinImg && coinUrl === url) return cb && cb(coinImg);
    var im = new Image(); coinLoading = true;
    im.onload = function () { coinLoading = false; coinImg = im; coinUrl = url; cb && cb(im); };
    im.onerror = function () { coinLoading = false; cb && cb(null); };
    im.src = url;
  }
  function labelOf(f) { return f && f.country ? [f.country, f.year, f.denom].filter(Boolean).join("  \u00b7  ") : ""; }
  function saveCoin(f) { if (f && f.thumb) lsSet(COINKEY, JSON.stringify({ thumb: f.thumb, label: labelOf(f) })); }
  function storedCoin() {
    var v = lsGet(COINKEY); if (!v) return null;
    try { return v.charAt(0) === "{" ? JSON.parse(v) : { thumb: v, label: "" }; } catch (e) { return null; }
  }
  /* A round coin face for styles that need one: the real photo when it loaded, otherwise a drawn medallion (never blank) */
  function coinFace(size, pal, img) {
    var c = mk(size, size), g = ctx2(c), r = size / 2;
    if (img) {
      g.save(); g.beginPath(); g.arc(r, r, r - 0.5, 0, PI2); g.clip();
      var m = Math.min(img.width, img.height); g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size); g.restore();
      return c;
    }
    var gr = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    gr.addColorStop(0, "#f3f4f6"); gr.addColorStop(0.45, "#a6a9b0"); gr.addColorStop(0.8, "#5d6068"); gr.addColorStop(1, "#33353b");
    g.fillStyle = gr; g.beginPath(); g.arc(r, r, r - 1, 0, PI2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = size * 0.02; g.beginPath(); g.arc(r, r, r * 0.9, 0, PI2); g.stroke();
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = size * 0.012; g.beginPath(); g.arc(r, r, r * 0.8, 0, PI2); g.stroke();
    g.fillStyle = "rgba(40,42,48,.55)"; g.font = "700 " + size * 0.36 + 'px ' + SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("T", r, r + size * 0.02);
    return c;
  }
  /* Duotone a coin face: luminance -> a two-colour ramp (shadow -> light), contrast curve g; alpha kept */
  function toneFace(face, c0, c1, gamma, gain) {
    var S = face.width, c = mk(S, S), g = ctx2(c, true), a = parseColor(c0), b = parseColor(c1);
    g.drawImage(face, 0, 0);
    var id = g.getImageData(0, 0, S, S), d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; l = clamp(Math.pow(l, gamma || 1) * (gain || 1), 0, 1);
      d[i] = a[0] + (b[0] - a[0]) * l; d[i + 1] = a[1] + (b[1] - a[1]) * l; d[i + 2] = a[2] + (b[2] - a[2]) * l;
    }
    g.putImageData(id, 0, 0); return c;
  }
  function moonFace(face) { return toneFace(face, "#050d26", "#dfe9ff", 1.2, 1.25); }
  /* Crest symbol (#crest-{id} in index.html) as an offscreen canvas of white line art, via a data-URL SVG image (async) */
  function crestCanvas(id, size, cb) {
    var sym = document.getElementById("crest-" + id);
    if (!sym) return cb(null);
    var vb = sym.getAttribute("viewBox") || "0 0 200 200";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + size + '" height="' + size + '" color="#fff" style="color:#fff">' + sym.innerHTML + "</svg>";
    var im = new Image();
    im.onload = function () { var c = mk(size, size), g = ctx2(c); g.drawImage(im, 0, 0, size, size); cb(c); };
    im.onerror = function () { cb(null); };
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  var K = {
    clamp: clamp, lerp: lerp, sm: sm, seg: seg, eo3: eo3, eo2: eo2, ei2: ei2, ei3: ei3, eio: eio, eob: eob, eoel: eoel, bounce: bounce, rng: rng, hash: hash,
    mk: mk, ctx2: ctx2, rgb: rgb, mixc: mixc, lum: lum, parse: parseColor, sprite: sprite, grain: grain, wordLayout: wordLayout, drawWord: drawWord,
    maskPoints: maskPoints, coinFace: coinFace, moonFace: moonFace, toneFace: toneFace, crestCanvas: crestCanvas, textW: textW,
    SERIF: SERIF, SANS: SANS, MONO: MONO, HEAVY: HEAVY, GEO: GEO, PI2: PI2
  };

  function releaseCanvases(C) {
    function drop(v) { if (v && v.tagName === "CANVAS") { v.width = 1; v.height = 1; } else if (Array.isArray(v)) v.forEach(drop); }
    for (var k in C) { if (k === "cv" || k === "root") continue; var v = C[k]; drop(v); if (v && v._glow) for (var q in v._glow) v._glow[q].c.width = 1; }
    for (k in spriteCache) { spriteCache[k].width = 1; delete spriteCache[k]; }
    if (grainTile) { grainTile.width = 1; grainTile = null; }
    C.g = null;
  }
  /* ============================== engine ============================== */
  var STYLES = {};
  function styleFor(id) { return STYLES[id] || STYLES.__crest; }

  function play(root, id, featured, done, opts) {
    opts = opts || {};
    var style = styleFor(id), pal = palette(id, !!opts.tableOnly), hold = /[?&]splashhold\b/.test(location.search);
    var calm = opts.calm != null ? opts.calm : motionLevel() === "calm";
    var cv = document.createElement("canvas"); cv.className = "ts-mo"; cv.setAttribute("aria-hidden", "true");
    root.insertBefore(cv, root.firstChild);
    root.classList.add("ts-motion");
    root.style.setProperty("--ts-bg", pal.bg);
    var g = cv.getContext("2d");
    var C = { root: root, cv: cv, g: g, id: id, pal: pal, K: K, W: 0, H: 0, dpr: 1, small: false, portrait: true, featured: featured || null, coin: null, crest: null, frame: 0, t: 0, ready: false,
              rnd: rng(1717), cue: opts.cue || function () {}, reveal: function () { html.classList.add("ts-reveal"); root.classList.add("ts-handoff"); } };
    // total budget 2.5-3.5 s: the timeline plays at most 2.85 s (a little brisker than authored) and the caller dissolves it in 0.7 s; a style that wipes itself clear needs no dissolve
    var speed = style.wipe ? 1 : Math.max(1, style.dur / 2.85);
    var raf = 0, stopped = false, started = false, t0 = 0, doneCalled = false, timers = [], resizeT = 0, gate = null;
    function later(fn, ms) { var h = setTimeout(fn, ms); timers.push(h); return h; }

    function layout() {
      var W = Math.max(1, root.clientWidth || window.innerWidth), H = Math.max(1, root.clientHeight || window.innerHeight);
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (W * H * dpr * dpr > 1.7e6) dpr = Math.max(1, Math.sqrt(1.7e6 / (W * H)));      // keep the canvas under ~1.7 M pixels
      C.W = W; C.H = H; C.dpr = dpr; C.small = Math.min(W, H) < 520; C.portrait = H >= W * 0.95;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function initStyle() { C.rnd = rng(1717 + id.length * 31); try { style.init(C); } catch (e) { if (window.console) console.warn("opening init", e); } }

    function drawAt(t) {
      C.t = t; C.frame++;
      g.setTransform(C.dpr, 0, 0, C.dpr, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.shadowBlur = 0; g.shadowColor = "transparent"; g.filter = "none";
      try { style.draw(C, t); } catch (e) { if (window.console) console.warn("opening draw", e); }
    }
    function finishTimeline() {
      if (doneCalled) return; doneCalled = true; TitanOpening._debug.endedAt = performance.now();
      try { done && done({ wiped: !!style.wipe && !calm }); } catch (e) { if (window.console) console.warn("opening done", e); }   // Calm shows a still frame, so it always dissolves
    }
    function tick(now) {
      raf = 0; if (stopped) return;
      var t = (now - t0) / 1000 * speed;
      if (t >= style.dur) { drawAt(style.dur); finishTimeline(); return; }       // the final frame stays on screen while the caller dissolves it
      drawAt(t); raf = requestAnimationFrame(tick);
    }
    function begin() {
      if (started || stopped) return; started = true;
      if (hold) { drawAt(0); return; }
      if (calm) {                                    // Calm: one still frame of the theme's splash for ~1 s, then the caller fades it
        drawAt(style.still != null ? style.still : style.dur * 0.9);
        later(finishTimeline, 1000); return;
      }
      t0 = performance.now(); TitanOpening._debug.startedAt = t0; raf = requestAnimationFrame(tick);
    }
    function relayout() {
      if (stopped) return; layout(); initStyle();
      if (started) drawAt(calm ? (style.still != null ? style.still : style.dur * 0.9) : clamp(C.t, 0, style.dur));
    }
    function onResize() { clearTimeout(resizeT); resizeT = setTimeout(relayout, 120); }

    layout();
    g.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); g.fillStyle = pal.bg; g.fillRect(0, 0, C.W, C.H);       // first paint = the theme's background at once, never a black flash
    // fonts first (max ~300 ms), then the style's async assets (coin photo, crest), then the clock starts
    var fontsDone = false, assetsDone = false;
    function go() { if (!fontsDone || !assetsDone || started || stopped) return; initStyle(); C.ready = true; begin(); }
    loadFonts().then(function () { fontsDone = true; go(); });
    later(function () { fontsDone = true; assetsDone = true; go(); }, 320);
    var need = (style.needs || []).slice(), pending = 0;
    function one() { pending--; if (pending <= 0) { assetsDone = true; go(); } }
    if (need.indexOf("coin") >= 0) {
      C.coinInfo = featured && featured.thumb ? { thumb: featured.thumb, label: labelOf(featured) } : storedCoin();
      if (featured && featured.thumb) saveCoin(featured);
      if (C.coinInfo && C.coinInfo.thumb) { pending++; loadCoin(C.coinInfo.thumb, function (im) { C.coin = im; one(); }); }
    }
    if (need.indexOf("crest") >= 0) { pending++; crestCanvas(id, 320, function (c) { C.crest = c; one(); }); }
    if (!pending) assetsDone = true;
    go();
    if (!hold) window.addEventListener("resize", onResize);

    var api = {
      stop: function () {
        if (stopped) return; stopped = true;
        if (raf) cancelAnimationFrame(raf); timers.forEach(clearTimeout);
        window.removeEventListener("resize", onResize);
        try { if (style.dispose) style.dispose(C); } catch (e) { /* ignore */ }
        releaseCanvases(C);                                              // every offscreen canvas the style made gives its backing store back
        cv.width = 1; cv.height = 1;                                     // release the backing store
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        root.classList.remove("ts-motion");
      },
      feature: function (f) {                                            // the featured coin arrived after play() started: it opens the NEXT launch
        C.featured = f || null;
        if (f && f.thumb) { saveCoin(f); try { var pre = new Image(); pre.src = f.thumb; } catch (e) { /* prefetch only */ } }
      },
      seek: function (t) { if (!started) { initStyle(); started = true; C.ready = true; } drawAt(t); return true; }
    };
    TitanOpening._debug.api = api; TitanOpening._debug.C = C; TitanOpening._debug.style = style;
    return api;
  }

  /* ============================== STYLES ============================== */
  /* ---------- the wordmark, laid out for this screen: two stacked lines on a phone, one line on a wide screen ---------- */
  function wordmark(C, o) {
    var g = C.g, W = C.W, H = C.H, stacked = C.portrait && W < 700;
    var maxW = o.maxW || (stacked ? W * 0.8 : Math.min(W * 0.62, 900));
    var L = wordLayout(g, {
      lines: o.lines || (stacked ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"]), font: o.font || function (s) { return "600 " + s + "px " + SERIF; },
      track: o.track == null ? 0.16 : o.track, maxW: maxW, justify: o.justify != null ? o.justify : stacked, gap: o.gap, capH: o.capH, maxSize: o.maxSize || (stacked ? 120 : 110),
      cx: o.cx == null ? W / 2 : o.cx, cy: o.cy == null ? H / 2 : o.cy
    });
    L.stacked = stacked;
    return L;
  }
  K.wordmark = wordmark;

  /* ---------- swarm: particles travelling through a list of target stages; position = pure function of time ---------- */
  function makeSwarm(C, N) {
    var rnd = C.rnd, W = C.W, H = C.H, i;
    var S = { n: N, dl: new Float32Array(N), cv: new Float32Array(N), sz: new Float32Array(N), cl: new Uint8Array(N), hx: new Float32Array(N), hy: new Float32Array(N),
      ax: new Float32Array(N), ay: new Float32Array(N), ph: new Float32Array(N), fr: new Float32Array(N), rs: new Float32Array(N), st: [], tr: [], px: 0, py: 0, pb: 0, pk: -1, pg: 0, shimmer: 0.5 };
    for (i = 0; i < N; i++) {
      S.hx[i] = rnd() * W; S.hy[i] = rnd() * H; S.ax[i] = 4 + rnd() * 14; S.ay[i] = 4 + rnd() * 14; S.ph[i] = rnd() * PI2; S.fr[i] = 0.5 + rnd() * 1.1;
      S.dl[i] = rnd(); S.cv[i] = rnd() * 2 - 1; S.sz[i] = 0.8 + Math.pow(rnd(), 2.2) * 1.5; S.rs[i] = 4 + rnd() * 12;
    }
    return S;
  }
  function swarmHome(S, i, t) { S.px = S.hx[i] + S.ax[i] * Math.sin(t * S.fr[i] + S.ph[i]); S.py = S.hy[i] + S.ay[i] * Math.cos(t * S.fr[i] * 0.9 + S.ph[i] * 1.3) - t * S.rs[i]; }
  function swarmPos(S, i, t) {
    var tr = S.tr, k, s = 0, T = tr.length;
    for (k = T - 1; k >= 0; k--) { s = tr[k].t0 + S.dl[i] * tr[k].spread; if (t >= s) break; }
    S.pk = k;
    if (k < 0) { swarmHome(S, i, t); S.pb = S.st[0].b[i]; S.pg = 0; return; }
    var A = S.st[k], B = S.st[k + 1], fx, fy, T0 = tr[k];
    if (k === 0) { swarmHome(S, i, s); fx = S.px; fy = S.py; } else { fx = A.x[i]; fy = A.y[i]; }
    var g = T0.ease(clamp((t - s) / T0.dur, 0, 1)), dx = B.x[i] - fx, dy = B.y[i] - fy, len = Math.sqrt(dx * dx + dy * dy) + 0.001;
    var sw = Math.sin(g * Math.PI) * S.cv[i] * len * T0.curl;
    S.px = fx + dx * g - (dy / len) * sw; S.py = fy + dy * g + (dx / len) * sw;
    S.pb = A.b[i] + (B.b[i] - A.b[i]) * g; S.pg = g;
    if (g >= 1) { S.px += Math.sin(t * 2.6 + S.ph[i]) * S.shimmer; S.py += Math.cos(t * 2.2 + S.ph[i] * 1.7) * S.shimmer; }
  }
  /* batched square particles: a position and an alpha bucket are written per particle, then drawn as a few big paths (one fill per colour x alpha step) */
  var NB = 10;
  function makeBatch(n) { return { X: new Float32Array(n), Y: new Float32Array(n), Z: new Float32Array(n), B: new Uint8Array(n), k: 1 }; }
  function batchFlush(g, bt, cols, starts) {
    for (var ci = 0; ci < cols.length; ci++) {
      g.fillStyle = cols[ci];
      for (var b = 0; b < NB; b++) {
        var any = false;
        for (var i = starts[ci]; i < starts[ci + 1]; i++) if (bt.B[i] === b) { if (!any) { g.beginPath(); any = true; } var z = bt.Z[i]; g.rect(bt.X[i] - z / 2, bt.Y[i] - z / 2, z, z); }
        if (any) { g.globalAlpha = Math.min(1, (b + 0.6) / NB * bt.k); g.fill(); }
      }
    }
    g.globalAlpha = 1;
  }
  /* coin samples: particles gather on the relief (edges of the design) and on the bright metal, plus a rim ring */
  function coinSamples(face, n, cx, cy, R, rnd, ring) {
    var S = 96, c = mk(S, S), g = ctx2(c, true); g.drawImage(face, 0, 0, S, S);
    var d = g.getImageData(0, 0, S, S).data, X = new Float32Array(n), Y = new Float32Array(n), B = new Float32Array(n), i = 0, tries = 0, u, v;
    var L = new Float32Array(S * S), E = new Float32Array(S * S), emax = 0.0001;
    for (i = 0; i < S * S; i++) L[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
    for (v = 1; v < S - 1; v++) for (u = 1; u < S - 1; u++) { var gx = L[v * S + u + 1] - L[v * S + u - 1], gy = L[(v + 1) * S + u] - L[(v - 1) * S + u], e = Math.sqrt(gx * gx + gy * gy); E[v * S + u] = e; if (e > emax) emax = e; }
    emax *= 0.55;
    var nr = Math.floor(n * (ring == null ? 0.16 : ring)); i = 0;
    while (i < n - nr && tries++ < n * 80) {
      u = rnd() * S | 0; v = rnd() * S | 0; var o = (v * S + u), a = d[o * 4 + 3] / 255; if (a < 0.5) continue;
      var l = L[o], e = Math.min(1, E[o] / emax), w = 0.05 + 0.3 * Math.pow(l, 1.5) + 1.6 * e; if (rnd() > w) continue;
      X[i] = cx + ((u + rnd()) / S * 2 - 1) * R; Y[i] = cy + ((v + rnd()) / S * 2 - 1) * R; B[i] = clamp(0.35 + l * 0.5 + e * 0.5, 0.3, 1); i++;
    }
    for (; i < n; i++) { var an = rnd() * PI2, rr = R * (0.95 + rnd() * 0.05); X[i] = cx + Math.cos(an) * rr; Y[i] = cy + Math.sin(an) * rr; B[i] = 0.9; }
    c.width = 1; return { x: X, y: Y, b: B };
  }
  function flatB(n, v) { var b = new Float32Array(n); for (var i = 0; i < n; i++) b[i] = v; return b; }
  var MOON = null;
  function beamTexture() {
    if (MOON) return MOON;
    var w = 96, h = 420, c = mk(w, h), g = ctx2(c), id = g.createImageData(w, h), r = rng(5), stri = [], x, y;
    for (x = 0; x < w; x++) stri.push(0.72 + 0.28 * Math.sin(x * 0.55 + r() * 6) * Math.sin(x * 0.13 + 1.3));
    for (y = 0; y < h; y++) {
      var vy = y / h, vf = sm(vy / 0.1) * Math.pow(1 - vy, 1.1), hw = 48 * 0.82 * (0.1 + 0.9 * vy);
      for (x = 0; x < w; x++) {
        var u = (x - w / 2) / hw, a = Math.exp(-u * u) * vf * (0.9 + 0.1 * (stri[x] - 0.72) / 0.28 * (0.3 + vy)), o = (y * w + x) * 4;
        id.data[o] = 168; id.data[o + 1] = 196; id.data[o + 2] = 255; id.data[o + 3] = Math.min(255, a * 255);
      }
    }
    g.putImageData(id, 0, 0); MOON = c; return c;
  }

  /* ============================== AFTER HOURS (afterhours): blue-white dust in moonbeams gathers into the coin, then the wordmark ============================== */
  STYLES.afterhours = {
    dur: 3.1, still: 2.8, needs: ["coin"],
    init: function (C) {
      var W = C.W, H = C.H, N = C.small ? 1500 : 2400, S = makeSwarm(C, N), rnd = C.rnd, pal = C.pal;
      var cx = W / 2, cy = H * (C.portrait ? 0.43 : 0.46), R = Math.min(W, H) * (C.portrait ? 0.3 : 0.27);
      var face = coinFace(128, pal, C.coin);
      var coin = coinSamples(face, N, cx, cy, R, rnd, 0.17);
      var L = wordmark(C, { cy: H * 0.5, track: 0.16 });
      var txt = maskPoints(W, H, function (g) { drawWord(g, L, "#fff"); }, N, rnd, 1);
      var home = { x: S.hx, y: S.hy, b: flatB(N, 0.3) };
      txt.b = flatB(N, 0.95); S.st = [home, coin, txt];
      S.tr = [{ t0: 0.45, dur: 0.95, spread: 0.55, ease: eio, curl: 0.34 }, { t0: 1.95, dur: 0.7, spread: 0.4, ease: eio, curl: 0.4 }];
      for (var i = 0; i < N; i++) S.cl[i] = i < N * 0.62 ? 0 : i < N * 0.9 ? 1 : 2;
      C.bt = makeBatch(N); C.s = S; C.L = L; C.face = face; C.moon = K.moonFace(coinFace(256, pal, C.coin)); C.cx = cx; C.cy = cy; C.R = R; C.cued = false;
      // three moonbeams from the upper left
      C.beams = [{ x: W * 0.02, a: 0.34, w: W * 0.34, k: 0.9 }, { x: W * 0.2, a: 0.46, w: W * 0.26, k: 0.7 }, { x: W * 0.46, a: 0.58, w: W * 0.2, k: 0.55 }];
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, S = C.s, pal = C.pal, i, N = S.n;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var gr = g.createRadialGradient(W * 0.1, -H * 0.06, 0, W * 0.1, -H * 0.06, H * 1.05);
      gr.addColorStop(0, "rgba(64,100,190,.34)"); gr.addColorStop(0.45, "rgba(30,52,120,.14)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // moonbeams
      var tex = beamTexture(), beamA = 0.8 - 0.35 * sm(seg(t, 2.2, 3.0)), len = H * 1.35;
      g.globalCompositeOperation = "lighter";
      C.beams.forEach(function (b, bi) {
        var sway = Math.sin(t * 0.55 + bi * 1.7) * 0.018, ang = b.a + sway;
        g.save(); g.translate(b.x, -H * 0.08); g.rotate(-ang); g.globalAlpha = beamA * b.k * (0.86 + 0.14 * Math.sin(t * 1.3 + bi)) * sm(seg(t, 0, 0.5));
        g.drawImage(tex, -b.w / 2, 0, b.w, len); g.restore();
      });
      g.globalAlpha = 1;
      // dust
      var cols = ["#b9d2ff", "#eef4ff", "#ffeccf"], ci, from, to;
      var bs = C.beams.map(function (b) { var a = b.a + Math.sin(t * 0.55) * 0.01; return { ax: b.x, ay: -H * 0.08, dx: Math.sin(a), dy: Math.cos(a), w: b.w * 0.4 }; });
      var starts = [0, N * 0.62 | 0, N * 0.9 | 0, N];
      var bt = C.bt;
      for (ci = 0; ci < 3; ci++) {
        for (i = starts[ci]; i < starts[ci + 1]; i++) {
          swarmPos(S, i, t);
          var a;
          if (S.pk < 0 || (S.pk === 0 && S.pg < 1)) {            // still dust: bright only inside a moonbeam
            var bf = 0;
            for (var bi = 0; bi < 3; bi++) {
              var q = bs[bi], ox = S.px - q.ax, oy = S.py - q.ay, al = ox * q.dx + oy * q.dy;
              if (al < 0) continue;
              var u = Math.abs(ox * q.dy - oy * q.dx) / (q.w * (0.1 + 0.9 * al / (H * 1.35)) + 1), f = Math.exp(-u * u) * sm(al / 160) * Math.pow(Math.max(0, 1 - al / (H * 1.35)), 0.8);
              if (f > bf) bf = f;
            }
            var dust = 0.1 + 0.8 * bf; dust *= 0.75 + 0.25 * Math.sin(t * 3 + S.ph[i] * 4);
            a = lerp(dust, S.pb, S.pg) * sm(seg(t, 0, 0.35));
          } else a = S.pb;
          if (a < 0.02) { bt.B[i] = 255; continue; }
          bt.X[i] = S.px; bt.Y[i] = S.py; bt.Z[i] = S.sz[i]; bt.B[i] = Math.min(NB - 1, (Math.min(1, a) * NB) | 0);
        }
      }
      bt.k = 1 - 0.7 * sm(seg(t, 2.7, 3.1)); batchFlush(g, bt, cols, starts);
      // out-of-focus motes (bokeh), a few
      var spr = sprite("#cfe0ff", 64), bok = 1 - sm(seg(t, 0.4, 1.2));
      if (bok > 0.01) for (i = 0; i < 26; i++) { var bx = (S.hx[i * 7] + Math.sin(t * 0.3 + i) * 12), by = (S.hy[i * 7] - t * (6 + i % 7)), bz = 18 + (i % 5) * 7; g.globalAlpha = bok * (0.05 + 0.06 * ((i * 13) % 5) / 5); g.drawImage(spr, bx - bz / 2, ((by % H) + H) % H - bz / 2, bz, bz); }
      g.globalAlpha = 1;
      // the coin, moonlit, under the dust once it has gathered; a thin rim light and a halo
      var coinA = sm(seg(t, 1.3, 1.8)) * (1 - sm(seg(t, 2.0, 2.45)));
      if (coinA > 0.01) {
        var hg = g.createRadialGradient(C.cx, C.cy, C.R * 0.7, C.cx, C.cy, C.R * 1.8); hg.addColorStop(0, "rgba(150,185,255,.28)"); hg.addColorStop(1, "rgba(150,185,255,0)");
        g.globalAlpha = coinA; g.fillStyle = hg; g.fillRect(C.cx - C.R * 1.9, C.cy - C.R * 1.9, C.R * 3.8, C.R * 3.8);
        g.globalAlpha = 0.78 * coinA; g.drawImage(C.moon, C.cx - C.R, C.cy - C.R, C.R * 2, C.R * 2);
        g.globalAlpha = 0.6 * coinA; g.strokeStyle = "#cfe0ff"; g.lineWidth = 1.2; g.beginPath(); g.arc(C.cx, C.cy, C.R + 1, 0, PI2); g.stroke();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      if (C.coinInfo && C.coinInfo.label) {                              // a quiet caption under the coin while it is lit
        var ca = sm(seg(t, 1.5, 1.9)) * (1 - sm(seg(t, 2.0, 2.3)));
        if (ca > 0.01) { g.globalAlpha = ca * 0.9; g.fillStyle = "#cfe0ff"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "500 " + (C.small ? 14 : 16) + "px " + SERIF; g.fillText(C.coinInfo.label, C.cx, C.cy + C.R + 34); g.globalAlpha = 1; }
      }
      // the wordmark: dust first, solid letters take over at the end (a moonbeam glint slides across them)
      var wa = sm(seg(t, 2.55, 3.05));
      if (wa > 0) {
        var gp = seg(t, 2.6, 3.15), gx = C.L.cx - C.L.w / 2 + (C.L.w + 160) * gp - 80;
        var fillG = g.createLinearGradient(C.L.cx - C.L.w / 2, 0, C.L.cx + C.L.w / 2, 0), q = clamp((gx - (C.L.cx - C.L.w / 2)) / C.L.w, 0, 1), qw = 70 / C.L.w;
        fillG.addColorStop(0, "#dbe6fa"); fillG.addColorStop(clamp(q - qw, 0, 1), "#dbe6fa"); fillG.addColorStop(q, "#ffffff"); fillG.addColorStop(clamp(q + qw, 0, 1), "#dbe6fa"); fillG.addColorStop(1, "#dbe6fa");
        blurWord(g, C.L, "#96b9ff", 20, 0.8 * wa);
        drawWord(g, C.L, fillG, function () { return wa; });
      }
      if (!C.cued && t > 2.55) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.05, C.frame);
    }
  };

  /* ============================== generic crest splash (odyssey, cursedwing, abyss, xeno, alchemist, valhalla, dynasty, zen, silkroad + any new theme):
     particles in the theme's colours form its crest, then the wordmark ============================== */
  STYLES.__crest = {
    dur: 3.1, still: 2.8, needs: ["crest"],
    init: function (C) {
      var W = C.W, H = C.H, N = C.small ? 1600 : 2400, S = makeSwarm(C, N), rnd = C.rnd, pal = C.pal, i;
      var cx = W / 2, cy = H * (C.portrait ? 0.4 : 0.44), R = Math.min(W, H) * (C.portrait ? 0.33 : 0.28);
      var crest;
      if (C.crest) crest = maskPoints(W, H, function (g) { g.drawImage(C.crest, cx - R, cy - R, R * 2, R * 2); }, N, rnd, 1);
      else crest = maskPoints(W, H, function (g) { g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, R, 0, PI2); g.arc(cx, cy, R * 0.9, 0, PI2, true); g.fill(); }, N, rnd, 1);
      var L = wordmark(C, { cy: H * 0.5, track: 0.16 });
      var txt = maskPoints(W, H, function (g) { drawWord(g, L, "#fff"); }, N, rnd, 1);
      // start: a wide, soft ring of drifting motes, so the first frame is already alive
      var home = { x: new Float32Array(N), y: new Float32Array(N), b: flatB(N, 0.28) };
      for (i = 0; i < N; i++) { var an = rnd() * PI2, rr = Math.sqrt(rnd()) * Math.max(W, H) * 0.62; home.x[i] = S.hx[i] = W / 2 + Math.cos(an) * rr; home.y[i] = S.hy[i] = H / 2 + Math.sin(an) * rr * 0.8; }
      crest.b = flatB(N, 0.95); txt.b = flatB(N, 0.9);
      S.st = [home, crest, txt];
      S.tr = [{ t0: 0.2, dur: 1.1, spread: 0.5, ease: eio, curl: 0.55 }, { t0: 1.95, dur: 0.75, spread: 0.4, ease: eio, curl: 0.45 }];
      // the crest as a glowing line drawing, lit under the particles once they have gathered
      if (C.crest) { var tc = mk(C.crest.width, C.crest.height), tg = ctx2(tc); tg.drawImage(C.crest, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = pal.gold; tg.fillRect(0, 0, tc.width, tc.height); C.crestGold = tc; }
      for (i = 0; i < N; i++) S.cl[i] = rnd() < 0.7 ? 0 : rnd() < 0.5 ? 1 : 2;
      C.bt = makeBatch(N); C.s = S; C.L = L; C.cx = cx; C.cy = cy; C.R = R; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, S = C.s, pal = C.pal, N = S.n, i, light = pal.light;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var rg = g.createRadialGradient(C.cx, C.cy, 0, C.cx, C.cy, Math.max(W, H) * 0.7);
      rg.addColorStop(0, K.rgb(pal.gold, 0.22 * (0.4 + 0.6 * sm(seg(t, 0.6, 1.6))))); rg.addColorStop(0.55, K.rgb(pal.gold, 0.05)); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      var cols = [pal.gold, pal.soft || pal.ink, pal.ink], starts = [0, N * 0.7 | 0, N * 0.85 | 0, N], ci;
      g.globalCompositeOperation = "lighter";
      var fade = sm(seg(t, 0, 0.3));
      var bt = C.bt;
      for (ci = 0; ci < 3; ci++) {
        for (i = starts[ci]; i < starts[ci + 1]; i++) {
          swarmPos(S, i, t);
          var a = S.pb * fade; if (S.pk < 0 || S.pk === 0 && S.pg < 1) a = lerp(0.22 + 0.2 * Math.sin(t * 2.5 + S.ph[i] * 5), S.pb, S.pg) * fade;
          if (a < 0.02) { bt.B[i] = 255; continue; }
          bt.X[i] = S.px; bt.Y[i] = S.py; bt.Z[i] = S.sz[i] + (S.pk === 0 ? 0.3 : 0); bt.B[i] = Math.min(NB - 1, (Math.min(1, a) * NB) | 0);
        }
      }
      bt.k = 1; batchFlush(g, bt, cols, starts);
      var ca = sm(seg(t, 1.2, 1.7)) * (1 - sm(seg(t, 2.0, 2.45)));
      if (ca > 0.01 && C.crestGold) { g.globalAlpha = 0.55 * ca; g.drawImage(C.crestGold, C.cx - C.R, C.cy - C.R, C.R * 2, C.R * 2); g.globalAlpha = 1; }
      // sparkles: a few brighter points ride the crest
      var sp = sprite(pal.soft || pal.gold, 48), spA = sm(seg(t, 0.9, 1.5)) * (1 - sm(seg(t, 2.1, 2.5)));
      if (spA > 0.01) for (i = 0; i < 40; i++) { swarmPos(S, i * 31 % N, t); g.globalAlpha = spA * (0.35 + 0.35 * Math.sin(t * 5 + i * 2)); var zz = 12 + (i % 4) * 5; g.drawImage(sp, S.px - zz / 2, S.py - zz / 2, zz, zz); }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      // the wordmark and a gold rule
      var wa = sm(seg(t, 2.5, 3.0));
      if (wa > 0) {
        blurWord(g, C.L, pal.gold, 16, 0.75 * wa);
        drawWord(g, C.L, pal.ink, function () { return wa; });
        var rw = C.L.w * 0.5 * eo3(seg(t, 2.6, 3.0)), ry = C.L.cy + C.L.h / 2 + C.L.size * 0.5;
        g.globalAlpha = wa; g.strokeStyle = pal.gold; g.lineWidth = 1.5; g.beginPath(); g.moveTo(C.cx - rw, ry); g.lineTo(C.cx + rw, ry); g.stroke();
        g.fillStyle = pal.gold; g.beginPath(); g.moveTo(C.cx, ry - 5); g.lineTo(C.cx + 5, ry); g.lineTo(C.cx, ry + 5); g.lineTo(C.cx - 5, ry); g.closePath(); g.fill(); g.globalAlpha = 1;
      }
      if (!C.cued && t > 2.5) { C.cued = true; C.cue("land"); }
      grain(g, W, H, light ? 0.04 : 0.05, C.frame);
    }
  };

  /* ============================== THE MINT (colossus): molten silver metaballs pour from the top and solidify into the wordmark ============================== */
  var ENV = null;                                      // chrome environment lookup, 64 x 64 over the surface normal (x, y)
  function chromeEnv() {
    if (ENV) return ENV;
    ENV = new Uint8Array(64 * 64 * 3);
    for (var j = 0; j < 64; j++) for (var i = 0; i < 64; i++) {
      var nx = (i / 63) * 2 - 1, ny = (j / 63) * 2 - 1, up = -ny, rr = Math.sqrt(nx * nx + ny * ny), o = (j * 64 + i) * 3;
      // a studio: bright sky above the horizon line, a dark floor below with a warm bounce, one long softbox on the left, a thin strip light on the right
      var sky = sm((up + 0.05) / 0.5), v = 0.07 + 0.78 * sky;
      v += 0.9 * Math.exp(-Math.pow((nx + 0.45) / 0.16, 2) - Math.pow((up - 0.15) / 0.55, 2));          // softbox
      v += 0.55 * Math.exp(-Math.pow((nx - 0.62) / 0.07, 2) - Math.pow((up + 0.1) / 0.7, 2));          // strip
      v += 0.22 * Math.exp(-Math.pow((up + 0.62) / 0.12, 2));                                            // floor bounce
      var edge = sm((rr - 0.55) / 0.35);                                                                  // grazing normals reflect the dark room
      v = v * (1 - 0.55 * edge) + 0.1 * edge;
      var emb = Math.pow(clamp(-up * 0.8 + nx * 0.3, 0, 1), 2.4) * 0.55;                                 // ember rim light from below
      var r = v * 0.93 + emb * 1.0, g = v * 0.97 + emb * 0.42, b = v * 1.04 + emb * 0.12;
      ENV[o] = clamp(r, 0, 1) * 255; ENV[o + 1] = clamp(g, 0, 1) * 255; ENV[o + 2] = clamp(b, 0, 1) * 255;
    }
    return ENV;
  }
  function boxBlur(src, w, h, r, passes) {            // separable box blur on a Float32Array
    var a = src, b = new Float32Array(src.length), p, x, y, k, sum, n = r * 2 + 1;
    for (p = 0; p < passes; p++) {
      for (y = 0; y < h; y++) { sum = 0; for (k = -r; k <= r; k++) sum += a[y * w + clamp(k, 0, w - 1)]; for (x = 0; x < w; x++) { b[y * w + x] = sum / n; sum += a[y * w + clamp(x + r + 1, 0, w - 1)] - a[y * w + clamp(x - r, 0, w - 1)]; } }
      for (x = 0; x < w; x++) { sum = 0; for (k = -r; k <= r; k++) sum += b[clamp(k, 0, h - 1) * w + x]; for (y = 0; y < h; y++) { a[y * w + x] = sum / n; sum += b[clamp(y + r + 1, 0, h - 1) * w + x] - b[clamp(y - r, 0, h - 1) * w + x]; } }
    }
    return a;
  }
  STYLES.colossus = {
    dur: 3.2, still: 2.9,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, pal = C.pal, i;
      var sc = Math.max(2, Math.sqrt(W * H / 54000)), fw = Math.ceil(W / sc), fh = Math.ceil(H / sc);
      var L = wordmark(C, { cy: H * 0.5, track: 0.1, font: function (s) { return "700 " + s + "px " + SERIF; } });
      // the wordmark as a soft field (blurred mask), at field resolution
      var mc = mk(fw, fh), mg = ctx2(mc, true); mg.scale(1 / sc, 1 / sc); mg.fillStyle = "#fff"; mg.textBaseline = "alphabetic";
      L.lines.forEach(function (ln) { mg.font = ln.font; ln.glyphs.forEach(function (gl) { mg.fillText(gl.ch, gl.x, ln.base); }); });
      var md = mg.getImageData(0, 0, fw, fh).data, tf = new Float32Array(fw * fh);
      for (i = 0; i < fw * fh; i++) tf[i] = md[i * 4 + 3] / 255;
      tf = boxBlur(tf, fw, fh, 1, 2);
      var tp = maskPoints(W, H, function (g) { drawWord(g, L, "#fff"); }, C.small ? 34 : 44, rnd, 1);
      var bl = [], N = tp.x.length, cx = W / 2;
      for (i = 0; i < N; i++) bl.push({ t0: (i / N) * 0.6 + rnd() * 0.05, sx: cx + (rnd() - 0.5) * W * 0.12, tx: tp.x[i], ty: tp.y[i], r: (C.small ? 30 : 38) * (0.8 + rnd() * 0.5), ph: rnd() * PI2 });
      C.sc = sc; C.fw = fw; C.fh = fh; C.tf = tf; C.bl = bl; C.L = L; C.F = new Float32Array(fw * fh);
      C.fc = mk(fw, fh); C.fg = ctx2(C.fc, true); C.fid = C.fg.createImageData(fw, fh);
      C.gc = mk(fw, fh); C.gg = ctx2(C.gc, true); C.gid = C.gg.createImageData(fw, fh);
      C.pool = H * 0.42; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, fw = C.fw, fh = C.fh, sc = C.sc, F = C.F, tf = C.tf, i, x, y;
      // the forge room: dark umber, an ember glow rising from the bottom
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var eg = g.createRadialGradient(W / 2, H * 1.02, 0, W / 2, H * 1.02, H * 0.85);
      eg.addColorStop(0, "rgba(255,120,30,.34)"); eg.addColorStop(0.5, "rgba(190,70,10,.12)"); eg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = eg; g.fillRect(0, 0, W, H);
      // ---- the field: metaball kernels + the wordmark field as the drops arrive
      F.fill(0);
      var solid = eo3(seg(t, 1.25, 2.3)), shrink = sm(seg(t, 1.9, 2.6)), pool = C.pool;
      for (i = 0; i < C.bl.length; i++) {
        var b = C.bl[i], g1 = seg(t, b.t0, b.t0 + 0.62), g2 = seg(t, b.t0 + 0.5, b.t0 + 1.35);
        if (t < b.t0) continue;
        var bx = lerp(b.sx, b.sx, g1), by = lerp(-b.r * 1.4, pool, ei2(g1));
        var px = lerp(bx, b.tx, eo3(g2)), py = lerp(by, b.ty, eo3(g2)) + Math.sin(g2 * Math.PI) * 26;
        px += Math.sin(t * 5 + b.ph) * 2.5 * (1 - shrink);
        var r = b.r * (1 + 0.1 * Math.sin(t * 6 + b.ph)) * (1 - 0.42 * shrink) * (0.55 + 0.45 * sm(seg(t, b.t0, b.t0 + 0.2)));
        var rf = r / sc, cxf = px / sc, cyf = py / sc, x0 = Math.max(0, Math.floor(cxf - rf)), x1 = Math.min(fw - 1, Math.ceil(cxf + rf)), y0 = Math.max(0, Math.floor(cyf - rf)), y1 = Math.min(fh - 1, Math.ceil(cyf + rf)), R2 = rf * rf;
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var dx = x - cxf, dy = y - cyf, d2 = dx * dx + dy * dy; if (d2 < R2) { var k = 1 - d2 / R2; F[y * fw + x] += k * k * k * 1.1; } }
      }
      if (solid > 0.001) {
        var wob = (1 - sm(seg(t, 1.7, 2.5))) * 2.2;
        for (y = 0; y < fh; y++) { var sh = Math.round(Math.sin(y * 0.55 + t * 8) * wob); for (x = 0; x < fw; x++) { var xs = x + sh; if (xs < 0 || xs >= fw) continue; F[y * fw + x] += tf[y * fw + xs] * solid * 1.25; } }
      }
      // ---- shade: chrome from the field's slope; the glow canvas holds the ember halo
      var env = chromeEnv(), od = C.fid.data, gd = C.gid.data, T = 0.5, SL = 9 * (sc / 3) * 1.4, n = fw * fh, any = false;
      for (y = 0; y < fh; y++) for (x = 0; x < fw; x++) {
        i = y * fw + x; var f = F[i], o = i * 4;
        if (f < 0.04) { od[o + 3] = 0; gd[o + 3] = 0; continue; }
        any = true;
        var inner = x > 1 && x < fw - 2 && y > 1 && y < fh - 2, gx = inner ? (F[i + 1] - F[i - 1] + 0.5 * (F[i + 2] - F[i - 2])) * 0.33 : 0, gy = inner ? (F[i + fw] - F[i - fw] + 0.5 * (F[i + 2 * fw] - F[i - 2 * fw])) * 0.33 : 0, gl = Math.sqrt(gx * gx + gy * gy);
        var a = clamp((f - T) / (gl + 0.0001) + 0.5, 0, 1);
        gd[o] = 255; gd[o + 1] = 110; gd[o + 2] = 28; gd[o + 3] = clamp(f * 0.8, 0, 0.5) * 255 * (f < T ? 1 : 0.6);
        if (a <= 0) { od[o + 3] = 0; continue; }
        var nx = -gx * SL, ny = -gy * SL, nl = Math.sqrt(nx * nx + ny * ny + 1), ix = clamp(((nx / nl) * 0.5 + 0.5) * 63, 0, 63) | 0, iy = clamp(((ny / nl) * 0.5 + 0.5) * 63, 0, 63) | 0, e = (iy * 64 + ix) * 3;
        var spec = Math.pow(Math.max(0, (-nx * 0.42 - ny * 0.62 + 0.66) / nl), 36) * 0.9, thick = clamp((f - T) * 1.6, 0, 1), ao = 0.82 + 0.18 * thick;
        od[o] = clamp(env[e] * ao + spec * 255, 0, 255); od[o + 1] = clamp(env[e + 1] * ao + spec * 255, 0, 255); od[o + 2] = clamp(env[e + 2] * ao + spec * 255, 0, 255); od[o + 3] = a * 255;
      }
      var fa = 1 - sm(seg(t, 2.45, 2.95));
      if (any) {
        C.gg.putImageData(C.gid, 0, 0); C.fg.putImageData(C.fid, 0, 0);
        g.imageSmoothingEnabled = true; g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.9 * (0.4 + 0.6 * fa); g.drawImage(C.gc, 0, 0, W, H);
        g.globalCompositeOperation = "source-over"; g.globalAlpha = fa; g.drawImage(C.fc, 0, 0, W, H); g.globalAlpha = 1;
      }
      // ---- the finished letters: cast silver with a travelling highlight
      var wa = sm(seg(t, 2.35, 2.9));
      if (wa > 0) {
        var L = C.L, top = L.cy - L.h / 2, bot = L.cy + L.h / 2, gp = seg(t, 2.5, 3.2), gx0 = L.cx - L.w / 2 + (L.w + 240) * gp - 120;
        var vgs = L.lines.map(function (ln) {
          var vg = g.createLinearGradient(0, ln.top, 0, ln.top + ln.h);
          vg.addColorStop(0, "#ffffff"); vg.addColorStop(0.3, "#cdd2d9"); vg.addColorStop(0.48, "#7d828b"); vg.addColorStop(0.54, "#262930"); vg.addColorStop(0.68, "#a3aab4"); vg.addColorStop(1, "#f4f6f9");
          return vg;
        });
        blurWord(g, L, "#ff7d23", 20, 0.6 * wa);
        drawWord(g, L, function (li) { return vgs[li]; }, function () { return wa; });
        // highlight pass: the same glyphs, filled with a moving white band
        var hg = g.createLinearGradient(gx0 - 90, 0, gx0 + 90, 0); hg.addColorStop(0, "rgba(255,255,255,0)"); hg.addColorStop(0.5, "rgba(255,255,255,.95)"); hg.addColorStop(1, "rgba(255,255,255,0)");
        g.save(); g.globalCompositeOperation = "lighter"; drawWord(g, L, hg, function () { return wa * 0.8 * (1 - seg(t, 3.05, 3.2)); }); g.restore();
      }
      if (!C.cued && t > 2.4) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.05, C.frame);
    }
  };

  /* ============================== PRISM (kaleido): a holographic foil sweep reveals the wordmark in thin-film rainbow colour ============================== */
  function star4(g, x, y, r, a) {                       // a four-point glint
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * 0.18, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r * 0.18, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
    g.beginPath(); g.moveTo(x - r * 1.5, y); g.quadraticCurveTo(x, y, x, y - r * 0.12); g.quadraticCurveTo(x, y, x + r * 1.5, y); g.quadraticCurveTo(x, y, x, y + r * 0.12); g.quadraticCurveTo(x, y, x - r * 1.5, y); g.fill();
  }
  STYLES.kaleido = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i;
      var L = wordmark(C, { cy: H * 0.5, track: 0.14, font: function (s) { return "700 " + s + "px " + SERIF; } });
      var ph = 0.42, nx = Math.cos(ph), ny = Math.sin(ph);                 // the foil sweeps along this axis (left to right, tilted)
      C.L = L; C.nx = nx; C.ny = ny; C.maxS = W * nx + H * ny; C.bw = Math.max(W, H * 0.7) * 0.5;
      C.gl = []; for (i = 0; i < 22; i++) C.gl.push({ v: rnd() * 2 - 1, k: rnd(), ph: rnd() * PI2, r: 5 + rnd() * 8 });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, L = C.L, nx = C.nx, ny = C.ny, mx = -ny, my = nx, bw = C.bw, i;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var bgG = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      bgG.addColorStop(0, "rgba(120,60,200,.34)"); bgG.addColorStop(0.6, "rgba(60,20,120,.14)"); bgG.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bgG; g.fillRect(0, 0, W, H);
      var sweep = eio(seg(t, 0.15, 2.3)), c = lerp(-bw * 0.5, C.maxS + bw * 0.55, sweep), hueT = t * 70;
      // a 12-fold mandala behind the letters, drawn in hue-cycling hairlines (the Prism crest)
      var cx = W / 2, cy = H / 2, MR = Math.min(W, H) * 0.46, ma = sm(seg(t, 0.2, 1.4)) * 0.5;
      g.save(); g.globalCompositeOperation = "lighter"; g.lineWidth = 1; g.translate(cx, cy);
      for (i = 0; i < 12; i++) {
        var an = i / 12 * PI2 + t * 0.12, hh = (i * 30 + hueT) % 360;
        g.strokeStyle = "hsla(" + hh + ",90%,70%," + (ma * 0.5) + ")"; g.beginPath(); g.moveTo(Math.cos(an) * MR * 0.28, Math.sin(an) * MR * 0.28); g.lineTo(Math.cos(an) * MR, Math.sin(an) * MR); g.stroke();
      }
      [1, 0.72, 0.46].forEach(function (k, ri) { g.strokeStyle = "hsla(" + ((ri * 80 + hueT) % 360) + ",90%,72%," + (ma * 0.6) + ")"; g.beginPath(); g.arc(0, 0, MR * k, 0, PI2); g.stroke(); });
      for (var tri = 0; tri < 2; tri++) {
        g.save(); g.rotate((tri ? -1 : 1) * t * 0.18); g.strokeStyle = "hsla(" + ((tri * 150 + hueT + 40) % 360) + ",90%,72%," + (ma * 0.7) + ")"; g.beginPath();
        for (i = 0; i < 3; i++) { var a2 = i / 3 * PI2 - Math.PI / 2 + (tri ? Math.PI / 3 : 0); g[i ? "lineTo" : "moveTo"](Math.cos(a2) * MR * 0.86, Math.sin(a2) * MR * 0.86); }
        g.closePath(); g.stroke(); g.restore();
      }
      g.restore();
      // the foil band
      var bandA = sm(seg(t, 0.1, 0.35)) * (1 - sm(seg(t, 2.1, 2.55)));
      if (bandA > 0.01) {
        g.save(); g.globalCompositeOperation = "lighter"; g.translate(0, 0);
        var p0x = nx * (c - bw / 2), p0y = ny * (c - bw / 2), p1x = nx * (c + bw / 2), p1y = ny * (c + bw / 2), bg = g.createLinearGradient(p0x, p0y, p1x, p1y);
        var N = 9; for (i = 0; i <= N; i++) { var u = i / N, env = Math.sin(u * Math.PI); env = env * env; bg.addColorStop(u, "hsla(" + ((u * 300 + 280 - hueT * 1.4) % 360 + 360) % 360 + ",100%,62%," + (0.5 * env * bandA) + ")"); }
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // diffraction hairlines inside the band
        g.beginPath(); g.rect(0, 0, W, H); g.clip(); g.globalAlpha = 0.1 * bandA; g.strokeStyle = "#fff"; g.lineWidth = 1;
        g.beginPath(); for (var s = c - bw / 2; s < c + bw / 2; s += 5) { g.moveTo(nx * s - mx * 1200, ny * s - my * 1200); g.lineTo(nx * s + mx * 1200, ny * s + my * 1200); } g.stroke();
        g.restore();
      }
      // the wordmark: revealed behind the foil edge, coloured by position (thin film), shimmering
      var x0 = L.cx - L.w / 2 - 20, y0 = L.cy - L.h / 2 - 20, x1 = L.cx + L.w / 2 + 20, y1 = L.cy + L.h / 2 + 20;
      var ua = x0 * nx + y0 * ny, ub = x1 * nx + y1 * ny, span = ub - ua, ramp = bw * 0.28;
      var wg = g.createLinearGradient(x0, y0, x0 + nx * span / (nx * nx + ny * ny) * 1, y0 + ny * span / (nx * nx + ny * ny) * 1);
      // (gradient axis runs along the sweep direction through the text box corner)
      var NS = 18;
      for (i = 0; i <= NS; i++) {
        var u = i / NS, uu = ua + span * u, vis = 1 - sm((uu - (c - ramp * 0.2)) / ramp);
        var hue = ((uu * 0.42 - hueT * 1.2) % 360 + 360) % 360;
        wg.addColorStop(u, "hsla(" + hue + ",100%," + (66 + 10 * Math.sin(uu * 0.05 + t * 3)) + "%," + clamp(vis, 0, 1) + ")");
      }
      var wa = sm(seg(t, 0.5, 1.0));
      blurWord(g, L, "#ff78e6", 20, 0.7 * wa); drawWord(g, L, wg, function () { return wa; });
      g.save(); g.globalCompositeOperation = "lighter"; drawWord(g, L, wg, function () { return wa * 0.55; });
      // chromatic fringe: cyan and magenta ghosts either side
      g.translate(-1.6, 0); drawWord(g, L, "rgba(0,230,255,.28)", function (li, gi, gl) { return wa * sm(seg(t, 1.3, 1.9)); });
      g.translate(3.2, 0); drawWord(g, L, "rgba(255,40,200,.28)", function (li, gi, gl) { return wa * sm(seg(t, 1.3, 1.9)); });
      g.restore();
      // glints riding the foil edge
      g.save(); g.globalCompositeOperation = "lighter";
      for (i = 0; i < C.gl.length; i++) {
        var q = C.gl[i], u2 = c + (q.k - 0.5) * bw * 0.9, v2 = q.v * Math.max(W, H) * 0.5, px = nx * u2 + mx * v2 + W * 0.18, py = ny * u2 + my * v2 + H * 0.2;
        px = cx + (px - cx) * 0.9; py = cy + (py - cy) * 0.9;
        var ga = Math.max(0, Math.sin(t * 6 + q.ph)) * bandA * (0.4 + 0.6 * q.k);
        if (ga < 0.05 || px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
        g.globalAlpha = ga; g.fillStyle = "hsl(" + ((i * 40 + hueT * 2) % 360) + ",100%,86%)"; star4(g, px, py, q.r, ga);
      }
      g.restore();
      if (!C.cued && t > 1.9) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.05, C.frame);
    }
  };

  /* ============================== NEON VAULT (neon): the wordmark lights up as neon tubes with a flicker, then a VHS tracking tear wipes to the app ============================== */
  function neonGlyphLayer(font, ch, w, h, color, pad) {   // one letter as a lit tube: soft halo, coloured tube, white-hot core (cached; the frame only changes its alpha)
    var c = mk(w + pad * 2, h + pad * 2), g = ctx2(c);
    g.font = font; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.lineJoin = "round";
    var bx = pad, by = pad + h * 0.86;
    g.shadowColor = color; g.shadowBlur = 24; g.strokeStyle = rgb(color, 0.5); g.lineWidth = 7; g.strokeText(ch, bx, by);
    g.shadowBlur = 12; g.strokeStyle = color; g.lineWidth = 3.4; g.strokeText(ch, bx, by);
    g.shadowBlur = 0; g.strokeStyle = "#ffffff"; g.globalAlpha = 0.92; g.lineWidth = 1.2; g.strokeText(ch, bx, by);
    g.globalAlpha = 0.07; g.fillStyle = color; g.fillText(ch, bx, by);
    return c;
  }
  function neonScene(C, g, t) {
    var W = C.W, H = C.H, pal = C.pal, i, hy = H * 0.7;
    g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
    var sky = g.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, "rgba(10,6,30,0)"); sky.addColorStop(1, "rgba(120,30,140,.34)"); g.fillStyle = sky; g.fillRect(0, 0, W, hy);
    var rise = eo3(seg(t, 0, 1.3)), R = Math.min(W * 0.36, H * 0.17), sy = hy - R + (1 - rise) * R * 1.3;
    // the slatted sun, rising from behind the horizon
    g.save(); g.beginPath(); g.rect(0, 0, W, hy); g.clip();
    var sg = g.createLinearGradient(0, sy - R, 0, sy + R); sg.addColorStop(0, "#ffd24a"); sg.addColorStop(0.5, "#ff7a8a"); sg.addColorStop(1, "#ff2fb0");
    g.globalAlpha = 0.9; g.fillStyle = sg; g.beginPath(); g.arc(W / 2, sy, R, 0, PI2); g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.arc(W / 2, sy, R, 0, PI2); g.clip();
    g.fillStyle = pal.bg; for (i = 0; i < 7; i++) { var by = sy + R * (0.05 + i * 0.14), bh = 2 + i * 1.7; g.fillRect(W / 2 - R - 2, by, R * 2 + 4, bh); }
    g.restore();
    var hg = g.createRadialGradient(W / 2, hy, 0, W / 2, hy, W * 0.7); hg.addColorStop(0, "rgba(255,70,190,.38)"); hg.addColorStop(1, "rgba(255,70,190,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = hg; g.fillRect(0, hy - W * 0.5, W, W * 0.5); g.globalCompositeOperation = "source-over";
    // the grid floor, scrolling toward the viewer
    g.fillStyle = "#07040f"; g.fillRect(0, hy, W, H - hy);
    g.save(); g.beginPath(); g.rect(0, hy, W, H - hy); g.clip(); g.lineWidth = 1.4; g.shadowColor = "#ff2fb0"; g.shadowBlur = 8;
    var ga = sm(seg(t, 0.1, 0.9));
    for (i = -10; i <= 10; i++) { g.strokeStyle = "rgba(255,70,190," + (0.55 * ga) + ")"; g.beginPath(); g.moveTo(W / 2, hy); g.lineTo(W / 2 + i * W * 0.32, H); g.stroke(); }
    for (i = 0; i < 12; i++) { var k = ((i + t * 1.6) % 12) / 12, yy = hy + (H - hy) * k * k; g.strokeStyle = "rgba(255,70,190," + (0.6 * ga * Math.min(1, k * 3)) + ")"; g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    g.restore();
    // the wordmark tubes: each letter lights in turn; two of them stutter once (never more than 3 flickers a second)
    var L = C.L, n = 0;
    L.lines.forEach(function (ln, li) {
      ln.glyphs.forEach(function (gl, gi) {
        var t0 = 0.5 + n * 0.075, a = sm(seg(t, t0, t0 + 0.14));
        if (n === 2) a *= 1 - 0.7 * (t > t0 + 0.3 && t < t0 + 0.37 ? 1 : 0) - 0.4 * (t > t0 + 0.5 && t < t0 + 0.55 ? 1 : 0);
        if (n === 9) a *= 1 - 0.6 * (t > t0 + 0.35 && t < t0 + 0.42 ? 1 : 0);
        n++;
        if (a <= 0.01 || gl.ch === " ") return;
        var layer = C.tubes[n - 1]; if (!layer) return;
        g.globalCompositeOperation = "lighter"; g.globalAlpha = Math.min(1, a); g.drawImage(layer, gl.x - C.pad, ln.base - ln.size * 0.86 - C.pad);
      });
    });
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    // tube frame
    var fa = sm(seg(t, 1.5, 2.1));
    if (fa > 0.01) { g.save(); g.globalAlpha = fa; g.drawImage(C.tubeFrame, C.fx, C.fy); g.restore(); }
    // CRT scanlines
    g.fillStyle = "rgba(0,0,0,.16)"; for (var y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  }
  STYLES.neon = {
    dur: 3.35, still: 2.3, wipe: true,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, pal = C.pal, i;
      var L = wordmark(C, { cy: H * 0.33, track: 0.1, font: function (s) { return "800 " + s + "px " + SANS; }, maxSize: 96 });
      var pad = 22, tubes = [], n = 0;
      L.lines.forEach(function (ln, li) { ln.glyphs.forEach(function (gl) { tubes.push(gl.ch === " " ? null : neonGlyphLayer(ln.font, gl.ch, Math.ceil(gl.w) + 2, ln.size, li === 0 ? pal.gold : "#ff5cbc", pad)); }); });
      // a rounded tube frame around the wordmark, open at the top for a small star
      var fw = L.w + 70, fh = L.h + 64, fp = 24, fc = mk(fw + fp * 2, fh + fp * 2), fg = ctx2(fc);
      fg.lineWidth = 3; fg.strokeStyle = "#9b6bff"; fg.shadowColor = "#9b6bff"; fg.shadowBlur = 16; fg.lineCap = "round";
      function rr(x, y, w, h, r) { fg.beginPath(); fg.moveTo(x + r, y); fg.lineTo(x + w - r, y); fg.arcTo(x + w, y, x + w, y + r, r); fg.lineTo(x + w, y + h - r); fg.arcTo(x + w, y + h, x + w - r, y + h, r); fg.lineTo(x + r, y + h); fg.arcTo(x, y + h, x, y + h - r, r); fg.lineTo(x, y + r); fg.arcTo(x, y, x + r, y, r); fg.closePath(); fg.stroke(); }
      rr(fp, fp, fw, fh, 18); fg.shadowBlur = 0; fg.strokeStyle = "#e9dcff"; fg.lineWidth = 1; rr(fp, fp, fw, fh, 18);
      C.tubeFrame = fc; C.fx = L.cx - fw / 2 - fp; C.fy = L.cy - fh / 2 - fp - L.size * 0.05;
      C.L = L; C.tubes = tubes; C.pad = pad;
      // VHS bands for the tracking tear
      var bands = [], y = 0; while (y < H) { var bh = 3 + rnd() * 13; bands.push({ y: y, h: bh, j: rnd(), s: rnd() * 2 - 1 }); y += bh; }
      C.bands = bands; C.S = mk(C.cv.width, C.cv.height); C.Sg = ctx2(C.S); C.revealed = false; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, tw0 = 2.55, tw1 = 3.3;
      if (!C.cued && t > 1.2) { C.cued = true; C.cue("land"); }
      if (t < tw0 && !C.wiping) { neonScene(C, g, t); return; }
      if (t >= tw0) { if (!C.revealed) { C.revealed = true; C.reveal(); } }
      // render the whole scene off-screen, then rebuild the screen band by band: bands slip sideways, split in colour and vanish behind the tear
      var Sg = C.Sg; Sg.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); neonScene(C, Sg, Math.min(t, tw0 - 0.01));
      var p = seg(t, tw0, tw1), front = eio(p) * (H + 220) - 60, dpr = C.dpr, S = C.S;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, C.cv.width, C.cv.height);
      for (var i = 0; i < C.bands.length; i++) {
        var b = C.bands[i], cy = b.y + b.h / 2, gone = front - cy;                 // gone > 0: the tear has passed this band
        if (gone > 60 * b.j) continue;                                             // erased
        var near = clamp(1 - Math.abs(gone + 40) / 220, 0, 1), dx = b.s * 70 * near * near * (p > 0 ? 1 : 0);
        g.drawImage(S, 0, Math.round(b.y * dpr), S.width, Math.max(1, Math.round(b.h * dpr)), Math.round(dx * dpr), Math.round(b.y * dpr), S.width, Math.max(1, Math.round(b.h * dpr)));
        if (near > 0.15) {                                                         // chroma ghosts
          g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.45 * near;
          g.drawImage(S, 0, Math.round(b.y * dpr), S.width, Math.max(1, Math.round(b.h * dpr)), Math.round((dx + 9 * near) * dpr), Math.round(b.y * dpr), S.width, Math.max(1, Math.round(b.h * dpr)));
          g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
        }
      }
      // the tracking bar itself: a bright smear with static
      g.globalAlpha = 1; g.fillStyle = "rgba(235,235,255,.55)"; g.fillRect(0, (front - 3) * dpr, C.cv.width, 6 * dpr);
      var r = C.rnd; for (var k = 0; k < 16; k++) { g.fillStyle = "rgba(255,255,255," + (0.25 + r() * 0.5) + ")"; g.fillRect(r() * C.cv.width * 0.8, (front - 40 + r() * 80) * dpr, (30 + r() * 240) * dpr, (1 + r() * 2) * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  /* small shared pieces for the next styles */
  function blurWord(g, L, color, blur, alpha) {          // soft glow of a wordmark: the blurred glyphs are drawn ONCE into a small cached layer (shadow trick, every browser) and then only blitted
    if (alpha <= 0.003) return;
    var b = Math.max(4, Math.round(blur / 4) * 4), key = color + "|" + b, cache = L._glow || (L._glow = {}), G = cache[key];
    if (!G) {
      var pad = b * 2 + 6, x = L.cx - L.w / 2 - pad, y = L.cy - L.h / 2 - L.size * 0.4 - pad, w = L.w + pad * 2, h = L.h + L.size * 0.8 + pad * 2, c = mk(w, h), cg = ctx2(c);
      cg.shadowColor = color; cg.shadowBlur = b; cg.shadowOffsetX = 5000; cg.fillStyle = color; cg.textBaseline = "alphabetic"; cg.textAlign = "left";
      L.lines.forEach(function (ln) { cg.font = ln.font; ln.glyphs.forEach(function (gl) { cg.fillText(gl.ch, gl.x - x - 5000, ln.base - y); }); });
      G = cache[key] = { c: c, x: x, y: y };
    }
    g.save(); g.globalAlpha = alpha; g.drawImage(G.c, G.x, G.y); g.restore();
  }
  K.blurWord = blurWord;
  function caption(g, C, label, y, a, color, size) {
    if (!label || a <= 0.01) return;
    g.save(); g.globalAlpha = a; g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "500 " + (size || (C.small ? 14 : 16)) + "px " + SERIF; g.fillText(label, C.W / 2, y); g.restore();
  }
  K.caption = caption;
  function starfield(C, n, r) { var a = []; for (var i = 0; i < n; i++) a.push({ x: r() * C.W, y: r() * C.H, s: 0.5 + r() * 1.3, ph: r() * PI2, k: 0.3 + r() * 0.7 }); return a; }

  /* ============================== SOLAR OBSERVATORY (solaris): a wireframe sphere spins up, turns its pole to the viewer and resolves into the coin, gold on indigo ============================== */
  STYLES.solaris = {
    dur: 3.3, still: 3.0, needs: ["coin"],
    init: function (C) {
      var W = C.W, H = C.H, pal = C.pal, i, j, lines = [], D = Math.PI / 180;
      C.R = Math.min(W, H) * (C.portrait ? 0.29 : 0.27); C.cx = W / 2; C.cy = H * (C.portrait ? 0.38 : 0.42);
      for (var lat = -75; lat <= 75; lat += 15) { var pl = []; for (j = 0; j <= 72; j++) { var lo = j / 72 * PI2; pl.push([Math.cos(lat * D) * Math.cos(lo), Math.sin(lat * D), Math.cos(lat * D) * Math.sin(lo)]); } lines.push(pl); }
      for (var k = 0; k < 12; k++) { var lo0 = k * 15 * D, ml = []; for (j = -36; j <= 36; j++) { var la = j / 36 * Math.PI / 2; ml.push([Math.cos(la) * Math.cos(lo0), Math.sin(la), Math.cos(la) * Math.sin(lo0)]); } for (j = 35; j >= -35; j--) { var lb = j / 36 * Math.PI / 2; ml.push([Math.cos(lb) * Math.cos(lo0 + Math.PI), Math.sin(lb), Math.cos(lb) * Math.sin(lo0 + Math.PI)]); } lines.push(ml); }
      C.lines = lines;
      var rings = [[1.3, 0.5], [1.55, -0.9]].map(function (rr) { var pl = []; for (var q = 0; q <= 96; q++) { var a = q / 96 * PI2; pl.push([Math.cos(a) * rr[0], 0, Math.sin(a) * rr[0]]); } return { pts: pl, tilt: rr[1] }; });
      C.rings = rings; C.stars = starfield(C, C.small ? 70 : 130, C.rnd);
      C.face = K.toneFace(coinFace(320, pal, C.coin), "#2a1600", "#ffe9b0", 1.1, 1.3);
      C.L = wordmark(C, { cy: H * (C.portrait ? 0.76 : 0.82), track: 0.26, font: function (s) { return "500 " + s + "px " + SERIF; }, maxSize: 64, maxW: C.portrait ? W * 0.78 : Math.min(W * 0.55, 760) });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, j, R = C.R, cx = C.cx, cy = C.cy;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var ig = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75); ig.addColorStop(0, "rgba(54,44,150,.52)"); ig.addColorStop(0.55, "rgba(24,20,86,.3)"); ig.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = ig; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff3d6";
      C.stars.forEach(function (s) { g.globalAlpha = s.k * (0.4 + 0.6 * Math.sin(t * 1.4 + s.ph)) * sm(seg(t, 0, 0.5)); g.fillRect(s.x, s.y, s.s, s.s); });
      g.globalAlpha = 1;
      var spin = Math.PI * 4 * sm(seg(t, 0, 2.1)) + 0.3, turn = sm(seg(t, 0.9, 2.2)), phi = 0.38 + (Math.PI / 2 - 0.38) * turn, persp = 0.9 * (1 - sm(seg(t, 1.8, 2.5)));
      var cs = Math.cos(spin), sn = Math.sin(spin), cp = Math.cos(phi), sp = Math.sin(phi), grow = eo3(seg(t, 0, 0.7)), RR = R * (0.55 + 0.45 * grow);
      function proj(p, rs, rc, ps, pc, out) {
        var x1 = p[0] * rc + p[2] * rs, z1 = -p[0] * rs + p[2] * rc, y2 = p[1] * pc - z1 * ps, z2 = p[1] * ps + z1 * pc, k = 3.4 / (3.4 - z2 * persp);
        out.x = cx + x1 * RR * k; out.y = cy - y2 * RR * k; out.z = z2;
      }
      var o = { x: 0, y: 0, z: 0 }, pv = { x: 0, y: 0, z: 0 };
      var la = 1 - 0.5 * sm(seg(t, 2.1, 2.7)), buckets = [[], [], []];
      g.globalCompositeOperation = "lighter"; g.lineWidth = 1.1; g.lineCap = "round";
      var polys = C.lines.slice(); var ringT = [];
      for (i = 0; i < polys.length; i++) {
        var pl = polys[i]; proj(pl[0], sn, cs, sp, cp, pv);
        for (j = 1; j < pl.length; j++) { proj(pl[j], sn, cs, sp, cp, o); var zb = (o.z + pv.z) * 0.5, bi = zb > 0.35 ? 2 : zb > -0.35 ? 1 : 0; buckets[bi].push(pv.x, pv.y, o.x, o.y); pv.x = o.x; pv.y = o.y; pv.z = o.z; }
      }
      var cols = ["rgba(255,181,46,", "rgba(255,196,84,", "rgba(255,226,150,"], al = [0.2, 0.45, 0.95];
      for (i = 0; i < 3; i++) { g.strokeStyle = cols[i] + (al[i] * la) + ")"; g.beginPath(); var b = buckets[i]; for (j = 0; j < b.length; j += 4) { g.moveTo(b[j], b[j + 1]); g.lineTo(b[j + 2], b[j + 3]); } g.stroke(); }
      // armillary rings, spinning independently, fading as the coin forms
      var ra = (1 - sm(seg(t, 1.9, 2.5))) * 0.75;
      if (ra > 0.01) {
        g.strokeStyle = "rgba(255,226,150," + ra + ")"; g.lineWidth = 1;
        C.rings.forEach(function (r, ri) {
          var rs = Math.sin(t * (0.9 + ri * 0.5)), rc = Math.cos(t * (0.9 + ri * 0.5)), tc = Math.cos(r.tilt), ts = Math.sin(r.tilt);
          g.beginPath();
          for (j = 0; j < r.pts.length; j++) { var p = r.pts[j], x1 = p[0] * rc + p[2] * rs, z1 = -p[0] * rs + p[2] * rc, y2 = -z1 * ts, z2 = z1 * tc, k = 3.4 / (3.4 - z2 * 0.9), sx = cx + x1 * R * k * grow, sy = cy - y2 * R * k * grow; g[j ? "lineTo" : "moveTo"](sx, sy); }
          g.stroke();
        });
      }
      g.globalCompositeOperation = "source-over";
      // the coin: photo (gold-toned) inside a double rim with reeding, once the sphere has turned face-on
      var ca = sm(seg(t, 2.0, 2.65));
      if (ca > 0.01) {
        var halo = g.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.9); halo.addColorStop(0, "rgba(255,181,46," + (0.3 * ca) + ")"); halo.addColorStop(1, "rgba(255,181,46,0)");
        g.fillStyle = halo; g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
        g.save(); g.globalAlpha = ca * 0.9; g.beginPath(); g.arc(cx, cy, R * 0.97, 0, PI2); g.clip(); g.drawImage(C.face, cx - R, cy - R, R * 2, R * 2); g.restore();
        g.strokeStyle = "rgba(255,226,150," + ca + ")"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, PI2); g.stroke();
        g.lineWidth = 1; g.strokeStyle = "rgba(255,181,46," + (0.7 * ca) + ")"; g.beginPath(); g.arc(cx, cy, R * 1.045, 0, PI2); g.stroke();
        g.beginPath(); for (i = 0; i < 120; i++) { var an = i / 120 * PI2; g.moveTo(cx + Math.cos(an) * R * 1.0, cy + Math.sin(an) * R * 1.0); g.lineTo(cx + Math.cos(an) * R * 1.03, cy + Math.sin(an) * R * 1.03); } g.stroke();
      }
      caption(g, C, C.coinInfo && C.coinInfo.label, cy + R + 36, sm(seg(t, 2.35, 2.75)), pal.soft);
      // the wordmark: letters rise out of the dark with wide tracking
      var wa = sm(seg(t, 2.5, 3.1)), L = C.L;
      if (wa > 0.01) {
        var gg = g.createLinearGradient(0, L.cy - L.h / 2, 0, L.cy + L.h / 2); gg.addColorStop(0, "#ffe9b8"); gg.addColorStop(1, "#ffb52e");
        blurWord(g, L, pal.gold, 16, wa * 0.7);
        g.save(); g.translate(0, (1 - wa) * 10); drawWord(g, L, gg, function () { return wa; }); g.restore();
        var rw = L.w * 0.5 * eo3(seg(t, 2.7, 3.2)); g.globalAlpha = wa * 0.8; g.strokeStyle = pal.gold; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - rw, L.cy + L.h / 2 + L.size * 0.5); g.lineTo(cx + rw, L.cy + L.h / 2 + L.size * 0.5); g.stroke(); g.globalAlpha = 1;
      }
      if (!C.cued && t > 2.5) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.045, C.frame);
    }
  };

  /* ============================== HYPERBOREAN VAULT (glacier): frosted glass panes slide and refract aurora light; the wordmark is a clear window in the frost ============================== */
  function auroraInto(g, w, h, t) {                      // soft aurora curtains on a small canvas (the upscale is the blur)
    g.globalCompositeOperation = "source-over";
    var bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#030c17"); bg.addColorStop(1, "#06182a"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    var cols = [[40, 230, 160], [50, 170, 235], [130, 100, 240], [70, 235, 205]];
    for (var k = 0; k < 4; k++) {
      var c = cols[k], yb = h * (0.2 + 0.1 * k), A1 = h * 0.08, A2 = h * 0.03, step = Math.max(1, w / 80), top = [], bot = [], x;
      for (x = 0; x <= w + step; x += step) {
        var y = yb + Math.sin(x / w * 5 + t * (0.6 + k * 0.17) + k * 1.7) * A1 + Math.sin(x / w * 9 - t * 0.9 + k) * A2 * 0.6, hh = h * (0.28 + 0.1 * Math.sin(x / w * 4 + t * 0.7 + k * 2));
        top.push(x, y); bot.push(x, y + hh);
      }
      var gr = g.createLinearGradient(0, yb - A1, 0, yb + h * 0.4);
      gr.addColorStop(0, "rgba(" + c.join(",") + ",0)"); gr.addColorStop(0.15, "rgba(" + c.join(",") + ",.36)"); gr.addColorStop(0.55, "rgba(" + c.join(",") + ",.1)"); gr.addColorStop(1, "rgba(" + c.join(",") + ",0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(top[0], top[1]); for (var i = 2; i < top.length; i += 2) g.lineTo(top[i], top[i + 1]);
      for (i = bot.length - 2; i >= 0; i -= 2) g.lineTo(bot[i], bot[i + 1]); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }
  STYLES.glacier = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i;
      C.A = mk(Math.ceil(W / 2.5), Math.ceil(H / 2.5)); C.Ag = ctx2(C.A); C.B = mk(C.A.width, C.A.height); C.Bg = ctx2(C.B);
      var n = 5, gap = Math.max(6, W * 0.012), tot = W - gap * 2, ws = [0.2, 0.17, 0.26, 0.2, 0.17], x = gap, panes = [];
      for (i = 0; i < n; i++) { var w = tot * ws[i] - gap; panes.push({ x1: x, w: w, side: i % 2 ? 1 : -1, t0: 0.1 + i * 0.12, d: 1.05 + rnd() * 0.25 }); x += w + gap; }
      C.panes = panes;
      C.L = wordmark(C, { cy: H * 0.5, track: 0.14, font: function (s) { return "700 " + s + "px " + SERIF; } });
      // a frost speckle tile for the glass
      var fc = mk(128, 128), fg = ctx2(fc), r = rnd; for (i = 0; i < 520; i++) { fg.fillStyle = "rgba(255,255,255," + (0.05 + r() * 0.2) + ")"; var s = 0.6 + r() * 1.4; fg.fillRect(r() * 128, r() * 128, s, s); }
      C.frost = fc; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i;
      var T = t * 1.1 + 2, top = H * 0.06, ph = H * 0.88, fpat = g.createPattern(C.frost, "repeat"), A = C.A, B = C.B;
      auroraInto(C.Ag, A.width, A.height, T);                                  // one medium-size aurora, drawn once per frame
      g.imageSmoothingEnabled = true; g.drawImage(A, 0, 0, W, H);        // behind the glass
      C.Bg.clearRect(0, 0, B.width, B.height); if (typeof C.Bg.filter === "string") C.Bg.filter = "blur(" + Math.max(2, A.width / 90) + "px)"; C.Bg.drawImage(A, 0, 0); C.Bg.filter = "none";   // blurred once, shared by every pane
      C.panes.forEach(function (p) {
        var pr = eo3(seg(t, p.t0, p.t0 + p.d)), x = lerp(p.x1 + p.side * W * 0.9, p.x1, pr), a = sm(seg(t, p.t0, p.t0 + 0.25));
        g.save(); g.beginPath(); g.rect(x, top, p.w, ph); g.clip(); g.globalAlpha = a;
        var shift = (x + p.w / 2 - W / 2) * 0.2 + p.side * (1 - pr) * 50;      // the pane bends the light toward the middle
        g.save(); g.translate(W / 2 + shift, H / 2); g.scale(1.08, 1.08); g.translate(-W / 2, -H / 2); g.drawImage(B, 0, 0, W, H); g.restore();
        g.fillStyle = "rgba(4,18,32,.3)"; g.fillRect(x, top, p.w, ph);                                             // deepen the glass
        var fr = g.createLinearGradient(x, top, x + p.w * 1.4, top + ph); fr.addColorStop(0, "rgba(210,240,255,.24)"); fr.addColorStop(0.45, "rgba(190,230,255,.06)"); fr.addColorStop(1, "rgba(210,240,255,.18)");
        g.fillStyle = fr; g.fillRect(x, top, p.w, ph);
        g.fillStyle = fpat; g.globalAlpha = a * 0.55; g.fillRect(x, top, p.w, ph);                                 // frost
        g.globalAlpha = a; g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(x, top, 1.5, ph); g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x + p.w - 1, top, 1, ph); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(x, top, p.w, 1.5);
        g.restore();
      });
      // the wordmark: it condenses in the frost, first blurred then sharp, frost-white with an icy glow
      var L = C.L, wa = sm(seg(t, 1.4, 2.4)), blur = 22 * (1 - eo3(seg(t, 1.4, 2.6)));
      if (wa > 0.01) {
        blurWord(g, L, "#bfeaff", 20, wa * 0.55);
        if (blur > 0.5) blurWord(g, L, "#ffffff", blur, wa * 0.8);
        var gg = g.createLinearGradient(0, L.cy - L.h / 2, 0, L.cy + L.h / 2); gg.addColorStop(0, "#ffffff"); gg.addColorStop(1, "#cdeeff");
        drawWord(g, L, gg, function () { return sm(seg(t, 1.7, 2.6)); });
      }
      if (!C.cued && t > 1.9) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.05, C.frame);
    }
  };

  /* ============================== SAMADHI (samadhi): a gradient mesh blooms from the centre; the wordmark comes into focus ============================== */
  STYLES.samadhi = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd;
      C.L = wordmark(C, { cy: H * 0.5, track: 0.2, font: function (s) { return "500 " + s + "px " + SERIF; }, maxSize: 90 });
      C.blobs = [[255, 160, 60, 0.0], [255, 96, 140, 1.05], [140, 52, 168, 2.1], [52, 56, 160, 3.15], [255, 190, 120, 4.2], [220, 70, 120, 5.25]].map(function (c, i) { return { c: c, a0: c[3], rad: 0.62 + rnd() * 0.2, orb: 0.14 + rnd() * 0.12, sp: 0.35 + rnd() * 0.3, ph: rnd() * PI2 }; });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, cx = W / 2, cy = H / 2, M = Math.max(W, H);
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var bloom = eo3(seg(t, 0, 1.9));
      C.blobs.forEach(function (b, i) {
        var a = b.a0 + t * b.sp, d = M * b.orb * bloom * 1.5, x = cx + Math.cos(a) * d * (W < H ? 0.8 : 1.2), y = cy + Math.sin(a * 0.9 + b.ph) * d, r = Math.max(1, M * b.rad * 0.78 * (0.1 + 0.9 * bloom));
        var gr = g.createRadialGradient(x, y, 0, x, y, r), al = 0.5 * sm(seg(t, i * 0.06, 0.8 + i * 0.06));
        gr.addColorStop(0, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + "," + al + ")"); gr.addColorStop(0.6, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + "," + al * 0.4 + ")"); gr.addColorStop(1, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + ",0)");
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      });
      // a quiet dark eye in the middle keeps the wordmark readable; the edges fall away like a lantern
      var eye = g.createRadialGradient(cx, cy, 0, cx, cy, M * 0.34); eye.addColorStop(0, "rgba(16,8,7," + (0.78 * sm(seg(t, 0.5, 1.6))) + ")"); eye.addColorStop(1, "rgba(16,8,7,0)"); g.fillStyle = eye; g.fillRect(0, 0, W, H);
      var vg = g.createRadialGradient(cx, cy, M * 0.3, cx, cy, M * 0.8); vg.addColorStop(0, "rgba(16,8,7,0)"); vg.addColorStop(1, "rgba(16,8,7,.62)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      // a thin ring draws itself around the words
      var L = C.L, rr = Math.max(L.w * 0.62, Math.min(W, H) * 0.42), ra = seg(t, 0.8, 2.3);
      g.strokeStyle = "rgba(255,245,232,.4)"; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + PI2 * eio(ra)); g.stroke();
      // the wordmark: blurred and wide, then sharp and closed up
      var wa = sm(seg(t, 1.1, 2.4)), blur = 26 * (1 - eo3(seg(t, 1.1, 2.6)));
      var Lp = C.L;
      if (blur > 0.5) blurWord(g, Lp, "#fff5e8", blur, wa * 0.9);
      g.save(); g.translate(0, (1 - wa) * 6); drawWord(g, Lp, "#fff5e8", function () { return sm(seg(t, 1.5, 2.5)); }); g.restore();
      if (!C.cued && t > 1.8) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.11, C.frame);
    }
  };

  /* ============================== NOCTURNE (nocturne): art-deco gold sunburst fans open behind the wordmark ============================== */
  STYLES.nocturne = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H;
      C.L = wordmark(C, { cy: H * 0.5, track: 0.22, font: function (s) { return "700 " + s + "px " + SERIF; }, maxSize: 96 });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, cx = W / 2, cy = H * 0.74, M = Math.hypot(W, H);
      var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#070b16"); bg.addColorStop(1, "#0d1428"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      var open = eo3(seg(t, 0.15, 1.7)), N = 28, half = Math.PI * 0.5 * open, gold = pal.gold, soft = pal.soft;
      // sunburst rays fanning up from the base
      g.save(); g.translate(cx, cy);
      for (i = 0; i < N; i++) {
        var u = (i + 0.5) / N * 2 - 1, an = -Math.PI / 2 + u * half * 1.1, w = (Math.PI / N) * 0.62 * open;
        var rg = g.createLinearGradient(0, 0, Math.cos(an) * M, Math.sin(an) * M); rg.addColorStop(0, K.rgb(gold, 0.4)); rg.addColorStop(0.5, K.rgb(gold, 0.15)); rg.addColorStop(1, K.rgb(gold, 0));
        g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an - w) * M, Math.sin(an - w) * M); g.lineTo(Math.cos(an + w) * M, Math.sin(an + w) * M); g.closePath(); if (i % 2 === 0) g.fill();
        g.strokeStyle = K.rgb(gold, 0.35 * open); g.lineWidth = 1; g.beginPath(); g.moveTo(Math.cos(an) * Math.min(W, H) * 0.12, Math.sin(an) * Math.min(W, H) * 0.12); g.lineTo(Math.cos(an) * M, Math.sin(an) * M); g.stroke();
      }
      // concentric arcs that draw themselves
      for (i = 1; i <= 6; i++) {
        var pr = seg(t, 0.3 + i * 0.07, 1.5 + i * 0.05), rr = Math.min(W, H) * (0.12 + i * 0.1);
        g.strokeStyle = K.rgb(i % 2 ? gold : soft, (i % 2 ? 0.7 : 0.4)); g.lineWidth = i % 3 === 0 ? 2 : 1; g.beginPath(); g.arc(0, 0, rr, -Math.PI / 2 - Math.PI * 0.5 * eo3(pr), -Math.PI / 2 + Math.PI * 0.5 * eo3(pr)); g.stroke();
      }
      g.restore();
      // stepped ziggurat base, a gold double frame with notched corners
      var bw = Math.min(W * 0.7, 420), ba = sm(seg(t, 0.8, 1.6));
      g.save(); g.globalAlpha = ba; g.strokeStyle = gold; g.lineWidth = 1.5;
      for (i = 0; i < 4; i++) { var sw = bw * (1 - i * 0.18), sh = 12; g.strokeRect(cx - sw / 2, cy + i * sh, sw, sh); }
      g.restore();
      var fp = 14, fa = seg(t, 0.2, 1.9), per = 2 * ((W - fp * 2) + (H - fp * 2)), notch = 18;
      function frame(inset, a) {
        g.strokeStyle = K.rgb(gold, a); g.lineWidth = 1.2; g.setLineDash([per, per]); g.lineDashOffset = per * (1 - eio(fa));
        var x = inset, y = inset, w = W - inset * 2, h = H - inset * 2;
        g.beginPath(); g.moveTo(x + notch, y); g.lineTo(x + w - notch, y); g.lineTo(x + w - notch, y + notch * 0.5); g.lineTo(x + w, y + notch * 0.5); g.lineTo(x + w, y + h - notch * 0.5); g.lineTo(x + w - notch, y + h - notch * 0.5); g.lineTo(x + w - notch, y + h);
        g.lineTo(x + notch, y + h); g.lineTo(x + notch, y + h - notch * 0.5); g.lineTo(x, y + h - notch * 0.5); g.lineTo(x, y + notch * 0.5); g.lineTo(x + notch, y + notch * 0.5); g.closePath(); g.stroke(); g.setLineDash([]);
      }
      frame(fp, 0.9); frame(fp + 7, 0.45);
      // the wordmark in champagne gold with a slow shimmer; rules and a diamond above and below
      var L = C.L, wa = sm(seg(t, 1.2, 2.2)), gp = seg(t, 1.9, 3.0);
      if (wa > 0.01) {
        var y0 = L.cy - L.h / 2, y1 = L.cy + L.h / 2, sx = L.cx - L.w / 2 + (L.w + 200) * gp - 100;
        var fg = g.createLinearGradient(L.cx - L.w / 2, 0, L.cx + L.w / 2, 0), q = clamp((sx - (L.cx - L.w / 2)) / L.w, 0, 1), qw = 90 / L.w;
        fg.addColorStop(0, "#d9b46a"); fg.addColorStop(clamp(q - qw, 0, 1), "#d9b46a"); fg.addColorStop(q, "#fff3c8"); fg.addColorStop(clamp(q + qw, 0, 1), "#d9b46a"); fg.addColorStop(1, "#b88d3e");
        g.fillStyle = "rgba(7,11,22,.8)"; g.fillRect(0, y0 - L.size * 0.42, W, L.h + L.size * 0.84);
        blurWord(g, L, gold, 14, wa * 0.55);
        g.save(); g.translate(0, (1 - wa) * 8); drawWord(g, L, fg, function () { return wa; }); g.restore();
        var rw = W * 0.5 * eo3(seg(t, 1.5, 2.3)); g.globalAlpha = wa; g.strokeStyle = gold; g.lineWidth = 1.3;
        [y0 - L.size * 0.42, y1 + L.size * 0.42].forEach(function (yy) { g.beginPath(); g.moveTo(cx - rw, yy); g.lineTo(cx - 9, yy); g.moveTo(cx + 9, yy); g.lineTo(cx + rw, yy); g.stroke(); g.fillStyle = gold; g.beginPath(); g.moveTo(cx, yy - 5); g.lineTo(cx + 5, yy); g.lineTo(cx, yy + 5); g.lineTo(cx - 5, yy); g.closePath(); g.fill(); });
        g.globalAlpha = 1;
      }
      if (!C.cued && t > 1.9) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.05, C.frame);
    }
  };

  /* ============================== CONSERVATOR (conservator, light): a halftone print of the coin develops dot by dot on paper ============================== */
  STYLES.conservator = {
    dur: 3.2, still: 2.9, needs: ["coin"],
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, pal = C.pal, i, j;
      var R = Math.min(W, H) * (C.portrait ? 0.32 : 0.24), cx = W / 2, cy = H * (C.portrait ? 0.39 : 0.4), s = C.small ? 5 : 6.4;
      var face = coinFace(160, pal, C.coin), fc = ctx2(face, true), fd = fc.getImageData(0, 0, 160, 160).data, n = Math.ceil(R / s * 1.5), dots = [], ls = [];
      for (i = -n; i <= n; i++) for (j = -n; j <= n; j++) {
        var x = cx + (i - j) * s * 0.7071, y = cy + (i + j) * s * 0.7071, dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > R - s * 0.15) continue;
        var u = clamp(((dx / R) * 0.5 + 0.5) * 160, 0, 159) | 0, v = clamp(((dy / R) * 0.5 + 0.5) * 160, 0, 159) | 0, o = (v * 160 + u) * 4;
        var l = (0.3 * fd[o] + 0.59 * fd[o + 1] + 0.11 * fd[o + 2]) / 255;
        dots.push({ x: x, y: y, l: l, d: d / R, dl: 0.3 + 1.35 * (0.5 * rnd() + 0.5 * d / R) }); ls.push(l);
      }
      ls.sort(function (a, b) { return a - b; });
      var lo = ls[Math.floor(ls.length * 0.04)] || 0, hi = ls[Math.floor(ls.length * 0.96)] || 1;
      dots.forEach(function (d) { d.ink = clamp(1 - (d.l - lo) / (hi - lo + 0.001), 0, 1); d.r = s * 0.66 * Math.pow(d.ink, 1.05) + s * 0.04; });
      C.dots = dots; C.R = R; C.cx = cx; C.cy = cy; C.s = s;
      C.L = wordmark(C, { cy: H * (C.portrait ? 0.76 : 0.8), track: 0.12, font: function (z) { return "700 " + z + "px " + SERIF; }, maxSize: 74, maxW: C.portrait ? W * 0.8 : Math.min(W * 0.55, 700) });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, ink = pal.ink, dots = C.dots, R = C.R, cx = C.cx, cy = C.cy;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var pv = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); pv.addColorStop(0, "rgba(120,90,50,0)"); pv.addColorStop(1, "rgba(120,90,50,.2)"); g.fillStyle = pv; g.fillRect(0, 0, W, H);
      // plate marks: crop corners and a plate number
      var pa = sm(seg(t, 0, 0.6)), m = 22, cl = 16;
      g.globalAlpha = pa * 0.6; g.strokeStyle = ink; g.lineWidth = 1;
      [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (c) { g.beginPath(); g.moveTo(c[0] + c[2] * cl, c[1]); g.lineTo(c[0], c[1]); g.lineTo(c[0], c[1] + c[3] * cl); g.stroke(); });
      g.fillStyle = ink; g.font = "600 11px " + SERIF; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText("PLATE I", m + 4, H - m - 8); g.textAlign = "right"; g.fillText("TITAN RELIQUARY", W - m - 4, H - m - 8);
      g.globalAlpha = 1;
      // the halftone: two passes, the second slightly off register in the faded red (a vintage print)
      var pass, gk;
      for (pass = 0; pass < 2; pass++) {
        g.fillStyle = pass ? K.rgb(pal.soft, 0.4) : ink; g.beginPath();
        var ox = pass ? 1.4 : 0, oy = pass ? -1.0 : 0, k = pass ? 0.78 : 1;
        for (i = 0; i < dots.length; i++) {
          var d = dots[i]; gk = eo2((t - d.dl) / 0.45); if (gk <= 0.01) continue;
          var r = d.r * gk * k; g.moveTo(d.x + ox + r, d.y + oy); g.arc(d.x + ox, d.y + oy, r, 0, PI2);
        }
        g.fill();
      }
      var ra = sm(seg(t, 1.5, 2.2)); g.strokeStyle = ink; g.globalAlpha = ra * 0.85; g.lineWidth = 1.3; g.beginPath(); g.arc(cx, cy, R + 2, 0, PI2); g.stroke(); g.lineWidth = 0.6; g.beginPath(); g.arc(cx, cy, R + 6, 0, PI2); g.stroke(); g.globalAlpha = 1;
      // the roller: a figure caption, then the wordmark inked from left to right
      if (C.coinInfo && C.coinInfo.label) { g.save(); g.globalAlpha = sm(seg(t, 1.9, 2.4)); g.fillStyle = pal.muted; g.textAlign = "center"; g.font = "italic 500 " + (C.small ? 13 : 15) + "px " + SERIF; g.fillText("Fig. 1  —  " + C.coinInfo.label.replace(/\s+·\s+/g, ", "), W / 2, cy + R + 32); g.restore(); }
      var L = C.L, wp = eo3(seg(t, 2.0, 2.8));
      if (wp > 0) {
        g.save(); g.beginPath(); g.rect(0, L.cy - L.h, lerp(L.cx - L.w / 2 - 10, L.cx + L.w / 2 + 14, wp), L.h * 2); g.clip();
        g.globalAlpha = 0.7; drawWord(g, L, "rgba(255,252,242,.9)", function () { return 1; }); g.save(); g.translate(0, 1.2); g.globalAlpha = 1; drawWord(g, L, "rgba(255,252,242,.55)", function () { return 1; }); g.restore();
        g.globalAlpha = 1; drawWord(g, L, ink, function () { return 1; });
        g.restore();
        var rw = L.w * 0.5 * eo3(seg(t, 2.4, 3.0)), ry = L.cy + L.h / 2 + L.size * 0.46; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - rw, ry); g.lineTo(cx + rw, ry); g.stroke(); g.lineWidth = 0.7; g.beginPath(); g.moveTo(cx - rw, ry + 5); g.lineTo(cx + rw, ry + 5); g.stroke();
      }
      if (!C.cued && t > 2.4) { C.cued = true; C.cue("land"); }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.1, C.frame); g.globalCompositeOperation = "source-over";
    }
  };

  /* ============================== PLAINTEXT (notepad): neo-brutalist blocks drop in with hard shadows and assemble the wordmark ============================== */
  STYLES.notepad = {
    dur: 3.0, still: 2.7,
    init: function (C) {
      var W = C.W, H = C.H, pal = C.pal, i, rows = [["T", "I", "T", "A", "N"], ["R", "E", "L", "I", "Q", "U", "A", "R", "Y"]];
      var top = Math.max(84, H * 0.1), wx = Math.min(18, W * 0.04), wy = top, ww = W - wx * 2, wh = H - wy - Math.max(24, H * 0.04);
      var t1 = Math.min(C.portrait ? (ww - 40) / 5.8 : 120, 118), t2 = Math.min(t1 * 0.78, (ww - 28) / 9.7), g1 = Math.max(6, t1 * 0.1), g2 = Math.max(4, t2 * 0.1), blockH = Math.max(44, t2 * 1.15);
      var total = t1 + 16 + t2 + 22 + blockH, y = wy + 30 + (wh - 30 - total) / 2, tiles = [], k = 0;
      [t1, t2].forEach(function (ts, ri) {
        var gap = ri ? g2 : g1, row = rows[ri], rw = row.length * ts + (row.length - 1) * gap, x = W / 2 - rw / 2;
        row.forEach(function (ch, ci) { tiles.push({ ch: ch, x: x + ci * (ts + gap), y: y, s: ts, t0: 0.35 + k * 0.075, d: 0.55 + (k % 3) * 0.05 }); k++; });
        y += ts + 16;
      });
      var bw = Math.min(ww - 40, t2 * 9 + g2 * 8), block = { x: W / 2 - bw / 2, y: y + 6, w: bw, h: blockH, t0: 0.35 + k * 0.075 + 0.05, d: 0.6 };
      var deco = [], topFree = (y0c = wy + 30 + (wh - 30 - total) / 2) - (wy + 30), botY = block.y + block.h + 18, botFree = wy + wh - botY;
      var y0c;
      if (topFree > 100) { var cr = Math.min(36, topFree * 0.3); deco.push({ k: "circle", x: wx + ww * 0.2, y: wy + 30 + topFree * 0.5, r: cr, t0: 0.12 }); deco.push({ k: "stripe", x: W - wx - ww * 0.36, y: wy + 30 + topFree * 0.5 - cr * 0.7, w: ww * 0.24, h: cr * 1.4, t0: 0.2 }); }
      if (botFree > 90) { deco.push({ k: "bar", x: W / 2 - bw / 2, y: botY + (botFree - 34) * 0.5, w: bw, h: 34, t0: 1.55 }); }
      C.deco = deco;
      C.win = { x: wx, y: wy, w: ww, h: wh }; C.tiles = tiles; C.block = block; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, w = C.win, INK = "#000", YEL = "#ffe600";
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "#ececec"; g.lineWidth = 1; g.beginPath(); for (i = 0; i < W; i += 28) { g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, H); } for (i = 0; i < H; i += 28) { g.moveTo(0, i + 0.5); g.lineTo(W, i + 0.5); } g.stroke();
      // the window: hard shadow, thick border, a black title bar
      var wa = eo3(seg(t, 0, 0.45)), off = 8 * wa;
      g.fillStyle = INK; g.fillRect(w.x + off, w.y + off, w.w, w.h);
      g.fillStyle = "#fff"; g.fillRect(w.x, w.y, w.w, w.h); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(w.x, w.y, w.w, w.h);
      g.fillStyle = INK; g.fillRect(w.x, w.y, w.w, 30);
      g.fillStyle = "#fff"; [0, 1, 2].forEach(function (k) { g.fillRect(w.x + 10 + k * 16, w.y + 9, 11, 11); });
      g.fillStyle = YEL; g.fillRect(w.x + 10 + 2 * 16, w.y + 9, 11, 11);
      g.font = "700 13px " + MONO; g.textAlign = "right"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("TITAN_RELIQUARY.TXT", w.x + w.w - 10, w.y + 15);
      // the tiles: each one falls, lands with a squash, and its hard shadow snaps on
      function block(x, y, ww, hh, fill, g1, label, lab) {
        var sx = 1 + 0.1 * g1.sq, sy = 1 - 0.14 * g1.sq, cx = x + ww / 2, cy = y + hh;
        g.save(); g.translate(cx, cy); g.scale(sx, sy); g.translate(-cx, -cy);
        if (g1.sh > 0.01) { g.fillStyle = INK; g.fillRect(x + g1.sh, y + g1.sh, ww, hh); }
        g.fillStyle = fill; g.fillRect(x, y, ww, hh); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x, y, ww, hh);
        if (label) { g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.font = lab; g.fillText(label, x + ww / 2, y + hh / 2 + hh * 0.04); }
        g.restore();
      }
      function drop(o) {
        var gp = seg(t, o.t0, o.t0 + o.d); if (gp <= 0) return null;
        var fall = (o.y + 140) * (1 - bounce(gp)), sq = Math.max(0, Math.sin(clamp((gp - 0.52) / 0.12, 0, 1) * Math.PI)) * (gp < 0.7 ? 1 : 0);
        return { y: o.y - fall, sh: 6 * sm(seg(gp, 0.5, 0.62)), sq: sq };
      }
      (C.deco || []).forEach(function (o) {
        var d = drop({ y: o.y, t0: o.t0, d: 0.6 }); if (!d) return;
        g.save(); var sc = 1 + 0.08 * d.sq; g.translate(o.x + (o.r || o.w / 2), d.y + (o.r || o.h)); g.scale(1 + 0.1 * d.sq, 1 - 0.14 * d.sq); g.translate(-(o.x + (o.r || o.w / 2)), -(d.y + (o.r || o.h)));
        if (o.k === "circle") { g.fillStyle = INK; g.beginPath(); g.arc(o.x + d.sh, d.y + d.sh, o.r, 0, PI2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(o.x, d.y, o.r, 0, PI2); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.fillStyle = INK; g.font = "800 " + o.r * 0.9 + "px " + MONO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("\u2605", o.x, d.y + o.r * 0.06); }
        else if (o.k === "stripe") { g.fillStyle = INK; g.fillRect(o.x + d.sh, d.y + d.sh, o.w, o.h); g.fillStyle = "#fff"; g.fillRect(o.x, d.y, o.w, o.h); g.save(); g.beginPath(); g.rect(o.x, d.y, o.w, o.h); g.clip(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); for (var q = -o.h; q < o.w + o.h; q += 14) { g.moveTo(o.x + q, d.y + o.h); g.lineTo(o.x + q + o.h, d.y); } g.stroke(); g.restore(); g.lineWidth = 3; g.strokeRect(o.x, d.y, o.w, o.h); }
        else { g.fillStyle = INK; g.fillRect(o.x + d.sh, d.y + d.sh, o.w, o.h); g.fillStyle = INK; g.fillRect(o.x, d.y, o.w, o.h); g.fillStyle = "#fff"; g.font = "800 " + clamp(o.w / 17, 12, 20) + "px " + MONO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("COIN  /  FLIP  /  ALBUM", o.x + o.w / 2, d.y + o.h / 2); }
        g.restore();
      });
      C.tiles.forEach(function (o) { var d = drop(o); if (!d) return; block(o.x, d.y, o.s, o.s, "#fff", d, o.ch, "800 " + (o.s * 0.62) + "px " + MONO); });
      var b = C.block, d = drop(b);
      if (d) {
        block(b.x, d.y, b.w, b.h, YEL, d, "A PRIVATE COLLECTION", "800 " + clamp(b.w / 15, 13, 24) + "px " + MONO);
      }
      if (!C.cued && t > 1.9) { C.cued = true; C.cue("land"); }
    }
  };

  /* ============================== THE CONSTRUCT (construct): the featured coin assembles as green ASCII, then the wordmark types itself ============================== */
  var RAMP = " .:-=+*#%@";
  STYLES.construct = {
    dur: 3.2, still: 2.9, needs: ["coin"],
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, pal = C.pal, i, j;
      var D = Math.min(W * 0.82, H * 0.5), cols = C.small ? 40 : 60, cw = D / cols, chh = cw / 0.56, rows = Math.round(D / chh), x0 = W / 2 - D / 2, y0 = H * (C.portrait ? 0.38 : 0.4) - rows * chh / 2;
      var face = coinFace(cols * 3, pal, C.coin), fd = ctx2(face, true).getImageData(0, 0, face.width, face.height).data, FW = face.width, cells = [], ls = [];
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var nx = (i + 0.5) / cols * 2 - 1, ny = (j + 0.5) / rows * 2 - 1, d = Math.sqrt(nx * nx + ny * ny); if (d > 1) continue;
        var u = Math.min(FW - 1, ((i + 0.5) / cols * FW) | 0), v = Math.min(face.height - 1, ((j + 0.5) / rows * face.height) | 0), o = (v * FW + u) * 4, l = (0.3 * fd[o] + 0.59 * fd[o + 1] + 0.11 * fd[o + 2]) / 255;
        cells.push({ x: x0 + i * cw, y: y0 + j * chh, l: l, d: d, dl: 0.2 + d * 0.65 + rnd() * 0.7, id: i * 131 + j * 17 }); ls.push(l);
      }
      ls.sort(function (a, b) { return a - b; }); var lo = ls[Math.floor(ls.length * 0.03)] || 0, hi = ls[Math.floor(ls.length * 0.97)] || 1;
      cells.forEach(function (c) { c.q = clamp((c.l - lo) / (hi - lo + 0.001), 0, 1); c.ch = Math.min(RAMP.length - 1, Math.max(c.d > 0.93 ? 7 : 1, Math.round(Math.pow(c.q, 0.85) * (RAMP.length - 1)))); });
      // glyph atlas: each ramp character in three greens
      var dpr = C.dpr, gw = Math.ceil(cw * dpr), gh = Math.ceil(chh * dpr), at = mk(gw * RAMP.length, gh * 3), ag = ctx2(at), greens = ["#15a544", "#33ff66", "#d6ffe0"];
      ag.textBaseline = "middle"; ag.textAlign = "center"; ag.font = "700 " + (gh * 0.86) + "px " + MONO;
      for (var r = 0; r < 3; r++) { ag.fillStyle = greens[r]; if (r === 2) { ag.shadowColor = "#33ff66"; ag.shadowBlur = 6; } for (i = 0; i < RAMP.length; i++) ag.fillText(RAMP[i], i * gw + gw / 2, r * gh + gh / 2 + gh * 0.04); }
      C.cells = cells; C.at = at; C.gw = gw; C.gh = gh; C.cw = cw; C.chh = chh; C.cy0 = y0 + rows * chh;
      C.L = wordmark(C, { lines: C.portrait && W < 700 ? ["> TITAN", "RELIQUARY_"] : ["> TITAN RELIQUARY_"], font: function (z) { return "800 " + z + "px " + MONO; }, track: 0.02, justify: false, cy: H * (C.portrait ? 0.74 : 0.8), maxW: W * 0.84, maxSize: 70, gap: 0.3 });
      C.boot = ["TITAN.SYS  v1.07", "> SCAN SPECIMEN ...... OK", "> ASSEMBLE .............. "];
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, cells = C.cells, gw = C.gw, gh = C.gh;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      var gg = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.7); gg.addColorStop(0, "rgba(20,90,40,.26)"); gg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gg; g.fillRect(0, 0, W, H);
      // boot lines, typed
      g.font = "600 " + (C.small ? 12 : 14) + "px " + MONO; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#2ed461";
      var chars = Math.floor(t * 46), shown = 0;
      C.boot.forEach(function (ln, li) { var n = Math.max(0, Math.min(ln.length, chars - shown)); shown += ln.length + 4; if (n > 0) g.fillText(ln.slice(0, n), 18, 96 + li * (C.small ? 17 : 20)); });
      // the coin: every cell scrambles through glyphs, then locks with a bright flash
      var fade = 1 - 0.65 * sm(seg(t, 2.2, 2.8));
      g.globalAlpha = fade;
      for (i = 0; i < cells.length; i++) {
        var c = cells[i], lt = t - c.dl; if (lt < 0) continue;
        var ci, row;
        if (lt < 0.32) { ci = 1 + Math.floor(hash(c.id + Math.floor(t * 16)) * (RAMP.length - 1)); row = 1; }
        else { ci = c.ch; row = lt < 0.42 ? 2 : (c.q > 0.62 ? 1 : 0); if (c.q > 0.85 && lt > 0.42) row = 1; }
        if (ci <= 0) continue;
        g.drawImage(C.at, ci * gw, row * gh, gw, gh, c.x, c.y, C.cw, C.chh);
      }
      g.globalAlpha = 1;
      if (C.coinInfo && C.coinInfo.label) {
        var lab = "SPECIMEN: " + C.coinInfo.label.replace(/\s+·\s+/g, " / ").toUpperCase(), n2 = Math.floor(clamp((t - 1.75) * 52, 0, lab.length));
        g.font = "600 " + (C.small ? 11 : 13) + "px " + MONO; g.textAlign = "center"; g.fillStyle = "#2ed461"; g.globalAlpha = 0.9 - 0.4 * sm(seg(t, 2.3, 2.8)); g.fillText(lab.slice(0, n2), W / 2, C.cy0 + 24); g.globalAlpha = 1;
      }
      // the wordmark types itself, with a block cursor
      var L = C.L, all = []; L.lines.forEach(function (ln, li) { ln.glyphs.forEach(function (gl, gi) { all.push([li, gi]); }); });
      var n3 = Math.floor(clamp((t - 2.0) / 0.07, 0, all.length)), shownGl = {}; for (i = 0; i < n3; i++) shownGl[all[i][0] + "_" + all[i][1]] = 1;
      blurWord(g, L, "#33ff66", 14, 0.85 * (n3 / all.length));
      drawWord(g, L, "#b8ffcc", function (li, gi) { return shownGl[li + "_" + gi] ? 1 : 0; });
      if (t > 1.95) {
        var last = n3 > 0 ? all[n3 - 1] : null, ln = last ? L.lines[last[0]] : L.lines[0], gl = last ? ln.glyphs[last[1]] : null, cx = gl ? gl.x + gl.w : ln.x, blink = (Math.floor(t * 4) % 2 === 0 || n3 < all.length);
        if (n3 < all.length || blink) { g.fillStyle = "#33ff66"; g.globalAlpha = 0.9; g.fillRect(cx + 2, ln.base - ln.h * 1.0, ln.size * 0.5, ln.h * 1.05); g.globalAlpha = 1; }
      }
      // CRT: scanlines and a vignette
      g.fillStyle = "rgba(0,0,0,.2)"; for (var y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
      var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      if (!C.cued && t > 2.4) { C.cued = true; C.cue("land"); }
    }
  };

  /* ============================== ARCADE (arcade): INSERT COIN, a pixel coin drops into the slot, 1UP blinks, the wordmark pops in as pixel blocks ============================== */
  var PIX = {
    A: "01110,10001,10001,11111,10001,10001,10001", B: "11110,10001,10001,11110,10001,10001,11110", C: "01110,10001,10000,10000,10000,10001,01110", D: "11110,10001,10001,10001,10001,10001,11110",
    E: "11111,10000,10000,11110,10000,10000,11111", F: "11111,10000,10000,11110,10000,10000,10000", G: "01110,10001,10000,10111,10001,10001,01111", H: "10001,10001,10001,11111,10001,10001,10001",
    I: "01110,00100,00100,00100,00100,00100,01110", J: "00111,00010,00010,00010,00010,10010,01100", K: "10001,10010,10100,11000,10100,10010,10001", L: "10000,10000,10000,10000,10000,10000,11111",
    M: "10001,11011,10101,10101,10001,10001,10001", N: "10001,11001,10101,10011,10001,10001,10001", O: "01110,10001,10001,10001,10001,10001,01110", P: "11110,10001,10001,11110,10000,10000,10000",
    Q: "01110,10001,10001,10001,10101,10010,01101", R: "11110,10001,10001,11110,10100,10010,10001", S: "01111,10000,10000,01110,00001,00001,11110", T: "11111,00100,00100,00100,00100,00100,00100",
    U: "10001,10001,10001,10001,10001,10001,01110", V: "10001,10001,10001,10001,10001,01010,00100", W: "10001,10001,10001,10101,10101,10101,01010", X: "10001,10001,01010,00100,01010,10001,10001",
    Y: "10001,10001,01010,00100,00100,00100,00100", Z: "11111,00001,00010,00100,01000,10000,11111",
    0: "01110,10001,10011,10101,11001,10001,01110", 1: "00100,01100,00100,00100,00100,00100,01110", 2: "01110,10001,00001,00010,00100,01000,11111", 3: "11110,00001,00001,01110,00001,00001,11110",
    4: "00010,00110,01010,10010,11111,00010,00010", 5: "11111,10000,11110,00001,00001,10001,01110", 6: "00110,01000,10000,11110,10001,10001,01110", 7: "11111,00001,00010,00100,01000,01000,01000",
    8: "01110,10001,10001,01110,10001,10001,01110", 9: "01110,10001,10001,01111,00001,00010,01100", "-": "00000,00000,00000,11111,00000,00000,00000", "!": "00100,00100,00100,00100,00100,00000,00100", " ": "00000,00000,00000,00000,00000,00000,00000"
  };
  function pixText(g, s, x, y, sc, color) {                // draw a string in the 5x7 pixel font at integer scale; returns its width
    g.fillStyle = color;
    for (var i = 0; i < s.length; i++) {
      var rows = (PIX[s[i]] || PIX[" "]).split(",");
      for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (rows[r][c] === "1") g.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
    }
    return (s.length * 6 - 1) * sc;
  }
  function pixPoints(s, sc) { var pts = []; for (var i = 0; i < s.length; i++) { var rows = (PIX[s[i]] || PIX[" "]).split(","); for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (rows[r][c] === "1") pts.push([(i * 6 + c) * sc, r * sc]); } return pts; }
  STYLES.arcade = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i, px = W < 520 ? 3 : Math.max(4, Math.round(W / 260));
      var LW = Math.ceil(W / px), LH = Math.ceil(H / px);
      C.px = px; C.LW = LW; C.LH = LH; C.P = mk(LW, LH); C.Pg = ctx2(C.P);
      // the wordmark in pixel blocks, every lit pixel with its own pop-in time
      var stacked = LW < 200 || C.portrait, lines = stacked ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"], pts = [], cy = LH * (stacked ? 0.43 : 0.45), fw = LW * 0.88, y = 0, rows = [];
      var sizes = lines.map(function (s) { return Math.max(1, Math.floor(fw / (s.length * 6 - 1))); }); if (!stacked) sizes[0] = Math.max(2, Math.min(sizes[0], Math.floor(LH * 0.14 / 7)));
      var totalH = 0; sizes.forEach(function (sc, k) { totalH += 7 * sc + (k ? 6 : 0); });
      y = cy - totalH / 2;
      lines.forEach(function (s, k) {
        var sc = sizes[k], w = (s.length * 6 - 1) * sc, x0 = Math.round(LW / 2 - w / 2);
        pixPoints(s, sc).forEach(function (p) { for (var dy = 0; dy < sc; dy++) for (var dx = 0; dx < sc; dx++) pts.push({ x: x0 + p[0] + dx, y: Math.round(y) + p[1] + dy, t: 1.72 + rnd() * 0.85, row: p[1] }); });
        y += 7 * sc + 6;
      });
      C.wpts = pts;
      C.stars = []; for (i = 0; i < 70; i++) C.stars.push({ x: (rnd() * LW) | 0, y: (rnd() * LH * 0.7) | 0, ph: rnd() * PI2, c: rnd() < 0.3 ? "#40e0d0" : "#f6f3ff" });
      // two skyline layers with lit windows
      function skyline(base, minH, maxH, wmin, wmax) { var a = [], x = 0; while (x < LW) { var w = wmin + ((rnd() * (wmax - wmin)) | 0), h = minH + ((rnd() * (maxH - minH)) | 0); a.push({ x: x, w: w, h: h, win: rnd() }); x += w; } return a; }
      C.sky1 = skyline(0, 22, 52, 7, 14); C.sky2 = skyline(0, 12, 34, 8, 16);
      C.slotY = Math.round(Math.min(LH * 0.7, LH - 58)); C.coinX = Math.round(LW / 2); C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, P = C.Pg, LW = C.LW, LH = C.LH, px = C.px, pal = C.pal, i, gold = "#ffd23f", teal = "#40e0d0", pink = "#ff4d8d";
      P.fillStyle = "#0b0820"; P.fillRect(0, 0, LW, LH);
      var dither = 0; for (i = 0; i < 8; i++) { P.fillStyle = i % 2 ? "#120d33" : "#0f0a2a"; P.fillRect(0, LH * 0.34 + i * LH * 0.045, LW, LH * 0.045); }
      C.stars.forEach(function (s) { if (Math.sin(t * 3 + s.ph) > -0.4) { P.fillStyle = s.c; P.fillRect(s.x, s.y, 1, 1); } });
      // skylines rise from the ground
      var rise = eo3(seg(t, 0, 0.7)), ground = C.slotY + 8;
      [[C.sky2, "#1a1450", 0.55], [C.sky1, "#241a66", 1]].forEach(function (L) {
        L[0].forEach(function (b) {
          var h = Math.round(b.h * L[2] * rise * Math.min(1.3, LH / 211) * 1.1), x = b.x, y = Math.round(ground - h);
          P.fillStyle = L[1]; P.fillRect(x, y, b.w - 1, h + 40);
          P.fillStyle = L[1] === "#241a66" ? "#ffd23f" : "#8a6a30";
          for (var wy = y + 3; wy < ground - 3; wy += 4) for (var wx = x + 2; wx < x + b.w - 3; wx += 3) if (((wx * 7 + wy * 13 + (b.win * 100 | 0)) % 5) < 2) P.fillRect(wx, wy, 1, 2);
        });
      });
      P.fillStyle = "#161038"; P.fillRect(0, Math.round(ground), LW, LH - Math.round(ground));
      P.fillStyle = "#2a1f6e"; P.fillRect(0, Math.round(ground), LW, 1);
      // HUD
      var hudY = Math.round(78 / px);
      var up = t < 1.5 ? 1 : (Math.floor((t - 1.5) / 0.2) % 2 === 0 && t < 2.5 ? 1 : (t >= 2.5 ? 1 : 0));
      pixText(P, "1UP", 4, hudY, 1, up ? teal : "#0b0820"); pixText(P, "00", 4, hudY + 9, 1, "#f6f3ff");
      pixText(P, "HI-SCORE", Math.round(LW / 2 - 23), hudY, 1, pink); pixText(P, "100000", Math.round(LW / 2 - 17), hudY + 9, 1, "#f6f3ff");
      // INSERT COIN (blinks twice a second), then a credit
      var wide = LW > 200, ic = wide ? 3 : 2, icy = Math.round(LH * (wide ? 0.17 : 0.17));
      function ctr(s, sc) { return Math.round(LW / 2 - ((s.length * 6 - 1) * sc) / 2); }
      if (t < 1.55) { if (Math.floor(t * 4) % 2 === 0 || t < 0.3) { if (wide) pixText(P, "INSERT COIN", ctr("INSERT COIN", ic), icy, ic, gold); else { pixText(P, "INSERT", ctr("INSERT", ic), icy, ic, gold); pixText(P, "COIN", ctr("COIN", ic), icy + 18, ic, gold); } } }
      else { pixText(P, "CREDIT 01", Math.round(LW / 2 - (9 * 6 - 1) / 2), LH - 12, 1, gold); }
      // the coin slot panel
      var pw = 34, ph = 40, pxx = Math.round(LW / 2 - pw / 2), pyy = C.slotY, pa = eo3(seg(t, 0.1, 0.7));
      P.fillStyle = "#0b0820"; P.fillRect(pxx - 2, pyy - 2 + Math.round((1 - pa) * 40), pw + 4, ph + 4);
      P.fillStyle = "#8f93b8"; P.fillRect(pxx - 1, pyy - 1 + Math.round((1 - pa) * 40), pw + 2, ph + 2);
      P.fillStyle = "#2b2f55"; P.fillRect(pxx + 1, pyy + 1 + Math.round((1 - pa) * 40), pw - 2, ph - 2);
      var oy = Math.round((1 - pa) * 40), slotOn = t > 1.45;
      P.fillStyle = "#0b0820"; P.fillRect(pxx + pw / 2 - 2, pyy + 5 + oy, 4, 16);
      P.fillStyle = slotOn ? gold : pink; P.fillRect(pxx + pw / 2 - 1, pyy + 6 + oy, 2, 14);
      P.fillStyle = "#f6f3ff"; pixText(P, "25", pxx + 11, pyy + 26 + oy, 1, "#f6f3ff");
      P.fillStyle = Math.floor(t * 4) % 2 === 0 ? pink : "#7a2848"; P.fillRect(pxx + 3, pyy + ph - 7 + oy, pw - 6, 3);
      // the pixel coin: falls with gravity, spinning, then is swallowed by the slot
      var dg = seg(t, 0.75, 1.5);
      if (dg > 0 && dg < 1) {
        var cy = Math.round(-14 + (C.slotY + 8 + 14) * dg * dg), wid = [15, 12, 7, 3, 7, 12][Math.floor(t * 14) % 6], cx0 = Math.round(C.coinX - wid / 2);
        P.fillStyle = "#8a5a00"; P.fillRect(cx0, cy + 1, wid, 15); P.fillStyle = gold; P.fillRect(cx0, cy, wid, 15);
        if (wid > 6) { P.fillStyle = "#fff3b0"; P.fillRect(cx0 + 2, cy + 2, 3, 7); P.fillStyle = "#c98a00"; P.fillRect(cx0 + wid - 5, cy + 7, 3, 6); P.fillStyle = "#c98a00"; P.fillRect(cx0 + wid / 2 - 1, cy + 4, 2, 7); }
        P.fillStyle = "#0b0820"; P.fillRect(cx0, cy, 2, 1); P.fillRect(cx0 + wid - 2, cy, 2, 1); P.fillRect(cx0, cy + 14, 2, 1); P.fillRect(cx0 + wid - 2, cy + 14, 2, 1);
      }
      // a few pixels of spark when it lands
      var sp = seg(t, 1.5, 1.95);
      if (sp > 0 && sp < 1) for (i = 0; i < 14; i++) { var an = i / 14 * PI2 + 0.3, rr = 3 + sp * (12 + (i % 3) * 5); P.fillStyle = i % 2 ? gold : "#f6f3ff"; P.fillRect(Math.round(C.coinX + Math.cos(an) * rr), Math.round(C.slotY + 12 + Math.sin(an) * rr * 0.8 - sp * 6), 1 + (i % 2), 1 + (i % 2)); }
      // the wordmark, pixel by pixel: gold with a lit top edge and a purple drop shadow
      var pts = C.wpts, n = pts.length;
      for (i = 0; i < n; i++) { var p = pts[i]; if (t > p.t) { P.fillStyle = "#6a2a9a"; P.fillRect(p.x + 1, p.y + 1, 1, 1); } }
      for (i = 0; i < n; i++) { var q = pts[i]; if (t > q.t) { P.fillStyle = q.row < 2 ? "#fff3b0" : q.row > 5 ? "#e09a00" : gold; P.fillRect(q.x, q.y, 1, 1); } }
      g.imageSmoothingEnabled = false; g.fillStyle = "#0b0820"; g.fillRect(0, 0, W, H); g.drawImage(C.P, 0, 0, LW * px, LH * px);
      // CRT scanlines, faint
      g.fillStyle = "rgba(0,0,0,.14)"; for (var y = 0; y < H; y += px) g.fillRect(0, y + px - 1, W, 1);
      if (!C.cued && t > 1.5) { C.cued = true; C.cue("land"); }
    }
  };

  /* ============================== PULP ADVENTURE (pulp, light): a comic panel with Ben-Day dots and a KAPOW burst that reveals the wordmark ============================== */
  var COMIC = 'Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Black", sans-serif';
  function burstPath(g, cx, cy, R, n, rnd, k) {            // jagged starburst
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = i / (n * 2) * PI2, r = (i % 2 ? R * (0.62 + 0.1 * rnd[i % rnd.length]) : R * (0.96 + 0.1 * rnd[(i + 3) % rnd.length])) * k; g[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.closePath();
  }
  STYLES.pulp = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, i, top = Math.max(84, H * 0.1), m = Math.min(16, W * 0.04);
      C.panel = { x: m, y: top, w: W - m * 2, h: H - top - m * 1.5 };
      C.cx = W / 2; C.cy = top + C.panel.h * 0.46; C.R = Math.min(C.panel.w, C.panel.h) * 0.46;
      C.jit = []; for (i = 0; i < 40; i++) C.jit.push(rnd());
      var L = wordmark(C, { cy: C.cy, track: 0.04, font: function (s) { return "400 " + s + "px " + COMIC; }, maxW: C.panel.w * 0.84, maxSize: 150, capH: 0.74, gap: 0.12, justify: true });
      C.L = L; C.cued = false;
      // Ben-Day tile, red dots on cream
      var bd = mk(16, 16), bg = ctx2(bd); bg.fillStyle = "rgba(179,16,31,.9)"; bg.beginPath(); bg.arc(4, 4, 2.4, 0, PI2); bg.fill(); bg.beginPath(); bg.arc(12, 12, 2.4, 0, PI2); bg.fill();
      C.bd = bd;
      var bb = mk(16, 16), bgb = ctx2(bb); bgb.fillStyle = "rgba(31,79,168,.85)"; bgb.beginPath(); bgb.arc(4, 4, 2.4, 0, PI2); bgb.fill(); bgb.beginPath(); bgb.arc(12, 12, 2.4, 0, PI2); bgb.fill(); C.bb = bb;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, p = C.panel, INK = "#17120d", YEL = pal.yellow || "#ffd400", RED = pal.gold, BLUE = pal.blue || "#1f4fa8", cx = C.cx, cy = C.cy, R = C.R;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      // the panel: a hard shadow and a heavy ink border snap in
      var pa = eo3(seg(t, 0, 0.4)), off = 9 * pa;
      g.fillStyle = INK; g.fillRect(p.x + off, p.y + off, p.w, p.h);
      g.fillStyle = "#fffaee"; g.fillRect(p.x, p.y, p.w, p.h);
      g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
      // Ben-Day dot fields (red from the upper right, blue from the lower left), growing in
      var bdA = sm(seg(t, 0.2, 0.9));
      g.globalAlpha = bdA; g.fillStyle = g.createPattern(C.bd, "repeat");
      var mk1 = g.createLinearGradient(p.x + p.w, p.y, p.x, p.y + p.h * 0.7); mk1.addColorStop(0, "rgba(0,0,0,1)"); mk1.addColorStop(1, "rgba(0,0,0,0)");
      g.save(); g.beginPath(); g.moveTo(p.x + p.w, p.y); g.lineTo(p.x + p.w, p.y + p.h * 0.62); g.lineTo(p.x + p.w * 0.3, p.y); g.closePath(); g.clip(); g.fillRect(p.x, p.y, p.w, p.h); g.restore();
      g.fillStyle = g.createPattern(C.bb, "repeat");
      g.save(); g.beginPath(); g.moveTo(p.x, p.y + p.h); g.lineTo(p.x, p.y + p.h * 0.5); g.lineTo(p.x + p.w * 0.7, p.y + p.h); g.closePath(); g.clip(); g.fillRect(p.x, p.y, p.w, p.h); g.restore();
      g.globalAlpha = 1;
      // speed lines from the middle
      var sl = eo3(seg(t, 0.5, 1.2)) * (1 - sm(seg(t, 2.1, 2.6)) * 0.6);
      g.fillStyle = INK; for (i = 0; i < 44; i++) { var a0 = i / 44 * PI2 + 0.05, w = 0.028 + C.jit[i % 40] * 0.02, r0 = R * (0.62 + C.jit[(i * 3) % 40] * 0.3), r1 = R * (1.1 + sl * 2.2); g.globalAlpha = 0.75 * sl; g.beginPath(); g.moveTo(cx + Math.cos(a0 - w) * r1, cy + Math.sin(a0 - w) * r1); g.lineTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0); g.lineTo(cx + Math.cos(a0 + w) * r1, cy + Math.sin(a0 + w) * r1); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
      // KAPOW: the burst pops (overshoot), shakes, then flies off as the title lands
      var bp = seg(t, 1.0, 1.45), gone = sm(seg(t, 2.0, 2.45)), k = eob(bp, 2.2) * (1 + gone * 1.8), bAlpha = 1 - gone;
      if (bp > 0 && bAlpha > 0.01) {
        g.save(); g.globalAlpha = bAlpha; g.translate(cx + Math.sin(t * 40) * 2 * (1 - bp), cy); g.rotate(-0.1);
        burstPath(g, 10, 10, R, 14, C.jit, k); g.fillStyle = INK; g.fill();
        burstPath(g, 0, 0, R, 14, C.jit, k); g.fillStyle = YEL; g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.lineJoin = "miter"; g.stroke();
        burstPath(g, 0, 0, R * 0.7, 14, C.jit.slice(5), k); g.fillStyle = RED; g.fill(); g.lineWidth = 4; g.stroke();
        g.rotate(0.12); var ksz = R * 0.5 * k; g.font = "400 " + ksz + "px " + COMIC; var kw = g.measureText("KAPOW!").width; if (kw > R * 1.5 * k) { ksz *= R * 1.5 * k / kw; g.font = "400 " + ksz + "px " + COMIC; }   /* a wide fallback face must stay inside the burst */
        g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = R * 0.07 * k; g.strokeStyle = INK; g.strokeText("KAPOW!", 0, R * 0.04); g.fillStyle = "#fff"; g.fillText("KAPOW!", 0, R * 0.04);
        g.restore();
      }
      g.restore();
      // narration box
      var na = eo3(seg(t, 0.35, 0.75));
      if (na > 0.01) {
        var nt = "MEANWHILE, IN THE VAULT...", nf = clamp(p.w / 22, 11, 17); g.font = "700 " + nf + "px " + COMIC; var nw = g.measureText(nt).width + 18, nh = nf + 14, nx = p.x + 8 - (1 - na) * 60, ny = p.y + 8;
        g.globalAlpha = na; g.fillStyle = INK; g.fillRect(nx + 3, ny + 3, nw, nh); g.fillStyle = YEL; g.fillRect(nx, ny, nw, nh); g.lineWidth = 2.5; g.strokeStyle = INK; g.strokeRect(nx, ny, nw, nh);
        g.fillStyle = INK; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(nt, nx + 9, ny + nh / 2 + 1); g.globalAlpha = 1;
      }
      // the title: yellow lettering with a thick ink outline and a red hard shadow, stamped in word by word
      var L = C.L;
      L.lines.forEach(function (ln, li) {
        var sp = eob(seg(t, 1.95 + li * 0.2, 2.35 + li * 0.2), 2.4), a = sm(seg(t, 1.95 + li * 0.2, 2.1 + li * 0.2));
        if (a <= 0.01) return;
        g.save(); g.globalAlpha = a; var lx = L.cx, ly = ln.base - ln.h / 2; g.translate(lx, ly); g.rotate(-0.05); g.scale(sp, sp); g.translate(-lx, -ly);
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.lineJoin = "round";
        ln.glyphs.forEach(function (gl) { g.lineWidth = ln.size * 0.13; g.strokeStyle = INK; g.fillStyle = INK; g.fillText(gl.ch, gl.x + ln.size * 0.07, ln.base + ln.size * 0.07); g.strokeText(gl.ch, gl.x + ln.size * 0.07, ln.base + ln.size * 0.07); });
        ln.glyphs.forEach(function (gl) { g.lineWidth = ln.size * 0.13; g.strokeStyle = INK; g.strokeText(gl.ch, gl.x, ln.base); g.fillStyle = li ? "#fff" : YEL; g.fillText(gl.ch, gl.x, ln.base); });
        g.restore();
      });
      // heavy border over everything
      g.lineWidth = 6; g.strokeStyle = INK; g.strokeRect(p.x, p.y, p.w, p.h);
      if (!C.cued && t > 2.0) { C.cued = true; C.cue("land"); }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.09, C.frame); g.globalCompositeOperation = "source-over";
    }
  };

  /* ============================== DRAFTING ROOM (drafting): blueprint lines draw the coin to scale with a dimension callout, then the wordmark is drafted ============================== */
  STYLES.drafting = {
    dur: 3.2, still: 2.9,
    init: function (C) {
      var W = C.W, H = C.H, i;
      C.R = Math.min(W, H) * (C.portrait ? 0.27 : 0.25); C.cx = W / 2; C.cy = H * (C.portrait ? 0.36 : 0.42);
      C.L = wordmark(C, { cy: H * (C.portrait ? 0.74 : 0.8), track: 0.2, font: function (s) { return "600 " + s + "px " + SANS; }, maxSize: 60, maxW: C.portrait ? W * 0.8 : Math.min(W * 0.55, 700) });
      C.ticks = 96; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, cx = C.cx, cy = C.cy, R = C.R, ink = pal.ink, AMB = pal.gold, LINE = "rgba(243,248,255,.92)", FAINT = "rgba(243,248,255,.5)";
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      // drafting grid
      var ga = sm(seg(t, 0, 0.6)); g.lineWidth = 1;
      g.strokeStyle = "rgba(180,210,255," + (0.07 * ga) + ")"; g.beginPath(); for (i = 0; i < W; i += 20) { g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, H); } for (i = 0; i < H; i += 20) { g.moveTo(0, i + 0.5); g.lineTo(W, i + 0.5); } g.stroke();
      g.strokeStyle = "rgba(180,210,255," + (0.15 * ga) + ")"; g.beginPath(); for (i = 0; i < W; i += 100) { g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, H); } for (i = 0; i < H; i += 100) { g.moveTo(0, i + 0.5); g.lineTo(W, i + 0.5); } g.stroke();
      // sheet border
      var bp = eo3(seg(t, 0.1, 0.9)), m = 12; g.strokeStyle = "rgba(243,248,255,.7)"; g.lineWidth = 1.5; g.setLineDash([2 * (W + H), 2 * (W + H)]); g.lineDashOffset = 2 * (W + H) * (1 - bp); g.strokeRect(m, m, W - m * 2, H - m * 2); g.setLineDash([]);
      // centre lines (dash-dot)
      var cl = eo3(seg(t, 0.2, 0.9)), ext = R * 1.32;
      g.strokeStyle = "rgba(255,210,122,.8)"; g.lineWidth = 1; g.setLineDash([14, 3, 3, 3]);
      g.beginPath(); g.moveTo(cx - ext * cl, cy); g.lineTo(cx + ext * cl, cy); g.moveTo(cx, cy - ext * cl); g.lineTo(cx, cy + ext * cl); g.stroke(); g.setLineDash([]);
      // circles: rim, inner rim, field, drawn by sweeping arcs
      [[1, 0.35, 1.25, 2.2], [0.93, 0.5, 1.35, 1], [0.8, 0.65, 1.5, 1.2], [0.5, 0.85, 1.65, 0.8]].forEach(function (c) {
        var pr = eio(seg(t, c[1], c[2])); if (pr <= 0) return; g.strokeStyle = LINE; g.lineWidth = c[3]; g.beginPath(); g.arc(cx, cy, R * c[0], -Math.PI / 2, -Math.PI / 2 + PI2 * pr); g.stroke();
      });
      // reeding ticks around the edge
      var rt = seg(t, 1.0, 1.9); g.strokeStyle = FAINT; g.lineWidth = 1; g.beginPath();
      for (i = 0; i < C.ticks * rt; i++) { var an = i / C.ticks * PI2 - Math.PI / 2; g.moveTo(cx + Math.cos(an) * R * 0.95, cy + Math.sin(an) * R * 0.95); g.lineTo(cx + Math.cos(an) * R * 0.99, cy + Math.sin(an) * R * 0.99); } g.stroke();
      // inscription on the inner rim, letter by letter
      var ins = "· TITAN · RELIQUARY · TITAN · RELIQUARY ", ia = seg(t, 1.2, 2.1), n = Math.floor(ins.length * ia), rr = R * 0.865;
      g.fillStyle = FAINT; g.font = "600 " + (R * 0.075) + "px " + MONO; g.textAlign = "center"; g.textBaseline = "middle";
      for (i = 0; i < n; i++) { var a2 = -Math.PI / 2 + (i + 0.5) / ins.length * PI2; g.save(); g.translate(cx + Math.cos(a2) * rr, cy + Math.sin(a2) * rr); g.rotate(a2 + Math.PI / 2); g.fillText(ins[i], 0, 0); g.restore(); }
      // dimension line under the coin: extension lines, arrows, the figure in amber
      var dm = eo3(seg(t, 1.5, 2.2)), dy = cy + R + 30, ex = R * dm;
      if (dm > 0.01) {
        g.strokeStyle = AMB; g.lineWidth = 1; g.fillStyle = AMB; g.globalAlpha = sm(seg(t, 1.5, 1.9));
        g.beginPath(); g.moveTo(cx - R, cy + R * 0.2); g.lineTo(cx - R, dy + 8); g.moveTo(cx + R, cy + R * 0.2); g.lineTo(cx + R, dy + 8); g.stroke();
        g.beginPath(); g.moveTo(cx - ex, dy); g.lineTo(cx + ex, dy); g.stroke();
        function arrow(x, dir) { g.beginPath(); g.moveTo(x, dy); g.lineTo(x + dir * 9, dy - 3.5); g.lineTo(x + dir * 9, dy + 3.5); g.closePath(); g.fill(); }
        arrow(cx - ex, 1); arrow(cx + ex, -1);
        var lab = "Ø 24.3 mm", lf = clamp(R * 0.13, 12, 17); g.font = "700 " + lf + "px " + MONO; var lw = g.measureText(lab).width + 14;
        g.fillStyle = pal.bg; g.fillRect(cx - lw / 2, dy - lf * 0.7, lw, lf * 1.4); g.fillStyle = AMB; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(lab, cx, dy + 1);
        g.globalAlpha = 1;
      }
      // a leader callout to the rim
      var lp = eo3(seg(t, 1.8, 2.4));
      if (lp > 0.01) {
        var ax = cx + Math.cos(-0.7) * R, ay = cy + Math.sin(-0.7) * R, bx = ax + R * 0.38 * lp, by = ay - R * 0.34 * lp;
        g.strokeStyle = AMB; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(bx + R * 0.34 * lp, by); g.stroke();
        g.fillStyle = AMB; g.beginPath(); g.arc(ax, ay, 2.5, 0, PI2); g.fill();
        if (lp > 0.7) { g.globalAlpha = sm((lp - 0.7) / 0.3); g.font = "600 " + clamp(R * 0.095, 10, 13) + "px " + MONO; g.textAlign = "right"; g.textBaseline = "bottom"; g.fillText("REEDED EDGE", bx + R * 0.34, by - 4); g.globalAlpha = 1; }
      }
      // the wordmark, drafted: outlines draw themselves, the fill follows
      var L = C.L, wd = seg(t, 2.1, 2.95);
      if (wd > 0.001) {
        g.textAlign = "left"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
        L.lines.forEach(function (ln) {
          g.font = ln.font; var len = ln.size * 5.2;
          ln.glyphs.forEach(function (gl, gi) {
            var lp2 = clamp(wd * 1.6 - gi / ln.glyphs.length * 0.6, 0, 1); if (lp2 <= 0) return;
            g.lineWidth = 1.3; g.strokeStyle = "#ffffff"; g.setLineDash([len, len]); g.lineDashOffset = len * (1 - eo2(lp2)); g.strokeText(gl.ch, gl.x, ln.base); g.setLineDash([]);
            g.globalAlpha = sm((lp2 - 0.7) / 0.3); g.fillStyle = ink; g.fillText(gl.ch, gl.x, ln.base); g.globalAlpha = 1;
          });
        });
        var rw = L.w * 0.5 * eo3(seg(t, 2.5, 3.1)), ry = L.cy + L.h / 2 + L.size * 0.42; g.strokeStyle = AMB; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - rw, ry); g.lineTo(cx + rw, ry); g.stroke();
        g.fillStyle = AMB; if (rw > 12) { g.beginPath(); g.moveTo(cx - rw, ry); g.lineTo(cx - rw + 8, ry - 3); g.lineTo(cx - rw + 8, ry + 3); g.fill(); g.beginPath(); g.moveTo(cx + rw, ry); g.lineTo(cx + rw - 8, ry - 3); g.lineTo(cx + rw - 8, ry + 3); g.fill(); }
      }
      // title block, lower right
      var ta = sm(seg(t, 2.3, 2.9));
      if (ta > 0.01) {
        var bw = Math.min(176, W * 0.46), bh = 46, bx = W - m - bw, by = H - m - bh; g.globalAlpha = ta; g.strokeStyle = "rgba(243,248,255,.8)"; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh); g.beginPath(); g.moveTo(bx, by + 22); g.lineTo(bx + bw, by + 22); g.stroke();
        g.fillStyle = ink; g.font = "700 11px " + MONO; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("TITAN RELIQUARY", bx + 8, by + 11); g.fillStyle = FAINT; g.font = "500 9.5px " + MONO; g.fillText("SHEET 1 OF 1  SCALE 1:1", bx + 8, by + 34); g.globalAlpha = 1;
      }
      if (!C.cued && t > 2.4) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.035, C.frame);
    }
  };

  /* ============================== CLAY DIORAMA (diorama, light): soft clay shapes tumble onto an isometric floor and stack into a little vault ============================== */
  var ROUND = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", system-ui, sans-serif';
  function shade(c, f) { var p = parseColor(c); return rgb([clamp(p[0] * f, 0, 255), clamp(p[1] * f, 0, 255), clamp(p[2] * f, 0, 255)]); }
  STYLES.diorama = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, u = Math.min(W / 11.6, H / 15), portrait = C.portrait;
      C.u = u; C.ox = W / 2; C.oy = (portrait ? H * 0.64 : H * 0.58) - 3 * u;
      var Y = "#ffe08a", PK = "#f4b6c2", BL = "#a8d8ea", GR = "#b8e0c2", TC = "#c8623a", GD = "#f0c75e";
      C.items = [
        { k: "box", x: 2.4, y: 2.2, sx: 2.2, sy: 2.0, h: 2.1, c: BL, t0: 0.3 },
        { k: "box", x: 2.4, y: 2.2, sx: 2.5, sy: 2.3, h: 0.3, z: 2.1, c: TC, t0: 0.72 },
        { k: "door", x: 2.4, y: 3.2, z: 1.05, r: 0.72, t0: 1.0 },
        { k: "stack", x: 4.8, y: 2.0, r: 0.55, n: 6, c: [Y, GD], t0: 0.85 },
        { k: "stack", x: 5.0, y: 3.6, r: 0.55, n: 4, c: [PK, "#e8a0b0"], t0: 1.05 },
        { k: "stack", x: 1.0, y: 4.7, r: 0.5, n: 8, c: [GR, "#9ccaa8"], t0: 1.25 },
        { k: "ball", x: 3.3, y: 4.8, r: 0.58, c: PK, t0: 1.4 },
        { k: "ball", x: 5.2, y: 5.2, r: 0.4, c: BL, t0: 1.58 },
        { k: "ball", x: 0.8, y: 1.1, r: 0.42, c: Y, t0: 1.74 }
      ];
      C.L = wordmark(C, { cy: portrait ? H * 0.22 : H * 0.2, track: 0.05, font: function (s) { return "800 " + s + "px " + ROUND; }, maxSize: portrait ? 96 : 84, gap: 0.2, maxW: portrait ? W * 0.82 : Math.min(W * 0.5, 700) });
      C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, u = C.u, ox = C.ox, oy = C.oy, i, INK = pal.ink, C30 = 0.866;
      function P(x, y, z) { return [ox + (x - y) * C30 * u, oy + (x + y) * 0.5 * u - z * u]; }
      function poly(pts, fill, round) { g.beginPath(); pts.forEach(function (p, k) { g[k ? "lineTo" : "moveTo"](p[0], p[1]); }); g.closePath(); g.fillStyle = fill; g.fill(); if (round) { g.lineJoin = "round"; g.lineWidth = round; g.strokeStyle = fill; g.stroke(); } }
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var bgg = g.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.7); bgg.addColorStop(0, "rgba(255,255,255,.7)"); bgg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = bgg; g.fillRect(0, 0, W, H);
      // the floor slab, growing in
      var fp = eob(seg(t, 0, 0.55), 1.2), FC = "#fbf1e4", S = 6, th = 0.55;
      g.save(); g.translate(ox, oy + 3 * u); g.scale(fp, fp); g.translate(-ox, -(oy + 3 * u));
      g.fillStyle = "rgba(90,60,40,.13)"; g.beginPath(); g.ellipse(ox + 0.1 * u, oy + 3 * u + th * u * 1.15, 5.5 * u, 2.65 * u, 0, 0, PI2); g.fill();
      poly([P(0, S, 0), P(S, S, 0), P(S, S, -th), P(0, S, -th)], shade(FC, 0.84), 2); poly([P(S, 0, 0), P(S, S, 0), P(S, S, -th), P(S, 0, -th)], shade(FC, 0.7), 2);
      poly([P(0, 0, 0), P(S, 0, 0), P(S, S, 0), P(0, S, 0)], FC, 3);
      g.strokeStyle = "rgba(120,90,70,.1)"; g.lineWidth = 1; g.beginPath(); for (i = 1; i < S; i++) { var a = P(i, 0, 0), b = P(i, S, 0), c = P(0, i, 0), d = P(S, i, 0); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); } g.stroke();
      g.restore();
      // objects: soft shadows first, then the shapes back to front; each falls, lands with a squash
      var HD = 9, objs = C.items.map(function (o) {
        var gp = seg(t, o.t0, o.t0 + 0.75), zoff = gp <= 0 ? HD : HD * (1 - bounce(gp)), sq = gp > 0.5 && gp < 0.72 ? Math.sin((gp - 0.5) / 0.22 * Math.PI) : 0;
        return { o: o, zoff: o.k === "door" ? 0 : zoff, vis: gp > 0, sq: sq, gp: gp };
      });
      objs.forEach(function (q) {
        if (!q.vis || q.o.k === "door" || (q.o.z)) return;
        var o = q.o, sp = P(o.x, o.y, 0), k = 1 - q.zoff / (HD * 1.3), rx = (o.k === "box" ? Math.max(o.sx, o.sy) * 0.62 : o.r * 1.5) * u * 1.2, ry = rx * 0.52;
        var sg = g.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], rx); sg.addColorStop(0, "rgba(90,60,40," + 0.3 * k + ")"); sg.addColorStop(1, "rgba(90,60,40,0)");
        g.save(); g.translate(sp[0], sp[1]); g.scale(1, 0.52); g.translate(-sp[0], -sp[1]); g.fillStyle = sg; g.beginPath(); g.arc(sp[0], sp[1], rx, 0, PI2); g.fill(); g.restore();
      });
      objs.sort(function (a, b) { return (a.o.x + a.o.y + (a.o.z || 0) * 0.01) - (b.o.x + b.o.y + (b.o.z || 0) * 0.01) + (a.o.k === "door" ? 0.2 : 0) - (b.o.k === "door" ? 0.2 : 0); });
      objs.forEach(function (q) {
        if (!q.vis) return; var o = q.o, z0 = (o.z || 0) + q.zoff;
        var base = P(o.x, o.y, z0), sq = q.sq;
        g.save(); g.translate(base[0], base[1] + (o.k === "box" ? 0 : 0)); g.scale(1 + 0.1 * sq, 1 - 0.12 * sq); g.translate(-base[0], -base[1]);
        if (o.k === "box") {
          var x0 = o.x - o.sx / 2, x1 = o.x + o.sx / 2, y0 = o.y - o.sy / 2, y1 = o.y + o.sy / 2, h = o.h, z = z0;
          poly([P(x0, y1, z), P(x1, y1, z), P(x1, y1, z + h), P(x0, y1, z + h)], shade(o.c, 0.9), 5); poly([P(x1, y0, z), P(x1, y1, z), P(x1, y1, z + h), P(x1, y0, z + h)], shade(o.c, 0.76), 5);
          poly([P(x0, y0, z + h), P(x1, y0, z + h), P(x1, y1, z + h), P(x0, y1, z + h)], shade(o.c, 1.04), 5);
          var tc = P(o.x, o.y, z + h), hl = g.createRadialGradient(tc[0] - u * 0.4, tc[1] - u * 0.2, 0, tc[0], tc[1], u * Math.max(o.sx, o.sy) * 0.9); hl.addColorStop(0, "rgba(255,255,255,.35)"); hl.addColorStop(1, "rgba(255,255,255,0)");
          g.save(); g.beginPath(); [P(x0, y0, z + h), P(x1, y0, z + h), P(x1, y1, z + h), P(x0, y1, z + h)].forEach(function (p, k) { g[k ? "lineTo" : "moveTo"](p[0], p[1]); }); g.closePath(); g.clip(); g.fillStyle = hl; g.fillRect(tc[0] - u * 3, tc[1] - u * 3, u * 6, u * 6); g.restore();
        } else if (o.k === "door") {
          var dp = eob(seg(t, o.t0, o.t0 + 0.4), 2), c0 = P(o.x, o.y, o.z), sc = Math.max(0.001, dp);
          g.save(); g.transform(C30 * u, 0.5 * u, 0, -u, c0[0], c0[1]);                                // the front-left face plane: x runs right-down, z runs up
          g.scale(sc, sc);
          g.fillStyle = "#e8a83a"; g.beginPath(); g.arc(0.04, -0.06, o.r, 0, PI2); g.fill();
          g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(0, 0, o.r, 0, PI2); g.fill();
          g.strokeStyle = "#e8a83a"; g.lineWidth = 0.09; g.beginPath(); g.arc(0, 0, o.r * 0.72, 0, PI2); g.stroke();
          g.fillStyle = "#c8623a"; g.beginPath(); g.arc(0, 0, o.r * 0.22, 0, PI2); g.fill(); g.lineCap = "round"; g.lineWidth = 0.13; g.strokeStyle = "#c8623a"; g.beginPath(); g.moveTo(0, 0); g.lineTo(o.r * 0.55, o.r * 0.1); g.stroke();
          for (var bI = 0; bI < 6; bI++) { var ba = bI / 6 * PI2; g.fillStyle = "#e8a83a"; g.beginPath(); g.arc(Math.cos(ba) * o.r * 0.86, Math.sin(ba) * o.r * 0.86, 0.045, 0, PI2); g.fill(); }
          g.restore();
        } else if (o.k === "stack") {
          var dh = 0.2, rx2 = o.r * C30 * u * 1.15, ry2 = o.r * 0.5 * u * 1.15;
          for (var n = 0; n < o.n; n++) {
            var zz = z0 + n * dh, p0 = P(o.x, o.y, zz), p1 = P(o.x, o.y, zz + dh), col = o.c[n % 2];
            g.fillStyle = shade(col, 0.82); g.beginPath(); g.ellipse(p0[0], p0[1], rx2, ry2, 0, 0, Math.PI); g.lineTo(p1[0] - rx2, p1[1]); g.ellipse(p1[0], p1[1], rx2, ry2, 0, Math.PI, 0, true); g.closePath(); g.fill();
            g.fillStyle = shade(col, 1.04); g.beginPath(); g.ellipse(p1[0], p1[1], rx2, ry2, 0, 0, PI2); g.fill();
            g.strokeStyle = shade(col, 0.9); g.lineWidth = 1; g.beginPath(); g.ellipse(p1[0], p1[1], rx2 * 0.78, ry2 * 0.78, 0, 0, PI2); g.stroke();
          }
        } else if (o.k === "ball") {
          var bp = P(o.x, o.y, z0 + o.r), rr = o.r * u * 1.12, bg2 = g.createRadialGradient(bp[0] - rr * 0.35, bp[1] - rr * 0.4, rr * 0.1, bp[0], bp[1], rr);
          bg2.addColorStop(0, shade(o.c, 1.12)); bg2.addColorStop(0.6, o.c); bg2.addColorStop(1, shade(o.c, 0.74)); g.fillStyle = bg2; g.beginPath(); g.arc(bp[0], bp[1], rr, 0, PI2); g.fill();
        }
        g.restore();
      });
      // the wordmark: soft clay letters that drop in one by one
      var L = C.L, idx = 0;
      L.lines.forEach(function (ln) {
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left";
        ln.glyphs.forEach(function (gl) {
          var t0 = 1.95 + idx * 0.05, gp = seg(t, t0, t0 + 0.55); idx++; if (gp <= 0) return;
          var dy = -(1 - bounce(gp)) * (H * 0.12), sq = gp > 0.5 && gp < 0.72 ? Math.sin((gp - 0.5) / 0.22 * Math.PI) : 0, cxg = gl.x + gl.w / 2, by = ln.base;
          g.save(); g.translate(cxg, by + dy); g.scale(1 + 0.08 * sq, 1 - 0.1 * sq); g.translate(-cxg, -by);
          g.fillStyle = "rgba(90,60,40,.22)"; g.fillText(gl.ch, gl.x + ln.size * 0.05, by + ln.size * 0.06);
          g.fillStyle = "#8f3a18"; g.fillText(gl.ch, gl.x, by + ln.size * 0.035);
          var cg = g.createLinearGradient(0, by - ln.h, 0, by); cg.addColorStop(0, "#d9784c"); cg.addColorStop(1, "#b9532b"); g.fillStyle = cg; g.fillText(gl.ch, gl.x, by);
          g.globalAlpha = 0.28; g.fillStyle = "#fff"; g.fillText(gl.ch, gl.x - ln.size * 0.012, by - ln.size * 0.016); g.globalAlpha = 1;
          g.restore();
        });
      });
      if (!C.cued && t > 2.2) { C.cued = true; C.cue("land"); }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.06, C.frame); g.globalCompositeOperation = "source-over";
    }
  };

  /* ============================== BAUHAUS (bauhaus, light): a circle, a square and a triangle slide into a poster; the wordmark is kinetic type ============================== */
  STYLES.bauhaus = {
    dur: 3.0, still: 2.7,
    init: function (C) {
      var W = C.W, H = C.H, uW = Math.min(W, H * 0.62);                    // the poster is a centred column; a wide screen just gets more paper
      var L = wordmark(C, { cy: H * 0.51, track: 0.015, font: function (s) { return "900 " + s + "px " + GEO; }, maxW: uW * 0.88, justify: true, lines: ["TITAN", "RELIQUARY"], maxSize: 210, gap: 0.2 });
      C.L = L; C.uW = uW; C.px0 = W / 2 - uW / 2; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, i, RED = pal.gold, BLUE = pal.blue || "#1d4ea1", YEL = pal.yellow || "#f2c230", INK = "#111", L = C.L, uW = C.uW, x0 = C.px0;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var top = L.cy - L.h / 2, bot = L.cy + L.h / 2;
      // shapes slide in from outside the poster, each on its own beat
      function slide(t0, d, from, to) { return lerp(from, to, eo3(seg(t, t0, t0 + d))); }
      var cr = Math.min(uW * 0.23, top * 0.42), ccx = slide(0.1, 0.9, -cr * 2, x0 + uW * 0.3), ccy = top - cr * 1.05;
      g.fillStyle = RED; g.beginPath(); g.arc(ccx, ccy, cr, 0, PI2); g.fill();
      var tw = Math.min(uW * 0.44, top * 0.8), tx = slide(0.25, 0.9, W + tw, x0 + uW - tw - uW * 0.04), ty = top - tw * 1.12;
      g.fillStyle = YEL; g.beginPath(); g.moveTo(tx, ty + tw); g.lineTo(tx + tw, ty + tw); g.lineTo(tx + tw, ty); g.closePath(); g.fill();
      var sq = uW * 0.36, sqx = x0 + uW * 0.07, sqy = slide(0.4, 0.9, H + sq, bot + H * 0.07);
      g.fillStyle = BLUE; g.fillRect(sqx, sqy, sq, sq);
      var bw = uW * 0.5, bx = slide(0.55, 0.8, W + bw, x0 + uW - bw - uW * 0.04), by = bot + H * 0.07 + sq * 0.42;
      g.fillStyle = INK; g.fillRect(bx, by, bw, Math.max(10, sq * 0.2));
      var sc2 = uW * 0.07, cx2 = slide(0.7, 0.7, W * 1.2, x0 + uW * 0.58), cy2 = bot + H * 0.07 + sq * 0.16;
      g.fillStyle = RED; g.beginPath(); g.arc(cx2, cy2, sc2, 0, PI2); g.fill();
      // a hairline rule, the poster grid
      var ra = eo3(seg(t, 0.8, 1.4)); g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x0 + uW * 0.04, bot + H * 0.045); g.lineTo(x0 + uW * 0.04 + (uW * 0.92) * ra, bot + H * 0.045); g.stroke();
      // kinetic type: each letter slides in from its own side and settles with a small overshoot
      L.lines.forEach(function (ln, li) {
        g.font = ln.font; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = INK;
        ln.glyphs.forEach(function (gl, gi) {
          var t0 = 0.95 + li * 0.35 + gi * 0.06, p = eob(seg(t, t0, t0 + 0.55), 1.5), dir = (gi + li) % 4, off = (1 - p);
          var dx = dir === 0 ? -W * off : dir === 2 ? W * off : 0, dy = dir === 1 ? -H * 0.5 * off : dir === 3 ? H * 0.5 * off : 0;
          if (seg(t, t0, t0 + 0.55) <= 0) return;
          g.fillText(gl.ch, gl.x + dx, ln.base + dy);
        });
      });
      var ua = eo3(seg(t, 1.9, 2.5)); g.fillStyle = RED; g.fillRect(L.cx - L.w / 2, bot + H * 0.018, L.w * ua, Math.max(5, L.size * 0.07));
      if (!C.cued && t > 1.9) { C.cued = true; C.cue("land"); }
      g.globalCompositeOperation = "multiply"; grain(g, W, H, 0.07, C.frame); g.globalCompositeOperation = "source-over";
    }
  };

  /* ============================== GRAND TERMINAL (terminal): a split-flap board flips its letters until it reads TITAN RELIQUARY / NOW DEPARTING ============================== */
  var FLAPS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  STYLES.terminal = {
    dur: 3.1, still: 2.8,
    init: function (C) {
      var W = C.W, H = C.H, rnd = C.rnd, narrow = W < 700 || C.portrait, i;
      var rows = narrow ? ["  TITAN  ", "RELIQUARY", "   NOW   ", "DEPARTING"] : ["TITAN RELIQUARY", "NOW DEPARTING"];
      var cols = rows[0].length, gap = Math.max(3, W * 0.008), cw = Math.min(narrow ? (W - 56 - gap * (cols - 1)) / cols : (W * 0.86 - gap * (cols - 1)) / cols, 64), ch = cw * 1.4;
      var bw = cols * cw + (cols - 1) * gap, bh = rows.length * ch + (rows.length - 1) * (gap * 1.6);
      if (!narrow) rows[1] = Array(Math.floor((cols - rows[1].length) / 2) + 1).join(" ") + rows[1];
      var x0 = W / 2 - bw / 2, y0 = H * 0.5 - bh / 2 + (narrow ? 0 : 6), cells = [];
      rows.forEach(function (row, ri) {
        for (var ci = 0; ci < cols; ci++) {
          var chr = row[ci] || " ", ti = Math.max(0, FLAPS.indexOf(chr)), amber = ri < (narrow ? 2 : 1), flips = chr === " " ? 0 : 6 + ((rnd() * 9) | 0) + (ci % 3);
          cells.push({ x: x0 + ci * (cw + gap), y: y0 + ri * (ch + gap * 1.6), t: ti, flips: flips, start: 0.15 + ci * 0.045 + ri * (narrow ? 0.26 : 0.35) + rnd() * 0.1, amber: amber });
        }
      });
      C.cells = cells; C.cw = cw; C.ch = ch; C.board = { x: x0 - 18, y: y0 - 18, w: bw + 36, h: bh + 36 }; C.cued = false;
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, pal = C.pal, cw = C.cw, ch = C.ch, i, b = C.board, AMB = pal.gold;
      g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
      var vg = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, Math.max(W, H) * 0.7); vg.addColorStop(0, "rgba(255,196,61,.07)"); vg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      // the board: a dark frame with a brass edge and a small heading
      var ba = eo3(seg(t, 0, 0.5));
      g.save(); g.globalAlpha = ba; g.translate(0, (1 - ba) * 24);
      g.fillStyle = "#06080a"; roundRect(g, b.x - 6, b.y - 6, b.w + 12, b.h + 12, 16); g.fill(); g.strokeStyle = "#3a3425"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "#12151a"; roundRect(g, b.x, b.y, b.w, b.h, 12); g.fill();
      g.fillStyle = AMB; g.font = "600 " + clamp(W * 0.032, 11, 16) + "px " + SANS; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.globalAlpha = ba * 0.85;
      var head = "GRAND TERMINAL  ·  DEPARTURES", hy = b.y - 22;
      var hw = 0; for (i = 0; i < head.length; i++) hw += g.measureText(head[i]).width + 3; var hx = W / 2 - hw / 2; g.textAlign = "left"; for (i = 0; i < head.length; i++) { g.fillText(head[i], hx, hy); hx += g.measureText(head[i]).width + 3; }
      g.restore();
      // the flaps
      var fs = ch * 0.78, DUR = 0.075, fnt = "700 " + fs + "px " + SANS;
      g.font = fnt; g.textAlign = "center"; g.textBaseline = "middle";
      C.cells.forEach(function (c) {
        var el = (t - c.start) / DUR, nf = Math.min(c.flips, Math.max(0, Math.floor(el))), done = el >= c.flips, step = done ? 1 : (el - nf), cur = (c.t - c.flips + nf + FLAPS.length * 4) % FLAPS.length, prev = (cur - 1 + FLAPS.length) % FLAPS.length;
        if (c.flips === 0) { cur = 0; prev = 0; step = 1; }
        if (el < 0) { cur = 0; prev = 0; step = 1; }
        var oldC = FLAPS[prev], newC = FLAPS[cur], x = c.x, y = c.y, hh = ch / 2, mid = y + hh, col = c.amber ? AMB : "#f6f3ea";
        // body
        var bg = g.createLinearGradient(0, y, 0, y + ch); bg.addColorStop(0, "#232831"); bg.addColorStop(0.5, "#1a1e25"); bg.addColorStop(0.5, "#14171c"); bg.addColorStop(1, "#1b1f26");
        g.fillStyle = bg; roundRect(g, x, y, cw, ch, 5); g.fill();
        function half(chr, top, sy) {                      // draw one half of a character, scaled about the hinge
          g.save(); g.beginPath(); if (top) g.rect(x, y, cw, hh); else g.rect(x, mid, cw, hh); g.clip();
          g.translate(0, mid); g.scale(1, sy); g.translate(0, -mid);
          g.fillStyle = top ? "#222730" : "#171a20"; g.fillRect(x, top ? y : mid, cw, hh);
          g.fillStyle = col; g.font = fnt; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(chr, x + cw / 2, mid + ch * 0.02); g.restore();
        }
        var flipping = el >= 0 && !done && c.flips > 0;
        if (flipping) {
          half(newC, true, 1); half(oldC, false, 1);
          if (step < 0.5) half(oldC, true, Math.cos(step * Math.PI)); else half(newC, false, Math.sin((step - 0.5) * Math.PI) * 1);
          // the falling flap: shade it
          if (step < 0.5) { g.fillStyle = "rgba(0,0,0," + (step * 0.5) + ")"; g.fillRect(x, y + hh * (1 - Math.cos(step * Math.PI)) * 0, cw, 0); }
        } else { half(newC, true, 1); half(newC, false, 1); }
        g.fillStyle = "#050607"; g.fillRect(x, mid - 1, cw, 2.2);                                     // the hinge line
        g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x + 2, y + 1, cw - 4, 1);
      });
      if (!C.cued && t > 2.2) { C.cued = true; C.cue("land"); }
      grain(g, W, H, 0.04, C.frame);
    }
  };
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }


  /* ============================== settings row ============================== */
  var WORDS = { both: "Film, then theme motion", film: "Film only", motion: "Theme motion only", none: "None" };
  var NOTES = {
    both: "The opening film plays, then this theme's own short motion leads into the app. A tap skips straight to the app.",
    film: "The opening film plays every time you open the app.",
    motion: "Each theme opens with its own short motion (about three seconds).",
    none: "The app opens straight away, with no opening."
  };
  function mount(sheet) {
    if (!sheet || sheet.querySelector(".ss-opening-set")) return;
    var host = sheet.querySelector("#ss-follow"); host = host ? host.closest(".in") : null;
    if (!host) return;
    var box = document.createElement("div");
    box.className = "ss-fx ss-opening-set";
    box.innerHTML = '<div class="ss-fx-h" id="ss-op-lbl">Opening (when the app starts)</div>' +
      '<div class="ss-chips ss-op-chips" role="radiogroup" aria-labelledby="ss-op-lbl">' +
      MODES.map(function (m) { return '<button type="button" class="ss-chip" role="radio" data-opening="' + m + '" aria-checked="' + (choice() === m) + '">' + WORDS[m] + "</button>"; }).join("") +
      '</div><p class="ss-note" id="ss-op-note"></p>';
    var after = host.querySelector(".ss-motion-set");                   // sits right under the Motion setting
    if (after && after.nextSibling) host.insertBefore(box, after.nextSibling); else if (after) host.appendChild(box); else host.insertBefore(box, host.firstChild);
    mountSwitch(box);
    var note = box.querySelector("#ss-op-note");
    function say() {
      var c = choice(), lv = motionLevel();
      note.textContent = NOTES[c] + (lv === "off" ? " Motion is Off, so nothing opens first." : lv === "calm" ? " Motion is Calm: one still frame, no film." : "");
      box.querySelectorAll("[data-opening]").forEach(function (x) { x.setAttribute("aria-checked", String(x.dataset.opening === c)); });
    }
    say();
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-opening]"); if (b) { set(b.dataset.opening); say(); } });
    window.addEventListener("titan:motion", say);
  }

  /* ============================== on a theme switch ==============================
     Owner, 2026-10-11: "Each themes unique motion should play when selecting a new theme. Not just on boot after grok splash."
     switchTo(id) covers the screen with that theme's motion splash (the app has already switched underneath), then dissolves it.
     A tap or any key skips it; picking another theme mid-way starts that one instead. Off under Motion Off or the Settings switch
     ("Play a theme's motion when you pick it", localStorage titan.opening.switch = "0"); Calm = the still frame for a second. */
  var SWKEY = "titan.opening.switch", sw = null;
  function switchOn() { return lsGet(SWKEY) !== "0" && motionLevel() !== "off"; }
  function endSwitch(fast) {
    var cur = sw; if (!cur) return; sw = null;
    window.removeEventListener("keydown", cur.onKey, true);
    cur.root.style.transition = "opacity " + (fast ? 0.25 : 0.6) + "s ease"; cur.root.style.opacity = "0";
    setTimeout(function () {
      try { cur.api && cur.api.stop(); } catch (e) { /* ignore */ }
      if (cur.root.parentNode) cur.root.parentNode.removeChild(cur.root);
      if (!html.classList.contains("ts-on")) html.classList.remove("ts-reveal");
    }, fast ? 260 : 620);
  }
  function switchTo(id) {
    if (!switchOn() || !STYLES || html.classList.contains("ts-on")) return false;    // the boot opening is still on screen: leave it alone
    if (sw) { var old = sw; sw = null; window.removeEventListener("keydown", old.onKey, true); try { old.api && old.api.stop(); } catch (e) {} if (old.root.parentNode) old.root.parentNode.removeChild(old.root); }
    var root = document.createElement("div");
    root.className = "ts-switch"; root.setAttribute("role", "presentation");
    root.innerHTML = '<button type="button" class="ts-switch-skip">Skip</button>';
    document.body.appendChild(root);
    var cur = { root: root, api: null, onKey: null };
    cur.onKey = function (e) { if (e.key === "Tab" || e.key === "Shift") return; e.preventDefault(); e.stopPropagation(); endSwitch(true); };
    window.addEventListener("keydown", cur.onKey, true);
    root.addEventListener("pointerdown", function (e) { e.preventDefault(); endSwitch(true); });
    sw = cur;
    try {
      cur.api = play(root, id, null, function (info) { if (sw === cur) endSwitch(!!(info && info.wiped)); }, { tableOnly: true, cue: function () { try { if (window.TitanUISounds && window.TitanUISounds.play) window.TitanUISounds.play("coin-open"); } catch (e) {} } });
    } catch (e) { if (window.console) console.warn("opening switch", e); endSwitch(true); return false; }
    setTimeout(function () { if (sw === cur) endSwitch(false); }, 6000);   // backstop
    return true;
  }
  function mountSwitch(box) {
    var row = document.createElement("label");
    row.className = "ss-op-switch";
    row.innerHTML = '<input type="checkbox" id="ss-op-switch"' + (lsGet(SWKEY) !== "0" ? " checked" : "") + '> Play a theme\'s motion when you pick it';
    box.appendChild(row);
    row.querySelector("input").addEventListener("change", function (e) { lsSet(SWKEY, e.target.checked ? null : "0"); });
  }


  /* ============================== TITAN INTRO V8 HOST (5 PERF TIERS, EXIF, UNPACK_FLIP_Y_WEBGL, CONTEXT-LOSS RECOVERY) ============================== */
  var __tiGlCanvas = null, __tiGl = null, __tiGlLost = false, __tiAudioCtx = null;
  var __tiTierOrder = ["low", "medium", "high", "ultra", "max"];
  var __tiTierDpr = { low: 0.75, medium: 1.0, high: 1.25, ultra: 1.5, max: 2.0 };
  var __tiTierLevelNum = { low: 0.0, medium: 1.0, high: 2.0, ultra: 3.0, max: 4.0 };
  var __tiSlowFrames = 0, __tiDynamicCapIdx = 4;

  function detectTierName() {
    try {
      var q = String(qs("splashq") || qs("tier") || lsGet("tr_quality") || "").toLowerCase();
      if (__tiTierOrder.indexOf(q) >= 0) return q;
      if (q === "0" || lsGet("tr_lite_v1") === "1") return "low";
      if (q === "1") return "medium";
      if (q === "2") return "high";
      if (q === "3") return "ultra";
      if (q === "4") return "max";
      if (window.TitanQuality && window.TitanQuality.tier) {
        var tq = String(window.TitanQuality.tier()).toLowerCase();
        if (__tiTierOrder.indexOf(tq) >= 0) return tq;
      }
      var mem = navigator.deviceMemory || 8;
      var cores = navigator.hardwareConcurrency || 8;
      if (mem <= 3 || cores <= 4) return "low";
      if (mem <= 6) return "medium";
    } catch (e) {}
    return __tiTierOrder[Math.min(2, __tiDynamicCapIdx)];
  }

  function __ensureTiGl(w, h) {
    if (__tiGlLost) return null;
    if (!__tiGlCanvas) {
      __tiGlCanvas = document.createElement("canvas");
      __tiGlCanvas.addEventListener("webglcontextlost", function (ev) {
        ev.preventDefault();
        __tiGlLost = true;
        __tiGl = null;
      }, false);
      __tiGlCanvas.addEventListener("webglcontextrestored", function () {
        __tiGlLost = false;
        __tiGl = null;
      }, false);
    }
    if (!__tiGl && !__tiGlLost) {
      try {
        var glAttribs = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" };
        __tiGl = __tiGlCanvas.getContext("webgl", glAttribs) || __tiGlCanvas.getContext("experimental-webgl", glAttribs);
      } catch (e) { __tiGl = null; }
    }
    if (__tiGl && (__tiGlCanvas.width !== w || __tiGlCanvas.height !== h)) {
      __tiGlCanvas.width = w;
      __tiGlCanvas.height = h;
    }
    return __tiGl;
  }

  var __tiBufCache = {}, __tiBufLoading = {};
  function warmAudio(ctx, name, dir) {
    if (!ctx || __tiBufCache[name] || __tiBufLoading[name] || !window.fetch) return;
    __tiBufLoading[name] = 1;
    var ext = (function () { try { return new Audio().canPlayType('audio/webm; codecs="opus"') ? ".webm" : ".m4a"; } catch (e) { return ".m4a"; } })();
    (window.titanAudioFetch || window.fetch)("audio/" + (dir || "ambience") + "/" + name + ext)
      .then(function (r) { return r && r.ok ? r.arrayBuffer() : null; })
      .then(function (ab) { return ab ? new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }) : null; })
      .then(function (b) { if (b) __tiBufCache[name] = b; })
      .catch(function () { __tiBufLoading[name] = 0; });
  }

  function cutAudio(A, name, s, segArr, rate, v, rel, lp) {
    var b = __tiBufCache[name];
    if (!b || !A || !A.ctx) return false;
    try {
      var x = A.ctx, src = x.createBufferSource(), g = x.createGain();
      var t = A.t0 + s, dur = Math.min(segArr[1], Math.max(0.05, b.duration - segArr[0])) / rate, end = t + dur;
      src.buffer = b;
      src.playbackRate.value = rate;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.04);
      g.gain.setValueAtTime(v, Math.max(t + 0.04, end - rel));
      g.gain.linearRampToValueAtTime(0.0001, end);
      var last = g;
      if (lp) {
        var f = x.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = lp;
        g.connect(f);
        last = f;
      }
      src.connect(g);
      last.connect(A.out);
      src.start(t, segArr[0], segArr[1]);
      A.nodes.push(src);
      return true;
    } catch (e) { return false; }
  }

  var TitanIntro = window.TitanIntro = {
    version: "8.0.0-bespoke",
    specs: {},
    tier: detectTierName,
    tierLevel: function () { return __tiTierLevelNum[detectTierName()] || 2.0; },
    lowTier: function () { return detectTierName() === "low"; },
    isContextLost: function () { return __tiGlLost; },
    warm: warmAudio,
    cut: cutAudio,
    K: {
      mk: function (w, h) { return mk(w, h); },
      seg: function (t, a, b) { return seg(t, a, b); }
    },
    reg: function (id, spec) {
      TitanIntro.specs[id] = spec;
    },
    audio: function () {
      try {
        if (motionLevel() === "off" || /[?&]splashhold\b/.test(location.search)) return null;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        if (!__tiAudioCtx) __tiAudioCtx = new AC();
        if (__tiAudioCtx.state === "suspended") __tiAudioCtx.resume().catch(function () {});
        var now = __tiAudioCtx.currentTime;
        var master = __tiAudioCtx.createGain();
        master.gain.value = 0.28;
        master.connect(__tiAudioCtx.destination);
        var nodes = [];
        return {
          ctx: __tiAudioCtx,
          t0: now,
          out: master,
          nodes: nodes,
          stop: function () {
            nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
          }
        };
      } catch (e) { return null; }
    },
    gl: function (C, fragSrc) {
      var tName = detectTierName();
      var effDpr = __tiTierDpr[tName] || 1.25;
      var cw = Math.max(1, Math.round((C.W || 720) * effDpr));
      var ch = Math.max(1, Math.round((C.H || 1280) * effDpr));
      var gl = __ensureTiGl(cw, ch);
      if (!gl) return null;
      var vsSrc = "attribute vec2 P; void main(){ gl_Position=vec4(P,0.,1.); }";
      var vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
      var fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fragSrc); gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        if (window.console) console.warn("TitanIntro shader compile error:", gl.getShaderInfoLog(fs));
        gl.deleteShader(vs); gl.deleteShader(fs);
        return null;
      }
      var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        gl.deleteProgram(p); gl.deleteShader(vs); gl.deleteShader(fs);
        return null;
      }
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      var locP = gl.getAttribLocation(p, "P");
      var locR = gl.getUniformLocation(p, "R");
      var locT = gl.getUniformLocation(p, "T");
      var locU0 = gl.getUniformLocation(p, "U0");
      var locU1 = gl.getUniformLocation(p, "U1");
      var locTX = gl.getUniformLocation(p, "TX");
      var tex = gl.createTexture();
      var lastFrameTime = performance.now();
      return {
        tex: function (canv) {
          if (__tiGlLost || !gl) return;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canv);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        },
        draw: function (t, u0, u1) {
          if (__tiGlLost || !gl || (gl.isContextLost && gl.isContextLost())) {
            C._glLost = true;
            return false;
          }
          var now = performance.now(), dt = now - lastFrameTime;
          lastFrameTime = now;
          if (dt > 26 && dt < 250) {
            __tiSlowFrames++;
            if (__tiSlowFrames > 12 && __tiDynamicCapIdx > 0) { __tiDynamicCapIdx--; __tiSlowFrames = 0; }
          } else if (dt < 17) {
            __tiSlowFrames = Math.max(0, __tiSlowFrames - 1);
          }
          var curTier = detectTierName();
          var dprNow = __tiTierDpr[curTier] || 1.25;
          var w = Math.max(1, Math.round((C.W || 720) * dprNow));
          var h = Math.max(1, Math.round((C.H || 1280) * dprNow));
          if (__tiGlCanvas.width !== w || __tiGlCanvas.height !== h) {
            __tiGlCanvas.width = w; __tiGlCanvas.height = h;
          }
          gl.viewport(0, 0, w, h);
          gl.useProgram(p);
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.enableVertexAttribArray(locP);
          gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);
          gl.uniform2f(locR, w, h);
          gl.uniform1f(locT, t);
          u0 = u0 || [0,0,0,0]; u1 = u1 || [0,0,2,1];
          gl.uniform4f(locU0, u0[0], u0[1], u0[2], u0[3]);
          gl.uniform4f(locU1, u1[0], u1[1], __tiTierLevelNum[curTier], u1[3]);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform1i(locTX, 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (C.g && __tiGlCanvas) {
            C.g.drawImage(__tiGlCanvas, 0, 0, C.W, C.H);
          }
          return true;
        },
        free: function () {
          try {
            if (gl && !__tiGlLost) {
              gl.deleteTexture(tex);
              gl.deleteBuffer(buf);
              gl.deleteProgram(p);
              gl.deleteShader(vs);
              gl.deleteShader(fs);
            }
          } catch (e) {}
        }
      };
    }
  };

/* Titan Reliquary — Obsidian (v8 Bespoke Portrait-First 3D Lithic Craft Edition)
   Hero Prop: Hand-knapped Mesoamerican volcanic glass bifacial spear point (lanceolate obsidian blade).
   Material Craft: Multi-tier Voronoi conchoidal flake scars, razor-sharp inter-scar arris ridges,
                   serrated pressure-retouch lateral notches, concentric Wallner hackle ripples,
                   micro-abrasion polish hairlines, Beer-Lambert thin-edge smoky amber translucency,
                   and dual studio softbox reflections + recessed upright gold coin medallion in the basal flute.
   Runtime: 14.0s timed 3-act sequence (Act I: Rim Awakening 0-4.0s, Act II: Conchoidal Percussion & Key Sweep 4.0-9.0s,
            Act III: Hero Lock & Single Title Landing 9.0-14.0s).
   Audio: Real recorded vitreous/stone percussion & sanctum ambience (clank.m4a, fire.webm, temple.webm, bowl.m4a). */
(function () {
  "use strict";
  var I = window.TitanIntro;
  if (!I) return;
  var K = I.K;

  var FRAG = [
    "precision highp float;",
    "// [OBSIDIAN-V8-UNIQUE-SHADER-01] Knapped Bifacial Volcanic Glass Point & Conchoidal Fracture Surface",
    "uniform vec2 R;",
    "uniform float T;",
    "uniform vec4 U0, U1;",
    "uniform sampler2D TX;",
    "",
    "vec2 lithicCellSeed(vec2 idx){",
    "  float u = dot(idx, vec2(149.3, 283.7));",
    "  float v = dot(idx, vec2(317.9, 193.1));",
    "  return fract(sin(vec2(u, v)) * 31947.291);",
    "}",
    "float lithicGradNoise(vec2 x){",
    "  vec2 p = floor(x), f = fract(x);",
    "  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);",
    "  float a = fract(sin(dot(p, vec2(113.5, 271.9))) * 49123.17);",
    "  float b = fract(sin(dot(p + vec2(1.0, 0.0), vec2(113.5, 271.9))) * 49123.17);",
    "  float c = fract(sin(dot(p + vec2(0.0, 1.0), vec2(113.5, 271.9))) * 49123.17);",
    "  float d = fract(sin(dot(p + vec2(1.0, 1.0), vec2(113.5, 271.9))) * 49123.17);",
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
    "}",
    "// Computes Bifacial Flake Scars, Inter-Scar Arris Ridges, and Conchoidal Wallner Ripples",
    "// Returns vec4(flakeDepth, arrisRidge, wallnerRipples, scarId)",
    "vec4 knappedFlakeField(vec2 bPos, float tierLv){",
    "  // Mirror-asymmetric domain warp so flake scars travel inward from lateral margins to the median ridge",
    "  float side = bPos.x >= 0.0 ? 1.0 : -1.0;",
    "  vec2 uv = vec2(abs(bPos.x) * 9.5, (bPos.y - 0.05) * 6.8 + abs(bPos.x) * 2.4);",
    "  uv.y += 0.22 * sin(bPos.y * 14.0 + side * 1.1);",
    "  vec2 n = floor(uv), f = fract(uv);",
    "  float d1 = 8.0, d2 = 8.0, id1 = 0.0;",
    "  vec2 rel1 = vec2(0.0);",
    "  for(int j = -1; j <= 1; j++){",
    "    for(int i = -1; i <= 1; i++){",
    "      vec2 g = vec2(float(i), float(j));",
    "      vec2 o = lithicCellSeed(n + g + vec2(side * 7.0, 0.0));",
    "      vec2 r = g + (0.18 + 0.64 * o) - f;",
    "      // Elongate flake scars horizontally from edge toward median ridge",
    "      vec2 rAniso = vec2(r.x * 0.72, r.y * 1.35);",
    "      float d = dot(rAniso, rAniso);",
    "      if(d < d1){ d2 = d1; d1 = d; rel1 = rAniso; id1 = o.x + o.y * 3.7; }",
    "      else if(d < d2){ d2 = d; }",
    "    }",
    "  }",
    "  float s1 = sqrt(d1), s2 = sqrt(d2);",
    "  float arris = exp(-max(0.0, s2 - s1) * 26.0);",
    "  // Concave conchoidal depression inside each flake scar",
    "  float concave = clamp(1.0 - d1 * 0.85, 0.0, 1.0);",
    "  // Concentric Wallner hackle lines radiating from the lateral percussion bulb of each scar",
    "  float ripple = 0.0;",
    "  if(tierLv >= 1.0){",
    "    vec2 bulbOffset = rel1 + vec2(0.38, 0.0);",
    "    float bulbDist = length(bulbOffset);",
    "    ripple = sin(bulbDist * 78.0 - atan(bulbOffset.y, bulbOffset.x) * 2.0) * exp(-bulbDist * 1.8);",
    "    ripple += 0.45 * sin(bulbDist * 165.0) * smoothstep(0.0, 0.5, arris);",
    "  }",
    "  return vec4(concave, arris, ripple, id1);",
    "}",
    "// Evaluates Lanceolate Knapped Obsidian Blade Geometry & Thickness at 2D blade-plane coordinate q",
    "// Returns vec4(height, thickness, matID, edgeRetouch) where matID: 0=background, 1=obsidian blade, 2=gold flute bezel, 3=coin medallion, 4=lower title plinth",
    "vec4 evalKnappedPoint(vec2 q, float t, float tierLv){",
    "  // Center the vertical knapped point in the upper/mid portrait stage: y in [-0.14, +0.39]",
    "  vec2 b = q - vec2(0.0, 0.125);",
    "  // Slight organic hand-knapped asymmetry",
    "  b.x += 0.004 * sin(b.y * 11.0 + 0.5);",
    "  float uY = (b.y + 0.255) / 0.530; // 0 = basal tang, 1 = distal needle tip",
    "  if(uY > -0.04 && uY < 1.04){",
    "    // Lanceolate Clovis/Aztec leaf profile: widens above base, tapers to a piercing tip",
    "    float uClamped = clamp(uY, 0.0, 1.0);",
    "    float halfW = 0.142 * pow(sin(pow(uClamped, 0.68) * 3.14159265), 0.78);",
    "    // Concave basal notch at bottom (uY near 0)",
    "    float basalNotch = 0.028 * exp(-pow(b.x / 0.058, 2.0));",
    "    float yBaseEdge = -0.255 + basalNotch;",
    "    // Serrated pressure-flaking retouch notches along the lateral margins",
    "    float serration = 0.0042 * sin(b.y * 145.0) + 0.0022 * cos(b.y * 290.0 + 1.3);",
    "    float effHalfW = max(0.001, halfW + serration * smoothstep(0.04, 0.18, uClamped) * smoothstep(0.99, 0.85, uClamped));",
    "    float xRatio = abs(b.x) / effHalfW;",
    "    if(b.y >= yBaseEdge && uY <= 1.0 && xRatio <= 1.0){",
    "      // Basal Coin Medallion recessed into the lower Clovis flute (centered at b = (0, -0.105))",
    "      vec2 mPos = b - vec2(0.0, -0.105);",
    "      float mRad = length(mPos);",
    "      if(mRad < 0.068){",
    "        float mAng = atan(mPos.y, mPos.x);",
    "        if(mRad > 0.057){",
    "          float bezel = 0.5 + 0.5 * cos(mAng * 40.0);",
    "          return vec4(0.072 + 0.006 * bezel, 0.090, 2.0, bezel);",
    "        }",
    "        return vec4(0.066, 0.088, 3.0, 1.0);",
    "      }",
    "      // Lenticular cross-section thickness + central longitudinal arris spine",
    "      float lenticular = sqrt(max(0.0, 1.0 - xRatio * xRatio));",
    "      float spine = (1.0 - smoothstep(0.0, 0.55, xRatio)) * 0.32;",
    "      // Clovis basal flute concavity channeling up from the base",
    "      float flute = exp(-pow(b.x / 0.048, 2.0)) * smoothstep(0.55, 0.05, uClamped) * 0.26;",
    "      // Lateral pressure-retouch micro-scars along outer 24% of the blade width",
    "      float retouchZone = smoothstep(0.72, 0.98, xRatio);",
    "      float retouchScars = (0.5 + 0.5 * sin(b.y * 145.0 + sign(b.x) * 0.8)) * retouchZone;",
    "      vec4 flakes = knappedFlakeField(b, tierLv);",
    "      float thickness = clamp((lenticular * 0.72 + spine - flute) * smoothstep(0.0, 0.06, 1.0 - uClamped), 0.002, 1.0);",
    "      float surfH = thickness * 0.095 - flakes.x * 0.016 + flakes.y * 0.0065 - retouchScars * 0.007 + flakes.z * 0.0018;",
    "      return vec4(surfH, thickness, 1.0, flakes.y + retouchScars * 0.6);",
    "    }",
    "  }",
    "  return vec4(0.0, 0.0, 0.0, 0.0);",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5 * R) / R.y;",
    "  float A = R.x / R.y, t = T;",
    "  float tierLv = U1.z; // 0=low, 1=med, 2=high, 3=ultra, 4=max",
    "  // Three timed lithic percussion / stress-wave beats at t = 3.20s, 5.80s, 8.40s",
    "  float beat1 = exp(-pow((t - 3.20) * 6.5, 2.0));",
    "  float beat2 = exp(-pow((t - 5.80) * 6.5, 2.0));",
    "  float beat3 = exp(-pow((t - 8.40) * 5.5, 2.0));",
    "  float strikePulse = beat1 * 0.5 + beat2 * 0.75 + beat3 * 1.1;",
    "  // Subtle camera micro-impulse on the 8.40s final percussion lock",
    "  p += vec2(sin(t * 92.0), cos(t * 118.0)) * 0.0018 * exp(-max(0.0, t - 8.40) * 9.0) * step(8.40, t);",
    "",
    "  // Act I -> Act III Camera Language: slow macro push-out + 3D Y-axis turntable inspection tilt",
    "  float camProgress = smoothstep(0.0, 9.2, t);",
    "  float zoom = mix(0.76, 1.00, camProgress);",
    "  float tiltX = sin(t * 0.42 - 0.6) * mix(0.18, 0.05, smoothstep(7.5, 10.5, t));",
    "  float tiltY = mix(-0.10, 0.04, camProgress);",
    "  vec2 q = p * zoom;",
    "  q.x /= (1.0 - abs(tiltX) * 0.14);",
    "",
    "  // 1. DARK STUDIO CYCLORAMA & BACKLIT AMBER VOLUMETRIC RIM LAMP",
    "  vec2 lampPos = vec2(sin(t * 0.35) * 0.08, mix(0.28, 0.14, smoothstep(0.0, 8.5, t)));",
    "  float lampDist = length(p - lampPos);",
    "  float studioBacklight = exp(-lampDist * 5.2) * (0.35 + 0.65 * smoothstep(0.2, 3.5, t));",
    "  vec3 col = vec3(0.008, 0.008, 0.011);",
    "  col += vec3(0.88, 0.38, 0.07) * studioBacklight * (0.42 + 0.35 * strikePulse);",
    "  // Faint anisotropic studio floor reflection in lower negative space",
    "  float floorGlow = exp(-abs(p.y + 0.36) * 14.0) * exp(-abs(p.x) * 4.5) * smoothstep(2.0, 7.0, t);",
    "  col += vec3(0.45, 0.22, 0.05) * floorGlow * 0.35;",
    "",
    "  // 2. RAYMARCH / PARALLAX RELIEF SAMPLING OF THE KNAPPED OBSIDIAN BIFACE",
    "  vec2 viewOffset = vec2(tiltX, tiltY) * 0.028;",
    "  vec4 hit = evalKnappedPoint(q, t, tierLv);",
    "  if(tierLv >= 1.5 && hit.z < 0.5){",
    "    // Check silhouette thickness edge via 4-step parallax ray offset",
    "    for(int s = 1; s <= 4; s++){",
    "      float fs = float(s) * 0.25;",
    "      vec4 probe = evalKnappedPoint(q - viewOffset * fs, t, tierLv);",
    "      if(probe.z > 0.5 && probe.x > fs * 0.04){ hit = probe; q -= viewOffset * fs; break; }",
    "    }",
    "  }",
    "",
    "  if(hit.z > 0.5){",
    "    float eps = 0.0014;",
    "    float hR = evalKnappedPoint(q + vec2(eps, 0.0), t, tierLv).x;",
    "    float hL = evalKnappedPoint(q - vec2(eps, 0.0), t, tierLv).x;",
    "    float hU = evalKnappedPoint(q + vec2(0.0, eps), t, tierLv).x;",
    "    float hD = evalKnappedPoint(q - vec2(0.0, eps), t, tierLv).x;",
    "    vec3 N = normalize(vec3((hL - hR) * 26.0 + tiltX * 0.35, (hD - hU) * 26.0 + tiltY * 0.25, 1.0));",
    "    vec3 V = normalize(vec3(-p.x * 0.55, -p.y * 0.55, 1.0));",
    "",
    "    // Studio Key Softbox (moving overhead-left) + Warm Rim Light (right edge) + Cool Fill",
    "    float keySweep = mix(-0.65, 0.48, smoothstep(0.5, 8.8, t)) + 0.12 * sin(t * 0.7);",
    "    vec3 Lkey = normalize(vec3(keySweep, 0.62, 0.68));",
    "    vec3 Lrim = normalize(vec3(0.82, 0.24, -0.35));",
    "    vec3 Hkey = normalize(V + Lkey);",
    "    float NdotL = max(dot(N, Lkey), 0.0);",
    "    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.2);",
    "",
    "    if(hit.z < 1.5){",
    "      // KNAPPED VOLCANIC GLASS BRDF (Vitreous IOR 1.49 + Micro-Polish Hairlines + Thin-Edge Beer-Lambert Amber)",
    "      vec2 b = q - vec2(0.0, 0.125);",
    "      vec4 flakes = knappedFlakeField(b, tierLv);",
    "      // Micro-abrasion polish hairlines & obsidian flow banding",
    "      float hairlines = 0.0;",
    "      if(tierLv >= 2.0){",
    "        hairlines = smoothstep(0.82, 0.98, sin((b.x * 210.0 + b.y * 95.0) + lithicGradNoise(b * 45.0) * 4.0));",
    "        hairlines += 0.5 * smoothstep(0.86, 0.99, sin((b.x * -175.0 + b.y * 130.0) + flakes.w * 6.0));",
    "      }",
    "      float flowBand = 0.5 + 0.5 * sin((b.y * 28.0 + b.x * 19.0) + lithicGradNoise(b * 12.0) * 3.5);",
    "      vec3 Rvec = reflect(-V, N);",
    "      // Studio rectangular softbox reflection in the curved conchoidal flake facets",
    "      vec2 sb1 = Rvec.xy - vec2(keySweep * 0.55, 0.28);",
    "      float softbox1 = smoothstep(0.28, 0.04, abs(sb1.x)) * smoothstep(0.42, 0.06, abs(sb1.y));",
    "      vec2 sb2 = Rvec.xy - vec2(-0.34, -0.18);",
    "      float softbox2 = smoothstep(0.18, 0.02, abs(sb2.x)) * smoothstep(0.32, 0.04, abs(sb2.y)) * 0.45;",
    "      float ggxSpec = pow(max(dot(N, Hkey), 0.0), 96.0) * (1.0 + 0.7 * hairlines);",
    "",
    "      // Beer-Lambert Subsurface Thin-Edge Amber Glow!",
    "      // Thick median ridge (hit.y > 0.38) is deep vitreous black; thin serrated pressure-flaked edges transmit smoky amber",
    "      float opticalDepth = hit.y * 7.5;",
    "      vec3 beerLambert = exp(-opticalDepth * vec3(1.15, 3.40, 8.80));",
    "      float backIllum = (0.35 + 0.65 * studioBacklight + 0.55 * strikePulse) * smoothstep(0.55, 0.02, hit.y);",
    "      vec3 transCol = vec3(1.00, 0.46, 0.09) * beerLambert * backIllum * 1.45;",
    "",
    "      // Arris ridge & pressure-retouch edge glints",
    "      float arrisGlint = flakes.y * (0.22 + 0.85 * NdotL + 0.65 * fresnel) * (1.0 + 0.8 * strikePulse);",
    "      float rippleHighlight = max(0.0, flakes.z) * NdotL * 0.35;",
    "",
    "      // Combine vitreous obsidian body + mahogany flow band + thin-edge transmission + studio reflections",
    "      vec3 glassBody = mix(vec3(0.010, 0.010, 0.014), vec3(0.055, 0.024, 0.012), flowBand * 0.35);",
    "      vec3 specCol = vec3(0.98, 0.94, 0.88) * (softbox1 * 0.78 + ggxSpec * 1.15) + vec3(0.72, 0.82, 0.95) * softbox2;",
    "      vec3 rimCol = vec3(1.00, 0.62, 0.20) * (arrisGlint * 0.58 + fresnel * 0.42 + rippleHighlight + hairlines * 0.09 * NdotL);",
    "      // Percussion stress wave travelling from base to tip at t=3.2, 5.8, 8.4s",
    "      float w1 = exp(-abs((b.y + 0.25) - (t - 3.20) * 0.55) * 32.0) * step(3.20, t) * exp(-(t - 3.20) * 1.8);",
    "      float w2 = exp(-abs((b.y + 0.25) - (t - 5.80) * 0.55) * 32.0) * step(5.80, t) * exp(-(t - 5.80) * 1.8);",
    "      float w3 = exp(-abs((b.y + 0.25) - (t - 8.40) * 0.55) * 28.0) * step(8.40, t) * exp(-(t - 8.40) * 1.5);",
    "      vec3 stressWave = vec3(1.0, 0.68, 0.22) * (w1 + w2 + w3) * (0.45 + 0.75 * flakes.y);",
    "      col = glassBody + transCol + specCol * (0.28 + 0.72 * fresnel) + rimCol + stressWave;",
    "    } else if(hit.z < 2.5){",
    "      // Hammered 24K Gold Flute Bezel around the Specimen Coin",
    "      float gSpec = pow(max(dot(N, Hkey), 0.0), 48.0);",
    "      col = mix(vec3(0.24, 0.15, 0.03), vec3(0.98, 0.78, 0.28), 0.25 + 0.75 * NdotL) + vec3(1.0, 0.92, 0.62) * gSpec;",
    "    } else {",
    "      // Upright Specimen Coin Medallion Recessed in the Basal Flute (100% Upright via UNPACK_FLIP_Y_WEBGL)",
    "      vec2 mPos = (q - vec2(0.0, 0.020)) / 0.114 + 0.5;",
    "      vec2 txCoinUV = vec2(mix(0.25, 0.75, clamp(mPos.x, 0.0, 1.0)), mix(0.48, 0.98, clamp(mPos.y, 0.0, 1.0)));",
    "      vec4 cS = texture2D(TX, txCoinUV);",
    "      float cLum = dot(cS.rgb, vec3(0.299, 0.587, 0.114));",
    "      float cR = dot(texture2D(TX, txCoinUV + vec2(0.0025, 0.0)).rgb, vec3(0.333));",
    "      float cU = dot(texture2D(TX, txCoinUV + vec2(0.0, 0.0025)).rgb, vec3(0.333));",
    "      vec3 cN = normalize(vec3((cLum - cR) * 7.0, (cLum - cU) * 7.0, 1.0));",
    "      float cDiff = max(dot(cN, Lkey), 0.0);",
    "      float cSpec = pow(max(dot(cN, Hkey), 0.0), 52.0);",
    "      vec3 coinGold = mix(vec3(0.26, 0.17, 0.04), vec3(0.99, 0.83, 0.38), 0.22 + 0.78 * cLum);",
    "      col = coinGold * (0.30 + 0.80 * cDiff) + vec3(1.0, 0.94, 0.68) * cSpec * 0.95;",
    "    }",
    "  }",
    "",
    "  // 3. SPARSE MOTIVATED MICRO-SPALL GLASS FLAKES & EMBER ACCENTS (only on percussion strikes)",
    "  if(tierLv >= 1.0){",
    "    int nSparks = tierLv >= 3.0 ? 10 : 6;",
    "    for(int i = 0; i < 10; i++){",
    "      if(i >= nSparks) break;",
    "      float fi = float(i);",
    "      float seed = fract(sin(fi * 73.19) * 43758.54);",
    "      vec2 sPos = vec2(sin(fi * 2.7 + t * (0.28 + 0.02 * fi)) * (0.16 + 0.10 * seed),",
    "                       mod(seed + t * (0.09 + 0.015 * fi), 0.92) - 0.42);",
    "      float dSp = length(p - sPos);",
    "      float glint = exp(-dSp * 260.0) * (0.35 + 0.65 * sin(t * 7.5 + fi * 3.1)) * (0.5 + 0.8 * strikePulse);",
    "      col += vec3(1.0, 0.68, 0.25) * glint * 0.45;",
    "    }",
    "  }",
    "",
    "  // 4. SINGLE LEGIBLE TITLE LANDING IN LOWER THIRD NEGATIVE SPACE (Act III: t = 8.8s .. 14.0s)",
    "  // Never covers the hero point (which ends at y = -0.13); never mirrored onto walls.",
    "  vec2 tBox = (p - vec2(0.0, -0.315)) / vec2(0.44, 0.165) + 0.5;",
    "  if(tBox.x >= 0.0 && tBox.x <= 1.0 && tBox.y >= 0.0 && tBox.y <= 1.0 && t > 8.6){",
    "    vec2 txUV = vec2(tBox.x, mix(0.02, 0.44, tBox.y));",
    "    vec4 tS = texture2D(TX, txUV);",
    "    float titleFade = smoothstep(8.8, 10.2, t);",
    "    float wipe = smoothstep(titleFade * 1.15 + 0.08, titleFade * 1.15 - 0.06, abs(tBox.x - 0.5) * 1.6);",
    "    float glyph = smoothstep(0.18, 0.68, tS.b) * wipe * titleFade;",
    "    float halo = smoothstep(0.05, 0.45, tS.b) * titleFade;",
    "    col *= (1.0 - 0.55 * halo * (1.0 - glyph));",
    "    float lightSweep = exp(-pow((tBox.x - mix(-0.1, 1.1, clamp((t - 9.2) / 2.4, 0.0, 1.0))) * 5.5, 2.0));",
    "    vec3 titleCol = mix(vec3(0.86, 0.72, 0.42), vec3(1.0, 0.95, 0.82), 0.5 + 0.5 * lightSweep);",
    "    col = mix(col, titleCol, glyph);",
    "  }",
    "",
    "  float vig = 1.0 - 0.34 * smoothstep(0.40, 1.02, length(p * vec2(1.0 / max(A, 0.52) * 0.82, 1.0)));",
    "  col *= vig;",
    "  // Fade in from black (0..0.8s) and clean hold through 14.0s",
    "  col *= smoothstep(0.0, 0.75, t);",
    "  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function buildObsidianAtlas(C) {
    var W = 1024, H = 1024, c = K.mk(W, H), g = c.getContext("2d");
    g.fillStyle = "#000000";
    g.fillRect(0, 0, W, H);

    // Upper Half: Upright Specimen Coin Medallion (mapped to WebGL uv.y = 0.48..0.98 with UNPACK_FLIP_Y_WEBGL = true)
    var cx = W / 2, cy = 276, rad = 240;
    g.save();
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.clip();
    if (C && C.coin && C.coin.width > 0) {
      var m = Math.min(C.coin.width, C.coin.height);
      g.drawImage(C.coin, (C.coin.width - m) / 2, (C.coin.height - m) / 2, m, m, cx - rad, cy - rad, rad * 2, rad * 2);
    } else {
      var gr = g.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, rad);
      gr.addColorStop(0, "#f5d78c"); gr.addColorStop(0.55, "#b88a32"); gr.addColorStop(1, "#4a330d");
      g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      g.fillStyle = "#fff5d6"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "700 42px Georgia, serif"; g.fillText("COSTA RICA", cx, cy - rad * 0.56);
      g.font = "700 84px Georgia, serif"; g.fillText("T", cx, cy + 6);
      g.font = "600 38px Georgia, serif"; g.fillText("1985", cx, cy + rad * 0.58);
    }
    g.restore();

    // Lower Half: Single Crisp Title Card (mapped to WebGL uv.y = 0.02..0.44)
    function drawTextPass(col, blur) {
      g.save();
      if (blur > 0) { g.shadowColor = col; g.shadowBlur = blur; }
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath();
      g.moveTo(110, 604); g.lineTo(914, 604);
      g.moveTo(110, 968); g.lineTo(914, 968);
      g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "600 34px Georgia, serif";
      g.fillText("BIFACIAL VOLCANIC GLASS \u00b7 CONCHOIDAL LITHIC", W / 2, 650);
      g.font = "700 120px Georgia, serif";
      g.fillText("TITAN", W / 2, 756);
      g.font = "700 76px Georgia, serif";
      g.fillText("RELIQUARY", W / 2, 852);
      g.font = "italic 500 36px Georgia, serif";
      g.fillText("knapped obsidian \u00b7 pressure retouch \u00b7 thin-edge amber", W / 2, 926);
      g.restore();
    }
    drawTextPass("rgb(0, 0, 170)", 12);
    g.globalCompositeOperation = "lighter";
    drawTextPass("rgb(0, 0, 255)", 0);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  function lay(W, H) {
    var A = W / H, port = A < 1;
    var w = port ? A * 0.88 : Math.min(0.76, A * 0.44);
    var tierLv = (window.TitanIntro && window.TitanIntro.tierLevel) ? window.TitanIntro.tierLevel() : 2.0;
    return port ? { hs: [w / 2, w * 0.24], cy: -0.315, u1: [0.06, 0.32, tierLv, 1.0] }
                : { hs: [w / 2, w * 0.22], cy: -0.28, u1: [0.14, 0.10, tierLv, 0.0] };
  }

  I.reg("obsidian", {
    dur: 14.0, still: 11.2,
    init: function (C) {
      C.L = I.gl(C, FRAG);
      if (C.L) C.L.tex(buildObsidianAtlas(C));
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, Ly = lay(W, H);
      g.clearRect(0, 0, W, H);
      if (C.L && !C._glLost && C.L.draw(t, [Ly.hs[0], Ly.hs[1], 1.0, Ly.cy], Ly.u1)) return;
      // Context-loss 2D fallback: knapped obsidian silhouette + upright coin + lower title
      g.fillStyle = "#08070a"; g.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H * 0.38, R = Math.min(W, H) * 0.32;
      g.save();
      g.beginPath();
      g.moveTo(cx, cy - R * 1.05);
      g.quadraticCurveTo(cx + R * 0.58, cy + R * 0.1, cx + R * 0.36, cy + R * 0.82);
      g.quadraticCurveTo(cx, cy + R * 0.64, cx - R * 0.36, cy + R * 0.82);
      g.quadraticCurveTo(cx - R * 0.58, cy + R * 0.1, cx, cy - R * 1.05);
      g.closePath();
      g.fillStyle = "#141218"; g.fill();
      g.lineWidth = 3; g.strokeStyle = "#d97724"; g.stroke();
      g.restore();
      if (C.coin && C.coin.width > 0) {
        var rC = R * 0.26;
        g.save(); g.beginPath(); g.arc(cx, cy + R * 0.42, rC, 0, Math.PI * 2); g.clip();
        g.drawImage(C.coin, cx - rC, cy + R * 0.42 - rC, rC * 2, rC * 2); g.restore();
      }
      if (t > 8.6) {
        g.globalAlpha = K.seg(t, 8.8, 10.2);
        g.fillStyle = "#f5e7c6"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "700 " + Math.round(H * 0.036) + "px Georgia, serif";
        g.fillText("TITAN RELIQUARY", cx, H * 0.80);
        g.font = "500 " + Math.round(H * 0.015) + "px Georgia, serif";
        g.fillText("knapped obsidian \u00b7 pressure retouch \u00b7 thin-edge amber", cx, H * 0.845);
        g.globalAlpha = 1;
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return null;
      ["temple", "fire", "clank", "bowl"].forEach(function (n) { I.warm(A.ctx, n); });
      I.cut(A, "temple", 0.02, [0, 13.8], 1.0, 0.32, 1.4, 1800);
      I.cut(A, "fire", 0.20, [0.5, 13.4], 0.95, 0.22, 1.2, 2100);
      // Three timed lithic knapping/percussion strikes at 3.20s, 5.80s, 8.40s
      [3.20, 5.80, 8.40].forEach(function (tStrike, idx) {
        I.cut(A, "clank", tStrike, [2.15, 0.65], 1.18 + idx * 0.12, 0.36, 0.15, 3600);
      });
      // Resonant obsidian/bronze ring at title landing (8.80s)
      I.cut(A, "bowl", 8.80, [0.0, 4.8], 1.05, 0.28, 1.5, 2900);
      return A.stop;
    }
  });
})();


/* Titan Reliquary — Colossus (v8 Bespoke Portrait-First 3D Cyclopean Stone & Bronze Titan Edition)
   Hero Prop: Monumental fractured basalt & patinated cast-bronze Titan visage/crown emerging from a volcanic chasm.
   Camera & Light: Low-angle (+18 deg) crane up through curl-advected chasm smoke; warm magma/torch bounce light from below
                   + cold zenith moonlight rim; tectonic gold-vein fracture seams ignite at t=4.6s and t=7.4s.
   Runtime: 14.0s timed 3-act sequence.
   Audio: Real recorded storm thunder/wind, tectonic creak, chasm fire, and pitched-down stone impact (storm.webm, creak.m4a, fire.webm, clank.m4a). */
(function () {
  "use strict";
  var I = window.TitanIntro;
  if (!I) return;
  var K = I.K;

  var FRAG = [
    "precision highp float;",
    "// [COLOSSUS-V8-UNIQUE-SHADER-02] Cyclopean Basalt & Patinated Bronze Titan Relief in Volumetric Ash",
    "uniform vec2 R;",
    "uniform float T;",
    "uniform vec4 U0, U1;",
    "uniform sampler2D TX;",
    "",
    "float basaltNoise(vec2 x){",
    "  vec2 i = floor(x), f = fract(x);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float n = dot(i, vec2(1.0, 157.0));",
    "  vec4 h = fract(sin(vec4(n, n + 1.0, n + 157.0, n + 158.0)) * 41593.73);",
    "  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);",
    "}",
    "float ashTurbulence(vec2 p, float t, float tierLv){",
    "  float s = 0.0, amp = 0.52;",
    "  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);",
    "  vec2 q = p * 3.2 - vec2(t * 0.08, t * 0.22);",
    "  s += amp * basaltNoise(q); q = rot * q * 2.03 + vec2(0.0, -t * 0.14); amp *= 0.5;",
    "  s += amp * basaltNoise(q); q = rot * q * 2.05; amp *= 0.5;",
    "  if(tierLv >= 1.0){",
    "    s += amp * basaltNoise(q); q = rot * q * 2.02; amp *= 0.5;",
    "    if(tierLv >= 2.0) s += amp * basaltNoise(q);",
    "  }",
    "  return s;",
    "}",
    "// Voronoi Tectonic Crack Distance & Cell Height for Cyclopean Stone Blocks",
    "vec3 tectonicCracks(vec2 p){",
    "  vec2 n = floor(p), f = fract(p);",
    "  float d1 = 8.0, d2 = 8.0, cid = 0.0;",
    "  for(int j = -1; j <= 1; j++){",
    "    for(int i = -1; i <= 1; i++){",
    "      vec2 g = vec2(float(i), float(j));",
    "      vec2 seed = fract(sin(vec2(dot(n + g, vec2(127.1, 311.7)), dot(n + g, vec2(269.5, 183.3)))) * 43758.5);",
    "      vec2 r = g + 0.15 + 0.70 * seed - f;",
    "      float d = dot(r, r);",
    "      if(d < d1){ d2 = d1; d1 = d; cid = seed.x; } else if(d < d2){ d2 = d; }",
    "    }",
    "  }",
    "  float edge = sqrt(d2) - sqrt(d1);",
    "  return vec3(edge, sqrt(d1), cid);",
    "}",
    "// Evaluates the 3D Sculpted Titan Head, Crown Diadem & Coin Medallion",
    "// Returns vec4(height, matID, crackMask, patina) where matID: 0=void, 1=weathered basalt, 2=patinated bronze crown, 3=coin medallion",
    "vec4 evalColossusHead(vec2 q, float t, float tierLv){",
    "  vec2 c = q - vec2(0.0, 0.11);",
    "  vec2 sym = vec2(abs(c.x), c.y);",
    "  // Monumental Head & Crown Bounding Silhouette",
    "  float headW = mix(0.21, 0.15, smoothstep(-0.24, 0.30, c.y)) + 0.035 * step(0.10, c.y) * smoothstep(0.32, 0.12, c.y);",
    "  float inY = smoothstep(-0.29, -0.22, c.y) * smoothstep(0.34, 0.28, c.y);",
    "  float inX = smoothstep(headW + 0.025, headW - 0.025, sym.x);",
    "  float mask = inX * inY;",
    "  if(mask <= 0.001) return vec4(0.0);",
    "",
    "  // Crown Diadem Coin Medallion at Forehead Center (c = (0.0, 0.185))",
    "  vec2 mPos = c - vec2(0.0, 0.185);",
    "  float mRad = length(mPos);",
    "  if(mRad < 0.068){",
    "    if(mRad > 0.056){",
    "      float gRivet = 0.5 + 0.5 * cos(atan(mPos.y, mPos.x) * 24.0);",
    "      return vec4(0.145 + 0.008 * gRivet, 2.0, 0.0, gRivet);",
    "    }",
    "    return vec4(0.138, 3.0, 0.0, 1.0);",
    "  }",
    "",
    "  // Sculptural Anatomy of the Titan: Cranial Vault, Heavy Brow Ridge, Deep Eye Sockets, Nose Bridge, Cheekbones & Chiseled Beard",
    "  float baseDome = sqrt(max(0.0, 1.0 - pow(sym.x / max(0.08, headW), 2.0))) * 0.11;",
    "  float browRidge = exp(-pow((c.y - 0.065 - 0.08 * sym.x) / 0.028, 2.0)) * smoothstep(0.16, 0.02, sym.x) * 0.042;",
    "  float eyeSocket = exp(-pow((sym.x - 0.068) / 0.038, 2.0) - pow((c.y - 0.028) / 0.024, 2.0)) * 0.052;",
    "  float noseBridge = exp(-pow(sym.x / 0.026, 2.0)) * smoothstep(-0.085, 0.055, c.y) * smoothstep(0.095, 0.04, c.y) * 0.048;",
    "  float cheekBone = exp(-pow((sym.x - 0.092) / 0.042, 2.0) - pow((c.y + 0.035) / 0.040, 2.0)) * 0.028;",
    "  // Fluted archaic bronze beard & jaw plates below y = -0.07",
    "  float beardZone = smoothstep(-0.06, -0.14, c.y) * smoothstep(-0.28, -0.19, c.y);",
    "  float beardFlutes = (0.5 + 0.5 * cos(sym.x * 115.0)) * beardZone * 0.024;",
    "  // Crown rays & stepped diadem band above y = 0.095",
    "  float crownZone = smoothstep(0.085, 0.115, c.y);",
    "  float crownCrest = (0.5 + 0.5 * cos(sym.x * 82.0 - c.y * 18.0)) * crownZone * 0.032;",
    "",
    "  // Tectonic Voronoi Cracks & Micro-Pitted Basalt Grain",
    "  vec3 crk = tectonicCracks(c * 14.5);",
    "  float crackGroove = smoothstep(0.065, 0.008, crk.x);",
    "  float microPits = basaltNoise(c * 95.0) * 0.008 + basaltNoise(c * 210.0) * 0.004;",
    "  float h = (baseDome + browRidge - eyeSocket + noseBridge + cheekBone + beardFlutes + crownCrest) * mask;",
    "  h = h - crackGroove * 0.022 + (crk.z - 0.5) * 0.010 - microPits;",
    "  float isBronze = max(crownZone, beardZone * 0.85);",
    "  return vec4(max(0.0, h), isBronze > 0.45 ? 2.0 : 1.0, crackGroove, crk.z);",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5 * R) / R.y;",
    "  float A = R.x / R.y, t = T;",
    "  float tierLv = U1.z;",
    "  // Seismic tectonic impacts at t = 4.60s and t = 7.40s",
    "  float quake1 = exp(-max(0.0, t - 4.60) * 4.5) * step(4.60, t);",
    "  float quake2 = exp(-max(0.0, t - 7.40) * 4.0) * step(7.40, t);",
    "  p += vec2(sin(t * 74.0), cos(t * 96.0)) * 0.0032 * (quake1 * 0.65 + quake2); ",
    "",
    "  // Low-angle monumental camera crane-up + slow push-in",
    "  float craneY = mix(-0.08, 0.015, smoothstep(0.0, 9.0, t));",
    "  float scale = mix(0.84, 1.00, smoothstep(0.0, 9.5, t));",
    "  float persp = 1.0 + (p.y - craneY) * 0.22; // Low-angle foreshortening looking up at the Titan",
    "  vec2 q = (p - vec2(0.0, craneY)) * scale * persp;",
    "",
    "  // 1. VOLCANIC CHASM SKY & UPDRAFT MAGMA GLOW",
    "  float bgSmoke = ashTurbulence(p * 1.4, t * 0.6, tierLv);",
    "  float chasmGlow = exp(-max(0.0, p.y + 0.45) * 3.6) * (0.45 + 0.55 * bgSmoke);",
    "  float zenithRim = exp(-max(0.0, 0.48 - p.y) * 5.0);",
    "  vec3 col = vec3(0.016, 0.012, 0.010) + vec3(0.92, 0.34, 0.06) * chasmGlow * 0.65 + vec3(0.18, 0.25, 0.38) * zenithRim * 0.28;",
    "",
    "  // 2. 3D RELIEF RAYMARCHING OF THE COLOSSUS HEAD",
    "  vec4 hit = evalColossusHead(q, t, tierLv);",
    "  if(tierLv >= 1.5 && hit.y < 0.5){",
    "    vec2 stepDir = vec2(0.0, -0.018);",
    "    for(int s = 1; s <= 4; s++){",
    "      float fs = float(s) * 0.25;",
    "      vec4 pr = evalColossusHead(q - stepDir * fs, t, tierLv);",
    "      if(pr.y > 0.5 && pr.x > fs * 0.08){ hit = pr; q -= stepDir * fs; break; }",
    "    }",
    "  }",
    "",
    "  if(hit.y > 0.5){",
    "    float eps = 0.0022;",
    "    float hR = evalColossusHead(q + vec2(eps, 0.0), t, tierLv).x;",
    "    float hU = evalColossusHead(q + vec2(0.0, eps), t, tierLv).x;",
    "    vec3 N = normalize(vec3((hit.x - hR) * 22.0, (hit.x - hU) * 22.0, 1.0));",
    "    vec3 V = normalize(vec3(-p.x * 0.5, -p.y * 0.5, 1.0));",
    "    // Low-angle magma updraft key light + cold upper-left rim light",
    "    vec3 Lfire = normalize(vec3(0.38 * sin(t * 0.55), -0.78, 0.52));",
    "    vec3 Lmoon = normalize(vec3(-0.55, 0.72, 0.42));",
    "    float diffFire = max(dot(N, Lfire), 0.0);",
    "    float diffMoon = max(dot(N, Lmoon), 0.0);",
    "    float specFire = pow(max(dot(N, normalize(V + Lfire)), 0.0), 36.0);",
    "    float specMoon = pow(max(dot(N, normalize(V + Lmoon)), 0.0), 28.0);",
    "    float ao = clamp(0.32 + 0.68 * (hit.x / 0.12) * (1.0 - 0.65 * hit.z), 0.15, 1.0);",
    "",
    "    if(hit.y < 1.5){",
    "      // Weathered Basalt Stone + Glowing Tectonic Fissures",
    "      float grain = basaltNoise(q * 64.0);",
    "      vec3 stoneAlb = mix(vec3(0.06, 0.05, 0.045), vec3(0.16, 0.13, 0.11), grain);",
    "      // Verdigris moss/copper oxide in sheltered upper crevices",
    "      float verdigris = smoothstep(0.3, 0.8, hit.w) * max(0.0, N.y) * 0.35;",
    "      stoneAlb = mix(stoneAlb, vec3(0.09, 0.24, 0.19), verdigris);",
    "      vec3 litStone = stoneAlb * (vec3(0.14, 0.13, 0.16) + vec3(1.0, 0.44, 0.10) * diffFire * 1.45 + vec3(0.45, 0.60, 0.82) * diffMoon * 0.75) * ao;",
    "      litStone += vec3(1.0, 0.62, 0.22) * specFire * 0.32 + vec3(0.65, 0.78, 0.95) * specMoon * 0.22;",
    "      // Molten gold fissure veins igniting at t = 4.6s and 7.4s",
    "      float veinIgnite = smoothstep(4.4, 5.2, t) * 0.55 + smoothstep(7.2, 8.0, t) * 0.65;",
    "      float moltenVein = hit.z * veinIgnite * (0.6 + 0.4 * sin(q.y * 35.0 - t * 3.5));",
    "      col = litStone + vec3(1.0, 0.62, 0.12) * moltenVein * 1.6;",
    "    } else if(hit.y < 2.5){",
    "      // Patinated Cast-Bronze Crown & Beard Plates with Verdigris Crevices",
    "      vec3 bronzeBase = mix(vec3(0.18, 0.11, 0.04), vec3(0.78, 0.54, 0.22), 0.3 + 0.7 * diffFire);",
    "      vec3 patina = vec3(0.12, 0.36, 0.28) * clamp(1.0 - hit.x * 7.5, 0.0, 1.0);",
    "      col = mix(bronzeBase, patina, 0.32 * hit.z) * ao + vec3(1.0, 0.78, 0.38) * specFire * 0.95 + vec3(0.75, 0.85, 1.0) * specMoon * 0.40;",
    "    } else {",
    "      // Upright Specimen Coin Set in the Colossus Brow Diadem",
    "      vec2 mPos = (q - vec2(0.0, 0.295)) / 0.112 + 0.5;",
    "      vec2 txCoinUV = vec2(mix(0.25, 0.75, clamp(mPos.x, 0.0, 1.0)), mix(0.48, 0.98, clamp(mPos.y, 0.0, 1.0)));",
    "      vec4 cS = texture2D(TX, txCoinUV);",
    "      float cLum = dot(cS.rgb, vec3(0.299, 0.587, 0.114));",
    "      float cR = dot(texture2D(TX, txCoinUV + vec2(0.0025, 0.0)).rgb, vec3(0.333));",
    "      float cU = dot(texture2D(TX, txCoinUV + vec2(0.0, 0.0025)).rgb, vec3(0.333));",
    "      vec3 cN = normalize(vec3((cLum - cR) * 7.5, (cLum - cU) * 7.5, 1.0));",
    "      float cDiff = max(dot(cN, Lfire), 0.0) * 0.8 + max(dot(cN, Lmoon), 0.0) * 0.5;",
    "      float cSpec = pow(max(dot(cN, normalize(V + Lfire)), 0.0), 46.0);",
    "      vec3 coinBronze = mix(vec3(0.24, 0.14, 0.04), vec3(0.98, 0.76, 0.32), 0.22 + 0.78 * cLum);",
    "      col = coinBronze * (0.28 + 0.85 * cDiff) + vec3(1.0, 0.88, 0.52) * cSpec * 1.1;",
    "    }",
    "    // Eye socket ember awakening in Act II (t > 4.6s)",
    "    vec2 eyePos = vec2(abs(q.x) - 0.068, (q.y - 0.11) - 0.028);",
    "    float eyeGlow = exp(-dot(eyePos, eyePos) * 1800.0) * smoothstep(4.5, 6.2, t);",
    "    col += vec3(1.0, 0.52, 0.10) * eyeGlow * (1.2 + 0.6 * quake2);",
    "  }",
    "",
    "  // 3. FOREGROUND VOLUMETRIC ASH PLUME & RISING CHASM EMBERS",
    "  float fgSmoke = ashTurbulence(p * 2.1 + vec2(0.3, -t * 0.12), t, tierLv);",
    "  float smokeMask = smoothstep(-0.48, -0.05, -p.y) * fgSmoke * 0.42;",
    "  col = mix(col, vec3(0.18, 0.09, 0.04) + vec3(0.65, 0.24, 0.05) * chasmGlow, smokeMask);",
    "  if(tierLv >= 1.0){",
    "    int nEmb = tierLv >= 3.0 ? 12 : 7;",
    "    for(int i = 0; i < 12; i++){",
    "      if(i >= nEmb) break;",
    "      float fi = float(i);",
    "      float hSeed = fract(sin(fi * 41.3) * 19483.2);",
    "      vec2 ePos = vec2(sin(fi * 3.9 + t * (0.45 + 0.04 * fi)) * 0.25,",
    "                       mod(hSeed + t * (0.16 + 0.02 * fi), 0.98) - 0.49);",
    "      float ember = exp(-length(p - ePos) * (190.0 + 70.0 * hSeed)) * (0.5 + 0.5 * sin(t * 9.0 + fi));",
    "      col += vec3(1.0, 0.48, 0.08) * ember * 0.55;",
    "    }",
    "  }",
    "",
    "  // 4. SINGLE MONUMENTAL TITLE LANDING IN LOWER THIRD (Act III: t = 9.0s .. 14.0s)",
    "  vec2 tBox = (p - vec2(0.0, -0.315)) / vec2(0.44, 0.165) + 0.5;",
    "  if(tBox.x >= 0.0 && tBox.x <= 1.0 && tBox.y >= 0.0 && tBox.y <= 1.0 && t > 8.8){",
    "    vec2 txUV = vec2(tBox.x, mix(0.02, 0.44, tBox.y));",
    "    vec4 tS = texture2D(TX, txUV);",
    "    float rev = smoothstep(9.0, 10.4, t);",
    "    float glyph = smoothstep(0.18, 0.68, tS.b) * rev;",
    "    float shadow = smoothstep(0.04, 0.48, tS.b) * rev;",
    "    col *= (1.0 - 0.65 * shadow * (1.0 - glyph));",
    "    vec3 bronzeTitle = mix(vec3(0.82, 0.58, 0.24), vec3(1.0, 0.90, 0.66), 0.5 + 0.5 * sin(tBox.x * 3.14159));",
    "    col = mix(col, bronzeTitle, glyph);",
    "  }",
    "",
    "  col *= (1.0 - 0.35 * smoothstep(0.40, 1.02, length(p * vec2(1.0 / max(A, 0.52) * 0.82, 1.0))));",
    "  col *= smoothstep(0.0, 0.8, t);",
    "  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function buildColossusAtlas(C) {
    var W = 1024, H = 1024, c = K.mk(W, H), g = c.getContext("2d");
    g.fillStyle = "#000000"; g.fillRect(0, 0, W, H);
    var cx = W / 2, cy = 276, rad = 240;
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.clip();
    if (C && C.coin && C.coin.width > 0) {
      var m = Math.min(C.coin.width, C.coin.height);
      g.drawImage(C.coin, (C.coin.width - m) / 2, (C.coin.height - m) / 2, m, m, cx - rad, cy - rad, rad * 2, rad * 2);
    } else {
      g.fillStyle = "#b87a28"; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    g.restore();

    function drawTextPass(col, blur) {
      g.save();
      if (blur > 0) { g.shadowColor = col; g.shadowBlur = blur; }
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.moveTo(110, 604); g.lineTo(914, 604); g.moveTo(110, 968); g.lineTo(914, 968); g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "600 34px Georgia, serif"; g.fillText("CYCLOPEAN BASALT \u00b7 CAST BRONZE MONOLITH", W / 2, 650);
      g.font = "700 120px Georgia, serif"; g.fillText("TITAN", W / 2, 756);
      g.font = "700 76px Georgia, serif"; g.fillText("RELIQUARY", W / 2, 852);
      g.font = "italic 500 36px Georgia, serif"; g.fillText("weathered stone \u00b7 verdigris patina \u00b7 chasm ember", W / 2, 926);
      g.restore();
    }
    drawTextPass("rgb(0, 0, 170)", 12);
    g.globalCompositeOperation = "lighter";
    drawTextPass("rgb(0, 0, 255)", 0);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  function lay(W, H) {
    var A = W / H, port = A < 1;
    var w = port ? A * 0.88 : Math.min(0.76, A * 0.44);
    var tierLv = (window.TitanIntro && window.TitanIntro.tierLevel) ? window.TitanIntro.tierLevel() : 2.0;
    return port ? { hs: [w / 2, w * 0.24], cy: -0.315, u1: [0.06, 0.32, tierLv, 1.0] }
                : { hs: [w / 2, w * 0.22], cy: -0.28, u1: [0.14, 0.10, tierLv, 0.0] };
  }

  I.reg("colossus", {
    dur: 14.0, still: 11.2,
    init: function (C) {
      C.L = I.gl(C, FRAG);
      if (C.L) C.L.tex(buildColossusAtlas(C));
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, Ly = lay(W, H);
      g.clearRect(0, 0, W, H);
      if (C.L && !C._glLost && C.L.draw(t, [Ly.hs[0], Ly.hs[1], 1.0, Ly.cy], Ly.u1)) return;
      g.fillStyle = "#120c08"; g.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H * 0.38, R = Math.min(W, H) * 0.30;
      g.fillStyle = "#241911"; g.fillRect(cx - R * 0.7, cy - R * 0.9, R * 1.4, R * 1.7);
      if (C.coin && C.coin.width > 0) {
        var rC = R * 0.26;
        g.save(); g.beginPath(); g.arc(cx, cy - R * 0.45, rC, 0, Math.PI * 2); g.clip();
        g.drawImage(C.coin, cx - rC, cy - R * 0.45 - rC, rC * 2, rC * 2); g.restore();
      }
      if (t > 8.8) {
        g.globalAlpha = K.seg(t, 9.0, 10.4);
        g.fillStyle = "#fbeed4"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "700 " + Math.round(H * 0.036) + "px Georgia, serif";
        g.fillText("TITAN RELIQUARY", cx, H * 0.80);
        g.globalAlpha = 1;
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return null;
      ["storm", "creak", "fire", "clank", "bowl"].forEach(function (n) { I.warm(A.ctx, n); });
      I.cut(A, "storm", 0.02, [0, 13.8], 0.85, 0.34, 1.5, 1400);
      I.cut(A, "fire", 0.15, [1.0, 13.5], 0.88, 0.28, 1.2, 1800);
      I.cut(A, "creak", 2.20, [0.2, 3.2], 0.72, 0.30, 0.6, 1200);
      I.cut(A, "clank", 4.60, [2.1, 0.8], 0.58, 0.40, 0.25, 1100);
      I.cut(A, "clank", 7.40, [2.1, 0.9], 0.52, 0.42, 0.30, 950);
      I.cut(A, "bowl", 9.00, [0.0, 4.5], 0.75, 0.26, 1.4, 2100);
      return A.stop;
    }
  });
})();


/* Titan Reliquary — Tourbillon (v8 Bespoke Portrait-First 3D Macro Horology & Sapphire Bridge Edition)
   Hero Prop: High-complication Coaxial Tourbillon Cage, 28,800 vph (8 Hz) discrete pallet-fork escapement lock,
              beveled sapphire crystal bridge (45-deg polished anglages) with chromatic IOR dispersion,
              Cotes de Geneve rhodium mainplate, blued steel screws, crimson ruby jewel pivot, and upright coin dial.
   Runtime: 14.0s timed 3-act sequence (Act I: Macro Bokeh Focus Pull 0-3.8s, Act II: Sapphire Bridge Sweep & Escapement 3.8-8.8s,
            Act III: Chronometer Zero-Reset Lock & Title Landing 8.8-14.0s).
   Audio: Real recorded mechanical clock escapement, ratchet clicks & balance resonance (clock.webm, clank.m4a, bowl.m4a). */
(function () {
  "use strict";
  var I = window.TitanIntro;
  if (!I) return;
  var K = I.K;

  var FRAG = [
    "precision highp float;",
    "// [TOURBILLON-V8-UNIQUE-SHADER-03] Multi-Plane Macro Horological Escapement & Chamfered Sapphire Bridge",
    "uniform vec2 R;",
    "uniform float T;",
    "uniform vec4 U0, U1;",
    "uniform sampler2D TX;",
    "",
    "mat2 rot2D(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }",
    "// 28,800 vph (8 Hz) Discrete Swiss Lever Escapement Step Function",
    "float escapementStep(float t){",
    "  float ticks = t * 8.0;",
    "  float whole = floor(ticks);",
    "  float frac = fract(ticks);",
    "  // Mechanical pallet-fork unlock -> impulse -> lock with tiny elastic recoil",
    "  float stepVal = smoothstep(0.0, 0.22, frac) + 0.045 * sin(frac * 25.1327) * exp(-frac * 7.0);",
    "  return (whole + stepVal) / 8.0;",
    "}",
    "// Evaluates Background Plane (z = -0.32): Rhodium Mainplate with Cotes de Geneve & Recessed Gold Gear Train",
    "vec3 evalHorologyMainplate(vec2 p, float tEsc, float tierLv){",
    "  // Cotes de Geneve (Geneva Stripes) anisotropic brushing",
    "  float stripePhase = (p.x + 0.08 * p.y) * 52.0;",
    "  float stripeId = floor(stripePhase);",
    "  float stripeLocal = fract(stripePhase) - 0.5;",
    "  float microBrush = sin((p.y * 420.0 + stripeId * 17.3) + sin(p.x * 190.0)) * 0.15;",
    "  float geneveSpec = 0.55 + 0.35 * cos(stripeLocal * 3.14159) + microBrush;",
    "  vec3 rhodium = mix(vec3(0.10, 0.11, 0.14), vec3(0.32, 0.35, 0.42), clamp(geneveSpec, 0.0, 1.0));",
    "",
    "  // Circular Perlage on recessed barrel well",
    "  float rWell = length(p - vec2(0.0, 0.12));",
    "  if(rWell < 0.255){",
    "    float pRings = 0.5 + 0.5 * sin(rWell * 280.0) * cos(atan(p.y - 0.12, p.x) * 36.0);",
    "    rhodium = mix(vec3(0.05, 0.06, 0.08), vec3(0.18, 0.20, 0.25), pRings);",
    "  }",
    "",
    "  // Secondary Brass Going-Train Gear Wheels at upper-left and lower-right",
    "  for(int gIdx = 0; gIdx < 2; gIdx++){",
    "    vec2 gCenter = gIdx == 0 ? vec2(-0.14, 0.24) : vec2(0.14, -0.01);",
    "    vec2 gp = p - gCenter;",
    "    float gr = length(gp);",
    "    float gAng = atan(gp.y, gp.x) + (gIdx == 0 ? tEsc * 0.45 : -tEsc * 0.60);",
    "    float teeth = smoothstep(-0.15, 0.25, cos(gAng * 32.0)) * smoothstep(0.115, 0.102, gr) * smoothstep(0.088, 0.095, gr);",
    "    float rim = smoothstep(0.102, 0.098, gr) * smoothstep(0.076, 0.080, gr);",
    "    float spokes = smoothstep(0.014, 0.006, abs(sin(gAng * 2.5))) * smoothstep(0.080, 0.025, gr);",
    "    float gearMask = clamp(teeth + rim + spokes, 0.0, 1.0);",
    "    vec3 roseBrass = mix(vec3(0.32, 0.20, 0.08), vec3(0.92, 0.70, 0.36), 0.5 + 0.5 * cos(gAng * 2.0));",
    "    rhodium = mix(rhodium, roseBrass, gearMask * 0.88);",
    "  }",
    "  return rhodium;",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5 * R) / R.y;",
    "  float A = R.x / R.y, t = T;",
    "  float tierLv = U1.z;",
    "",
    "  // Macro lens focus pull in Act I (0..3.6s) + slow confident camera drift",
    "  float focusBlur = mix(0.012, 0.0, smoothstep(0.0, 3.4, t));",
    "  float camZoom = mix(0.74, 1.00, smoothstep(0.0, 9.2, t));",
    "  vec2 camPan = vec2(sin(t * 0.32) * 0.025, cos(t * 0.26) * 0.020) * (1.0 - smoothstep(8.0, 10.5, t));",
    "  vec2 q = (p + camPan) * camZoom;",
    "  vec2 cPos = q - vec2(0.0, 0.125); // Center of the Tourbillon Carriage in upper/mid portrait stage",
    "  float r = length(cPos);",
    "",
    "  // Discrete 8 Hz Escapement Time; locks at Chronometer Zero-Reset at t = 9.0s",
    "  float tLock = t < 9.0 ? t : 9.0 + 0.02 * exp(-(t - 9.0) * 6.0) * sin((t - 9.0) * 45.0);",
    "  float tEsc = escapementStep(tLock);",
    "  float tickImpulse = exp(-fract(t * 8.0) * 9.0) * step(t, 9.05);",
    "",
    "  // Studio Horological Lighting Rig (overhead softbox + warm lateral fill)",
    "  vec3 V = normalize(vec3(-p.x * 0.5, -p.y * 0.5, 1.0));",
    "  vec3 Lkey = normalize(vec3(0.45 * sin(t * 0.45 + 0.4), 0.65, 0.62));",
    "",
    "  // 1. PLANE 1 (z = -0.32): Rhodium Mainplate & Going Train with Parallax Offset",
    "  vec2 pBg = q + V.xy * 0.045;",
    "  vec3 col = evalHorologyMainplate(pBg, tEsc, tierLv);",
    "  if(focusBlur > 0.001 && tierLv >= 1.0){",
    "    col = 0.5 * col + 0.25 * evalHorologyMainplate(pBg + vec2(focusBlur, 0.0), tEsc, tierLv)",
    "                    + 0.25 * evalHorologyMainplate(pBg + vec2(0.0, focusBlur), tEsc, tierLv);",
    "  }",
    "  // Deep shadow well inside the Tourbillon aperture (r < 0.235)",
    "  float wellShadow = smoothstep(0.245, 0.215, r);",
    "  col *= mix(1.0, 0.38, wellShadow);",
    "  // Beveled steel aperture chapter ring (r in 0.222..0.248)",
    "  if(r >= 0.218 && r < 0.252){",
    "    float uRim = (r - 0.218) / 0.034;",
    "    float anglage = sin(uRim * 3.14159);",
    "    float secMarks = smoothstep(0.75, 0.95, cos(atan(cPos.y, cPos.x) * 60.0));",
    "    vec3 steelRim = mix(vec3(0.16, 0.18, 0.22), vec3(0.88, 0.92, 0.98), anglage * (0.4 + 0.6 * max(0.0, dot(normalize(vec3(cPos, 0.1)), Lkey))));",
    "    steelRim = mix(steelRim, vec3(0.95, 0.76, 0.35), secMarks * 0.45);",
    "    col = mix(col, steelRim, smoothstep(0.0, 0.15, uRim) * smoothstep(1.0, 0.85, uRim));",
    "  }",
    "",
    "  // 2. PLANE 2 (z = -0.10): 4 Hz Oscillating Gold Balance Wheel & Titanium 3-Arm Tourbillon Cage",
    "  vec2 cMid = cPos + V.xy * 0.018;",
    "  float rMid = length(cMid);",
    "  if(rMid < 0.220){",
    "    // Balance wheel oscillates back and forth at 4 Hz (+- 1.35 rad)",
    "    float balAngle = sin(tLock * 25.1327) * 1.15 + tEsc * 0.52;",
    "    vec2 bP = rot2D(balAngle) * cMid;",
    "    float bAng = atan(bP.y, bP.x);",
    "    float balRim = smoothstep(0.014, 0.003, abs(rMid - 0.182));",
    "    float balArm = smoothstep(0.010, 0.002, abs(bP.y)) * smoothstep(0.182, 0.045, rMid);",
    "    float timingScrews = smoothstep(0.86, 0.96, cos(bAng * 8.0)) * smoothstep(0.024, 0.004, abs(rMid - 0.192));",
    "    float hairspring = smoothstep(0.65, 0.95, sin(rMid * 420.0 - bAng * 2.0)) * smoothstep(0.115, 0.065, rMid) * smoothstep(0.045, 0.065, rMid);",
    "    float balMask = clamp(balRim + balArm + timingScrews + hairspring * 0.65, 0.0, 1.0);",
    "    vec3 goldBal = mix(vec3(0.38, 0.24, 0.06), vec3(1.0, 0.84, 0.42), 0.45 + 0.55 * cos(bAng * 2.0 - t));",
    "    col = mix(col, goldBal, balMask);",
    "",
    "    // Titanium 3-Arm Tourbillon Carriage with 45-degree Chamfered Anglages",
    "    float cageAngle = -tEsc * 0.68;",
    "    vec2 kP = rot2D(cageAngle) * cMid;",
    "    float kAng = atan(kP.y, kP.x);",
    "    float threeArms = smoothstep(0.016, 0.004, abs(sin(kAng * 1.5)) * rMid) * smoothstep(0.205, 0.072, rMid);",
    "    float cageRing = smoothstep(0.012, 0.002, abs(rMid - 0.148));",
    "    float cageMask = clamp(threeArms + cageRing, 0.0, 1.0);",
    "    vec3 tiCol = mix(vec3(0.22, 0.25, 0.30), vec3(0.94, 0.97, 1.0), 0.4 + 0.6 * abs(cos(kAng * 3.0 + t)));",
    "    col = mix(col, tiCol, cageMask);",
    "  }",
    "",
    "  // 3. PLANE 3 (z = +0.02): Upright Specimen Coin Medallion Hub & Synthetic Ruby Jewel Bearing",
    "  if(r < 0.088){",
    "    if(r > 0.075){",
    "      float knurl = 0.5 + 0.5 * cos(atan(cPos.y, cPos.x) * 64.0);",
    "      col = mix(vec3(0.30, 0.18, 0.05), vec3(1.0, 0.82, 0.38), knurl);",
    "    } else {",
    "      vec2 coinUV = cPos / 0.150 + 0.5;",
    "      vec2 txCoinUV = vec2(mix(0.25, 0.75, clamp(coinUV.x, 0.0, 1.0)), mix(0.48, 0.98, clamp(coinUV.y, 0.0, 1.0)));",
    "      vec4 cS = texture2D(TX, txCoinUV);",
    "      float cLum = dot(cS.rgb, vec3(0.299, 0.587, 0.114));",
    "      float cR = dot(texture2D(TX, txCoinUV + vec2(0.0025, 0.0)).rgb, vec3(0.333));",
    "      float cU = dot(texture2D(TX, txCoinUV + vec2(0.0, 0.0025)).rgb, vec3(0.333));",
    "      vec3 cN = normalize(vec3((cLum - cR) * 7.0, (cLum - cU) * 7.0, 1.0));",
    "      float cDiff = max(dot(cN, Lkey), 0.0);",
    "      float cSpec = pow(max(dot(cN, normalize(V + Lkey)), 0.0), 56.0);",
    "      vec3 dialMetal = mix(vec3(0.22, 0.16, 0.06), vec3(0.98, 0.84, 0.44), 0.25 + 0.75 * cLum);",
    "      col = dialMetal * (0.32 + 0.78 * cDiff) + vec3(1.0, 0.95, 0.75) * cSpec;",
    "    }",
    "  }",
    "",
    "  // 4. PLANE 4 (z = +0.08): Chamfered Upper Sapphire Crystal Bridge with IOR Chromatic Dispersion & Blued Screws",
    "  vec2 bBox = abs(cPos) - vec2(0.235, 0.030);",
    "  float dBridge = length(max(bBox, 0.0)) + min(max(bBox.x, bBox.y), 0.0);",
    "  // Keep center circular cut-out open over the specimen coin so coin reads unobstructed!",
    "  float centerOpening = 0.082 - r;",
    "  float dSapphire = max(dBridge, centerOpening);",
    "  if(dSapphire < 0.006){",
    "    float bevel = smoothstep(0.006, -0.006, dSapphire) * smoothstep(-0.018, -0.005, dSapphire);",
    "    vec2 bNorm2D = normalize(cPos + vec2(1e-5));",
    "    // Chromatic IOR dispersion across the beveled sapphire crystal edge",
    "    vec3 refrTint = vec3(0.86, 0.93, 1.02) + vec3(0.18, 0.04, -0.12) * bevel * bNorm2D.x;",
    "    float sweepBar = exp(-pow((cPos.x - sin(t * 0.55) * 0.22) * 14.0, 2.0));",
    "    float fres = 0.18 + 0.82 * bevel;",
    "    col = col * refrTint * (0.88 - 0.18 * bevel) + vec3(0.92, 0.96, 1.0) * (bevel * 0.55 + sweepBar * 0.38 * fres);",
    "    // Two heat-blued steel retaining screws + synthetic ruby jewels at x = +-0.195",
    "    vec2 sPos = vec2(abs(cPos.x) - 0.195, cPos.y);",
    "    float sRad = length(sPos);",
    "    if(sRad < 0.019){",
    "      float slot = smoothstep(0.0035, 0.001, abs(sPos.x * 0.7 + sPos.y * 0.7));",
    "      vec3 bluedSteel = mix(vec3(0.04, 0.14, 0.48), vec3(0.22, 0.58, 0.98), 0.5 + 0.5 * sPos.y / 0.019);",
    "      col = mix(bluedSteel, vec3(0.02, 0.04, 0.12), slot);",
    "    }",
    "  }",
    "  // Crimson Corundum Ruby Jewel Pivot glints at left/right bridge settings (x = +-0.135)",
    "  vec2 jPos = vec2(abs(cPos.x) - 0.135, cPos.y);",
    "  float jRad = length(jPos);",
    "  if(jRad < 0.016){",
    "    float rubySSS = exp(-jRad * 95.0) * (1.0 + 0.6 * tickImpulse);",
    "    col = mix(vec3(0.35, 0.02, 0.08), vec3(1.0, 0.14, 0.32), rubySSS) + vec3(1.0, 0.8, 0.85) * smoothstep(0.005, 0.001, length(jPos - vec2(-0.004, 0.004)));",
    "  }",
    "",
    "  // 5. SINGLE SWISS-CHRONOMETER TITLE LANDING IN LOWER THIRD (Act III: t = 8.8s .. 14.0s)",
    "  vec2 tBox = (p - vec2(0.0, -0.315)) / vec2(0.44, 0.165) + 0.5;",
    "  if(tBox.x >= 0.0 && tBox.x <= 1.0 && tBox.y >= 0.0 && tBox.y <= 1.0 && t > 8.6){",
    "    vec2 txUV = vec2(tBox.x, mix(0.02, 0.44, tBox.y));",
    "    vec4 tS = texture2D(TX, txUV);",
    "    float rev = smoothstep(8.8, 10.2, t);",
    "    float glyph = smoothstep(0.18, 0.68, tS.b) * rev;",
    "    float shadow = smoothstep(0.04, 0.48, tS.b) * rev;",
    "    col *= (1.0 - 0.65 * shadow * (1.0 - glyph));",
    "    vec3 dialTitle = mix(vec3(0.84, 0.88, 0.95), vec3(1.0, 0.86, 0.52), smoothstep(0.35, 0.65, tBox.y));",
    "    col = mix(col, dialTitle, glyph);",
    "  }",
    "",
    "  col *= (1.0 - 0.34 * smoothstep(0.40, 1.02, length(p * vec2(1.0 / max(A, 0.52) * 0.82, 1.0))));",
    "  col *= smoothstep(0.0, 0.75, t);",
    "  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function buildTourbillonAtlas(C) {
    var W = 1024, H = 1024, c = K.mk(W, H), g = c.getContext("2d");
    g.fillStyle = "#000000"; g.fillRect(0, 0, W, H);
    var cx = W / 2, cy = 276, rad = 240;
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.clip();
    if (C && C.coin && C.coin.width > 0) {
      var m = Math.min(C.coin.width, C.coin.height);
      g.drawImage(C.coin, (C.coin.width - m) / 2, (C.coin.height - m) / 2, m, m, cx - rad, cy - rad, rad * 2, rad * 2);
    } else {
      g.fillStyle = "#c99e48"; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    g.restore();

    function drawTextPass(col, blur) {
      g.save();
      if (blur > 0) { g.shadowColor = col; g.shadowBlur = blur; }
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.moveTo(110, 604); g.lineTo(914, 604); g.moveTo(110, 968); g.lineTo(914, 968); g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "600 34px Georgia, serif"; g.fillText("COAXIAL ESCAPEMENT \u00b7 28,800 VPH CHRONOMETER", W / 2, 650);
      g.font = "700 120px Georgia, serif"; g.fillText("TITAN", W / 2, 756);
      g.font = "700 76px Georgia, serif"; g.fillText("RELIQUARY", W / 2, 852);
      g.font = "italic 500 36px Georgia, serif"; g.fillText("sapphire bridge \u00b7 cotes de geneve \u00b7 corundum ruby", W / 2, 926);
      g.restore();
    }
    drawTextPass("rgb(0, 0, 170)", 12);
    g.globalCompositeOperation = "lighter";
    drawTextPass("rgb(0, 0, 255)", 0);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  function lay(W, H) {
    var A = W / H, port = A < 1;
    var w = port ? A * 0.88 : Math.min(0.76, A * 0.44);
    var tierLv = (window.TitanIntro && window.TitanIntro.tierLevel) ? window.TitanIntro.tierLevel() : 2.0;
    return port ? { hs: [w / 2, w * 0.24], cy: -0.315, u1: [0.06, 0.32, tierLv, 1.0] }
                : { hs: [w / 2, w * 0.22], cy: -0.28, u1: [0.14, 0.10, tierLv, 0.0] };
  }

  I.reg("tourbillon", {
    dur: 14.0, still: 11.2,
    init: function (C) {
      C.L = I.gl(C, FRAG);
      if (C.L) C.L.tex(buildTourbillonAtlas(C));
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, Ly = lay(W, H);
      g.clearRect(0, 0, W, H);
      if (C.L && !C._glLost && C.L.draw(t, [Ly.hs[0], Ly.hs[1], 1.0, Ly.cy], Ly.u1)) return;
      g.fillStyle = "#080a10"; g.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H * 0.38, R = Math.min(W, H) * 0.30;
      g.strokeStyle = "#8896b0"; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      if (C.coin && C.coin.width > 0) {
        var rC = R * 0.34;
        g.save(); g.beginPath(); g.arc(cx, cy, rC, 0, Math.PI * 2); g.clip();
        g.drawImage(C.coin, cx - rC, cy - rC, rC * 2, rC * 2); g.restore();
      }
      if (t > 8.6) {
        g.globalAlpha = K.seg(t, 8.8, 10.2);
        g.fillStyle = "#eae6da"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "700 " + Math.round(H * 0.036) + "px Georgia, serif";
        g.fillText("TITAN RELIQUARY", cx, H * 0.80);
        g.globalAlpha = 1;
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return null;
      ["clock", "clank", "bowl"].forEach(function (n) { I.warm(A.ctx, n); });
      I.cut(A, "clock", 0.02, [0, 9.2], 1.0, 0.42, 0.3, 3800);
      I.cut(A, "clock", 4.50, [0, 4.6], 2.0, 0.24, 0.2, 4200);
      I.cut(A, "clank", 3.80, [2.2, 0.5], 1.35, 0.28, 0.12, 3200);
      I.cut(A, "clank", 9.00, [2.2, 0.6], 1.15, 0.38, 0.15, 3000);
      I.cut(A, "bowl", 9.02, [0.0, 4.6], 1.25, 0.26, 1.4, 3400);
      return A.stop;
    }
  });
})();


/* Titan Reliquary — Silverscreen (v8 Bespoke Portrait-First 35mm Nitrate Emulsion & Carbon-Arc Gate Edition)
   Hero Prop: 35mm Nitrate Celluloid Film Strip inside a machined steel projector gate, illuminated by a diagonal
              volumetric carbon-arc beam through silver-halide dust.
   Material Craft: Zero flat JPEG zoom. Instead, photochemical silver-halide (AgBr) crystal reduction develops the
                   3D metallic relief of the upright coin inside the wet gelatin emulsion, complete with authentic
                   24fps Maltese-cross gate weave, Bell & Howell sprocket perforations, optical soundtrack, and edge halation.
   Runtime: 14.0s timed 3-act sequence.
   Audio: Real recorded optical crackle, transformer hum & intermittent sprocket cadence (vinyl.m4a, labHum.m4a, clock.webm, clank.m4a). */
(function () {
  "use strict";
  var I = window.TitanIntro;
  if (!I) return;
  var K = I.K;

  var FRAG = [
    "precision highp float;",
    "// [SILVERSCREEN-V8-UNIQUE-SHADER-04] 35mm Nitrate Gate, Silver-Halide Emulsion Reduction & Volumetric Arc Beam",
    "uniform vec2 R;",
    "uniform float T;",
    "uniform vec4 U0, U1;",
    "uniform sampler2D TX;",
    "",
    "float halideGrain(vec2 p, float seed){",
    "  vec2 u = floor(p), f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float n = dot(u, vec2(12.9898, 78.233)) + seed * 43.17;",
    "  vec4 h = fract(sin(vec4(n, n + 12.9898, n + 78.233, n + 91.2228)) * 43758.5453);",
    "  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5 * R) / R.y;",
    "  float A = R.x / R.y, t = T;",
    "  float tierLv = U1.z;",
    "",
    "  // 24fps Maltese-Cross Intermittent Gate Weave & Twin-Blade Rotary Shutter Flicker",
    "  float frameIdx = floor(t * 24.0);",
    "  float shutter = 0.88 + 0.12 * cos(t * 48.0 * 3.14159);",
    "  vec2 gateWeave = vec2(",
    "    (fract(sin(frameIdx * 91.3) * 43758.5) - 0.5) * 0.0022,",
    "    (fract(cos(frameIdx * 57.1) * 31947.2) - 0.5) * 0.0028",
    "  );",
    "  // Initial film transport pull-down in Act I (0..3.4s) before locking into registration pins",
    "  float transportY = (1.0 - smoothstep(0.0, 3.4, t)) * 0.55;",
    "",
    "  // 3D Perspective Tilt of the 35mm Steel Projector Gate",
    "  float tilt = mix(0.22, 0.06, smoothstep(0.0, 8.8, t));",
    "  float persp = 1.0 - p.x * tilt * 0.45 + p.y * tilt * 0.25;",
    "  vec2 gPos = (p / max(0.65, persp)) - vec2(0.0, 0.12) + gateWeave;",
    "",
    "  // 1. DARK PROJECTION BOOTH & VOLUMETRIC CARBON-ARC BEAM",
    "  // Diagonal beam from upper-left projection port (-0.32, 0.48) across the stage",
    "  vec2 beamOrigin = vec2(-0.32, 0.48);",
    "  vec2 beamVec = p - beamOrigin;",
    "  vec2 beamDir = normalize(vec2(0.55, -0.83));",
    "  float alongBeam = max(0.0, dot(beamVec, beamDir));",
    "  float perpBeam = length(beamVec - beamDir * alongBeam);",
    "  float coneWidth = 0.08 + alongBeam * 0.34;",
    "  float arcCone = exp(-pow(perpBeam / coneWidth, 2.0) * 2.2) * exp(-alongBeam * 0.65) * shutter;",
    "  vec3 col = vec3(0.010, 0.010, 0.013) + vec3(0.95, 0.88, 0.74) * arcCone * 0.28;",
    "",
    "  // 2. 35MM NITRATE CELLULOID FILM STRIP & MACHINED STEEL GATE (|gPos.x| < 0.225, |gPos.y| < 0.265)",
    "  if(abs(gPos.x) < 0.235 && abs(gPos.y) < 0.275){",
    "    vec2 fPos = vec2(gPos.x, gPos.y + transportY);",
    "    // Outer Machined Steel Gate Rails (|gPos.x| > 0.205)",
    "    if(abs(gPos.x) > 0.205){",
    "      float brushed = 0.5 + 0.5 * sin(gPos.y * 380.0);",
    "      col = mix(vec3(0.08, 0.09, 0.11), vec3(0.28, 0.30, 0.34), brushed) * shutter;",
    "    } else {",
    "      // Inside the 35mm Celluloid Strip (|gPos.x| <= 0.205)",
    "      vec3 nitrateBase = vec3(0.04, 0.035, 0.028);",
    "      // Bell & Howell Sprocket Perforations along left & right margins (|gPos.x| in 0.158..0.192)",
    "      float perfY = mod(fPos.y + 0.032, 0.064) - 0.032;",
    "      vec2 perfBox = abs(vec2(abs(gPos.x) - 0.175, perfY)) - vec2(0.013, 0.010);",
    "      float dPerf = length(max(perfBox, 0.0)) + min(max(perfBox.x, perfBox.y), 0.0);",
    "      float isHole = smoothstep(0.002, -0.002, dPerf);",
    "      // Edge-code halation around sprocket holes",
    "      float perfHalation = exp(-max(0.0, dPerf) * 140.0) * 0.45;",
    "      // Optical Variable-Area Soundtrack Waveform along left strip (gPos.x in -0.148..-0.126)",
    "      float inSoundtrack = step(-0.148, gPos.x) * step(gPos.x, -0.126);",
    "      float waveAmp = 0.008 * (0.5 + 0.5 * sin(fPos.y * 85.0 + t * 12.0) * cos(fPos.y * 210.0));",
    "      float opticalWave = smoothstep(waveAmp, waveAmp * 0.2, abs(gPos.x + 0.137)) * inSoundtrack;",
    "",
    "      // Central 35mm Academy Aperture Frame (gPos.x in -0.118..+0.148, |gPos.y| < 0.215)",
    "      if(gPos.x > -0.118 && gPos.x < 0.148 && abs(gPos.y) < 0.215){",
    "        vec2 aPos = gPos - vec2(0.015, 0.0);",
    "        float aRad = length(aPos);",
    "        // Photochemical Silver-Halide (AgBr -> Ag0) Development Wave (Act II: t = 3.2s .. 8.6s)",
    "        float devProgress = smoothstep(2.8, 8.4, t);",
    "        float grainFine = halideGrain(aPos * 320.0, frameIdx);",
    "        float grainCoarse = halideGrain(aPos * 85.0, 1.0);",
    "",
    "        // Sample Upright Specimen Coin Relief inside the 35mm Aperture",
    "        vec2 coinUV = aPos / 0.230 + 0.5;",
    "        vec2 txCoinUV = vec2(mix(0.25, 0.75, clamp(coinUV.x, 0.0, 1.0)), mix(0.48, 0.98, clamp(coinUV.y, 0.0, 1.0)));",
    "        vec4 cS = texture2D(TX, txCoinUV);",
    "        float cLum = dot(cS.rgb, vec3(0.299, 0.587, 0.114));",
    "        float cR = dot(texture2D(TX, txCoinUV + vec2(0.0028, 0.0)).rgb, vec3(0.333));",
    "        float cU = dot(texture2D(TX, txCoinUV + vec2(0.0, 0.0028)).rgb, vec3(0.333));",
    "        // 3D Gel-Emulsion Swell Normal (silver density physically raises the wet gelatin relief!)",
    "        vec3 eN = normalize(vec3((cLum - cR) * 8.5, (cLum - cU) * 8.5, 1.0));",
    "        vec3 Larc = normalize(vec3(-0.35 + 0.45 * sin(t * 0.48), 0.55, 0.75));",
    "        vec3 V = normalize(vec3(-p.x * 0.5, -p.y * 0.5, 1.0));",
    "        float diff = max(dot(eN, Larc), 0.0);",
    "        float spec = pow(max(dot(eN, normalize(V + Larc)), 0.0), 64.0);",
    "",
    "        // Photochemical Reduction: Highlights crystallize first out of the silver-halide emulsion!",
    "        float devThreshold = smoothstep(1.05 - devProgress * 1.25, 1.20 - devProgress * 1.25, cLum + grainCoarse * 0.22 - aRad * 0.6);",
    "        float devEdge = exp(-abs((cLum - (1.0 - devProgress)) * 6.5)) * smoothstep(2.8, 4.0, t) * smoothstep(8.8, 7.2, t);",
    "        float inCoinDisc = smoothstep(0.118, 0.112, aRad);",
    "",
    "        // Molten Silver-Gelatin Tone + Warm Amber Halation Bloom on high-contrast silver edges",
    "        vec3 rawEmulsion = vec3(0.05, 0.045, 0.038) + vec3(0.12, 0.10, 0.08) * grainCoarse;",
    "        vec3 reducedSilver = mix(vec3(0.14, 0.13, 0.12), vec3(0.96, 0.94, 0.88), cLum * (0.35 + 0.75 * diff)) + vec3(1.0, 0.97, 0.90) * spec * 1.15;",
    "        reducedSilver += vec3(0.95, 0.62, 0.24) * devEdge * 0.65; // Warm photochemical reduction front",
    "        vec3 frameImg = mix(rawEmulsion, reducedSilver, devThreshold * inCoinDisc);",
    "        // Subtle vertical nitrate emulsion scratch",
    "        float scratch = smoothstep(0.0012, 0.0002, abs(aPos.x - 0.062 + 0.003 * sin(frameIdx))) * step(0.65, fract(sin(frameIdx * 17.3) * 99.1));",
    "        frameImg += vec3(0.55, 0.50, 0.42) * scratch * 0.45;",
    "        frameImg *= (0.92 + 0.16 * grainFine) * shutter;",
    "        col = frameImg;",
    "      } else {",
    "        col = mix(nitrateBase, vec3(0.95, 0.85, 0.65), opticalWave * 0.85);",
    "        col += vec3(0.92, 0.55, 0.20) * perfHalation;",
    "        col = mix(col, vec3(0.012, 0.012, 0.016) + vec3(0.85, 0.78, 0.65) * arcCone * 0.5, isHole);",
    "      }",
    "    }",
    "  }",
    "",
    "  // 3. VOLUMETRIC SILVER-HALIDE DUST MOTES DRIFTING IN THE CARBON-ARC BEAM",
    "  if(tierLv >= 1.0){",
    "    int nDust = tierLv >= 3.0 ? 12 : 7;",
    "    for(int i = 0; i < 12; i++){",
    "      if(i >= nDust) break;",
    "      float fi = float(i);",
    "      float dSeed = fract(sin(fi * 61.7) * 29841.5);",
    "      vec2 dPos = vec2(mod(dSeed + t * (0.04 + 0.008 * fi), 0.76) - 0.38,",
    "                       mod(fract(dSeed * 7.3) + t * (0.05 + 0.01 * fi), 0.88) - 0.36);",
    "      float rad = 0.004 + 0.006 * fract(dSeed * 13.1);",
    "      float bokeh = smoothstep(rad, rad * 0.3, length(p - dPos)) * (0.4 + 0.6 * smoothstep(rad * 0.4, rad * 0.85, length(p - dPos)));",
    "      col += vec3(1.0, 0.92, 0.76) * bokeh * arcCone * 0.85;",
    "    }",
    "  }",
    "",
    "  // 4. SINGLE NITRATE TITLE-CARD LANDING IN LOWER THIRD (Act III: t = 8.8s .. 14.0s)",
    "  vec2 tBox = (p - vec2(0.0, -0.315)) / vec2(0.44, 0.165) + 0.5;",
    "  if(tBox.x >= 0.0 && tBox.x <= 1.0 && tBox.y >= 0.0 && tBox.y <= 1.0 && t > 8.6){",
    "    vec2 txUV = vec2(tBox.x, mix(0.02, 0.44, tBox.y));",
    "    vec4 tS = texture2D(TX, txUV);",
    "    float rev = smoothstep(8.8, 10.2, t);",
    "    float glyph = smoothstep(0.18, 0.68, tS.b) * rev;",
    "    float halation = smoothstep(0.02, 0.52, tS.b) * rev;",
    "    col *= (1.0 - 0.55 * halation * (1.0 - glyph));",
    "    col += vec3(0.95, 0.68, 0.32) * halation * 0.22;",
    "    col = mix(col, vec3(0.98, 0.95, 0.88) * shutter, glyph);",
    "  }",
    "",
    "  col *= (1.0 - 0.36 * smoothstep(0.38, 1.02, length(p * vec2(1.0 / max(A, 0.52) * 0.82, 1.0))));",
    "  col *= smoothstep(0.0, 0.75, t);",
    "  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function buildSilverscreenAtlas(C) {
    var W = 1024, H = 1024, c = K.mk(W, H), g = c.getContext("2d");
    g.fillStyle = "#000000"; g.fillRect(0, 0, W, H);
    var cx = W / 2, cy = 276, rad = 240;
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.clip();
    if (C && C.coin && C.coin.width > 0) {
      var m = Math.min(C.coin.width, C.coin.height);
      g.drawImage(C.coin, (C.coin.width - m) / 2, (C.coin.height - m) / 2, m, m, cx - rad, cy - rad, rad * 2, rad * 2);
    } else {
      g.fillStyle = "#d8d4c8"; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    g.restore();

    function drawTextPass(col, blur) {
      g.save();
      if (blur > 0) { g.shadowColor = col; g.shadowBlur = blur; }
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.moveTo(110, 604); g.lineTo(914, 604); g.moveTo(110, 968); g.lineTo(914, 968); g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "600 34px Georgia, serif"; g.fillText("35MM NITRATE GATE \u00b7 SILVER HALIDE EMULSION", W / 2, 650);
      g.font = "700 120px Georgia, serif"; g.fillText("TITAN", W / 2, 756);
      g.font = "700 76px Georgia, serif"; g.fillText("RELIQUARY", W / 2, 852);
      g.font = "italic 500 36px Georgia, serif"; g.fillText("photochemical silver \u00b7 gate weave \u00b7 carbon arc", W / 2, 926);
      g.restore();
    }
    drawTextPass("rgb(0, 0, 170)", 14);
    g.globalCompositeOperation = "lighter";
    drawTextPass("rgb(0, 0, 255)", 0);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  function lay(W, H) {
    var A = W / H, port = A < 1;
    var w = port ? A * 0.88 : Math.min(0.76, A * 0.44);
    var tierLv = (window.TitanIntro && window.TitanIntro.tierLevel) ? window.TitanIntro.tierLevel() : 2.0;
    return port ? { hs: [w / 2, w * 0.24], cy: -0.315, u1: [0.06, 0.32, tierLv, 1.0] }
                : { hs: [w / 2, w * 0.22], cy: -0.28, u1: [0.14, 0.10, tierLv, 0.0] };
  }

  I.reg("silverscreen", {
    dur: 14.0, still: 11.2,
    init: function (C) {
      C.L = I.gl(C, FRAG);
      if (C.L) C.L.tex(buildSilverscreenAtlas(C));
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, Ly = lay(W, H);
      g.clearRect(0, 0, W, H);
      if (C.L && !C._glLost && C.L.draw(t, [Ly.hs[0], Ly.hs[1], 1.0, Ly.cy], Ly.u1)) return;
      g.fillStyle = "#0a0908"; g.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H * 0.38, R = Math.min(W, H) * 0.28;
      g.strokeStyle = "#d8d0c0"; g.lineWidth = 4; g.strokeRect(cx - R, cy - R, R * 2, R * 2);
      if (C.coin && C.coin.width > 0) {
        var rC = R * 0.65;
        g.save(); g.beginPath(); g.arc(cx, cy, rC, 0, Math.PI * 2); g.clip();
        g.drawImage(C.coin, cx - rC, cy - rC, rC * 2, rC * 2); g.restore();
      }
      if (t > 8.6) {
        g.globalAlpha = K.seg(t, 8.8, 10.2);
        g.fillStyle = "#f5f2eb"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "700 " + Math.round(H * 0.036) + "px Georgia, serif";
        g.fillText("TITAN RELIQUARY", cx, H * 0.80);
        g.globalAlpha = 1;
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return null;
      ["vinyl", "labHum", "clock", "clank"].forEach(function (n) { I.warm(A.ctx, n); });
      I.cut(A, "vinyl", 0.02, [0, 13.8], 1.0, 0.34, 1.4, 3400);
      I.cut(A, "labHum", 0.05, [0, 13.6], 0.92, 0.24, 1.4, 900);
      I.cut(A, "clock", 0.10, [0, 8.8], 1.5, 0.18, 0.4, 2600);
      I.cut(A, "clank", 3.40, [2.2, 0.5], 1.05, 0.32, 0.15, 2400);
      return A.stop;
    }
  });
})();


/* Titan Reliquary — Abyss (v8 Bespoke Portrait-First 3D Hadal Trench Bathysphere & Bioluminescent Plume Edition)
   Hero Prop: 10,920m Hadal Trench — looking through a thick condensation-beaded borosilicate bathysphere viewport
              into a turbulent GPU curl-advected hydrothermal black-smoker plume, 3D depth-layered bioluminescent
              siphonophore filaments, and a sweeping 6500K xenon searchlight discovering a sunken gold relic on basalt pillow lava.
   Runtime: 14.0s timed 3-act sequence.
   Audio: Real recorded deep-water hydrophone pressure ambience, condensation drips, hull compression creak & sonar ping
          (underwater.webm, drips.webm, creak.m4a, bowl.m4a). */
(function () {
  "use strict";
  var I = window.TitanIntro;
  if (!I) return;
  var K = I.K;

  var FRAG = [
    "precision highp float;",
    "// [ABYSS-V8-UNIQUE-SHADER-05] Hadal Bathysphere Viewport, Curl-Advected Hydrothermal Plume & Bioluminescence",
    "uniform vec2 R;",
    "uniform float T;",
    "uniform vec4 U0, U1;",
    "uniform sampler2D TX;",
    "",
    "float hadalNoise(vec2 p){",
    "  vec2 i = floor(p), f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  float n = i.x + i.y * 113.0;",
    "  vec4 v = fract(sin(vec4(n, n + 1.0, n + 113.0, n + 114.0)) * 37915.41);",
    "  return mix(mix(v.x, v.y, u.x), mix(v.z, v.w, u.x), u.y);",
    "}",
    "// Curl-Advected Hydrothermal Black-Smoker Fluid Density",
    "float hydrothermalPlume(vec2 p, float t, float tierLv){",
    "  vec2 q = p * vec2(4.2, 2.8) - vec2(0.0, t * 0.42);",
    "  float n1 = hadalNoise(q);",
    "  vec2 curl = vec2(hadalNoise(q + vec2(0.0, 0.35)) - n1, n1 - hadalNoise(q + vec2(0.35, 0.0)));",
    "  q += curl * 1.45;",
    "  float d = 0.55 * hadalNoise(q);",
    "  if(tierLv >= 1.0){",
    "    d += 0.30 * hadalNoise(q * 2.15 - vec2(t * 0.2, t * 0.65));",
    "    if(tierLv >= 2.0) d += 0.15 * hadalNoise(q * 4.4 + curl * 2.2);",
    "  }",
    "  float cone = smoothstep(0.28 + (p.y + 0.25) * 0.22, 0.02, abs(p.x + 0.08 * sin(p.y * 5.0 - t * 0.8)));",
    "  return d * cone * smoothstep(-0.35, -0.05, p.y);",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5 * R) / R.y;",
    "  float A = R.x / R.y, t = T;",
    "  float tierLv = U1.z;",
    "",
    "  // 1. BOROSILICATE BATHYSPHERE VIEWPORT REFRACTION & CONDENSATION DROPLETS",
    "  vec2 vCenter = vec2(0.0, 0.115);",
    "  vec2 vRel = p - vCenter;",
    "  float vRad = length(vRel);",
    "  // Thick conical viewport glass edge refraction near r = 0.28..0.33",
    "  float glassBevel = smoothstep(0.24, 0.32, vRad) * smoothstep(0.35, 0.31, vRad);",
    "  // Micro-condensation water droplets on inner viewport glass",
    "  vec2 dropCell = floor(p * 42.0);",
    "  vec2 dropLocal = fract(p * 42.0) - 0.5;",
    "  float dropSeed = fract(sin(dot(dropCell, vec2(93.1, 217.7))) * 41293.5);",
    "  float dropMask = smoothstep(0.32, 0.08, length(dropLocal)) * step(0.72, dropSeed) * smoothstep(0.18, 0.31, vRad);",
    "  vec2 q = p + normalize(vRel + vec2(1e-5)) * glassBevel * 0.028 + dropLocal * dropMask * 0.015;",
    "",
    "  // 2. HADAL WATER COLUMN & VOLUMETRIC 6500K XENON SEARCHLIGHT SWEEP",
    "  vec3 col = mix(vec3(0.004, 0.012, 0.022), vec3(0.008, 0.032, 0.052), clamp(0.5 + p.y, 0.0, 1.0));",
    "  // Searchlight sweeps across the trench in Act II (t = 3.6s .. 9.0s) and locks onto the sunken relic at (0.0, 0.05)",
    "  float sweepX = mix(-0.24, 0.0, smoothstep(3.2, 7.8, t)) + 0.03 * sin(t * 0.6) * (1.0 - smoothstep(7.5, 9.5, t));",
    "  vec2 beamTarget = vec2(sweepX, 0.055);",
    "  vec2 beamOrigin = vec2(0.24, 0.44);",
    "  vec2 bVec = q - beamOrigin;",
    "  vec2 bDir = normalize(beamTarget - beamOrigin);",
    "  float bAlong = max(0.0, dot(bVec, bDir));",
    "  float bPerp = length(bVec - bDir * bAlong);",
    "  float xenonBeam = exp(-pow(bPerp / (0.045 + bAlong * 0.24), 2.0) * 2.4) * smoothstep(1.2, 4.5, t);",
    "",
    "  // 3. CURL-ADVECTED HYDROTHERMAL BLACK-SMOKER PLUME",
    "  float smoke = hydrothermalPlume(q - vec2(-0.06, 0.08), t, tierLv);",
    "  // Geothermal orange-red vent glow at the base of the plume + xenon scattering",
    "  float ventGlow = exp(-length(q - vec2(-0.06, -0.08)) * 7.5);",
    "  vec3 plumeCol = vec3(0.02, 0.04, 0.06) + vec3(0.88, 0.28, 0.05) * ventGlow * 0.75 + vec3(0.35, 0.82, 0.96) * xenonBeam * 0.65;",
    "  col = mix(col, plumeCol, clamp(smoke * 1.35, 0.0, 0.88));",
    "  col += vec3(0.22, 0.72, 0.92) * xenonBeam * 0.32;",
    "",
    "  // 4. SUNKEN GOLD RELIC MEDALLION ENCRUSTED IN BASALT PILLOW LAVA (cRel = q - (0.0, 0.055))",
    "  vec2 cRel = q - vec2(0.0, 0.055);",
    "  float rRelic = length(cRel);",
    "  // Basalt sea-floor outcrop cradle around the relic",
    "  float cradle = smoothstep(0.18, 0.08, length(cRel * vec2(0.85, 1.35) - vec2(0.0, -0.02)));",
    "  if(cradle > 0.01){",
    "    float lavaTex = hadalNoise(q * 36.0);",
    "    vec3 basaltCol = vec3(0.015, 0.028, 0.038) + vec3(0.12, 0.28, 0.34) * lavaTex * xenonBeam;",
    "    col = mix(col, basaltCol, cradle * 0.85);",
    "  }",
    "  if(rRelic < 0.088){",
    "    float spotIllum = 0.22 + 1.15 * xenonBeam;",
    "    if(rRelic > 0.075){",
    "      float barnacle = hadalNoise(cRel * 85.0);",
    "      vec3 bezelCol = mix(vec3(0.08, 0.22, 0.20), vec3(0.92, 0.74, 0.28), smoothstep(0.35, 0.75, barnacle)) * spotIllum;",
    "      col = bezelCol;",
    "    } else {",
    "      vec2 coinUV = cRel / 0.150 + 0.5;",
    "      vec2 txCoinUV = vec2(mix(0.25, 0.75, clamp(coinUV.x, 0.0, 1.0)), mix(0.48, 0.98, clamp(coinUV.y, 0.0, 1.0)));",
    "      vec4 cS = texture2D(TX, txCoinUV);",
    "      float cLum = dot(cS.rgb, vec3(0.299, 0.587, 0.114));",
    "      float cR = dot(texture2D(TX, txCoinUV + vec2(0.0025, 0.0)).rgb, vec3(0.333));",
    "      float cU = dot(texture2D(TX, txCoinUV + vec2(0.0, 0.0025)).rgb, vec3(0.333));",
    "      vec3 cN = normalize(vec3((cLum - cR) * 7.5, (cLum - cU) * 7.5, 1.0));",
    "      vec3 Lxenon = normalize(vec3(0.35 - sweepX, 0.58, 0.72));",
    "      vec3 V = normalize(vec3(-p.x * 0.5, -p.y * 0.5, 1.0));",
    "      float cDiff = max(dot(cN, Lxenon), 0.0);",
    "      float cSpec = pow(max(dot(cN, normalize(V + Lxenon)), 0.0), 54.0);",
    "      vec3 sunkenGold = mix(vec3(0.10, 0.24, 0.22), vec3(0.98, 0.82, 0.36), 0.28 + 0.72 * cLum);",
    "      col = sunkenGold * (0.20 + 0.90 * cDiff * spotIllum) + vec3(0.75, 0.98, 1.0) * cSpec * spotIllum;",
    "    }",
    "  }",
    "",
    "  // 5. 3D DEPTH-LAYERED BIOLUMINESCENT SIPHONOPHORE FILAMENTS & MARINE SNOW",
    "  if(tierLv >= 1.0){",
    "    int nBio = tierLv >= 3.0 ? 14 : 8;",
    "    for(int i = 0; i < 14; i++){",
    "      if(i >= nBio) break;",
    "      float fi = float(i);",
    "      float zDepth = 0.5 + 0.18 * mod(fi, 5.0);",
    "      float bSeed = fract(sin(fi * 83.7) * 31984.3);",
    "      vec2 bPos = vec2(",
    "        sin(fi * 2.4 + t * (0.22 + 0.02 * fi)) * (0.24 / zDepth),",
    "        mod(bSeed + t * (0.06 + 0.012 * fi), 0.72) - 0.24",
    "      );",
    "      float pulse = 0.45 + 0.55 * sin(t * 4.2 + fi * 1.9);",
    "      float glow = exp(-length(p - bPos) * (160.0 * zDepth)) * pulse;",
    "      vec3 bioHue = mix(vec3(0.08, 0.92, 0.85), vec3(0.28, 0.52, 1.0), mod(fi, 2.0));",
    "      col += bioHue * glow * 0.62;",
    "    }",
    "  }",
    "",
    "  // 6. CAST-IRON BATHYSPHERE VIEWPORT BEZEL & BOLTS (vRad in 0.30..0.355)",
    "  if(vRad >= 0.305 && vRad < 0.355){",
    "    float uB = (vRad - 0.305) / 0.050;",
    "    float bolts = smoothstep(0.82, 0.95, cos(atan(vRel.y, vRel.x) * 12.0)) * smoothstep(0.018, 0.004, abs(vRad - 0.330));",
    "    vec3 bezel = mix(vec3(0.02, 0.04, 0.06), vec3(0.14, 0.24, 0.30), sin(uB * 3.14159) + bolts * 0.6);",
    "    col = mix(col, bezel, smoothstep(0.0, 0.15, uB) * smoothstep(1.0, 0.85, uB));",
    "  }",
    "  // Acoustic Sonar Ping Ring at t = 8.8s",
    "  float sonarWave = exp(-abs(vRad - (t - 8.80) * 0.42) * 48.0) * step(8.80, t) * exp(-(t - 8.80) * 1.8);",
    "  col += vec3(0.20, 0.95, 0.88) * sonarWave * 0.55;",
    "",
    "  // 7. SINGLE ABYSSAL TITLE LANDING IN LOWER THIRD (Act III: t = 9.0s .. 14.0s)",
    "  vec2 tBox = (p - vec2(0.0, -0.315)) / vec2(0.44, 0.165) + 0.5;",
    "  if(tBox.x >= 0.0 && tBox.x <= 1.0 && tBox.y >= 0.0 && tBox.y <= 1.0 && t > 8.8){",
    "    vec2 txUV = vec2(tBox.x, mix(0.02, 0.44, tBox.y));",
    "    vec4 tS = texture2D(TX, txUV);",
    "    float rev = smoothstep(9.0, 10.4, t);",
    "    float glyph = smoothstep(0.18, 0.68, tS.b) * rev;",
    "    float halo = smoothstep(0.03, 0.48, tS.b) * rev;",
    "    col *= (1.0 - 0.60 * halo * (1.0 - glyph));",
    "    vec3 bioTitle = mix(vec3(0.52, 0.94, 0.96), vec3(0.95, 0.98, 1.0), 0.5 + 0.5 * sin(tBox.x * 3.14159 + t));",
    "    col = mix(col, bioTitle, glyph);",
    "  }",
    "",
    "  col *= (1.0 - 0.35 * smoothstep(0.40, 1.02, length(p * vec2(1.0 / max(A, 0.52) * 0.82, 1.0))));",
    "  col *= smoothstep(0.0, 0.8, t);",
    "  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function buildAbyssAtlas(C) {
    var W = 1024, H = 1024, c = K.mk(W, H), g = c.getContext("2d");
    g.fillStyle = "#000000"; g.fillRect(0, 0, W, H);
    var cx = W / 2, cy = 276, rad = 240;
    g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.clip();
    if (C && C.coin && C.coin.width > 0) {
      var m = Math.min(C.coin.width, C.coin.height);
      g.drawImage(C.coin, (C.coin.width - m) / 2, (C.coin.height - m) / 2, m, m, cx - rad, cy - rad, rad * 2, rad * 2);
    } else {
      g.fillStyle = "#38a8b8"; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    g.restore();

    function drawTextPass(col, blur) {
      g.save();
      if (blur > 0) { g.shadowColor = col; g.shadowBlur = blur; }
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 3;
      g.beginPath(); g.moveTo(110, 604); g.lineTo(914, 604); g.moveTo(110, 968); g.lineTo(914, 968); g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "600 34px Georgia, serif"; g.fillText("HADAL BATHYSPHERE \u00b7 10,920M HYDROTHERMAL VENT", W / 2, 650);
      g.font = "700 120px Georgia, serif"; g.fillText("TITAN", W / 2, 756);
      g.font = "700 76px Georgia, serif"; g.fillText("RELIQUARY", W / 2, 852);
      g.font = "italic 500 36px Georgia, serif"; g.fillText("borosilicate viewport \u00b7 black smoker \u00b7 bioluminescence", W / 2, 926);
      g.restore();
    }
    drawTextPass("rgb(0, 0, 170)", 12);
    g.globalCompositeOperation = "lighter";
    drawTextPass("rgb(0, 0, 255)", 0);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  function lay(W, H) {
    var A = W / H, port = A < 1;
    var w = port ? A * 0.88 : Math.min(0.76, A * 0.44);
    var tierLv = (window.TitanIntro && window.TitanIntro.tierLevel) ? window.TitanIntro.tierLevel() : 2.0;
    return port ? { hs: [w / 2, w * 0.24], cy: -0.315, u1: [0.06, 0.32, tierLv, 1.0] }
                : { hs: [w / 2, w * 0.22], cy: -0.28, u1: [0.14, 0.10, tierLv, 0.0] };
  }

  I.reg("abyss", {
    dur: 14.0, still: 11.2,
    init: function (C) {
      C.L = I.gl(C, FRAG);
      if (C.L) C.L.tex(buildAbyssAtlas(C));
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, Ly = lay(W, H);
      g.clearRect(0, 0, W, H);
      if (C.L && !C._glLost && C.L.draw(t, [Ly.hs[0], Ly.hs[1], 1.0, Ly.cy], Ly.u1)) return;
      g.fillStyle = "#03111c"; g.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H * 0.38, R = Math.min(W, H) * 0.30;
      g.strokeStyle = "#4fd6e2"; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      if (C.coin && C.coin.width > 0) {
        var rC = R * 0.34;
        g.save(); g.beginPath(); g.arc(cx, cy, rC, 0, Math.PI * 2); g.clip();
        g.drawImage(C.coin, cx - rC, cy - rC, rC * 2, rC * 2); g.restore();
      }
      if (t > 8.8) {
        g.globalAlpha = K.seg(t, 9.0, 10.4);
        g.fillStyle = "#e6f6f8"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "700 " + Math.round(H * 0.036) + "px Georgia, serif";
        g.fillText("TITAN RELIQUARY", cx, H * 0.80);
        g.globalAlpha = 1;
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return null;
      ["underwater", "drips", "creak", "bowl"].forEach(function (n) { I.warm(A.ctx, n); });
      I.cut(A, "underwater", 0.02, [0, 13.8], 1.0, 0.38, 1.5, 1600);
      I.cut(A, "drips", 0.25, [0.5, 13.2], 0.92, 0.22, 1.2, 2400);
      I.cut(A, "creak", 3.60, [0.2, 3.0], 0.82, 0.28, 0.6, 1100);
      I.cut(A, "bowl", 8.80, [0.0, 4.8], 0.68, 0.30, 1.8, 1500);
      return A.stop;
    }
  });
})();


  function wireTitanIntroSpecs() {
    Object.keys(TitanIntro.specs).forEach(function (id) {
      var spec = TitanIntro.specs[id];
      var origStyle = STYLES[id] || STYLES.__crest;
      STYLES[id] = {
        dur: spec.dur || 14.0,
        still: spec.still || 11.2,
        needs: ["coin", "crest"],
        init: function (C) {
          C._glLost = false;
          if (origStyle && origStyle.init && origStyle !== STYLES[id]) { try { origStyle.init(C); } catch (e) {} }
          try { spec.init(C); } catch (e) {}
          try { if (spec.sound) C.__tiStopSound = spec.sound(C); } catch (e) {}
        },
        draw: function (C, t) {
          spec.draw(C, t);
        },
        dispose: function (C) {
          try { if (C.L && C.L.free) C.L.free(); C.L = null; } catch (e) {}
          try { if (C.__tiStopSound) C.__tiStopSound(); C.__tiStopSound = null; } catch (e) {}
        }
      };
    });
  }
  wireTitanIntroSpecs();

  var TitanOpening = window.TitanOpening = {
    choice: choice, set: set, pick: pick, after: after, play: play, switchTo: switchTo, mount: mount, theme: themeId, palette: palette, MODES: MODES.slice(),
    _debug: { K: K, STYLES: STYLES, TitanIntro: TitanIntro }
  };
})();

