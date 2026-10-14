/* ============================================================================
   Atmosphere: BAUHAUS (bauhaus)
   Identity: Primary shapes and moving type: the coin legends as a 1920s Bauhaus poster.
   Circle, square, triangle, diagonal typographic axis, off-white and bold ink structure.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Circular Coin Rim with Geometric Precision */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="3.6"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6"/>' +
    /* Fundamental Square (Constructivist Matrix) */
    '<rect x="62" y="62" width="76" height="76" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2.6"/>' +
    /* Overlapping Equilateral Triangle */
    '<polygon points="100,28 156,126 44,126" fill="none" stroke="currentColor" stroke-width="2.4" opacity="0.8"/>' +
    /* Concentric Center Circle */
    '<circle cx="100" cy="100" r="28" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2.8"/>' +
    /* Dynamic Diagonal Axis Line (Typographic Horizon) */
    '<line x1="28" y1="172" x2="172" y2="28" stroke="currentColor" stroke-width="2.4" opacity="0.7"/>' +
    /* Typographic Block Elements (Constructivist Numismatic Legends) */
    '<rect x="76" y="148" width="48" height="6" fill="currentColor" opacity="0.9"/>' +
    '<rect x="88" y="158" width="24" height="4" fill="currentColor" opacity="0.6"/>' +
    '<rect x="36" y="96" width="18" height="8" fill="currentColor" opacity="0.85"/>' +
    '<rect x="146" y="96" width="18" height="8" fill="currentColor" opacity="0.85"/>' +
    /* Balanced Focal Nodes */
    '<circle cx="100" cy="100" r="7" fill="currentColor"/>' +
    '<circle cx="62" cy="62" r="4.5" fill="currentColor"/>' +
    '<circle cx="138" cy="62" r="4.5" fill="currentColor"/>' +
    '<circle cx="100" cy="46" r="4.5" fill="currentColor"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("bauhaus", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("bauhaus", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("bauhaus", {
      name: "Bauhaus",
      desc: "Primary shapes and moving type: the coin legends as a 1920s Bauhaus poster.",
      pair: "Pairs with · Studio + Classical"
    });
  }
})();
