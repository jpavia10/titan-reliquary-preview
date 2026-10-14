/* ============================================================================
   Atmosphere: PULP ADVENTURE (pulp)
   Identity: 1940s treasure-hunt comic. Newsprint cream, heavy ink outlines,
   comic red, Ben-Day dots, explosive POW starburst, and speed lines.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Heavy Comic Panel Outer Rim */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="4"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 4" opacity="0.6"/>' +
    /* Explosive Comic Action Starburst Bubble (POW / KAPOW Burst) */
    '<polygon points="100,24 112,48 136,36 138,62 164,58 156,84 180,94 164,112 182,130 158,138 164,164 138,158 134,182 112,168 100,188 88,168 66,182 62,158 36,164 42,138 18,130 36,112 20,94 44,84 36,58 62,62 64,36 88,48" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/>' +
    /* Ben-Day Dot Pattern Ring (Decorative Comic Halftone Simulation) */
    '<circle cx="100" cy="100" r="48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 6.2" opacity="0.7"/>' +
    /* Dynamic Action Speed Rays radiating from center */
    '<path d="M100 68 L100 52 M124 76 L142 62 M132 100 L148 100 M124 124 L142 138 M100 132 L100 148 M76 124 L58 138 M68 100 L52 100 M76 76 L58 62" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>' +
    /* Center Coin Treasure Skull & Crossbones / Medallion Lock */
    '<circle cx="100" cy="100" r="28" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="100" cy="100" r="22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.6"/>' +
    /* Keyhole / Adventure Seal */
    '<circle cx="100" cy="94" r="5" fill="currentColor"/>' +
    '<polygon points="98,94 102,94 105,108 95,108" fill="currentColor"/>' +
    /* Comic Soundwave Sparks */
    '<line x1="84" y1="36" x2="80" y2="28" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<line x1="116" y1="36" x2="120" y2="28" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<line x1="168" y1="80" x2="176" y2="76" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<line x1="32" y1="80" x2="24" y2="76" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("pulp", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("pulp", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("pulp", {
      name: "Pulp Adventure",
      desc: "A 1940s treasure-hunt comic: newsprint cream, black ink, Ben-Day dots and a POW on every find.",
      pair: "Pairs with · City Rain + Jazz"
    });
  }
})();
