/* ============================================================================
   Atmosphere: DYNASTY (dynasty)
   Identity: Imperial court. Cinnabar lacquer walls, 24-karat gold foil emboss,
   ice-crack window lattices, and ancient cash coin seals.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Octagonal Imperial Fret Border (Ba Gua & Fretwork) */
    '<polygon points="100,16 159,41 184,100 159,159 100,184 41,159 16,100 41,41" fill="none" stroke="currentColor" stroke-width="2.8"/>' +
    '<polygon points="100,24 153,46 176,100 153,154 100,176 47,154 24,100 47,46" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.5"/>' +
    /* Imperial Pagoda Pavilion Roof with Sweeping Eaves */
    '<path d="M100 36 L124 54 Q154 56 166 64 L160 68 Q136 60 114 58 L100 68 L86 58 Q64 60 40 68 L34 64 Q46 56 76 54 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M100 28 L100 36 M94 30 H106" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    /* Lower Pavilion Tier Eaves */
    '<path d="M100 68 L130 82 Q164 84 176 94 L170 98 Q144 88 116 86 L100 94 L84 86 Q56 88 30 98 L24 94 Q36 84 70 82 Z" fill="currentColor" opacity="0.75"/>' +
    /* Ancient Chinese Cash Coin (Round with Square Hole: 天圆地方) */
    '<circle cx="100" cy="132" r="38" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="100" cy="132" r="34" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>' +
    '<rect x="88" y="120" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6"/>' +
    /* Four Auspicious Inscription Bars (representing the 4 dynastic characters) */
    '<line x1="100" y1="98" x2="100" y2="114" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>' +
    '<line x1="100" y1="150" x2="100" y2="166" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>' +
    '<line x1="66" y1="132" x2="82" y2="132" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>' +
    '<line x1="118" y1="132" x2="134" y2="132" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>' +
    /* Swirling Auspicious Cloud Scrolls (Xiangyun 祥云) */
    '<path d="M48 108 Q58 100 66 106 Q72 112 68 120 Q62 124 54 120" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.65"/>' +
    '<path d="M152 108 Q142 100 134 106 Q128 112 132 120 Q138 124 146 120" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.65"/>' +
    /* Corner Jade Studs */
    '<circle cx="41" cy="41" r="3" fill="currentColor"/><circle cx="159" cy="41" r="3" fill="currentColor"/>' +
    '<circle cx="41" cy="159" r="3" fill="currentColor"/><circle cx="159" cy="159" r="3" fill="currentColor"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("dynasty", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("dynasty", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("dynasty", {
      name: "Dynasty",
      desc: "Imperial court. Cinnabar lacquer walls, 24-karat gold foil emboss, ice-crack window lattices, and ancient cash coin seals.",
      pair: "Pairs with · Traditional Flute + Palace Bells"
    });
  }
})();
