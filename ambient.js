/* Titan Reliquary — "Ambience Experience Engine" (v5).
   Generative Multi-Phenomenon Soundscape & Atmospheric Engine:
   - 9 recorded loops (Mixkit Free License, hotlinked).
   - 12 synthesized procedural layers built live with Web Audio:
     drone, fire crackle, wind gust, foundry clank, distant bell,
     ocean surf, polar blizzard, antique clockwork, singing bowl (432Hz),
     vinyl crackle, cavern drops, wind chimes.
   - 16 theme-matched presets (Nocturne, After Hours, Conservator, Colossus,
     Odyssey, Cursed Wing, Kaleidoscope, Abyss, Neon, Notepad, Construct,
     Xeno, Solaris, Alchemist, Glacier, Valhalla) + legacy aliases.
   - Atmospheric Visual FX Engine on full-viewport canvas:
     Rain & splash ripples, Arctic blizzard & crystalline snow,
     sweeping wind/mist billows, rising molten forge sparks & embers,
     Aurora Borealis wave curtains, procedural branching forked lightning,
     refractive sunrays & aquatic caustics.
   - Binaural brainwave entrainment (Alpha 10Hz, Theta 6Hz, Delta 2.5Hz).
   - Stereo panning drift and sleep fadeout timer. */
