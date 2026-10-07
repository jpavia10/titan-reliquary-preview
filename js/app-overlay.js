/* Titan Reliquary · overlay plumbing split out of app.js (fix list #32, step 3; notes/agents/app-split.md):
   focus memory, the Tab focus trap inside the topmost open layer, topOverlayEl(), and the offline banner.
   Closing layers stays in app.js (it knows the drawer, palette and lightbox). Loaded before app.js; DOM only. */
(() => {
  "use strict";
  const $ = (sel, el = document) => el.querySelector(sel);
  let lastFocus = null;
  function rememberFocus() { lastFocus = document.activeElement; }
  function restoreFocus() {
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }
  // Focus trap: Tab cycles inside the topmost open overlay.
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const top = topOverlayEl();
    if (!top) return;
    const f = [...top.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], i = f.indexOf(document.activeElement);
    // also wrap when focus sits on something inside the layer that is not in the list (e.g. the results listbox),
    // or has escaped the layer: before 2026-10-07 Tab walked out of the search palette from its results list
    if (e.shiftKey && (i === 0 || i === -1)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); first.focus(); }
  });
  function topOverlayEl() {
    const order = ["#lightbox", "#palette", "#scene-sheet", "#atmo-sheet", "#keys-sheet", ".ambient-panel", "#drawer"];
    for (const sel of order) {
      const el = sel === ".ambient-panel" ? document.querySelector(sel) : $(sel);
      if (el && !el.hidden) return el;
    }
    return null;
  }

  function startOffline() {
  // Offline honesty: a slim banner when the network drops.
  const offBanner = $("#offline-banner");
  function syncOffline() { if (offBanner) offBanner.hidden = navigator.onLine !== false; }
  window.addEventListener("online", syncOffline);
  window.addEventListener("offline", syncOffline);
  syncOffline();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startOffline); else startOffline();
  window.TitanOverlay = { rememberFocus, restoreFocus, topOverlayEl };
})();
