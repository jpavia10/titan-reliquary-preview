/* ============================================================================
   Atmosphere: THE CONSERVATOR (conservator)
   Identity: Archival curator's desk by a north window. Precision brass loupe,
   vernier calipers, laid paper, iron-gall ledger ink, and museum conservation.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Precision Millimeter Graticule Outer Ring */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.6"/>' +
    /* Ledger Document Binding Ribbon / Parchment Leaves */
    '<path d="M42 162 C42 152 64 146 100 146 C136 146 158 152 158 162" fill="none" stroke="currentColor" stroke-width="2.2" opacity="0.7"/>' +
    '<path d="M48 168 C48 158 70 152 100 152 C130 152 152 158 152 168" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.5"/>' +
    /* Precision Brass Magnifying Loupe Lens */
    '<circle cx="86" cy="82" r="42" fill="currentColor" opacity="0.12"/>' +
    '<circle cx="86" cy="82" r="42" fill="none" stroke="currentColor" stroke-width="3.5"/>' +
    '<circle cx="86" cy="82" r="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.65"/>' +
    /* Loupe Brass Handle angled downward to right */
    '<path d="M116 112 L158 154 L152 160 L110 118 Z" fill="currentColor" opacity="0.85"/>' +
    '<circle cx="155" cy="157" r="4" fill="currentColor"/>' +
    '<line x1="124" y1="120" x2="120" y2="124" stroke="currentColor" stroke-width="2" opacity="0.7"/>' +
    '<line x1="134" y1="130" x2="130" y2="134" stroke="currentColor" stroke-width="2" opacity="0.7"/>' +
    '<line x1="144" y1="140" x2="140" y2="144" stroke="currentColor" stroke-width="2" opacity="0.7"/>' +
    /* Reticle / Optical Crosshairs inside Loupe Lens */
    '<line x1="86" y1="46" x2="86" y2="118" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 2" opacity="0.55"/>' +
    '<line x1="50" y1="82" x2="122" y2="82" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 2" opacity="0.55"/>' +
    '<circle cx="86" cy="82" r="14" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.8"/>' +
    '<circle cx="86" cy="82" r="5" fill="currentColor" opacity="0.3"/>' +
    '<circle cx="86" cy="82" r="2" fill="currentColor"/>' +
    /* Vernier Calipers Jaws at top */
    '<path d="M46 36 H148 V42 H46 Z" fill="currentColor" opacity="0.75"/>' +
    '<path d="M58 42 V64 L66 60 V42 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M114 42 V64 L106 60 V42 Z" fill="currentColor" opacity="0.85"/>' +
    /* Caliper Measurement Tick Marks */
    '<path d="M70 36 V40 M76 36 V41 M82 36 V40 M88 36 V41 M94 36 V40 M100 36 V42 M106 36 V40" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>' +
    /* Curator\'s Archival Seal Watermark */
    '<path d="M152 56 Q162 46 172 56 Q182 66 172 76 Q162 86 152 76 Q142 66 152 56 Z" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>' +
    '<circle cx="162" cy="66" r="3.5" fill="currentColor" opacity="0.6"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("conservator", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("conservator", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("conservator", {
      name: "The Conservator",
      desc: "Archival curator's desk illuminated by a north window. Tea-stained laid paper, iron-gall ledger entries, precision brass loupes, and museum-grade coin conservation.",
      pair: "Pairs with · Library Rain + Vellum Study"
    });
  }
})();
