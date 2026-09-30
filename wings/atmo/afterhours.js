/* Atmosphere: afterhours. Owned by exactly one agent. Crest + picker copy only.
   Crest: "The Night Watch". A single pendant lamp still burning after closing, its cone of light
   falling on one coin left standing on a plinth between two velvet-rope stanchions; a crescent moon
   and three stars through the clerestory; the coin's reflection in the polished floor.
   currentColor = the room (stone, brass fittings drawn in the watermark colour); var(--gold) = what the light touches. */
(function () {
  "use strict";
  if (!window.TitanAtmo) return;

  var crest = [
    /* frame: coin-edge ring with a fine beaded inner rim */
    '<circle cx="100" cy="100" r="93" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    '<circle cx="100" cy="100" r="87" fill="none" stroke="currentColor" stroke-width="0.8" stroke-dasharray="0.9 3.2" opacity="0.7"/>',

    /* crescent moon, horns to the right, upper left */
    '<path d="M 58 40 A 22 22 0 0 0 58 84 A 29 29 0 0 1 58 40 Z" fill="var(--gold)" opacity="0.92"/>',
    /* three stars */
    '<circle cx="138" cy="44" r="1.5" fill="currentColor"/>',
    '<circle cx="152" cy="62" r="1.1" fill="currentColor" opacity="0.8"/>',
    '<circle cx="128" cy="34" r="0.9" fill="currentColor" opacity="0.7"/>',
    '<path d="M 146 48 v 6 M 143 51 h 6" stroke="currentColor" stroke-width="0.8" opacity="0.6"/>',

    /* pendant lamp: cord, shade, bulb */
    '<line x1="100" y1="8" x2="100" y2="46" stroke="currentColor" stroke-width="1.4"/>',
    '<path d="M 86 62 L 114 62 L 107 46 L 93 46 Z" fill="currentColor"/>',
    '<path d="M 86 62 L 114 62" stroke="var(--gold)" stroke-width="1.2"/>',
    '<circle cx="100" cy="65" r="2.6" fill="var(--gold)"/>',

    /* cone of light: three stacked wedges give a soft fall-off without a gradient def */
    '<path d="M 86 63 L 114 63 L 148 150 L 52 150 Z" fill="var(--gold)" opacity="0.10"/>',
    '<path d="M 90 63 L 110 63 L 136 150 L 64 150 Z" fill="var(--gold)" opacity="0.10"/>',
    '<path d="M 95 63 L 105 63 L 122 150 L 78 150 Z" fill="var(--gold)" opacity="0.10"/>',

    /* velvet rope, sagging behind the plinth */
    '<path d="M 46 128 Q 100 152 154 128" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.75"/>',
    /* stanchions */
    '<rect x="44.8" y="126" width="2.4" height="24" fill="currentColor"/>',
    '<circle cx="46" cy="124" r="3" fill="var(--gold)"/>',
    '<rect x="40" y="149" width="12" height="2.6" rx="1" fill="currentColor"/>',
    '<rect x="152.8" y="126" width="2.4" height="24" fill="currentColor"/>',
    '<circle cx="154" cy="124" r="3" fill="var(--gold)"/>',
    '<rect x="148" y="149" width="12" height="2.6" rx="1" fill="currentColor"/>',

    /* plinth: cap, column, base */
    '<rect x="76" y="122" width="48" height="6" rx="1.2" fill="currentColor"/>',
    '<rect x="82" y="128" width="36" height="17" fill="currentColor" opacity="0.85"/>',
    '<rect x="72" y="145" width="56" height="6.5" rx="1.2" fill="currentColor"/>',

    /* the coin, standing on edge in the light */
    '<circle cx="100" cy="103" r="18" fill="var(--gold)" stroke="currentColor" stroke-width="1.6"/>',
    '<circle cx="100" cy="103" r="13.5" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.7"/>',
    '<path d="M 100 93 L 104.5 103 L 100 113 L 95.5 103 Z" fill="currentColor" opacity="0.85"/>',
    '<path d="M 91 103 h 4 M 105 103 h 4" stroke="currentColor" stroke-width="0.9" opacity="0.7"/>',

    /* floor line and the coin's reflection in the marble */
    '<line x1="34" y1="152" x2="166" y2="152" stroke="currentColor" stroke-width="1.1"/>',
    '<ellipse cx="100" cy="157" rx="22" ry="2.6" fill="var(--gold)" opacity="0.28"/>',
    '<ellipse cx="100" cy="157" rx="10" ry="1.2" fill="var(--gold)" opacity="0.35"/>',

    /* brass plaque line at the foot of the ring */
    '<path d="M 66 172 Q 100 181 134 172" fill="none" stroke="var(--gold)" stroke-width="1.2"/>',
    '<circle cx="100" cy="176.5" r="1.6" fill="var(--gold)"/>'
  ].join("");

  window.TitanAtmo.defineCrest("afterhours", crest);

  window.TitanAtmo.setCard("afterhours", {
    name: "After Hours",
    desc: "The museum after closing. One spotlight left burning over black marble, moonlight through the clerestory, brass rails in the dark. Cool, quiet, cinematic."
  });
})();
