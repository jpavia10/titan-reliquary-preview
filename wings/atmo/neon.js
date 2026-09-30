/* Atmosphere: neon ("Neon Vault"). Crest + picker copy only.
   Crest: a coin rim with reeding ticks, a slatted synthwave sun on a neon horizon,
   and a perspective grid running to the vanishing point. currentColor only, 200x200 viewBox. */
(function () {
  "use strict";
  var CREST =
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="3.5"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/>' +
    /* the slatted sun */
    '<path d="M100 62L113.1 64L118.3 66L122.2 68L125.3 70L127.9 72L130.2 74L132.2 76L133.9 78L66.1 78L67.8 76L69.8 74L72.1 72L74.7 70L77.8 68L81.7 66L86.9 64Z' +
    'M135.5 80L137 82.2L138.4 84.5L139.6 86.8L140.6 89L59.4 89L60.4 86.8L61.6 84.5L63 82.2L64.5 80Z' +
    'M141.4 91L141.9 92.5L142.3 94L142.7 95.5L143.1 97L56.9 97L57.3 95.5L57.7 94L58.1 92.5L58.6 91Z' +
    'M143.4 99L143.6 100.1L143.7 101.2L143.9 102.4L143.9 103.5L56.1 103.5L56.1 102.4L56.3 101.2L56.4 100.1L56.6 99Z" fill="currentColor" opacity=".9"/>' +
    /* horizon + perspective grid */
    '<path d="M20.4 108H179.6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M23.6 116H176.4M26.7 127H173.3M33.9 142H166.1M51.4 162H148.6M94.8 111L34.4 145.8M97.7 111L54.7 166M99 111L77.6 176.8M100 111L100 180M101 111L122.4 176.8M102.3 111L145.3 166M105.2 111L165.6 145.8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".7"/>' +
    /* sparkles */
    '<path d="M52 49L54 56L61 58L54 60L52 67L50 60L43 58L50 56ZM150 42L151.3 46.7L156 48L151.3 49.3L150 54L148.7 49.3L144 48L148.7 46.7ZM142 74L142.9 77.1L146 78L142.9 78.9L142 82L141.1 78.9L138 78L141.1 77.1Z" fill="currentColor"/>' +
    /* reeding ticks on the upper rim */
    '<path d="M21.6 60L16.2 57.3M28.8 48.3L24 44.7M37.8 37.8L33.5 33.5M48.3 28.8L44.7 24M60 21.6L57.3 16.2M72.8 16.3L71 10.6M86.2 13.1L85.3 7.2M113.8 13.1L114.7 7.2M127.2 16.3L129 10.6M140 21.6L142.7 16.2M151.7 28.8L155.3 24M162.2 37.8L166.5 33.5M171.2 48.3L176 44.7M178.4 60L183.8 57.3" stroke="currentColor" stroke-width="1.6" opacity=".6"/>' +
    '<circle cx="100" cy="6" r="3" fill="currentColor"/>';

  if (window.TitanAtmoCrest) window.TitanAtmoCrest("neon", CREST);
  else if (window.TitanAtmo && window.TitanAtmo.defineCrest) window.TitanAtmo.defineCrest("neon", CREST);

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("neon", {
      name: "Neon Vault",
      desc: "Midnight drive. A slatted sun on the horizon, cyan tubes over a magenta grid, every coin lit like a sign after hours.",
      pair: "Pairs with · Grid + Midnight Drive"
    });
  }
})();
