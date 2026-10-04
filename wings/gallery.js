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
  const batchSize = () => (PHONE() ? 4 : 24); // wall tiles added per batch
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
  /* One shared collator: String.localeCompare with options builds a new one on every call (about 80 ms per sort on a phone). */
  const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const cmpStr = (a, b) => COLLATOR.compare(String(a || ""), String(b || ""));
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
    <div class="gf-root" id="gf-root" data-mode="${esc(mode)}">
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

  /* The shared <svg> of planchet gradients in index.html is display:none, and gradients inside a
     display:none SVG do not paint in Chromium, so every drawn coin rendered without its metal.
     Hide it without display:none instead (no layout, still referenceable). */
  (function fixSharedDefs() {
    const defs = document.getElementById("grad-planchet-alloy")?.closest("svg");
    if (defs && defs.style.display === "none") defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  })();

  /* Wall tile: a museum placard (country, year + denomination, SER, value) under a drawn coin.
     The coin is drawn from the ledger (no photographs exist yet); a real thumbnail replaces it when one does. */
  /* Phones / touch: the wall draws ~12-48 coins at ~150 px; drop the parts nobody can see at that size
     (SVG drop-shadow filter, the curved legend and the tiny year line). The placard under the coin says the same. */
  const LITE = () => !!(window.matchMedia && window.matchMedia("(max-width: 700px), (hover: none) and (pointer: coarse)").matches);
  function liteSvg(svg) {
    return svg
      .replace(/<filter[\s\S]*?<\/filter>/g, "")
      .replace(/ filter="url\(#[^)]*\)"/g, "")
      .replace(/<path id="arc-top-[^>]*>/g, "")
      .replace(/<text\b[^>]*class="coin-legend-(?:top|bot)"[\s\S]*?<\/text>/g, "");
  }
  function coinSvg(f, side, large) {
    if (side === "rev") return revSvg(f);
    if (typeof window.renderSpecimenBlueprint === "function") {
      const svg = window.renderSpecimenBlueprint(f, !!large, side);
      return large || !LITE() ? svg : liteSvg(svg);
    }
    return `<span class="gx-coin-blank" aria-hidden="true"></span>`;
  }
  /** Planchet radius (of 100) used to crop and zoom the drawn face. A DRAWING size only: the ledger's mm when it has one, else a generic size; never shown as a fact. */
  function planchetR(f) {
    const dm = String(f.metal_cond || f.metal || "").match(/([\d.]+)\s*mm/i);
    const diam = dm ? parseFloat(dm[1]) : ((f.is_silver || f.asw_oz) ? 26.5 : 22);
    return Math.min(42, Math.max(22, ((Number.isFinite(diam) ? diam : 22) / 50.8) * 44));
  }
  /* A drawn reverse: the denomination set inside a beaded ring, sized to fit the planchet. */
  let revUid = 0;
  function revSvg(f) {
    const metal = String(f.metal || "");
    const silver = !!f.is_silver || !!f.asw_oz, gold = !!f.is_gold || /gold/i.test(metal), bronze = /bronze|copper|brass/i.test(metal);
    const grad = gold ? "grad-planchet-gold" : bronze ? "grad-planchet-bronze" : silver ? "grad-planchet-silver" : "grad-planchet-alloy";
    const ink = gold ? "#fef08a" : bronze ? "#fed7aa" : "#f8fafc";
    const r = planchetR(f);
    const denom = String(f.denom || f.label || "").split("·")[0].trim();
    const m = denom.match(/^([\d.,/½¼¾]+)\s*(.*)$/);
    const big = m ? m[1] : "";
    const unit = (m ? m[2] : denom).replace(/\(.*?\)/g, "").trim().toUpperCase().slice(0, 18);
    const bigSize = Math.min(r * 0.62, (r * 1.3) / Math.max(1, big.length * 0.62));
    const unitSize = Math.min(r * 0.2, (r * 1.45) / Math.max(1, unit.length * 0.62));
    const uid = "gxrev" + (++revUid);
    const yearTxt = esc(String(f.year || "").slice(0, 14));
    return `<svg class="specimen-medallion gx-rev-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reverse (drawn): ${esc(denom)}">
      <defs><filter id="${uid}" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.6"/></filter></defs>
      <rect width="100" height="100" fill="url(#grad-aperture-velvet)"/>
      <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="url(#${grad})" stroke="#050608" stroke-width="0.8" filter="url(#${uid})"/>
      <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="url(#grad-coin-luster)"/>
      <circle cx="50" cy="50" r="${(r - 0.6).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="0.9" opacity="0.85"/>
      <circle cx="50" cy="50" r="${(r - 2.2).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="0.7" stroke-dasharray="1 1.5" opacity="0.7"/>
      <g fill="${ink}" text-anchor="middle" font-family="var(--serif), Georgia, serif" font-weight="800" style="paint-order:stroke" stroke="rgba(0,0,0,0.35)" stroke-width="0.25">
        ${big ? `<text x="50" y="${(50 + bigSize * 0.2).toFixed(1)}" font-size="${bigSize.toFixed(1)}">${esc(big)}</text>` : ""}
        ${unit ? `<text x="50" y="${(big ? 50 + bigSize * 0.2 + unitSize * 1.45 : 50 + unitSize * 0.35).toFixed(1)}" font-size="${unitSize.toFixed(1)}" letter-spacing="0.06em">${esc(unit)}</text>` : ""}
        ${yearTxt && big ? `<text x="50" y="${(50 - r * 0.52).toFixed(1)}" font-size="${(r * 0.14).toFixed(1)}" letter-spacing="0.12em">${yearTxt}</text>` : ""}
      </g>
    </svg>`;
  }

  function tileHtml(f) {
    const isNew = B.highlight && B.highlight.has(f.scan);
    const denom = f.denom || f.label || "";
    const year = f.year || "Undated";
    const ag = f.is_silver ? `<span class="gx-badge gx-ag" title="Silver${f.asw_oz != null ? ": " + B.num(f.asw_oz, 4) + " oz pure" : ""}">Ag${f.asw_oz != null ? " " + B.num(f.asw_oz, 2) + " oz" : ""}</span>` : "";
    const tok = f.kind === "token" ? `<span class="gx-badge gx-tok">Token</span>` : "";
    const photo = f.thumb ? `<img class="gx-photo" data-src="${esc(f.thumb)}" alt="" loading="lazy" decoding="async" />` : "";
    const label = `${f.country || "Unknown country"}, ${year}, ${denom}. ${f.ser || f.scan}. ${f.est != null ? "Estimated " + money(f.est) : "Estimate not recorded"}`;
    return `<article class="gx-tile${isNew ? " is-new" : ""}" data-scan="${esc(f.scan)}">
        <button type="button" class="gx-open" data-scan="${esc(f.scan)}" aria-label="${esc(label)}">
          <span class="gx-stage" aria-hidden="true">
            <span class="gx-frame"><span class="gx-clip">
              <span class="gx-coin">
                <span class="gx-face gx-obv" style="--r:${planchetR(f).toFixed(1)}">${photo || coinSvg(f, "obv")}</span>
              </span>
            </span></span>
          </span>
          <span class="gx-plac">
            <span class="gx-country">${esc(f.country || "Unknown country")}</span>
            <span class="gx-line"><span class="gx-year">${esc(year)}</span>${denom ? ` · ${esc(denom)}` : ""}</span>
            <span class="gx-foot"><span class="gx-ser">${esc(f.ser || f.scan)}</span><span class="gx-val">${f.est != null ? money(f.est) : "not recorded"}</span></span>
          </span>
        </button>
        <span class="gx-badges">${isNew ? `<span class="gx-badge gx-new">New</span>` : ""}${ag}${tok}</span>
        <button type="button" class="gx-turn" data-scan="${esc(f.scan)}" aria-pressed="false" aria-label="Turn over ${esc((f.country || "") + " " + year)}" title="Turn over (F)">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 3.5v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20.5v-5h5"/></svg>
        </button>
      </article>`;
  }
  /* Tile markup is built once per (coin, new-flag) and cloned afterwards. */
  const tileCache = new Map();
  let tileCacheVault = null;
  function protoTile(f) {
    if (tileCacheVault !== lastVault) { tileCache.clear(); tileCacheVault = lastVault; }
    const key = `${f.scan}|${B.highlight && B.highlight.has(f.scan) ? 1 : 0}`;
    let proto = tileCache.get(key);
    if (!proto) {
      const t = document.createElement("template");
      t.innerHTML = tileHtml(f);
      proto = t.content.firstElementChild;
      if (tileCache.size > 600) tileCache.clear();
      tileCache.set(key, proto);
    }
    return proto;
  }
  function makeTile(f) { return protoTile(f).cloneNode(true); }
  /* Idle time: parse the markup of the next batches so scrolling only has to clone and insert. */
  let warmTimer = 0;
  function warmNext() {
    if (warmTimer) return;
    const ric = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 8 }), 60));
    warmTimer = ric((dl) => {
      warmTimer = 0;
      const list = wallList || [];
      let i = Math.min(wallLimit, list.length);
      const stop = Math.min(list.length, wallLimit + batchSize() * 3);
      while (i < stop && dl.timeRemaining() > 4) { protoTile(list[i]); i++; }
      if (i < stop) warmNext();
    }, { timeout: 1500 });
  }
  /** Turn a tile over; the drawn reverse is built the first time. */
  function turnTile(tile) {
    if (!tile) return;
    const f = B.findCard(tile.dataset.scan);
    const coin = $(".gx-coin", tile);
    if (!f || !coin) return;
    if (!$(".gx-rev", coin)) coin.insertAdjacentHTML("beforeend", `<span class="gx-face gx-rev" style="--r:${planchetR(f).toFixed(1)}">${coinSvg(f, "rev")}</span>`);
    const on = !tile.classList.contains("is-turned");
    tile.classList.add("gx-3d");
    void tile.offsetWidth; // let the 3D styles apply before the flip starts
    tile.classList.toggle("is-turned", on);
    const btn = $(".gx-turn", tile);
    if (btn) btn.setAttribute("aria-pressed", String(on));
    B.playStapleClick();
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
    warmNext();
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

  /** Empty result: name the filters, and offer the one-tap removals that bring pieces back (with the exact count each gives). */
  function renderEmpty(el, F) {
    const chips = activeChips(F);
    const fixes = [];
    for (const c of chips) {
      const n = countFor({ ...F, ...emptyPatch(c.key) });
      if (n > 0) fixes.push({ c, n });
    }
    fixes.sort((a, b) => b.n - a.n);
    const q = F.q.trim();
    const wait = q && !B.searchIdx ? `<p>Still loading the notes index; results may appear in a moment.</p>` : "";
    el.innerHTML = `<h3>${chips.length ? "No coins match these filters" : "There are no coins to show"}</h3>
      <p>${chips.length ? "Nothing in the collection matches " + chips.map((c) => `<strong>${esc(c.text)}</strong>`).join(" and ") + "." : "The ledger has no flips."}</p>
      ${wait}
      <div class="gf-fixes">
        ${fixes.slice(0, 4).map((x) => `<button type="button" class="btn" data-remove="${esc(x.c.key)}">Remove “${esc(x.c.text)}” → ${intFmt(x.n)} ${x.n === 1 ? "coin" : "coins"}</button>`).join("")}
        ${chips.length ? `<button type="button" class="btn" data-act="clear">Show all ${intFmt(descs.length)} coins</button>` : ""}
      </div>`;
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
    if (changed) { wallLimit = firstPaintDone ? batchSize() : (PHONE() ? 4 : batchSize()); lastListKey = listKey; }
    if (!firstPaintDone) {
      /* First open: paint the finder, then build the wall, then the Cover Flow, each in its own task (no single long task). */
      firstPaintDone = true;
      timings.total = Math.round((performance.now() - T0) * 10) / 10;
      setTimeout(() => {
        if (!mounted) return;
        renderWall(currentList(), readF(), false);
        setTimeout(() => {
          if (!mounted) return;
          if (!$(".cf-card", $("#gallery-coverflow-wrap") || document)) updateCover(currentList());
          persistSoon();
        }, 120);
      }, 0);
      return;
    }
    renderWall(list, F, false);
    lap("wall");
    if (!$(".cf-card", $("#gallery-coverflow-wrap") || document)) updateCover(list);
    else if (changed) coverSoon();
    lap("cover");
    persistSoon();
    timings.total = Math.round((performance.now() - T0) * 10) / 10;
  }
  let firstPaintDone = false;

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
  const RECENT_KEY = "tr_gallery_recent_v1";
  function recentScans() { try { const r = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(r) ? r.filter((x) => typeof x === "string").slice(0, 6) : []; } catch (e) { return []; } }
  function rememberRecent(scan) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([scan, ...recentScans().filter((x) => x !== scan)].slice(0, 6))); } catch (e) { /* private mode */ }
  }
  /* Arrow keys move between tiles, Home/End jump, F turns the focused piece over; Enter/Space open it (native button). */
  function onGridKey(e) {
    const tile = e.target.closest(".gx-tile");
    if (!tile) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "f" || e.key === "F") { if (e.target.closest(".gx-open, .gx-turn")) { e.preventDefault(); turnTile(tile); } return; }
    const tiles = $$("#main-gallery-grid .gx-tile");
    const i = tiles.indexOf(tile);
    let j = -1;
    const cols = (() => { const top = tiles[0] && tiles[0].offsetTop; let c = 0; for (const t of tiles) { if (t.offsetTop !== top) break; c++; } return Math.max(1, c); })();
    if (e.key === "ArrowRight") j = i + 1;
    else if (e.key === "ArrowLeft") j = i - 1;
    else if (e.key === "ArrowDown") j = i + cols;
    else if (e.key === "ArrowUp") j = i - cols;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tiles.length - 1;
    else return;
    e.preventDefault();
    if (j >= tiles.length && wallLimit < wallList.length) { loadMore(); }
    const all = $$("#main-gallery-grid .gx-tile");
    j = Math.max(0, Math.min(all.length - 1, j));
    const target = $(".gx-open", all[j]);
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: "nearest", behavior: REDUCED() ? "auto" : "smooth" }); }
  }
  function openCard(scan, noCtx) {
    rememberRecent(scan);
    B.openDrawer(scan, noCtx ? null : { label: "Gallery", scans: wallList.map((f) => f.scan) });
  }
  function bindEvents(body) {
    if (body.dataset.gfBound) return;
    body.dataset.gfBound = "1";
    body.addEventListener("click", (e) => {
      if (B.broken) return;
      pendingView = null;
      const t = e.target;
      const turn = t.closest(".gx-turn");
      if (turn) { e.stopPropagation(); e.preventDefault(); turnTile(turn.closest(".gx-tile")); return; }
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
        const root = $("#gf-root"); if (root) root.dataset.mode = B.mode; // the three looks are CSS frames around the same tile
        B.playStapleClick();
        return;
      }
      const act = t.closest("[data-act]");
      if (act) { doAction(act.dataset.act, act); return; }
      const open = t.closest(".gx-open");
      if (open) openCard(open.dataset.scan);
    });
    body.addEventListener("keydown", (e) => {
      if (B.broken) return;
      if (e.target.closest && e.target.closest(".gx-tile")) onGridKey(e);
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

  /* ══════════════════════════ ⌘K palette v2 ══════════════════════════
     Grouped results (recent, places, actions, coins, vault lots, albums, wings), Up/Down/Enter, recent pieces. */
  const has = (v) => v != null && String(v).trim() !== "";
  const flipsAll = () => (B.vault && B.vault.flips) || [];
  let palItems = [];
  let palSel = 0;
  const WINGS = [
    ["hall", "Grand Hall", "Overview, value and what's new"],
    ["gallery", "Gallery", "Every flip on the wall"],
    ["vault", "Vault", "Bullion, sets and reserves"],
    ["study", "Curator's Study", "Albums, world map and ledger"],
    ["lab", "Conservation Lab", "Photography progress"],
  ];
  /** Open the wing with the current (already set) filters and show the top of the wall. */
  function goGallery() {
    B.setWing("gallery");
    schedule(0);
    setTimeout(() => { const f = $("#gf-finder"); if (f) f.scrollIntoView({ behavior: REDUCED() ? "auto" : "smooth", block: "start" }); }, 80);
  }
  function showView(set, sort) { clearFilters(); setF(set || {}); setSort(sort || DEFAULT_SORT); goGallery(); }
  function palActions() {
    const silverN = flipsAll().filter((f) => f.is_silver).length;
    return [
      { t: "Most valuable pieces", s: "Gallery, highest estimate first", k: "valuable expensive top best value crown", run: () => showView({ top: 12 }, "value") },
      { t: "Silver pieces", s: `${silverN} flips with silver content`, k: "silver ag metal melt", run: () => showView({ metal: "Silver" }, "asw") },
      { t: "Oldest pieces first", s: "Gallery sorted by year", k: "oldest old early history timeline year", run: () => showView({}, "year") },
      { t: "Recently added", s: "Newest entries in the ledger", k: "recent new latest added", run: () => showView({}, "added") },
      { t: "Clear gallery filters", s: "Show all pieces", k: "clear reset all filters everything", run: () => showView({}, DEFAULT_SORT) },
      { t: "Surprise me", s: "Open a random piece", k: "random surprise any lucky", run: () => { const all = flipsAll(); const f = all[Math.floor(Math.random() * all.length)]; if (f) openCard(f.scan, true); } },
      { t: "Change the atmosphere", s: "Lighting, sound and music", k: "atmosphere theme lighting colour color dark light music sound", run: () => B.openAtmoSheet() },
      { t: "Keyboard shortcuts", s: "Press ? anywhere", k: "keyboard shortcuts keys help", run: () => B.openKeysSheet() },
      { t: "Open the 3D table", s: "Examine a piece in 3D", k: "3d table spatial museum room", run: () => { if (B.launchSpatial) B.launchSpatial(); } },
      { t: "Print the gallery list", s: "Printable inventory of the current view", k: "print list inventory paper", run: () => { B.setWing("gallery"); update(); setTimeout(() => window.print(), 60); } },
    ];
  }
  const blobCache = new WeakMap();
  function blob(o, fields) {
    let b = blobCache.get(o);
    if (!b) { b = B.norm(fields.map((k) => o[k]).filter(has).join(" ")); blobCache.set(o, b); }
    return b;
  }
  const wordsMatch = (text, q) => q.split(" ").every((w) => text.includes(w));

  const ICO = {
    piece: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5" stroke-dasharray="1.5 1.8"/></svg>`,
    vault: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 16l3-6h12l3 6z"/><path d="M6 10l2-4h8l2 4"/></svg>`,
    album: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="3" width="14" height="18" rx="1.5"/><circle cx="10" cy="9" r="1.6"/><circle cx="14" cy="9" r="1.6"/><circle cx="10" cy="14" r="1.6"/><circle cx="14" cy="14" r="1.6"/></svg>`,
    place: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>`,
    wing: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
    act: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>`,
  };
  function palRowHtml(it, i) {
    return `<button type="button" class="gxp-row${i === palSel ? " sel" : ""}" id="gxp-${i}" role="option" aria-selected="${i === palSel}" data-i="${i}" tabindex="-1">
      <span class="gxp-ico gxp-${it.g}" aria-hidden="true">${it.ico || ""}</span>
      <span class="gxp-main"><span class="gxp-t">${it.t}</span>${it.s ? `<span class="gxp-s">${it.s}</span>` : ""}</span>
      ${it.r ? `<span class="gxp-r">${it.r}</span>` : ""}
    </button>`;
  }

  function buildPalette(qRaw) {
    const q = B.norm(qRaw || "");
    const items = [];
    const push = (g, it) => items.push({ g, ico: ICO[g === "recent" ? "piece" : g], ...it });
    const flipItem = (f) => ({
      t: `${esc(f.country || "")} · ${esc(f.year || "")}`,
      s: `${esc(f.denom || f.label || "")} · <span class="gxp-mono">${esc(f.ser || f.scan)}</span>${f.is_silver ? " · Ag" : ""}`,
      r: f.est != null ? money(f.est) : "",
      run: () => openCard(f.scan, true),
    });
    if (!q) {
      const all = flipsAll();
      const recent = recentScans().map((s) => all.find((f) => f.scan === s)).filter(Boolean).slice(0, 4);
      recent.forEach((f) => push("recent", { ...flipItem(f), head: "Recently viewed" }));
      palActions().slice(0, 4).forEach((a) => push("act", { t: a.t, s: a.s, run: a.run, head: "Suggestions" }));
      WINGS.forEach(([w, t, s]) => push("wing", { t, s, run: () => B.setWing(w), head: "Go to" }));
      return items;
    }
    const flips = flipsAll();
    // Year / decade shortcuts: "1964", "1960s"
    const ym = q.match(/^(1[5-9]\d|20\d)(\d|0s)$/);
    if (ym) {
      const dec = /s$/.test(q);
      const y = parseInt(q, 10);
      const n = flips.filter((f) => { const yy = yearNum(f.year); return yy != null && (dec ? Math.floor(yy / 10) * 10 === y : yy === y); }).length;
      if (n) push("act", { t: dec ? `Pieces from the ${y}s` : `Pieces from ${y}`, s: `${n} on the wall`, head: "Show in the gallery",
        run: () => showView(dec ? { era: String(y) } : { year: String(y) }, "year") });
    }
    // Continents and countries
    const conts = new Map(), ctry = new Map();
    flips.forEach((f) => {
      if (f.continent) conts.set(f.continent, (conts.get(f.continent) || 0) + 1);
      if (f.country) ctry.set(f.country, (ctry.get(f.country) || 0) + 1);
    });
    [...conts].filter(([c]) => wordsMatch(B.norm(c), q)).forEach(([c, n]) => push("place", { t: esc(c), s: `${n} pieces`, head: "Places", run: () => showView({ cont: c }, DEFAULT_SORT) }));
    [...ctry].filter(([c]) => wordsMatch(B.norm(c), q)).slice(0, 4).forEach(([c, n]) => push("place", { t: esc(c), s: `${n} ${n === 1 ? "piece" : "pieces"}`, head: "Places", run: () => showView({ country: c }, DEFAULT_SORT) }));
    // Actions whose name matches come before the long lists
    palActions().filter((a) => wordsMatch(B.norm(`${a.t} ${a.k}`), q)).slice(0, 3).forEach((a) => push("act", { t: a.t, s: a.s, head: "Actions", run: a.run }));
    // Flips
    const hits = flips.filter((f) => B.flipQueryMatch(f, q));
    hits.slice(0, 6).forEach((f) => push("piece", { ...flipItem(f), head: `Pieces · ${hits.length}` }));
    if (hits.length > 6) push("piece", { t: `Show all ${hits.length} matches on the wall`, s: `Search the gallery for “${esc(qRaw.trim())}”`, head: `Pieces · ${hits.length}`, run: () => showView({ q: qRaw.trim() }, DEFAULT_SORT) });
    // Vault: bullion, sets, housing, stamps
    const v = B.vault;
    const vHits = [];
    [["bullion", "Bullion"], ["sets", "Set"], ["housing", "Housing"], ["stamps", "Stamps"]].forEach(([k, lbl]) => (v[k] || []).forEach((c) => {
      if (wordsMatch(blob(c, ["scan", "ser", "country", "year", "denom", "denom_line", "cat", "metal", "label", "kind"]) + " " + B.norm(lbl), q)) vHits.push([c, lbl]);
    }));
    vHits.slice(0, 5).forEach(([c, lbl]) => push("vault", {
      t: esc(c.denom_line || c.denom || c.label || c.scan).slice(0, 90),
      s: `${lbl} · <span class="gxp-mono">${esc(c.scan)}</span>${c.country && lbl !== "Housing" ? " · " + esc(c.country) : ""}`,
      r: c.est != null ? money(c.est) : "", head: `Vault · ${vHits.length}`, run: () => B.openDrawer(c.scan, null),
    }));
    // Album families
    (v.albums_glance || []).filter((g) => wordsMatch(B.norm([g.family, g.ids, "album binder"].join(" ")), q)).slice(0, 4).forEach((g) => push("album", {
      t: esc(g.family), s: `${intFmt(g.coins)} coins · ${esc(g.ids)}`, r: g.total != null ? money(g.total) : "", head: "Albums",
      run: () => { B.setWing("study"); if (typeof window.openAlbumInspector === "function") window.openAlbumInspector(g.family, g.ids); },
    }));
    // Wings
    WINGS.filter(([w, t, s]) => wordsMatch(B.norm(`${w} ${t} ${s} wing room`), q)).forEach(([w, t, s]) => push("wing", { t, s, head: "Go to", run: () => B.setWing(w) }));
    return items;
  }

  function paletteRender(qRaw) {
    const box = $("#palette-results");
    if (!box || !B.vault) return false;
    palItems = buildPalette(qRaw);
    palSel = 0;
    const input = $("#palette-q");
    if (input && input.placeholder.indexOf("albums") < 0) input.placeholder = "Search pieces, countries, bullion, albums, actions…";
    if (!palItems.length) {
      box.innerHTML = `<div class="gxp-empty">Nothing found for “${esc(qRaw)}”.<br/><span>Try a country, a year like 1964, a denomination, or a word from the notes.</span></div>`;
      if (input) input.removeAttribute("aria-activedescendant");
      return true;
    }
    let html = "", last = "";
    palItems.forEach((it, i) => {
      if (it.head !== last) { html += `<div class="gxp-head" role="presentation">${esc(it.head)}</div>`; last = it.head; }
      html += palRowHtml(it, i);
    });
    box.innerHTML = html + `<div class="gxp-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>`;
    if (input) input.setAttribute("aria-activedescendant", "gxp-0");
    return true;
  }
  function palMove(d) {
    if (!palItems.length) return;
    palSel = (palSel + d + palItems.length) % palItems.length;
    $$("#palette-results .gxp-row").forEach((r) => {
      const on = Number(r.dataset.i) === palSel;
      r.classList.toggle("sel", on);
      r.setAttribute("aria-selected", String(on));
      if (on) r.scrollIntoView({ block: "nearest" });
    });
    const input = $("#palette-q");
    if (input) input.setAttribute("aria-activedescendant", "gxp-" + palSel);
  }
  function palRun(i) {
    const it = palItems[i];
    if (!it) return false;
    B.closePalette();
    try { it.run(); } catch (err) { console.warn("[gallery] palette action failed", err); }
    return true;
  }
  (function bindPalette() {
    const q = $("#palette-q"), box = $("#palette-results");
    if (!q || !box) return;
    q.addEventListener("keydown", (e) => {
      if (B.paletteBroken || !palItems.length || !$(".gxp-row", box)) return; // classic palette is showing: its own handler runs
      if (e.key === "ArrowDown") { e.preventDefault(); palMove(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); palMove(-1); }
      else if (e.key === "Enter") { e.preventDefault(); palRun(palSel); }
    });
    box.addEventListener("click", (e) => {
      const r = e.target.closest(".gxp-row");
      if (r) palRun(Number(r.dataset.i));
    });
    box.addEventListener("mousemove", (e) => {
      const r = e.target.closest(".gxp-row");
      if (r && Number(r.dataset.i) !== palSel) palMove(Number(r.dataset.i) - palSel);
    });
  })();

  /* ══════════════════════════ flip dossier v2 ══════════════════════════
     Flips and tokens only. Every line is read from the ledger record (index + detail JSON); a missing field is
     simply not printed. The drawn faces say they are drawings; nothing here invents a grade, a cert or a size. */
  const SCHEMA = ["ser", "scan", "added", "cat", "continent", "country", "iso", "year", "mint", "denom", "refs", "metal", "specs", "mintage", "design", "tender", "qty", "face", "est", "conf", "label", "photo", "parked", "notes"];
  const FULL = [
    ["SER", "ser"], ["Scan", "scan"], ["Scan note", "scan_note"], ["Added", "added"], ["Category", "cat"], ["Continent", "continent"],
    ["Country", "country"], ["ISO", "iso"], ["Year", "year_line"], ["Denomination", "denom_line"], ["Label", "label"],
    ["Metal and condition", "metal"], ["Specs", "specs"], ["Mintage", "mintage"], ["Design", "design"], ["References", "refs"],
    ["Legal tender", "tender"], ["Quantity", "qty"], ["Face and estimate", "face_line"], ["Housing", "parked"], ["Location", "location"],
    ["Photo", "photo"], ["Status", "status"], ["About this coin", "story"],
  ];
  /** Diameter only when the ledger (or a photo measurement) has one. */
  function sizeFrom(c) {
    if (c.measured_mm != null && Number.isFinite(Number(c.measured_mm))) return { mm: Number(c.measured_mm), src: "measured from a photograph" };
    for (const k of ["diameter_mm", "dia_mm"]) if (c[k] != null && Number.isFinite(Number(c[k]))) return { mm: Number(c[k]), src: "recorded in the ledger" };
    const m = String(c.metal_cond || c.metal || c.specs || "").match(/(\d{1,2}(?:\.\d+)?)\s*mm\b/i);
    return m ? { mm: parseFloat(m[1]), src: "from the ledger's metal note" } : null;
  }
  function gramsFrom(c) {
    if (c.weight_g != null && Number.isFinite(Number(c.weight_g))) return Number(c.weight_g);
    const m = String(c.metal || "").match(/(\d{1,3}(?:\.\d+)?)\s*g\b/i);
    return m ? parseFloat(m[1]) : null;
  }
  function alignmentFrom(c) {
    const s = String(c.specs || "").toLowerCase();
    if (/medal alignment|medallic/.test(s)) return "Medal alignment (↑↑)";
    if (/coin alignment/.test(s)) return "Coin alignment (↑↓)";
    return "";
  }

  function dossierHtml(c) {
    if (!c || !flipsAll().some((f) => f.scan === c.scan)) return null; // only real ledger flips (not album slots)
    const photos = (c.photos || []).filter((p) => p.url);
    const hasObv = photos.some((p) => p.role === "obv"), hasRev = photos.some((p) => p.role === "rev");
    const face = (side) => {
      if ((side === "obv" && hasObv) || (side === "rev" && hasRev)) return B.photoSlot(c, side);
      return `<figure class="gxd-face"><span class="gxd-coin" style="--r:${planchetR(c).toFixed(1)}">${coinSvg(c, side, true)}</span><figcaption>${side === "obv" ? "Obverse (drawn)" : "Reverse (drawn)"}</figcaption></figure>`;
    };
    const drawn = !(hasObv && hasRev);
    const target = c.photo_stem ? `${c.photo_stem}_obv.jpg` : "";
    const photoNote = !target && has(c.photo) ? ` <span class="gxd-photo-note">Ledger: ${esc(c.photo)}</span>` : "";
    const spotAg = B.vault.precious?.spot_ag ?? B.vault.metals?.spot?.ag_usd_oz;
    const melt = c.melt_live != null ? Number(c.melt_live) : (c.asw_oz != null && spotAg != null ? Number(c.asw_oz) * Number(spotAg) : null);
    const size = sizeFrom(c);
    const grams = gramsFrom(c);
    const align = alignmentFrom(c);
    const title = [c.country, c.year].filter(has).join(" · ") || c.label || c.scan;
    const sub = [c.denom, c.mint ? `mint mark ${c.mint}` : ""].filter(has).join(" · ");
    const present = SCHEMA.filter((k) => has(c[k]) || (k === "est" && c.est != null)).length;
    const badges = [
      c.is_silver ? `<span class="gxd-badge ag">Silver</span>` : "",
      c.kind === "token" ? `<span class="gxd-badge">Token</span>` : "",
      c.conf && c.conf !== "high" ? `<span class="gxd-badge warn" title="Identification confidence">Confidence: ${esc(c.conf)}</span>` : "",
    ].join("");
    const fact = (k, v) => has(v) ? `<div class="gxd-fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : "";
    const gauge = size ? (() => {
      const pct = Math.max(20, Math.min(96, (size.mm / 50.8) * 100));
      return `<section class="gxd-sec gxd-size" aria-label="Actual size">
        <h4>Size</h4>
        <div class="gxd-gauge">
          <div class="gxd-window" title="2×2 inch flip window (50.8 mm)"><span class="gxd-disc" style="width:${pct.toFixed(1)}%;height:${pct.toFixed(1)}%"></span></div>
          <p><strong>${B.num(size.mm, 1, 1)} mm</strong> across${grams != null ? ` · <strong>${B.num(grams, 2)} g</strong>` : ""}<br/><span>Drawn to scale inside a 2×2 inch flip (50.8 mm). Diameter ${esc(size.src)}.</span></p>
        </div>
      </section>`;
    })() : "";
    const full = FULL.filter(([, k]) => has(c[k])).map(([lbl, k]) => `<div class="gxd-fact"><dt>${esc(lbl)}</dt><dd>${esc(c[k])}</dd></div>`).join("");
    const yr = yearNum(c.year);
    const era = yr != null ? String(Math.floor(yr / 10) * 10) : "";
    return `
      <div class="gxd">
        <div class="gxd-stage${drawn ? " is-drawn" : ""}">
          <div class="gxd-faces">${face("obv")}${face("rev")}</div>
          ${drawn ? `<p class="gxd-pending"><span class="gxd-dot" aria-hidden="true"></span>Photographs pending (Phase 2). These faces are drawn from the ledger, not photographed.${target ? ` Target file: <code class="ph-file" data-copy="${esc(target)}" title="Tap to copy">${esc(target)}</code>` : photoNote}</p>` : `<p class="ph-hint">Tap a photo for full size.</p>`}
        </div>
        <header class="gxd-head">
          <div class="gxd-ids"><span class="gxd-ser">${esc(c.ser || c.scan)}</span>${c.ser ? `<span class="gxd-scan">${esc(c.scan)}</span>` : ""}${badges}</div>
          <h2>${esc(title)}</h2>
          ${sub ? `<p class="gxd-sub">${esc(sub)}</p>` : ""}
          <div class="gxd-value">
            <div><span class="gxd-k">Estimated value</span><strong class="gxd-est">${c.est != null ? money(c.est) : "not recorded"}</strong></div>
            ${c.face ? `<div><span class="gxd-k">Face value</span><strong>${esc(c.face)}</strong></div>` : ""}
            ${c.is_silver ? `<div><span class="gxd-k">Silver content</span><strong>${c.asw_oz != null ? B.num(c.asw_oz, 4) + " oz" : "not recorded"}</strong>${melt != null ? `<span class="gxd-note">melt ${money(melt)}${spotAg != null ? ` at ${money(spotAg)}/oz` : ""}</span>` : ""}</div>` : ""}
          </div>
        </header>
        ${c.story ? `<section class="gxd-sec gxd-story gxd-about"><h4>About this coin</h4><p>${esc(c.story)}</p></section>` : ""}
        <section class="gxd-sec">
          <h4>Museum label</h4>
          <dl class="gxd-facts">
            ${fact("Country", c.country)}${fact("Continent", c.continent)}${fact("Year", c.year_line || c.year)}
            ${fact("Denomination", c.denom_line || c.denom)}${fact("Metal and condition", c.metal)}${fact("Mintage", c.mintage)}
            ${fact("References", c.refs)}${fact("Legal tender", c.tender)}${fact("Die alignment", align)}${fact("Housing", c.parked)}
            ${fact("Identification", c.conf ? `${c.conf} confidence` : "")}${fact("Added to the ledger", c.added)}
          </dl>
        </section>
        ${c.design ? `<section class="gxd-sec gxd-story"><h4>Design</h4><p>${esc(c.design)}</p></section>` : ""}
        ${c.notes ? `<section class="gxd-sec gxd-story"><h4>Curator's notes</h4><p>${esc(c.notes)}</p></section>` : ""}
        ${gauge}
        <section class="gxd-sec gxd-acts" aria-label="Related">
          ${c.country ? `<button type="button" class="gxd-act" data-gxd="country" data-v="${esc(c.country)}">More from ${esc(c.country)}</button>` : ""}
          ${era ? `<button type="button" class="gxd-act" data-gxd="era" data-v="${era}">More from the ${era}s</button>` : ""}
          <button type="button" class="gxd-act" data-gxd="link" data-v="${esc(c.ser || c.scan)}">Copy link to this piece</button>
        </section>
        <details class="gxd-full">
          <summary>Full ledger record <span>${present} of ${SCHEMA.length} fields filled</span></summary>
          <dl class="gxd-facts">${full}</dl>
        </details>
      </div>`;
  }

  (function bindDossier() {
    const body = $("#drawer-body");
    if (!body) return;
    body.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-gxd]");
      if (!b) return;
      const act = b.dataset.gxd, v = b.dataset.v;
      if (act === "country" || act === "era") {
        const close = $("#drawer-close");
        if (close) close.click();
        showView({ [act]: v }, DEFAULT_SORT);
      } else if (act === "link") {
        const url = location.origin + location.pathname + "#coin=" + encodeURIComponent(v);
        let ok = false;
        try { await navigator.clipboard.writeText(url); ok = true; } catch (_) { ok = false; }
        const t = b.textContent; b.textContent = ok ? "Link copied" : url; setTimeout(() => { b.textContent = t; }, 2000);
      }
    });
  })();

  /* ══════════════════════════ print list ══════════════════════════ */
  function buildPrintSheet() {
    let el = $("#gf-print-sheet");
    const root = $("#gf-root");
    if (!root) return;
    if (!el) { el = document.createElement("div"); el.id = "gf-print-sheet"; el.className = "gf-print-sheet"; root.appendChild(el); }
    const rows = wallList;
    const F = readF();
    const chips = activeChips(F).map((c) => c.text).join(", ") || "All pieces";
    el.innerHTML = `
      <h2>Titan Reliquary · Gallery list</h2>
      <p>${esc(chips)} · ${intFmt(rows.length)} pieces · est. ${money(rows.reduce((s, f) => s + (Number(f.est) || 0), 0))}</p>
      <table><thead><tr><th>SER</th><th>Country</th><th>Year</th><th>Denomination</th><th>Mint</th><th>Est.</th></tr></thead>
      <tbody>${rows.map((f) => `<tr><td>${esc(f.ser || f.scan)}</td><td>${esc(f.country || "")}</td><td>${esc(f.year || "")}</td><td>${esc(f.denom || "")}${f.is_silver ? " (Ag)" : ""}</td><td>${esc(f.mint || "")}</td><td>${f.est != null ? money(f.est) : ""}</td></tr>`).join("")}</tbody></table>`;
  }
  window.addEventListener("beforeprint", () => { if (galleryActive() && mounted) buildPrintSheet(); });

  /* ══════════════════════════ bridge hooks ══════════════════════════ */
  B.filtered = () => currentList();
  B.palette = paletteRender;
  B.dossier = dossierHtml;
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
