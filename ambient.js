/* Titan Reliquary — Ambience engine (v6, "fx-engine" rebuild).
   One soundscape per atmosphere, synthesized live with Web Audio (works offline,
   nothing downloaded), plus a full-viewport canvas for weather and light.

   Sound design rules (see notes/agents/fx.md for the measurements):
   - Every preset is built from calibrated synthesized layers; per-layer CAL and
     per-preset trim put all twenty presets within a few dB of the same loudness.
   - Beds are stereo noise (pink/brown buffers of co-prime lengths, random start)
     driven by random walks, never by one periodic LFO, so nothing audibly loops.
   - Pitched layers (drones, bowls, bells, chimes, guzheng, oud, tanpura, bansuri)
     sit on a "tonal" bus that fades out while a music station plays: ambience
     never plays in a different key under the music. Beds duck by ~7 dB instead.
   - Master chain: layers -> dry/reverb (send is high-passed so lows stay clean,
     two convolvers crossfade on a room change) -> 3-band EQ -> duck -> master ->
     peak limiter -> speakers. Every start/stop is a gain ramp: no clicks.
   - Rhythmic layers are scheduled on the audio clock (lookahead), not on timers.
   - The AudioContext is created only inside a user gesture (autoplay policy).
   Recorded loops (Mixkit, hotlinked) remain as optional manual layers only:
   they need the network, cannot be loudness-calibrated, and loop with a gap. */
