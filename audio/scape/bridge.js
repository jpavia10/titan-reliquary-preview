/* Titan Reliquary · SCAPE app bridge (Grok, soundscape worker). Tiny; loaded with the page, everything else is lazy.
   - When the app's sound is playing (TitanGen, the "titan:gen" event), loads audio/scape/engine.js + presets.js once, shares
     TitanGen's AudioContext and plays into TitanGen.uiBus().input (same output route, background play, iOS unlock), scaled by
     the user's master volume. Mute follows "titan:mute". Pause/stop in the app stops the scape.
   - Theme -> scape: THEME_SCAPE below, keyed by <html data-atmo>. Swaps with a slow crossfade when the theme changes.
   - Ducking: TitanScape.sidechain(TitanGen.musicBus().input) so the beds sink under the theme music (and come back in gaps).
   - Chill mode hooks: window.TitanScapeApp = { ready() -> Promise<TitanScape>, take(id, params) (override the theme bed),
     release() (back to the theme's bed), set(k, v), layers(), setLayer(id, g), sleep(min), level(x 0..1.5), map, current() }. */
(function () {
  "use strict";
  if (window.TitanScapeApp) return;
  var THEME_SCAPE = {
    kaleido: "glass", afterhours: "smoke", conservator: "fire", colossus: "metal", nocturne: "fireflies", odyssey: "blackhole",
    cursedwing: "storm", abyss: "underwater", neon: "neon", notepad: "ocean", construct: "plasma", xeno: "coral", solaris: "aurora",
    alchemist: "lava", glacier: "blizzard", valhalla: "fire", dynasty: "waterfall", zen: "sand", samadhi: "fluid", silkroad: "sandstorm",
    arcade: "fireworks", pulp: "rainforest", drafting: "storm", diorama: "bubbles", bauhaus: "crystal", terminal: "neon", lumen: "plasma",
    ferro: "metal", marbled: "fluid", cathedral: "smoke", contour: "waterfall", banknote: "metal", freefall: "sandstorm", sketch: "rainforest",
    papercut: "bubbles", y2k: "fireworks", rift: "plasma", horizon: "blackhole"
  };
  /* per-theme variants: where themes share a scape each gets its own room, tone, speed and layer balance (+ numeric params) */
  var PARAMS = {
    afterhours: { space: "hall", tone: 2600, layers: { bell: 0, smoulder: 0, air: 1.3 } },
    conservator: { intensity: .5, space: "hall", tone: 3200, layers: { owl: 0, night: 0 } },
    valhalla: { intensity: 1.4, rate: .85, space: "hall", layers: { night: 0, owl: 0, crackle: 1.4 } },
    ferro: { rate: .8, space: "hall", tone: 1800, layers: { works: 0, glops: 1.5 } },
    banknote: { space: "hall", layers: { furnace: .4, glops: .2, works: 1.7, sub: .5 } },
    horizon: { rate: 1.2, layers: { infall: 1.6, chirps: 1.5, disk: .6 } },
    cursedwing: { storm: 1, rain: 1, space: "cathedral" },
    drafting: { storm: 6, rain: .5, space: "hall", tone: 2200, layers: { wind: .3 } },
    terminal: { rain: .3, storm: 8, space: "cathedral", layers: { neon: .3, cars: .4, city: 1.6 } },
    lumen: { rate: 1.3, layers: { arcs: 1.4, lab: .3 } },
    rift: { rate: .75, space: "cave", layers: { lab: 1.6, arcs: .8 } },
    marbled: { rate: .7, space: "forest", layers: { glass: .4, stir: 1.4 } },
    contour: { space: "forest", layers: { fall: .45, spray: .5, birds: 2 } },
    y2k: { rate: 1.15, space: "open", layers: { crowd: 1.6 } },
    sketch: { rain: .8, tod: 15, tone: 5000, layers: { birds: .5, cicadas: 0 } },
    papercut: { wind: .6, tod: 17, layers: { birds: 1.6, blow: .4 } },
    freefall: { wind: 1.5, rate: 1.3, space: "open", layers: { debris: 0, body: 1.5 } }
  };
  var V = window.TITAN_BUILD || "", root = document.documentElement, loadP = null, TS = null, out = null, unside = null, taken = null, cur = null, lvl = .7, volT = 0, curKey = null;
  function src(u) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = u + (V ? "?v=" + V : ""); s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function ready() {
    if (loadP) return loadP;
    var G = window.TitanGen, bus = G && G.uiBus && G.uiBus();
    if (!bus) return Promise.reject(new Error("no app audio yet"));
    return (loadP = src("audio/scape/engine.js").then(function () { return src("audio/scape/presets.js"); }).then(function () {
      TS = window.TitanScape; out = bus.ctx.createGain(); out.connect(bus.input); TS.attach(bus.ctx, out); vol();
      volT = setInterval(vol, 500);
      try { var mb = G.musicBus(); if (mb && mb.input) unside = TS.sidechain(mb.input, { depth: 9, threshold: -40 }); } catch (e) {}
      return TS; }).catch(function (e) { loadP = null; throw e; }));
  }
  function vol() { if (!out) return; var G = window.TitanGen, v = (G && G.getVolume ? G.getVolume() : .6) * lvl * (G && G.getLevels ? Math.min(1.2, G.getLevels().amb) : 1); out.gain.setTargetAtTime(v, out.context.currentTime, .2); }
  function fold(on) { var G = window.TitanGen; if (G && G.setAmbDuck) G.setAmbDuck(on ? .12 : null); }
  function want() { return taken ? taken.id : THEME_SCAPE[root.getAttribute("data-atmo")] || null; }
  function sync() {
    var G = window.TitanGen, on = (G && G.isPlaying && G.isPlaying()) || !!taken, id = want();
    if (!on || !id) { if (TS && cur) { TS.stop(); cur = null; } curKey = null; fold(false); return; }
    var key = taken ? "take:" + id : root.getAttribute("data-atmo") + ":" + id;
    if (key === curKey) return;
    curKey = key;
    ready().then(function (T) { var p = taken ? taken.params : PARAMS[root.getAttribute("data-atmo")]; cur = id; T.play(id, p); fold(true); }).catch(function () { curKey = null; });
  }
  addEventListener("titan:gen", function () { setTimeout(sync, 50); });
  new MutationObserver(function () { setTimeout(sync, 300); }).observe(root, { attributes: true, attributeFilter: ["data-atmo"] });
  window.TitanScapeApp = {
    map: THEME_SCAPE, ready: ready, current: function () { return cur; },
    take: function (id, params) { taken = { id: id, params: params }; sync(); return ready(); },
    release: function () { taken = null; sync(); },
    set: function (k, v) { if (TS) TS.setParam(k, v); }, layers: function () { return TS ? TS.layers() : []; },
    setLayer: function (id, g) { if (TS) TS.setLayer(id, g); }, sleep: function (m) { if (TS) TS.sleep(m); },
    level: function (x) { lvl = Math.max(0, Math.min(1.5, x)); vol(); }
  };
})();
