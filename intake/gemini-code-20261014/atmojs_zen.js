/* ============================================================================
   Atmosphere: ZEN GARDEN (zen)
   Identity: Karesansui monastery, unclosed ensō brushwork, raked gravel
   ripples, bamboo culm ring, balanced stones, and serene ink wash restraint.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Flowing Brush Ensō (tapered calligraphic circle with opening at upper right) */
    '<path d="M100 18 C148 18 184 54 184 100 C184 146 146 182 100 182 C52 182 16 144 16 100 C16 62 42 30 76 20 C82 18 88 23 88 29 C88 35 83 40 78 42 C54 49 36 72 36 100 C36 134 65 162 100 162 C135 162 164 133 164 100 C164 66 137 38 102 38 C96 38 91 33 91 27 C91 21 96 18 100 18 Z" fill="currentColor" opacity="0.82"/>' +
    /* Bamboo Outer Frame (segments and nodes) */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="48 8" opacity="0.55"/>' +
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="4 52" opacity="0.75"/>' +
    /* Bamboo Leaf Sprigs at Perimeter */
    '<path d="M174 72 Q188 64 194 70 Q182 76 174 72 Z M170 82 Q186 78 192 86 Q178 90 170 82 Z" fill="currentColor" opacity="0.6"/>' +
    '<path d="M26 128 Q12 136 6 130 Q18 124 26 128 Z M30 118 Q14 122 8 114 Q22 110 30 118 Z" fill="currentColor" opacity="0.6"/>' +
    /* Raked Gravel Ripples (Karesansui Sand Waves) */
    '<path d="M52 112 C64 96 82 88 100 88 C118 88 136 96 148 112" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>' +
    '<path d="M42 122 C58 102 78 94 100 94 C122 94 142 102 158 122" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/>' +
    '<path d="M34 132 C54 108 76 100 100 100 C124 100 146 108 166 132" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"/>' +
    '<path d="M56 144 H144 M48 152 H152 M62 160 H138" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.35"/>' +
    /* Balanced Three River Stones */
    '<ellipse cx="100" cy="116" rx="22" ry="14" fill="currentColor" opacity="0.35"/>' +
    '<ellipse cx="100" cy="116" rx="22" ry="14" fill="none" stroke="currentColor" stroke-width="2.2" opacity="0.9"/>' +
    '<ellipse cx="82" cy="122" rx="14" ry="10" fill="currentColor" opacity="0.5"/>' +
    '<ellipse cx="82" cy="122" rx="14" ry="10" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.85"/>' +
    '<ellipse cx="118" cy="120" rx="16" ry="11" fill="currentColor" opacity="0.5"/>' +
    '<ellipse cx="118" cy="120" rx="16" ry="11" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.85"/>' +
    '<circle cx="100" cy="113" r="5" fill="currentColor" opacity="0.85"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("zen", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("zen", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("zen", {
      name: "Zen Garden",
      desc: "Karesansui monastery at twilight. Raked slate gravel, unclosed ensō brushwork, quiet moss accents, and contemplative numismatic focus.",
      pair: "Pairs with · Bamboo Clack + Shakuhachi Flute"
    });
  }
})();
