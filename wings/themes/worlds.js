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
    /* styles-20: the shared UI treatments the World asks for (styles/style-layer.css); index.html sets the same before first paint */
    if (w && w.ui && w.ui.length) root.setAttribute("data-ui", w.ui.join(" ")); else root.removeAttribute("data-ui");
    if (!w) return;
    if (w.tokens) Object.keys(w.tokens).forEach(function (k) { root.style.setProperty(k, w.tokens[k]); applied.push(k); });
    root.setAttribute("data-world-tier", w.tier);
    if (w.art && window.TITAN_WORLD_BACKDROP) {   // optional hook, off by default (layout is being redesigned)
      var small = Math.max(window.innerWidth || 0, 1) * (window.devicePixelRatio || 1) <= 900;
      root.style.setProperty("--world-hero", 'url("' + art(small ? w.art.card : w.art.hero) + '")');
      root.setAttribute("data-world-art", "1");
    }
  }

  function apply(id) {
    if (!by[id] || !window.TitanSetAtmo) return;
    /* app.js loads an atmosphere's stylesheet on demand: TitanSetAtmo applies it once the sheet is ready, so the
       view transition / fade waits on TitanAtmoReady() (a resolved promise when the sheet was already loaded) */
    var go = function () {
      window.TitanSetAtmo(id);
      var rd = window.TitanAtmoReady ? window.TitanAtmoReady() : null;
      if (rd && rd.then) return rd.then(function () { sync(id); });
      sync(id);
    };
    if (root.getAttribute("data-atmo") === id) { sync(id); return; }
    if (reduced()) { go(); return; }
    if (document.startViewTransition) {
      var vt = document.startViewTransition(go);
      vt.finished.then(function () {}, function () {});
    } else {
      root.classList.add("world-fade");
      setTimeout(function () { Promise.resolve(go()).then(function () { requestAnimationFrame(function () { root.classList.remove("world-fade"); }); }); }, 170);
    }
  }

  /* styles-20: each card shows a small live preview of the style it carries (pure CSS, styles/worlds.css .th-prev; still under
     reduced motion), its style names, and the World's mood. Grouped by collection; art (when a World has it) sits behind the preview. */
  var PREV = { "Particles": "particles", "Liquid morph": "liquid", "Holographic": "holo", "Neon glow": "neon", "Retro VHS": "vhs",
    "Wireframe 3D": "wire", "Glassmorphism": "glass", "ASCII art": "ascii", "Gradient mesh": "mesh", "Art deco": "deco", "Halftone": "halftone",
    "Neo-brutalism": "brutal", "Pixel art": "pixel", "Comic book": "comic", "Blueprint": "blueprint", "Clay 3D": "clay", "Isometric": "iso",
    "Bauhaus": "bauhaus", "Kinetic type": "kinetic", "Split-flap": "flap" };
  function preview(w) {
    var st = w.styles || [];
    if (!st.length) return "";
    return '<span class="th-prev" data-prev="' + (PREV[st[0]] || "particles") + '" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  }
  function card(w, big) {
    var cur = root.getAttribute("data-atmo") === w.id, st = w.styles || [];
    var imgHtml = w.art
      ? '<span class="th-img th-art"><img loading="lazy" decoding="async" width="640" height="400" alt="" src="' + art(w.art.card) + '">' + preview(w) + '</span>'
      : '<span class="th-img th-swatch atmo-swatch sw-' + w.id + '" aria-hidden="true">' + preview(w) + '</span>';
    var tags = st.length ? '<span class="th-styles">' + st.map(function (x) { return '<span class="th-style">' + esc(x) + '</span>'; }).join("") + '</span>' : "";
    return '<button type="button" class="th-card' + (big ? " th-big" : "") + '" data-world="' + w.id + '" aria-pressed="' + cur + '"' +
      (st.length ? ' aria-label="' + esc(w.name + ", " + st.join(" and ") + ". " + w.mood) + '"' : "") + '>' +
      imgHtml + '<span class="th-body"><span class="th-name">' + esc(w.name) + '</span>' + tags +
      '<span class="th-mood">' + esc(w.mood) + '</span></span>' +
      '<span class="th-now" aria-hidden="true">Current</span></button>';
  }

  function render(el) {
    var nStyles = 0; W.forEach(function (w) { nStyles += (w.styles || []).length; });
    var h = '<p class="th-intro">' + W.length + ' themes, ' + nStyles + ' animation styles. Tap one to light the room with it; its sound follows if that setting is on.</p>';
    var seen = {};
    (window.TITAN_WORLD_COLLECTIONS || []).concat(["Other"]).forEach(function (c) {
      var l = W.filter(function (w) { return (w.collection || "Other") === c && !seen[w.id]; });
      if (!l.length) return;
      l.forEach(function (w) { seen[w.id] = 1; });
      l.sort(function (a, b) { return (b.art ? 1 : 0) - (a.art ? 1 : 0) || ((b.styles || []).length ? 1 : 0) - ((a.styles || []).length ? 1 : 0); });
      h += '<h3 class="th-coll">' + esc(c) + '</h3><div class="th-grid">' + l.map(function (w) { return card(w, !!w.art); }).join("") + '</div>';
    });
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
