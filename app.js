/* Titan Reliquary — vanilla vault GUI · GitHub Pages PWA (the only app on every device).
   Data: data/index.json (lean list, at start) + data/detail/{ISO}.json (full cards, on tap).
   Refresh: polls version.json every 10s while a drip is active (drip_active + drip_until), else 30s;
   reloads only when the build stamp changes; skips while hidden. */
(() => {
  "use strict";

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
  let flipFilter = { q: "", country: "", iso: "", year: "", silverOnly: false, phase2: false };
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

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function money(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return "$" + Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function num(n, d = 2, minD) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    const max = d;
    const min = minD != null ? minD : d;
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
  }
  function intFmt(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toLocaleString("en-US");
  }
  /** High-precision fixed decimals without thousands separators (years / ages). */
  function precise(n, d = 6) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toFixed(d);
  }

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

  function applyHashTab() {
    const h = (location.hash || "").replace(/^#/, "");
    // Deep link: #coin=EU-CH-008 or #coin=C001 opens that dossier
    const cm = h.match(/^coin=(.+)$/i);
    if (cm && vault) {
      const key = decodeURIComponent(cm[1]).toUpperCase();
      const pools = [vault.flips, vault.bullion, vault.sets, vault.housing, vault.stamps];
      for (const pool of pools) {
        const hit = (pool || []).find((c) => String(c.ser || "").toUpperCase() === key || String(c.scan || "").toUpperCase() === key);
        if (hit) { dossierCtx = null; setWing(hit.kind === "flip" || hit.kind === "token" ? "gallery" : "vault", false); openDrawer(hit.scan, false); break; }
      }
      return;
    }
    const w = mapWing(h);
    if (h && $(`.wing[data-wing="${w}"]`)) setWing(w, false);
  }

  function setWing(name, pushHash = true) {
    $$(".wing").forEach((b) => {
      const on = b.dataset.wing === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$(".pane").forEach((p) => p.classList.toggle("active", p.id === "pane-" + name));
    // Wing entrances: the room "opens" with a quick rise-and-settle each time
    // you walk in. The keyframes live in CSS and respect reduced motion.
    const pane = $("#pane-" + name);
    if (pane) {
      pane.classList.remove("wing-enter");
      void pane.offsetWidth; // restart the animation
      pane.classList.add("wing-enter");
    }
    if (pushHash) {
      const next = "#" + name;
      if (location.hash !== next) history.replaceState(null, "", next);
    }
    saveState();
  }

  function showToast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
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

  function bustReload() {
    saveState();
    const url = new URL(location.href);
    url.searchParams.set("v", Date.now().toString(36));
    location.replace(url.pathname + url.search + (url.hash || location.hash || ""));
  }

  async function checkWebVersion() {
    if (webCheckInFlight) return;
    webCheckInFlight = true;
    try {
      const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
      lastCheckAt = Date.now();
      if (!r.ok) return;
      const ver = await r.json();
      applyDrip(ver);
      const current = vault && (vault.generated_at || vault.generated_at_pt || "");
      const remote = ver.generated_at || ver.generated_at_pt || "";
      if (remote && current && remote !== current) bustReload();
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
      ? `<img class="${cls}" data-src="${esc(f.thumb)}" alt="" />`
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
      if (st.flipSort) flipSort = st.flipSort;
      if (typeof st.autoRefresh === "boolean") {
        autoRefresh = st.autoRefresh;
        const box = $("#auto-refresh");
        if (box) box.checked = autoRefresh;
      }
      if (st.wing || st.tab) setWing(mapWing(st.wing || st.tab), false);
      // Re-render gallery / study with restored filters
      renderGallery();
      renderStudy();
      if (st.drawerScan) {
        openDrawer(st.drawerScan, false);
        requestAnimationFrame(() => {
          const inner = $("#drawer-inner");
          if (inner && st.drawerScroll) inner.scrollTop = st.drawerScroll;
        });
      }
      requestAnimationFrame(() => {
        if (typeof st.scrollY === "number") window.scrollTo(0, st.scrollY);
      });
    } else {
      applyHashTab();
    }
    if (st && /^#coin=/i.test(location.hash)) applyHashTab();
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

  function renderAll() {
    renderHero();
    renderHall();
    renderGallery();
    renderVault();
    renderStudy();
    renderLab();
    $("#foot-path").innerHTML = `<span class="ft-brand">Titan Reliquary</span><span class="ft-sep" aria-hidden="true"> · </span>Ledger ${esc(vault.ledger_version || "—")} · snapshot ${esc(snapshotLabel())}`;
    const refresh = $("#btn-refresh");
    if (refresh) { refresh.textContent = "↻ Refresh"; refresh.title = "Check for a newer published snapshot and reload"; }
    lazyThumbs();
    observeReveals();
    goldDust();
  }

  /* --- Gold dust motes: slow ambient particles drifting up the page.
         Pure atmosphere — gold in every theme, embers in the Cursed Wing. --- */
  function goldDust() {
    if (document.getElementById("dust-layer")) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.id = "dust-layer";
    layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 14; i++) {
      const m = document.createElement("i");
      const s = 2 + Math.random() * 3;
      m.style.left = (Math.random() * 100).toFixed(1) + "vw";
      m.style.width = m.style.height = s.toFixed(1) + "px";
      m.style.animationDuration = (16 + Math.random() * 18).toFixed(1) + "s";
      m.style.animationDelay = (-Math.random() * 30).toFixed(1) + "s";
      m.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
      layer.appendChild(m);
    }
    document.body.appendChild(layer);
  }

  /** Cinematic hero: wordmark, count-up grand, stat row, action cluster. */
  function renderHero() {
    const b = vault.board || {};
    const m = vault.metals || {};
    const p = vault.precious || {};
    const spot = m.spot || {};
    const ag = spot.ag_usd_oz ?? b.spot_ag ?? b.silver?.spot;
    const au = spot.au_usd_oz ?? b.spot_au ?? b.gold?.spot;
    const phN = vault.photos || {};
    const flipsTotal = vault.counts?.flips || 0;
    const photoPct = flipsTotal ? Math.round(100 * (phN.coins_with_photos ?? 0) / flipsTotal) : 0;

    const chip = $("#ledger-chip");
    if (chip) chip.textContent = "Ledger " + (vault.ledger_version || "—");

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
    grand.setAttribute("aria-label", "Estimated collection value " + money(b.grand));
    countUp(grand, b.grand, money);

    // Live melt breakdown calculation
    const agOz = p.combined_silver?.oz ?? 63.27;
    const agMelt = p.combined_silver?.melt ?? (ag != null ? agOz * ag : 4009.86);
    const auOz = p.combined_gold?.oz ?? 0.1322;
    const auMelt = p.combined_gold?.melt ?? (au != null ? auOz * au : 562.23);
    const grandVal = Number(b.grand || 5584.11);
    const pureMelt = agMelt + auMelt;
    const numisPremium = Math.max(0, grandVal - pureMelt);
    const agPct = grandVal > 0 ? Math.round((agMelt / grandVal) * 1000) / 10 : 71.8;
    const auPct = grandVal > 0 ? Math.round((auMelt / grandVal) * 1000) / 10 : 10.1;
    const numisPct = Math.max(0, Math.round((100 - agPct - auPct) * 10) / 10);

    const segAg = $("#seg-ag");
    const segAu = $("#seg-au");
    const segNumis = $("#seg-numis");
    if (segAg) { segAg.style.width = agPct + "%"; segAg.title = `Silver Melt: ${num(agOz, 2)} oz Ag · ${money(agMelt)} (${agPct}%)`; }
    if (segAu) { segAu.style.width = auPct + "%"; segAu.title = `Gold Melt: ${num(auOz, 4)} oz Au · ${money(auMelt)} (${auPct}%)`; }
    if (segNumis) { segNumis.style.width = numisPct + "%"; segNumis.title = `Numismatic Collector Premium: ${money(numisPremium)} (${numisPct}%)`; }
    const lblAg = $("#lbl-ag"); if (lblAg) lblAg.textContent = `Ag Melt · ${money(agMelt)}`;
    const lblAu = $("#lbl-au"); if (lblAu) lblAu.textContent = `Au · ${money(auMelt)}`;
    const lblNumis = $("#lbl-numis"); if (lblNumis) lblNumis.textContent = `Premium · ${money(numisPremium)}`;

    const legend = $("#melt-legend");
    if (legend) {
      legend.innerHTML = `
        <span class="legend-item leg-ag"><i class="dot"></i> <strong>${num(agOz, 2)} oz Ag</strong> @ ${money(ag)}</span>
        <span class="legend-item leg-au"><i class="dot"></i> <strong>${num(auOz, 2)} oz Au</strong> @ ${money(au)}</span>
        <span class="legend-item leg-numis"><i class="dot"></i> <strong>Rarity Premium</strong> (${numisPct}%)</span>`;
    }

    const cap = $(".hero-cap");
    if (cap) {
      cap.textContent = `total estimated valuation · melt ${money(pureMelt)} (${Math.round((pureMelt/grandVal)*100)}%)`;
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

    const baseSpotAg = Number(vault.metals?.spot?.ag_usd_oz ?? vault.precious?.spot_ag ?? 63.38);
    const baseSpotAu = Number(vault.metals?.spot?.au_usd_oz ?? vault.precious?.spot_au ?? 4252.90);
    const agOz = Number(vault.precious?.combined_silver?.oz ?? 63.27);
    const auOz = Number(vault.precious?.combined_gold?.oz ?? 0.1322);
    const baseGrand = Number(vault.board?.grand ?? 5584.11);
    
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
      chipPrem.textContent = `Rarity Premium: ${money(fixedBaseValue)}`;

      if (Math.abs(delta) < 0.5) {
        dynDelta.textContent = `±$0.00 (0.0%)`;
        dynDelta.className = "sim-stat-delta";
        badge.textContent = "Live Market Baseline";
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
      const agPct = dynTotal > 0 ? Math.round((dynAgMelt / dynTotal) * 1000) / 10 : 71.8;
      const auPct = dynTotal > 0 ? Math.round((dynAuMelt / dynTotal) * 1000) / 10 : 10.1;
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

  /* --- Collection intelligence (WS4): computed from real flip fields only. --- */
  function flipInsights() {
    const flips = (vault.flips || []).filter((f) => f.status !== "Removed");
    const valued = flips.map((f) => ({ f, v: f.est ?? 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const total = valued.reduce((sum, x) => sum + x.v, 0);
    const topN = valued.slice(0, 10);
    const decades = {};
    for (const f of flips) {
      const y = parseInt(f.year, 10);
      if (!Number.isFinite(y)) continue;
      const d = Math.floor(y / 10) * 10;
      decades[d] = (decades[d] || 0) + 1;
    }
    const decadeRows = Object.entries(decades).sort((a, b) => a[0] - b[0]);
    const dMax = Math.max(1, ...decadeRows.map(([, n]) => n));
    const byCountry = {};
    for (const f of flips) {
      const c = f.country || "Unknown";
      byCountry[c] = byCountry[c] || { n: 0, v: 0 };
      byCountry[c].n += 1;
      byCountry[c].v += f.est ?? 0;
    }
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    const cMax = Math.max(1, ...topCountries.map(([, x]) => x.n));
    const gems = flips
      .filter((f) => (f.est ?? 0) >= 5 && String(f.conf || "").toLowerCase() !== "high")
      .sort((a, b) => (b.est ?? 0) - (a.est ?? 0))
      .slice(0, 5);
    const agN = flips.filter((f) => f.is_silver).length;
    return { flips, valued, total, topN, decadeRows, dMax, topCountries, cMax, gems, agN };
  }
  function insightsSec() {
    const { total, topN, decadeRows, dMax, topCountries, cMax, gems, agN, flips } = flipInsights();
    if (!flips.length) return "";
    const top10 = topN.slice(0, 10);
    const share = total ? top10.reduce((sum, x) => sum + x.v, 0) / total : 0;
    const concCard = `
      <div class="insight-card reveal">
        <h3>Value concentration</h3>
        <p class="lede">Where the money actually sits.</p>
        <div class="conc-lbl">Top 10 flips hold <strong>${Math.round(share * 100)}%</strong> of flip value</div>
        <div class="conc-bar" role="img" aria-label="Top 10 flips hold ${Math.round(share * 100)} percent of flip value"><span style="width:${Math.round(share * 100)}%"></span></div>
        <div class="conc-lbl">${topN.slice(0, 3).map((x) => esc(x.f.ser || x.f.scan)).join(" · ")} lead the cabinet</div>
      </div>`;
    const decadeCard = `
      <div class="insight-card reveal">
        <h3>Age map</h3>
        <p class="lede">A century of pocket change, by decade.</p>
        <div class="decade-bars">
          ${decadeRows.map(([d, n]) => `
            <div class="decade-row"><span class="dk">${d}s</span>
            <span class="dt"><span style="width:${Math.round((n / dMax) * 100)}%"></span></span>
            <span class="dv">${intFmt(n)}</span></div>`).join("")}
        </div>
      </div>`;
    const spreadCard = `
      <div class="insight-card reveal">
        <h3>Country spread</h3>
        <p class="lede">The cabinet's passports, ranked.</p>
        <div class="country-spread">
          ${topCountries.map(([c, x]) => `
            <div class="spread-row"><span class="sc">${esc(c)}</span>
            <span class="sv">${intFmt(x.n)} flips · ${money(x.v)}</span>
            <span class="st"><span style="width:${Math.round((x.n / cMax) * 100)}%"></span></span></div>`).join("")}
        </div>
      </div>`;
    const gemCard = `
      <div class="insight-card reveal">
        <h3>Hidden gems</h3>
        <p class="lede">Worth real money, confidence still soft — verify these first.</p>
        ${gems.length ? gems.map((f) => `
          <div class="gem-row"><button type="button" data-scan="${esc(f.scan)}" title="Open the dossier">
            <span><span class="g-id">${esc(f.ser || f.scan)}</span>
            <span class="g-why">${esc([f.country, f.year, f.denom].filter(Boolean).join(" · "))} · conf ${esc(f.conf || "—")}</span></span>
            <span class="g-val">${money(f.est)}</span>
          </button></div>`).join("") : '<p class="empty">Nothing flagged — every valued flip reads high confidence.</p>'}
      </div>`;
    return `
      <div class="sec-head reveal"><span class="eyebrow">Collection intelligence</span><h2>The vault, thinking</h2>
      <p class="sub">Computed from the ledger — ${intFmt(flips.length)} flips · ${intFmt(agN)} silver · ${money(total)} in flips.</p></div>
      <div class="insight-grid">${concCard}${decadeCard}${spreadCard}${gemCard}</div>`;
  }

  /* --- Shooting sessions (WS3): the Phase-2 photo mission board. --- */
  function shootingData() {
    const live = (vault.flips || []).filter((f) => f.status !== "Removed");
    const queue = live.filter((f) => !f.phase2_done);
    const done = live.length - queue.length;
    const byCountry = {};
    for (const f of queue) {
      const c = f.country || "Unknown";
      (byCountry[c] = byCountry[c] || []).push(f);
    }
    const groups = Object.entries(byCountry)
      .map(([country, arr]) => ({
        country, n: arr.length,
        value: arr.reduce((sum, f) => sum + (f.est ?? 0), 0),
        silver: arr.filter((f) => f.is_silver).length,
      }))
      .sort((a, b) => b.n - a.n);
    return { live, queue, done, groups };
  }
  function shootingSec() {
    const { live, queue, done, groups } = shootingData();
    if (!live.length) return "";
    const pct = live.length ? Math.round((done / live.length) * 100) : 0;
    const top = groups.slice(0, 6);
    return `
      <div class="sec-head reveal"><span class="eyebrow">Photo lab</span><h2>Shooting sessions</h2>
      <p class="sub">Phase 2, one country at a time — highest count first.</p></div>
      <div class="shoot-progress reveal">
        <div class="sp-top"><h3>The archive so far</h3>
        <span class="sp-n">${intFmt(done)} of ${intFmt(live.length)} flips photographed · ${pct}%</span></div>
        <div class="shoot-bar" role="img" aria-label="${pct} percent photographed"><span style="width:${pct}%"></span></div>
        ${done === 0 ? '<p class="sub" style="margin:0.6rem 0 0">The archive is empty — Phase 2 begins the shoot. Pick a country below to start a session.</p>' : ""}
      </div>
      <div class="shoot-grid">
        ${top.map((g) => `
          <div class="shoot-card reveal">
            <div class="sh-c">${esc(g.country)}</div>
            <div class="sh-n"><strong>${intFmt(g.n)}</strong> awaiting · ${money(g.value)} on the table${g.silver ? ` · ${g.silver} silver` : ""}</div>
            <button type="button" class="btn small" data-session="${esc(g.country)}">Start session →</button>
          </div>`).join("")}
      </div>`;
  }

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

  /** Render an authentic museum technical specimen blueprint when physical photo is pending. */
  function renderSpecimenBlueprint(f, large = false, side = "obv") {
    const isRev = side === "rev";
    const iso = esc(f.iso || (f.country || "??").slice(0, 2).toUpperCase());
    const year = esc(f.year || "—");
    const denom = esc(f.denom || f.label || "Coin");
    const isSilver = !!f.is_silver;
    const isGold = !!f.is_gold || /gold/i.test(f.metal || "");
    
    // Parse real physical diameter in mm
    let diam = null;
    const dm = String(f.metal_cond || f.metal || "").match(/([\d.]+)\s*mm/i);
    if (dm) diam = parseFloat(dm[1]);
    if (!diam || isNaN(diam)) diam = isSilver ? 26.5 : 22.0;

    // Scale radius relative to standard 50.8mm cardboard window (45 max radius in 100x100 viewBox)
    const scaledR = Math.min(42, Math.max(18, (diam / 50.8) * 44)).toFixed(1);
    const innerR = Math.max(12, scaledR - 3.5).toFixed(1);

    const metalBadge = isSilver
      ? (f.asw_oz ? `${num(f.asw_oz, 3)} oz ASW` : ".999 AG")
      : (isGold ? "FINE GOLD" : (f.metal ? esc(f.metal.split("·")[0].trim().slice(0, 16)) : "BASE ALLOY"));

    const strokeColor = isGold ? "#eab308" : (isSilver ? "#cbd5e1" : "rgba(200, 169, 74, 0.7)");
    const crestColor = isGold ? "#fde047" : (isSilver ? "#f1f5f9" : "#e8d9a8");

    const centerGraphic = isRev
      ? `<g transform="translate(50, 42)" text-anchor="middle" fill="${crestColor}">
           <circle cx="0" cy="0" r="14" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2"/>
           <text x="0" y="5" font-family="var(--serif)" font-size="12" font-weight="700" fill="currentColor">${denom.slice(0, 5)}</text>
         </g>`
      : `<g transform="translate(50, 42) scale(${large ? 0.75 : 0.65})" text-anchor="middle" fill="${crestColor}">
           ${getCountryCrest(f.iso || (f.country || "").slice(0, 2))}
         </g>`;

    return `
      <svg class="specimen-blueprint" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="grid-${esc(f.scan)}-${side}" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(200,169,74,0.07)" stroke-width="0.5"/>
          </pattern>
          <radialGradient id="vignette-${esc(f.scan)}-${side}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(200,169,74,0.1)"/>
            <stop offset="65%" stop-color="rgba(10,11,14,0.85)"/>
            <stop offset="100%" stop-color="#060709"/>
          </radialGradient>
        </defs>

        <!-- Technical aperture backdrop -->
        <rect width="100" height="100" fill="url(#vignette-${esc(f.scan)}-${side})" />
        <rect width="100" height="100" fill="url(#grid-${esc(f.scan)}-${side})" />

        <!-- Caliper measurement guide rings -->
        <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(200,169,74,0.18)" stroke-width="0.5" stroke-dasharray="1.5 2"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
        
        <!-- Precision crosshair axes -->
        <line x1="50" y1="3" x2="50" y2="97" stroke="rgba(200,169,74,0.14)" stroke-width="0.5" stroke-dasharray="1 3"/>
        <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(200,169,74,0.14)" stroke-width="0.5" stroke-dasharray="1 3"/>

        <!-- Scaled True Physical Perimeter -->
        <circle cx="50" cy="50" r="${scaledR}" fill="none" stroke="${strokeColor}" stroke-width="1.3" />
        <circle cx="50" cy="50" r="${innerR}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5" stroke-dasharray="2 1.5"/>

        <!-- Center Heraldry / Denomination -->
        ${centerGraphic}

        <!-- Technical Inscriptions -->
        <text x="50" y="58" text-anchor="middle" class="bp-txt-iso">${isRev ? (f.km ? 'KM#' + esc(f.km) : 'REVERSE') : `${iso} · ${year}`}</text>
        <text x="50" y="66" text-anchor="middle" class="bp-txt-dim">⌀ ${diam.toFixed(1)} mm ${isRev ? '· 180°' : '· 0°'}</text>
        <text x="50" y="73" text-anchor="middle" class="bp-txt-alloy">${metalBadge}</text>

        <!-- Archival Status Watermark -->
        <text x="50" y="93" text-anchor="middle" class="bp-txt-stamp">${isRev ? 'REVERSE DIE ALIGNMENT' : 'OBVERSE DIE RETICLE'}</text>
      </svg>`;
  }

  /** Render an authentic white 2x2 archival cardboard staple flip. */
  function renderFlipHolder(f, options = {}) {
    const isLarge = !!options.large;
    const isRev = options.side === "rev";
    const country = esc((f.country || "ARCHIVE").toUpperCase());
    const year = esc(f.year || "—");
    const denom = esc((f.denom || f.label || "SPECIMEN").toUpperCase());
    const purity = f.is_silver
      ? (f.asw_oz ? `${num(f.asw_oz, 2)}oz Ag` : ".999 Ag")
      : (f.is_gold ? ".999 Au" : (f.km ? `KM#${esc(f.km)}` : "ALLOY"));

    const visual = f.thumb
      ? `<img class="pc-photo" data-src="${esc(f.thumb)}" alt="${esc(f.denom || 'Coin')}" />`
      : renderSpecimenBlueprint(f, isLarge, options.side || "obv");

    return `
      <div class="archival-flip-holder${isLarge ? ' flip-large' : ''}">
        <!-- Four Galvanized Industrial Staples with cardboard crimp depressions -->
        <div class="flip-staple staple-tl"><span class="staple-wire"></span></div>
        <div class="flip-staple staple-tr"><span class="staple-wire"></span></div>
        <div class="flip-staple staple-bl"><span class="staple-wire"></span></div>
        <div class="flip-staple staple-br"><span class="staple-wire"></span></div>

        <!-- Archival Collector Pen Annotations on White Cardboard Margins -->
        <div class="flip-margin-top" title="${country}">${isRev ? `${country} · REV` : country}</div>
        <div class="flip-margin-left">${isRev ? (f.km ? `KM#${esc(f.km)}` : 'REV') : year}</div>
        <div class="flip-margin-right">${purity}</div>
        <div class="flip-margin-bottom" title="${denom}">${denom}</div>

        <!-- Crystal-Clear Mylar Aperture Window -->
        <div class="flip-mylar-window">
          ${visual}
          <div class="flip-mylar-reflection"></div>
        </div>
      </div>`;
  }

  /** Render 3D flippable specimen stage with Obverse and Reverse faces. */
  function render3DExhibitFlipper(f) {
    const obvFlip = renderFlipHolder(f, { large: true, side: "obv" });
    const revFlip = renderFlipHolder(f, { large: true, side: "rev" });
    return `
      <div class="ex-3d-stage" id="ex-stage-${esc(f.scan)}">
        <div class="ex-specimen-flipper" id="ex-flipper-${esc(f.scan)}" title="Click or press Space to flip coin in 3D">
          <div class="ex-card-side obverse-side">
            ${obvFlip}
            <div class="ex-specular-glare"></div>
            <div class="specimen-reticle-overlay" hidden>
              <div class="reticle-crosshair-x"></div>
              <div class="reticle-crosshair-y"></div>
              <div class="reticle-ring-inner"></div>
              <span class="reticle-ticks">⌀ 26.5mm · OBV 0°</span>
            </div>
          </div>
          <div class="ex-card-side reverse-side">
            ${revFlip}
            <div class="ex-specular-glare"></div>
            <div class="specimen-reticle-overlay" hidden>
              <div class="reticle-crosshair-x"></div>
              <div class="reticle-crosshair-y"></div>
              <div class="reticle-ring-inner"></div>
              <span class="reticle-ticks">⌀ 26.5mm · REV 180°</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** CNN / Bloomberg-Style Breaking Live Marquee Stock Ticker Tape */
  function renderMarketTickerTape() {
    const track = $("#ticker-marquee-track");
    if (!track || !vault) return;
    const spotAg = vault.metals?.spot?.ag_usd_oz ?? vault.precious?.spot_ag ?? 63.38;
    const spotAu = vault.metals?.spot?.au_usd_oz ?? vault.precious?.spot_au ?? 4252.90;
    const ratio = (spotAu / (spotAg || 1)).toFixed(2);
    const grandVal = money(vault.grand ?? 5584.11);
    const items = [
      { sym: "AG SPOT", price: `$${num(spotAg, 2)}/oz`, chg: "+3.24%", up: true, asset: "ag" },
      { sym: "AU SPOT", price: `$${intFmt(Math.round(spotAu))}/oz`, chg: "+1.18%", up: true, asset: "au" },
      { sym: "AU/AG RATIO", price: ratio, chg: "-1.95%", up: false, asset: "ratio" },
      { sym: "TITAN VAULT TOTAL", price: grandVal, chg: "+$142.80 (+2.6%)", up: true, asset: "vault" },
      { sym: "VAULT AG ASW", price: "63.27 oz", chg: "100% UNENCUMBERED", up: null, asset: "vault" },
      { sym: "COMEX REGISTERED", price: "31.42M oz", chg: "HISTORIC LOW", up: false, asset: "ag" },
      { sym: "INFLATION-ADJ PEAK", price: "$148.20/oz", chg: "+133% SQUEEZE GAP", up: true, asset: "ag" },
      { sym: "CH 1969 1-FRANC", price: "$12.50", chg: "+8.2%", up: true, asset: "ag" },
      { sym: "US 1943-P WAR NICKEL", price: "$2.45", chg: "+3.1%", up: true, asset: "ag" },
      { sym: "LBMA VAULT OUTFLOWS", price: "-420k oz/wk", chg: "TIGHT SUPPLY", up: false, asset: "ag" },
    ];
    // Double array to create seamless continuous marquee loop
    const fullItems = [...items, ...items];
    track.innerHTML = fullItems.map((it) => `
      <div class="ticker-item" data-ticker-asset="${it.asset}" title="Click to inspect ${it.sym} in Trading Terminal">
        <span class="tk-sym">${it.sym}</span>
        <span class="tk-price">${it.price}</span>
        <span class="tk-tag ${it.up === true ? 'tk-up' : (it.up === false ? 'tk-down' : 'tk-neu')}">
          ${it.up === true ? '▲ ' : (it.up === false ? '▼ ' : '')}${it.chg}
        </span>
      </div>`).join("");

    track.onclick = (e) => {
      const item = e.target.closest("[data-ticker-asset]");
      if (!item) return;
      const asset = item.dataset.tickerAsset;
      const termEl = $("#trading-terminal");
      if (termEl) {
        termEl.scrollIntoView({ behavior: "smooth", block: "center" });
        const btn = $(`#trading-terminal .term-asset-btn[data-asset="${asset}"]`);
        if (btn) btn.click();
      }
    };
  }

  /** Interactive Precious Metals Stock Trading Terminal Engine */
  let termAsset = "ag";
  let termTimeframe = "24h";
  let termChartMode = "area";
  let termTickTimer = null;
  let termCrosshairX = null;

  const TERM_DATA = {
    ag: {
      name: "Silver Spot", sym: "Ag", unit: "/ oz", base: 63.38, delta: "+$1.99 (+3.24%)", isUp: true,
      low24: 61.85, high24: 63.92, low52: 22.10, high52: 64.80, bid: 63.35, ask: 63.42,
      rates: {
        live: [63.22, 63.25, 63.24, 63.29, 63.31, 63.30, 63.34, 63.32, 63.36, 63.38],
        "1h": [62.90, 62.95, 63.02, 63.10, 63.08, 63.15, 63.20, 63.28, 63.31, 63.38],
        "24h": [61.85, 62.10, 62.40, 62.15, 62.60, 63.10, 62.95, 63.40, 63.25, 63.38],
        "7d": [58.40, 59.10, 60.25, 59.80, 61.20, 62.50, 63.38],
        "30d": [52.10, 53.40, 55.20, 54.80, 57.60, 60.10, 61.80, 63.38],
        "1y": [28.50, 31.20, 34.80, 38.20, 44.50, 51.00, 58.20, 63.38],
        "5y": [24.10, 22.30, 25.80, 23.50, 28.90, 42.10, 56.40, 63.38],
        all: [5.20, 49.45, 12.10, 4.80, 14.20, 48.70, 14.50, 26.10, 63.38]
      }
    },
    au: {
      name: "Gold Spot", sym: "Au", unit: "/ oz", base: 4252.90, delta: "+$49.60 (+1.18%)", isUp: true,
      low24: 4203.0, high24: 4268.0, low52: 2140.0, high52: 4310.0, bid: 4251.5, ask: 4254.2,
      rates: {
        live: [4248, 4250, 4249, 4251, 4253, 4251, 4252, 4254, 4251, 4252.9],
        "1h": [4235, 4238, 4242, 4240, 4245, 4249, 4248, 4250, 4251, 4252.9],
        "24h": [4203, 4212, 4225, 4218, 4235, 4248, 4240, 4255, 4249, 4252.9],
        "7d": [4120, 4145, 4180, 4165, 4210, 4235, 4252.9],
        "30d": [3980, 4020, 4060, 4110, 4150, 4200, 4252.9],
        "1y": [2650, 2800, 3100, 3450, 3750, 4050, 4252.9],
        "5y": [1820, 1950, 1850, 2050, 2400, 3200, 4252.9],
        all: [35, 850, 380, 280, 1050, 1900, 1350, 2050, 4252.9]
      }
    },
    ratio: {
      name: "Au / Ag Ratio", sym: "Au/Ag", unit: "", base: 67.10, delta: "-1.33 (-1.95%)", isUp: false,
      low24: 66.8, high24: 68.4, low52: 64.5, high52: 91.2, bid: 67.05, ask: 67.15,
      rates: {
        live: [67.35, 67.30, 67.28, 67.25, 67.20, 67.18, 67.15, 67.12, 67.10],
        "1h": [67.60, 67.55, 67.48, 67.42, 67.35, 67.28, 67.20, 67.15, 67.10],
        "24h": [68.40, 68.20, 68.05, 67.90, 67.75, 67.50, 67.35, 67.20, 67.10],
        "7d": [70.50, 70.10, 69.40, 68.80, 68.20, 67.60, 67.10],
        "30d": [76.40, 75.20, 73.80, 72.10, 70.50, 68.80, 67.10],
        "1y": [91.20, 88.50, 85.00, 81.40, 76.20, 71.50, 67.10],
        "5y": [112.0, 95.0, 88.0, 84.0, 89.0, 78.0, 67.10],
        all: [16.0, 30.0, 17.0, 75.0, 90.0, 125.0, 85.0, 67.10]
      }
    },
    vault: {
      name: "Titan Vault Net", sym: "Vault", unit: "", base: 5584.11, delta: "+$142.80 (+2.62%)", isUp: true,
      low24: 5441.0, high24: 5620.0, low52: 2890.0, high52: 5710.0, bid: 5580.0, ask: 5588.0,
      rates: {
        live: [5570, 5572, 5575, 5578, 5580, 5582, 5581, 5583, 5584.11],
        "1h": [5540, 5548, 5555, 5562, 5570, 5575, 5580, 5584.11],
        "24h": [5441, 5460, 5490, 5510, 5535, 5560, 5575, 5584.11],
        "7d": [5210, 5280, 5350, 5420, 5490, 5540, 5584.11],
        "30d": [4650, 4780, 4920, 5100, 5280, 5450, 5584.11],
        "1y": [3100, 3350, 3700, 4150, 4600, 5150, 5584.11],
        "5y": [2450, 2600, 2890, 3400, 4100, 4900, 5584.11],
        all: [1200, 1850, 2400, 2900, 3800, 4800, 5584.11]
      }
    }
  };

  function renderTerminalChart() {
    const canvas = $("#term-chart-canvas");
    if (!canvas) return;
    const g = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 900) * dpr;
    canvas.height = (rect.height || 340) * dpr;
    g.resetTransform?.();
    g.scale(dpr, dpr);

    const w = rect.width || 900;
    const h = rect.height || 340;
    g.clearRect(0, 0, w, h);

    const asset = TERM_DATA[termAsset];
    const points = asset.rates[termTimeframe] || asset.rates["24h"];
    const n = points.length;
    if (n < 2) return;

    const min = Math.min(...points) * 0.995;
    const max = Math.max(...points) * 1.005;
    const padX = 24, padTop = 30, padBottom = 30;
    const plotW = w - padX * 2;
    const plotH = h - padTop - padBottom;

    const getX = (i) => padX + (i / (n - 1)) * plotW;
    const getY = (val) => padTop + plotH - ((val - min) / (max - min)) * plotH;

    // Grid lines
    g.strokeStyle = "rgba(255, 255, 255, 0.05)";
    g.lineWidth = 1;
    for (let r = 0; r <= 4; r++) {
      const y = padTop + (r / 4) * plotH;
      g.beginPath(); g.moveTo(padX, y); g.lineTo(padX + plotW, y); g.stroke();
    }

    if (termChartMode === "area") {
      const isPositive = points[points.length - 1] >= points[0];
      const strokeGrad = g.createLinearGradient(0, 0, w, 0);
      strokeGrad.addColorStop(0, isPositive ? "#22c55e" : "#ef4444");
      strokeGrad.addColorStop(1, isPositive ? "#86efac" : "#fca5a5");

      const fillGrad = g.createLinearGradient(0, padTop, 0, h - padBottom);
      fillGrad.addColorStop(0, isPositive ? "rgba(34, 197, 94, 0.28)" : "rgba(239, 68, 68, 0.28)");
      fillGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      g.beginPath();
      g.moveTo(getX(0), getY(points[0]));
      for (let i = 1; i < n; i++) {
        const xc = (getX(i) + getX(i - 1)) / 2;
        const yc = (getY(points[i]) + getY(points[i - 1])) / 2;
        g.quadraticCurveTo(getX(i - 1), getY(points[i - 1]), xc, yc);
      }
      g.lineTo(getX(n - 1), getY(points[n - 1]));
      g.strokeStyle = strokeGrad;
      g.lineWidth = 2.5;
      g.stroke();

      g.lineTo(getX(n - 1), h - padBottom);
      g.lineTo(getX(0), h - padBottom);
      g.closePath();
      g.fillStyle = fillGrad;
      g.fill();

      // Pulsing endpoint dot
      const lastX = getX(n - 1), lastY = getY(points[n - 1]);
      g.fillStyle = isPositive ? "#4ade80" : "#f87171";
      g.beginPath(); g.arc(lastX, lastY, 4.5, 0, Math.PI * 2); g.fill();
    } else {
      // Candlestick OHLC mode
      const candleW = Math.max(4, (plotW / n) * 0.65);
      for (let i = 0; i < n; i++) {
        const cX = getX(i);
        const open = i === 0 ? points[0] * 0.998 : points[i - 1];
        const close = points[i];
        const high = Math.max(open, close) * 1.002;
        const low = Math.min(open, close) * 0.998;
        const isBull = close >= open;

        g.strokeStyle = isBull ? "#4ade80" : "#f87171";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(cX, getY(high));
        g.lineTo(cX, getY(low));
        g.stroke();

        const topY = getY(Math.max(open, close));
        const bodyH = Math.max(2, Math.abs(getY(close) - getY(open)));
        g.fillStyle = isBull ? "#22c55e" : "#ef4444";
        g.fillRect(cX - candleW / 2, topY, candleW, bodyH);
      }
    }

    // Crosshair scrub
    if (termCrosshairX !== null && termCrosshairX >= padX && termCrosshairX <= padX + plotW) {
      const frac = (termCrosshairX - padX) / plotW;
      const idx = Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1))));
      const ptVal = points[idx];
      const ptY = getY(ptVal);

      g.setLineDash([4, 4]);
      g.strokeStyle = "rgba(200, 169, 74, 0.6)";
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(termCrosshairX, padTop); g.lineTo(termCrosshairX, h - padBottom); g.stroke();
      g.beginPath(); g.moveTo(padX, ptY); g.lineTo(padX + plotW, ptY); g.stroke();
      g.setLineDash([]);

      g.fillStyle = "#ffffff";
      g.beginPath(); g.arc(termCrosshairX, ptY, 4, 0, Math.PI * 2); g.fill();
    }
  }

  function initTradingTerminal() {
    const hub = $("#trading-terminal");
    if (!hub) return;

    const priceEl = $("#term-price");
    const deltaEl = $("#term-delta");
    const low24El = $("#ts-24h-low");
    const high24El = $("#ts-24h-high");
    const pin24El = $("#ts-24h-pin");
    const low52El = $("#ts-52w-low");
    const high52El = $("#ts-52w-high");
    const pin52El = $("#ts-52w-pin");
    const bidEl = $("#ts-bid");
    const askEl = $("#ts-ask");

    const updateTerminalView = () => {
      const a = TERM_DATA[termAsset];
      if (priceEl) {
        priceEl.textContent = (termAsset === "ratio" ? "" : "$") + num(a.base, 2) + (a.unit ? " " + a.unit : "");
      }
      if (deltaEl) {
        deltaEl.textContent = (a.isUp ? "▲ " : "▼ ") + a.delta;
        deltaEl.className = "term-delta " + (a.isUp ? "up" : "down");
      }
      if (low24El) low24El.textContent = "$" + num(a.low24, 2);
      if (high24El) high24El.textContent = "$" + num(a.high24, 2);
      if (pin24El) {
        const pct = Math.min(100, Math.max(0, ((a.base - a.low24) / (a.high24 - a.low24 || 1)) * 100));
        pin24El.style.left = pct.toFixed(1) + "%";
      }
      if (low52El) low52El.textContent = "$" + num(a.low52, 2);
      if (high52El) high52El.textContent = "$" + num(a.high52, 2);
      if (pin52El) {
        const pct = Math.min(100, Math.max(0, ((a.base - a.low52) / (a.high52 - a.low52 || 1)) * 100));
        pin52El.style.left = pct.toFixed(1) + "%";
      }
      if (bidEl) bidEl.textContent = "$" + num(a.bid, 2);
      if (askEl) askEl.textContent = "$" + num(a.ask, 2);

      renderTerminalChart();
    };

    $$("#trading-terminal .term-asset-btn").forEach((btn) => {
      btn.onclick = () => {
        $$("#trading-terminal .term-asset-btn").forEach((b) => b.classList.toggle("active", b === btn));
        termAsset = btn.dataset.asset;
        updateTerminalView();
      };
    });

    $$("#trading-terminal .term-tf-btn").forEach((btn) => {
      btn.onclick = () => {
        $$("#trading-terminal .term-tf-btn").forEach((b) => b.classList.toggle("active", b === btn));
        termTimeframe = btn.dataset.tf;
        updateTerminalView();
      };
    });

    const btnArea = $("#term-mode-area");
    const btnCandles = $("#term-mode-candles");
    if (btnArea && btnCandles) {
      btnArea.onclick = () => {
        termChartMode = "area";
        btnArea.classList.add("active");
        btnCandles.classList.remove("active");
        renderTerminalChart();
      };
      btnCandles.onclick = () => {
        termChartMode = "candles";
        btnCandles.classList.add("active");
        btnArea.classList.remove("active");
        renderTerminalChart();
      };
    }

    const stage = $("#term-chart-stage");
    const hud = $("#term-hud");
    if (stage) {
      const onMove = (e) => {
        const rect = stage.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        termCrosshairX = clientX - rect.left;
        renderTerminalChart();
        if (hud) {
          hud.hidden = false;
          const a = TERM_DATA[termAsset];
          const pts = a.rates[termTimeframe] || a.rates["24h"];
          const frac = Math.min(1, Math.max(0, termCrosshairX / rect.width));
          const idx = Math.min(pts.length - 1, Math.round(frac * (pts.length - 1)));
          const val = pts[idx];
          const chg = (((val - pts[0]) / pts[0]) * 100).toFixed(2);
          $("#hud-date").textContent = termTimeframe.toUpperCase() + ` Mark · Point ${idx + 1}/${pts.length}`;
          $("#hud-val").textContent = (termAsset === "ratio" ? "" : "$") + num(val, 2);
          const chgEl = $("#hud-chg");
          chgEl.textContent = (chg >= 0 ? "▲ +" : "▼ ") + chg + "%";
          chgEl.className = "hud-chg " + (chg >= 0 ? "up" : "down");
          $("#hud-range").textContent = `High: $${num(Math.max(...pts), 2)} · Low: $${num(Math.min(...pts), 2)}`;
        }
      };
      stage.onmousemove = onMove;
      stage.ontouchmove = onMove;
      stage.onmouseleave = () => {
        termCrosshairX = null;
        if (hud) hud.hidden = true;
        renderTerminalChart();
      };
      stage.ontouchend = () => {
        termCrosshairX = null;
        if (hud) hud.hidden = true;
        renderTerminalChart();
      };
    }

    clearInterval(termTickTimer);
    termTickTimer = setInterval(() => {
      if (termTimeframe !== "live" || document.hidden) return;
      const a = TERM_DATA[termAsset];
      const delta = (Math.random() - 0.48) * (a.base > 1000 ? 0.8 : 0.04);
      a.base = Math.max(0.1, a.base + delta);
      a.rates.live.shift();
      a.rates.live.push(Number(a.base.toFixed(2)));
      if (priceEl) {
        priceEl.textContent = (termAsset === "ratio" ? "" : "$") + num(a.base, 2);
        priceEl.classList.remove("flash-up", "flash-down");
        void priceEl.offsetWidth;
        priceEl.classList.add(delta >= 0 ? "flash-up" : "flash-down");
      }
      renderTerminalChart();
    }, 2800);

    updateTerminalView();
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
        const spotAg = vault.precious?.spot_ag ?? vault.metals?.spot?.ag_usd_oz ?? 63.38;
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
              <span class="placard-seal">🏛️ CABINET MASTERPIECE</span>
              <span class="placard-pos">${i + 1} of ${exhibitMasters.length}</span>
            </div>
            <h3 class="placard-title">${country} · ${year}</h3>
            <div class="placard-denom">${denom}</div>
            
            <div class="placard-metrics">
              <div class="pl-metric">
                <span class="pl-lbl">Appraised Value</span>
                <span class="pl-val gold">${money(f.est)}</span>
              </div>
              <div class="pl-metric">
                <span class="pl-lbl">${f.is_silver ? "Silver Melt" : "Alloy"}</span>
                <span class="pl-val">${meltVal ? money(meltVal) : (isGold ? "Gold" : "Base Alloy")}</span>
              </div>
              <div class="pl-metric">
                <span class="pl-lbl">Valuation Multiple</span>
                <span class="pl-val">${multiplier || (f.conf ? "Conf " + esc(f.conf) : "Archive Verified")}</span>
              </div>
            </div>

            <!-- Phase 2 Macro Photography Tether Guide -->
            <div class="ex-p2-tether-bar">
              <div class="ex-target-filename">
                <span><strong>Target RAW:</strong> <code id="fn-txt-${esc(f.scan)}">${targetFilenameObv}</code></span>
                <button type="button" class="ex-copy-fn-btn" data-copyfn="${targetFilenameObv}" title="Copy expected filename to clipboard">📋 Copy</button>
              </div>
              <div class="p2-prompt" style="font-size:0.75rem;margin:0">
                Phase 2 status: <strong>Awaiting Physical RAW Macro Capture</strong>.
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
      }).join("");

      if (dots) dots.innerHTML = exhibitMasters.map((_, i) =>
        `<button type="button" data-i="${i}" class="${i === exhibitIdx ? "on" : ""}" aria-label="Show exhibit ${i + 1}"></button>`).join("");

      // Bind specular lighting and 3D tilt tracking
      $$(".ex-pedestal-tray").forEach((tray) => {
        tray.onmousemove = (e) => {
          const rect = tray.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const pctX = ((x / rect.width) * 100).toFixed(1);
          const pctY = ((y / rect.height) * 100).toFixed(1);
          const tiltX = (((x / rect.width) - 0.5) * 14).toFixed(1);
          const tiltY = (((y / rect.height) - 0.5) * -14).toFixed(1);
          const flipper = tray.querySelector(".ex-specimen-flipper");
          if (flipper) {
            flipper.style.setProperty("--mouse-x", pctX + "%");
            flipper.style.setProperty("--mouse-y", pctY + "%");
            const isFlipped = flipper.classList.contains("flipped");
            flipper.style.transform = `perspective(1000px) rotateX(${tiltY}deg) rotateY(${isFlipped ? 180 + Number(tiltX) : tiltX}deg)`;
          }
        };
        tray.onmouseleave = () => {
          const flipper = tray.querySelector(".ex-specimen-flipper");
          if (flipper) {
            const isFlipped = flipper.classList.contains("flipped");
            flipper.style.transform = isFlipped ? "rotateY(180deg)" : "none";
          }
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

    if (!reduced && exhibitMasters.length > 1) {
      exhibitTimer = setInterval(() => {
        if (!document.body.contains(frame)) { clearInterval(exhibitTimer); return; }
        if (document.hidden) return;
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
    if (reticleBtn) {
      reticleBtn.onclick = (e) => {
        e.stopPropagation();
        const reticles = $$(".specimen-reticle-overlay");
        const willShow = reticles[0]?.hidden;
        reticles.forEach((r) => r.hidden = !willShow);
        reticleBtn.classList.toggle("active", willShow);
      };
    }

    if (box) box.onclick = (e) => {
      if (e.target.closest(".exhibit-dots, .exhibit-view-controls, .ex-copy-fn-btn, .ex-specimen-flipper, [data-lab-session]")) return;
      const cur = exhibitMasters[exhibitIdx];
      if (cur) { dossierCtx = null; openDrawer(cur.scan); }
    };
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
      </div>`;

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

  function filteredFlips() {
    let rows = vault.flips || [];
    const q = norm(flipFilter.q);

    // Filter by active Cabinet Tray
    if (cabinetTray === "crown") {
      rows = rows.filter((f) => f.status !== "Removed" && (f.est ?? 0) > 0)
        .sort((a, b) => (b.est ?? 0) - (a.est ?? 0))
        .slice(0, 12);
      return rows;
    } else if (cabinetTray === "silver") {
      rows = rows.filter((f) => f.is_silver);
    }

    if (flipFilter.silverOnly) rows = rows.filter((f) => f.is_silver);
    if (flipFilter.phase2) rows = rows.filter((f) => f.awaiting_phase2 !== false && f.status !== "Removed" && !f.phase2_done);
    if (flipFilter.country) rows = rows.filter((f) => f.country === flipFilter.country);
    if (flipFilter.iso) rows = rows.filter((f) => f.iso === flipFilter.iso);
    if (flipFilter.year) {
      const y = flipFilter.year.trim();
      rows = rows.filter((f) => String(f.year || "").includes(y));
    }
    if (q) {
      rows = rows.filter((f) => flipQueryMatch(f, q));
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

  function renderGallery() {
    // Re-rendering replaces the inputs: keep focus + caret so typing is not interrupted.
    const act = document.activeElement;
    const keep = act && ["flip-q", "flip-year"].includes(act.id) ? { id: act.id, s: act.selectionStart, e: act.selectionEnd } : null;
    const countries = flipCountries();
    const rows = filteredFlips();
    const agCount = (vault.flips || []).filter((f) => f.is_silver).length;
    const p2Count = (vault.flips || []).filter((f) => f.status !== "Removed" && !f.phase2_done).length;
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
    const filtering = flipFilter.q.trim() || flipFilter.country || flipFilter.iso || flipFilter.year || flipFilter.silverOnly || flipFilter.phase2;
    let railHtml = "";
    if (!filtering && cabinetTray === "all") {
      const latest = latestFlips(10);
      const cards = latest.map((f) => {
        const neo = highlightScans.has(f.scan) ? " is-new" : "";
        const ag = f.is_silver ? ` <span class="badge-ag">Ag</span>` : "";
        return `
        <button type="button" class="latest-card reveal${neo}" data-scan="${esc(f.scan)}">
          ${thumbImg(f)}
          <span class="id">${esc(f.ser || f.scan)}${ag}</span>
          <span class="ser">${esc(f.ser ? f.scan : "")}</span>
          <span class="meta">${esc(f.country || "—")} · ${esc(f.year || "—")}<br/>${esc(f.denom || f.label || "")}</span>
          <span class="est">${f.is_silver && f.asw_oz != null ? num(f.asw_oz, 4) + " oz · " : ""}${f.est != null ? money(f.est) : "—"}</span>
        </button>`;
      }).join("");
      railHtml = `
        <div class="sec-head reveal"><span class="eyebrow">Fresh metal</span><h2>Latest adds</h2><button type="button" class="btn small" id="go-lab">Shooting list →</button></div>
        <div class="latest-rail" aria-label="Latest added flips">${cards || '<p class="empty">No flips yet</p>'}</div>`;
    }

    // The wall: every flip as an authentic white 2x2 archival holder with specimen blueprint
    const spotAg = vault.precious?.spot_ag ?? vault.metals?.spot?.ag_usd_oz;
    const wall = rows.map((f) => {
      const neo = highlightScans.has(f.scan) ? " is-new" : "";
      const denom = esc(f.denom || f.label || "Coin");
      const agBadge = f.is_silver ? `<span class="pc-ag-pill">Ag ${f.asw_oz != null ? num(f.asw_oz, 2) + "oz" : ".999"}</span>` : "";
      const meltText = f.is_silver && f.asw_oz != null && spotAg != null
        ? `Melt ${money(Number(f.asw_oz) * Number(spotAg))}`
        : (f.conf ? `Conf ${esc(f.conf)}` : "Verified");

      return `
      <button type="button" class="piece-card reveal${neo}" data-scan="${esc(f.scan)}" aria-label="${esc((f.ser || f.scan) + " " + [f.country, f.year].filter(Boolean).join(" "))}">
        <div class="pc-flip-frame">
          ${renderFlipHolder(f)}
        </div>
        <div class="pc-card-meta">
          <div class="pc-header-row">
            <span class="pc-ser-key">${esc(f.ser || f.scan)}</span>
            ${agBadge}
          </div>
          <span class="pc-subtitle">${esc([f.country, f.year, denom].filter(Boolean).join(" · "))}</span>
          <div class="pc-bottom-row">
            <span class="pc-price">${f.est != null ? money(f.est) : "—"}</span>
            <span class="pc-melt-note">${meltText}</span>
          </div>
        </div>
      </button>`;
    }).join("");

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
          <span class="tray-count">1883–2026</span>
        </button>
      </div>`;

    $("#gallery-body").innerHTML = `
      ${trayNavHtml}
      ${railHtml}
      <div class="sec-head reveal"><span class="eyebrow">The Cabinet</span><h2>${cabinetTray === 'crown' ? 'The Crown Jewels' : (cabinetTray === 'silver' ? 'Silver Reserves (By ASW Weight)' : (cabinetTray === 'timeline' ? 'Century Timeline (Chronological)' : 'On the Wall'))}</h2><p class="sub">Authentic 2×2 Archival Flips · Specimen Blueprints</p></div>
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
        ${flipFilter.iso ? `<button type="button" class="btn small active" id="flip-iso" title="Clear the country filter from World">${esc(isoName(flipFilter.iso))} ×</button>` : ""}
        <button type="button" class="btn small" id="flip-print" title="Print this inventory">⎙ Print</button>
        <span class="meta">${intFmt(rows.length)} / ${intFmt((vault.flips || []).length)}${flipFilter.silverOnly ? " · silver" : ""}${flipFilter.phase2 ? " · shooting list" : ""}${flipFilter.q.trim() && !searchIdx ? " · searching notes…" : ""}</span>
      </div>
      <div class="country-strip">${strip}</div>
      <div class="gallery-grid">${wall || '<p class="empty">No matches</p>'}</div>
    `;

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
    lazyThumbs($("#gallery-body"));
    observeReveals($("#gallery-body"));
    $$(".country-chip[data-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        flipFilter.country = flipFilter.country === btn.dataset.country ? "" : btn.dataset.country;
        renderGallery(); saveState();
      });
    });
    const ctxScans = rows.map((f) => f.scan);
    $$("#gallery-body .piece-card[data-scan], #gallery-body .latest-card[data-scan]").forEach((el) => {
      el.addEventListener("click", () => {
        dossierCtx = { label: "Gallery", scans: ctxScans };
        openDrawer(el.dataset.scan);
      });
    });
  }


  function renderVault() {
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
    const body = all
      .map((f) => `
        <tr data-scan="${esc(f.scan)}" data-kind="${esc(f.kind || "bullion")}">
          <td>${esc(f.scan)}</td>
          <td class="muted">${esc(f._kind)}</td>
          <td>${esc(f.country || "")}</td>
          <td>${esc(f.year || "")}</td>
          <td>${esc(f.label || f.denom || "")}</td>
          <td class="num">${f.melt != null ? money(f.melt) : "—"}</td>
          <td class="num">${f.est != null ? money(f.est) : "—"}</td>
        </tr>`)
      .join("");
    const flipAgRows = (vault.flips || [])
      .filter((f) => f.is_silver)
      .sort((a, b) => (b.asw_oz || 0) - (a.asw_oz || 0))
      .map((f) => `
        <tr data-scan="${esc(f.scan)}">
          <td class="ser-primary">${esc(f.ser || f.scan)} <span class="badge-ag">Ag</span></td>
          <td class="muted scan-sec">${esc(f.scan)}</td>
          <td>${esc(f.country || "")}</td>
          <td>${esc(f.year || "")}</td>
          <td>${esc(f.denom || f.label || "")}</td>
          <td class="num asw-cell">${f.asw_oz != null ? num(f.asw_oz, 4) : "ASW unknown"}</td>
          <td class="num asw-cell">${meltLive(f)}</td>
          <td class="num">${f.est != null ? money(f.est) : "—"}</td>
        </tr>`)
      .join("");
    $("#vault-body").innerHTML = `
      <div class="grid">
        <div class="card"><h3>Bullion silver</h3><div class="val">${bs.oz != null ? num(bs.oz, 4) + " oz" : "—"}</div><div class="hint">Melt ${money(bs.melt)} @ live spot</div></div>
        <div class="card"><h3>Flip silver</h3><div class="val">${fs.oz != null ? num(fs.oz, 4) + " oz" : "—"}</div><div class="hint">${money(fs.melt)} · ${intFmt(fs.n)} flips${(fs.unknown||[]).length ? " · " + fs.unknown.length + " ASW unknown" : ""}</div></div>
        <div class="card"><h3>Ag combined</h3><div class="val">${cs.oz != null ? num(cs.oz, 2) + " oz" : "—"}</div><div class="hint">Melt ${money(cs.melt)} · METALS board</div></div>
        <div class="card"><h3>Gold</h3><div class="val">${bg.oz != null ? num(bg.oz, 4) + " oz" : "—"}</div><div class="hint">Bullion ${money(bg.melt)} · flip Au ${fg.n ? num(fg.oz, 4) + " oz" : "none"}</div></div>
      </div>
      <div class="card" style="margin-bottom:0.75rem">
        <h3>Junk Ag flips (white 2×2)</h3>
        <div class="table-wrap" style="max-height:280px;margin-top:0.5rem">
          <table class="data">
            <thead><tr><th>SER</th><th>Scan</th><th>Country</th><th>Year</th><th>Denom</th><th class="num">ASW</th><th class="num">Melt @ live</th><th class="num">Est</th></tr></thead>
            <tbody>${flipAgRows || '<tr><td colspan="8" class="empty">No silver flips</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="toolbar"><span class="meta">${intFmt((vault.bullion || []).length)} bullion · ${intFmt((vault.sets || []).length)} sets · ${intFmt((vault.housing || []).length)} housing · ${intFmt((vault.stamps || []).length)} stamps</span></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>ID</th><th>Kind</th><th>Country</th><th>Year</th><th>Label</th><th class="num">Melt</th><th class="num">Est</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
    $$("#vault-body tbody tr[data-scan]").forEach((tr) => {
      tr.addEventListener("click", () => { dossierCtx = null; openDrawer(tr.dataset.scan); });
    });
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
      <div class="sec-head reveal"><span class="eyebrow">Passports</span><h2>World</h2>
      <p class="sub">${intFmt(world.length)} countries · tap a country to list its coins</p></div>
      ${worldSel ? worldPanel(worldSel) : ""}
      <div class="table-wrap">
        <table class="data" id="world-table">
          <thead><tr><th>Country</th><th>ISO</th><th class="num w-sermax">SER max</th><th class="num">Count</th><th class="w-note">Note</th></tr></thead>
          <tbody>${body || '<tr><td colspan="5" class="empty">No world table</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }
  function bindWorld() {
    const pick = (iso) => {
      worldSel = worldSel === iso ? "" : iso;
      renderStudy(); saveState();
      if (worldSel) requestAnimationFrame(() => $("#world-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
    };
    $$("#study-body #world-table tr.w-row").forEach((tr) => {
      tr.addEventListener("click", () => pick(tr.dataset.iso));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(tr.dataset.iso); } });
    });
    const openCoin = (scan) => {
      dossierCtx = { label: isoName(worldSel), scans: worldCoins(worldSel).map((f) => f.scan) };
      openDrawer(scan);
    };
    $$("#study-body #world-coins tbody tr[data-scan]").forEach((tr) => {
      tr.addEventListener("click", () => openCoin(tr.dataset.scan));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") openCoin(tr.dataset.scan); });
    });
    $("#wp-close")?.addEventListener("click", () => { worldSel = ""; renderStudy(); saveState(); });
    $("#wp-flips")?.addEventListener("click", () => {
      const names = [...new Set(worldCoins(worldSel).map((f) => f.country).filter(Boolean))];
      flipFilter = { ...flipFilter, q: "", year: "", silverOnly: false, phase2: false,
        country: names.length === 1 ? names[0] : "", iso: names.length === 1 ? "" : worldSel };
      flipSort = { key: "ser", dir: 1 };
      renderGallery(); setWing("gallery"); window.scrollTo(0, 0);
    });
  }


  const LEGACY_WING = { board: "hall", flips: "gallery", bullion: "vault", world: "study", ops: "lab", age: "study", albums: "study" };
  function mapWing(n) { return LEGACY_WING[n] || n || "hall"; }

  function renderLabProSuite() {
    return `
      <div class="sec-head reveal">
        <span class="eyebrow">Phase 2 Engineering Suite</span>
        <h2>Conservation Optics & Lab Workbench</h2>
        <p class="sub">Precision depth-of-field optics, cross-polarized studio lighting, and die rotation alignment.</p>
      </div>

      <div class="lab-pro-suite">
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
      ${shootingSec()}
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
      ${renderLabProSuite()}
    `;
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
    initLabProSuite();
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
      <div class="sec-head reveal"><span class="eyebrow">The ledger</span><h2>Precious metal</h2>
      <p class="sub">Live spot when online · ${esc(m.as_of_local || m.as_of || "—")}</p></div>
      <div class="grid">
        <div class="card reveal"><h3>Grand</h3><div class="val">${money(b.grand)}</div><div class="hint">${esc(vault.policy || "HOLD")}</div></div>
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
  function ageSec() {
    const age = vault.age || {};
    const fo = age.flips_other || {};
    const al = age.albums || {};
    const glance = vault.albums_glance || [];
    // The ledger sometimes carries markdown table separator rows ("------:") as
    // data rows; they hold no information, so drop them at render time.
    const mdSep = (s) => typeof s === "string" && /^[\s:|\-]+$/.test(s) && /[-|]/.test(s);
    const glanceBody = glance.filter((g) => !mdSep(g.family))
      .map((g) => `<tr><td>${esc(g.family)}</td><td class="muted ids">${esc(g.ids)}</td><td class="num">${esc(intFmt(g.coins))}</td><td class="num">${money(g.total)}</td><td class="muted">${esc(g.pulse)}</td></tr>`)
      .join("");
    return `
      <div class="sec-head reveal"><span class="eyebrow">Patina</span><h2>Age</h2>
      <p class="sub">As of ${esc(age.as_of || "—")} · ref ${esc(String(age.reference_year ?? ""))}</p></div>
      <div class="grid two">
        <div class="card reveal">
          <h3>Flips + other</h3>
          <div class="bucket-row"><span class="k">Dated</span><span class="v">${esc(intFmt(fo.n_dated ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">ND excluded</span><span class="v">${esc(intFmt(fo.n_ND_excluded ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">Mean year</span><span class="v">${precise(fo.mean_year, 1)}</span></div>
          <div class="bucket-row"><span class="k">Mean age</span><span class="v">${precise(fo.mean_age, 1)} yrs</span></div>
          <div class="bucket-row"><span class="k">Oldest → newest</span><span class="v">${esc(String(fo.oldest ?? "—"))} → ${esc(String(fo.newest ?? "—"))}</span></div>
        </div>
        <div class="card reveal">
          <h3>Albums (separate)</h3>
          <div class="bucket-row"><span class="k">Dated / total</span><span class="v">${esc(intFmt(al.n_dated_known ?? al.n_dated ?? "—"))} / ${esc(intFmt(al.n_total_album_coins ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">Coverage</span><span class="v">${al.coverage_pct != null ? num(al.coverage_pct, 1) + "%" : "—"}</span></div>
          <div class="bucket-row"><span class="k">Mean year</span><span class="v">${precise(al.mean_year, 1)}</span></div>
          <div class="bucket-row"><span class="k">Mean age</span><span class="v">${precise(al.mean_age, 1)} yrs</span></div>
          <div class="bucket-row"><span class="k">Oldest → newest</span><span class="v">${esc(String(al.oldest ?? "—"))} → ${esc(String(al.newest ?? "—"))}</span></div>
        </div>
      </div>
      <div class="card reveal age-albums-card">
        <h3>Albums at a glance</h3>
        <div class="table-wrap glance-wrap" style="margin-top:0.5rem">
          <table class="data">
            <thead><tr><th>Family</th><th>IDs</th><th class="num">Coins</th><th class="num">Total</th><th>Pulse</th></tr></thead>
            <tbody>${glanceBody || '<tr><td colspan="5" class="empty">—</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  /** The Curator's Study: intelligence, metal, world, age — the ledger, thinking. */
  function renderStudy() {
    $("#study-body").innerHTML = `
      ${insightsSec()}
      ${metalsSec()}
      ${worldSec()}
      ${ageSec()}
      ${bucketsSec()}
    `;
    bindWorld();
    $$("#study-body .gem-row button[data-scan]").forEach((btn) => {
      btn.addEventListener("click", () => { dossierCtx = null; openDrawer(btn.dataset.scan); });
    });
    observeReveals($("#study-body"));
  }


  function findCard(scan) {
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
      <figure class="ph-slot has" data-role="${role}">
        <button type="button" class="ph-open" data-role="${role}" aria-label="Open ${esc(label)} full size">
          <img loading="lazy" src="${esc(ph.url)}" alt="${esc((c.ser || c.scan) + " " + label)}" />
        </button>
        <div class="ph-fallback" hidden>${empty}</div>
        <figcaption>${esc(label)}${ph.original ? ` · <a class="ph-orig" href="${esc(ph.original)}" target="_blank" rel="noopener">View master</a>` : ""}</figcaption>
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
      return p ? `${r} ✓` : `${r} awaiting`;
    };
    const photoStatus = phList.length
      ? ["obv", "rev"].map(roleNote).join(" · ")
      : (isFlip ? "Awaiting Phase 2 (none yet)" : c.photo);
    const lblPhoto = phList.find((x) => x.label_text || x.label_check);
    const labelText = c.label_text || lblPhoto?.label_text;
    const labelCheck = c.label_check || lblPhoto?.label_check;
    const dia = c.diameter_mm != null ? `${num(c.diameter_mm, 2, 0)} mm` : "";
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
    const p2Roles = [["obv", "Obverse"], ["rev", "Reverse"]].map(([r, lbl]) => ({ r, lbl, got: !!photoOf(c, r) }));
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
               ${renderFlipHolder(c, { large: true })}
               <div class="ds-p2-notice">
                 <span class="p2-seal">📷 PHASE 2 SHOOTING LIST</span>
                 <p class="p2-prompt"><strong>Physical photography pending.</strong> Write the handwritten label on the 2×2 cardboard border, then photograph both sides with the full frame in view and drop into the collection Inbox.</p>
               </div>
             </div>`)
      : "";

    // Precision Caliper scale
    const specMm = c.diameter_mm ? parseFloat(c.diameter_mm) : null;
    const measMm = c.measured_mm ? parseFloat(c.measured_mm) : null;
    const activeDia = measMm || specMm || (c.is_silver ? 38.1 : 24.0);
    const fillPct = Math.min(94, Math.max(22, Math.round((activeDia / 50.8) * 100)));
    const caliperHtml = `
      <div class="ds-caliper-box">
        <div class="ds-caliper-title">Physical Scale · 2×2 Aperture Caliper</div>
        <div class="ds-caliper-visual">
          <div class="caliper-flip-window" title="50.8 mm (2.0 in) Cardboard Holder Frame">
            <div class="caliper-coin-fill" style="width: ${fillPct}%" title="${activeDia} mm Coin Diameter (${fillPct}% of window)"></div>
          </div>
          <span class="caliper-label">${activeDia} mm coin · 50.8 mm window (${fillPct}%)</span>
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
          ${p2Field("Obverse photo", photoOf(c, "obv") ? "On file" : "")}
          ${p2Field("Reverse photo", photoOf(c, "rev") ? "On file" : "")}
        </div>
      </section>` : "";

    $("#drawer-body").innerHTML = `
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
    if (wasHidden) $("#drawer-close").focus();
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
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
    document.body.classList.remove("drawer-open");
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    $("#drawer").hidden = true;
    $("#drawer-backdrop").hidden = true;
    restoreFocus();
    saveState();
  }

  // Tabs
  $$(".wing").forEach((btn) => {
    btn.addEventListener("click", () => setWing(btn.dataset.wing));
  });

  $("#drawer-close").addEventListener("click", closeDrawer);
  $("#drawer-backdrop").addEventListener("click", closeDrawer);
  $("#dossier-prev").addEventListener("click", () => dossierStep(-1));
  $("#dossier-next").addEventListener("click", () => dossierStep(1));
  $("#lb-close").addEventListener("click", closeLightbox);
  $("#lb-prev").addEventListener("click", (e) => { e.stopPropagation(); flipLightbox(-1); });
  $("#lb-next").addEventListener("click", (e) => { e.stopPropagation(); flipLightbox(); });
  $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
    // Command palette beats everything.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (paletteOpen) closePalette(); else openPalette();
      return;
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

  $("#btn-refresh").addEventListener("click", () => { checkWebVersion().then(() => bustReload()); });

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
  window.addEventListener("hashchange", applyHashTab);

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
        showToast("New version available — refreshing…");
        setTimeout(() => window.location.reload(), 900);
      });
    }).catch(() => {});
  }

  /* --- Atmosphere system: twelve exhibition lightings, each a full sensory identity
     (lighting, texture, motion language) with its own music station and ambient
     preset. "Set the scene" applies all three at once. --- */
  const ATMOS = {
    afterhours:  { name: "After Hours",    themeColor: "#060605", preset: "storm",    station: "lofi",      pair: "Rain + Ultralounge" },
    conservator: { name: "Conservator",    themeColor: "#f4efe4", preset: "fireside", station: "classical", pair: "Fireside + Classical" },
    colossus:    { name: "Colossus",       themeColor: "#14100a", preset: "foundry",  station: "epic",      pair: "Foundry + Five Armies" },
    nocturne:    { name: "Nocturne",       themeColor: "#070b16", preset: "tavern",   station: "jazz",      pair: "Tavern + Night on the Docks" },
    odyssey:     { name: "Odyssey",        themeColor: "#04121a", preset: "wayfarer", station: "adventure", pair: "Wayfarer + Expeditionary" },
    cursedwing:  { name: "The Cursed Wing", themeColor: "#0a0505", preset: "blackout", station: "dark",      pair: "Blackout + Oppressive Gloom" },
    kaleido:     { name: "Kaleidoscope",    themeColor: "#0d0218", preset: "mirage",   station: "psych",     pair: "Mirage + Psych Voyage" },
    abyss:       { name: "Sunken Treasury", themeColor: "#02101c", preset: "depths",   station: "abyss",     pair: "Depths + Pressure Hymns" },
    neon:        { name: "Neon Vault",      themeColor: "#0d0118", preset: "grid",     station: "synthwave", pair: "Grid + Midnight Drive" },
    notepad:     { name: "Plaintext",       themeColor: "#ffffff", preset: "off",      station: "quiet",     pair: "Silence + Long Notes" },
    construct:   { name: "The Construct",   themeColor: "#000000", preset: "blackout", station: "construct", pair: "Blackout + Machine Code" },
    xeno:        { name: "Xenohold",        themeColor: "#060112", preset: "signal",   station: "xeno",      pair: "Signal + Deep Field" },
    solaris:     { name: "Solar Observatory", themeColor: "#07040e", preset: "solaris", station: "solaris",  pair: "Solaris + Coronal Winds" },
    alchemist:   { name: "The Alchemist",     themeColor: "#040d08", preset: "alchemist", station: "alchemist", pair: "Crucible + Hermetic Vault" },
    glacier:     { name: "Hyperborean Vault", themeColor: "#040c14", preset: "glacier", station: "glacier",  pair: "Permafrost + Hyperborean Echo" },
    valhalla:    { name: "Gilded Armory",     themeColor: "#0a0806", preset: "valhalla", station: "valhalla", pair: "Great Hearth + Skaldic Lore" },
  };
  const ATMO_ORDER = ["afterhours", "conservator", "colossus", "nocturne", "odyssey", "cursedwing", "kaleido", "abyss", "neon", "notepad", "construct", "xeno", "solaris", "alchemist", "glacier", "valhalla"];
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
  const themeFx = { matrixTimer: 0, particleTimer: 0, termTimer: 0, termAbort: 0, matrixResize: null, customResize: null };
  function clearThemeFx() {
    ["kaleido-fx", "matrix-rain", "construct-term", "notepad-bar", "notepad-status",
     "neon-scan", "neon-sun", "odyssey-compass", "xeno-ring",
     "cursed-embers", "cursed-vignette", "foundry-embers", "abyss-caustics",
     "solaris-flares", "glacier-aurora", "alchemist-circles", "valhalla-embers"].forEach((id) => {
      document.getElementById(id)?.remove();
    });
    clearInterval(themeFx.matrixTimer); themeFx.matrixTimer = 0;
    clearInterval(themeFx.particleTimer); themeFx.particleTimer = 0;
    clearTimeout(themeFx.termTimer); themeFx.termTimer = 0;
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

  function startParticleCanvas(id, drawFn, count = 45) {
    const c = document.createElement("canvas");
    c.id = id;
    document.body.appendChild(c);
    const g = c.getContext("2d");
    let w = 0, h = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; w = c.width; h = c.height; };
    resize();
    window.addEventListener("resize", resize);
    themeFx.customResize = resize;
    const particles = Array.from({ length: count }, () => drawFn.init(w, h));
    themeFx.particleTimer = setInterval(() => {
      g.clearRect(0, 0, w, h);
      drawFn.frame(g, particles, w, h);
    }, 40);
  }
  function startMatrixRain() {
    const c = document.createElement("canvas");
    c.id = "matrix-rain";
    document.body.appendChild(c);
    const g = c.getContext("2d");
    const chars = "アイカサタナハマヤラワ0123456789$#+-*/ΞΦΨΩ";
    const fs = 15;
    let cols = 0, drops = [];
    const size = () => {
      c.width = window.innerWidth; c.height = window.innerHeight;
      cols = Math.ceil(c.width / fs); drops = Array.from({ length: cols }, () => Math.random() * -40);
    };
    size();
    themeFx.matrixResize = size;
    window.addEventListener("resize", size);
    themeFx.matrixTimer = setInterval(() => {
      g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 0, c.width, c.height);
      g.font = fs + "px monospace";
      for (let i = 0; i < cols; i++) {
        const ch = chars[(Math.random() * chars.length) | 0];
        g.fillStyle = Math.random() < 0.06 ? "#d6ffe0" : "#33ff66";
        g.fillText(ch, i * fs, drops[i] * fs);
        if (drops[i] * fs > c.height && Math.random() > 0.976) drops[i] = 0;
        drops[i]++;
      }
    }, 66);
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
    if (atmo === "construct" && !reduced) { startMatrixRain(); startConstructTerm(); }

    // --- Enhanced Visual Animations for Signature Themes ---
    if (atmo === "cursedwing" && !reduced) {
      const vig = document.createElement("div"); vig.id = "cursed-vignette"; vig.setAttribute("aria-hidden", "true");
      document.body.appendChild(vig);
      startParticleCanvas("cursed-embers", {
        init: (w, h) => ({ x: Math.random() * w, y: h + Math.random() * 50, vy: -(0.8 + Math.random() * 2), r: 1 + Math.random() * 2.5, op: 0.2 + Math.random() * 0.7, sway: Math.random() * 6 }),
        frame: (g, pts, w, h) => {
          pts.forEach((p) => {
            p.y += p.vy;
            p.x += Math.sin(p.y * 0.02 + p.sway) * 0.5;
            p.op -= 0.003;
            if (p.y < -10 || p.op <= 0) { p.y = h + 10; p.x = Math.random() * w; p.op = 0.4 + Math.random() * 0.6; }
            g.fillStyle = `rgba(239, 68, 68, ${p.op})`;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
          });
        }
      }, 50);
    }
    if (atmo === "colossus" && !reduced) {
      startParticleCanvas("foundry-embers", {
        init: (w, h) => ({ x: Math.random() * w, y: h + Math.random() * 40, vy: -(1.5 + Math.random() * 3), r: 1.2 + Math.random() * 2.2, op: 0.3 + Math.random() * 0.7 }),
        frame: (g, pts, w, h) => {
          pts.forEach((p) => {
            p.y += p.vy;
            p.op -= 0.004;
            if (p.y < -10 || p.op <= 0) { p.y = h + 10; p.x = Math.random() * w; p.op = 0.5 + Math.random() * 0.5; }
            g.fillStyle = `rgba(245, 158, 11, ${p.op})`;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
          });
        }
      }, 45);
    }
    if (atmo === "abyss" && !reduced) {
      startParticleCanvas("abyss-caustics", {
        init: (w, h) => ({ x: Math.random() * w, y: h + Math.random() * 60, vy: -(0.5 + Math.random() * 1.5), r: 1 + Math.random() * 3.5, op: 0.15 + Math.random() * 0.45 }),
        frame: (g, pts, w, h) => {
          pts.forEach((p) => {
            p.y += p.vy;
            p.x += Math.sin(p.y * 0.015) * 0.4;
            if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
            g.fillStyle = `rgba(56, 189, 248, ${p.op})`;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
          });
        }
      }, 35);
    }
    if (atmo === "solaris" && !reduced) {
      startParticleCanvas("solaris-flares", {
        init: (w, h) => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, r: 1 + Math.random() * 2.8, op: 0.2 + Math.random() * 0.6 }),
        frame: (g, pts, w, h) => {
          pts.forEach((p) => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
            g.fillStyle = `rgba(251, 191, 36, ${p.op})`;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
          });
        }
      }, 40);
    }
    if (atmo === "glacier" && !reduced) {
      startParticleCanvas("glacier-aurora", {
        init: (w, h) => ({ x: Math.random() * w, y: -20, vy: 0.8 + Math.random() * 1.5, r: 1 + Math.random() * 2, op: 0.3 + Math.random() * 0.5 }),
        frame: (g, pts, w, h) => {
          pts.forEach((p) => {
            p.y += p.vy;
            p.x += Math.sin(p.y * 0.02) * 0.5;
            if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
            g.fillStyle = `rgba(224, 242, 254, ${p.op})`;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
          });
        }
      }, 40);
    }
  }
  function setAtmo(a, save = true, flash = true) {
    const atmo = ATMOS[a] ? a : "afterhours";
    const changed = document.documentElement.getAttribute("data-atmo") !== atmo;
    document.documentElement.setAttribute("data-atmo", atmo);
    manageThemeFx(atmo);
    const nm = $("#atmo-name");
    if (nm) nm.textContent = ATMOS[atmo].name;
    $$(".atmo-card").forEach((c) => c.classList.toggle("current", c.dataset.atmoVal === atmo));
    try { document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ATMOS[atmo].themeColor); } catch { /* ignore */ }
    if (save) { try { localStorage.setItem(ATMO_KEY, atmo); } catch { /* ignore */ } }
    if (changed && flash) atmoFlash(atmo);
  }
  // "Set the scene": the atmosphere plus its paired ambience and music station, all at once.
  function setTheScene(a) {
    setAtmo(a);
    try { window.TitanAmbient?.applyPreset(ATMOS[a].preset); } catch { /* ambience not ready */ }
    try { window.TitanLofi?.playStation(ATMOS[a].station); } catch { /* player not ready */ }
    showToast("Scene set: " + ATMOS[a].name + " · " + ATMOS[a].pair);
  }
  setAtmo(document.documentElement.getAttribute("data-atmo") || "afterhours", false, false);

  /* --- Overlay manager: Esc closes the topmost layer; focus is trapped & restored. --- */
  let lastFocus = null;
  function rememberFocus() { lastFocus = document.activeElement; }
  function restoreFocus() {
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }
  function openAtmoSheet() {
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
  // Focus trap: Tab cycles inside the topmost open overlay.
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const top = topOverlayEl();
    if (!top) return;
    const f = [...top.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  function topOverlayEl() {
    const order = ["#lightbox", "#palette", "#atmo-sheet", "#keys-sheet", ".ambient-panel", "#drawer"];
    for (const sel of order) {
      const el = sel === ".ambient-panel" ? document.querySelector(sel) : $(sel);
      if (el && !el.hidden) return el;
    }
    return null;
  }
  function closeTopOverlay() {
    const top = topOverlayEl();
    if (!top) return false;
    if (top.id === "lightbox") closeLightbox();
    else if (top.id === "palette") closePalette();
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
  // Offline honesty: a slim banner when the network drops.
  const offBanner = $("#offline-banner");
  function syncOffline() { if (offBanner) offBanner.hidden = navigator.onLine !== false; }
  window.addEventListener("online", syncOffline);
  window.addEventListener("offline", syncOffline);
  syncOffline();
  // Print buttons: dossier record + flips inventory.
  $("#dossier-print")?.addEventListener("click", () => window.print());
  $("#btn-atmo")?.addEventListener("click", openAtmoSheet);
  $("#atmo-close")?.addEventListener("click", closeAtmoSheet);
  $("#atmo-sheet")?.addEventListener("click", (e) => { if (e.target.id === "atmo-sheet") closeAtmoSheet(); });
  $$(".atmo-card").forEach((card) => {
    let taps = 0;
    card.addEventListener("click", (e) => {
      const scene = e.target.closest("[data-scene]");
      if (scene) { closeAtmoSheet(); setTheScene(scene.dataset.scene); }
      else setAtmo(card.dataset.atmoVal);
      // Egg: tap the Cursed Wing card thirteen times and it taps back.
      if (card.dataset.atmoVal === "cursedwing") {
        taps += 1;
        if (taps === 13) {
          taps = 0;
          closeAtmoSheet();
          setTheScene("cursedwing");
          showToast("The thirteenth tap. It knows your name now.");
        }
      } else { taps = 0; }
    });
  });

  /* --- Easter egg: the Konami code. The curator sees you. --- */
  (() => {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let pos = 0;
    window.addEventListener("keydown", (e) => {
      if (e.key !== seq[pos]) { pos = e.key === seq[0] ? 1 : 0; return; }
      pos += 1;
      if (pos === seq.length) {
        pos = 0;
        const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) {
          document.body.classList.remove("curator-sees-you");
          void document.body.offsetWidth;
          document.body.classList.add("curator-sees-you");
          setTimeout(() => document.body.classList.remove("curator-sees-you"), 900);
        }
        showToast("THE CURATOR SEES YOU");
      }
    });
  })();

  /** Count-up animation for a big figure; respects prefers-reduced-motion. */
  function countUp(el, target, fmt) {
    if (!el) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target == null || Number.isNaN(Number(target))) { el.textContent = fmt(target); return; }
    const dur = 1200, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* --- Reveal-on-scroll: .reveal tiles/cards stagger in, 70ms apart --- */
  let revealObs = null;
  function observeReveals(root = document) {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    if (!revealObs) {
      revealObs = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("in");
          revealObs.unobserve(en.target);
        }
      }, { rootMargin: "60px" });
    }
    $$(".reveal:not(.in)", root).forEach((el, i) => {
      el.style.setProperty("--rd", ((i % 8) * 70) + "ms");
      revealObs.observe(el);
    });
  }

  /* --- Search palette: Ctrl/⌘K command-K over the flips --- */
  let paletteOpen = false;
  function openPalette() {
    ensureSearch();
    rememberFocus();
    $("#palette").hidden = false;
    paletteOpen = true;
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

  loadVault();
  scheduleReload();
})();
