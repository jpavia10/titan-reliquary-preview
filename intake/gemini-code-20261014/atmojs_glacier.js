/* ============================================================================
   Atmosphere: GLACIER VAULT (glacier)
   Identity: Svalbard permafrost bullion reserve, sub-zero crystalline cyan,
   frost crystals, polar compass rose, and high-latitude coin preservation.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 4" opacity="0.45"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.75"/>' +
    '<circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1.5 5" stroke-linecap="round" opacity="0.6"/>' +
    /* Cardinal Compass Diamond Spokes */
    '<path d="M100 16 L104 68 L100 96 L96 68 Z M100 184 L104 132 L100 104 L96 132 Z M16 100 L68 96 L96 100 L68 104 Z M184 100 L132 96 L104 100 L132 104 Z" fill="currentColor" opacity="0.8"/>' +
    /* Intercardinal Diamond Spokes */
    '<path d="M41 41 L72 78 L97 97 L78 72 Z M159 41 L128 78 L103 97 L122 72 Z M41 159 L72 122 L97 103 L78 128 Z M159 159 L128 122 L103 103 L122 128 Z" fill="currentColor" opacity="0.65"/>' +
    /* Dendritic Snowflake Chevron Fractals */
    '<path d="M88 44 L100 56 L112 44 M88 156 L100 144 L112 156 M44 88 L56 100 L44 112 M156 88 L144 100 L156 112" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>' +
    '<path d="M91 32 L100 41 L109 32 M91 168 L100 159 L109 168 M32 91 L41 100 L32 109 M168 91 L159 100 L168 109" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>' +
    '<path d="M82 62 L100 76 L118 62 M82 138 L100 124 L118 138 M62 82 L76 100 L62 118 M138 82 L124 100 L138 118" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.65"/>' +
    /* Hexagonal Crystal Core */
    '<polygon points="100,76 117,83 124,100 117,117 100,124 83,117 76,100 83,83" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="100" cy="100" r="16" fill="currentColor" opacity="0.25"/>' +
    '<circle cx="100" cy="100" r="16" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    '<circle cx="100" cy="100" r="7.5" fill="currentColor" opacity="0.8"/>' +
    '<circle cx="100" cy="100" r="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.95"/>' +
    /* Polar Axis Registration Ticks */
    '<path d="M100 6 V14 M100 186 V194 M6 100 H14 M186 100 H194 M34 34 L39 39 M161 161 L166 166 M34 166 L39 161 M166 34 L161 39" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("glacier", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("glacier", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("glacier", {
      name: "Glacier Vault",
      desc: "Sub-zero Arctic bullion reserve carved into Svalbard bedrock. Glacial crystalline cyan, frost-sheened slate, and immaculate high-latitude coin preservation.",
      pair: "Pairs with · Storm + Cello Monolith"
    });
  }
})();
