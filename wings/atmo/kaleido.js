/* Atmosphere: kaleido ("Kaleidoscope"). Owned by exactly one agent. Crest + picker copy only.
   Concept: Brewster's cabinet. The crest is the view down a real kaleidoscope: a brass eyepiece
   rim, six mirror seams, six glass facets in alternating densities, a hexagonal object cell, and a
   six-point star of glass chips at the centre. Exact six-fold symmetry (all points computed on
   60-degree spokes). Uses currentColor for the glass and var(--gold) for the brass/rose so it
   recolours with the theme, and reads at 24px (nav) as well as 200px (hero). */
(function () {
  "use strict";
  if (!window.TitanAtmo) return;

  var crest = [
    /* brass eyepiece: outer rim, thin inner bezel */
    '<circle cx="100" cy="100" r="90" fill="none" stroke="var(--gold)" stroke-width="3"/>',
    '<circle cx="100" cy="100" r="84" fill="none" stroke="var(--gold)" stroke-width="1" opacity="0.55"/>',
    '<circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>',

    /* six glass facets (centre to the r=70 hexagon), alternating rose / glass */
    '<polygon points="100,100 100,30 160.62,65" fill="var(--gold)" opacity="0.22"/>',
    '<polygon points="100,100 160.62,65 160.62,135" fill="currentColor" opacity="0.10"/>',
    '<polygon points="100,100 160.62,135 100,170" fill="var(--gold)" opacity="0.16"/>',
    '<polygon points="100,100 100,170 39.38,135" fill="currentColor" opacity="0.10"/>',
    '<polygon points="100,100 39.38,135 39.38,65" fill="var(--gold)" opacity="0.22"/>',
    '<polygon points="100,100 39.38,65 100,30" fill="currentColor" opacity="0.10"/>',

    /* the r=70 hexagon that bounds the facets */
    '<polygon points="100,30 160.62,65 160.62,135 100,170 39.38,135 39.38,65" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>',

    /* six mirror seams, one per spoke */
    '<g stroke="currentColor" stroke-width="0.9" opacity="0.55">',
    '<line x1="100" y1="100" x2="100" y2="30"/>',
    '<line x1="100" y1="100" x2="160.62" y2="65"/>',
    '<line x1="100" y1="100" x2="160.62" y2="135"/>',
    '<line x1="100" y1="100" x2="100" y2="170"/>',
    '<line x1="100" y1="100" x2="39.38" y2="135"/>',
    '<line x1="100" y1="100" x2="39.38" y2="65"/>',
    '</g>',

    /* glass chips caught between the mirrors (small diamonds on the 30-degree spokes, r=56) */
    '<g fill="currentColor" opacity="0.6">',
    '<polygon points="128,46.5 133,51.5 128,56.5 123,51.5"/>',
    '<polygon points="156,95 161,100 156,105 151,100"/>',
    '<polygon points="128,143.5 133,148.5 128,153.5 123,148.5"/>',
    '<polygon points="72,143.5 77,148.5 72,153.5 67,148.5"/>',
    '<polygon points="44,95 49,100 44,105 39,100"/>',
    '<polygon points="72,46.5 77,51.5 72,56.5 67,51.5"/>',
    '</g>',

    /* object cell: r=40 hexagon, brass-edged */
    '<polygon points="100,60 134.64,80 134.64,120 100,140 65.36,120 65.36,80" fill="var(--gold)" opacity="0.14"/>',
    '<polygon points="100,60 134.64,80 134.64,120 100,140 65.36,120 65.36,80" fill="none" stroke="var(--gold)" stroke-width="1.6"/>',

    /* six-point star at the centre: two interlocking triangles, r=28 */
    '<polygon points="100,72 124.25,114 75.75,114" fill="currentColor" opacity="0.28"/>',
    '<polygon points="124.25,86 100,128 75.75,86" fill="currentColor" opacity="0.28"/>',
    '<polygon points="100,72 124.25,114 75.75,114" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.9"/>',
    '<polygon points="124.25,86 100,128 75.75,86" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.9"/>',

    /* the bright chip at the eye: brass ring, glass core */
    '<circle cx="100" cy="100" r="9" fill="var(--gold)" opacity="0.95"/>',
    '<circle cx="100" cy="100" r="4" fill="currentColor"/>'
  ].join("");

  TitanAtmo.defineCrest("kaleido", crest);

  TitanAtmo.setCard("kaleido", {
    name: "Kaleidoscope",
    desc: "Brewster's cabinet. A brass eyepiece, six mirrors, and chips of jewel glass held still against dark aubergine. Sharp facets, no blur, nothing moving.",
    pair: "Pairs with · Singing Bowl + Psych Voyage"
  });
})();
