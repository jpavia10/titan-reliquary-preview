/* TitanAtmo: tiny helpers so 20 themes can each own their crest and picker copy without touching shared files. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var T = window.TitanAtmo = window.TitanAtmo || {};
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  /** Replace (or create) <symbol id="crest-NAME" viewBox="0 0 200 200"> with the given inner SVG markup. */
  T.defineCrest = function (name, inner, viewBox) {
    ready(function () {
      var id = "crest-" + name, sym = document.getElementById(id);
      if (!sym) {
        var host = document.querySelector('svg[style*="display:none"] symbol'); host = host ? host.parentNode : null;
        if (!host) return;
        sym = document.createElementNS(NS, "symbol"); sym.setAttribute("id", id); host.appendChild(sym);
      }
      sym.setAttribute("viewBox", viewBox || "0 0 200 200");
      var doc = new DOMParser().parseFromString('<svg xmlns="' + NS + '">' + inner + "</svg>", "image/svg+xml");
      while (sym.firstChild) sym.removeChild(sym.firstChild);
      Array.prototype.forEach.call(doc.documentElement.childNodes, function (n) { sym.appendChild(document.importNode(n, true)); });
    });
  };
  /** Update the atmosphere-picker card copy: opts = { name, desc, pair }. */
  T.setCard = function (name, opts) {
    ready(function () {
      var card = document.querySelector('.atmo-card[data-atmo-val="' + name + '"]'); if (!card || !opts) return;
      if (opts.name) { var a = card.querySelector(".atmo-card-name"); if (a) a.textContent = opts.name; }
      if (opts.desc) { var b = card.querySelector(".atmo-card-desc"); if (b) b.textContent = opts.desc; }
      if (opts.pair) { var c = card.querySelector(".atmo-card-pair"); if (c) c.textContent = opts.pair; }
    });
  };
})();
