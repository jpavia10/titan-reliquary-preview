/* Crest for the alchemist atmosphere: an ouroboros ringing the Philosopher's Stone
 * (circle > triangle > square > circle). The legacy crest hard-coded fill="#000" for the
 * serpent's eye; here the eye is a knock-out drawn with the page background token.
 * 200x200, currentColor only, no scripts, well under 4 KB.
 */
(function () {
  var CREST =
    '<circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="470 58" transform="rotate(-70 100 100)"/>' +
    '<ellipse cx="129" cy="21" rx="12" ry="7" fill="currentColor" transform="rotate(20 129 21)"/>' +
    '<circle cx="134" cy="19" r="1.8" style="fill: var(--bg)"/>' +
    '<path d="M72 21 L64 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.7"/>' +
    '<path d="M100 42 L150.2 129 H49.8 Z" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<rect x="70" y="80" width="60" height="49" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="100" cy="106" r="17" fill="currentColor" opacity="0.3"/>' +
    '<circle cx="100" cy="106" r="17" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="100" cy="106" r="3.5" fill="currentColor"/>';
  /* wings/atmo/core.js (loaded first) provides TitanAtmo.defineCrest; wings/themes.js loads later in index.html. */
  if (window.TitanAtmo && window.TitanAtmo.defineCrest) window.TitanAtmo.defineCrest("alchemist", CREST);
  else if (window.TitanAtmoCrest) window.TitanAtmoCrest("alchemist", CREST);
})();
