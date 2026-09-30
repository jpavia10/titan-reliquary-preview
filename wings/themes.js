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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      var p = pending; pending = [];
      p.forEach(function (a) { apply(a[0], a[1], a[2]); });
    });
  }
})();
