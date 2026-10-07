/* Titan Reliquary · formatting and DOM helpers shared by app.js and its split-out modules (fix list #32, step 2;
   notes/agents/app-split.md). Loaded before app.js. Pure functions, no state beyond cached Intl formatters. */
(() => {
  "use strict";
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  /* Number.prototype.toLocaleString(locale, options) builds a new Intl.NumberFormat on every call (slow on phones);
     share formatters instead. Output is identical. */
  const NF = new Map();
  function nf(min, max) {
    const k = min + "," + max;
    let f = NF.get(k);
    if (!f) { f = new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max }); NF.set(k, f); }
    return f;
  }
  const NF_INT = new Intl.NumberFormat("en-US");
  function money(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return "$" + nf(2, 2).format(Number(n));
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
    return nf(min, max).format(Number(n));
  }
  function intFmt(n) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return NF_INT.format(Number(n));
  }
  /** High-precision fixed decimals without thousands separators (years / ages). */
  function precise(n, d = 6) {
    if (n == null || Number.isNaN(Number(n))) return "—";
    return Number(n).toFixed(d);
  }

  window.TitanFormat = { $, $$, nf, NF_INT, money, esc, num, intFmt, precise };
})();
