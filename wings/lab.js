/* =========================================================================
   Titan Reliquary · Conservation Lab (Wing IV) · Phase-2 photo workspace
   -------------------------------------------------------------------------
   Everything here runs on the device. Images are read with the File API,
   decoded with createImageBitmap/canvas and never uploaded anywhere.
   Quality checks are deterministic image analysis (histograms, Laplacian
   variance, threshold + connected components). There is no OCR and no AI:
   the ser written on Side 2 is NOT read from pixels. Pairing uses the file
   name (if it contains a ser or scan key) or the owner's own pick.

   Mount contract (see renderLab() in app.js):
     #lab-body contains <div id="lab-ws"></div> and <div id="lab-bench"></div>
     window.TitanLab.mount({ openDrawer, showToast, playClick })
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- Protocol constants (agreed Phase-2 spec) ---------- */
  const SPEC = {
    masterCanvas: 2600, // 2x2 master canvas (px)
    masterFlip: 2400,   // flip square warped/scaled to this (px)
    circle: 1200,       // coin circle output (px)
    circleFill: 0.86,   // coin diameter as a fraction of the circle frame
    thumb: 400,         // thumbnail (px)
    label: 800,         // label crop width (px)
  };
  const FLIP_MM = 50.8; // a 2x2 flip is 2 in square
  const ANALYSIS_EDGE = 800; // analysis resolution (long edge, px)
  const DISPLAY_EDGE = 1400; // inspector display resolution (long edge, px)
  const LS_KEY = "tr_lab_session_v1";
  const DB_NAME = "titan-lab";
  const DB_STORE = "blobs";
  const STATUSES = ["Logged", "Photographed", "Verified", "Reshoot"];

  /* ---------- Small utilities ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const LEVEL_RANK = { pass: 0, info: 0, warn: 1, fail: 2 };
  const LEVEL_WORD = { pass: "Pass", warn: "Check", fail: "Reshoot", info: "Note" };

  let H = { openDrawer: null, showToast: null, playClick: null };
  const toast = (m) => { try { (H.showToast || window.showToast || (() => {}))(m); } catch (e) { /* ignore */ } };
  const click = () => { try { H.playClick && H.playClick(); } catch (e) { /* ignore */ } };

  /* ---------- State ---------- */
  // Persisted (small, JSON): image metadata, assignments, checks, coin status.
  let S = { images: {}, order: [], coins: {}, lastCountry: "", selected: "", country: "", target: "" };
  // In-memory only: blobs, object URLs, display canvases.
  const mem = { blobs: new Map(), thumbs: new Map(), display: new Map(), pending: new Set() };
  let storage = { ls: true, idb: true };
  let db = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === "object" && d.images) S = Object.assign(S, d);
      }
    } catch (e) { storage.ls = false; }
  }
  let saveT = 0;
  function saveState() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { storage.ls = false; renderStorageNote(); }
    }, 120);
  }

  /* ---------- IndexedDB (image blobs) ---------- */
  function openDb() {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) { storage.idb = false; return resolve(null); }
        const rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore(DB_STORE); } catch (e) { /* exists */ } };
        rq.onsuccess = () => { db = rq.result; resolve(db); };
        rq.onerror = () => { storage.idb = false; resolve(null); };
        rq.onblocked = () => { storage.idb = false; resolve(null); };
      } catch (e) { storage.idb = false; resolve(null); }
    });
  }
  function idb(mode, fn) {
    return new Promise((resolve) => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(DB_STORE, mode);
        const st = tx.objectStore(DB_STORE);
        const rq = fn(st);
        tx.oncomplete = () => resolve(rq ? rq.result : true);
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  const idbPut = (k, v) => idb("readwrite", (st) => st.put(v, k));
  const idbGet = (k) => idb("readonly", (st) => st.get(k));
  const idbDel = (k) => idb("readwrite", (st) => st.delete(k));
  const idbClear = () => idb("readwrite", (st) => st.clear());

  /* ---------- Vault access ---------- */
  const flips = () => ((window.vault && window.vault.flips) || []).filter((f) => f && f.status !== "Removed");
  let flipIndex = new Map();
  function indexFlips() {
    flipIndex = new Map();
    for (const f of flips()) {
      if (f.scan) flipIndex.set(String(f.scan).toUpperCase(), f);
      if (f.ser) flipIndex.set(String(f.ser).toUpperCase(), f);
    }
  }
  const flipBy = (k) => (k ? flipIndex.get(String(k).toUpperCase()) : null);
  const serOf = (f) => (f && (f.ser || f.scan)) || "";
  const coinLine = (f) => [f.country, f.year, f.denom].filter(Boolean).join(" · ");
  const bySer = (a, b) => String(a.ser || a.scan).localeCompare(String(b.ser || b.scan), undefined, { numeric: true });

  /* =======================================================================
     IMAGE ANALYSIS (deterministic)
     ======================================================================= */
  async function decode(blob) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch (e) {
        try { return await createImageBitmap(blob); } catch (e2) { /* fall through */ }
      }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => { resolve(im); setTimeout(() => URL.revokeObjectURL(url), 1000); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
      im.src = url;
    });
  }
  const srcW = (b) => b.naturalWidth || b.width;
  const srcH = (b) => b.naturalHeight || b.height;
  function scaled(bmp, edge) {
    const w = srcW(bmp), h = srcH(bmp);
    const k = Math.min(1, edge / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high";
    g.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  }
  function lumOf(data) {
    const n = data.length >> 2, L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
    return L;
  }
  function otsu(hist, total) {
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, t = 128;
    for (let i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      const wF = total - wB; if (!wF) break;
      sumB += i * hist[i];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; t = i; }
    }
    return t;
  }
  function median(arr) { if (!arr.length) return 0; const a = Float32Array.from(arr).sort(); return a[a.length >> 1]; }

  /** Largest connected foreground component inside a rectangle. */
  function largestBlob(L, T, W, Hh, rect) {
    const { x0, y0, x1, y1 } = rect;
    const rw = x1 - x0, rh = y1 - y0;
    // background = median of the rectangle's border ring
    const ring = [];
    const bw = Math.max(2, Math.round(Math.min(rw, rh) * 0.03));
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      if (x - x0 < bw || x1 - x <= bw || y - y0 < bw || y1 - y <= bw) ring.push(L[y * W + x]);
    }
    const bg = median(ring);
    // feature = difference from the background level + local texture (engraving)
    const F = new Float32Array(rw * rh);
    const hist = new Uint32Array(256);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const i = (y + y0) * W + x + x0;
      const v = Math.min(255, Math.abs(L[i] - bg) + 2.5 * T[i]);
      F[y * rw + x] = v; hist[v | 0]++;
    }
    let t = otsu(hist, rw * rh);
    if (t < 14) t = 14; // flat, noise-level differences are background
    const mask = new Uint8Array(rw * rh);
    for (let k = 0; k < F.length; k++) mask[k] = F[k] > t ? 1 : 0;
    const hiFg = true;
    const lab = new Int32Array(rw * rh);
    const q = new Int32Array(rw * rh);
    let best = null, id = 0;
    for (let s = 0; s < mask.length; s++) {
      if (!mask[s] || lab[s]) continue;
      id++; let qh = 0, qt = 0; q[qt++] = s; lab[s] = id;
      let n = 0, minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, sx = 0, sy = 0;
      while (qh < qt) {
        const p = q[qh++]; const px = p % rw, py = (p / rw) | 0;
        n++; sx += px; sy += py;
        if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
        if (px > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; q[qt++] = p - 1; }
        if (px < rw - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; q[qt++] = p + 1; }
        if (py > 0 && mask[p - rw] && !lab[p - rw]) { lab[p - rw] = id; q[qt++] = p - rw; }
        if (py < rh - 1 && mask[p + rw] && !lab[p + rw]) { lab[p + rw] = id; q[qt++] = p + rw; }
      }
      if (!best || n > best.n) best = { id, n, minx, miny, maxx, maxy, cx: sx / n, cy: sy / n };
    }
    if (!best) return null;
    // Outer boundary radii from the bbox centre (72 rays): measures roundness.
    const bx = (best.minx + best.maxx) / 2, by = (best.miny + best.maxy) / 2;
    const rays = [];
    const rmax = Math.hypot(rw, rh);
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      let last = 0;
      for (let r = 0; r < rmax; r += 1) {
        const x = Math.round(bx + ca * r), y = Math.round(by + sa * r);
        if (x < 0 || y < 0 || x >= rw || y >= rh) break;
        if (lab[y * rw + x] === best.id) last = r;
      }
      rays.push(last);
    }
    const mean = rays.reduce((a, b) => a + b, 0) / rays.length;
    const sd = Math.sqrt(rays.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rays.length);
    const bbw = best.maxx - best.minx + 1, bbh = best.maxy - best.miny + 1;
    // square vs circle: rays at 45° are ~1.41x the axis rays for a square, ~1x for a circle
    const axis = (rays[0] + rays[18] + rays[36] + rays[54]) / 4;
    const diag = (rays[9] + rays[27] + rays[45] + rays[63]) / 4;
    return {
      n: best.n, bg, t, hiFg, corner: axis ? diag / axis : 1,
      x: best.minx + x0, y: best.miny + y0, w: bbw, h: bbh,
      cx: bx + x0, cy: by + y0, r: mean, cv: mean ? sd / mean : 1,
      aspect: Math.min(bbw, bbh) / Math.max(bbw, bbh),
      fill: best.n / (bbw * bbh),
      touches: best.minx <= 1 || best.miny <= 1 || best.maxx >= rw - 2 || best.maxy >= rh - 2,
      areaFrac: best.n / (rw * rh),
    };
  }

  /** Find the coin (circle) and the flip (square) in analysis-pixel coordinates. */
  function boxBlur(L, W, Hh, r) {
    const tmp = new Float32Array(L.length), out = new Float32Array(L.length);
    for (let y = 0; y < Hh; y++) {
      let acc = 0; const row = y * W;
      for (let x = -r; x <= r; x++) acc += L[row + clamp(x, 0, W - 1)];
      for (let x = 0; x < W; x++) {
        tmp[row + x] = acc / (2 * r + 1);
        acc += L[row + Math.min(W - 1, x + r + 1)] - L[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, Hh - 1) * W + x];
      for (let y = 0; y < Hh; y++) {
        out[y * W + x] = acc / (2 * r + 1);
        acc += tmp[Math.min(Hh - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
    return out;
  }

  function detect(L0, W, Hh) {
    // smooth away engraving/texture so the coin separates from its background as one shape
    const rad = Math.max(2, Math.round(Math.min(W, Hh) * 0.012));
    const L = boxBlur(L0, W, Hh, rad);
    const fine = boxBlur(L0, W, Hh, 1);
    const E = new Float32Array(L0.length);
    for (let i = 0; i < E.length; i++) E[i] = Math.abs(L0[i] - fine[i]);
    const T = boxBlur(E, W, Hh, rad);
    const full = { x0: 0, y0: 0, x1: W, y1: Hh };
    const b = largestBlob(L, T, W, Hh, full);
    const short = Math.min(W, Hh);
    const out = { found: false, kind: "none", coin: null, flip: null, touches: false, cv: 1, aspect: 0 };
    if (!b || b.areaFrac < 0.01) {
      out.coin = { cx: W / 2, cy: Hh / 2, r: short * 0.3 };
      out.flip = { x: W / 2 - short * 0.48, y: Hh / 2 - short * 0.48, s: short * 0.96 };
      return out;
    }
    const squareish = b.aspect > 0.9 && b.corner > 1.25;
    if (squareish) {
      // A flip: look for the coin inside its central window.
      const s = (b.w + b.h) / 2;
      const inset = s * 0.14;
      const rect = { x0: Math.round(b.x + inset), y0: Math.round(b.y + inset), x1: Math.round(b.x + b.w - inset), y1: Math.round(b.y + b.h - inset) };
      const c = largestBlob(L, T, W, Hh, rect);
      out.kind = "flip";
      out.flip = { x: b.x, y: b.y, s };
      if (c && c.areaFrac > 0.05) {
        out.found = true; out.coin = { cx: c.cx, cy: c.cy, r: c.r }; out.cv = c.cv; out.aspect = c.aspect; out.touches = c.touches;
      } else {
        out.coin = { cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: s * 0.3 }; out.cv = 1; out.aspect = 0;
      }
      return out;
    }
    // A bare coin (or the coin dominates the frame).
    out.kind = "coin"; out.found = true;
    out.coin = { cx: b.cx, cy: b.cy, r: b.r };
    out.cv = b.cv; out.aspect = b.aspect; out.touches = b.touches;
    const s = Math.min(short, (b.r * 2) / 0.62);
    out.flip = { x: b.cx - s / 2, y: b.cy - s / 2, s };
    return out;
  }

  /** Normalised Laplacian variance of a tile (contrast-stretched first). */
  function lapVar(g, w, h) {
    const d = g.getImageData(0, 0, w, h).data;
    const L = lumOf(d);
    const hist = new Uint32Array(256); for (let i = 0; i < L.length; i++) hist[L[i] | 0]++;
    const pct = (p) => { let acc = 0, tgt = L.length * p; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= tgt) return i; } return 255; };
    const lo = pct(0.02), hi = pct(0.98);
    const gain = Math.min(4, 255 / Math.max(8, hi - lo));
    let s = 0, s2 = 0, n = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = (4 * L[i] - L[i - 1] - L[i + 1] - L[i - w] - L[i + w]) * gain;
      s += v; s2 += v * v; n++;
    }
    if (!n) return 0;
    const m = s / n; return s2 / n - m * m;
  }

  /** Sharpness measured at MASTER scale on five tiles across the coin. */
  function sharpness(bmp, coinFull, flipFullS) {
    const scale = Math.min(1, SPEC.masterFlip / Math.max(1, flipFullS));
    const rS = coinFull.r * scale;
    const tile = Math.max(24, Math.min(256, Math.round(rS * 0.7)));
    const c = document.createElement("canvas"); c.width = tile; c.height = tile;
    const g = c.getContext("2d", { willReadFrequently: true });
    const src = tile / scale;
    const off = coinFull.r * 0.42;
    const pts = [[0, 0], [-off, -off], [off, -off], [-off, off], [off, off]];
    const vals = pts.map(([dx, dy]) => {
      g.clearRect(0, 0, tile, tile);
      g.drawImage(bmp, coinFull.cx + dx - src / 2, coinFull.cy + dy - src / 2, src, src, 0, 0, tile, tile);
      return lapVar(g, tile, tile);
    }).sort((a, b) => b - a);
    return (vals[0] + vals[1] + vals[2]) / 3; // mean of the three sharpest tiles
  }

  /** Stats over the coin disc at analysis resolution. */
  function discStats(data, L, W, Hh, coin) {
    const hist = new Uint32Array(256); let n = 0, clip = 0, crush = 0;
    const r2 = coin.r * coin.r * 0.94;
    const x0 = Math.max(0, Math.floor(coin.cx - coin.r)), x1 = Math.min(W, Math.ceil(coin.cx + coin.r));
    const y0 = Math.max(0, Math.floor(coin.cy - coin.r)), y1 = Math.min(Hh, Math.ceil(coin.cy + coin.r));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const dx = x - coin.cx, dy = y - coin.cy; if (dx * dx + dy * dy > r2) continue;
      const i = y * W + x; const j = i * 4;
      hist[L[i] | 0]++; n++;
      if (data[j] >= 250 || data[j + 1] >= 250 || data[j + 2] >= 250) clip++;
      if (L[i] <= 6) crush++;
    }
    const pct = (p) => { let acc = 0, t = n * p; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= t) return i; } return 255; };
    return { n, p50: n ? pct(0.5) : 0, p99: n ? pct(0.99) : 0, clip: n ? clip / n : 0, crush: n ? crush / n : 0 };
  }

  /** Mean RGB of a neutral reference: a tapped point, or the background outside the coin/flip. */
  function neutralSample(data, L, W, Hh, geo, wb) {
    let r = 0, g = 0, b = 0, n = 0, seen = 0;
    const add = (i) => { const j = i * 4; seen++; if (L[i] < 20 || L[i] > 245) return; r += data[j]; g += data[j + 1]; b += data[j + 2]; n++; };
    if (wb) {
      const cx = wb.x * W, cy = wb.y * Hh, rad = Math.max(4, Math.min(W, Hh) * 0.015);
      for (let y = Math.max(0, cy - rad | 0); y < Math.min(Hh, cy + rad); y++) for (let x = Math.max(0, cx - rad | 0); x < Math.min(W, cx + rad); x++) add(y * W + x);
      return { n, r, g, b, src: "tap" };
    }
    const c = geo.coin;
    const rr = (c.r * 1.08) * (c.r * 1.08);
    for (let y = 0; y < Hh; y += 2) for (let x = 0; x < W; x += 2) {
      const dx = x - c.cx, dy = y - c.cy; if (dx * dx + dy * dy < rr) continue;
      add(y * W + x);
    }
    if (n < seen * 0.5) n = 0; // mostly black/clipped: no usable neutral background
    return { n, r, g, b, src: "background" };
  }

  /** Build the check list from cached analysis + (optional) sharpness score. */
  function runChecks(im, a) {
    const { data, L, W, H: Hh } = a;
    const k = im.w / W; // analysis -> full px
    const geo = im.geo;
    const coinFullD = geo.coin.r * 2 * k;
    const flipFull = geo.flip.s * k;
    const checks = [];

    // 1. Resolution (at the size the outputs need)
    {
      const needFlip = SPEC.masterFlip, needCoin = SPEC.circle * SPEC.circleFill;
      const rf = flipFull / needFlip, rc = coinFullD / needCoin;
      const worst = Math.min(rf, rc);
      const lvl = worst >= 1 ? "pass" : worst >= 0.66 ? "warn" : "fail";
      const dpiNeed = Math.ceil(needFlip / (FLIP_MM / 25.4));
      checks.push({
        id: "resolution", label: "Resolution", level: lvl,
        value: `${im.w} × ${im.h} px · flip ≈ ${Math.round(flipFull)} px · coin ≈ ${Math.round(coinFullD)} px`,
        advice: lvl === "pass" ? "Enough detail for every crop at full size."
          : lvl === "warn" ? `A little small: the ${needFlip}px master would be enlarged. Scan at ${dpiNeed} dpi or more, or move the camera closer.`
            : `Too small for a master. Scan at ${dpiNeed} dpi or more (a 2×2 flip is 2 inches), or fill more of the frame.`,
      });
    }
    // 2. Sharpness
    if (im.sharp != null) {
      const v = im.sharp;
      const lvl = v >= 260 ? "pass" : v >= 90 ? "warn" : "fail";
      checks.push({
        id: "sharpness", label: "Sharpness", level: lvl, value: `Detail score ${Math.round(v)} (pass ≥ 260)`,
        advice: lvl === "pass" ? "Crisp at master size." : lvl === "warn" ? "Slightly soft. Refocus on the coin's high points and keep the camera still (use the timer)."
          : "Blurred. Refocus, steady the camera or scanner lid, then reshoot.",
      });
    }
    // 3. Brightness and 4. Glare (inside the coin)
    const ds = discStats(data, L, W, Hh, geo.coin);
    {
      let lvl = "pass", advice = "Well exposed.";
      if (ds.p99 < 110) { lvl = "fail"; advice = "Too dark: add light (move the lamp closer) or lengthen the exposure."; }
      else if (ds.p99 < 165) { lvl = "warn"; advice = "A bit dark: brighten by about one stop, or bring the lamp closer."; }
      else if (ds.p50 > 232) { lvl = "fail"; advice = "Too bright: the coin is washed out. Lower the exposure or move the lamp away."; }
      else if (ds.crush > 0.3) { lvl = "warn"; advice = "Deep shadows hide detail: add a second light or a white card opposite the lamp."; }
      checks.push({ id: "brightness", label: "Brightness", level: lvl, value: `Brightest ${ds.p99}/255 · middle ${ds.p50}/255`, advice });
    }
    {
      const c = ds.clip;
      const lvl = c > 0.06 ? "fail" : c > 0.02 ? "warn" : "pass";
      checks.push({
        id: "glare", label: "Glare", level: lvl, value: `${(c * 100).toFixed(1)} % of the coin is clipped white`,
        advice: lvl === "pass" ? "No blown highlights." : lvl === "warn" ? "Some glare on the coin or the mylar window. Angle the lamp more (30–45°) or add a diffuser."
          : "Strong glare hides the surface. Move the lamp off-axis, diffuse it, or use cross-polarised light, then reshoot.",
      });
    }
    // 5. Coin shape and centring
    {
      const det = im.det || {};
      const offX = (geo.coin.cx - W / 2) / Math.min(W, Hh), offY = (geo.coin.cy - Hh / 2) / Math.min(W, Hh);
      const off = Math.hypot(offX, offY);
      const edge = geo.coin.cx - geo.coin.r < 1 || geo.coin.cy - geo.coin.r < 1 || geo.coin.cx + geo.coin.r > W - 1 || geo.coin.cy + geo.coin.r > Hh - 1;
      let lvl = "pass", advice = "Coin is round and centred.";
      const dir = Math.abs(offX) > Math.abs(offY) ? (offX > 0 ? "right" : "left") : (offY > 0 ? "down" : "up");
      if (!det.found && !im.manual) { lvl = "warn"; advice = "Couldn't find the coin edge automatically. Drag the gold circle onto the coin (or use the sliders)."; }
      else if (det.touches || edge) { lvl = "fail"; advice = "The coin runs off the edge of the picture. Re-centre and reshoot."; }
      else if (!im.manual && det.aspect && det.aspect < 0.9) { lvl = "fail"; advice = "The coin looks oval: the camera is tilted. Keep the lens parallel to the coin."; }
      else if (!im.manual && det.aspect && det.aspect < 0.96) { lvl = "warn"; advice = "Slightly oval: straighten the camera so it looks straight down."; }
      else if (off > 0.12) { lvl = "fail"; advice = `Far off-centre: move the coin ${dir === "left" ? "right" : dir === "right" ? "left" : dir === "up" ? "down" : "up"} in the frame (it sits too far ${dir}).`; }
      else if (off > 0.05) { lvl = "warn"; advice = `A little off-centre (too far ${dir}). Fine for the crops, but centre it next time.`; }
      checks.push({
        id: "framing", label: "Round & centred", level: lvl,
        value: `${det.found || im.manual ? "Coin found" : "Not found"}${det.aspect ? ` · roundness ${(det.aspect * 100).toFixed(0)} %` : ""} · off-centre ${(off * 100).toFixed(1)} %${im.manual ? " · placed by hand" : ""}`,
        advice,
      });
    }
    // 6. White balance vs a neutral reference
    {
      const s = neutralSample(data, L, W, Hh, geo, im.wb);
      const M0 = s.n ? (s.r + s.g + s.b) / (3 * s.n) : 0;
      if (s.n < 30 || M0 < 45) {
        checks.push({ id: "color", label: "Colour balance", level: "info", value: s.n < 30 ? "No neutral area to measure" : "Background too dark to judge colour", advice: "Put a grey or white card in the shot and tap it here to check the colour." });
      } else {
        const R = s.r / s.n, G = s.g / s.n, B = s.b / s.n, M = (R + G + B) / 3;
        const dev = Math.max(Math.abs(R - M), Math.abs(G - M), Math.abs(B - M)) / Math.max(1, M);
        let cast = "neutral";
        if (dev > 0.035) {
          if (R - B > 0 && Math.abs(R - B) >= Math.abs(G - M) * 1.2) cast = "warm (orange)";
          else if (B - R > 0 && Math.abs(R - B) >= Math.abs(G - M) * 1.2) cast = "cool (blue)";
          else cast = G > M ? "green" : "magenta";
        }
        const lvl = dev <= 0.05 ? "pass" : dev <= 0.1 ? "warn" : "fail";
        const fix = { "warm (orange)": "set white balance to Daylight (about 5000 K) or use daylight bulbs", "cool (blue)": "set white balance to about 4000–5000 K or warm the light", green: "avoid fluorescent tubes; use high-CRI LED or daylight bulbs", magenta: "set a custom white balance from the grey card" };
        checks.push({
          id: "color", label: "Colour balance", level: lvl,
          value: `${cast === "neutral" ? "Neutral" : "Cast: " + cast} · ${(dev * 100).toFixed(1)} % off grey · from ${s.src === "tap" ? "your tapped point" : "the background"}`,
          advice: lvl === "pass" ? (s.src === "tap" ? "Grey card reads neutral." : "Background reads neutral. For best colour, tap a grey card.")
            : `Colour is ${cast}: ${fix[cast] || "set a custom white balance from the grey card"}.`,
        });
      }
    }
    return checks;
  }
  const overall = (checks) => (checks || []).reduce((w, c) => (LEVEL_RANK[c.level] > LEVEL_RANK[w] ? c.level : w), "pass");

  /** Full analysis for a new image. Keeps a display canvas in memory. */
  async function analyzeImage(im, blob) {
    const bmp = await decode(blob);
    try {
      im.w = srcW(bmp); im.h = srcH(bmp);
      const disp = scaled(bmp, DISPLAY_EDGE);
      mem.display.set(im.id, disp);
      const a = analysisOf(im);
      const det = detect(a.L, a.W, a.H);
      im.det = { found: det.found, kind: det.kind, touches: det.touches, aspect: +det.aspect.toFixed(3), cv: +det.cv.toFixed(3) };
      im.geo = { coin: rel(det.coin, a), flip: relF(det.flip, a) };
      im.geo0 = JSON.parse(JSON.stringify(im.geo));
      im.manual = false;
      const k = im.w / a.W;
      const coinFull = { cx: det.coin.cx * k, cy: det.coin.cy * k, r: det.coin.r * k };
      im.sharp = sharpness(bmp, coinFull, det.flip.s * k);
      recheck(im);
    } finally { if (bmp.close) try { bmp.close(); } catch (e) { /* ignore */ } }
  }
  // geometry is stored RELATIVE (0..1 of width/height) so it survives any resolution
  const rel = (c, a) => ({ cx: c.cx / a.W, cy: c.cy / a.H, r: c.r / Math.min(a.W, a.H) });
  const relF = (f, a) => ({ x: f.x / a.W, y: f.y / a.H, s: f.s / Math.min(a.W, a.H) });
  const absGeo = (g, W, Hh) => ({ coin: { cx: g.coin.cx * W, cy: g.coin.cy * Hh, r: g.coin.r * Math.min(W, Hh) }, flip: { x: g.flip.x * W, y: g.flip.y * Hh, s: g.flip.s * Math.min(W, Hh) } });

  const analysisCache = new Map();
  function analysisOf(im) {
    const hit = analysisCache.get(im.id); if (hit) return hit;
    const disp = mem.display.get(im.id); if (!disp) return null;
    const c = scaled(disp, ANALYSIS_EDGE);
    const data = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    const a = { data, L: lumOf(data), W: c.width, H: c.height };
    analysisCache.clear(); // keep at most one (memory)
    analysisCache.set(im.id, a);
    return a;
  }
  function recheck(im) {
    const a = analysisOf(im); if (!a) return;
    const geoA = absGeo(im.geo, a.W, a.H);
    im.checks = runChecks(Object.assign({}, im, { geo: geoA }), a);
    im.overall = overall(im.checks);
  }

  /* =======================================================================
     STATUS MODEL
     ======================================================================= */
  function sidesOf(scan) {
    const out = { front: null, back: null };
    for (const id of S.order) {
      const im = S.images[id];
      if (im && im.scan === scan && (im.side === "front" || im.side === "back")) out[im.side] = im;
    }
    return out;
  }
  function statusOf(f) {
    const c = S.coins[f.scan] || {};
    const sides = sidesOf(f.scan);
    const assigned = [sides.front, sides.back].filter(Boolean);
    const failed = assigned.filter((im) => im.overall === "fail" && !im.keep);
    if (c.reshoot || failed.length) return "Reshoot";
    if (c.verified && sides.front && sides.back) return "Verified";
    if (sides.front && sides.back) return "Photographed";
    const led = f.status;
    if (STATUSES.includes(led) && led !== "Logged" && !assigned.length) return led;
    return "Logged";
  }
  function reshootReason(f) {
    const c = S.coins[f.scan] || {};
    if (c.reshoot) return c.reshoot;
    const s = sidesOf(f.scan);
    const bits = [];
    for (const side of ["front", "back"]) {
      const im = s[side]; if (!im || im.overall !== "fail" || im.keep) continue;
      bits.push(side + ": " + im.checks.filter((c2) => c2.level === "fail").map((c2) => c2.label.toLowerCase()).join(", "));
    }
    return bits.join("; ");
  }
  function board() {
    const cols = { Logged: [], Photographed: [], Verified: [], Reshoot: [] };
    for (const f of flips()) cols[statusOf(f)].push(f);
    for (const k in cols) cols[k].sort(bySer);
    return cols;
  }
  function nextUp(cols) {
    if (cols.Reshoot.length) return { f: cols.Reshoot[0], why: "Reshoots come first: fix what failed while the setup is still warm." };
    const half = cols.Logged.filter((f) => { const s = sidesOf(f.scan); return !!(s.front || s.back); });
    if (half.length) { const f = half[0]; const s = sidesOf(f.scan); return { f, why: `Finish this pair: the ${s.front ? "back" : "front"} side is still missing.` }; }
    const country = S.country || S.lastCountry;
    if (country) {
      const f = cols.Logged.find((x) => x.country === country);
      if (f) return { f, why: `Next in your ${country} session, in ser order.` };
    }
    const by = {}; cols.Logged.forEach((f) => { by[f.country || "Unknown"] = (by[f.country || "Unknown"] || 0) + 1; });
    const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const f = cols.Logged.find((x) => (x.country || "Unknown") === top[0]);
    return { f, why: `Start with ${top[0]}: the largest group still waiting (${top[1]} flips).` };
  }

  /* =======================================================================
     RENDERING
     ======================================================================= */
  let root = null, bench = null;

  function shell() {
    return `
    <nav class="lx-nav" aria-label="Lab sections">
      <a href="#lx-board" data-jump="lx-board">Board</a>
      <a href="#lx-intake" data-jump="lx-intake">Scans</a>
      <a href="#lx-inspect" data-jump="lx-inspect">Inspect &amp; pair</a>
      <a href="#lx-export" data-jump="lx-export">Export</a>
      <a href="#lx-bench" data-jump="lx-bench">Bench tools</a>
    </nav>

    <section class="lx-proto reveal" aria-labelledby="lx-proto-h">
      <div class="lx-proto-head">
        <span class="lx-eyebrow">Phase 2 protocol</span>
        <h3 id="lx-proto-h">From flip to master, on this device</h3>
      </div>
      <ol class="lx-steps">
        <li><b>1</b><span><strong>Label.</strong> Write the final ser on Side 2 of the flip.</span></li>
        <li><b>2</b><span><strong>Scan.</strong> Front and back, straight on, into the staging folder.</span></li>
        <li><b>3</b><span><strong>Check.</strong> Drop the scans below. Each one is tested for detail, light, glare, framing and colour.</span></li>
        <li><b>4</b><span><strong>Pair.</strong> Match each scan to its coin and side; confirm the Side 1 label and Side 2 ser.</span></li>
        <li><b>5</b><span><strong>Export.</strong> Save the manifest (and crops) to the Drive staging folder. Masters are never deleted.</span></li>
      </ol>
      <p class="lx-privacy"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        Photos stay on this device. Nothing is uploaded. Checks are measured, not guessed: no AI, no text reading.</p>
    </section>

    <section id="lx-board" class="lx-sec reveal" aria-labelledby="lx-board-h">
      <div class="lx-sec-head"><span class="lx-eyebrow">Status board</span><h3 id="lx-board-h">The archive, coin by coin</h3></div>
      <div id="lx-board-body"></div>
    </section>

    <section id="lx-intake" class="lx-sec reveal" aria-labelledby="lx-intake-h">
      <div class="lx-sec-head"><span class="lx-eyebrow">Intake</span><h3 id="lx-intake-h">Scans on the bench</h3></div>
      <div class="lx-drop" id="lx-drop" tabindex="0" role="button" aria-describedby="lx-drop-sub" aria-label="Add scans: drop image files here or press to choose files">
        <svg class="lx-drop-ico" viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="3"/><circle cx="24" cy="24" r="9.5"/><path d="M24 2v6M24 40v6M2 24h6M40 24h6"/></svg>
        <div class="lx-drop-txt">
          <strong>Drop front and back scans here</strong>
          <span id="lx-drop-sub">JPEG, PNG or WebP. Name files like <code>EU-CH-008_front.jpg</code> and they pair themselves.</span>
        </div>
        <div class="lx-drop-btns">
          <label class="lx-btn lx-btn-gold"><input type="file" id="lx-file" accept="image/*" multiple hidden />Choose scans</label>
          <label class="lx-btn"><input type="file" id="lx-cam" accept="image/*" capture="environment" hidden />Use camera</label>
        </div>
      </div>
      <p class="lx-storage" id="lx-storage" role="status"></p>
      <div id="lx-tray"></div>
    </section>

    <section id="lx-inspect" class="lx-sec reveal" aria-labelledby="lx-inspect-h">
      <div class="lx-sec-head"><span class="lx-eyebrow">Inspector</span><h3 id="lx-inspect-h">Check, crop and pair</h3></div>
      <div id="lx-inspect-body"></div>
    </section>

    <section id="lx-export" class="lx-sec reveal" aria-labelledby="lx-export-h">
      <div class="lx-sec-head"><span class="lx-eyebrow">Hand-off</span><h3 id="lx-export-h">Export the session</h3></div>
      <div id="lx-export-body"></div>
    </section>`;
  }

  /* ---------- Board ---------- */
  function renderBoard() {
    const el = $("#lx-board-body"); if (!el) return;
    const cols = board();
    const total = flips().length || 1;
    const nV = cols.Verified.length, nP = cols.Photographed.length, nR = cols.Reshoot.length;
    const pct = Math.round(((nV) / total) * 100);
    const pctP = Math.round(((nV + nP) / total) * 100);
    const nu = nextUp(cols);
    const countries = {};
    cols.Logged.forEach((f) => { const c = f.country || "Unknown"; countries[c] = (countries[c] || 0) + 1; });
    const cList = Object.entries(countries).sort((a, b) => b[1] - a[1]);
    const cf = S.country;
    const col = (name, list, note) => {
      const shown = name === "Logged" && cf ? list.filter((f) => f.country === cf) : list;
      const cap = 8;
      return `<div class="lx-col lx-col-${name.toLowerCase()}" role="group" aria-label="${name}: ${list.length}">
        <div class="lx-col-h"><span class="lx-dot" aria-hidden="true"></span>${name}<span class="lx-col-n">${list.length}</span></div>
        ${note ? `<p class="lx-col-note">${note}</p>` : ""}
        <ul class="lx-cards">${shown.slice(0, cap).map((f) => {
          const s = sidesOf(f.scan);
          const half = name === "Logged" && (s.front || s.back);
          const why = name === "Reshoot" ? reshootReason(f) : "";
          return `<li><button type="button" class="lx-card${half ? " is-half" : ""}" data-pick="${esc(f.scan)}">
            <span class="lx-card-ser">${esc(serOf(f))}</span>
            <span class="lx-card-t">${esc(coinLine(f))}</span>
            ${half ? `<span class="lx-card-x">${s.front ? "Front" : "Back"} done · 1 of 2</span>` : ""}
            ${why ? `<span class="lx-card-x lx-bad">${esc(why)}</span>` : ""}
          </button></li>`;
        }).join("")}</ul>
        ${shown.length > cap ? `<p class="lx-more">+ ${shown.length - cap} more${name === "Logged" && cf ? " in " + esc(cf) : ""}</p>` : ""}
        ${!shown.length ? `<p class="lx-empty">${name === "Verified" ? "Nothing verified yet." : name === "Reshoot" ? "No reshoots. Good." : name === "Photographed" ? "Pairs appear here." : "All done."}</p>` : ""}
      </div>`;
    };
    el.innerHTML = `
      <div class="lx-stats">
        <div class="lx-stat"><span class="lx-stat-n">${nV}</span><span class="lx-stat-l">Verified</span></div>
        <div class="lx-stat"><span class="lx-stat-n">${nP}</span><span class="lx-stat-l">Photographed</span></div>
        <div class="lx-stat${nR ? " is-bad" : ""}"><span class="lx-stat-n">${nR}</span><span class="lx-stat-l">Reshoot</span></div>
        <div class="lx-stat"><span class="lx-stat-n">${cols.Logged.length}</span><span class="lx-stat-l">Logged</span></div>
      </div>
      <div class="lx-progress" role="img" aria-label="${pct} percent verified, ${pctP} percent photographed or better">
        <span class="lx-prog-p" style="width:${pctP}%"></span><span class="lx-prog-v" style="width:${pct}%"></span>
      </div>
      <p class="lx-prog-cap">${pct}% verified · ${pctP}% photographed of ${flips().length} flips</p>
      ${nu ? `<div class="lx-next">
        <div class="lx-next-l"><span class="lx-eyebrow">Next up</span>
          <strong class="lx-next-ser">${esc(serOf(nu.f))}</strong>
          <span class="lx-next-t">${esc(coinLine(nu.f))}</span>
          <span class="lx-next-why">${esc(nu.why)}</span></div>
        <div class="lx-next-b">
          <button type="button" class="lx-btn lx-btn-gold" data-pick="${esc(nu.f.scan)}">Work on this coin</button>
          <button type="button" class="lx-btn" data-dossier="${esc(nu.f.scan)}">Open dossier</button>
        </div></div>` : ""}
      <div class="lx-session">
        <label for="lx-country">Session</label>
        <select id="lx-country">
          <option value="">All countries (${cols.Logged.length} waiting)</option>
          ${cList.map(([c, n]) => `<option value="${esc(c)}"${c === cf ? " selected" : ""}>${esc(c)} · ${n} waiting</option>`).join("")}
        </select>
      </div>
      <div class="lx-kanban">
        ${col("Logged", cols.Logged, cf ? `Showing ${esc(cf)}` : "")}
        ${col("Photographed", cols.Photographed, "Both sides in and passing.")}
        ${col("Verified", cols.Verified, "Labels confirmed by you.")}
        ${col("Reshoot", cols.Reshoot, "Rejected scans with the reason.")}
      </div>`;
  }

  /* ---------- Tray ---------- */
  function badge(level, text) {
    return `<span class="lx-badge lx-${level}"><span class="lx-badge-i" aria-hidden="true">${level === "pass" ? "✓" : level === "fail" ? "✕" : level === "info" ? "i" : "!"}</span>${esc(text || LEVEL_WORD[level])}</span>`;
  }
  function renderTray() {
    const el = $("#lx-tray"); if (!el) return;
    const ids = S.order.filter((id) => S.images[id]);
    if (!ids.length) { el.innerHTML = `<p class="lx-empty lx-tray-empty">No scans yet. Add the front and back of a flip to begin.</p>`; return; }
    el.innerHTML = `<div class="lx-tray-head"><span>${ids.length} scan${ids.length === 1 ? "" : "s"} · ${ids.filter((i) => !S.images[i].scan).length} unpaired</span></div>
      <ul class="lx-tray">${ids.map((id) => {
        const im = S.images[id];
        const f = flipBy(im.scan);
        const th = mem.thumbs.get(id);
        const busy = mem.pending.has(id);
        return `<li><button type="button" class="lx-shot${S.selected === id ? " is-sel" : ""}" data-sel="${esc(id)}" aria-pressed="${S.selected === id}">
          <span class="lx-shot-img">${th ? `<img src="${th}" alt="" />` : `<span class="lx-shot-ph" aria-hidden="true"></span>`}</span>
          <span class="lx-shot-meta">
            <span class="lx-shot-name">${esc(im.name)}</span>
            <span class="lx-shot-pair">${f ? `${esc(serOf(f))} · ${im.side === "back" ? "Back" : im.side === "front" ? "Front" : "side?"}` : "Not paired"}</span>
            ${busy ? `<span class="lx-badge lx-info"><span class="lx-spin" aria-hidden="true"></span>Checking…</span>` : im.error ? badge("fail", "Can't open") : badge(im.overall || "info", im.keep && im.overall === "fail" ? "Kept anyway" : null)}
          </span></button></li>`;
      }).join("")}</ul>`;
  }
  function renderStorageNote() {
    const el = $("#lx-storage"); if (!el) return;
    el.textContent = storage.idb
      ? "Scans are kept in this browser's private storage (IndexedDB) until you clear the session."
      : "This browser won't store images, so scans are kept in memory only and will be gone if you reload. Export before closing.";
    el.classList.toggle("is-warn", !storage.idb || !storage.ls);
  }

  /* ---------- Inspector ---------- */
  let wbMode = false;
  function renderInspector() {
    const el = $("#lx-inspect-body"); if (!el) return;
    const im = S.images[S.selected];
    if (!im) {
      el.innerHTML = `<div class="lx-inspect-empty"><p>Pick a scan from the bench to see its checks, the planned crops and to pair it with a coin.</p>
        ${S.target && flipBy(S.target) ? `<p class="lx-target">Working on <strong>${esc(serOf(flipBy(S.target)))}</strong> · ${esc(coinLine(flipBy(S.target)))}. The next scan you pick or add will be offered for this coin.</p>` : ""}</div>`;
      return;
    }
    const f = flipBy(im.scan) || null;
    const tgt = !f && S.target ? flipBy(S.target) : null;
    const s = f ? sidesOf(f.scan) : null;
    const st = f ? statusOf(f) : "";
    const coinState = f ? (S.coins[f.scan] || {}) : {};
    el.innerHTML = `
      <div class="lx-insp">
        <div class="lx-stage">
          <div class="lx-canvas-wrap${wbMode ? " is-wb" : ""}">
            <canvas id="lx-canvas" aria-label="Scan with planned crop guides. Drag to move the coin circle."></canvas>
            ${im.error ? `<p class="lx-canvas-msg">This file couldn't be opened (${esc(im.error)}). HEIC photos: export as JPEG first.</p>` : ""}
          </div>
          <div class="lx-legend" aria-hidden="true">
            <span><i class="lg-flip"></i>2×2 master (${SPEC.masterFlip} px)</span>
            <span><i class="lg-coin"></i>Coin circle (${SPEC.circle} px, coin ${Math.round(SPEC.circleFill * 100)} %)</span>
            <span><i class="lg-label"></i>Label crop (${SPEC.label} px)</span>
          </div>
          <div class="lx-adjust">
            <div class="lx-adjust-h"><strong>Adjust the crop</strong><span>Drag on the picture to move the coin circle.</span></div>
            ${slider("cx", "Coin left / right", im.geo.coin.cx, 0, 1)}
            ${slider("cy", "Coin up / down", im.geo.coin.cy, 0, 1)}
            ${slider("r", "Coin size", im.geo.coin.r, 0.05, 0.6)}
            ${slider("fs", "2×2 square size", im.geo.flip.s, 0.2, 1.2)}
            <div class="lx-row">
              <div class="lx-seg" role="group" aria-label="Label position">
                <button type="button" data-labelpos="below" aria-pressed="${im.labelPos !== "above"}">Label below coin</button>
                <button type="button" data-labelpos="above" aria-pressed="${im.labelPos === "above"}">Label above</button>
              </div>
            </div>
            <div class="lx-row">
              <button type="button" class="lx-btn" id="lx-reset-geo">Reset to detected</button>
              <button type="button" class="lx-btn${wbMode ? " is-on" : ""}" id="lx-wb" aria-pressed="${wbMode}">${wbMode ? "Tap the grey card…" : "Measure colour on a grey card"}</button>
              ${im.wb ? `<button type="button" class="lx-btn" id="lx-wb-clear">Use background</button>` : ""}
            </div>
          </div>
        </div>

        <div class="lx-side">
          <div class="lx-verdict lx-v-${im.overall || "info"}">
            ${badge(im.overall || "info", im.overall === "pass" ? "Ready" : im.overall === "warn" ? "Usable, check notes" : im.overall === "fail" ? "Reshoot needed" : "Checking")}
            <span class="lx-verdict-f">${esc(im.name)} · ${fmtBytes(im.size || 0)}</span>
          </div>
          <ul class="lx-checks">
            ${(im.checks || []).map((c) => `<li class="lx-check lx-${c.level}">
              <div class="lx-check-h">${badge(c.level)}<strong>${esc(c.label)}</strong></div>
              <p class="lx-check-a">${esc(c.advice)}</p>
              <p class="lx-check-v">${esc(c.value)}</p></li>`).join("")}
          </ul>
          ${im.overall === "fail" ? `<label class="lx-keep"><input type="checkbox" id="lx-keep"${im.keep ? " checked" : ""}/> Keep this scan anyway (I've checked it by eye)</label>` : ""}

          <div class="lx-pair">
            <h4>Pair with a coin</h4>
            ${f ? `<div class="lx-paired">
                <div><span class="lx-paired-ser">${esc(serOf(f))}</span> <span class="lx-muted">${esc(f.scan)}</span></div>
                <div class="lx-paired-t">${esc(coinLine(f))}</div>
                <div class="lx-seg" role="group" aria-label="Which side is this scan">
                  <button type="button" data-side="front" aria-pressed="${im.side === "front"}">Front</button>
                  <button type="button" data-side="back" aria-pressed="${im.side === "back"}">Back</button>
                </div>
                <div class="lx-pair-sides">Front ${s.front ? badge(s.front.overall || "info", "in") : '<span class="lx-muted">missing</span>'} · Back ${s.back ? badge(s.back.overall || "info", "in") : '<span class="lx-muted">missing</span>'}</div>
                <div class="lx-row"><button type="button" class="lx-btn" id="lx-unpair">Unpair</button>
                  <button type="button" class="lx-btn" data-dossier="${esc(f.scan)}">Open dossier</button></div>
              </div>` : `
              ${tgt ? `<button type="button" class="lx-btn lx-btn-gold lx-wide" data-assign="${esc(tgt.scan)}">Pair with ${esc(serOf(tgt))} (${esc(coinLine(tgt))})</button>` : ""}
              <label class="lx-lbl" for="lx-q">Find the coin by ser, country, year or denomination</label>
              <input type="search" id="lx-q" class="lx-input" placeholder="e.g. EU-CH-008 or switzerland 1969" autocomplete="off" />
              <ul class="lx-results" id="lx-results"></ul>`}
          </div>

          ${f ? `<div class="lx-verify">
            <h4>Verify <span class="lx-status lx-st-${st.toLowerCase()}">${st}</span></h4>
            <p class="lx-muted">The app can't read handwriting. Compare the label crops with the ledger and confirm:</p>
            <dl class="lx-ledger"><dt>Side 1 label should read</dt><dd>${esc([f.country, f.year, f.denom].filter(Boolean).join(", "))}</dd>
              <dt>Side 2 ser should read</dt><dd class="lx-mono">${esc(f.ser || "(no ser yet)")}</dd></dl>
            <label class="lx-tick"><input type="checkbox" id="lx-ok1"${coinState.verified ? " checked disabled" : ""}/> Side 1 label matches</label>
            <label class="lx-tick"><input type="checkbox" id="lx-ok2"${coinState.verified ? " checked disabled" : ""}/> Side 2 ser matches</label>
            <div class="lx-row">
              ${coinState.verified ? `<button type="button" class="lx-btn" id="lx-unverify">Undo verify</button>`
                : `<button type="button" class="lx-btn lx-btn-gold" id="lx-verify" ${st === "Photographed" ? "" : "disabled"}>Mark verified</button>`}
              ${coinState.reshoot ? `<button type="button" class="lx-btn" id="lx-unreshoot">Clear reshoot</button>`
                : `<button type="button" class="lx-btn lx-btn-bad" id="lx-reshoot">Request reshoot…</button>`}
            </div>
            ${st !== "Photographed" && st !== "Verified" ? `<p class="lx-muted lx-small">${st === "Reshoot" ? "Reshoot: " + esc(reshootReason(f)) : "Verify unlocks once both sides are in and none fails."}</p>` : ""}
          </div>` : ""}
          <div class="lx-row lx-danger-row"><button type="button" class="lx-btn lx-btn-ghost" id="lx-remove">Remove this scan from the session</button></div>
        </div>
      </div>`;
    drawStage();
    bindInspector(im);
    if (!f) runSearch("");
  }
  function slider(key, label, v, min, max) {
    return `<label class="lx-slide"><span>${label}</span><input type="range" data-geo="${key}" min="${min}" max="${max}" step="0.001" value="${(+v).toFixed(4)}" /></label>`;
  }

  function cssVar(name, fb) {
    try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; }
  }

  function drawStage() {
    const cv = $("#lx-canvas"); if (!cv) return;
    const im = S.images[S.selected]; if (!im) return;
    const disp = mem.display.get(im.id);
    const wrap = cv.parentElement;
    const maxW = Math.max(200, wrap.clientWidth || 600);
    const ratio = disp ? disp.height / disp.width : 1;
    const cssW = maxW, cssH = Math.min(Math.round(maxW * ratio), Math.round(window.innerHeight * 0.72));
    const cssW2 = Math.round(cssH / ratio);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = cssW2 + "px"; cv.style.height = cssH + "px";
    cv.width = Math.round(cssW2 * dpr); cv.height = Math.round(cssH * dpr);
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = cssVar("--surface2", "#161310"); g.fillRect(0, 0, cssW2, cssH);
    if (!disp) {
      g.fillStyle = cssVar("--muted", "#999"); g.font = "16px system-ui"; g.textAlign = "center";
      g.fillText(mem.pending.has(im.id) ? "Loading…" : "Preview not loaded", cssW2 / 2, cssH / 2);
      if (!mem.pending.has(im.id) && !im.error) ensureDisplay(im).then(() => { if (S.selected === im.id) { recheckIfNeeded(im); drawStage(); } });
      return;
    }
    g.drawImage(disp, 0, 0, cssW2, cssH);
    const geo = absGeo(im.geo, cssW2, cssH);
    const gold = cssVar("--gold", "#c8a94a"), ok = cssVar("--ok", "#6bbf7a"), ink = "#ffffff";
    g.save();
    // dim outside the 2x2 square
    const fl = geo.flip;
    g.fillStyle = "rgba(0,0,0,0.42)";
    g.beginPath(); g.rect(0, 0, cssW2, cssH); g.rect(fl.x, fl.y, fl.s, fl.s); g.fill("evenodd");
    // 2x2 square
    g.lineWidth = 2; g.setLineDash([8, 6]); g.strokeStyle = gold; g.strokeRect(fl.x, fl.y, fl.s, fl.s);
    // circle output frame (coin at 86%)
    const c = geo.coin;
    g.setLineDash([3, 5]); g.lineWidth = 1.5; g.strokeStyle = ink; g.globalAlpha = 0.75;
    const fr = c.r / SPEC.circleFill;
    g.strokeRect(c.cx - fr, c.cy - fr, fr * 2, fr * 2);
    g.globalAlpha = 1; g.setLineDash([]);
    // coin circle
    g.lineWidth = 2.5; g.strokeStyle = gold; g.beginPath(); g.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.moveTo(c.cx - 10, c.cy); g.lineTo(c.cx + 10, c.cy); g.moveTo(c.cx, c.cy - 10); g.lineTo(c.cx, c.cy + 10); g.stroke();
    // label band
    const lb = labelRect(geo, im.labelPos);
    if (lb) { g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeStyle = ok; g.strokeRect(lb.x, lb.y, lb.w, lb.h); g.setLineDash([]); }
    // WB point
    if (im.wb) {
      const x = im.wb.x * cssW2, y = im.wb.y * cssH;
      g.lineWidth = 2; g.strokeStyle = "#fff"; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#000"; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
  /** Label band: the cardboard strip between the coin and the flip edge. */
  function labelRect(geo, pos) {
    const fl = geo.flip, c = geo.coin;
    const gap = c.r * 0.06;
    if (pos === "above") {
      const y1 = c.cy - c.r - gap, h = y1 - fl.y;
      if (h < fl.s * 0.06) return null;
      return { x: fl.x, y: fl.y, w: fl.s, h };
    }
    const y0 = c.cy + c.r + gap, h = fl.y + fl.s - y0;
    if (h < fl.s * 0.06) return null;
    return { x: fl.x, y: y0, w: fl.s, h };
  }

  async function ensureDisplay(im) {
    if (mem.display.has(im.id)) return true;
    let blob = mem.blobs.get(im.id);
    if (!blob) { blob = await idbGet("b:" + im.id); if (blob) mem.blobs.set(im.id, blob); }
    if (!blob) { im.error = "original not in storage"; saveState(); return false; }
    mem.pending.add(im.id);
    try { const bmp = await decode(blob); mem.display.set(im.id, scaled(bmp, DISPLAY_EDGE)); if (bmp.close) bmp.close(); }
    catch (e) { im.error = "unreadable"; }
    mem.pending.delete(im.id);
    return mem.display.has(im.id);
  }
  function recheckIfNeeded(im) { if (!im.checks) recheck(im); }

  /* ---------- Coin search ---------- */
  function runSearch(q) {
    const ul = $("#lx-results"); if (!ul) return;
    const words = norm(q).split(/\s+/).filter(Boolean);
    let list = flips();
    if (words.length) {
      list = list.filter((f) => {
        const blob = norm([f.ser, f.scan, f.country, f.iso, f.year, f.denom, f.label].join(" "));
        return words.every((w) => blob.includes(w));
      });
    } else {
      const cols = board(); const nu = nextUp(cols);
      const cf = S.country || S.lastCountry;
      list = cols.Logged.filter((f) => !cf || f.country === cf);
      if (nu) list = [nu.f].concat(list.filter((f) => f !== nu.f));
    }
    list = list.slice(0, 8);
    ul.innerHTML = list.length ? list.map((f) => `<li><button type="button" class="lx-result" data-assign="${esc(f.scan)}">
      <span class="lx-mono">${esc(serOf(f))}</span><span>${esc(coinLine(f))}</span><span class="lx-muted">${esc(f.scan)} · ${esc(statusOf(f))}</span></button></li>`).join("")
      : `<li class="lx-empty">No coin matches “${esc(q)}”.</li>`;
  }

  /* ---------- Assignment ---------- */
  function assign(im, scan, side) {
    const f = flipBy(scan); if (!f) return;
    const s = sidesOf(f.scan);
    if (!side) side = !s.front ? "front" : !s.back ? "back" : (im.side || "front");
    const other = s[side];
    if (other && other.id !== im.id) { other.scan = ""; other.side = ""; toast(`${other.name} was the ${side}; it is now unpaired.`); }
    im.scan = f.scan; im.side = side;
    S.lastCountry = f.country || S.lastCountry;
    if (S.target === f.scan) S.target = "";
    saveState();
  }

  /* ---------- Inspector events ---------- */
  function bindInspector(im) {
    const body = $("#lx-inspect-body");
    $$("input[data-geo]", body).forEach((inp) => {
      inp.addEventListener("input", () => {
        const v = parseFloat(inp.value);
        const k = inp.dataset.geo;
        if (k === "cx") im.geo.coin.cx = v; else if (k === "cy") im.geo.coin.cy = v; else if (k === "r") im.geo.coin.r = v;
        else if (k === "fs") resizeFlip(im, v);
        im.manual = true; drawStage();
      });
      inp.addEventListener("change", () => { recheck(im); saveState(); refreshChecksOnly(im); });
    });
    $$("[data-labelpos]", body).forEach((b) => b.addEventListener("click", () => { im.labelPos = b.dataset.labelpos; saveState(); renderInspector(); }));
    $("#lx-reset-geo")?.addEventListener("click", () => { if (im.geo0) { im.geo = JSON.parse(JSON.stringify(im.geo0)); im.manual = false; recheck(im); saveState(); renderAllButBench(); } });
    $("#lx-wb")?.addEventListener("click", () => { wbMode = !wbMode; renderInspector(); });
    $("#lx-wb-clear")?.addEventListener("click", () => { im.wb = null; recheck(im); saveState(); renderAllButBench(); });
    $("#lx-keep")?.addEventListener("change", (e) => { im.keep = e.target.checked; saveState(); renderAllButBench(); });
    $$("[data-side]", body).forEach((b) => b.addEventListener("click", () => { assign(im, im.scan, b.dataset.side); click(); renderAllButBench(); }));
    $("#lx-unpair")?.addEventListener("click", () => { im.scan = ""; im.side = ""; saveState(); renderAllButBench(); });
    const q = $("#lx-q");
    if (q) q.addEventListener("input", () => runSearch(q.value));
    $("#lx-remove")?.addEventListener("click", () => removeImage(im.id));
    const f = flipBy(im.scan);
    const ok = () => $("#lx-ok1")?.checked && $("#lx-ok2")?.checked;
    $("#lx-verify")?.addEventListener("click", () => {
      if (!f) return;
      if (!ok()) { toast("Tick both boxes after comparing the labels with the ledger."); return; }
      S.coins[f.scan] = Object.assign({}, S.coins[f.scan], { verified: true, verified_at: new Date().toISOString(), reshoot: "" });
      click(); saveState(); toast(`${serOf(f)} verified.`); renderAllButBench();
    });
    $("#lx-unverify")?.addEventListener("click", () => { if (!f) return; S.coins[f.scan] = Object.assign({}, S.coins[f.scan], { verified: false, verified_at: "" }); saveState(); renderAllButBench(); });
    $("#lx-reshoot")?.addEventListener("click", () => {
      if (!f) return;
      const auto = reshootReason(f);
      const r = window.prompt("Why should this coin be reshot? (This goes into the reshoot request.)", auto || "Label does not match the ledger");
      if (r == null) return;
      S.coins[f.scan] = Object.assign({}, S.coins[f.scan], { reshoot: r.trim() || "Reshoot requested", verified: false });
      saveState(); renderAllButBench();
    });
    $("#lx-unreshoot")?.addEventListener("click", () => { if (!f) return; S.coins[f.scan] = Object.assign({}, S.coins[f.scan], { reshoot: "" }); saveState(); renderAllButBench(); });

    // Canvas: drag the coin circle / tap the grey card
    const cv = $("#lx-canvas");
    if (cv) {
      let drag = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) }; };
      cv.addEventListener("pointerdown", (e) => {
        const p = pos(e);
        if (wbMode) { im.wb = { x: p.x, y: p.y }; wbMode = false; recheck(im); saveState(); renderAllButBench(); return; }
        drag = { p, cx: im.geo.coin.cx, cy: im.geo.coin.cy, fx: im.geo.flip.x, fy: im.geo.flip.y };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      cv.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const p = pos(e);
        const dx = p.x - drag.p.x, dy = p.y - drag.p.y;
        im.geo.coin.cx = clamp(drag.cx + dx, 0, 1); im.geo.coin.cy = clamp(drag.cy + dy, 0, 1);
        im.geo.flip.x = drag.fx + dx; im.geo.flip.y = drag.fy + dy;
        im.manual = true; drawStage();
      });
      const end = () => { if (!drag) return; drag = null; recheck(im); saveState(); refreshChecksOnly(im); };
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    }
  }
  function resizeFlip(im, s) {
    // keep the square centred where it was
    const disp = mem.display.get(im.id); if (!disp) return;
    const W = disp.width, Hh = disp.height, m = Math.min(W, Hh);
    const cx = im.geo.flip.x * W + (im.geo.flip.s * m) / 2, cy = im.geo.flip.y * Hh + (im.geo.flip.s * m) / 2;
    im.geo.flip.s = s;
    im.geo.flip.x = (cx - (s * m) / 2) / W; im.geo.flip.y = (cy - (s * m) / 2) / Hh;
  }
  function refreshChecksOnly() { renderAllButBench(true); }

  /* ---------- Intake ---------- */
  const SER_RX = /(?:^|[^A-Z0-9])([A-Z]{2}-[A-Z]{2,3}-\d{3})(?![0-9])/i;
  const KEY_RX = /(?:^|[^A-Z0-9])([CT]\d{3})(?![0-9])/i;
  function guessFromName(name) {
    const base = name.replace(/\.[a-z0-9]+$/i, "");
    const m = base.match(SER_RX) || base.match(KEY_RX);
    const f = m ? flipBy(m[1]) : null;
    let side = "";
    if (/(front|obv|obverse|side[ _-]?1)(?![a-z])/i.test(base) || /[_\- ](a|f|1)$/i.test(base)) side = "front";
    if (/(back|rev|reverse|side[ _-]?2)(?![a-z])/i.test(base) || /[_\- ](b|r|2)$/i.test(base)) side = "back";
    return { f, side };
  }
  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|avif)$/i.test(f.name));
    if (!files.length) { toast("No image files found in that drop."); return; }
    let firstId = "";
    for (const file of files) {
      const id = uid();
      const im = { id, name: file.name || "camera.jpg", size: file.size, type: file.type, added: new Date().toISOString(), scan: "", side: "", checks: null, overall: "", labelPos: "below" };
      S.images[id] = im; S.order.push(id);
      mem.blobs.set(id, file);
      mem.pending.add(id);
      if (!firstId) firstId = id;
    }
    saveState(); renderTray();
    for (const file of files) {
      const id = S.order.filter((i) => mem.blobs.get(i) === file)[0];
      const im = S.images[id]; if (!im) continue;
      try {
        await analyzeImage(im, file);
        await makeThumb(im);
        const g = guessFromName(im.name);
        if (g.f) assign(im, g.f.scan, g.side || null);
        else if (S.target && files.length === 1) assign(im, S.target, null);
        if (storage.idb) { const okPut = await idbPut("b:" + id, file); if (!okPut) storage.idb = false; }
      } catch (e) { im.error = "unreadable"; im.overall = "fail"; }
      mem.pending.delete(id);
      saveState(); renderTray();
      await new Promise((r) => setTimeout(r, 0));
    }
    if (firstId && S.images[firstId]) S.selected = firstId;
    saveState();
    renderStorageNote();
    renderAllButBench();
    toast(`${files.length} scan${files.length === 1 ? "" : "s"} checked on this device.`);
  }
  async function makeThumb(im) {
    const disp = mem.display.get(im.id); if (!disp) return;
    const c = scaled(disp, 220);
    const url = c.toDataURL("image/jpeg", 0.8);
    mem.thumbs.set(im.id, url);
    if (storage.idb) await idbPut("t:" + im.id, url);
  }
  async function removeImage(id) {
    const im = S.images[id]; if (!im) return;
    if (!window.confirm(`Remove ${im.name} from this session? The original file on your disk is not touched.`)) return;
    delete S.images[id]; S.order = S.order.filter((x) => x !== id);
    mem.blobs.delete(id); mem.thumbs.delete(id); mem.display.delete(id); analysisCache.delete(id);
    idbDel("b:" + id); idbDel("t:" + id);
    if (S.selected === id) S.selected = "";
    saveState(); renderAllButBench();
  }

  /* =======================================================================
     EXPORT (manifest + ZIP of crops)
     ======================================================================= */
  function outName(f, side, kind) {
    const ext = kind === "circle" || kind === "thumb" ? "png" : "jpg";
    const key = (f.scan || "X").replace(/[^A-Za-z0-9-]/g, "");
    return `${key}_${(f.ser || "noser").replace(/[^A-Za-z0-9-]/g, "")}/${key}_${side}_${kind}.${ext}`;
  }
  async function sha256(blob) {
    try { if (!crypto || !crypto.subtle) return null; const buf = await blob.arrayBuffer(); const h = await crypto.subtle.digest("SHA-256", buf); return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join(""); } catch (e) { return null; }
  }
  async function buildManifest(withHash) {
    const v = window.vault || {};
    const coins = [];
    const touched = new Set(Object.keys(S.coins).filter((k) => { const c = S.coins[k]; return c && (c.verified || c.reshoot || c.die_axis != null); }));
    S.order.forEach((id) => { const im = S.images[id]; if (im && im.scan) touched.add(im.scan); });
    for (const scan of Array.from(touched).sort()) {
      const f = flipBy(scan); if (!f) continue;
      const s = sidesOf(scan), st = statusOf(f), cs = S.coins[scan] || {};
      const sides = {};
      for (const side of ["front", "back"]) {
        const im = s[side]; if (!im) continue;
        const full = im.w && im.h ? absGeo(im.geo, im.w, im.h) : null;
        const lb = full ? labelRect(full, im.labelPos) : null;
        const blob = mem.blobs.get(im.id) || (await idbGet("b:" + im.id));
        sides[side] = {
          image_id: im.id, file_name: im.name, bytes: im.size, width: im.w, height: im.h,
          sha256: withHash && blob ? await sha256(blob) : null,
          overall: im.overall, kept_despite_fail: !!im.keep, placed_by_hand: !!im.manual,
          checks: (im.checks || []).map((c) => ({ id: c.id, level: c.level, value: c.value })),
          geometry_px: full ? {
            coin: { cx: Math.round(full.coin.cx), cy: Math.round(full.coin.cy), r: Math.round(full.coin.r) },
            flip_square: { x: Math.round(full.flip.x), y: Math.round(full.flip.y), size: Math.round(full.flip.s) },
            label: lb ? { x: Math.round(lb.x), y: Math.round(lb.y), w: Math.round(lb.w), h: Math.round(lb.h), position: im.labelPos || "below" } : null,
            white_point: im.wb ? { x: +im.wb.x.toFixed(4), y: +im.wb.y.toFixed(4) } : null,
          } : null,
          outputs: { master: outName(f, side, "master"), circle: outName(f, side, "circle"), thumb: outName(f, side, "thumb"), label: lb ? outName(f, side, "label") : null },
        };
      }
      coins.push({
        scan: f.scan, ser: f.ser || null, country: f.country || null, year: f.year || null, denom: f.denom || null,
        ledger_status: f.status || null, status: st,
        verified_at: cs.verified ? cs.verified_at || null : null,
        reshoot_reason: st === "Reshoot" ? reshootReason(f) : null,
        die_axis_deg: cs.die_axis != null ? cs.die_axis : null,
        sides,
      });
    }
    const unassigned = S.order.map((id) => S.images[id]).filter((im) => im && !im.scan).map((im) => ({ image_id: im.id, file_name: im.name, bytes: im.size, overall: im.overall || null }));
    const cols = board();
    return {
      kind: "titan-lab-session", version: 1,
      exported_at: new Date().toISOString(),
      app_build: window.TITAN_BUILD || null,
      ledger_version: v.ledger_version || null,
      method: "Deterministic on-device image analysis (histogram, Laplacian variance, threshold + connected components). No OCR, no AI. Verified = owner confirmed Side 1 label and Side 2 ser by eye.",
      privacy: "Generated in the browser. Images were never uploaded.",
      spec: {
        master: { canvas_px: SPEC.masterCanvas, flip_px: SPEC.masterFlip, note: "axis-aligned square crop scaled to 2400 px; no perspective warp in the browser" },
        circle: { px: SPEC.circle, coin_fraction: SPEC.circleFill, background: "transparent" },
        thumb: { px: SPEC.thumb }, label: { width_px: SPEC.label },
        masters_are_never_deleted: true,
      },
      summary: { flips: flips().length, logged: cols.Logged.length, photographed: cols.Photographed.length, verified: cols.Verified.length, reshoot: cols.Reshoot.length, scans: S.order.length, unassigned: unassigned.length },
      reshoot_requests: cols.Reshoot.map((f) => ({ scan: f.scan, ser: f.ser || null, reason: reshootReason(f) || "Reshoot requested" })),
      coins, unassigned,
    };
  }
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const stamp = () => new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);

  function toBlob(c, type, q) { return new Promise((res) => c.toBlob((b) => res(b), type, q)); }
  async function renderCrops(im, bmp) {
    const W = srcW(bmp), Hh = srcH(bmp);
    const geo = absGeo(im.geo, W, Hh);
    const out = {};
    // master: 2600 canvas, flip square scaled to 2400
    {
      const c = document.createElement("canvas"); c.width = c.height = SPEC.masterCanvas;
      const g = c.getContext("2d"); g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, c.width, c.height);
      g.imageSmoothingQuality = "high";
      const m = (SPEC.masterCanvas - SPEC.masterFlip) / 2;
      g.drawImage(bmp, geo.flip.x, geo.flip.y, geo.flip.s, geo.flip.s, m, m, SPEC.masterFlip, SPEC.masterFlip);
      out.master = await toBlob(c, "image/jpeg", 0.93);
    }
    // circle: 1200, coin at 86 %, transparent outside the coin
    let circ;
    {
      circ = document.createElement("canvas"); circ.width = circ.height = SPEC.circle;
      const g = circ.getContext("2d"); g.imageSmoothingQuality = "high";
      const half = geo.coin.r / SPEC.circleFill;
      g.save(); g.beginPath(); g.arc(SPEC.circle / 2, SPEC.circle / 2, (SPEC.circle * SPEC.circleFill) / 2, 0, Math.PI * 2); g.clip();
      g.drawImage(bmp, geo.coin.cx - half, geo.coin.cy - half, half * 2, half * 2, 0, 0, SPEC.circle, SPEC.circle);
      g.restore();
      out.circle = await toBlob(circ, "image/png");
    }
    {
      const c = document.createElement("canvas"); c.width = c.height = SPEC.thumb;
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(circ, 0, 0, SPEC.thumb, SPEC.thumb);
      out.thumb = await toBlob(c, "image/png");
    }
    const lb = labelRect(geo, im.labelPos);
    if (lb) {
      const c = document.createElement("canvas"); c.width = SPEC.label; c.height = Math.max(1, Math.round((lb.h / lb.w) * SPEC.label));
      const g = c.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = "high";
      g.drawImage(bmp, lb.x, lb.y, lb.w, lb.h, 0, 0, c.width, c.height);
      out.label = await toBlob(c, "image/jpeg", 0.9);
    }
    return out;
  }

  let exporting = false;
  function renderExport(msg) {
    const el = $("#lx-export-body"); if (!el) return;
    const assigned = S.order.map((id) => S.images[id]).filter((im) => im && im.scan);
    const hasZip = !!(window.fflate && window.fflate.zipSync);
    el.innerHTML = `
      <div class="lx-export">
        <div class="lx-export-copy">
          <p>The manifest lists every paired scan, its checks, the crop geometry in full-size pixels, reshoot requests and what you verified. Drop it in the Drive staging folder next to the scans.</p>
          <p class="lx-muted">Crops follow the protocol: master ${SPEC.masterCanvas} px (flip ${SPEC.masterFlip} px), coin circle ${SPEC.circle} px (coin ${Math.round(SPEC.circleFill * 100)} %), thumbnail ${SPEC.thumb} px, label ${SPEC.label} px wide.</p>
        </div>
        <div class="lx-export-btns">
          <button type="button" class="lx-btn lx-btn-gold" id="lx-exp-json"${exporting ? " disabled" : ""}>Download manifest (.json)</button>
          <button type="button" class="lx-btn" id="lx-exp-zip"${exporting || !assigned.length || !hasZip ? " disabled" : ""}>Download crops + manifest (.zip)</button>
          <label class="lx-tick"><input type="checkbox" id="lx-exp-orig" /> Include the original scans in the ZIP</label>
          <p class="lx-exp-msg" id="lx-exp-msg" role="status" aria-live="polite">${esc(msg || (assigned.length ? `${assigned.length} paired scan${assigned.length === 1 ? "" : "s"} ready.` : "Pair at least one scan to export crops."))}</p>
        </div>
      </div>
      <details class="lx-clear"><summary>Start a new session</summary>
        <p class="lx-muted">Clears the scans, pairings and ticks stored in this browser. Your original files and anything you exported are not touched.</p>
        <button type="button" class="lx-btn lx-btn-bad" id="lx-clear">Clear this session</button></details>`;
    $("#lx-exp-json")?.addEventListener("click", async () => {
      const m = await buildManifest(true);
      download(new Blob([JSON.stringify(m, null, 2)], { type: "application/json" }), `titan-lab-session_${stamp()}.json`);
      renderExport(`Manifest saved: ${m.coins.length} coin${m.coins.length === 1 ? "" : "s"}, ${m.reshoot_requests.length} reshoot request${m.reshoot_requests.length === 1 ? "" : "s"}.`);
    });
    $("#lx-exp-zip")?.addEventListener("click", () => exportZip($("#lx-exp-orig")?.checked));
    $("#lx-clear")?.addEventListener("click", async () => {
      if (!window.confirm("Clear this Lab session from this browser? Original files and exports are not touched.")) return;
      S = { images: {}, order: [], coins: {}, lastCountry: "", selected: "", country: S.country, target: "" };
      mem.blobs.clear(); mem.thumbs.clear(); mem.display.clear(); analysisCache.clear();
      await idbClear(); saveState(); renderAllButBench(); toast("Lab session cleared.");
    });
  }
  async function exportZip(withOriginals) {
    if (exporting || !(window.fflate && window.fflate.zipSync)) return;
    exporting = true; renderExport("Preparing…");
    const files = {};
    const enc = new TextEncoder();
    const assigned = S.order.map((id) => S.images[id]).filter((im) => im && im.scan && !im.error);
    let i = 0;
    try {
      for (const im of assigned) {
        i++;
        const f = flipBy(im.scan); if (!f) continue;
        const msg = $("#lx-exp-msg"); if (msg) msg.textContent = `Cropping ${i} of ${assigned.length}: ${serOf(f)} ${im.side}…`;
        const blob = mem.blobs.get(im.id) || (await idbGet("b:" + im.id)); if (!blob) continue;
        const bmp = await decode(blob);
        const out = await renderCrops(im, bmp);
        if (bmp.close) bmp.close();
        for (const k of Object.keys(out)) if (out[k]) files[outName(f, im.side, k)] = new Uint8Array(await out[k].arrayBuffer());
        if (withOriginals) files[outName(f, im.side, "original").replace(/\.jpg$/, "") + "_" + im.name.replace(/[^A-Za-z0-9._-]/g, "_")] = new Uint8Array(await blob.arrayBuffer());
        await new Promise((r) => setTimeout(r, 0));
      }
      const m = await buildManifest(true);
      files["manifest.json"] = enc.encode(JSON.stringify(m, null, 2));
      const zipped = window.fflate.zipSync(files, { level: 0 }); // images are already compressed
      download(new Blob([zipped], { type: "application/zip" }), `titan-lab-session_${stamp()}.zip`);
      exporting = false;
      renderExport(`ZIP saved: ${Object.keys(files).length - 1} files + manifest (${fmtBytes(zipped.length)}).`);
    } catch (e) {
      exporting = false;
      renderExport("Export failed: " + (e && e.message ? e.message : "out of memory?") + " Try fewer scans at a time.");
    }
  }

  /* =======================================================================
     BENCH TOOLS: optics, lighting, die axis (rebuilt)
     ======================================================================= */
  const SENSORS = [
    { id: "ff", name: "Full frame (36 × 24 mm)", w: 36, h: 24, coc: 0.030 },
    { id: "apsc", name: "APS-C (23.5 × 15.6 mm)", w: 23.5, h: 15.6, coc: 0.020 },
    { id: "mft", name: "Micro Four Thirds (17.3 × 13 mm)", w: 17.3, h: 13, coc: 0.015 },
    { id: "one", name: "1-inch (13.2 × 8.8 mm)", w: 13.2, h: 8.8, coc: 0.011 },
  ];
  const LIGHTS = [
    { id: "diffuse", name: "Two soft lamps at 45°", tag: "Start here", use: "Everyday scans of flips and coins.",
      steps: ["Two lamps left and right, about 45° above the coin.", "Put tracing paper or a diffuser in front of each.", "Tilt them until the mylar window shows no bright reflection in the viewfinder."],
      svg: `<ellipse cx="60" cy="62" rx="26" ry="7"/><rect x="52" y="8" width="16" height="14" rx="2"/><path d="M60 22v30"/><path d="M14 20l30 36M106 20L76 56" stroke-dasharray="3 3"/><circle cx="12" cy="18" r="6"/><circle cx="108" cy="18" r="6"/>` },
    { id: "cross", name: "Cross-polarised", tag: "Beats mylar glare", use: "Flips with shiny mylar or slabs that throw reflections.",
      steps: ["Polariser film on each lamp, all turned the same way.", "Circular polariser on the lens.", "Turn the lens polariser until the glare disappears; the glare check should go green."],
      svg: `<ellipse cx="60" cy="62" rx="26" ry="7"/><rect x="52" y="8" width="16" height="14" rx="2"/><path d="M50 26h20" stroke-width="3"/><path d="M60 22v30"/><path d="M14 20l30 36M106 20L76 56" stroke-dasharray="3 3"/><circle cx="12" cy="18" r="6"/><circle cx="108" cy="18" r="6"/><path d="M6 10l12 16M102 10l12 16"/>` },
    { id: "oblique", name: "Low raking light", tag: "Worn detail", use: "Worn dates, die cracks and doubling. Not for the master scan.",
      steps: ["One lamp low, about 15° above the table, from 10 or 2 o'clock.", "Shadows now show relief; turn the coin to catch the date.", "Use it for a detail shot, then go back to soft light for the master."],
      svg: `<ellipse cx="60" cy="62" rx="26" ry="7"/><rect x="52" y="8" width="16" height="14" rx="2"/><path d="M60 22v30"/><path d="M8 52l30 8" stroke-dasharray="3 3"/><circle cx="6" cy="51" r="6"/>` },
    { id: "axial", name: "Axial (beam splitter)", tag: "Proofs only", use: "Mirror-finish proof coins out of the flip. Glass through mylar doubles reflections.",
      steps: ["Clear glass at 45° between lens and coin.", "Lamp to the side, bouncing down through the glass.", "Only for bare proofs: take them out of the flip first."],
      svg: `<ellipse cx="60" cy="62" rx="26" ry="7"/><rect x="52" y="4" width="16" height="12" rx="2"/><path d="M60 16v36"/><path d="M44 42l32-18"/><path d="M104 33H62" stroke-dasharray="3 3"/><circle cx="108" cy="33" r="6"/>` },
  ];

  function renderBench() {
    if (!bench) return;
    const ls = (() => { try { return JSON.parse(localStorage.getItem("tr_lab_bench_v1") || "{}"); } catch (e) { return {}; } })();
    const opt = Object.assign({ sensor: "ff", focal: 100, N: 8, m: 1, relief: 1, coin: 30.6 }, ls.opt || {});
    const light = ls.light || "diffuse";
    bench.innerHTML = `
      <section id="lx-bench" class="lx-sec lx-bench reveal" aria-labelledby="lx-bench-h">
        <div class="lx-sec-head"><span class="lx-eyebrow">Bench tools</span><h3 id="lx-bench-h">Optics, light and die axis</h3></div>

        <div class="lx-tool" id="lx-optics">
          <div class="lx-tool-h"><h4>Macro optics &amp; scanner resolution</h4><p class="lx-muted">What your camera or scanner needs to meet the Phase-2 sizes.</p></div>
          <div class="lx-form">
            <label><span>Sensor</span><select data-o="sensor">${SENSORS.map((s) => `<option value="${s.id}"${s.id === opt.sensor ? " selected" : ""}>${s.name}</option>`).join("")}</select></label>
            <label><span>Lens focal length</span><select data-o="focal">${[50, 60, 90, 100, 105, 180].map((v) => `<option value="${v}"${+opt.focal === v ? " selected" : ""}>${v} mm</option>`).join("")}</select></label>
            <label><span>Aperture on the lens</span><select data-o="N">${[2.8, 4, 5.6, 8, 11, 16, 22].map((v) => `<option value="${v}"${+opt.N === v ? " selected" : ""}>f/${v}</option>`).join("")}</select></label>
            <label><span>Magnification</span><select data-o="m">${[[0.25, "1:4 (0.25×)"], [0.5, "1:2 (0.5×)"], [0.75, "1:1.3 (0.75×)"], [1, "1:1 (life size)"], [1.5, "1.5:1"], [2, "2:1"]].map(([v, t]) => `<option value="${v}"${+opt.m === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
            <label><span>Relief to cover</span><select data-o="relief">${[[0.5, "0.5 mm (flat modern)"], [1, "1 mm (typical)"], [2, "2 mm (high relief)"], [3, "3 mm (coin in flip + mylar)"]].map(([v, t]) => `<option value="${v}"${+opt.relief === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
            <label><span>Coin diameter (mm)</span><input type="number" inputmode="decimal" min="8" max="60" step="0.1" data-o="coin" value="${opt.coin}" /></label>
          </div>
          <div class="lx-results-grid" id="lx-opt-out"></div>
          <p class="lx-opt-note" id="lx-opt-note" role="status"></p>
        </div>

        <div class="lx-tool" id="lx-light">
          <div class="lx-tool-h"><h4>Lighting setups</h4><p class="lx-muted">Pick one; the steps follow. If the Glare check fails, try cross-polarised.</p></div>
          <div class="lx-lights" role="radiogroup" aria-label="Lighting setup">
            ${LIGHTS.map((l) => `<button type="button" class="lx-light" role="radio" aria-checked="${l.id === light}" data-light="${l.id}">
              <svg viewBox="0 0 120 72" aria-hidden="true">${l.svg}</svg>
              <span class="lx-light-tag">${l.tag}</span><strong>${l.name}</strong><span class="lx-light-use">${l.use}</span></button>`).join("")}
          </div>
          <ol class="lx-light-steps" id="lx-light-steps"></ol>
        </div>

        <div class="lx-tool" id="lx-die">
          <div class="lx-tool-h"><h4>Die axis</h4><p class="lx-muted">Turn the back until it sits upright. Most coins are 180° (coin turn); many European and medal strikes are 0° (medal turn).</p></div>
          <div class="lx-die">
            <canvas id="lx-die-cv" width="300" height="300" aria-label="Front and back overlay for die-axis measurement"></canvas>
            <div class="lx-die-ctl">
              <div class="lx-die-read"><span class="lx-die-deg" id="lx-die-deg">180°</span><span class="lx-die-clock" id="lx-die-clock">6 o'clock</span></div>
              <label class="lx-slide"><span>Back rotation</span><input type="range" id="lx-die-rot" min="0" max="359" step="1" value="180" /></label>
              <label class="lx-slide"><span>Show back</span><input type="range" id="lx-die-mix" min="0" max="100" step="1" value="50" /></label>
              <div class="lx-row">
                <button type="button" class="lx-btn" data-die="180">Coin turn 180°</button>
                <button type="button" class="lx-btn" data-die="0">Medal turn 0°</button>
              </div>
              <div class="lx-row" id="lx-die-src"></div>
              <p class="lx-die-verdict" id="lx-die-verdict" role="status"></p>
            </div>
          </div>
        </div>
      </section>`;
    bindBench(opt, light);
  }

  function bindBench(opt, light) {
    const save = () => { try { localStorage.setItem("tr_lab_bench_v1", JSON.stringify({ opt, light })); } catch (e) { /* ignore */ } };
    const calc = () => {
      const s = SENSORS.find((x) => x.id === opt.sensor) || SENSORS[0];
      const f = +opt.focal, N = +opt.N, m = +opt.m, c = s.coc, relief = +opt.relief, coin = +opt.coin || 30;
      const dof = (2 * N * c * (m + 1)) / (m * m);
      const nEff = N * (1 + m);
      const airy = 2.44 * 0.00055 * nEff; // mm, green light
      const dist = (f * (m + 1) * (m + 1)) / m; // subject to sensor
      const slices = Math.max(1, Math.ceil(relief / (dof * 0.8)));
      const field = { w: s.w / m, h: s.h / m };
      const mFlip = (s.h * (SPEC.masterFlip / SPEC.masterCanvas)) / FLIP_MM;
      const dpiFlip = Math.ceil(SPEC.masterFlip / (FLIP_MM / 25.4));
      const dpiCoin = Math.ceil((SPEC.circle * SPEC.circleFill) / (coin / 25.4));
      const dLvl = airy <= c ? "pass" : airy <= c * 1.5 ? "warn" : "fail";
      const out = $("#lx-opt-out");
      const cell = (l, v, sub, lvl) => `<div class="lx-res${lvl ? " lx-" + lvl : ""}"><span class="lx-res-l">${l}</span><span class="lx-res-v">${v}</span>${sub ? `<span class="lx-res-s">${sub}</span>` : ""}</div>`;
      if (out) out.innerHTML = [
        cell("Depth of field", dof < 1 ? (dof * 1000).toFixed(0) + " µm" : dof.toFixed(2) + " mm", `${slices === 1 ? "One shot covers the relief" : slices + " focus-stack shots for " + relief + " mm"}`),
        cell("Effective aperture", "f/" + (Math.round(nEff * 10) / 10), `Light loss ${(Math.log2((1 + m) * (1 + m))).toFixed(1)} stops`),
        cell("Diffraction blur", (airy * 1000).toFixed(0) + " µm", `Sensor limit ${(c * 1000).toFixed(0)} µm`, dLvl),
        cell("Subject to sensor", Math.round(dist) + " mm", "Approximate, thin-lens"),
        cell("Field of view", `${field.w.toFixed(1)} × ${field.h.toFixed(1)} mm`, field.h >= FLIP_MM ? "A 2×2 flip fits" : field.h >= coin ? "Coin fits; flip doesn't" : "Coin doesn't fit", field.h >= coin ? "" : "warn"),
        cell("Scanner setting", dpiFlip + " dpi", `Flip master needs ${dpiFlip} dpi; the coin circle needs ${dpiCoin} dpi`),
      ].join("");
      const note = $("#lx-opt-note");
      if (note) {
        note.className = "lx-opt-note lx-" + dLvl;
        note.textContent = dLvl === "pass" ? `Sharp: diffraction stays below what the sensor resolves. To frame a whole 2×2 flip, use about ${mFlip.toFixed(2)}× on this sensor.`
          : dLvl === "warn" ? `Slight diffraction softening at f/${Math.round(nEff * 10) / 10} effective. Open up one stop (to f/${Math.max(2.8, N / 1.41).toFixed(1)}) and stack if you need more depth.`
            : `Diffraction is softening the image. Open the aperture to about f/${Math.max(2.8, N / 2).toFixed(1)} and focus-stack instead of stopping down.`;
      }
    };
    $$("#lx-optics [data-o]").forEach((el) => el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => { opt[el.dataset.o] = el.dataset.o === "sensor" ? el.value : parseFloat(el.value); calc(); save(); }));
    calc();

    const showLight = () => {
      const l = LIGHTS.find((x) => x.id === light) || LIGHTS[0];
      $$("#lx-light [data-light]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.light === light)));
      const st = $("#lx-light-steps"); if (st) st.innerHTML = l.steps.map((s) => `<li>${esc(s)}</li>`).join("");
    };
    $$("#lx-light [data-light]").forEach((b) => {
      b.addEventListener("click", () => { light = b.dataset.light; showLight(); save(); click(); });
      b.addEventListener("keydown", (e) => {
        if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
        e.preventDefault(); const i = LIGHTS.findIndex((x) => x.id === light);
        const n = LIGHTS[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : LIGHTS.length - 1)) % LIGHTS.length];
        light = n.id; showLight(); save(); $(`#lx-light [data-light="${n.id}"]`)?.focus();
      });
    });
    showLight();
    bindDie();
  }

  /* Die axis: draws the selected coin's own crops when both sides are available. */
  let dieImgs = null; // { front: canvas, back: canvas, scan }
  function dieSource() {
    const im = S.images[S.selected]; const f = im && flipBy(im.scan);
    if (!f) return null;
    const s = sidesOf(f.scan);
    if (!s.front || !s.back || !mem.display.get(s.front.id) || !mem.display.get(s.back.id)) return null;
    return { f, s };
  }
  function coinCanvas(im, size) {
    const disp = mem.display.get(im.id); if (!disp) return null;
    const geo = absGeo(im.geo, disp.width, disp.height);
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d");
    g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip();
    g.drawImage(disp, geo.coin.cx - geo.coin.r, geo.coin.cy - geo.coin.r, geo.coin.r * 2, geo.coin.r * 2, 0, 0, size, size);
    return c;
  }
  function bindDie() {
    const cv = $("#lx-die-cv"), rot = $("#lx-die-rot"), mix = $("#lx-die-mix");
    if (!cv || !rot || !mix) return;
    const srcRow = $("#lx-die-src");
    const src = dieSource();
    if (srcRow) {
      srcRow.innerHTML = src
        ? `<button type="button" class="lx-btn${dieImgs && dieImgs.scan === src.f.scan ? " is-on" : ""}" id="lx-die-use">${dieImgs && dieImgs.scan === src.f.scan ? "Showing " : "Use scans of "}${esc(serOf(src.f))}</button>
           ${dieImgs && dieImgs.scan === src.f.scan ? `<button type="button" class="lx-btn lx-btn-gold" id="lx-die-save">Save ${esc(rot.value)}° to ${esc(serOf(src.f))}</button>` : ""}`
        : `<span class="lx-muted lx-small">Pair a front and back, select one of them, and this tool will overlay the real coin.</span>`;
      $("#lx-die-use")?.addEventListener("click", () => {
        const s2 = dieSource(); if (!s2) return;
        dieImgs = { scan: s2.f.scan, front: coinCanvas(s2.s.front, 520), back: coinCanvas(s2.s.back, 520) };
        const saved = (S.coins[s2.f.scan] || {}).die_axis; if (saved != null) rot.value = saved;
        bindDie(); draw();
      });
      $("#lx-die-save")?.addEventListener("click", () => {
        if (!dieImgs) return;
        S.coins[dieImgs.scan] = Object.assign({}, S.coins[dieImgs.scan], { die_axis: +rot.value });
        saveState(); toast(`Die axis ${rot.value}° saved for ${serOf(flipBy(dieImgs.scan))}. It goes into the manifest.`);
      });
    }
    const draw = () => {
      const size = Math.min(300, (cv.parentElement && cv.parentElement.clientWidth) || 300);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = size + "px"; cv.style.height = size + "px";
      cv.width = size * dpr; cv.height = size * dpr;
      const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = size / 2, cy = size / 2, R = size * 0.36;
      const gold = cssVar("--gold", "#c8a94a"), ink = cssVar("--ink", "#eee"), muted = cssVar("--muted", "#999"), surf = cssVar("--surface2", "#161310"), line = cssVar("--line-strong", "rgba(200,169,74,.3)");
      const a = +rot.value, k = +mix.value / 100;
      g.clearRect(0, 0, size, size);
      // dial
      g.strokeStyle = line; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, R + 16, 0, Math.PI * 2); g.stroke();
      for (let h = 0; h < 12; h++) {
        const ang = (h * 30 - 90) * Math.PI / 180, major = h % 3 === 0;
        g.strokeStyle = major ? gold : muted; g.lineWidth = major ? 2 : 1;
        g.beginPath(); g.moveTo(cx + Math.cos(ang) * (R + 16), cy + Math.sin(ang) * (R + 16)); g.lineTo(cx + Math.cos(ang) * (R + (major ? 7 : 11)), cy + Math.sin(ang) * (R + (major ? 7 : 11))); g.stroke();
      }
      g.fillStyle = ink; g.font = `600 ${Math.round(size * 0.045)}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("12", cx, cy - R - 28); g.fillText("6", cx, cy + R + 28); g.fillText("3", cx + R + 28, cy); g.fillText("9", cx - R - 28, cy);
      // front
      g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
      g.fillStyle = surf; g.fillRect(cx - R, cy - R, R * 2, R * 2);
      if (dieImgs && dieImgs.front) { g.drawImage(dieImgs.front, cx - R, cy - R, R * 2, R * 2); }
      else {
        g.globalAlpha = 1; g.fillStyle = gold; g.globalAlpha = 0.85;
        g.beginPath(); g.arc(cx, cy - R * 0.18, R * 0.24, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(cx - R * 0.38, cy + R * 0.45); g.quadraticCurveTo(cx, cy - R * 0.05, cx + R * 0.38, cy + R * 0.45); g.closePath(); g.fill();
      }
      // back, rotated
      g.globalAlpha = k;
      g.translate(cx, cy); g.rotate(a * Math.PI / 180);
      if (dieImgs && dieImgs.back) g.drawImage(dieImgs.back, -R, -R, R * 2, R * 2);
      else {
        g.fillStyle = ink;
        g.beginPath(); g.moveTo(0, -R * 0.42); g.lineTo(R * 0.32, -R * 0.06); g.lineTo(R * 0.18, R * 0.16); g.lineTo(0, R * 0.05); g.lineTo(-R * 0.18, R * 0.16); g.lineTo(-R * 0.32, -R * 0.06); g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
      // back's "up" arrow
      g.strokeStyle = gold; g.fillStyle = gold; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -R + 12); g.stroke();
      g.beginPath(); g.moveTo(0, -R + 2); g.lineTo(-7, -R + 16); g.lineTo(7, -R + 16); g.closePath(); g.fill();
      g.restore();
      g.strokeStyle = gold; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();

      const clock = Math.round(a / 30) % 12 || 12;
      $("#lx-die-deg").textContent = a + "°";
      $("#lx-die-clock").textContent = `${clock} o'clock`;
      const dCoin = Math.min(Math.abs(a - 180), 360 - Math.abs(a - 180));
      const dMedal = Math.min(a, 360 - a);
      const v = $("#lx-die-verdict");
      if (v) {
        if (dCoin <= 15) { v.className = "lx-die-verdict lx-pass"; v.textContent = dCoin ? `Coin alignment, ${dCoin}° off exact. Within normal tolerance.` : "Coin alignment (↑↓). Normal for most coins."; }
        else if (dMedal <= 15) { v.className = "lx-die-verdict lx-pass"; v.textContent = dMedal ? `Medal alignment, ${dMedal}° off exact. Within normal tolerance.` : "Medal alignment (↑↑). Normal for many European coins and medals."; }
        else { v.className = "lx-die-verdict lx-warn"; v.textContent = `Rotated die: ${Math.min(dCoin, dMedal)}° from the nearest standard. Worth a second look; graders note rotations of about 15° or more.`; }
      }
      const saveBtn = $("#lx-die-save"); if (saveBtn && dieImgs) saveBtn.textContent = `Save ${a}° to ${serOf(flipBy(dieImgs.scan))}`;
    };
    rot.oninput = draw; mix.oninput = draw;
    $$("#lx-die [data-die]").forEach((b) => { b.onclick = () => { rot.value = b.dataset.die; draw(); click(); }; });
    draw();
  }

  /* =======================================================================
     WIRING
     ======================================================================= */
  function renderAllButBench(keepScroll) {
    const y = keepScroll ? window.scrollY : null;
    renderBoard(); renderTray(); renderInspector(); renderExport();
    if (bench) bindDie();
    if (y != null) window.scrollTo(0, y);
  }

  function bindRoot() {
    const ws = $("#lab-ws");
    ws.addEventListener("click", (e) => {
      const j = e.target.closest("[data-jump]");
      if (j) { e.preventDefault(); const t = document.getElementById(j.dataset.jump); if (t) t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); return; }
      const sel = e.target.closest("[data-sel]");
      if (sel) { S.selected = sel.dataset.sel; wbMode = false; saveState(); renderTray(); renderInspector(); if (bench) bindDie(); if (window.innerWidth < 900) $("#lx-inspect")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); return; }
      const pick = e.target.closest("[data-pick]");
      if (pick) {
        const f = flipBy(pick.dataset.pick); if (!f) return;
        const im = S.images[S.selected];
        if (im && !im.scan) { assign(im, f.scan, null); toast(`${im.name} paired with ${serOf(f)} (${im.side}).`); }
        else { S.target = f.scan; S.selected = S.order.find((id) => S.images[id] && S.images[id].scan === f.scan) || S.order.find((id) => S.images[id] && !S.images[id].scan) || ""; toast(`Working on ${serOf(f)}. Add or pick its scans.`); }
        S.lastCountry = f.country || S.lastCountry;
        saveState(); renderAllButBench();
        $("#lx-inspect")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
        return;
      }
      const as = e.target.closest("[data-assign]");
      if (as) { const im = S.images[S.selected]; if (!im) return; assign(im, as.dataset.assign, null); click(); renderAllButBench(true); return; }
      const d = e.target.closest("[data-dossier]");
      if (d) { const fn = H.openDrawer; if (fn) fn(d.dataset.dossier); return; }
    });
    ws.addEventListener("change", (e) => {
      if (e.target.id === "lx-country") { S.country = e.target.value; saveState(); renderBoard(); }
      if (e.target.id === "lx-file" || e.target.id === "lx-cam") { const fl = e.target.files; if (fl && fl.length) addFiles(fl); e.target.value = ""; }
    });
    const drop = $("#lx-drop");
    drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#lx-file").click(); } });
    drop.addEventListener("click", (e) => { if (e.target === drop || e.target.closest(".lx-drop-txt, .lx-drop-ico")) $("#lx-file").click(); });
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); if (t === "dragleave" && drop.contains(e.relatedTarget)) return; drop.classList.remove("is-over"); }));
    drop.addEventListener("drop", (e) => { const fl = e.dataTransfer && e.dataTransfer.files; if (fl && fl.length) addFiles(fl); });
  }

  let restored = false;
  async function restore() {
    if (restored) return; restored = true;
    await openDb();
    renderStorageNote();
    if (!db) return;
    for (const id of S.order) {
      const t = await idbGet("t:" + id);
      if (t) mem.thumbs.set(id, t);
    }
    // images whose blobs are gone (e.g. storage cleared) stay listed with an error
    renderTray();
    if (S.selected) renderInspector();
  }

  let resizeT = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (document.getElementById("lx-canvas")) drawStage(); if (document.getElementById("lx-die-cv")) bindDie(); }, 150); });

  function mount(helpers) {
    H = Object.assign(H, helpers || {});
    indexFlips();
    const ws = $("#lab-ws");
    bench = $("#lab-bench");
    if (!ws) return false;
    root = ws;
    ws.classList.add("lx-root");
    ws.innerHTML = shell();
    bindRoot();
    renderStorageNote();
    renderAllButBench();
    renderBench();
    restore();
    // theme switch -> redraw canvases with new tokens
    try {
      if (!mount._mo) {
        mount._mo = new MutationObserver(() => { drawStage(); if (document.getElementById("lx-die-cv")) bindDie(); });
        mount._mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-atmo", "data-theme"] });
      }
    } catch (e) { /* ignore */ }
    return true;
  }

  loadState();
  window.TitanLab = {
    mount,
    SPEC,
    // test hooks (deterministic analysis; used by the QA scripts)
    _analyzeBlob: async (blob, name) => { const im = { id: uid(), name: name || "test", size: blob.size, geo: null, labelPos: "below" }; await analyzeImage(im, blob); mem.display.delete(im.id); analysisCache.delete(im.id); return { overall: im.overall, checks: im.checks, det: im.det, sharp: im.sharp, w: im.w, h: im.h }; },
    _addFiles: addFiles,
    _state: () => S,
    _manifest: () => buildManifest(false),
  };
  // If the app rendered the lab before this file loaded, mount now.
  if (document.getElementById("lab-ws") && !document.querySelector("#lab-ws .lx-nav")) mount({});
})();
