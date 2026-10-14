/* ============================================================================
   Atmosphere: DRAFTING ROOM (drafting)
   Identity: The engraver's drafting room. Prussian-blue blueprint paper,
   white technical line, compass dividers, dimension lines, and millimeter ticks.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Technical Drafting Grid & Boundary */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" opacity="0.5"/>' +
    /* Crosshairs & Millimeter Coordinate Axes */
    '<line x1="12" y1="100" x2="188" y2="100" stroke="currentColor" stroke-width="1.2" stroke-dasharray="8 3" opacity="0.4"/>' +
    '<line x1="100" y1="12" x2="100" y2="188" stroke="currentColor" stroke-width="1.2" stroke-dasharray="8 3" opacity="0.4"/>' +
    /* Center Blueprint Coin Profile under Examination */
    '<circle cx="100" cy="100" r="54" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-width="2.6"/>' +
    '<circle cx="100" cy="100" r="46" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>' +
    /* Reeding Denticle Ticks on Coin Profile */
    '<circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="0.1 5.2" opacity="0.6"/>' +
    /* Precision Drafting Compass Dividers (Hinge at top, legs spanning the coin) */
    '<circle cx="100" cy="30" r="8" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="2.5"/>' +
    '<circle cx="100" cy="30" r="3" fill="currentColor"/>' +
    /* Compass Legs */
    '<line x1="94" y1="36" x2="52" y2="136" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '<line x1="106" y1="36" x2="148" y2="136" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    /* Compass Needle Points */
    '<line x1="52" y1="136" x2="48" y2="148" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<line x1="148" y1="136" x2="152" y2="148" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    /* Horizontal Adjustment Spindle & Knurled Thumbwheel */
    '<line x1="68" y1="84" x2="132" y2="84" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="94" y="78" width="12" height="12" rx="1.5" fill="currentColor" opacity="0.8"/>' +
    /* Technical Dimension Arrow & Dimension Callout Line */
    '<line x1="46" y1="162" x2="154" y2="162" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M52 159 L46 162 L52 165 M148 159 L154 162 L148 165" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '<line x1="46" y1="154" x2="46" y2="170" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="154" y1="154" x2="154" y2="170" stroke="currentColor" stroke-width="1.2"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("drafting", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("drafting", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("drafting", {
      name: "Drafting Room",
      desc: "The engraver's drafting room: blueprint paper, every coin drawn to scale, every dimension measured.",
      pair: "Pairs with · Clock and Pencil + Classical"
    });
  }
})();
