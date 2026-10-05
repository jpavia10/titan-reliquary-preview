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
      mood: "A silver coin on cut crystal, splitting light into rainbows.", fx: "prismatic", fxIntensity: 0.9, scene: null, tokens: {} },
    { id: "afterhours", name: "Midnight Gallery", collection: "Museum", tier: "classic", art: A("afterhours"),
      mood: "Cold moonlight on black marble, the gallery after midnight.", fx: "moonlit", fxIntensity: 0.85, scene: "afterhours", tokens: {} },
    { id: "conservator", name: "Conservator", collection: "Museum", tier: "classic", art: null,
      mood: "Archival paper and ledger lines, the conservator's desk at noon.", fx: "loupe", fxIntensity: 0.6, scene: "conservator", tokens: {} },
    { id: "colossus", name: "The Mint", collection: "Treasure", tier: "classic", art: A("colossus"),
      mood: "Molten silver, the coining press, ember light.", fx: "mint-forge", fxIntensity: 0.9, scene: null, tokens: {} },
    { id: "nocturne", name: "Nocturne", collection: "Moods", tier: "classic", art: null,
      mood: "A smoky jazz cellar: deep blue, brass, art deco.", fx: "bluenote", fxIntensity: 0.85, scene: "nocturne", tokens: {} },
    { id: "odyssey", name: "Odyssey", collection: "Journeys", tier: "classic", art: null,
      mood: "A night voyage toward an amber dawn.", fx: "voyage", fxIntensity: 0.85, scene: "odyssey", tokens: {} },
    { id: "cursedwing", name: "The Cursed Wing", collection: "Otherworld", tier: "classic", art: null,
      mood: "Black wax, blood-red seals, something in the walls.", fx: "crypt", fxIntensity: 0.9, scene: null, tokens: {} },
    { id: "abyss", name: "Shipwreck", collection: "Treasure", tier: "classic", art: A("abyss"),
      mood: "Forty fathoms down, god rays on a wreck.", fx: "deepsea", fxIntensity: 0.9, scene: null, tokens: {} },
    { id: "neon", name: "Neon Vault", collection: "Otherworld", tier: "classic", art: null,
      mood: "Chrome midnight, hot-pink horizon, wet streets.", fx: "nightcity", fxIntensity: 0.85, scene: "neon", tokens: {} },
    { id: "notepad", name: "Plaintext", collection: "Utility", tier: "classic", art: null,
      mood: "Black on white. Just the coins.", fx: "paperink", fxIntensity: 0.6, scene: null, tokens: {} },
    { id: "construct", name: "The Construct", collection: "Otherworld", tier: "classic", art: null,
      mood: "Green phosphor and falling code.", fx: "phosphor", fxIntensity: 0.8, scene: null, tokens: {} },
    { id: "xeno", name: "Xenohold", collection: "Otherworld", tier: "classic", art: null,
      mood: "Bioluminescent containment for strange artifacts.", fx: "spores", fxIntensity: 0.85, scene: null, tokens: {} },
    { id: "solaris", name: "Solar Observatory", collection: "Journeys", tier: "classic", art: null,
      mood: "Coronagraph gold on deep indigo.", fx: "coronagraph", fxIntensity: 0.85, scene: null, tokens: {} },
    { id: "alchemist", name: "The Alchemist", collection: "Otherworld", tier: "classic", art: null,
      mood: "Emerald vitriol and glowing hermetic rings.", fx: "athanor", fxIntensity: 0.85, scene: null, tokens: {} },
    { id: "glacier", name: "Hyperborean Vault", collection: "Treasure", tier: "classic", art: null,
      mood: "A bullion reserve in Arctic bedrock under aurora.", fx: "polar-ice", fxIntensity: 0.85, scene: "glacier", tokens: {} },
    { id: "valhalla", name: "Gilded Armory", collection: "Treasure", tier: "classic", art: null,
      mood: "Viking hoard hall by hearthfire.", fx: "mead-hall", fxIntensity: 0.9, scene: "valhalla", tokens: {} },
    { id: "dynasty", name: "Dynasty", collection: "Treasure", tier: "classic", art: null,
      mood: "Imperial lacquer, cinnabar and 24K gold foil.", fx: "lantern-feast", fxIntensity: 0.85, scene: null, tokens: {} },
    { id: "zen", name: "Zen Garden", collection: "Moods", tier: "classic", art: null,
      mood: "Raked gravel, wet slate and falling petals.", fx: "garden", fxIntensity: 0.85, scene: "zen", tokens: {} },
    { id: "samadhi", name: "Samadhi", collection: "Moods", tier: "classic", art: null,
      mood: "Saffron, sandalwood smoke and stillness.", fx: "incense-curl", fxIntensity: 0.85, scene: null, tokens: {} },
    { id: "silkroad", name: "Silk Road", collection: "Journeys", tier: "classic", art: null,
      mood: "Desert caravanserai, lapis tiles, starlight.", fx: "dunes", fxIntensity: 0.85, scene: null, tokens: {} }
  ];
  window.TITAN_WORLDS = worlds;
  window.TITAN_WORLD_BACKDROP = false;   // true = use the active World's hero art as the Hall hero backdrop (styles/worlds.css); easily removable
  window.TITAN_WORLD_COLLECTIONS = ["Museum", "Treasure", "Journeys", "Moods", "Otherworld", "Utility"];
})();
