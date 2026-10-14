/* ============================================================================
   Atmosphere: AEGEAN ODYSSEY (odyssey)
   Identity: Nocturnal voyage on deep lapis waters, classical trireme galley,
   sacred olive wreath, swelling Mediterranean waves, and Corinthian bronze.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Beaded Coin Rim */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3.5" opacity="0.65"/>' +
    /* Olive Wreath Branches (Sacred Athenian Wreath) */
    '<path d="M42 148 C22 118 24 74 52 46 C60 38 72 32 82 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>' +
    '<path d="M158 148 C178 118 176 74 148 46 C140 38 128 32 118 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>' +
    /* Olive Leaves */
    '<path d="M38 114 Q28 108 30 98 Q40 106 38 114 Z M48 88 Q40 80 44 70 Q52 80 48 88 Z M64 64 Q58 54 64 46 Q70 56 64 64 Z M80 44 Q76 34 84 28 Q88 38 80 44 Z" fill="currentColor" opacity="0.7"/>' +
    '<path d="M162 114 Q172 108 170 98 Q160 106 162 114 Z M152 88 Q160 80 156 70 Q148 80 152 88 Z M136 64 Q142 54 136 46 Q130 56 136 64 Z M120 44 Q124 34 116 28 Q112 38 120 44 Z" fill="currentColor" opacity="0.7"/>' +
    /* Ancient Galley (Trireme / Bireme) Hull & Recurved Stern / Ram */
    '<path d="M48 118 C62 136 138 136 152 118 L158 106 L42 106 Z" fill="currentColor" opacity="0.4"/>' +
    '<path d="M48 118 C62 136 138 136 152 118 L158 106 L42 106 Z" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<path d="M42 106 L34 98 Q36 86 46 84 L48 106 Z" fill="currentColor" opacity="0.8"/>' +
    '<path d="M152 118 L168 122 L158 106 Z" fill="currentColor" opacity="0.9"/>' +
    /* Ophthalmos (Protective Eye of Apollo on the Bow) */
    '<ellipse cx="144" cy="112" rx="4" ry="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
    '<circle cx="144" cy="112" r="1.2" fill="currentColor"/>' +
    /* Mast & Yardarm & Furled Sails */
    '<path d="M100 52 V106" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M74 64 H126" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M76 64 Q100 78 124 64" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.6"/>' +
    /* Greek Galley Oars in Unison */
    '<path d="M58 118 L50 134 M72 120 L64 136 M86 121 L78 137 M100 121 L92 137 M114 120 L106 136 M128 119 L120 135 M142 117 L134 133" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.65"/>' +
    /* Aegean Wave Swell Curves */
    '<path d="M28 144 Q44 134 60 144 T92 144 T124 144 T156 144 T172 144" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>' +
    '<path d="M38 156 Q54 148 70 156 T102 156 T134 156 T162 156" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>' +
    /* 8-Point Navigation Star atop Mast */
    '<polygon points="100,34 102,42 110,44 102,46 100,54 98,46 90,44 98,42" fill="currentColor" opacity="0.9"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("odyssey", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("odyssey", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("odyssey", {
      name: "Odyssey",
      desc: "Aegean nocturnal voyage across lapis waters. Corinthian bronze instruments, olive wreaths, and maritime relics of the ancient Mediterranean.",
      pair: "Pairs with · Ocean Surf + Expeditionary"
    });
  }
})();
