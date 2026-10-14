/* ============================================================================
   Atmosphere: AFTER HOURS (afterhours) - Midnight gallery lounge.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.6"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.55"/>' +
    '<circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 5" opacity="0.4"/>' +
    /* Art Deco Diagonal Spotlight Beam (Upper-Left to Lower-Right) */
    '<path d="M18 18 L182 182 L154 186 L14 46 Z" fill="currentColor" opacity="0.12"/>' +
    '<path d="M30 14 L186 170" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.4"/>' +
    /* Art Deco Crescent Moon on Upper-Left */
    '<path d="M78 30 C50 42 36 74 42 104 C48 132 74 156 104 158 C78 152 58 130 56 102 C54 74 68 46 94 36 C88 33 83 31 78 30 Z" fill="currentColor" opacity="0.75"/>' +
    /* Jazz Saxophone Silhouette: Neck and Mouthpiece */
    '<path d="M84 56 Q94 48 106 50 Q108 54 104 58 Q96 56 88 64 Z" fill="currentColor" opacity="0.9"/>' +
    '<path d="M106 50 L112 44 L114 47 L108 53 Z" fill="currentColor"/>' +
    /* Saxophone Body Tube curving down into Bell */
    '<path d="M86 62 Q78 88 84 116 Q88 134 102 142 Q118 150 134 136 Q146 124 148 102 L138 98 Q136 116 126 124 Q116 132 106 126 Q98 120 94 108 Q90 88 96 66 Z" fill="currentColor" opacity="0.85"/>' +
    /* Flaring Bell (Art Deco Horn) */
    '<path d="M136 104 Q142 86 156 78 Q162 74 166 78 Q164 88 150 102 Z" fill="currentColor"/>' +
    '<ellipse cx="158" cy="84" rx="10" ry="6" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-35 158 84)" opacity="0.9"/>' +
    '<ellipse cx="158" cy="84" rx="5" ry="3" fill="currentColor" transform="rotate(-35 158 84)" opacity="0.35"/>' +
    /* Key Pearls */
    '<circle cx="87" cy="80" r="2.4" fill="currentColor"/><circle cx="89" cy="90" r="2.4" fill="currentColor"/><circle cx="92" cy="100" r="2.4" fill="currentColor"/>' +
    /* Champagne Cocktail Coupe on Lower Left */
    '<path d="M54 134 Q66 146 80 134 L80 130 H54 Z" fill="currentColor" opacity="0.5"/>' +
    '<path d="M54 130 Q67 146 80 130" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<line x1="67" y1="142" x2="67" y2="162" stroke="currentColor" stroke-width="2.4"/>' +
    '<path d="M56 162 H78" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
    /* Rising Champagne Bubbles */
    '<circle cx="62" cy="124" r="1.8" fill="currentColor" opacity="0.8"/>' +
    '<circle cx="72" cy="120" r="1.5" fill="currentColor" opacity="0.7"/>' +
    '<circle cx="66" cy="112" r="2.2" fill="currentColor" opacity="0.9"/>' +
    '<circle cx="74" cy="104" r="1.4" fill="currentColor" opacity="0.6"/>' +
    /* Art Deco Starlight Sparks */
    '<polygon points="128,34 130,40 136,42 130,44 128,50 126,44 120,42 126,40" fill="currentColor" opacity="0.85"/>' +
    '<polygon points="166,134 167,138 171,139 167,140 166,144 165,140 161,139 165,138" fill="currentColor" opacity="0.75"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("afterhours", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("afterhours", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("afterhours", {
      name: "After Hours",
      desc: "The private midnight gallery after closing. Cool moonlight from the skylights, warm spotlight pool on each masterpiece, and champagne brass placards.",
      pair: "Pairs with · Rain + Midnight Lounge"
    });
  }
})();
