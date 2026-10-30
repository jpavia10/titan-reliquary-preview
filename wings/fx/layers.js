/* TitanFXLayers: effects the owner adds on top of any theme (Claude, 2026-10-30).
   Owner: "I should be able to add any of the available effects on any scene regardless of the default configuration. If I want
   fireworks and explosions on my zen garden then so be it. If I want the color swirl with drag physics on midnight gallery then why
   not especially since the third place is like an escape."
   Every effect in the library can be added to any theme, each with its own strength, kept per theme in localStorage
   "titan.fx.layers.v1" ({ theme: [{ id, w }] }). They play over the theme's own world and effect, behind the collection, in the
   Atmosphere and in the room alike:
     kind "fx"   a TitanFX preset (wings/fx/*.js), stacked into the overlay's composite by wings/fx/ui.js (the overlay draws at most
                 three at once, so the theme's own effect steps aside for a third added one)
     kind "kit"  a TitanFXK module drawn over the theme's GPU world in the same canvas (fx/kit.js K.extraStack), loaded the first time
                 it is added: the paint swirl is the real fluid (fx/fluid.js) that a drag stirs
   API: lib() / has(id) / list(theme) / on(theme, id) / toggle(theme, id) / set(theme, id, w) / clear(theme) / overlay(theme) /
   kitStack(theme). Changes dispatch "titan:fxlayers" ({ detail: { theme } }). */
