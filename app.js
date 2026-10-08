/* Titan Reliquary — vanilla vault GUI · GitHub Pages PWA (the only app on every device).
   Data: data/index.json (lean list, at start) + data/detail/{ISO}.json (full cards, on tap).
   Refresh: polls version.json every 10s while a drip is active (drip_active + drip_until), else 30s;
   reloads only when the build stamp changes; skips while hidden. */
(() => {
  "use strict";

  /* Formatting + DOM helpers live in js/app-format.js (fix list #32, step 2); one copy for app.js and the split-out modules. */
  const { $, $$, nf, NF_INT, money, esc, num, intFmt, precise } = window.TitanFormat;
  /* Small UI helpers live in js/app-ui.js (fix list #32, step 1 of splitting app.js; loaded just before this file). */
  const UI = window.TitanAppUI || {};
  const goldDust = UI.goldDust || (() => {});
  const countUp = UI.countUp || ((el, target, fmt) => { if (el) el.textContent = fmt(target); });
  const observeReveals = UI.observeReveals || ((root = document) => { root.querySelectorAll(".reveal:not(.in)").forEach((el) => el.classList.add("in")); });


  const STATE_KEY = "tr_ui_state_v1";
  const SEEN_KEY = "tr_seen_flips_v1";
  const AUTO_KEY = "tr_auto_refresh_v1";
  const ATMO_KEY = "tr_atmo_v1";
  const REFRESH_MS_DRIP = 10000;
  const REFRESH_MS_WEB = 30000;
  const REQ_OPEN_KEY = "tr_req_open_v1";
  let dripUntil = 0; // ms epoch; drip polling only while now < dripUntil
  const details = new Map(); // detail bucket -> {scan: fullCard}

  let vault = null;
  let flipSort = { key: "scan", dir: -1 }; // newest first by default
  let flipFilter = { q: "", country: "", iso: "", year: "", silverOnly: false, phase2: false, staging: false };
  let worldSel = ""; // ISO of the country opened on the World tab
  let dossierCtx = null; // {label, scans}: prev/next order when a dossier was opened from a list other than Flips
  let searchIdx = null; // data/search.json {scan: normalized full text}; fetched lazily on first search
  let searchLoading = null;
  let currentDrawerScan = null;
  let autoRefresh = true;
  let loadedAt = Date.now();
  let lastCheckAt = Date.now();
  let typingPauseUntil = 0;
  let drawerScrollPauseUntil = 0;
  let statusTimer = null;
  let reloadTimer = null;
  let toastTimer = null;
  let momentTimer = null; // "From the vault" rotation interval
  let highlightScans = new Set();
  let restoring = false;
  let caliperActive = false;
  try { caliperActive = localStorage.getItem("tr_caliper_v1") === "1"; } catch { /* ignore */ }
  let galleryMode = "slab";
  try {
    const saved = localStorage.getItem("tr_gallery_mode_v1");
    if (saved === "slab" || saved === "flip" || saved === "matrix") {
      galleryMode = saved;
    } else {
      galleryMode = "slab";
      localStorage.setItem("tr_gallery_mode_v1", "slab");
    }
  } catch { /* ignore */ }


  function aswFmt(oz) {
    if (oz == null || Number.isNaN(Number(oz))) return "ASW unknown";
    return num(oz, 4) + " oz";
  }
  function meltLive(f) {
    if (f.melt_live != null) return money(f.melt_live);
    const spot = vault.precious?.spot_ag ?? vault.metals?.spot?.ag_usd_oz;
    if (f.asw_oz != null && spot != null) return money(Number(f.asw_oz) * Number(spot));
    return "—";
  }

  function scanNum(scan) {
    const m = String(scan || "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : -1;
  }
  function formatPT(isoOrPt) {
    if (!isoOrPt) return "—";
    if (/PT\s*$/i.test(String(isoOrPt)) || /\d{4}-\d{2}-\d{2} \d{2}:\d{2} PT/.test(String(isoOrPt))) {
      return String(isoOrPt);
    }
    try {
      const d = new Date(isoOrPt);
      if (Number.isNaN(d.getTime())) return String(isoOrPt);
      return d.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + " PT";
    } catch {
      return String(isoOrPt);
    }
  }
  /** Plain-language "updated" label for people (the internal ledger/version hash is not shown). */
  function updatedLabel() {
    const iso = vault?.generated_at_iso || vault?.generated_at;
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return "Collection";
    return "Updated " + d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function snapshotLabel() {
    return vault?.generated_at_pt || formatPT(vault?.generated_at_iso || vault?.generated_at);
  }

  function saveState() {
    try {
      const active = $(".wing.active");
      const state = {
        wing: active?.dataset.wing || "hall",
        flipQ: flipFilter.q,
        flipCountry: flipFilter.country,
        flipIso: flipFilter.iso,
        flipYear: flipFilter.year,
        worldSel,
        silverOnly: !!flipFilter.silverOnly,
        phase2: !!flipFilter.phase2,
        staging: !!flipFilter.staging,
        flipSort,
        drawerScan: currentDrawerScan,
        scrollY: window.scrollY,
        drawerScroll: $("#drawer-inner")?.scrollTop || 0,
        autoRefresh,
        hash: location.hash,
      };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  function readState() {
    try {
      return JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
    } catch {
      return null;
    }
  }

  const LEGACY_WING = { board: "hall", flips: "gallery", bullion: "vault", world: "study", ops: "lab", age: "study", albums: "study" };
  function mapWing(n) { return LEGACY_WING[n] || n || "hall"; }

  function applyHashTab() {
    const h = (location.hash || "").replace(/^#/, "");
    // Deep link: #coin=EU-CH-008 or #coin=C001 opens that dossier
    const cm = h.match(/^coin=(.+)$/i);
    if (cm && vault) {
      const key = decodeURIComponent(cm[1]).toUpperCase();
      const pools = [vault.flips, vault.bullion, vault.sets, vault.housing, vault.stamps];
      let found = false;
      for (const pool of pools) {
        const hit = (pool || []).find((c) => String(c.ser || "").toUpperCase() === key || String(c.scan || "").toUpperCase() === key);
        if (hit) { dossierCtx = null; setWing(hit.kind === "flip" || hit.kind === "token" ? "gallery" : "vault", false); openDrawer(hit.scan, false); found = true; break; }
      }
      if (!found) {
        // Friendly message instead of silently ignoring a bad link.
        history.replaceState(null, "", "#hall");
        setWing("hall", false);
        showToast(`Coin "${decodeURIComponent(cm[1])}" was not found in the collection. Showing the Hall instead.`);
      }
      return;
    }
    if (h === "atmo") { openAtmoSheet(); return; }
    if (h === "ambient") { window.TitanScene?.open(); return; }
    if (h === "3d" || h === "table" || h === "spatial" || h === "museum") {
      const rows = filteredFlips ? filteredFlips() : (vault ? vault.flips : []);
      const cur = (rows && rows[0]) ? rows[0] : null;
      if (window.TitanSpatial) window.TitanSpatial.open(cur);
      return;
    }
    const w = mapWing(h);
    if (h && $(`.wing[data-wing="${w}"]`)) setWing(w, false);
  }

  let galleryRendered = false;

  function setWing(name, pushHash = true) {
    if (!name) return;

    // 1. Defensively dismiss all open modals, overlays, sheets, drawers, and spatial tables
    if (typeof closeAlbumInspector === "function") closeAlbumInspector();
    if (window.TitanSpatial?.close) window.TitanSpatial.close();
    if (window.TitanDeepZoom?.close) window.TitanDeepZoom.close();
    if (typeof closeDrawer === "function" && currentDrawerScan) closeDrawer();
    if (typeof closeLightbox === "function") closeLightbox();
    if (typeof closeKeysSheet === "function") closeKeysSheet();
    if (typeof closeAtmoSheet === "function") closeAtmoSheet();
    document.body.style.overflow = "";
    window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "wing", wing: name } }));

    // 2. Set active classes on wing buttons and panes so layout geometry exists
    $$(".wing").forEach((b) => {
      const on = b.dataset.wing === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$(".pane").forEach((p) => p.classList.toggle("active", p.id === "pane-" + name));
    if (name === "study" || name === "lab") ensureWingRendered(name);

    // 3. Render gallery or study if entering wing and not yet rendered or if body is empty
    if (name === "gallery") {
      const gBody = $("#gallery-body");
      if ((!galleryRendered || !gBody || !gBody.firstElementChild) && vault && vault.flips) {
        renderGallery();
        galleryRendered = true;
      } else if (typeof updateCoverFlowTransforms === "function") {
        // Re-align Cover Flow transforms now that #pane-gallery is active in viewport
        requestAnimationFrame(() => {
          updateCoverFlowTransforms();
        });
      }
    } else if (name === "study") {
      const sBody = $("#study-body");
      if ((!sBody || !sBody.firstElementChild) && vault) {
        renderStudy();
      }
    } else if (name === "vault") {
      if (vault) {
        pendingWings.delete("vault");
        renderVault();
      }
    }

    // 4. Wing entrances: the room "opens" with a quick rise-and-settle each time
    const pane = $("#pane-" + name);
    if (pane && cfLite()) {
      // phones: no entrance animation (and no forced layout of the whole new pane inside the tap handler)
      pane.classList.remove("wing-enter");
    } else if (pane) {
      pane.classList.remove("wing-enter");
      void pane.offsetWidth; // restart the animation
      pane.classList.add("wing-enter");
    }
    if (pushHash) {
      const next = "#" + name;
      // One history entry per wing change (Back returns to the previous wing); filters inside a wing never push.
      const curBase = (location.hash || "").split("?")[0];
      if (curBase !== next) history.pushState(null, "", next);
    }
    // saveState reads scrollY (a forced layout): do it after the new wing has painted, not inside the tap
    clearTimeout(setWing._save);
    setWing._save = setTimeout(saveState, 500);
  }
  window.setWing = setWing;

  function showToast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function detectNewFlips() {
    const flips = vault.flips || [];
    const count = flips.length;
    const newest = [...flips].sort((a, b) => scanNum(b.scan) - scanNum(a.scan))[0];
    const newestId = newest?.scan || null;
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(SEEN_KEY) || "null"); } catch { prev = null; }

    highlightScans = new Set();
    if (prev && typeof prev.count === "number" && newestId) {
      if (count > prev.count || (prev.newestId && scanNum(newestId) > scanNum(prev.newestId))) {
        const prevMax = scanNum(prev.newestId);
        const fresh = flips
          .filter((f) => scanNum(f.scan) > prevMax)
          .sort((a, b) => scanNum(b.scan) - scanNum(a.scan));
        fresh.forEach((f) => highlightScans.add(f.scan));
        if (fresh.length) {
          const top = fresh[0];
          const denom = top.denom || top.label || "";
          const label = `New: ${top.ser || top.scan} ${top.country || ""} ${denom} (${top.scan})`.replace(/\s+/g, " ").trim();
          showToast(fresh.length > 1 ? `${label} (+${fresh.length - 1} more)` : label);
        }
      }
    }
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify({ count, newestId, at: Date.now() }));
    } catch { /* ignore */ }
  }

  function isPaused() {
    return (
      Date.now() < typingPauseUntil ||
      Date.now() < drawerScrollPauseUntil ||
      !$("#lightbox")?.hidden ||
      ["flip-q", "flip-year", "palette-q"].includes(document.activeElement?.id)
    );
  }

  function markTyping() {
    typingPauseUntil = Date.now() + 8000;
  }

  function dripOn() { return Date.now() < dripUntil; }
  function pollMs() { return dripOn() ? REFRESH_MS_DRIP : REFRESH_MS_WEB; }
  function applyDrip(ver) {
    const until = ver && ver.drip_active && ver.drip_until ? Date.parse(ver.drip_until) : 0;
    dripUntil = Number.isFinite(until) ? until : 0;
  }

  function updateLiveStatus() {
    const el = $("#live-status");
    if (!el) return;
    const secs = Math.max(0, Math.floor((Date.now() - lastCheckAt) / 1000));
    const paused = isPaused();
    el.classList.toggle("off", !autoRefresh);
    el.classList.toggle("drip", dripOn());
    const pauseNote = autoRefresh && paused ? " · paused" : "";
    const narrow = window.matchMedia && window.matchMedia("(max-width: 700px)").matches;
    const every = pollMs() / 1000;
    const mode = dripOn()
      ? (narrow ? `Drip live · checks every ${every}s` : `Drip live · checks every ${every}s while Titan is logging, reloads only on a new publish`)
      : (narrow ? `Live · checks every ${every}s` : `Live · checks for a new publish every ${every}s, reloads only when it changes`);
    el.title = "Polls version.json (no-store); reloads only when the build stamp changes; skips while the app is hidden";
    el.innerHTML = autoRefresh
      ? `<span class="dot"></span>${esc(mode)} · <span class="nowrap">built ${esc(snapshotLabel())} · checked ${secs}s ago</span>${pauseNote}`
      : `<span class="dot"></span>Auto off · <span class="nowrap">built ${esc(snapshotLabel())} · checked ${secs}s ago</span>`;
  }

  let reloadAccum = 0;
  let webCheckInFlight = false;

  /* Never reload while the opening film is playing (it restarted mid-clip when a deploy or a price publish landed).
     The reload waits until the app is backgrounded, so it is invisible and never interrupts the intro's hand-off. */
  let deferredReload = null;
  function reloadWhenSafe(fn) {
    if (!document.documentElement.classList.contains("ts-on")) return fn();
    if (deferredReload) return;
    deferredReload = fn;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && deferredReload) { const f = deferredReload; deferredReload = null; f(); }
    });
  }
  function bustReload() {
    if (document.documentElement.classList.contains("ts-on")) return reloadWhenSafe(bustReload);
    if (deferredReload) return;   // a reload is already queued for the next time the app is backgrounded
    saveState();
    const url = new URL(location.href);
    url.searchParams.set("v", Date.now().toString(36));
    location.replace(url.pathname + url.search + (url.hash || location.hash || ""));
  }

  /** True when `remote` is a later publish than `current` (more than 2 minutes newer). */
  function isNewerPublish(remote, current) {
    const r = Date.parse(remote), c = Date.parse(current);
    if (Number.isFinite(r) && Number.isFinite(c)) return r - c > 120000;
    return remote !== current; // unparseable stamps: fall back to the old behaviour
  }

  async function checkWebVersion() {
    if (webCheckInFlight) return;
    webCheckInFlight = true;
    try {
      const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
      lastCheckAt = Date.now();
      if (!r.ok) return;
      try { localStorage.setItem("titan.lastVersionCheck", String(lastCheckAt)); } catch (_e) { /* storage blocked */ }
      const ver = await r.json();
      applyDrip(ver);
      const current = vault && (vault.generated_at || vault.generated_at_pt || "");
      const remote = ver.generated_at || ver.generated_at_pt || "";
      // The pipeline stamps version.json a second or two after data/index.json in the SAME publish,
      // so an exact string compare reloaded the page on every poll. Reload only for a genuinely newer publish.
      if (remote && current && isNewerPublish(remote, current)) bustReload();
    } catch (_e) {
      lastCheckAt = Date.now();
    } finally {
      webCheckInFlight = false;
      updateLiveStatus();
    }
  }

  function scheduleReload() {
    clearInterval(reloadTimer);
    reloadAccum = 0;
    reloadTimer = setInterval(() => {
      updateLiveStatus();
      if (!autoRefresh) { reloadAccum = 0; return; }
      if (isPaused() || document.hidden) return; // typing / dossier scroll / phone asleep: skip
      reloadAccum += 1000;
      if (reloadAccum >= pollMs()) {
        reloadAccum = 0;
        checkWebVersion();
      }
    }, 1000);
  }

  async function fetchJson(url) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
    return r.json();
  }

  /** Lowercase, accent-free, single-spaced text for matching ("Øre" ~ "ore", "Shōwa" ~ "showa"). */
  function norm(s) {
    return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[øØ]/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss").replace(/\s+/g, " ").trim();
  }
  /** Full-text search index (notes, design, refs, label text, mint, metal, specs…), fetched on first search only. */
  function ensureSearch() {
    if (searchIdx || searchLoading) return searchLoading;
    searchLoading = fetchJson("data/search.json")
      .then((d) => { searchIdx = d || {}; if (flipFilter.q.trim()) renderGallery(); })
      .catch(() => { searchLoading = null; });
    return searchLoading;
  }

  async function loadVault() {
    const btn = $("#btn-refresh");
    if (btn) btn.disabled = true;
    try {
      vault = await fetchJson("data/index.json");
      window.vault = vault;
      details.clear();
      searchIdx = null; searchLoading = null;
      loadedAt = Date.now();
      lastCheckAt = Date.now();
      fetchJson("version.json").then((ver) => { applyDrip(ver); updateLiveStatus(); }).catch(() => {});
      detectNewFlips();
      renderAll();
      restoreUi();
    } catch (e) {
      $("#hall-body").innerHTML = `<p class="error">Failed to load vault: ${esc(e.message)}</p>`;
    } finally {
      if (btn) btn.disabled = false;
      updateLiveStatus();
    }
  }

  /** Full card for a flip (per-country detail JSON, fetched on tap and cached). */
  async function ensureDetail(scan) {
    const lean = (vault.flips || []).find((f) => f.scan === scan);
    if (!lean || lean._full) return lean;
    const bucket = lean.d || "_misc";
    if (!details.has(bucket)) details.set(bucket, await fetchJson(`data/detail/${encodeURIComponent(bucket)}.json`));
    const full = details.get(bucket)[scan];
    if (full) Object.assign(lean, full, { _full: true });
    return lean;
  }

  // Lazy thumbnails: <img data-src> swapped in when scrolled near the viewport.
  const thumbObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const img = en.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        thumbObserver.unobserve(img);
      }
    }, { rootMargin: "300px" })
    : null;
  function lazyThumbs(root = document) {
    $$("img[data-src]", root).forEach((img) => {
      if (thumbObserver) thumbObserver.observe(img);
      else { img.src = img.dataset.src; img.removeAttribute("data-src"); }
    });
  }
  function thumbImg(f, cls = "lc-thumb") {
    return f.thumb
      ? `<img class="${cls}" data-src="${esc(f.thumb)}" loading="lazy" decoding="async" alt="" />`
      : `<span class="${cls} lc-blank" aria-hidden="true"></span>`;
  }

  function restoreUi() {
    restoring = true;
    const st = readState();
    if (st) {
      flipFilter.q = st.flipQ || "";
      flipFilter.country = st.flipCountry || "";
      flipFilter.iso = st.flipIso || "";
      flipFilter.year = st.flipYear || "";
      worldSel = st.worldSel || "";
      if (flipFilter.q) ensureSearch();
      flipFilter.silverOnly = !!st.silverOnly;
      flipFilter.phase2 = !!st.phase2;
      flipFilter.staging = !!st.staging;
      if (st.flipSort) flipSort = st.flipSort;
      if (typeof st.autoRefresh === "boolean") {
        autoRefresh = st.autoRefresh;
        const box = $("#auto-refresh");
        if (box) box.checked = autoRefresh;
      }
    }

    const hash = (location.hash || "").replace(/^#/, "");
    const hashWing = hash && !hash.startsWith("coin=") ? mapWing(hash) : null;
    const targetWing = (hashWing && $(`.wing[data-wing="${hashWing}"]`)) ? hashWing : mapWing(st?.wing || st?.tab || "hall");
    setWing(targetWing, false);

    // Re-render gallery / study with restored filters
    if (targetWing === "gallery") {
      renderGallery();
      galleryRendered = true;
    }
    ensureWingRendered("study");
    if (st && st.drawerScan && !hash.startsWith("coin=")) {
      openDrawer(st.drawerScan, false);
      requestAnimationFrame(() => {
        const inner = $("#drawer-inner");
        if (inner && st.drawerScroll) inner.scrollTop = st.drawerScroll;
      });
    }
    requestAnimationFrame(() => {
      if (st && typeof st.scrollY === "number") window.scrollTo(0, st.scrollY);
    });
    if (hash.startsWith("coin=") || !st) {
      applyHashTab();
    }
    // localStorage auto preference wins over default if set
    try {
      const savedAuto = localStorage.getItem(AUTO_KEY);
      if (savedAuto != null) {
        autoRefresh = savedAuto === "1";
        const box = $("#auto-refresh");
        if (box) box.checked = autoRefresh;
      }
    } catch { /* ignore */ }
    restoring = false;
    updateLiveStatus();
  }

  const pendingWings = new Set();
  function ensureWingRendered(name) {
    if (!name || !pendingWings.has(name) || !vault) return;
    pendingWings.delete(name);
    if (name === "vault") renderVault();
    else if (name === "study") renderStudy();
    else if (name === "lab") renderLab();
    lazyThumbs();
    observeReveals();
  }
  let deferredWingTimer = 0;
  function scheduleDeferredWings() {
    if (deferredWingTimer) return;
    const ric = window.requestIdleCallback ? (cb) => window.requestIdleCallback(cb, { timeout: 4000 }) : (cb) => setTimeout(cb, 600);
    const step = () => {
      deferredWingTimer = 0;
      const next = ["vault", "study", "lab"].find((w) => pendingWings.has(w));
      if (!next) return;
      ensureWingRendered(next);
      deferredWingTimer = 1;
      ric(step);
    };
    deferredWingTimer = 1;
    setTimeout(() => ric(step), 800);
  }

  function renderAll() {
    renderHero();
    renderHall();
    const st = readState();
    const hash = (location.hash || "").replace(/^#/, "");
    const activeWing = hash && !hash.startsWith("coin=") ? mapWing(hash) : ((st && (st.wing || st.tab)) ? mapWing(st.wing || st.tab) : "hall");
    if (activeWing === "gallery") {
      renderGallery();
      galleryRendered = true;
    }
    // Vault / Study / Lab are not on screen at boot: build them in idle time (or the moment their wing is opened)
    ["vault", "study", "lab"].forEach((w) => pendingWings.add(w));
    ensureWingRendered($(".wing.active")?.dataset.wing || activeWing);
    scheduleDeferredWings();
    $("#foot-path").innerHTML = `<span class="ft-brand">Titan Reliquary</span><span class="ft-sep" aria-hidden="true"> · </span>${esc(updatedLabel())} · ${esc(snapshotLabel())}`;
    const refresh = $("#btn-refresh");
    if (refresh) { refresh.textContent = "↻ Refresh"; refresh.title = "Check for a newer published snapshot and reload"; }
    lazyThumbs();
    observeReveals();
  }


  /** Cinematic hero: wordmark, count-up grand, stat row, action cluster. */
  /* Muse MUS-1-01 / Grok GRK-1-10: the headline used to be the frozen Sept 30 board total. It is now the latest day of the value history
     (the same items, metal priced at that day's prices: the "Portfolio value" line), so the big number moves with silver and gold and
     matches the chart. Falls back to the board total when no price history was published. */
  function liveValue() {
    const pd = vault.value && vault.value.portfolio_daily, cols = (pd && pd.cols) || [], rows = (pd && pd.rows) || [];
    const last = rows.length ? Object.fromEntries(cols.map((c, i) => [c, rows[rows.length - 1][i]])) : null;
    if (!last || !(Number(last.total) > 0)) return null;
    return { total: Number(last.total), agMelt: Number(last.ag_melt) || 0, auMelt: Number(last.au_melt) || 0, agOz: Number(last.ag_oz) || 0, auOz: Number(last.au_oz) || 0,
             date: last.d, provisional: last.k === "p" };
  }

  function renderHero() {
    const b = vault.board || {};
    const m = vault.metals || {};
    const p = vault.precious || {};
    const spot = m.spot || {};
    const LV = liveValue();
    const ag = LV && LV.agOz ? LV.agMelt / LV.agOz : (spot.ag_usd_oz ?? b.spot_ag ?? b.silver?.spot);
    const au = LV && LV.auOz ? LV.auMelt / LV.auOz : (spot.au_usd_oz ?? b.spot_au ?? b.gold?.spot);
    const phN = vault.photos || {};
    const flipsTotal = vault.counts?.flips || 0;
    const photoPct = flipsTotal ? Math.round(100 * (phN.coins_with_photos ?? 0) / flipsTotal) : 0;

    const chip = $("#ledger-chip");
    if (chip) { chip.textContent = updatedLabel(); chip.title = "Collection record " + (vault.ledger_version || ""); }

    const stats = [
      ["pieces", intFmt(vault.counts?.vault)],
      ["flips", intFmt(flipsTotal)],
      ["countries", intFmt(vault.counts?.countries)],
      ["photographed", photoPct + "%"],
    ];
    $("#hdr-stats").innerHTML = stats
      .map(([label, val], i) =>
        `${i ? '<span class="dot-sep" aria-hidden="true">·</span>' : ""}<span class="hero-stat"><strong>${esc(val)}</strong> ${esc(label)}</span>`)
      .join("");

    const grand = $("#hero-grand");
    const headline = LV ? LV.total : b.grand;
    grand.setAttribute("aria-label", "Estimated collection value " + money(headline));
    countUp(grand, headline, money);

    // Live melt breakdown calculation
    const agOz = LV ? LV.agOz : (p.combined_silver?.oz ?? 63.27);
    const agMelt = LV ? LV.agMelt : (p.combined_silver?.melt ?? (ag != null ? agOz * ag : 0));
    const auOz = LV ? LV.auOz : (p.combined_gold?.oz ?? 0.1322);
    const auMelt = LV ? LV.auMelt : (p.combined_gold?.melt ?? (au != null ? auOz * au : 0));
    const grandVal = Number(headline || 0);
    const pureMelt = agMelt + auMelt;
    const numisPremium = Math.max(0, grandVal - pureMelt);
    const agPct = grandVal > 0 ? Math.round((agMelt / grandVal) * 1000) / 10 : 0;
    const auPct = grandVal > 0 ? Math.round((auMelt / grandVal) * 1000) / 10 : 0;
    const numisPct = Math.max(0, Math.round((100 - agPct - auPct) * 10) / 10);

    const segAg = $("#seg-ag");
    const segAu = $("#seg-au");
    const segNumis = $("#seg-numis");
    if (segAg) { segAg.style.width = agPct + "%"; segAg.title = `Silver Melt: ${num(agOz, 2)} oz Ag · ${money(agMelt)} (${agPct}%)`; }
    if (segAu) { segAu.style.width = auPct + "%"; segAu.title = `Gold Melt: ${num(auOz, 4)} oz Au · ${money(auMelt)} (${auPct}%)`; }
    if (segNumis) { segNumis.style.width = numisPct + "%"; segNumis.title = `Value above metal melt (albums, sets, housing, collector premium): ${money(numisPremium)} (${numisPct}%)`; }
    const lblAg = $("#lbl-ag"); if (lblAg) lblAg.textContent = `Ag Melt · ${money(agMelt)}`;
    const lblAu = $("#lbl-au"); if (lblAu) lblAu.textContent = `Au · ${money(auMelt)}`;
    const lblNumis = $("#lbl-numis"); if (lblNumis) lblNumis.textContent = `Above melt · ${money(numisPremium)}`;

    const legend = $("#melt-legend");
    if (legend) {
      legend.innerHTML = `
        <span class="legend-item leg-ag"><i class="dot"></i> <strong>Silver ${money(agMelt)}</strong> <span class="lg-sub">${num(agOz, 2)} oz @ ${money(ag)}</span></span>
        <span class="legend-item leg-au"><i class="dot"></i> <strong>Gold ${money(auMelt)}</strong> <span class="lg-sub">${num(auOz, 4)} oz @ ${money(au)}</span></span>
        <span class="legend-item leg-numis"><i class="dot"></i> <strong>Value above melt ${money(numisPremium)}</strong> <span class="lg-sub">${numisPct}% · albums, sets, housing, coins</span></span>`;
    }

    const cap = $(".hero-cap");
    if (cap) {
      // #12: say which part is firm (metal at spot) and which part is an estimate (premiums over melt, albums, sets, housing)
      const est = Math.max(0, grandVal - pureMelt);
      const k = (n) => "$" + (n >= 1000 ? (n / 1000).toFixed(n >= 1e4 ? 0 : 1) + "k" : Math.round(n));
      const when = LV && LV.date ? new Date(LV.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      cap.textContent = `about ${k(grandVal)}: melt ${money(pureMelt)} (firm, metal${when ? " at " + when + " prices" : " at spot"}) plus about ${k(est)} collector premium (estimate)`;
      cap.title = `Melt value moves with silver and gold prices and is reliable. The rest (${money(est)}) is the ledger's estimate of what coins, albums, sets and housing are worth above their metal, and could be off either way.`;
    }

    setupSpotSimulator();
  }

  let simAgSpot = null;
  let simAuSpot = null;

  /** Market Sensitivity Simulator: test portfolio valuation against spot fluctuations. */
  function setupSpotSimulator() {
    const btnToggle = $("#btn-spot-sim");
    const drawer = $("#spot-sim-drawer");
    const agRange = $("#sim-ag-range");
    const auRange = $("#sim-au-range");
    const agVal = $("#sim-ag-val");
    const auVal = $("#sim-au-val");
    const dynGrand = $("#sim-dyn-grand");
    const dynDelta = $("#sim-dyn-delta");
    const badge = $("#sim-status-badge");
    const chipAg = $("#sim-chip-ag");
    const chipAu = $("#sim-chip-au");
    const chipPrem = $("#sim-chip-prem");
    const btnReset = $("#sim-btn-reset");

    if (!btnToggle || !agRange || !auRange || !vault) return;

    const baseSpotAg = Number(vault.metals?.spot?.ag_usd_oz ?? vault.precious?.spot_ag ?? 0);
    const baseSpotAu = Number(vault.metals?.spot?.au_usd_oz ?? vault.precious?.spot_au ?? 0);
    const agOz = Number(vault.precious?.combined_silver?.oz ?? 63.27);
    const auOz = Number(vault.precious?.combined_gold?.oz ?? 0.1322);
    const baseGrand = Number(vault.board?.grand ?? 0);
    const spotDate = vault.metals?.as_of || "";
    const spotLabel = spotDate ? `Spot as of ${spotDate}` : "Spot (dated snapshot)";
    badge.textContent = spotLabel;
    const lm = $$(".sim-range-marks .live-mark");
    if (lm[0]) lm[0].textContent = `${money(baseSpotAg)} (spot${spotDate ? " " + spotDate : ""})`;
    if (lm[1]) lm[1].textContent = `${money(baseSpotAu)} (spot${spotDate ? " " + spotDate : ""})`;
    
    // Baseline non-metal value (albums, housing, collector premium, stamps, etc.)
    const baseAgMelt = agOz * baseSpotAg;
    const baseAuMelt = auOz * baseSpotAu;
    const fixedBaseValue = Math.max(0, baseGrand - baseAgMelt - baseAuMelt);

    if (simAgSpot === null) simAgSpot = baseSpotAg;
    if (simAuSpot === null) simAuSpot = baseSpotAu;

    agRange.value = simAgSpot;
    auRange.value = simAuSpot;

    const updateSim = () => {
      const curAg = parseFloat(agRange.value);
      const curAu = parseFloat(auRange.value);
      simAgSpot = curAg;
      simAuSpot = curAu;

      agVal.textContent = `$${curAg.toFixed(2)} / oz`;
      auVal.textContent = `$${curAu.toFixed(2)} / oz`;

      const dynAgMelt = agOz * curAg;
      const dynAuMelt = auOz * curAu;
      const dynTotal = fixedBaseValue + dynAgMelt + dynAuMelt;
      const delta = dynTotal - baseGrand;
      const deltaPct = baseGrand > 0 ? (delta / baseGrand) * 100 : 0;

      dynGrand.textContent = money(dynTotal);
      chipAg.textContent = `Ag Melt: ${money(dynAgMelt)}`;
      chipAu.textContent = `Au Melt: ${money(dynAuMelt)}`;
      chipPrem.textContent = `Above melt: ${money(fixedBaseValue)}`;

      if (Math.abs(delta) < 0.5) {
        dynDelta.textContent = `±$0.00 (0.0%)`;
        dynDelta.className = "sim-stat-delta";
        badge.textContent = spotLabel;
        badge.className = "sim-toggle-badge";
      } else {
        const sign = delta >= 0 ? "+" : "";
        dynDelta.textContent = `${sign}${money(delta)} (${sign}${deltaPct.toFixed(1)}%)`;
        dynDelta.className = "sim-stat-delta " + (delta >= 0 ? "gain" : "loss");
        badge.textContent = `${sign}${money(delta)} (${sign}${deltaPct.toFixed(1)}%)`;
        badge.className = "sim-toggle-badge " + (delta >= 0 ? "gain" : "loss");
      }

      // Also dynamically update the main melt bar in the Hero!
      const segAg = $("#seg-ag");
      const segAu = $("#seg-au");
      const segNumis = $("#seg-numis");
      const agPct = dynTotal > 0 ? Math.round((dynAgMelt / dynTotal) * 1000) / 10 : 0;
      const auPct = dynTotal > 0 ? Math.round((dynAuMelt / dynTotal) * 1000) / 10 : 0;
      const numisPct = Math.max(0, Math.round((100 - agPct - auPct) * 10) / 10);
      if (segAg) { segAg.style.width = agPct + "%"; }
      if (segAu) { segAu.style.width = auPct + "%"; }
      if (segNumis) { segNumis.style.width = numisPct + "%"; }
      const lblAg = $("#lbl-ag"); if (lblAg) lblAg.textContent = `Ag Melt · ${money(dynAgMelt)}`;
      const lblAu = $("#lbl-au"); if (lblAu) lblAu.textContent = `Au · ${money(dynAuMelt)}`;
      const lblNumis = $("#lbl-numis"); if (lblNumis) lblNumis.textContent = `Premium · ${money(fixedBaseValue)}`;
    };

    agRange.oninput = updateSim;
    auRange.oninput = updateSim;

    btnToggle.onclick = () => {
      const open = !drawer.hidden;
      drawer.hidden = open;
      btnToggle.setAttribute("aria-expanded", String(!open));
      btnToggle.classList.toggle("open", !open);
    };

    btnReset.onclick = () => {
      agRange.value = baseSpotAg;
      auRange.value = baseSpotAu;
      updateSim();
    };
  }

  function latestFlips(n = 10) {
    return [...(vault.flips || [])]
      .sort((a, b) => scanNum(b.scan) - scanNum(a.scan))
      .slice(0, n);
  }

  function splitFlags(flags) {
    const out = [];
    const seen = new Set();
    const norm = (s) => s.toLowerCase().replace(/^cull watch:\s*/i, "").replace(/\s+/g, " ").trim();
    // Split on "·" separators, but never inside parentheses: "(investigate · 3 years locked)"
    // is one flag, not two.
    function splitTop(str) {
      const parts = [];
      let depth = 0, cur = "";
      for (const ch of str) {
        if (ch === "(") depth++;
        else if (ch === ")") depth = Math.max(0, depth - 1);
        if (ch === "·" && depth === 0) { parts.push(cur); cur = ""; }
        else cur += ch;
      }
      parts.push(cur);
      return parts.map((s) => s.trim()).filter(Boolean);
    }
    for (const raw of flags || []) {
      const parts = splitTop(String(raw));
      const chunks = parts.length >= 2 && String(raw).length > 80 ? parts : [String(raw).trim()];
      for (const c of chunks) {
        if (!c) continue;
        const key = norm(c);
        if (!key || seen.has(key)) continue;
        // Skip if an existing flag already covers this text (or vice versa)
        let covered = false;
        for (const s of seen) {
          if (s.includes(key) || key.includes(s)) { covered = true; break; }
        }
        if (covered) continue;
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  }


  /* Collection intelligence + shooting sessions live in js/app-insights.js (fix list #32, step 2); they read the flip list only. */
  const flipsLive = () => vault.flips || [];
  const flipInsights = () => window.TitanInsights.flipInsights(flipsLive());
  const insightsSec = () => window.TitanInsights.insightsSec(flipsLive());
  const shootingData = () => window.TitanInsights.shootingData(flipsLive());
  const shootingSec = () => window.TitanInsights.shootingSec(flipsLive());

  let exhibitTimer = null; // "Now exhibiting" rotation interval
  let exhibitMasters = [];
  let exhibitIdx = 0;

  /* =========================================================================
     ARCHIVAL NUMISMATIC ENGINE (10/10 Tactile 2x2 Flips & Specimen Blueprints)
     No fake 3D cartoon coins. Real museum artifacts & precision blueprints.
     ========================================================================= */

  /** Sovereign heraldic insignias rendered as crisp hairline vector paths. */
  function getCountryCrest(iso) {
    const code = String(iso || "").toUpperCase();
    switch (code) {
      case "CH": // Switzerland: Federal Swiss Cross inside laurel wreath
        return `<path d="M-8 0 H8 M0 -8 V8" stroke="currentColor" stroke-width="3.5" stroke-linecap="square" fill="none"/>
                <circle cx="0" cy="0" r="13" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 1.5"/>`;
      case "MX": // Mexico: Sovereign Golden Eagle silhouette
        return `<path d="M0 -11 C-4 -6 -7 -2 -6 4 C-4 3 0 2 0 6 C0 2 4 3 6 4 C7 -2 4 -6 0 -11 Z" fill="currentColor"/>
                <path d="M-10 6 Q0 12 10 6" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
      case "GB": // United Kingdom: Royal Imperial St. Edward's Crown
      case "NO": // Norway: St. Olav's Crown
      case "SE": // Sweden: Three Crowns
      case "ES": // Spain: Royal Crown
        return `<path d="M-10 5 L-12 -3 L-5 0 L0 -7 L5 0 L12 -3 L10 5 Z" fill="currentColor"/>
                <rect x="-10" y="6" width="20" height="2.5" rx="0.8" fill="currentColor"/>
                <circle cx="0" cy="-8.5" r="1.3" fill="currentColor"/>`;
      case "US": // USA: Heraldic Shield with Stars
        return `<path d="M-8 -6 H8 V-1 C8 6 0 10 0 10 C0 10 -8 6 -8 -1 Z" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <line x1="-8" y1="-2" x2="8" y2="-2" stroke="currentColor" stroke-width="1"/>
                <line x1="-3" y1="-2" x2="-3" y2="8" stroke="currentColor" stroke-width="0.8"/>
                <line x1="3" y1="-2" x2="3" y2="8" stroke="currentColor" stroke-width="0.8"/>`;
      case "FR": // France
      case "IT": // Italy
      case "GR": // Greece
        return `<path d="M-9 6 C-12 -2 -4 -9 0 -10 C4 -9 12 -2 9 6" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <circle cx="0" cy="-1" r="3" fill="currentColor"/>`;
      case "DE": // Germany
        return `<path d="M0 -9 L-7 -3 L-5 6 L0 3 L5 6 L7 -3 Z" fill="currentColor"/>`;
      case "JP": // Japan
      case "KR": // South Korea
        return `<circle cx="0" cy="0" r="4" fill="currentColor"/>
                <circle cx="0" cy="0" r="9" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1.5"/>`;
      default: // Classical Sovereign Numismatic Medallion
        return `<circle cx="0" cy="0" r="2.5" fill="currentColor"/>
                <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1.5"/>
                <path d="M-10 0 H-5 M5 0 H10 M0 -10 V-5 M0 5 V10" stroke="currentColor" stroke-width="0.8"/>`;
    }
  }

  /** Native Web Audio numismatic synthesis for tactile interactions. */
  let fxAudioCtx = null;
  function playCoinChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!fxAudioCtx) fxAudioCtx = new AC();
      if (fxAudioCtx.state === "suspended") fxAudioCtx.resume();
      const now = fxAudioCtx.currentTime;
      const osc1 = fxAudioCtx.createOscillator();
      const osc2 = fxAudioCtx.createOscillator();
      const gain = fxAudioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(3850, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(7700, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(fxAudioCtx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.25);
      osc2.stop(now + 1.25);
    } catch (_) {}
  }
  function playStapleClick() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!fxAudioCtx) fxAudioCtx = new AC();
      if (fxAudioCtx.state === "suspended") fxAudioCtx.resume();
      const now = fxAudioCtx.currentTime;
      const osc = fxAudioCtx.createOscillator();
      const gain = fxAudioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(fxAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  /** Render an authentic struck specimen minted medallion placeholder waiting for Phase 2 raw photography. */
  function renderSpecimenBlueprint(f, large = false, side = "obv") {
    const isRev = side === "rev";
    const iso = esc(f.iso || (f.country || "??").slice(0, 2).toUpperCase());
    const year = esc(f.year || "—");
    const denom = esc(f.denom || f.label || "SPECIMEN");
    const countryName = (f.country || "ARCHIVAL SPECIMEN").toUpperCase();
    const isSilver = !!f.is_silver || !!f.asw_oz;
    const isGold = !!f.is_gold || /gold/i.test(f.metal || "");
    const isBronze = /bronze|copper|brass/i.test(f.metal || "");

    // Physical millimeter scaling (50.8mm window = 44 radius in 100x100 viewBox)
    let diam = null;
    const dm = String(f.metal_cond || f.metal || "").match(/([\d.]+)\s*mm/i);
    if (dm) diam = parseFloat(dm[1]);
    if (!diam || isNaN(diam)) diam = isSilver ? 26.5 : 22.0;

    const scaledR = Math.min(42, Math.max(22, (diam / 50.8) * 44));
    const textR = scaledR - 3.6;
    const dentilR = scaledR - 1.9;
    const uid = `${esc(f.scan || 'sp')}-${side}-${large ? 'lg' : 'sm'}`;

    const metalBadge = isSilver
      ? (f.asw_oz ? `${num(f.asw_oz, 2)}oz Ag` : ".999 AG")
      : (isGold ? "FINE GOLD" : (isBronze ? "COPPER" : (f.km ? `KM#${esc(f.km)}` : "ALLOY")));

    const gradId = isGold ? "grad-planchet-gold" : (isBronze ? "grad-planchet-bronze" : (isSilver ? "grad-planchet-silver" : "grad-planchet-alloy"));
    let rimStroke = "";
    let reliefFill = "";
    let reliefStroke = "";
    let dentilColor = "";

    if (isGold) {
      rimStroke = "#fef08a";
      reliefFill = "#fef08a";
      reliefStroke = "rgba(254, 240, 138, 0.85)";
      dentilColor = "#fef08a";
    } else if (isBronze) {
      rimStroke = "#fed7aa";
      reliefFill = "#fed7aa";
      reliefStroke = "rgba(254, 215, 170, 0.85)";
      dentilColor = "#fed7aa";
    } else if (isSilver) {
      rimStroke = "#f8fafc";
      reliefFill = "#ffffff";
      reliefStroke = "rgba(255, 255, 255, 0.85)";
      dentilColor = "#ffffff";
    } else {
      rimStroke = "#f1f5f9";
      reliefFill = "#f1f5f9";
      reliefStroke = "rgba(241, 245, 249, 0.85)";
      dentilColor = "#f1f5f9";
    }

    const shortDenom = denom.length > 8 ? denom.slice(0, 7) + "…" : denom;
    const centerGraphic = isRev
      ? `<g transform="translate(50, 46)" text-anchor="middle" fill="${reliefFill}">
           <circle cx="0" cy="0" r="14" fill="none" stroke="${dentilColor}" stroke-width="0.7" stroke-dasharray="2 1.5" opacity="0.6"/>
           <text x="0" y="4.5" font-family="var(--serif)" font-size="${shortDenom.length > 5 ? 8.5 : 11}" font-weight="800" fill="currentColor">${shortDenom.toUpperCase()}</text>
         </g>`
      : `<g class="coin-crest-emboss" transform="translate(50, 45) scale(${large ? 0.82 : 0.72})" text-anchor="middle" fill="${reliefFill}" stroke="${reliefStroke}">
           ${getCountryCrest(f.iso || (f.country || "").slice(0, 2))}
         </g>`;

    const arcD = `M ${(50 - textR).toFixed(1)} 50 A ${textR.toFixed(1)} ${textR.toFixed(1)} 0 0 1 ${(50 + textR).toFixed(1)} 50`;
    const bottomLabel = isRev ? (f.km ? `KM#${esc(f.km)} · 180°` : 'REVERSE DIE · 180°') : `${year} · ${metalBadge}`;
    const badgeY = (50 + scaledR * 0.44).toFixed(1);

    return `
      <svg class="specimen-medallion" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="${countryName} ${denom} specimen">
        <defs>
          <path id="arc-top-${uid}" d="${arcD}" fill="none"/>
          <filter id="pl-shadow-${uid}" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Velvet Aperture Window Chamber -->
        <rect width="100" height="100" fill="url(#grad-aperture-velvet)"/>
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(200,169,74,0.15)" stroke-width="0.75"/>
        <circle cx="50" cy="50" r="47.2" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/>

        <!-- Struck Metallic Planchet Disk with Physical Depth -->
        <circle cx="50" cy="50" r="${scaledR.toFixed(1)}" fill="url(#${gradId})" stroke="#050608" stroke-width="0.8" filter="url(#pl-shadow-${uid})"/>
        
        <!-- Cartwheel Specular Luster Overlay -->
        <circle cx="50" cy="50" r="${scaledR.toFixed(1)}" fill="url(#grad-coin-luster)" pointer-events="none"/>

        <!-- Raised Outer Reeded Die Rim -->
        <circle cx="50" cy="50" r="${(scaledR - 0.5).toFixed(1)}" fill="none" stroke="${rimStroke}" stroke-width="1.0" opacity="0.9"/>
        
        <!-- Circular Beaded Dentil Ring -->
        <circle cx="50" cy="50" r="${dentilR.toFixed(1)}" fill="none" stroke="${dentilColor}" stroke-width="0.8" stroke-dasharray="1.1 1.6" opacity="0.75"/>

        <!-- Sovereign Issuer Upper Arc Inscription -->
        <text class="coin-legend-top" fill="${reliefFill}">
          <textPath href="#arc-top-${uid}" startOffset="50%" text-anchor="middle">${esc(countryName.slice(0, 18))}</textPath>
        </text>

        <!-- Sovereign Die Heraldry / Center Face -->
        ${centerGraphic}

        <!-- Lower Mint Year / Purity Inscription -->
        <text x="50" y="${(50 + scaledR - 3.2).toFixed(1)}" text-anchor="middle" class="coin-legend-bot" fill="${reliefFill}">
          ${bottomLabel}
        </text>
      </svg>`;
  }
  window.renderSpecimenBlueprint = renderSpecimenBlueprint;

  /** Render a luxury 2x2 Aero Frosted Acrylic Mount with beveled chamfers, gold rivets, and frosted silicone gasket. */
  function renderFlipHolder(f, options = {}) {
    const isLarge = !!options.large;
    const isRev = options.side === "rev";
    const country = esc((f.country || "ARCHIVE").toUpperCase());
    const year = esc(f.year || "—");
    const denom = esc((f.denom || f.label || "SPECIMEN").toUpperCase());
    const purity = f.is_silver
      ? (f.asw_oz ? `${num(f.asw_oz, 2)}oz Ag` : ".999 Ag")
      : (f.is_gold ? ".999 Au" : (f.km ? `KM#${esc(f.km)}` : "ALLOY"));

    const revPhoto = typeof photoOf === "function" ? photoOf(f, "rev") : null;
    const obvPhoto = typeof photoOf === "function" ? photoOf(f, "obv") : null;
    const thumbRev = f.thumb_side === "rev" ? f.thumb : null, thumbObv = f.thumb_side === "rev" ? null : f.thumb;
    const imgUrl = isRev ? (revPhoto?.url || thumbRev || null) : (thumbObv || obvPhoto?.url || null);

    const visual = imgUrl
      ? `<img class="pc-photo" data-src="${esc(imgUrl)}" loading="lazy" decoding="async" alt="${esc((f.denom || 'Coin') + (isRev ? ' Reverse' : ' Obverse'))}" />`
      : renderSpecimenBlueprint(f, isLarge, options.side || "obv");

    return `
      <div class="archival-flip-holder${isLarge ? ' flip-large' : ''}${isRev ? ' flip-rev' : ' flip-obv'}">
        <!-- Crystalline Beveled Edge Chamfer -->
        <div class="slab-beveled-edge"></div>

        <!-- Four Precision Corner Gold Rivets -->
        <div class="slab-rivet tl"></div>
        <div class="slab-rivet tr"></div>
        <div class="slab-rivet bl"></div>
        <div class="slab-rivet br"></div>

        <!-- Upper Archival Frosted Annotation Bar -->
        <div class="flip-aero-header">
          <span class="flip-aero-country" title="${country}">${country}</span>
          <span class="flip-aero-year">${isRev ? "REV" : year}</span>
          <span class="flip-aero-ser">${esc(f.ser || f.scan)}</span>
        </div>

        <!-- Frosted Translucent Silicone Core Gasket with Recessed Coin Aperture -->
        <div class="flip-gasket-core">
          <!-- 4 Silicone Edge-View Retaining Tabs -->
          <div class="slab-edge-tab tab-n"></div>
          <div class="slab-edge-tab tab-s"></div>
          <div class="slab-edge-tab tab-w"></div>
          <div class="slab-edge-tab tab-e"></div>

          <div class="flip-coin-aperture">
            ${visual}
            <div class="coin-cartwheel-luster" aria-hidden="true"></div>
            ${isLarge ? renderOpticalReticle(f, options.side || "obv") : ""}
          </div>
        </div>

        <!-- Lower Archival Specification & Purity Bar -->
        <div class="flip-aero-footer">
          <span class="flip-aero-denom" title="${denom}">${denom}</span>
          <span class="flip-aero-purity">${purity}</span>
        </div>

        <!-- Prismatic Optic Glare Sheen -->
        <div class="slab-optic-glare"></div>

      </div>`;
  }

  function getSpecimenDiameter(f) {
    if (f.diameter_mm && !isNaN(f.diameter_mm)) return parseFloat(f.diameter_mm);
    if (f.dia_mm && !isNaN(f.dia_mm)) return parseFloat(f.dia_mm);
    const m = String(f.metal_cond || f.metal || f.specs || "").match(/([\d.]+)\s*mm/i);
    if (m && !isNaN(parseFloat(m[1]))) return parseFloat(m[1]);
    const dStr = String(f.denom || f.label || "").toLowerCase();
    if (/5\s*centavos/i.test(dStr)) return 25.0;
    if (/1\s*gulden/i.test(dStr)) return 25.0;
    if (/25\s*cents|quarter/i.test(dStr)) return 24.3;
    if (/5\s*franc/i.test(dStr)) return 31.45;
    if (/1\s*franc/i.test(dStr)) return 23.2;
    if (/dollar|1\s*oz|morgan|peace/i.test(dStr)) return 38.1;
    if (/half|50\s*cent/i.test(dStr)) return 30.6;
    if (/dime|10\s*cent/i.test(dStr)) return 17.9;
    if (/cent|penny/i.test(dStr)) return 19.05;
    return f.is_silver ? 26.5 : 22.0;
  }

  /** Where a diameter comes from: "measured" | "ledger" | "estimate" (drawing scale only, never a measurement). */
  function getSpecimenDiameterSource(f) {
    if (f.measured_mm && !isNaN(f.measured_mm)) return "measured";
    if ((f.diameter_mm && !isNaN(f.diameter_mm)) || (f.dia_mm && !isNaN(f.dia_mm))) return "ledger";
    if (/([\d.]+)\s*mm/i.test(String(f.metal_cond || f.metal || f.specs || ""))) return "ledger";
    return "estimate";
  }

  /** Die alignment only when the record states it; otherwise null ("not recorded"). */
  function getDieAlignment(f) {
    const v = String(f.die_alignment || "").toLowerCase();
    if (!v) return null;
    if (v.includes("medal")) return { type: "Medal Alignment", angle: 0, symbol: "↑↑ 0°" };
    if (v.includes("coin")) return { type: "Coin Alignment", angle: 180, symbol: "↑↓ 180°" };
    return null;
  }

  /** Thickness only when recorded (never derived from diameter). */
  function getSpecimenThickness(f) {
    if (f.thickness_mm && !isNaN(f.thickness_mm)) return Number(f.thickness_mm);
    return null;
  }

  function diameterSourceLabel(src) {
    if (src === "measured") return "measured from photo";
    if (src === "ledger") return "spec (ledger)";
    return "approx. (typical for this coin type, not measured)";
  }

  function renderOpticalReticle(f, side = "obv") {
    const dia = getSpecimenDiameter(f);
    const isRev = side === "rev";
    const dieAlign = getDieAlignment(f);
    const angleText = isRev ? (dieAlign ? dieAlign.symbol : "REV") : "0° (OBV)";
    const planchetPct = Math.min(94, Math.max(30, Math.round((dia / 50.8) * 100)));
    return `
      <div class="ex-optical-reticle${caliperActive ? ' active' : ''}" id="reticle-${side}-${esc(f.scan)}">
        <div class="ret-cross-x"></div>
        <div class="ret-cross-y"></div>
        <div class="ret-ring ret-ring-10" title="10 mm reference ring"></div>
        <div class="ret-ring ret-ring-20" title="20 mm reference ring"></div>
        <div class="ret-ring ret-ring-30" title="30 mm reference ring"></div>
        <div class="ret-ring-planchet" style="width: ${planchetPct}%; height: ${planchetPct}%;" title="Planchet outer rim: ${dia} mm, ${diameterSourceLabel(getSpecimenDiameterSource(f))}"></div>
        <span class="ret-axis-lbl ret-axis-n">${angleText}</span>
        <span class="ret-axis-lbl ret-axis-e">90°</span>
        <span class="ret-axis-lbl ret-axis-s">${isRev ? "REV" : "180°"}</span>
        <span class="ret-axis-lbl ret-axis-w">270°</span>
        <div class="ret-center-pip"></div>
      </div>`;
  }

  function renderCaliperHud(f) {
    const dia = getSpecimenDiameter(f);
    const src = getSpecimenDiameterSource(f);
    const srcLbl = diameterSourceLabel(src);
    const thk = getSpecimenThickness(f);
    const dieAlign = getDieAlignment(f);
    const fillPct = Math.min(94, Math.max(30, Math.round((dia / 50.8) * 100)));
    const approx = src === "estimate";
    return `
      <div class="ex-caliper-hud${caliperActive ? ' active' : ''}" id="caliper-hud-${esc(f.scan)}">
        <div class="caliper-hud-header">
          <div class="caliper-hud-title">
            <span class="caliper-hud-dot"></span>
            Caliper view · ${esc(src === "measured" ? "measured" : src === "ledger" ? "ledger spec" : "approximate size")}
          </div>
          <span style="opacity:0.8;font-family:var(--mono)">1:1 Aperture (50.8mm)</span>
        </div>
        <div class="caliper-scale-bar">
          <div class="cal-ticks"></div>
          <div class="cal-lcd-readout" title="Diameter: ${esc(srcLbl)}">
            <span class="cal-lcd-sym">⌀</span>
            <span class="cal-lcd-val">${approx ? "≈ " : ""}${approx ? dia.toFixed(0) : dia.toFixed(2)}</span>
            <span class="cal-lcd-unit">mm</span>
          </div>
        </div>
        <div class="caliper-metrics-strip">
          <span class="cm-tag gold" title="Diameter source">⌀ ${approx ? "≈ " : ""}${dia.toFixed(1)} mm · ${esc(srcLbl)}</span>
          ${thk != null ? `<span class="cm-tag" title="Thickness (from record)">↕ ${thk.toFixed(2)} mm · spec (ledger)</span>` : ""}
          <span class="cm-tag" title="Die alignment">${dieAlign ? `${dieAlign.symbol} (${dieAlign.type})` : "Die alignment: not recorded"}</span>
          <span class="cm-tag" title="Ratio of coin to 2x2 mount aperture">${fillPct}% mount fill${approx ? " (approx.)" : ""}</span>
          <button type="button" class="cm-info-btn" data-act="caliper-info" title="What are calipers? Click for explanation">ⓘ About calipers</button>
        </div>
      </div>`;
  }

  function showCaliperExplainer() {
    const existing = $(".caliper-explainer-popover");
    if (existing) existing.remove();
    const pop = document.createElement("div");
    pop.className = "caliper-explainer-popover";
    pop.innerHTML = `
      <div class="caliper-pop-box" role="dialog" aria-modal="true" aria-label="Numismatic Caliper and Reticle Guide">
        <button type="button" class="caliper-pop-close" aria-label="Close guide">✕ Close</button>
        <h3 class="caliper-pop-title">📏 Numismatic Caliper &amp; Die Reticle</h3>
        <div class="caliper-pop-body">
          <p>In high-end coin curation and museum authentication, physical digital vernier calipers and optical reticle loupes are the numismatist's primary forensic tools:</p>
          <ul>
            <li><strong>Planchet Diameter (0.01 mm precision):</strong> Authentic sovereign coins are struck on rigidly calibrated planchets. Counterfeits (cast copies, electrotypes, or fraudulent alloy strikes) almost always deviate in diameter by 0.5 mm to 2.0 mm.</li>
            <li><strong>Die Rotation Alignment (0° vs 180°):</strong> US coinage uses <em>Coin Alignment (↑↓ 180°)</em>, where flipping top-to-bottom reveals the reverse right-side-up. European and medallic issues use <em>Medal Alignment (↑↑ 0°)</em>. Rotated die errors command significant collector premiums.</li>
            <li><strong>1:1 Aperture Ratio:</strong> Accurately measures the coin's physical diameter relative to the standard 2×2 inch (50.8 mm) archival cardboard mount window.</li>
          </ul>
        </div>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelector(".caliper-pop-close").onclick = () => pop.remove();
    pop.onclick = (e) => { if (e.target === pop) pop.remove(); };
  }

  /** Museum Lucite Slab: Archival 99.9% optical acrylic slab encapsulation for Masterpieces & Gallery */
  function renderMuseumSlab(f, options = {}) {
    const isRev = options.side === "rev";
    const isMini = !!options.mini;
    const country = esc((f.country || "ARCHIVE").toUpperCase());
    const year = esc(f.year || "—");
    const denom = esc((f.denom || f.label || "SPECIMEN").toUpperCase());
    const purity = f.is_silver
      ? (f.asw_oz ? `${num(f.asw_oz, 2)} oz ASW Silver` : ".999 Fine Silver")
      : (f.is_gold ? ".999 Fine Gold" : (f.km ? `KM# ${esc(f.km)}` : "Base metal"));

    const revPhoto = typeof photoOf === "function" ? photoOf(f, "rev") : null;
    const obvPhoto = typeof photoOf === "function" ? photoOf(f, "obv") : null;
    const thumbRev = f.thumb_side === "rev" ? f.thumb : null, thumbObv = f.thumb_side === "rev" ? null : f.thumb;
    // #26 (same rule as the gallery tiles, tr86): a coin photographed only on its back shows that photo on the slab front,
    // and the flip side then shows the drawn obverse, so a side card in the carousel is never a placeholder drawing.
    const backOnly = !thumbObv && !obvPhoto?.url && !!(thumbRev || revPhoto?.url);
    const imgUrl = isRev ? (backOnly ? null : (revPhoto?.url || thumbRev || null)) : (thumbObv || obvPhoto?.url || (backOnly ? (thumbRev || revPhoto.url) : null));

    const visual = imgUrl
      ? `<img class="pc-photo slab-coin-img" data-src="${esc(imgUrl)}" loading="lazy" decoding="async" alt="${esc((f.denom || 'Coin') + (isRev || backOnly ? ' Reverse' : ' Obverse'))}" />`
      : renderSpecimenBlueprint(f, !isMini, backOnly ? "obv" : (options.side || "obv"));

    return `
      <div class="museum-slab${isMini ? ' slab-mini' : ''}${isRev ? ' slab-rev' : ' slab-obv'}">
        <div class="slab-beveled-edge"></div>
        <div class="slab-rivet tl"></div>
        <div class="slab-rivet tr"></div>
        <div class="slab-rivet bl"></div>
        <div class="slab-rivet br"></div>
        
        <!-- Plain label: country, year, denomination, collection id. Ref no. is provisional until the one-time serial reassignment. -->
        <div class="slab-pedigree-header">
          <div class="slab-pedigree-body">
            <div class="slab-pedigree-title">
              <strong>${country} · ${isRev ? "REVERSE" : year}</strong>
              ${isMini ? "" : `<span class="slab-pedigree-grade">${esc(f.scan)}</span>`}
            </div>
            <div class="slab-pedigree-sub">
              <span>${denom}</span>
              <span class="slab-pedigree-metal">${purity}</span>
            </div>
          </div>
          ${isMini ? "" : `<div class="slab-id-strip">
            <span>Ref ${esc(f.ser || f.scan)} (provisional)</span>
          </div>`}
        </div>

        <!-- Frosted Silicone Core Gasket with Coin Aperture, Cartwheel Luster & Laser Optical Reticle -->
        <div class="slab-gasket-core">
          <div class="slab-coin-aperture">
            ${visual}
            <div class="coin-cartwheel-luster" aria-hidden="true"></div>
            ${isMini ? '' : renderOpticalReticle(f, options.side || "obv")}
          </div>
        </div>

        <!-- Footer: estimated value with confidence -->
        <div class="slab-pedigree-footer">
          <div class="slab-footer-info">
            <span class="slab-footer-price">${f.est != null ? `est. ${money(f.est)}` : "not yet valued"}</span>
            <span class="slab-footer-melt">${f.conf ? `confidence ${esc(f.conf)}` : ""}${f.is_silver && f.asw_oz != null && (vault?.precious?.spot_ag ?? vault?.metals?.spot?.ag_usd_oz) ? `${f.conf ? " · " : ""}melt ${money(Number(f.asw_oz) * Number(vault?.precious?.spot_ag ?? vault?.metals?.spot?.ag_usd_oz))}` : ""}</span>
          </div>
        </div>

        <!-- Prismatic Specular Sheen Layer -->
        <div class="slab-optic-glare"></div>
      </div>`;
  }

  /** Render 3D flippable specimen stage with Obverse and Reverse faces encapsulated in museum slab. */
  function render3DExhibitFlipper(f) {
    const obvFlip = renderMuseumSlab(f, { side: "obv" });
    const revFlip = renderMuseumSlab(f, { side: "rev" });
    return `
      <div class="ex-3d-stage" id="ex-stage-${esc(f.scan)}">
        <div class="ex-specimen-flipper" id="ex-flipper-${esc(f.scan)}" title="Click or press Space to flip coin in 3D">
          <div class="ex-card-side obverse-side">
            ${obvFlip}
            <div class="ex-specular-glare"></div>
          </div>
          <div class="ex-card-side reverse-side">
            ${revFlip}
            <div class="ex-specular-glare"></div>
          </div>
        </div>

        <!-- Forensic 10x Macro Jeweler's Loupe Lens -->
        <div class="forensic-loupe" id="loupe-${esc(f.scan)}" hidden>
          <div class="loupe-optic-zoom"></div>
          <div class="loupe-reticle-hairs">
            <div class="loupe-hair-x"></div>
            <div class="loupe-hair-y"></div>
            <div class="loupe-scale-ticks"></div>
          </div>
          <div class="loupe-bezel-rim">
            <span class="loupe-badge">10× HASTINGS TRIPLET</span>
            <span class="loupe-coords" id="loupe-coords-${esc(f.scan)}">X:0.0 Y:0.0mm</span>
          </div>
        </div>

        ${renderCaliperHud(f)}
      </div>`;
  }

  /** Ledger ticker: every item is read from the published snapshot (no invented prices or moves). */
  function renderMarketTickerTape() {
    const track = $("#ticker-marquee-track");
    if (!track || !vault) return;
    // Every figure below is read from the published ledger snapshot; nothing is simulated.
    const m = vault.metals || {};
    const spotAg = Number(m.spot?.ag_usd_oz ?? vault.board?.spot_ag) || 0;
    const spotAu = Number(m.spot?.au_usd_oz ?? vault.board?.spot_au) || 0;
    const priorAg = Number(m.prior_spot?.ag_usd_oz) || 0;
    const priorAu = Number(m.prior_spot?.au_usd_oz) || 0;
    const ratio = spotAg ? spotAu / spotAg : 0;
    const priorRatio = priorAg ? priorAu / priorAg : 0;
    const pct = (now, was) => (was > 0 && now > 0 ? ((now - was) / was) * 100 : null);
    const chgOf = (p, suffix = "vs prior quote") => p === null
      ? { chg: "no prior quote", up: null }
      : { chg: `${Math.abs(p).toFixed(2)}% ${suffix}`, up: Math.abs(p) < 0.005 ? null : p > 0 };
    const LVt = liveValue();
    const grand = Number(LVt ? LVt.total : (vault.value?.estimated_total ?? vault.board?.grand ?? m.board?.grand)) || 0;
    const c = vault.counts || {};
    const agOz = Number(m.oz?.ag) || 0;
    const auOz = Number(m.oz?.au) || 0;
    const melt = (Number(m.melt?.ag_usd) || 0) + (Number(m.melt?.au_usd) || 0);
    const bullionEst = Number(m.board?.bullion) || 0;
    const top = (vault.flips || [])
      .filter((f) => f.status !== "Removed" && (Number(f.est) || 0) > 0)
      .sort((x, y) => (Number(y.est) || 0) - (Number(x.est) || 0))
      .slice(0, 3);
    const asOf = m.as_of_local || m.as_of || "";
    const items = [
      { sym: "TITAN VAULT TOTAL", price: money(grand), chg: "ledger estimate", up: null, action: "hub", title: "Collection estimate from the ledger · Click to view the valuation hub" },
      { sym: "METAL MELT", price: money(melt), chg: `${num(agOz, 2)} oz Ag · ${num(auOz, 4)} oz Au`, up: null, action: "seg-ag", title: "Melt value of physical silver and gold at the published spot · Click to view the allocation" },
      ...top.map((f) => ({
        sym: `${f.country || ""} ${f.year || ""} ${f.denom || ""}`.trim().toUpperCase(),
        price: money(f.est), chg: `${String(f.conf || "").toUpperCase() || "—"} CONF`, up: null,
        action: "dossier", scan: f.scan, title: `${f.label || f.scan} · Click to inspect the dossier`,
      })),
      { sym: "AG SPOT", price: `$${num(spotAg, 2)}/oz`, ...chgOf(pct(spotAg, priorAg)), action: "terminal", asset: "ag", title: "Silver spot · Click to open the silver desk" },
      { sym: "AU SPOT", price: `$${intFmt(Math.round(spotAu))}/oz`, ...chgOf(pct(spotAu, priorAu)), action: "terminal", asset: "au", title: "Gold spot · Click to open the gold desk" },
      { sym: "AU/AG RATIO", price: ratio.toFixed(2), ...chgOf(pct(ratio, priorRatio)), action: "terminal", asset: "ratio", title: "Gold/silver ratio · Click to open the ratio desk" },
      { sym: "BULLION", price: `${intFmt(c.bullion || 0)} lots`, chg: bullionEst ? money(bullionEst) : "—", up: null, action: "vault-reserves", title: "Bullion lots · Click to open the Vault" },
      { sym: "COLLECTION", price: `${intFmt(c.flips || 0)} flips`, chg: `${intFmt(c.countries || 0)} countries · ${intFmt(c.vault || 0)} pieces`, up: null, action: "vault-reserves", title: "Collection size from the ledger" },
      ...(asOf ? [{ sym: "SPOT AS OF", price: asOf, chg: m.source || "", up: null, action: "terminal", asset: "ag", title: "When and where the spot quote came from" }] : []),
    ];
    // Double array to create seamless continuous marquee loop
    const fullItems = [...items, ...items];
    track.innerHTML = fullItems.map((it) => `
      <div class="ticker-item" data-ticker-action="${it.action}" ${it.scan ? `data-ticker-scan="${it.scan}"` : ''} ${it.asset ? `data-ticker-asset="${it.asset}"` : ''} title="${it.title}">
        <span class="tk-sym">${it.sym}</span>
        <span class="tk-price">${it.price}</span>
        <span class="tk-tag ${it.up === true ? 'tk-up' : (it.up === false ? 'tk-down' : 'tk-neu')}">
          ${it.up === true ? '▲ ' : (it.up === false ? '▼ ' : '')}${it.chg}
        </span>
      </div>`).join("");

    track.onclick = (e) => {
      const item = e.target.closest("[data-ticker-action]");
      if (!item) return;
      const action = item.dataset.tickerAction;

      if (action === "dossier") {
        const scan = item.dataset.tickerScan;
        if (scan) {
          playCoinChime();
          dossierCtx = null;
          openDrawer(scan);
        }
      } else if (action === "terminal") {
        const asset = item.dataset.tickerAsset;
        const termEl = $("#trading-terminal");
        if (termEl) {
          termEl.scrollIntoView({ behavior: "smooth", block: "center" });
          const btn = $(`#trading-terminal .term-asset-btn[data-asset="${asset}"]`);
          if (btn) btn.click();
        }
      } else if (action === "hub") {
        const hubEl = $(".vault-valuation-hub");
        if (hubEl) {
          hubEl.scrollIntoView({ behavior: "smooth", block: "center" });
          hubEl.classList.remove("highlight-pulse");
          void hubEl.offsetWidth;
          hubEl.classList.add("highlight-pulse");
        }
      } else if (action === "seg-ag") {
        const seg = $("#seg-ag") || $(".melt-allocation-bar");
        if (seg) {
          seg.scrollIntoView({ behavior: "smooth", block: "center" });
          seg.classList.remove("highlight-pulse");
          void seg.offsetWidth;
          seg.classList.add("highlight-pulse");
        }
      } else if (action === "sim") {
        const simBtn = $("#btn-spot-sim");
        const drawer = $("#spot-sim-drawer");
        if (simBtn) {
          simBtn.scrollIntoView({ behavior: "smooth", block: "center" });
          if (drawer && drawer.hidden) {
            simBtn.click();
          }
        }
      } else if (action === "vault-reserves") {
        setWing("vault");
        const vPane = $("#pane-vault");
        if (vPane) vPane.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
  }

  /** Precious Metals Terminal. Every number is real and carries its as-of:
      - Portfolio value (the default view) = data/index.json value.portfolio_daily (tools/pipeline/value_history.py: metal oz x that day's spot + each
        item's ledger premium, counted from the day it was added; calibrated to the ledger board total).
      - Silver / Gold / Au:Ag ratio = data/prices.json (collection/prices/spot_daily.jsonl, filled daily by the GitHub Action).
      - Live quote: gold-api.com fetched by the page (4 s timeout); falls back to the latest quote the price script saw, then to the ledger board quote.
      Nothing is simulated or interpolated; candles are built only from the real daily values. */
  const TERM_TF = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365, ALL: Infinity };
  const term = { series: "portfolio", tf: "ALL", mode: "area", prices: null, pricesTried: false, live: null, liveTried: false, hit: null, cx: null, pts: [], candles: [] };
  try {
    const s = JSON.parse(localStorage.getItem("tr_term_v1") || "{}");
    if (["portfolio", "growth", "ag", "au", "ratio"].includes(s.series)) term.series = s.series;
    if (TERM_TF[s.tf]) term.tf = s.tf;
    if (s.mode === "candle") term.mode = "candle";
  } catch (_) {}
  const termSave = () => { try { localStorage.setItem("tr_term_v1", JSON.stringify({ series: term.series, tf: term.tf, mode: term.mode })); } catch (_) {} };

  const termDate = (iso) => {
    const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const termShort = (iso) => {
    const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const termClock = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const termStamp = (d) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const termTodayUTC = () => new Date().toISOString().slice(0, 10);
  const termDayMs = (iso) => Date.parse(String(iso).slice(0, 10) + "T12:00:00Z");

  /** The quote the page is currently using, with its as-of text. Live > latest price-script quote > ledger board quote. */
  function termQuote() {
    const m = vault?.metals || {};
    const board = { ag: Number(m.spot?.ag_usd_oz), au: Number(m.spot?.au_usd_oz), kind: "board", at: m.source_updated_at ? new Date(m.source_updated_at) : null, src: m.source || "ledger" };
    board.asOf = `ledger quote${m.as_of_local ? " as of " + m.as_of_local : (m.as_of ? " as of " + m.as_of : "")}`;
    let q = board;
    const L = term.prices?.latest;
    if (L && Number(L.xag_usd) > 0 && Number(L.xau_usd) > 0 && L.at && (!board.at || new Date(L.at) >= board.at)) {
      q = { ag: Number(L.xag_usd), au: Number(L.xau_usd), kind: "latest", at: new Date(L.at), src: L.source };
      q.asOf = `last quote ${termStamp(q.at)}`;
    }
    // #42: a quote older than 36 h means the daily price job missed a run; say so instead of passing it off as current
    if (q.kind !== "live" && q.at && !isNaN(q.at) && (Date.now() - q.at.getTime()) > 36 * 36e5) {
      const days = Math.floor((Date.now() - q.at.getTime()) / 864e5);
      q.stale = true;
      q.asOf += ` (⚠ ${days} day${days === 1 ? "" : "s"} old)`;
    }
    if (term.live) q = { ag: term.live.ag, au: term.live.au, kind: "live", at: term.live.at, src: "gold-api.com", asOf: `live ${termClock(term.live.at)}` };
    return q;
  }

  /** Ounces and the non-metal part (premiums + the ledger bucket) so a quote can reprice the whole portfolio. */
  function termBasis() {
    const m = vault?.metals || {}, p = term.prices;
    if (p && p.oz && p.oz.ag != null && p.nonmetal_usd != null) return { ag: Number(p.oz.ag), au: Number(p.oz.au) || 0, nonmetal: Number(p.nonmetal_usd), exact: true };
    const ag = Number(m.oz?.ag) || 0, au = Number(m.oz?.au) || 0, grand = Number(vault?.value?.estimated_total) || 0;
    return { ag, au, nonmetal: Math.max(0, grand - (Number(m.melt?.ag_usd) || 0) - (Number(m.melt?.au_usd) || 0)), exact: false };
  }

  async function termFetchLive() {
    if (term.liveTried) return;
    term.liveTried = true;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => { try { ctl && ctl.abort(); } catch (_) {} }, 4000);
    try {
      const get = (sym) => Promise.race([
        fetch("https://api.gold-api.com/price/" + sym, { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
      ]);
      const [a, b] = await Promise.all([get("XAG"), get("XAU")]);
      const ag = Number(a?.price), au = Number(b?.price);
      const ref = termQuote();
      const ok = ag > 5 && ag < 500 && au > 500 && au < 20000 && (!(ref.ag > 0) || Math.abs(ag / ref.ag - 1) < 0.15) && (!(ref.au > 0) || Math.abs(au / ref.au - 1) < 0.15);
      if (ok) term.live = { ag, au, at: new Date() };
    } catch (_) { /* offline / blocked / slow: the latest published quote stays, labelled with its as-of */ }
    finally { clearTimeout(timer); }
  }

  async function termLoadPrices() {
    if (term.pricesTried) return;
    term.pricesTried = true;
    try { term.prices = await fetchJson("data/prices.json"); } catch (_) { term.prices = null; }
  }

  /** The points for the selected series: [{d, v, k, n?, added?, ag?, au?}] from real daily values (+ one live point). */
  function termSeries() {
    const pf = vault?.value?.portfolio_daily;
    const q = termQuote(), today = termTodayUTC(), pts = [];
    const spotRows = term.prices?.spot?.rows || [];
    if (term.series === "growth") {
      // Collection growth: every day valued at ONE fixed quote (value_history "fixed" column), so it only moves when items are added.
      // Each day = what was owned that day (its ounces + its static premiums), all priced at the CURRENT quote (the same one as
      // Portfolio value). Price swings are removed, it only steps up when items are added, and its last point equals Portfolio value.
      const gq = termQuote();
      for (const r of pf?.rows || []) {
        const v = r[9] != null && gq.ag > 0 ? r[9] * gq.ag + r[10] * gq.au + r[4] : r[8];
        if (v != null) pts.push({ d: r[0], v: Math.round(v * 100) / 100, n: r[5], added: r[6], k: r[7] });
      }
      if (pts.length) {        // it starts from $0: the day before the first item was logged
        const d0 = new Date(termDayMs(pts[0].d) - 86400000).toISOString().slice(0, 10);
        pts.unshift({ d: d0, v: 0, n: 0, added: 0, k: "" });
      }
    } else if (term.series === "portfolio") {
      for (const r of pf?.rows || []) pts.push({ d: r[0], v: r[1], ag: r[2], au: r[3], prem: r[4], n: r[5], added: r[6], k: r[7] });
      if (q.kind !== "board" && pts.length) {
        const qd = q.kind === "live" ? today : q.at.toISOString().slice(0, 10), last = pts[pts.length - 1];
        const b = termBasis(), v = Math.round((b.ag * q.ag + b.au * q.au + b.nonmetal) * 100) / 100;
        const live = { d: qd, v, ag: b.ag * q.ag, au: b.au * q.au, prem: b.nonmetal, n: last.n, added: 0, k: q.kind === "live" ? "L" : "q" };
        if (last.d === qd) pts[pts.length - 1] = Object.assign({}, last, live, { added: last.added });
        else if (last.d < qd) pts.push(live);
      }
    } else {
      const col = term.series === "ag" ? 1 : 2;
      for (const r of spotRows) pts.push({ d: r[0], v: term.series === "ratio" ? r[2] / r[1] : r[col], k: r[3] });
      const hasToday = pts.length && pts[pts.length - 1].d === today;
      if (pts.length && q.kind === "live") {
        const v = term.series === "ratio" ? q.au / q.ag : (term.series === "ag" ? q.ag : q.au);
        const p = { d: today, v, k: "L" };
        if (hasToday) pts[pts.length - 1] = p; else pts.push(p);
      }
    }
    return pts;
  }

  /** Timeframe window over the real series; candles = real daily values aggregated into N-day bars (open = previous bar's close). */
  function termWindow(all) {
    if (!all.length) return { pts: [], bucket: 1, short: false };
    const span = TERM_TF[term.tf];
    const lastMs = termDayMs(all[all.length - 1].d);
    const pts = span === Infinity ? all.slice() : all.filter((p) => termDayMs(p.d) >= lastMs - (span - 1) * 86400000);
    const days = pts.length > 1 ? Math.round((termDayMs(pts[pts.length - 1].d) - termDayMs(pts[0].d)) / 86400000) + 1 : 1;
    const bucket = term.tf === "7D" || term.tf === "30D" ? 1 : (term.tf === "ALL" ? (days <= 45 ? 1 : days <= 400 ? 7 : 30) : 7);
    const short = span !== Infinity && days < span && all.length === pts.length;
    return { pts, bucket, short, days };
  }

  function termCandles(pts, bucket) {
    const out = []; if (!pts.length) return out;
    const t0 = termDayMs(pts[0].d); let prevClose = null;
    const groups = new Map();
    for (const p of pts) { const g = Math.floor((termDayMs(p.d) - t0) / 86400000 / bucket); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(p); }
    for (const [, ps] of groups) {
      const vs = ps.map((p) => p.v), close = vs[vs.length - 1], open = prevClose != null ? prevClose : vs[0];
      out.push({ d0: ps[0].d, d1: ps[ps.length - 1].d, open, close, high: Math.max(open, ...vs), low: Math.min(open, ...vs), n: ps.length, added: ps.reduce((s, p) => s + (p.added || 0), 0), pts: ps });
      prevClose = close;
    }
    return out;
  }

  const termFmtVal = (v) => term.series === "ratio" ? num(v, 2) : (term.series === "portfolio" ? "$" + num(v, 2) : "$" + num(v, 2));
  const termFmtAxis = (v) => term.series === "ratio" ? num(v, 1) : (term.series === "ag" ? "$" + num(v, 2) : "$" + num(v, 0));
  const termKindText = (k) => k === "c" ? "carried (no market price that day)" : k === "p" ? "provisional quote" : k === "L" ? "live quote" : k === "q" ? "latest quote" : "";

  /* The chart sits below the fold; draw only when the stage is near the screen (re-draw on request while off-screen). */
  let termInView = !("IntersectionObserver" in window), termDirty = false, termIO = null;
  function renderTerminalChart() {
    const canvas = $("#term-chart-canvas");
    if (!canvas) return;
    const stage = $("#term-chart-stage") || canvas;
    const all = termSeries();
    const win = termWindow(all);
    const real = win.pts.length >= 2;
    stage.classList.toggle("term-stage-empty", !real);
    canvas.style.display = real ? "" : "none";
    const empty = $("#term-empty");
    if (empty) {
      empty.hidden = real;
      if (!real) empty.textContent = (term.series === "portfolio" || term.series === "growth")
        ? "Portfolio history needs at least two priced days. The daily price job fills it in; nothing is estimated in the meantime."
        : (term.prices ? "Spot history needs at least two days; the daily price job fills it in." : "Spot history is not loaded (offline, and not cached yet). The latest quote above is still shown with its as-of.");
    }
    term.pts = win.pts; term.candles = []; term.hit = null;
    if (!real) return;
    if (!termInView) {
      termDirty = true;
      if (!termIO) {
        termIO = new IntersectionObserver((entries) => {
          termInView = entries.some((e) => e.isIntersecting);
          if (termInView && termDirty) { termDirty = false; renderTerminalChart(); }
        }, { rootMargin: "200px 0px" });
      }
      termIO.disconnect();
      termIO.observe(stage);
      return;
    }
    const g = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width || 900);
    const h = Math.round(rect.height || 280);
    const targetW = Math.round(w * dpr), targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const cs = getComputedStyle(canvas);
    const tok = (n, d) => (cs.getPropertyValue(n) || "").trim() || d;
    const tokMuted = tok("--muted", "#b8bcc6"), tokLine = tok("--line", "rgba(255,255,255,0.12)");
    const tokGold = tok("--gold", "#c8a94a"), tokInk = tok("--ink", "#ffffff");
    const UP = "#4ade80", DOWN = "#f87171";

    const pts = win.pts, candle = term.mode === "candle";
    const cds = candle ? termCandles(pts, win.bucket) : [];
    term.candles = cds;
    const t = pts.map((p) => termDayMs(p.d));
    const t0 = t[0], t1 = t[t.length - 1];
    const vals = candle ? cds.flatMap((c) => [c.high, c.low]) : pts.map((p) => p.v);
    const lo = Math.min(...vals), hi = Math.max(...vals), sp = (hi - lo) || hi * 0.02 || 1;
    const min = Math.max(0, lo - sp * 0.15), max = hi + sp * 0.18;
    const padX = 14, padTop = 24, padBottom = 30, padR = 6;
    const plotW = w - padX - padR, plotH = h - padTop - padBottom;
    const inset = candle ? 16 : 0;
    const X = (ms) => padX + inset + (t1 === t0 ? 0.5 * (plotW - 2 * inset) : (ms - t0) / (t1 - t0) * (plotW - 2 * inset));
    const Y = (val) => padTop + plotH - ((val - min) / (max - min)) * plotH;

    g.lineWidth = 1; g.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    g.textAlign = "left"; g.textBaseline = "middle";
    for (let r = 0; r <= 4; r++) {
      const y = padTop + (r / 4) * plotH;
      g.strokeStyle = tokLine; g.beginPath(); g.moveTo(padX, y); g.lineTo(padX + plotW, y); g.stroke();
      g.fillStyle = tokMuted; g.textAlign = "right"; g.fillText(termFmtAxis(max - (r / 4) * (max - min)), padX + plotW - 2, y - 7); g.textAlign = "left";
    }
    g.textBaseline = "alphabetic";
    // date ticks: first, last, and evenly spaced real dates between when there is room
    const ticks = Math.max(2, Math.min(5, Math.floor(plotW / 110)));
    for (let k = 0; k < ticks; k++) {
      const i = Math.round((k / (ticks - 1)) * (pts.length - 1));
      g.textAlign = k === 0 ? "left" : (k === ticks - 1 ? "right" : "center"); g.fillStyle = tokMuted;
      g.fillText(termShort(pts[i].d), k === 0 ? padX : (k === ticks - 1 ? padX + plotW : X(t[i])), h - 9);
    }

    if (!candle) {
      // straight segments between real daily values only (no smoothing: a curve would imply values in between)
      g.beginPath(); g.moveTo(X(t[0]), Y(pts[0].v));
      for (let i = 1; i < pts.length; i++) g.lineTo(X(t[i]), Y(pts[i].v));
      g.strokeStyle = tokGold; g.lineWidth = 2.4; g.lineJoin = "round"; g.stroke();
      g.lineTo(X(t[t.length - 1]), padTop + plotH); g.lineTo(X(t[0]), padTop + plotH); g.closePath();
      g.save(); g.globalAlpha = 0.16; g.fillStyle = tokGold; g.fill(); g.restore();
      if (pts.length <= 45) { g.fillStyle = tokGold; for (let i = 0; i < pts.length; i++) { g.beginPath(); g.arc(X(t[i]), Y(pts[i].v), 3.4, 0, Math.PI * 2); g.fill(); } }
      // the live point is drawn hollow so it reads as "now", not as a closed day
      const lp = pts[pts.length - 1];
      if (lp.k === "L" || lp.k === "q") { g.strokeStyle = tokGold; g.lineWidth = 2; g.fillStyle = tokInk; g.beginPath(); g.arc(X(t[t.length - 1]), Y(lp.v), 5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    } else {
      const slot = cds.length > 1 ? (plotW - 2 * inset) / (cds.length - 1) : 40;
      const bw = Math.max(3, Math.min(26, slot * 0.6));
      for (const c of cds) {
        const x = X(termDayMs(c.pts[Math.floor(c.pts.length / 2)].d));
        const up = c.close >= c.open, col = up ? UP : DOWN;
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x, Y(c.high)); g.lineTo(x, Y(c.low)); g.stroke();
        const y1 = Y(Math.max(c.open, c.close)), y2 = Y(Math.min(c.open, c.close));
        g.fillRect(x - bw / 2, y1, bw, Math.max(2, y2 - y1));
        c._x = x;
      }
    }

    // markers on the days items were added ("+75 items"), portfolio and growth series
    if (term.series === "portfolio" || term.series === "growth") {
      let lastLabelX = -1e9;
      g.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace"; g.textAlign = "center";
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]; if (!(p.added > 0)) continue;
        const x = candle ? (cds.find((c) => c.pts.includes(p))?._x ?? X(t[i])) : X(t[i]);
        g.strokeStyle = tokGold; g.globalAlpha = 0.55; g.setLineDash([2, 3]);
        g.beginPath(); g.moveTo(x, padTop + 12); g.lineTo(x, padTop + plotH); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        g.fillStyle = tokGold; g.beginPath(); g.moveTo(x - 4, padTop + 4); g.lineTo(x + 4, padTop + 4); g.lineTo(x, padTop + 11); g.closePath(); g.fill();
        if (x - lastLabelX > 52) { g.fillStyle = tokInk; g.fillText("+" + p.added, x, padTop - 4 + 1); lastLabelX = x; }
      }
    }

    if (term.cx !== null && term.cx >= padX && term.cx <= padX + plotW) {
      let best = 0, bx = Infinity;
      const xs = candle ? cds.map((c) => c._x) : t.map(X);
      for (let i = 0; i < xs.length; i++) if (Math.abs(xs[i] - term.cx) < bx) { bx = Math.abs(xs[i] - term.cx); best = i; }
      term.hit = candle ? { c: cds[best], i: best } : { p: pts[best], prev: pts[best - 1] || null, i: best };
      g.setLineDash([4, 4]); g.strokeStyle = tokGold; g.lineWidth = 1;
      g.beginPath(); g.moveTo(xs[best], padTop); g.lineTo(xs[best], padTop + plotH); g.stroke();
      g.setLineDash([]);
      if (!candle) { g.fillStyle = tokInk; g.beginPath(); g.arc(xs[best], Y(pts[best].v), 5.5, 0, Math.PI * 2); g.fill(); }
    }
  }

  window.TitanHallChart = () => renderTerminalChart(); // lets wings/hall.js redraw on resize/rotation

  /** Headline, badge, as-of line, composition and quote tiles: everything that depends on the current quote. */
  function renderTerminalHead() {
    const m = vault?.metals || {};
    const q = termQuote(), b = termBasis();
    const total = b.ag * q.ag + b.au * q.au + b.nonmetal;
    const agMelt = b.ag * q.ag, auMelt = b.au * q.au, above = Math.max(0, total - agMelt - auMelt);
    const todayStr = termTodayUTC();
    const pf = vault?.value?.portfolio_daily?.rows || [];
    const base = [...pf].reverse().find((r) => r[0] < todayStr);
    const priceEl = $("#term-price"), deltaEl = $("#term-delta");
    const gRows = term.series === "growth" ? pf.filter((r) => r[8] != null) : [];
    if (gRows.length) {        // Growth: same headline as Portfolio value (today's value at today's quote), framed as built up from $0
      const first = gRows[0], d = total;
      if (priceEl) priceEl.textContent = total > 0 ? money(total) : "—";
      if (deltaEl) { deltaEl.textContent = `${d >= 0 ? "▲ +" : "▼ −"}$${num(Math.abs(d), 2)} built from $0 since ${termDate(first[0])} · at today's prices`; deltaEl.className = "term-delta " + (d >= 0 ? "up" : "down"); }
    } else {
    if (priceEl) priceEl.textContent = total > 0 ? money(total) : "—";
    if (deltaEl) {
      if (base && base[1] > 0 && total > 0) {
        const d = total - base[1], pct = (d / base[1]) * 100;
        deltaEl.textContent = `${d >= 0 ? "▲ +" : "▼ −"}$${num(Math.abs(d), 2)} (${d >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%) vs ${termDate(base[0])}`;
        deltaEl.className = "term-delta " + (d >= 0 ? "up" : "down");
      } else { deltaEl.textContent = "no earlier day to compare"; deltaEl.className = "term-delta"; }
    }
    }
    const badge = $("#term-badge");
    if (badge) {
      badge.textContent = q.kind === "live" ? `LIVE · ${termClock(q.at)}` : (q.kind === "latest" ? `LAST QUOTE · ${termStamp(q.at)}` : "LEDGER QUOTE");
      if (badge.parentElement) badge.parentElement.classList.toggle("term-badge-stale", q.kind !== "live");
    }
    const honest = $("#term-honesty");
    if (honest) {
      const src = q.kind === "live" ? "gold-api.com, fetched just now" : (q.src || "");
      honest.textContent = `Total repriced with the ${q.asOf}${src ? " (" + src + ")" : ""}: ${num(b.ag, 2)} oz Ag at $${num(q.ag, 2)} and ${num(b.au, 4)} oz Au at $${num(q.au, 2)}, plus ${money(b.nonmetal)} of non-metal value from the ledger (premiums, albums, sets, housing).`
        + (q.kind !== "live" ? " The live price could not be reached, so the last known quote is shown." : "")
        + (b.exact ? "" : " Price history file not loaded: using the ledger's own totals.");
    }
    const grid = $("#term-stats-grid");
    if (grid) {
      const spotRows = term.prices?.spot?.rows || [];
      const prevDay = [...spotRows].reverse().find((r) => r[0] < todayStr && r[3] !== "c") || null;
      const prior = m.prior_spot || {};
      const quoteBox = (lbl, now, wasDay, wasLedger) => {
        const was = wasDay != null ? wasDay : wasLedger, wl = wasDay != null ? "vs " + termDate(prevDay[0]) : "vs prior ledger quote";
        let txt = "no earlier price to compare";
        if (now > 0 && was > 0) { const d = now - was; txt = `${d >= 0 ? "+" : "−"}$${num(Math.abs(d), 2)} (${d >= 0 ? "+" : "−"}${Math.abs((d / was) * 100).toFixed(2)}%) ${wl}`; }
        return `<div class="term-stat-box"><span class="ts-lbl">${lbl}</span>
          <div class="ts-spread-val">${now > 0 ? "$" + num(now, 2) + " / oz" : "—"}</div>
          <em class="ts-spread-delta">${esc(txt)} · ${esc(q.asOf)}</em></div>`;
      };
      const pct = (x) => (total > 0 ? Math.round((x / total) * 100) : 0);
      const pieces = Number(vault?.counts?.vault) || (vault?.flips || []).filter((f) => f.status !== "Removed").length;
      const seg = (x, col) => `<span style="flex:${Math.max(x, 0)} 1 0;background:${col};min-width:${x > 0 ? 2 : 0}px"></span>`;
      grid.innerHTML =
        quoteBox("Silver spot", q.ag, prevDay ? prevDay[1] : null, Number(prior.ag_usd_oz)) +
        quoteBox("Gold spot", q.au, prevDay ? prevDay[2] : null, Number(prior.au_usd_oz)) +
        `<div class="term-stat-box"><span class="ts-lbl">Value composition · ${esc(q.asOf)}</span>
          <div class="ts-comp-bar" aria-hidden="true">${seg(agMelt, "#b8c2cc")}${seg(auMelt, "#e0b83c")}${seg(above, "#7a8a9e")}</div>
          <div class="ts-spread-val">Silver melt $${num(agMelt, 2)} <em class="ts-spread-delta">(${pct(agMelt)}%)</em></div>
          <div class="ts-spread-val">Gold melt $${num(auMelt, 2)} <em class="ts-spread-delta">(${pct(auMelt)}%)</em></div>
          <div class="ts-spread-val">Above melt $${num(above, 2)} <em class="ts-spread-delta">(${pct(above)}%; albums, sets, housing, numismatic value)</em></div></div>` +
        `<div class="term-stat-box"><span class="ts-lbl">Physical custody</span>
          <div class="ts-leverage-val"><strong>${num(b.ag, 2)} oz Ag · ${num(b.au, 4)} oz Au · ${intFmt(pieces)} pieces</strong> · Unencumbered</div></div>`;
    }
  }

  function renderTerminalCaption() {
    const cap = $("#term-chart-cap");
    if (!cap) return;
    const pf = vault?.value?.portfolio_daily || {};
    const win = termWindow(termSeries());
    const parts = [];
    if (term.series === "growth") {
      const gq = termQuote();
      parts.push(`Collection growth = what you owned each day, all priced at today's quote (silver $${num(gq.ag, 2)}, gold $${num(gq.au, 2)}, ${gq.asOf}), so metal price swings are removed: the line moves only when items are added (or removed), and it ends on the same value as Portfolio value. Item values are the ledger's static estimates; live coin prices are a later step.`);
      parts.push("Dashed ticks with a number mark days items were added.");
    } else if (term.series === "portfolio") {
      parts.push(pf.caption || "Portfolio value = metal content x that day's spot + each item's ledger premium, counted from the day it was added.");
      if (pf.priced_from && pf.day0 && pf.priced_from > pf.day0) parts.push(`Spot prices before ${termDate(pf.priced_from)} have not been fetched yet, so the chart starts there; the daily price job backfills back to ${termDate(pf.day0)}.`);
      parts.push("Dashed ticks with a number mark days items were added.");
    } else {
      parts.push(`Daily ${term.series === "ratio" ? "gold ÷ silver spot ratio" : (term.series === "ag" ? "silver spot" : "gold spot")} from the collection's price history (${term.prices?.sources?.length ? term.prices.sources.map((s) => s.split(" (")[0]).join("; ") : "daily price job"}). Weekends and holidays repeat the previous close and are marked "carried".`);
    }
    if (term.mode === "candle") parts.push(`Candles: each bar is ${win.bucket === 1 ? "one day (open = the previous day's value, close = that day's value)" : win.bucket + " days (open = previous bar's close; high and low from the daily values inside it)"}; built only from real daily values.`);
    if (win.short) parts.push(`Only ${win.days} day(s) of history exist so far, so ${term.tf} shows all of it.`);
    cap.textContent = parts.join(" ");
    cap.hidden = false;
  }

  function termSyncButtons() {
    $$("#trading-terminal [data-series]").forEach((b) => { const on = b.dataset.series === term.series; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$("#trading-terminal [data-tf]").forEach((b) => { const on = b.dataset.tf === term.tf; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    $$("#trading-terminal [data-mode]").forEach((b) => { const on = b.dataset.mode === term.mode; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }

  function termRefresh() { termSyncButtons(); renderTerminalHead(); renderTerminalCaption(); renderTerminalChart(); }

  function initTradingTerminal() {
    const hub = $("#trading-terminal");
    if (!hub) return;
    if (!hub.dataset.wired) {
      hub.dataset.wired = "1";
      hub.addEventListener("click", (e) => {
        const s = e.target.closest("[data-series], [data-asset]"), tf = e.target.closest("[data-tf]"), md = e.target.closest("[data-mode]");
        if (s) { term.series = s.dataset.series || s.dataset.asset; if (!["portfolio", "growth", "ag", "au", "ratio"].includes(term.series)) term.series = "portfolio"; }
        else if (tf) term.tf = tf.dataset.tf;
        else if (md) term.mode = md.dataset.mode === "candle" ? "candle" : "area";
        else return;
        termSave(); term.cx = null; const hud = $("#term-hud"); if (hud) hud.hidden = true;
        termRefresh();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && term.live && Date.now() - term.live.at.getTime() > 120000) { term.liveTried = false; termFetchLive().then(termRefresh); }
      });
    }
    termRefresh();                                    // first paint from what is already on the page (ledger quote, portfolio series)
    termLoadPrices().then(() => { termRefresh(); return termFetchLive(); }).then(termRefresh);   // spot history first (same origin), then the live quote

    const stage = $("#term-chart-stage"), hud = $("#term-hud");
    if (stage && !stage.dataset.wired) {
      stage.dataset.wired = "1";
      let rect = null, raf = null;
      const upd = () => { rect = stage.getBoundingClientRect(); };
      window.addEventListener("resize", upd, { passive: true });
      const show = () => {
        const h = term.hit; if (!hud || !h) return;
        hud.hidden = false;
        hud.style.left = term.cx > rect.width * 0.52 ? "12px" : "auto";
        hud.style.right = term.cx > rect.width * 0.52 ? "auto" : "12px";
        const dEl = $("#hud-date"), vEl = $("#hud-val"), cEl = $("#hud-chg"), rEl = $("#hud-range");
        cEl.className = "hud-chg";
        if (h.c) {
          const c = h.c, d = c.close - c.open;
          dEl.textContent = c.d0 === c.d1 ? termDate(c.d0) : `${termShort(c.d0)} – ${termDate(c.d1)}`;
          vEl.textContent = termFmtVal(c.close);
          cEl.textContent = `${d >= 0 ? "▲ +" : "▼ −"}${term.series === "ratio" ? num(Math.abs(d), 2) : "$" + num(Math.abs(d), 2)}`; cEl.classList.add(d >= 0 ? "up" : "down");
          rEl.textContent = `O ${termFmtVal(c.open)} · H ${termFmtVal(c.high)} · L ${termFmtVal(c.low)}${c.added ? " · +" + c.added + " items" : ""}`;
        } else {
          const p = h.p, pv = h.prev;
          dEl.textContent = termDate(p.d) + (p.k === "L" ? " · live" : "");
          vEl.textContent = termFmtVal(p.v);
          if (pv && pv.v > 0) { const d = p.v - pv.v; cEl.textContent = `${d >= 0 ? "▲ +" : "▼ −"}${term.series === "ratio" ? num(Math.abs(d), 2) : "$" + num(Math.abs(d), 2)} (${((d / pv.v) * 100).toFixed(2)}%) vs ${termShort(pv.d)}`; cEl.classList.add(d >= 0 ? "up" : "down"); }
          else cEl.textContent = "first day shown";
          const bits = [];
          if (term.series === "portfolio" || term.series === "growth") { if (p.added > 0) bits.push(`+${intFmt(p.added)} items added`); if (p.n != null) bits.push(`${intFmt(p.n)} items counted`); }
          const kt = termKindText(p.k); if (kt) bits.push(kt);
          rEl.textContent = bits.join(" · ") || "closing price";
        }
      };
      const move = (e) => {
        if (term.pts.length < 2) return;
        if (!rect) upd();
        const cx = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
        if (cx == null) return;
        term.cx = Math.max(0, Math.min(rect.width, cx - rect.left));
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = null; renderTerminalChart(); show(); });
      };
      const leave = () => { term.cx = null; if (hud) hud.hidden = true; renderTerminalChart(); };
      stage.addEventListener("mouseenter", upd, { passive: true });
      stage.addEventListener("mousemove", move, { passive: true });
      stage.addEventListener("mouseleave", leave);
      stage.addEventListener("touchstart", move, { passive: true });
      stage.addEventListener("touchmove", move, { passive: true });
      stage.addEventListener("touchend", leave, { passive: true });
    }
  }

  /** The exhibition: Studio Stage with 3D Flip & Phase 2 Capture Anticipation. */
  function startExhibit() {
    clearInterval(exhibitTimer);
    const frame = $("#exhibit-frame");
    const dots = $("#exhibit-dots");
    const box = $("#exhibit");
    if (!frame || !vault) return;
    exhibitMasters = (vault.flips || [])
      .filter((f) => f.status !== "Removed" && (f.est ?? 0) > 0)
      .sort((a, b) => (b.est ?? 0) - (a.est ?? 0))
      .slice(0, 5);
    exhibitIdx = 0;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let loupeActive = false;
    try { loupeActive = localStorage.getItem("tr_loupe_v1") === "1"; } catch (_) {}
    
    const paint = () => {
      if (!exhibitMasters.length) {
        frame.innerHTML = '<div class="exhibit-slide on"><div class="ex-ser">—</div><div class="ex-line">No valued flips yet</div></div>';
        if (dots) dots.innerHTML = "";
        return;
      }
      frame.innerHTML = exhibitMasters.map((f, i) => {
        const isGold = f.is_gold || /gold/i.test(f.metal || "");
        const year = esc(f.year || "—");
        const denom = esc(f.denom || f.label || "Coin");
        const country = esc(f.country || "Unknown");
        const spotAg = vault.precious?.spot_ag ?? vault.metals?.spot?.ag_usd_oz ?? 0;
        const meltVal = f.is_silver && f.asw_oz ? Number(f.asw_oz) * Number(spotAg) : null;
        const multiplier = meltVal && f.est ? (Number(f.est) / meltVal).toFixed(1) + "× Melt" : null;
        const cleanDenom = denom.replace(/[^a-zA-Z0-9]/g, '');
        const targetFilenameObv = `${esc(f.ser)}_${esc(f.year)}_${cleanDenom}_obv.tif`;
        const targetFilenameRev = `${esc(f.ser)}_${esc(f.year)}_${cleanDenom}_rev.tif`;

        return `
        <div class="exhibit-slide${i === exhibitIdx ? " on" : ""}" data-slide-scan="${esc(f.scan)}">
          <div class="ex-pedestal-tray" id="tray-${esc(f.scan)}">
            <div class="ex-tray-velvet">
              <div class="ex-velvet-corners"></div>
              <div class="ex-spotlight-cone"></div>
              ${render3DExhibitFlipper(f)}
            </div>
          </div>
          <div class="ex-info-placard">
            <div class="placard-kicker">
              <span class="placard-seal">🏛️ FROM THE VAULT · TOP VALUE</span>
              <span class="placard-pos">${i + 1} of ${exhibitMasters.length}</span>
            </div>
            <h3 class="placard-title">${country} · ${year}</h3>
            <div class="placard-denom">${denom}</div>
            
            <div class="placard-metrics">
              <div class="pl-metric">
                <span class="pl-lbl">Ledger estimate</span>
                <span class="pl-val gold">${money(f.est)}</span>
              </div>
              <div class="pl-metric">
                <span class="pl-lbl">${f.is_silver ? "Silver Melt" : "Alloy"}</span>
                <span class="pl-val">${meltVal ? money(meltVal) : (isGold ? "Gold" : "Base Alloy")}</span>
              </div>
              <div class="pl-metric">
                <span class="pl-lbl">${multiplier ? "Over melt" : "Ledger confidence"}</span>
                <span class="pl-val">${multiplier || (f.conf ? esc(String(f.conf).toUpperCase()) : "—")}</span>
              </div>
            </div>

            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.4rem">
              <button type="button" class="placard-inspect-btn" data-scan="${esc(f.scan)}">
                Inspect Specimen Dossier & Placard →
              </button>
              <button type="button" class="btn small" data-lab-session="${country}" style="font-size:0.8rem">
                Open in Photo Lab →
              </button>
            </div>
          </div>
        </div>`;
      }).join("") + `
        <button type="button" class="ex-nav-btn ex-prev" id="btn-ex-prev" aria-label="Previous masterpiece" title="Previous Masterpiece">‹</button>
        <button type="button" class="ex-nav-btn ex-next" id="btn-ex-next" aria-label="Next masterpiece" title="Next Masterpiece">›</button>
      `;

      if (dots) dots.innerHTML = exhibitMasters.map((_, i) =>
        `<button type="button" data-i="${i}" class="${i === exhibitIdx ? "on" : ""}" aria-label="Show exhibit ${i + 1}"></button>`).join("");

      // Bind explicit Inspect Dossier buttons (ONLY this opens the drawer)
      $$(".placard-inspect-btn").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          dossierCtx = null;
          openDrawer(btn.dataset.scan);
        };
      });

      // Bind Prev / Next Navigation Arrows
      const prevBtn = $("#btn-ex-prev");
      const nextBtn = $("#btn-ex-next");
      if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); go(exhibitIdx - 1); };
      if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); go(exhibitIdx + 1); };

      // Bind Caliper explainer button & sync state
      $$("[data-act='caliper-info']").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          showCaliperExplainer();
        };
      });
      const reticleBtnEl = $("#btn-ex-reticle");
      if (reticleBtnEl) reticleBtnEl.classList.toggle("active", caliperActive);

      // Touch swipe support on exhibit frame
      let touchStartX = null, touchStartY = null;
      frame.ontouchstart = (e) => {
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      };
      frame.ontouchend = (e) => {
        if (touchStartX === null || !e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        touchStartX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          e.stopPropagation();
          if (dx < 0) go(exhibitIdx + 1);
          else go(exhibitIdx - 1);
        }
      };

      // Bind specular lighting and 3D tilt tracking
      $$(".ex-pedestal-tray").forEach((tray) => {
        let trayRect = null;
        let tiltRaf = null;
        const updateTrayRect = () => { trayRect = tray.getBoundingClientRect(); };
        tray.addEventListener("mouseenter", updateTrayRect, { passive: true });
        window.addEventListener("resize", updateTrayRect, { passive: true });

        tray.onmousemove = (e) => {
          if (!trayRect) trayRect = tray.getBoundingClientRect();
          const x = e.clientX - trayRect.left;
          const y = e.clientY - trayRect.top;
          if (tiltRaf) return;
          tiltRaf = requestAnimationFrame(() => {
            tiltRaf = null;
            const pctX = ((x / trayRect.width) * 100).toFixed(1);
            const pctY = ((y / trayRect.height) * 100).toFixed(1);
            const tiltX = (((x / trayRect.width) - 0.5) * 14).toFixed(1);
            const tiltY = (((y / trayRect.height) - 0.5) * -14).toFixed(1);
            const flipper = tray.querySelector(".ex-specimen-flipper");
            if (flipper) {
              flipper.style.setProperty("--mouse-x", pctX + "%");
              flipper.style.setProperty("--mouse-y", pctY + "%");
              const isFlipped = flipper.classList.contains("flipped");
              flipper.style.transform = `perspective(1000px) rotateX(${tiltY}deg) rotateY(${isFlipped ? 180 + Number(tiltX) : tiltX}deg)`;

              // Numismatic Cartwheel Luster Angle & Directional Relief Lighting
              const cx = trayRect.width / 2;
              const cy = trayRect.height / 2;
              const angleRad = Math.atan2(y - cy, x - cx);
              const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;
              flipper.style.setProperty("--luster-angle", `${angleDeg.toFixed(1)}deg`);
              const normX = (((x - cx) / cx) * 3).toFixed(1);
              const normY = (((y - cy) / cy) * 3).toFixed(1);
              flipper.style.setProperty("--relief-x", `${normX}`);
              flipper.style.setProperty("--relief-y", `${normY}`);
            }

            // Forensic 10x Macro Loupe tracking
            const loupe = tray.querySelector(".forensic-loupe");
            const aperture = tray.querySelector(".slab-coin-aperture");
            if (loupeActive && loupe && aperture) {
              const apRect = aperture.getBoundingClientRect();
              if (
                e.clientX >= apRect.left && e.clientX <= apRect.right &&
                e.clientY >= apRect.top && e.clientY <= apRect.bottom
              ) {
                loupe.hidden = false;
                const apX = e.clientX - apRect.left;
                const apY = e.clientY - apRect.top;
                const stageEl = tray.querySelector(".ex-3d-stage");
                const stRect = stageEl ? stageEl.getBoundingClientRect() : trayRect;
                loupe.style.left = (e.clientX - stRect.left) + "px";
                loupe.style.top = (e.clientY - stRect.top) + "px";

                const zoomTarget = loupe.querySelector(".loupe-optic-zoom");
                const isFlipped = flipper?.classList.contains("flipped");
                const activeImg = flipper?.querySelector(isFlipped ? ".reverse-side .slab-coin-img" : ".obverse-side .slab-coin-img") || flipper?.querySelector(".slab-coin-img");
                const activeSvg = flipper?.querySelector(isFlipped ? ".reverse-side .specimen-medallion" : ".obverse-side .specimen-medallion") || flipper?.querySelector(".specimen-medallion");
                const imgSrc = activeImg?.currentSrc || activeImg?.src || activeImg?.dataset?.src;
                if (zoomTarget) {
                  const zoom = 2.8;
                  const bgX = -(apX * zoom - 75);
                  const bgY = -(apY * zoom - 75);
                  if (imgSrc) {
                    zoomTarget.style.backgroundImage = `url("${imgSrc}")`;
                    zoomTarget.style.backgroundPosition = `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
                    zoomTarget.style.backgroundSize = `${(apRect.width * zoom).toFixed(1)}px ${(apRect.height * zoom).toFixed(1)}px`;
                  } else if (activeSvg) {
                    const svgXml = new XMLSerializer().serializeToString(activeSvg);
                    const svgData = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgXml);
                    zoomTarget.style.backgroundImage = `url("${svgData}")`;
                    zoomTarget.style.backgroundPosition = `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
                    zoomTarget.style.backgroundSize = `${(apRect.width * zoom).toFixed(1)}px ${(apRect.height * zoom).toFixed(1)}px`;
                  }
                }

                const coordsEl = loupe.querySelector(".loupe-coords");
                if (coordsEl) {
                  const midX = apRect.width / 2;
                  const midY = apRect.height / 2;
                  const rawX = ((apX - midX) / midX) * 12.5;
                  const rawY = ((apY - midY) / midY) * -12.5;
                  const dX = Math.abs(rawX) < 0.05 ? "0.0" : Math.abs(rawX).toFixed(1);
                  const dY = Math.abs(rawY) < 0.05 ? "0.0" : Math.abs(rawY).toFixed(1);
                  const signX = rawX > 0.04 ? "+" : (rawX < -0.04 ? "-" : "+");
                  const signY = rawY > 0.04 ? "+" : (rawY < -0.04 ? "-" : "+");
                  coordsEl.textContent = `X:${signX}${dX} Y:${signY}${dY}mm`;
                }
              } else {
                loupe.hidden = true;
              }
            } else if (loupe) {
              loupe.hidden = true;
            }
          });
        };
        tray.onmouseleave = () => {
          if (tiltRaf) { cancelAnimationFrame(tiltRaf); tiltRaf = null; }
          const flipper = tray.querySelector(".ex-specimen-flipper");
          if (flipper) {
            const isFlipped = flipper.classList.contains("flipped");
            flipper.style.transform = isFlipped ? "rotateY(180deg)" : "none";
          }
          const loupe = tray.querySelector(".forensic-loupe");
          if (loupe) loupe.hidden = true;
        };
      });

      // Bind 3D flip click
      $$(".ex-specimen-flipper").forEach((flipper) => {
        flipper.onclick = (e) => {
          e.stopPropagation();
          flipper.classList.toggle("flipped");
          playCoinChime();
          const isFlipped = flipper.classList.contains("flipped");
          $("#btn-ex-obv")?.classList.toggle("active", !isFlipped);
          $("#btn-ex-rev")?.classList.toggle("active", isFlipped);
        };
      });

      // Copy filename buttons
      $$(".ex-copy-fn-btn").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const txt = btn.dataset.copyfn;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(txt).then(() => showToast("Copied: " + txt));
          } else {
            showToast("Copied: " + txt);
          }
        };
      });

      // Photo Lab shortcut buttons
      $$("[data-lab-session]").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          flipFilter = { ...flipFilter, phase2: true, country: btn.dataset.labSession };
          setWing("lab");
          window.scrollTo(0, 0);
        };
      });
    };

    paint();

    const go = (i) => {
      exhibitIdx = (i + exhibitMasters.length) % exhibitMasters.length;
      paint();
    };

    // Rotation pauses while the visitor is reading (hover, focus, touch), when the tab is hidden,
    // when the Hall is not the active wing, and when the exhibit is scrolled off-screen.
    let exhibitHold = false;
    let exhibitVisible = true;
    if (box) {
      const hold = () => { exhibitHold = true; };
      const release = () => { exhibitHold = false; };
      ["mouseenter", "focusin", "touchstart", "pointerdown"].forEach((ev) => box.addEventListener(ev, hold, { passive: true }));
      ["mouseleave", "focusout"].forEach((ev) => box.addEventListener(ev, release));
      box.addEventListener("touchend", () => setTimeout(release, 6000), { passive: true });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((es) => { exhibitVisible = es.some((e) => e.isIntersecting); }, { threshold: 0.25 }).observe(box);
      }
    }
    if (!reduced && exhibitMasters.length > 1) {
      exhibitTimer = setInterval(() => {
        if (!document.body.contains(frame)) { clearInterval(exhibitTimer); return; }
        if (document.hidden || exhibitHold || !exhibitVisible) return;
        if (!$("#pane-hall")?.classList.contains("active")) return;
        go(exhibitIdx + 1);
      }, 10000);
    }

    if (dots) dots.onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) go(+b.dataset.i); };

    // Top bar 3D flip controls
    const obvBtn = $("#btn-ex-obv");
    const revBtn = $("#btn-ex-rev");
    const flipBtn = $("#btn-ex-flip");
    const reticleBtn = $("#btn-ex-reticle");

    if (obvBtn) {
      obvBtn.onclick = (e) => {
        e.stopPropagation();
        $$(".ex-specimen-flipper").forEach((fl) => fl.classList.remove("flipped"));
        obvBtn.classList.add("active");
        revBtn?.classList.remove("active");
        playStapleClick();
      };
    }
    if (revBtn) {
      revBtn.onclick = (e) => {
        e.stopPropagation();
        $$(".ex-specimen-flipper").forEach((fl) => fl.classList.add("flipped"));
        revBtn.classList.add("active");
        obvBtn?.classList.remove("active");
        playStapleClick();
      };
    }
    if (flipBtn) {
      flipBtn.onclick = (e) => {
        e.stopPropagation();
        $$(".ex-specimen-flipper").forEach((fl) => fl.classList.toggle("flipped"));
        playCoinChime();
        const firstFlip = $(".ex-specimen-flipper");
        const isFlipped = firstFlip?.classList.contains("flipped");
        obvBtn?.classList.toggle("active", !isFlipped);
        revBtn?.classList.toggle("active", isFlipped);
      };
    }
    const spatialBtn = $("#btn-ex-spatial");
    if (spatialBtn) {
      spatialBtn.onclick = (e) => {
        e.stopPropagation();
        const curScan = exhibitMasters[exhibitIdx];
        const item = (vault?.flips || []).find((x) => x.scan === curScan?.scan || x.ser === curScan?.ser) || curScan;
        if (window.TitanSpatial) window.TitanSpatial.open(item);
      };
    }
    if (reticleBtn) {
      reticleBtn.classList.toggle("active", caliperActive);
      reticleBtn.onclick = (e) => {
        e.stopPropagation();
        caliperActive = !caliperActive;
        try { localStorage.setItem("tr_caliper_v1", caliperActive ? "1" : "0"); } catch { /* ignore */ }
        reticleBtn.classList.toggle("active", caliperActive);
        $$(".ex-optical-reticle").forEach((r) => r.classList.toggle("active", caliperActive));
        $$(".ex-caliper-hud").forEach((h) => h.classList.toggle("active", caliperActive));
        playStapleClick();
        showToast(caliperActive ? "📏 Caliper Active: 1:1 Scale & Die Analyzer" : "Caliper Reticle Hidden");
      };
    }

    const loupeBtn = $("#btn-ex-loupe");
    if (loupeBtn) {
      loupeBtn.classList.toggle("active", loupeActive);
      loupeBtn.onclick = (e) => {
        e.stopPropagation();
        loupeActive = !loupeActive;
        try { localStorage.setItem("tr_loupe_v1", loupeActive ? "1" : "0"); } catch (_) {}
        loupeBtn.classList.toggle("active", loupeActive);
        if (!loupeActive) {
          $$(".forensic-loupe").forEach((l) => l.hidden = true);
        }
        playStapleClick();
        showToast(loupeActive ? "🔬 10× Macro Loupe Active: Hover over coin aperture" : "10× Macro Loupe Hidden");
      };
    }
  }

  function renderHall() {
    clearInterval(momentTimer); // old rotation dies with the old DOM
    const d = vault.drip || {};
    const m = vault.metals || {};
    const flipsTotal = vault.counts?.flips || 0;

    startExhibit();
    renderMarketTickerTape();
    initTradingTerminal();

    // ---- The Lab banner: impossible to miss ----
    const sq = shootingData();
    const pct = sq.live.length ? Math.round((sq.done / sq.live.length) * 100) : 0;
    const labBanner = sq.live.length ? `
      <button type="button" class="lab-banner reveal" id="hall-lab-go" aria-label="Open the Conservation Lab">
        <span class="lb-eyebrow"><span class="exhibit-lamp" aria-hidden="true"></span>Conservation Lab · Phase 2</span>
        <h3>${intFmt(sq.done)} of ${intFmt(sq.live.length)} flips photographed</h3>
        <p>${sq.done === 0 ? "The archive is empty — the shoot starts with you. Pick a country, start a session." : "Cameras are rolling — pick the next country session."}</p>
        <div class="lab-progress" role="img" aria-label="${pct} percent photographed"><span style="width:${pct}%"></span></div>
        <div class="lab-meta"><strong>${pct}%</strong><span class="lab-go">Enter the Lab →</span></div>
      </button>` : "";

    // ---- Wing entrances ----
    const wingCards = `
      <div class="sec-head reveal"><span class="eyebrow">The museum</span><h2>Wings</h2><p class="sub">Four rooms, one vault.</p><p class="sub egg-cursed" aria-hidden="true">Hic sunt dracones — mind the thirteenth step.</p></div>
      <div class="wing-grid">
        <button type="button" class="wing-card reveal" data-go="gallery">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M3 16.5l5-4 4 3 4-3 5 4"/></svg>
          <span class="wc-name">The Gallery</span>
          <span class="wc-desc">Every flip on the wall — tap a piece for its placard.</span>
          <span class="wc-stat">${intFmt(flipsTotal)} pieces hung</span>
        </button>
        <button type="button" class="wing-card reveal" data-go="vault">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><circle cx="12" cy="14" r="2.2"/></svg>
          <span class="wc-name">The Vault</span>
          <span class="wc-desc">Bullion, sets and the hard reserves.</span>
          <span class="wc-stat">${money(vault.board?.bullion?.usd)} in reserve</span>
        </button>
        <button type="button" class="wing-card reveal" data-go="study">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M9 8h7M9 12h5"/></svg>
          <span class="wc-name">Curator's Study</span>
          <span class="wc-desc">Value, age and country — annotated.</span>
          <span class="wc-stat">The ledger, thinking</span>
        </button>
        <button type="button" class="wing-card reveal" data-go="lab">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 3v6.3L4.8 18a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 9.3V3"/><path d="M7.5 15h9"/></svg>
          <span class="wc-name">Conservation Lab</span>
          <span class="wc-desc">Photo QC — every flip, shot and verified.</span>
          <span class="wc-stat">${pct}% photographed</span>
        </button>
      </div>
      <a class="hall-simple-entry reveal" href="#simple">
        <span class="hs-name">Simple view</span>
        <span class="hs-desc">Big letters, plain answers: what is missing, and do I have a coin.</span>
        <span class="hs-go">Open the simple view →</span>
      </a>
      <button type="button" class="hall-wants-entry reveal" data-open-wants>
        <span class="hw-name">What's missing</span>
        <span class="hw-desc">Which years each album still needs, with a printable want list for a coin show.</span>
        <span class="hw-go">Open the list →</span>
      </button>`;

    // ---- Curator's notes ----
    const notes = `
      <div class="sec-head reveal"><span class="eyebrow">Marginalia</span><h2>Curator's notes</h2></div>
      <div class="notes-grid">
        <div class="note-card reveal"><div class="k">Last add</div><div class="v" style="font-size:1rem;line-height:1.4">${esc(d.last_add || "—")}</div></div>
        <div class="note-card reveal"><div class="k">Soft beat</div><div class="v">${esc(intFmt(d.vault ?? vault.board?.vault ?? "—"))}</div><div class="s">Next ${esc(intFmt(d.next_soft_beat ?? 1700))}</div></div>
        <div class="note-card reveal"><div class="k">Metals as-of</div><div class="v" style="font-size:1rem">${esc(m.as_of_local || m.as_of || d.metals_live || "—")}</div><div class="s">Ag ${money(m.spot?.ag_usd_oz)} · Au ${money(m.spot?.au_usd_oz)}</div></div>
        <div class="note-card reveal"><div class="k">Cull watch</div><div class="s" style="color:var(--warn)">${esc(d.cull_watch || "—")}</div></div>
        <div class="note-card reveal egg-cursed" aria-hidden="true"><div class="k">Do not</div><div class="v" style="font-size:1rem;line-height:1.4">tap the glass</div><div class="s">it taps back</div></div>
      </div>`;

    // ---- Editorial moment (rotating pull quote) ----
    const momentsAll = vault.moments || [];
    const momentCard = momentsAll.length ? `
      <div class="sec-head reveal"><span class="eyebrow">Editorial</span><h2>From the vault</h2></div>
      <figure class="moment-card reveal" aria-label="From the vault" style="margin:0 0 1.5rem">
        <span class="mk">Vault moment</span>
        <blockquote class="moment-text" id="moment-text" style="margin:0">${esc(momentsAll[0])}</blockquote>
      </figure>` : "";

    // ---- Watchlist ----
    const flags = splitFlags(vault.flags || []).map((x) => `<li>${esc(x)}</li>`).join("");
    const flagsSec = `
      <div class="sec-head reveal"><span class="eyebrow">Watchlist</span><h2>Keep an eye</h2></div>
      <div class="card reveal"><ul class="moments flags">${flags || "<li class='muted'>None</li>"}</ul></div>`;

    $("#hall-body").innerHTML = `${labBanner}${wingCards}${notes}${momentCard}${flagsSec}`;

    // Rotate "From the vault" through vault.moments[] every 12s with a CSS fade.
    const mEl = $("#moment-text");
    if (mEl && momentsAll.length > 1) {
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        let mi = 0;
        momentTimer = setInterval(() => {
          if (!document.body.contains(mEl)) { clearInterval(momentTimer); return; }
          mEl.classList.add("fading");
          setTimeout(() => {
            if (!document.body.contains(mEl)) return;
            mi = (mi + 1) % momentsAll.length;
            mEl.textContent = momentsAll[mi];
            mEl.classList.remove("fading");
          }, 600);
        }, 12000);
      }
    }

    $$("#hall-body [data-go]").forEach((btn) => {
      btn.addEventListener("click", () => { setWing(btn.dataset.go); window.scrollTo(0, 0); });
    });
    $("#hall-lab-go")?.addEventListener("click", () => { setWing("lab"); window.scrollTo(0, 0); });
    observeReveals($("#hall-body"));
  }



  const REQ_KIND = {
    "clearer photo": "📷", "reverse needed": "↺", "confirm year": "?", "missing field": "…",
    "label mismatch": "≠", "crop review": "◎", "diameter check": "⌀", "info": "i",
  };
  function requestsModule() {
    const all = (vault.requests || []).filter((r) => r.status === "open");
    if (!all.length) return `<div class="card wide req-card"><h3>Requests from Titan</h3><p class="empty">Nothing needed right now.</p></div>`;
    const VISIBLE = 7;
    let open = false;
    try { open = localStorage.getItem(REQ_OPEN_KEY) === "1"; } catch { /* ignore */ }
    const rows = all.map((r, i) => {
      const who = r.ser || r.coin_key || "";
      const href = r.href || "";
      return `<li class="req${i >= VISIBLE ? " extra" : ""}${href ? " link" : ""}" ${href ? `data-href="${esc(href)}" role="button" tabindex="0"` : ""}>
        <span class="req-ico" title="${esc(r.kind)}">${esc(REQ_KIND[r.kind] || "•")}</span>
        <span class="req-body"><span class="req-kind">${esc(r.kind)}</span>${who ? ` <span class="req-who">${esc(who)}</span>` : ""}<br/>${esc(r.text)}</span>
        ${href ? '<span class="req-go" aria-hidden="true">›</span>' : ""}
      </li>`;
    }).join("");
    const extra = all.length - VISIBLE;
    const label = extra > 0 ? `Show all ${all.length}` : "";
    return `<div class="card wide req-card">
      <h3>Requests from Titan <span class="req-count">${esc(intFmt(all.length))} open</span></h3>
      <p class="hint" style="margin:0 0 0.5rem">Small things you could do to firm up the data. Tap one to open the coin.</p>
      <ul class="req-list${open ? " open" : ""}" id="req-list">${rows}</ul>
      ${extra > 0 ? `<button type="button" class="btn small" id="req-more" data-label="${esc(label)}">${open ? "Show fewer" : esc(label)}</button>` : ""}
    </div>`;
  }

  function flipCountries() {
    const counts = new Map();
    (vault.flips || []).forEach((f) => {
      if (!f.country) return;
      counts.set(f.country, (counts.get(f.country) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  /** Shared full-text match for flips: SER/scan/country/year/denom + lazy notes index.
      Used by the Flips filter and the ⌘K search palette alike. */
  function flipQueryMatch(f, q) {
    const scan = String(f.scan || "").toLowerCase();
    const ser = String(f.ser || "").toLowerCase();
    // Allow C272 / c272 / 272 style
    const qNorm = q.replace(/^#/, "");
    if (scan.includes(qNorm) || ser.includes(qNorm)) return true;
    if (/^c?\d+$/i.test(qNorm) && scan.replace(/\D/g, "").includes(qNorm.replace(/\D/g, ""))) return true;
    const blob = norm([f.scan, f.ser, f.country, f.year, f.denom, f.label, f.mint, f.iso, f.continent, f.status, f.location, f.conf].join(" "))
      + " " + (searchIdx?.[f.scan] || "");
    // every word must match somewhere (order-free), so "helvetia 1969" finds C001
    return q.split(" ").every((w) => blob.includes(w));
  }

  let cabinetTray = "all"; // 'crown' | 'silver' | 'world' | 'timeline' | 'all'

  /** One rule for "awaiting Phase 2", used by both the filter and its count. */
  function isAwaitingPhase2(f) {
    return f.awaiting_phase2 !== false && f.status !== "Removed" && !f.phase2_done;
  }

  /** Year box: "1969" / "196" match by prefix, "1960-1979" is a range; anything else is a substring. */
  function yearMatches(f, raw) {
    const y = String(raw || "").trim();
    if (!y) return true;
    const fy = String(f.year || "");
    const range = y.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    if (range) { const n = parseInt(fy, 10); return n >= +range[1] && n <= +range[2]; }
    if (/^\d{1,4}$/.test(y)) return fy.startsWith(y);
    return fy.toLowerCase().includes(y.toLowerCase());
  }

  function filteredFlips() {
    // Gallery Finder (wings/gallery.js) owns the facets + sorts; Cover Flow, dossier prev/next and the
    // 3D table all read the same list through this hook. Legacy code below runs if it is absent or fails.
    const gb = window.__galleryBridge;
    if (gb && gb.filtered && !gb.broken) {
      try { return gb.filtered(); } catch (e) { gb.broken = true; console.warn("Gallery finder failed; using the classic filters.", e); }
    }
    let rows = vault.flips || [];
    const q = norm(flipFilter.q);

    // Filter by active Cabinet Tray (Crown Jewels is applied last so it respects every other filter)
    if (cabinetTray === "silver") {
      rows = rows.filter((f) => f.is_silver);
    }

    const STAGING_SCANS = new Set(["C114", "C223", "C073", "C066", "C065"]);
    if (flipFilter.staging) rows = rows.filter((f) => STAGING_SCANS.has(f.scan) || STAGING_SCANS.has(f.ser));
    if (flipFilter.silverOnly) rows = rows.filter((f) => f.is_silver);
    if (flipFilter.phase2) rows = rows.filter(isAwaitingPhase2);
    if (flipFilter.country) rows = rows.filter((f) => f.country === flipFilter.country);
    if (flipFilter.iso) rows = rows.filter((f) => f.iso === flipFilter.iso);
    if (flipFilter.year) rows = rows.filter((f) => yearMatches(f, flipFilter.year));
    if (q) {
      rows = rows.filter((f) => flipQueryMatch(f, q));
    }

    if (cabinetTray === "crown") {
      return rows.filter((f) => f.status !== "Removed" && (f.est ?? 0) > 0)
        .sort((a, b) => (b.est ?? 0) - (a.est ?? 0))
        .slice(0, 12);
    }

    if (cabinetTray === "silver") {
      rows = [...rows].sort((a, b) => (b.asw_oz ?? 0) - (a.asw_oz ?? 0));
      return rows;
    }

    if (cabinetTray === "timeline") {
      rows = [...rows].sort((a, b) => {
        const ya = parseInt(String(a.year || "").replace(/\D/g, ""), 10) || 0;
        const yb = parseInt(String(b.year || "").replace(/\D/g, ""), 10) || 0;
        return ya - yb;
      });
      return rows;
    }

    const { key, dir } = flipSort;
    rows = [...rows].sort((a, b) => {
      if (key === "scan" || key === "newest") {
        return (scanNum(a.scan) - scanNum(b.scan)) * (key === "newest" ? -1 * Math.sign(dir || 1) : dir);
      }
      if (key === "est" || key === "value") {
        const va = a.est ?? -1, vb = b.est ?? -1;
        return (va - vb) * dir;
      }
      if (key === "asw" || key === "asw_oz") {
        const va = a.asw_oz ?? -1, vb = b.asw_oz ?? -1;
        return (va - vb) * dir;
      }
      if (key === "year") {
        const ya = parseInt(String(a.year || "").replace(/\D/g, ""), 10) || 0;
        const yb = parseInt(String(b.year || "").replace(/\D/g, ""), 10) || 0;
        return (ya - yb) * dir;
      }
      const va = String(a[key] ?? "").toLowerCase();
      const vb = String(b[key] ?? "").toLowerCase();
      return va.localeCompare(vb, undefined, { numeric: true }) * dir;
    });
    return rows;
  }

  /* ==========================================================================
     3D COVER FLOW ENGINE (Titan Reliquary Archival Carousel)
     11-node virtual sliding window (center ± 5 cards in 3D DOM)
     ========================================================================== */
  let cfCurrentIndex = 0;
  let cfIsFlipped = false;
  let cfLoupeActive = false;
  try { cfLoupeActive = localStorage.getItem("tr_loupe_v1") === "1"; } catch (_) {}
  let cfDragging = false;
  let cfStartX = 0;
  let cfDragDistance = 0;
  let cfStartTime = 0;
  let cfWheelDelta = 0;
  let cfWheelTimer = null;
  let cfItems = [];
  let cfKeyBound = false;

  /* Phones / touch: a lighter Cover Flow (5 cards, no mirrored reflection). Purely decorative parts are dropped. */
  const cfLite = () => !!(window.matchMedia && window.matchMedia("(max-width: 700px), (hover: none) and (pointer: coarse)").matches);
  function buildCoverFlowCardInner(f, isCenter) {
    const lite = cfLite();
    const obvHtml = renderMuseumSlab(f, { side: "obv" });
    const revHtml = isCenter ? renderMuseumSlab(f, { side: "rev" }) : "";
    const reflHtml = lite ? "" : renderMuseumSlab(f, { side: "obv" });

    const loupeHtml = isCenter ? `
      <div class="forensic-loupe" id="cf-loupe-${esc(f.scan)}" hidden>
        <div class="loupe-optic-zoom"></div>
        <div class="loupe-reticle-hairs">
          <div class="loupe-hair-x"></div>
          <div class="loupe-hair-y"></div>
          <div class="loupe-scale-ticks"></div>
        </div>
        <div class="loupe-bezel-rim">
          <span class="loupe-badge">10× HASTINGS TRIPLET</span>
          <span class="loupe-coords">X:0.0 Y:0.0mm</span>
        </div>
      </div>` : "";

    const caliperHtml = isCenter ? renderCaliperHud(f) : "";
    const flipBadgeHtml = isCenter ? `<button type="button" class="cf-flip-badge" title="Click to flip specimen (Space/F)">🔄 3D Flip</button>` : "";

    return `
      <div class="cf-card-inner">
        <div class="cf-face cf-face-obv">
          ${obvHtml}
          ${!isCenter ? '<div class="cf-glass-sheen"></div>' : ''}
          ${loupeHtml}
          ${caliperHtml}
          ${flipBadgeHtml}
        </div>
        ${isCenter ? `
        <div class="cf-face cf-face-rev">
          ${revHtml}
          ${loupeHtml}
          ${caliperHtml}
          ${flipBadgeHtml}
        </div>` : ''}
      </div>
      ${lite ? "" : `<div class="cf-reflection" aria-hidden="true">
        <div class="cf-card-inner">
          <div class="cf-face cf-face-obv">
            ${reflHtml}
          </div>
        </div>
      </div>`}
    `;
  }

  function updateCoverFlowTransforms(dragDeltaX = 0) {
    const container = $("#gallery-coverflow-wrap");
    if (!container) return;
    const stage = container.querySelector(".cf-stage");
    if (!stage) return;

    const cards = stage.querySelectorAll(".cf-card");
    cards.forEach((card) => {
      const offset = parseInt(card.dataset.offset, 10);
      if (isNaN(offset)) return;

      if (offset === 0) {
        const x = (dragDeltaX * 0.45).toFixed(1);
        card.style.transform = `translateX(${x}px) translateZ(0px) rotateY(0deg) scale(1)`;
        card.style.zIndex = "50";
        card.style.opacity = "1";
        card.dataset.rotateY = cfIsFlipped ? "180" : "0";
        card.classList.toggle("cf-flipped", cfIsFlipped);
        const inner = card.querySelector(".cf-card-inner");
        if (inner) inner.classList.toggle("is-flipped", cfIsFlipped);
      } else if (offset < 0) {
        card.classList.remove("cf-flipped");
        // Left flanking specimens: rotated +48 deg on Y-axis, translateZ -160px
        const baseX = -180 + (offset + 1) * 55;
        const x = (baseX + dragDeltaX * 0.45).toFixed(1);
        const scale = (1 + offset * 0.03).toFixed(3);
        card.style.transform = `translateX(${x}px) translateZ(-160px) rotateY(48deg) scale(${scale})`;
        card.style.zIndex = String(50 + offset);
        card.style.opacity = Math.max(0.18, 1 + offset * 0.12).toFixed(2);
        card.dataset.rotateY = "48";
        card.dataset.translateZ = "-160";
      } else {
        card.classList.remove("cf-flipped");
        // Right flanking specimens: rotated -48 deg on Y-axis, translateZ -160px
        const baseX = 180 + (offset - 1) * 55;
        const x = (baseX + dragDeltaX * 0.45).toFixed(1);
        const scale = (1 - offset * 0.03).toFixed(3);
        card.style.transform = `translateX(${x}px) translateZ(-160px) rotateY(-48deg) scale(${scale})`;
        card.style.zIndex = String(50 - offset);
        card.style.opacity = Math.max(0.18, 1 - offset * 0.12).toFixed(2);
        card.dataset.rotateY = "-48";
        card.dataset.translateZ = "-160";
      }
    });
  }

  function updateCoverFlowControls() {
    const rows = cfItems || filteredFlips();
    const scrubber = $("#cf-scrubber");
    if (scrubber) {
      scrubber.max = String(Math.max(0, rows.length - 1));
      scrubber.value = String(cfCurrentIndex);
    }
    const counter = $("#cf-counter");
    if (counter) {
      counter.textContent = `${rows.length ? cfCurrentIndex + 1 : 0} of ${rows.length}`;
    }
    const placard = $("#cf-placard");
    if (placard && rows[cfCurrentIndex]) {
      const f = rows[cfCurrentIndex];
      const denom = esc(f.denom || f.label || "Coin");
      const agBadge = f.is_silver ? `<span class="pc-ag-pill">Ag ${f.asw_oz != null ? num(f.asw_oz, 2) + "oz" : ".999"}</span>` : "";
      const spotAg = vault.precious?.spot_ag ?? vault.metals?.spot?.ag_usd_oz;
      const meltText = f.is_silver && f.asw_oz != null && spotAg != null
        ? `Melt ${money(Number(f.asw_oz) * Number(spotAg))}`
        : (f.conf ? `Conf ${esc(f.conf)}` : "Verified");

      placard.innerHTML = `
        <div class="cf-placard-info">
          <div class="cf-placard-title">
            <span>${esc(f.ser || f.scan)} · ${esc(f.country || "—")} ${esc(f.year || "—")}</span>
            ${agBadge}
          </div>
          <div class="cf-placard-meta">
            <span>${denom}</span>
            <span>·</span>
            <span>${meltText}</span>
          </div>
        </div>
        <div class="cf-placard-metrics">
          <span class="cf-placard-price">${f.est != null ? money(f.est) : "—"}</span>
          <button type="button" class="btn small" id="cf-btn-dossier" style="border-color:rgba(200,169,74,0.4)">Inspect Dossier →</button>
        </div>
      `;

      placard.querySelector("#cf-btn-dossier")?.addEventListener("click", () => {
        dossierCtx = { label: "Cover Flow", scans: rows.map(x => x.scan) };
        openDrawer(f.scan);
      });
    }

    $("#cf-btn-flip")?.classList.toggle("active", cfIsFlipped);
    $("#cf-btn-loupe")?.classList.toggle("active", cfLoupeActive);
    $("#cf-btn-caliper")?.classList.toggle("active", caliperActive);
  }

  function toggleCoverFlowFlip() {
    cfIsFlipped = !cfIsFlipped;
    updateCoverFlowTransforms();
    updateCoverFlowControls();
    playCoinChime();
  }

  function toggleCoverFlowLoupe() {
    cfLoupeActive = !cfLoupeActive;
    try { localStorage.setItem("tr_loupe_v1", cfLoupeActive ? "1" : "0"); } catch (_) {}
    updateCoverFlowControls();
    if (!cfLoupeActive) {
      $$(".cf-card .forensic-loupe").forEach(l => l.hidden = true);
    }
    playStapleClick();
    showToast(cfLoupeActive ? "🔬 10× Macro Loupe Active: Hover over coin aperture" : "10× Macro Loupe Hidden");
  }

  function toggleCoverFlowCaliper() {
    caliperActive = !caliperActive;
    try { localStorage.setItem("tr_caliper_v1", caliperActive ? "1" : "0"); } catch (_) {}
    updateCoverFlowControls();
    $$(".ex-caliper-hud").forEach(h => h.classList.toggle("active", caliperActive));
    $$(".ex-optical-reticle").forEach(r => r.classList.toggle("active", caliperActive));
    playStapleClick();
    showToast(caliperActive ? "📏 Caliper Active: 1:1 Scale & Die Analyzer" : "Caliper Reticle Hidden");
  }

  function renderCoverFlow(targetIndex) {
    const container = $("#gallery-coverflow-wrap");
    if (!container) return;
    const stage = container.querySelector(".cf-stage");
    if (!stage) return;

    const rows = filteredFlips();
    cfItems = rows;
    if (!rows || rows.length === 0) {
      stage.innerHTML = `<p class="empty" style="color:#94a3b8;padding:2rem 0">No specimens match current criteria</p>`;
      const placard = $("#cf-placard");
      if (placard) placard.innerHTML = `<span style="color:#94a3b8">No specimens</span>`;
      const counter = $("#cf-counter");
      if (counter) counter.textContent = `0 of 0`;
      return;
    }

    if (targetIndex != null) {
      const clamped = Math.max(0, Math.min(rows.length - 1, targetIndex));
      if (clamped !== cfCurrentIndex) {
        cfIsFlipped = false;
      }
      cfCurrentIndex = clamped;
    } else {
      cfCurrentIndex = Math.max(0, Math.min(rows.length - 1, cfCurrentIndex));
    }

    // virtual sliding window: d from -5 to +5 (-2 to +2 on phones, where the rest is off-screen)
    const needed = [];
    const span = cfLite() ? 2 : 5;
    for (let d = -span; d <= span; d++) {
      const idx = cfCurrentIndex + d;
      if (idx >= 0 && idx < rows.length) {
        needed.push({ index: idx, offset: d, flip: rows[idx] });
      }
    }

    // Map existing card DOM nodes by their index
    const existingMap = new Map();
    stage.querySelectorAll(".cf-card").forEach((card) => {
      const idx = parseInt(card.dataset.index, 10);
      existingMap.set(idx, card);
    });

    // Remove nodes that are no longer in the window
    // (a node is also stale when the list changed under it: same index, different coin)
    existingMap.forEach((card, idx) => {
      const want = needed.find((n) => n.index === idx);
      if (!want || want.flip.scan !== card.dataset.scan) {
        card.remove();
        existingMap.delete(idx);
      }
    });

    // Create or update nodes in the sliding window
    needed.forEach(({ index, offset, flip }) => {
      let card = existingMap.get(index);
      const isCenter = offset === 0;

      if (!card) {
        card = document.createElement("div");
        card.className = "cf-card";
        card.dataset.index = String(index);
        card.dataset.scan = flip.scan;
        card.innerHTML = buildCoverFlowCardInner(flip, isCenter);
        stage.appendChild(card);

        // Flank click handler: clicking any flanking slab smoothly glides it to center
        card.addEventListener("click", (e) => {
          if (cfDragging) return;
          const curOffset = parseInt(card.dataset.offset, 10);
          if (curOffset !== 0) {
            e.stopPropagation();
            renderCoverFlow(index);
            playStapleClick();
          } else {
            if (!e.target.closest("a, button:not(.cf-flip-badge)")) {
              e.stopPropagation();
              toggleCoverFlowFlip();
            }
          }
        });
      } else {
        const wasCenter = card.classList.contains("cf-card-center");
        if (isCenter !== wasCenter) {
          card.innerHTML = buildCoverFlowCardInner(flip, isCenter);
        }
      }

      card.dataset.offset = String(offset);
      card.classList.toggle("cf-card-center", isCenter);
      card.classList.toggle("cf-card-flank", !isCenter);
      card.classList.toggle("cf-card-left", offset < 0);
      card.classList.toggle("cf-card-right", offset > 0);
    });

    updateCoverFlowTransforms();
    updateCoverFlowControls();
    lazyThumbs(container);
  }

  function handleCoverFlowKey(e) {
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const galleryPane = $("#pane-gallery");
    if (!galleryPane || !galleryPane.classList.contains("active")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Only steer the carousel when focus is on the page itself or inside the carousel;
    // a focused button, chip or card keeps Space / arrows for itself.
    const fa = document.activeElement;
    if (fa && fa !== document.body && !fa.closest("#gallery-coverflow-wrap")) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      renderCoverFlow(cfCurrentIndex - 1);
      playStapleClick();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      renderCoverFlow(cfCurrentIndex + 1);
      playStapleClick();
    } else if (e.key === " " || e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleCoverFlowFlip();
    } else if (e.key === "Home") {
      e.preventDefault();
      renderCoverFlow(0);
    } else if (e.key === "End") {
      e.preventDefault();
      renderCoverFlow(cfItems.length - 1);
    }
  }

  function setupCoverFlowEvents() {
    const container = $("#gallery-coverflow-wrap");
    if (!container) return;
    const viewport = container.querySelector(".cf-viewport");
    const stage = container.querySelector(".cf-stage");

    $("#cf-btn-prev")?.addEventListener("click", () => {
      renderCoverFlow(cfCurrentIndex - 1);
      playStapleClick();
    });

    $("#cf-btn-next")?.addEventListener("click", () => {
      renderCoverFlow(cfCurrentIndex + 1);
      playStapleClick();
    });

    $("#cf-btn-flip")?.addEventListener("click", toggleCoverFlowFlip);
    $("#cf-btn-loupe")?.addEventListener("click", toggleCoverFlowLoupe);
    $("#cf-btn-caliper")?.addEventListener("click", toggleCoverFlowCaliper);
    $("#cf-btn-spatial")?.addEventListener("click", () => {
      const rows = filteredFlips();
      const current = rows[cfCurrentIndex] || rows[0];
      if (window.TitanSpatial && current) {
        window.TitanSpatial.open(current, galleryMode === "planchet" ? "planchet" : (galleryMode === "flips" ? "flip" : "slab"));
      }
    });

    $("#cf-btn-deepzoom")?.addEventListener("click", () => {
      const rows = filteredFlips();
      const current = rows[cfCurrentIndex] || rows[0];
      if (window.TitanDeepZoom && current) {
        window.TitanDeepZoom.open(current, cfIsFlipped ? "rev" : "obv");
      }
    });

    const scrubber = $("#cf-scrubber");
    if (scrubber) {
      scrubber.addEventListener("input", (e) => {
        renderCoverFlow(parseInt(e.target.value, 10));
      });
      scrubber.addEventListener("change", () => playStapleClick());
    }

    if (viewport) {
      viewport.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return; // primary click only
        if (e.target.closest("button, .cf-flip-badge, .btn, a, input, select")) return;
        cfDragging = true;
        cfStartX = e.clientX;
        cfDragDistance = 0;
        cfStartTime = performance.now();
        viewport.classList.add("is-dragging");
        try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
      });

      viewport.addEventListener("click", (e) => {
        const flipBtn = e.target.closest(".cf-flip-badge");
        if (flipBtn) {
          e.stopPropagation();
          e.preventDefault();
          toggleCoverFlowFlip();
          return;
        }
      });

      viewport.addEventListener("pointermove", (e) => {
        if (!cfDragging) {
          // Pointer-driven 3D tilt & sheen tracking on center card
          const centerCard = stage.querySelector(".cf-card-center");
          if (centerCard && !cfLoupeActive && !caliperActive) {
            const cardRect = centerCard.getBoundingClientRect();
            const nx = (e.clientX - (cardRect.left + cardRect.width / 2)) / (cardRect.width / 2);
            const ny = (e.clientY - (cardRect.top + cardRect.height / 2)) / (cardRect.height / 2);
            if (nx >= -1.2 && nx <= 1.2 && ny >= -1.2 && ny <= 1.2) {
              const clampedX = Math.max(-1, Math.min(1, nx));
              const clampedY = Math.max(-1, Math.min(1, ny));
              const tiltX = (-clampedY * 14).toFixed(1);
              const tiltY = (clampedX * 18).toFixed(1);
              const effTiltY = cfIsFlipped ? -Number(tiltY) : Number(tiltY);
              const baseRot = cfIsFlipped ? 180 : 0;
              centerCard.style.transform = `translateX(0px) translateZ(28px) rotateY(${baseRot + effTiltY}deg) rotateX(${tiltX}deg)`;
              const sheenX = ((clampedX + 1) / 2 * 100).toFixed(1);
              const sheenY = ((clampedY + 1) / 2 * 100).toFixed(1);
              centerCard.style.setProperty("--cf-sheen-x", `${sheenX}%`);
              centerCard.style.setProperty("--cf-sheen-y", `${sheenY}%`);
            }
          }
          return;
        }
        const dx = e.clientX - cfStartX;
        cfDragDistance += Math.abs(e.movementX || dx);
        updateCoverFlowTransforms(dx);
      });

      viewport.addEventListener("pointerleave", () => {
        const centerCard = stage.querySelector(".cf-card-center");
        if (centerCard && !cfDragging) {
          const baseRot = cfIsFlipped ? 180 : 0;
          centerCard.style.transform = `translateX(0px) translateZ(0px) rotateY(${baseRot}deg) rotateX(0deg)`;
        }
      });

      const endDrag = (e) => {
        if (!cfDragging) return;
        cfDragging = false;
        viewport.classList.remove("is-dragging");
        try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}

        const dx = e.clientX - cfStartX;
        const dt = performance.now() - cfStartTime;
        const velocity = dx / Math.max(1, dt);

        if (Math.abs(dx) > 35 || Math.abs(velocity) > 0.4) {
          const dir = (velocity < -0.3 || dx < -35) ? 1 : -1;
          renderCoverFlow(cfCurrentIndex + dir);
          playStapleClick();
        } else {
          updateCoverFlowTransforms(0);
        }
      };

      viewport.addEventListener("pointerup", endDrag);
      viewport.addEventListener("pointercancel", endDrag);

      // Wheel scroll: only intercept horizontal swipes or Shift+wheel, letting normal page scrolling pass through
      viewport.addEventListener("wheel", (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
          e.preventDefault();
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          cfWheelDelta += delta;
          if (cfWheelTimer) clearTimeout(cfWheelTimer);
          if (Math.abs(cfWheelDelta) >= 30) {
            const dir = cfWheelDelta > 0 ? 1 : -1;
            cfWheelDelta = 0;
            renderCoverFlow(cfCurrentIndex + dir);
            playStapleClick();
          }
          cfWheelTimer = setTimeout(() => { cfWheelDelta = 0; }, 200);
        }
      }, { passive: false });
    }

    // 10x Macro Loupe tracking on center coin
    if (stage) {
      stage.addEventListener("mousemove", (e) => {
        if (!cfLoupeActive) return;
        const centerCard = stage.querySelector(".cf-card-center");
        if (!centerCard) return;
        const aperture = centerCard.querySelector(".slab-coin-aperture, .matrix-medallion-holder, .flip-coin-aperture, .flip-window");
        const loupe = centerCard.querySelector(".forensic-loupe");
        if (!aperture || !loupe) return;

        const apRect = aperture.getBoundingClientRect();
        if (
          e.clientX >= apRect.left && e.clientX <= apRect.right &&
          e.clientY >= apRect.top && e.clientY <= apRect.bottom
        ) {
          loupe.hidden = false;
          const cardRect = centerCard.getBoundingClientRect();
          loupe.style.left = (e.clientX - cardRect.left) + "px";
          loupe.style.top = (e.clientY - cardRect.top) + "px";

          const zoomTarget = loupe.querySelector(".loupe-optic-zoom");
          const isRev = cfIsFlipped;
          const activeImg = centerCard.querySelector(isRev ? ".cf-face-rev .slab-coin-img, .cf-face-rev img" : ".cf-face-obv .slab-coin-img, .cf-face-obv img");
          const activeSvg = centerCard.querySelector(isRev ? ".cf-face-rev svg" : ".cf-face-obv svg");
          const imgSrc = activeImg?.currentSrc || activeImg?.src || activeImg?.dataset?.src;

          if (zoomTarget) {
            const zoom = 2.8;
            const apX = e.clientX - apRect.left;
            const apY = e.clientY - apRect.top;
            const bgX = -(apX * zoom - 75);
            const bgY = -(apY * zoom - 75);
            if (imgSrc) {
              zoomTarget.style.backgroundImage = `url("${imgSrc}")`;
              zoomTarget.style.backgroundPosition = `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
              zoomTarget.style.backgroundSize = `${(apRect.width * zoom).toFixed(1)}px ${(apRect.height * zoom).toFixed(1)}px`;
            } else if (activeSvg) {
              const svgXml = new XMLSerializer().serializeToString(activeSvg);
              const svgData = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgXml);
              zoomTarget.style.backgroundImage = `url("${svgData}")`;
              zoomTarget.style.backgroundPosition = `${bgX.toFixed(1)}px ${bgY.toFixed(1)}px`;
              zoomTarget.style.backgroundSize = `${(apRect.width * zoom).toFixed(1)}px ${(apRect.height * zoom).toFixed(1)}px`;
            }
          }

          const coordsEl = loupe.querySelector(".loupe-coords");
          if (coordsEl) {
            const midX = apRect.width / 2;
            const midY = apRect.height / 2;
            const rawX = ((e.clientX - apRect.left - midX) / midX) * 12.5;
            const rawY = ((e.clientY - apRect.top - midY) / midY) * -12.5;
            const signX = rawX > 0.04 ? "+" : (rawX < -0.04 ? "-" : "+");
            const signY = rawY > 0.04 ? "+" : (rawY < -0.04 ? "-" : "+");
            coordsEl.textContent = `X:${signX}${Math.abs(rawX).toFixed(1)} Y:${signY}${Math.abs(rawY).toFixed(1)}mm`;
          }
        } else {
          loupe.hidden = true;
        }
      });

      stage.addEventListener("mouseleave", () => {
        const loupe = stage.querySelector(".forensic-loupe");
        if (loupe) loupe.hidden = true;
      });
    }

    if (!cfKeyBound) {
      window.addEventListener("keydown", handleCoverFlowKey);
      cfKeyBound = true;
    }
  }

  // Expose on window for test verification & CDP automation
  window.renderCoverFlow = renderCoverFlow;
  window.updateCoverFlowTransforms = updateCoverFlowTransforms;
  window.getCoverFlowIndex = () => cfCurrentIndex;
  window.getCoverFlowFlipped = () => cfIsFlipped;
  window.toggleCoverFlowFlip = toggleCoverFlowFlip;

  /** Markup of the Cover Flow shell (header actions, stage, placard, scrubber). Shared by the classic
      renderGallery and the Gallery Finder (wings/gallery.js). Events are bound by setupCoverFlowEvents(). */
  function coverFlowShellHtml(rows) {
    return `
      <div class="gallery-coverflow-wrap" id="gallery-coverflow-wrap" aria-label="3D Cover Flow Archival Carousel">
        <div class="cf-crest-watermark" aria-hidden="true"><svg class="crest-svg" viewBox="0 0 200 200"><use href="#crest-${currentAtmo()}"></use></svg></div>
        <div class="cf-header">
          <div class="cf-header-left">
            <span class="eyebrow"><span class="exhibit-lamp" aria-hidden="true"></span>Archival Carousel · 3D Cover Flow</span>
            <h3 class="cf-title">Specimen Showcase</h3>
          </div>
          <div class="cf-header-actions">
            <button type="button" class="btn small${cfIsFlipped ? ' active' : ''}" id="cf-btn-flip" title="3D Flip Obverse / Reverse (Space or F)">🔄 3D Flip</button>
            <button type="button" class="btn small${cfLoupeActive ? ' active' : ''}" id="cf-btn-loupe" title="Toggle 10× Macro Jeweler's Loupe">🔬 10× Loupe</button>
            <button type="button" class="btn small${caliperActive ? ' active' : ''}" id="cf-btn-caliper" title="Toggle Digital Numismatic Calipers">📏 Calipers</button>
            <button type="button" class="btn small" id="cf-btn-spatial" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gold)" title="Inspect on 3D Spatial Museum Table (WebXR / Three.js)">🏛️ 3D Museum Room</button>
            <button type="button" class="btn small" id="cf-btn-deepzoom" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gold)" title="Inspect on 40× Gigapixel Forensic Variety Station">🔬 40× Forensic</button>
          </div>
        </div>
        <div class="cf-viewport" id="cf-viewport" tabindex="0" aria-label="Cover Flow 3D Stage (Use Arrow Keys, Drag, or Scroll)">
          <div class="cf-stage"></div>
        </div>
        <div class="cf-placard" id="cf-placard"></div>
        <div class="cf-controls">
          <button type="button" class="cf-nav-btn cf-prev" id="cf-btn-prev" aria-label="Previous Specimen" title="Previous (←)">‹</button>
          <div class="cf-scrubber-wrap">
            <input type="range" class="cf-scrubber" id="cf-scrubber" min="0" max="${Math.max(0, rows.length - 1)}" value="${cfCurrentIndex}" aria-label="Cover Flow Scrubber" />
          </div>
          <button type="button" class="cf-nav-btn cf-next" id="cf-btn-next" aria-label="Next Specimen" title="Next (→)">›</button>
          <span class="cf-counter" id="cf-counter">${rows.length ? cfCurrentIndex + 1 : 0} of ${rows.length}</span>
        </div>
      </div>`;
  }

  /* Bridge for wings/gallery.js (Finder, faceted wall, palette v2, dossier v2). That file fills in
     render / filtered / palette / dossier; while they are absent, or after one throws (broken = true),
     the classic code in this file runs unchanged. */
  window.__galleryBridge = {
    v: 1,
    broken: false, paletteBroken: false, dossierBroken: false,
    get vault() { return vault; },
    get filter() { return flipFilter; }, set filter(v) { flipFilter = v; },
    get sort() { return flipSort; }, set sort(v) { flipSort = v; },
    get tray() { return cabinetTray; }, set tray(v) { cabinetTray = v; },
    get mode() { return galleryMode; }, set mode(v) { galleryMode = v; },
    get restoring() { return restoring; },
    get searchIdx() { return searchIdx; },
    get details() { return details; },
    get highlight() { return highlightScans; },
    get caliperActive() { return caliperActive; },
    get cfIndex() { return cfCurrentIndex; },
    get cfItems() { return cfItems; },
    get dossierScan() { return currentDrawerScan; },
    esc: (s) => esc(s), money: (n) => money(n), num: (...a) => num(...a), intFmt: (n) => intFmt(n), norm: (s) => norm(s),
    scanNum: (s) => scanNum(s), isoName: (i) => isoName(i), has: (v) => has(v),
    fetchJson: (u) => fetchJson(u), ensureSearch: () => ensureSearch(), ensureDetail: (s) => ensureDetail(s),
    flipQueryMatch: (f, q) => flipQueryMatch(f, q), yearMatches: (f, y) => yearMatches(f, y), isAwaitingPhase2: (f) => isAwaitingPhase2(f),
    renderMuseumSlab: (f, o) => renderMuseumSlab(f, o), coverFlowShellHtml: (r) => coverFlowShellHtml(r),
    setupCoverFlowEvents: () => setupCoverFlowEvents(), renderCoverFlow: (i) => renderCoverFlow(i),
    lazyThumbs: (r) => lazyThumbs(r), observeReveals: (r) => observeReveals(r),
    saveState: () => saveState(), markTyping: () => markTyping(), playStapleClick: () => playStapleClick(),
    showToast: (m) => showToast(m), setWing: (n, p) => setWing(n, p), findCard: (s) => findCard(s),
    photoOf: (c, r) => photoOf(c, r), photoSlot: (c, r) => photoSlot(c, r), meltLive: (f) => meltLive(f), aswFmt: (o) => aswFmt(o),
    getSpecimenDiameterSource: (f) => getSpecimenDiameterSource(f),
    openDrawer: (scan, ctx) => { dossierCtx = ctx || null; return openDrawer(scan); },
    openAtmoSheet: () => openAtmoSheet(), openKeysSheet: () => openKeysSheet(),
    launchSpatial: () => launchSpatialTable(),
    closePalette: () => closePalette(),
    render: null, filtered: null, palette: null, dossier: null,
  };

  let galleryScrollListener = null;
  let galleryRows = [];
  let galleryResizeListener = null;

  function renderGallery() {
    if (!vault || !vault.flips) return;
    const gb = window.__galleryBridge;
    if (gb && gb.render && !gb.broken) {
      try { if (gb.render() !== false) return; } catch (e) { gb.broken = true; console.warn("Gallery finder failed; using the classic gallery.", e); }
    }
    galleryRendered = true;
    if (galleryScrollListener) {
      window.removeEventListener("scroll", galleryScrollListener);
      galleryScrollListener = null;
    }
    if (galleryResizeListener) {
      window.removeEventListener("resize", galleryResizeListener);
      galleryResizeListener = null;
    }
    // Re-rendering replaces the inputs: keep focus + caret so typing is not interrupted.
    const act = document.activeElement;
    const keep = act && ["flip-q", "flip-year"].includes(act.id) ? { id: act.id, s: act.selectionStart, e: act.selectionEnd } : null;
    const countries = flipCountries();
    const rows = filteredFlips();
    const agCount = (vault.flips || []).filter((f) => f.is_silver).length;
    const p2Count = (vault.flips || []).filter(isAwaitingPhase2).length;
    const opts = countries
      .map(([c, n]) => `<option value="${esc(c)}" ${flipFilter.country === c ? "selected" : ""}>${esc(c)} (${n})</option>`)
      .join("");
    const sortVal =
      flipSort.key === "ser" ? "ser"
      : flipSort.key === "scan" && flipSort.dir === -1 ? "newest"
      : flipSort.key === "year" ? "year"
      : flipSort.key === "country" ? "country"
      : flipSort.key === "est" || flipSort.key === "value" ? "value"
      : flipSort.key === "asw_oz" || flipSort.key === "asw" ? "asw"
      : "newest";

    const strip = countries
      .map(([c, n]) => {
        const active = flipFilter.country === c ? " active" : "";
        return `<button type="button" class="country-chip${active}" data-country="${esc(c)}">${esc(c)}<strong>${n}</strong></button>`;
      })
      .join("");

    // Fresh-metal rail only when the visitor isn't filtering and on master inventory tray
    const filtering = flipFilter.staging || flipFilter.q.trim() || flipFilter.country || flipFilter.iso || flipFilter.year || flipFilter.silverOnly || flipFilter.phase2;
    let railHtml = "";
    if (!filtering && cabinetTray === "all") {
      const latest = latestFlips(10);
      const cards = latest.map((f) => {
        const neo = highlightScans.has(f.scan) ? " is-new" : "";
        const slabVisual = renderMuseumSlab(f, { side: "obv" });
        return `
        <button type="button" class="latest-card piece-card-3d reveal${neo}" data-scan="${esc(f.scan)}" aria-label="${esc((f.ser || f.scan) + " " + [f.country, f.year].filter(Boolean).join(" "))}">
          ${slabVisual}
        </button>`;
      }).join("");
      railHtml = `
        <div class="sec-head reveal"><span class="eyebrow">Fresh metal</span><h2>Latest adds</h2><button type="button" class="btn small" id="go-lab">Shooting list →</button></div>
        <div class="latest-rail" aria-label="Latest added flips">${cards || '<p class="empty">No flips yet</p>'}</div>`;
    }

    // The wall: 100% uniform 3D Lucite Museum Slabs
    function buildPieceCardHtml(f) {
      const neo = highlightScans.has(f.scan) ? " is-new" : "";
      const obvVisual = renderMuseumSlab(f, { side: "obv" });
      const revVisual = renderMuseumSlab(f, { side: "rev" });

      return `
      <div class="piece-card piece-card-3d reveal${neo} mode-${galleryMode}" role="button" tabindex="0" data-scan="${esc(f.scan)}" aria-label="${esc((f.ser || f.scan) + " " + [f.country, f.year].filter(Boolean).join(" "))}">
        <div class="pc-flip-frame">
          <div class="pc-3d-flipper-stage" data-flipper-scan="${esc(f.scan)}">
            <div class="pc-3d-flipper">
              <div class="pc-side pc-side-obv">
                ${obvVisual}
                <button type="button" class="cf-flip-badge pc-flip-action-btn" title="Click to flip (Space/F)">🔄 3D Flip</button>
              </div>
              <div class="pc-side pc-side-rev">
                ${revVisual}
                <button type="button" class="cf-flip-badge pc-flip-action-btn" title="Click to flip (Space/F)">🔄 3D Flip</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }

    const BATCH_SIZE = 28;
    let galleryLimit = BATCH_SIZE;
    const initialWall = rows.slice(0, galleryLimit).map(buildPieceCardHtml).join("");
    const hasMore = rows.length > galleryLimit;
    const sentinelHtml = hasMore ? `
      <div id="gallery-infinite-sentinel" class="gallery-infinite-sentinel">
        <button type="button" class="gallery-load-more-btn" id="btn-gallery-load-more">
          Show More Coins (${rows.length - galleryLimit} remaining)
        </button>
      </div>` : "";

    const flipYears = (vault.flips || []).map(f => parseInt(f.year, 10)).filter(y => !isNaN(y) && y > 1000 && y < 2100);
    const minFlipY = flipYears.length ? Math.min(...flipYears) : 1883;
    const maxFlipY = flipYears.length ? Math.max(...flipYears) : 2017;
    const timelineSpan = `${minFlipY}–${maxFlipY}`;

    const trayNavHtml = `
      <div class="cabinet-trays-nav reveal" role="tablist" aria-label="Cabinet Trays">
        <button type="button" class="tray-tab${cabinetTray === 'all' ? ' active' : ''}" data-tray="all">
          <span class="tray-ico">🗄️</span>
          <span class="tray-text">Master Inventory</span>
          <span class="tray-count">${intFmt((vault.flips || []).length)}</span>
        </button>
        <button type="button" class="tray-tab${cabinetTray === 'crown' ? ' active' : ''}" data-tray="crown">
          <span class="tray-ico">👑</span>
          <span class="tray-text">Crown Jewels</span>
          <span class="tray-count">Top 12</span>
        </button>
        <button type="button" class="tray-tab${cabinetTray === 'silver' ? ' active' : ''}" data-tray="silver">
          <span class="tray-ico">🥈</span>
          <span class="tray-text">Silver Reserves</span>
          <span class="tray-count">${agCount} Flips</span>
        </button>
        <button type="button" class="tray-tab${cabinetTray === 'timeline' ? ' active' : ''}" data-tray="timeline">
          <span class="tray-ico">⏳</span>
          <span class="tray-text">Timeline</span>
          <span class="tray-count">${timelineSpan}</span>
        </button>
      </div>`;

    const subTitle = galleryMode === 'slab'
      ? 'Archival Lucite Acrylic Slabs · Holographic Pedigree Standards'
      : (galleryMode === 'matrix' ? 'Struck Planchet Medallions · Ambient Directional Lighting' : 'Authentic 2×2 Archival Flips · Specimen Blueprints');

    const coverFlowHtml = coverFlowShellHtml(rows);

    $("#gallery-body").innerHTML = `
      ${trayNavHtml}
      ${railHtml}
      ${coverFlowHtml}
      <div class="sec-head reveal">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:0.75rem;width:100%">
          <div>
            <span class="eyebrow">The Cabinet</span>
            <h2>${cabinetTray === 'crown' ? 'The Crown Jewels' : (cabinetTray === 'silver' ? 'Silver Reserves (By ASW Weight)' : (cabinetTray === 'timeline' ? 'Century Timeline (Chronological)' : 'On the Wall'))}</h2>
            <p class="sub">${subTitle}</p>
          </div>
          <div class="gallery-mode-switch" role="radiogroup" aria-label="Specimen presentation mode">
            <button type="button" class="g-mode-btn${galleryMode === 'slab' ? ' active' : ''}" data-gmode="slab" title="Archival Lucite Museum Slabs (Optical Acrylic Encapsulation)">🏛️ Slabs</button>
            <button type="button" class="g-mode-btn${galleryMode === 'flip' ? ' active' : ''}" data-gmode="flip" title="Aero Frosted 2×2 Mounts (Precision Silicone Gasket)">🏷️ 2×2 Aero Flips</button>
            <button type="button" class="g-mode-btn${galleryMode === 'matrix' ? ' active' : ''}" data-gmode="matrix" title="Pure Struck Coin Planchets (Unencumbered)">✨ Planchets</button>
          </div>
        </div>
      </div>
      <div class="toolbar">
        <span class="search-wrap"><input type="search" id="flip-q" placeholder="Search SER · C### · country · year · denom · notes…" value="${esc(flipFilter.q)}" autocomplete="off" /><kbd title="Ctrl/⌘K opens search">⌘K</kbd></span>
        <select id="flip-country"><option value="">All countries</option>${opts}</select>
        <input type="text" id="flip-year" placeholder="Year" value="${esc(flipFilter.year)}" style="flex:0 1 88px" inputmode="numeric" />
        <select id="flip-sort" title="Sort">
          <option value="newest" ${sortVal === "newest" ? "selected" : ""}>Newest</option>
          <option value="ser" ${sortVal === "ser" ? "selected" : ""}>SER</option>
          <option value="year" ${sortVal === "year" ? "selected" : ""}>Year</option>
          <option value="country" ${sortVal === "country" ? "selected" : ""}>Country</option>
          <option value="value" ${sortVal === "value" ? "selected" : ""}>Value</option>
          <option value="asw" ${sortVal === "asw" ? "selected" : ""}>ASW</option>
        </select>
        <button type="button" class="btn filter-ag${flipFilter.silverOnly ? " active" : ""}" id="flip-ag" title="Show silver flips only">Ag${agCount ? " · " + agCount : ""}</button>
        <button type="button" class="btn filter-p2${flipFilter.phase2 ? " active" : ""}" id="flip-p2" title="Awaiting Phase 2 photos (shooting list)">Awaiting Phase 2 · ${intFmt(p2Count)}</button>
        ${flipFilter.staging ? `<button type="button" class="btn small active" id="flip-staging-clear" style="background:var(--gold);color:#08090c;font-weight:700" title="Clear Staging Filter">📸 Phase 2 Staging (5) ×</button>` : ""}
        ${flipFilter.iso ? `<button type="button" class="btn small active" id="flip-iso" title="Clear the country filter from World">${esc(isoName(flipFilter.iso))} ×</button>` : ""}
        ${flipFilter.country ? `<button type="button" class="btn small active" id="flip-country-clear" title="Clear country filter">${esc(flipFilter.country)} ×</button>` : ""}
        ${(flipFilter.iso || flipFilter.country) ? `<button type="button" class="btn small" id="flip-return-atlas" style="border:1px solid var(--gold);color:var(--gold-soft);background:rgba(200,169,74,0.12);font-weight:600" title="Return to World Map in Study Wing">🌐 ← Return to Map</button>` : ""}
        <button type="button" class="btn small" id="flip-print" title="Print this inventory">⎙ Print</button>
        <span class="meta">${intFmt(rows.length)} / ${intFmt((vault.flips || []).length)}${flipFilter.staging ? " · 📸 staging album" : ""}${flipFilter.silverOnly ? " · silver" : ""}${flipFilter.phase2 ? " · shooting list" : ""}${flipFilter.q.trim() && !searchIdx ? " · searching notes…" : ""}</span>
      </div>
      <div class="country-strip">${strip}</div>
      <div class="gallery-grid" id="main-gallery-grid">${initialWall || '<p class="empty">No matches</p>'}</div>
      ${sentinelHtml}
    `;

    // Infinite Scroll IntersectionObserver + Active Window Scroll Fallback
    let activeLimit = galleryLimit;
    let observer = null;
    let scrollRaf = null;

    function appendCards() {
      if (activeLimit >= rows.length) return;
      const grid = $("#main-gallery-grid");
      if (!grid) return;

      const nextBatch = rows.slice(activeLimit, activeLimit + BATCH_SIZE);
      activeLimit += nextBatch.length;

      const frag = document.createDocumentFragment();
      const tempWrap = document.createElement("div");
      tempWrap.innerHTML = nextBatch.map(buildPieceCardHtml).join("");
      while (tempWrap.firstChild) {
        frag.appendChild(tempWrap.firstChild);
      }
      grid.appendChild(frag);

      lazyThumbs(grid);
      observeReveals(grid);
      bindCardHover(grid);

      const remaining = rows.length - activeLimit;
      const btn = $("#btn-gallery-load-more");
      if (remaining <= 0) {
        if (observer) { observer.disconnect(); observer = null; }
        $("#gallery-infinite-sentinel")?.remove();
        if (galleryScrollListener) {
          window.removeEventListener("scroll", galleryScrollListener);
          galleryScrollListener = null;
        }
        if (galleryResizeListener) {
          window.removeEventListener("resize", galleryResizeListener);
          galleryResizeListener = null;
        }
      } else {
        if (btn) {
          btn.textContent = `Show More Coins (${remaining} remaining)`;
        }
        scheduleScrollCheck();
      }
    }

    function checkGalleryScroll() {
      const pane = $("#pane-gallery");
      if (!pane || !pane.classList.contains("active")) return;
      const sentinel = $("#gallery-infinite-sentinel");
      if (!sentinel) return;

      const rect = sentinel.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 900;
      if (rect.top <= vh + 1000) {
        appendCards();
      }
    }

    function scheduleScrollCheck() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        checkGalleryScroll();
      });
    }

    const sentinelEl = $("#gallery-infinite-sentinel");
    if (sentinelEl && "IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          appendCards();
        }
      }, { root: null, rootMargin: "1000px" });
      observer.observe(sentinelEl);
    }

    galleryScrollListener = scheduleScrollCheck;
    galleryResizeListener = scheduleScrollCheck;
    window.addEventListener("scroll", galleryScrollListener, { passive: true });
    window.addEventListener("resize", galleryResizeListener, { passive: true });
    $("#btn-gallery-load-more")?.addEventListener("click", appendCards);

    // Initial check in case tall viewport or zoom already exposes sentinel
    scheduleScrollCheck();

    // Hook up Display Mode Switcher
    $$(".g-mode-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        galleryMode = btn.dataset.gmode;
        try { localStorage.setItem("tr_gallery_mode_v1", galleryMode); } catch (_) {}
        renderGallery();
        lazyThumbs($("#gallery-body"));
        playStapleClick();
      };
    });

    // Hook up Cabinet Tray Tabs
    $$(".tray-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        cabinetTray = tab.dataset.tray;
        renderGallery();
        saveState();
      });
    });

    const qEl = $("#flip-q");
    qEl.addEventListener("input", (e) => {
      markTyping();
      flipFilter.q = e.target.value;
      ensureSearch();
      if (!restoring) { renderGallery(); saveState(); }
    });
    qEl.addEventListener("focus", () => { markTyping(); ensureSearch(); });
    $("#go-lab")?.addEventListener("click", () => { setWing("lab"); window.scrollTo(0, 0); });
    $("#flip-iso")?.addEventListener("click", () => { flipFilter.iso = ""; renderGallery(); saveState(); });
    $("#flip-country-clear")?.addEventListener("click", () => { flipFilter.country = ""; renderGallery(); saveState(); });
    $("#flip-return-atlas")?.addEventListener("click", () => {
      setWing("study");
      window.scrollTo(0, 0);
      setTimeout(() => {
        const atlas = document.querySelector("#titan-world-atlas-wrap") || document.querySelector("#sec-world");
        if (atlas) atlas.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    });
    $("#flip-print")?.addEventListener("click", () => window.print());
    if (keep) {
      const el = $("#" + keep.id);
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.s, keep.e); } catch { /* ignore */ } }
    }
    $("#flip-country").addEventListener("change", (e) => {
      flipFilter.country = e.target.value;
      renderGallery(); saveState();
    });
    const yEl = $("#flip-year");
    yEl.addEventListener("input", (e) => {
      markTyping();
      flipFilter.year = e.target.value;
      if (!restoring) { renderGallery(); saveState(); }
    });
    yEl.addEventListener("focus", markTyping);
    $("#flip-sort").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v === "newest") { flipSort = { key: "scan", dir: -1 }; }
      else if (v === "ser") { flipSort = { key: "ser", dir: 1 }; }
      else if (v === "year") { flipSort = { key: "year", dir: 1 }; }
      else if (v === "country") { flipSort = { key: "country", dir: 1 }; }
      else if (v === "value") { flipSort = { key: "est", dir: -1 }; }
      else if (v === "asw") { flipSort = { key: "asw_oz", dir: -1 }; }
      renderGallery(); saveState();
    });
    $("#flip-ag").addEventListener("click", () => {
      flipFilter.silverOnly = !flipFilter.silverOnly;
      renderGallery(); saveState();
    });
    $("#flip-p2").addEventListener("click", () => {
      flipFilter.phase2 = !flipFilter.phase2;
      renderGallery(); saveState();
    });
    $("#flip-staging-clear")?.addEventListener("click", () => {
      flipFilter.staging = false;
      renderGallery(); saveState();
    });
    lazyThumbs($("#gallery-body"));
    observeReveals($("#gallery-body"));
    $$(".country-chip[data-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        flipFilter.country = flipFilter.country === btn.dataset.country ? "" : btn.dataset.country;
        renderGallery(); saveState();
      });
    });

    // Event delegation for cards: bound ONCE on the persistent container; it reads the rows of the
    // latest render (re-binding on every render made one tap fire once per past render).
    galleryRows = rows;
    const gBodyEl = $("#gallery-body");
    if (!gBodyEl.dataset.delegated) {
    gBodyEl.dataset.delegated = "1";
    gBodyEl.addEventListener("click", (e) => {
      const flipBtn = e.target.closest(".pc-3d-flip-trigger, .pc-flip-action-btn");
      if (flipBtn) {
        e.stopPropagation();
        e.preventDefault();
        const stage = flipBtn.closest(".pc-3d-flipper-stage");
        if (stage) {
          stage.classList.toggle("is-flipped");
          playStapleClick();
        }
        return;
      }
      const card = e.target.closest(".piece-card[data-scan], .latest-card[data-scan]");
      if (card) {
        dossierCtx = { label: "Gallery", scans: galleryRows.map((f) => f.scan) };
        openDrawer(card.dataset.scan);
      }
    });

    gBodyEl.addEventListener("keydown", (e) => {
      const card = e.target.closest(".piece-card[data-scan]");
      if (!card) return;
      if (e.key === "Enter") {
        e.preventDefault();
        dossierCtx = { label: "Gallery", scans: galleryRows.map((f) => f.scan) };
        openDrawer(card.dataset.scan);
      } else if (e.key === " " || e.key === "f" || e.key === "F") {
        e.preventDefault();
        const stage = card.querySelector(".pc-3d-flipper-stage");
        if (stage) {
          stage.classList.toggle("is-flipped");
          playStapleClick();
        }
      }
    });
    }

    // Wire apex 3D Museum Room Banner Launch Button
    $("#btn-gallery-launch-spatial")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const current = rows[cfCurrentIndex] || rows[0];
      if (window.TitanSpatial && current) {
        window.TitanSpatial.open(current, galleryMode === "matrix" ? "planchet" : (galleryMode === "flip" ? "flip" : "slab"));
      }
    });

    // Pointer-driven 3D tilt & dynamic specular light sheen on Gallery Cards (Desktop only, 120fps RAF throttled)
    const canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    function bindCardHover(root = document) {
      if (!canHover) return;
      const cards = root.querySelectorAll ? root.querySelectorAll(".piece-card:not(.has-tilt), .latest-card:not(.has-tilt)") : [];
      cards.forEach((card) => {
        card.classList.add("has-tilt");
        let cardRect = null;
        let rafId = null;
        card.addEventListener("mouseenter", () => {
          cardRect = card.getBoundingClientRect();
        });
        card.addEventListener("mousemove", (e) => {
          if (!cardRect) cardRect = card.getBoundingClientRect();
          if (rafId) return;
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (!cardRect || !cardRect.width || !cardRect.height) return;
            const hw = cardRect.width / 2;
            const hh = cardRect.height / 2;
            const nx = (e.clientX - (cardRect.left + hw)) / hw;
            const ny = (e.clientY - (cardRect.top + hh)) / hh;
            if (isNaN(nx) || isNaN(ny)) return;
            const clampedX = Math.max(-1, Math.min(1, nx));
            const clampedY = Math.max(-1, Math.min(1, ny));
            const tiltX = (-clampedY * 10).toFixed(1);
            const tiltY = (clampedX * 12).toFixed(1);

            const flipper = card.querySelector(".pc-3d-flipper");
            const stage = card.querySelector(".pc-3d-flipper-stage");
            const isFlipped = stage?.classList.contains("is-flipped");
            const baseRotY = isFlipped ? 180 : 0;
            const effTiltY = isFlipped ? -Number(tiltY) : Number(tiltY);

            if (flipper) {
              flipper.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${baseRotY + effTiltY}deg) translateZ(8px)`;
            } else {
              card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(8px)`;
            }

            // Directional lighting & Cartwheel Luster Angle matching Now Exhibiting
            const angleRad = Math.atan2(e.clientY - (cardRect.top + hh), e.clientX - (cardRect.left + hw));
            const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;
            card.style.setProperty("--luster-angle", `${angleDeg.toFixed(1)}deg`);
            card.style.setProperty("--relief-x", `${(clampedX * 2.5).toFixed(1)}`);
            card.style.setProperty("--relief-y", `${(clampedY * 2.5).toFixed(1)}`);

            const sheenX = ((clampedX + 1) / 2 * 100).toFixed(1);
            const sheenY = ((clampedY + 1) / 2 * 100).toFixed(1);
            card.style.setProperty("--card-sheen-x", `${sheenX}%`);
            card.style.setProperty("--card-sheen-y", `${sheenY}%`);
          });
        });
        card.addEventListener("mouseleave", () => {
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
          cardRect = null;
          const flipper = card.querySelector(".pc-3d-flipper");
          const stage = card.querySelector(".pc-3d-flipper-stage");
          const isFlipped = stage?.classList.contains("is-flipped");
          if (flipper) {
            flipper.style.transform = isFlipped ? "rotateY(180deg)" : "";
          } else {
            card.style.transform = "";
          }
        });
      });
    }
    bindCardHover($("#gallery-body"));

    setupCoverFlowEvents();
    renderCoverFlow(cfCurrentIndex);
  }


  // ==========================================
  // TR49 VAULT WING OVERHAUL — Precious Metals Reserve Strongroom
  // ==========================================
  let vaultDoorPlayed = false;

  /** Determine bullion visual type from item data */
  function bullionVisualType(item) {
    const cat = String(item.cat || item.kind || "").toLowerCase();
    const label = String(item.label || item.denom || "").toLowerCase();
    if (item.is_gold || cat.includes("gold") || label.includes("gold")) return "gold";
    if (cat.includes("bar") || label.includes("bar")) return "bar";
    if (cat.includes("set") || item._kind === "Set") return "set";
    if (cat.includes("housing") || item._kind === "Housing") return "housing";
    if (cat.includes("stamp") || item._kind === "Stamp") return "stamp";
    if (cat.includes("lot") || label.includes("round") || label.includes("buffalo") || label.includes("tube")) return "tube";
    if (item.is_silver) return "tube";
    return "bar";
  }

  /** Render the 3D bullion visual HTML based on type */
  function renderBullionVisual(item) {
    const type = bullionVisualType(item);
    const qty = item.qty_n || 1;

    if (type === "tube") {
      // Silver rounds stacked in a tube
      const stackCount = Math.min(qty, 10);
      const rounds = Array.from({ length: stackCount }, (_, i) =>
        `<div class="bullion-round" style="bottom:${6 + i * 8}px"></div>`
      ).join("");
      return `<div class="bullion-tube">
        <div class="bullion-tube-container">${rounds}</div>
      </div>`;
    }
    if (type === "bar") {
      const weightLabel = item.asw_oz != null ? num(item.asw_oz, 2) + " oz" : "";
      return `<div class="bullion-bar">
        <div class="bullion-bar-stamp">.999 FINE<br>SILVER</div>
        <div class="bullion-bar-weight">${esc(weightLabel)}</div>
      </div>`;
    }
    if (type === "gold") {
      return `<div class="bullion-gold-disc"></div>`;
    }
    if (type === "set") {
      return `<div class="bullion-mint-box">
        <div class="bullion-mint-box-label">US MINT<br>PROOF SET</div>
      </div>`;
    }
    if (type === "housing") {
      return `<div class="bullion-housing"></div>`;
    }
    if (type === "stamp") {
      return `<div class="bullion-stamp-frame"></div>`;
    }
    return `<div class="bullion-bar"><div class="bullion-bar-stamp">RESERVE</div></div>`;
  }

  /** Render a single bullion lot card */
  function renderBullionLotCard(item) {
    const purityClass = item.is_gold ? "au" : (item.is_silver ? "ag" : "");
    const purityLabel = item.is_gold ? "Au" : (item.is_silver ? "Ag" : "");
    const metalDetail = item.metal ? item.metal.split("·")[0].trim() : "";
    const meltVal = item.melt != null ? money(item.melt) : "—";
    const estVal = item.est != null ? money(item.est) : "—";
    const aswVal = item.asw_oz != null ? num(item.asw_oz, 4) + " oz" : "—";
    const premium = (item.est != null && item.melt != null && item.melt > 0)
      ? `+${money(Math.max(0, item.est - item.melt))} prem`
      : "";

    return `
      <div class="bullion-lot-card reveal" data-scan="${esc(item.scan)}" tabindex="0" title="Click to inspect dossier">
        <div class="bullion-3d-visual">${renderBullionVisual(item)}</div>
        <div class="bullion-lot-head">
          <span class="bullion-lot-id">${esc(item.scan)}</span>
          ${purityClass ? `<span class="bullion-lot-purity ${purityClass}">${esc(purityLabel)} ${esc(metalDetail)}</span>` : ""}
        </div>
        <div class="bullion-lot-title">${esc(item.label || item.denom || item.scan)}</div>
        <div class="bullion-lot-desc">${esc(item.country || "")}${item.year && item.year !== "ND" ? " · " + esc(item.year) : ""}${item.qty_n > 1 ? " · Qty " + esc(intFmt(item.qty_n)) : ""}</div>
        ${item.parked ? `<div class="bullion-lot-housing">${esc(item.parked)}</div>` : ""}
        <div class="bullion-lot-melt-strip">
          <div class="blm-metric"><span class="blm-val">${meltVal}</span><span class="blm-lbl">Melt</span></div>
          <div class="blm-metric"><span class="blm-val">${estVal}</span><span class="blm-lbl">Est Value</span></div>
          <div class="blm-metric"><span class="blm-val">${aswVal}</span><span class="blm-lbl">${item.is_gold ? "AGW" : "ASW"}</span></div>
        </div>
      </div>`;
  }

  function renderVault() {
    // Wing II is rendered by wings/vault.js (door + dashboard); the TR49 code below is the fallback.
    if (window.TitanVaultWing && typeof window.TitanVaultWing.render === "function") {
      try {
        window.TitanVaultWing.render({ vault, open: (scan) => { dossierCtx = null; openDrawer(scan); }, active: !!$("#pane-vault")?.classList.contains("active") });
        return;
      } catch (e) { console.warn("TitanVaultWing.render failed; using fallback", e); }
    }
    const all = [
      ...(vault.bullion || []).map((x) => ({ ...x, _kind: "Bullion" })),
      ...(vault.sets || []).map((x) => ({ ...x, _kind: "Set" })),
      ...(vault.housing || []).map((x) => ({ ...x, _kind: "Housing" })),
      ...(vault.stamps || []).map((x) => ({ ...x, _kind: "Stamp" })),
    ];
    const prec = vault.precious || {};
    const fs = prec.flip_silver || {};
    const bs = prec.bullion_silver || {};
    const cs = prec.combined_silver || {};
    const fg = prec.flip_gold || {};
    const bg = prec.bullion_gold || {};
    const spotAg = Number((vault.board || {}).spot_ag) || 0;
    const spotAu = Number((vault.board || {}).spot_au) || 0;
    const gsRatio = spotAu && spotAg ? (spotAu / spotAg).toFixed(1) : "0";
    const totalAgOz = Number(cs.oz) || 63.27;
    const totalAuOz = Number(bg.oz) || 0.1322;
    const totalPhysicalMelt = (totalAgOz * spotAg) + (totalAuOz * spotAu);
    const totalEst = all.reduce((s, x) => s + (Number(x.est) || 0), 0)
      + (vault.flips || []).reduce((s, f) => s + (Number(f.est) || 0), 0);

    // --- Vault Door Animation ---
    const isVaultActive = $("#pane-vault")?.classList.contains("active");

    // --- Portfolio Dashboard: Allocation Donut ---
    const bullionAgVal = (vault.bullion || []).reduce((s, x) => s + (x.is_silver ? (Number(x.est) || 0) : 0), 0);
    const bullionAuVal = (vault.bullion || []).reduce((s, x) => s + (x.is_gold ? (Number(x.est) || 0) : 0), 0);
    const flipAgVal = (vault.flips || []).filter(f => f.is_silver).reduce((s, f) => s + (Number(f.est) || 0), 0);
    const setsVal = (vault.sets || []).reduce((s, x) => s + (Number(x.est) || 0), 0)
      + (vault.housing || []).reduce((s, x) => s + (Number(x.est) || 0), 0)
      + (vault.stamps || []).reduce((s, x) => s + (Number(x.est) || 0), 0);
    const flipOtherVal = totalEst - bullionAgVal - bullionAuVal - flipAgVal - setsVal;

    const donutTotal = totalEst || 1;
    const slices = [
      { label: "Bullion Silver", val: bullionAgVal, color: "#94a3b8" },
      { label: "Silver Flips", val: flipAgVal, color: "#cbd5e1" },
      { label: "Gold Reserves", val: bullionAuVal, color: "#eab308" },
      { label: "Sets & Other", val: setsVal, color: "#10b981" },
      { label: "Base Metal Flips", val: Math.max(0, flipOtherVal), color: "#b45309" },
    ].filter(s => s.val > 0);

    let donutDeg = 0;
    const donutGradStops = slices.map(s => {
      const pct = (s.val / donutTotal) * 360;
      const start = donutDeg;
      donutDeg += pct;
      return `${s.color} ${start.toFixed(1)}deg ${donutDeg.toFixed(1)}deg`;
    }).join(", ");

    const donutLegendHtml = slices.map(s => {
      const pct = ((s.val / donutTotal) * 100).toFixed(1);
      return `<div class="vault-donut-legend-item">
        <span class="legend-swatch" style="background:${s.color}"></span>
        <span>${esc(s.label)}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
    }).join("");

    // --- Spot Ticker with Sparklines ---
    // Spot tiles are drawn only from the published quote (metals.spot / metals.prior_spot):
    // the delta and the trend line compare the prior quote to the current one — nothing simulated.
    const metals = vault.metals || {};
    const priorSpot = metals.prior_spot || {};
    const priorAg = Number(priorSpot.ag_usd_oz) || 0;
    const priorAu = Number(priorSpot.au_usd_oz) || 0;
    const priorRatio = priorAg && priorAu ? priorAu / priorAg : 0;
    const spotAsOf = metals.as_of_local || metals.as_of || "";
    const spotSource = metals.source || "";
    const bullionDelta = Number((metals.board_delta || {}).d_bullion);

    function spotTileHtml(label, badge, badgeStyle, price, priceFmt, prior, fmt, sparkClass) {
      const hasPrior = prior > 0 && price > 0;
      const pct = hasPrior ? ((price - prior) / prior) * 100 : 0;
      const dir = !hasPrior || Math.abs(pct) < 0.005 ? "flat" : pct > 0 ? "up" : "down";
      const delta = hasPrior
        ? `${dir === "up" ? "▲ +" : dir === "down" ? "▼ " : "■ "}${pct.toFixed(2)}% vs prior quote`
        : "No prior quote published";
      const trend = hasPrior
        ? `<svg class="spot-sparkline-svg" viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true"><polyline class="${sparkClass}" points="${dir === "flat" ? "0,12 120,12" : dir === "up" ? "0,20 120,4" : "0,4 120,20"}" /></svg>`
        : "";
      return `<div class="spot-metal-tile">
        <div class="spot-metal-label"><span>${label}</span><span class="badge" style="${badgeStyle}">${badge}</span></div>
        <div class="spot-metal-price">${priceFmt}</div>
        <div class="spot-metal-delta ${dir}">${delta}</div>
        ${trend}
        ${hasPrior ? `<div class="spot-range-labels"><span>Prior ${fmt(prior)}</span><span>Now ${fmt(price)}</span></div>` : ""}
      </div>`;
    }

    const spotTickerHtml = `
      <div class="spot-ticker-card reveal" id="vault-live-spot-ticker">
        <div class="spot-ticker-head">
          <div style="display:flex;align-items:center;gap:0.6rem">
            <span class="spot-live-pill"><span class="spot-live-dot"></span> SPOT QUOTE</span>
            <span style="font-size:0.8rem;color:var(--muted);font-family:var(--mono)">${esc([spotSource, spotAsOf && "as of " + spotAsOf].filter(Boolean).join(" · ").toUpperCase() || "PUBLISHED WITH THE LEDGER")}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--gold-soft);font-family:var(--mono)">
            SYNCED WITH ACTIVE PHYSICAL VAULT RESERVES
          </div>
        </div>
        <div class="spot-ticker-grid">
          ${spotTileHtml("SILVER (XAG/OZ)", "PRIMARY", "background:rgba(200,169,74,0.15);color:var(--gold);font-size:0.65rem", spotAg, "$" + spotAg.toFixed(2), priorAg, v => "$" + v.toFixed(2), "ag-spark")}
          ${spotTileHtml("GOLD (XAU/OZ)", "RESERVE", "background:rgba(234,179,8,0.15);color:#eab308;font-size:0.65rem", spotAu, "$" + spotAu.toFixed(2), priorAu, v => "$" + v.toFixed(2), "au-spark")}
          ${spotTileHtml("GOLD / SILVER RATIO", "GSR", "background:rgba(6,182,212,0.15);color:#06b6d4;font-size:0.65rem", parseFloat(gsRatio), gsRatio + ":1", priorRatio, v => v.toFixed(1) + ":1", "ratio-spark")}
          <div class="spot-metal-tile">
            <div class="spot-metal-label"><span>BULLION BOARD Δ</span><span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-size:0.65rem">LEDGER</span></div>
            <div class="spot-metal-price">${Number.isFinite(bullionDelta) ? (bullionDelta >= 0 ? "+" : "−") + money(Math.abs(bullionDelta)) : "—"}</div>
            <div class="spot-metal-delta ${!Number.isFinite(bullionDelta) || bullionDelta === 0 ? "flat" : bullionDelta > 0 ? "up" : "down"}">Bullion value move since prior quote</div>
          </div>
        </div>
        <div class="spot-recalc-banner">
          <div>
            <div style="font-size:0.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em">Combined Vault Physical Melt Value</div>
            <div style="font-family:var(--mono);font-size:1.35rem;font-weight:700;color:var(--gold-soft)">${money(totalPhysicalMelt)}</div>
          </div>
          <div style="font-size:0.8rem;color:var(--ink-soft);max-width:480px;line-height:1.4">
            Directly custodying <strong style="color:var(--gold)">${num(totalAgOz, 2)} oz pure silver</strong> and <strong style="color:#eab308">${num(totalAuOz, 4)} oz fine gold</strong>. Valued at the published spot quote${spotAsOf ? " of " + esc(spotAsOf) : ""}.
          </div>
        </div>
      </div>`;

    // --- Custody Metrics ---
    const custodyHtml = `
      <div class="vault-custody-row">
        <div class="vault-custody-metric reveal">
          <span class="vcm-val">${num(totalAgOz, 2)} oz</span>
          <span class="vcm-lbl">Silver (Troy)</span>
        </div>
        <div class="vault-custody-metric reveal">
          <span class="vcm-val">${num(totalAuOz, 4)} oz</span>
          <span class="vcm-lbl">Gold (Troy)</span>
        </div>
        <div class="vault-custody-metric reveal">
          <span class="vcm-val">${intFmt(all.length)}</span>
          <span class="vcm-lbl">Physical Lots</span>
        </div>
        <div class="vault-custody-metric reveal">
          <span class="vcm-val">${money(totalEst)}</span>
          <span class="vcm-lbl">Total Vault Equity</span>
        </div>
      </div>`;

    // --- Donut Dashboard ---
    const dashboardHtml = `
      <div class="vault-dashboard">
        <div class="vault-dash-card reveal">
          <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem">Asset Allocation</div>
          <div class="vault-donut-wrap">
            <div class="vault-donut" style="background:conic-gradient(${donutGradStops})">
              <div class="vault-donut-center">
                <span class="donut-total">${money(totalEst)}</span>
                <span class="donut-label">Total Equity</span>
              </div>
            </div>
            <div class="vault-donut-legend">${donutLegendHtml}</div>
          </div>
        </div>
        <div class="vault-dash-card reveal">
          <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem">Physical Melt vs. Numismatic Premium</div>
          <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.75rem">
            <div style="text-align:center">
              <div style="font-family:var(--mono);font-size:1.6rem;font-weight:700;color:#94a3b8">${money(totalPhysicalMelt)}</div>
              <div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase">Intrinsic Melt</div>
            </div>
            <div style="font-size:1.5rem;color:var(--gold)">→</div>
            <div style="text-align:center">
              <div style="font-family:var(--mono);font-size:1.6rem;font-weight:700;color:var(--gold-soft)">${money(totalEst)}</div>
              <div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase">Market Equity</div>
            </div>
            <div style="text-align:center">
              <div style="font-family:var(--mono);font-size:1.2rem;font-weight:700;color:#10b981">+${money(Math.max(0, totalEst - totalPhysicalMelt))}</div>
              <div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase">Value above melt</div>
            </div>
          </div>
          <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;display:flex">
            <div style="width:${totalEst > 0 ? ((totalPhysicalMelt / totalEst) * 100).toFixed(1) : 0}%;background:linear-gradient(90deg,#64748b,#94a3b8);border-radius:4px 0 0 4px" title="Melt value"></div>
            <div style="flex:1;background:linear-gradient(90deg,#c8a94a,#eab308);border-radius:0 4px 4px 0" title="Numismatic premium"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--muted);margin-top:0.3rem;font-family:var(--mono)">
            <span>Melt ${totalEst > 0 ? ((totalPhysicalMelt / totalEst) * 100).toFixed(1) : 0}%</span>
            <span>Premium ${totalEst > 0 ? (((totalEst - totalPhysicalMelt) / totalEst) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>
      </div>`;

    // --- Silver Allocation Visual Stack Bar ---
    const silverFlips = (vault.flips || []).filter(f => f.is_silver && f.asw_oz).sort((a, b) => (b.asw_oz || 0) - (a.asw_oz || 0));
    const maxAsw = silverFlips.reduce((m, f) => Math.max(m, f.asw_oz || 0), 0);
    const totalAswFlips = silverFlips.reduce((s, f) => s + (f.asw_oz || 0), 0);

    const stackSegments = silverFlips.map(f => {
      const pct = totalAswFlips > 0 ? ((f.asw_oz || 0) / totalAswFlips * 100) : 0;
      const intensity = maxAsw > 0 ? Math.round(40 + ((f.asw_oz || 0) / maxAsw) * 60) : 50;
      return `<div class="ss-segment" style="width:${Math.max(0.5, pct).toFixed(2)}%;background:rgba(148,163,184,${(intensity / 100).toFixed(2)})" data-scan="${esc(f.scan)}" title="${esc(f.ser || f.scan)}">
        <div class="ss-tooltip"><strong>${esc(f.ser || f.scan)}</strong><br>${esc(f.country || "")} ${esc(f.year || "")} · ${esc(f.denom || "")}<br>ASW: ${num(f.asw_oz, 4)} oz · Melt: ${meltLive(f)}</div>
      </div>`;
    }).join("");

    const silverStackHtml = silverFlips.length ? `
      <div class="silver-stack-bar-wrap reveal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Silver Weight Distribution (${silverFlips.length} specimens)</span>
          <span style="font-family:var(--mono);font-size:0.8rem;color:var(--gold-soft)">${num(totalAswFlips, 2)} oz ASW total</span>
        </div>
        <div class="silver-stack-bar">${stackSegments}</div>
      </div>` : "";

    // --- Silver Allocation Table (enhanced with inline ASW bars) ---
    const flipAgRows = silverFlips.map(f => {
      const aswPct = maxAsw > 0 ? ((f.asw_oz || 0) / maxAsw * 100).toFixed(1) : "0";
      return `<tr data-scan="${esc(f.scan)}">
        <td class="ser-primary">${esc(f.ser || f.scan)} <span class="badge-ag">Ag</span></td>
        <td>${esc(f.country || "")}</td>
        <td>${esc(f.year || "")}</td>
        <td>${esc(f.denom || f.label || "")}</td>
        <td class="num"><div class="asw-inline-bar"><div class="asw-bar-track"><div class="asw-bar-fill" style="width:${aswPct}%"></div></div><span class="asw-val">${f.asw_oz != null ? num(f.asw_oz, 4) : "?"}</span></div></td>
        <td class="num asw-cell">${meltLive(f)}</td>
        <td class="num">${f.est != null ? money(f.est) : "—"}</td>
      </tr>`;
    }).join("");

    // --- Bullion Lot Cards ---
    const bullionCardsHtml = all.map(item => renderBullionLotCard(item)).join("");

    // --- Liquidation Scenario Calculator ---
    // (HTML structure; the interactive slider JS is wired in bindVaultEvents below)
    const scenarioHtml = `
      <div class="vault-scenario-panel" id="vault-scenario-panel">
        <div class="sc-head-title">📊 What-If Liquidation Scenario Calculator</div>
        <div class="vault-scenario-sliders">
          <div class="vault-scenario-slider-group">
            <label>Silver Spot Override <span class="scenario-val" id="scenario-ag-val">$${spotAg.toFixed(2)}</span></label>
            <input type="range" id="scenario-ag-slider" class="sim-range range-ag" min="20" max="150" step="0.5" value="${spotAg.toFixed(1)}" />
          </div>
          <div class="vault-scenario-slider-group">
            <label>Dealer Spread (% of Spot) <span class="scenario-val" id="scenario-spread-val">92%</span></label>
            <input type="range" id="scenario-spread-slider" class="sim-range range-au" min="80" max="100" step="1" value="92" />
          </div>
          <div class="vault-scenario-slider-group">
            <label>Premium Capture Rate <span class="scenario-val" id="scenario-prem-val">70%</span></label>
            <input type="range" id="scenario-prem-slider" class="sim-range" min="0" max="100" step="5" value="70" />
          </div>
        </div>
        <div class="vault-scenario-cards" id="vault-scenario-results">
          <div class="scenario-card"><div class="sc-name">Scrap / Melt</div><div class="sc-amount" id="sc-melt">${money(totalPhysicalMelt)}</div><div class="sc-detail">Pure metal weight × spot</div></div>
          <div class="scenario-card"><div class="sc-name">Dealer Buyback</div><div class="sc-amount" id="sc-dealer">${money(totalPhysicalMelt * 0.92)}</div><div class="sc-detail">Melt × dealer spread</div></div>
          <div class="scenario-card"><div class="sc-name">Marketplace</div><div class="sc-amount" id="sc-market">${money(totalEst * 0.70 * 0.87)}</div><div class="sc-detail">Est × capture − 13% fees</div></div>
          <div class="scenario-card best"><div class="sc-name">Optimal Blend</div><div class="sc-amount" id="sc-optimal">${money(Math.max(totalPhysicalMelt, totalEst * 0.70 * 0.87))}</div><div class="sc-detail">Best channel per lot</div></div>
        </div>
      </div>`;

    // --- Assemble Full Vault Body ---
    $("#vault-body").innerHTML = `
      <div class="vault-interior">
        ${spotTickerHtml}
        ${custodyHtml}
        ${dashboardHtml}
        ${silverStackHtml}

        <div class="vault-section-head reveal">
          <div>
            <h3>Constitutional &amp; Archival Silver Allocation</h3>
            <div class="vault-sec-sub">${intFmt(silverFlips.length)} silver specimens · ${num(totalAswFlips, 2)} oz ASW · Physical Sovereignty &amp; Direct Custody</div>
          </div>
        </div>
        <div class="vault-table-controls">
          <div class="vault-table-search">
            <input type="search" id="vault-ag-search" class="input small" placeholder="Search silver holdings..." />
          </div>
        </div>
        <div class="table-wrap" style="max-height:340px;margin-bottom:2rem">
          <table class="data" id="vault-silver-table">
            <thead>
              <tr>
                <th data-sort="ser" style="cursor:pointer;user-select:none" title="Sort by SER">SER <span class="sort-icon"></span></th>
                <th data-sort="country" style="cursor:pointer;user-select:none" title="Sort by Country">Country <span class="sort-icon"></span></th>
                <th data-sort="year" style="cursor:pointer;user-select:none" title="Sort by Year">Year <span class="sort-icon"></span></th>
                <th data-sort="denom" style="cursor:pointer;user-select:none" title="Sort by Denomination">Denom <span class="sort-icon"></span></th>
                <th class="num" data-sort="asw" style="cursor:pointer;user-select:none" title="Sort by Silver Weight">ASW <span class="sort-icon">▼</span></th>
                <th class="num" data-sort="melt" style="cursor:pointer;user-select:none" title="Sort by Melt Value">Melt @ live <span class="sort-icon"></span></th>
                <th class="num" data-sort="est" style="cursor:pointer;user-select:none" title="Sort by Estimated Value">Est <span class="sort-icon"></span></th>
              </tr>
            </thead>
            <tbody>${flipAgRows || '<tr><td colspan="7" class="empty">No silver flips</td></tr>'}</tbody>
          </table>
        </div>

        <div class="vault-section-head reveal">
          <div>
            <h3>Physical Bullion &amp; Reserve Inventory</h3>
            <div class="vault-sec-sub">${intFmt((vault.bullion || []).length)} bullion · ${intFmt((vault.sets || []).length)} sets · ${intFmt((vault.housing || []).length)} housing · ${intFmt((vault.stamps || []).length)} stamps</div>
          </div>
        </div>
        <div class="bullion-vault-grid">${bullionCardsHtml}</div>

        ${scenarioHtml}
      </div>`;

    // --- Event Wiring ---
    bindVaultEvents(totalAgOz, totalAuOz, spotAu, totalEst);
    observeReveals($("#vault-body"));

    // Vault door animation - appended directly to document.body for true viewport centering
    if (!vaultDoorPlayed && isVaultActive) {
      vaultDoorPlayed = true;
      let overlay = document.getElementById("vault-door-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "vault-door-overlay";
        overlay.className = "vault-door-overlay";
        overlay.innerHTML = `
          <div class="vault-door-circle">
            <div class="vault-door-bolt"></div>
            <div class="vault-door-bolt"></div>
            <div class="vault-door-bolt"></div>
            <div class="vault-door-bolt"></div>
            <div class="vault-door-dial"></div>
            <div class="vault-door-label">TITAN RELIQUARY · PHYSICAL RESERVES</div>
          </div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add("vault-opened"), 450);
        setTimeout(() => overlay.remove(), 1750);
      }
    }
  }

  /** Wire vault interactive events. Called by renderVault. */
  function bindVaultEvents(totalAgOz, totalAuOz, spotAu, totalEst) {
    // Bullion lot card clicks
    $$("#vault-body .bullion-lot-card[data-scan]").forEach(card => {
      card.addEventListener("click", () => { dossierCtx = null; openDrawer(card.dataset.scan); });
      card.addEventListener("keydown", (e) => { if (e.key === "Enter") { dossierCtx = null; openDrawer(card.dataset.scan); } });
    });

    // Silver table row clicks
    $$("#vault-body #vault-silver-table tbody tr[data-scan]").forEach(tr => {
      tr.addEventListener("click", () => { dossierCtx = null; openDrawer(tr.dataset.scan); });
    });

    // Silver stack bar segment clicks
    $$("#vault-body .ss-segment[data-scan]").forEach(seg => {
      seg.addEventListener("click", (e) => { e.stopPropagation(); dossierCtx = null; openDrawer(seg.dataset.scan); });
    });

    // Silver table search
    const searchInput = $("#vault-ag-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        $$("#vault-silver-table tbody tr").forEach(tr => {
          const text = tr.textContent.toLowerCase();
          tr.style.display = (!q || text.includes(q)) ? "" : "none";
        });
      });
    }

    // Silver table column sorting
    let silverSortKey = "asw";
    let silverSortDir = -1; // -1 = desc, 1 = asc
    const silverHeaders = $$("#vault-silver-table thead th[data-sort]");
    silverHeaders.forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (silverSortKey === key) {
          silverSortDir = -silverSortDir;
        } else {
          silverSortKey = key;
          silverSortDir = (key === "asw" || key === "melt" || key === "est" || key === "year") ? -1 : 1;
        }

        // Update sort indicators
        silverHeaders.forEach(h => {
          const icon = h.querySelector(".sort-icon");
          if (!icon) return;
          if (h.dataset.sort === silverSortKey) {
            icon.textContent = silverSortDir === 1 ? "▲" : "▼";
            h.style.color = "var(--gold-soft)";
          } else {
            icon.textContent = "";
            h.style.color = "";
          }
        });

        // Sort table rows
        const tbody = $("#vault-silver-table tbody");
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll("tr[data-scan]"));
        rows.sort((a, b) => {
          if (silverSortKey === "ser") {
            const vA = a.querySelector(".ser-primary")?.textContent.trim() || "";
            const vB = b.querySelector(".ser-primary")?.textContent.trim() || "";
            return silverSortDir * vA.localeCompare(vB, undefined, { numeric: true });
          } else if (silverSortKey === "country") {
            const vA = a.children[1]?.textContent.trim() || "";
            const vB = b.children[1]?.textContent.trim() || "";
            return silverSortDir * vA.localeCompare(vB);
          } else if (silverSortKey === "year") {
            const vA = parseInt(a.children[2]?.textContent.trim(), 10) || 0;
            const vB = parseInt(b.children[2]?.textContent.trim(), 10) || 0;
            return silverSortDir * (vA - vB);
          } else if (silverSortKey === "denom") {
            const vA = a.children[3]?.textContent.trim() || "";
            const vB = b.children[3]?.textContent.trim() || "";
            return silverSortDir * vA.localeCompare(vB);
          } else if (silverSortKey === "asw") {
            const vA = parseFloat(a.querySelector(".asw-val")?.textContent.trim()) || 0;
            const vB = parseFloat(b.querySelector(".asw-val")?.textContent.trim()) || 0;
            return silverSortDir * (vA - vB);
          } else if (silverSortKey === "melt") {
            const vA = parseFloat((a.children[5]?.textContent || "").replace(/[^0-9.]/g, "")) || 0;
            const vB = parseFloat((b.children[5]?.textContent || "").replace(/[^0-9.]/g, "")) || 0;
            return silverSortDir * (vA - vB);
          } else if (silverSortKey === "est") {
            const vA = parseFloat((a.children[6]?.textContent || "").replace(/[^0-9.]/g, "")) || 0;
            const vB = parseFloat((b.children[6]?.textContent || "").replace(/[^0-9.]/g, "")) || 0;
            return silverSortDir * (vA - vB);
          }
          return 0;
        });

        rows.forEach(r => tbody.appendChild(r));
      });
    });

    // Liquidation scenario sliders
    const agSlider = $("#scenario-ag-slider");
    const spreadSlider = $("#scenario-spread-slider");
    const premSlider = $("#scenario-prem-slider");
    const agValEl = $("#scenario-ag-val");
    const spreadValEl = $("#scenario-spread-val");
    const premValEl = $("#scenario-prem-val");
    const meltEl = $("#sc-melt");
    const dealerEl = $("#sc-dealer");
    const marketEl = $("#sc-market");
    const optimalEl = $("#sc-optimal");

    const recalcScenario = () => {
      if (!agSlider || !spreadSlider || !premSlider) return;
      const scenarioAg = parseFloat(agSlider.value);
      const spread = parseInt(spreadSlider.value) / 100;
      const premCapture = parseInt(premSlider.value) / 100;

      const scenarioMelt = (totalAgOz * scenarioAg) + (totalAuOz * spotAu);
      const scenarioDealer = scenarioMelt * spread;
      const scenarioMarket = totalEst * premCapture * 0.87;
      const scenarioOptimal = Math.max(scenarioMelt, scenarioMarket);

      if (agValEl) agValEl.textContent = "$" + scenarioAg.toFixed(2);
      if (spreadValEl) spreadValEl.textContent = Math.round(spread * 100) + "%";
      if (premValEl) premValEl.textContent = Math.round(premCapture * 100) + "%";
      if (meltEl) meltEl.textContent = money(scenarioMelt);
      if (dealerEl) dealerEl.textContent = money(scenarioDealer);
      if (marketEl) marketEl.textContent = money(scenarioMarket);
      if (optimalEl) optimalEl.textContent = money(scenarioOptimal);

      // Highlight the single winning channel; the Optimal card names it.
      const cards = $$("#vault-scenario-results .scenario-card");
      const channels = [scenarioMelt, scenarioDealer, scenarioMarket];
      const bestIdx = channels.indexOf(Math.max(...channels));
      cards.forEach((c, i) => c.classList.toggle("best", i === bestIdx || i === 3));
      const optDetail = cards[3]?.querySelector(".sc-detail");
      if (optDetail) optDetail.textContent = "Via " + (cards[bestIdx]?.querySelector(".sc-name")?.textContent || "best channel");
    };

    [agSlider, spreadSlider, premSlider].forEach(el => {
      el?.addEventListener("input", recalcScenario);
    });
    recalcScenario();

    // Apply 3D hover tilt to bullion cards (reuse gallery card tilt system)
    const canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (canHover) {
      $$("#vault-body .bullion-lot-card").forEach(card => {
        card.classList.add("has-tilt");
        let cardRect = null;
        card.addEventListener("mouseenter", () => { cardRect = card.getBoundingClientRect(); });
        card.addEventListener("mousemove", (e) => {
          if (!cardRect) cardRect = card.getBoundingClientRect();
          const hw = cardRect.width / 2;
          const hh = cardRect.height / 2;
          const nx = Math.max(-1, Math.min(1, (e.clientX - (cardRect.left + hw)) / hw));
          const ny = Math.max(-1, Math.min(1, (e.clientY - (cardRect.top + hh)) / hh));
          card.style.transform = `perspective(900px) rotateX(${(-ny * 6).toFixed(1)}deg) rotateY(${(nx * 8).toFixed(1)}deg) translateY(-4px)`;
          card.style.setProperty("--card-sheen-x", `${((nx + 1) / 2 * 100).toFixed(1)}%`);
          card.style.setProperty("--card-sheen-y", `${((ny + 1) / 2 * 100).toFixed(1)}%`);
        });
        card.addEventListener("mouseleave", () => { cardRect = null; card.style.transform = ""; });
      });
    }
  }

  function isoName(iso) {
    const w = (vault.world || []).find((x) => x.iso === iso);
    return w?.country || iso;
  }
  function worldCoins(iso) {
    return (vault.flips || [])
      .filter((f) => f.iso === iso)
      .sort((a, b) => String(a.ser || "~").localeCompare(String(b.ser || "~"), undefined, { numeric: true }) || scanNum(a.scan) - scanNum(b.scan));
  }
  function worldPanel(iso) {
    const coins = worldCoins(iso);
    const name = isoName(iso);
    const est = coins.reduce((t, f) => t + (Number(f.est) || 0), 0);
    const rows = coins.map((f) => `
          <tr data-scan="${esc(f.scan)}" tabindex="0">
            <td class="ser-primary">${esc(f.ser || "—")}${f.is_silver ? ' <span class="badge-ag">Ag</span>' : ""}<span class="sub-scan">${esc(f.scan)}</span></td>
            <td class="muted scan-sec wc-scan">${esc(f.scan)}</td>
            <td>${esc(f.year || "")}</td>
            <td>${esc(f.denom || f.label || "")}</td>
            <td class="num">${f.est != null ? money(f.est) : "—"}</td>
            <td><span class="badge-status st-${esc(String(f.status || "Logged").toLowerCase())}">${esc(f.status || "Logged")}</span></td>
          </tr>`).join("");
    return `
      <div class="card world-panel" id="world-panel" data-iso="${esc(iso)}">
        <div class="wp-head">
          <div>
            <h3>${esc(name)} <span class="ser">${esc(iso)}</span></h3>
            <div class="hint">${esc(intFmt(coins.length))} coin${coins.length === 1 ? "" : "s"} · est ${money(est)} · sorted by SER · tap a coin for its dossier</div>
          </div>
          <div class="wp-actions">
            <button type="button" class="btn small" id="wp-flips">Open in Flips →</button>
            <button type="button" class="btn small" id="wp-close" aria-label="Close country">×</button>
          </div>
        </div>
        <div class="table-wrap wp-table">
          <table class="data compact" id="world-coins">
            <thead><tr><th>SER</th><th class="wc-scan">Scan</th><th>Year</th><th>Denom</th><th class="num">Est</th><th>Status</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty">No flips logged for this country</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function worldSec() {
    const world = vault.world || [];
    if (worldSel && !world.some((w) => w.iso === worldSel)) worldSel = "";
    const body = world
      .map((w) => `
        <tr class="w-row${w.iso === worldSel ? " selected" : ""}" data-iso="${esc(w.iso)}" tabindex="0" aria-expanded="${w.iso === worldSel}">
          <td>${esc(w.country)} <span class="w-go" aria-hidden="true">›</span></td>
          <td class="ser">${esc(w.iso)}</td>
          <td class="num w-sermax">${esc(w.ser_max)}</td>
          <td class="num"><strong>${esc(intFmt(w.count))}</strong></td>
          <td class="muted w-note">${esc(w.note || "")}</td>
        </tr>`)
      .join("");
    return `
      <div class="sec-head reveal" id="sec-world"><span class="eyebrow">Passports</span><h2>World Specimen Atlas</h2>
      <p class="sub">${intFmt(world.length)} sovereign nations · tap any country bubble or trade route on the vector atlas to inspect or filter the 3D Cover Flow &amp; Gallery</p></div>
      <div id="world-atlas-mount"></div>
      <div id="world-panel-mount">${worldSel ? worldPanel(worldSel) : ""}</div>
      <div class="table-wrap">
        <div class="world-table-controls">
          <input type="search" id="world-table-search" placeholder="🔍 Search sovereign nations by name, ISO, or note..." class="input small world-search-input" />
          <div class="world-table-count" id="world-table-count">${world.length} sovereign nations</div>
        </div>
        <table class="data" id="world-table">
          <thead><tr><th>Country</th><th>ISO</th><th class="num w-sermax">SER max</th><th class="num">Count</th><th class="w-note">Note</th></tr></thead>
          <tbody>${body || '<tr><td colspan="5" class="empty">No world table</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }
  function bindWorld() {
    window.TitanWorldFilterCallback = (country) => {
      // Direct click from World Map: filter Cover Flow & Gallery
      worldSel = country.iso;
      const names = [...new Set(worldCoins(country.iso).map((f) => f.country).filter(Boolean))];
      flipFilter = {
        ...flipFilter,
        q: "",
        year: "",
        silverOnly: false,
        phase2: false,
        country: names.length === 1 ? names[0] : "",
        iso: names.length === 1 ? "" : country.iso
      };
      flipSort = { key: "ser", dir: 1 };
      setWing("gallery");
      renderGallery();
      window.scrollTo(0, 0);
      setTimeout(() => {
        const cfWrap = document.getElementById("gallery-coverflow-wrap");
        if (cfWrap) {
          cfWrap.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 150);
      showToast(`Filtered to ${country.name} (${country.count} specimens) · 3D Cover Flow`);
    };

    // Mount & bind Interactive World Specimen Atlas & Trade Routes
    const atlasMount = $("#world-atlas-mount");
    if (atlasMount && window.TitanAtlas) {
      atlasMount.innerHTML = window.TitanAtlas.renderMarkup(worldSel);
      window.TitanAtlas.bindEvents(atlasMount, window.TitanWorldFilterCallback);
    }

    // Live search for World Table
    const searchInput = $("#world-table-search");
    const countDisplay = $("#world-table-count");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        let matchCount = 0;
        $$("#study-body #world-table tr.w-row").forEach(tr => {
          const text = tr.innerText.toLowerCase();
          const match = !q || text.includes(q);
          tr.style.display = match ? "" : "none";
          if (match) matchCount++;
        });
        if (countDisplay) {
          countDisplay.textContent = q ? `${matchCount} matching nation${matchCount === 1 ? '' : 's'}` : `${(vault.world || []).length} sovereign nations`;
        }
      });
    }

    function bindWorldPanel() {
      const openCoin = (scan) => {
        dossierCtx = { label: isoName(worldSel), scans: worldCoins(worldSel).map((f) => f.scan) };
        openDrawer(scan);
      };
      $$("#study-body #world-coins tbody tr[data-scan]").forEach((tr) => {
        tr.addEventListener("click", () => openCoin(tr.dataset.scan));
        tr.addEventListener("keydown", (e) => { if (e.key === "Enter") openCoin(tr.dataset.scan); });
      });
      $("#wp-close")?.addEventListener("click", () => {
        pick(worldSel);
      });
      $("#wp-flips")?.addEventListener("click", () => {
        const names = [...new Set(worldCoins(worldSel).map((f) => f.country).filter(Boolean))];
        flipFilter = { ...flipFilter, q: "", year: "", silverOnly: false, phase2: false,
          country: names.length === 1 ? names[0] : "", iso: names.length === 1 ? "" : worldSel };
        flipSort = { key: "ser", dir: 1 };
        renderGallery(); setWing("gallery"); window.scrollTo(0, 0);
        setTimeout(() => {
          const cfWrap = document.getElementById("gallery-coverflow-wrap");
          if (cfWrap) {
            cfWrap.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }, 150);
      });
    }

    const pick = (iso) => {
      worldSel = worldSel === iso ? "" : iso;
      if (window.TitanAtlas && window.TitanAtlas.selectCountry) {
        window.TitanAtlas.selectCountry(worldSel, true);
      }
      $$("#study-body #world-table tr.w-row").forEach((tr) => {
        const isMatch = tr.dataset.iso === worldSel;
        tr.classList.toggle("selected", isMatch);
        tr.setAttribute("aria-expanded", String(isMatch));
      });
      const wpMount = $("#world-panel-mount");
      if (wpMount) {
        wpMount.innerHTML = worldSel ? worldPanel(worldSel) : "";
        bindWorldPanel();
      }
      saveState();
      if (worldSel) requestAnimationFrame(() => $("#world-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
    };

    $$("#study-body #world-table tr.w-row").forEach((tr) => {
      tr.addEventListener("click", () => pick(tr.dataset.iso));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(tr.dataset.iso); } });
    });

    bindWorldPanel();
  }


  function renderLabProSuite() {
    return `
      <div class="sec-head reveal">
        <span class="eyebrow">Phase 2 Engineering Suite</span>
        <h2>Conservation Optics & Lab Workbench</h2>
        <p class="sub">Precision depth-of-field optics, cross-polarized studio lighting, and die rotation alignment.</p>
      </div>

      <div class="lab-pro-suite">
        <!-- 0. Pro Photo Phase 2 Staging Album & Macro Rig Queue -->
        <div class="lab-card-pro reveal" id="phase2-staging-card" style="border:1px solid var(--gold);background:linear-gradient(135deg, rgba(200,169,74,0.08), rgba(14,16,22,0.95))">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
            <div>
              <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.35rem">
                <span class="badge" style="font-family:var(--mono);font-size:0.75rem;background:var(--gold);color:#08090c;font-weight:700">PHYSICAL STAGING DIRECTORY</span>
                <span class="badge" style="font-family:var(--mono);font-size:0.7rem;background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gold)">PHASE 2 MACRO RIG</span>
              </div>
              <h3 style="margin:0 0 0.35rem;font-size:1.25rem;color:var(--gold-soft)">📸 Pro Photo Phase 2 Staging Album</h3>
              <p style="margin:0;font-size:0.85rem;color:var(--ink);max-width:760px;line-height:1.5">
                Physical staging directory dedicated to high-resolution tethered 1:1 macro RAW/TIFF scans. AI photo generation has been halted; authentic struck planchet blueprints are active in the museum until physical studio shooting begins.
              </p>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
              <button type="button" class="btn small" id="btn-copy-staging-path" title="Copy local folder path to clipboard" style="display:flex;align-items:center;gap:0.4rem">
                📋 <span>Copy Staging Path</span>
              </button>
              <button type="button" class="btn small gold" id="btn-open-staging-filter" title="Filter gallery to Phase 2 Staging Masterpieces" style="display:flex;align-items:center;gap:0.4rem">
                🔍 <span>View Staging Masterpieces (5)</span>
              </button>
            </div>
          </div>

          <div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(0,0,0,0.4);border-radius:8px;border:1px dashed rgba(200,169,74,0.35);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
            <div style="font-family:var(--mono);font-size:0.8rem;color:var(--gold-soft);word-break:break-all">
              📁 <strong>Google Drive Staging Folder:</strong> <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">G:\\My Drive\\Titan Reliquary\\PHOTO_STAGING\\STAGE_1_RAW\\</code>
            </div>
            <span style="font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted)">Stage 1: Pure Coin Macro (NO Labels)</span>
          </div>

          <div style="margin-top:1.2rem">
            <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.6rem">
              Priority Macro Queue (Top 5 Masterpieces Awaiting Studio Session):
            </div>
            <div class="table-wrap" style="background:rgba(8,9,12,0.6);border-radius:8px;border:1px solid var(--line)">
              <table class="data" style="margin:0;font-size:0.82rem">
                <thead>
                  <tr>
                    <th>Scan / Ser</th>
                    <th>Specimen &amp; Sovereign Origin</th>
                    <th>Alloy &amp; Strike</th>
                    <th>Valuation</th>
                    <th>Status</th>
                    <th style="text-align:right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong style="color:var(--gold-soft)">C114</strong></td>
                    <td>Mexico 1914 Chihuahua Revolutionary 5¢</td>
                    <td>Copper / Sand Cast Ingot Strike</td>
                    <td class="num">$125.00</td>
                    <td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span></td>
                    <td style="text-align:right"><button type="button" class="btn tiny" data-scan="C114">Inspect Dossier</button></td>
                  </tr>
                  <tr>
                    <td><strong style="color:var(--gold-soft)">C223</strong></td>
                    <td>Netherlands 1967 Juliana Silver 1 Gulden</td>
                    <td>0.720 Fine Silver (4.68g ASW)</td>
                    <td class="num">$16.50</td>
                    <td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span></td>
                    <td style="text-align:right"><button type="button" class="btn tiny" data-scan="C223">Inspect Dossier</button></td>
                  </tr>
                  <tr>
                    <td><strong style="color:var(--gold-soft)">C073</strong></td>
                    <td>USA 1976 Bicentennial Quarter (Washington)</td>
                    <td>Cupro-Nickel Clad (Colonial Drummer)</td>
                    <td class="num">$2.40</td>
                    <td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span></td>
                    <td style="text-align:right"><button type="button" class="btn tiny" data-scan="C073">Inspect Dossier</button></td>
                  </tr>
                  <tr>
                    <td><strong style="color:var(--gold-soft)">C066</strong></td>
                    <td>Switzerland 1966 Helvetia Standing 1 Franc</td>
                    <td>0.835 Fine Silver (4.17g ASW)</td>
                    <td class="num">$18.50</td>
                    <td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span></td>
                    <td style="text-align:right"><button type="button" class="btn tiny" data-scan="C066">Inspect Dossier</button></td>
                  </tr>
                  <tr>
                    <td><strong style="color:var(--gold-soft)">C065</strong></td>
                    <td>Switzerland 1968 Helvetia Standing 1 Franc</td>
                    <td>Cupro-Nickel First Transition Strike</td>
                    <td class="num">$8.00</td>
                    <td><span class="badge" style="background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--line-strong)">Awaiting Macro Scan</span></td>
                    <td style="text-align:right"><button type="button" class="btn tiny" data-scan="C065">Inspect Dossier</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 1. Macro Lens & Focal Plane Calculator -->
        <div class="lab-card-pro reveal" id="macro-calc-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
            <div>
              <h3 style="margin:0 0 0.25rem;font-size:1.1rem">🔬 Macro Optics &amp; Depth-of-Field Calculator</h3>
              <p style="margin:0;font-size:0.8rem;color:var(--muted)">Compute working distance, effective aperture, and focus-stack depth for coin relief capture.</p>
            </div>
            <span class="badge" style="font-family:var(--mono);font-size:0.7rem;background:rgba(200,169,74,0.15);color:var(--gold-soft);border:1px solid var(--gold)">PHASE 2 READY</span>
          </div>

          <div class="lab-calc-grid">
            <div class="lab-calc-field">
              <label for="calc-sensor">Sensor Format</label>
              <select id="calc-sensor">
                <option value="0.030" selected>Full Frame 35mm (CoC 0.030mm)</option>
                <option value="0.020">APS-C / DX (CoC 0.020mm)</option>
                <option value="0.015">Micro Four Thirds (CoC 0.015mm)</option>
                <option value="0.033">Medium Format 44x33 (CoC 0.033mm)</option>
                <option value="0.011">1-Inch Compact (CoC 0.011mm)</option>
              </select>
            </div>

            <div class="lab-calc-field">
              <label for="calc-focal">Focal Length (mm)</label>
              <select id="calc-focal">
                <option value="60">60mm Macro</option>
                <option value="90">90mm Macro</option>
                <option value="100" selected>100mm Macro Prime</option>
                <option value="105">105mm Micro-Nikkor</option>
                <option value="180">180mm Telephoto Macro</option>
              </select>
            </div>

            <div class="lab-calc-field">
              <label for="calc-aperture">Nominal Aperture (f-stop)</label>
              <select id="calc-aperture">
                <option value="2.8">f/2.8 (Razor Thin / Rapid Falloff)</option>
                <option value="4.0">f/4.0</option>
                <option value="5.6">f/5.6</option>
                <option value="8.0" selected>f/8.0 (Sweet Spot)</option>
                <option value="11.0">f/11.0</option>
                <option value="16.0">f/16.0 (Diffraction Warning)</option>
                <option value="22.0">f/22.0 (Heavy Softening)</option>
              </select>
            </div>

            <div class="lab-calc-field">
              <label for="calc-mag">Reproduction Ratio (m)</label>
              <select id="calc-mag">
                <option value="0.25">1:4 (0.25× · Crown / Large Medals)</option>
                <option value="0.5">1:2 (0.50× · Silver Dollars / Thalers)</option>
                <option value="1.0" selected>1:1 (1.00× · Life Size Dimes/Cents)</option>
                <option value="1.5">1.5:1 (1.50× · Mintmark / Die Crack Detail)</option>
                <option value="2.0">2:1 (2.00× · Extreme High-Mag Macro)</option>
              </select>
            </div>
          </div>

          <div class="lab-calc-results">
            <div class="calc-res-item">
              <span class="calc-res-lbl">Total Depth of Field (DoF)</span>
              <span class="calc-res-val" id="calc-res-dof">0.96 mm</span>
            </div>
            <div class="calc-res-item">
              <span class="calc-res-lbl">Effective Aperture</span>
              <span class="calc-res-val" id="calc-res-eff">f/16.0</span>
            </div>
            <div class="calc-res-item">
              <span class="calc-res-lbl">Working Distance (Subject-to-Sensor)</span>
              <span class="calc-res-val" id="calc-res-dist">400 mm</span>
            </div>
            <div class="calc-res-item">
              <span class="calc-res-lbl">Recommended Stack Slices (2mm Relief)</span>
              <span class="calc-res-val" id="calc-res-steps">3 - 4 Slices</span>
            </div>
          </div>
          <div class="calc-diffraction-alert" id="calc-diffraction-alert" style="display:none">
            ⚠️ <strong>Diffraction Softening Detected:</strong> Effective aperture exceeds f/16. Rayleigh limit softens micro-devices. Stop down to f/8 and shoot a focus stack for maximum relief acuity.
          </div>
        </div>

        <!-- 2. Studio Lighting Guide -->
        <div class="lab-card-pro reveal" id="lighting-guide-card">
          <h3 style="margin:0 0 0.25rem;font-size:1.1rem">💡 Numismatic Studio Lighting Guide</h3>
          <p style="margin:0;font-size:0.8rem;color:var(--muted)">Interactive studio setup configurations engineered for numismatic grading and luster capture.</p>
          
          <div class="lighting-studio-guide">
            <div class="lighting-mode-card active" data-light-mode="axial">
              <span class="lmc-badge">PROOF & CAMEO</span>
              <div class="lmc-title">
                <span>🪞 Axial Lighting (45° Beam Splitter)</span>
              </div>
              <p class="lmc-desc">Coaxial beam-splitter glass placed between lens and coin at 45°. Eliminates dark mirrored fields, producing deep jet-black mirrored fields and blazing white frosted devices.</p>
            </div>

            <div class="lighting-mode-card" data-light-mode="cross-polar">
              <span class="lmc-badge">SLABS & TONING</span>
              <div class="lmc-title">
                <span>⚡ Cross-Polarized Twin Strobes</span>
              </div>
              <p class="lmc-desc">Dual 45° diffuse strobes fitted with linear polarizers perpendicular to the camera circular polarizer. Cancels 100% of scratched slab plastic reflections to show vivid target toning.</p>
            </div>

            <div class="lighting-mode-card" data-light-mode="oblique">
              <span class="lmc-badge">ERRORS & RELIEF</span>
              <div class="lmc-title">
                <span>📐 Oblique Low-Rake Lighting (15°)</span>
              </div>
              <p class="lmc-desc">Low glancing grazing light from 10:00 or 2:00. Casts crisp micro-shadows along die cracks, doubling, repunched dates, and high-point hair friction.</p>
            </div>

            <div class="lighting-mode-card" data-light-mode="diffuse">
              <span class="lmc-badge">CARTWHEEL LUSTER</span>
              <div class="lmc-title">
                <span>🔆 Dual Soft-Dome High-Angle (60°)</span>
              </div>
              <p class="lmc-desc">Continuous high-CRI LED ring or dual hemispherical diffusers. Captures authentic unbroken spinning cartwheel luster bands on uncirculated mint state silver.</p>
            </div>
          </div>
        </div>

        <!-- 3. Specimen Die Alignment Sandbox -->
        <div class="lab-card-pro reveal" id="die-sandbox-card">
          <h3 style="margin:0 0 0.25rem;font-size:1.1rem">🧭 Specimen Die Alignment Sandbox</h3>
          <p style="margin:0;font-size:0.8rem;color:var(--muted)">Test coin vs. medallic die axis orientation, inspect rotated die errors, and verify physical strike alignment.</p>

          <div class="sandbox-tool">
            <div class="sandbox-canvas-wrap">
              <canvas id="sandbox-canvas" width="240" height="240"></canvas>
            </div>
            <div class="sandbox-controls">
              <div class="sb-ctrl-row">
                <div class="sb-ctrl-head">
                  <span>Die Standard Preset</span>
                  <span class="sb-ctrl-val" id="sb-preset-name">Coin Alignment (↑↓ 180°)</span>
                </div>
                <div style="display:flex;gap:0.5rem">
                  <button type="button" class="btn small" id="sb-btn-coin" style="flex:1">Coin (↑↓ 180°)</button>
                  <button type="button" class="btn small" id="sb-btn-medal" style="flex:1">Medal (↑↑ 0°)</button>
                </div>
              </div>

              <div class="sb-ctrl-row">
                <div class="sb-ctrl-head">
                  <span>Reverse Die Rotation</span>
                  <span class="sb-ctrl-val" id="sb-rot-val">180° (6 o'clock)</span>
                </div>
                <input type="range" id="sb-rot-slider" min="0" max="360" step="5" value="180" class="sim-range range-ag" />
              </div>

              <div class="sb-ctrl-row">
                <div class="sb-ctrl-head">
                  <span>Obverse / Reverse Overlay Blend</span>
                  <span class="sb-ctrl-val" id="sb-blend-val">50% Blend</span>
                </div>
                <input type="range" id="sb-blend-slider" min="0" max="100" step="5" value="50" class="sim-range range-au" />
              </div>

              <div id="sb-error-badge" style="font-size:0.75rem;padding:0.5rem 0.75rem;border-radius:6px;background:rgba(200,169,74,0.1);border:1px solid var(--line);color:var(--ink)">
                <strong>Standard US Strike:</strong> Head and Eagle inverted when rotated vertically. Die axis is 180° (6:00).
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function initLabProSuite() {
    // 0. Phase 2 Staging Album Handlers
    const btnCopyPath = $("#btn-copy-staging-path");
    if (btnCopyPath) {
      btnCopyPath.onclick = (e) => {
        e.preventDefault();
        const p2Path = "G:\\My Drive\\Titan Reliquary\\PHOTO_STAGING\\STAGE_1_RAW\\";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(p2Path).then(() => {
            showToast("Copied staging folder path to clipboard!");
          }).catch(() => {
            showToast(p2Path);
          });
        } else {
          showToast(p2Path);
        }
      };
    }

    const btnOpenFilter = $("#btn-open-staging-filter");
    if (btnOpenFilter) {
      btnOpenFilter.onclick = (e) => {
        e.preventDefault();
        flipFilter = { ...flipFilter, staging: true, q: "", country: "", iso: "", year: "", silverOnly: false, phase2: false };
        cabinetTray = "all";
        setWing("gallery");
        renderGallery();
        window.scrollTo({ top: 0, behavior: "smooth" });
        showToast("Showing Pro Photo Phase 2 Staging Album (5 Masterpieces)");
      };
    }

    $$("#phase2-staging-card button[data-scan]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        dossierCtx = null;
        openDrawer(btn.dataset.scan);
      };
    });

    // 1. Macro Calculator
    const sensorEl = $("#calc-sensor");
    const focalEl = $("#calc-focal");
    const aperEl = $("#calc-aperture");
    const magEl = $("#calc-mag");
    const dofEl = $("#calc-res-dof");
    const effEl = $("#calc-res-eff");
    const distEl = $("#calc-res-dist");
    const stepsEl = $("#calc-res-steps");
    const alertEl = $("#calc-diffraction-alert");

    const updateCalc = () => {
      if (!sensorEl || !focalEl || !aperEl || !magEl) return;
      const c = parseFloat(sensorEl.value) || 0.030;
      const f = parseFloat(focalEl.value) || 100;
      const N = parseFloat(aperEl.value) || 8.0;
      const m = parseFloat(magEl.value) || 1.0;

      // DoF = 2 * N * c * (m + 1) / (m^2)
      const dof = (2 * N * c * (m + 1)) / (m * m);
      const nEff = N * (1 + m);
      const totalDist = f * ((m + 1) * (m + 1)) / m;
      const reliefHeight = 2.0; // typical coin relief in mm
      const slices = Math.max(1, Math.ceil(reliefHeight / (dof * 0.75)));

      if (dofEl) dofEl.textContent = dof.toFixed(2) + " mm";
      if (effEl) effEl.textContent = "f/" + nEff.toFixed(1);
      if (distEl) distEl.textContent = Math.round(totalDist) + " mm (" + (totalDist / 10).toFixed(1) + " cm)";
      if (stepsEl) {
        stepsEl.textContent = slices === 1 ? "1 Single Shot" : `${slices} - ${slices + 2} Focus Slices`;
      }
      if (alertEl) {
        alertEl.style.display = nEff >= 16.0 ? "flex" : "none";
      }
    };

    [sensorEl, focalEl, aperEl, magEl].forEach((el) => {
      el?.addEventListener("change", updateCalc);
    });
    updateCalc();

    // 2. Studio Lighting Guide
    $$("#lighting-guide-card .lighting-mode-card").forEach((card) => {
      card.onclick = () => {
        $$("#lighting-guide-card .lighting-mode-card").forEach((c) => c.classList.toggle("active", c === card));
        playStapleClick();
      };
    });

    // 3. Specimen Die Alignment Sandbox Canvas
    const canvas = $("#sandbox-canvas");
    const rotSlider = $("#sb-rot-slider");
    const blendSlider = $("#sb-blend-slider");
    const rotValEl = $("#sb-rot-val");
    const blendValEl = $("#sb-blend-val");
    const presetNameEl = $("#sb-preset-name");
    const badgeEl = $("#sb-error-badge");
    const btnCoin = $("#sb-btn-coin");
    const btnMedal = $("#sb-btn-medal");

    if (!canvas) return;
    const g = canvas.getContext("2d");

    const drawSandbox = () => {
      const rot = parseInt(rotSlider?.value || "180", 10);
      const blend = parseInt(blendSlider?.value || "50", 10) / 100;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 240 * dpr;
      canvas.height = 240 * dpr;
      g.resetTransform?.();
      g.scale(dpr, dpr);

      const cx = 120, cy = 120, r = 95;
      g.clearRect(0, 0, 240, 240);

      // Outer bezel / compass dial
      g.strokeStyle = "rgba(255, 255, 255, 0.15)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, r + 12, 0, Math.PI * 2);
      g.stroke();

      // Tick marks every 30 deg (12 clock hours)
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg - 90) * (Math.PI / 180);
        const isMajor = deg % 90 === 0;
        const tickLen = isMajor ? 8 : 4;
        const x1 = cx + Math.cos(rad) * (r + 12);
        const y1 = cy + Math.sin(rad) * (r + 12);
        const x2 = cx + Math.cos(rad) * (r + 12 - tickLen);
        const y2 = cy + Math.sin(rad) * (r + 12 - tickLen);
        g.strokeStyle = isMajor ? "rgba(200, 169, 74, 0.8)" : "rgba(255, 255, 255, 0.2)";
        g.lineWidth = isMajor ? 2 : 1;
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }

      // Compass labels
      g.fillStyle = "rgba(200, 169, 74, 0.85)";
      g.font = "9px monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("12:00 (0°)", cx, cy - r - 18);
      g.fillText("6:00 (180°)", cx, cy + r + 18);
      g.fillText("9:00", cx - r - 16, cy);
      g.fillText("3:00", cx + r + 16, cy);

      // Coin circle backdrop
      g.fillStyle = "#12141c";
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(200, 169, 74, 0.4)";
      g.lineWidth = 2;
      g.stroke();

      // 1. Obverse Layer (0 deg fixed) - Golden Hue
      const obvAlpha = Math.max(0.05, 1 - blend);
      g.save();
      g.globalAlpha = obvAlpha;
      g.fillStyle = "rgba(200, 169, 74, 0.25)";
      g.beginPath(); g.arc(cx, cy, r - 4, 0, Math.PI * 2); g.fill();
      // Obverse relief bust silhouette
      g.fillStyle = "rgba(240, 215, 140, 0.75)";
      g.beginPath();
      g.arc(cx, cy - 14, 24, 0, Math.PI * 2); // Head
      g.fill();
      g.beginPath();
      g.moveTo(cx - 32, cy + 38);
      g.quadraticCurveTo(cx, cy - 2, cx + 32, cy + 38);
      g.lineTo(cx - 32, cy + 38);
      g.fill();
      g.fillStyle = "rgba(240, 215, 140, 0.9)";
      g.font = "bold 9px sans-serif";
      g.fillText("OBVERSE · LIBERTY", cx, cy + 54);
      g.restore();

      // 2. Reverse Layer (rot deg) - Silver/Cyan Hue
      const revAlpha = Math.max(0.05, blend);
      g.save();
      g.translate(cx, cy);
      g.rotate((rot * Math.PI) / 180);
      g.globalAlpha = revAlpha;
      g.fillStyle = "rgba(100, 180, 255, 0.22)";
      g.beginPath(); g.arc(0, 0, r - 4, 0, Math.PI * 2); g.fill();
      // Reverse heraldic eagle silhouette
      g.fillStyle = "rgba(180, 220, 255, 0.85)";
      g.beginPath();
      g.moveTo(0, -32);
      g.lineTo(26, -6);
      g.lineTo(16, 12);
      g.lineTo(0, 4);
      g.lineTo(-16, 12);
      g.lineTo(-26, -6);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(0, -30, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(180, 220, 255, 0.95)";
      g.font = "bold 9px sans-serif";
      g.fillText("REVERSE · EAGLE", 0, 42);

      // Alignment axis vector
      g.strokeStyle = "#38bdf8";
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -r + 10);
      g.stroke();
      // Arrowhead
      g.fillStyle = "#38bdf8";
      g.beginPath();
      g.moveTo(0, -r + 4);
      g.lineTo(-5, -r + 16);
      g.lineTo(5, -r + 16);
      g.closePath();
      g.fill();
      g.restore();

      // Update text outputs
      const clockH = Math.round((rot / 30) % 12) || 12;
      if (rotValEl) rotValEl.textContent = `${rot}° (${clockH} o'clock)`;
      if (blendValEl) blendValEl.textContent = `${Math.round(blend * 100)}% Reverse`;

      if (badgeEl) {
        if (Math.abs(rot - 180) <= 5) {
          badgeEl.innerHTML = `<strong>Standard US Coin Strike (↑↓ 180°):</strong> Inverted obverse/reverse axis. Eagle is upright when coin is flipped vertically. Normal strike.`;
          badgeEl.style.borderColor = "var(--line)";
          if (presetNameEl) presetNameEl.textContent = "US Coin Standard (↑↓ 180°)";
        } else if (rot <= 5 || rot >= 355) {
          badgeEl.innerHTML = `<strong>Standard Medallic Strike (↑↑ 0°):</strong> Upright obverse/reverse axis. Reverse is upright when coin is rotated like a book page. European standard.`;
          badgeEl.style.borderColor = "var(--line)";
          if (presetNameEl) presetNameEl.textContent = "Medallic Standard (↑↑ 0°)";
        } else {
          const dev = rot > 180 ? rot - 180 : 180 - rot;
          badgeEl.innerHTML = `⚠️ <strong style="color:#f59e0b">Rotated Die Error Detected:</strong> ${rot}° (${clockH}:00). Variance is <strong>${dev}°</strong> from US coin standard. Potential collector premium error!`;
          badgeEl.style.borderColor = "#f59e0b";
          if (presetNameEl) presetNameEl.textContent = `Rotated Die (${rot}°)`;
        }
      }
    };

    rotSlider?.addEventListener("input", drawSandbox);
    blendSlider?.addEventListener("input", drawSandbox);

    btnCoin?.addEventListener("click", () => {
      if (rotSlider) rotSlider.value = "180";
      playCoinChime();
      drawSandbox();
    });

    btnMedal?.addEventListener("click", () => {
      if (rotSlider) rotSlider.value = "0";
      playCoinChime();
      drawSandbox();
    });

    drawSandbox();
  }

  /** The Conservation Lab: Phase-2 photo QC command center. */
  /* Phase 1 reshoot list (data/reshoot.json from tools/pipeline/build_reshoot.py): coins with no usable phone photo, and why. */
  let reshootData = null;
  async function renderReshoot() {
    const el = $("#reshoot"); if (!el) return;
    try { reshootData = reshootData || await fetchJson("data/reshoot.json"); } catch (e) { el.hidden = true; return; }
    const d = reshootData, order = ["none", "together", "unusable", "too_big", "not_round"];
    const head = { none: "Not photographed yet", together: "Photograph on its own (group photo of look-alikes)", unusable: "Retake (blurry, glare or cut off)", too_big: "Re-upload a smaller copy (file too big)", not_round: "Nothing to do (Claude will crop these)" };
    const groups = order.filter((k) => d.counts[k]).map((k) => {
      const rows = d.items.filter((i) => i.reason === k).map((i) => `<li><button type="button" class="rs-coin" data-scan="${esc(i.id)}"><strong>${esc(i.id)}</strong> ${esc(i.country || "")} ${esc(i.year || "")} · ${esc(String(i.denom || "").split(" · ")[0])}</button></li>`).join("");
      return `<details class="rs-group"${k === "together" || k === "too_big" ? " open" : ""}><summary><span class="rs-n">${intFmt(d.counts[k])}</span> ${esc(head[k])}</summary><p class="rs-why">${esc(d.reasons[k])}</p><ul class="rs-list">${rows}</ul></details>`;
    }).join("");
    const todo = d.total - (d.counts.not_round || 0);
    el.innerHTML = `<div class="sec-head"><span class="eyebrow">Phase 1</span><h2 id="reshoot-h">Phone photos still needed</h2>
      <p class="sub">${todo ? `${intFmt(todo)} flips still need a phone photo (one side, with your pen label showing). Drop them in Drive STAGING.` : "Every flip has a phone photo."}</p>
      <button type="button" class="btn small" id="rs-print">Print this list</button></div>${groups}`;
    $$("#reshoot .rs-coin").forEach((b) => b.addEventListener("click", () => openDrawer(b.dataset.scan)));
    $("#rs-print")?.addEventListener("click", () => {
      $$("#reshoot details").forEach((x) => (x.open = true));
      document.body.classList.add("print-reshoot");
      window.addEventListener("afterprint", () => document.body.classList.remove("print-reshoot"), { once: true });
      window.print();
    });
  }

  function renderLab() {
    const { live, queue, done } = shootingData();
    const pct = live.length ? Math.round((done / live.length) * 100) : 0;
    const badge = $("#lab-badge");
    if (badge) { badge.hidden = !live.length; badge.textContent = pct + "%"; }

    const d = vault.drip || {};
    const ids = d.next_ids || {};
    const idRows = Object.entries(ids)
      .map(([k, v]) => `<div class="id-row"><span>${esc(k)}</span><strong>${esc(String(v))}</strong></div>`)
      .join("");
    const ser = (d.next_ser || [])
      .slice(0, 50)
      .map((r) => `<tr><td class="ser">${esc(r.iso)}</td><td>${esc(r.country)}</td><td>${esc(r.cont)}</td><td class="num">${esc(intFmt(r.count))}</td><td class="ser">${esc(r.next)}</td></tr>`)
      .join("");

    $("#lab-body").innerHTML = `
      <section id="reshoot" class="reshoot" aria-labelledby="reshoot-h"></section>
      ${window.TitanLab ? '<div id="lab-ws"></div>' : shootingSec()}
      <div class="sec-head reveal"><span class="eyebrow">Work orders</span><h2>Requests from Titan</h2><p class="sub">Small things you could do to firm up the data.</p></div>
      ${requestsModule()}
      <div class="grid two">
        <div class="card reveal"><h3>Next IDs</h3>${idRows || '<p class="empty">No pending IDs</p>'}</div>
        <div class="card reveal"><h3>Next SER by country</h3>
          <div class="table-wrap" style="max-height:320px;margin-top:0.5rem">
            <table class="data">
              <thead><tr><th>ISO</th><th>Country</th><th>Cont</th><th class="num">Count</th><th>Next</th></tr></thead>
              <tbody>${ser || '<tr><td colspan="5" class="empty">—</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
      ${window.TitanLab ? '<div id="lab-bench"></div>' : renderLabProSuite()}
    `;
    renderReshoot();
    // Session buttons open the Gallery pre-filtered to that country's shooting list.
    $$("#lab-body [data-session]").forEach((btn) => {
      btn.addEventListener("click", () => {
        flipFilter = { ...flipFilter, phase2: true, q: "", year: "", silverOnly: false, country: btn.dataset.session };
        flipSort = { key: "ser", dir: 1 };
        renderGallery(); setWing("gallery"); window.scrollTo(0, 0);
        showToast("Session: " + btn.dataset.session + " — awaiting Phase 2");
      });
    });
    $("#req-more")?.addEventListener("click", () => { reqVisible += 4; renderLab(); });
    $$("#lab-body .req[data-href]").forEach((el) => {
      el.addEventListener("click", () => {
        const href = el.dataset.href;
        if (!href) return;
        const cm = href.match(/^#coin=(.+)$/);
        if (cm) { openDrawer(cm[1], true); return; }
        if (href.startsWith("#")) { setWing(mapWing(href.replace(/^#/, ""))); window.scrollTo(0, 0); }
      });
    });
    if (window.TitanLab) window.TitanLab.mount({ openDrawer: (s) => openDrawer(s, true), showToast, playClick: playStapleClick }); else initLabProSuite();
    observeReveals($("#lab-body"));
  }


  /** Study: the precious-metals ledger (moved here from the old Board). */
  function metalsSec() {
    const b = vault.board || {};
    const m = vault.metals || {};
    const vaultN = b.vault || 0;
    const next = b.next_soft_beat || 1700;
    const prev = Math.floor(vaultN / 100) * 100;
    const denom = Math.max(1, next - prev);
    const pct = Math.min(100, Math.max(0, ((vaultN - prev) / denom) * 100));
    const prec = vault.precious || {};
    const flipAgOz = prec.flip_silver?.oz, flipAgMelt = prec.flip_silver?.melt, flipAgN = prec.flip_silver?.n ?? 0;
    const flipAgUnk = (prec.flip_silver?.unknown || []).length;
    const combAgOz = prec.combined_silver?.oz ?? m.oz?.ag ?? b.silver?.oz;
    const combAgMelt = prec.combined_silver?.melt ?? m.melt?.ag_usd ?? b.silver?.melt;
    const bullAgOz = prec.bullion_silver?.oz, bullAgMelt = prec.bullion_silver?.melt;
    const auOz = m.oz?.au ?? b.gold?.oz, auMelt = m.melt?.au_usd ?? b.gold?.melt;
    return `
      <div class="sec-head reveal" id="sec-metals"><span class="eyebrow">The ledger</span><h2>Precious metal</h2>
      <p class="sub">Live spot when online · ${esc(m.as_of_local || m.as_of || "—")}</p></div>
      <div class="grid">
        <div class="card reveal"><h3>Ledger board total</h3><div class="val">${money(b.grand)}</div><div class="hint">at the ${esc(m.as_of || "ledger")} board prices · ${esc(vault.policy || "HOLD")}</div></div>
        <div class="card reveal"><h3>Vault pieces</h3><div class="val">${esc(intFmt(vaultN))}</div>
          <div class="hint">Next soft beat ${esc(intFmt(next))}</div>
          <div class="progress-wrap"><div class="progress" title="${vaultN} / ${next}"><span style="width:${pct}%"></span></div></div>
        </div>
        <div class="card reveal"><h3>Flips</h3><div class="val">${esc(intFmt(vault.counts?.flips ?? 0))}</div><div class="hint">${money(b.flips?.usd)} · white 2×2</div></div>
        <div class="card reveal"><h3>Countries</h3><div class="val">${esc(intFmt(vault.counts?.countries ?? 0))}</div><div class="hint">World flips</div></div>
        <div class="card reveal"><h3>Board Ag</h3><div class="val">${combAgOz != null ? num(combAgOz, 2) + " oz" : "—"}</div><div class="hint">Melt ${money(combAgMelt)} · spot ${money(m.spot?.ag_usd_oz)} · METALS</div></div>
        <div class="card reveal"><h3>Gold</h3><div class="val">${auOz != null ? num(auOz, 4) + " oz" : "—"}</div><div class="hint">Melt ${money(auMelt)} · spot ${money(m.spot?.au_usd_oz)}</div></div>
        <div class="card reveal"><h3>Flip silver</h3><div class="val">${flipAgOz != null ? num(flipAgOz, 4) + " oz" : "—"}</div><div class="hint">${money(flipAgMelt)} @ live · ${intFmt(flipAgN)} flips${flipAgUnk ? " · " + flipAgUnk + " ASW unknown" : ""}</div></div>
        <div class="card reveal"><h3>Bullion Ag</h3><div class="val">${bullAgOz != null ? num(bullAgOz, 4) + " oz" : "—"}</div><div class="hint">Melt ${money(bullAgMelt)} · B### stack</div></div>
      </div>`;
  }

  /** Study: bucket breakdown + age summary (moved here from the old Board). */
  function bucketsSec() {
    const b = vault.board || {};
    const buckets = [["Flips", b.flips], ["Bullion", b.bullion], ["Albums", b.albums], ["Sets", b.sets], ["Housing", b.housing], ["Stamps", b.stamps]];
    const bucketHtml = buckets
      .map(([k, v]) => {
        if (!v || v.usd == null) return "";
        const extra = v.cards != null ? ` · ${intFmt(v.cards)} cards` : v.folders != null ? ` · ${intFmt(v.folders)} folders` : "";
        return `<div class="bucket-row"><span class="k">${esc(k)}</span><span class="v">${money(v.usd)}${esc(extra)}</span></div>`;
      })
      .join("");
    const ageFo = vault.age?.flips_other || {}, ageAl = vault.age?.albums || {};
    const foYear = b.age_flips?.mean_year ?? ageFo.mean_year, foAge = b.age_flips?.mean_age ?? ageFo.mean_age;
    const alYear = b.age_albums?.mean_year ?? ageAl.mean_year, alAge = b.age_albums?.mean_age ?? ageAl.mean_age;
    return `
      <div class="sec-head reveal" id="sec-buckets"><span class="eyebrow">Holdings</span><h2>Storage Buckets</h2>
      <p class="sub">Asset distribution across binders, flips, bullion tubes, and sets</p></div>
      <div class="grid two">
        <div class="card reveal"><h3>Bucket breakdown</h3>${bucketHtml || '<p class="empty">No board rows</p>'}</div>
        <div class="card reveal"><h3>Age (board)</h3>
          <div class="bucket-row"><span class="k">Flips+other mean</span><span class="v">${precise(foYear, 1)} · ${precise(foAge, 1)} yrs</span></div>
          <div class="bucket-row"><span class="k">Albums mean</span><span class="v">${precise(alYear, 1)} · ${precise(alAge, 1)} yrs</span></div>
          <div class="hint" style="margin-top:0.6rem">Albums kept separate · details below</div>
        </div>
      </div>`;
  }

  /** Study: age bands + albums (moved here from the old Age tab). */
  let albumViewMode = "shelf"; // "shelf" | "matrix"
  let albumCategoryFilter = "all"; // "all" | "silver" | "classic" | "modern" | "world"
  let activeAlbumPage = 1;
  let activeAlbumSpreadMode = false;
  let activeAlbumPageFlipped = false;

  const ALBUM_FAMILIES_CONFIG = {
    "American Silver Eagles": { theme: "navy", cat: "silver", emblem: "🦅", spec: ".999 Silver Bullion", title: "American Silver Eagles", era: "1986–Present", maker: "Whitman Deluxe Leatherette" },
    "Kennedy halves": { theme: "chestnut", cat: "silver", emblem: "🗽", spec: "90% & 40% Silver / Clad", title: "Kennedy Halves", era: "1964–Present", maker: "Dansco 7166 Archival" },
    "Washington quarters": { theme: "forest", cat: "modern", emblem: "🏛️", spec: "90% Silver & CuNi Clad", title: "Washington Quarters", era: "1932–Present", maker: "Whitman Classic #9125" },
    "Dollar albums": { theme: "gold", cat: "modern", emblem: "🪙", spec: "Golden Manganese & Clad", title: "Dollar Albums", era: "1971–Present", maker: "Whitman #9144" },
    "Roosevelt dimes": { theme: "cobalt", cat: "modern", emblem: "🌿", spec: "90% Silver & CuNi Clad", title: "Roosevelt Dimes", era: "1946–Present", maker: "Whitman #9029 / #9030" },
    "Lincoln cents": { theme: "copper", cat: "classic", emblem: "🌾", spec: "95% Bronze & Zinc Clad", title: "Lincoln Cents", era: "1909–Present", maker: "Whitman #9004 / #9030" },
    "Indian / Flying Eagle": { theme: "burgundy", cat: "classic", emblem: "🪶", spec: "CuNi & Bronze", title: "Indian / Flying Eagle", era: "1856–1909", maker: "Whitman Deluxe #9003" },
    "Type set": { theme: "obsidian", cat: "classic", emblem: "⚜️", spec: "Gold, Silver, Bronze & Clad", title: "20th Century Type Set", era: "1900–1999", maker: "Whitman #9046" },
    "Jefferson nickels": { theme: "sage", cat: "modern", emblem: "🏛️", spec: "Cupronickel & 35% Silver", title: "Jefferson Nickels", era: "1938–Present", maker: "Whitman #9009" },
    "Canada small cents": { theme: "crimson", cat: "world", emblem: "🍁", spec: "98% Bronze & Zinc Clad", title: "Canada Small Cents", era: "1920–2012", maker: "Whitman Canada Classic" },
    "Buffalo nickels": { theme: "saddle", cat: "classic", emblem: "🦬", spec: "75% Copper / 25% Nickel", title: "Buffalo Nickels", era: "1913–1938", maker: "Whitman #9007" },
    "Mercury": { theme: "indigo", cat: "silver", emblem: "🪽", spec: "90% Fine Silver (0.0723 oz ASW)", title: "Mercury Head Dimes", era: "1916–1945", maker: "Whitman #9014" }
  };

  function ageSec() {
    const age = vault.age || {};
    const fo = age.flips_other || {};
    const al = age.albums || {};
    const glance = vault.albums_glance || [];
    const mdSep = (s) => typeof s === "string" && /^[\s:|\-]+$/.test(s) && /[-|]/.test(s);
    const isRealAlbum = (g) => {
      if (!g || !g.family) return false;
      if (mdSep(g.family)) return false;
      const fam = String(g.family).trim();
      const ids = String(g.ids || "").trim();
      if (fam.startsWith("$") || fam.startsWith("---") || fam === "Flips" || fam === "Country") return false;
      if (ids === "Sets" || ids === "ISO" || ids.startsWith("$") || ids.startsWith("---")) return false;
      return true;
    };

    const realAlbums = glance.filter(isRealAlbum);
    const stagingRow = {
      family: "★ PRO PHOTO PHASE 2 STAGING ALBUM",
      ids: "A-P2-STAGE",
      coins: 5,
      total: 170.40,
      pulse: "Drive Shared Queue · PHOTO_STAGING_PHASE2/",
      isStaging: true
    };
    const combinedGlance = [stagingRow, ...realAlbums];

    // Filter by active category
    const filteredAlbums = combinedGlance.filter(g => {
      if (g.isStaging) return true;
      if (albumCategoryFilter === "all") return true;
      const cfg = ALBUM_FAMILIES_CONFIG[g.family];
      return cfg && cfg.cat === albumCategoryFilter;
    });

    // 1. Archival Bookshelf Binder Cards
    const shelfCardsHtml = filteredAlbums.map(g => {
      if (g.isStaging) {
        return `
          <div class="album-binder-card binder-theme-gold staging-binder-card" data-album-family="${esc(g.family)}" style="border:1.5px solid var(--gold);background:linear-gradient(135deg, rgba(200,169,74,0.15), rgba(13,18,28,0.95))">
            <div class="binder-card-top">
              <div>
                <span class="badge" style="background:var(--gold);color:#08090c;font-weight:700">MACRO RIG QUEUE</span>
                <h4 class="binder-card-title" style="margin-top:0.35rem">★ Pro Photo Staging</h4>
                <div class="binder-card-sub">${esc(g.ids)} · Tethered Phase 2 RAW Mission</div>
              </div>
              <span class="binder-card-emblem">📸</span>
            </div>
            <div class="binder-stats-row">
              <div><div class="binder-stat-val gold">${esc(intFmt(g.coins))}</div><div class="binder-stat-lbl">Specimens</div></div>
              <div><div class="binder-stat-val">Phase 2</div><div class="binder-stat-lbl">Queue</div></div>
              <div><div class="binder-stat-val gold">${money(g.total)}</div><div class="binder-stat-lbl">Est Value</div></div>
            </div>
            <div class="binder-progress-line">
              <div class="binder-progress-meta"><span>Drive Shared Queue</span><span style="color:var(--gold-soft)">Ready</span></div>
              <div class="binder-track"><div class="binder-fill" style="width:100%"></div></div>
            </div>
            <div class="binder-actions-row">
              <button type="button" class="btn small binder-btn-open" id="btn-open-staging-album">🔬 Open Staging in Lab</button>
            </div>
          </div>
        `;
      }

      const cfg = ALBUM_FAMILIES_CONFIG[g.family] || {
        theme: "obsidian",
        cat: "classic",
        emblem: "📖",
        spec: "Archival Series",
        title: g.family,
        era: "Numismatic",
        maker: "Archival Binder"
      };

      const meta = ALBUM_METADATA[g.family];
      let totalCap = 0;
      let totalHoles = 0;
      if (meta && meta.volumes) {
        for (const v of Object.values(meta.volumes)) {
          totalCap += (v.totalSlots || 0);
          totalHoles += (v.masterMissing != null ? v.masterMissing : (v.holes ? v.holes.length : Math.max(0, (v.totalSlots || 0) - (v.filled || 0))));
        }
      }
      if (totalCap === 0) totalCap = Math.max(g.coins, 30);
      const fillPct = Math.min(100, Math.round((g.coins / totalCap) * 100));

      return `
        <div class="album-binder-card binder-theme-${cfg.theme}" data-album-family="${esc(g.family)}" data-album-ids="${esc(g.ids)}">
          <div class="binder-card-top">
            <div>
              <span class="badge" style="background:rgba(255,255,255,0.08);color:var(--gold-soft);font-size:0.68rem">${cfg.maker.toUpperCase()}</span>
              <h4 class="binder-card-title">${esc(cfg.title)}</h4>
              <div class="binder-card-sub">${esc(g.ids)} · ${esc(cfg.era)} · ${esc(cfg.spec)}</div>
            </div>
            <span class="binder-card-emblem">${cfg.emblem}</span>
          </div>
          <div class="binder-stats-row">
            <div><div class="binder-stat-val">${esc(intFmt(g.coins))}</div><div class="binder-stat-lbl">Logged</div></div>
            <div><div class="binder-stat-val gold">${fillPct}%</div><div class="binder-stat-lbl">Filled</div></div>
            <div><div class="binder-stat-val gold">${money(g.total)}</div><div class="binder-stat-lbl">Book Val</div></div>
          </div>
          <div class="binder-progress-line">
            <div class="binder-progress-meta">
              <span>${intFmt(g.coins)} of ${intFmt(totalCap)} slots</span>
              <span style="color:${fillPct > 70 ? '#34d399' : 'var(--gold-soft)'}">${totalHoles} holes open</span>
            </div>
            <div class="binder-track">
              <div class="binder-fill" style="width:${fillPct}%"></div>
            </div>
          </div>
          <div style="font-size:0.75rem;color:var(--ink-soft);margin-bottom:0.85rem;line-height:1.4">
            ${esc(g.pulse)}
          </div>
          <div class="binder-actions-row">
            <button type="button" class="btn small binder-btn-open btn-open-album-inspector" data-album-family="${esc(g.family)}" data-album-ids="${esc(g.ids)}">📖 Open Binder</button>
            <button type="button" class="btn small binder-btn-holes btn-open-album-holes" data-album-family="${esc(g.family)}" data-album-ids="${esc(g.ids)}" title="Inspect open holes in this binder">🔍 Holes</button>
          </div>
        </div>
      `;
    }).join("");

    // 2. Ledger Matrix Table View
    const glanceBody = filteredAlbums.map((g) => {
      if (g.isStaging) {
        return `<tr class="staging-album-row" style="background:rgba(200,169,74,0.12);font-weight:600;cursor:pointer" title="Click to view Pro Photo Staging Album in Lab">
          <td><strong style="color:var(--gold-soft)">${esc(g.family)}</strong></td>
          <td class="ids" style="color:var(--gold)">${esc(g.ids)}</td>
          <td class="num">${esc(intFmt(g.coins))}</td>
          <td class="num" style="color:var(--gold)">${money(g.total)}</td>
          <td style="color:var(--gold-soft)">${esc(g.pulse)}</td>
        </tr>`;
      }
      return `<tr class="interactive-album-row" data-album-family="${esc(g.family)}" data-album-ids="${esc(g.ids)}" title="Click to inspect ${esc(g.family)} album slots &amp; missing holes" style="cursor:pointer">
        <td><strong style="color:var(--ink)">${esc(g.family)}</strong> <span style="font-size:0.75rem;color:var(--gold);opacity:0.9;margin-left:0.35rem">📖 Inspect</span></td>
        <td class="muted ids">${esc(g.ids)}</td>
        <td class="num">${esc(intFmt(g.coins))}</td>
        <td class="num">${money(g.total)}</td>
        <td class="muted">${esc(g.pulse)}</td>
      </tr>`;
    }).join("");

    return `
      <div class="sec-head reveal" id="sec-age"><span class="eyebrow">Patina</span><h2>Age &amp; Albums</h2>
      <p class="sub">As of ${esc(age.as_of || "—")} · ref ${esc(String(age.reference_year ?? ""))}</p></div>
      <div class="grid two">
        <div class="card reveal" style="opacity:1 !important; transform:none !important">
          <h3>Flips + other</h3>
          <div class="bucket-row"><span class="k">Dated</span><span class="v">${esc(intFmt(fo.n_dated ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">ND excluded</span><span class="v">${esc(intFmt(fo.n_ND_excluded ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">Mean year</span><span class="v">${precise(fo.mean_year, 1)}</span></div>
          <div class="bucket-row"><span class="k">Mean age</span><span class="v">${precise(fo.mean_age, 1)} yrs</span></div>
          <div class="bucket-row"><span class="k">Oldest → newest</span><span class="v">${esc(String(fo.oldest ?? "—"))} → ${esc(String(fo.newest ?? "—"))}</span></div>
        </div>
        <div class="card reveal" style="opacity:1 !important; transform:none !important">
          <h3>Albums (separate)</h3>
          <div class="bucket-row"><span class="k">Dated / total</span><span class="v">${esc(intFmt(al.n_dated_known ?? al.n_dated ?? "—"))} / ${esc(intFmt(al.n_total_album_coins ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">Coverage</span><span class="v">${al.coverage_pct != null ? num(al.coverage_pct, 1) + "%" : "—"}</span></div>
          <div class="bucket-row"><span class="k">Mean year</span><span class="v">${precise(al.mean_year, 1)}</span></div>
          <div class="bucket-row"><span class="k">Mean age</span><span class="v">${precise(al.mean_age, 1)} yrs</span></div>
          <div class="bucket-row"><span class="k">Oldest → newest</span><span class="v">${esc(String(al.oldest ?? "—"))} → ${esc(String(al.newest ?? "—"))}</span></div>
        </div>
      </div>
      <div class="card reveal age-albums-card" style="opacity:1 !important; transform:none !important">
        <div class="album-shelf-header">
          <div>
            <h3 style="margin:0 0 0.25rem;color:var(--gold-soft);font-size:1.35rem">Numismatic Album Library</h3>
            <div style="font-size:0.8rem;color:var(--ink-soft);font-family:var(--mono)">12 Master Collections · 32 Archival Volumes · 930 Staged Coins</div>
          </div>
          <div class="album-shelf-views">
            <button type="button" class="btn small album-shelf-view-btn${albumViewMode === 'shelf' ? ' active' : ''}" data-view="shelf" title="3D Embossed Leatherette Bookshelf">📚 Binder Rack</button>
            <button type="button" class="btn small album-shelf-view-btn${albumViewMode === 'matrix' ? ' active' : ''}" data-view="matrix" title="Comprehensive Data Ledger">📋 Ledger Matrix</button>
            <button type="button" class="btn small btn-shelf-wantlist" id="btn-shelf-wantlist" style="border-color:var(--gold);color:var(--gold-soft);background:rgba(200,169,74,0.12);font-weight:700" title="Generate Missing Holes Checklist for Coin Shows">📑 Want List</button>
          </div>
        </div>

        <div class="album-shelf-filter-tabs">
          <button type="button" class="shelf-filter-tab${albumCategoryFilter === 'all' ? ' active' : ''}" data-cat="all">All Binders (${combinedGlance.length})</button>
          <button type="button" class="shelf-filter-tab${albumCategoryFilter === 'silver' ? ' active' : ''}" data-cat="silver">🥈 Silver &amp; Bullion</button>
          <button type="button" class="shelf-filter-tab${albumCategoryFilter === 'classic' ? ' active' : ''}" data-cat="classic">🏛️ Classic Series</button>
          <button type="button" class="shelf-filter-tab${albumCategoryFilter === 'modern' ? ' active' : ''}" data-cat="modern">🪙 Modern Clad</button>
          <button type="button" class="shelf-filter-tab${albumCategoryFilter === 'world' ? ' active' : ''}" data-cat="world">🍁 International</button>
        </div>

        ${albumViewMode === 'shelf'
          ? `<div class="album-shelf-grid">${shelfCardsHtml}</div>`
          : `<div class="table-wrap glance-wrap">
              <table class="data">
                <thead><tr><th>Family</th><th>IDs</th><th class="num">Coins</th><th class="num">Total</th><th>Pulse</th></tr></thead>
                <tbody>${glanceBody || '<tr><td colspan="5" class="empty">—</td></tr>'}</tbody>
              </table>
            </div>`
        }
      </div>`;
  }

  // ==========================================
  // INTERACTIVE NUMISMATIC ALBUM & HOLE INSPECTOR (PHASE I)
  // ==========================================
  let activeAlbumFamily = "American Silver Eagles";
  let activeAlbumId = "A026";
  let activeAlbumFilter = "all";

  const ALBUM_METADATA = {
    "American Silver Eagles": {
      binderType: "Whitman Deluxe Leatherette",
      ids: ["A026", "A025"],
      volumes: {
        "A026": { title: "Vol 1: 1986–2021 (Type 1 Heraldic)", totalSlots: 36, filled: 18, startYear: 1986, endYear: 2021, denom: "$1 Silver Eagle", metal: ".999 Silver (1 oz ASW)", holes: ["1995", "1996 Key Date", "2003", "2008", "2011", "2017"] },
        "A025": { title: "Vol 2: 2021 Type 2–Present (Landing Eagle)", totalSlots: 16, filled: 6, startYear: 2021, endYear: 2026, denom: "$1 Silver Eagle", metal: ".999 Silver (1 oz ASW)", holes: [] }
      }
    },
    "Kennedy halves": {
      binderType: "Dansco 7166 Archival Half Dollar",
      ids: ["A007", "A008", "A009"],
      volumes: {
        "A007": { title: "Vol 1: 1964–1985 (Silver & Clad)", totalSlots: 36, filled: 32, startYear: 1964, endYear: 1985, denom: "50¢ Half Dollar", metal: "90% / 40% Silver & Clad", holes: ["1966", "1970 Key", "1972", "1972-D"] },
        "A008": { title: "Vol 2: 1986–2003 P&D", totalSlots: 36, filled: 32, startYear: 1986, endYear: 2003, denom: "50¢ Half Dollar", metal: "Clad Composition", holes: ["1998-P", "1998-D", "2001-P", "2001-D"] },
        "A009": { title: "Vol 3: 2004–Present NIFC", totalSlots: 24, filled: 15, startYear: 2004, endYear: 2024, denom: "50¢ Half Dollar", metal: "Clad & Matte NIFC", holes: ["2022", "2023", "2024"] }
      }
    },
    "Washington quarters": {
      binderType: "Whitman Classic #9125",
      ids: ["A021", "A027", "A010", "A011", "A028", "A012", "A029"],
      volumes: {
        "A021": { title: "50 State & Territory Quarters 1999–2008 P&D", totalSlots: 112, filled: 107, startYear: 1999, endYear: 2009, denom: "25¢ State Quarter", metal: "Clad Composition", holes: ["2004-P IA", "2005-D MN", "2006-P NV", "2008-D AK", "2008-P HI"] },
        "A027": { title: "America the Beautiful National Parks 2010–2021", totalSlots: 112, filled: 95, startYear: 2010, endYear: 2021, denom: "25¢ ATB Quarter", metal: "Clad & W-Mintmarks", holes: ["2019-W", "2020-W", "2021 Tuskegee P&D"] },
        "A010": { title: "Clad Washington Quarters 1965–1994", totalSlots: 64, filled: 59, startYear: 1965, endYear: 1994, denom: "25¢ Washington Quarter", metal: "Cupronickel Clad", holes: ["1982-P", "1982-D", "1983-P", "1983-D", "1989-D"] },
        "A011": { title: "Washington Quarters 1988–1997 P&D", totalSlots: 25, filled: 20, startYear: 1988, endYear: 1997, denom: "25¢ Quarter", metal: "Clad Composition", holes: ["1995-P", "1996-D", "1997-D"] },
        "A028": { title: "American Women Quarters 2022–2025", totalSlots: 40, filled: 13, startYear: 2022, endYear: 2025, denom: "25¢ AWQ", metal: "Clad Composition", holes: ["2024 Tubman", "2024 Nin", "2024 Tallchief", "2025 Mankiller"] },
        "A012": { title: "Silver Washington Quarters 1932–1964", totalSlots: 83, filled: 1, startYear: 1932, endYear: 1964, denom: "25¢ 90% Silver", metal: "90% Silver (0.1808 oz ASW)", holes: ["1932-D Key", "1932-S Key", "1934-D", "1935-D", "1936-D", "1937-S"] },
        "A029": { title: "Washington Quarters Blank Starter", totalSlots: 40, filled: 0, startYear: 1965, endYear: 1998, denom: "25¢ Quarter", metal: "Clad Composition", holes: ["All Starter Slots Open"] }
      }
    },
    "Dollar albums": {
      binderType: "Whitman #9144 Presidential & Sacagawea",
      ids: ["A030", "A018", "A020", "A019", "A017"],
      volumes: {
        "A030": { title: "Presidential $1 Coins P&D", totalSlots: 80, filled: 30, startYear: 2007, endYear: 2016, denom: "$1 Golden Dollar", metal: "Manganese Brass", holes: ["2012-P Cleveland", "2013-D McKinley", "2014-P Harding", "2015-D Truman", "2016-P Reagan"] },
        "A018": { title: "Eisenhower Large Dollars 1971–1978", totalSlots: 16, filled: 9, startYear: 1971, endYear: 1978, denom: "$1 Ike Dollar", metal: "Clad & 40% Silver", holes: ["1971-S 40% Proof", "1972 Type 2", "1973-P", "1973-D"] },
        "A020": { title: "Sacagawea & Native American $1", totalSlots: 24, filled: 3, startYear: 2000, endYear: 2024, denom: "$1 Sacagawea", metal: "Golden Manganese", holes: ["2002–2024 NIFC Native American Dates"] },
        "A019": { title: "Susan B. Anthony Dollars 1979–1999", totalSlots: 12, filled: 2, startYear: 1979, endYear: 1999, denom: "$1 SBA", metal: "Cupronickel Clad", holes: ["1979-P Wide Rim", "1981-S", "1999-D"] },
        "A017": { title: "Dollar Album Empty Reserve", totalSlots: 20, filled: 0, startYear: 1971, endYear: 2020, denom: "$1 Coin", metal: "Dollar Alloy", holes: ["Open Reserve Holes"] }
      }
    },
    "Roosevelt dimes": {
      binderType: "Whitman #9029 / #9030 Archival",
      ids: ["A004", "A003", "A005"],
      volumes: {
        "A004": { title: "Clad Roosevelt Dimes 1965–2004", totalSlots: 80, filled: 74, startYear: 1965, endYear: 2004, denom: "10¢ Roosevelt", metal: "Cupronickel Clad", holes: ["1969", "1971", "1973", "1996-W Key"] },
        "A003": { title: "Roosevelt Dimes 2005–2024 P&D", totalSlots: 40, filled: 39, startYear: 2005, endYear: 2024, denom: "10¢ Roosevelt", metal: "Cupronickel Clad", holes: ["2024-P Target"] },
        "A005": { title: "Silver Roosevelt Dimes 1946–1964", totalSlots: 48, filled: 2, startYear: 1946, endYear: 1964, denom: "10¢ 90% Silver", metal: "90% Silver (0.0723 oz ASW)", holes: ["1949-S", "1950-S", "1951-S"] }
      }
    },
    "Lincoln cents": {
      binderType: "Whitman #9004 / #9030 Cents",
      ids: ["A016", "A001", "A002", "A023"],
      volumes: {
        "A016": { title: "Lincoln Memorial 1975–2013 Near-Complete", totalSlots: 90, filled: 84, startYear: 1975, endYear: 2013, denom: "1¢ Lincoln Cent", metal: "Copper / Copper-Plated Zinc", holes: ["1982-D Sm Date Brass", "1982-P Sm Date Zinc", "1982-D Sm Date Zinc", "2009-P Log Cabin", "2009-P Formative", "2009-P Professional"] },
        "A001": { title: "Early Lincoln Wheat Cents 1909–1940", totalSlots: 90, filled: 75, startYear: 1909, endYear: 1940, denom: "1¢ Wheat Cent", metal: "95% Copper Bronze", holes: ["1909-S VDB Key", "1909-S", "1914-D Key", "1922 Plain", "1931-S"] },
        "A002": { title: "Lincoln Wheat & Memorial 1941–1974", totalSlots: 68, filled: 17, startYear: 1941, endYear: 1974, denom: "1¢ Lincoln", metal: "Bronze & Zinc Clad", holes: ["1943 Steel Cents (P/D/S)", "1955/55 DDO", "1960 Sm Date"] },
        "A023": { title: "Lincoln Shield & Commemorative 2010–Present", totalSlots: 30, filled: 7, startYear: 2010, endYear: 2024, denom: "1¢ Shield Cent", metal: "Copper-Plated Zinc", holes: ["2019-W", "2020-W", "2024-D"] }
      }
    },
    "Indian / Flying Eagle": {
      binderType: "Whitman Deluxe #9003",
      ids: ["A022"],
      volumes: {
        "A022": { title: "Indian Head & Flying Eagle Cents 1856–1909", totalSlots: 58, filled: 1, startYear: 1856, endYear: 1909, denom: "1¢ Indian Cent", metal: "Copper-Nickel & Bronze", holes: ["1856 Flying Eagle Key", "1877 Key Date", "1908-S", "1909-S"] }
      }
    },
    "Type set": {
      binderType: "Whitman #9046 20th Century Type Set",
      ids: ["A024"],
      volumes: {
        "A024": { title: "20th Century United States Type Set", totalSlots: 20, filled: 10, startYear: 1900, endYear: 1999, denom: "Type Set Specimen", metal: "Silver, Bronze, Clad & Steel", holes: ["Morgan Dollar 90% Ag", "Peace Dollar 90% Ag", "Walking Liberty Half", "Standing Liberty Quarter"] }
      }
    },
    "Jefferson nickels": {
      binderType: "Whitman #9009 Jefferson Nickels",
      ids: ["A014", "A013", "A015"],
      volumes: {
        "A014": { title: "Jefferson Nickels 1962–1995", totalSlots: 67, filled: 57, startYear: 1962, endYear: 1995, denom: "5¢ Jefferson", metal: "Cupronickel", holes: ["1968-S", "1969-S", "1970-S"] },
        "A013": { title: "Jefferson Nickels 1996–2023", totalSlots: 60, filled: 56, startYear: 1996, endYear: 2023, denom: "5¢ Jefferson", metal: "Cupronickel", holes: ["2004-D Keelboat", "2005-P Bison", "2023-P", "2023-D"] },
        "A015": { title: "Early Jefferson Nickels 1938–1961 (incl War Silver)", totalSlots: 66, filled: 9, startYear: 1938, endYear: 1961, denom: "5¢ Jefferson", metal: "Cupronickel & 35% Silver", holes: ["1939-D Key", "1939-S", "1942–1945 War Silver Holes", "1950-D Key"] }
      }
    },
    "Canada small cents": {
      binderType: "Whitman Canada Classic",
      ids: ["A033", "A032"],
      volumes: {
        "A033": { title: "Canada Small Cents Vol 1: 1920–1964", totalSlots: 50, filled: 35, startYear: 1920, endYear: 1964, denom: "1 Cent George V/VI & Elizabeth II", metal: "98% Bronze", holes: ["1922 Key", "1923 Key", "1924 Semi-Key", "1925 Key", "1936 Dot"] },
        "A032": { title: "Canada Small Cents Vol 2: 1965–2012 Final Struck", totalSlots: 52, filled: 7, startYear: 1965, endYear: 2012, denom: "1 Cent Small Cent", metal: "Bronze / Copper-Plated Zinc", holes: ["1985 Pointed 5", "1997", "2006 Magnetic"] }
      }
    },
    "Buffalo nickels": {
      binderType: "Whitman #9007 Buffalo Nickels 1913–1938",
      ids: ["A031"],
      volumes: {
        "A031": { title: "Buffalo Nickels 1913–1938 Complete Whitman", totalSlots: 65, filled: 1, startYear: 1913, endYear: 1938, denom: "5¢ Indian Head / Bison", metal: "75% Copper / 25% Nickel", holes: ["1913-S Var 2 Key", "1914-D", "1918/7-D Overdate", "1926-S Key", "1937-D 3-Legged"] }
      }
    },
    "Mercury": {
      binderType: "Whitman #9014 Mercury Head Dimes",
      ids: ["A006"],
      volumes: {
        "A006": { title: "Mercury Head Dimes 1916–1945", totalSlots: 78, filled: 1, startYear: 1916, endYear: 1945, denom: "10¢ Winged Liberty", metal: "90% Silver (0.0723 oz ASW)", holes: ["1916-D Holy Grail Key", "1921 Key", "1921-D Key", "1942/1 Overdate", "1945 Micro S"] }
      }
    }
  };

  /* ---- BEGIN what's-missing master data (wings/wants.js, data/wants.json) ----
     ALBUM_METADATA above is hand-typed and wrong in places (A026 listed 6 holes, the master says 18). Once data/wants.json
     (generated from collection/albums.json) is loaded, its numbers and named holes replace the typed ones; family/ids/binder
     stay. holes[] = only the holes the master NAMES; masterMissing = the master's count (null when the ledger gives no total). */
  function applyMasterAlbumData(w) {
    if (!w || !Array.isArray(w.volumes)) return;
    for (const mv of w.volumes) {
      const fam = ALBUM_METADATA[mv.family];
      const v = fam && fam.volumes && fam.volumes[mv.id];
      if (!v) continue;
      v.title = mv.title;
      v.totalSlots = mv.slots_total;
      v.filled = mv.filled;
      v.masterMissing = mv.missing;
      v.masterEvidence = mv.evidence;
      v.holes = mv.missing_named.map((s) => s.label);
      if (mv.year_start) v.startYear = mv.year_start;
      if (mv.year_end) v.endYear = mv.year_end;
      if (mv.denomination) v.denom = mv.denomination;
      if (mv.metal) v.metal = mv.metal;
    }
    masterAlbumData = true;
  }
  let masterAlbumData = false;
  window.addEventListener("titan:wants", (e) => {
    applyMasterAlbumData(e.detail);
    try { if (document.querySelector(".album-binder-card")) renderStudy(); } catch (err) { /* study not rendered yet */ }
  });
  if (window.TitanWants && window.TitanWants.data) applyMasterAlbumData(window.TitanWants.data);
  /* ---- END what's-missing master data ---- */

  const ALBUM_FAMILIES_ORDER = [
    "American Silver Eagles",
    "Kennedy halves",
    "Washington quarters",
    "Dollar albums",
    "Roosevelt dimes",
    "Lincoln cents",
    "Indian / Flying Eagle",
    "Type set",
    "Jefferson nickels",
    "Canada small cents",
    "Buffalo nickels",
    "Mercury"
  ];

  function openAlbumInspector(family, rawIds, initialFilter = "all") {
    if (!family || !ALBUM_METADATA[family]) family = "American Silver Eagles";
    activeAlbumFamily = family;
    const meta = ALBUM_METADATA[family];
    if (meta && meta.ids && meta.ids.length > 0) {
      if (rawIds) {
        const idList = rawIds.split(/[\s·,]+/).map(s => s.trim()).filter(Boolean);
        activeAlbumId = idList.find(id => meta.ids.includes(id)) || meta.ids[0];
      } else {
        activeAlbumId = meta.ids[0];
      }
    } else {
      activeAlbumId = "A026";
    }
    activeAlbumFilter = initialFilter;
    activeAlbumPage = 1;
    activeAlbumPageFlipped = false;
    renderAlbumInspectorView();
    const modal = $("#album-inspector-modal");
    if (modal) {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }
  }

  function closeAlbumInspector() {
    const modal = $("#album-inspector-modal");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  function stepAlbumFamily(dir) {
    const idx = ALBUM_FAMILIES_ORDER.indexOf(activeAlbumFamily);
    const nextIdx = (idx + dir + ALBUM_FAMILIES_ORDER.length) % ALBUM_FAMILIES_ORDER.length;
    openAlbumInspector(ALBUM_FAMILIES_ORDER[nextIdx]);
  }

  function openWantListModal(targetFamily = null) {
    // The old modal below invented its holes and prices; the master-driven view (wings/wants.js) replaces it.
    if (window.TitanWants && typeof window.TitanWants.open === "function") { closeAlbumInspector(); window.TitanWants.open({ family: targetFamily }); return; }
    const modal = $("#album-wantlist-modal");
    if (!modal) return;
    const listBody = $("#wantlist-body");
    const titleEl = $("#wantlist-title");
    const subEl = $("#wantlist-subtitle");

    const familiesToScan = targetFamily ? [targetFamily] : ALBUM_FAMILIES_ORDER;
    const allHoles = [];

    for (const fam of familiesToScan) {
      const meta = ALBUM_METADATA[fam];
      if (!meta || !meta.volumes) continue;
      for (const [vId, vol] of Object.entries(meta.volumes)) {
        const startY = vol.startYear || 1900;
        const endY = vol.endYear || 2024;
        const totalS = vol.totalSlots || 36;
        const filledC = vol.filled || 0;
        const holes = vol.holes || [];

        let curY = startY;
        for (let i = 0; i < totalS; i++) {
          const yStr = String(curY);
          let isHole = false;
          let label = "";
          for (const h of holes) {
            if (h.startsWith(yStr) || h === yStr) {
              isHole = true;
              label = h;
              break;
            }
          }
          if (!isHole && i >= filledC) {
            isHole = true;
            label = (curY <= endY) ? yStr : `Reserve Slot #${i + 1}`;
          }
          if (isHole) {
            const isKey = /key/i.test(label) || /1996|1909-S|1914-D|1916-D|1932-D|1932-S|1950-D/i.test(label);
            const isSemiKey = /semi|overdate|wide|vdb/i.test(label);
            const estCost = isKey ? "$95.00 – $450.00" : (vol.metal.includes("Silver") ? "$32.00 – $65.00" : "$3.50 – $18.00");
            allHoles.push({
              family: fam,
              albumId: vId,
              slotNum: i + 1,
              target: label,
              denom: vol.denom,
              metal: vol.metal,
              isKey,
              isSemiKey,
              estCost
            });
          }
          if (curY < endY) curY++;
        }
      }
    }

    if (titleEl) {
      titleEl.textContent = targetFamily ? `${targetFamily} · Target Want List` : "Comprehensive Collection Want List";
    }
    if (subEl) {
      subEl.textContent = `${allHoles.length} missing target holes identified across ${familiesToScan.length} album series · Field Checklist`;
    }

    const rowsHtml = allHoles.map(h => {
      const badgeClass = h.isKey ? "key" : (h.isSemiKey ? "semi-key" : "standard");
      const badgeText = h.isKey ? "KEY DATE" : (h.isSemiKey ? "SEMI-KEY" : "NEEDED");
      return `
        <tr>
          <td><span class="badge" style="background:rgba(255,255,255,0.06);color:var(--gold-soft);font-family:var(--mono);font-size:0.7rem">${esc(h.albumId)}</span></td>
          <td><strong>${esc(h.target)}</strong></td>
          <td>${esc(h.denom)}</td>
          <td style="color:var(--ink-soft);font-size:0.8rem">${esc(h.family)}</td>
          <td><span class="wantlist-target-badge ${badgeClass}">${badgeText}</span></td>
          <td style="font-family:var(--mono);color:var(--gold);font-weight:600">${esc(h.estCost)}</td>
        </tr>
      `;
    }).join("");

    if (listBody) {
      listBody.innerHTML = `
        <div class="wantlist-table-wrap">
          <table class="wantlist-table">
            <thead>
              <tr>
                <th>Album</th>
                <th>Target Date / Variety</th>
                <th>Denomination</th>
                <th>Series Family</th>
                <th>Status</th>
                <th>Est Acquisition</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--ink-soft)">No missing target holes. Series 100% complete!</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeWantListModal() {
    const modal = $("#album-wantlist-modal");
    if (modal) modal.hidden = true;
    document.body.style.overflow = "";
  }

  function renderAlbumInspectorView() {
    const meta = ALBUM_METADATA[activeAlbumFamily] || {
      binderType: "Archival Numismatic Binder",
      ids: [activeAlbumId],
      volumes: { [activeAlbumId]: { title: activeAlbumFamily, totalSlots: 40, filled: 10, startYear: 1900, endYear: 2000, denom: "Specimen", metal: "Archival Alloy", holes: [] } }
    };
    const vol = meta.volumes[activeAlbumId] || Object.values(meta.volumes)[0];
    if (!vol) return;

    // Badges & Titles
    const bId = $("#album-badge-id");
    const bType = $("#album-badge-type");
    const bSpec = $("#album-badge-spec");
    const aTitle = $("#album-inspector-title");
    const aMeta = $("#album-inspector-meta");
    const aBar = $("#album-progress-bar");

    if (bId) bId.textContent = `ALBUM ${activeAlbumId}`;
    if (bType) bType.textContent = meta.binderType.toUpperCase();
    if (bSpec) bSpec.textContent = vol.metal.toUpperCase();
    if (aTitle) aTitle.textContent = `${activeAlbumFamily} · ${vol.title}`;

    const pct = vol.totalSlots > 0 ? Math.round((vol.filled / vol.totalSlots) * 100) : 0;
    if (aMeta && vol.totalSlots == null) aMeta.innerHTML = `<strong>${vol.filled}</strong> coins filled · slot total not yet known (needs the album scan) · Series Spec: ${esc(vol.metal)}`;
    else if (aMeta) aMeta.innerHTML = `<strong>${vol.filled}</strong> of <strong>${vol.totalSlots}</strong> Slots Filled · <span style="color:var(--gold)">${pct}% Complete</span> · Series Spec: ${vol.metal}`;
    if (aBar) aBar.style.width = `${pct}%`;

    // Tabs for volumes in this family
    const tabsContainer = $("#album-family-tabs");
    if (tabsContainer) {
      tabsContainer.innerHTML = meta.ids.map(id => {
        const v = meta.volumes[id];
        const vTitle = v ? v.title.split(":")[0] : id;
        const activeClass = id === activeAlbumId ? " active" : "";
        return `<button type="button" class="album-tab-btn${activeClass}" data-album-id="${id}">${id}: ${vTitle}</button>`;
      }).join("");

      tabsContainer.querySelectorAll(".album-tab-btn").forEach(btn => {
        btn.onclick = () => {
          activeAlbumId = btn.dataset.albumId;
          activeAlbumPage = 1;
          renderAlbumInspectorView();
        };
      });
    }

    // Generate slots
    // Study wing (wings/study.js): ledger + owner-checked slots replace the guessed layout when available.
    const studyVol = (window.TitanStudy && typeof window.TitanStudy.inspectorVolume === "function") ? window.TitanStudy.inspectorVolume(activeAlbumId, activeAlbumFamily) : null;
    const startYear = vol.startYear || 1986;
    const endYear = vol.endYear || 2024;
    const totalSlots = studyVol ? studyVol.slots.length : (vol.totalSlots || vol.filled || 36);
    const filledCount = vol.filled || 0;
    const namedHoles = (vol.holes || []).map(String);
    const flips = vault?.flips || [];

    const slots = [];
    let curYear = startYear;
    for (let i = 0; i < totalSlots; i++) {
      const studySlot = studyVol ? studyVol.slots[i] : null;
      const yearStr = studySlot ? String(studySlot.year || "") : String(curYear);
      let isHole = false;
      let holeLabel = "";
      for (const h of namedHoles) {
        if (h.startsWith(yearStr) || h === yearStr) {
          isHole = true;
          holeLabel = h;
          break;
        }
      }
      if (!isHole && i >= filledCount) {
        isHole = true;
      }
      if (studySlot) {
        isHole = studySlot.state !== "filled";
        holeLabel = isHole ? studySlot.label : "";
      }
      const isFilled = !isHole;

      // Match flip in vault
      const matchedFlip = flips.find(f => {
        if (!f.year || String(f.year) !== yearStr) return false;
        const isUS = f.country === "United States" || f.iso === "US";
        if (activeAlbumFamily.includes("Silver Eagles")) return isUS && (f.denom?.includes("Eagle") || /eagle/i.test(f.label || ""));
        if (activeAlbumFamily.includes("Mercury")) return isUS && (/mercury|dime/i.test(f.denom || "") || /mercury|dime/i.test(f.label || ""));
        if (activeAlbumFamily.includes("Buffalo")) return isUS && (/buffalo|nickel/i.test(f.denom || "") || /buffalo|nickel/i.test(f.label || ""));
        if (activeAlbumFamily.includes("Washington")) return isUS && (/quarter/i.test(f.denom || "") || /quarter/i.test(f.label || ""));
        if (activeAlbumFamily.includes("Kennedy")) return isUS && (/half/i.test(f.denom || "") || /half/i.test(f.label || ""));
        if (activeAlbumFamily.includes("Canada")) return (f.country === "Canada" || f.iso === "CA") && /cent/i.test(f.denom || "");
        return false;
      });

      const isPastYears = !studySlot && (curYear >= endYear && i >= (endYear - startYear + 1));
      const displayYear = studySlot ? studySlot.label : (isPastYears ? "—" : yearStr);
      const displayLabel = holeLabel || (isPastYears ? `Future Reserve Slot #${i + 1}` : yearStr);
      const safeYearSlug = String(displayYear).replace(/[^a-zA-Z0-9]/g, "") || `S${i + 1}`;
      const slotScan = matchedFlip?.scan || `ALBUM-${activeAlbumId}-S${String(i + 1).padStart(2, "0")}-${safeYearSlug}`;

      // Build or register complete numismatic specimen dossier
      const isSilver = /silver|ag/i.test(vol.metal) || activeAlbumFamily.includes("Silver Eagles") || activeAlbumFamily.includes("Mercury");
      const isGold = /gold|au/i.test(vol.metal);
      const aswVal = activeAlbumFamily.includes("Silver Eagles")
        ? 0.999
        : (vol.metal.includes("90% Silver")
          ? (/dime/i.test(vol.denom) ? 0.0723 : /half/i.test(vol.denom) ? 0.3617 : /quarter/i.test(vol.denom) ? 0.1808 : 0.7734)
          : (vol.metal.includes("40% Silver") ? 0.1479 : null));

      const slotDossier = matchedFlip || {
        scan: slotScan,
        ser: `${activeAlbumId} · Slot #${String(i + 1).padStart(2, "0")}`,
        kind: "flip",
        cat: "coin",
        country: activeAlbumFamily.includes("Canada") ? "Canada" : "United States",
        iso: activeAlbumFamily.includes("Canada") ? "CA" : "US",
        continent: "North America",
        year: displayYear === "—" ? "not recorded" : (studySlot ? displayYear : `${displayYear} (inferred)`),
        denom: vol.denom,
        metal: vol.metal,
        is_silver: isSilver,
        is_gold: isGold,
        asw_oz: aswVal,
        est: null,
        conf: null,
        status: isFilled ? "Album slot: filled (contents not itemized; inferred from the Whitman model)" : "Album slot: open (inferred from the Whitman model)",
        location: `${activeAlbumFamily} (${activeAlbumId}) · Slot #${i + 1}`,
        mintage: null,
        notes: isFilled
          ? `Album slot record (${activeAlbumId}, slot #${i + 1}). No specimen details (grade, value, photo) have been logged for this coin yet.`
          : `Open slot in ${activeAlbumId} (slot #${i + 1}): ${displayLabel}. No coin logged here.`,
        specs: `${vol.denom} · Composition: ${vol.metal} · Physical slot #${i + 1} of ${totalSlots}`,
        design: null,
        tender: "not recorded",
        _album: true,
        qty_n: 1,
        label: `${activeAlbumFamily.includes("Canada") ? "Canada" : "USA"} · ${displayYear} · ${vol.denom}`,
        _full: true,
        photos: []
      };

      albumCoinDossiers.set(slotScan, slotDossier);

      const isKey = studySlot ? Boolean(studySlot.key) : (/key/i.test(displayLabel) || /1996|1909-S|1914-D|1916-D|1932-D|1932-S|1950-D/i.test(displayLabel));
      slots.push({
        idx: i + 1,
        year: displayYear,
        label: displayLabel,
        isFilled,
        isHole,
        isKey,
        scan: slotScan,
        coin: slotDossier
      });

      if (curYear < endYear) curYear++;
    }

    // Pagination calculations
    const SLOTS_PER_PAGE = 12;
    const totalPages = Math.ceil(totalSlots / SLOTS_PER_PAGE) || 1;
    if (activeAlbumPage > totalPages) activeAlbumPage = totalPages;
    if (activeAlbumPage < 1) activeAlbumPage = 1;

    // Filter counts
    const filledSlots = slots.filter(s => s.isFilled);
    const missingSlots = slots.filter(s => s.isHole);
    const cAll = $("#album-count-all");
    const cFill = $("#album-count-filled");
    const cMiss = $("#album-count-missing");
    if (cAll) cAll.textContent = slots.length;
    if (cFill) cFill.textContent = filledSlots.length;
    if (cMiss) cMiss.textContent = missingSlots.length;

    // Update filter pills active state
    $$("#album-filter-pills .album-filter-pill").forEach(p => {
      p.classList.toggle("active", p.dataset.filter === activeAlbumFilter);
    });

    // Determine slots to display
    let candidateSlots = slots;
    if (activeAlbumFilter === "filled") candidateSlots = filledSlots;
    else if (activeAlbumFilter === "missing") candidateSlots = missingSlots;

    let displaySlots = candidateSlots;
    if (!activeAlbumSpreadMode && activeAlbumFilter === "all") {
      const pageStartIdx = (activeAlbumPage - 1) * SLOTS_PER_PAGE;
      displaySlots = candidateSlots.slice(pageStartIdx, pageStartIdx + SLOTS_PER_PAGE);
    }

    // Update Page Navigation Controls
    const pageInd = $("#album-page-indicator");
    const pageBadge = $("#album-page-badge");
    const pageFaceLbl = $("#album-page-face-label");
    const toggleSpreadBtn = $("#album-btn-toggle-spread");
    const flipText = $("#album-flip-page-text");
    const pageContainer = $("#album-page-container");

    if (pageInd) {
      pageInd.textContent = activeAlbumSpreadMode ? "Spread View" : `Page ${activeAlbumPage} of ${totalPages}`;
    }
    if (toggleSpreadBtn) {
      toggleSpreadBtn.textContent = activeAlbumSpreadMode ? "📄 Page View" : "⊞ All Spread";
      toggleSpreadBtn.title = activeAlbumSpreadMode ? "Switch to single archival cardstock page view" : "View all album slots at once";
    }
    if (flipText) {
      flipText.textContent = activeAlbumPageFlipped ? "Flip to Obverse" : "Flip to Reverse";
    }
    if (pageFaceLbl) {
      pageFaceLbl.textContent = activeAlbumPageFlipped ? "REVERSE VIEW · MINTMARK & EAGLE REVEALED" : "OBVERSE VIEW · ACETATE SLIDE IN PLACE";
    }

    const firstDisplaySlot = displaySlots[0];
    const lastDisplaySlot = displaySlots[displaySlots.length - 1];
    if (pageBadge) {
      if (activeAlbumSpreadMode) {
        pageBadge.textContent = `FULL ALBUM SPREAD · ${slots.length} TOTAL SLOTS`;
      } else {
        const yRange = (firstDisplaySlot && lastDisplaySlot) ? `${firstDisplaySlot.year}–${lastDisplaySlot.year}` : `SLOTS`;
        pageBadge.textContent = `PAGE ${activeAlbumPage} OF ${totalPages} · ${yRange}`;
      }
    }

    if (pageContainer) {
      pageContainer.classList.toggle("is-page-flipped", Boolean(activeAlbumPageFlipped));
    }

    // Render Grid
    const grid = $("#album-slots-grid");
    if (grid) {
      grid.innerHTML = displaySlots.map(s => {
        if (s.isFilled) {
          const coinObj = s.coin;
          const obvVisual = coinObj.thumb && coinObj.thumb_side !== "rev"
            ? `<img class="slot-coin-disc" src="${esc(coinObj.thumb)}" loading="lazy" decoding="async" alt="${esc(s.year)} Obverse" />`
            : renderSpecimenBlueprint(coinObj, false, "obv");

          const revPhotoUrl = (typeof photoOf === "function" && photoOf(coinObj, "rev")?.url) ? photoOf(coinObj, "rev").url : null;
          const revVisual = revPhotoUrl
            ? `<img class="slot-coin-disc" src="${esc(revPhotoUrl)}" loading="lazy" decoding="async" alt="${esc(s.year)} Reverse" />`
            : renderSpecimenBlueprint(coinObj, false, "rev");

          return `
            <div class="album-slot-card is-filled" data-scan="${esc(s.scan)}" title="Slot #${s.idx}: ${s.year} ${esc(vol.denom)} (Filled) - Click to inspect full dossier">
              <div class="slot-aperture-wrap">
                <div class="slot-aperture-flipper">
                  <div class="slot-coin-disc-face is-obv">
                    ${obvVisual}
                    <div class="slot-luster-ring"></div>
                  </div>
                  <div class="slot-coin-disc-face is-rev">
                    ${revVisual}
                    <div class="slot-luster-ring"></div>
                  </div>
                </div>
              </div>
              <div class="slot-year-tag">${esc(s.year)}</div>
              <div class="slot-denom-tag">${esc(vol.denom)}</div>
              <span class="slot-status-pill filled">✓ FILLED</span>
            </div>`;
        } else {
          return `
            <div class="album-slot-card is-missing" data-scan="${esc(s.scan)}" title="Slot #${s.idx}: ${esc(s.label)} (Target Hole Needed) - Click to inspect target dossier" data-info="Missing Target: ${esc(s.label)}">
              <div class="slot-aperture-wrap">
                <div class="slot-hole-cavity">
                  <span class="slot-hole-target-cross">⌖</span>
                  <span class="slot-hole-lbl">${s.isKey ? 'KEY TARGET' : 'TARGET'}</span>
                </div>
              </div>
              <div class="slot-year-tag" style="color:${s.isKey ? 'var(--gold-soft)' : 'var(--ink)'}">${esc(s.label)}</div>
              <div class="slot-denom-tag" style="color:var(--muted)">Target Hole</div>
              <span class="slot-status-pill ${s.isKey ? 'key-date' : 'missing'}">${s.isKey ? '★ KEY DATE' : 'OPEN HOLE'}</span>
            </div>`;
        }
      }).join("");

      // Wire card click listeners: opens rich dossier drawer
      grid.querySelectorAll(".album-slot-card").forEach(card => {
        card.onclick = () => {
          if (card.dataset.scan) {
            dossierCtx = {
              label: `${activeAlbumFamily} (${activeAlbumId})`,
              scans: slots.map(sl => sl.scan)
            };
            closeAlbumInspector();
            openDrawer(card.dataset.scan);
          }
        };
      });
    }

    // Wire Page Nav Buttons
    const prevPageBtn = $("#album-page-prev");
    const nextPageBtn = $("#album-page-next");
    if (prevPageBtn) {
      prevPageBtn.onclick = () => {
        if (activeAlbumPage > 1) {
          activeAlbumPage--;
          renderAlbumInspectorView();
        }
      };
    }
    if (nextPageBtn) {
      nextPageBtn.onclick = () => {
        if (activeAlbumPage < totalPages) {
          activeAlbumPage++;
          renderAlbumInspectorView();
        }
      };
    }

    // Wire View Mode Spread Toggle
    const toggleSpreadEl = $("#album-btn-toggle-spread");
    if (toggleSpreadEl) {
      toggleSpreadEl.onclick = () => {
        activeAlbumSpreadMode = !activeAlbumSpreadMode;
        renderAlbumInspectorView();
      };
    }

    // Wire 3D Page Flip Button
    const flipPageBtn = $("#album-btn-flip-page");
    if (flipPageBtn) {
      flipPageBtn.onclick = () => {
        activeAlbumPageFlipped = !activeAlbumPageFlipped;
        renderAlbumInspectorView();
        playStapleClick();
      };
    }

    // Wire Want List Button inside inspector
    const wantListBtn = $("#album-btn-wantlist");
    if (wantListBtn) {
      wantListBtn.onclick = () => {
        openWantListModal(activeAlbumFamily);
      };
    }
  }

  window.openAlbumInspector = openAlbumInspector;
  window.closeAlbumInspector = closeAlbumInspector;
  window.openWantListModal = openWantListModal;
  window.closeWantListModal = closeWantListModal;

  /** The Curator's Study: world atlas, intelligence, metal, age, buckets. */
  function renderStudy() {
    $("#study-body").innerHTML = `
      <nav class="study-nav-pills reveal" aria-label="Study Wing Sections">
        <button type="button" class="study-nav-pill active" data-target="#sec-world">🌐 World Atlas &amp; Map</button>
        <button type="button" class="study-nav-pill" data-target="#sec-intelligence">💡 Vault Intelligence</button>
        <button type="button" class="study-nav-pill" data-target="#sec-metals">⚖️ Precious Metals</button>
        <button type="button" class="study-nav-pill" data-target="#sec-age">⏳ Age &amp; Albums</button>
        <button type="button" class="study-nav-pill" data-target="#sec-buckets">📦 Storage Buckets</button>
      </nav>
      ${worldSec()}
      ${insightsSec()}
      ${metalsSec()}
      ${ageSec()}
      ${bucketsSec()}
    `;
    bindWorld();
    bindStudyNav();

    // Gem rows
    $$("#study-body .gem-row button[data-scan]").forEach((btn) => {
      btn.addEventListener("click", () => { dossierCtx = null; openDrawer(btn.dataset.scan); });
    });

    // Decade rows
    $$("#study-body .interactive-decade").forEach((row) => {
      row.addEventListener("click", () => {
        const d = row.dataset.decade;
        if (d) {
          flipFilter = { ...flipFilter, q: "", country: "", iso: "", year: d.slice(0, 3) };
          renderGallery();
          setWing("gallery");
          window.scrollTo(0, 0);
          showToast(`Filtered gallery to ${d}s decade`);
        }
      });
    });

    // Country spread rows
    $$("#study-body .interactive-country-spread").forEach((row) => {
      row.addEventListener("click", () => {
        const country = row.dataset.country;
        if (country) {
          flipFilter = { ...flipFilter, q: "", country, iso: "", year: "" };
          renderGallery();
          setWing("gallery");
          window.scrollTo(0, 0);
          showToast(`Filtered gallery to ${country}`);
        }
      });
    });

    // Staging album row
    $$("#study-body .staging-album-row").forEach((row) => {
      row.onclick = () => {
        setWing("lab");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => {
          const card = $("#phase2-staging-card");
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.remove("highlight-pulse");
            void card.offsetWidth;
            card.classList.add("highlight-pulse");
          }
        }, 150);
      };
    });

    // Album bookshelf view mode toggle
    $$("#study-body .album-shelf-view-btn").forEach((btn) => {
      btn.onclick = () => {
        albumViewMode = btn.dataset.view;
        renderStudy();
      };
    });

    // Album shelf category filter tabs
    $$("#study-body .shelf-filter-tab").forEach((tab) => {
      tab.onclick = () => {
        albumCategoryFilter = tab.dataset.cat;
        renderStudy();
      };
    });

    // Album shelf want list button
    $("#btn-shelf-wantlist")?.addEventListener("click", () => {
      openWantListModal(null);
    });

    // Staging album open button on shelf
    $("#btn-open-staging-album")?.addEventListener("click", () => {
      setWing("lab");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const card = $("#phase2-staging-card");
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("highlight-pulse");
        }
      }, 150);
    });

    // Open binder buttons on cards
    $$("#study-body .btn-open-album-inspector, #study-body .interactive-album-row").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        openAlbumInspector(el.dataset.albumFamily, el.dataset.albumIds, "all");
      };
    });

    // Open holes buttons on cards
    $$("#study-body .btn-open-album-holes").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        openAlbumInspector(el.dataset.albumFamily, el.dataset.albumIds, "missing");
      };
    });

    // Card background click opens binder
    $$("#study-body .album-binder-card:not(.staging-binder-card)").forEach((card) => {
      card.onclick = (e) => {
        if (e.target.closest("button")) return;
        openAlbumInspector(card.dataset.albumFamily, card.dataset.albumIds, "all");
      };
    });

    observeReveals($("#study-body"));
  }

  function bindStudyNav() {
    $$("#study-body .study-nav-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        $$("#study-body .study-nav-pill").forEach((p) => p.classList.toggle("active", p === pill));
        const target = $(pill.dataset.target);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }


  const albumCoinDossiers = new Map();

  function findCard(scan) {
    if (albumCoinDossiers.has(scan)) return albumCoinDossiers.get(scan);
    const pools = [vault.flips, vault.bullion, vault.sets, vault.housing, vault.stamps];
    for (const pool of pools) {
      const hit = (pool || []).find((c) => c.scan === scan);
      if (hit) return hit;
    }
    return null;
  }

  const SER_SCHEMA = [
    ["ser", "SER"], ["scan", "Scan"], ["added", "Added"], ["cat", "Cat"],
    ["continent", "Continent"], ["country", "Country"], ["iso", "ISO"],
    ["year", "Year"], ["mint", "Mint"], ["denom", "Denom"], ["refs", "Refs"],
    ["metal", "Metal / cond"], ["specs", "Specs"], ["mintage", "Mintage"],
    ["design", "Design"], ["tender", "Tender"], ["qty", "Qty"], ["face", "Face"],
    ["est", "Est"], ["conf", "Conf"], ["label", "Label"], ["photo", "Photo"],
    ["parked", "Parked"], ["notes", "Notes"],
  ];
  const has = (v) => v != null && String(v).trim() !== "";

  function dossierList() {
    // Navigate in the order the user is looking at: the World country list it was opened from,
    // else the filtered Flips list, else newest-first.
    if (dossierCtx && dossierCtx.scans.includes(currentDrawerScan)) return dossierCtx.scans;
    if (currentDrawerScan && currentDrawerScan.startsWith("ALBUM-")) {
      const prefix = currentDrawerScan.split("-S")[0];
      return Array.from(albumCoinDossiers.keys()).filter((k) => k.startsWith(prefix));
    }
    const rows = filteredFlips();
    const pool = rows.length ? rows : latestFlips(1e6);
    return pool.map((f) => f.scan);
  }

  const ROLE_LABEL = {
    obv: "Obverse · front", rev: "Reverse · back", label: "Flip label", edge: "Edge", detail: "Detail", album_page: "Album page",
  };
  function photoOf(c, role) { return (c.photos || []).find((p) => p.role === role && p.url); }
  function photoSlot(c, role) {
    const ph = photoOf(c, role);
    const label = ROLE_LABEL[role] || role;
    const file = c.photo_stem ? `${c.photo_stem}_${role}.jpg` : "";
    const empty = `
      <div class="ph-empty">
        <span class="ph-ring" aria-hidden="true"></span>
        <span class="ph-await">Awaiting ${role === "obv" || role === "rev" ? "Phase 2 photo" : "photo"}</span>
        ${file ? `<code class="ph-file" title="Master name on Drive (tap to copy)" data-copy="${esc(file)}">${esc(file)}</code>
        <span class="ph-dir">${esc(c.photo_dir || "")}/</span>` : `<span class="ph-dir">No SER, so no photo target</span>`}
      </div>`;
    if (ph) {
      return `
      <figure class="ph-slot has${ph.kind === "crop_circle" ? " is-round" : ""}" data-role="${role}">
        <button type="button" class="ph-open" data-role="${role}" aria-label="Open ${esc(label)} full size">
          <img loading="lazy" src="${esc(ph.url)}" alt="${esc((c.ser || c.scan) + " " + label)}" />
        </button>
        <div class="ph-fallback" hidden>${empty}</div>
        <figcaption>${esc(label)}${ph.phase === 1 ? " · phone photo" : ""}${ph.original ? ` · <a class="ph-orig" href="${esc(ph.original)}" target="_blank" rel="noopener">View master</a>` : ""}</figcaption>
      </figure>`;
    }
    return `
      <figure class="ph-slot ph-blank" data-role="${role}">
        ${empty}
        <figcaption>${esc(label)}</figcaption>
      </figure>`;
  }

  function kvRows(rows) {
    return rows
      .map(([k, v, cls]) => `<dt>${esc(k)}</dt><dd class="${cls || ""}${has(v) ? "" : " missing"}">${has(v) ? esc(v) : "—"}</dd>`)
      .join("");
  }

  async function openDrawer(scan, persist = true) {
    let c = findCard(scan);
    if (!c) return;
    if ((c.kind === "flip" || c.kind === "token") && !c._full) {
      try { c = (await ensureDetail(scan)) || c; } catch (e) { showToast("Could not load details: " + e.message); }
    }
    currentDrawerScan = scan;
    try { window.dispatchEvent(new CustomEvent("titan:coin", { detail: { id: c.id || scan } })); } catch { /* ignore */ }   // TitanFX accent pulse
    const isFlip = c.kind === "flip" || c.kind === "token";
    const spotAg = vault.precious?.spot_ag ?? vault.metals?.spot?.ag_usd_oz;
    const spotAu = vault.precious?.spot_au ?? vault.metals?.spot?.au_usd_oz;
    const aswDisplay = c.is_silver
      ? (c.asw_oz != null ? aswFmt(c.asw_oz) : "ASW unknown")
      : (c.asw_oz != null ? aswFmt(c.asw_oz) : c.asw);
    const meltLiveDisplay = c.is_silver ? meltLive(c) : null;
    const phList = c.photos || [];
    const roleNote = (r) => {
      const p = phList.find((x) => x.role === r);
      return p ? `${r} ✓${p.phase === 1 ? " (phone photo)" : ""}` : `${r} awaiting`;
    };
    const photoStatus = phList.length
      ? ["obv", "rev"].map(roleNote).join(" · ")
      : (isFlip ? "Awaiting Phase 2 (none yet)" : c.photo);
    const lblPhoto = phList.find((x) => x.label_text || x.label_check);
    const labelText = c.label_text || lblPhoto?.label_text;
    const labelCheck = c.label_check || lblPhoto?.label_check;
    const dia = c.diameter_mm != null ? `${num(c.diameter_mm, 2, 0)} mm` : (c._album ? "not recorded" : "");
    const meas = c.measured_mm != null
      ? `${num(c.measured_mm, 2)} mm${c.diameter_delta_pct != null ? ` (${c.diameter_delta_pct > 0 ? "+" : ""}${num(c.diameter_delta_pct, 1)}% vs spec)` : ""}${c.diameter_flag ? " · mismatch >8%" : ""}`
      : "";

    const identity = [
      ["SER", c.ser, "mono"], ["Scan", c.scan ? `${c.scan}${c.scan_note && /renumber/i.test(c.scan_note) ? " · temporary" : ""}` : "", "mono"],
      ["Country", c.country], ["ISO", c.iso, "mono"], ["Continent", c.continent],
      ["Year", c.year], ["Mint", c.mint], ["Denom", c.denom], ["Cat", c.cat || c.kind], ["Label", c.label],
    ];
    const physical = [
      ["Metal / cond", c.metal], ["Specs", c.specs], ["Mintage", c.mintage],
      ["Design", c.design], ["Refs", c.refs], ["Tender", c.tender],
      ["Diameter (spec)", dia, "num"],
    ];
    if (meas) physical.push(["Diameter (photo)", meas, c.diameter_flag ? "num warn" : "num"]);
    const value = [
      ["Face", c.face], ["Est", c.est != null ? money(c.est) : c.est_raw, "num"], ["Conf", c.conf],
    ];
    if (c.melt != null || has(c.melt_raw) || c.is_silver || c.is_gold) {
      value.push(["Melt (card)", c.melt != null ? money(c.melt) : c.melt_raw, "num"]);
    }
    if (c.is_silver || c.asw_oz != null) {
      value.push(["Ag ASW", aswDisplay, "num"]);
      value.push(["Melt @ live", meltLiveDisplay ? `${meltLiveDisplay}${spotAg != null ? " @ " + money(spotAg) + "/oz" : ""}` : "", "num"]);
      if (c.asw_source) value.push(["ASW source", c.asw_source]);
    }
    if (c.is_gold || c.agw_oz != null) {
      value.push(["Au AGW", c.agw_oz != null ? num(c.agw_oz, 4) + " oz" : "AGW unknown", "num"]);
      value.push(["Melt Au @ live", c.melt_live_au != null ? `${money(c.melt_live_au)} @ ${money(spotAu)}/oz` : "", "num"]);
    }
    const record = [
      ["Status", c.status], ["Qty", c.qty], ["Added", c.added], ["Location", c.location], ["Acquired", c.acquired],
      ["Parked", c.parked], ["Photo", photoStatus], ["Label text", labelText],
      ["Label check", labelCheck, /mismatch/i.test(labelCheck || "") ? "warn" : ""],
      ["Contents", c.contents],
    ].filter(([k, v]) => (k !== "Contents" && k !== "Status") || has(v) || (k === "Status" && isFlip));

    // Non-flip cards: only show what exists (no SER schema).
    const clean = (rows) => (isFlip ? rows : rows.filter(([, v]) => has(v)));
    const section = (title, rows) => {
      const r = clean(rows);
      return r.length ? `<section class="ds-sec"><h4>${esc(title)}</h4><dl class="kv">${kvRows(r)}</dl></section>` : "";
    };

    const present = SER_SCHEMA.filter(([k]) => has(c[k]) || (k === "est" && c.est != null));
    const missing = SER_SCHEMA.filter(([k]) => !(has(c[k]) || (k === "est" && c.est != null))).map(([, l]) => l);
    const p2Roles = [["obv", "Obverse"], ["rev", "Reverse"]].map(([r, lbl]) => ({ r, lbl, got: (c.photos || []).some((p) => p.role === r && p.url && p.phase === 2) }));
    const p2Got = p2Roles.filter((x) => x.got).length;
    const pct = Math.round((present.length / SER_SCHEMA.length) * 100);
    const completeness = isFlip
      ? `<div class="ds-complete${missing.length ? "" : " full"}" title="${esc(missing.length ? "Awaiting Phase 2: " + missing.join(", ") : "All SER fields present")}">
          <span class="bar"><span style="width:${pct}%"></span></span>
          Record ${present.length}/${SER_SCHEMA.length}${missing.length ? " · awaiting Phase 2: " + esc(missing.join(", ")) : " · complete"}
          <span class="p2-note">Photos ${p2Got}/2${p2Got < 2 ? " · " + p2Roles.filter((x) => !x.got).map((x) => x.lbl.toLowerCase()).join(" + ") + " await Phase 2" : " · on file"}</span>
        </div>`
      : "";

    const agTag = c.is_silver ? ` <span class="badge-ag${c.asw_oz == null ? " unk" : ""}">Ag</span>` : "";
    const auTag = c.is_gold ? ` <span class="badge-au">Au</span>` : "";
    const tokTag = c.kind === "token" ? ` <span class="badge-kind">Token</span>` : "";
    const stTag = isFlip && c.status ? ` <span class="badge-status st-${esc(String(c.status).toLowerCase())}">${esc(c.status)}</span>` : "";
    const title = [c.country, c.year, c.denom].filter(has).join(" · ") || c.label || c.scan;
    const primary = c.ser || c.scan;
    const secondary = [c.ser ? c.scan : c.kind, c.added ? "added " + c.added : ""].filter(has).join(" · ");
    const valueChips = `
      <div class="ds-chips">
        <span class="chip"><strong>${c.est != null ? money(c.est) : "—"}</strong> est${c.conf ? " · " + esc(c.conf) : ""}</span>
        ${c.is_silver ? `<span class="chip ag">Ag <strong>${c.asw_oz != null ? num(c.asw_oz, 4) + " oz" : "ASW ?"}</strong> · melt <strong>${meltLiveDisplay || "—"}</strong></span>` : ""}
        ${c.is_gold ? `<span class="chip au">Au <strong>${c.agw_oz != null ? num(c.agw_oz, 4) + " oz" : "AGW ?"}</strong></span>` : ""}
        ${c.face ? `<span class="chip">Face <strong>${esc(c.face)}</strong></span>` : ""}
      </div>`;

    // Photo stage: if photos exist, show obverse + reverse; if awaiting Phase 2, showcase the Archival Flip
    const extraRoles = [...new Set(phList.map((p) => p.role))].filter((r) => r !== "obv" && r !== "rev");
    const stageMain = (isFlip ? ["obv", "rev"] : []).map((r) => photoSlot(c, r)).join("");
    const stageExtra = extraRoles.map((r) => photoSlot(c, r)).join("");
    const stage = isFlip
      ? (phList.length
          ? `<div class="ds-stage">${stageMain}</div>
             ${stageExtra ? `<div class="ds-stage ds-stage-extra">${stageExtra}</div>` : ""}
             <p class="ph-hint">Tap a photo for full size.</p>`
          : `<div class="ds-stage-flip-showcase">
               <div class="ds-dual-flips">
                 <div class="ds-flip-col">
                   <span class="ds-flip-col-lbl">Obverse (Front)</span>
                   ${renderMuseumSlab(c, { side: "obv" })}
                 </div>
                 <div class="ds-flip-col">
                   <span class="ds-flip-col-lbl">Reverse (Back)</span>
                   ${renderMuseumSlab(c, { side: "rev" })}
                 </div>
               </div>
               <div class="ds-p2-notice">
                 <span class="p2-seal">🏛️ ARCHIVAL RELIQUARY SPECIMEN</span>
                 <p class="p2-prompt"><strong>Physical RAW Macro Photography Pending.</strong> The drawings above are illustrative renderings from the ledger record, not photographs. This coin is ungraded and uncertified; it awaits its Phase 2 scan.</p>
               </div>
             </div>`)
      : "";

    // Precision Caliper scale
    const specMm = c.diameter_mm ? parseFloat(c.diameter_mm) : null;
    const measMm = c.measured_mm ? parseFloat(c.measured_mm) : null;
    const activeDia = measMm || specMm || getSpecimenDiameter(c);
    const diaSrc = measMm ? "measured from photo" : getSpecimenDiameterSource(c) === "ledger" ? "from the ledger" : "estimated for the drawing, not in the ledger";
    const alignKnown = !!(c.specs && /medal|coin\s*align/i.test(c.specs));
    const fillPct = Math.min(96, Math.max(24, Math.round((activeDia / 50.8) * 100)));
    const caliperHtml = `
      <div class="ds-caliper-box">
        <div class="ds-caliper-title">Physical Caliper &amp; Die Scale (1:1 Ratio)</div>
        <div class="ds-caliper-stage">
          <div class="ds-caliper-frame" title="50.8 mm (2.0 inch) Square Cardboard Window">
            <div class="ds-caliper-coin-circle" style="width: ${fillPct}%; height: ${fillPct}%;" title="${activeDia} mm Coin Diameter (${fillPct}% of 50.8mm window)">
              <div class="ds-caliper-crosshair"></div>
              <span class="ds-caliper-dim-tag">⌀ ${activeDia} mm</span>
            </div>
            <div class="ds-caliper-grid-rings"></div>
          </div>
          <div class="ds-caliper-metrics">
            <div class="dcm-row"><span>Coin Diameter:</span><strong>${activeDia} mm <em style="font-weight:400;color:var(--muted)">(${diaSrc})</em></strong></div>
            <div class="dcm-row"><span>Cardboard Window:</span><strong>50.8 mm (2×2")</strong></div>
            <div class="dcm-row"><span>Window Fill Ratio:</span><strong>${fillPct}%</strong></div>
            <div class="dcm-row"><span>Die Alignment:</span><strong>${alignKnown ? (/medal/i.test(c.specs) ? "Medallic (↑↑ 0°)" : "Coin (↑↓ 180°)") : "not recorded"}</strong></div>
          </div>
        </div>
      </div>`;

    let meltMultiplierHtml = "";
    if (c.is_silver && c.asw_oz && spotAg && c.est) {
      const pureMelt = Number(c.asw_oz) * Number(spotAg);
      const mult = (Number(c.est) / pureMelt).toFixed(1);
      meltMultiplierHtml = `
        <div class="ds-caliper-box" style="border-color: rgba(200, 169, 74, 0.35); background: linear-gradient(180deg, rgba(22,19,16,0.9), rgba(14,13,10,0.95));">
          <div class="ds-caliper-title" style="color:var(--gold-soft)">Numismatic Valuation Multiplier (Spot Ag @ ${money(spotAg)}/oz)</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:0.4rem;">
            <div>
              <span style="font-size:0.75rem; color:var(--muted)">Pure Melt</span><br/>
              <strong style="font-family:var(--serif); font-size:1.25rem; color:var(--ink)">${money(pureMelt)}</strong>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.75rem; color:var(--muted)">Collector Premium</span><br/>
              <strong style="font-family:var(--serif); font-size:1.25rem; color:var(--gold)">+${money(Math.max(0, c.est - pureMelt))}</strong>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.75rem; color:var(--muted)">Multiplier</span><br/>
              <strong style="font-family:var(--mono); font-size:1.15rem; color:var(--gold-soft); background:var(--surface); padding:0.18rem 0.55rem; border-radius:6px; border:1px solid var(--line)">${mult}× Melt</strong>
            </div>
          </div>
        </div>`;
    }

    // Spec grid: the museum label summary.
    const specItem = (k, v, cls = "") =>
      `<div class="ds-spec"><div class="k">${esc(k)}</div><div class="v ${cls}${has(v) ? "" : " missing"}">${has(v) ? esc(v) : "—"}</div></div>`;
    const specGrid = `
      ${caliperHtml}
      ${meltMultiplierHtml}
      <div class="ds-specgrid" aria-label="Coin specifications">
        ${specItem("SER", c.ser || c.scan, "mono")}
        ${specItem("Scan", c.scan, "mono")}
        ${specItem("Country", c.country)}
        ${specItem("Year", c.year)}
        ${specItem("Denom", c.denom)}
        ${specItem("Mint", c.mint)}
        ${specItem("Est", c.est != null ? money(c.est) : c.est_raw, "num")}
        ${specItem("Confidence", c.conf)}
        ${specItem("Ag ASW", aswDisplay, "num")}
        ${specItem("Melt @ live", meltLiveDisplay ? `${meltLiveDisplay}${spotAg != null ? " @ " + money(spotAg) + "/oz" : ""}` : "", "num")}
        ${specItem("Location", c.location)}
        ${specItem("Status", c.status)}
        ${specItem("Photo", photoStatus)}
      </div>`;

    // Phase-2 capture: fields the photo scan will fill get designed homes now,
    // with intentional "awaiting" empty states until the scan lands.
    const p2Field = (k, v) => `
      <div class="p2-field"><div class="k">${esc(k)}</div>
      <div class="v${has(v) ? "" : " awaiting"}">${has(v) ? esc(String(v)) : "Awaiting Phase 2"}</div></div>`;
    const p2CaptureSec = isFlip ? `
      <section class="ds-sec p2-sec"><h4>Phase 2 capture <span class="p2-tag">Phase 2</span></h4>
        <div class="p2-grid">
          ${p2Field("Grade", c.grade)}
          ${p2Field("Provenance", c.provenance)}
          ${p2Field("Source", c.acquired_from || c.acquired)}
          ${p2Field("Weight", c.weight_g != null ? num(c.weight_g, 2) + " g" : (c.weight || ""))}
          ${p2Field("Obverse photo", (c.photos || []).some((p) => p.role === "obv" && p.phase === 2) ? "On file" : "")}
          ${p2Field("Reverse photo", (c.photos || []).some((p) => p.role === "rev" && p.phase === 2) ? "On file" : "")}
        </div>
      </section>` : "";

    // Flip dossier v2 (wings/gallery.js) replaces the body for flips and tokens; classic template below otherwise.
    let gbBody = null;
    const gbr = window.__galleryBridge;
    if (isFlip && gbr && gbr.dossier && !gbr.dossierBroken) {
      try { gbBody = gbr.dossier(c); } catch (e) { gbr.dossierBroken = true; console.warn("Dossier v2 failed; using the classic dossier.", e); }
    }
    $("#drawer-body").innerHTML = gbBody || `
      ${stage}
      <header class="ds-head">
        <div class="ds-ser">${esc(primary)}${agTag}${auTag}${tokTag}${stTag}</div>
        <div class="ds-rule" aria-hidden="true"></div>
        <h2>${esc(title)}</h2>
        ${specGrid}
        <div class="scan">${esc(secondary)}</div>
        ${valueChips}
        ${completeness}
      </header>
      ${c.story ? `<section class="ds-sec"><h4>About this coin</h4><div class="notes-box">${esc(c.story)}</div></section>` : ""}
      ${(c.history || []).length ? `<details class="ds-sec ds-history"><summary><strong>History</strong></summary><ul class="notes-box">${c.history.map((r) => `<li>${esc(r.ts)} · ${esc(r.what)}</li>`).join("")}</ul></details>` : ""}
      ${section("Identity", identity)}
      ${section("Value", value)}
      ${section("Physical", physical)}
      ${section("Record", record)}
      ${p2CaptureSec}
      ${c.notes ? `<section class="ds-sec"><h4>Notes</h4><div class="notes-box">${esc(c.notes)}</div></section>` : (isFlip ? `<section class="ds-sec"><h4>Notes</h4><div class="notes-box missing">—</div></section>` : "")}
    `;

    // Missing-on-this-host images (e.g. Drive single-file) fall back to the dashed slot.
    $$("#drawer-body .ph-slot.has img").forEach((img) => {
      img.addEventListener("error", () => {
        const fig = img.closest(".ph-slot");
        fig.classList.remove("has"); fig.classList.add("ph-blank");
        img.closest(".ph-open").remove();
        const fb = $(".ph-fallback", fig); if (fb) fb.hidden = false;
      }, { once: true });
    });
    $$("#drawer-body .ph-open").forEach((b) => b.addEventListener("click", () => openLightbox(c, b.dataset.role)));
    $$("#drawer-body .ph-file[data-copy]").forEach((el) => el.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(el.dataset.copy); showToast("Copied " + el.dataset.copy); }
      catch { showToast(el.dataset.copy); }
    }));

    // Prev / next position
    const list = isFlip ? dossierList() : [];
    const i = list.indexOf(scan);
    $("#dossier-pos").textContent = i >= 0 ? `${i + 1} / ${list.length}` : "";
    $("#dossier-prev").disabled = !(i > 0);
    $("#dossier-next").disabled = !(i >= 0 && i < list.length - 1);

    const wasHidden = $("#drawer").hidden;
    if (wasHidden) rememberFocus();
    $("#drawer").hidden = false;
    $("#drawer-backdrop").hidden = false;
    document.body.classList.add("drawer-open");
    if (wasHidden) { $("#drawer-close").focus(); window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "coin-open" } })); }
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
    lazyThumbs($("#drawer-body"));
    if (persist && wasHidden === false) $("#drawer-inner").scrollTop = 0;
    if (persist) saveState();
  }

  function dossierStep(delta) {
    if (!currentDrawerScan) return;
    const list = dossierList();
    const i = list.indexOf(currentDrawerScan);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    openDrawer(list[j]);
  }

  // Lightbox (cycles through every photo on the card)
  let lbCard = null;
  let lbIdx = 0;
  function lbList() { return (lbCard?.photos || []).filter((p) => p.url); }
  function openLightbox(c, role) {
    lbCard = c;
    lbIdx = Math.max(0, lbList().findIndex((p) => p.role === role));
    renderLightbox();
    rememberFocus();
    $("#lightbox").hidden = false;
    $("#lb-close").focus();
  }
  function renderLightbox() {
    const list = lbList();
    const ph = list[lbIdx];
    if (!ph) return;
    $("#lb-img").src = ph.url;
    $("#lb-img").alt = `${lbCard.ser || lbCard.scan} ${ph.role}`;
    const bits = [lbCard.ser || lbCard.scan, ROLE_LABEL[ph.role] || ph.role, [lbCard.country, lbCard.year, lbCard.denom].filter(has).join(" · ")];
    $("#lb-cap").innerHTML = esc(bits.join(" · ")) + (ph.original ? ` · <a href="${esc(ph.original)}" target="_blank" rel="noopener">View master</a>` : "");
    $("#lb-prev").hidden = list.length < 2; $("#lb-next").hidden = list.length < 2;
  }
  function flipLightbox(delta = 1) {
    const list = lbList();
    if (list.length < 2) return;
    lbIdx = (lbIdx + delta + list.length) % list.length;
    renderLightbox();
  }
  function closeLightbox() {
    if ($("#lightbox").hidden) return;
    $("#lightbox").hidden = true;
    $("#lb-img").removeAttribute("src");
    lbCard = null;
    restoreFocus();
  }

  function closeDrawer() {
    if ($("#drawer").hidden) return;
    currentDrawerScan = null;
    window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "coin-close" } }));
    document.body.classList.remove("drawer-open");
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    $("#drawer").hidden = true;
    $("#drawer-backdrop").hidden = true;
    restoreFocus();
    saveState();
  }

  // Tabs
  $$(".wing").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.id === "nav-btn-spatial-table") {
        const rows = filteredFlips ? filteredFlips() : (vault?.flips || []);
        const current = rows[cfCurrentIndex] || rows[0];
        if (window.TitanSpatial) {
          window.TitanSpatial.open(current, galleryMode === "matrix" ? "planchet" : (galleryMode === "flip" ? "flip" : "slab"));
        }
        return;
      }
      setWing(btn.dataset.wing);
    });
  });

  // Wire Top Hero 3D Spatial Table Launcher & Grand Hall Spotlight Card
  function launchSpatialTable() {
    const rows = filteredFlips ? filteredFlips() : (vault?.flips || []);
    const current = rows[cfCurrentIndex] || rows[0];
    if (window.TitanSpatial) {
      window.TitanSpatial.open(current, galleryMode === "matrix" ? "planchet" : (galleryMode === "flip" ? "flip" : "slab"));
    }
  }
  $("#header-btn-spatial")?.addEventListener("click", launchSpatialTable);
  window.launchSpatialTable = launchSpatialTable;

  // Wire Album Inspector modal controls
  const albumModal = $("#album-inspector-modal");
  if (albumModal) {
    albumModal.addEventListener("click", (e) => {
      if (e.target === albumModal || e.target.id === "album-modal-backdrop") {
        closeAlbumInspector();
      }
    });
    albumModal.addEventListener("touchend", (e) => {
      if (e.target === albumModal || e.target.id === "album-modal-backdrop") {
        e.preventDefault();
        closeAlbumInspector();
      }
    }, { passive: false });
  }
  const albumCloseBtn = $("#album-btn-close");
  if (albumCloseBtn) {
    albumCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAlbumInspector();
    });
    albumCloseBtn.addEventListener("touchend", (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeAlbumInspector();
    }, { passive: false });
  }
  $("#album-btn-prev")?.addEventListener("click", () => stepAlbumFamily(-1));
  $("#album-btn-next")?.addEventListener("click", () => stepAlbumFamily(1));
  $$("#album-filter-pills .album-filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$("#album-filter-pills .album-filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeAlbumFilter = pill.dataset.filter;
      renderAlbumInspectorView();
    });
  });

  $("#drawer-close").addEventListener("click", closeDrawer);
  $("#drawer-backdrop").addEventListener("click", closeDrawer);
  $("#dossier-prev").addEventListener("click", () => dossierStep(-1));
  $("#dossier-next").addEventListener("click", () => dossierStep(1));
  $("#lb-close").addEventListener("click", closeLightbox);
  $("#lb-prev").addEventListener("click", (e) => { e.stopPropagation(); flipLightbox(-1); });
  $("#lb-next").addEventListener("click", (e) => { e.stopPropagation(); flipLightbox(); });
  $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
  window.addEventListener("keydown", (e) => {
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
    // Command palette beats everything.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (paletteOpen) closePalette(); else openPalette();
      return;
    }
    const albumModal = $("#album-inspector-modal");
    if (albumModal && !albumModal.hidden) {
      if (e.key === "Escape") { closeAlbumInspector(); return; }
      if (e.key === "ArrowLeft") { stepAlbumFamily(-1); return; }
      if (e.key === "ArrowRight") { stepAlbumFamily(1); return; }
    }
    if (!$("#lightbox").hidden) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") flipLightbox(-1);
      else if (e.key === "ArrowRight") flipLightbox(1);
      return;
    }
    if (e.key === "Escape") { closeTopOverlay(); return; }
    if (typing) return;
    if (currentDrawerScan && e.key === "ArrowLeft") dossierStep(-1);
    else if (currentDrawerScan && e.key === "ArrowRight") dossierStep(1);
    else if (e.key === "?") openKeysSheet();
    else if (e.key === " " && $("#pane-hall")?.classList.contains("active") && !currentDrawerScan) {
      e.preventDefault();
      $("#btn-ex-flip")?.click();
    }
    else if (e.key.toLowerCase() === "m" || e.key.toLowerCase() === "t" || (e.key === "3" && !e.ctrlKey && !e.metaKey)) {
      const spatialModal = $("#spatial-museum-modal");
      if (spatialModal && !spatialModal.hidden) return;
      const rows = filteredFlips ? filteredFlips() : (vault?.flips || []);
      const current = rows[cfCurrentIndex] || rows[0];
      if (window.TitanSpatial) {
        window.TitanSpatial.open(current, galleryMode === "matrix" ? "planchet" : (galleryMode === "flip" ? "flip" : "slab"));
      }
    }
    else if (/^[1-5]$/.test(e.key)) { const t = WING_ORDER[+e.key - 1]; if (t) { setWing(t); $(`.wing[data-wing="${t}"]`)?.focus(); } }
  });
  // Swipe left/right in the dossier on phones
  (() => {
    let x0 = null, y0 = null;
    const el = $("#drawer-inner");
    el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) dossierStep(dx < 0 ? 1 : -1);
      x0 = y0 = null;
    }, { passive: true });
  })();
  // Phone came back to the foreground: check for a new publish right away.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && autoRefresh) checkWebVersion();
  });

  const drawerInner = $("#drawer-inner");
  if (drawerInner) {
    drawerInner.addEventListener("scroll", () => {
      drawerScrollPauseUntil = Date.now() + 6000;
    }, { passive: true });
  }

  window.TitanReload = bustReload;   // used by wings/health.js (Refresh result message + "Update now")
  $("#btn-refresh").addEventListener("click", () => {
    if (window.TitanHealth) window.TitanHealth.refresh(); else checkWebVersion().then(() => bustReload());
  });

  // Search palette (⌘K)
  $("#btn-search").addEventListener("click", openPalette);
  $("#fab-search")?.addEventListener("click", openPalette);
  $("#palette-q").addEventListener("input", (e) => { markTyping(); renderPalette(e.target.value); });
  $("#palette-q").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Take the first result straight to its dossier. preventDefault + stopPropagation
      // keep the keydown from bubbling into the document-level handler or triggering
      // any default action; call the open path directly instead of via synthetic click.
      e.preventDefault();
      e.stopPropagation();
      const first = $("#palette-results .pal-row");
      if (first) {
        const scan = first.dataset.scan;
        closePalette();
        dossierCtx = null;
        openDrawer(scan);
      }
    }
  });
  $("#palette").addEventListener("click", (e) => { if (e.target.id === "palette") closePalette(); });

  const autoBox = $("#auto-refresh");
  if (autoBox) {
    try {
      const saved = localStorage.getItem(AUTO_KEY);
      if (saved != null) {
        autoRefresh = saved === "1";
        autoBox.checked = autoRefresh;
      }
    } catch { /* ignore */ }
    autoBox.addEventListener("change", () => {
      autoRefresh = autoBox.checked;
      try { localStorage.setItem(AUTO_KEY, autoRefresh ? "1" : "0"); } catch { /* ignore */ }
      saveState();
      updateLiveStatus();
    });
  }

  window.addEventListener("beforeunload", saveState);
  window.addEventListener("hashchange", () => { if (!location.hash || location.hash === "#") setWing("hall", false); else applyHashTab(); });

  // PWA: service worker (versioned caches; network-first for version.json + data).
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // A tab left open (or restored) can sit on a stale build: check for a new
      // service worker whenever the tab becomes visible again.
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) reg.update().catch(() => {});
      });
      // When a NEW worker takes control, the running page is the old build —
      // reload once so the user is never stuck on stale UI. (First install has
      // no prior controller, so it never reload-loops.)
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloaded) return;
        reloaded = true;
        reloadWhenSafe(() => {
          if (document.hidden) { window.location.reload(); return; }
          showToast("New version available — refreshing…");
          setTimeout(() => window.location.reload(), 900);
        });
      });
    }).catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    // Grok's review GRK-3-01: save every coin's detail, search and the questions for offline use once the app is idle (missing files only;
    // a new data build refreshes them). window.TitanWarm(true) also saves all coin photos (Health's "Save photos for offline").
    window.TitanWarm = (withPhotos) => navigator.serviceWorker.ready.then((reg) => new Promise((res) => {
      if (!reg.active) return res({ ok: false });
      const ch = new MessageChannel(); ch.port1.onmessage = (ev) => res(ev.data || { ok: false });
      reg.active.postMessage({ type: withPhotos ? "titan:warm-photos" : "titan:warm" }, [ch.port2]);
      setTimeout(() => res({ ok: false, timeout: true }), 120000);
    }));
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 4000));
    window.addEventListener("load", () => idle(() => { if (navigator.onLine && navigator.serviceWorker.controller) window.TitanWarm(false).catch(() => {}); }), { once: true });
  }

  /* --- Atmosphere system: twelve exhibition lightings, each a full sensory identity
     (lighting, texture, motion language) with its own music station and ambient
     preset. "Set the scene" applies all three at once. --- */
  const ATMOS = {
    afterhours:  { name: "Midnight Gallery", themeColor: "#060605", preset: "afterhours",  station: "lofi",      pair: "Rain + Ultralounge" },
    conservator: { name: "Conservator",    themeColor: "#f4efe4", preset: "conservator", station: "classical", pair: "Clockwork + Classical" },
    colossus:    { name: "The Mint",       themeColor: "#14100a", preset: "colossus",    station: "epic",      pair: "Foundry + Five Armies" },
    nocturne:    { name: "Nocturne",       themeColor: "#070b16", preset: "nocturne",    station: "jazz",      pair: "Midnight Rain + Jazz" },
    odyssey:     { name: "Odyssey",        themeColor: "#04121a", preset: "odyssey",     station: "adventure", pair: "Ocean Surf + Expeditionary" },
    cursedwing:  { name: "The Cursed Wing", themeColor: "#0a0505", preset: "cursedwing", station: "dark",      pair: "Abyss Drone + Oppressive Gloom" },
    kaleido:     { name: "Prism"       ,    themeColor: "#0d0218", preset: "kaleido",    station: "psych",     pair: "Singing Bowl + Psych Voyage" },
    abyss:       { name: "Shipwreck", themeColor: "#02101c", preset: "abyss",      station: "abyss",     pair: "Ocean Depths + Pressure Hymns" },
    neon:        { name: "Neon Vault",      themeColor: "#0d0118", preset: "neon",       station: "synthwave", pair: "Grid Pulse + Midnight Drive" },
    notepad:     { name: "Plaintext",       themeColor: "#ffffff", preset: "notepad",    station: "quiet",     pair: "Room Tone + Long Notes" },
    construct:   { name: "The Construct",   themeColor: "#000000", preset: "construct",  station: "construct", pair: "Machine Code + Data Relays" },
    xeno:        { name: "Xenohold",        themeColor: "#060112", preset: "xeno",       station: "xeno",      pair: "Cosmic Signal + Deep Field" },
    solaris:     { name: "Solar Observatory", themeColor: "#07040e", preset: "solaris",  station: "solaris",   pair: "Solaris + Coronal Winds" },
    alchemist:   { name: "The Alchemist",     themeColor: "#040d08", preset: "alchemist", station: "alchemist", pair: "Crucible + Hermetic Vault" },
    glacier:     { name: "Hyperborean Vault", themeColor: "#040c14", preset: "glacier",   station: "glacier",   pair: "Permafrost + Hyperborean Echo" },
    valhalla:    { name: "Gilded Armory",     themeColor: "#0a0806", preset: "valhalla",  station: "valhalla",  pair: "Great Hearth + Skaldic Lore" },
    dynasty:     { name: "Dynasty",           themeColor: "#0c0204", preset: "dynasty",   station: "dynasty",   pair: "Imperial Gong + Guzheng Silk" },
    zen:         { name: "Zen Garden",        themeColor: "#08090a", preset: "zen",       station: "zen",       pair: "Bamboo Clack + Shakuhachi Flute" },
    samadhi:     { name: "Samadhi",           themeColor: "#0b0604", preset: "samadhi",   station: "samadhi",   pair: "108Hz Om Drone + Sitar Meditations" },
    silkroad:    { name: "Silk Road",         themeColor: "#030712", preset: "silkroad",  station: "silkroad",  pair: "Caravan Bells + Desert Oud" },
  };
  const ATMO_ORDER = [
    "afterhours", "conservator", "colossus", "nocturne", "odyssey", "cursedwing", "kaleido", "abyss",
    "neon", "notepad", "construct", "xeno", "solaris", "alchemist", "glacier", "valhalla",
    "dynasty", "zen", "samadhi", "silkroad"
  ];
  function currentAtmo() {
    const a = document.documentElement.getAttribute("data-atmo");
    return ATMOS[a] ? a : "afterhours";
  }
  // A wash of the theme's color sweeps the screen on every switch — the room
  // "relights" instead of just repainting. Skipped for reduced motion.
  function atmoFlash(a) {
    try {
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const el = document.createElement("div");
      el.className = "atmo-flash";
      el.style.background = ATMOS[a].themeColor;
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("go")));
      setTimeout(() => el.remove(), 900);
    } catch { /* ignore */ }
  }
  // Per-theme full-screen FX: matrix rain + terminal for the Construct, a fake menu
  // bar + status bar for Plaintext, hue-storm for Kaleidoscope, scanlines + sun for
  // Neon Vault, a compass rose for Odyssey, a glyph ring for Xenohold.
  // Everything is created on switch and torn down on the next switch.
  const themeFx = { matrixTimer: 0, particleTimer: 0, termTimer: 0, termAbort: 0, matrixResize: null, customResize: null, stops: [], canvases: [] };
  function clearThemeFx() {
    ["kaleido-fx", "matrix-rain", "construct-term", "notepad-bar", "notepad-status",
     "neon-scan", "neon-sun", "odyssey-compass", "xeno-ring",
     "cursed-embers", "cursed-vignette", "foundry-embers", "abyss-caustics",
     "solaris-flares", "glacier-aurora", "alchemist-circles", "valhalla-embers",
     "dynasty-lanterns", "zen-petals", "samadhi-prana", "silkroad-stars"].forEach((id) => {
      document.getElementById(id)?.remove();
    });
    clearInterval(themeFx.matrixTimer); themeFx.matrixTimer = 0;
    clearInterval(themeFx.particleTimer); themeFx.particleTimer = 0;
    clearTimeout(themeFx.termTimer); themeFx.termTimer = 0;
    // managed canvas loops (fxLoop): stop the rAF, drop the visibility listener, remove the canvas
    themeFx.stops.splice(0).forEach((stop) => { try { stop(); } catch { /* ignore */ } });
    themeFx.canvases.splice(0).forEach((c) => c.remove());
    if (themeFx.matrixResize) {
      window.removeEventListener("resize", themeFx.matrixResize);
      themeFx.matrixResize = null;
    }
    if (themeFx.customResize) {
      window.removeEventListener("resize", themeFx.customResize);
      themeFx.customResize = null;
    }
    themeFx.termAbort++;
  }

  // Managed, fps-capped canvas loop for atmosphere FX. It never runs under
  // prefers-reduced-motion, pauses while the tab is hidden (no rAF, no timers) and is torn
  // down completely (rAF, visibility + resize listeners, canvas) by clearThemeFx().
  // Canvas backing store is capped at devicePixelRatio 1.5 (1.0 on touch screens).
  function fxCanvasLoop(id, fps, onSize, step) {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return null;
    const c = document.createElement("canvas");
    c.id = id;
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    themeFx.canvases.push(c);
    const g = c.getContext("2d");
    const touch = "ontouchstart" in window || window.innerWidth < 768;
    let dpr = 1, w = 0, h = 0;
    const size = () => {
      dpr = touch ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onSize) onSize(w, h, g);
    };
    size();
    window.addEventListener("resize", size);
    const gap = 1000 / fps;
    let raf = 0, last = 0, stopped = false;
    const frame = (t) => {
      raf = 0;
      if (stopped || document.hidden) return;
      if (t - last >= gap) { last = t; step(g, w, h, t); }
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      if (stopped) return;
      if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      else if (!raf) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);
    themeFx.stops.push(() => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", size);
    });
    return c;
  }
  // Exposed so atmospheres can build canvas FX that obey the same rules (and so it can be tested).
  window.TitanFX = { canvasLoop: (...a) => fxCanvasLoop(...a), clear: () => clearThemeFx(), matrixRain: () => startMatrixRain(),
    particles: (...a) => startParticleCanvas(...a), live: () => ({ stops: themeFx.stops.length, canvases: themeFx.canvases.length }) };
  function startParticleCanvas(id, drawFn, count = 45) {
    let particles = [];
    fxCanvasLoop(id, 25, (w, h) => { particles = Array.from({ length: count }, () => drawFn.init(w, h)); },
      (g, w, h) => { g.clearRect(0, 0, w, h); drawFn.frame(g, particles, w, h); });
  }
  function startMatrixRain() {
    const chars = "アイカサタナハマヤラワ0123456789$#+-*/ΞΦΨΩ";
    const fs = 15;
    let cols = 0, drops = [];
    fxCanvasLoop("matrix-rain", 15,
      (w) => { cols = Math.ceil(w / fs); drops = Array.from({ length: cols }, () => Math.random() * -40); },
      (g, w, h) => {
        g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 0, w, h);
        g.font = fs + "px monospace";
        for (let i = 0; i < cols; i++) {
          const ch = chars[(Math.random() * chars.length) | 0];
          g.fillStyle = Math.random() < 0.06 ? "#d6ffe0" : "#33ff66";
          g.fillText(ch, i * fs, drops[i] * fs);
          if (drops[i] * fs > h && Math.random() > 0.976) drops[i] = 0;
          drops[i]++;
        }
      });
  }
  const CX_SCRIPT = [
    ["PS C:\\titan-vault> ", "cx-prompt"],
    ["Get-Coin -Year 1883 | Format-Table Denom, Grade, Value", ""],
    ["Denom   Grade   Value", "cx-ok"],
    ["-----   -----   -----", "cx-ok"],
    ["$1      MS-63   $142.10", "cx-ok"],
    ["10c     AU-55   $38.75", "cx-ok"],
    ["", ""],
    ["PS C:\\titan-vault> ", "cx-prompt"],
    [".\\decrypt-provenance.ps1 -Coin \"1878-CC\"", ""],
    ["[+] provenance verified — chain of custody intact", "cx-ok"],
    ["", ""],
    ["PS C:\\titan-vault> ", "cx-prompt"],
    ["wake-the-colossus --force", ""],
    ["[!] access denied — the coins are watching", "cx-warn"],
  ];
  function startConstructTerm() {
    const el = document.createElement("div");
    el.id = "construct-term";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    const myRun = ++themeFx.termAbort;
    let li = 0, ci = 0, html = "";
    const tick = () => {
      if (myRun !== themeFx.termAbort) return; // theme changed: stop
      if (document.hidden) { themeFx.termTimer = setTimeout(tick, 1500); return; } // idle while the tab is hidden
      if (li >= CX_SCRIPT.length) {
        themeFx.termTimer = setTimeout(() => {
          if (myRun === themeFx.termAbort) { li = 0; ci = 0; html = ""; tick(); }
        }, 6000);
        return;
      }
      const [text, cls] = CX_SCRIPT[li];
      if (ci <= text.length) {
        const shown = text.slice(0, ci).replace(/&/g, "&amp;").replace(/</g, "&lt;");
        el.innerHTML = html + (cls ? `<span class="${cls}">${shown}</span>` : shown)
          + '<span class="cx-prompt">▌</span>';
        ci++;
        themeFx.termTimer = setTimeout(tick, text.startsWith("PS ") ? 34 : 16);
      } else {
        html += (cls ? `<span class="${cls}">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>` : text) + "\n";
        li++; ci = 0;
        themeFx.termTimer = setTimeout(tick, li < CX_SCRIPT.length && CX_SCRIPT[li][0] === "" ? 120 : 420);
      }
    };
    tick();
  }
  function manageThemeFx(atmo) {
    clearThemeFx();
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (atmo === "kaleido" && !reduced) {
      const d = document.createElement("div"); d.id = "kaleido-fx"; document.body.appendChild(d);
    }
    if (atmo === "neon") {
      const d = document.createElement("div"); d.id = "neon-scan"; d.setAttribute("aria-hidden", "true");
      document.body.appendChild(d);
      const s = document.createElement("div"); s.id = "neon-sun"; s.setAttribute("aria-hidden", "true");
      document.body.appendChild(s);
    }
    if (atmo === "notepad") {
      const bar = document.createElement("div");
      bar.id = "notepad-bar"; bar.setAttribute("aria-hidden", "true");
      bar.innerHTML = '<span class="np-menu"><span>File</span><span>Edit</span><span>Search</span><span>View</span><span>Help</span></span><span class="np-title">Untitled - Notepad</span>';
      document.body.prepend(bar);
      const st = document.createElement("div");
      st.id = "notepad-status"; st.setAttribute("aria-hidden", "true");
      st.innerHTML = '<span>Ln 1, Col 1</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span>';
      document.body.appendChild(st);
    }
    if (atmo === "odyssey") {
      const d = document.createElement("div"); d.id = "odyssey-compass"; d.setAttribute("aria-hidden", "true");
      document.body.appendChild(d);
    }
    if (atmo === "xeno") {
      const d = document.createElement("div"); d.id = "xeno-ring"; d.setAttribute("aria-hidden", "true");
      document.body.appendChild(d);
    }
    if (atmo === "construct" && !reduced) { startConstructTerm(); }
  }
  /* ===== ATMO CSS LOADER (perf): only the active atmosphere's stylesheet is in the document =====
     index.html writes the saved atmosphere's <link id="atmo-css"> before first paint. A later switch loads the new sheet
     next to the old one (same cascade slot, every rule is scoped to its own html[data-atmo]), flips data-atmo once it
     is ready, then drops the old sheet. Already-loaded = synchronous, as before. window.TitanAtmoReady() resolves when
     the last requested switch has been applied. */
  // the stylesheet swap itself lives in js/app-atmo-css.js (fix list #32, step 3)
  const { state: atmoCss, load: loadAtmoCss, dropOthers: dropOtherAtmoCss } = window.TitanAtmoCss;
  function setAtmo(a, save = true, flash = true) {
    const want = ATMOS[a] ? a : "afterhours";
    if (atmoCss.name === want) { atmoCss.tok++; atmoCss.ready = Promise.resolve(); dropOtherAtmoCss(want); return applyAtmo(want, save, flash); }
    const tok = ++atmoCss.tok;
    atmoCss.ready = loadAtmoCss(want).then(() => {
      if (tok !== atmoCss.tok) return;          // a newer request superseded this one
      applyAtmo(want, save, flash);
      dropOtherAtmoCss(want);
    });
  }
  function applyAtmo(a, save, flash) {
    const atmo = ATMOS[a] ? a : "afterhours";
    const changed = document.documentElement.getAttribute("data-atmo") !== atmo;
    document.documentElement.setAttribute("data-atmo", atmo);
    document.querySelectorAll(".hero-crest-watermark use, .exhibit-crest-watermark use, .cf-crest-watermark use").forEach((u) => {
      u.setAttribute("href", `#crest-${atmo}`);
    });
    manageThemeFx(atmo);
    const nm = $("#atmo-name");
    if (nm) nm.textContent = ATMOS[atmo].name;
    $$(".atmo-card").forEach((c) => c.classList.toggle("current", c.dataset.atmoVal === atmo));
    try { document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ATMOS[atmo].themeColor); } catch { /* ignore */ }
    if (save) { try { localStorage.setItem(ATMO_KEY, atmo); } catch { /* ignore */ } }
    if (changed && flash) atmoFlash(atmo);
    try { window.dispatchEvent(new CustomEvent("titan:atmo", { detail: { atmo, name: ATMOS[atmo].name } })); } catch { /* ignore */ }
    // Only when the atmosphere really changed: opening the picker calls setAtmo(current)
    // just to refresh the "On display" marks and must not start or reset the soundscape.
    if (changed && window.TitanAmbient) {
      try { window.TitanAmbient.applyPreset(ATMOS[atmo].preset); } catch (_) {}
    }
  }
  // "Set the scene": the atmosphere plus its paired ambience and music station, all at once.
  // Kept for older callers: lighting only. Sound is chosen in the Scene Studio (wings/scene.js).
  function setTheScene(a) { setAtmo(a); }
  window.setTheScene = setTheScene;
  window.showToast = showToast;   // the one toast: spatial.js, Lab and Study call this
  window.TitanSetWing = setWing;
  window.TitanSetAtmo = setAtmo;
  window.TitanRenderCoverFlow = renderCoverFlow;
  window.TitanVault = () => vault;
  window.vault = vault;
  setAtmo(document.documentElement.getAttribute("data-atmo") || "afterhours", false, false);

  /* --- Overlay manager: Esc closes the topmost layer; focus is trapped & restored.
     Focus memory, the Tab trap, topOverlayEl() and the offline banner live in js/app-overlay.js (fix list #32, step 3). --- */
  const { rememberFocus, restoreFocus, topOverlayEl } = window.TitanOverlay;
  function openAtmoSheet() {
    if (window.TitanScene && window.TitanScene.open) { window.TitanScene.open("themes"); return; }
    rememberFocus();
    setAtmo(currentAtmo(), false); // refresh the "On display" marks
    $("#atmo-sheet").hidden = false;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
    $("#atmo-close").focus();
  }
  function closeAtmoSheet() {
    if ($("#atmo-sheet").hidden) return;
    $("#atmo-sheet").hidden = true;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    restoreFocus();
  }
  function openKeysSheet() {
    rememberFocus();
    $("#keys-sheet").hidden = false;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
    $("#keys-close").focus();
  }
  function closeKeysSheet() {
    if ($("#keys-sheet").hidden) return;
    $("#keys-sheet").hidden = true;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    restoreFocus();
  }
  $("#keys-close")?.addEventListener("click", closeKeysSheet);
  $("#keys-sheet")?.addEventListener("click", (e) => { if (e.target.id === "keys-sheet") closeKeysSheet(); });
  function closeTopOverlay() {
    const top = topOverlayEl();
    if (!top) return false;
    if (top.id === "lightbox") closeLightbox();
    else if (top.id === "palette") closePalette();
    else if (top.id === "scene-sheet") window.TitanScene?.close();
    else if (top.id === "atmo-sheet") closeAtmoSheet();
    else if (top.id === "keys-sheet") closeKeysSheet();
    else if (top.classList.contains("ambient-panel")) { top.hidden = true; restoreFocus(); }
    else if (top.id === "drawer") closeDrawer();
    return true;
  }
  // Roving tabindex on the tab strip: arrows move, Enter/Space activates via the button.
  const WING_ORDER = ["hall", "gallery", "vault", "study", "lab"];
  document.querySelector(".wings")?.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const tabs = $$(".wing");
    let i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    i = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[i].focus();
    setWing(tabs[i].dataset.wing);
  });
  // Print buttons: dossier record + flips inventory.
  $("#dossier-print")?.addEventListener("click", () => window.print());
  $("#dossier-spatial")?.addEventListener("click", () => {
    if (drawerScan && window.TitanSpatial) {
      window.TitanSpatial.open(drawerScan);
    }
  });
  $("#dossier-deepzoom")?.addEventListener("click", () => {
    if (drawerScan && window.TitanDeepZoom) {
      window.TitanDeepZoom.open(drawerScan);
    }
  });
  $("#btn-atmo")?.addEventListener("click", openAtmoSheet);
  $("#atmo-close")?.addEventListener("click", closeAtmoSheet);
  $("#atmo-sheet")?.addEventListener("click", (e) => { if (e.target.id === "atmo-sheet") closeAtmoSheet(); });
  $$(".atmo-card").forEach((card) => {
    let taps = 0;
    card.addEventListener("click", (e) => {
      closeAtmoSheet();
      setTheScene(card.dataset.atmoVal);
      // Egg: tap the Cursed Wing card thirteen times and it taps back.
      if (card.dataset.atmoVal === "cursedwing") {
        taps += 1;
        if (taps === 13) {
          taps = 0;
          showToast("The thirteenth tap. It knows your name now.");
        }
      } else { taps = 0; }
    });
  });




  /* --- Search palette: Ctrl/⌘K command-K over the flips --- */
  let paletteOpen = false;
  function openPalette() {
    ensureSearch();
    rememberFocus();
    $("#palette").hidden = false;
    paletteOpen = true;
    window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "search" } }));
    renderPalette("");
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
    const q = $("#palette-q");
    q.value = "";
    requestAnimationFrame(() => q.focus());
  }
  function closePalette() {
    if (!paletteOpen) return;
    $("#palette").hidden = true;
    paletteOpen = false;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    restoreFocus();
  }
  function renderPalette(qRaw) {
    const gb = window.__galleryBridge;
    if (gb && gb.palette && !gb.paletteBroken) {
      try { if (gb.palette(qRaw) !== false) return; } catch (e) { gb.paletteBroken = true; console.warn("Palette v2 failed; using the classic palette.", e); }
    }
    const q = norm(qRaw || "");
    const box = $("#palette-results");
    if (!q) {
      box.innerHTML = `<div class="pal-empty">Type to search ${esc(intFmt((vault.flips || []).length))} flips — SER, scan, country, year, denom.</div>`;
      return;
    }
    const hits = (vault.flips || []).filter((f) => flipQueryMatch(f, q)).slice(0, 8);
    box.innerHTML = hits.length
      ? hits.map((f, i) => `
        <button type="button" class="pal-row${i === 0 ? " sel" : ""}" data-scan="${esc(f.scan)}" role="option">
          <span class="pal-ser">${esc(f.ser || f.scan)}<span class="pal-scan">${esc(f.scan)}</span></span>
          <span class="pal-meta">${esc([f.country, f.year, f.denom || f.label].filter(Boolean).join(" · "))}</span>
          <span class="pal-est">${f.est != null ? money(f.est) : "—"}</span>
        </button>`).join("")
      : `<div class="pal-empty">No matches for “${esc(qRaw)}”.</div>`;
    $$(".pal-row", box).forEach((row) => {
      row.addEventListener("click", () => {
        const scan = row.dataset.scan;
        closePalette();
        dossierCtx = null;
        openDrawer(scan);
      });
    });
  }

  /* Mirror the music bar's state on <html data-lofi="open|collapsed">, so CSS needs no `body:has(.lofi-bar…)`
     (a :has() on <body> is re-evaluated on every DOM change anywhere; it cost ~150 ms at boot on a phone).
     Read-only observer: the player code itself (audio.js) is untouched. */
  const watchLofiBar = () => {
    const bar = document.querySelector(".lofi-bar");
    if (!bar) return;
    const sync = () => {
      const v = bar.hidden ? "" : (bar.classList.contains("collapsed") ? "collapsed" : "open");
      if (v) document.documentElement.setAttribute("data-lofi", v); else document.documentElement.removeAttribute("data-lofi");
    };
    new MutationObserver(sync).observe(bar, { attributes: true, attributeFilter: ["hidden", "class"] });
    sync();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchLofiBar, { once: true });
  else watchLofiBar();

  loadVault();
  scheduleReload();
})();
