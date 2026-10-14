/* ============================================================================
   Atmosphere: GILDED ARMORY (valhalla)
   Identity: Norse hoard hall, forged Nordic gold, Valknut sacred knot,
   twin dragon ship prows, iron-bound riveted ring, and bog-oak hearth glow.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Iron-bound Runic Ring with Rivets */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 6" opacity="0.6"/>' +
    /* 8 Iron Rivets along the Rim */
    '<circle cx="100" cy="14" r="3.5" fill="currentColor"/><circle cx="100" cy="186" r="3.5" fill="currentColor"/>' +
    '<circle cx="14" cy="100" r="3.5" fill="currentColor"/><circle cx="186" cy="100" r="3.5" fill="currentColor"/>' +
    '<circle cx="39" cy="39" r="3" fill="currentColor"/><circle cx="161" cy="161" r="3" fill="currentColor"/>' +
    '<circle cx="39" cy="161" r="3" fill="currentColor"/><circle cx="161" cy="39" r="3" fill="currentColor"/>' +
    /* Twin Viking Drakkar Dragon Ship Prows */
    '<path d="M42 152 Q32 110 46 74 Q56 50 78 40 Q74 54 62 70 Q48 94 56 142 Z" fill="currentColor" opacity="0.75"/>' +
    '<path d="M158 152 Q168 110 154 74 Q144 50 122 40 Q126 54 138 70 Q152 94 144 142 Z" fill="currentColor" opacity="0.75"/>' +
    /* Dragon Head Horns / Crests */
    '<path d="M78 40 Q88 32 92 24 Q82 34 74 38 Z" fill="currentColor"/>' +
    '<path d="M122 40 Q112 32 108 24 Q118 34 126 38 Z" fill="currentColor"/>' +
    /* Central Valknut (Three Interlocking Triangles) */
    '<polygon points="100,52 128,100 72,100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" opacity="0.9"/>' +
    '<polygon points="76,80 104,128 48,128" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" opacity="0.85"/>' +
    '<polygon points="124,80 152,128 96,128" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" opacity="0.85"/>' +
    /* Inner Knots & Shading */
    '<polygon points="100,64 118,94 82,94" fill="currentColor" opacity="0.22"/>' +
    '<polygon points="84,88 100,116 68,116" fill="currentColor" opacity="0.22"/>' +
    '<polygon points="116,88 132,116 100,116" fill="currentColor" opacity="0.22"/>' +
    /* Norse Shield Boss Core */
    '<circle cx="100" cy="100" r="16" fill="currentColor" opacity="0.3"/>' +
    '<circle cx="100" cy="100" r="16" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<circle cx="100" cy="100" r="8" fill="currentColor" opacity="0.85"/>' +
    '<circle cx="100" cy="100" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    /* Base Hearth Flame Swirls */
    '<path d="M68 158 Q84 146 100 158 Q116 146 132 158 Q144 148 152 156" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>' +
    '<path d="M80 168 Q100 156 120 168" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("valhalla", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("valhalla", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("valhalla", {
      name: "Gilded Armory",
      desc: "Viking hoard hall lit by iron hearth-fires. Bog-oak timber, forged Nordic gold, hack-silver bullion, and guardian runic knotwork.",
      pair: "Pairs with · Foundry + Five Armies"
    });
  }
})();