(function () {
  "use strict";
  if (window.TitanFXLayers) return;
  var KEY = "titan.fx.layers.v1", MAX_FX = 3, html = document.documentElement;
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { store = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode: this visit only */ } }

  /* the library: [id, name, icon, group, kind]; an "fx" id that is not registered in this build is left out of lib() */
  var G = { cel: "Celebrations", paint: "Paint and liquid", sky: "Weather and sky", fire: "Fire and light", air: "In the air", place: "Places", style: "Screen styles" };
  var LIB = [
    ["fireworks", "Fireworks", "🎆", G.cel], ["explosions", "Explosions", "💥", G.cel],
    ["paint-swirl", "Paint swirl (drag it)", "🌀", G.paint, "kit"], ["style-liquid", "Molten metal", "🫗", G.paint], ["style-marble", "Marbled paint", "🎨", G.paint],
    ["style-ferro", "Ferrofluid", "🧲", G.paint], ["incense-curl", "Smoke curls", "〰️", G.paint],
    ["rain-on-glass", "Rain on the glass", "🌧️", G.sky], ["storm", "Storm and lightning", "⛈️", G.sky], ["snow", "Snow", "❄️", G.sky], ["glass-frost", "Frost", "🧊", G.sky],
    ["fog", "Fog", "🌫️", G.sky], ["aurora", "Aurora", "🌌", G.sky], ["stars", "Stars", "✨", G.sky], ["godrays", "Light shafts", "🔆", G.sky], ["moonlit", "Moonlight", "🌙", G.sky],
    ["embers", "Embers", "🔥", G.fire], ["candle", "Candlelight", "🕯️", G.fire], ["lanterns", "Lanterns", "🏮", G.fire], ["lantern-feast", "Lantern festival", "🎐", G.fire],
    ["athanor", "Alchemist's fire", "⚗️", G.fire], ["mint-forge", "Forge sparks", "⚒️", G.fire], ["mead-hall", "Hall fire", "🍺", G.fire], ["prismatic", "Prism flares", "💎", G.fire],
    ["prism", "Prism glints", "🔷", G.fire], ["caustics", "Water light", "💧", G.fire], ["coronagraph", "Solar corona", "☀️", G.fire], ["bluenote", "Blue note", "🎷", G.fire],
    ["dust", "Floating dust", "🌟", G.air], ["smoke", "Smoke", "💨", G.air], ["incense", "Incense", "🪔", G.air], ["spores", "Spores", "🍄", G.air], ["style-particles", "Particles", "⚛️", G.air],
    ["style-physics", "Falling coins", "🪙", G.air],
    ["deepsea", "Deep sea", "🐋", G.place], ["voyage", "At sea", "⛵", G.place], ["crypt", "Crypt", "🦇", G.place], ["nightcity", "Night city", "🌃", G.place], ["garden", "Garden", "🌸", G.place],
    ["dunes", "Desert sand", "🏜️", G.place], ["polar-ice", "Polar ice", "🐧", G.place], ["phosphor", "Phosphor screen", "📟", G.place], ["paperink", "Paper and ink", "✒️", G.place], ["loupe", "Under the loupe", "🔍", G.place],
    ["style-neon", "Neon", "💡", G.style], ["style-vhs", "VHS", "📼", G.style], ["style-holo", "Hologram", "🪩", G.style], ["style-kaleido", "Kaleidoscope", "🔮", G.style], ["style-glass", "Stained glass", "⛪", G.style],
    ["style-mesh", "Colour mesh", "🌈", G.style], ["style-wireframe", "Wireframe", "🕸️", G.style], ["style-ice-glass", "Ice glass", "🥶", G.style], ["style-deco", "Art deco", "🏛️", G.style],
    ["style-halftone", "Halftone", "🔘", G.style], ["style-comic", "Comic", "💬", G.style], ["style-blueprint", "Blueprint", "📐", G.style], ["style-clay", "Clay", "🏺", G.style],
    ["style-bauhaus", "Bauhaus", "🔺", G.style], ["style-y2k", "Chrome", "🪞", G.style], ["style-papercut", "Paper cut", "✂️", G.style], ["style-sketch", "Sketch", "✏️", G.style],
    ["style-guilloche", "Guilloche", "💵", G.style], ["style-topo", "Contours", "🗺️", G.style], ["style-pixel", "Pixels", "👾", G.style], ["style-ascii", "ASCII", "💻", G.style],
    ["style-splitflap", "Split-flap", "🛫", G.style], ["style-kinetic", "Kinetic type", "🔤", G.style], ["scanlines", "Scanlines", "📺", G.style]
  ].map(function (r) { return { id: r[0], name: r[1], icon: r[2], group: r[3], kind: r[4] || "fx" }; });
  var BY = {}; LIB.forEach(function (x) { BY[x.id] = x; });
  var GROUPS = [G.cel, G.paint, G.sky, G.fire, G.air, G.place, G.style];

  /* the GPU kit modules an added layer uses (loaded the first time it is added) */
  var KIT = { "paint-swirl": { mod: "fluid", file: "fx/fluid.js" } };
  function presets() { var FX = window.TitanFX; try { return FX && FX.presets ? FX.presets() : []; } catch (e) { return []; } }
  function usable(x) {
    if (x.kind === "kit") { var K = window.TitanFXK; return !!(K && K.gl && window.WebGL2RenderingContext); }
    var p = presets(); return !p.length || p.indexOf(x.id) >= 0;
  }
  function lib() { return LIB.filter(usable).map(function (x) { return { id: x.id, name: x.name, icon: x.icon, group: x.group, kind: x.kind }; }); }
  function theme(t) { return t || html.getAttribute("data-atmo") || "afterhours"; }
  function list(t) { return (store[theme(t)] || []).filter(function (e) { return BY[e.id]; }).map(function (e) { return { id: e.id, w: e.w, name: BY[e.id].name, icon: BY[e.id].icon, kind: BY[e.id].kind }; }); }
  function changed(t) {
    save();
    try { window.dispatchEvent(new CustomEvent("titan:fxlayers", { detail: { theme: theme(t) } })); } catch (e) { /* old browser */ }
    var K = window.TitanFXK; if (K && K.setExtras) K.setExtras();
  }
  function on(t, id) { return (store[theme(t)] || []).some(function (e) { return e.id === id; }); }
  /* add or remove one; adding an overlay effect past the overlay's three drops the oldest added overlay effect */
  function toggle(t, id) {
    t = theme(t); if (!BY[id]) return false;
    var L = store[t] = store[t] || [], i = L.map(function (e) { return e.id; }).indexOf(id);
    if (i >= 0) L.splice(i, 1);
    else {
      if (BY[id].kind === "fx") { var fx = L.filter(function (e) { return BY[e.id] && BY[e.id].kind === "fx"; }); if (fx.length >= MAX_FX) L.splice(L.indexOf(fx[0]), 1); }
      L.push({ id: id, w: .8 });
      var FX = window.TitanFX; if (BY[id].kind === "fx" && FX && FX.state && FX.state().level === "off" && FX.setLevel) FX.setLevel("full");   // asked for an effect: show it
    }
    if (!L.length) delete store[t];
    changed(t); return i < 0;
  }
  function set(t, id, w) {
    t = theme(t); var e = (store[t] || []).filter(function (x) { return x.id === id; })[0]; if (!e) return;
    e.w = Math.max(.05, Math.min(1.6, +w || 0));
    var k = kitCache[t + "|" + id]; if (k) { k.alpha = Math.min(1, e.w); k.dyeK = .4 * e.w; k.autoDye = .035 * e.w; }   // the fluid reads these every frame: no rebuild
    save();
    if (BY[id].kind === "fx") { try { window.dispatchEvent(new CustomEvent("titan:fxlayers", { detail: { theme: t, weight: true } })); } catch (err) { /* ignore */ } }
  }
  function clear(t) { delete store[theme(t)]; changed(t); }
  /* the overlay part: "id*w" strings, in the order they were added */
  function overlay(t) { return list(t).filter(function (e) { return e.kind === "fx" && usable(BY[e.id]); }).map(function (e) { return { id: e.id, w: e.w }; }); }
  /* the kit part: stack entries for fx/kit.js (one object per theme and layer, kept so a strength change reaches it live) */
  var kitCache = {};
  function tierOpts() {
    var K = window.TitanFXK, tier = K && K.tierName ? K.tierName() : "high";
    return tier === "low" ? { simRes: 96, dyeRes: 640, iters: 12 } : tier === "medium" ? { simRes: 128, dyeRes: 768, iters: 18 } : { simRes: 160, dyeRes: 1024, iters: 24 };
  }
  function kitStack(t) {
    t = theme(t);
    return list(t).filter(function (e) { return e.kind === "kit" && KIT[e.id]; }).map(function (e) {
      var key = t + "|" + e.id, o = kitCache[key];
      if (!o) {
        o = kitCache[key] = Object.assign({ mod: KIT[e.id].mod, file: KIT[e.id].file, layer: e.id, colors: [[1, .22, .6], [.2, .75, 1], [.65, .3, 1], [1, .7, .15]], auto: 2, autoForce: 300,
          curl: 34, velDiss: .3, dyeDiss: .93, shade: .85, blend: "add", splatR: .004 }, tierOpts());
      }
      o.alpha = Math.min(1, e.w); o.dyeK = .4 * e.w; o.autoDye = .035 * e.w;
      return o;
    });
  }

  window.TitanFXLayers = { lib: lib, groups: function () { return GROUPS.slice(); }, has: function (id) { return !!BY[id]; }, list: list, on: on, toggle: toggle, set: set, clear: clear,
    overlay: overlay, kitStack: kitStack, MAX_FX: MAX_FX };
})();
