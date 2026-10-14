/* ============================================================================
   Atmosphere: SAMADHI (samadhi)
   Identity: Himalayan ashram at first light. Sandalwood dark, cream ink,
   pale apricot aura gold, blooming lotus mandala, and curling temple incense.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Beaded Meditation Mala Halo Ring */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="100" r="81" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="0.1 7.2" opacity="0.65"/>' +
    /* Concentric Aura Glow Circles */
    '<circle cx="100" cy="100" r="70" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.5"/>' +
    /* 8 Celestial Radiating Chakra Rays */
    '<path d="M100 18 V34 M100 166 V182 M18 100 H34 M166 100 H182 M42 42 L53 53 M147 147 L158 158 M158 42 L147 53 M42 158 L53 147" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>' +
    /* 8 Sacred Blooming Lotus Petals */
    '<path d="M100 38 Q112 62 100 78 Q88 62 100 38 Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M100 162 Q112 138 100 122 Q88 138 100 162 Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M38 100 Q62 112 78 100 Q62 88 38 100 Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M162 100 Q138 112 122 100 Q138 88 162 100 Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>' +
    /* Diagonal Interlocking Petals */
    '<path d="M56 56 Q78 68 76 86 Q64 80 56 56 Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M144 56 Q122 68 124 86 Q136 80 144 56 Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M56 144 Q78 132 76 114 Q64 120 56 144 Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M144 144 Q122 132 124 114 Q136 120 144 144 Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>' +
    /* Inner Sacred Sanctum & Central Bindu Node */
    '<circle cx="100" cy="100" r="22" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2.2"/>' +
    '<circle cx="100" cy="100" r="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2" opacity="0.8"/>' +
    '<circle cx="100" cy="100" r="6" fill="currentColor"/>' +
    /* Curling Incense Smoke Wisps Rising from Below */
    '<path d="M100 178 Q92 166 102 154 T100 134" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.65"/>' +
    '<path d="M92 176 Q86 166 94 156" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.45"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("samadhi", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("samadhi", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("samadhi", {
      name: "Samadhi",
      desc: "Himalayan ashram at first light. Sandalwood dark, pale apricot aura, blooming lotus mandala, and curling temple incense.",
      pair: "Pairs with · Singing Bowl + Morning Chants"
    });
  }
})();
