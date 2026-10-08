/* Titan Reliquary · the search palette (Ctrl/⌘K) split out of app.js (fix list #32, step 4; notes/agents/app-split.md).
   Open / close / render the classic result list and its key + click bindings. The richer "palette v2" in wings/gallery.js still
   draws the results when it is present (window.__galleryBridge.palette); this file is its fallback and the owner of the open state.
   app.js creates it once with what only app.js knows:
     TitanPalette.create({ ensureSearch, flips: () => [...], match: (flip, q) => bool, norm, openCoin: (scan) => ..., markTyping })
   -> { open, close, toggle, isOpen, render }. Loaded before app.js; uses TitanFormat (esc, intFmt, money) and TitanOverlay (focus). */
(() => {
  "use strict";
  if (window.TitanPalette) return;
  function create(o) {
    const F = window.TitanFormat || {}, OV = window.TitanOverlay || {};
    const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const esc = F.esc || ((s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
    const intFmt = F.intFmt || ((n) => Number(n).toLocaleString("en-US"));
    const money = F.money || ((n) => "$" + Number(n).toFixed(2));
    let isOpen = false;
    function open() {
      o.ensureSearch && o.ensureSearch();
      OV.rememberFocus && OV.rememberFocus();
      $("#palette").hidden = false;
      isOpen = true;
      window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "search" } }));
      render("");
      window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
      const q = $("#palette-q");
      q.value = "";
      requestAnimationFrame(() => q.focus());
    }
    function close() {
      if (!isOpen) return;
      $("#palette").hidden = true;
      isOpen = false;
      window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
      OV.restoreFocus && OV.restoreFocus();
    }
    function go(scan) { close(); o.openCoin(scan); }
    function render(qRaw) {
      const gb = window.__galleryBridge;
      if (gb && gb.palette && !gb.paletteBroken) {
        try { if (gb.palette(qRaw) !== false) return; } catch (e) { gb.paletteBroken = true; console.warn("Palette v2 failed; using the classic palette.", e); }
      }
      const q = o.norm(qRaw || "");
      const box = $("#palette-results"), flips = o.flips() || [];
      if (!q) {
        box.innerHTML = `<div class="pal-empty">Type to search ${esc(intFmt(flips.length))} flips — SER, scan, country, year, denom.</div>`;
        return;
      }
      const hits = flips.filter((f) => o.match(f, q)).slice(0, 8);
      box.innerHTML = hits.length
        ? hits.map((f, i) => `
          <button type="button" class="pal-row${i === 0 ? " sel" : ""}" data-scan="${esc(f.scan)}" role="option">
            <span class="pal-ser">${esc(f.ser || f.scan)}<span class="pal-scan">${esc(f.scan)}</span></span>
            <span class="pal-meta">${esc([f.country, f.year, f.denom || f.label].filter(Boolean).join(" · "))}</span>
            <span class="pal-est">${f.est != null ? money(f.est) : "—"}</span>
          </button>`).join("")
        : `<div class="pal-empty">No matches for “${esc(qRaw)}”.</div>`;
      $$(".pal-row", box).forEach((row) => row.addEventListener("click", () => go(row.dataset.scan)));
    }
    // bindings (were in app.js's setup block)
    $("#btn-search").addEventListener("click", open);
    $("#fab-search")?.addEventListener("click", open);
    $("#palette-q").addEventListener("input", (e) => { o.markTyping && o.markTyping(); render(e.target.value); });
    $("#palette-q").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      // the first result straight to its coin view; stopPropagation keeps the document-level key handler out of it
      e.preventDefault(); e.stopPropagation();
      const first = $("#palette-results .pal-row");
      if (first) go(first.dataset.scan);
    });
    $("#palette").addEventListener("click", (e) => { if (e.target.id === "palette") close(); });
    return { open, close, render, toggle: () => (isOpen ? close() : open()), isOpen: () => isOpen };
  }
  window.TitanPalette = { create };
})();
