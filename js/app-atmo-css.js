/* Titan Reliquary · atmosphere stylesheet swap, split out of app.js (fix list #32, step 3; notes/agents/app-split.md).
   index.html writes the saved atmosphere's <link id="atmo-css"> before first paint. A later switch loads the new sheet
   next to the old one (same cascade slot, every rule is scoped to its own html[data-atmo]), flips data-atmo once it
   is ready (app.js applyAtmo), then drops the old sheet. window.TitanAtmoReady() resolves when the last requested switch
   has been applied. Loaded before app.js. */
(() => {
  "use strict";
  const atmoCss = { name: (document.getElementById("atmo-css") || {}).dataset?.atmoCss || document.documentElement.getAttribute("data-atmo") || "afterhours", tok: 0, ready: Promise.resolve() };
  function loadAtmoCss(name) {
    const prev = document.querySelector("link[data-atmo-css]");
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.dataset.atmoCss = name;
    link.href = `styles/atmo/${name}.css${window.__trAtmoQ || ""}`;
    return new Promise((res) => {
      link.onload = () => res(true);
      link.onerror = () => res(false);
      if (prev) prev.after(link); else document.head.appendChild(link);
    });
  }
  function dropOtherAtmoCss(name) {
    let kept = false;
    document.querySelectorAll("link[data-atmo-css]").forEach((l) => {
      if (l.dataset.atmoCss === name && !kept) kept = true; else l.remove();
    });
    atmoCss.name = name;
  }
  window.TitanAtmoReady = () => atmoCss.ready;
  window.TitanAtmoCss = { state: atmoCss, load: loadAtmoCss, dropOthers: dropOtherAtmoCss };
})();
