/* TitanFX wiring + "Effects" control for Scene Studio.
   - Maps every atmosphere and every Scene Studio scene to a TitanFX preset + intensity (tables below).
   - TitanFXUI.mount(sheet) is the single hook wings/scene.js calls: it adds Off / Subtle / Full + an intensity slider to Settings.
   - World manifests may call TitanFX.play('<id>') directly or set TitanFXUI.setWorld({fx:'<id>', intensity}) (wins over the atmosphere map). */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX) return;

  /* atmosphere id -> [preset or alias, intensity]. null = no overlay (film only). Current 20 atmospheres plus World ids. */
  var ATMO = {
    /* fx-v3: every atmosphere has its own signature preset (wings/fx/presets.js, section fx-v3); the manifest's `fx` says the same */
    afterhours: ["moonlit", 0.85], nocturne: ["bluenote", 0.85], conservator: ["loupe", 0.6], colossus: ["mint-forge", 0.9],
    odyssey: ["voyage", 0.85], cursedwing: ["crypt", 0.9], kaleido: ["prismatic", 0.75], abyss: ["deepsea", 0.9],
    neon: ["nightcity", 0.85], notepad: ["paperink", 0.6], construct: ["phosphor", 0.7], xeno: ["spores", 0.85],
    solaris: ["coronagraph", 0.85], alchemist: ["athanor", 0.85], glacier: ["polar-ice", 0.85], valhalla: ["mead-hall", 0.9],
    dynasty: ["lantern-feast", 0.85], zen: ["garden", 0.85], samadhi: ["incense-curl", 0.85], silkroad: ["dunes", 0.85],
    /* World ids from notes/agents/theme-pot.md (each descends from one of the atmospheres above) */
    "midnight-gallery": ["moonlit", 0.85], "conservators-bench": ["loupe", 0.6], clear: [null, 0], "the-mint": ["mint-forge", 0.9],
    "hoard-hall": ["mead-hall", 0.9], "blue-note": ["bluenote", 0.85], "captains-cabin": ["voyage", 0.85], shipwreck: ["deepsea", 0.9],
    prism: ["prismatic", 0.75], "night-city": ["nightcity", 0.85], "black-site": ["phosphor", 0.7], "forbidden-wing": ["crypt", 0.9],
    observatory: ["coronagraph", 0.85], "alchemists-study": ["athanor", 0.85], "polar-vault": ["polar-ice", 0.85],
    "imperial-treasury": ["lantern-feast", 0.85], "temple-garden": ["garden", 0.85], caravanserai: ["dunes", 0.85],
    "fireside-den": ["embers*0.9+glass-frost*0.7+snow*0.5", 0.9], "roman-treasury": ["torch", 0.8], "private-bank": [null, 0]
  };
  /* Scene Studio scene (by display name, see wings/scene-engine.js SCENES) -> [preset, intensity] */
  var SCENE = {
    "Quiet study": ["dust", 0.55], "Rainy archive": ["rain-on-glass", 0.9], "Midnight vault": ["fog", 0.6], "Hearth": ["hearth", 0.9],
    "Lo-fi evening": ["night-city", 0.6], "Night garden": ["stars*1+fog*0.3", 0.7], "Snowed in": ["snow-on-glass", 0.9], "Thunderstorm": ["storm", 1]
  };

  /* Optional pre-rendered overlay art (webm, black background, blended with screen). Played through TitanFX.playVideo; a missing file is a silent no-op. */
  /* fx-v3: the video is NOT covered by the text-safe mask (it is a plain <video> over the page) and at Full it dropped body-text contrast
     in Prism below AA (min ratio 0.6 in tools measurements); the new `prismatic` preset draws its own glints/flares, so nothing is auto-played.
     A manifest can still opt in with `fxVideo` (and should use a low `opacity`). */
  var VIDEO = {};

  var atmo = document.documentElement.getAttribute("data-atmo") || "afterhours";
  var sceneName = null, sceneAtmo = null, world = null;

  function manifestWorld() { try { return window.TitanWorlds && window.TitanWorlds.byId ? window.TitanWorlds.byId(atmo) : null; } catch (e) { return null; } }
  function pick() {
    var mw = manifestWorld();
    if (!world && mw && mw.fx && !(sceneName && sceneAtmo === atmo)) return [mw.fx, mw.fxIntensity == null ? 0.8 : mw.fxIntensity];   // a World manifest's own fx wins over the table
    if (world && world.fx) return [world.fx, world.intensity == null ? 0.8 : world.intensity];
    if (sceneName && SCENE[sceneName] && sceneAtmo === atmo) return SCENE[sceneName];
    return ATMO[atmo] || ["fog", 0.5];
  }
  function apply() {
    var m = pick();
    if (!m[0]) { if (FX.state().playing) FX.stop(1); return; }
    var mw = manifestWorld(), vid = (world && world.video) || (mw && mw.fxVideo) || VIDEO[atmo] || null;
    FX.play(m[0], { intensity: m[1], video: vid });
  }
  window.addEventListener("titan:atmo", function (e) {
    atmo = (e.detail && e.detail.atmo) || atmo;
    if (sceneAtmo && sceneAtmo !== atmo) { sceneName = null; sceneAtmo = null; }
    apply();
  });
  /* a sound scene's effect waits until its first sounds are running: compiling an effect while the recordings decode made the sound
     stutter at the start on phones (owner 2026-10-08) */
  var genT = 0;
  window.addEventListener("titan:gen", function (e) {
    var d = e.detail || {};
    clearTimeout(genT);
    if (d.type === "play" && d.playing && d.name && SCENE[d.name]) { sceneName = d.name; sceneAtmo = atmo; genT = setTimeout(apply, 1800); }
    else if (d.type === "stop" && sceneName) { sceneName = null; sceneAtmo = null; genT = setTimeout(apply, 600); }
  });
  function boot() { if (FX.supported) apply(); }
  if (document.readyState === "complete") setTimeout(boot, 0); else window.addEventListener("load", function () { setTimeout(boot, 50); });

  /* ---------- Settings control ---------- */
  function mount(sheet) {
    if (!sheet || !FX.supported) return;
    var anchor = sheet.querySelector("#ss-motion");
    var host = anchor ? anchor.closest(".in") : sheet.querySelector(".ss-card");
    if (!host) return;
    if (anchor) { var lbl = anchor.closest("label"); if (lbl) lbl.hidden = true; }   // the old 2D-canvas switch is replaced by this control
    var st = FX.state();
    var box = document.createElement("div");
    box.className = "ss-fx";
    box.innerHTML =
      '<div class="ss-fx-h" id="ss-fx-lbl">Effects (rain, snow, fire, light)</div>' +
      '<div class="ss-chips" role="radiogroup" aria-labelledby="ss-fx-lbl">' +
      ["off", "subtle", "full"].map(function (l) { return '<button type="button" class="ss-chip" role="radio" data-fx-level="' + l + '" aria-checked="' + (st.level === l) + '">' + l[0].toUpperCase() + l.slice(1) + "</button>"; }).join("") +
      "</div>" +
      '<div class="ss-row"><span>Strength</span><input type="range" id="ss-fx-int" min="0.1" max="1" step="0.05" aria-label="Effects strength"></div>' +
      '<p class="ss-note">Full adds film grain and vignette. Effects pause when the app is in the background, sound does not.</p>';
    host.insertBefore(box, host.firstChild);
    var rng = box.querySelector("#ss-fx-int"); rng.value = st.intensity;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-fx-level]"); if (!b) return;
      FX.setLevel(b.dataset.fxLevel);
      box.querySelectorAll("[data-fx-level]").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
    });
    rng.addEventListener("input", function () { FX.setIntensity(+rng.value); });
  }

  window.TitanFXUI = { mount: mount, setWorld: function (w) { world = w || null; apply(); }, map: { atmo: ATMO, scene: SCENE }, apply: apply };
})();