(() => {
  "use strict";

  const MX = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;

  // Recorded loops: optional, manual, online only (Mixkit Sound Effects Free License).
  const RECORDED = {
    rain:     { label: "Rain (recorded)",            url: MX(2394) },
    thunder:  { label: "Distant thunder (recorded)", url: MX(2395) },
    fire:     { label: "Fireplace (recorded)",       url: MX(1330) },
    wind:     { label: "Night wind (recorded)",      url: MX(2483) },
    crickets: { label: "Summer crickets (recorded)", url: MX(1789) },
    forest:   { label: "Forest birds (recorded)",    url: MX(1213) },
    crowd:    { label: "Crowd murmur (recorded)",    url: MX(444)  },
    office:   { label: "Room tone (recorded)",       url: MX(447)  },
    scifi:    { label: "Machine hum (recorded)",     url: MX(2507) },
  };

  /* Synthesized layers. group: mixer section. yields: pitched or rhythmic, fades
     out under music. cal: loudness calibration so that every layer at volume 0.7
     measures about -27 LUFS (K-weighted, ungated) on its own. Measured with
     tools/fx/audit.js --layers; re-measure after changing a builder. */
  const SYNTH = {
    rainfall:     { label: "Rainfall",               group: "Weather", cal: 1 },
    rainGlass:    { label: "Rain on skylight glass", group: "Weather", cal: 1 },
    rumble:       { label: "Distant thunder",        group: "Weather", cal: 1 },
    gust:         { label: "Wind",                   group: "Weather", cal: 1 },
    blizzard:     { label: "Polar gale",             group: "Weather", cal: 1 },
    desertWind:   { label: "Desert wind & sand",     group: "Weather", cal: 1 },
    ocean:        { label: "Ocean waves",            group: "Water",   cal: 1 },
    underwater:   { label: "Deep water",             group: "Water",   cal: 1 },
    stream:       { label: "Trickling water",        group: "Water",   cal: 1 },
    bubbles:      { label: "Rising bubbles",         group: "Water",   cal: 1 },
    cavern:       { label: "Cavern drips",           group: "Water",   cal: 1 },
    hearth:       { label: "Hearth fire",            group: "Fire & forge", cal: 1 },
    crackle:      { label: "Sparks & crackle",       group: "Fire & forge", cal: 1 },
    bellows:      { label: "Forge bellows",          group: "Fire & forge", cal: 1 },
    clank:        { label: "Anvil & hammer",         group: "Fire & forge", cal: 1 },
    roomtone:     { label: "Quiet room",             group: "Rooms",   cal: 1 },
    clockwork:    { label: "Longcase clock",         group: "Rooms",   cal: 1 },
    vinyl:        { label: "Vinyl surface",          group: "Rooms",   cal: 1 },
    hum:          { label: "Machine room",           group: "Rooms",   cal: 1 },
    rigging:      { label: "Ship timbers",           group: "Rooms",   cal: 1 },
    insects:      { label: "Night insects",          group: "Rooms",   cal: 1 },
    rake:         { label: "Raked gravel",           group: "Rooms",   cal: 1 },
    drone:        { label: "Warm low drone",         group: "Tones",   cal: 1, yields: true },
    dread:        { label: "Dread drone",            group: "Tones",   cal: 1, yields: true },
    crystal:      { label: "Crystal bowl swells",    group: "Tones",   cal: 1, yields: true },
    bowl:         { label: "Singing bowl (220 Hz)",  group: "Tones",   cal: 1, yields: true },
    bowl528:      { label: "Singing bowls (528 Hz)", group: "Tones",   cal: 1, yields: true },
    belltoll:     { label: "Distant bell",           group: "Tones",   cal: 1, yields: true },
    ghanta:       { label: "Temple bell",            group: "Tones",   cal: 1, yields: true },
    chimes:       { label: "Wind chimes",            group: "Tones",   cal: 1, yields: true },
    gong:         { label: "Bronze court gong",      group: "Tones",   cal: 1, yields: true },
    caravanBells: { label: "Caravan bells",          group: "Tones",   cal: 1, yields: true },
    bambooClack:  { label: "Shishi-odoshi bamboo",   group: "Rooms",   cal: 1 },
    guzheng:      { label: "Guzheng (court zither)", group: "Instruments", cal: 1, yields: true },
    oud:          { label: "Oud",                    group: "Instruments", cal: 1, yields: true },
    tanpura:      { label: "Tanpura drone",          group: "Instruments", cal: 1, yields: true },
    bansuri:      { label: "Bansuri flute",          group: "Instruments", cal: 1, yields: true },
    signal:       { label: "Deep-space static",      group: "Cosmos",  cal: 1 },
    pulsar:       { label: "Pulsar (PSR B0329+54)",  group: "Cosmos",  cal: 1, yields: true },
    solarWind:    { label: "Solar wind",             group: "Cosmos",  cal: 1 },
  };
  const GROUPS = ["Weather", "Water", "Fire & forge", "Rooms", "Tones", "Instruments", "Cosmos"];

  const LAYER_IDS = [...Object.keys(SYNTH), ...Object.keys(RECORDED)];

  /* Presets: one per atmosphere. mix = layer volumes (0..1, relative balance);
     trim = dB offset so every preset lands near the same loudness; space/wet =
     room; fx = visual layers; tint = colours for the canvas FX. */
  const PRESETS = {
    afterhours:  { name: "After Hours", desc: "The gallery at 2 AM: rain drumming on the skylight glass, the building's low hush, a record's soft surface noise, thunder far off.",
                   mix: { rainGlass: 0.85, roomtone: 0.5, vinyl: 0.3, rumble: 0.3 }, trim: 0, space: "hall", wet: 0.2,
                   fx: { rain: true } },
    conservator: { name: "Conservator", desc: "Restoration atelier: a longcase clock, a small stove ticking over, the quiet of paper and brass.",
                   mix: { clockwork: 0.5, roomtone: 0.6, hearth: 0.28 }, trim: 0, space: "atelier", wet: 0.16,
                   fx: { caustics: true }, tint: { caustics: [255, 214, 150], causticsOp: 0.55 } },
    colossus:    { name: "Colossus", desc: "The foundry of empires: furnace roar, bellows breathing, hammer on anvil, sparks.",
                   mix: { hearth: 0.75, bellows: 0.5, clank: 0.55, crackle: 0.4, drone: 0.3 }, trim: 0, space: "cathedral", wet: 0.24,
                   fx: { embers: true } },
    nocturne:    { name: "Nocturne", desc: "Midnight streets: steady rain, gutters running, a cold wind between buildings, thunder rolling far away.",
                   mix: { rainfall: 0.8, stream: 0.25, gust: 0.3, rumble: 0.25 }, trim: 0, space: "atelier", wet: 0.18,
                   fx: { rain: true, mist: true }, tint: { mist: [150, 170, 210] } },
    odyssey:     { name: "Odyssey", desc: "Open sea: waves breaking and drawing back, wind in the sails, the ship's timbers working, a buoy bell.",
                   mix: { ocean: 0.85, gust: 0.45, rigging: 0.35, belltoll: 0.2 }, trim: 0, space: "atelier", wet: 0.12,
                   fx: { mist: true }, tint: { mist: [200, 220, 225] } },
    cursedwing:  { name: "Cursed Wing", desc: "The thirteenth hour: a dissonant drone, wind moaning through stone, water dripping in the dark, thunder.",
                   mix: { dread: 0.7, gust: 0.4, cavern: 0.45, rumble: 0.45 }, trim: 0, space: "cavern", wet: 0.38,
                   fx: { lightning: true, mist: true }, tint: { mist: [120, 90, 90] } },
    kaleido:     { name: "Kaleidoscope", desc: "Crystal bowls swelling and fading, wind chimes, a warm drone underneath, colour in the sky.",
                   mix: { crystal: 0.7, chimes: 0.45, drone: 0.3, gust: 0.2 }, trim: 0, space: "cathedral", wet: 0.36,
                   fx: { aurora: true, stars: true }, tint: { aurora: [[236, 72, 153], [139, 92, 246], [34, 211, 238]] } },
    abyss:       { name: "Sunken Treasury", desc: "Forty fathoms down: the pressure of deep water, rising bubbles, a drowned bell.",
                   mix: { underwater: 0.85, bubbles: 0.45, belltoll: 0.22 }, trim: 0, space: "cavern", wet: 0.4,
                   fx: { caustics: true, bubbles: true }, tint: { caustics: [150, 220, 255] } },
    neon:        { name: "Neon Vault", desc: "Cyberpunk rain on wet asphalt, a machine room humming behind the wall, runoff in the drains.",
                   mix: { rainfall: 0.75, hum: 0.45, stream: 0.2, rumble: 0.2 }, trim: 0, space: "atelier", wet: 0.2,
                   fx: { rain: true }, tint: { rain: [255, 130, 230] } },
    notepad:     { name: "Plaintext", desc: "Nothing but a quiet room and a clock in the next room.",
                   mix: { roomtone: 0.55, clockwork: 0.2 }, trim: 0, space: "atelier", wet: 0.1,
                   fx: {} },
    construct:   { name: "The Construct", desc: "The machine room: fans, mains hum, relays clicking, faint static on the line.",
                   mix: { hum: 0.75, roomtone: 0.3, signal: 0.15 }, trim: 0, space: "atelier", wet: 0.14,
                   fx: { dataGrid: true } },
    xeno:        { name: "Xenohold", desc: "Deep field: shifting static, a pulsar's beat fading in and out, a low drone, crystal tones.",
                   mix: { signal: 0.5, pulsar: 0.35, drone: 0.35, crystal: 0.3 }, trim: 0, space: "cavern", wet: 0.4,
                   fx: { aurora: true, stars: true }, tint: { aurora: [[45, 212, 191], [99, 102, 241], [168, 85, 247]] } },
    solaris:     { name: "Solaris", desc: "Solar observatory: the roar and hiss of solar wind, plasma crackle, a singing bowl, the corona.",
                   mix: { solarWind: 0.7, crackle: 0.22, drone: 0.35, bowl528: 0.3 }, trim: 0, space: "cathedral", wet: 0.3,
                   fx: { aurora: true, embers: true }, tint: { aurora: [[251, 146, 60], [244, 63, 94], [250, 204, 21]] } },
    alchemist:   { name: "Alchemist", desc: "Hermetic laboratory: retorts bubbling over a low furnace, the clock, sparks from the crucible.",
                   mix: { bubbles: 0.55, hearth: 0.45, clockwork: 0.25, crackle: 0.2 }, trim: 0, space: "atelier", wet: 0.22,
                   fx: { embers: true, mist: true }, tint: { mist: [120, 200, 150] } },
    glacier:     { name: "Hyperborean", desc: "Polar gale: the blizzard's howl and ice hiss, gusts, a bell somewhere in the white, auroras.",
                   mix: { blizzard: 0.8, gust: 0.45, belltoll: 0.2 }, trim: 0, space: "cavern", wet: 0.3,
                   fx: { blizzard: true, aurora: true } },
    valhalla:    { name: "Valhalla", desc: "The great hall: a roaring hearth, crackling logs, mountain gale at the doors, the armory at work.",
                   mix: { hearth: 0.85, crackle: 0.5, gust: 0.35, clank: 0.22 }, trim: 0, space: "hall", wet: 0.26,
                   fx: { embers: true } },
    dynasty:     { name: "Dynasty", desc: "Imperial court at night: guzheng phrases, a bronze gong, eave bells in the breeze, insects in the palace garden.",
                   mix: { guzheng: 0.55, gong: 0.45, chimes: 0.3, insects: 0.25, gust: 0.2 }, trim: 0, space: "hall", wet: 0.3,
                   fx: { goldFoil: true } },
    zen:         { name: "Zen Garden", desc: "Karesansui: water trickling into stone, the shishi-odoshi's knock, a singing bowl, a rake drawn through gravel.",
                   mix: { stream: 0.45, bambooClack: 0.5, bowl: 0.4, rake: 0.35, gust: 0.2, insects: 0.15 }, trim: 0, space: "atelier", wet: 0.18,
                   fx: { sakura: true } },
    samadhi:     { name: "Samadhi", desc: "Meditation hall: a tanpura drone on Sa, bansuri phrases in raga Bhupali, 528 Hz bowls, a temple bell.",
                   mix: { tanpura: 0.6, bansuri: 0.45, bowl528: 0.38, ghanta: 0.25, roomtone: 0.25 }, trim: 0, space: "cathedral", wet: 0.36,
                   fx: { incense: true } },
    silkroad:    { name: "Silk Road", desc: "Caravanserai at dusk: desert wind and sand, camel bells, an oud in maqam Hijaz, the oasis spring, a campfire.",
                   mix: { desertWind: 0.7, caravanBells: 0.5, oud: 0.45, stream: 0.2, crackle: 0.18, insects: 0.15 }, trim: 0, space: "atelier", wet: 0.14,
                   fx: { stars: true, mist: true }, tint: { mist: [215, 185, 140] } },
    off:         { name: "Off", desc: "Silence. Just the music.", mix: {}, trim: 0, fx: {} },
  };
  // Presets of older builds, remembered in localStorage: map to their nearest scene.
  const LEGACY = { storm: "nocturne", foundry: "colossus", fireside: "valhalla", wayfarer: "odyssey", night: "notepad",
    blackout: "cursedwing", tavern: "valhalla", archive: "conservator", mirage: "silkroad", depths: "abyss", grid: "construct", signal: "xeno" };

  const PRESET_ORDER = [
    "afterhours", "conservator", "colossus", "nocturne", "odyssey", "cursedwing", "kaleido", "abyss",
    "neon", "notepad", "construct", "xeno", "solaris", "alchemist", "glacier", "valhalla",
    "dynasty", "zen", "samadhi", "silkroad", "off",
  ];

  const KEY = "tr_ambient_v3";
  const mqReduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reducedMotion = !!(mqReduced && mqReduced.matches);
  const FX_KEYS = ["rain", "blizzard", "embers", "aurora", "lightning", "mist", "caustics", "goldFoil", "sakura", "incense", "stars", "dataGrid", "cymatics", "bubbles"];
  const SPACES = ["atelier", "hall", "cathedral", "cavern", "off"];

  // ---- state ---------------------------------------------------------------
  const state = {
    layers: {}, master: 0.8, muted: false, intensity: 60, lightning: 70, fxIntensity: 75,
    preset: null, reverb: "hall", reverbMix: 0.22, eq: { bass: 0, mid: 0, air: 0 }, fx: {},
  };
  for (const k of FX_KEYS) state.fx[k] = false;
  for (const id of LAYER_IDS) state.layers[id] = { on: false, vol: 0.7 };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") {
      // Layer on/off is not restored: the engine is dormant until a gesture, and the
      // remembered preset (not a stale layer list) is what "resume" should mean.
      if (raw.layers) for (const id of LAYER_IDS) if (raw.layers[id]) {
        const v = parseFloat(raw.layers[id].vol);
        if (Number.isFinite(v)) state.layers[id].vol = clamp01(v);
      }
      if (Number.isFinite(raw.master)) state.master = clamp01(raw.master);
      state.muted = raw.muted === true;
      if (Number.isFinite(raw.intensity)) state.intensity = Math.min(100, Math.max(0, raw.intensity));
      if (Number.isFinite(raw.lightning)) state.lightning = Math.min(100, Math.max(0, raw.lightning));
      if (Number.isFinite(raw.fxIntensity)) state.fxIntensity = Math.min(100, Math.max(0, raw.fxIntensity));
      const p = LEGACY[raw.preset] || raw.preset;
      if (p && PRESETS[p]) state.preset = p;
      if (SPACES.includes(raw.reverb)) state.reverb = raw.reverb;
      if (Number.isFinite(raw.reverbMix)) state.reverbMix = clamp01(raw.reverbMix);
      if (raw.eq && raw.eqV === 6) {
        for (const b of ["bass", "mid", "air"]) if (Number.isFinite(raw.eq[b])) state.eq[b] = Math.min(6, Math.max(-6, raw.eq[b]));
      }
    }
  } catch { /* fresh */ }

  function writeState() {
    try {
      const layers = {};
      for (const id of LAYER_IDS) layers[id] = { on: state.layers[id].on, vol: state.layers[id].vol };
      localStorage.setItem(KEY, JSON.stringify({
        layers, master: state.master, muted: state.muted,
        intensity: state.intensity, lightning: state.lightning,
        fxIntensity: state.fxIntensity, preset: state.preset,
        reverb: state.reverb, reverbMix: state.reverbMix, eq: state.eq, eqV: 6, fx: state.fx,
      }));
    } catch { /* ignore */ }
  }

  // ---- audio graph ----------------------------------------------------------
  let ctx = null;
  let dryBus = null, tonalBus = null, tonalGain = null, duckGain = null, masterGain = null, limiter = null, analyser = null, uiBus = null;
  let eqBass = null, eqMid = null, eqAir = null;
  let revSend = null, revA = null, revB = null, revGA = null, revGB = null, revActive = "A";
  const NB = {}; // noise buffers
  const nodes = {}; // id -> { gain, pan, el?, synth? }
  const impulseCache = {};
  let musicPlaying = false;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dbToGain = (db) => Math.pow(10, db / 20);

  // Smooth, click-free parameter move. cancelAndHoldAtTime keeps an in-flight ramp
  // from jumping; setTargetAtTime reaches ~98% of the target after `dur`.
  function glide(param, target, dur, at) {
    if (!ctx) return;
    const now = at || ctx.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
    else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
    param.setTargetAtTime(target, now, Math.max(0.005, dur / 4));
  }

  function makeNoise(kind, seconds, channels) {
    const sr = ctx.sampleRate, n = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(channels, n, sr);
    for (let c = 0; c < channels; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === "white") d[i] = w * 0.5;
        else if (kind === "pink") { // Paul Kellet's refined pink filter
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { // brown (leaky integrator)
          last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2;
        }
      }
      // Crossfade the loop seam (50 ms) so looping never clicks.
      const f = Math.floor(sr * 0.05);
      for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k); }
    }
    return buf;
  }

  // Exponentially decaying stereo noise impulse, darkening over time (air absorption).
  function makeImpulse(space) {
    const p = { atelier: [0.9, 5.5, 0.35], hall: [2.2, 4.2, 0.22], cathedral: [4.2, 3.4, 0.12], cavern: [5.2, 3.0, 0.08] }[space] || [2.2, 4.2, 0.22];
    const [dur, decay, bright] = p;
    const sr = ctx.sampleRate, n = Math.floor(sr * dur);
    const ir = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const coef = bright + (1 - bright) * Math.pow(1 - t, 2); // one-pole lowpass closes over time
        lp += coef * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - t, decay) * (i < sr * 0.004 ? i / (sr * 0.004) : 1);
      }
    }
    // normalise energy so rooms differ in length, not in level
    let e = 0;
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) e += d[i] * d[i]; }
    const g = 1 / Math.sqrt(e / 2 + 1e-9) * 0.9;
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= g; }
    return ir;
  }

  function setReverbSpace(space, mix) {
    if (SPACES.includes(space)) state.reverb = space;
    if (Number.isFinite(mix)) state.reverbMix = clamp01(mix);
    if (!ctx) return;
    const wet = state.reverb === "off" ? 0 : state.reverbMix;
    const incoming = revActive === "A" ? "B" : "A";
    const convIn = incoming === "A" ? revA : revB, gIn = incoming === "A" ? revGA : revGB;
    const gOut = incoming === "A" ? revGB : revGA;
    if (state.reverb !== "off") {
      if (!impulseCache[state.reverb]) impulseCache[state.reverb] = makeImpulse(state.reverb);
      if (convIn.buffer !== impulseCache[state.reverb]) {
        try { convIn.buffer = impulseCache[state.reverb]; } catch { /* some engines allow buffer set once */ }
      }
    }
    glide(gIn.gain, wet, 1.6);
    glide(gOut.gain, 0, 1.6);
    revActive = incoming;
  }

  function ensureCtx() {
    if (ctx) {
      if (ctx.state !== "running") ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: "playback" }); } catch { try { ctx = new AC(); } catch { return false; } }

    NB.white = makeNoise("white", 3.7, 1);
    NB.pink = makeNoise("pink", 9.3, 2);
    NB.brown = makeNoise("brown", 11.1, 2);

    dryBus = ctx.createGain();
    tonalBus = ctx.createGain();
    tonalGain = ctx.createGain(); tonalGain.gain.value = musicPlaying ? 0 : 1;
    tonalBus.connect(tonalGain); tonalGain.connect(dryBus);

    eqBass = ctx.createBiquadFilter(); eqBass.type = "lowshelf"; eqBass.frequency.value = 120; eqBass.gain.value = state.eq.bass;
    eqMid = ctx.createBiquadFilter(); eqMid.type = "peaking"; eqMid.frequency.value = 1200; eqMid.Q.value = 0.8; eqMid.gain.value = state.eq.mid;
    eqAir = ctx.createBiquadFilter(); eqAir.type = "highshelf"; eqAir.frequency.value = 8000; eqAir.gain.value = state.eq.air;

    // Reverb send: high-passed (no mud from lows), 22 ms pre-delay, two convolvers
    // so a room change is a 1.6 s crossfade instead of a buffer swap glitch.
    revSend = ctx.createBiquadFilter(); revSend.type = "highpass"; revSend.frequency.value = 220; revSend.Q.value = 0.6;
    const preDelay = ctx.createDelay(0.1); preDelay.delayTime.value = 0.022;
    revA = ctx.createConvolver(); revB = ctx.createConvolver();
    revGA = ctx.createGain(); revGB = ctx.createGain(); revGA.gain.value = 0; revGB.gain.value = 0;
    dryBus.connect(revSend); revSend.connect(preDelay);
    preDelay.connect(revA); preDelay.connect(revB);
    revA.connect(revGA); revB.connect(revGB);
    revGA.connect(eqBass); revGB.connect(eqBass);
    dryBus.connect(eqBass);

    duckGain = ctx.createGain(); duckGain.gain.value = musicPlaying ? DUCK : 1;
    masterGain = ctx.createGain(); masterGain.gain.value = 0.0001;
    // Peak limiter: fast, hard knee, high ratio, just under full scale. Material is
    // gain-staged ~20 dB below it, so it only catches rare stacked transients.
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.15;
    eqBass.connect(eqMid); eqMid.connect(eqAir); eqAir.connect(duckGain);
    duckGain.connect(masterGain); masterGain.connect(limiter); limiter.connect(ctx.destination);
    uiBus = ctx.createGain(); uiBus.connect(limiter); // UI sounds: not ducked, not muted by the ambience master

    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.7;
    limiter.connect(analyser);

    for (const id of LAYER_IDS) {
      const gain = ctx.createGain(); gain.gain.value = 0;
      const dest = SYNTH[id] && SYNTH[id].yields ? tonalBus : dryBus;
      gain.connect(dest);
      nodes[id] = { gain, el: null, synth: null, failed: false };
    }
    setReverbSpace(state.reverb);
    applyMasterGain(1.2);
    // iOS/Safari suspend ("interrupted") a context on calls, lock screen, etc.
    // Resume on the next gesture once the user has started ambience.
    const wake = () => { if (ctx && ctx.state !== "running" && anyLayerOn()) ctx.resume().catch(() => {}); };
    document.addEventListener("pointerdown", wake, { passive: true });
    document.addEventListener("keydown", wake);
    return true;
  }

  const DUCK = dbToGain(-7);
  function applyMasterGain(dur = 0.3) {
    if (!ctx) return;
    glide(masterGain.gain, state.muted ? 0 : Math.max(0.0001, state.master * sleepFactor), dur);
  }
  function setMusicPlaying(on) {
    musicPlaying = !!on;
    if (!ctx) return;
    glide(duckGain.gain, musicPlaying ? DUCK : 1, musicPlaying ? 1.2 : 3);
    glide(tonalGain.gain, musicPlaying ? 0 : 1, musicPlaying ? 2.5 : 4);
  }
  window.addEventListener("titan:music", (e) => setMusicPlaying(e.detail && e.detail.playing));

  // ---- helpers for synth builders --------------------------------------------
  function noise(kind, rate) {
    const s = ctx.createBufferSource();
    s.buffer = NB[kind]; s.loop = true;
    if (rate) s.playbackRate.value = rate;
    s.start(ctx.currentTime, Math.random() * NB[kind].duration);
    return s;
  }
  function filt(type, freq, q) {
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }
  function amp(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
  function panner(v) {
    if (!ctx.createStereoPanner) return amp(1);
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, v || 0)); return p;
  }
  // Random walk on an AudioParam: a new target every min..max seconds.
  function wander(param, lo, hi, minS, maxS) {
    let dead = false, t = 0;
    const go = () => {
      if (dead || !ctx) return;
      const span = rand(minS, maxS);
      glide(param, rand(lo, hi), span * 0.9);
      t = setTimeout(go, span * 1000);
    };
    param.value = rand(lo, hi);
    go();
    return { stop() { dead = true; clearTimeout(t); } };
  }
  // Irregular events on a timer (for sparse, unrhythmic events).
  function every(fn, minS, maxS, firstS) {
    let dead = false, t = 0;
    const go = () => {
      if (dead) return;
      try { fn(ctx.currentTime + 0.02); } catch { /* never let one event kill the layer */ }
      t = setTimeout(go, rand(minS, maxS) * 1000);
    };
    t = setTimeout(go, (firstS != null ? firstS : rand(minS * 0.2, minS)) * 1000);
    return { stop() { dead = true; clearTimeout(t); } };
  }
  // Rhythmic events on the audio clock with lookahead (steady even if timers jitter).
  function metro(gapFn, fire, firstS) {
    let dead = false, t = 0, next = ctx.currentTime + (firstS || 0.1);
    const tick = () => {
      if (dead) return;
      const now = ctx.currentTime, horizon = now + (document.hidden ? 1.6 : 0.4);
      let guard = 0;
      while (next < horizon && guard++ < 64) {
        if (next >= now - 0.05) { try { fire(Math.max(next, now)); } catch { /* keep going */ } }
        next += Math.max(0.02, gapFn());
      }
      if (next < now - 1) next = now + 0.1; // context was suspended: do not burst
      t = setTimeout(tick, 120);
    };
    tick();
    return { stop() { dead = true; clearTimeout(t); } };
  }
  function bundle(out, parts) {
    return {
      stop() {
        for (const p of parts) { try { p.stop(); } catch { /* already stopped */ } }
        try { out.disconnect(); } catch { /* ignore */ }
      },
    };
  }
  // One-shot enveloped voice -> pan -> dest. Returns gain node to shape.
  function voice(dest, pan) {
    const g = ctx.createGain(); g.gain.value = 0;
    const p = panner(pan);
    g.connect(p); p.connect(dest);
    return { g, p, done(src) { src.onended = () => { try { g.disconnect(); p.disconnect(); src.disconnect(); } catch { /* ignore */ } }; } };
  }
  // Percussive attack/decay on a gain param.
  function hit(param, t, peak, attack, decay) {
    param.setValueAtTime(0.00001, t);
    param.exponentialRampToValueAtTime(Math.max(0.00002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.00001, t + attack + decay);
  }
  function burst(dest, t, freq, q, peak, decay, pan, type = "bandpass") {
    const v = voice(dest, pan);
    const s = ctx.createBufferSource(); s.buffer = NB.white;
    const f = filt(type, freq, q);
    s.connect(f); f.connect(v.g);
    hit(v.g.gain, t, peak, 0.0015, decay);
    s.start(t, Math.random() * 3, decay + 0.05);
    v.done(s);
  }
  // Additive partials (bells, bowls, chimes). parts: [ratio, amp, decaySeconds, detuneHz?]
  function partials(dest, t, f0, parts, peak, pan, attack = 0.004) {
    const v = voice(dest, pan);
    v.g.gain.value = peak;
    let longest = 0;
    let last = null;
    for (const [ratio, a, dec, beat] of parts) {
      const pairs = beat ? [-beat / 2, beat / 2] : [0];
      for (const d of pairs) {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f0 * ratio + d;
        const g = ctx.createGain();
        hit(g.gain, t, a / pairs.length, attack, dec);
        o.connect(g); g.connect(v.g);
        o.start(t); o.stop(t + attack + dec + 0.1);
        o.onended = () => { try { o.disconnect(); g.disconnect(); } catch { /* ignore */ } };
        if (dec > longest) { longest = dec; last = o; }
      }
    }
    if (last) v.done(last);
  }

  // Karplus-Strong plucked strings, rendered once per pitch into an AudioBuffer
  // (a DelayNode feedback loop cannot go below 128 samples, i.e. above ~370 Hz).
  const ksCache = new Map();
  function ksBuffer(freq, o) {
    const key = `${o.name}:${freq.toFixed(2)}`;
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, n = Math.floor(sr * o.secs);
    const buf = ctx.createBuffer(1, n, sr);
    const y = buf.getChannelData(0);
    const P = sr / freq - 0.5, Pi = Math.floor(P), fr = P - Pi;
    const g = Math.pow(0.001, 1 / (freq * o.t60)); // per-period loss for the chosen T60
    const exLen = Pi + 2;
    const ex = new Float32Array(exLen);
    let lp = 0;
    for (let i = 0; i < exLen; i++) { lp += o.bright * ((Math.random() * 2 - 1) - lp); ex[i] = lp; }
    const pd = Math.max(1, Math.round(Pi * o.pick));
    for (let i = exLen - 1; i >= pd; i--) ex[i] -= 0.9 * ex[i - pd]; // pluck-position comb
    for (let i = 0; i < n; i++) {
      let v = i < exLen ? ex[i] : 0;
      const j = i - Pi;
      if (j - 2 >= 0) {
        const a = y[j] * (1 - fr) + y[j - 1] * fr;
        const b = y[j - 1] * (1 - fr) + y[j - 2] * fr;
        v += g * (o.damp * a + (1 - o.damp) * b);
      }
      y[i] = v;
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]));
    if (o.buzz) { // jawari: bridge buzz adds bright even + odd overtones
      let hp = 0, prev = 0;
      for (let i = 0; i < n; i++) {
        const z = y[i] / (peak || 1);
        const nl = Math.abs(z) * 0.7 + Math.tanh(4 * z) * 0.3;
        hp = 0.995 * (hp + nl - prev); prev = nl;
        y[i] = z + o.buzz * hp;
      }
      peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]));
    }
    const fo = Math.floor(sr * 0.06);
    for (let i = 0; i < n; i++) {
      let v = y[i] / (peak || 1) * 0.9;
      if (i > n - fo) v *= (n - i) / fo;
      y[i] = v;
    }
    ksCache.set(key, buf);
    return buf;
  }
  function pluck(dest, t, buf, vel, pan, bend) {
    const v = voice(dest, pan);
    const s = ctx.createBufferSource(); s.buffer = buf;
    if (bend) { s.playbackRate.setValueAtTime(1, t + bend.at); s.playbackRate.linearRampToValueAtTime(bend.to, t + bend.at + bend.dur); }
    v.g.gain.setValueAtTime(vel, t);
    s.connect(v.g); s.start(t);
    v.done(s);
  }

  // ---- synthesized layers ----------------------------------------------------
  const B = {
    rainfall(out) {
      const o = amp(1); o.connect(out);
      const bed = noise("pink");
      const hp = filt("highpass", 450, 0.7), lp = filt("lowpass", 6500, 0.5), g = amp(0.5);
      chain(bed, hp, lp, g, o);
      const body = noise("brown"), blp = filt("lowpass", 900, 0.5), bg = amp(0.45);
      chain(body, blp, bg, o);
      const w1 = wander(lp.frequency, 4200, 7800, 4, 9), w2 = wander(g.gain, 0.38, 0.56, 5, 12);
      const drops = every((t) => {
        const n = 1 + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) burst(o, t + i * rand(0.005, 0.03), rand(1800, 5200), rand(1.2, 3.5), 0.03 + Math.pow(Math.random(), 3) * 0.22, rand(0.008, 0.028), rand(-0.85, 0.85));
      }, 0.04, 0.11, 0.1);
      return bundle(o, [bed, body, w1, w2, drops]);
    },
    rainGlass(out) {
      const o = amp(1); o.connect(out);
      const bed = noise("pink"), hp = filt("highpass", 220, 0.6), lp = filt("lowpass", 2100, 0.6), g = amp(0.6);
      chain(bed, hp, lp, g, o);
      const w1 = wander(g.gain, 0.45, 0.7, 6, 14);
      const ticks = every((t) => {
        burst(o, t, rand(2400, 4800), rand(5, 10), 0.02 + Math.pow(Math.random(), 3) * 0.14, rand(0.004, 0.014), rand(-0.95, 0.95));
      }, 0.05, 0.2, 0.2);
      const plips = every((t) => { // heavier drops off the lead frame
        const v = voice(o, rand(-0.7, 0.7));
        const osc = ctx.createOscillator(); osc.type = "sine";
        const f = rand(1100, 1900);
        osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.03);
        osc.connect(v.g); hit(v.g.gain, t, rand(0.03, 0.07), 0.002, 0.06);
        osc.start(t); osc.stop(t + 0.1); v.done(osc);
      }, 1.5, 5, 1);
      return bundle(o, [bed, w1, ticks, plips]);
    },
    rumble(out) {
      const o = amp(1); o.connect(out);
      const roll = (t) => {
        const v = voice(o, rand(-0.5, 0.5));
        const s = ctx.createBufferSource(); s.buffer = NB.brown;
        const lp = filt("lowpass", 700, 0.7);
        s.connect(lp); lp.connect(v.g);
        const dur = rand(6, 10), peak = rand(0.5, 1);
        const gg = v.g.gain;
        gg.setValueAtTime(0.0001, t);
        gg.exponentialRampToValueAtTime(peak * 0.6, t + rand(0.15, 0.5));
        let tt = t + 0.6;
        for (let k = 0; k < 3; k++) { // rolling bumps
          gg.setTargetAtTime(peak * rand(0.4, 1), tt, 0.25);
          tt += rand(0.7, 1.6);
        }
        gg.setTargetAtTime(0.0001, tt, (dur - (tt - t)) / 4);
        lp.frequency.setValueAtTime(rand(500, 900), t);
        lp.frequency.exponentialRampToValueAtTime(110, t + dur);
        s.start(t, rand(0, 5), dur + 0.3);
        v.done(s);
      };
      const ev = every((t) => {
        // Pair the rumble with a bolt when the lightning FX is on: flash first,
        // thunder after the light-to-sound delay of a storm a few km off.
        if (state.fx.lightning && !reducedMotion && !document.hidden) {
          boltNow();
          roll(t + rand(1.2, 3.6));
        } else roll(t);
      }, 18, 45, rand(5, 10));
      return bundle(o, [ev]);
    },
    gust(out) {
      const o = amp(1); o.connect(out);
      const a = noise("pink"), bpA = filt("bandpass", 380, 0.8), gA = amp(0.4);
      const b = noise("pink", 0.73), bpB = filt("bandpass", 900, 1.1), gB = amp(0.15);
      const c = noise("pink", 1.11), bpC = filt("bandpass", 1400, 16), gC = amp(0.02);
      chain(a, bpA, gA, o); chain(b, bpB, gB, o); chain(c, bpC, gC, o);
      const parts = [a, b, c,
        wander(bpA.frequency, 220, 620, 3, 8), wander(gA.gain, 0.12, 0.75, 2.5, 8),
        wander(bpB.frequency, 600, 1400, 3, 9), wander(gB.gain, 0.04, 0.3, 3, 9),
        wander(bpC.frequency, 900, 1900, 4, 10), wander(gC.gain, 0.0, 0.05, 5, 14)];
      return bundle(o, parts);
    },
    blizzard(out) {
      const o = amp(1); o.connect(out);
      const a = noise("pink"), bpA = filt("bandpass", 520, 0.7), gA = amp(0.5);
      const b = noise("pink", 0.81), bpB = filt("bandpass", 1300, 1.2), gB = amp(0.2);
      const ice = noise("white"), hp = filt("highpass", 5200, 0.5), gI = amp(0.04);
      const w = noise("pink", 1.07), bpW = filt("bandpass", 1900, 22), gW = amp(0.03);
      chain(a, bpA, gA, o); chain(b, bpB, gB, o); chain(ice, hp, gI, o); chain(w, bpW, gW, o);
      return bundle(o, [a, b, ice, w,
        wander(bpA.frequency, 300, 800, 2, 6), wander(gA.gain, 0.25, 0.8, 2, 6),
        wander(bpB.frequency, 900, 1800, 2, 7), wander(gB.gain, 0.08, 0.35, 2, 7),
        wander(gI.gain, 0.015, 0.07, 1.5, 5), wander(bpW.frequency, 1500, 2700, 3, 9), wander(gW.gain, 0.0, 0.07, 3, 10)]);
    },
    desertWind(out) {
      const o = amp(1); o.connect(out);
      const a = noise("pink"), bpA = filt("bandpass", 260, 0.6), lpA = filt("lowpass", 1200), gA = amp(0.55);
      const sand = noise("white"), hp = filt("highpass", 3600, 0.5), lp = filt("lowpass", 9000), gS = amp(0.03);
      chain(a, bpA, lpA, gA, o); chain(sand, hp, lp, gS, o);
      return bundle(o, [a, sand,
        wander(bpA.frequency, 170, 420, 3, 9), wander(gA.gain, 0.2, 0.8, 3, 9),
        wander(gS.gain, 0.006, 0.05, 2, 7)]);
    },
    ocean(out) {
      const o = amp(1); o.connect(out);
      const far = noise("brown"), flp = filt("lowpass", 200, 0.5), fg = amp(0.35);
      chain(far, flp, fg, o);
      const lanes = [0, 1].map((i) => {
        const s = noise("pink", i ? 0.93 : 1), lp = filt("lowpass", 300, 0.3), g = amp(0.0001), p = panner(i ? 0.45 : -0.45);
        chain(s, lp, g, p, o);
        return { s, lp, g };
      });
      let lane = 0;
      const waves = every((t) => {
        const L = lanes[lane]; lane ^= 1;
        const peak = rand(0.35, 0.9), build = rand(1.8, 3.2);
        L.g.gain.cancelScheduledValues(t); L.lp.frequency.cancelScheduledValues(t);
        L.g.gain.setTargetAtTime(peak, t, build / 3);
        L.lp.frequency.setTargetAtTime(rand(1400, 2600), t, build / 3);
        L.g.gain.setTargetAtTime(peak * 0.3, t + build, 0.9);   // break, then wash back
        L.lp.frequency.setTargetAtTime(600, t + build, 1.2);
        L.g.gain.setTargetAtTime(0.0001, t + build + rand(2.5, 4), 1.3);
        L.lp.frequency.setTargetAtTime(300, t + build + 3, 1.5);
      }, 4.5, 9, 0.3);
      return bundle(o, [far, ...lanes.map((l) => l.s), waves]);
    },
    underwater(out) {
      const o = amp(1); o.connect(out);
      const a = noise("brown"), lp = filt("lowpass", 150, 0.6), g = amp(0.6);
      const b = noise("pink", 0.5), bp = filt("bandpass", 320, 1.4), gb = amp(0.05);
      chain(a, lp, g, o); chain(b, bp, gb, o);
      return bundle(o, [a, b, wander(g.gain, 0.35, 0.75, 6, 14), wander(lp.frequency, 110, 220, 8, 16), wander(bp.frequency, 220, 520, 6, 12)]);
    },
    stream(out) {
      const o = amp(1); o.connect(out);
      const bed = noise("pink"), bp = filt("bandpass", 2200, 0.9), g = amp(0.12);
      chain(bed, bp, g, o);
      const bub = every((t) => {
        const v = voice(o, rand(-0.6, 0.6));
        const osc = ctx.createOscillator(); osc.type = "sine";
        const f = rand(500, 1500);
        osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * rand(1.3, 2.1), t + rand(0.015, 0.04));
        osc.connect(v.g); hit(v.g.gain, t, 0.015 + Math.pow(Math.random(), 2) * 0.06, 0.002, rand(0.02, 0.05));
        osc.start(t); osc.stop(t + 0.08); v.done(osc);
      }, 0.025, 0.08, 0.05);
      return bundle(o, [bed, bub, wander(bp.frequency, 1600, 3000, 2, 6), wander(g.gain, 0.07, 0.16, 2, 6)]);
    },
    bubbles(out) {
      const o = amp(1); o.connect(out);
      const cl = every((t) => {
        const n = 3 + Math.floor(Math.random() * 7), pan = rand(-0.7, 0.7);
        for (let i = 0; i < n; i++) {
          const tt = t + i * rand(0.05, 0.14);
          const v = voice(o, pan + rand(-0.1, 0.1));
          const osc = ctx.createOscillator(); osc.type = "sine";
          const f = rand(180, 620);
          osc.frequency.setValueAtTime(f, tt); osc.frequency.exponentialRampToValueAtTime(f * rand(1.6, 2.5), tt + rand(0.04, 0.09));
          osc.connect(v.g); hit(v.g.gain, tt, rand(0.06, 0.16), 0.003, rand(0.06, 0.12));
          osc.start(tt); osc.stop(tt + 0.2); v.done(osc);
        }
      }, 1.4, 4.5, 0.5);
      return bundle(o, [cl]);
    },
    cavern(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        const v = voice(o, rand(-0.8, 0.8));
        const osc = ctx.createOscillator(); osc.type = "sine";
        const f = rand(900, 1700);
        osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.035);
        osc.connect(v.g); hit(v.g.gain, t, rand(0.08, 0.2), 0.003, rand(0.25, 0.45));
        osc.start(t); osc.stop(t + 0.5); v.done(osc);
      }, 2.5, 7, 1);
      return bundle(o, [ev]);
    },
    hearth(out) {
      const o = amp(1); o.connect(out);
      const roar = noise("brown"), lp = filt("lowpass", 350, 0.5), g = amp(0.5);
      const hiss = noise("pink", 0.9), bp = filt("bandpass", 2600, 0.5), gh = amp(0.03);
      chain(roar, lp, g, o); chain(hiss, bp, gh, o);
      const pops = every((t) => {
        burst(o, t, rand(1200, 4200), rand(3, 8), 0.02 + Math.pow(Math.random(), 4) * 0.3, rand(0.01, 0.05), rand(-0.5, 0.5));
      }, 0.08, 0.5, 0.2);
      const logs = every((t) => { // a log settles
        const v = voice(o, rand(-0.3, 0.3));
        const s = ctx.createBufferSource(); s.buffer = NB.brown;
        const l = filt("lowpass", 260, 0.8); s.connect(l); l.connect(v.g);
        hit(v.g.gain, t, 0.5, 0.02, 0.35); s.start(t, rand(0, 5), 0.5); v.done(s);
      }, 15, 40, 12);
      return bundle(o, [roar, hiss, pops, logs, wander(g.gain, 0.3, 0.62, 0.4, 1.3), wander(lp.frequency, 240, 520, 0.8, 2), wander(gh.gain, 0.012, 0.05, 1, 3)]);
    },
    crackle(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        burst(o, t, rand(1800, 5200), 7, 0.02 + Math.pow(Math.random(), 3) * 0.3, rand(0.02, 0.07), rand(-0.6, 0.6));
      }, 0.05, 0.3, 0.1);
      return bundle(o, [ev]);
    },
    bellows(out) {
      const o = amp(1); o.connect(out);
      const s = noise("pink"), bp = filt("bandpass", 700, 0.7), g = amp(0.0001);
      chain(s, bp, g, o);
      const br = metro(() => rand(3.3, 4.3), (t) => {
        g.gain.cancelScheduledValues(t); bp.frequency.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0.45, t, 0.35); bp.frequency.setTargetAtTime(820, t, 0.4);
        g.gain.setTargetAtTime(0.0001, t + 1.3, 0.45); bp.frequency.setTargetAtTime(380, t + 1.3, 0.5);
      }, 0.5);
      return bundle(o, [s, br]);
    },
    clank(out) {
      const o = amp(1); o.connect(out);
      const lp = filt("lowpass", 7000, 0.5); lp.connect(o);
      const grp = every((t) => {
        const f0 = rand(620, 900), pan = rand(-0.4, 0.4), n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const tt = t + i * rand(0.36, 0.52), vel = i === 0 ? 1 : rand(0.45, 0.8);
          partials(lp, tt, f0, [[1, 1, 1.2], [2.08, 0.6, 0.8], [3.37, 0.45, 0.5], [4.91, 0.3, 0.35], [6.28, 0.2, 0.25]], 0.12 * vel, pan, 0.0015);
          burst(lp, tt, 3000, 0.8, 0.12 * vel, 0.01, pan, "highpass");
        }
      }, 5, 11, 1.5);
      return bundle(o, [grp]);
    },
    roomtone(out) {
      const o = amp(1); o.connect(out);
      const a = noise("brown"), lp = filt("lowpass", 230, 0.5), g = amp(0.55);
      const b = noise("pink", 0.8), bp = filt("bandpass", 520, 0.5), gb = amp(0.07);
      chain(a, lp, g, o); chain(b, bp, gb, o);
      return bundle(o, [a, b, wander(g.gain, 0.45, 0.6, 10, 25)]);
    },
    clockwork(out) {
      const o = amp(1); o.connect(out);
      const pan = -0.25;
      let tock = false;
      const m = metro(() => 1.0 + rand(-0.003, 0.003), (t) => {
        burst(o, t, tock ? 2900 : 3300, 2.5, 0.2, 0.006, pan);
        const v = voice(o, pan);
        const r = ctx.createOscillator(); r.type = "sine"; r.frequency.value = tock ? 1650 : 1850;
        const w = ctx.createOscillator(); w.type = "sine"; w.frequency.value = 420;
        const gw = amp(0.6);
        r.connect(v.g); w.connect(gw); gw.connect(v.g);
        hit(v.g.gain, t, 0.05, 0.001, 0.04);
        r.start(t); w.start(t); r.stop(t + 0.08); w.stop(t + 0.08);
        v.done(r);
        tock = !tock;
      }, 0.3);
      return bundle(o, [m]);
    },
    vinyl(out) {
      const o = amp(1); o.connect(out);
      const hiss = noise("pink"), hp = filt("highpass", 3800, 0.5), gh = amp(0.02);
      const rum = noise("brown", 0.7), lp = filt("lowpass", 70, 0.7), gr = amp(0.25);
      chain(hiss, hp, gh, o); chain(rum, lp, gr, o);
      const pops = every((t) => {
        burst(o, t, rand(2500, 6000), 5, 0.01 + Math.pow(Math.random(), 5) * 0.2, rand(0.002, 0.012), rand(-0.3, 0.3));
      }, 0.06, 0.35, 0.1);
      return bundle(o, [hiss, rum, pops]);
    },
    hum(out) {
      const o = amp(1); o.connect(out);
      const saw = ctx.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = 60;
      const slp = filt("lowpass", 360, 0.7), sg = amp(0.09);
      const h2 = ctx.createOscillator(); h2.type = "sine"; h2.frequency.value = 120;
      const h2g = amp(0.05);
      const fan = noise("pink"), fbp = filt("bandpass", 800, 0.6), fg = amp(0.16);
      const low = noise("brown"), llp = filt("lowpass", 160, 0.6), lg = amp(0.3);
      chain(saw, slp, sg, o); chain(h2, h2g, o); chain(fan, fbp, fg, o); chain(low, llp, lg, o);
      saw.start(); h2.start();
      const relays = every((t) => {
        const n = 1 + Math.floor(Math.random() * 3), pan = rand(-0.7, 0.7);
        for (let i = 0; i < n; i++) burst(o, t + i * rand(0.04, 0.09), rand(2500, 4000), 3, rand(0.04, 0.09), 0.006, pan);
      }, 6, 18, 4);
      return bundle(o, [saw, h2, fan, low, relays, wander(fg.gain, 0.11, 0.2, 5, 12)]);
    },
    rigging(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        const v = voice(o, rand(-0.7, 0.7));
        const osc = ctx.createOscillator(); osc.type = "square";
        const f = rand(32, 70), d = rand(0.5, 1.3);
        osc.frequency.setValueAtTime(f, t); osc.frequency.linearRampToValueAtTime(f * rand(0.6, 1.7), t + d);
        const b1 = filt("bandpass", rand(450, 900), 7), b2 = filt("bandpass", rand(1100, 1600), 9), mix = amp(1);
        osc.connect(b1); osc.connect(b2); b1.connect(mix); b2.connect(mix); mix.connect(v.g);
        const pk = rand(0.05, 0.13);
        v.g.gain.setValueAtTime(0.0001, t);
        v.g.gain.exponentialRampToValueAtTime(pk, t + 0.15);
        v.g.gain.setTargetAtTime(pk * 0.7, t + 0.2, 0.2);
        v.g.gain.setTargetAtTime(0.0001, t + d, 0.08);
        osc.start(t); osc.stop(t + d + 0.5);
        osc.onended = () => { try { b1.disconnect(); b2.disconnect(); mix.disconnect(); } catch { /* ignore */ } };
        v.done(osc);
      }, 4, 10, 2);
      return bundle(o, [ev]);
    },
    insects(out) {
      const o = amp(1); o.connect(out);
      const voices = [0, 1, 2].map((i) => {
        const f = rand(4200, 4900), pan = [-0.6, 0.15, 0.7][i], rate = rand(0.55, 0.95);
        let singing = Math.random() < 0.6, until = 0;
        return metro(() => rate * rand(0.97, 1.03), (t) => {
          if (t > until) { singing = !singing; until = t + (singing ? rand(5, 16) : rand(3, 11)); }
          if (!singing) return;
          const v = voice(o, pan);
          const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
          osc.connect(v.g);
          const n = 3 + (Math.random() < 0.5 ? 1 : 0);
          v.g.gain.setValueAtTime(0, t);
          for (let k = 0; k < n; k++) {
            const tt = t + k * 0.034;
            v.g.gain.setValueAtTime(0, tt); v.g.gain.linearRampToValueAtTime(0.03, tt + 0.004);
            v.g.gain.linearRampToValueAtTime(0, tt + 0.016);
          }
          osc.start(t); osc.stop(t + n * 0.034 + 0.03); v.done(osc);
        }, rand(0.2, 1.5));
      });
      return bundle(o, voices);
    },
    rake(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        const strokes = 2 + Math.floor(Math.random() * 3);
        let tt = t;
        for (let i = 0; i < strokes; i++) {
          const d = rand(1.3, 2.1);
          const s = ctx.createBufferSource(); s.buffer = NB.pink;
          const bp = filt("bandpass", rand(1500, 2400), 0.8);
          const grain = amp(0.6);
          const lfo = ctx.createOscillator(); lfo.type = "triangle"; lfo.frequency.value = rand(14, 22);
          const lg = amp(0.4); lfo.connect(lg); lg.connect(grain.gain);
          const v = voice(o, 0);
          chain(s, bp, grain, v.g);
          if (v.p.pan) { v.p.pan.setValueAtTime(-0.4, tt); v.p.pan.linearRampToValueAtTime(0.4, tt + d); }
          v.g.gain.setValueAtTime(0.0001, tt);
          v.g.gain.exponentialRampToValueAtTime(0.12, tt + 0.3);
          v.g.gain.setTargetAtTime(0.0001, tt + d - 0.4, 0.12);
          s.start(tt, rand(0, 8), d + 0.3); lfo.start(tt); lfo.stop(tt + d + 0.3);
          lfo.onended = () => { try { lfo.disconnect(); lg.disconnect(); bp.disconnect(); grain.disconnect(); } catch { /* ignore */ } };
          v.done(s);
          tt += d + rand(0.4, 0.8);
        }
      }, 30, 60, 6);
      return bundle(o, [ev]);
    },
    drone(out) {
      const o = amp(1); o.connect(out);
      const lp = filt("lowpass", 280, 0.5), g = amp(0.3);
      lp.connect(g); g.connect(o);
      const oscs = [[55, "sawtooth", 0.3], [55.35, "sawtooth", 0.3], [82.2, "sawtooth", 0.2], [82.6, "sawtooth", 0.2], [110, "sine", 0.25]].map(([f, type, a]) => {
        const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = f;
        const og = amp(a); osc.connect(og); og.connect(lp); osc.start(); return osc;
      });
      return bundle(o, [...oscs, wander(lp.frequency, 170, 430, 8, 18), wander(g.gain, 0.22, 0.36, 7, 16)]);
    },
    dread(out) {
      const o = amp(1); o.connect(out);
      const lp = filt("lowpass", 220, 0.6), g = amp(0.32);
      lp.connect(g); g.connect(o);
      const oscs = [[49, 0.3], [51.9, 0.22], [73.4, 0.22], [77.8, 0.12]].map(([f, a]) => {
        const osc = ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = f;
        const og = amp(a); osc.connect(og); og.connect(lp); osc.start(); return osc;
      });
      const drifts = oscs.map((osc) => wander(osc.detune, -18, 18, 6, 15));
      return bundle(o, [...oscs, ...drifts, wander(lp.frequency, 110, 340, 5, 14), wander(g.gain, 0.18, 0.4, 4, 12)]);
    },
    crystal(out) {
      const o = amp(1); o.connect(out);
      const notes = [587.33, 659.25, 880, 987.77, 1174.66];
      const ev = every((t) => {
        const f = pick(notes), v = voice(o, rand(-0.6, 0.6));
        const a = ctx.createOscillator(), b = ctx.createOscillator(), c = ctx.createOscillator();
        a.frequency.value = f; b.frequency.value = f + rand(0.4, 0.9); c.frequency.value = f * 2;
        const cg = amp(0.12);
        a.connect(v.g); b.connect(v.g); c.connect(cg); cg.connect(v.g);
        const att = rand(3, 5), hold = rand(2, 4), rel = rand(6, 9);
        v.g.gain.setValueAtTime(0.0001, t);
        v.g.gain.exponentialRampToValueAtTime(0.09, t + att);
        v.g.gain.setValueAtTime(0.09, t + att + hold);
        v.g.gain.exponentialRampToValueAtTime(0.0001, t + att + hold + rel);
        const end = t + att + hold + rel + 0.1;
        [a, b, c].forEach((x) => { x.start(t); x.stop(end); });
        c.onended = () => { try { cg.disconnect(); } catch { /* ignore */ } };
        v.done(a);
      }, 7, 15, 0.5);
      return bundle(o, [ev]);
    },
    bowl(out) { return bowlLayer(out, [220], 18, 34); },
    bowl528(out) { return bowlLayer(out, [528, 528, 264], 14, 28); },
    belltoll(out) {
      const o = amp(1); o.connect(out);
      const lp = filt("lowpass", 3000, 0.5); lp.connect(o);
      const f0 = pick([146.83, 164.81, 196]);
      const ev = every((t) => {
        const n = 1 + Math.floor(Math.random() * 3), pan = rand(-0.5, 0.5);
        for (let i = 0; i < n; i++) {
          partials(lp, t + i * 3.4, f0, [[0.5, 0.5, 9], [1, 1, 7], [1.2, 0.55, 5], [1.5, 0.35, 4], [2, 0.5, 3.5], [2.51, 0.2, 2.5], [3.01, 0.14, 2], [4.2, 0.08, 1.2]], 0.07, pan, 0.006);
        }
      }, 24, 48, 4);
      return bundle(o, [ev]);
    },
    ghanta(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        const f0 = pick([792, 880]);
        const n = Math.random() < 0.4 ? 3 : 1, pan = rand(-0.4, 0.4);
        for (let i = 0; i < n; i++) partials(o, t + i * 0.9, f0, [[1, 1, 4.5, 1.2], [2.32, 0.4, 2.5], [4.25, 0.2, 1.2], [6.63, 0.08, 0.6]], 0.08 * (i ? 0.7 : 1), pan, 0.003);
      }, 20, 45, 8);
      return bundle(o, [ev]);
    },
    chimes(out) {
      const o = amp(1); o.connect(out);
      const scale = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51];
      const ev = every((t) => { // a breath of wind moves the set
        const n = 2 + Math.floor(Math.random() * 5);
        let tt = t;
        for (let i = 0; i < n; i++) {
          const k = Math.floor(Math.random() * scale.length);
          const pan = -0.5 + k / (scale.length - 1); // each tube hangs at its own place
          partials(o, tt, scale[k], [[1, 1, 4.2], [2.76, 0.35, 2.2], [5.4, 0.12, 0.9]], rand(0.025, 0.07), pan, 0.002);
          tt += rand(0.12, 0.6);
        }
      }, 5, 14, 1.5);
      return bundle(o, [ev]);
    },
    gong(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        const f0 = pick([82.4, 92.5, 98]), pan = rand(-0.2, 0.2);
        partials(o, t, f0, [[1, 1, 9], [1.53, 0.55, 6.5], [2.49, 0.42, 5], [3.75, 0.3, 3.5], [5.74, 0.18, 2.6], [8.68, 0.1, 1.8]], 0.1, pan, 0.012);
        const v = voice(o, pan); // shimmer that blooms after the strike
        const s = ctx.createBufferSource(); s.buffer = NB.pink;
        const bp = filt("bandpass", 3200, 0.9); s.connect(bp); bp.connect(v.g);
        v.g.gain.setValueAtTime(0.0001, t);
        v.g.gain.exponentialRampToValueAtTime(0.03, t + 0.7);
        v.g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
        s.start(t, rand(0, 5), 5.8); v.done(s);
      }, 22, 45, 3);
      return bundle(o, [ev]);
    },
    caravanBells(out) {
      const o = amp(1); o.connect(out);
      const bells = [{ f: 587.33, pan: -0.35, p: 0.55 }, { f: 440, pan: 0.3, p: 0.35 }, { f: 880, pan: 0.05, p: 0.2 }];
      let walking = true, until = ctx.currentTime + rand(25, 45);
      const m = metro(() => rand(1.05, 1.2), (t) => {
        if (t > until) { walking = !walking; until = t + (walking ? rand(25, 50) : rand(8, 18)); }
        if (!walking) return;
        bells.forEach((b, i) => {
          if (Math.random() > b.p) return;
          const tt = t + i * 0.37 + rand(-0.03, 0.03);
          partials(o, tt, b.f * rand(0.998, 1.002), [[1, 1, 1.4], [2.32, 0.45, 0.8], [4.25, 0.2, 0.45], [6.63, 0.1, 0.25]], rand(0.02, 0.06), b.pan, 0.002);
        });
      }, 0.6);
      return bundle(o, [m]);
    },
    bambooClack(out) {
      const o = amp(1); o.connect(out);
      const ev = every((t) => {
        [[520, 0.26], [880, 0.2]].forEach(([f, a]) => burst(o, t, f * rand(0.97, 1.03), 14, a, 0.055, -0.2));
        [[520, 0.08], [880, 0.06]].forEach(([f, a]) => burst(o, t + 0.13, f, 14, a, 0.04, -0.2)); // rebound on stone
      }, 26, 48, 5);
      return bundle(o, [ev]);
    },
    guzheng(out) {
      const o = amp(1); o.connect(out);
      const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66];
      const opt = { name: "zheng", secs: 3.2, t60: 2.6, bright: 0.55, pick: 0.17, damp: 0.5 };
      const ev = every((t) => {
        if (Math.random() < 0.5) { // glissando run
          const up = Math.random() < 0.6, len = 5 + Math.floor(Math.random() * 5);
          let k = up ? Math.floor(Math.random() * 3) : scale.length - 1 - Math.floor(Math.random() * 3);
          for (let i = 0; i < len && k >= 0 && k < scale.length; i++, k += up ? 1 : -1) {
            pluck(o, t + i * rand(0.045, 0.075), ksBuffer(scale[k], opt), 0.22 * (0.6 + 0.4 * Math.sin((i / len) * Math.PI)), rand(-0.4, 0.4));
          }
        } else { // a few slow notes, one pressed into a bend
          let k = 3 + Math.floor(Math.random() * 5), tt = t;
          const n = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) {
            const bend = Math.random() < 0.3 ? { at: 0.25, dur: 0.25, to: 1.0595 } : null;
            pluck(o, tt, ksBuffer(scale[k], opt), rand(0.2, 0.3), rand(-0.3, 0.3), bend);
            tt += rand(0.6, 1.1); k = Math.max(0, Math.min(scale.length - 1, k + pick([-2, -1, 1, 2])));
          }
        }
      }, 12, 26, 2);
      return bundle(o, [ev]);
    },
    oud(out) {
      const o = amp(1);
      const body = filt("peaking", 230, 1.2); body.gain.value = 4;
      const lp = filt("lowpass", 3200, 0.6);
      chain(o, body, lp); lp.connect(out);
      // maqam Hijaz on D
      const scale = [146.83, 155.56, 185, 196, 220, 233.08, 261.63, 293.66, 311.13, 369.99];
      const opt = { name: "oud", secs: 2.2, t60: 1.4, bright: 0.32, pick: 0.12, damp: 0.5 };
      const ev = every((t) => {
        let k = pick([0, 4, 7]), tt = t;
        const n = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) {
          const dur = pick([0.18, 0.18, 0.27, 0.36, 0.54]);
          if (Math.random() < 0.15) { // risha tremolo on one note
            const reps = 3 + Math.floor(Math.random() * 4);
            for (let r = 0; r < reps; r++) pluck(o, tt + r * 0.075, ksBuffer(scale[k], opt), 0.16 * (r ? 0.7 : 1), -0.1);
            tt += reps * 0.075 + 0.1;
          } else {
            pluck(o, tt, ksBuffer(scale[k], opt), rand(0.2, 0.3), -0.1);
            tt += dur;
          }
          k = Math.max(0, Math.min(scale.length - 1, k + pick([-1, -1, 1, 1, 2, -2])));
        }
        pluck(o, tt + 0.1, ksBuffer(pick([146.83, 220]), opt), 0.24, -0.1); // cadence on D or A
      }, 14, 28, 3);
      return bundle(o, [ev]);
    },
    tanpura(out) {
      const o = amp(1); o.connect(out);
      const sa = 132; // Sa = 132 Hz, so the 528 Hz bowls sit exactly two octaves above
      const strings = [sa * 0.75, sa, sa, sa / 2]; // Pa, Sa, Sa, kharaj Sa
      const opt = { name: "tanpura", secs: 6.5, t60: 5.5, bright: 0.45, pick: 0.2, damp: 0.5, buzz: 0.55 };
      let i = 0;
      const m = metro(() => (i % 4 === 0 ? rand(1.5, 1.8) : rand(1.05, 1.2)), (t) => {
        const f = strings[i % 4];
        pluck(o, t, ksBuffer(f, opt), i % 4 === 3 ? 0.3 : 0.22, [-0.3, -0.1, 0.1, 0.3][i % 4]);
        i++;
      }, 0.3);
      return bundle(o, [m]);
    },
    bansuri(out) {
      const o = amp(1); o.connect(out);
      const sa = 264; // raga Bhupali (Sa Re Ga Pa Dha), just intonation on Sa = 264 Hz
      const scale = [sa * 3 / 4, sa * 5 / 6, sa, sa * 9 / 8, sa * 5 / 4, sa * 3 / 2, sa * 5 / 3, sa * 2, sa * 9 / 4];
      const wave = ctx.createPeriodicWave(new Float32Array([0, 1, 0.3, 0.1, 0.04]), new Float32Array(5));
      const ev = every((t) => {
        const osc = ctx.createOscillator(); osc.setPeriodicWave(wave);
        const vib = ctx.createOscillator(); vib.frequency.value = rand(4.8, 5.6);
        const vibG = amp(0); vib.connect(vibG); vibG.connect(osc.frequency);
        const br = ctx.createBufferSource(); br.buffer = NB.pink; br.loop = true;
        const brBp = filt("bandpass", 1000, 1.4), brG = amp(0.14);
        const v = voice(o, rand(-0.2, 0.2));
        osc.connect(v.g); chain(br, brBp, brG, v.g);
        let k = pick([3, 4, 5]), tt = t;
        const n = 3 + Math.floor(Math.random() * 4);
        v.g.gain.setValueAtTime(0.0001, t);
        v.g.gain.exponentialRampToValueAtTime(0.09, t + 0.15);
        for (let i = 0; i < n; i++) {
          const f = scale[k], dur = i === n - 1 ? rand(2, 3.2) : rand(0.5, 1.5);
          if (i === 0) osc.frequency.setValueAtTime(f, tt); else osc.frequency.setTargetAtTime(f, tt, 0.05); // meend
          brBp.frequency.setTargetAtTime(f * 2, tt, 0.05);
          vibG.gain.setValueAtTime(0, tt); vibG.gain.linearRampToValueAtTime(f * 0.006, tt + Math.min(0.5, dur));
          if (i > 0) { v.g.gain.setTargetAtTime(0.06, tt - 0.03, 0.01); v.g.gain.setTargetAtTime(0.09, tt + 0.02, 0.03); }
          tt += dur;
          k = Math.max(0, Math.min(scale.length - 1, k + pick([-1, -1, 1, 1, -2, 2])));
        }
        v.g.gain.setTargetAtTime(0.0001, tt - 0.5, 0.18);
        [osc, vib, br].forEach((x) => { x.start(t); x.stop(tt + 0.6); });
        br.onended = () => { try { brBp.disconnect(); brG.disconnect(); vibG.disconnect(); vib.disconnect(); } catch { /* ignore */ } };
        v.done(osc);
      }, 16, 32, 5);
      return bundle(o, [ev]);
    },
    signal(out) {
      const o = amp(1); o.connect(out);
      const s = noise("pink"), bp = filt("bandpass", 1200, 6), g = amp(0.05);
      const car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = 1500;
      const cg = amp(0.0);
      chain(s, bp, g, o); chain(car, cg, o); car.start();
      return bundle(o, [s, car, wander(bp.frequency, 400, 2400, 3, 9), wander(g.gain, 0.02, 0.1, 3, 8),
        wander(car.frequency, 900, 2600, 6, 14), wander(cg.gain, 0, 0.012, 6, 16)]);
    },
    pulsar(out) {
      const o = amp(1), sc = amp(0.5); o.connect(sc); sc.connect(out);
      const scint = wander(sc.gain, 0.0, 1.0, 8, 20); // interstellar scintillation: fades in and out
      const m = metro(() => 0.7145, (t) => { // PSR B0329+54 period
        burst(o, t, 1100, 2, 0.12, 0.03, 0.1);
        const v = voice(o, 0.1);
        const th = ctx.createOscillator(); th.frequency.value = 90; th.connect(v.g);
        hit(v.g.gain, t, 0.12, 0.003, 0.07); th.start(t); th.stop(t + 0.1); v.done(th);
      }, 0.5);
      return bundle(sc, [m, scint]);
    },
    solarWind(out) {
      const o = amp(1); o.connect(out);
      const roar = noise("brown"), lp = filt("lowpass", 240, 0.5), gr = amp(0.45);
      const hiss = noise("pink", 1.2), bp = filt("bandpass", 3000, 0.4), gh = amp(0.05);
      chain(roar, lp, gr, o); chain(hiss, bp, gh, o);
      const flares = every((t) => {
        const v = voice(o, rand(-0.6, 0.6));
        const s = ctx.createBufferSource(); s.buffer = NB.pink;
        const hp = filt("highpass", 900, 0.5); s.connect(hp); hp.connect(v.g);
        v.g.gain.setValueAtTime(0.0001, t);
        v.g.gain.exponentialRampToValueAtTime(0.12, t + rand(2.5, 4.5));
        v.g.gain.exponentialRampToValueAtTime(0.0001, t + rand(8, 11));
        s.start(t, rand(0, 5), 11.5); v.done(s);
      }, 14, 30, 4);
      return bundle(o, [roar, hiss, flares, wander(gr.gain, 0.3, 0.6, 3, 9), wander(bp.frequency, 2000, 4500, 3, 9), wander(gh.gain, 0.02, 0.07, 2, 7)]);
    },
  };
  function bowlLayer(out, pitches, minS, maxS) {
    const o = amp(1); o.connect(out);
    const ev = every((t) => {
      const f0 = pick(pitches), pan = rand(-0.4, 0.4);
      burst(o, t, f0 * 6, 2, 0.05, 0.02, pan); // mallet contact
      partials(o, t, f0, [[1, 1, 14, rand(0.6, 1.4)], [2.71, 0.5, 8, rand(1, 2)], [5.1, 0.22, 4.5], [8.3, 0.08, 2.5]], 0.06, pan, 0.01);
    }, minS, maxS, 2);
    return bundle(o, [ev]);
  }

  // ---- layer control ------------------------------------------------------------
  const FADE = 1.6;
  const pendingStop = {};
  let trimPreset = null; // preset whose trims apply (kept while the user tweaks a scene)
  const layerTarget = (id) => {
    if (!state.layers[id].on) return 0;
    const cal = SYNTH[id] ? SYNTH[id].cal : 0.5;
    const p = trimPreset ? PRESETS[trimPreset] : null;
    const trim = p && p.mix && Object.prototype.hasOwnProperty.call(p.mix, id) ? dbToGain(p.trim || 0) : 1;
    return state.layers[id].vol * cal * trim;
  };
  function fadeLayer(id, dur) {
    if (!ctx) return;
    const n = nodes[id];
    const target = layerTarget(id);
    if (pendingStop[id]) { clearTimeout(pendingStop[id]); delete pendingStop[id]; }
    glide(n.gain.gain, target, dur);
    if (target === 0) {
      pendingStop[id] = setTimeout(() => {
        delete pendingStop[id];
        if (state.layers[id].on) return;
        if (n.el) { try { n.el.pause(); } catch { /* ignore */ } }
        if (n.synth) { n.synth.stop(); n.synth = null; }
      }, dur * 1000 + 250);
    }
  }
  function startLayer(id) {
    const n = nodes[id];
    if (RECORDED[id]) { startRecorded(id); return; }
    if (!n.synth) {
      try { n.synth = B[id](n.gain); } catch (e) { n.synth = null; }
    }
  }
  function startRecorded(id) {
    const n = nodes[id];
    if (n.failed) return;
    if (!n.el) {
      const el = new Audio();
      el.loop = true; el.preload = "auto"; el.crossOrigin = "anonymous";
      el.addEventListener("error", () => markFailed(id));
      el.src = RECORDED[id].url;
      try { ctx.createMediaElementSource(el).connect(n.gain); } catch { markFailed(id); return; }
      n.el = el;
    }
    // A failed load (offline, blocked host) marks just this row; it never touches
    // the preset or the visual FX.
    n.el.play().catch(() => markFailed(id));
  }
  function markFailed(id) {
    const n = nodes[id];
    if (n) n.failed = true;
    state.layers[id].on = false;
    const row = panel.querySelector(`.amb-layer[data-layer="${id}"]`);
    if (row) { row.classList.add("failed"); row.classList.remove("on"); const b = row.querySelector("[data-layerbtn]"); if (b) { b.setAttribute("aria-pressed", "false"); b.title = "Could not load (needs internet)"; } }
  }
  const anyLayerOn = () => LAYER_IDS.some((id) => state.layers[id].on);

  const LAYER_FX = { rainfall: "rain", rainGlass: "rain", blizzard: "blizzard", hearth: "embers", underwater: "caustics", bubbles: "bubbles",
    gong: "goldFoil", bambooClack: "sakura", tanpura: "incense", caravanBells: "stars", rumble: "lightning" };

  function setOn(id, on) {
    if (!LAYER_IDS.includes(id)) return;
    if (on && !ensureCtx()) return;
    state.layers[id].on = !!on;
    if (on) startLayer(id);
    fadeLayer(id, on ? 1.2 : 1.0);
    if (LAYER_FX[id]) setFx(LAYER_FX[id], !!on, true);
    markPreset(null);
    writeState(); syncUi();
  }
  function setVol(id, v) {
    if (!LAYER_IDS.includes(id)) return;
    state.layers[id].vol = clamp01(v);
    if (state.layers[id].on && ctx) fadeLayer(id, 0.25);
    writeState(); syncVolUi();
  }
  function setFx(type, on, quiet) {
    if (!(type in state.fx)) return;
    state.fx[type] = !!on;
    if (type === "lightning") scheduleBolt();
    if (!quiet) writeState();
    syncFxUi(); checkCanvasState(); updateFireFx();
  }

  function applyPreset(name) {
    name = LEGACY[name] || name;
    if (!PRESETS[name]) return;
    const p = PRESETS[name];
    if (name !== "off" && !ensureCtx()) return;
    state.preset = name; trimPreset = name;
    for (const id of LAYER_IDS) {
      const want = Object.prototype.hasOwnProperty.call(p.mix, id);
      if (!want && state.layers[id].on) { state.layers[id].on = false; fadeLayer(id, FADE); }
    }
    for (const id of Object.keys(p.mix)) {
      state.layers[id].vol = p.mix[id];
      state.layers[id].on = true;
      startLayer(id);
      fadeLayer(id, FADE);
    }
    if (name !== "off") setReverbSpace(p.space || "hall", p.wet != null ? p.wet : 0.22);
    for (const k of FX_KEYS) state.fx[k] = !!(p.fx && p.fx[k]);
    tint = Object.assign({}, DEFAULT_TINT, p.tint || {});
    scheduleBolt();
    markPreset(name); writeState(); syncUi();
    checkCanvasState(); updateFireFx();
  }

  // ---- sleep timer, binaural beats ------------------------------------------------
  let sleepTimer = null, sleepTarget = 0, sleepFactor = 1;
  function setSleepTimer(mins) {
    if (sleepTimer) { clearInterval(sleepTimer); sleepTimer = null; }
    sleepFactor = 1; applyMasterGain(0.5);
    const cd = panel.querySelector("#amb-timer-countdown");
    panel.querySelectorAll(".amb-timer-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.timer === String(mins || 0))));
    if (!mins || mins <= 0) { if (cd) cd.textContent = ""; return; }
    sleepTarget = Date.now() + mins * 60000;
    sleepTimer = setInterval(() => {
      const rem = Math.max(0, Math.round((sleepTarget - Date.now()) / 1000));
      if (cd) cd.textContent = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, "0")}`;
      if (rem <= 30) { sleepFactor = rem / 30; applyMasterGain(1.2); } // gentle 30 s fade
      if (rem <= 0) {
        clearInterval(sleepTimer); sleepTimer = null;
        applyPreset("off"); setBinaural("off");
        setTimeout(() => { sleepFactor = 1; applyMasterGain(0.1); }, 2500); // restore for next time
        if (cd) cd.textContent = "Faded out";
        panel.querySelectorAll(".amb-timer-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.timer === "0")));
      }
    }, 1000);
  }

  let bb = null;
  function setBinaural(type) {
    type = type || "off";
    panel.querySelectorAll(".amb-bb-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bb === type)));
    if (bb) { // fade out, then stop: no click
      const old = bb; bb = null;
      glide(old.g.gain, 0, 0.6);
      setTimeout(() => { try { old.l.stop(); old.r.stop(); old.g.disconnect(); } catch { /* ignore */ } }, 900);
    }
    if (type === "off" || !ensureCtx()) return;
    const delta = { alpha: 10, theta: 6, delta: 2.5 }[type] || 10;
    const base = 200;
    const merger = ctx.createChannelMerger(2);
    const g = amp(0);
    const l = ctx.createOscillator(), r = ctx.createOscillator();
    l.frequency.value = base; r.frequency.value = base + delta;
    l.connect(merger, 0, 0); r.connect(merger, 0, 1); merger.connect(g); g.connect(tonalBus);
    l.start(); r.start();
    glide(g.gain, 0.035, 1.5);
    bb = { l, r, g };
  }

  // ---- canvas visual FX ---------------------------------------------------------------
  const DEFAULT_TINT = {
    rain: [160, 195, 225], mist: [180, 200, 220], caustics: [200, 230, 255], causticsOp: 1,
    aurora: [[16, 185, 129], [6, 182, 212], [139, 92, 246]],
  };
  let tint = Object.assign({}, DEFAULT_TINT, (state.preset && PRESETS[state.preset] && PRESETS[state.preset].tint) || {});
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, a).toFixed(3)})`;

  const canvas = document.createElement("canvas");
  canvas.id = "rain-canvas";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const g2 = canvas.getContext("2d");

  let raf = null, t0 = 0, W = innerWidth, H = innerHeight, isMobile = false;
  let drops = [], ripples = [], flakes = [], sparks = [], mistWaves = [], goldLeaves = [], lanterns = [], petals = [],
    smoke = [], orbs = [], stars = [], streams = [], bubbles = [];
  let shootingStar = null, bolt = null, particlesFor = "";
  let fftBuf = null;

  function sizeCanvas() {
    W = innerWidth; H = innerHeight;
    isMobile = W < 768 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    const dpr = isMobile ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    if (g2) g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  let resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { sizeCanvas(); initParticles(); }, 150);
  }

  function initParticles() {
    const s = isMobile ? 0.5 : 1;
    const n = (k) => Math.max(3, Math.round(k * s));
    particlesFor = `${W}x${H}`;
    drops = Array.from({ length: n(30 + (state.intensity / 100) * 110) }, () => ({
      x: Math.random() * W, y: Math.random() * H, len: 12 + Math.random() * 22, spd: 11 + Math.random() * 8, op: 0.1 + Math.random() * 0.24, ph: Math.random() * 6.28,
    }));
    ripples = [];
    flakes = Array.from({ length: n(70) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: 1.1 + Math.random() * 3.2, spd: 0.9 + Math.random() * 2, op: 0.25 + Math.random() * 0.55,
      drift: Math.random() * 1.4 - 0.7, ph: Math.random() * 6.28, crystal: Math.random() < 0.25,
    }));
    sparks = Array.from({ length: n(36) }, () => newSpark(true));
    mistWaves = [
      { y: H * 0.58, amp: 26, speed: 0.0004, phase: 0, op: 0.05 },
      { y: H * 0.76, amp: 38, speed: 0.0006, phase: 1.8, op: 0.065 },
      { y: H * 0.9, amp: 20, speed: 0.0003, phase: 3.2, op: 0.055 },
    ];
    goldLeaves = Array.from({ length: n(18) }, () => ({
      x: Math.random() * W, y: Math.random() * H, w: 3 + Math.random() * 5, h: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.9, rot: Math.random() * 6.28, rs: (Math.random() - 0.5) * 0.04,
      flip: Math.random() * 3.14, fs: 0.015 + Math.random() * 0.03, op: 0.25 + Math.random() * 0.4,
    }));
    lanterns = Array.from({ length: isMobile ? 2 : 4 }, (_, i) => ({
      x: W * (0.15 + 0.23 * i) + (Math.random() - 0.5) * 60, y: H + Math.random() * 300, vy: 0.18 + Math.random() * 0.18,
      r: 10 + Math.random() * 7, sway: Math.random() * 6.28, op: 0.3 + Math.random() * 0.3,
    }));
    petals = Array.from({ length: n(20) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: 4 + Math.random() * 4.5, vx: 0.5 + Math.random() * 0.9, vy: 0.45 + Math.random() * 0.8,
      ang: Math.random() * 6.28, as: (Math.random() - 0.5) * 0.03, ph: Math.random() * 6.28, op: 0.3 + Math.random() * 0.4,
    }));
    smoke = [];
    orbs = Array.from({ length: n(10) }, () => ({ x: Math.random() * W, y: H + Math.random() * H, r: 1.5 + Math.random() * 2.5, vy: 0.25 + Math.random() * 0.5, op: 0.2 + Math.random() * 0.35, ph: Math.random() * 6.28 }));
    stars = Array.from({ length: n(75) }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.72, r: 0.7 + Math.random() * 1.8, speed: 0.002 + Math.random() * 0.004, ph: Math.random() * 6.28,
      diamond: Math.random() < 0.2, op: 0.3 + Math.random() * 0.55,
    }));
    const cols = Math.max(12, Math.floor(W / 28));
    streams = Array.from({ length: cols }, (_, i) => ({
      x: i * 28 + 14, y: Math.random() * H, len: 12 + Math.floor(Math.random() * 14), speed: 3 + Math.random() * 4.5,
      chars: Array.from({ length: 26 }, () => String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))), step: 0,
    }));
    bubbles = Array.from({ length: n(26) }, () => newBubble(true));
  }
  function newSpark(anywhere) {
    return { x: Math.random() * W, y: anywhere ? H * (0.4 + Math.random() * 0.6) : H + Math.random() * 30, r: 1 + Math.random() * 2.2,
      vy: 1.2 + Math.random() * 2.8, vx: (Math.random() - 0.5) * 1.4, life: 0.4 + Math.random() * 0.6, hue: Math.random() < 0.2 ? 45 : (Math.random() < 0.6 ? 32 : 16) };
  }
  function newBubble(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10 + Math.random() * 60, r: 1.2 + Math.random() * 4, vy: 0.4 + Math.random() * 0.9, ph: Math.random() * 6.28, op: 0.18 + Math.random() * 0.3 };
  }

  function boltNow() {
    if (reducedMotion || !state.fx.lightning) return;
    const sx = W * (0.2 + Math.random() * 0.6);
    const segs = [{ x: sx, y: 0 }], branches = [];
    let x = sx, y = 0;
    const ty = H * (0.55 + Math.random() * 0.35), steps = 14, dy = ty / steps;
    for (let i = 0; i < steps; i++) {
      x += (Math.random() - 0.48) * 42; y += dy; segs.push({ x, y });
      if (Math.random() < 0.4 && i > 3 && i < 11) {
        let bx = x, by = y; const b = [{ x: bx, y: by }], dir = Math.random() < 0.5 ? -1 : 1;
        for (let k = 0; k < 5; k++) { bx += dir * (16 + Math.random() * 22); by += dy * 0.65; b.push({ x: bx, y: by }); }
        branches.push(b);
      }
    }
    bolt = { segs, branches, alpha: 1 };
    strikeFlash();
    if (raf == null) checkCanvasState();
  }

  let lastFrame = 0;
  function render(now) {
    raf = requestAnimationFrame(render);
    if (!g2) return;
    lastFrame = now;
    g2.clearRect(0, 0, W, H);
    const mo = state.fxIntensity / 100;
    const gust = Math.sin((now - t0) / 2800) * 2.5;

    if (state.fx.aurora) {
      const aH = H * 0.42;
      for (let L = 0; L < 3; L++) {
        g2.beginPath(); g2.moveTo(0, 0);
        for (let x = 0; x <= W; x += 30) {
          const y = aH * 0.4 + Math.sin(x * 0.003 + now * 0.0004 + L * 1.5) * 45 + Math.cos(x * 0.007 - now * 0.0005) * 25 + L * 35;
          g2.lineTo(x, y);
        }
        g2.lineTo(W, 0); g2.closePath();
        const gr = g2.createLinearGradient(0, 0, 0, aH), c = tint.aurora[L % tint.aurora.length];
        gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.5, rgba(c, 0.13 * mo)); gr.addColorStop(1, rgba(c, 0));
        g2.fillStyle = gr; g2.fill();
      }
    }
    if (state.fx.caustics) {
      const c = tint.caustics, k = tint.causticsOp || 1;
      for (let i = 0; i < 4; i++) {
        const xo = (W / 5) * (i + 1) + Math.sin(now * 0.0003 + i) * 60;
        const breathe = 0.75 + 0.25 * Math.sin(now * 0.0004 + i * 1.7);
        const gr = g2.createLinearGradient(xo - 40, 0, xo + 120, H);
        gr.addColorStop(0, rgba(c, 0.12 * mo * k * breathe)); gr.addColorStop(0.7, rgba(c, 0.035 * mo * k * breathe)); gr.addColorStop(1, rgba(c, 0));
        g2.beginPath(); g2.moveTo(xo - 25, 0); g2.lineTo(xo + 140, H); g2.lineTo(xo + 60, H); g2.lineTo(xo + 15, 0); g2.closePath();
        g2.fillStyle = gr; g2.fill();
      }
    }
    if (state.fx.mist) {
      for (const m of mistWaves) {
        g2.beginPath(); g2.moveTo(0, H);
        for (let x = 0; x <= W; x += 40) g2.lineTo(x, m.y + Math.sin(x * 0.004 + now * m.speed + m.phase) * m.amp);
        g2.lineTo(W, H); g2.closePath();
        const gr = g2.createLinearGradient(0, m.y - m.amp, 0, H);
        gr.addColorStop(0, rgba(tint.mist, m.op * mo)); gr.addColorStop(1, rgba(tint.mist, 0));
        g2.fillStyle = gr; g2.fill();
      }
    }
    if (state.fx.rain) {
      g2.lineWidth = 1.1;
      for (const d of drops) {
        const sway = Math.sin((now - t0) / 900 + d.ph) * 0.6;
        g2.strokeStyle = rgba(tint.rain, d.op * mo);
        g2.beginPath(); g2.moveTo(d.x, d.y); g2.lineTo(d.x + gust + sway, d.y + d.len); g2.stroke();
        d.y += d.spd; d.x += gust * 0.35;
        if (d.y > H - 6) {
          if (Math.random() < 0.35 && ripples.length < 30) ripples.push({ x: d.x, y: H - 2 - Math.random() * 8, r: 1, max: 10 + Math.random() * 12, op: 0.3 * mo });
          d.y = -30; d.x = Math.random() * (W + 60) - 30;
        }
        if (d.x < -60) d.x = W + 40; else if (d.x > W + 60) d.x = -40;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        g2.strokeStyle = rgba(tint.rain, r.op);
        g2.beginPath(); g2.ellipse(r.x, r.y, r.r, r.r * 0.35, 0, 0, 6.283); g2.stroke();
        r.r += 0.8; r.op *= 0.94;
        if (r.r >= r.max || r.op < 0.01) ripples.splice(i, 1);
      }
    }
    if (state.fx.blizzard) {
      for (const f of flakes) {
        const sway = Math.sin((now - t0) / 750 + f.ph) * 1.8;
        const col = `rgba(235, 245, 255, ${(f.op * mo).toFixed(3)})`;
        if (f.crystal) {
          g2.strokeStyle = col; g2.lineWidth = 0.8; g2.beginPath();
          g2.moveTo(f.x - f.r, f.y); g2.lineTo(f.x + f.r, f.y); g2.moveTo(f.x, f.y - f.r); g2.lineTo(f.x, f.y + f.r); g2.stroke();
        } else { g2.fillStyle = col; g2.beginPath(); g2.arc(f.x, f.y, f.r, 0, 6.283); g2.fill(); }
        f.y += f.spd; f.x += f.drift + gust * 0.5 + sway * 0.4;
        if (f.y > H + 15) { f.y = -15; f.x = Math.random() * (W + 80) - 40; }
        if (f.x < -40) f.x = W + 30; else if (f.x > W + 40) f.x = -30;
      }
    }
    if (state.fx.embers) {
      for (const s of sparks) {
        g2.fillStyle = `hsla(${s.hue}, 95%, 60%, ${(s.life * mo).toFixed(3)})`;
        g2.beginPath(); g2.arc(s.x, s.y, s.r, 0, 6.283); g2.fill();
        s.y -= s.vy; s.x += s.vx + Math.sin(s.y * 0.05) * 0.7; s.life -= 0.004;
        if (s.y < -20 || s.life <= 0) Object.assign(s, newSpark(false));
      }
    }
    if (bolt && bolt.alpha > 0) {
      g2.save();
      g2.shadowColor = document.documentElement.dataset.atmo === "cursedwing" ? "#fca5a5" : "#93c5fd"; g2.shadowBlur = 18;
      g2.strokeStyle = `rgba(255,255,255,${bolt.alpha.toFixed(3)})`; g2.lineWidth = 2.4;
      g2.beginPath(); bolt.segs.forEach((p, i) => (i ? g2.lineTo(p.x, p.y) : g2.moveTo(p.x, p.y))); g2.stroke();
      g2.lineWidth = 1.2;
      for (const br of bolt.branches) { g2.beginPath(); br.forEach((p, i) => (i ? g2.lineTo(p.x, p.y) : g2.moveTo(p.x, p.y))); g2.stroke(); }
      g2.restore();
      bolt.alpha -= 0.08;
      if (bolt.alpha <= 0) bolt = null;
    }
    if (state.fx.goldFoil) {
      for (const l of lanterns) {
        l.y -= l.vy; l.x += Math.sin(now * 0.0006 + l.sway) * 0.25;
        if (l.y < -60) { l.y = H + Math.random() * 200; l.x = Math.random() * W; }
        const flick = 0.85 + 0.15 * Math.sin(now * 0.004 + l.sway * 3);
        const gr = g2.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r * 2.2);
        gr.addColorStop(0, `rgba(254, 215, 120, ${(0.55 * l.op * mo * flick).toFixed(3)})`);
        gr.addColorStop(0.4, `rgba(220, 60, 50, ${(0.3 * l.op * mo).toFixed(3)})`);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g2.fillStyle = gr; g2.beginPath(); g2.arc(l.x, l.y, l.r * 2.2, 0, 6.283); g2.fill();
        g2.fillStyle = `rgba(200, 40, 50, ${(0.5 * l.op * mo).toFixed(3)})`;
        g2.beginPath(); g2.ellipse(l.x, l.y, l.r * 0.5, l.r * 0.72, 0, 0, 6.283); g2.fill();
      }
      for (const f of goldLeaves) {
        f.y += f.vy; f.x += f.vx + Math.sin(now * 0.001 + f.rot) * 0.5; f.rot += f.rs; f.flip += f.fs;
        if (f.y > H + 20) { f.y = -20; f.x = Math.random() * W; }
        const shine = Math.abs(Math.sin(f.flip));
        g2.save(); g2.translate(f.x, f.y); g2.rotate(f.rot); g2.scale(Math.cos(f.flip), 1);
        g2.fillStyle = `rgba(${shine > 0.7 ? "254, 240, 138" : "234, 179, 8"}, ${(f.op * mo * (0.55 + 0.45 * shine)).toFixed(3)})`;
        g2.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); g2.restore();
      }
    }
    if (state.fx.sakura) {
      for (const p of petals) {
        p.x += p.vx + gust * 0.25; p.y += p.vy; p.ang += p.as;
        if (p.y > H + 20 || p.x > W + 30) { p.y = -20; p.x = Math.random() * (W + 40) - 60; }
        g2.save(); g2.translate(p.x, p.y); g2.rotate(p.ang); g2.scale(Math.cos(now * 0.0015 + p.ph), 1);
        g2.fillStyle = `rgba(251, 207, 232, ${(p.op * mo).toFixed(3)})`;
        g2.beginPath(); g2.moveTo(0, -p.r);
        g2.bezierCurveTo(p.r * 0.8, -p.r * 0.4, p.r * 0.8, p.r * 0.8, 0, p.r);
        g2.bezierCurveTo(-p.r * 0.8, p.r * 0.8, -p.r * 0.8, -p.r * 0.4, 0, -p.r);
        g2.fill(); g2.restore();
      }
    }
    if (state.fx.incense) {
      // Two sticks at the lower corners; each puff rises, curls, spreads and fades.
      if (smoke.length < (isMobile ? 36 : 60) && Math.random() < 0.5) {
        const src = Math.random() < 0.5 ? 0.1 : 0.9;
        smoke.push({ x: W * src, y: H + 4, r: 3, vy: 0.55 + Math.random() * 0.35, ph: Math.random() * 6.28, life: 1, sx: W * src });
      }
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i];
        s.y -= s.vy; s.r += 0.12; s.life -= 0.0028;
        s.x = s.sx + Math.sin(s.y * 0.012 + s.ph + now * 0.0004) * (8 + (H - s.y) * 0.06);
        if (s.life <= 0 || s.y < -40) { smoke.splice(i, 1); continue; }
        const a = 0.06 * s.life * mo;
        const gr = g2.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        gr.addColorStop(0, `rgba(226, 214, 196, ${a.toFixed(3)})`); gr.addColorStop(1, "rgba(226, 214, 196, 0)");
        g2.fillStyle = gr; g2.beginPath(); g2.arc(s.x, s.y, s.r, 0, 6.283); g2.fill();
      }
      for (const o of orbs) {
        o.y -= o.vy; o.x += Math.sin(now * 0.0008 + o.ph) * 0.35;
        if (o.y < -20) { o.y = H + Math.random() * 60; o.x = Math.random() * W; }
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.002 + o.ph);
        g2.fillStyle = `rgba(253, 186, 116, ${(o.op * pulse * mo).toFixed(3)})`;
        g2.beginPath(); g2.arc(o.x, o.y, o.r, 0, 6.283); g2.fill();
      }
    }
    if (state.fx.stars) {
      for (const s of stars) {
        const a = s.op * (0.4 + 0.6 * Math.max(0, Math.sin(now * s.speed + s.ph))) * mo;
        g2.fillStyle = `rgba(248, 250, 252, ${a.toFixed(3)})`;
        g2.beginPath();
        if (s.diamond) { g2.moveTo(s.x, s.y - s.r * 1.8); g2.lineTo(s.x + s.r, s.y); g2.lineTo(s.x, s.y + s.r * 1.8); g2.lineTo(s.x - s.r, s.y); g2.closePath(); }
        else g2.arc(s.x, s.y, s.r, 0, 6.283);
        g2.fill();
      }
      if (!shootingStar && Math.random() < 0.004) shootingStar = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.35, len: 80 + Math.random() * 90, dx: 12 + Math.random() * 8, dy: 5 + Math.random() * 4, life: 1 };
      if (shootingStar) {
        const s = shootingStar;
        g2.strokeStyle = `rgba(253, 230, 138, ${(s.life * 0.7 * mo).toFixed(3)})`; g2.lineWidth = 1.5;
        g2.beginPath(); g2.moveTo(s.x, s.y); g2.lineTo(s.x - s.dx * (s.len / 14), s.y - s.dy * (s.len / 14)); g2.stroke();
        s.x += s.dx; s.y += s.dy; s.life -= 0.055;
        if (s.life <= 0) shootingStar = null;
      }
    }
    if (state.fx.bubbles) {
      g2.lineWidth = 1;
      for (const b of bubbles) {
        b.y -= b.vy; b.vy = Math.min(2.2, b.vy * 1.002); b.x += Math.sin(now * 0.003 + b.ph) * 0.4;
        if (b.y < -10) Object.assign(b, newBubble(false));
        g2.strokeStyle = `rgba(200, 235, 255, ${(b.op * mo).toFixed(3)})`;
        g2.beginPath(); g2.arc(b.x, b.y, b.r, 0, 6.283); g2.stroke();
        g2.fillStyle = `rgba(255, 255, 255, ${(b.op * 0.8 * mo).toFixed(3)})`;
        g2.beginPath(); g2.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.5, b.r * 0.22), 0, 6.283); g2.fill();
      }
    }
    if (state.fx.dataGrid) {
      g2.save(); g2.font = '13px "Cascadia Code", Consolas, monospace'; g2.textAlign = "center";
      const ch = 17;
      for (const c of streams) {
        c.y += c.speed; c.step++;
        if (c.step % 7 === 0) c.chars[Math.floor(Math.random() * c.chars.length)] = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
        if (c.y - c.len * ch > H) { c.y = -20; c.speed = 3 + Math.random() * 4.5; }
        for (let j = 0; j < c.len; j++) {
          const cy = c.y - j * ch;
          if (cy < -20 || cy > H + 20) continue;
          g2.fillStyle = j === 0 ? `rgba(220, 255, 235, ${(0.9 * mo).toFixed(3)})` : `rgba(51, 255, 102, ${((1 - j / c.len) * 0.6 * mo).toFixed(3)})`;
          g2.fillText(c.chars[j % c.chars.length], c.x, cy);
        }
      }
      g2.restore();
    }
    if (state.fx.cymatics) { // manual only: concentric rings driven by the ambience level
      let e = 0;
      if (analyser) {
        if (!fftBuf) fftBuf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fftBuf);
        let sum = 0; for (let i = 0; i < fftBuf.length; i++) sum += fftBuf[i];
        e = sum / (fftBuf.length * 255);
      }
      const cx = W / 2, cy = H / 2, base = 70 + e * 180;
      for (let r = 1; r <= 3; r++) {
        const rad = base * r * 0.7;
        g2.strokeStyle = `rgba(200, 169, 74, ${(((0.04 + e * 0.16) / r) * mo).toFixed(3)})`; g2.lineWidth = 1.2;
        g2.beginPath();
        for (let a = 0; a <= 6.3; a += 0.05) {
          const h = Math.sin(a * 6 + now * 0.003) * (5 + e * 15);
          const px = cx + Math.cos(a) * (rad + h), py = cy + Math.sin(a) * (rad + h);
          if (a === 0) g2.moveTo(px, py); else g2.lineTo(px, py);
        }
        g2.closePath(); g2.stroke();
      }
    }
  }

  let listening = false;
  function checkCanvasState() {
    const anyFx = FX_KEYS.some((k) => state.fx[k]);
    const run = anyFx && !reducedMotion && !document.hidden;
    if (run) {
      if (!listening) { window.addEventListener("resize", onResize); listening = true; }
      if (canvas.hidden || !drops.length) { sizeCanvas(); if (particlesFor !== `${W}x${H}` || !drops.length) initParticles(); }
      canvas.hidden = false;
      if (raf == null) { t0 = performance.now(); raf = requestAnimationFrame(render); }
    } else {
      if (raf != null) { cancelAnimationFrame(raf); raf = null; }
      if (!anyFx || reducedMotion) {
        if (listening) { window.removeEventListener("resize", onResize); listening = false; }
        canvas.hidden = true;
        if (g2) g2.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }
  document.addEventListener("visibilitychange", checkCanvasState);
  if (mqReduced) {
    const onRM = () => { reducedMotion = mqReduced.matches; checkCanvasState(); updateFireFx(); syncFxUi(); };
    if (mqReduced.addEventListener) mqReduced.addEventListener("change", onRM);
    else if (mqReduced.addListener) mqReduced.addListener(onRM);
  }

  // Lightning: a screen bloom (CSS) plus the forked bolt on the canvas.
  const flash = document.createElement("div");
  flash.id = "lightning-flash";
  flash.setAttribute("aria-hidden", "true");
  document.body.appendChild(flash);
  function strikeFlash() {
    if (reducedMotion) return;
    const v = state.lightning / 100;
    const cursed = document.documentElement.dataset.atmo === "cursedwing";
    flash.style.setProperty("--bolt", cursed ? "rgba(255,70,70,0.55)" : "rgba(200,225,255,0.55)");
    flash.style.setProperty("--bolt-op", (0.2 + v * 0.5).toFixed(2));
    flash.classList.remove("strike"); void flash.offsetWidth; flash.classList.add("strike");
  }
  // Visual-only bolts when the thunder layer is off (with it on, the thunder
  // layer fires the bolt and follows it with the rumble).
  let boltTimer = 0;
  function scheduleBolt() {
    clearTimeout(boltTimer); boltTimer = 0;
    if (!state.fx.lightning || reducedMotion || state.layers.rumble.on) return;
    boltTimer = setTimeout(() => {
      boltTimer = 0;
      if (!document.hidden) { boltNow(); if (Math.random() < 0.3) setTimeout(boltNow, 650 + Math.random() * 700); }
      scheduleBolt();
    }, 9000 + Math.random() * 16000);
  }

  const fireGlow = document.createElement("div");
  fireGlow.id = "fire-glow"; fireGlow.setAttribute("aria-hidden", "true");
  document.body.appendChild(fireGlow);
  const emberLayer = document.createElement("div");
  emberLayer.id = "ember-layer"; emberLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(emberLayer);
  function updateFireFx() {
    const on = !!state.fx.embers && !reducedMotion;
    fireGlow.classList.toggle("lit", on);
    emberLayer.classList.toggle("lit", on);
    fireGlow.style.setProperty("--fire-op", (0.2 + (state.fxIntensity / 100) * 0.4).toFixed(2));
    if (on && !emberLayer.children.length) {
      for (let i = 0; i < 12; i++) {
        const e = document.createElement("i");
        const s = (2 + Math.random() * 3).toFixed(1);
        e.style.left = (Math.random() * 100).toFixed(1) + "vw";
        e.style.width = e.style.height = s + "px";
        e.style.animationDuration = (7 + Math.random() * 9).toFixed(1) + "s";
        e.style.animationDelay = (-Math.random() * 14).toFixed(1) + "s";
        emberLayer.appendChild(e);
      }
    }
  }

  // ---- mixer panel ---------------------------------------------------------------------
  const btn = document.getElementById("btn-rain");
  const panel = document.createElement("div");
  panel.className = "ambient-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ambience mixer");

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const layerLabel = (id) => (SYNTH[id] || RECORDED[id]).label;
  const layerRow = (id) => `
    <div class="amb-layer" data-layer="${id}">
      <button type="button" class="amb-layertoggle" data-layerbtn="${id}" aria-pressed="false">
        <span class="amb-meter" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="amb-layername">${esc(layerLabel(id))}</span>
      </button>
      <input type="range" class="amb-vol" data-vol="${id}" min="0" max="1" step="0.01" value="${state.layers[id].vol}" aria-label="${esc(layerLabel(id))} volume" />
    </div>`;
  const FX_LABELS = { rain: "Rain", blizzard: "Snow", embers: "Embers", aurora: "Aurora", lightning: "Lightning", mist: "Mist", caustics: "Light shafts",
    goldFoil: "Lanterns & gold leaf", sakura: "Blossoms", incense: "Incense smoke", stars: "Stars", dataGrid: "Data rain", bubbles: "Bubbles", cymatics: "Cymatics" };
  const SPACE_LABELS = { atelier: "Small room", hall: "Gallery hall", cathedral: "Cathedral", cavern: "Cavern", off: "Dry" };

  panel.innerHTML = `
    <div class="amb-head">
      <div class="amb-headtext">
        <div class="amb-title">Ambience</div>
        <div class="amb-sub" id="amb-now">Choose a scene</div>
      </div>
      <canvas id="amb-fft-canvas" class="amb-fft" width="64" height="20" aria-hidden="true"></canvas>
      <button type="button" id="amb-mute" class="amb-mute" aria-pressed="false" aria-label="Mute ambience" title="Mute ambience">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="amb-wave" d="M16.5 8.5a5 5 0 0 1 0 7"/><path class="amb-x" d="M16 9l5 6M21 9l-5 6"/></svg>
      </button>
      <button type="button" id="amb-close" aria-label="Close mixer">×</button>
    </div>
    <label class="amb-master amb-master-top">Volume <input type="range" id="amb-master" min="0" max="1" step="0.01" value="${state.master}" aria-label="Ambience volume" /></label>

    <div class="amb-secname">Scenes</div>
    <div class="amb-presets" role="group" aria-label="Scenes">
      ${PRESET_ORDER.map((p) => `<button type="button" class="amb-preset" data-preset="${p}" aria-pressed="false"><span>${esc(PRESETS[p].name)}</span></button>`).join("")}
    </div>
    <p class="amb-preset-desc" id="amb-preset-desc" aria-live="polite"></p>
    <p class="amb-note">While music plays, pitched layers step aside and the rest dips, so nothing clashes with the station.</p>

    <details class="amb-sec" id="amb-sec-fx">
      <summary>Visual effects</summary>
      <p class="amb-note" id="amb-rm-note" ${reducedMotion ? "" : "hidden"}>Your device asks for reduced motion, so screen effects stay off.</p>
      <div class="amb-fx-bar">${FX_KEYS.map((k) => `<button type="button" class="amb-fx-chip" data-fx="${k}" aria-pressed="false">${FX_LABELS[k]}</button>`).join("")}</div>
      <label class="amb-master">Strength <input type="range" id="amb-fx-intensity" min="0" max="100" step="1" value="${state.fxIntensity}" aria-label="Visual effects strength" /></label>
      <label class="amb-master">Rain density <input type="range" id="amb-intensity" min="0" max="100" step="1" value="${state.intensity}" aria-label="Rain density" /></label>
      <label class="amb-master">Lightning flash <input type="range" id="amb-lightning" min="0" max="100" step="1" value="${state.lightning}" aria-label="Lightning flash brightness" /></label>
    </details>

    <details class="amb-sec">
      <summary>Layers</summary>
      ${GROUPS.map((g) => `<div class="amb-group">${esc(g)}</div><div class="amb-layers">${Object.keys(SYNTH).filter((id) => SYNTH[id].group === g).map(layerRow).join("")}</div>`).join("")}
      <div class="amb-group">Recorded loops (need internet)</div>
      <div class="amb-layers">${Object.keys(RECORDED).map(layerRow).join("")}</div>
    </details>

    <details class="amb-sec">
      <summary>Room &amp; tone</summary>
      <div class="amb-reverb-bar" role="group" aria-label="Room">${SPACES.map((s) => `<button type="button" class="amb-reverb-btn btn small" data-reverb="${s}" aria-pressed="false">${SPACE_LABELS[s]}</button>`).join("")}</div>
      <label class="amb-master">Room amount <input type="range" id="amb-wet" min="0" max="0.6" step="0.01" value="${state.reverbMix}" aria-label="Reverb amount" /></label>
      <div class="amb-eq-strip">
        <label>Bass <input type="range" id="amb-eq-bass" min="-6" max="6" step="0.5" value="${state.eq.bass}" aria-label="Bass (dB)" /></label>
        <label>Mid <input type="range" id="amb-eq-mid" min="-6" max="6" step="0.5" value="${state.eq.mid}" aria-label="Mid (dB)" /></label>
        <label>Air <input type="range" id="amb-eq-air" min="-6" max="6" step="0.5" value="${state.eq.air}" aria-label="Air (dB)" /></label>
      </div>
    </details>

    <details class="amb-sec">
      <summary>Sleep timer &amp; binaural</summary>
      <div class="amb-timer-bar" role="group" aria-label="Sleep timer">
        ${[0, 15, 30, 60].map((m) => `<button type="button" class="amb-timer-btn btn small" data-timer="${m}" aria-pressed="${m === 0}">${m ? m + " min" : "No timer"}</button>`).join("")}
        <span class="amb-timer-countdown" id="amb-timer-countdown" aria-live="off"></span>
      </div>
      <div class="amb-binaural-bar" role="group" aria-label="Binaural beat (headphones)">
        ${[["off", "Off"], ["alpha", "Alpha 10 Hz"], ["theta", "Theta 6 Hz"], ["delta", "Delta 2.5 Hz"]].map(([k, l]) => `<button type="button" class="amb-bb-btn btn small" data-bb="${k}" aria-pressed="${k === "off"}">${l}</button>`).join("")}
      </div>
      <p class="amb-note">Binaural beats need headphones; they are quiet by design.</p>
    </details>
    <div id="amb-extra"></div>`;
  document.body.appendChild(panel);

  function markPreset(name) {
    state.preset = name;
    panel.querySelectorAll(".amb-preset").forEach((b) => {
      const on = b.dataset.preset === name;
      b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
    });
    const d = panel.querySelector("#amb-preset-desc");
    if (d) d.textContent = name && PRESETS[name] ? PRESETS[name].desc : "Custom mix.";
    const now = panel.querySelector("#amb-now");
    if (now) now.textContent = name && PRESETS[name] ? (name === "off" ? "Off" : PRESETS[name].name) : "Custom mix";
  }
  function syncFxUi() {
    panel.querySelectorAll(".amb-fx-chip").forEach((c) => {
      const on = !!state.fx[c.dataset.fx];
      c.classList.toggle("active", on); c.setAttribute("aria-pressed", String(on));
      c.disabled = reducedMotion;
    });
    const n = panel.querySelector("#amb-rm-note"); if (n) n.hidden = !reducedMotion;
  }
  function syncMuteUi() {
    const m = panel.querySelector("#amb-mute");
    if (m) { m.setAttribute("aria-pressed", String(state.muted)); m.setAttribute("aria-label", state.muted ? "Unmute ambience" : "Mute ambience"); m.title = m.getAttribute("aria-label"); }
    panel.classList.toggle("is-muted", state.muted);
  }
  function syncUi() {
    for (const id of LAYER_IDS) {
      const row = panel.querySelector(`.amb-layer[data-layer="${id}"]`);
      if (!row) continue;
      row.classList.toggle("on", state.layers[id].on);
      row.querySelector("[data-layerbtn]").setAttribute("aria-pressed", String(state.layers[id].on));
    }
    syncVolUi(); syncFxUi(); syncMuteUi();
    panel.querySelectorAll(".amb-reverb-btn").forEach((b) => {
      const on = b.dataset.reverb === state.reverb; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
    });
    const wet = panel.querySelector("#amb-wet"); if (wet && document.activeElement !== wet) wet.value = state.reverbMix;
    if (btn) btn.setAttribute("aria-pressed", String(anyLayerOn() && !state.muted));
    markPreset(state.preset);
  }
  function syncVolUi() {
    for (const id of LAYER_IDS) {
      const s = panel.querySelector(`input[data-vol="${id}"]`);
      if (s && document.activeElement !== s) s.value = state.layers[id].vol;
    }
  }

  function setMuted(m) {
    state.muted = !!m;
    if (state.muted === false && anyLayerOn()) ensureCtx();
    applyMasterGain(state.muted ? 0.25 : 0.8);
    writeState(); syncUi();
  }

  panel.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t || !panel.contains(t)) return;
    if (t.dataset.preset) { applyPreset(t.dataset.preset); return; }
    if (t.dataset.layerbtn) { const id = t.dataset.layerbtn; if (nodes[id] && nodes[id].failed) nodes[id].failed = false; setOn(id, !state.layers[id].on); return; }
    if (t.dataset.fx) { setFx(t.dataset.fx, !state.fx[t.dataset.fx]); if (t.dataset.fx === "lightning" && state.fx.lightning) boltNow(); return; }
    if (t.dataset.reverb) { ensureCtx(); setReverbSpace(t.dataset.reverb); writeState(); syncUi(); return; }
    if (t.dataset.bb) { setBinaural(t.dataset.bb); return; }
    if (t.dataset.timer != null) { setSleepTimer(parseInt(t.dataset.timer, 10)); return; }
    if (t.id === "amb-mute") { setMuted(!state.muted); return; }
    if (t.id === "amb-close") closeMixer();
  });
  panel.addEventListener("input", (e) => {
    const el = e.target;
    const v = parseFloat(el.value);
    if (el.dataset.vol) { setVol(el.dataset.vol, v); return; }
    switch (el.id) {
      case "amb-master": state.master = v; if (state.muted && v > 0) state.muted = false; applyMasterGain(0.2); syncMuteUi(); break;
      case "amb-intensity": state.intensity = v; initParticles(); break;
      case "amb-fx-intensity": state.fxIntensity = v; updateFireFx(); break;
      case "amb-lightning": state.lightning = v; break;
      case "amb-wet": state.reverbMix = v; if (ctx) setReverbSpace(state.reverb); break;
      case "amb-eq-bass": state.eq.bass = v; if (eqBass) glide(eqBass.gain, v, 0.1); break;
      case "amb-eq-mid": state.eq.mid = v; if (eqMid) glide(eqMid.gain, v, 0.1); break;
      case "amb-eq-air": state.eq.air = v; if (eqAir) glide(eqAir.gain, v, 0.1); break;
      default: return;
    }
    writeState();
  });

  let fftRaf = null;
  const fftCv = panel.querySelector("#amb-fft-canvas");
  function startFft() {
    if (fftRaf != null || reducedMotion) return;
    let data = null;
    const loop = () => {
      if (panel.hidden || document.hidden) { fftRaf = null; return; }
      fftRaf = requestAnimationFrame(loop);
      if (!fftCv || !analyser) return;
      const g = fftCv.getContext("2d");
      if (!data) data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      g.clearRect(0, 0, fftCv.width, fftCv.height);
      const bars = 12, bw = fftCv.width / bars - 1;
      for (let i = 0; i < bars; i++) {
        const val = data[Math.floor(Math.pow(i / bars, 1.6) * data.length * 0.6)] / 255;
        const h = Math.max(2, val * fftCv.height);
        g.fillStyle = val > 0.05 ? "rgba(200, 169, 74, 0.85)" : "rgba(128, 128, 128, 0.25)";
        g.fillRect(i * (bw + 1), fftCv.height - h, bw, h);
      }
    };
    fftRaf = requestAnimationFrame(loop);
  }
  function stopFft() { if (fftRaf != null) { cancelAnimationFrame(fftRaf); fftRaf = null; } }

  let returnFocus = null;
  function openMixer() {
    returnFocus = document.activeElement;
    panel.hidden = false;
    panel.scrollTop = 0;
    syncUi();
    startFft();
    const first = panel.querySelector(".amb-preset.active") || panel.querySelector("#amb-close");
    if (first) first.focus({ preventScroll: true });
  }
  function closeMixer() {
    panel.hidden = true;
    stopFft();
    if (returnFocus && document.contains(returnFocus) && returnFocus.focus) returnFocus.focus();
    returnFocus = null;
  }
  if (btn) btn.addEventListener("click", () => (panel.hidden ? openMixer() : closeMixer()));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeMixer(); } });

  // ---- public API -------------------------------------------------------------------------
  window.TitanAmbient = {
    openMixer, closeMixer, applyPreset,
    toggleFx: setFx,
    setMaster: (v) => { state.master = clamp01(v); applyMasterGain(0.3); writeState(); },
    setMuted, isMuted: () => state.muted,
    setVol, setOn,
    isActive: () => anyLayerOn() || FX_KEYS.some((k) => state.fx[k]),
    current: () => state.preset,
    presets: () => PRESET_ORDER.map((k) => ({ key: k, name: PRESETS[k].name, desc: PRESETS[k].desc })),
    layers: () => LAYER_IDS.map((id) => ({ id, label: layerLabel(id), recorded: !!RECORDED[id], on: state.layers[id].on })),
    // For wings/fx.js (tactile UI sounds): shares this context; bypasses duck and ambience volume.
    uiOutput: () => (ensureCtx() ? { ctx, out: uiBus } : null),
    panel: () => panel,
  };

  markPreset(state.preset);
  syncUi();
})();
