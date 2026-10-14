/* ============================================================================
   Atmosphere: SILK ROAD OASIS (silkroad)
   Identity: Desert caravanserai under high desert starlight, lapis-lazuli night
   sky, sand-parchment ink, dune gold accents, and ancient trade routes.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Islamic 8-Point Star Rosette & Mihrab Lancet Arch */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3.5" opacity="0.5"/>' +
    '<polygon points="100,24 116,42 140,28 140,54 166,54 152,78 176,92 152,106 166,130 140,130 140,156 116,142 100,160 84,142 60,156 60,130 34,130 48,106 24,92 48,78 34,54 60,54 60,28 84,42" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.65"/>' +
    /* Central Mihrab Lancet Gateway */
    '<path d="M50 160 V106 C50 68 76 44 100 36 C124 44 150 68 150 106 V160 Z" fill="currentColor" opacity="0.16"/>' +
    '<path d="M50 160 V106 C50 68 76 44 100 36 C124 44 150 68 150 106 V160" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M58 160 V110 C58 76 80 54 100 46 C120 54 142 76 142 110 V160" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.55"/>' +
    /* Caravanserai Camel Silhouette */
    '<path d="M72 136 Q75 122 82 122 Q88 128 94 128 Q98 120 106 120 Q112 126 120 126 L122 136 Z" fill="currentColor" opacity="0.9"/>' +
    '<path d="M72 126 Q64 124 62 116 Q66 112 70 116 Z" fill="currentColor" opacity="0.9"/>' +
    '<path d="M76 136 V148 M86 136 V148 M108 136 V148 M118 136 V148" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    /* Desert Sand Dune Ridges */
    '<path d="M42 148 Q70 142 100 148 Q130 154 158 148" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M48 156 Q76 150 106 156 Q136 162 154 156" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>' +
    /* Desert Crescent Moon & Guide Star */
    '<path d="M96 58 C90 62 88 70 92 76 C96 82 104 84 110 80 C102 82 96 78 94 72 C92 66 94 60 96 58 Z" fill="currentColor" opacity="0.9"/>' +
    '<polygon points="106,64 107,67 110,68 107,69 106,72 105,69 102,68 105,67" fill="currentColor" opacity="0.95"/>' +
    /* Oasis Palm Fronds Framing the Arch */
    '<path d="M46 96 Q36 86 32 74 Q42 80 46 96 Z" fill="currentColor" opacity="0.65"/>' +
    '<path d="M48 102 Q34 100 28 90 Q38 96 48 102 Z" fill="currentColor" opacity="0.65"/>' +
    '<path d="M154 96 Q164 86 168 74 Q158 80 154 96 Z" fill="currentColor" opacity="0.65"/>' +
    '<path d="M152 102 Q166 100 172 90 Q162 96 152 102 Z" fill="currentColor" opacity="0.65"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("silkroad", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("silkroad", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("silkroad", {
      name: "Silk Road Oasis",
      desc: "Desert caravanserai under high desert starlight. Lapis-lazuli night sky, sand-parchment ink, dune gold accents, and ancient trade routes across the oasis.",
      pair: "Pairs with · Oud Melody + Desert Winds"
    });
  }
})();
