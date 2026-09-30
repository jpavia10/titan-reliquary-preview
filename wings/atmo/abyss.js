/* Atmosphere: Sunken Treasury (abyss). Crest + picker copy only.
   Crest: a wreck anchor inside a beaded coin rim, three rising bubbles and a sonar arc.
   200x200, currentColor only (fill/stroke + opacity), no scripts, no external refs. */
(function () {
  "use strict";
  var CREST =
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 7.2" opacity="0.7"/>' +
    '<path d="M44 58 A66 66 0 0 1 82 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>' +
    '<path d="M52 66 A54 54 0 0 1 80 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/>' +
    '<circle cx="100" cy="46" r="10" fill="none" stroke="currentColor" stroke-width="4.5"/>' +
    '<path d="M100 56 V156" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M74 74 H126" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="72" cy="74" r="4" fill="currentColor"/><circle cx="128" cy="74" r="4" fill="currentColor"/>' +
    '<path d="M56 118 Q60 152 100 157 Q140 152 144 118" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round"/>' +
    '<path d="M44 124 L56 106 L66 126 Z" fill="currentColor"/>' +
    '<path d="M156 124 L144 106 L134 126 Z" fill="currentColor"/>' +
    '<circle cx="100" cy="100" r="16" fill="currentColor" opacity="0.18"/>' +
    '<circle cx="100" cy="100" r="16" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>' +
    '<circle cx="140" cy="58" r="5" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="150" cy="40" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.8"/>' +
    '<circle cx="136" cy="30" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>' +
    '<path d="M64 168 Q73 162 82 168 T100 168 T118 168 T136 168" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>';

  if (window.TitanAtmoCrest) window.TitanAtmoCrest("abyss", CREST);
  else if (window.TitanAtmo && window.TitanAtmo.defineCrest) window.TitanAtmo.defineCrest("abyss", CREST);

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("abyss", {
      name: "Sunken Treasury",
      desc: "Forty fathoms down. Cold light through black water, brass glinting in the wreck. Every coin a survivor."
    });
  }
})();
