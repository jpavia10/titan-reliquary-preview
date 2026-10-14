/* ============================================================================
   Atmosphere: COLOSSUS PLINTH (colossus)
   Identity: Smelter of ancient Rhodes. Monumental cast bronze plinth,
   heavy classical Greek meander, roaring brazier flames, molten amber ore.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Classical Heavy Octagonal Rim with Inset Borders */
    '<polygon points="100,16 159,41 184,100 159,159 100,184 41,159 16,100 41,41" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<polygon points="100,24 153,46 176,100 153,154 100,176 47,154 24,100 47,46" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.55"/>' +
    /* Monolithic Plinth Pedestal (Stepped Classical Base) */
    '<rect x="52" y="148" width="96" height="14" rx="1.5" fill="currentColor" opacity="0.85"/>' +
    '<rect x="62" y="136" width="76" height="12" rx="1" fill="currentColor" opacity="0.75"/>' +
    '<rect x="68" y="118" width="64" height="18" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<rect x="74" y="122" width="52" height="10" fill="currentColor" opacity="0.3"/>' +
    /* Greek Meander Fret Accent along Pedestal */
    '<path d="M56 155 H62 V151 H68 V157 H60 M74 155 H80 V151 H86 V157 H78 M92 155 H98 V151 H104 V157 H96 M110 155 H116 V151 H122 V157 H114 M128 155 H134 V151 H140 V157 H132" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>' +
    /* Cast Bronze Tripod Brazier Bowl */
    '<path d="M58 84 Q100 98 142 84 L138 98 Q100 114 62 98 Z" fill="currentColor" opacity="0.9"/>' +
    '<path d="M58 84 Q100 98 142 84" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' +
    /* Brazier Support Legs to Plinth */
    '<path d="M68 96 L74 118 M132 96 L126 118 M100 102 V118" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' +
    /* Roaring Smelter Flames & Forge Embers */
    '<path d="M100 32 Q112 50 116 64 Q128 54 122 74 Q134 68 132 84 Q100 80 68 84 Q66 68 78 74 Q72 54 84 64 Q88 50 100 32 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M100 44 Q108 58 110 68 Q118 62 114 76 Q100 74 86 76 Q82 62 90 68 Q92 58 100 44 Z" fill="currentColor" opacity="0.35"/>' +
    '<path d="M96 52 Q100 62 104 62 Q108 62 104 74 Q100 72 96 74 Z" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    /* Rising Molten Metal Sparks */
    '<circle cx="82" cy="40" r="2.2" fill="currentColor"/><circle cx="118" cy="36" r="2" fill="currentColor"/>' +
    '<circle cx="68" cy="52" r="1.6" fill="currentColor"/><circle cx="132" cy="48" r="1.8" fill="currentColor"/>' +
    '<circle cx="100" cy="22" r="2.8" fill="currentColor"/>' +
    /* Side Anchor Rivets */
    '<circle cx="36" cy="100" r="3.5" fill="currentColor"/><circle cx="164" cy="100" r="3.5" fill="currentColor"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("colossus", "" + CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("colossus", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("colossus", {
      name: "Colossus Plinth",
      desc: "Smelter of ancient Rhodes. Monumental cast bronze plinth, roaring furnace coals, molten amber ore, and heavy classical stone-hewn custody.",
      pair: "Pairs with · Bronze Foundry + Colossus Anthem"
    });
  }
})();
