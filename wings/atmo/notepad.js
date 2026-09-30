/* Atmosphere: notepad ("Plaintext"). Owned by exactly one agent. Crest + picker copy only.
   Crest: a sheet of ruled paper with a folded corner, a coin set in the text like a glyph,
   and a blinking-caret bar after the last line. currentColor only, so it recolours. */
(function () {
  "use strict";
  var crest =
    /* the sheet, with a dog-eared top-right corner */
    '<path d="M44 22H134L162 50V178H44Z" fill="currentColor" opacity="0.07"/>' +
    '<path d="M44 22H134L162 50V178H44Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M134 22V50H162" fill="currentColor" opacity="0.16"/>' +
    '<path d="M134 22V50H162" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>' +
    /* margin rule */
    '<line x1="62" y1="30" x2="62" y2="170" stroke="currentColor" stroke-width="1.2" opacity="0.4"/>' +
    /* heading line */
    '<rect x="72" y="40" width="46" height="6" rx="1" fill="currentColor"/>' +
    /* the coin, set inline like a large glyph: rim, beaded border, bust-less field with a star */
    '<circle cx="103" cy="92" r="27" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="103" cy="92" r="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="1.6 3.4"/>' +
    '<path d="M103 78l4.1 8.4 9.2 1.3-6.7 6.5 1.6 9.2-8.2-4.3-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3Z" fill="currentColor" opacity="0.85"/>' +
    /* body lines of plain text */
    '<rect x="72" y="132" width="76" height="4" rx="1" fill="currentColor" opacity="0.55"/>' +
    '<rect x="72" y="144" width="58" height="4" rx="1" fill="currentColor" opacity="0.55"/>' +
    '<rect x="72" y="156" width="34" height="4" rx="1" fill="currentColor" opacity="0.55"/>' +
    /* the caret */
    '<rect x="111" y="152" width="3.5" height="12" fill="currentColor"/>';

  var T = window.TitanAtmo || {};
  if (typeof window.TitanAtmoCrest === "function") window.TitanAtmoCrest("notepad", crest);
  else if (typeof T.defineCrest === "function") T.defineCrest("notepad", crest);

  if (typeof T.setCard === "function") {
    T.setCard("notepad", {
      name: "Plaintext",
      desc: "Untitled - Notepad, done properly. Paper-white page, ink-black type, one blue caret. Just the coins.",
      pair: "Pairs with · Room Tone + Long Notes"
    });
  }
})();
