/* ============================================================================
   Atmosphere: ARCADE (arcade)
   Identity: Insert coin. 8-bit arcade where every piece is a token and the
   high score is your collection. Pixel steps, CRT purple-black, coin yellow.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* 8-Bit Pixel Stepped Circular Coin Rim */
    '<path d="M72 16 H128 V24 H152 V36 H164 V48 H176 V72 H184 V128 H176 V152 H164 V164 H152 V176 H128 V184 H72 V176 H48 V164 H36 V152 H24 V128 H16 V72 H24 V48 H36 V36 H48 V24 H72 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter"/>' +
    '<path d="M76 28 H124 V34 H144 V44 H156 V56 H166 V76 H172 V124 H166 V144 H156 V156 H144 V166 H124 V172 H76 V166 H56 V156 H44 V144 H34 V124 H28 V76 H34 V56 H44 V44 H56 V34 H76 Z" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6"/>' +
    /* Pixel Joystick Silhouette (Center-Left) */
    '<rect x="88" y="116" width="24" height="20" fill="currentColor" opacity="0.8"/>' +
    '<rect x="76" y="136" width="48" height="12" fill="currentColor" opacity="0.9"/>' +
    '<rect x="96" y="76" width="8" height="40" fill="currentColor"/>' +
    '<circle cx="100" cy="68" r="14" fill="currentColor"/>' +
    '<circle cx="96" cy="64" r="3.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"/>' +
    /* Retro Pixel Push Buttons (A, B, C) */
    '<rect x="134" y="88" width="12" height="12" rx="2" fill="currentColor" opacity="0.85"/>' +
    '<rect x="148" y="104" width="12" height="12" rx="2" fill="currentColor" opacity="0.85"/>' +
    '<rect x="134" y="120" width="12" height="12" rx="2" fill="currentColor" opacity="0.85"/>' +
    /* "INSERT COIN" / Quarter Token Slot (Upper Center) */
    '<rect x="68" y="44" width="64" height="6" fill="currentColor"/>' +
    '<rect x="82" y="38" width="36" height="4" fill="currentColor" opacity="0.5"/>' +
    /* 8-bit Pixel Stars & Sparkles */
    '<rect x="44" y="60" width="6" height="6" fill="currentColor"/><rect x="41" y="63" width="12" height="2" fill="currentColor"/><rect x="46" y="58" width="2" height="12" fill="currentColor"/>' +
    '<rect x="156" y="48" width="6" height="6" fill="currentColor"/><rect x="153" y="51" width="12" height="2" fill="currentColor"/><rect x="158" y="46" width="2" height="12" fill="currentColor"/>' +
    '<rect x="52" y="148" width="6" height="6" fill="currentColor"/><rect x="49" y="151" width="12" height="2" fill="currentColor"/><rect x="54" y="146" width="2" height="12" fill="currentColor"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("arcade", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("arcade", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("arcade", {
      name: "Arcade",
      desc: "Insert coin. An 8-bit arcade where every piece is a token and the high score is your collection. Pixel art.",
      pair: "Pairs with · Arcade Hum + Synthwave"
    });
  }
})();
