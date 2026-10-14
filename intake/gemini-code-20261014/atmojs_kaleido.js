/* Atmosphere: KALEIDOSCOPE (kaleido)
   Identity: Brewster's cabinet. Brass eyepiece, six mirrors, and jewel glass.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md */
(function () {
  "use strict";

  var CREST =
    '<circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>' +
    '<circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.45"/>' +
    '<polygon points="100,100 100,30 160.62,65" fill="currentColor" opacity="0.25"/>' +
    '<polygon points="100,100 160.62,65 160.62,135" fill="currentColor" opacity="0.10"/>' +
    '<polygon points="100,100 160.62,135 100,170" fill="currentColor" opacity="0.20"/>' +
    '<polygon points="100,100 100,170 39.38,135" fill="currentColor" opacity="0.10"/>' +
    '<polygon points="100,100 39.38,135 39.38,65" fill="currentColor" opacity="0.25"/>' +
    '<polygon points="100,100 39.38,65 100,30" fill="currentColor" opacity="0.10"/>' +
    '<polygon points="100,30 160.62,65 160.62,135 100,170 39.38,135 39.38,65" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.75"/>' +
    '<path d="M100 100 V30 M100 100 L160.62 65 M100 100 L160.62 135 M100 100 V170 M100 100 L39.38 135 M100 100 L39.38 65" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>' +
    '<polygon points="128,46.5 133,51.5 128,56.5 123,51.5" fill="currentColor" opacity="0.75"/>' +
    '<polygon points="156,95 161,100 156,105 151,100" fill="currentColor" opacity="0.75"/>' +
    '<polygon points="128,143.5 133,148.5 128,153.5 123,148.5" fill="currentColor" opacity="0.75"/>' +
    '<polygon points="72,143.5 77,148.5 72,153.5 67,148.5" fill="currentColor" opacity="0.75"/>' +
    '<polygon points="44,95 49,100 44,105 39,100" fill="currentColor" opacity="0.75"/>' +
    '<polygon points="72,46.5 77,51.5 72,56.5 67,51.5" fill="currentColor" opacity="0.75"/>' +
    '<polygon points="100,60 134.64,80 134.64,120 100,140 65.36,120 65.36,80" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.6"/>' +
    '<polygon points="100,72 124.25,114 75.75,114" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.2"/>' +
    '<polygon points="124.25,86 100,128 75.75,86" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.2"/>' +
    '<circle cx="100" cy="100" r="9" fill="currentColor" opacity="0.85"/>' +
    '<circle cx="100" cy="100" r="4" fill="currentColor"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("kaleido", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("kaleido", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("kaleido", {
      name: "Kaleidoscope",
      desc: "Brewster's cabinet. A brass eyepiece, six mirrors, and chips of jewel glass held still against dark aubergine. Sharp facets, no blur, nothing moving.",
      pair: "Pairs with · Singing Bowl + Psych Voyage"
    });
  }
})();
