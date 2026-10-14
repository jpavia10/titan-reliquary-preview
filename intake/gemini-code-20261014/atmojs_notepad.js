/* ============================================================================
   Atmosphere: NOTEPAD (notepad)
   Identity: "Untitled - Notepad", brutally honest. Pure white paper, black ink,
   Courier New monospaced type, dog-eared document sheet, and blinking cursor.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Outer Circular Coin Boundary Frame (hairline rule) */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.45"/>' +
    /* Window Title Bar & Window Controls */
    '<rect x="36" y="32" width="128" height="18" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="48" cy="41" r="3" fill="currentColor"/>' +
    '<rect x="142" y="37" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<line x1="128" y1="41" x2="136" y2="41" stroke="currentColor" stroke-width="1.8"/>' +
    /* Document Body Sheet with Dog-Eared Folded Top-Right Corner */
    '<path d="M42 50 H124 L152 78 V164 H42 Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<polygon points="124,50 124,78 152,78" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>' +
    /* Monospaced ASCII Header Line (================) */
    '<line x1="52" y1="72" x2="114" y2="72" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>' +
    /* Text Line Paragraphs */
    '<line x1="52" y1="88" x2="140" y2="88" stroke="currentColor" stroke-width="2" stroke-linecap="square" opacity="0.8"/>' +
    '<line x1="52" y1="102" x2="134" y2="102" stroke="currentColor" stroke-width="2" stroke-linecap="square" opacity="0.8"/>' +
    '<line x1="52" y1="116" x2="142" y2="116" stroke="currentColor" stroke-width="2" stroke-linecap="square" opacity="0.8"/>' +
    '<line x1="52" y1="130" x2="110" y2="130" stroke="currentColor" stroke-width="2" stroke-linecap="square" opacity="0.8"/>' +
    /* Terminal Prompt & Blinking Underscore Cursor */
    '<line x1="52" y1="146" x2="82" y2="146" stroke="currentColor" stroke-width="2" stroke-linecap="square" opacity="0.8"/>' +
    '<rect x="88" y="141" width="8" height="11" fill="currentColor"/>' +
    /* Slender Drafting Pencil Tool (resting on right edge) */
    '<g transform="rotate(45 140 140)">' +
    '  <rect x="134" y="100" width="12" height="48" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/>' +
    '  <polygon points="134,148 140,164 146,148" fill="currentColor" stroke="currentColor" stroke-width="1.8"/>' +
    '  <polygon points="138,158 140,164 142,158" fill="currentColor"/>' +
    '</g>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("notepad", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("notepad", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("notepad", {
      name: "Notepad",
      desc: "Plaintext document. Pure white paper, black ink, monospaced type, 1px rules, and zero decoration. Brutally readable.",
      pair: "Pairs with · Typewriter + Office Hum"
    });
  }
})();
