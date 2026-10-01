/* Titan Reliquary: Worlds runtime (themes picker data + apply). Loads after wings/themes/manifest.js and app.js.
   TitanWorlds.apply(id)  : cross-fades the page (~350 ms) and switches the atmosphere
   TitanWorlds.render(el) : paints the Signature + Classic card grid into el (used by the Scene Studio Themes tab)
   Hero art: --world-hero on <html> (only the ACTIVE world's image is ever requested), used by styles/worlds.css. */
(function () {
  "use strict";
  var W = window.TITAN_WORLDS || [];
  var by = {}; W.forEach(function (w) { by[w.id] = w; });
  var root = document.documentElement, applied = [];
  var reduced = function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var art = function (f) { return "art/themes/" + f; };

  function sync(id) {
    var w = by[id];
    applied.forEach(function (k) { root.style.removeProperty(k); }); applied = [];
    root.style.removeProperty("--world-hero"); root.removeAttribute("data-world-art"); root.removeAttribute("data-world-tier");
    if (!w) return;
    if (w.tokens) Object.keys(w.tokens).forEach(function (k) { root.style.setProperty(k, w.tokens[k]); applied.push(k); });
    root.setAttribute("data-world-tier", w.tier);
    if (w.art) {
      var small = Math.max(window.innerWidth || 0, 1) * (window.devicePixelRatio || 1) <= 900;
      root.style.setProperty("--world-hero", 'url("' + art(small ? w.art.card : w.art.hero) + '")');
      root.setAttribute("data-world-art", "1");
    }
  }

  function apply(id) {
    if (!by[id] || !window.TitanSetAtmo) return;
    var go = function () { window.TitanSetAtmo(id); sync(id); };
    if (root.getAttribute("data-atmo") === id) { sync(id); return; }
    if (reduced()) { go(); return; }
    if (document.startViewTransition) {
      var vt = document.startViewTransition(go);
      vt.finished.then(function () {}, function () {});
    } else {
      root.classList.add("world-fade");
      setTimeout(function () { go(); requestAnimationFrame(function () { root.classList.remove("world-fade"); }); }, 170);
    }
  }

  function card(w, big) {
    var cur = root.getAttribute("data-atmo") === w.id;
    var imgHtml = w.art
      ? '<img class="th-img" loading="lazy" decoding="async" width="640" height="400" alt="" src="' + art(w.art.card) + '">'
      : '<span class="th-img th-swatch atmo-swatch sw-' + w.id + '" aria-hidden="true"></span>';
    return '<button type="button" class="th-card' + (big ? " th-big" : "") + '" data-world="' + w.id + '" aria-pressed="' + cur + '">' +
      imgHtml + '<span class="th-body"><span class="th-name">' + esc(w.name) + '</span>' +
      '<span class="th-mood">' + esc(w.mood) + '</span></span>' +
      '<span class="th-now" aria-hidden="true">Current</span></button>';
  }

  function render(el) {
    var sig = W.filter(function (w) { return w.tier === "signature" && w.art; });
    var cls = W.filter(function (w) { return w.tier !== "signature"; });
    var h = "";
    if (sig.length) {
      h += '<h3 class="ss-h">Signature</h3>';
      (window.TITAN_WORLD_COLLECTIONS || []).forEach(function (c) {
        var l = sig.filter(function (w) { return w.collection === c; });
        if (l.length) h += '<p class="th-coll">' + esc(c) + '</p><div class="th-grid th-grid-big">' + l.map(function (w) { return card(w, true); }).join("") + '</div>';
      });
    }
    var withArt = cls.filter(function (w) { return w.art; }), without = cls.filter(function (w) { return !w.art; });
    h += '<h3 class="ss-h">' + (sig.length ? "Classic" : "All themes") + '</h3>';
    if (withArt.length) h += '<div class="th-grid th-grid-big">' + withArt.map(function (w) { return card(w, true); }).join("") + '</div>';
    h += '<div class="th-grid">' + without.map(function (w) { return card(w, false); }).join("") + '</div>';
    el.innerHTML = h;
  }

  function mark(el) {
    var cur = root.getAttribute("data-atmo");
    el.querySelectorAll(".th-card").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.world === cur)); });
  }

  window.addEventListener("titan:atmo", function (e) { sync(e.detail.atmo); });
  sync(root.getAttribute("data-atmo"));
  window.TitanWorlds = { worlds: W, byId: function (i) { return by[i]; }, apply: apply, render: render, mark: mark, sync: sync };
})();
