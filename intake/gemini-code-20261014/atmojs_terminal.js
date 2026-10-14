/* ============================================================================
   Atmosphere: GRAND TERMINAL (terminal)
   Identity: A grand railway hall at night: fifty countries on the split-flap departures board.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    '<rect x="22" y="34" width="156" height="132" rx="7" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="3"/>' +
    '<rect x="26" y="38" width="148" height="124" rx="5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.4"/>' +
    '<line x1="22" y1="100" x2="178" y2="100" stroke="currentColor" stroke-width="2.6"/>' +
    '<rect x="34" y="46" width="38" height="50" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="34" y="104" width="38" height="50" rx="3" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="81" y="46" width="38" height="50" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="81" y="104" width="38" height="50" rx="3" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="128" y="46" width="38" height="50" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="128" y="104" width="38" height="50" rx="3" fill="currentColor" fill-opacity="0.32" stroke="currentColor" stroke-width="1.5"/>' +
    '<circle cx="30" cy="100" r="2.8" fill="currentColor"/><circle cx="76" cy="100" r="2.4" fill="currentColor"/><circle cx="123" cy="100" r="2.4" fill="currentColor"/><circle cx="170" cy="100" r="2.8" fill="currentColor"/>' +
    '<path d="M88 92 A12 12 0 0 1 112 92 M88 108 A12 12 0 0 0 112 108" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="100" cy="88" r="3" fill="currentColor"/><circle cx="100" cy="112" r="3" fill="currentColor"/>' +
    '<path d="M44 60 H62 M53 60 V90 M44 110 H62 M44 110 V140" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" opacity="0.85"/>' +
    '<rect x="136" y="60" width="22" height="6" fill="currentColor" opacity="0.85"/><rect x="136" y="110" width="22" height="6" fill="currentColor" opacity="0.85"/>' +
    '<circle cx="48" cy="40" r="2" fill="currentColor"/><circle cx="100" cy="40" r="2" fill="currentColor"/><circle cx="152" cy="40" r="2" fill="currentColor"/>' +
    '<line x1="30" y1="180" x2="170" y2="180" stroke="currentColor" stroke-width="2.4"/>' +
    '<path d="M46 174 V186 M72 174 V186 M100 174 V186 M128 174 V186 M154 174 V186" stroke="currentColor" stroke-width="2"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("terminal", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("terminal", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("terminal", {
      name: "Grand Terminal",
      desc: "A grand railway hall at night: fifty countries on the split-flap departures board.",
      pair: "Pairs with · Trains and the Hall + Adventure"
    });
  }
})();
