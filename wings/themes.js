/* Titan Reliquary · atmosphere helpers (themes agent)
 * TitanAtmoCrest(name, markup[, viewBox]) replaces the heraldic crest symbol
 * #crest-<name> in the index.html sprite, so each atmosphere can redesign its
 * crest from its own file (wings/atmo/<name>.js) without touching index.html.
 * Every <use href="#crest-<name>"> on the page updates automatically.
 * Markup is trusted, static SVG written in this repo (never user data).
 */
(function () {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var pending = [];
  function apply(name, markup, viewBox) {
    var id = "crest-" + name;
    var sym = document.getElementById(id);
    if (!sym) {
      var defs = document.querySelector("svg defs") || null;
      if (!defs) return false;
      sym = document.createElementNS(SVGNS, "symbol");
      sym.setAttribute("id", id);
      defs.appendChild(sym);
    }
    sym.setAttribute("viewBox", viewBox || "0 0 200 200");
    sym.innerHTML = markup;
    sym.setAttribute("data-crest-src", "wings/atmo/" + name + ".js");
    return true;
  }
  window.TitanAtmoCrest = function (name, markup, viewBox) {
    if (!name || !markup) return;
    if (!apply(name, markup, viewBox)) pending.push([name, markup, viewBox]);
  };
  /* Atmosphere picker: each swatch also shows its crest, so the 20 cards read as
     20 identities at a glance (colour: --sw-ink on the swatch, see styles/themes.css). */
  function crestSwatches() {
    var cards = document.querySelectorAll(".atmo-card[data-atmo-val] .atmo-swatch");
    for (var i = 0; i < cards.length; i++) {
      var sw = cards[i];
      if (sw.querySelector(".atmo-swatch-crest")) continue;
      var name = sw.closest(".atmo-card").getAttribute("data-atmo-val");
      var svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "atmo-swatch-crest");
      svg.setAttribute("viewBox", "0 0 200 200");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      var use = document.createElementNS(SVGNS, "use");
      use.setAttribute("href", "#crest-" + name);
      svg.appendChild(use);
      sw.appendChild(svg);
    }
  }
  function ready() {
    var p = pending; pending = [];
    p.forEach(function (a) { apply(a[0], a[1], a[2]); });
    crestSwatches();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
