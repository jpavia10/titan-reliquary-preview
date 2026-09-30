/* Atmosphere: afterhours. Owned by exactly one agent. Crest + picker copy only.
   Crest: "The Night Watch". A single pendant lamp still burning after closing, its cone of light
   falling on one coin standing on a plinth between two velvet-rope stanchions; a crescent moon and
   stars through the clerestory; the coin's reflection in the polished floor.
   Drawn in currentColor only (depth via opacity) so it follows whatever colour the host gives it. */
(function () {
  "use strict";

  var crest = [
    /* frame: coin-edge ring with a beaded inner rim */
    '<circle cx="100" cy="100" r="93" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    '<circle cx="100" cy="100" r="87" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="0.9 3.2" opacity="0.7"/>',
    /* crescent moon + stars */
    '<path d="M58 40A22 22 0 0 0 58 84A29 29 0 0 1 58 40Z" fill="currentColor" opacity="0.9"/>',
    '<circle cx="138" cy="44" r="1.6" fill="currentColor"/>',
    '<circle cx="152" cy="62" r="1.1" fill="currentColor" opacity="0.8"/>',
    '<circle cx="128" cy="34" r="0.9" fill="currentColor" opacity="0.7"/>',
    '<path d="M146 48v6M143 51h6" stroke="currentColor" stroke-width="0.8" opacity="0.6"/>',
    /* pendant lamp */
    '<line x1="100" y1="8" x2="100" y2="46" stroke="currentColor" stroke-width="1.4"/>',
    '<path d="M86 62H114L107 46H93Z" fill="currentColor"/>',
    '<circle cx="100" cy="65" r="2.6" fill="currentColor"/>',
    /* cone of light: stacked wedges give a fall-off without gradient defs */
    '<path d="M86 63H114L148 150H52Z" fill="currentColor" opacity="0.07"/>',
    '<path d="M90 63H110L136 150H64Z" fill="currentColor" opacity="0.07"/>',
    '<path d="M95 63H105L122 150H78Z" fill="currentColor" opacity="0.08"/>',
    /* velvet rope and stanchions */
    '<path d="M46 128Q100 152 154 128" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.75"/>',
    '<rect x="44.8" y="126" width="2.4" height="24" fill="currentColor"/>',
    '<circle cx="46" cy="124" r="3" fill="currentColor"/>',
    '<rect x="40" y="149" width="12" height="2.6" rx="1" fill="currentColor"/>',
    '<rect x="152.8" y="126" width="2.4" height="24" fill="currentColor"/>',
    '<circle cx="154" cy="124" r="3" fill="currentColor"/>',
    '<rect x="148" y="149" width="12" height="2.6" rx="1" fill="currentColor"/>',
    /* plinth */
    '<rect x="76" y="122" width="48" height="6" rx="1.2" fill="currentColor"/>',
    '<rect x="82" y="128" width="36" height="17" fill="currentColor" opacity="0.6"/>',
    '<rect x="72" y="145" width="56" height="6.5" rx="1.2" fill="currentColor"/>',
    /* the coin, standing in the light */
    '<circle cx="100" cy="103" r="18" fill="currentColor" opacity="0.35"/>',
    '<circle cx="100" cy="103" r="18" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    '<circle cx="100" cy="103" r="13.5" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.8"/>',
    '<path d="M100 93L104.5 103L100 113L95.5 103Z" fill="currentColor"/>',
    /* floor line and reflection */
    '<line x1="34" y1="152" x2="166" y2="152" stroke="currentColor" stroke-width="1.1"/>',
    '<ellipse cx="100" cy="157" rx="22" ry="2.6" fill="currentColor" opacity="0.25"/>',
    '<ellipse cx="100" cy="157" rx="10" ry="1.2" fill="currentColor" opacity="0.4"/>',
    /* brass plaque at the foot of the ring */
    '<path d="M66 172Q100 181 134 172" fill="none" stroke="currentColor" stroke-width="1.2"/>',
    '<circle cx="100" cy="176.5" r="1.6" fill="currentColor"/>'
  ].join("");

  if (window.TitanAtmoCrest) window.TitanAtmoCrest("afterhours", crest);
  else if (window.TitanAtmo && window.TitanAtmo.defineCrest) window.TitanAtmo.defineCrest("afterhours", crest);

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("afterhours", {
      name: "After Hours",
      desc: "The museum after closing. One spotlight left burning over black marble, moonlight through the clerestory, brass rails in the dark. Cool, quiet, easy on the eyes."
    });
  }
})();
