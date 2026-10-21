/* fx/themes.js: which shared effects each theme uses, and how (Grok theme-rebuild worker). Keyed by the registry id
   (wings/themes/manifest.js); comments name the theme by its display name. Every entry is a stack drawn back to front. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var T = K.themes;
  /* Neon Vault (neon): a rain-slick neon-noir street at 2 a.m. Tubes on a facade buzz and flicker, their light smears down the wet
     asphalt, rain rings break the puddles, fog drifts through lit by the signs, rain falls in two depths; touch = a lit splash. */
  T.neon = { stack: [
    { mod: "atmos", top: [.035, .02, .07], bottom: [.01, .008, .02], signs: 1, wet: 1.1, horizon: .34, rain: 1,
      signC: [[1, .22, .66], [.15, .88, 1], [.62, .35, 1], [1, .62, .2]], fog: .55, fogC: [.06, .045, .1], vig: .65, grain: .035, touchGlow: .7, touchC: [.3, .9, 1] },
    { mod: "particles", count: .12, shape: "streak", size: 9, gravity: 1.25, drift: [-.12, 0], curl: .3, scale: 1, speed: .1, life: .5, spawn: "top",
      c1: [.55, .75, 1], c2: [1, .5, .85], alpha: .11, blend: "add", depth: .9, rake: .2 },
    { mod: "particles", count: .02, shape: "mote", size: 5, gravity: .02, curl: 1, scale: 1.5, speed: .03, life: .05,
      c1: [.2, .9, 1], c2: [1, .3, .7], alpha: .25, blend: "add", depth: 1, glint: .5 }
  ] };
})();
/* "fxk": an empty TitanFX preset for themes whose whole scene is drawn by TitanFXK (the registry needs every theme's fx to exist).
   It paints nothing and holds still, so the engine's overlay costs ~nothing on top of the fx/ scene. */
document.addEventListener("DOMContentLoaded", function () {
  var FX = window.TitanFX; if (FX && FX.register && !(FX.presets && FX.presets().indexOf("fxk") >= 0))
    FX.register("fxk", { layer: "back", still: 1, safe: 1, fps: 1, glsl: "", passes: [{ frag: "vec4 fx(vec2 fc){ return vec4(0.); }" }] });
});
