/* Titan Reliquary: World manifest (data only). See notes/agents/theme-pot.md and notes/agents/theme-art.md.
   A World = { id, name, collection, mood, tier, art:{hero,card}|null, tokens, fx, scene }.
   - id: the data-atmo id (kept stable so saved choices carry over).
   - tier "signature": tokens (CSS custom properties only) + art + fx + scene; no layout overrides.
     tier "classic": an old atmosphere that still has its own stylesheet (styles/atmo/<id>.css).
   - art: filenames under art/themes/ (2026-10-01: from the Grok image queue, docs/art/requests/; kaleido re-done from Grok). null = no photoreal art yet (the picker shows the swatch).
   - tokens: custom properties applied inline on <html> for signature worlds.
   - fx / scene: TitanFX preset id and TitanGen scene id (null until those exist). */
(function () {
  "use strict";
  var A = function (id) { return { hero: id + ".webp", card: id + "-card.webp" }; };
  var worlds = [
    { id: "kaleido", name: "Prism", collection: "Otherworld", tier: "classic", art: A("kaleido"),
      mood: "A silver coin on cut crystal, splitting light into rainbows.", fx: "prismatic", fxIntensity: 0.75, scene: "prism", tokens: {} },
    { id: "afterhours", name: "Midnight Gallery", collection: "Museum", tier: "classic", art: A("afterhours"),
      mood: "Cold moonlight on black marble, the gallery after midnight.", fx: "moonlit", fxIntensity: 0.85, scene: "midnight-gallery", tokens: {} },
    { id: "conservator", name: "Conservator", collection: "Museum", tier: "classic", art: null,
      mood: "Archival paper and ledger lines, the conservator's desk at noon.", fx: "loupe", fxIntensity: 0.6, scene: "conservator", tokens: {} },
    { id: "colossus", name: "The Mint", collection: "Treasure", tier: "classic", art: A("colossus"),
      mood: "Molten silver, the coining press, ember light.", fx: "mint-forge", fxIntensity: 0.9, scene: "mint", tokens: {} },
    { id: "nocturne", name: "Nocturne", collection: "Moods", tier: "classic", art: null,
      mood: "A smoky jazz cellar: deep blue, brass, art deco.", fx: "bluenote", fxIntensity: 0.85, scene: "bluenote", tokens: {} },
    { id: "odyssey", name: "Odyssey", collection: "Journeys", tier: "classic", art: null,
      mood: "A night voyage toward an amber dawn.", fx: "voyage", fxIntensity: 0.85, scene: "cabin", tokens: {} },
    { id: "cursedwing", name: "The Cursed Wing", collection: "Otherworld", tier: "classic", art: null,
      mood: "Black wax, blood-red seals, something in the walls.", fx: "crypt", fxIntensity: 0.9, scene: "crypt", tokens: {} },
    { id: "abyss", name: "Shipwreck", collection: "Treasure", tier: "classic", art: A("abyss"),
      mood: "Forty fathoms down, god rays on a wreck.", fx: "deepsea", fxIntensity: 0.9, scene: "shipwreck", tokens: {} },
    { id: "neon", name: "Neon Vault", collection: "Otherworld", tier: "classic", art: null,
      mood: "Chrome midnight, hot-pink horizon, wet streets.", fx: "nightcity", fxIntensity: 0.85, scene: "nightcity", tokens: {} },
    { id: "notepad", name: "Plaintext", collection: "Utility", tier: "classic", art: null,
      mood: "Black on white. Just the coins.", fx: "paperink", fxIntensity: 0.6, scene: "privatebank", tokens: {} },
    { id: "construct", name: "The Construct", collection: "Otherworld", tier: "classic", art: null,
      mood: "Green phosphor and falling code.", fx: "phosphor", fxIntensity: 0.7, scene: "blacksite", tokens: {} },
    { id: "xeno", name: "Xenohold", collection: "Otherworld", tier: "classic", art: null,
      mood: "Bioluminescent containment for strange artifacts.", fx: "spores", fxIntensity: 0.85, scene: "xenohold", tokens: {} },
    { id: "solaris", name: "Solar Observatory", collection: "Journeys", tier: "classic", art: null,
      mood: "Coronagraph gold on deep indigo.", fx: "coronagraph", fxIntensity: 0.85, scene: "observatory", tokens: {} },
    { id: "alchemist", name: "The Alchemist", collection: "Otherworld", tier: "classic", art: null,
      mood: "Emerald vitriol and glowing hermetic rings.", fx: "athanor", fxIntensity: 0.85, scene: "alchemist", tokens: {} },
    { id: "glacier", name: "Hyperborean Vault", collection: "Treasure", tier: "classic", art: null,
      mood: "A bullion reserve in Arctic bedrock under aurora.", fx: "polar-ice", fxIntensity: 0.85, scene: "polar", tokens: {} },
    { id: "valhalla", name: "Gilded Armory", collection: "Treasure", tier: "classic", art: null,
      mood: "Viking hoard hall by hearthfire.", fx: "mead-hall", fxIntensity: 0.9, scene: "hoard", tokens: {} },
    { id: "dynasty", name: "Dynasty", collection: "Treasure", tier: "classic", art: null,
      mood: "Imperial lacquer, cinnabar and 24K gold foil.", fx: "lantern-feast", fxIntensity: 0.85, scene: "imperial", tokens: {} },
    { id: "zen", name: "Zen Garden", collection: "Moods", tier: "classic", art: null,
      mood: "Raked gravel, wet slate and falling petals.", fx: "garden", fxIntensity: 0.85, scene: "temple", tokens: {} },
    { id: "samadhi", name: "Samadhi", collection: "Moods", tier: "classic", art: null,
      mood: "Saffron, sandalwood smoke and stillness.", fx: "incense-curl", fxIntensity: 0.85, scene: "samadhi", tokens: {} },
    { id: "silkroad", name: "Silk Road", collection: "Journeys", tier: "classic", art: null,
      mood: "Desert caravanserai, lapis tiles, starlight.", fx: "dunes", fxIntensity: 0.85, scene: "caravanserai", tokens: {} },
    /* styles-20 (2026-10-10, notes/agents/styles-20.md): six token-only themes, one per style that no existing theme could host.
       Tokens live in styles/atmo/{id}.css (token block only) so they paint before any script; `ui` switches on shared treatments
       from styles/style-layer.css; `styles` names the styles from the owner's video each theme carries. Art: queued (rule 9). */
    { id: "arcade", name: "Arcade", collection: "Studio", tier: "signature", art: null, ui: ["pixel"], styles: ["Pixel art"],
      mood: "Insert coin: an 8-bit arcade where every piece is a token.", fx: "style-pixel", fxIntensity: 0.85, scene: "arcade", tokens: {} },
    { id: "pulp", name: "Pulp Adventure", collection: "Studio", tier: "signature", art: null, ui: ["paper", "brutal", "comic"], styles: ["Comic book"],
      mood: "A 1940s treasure-hunt comic: ink, Ben-Day dots, a POW on every find.", fx: "style-comic", fxIntensity: 0.8, scene: "pulp", tokens: {} },
    { id: "drafting", name: "Drafting Room", collection: "Museum", tier: "signature", art: null, ui: ["blueprint"], styles: ["Blueprint"],
      mood: "The engraver's drafting room: every coin drawn to scale.", fx: "style-blueprint", fxIntensity: 0.85, scene: "drafting", tokens: {} },
    { id: "diorama", name: "Clay Diorama", collection: "Studio", tier: "signature", art: null, ui: ["paper", "clay"], styles: ["Clay 3D", "Isometric"],
      mood: "A miniature vault in soft clay, seen from above like a toy model.", fx: "style-clay", fxIntensity: 0.8, scene: "diorama", tokens: {} },
    { id: "bauhaus", name: "Bauhaus", collection: "Studio", tier: "signature", art: null, ui: ["paper", "brutal"], styles: ["Bauhaus", "Kinetic type"],
      mood: "Primary shapes and moving type: the coin legends as a Bauhaus poster.", fx: "style-bauhaus+style-kinetic*0.8", fxIntensity: 0.8, scene: "bauhaus", tokens: {} },
    { id: "terminal", name: "Grand Terminal", collection: "Journeys", tier: "signature", art: null, ui: ["board"], styles: ["Split-flap"],
      mood: "A grand railway hall at night: fifty countries on the departures board.", fx: "style-splitflap", fxIntensity: 0.85, scene: "terminal", tokens: {} }
  ];
  /* styles-20: the styles each existing theme now carries (shown on its picker card) and its shared UI treatments */
  var STYLE_OF = { afterhours: ["Particles"], colossus: ["Liquid morph"], kaleido: ["Holographic"], neon: ["Neon glow", "Retro VHS"],
    solaris: ["Wireframe 3D"], glacier: ["Glassmorphism"], samadhi: ["Gradient mesh"], nocturne: ["Art deco"], conservator: ["Halftone"],
    notepad: ["Neo-brutalism"], construct: ["ASCII art"] };
  var UI_OF = { notepad: ["brutal"] };
  worlds.forEach(function (w) { if (STYLE_OF[w.id]) w.styles = STYLE_OF[w.id]; if (UI_OF[w.id]) w.ui = UI_OF[w.id]; });
  window.TITAN_WORLDS = worlds;
  window.TITAN_WORLD_BACKDROP = false;   // true = use the active World's hero art as the Hall hero backdrop (styles/worlds.css); easily removable
  window.TITAN_WORLD_COLLECTIONS = ["Museum", "Treasure", "Journeys", "Moods", "Otherworld", "Studio", "Utility"];
})();
