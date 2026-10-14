/* ============================================================================
   Atmosphere: CLAY DIORAMA (diorama)
   Identity: A miniature vault in soft clay, seen from above like a toy model.
   Isometric plinth, stacked clay tokens, soft rounded archway, and pastels.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Soft Rounded Clay Coin Boundary */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="3.2"/>' +
    '<circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>' +
    /* Miniature Isometric Clay Vault Plinth (Top Face) */
    '<polygon points="100,48 148,74 100,100 52,74" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' +
    /* Left Face */
    '<polygon points="52,74 100,100 100,154 52,128" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' +
    /* Right Face */
    '<polygon points="100,100 148,74 148,128 100,154" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' +
    /* Sculpted Miniature Vault Door (Rounded Archway on Left Face) */
    '<path d="M68 124 V100 Q78 94 88 100 V124 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="84" cy="112" r="2.2" fill="currentColor"/>' +
    /* Stacked Rounded Clay Coin Tokens (Right Forefront) */
    '<ellipse cx="140" cy="136" rx="18" ry="8" fill="currentColor" fill-opacity="0.4" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M122 136 V144 Q140 152 158 144 V136" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<ellipse cx="140" cy="144" rx="18" ry="8" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>' +
    '<path d="M122 144 V152 Q140 160 158 152 V144" fill="none" stroke="currentColor" stroke-width="2"/>' +
    /* Soft Clay Spheres (Scattered around model) */
    '<circle cx="56" cy="154" r="8" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="53" cy="151" r="2.5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"/>' +
    '<circle cx="100" cy="168" r="6" fill="currentColor" fill-opacity="0.4" stroke="currentColor" stroke-width="1.6"/>' +
    '<circle cx="146" cy="62" r="7" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.8"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("diorama", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("diorama", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("diorama", {
      name: "Clay Diorama",
      desc: "A miniature vault in soft clay, seen from above like a toy model. Isometric and pastel.",
      pair: "Pairs with · Birds and Stream + Lo-fi"
    });
  }
})();
