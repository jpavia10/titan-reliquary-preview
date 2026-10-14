/* ============================================================================
   Atmosphere: THE CONSTRUCT (construct)
   Identity: Green-phosphor terminal. Pure black CRT void, glowing monospace
   phosphor, inverse-video selection, and wireframe hypercube matrix.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer CRT Terminal Frame & Bezel */
    '<rect x="20" y="20" width="160" height="160" rx="14" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<rect x="28" y="28" width="144" height="144" rx="8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.45"/>' +
    /* Corner Alignment Crosshairs */
    '<path d="M12 20 H28 M20 12 V28 M172 20 H188 M180 12 V28 M12 180 H28 M20 172 V188 M172 180 H188 M180 172 V188" stroke="currentColor" stroke-width="1.6" opacity="0.65"/>' +
    /* Circuit Bus Traces from Bezel to Core */
    '<path d="M32 100 H56 M144 100 H168 M100 32 V56 M100 144 V168" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="56" cy="100" r="3" fill="currentColor"/><circle cx="144" cy="100" r="3" fill="currentColor"/>' +
    '<circle cx="100" cy="56" r="3" fill="currentColor"/><circle cx="100" cy="144" r="3" fill="currentColor"/>' +
    /* Isometric Wireframe Hypercube (Tesseract / Matrix Matrix) */
    /* Outer Isometric Cube */
    '<polygon points="100,56 138,78 138,122 100,144 62,122 62,78" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M100 56 V144 M100 100 L138 78 M100 100 L62 78 M100 100 L100 144 M100 100 L138 122 M100 100 L62 122" stroke="currentColor" stroke-width="1.8" opacity="0.7"/>' +
    /* Inner Floating Core Cube */
    '<polygon points="100,78 119,89 119,111 100,122 81,111 81,89" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.6"/>' +
    /* Terminal Prompt Brackets and Cursor [ >_ ] */
    '<path d="M42 66 H36 V134 H42 M158 66 H164 V134 H158" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" opacity="0.8"/>' +
    '<path d="M72 44 L80 49 L72 54" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<line x1="84" y1="54" x2="94" y2="54" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>' +
    /* Scanline Raster Grate Accents */
    '<line x1="68" y1="154" x2="132" y2="154" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.5"/>' +
    '<line x1="74" y1="160" x2="126" y2="160" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.4"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("construct", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("construct", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("construct", {
      name: "The Construct",
      desc: "Green-phosphor CRT terminal. Pure black void, glowing monospace phosphor, inverse-video blocks, and digital matrix surveillance.",
      pair: "Pairs with · Computer Room + Data Stream"
    });
  }
})();
