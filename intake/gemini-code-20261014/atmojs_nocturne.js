/* ============================================================================
   Atmosphere: NOCTURNE STAGE (nocturne)
   Identity: Theatre proscenium in the dark, draped velvet curtains, antique
   brass footlights, celestial orchestral lyre, and programme-paper elegance.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Classical Proscenium Theatre Arch */
    '<ellipse cx="100" cy="100" rx="88" ry="86" fill="none" stroke="currentColor" stroke-width="2.6"/>' +
    '<ellipse cx="100" cy="100" rx="80" ry="78" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.5"/>' +
    /* Draped Velvet Stage Curtains (Symmetrical Swags) */
    '<path d="M22 36 Q60 52 72 108 Q52 104 36 96 Q24 72 22 36 Z" fill="currentColor" opacity="0.75"/>' +
    '<path d="M178 36 Q140 52 128 108 Q148 104 164 96 Q176 72 178 36 Z" fill="currentColor" opacity="0.75"/>' +
    /* Valance Swag across Top */
    '<path d="M22 36 Q60 58 100 48 Q140 58 178 36 Q146 30 100 32 Q54 30 22 36 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M22 36 Q60 58 100 48 Q140 58 178 36" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    /* Curtain Tie-Back Tassels */
    '<circle cx="68" cy="108" r="3" fill="currentColor"/><path d="M68 111 L64 126 H72 Z" fill="currentColor" opacity="0.8"/>' +
    '<circle cx="132" cy="108" r="3" fill="currentColor"/><path d="M132 111 L128 126 H136 Z" fill="currentColor" opacity="0.8"/>' +
    /* Celestial Music Lyre (Orchestra Pit Core) */
    '<path d="M78 88 Q70 126 86 142 Q100 152 114 142 Q130 126 122 88" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M72 84 Q80 82 84 90 Q76 96 72 84 Z M128 84 Q120 82 116 90 Q124 96 128 84 Z" fill="currentColor"/>' +
    '<path d="M76 94 H124" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M86 138 H114" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    /* Lyre Strings */
    '<line x1="88" y1="94" x2="88" y2="138" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>' +
    '<line x1="94" y1="94" x2="94" y2="140" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>' +
    '<line x1="100" y1="94" x2="100" y2="141" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>' +
    '<line x1="106" y1="94" x2="106" y2="140" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>' +
    '<line x1="112" y1="94" x2="112" y2="138" stroke="currentColor" stroke-width="1.2" opacity="0.75"/>' +
    /* Stage Rim Footlights (Row along Bottom Edge) */
    '<path d="M46 160 H154" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="58" cy="160" r="3.5" fill="currentColor"/><circle cx="79" cy="160" r="3.5" fill="currentColor"/>' +
    '<circle cx="100" cy="160" r="4" fill="currentColor"/><circle cx="121" cy="160" r="3.5" fill="currentColor"/>' +
    '<circle cx="142" cy="160" r="3.5" fill="currentColor"/>' +
    /* Night Constellation Stars above Proscenium */
    '<polygon points="100,16 102,22 108,24 102,26 100,32 98,26 92,24 98,22" fill="currentColor" opacity="0.9"/>' +
    '<circle cx="70" cy="24" r="1.6" fill="currentColor" opacity="0.7"/>' +
    '<circle cx="130" cy="24" r="1.6" fill="currentColor" opacity="0.7"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("nocturne", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("nocturne", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("nocturne", {
      name: "Nocturne Stage",
      desc: "An empty theatre stage after the finale. Draped velvet curtains, glowing antique brass footlights, an orchestral lyre, and star-haloed numismatic drama.",
      pair: "Pairs with · Solo Cello + Grand Hall Echo"
    });
  }
})();
