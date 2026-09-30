/* Titan Reliquary · Gallery wing (Wing I)
   Owns: the gallery view (#gallery-body), the ⌘K palette results and the flip dossier body.
   Talks to app.js only through window.__galleryBridge (see notes/agents/gallery.md).
   If this file does not load, app.js falls back to its legacy renderers. */
(() => {
  "use strict";
  const B = window.__galleryBridge;
  if (!B) return;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = B.esc, money = B.money, num = B.num, intFmt = B.intFmt, norm = B.norm;
  const has = (v) => v != null && String(v).trim() !== "";
  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* private mode */ } },
    sget(k) { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (_) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* ignore */ } },
  };
  const VIEW_KEY = "tr_gx_view_v1";      // session: extra facets
  const RECENT_KEY = "tr_gx_recent_v1";  // local: recently opened pieces (palette)
  const SHOWCASE_KEY = "tr_gx_showcase_v1";

  /* The shared <svg> of planchet gradients in index.html is display:none, and gradients inside a
     display:none SVG do not paint in Chromium, so every drawn coin rendered without its metal.
     Hide it without display:none instead (no layout, still referenceable). */
  (function fixSharedDefs() {
    const defs = document.getElementById("grad-planchet-alloy")?.closest("svg");
    if (defs && defs.style.display === "none") {
      defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    }
  })();

  /* ------------------------------------------------------------------ data helpers */
  const flips = () => (B.vault && B.vault.flips) || [];
  const F = () => B.filter; // app's flipFilter (it may be replaced by other wings; always re-read)

  /** Gregorian year of a flip, or null ("AH 1378 (1958)" → 1958, "ca. 1970s" → 1970, "ND" → null). */
  const yearCache = new Map();
  function yearNum(f) {
    const k = f.year;
    if (yearCache.has(k)) return yearCache.get(k);
    const ms = String(k || "").match(/\d{4}/g) || [];
    const ok = ms.map(Number).filter((y) => y >= 1500 && y <= 2100);
    const y = ok.length ? ok[ok.length - 1] : null;
    yearCache.set(k, y);
    return y;
  }
  const eraOf = (f) => { const y = yearNum(f); return y == null ? "nd" : String(Math.floor(y / 10) * 10); };
  const eraLabel = (e) => (e === "nd" ? "Undated" : e + "s");
  const valBand = (f) => { const v = Number(f.est); if (!Number.isFinite(v)) return "unk"; return v < 1 ? "u1" : v < 5 ? "1to5" : "5up"; };
  const VAL_LABEL = { u1: "Under $1", "1to5": "$1 to $5", "5up": "$5 and up", unk: "No estimate" };
  const metalOf = (f) => (f.is_gold ? "gold" : f.is_silver ? "silver" : "base");
  const METAL_LABEL = { silver: "Silver", gold: "Gold", base: "Base metal" };
  const typeOf = (f) => (f.kind === "token" ? "token" : "coin");
  const TYPE_LABEL = { coin: "Coins", token: "Tokens" };

  // Facets this wing adds on top of app.js's flipFilter (q, country, iso, year, silverOnly, phase2, staging).
  const FACETS = {
    cont:    { label: "Continent", all: "All continents", get: (f) => f.continent || "", name: (v) => v },
    country: { label: "Country",   all: "All countries",  get: (f) => f.country || "",   name: (v) => v },
    era:     { label: "Era",       all: "All years",      get: eraOf, name: eraLabel },
    metal:   { label: "Metal",     all: "Any metal",      get: metalOf, name: (v) => METAL_LABEL[v] || v },
    val:     { label: "Value",     all: "Any value",      get: valBand, name: (v) => VAL_LABEL[v] || v },
    type:    { label: "Type",      all: "All types", get: typeOf, name: (v) => TYPE_LABEL[v] || v },
  };
  const EXTRA = ["cont", "era", "metal", "val", "type", "yFrom", "yTo"];

  const SORTS = [
    ["added", "Recently added", { key: "added", dir: -1 }],
    ["year-asc", "Oldest year first", { key: "year", dir: 1 }],
    ["year-desc", "Newest year first", { key: "year", dir: -1 }],
    ["value-desc", "Highest value", { key: "est", dir: -1 }],
    ["value-asc", "Lowest value", { key: "est", dir: 1 }],
    ["country", "Country A to Z", { key: "country", dir: 1 }],
    ["silver", "Most silver", { key: "asw_oz", dir: -1 }],
    ["ser", "Catalogue number (SER)", { key: "ser", dir: 1 }],
  ];
  function sortId(s) {
    if (!s) return "added";
    if (s.key === "scan" || s.key === "newest" || s.key === "added") return "added";
    if (s.key === "value") return s.dir === 1 ? "value-asc" : "value-desc";
    if (s.key === "asw") return "silver";
    const hit = SORTS.find(([, , v]) => v.key === s.key && v.dir === s.dir);
    return hit ? hit[0] : (SORTS.find(([, , v]) => v.key === s.key) || SORTS[0])[0];
  }

  /** Filter hook called from app.js filteredFlips(): applies this wing's facets. */
  function refine(rows, ff) {
    ff = ff || F();
    const yF = parseInt(ff.yFrom, 10), yT = parseInt(ff.yTo, 10);
    const any = ff.cont || ff.era || ff.metal || ff.val || ff.type || Number.isFinite(yF) || Number.isFinite(yT);
    if (!any) return rows;
    return rows.filter((f) => {
      if (ff.cont && (f.continent || "") !== ff.cont) return false;
      if (ff.era && eraOf(f) !== ff.era) return false;
      if (ff.metal && metalOf(f) !== ff.metal) return false;
      if (ff.val && valBand(f) !== ff.val) return false;
      if (ff.type && typeOf(f) !== ff.type) return false;
      if (Number.isFinite(yF) || Number.isFinite(yT)) {
        const y = yearNum(f);
        if (y == null) return false;
        if (Number.isFinite(yF) && y < yF) return false;
        if (Number.isFinite(yT) && y > yT) return false;
      }
      return true;
    });
  }

  const scanNum = (s) => { const m = String(s || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : -1; };
  /** Sort hook called from app.js filteredFlips(). Undated / unknown values always sink to the end. */
  function sort(rows, s) {
    const key = (s && s.key) || "added";
    const dir = (s && s.dir) || -1;
    const out = [...rows];
    const byAdded = (a, b) => String(b.added || "").localeCompare(String(a.added || "")) || scanNum(b.scan) - scanNum(a.scan);
    const numCmp = (va, vb, d) => {
      const na = va == null || !Number.isFinite(va), nb = vb == null || !Number.isFinite(vb);
      if (na || nb) return na === nb ? 0 : na ? 1 : -1;
      return (va - vb) * d;
    };
    if (key === "scan" || key === "newest" || key === "added") out.sort(byAdded);
    else if (key === "year") out.sort((a, b) => numCmp(yearNum(a), yearNum(b), dir) || String(a.country).localeCompare(String(b.country)));
    else if (key === "est" || key === "value") out.sort((a, b) => numCmp(a.est == null ? null : Number(a.est), b.est == null ? null : Number(b.est), dir) || byAdded(a, b));
    else if (key === "asw_oz" || key === "asw") out.sort((a, b) => numCmp(a.asw_oz == null ? null : Number(a.asw_oz), b.asw_oz == null ? null : Number(b.asw_oz), dir) || numCmp(Number(a.est), Number(b.est), -1));
    else if (key === "country") out.sort((a, b) => String(a.country || "").localeCompare(String(b.country || "")) * dir || numCmp(yearNum(a), yearNum(b), 1));
    else out.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true }) * dir);
    return out;
  }

  /* Query matches, cached per normalized query (search.json may arrive later: the key includes that). */
  let qCache = { key: null, set: null };
  function qSet() {
    const q = norm(F().q || "");
    if (!q) return null;
    const key = q + "|" + (B.searchReady ? 1 : 0);
    if (qCache.key !== key) qCache = { key, set: new Set(flips().filter((f) => B.flipQueryMatch(f, q)).map((f) => f.scan)) };
    return qCache.set;
  }

  /** Does a flip pass every active filter except `except`? (faceted counts) */
  function passes(f, except, qs) {
    const ff = F();
    if (qs && !qs.has(f.scan)) return false;
    if (ff.phase2 && !(f.awaiting_phase2 !== false && f.status !== "Removed" && !f.phase2_done)) return false;
    if (ff.iso && f.iso !== ff.iso) return false;
    if (ff.year && !String(f.year || "").includes(String(ff.year).trim())) return false;
    if (except !== "country" && ff.country && f.country !== ff.country) return false;
    if (except !== "metal" && ff.silverOnly && !f.is_silver) return false;
    for (const k of ["cont", "era", "metal", "val", "type"]) {
      if (k !== except && ff[k] && FACETS[k].get(f) !== ff[k]) return false;
    }
    if (except !== "era") {
      const yF = parseInt(ff.yFrom, 10), yT = parseInt(ff.yTo, 10);
      if (Number.isFinite(yF) || Number.isFinite(yT)) {
        const y = yearNum(f);
        if (y == null || (Number.isFinite(yF) && y < yF) || (Number.isFinite(yT) && y > yT)) return false;
      }
    }
    return true;
  }

  function facetOptions(k) {
    const qs = qSet();
    const counts = new Map();
    const all = new Set();
    for (const f of flips()) {
      const v = FACETS[k].get(f);
      if (!v) continue;
      all.add(v);
      if (passes(f, k, qs)) counts.set(v, (counts.get(v) || 0) + 1);
    }
    let vals = [...all];
    if (k === "era") vals.sort((a, b) => (a === "nd" ? 1 : b === "nd" ? -1 : Number(a) - Number(b)));
    else if (k === "val") vals.sort((a, b) => ["u1", "1to5", "5up", "unk"].indexOf(a) - ["u1", "1to5", "5up", "unk"].indexOf(b));
    else if (k === "cont") vals.sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));
    else vals.sort((a, b) => String(a).localeCompare(String(b)));
    return vals.map((v) => ({ v, n: counts.get(v) || 0 }));
  }

  /* ------------------------------------------------------------------ view state (URL + session) */
  const HASH_RE = /^#gallery[?&/](.+)$/i;
  const PARAM = { q: "q", cont: "cont", country: "c", iso: "iso", era: "era", metal: "metal", val: "val", type: "type", yFrom: "from", yTo: "to" };
  let pendingView = null;

  function captureHash() {
    const m = (location.hash || "").match(HASH_RE);
    if (!m) return false;
    pendingView = new URLSearchParams(m[1]);
    // Leave a plain "#gallery" so app.js routing (restoreUi / setWing) understands the URL.
    history.replaceState(null, "", location.pathname + location.search + "#gallery");
    return true;
  }
  captureHash();

  function applyParams(p) {
    const ff = F();
    ["q", "country", "iso", "year"].forEach((k) => { ff[k] = ""; });
    ff.silverOnly = false; ff.phase2 = false; ff.staging = false;
    EXTRA.forEach((k) => { ff[k] = ""; });
    Object.entries(PARAM).forEach(([k, pk]) => { const v = p.get(pk); if (v != null) ff[k] = v; });
    if (ff.metal === "silver") { ff.silverOnly = false; }
    const s = SORTS.find(([id]) => id === p.get("sort"));
    if (s) B.sort = { ...s[2] };
    if (ff.q) B.ensureSearch();
  }

  function viewParams() {
    const ff = F();
    const p = new URLSearchParams();
    Object.entries(PARAM).forEach(([k, pk]) => { if (has(ff[k])) p.set(pk, String(ff[k]).trim()); });
    if (ff.silverOnly && !ff.metal) p.set("metal", "silver");
    const sid = sortId(B.sort);
    if (sid !== "added") p.set("sort", sid);
    return p;
  }
  function shareUrl() {
    const p = viewParams().toString();
    return location.origin + location.pathname + "#gallery" + (p ? "?" + p : "");
  }
  function writeHash() {
    if (!$("#pane-gallery")?.classList.contains("active")) return;
    if (!/^#gallery\b/i.test(location.hash || "")) return;
    const p = viewParams().toString();
    const next = "#gallery" + (p ? "?" + p : "");
    if (location.hash !== next) history.replaceState(null, "", location.pathname + location.search + next);
  }
  function persistExtra() {
    const ff = F();
    const o = {};
    EXTRA.forEach((k) => { if (has(ff[k])) o[k] = ff[k]; });
    store.sset(VIEW_KEY, o);
  }
  function restoreExtra() {
    const o = store.sget(VIEW_KEY);
    if (!o) return;
    const ff = F();
    EXTRA.forEach((k) => { if (has(o[k]) && !has(ff[k])) ff[k] = o[k]; });
  }

  function activeCount() {
    const ff = F();
    let n = 0;
    ["country", "iso", "year", "cont", "era", "metal", "val", "type"].forEach((k) => { if (has(ff[k])) n++; });
    if (has(ff.yFrom) || has(ff.yTo)) n++;
    if (ff.silverOnly && !ff.metal) n++;
    if (ff.phase2) n++;
    if (ff.staging) n++;
    return n;
  }
  function clearAll(keepQuery) {
    const ff = F();
    if (!keepQuery) ff.q = "";
    ["country", "iso", "year"].forEach((k) => { ff[k] = ""; });
    ff.silverOnly = false; ff.phase2 = false; ff.staging = false;
    EXTRA.forEach((k) => { ff[k] = ""; });
  }

  /* ------------------------------------------------------------------ quick views */
  const QUICK = [
    { id: "all", label: "Everything", apply: () => { clearAll(); B.sort = { key: "added", dir: -1 }; } },
    { id: "value", label: "Most valuable", apply: () => { clearAll(); B.sort = { key: "est", dir: -1 }; } },
    { id: "silver", label: "Silver", apply: () => { clearAll(); F().metal = "silver"; B.sort = { key: "asw_oz", dir: -1 }; } },
    { id: "oldest", label: "Oldest", apply: () => { clearAll(); B.sort = { key: "year", dir: 1 }; } },
    { id: "tokens", label: "Tokens", apply: () => { clearAll(); F().type = "token"; B.sort = { key: "added", dir: -1 }; } },
  ];
  function quickActive() {
    const ff = F();
    const plain = !has(ff.q) && activeCount() === (ff.metal || ff.type ? 1 : 0);
    const sid = sortId(B.sort);
    if (plain && !ff.metal && !ff.type) {
      if (sid === "added") return "all";
      if (sid === "value-desc") return "value";
      if (sid === "year-asc") return "oldest";
    }
    if (plain && ff.metal === "silver" && !ff.type) return "silver";
    if (plain && ff.type === "token" && !ff.metal) return "tokens";
    return "";
  }

  /* ------------------------------------------------------------------ tiles */
  const tileCache = new Map();
  function coinSvg(f, side, large) {
    if (typeof window.renderSpecimenBlueprint === "function") return window.renderSpecimenBlueprint(f, !!large, side);
    return `<span class="gx-coin-blank" aria-hidden="true"></span>`;
  }
  function tileHtml(f) {
    const isNew = B.highlight && B.highlight.has(f.scan);
    const key = f.scan + (isNew ? "*" : "");
    const hit = tileCache.get(key);
    if (hit) return hit;
    const denom = f.denom || f.label || "";
    const year = f.year || "Undated";
    const ag = f.is_silver ? `<span class="gx-badge gx-ag" title="Silver${f.asw_oz != null ? ": " + num(f.asw_oz, 4) + " oz pure" : ""}">Ag${f.asw_oz != null ? " " + num(f.asw_oz, 2) + " oz" : ""}</span>` : "";
    const tok = f.kind === "token" ? `<span class="gx-badge gx-tok">Token</span>` : "";
    const photo = f.thumb ? `<img class="gx-photo" data-src="${esc(f.thumb)}" alt="" loading="lazy" decoding="async" />` : "";
    const label = `${f.country || "Unknown country"}, ${year}, ${denom}. ${f.ser || f.scan}. ${f.est != null ? "Estimated " + money(f.est) : ""}`;
    const html = `
      <article class="gx-tile${isNew ? " is-new" : ""}" role="listitem" data-scan="${esc(f.scan)}">
        <button type="button" class="gx-open" data-scan="${esc(f.scan)}" aria-label="${esc(label)}">
          <span class="gx-stage" aria-hidden="true">
            <span class="gx-frame"><span class="gx-clip">
              <span class="gx-coin">
                <span class="gx-face gx-obv">${photo || coinSvg(f, "obv")}</span>
              </span>
            </span></span>
          </span>
          <span class="gx-plac">
            <span class="gx-country">${esc(f.country || "Unknown")}</span>
            <span class="gx-line"><span class="gx-year">${esc(year)}</span>${denom ? ` · ${esc(denom)}` : ""}</span>
            <span class="gx-foot"><span class="gx-ser">${esc(f.ser || f.scan)}</span><span class="gx-val">${f.est != null ? money(f.est) : "—"}</span></span>
          </span>
        </button>
        <span class="gx-badges">${isNew ? `<span class="gx-badge gx-new">New</span>` : ""}${ag}${tok}</span>
        <button type="button" class="gx-turn" data-scan="${esc(f.scan)}" aria-pressed="false" aria-label="Turn over ${esc((f.country || "") + " " + year)}" title="Turn over (F)">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 3.5v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20.5v-5h5"/></svg>
        </button>
      </article>`;
    tileCache.set(key, html);
    return html;
  }

  function turnTile(tile) {
    if (!tile) return;
    const f = flips().find((x) => x.scan === tile.dataset.scan);
    const coin = $(".gx-coin", tile);
    if (!f || !coin) return;
    if (!$(".gx-rev", coin)) coin.insertAdjacentHTML("beforeend", `<span class="gx-face gx-rev">${coinSvg(f, "rev")}</span>`);
    const on = !tile.classList.contains("is-turned");
    tile.classList.toggle("is-turned", on);
    $(".gx-turn", tile)?.setAttribute("aria-pressed", String(on));
    B.playStapleClick();
  }

  /* ------------------------------------------------------------------ shell */
  let shellBuilt = false;
  let wallRows = [];
  let wallSig = "";
  let shown = 0;
  const FIRST = 24, BATCH = 36;
  let io = null;
  let qTimer = null;

  const MODES = [["slab", "Slabs"], ["flip", "2×2 flips"], ["matrix", "Bare coins"]];

  function coverFlowShell() {
    return `
      <div class="gallery-coverflow-wrap gx-cf" id="gallery-coverflow-wrap" aria-label="Showcase carousel">
        <div class="cf-header">
          <div class="cf-header-left">
            <span class="eyebrow"><span class="exhibit-lamp" aria-hidden="true"></span>Showcase</span>
            <h3 class="cf-title">Specimen carousel</h3>
            <p class="gx-cf-hint">Drag, scroll sideways or use ← → · tap the centre piece to turn it over</p>
          </div>
          <div class="cf-header-actions">
            <button type="button" class="btn small" id="cf-btn-flip" title="Turn the centre piece over (Space or F)">Turn over</button>
            <button type="button" class="btn small" id="cf-btn-loupe" title="Magnifying loupe: hover over the coin">Loupe</button>
            <button type="button" class="btn small" id="cf-btn-caliper" title="Size overlay">Calipers</button>
            <button type="button" class="btn small" id="cf-btn-spatial" title="Open this piece on the 3D table">3D table</button>
            <button type="button" class="btn small" id="cf-btn-deepzoom" title="Open the 40× zoom station">Zoom</button>
            <button type="button" class="btn small gx-cf-hide" id="gx-cf-hide" aria-expanded="true" aria-controls="cf-viewport">Hide</button>
          </div>
        </div>
        <div class="cf-viewport" id="cf-viewport" tabindex="0" aria-label="Carousel: use the arrow keys, drag or scroll sideways">
          <div class="cf-stage"></div>
        </div>
        <div class="cf-placard" id="cf-placard"></div>
        <div class="cf-controls">
          <button type="button" class="cf-nav-btn cf-prev" id="cf-btn-prev" aria-label="Previous piece" title="Previous (←)">‹</button>
          <div class="cf-scrubber-wrap">
            <input type="range" class="cf-scrubber" id="cf-scrubber" min="0" max="0" value="0" aria-label="Carousel position" />
          </div>
          <button type="button" class="cf-nav-btn cf-next" id="cf-btn-next" aria-label="Next piece" title="Next (→)">›</button>
          <span class="cf-counter" id="cf-counter" aria-live="polite"></span>
        </div>
      </div>`;
  }

  function selectHtml(k, id) {
    const fc = FACETS[k];
    return `<label class="gx-field"><span class="gx-flabel">${fc.label}</span>
      <select id="${id}" data-facet="${k}" class="gx-select"></select></label>`;
  }

  function buildShell(body) {
    body.innerHTML = `
      <div class="gx" data-mode="${esc(B.mode)}">
        <section class="gx-finder" aria-label="Find pieces">
          <div class="gx-searchrow">
            <label class="gx-search">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
              <span class="gx-sr">Search the gallery</span>
              <input type="search" id="flip-q" placeholder="Search country, year, denomination, notes…" autocomplete="off" enterkeyhint="search" />
              <button type="button" class="gx-qclear" id="gx-qclear" aria-label="Clear search" hidden>×</button>
            </label>
            <label class="gx-field gx-sortfield"><span class="gx-flabel">Sort</span>
              <select id="flip-sort" class="gx-select">${SORTS.map(([id, lbl]) => `<option value="${id}">${lbl}</option>`).join("")}</select>
            </label>
            <button type="button" class="gx-ftoggle" id="gx-ftoggle" aria-expanded="false" aria-controls="gx-facets">Filters<span class="gx-fcount" id="gx-fcount"></span></button>
          </div>
          <div class="gx-quick" role="group" aria-label="Quick views" id="gx-quick">
            ${QUICK.map((q) => `<button type="button" class="gx-chip" data-quick="${q.id}" aria-pressed="false">${q.label}</button>`).join("")}
          </div>
          <div class="gx-facets" id="gx-facets">
            ${selectHtml("cont", "gx-f-cont")}
            ${selectHtml("country", "flip-country")}
            ${selectHtml("era", "gx-f-era")}
            <div class="gx-field gx-range" role="group" aria-label="Year range">
              <span class="gx-flabel">Years</span>
              <span class="gx-range-in">
                <input type="text" id="gx-y-from" inputmode="numeric" maxlength="4" placeholder="From" aria-label="From year" />
                <span aria-hidden="true">to</span>
                <input type="text" id="gx-y-to" inputmode="numeric" maxlength="4" placeholder="To" aria-label="To year" />
              </span>
            </div>
            ${selectHtml("metal", "gx-f-metal")}
            ${selectHtml("val", "gx-f-val")}
            ${selectHtml("type", "gx-f-type")}
          </div>
          <div class="gx-status" id="gx-status" aria-live="polite"></div>
        </section>

        <section class="gx-showcase" id="gx-showcase" aria-label="Showcase">${coverFlowShell()}</section>

        <section class="gx-wall" aria-label="The wall">
          <div class="gx-wallhead">
            <div>
              <span class="eyebrow">The cabinet</span>
              <h2 id="gx-wall-title">On the wall</h2>
            </div>
            <div class="gx-wallctl">
              <div class="gx-modes" role="radiogroup" aria-label="How pieces are shown">
                ${MODES.map(([m, l]) => `<button type="button" class="gx-mode" role="radio" data-gmode="${m}" aria-checked="false">${l}</button>`).join("")}
              </div>
              <button type="button" class="gx-print" id="flip-print" title="Print a list of the pieces shown">Print list</button>
            </div>
          </div>
          <div class="gx-grid" id="gx-grid" role="list" aria-labelledby="gx-wall-title"></div>
          <div class="gx-more" id="gx-more"></div>
        </section>
        <div class="gx-print-sheet" id="gx-print-sheet" aria-hidden="true"></div>
      </div>`;
    bindShell(body);
    B.setupCoverFlowEvents();
    applyShowcasePref();
    shellBuilt = true;
  }

  function update(opts = {}) {
    syncControls();
    renderWall(opts);
    persistExtra();
    B.saveState();
    writeHash();
  }

  function bindShell(body) {
    const q = $("#flip-q", body);
    q.addEventListener("input", () => {
      B.markTyping();
      F().q = q.value;
      if (q.value.trim()) B.ensureSearch();
      $("#gx-qclear").hidden = !q.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(() => update(), 140);
    });
    q.addEventListener("focus", () => { B.markTyping(); B.ensureSearch(); });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && q.value) { e.preventDefault(); e.stopPropagation(); q.value = ""; F().q = ""; $("#gx-qclear").hidden = true; update(); }
      else if (e.key === "Enter") { e.preventDefault(); clearTimeout(qTimer); update(); $("#gx-grid .gx-open")?.focus(); }
    });
    $("#gx-qclear", body).addEventListener("click", () => { q.value = ""; F().q = ""; $("#gx-qclear").hidden = true; update(); q.focus(); });

    $$("select[data-facet]", body).forEach((sel) => sel.addEventListener("change", () => {
      const k = sel.dataset.facet;
      F()[k] = sel.value;
      if (k === "metal") F().silverOnly = false;
      if (k === "country") F().iso = "";
      if (k === "era" && sel.value) { F().yFrom = ""; F().yTo = ""; }
      update();
    }));
    const yIn = (el, k) => {
      el.addEventListener("input", () => {
        el.value = el.value.replace(/\D/g, "").slice(0, 4);
        B.markTyping();
        const v = el.value;
        if (v.length === 4 || v.length === 0) { F()[k] = v; if (v) F().era = ""; clearTimeout(qTimer); qTimer = setTimeout(() => update(), 160); }
      });
    };
    yIn($("#gx-y-from", body), "yFrom");
    yIn($("#gx-y-to", body), "yTo");

    $("#flip-sort", body).addEventListener("change", (e) => {
      const s = SORTS.find(([id]) => id === e.target.value);
      if (s) B.sort = { ...s[2] };
      update();
    });
    $("#gx-ftoggle", body).addEventListener("click", (e) => {
      const open = e.currentTarget.getAttribute("aria-expanded") !== "true";
      e.currentTarget.setAttribute("aria-expanded", String(open));
      $("#gx-facets").classList.toggle("open", open);
    });
    $("#gx-quick", body).addEventListener("click", (e) => {
      const b = e.target.closest("[data-quick]");
      if (!b) return;
      const qv = QUICK.find((x) => x.id === b.dataset.quick);
      if (!qv) return;
      qv.apply();
      $("#flip-q").value = "";
      update();
      B.playStapleClick();
    });
    $("#gx-status", body).addEventListener("click", onStatusClick);
    $("#gx-more", body).addEventListener("click", (e) => {
      if (e.target.closest("[data-act='more']")) appendBatch(BATCH * 3);
      else onStatusClick(e);
    });

    // Modes
    $$(".gx-mode", body).forEach((btn) => btn.addEventListener("click", () => {
      B.mode = btn.dataset.gmode;
      $(".gx").dataset.mode = B.mode;
      syncModes();
      B.playStapleClick();
    }));
    $("#flip-print", body).addEventListener("click", () => { buildPrintSheet(); window.print(); });

    // Wall: one delegated handler for every tile, bound once.
    const grid = $("#gx-grid", body);
    grid.addEventListener("click", (e) => {
      const turn = e.target.closest(".gx-turn");
      if (turn) { e.preventDefault(); turnTile(turn.closest(".gx-tile")); return; }
      const open = e.target.closest(".gx-open");
      if (open) openPiece(open.dataset.scan, "Gallery");
    });
    grid.addEventListener("keydown", onGridKey);

    // Keep the carousel's global Space / arrow / F keys on the carousel only:
    // a focused button, field or tile elsewhere in the wing must behave normally.
    body.addEventListener("keydown", (e) => {
      if (![" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "f", "F"].includes(e.key)) return;
      const t = e.target;
      if (!t || t === body || t.closest("#cf-viewport")) return;
      if (t.closest("button, a, select, input, textarea, summary, [role='button'], [role='radio'], .gx-tile")) e.stopPropagation();
    });

    // Showcase collapse
    $("#gx-cf-hide", body).addEventListener("click", () => {
      const hidden = !$("#gx-showcase").classList.contains("collapsed");
      store.set(SHOWCASE_KEY, hidden ? "hidden" : "shown");
      applyShowcasePref();
    });
  }

  function applyShowcasePref() {
    const hidden = store.get(SHOWCASE_KEY, "shown") === "hidden";
    const sc = $("#gx-showcase");
    if (!sc) return;
    sc.classList.toggle("collapsed", hidden);
    const b = $("#gx-cf-hide");
    if (b) { b.textContent = hidden ? "Show" : "Hide"; b.setAttribute("aria-expanded", String(!hidden)); }
    if (!hidden) requestAnimationFrame(() => window.updateCoverFlowTransforms && window.updateCoverFlowTransforms());
  }

  function onStatusClick(e) {
    const t = e.target.closest("[data-clear], [data-act]");
    if (!t) return;
    const ff = F();
    if (t.dataset.clear) {
      const k = t.dataset.clear;
      if (k === "years") { ff.yFrom = ""; ff.yTo = ""; }
      else if (k === "metal") { ff.metal = ""; ff.silverOnly = false; }
      else if (k === "q") { ff.q = ""; $("#flip-q").value = ""; }
      else if (k === "phase2" || k === "staging") ff[k] = false;
      else ff[k] = "";
      update();
      return;
    }
    const act = t.dataset.act;
    if (act === "clear-all") { clearAll(true); update(); }
    else if (act === "clear-everything") { clearAll(false); $("#flip-q").value = ""; update(); }
    else if (act === "share") copyLink(t);
    else if (act === "relax") { ff[t.dataset.key] = ""; if (t.dataset.key === "years") { ff.yFrom = ""; ff.yTo = ""; } if (t.dataset.key === "metal") ff.silverOnly = false; update(); }
    else if (act === "notes") { B.ensureSearch(); }
  }

  let toastT = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3200);
  }
  async function copyLink(btn) {
    const url = shareUrl();
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (_) { ok = false; }
    if (btn) { const t = btn.textContent; btn.textContent = ok ? "Link copied" : "Copy failed"; setTimeout(() => { btn.textContent = t; }, 1800); }
    toast(ok ? "Link to this view copied" : url);
  }

  /* ------------------------------------------------------------------ sync controls */
  function fillSelect(sel, k) {
    const fc = FACETS[k];
    const cur = k === "metal" ? (F().metal || (F().silverOnly ? "silver" : "")) : (F()[k] || "");
    const opts = facetOptions(k);
    const html = `<option value="">${fc.all}</option>` + opts.map(({ v, n }) =>
      `<option value="${esc(v)}"${v === cur ? " selected" : ""}${n === 0 && v !== cur ? " disabled" : ""}>${esc(fc.name(v))} (${n})</option>`).join("");
    if (sel.dataset.html !== html) { sel.innerHTML = html; sel.dataset.html = html; }
    sel.value = cur;
    sel.classList.toggle("is-set", !!cur);
  }

  function syncModes() {
    $$(".gx-mode").forEach((b) => {
      const on = b.dataset.gmode === B.mode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }

  function syncControls() {
    const ff = F();
    const q = $("#flip-q");
    if (q && document.activeElement !== q && q.value !== (ff.q || "")) q.value = ff.q || "";
    if ($("#gx-qclear")) $("#gx-qclear").hidden = !(q && q.value);
    $$("select[data-facet]").forEach((sel) => fillSelect(sel, sel.dataset.facet));
    const yf = $("#gx-y-from"), yt = $("#gx-y-to");
    if (yf && document.activeElement !== yf) yf.value = ff.yFrom || "";
    if (yt && document.activeElement !== yt) yt.value = ff.yTo || "";
    const so = $("#flip-sort");
    if (so) so.value = sortId(B.sort);
    const n = activeCount();
    const fc = $("#gx-fcount");
    if (fc) fc.textContent = n ? ` · ${n}` : "";
    const qa = quickActive();
    $$("#gx-quick [data-quick]").forEach((b) => {
      const on = b.dataset.quick === qa;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    const gx = $(".gx");
    if (gx) gx.dataset.mode = B.mode;
    syncModes();
  }

  function chip(label, clearKey) {
    return `<button type="button" class="gx-achip" data-clear="${clearKey}" aria-label="Remove filter: ${esc(label)}">${esc(label)}<span aria-hidden="true">×</span></button>`;
  }
  function activeChips() {
    const ff = F();
    const out = [];
    if (has(ff.q)) out.push(chip(`“${ff.q.trim()}”`, "q"));
    if (ff.cont) out.push(chip(ff.cont, "cont"));
    if (ff.country) out.push(chip(ff.country, "country"));
    if (ff.iso) out.push(chip(B.isoName(ff.iso) || ff.iso, "iso"));
    if (ff.era) out.push(chip(eraLabel(ff.era), "era"));
    if (has(ff.yFrom) || has(ff.yTo)) out.push(chip(`${ff.yFrom || "…"} to ${ff.yTo || "…"}`, "years"));
    if (ff.year) out.push(chip(`Year contains ${ff.year}`, "year"));
    if (ff.metal || ff.silverOnly) out.push(chip(METAL_LABEL[ff.metal || "silver"], "metal"));
    if (ff.val) out.push(chip(VAL_LABEL[ff.val], "val"));
    if (ff.type) out.push(chip(TYPE_LABEL[ff.type], "type"));
    if (ff.phase2) out.push(chip("Awaiting photos", "phase2"));
    if (ff.staging) out.push(chip("Staging album", "staging"));
    return out;
  }

  function renderStatus(rows) {
    const total = flips().length;
    const sum = rows.reduce((s, f) => s + (Number(f.est) || 0), 0);
    const ag = rows.filter((f) => f.is_silver).length;
    const chips = activeChips();
    const searching = has(F().q) && !B.searchReady;
    $("#gx-status").innerHTML = `
      <p class="gx-count"><strong>${intFmt(rows.length)}</strong> ${rows.length === 1 ? "piece" : "pieces"}${rows.length !== total ? ` of ${intFmt(total)}` : ""}
        <span class="gx-sum">· est. ${money(sum)}${ag ? ` · ${ag} silver` : ""}</span>${searching ? `<span class="gx-sum"> · searching notes…</span>` : ""}</p>
      ${chips.length ? `<div class="gx-achips">${chips.join("")}
        ${chips.length > 1 ? `<button type="button" class="gx-link" data-act="clear-everything">Clear all</button>` : ""}</div>` : ""}
      <button type="button" class="gx-link gx-share" data-act="share" title="Copy a link that opens the gallery with these filters">Copy link to this view</button>`;
  }

  /* ------------------------------------------------------------------ wall */
  function emptyHtml() {
    const ff = F();
    const qs = qSet();
    // Suggest the single filter whose removal brings back the most pieces.
    const keys = [["cont", ff.cont], ["country", ff.country], ["era", ff.era], ["metal", ff.metal || (ff.silverOnly ? "silver" : "")], ["val", ff.val], ["type", ff.type], ["years", ff.yFrom || ff.yTo]];
    const tips = [];
    for (const [k, v] of keys) {
      if (!v) continue;
      const except = k === "years" ? "era" : k;
      const n = flips().filter((f) => passes(f, except, qs) && (k !== "years" || !ff.era || eraOf(f) === ff.era)).length;
      if (n) tips.push({ k, n, label: k === "years" ? `${ff.yFrom || "…"} to ${ff.yTo || "…"}` : (FACETS[k] ? FACETS[k].name(v) : v) });
    }
    tips.sort((a, b) => b.n - a.n);
    const q = (ff.q || "").trim();
    return `<div class="gx-empty" role="status">
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="17" stroke-dasharray="2 3"/><path d="M24 40l16-16"/></svg>
      <h3>Nothing on the wall matches${q ? ` “${esc(q)}”` : ""}</h3>
      <p>${q && !B.searchReady ? "Still loading the notes index; results may appear in a moment. " : ""}Try removing a filter:</p>
      <div class="gx-empty-acts">
        ${tips.slice(0, 3).map((t) => `<button type="button" class="gx-chip" data-act="relax" data-key="${t.k}">Remove “${esc(t.label)}” → ${t.n}</button>`).join("")}
        ${q ? `<button type="button" class="gx-chip" data-clear="q">Clear the search</button>` : ""}
        <button type="button" class="gx-chip" data-act="clear-everything">Show everything</button>
      </div>
    </div>`;
  }

  function renderWall(opts = {}) {
    const grid = $("#gx-grid");
    if (!grid) return;
    wallRows = B.filteredFlips();
    const sig = wallRows.map((f) => f.scan).join(",") + "|" + (B.highlight ? B.highlight.size : 0);
    renderStatus(wallRows);
    const title = $("#gx-wall-title");
    if (title) title.textContent = wallRows.length === flips().length ? "On the wall" : `On the wall · ${intFmt(wallRows.length)}`;
    if (sig === wallSig && !opts.force) return;
    const keep = sig.split("|")[0].length && wallSig.split("|")[0] === sig.split("|")[0] ? shown : 0;
    wallSig = sig;
    $(".gx")?.classList.toggle("is-empty", !wallRows.length);
    if (!wallRows.length) {
      grid.innerHTML = "";
      $("#gx-more").innerHTML = emptyHtml();
      refreshShowcase();
      return;
    }
    shown = Math.min(wallRows.length, Math.max(keep, FIRST));
    grid.innerHTML = wallRows.slice(0, shown).map(tileHtml).join("");
    B.lazyThumbs(grid);
    renderMore();
    refreshShowcase();
  }

  function appendBatch(n = BATCH) {
    const grid = $("#gx-grid");
    if (!grid || shown >= wallRows.length) return;
    const next = wallRows.slice(shown, shown + n);
    shown += next.length;
    grid.insertAdjacentHTML("beforeend", next.map(tileHtml).join(""));
    B.lazyThumbs(grid);
    renderMore();
  }

  function renderMore() {
    const more = $("#gx-more");
    if (!more) return;
    const left = wallRows.length - shown;
    more.innerHTML = left > 0
      ? `<div class="gx-sentinel" aria-hidden="true"></div><button type="button" class="gx-morebtn" data-act="more">Show more · ${intFmt(left)} to go</button>`
      : (wallRows.length > FIRST ? `<p class="gx-end">All ${intFmt(wallRows.length)} pieces shown</p>` : "");
    if (io) io.disconnect();
    const s = $(".gx-sentinel", more);
    if (s && "IntersectionObserver" in window) {
      io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) appendBatch(); }, { rootMargin: "900px 0px" });
      io.observe(s);
    }
  }

  function refreshShowcase() {
    const sc = $("#gx-showcase");
    if (!sc) return;
    sc.hidden = !wallRows.length;
    const stage = $("#gallery-coverflow-wrap .cf-stage");
    if (stage) stage.innerHTML = ""; // the engine reuses nodes by index; rows changed, so start clean
    if (wallRows.length) B.renderCoverFlow(0);
  }

  /* Arrow keys move between tiles; F turns the focused piece over. */
  function onGridKey(e) {
    const tile = e.target.closest(".gx-tile");
    if (!tile) return;
    const tiles = $$("#gx-grid .gx-tile");
    const i = tiles.indexOf(tile);
    let j = -1;
    const cols = (() => { const top = tiles[0]?.offsetTop; let c = 0; for (const t of tiles) { if (t.offsetTop !== top) break; c++; } return Math.max(1, c); })();
    if (e.key === "ArrowRight") j = i + 1;
    else if (e.key === "ArrowLeft") j = i - 1;
    else if (e.key === "ArrowDown") j = i + cols;
    else if (e.key === "ArrowUp") j = i - cols;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tiles.length - 1;
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); turnTile(tile); return; }
    else return;
    e.preventDefault();
    if (j >= tiles.length && shown < wallRows.length) { appendBatch(); j = Math.min(j, $$("#gx-grid .gx-tile").length - 1); }
    const all = $$("#gx-grid .gx-tile");
    j = Math.max(0, Math.min(all.length - 1, j));
    const target = $(".gx-open", all[j]);
    if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" }); }
  }

  function rememberRecent(scan) {
    const list = store.get(RECENT_KEY, []).filter((s) => s !== scan);
    list.unshift(scan);
    store.set(RECENT_KEY, list.slice(0, 6));
  }
  function openPiece(scan, label) {
    rememberRecent(scan);
    B.openDrawer(scan, label ? { label, scans: wallRows.map((f) => f.scan) } : null);
  }

  /* ------------------------------------------------------------------ print list */
  function buildPrintSheet() {
    const el = $("#gx-print-sheet");
    if (!el) return;
    const rows = wallRows;
    const chips = activeChips().length ? activeChips().map((h) => h.replace(/<[^>]+>/g, "").replace("×", "")).join(", ") : "All pieces";
    el.innerHTML = `
      <h2>Titan Reliquary · Gallery list</h2>
      <p>${esc(chips)} · ${intFmt(rows.length)} pieces · est. ${money(rows.reduce((s, f) => s + (Number(f.est) || 0), 0))}</p>
      <table><thead><tr><th>SER</th><th>Country</th><th>Year</th><th>Denomination</th><th>Mint</th><th>Est.</th></tr></thead>
      <tbody>${rows.map((f) => `<tr><td>${esc(f.ser || f.scan)}</td><td>${esc(f.country || "")}</td><td>${esc(f.year || "")}</td><td>${esc(f.denom || "")}${f.is_silver ? " (Ag)" : ""}</td><td>${esc(f.mint || "")}</td><td>${f.est != null ? money(f.est) : ""}</td></tr>`).join("")}</tbody></table>`;
  }
  window.addEventListener("beforeprint", () => { if ($("#pane-gallery")?.classList.contains("active")) buildPrintSheet(); });

  /* ------------------------------------------------------------------ render entry (called by app.js renderGallery) */
  let inited = false;
  function render() {
    if (!B.vault || !B.vault.flips) return false;
    const body = $("#gallery-body");
    if (!body) return false;
    if (B.tray !== "all") B.tray = "all";
    if (!inited) {
      inited = true;
      if (pendingView) {
        const pv = pendingView;
        pendingView = null;
        applyParams(pv);
        // app.js restoreUi() may overwrite flipFilter from the session right after this render; re-apply once it has run.
        setTimeout(() => { applyParams(pv); update({ force: true }); }, 0);
      } else restoreExtra();
    }
    if (!shellBuilt || !$(".gx", body)) { shellBuilt = false; wallSig = ""; buildShell(body); }
    syncControls();
    renderWall();
    writeHash();
    return true;
  }

  function goGallery(scrollToWall) {
    B.setWing("gallery");
    render();
    update({ force: true });
    if (scrollToWall) requestAnimationFrame(() => $("#gx-status")?.scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" }));
  }

  // A pasted / edited "#gallery?..." link while the app is open.
  window.addEventListener("hashchange", () => {
    if (captureHash() && B.vault) {
      applyParams(pendingView); pendingView = null; inited = true;
      goGallery(false);
    }
  });

  /* ------------------------------------------------------------------ ⌘K palette */
  let palItems = [];
  let palSel = 0;
  const WINGS = [
    ["hall", "Grand Hall", "Overview, value and what's new"],
    ["gallery", "Gallery", "Every flip on the wall"],
    ["vault", "Vault", "Bullion, sets and reserves"],
    ["study", "Curator's Study", "Albums, world map and ledger"],
    ["lab", "Conservation Lab", "Photography progress"],
  ];
  function palActions() {
    const run = (fn) => () => { fn(); };
    return [
      { t: "Most valuable pieces", s: "Gallery sorted by estimate", k: "valuable expensive top best value crown", run: run(() => { QUICK[1].apply(); goGallery(true); }) },
      { t: "Silver pieces", s: `${flips().filter((f) => f.is_silver).length} flips with silver content`, k: "silver ag metal melt", run: run(() => { QUICK[2].apply(); goGallery(true); }) },
      { t: "Oldest pieces first", s: "Gallery sorted by year", k: "oldest old early history timeline year", run: run(() => { QUICK[3].apply(); goGallery(true); }) },
      { t: "Recently added", s: "Newest entries in the ledger", k: "recent new latest added", run: run(() => { QUICK[0].apply(); goGallery(true); }) },
      { t: "Clear gallery filters", s: "Show all pieces", k: "clear reset all filters everything", run: run(() => { clearAll(false); goGallery(true); }) },
      { t: "Surprise me", s: "Open a random piece", k: "random surprise any lucky", run: run(() => { const all = flips(); const f = all[Math.floor(Math.random() * all.length)]; if (f) openPiece(f.scan); }) },
      { t: "Change the atmosphere", s: "Lighting, sound and music", k: "atmosphere theme lighting colour color dark light music sound", run: run(() => B.openAtmoSheet()) },
      { t: "Keyboard shortcuts", s: "Press ? anywhere", k: "keyboard shortcuts keys help", run: run(() => B.openKeysSheet()) },
      { t: "Open the 3D table", s: "Examine a piece in 3D", k: "3d table spatial museum room", run: run(() => B.launchSpatial()) },
      { t: "Print the gallery list", s: "Printable inventory of the current view", k: "print list inventory paper", run: run(() => { B.setWing("gallery"); render(); buildPrintSheet(); setTimeout(() => window.print(), 60); }) },
    ];
  }
  const blobCache = new WeakMap();
  function blob(o, fields) {
    let b = blobCache.get(o);
    if (!b) { b = norm(fields.map((k) => o[k]).filter(has).join(" ")); blobCache.set(o, b); }
    return b;
  }
  const wordsMatch = (text, q) => q.split(" ").every((w) => text.includes(w));

  function palRowHtml(it, i) {
    return `<button type="button" class="gxp-row${i === palSel ? " sel" : ""}" id="gxp-${i}" role="option" aria-selected="${i === palSel}" data-i="${i}">
      <span class="gxp-ico gxp-${it.g}" aria-hidden="true">${it.ico || ""}</span>
      <span class="gxp-main"><span class="gxp-t">${it.t}</span>${it.s ? `<span class="gxp-s">${it.s}</span>` : ""}</span>
      ${it.r ? `<span class="gxp-r">${it.r}</span>` : ""}
    </button>`;
  }
  const ICO = {
    piece: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5" stroke-dasharray="1.5 1.8"/></svg>`,
    vault: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 16l3-6h12l3 6z"/><path d="M6 10l2-4h8l2 4"/></svg>`,
    album: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="3" width="14" height="18" rx="1.5"/><circle cx="10" cy="9" r="1.6"/><circle cx="14" cy="9" r="1.6"/><circle cx="10" cy="14" r="1.6"/><circle cx="14" cy="14" r="1.6"/></svg>`,
    place: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>`,
    wing: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
    act: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>`,
  };

  function buildPalette(qRaw) {
    const q = norm(qRaw || "");
    const items = [];
    const push = (g, it) => items.push({ g, ico: ICO[g === "recent" ? "piece" : g], ...it });
    const flipItem = (f) => ({
      t: `${esc(f.country || "")} · ${esc(f.year || "")}`,
      s: `${esc(f.denom || f.label || "")} · <span class="gxp-mono">${esc(f.ser || f.scan)}</span>${f.is_silver ? " · Ag" : ""}`,
      r: f.est != null ? money(f.est) : "",
      run: () => openPiece(f.scan),
    });
    if (!q) {
      const recent = store.get(RECENT_KEY, []).map((s) => flips().find((f) => f.scan === s)).filter(Boolean).slice(0, 4);
      recent.forEach((f) => push("recent", { ...flipItem(f), head: "Recently viewed" }));
      palActions().slice(0, 4).forEach((a) => push("act", { t: a.t, s: a.s, run: a.run, head: "Suggestions" }));
      WINGS.forEach(([w, t, s]) => push("wing", { t, s, run: () => B.setWing(w), head: "Go to" }));
      return items;
    }
    // Year / decade shortcuts: "1964", "1960s"
    const ym = q.match(/^(1[5-9]\d|20\d)(\d|0s)$/);
    if (ym) {
      const dec = /s$/.test(q);
      const y = parseInt(q, 10);
      const n = flips().filter((f) => { const yy = yearNum(f); return yy != null && (dec ? Math.floor(yy / 10) * 10 === y : yy === y); }).length;
      if (n) push("act", { t: dec ? `Pieces from the ${y}s` : `Pieces from ${y}`, s: `${n} on the wall`, head: "Show in the gallery",
        run: () => { clearAll(false); const ff = F(); if (dec) ff.era = String(y); else { ff.yFrom = String(y); ff.yTo = String(y); } goGallery(true); } });
    }
    // Continents and countries
    const conts = new Map(), ctry = new Map();
    flips().forEach((f) => {
      if (f.continent) conts.set(f.continent, (conts.get(f.continent) || 0) + 1);
      if (f.country) ctry.set(f.country, (ctry.get(f.country) || 0) + 1);
    });
    [...conts].filter(([c]) => wordsMatch(norm(c), q)).forEach(([c, n]) => push("place", { t: esc(c), s: `${n} pieces`, head: "Places",
      run: () => { clearAll(false); F().cont = c; goGallery(true); } }));
    [...ctry].filter(([c]) => wordsMatch(norm(c), q)).slice(0, 4).forEach(([c, n]) => push("place", { t: esc(c), s: `${n} ${n === 1 ? "piece" : "pieces"}`, head: "Places",
      run: () => { clearAll(false); F().country = c; goGallery(true); } }));
    // Flips
    const hits = flips().filter((f) => B.flipQueryMatch(f, q));
    hits.slice(0, 6).forEach((f) => push("piece", { ...flipItem(f), head: `Pieces · ${hits.length}` }));
    if (hits.length > 6) push("piece", { t: `Show all ${hits.length} matches on the wall`, s: `Search the gallery for “${esc(qRaw.trim())}”`, head: `Pieces · ${hits.length}`,
      run: () => { clearAll(false); F().q = qRaw.trim(); goGallery(true); } });
    // Vault: bullion, sets, housing, stamps
    const v = B.vault;
    const pools = [["bullion", "Bullion"], ["sets", "Set"], ["housing", "Housing"], ["stamps", "Stamps"]];
    const vHits = [];
    pools.forEach(([k, lbl]) => (v[k] || []).forEach((c) => {
      if (wordsMatch(blob(c, ["scan", "ser", "country", "year", "denom", "denom_line", "cat", "metal", "label", "kind"]) + " " + norm(lbl), q)) vHits.push([c, lbl]);
    }));
    vHits.slice(0, 5).forEach(([c, lbl]) => push("vault", {
      t: esc(c.denom_line || c.denom || c.label || c.scan).slice(0, 90), s: `${lbl} · <span class="gxp-mono">${esc(c.scan)}</span>${c.country && lbl !== "Housing" ? " · " + esc(c.country) : ""}`,
      r: c.est != null ? money(c.est) : "", head: `Vault · ${vHits.length}`, run: () => B.openDrawer(c.scan, null),
    }));
    // Album families
    (v.albums_glance || []).filter((g) => wordsMatch(norm([g.family, g.ids, "album binder"].join(" ")), q)).slice(0, 4).forEach((g) => push("album", {
      t: esc(g.family), s: `${intFmt(g.coins)} coins · ${esc(g.ids)}`, r: g.total != null ? money(g.total) : "", head: "Albums",
      run: () => { if (typeof window.openAlbumInspector === "function") { B.setWing("study"); window.openAlbumInspector(g.family, g.ids); } else B.setWing("study"); },
    }));
    // Wings + actions
    WINGS.filter(([w, t, s]) => wordsMatch(norm(`${w} ${t} ${s} wing room`), q)).forEach(([w, t, s]) => push("wing", { t, s, head: "Go to", run: () => B.setWing(w) }));
    palActions().filter((a) => wordsMatch(norm(`${a.t} ${a.k}`), q)).slice(0, 4).forEach((a) => push("act", { t: a.t, s: a.s, head: "Actions", run: a.run }));
    return items;
  }

  function renderPalette(qRaw) {
    const box = $("#palette-results");
    if (!box || !B.vault) return false;
    palItems = buildPalette(qRaw);
    palSel = 0;
    const input = $("#palette-q");
    if (input && input.placeholder.indexOf("pieces") < 0) input.placeholder = "Search pieces, countries, bullion, albums, actions…";
    if (!palItems.length) {
      box.innerHTML = `<div class="gxp-empty">Nothing found for “${esc(qRaw)}”.<br/><span>Try a country, a year like 1964, a denomination, or a word from the notes.</span></div>`;
      input?.removeAttribute("aria-activedescendant");
      return true;
    }
    let html = "", last = "";
    palItems.forEach((it, i) => {
      if (it.head !== last) { html += `<div class="gxp-head" role="presentation">${esc(it.head)}</div>`; last = it.head; }
      html += palRowHtml(it, i);
    });
    const hint = `<div class="gxp-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>`;
    box.innerHTML = html + hint;
    input?.setAttribute("aria-activedescendant", "gxp-0");
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
    $("#palette-q")?.setAttribute("aria-activedescendant", "gxp-" + palSel);
  }
  function palRun(i) {
    const it = palItems[i];
    if (!it) return;
    B.closePalette();
    try { it.run(); } catch (err) { console.warn("[gallery] palette action failed", err); }
  }
  (function bindPalette() {
    const q = $("#palette-q"), box = $("#palette-results");
    if (!q || !box) return;
    q.addEventListener("keydown", (e) => {
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

  /* ------------------------------------------------------------------ flip dossier body */
  const SCHEMA = ["ser", "scan", "added", "cat", "continent", "country", "iso", "year", "mint", "denom", "refs", "metal", "specs", "mintage", "design", "tender", "qty", "face", "est", "conf", "label", "photo", "parked", "notes"];
  const FULL = [
    ["SER", "ser"], ["Scan", "scan"], ["Scan note", "scan_note"], ["Added", "added"], ["Category", "cat"], ["Continent", "continent"],
    ["Country", "country"], ["ISO", "iso"], ["Year", "year_line"], ["Denomination", "denom_line"], ["Label", "label"],
    ["Metal and condition", "metal"], ["Specs", "specs"], ["Mintage", "mintage"], ["Design", "design"], ["References", "refs"],
    ["Legal tender", "tender"], ["Quantity", "qty"], ["Face and estimate", "face_line"], ["Housing", "parked"], ["Location", "location"],
    ["Photo", "photo"], ["Status", "status"],
  ];
  function mmFrom(c) {
    if (c.diameter_mm != null && Number.isFinite(Number(c.diameter_mm))) return { mm: Number(c.diameter_mm), src: "ledger" };
    const m = String(c.metal || "").match(/(\d{1,2}(?:\.\d+)?)\s*mm\b/i);
    return m ? { mm: parseFloat(m[1]), src: "ledger" } : null;
  }
  function gramsFrom(c) {
    if (c.weight_g != null) return Number(c.weight_g);
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
    if (!c || !flips().some((f) => f.scan === c.scan)) return null; // only real ledger flips (not album slots)
    const photos = (c.photos || []).filter((p) => p.url);
    const hasObv = photos.some((p) => p.role === "obv"), hasRev = photos.some((p) => p.role === "rev");
    const face = (side) => {
      if ((side === "obv" && hasObv) || (side === "rev" && hasRev)) return B.photoSlot(c, side);
      return `<figure class="gxd-face"><span class="gxd-coin">${coinSvg(c, side, true)}</span><figcaption>${side === "obv" ? "Obverse" : "Reverse"}</figcaption></figure>`;
    };
    const drawn = !(hasObv && hasRev);
    const target = c.photo_stem ? `${c.photo_stem}_obv.jpg` : "";
    const photoNote = !target && has(c.photo) ? ` <span class="gxd-photo-note">Ledger: ${esc(c.photo)}</span>` : "";
    const spotAg = B.vault.precious?.spot_ag ?? B.vault.metals?.spot?.ag_usd_oz;
    const melt = c.melt_live != null ? Number(c.melt_live) : (c.asw_oz != null && spotAg != null ? Number(c.asw_oz) * Number(spotAg) : null);
    const size = mmFrom(c);
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
    const fact = (k, v, cls = "") => has(v) ? `<div class="gxd-fact${cls ? " " + cls : ""}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : "";
    const gauge = size ? (() => {
      const pct = Math.max(20, Math.min(96, (size.mm / 50.8) * 100));
      return `<section class="gxd-sec gxd-size" aria-label="Actual size">
        <h4>Size</h4>
        <div class="gxd-gauge">
          <div class="gxd-window" title="2×2 inch flip window (50.8 mm)"><span class="gxd-disc" style="width:${pct.toFixed(1)}%;height:${pct.toFixed(1)}%"></span></div>
          <p><strong>${num(size.mm, 1, 1)} mm</strong> across${grams != null ? ` · <strong>${num(grams, 2)} g</strong>` : ""}<br/><span>Shown inside a 2×2 inch flip (50.8 mm). From the ledger's metal line.</span></p>
        </div>
      </section>`;
    })() : "";
    const full = FULL.filter(([, k]) => has(c[k])).map(([lbl, k]) => `<div class="gxd-fact"><dt>${esc(lbl)}</dt><dd>${esc(c[k])}</dd></div>`).join("");
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
            <div><span class="gxd-k">Estimated value</span><strong class="gxd-est">${c.est != null ? money(c.est) : "—"}</strong></div>
            ${c.face ? `<div><span class="gxd-k">Face value</span><strong>${esc(c.face)}</strong></div>` : ""}
            ${c.is_silver ? `<div><span class="gxd-k">Silver content</span><strong>${c.asw_oz != null ? num(c.asw_oz, 4) + " oz" : "unknown"}</strong>${melt != null ? `<span class="gxd-note">melt ${money(melt)}${spotAg != null ? ` at ${money(spotAg)}/oz` : ""}</span>` : ""}</div>` : ""}
          </div>
        </header>
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
          ${yearNum(c) != null ? `<button type="button" class="gxd-act" data-gxd="era" data-v="${eraOf(c)}">More from the ${eraOf(c)}s</button>` : ""}
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
        clearAll(false);
        F()[act] = v;
        goGallery(true);
      } else if (act === "link") {
        const url = location.origin + location.pathname + "#coin=" + encodeURIComponent(v);
        let ok = false;
        try { await navigator.clipboard.writeText(url); ok = true; } catch (_) { ok = false; }
        const t = b.textContent; b.textContent = ok ? "Link copied" : url; setTimeout(() => { b.textContent = t; }, 2000);
      }
    });
  })();

  /* ------------------------------------------------------------------ public */
  window.TitanGalleryWing = { render, refine, sort, renderPalette, dossierHtml, shareUrl, version: 1 };

  // If app.js already booted (this script loaded late), take over now.
  if (B.vault && B.vault.flips) {
    const wantGallery = inited === false && (pendingView || $("#pane-gallery")?.classList.contains("active"));
    if (pendingView) B.setWing("gallery", false);
    if (wantGallery || $("#gallery-body")?.firstElementChild) render();
  }
})();
