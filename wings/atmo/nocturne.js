/* Atmosphere: nocturne. Crest + picker copy only (styles live in styles/atmo/nocturne.css).
 * Crest "Moon over the Stave": a deco keyhole arch (the cellar door) framing a
 * crescent moon, three stars, and a five-line music stave on which a coin sits
 * as the note. currentColor only, so it follows the theme wherever it is shown
 * (hero and exhibit watermarks, cover flow). Static SVG, no refs, < 4 KB.
 */
(function () {
  "use strict";
  var C = 'stroke="currentColor"', N = 'fill="none" ' + C;
  function star(x, y, s) {
    return '<path d="M' + x + ' ' + (y - s) + 'L' + (x + s * 0.28) + ' ' + (y - s * 0.28) + 'L' + (x + s) + ' ' + y +
      'L' + (x + s * 0.28) + ' ' + (y + s * 0.28) + 'L' + x + ' ' + (y + s) + 'L' + (x - s * 0.28) + ' ' + (y + s * 0.28) +
      'L' + (x - s) + ' ' + y + 'L' + (x - s * 0.28) + ' ' + (y - s * 0.28) + 'Z" fill="currentColor"/>';
  }
  var CREST =
    /* outer medallion: double deco ring */
    '<circle cx="100" cy="100" r="92" ' + N + ' stroke-width="2"/>' +
    '<circle cx="100" cy="100" r="86" ' + N + ' stroke-width="0.9" stroke-dasharray="1.5 4.5" opacity="0.8"/>' +
    /* the cellar door: a stepped deco arch */
    '<path d="M46 176V92a54 54 0 0 1 108 0v84" ' + N + ' stroke-width="2.4"/>' +
    '<path d="M56 176V94a44 44 0 0 1 88 0v82" ' + N + ' stroke-width="1" opacity="0.6"/>' +
    /* sunburst rays behind the moon (faint) */
    '<g ' + C + ' stroke-width="1" opacity="0.28">' +
      '<path d="M100 150L100 58M100 150L70 64M100 150L130 64M100 150L60 86M100 150L140 86M100 150L58 112M100 150L142 112"/>' +
    '</g>' +
    /* crescent moon */
    '<path d="M112 60.5A36 36 0 1 0 134 108A30 30 0 1 1 112 60.5Z" fill="currentColor" opacity="0.9"/>' +
    '<path d="M112 60.5A36 36 0 1 0 134 108" ' + N + ' stroke-width="1.2"/>' +
    /* stars */
    star(132, 72, 7) + star(146, 94, 4) + star(72, 70, 3.5) +
    /* the stave */
    '<g ' + C + ' stroke-width="1.1" opacity="0.75">' +
      '<path d="M40 134H160M40 141H160M40 148H160M40 155H160M40 162H160"/>' +
    '</g>' +
    /* the coin, sitting as a note, with its stem and a milled rim */
    '<circle cx="118" cy="151.5" r="8.5" fill="currentColor"/>' +
    '<circle cx="118" cy="151.5" r="11.5" ' + N + ' stroke-width="1" stroke-dasharray="1.2 1.6"/>' +
    '<path d="M126.5 151.5V118q8 3 10 12" ' + N + ' stroke-width="2" stroke-linecap="round"/>' +
    /* a second, smaller note */
    '<circle cx="84" cy="144.5" r="5.5" fill="currentColor" opacity="0.8"/>' +
    '<path d="M89.5 144.5V122" ' + N + ' stroke-width="1.6" opacity="0.8"/>' +
    /* base plinth, deco triple rule */
    '<path d="M38 176H162M52 182H148M68 188H132" ' + N + ' stroke-width="1.6"/>';

  function put() {
    if (window.TitanAtmoCrest) { window.TitanAtmoCrest("nocturne", CREST); return true; }
    if (window.TitanAtmo && window.TitanAtmo.defineCrest) { window.TitanAtmo.defineCrest("nocturne", CREST); return true; }
    return false;
  }
  if (!put()) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", put);
  }

  var CARD = {
    name: "Nocturne",
    desc: "The jazz cellar under the museum, after the gala. Indigo lacquer, brass inlay, moonlight through the grate.",
    pair: "Pairs with · Midnight Rain + Jazz"
  };
  if (window.TitanAtmo && window.TitanAtmo.setCard) window.TitanAtmo.setCard("nocturne", CARD);
})();
