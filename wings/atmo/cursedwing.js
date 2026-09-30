/* Atmosphere: cursedwing. Owned by exactly one agent. Crest + picker copy only.
 * Crest: "the sealed door". A lancet-arched archive door, barred by two chains,
 * closed with a round wax seal that carries a single wing. Drips of wax below.
 * currentColor only (with opacity for depth) so it recolours wherever it is shown.
 */
(function () {
  "use strict";
  var NAME = "cursedwing";
  var CREST =
    /* floor + door frame (outer and inner lancet arch) */
    '<path d="M34 182H166" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M48 182V92Q48 42 100 16Q152 42 152 92V182" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<path d="M61 182V96Q61 56 100 33Q139 56 139 96V182" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.7"/>' +
    /* planks */
    '<path d="M80 45V182M100 33V182M120 45V182" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/>' +
    /* keystone */
    '<path d="M93 20L100 9L107 20L100 27Z" fill="currentColor" fill-opacity="0.7"/>' +
    /* crossed chains */
    '<path d="M58 66L142 158M142 66L58 158" stroke="currentColor" stroke-width="5" stroke-dasharray="8 4" stroke-opacity="0.38" stroke-linecap="round"/>' +
    /* wax seal: scalloped body, rim, inner ring */
    '<path d="M100 78l7 4 8-1 5 6 7 3 1 8 5 6-3 7 3 7-5 6-1 8-7 3-5 6-8-1-7 4-7-4-8 1-5-6-7-3-1-8-5-6 3-7-3-7 5-6 1-8 7-3 5-6 8 1z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="100" cy="112" r="23" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3" stroke-opacity="0.8"/>' +
    /* the wing pressed into the wax */
    '<path d="M84 124C86 106 101 95 121 96C115 100 113 104 114 108C109 106 105 108 104 112C100 110 96 113 96 117C92 116 88 119 84 124Z" fill="currentColor"/>' +
    '<path d="M86 121L118 99" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.6"/>' +
    /* wax drips */
    '<path d="M90 146q2 12 4 15q2-3 3-13zM106 147q1 8 3 10q2-2 2-9zM97 149q1 18 3 22q2-4 2-21z" fill="currentColor" fill-opacity="0.6"/>';

  var CARD = {
    name: "The Cursed Wing",
    desc: "The sealed gallery at the end of the hall. Black lacquer walls, vermilion wax seals, labels in bone ink. Dark and quiet, still easy to read.",
    pair: "Pairs with · Abyss Drone + Oppressive Gloom"
  };

  if (window.TitanAtmoCrest) window.TitanAtmoCrest(NAME, CREST);
  else if (window.TitanAtmo && window.TitanAtmo.defineCrest) window.TitanAtmo.defineCrest(NAME, CREST);
  if (window.TitanAtmo && window.TitanAtmo.setCard) window.TitanAtmo.setCard(NAME, CARD);
})();
