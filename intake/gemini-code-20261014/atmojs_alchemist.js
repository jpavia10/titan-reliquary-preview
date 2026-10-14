/* ============================================================================
   Atmosphere: THE ALCHEMIST (alchemist)
   Identity: Renaissance transmutation laboratory. Vitriol-green plates,
   lead-white parchment ink, gold leaf accent, and hermetic ouroboros.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Circular Laboratory Boundary Ring with Degree Ticks */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.55"/>' +
    /* Hermetic Ouroboros (Serpent Swallowing Its Tail) */
    '<circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="420 50" transform="rotate(-70 100 100)"/>' +
    /* Serpent Head with Geometric EvenOdd Eye Knockout */
    '<path d="M120 16 Q133 13 138 21 Q131 29 119 22 Z M131 20 A2.2 2.2 0 1 0 135.4 20 A2.2 2.2 0 1 0 131 20 Z" fill="currentColor" fill-rule="evenodd"/>' +
    '<path d="M74 21 L64 26" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
    /* Sacred Geometry of the Philosopher's Stone: Circle > Triangle > Square > Circle */
    '<circle cx="100" cy="100" r="58" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.8" opacity="0.75"/>' +
    /* Equilateral Triangle of Elemental Fire/Sulfur */
    '<polygon points="100,42 150.2,129 49.8,129" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    /* Geometric Quadrature of the Circle (Square of Salt / Earth) */
    '<rect x="71" y="80" width="58" height="49" fill="none" stroke="currentColor" stroke-width="2"/>' +
    /* Hermetic Crucible / Alembic Vessel in Center */
    '<path d="M92 90 H108 L114 104 Q114 116 100 116 Q86 116 86 104 Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>' +
    /* Central Transmuted Seed / Philosophical Gold Core */
    '<circle cx="100" cy="105" r="5" fill="currentColor"/>' +
    '<circle cx="100" cy="105" r="9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.8"/>' +
    /* Alchemical Planetary Symbols (Sun, Moon, Mercury) */
    '<path d="M42 96 Q46 100 42 104 M45 94 Q51 100 45 106" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.6"/>' +
    '<path d="M158 96 Q154 100 158 104 M155 94 Q149 100 155 106" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.6"/>' +
    '<circle cx="100" cy="164" r="3" fill="currentColor"/>' +
    '<path d="M100 156 V172 M92 164 H108" stroke="currentColor" stroke-width="1.6" opacity="0.7"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("alchemist", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("alchemist", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("alchemist", {
      name: "The Alchemist",
      desc: "Renaissance transmutation laboratory. Bottle-green vitriol plates, lead-white manuscript ink, gold leaf foil, and hermetic sacred geometry.",
      pair: "Pairs with · Glass Alembic + Distant Thunder"
    });
  }
})();