(() => {
  "use strict";

  const MX = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;

  // Recorded loops — verified 200 (Mixkit Sound Effects Free License).
  const RECORDED = {
    rain:     { label: "Rain",            url: MX(2394) },
    thunder:  { label: "Distant thunder", url: MX(2395) },
    fire:     { label: "Fireplace",       url: MX(1330) },
    wind:     { label: "Night wind",      url: MX(2483) },
    crickets: { label: "Summer crickets", url: MX(1789) },
    forest:   { label: "Forest birds",    url: MX(1213) },
    crowd:    { label: "Crowd murmur",    url: MX(444)  },
    office:   { label: "Room tone",       url: MX(447)  },
    scifi:    { label: "Machine hum",     url: MX(2507) },
  };

  // Synthesized layers — procedural Web Audio synthesis, zero downloads.
  const SYNTH = {
    drone:        { label: "Sub drone"              },
    crackle:      { label: "Fire sparkle"           },
    gust:         { label: "Wind swells"            },
    clank:        { label: "Foundry clanks"         },
    belltoll:     { label: "Distant bell"           },
    ocean:        { label: "Ocean surf"             },
    blizzard:     { label: "Polar blizzard"         },
    clockwork:    { label: "Antique clockwork"      },
    bowl:         { label: "Singing bowl 432Hz"     },
    vinyl:        { label: "Vinyl crackle"          },
    cavern:       { label: "Cavern drops"           },
    chimes:       { label: "Wind chimes"            },
    gong:         { label: "Imperial bronze gong"   },
    bambooClack:  { label: "Shishi-odoshi bamboo"   },
    omDrone:      { label: "Resonant 108Hz Om"      },
    caravanBells: { label: "Caravan bronze bells"   },
  };

  const ORDER = [...Object.keys(RECORDED), ...Object.keys(SYNTH)];
  const LAYER_IDS = ORDER;

  // 20 Dedicated Theme Presets + Classic Aliases
  const PRESETS = {
    nocturne:    { name: "Nocturne", desc: "Rain on midnight streets, vintage vinyl crackle, distant jazz murmur, and cool night wind.",
                   mix: { rain: 0.70, vinyl: 0.55, crowd: 0.30, wind: 0.25, drone: 0.15 },
                   fx: { rain: true, mist: true } },
    afterhours:  { name: "After Hours", desc: "Quiet gallery at 2 AM — skylight rain, vinyl warmth, and deep sub drone.",
                   mix: { rain: 0.85, vinyl: 0.45, drone: 0.35, gust: 0.25 },
                   fx: { rain: true } },
    conservator: { name: "Conservator", desc: "Restoration atelier: antique clockwork ticking, low hearthfire, and archival paper quiet.",
                   mix: { clockwork: 0.70, fire: 0.55, office: 0.45, crackle: 0.30 },
                   fx: { embers: true } },
    colossus:    { name: "Colossus", desc: "Forging great empires: anvil clanks, deep iron furnace drone, and leaping forge sparks.",
                   mix: { clank: 0.85, drone: 0.60, fire: 0.50, crackle: 0.65 },
                   fx: { embers: true, mist: true } },
    odyssey:     { name: "Odyssey", desc: "Open sea voyage: surging ocean surf, sweeping wind swells, and far seabirds.",
                   mix: { ocean: 0.85, gust: 0.60, wind: 0.45, forest: 0.35 },
                   fx: { mist: true } },
    cursedwing:  { name: "Cursed Wing", desc: "Thirteenth hour: abyssal drone, cavern water plinks, and sudden violent lightning.",
                   mix: { drone: 0.85, cavern: 0.70, thunder: 0.75, gust: 0.45 },
                   fx: { lightning: true } },
    kaleido:     { name: "Kaleidoscope", desc: "Psychedelic sanctuary: 432Hz singing bowl, wind chimes, and shimmering auroras.",
                   mix: { bowl: 0.85, chimes: 0.70, drone: 0.40, gust: 0.30 },
                   fx: { aurora: true } },
    abyss:       { name: "Sunken Treasury", desc: "Forty fathoms deep: ocean pressure, echoing cavern drops, and refracted sun caustics.",
                   mix: { ocean: 0.80, cavern: 0.70, drone: 0.65, belltoll: 0.35 },
                   fx: { caustics: true } },
    neon:        { name: "Neon Vault", desc: "Cyberpunk rain: wet asphalt, machine hum, and distant electronic thunder.",
                   mix: { scifi: 0.70, rain: 0.65, drone: 0.45, thunder: 0.30 },
                   fx: { rain: true, lightning: true } },
    notepad:     { name: "Plaintext", desc: "Monastic stillness: soft room tone, quiet antique clockwork, and calm mind.",
                   mix: { office: 0.50, clockwork: 0.40, drone: 0.15 },
                   fx: {} },
    construct:   { name: "The Construct", desc: "Machine room: rhythmic industrial hum, sub-bass drone, and metallic relays.",
                   mix: { scifi: 0.80, drone: 0.65, clank: 0.45 },
                   fx: {} },
    xeno:        { name: "Xenohold", desc: "Extraterrestrial relay: cosmic radio signal, deep space drone, and singing bowl resonance.",
                   mix: { scifi: 0.75, drone: 0.60, bowl: 0.55, gust: 0.35 },
                   fx: { aurora: true } },
    solaris:     { name: "Solaris", desc: "Solar observatory: solar wind flares, singing bowl 432Hz, and radiant corona sparks.",
                   mix: { drone: 0.80, bowl: 0.70, gust: 0.50, fire: 0.35 },
                   fx: { aurora: true, embers: true } },
    alchemist:   { name: "Alchemist", desc: "Hermetic laboratory: bubbling crucible, antique clockwork, and rising sparks.",
                   mix: { fire: 0.75, crackle: 0.65, clockwork: 0.50, office: 0.35 },
                   fx: { embers: true } },
    glacier:     { name: "Hyperborean", desc: "Sub-zero polar gale: arctic blizzard howl, crystalline ice, and emerald auroras.",
                   mix: { blizzard: 0.85, gust: 0.75, wind: 0.60, belltoll: 0.40 },
                   fx: { blizzard: true, aurora: true } },
    valhalla:    { name: "Valhalla", desc: "Great feast hall: roaring hearthfire, striking armory anvils, and mountain gale.",
                   mix: { fire: 0.85, crackle: 0.75, clank: 0.65, wind: 0.40 },
                   fx: { embers: true, mist: true } },
    dynasty:     { name: "Dynasty", desc: "Imperial palace court: resonant bronze temple gongs, wind chimes, night wind, and drifting golden leaf.",
                   mix: { gong: 0.85, chimes: 0.65, wind: 0.40, drone: 0.30 },
                   fx: { goldFoil: true } },
    zen:         { name: "Zen Garden", desc: "Karesansui monastery: rhythmic shishi-odoshi bamboo strikes, gentle wind swells, singing bowl, and falling cherry blossom petals.",
                   mix: { bambooClack: 0.85, bowl: 0.65, gust: 0.45, crickets: 0.30 },
                   fx: { sakura: true } },
    samadhi:     { name: "Samadhi", desc: "Himalayan meditation sanctuary: resonant 108Hz Om drone, Tibetan singing bowl 432Hz, room tone, and swirling incense smoke ribbons.",
                   mix: { omDrone: 0.85, bowl: 0.70, office: 0.30, drone: 0.25 },
                   fx: { incense: true } },
    silkroad:    { name: "Silk Road", desc: "Ancient desert caravanserai: rhythmic bronze camel bells, warm desert night wind, campfire crackle, and celestial oasis starlight.",
                   mix: { caravanBells: 0.85, wind: 0.60, crackle: 0.45, gust: 0.40 },
                   fx: { stars: true } },

    // Classic Legacy Aliases
    storm:       { name: "Storm", desc: "Rain hammers the skylights; thunder rolls somewhere far off.",
                   mix: { rain: 0.85, thunder: 0.60, wind: 0.50, gust: 0.55 },
                   fx: { rain: true, lightning: true } },
    foundry:     { name: "Foundry", desc: "Hammer-fall, furnace breath, and a deep iron drone.",
                   mix: { fire: 0.50, crackle: 0.70, clank: 0.80, drone: 0.45 },
                   fx: { embers: true } },
    fireside:    { name: "Fireside", desc: "Leather chairs, a low fire, rain at the window.",
                   mix: { fire: 0.90, crackle: 0.45, rain: 0.22, wind: 0.18 },
                   fx: { embers: true } },
    wayfarer:    { name: "Wayfarer", desc: "Open road under a wide sky; birds, wind, far thunder.",
                   mix: { forest: 0.65, wind: 0.45, gust: 0.40, thunder: 0.18 },
                   fx: { mist: true } },
    night:       { name: "Night watch", desc: "The museum after midnight — crickets and a far-off bell.",
                   mix: { crickets: 0.70, wind: 0.30, belltoll: 0.45, drone: 0.12 },
                   fx: {} },
    blackout:    { name: "Blackout", desc: "Power's out. Something in the walls is awake.",
                   mix: { drone: 0.80, gust: 0.50, belltoll: 0.50, scifi: 0.22 },
                   fx: { lightning: true } },
    tavern:      { name: "Tavern", desc: "Low talk, clinking glass, a fire in the corner.",
                   mix: { crowd: 0.65, fire: 0.35, crackle: 0.30, drone: 0.12 },
                   fx: { embers: true } },
    archive:     { name: "Deep archive", desc: "Paper dust, quiet machines, rain on the roof.",
                   mix: { office: 0.60, rain: 0.22, drone: 0.30, clockwork: 0.40 },
                   fx: {} },
    mirage:      { name: "Mirage", desc: "Heat-shimmer on the horizon; the machines are dreaming.",
                   mix: { scifi: 0.50, drone: 0.40, gust: 0.40, bowl: 0.40, crickets: 0.25 },
                   fx: { aurora: true } },
    depths:      { name: "Depths", desc: "Forty fathoms down. Pressure, dark water, a far-off bell.",
                   mix: { ocean: 0.80, drone: 0.75, gust: 0.50, belltoll: 0.35 },
                   fx: { caustics: true } },
    grid:        { name: "Grid", desc: "Chrome midnight. Neon hum and iron percussion.",
                   mix: { scifi: 0.65, drone: 0.45, clank: 0.30, crackle: 0.15 },
                   fx: { mist: true } },
    signal:      { name: "Signal", desc: "Something out there is transmitting. The bell answers.",
                   mix: { scifi: 0.70, drone: 0.50, belltoll: 0.45, thunder: 0.15 },
                   fx: { aurora: true } },
    off:         { name: "Off", desc: "Silence. Just the music.", mix: {}, fx: {} },
  };

  const PRESET_ORDER = [
    "nocturne", "afterhours", "conservator", "colossus",
    "odyssey", "cursedwing", "kaleido", "abyss",
    "neon", "solaris", "alchemist", "glacier",
    "valhalla", "construct", "xeno", "notepad",
    "dynasty", "zen", "samadhi", "silkroad", "off"
  ];

  const KEY = "tr_ambient_v3";
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- state ---------------------------------------------------------------
  const state = {
    layers: {},
    master: 0.8,
    intensity: 60,
    lightning: 70,
    fxIntensity: 75,
    preset: null,
    fx: {
      rain: false, blizzard: false, embers: false, aurora: false, lightning: false,
      mist: false, caustics: false, goldFoil: false, sakura: false, incense: false, stars: false
    }
  };
  for (const id of LAYER_IDS) state.layers[id] = { on: false, vol: 0.7 };

  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.layers) {
      for (const id of LAYER_IDS) if (raw.layers[id]) {
        state.layers[id].on = !!raw.layers[id].on;
        const v = parseFloat(raw.layers[id].vol);
        state.layers[id].vol = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
      }
      if (Number.isFinite(raw.master)) state.master = Math.min(1, Math.max(0, raw.master));
      if (Number.isFinite(raw.intensity)) state.intensity = Math.min(100, Math.max(0, raw.intensity));
      if (Number.isFinite(raw.lightning)) state.lightning = Math.min(100, Math.max(0, raw.lightning));
      if (Number.isFinite(raw.fxIntensity)) state.fxIntensity = Math.min(100, Math.max(0, raw.fxIntensity));
      if (raw.preset && PRESETS[raw.preset]) state.preset = raw.preset;
      if (raw.fx) {
        for (const k of Object.keys(state.fx)) if (raw.fx[k] != null) state.fx[k] = !!raw.fx[k];
      }
    }
  } catch { /* fresh */ }

  function writeState() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        layers: state.layers, master: state.master,
        intensity: state.intensity, lightning: state.lightning,
        fxIntensity: state.fxIntensity, preset: state.preset, fx: state.fx
      }));
    } catch { /* ignore */ }
  }

  // ---- audio graph ----------------------------------------------------------
  let ctx = null, masterGain = null, noiseBuf = null, analyser = null;
  const nodes = {}; // id -> { gain, pan, el?, synth?, src? }

  function ensureCtx() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = state.master;
    masterGain.connect(ctx.destination);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    masterGain.connect(analyser);

    // shared 2s white-noise buffer for procedural synths
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    for (const id of LAYER_IDS) {
      const gain = ctx.createGain(); gain.gain.value = 0;
      const pan = (ctx.createStereoPanner ? ctx.createStereoPanner() : null);
      gain.connect(pan || masterGain);
      if (pan) pan.connect(masterGain);
      nodes[id] = { gain, pan, el: null, synth: null };
    }
    startPanDrift();
    return true;
  }

  // ---- Binaural Beats Generator (Brainwave Entrainment) ----
  let bbLeftOsc = null, bbRightOsc = null, bbGain = null, activeBinaural = "off";
  function setBinaural(type) {
    activeBinaural = type || "off";
    if (bbLeftOsc) {
      try { bbLeftOsc.stop(); bbRightOsc.stop(); } catch (_) {}
      bbLeftOsc = null; bbRightOsc = null;
    }
    if (activeBinaural === "off" || !activeBinaural) {
      panel.querySelectorAll(".amb-bb-btn").forEach((b) => b.classList.toggle("active", b.dataset.bb === "off"));
      return;
    }
    if (!ensureCtx()) return;
    const baseFreq = 216; // Harmonic A
    let delta = 10;
    if (type === "alpha") delta = 10;   // 10Hz Focus
    if (type === "theta") delta = 6;    // 6Hz Zen
    if (type === "delta") delta = 2.5;  // 2.5Hz Deep Stillness
    const merger = ctx.createChannelMerger(2);
    bbGain = ctx.createGain();
    bbGain.gain.value = 0.08;
    bbLeftOsc = ctx.createOscillator();
    bbLeftOsc.type = "sine";
    bbLeftOsc.frequency.value = baseFreq;
    bbRightOsc = ctx.createOscillator();
    bbRightOsc.type = "sine";
    bbRightOsc.frequency.value = baseFreq + delta;
    bbLeftOsc.connect(merger, 0, 0);
    bbRightOsc.connect(merger, 0, 1);
    merger.connect(bbGain);
    bbGain.connect(masterGain);
    bbLeftOsc.start();
    bbRightOsc.start();
    panel.querySelectorAll(".amb-bb-btn").forEach((b) => b.classList.toggle("active", b.dataset.bb === type));
  }

  // ---- Sleep & Fadeout Timer ----
  let sleepTimer = null, sleepTarget = 0;
  function setSleepTimer(mins) {
    if (sleepTimer) { clearInterval(sleepTimer); sleepTimer = null; }
    const cd = panel.querySelector("#amb-timer-countdown");
    if (!mins || mins <= 0) {
      if (cd) cd.textContent = "";
      panel.querySelectorAll(".amb-timer-btn").forEach((b) => b.classList.toggle("active", b.dataset.timer === "0"));
      return;
    }
    panel.querySelectorAll(".amb-timer-btn").forEach((b) => b.classList.toggle("active", b.dataset.timer === String(mins)));
    sleepTarget = Date.now() + mins * 60 * 1000;
    sleepTimer = setInterval(() => {
      const rem = Math.max(0, Math.round((sleepTarget - Date.now()) / 1000));
      if (cd) cd.textContent = `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, "0")}`;
      if (rem <= 25 && ctx) {
        const frac = rem / 25;
        masterGain.gain.value = state.master * frac;
      }
      if (rem <= 0) {
        clearInterval(sleepTimer);
        sleepTimer = null;
        applyPreset("off");
        if (cd) cd.textContent = "Fadeout complete";
      }
    }, 1000);
  }

  const eff = (id) => state.layers[id].on ? state.layers[id].vol * 0.9 : 0;
  function rampGain(id, t = 0.9) {
    const n = nodes[id]; if (!n) return;
    const g = n.gain.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(eff(id), now + t);
  }

  // ---- Stereo pan drift ----
  let driftTimer = null;
  function startPanDrift() {
    if (driftTimer || reducedMotion) return;
    const wander = () => {
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const id of LAYER_IDS) {
        const p = nodes[id].pan; if (!p) continue;
        const target = (Math.random() * 2 - 1) * 0.55;
        p.pan.cancelScheduledValues(now);
        p.pan.setValueAtTime(p.pan.value, now);
        p.pan.linearRampToValueAtTime(target, now + 6 + Math.random() * 10);
      }
    };
    wander();
    driftTimer = setInterval(wander, 9000);
  }

  // ---- Synthesizer Builders (12 Web Audio Generative Layers) ----
  function lfo(param, rate, depth, base) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(param);
    if (Number.isFinite(base)) param.value = base;
    o.start();
    return o;
  }

  const synthBuilders = {
    // 1. Deep sub drone
    drone(n) {
      const out = ctx.createGain(); out.gain.value = 0.5; out.connect(n.gain);
      const oscs = [];
      [[36, "sine", .5], [41.3, "sine", .4], [55, "triangle", .22]].forEach(([f, t, gv]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = t; o.frequency.value = f; g.gain.value = gv;
        o.connect(g); g.connect(out); o.start(); oscs.push(o);
      });
      const breath = lfo(out.gain, 0.06, 0.14, 0.5);
      return { stop() { oscs.forEach((o) => { try { o.stop(); } catch {} }); try { breath.stop(); } catch {} out.disconnect(); } };
    },

    // 2. Wind swells
    gust(n) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 480; bp.Q.value = 0.45;
      const g = ctx.createGain(); g.gain.value = 0.32;
      src.connect(bp); bp.connect(g); g.connect(n.gain); src.start();
      const l1 = lfo(g.gain, 0.09, 0.2, 0.32);
      const l2 = lfo(bp.frequency, 0.05, 260, 480);
      return { stop() { [l1, l2].forEach((o) => { try { o.stop(); } catch {} }); try { src.stop(); } catch {} g.disconnect(); } };
    },

    // 3. Fire sparkle
    crackle(n) {
      let dead = false, timer = 0;
      const pop = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        s.playbackRate.value = 0.8 + Math.random() * 0.7;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.value = 1800 + Math.random() * 3400; bp.Q.value = 7;
        const g = ctx.createGain();
        const peak = 0.08 + Math.random() * 0.3, dec = 0.03 + Math.random() * 0.06;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0012, peak), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        s.connect(bp); bp.connect(g); g.connect(n.gain);
        s.start(t, Math.random() * 1.5, dec + 0.05);
        s.onended = () => { s.disconnect(); bp.disconnect(); g.disconnect(); };
        timer = setTimeout(pop, 50 + Math.random() * 220);
      };
      pop();
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 4. Foundry clanks
    clank(n) {
      let dead = false, timer = 0;
      const hit = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const f0 = 170 + Math.random() * 360;
        const car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = f0;
        const mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = f0 * 2.76;
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f0 * 2.2, t);
        mg.gain.exponentialRampToValueAtTime(1, t + 0.45);
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.0001, t);
        cg.gain.exponentialRampToValueAtTime(0.22 + Math.random() * 0.2, t + 0.008);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
        mod.connect(mg); mg.connect(car.frequency);
        car.connect(cg); cg.connect(lp); lp.connect(n.gain);
        car.start(t); mod.start(t); car.stop(t + 1); mod.stop(t + 1);
        car.onended = () => { car.disconnect(); mod.disconnect(); mg.disconnect(); cg.disconnect(); lp.disconnect(); };
        timer = setTimeout(hit, 2400 + Math.random() * 5200);
      };
      hit();
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 5. Distant bell
    belltoll(n) {
      let dead = false, timer = 0;
      const toll = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const base = [196, 220, 246.9][Math.floor(Math.random() * 3)];
        [[1, .16], [2.02, .09], [2.94, .05]].forEach(([m, gv]) => {
          const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = base * m;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
          o.connect(g); g.connect(n.gain);
          o.start(t); o.stop(t + 5);
          o.onended = () => { o.disconnect(); g.disconnect(); };
        });
        timer = setTimeout(toll, 8000 + Math.random() * 11000);
      };
      timer = setTimeout(toll, 1500);
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 6. Ocean surf
    ocean(n) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
      const g = ctx.createGain(); g.gain.value = 0.45;
      src.connect(lp); lp.connect(g); g.connect(n.gain); src.start();
      const swell = lfo(g.gain, 0.09, 0.28, 0.45);
      const sweep = lfo(lp.frequency, 0.09, 240, 340);
      return { stop() { [swell, sweep].forEach((o) => { try { o.stop(); } catch {} }); try { src.stop(); } catch {} g.disconnect(); } };
    },

    // 7. Polar blizzard
    blizzard(n) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp1 = ctx.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 380; bp1.Q.value = 2.8;
      const bp2 = ctx.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 890; bp2.Q.value = 5.2;
      const g = ctx.createGain(); g.gain.value = 0.4;
      src.connect(bp1); bp1.connect(g);
      src.connect(bp2); bp2.connect(g);
      g.connect(n.gain); src.start();
      const l1 = lfo(bp1.frequency, 0.12, 140, 380);
      const l2 = lfo(bp2.frequency, 0.18, 280, 890);
      const l3 = lfo(g.gain, 0.08, 0.22, 0.4);
      return { stop() { [l1, l2, l3].forEach((o) => { try { o.stop(); } catch {} }); try { src.stop(); } catch {} g.disconnect(); } };
    },

    // 8. Antique clockwork (rhythmic tick-tock)
    clockwork(n) {
      let dead = false, timer = 0, isTick = true;
      const tick = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.value = isTick ? 880 : 660; bp.Q.value = 9;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        s.connect(bp); bp.connect(g); g.connect(n.gain);
        s.start(t, 0, 0.05);
        s.onended = () => { s.disconnect(); bp.disconnect(); g.disconnect(); };
        isTick = !isTick;
        timer = setTimeout(tick, 500); // 120 BPM escapement
      };
      tick();
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 9. Singing bowl 432Hz
    bowl(n) {
      let dead = false, timer = 0;
      const strike = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const fund = 432;
        [[1, 0.22, 5.5], [2, 0.11, 4.0], [3, 0.05, 3.2]].forEach(([m, gv, dur]) => {
          const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = fund * m;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(g); g.connect(n.gain);
          osc.start(t); osc.stop(t + dur + 0.2);
          osc.onended = () => { osc.disconnect(); g.disconnect(); };
        });
        timer = setTimeout(strike, 6500 + Math.random() * 4000);
      };
      strike();
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 10. Vinyl crackle
    vinyl(n) {
      let dead = false, timer = 0;
      // Low constant motor rumble
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 52;
      const og = ctx.createGain(); og.gain.value = 0.06;
      osc.connect(og); og.connect(n.gain); osc.start();
      // Dust micro-pops
      const pop = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const s = ctx.createBufferSource(); s.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.value = 3500 + Math.random() * 2500; bp.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.04 + Math.random() * 0.08, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
        s.connect(bp); bp.connect(g); g.connect(n.gain);
        s.start(t, Math.random() * 1.5, 0.03);
        s.onended = () => { s.disconnect(); bp.disconnect(); g.disconnect(); };
        timer = setTimeout(pop, 40 + Math.random() * 180);
      };
      pop();
      return { stop() { dead = true; clearTimeout(timer); try { osc.stop(); } catch {} og.disconnect(); } };
    },

    // 11. Cavern drops
    cavern(n) {
      let dead = false, timer = 0;
      const drop = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator(); osc.type = "sine";
        const startF = 1350 + Math.random() * 300;
        osc.frequency.setValueAtTime(startF, t);
        osc.frequency.exponentialRampToValueAtTime(startF * 1.35, t + 0.035);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.24, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        osc.connect(g); g.connect(n.gain);
        osc.start(t); osc.stop(t + 0.5);
        osc.onended = () => { osc.disconnect(); g.disconnect(); };
        timer = setTimeout(drop, 2800 + Math.random() * 5500);
      };
      timer = setTimeout(drop, 1200);
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 12. Wind chimes (Pentatonic harmony)
    chimes(n) {
      let dead = false, timer = 0;
      const scale = [440, 523.25, 587.33, 659.25, 783.99, 880];
      const strike = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const f0 = scale[Math.floor(Math.random() * scale.length)];
        const count = Math.random() < 0.35 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const freq = f0 * (i === 1 ? (Math.random() < 0.5 ? 1.5 : 1.25) : 1);
          const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
          const g = ctx.createGain();
          const strikeT = t + i * (0.08 + Math.random() * 0.15);
          g.gain.setValueAtTime(0.0001, strikeT);
          g.gain.exponentialRampToValueAtTime(0.18, strikeT + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, strikeT + 3.8);
          osc.connect(g); g.connect(n.gain);
          osc.start(strikeT); osc.stop(strikeT + 4.0);
          osc.onended = () => { osc.disconnect(); g.disconnect(); };
        }
        timer = setTimeout(strike, 2200 + Math.random() * 4500);
      };
      timer = setTimeout(strike, 1000);
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 13. Imperial bronze temple gong & dragon chime
    gong(n) {
      let dead = false, timer = 0;
      const strike = () => {
        if (dead) return;
        const t = ctx.currentTime;
        const f0 = 110;
        const modes = [
          [1.0, 0.35, 7.5],
          [1.53, 0.22, 5.0],
          [2.49, 0.16, 4.2],
          [3.75, 0.11, 3.2],
          [5.74, 0.07, 2.4],
          [8.68, 0.04, 1.8]
        ];
        modes.forEach(([m, gv, dur]) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = f0 * m;
          osc.frequency.setValueAtTime(f0 * m * 1.015, t);
          osc.frequency.exponentialRampToValueAtTime(f0 * m, t + 0.08);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

          osc.connect(g);
          g.connect(n.gain);
          osc.start(t);
          osc.stop(t + dur + 0.2);
          osc.onended = () => { osc.disconnect(); g.disconnect(); };
        });
        timer = setTimeout(strike, 7500 + Math.random() * 5500);
      };
      timer = setTimeout(strike, 1200);
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 14. Shishi-odoshi (bamboo water deer-scarer strike & water trickle)
    bambooClack(n) {
      let dead = false, timer = 0;
      const clack = () => {
        if (dead) return;
        const t = ctx.currentTime;
        // Hollow bamboo strike (dual resonant bandpass poles)
        [520, 880].forEach((freq, idx) => {
          const s = ctx.createBufferSource();
          s.buffer = noiseBuf;
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = freq;
          bp.Q.value = 14;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.26 - idx * 0.06, t + 0.002);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
          s.connect(bp);
          bp.connect(g);
          g.connect(n.gain);
          s.start(t, 0, 0.07);
          s.onended = () => { s.disconnect(); bp.disconnect(); g.disconnect(); };
        });

        // 0.35s later: delicate water trickle drops into stone basin
        setTimeout(() => {
          if (dead) return;
          const tWater = ctx.currentTime;
          for (let d = 0; d < 3; d++) {
            const dropT = tWater + d * (0.09 + Math.random() * 0.08);
            const osc = ctx.createOscillator();
            osc.type = "sine";
            const startF = 1250 + Math.random() * 350;
            osc.frequency.setValueAtTime(startF, dropT);
            osc.frequency.exponentialRampToValueAtTime(startF * 1.35, dropT + 0.03);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, dropT);
            g.gain.exponentialRampToValueAtTime(0.09, dropT + 0.003);
            g.gain.exponentialRampToValueAtTime(0.0001, dropT + 0.22);
            osc.connect(g);
            g.connect(n.gain);
            osc.start(dropT);
            osc.stop(dropT + 0.25);
            osc.onended = () => { osc.disconnect(); g.disconnect(); };
          }
        }, 340);

        timer = setTimeout(clack, 5200 + Math.random() * 4200);
      };
      timer = setTimeout(clack, 1000);
      return { stop() { dead = true; clearTimeout(timer); } };
    },

    // 15. Sacred 108Hz resonant Om drone & Tibetan ghanta bell
    omDrone(n) {
      let dead = false, bellTimer = 0;
      const out = ctx.createGain();
      out.gain.value = 0.45;
      out.connect(n.gain);

      // Deep harmonic Om drone
      const oscs = [];
      const partials = [
        [108, "sine", 0.42],
        [216, "sine", 0.28],
        [324, "triangle", 0.16],
        [432, "sine", 0.14]
      ];
      partials.forEach(([f, t, gv]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = t;
        o.frequency.value = f;
        g.gain.value = gv;
        o.connect(g);
        g.connect(out);
        o.start();
        oscs.push(o);
      });
      // Prana slow breath
      const breath = lfo(out.gain, 0.048, 0.16, 0.45);

      // Tibetan Ghanta temple bell strike
      const ringBell = () => {
        if (dead) return;
        const t = ctx.currentTime;
        [[864, 0.16, 6.0], [1296, 0.08, 4.5], [1728, 0.04, 3.2]].forEach(([freq, gv, dur]) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(g);
          g.connect(n.gain);
          osc.start(t);
          osc.stop(t + dur + 0.2);
          osc.onended = () => { osc.disconnect(); g.disconnect(); };
        });
        bellTimer = setTimeout(ringBell, 12000 + Math.random() * 8000);
      };
      bellTimer = setTimeout(ringBell, 2500);

      return {
        stop() {
          dead = true;
          clearTimeout(bellTimer);
          oscs.forEach((o) => { try { o.stop(); } catch {} });
          try { breath.stop(); } catch {}
          out.disconnect();
        }
      };
    },

    // 16. Desert camel caravan bronze bells & oasis breeze
    caravanBells(n) {
      let dead = false, timer = 0;
      const chime = () => {
        if (dead) return;
        const t = ctx.currentTime;
        // Double-bell clink
        const pitches = [640, 820];
        pitches.forEach((freq, idx) => {
          const strikeT = t + idx * 0.14;
          [[1, 0.18, 2.8], [2.2, 0.07, 1.6]].forEach(([m, gv, dur]) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq * m;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, strikeT);
            g.gain.exponentialRampToValueAtTime(gv, strikeT + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, strikeT + dur);
            osc.connect(g);
            g.connect(n.gain);
            osc.start(strikeT);
            osc.stop(strikeT + dur + 0.1);
            osc.onended = () => { osc.disconnect(); g.disconnect(); };
          });
        });
        timer = setTimeout(chime, 2400 + Math.random() * 2800);
      };
      timer = setTimeout(chime, 800);
      return { stop() { dead = true; clearTimeout(timer); } };
    },
  };

  // ---- Layer control ----
  function startRecorded(id) {
    const n = nodes[id];
    if (!n.el) {
      const el = new Audio();
      el.loop = true; el.preload = "auto"; el.crossOrigin = "anonymous";
      el.src = RECORDED[id].url;
      const src = ctx.createMediaElementSource(el);
      src.connect(n.gain);
      n.el = el;
    }
    n.el.play().catch(() => { setOn(id, false); });
  }

  function setOn(id, on) {
    if (!LAYER_IDS.includes(id)) return;
    state.layers[id].on = !!on;
    if (on && !ensureCtx()) { state.layers[id].on = false; syncUi(); return; }
    const n = nodes[id];
    if (on) {
      if (RECORDED[id]) startRecorded(id);
      else if (!n.synth) n.synth = synthBuilders[id](n);
    } else {
      if (n.el) n.el.pause();
      if (n.synth) { try { n.synth.stop(); } catch {} n.synth = null; }
    }
    rampGain(id);
    if (id === "rain") setFx("rain", !!on);
    if (id === "thunder") { setFx("lightning", !!on); if (on) scheduleBolt(); }
    if (id === "fire") { setFx("embers", !!on); updateFireFx(); }
    if (id === "blizzard") setFx("blizzard", !!on);
    if (id === "ocean") setFx("caustics", !!on);
    if (id === "gong") setFx("goldFoil", !!on);
    if (id === "bambooClack") setFx("sakura", !!on);
    if (id === "omDrone") setFx("incense", !!on);
    if (id === "caravanBells") setFx("stars", !!on);
    markPreset(null);
    writeState(); syncUi();
  }

  function setVol(id, v) {
    if (!LAYER_IDS.includes(id)) return;
    state.layers[id].vol = Math.min(1, Math.max(0, v));
    if (state.layers[id].on && ctx) rampGain(id, 0.25);
    if (id === "fire") updateFireFx();
    markPreset(null);
    writeState(); syncVolUi();
  }

  function setFx(type, on) {
    if (state.fx[type] != null) {
      state.fx[type] = !!on;
      syncFxUi();
      checkCanvasState();
      writeState();
    }
  }

  function applyPreset(name) {
    if (!PRESETS[name]) return;
    if (name === "off") {
      for (const id of LAYER_IDS) if (state.layers[id].on) setOn(id, false);
      for (const k of Object.keys(state.fx)) state.fx[k] = false;
      state.preset = "off"; markPreset("off"); writeState(); syncUi();
      checkCanvasState();
      return;
    }
    if (!ensureCtx()) return;
    const p = PRESETS[name];
    // Audio mix
    for (const id of Object.keys(p.mix)) {
      state.layers[id].vol = p.mix[id];
      if (!state.layers[id].on) {
        state.layers[id].on = true;
        const n = nodes[id];
        if (RECORDED[id]) startRecorded(id);
        else if (!n.synth) n.synth = synthBuilders[id](n);
      }
    }
    for (const id of LAYER_IDS) {
      const want = Object.prototype.hasOwnProperty.call(p.mix, id);
      if (!want && state.layers[id].on) {
        state.layers[id].on = false;
        const n = nodes[id];
        if (n.el) n.el.pause();
        if (n.synth) { try { n.synth.stop(); } catch {} n.synth = null; }
      }
      if (ctx) rampGain(id, 1.2);
    }
    // Coupled Visual Effects
    for (const k of Object.keys(state.fx)) {
      state.fx[k] = p.fx && p.fx[k] ? true : false;
    }
    if (state.fx.lightning) scheduleBolt();
    state.preset = name;
    markPreset(name); writeState(); syncUi();
    checkCanvasState();
  }

  // ---- Atmospheric Multi-Layer Canvas Engine ----
  const canvas = document.createElement("canvas");
  canvas.id = "rain-canvas";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx2d = canvas.getContext("2d");

  let raf = null, t0 = 0;
  let drops = [], ripples = [], flakes = [], sparks = [], mistWaves = [];
  let goldLeaves = [], lanterns = [], sakuraPetals = [], incensePlumes = [], pranaOrbs = [], desertStars = [];
  let shootingStar = null;
  let lightningBolt = null; // { segments: [], branches: [], alpha: 0 }

  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initParticles() {
    // Rain
    const nDrops = Math.round(50 + (state.intensity / 100) * 180);
    drops = Array.from({ length: nDrops }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      len: 12 + Math.random() * 24, spd: 11 + Math.random() * 9,
      op: 0.12 + Math.random() * 0.26, ph: Math.random() * Math.PI * 2
    }));
    ripples = [];

    // Snow Flakes
    flakes = Array.from({ length: 90 }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 1.2 + Math.random() * 3.5, spd: 1.0 + Math.random() * 2.2,
      op: 0.25 + Math.random() * 0.6, drift: Math.random() * 1.5 - 0.75,
      ph: Math.random() * Math.PI * 2, isCrystal: Math.random() < 0.28
    }));

    // Sparks / Embers
    sparks = Array.from({ length: 55 }, () => ({
      x: Math.random() * innerWidth, y: innerHeight + Math.random() * 100,
      r: 1.2 + Math.random() * 2.6, vy: 1.5 + Math.random() * 3.2,
      vx: (Math.random() - 0.5) * 1.8, life: 0.3 + Math.random() * 0.7,
      hue: Math.random() < 0.2 ? 45 : (Math.random() < 0.6 ? 32 : 16)
    }));

    // Mist waves
    mistWaves = [
      { y: innerHeight * 0.55, amp: 28, speed: 0.0004, phase: 0, op: 0.05 },
      { y: innerHeight * 0.75, amp: 40, speed: 0.0006, phase: 1.8, op: 0.07 },
      { y: innerHeight * 0.90, amp: 20, speed: 0.0003, phase: 3.2, op: 0.06 }
    ];

    // Dynasty: Drifting Gold Leaf Flakes & Crimson Lanterns
    goldLeaves = Array.from({ length: 42 }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      w: 3.5 + Math.random() * 6.5, h: 2.5 + Math.random() * 5.0,
      vx: (Math.random() - 0.5) * 1.2, vy: 0.8 + Math.random() * 1.8,
      rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.06,
      flip: Math.random() * Math.PI, flipSpeed: 0.02 + Math.random() * 0.04,
      op: 0.35 + Math.random() * 0.55
    }));
    lanterns = Array.from({ length: 5 }, (_, i) => ({
      x: innerWidth * (0.12 + 0.19 * i) + (Math.random() - 0.5) * 80,
      y: innerHeight + Math.random() * 200,
      vy: 0.35 + Math.random() * 0.45,
      r: 14 + Math.random() * 8,
      sway: Math.random() * Math.PI * 2,
      op: 0.5 + Math.random() * 0.4
    }));

    // Zen Garden: Falling Sakura Cherry Blossom Petals
    sakuraPetals = Array.from({ length: 48 }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 4.5 + Math.random() * 5.5,
      vx: 1.0 + Math.random() * 1.8, vy: 0.8 + Math.random() * 1.4,
      ang: Math.random() * Math.PI * 2, angSpeed: (Math.random() - 0.5) * 0.04,
      ph: Math.random() * Math.PI * 2, op: 0.35 + Math.random() * 0.5
    }));

    // Samadhi: Incense Smoke Plumes & Golden Prana Orbs
    incensePlumes = Array.from({ length: 3 }, (_, i) => ({
      x: innerWidth * (0.25 + 0.25 * i),
      phase: i * 2.1, amp: 22 + Math.random() * 14,
      speed: 0.0012 + Math.random() * 0.0006
    }));
    pranaOrbs = Array.from({ length: 30 }, () => ({
      x: Math.random() * innerWidth, y: innerHeight + Math.random() * 60,
      r: 2.0 + Math.random() * 4.5, vy: 0.5 + Math.random() * 1.4,
      op: 0.25 + Math.random() * 0.55, ph: Math.random() * Math.PI * 2
    }));

    // Silk Road: Desert Starlight & Shooting Stars
    desertStars = Array.from({ length: 75 }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * (innerHeight * 0.72),
      r: 0.8 + Math.random() * 2.2, speed: 0.002 + Math.random() * 0.004,
      ph: Math.random() * Math.PI * 2, isDiamond: Math.random() < 0.25,
      baseOp: 0.3 + Math.random() * 0.6
    }));
  }

  function triggerForkedLightning() {
    if (reducedMotion) return;
    const startX = innerWidth * (0.2 + Math.random() * 0.6);
    const segs = [{ x: startX, y: 0 }];
    let curX = startX, curY = 0;
    const targetY = innerHeight * (0.6 + Math.random() * 0.35);
    const steps = 14;
    const dy = targetY / steps;
    const branches = [];

    for (let i = 0; i < steps; i++) {
      curX += (Math.random() - 0.48) * 44;
      curY += dy;
      segs.push({ x: curX, y: curY });
      if (Math.random() < 0.45 && i > 3 && i < 11) {
        // Branch
        let bx = curX, by = curY;
        const bSegs = [{ x: bx, y: by }];
        const bDir = Math.random() < 0.5 ? -1 : 1;
        for (let b = 0; b < 5; b++) {
          bx += bDir * (18 + Math.random() * 24);
          by += dy * 0.65;
          bSegs.push({ x: bx, y: by });
        }
        branches.push(bSegs);
      }
    }
    lightningBolt = { segments: segs, branches, alpha: 1.0 };
    strikeFlash();
  }

  function renderVisuals(now) {
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, innerWidth, innerHeight);
    const masterOp = (state.fxIntensity / 100);
    const gust = Math.sin((now - t0) / 2800) * 2.5;

    // 1. Aurora Borealis Curtains
    if (state.fx.aurora && !reducedMotion) {
      const aH = innerHeight * 0.42;
      for (let layer = 0; layer < 3; layer++) {
        ctx2d.beginPath();
        ctx2d.moveTo(0, 0);
        for (let x = 0; x <= innerWidth; x += 30) {
          const w1 = Math.sin(x * 0.003 + (now * 0.0006) + layer * 1.5) * 45;
          const w2 = Math.cos(x * 0.007 - (now * 0.0008)) * 25;
          const y = aH * 0.4 + w1 + w2 + layer * 35;
          ctx2d.lineTo(x, y);
        }
        ctx2d.lineTo(innerWidth, 0);
        ctx2d.closePath();
        const grad = ctx2d.createLinearGradient(0, 0, 0, aH);
        const col = layer === 0 ? "rgba(16, 185, 129," : (layer === 1 ? "rgba(6, 182, 212," : "rgba(139, 92, 246,");
        grad.addColorStop(0, col + " 0)");
        grad.addColorStop(0.5, col + ` ${(0.14 * masterOp).toFixed(3)})`);
        grad.addColorStop(1, col + " 0)");
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }
    }

    // 2. Refractive Aquatic Caustics & Sunbeams
    if (state.fx.caustics && !reducedMotion) {
      for (let i = 0; i < 4; i++) {
        const xOffset = (innerWidth / 5) * (i + 1) + Math.sin(now * 0.0005 + i) * 60;
        const grad = ctx2d.createLinearGradient(xOffset - 40, 0, xOffset + 120, innerHeight);
        grad.addColorStop(0, `rgba(200, 230, 255, ${(0.12 * masterOp).toFixed(3)})`);
        grad.addColorStop(0.7, `rgba(100, 180, 220, ${(0.04 * masterOp).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx2d.beginPath();
        ctx2d.moveTo(xOffset - 25, 0);
        ctx2d.lineTo(xOffset + 140, innerHeight);
        ctx2d.lineTo(xOffset + 60, innerHeight);
        ctx2d.lineTo(xOffset + 15, 0);
        ctx2d.closePath();
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }
    }

    // 3. Sweeping Mist & Wind Streams
    if (state.fx.mist && !reducedMotion) {
      for (const m of mistWaves) {
        ctx2d.beginPath();
        ctx2d.moveTo(0, innerHeight);
        for (let x = 0; x <= innerWidth; x += 40) {
          const y = m.y + Math.sin(x * 0.004 + (now * m.speed) + m.phase) * m.amp;
          ctx2d.lineTo(x, y);
        }
        ctx2d.lineTo(innerWidth, innerHeight);
        ctx2d.closePath();
        const grad = ctx2d.createLinearGradient(0, m.y - m.amp, 0, innerHeight);
        grad.addColorStop(0, `rgba(180, 200, 220, ${(m.op * masterOp).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }
    }

    // 4. Rain & Splash Ripples
    if (state.fx.rain) {
      ctx2d.lineWidth = 1.1;
      for (const d of drops) {
        const sway = Math.sin((now - t0) / 900 + d.ph) * 0.6;
        ctx2d.strokeStyle = `rgba(160, 195, 225, ${(d.op * masterOp).toFixed(3)})`;
        ctx2d.beginPath(); ctx2d.moveTo(d.x, d.y);
        ctx2d.lineTo(d.x + gust + sway, d.y + d.len); ctx2d.stroke();
        d.y += d.spd; d.x += gust * 0.35;
        if (d.y > innerHeight - 6) {
          if (Math.random() < 0.45 && ripples.length < 35) {
            ripples.push({ x: d.x, y: innerHeight - 2 - Math.random() * 8, r: 1, maxR: 12 + Math.random() * 14, op: 0.35 * masterOp });
          }
          d.y = -30; d.x = Math.random() * (innerWidth + 60) - 30;
        }
        if (d.x < -60) d.x = innerWidth + 40; else if (d.x > innerWidth + 60) d.x = -40;
      }
      // Expand and render ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        ctx2d.strokeStyle = `rgba(170, 205, 235, ${rp.op.toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.ellipse(rp.x, rp.y, rp.r, rp.r * 0.35, 0, 0, Math.PI * 2);
        ctx2d.stroke();
        rp.r += 0.8;
        rp.op *= 0.94;
        if (rp.r >= rp.maxR || rp.op < 0.01) ripples.splice(i, 1);
      }
    }

    // 5. Crystalline Snow & Arctic Blizzard
    if (state.fx.blizzard) {
      for (const fl of flakes) {
        const sway = Math.sin((now - t0) / 750 + fl.ph) * 1.8;
        ctx2d.fillStyle = `rgba(235, 245, 255, ${(fl.op * masterOp).toFixed(3)})`;
        ctx2d.strokeStyle = `rgba(235, 245, 255, ${(fl.op * masterOp).toFixed(3)})`;
        if (fl.isCrystal) {
          ctx2d.lineWidth = 0.8;
          ctx2d.beginPath();
          ctx2d.moveTo(fl.x - fl.r, fl.y); ctx2d.lineTo(fl.x + fl.r, fl.y);
          ctx2d.moveTo(fl.x, fl.y - fl.r); ctx2d.lineTo(fl.x, fl.y + fl.r);
          ctx2d.stroke();
        } else {
          ctx2d.beginPath();
          ctx2d.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
          ctx2d.fill();
        }
        fl.y += fl.spd;
        fl.x += (fl.drift + gust * 0.5 + sway * 0.4);
        if (fl.y > innerHeight + 15) { fl.y = -15; fl.x = Math.random() * (innerWidth + 80) - 40; }
        if (fl.x < -40) fl.x = innerWidth + 30; else if (fl.x > innerWidth + 40) fl.x = -30;
      }
    }

    // 6. Molten Sparks & Forge Embers
    if (state.fx.embers) {
      for (const sp of sparks) {
        ctx2d.fillStyle = `hsla(${sp.hue}, 95%, 60%, ${(sp.life * masterOp).toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx2d.fill();
        sp.y -= sp.vy;
        sp.x += sp.vx + Math.sin(sp.y * 0.05) * 0.8;
        sp.life -= 0.004;
        if (sp.y < -20 || sp.life <= 0) {
          sp.y = innerHeight + Math.random() * 30;
          sp.x = Math.random() * innerWidth;
          sp.life = 0.4 + Math.random() * 0.6;
          sp.vy = 1.6 + Math.random() * 3.4;
        }
      }
    }

    // 7. Branching Forked Lightning Bolt
    if (lightningBolt && lightningBolt.alpha > 0) {
      ctx2d.save();
      ctx2d.shadowColor = "#93c5fd";
      ctx2d.shadowBlur = 18;
      ctx2d.strokeStyle = `rgba(255, 255, 255, ${lightningBolt.alpha.toFixed(3)})`;
      ctx2d.lineWidth = 2.4;
      ctx2d.beginPath();
      for (let i = 0; i < lightningBolt.segments.length; i++) {
        const pt = lightningBolt.segments[i];
        if (i === 0) ctx2d.moveTo(pt.x, pt.y); else ctx2d.lineTo(pt.x, pt.y);
      }
      ctx2d.stroke();

      ctx2d.lineWidth = 1.2;
      for (const br of lightningBolt.branches) {
        ctx2d.beginPath();
        for (let b = 0; b < br.length; b++) {
          const pt = br[b];
          if (b === 0) ctx2d.moveTo(pt.x, pt.y); else ctx2d.lineTo(pt.x, pt.y);
        }
        ctx2d.stroke();
      }
      ctx2d.restore();
      lightningBolt.alpha -= 0.08;
      if (lightningBolt.alpha <= 0) lightningBolt = null;
    }

    // 8. Dynasty: Floating Gold Leaf & Distant Crimson Lanterns
    if (state.fx.goldFoil) {
      // Background Rising Lanterns
      for (const l of lanterns) {
        l.y -= l.vy;
        l.x += Math.sin(now * 0.0008 + l.sway) * 0.35;
        if (l.y < -60) {
          l.y = innerHeight + Math.random() * 80;
          l.x = Math.random() * innerWidth;
        }
        const grad = ctx2d.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r * 1.5);
        grad.addColorStop(0, `rgba(254, 240, 138, ${(0.85 * l.op * masterOp).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(239, 68, 68, ${(0.65 * l.op * masterOp).toFixed(3)})`);
        grad.addColorStop(0.8, `rgba(185, 28, 28, ${(0.25 * l.op * masterOp).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(l.x, l.y, l.r * 1.5, 0, Math.PI * 2);
        ctx2d.fill();

        // Lantern oval body
        ctx2d.fillStyle = `rgba(225, 29, 72, ${(0.8 * l.op * masterOp).toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.ellipse(l.x, l.y, l.r * 0.55, l.r * 0.8, 0, 0, Math.PI * 2);
        ctx2d.fill();
      }

      // Tumbling Gold Leaf Flakes
      for (const lf of goldLeaves) {
        lf.y += lf.vy;
        lf.x += lf.vx + Math.sin(now * 0.0012 + lf.rot) * 0.8;
        lf.rot += lf.rotSpeed;
        lf.flip += lf.flipSpeed;
        if (lf.y > innerHeight + 20) {
          lf.y = -20;
          lf.x = Math.random() * innerWidth;
        }
        ctx2d.save();
        ctx2d.translate(lf.x, lf.y);
        ctx2d.rotate(lf.rot);
        ctx2d.scale(Math.cos(lf.flip), 1);
        const shine = Math.abs(Math.sin(lf.flip));
        ctx2d.fillStyle = `rgba(250, 204, 21, ${(lf.op * masterOp * (0.6 + 0.4 * shine)).toFixed(3)})`;
        ctx2d.shadowColor = "#fef08a";
        ctx2d.shadowBlur = 6 * shine;
        ctx2d.fillRect(-lf.w / 2, -lf.h / 2, lf.w, lf.h);
        ctx2d.restore();
      }
    }

    // 9. Zen Garden: Falling Sakura Cherry Blossom Petals
    if (state.fx.sakura) {
      for (const p of sakuraPetals) {
        p.x += p.vx + gust * 0.4;
        p.y += p.vy;
        p.ang += p.angSpeed;
        if (p.y > innerHeight + 20 || p.x > innerWidth + 30) {
          p.y = -20;
          p.x = Math.random() * (innerWidth + 40) - 20;
        }
        ctx2d.save();
        ctx2d.translate(p.x, p.y);
        ctx2d.rotate(p.ang);
        ctx2d.scale(Math.cos(now * 0.002 + p.ph), 1);
        ctx2d.fillStyle = `rgba(251, 207, 232, ${(p.op * masterOp).toFixed(3)})`;
        ctx2d.strokeStyle = `rgba(244, 114, 182, ${(p.op * 0.7 * masterOp).toFixed(3)})`;
        ctx2d.lineWidth = 0.6;
        ctx2d.beginPath();
        ctx2d.moveTo(0, -p.r);
        ctx2d.bezierCurveTo(p.r * 0.8, -p.r * 0.4, p.r * 0.8, p.r * 0.8, 0, p.r);
        ctx2d.bezierCurveTo(-p.r * 0.8, p.r * 0.8, -p.r * 0.8, -p.r * 0.4, 0, -p.r);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();
        ctx2d.restore();
      }
    }

    // 10. Samadhi: Swirling Incense Smoke Ribbons & Golden Prana
    if (state.fx.incense) {
      // Golden Prana Orbs
      for (const o of pranaOrbs) {
        o.y -= o.vy;
        o.x += Math.sin(now * 0.001 + o.ph) * 0.6;
        if (o.y < -30) {
          o.y = innerHeight + Math.random() * 40;
          o.x = Math.random() * innerWidth;
        }
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.0025 + o.ph);
        const grad = ctx2d.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2.2);
        grad.addColorStop(0, `rgba(253, 186, 116, ${(0.8 * o.op * pulse * masterOp).toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(249, 115, 22, ${(0.4 * o.op * pulse * masterOp).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(o.x, o.y, o.r * 2.2, 0, Math.PI * 2);
        ctx2d.fill();
      }

      // Incense Smoke Ribbons
      for (const plume of incensePlumes) {
        ctx2d.beginPath();
        const startY = innerHeight;
        ctx2d.moveTo(plume.x, startY);
        const steps = 18;
        const dy = innerHeight / steps;
        for (let i = 1; i <= steps; i++) {
          const cy = innerHeight - i * dy;
          const progress = i / steps;
          const spread = plume.amp * (0.8 + progress * 2.5);
          const cx = plume.x + Math.sin(cy * 0.006 + now * plume.speed + plume.phase) * spread;
          ctx2d.lineTo(cx, cy);
        }
        ctx2d.strokeStyle = `rgba(226, 214, 196, ${(0.09 * masterOp).toFixed(3)})`;
        ctx2d.lineWidth = 14;
        ctx2d.lineCap = "round";
        ctx2d.stroke();
      }
    }

    // 11. Silk Road: Desert Constellations & Shooting Stars
    if (state.fx.stars) {
      for (const st of desertStars) {
        const twinkle = Math.sin(now * st.speed + st.ph);
        const curOp = st.baseOp * (0.4 + 0.6 * Math.max(0, twinkle)) * masterOp;
        ctx2d.fillStyle = `rgba(248, 250, 252, ${curOp.toFixed(3)})`;
        if (st.isDiamond) {
          ctx2d.beginPath();
          ctx2d.moveTo(st.x, st.y - st.r * 1.8);
          ctx2d.lineTo(st.x + st.r, st.y);
          ctx2d.lineTo(st.x, st.y + st.r * 1.8);
          ctx2d.lineTo(st.x - st.r, st.y);
          ctx2d.closePath();
          ctx2d.fill();
        } else {
          ctx2d.beginPath();
          ctx2d.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }

      // Random shooting star
      if (!shootingStar && Math.random() < 0.012) {
        shootingStar = {
          x: Math.random() * innerWidth * 0.7,
          y: Math.random() * innerHeight * 0.35,
          len: 80 + Math.random() * 90,
          dx: 12 + Math.random() * 8,
          dy: 5 + Math.random() * 4,
          life: 1.0
        };
      }
      if (shootingStar) {
        ctx2d.save();
        ctx2d.strokeStyle = `rgba(253, 230, 138, ${(shootingStar.life * 0.7 * masterOp).toFixed(3)})`;
        ctx2d.lineWidth = 1.6;
        ctx2d.beginPath();
        ctx2d.moveTo(shootingStar.x, shootingStar.y);
        ctx2d.lineTo(shootingStar.x - shootingStar.dx * (shootingStar.len / 14), shootingStar.y - shootingStar.dy * (shootingStar.len / 14));
        ctx2d.stroke();
        ctx2d.restore();
        shootingStar.x += shootingStar.dx;
        shootingStar.y += shootingStar.dy;
        shootingStar.life -= 0.055;
        if (shootingStar.life <= 0) shootingStar = null;
      }
    }

    raf = requestAnimationFrame(renderVisuals);
  }

  function checkCanvasState() {
    const anyFx = Object.values(state.fx).some(Boolean);
    if (anyFx && !reducedMotion) {
      sizeCanvas();
      if (!drops.length) initParticles();
      t0 = performance.now();
      canvas.hidden = false;
      if (raf == null) raf = requestAnimationFrame(renderVisuals);
      window.addEventListener("resize", sizeCanvas);
      window.addEventListener("orientationchange", sizeCanvas);
    } else {
      if (raf != null) { cancelAnimationFrame(raf); raf = null; }
      window.removeEventListener("resize", sizeCanvas);
      window.removeEventListener("orientationchange", sizeCanvas);
      canvas.hidden = true;
      if (ctx2d) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ---- Lightning Flash Screen Bloom ----
  const bolt = document.createElement("div");
  bolt.id = "lightning-flash";
  bolt.setAttribute("aria-hidden", "true");
  document.body.appendChild(bolt);
  let boltTimer = 0;

  function strikeFlash() {
    if (reducedMotion) return;
    const v = (state.layers.thunder ? state.layers.thunder.vol : 0.7) * (state.lightning / 100);
    const cursed = document.documentElement.dataset.atmo === "cursedwing";
    bolt.style.setProperty("--bolt", cursed ? "rgba(255,70,70,0.55)" : "rgba(200,225,255,0.55)");
    bolt.style.setProperty("--bolt-op", (0.35 + v * 0.55).toFixed(2));
    bolt.classList.remove("strike");
    void bolt.offsetWidth;
    bolt.classList.add("strike");
  }

  function scheduleBolt() {
    clearTimeout(boltTimer);
    if ((!state.layers.thunder.on && !state.fx.lightning) || reducedMotion) return;
    boltTimer = setTimeout(() => {
      triggerForkedLightning();
      if (Math.random() < 0.35) setTimeout(triggerForkedLightning, 650 + Math.random() * 800);
      scheduleBolt();
    }, 8500 + Math.random() * 16000);
  }

  // ---- Fire Glow & Embers Vignette ----
  const fireGlow = document.createElement("div");
  fireGlow.id = "fire-glow";
  fireGlow.setAttribute("aria-hidden", "true");
  document.body.appendChild(fireGlow);
  const emberLayer = document.createElement("div");
  emberLayer.id = "ember-layer";
  emberLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(emberLayer);

  function seedEmbers() {
    emberLayer.innerHTML = "";
    for (let i = 0; i < 14; i++) {
      const e = document.createElement("i");
      const s = (2 + Math.random() * 3).toFixed(1);
      e.style.left = (Math.random() * 100).toFixed(1) + "vw";
      e.style.width = e.style.height = s + "px";
      e.style.animationDuration = (7 + Math.random() * 9).toFixed(1) + "s";
      e.style.animationDelay = (-Math.random() * 14).toFixed(1) + "s";
      emberLayer.appendChild(e);
    }
  }

  function updateFireFx() {
    const on = (state.layers.fire && state.layers.fire.on) || state.fx.embers;
    const v = state.layers.fire ? state.layers.fire.vol : 0.7;
    fireGlow.classList.toggle("lit", !!on && !reducedMotion);
    emberLayer.classList.toggle("lit", !!on && !reducedMotion);
    fireGlow.style.setProperty("--fire-op", (0.25 + v * 0.6).toFixed(2));
    if (on && !emberLayer.children.length) seedEmbers();
  }

  // ---- Panel UI -------------------------------------------------------------
  const btn = document.getElementById("btn-rain");
  const panel = document.createElement("div");
  panel.className = "ambient-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ambience Experience Engine");

  const layerLabel = (id) => (RECORDED[id] || SYNTH[id]).label;
  const layerRow = (id) => `
    <div class="amb-layer" data-layer="${id}">
      <button type="button" class="amb-layertoggle" data-layerbtn="${id}" aria-pressed="false">
        <span class="amb-meter" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="amb-layername">${layerLabel(id)}${id === "thunder" ? ' <span class="amb-bolt" title="Forked lightning flashes on screen">⚡</span>' : ""}${id === "fire" ? ' <span class="amb-bolt" title="Forge embers on screen">🔥</span>' : ""}</span>
      </button>
      <input type="range" class="amb-vol" data-vol="${id}" min="0" max="1" step="0.01"
             value="${state.layers[id].vol}" aria-label="${layerLabel(id)} volume" />
    </div>`;

  panel.innerHTML = `
    <div class="amb-head">
      <div>
        <div class="amb-title">Ambience Experience Engine</div>
        <div class="amb-sub">Generative Multi-Phenomenon Soundscape &amp; Atmospheric Engine</div>
      </div>
      <canvas id="amb-fft-canvas" class="amb-fft" width="80" height="20" aria-hidden="true" style="margin-left:auto;margin-right:0.75rem;border-radius:3px;background:rgba(0,0,0,0.3)"></canvas>
      <button type="button" id="amb-close" aria-label="Close mixer">×</button>
    </div>

    <div class="amb-secname">Theme Presets &amp; Soundscapes</div>
    <div class="amb-presets">
      ${PRESET_ORDER.map((p) => `<button type="button" class="amb-preset" data-preset="${p}"><span>${PRESETS[p].name}</span></button>`).join("")}
    </div>
    <div class="amb-preset-desc" id="amb-preset-desc">Layers fade in smoothly and drift across the stereo field. Tap any theme preset to instantly activate its matching soundscape and atmospheric visual phenomenon.</div>

    <div class="amb-secname">Atmospheric Visual FX</div>
    <div class="amb-fx-bar">
      <button type="button" class="amb-fx-chip" data-fx="rain">🌧️ Rain &amp; Ripples</button>
      <button type="button" class="amb-fx-chip" data-fx="blizzard">❄️ Arctic Blizzard</button>
      <button type="button" class="amb-fx-chip" data-fx="embers">✨ Molten Sparks</button>
      <button type="button" class="amb-fx-chip" data-fx="aurora">🌌 Aurora Borealis</button>
      <button type="button" class="amb-fx-chip" data-fx="lightning">⚡ Forked Lightning</button>
      <button type="button" class="amb-fx-chip" data-fx="mist">💨 Sweeping Mist</button>
      <button type="button" class="amb-fx-chip" data-fx="caustics">🌊 Sunrays &amp; Caustics</button>
      <button type="button" class="amb-fx-chip" data-fx="goldFoil">🏮 Gold Leaf &amp; Lanterns</button>
      <button type="button" class="amb-fx-chip" data-fx="sakura">🌸 Sakura Blossoms</button>
      <button type="button" class="amb-fx-chip" data-fx="incense">🪔 Incense &amp; Prana</button>
      <button type="button" class="amb-fx-chip" data-fx="stars">✨ Desert Oasis Stars</button>
    </div>

    <div class="amb-secname">Binaural Brainwave Entrainment</div>
    <div class="amb-binaural-bar" style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.8rem">
      <button type="button" class="amb-bb-btn btn small active" data-bb="off" style="font-size:0.72rem;padding:0.25rem 0.55rem">Off</button>
      <button type="button" class="amb-bb-btn btn small" data-bb="alpha" title="10Hz Alpha Focus" style="font-size:0.72rem;padding:0.25rem 0.55rem">Alpha · 10Hz Focus</button>
      <button type="button" class="amb-bb-btn btn small" data-bb="theta" title="6Hz Theta Meditation" style="font-size:0.72rem;padding:0.25rem 0.55rem">Theta · 6Hz Zen</button>
      <button type="button" class="amb-bb-btn btn small" data-bb="delta" title="2.5Hz Delta Stillness" style="font-size:0.72rem;padding:0.25rem 0.55rem">Delta · 2Hz Stillness</button>
    </div>

    <div class="amb-secname">Synthesized Procedural Layers</div>
    <div class="amb-layers">${Object.keys(SYNTH).map(layerRow).join("")}</div>

    <div class="amb-secname">Recorded Acoustic Loops</div>
    <div class="amb-layers">${Object.keys(RECORDED).map(layerRow).join("")}</div>

    <div class="amb-secname">Sleep &amp; Fadeout Timer</div>
    <div class="amb-timer-bar" style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.8rem">
      <button type="button" class="amb-timer-btn btn small active" data-timer="0" style="font-size:0.72rem;padding:0.25rem 0.55rem">Off</button>
      <button type="button" class="amb-timer-btn btn small" data-timer="15" style="font-size:0.72rem;padding:0.25rem 0.55rem">15m</button>
      <button type="button" class="amb-timer-btn btn small" data-timer="30" style="font-size:0.72rem;padding:0.25rem 0.55rem">30m</button>
      <button type="button" class="amb-timer-btn btn small" data-timer="60" style="font-size:0.72rem;padding:0.25rem 0.55rem">60m</button>
      <span class="amb-timer-countdown" id="amb-timer-countdown" style="font-family:var(--mono);font-size:0.8rem;color:var(--gold-soft);margin-left:auto"></span>
    </div>

    <div class="amb-foot">
      <label class="amb-master">Master <input type="range" id="amb-master" min="0" max="1" step="0.01" value="${state.master}" aria-label="Ambient master volume" /></label>
      <label class="amb-master">Rainfall <input type="range" id="amb-intensity" min="0" max="100" step="1" value="${state.intensity}" aria-label="Rainfall intensity" /></label>
      <label class="amb-master">Visual FX <input type="range" id="amb-fx-intensity" min="0" max="100" step="1" value="${state.fxIntensity}" aria-label="Atmospheric visual effects opacity" /></label>
      <label class="amb-master">⚡ Flash <input type="range" id="amb-lightning" min="0" max="100" step="1" value="${state.lightning}" aria-label="Lightning flash intensity" /></label>
    </div>`;

  document.body.appendChild(panel);

  function markPreset(name) {
    state.preset = name;
    panel.querySelectorAll(".amb-preset").forEach((b) => b.classList.toggle("active", b.dataset.preset === name));
    const d = panel.querySelector("#amb-preset-desc");
    if (d) d.textContent = name && PRESETS[name] ? PRESETS[name].desc : "Custom mix — your layers, your weather.";
  }

  function syncFxUi() {
    panel.querySelectorAll(".amb-fx-chip").forEach((chip) => {
      const type = chip.dataset.fx;
      chip.classList.toggle("active", !!state.fx[type]);
    });
  }

  function syncUi() {
    for (const id of LAYER_IDS) {
      const row = panel.querySelector(`.amb-layer[data-layer="${id}"]`);
      if (!row) continue;
      row.classList.toggle("on", state.layers[id].on);
      row.querySelector("[data-layerbtn]").setAttribute("aria-pressed", String(state.layers[id].on));
    }
    syncVolUi();
    syncFxUi();
    if (btn) btn.setAttribute("aria-pressed", String(LAYER_IDS.some((id) => state.layers[id].on) || Object.values(state.fx).some(Boolean)));
    markPreset(state.preset);
    updateFireFx();
  }

  function syncVolUi() {
    for (const id of LAYER_IDS) {
      const s = panel.querySelector(`input[data-vol="${id}"]`);
      if (s && document.activeElement !== s) s.value = state.layers[id].vol;
    }
  }

  panel.querySelectorAll("[data-layerbtn]").forEach((b) => {
    b.addEventListener("click", () => setOn(b.dataset.layerbtn, !state.layers[b.dataset.layerbtn].on));
  });

  panel.querySelectorAll("input[data-vol]").forEach((s) => {
    s.addEventListener("input", () => setVol(s.dataset.vol, parseFloat(s.value)));
  });

  panel.querySelectorAll(".amb-fx-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const type = chip.dataset.fx;
      setFx(type, !state.fx[type]);
      if (type === "lightning" && state.fx[type]) triggerForkedLightning();
    });
  });

  panel.querySelectorAll(".amb-bb-btn").forEach((b) => {
    b.addEventListener("click", () => setBinaural(b.dataset.bb));
  });

  panel.querySelectorAll(".amb-timer-btn").forEach((b) => {
    b.addEventListener("click", () => setSleepTimer(parseInt(b.dataset.timer, 10)));
  });

  panel.querySelector("#amb-master").addEventListener("input", (e) => {
    state.master = parseFloat(e.target.value);
    if (ctx) {
      const t = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(state.master, t + 0.3);
    }
    writeState();
  });

  panel.querySelector("#amb-intensity").addEventListener("input", (e) => {
    state.intensity = parseFloat(e.target.value);
    initParticles();
    writeState();
  });

  panel.querySelector("#amb-fx-intensity").addEventListener("input", (e) => {
    state.fxIntensity = parseFloat(e.target.value);
    writeState();
  });

  panel.querySelector("#amb-lightning").addEventListener("input", (e) => {
    state.lightning = parseFloat(e.target.value);
    writeState();
  });

  panel.querySelectorAll(".amb-preset").forEach((b) => {
    b.addEventListener("click", () => applyPreset(b.dataset.preset));
  });

  panel.querySelector("#amb-close").addEventListener("click", () => { panel.hidden = true; });
  if (btn) btn.addEventListener("click", () => { panel.hidden = !panel.hidden; });

  // FFT Visualizer loop
  function drawFft() {
    const cv = panel.querySelector("#amb-fft-canvas");
    if (cv && !panel.hidden && analyser) {
      const g = cv.getContext("2d");
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      g.clearRect(0, 0, cv.width, cv.height);
      const bars = 16;
      const barW = cv.width / bars - 1;
      for (let i = 0; i < bars; i++) {
        const val = data[i * 2] / 255;
        const h = Math.max(2, val * cv.height);
        g.fillStyle = val > 0.05 ? "rgba(200, 169, 74, 0.85)" : "rgba(255, 255, 255, 0.12)";
        g.fillRect(i * (barW + 1), cv.height - h, barW, h);
      }
    }
    requestAnimationFrame(drawFft);
  }
  requestAnimationFrame(drawFft);

  function openMixer() {
    panel.hidden = false;
    panel.scrollTop = 0;
  }
  function closeMixer() {
    panel.hidden = true;
  }

  // ---- Public API -----------------------------------------------------------
  window.TitanAmbient = {
    openMixer,
    closeMixer,
    applyPreset,
    toggleFx: setFx,
    setMaster: (v) => { state.master = v; if (masterGain) masterGain.gain.value = v; writeState(); },
    setVol,
    setOn,
    isActive: () => LAYER_IDS.some((id) => state.layers[id].on) || Object.values(state.fx).some(Boolean),
    presets: () => PRESET_ORDER.map((k) => ({ key: k, name: PRESETS[k].name, desc: PRESETS[k].desc }))
  };

  // Auto-init on boot if user had active preset
  if (state.preset && PRESETS[state.preset] && state.preset !== "off") {
    // Keep dormant until user interacts to comply with autoplay policy
    markPreset(state.preset);
  }
})();
