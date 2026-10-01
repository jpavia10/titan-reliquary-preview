/* Titan Reliquary · Grand Hall wing enhancements (wings/hall.js)
   Loaded after app.js. Owns only #pane-hall. Every figure shown here comes from window.vault;
   nothing is estimated or invented. Safe to load twice (idempotent) and fails quietly. */
(function () {
  "use strict";
  if (window.__titanHallWing) return;
  window.__titanHallWing = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const isNum = (n) => n != null && n !== "" && !Number.isNaN(Number(n));
  // shared Intl.NumberFormat instances (toLocaleString(locale, options) builds a new one per call)
  const NF2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const NF0 = new Intl.NumberFormat("en-US");
  const NFD = {};
  const money = (n) => (isNum(n) ? "$" + NF2.format(Number(n)) : "—");
  const money0 = (n) => (isNum(n) ? "$" + NF0.format(Math.round(Number(n))) : "—");
  const int = (n) => (isNum(n) ? NF0.format(Number(n)) : "—");
  const dec = (n, d) => (isNum(n) ? (NFD[d] || (NFD[d] = new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }))).format(Number(n)) : "—");
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const getVault = () => {
    return window.vault || null;
  };

  /* ---------- 1. Hero staging: value first, then the collection at a glance ---------- */
  function stageHero() {
    const hero = $("#pane-hall .hero");
    const tape = $("#market-ticker-tape");
    const hub = $("#pane-hall .vault-valuation-hub");
    if (!hero || !tape || !hub) return;
    if (!hub.dataset.hallStaged) {
      tape.after(hub); // the valuation sits directly under the wire, above the exhibit
      hub.dataset.hallStaged = "1";
    }
    let glance = $("#hall-glance");
    if (!glance) {
      glance = document.createElement("nav");
      glance.id = "hall-glance";
      glance.className = "hall-glance";
      glance.setAttribute("aria-label", "The collection at a glance");
      hub.after(glance);
    }
  }

  function tile(t) {
    return `<button type="button" class="hg-tile" data-hg-go="${esc(t.go)}" aria-label="${esc(t.aria)}">
      <span class="hg-k">${esc(t.k)}</span>
      <span class="hg-v">${t.v}</span>
      <span class="hg-s">${esc(t.s)}</span>
    </button>`;
  }

  function renderGlance(v) {
    const glance = $("#hall-glance");
    if (!glance || !v) return;
    const b = v.board || {};
    const c = v.counts || {};
    const pr = v.precious || {};
    const mt = v.metals || {};
    const flips = (v.flips || []).filter((f) => f.status !== "Removed");
    const continents = new Set(flips.map((f) => f.continent).filter(Boolean)).size;
    const agOz = pr.combined_silver?.oz ?? mt.oz?.ag;
    const auOz = pr.combined_gold?.oz ?? mt.oz?.au;
    const tiles = [];
    if (isNum(c.vault)) tiles.push({ k: "Pieces", v: int(c.vault), s: "in the vault", go: "gallery", aria: `${int(c.vault)} pieces in the vault. Open the Gallery` });
    if (isNum(c.flips)) tiles.push({ k: "Flips", v: int(c.flips), s: b.flips?.usd != null ? money0(b.flips.usd) + " est." : "in 2×2 flips", go: "gallery", aria: `${int(c.flips)} flips. Open the Gallery` });
    if (isNum(c.countries)) tiles.push({ k: "Countries", v: int(c.countries), s: continents ? `on ${continents} continents` : "represented", go: "study", aria: `${int(c.countries)} countries. Open the Curator's Study` });
    if (b.albums && isNum(b.albums.folders)) tiles.push({ k: "Albums", v: int(b.albums.folders), s: (isNum(b.albums.coins) ? "~" + int(b.albums.coins) + " coins · " : "") + money0(b.albums.usd), go: "study", aria: `${int(b.albums.folders)} albums. Open the Curator's Study` });
    if (isNum(agOz)) tiles.push({ k: "Silver", v: `${dec(agOz, 2)}<small> oz</small>`, s: "melt " + money0(pr.combined_silver?.melt), go: "vault", aria: `${dec(agOz, 2)} ounces of silver. Open the Vault` });
    if (isNum(auOz)) tiles.push({ k: "Gold", v: `${dec(auOz, 4)}<small> oz</small>`, s: "melt " + money0(pr.combined_gold?.melt), go: "vault", aria: `${dec(auOz, 4)} ounces of gold. Open the Vault` });
    glance.innerHTML = tiles.map(tile).join("");
    glance.hidden = !tiles.length;
  }

  function renderAsOf(v) {
    const hub = $("#pane-hall .vault-valuation-hub");
    const cap = $("#pane-hall .hero-cap");
    if (!hub || !cap || !v) return;
    let p = $("#hall-asof");
    if (!p) {
      p = document.createElement("p");
      p.id = "hall-asof";
      p.className = "hall-asof";
      cap.after(p);
    }
    const mt = v.metals || {};
    const bits = [];
    if (v.ledger_version) bits.push("Ledger " + v.ledger_version);
    if (mt.as_of_local || mt.as_of) bits.push("spot as of " + (mt.as_of_local || mt.as_of));
    if (mt.spot?.ag_usd_oz != null) bits.push("Ag " + money(mt.spot.ag_usd_oz));
    if (mt.spot?.au_usd_oz != null) bits.push("Au " + money(mt.spot.au_usd_oz));
    p.textContent = bits.join(" · ");
  }

  /* ---------- 2. Melt bar: labels only where they fit; the legend carries the numbers ---------- */
  function fitMeltLabels() {
    $$("#melt-bar .melt-seg").forEach((seg) => {
      const lbl = seg.querySelector(".seg-label");
      if (!lbl) return;
      seg.classList.remove("hg-narrow");
      if (lbl.scrollWidth > seg.clientWidth - 8) seg.classList.add("hg-narrow");
    });
  }

  /* ---------- 3. Ticker: reduced-motion shows one clean, scrollable copy ---------- */
  function markTickerDupes() {
    const items = $$("#ticker-marquee-track .ticker-item");
    const half = Math.floor(items.length / 2);
    items.forEach((it, i) => {
      it.classList.toggle("tk-dup", i >= half);
      if (i >= half) it.setAttribute("aria-hidden", "true");
      it.tabIndex = i >= half ? -1 : 0;
      if (!it.hasAttribute("role")) it.setAttribute("role", "button");
    });
    const track = $("#ticker-marquee-track");
    if (track && !track.dataset.hgKeys) {
      track.dataset.hgKeys = "1";
      track.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target.closest(".ticker-item")) { e.preventDefault(); e.target.closest(".ticker-item").click(); }
      });
    }
  }

  /* ---------- 4. Market desk: crisp redraw on resize/rotation (honesty note lives in index.html #term-honesty) ---------- */
  let roStage = null, lastW = 0;
  function watchChartSize() {
    const stage = $("#term-chart-stage");
    if (!stage || roStage || !("ResizeObserver" in window)) return;
    let raf = 0;
    roStage = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (!w || w === lastW) return;
      lastW = w;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { try { window.TitanHallChart && window.TitanHallChart(); } catch (_) {} });
    });
    roStage.observe(stage);
  }

  /* ---------- wiring ---------- */
  function paintAll() {
    const v = getVault();
    if (!v) return;
    stageHero();
    renderGlance(v);
    renderAsOf(v);
    markTickerDupes();
    watchChartSize();
    fitMeltLabels();
    const pane = $("#pane-hall");
    if (pane) pane.classList.add("hall-ready");
  }

  function init() {
    const stats = $("#hdr-stats");
    const glanceClick = (e) => {
      const t = e.target.closest("[data-hg-go]");
      if (!t) return;
      const go = t.dataset.hgGo;
      if (typeof window.TitanSetWing === "function") {
        window.TitanSetWing(go);
        window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
      }
    };
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#hall-glance")) glanceClick(e); });

    // app.js re-renders the hero (and #hdr-stats) on every load/refresh: repaint our parts after it.
    if (stats && "MutationObserver" in window) {
      new MutationObserver(() => paintAll()).observe(stats, { childList: true }); // runs after renderAll finishes (microtask)
    }
    const bar = $("#melt-bar");
    if (bar && "MutationObserver" in window) {
      new MutationObserver(fitMeltLabels)
        .observe(bar, { attributes: true, subtree: true, childList: true, characterData: true, attributeFilter: ["style"] });
    }
    const track = $("#ticker-marquee-track");
    if (track && "MutationObserver" in window) {
      new MutationObserver(markTickerDupes).observe(track, { childList: true });
    }
    window.addEventListener("resize", () => requestAnimationFrame(fitMeltLabels), { passive: true });
    if (stats && stats.childElementCount) paintAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
