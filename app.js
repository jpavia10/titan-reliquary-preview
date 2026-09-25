/* Titan Reliquary — vanilla vault GUI · GitHub Pages PWA (the only app on every device).
   Data: data/index.json (lean list, at start) + data/detail/{ISO}.json (full cards, on tap).
   Refresh: polls version.json every 10s while a drip is active (drip_active + drip_until), else 30s;
   reloads only when the build stamp changes; skips while hidden. */
(() => {
  "use strict";

  const STATE_KEY = "tr_ui_state_v1";
  const SEEN_KEY = "tr_seen_flips_v1";
  const AUTO_KEY = "tr_auto_refresh_v1";
  const THEME_KEY = "tr_theme_v1";
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
      const active = $(".tab.active");
      const state = {
        tab: active?.dataset.tab || "board",
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
        if (hit) { dossierCtx = null; setTab(hit.kind === "flip" || hit.kind === "token" ? "flips" : "bullion", false); openDrawer(hit.scan, false); break; }
      }
      return;
    }
    if (h && $(`.tab[data-tab="${h}"]`)) setTab(h, false);
  }

  function setTab(name, pushHash = true) {
    $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    $$(".pane").forEach((p) => p.classList.toggle("active", p.id === "pane-" + name));
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
      ["flip-q", "flip-year"].includes(document.activeElement?.id)
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
      ? `<span class="dot"></span>${esc(mode)} · built ${esc(snapshotLabel())} · checked ${secs}s ago${pauseNote}`
      : `<span class="dot"></span>Auto off · built ${esc(snapshotLabel())} · checked ${secs}s ago`;
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
      .then((d) => { searchIdx = d || {}; if (flipFilter.q.trim()) renderFlips(); })
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
      $("#pane-board").innerHTML = `<p class="error">Failed to load vault: ${esc(e.message)}</p>`;
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
      if (st.tab) setTab(st.tab, false);
      // Re-render flips / world with restored filters
      renderFlips();
      renderWorld();
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
    renderHeader();
    renderBoard();
    renderFlips();
    renderBullion();
    renderWorld();
    renderOps();
    renderAge();
    $("#foot-path").textContent = "Snapshot · " + snapshotLabel() + " · GitHub Pages";
    const refresh = $("#btn-refresh");
    if (refresh) { refresh.textContent = "↻ Refresh"; refresh.title = "Check for a newer published snapshot and reload"; }
    lazyThumbs();
  }

  function renderHeader() {
    const b = vault.board || {};
    const m = vault.metals || {};
    const spot = m.spot || {};
    const ag = spot.ag_usd_oz ?? b.spot_ag ?? b.silver?.spot;
    const au = spot.au_usd_oz ?? b.spot_au ?? b.gold?.spot;
    $("#hdr-sub").textContent =
      `${vault.ledger_version || "—"} · ${intFmt(b.vault ?? vault.counts?.vault)} pieces · grand ${money(b.grand)} · ${intFmt(vault.counts?.flips)} flips · ${intFmt(vault.counts?.countries)} countries`;
    $("#hdr-chips").innerHTML = `
      <span class="chip"><strong>${esc(intFmt(b.vault ?? "—"))}</strong> vault</span>
      <span class="chip grand-chip"><strong id="grand-count">${money(b.grand)}</strong> grand</span>
      <span class="chip ag">Ag <strong>${ag != null ? money(ag) : "—"}</strong></span>
      <span class="chip au">Au <strong>${au != null ? money(au) : "—"}</strong></span>
    `;
    countUp($("#grand-count"), b.grand, money);
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
    for (const raw of flags || []) {
      const parts = String(raw).split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
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

  function renderBoard() {
    clearInterval(momentTimer); // old rotation dies with the old DOM
    const b = vault.board || {};
    const m = vault.metals || {};
    const vaultN = b.vault || 0;
    const next = b.next_soft_beat || 1700;
    const prev = Math.floor(vaultN / 100) * 100;
    const denom = Math.max(1, next - prev);
    const pct = Math.min(100, Math.max(0, ((vaultN - prev) / denom) * 100));
    const buckets = [
      ["Flips", b.flips],
      ["Bullion", b.bullion],
      ["Albums", b.albums],
      ["Sets", b.sets],
      ["Housing", b.housing],
      ["Stamps", b.stamps],
    ];
    const bucketHtml = buckets
      .map(([k, v]) => {
        if (!v || v.usd == null) return "";
        const extra =
          v.cards != null ? ` · ${intFmt(v.cards)} cards`
          : v.folders != null ? ` · ${intFmt(v.folders)} folders`
          : "";
        return `<div class="bucket-row"><span class="k">${esc(k)}</span><span class="v">${money(v.usd)}${esc(extra)}</span></div>`;
      })
      .join("");

    const agOz = m.oz?.ag ?? b.silver?.oz;
    const auOz = m.oz?.au ?? b.gold?.oz;
    const agMelt = m.melt?.ag_usd ?? b.silver?.melt;
    const auMelt = m.melt?.au_usd ?? b.gold?.melt;
    const prec = vault.precious || {};
    const flipAgOz = prec.flip_silver?.oz;
    const flipAgMelt = prec.flip_silver?.melt;
    const flipAgN = prec.flip_silver?.n ?? 0;
    const flipAgUnk = (prec.flip_silver?.unknown || []).length;
    const combAgOz = prec.combined_silver?.oz ?? agOz;
    const combAgMelt = prec.combined_silver?.melt ?? agMelt;
    const bullAgOz = prec.bullion_silver?.oz;
    const bullAgMelt = prec.bullion_silver?.melt;

    const moments = (vault.moments || [])
      .map((x) => `<li>${esc(x)}</li>`)
      .join("");
    const flags = splitFlags(vault.flags || [])
      .map((x) => `<li>${esc(x)}</li>`)
      .join("");

    const latest = latestFlips(10);
    const latestHtml = latest
      .map((f) => {
        const neo = highlightScans.has(f.scan) ? " is-new" : "";
        const ag = f.is_silver ? ` <span class="badge-ag">Ag</span>` : "";
        const thumb = thumbImg(f);
        return `
        <button type="button" class="latest-card${neo}" data-scan="${esc(f.scan)}">
          ${thumb}
          <span class="id">${esc(f.ser || f.scan)}${ag}</span>
          <span class="ser">${esc(f.ser ? f.scan : "")}</span>
          <div class="meta">${esc(f.country || "—")} · ${esc(f.year || "—")}<br/>${esc(f.denom || f.label || "")}</div>
          <div class="est">${f.is_silver && f.asw_oz != null ? num(f.asw_oz, 4) + " oz · " : ""}${f.est != null ? money(f.est) : "—"}</div>
        </button>`;
      })
      .join("");

    // Prefer AGE.json for 6-dp board display when board row missing decimals
    const ageFo = vault.age?.flips_other || {};
    const ageAl = vault.age?.albums || {};
    const foYear = b.age_flips?.mean_year ?? ageFo.mean_year;
    const foAge = b.age_flips?.mean_age ?? ageFo.mean_age;
    const alYear = b.age_albums?.mean_year ?? ageAl.mean_year;
    const alAge = b.age_albums?.mean_age ?? ageAl.mean_age;

    const ph = vault.photos || {};
    const totalActive = ph.total_active ?? (vault.flips || []).length;
    const p2 = ph.phase2_done ?? 0;
    const p2pct = totalActive ? Math.min(100, (p2 / totalActive) * 100) : 0;
    const photoCard = `
        <div class="card"><h3>Photographed</h3><div class="val">${esc(intFmt(p2))} <span class="of">of ${esc(intFmt(totalActive))}</span></div>
          <div class="hint">Phase 2 masters (both sides, label visible, QC passed and approved) · ${esc(intFmt(ph.coins_with_photos ?? 0))} with at least one side</div>
          <div class="progress-wrap"><div class="progress" title="${p2} / ${totalActive}"><span style="width:${p2pct}%"></span></div></div>
          <button type="button" class="btn small" id="go-phase2">Shooting list →</button>
        </div>`;

    // Vault at a glance — stat strip, using only existing index.json fields.
    const newest = latestFlips(1)[0];
    const phN = vault.photos || {};
    const flipsTotal = vault.counts?.flips || 0;
    const photoPct = flipsTotal ? Math.round(100 * (phN.coins_with_photos ?? 0) / flipsTotal) : 0;
    const statStrip = `
      <div class="stat-strip" aria-label="Vault at a glance">
        <div class="stat"><div class="k">Estimated total</div><div class="v">${money(vault.value?.estimated_total)}</div><div class="s">${esc(vault.value?.status || "")}</div></div>
        <div class="stat"><div class="k">Vault pieces</div><div class="v">${esc(intFmt(vault.counts?.vault))}</div><div class="s">across ${esc(intFmt(vault.counts?.countries))} countries</div></div>
        <div class="stat"><div class="k">Flips</div><div class="v">${esc(intFmt(flipsTotal))}</div><div class="s">white 2×2 · permanent C### keys</div></div>
        <div class="stat"><div class="k">Photographed</div><div class="v">${esc(intFmt(phN.coins_with_photos ?? 0))}</div><div class="s">${photoPct}% of flips · awaiting photo is normal</div></div>
        <div class="stat"><div class="k">Newest flip</div><div class="v" style="font-size:1.05rem;font-family:var(--mono)">${esc(newest?.ser || newest?.scan || "—")}</div><div class="s">${esc([newest?.country, newest?.year, newest?.denom].filter(Boolean).join(" · "))}</div></div>
      </div>`;

    const momentsAll = vault.moments || [];
    const momentCard = momentsAll.length ? `
      <div class="moment-card" aria-label="From the vault">
        <span class="mk">From the vault</span>
        <span class="moment-text" id="moment-text">${esc(momentsAll[0])}</span>
      </div>` : "";

    const glanceTop = (vault.albums_glance || [])
      .filter((g) => /[a-z]/i.test(String(g.family || ""))) // skip malformed rows (data domain owns them)
      .slice().sort((a, bb) => (bb.coins || 0) - (a.coins || 0)).slice(0, 4);
    const albumCards = glanceTop.length ? `
      <div class="album-head"><h3>Top album families</h3><span style="font-size:0.75rem;color:var(--muted)">${esc(intFmt(vault.counts?.albums_families ?? glanceTop.length))} families tracked</span></div>
      <div class="album-cards">
        ${glanceTop.map((g) => `
          <div class="album-card">
            <div class="fam">${esc(g.family)}</div>
            <div class="coins">${esc(intFmt(g.coins))} <small>coins · ${money(g.total)}</small></div>
            <div class="pulse">${esc(g.pulse || "")}</div>
          </div>`).join("")}
      </div>` : "";

    $("#pane-board").innerHTML = `
      ${statStrip}
      <div class="card wide" style="margin-bottom:1rem">
        <h3>Latest adds</h3>
        <div class="latest-grid">${latestHtml || '<p class="empty">No flips yet</p>'}</div>
      </div>
      ${requestsModule()}
      ${momentCard}
      ${albumCards}
      <div class="grid">
        ${photoCard}
        <div class="card"><h3>Grand</h3><div class="val">${money(b.grand)}</div><div class="hint">${esc(vault.policy || "HOLD")}</div></div>
        <div class="card"><h3>Vault pieces</h3><div class="val">${esc(intFmt(vaultN))}</div>
          <div class="hint">Next soft beat ${esc(intFmt(next))}</div>
          <div class="progress-wrap"><div class="progress" title="${vaultN} / ${next}"><span style="width:${pct}%"></span></div></div>
        </div>
        <div class="card"><h3>Flips</h3><div class="val">${esc(intFmt(vault.counts?.flips ?? 0))}</div><div class="hint">${money(b.flips?.usd)} · white 2×2</div></div>
        <div class="card"><h3>Countries</h3><div class="val">${esc(intFmt(vault.counts?.countries ?? 0))}</div><div class="hint">World flips</div></div>
        <div class="card"><h3>Board Ag</h3><div class="val">${combAgOz != null ? num(combAgOz, 2) + " oz" : "—"}</div><div class="hint">Melt ${money(combAgMelt)} · spot ${money(m.spot?.ag_usd_oz)} · METALS</div></div>
        <div class="card"><h3>Gold</h3><div class="val">${auOz != null ? num(auOz, 4) + " oz" : "—"}</div><div class="hint">Melt ${money(auMelt)} · spot ${money(m.spot?.au_usd_oz)}</div></div>
        <div class="card"><h3>Flip silver</h3><div class="val">${flipAgOz != null ? num(flipAgOz, 4) + " oz" : "—"}</div><div class="hint">${money(flipAgMelt)} @ live · ${intFmt(flipAgN)} flips${flipAgUnk ? " · " + flipAgUnk + " ASW unknown" : ""}</div></div>
        <div class="card"><h3>Bullion Ag</h3><div class="val">${bullAgOz != null ? num(bullAgOz, 4) + " oz" : "—"}</div><div class="hint">Melt ${money(bullAgMelt)} · B### stack</div></div>
      </div>
      <div class="grid two">
        <div class="card">
          <h3>Bucket breakdown</h3>
          ${bucketHtml || '<p class="empty">No board rows</p>'}
        </div>
        <div class="card">
          <h3>Age (board)</h3>
          <div class="bucket-row"><span class="k">Flips+other mean</span><span class="v">${precise(foYear)} · ${precise(foAge)} yrs</span></div>
          <div class="bucket-row"><span class="k">Albums mean</span><span class="v">${precise(alYear)} · ${precise(alAge)} yrs</span></div>
          <div class="hint" style="margin-top:0.6rem">Albums kept separate · see Age tab</div>
        </div>
      </div>
      <div class="grid two">
        <div class="card"><h3>Moments</h3><ul class="moments">${moments || "<li class='muted'>None</li>"}</ul></div>
        <div class="card"><h3>Keep an eye</h3><ul class="moments flags">${flags || "<li class='muted'>None</li>"}</ul></div>
      </div>
    `;

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

    $$("#pane-board .latest-card[data-scan]").forEach((btn) => {
      btn.addEventListener("click", () => { dossierCtx = null; openDrawer(btn.dataset.scan); });
    });
    $("#go-phase2")?.addEventListener("click", () => {
      flipFilter = { ...flipFilter, phase2: true, q: "", country: "", year: "" };
      renderFlips(); setTab("flips");
    });
    const more = $("#req-more");
    if (more) more.addEventListener("click", () => {
      const open = !$("#req-list").classList.contains("open");
      $("#req-list").classList.toggle("open", open);
      more.textContent = open ? "Show fewer" : more.dataset.label;
      try { localStorage.setItem(REQ_OPEN_KEY, open ? "1" : "0"); } catch { /* ignore */ }
    });
    $$("#req-list .req[data-href]").forEach((el) => el.addEventListener("click", () => {
      const h = el.dataset.href;
      if (h && h.startsWith("#coin=")) { location.hash = h; applyHashTab(); }
      else if (h) setTab(h.replace(/^#/, "") === "albums" ? "age" : h.replace(/^#/, ""));
    }));
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

  function filteredFlips() {
    let rows = vault.flips || [];
    const q = norm(flipFilter.q);
    if (flipFilter.silverOnly) rows = rows.filter((f) => f.is_silver);
    if (flipFilter.phase2) rows = rows.filter((f) => f.awaiting_phase2 !== false && f.status !== "Removed" && !f.phase2_done);
    if (flipFilter.country) rows = rows.filter((f) => f.country === flipFilter.country);
    if (flipFilter.iso) rows = rows.filter((f) => f.iso === flipFilter.iso);
    if (flipFilter.year) {
      const y = flipFilter.year.trim();
      rows = rows.filter((f) => String(f.year || "").includes(y));
    }
    if (q) {
      rows = rows.filter((f) => {
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
      });
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

  function renderFlips() {
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

    const body = rows
      .map((f) => {
        const neo = highlightScans.has(f.scan) ? " class=\"is-new\"" : "";
        const agBadge = f.is_silver
          ? `<span class="badge-ag${f.asw_oz == null ? " unk" : ""}">Ag</span>`
          : "";
        const aswCell = f.is_silver
          ? (f.asw_oz != null ? num(f.asw_oz, 4) : "unknown")
          : "—";
        const meltCell = f.is_silver ? meltLive(f) : "—";
        return `
        <tr data-scan="${esc(f.scan)}"${neo}>
          <td class="ser-primary">${f.thumb ? thumbImg(f, "row-thumb") : ""}${esc(f.ser || "—")}${agBadge}${f.has_photo ? ` <span class="cam" title="Phase 2 photo on file">◉</span>` : ""}</td>
          <td class="muted scan-sec">${esc(f.scan)}</td>
          <td>${esc(f.country || "")}</td>
          <td>${esc(f.year || "")}</td>
          <td>${esc(f.denom || f.label || "")}</td>
          <td class="num asw-cell">${aswCell}</td>
          <td class="num asw-cell">${meltCell}</td>
          <td class="num">${f.est != null ? money(f.est) : "—"}</td>
          <td class="muted">${esc(f.conf || "")}</td>
        </tr>`;
      })
      .join("");

    $("#pane-flips").innerHTML = `
      <div class="toolbar">
        <input type="search" id="flip-q" placeholder="Search SER · C### · country · year · denom · notes…" value="${esc(flipFilter.q)}" autocomplete="off" />
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
        <span class="meta">${intFmt(rows.length)} / ${intFmt((vault.flips || []).length)}${flipFilter.silverOnly ? " · silver" : ""}${flipFilter.phase2 ? " · shooting list" : ""}${flipFilter.q.trim() && !searchIdx ? " · searching notes…" : ""}</span>
      </div>
      <div class="country-strip">${strip}</div>
      <div class="table-wrap">
        <table class="data" id="flip-table">
          <thead>
            <tr>
              <th data-k="ser" class="${flipSort.key === "ser" ? "sorted" : ""}">SER</th>
              <th data-k="scan" class="${flipSort.key === "scan" || flipSort.key === "newest" ? "sorted" : ""}">Scan</th>
              <th data-k="country" class="${flipSort.key === "country" ? "sorted" : ""}">Country</th>
              <th data-k="year" class="${flipSort.key === "year" ? "sorted" : ""}">Year</th>
              <th data-k="denom">Denom</th>
              <th data-k="asw_oz" class="num ${flipSort.key === "asw_oz" || flipSort.key === "asw" ? "sorted" : ""}">ASW</th>
              <th class="num">Melt</th>
              <th data-k="est" class="num ${flipSort.key === "est" || flipSort.key === "value" ? "sorted" : ""}">Est</th>
              <th data-k="conf">Conf</th>
            </tr>
          </thead>
          <tbody>${body || '<tr><td colspan="9" class="empty">No matches</td></tr>'}</tbody>
        </table>
      </div>
    `;

    const qEl = $("#flip-q");
    qEl.addEventListener("input", (e) => {
      markTyping();
      flipFilter.q = e.target.value;
      ensureSearch();
      if (!restoring) { renderFlips(); saveState(); }
    });
    qEl.addEventListener("focus", () => { markTyping(); ensureSearch(); });
    $("#flip-iso")?.addEventListener("click", () => { flipFilter.iso = ""; renderFlips(); saveState(); });
    if (keep) {
      const el = $("#" + keep.id);
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.s, keep.e); } catch { /* ignore */ } }
    }
    $("#flip-country").addEventListener("change", (e) => {
      flipFilter.country = e.target.value;
      renderFlips(); saveState();
    });
    const yEl = $("#flip-year");
    yEl.addEventListener("input", (e) => {
      markTyping();
      flipFilter.year = e.target.value;
      if (!restoring) { renderFlips(); saveState(); }
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
      renderFlips(); saveState();
    });
    $("#flip-ag").addEventListener("click", () => {
      flipFilter.silverOnly = !flipFilter.silverOnly;
      renderFlips(); saveState();
    });
    $("#flip-p2").addEventListener("click", () => {
      flipFilter.phase2 = !flipFilter.phase2;
      renderFlips(); saveState();
    });
    lazyThumbs($("#pane-flips"));
    $$(".country-chip[data-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        flipFilter.country = flipFilter.country === btn.dataset.country ? "" : btn.dataset.country;
        renderFlips(); saveState();
      });
    });
    $$("#flip-table th[data-k]").forEach((th) => {
      th.addEventListener("click", () => {
        const k = th.dataset.k;
        if (flipSort.key === k) flipSort.dir *= -1;
        else { flipSort.key = k; flipSort.dir = k === "scan" || k === "est" ? -1 : 1; }
        renderFlips(); saveState();
      });
    });
    $$("#flip-table tbody tr[data-scan]").forEach((tr) => {
      tr.addEventListener("click", () => { dossierCtx = null; openDrawer(tr.dataset.scan); });
    });
  }

  function renderBullion() {
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
    $("#pane-bullion").innerHTML = `
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
    $$("#pane-bullion tbody tr[data-scan]").forEach((tr) => {
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

  function renderWorld() {
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
    $("#pane-world").innerHTML = `
      <div class="toolbar"><span class="meta">${intFmt(world.length)} countries · tap a country to list its coins</span></div>
      ${worldSel ? worldPanel(worldSel) : ""}
      <div class="table-wrap">
        <table class="data" id="world-table">
          <thead><tr><th>Country</th><th>ISO</th><th class="num w-sermax">SER max</th><th class="num">Count</th><th class="w-note">Note</th></tr></thead>
          <tbody>${body || '<tr><td colspan="5" class="empty">No world table</td></tr>'}</tbody>
        </table>
      </div>
    `;
    const pick = (iso) => {
      worldSel = worldSel === iso ? "" : iso;
      renderWorld(); saveState();
      if (worldSel) requestAnimationFrame(() => $("#world-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    $$("#world-table tr.w-row").forEach((tr) => {
      tr.addEventListener("click", () => pick(tr.dataset.iso));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(tr.dataset.iso); } });
    });
    const openCoin = (scan) => {
      dossierCtx = { label: isoName(worldSel), scans: worldCoins(worldSel).map((f) => f.scan) };
      openDrawer(scan);
    };
    $$("#world-coins tbody tr[data-scan]").forEach((tr) => {
      tr.addEventListener("click", () => openCoin(tr.dataset.scan));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") openCoin(tr.dataset.scan); });
    });
    $("#wp-close")?.addEventListener("click", () => { worldSel = ""; renderWorld(); saveState(); });
    $("#wp-flips")?.addEventListener("click", () => {
      const names = [...new Set(worldCoins(worldSel).map((f) => f.country).filter(Boolean))];
      flipFilter = { ...flipFilter, q: "", year: "", silverOnly: false, phase2: false,
        country: names.length === 1 ? names[0] : "", iso: names.length === 1 ? "" : worldSel };
      flipSort = { key: "ser", dir: 1 };
      renderFlips(); setTab("flips"); window.scrollTo(0, 0);
    });
  }

  function renderOps() {
    const d = vault.drip || {};
    const m = vault.metals || {};
    const ids = d.next_ids || {};
    const idRows = Object.entries(ids)
      .map(([k, v]) => `<div class="bucket-row"><span class="k">${esc(k)}</span><span class="v ser">${esc(v)}</span></div>`)
      .join("");
    const ser = (d.next_ser || [])
      .slice(0, 50)
      .map((r) => `<tr><td class="ser">${esc(r.iso)}</td><td>${esc(r.country)}</td><td>${esc(r.cont)}</td><td class="num">${esc(intFmt(r.count))}</td><td class="ser">${esc(r.next)}</td></tr>`)
      .join("");
    const flags = splitFlags(d.flags || vault.flags || []).map((x) => `<li>${esc(x)}</li>`).join("");

    $("#pane-ops").innerHTML = `
      <div class="grid">
        <div class="card"><h3>Last add</h3><div class="val" style="font-size:1rem;line-height:1.35">${esc(d.last_add || "—")}</div></div>
        <div class="card"><h3>Soft beat</h3><div class="val">${esc(intFmt(d.vault ?? vault.board?.vault ?? "—"))}</div><div class="hint">Next ${esc(intFmt(d.next_soft_beat ?? 1700))}</div></div>
        <div class="card"><h3>Metals as-of</h3><div class="val" style="font-size:1rem">${esc(m.as_of_local || m.as_of || d.metals_live || "—")}</div>
          <div class="hint">Ag ${money(m.spot?.ag_usd_oz)} · Au ${money(m.spot?.au_usd_oz)}</div></div>
        <div class="card"><h3>Cull watch</h3><div class="hint" style="color:var(--warn);font-size:0.9rem;margin:0">${esc(d.cull_watch || "—")}</div></div>
      </div>
      <div class="grid two">
        <div class="card"><h3>Next IDs</h3>${idRows || '<p class="empty">—</p>'}</div>
        <div class="card"><h3>Open flags</h3><ul class="moments flags">${flags || "<li>—</li>"}</ul></div>
      </div>
      <div class="card" style="margin-top:0.75rem">
        <h3>Next SER by country</h3>
        <div class="table-wrap" style="max-height:360px;margin-top:0.5rem">
          <table class="data">
            <thead><tr><th>ISO</th><th>Country</th><th>Cont</th><th class="num">Count</th><th>Next</th></tr></thead>
            <tbody>${ser || '<tr><td colspan="5" class="empty">—</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAge() {
    const age = vault.age || {};
    const fo = age.flips_other || {};
    const al = age.albums || {};
    const glance = vault.albums_glance || [];
    const glanceBody = glance
      .map((g) => `<tr><td>${esc(g.family)}</td><td class="muted">${esc(g.ids)}</td><td class="num">${esc(intFmt(g.coins))}</td><td class="num">${money(g.total)}</td><td class="muted">${esc(g.pulse)}</td></tr>`)
      .join("");

    $("#pane-age").innerHTML = `
      <div class="grid two">
        <div class="card">
          <h3>Flips + other</h3>
          <div class="bucket-row"><span class="k">Dated</span><span class="v">${esc(intFmt(fo.n_dated ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">ND excluded</span><span class="v">${esc(intFmt(fo.n_ND_excluded ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">Mean year</span><span class="v">${precise(fo.mean_year)}</span></div>
          <div class="bucket-row"><span class="k">Mean age</span><span class="v">${precise(fo.mean_age)} yrs</span></div>
          <div class="bucket-row"><span class="k">Oldest → newest</span><span class="v">${esc(String(fo.oldest ?? "—"))} → ${esc(String(fo.newest ?? "—"))}</span></div>
        </div>
        <div class="card">
          <h3>Albums (separate)</h3>
          <div class="bucket-row"><span class="k">Dated / total</span><span class="v">${esc(intFmt(al.n_dated_known ?? al.n_dated ?? "—"))} / ${esc(intFmt(al.n_total_album_coins ?? "—"))}</span></div>
          <div class="bucket-row"><span class="k">Coverage</span><span class="v">${al.coverage_pct != null ? num(al.coverage_pct, 1) + "%" : "—"}</span></div>
          <div class="bucket-row"><span class="k">Mean year</span><span class="v">${precise(al.mean_year)}</span></div>
          <div class="bucket-row"><span class="k">Mean age</span><span class="v">${precise(al.mean_age)} yrs</span></div>
          <div class="bucket-row"><span class="k">Oldest → newest</span><span class="v">${esc(String(al.oldest ?? "—"))} → ${esc(String(al.newest ?? "—"))}</span></div>
          <div class="hint" style="margin-top:0.5rem">As of ${esc(age.as_of || "—")} · ref ${esc(String(age.reference_year ?? ""))}</div>
        </div>
      </div>
      <div class="card" style="margin-top:0.75rem">
        <h3>Albums at a glance</h3>
        <div class="table-wrap" style="max-height:420px;margin-top:0.5rem">
          <table class="data">
            <thead><tr><th>Family</th><th>IDs</th><th class="num">Coins</th><th class="num">Total</th><th>Pulse</th></tr></thead>
            <tbody>${glanceBody || '<tr><td colspan="5" class="empty">—</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
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
    const completeness = isFlip
      ? `<div class="ds-complete${missing.length ? "" : " full"}" title="${esc(missing.length ? "Missing: " + missing.join(", ") : "All SER fields present")}">
          <span class="bar"><span style="width:${Math.round((present.length / SER_SCHEMA.length) * 100)}%"></span></span>
          SER fields ${present.length}/${SER_SCHEMA.length}${missing.length ? " · missing " + esc(missing.join(", ")) : " · complete"}
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

    const extraRoles = [...new Set(phList.map((p) => p.role))].filter((r) => r !== "obv" && r !== "rev");
    const photos = isFlip
      ? `<div class="ds-photos">${photoSlot(c, "obv")}${photoSlot(c, "rev")}${extraRoles.map((r) => photoSlot(c, r)).join("")}</div>
         <p class="ph-hint">${phList.length
           ? "Tap a photo for full size."
           : "Phase 2: write the label on the flip, then photograph both sides with the whole 2×2 in frame and drop them in the Drive Inbox. Titan checks each photo and files it here once it passes."}</p>`
      : "";

    $("#drawer-body").innerHTML = `
      <header class="ds-head placard">
        <div class="ds-ser">${esc(primary)}${agTag}${auTag}${tokTag}${stTag}</div>
        <h2>${esc(title)}</h2>
        <div class="placard-specs" aria-label="Coin specifications">
          <div class="placard-spec"><div class="k">SER</div><div class="v mono">${esc(c.ser || c.scan || "—")}</div></div>
          <div class="placard-spec"><div class="k">Year</div><div class="v">${has(c.year) ? esc(c.year) : "—"}</div></div>
          <div class="placard-spec"><div class="k">Denom</div><div class="v">${has(c.denom) ? esc(c.denom) : "—"}</div></div>
          <div class="placard-spec"><div class="k">Mint</div><div class="v">${has(c.mint) ? esc(c.mint) : "—"}</div></div>
          <div class="placard-spec"><div class="k">Est</div><div class="v">${c.est != null ? money(c.est) : "—"}</div></div>
          <div class="placard-spec"><div class="k">Confidence</div><div class="v">${has(c.conf) ? esc(c.conf) : "—"}</div></div>
        </div>
        <div class="scan">${esc(secondary)}</div>
        ${valueChips}
        ${completeness}
      </header>
      <div class="ds-grid${photos ? "" : " no-photos"}">
        ${photos ? `<div class="ds-col-photos">${photos}</div>` : ""}
        <div class="ds-col-fields">
          ${section("Identity", identity)}
          ${section("Value", value)}
          ${section("Physical", physical)}
          ${section("Record", record)}
        </div>
      </div>
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
    $("#drawer").hidden = false;
    $("#drawer-backdrop").hidden = false;
    document.body.classList.add("drawer-open");
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
    $("#lightbox").hidden = false;
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
    $("#lightbox").hidden = true;
    $("#lb-img").removeAttribute("src");
    lbCard = null;
  }

  function closeDrawer() {
    currentDrawerScan = null;
    document.body.classList.remove("drawer-open");
    $("#drawer").hidden = true;
    $("#drawer-backdrop").hidden = true;
    saveState();
  }

  // Tabs
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
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
    if (!$("#lightbox").hidden) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") flipLightbox(-1);
      else if (e.key === "ArrowRight") flipLightbox(1);
      return;
    }
    if (e.key === "Escape") closeDrawer();
    else if (!typing && currentDrawerScan && e.key === "ArrowLeft") dossierStep(-1);
    else if (!typing && currentDrawerScan && e.key === "ArrowRight") dossierStep(1);
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
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  /* --- Theme system (vault / ledger / noir) --- */
  function setTheme(t, save = true) {
    const theme = ["vault", "ledger", "noir"].includes(t) ? t : "vault";
    document.documentElement.setAttribute("data-theme", theme);
    $$(".tt-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeVal === theme)));
    try { document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "ledger" ? "#f4efe4" : theme === "noir" ? "#050505" : "#12100e"); } catch { /* ignore */ }
    if (save) { try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ } }
  }
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) setTheme(savedTheme, false);
    else setTheme(document.documentElement.getAttribute("data-theme") || "vault", false);
  } catch { /* ignore */ }
  $$(".tt-btn").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.themeVal)));

  /** Count-up animation for a big figure; respects prefers-reduced-motion. */
  function countUp(el, target, fmt) {
    if (!el) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target == null || Number.isNaN(Number(target))) { el.textContent = fmt(target); return; }
    const dur = 1100, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  loadVault();
  scheduleReload();
})();
