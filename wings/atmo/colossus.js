/* Atmosphere: colossus. Crest + picker copy only (one agent owns this file).
 * Crest: "Helios on the Mole" — a sun-crowned bronze head (the Colossus of
 * Rhodes) inside a beaded coin border, standing on a stepped plinth above the
 * harbour waves. currentColor only, 200x200 viewBox, so it recolours per theme. */
(function () {
  "use strict";
  var f = function (n) { return Math.round(n * 10) / 10; };
  var rays = "";
  /* nine rays of the radiate crown, fanned over the upper half of the head */
  for (var i = 0; i < 9; i++) {
    var a = (-160 + i * 17.5) * Math.PI / 180, w = 0.075, cx = 100, cy = 82;
    var r0 = 31, r1 = (i % 2) ? 52 : 60;
    rays += '<path d="M' + f(cx + r0 * Math.cos(a - w)) + " " + f(cy + r0 * Math.sin(a - w)) +
      "L" + f(cx + r1 * Math.cos(a)) + " " + f(cy + r1 * Math.sin(a)) +
      "L" + f(cx + r0 * Math.cos(a + w)) + " " + f(cy + r0 * Math.sin(a + w)) + 'Z"/>';
  }
  var CREST =
    /* coin rim + beaded border */
    '<circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    '<circle cx="100" cy="100" r="83" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0 7.25" opacity="0.7"/>' +
    /* radiate crown */
    '<g fill="currentColor" opacity="0.85">' + rays + "</g>" +
    '<path d="M69 78 Q100 60 131 78" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    /* the head: face disc with brow, eyes, nose and mouth incised */
    '<circle cx="100" cy="86" r="27" fill="currentColor" opacity="0.2"/>' +
    '<circle cx="100" cy="86" r="27" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
    '<path d="M86 81 Q91 77 96 81 M104 81 Q109 77 114 81" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M88 86 L94 86 M106 86 L112 86" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M100 82 L97 96 L102 96" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<path d="M93 103 Q100 106 107 103" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M86 110 Q100 118 114 110 L112 122 L88 122 Z" fill="currentColor" opacity="0.45"/>' +
    /* stepped plinth (the mole) */
    '<path d="M76 124 H124 V132 H76 Z M68 132 H132 V140 H68 Z M60 140 H140 V148 H60 Z" fill="currentColor" opacity="0.5"/>' +
    '<path d="M76 124 H124 V132 H132 V140 H140 V148 H60 V140 H68 V132 H76 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    /* harbour waves */
    '<path d="M46 158 Q55 152 64 158 T82 158 T100 158 T118 158 T136 158 T154 158" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M58 168 Q67 162 76 168 T94 168 T112 168 T130 168 T148 168" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>';

  if (window.TitanAtmoCrest) window.TitanAtmoCrest("colossus", CREST);
  else if (window.TitanAtmo && window.TitanAtmo.defineCrest) window.TitanAtmo.defineCrest("colossus", CREST);

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("colossus", {
      name: "Colossus",
      desc: "The bronze monument at dawn. Cast-bronze plates, verdigris patina, a sun-crown of rays and inscribed capitals: the collection at triumphal scale.",
      pair: "Pairs with · Foundry + Five Armies"
    });
  }
})();
