/* fx/themes.js: which shared effects each theme uses, and how (Grok theme-rebuild worker). Keyed by the registry id
   (wings/themes/manifest.js); comments name the theme by its display name. Every entry is a stack drawn back to front. */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var T = K.themes;
  /* Neon Vault (neon) is its own world now: fx/neon.js (the stage library), loaded with the theme. */
})();
/* "fxk": an empty TitanFX preset for themes whose whole scene is drawn by TitanFXK (the registry needs every theme's fx to exist).
   It paints nothing and holds still, so the engine's overlay costs ~nothing on top of the fx/ scene. */
document.addEventListener("DOMContentLoaded", function () {
  var FX = window.TitanFX; if (FX && FX.register && !(FX.presets && FX.presets().indexOf("fxk") >= 0))
    FX.register("fxk", { layer: "back", still: 1, safe: 1, fps: 1, glsl: "", passes: [{ frag: "vec4 fx(vec2 fc){ return vec4(0.); }" }] });
});
