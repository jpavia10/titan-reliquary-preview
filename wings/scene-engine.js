/* Titan Reliquary — generative sound engine ("TitanGen").
   Everything is synthesized live with Web Audio: no files, no network, works offline.

   Signal path:
     ambient beds ──> ambBus ─┐                           ┌─> reverb ─┐
     music (pads/piano/bells/beat) ──> musBus ─┴─> bus ─> EQ(3) ─> soft limiter ─> master ─> [MediaStream -> hidden <audio>] or destination
   Scenes are "groups" of sources behind a fade gain; switching scenes builds a new group,
   crossfades, then stops and disconnects the old one (no leaks, no clicks).

   Background play: the master goes through MediaStreamAudioDestinationNode into a hidden
   <audio> element, so phones treat it as media playback (lock-screen controls via mediaSession,
   not throttled like a bare AudioContext). Pausing in the background is an option, OFF by default.
   Scheduling: a look-ahead scheduler (Worker-driven tick, 2.5 s ahead on the audio clock) so a
   throttled 1 s timer never causes gaps. */
(() => {
  "use strict";

  const LOOKAHEAD = 2.5;          // seconds scheduled ahead of the audio clock
  const TICK_MS = 250;
  const NOTE = { C: 0, "C#": 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const MODES = {
    major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
    minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9], minpent: [0, 3, 5, 7, 10]
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  /* ---------- real recordings (audio/ambience/*.webm|.m4a, see CREDITS.md) ----------
     Files are normalised to about -20 LUFS, so `trim` sets how loud a bed naturally sits against the others.
     kind "loop": a seamless loop (random start, breathing gain, 2 voices when short).
     kind "event": short one-shots at random intervals (`every` seconds) from `segs` = [offset, length] inside the file.
     fb = the synthesized bed used only if the recording cannot be fetched or decoded. */
  const REC = {
    rainLight:    { kind: "loop", group: "Rain", label: "Light rain",        icon: "🌦", trim: 0.55, pan: 0,     fb: "rain",   level: 0.7 },
    rainWindow:   { kind: "loop", group: "Rain", label: "Rain on window",    icon: "🪟", trim: 0.5,  pan: 0,     fb: "rain",   level: 0.7 },
    rainHeavy:    { kind: "loop", group: "Rain", label: "Heavy rain",        icon: "🌧", trim: 0.5,  pan: 0,     fb: "rain",   level: 0.8 },
    rainUmbrella: { kind: "loop", group: "Rain", label: "Rain on umbrella",  icon: "☂", trim: 0.45, pan: 0,     fb: "rain",   level: 0.7 },
    thunder:      { kind: "event", group: "Rain", label: "Thunder rolls",    icon: "⛈", trim: 0.7,  fb: "thunder", level: 0.6,
                    every: [30, 80], first: [9, 22], segs: [[0, 15], [15.5, 15], [31, 15]] },
    wind:         { kind: "loop", group: "Wind and water", label: "Wind",            icon: "🍃", trim: 0.4,  pan: 0,     fb: "wind",   level: 0.6 },
    windTrees:    { kind: "loop", group: "Wind and water", label: "Wind in trees",   icon: "🌲", trim: 0.4,  pan: 0,     fb: "wind",   level: 0.6 },
    windHowl:     { kind: "loop", group: "Wind and water", label: "Howling wind",    icon: "❄", trim: 0.4,  pan: 0,     fb: "wind",   level: 0.6 },
    river:        { kind: "loop", group: "Wind and water", label: "River",           icon: "🏞", trim: 0.45, pan: 0,     fb: "wind",   level: 0.6 },
    waves:        { kind: "loop", group: "Wind and water", label: "Ocean waves",     icon: "🌊", trim: 0.5,  pan: 0,     fb: "wind",   level: 0.6 },
    fire:         { kind: "loop", group: "Warmth", label: "Campfire",                icon: "🔥", trim: 0.55, pan: 0,     fb: "fire",   level: 0.8 },
    crickets:     { kind: "loop", group: "Night and animals", label: "Night crickets", icon: "🌙", trim: 0.4,  pan: 0,   fb: "insects", level: 0.7 },
    frogs:        { kind: "loop", group: "Night and animals", label: "Night frogs",    icon: "🐸", trim: 0.35, pan: 0.15, fb: "insects", level: 0.5 },
    village:      { kind: "loop", group: "Night and animals", label: "Night village",  icon: "🏘", trim: 0.45, pan: 0,   fb: "room",   level: 0.6 },
    birds:        { kind: "loop", group: "Night and animals", label: "Birdsong",       icon: "🐦", trim: 0.4,  pan: 0,   fb: null,     level: 0.6 },
    gulls:        { kind: "loop", group: "Night and animals", label: "Seagulls",       icon: "🕊", trim: 0.3,  pan: 0.2, fb: null,     level: 0.5 },
    owl:          { kind: "event", group: "Night and animals", label: "Owl calls",     icon: "🦉", trim: 0.6,  fb: null, level: 0.6,
                    every: [35, 90], first: [8, 18], segs: [[0, 3.4], [3.9, 3.2]] },
    library:      { kind: "loop", group: "Places", label: "Library hush",            icon: "📚", trim: 0.55, pan: 0,     fb: "room",   level: 0.7 },
    cafe:         { kind: "loop", group: "Places", label: "Café murmur",             icon: "☕", trim: 0.4,  pan: 0,     fb: "room",   level: 0.6 },
    hall:         { kind: "loop", group: "Places", label: "Stone hall",              icon: "🏛", trim: 0.5,  pan: 0,     fb: "hum",    level: 0.6 },
    trainIn:      { kind: "loop", group: "Places", label: "Inside a train",          icon: "🚆", trim: 0.45, pan: 0,     fb: "hum",    level: 0.7 },
    train:        { kind: "loop", group: "Places", label: "Train passing",           icon: "🚉", trim: 0.35, pan: 0,     fb: "hum",    level: 0.5 },
    clock:        { kind: "loop", group: "Things", label: "Clock ticking",           icon: "⏱", trim: 0.3,  pan: 0,     fb: "clock",  level: 0.6 },
    vinyl:        { kind: "loop", group: "Things", label: "Vinyl crackle",           icon: "💿", trim: 0.4,  pan: 0,     fb: "vinyl",  level: 0.6 },
    keys:         { kind: "loop", group: "Things", label: "Keyboard typing",         icon: "⌨", trim: 0.35, pan: 0,     fb: null,     level: 0.5 },
    pages:        { kind: "event", group: "Things", label: "Turning pages",          icon: "📖", trim: 0.55, fb: null, level: 0.6,
                    every: [20, 60], first: [6, 14], segs: [[0, 3.2], [3.7, 3.2], [7.4, 3.4]] },
    bowl:         { kind: "event", group: "Things", label: "Singing bowl",           icon: "🔔", trim: 0.45, fb: null, level: 0.6,
                    every: [50, 90], first: [10, 20], segs: [[0, 26]] },
    brown:        { kind: "loop", group: "Noise", label: "Brown noise",              icon: "🟤", trim: 0.3,  pan: 0,     fb: "hum",    level: 0.5 },
    leaves:       { kind: "loop", group: "Rain", label: "Rain on leaves",      icon: "🍃", trim: 0.45, pan: 0, fb: "rain",   level: 0.7 },
    underwater:   { kind: "loop", group: "Wind and water", label: "Underwater rumble", icon: "🫧", trim: 0.5, pan: 0, fb: "hum", level: 0.7 },
    drips:        { kind: "loop", group: "Wind and water", label: "Slow drips",    icon: "💧", trim: 0.3,  pan: 0, fb: null, level: 0.5 },
    waterfall:    { kind: "loop", group: "Wind and water", label: "Waterfall",     icon: "🏞", trim: 0.35, pan: 0, fb: "wind", level: 0.5 },
    ship:         { kind: "loop", group: "Wind and water", label: "Ship at anchor", icon: "⛵", trim: 0.5, pan: 0, fb: "wind", level: 0.6 },
    whale:        { kind: "event", group: "Night and animals", label: "Distant whale", icon: "🐋", trim: 0.5, fb: null, level: 0.6,
                    every: [60, 90], first: [12, 24], segs: [[0, 26]] },
    roomTone:     { kind: "loop", group: "Places", label: "Quiet room tone",       icon: "🏠", trim: 0.5,  pan: 0, fb: "room", level: 0.7 },
    labHum:       { kind: "loop", group: "Places", label: "Air handling hum",      icon: "🌀", trim: 0.4,  pan: 0, fb: "hum",  level: 0.6 },
    temple:       { kind: "loop", group: "Places", label: "Temple echo",           icon: "🛕", trim: 0.4,  pan: 0, fb: "hum",  level: 0.6 },
    crowd:        { kind: "loop", group: "Places", label: "Distant crowd",         icon: "👥", trim: 0.35, pan: 0, fb: "room", level: 0.5 },
    club:         { kind: "loop", group: "Places", label: "Club murmur",           icon: "🎷", trim: 0.45, pan: 0, fb: "room", level: 0.6 },
    city:         { kind: "loop", group: "Places", label: "City street",           icon: "🌆", trim: 0.4,  pan: 0, fb: "room", level: 0.6 },
    chimes:       { kind: "loop", group: "Things", label: "Wind chimes",           icon: "🎐", trim: 0.3,  pan: 0, fb: null, level: 0.5 },
    telemetry:    { kind: "loop", group: "Things", label: "Faint telemetry",       icon: "📡", trim: 0.15, pan: 0, fb: null, level: 0.5 },
    creak:        { kind: "event", group: "Things", label: "Timber creaks",        icon: "🪵", trim: 0.6, fb: null, level: 0.6,
                    every: [25, 70], first: [8, 18], segs: [[0, 3.6], [4.1, 3.6], [8.2, 3.6], [12.3, 3.6], [16.4, 3.6]] },
    clank:        { kind: "event", group: "Things", label: "Distant clunks",       icon: "🔩", trim: 0.45, fb: null, level: 0.6,
                    every: [20, 60], first: [8, 16], segs: [[0, 2.6], [3.1, 2.6], [6.2, 2.6], [9.3, 2.6]] },
    pink:         { kind: "loop", group: "Noise", label: "Pink noise",               icon: "🌸", trim: 0.25, pan: 0,     fb: "wind",   level: 0.5 }
  };
  /* Beds saved by earlier builds (synth names) map onto the real recordings. */
  const LEGACY = { rain: "rainWindow", thunder: "thunder", fire: "fire", room: "library", wind: "wind", insects: "crickets", hum: "hall", clock: "clock", vinyl: "vinyl" };
  const BED_ORDER = Object.keys(REC);
  const BEDS = {}; BED_ORDER.forEach((id) => { const r = REC[id]; BEDS[id] = { label: r.label, icon: r.icon, level: r.level, kind: r.kind, group: r.group }; });
  const BED_GROUPS = []; BED_ORDER.forEach((id) => { const g = REC[id].group; if (BED_GROUPS.indexOf(g) < 0) BED_GROUPS.push(g); });

  /* One-tap scenes. beds: id -> level 0..1 (loops and events); music flags below.
     Music sits under the ambience: soft pads, a little felt piano, music-box bells, never bright. */
  const SCENES = {
    rainy:   { name: "Rainy archive", icon: "🌧", desc: "Rain on the skylight, far thunder, a slow lo-fi beat.", atmo: "afterhours",
               beds: { rainWindow: 0.85, thunder: 0.5, library: 0.3 }, pad: 0.5, piano: true, bells: false, beat: true,
               root: "A", mode: "dorian", prog: [0, 3, 5, 4], chordSec: 0, gap: [5, 10], bpm: 68, vol: 0.55 },
    vault:   { name: "Midnight vault", icon: "🔒", desc: "A stone hall at night, a slow clock, a far bowl.", atmo: "nocturne",
               beds: { hall: 0.85, clock: 0.45, bowl: 0.6 }, pad: 0.4, piano: false, bells: true, beat: false,
               root: "E", mode: "phrygian", prog: [0, 0, 5, 3], chordSec: 18, gap: [10, 20], vol: 0.5 },
    lofi:    { name: "Lo-fi evening", icon: "🎧", desc: "A laid-back beat, vinyl crackle, soft keys, light rain.", atmo: "neon",
               beds: { vinyl: 0.75, rainLight: 0.3 }, pad: 0.45, piano: true, bells: true, beat: true,
               root: "C", mode: "dorian", prog: [1, 4, 0, 5], chordSec: 0, gap: [3, 7], bpm: 76, vol: 0.55 },
    garden:  { name: "Night garden", icon: "🌙", desc: "Crickets, a far owl, a light breeze, slow bells.", atmo: "zen",
               beds: { crickets: 0.8, frogs: 0.3, owl: 0.7, wind: 0.2 }, pad: 0.35, piano: false, bells: true, beat: false,
               root: "G", mode: "pent", prog: [0, 2, 1, 3], chordSec: 15, gap: [7, 13], vol: 0.5 },
    storm:   { name: "Thunderstorm", icon: "⛈", desc: "Heavy rain and rolling thunder, no music.", atmo: "odyssey",
               beds: { rainHeavy: 0.9, thunder: 1, windTrees: 0.35 }, pad: 0, piano: false, bells: false, beat: false,
               root: "D", mode: "minor", prog: [0], chordSec: 12, gap: [8, 12], vol: 0.55 },
    "midnight-gallery": { world: true, name: "Midnight Gallery", icon: "🏛", desc: "Room tone, far rain on the skylight, a slow clock.", atmo: "afterhours",
               beds: { roomTone: 0.55, rainWindow: 0.25, clock: 0.4 }, pad: 0.45, piano: true, bells: false, beat: false,
               root: "A", mode: "dorian", prog: [0, 3, 5, 4], chordSec: 15, gap: [8, 15], bpm: 70, vol: 0.5 },
    "conservator": { world: true, name: "Conservator's Bench", icon: "🔎", desc: "A hushed library, turning pages, a quiet clock.", atmo: "conservator",
               beds: { library: 0.8, pages: 0.65, clock: 0.3 }, pad: 0.55, piano: true, bells: false, beat: false,
               root: "D", mode: "lydian", prog: [0, 4, 3, 1], chordSec: 14, gap: [7, 14], bpm: 70, vol: 0.55 },
    "mint": { world: true, name: "The Mint", icon: "⚒", desc: "A furnace fire and distant metal clunks.", atmo: "colossus",
               beds: { fire: 0.75, clank: 0.75, roomTone: 0.2 }, pad: 0.35, piano: false, bells: true, beat: false,
               root: "D", mode: "minor", prog: [0, 0, 3, 4], chordSec: 18, gap: [10, 20], bpm: 70, vol: 0.5 },
    "hoard": { world: true, name: "Hoard Hall", icon: "🛡", desc: "Hearth fire, wind in the timbers, a creaking beam.", atmo: "valhalla",
               beds: { fire: 0.8, windTrees: 0.3, creak: 0.6 }, pad: 0.5, piano: false, bells: true, beat: false,
               root: "E", mode: "phrygian", prog: [0, 5, 3, 0], chordSec: 17, gap: [9, 18], bpm: 70, vol: 0.5 },
    "bluenote": { world: true, name: "Blue Note", icon: "🎷", desc: "Club murmur, vinyl crackle, rain outside, soft piano.", atmo: "nocturne",
               beds: { club: 0.6, vinyl: 0.4, rainWindow: 0.25 }, pad: 0.3, piano: true, bells: false, beat: false,
               root: "C", mode: "dorian", prog: [1, 4, 0, 5], chordSec: 14, gap: [4, 9], bpm: 70, vol: 0.5 },
    "cabin": { world: true, name: "Captain's Cabin", icon: "⚓", desc: "Waves on the hull, creaking timber, gulls.", atmo: "odyssey",
               beds: { waves: 0.6, ship: 0.35, creak: 0.6, gulls: 0.3 }, pad: 0.4, piano: false, bells: true, beat: false,
               root: "G", mode: "major", prog: [0, 3, 4, 0], chordSec: 16, gap: [9, 18], bpm: 70, vol: 0.5 },
    "shipwreck": { world: true, name: "Shipwreck", icon: "🌊", desc: "Deep underwater rumble and a distant whale.", atmo: "abyss",
               beds: { underwater: 0.85, whale: 0.6 }, pad: 0.55, piano: false, bells: true, beat: false,
               root: "Bb", mode: "lydian", prog: [0, 1, 4, 1], chordSec: 18, gap: [10, 20], bpm: 70, vol: 0.5 },
    "prism": { world: true, name: "Prism", icon: "🔮", desc: "Glassy pads and soft wind chimes.", atmo: "kaleido",
               beds: { chimes: 0.6, wind: 0.12 }, pad: 0.6, piano: false, bells: true, beat: false,
               root: "F", mode: "lydian", prog: [0, 4, 1, 3], chordSec: 16, gap: [6, 12], bpm: 70, vol: 0.5 },
    "nightcity": { world: true, name: "Night City", icon: "🌃", desc: "Rain on wet glass, traffic far below.", atmo: "neon",
               beds: { rainWindow: 0.65, city: 0.5 }, pad: 0.4, piano: true, bells: true, beat: true,
               root: "C", mode: "dorian", prog: [1, 4, 0, 5], chordSec: 0, gap: [4, 8], bpm: 74, vol: 0.5 },
    "blacksite": { world: true, name: "Black Site", icon: "🛰", desc: "Air handling hum and faint telemetry.", atmo: "construct",
               beds: { labHum: 0.65, roomTone: 0.3, telemetry: 0.6 }, pad: 0.3, piano: false, bells: false, beat: false,
               root: "E", mode: "minor", prog: [0, 0, 5, 3], chordSec: 20, gap: [10, 20], bpm: 70, vol: 0.45 },
    "crypt": { world: true, name: "Forbidden Wing", icon: "🕯", desc: "Slow drips, a cold draught, a far bell.", atmo: "cursedwing",
               beds: { drips: 0.6, windHowl: 0.3, hall: 0.4, bowl: 0.45 }, pad: 0.35, piano: false, bells: true, beat: false,
               root: "E", mode: "phrygian", prog: [0, 1, 0, 5], chordSec: 19, gap: [10, 20], bpm: 70, vol: 0.45 },
    "observatory": { world: true, name: "Observatory", icon: "🔭", desc: "Night crickets, a thin wind, clockwork ticking.", atmo: "solaris",
               beds: { crickets: 0.55, wind: 0.25, clock: 0.35 }, pad: 0.5, piano: false, bells: true, beat: false,
               root: "G", mode: "pent", prog: [0, 2, 1, 3], chordSec: 16, gap: [7, 14], bpm: 70, vol: 0.5 },
    "alchemist": { world: true, name: "Alchemist's Study", icon: "⚗", desc: "A low fire, turning pages, a still room.", atmo: "alchemist",
               beds: { fire: 0.5, pages: 0.55, roomTone: 0.25 }, pad: 0.45, piano: true, bells: false, beat: false,
               root: "A", mode: "minor", prog: [0, 5, 2, 4], chordSec: 16, gap: [8, 16], bpm: 70, vol: 0.5 },
    "polar": { world: true, name: "Polar Vault", icon: "❄", desc: "Howling wind over ice and a deep stillness.", atmo: "glacier",
               beds: { windHowl: 0.7, wind: 0.3, roomTone: 0.2 }, pad: 0.65, piano: false, bells: true, beat: false,
               root: "Bb", mode: "lydian", prog: [0, 1, 4, 1], chordSec: 17, gap: [9, 18], bpm: 70, vol: 0.5 },
    "imperial": { world: true, name: "Imperial Treasury", icon: "🏮", desc: "Wind chimes, a light breeze, water far away.", atmo: "dynasty",
               beds: { chimes: 0.55, wind: 0.2, waterfall: 0.15 }, pad: 0.4, piano: false, bells: true, beat: false,
               root: "D", mode: "pent", prog: [0, 2, 1, 3], chordSec: 15, gap: [6, 12], bpm: 70, vol: 0.5 },
    "temple": { world: true, name: "Temple Garden", icon: "⛩", desc: "Rain on leaves, water, a singing bowl.", atmo: "zen",
               beds: { leaves: 0.65, waterfall: 0.3, drips: 0.2, bowl: 0.7 }, pad: 0.3, piano: false, bells: true, beat: false,
               root: "G", mode: "pent", prog: [0, 2, 1, 3], chordSec: 16, gap: [8, 16], bpm: 70, vol: 0.5 },
    "caravanserai": { world: true, name: "Caravanserai", icon: "🐪", desc: "Desert wind, a small fire, soft chimes (no camel bells in the library).", atmo: "silkroad",
               beds: { wind: 0.45, fire: 0.4, chimes: 0.15, crickets: 0.3 }, pad: 0.45, piano: false, bells: true, beat: false,
               root: "D", mode: "dorian", prog: [0, 3, 0, 4], chordSec: 18, gap: [9, 18], bpm: 70, vol: 0.5 },
    "fireside": { world: true, name: "Fireside Den", icon: "🛋", desc: "A crackling fire, snow wind at the window, a clock.", atmo: null,
               beds: { fire: 0.9, windHowl: 0.2, clock: 0.25 }, pad: 0.55, piano: true, bells: false, beat: false,
               root: "F", mode: "major", prog: [0, 5, 3, 4], chordSec: 13, gap: [7, 14], bpm: 70, vol: 0.55 },
    "roman": { world: true, name: "Roman Treasury", icon: "🏺", desc: "Temple echo and a far crowd.", atmo: null,
               beds: { temple: 0.6, crowd: 0.25, hall: 0.2 }, pad: 0.4, piano: false, bells: true, beat: false,
               root: "D", mode: "minor", prog: [0, 3, 4, 0], chordSec: 18, gap: [10, 20], bpm: 70, vol: 0.5 },
    "privatebank": { world: true, name: "Private Bank", icon: "🏦", desc: "Quiet room tone, nothing else.", atmo: null,
               beds: { roomTone: 0.65 }, pad: 0.35, piano: true, bells: false, beat: false,
               root: "C", mode: "major", prog: [0, 4, 3, 4], chordSec: 16, gap: [10, 18], bpm: 70, vol: 0.45 },
    coast:   { name: "Coastal reading room", icon: "🌊", desc: "Waves below the window, gulls, turning pages, soft keys.", atmo: "abyss",
               beds: { waves: 0.8, gulls: 0.35, pages: 0.6, wind: 0.15 }, pad: 0.5, piano: true, bells: false, beat: false,
               root: "G", mode: "lydian", prog: [0, 4, 1, 3], chordSec: 15, gap: [8, 15], vol: 0.55 },
    closing: { name: "Library at closing", icon: "🕯", desc: "Rain on the glass, a ticking clock, the last pages turning.", atmo: "alchemist",
               beds: { library: 0.6, rainWindow: 0.35, clock: 0.4, pages: 0.8 }, pad: 0.45, piano: true, bells: false, beat: false,
               root: "A", mode: "minor", prog: [0, 5, 2, 4], chordSec: 16, gap: [8, 16], vol: 0.5 },
    train:   { name: "Train through the night", icon: "🚆", desc: "The rhythm of the rails, rain on the window, a slow pad.", atmo: "silkroad",
               beds: { trainIn: 0.85, rainWindow: 0.3 }, pad: 0.55, piano: false, bells: true, beat: false,
               root: "D", mode: "dorian", prog: [0, 3, 0, 4], chordSec: 18, gap: [10, 20], vol: 0.5 },
    cafe:    { name: "Café on the corner", icon: "☕", desc: "Quiet chatter, rain on the umbrellas, soft piano.", atmo: "dynasty",
               beds: { cafe: 0.75, rainUmbrella: 0.3, vinyl: 0.25 }, pad: 0.4, piano: true, bells: false, beat: false,
               root: "F", mode: "major", prog: [0, 3, 4, 3], chordSec: 14, gap: [5, 10], vol: 0.5 }
  };
  const SOUND_ORDER = ["rainy", "vault", "lofi", "garden", "storm", "coast", "closing", "train", "cafe"];
  const WORLD_ORDER = ["midnight-gallery", "conservator", "mint", "hoard", "bluenote", "cabin", "shipwreck", "prism", "nightcity", "blacksite", "crypt", "observatory", "alchemist", "polar", "imperial", "temple", "caravanserai", "fireside", "roman", "privatebank"];
  const SCENE_ORDER = SOUND_ORDER;                 // the one-tap "Sound only" presets; World scenes are SCENES[id] for id in WORLD_ORDER
  const ALIASES = { study: "conservator", hearth: "fireside", snow: "polar" };   // scene ids saved by earlier builds

  const E = {
    ctx: null, groups: [], playing: false, paused: false, mix: null, name: "",
    vol: 0.6, musLevel: 0.9, ambLevel: 0.9, bass: 0, mid: 0, treble: 0, duck: false,
    bgPause: false, worker: null, timer: 0, msd: null, el: null, via: "none", killedSources: 0,
    bufs: {}, sweepAt: 0, decoded: 0, released: 0, fallbacks: 0
  };

  function emit(type) { try { window.dispatchEvent(new CustomEvent("titan:gen", { detail: { type, playing: E.playing, paused: E.paused, name: E.name } })); } catch (e) { /* ignore */ } }

  /* ---------- noise ---------- */
  function mkNoise(ctx, type, sec) {
    const sr = ctx.sampleRate, n = Math.floor(sr * sec), F = Math.floor(sr * 0.15);
    const tmp = new Float32Array(n + F);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, pk = 0;
    for (let i = 0; i < n + F; i++) {
      const w = Math.random() * 2 - 1;
      let v;
      if (type === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
      } else if (type === "brown") { last = (last + 0.02 * w) / 1.02; v = last * 3.5; }
      else v = w;
      tmp[i] = v; if (Math.abs(v) > pk) pk = Math.abs(v);
    }
    const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), g = 0.9 / (pk || 1);
    for (let i = 0; i < n; i++) d[i] = tmp[i] * g;
    for (let i = 0; i < F; i++) { const a = i / F; d[i] = (tmp[i] * a + tmp[n + i] * (1 - a)) * g; }
    return buf;
  }
  /* Hall impulse: pre-delay, sparse early reflections, then a diffuse tail that gets darker as it decays (RT60 = rt60). */
  function mkHall(ctx, rt60, pre) {
    const sr = ctx.sampleRate, p = Math.floor(pre * sr), n = Math.floor(sr * (rt60 * 1.15)) + p, buf = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c); let lp = 0, lp2 = 0;
      for (let k = 0; k < 10; k++) { const t = p + Math.floor(sr * (0.004 + 0.075 * Math.pow(Math.random(), 1.3))); if (t < n) d[t] += (Math.random() < 0.5 ? -1 : 1) * 0.55 * Math.pow(0.82, k); }
      for (let i = p; i < n; i++) {
        const t = (i - p) / sr, env = Math.exp(-6.91 * t / rt60) * Math.min(1, t / 0.04), coef = 0.62 - 0.52 * Math.min(1, t / (rt60 * 0.8));
        lp += ((Math.random() * 2 - 1) - lp) * coef; lp2 += (lp - lp2) * 0.7;
        d[i] += lp2 * env * 0.9;
      }
    }
    return buf;
  }
  function tapeCurve(k) {
    const n = 1024, c = new Float32Array(n), th = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / th; }
    return c;
  }

  /* ---------- engine bring-up (must be called from a user gesture) ---------- */
  function ensure() {
    if (E.ctx) return E.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let ctx;
    try { ctx = new AC({ latencyHint: "playback" }); } catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
    E.ctx = ctx;
    E.pink = mkNoise(ctx, "pink", 4);
    E.brown = mkNoise(ctx, "brown", 4);
    E.white = mkNoise(ctx, "white", 0.6);
    const bus = ctx.createGain();
    E.ambBus = ctx.createGain(); E.musBus = ctx.createGain();
    E.ambBus.connect(bus);
    // Music gets a little tape colour (gentle high cut + soft tanh saturation) before the bus.
    const musTone = ctx.createBiquadFilter(); musTone.type = "lowpass"; musTone.frequency.value = 6800; musTone.Q.value = 0.4;
    const musDrive = ctx.createGain(); musDrive.gain.value = 1.5;
    const sat = ctx.createWaveShaper(); sat.curve = tapeCurve(1.6); try { sat.oversample = "2x"; } catch (e) { /* ignore */ }
    const musMake = ctx.createGain(); musMake.gain.value = 0.7;
    E.musBus.connect(musTone); musTone.connect(musDrive); musDrive.connect(sat); sat.connect(musMake); musMake.connect(bus);
    // Reverb: a long dark hall tail for the music only (the recordings carry their own space; a second convolver cost frames on phones).
    const verbM = ctx.createConvolver(); verbM.buffer = mkHall(ctx, 4.8, 0.03);
    const musSend = ctx.createGain(), wetM = ctx.createGain();
    musSend.gain.value = 0.55; wetM.gain.value = 0.85;
    E.musBus.connect(musSend);
    musSend.connect(verbM); verbM.connect(wetM); wetM.connect(bus);
    const lo = ctx.createBiquadFilter(); lo.type = "lowshelf"; lo.frequency.value = 140;
    const mid = ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1100; mid.Q.value = 0.7;
    const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 4500;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 24;     // no DC / rumble below hearing
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 10; comp.attack.value = 0.006; comp.release.value = 0.3;
    const master = ctx.createGain(); master.gain.value = 0;
    const an = ctx.createAnalyser(); an.fftSize = 512;
    bus.connect(hp); hp.connect(lo); lo.connect(mid); mid.connect(hi); hi.connect(comp); comp.connect(master); master.connect(an);
    E.bus = bus; E.eq = { lo, mid, hi }; E.master = master; E.an = an; E.anBuf = new Float32Array(an.fftSize);
    // Route to a hidden <audio> via MediaStream so mobile OSes keep it alive in the background.
    let routed = false;
    try {
      if (ctx.createMediaStreamDestination) {
        const msd = ctx.createMediaStreamDestination();
        const el = document.createElement("audio");
        el.setAttribute("playsinline", ""); el.setAttribute("aria-hidden", "true"); el.hidden = true; el.loop = false;
        el.srcObject = msd.stream;
        document.body.appendChild(el);
        const pr = el.play();
        if (pr && pr.then) pr.then(() => { E.via = "media"; }).catch(() => { fallbackDirect(); });
        master.connect(msd);
        E.msd = msd; E.el = el; routed = true; E.via = "media";
      }
    } catch (e) { routed = false; }
    if (!routed) fallbackDirect();
    applyTone(); applyLevels();
    ctx.onstatechange = () => emit("state");
    startTimer();
    return ctx;
  }
  function fallbackDirect() {
    if (!E.ctx || E.via === "direct") return;
    try { E.master.disconnect(E.msd); } catch (e) { /* ignore */ }
    try { if (E.el) { E.el.pause(); E.el.srcObject = null; E.el.remove(); } } catch (e) { /* ignore */ }
    E.el = null; E.msd = null;
    try { E.master.connect(E.ctx.destination); } catch (e) { /* ignore */ }
    E.via = "direct";
  }

  function startTimer() {
    if (E.worker || E.timer) return;
    try {
      const url = URL.createObjectURL(new Blob([`let t=0;onmessage=e=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),${TICK_MS});};`], { type: "text/javascript" }));
      E.worker = new Worker(url);
      E.worker.onmessage = tick;
      E.worker.postMessage(1);
      return;
    } catch (e) { E.worker = null; }
    E.timer = setInterval(tick, TICK_MS);
  }
  function stopTimer() {
    if (E.worker) { try { E.worker.postMessage(0); E.worker.terminate(); } catch (e) { /* ignore */ } E.worker = null; }
    if (E.timer) { clearInterval(E.timer); E.timer = 0; }
  }
  function tick() {
    const ctx = E.ctx;
    if (!ctx) return;
    const now = performance.now();
    if (now > E.sweepAt) { E.sweepAt = now + 5000; releaseIdle(IDLE_MS); }
    if (ctx.state !== "running") return;
    const t0 = ctx.currentTime, t1 = t0 + LOOKAHEAD;
    for (const g of E.groups) { if (g.dead) continue; for (const fn of g.tickers) { try { fn(t0, t1); } catch (e) { /* keep going */ } } }
  }

  /* ---------- tone / levels ---------- */
  function applyTone() {
    if (!E.ctx) return; const t = E.ctx.currentTime;
    E.eq.lo.gain.setTargetAtTime(E.bass, t, 0.05); E.eq.mid.gain.setTargetAtTime(E.mid, t, 0.05); E.eq.hi.gain.setTargetAtTime(E.treble, t, 0.05);
  }
  function applyLevels() {
    if (!E.ctx) return; const t = E.ctx.currentTime;
    E.ambBus.gain.setTargetAtTime(E.ambLevel, t, 0.08);
    E.musBus.gain.setTargetAtTime(E.duck ? 0 : E.musLevel, t, 0.25);
  }
  function masterTarget() { return (E.playing && !E.paused) ? Math.pow(E.vol, 1.7) * 0.85 : 0; }
  function applyMaster(tc) { if (!E.ctx) return; E.master.gain.setTargetAtTime(masterTarget(), E.ctx.currentTime, tc || 0.12); }

  /* ---------- group (one scene's sources) ---------- */
  function mkGroup() {
    const ctx = E.ctx;
    const g = { dead: false, srcs: [], tickers: [], rel: [], lv: {}, fell: {}, born: ctx.currentTime, fadeSec: 0, bed: ctx.createGain(), mus: ctx.createGain(), bedOut: ctx.createGain(), musOut: ctx.createGain(), t0: ctx.currentTime + 0.05 };
    g.bed.connect(g.bedOut); g.mus.connect(g.musOut); g.bedOut.connect(E.ambBus); g.musOut.connect(E.musBus);
    g.bedOut.gain.value = 0; g.musOut.gain.value = 0;
    g.src = (s) => { g.srcs.push(s); s.onended = () => { const i = g.srcs.indexOf(s); if (i >= 0) g.srcs.splice(i, 1); try { s.disconnect(); } catch (e) { /* ignore */ } }; return s; };
    /* equal-power crossfade (sin in / cos out) so two scenes never dip in the middle; linear ramp as a fallback */
    g.fade = (to, sec) => {
      const t = ctx.currentTime; sec = Math.max(0.05, sec); g.fadeSec = sec; g.fadeAt = t;
      for (const p of [g.bedOut.gain, g.musOut.gain]) {
        const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t);
        if (Math.abs(to - v) < 1e-4) continue;
        try {
          const n = 48, c = new Float32Array(n), up = to > v;
          for (let i = 0; i < n; i++) { const x = Math.PI / 2 * i / (n - 1); c[i] = up ? v + (to - v) * Math.sin(x) : to + (v - to) * Math.cos(x); }
          p.setValueCurveAtTime(c, t + 0.001, sec);
        } catch (e) { p.linearRampToValueAtTime(to, t + sec); }
      }
    };
    g.kill = () => {
      if (g.dead) return; g.dead = true; g.tickers.length = 0;
      for (const s of g.srcs.slice()) { try { s.onended = null; s.stop(); } catch (e) { /* ignore */ } try { s.disconnect(); } catch (e) { /* ignore */ } E.killedSources++; }
      g.srcs.length = 0;
      for (const fn of g.rel.splice(0)) { try { fn(); } catch (e) { /* ignore */ } }
      for (const n of [g.bed, g.mus, g.bedOut, g.musOut]) { try { n.disconnect(); } catch (e) { /* ignore */ } }
      const i = E.groups.indexOf(g); if (i >= 0) E.groups.splice(i, 1);
    };
    g.noise = (type, off) => { const s = g.src(ctx.createBufferSource()); s.buffer = E[type]; s.loop = true; s.start(0, off == null ? Math.random() * 3 : off); return s; };
    g.filter = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; };
    g.gain = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    g.osc = (type, f, detune) => { const o = g.src(ctx.createOscillator()); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; o.start(); return o; };
    /* repeating event: fn(time) is called for each event whose time falls in the look-ahead window */
    g.every = (first, nextGap, fn) => {
      let next = ctx.currentTime + first;
      g.tickers.push((t0, t1) => { if (next < t0) next = t0; while (next < t1) { fn(next); next += nextGap(); } });
    };
    return g;
  }

  /* Pre-rendered textures. Rain drops, fire pops, crickets, clock ticks and the beat are synthesized
     ONCE into short looping buffers (a few ms of JS), so playing them costs the main thread nothing. */
  function mkTex(key, sec, fn) {
    E.tex = E.tex || {};
    if (E.tex[key]) return E.tex[key];
    const ctx = E.ctx, sr = ctx.sampleRate, n = Math.floor(sr * sec), buf = ctx.createBuffer(2, n, sr);
    fn(buf.getChannelData(0), buf.getChannelData(1), sr, n);
    E.tex[key] = buf; return buf;
  }
  function stampNoise(L, R, sr, n, t, o) {          // o: f, q, peak, dur, pan, hp
    const len = Math.floor(o.dur * sr), s0 = Math.floor(t * sr), atk = Math.max(2, Math.floor(0.0015 * sr));
    const pan = o.pan || 0, gl = pan > 0 ? 1 - pan : 1, gr = pan < 0 ? 1 + pan : 1;
    let b0, b2, a1, a2, a0, hpa, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    if (o.hp) hpa = Math.exp(-2 * Math.PI * o.f / sr);
    else { const w0 = 2 * Math.PI * o.f / sr, al = Math.sin(w0) / (2 * o.q); b0 = al; b2 = -al; a0 = 1 + al; a1 = -2 * Math.cos(w0); a2 = 1 - al; }
    const tail = len + Math.floor(0.004 * sr);
    for (let i = 0; i < tail; i++) {
      const x = Math.random() * 2 - 1; let y;
      if (o.hp) { y = hpa * (y1 + x - x1); x1 = x; y1 = y; }
      else { y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; y *= 2.2; }
      const env = (i < atk ? i / atk : Math.exp(-5.5 * (i - atk) / len)) * o.peak;
      const k = (s0 + i) % n, v = y * env; L[k] += v * gl; R[k] += v * gr;
    }
  }
  function stampKick(L, R, sr, n, t, peak) {
    const s0 = Math.floor(t * sr), len = Math.floor(0.36 * sr); let ph = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / sr; ph += 2 * Math.PI * (42 + 88 * Math.exp(-tt * 24)) / sr;
      const v = Math.sin(ph) * Math.exp(-tt * 10) * Math.min(1, tt / 0.004) * peak, k = (s0 + i) % n; L[k] += v; R[k] += v;
    }
  }
  const poisson = (rate) => -Math.log(1 - Math.random()) / rate;
  function texRain() { return mkTex("rain", 9, (L, R, sr, n) => { for (let t = 0.05; t < 8.95; t += poisson(13)) stampNoise(L, R, sr, n, t, { f: rnd(1800, 6500), q: rnd(3, 8), peak: rnd(0.04, 0.2), dur: rnd(0.015, 0.04), pan: rnd(-0.8, 0.8) }); }); }
  function texFire() { return mkTex("fire", 11, (L, R, sr, n) => { for (let t = 0.05; t < 10.9; t += poisson(9)) { const big = Math.random() < 0.08; stampNoise(L, R, sr, n, t, { f: rnd(700, 4800), q: rnd(1, 3), peak: big ? rnd(0.3, 0.5) : Math.pow(Math.random(), 2) * 0.28 + 0.02, dur: big ? rnd(0.03, 0.07) : rnd(0.008, 0.03), pan: rnd(-0.5, 0.5) }); } }); }
  function texVinyl() { return mkTex("vinyl", 8, (L, R, sr, n) => { for (let t = 0.1; t < 7.9; t += poisson(3.5)) stampNoise(L, R, sr, n, t, { f: rnd(1500, 6000), q: 1.5, peak: rnd(0.04, 0.2), dur: rnd(0.004, 0.015), pan: rnd(-0.4, 0.4) }); }); }
  function texClock() { return mkTex("clock", 2, (L, R, sr, n) => { [[0, 2300, 760], [1, 1500, 520]].forEach(([t, f1, f2]) => { stampNoise(L, R, sr, n, t, { f: f1, q: 7, peak: 0.34, dur: 0.028 }); stampNoise(L, R, sr, n, t, { f: f2, q: 3, peak: 0.16, dur: 0.05 }); }); }); }
  function texCrickets() {
    return mkTex("crickets", 12, (L, R, sr, n) => {
      [4100, 4380, 4720].forEach((f, vi) => {
        const pan = (vi - 1) * 0.6, gl = pan > 0 ? 1 - pan : 1, gr = pan < 0 ? 1 + pan : 1;
        for (let t = rnd(0.2, 2); t < 11.2; t += rnd(1.4, 4.2)) {
          const pulses = 3 + Math.floor(Math.random() * 3), sp = rnd(0.065, 0.085);
          for (let k = 0; k < pulses; k++) {
            const s0 = Math.floor((t + k * sp) * sr), len = Math.floor(0.032 * sr);
            for (let i = 0; i < len; i++) { const e = Math.sin(Math.PI * i / len), v = Math.sin(2 * Math.PI * f * i / sr) * e * 0.05, j = (s0 + i) % n; L[j] += v * gl; R[j] += v * gr; }
          }
        }
      });
    });
  }
  function texBeat(bpm) {
    return mkTex("beat" + bpm, 60 / bpm * 8, (L, R, sr, n) => {
      const sd = 60 / bpm / 4;
      for (let step = 0; step < 32; step++) {
        const st = step % 16, t = step * sd + ((st % 2) ? sd * 0.2 : 0);
        if (st === 0 || st === 10 || (st === 7 && step < 16) || (st === 14 && step >= 16)) stampKick(L, R, sr, n, t, 0.46);
        if (st === 4 || st === 12) { stampNoise(L, R, sr, n, t, { f: 1900, q: 0.7, peak: 0.26, dur: 0.17 }); stampNoise(L, R, sr, n, t, { f: 190, q: 2, peak: 0.12, dur: 0.1 }); }
        if (st % 2 === 0) stampNoise(L, R, sr, n, t, { hp: 1, f: 7500, peak: (st % 4 === 0 ? 0.07 : 0.045) * (0.7 + Math.random() * 0.5), dur: 0.045, pan: 0.2 });
        else if (Math.random() < 0.3) stampNoise(L, R, sr, n, t, { hp: 1, f: 8200, peak: 0.03, dur: 0.03, pan: -0.2 });
      }
    });
  }
  function loopTex(g, buf, out, gain, at) {
    const s = g.src(E.ctx.createBufferSource()); s.buffer = buf; s.loop = true;
    const v = g.gain(gain); s.connect(v); v.connect(out); s.start(at || 0, at ? 0 : Math.random() * (buf.duration - 0.5)); return s;
  }

  /* short noise burst through a band filter with an exponential decay (used only for rare events) */
  function burst(out, t, o) {
    const ctx = E.ctx, s = ctx.createBufferSource(); s.buffer = E.white;
    const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass"; f.frequency.value = o.f; f.Q.value = o.q || 1;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(o.peak, t + (o.atk || 0.002)); a.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(a);
    let last = a;
    if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; a.connect(p); last = p; }
    last.connect(out);
    s.start(t, Math.random() * 0.3, o.dur + 0.03);
  }
  function lfo(g, rate, depth, target) {
    const o = g.osc("sine", rate), d = g.gain(depth); o.connect(d); d.connect(target); return o;
  }

  /* ---------- recorded beds: fetch + decode once (lazily), loop with random offsets, breathe, place in the stereo field ---------- */
  const AMB_URL = (() => { try { return new URL("audio/ambience/", document.baseURI).href; } catch (e) { return "audio/ambience/"; } })();
  const EXTS = (() => {
    const ua = navigator.userAgent || "";
    const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Android|Edg|OPR/.test(ua);
    return (ios || safari) ? ["m4a", "webm"] : ["webm", "m4a"];     // Opus/WebM first, AAC/M4A for Safari
  })();
  const fromDb = (db) => Math.pow(10, db / 20);
  const IDLE_MS = 120000;           // a decoded buffer nobody has used for this long is released

  function loadBuf(id) {
    const ctx = E.ctx; if (!ctx || !REC[id]) return Promise.resolve(null);
    let r = E.bufs[id];
    if (r) { r.last = performance.now(); return r.p; }
    r = E.bufs[id] = { buf: null, uses: 0, last: performance.now(), p: null };
    const me = r;
    r.p = (async () => {
      for (const x of EXTS) {
        try {
          const res = await fetch(AMB_URL + id + "." + x);
          if (!res.ok) continue;
          const ab = await res.arrayBuffer();
          const buf = await new Promise((ok, no) => { const q = ctx.decodeAudioData(ab, ok, no); if (q && q.catch) q.catch(no); });
          me.buf = buf; E.decoded++; return buf;
        } catch (e) { /* try the other codec */ }
      }
      if (E.bufs[id] === me) delete E.bufs[id];      // allow a retry later (a network blip must not stick)
      return null;
    })();
    return r.p;
  }
  /* A group "holds" the buffers it plays; they are released 2 minutes after the last holder is gone. */
  function holdBuf(g, id) {
    const r = E.bufs[id]; if (!r) return;
    r.uses++;
    g.rel.push(() => { r.uses = Math.max(0, r.uses - 1); r.last = performance.now(); });
  }
  function releaseIdle(maxAge) {
    const now = performance.now(); let n = 0;
    for (const id of Object.keys(E.bufs)) {
      const r = E.bufs[id];
      if (r.buf && r.uses === 0 && now - r.last > maxAge) { delete E.bufs[id]; n++; E.released++; }
    }
    return n;
  }
  function fallback(g, id, L) {            // recording unavailable: use the synthesized bed (once per kind)
    E.fallbacks++;
    const fb = REC[id].fb;
    if (!fb || g.fell[fb] || g.dead || !BUILD[fb]) return;
    g.fell[fb] = 1;
    try { BUILD[fb](g, L * 0.8); } catch (e) { /* ignore */ }
  }
  /* slow random gain drift (+-depthDb over per[0]..per[1] s) so a loop never feels static */
  function breathe(g, param, depthDb, per) {
    let T = E.ctx.currentTime, v = 1;
    g.tickers.push((t0, t1) => {
      if (T < t0) T = t0;
      while (T < t1) {
        const dur = rnd(per[0], per[1]), to = fromDb(rnd(-depthDb, depthDb));
        param.setValueAtTime(v, T); param.linearRampToValueAtTime(to, T + dur); T += dur; v = to;
      }
    });
  }
  function panned(ctx, node, p) {
    if (!p || !ctx.createStereoPanner) return node;
    const sp = ctx.createStereoPanner(); sp.pan.value = Math.max(-1, Math.min(1, p)); node.connect(sp); return sp;
  }
  function recLoop(g, id, L) {
    const R = REC[id], ctx = E.ctx, pr = loadBuf(id);
    holdBuf(g, id);
    const lvl = g.gain(0); lvl.connect(g.bed);
    const rec = g.lv[id] = { param: lvl.gain, trim: R.trim, want: L * R.trim };
    pr.then((buf) => {
      if (g.dead) return;
      if (!buf) { fallback(g, id, L); return; }
      const dur = buf.duration, voices = dur < 32 ? 2 : 1, o0 = rnd(0, dur);
      for (let v = 0; v < voices; v++) {                   // short loops run as two voices half a loop apart, panned apart
        const s = g.src(ctx.createBufferSource()); s.buffer = buf; s.loop = true;
        const bg = ctx.createGain(), vg = g.gain(voices === 2 ? 0.72 : 1);
        s.connect(bg);
        panned(ctx, bg, (R.pan || 0) + (voices === 2 ? (v ? 0.35 : -0.35) : 0)).connect(vg); vg.connect(lvl);
        s.start(0, (o0 + v * dur / 2) % dur);
        breathe(g, bg.gain, rnd(2, 3), [20, 60]);
      }
      const t = ctx.currentTime;
      lvl.gain.cancelScheduledValues(t); lvl.gain.setValueAtTime(0, t); lvl.gain.linearRampToValueAtTime(rec.want, t + 1.2);
    });
  }
  function recEvent(g, id, L) {
    const R = REC[id], ctx = E.ctx, pr = loadBuf(id);
    holdBuf(g, id);
    const lvl = g.gain(L * R.trim); lvl.connect(g.bed);
    g.lv[id] = { param: lvl.gain, trim: R.trim, want: L * R.trim };
    let buf = null;
    pr.then((b) => { if (g.dead) return; if (b) buf = b; else fallback(g, id, L); });
    g.every(rnd(R.first[0], R.first[1]), () => rnd(R.every[0], R.every[1]), (t) => {
      if (!buf || g.dead) return;
      const sg = pick(R.segs), s = g.src(ctx.createBufferSource()), a = ctx.createGain();
      s.buffer = buf;
      a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(rnd(0.75, 1), t + 0.04);     // the file itself carries the fade-out
      s.connect(a); panned(ctx, a, rnd(-0.6, 0.6)).connect(lvl);
      s.start(t, sg[0], sg[1]);
    });
  }
  /* live level change from the mixer sliders (no rebuild); false if that bed is not in the playing scene */
  function setBedLevel(id, L) {
    id = LEGACY[id] || id; let ok = false;
    for (const g of E.groups) {
      const o = g.lv[id]; if (g.dead || g.retiring || !o) continue;
      o.want = Math.max(0, L) * o.trim; ok = true;
      try { o.param.cancelScheduledValues(E.ctx.currentTime); o.param.setTargetAtTime(o.want, E.ctx.currentTime, 0.12); } catch (e) { /* ignore */ }
    }
    return ok;
  }

  /* ---------- synthesized beds: FALLBACK ONLY (used when a recording cannot be fetched or decoded) ---------- */
  const BUILD = {
    rain(g, L) {
      const o = g.bed, n = g.noise("pink"), hp = g.filter("highpass", 500), lp = g.filter("lowpass", 6500), v = g.gain(0.38 * L);
      n.connect(hp); hp.connect(lp); lp.connect(v); v.connect(o);
      const n2 = g.noise("pink"), bp = g.filter("bandpass", 2600, 0.6), v2 = g.gain(0.12 * L);
      n2.connect(bp); bp.connect(v2); v2.connect(o);
      lfo(g, 0.09, 0.05 * L, v2.gain);
      loopTex(g, texRain(), o, 0.9 * L);
    },
    thunder(g, L) {
      const o = g.bed;
      g.every(rnd(5, 12), () => rnd(24, 58), (t) => {
        const ctx = E.ctx, s = ctx.createBufferSource(); s.buffer = E.brown;
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(rnd(160, 320), t); f.frequency.exponentialRampToValueAtTime(60, t + 5);
        const a = ctx.createGain(), d = rnd(4, 7), pk = rnd(0.55, 1) * L;
        a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk * 0.5, t + 0.4); a.gain.linearRampToValueAtTime(pk, t + rnd(0.9, 1.6)); a.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.connect(f); f.connect(a); a.connect(o); s.start(t, Math.random() * 2, d + 0.1);
        if (Math.random() < 0.6) burst(o, t, { f: 700, q: 0.8, peak: 0.25 * L, dur: 0.22, atk: 0.01 });
      });
    },
    fire(g, L) {
      const o = g.bed, n = g.noise("brown"), lp = g.filter("lowpass", 520), v = g.gain(0.55 * L);
      n.connect(lp); lp.connect(v); v.connect(o); lfo(g, 0.35, 0.18 * L, v.gain);
      const n2 = g.noise("pink"), bp = g.filter("bandpass", 1500, 0.7), v2 = g.gain(0.03 * L); n2.connect(bp); bp.connect(v2); v2.connect(o);
      loopTex(g, texFire(), o, 0.9 * L);
    },
    room(g, L) {
      const o = g.bed, n = g.noise("brown"), lp = g.filter("lowpass", 260), v = g.gain(0.4 * L);
      n.connect(lp); lp.connect(v); v.connect(o);
      const n2 = g.noise("pink"), lp2 = g.filter("lowpass", 1100), v2 = g.gain(0.035 * L); n2.connect(lp2); lp2.connect(v2); v2.connect(o);
    },
    wind(g, L) {
      const o = g.bed, n = g.noise("pink"), bp = g.filter("bandpass", 520, 1.1), v = g.gain(0.5 * L);
      n.connect(bp); bp.connect(v); v.connect(o);
      lfo(g, 0.07, 260, bp.frequency); lfo(g, 0.11, 0.3 * L, v.gain);
    },
    insects(g, L) {
      const o = g.bed;
      loopTex(g, texCrickets(), o, L);
      const n = g.noise("pink"), bp = g.filter("bandpass", 380, 0.8), v = g.gain(0.03 * L); n.connect(bp); bp.connect(v); v.connect(o);
    },
    hum(g, L) {
      const o = g.bed, v = g.gain(0.4 * L); v.connect(o);
      const a = g.osc("sine", 55), b = g.osc("sine", 55.35), c = g.osc("triangle", 110), lp = g.filter("lowpass", 240), cg = g.gain(0.35);
      a.connect(v); b.connect(v); c.connect(cg); cg.connect(lp); lp.connect(v);
      lfo(g, 0.05, 0.12 * L, v.gain);
      const n = g.noise("brown"), nl = g.filter("lowpass", 150), nv = g.gain(0.3 * L); n.connect(nl); nl.connect(nv); nv.connect(o);
    },
    clock(g, L) {
      loopTex(g, texClock(), g.bed, L, g.t0 + 0.3);
    },
    vinyl(g, L) {
      const o = g.bed, n = g.noise("pink"), hp = g.filter("highpass", 3200), v = g.gain(0.05 * L);
      n.connect(hp); hp.connect(v); v.connect(o);
      loopTex(g, texVinyl(), o, 0.9 * L);
    }
  };

  /* ---------- generative music ---------- */
  function scaleOf(m) { return { root: 48 + NOTE[m.root || "C"], sc: MODES[m.mode] || MODES.major, pent: (MODES[m.mode] || []).length === 5 }; }
  function chordNotes(S, deg) {
    const n = S.sc.length, shape = S.pent ? [0, 1, 2, 3] : [0, 2, 4, 6];
    return shape.map((k) => { const i = deg + k; return S.root + S.sc[i % n] + 12 * Math.floor(i / n); });
  }
  function noteNear(S, prev) {
    const n = S.sc.length, steps = [-2, -1, -1, 1, 1, 2, 3, -3];
    let idx = prev == null ? n * 2 + Math.floor(Math.random() * n) : prev + pick(steps);
    if (idx < n) idx += n; if (idx > n * 3 + 2) idx -= n;
    return idx;
  }
  const idxMidi = (S, i) => S.root + S.sc[((i % S.sc.length) + S.sc.length) % S.sc.length] + 12 * Math.floor(i / S.sc.length);

  /* Music is deliberately soft: slow detuned pads (sine + a little triangle through a closed low-pass), a felt
     piano built from detuned partials with a slow filter close, and music-box bells that never ring bright.
     It runs through tape colour (tanh + high cut) and a long dark hall tail (see ensure()). */
  function padChord(g, t, dur, midis, lvl, flt) {
    const ctx = E.ctx, att = Math.min(3.6, dur * 0.3), rel = Math.min(5, dur * 0.42);
    const per = lvl * 0.2 / Math.sqrt(midis.length);
    midis.forEach((m, i) => {
      const f = mtof(m), w = per * (i === 0 ? 0.7 : 1);
      [["sine", -7, 0.42], ["sine", 7, 0.42], ["triangle", rnd(-2, 2), 0.2]].forEach(([type, det, k]) => {
        const o = g.src(ctx.createOscillator()); o.type = type; o.frequency.value = f; o.detune.value = det + rnd(-3, 3);
        const v = ctx.createGain();
        v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(w * k, t + att);
        v.gain.setValueAtTime(w * k, t + dur); v.gain.linearRampToValueAtTime(0, t + dur + rel);
        o.connect(v); v.connect(flt); o.start(t); o.stop(t + dur + rel + 0.1);
      });
    });
  }
  function voicePiano(g, t, midi, lvl) {
    const ctx = E.ctx, f = mtof(midi), dur = 3.6 + (84 - midi) * 0.05, vel = Math.min(1, lvl);
    // the filter starts bright for the hammer, then closes: the felt-piano "bloom and fade"
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.3;
    lp.frequency.setValueAtTime(Math.min(5200, f * (3.5 + vel * 3)), t); lp.frequency.exponentialRampToValueAtTime(Math.max(420, f * 1.5), t + dur * 0.7);
    const v = ctx.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vel * 0.19, t + 0.02); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // slightly inharmonic partials, each as a detuned pair; upper partials die faster
    [[1, 1], [2.003, 0.34], [3.01, 0.12], [4.03, 0.05]].forEach(([mul, w], k) => {
      for (const det of [-4.5, 4.5]) {
        const o = g.src(ctx.createOscillator()); o.type = "sine"; o.frequency.value = f * mul; o.detune.value = det + rnd(-1.5, 1.5);
        const a = ctx.createGain(); a.gain.setValueAtTime(w * 0.5, t); a.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.6, dur * (k ? 0.9 / (1 + k * 0.7) : 1)));
        o.connect(a); a.connect(lp); o.start(t); o.stop(t + dur + 0.1);
      }
    });
    const b = g.src(ctx.createOscillator()); b.type = "triangle"; b.frequency.value = f; const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.22, t); bg.gain.exponentialRampToValueAtTime(0.0008, t + dur * 0.5); b.connect(bg); bg.connect(lp); b.start(t); b.stop(t + dur * 0.5 + 0.1);
    burst(lp, t, { type: "lowpass", f: 700, q: 0.7, peak: 0.05 * vel, dur: 0.05, atk: 0.004 });          // felt thump
    lp.connect(v); v.connect(g.mus);
  }
  function voiceBell(g, t, midi, lvl) {          // music-box / celesta: soft attack, a few pure partials
    const ctx = E.ctx, f = mtof(midi + 12), dur = 4.2;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3600; lp.Q.value = 0.3;
    const v = ctx.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(lvl * 0.13, t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [[1, 1, 1], [2, 0.3, 0.55], [3.0, 0.1, 0.3], [4.17, 0.04, 0.18]].forEach(([mul, w, dm]) => {
      const o = g.src(ctx.createOscillator()); o.type = "sine"; o.frequency.value = f * mul; o.detune.value = rnd(-4, 4);
      const a = ctx.createGain(); a.gain.setValueAtTime(w, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur * dm);
      o.connect(a); a.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    });
    lp.connect(v); v.connect(g.mus);
  }
  function kick(g, t, lvl) {
    const ctx = E.ctx, o = g.src(ctx.createOscillator()), v = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(lvl, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(v); v.connect(g.beat); o.start(t); o.stop(t + 0.4);
  }

  function buildMusic(g, m) {
    const ctx = E.ctx, S = scaleOf(m), prog = m.prog && m.prog.length ? m.prog : [0];
    const bpm = m.bpm || 72, beat = 60 / bpm, chordSec = m.beat ? beat * 8 : (m.chordSec || 14);
    g.beat = ctx.createBiquadFilter(); g.beat.type = "lowpass"; g.beat.frequency.value = 2600; g.beat.connect(g.mus);
    const flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 1100; flt.Q.value = 0.3; flt.connect(g.mus);
    lfo(g, 0.045, 380, flt.frequency);
    let ci = 0, chordAt = g.t0 + 0.1, curDeg = prog[0], lastIdx = null;
    if (m.pad > 0 || m.beat) {
      g.tickers.push((t0, t1) => {
        while (chordAt < t1) {
          const t = Math.max(chordAt, t0);
          curDeg = prog[ci % prog.length]; ci++;
          const notes = chordNotes(S, curDeg).map((x, i) => { while (x > 74) x -= 12; while (x < 52 + (i ? 3 : 0)) x += 12; return x; });
          if (m.pad > 0) padChord(g, t, chordSec, notes, m.pad, flt);
          if (m.beat) {      // soft bass note on each chord
            const o = g.src(ctx.createOscillator()), v = ctx.createGain(), bm = chordNotes(S, curDeg)[0] - 24;
            o.type = "sine"; o.frequency.value = mtof(bm < 30 ? bm + 12 : bm);
            v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.28, t + 0.04); v.gain.setTargetAtTime(0, t + chordSec * 0.55, 0.5);
            o.connect(v); v.connect(g.mus); o.start(t); o.stop(t + chordSec + 0.2);
          }
          chordAt += chordSec;
        }
      });
    }
    // sparse piano / bell motif that follows the chord tones
    const inst = []; if (m.piano) inst.push("piano"); if (m.bells) inst.push("bells");
    if (inst.length) {
      const gap = m.gap || [5, 10];
      g.every(rnd(1.5, 4), () => rnd(gap[0], gap[1]), (t) => {
        const len = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1, dir = Math.random() < 0.5 ? 1 : -1;
        let idx = lastIdx;
        if (Math.random() < 0.45 || idx == null) { const ct = chordNotes(S, curDeg); const base = pick(ct); idx = noteNear(S, null); const cand = S.sc.indexOf(((base - S.root) % 12 + 12) % 12); if (cand >= 0) idx = S.sc.length * 2 + cand; }
        for (let k = 0; k < len; k++) {
          idx = k === 0 ? idx : idx + dir * pick([1, 1, 2]);
          idx = Math.max(S.sc.length, Math.min(S.sc.length * 3 + 2, idx));
          const midi = idxMidi(S, idx), tt = t + k * rnd(0.34, 0.6), which = pick(inst);
          (which === "bells" ? voiceBell : voicePiano)(g, tt, midi, 0.8 + Math.random() * 0.3);
        }
        lastIdx = idx;
      });
    }
    // lo-fi beat: one pre-rendered two-bar loop, aligned to the chord changes
    if (m.beat) loopTex(g, texBeat(bpm), g.beat, 1, g.t0 + 0.1);
  }

  /* ---------- public control ---------- */
  function buildGroup(mix) {
    const g = mkGroup();
    const beds = {};
    for (const k of Object.keys(mix.beds || {})) { const id = LEGACY[k] || k, L = mix.beds[k]; if (L > 0 && REC[id]) beds[id] = Math.max(beds[id] || 0, L); }
    for (const id of BED_ORDER) { const L = beds[id]; if (L > 0) (REC[id].kind === "event" ? recEvent : recLoop)(g, id, L); }
    if ((mix.pad > 0) || mix.piano || mix.bells || mix.beat) buildMusic(g, mix);
    return g;
  }

  function play(mix, opts) {
    opts = opts || {};
    const ctx = ensure(); if (!ctx) return false;
    E.mix = mix; E.name = opts.name || E.name || ""; E.playing = true; E.paused = false; E.userStopped = false;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (E.el && E.el.paused) { const p = E.el.play(); if (p && p.catch) p.catch(() => {}); }
    const fade = Math.max(0.3, opts.fade == null ? 2.5 : opts.fade);
    for (const g of E.groups) {
      if (g.dead || g.retiring) continue;
      g.retiring = true;
      // A scene that was only just started (rapid tapping) was barely audible: retire it quickly instead of letting it ring through a long fade.
      const young = g.fadeSec && (ctx.currentTime - g.born) < g.fadeSec * 0.35, sec = young ? 0.15 : fade;
      g.fade(0, sec); const dead = g; setTimeout(() => dead.kill(), sec * 1000 + 300);
    }
    const g = buildGroup(mix);
    E.groups.push(g);
    g.fade(1, fade);
    const live = E.groups.filter((x) => !x.dead);
    for (let i = 0; live.length - i > 3; i++) { if (live[i] !== g) live[i].kill(); }   // hard cap: never more than 3 scenes alive at once
    applyMaster(0.2);
    setMeta();
    emit("play");
    return true;
  }
  function stop(fade) {
    if (!E.ctx) { E.playing = false; emit("stop"); return; }
    fade = fade == null ? 0.8 : fade;
    E.playing = false; E.paused = false; E.mix = null; E.name = "";
    applyMaster(fade / 3);
    for (const g of E.groups) { g.fade(0, fade); const dead = g; setTimeout(() => dead.kill(), fade * 1000 + 300); }
    clearTimeout(E.parkT);
    E.parkT = setTimeout(() => { if (!E.playing && E.ctx) { try { if (E.el) E.el.pause(); } catch (e) { /* ignore */ } E.ctx.suspend().catch(() => {}); } }, fade * 1000 + 500);
    clearMeta(); emit("stop");
  }
  function pause() {
    if (!E.ctx || !E.playing) return;
    E.paused = true; applyMaster(0.1);
    clearTimeout(E.parkT);
    E.parkT = setTimeout(() => { if (E.paused && E.ctx) { try { if (E.el) E.el.pause(); } catch (e) { /* ignore */ } E.ctx.suspend().catch(() => {}); } }, 500);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    emit("pause");
  }
  function resume() {
    if (!E.ctx || !E.playing) return false;
    clearTimeout(E.parkT);
    E.paused = false;
    E.ctx.resume().catch(() => {});
    if (E.el && E.el.paused) { const p = E.el.play(); if (p && p.catch) p.catch(() => {}); }
    applyMaster(0.2);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    emit("play");
    return true;
  }

  /* ---------- media session (lock-screen / notification controls) ---------- */
  function setMeta() {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: E.name || "Scene", artist: "Titan Reliquary", album: "Scene Studio",
        artwork: [{ src: "icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] });
      navigator.mediaSession.playbackState = "playing";
      navigator.mediaSession.setActionHandler("play", () => { resume(); });
      navigator.mediaSession.setActionHandler("pause", () => { pause(); });
      navigator.mediaSession.setActionHandler("stop", () => { stop(0.4); });
    } catch (e) { /* unsupported action */ }
  }
  function clearMeta() {
    if (!("mediaSession" in navigator)) return;
    try { navigator.mediaSession.playbackState = "none"; ["play", "pause", "stop"].forEach((a) => navigator.mediaSession.setActionHandler(a, null)); } catch (e) { /* ignore */ }
  }

  /* ---------- background behaviour ---------- */
  document.addEventListener("visibilitychange", () => {
    const ctx = E.ctx; if (!ctx) return;
    if (document.hidden) {
      if (E.bgPause && E.playing && !E.paused) { E.bgPaused = true; pause(); }
    } else {
      if (E.bgPaused) { E.bgPaused = false; resume(); }
      else if (E.playing && !E.paused && ctx.state !== "running") { ctx.resume().catch(() => {}); if (E.el && E.el.paused) { const p = E.el.play(); if (p && p.catch) p.catch(() => {}); } }
    }
  });
  // If the OS interrupted the context (call, Siri) and the user had sound on, come back on the next touch.
  document.addEventListener("pointerdown", () => {
    if (E.ctx && E.playing && !E.paused && E.ctx.state !== "running") { E.ctx.resume().catch(() => {}); if (E.el && E.el.paused) { const p = E.el.play(); if (p && p.catch) p.catch(() => {}); } }
  }, { passive: true, capture: true });
  window.addEventListener("titan:mute", (e) => {
    const m = !!(e.detail && e.detail.muted);
    if (m && E.playing && !E.paused) { E.muteHeld = true; pause(); }
    else if (!m && E.muteHeld) { E.muteHeld = false; resume(); }
  });

  window.TitanGen = {
    BEDS, BED_ORDER, BED_GROUPS, SCENES, SCENE_ORDER, SOUND_ORDER, WORLD_ORDER, ALIASES, REC,
    setBedLevel, releaseIdle, loaded: () => Object.keys(E.bufs).filter((k) => E.bufs[k].buf),
    ensure, play, stop, pause, resume,
    setVolume(v) { E.vol = Math.min(1, Math.max(0, v)); applyMaster(0.08); },
    getVolume: () => E.vol,
    setLevels(mus, amb) { if (mus != null) E.musLevel = mus; if (amb != null) E.ambLevel = amb; applyLevels(); },
    setTone(b, m, t) { E.bass = b; E.mid = m; E.treble = t; applyTone(); },
    setMusicDuck(on) { E.duck = !!on; applyLevels(); },
    setBackgroundPause(on) { E.bgPause = !!on; },
    isPlaying: () => E.playing && !E.paused,
    isPaused: () => E.playing && E.paused,
    isActive: () => E.playing,
    ctxState: () => (E.ctx ? E.ctx.state : "none"),
    route: () => E.via,
    texCheck() { const bad = []; for (const k of Object.keys(E.tex || {})) { const d = E.tex[k].getChannelData(0); for (let i = 0; i < d.length; i += 7) if (!(Math.abs(d[i]) < 4)) { bad.push(k); break; } } return bad; },
    debugMaster: () => E.master,
    level() { if (!E.an) return 0; E.an.getFloatTimeDomainData(E.anBuf); let s = 0; for (let i = 0; i < E.anBuf.length; i++) s += E.anBuf[i] * E.anBuf[i]; return Math.sqrt(s / E.anBuf.length); },
    stats: () => ({ buffers: Object.keys(E.bufs).filter((k) => E.bufs[k].buf).length, decoded: E.decoded, released: E.released, fallbacks: E.fallbacks, groups: E.groups.length, sources: E.groups.reduce((n, g) => n + g.srcs.length, 0), killed: E.killedSources, ctx: E.ctx ? E.ctx.state : "none", via: E.via })
  };
})();
