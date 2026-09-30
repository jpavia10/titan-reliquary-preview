/* Titan Reliquary · Gallery wing: Finder, faceted wall, palette v2, dossier v2.
   Plan + status: notes/agents/gallery.md.

   How it plugs into app.js (window.__galleryBridge, defined next to renderGallery):
     render()    -> replaces renderGallery(); builds the wing shell once, then updates only what changed
     filtered()  -> the one filtered + sorted list; filteredFlips() returns it, so the Cover Flow, the
                    dossier prev/next and the 3D table all see exactly what the wall shows
     palette()   -> renderPalette() (Ctrl/Cmd+K), dossier() -> body of the flip dossier
   If this file fails to load, or one of them throws, app.js falls back to its classic code.

   Honesty rule: every number and label here is read from data/index.json (flips) or, for the Metal
   facet, from the ledger's per-country detail files. A missing field shows as "not recorded". */
(function () {
  "use strict";
  const B = window.__galleryBridge;
  if (!B || B.v !== 1) return;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => B.esc(s);
  const intFmt = (n) => B.intFmt(n);
  const money = (n) => B.money(n);
  const REDUCED = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ══════════════════════════ vocabulary ══════════════════════════ */
  const PHONE = () => !!(window.matchMedia && window.matchMedia("(max-width: 700px)").matches);
  const batchSize = () => (PHONE() ? 12 : 24); // wall tiles added per batch
  const FACETS = ["cont", "country", "era", "metal", "val", "type", "conf"];
  const FACET_LABEL = { cont: "Continent", country: "Country", era: "Decade", metal: "Metal", val: "Value", type: "Type", conf: "Confidence" };
  const STAGING = new Set(["C114", "C223", "C073", "C066", "C065"]); // the Phase 2 staging album (Lab)

  const SORTS = [
    { id: "added", label: "Recently added", key: "scan", dir: -1 },
    { id: "year", label: "Year, oldest first", key: "year", dir: 1 },
    { id: "yeard", label: "Year, newest first", key: "year", dir: -1 },
    { id: "value", label: "Value, high to low", key: "est", dir: -1 },
    { id: "valuea", label: "Value, low to high", key: "est", dir: 1 },
    { id: "country", label: "Country, A to Z", key: "country", dir: 1 },
    { id: "ser", label: "SER", key: "ser", dir: 1 },
    { id: "asw", label: "Silver weight", key: "asw_oz", dir: -1 },
  ];
  const DEFAULT_SORT = "added";

  const VALUE_BANDS = [
    { id: "u50", label: "Under $0.50", test: (v) => v < 0.5 },
    { id: "u1", label: "$0.50 to $0.99", test: (v) => v >= 0.5 && v < 1 },
    { id: "u3", label: "$1 to $2.99", test: (v) => v >= 1 && v < 3 },
    { id: "u10", label: "$3 to $9.99", test: (v) => v >= 3 && v < 10 },
    { id: "o10", label: "$10 and up", test: (v) => v >= 10 },
  ];
  const TYPE_LABEL = { coin: "Coins", token: "Tokens" };
  const CONF_LABEL = { high: "High", med: "Medium", low: "Low", none: "Not recorded" };
  const METAL_ORDER = ["Silver", "Gold", "Copper-nickel", "Nickel", "Bronze, brass & copper", "Aluminum", "Plated steel", "Steel & iron", "Bimetallic", "Other"];

  /** One-tap views. Each one resets the filters first, so its count is exactly what the wall then shows. */
  const PRESETS = [
    { id: "all", label: "All coins", set: {}, sort: DEFAULT_SORT },
    { id: "crown", label: "Crown Jewels", hint: "12 most valuable", set: { top: 12 }, sort: "value" },
    { id: "silver", label: "Silver reserves", set: { metal: "Silver" }, sort: "asw" },
    { id: "timeline", label: "Timeline", set: {}, sort: "year" },
  ];

  /* ══════════════════════════ ledger data ══════════════════════════ */
  let lastVault = null;
  let epoch = 0; // bumps when the data a list depends on changes (new snapshot, metals loaded)
  let descs = [];
  let structKey = ""; // when this changes the facet chips are rebuilt
  const metalText = new Map(); // scan -> ledger "metal" note (detail files)
  let metalState = "idle"; // idle | loading | ready | failed
  let metalBucketsFailed = 0;

  function yearNum(y) {
    const s = String(y == null ? "" : y);
    if (/\bAH\b/i.test(s)) { const m = /\((\d{4})\)/.exec(s); if (m) return +m[1]; }
    const n = /(\d{4})/.exec(s);
    return n ? +n[1] : null;
  }
  function valBand(est) {
    if (est == null || est === "" || isNaN(+est)) return "none";
    const v = +est;
    const b = VALUE_BANDS.find((x) => x.test(v));
    return b ? b.id : "none";
  }

  function ensureData() {
    const v = B.vault;
    if (!v || !v.flips) return false;
    if (v !== lastVault) {
      lastVault = v;
      metalText.clear(); metalState = "idle"; metalBucketsFailed = 0;
      descs = v.flips.map((f) => {
        const yr = yearNum(f.year);
        const est = f.est == null || f.est === "" || isNaN(+f.est) ? null : +f.est;
        return {
          f, scan: f.scan, yr, est,
          cont: f.continent || "", country: f.country || "",
          era: yr == null ? "nd" : String(Math.floor(yr / 10) * 10),
          val: valBand(f.est), type: f.kind === "token" ? "token" : "coin",
          conf: f.conf ? String(f.conf).toLowerCase() : "none",
          added: String(f.added || ""), sn: B.scanNum(f.scan),
          asw: f.asw_oz == null || isNaN(+f.asw_oz) ? null : +f.asw_oz,
        };
      });
      epoch++;
      // renderAll() + restoreUi() run in this same task: after them a stale link must not override later filter changes.
      if (pendingView) Promise.resolve().then(() => { pendingView = null; });
    }
    return true;
  }

  /** Group the ledger's free-text metal note into a handful of families (first phrase only). */
  function metalGroup(text, f) {
    if (f && f.is_gold) return "Gold";
    const t = String(text || "").split("·")[0].toLowerCase();
    if (f && f.is_silver) return "Silver";
    if (/\bsilver\b|sterling|\bag\b/.test(t)) return "Silver";
    if (/\bgold\b/.test(t) && !/nordic/.test(t)) return "Gold";
    if (/bimetal/.test(t)) return "Bimetallic";
    if (/plated|clad/.test(t) && /steel/.test(t)) return "Plated steel";
    if (/stainless|acmonital|\biron\b|steel/.test(t)) return "Steel & iron";
    if (/cupronickel|cuni|cu-ni|copper-nickel|copper nickel|magnimat/.test(t)) return "Copper-nickel";
    if (/alumin/.test(t) && !/bronze|brass|nordic/.test(t)) return "Aluminum";
    if (/bronze|brass|copper|nordic|\bcu\b/.test(t)) return "Bronze, brass & copper";
    if (/nickel/.test(t)) return "Nickel";
    return t.trim() ? "Other" : null;
  }
  function metalOf(d) {
    if (d.f.is_gold) return "Gold";
    if (d.f.is_silver) return "Silver";
    const t = metalText.get(d.scan) ?? (d.f._full ? d.f.metal : undefined);
    if (t === undefined) return null; // not loaded yet
    return metalGroup(t, d.f) || "Other";
  }

  /** The Metal facet needs the ledger's per-country detail files (about 580 KB in all); fetched once, in the background. */
  async function loadMetals() {
    if (metalState !== "idle" || !lastVault) return;
    metalState = "loading";
    const vaultAtStart = lastVault;
    const buckets = [...new Set(lastVault.flips.map((f) => f.d || "_misc"))];
    const queue = buckets.slice();
    const worker = async () => {
      while (queue.length) {
        const b = queue.shift();
        try {
          let j = B.details.get(b);
          if (!j) { j = await B.fetchJson(`data/detail/${encodeURIComponent(b)}.json`); B.details.set(b, j); }
          for (const scan of Object.keys(j || {})) if (j[scan] && typeof j[scan].metal === "string") metalText.set(scan, j[scan].metal);
        } catch (e) { metalBucketsFailed++; }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (vaultAtStart !== lastVault) return; // snapshot changed while loading
    metalState = metalBucketsFailed ? "failed" : "ready";
    epoch++;
    if (galleryActive()) schedule(0);
  }

  /* ══════════════════════════ state (kept in app.js's flipFilter / flipSort) ══════════════════════════ */
  const EXTRA = ["cont", "era", "metal", "val", "type", "conf"];
  function readF() {
    const f = B.filter || {};
    return {
      q: f.q || "", cont: f.cont || "", country: f.country || "", iso: f.iso || "", year: f.year || "",
      era: f.era || "", metal: f.metal || "", val: f.val || "", type: f.type || "", conf: f.conf || "",
      top: +f.top || 0, staging: !!f.staging, p2: !!f.phase2,
    };
  }
  function setF(patch) {
    const f = B.filter;
    for (const k of Object.keys(patch)) {
      if (k === "p2") f.phase2 = !!patch[k];
      else f[k] = patch[k];
    }
  }
  function clearFilters() {
    setF({ q: "", cont: "", country: "", iso: "", year: "", era: "", metal: "", val: "", type: "", conf: "", top: 0, staging: false, p2: false });
    B.filter.silverOnly = false;
  }
  function sortId() {
    const s = B.sort || {};
    const hit = SORTS.find((x) => x.key === s.key && x.dir === s.dir);
    if (hit) return hit.id;
    if (s.key === "value") return s.dir === 1 ? "valuea" : "value";
    if (s.key === "asw") return "asw";
    return DEFAULT_SORT;
  }
  function setSort(id) {
    const s = SORTS.find((x) => x.id === id) || SORTS[0];
    B.sort = { key: s.key, dir: s.dir };
  }
  function anyFilter(F) {
    return !!(F.q.trim() || F.cont || F.country || F.iso || F.year || F.era || F.metal || F.val || F.type || F.conf || F.top || F.staging || F.p2);
  }

  let lastFilterObj = null;
  /** Read the app's state before each render: fold legacy flags in and notice when other code replaced the filters. */
  function syncFromApp() {
    const f = B.filter;
    if (lastFilterObj && f !== lastFilterObj) {
      // Other code (World map, Lab, Study shortcuts) swapped the whole object: its filters win, ours reset.
      for (const k of EXTRA) f[k] = "";
      f.top = 0;
    }
    lastFilterObj = f;
    if (pendingView) applyView(pendingView);
    if (f.silverOnly) { f.silverOnly = false; f.metal = "Silver"; }
    B.tray = "all";
  }

  /* ══════════════════════════ shareable views (URL hash) ══════════════════════════
     #gallery?cont=Europe&era=1960&sort=year  ·  restored on load and on hashchange, kept in the address
     bar while browsing (replaceState, so Back is not flooded), and copied by the "Copy link" button. */
  const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
  function parseView(qs) {
    let p;
    try { p = new URLSearchParams(qs); } catch (e) { return null; }
    const v = {};
    const txt = (k, n) => { const x = p.get(k); if (x != null && x.trim() !== "") v[k] = clip(x.trim(), n || 60); };
    txt("q", 80); txt("cont"); txt("country"); txt("iso", 6); txt("metal");
    const y = p.get("year"); if (y && /^[\d\s\-–]{1,9}$/.test(y.trim())) v.year = y.trim();
    const era = p.get("era"); if (era && /^(\d{3}0|nd)$/.test(era)) v.era = era;
    const val = p.get("val"); if (val && (val === "none" || VALUE_BANDS.some((b) => b.id === val))) v.val = val;
    const type = p.get("type"); if (type === "coin" || type === "token") v.type = type;
    const conf = p.get("conf"); if (conf && /^[a-z]{2,12}$/i.test(conf)) v.conf = conf.toLowerCase();
    const top = parseInt(p.get("top"), 10); if (top > 0 && top <= 100) v.top = top;
    if (p.get("stage") === "1") v.stage = true;
    if (p.get("p2") === "1") v.p2 = true;
    const sort = p.get("sort"); if (sort && SORTS.some((x) => x.id === sort)) v.sort = sort;
    return v;
  }
  function viewParams(F, sid) {
    const p = [];
    const add = (k, val) => p.push(k + "=" + encodeURIComponent(val).replace(/%20/g, "+"));
    if (F.q.trim()) add("q", F.q.trim());
    if (F.cont) add("cont", F.cont);
    if (F.country) add("country", F.country);
    if (F.iso) add("iso", F.iso);
    if (F.era) add("era", F.era);
    if (F.year) add("year", F.year);
    if (F.metal) add("metal", F.metal);
    if (F.val) add("val", F.val);
    if (F.type) add("type", F.type);
    if (F.conf) add("conf", F.conf);
    if (F.top) add("top", String(F.top));
    if (F.staging) add("stage", "1");
    if (F.p2) add("p2", "1");
    if (sid !== DEFAULT_SORT) add("sort", sid);
    return p.join("&");
  }
  const viewHash = (F, sid) => { const qs = viewParams(F, sid); return "#gallery" + (qs ? "?" + qs : ""); };
  function applyView(v) {
    const f = B.filter;
    f.q = v.q || ""; f.country = v.country || ""; f.iso = v.iso || ""; f.year = v.year || "";
    f.silverOnly = false; f.phase2 = !!v.p2; f.staging = !!v.stage;
    f.cont = v.cont || ""; f.era = v.era || ""; f.metal = v.metal || ""; f.val = v.val || "";
    f.type = v.type || ""; f.conf = v.conf || ""; f.top = v.top || 0;
    setSort(v.sort || DEFAULT_SORT);
    if (f.q) B.ensureSearch();
  }
  function writeUrl() {
    if (!galleryActive()) return;
    const h = viewHash(readF(), sortId());
    try { if (location.hash !== h) history.replaceState(null, "", h); } catch (e) { /* sandboxed */ }
  }
  function shareUrl() { return location.origin + location.pathname + viewHash(readF(), sortId()); }
  async function copyLink() {
    const url = shareUrl();
    let done = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); done = true; } } catch (e) { /* fall through */ }
    if (!done) {
      try {
        const ta = document.createElement("textarea");
        ta.value = url; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta); ta.select(); done = document.execCommand("copy"); ta.remove();
      } catch (e) { done = false; }
    }
    B.showToast(done ? "Link copied. Anyone who opens it sees this exact view." : "Copy this link: " + url);
  }

  // A shared link (#gallery?...) is read once, before the app boots, and applied by the first render(s).
  let pendingView = null;
  try {
    const h = location.hash || "";
    if (/^#gallery\?/i.test(h)) {
      pendingView = parseView(h.slice(h.indexOf("?") + 1));
      history.replaceState(null, "", "#gallery"); // the app reads "#gallery" to open the wing (and skips the splash: not a plain load)
    }
  } catch (e) { pendingView = null; }

  /* ══════════════════════════ filtering, sorting, counting ══════════════════════════ */
  /** Same rules as app.js flipQueryMatch (SER / scan / C### / every word anywhere in the record + notes), but the
      normalised text of each coin is built once per snapshot, so a keystroke costs a few milliseconds. */
  function blobOf(d) {
    const key = epoch + "|" + (B.searchIdx ? 1 : 0);
    if (d._bk !== key) {
      const f = d.f;
      d._blob = B.norm([f.scan, f.ser, f.country, f.year, f.denom, f.label, f.mint, f.iso, f.continent, f.status, f.location, f.conf].join(" "))
        + " " + ((B.searchIdx && B.searchIdx[f.scan]) || "");
      d._scanL = String(f.scan || "").toLowerCase();
      d._serL = String(f.ser || "").toLowerCase();
      d._bk = key;
    }
    return d._blob;
  }
  function matchQuery(d, q) {
    const blob = blobOf(d);
    const qNorm = q.replace(/^#/, "");
    if (d._scanL.includes(qNorm) || d._serL.includes(qNorm)) return true;
    if (/^c?\d+$/i.test(qNorm) && d._scanL.replace(/\D/g, "").includes(qNorm.replace(/\D/g, ""))) return true;
    return q.split(" ").every((w) => blob.includes(w));
  }
  let qCache = { key: "", set: null };
  function qSetFor(q) {
    const n = B.norm(q);
    if (!n) return null;
    const key = n + "|" + (B.searchIdx ? 1 : 0) + "|" + epoch;
    if (qCache.key === key) return qCache.set;
    const set = new Set();
    for (const d of descs) if (matchQuery(d, n)) set.add(d.scan);
    qCache = { key, set };
    return set;
  }

  function facetValue(d, k) {
    switch (k) {
      case "cont": return d.cont;
      case "country": return d.country;
      case "era": return d.era;
      case "metal": return metalOf(d);
      case "val": return d.val;
      case "type": return d.type;
      case "conf": return d.conf;
      default: return null;
    }
  }
  function passes(d, F, skip, qset) {
    for (const k of FACETS) {
      if (k === skip || !F[k]) continue;
      if (facetValue(d, k) !== F[k]) return false;
    }
    if (F.iso && d.f.iso !== F.iso) return false;
    if (F.year && !B.yearMatches(d.f, F.year)) return false;
    if (F.staging && !(STAGING.has(d.f.scan) || STAGING.has(d.f.ser))) return false;
    if (F.p2 && !B.isAwaitingPhase2(d.f)) return false;
    if (qset && !qset.has(d.scan)) return false;
    return true;
  }

  const cmpNum = (a, b, dir) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1; // missing values always last
    if (b == null) return -1;
    return (a - b) * dir;
  };
  const cmpStr = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
  function sortDescs(arr, id) {
    const s = SORTS.find((x) => x.id === id) || SORTS[0];
    const byScan = (a, b) => a.sn - b.sn;
    arr.sort((a, b) => {
      let r = 0;
      switch (s.id) {
        case "added": r = cmpStr(b.added, a.added) || (b.sn - a.sn); return r;
        case "year": case "yeard": r = cmpNum(a.yr, b.yr, s.dir) || cmpStr(a.f.country, b.f.country) || cmpStr(a.f.ser, b.f.ser); return r;
        case "value": case "valuea": r = cmpNum(a.est, b.est, s.dir) || cmpNum(a.yr, b.yr, 1) || cmpStr(a.f.ser, b.f.ser); return r;
        case "asw": r = cmpNum(a.asw, b.asw, -1) || cmpStr(a.f.ser, b.f.ser); return r;
        case "country": r = cmpStr(a.f.country, b.f.country) || cmpNum(a.yr, b.yr, 1) || cmpStr(a.f.ser, b.f.ser); return r;
        case "ser": r = cmpStr(a.f.ser || a.f.scan, b.f.ser || b.f.scan) || byScan(a, b); return r;
        default: return byScan(a, b);
      }
    });
    return arr;
  }

  function computeList(F, sid) {
    const qset = qSetFor(F.q);
    let rows = descs.filter((d) => passes(d, F, null, qset));
    if (F.top) rows = rows.filter((d) => d.est != null && d.est > 0).sort((a, b) => b.est - a.est || a.sn - b.sn).slice(0, F.top);
    return sortDescs(rows, sid).map((d) => d.f);
  }

  let memo = { key: "", list: [] };
  function currentList() {
    if (!ensureData()) return [];
    const F = readF(), sid = sortId();
    const key = JSON.stringify([F, sid, epoch, B.searchIdx ? 1 : 0, metalState]);
    if (memo.key === key) return memo.list;
    memo = { key, list: computeList(F, sid) };
    return memo.list;
  }

  /** Live facet counts: for each facet, the pieces that match every OTHER active filter. Selecting an option then shows exactly that many. */
  function computeFacets(F) {
    const qset = qSetFor(F.q);
    const out = {};
    for (const k of FACETS) {
      const m = new Map();
      for (const d of descs) {
        if (!passes(d, F, k, qset)) continue;
        if (F.top && !(d.est != null && d.est > 0)) continue;
        const v = facetValue(d, k);
        if (v == null || v === "") continue;
        m.set(v, (m.get(v) || 0) + 1);
      }
      if (F.top) for (const [v, n] of m) m.set(v, Math.min(n, F.top));
      out[k] = m;
    }
    return out;
  }
  /** How many pieces the wall would show with this state (used by the one-tap fixes on an empty result). */
  function countFor(F) {
    return computeList(F, DEFAULT_SORT).length;
  }

  /* ══════════════════════════ facet vocabulary (from the data) ══════════════════════════ */
  function facetOptions() {
    const tally = (fn) => { const m = new Map(); for (const d of descs) { const v = fn(d); if (v != null && v !== "") m.set(v, (m.get(v) || 0) + 1); } return m; };
    const cont = [...tally((d) => d.cont)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => ({ id, label: id }));
    const country = [...tally((d) => d.country).keys()].sort((a, b) => a.localeCompare(b)).map((id) => ({ id, label: id }));
    const eras = [...tally((d) => d.era).keys()].filter((e) => e !== "nd").sort().map((id) => ({ id, label: id + "s" }));
    if (descs.some((d) => d.era === "nd")) eras.push({ id: "nd", label: "Undated" });
    const haveMetal = new Set(); for (const d of descs) { const m = metalOf(d); if (m) haveMetal.add(m); }
    const metal = METAL_ORDER.filter((m) => haveMetal.has(m)).map((id) => ({ id, label: id }));
    const vals = VALUE_BANDS.filter((b) => descs.some((d) => d.val === b.id)).map((b) => ({ id: b.id, label: b.label }));
    if (descs.some((d) => d.val === "none")) vals.push({ id: "none", label: "Not recorded" });
    const type = ["coin", "token"].filter((t) => descs.some((d) => d.type === t)).map((id) => ({ id, label: TYPE_LABEL[id] }));
    const conf = ["high", "med", "low", "none"].filter((c) => descs.some((d) => d.conf === c)).map((id) => ({ id, label: CONF_LABEL[id] }));
    const known = new Set(["high", "med", "low", "none"]);
    for (const d of descs) if (!known.has(d.conf)) { known.add(d.conf); conf.push({ id: d.conf, label: d.conf.charAt(0).toUpperCase() + d.conf.slice(1) }); }
    return { cont, country, era: eras, metal, val: vals, type, conf };
  }
  function optionLabel(k, id) {
    if (k === "era") return id === "nd" ? "Undated" : id + "s";
    if (k === "val") return id === "none" ? "Not recorded" : (VALUE_BANDS.find((b) => b.id === id) || {}).label || id;
    if (k === "type") return TYPE_LABEL[id] || id;
    if (k === "conf") return CONF_LABEL[id] || (id.charAt(0).toUpperCase() + id.slice(1));
    return id;
  }

  /* ══════════════════════════ shell ══════════════════════════ */
  const galleryActive = () => !!$("#pane-gallery.active");
  let mounted = false;

  function subtitleFor(mode) {
    return mode === "slab" ? "Lucite slab presentation · drawings from the ledger, no photographs yet"
      : mode === "matrix" ? "Struck planchet presentation · drawings from the ledger, no photographs yet"
      : "2×2 flip presentation · drawings from the ledger, no photographs yet";
  }

  function shellHtml(list) {
    const mode = B.mode;
    return `
    <div class="gf-root" id="gf-root">
      <div class="gf-presets" id="gf-presets" role="group" aria-label="Quick views"></div>
      <div id="gf-cover">${B.coverFlowShellHtml(list)}</div>
      <section class="gf-finder" id="gf-finder" aria-label="Find coins">
        <div class="gf-bar">
          <div class="gf-search search-wrap">
            <label class="gf-sr" for="flip-q">Search the collection</label>
            <input type="search" id="flip-q" placeholder="Search country, year, SER, notes…" autocomplete="off" enterkeyhint="search" />
            <kbd title="Ctrl/⌘K searches everything in the vault">⌘K</kbd>
          </div>
          <label class="gf-field gf-country"><span>Country</span>
            <select id="flip-country" data-fk="country"><option value="">All countries</option></select>
          </label>
          <label class="gf-field gf-sort"><span>Sort</span>
            <select id="flip-sort">${SORTS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</select>
          </label>
          <button type="button" class="btn gf-filters-btn" id="gf-filters-btn" data-act="panel" aria-expanded="false" aria-controls="gf-panel">Filters <span class="gf-badge" id="gf-badge" hidden></span><span class="gf-caret" aria-hidden="true">▾</span></button>
        </div>
        <div class="gf-status" id="gf-status">
          <p class="gf-count" id="gf-count" role="status" aria-live="polite"></p>
          <div class="gf-chips" id="gf-chips" aria-label="Active filters"></div>
          <div class="gf-actions">
            <button type="button" class="gf-link" data-act="clear" id="gf-clear" hidden>Clear all</button>
            <button type="button" class="gf-link" data-act="return-map" id="gf-map" hidden>← Return to map</button>
            <button type="button" class="gf-link" data-act="copy">Copy link</button>
            <button type="button" class="gf-link" data-act="print">Print</button>
          </div>
        </div>
        <div class="gf-panel" id="gf-panel" role="region" aria-label="Filters"></div>
      </section>
      <div class="gf-wallhead">
        <div>
          <span class="eyebrow">The Cabinet</span>
          <h2 id="gf-wall-title">On the Wall</h2>
          <p class="sub" id="gf-wall-sub">${esc(subtitleFor(mode))}</p>
        </div>
        <div class="gf-wallhead-r">
          <button type="button" class="gf-link" data-act="go-lab">Shooting list →</button>
          <div class="gallery-mode-switch" role="group" aria-label="Specimen presentation mode">
            <button type="button" class="g-mode-btn${mode === "slab" ? " active" : ""}" data-gmode="slab" aria-pressed="${mode === "slab"}" title="Archival Lucite slabs">🏛️ Slabs</button>
            <button type="button" class="g-mode-btn${mode === "flip" ? " active" : ""}" data-gmode="flip" aria-pressed="${mode === "flip"}" title="2×2 flips">🏷️ 2×2 Flips</button>
            <button type="button" class="g-mode-btn${mode === "matrix" ? " active" : ""}" data-gmode="matrix" aria-pressed="${mode === "matrix"}" title="Struck planchets">✨ Planchets</button>
          </div>
        </div>
      </div>
      <div class="gf-wall" id="gf-wall">
        <div class="gallery-grid gf-grid" id="main-gallery-grid"></div>
        <div class="gf-empty" id="gf-empty" hidden></div>
        <div class="gf-more" id="gf-more" hidden>
          <button type="button" class="btn gallery-load-more-btn" data-act="more" id="gf-more-btn"></button>
        </div>
      </div>
    </div>`;
  }

  function mount() {
    const body = $("#gallery-body");
    if (!body) return false;
    if (!$("#gf-root", body)) {
      body.innerHTML = shellHtml(currentList());
      mounted = true;
      buildPanel();
      B.setupCoverFlowEvents();
      bindEvents(body);
      bindTilt($("#main-gallery-grid"));
      observeMore();
    }
    return true;
  }

  /* ══════════════════════════ panel (facets) ══════════════════════════ */
  let panelSig = "";
  function buildPanel() {
    const panel = $("#gf-panel");
    if (!panel) return;
    const opts = facetOptions();
    const sig = JSON.stringify([lastVault && (lastVault.content_hash || lastVault.generated_at), metalState, opts.metal.map((o) => o.id)]);
    if (sig === panelSig && panel.firstElementChild) return;
    panelSig = sig;
    const chipGroup = (k, note) => `
      <fieldset class="gf-group" data-facet="${k}">
        <legend>${esc(FACET_LABEL[k])}</legend>
        <div class="gf-chipset">${opts[k].map((o) => `<button type="button" class="gf-chip" data-fk="${k}" data-fv="${esc(o.id)}" aria-pressed="false"><span class="gf-lbl">${esc(o.label)}</span> <span class="gf-n" aria-hidden="false">0</span></button>`).join("")}</div>
        ${note ? `<p class="gf-note" id="gf-note-${k}">${note}</p>` : ""}
      </fieldset>`;
    const metalNote = metalState === "loading" ? "Loading the other metals from the ledger…"
      : metalState === "failed" ? "Some metal notes could not be loaded (offline?). Counts cover what loaded."
      : "Grouped from each coin's metal note in the ledger.";
    panel.innerHTML = `
      ${chipGroup("cont")}
      <div class="gf-col gf-col-era">
        ${chipGroup("era")}
        <div class="gf-group" data-facet="year">
          <label for="flip-year" class="gf-legend">Exact year or range</label>
          <input type="text" id="flip-year" inputmode="numeric" placeholder="1969 or 1960-1979" autocomplete="off" />
        </div>
      </div>
      ${chipGroup("metal", metalNote)}
      ${chipGroup("val")}
      <div class="gf-col">${chipGroup("type")}${chipGroup("conf")}</div>
      <div class="gf-panel-foot"><button type="button" class="btn gf-apply" data-act="panel-close" id="gf-apply">Show <span id="gf-apply-n">0</span> coins</button></div>`;
    // the country picker lives in the bar (always visible): fill it from the data
    const cs = $("#flip-country");
    if (cs) cs.innerHTML = `<option value="">All countries</option>` + opts.country.map((o) => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join("");
  }

  function updatePanel(F, counts, total) {
    const panel = $("#gf-panel");
    if (!panel) return;
    $$(".gf-chip", panel).forEach((b) => {
      const k = b.dataset.fk, v = b.dataset.fv;
      const n = (counts[k] && counts[k].get(v)) || 0;
      const on = F[k] === v;
      b.hidden = n === 0 && !on;
      b.setAttribute("aria-pressed", String(on));
      b.classList.toggle("on", on);
      const nEl = b.querySelector(".gf-n");
      if (nEl.textContent !== String(n)) nEl.textContent = String(n);
      b.dataset.n = String(n);
    });
    const sel = $("#flip-country");
    if (sel) {
      const cm = counts.country || new Map();
      $$("option", sel).forEach((o) => {
        if (!o.value) { o.textContent = "All countries"; return; }
        const n = cm.get(o.value) || 0;
        o.textContent = `${o.value} (${n})`;
        o.disabled = n === 0 && F.country !== o.value;
      });
      if (sel.value !== F.country) sel.value = F.country;
    }
    const y = $("#flip-year", panel);
    if (y && y.value !== F.year && document.activeElement !== y) y.value = F.year;
    $$(".gf-group[data-facet]", panel).forEach((g) => {
      if ($(".gf-chip", g)) g.hidden = !$$(".gf-chip", g).some((b) => !b.hidden);
    });
    const ap = $("#gf-apply-n", panel);
    if (ap) ap.textContent = intFmt(total);
  }

  /* ══════════════════════════ status: count, chips ══════════════════════════ */
  function activeChips(F) {
    const c = [];
    const add = (key, text, extra) => c.push({ key, text, ...extra });
    if (F.q.trim()) add("q", `Search: “${F.q.trim()}”`);
    if (F.cont) add("cont", `Continent: ${F.cont}`);
    if (F.country) add("country", `Country: ${F.country}`);
    if (F.iso) add("iso", `Region: ${B.isoName(F.iso)}`);
    if (F.era) add("era", `Decade: ${optionLabel("era", F.era)}`);
    if (F.year) add("year", `Year: ${F.year}`);
    if (F.metal) add("metal", `Metal: ${F.metal}`);
    if (F.val) add("val", `Value: ${optionLabel("val", F.val)}`);
    if (F.type) add("type", `Type: ${optionLabel("type", F.type)}`);
    if (F.conf) add("conf", `Confidence: ${optionLabel("conf", F.conf)}`);
    if (F.staging) add("staging", "Phase 2 staging album");
    if (F.p2) add("p2", "Awaiting Phase 2");
    if (F.top) add("top", `Top ${F.top} by value`);
    return c;
  }
  const emptyPatch = (key) => {
    switch (key) {
      case "q": return { q: "" };
      case "p2": return { p2: false };
      case "staging": return { staging: false };
      case "top": return { top: 0 };
      default: return { [key]: "" };
    }
  };

  function renderStatus(F, list, chips) {
    const total = descs.length;
    const cnt = $("#gf-count");
    if (cnt) {
      const shown = list.length;
      const txt = shown === total && !anyFilter(F)
        ? `<strong>${intFmt(total)}</strong> coins in the collection`
        : `Showing <strong>${intFmt(shown)}</strong> of ${intFmt(total)} coins`;
      if (cnt.dataset.k !== txt) { cnt.innerHTML = txt; cnt.dataset.k = txt; }
    }
    const chipsEl = $("#gf-chips");
    if (chipsEl) {
      const html = chips.map((c) => `<button type="button" class="gf-fchip" data-remove="${esc(c.key)}" aria-label="Remove filter ${esc(c.text)}"><span>${esc(c.text)}</span><span class="gf-x" aria-hidden="true">×</span></button>`).join("");
      if (chipsEl.dataset.k !== html) { chipsEl.innerHTML = html; chipsEl.dataset.k = html; }
    }
    const clear = $("#gf-clear");
    if (clear) clear.hidden = chips.length === 0;
    const map = $("#gf-map");
    if (map) map.hidden = !(F.country || F.iso);
    const badge = $("#gf-badge");
    if (badge) {
      const n = chips.filter((c) => c.key !== "q").length;
      badge.textContent = String(n);
      badge.hidden = n === 0;
    }
  }

  function renderPresets(F, sid, list) {
    const box = $("#gf-presets");
    if (!box) return;
    const ys = descs.map((d) => d.yr).filter((y) => y != null);
    const span = ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : "";
    const withVal = descs.filter((d) => d.est != null && d.est > 0).length;
    const silver = descs.filter((d) => metalOf(d) === "Silver").length;
    const info = { all: intFmt(descs.length), crown: "Top " + Math.min(12, withVal), silver: `${silver} coin${silver === 1 ? "" : "s"}`, timeline: span };
    const html = PRESETS.map((p) => {
      const on = presetActive(p, F, sid);
      return `<button type="button" class="gf-preset${on ? " on" : ""}" data-preset="${p.id}" aria-pressed="${on}"><span class="gf-pt">${esc(p.label)}</span><span class="gf-pn">${esc(info[p.id] || "")}</span></button>`;
    }).join("");
    if (box.dataset.k !== html) { box.innerHTML = html; box.dataset.k = html; }
  }
  function presetActive(p, F, sid) {
    const base = { ...readF() };
    const want = { q: "", cont: "", country: "", iso: "", year: "", era: "", metal: "", val: "", type: "", conf: "", top: 0, staging: false, p2: false, ...p.set };
    for (const k of Object.keys(want)) if (base[k] !== want[k]) return false;
    return sid === p.sort;
  }

  /* ══════════════════════════ wall ══════════════════════════ */
  let wallList = [];
  let wallLimit = 24;
  let wallSig = "";

  function tileHtml(f) {
    const neo = B.highlight && B.highlight.has(f.scan) ? " is-new" : "";
    const label = (f.ser || f.scan) + " " + [f.country, f.year].filter(Boolean).join(" ");
    const obv = B.renderMuseumSlab(f, { side: "obv" });
    return `<div class="piece-card piece-card-3d${neo} mode-${B.mode}" role="button" tabindex="0" data-scan="${esc(f.scan)}" aria-label="${esc(label)}">
      <div class="pc-flip-frame"><div class="pc-3d-flipper-stage" data-flipper-scan="${esc(f.scan)}"><div class="pc-3d-flipper">
        <div class="pc-side pc-side-obv">${obv}<button type="button" class="cf-flip-badge pc-flip-action-btn" title="Flip to the reverse (Space or F)">🔄 3D Flip</button></div>
        <div class="pc-side pc-side-rev" data-lazy-rev="1"></div>
      </div></div></div>
    </div>`;
  }
  /* Tile markup is built once per (coin, mode, caliper state, detail loaded) and cloned afterwards. */
  const tileCache = new Map();
  let tileCacheVault = null;
  function makeTile(f) {
    if (tileCacheVault !== lastVault) { tileCache.clear(); tileCacheVault = lastVault; }
    const key = `${f.scan}|${B.mode}|${B.caliperActive ? 1 : 0}|${f._full ? 1 : 0}|${B.highlight && B.highlight.has(f.scan) ? 1 : 0}`;
    let proto = tileCache.get(key);
    if (!proto) {
      const t = document.createElement("template");
      t.innerHTML = tileHtml(f);
      proto = t.content.firstElementChild;
      if (tileCache.size > 600) tileCache.clear();
      tileCache.set(key, proto);
    }
    return proto.cloneNode(true);
  }
  function fillReverse(card) {
    const rev = $(".pc-side-rev", card);
    if (!rev || !rev.dataset.lazyRev) return;
    const f = B.findCard(card.dataset.scan);
    if (!f) return;
    delete rev.dataset.lazyRev;
    rev.innerHTML = B.renderMuseumSlab(f, { side: "rev" }) + `<button type="button" class="cf-flip-badge pc-flip-action-btn" title="Flip to the obverse (Space or F)">🔄 3D Flip</button>`;
    B.lazyThumbs(rev);
  }

  function renderWall(list, F, force) {
    const grid = $("#main-gallery-grid");
    if (!grid) return;
    const sig = wallSig;
    wallList = list;
    const want = list.slice(0, wallLimit);
    const existing = new Map();
    for (const el of Array.from(grid.children)) existing.set(el.dataset.scan, el);
    let prev = null;
    const added = [];
    for (const f of want) {
      let el = force ? null : existing.get(f.scan);
      if (el) existing.delete(f.scan);
      else { el = makeTile(f); added.push(el); }
      const at = prev ? prev.nextElementSibling : grid.firstElementChild;
      if (at !== el) grid.insertBefore(el, at);
      prev = el;
    }
    for (const el of existing.values()) el.remove();
    if (added.length) B.lazyThumbs(grid);
    const remaining = list.length - want.length;
    const more = $("#gf-more"), moreBtn = $("#gf-more-btn");
    if (more) {
      more.hidden = remaining <= 0;
      if (moreBtn) moreBtn.textContent = `Show more coins (${intFmt(remaining)} remaining)`;
    }
    const empty = $("#gf-empty");
    const isEmpty = list.length === 0;
    grid.hidden = isEmpty;
    if (empty) {
      empty.hidden = !isEmpty;
      if (isEmpty) renderEmpty(empty, F);
    }
    const cover = $("#gf-cover");
    if (cover) cover.hidden = isEmpty;
    const title = $("#gf-wall-title");
    if (title) title.textContent = F.top ? `The Top ${F.top} by Value` : "On the Wall";
    void sig;
  }

  function renderEmpty(el, F) {
    const chips = activeChips(F);
    el.innerHTML = `<h3>No coins match these filters</h3>
      <p>${chips.length ? "Nothing in the collection matches " + chips.map((c) => `<strong>${esc(c.text)}</strong>`).join(" and ") + "." : "There are no coins to show."}</p>
      <button type="button" class="btn" data-act="clear">Clear all filters</button>`;
  }

  /* wall: load the next batch when the button (or the sentinel) comes near the screen */
  let moreObs = null;
  function observeMore() {
    const more = $("#gf-more");
    if (!more || !("IntersectionObserver" in window)) return;
    moreObs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !more.hidden) loadMore();
    }, { rootMargin: "900px 0px" });
    moreObs.observe(more);
  }
  function loadMore() {
    if (wallLimit >= wallList.length) return;
    wallLimit += batchSize();
    renderWall(wallList, readF());
    // the sentinel may still be in view after a short batch: check again on the next frame
    requestAnimationFrame(() => {
      const more = $("#gf-more");
      if (more && !more.hidden && more.getBoundingClientRect().top < window.innerHeight + 900) loadMore();
    });
  }

  /* hover tilt: one delegated listener for the whole wall (fine pointers only) */
  function bindTilt(grid) {
    if (!grid || !window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let cur = null, rect = null, raf = 0, lx = 0, ly = 0;
    const reset = (card) => {
      if (!card) return;
      const fl = $(".pc-3d-flipper", card), st = $(".pc-3d-flipper-stage", card);
      if (fl) fl.style.transform = st && st.classList.contains("is-flipped") ? "rotateY(180deg)" : "";
    };
    const apply = () => {
      raf = 0;
      if (!cur || !rect || !rect.width) return;
      const hw = rect.width / 2, hh = rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (lx - (rect.left + hw)) / hw));
      const ny = Math.max(-1, Math.min(1, (ly - (rect.top + hh)) / hh));
      const fl = $(".pc-3d-flipper", cur), st = $(".pc-3d-flipper-stage", cur);
      const flipped = st && st.classList.contains("is-flipped");
      if (fl) fl.style.transform = `perspective(900px) rotateX(${(-ny * 10).toFixed(1)}deg) rotateY(${((flipped ? 180 : 0) + (flipped ? -nx : nx) * 12).toFixed(1)}deg) translateZ(8px)`;
      cur.style.setProperty("--card-sheen-x", ((nx + 1) / 2 * 100).toFixed(1) + "%");
      cur.style.setProperty("--card-sheen-y", ((ny + 1) / 2 * 100).toFixed(1) + "%");
    };
    grid.addEventListener("pointermove", (e) => {
      if (REDUCED()) return;
      const card = e.target.closest && e.target.closest(".piece-card");
      if (card !== cur) { reset(cur); cur = card; rect = card ? card.getBoundingClientRect() : null; }
      if (!card) return;
      lx = e.clientX; ly = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    grid.addEventListener("pointerleave", () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } reset(cur); cur = null; rect = null; });
  }

  /* ══════════════════════════ Cover Flow ══════════════════════════ */
  function updateCover(list) {
    const cf = $("#gallery-coverflow-wrap");
    if (!cf) return;
    const cur = B.cfItems && B.cfItems[B.cfIndex];
    let idx = 0;
    if (cur) { const i = list.findIndex((f) => f.scan === cur.scan); idx = i >= 0 ? i : 0; }
    B.renderCoverFlow(idx);
  }

  /* ══════════════════════════ update pipeline ══════════════════════════ */
  let timer = 0;
  function schedule(ms) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; update(); }, ms);
  }

  let lastListKey = "";
  const timings = {};
  function update() {
    if (!ensureData() || !mount()) return;
    const T0 = performance.now();
    let tp = T0;
    const lap = (name) => { const t = performance.now(); timings[name] = Math.round((t - tp) * 10) / 10; tp = t; };
    buildPanel();
    const F = readF(), sid = sortId();
    const list = currentList();
    lap("list");
    const counts = computeFacets(F);
    lap("facets");
    const chips = activeChips(F);
    renderPresets(F, sid, list);
    renderStatus(F, list, chips);
    updatePanel(F, counts, list.length);
    const sel = $("#flip-sort");
    if (sel && sel.value !== sid) sel.value = sid;
    const q = $("#flip-q");
    if (q && q.value !== F.q && document.activeElement !== q) q.value = F.q;
    lap("finder");
    const listKey = list.length + ":" + sid + ":" + epoch + ":" + list.map((f) => f.scan).join(",");
    const changed = listKey !== lastListKey;
    if (changed) { wallLimit = batchSize(); lastListKey = listKey; }
    renderWall(list, F, false);
    lap("wall");
    if (!$(".cf-card", $("#gallery-coverflow-wrap") || document)) updateCover(list);
    else if (changed) coverSoon();
    lap("cover");
    persistSoon();
    timings.total = Math.round((performance.now() - T0) * 10) / 10;
  }

  /* The Cover Flow (many slabs) and the state save (reads layout) run after the wall has painted. */
  let coverTimer = 0, persistTimer = 0;
  function coverSoon() {
    if (coverTimer) clearTimeout(coverTimer);
    coverTimer = setTimeout(() => { coverTimer = 0; if (mounted) updateCover(currentList()); }, 260);
  }
  function persistSoon() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { persistTimer = 0; B.saveState(); writeUrl(); }, 300);
  }

  /* ══════════════════════════ events ══════════════════════════ */
  function openCard(scan) {
    B.openDrawer(scan, { label: "Gallery", scans: wallList.map((f) => f.scan) });
  }
  function toggleFlip(card) {
    const stage = $(".pc-3d-flipper-stage", card);
    if (!stage) return;
    if (!stage.classList.contains("is-flipped")) fillReverse(card);
    stage.classList.toggle("is-flipped");
    B.playStapleClick();
  }

  function bindEvents(body) {
    if (body.dataset.gfBound) return;
    body.dataset.gfBound = "1";
    body.addEventListener("click", (e) => {
      if (B.broken) return;
      pendingView = null;
      const t = e.target;
      const flipBtn = t.closest(".pc-flip-action-btn");
      if (flipBtn) { e.stopPropagation(); e.preventDefault(); toggleFlip(flipBtn.closest(".piece-card")); return; }
      const preset = t.closest("[data-preset]");
      if (preset) { applyPreset(preset.dataset.preset); return; }
      const chip = t.closest(".gf-chip[data-fk]");
      if (chip) {
        const k = chip.dataset.fk, v = chip.dataset.fv;
        setF({ [k]: readF()[k] === v ? "" : v });
        B.playStapleClick();
        schedule(0);
        return;
      }
      const rm = t.closest("[data-remove]");
      if (rm) { setF(emptyPatch(rm.dataset.remove)); schedule(0); return; }
      const gm = t.closest(".g-mode-btn");
      if (gm) {
        B.mode = gm.dataset.gmode;
        try { localStorage.setItem("tr_gallery_mode_v1", B.mode); } catch (_) { /* ignore */ }
        $$(".g-mode-btn").forEach((b) => { const on = b === gm; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on)); });
        const sub = $("#gf-wall-sub"); if (sub) sub.textContent = subtitleFor(B.mode);
        renderWall(wallList, readF(), true);
        B.playStapleClick();
        return;
      }
      const act = t.closest("[data-act]");
      if (act) { doAction(act.dataset.act, act); return; }
      const card = t.closest(".piece-card[data-scan]");
      if (card) openCard(card.dataset.scan);
    });
    body.addEventListener("keydown", (e) => {
      if (B.broken) return;
      const card = e.target.closest && e.target.closest(".piece-card[data-scan]");
      if (!card || e.target !== card) return;
      if (e.key === "Enter") { e.preventDefault(); openCard(card.dataset.scan); }
      else if (e.key === " " || e.key === "f" || e.key === "F") { e.preventDefault(); toggleFlip(card); }
    });
    body.addEventListener("input", (e) => {
      pendingView = null;
      const t = e.target;
      if (t.id === "flip-q") { B.markTyping(); setF({ q: t.value }); B.ensureSearch(); schedule(160); }
      else if (t.id === "flip-year") { B.markTyping(); setF({ year: t.value.trim() }); schedule(160); }
    });
    body.addEventListener("focusin", (e) => { if (e.target.id === "flip-q" || e.target.id === "flip-year") { B.markTyping(); if (e.target.id === "flip-q") B.ensureSearch(); } });
    body.addEventListener("change", (e) => {
      pendingView = null;
      const t = e.target;
      if (t.id === "flip-sort") { setSort(t.value); schedule(0); }
      else if (t.id === "flip-country") { setF({ country: t.value }); schedule(0); }
    });
  }

  function applyPreset(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    clearFilters();
    setF(p.set);
    setSort(p.sort);
    B.playStapleClick();
    schedule(0);
  }

  function setPanel(open) {
    const panel = $("#gf-panel"), btn = $("#gf-filters-btn");
    if (!panel || !btn) return;
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.classList.toggle("active", open);
    try { localStorage.setItem("tr_gallery_filters_open_v1", open ? "1" : "0"); } catch (_) { /* ignore */ }
  }

  function doAction(act) {
    switch (act) {
      case "panel": setPanel(!$("#gf-panel").classList.contains("open")); break;
      case "panel-close": setPanel(false); { const c = $("#gf-finder"); if (c) c.scrollIntoView({ behavior: REDUCED() ? "auto" : "smooth", block: "start" }); } break;
      case "clear": clearFilters(); schedule(0); break;
      case "copy": copyLink(); break;
      case "print": window.print(); break;
      case "more": loadMore(); break;
      case "go-lab": B.setWing("lab"); window.scrollTo(0, 0); break;
      case "return-map":
        B.setWing("study");
        window.scrollTo(0, 0);
        setTimeout(() => { const a = document.querySelector("#titan-world-atlas-wrap") || document.querySelector("#sec-world"); if (a) a.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
        break;
      default: break;
    }
  }

  /* ══════════════════════════ address bar sync ══════════════════════════ */
  window.addEventListener("hashchange", () => {
    const h = location.hash || "";
    if (!/^#gallery\?/i.test(h)) return;
    // a link pasted into an open tab: show that view
    const v = parseView(h.slice(h.indexOf("?") + 1));
    pendingView = null;
    if (v && ensureData()) {
      applyView(v);
      B.setWing("gallery", false);
      if (!galleryActive()) return;
      B.render();
      writeUrl();
    }
  });
  // setWing() rewrites the hash to a bare "#gallery" when the wing opens: put the view back.
  (function watchPane() {
    const pane = $("#pane-gallery");
    if (!pane || !window.MutationObserver) return;
    let was = pane.classList.contains("active");
    new MutationObserver(() => {
      const now = pane.classList.contains("active");
      if (now && !was) setTimeout(writeUrl, 0);
      was = now;
    }).observe(pane, { attributes: true, attributeFilter: ["class"] });
  })();

  /* ══════════════════════════ bridge hooks ══════════════════════════ */
  B.filtered = () => currentList();
  B.render = () => {
    if (!ensureData()) return false;
    syncFromApp();
    if (!mount()) return false;
    // restore the panel's open/closed state once per mount
    const panel = $("#gf-panel");
    if (panel && !panel.dataset.init) {
      panel.dataset.init = "1";
      let open = false;
      try { const s = localStorage.getItem("tr_gallery_filters_open_v1"); if (s === "1") open = true; else if (s === "0") open = false; } catch (_) { /* ignore */ }
      setPanel(open);
    }
    update();
    if (metalState === "idle") setTimeout(loadMetals, 600);
    return true;
  };

  // test / automation hooks
  window.TitanGallery = {
    state: () => ({ F: readF(), sort: sortId(), count: currentList().length, total: descs.length }),
    list: () => currentList().map((f) => f.scan),
    facets: () => { const c = computeFacets(readF()); const o = {}; for (const k of FACETS) o[k] = Object.fromEntries(c[k]); return o; },
    metalState: () => metalState,
    viewHash: () => viewHash(readF(), sortId()),
    parseView,
    search: (q) => { const set = qSetFor(q); return set ? [...set] : null; },
    timings,
    metalOf: (scan) => { const d = descs.find((x) => x.scan === scan); return d ? metalOf(d) : null; },
  };
})();
