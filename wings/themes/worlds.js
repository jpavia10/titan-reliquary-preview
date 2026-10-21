/* Titan Reliquary: Worlds runtime (themes picker data + apply). Loads after wings/themes/manifest.js and app.js.
   TitanWorlds.apply(id)  : cross-fades the page (~350 ms) and switches the atmosphere
   TitanWorlds.render(el) : paints the Themes tab into el: filter chips, the current theme, six groups of tiles (Scene Studio v3)
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
      root.style.setProperty("--world-hero", 'url("' + art(small || !w.art.hero ? w.art.card : w.art.hero) + '")');
      root.setAttribute("data-world-art", "1");
    }
  }

  var lastTap = { x: innerWidth / 2, y: innerHeight / 2 };
  document.addEventListener("pointerdown", function (e) { lastTap = { x: Math.round(e.clientX), y: Math.round(e.clientY) }; }, { capture: true, passive: true });
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
      /* cinematic switch (Grok 2026-10-20): the new theme opens as a circle from where you tapped while the old one sinks back */
      root.style.setProperty("--vt-x", lastTap.x + "px"); root.style.setProperty("--vt-y", lastTap.y + "px");
      root.classList.add("vt-theme");
      var vt = document.startViewTransition(go);
      vt.finished.then(function () { root.classList.remove("vt-theme"); }, function () { root.classList.remove("vt-theme"); });
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
    if (!st.length || !PREV[st[0]]) return "";                 // newer styles have no CSS miniature: their swatch already shows the look
    return '<span class="th-prev" data-prev="' + PREV[st[0]] + '" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  }
  /* Themes tab v3 (2026-10-20, owner: "make the grouping of the themes ... not suck"). Six groups by what a theme feels like, instead of
     the manifest's collections (one of them, "Studio", had become a pile of 14 unrelated themes). A theme not listed here (a new one)
     lands in "New and more" until it is given a group. Filter chips: All / Light / Dark. The current theme sits on top, big. */
  var GROUPS = [
    { name: "Museum and study", note: "Calm rooms for looking closely", ids: ["afterhours", "conservator", "drafting", "sketch", "marbled", "banknote", "notepad"] },
    { name: "Vaults and treasure", note: "Gold, silver and hoards", ids: ["colossus", "glacier", "valhalla", "dynasty", "abyss", "alchemist"] },
    { name: "Journeys", note: "Maps, ships, stations and stars", ids: ["odyssey", "silkroad", "terminal", "contour", "solaris"] },
    { name: "Calm and quiet", note: "Slow, soft and still", ids: ["nocturne", "zen", "samadhi", "cathedral"] },
    { name: "Neon and otherworld", note: "Glow, code and strange places", ids: ["kaleido", "neon", "construct", "xeno", "cursedwing", "lumen"] },
    { name: "Playful and retro", note: "Games, comics, paper and toys", ids: ["arcade", "pulp", "diorama", "bauhaus", "y2k", "papercut", "freefall"] },
    { name: "Matter and machines", note: "Liquids, metals and moving parts", ids: ["ferro"] }
  ];
  var LIGHT = { banknote: 1, bauhaus: 1, conservator: 1, diorama: 1, marbled: 1, notepad: 1, papercut: 1, pulp: 1, sketch: 1, y2k: 1 };
  function isLight(w) { return w.scheme ? w.scheme === "light" : !!LIGHT[w.id]; }
  function groups() {
    var seen = {}, out = GROUPS.map(function (g) {
      var l = g.ids.map(function (id) { return by[id]; }).filter(Boolean);
      l.forEach(function (w) { seen[w.id] = 1; });
      return { name: g.name, note: g.note, list: l };
    });
    var rest = W.filter(function (w) { return !seen[w.id]; });
    if (rest.length) out.push({ name: "New and more", note: "Themes still waiting for a group", list: rest });
    return out;
  }
  function pass(w, f) { return f === "light" ? isLight(w) : f === "dark" ? !isLight(w) : true; }
  function picture(w, cls) {
    return w.art
      ? '<span class="th-img th-art ' + cls + '"><img loading="lazy" decoding="async" width="640" height="400" alt="" src="' + art(w.art.card) + '">' + preview(w) + '</span>'
      : '<span class="th-img th-swatch atmo-swatch sw-' + w.id + ' ' + cls + '" aria-hidden="true">' + preview(w) + '</span>';
  }
  function tile(w, cur) {
    var st = w.styles || [];
    return '<button type="button" class="th-card th-tile" data-world="' + w.id + '" aria-pressed="' + (cur === w.id) + '" aria-label="' +
      esc(w.name + (st.length ? ", " + st.join(" and ") : "") + ". " + w.mood) + '">' + picture(w, "") +
      '<span class="th-name' + (/\S{11,}/.test(w.name) ? " th-long" : "") + '">' + esc(w.name) + '</span><span class="th-now" aria-hidden="true">✓</span></button>';
  }
  function hero(id) {
    var w = by[id]; if (!w) return "";
    var st = w.styles || [];
    return picture(w, "th-hero-img") + '<span class="th-hero-body"><span class="th-hero-k">Now showing</span><span class="th-name">' + esc(w.name) + '</span>' +
      (st.length ? '<span class="th-styles">' + st.map(function (x) { return '<span class="th-style">' + esc(x) + '</span>'; }).join("") + '</span>' : "") +
      '<span class="th-mood">' + esc(w.mood) + '</span><button type="button" class="th-surprise" data-th-surprise="1">Surprise me</button></span>';
  }
  function render(el) {
    var cur = root.getAttribute("data-atmo"), f = el.dataset.filter || "all";
    var nL = W.filter(isLight).length, chip = function (k, label, n) {
      return '<button type="button" class="th-filter" data-th-filter="' + k + '" aria-pressed="' + (f === k) + '">' + label + ' <span>' + n + '</span></button>';
    };
    var h = '<div class="th-bar" role="group" aria-label="Show themes">' + chip("all", "All", W.length) + chip("light", "Light", nL) + chip("dark", "Dark", W.length - nL) +
      '</div>' +
      '<div class="th-hero" id="th-hero">' + hero(cur) + '</div>';
    groups().forEach(function (g) {
      var l = g.list.filter(function (w) { return pass(w, f); });
      if (!l.length) return;
      h += '<section class="th-group"><h3 class="th-coll">' + esc(g.name) + ' <span class="th-note">' + esc(g.note) + '</span></h3><div class="th-grid">' +
        l.map(function (w) { return tile(w, cur); }).join("") + '</div></section>';
    });
    el.innerHTML = h;
  }
  /* mark the current theme (the tile ring and the big card on top); id = the theme just picked, before data-atmo has switched */
  function mark(el, id) {
    var cur = id || root.getAttribute("data-atmo");
    el.querySelectorAll(".th-card").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.world === cur)); });
    var hb = el.querySelector("#th-hero");
    if (hb && hb.getAttribute("data-for") !== cur) { hb.setAttribute("data-for", cur); hb.innerHTML = hero(cur); }
  }
  /* a random theme from the current filter, never the one on screen */
  function surprise(f, cur) {
    var l = W.filter(function (w) { return pass(w, f || "all") && w.id !== cur; });
    return l.length ? l[Math.floor(Math.random() * l.length)].id : null;
  }

  window.addEventListener("titan:atmo", function (e) { sync(e.detail.atmo); });
  sync(root.getAttribute("data-atmo"));
  window.TitanWorlds = { worlds: W, byId: function (i) { return by[i]; }, apply: apply, render: render, mark: mark, sync: sync, surprise: surprise, groups: groups, isLight: isLight };
})();
