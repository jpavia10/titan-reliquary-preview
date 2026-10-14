/* ============================================================================
   Atmosphere: XENOHOLD (xeno)
   Identity: Derelict alien cargo hold. Obsidian hull, bone-white ink,
   bioluminescent sea-green telemetry, vertebral ribbing, and stasis capsules.
   Crest: 200x200 viewBox, currentColor only (fill/stroke + opacity), < 4 KB.
   Contract & rules: notes/agents/themes.md
   ========================================================================== */
(function () {
  "use strict";

  var CREST =
    /* Biomechanical Exoskeleton Carapace Rim (Segmented Chitin Rings) */
    '<circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2.6"/>' +
    '<circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.55"/>' +
    /* Dorsal Mandible / Bio-Armor Pincers (Top and Bottom) */
    '<path d="M72 16 Q100 36 128 16 L124 28 Q100 44 76 28 Z" fill="currentColor" opacity="0.85"/>' +
    '<path d="M72 184 Q100 164 128 184 L124 172 Q100 156 76 172 Z" fill="currentColor" opacity="0.85"/>' +
    /* Articulated Vertebral Spinal Column (Central Spine) */
    '<line x1="100" y1="36" x2="100" y2="164" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    /* Segmented Vertebrae Ribs Curving Outward (Bioluminescent Ribcage) */
    '<path d="M100 52 Q136 46 156 64 M100 52 Q64 46 44 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>' +
    '<path d="M100 74 Q146 68 168 88 M100 74 Q54 68 32 88" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>' +
    '<path d="M100 126 Q146 132 168 112 M100 126 Q54 132 32 112" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>' +
    '<path d="M100 148 Q136 154 156 136 M100 148 Q64 154 44 136" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>' +
    /* Central Alien Stasis Capsule / Cyclopean Ocular Sensor */
    '<ellipse cx="100" cy="100" rx="34" ry="22" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.8"/>' +
    '<ellipse cx="100" cy="100" rx="24" ry="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" opacity="0.7"/>' +
    '<circle cx="100" cy="100" r="8" fill="currentColor" opacity="0.9"/>' +
    '<circle cx="100" cy="100" r="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>' +
    /* Lateral Telemetry / Coordinate Reticle Nodes */
    '<circle cx="32" cy="88" r="3.5" fill="currentColor"/><circle cx="168" cy="88" r="3.5" fill="currentColor"/>' +
    '<circle cx="32" cy="112" r="3.5" fill="currentColor"/><circle cx="168" cy="112" r="3.5" fill="currentColor"/>' +
    '<circle cx="44" cy="64" r="2.5" fill="currentColor"/><circle cx="156" cy="64" r="2.5" fill="currentColor"/>' +
    '<circle cx="44" cy="136" r="2.5" fill="currentColor"/><circle cx="156" cy="136" r="2.5" fill="currentColor"/>' +
    /* Bio-Circuit Neural Filament Traces */
    '<path d="M78 92 L62 100 L78 108 M122 92 L138 100 L122 108" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>';

  if (window.TitanAtmoCrest) {
    window.TitanAtmoCrest("xeno", CREST);
  } else if (window.TitanAtmo && window.TitanAtmo.defineCrest) {
    window.TitanAtmo.defineCrest("xeno", CREST);
  }

  if (window.TitanAtmo && window.TitanAtmo.setCard) {
    window.TitanAtmo.setCard("xeno", {
      name: "Xenohold",
      desc: "Derelict alien cargo hold. Obsidian hull, bone-white ink, bioluminescent sea-green telemetry, and non-human relic custody.",
      pair: "Pairs with · Deep Space Drone + Hull Resonator"
    });
  }
})();
