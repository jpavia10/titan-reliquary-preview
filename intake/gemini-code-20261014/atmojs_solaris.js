/* ============================================================================
   Atmosphere: SOLAR OBSERVATORY (solaris)
   Identity: High-altitude coronagraph station, solar flare coronal ring,
   orbital arcs, obsidian graphite dials, and warm solar amber prominences.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.8"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.6"/>' +
    /* Celestial Meridian & Orbital Arcs */
    '<ellipse cx="100" cy="100" rx="78" ry="36" fill="none" stroke="currentColor" stroke-width="1.8" transform="rotate(-28 100 100)" opacity="0.75"/>' +
    '<ellipse cx="100" cy="100" rx="78" ry="36" fill="none" stroke="currentColor" stroke-width="1.8" transform="rotate(38 100 100)" opacity="0.75"/>' +
    '<ellipse cx="100" cy="100" rx="84" ry="22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3" transform="rotate(78 100 100)" opacity="0.5"/>' +
    /* Coronal Ring & Prominence Loops */
    '<circle cx="100" cy="100" r="46" fill="none" stroke="currentColor" stroke-width="3" opacity="0.85"/>' +
    '<circle cx="100" cy="100" r="38" fill="currentColor" opacity="0.2"/>' +
    '<circle cx="100" cy="100" r="38" fill="none" stroke="currentColor" stroke-width="2"/>' +
    /* Solar Flares & Prominence Waves */
    '<path d="M100 48 Q108 26 122 18 Q118 36 106 50 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M100 152 Q92 174 78 182 Q82 164 94 150 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M48 100 Q26 92 18 78 Q36 82 50 94 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M152 100 Q174 108 182 122 Q164 118 150 106 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M62 62 Q44 48 36 34 Q52 44 68 56 Z" fill="currentColor" opacity="0.7"/>' +
    '<path d="M138 138 Q156 152 164 166 Q148 156 132 144 Z" fill="currentColor" opacity="0.7"/>' +
    '<path d="M138 62 Q152 44 166 36 Q156 52 144 68 Z" fill="currentColor" opacity="0.7"/>' +
    '<path d="M62 138 Q48 152 34 164 Q44 148 56 132 Z" fill="currentColor" opacity="0.7"/>' +
    /* Totality Core & Radiance Sparks */
    '<circle cx="100" cy="100" r="26" fill="currentColor" opacity="0.4"/>' +
    '<circle cx="100" cy="100" r="16" fill="currentColor" opacity="0.75"/>' +
    '<circle cx="100" cy="100" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    /* Diamond Ring Flash at 1 o\'clock */
    '<path d="M124 76 L128 68 L136 72 L128 76 L124 84 L120 76 L112 72 L120 68 Z" fill="currentColor" opacity="0.95"/>' +
    /* Telemetry Graticule Ticks */
    '<path d="M100 8 V16 M100 184 V192 M8 100 H16 M184 100 H192" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M38 38 L43 43 M157 157 L162 162 M38 162 L43 157 M162 38 L157 43" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("solaris", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("solaris", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("solaris", {
      name: "Solar Observatory",
      desc: "High-altitude coronagraph station above the clouds. Deep graphite instrument dials, brilliant solar amber prominences, and telemetry-grade coin inspection.",
      pair: "Pairs with · Fireside + Psych Voyage"
    });
  }
})();
