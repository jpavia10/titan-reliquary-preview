/* Titan Reliquary — "Soundscape" ambient engine (v4).
   A real generative soundscape mixer, not just preset combos:
   - 9 recorded loops (Mixkit Free License, hotlinked, not committed).
   - 5 synthesized layers built live with Web Audio: sub drone, fire sparkle,
     wind swells, foundry clanks, distant bell tolls.
   - Every layer runs through its own StereoPannerNode with a slow random drift.
   - 9 scenes (presets) with per-layer mixes, per-layer volume sliders, and
     animated level meters. Rain shows on screen too.
   prefers-reduced-motion: canvas animation is skipped; sound still works. */
(() => {
  "use strict";

  const MX = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;
  // Recorded loops — verified 200 on 2026-09-25 (Mixkit Sound Effects Free License).
  const RECORDED = {
    rain:    { label: "Rain",            url: MX(2394) },
    thunder: { label: "Distant thunder", url: MX(2395) },
    fire:    { label: "Fireplace",       url: MX(1330) },
    wind:    { label: "Night wind",      url: MX(2483) },
    crickets:{ label: "Summer crickets", url: MX(1789) },
    forest:  { label: "Forest birds",    url: MX(1213) },
    crowd:   { label: "Crowd murmur",    url: MX(444)  },
    office:  { label: "Room tone",       url: MX(447)  },
    scifi:   { label: "Machine hum",     url: MX(2507) },
  };
  // Synthesized layers — generated live, no downloads.
  const SYNTH = {
    drone:   { label: "Sub drone"     },
    crackle: { label: "Fire sparkle"  },
    gust:    { label: "Wind swells"   },
    clank:   { label: "Foundry clanks"},
    belltoll:{ label: "Distant bell"  },
  };
  const ORDER = [...Object.keys(RECORDED), ...Object.keys(SYNTH)];
  const LAYER_IDS = ORDER;

  // Scenes: each maps layer -> volume. Genuinely different mixes, not reshuffles.
  const PRESETS = {
    storm:    { name: "Storm",     desc: "Rain hammers the skylights; thunder rolls somewhere far off.",
                mix: { rain: .85, thunder: .6, wind: .5, gust: .55 } },
    foundry:  { name: "Foundry",   desc: "Hammer-fall, furnace breath, and a deep iron drone.",
                mix: { fire: .5, crackle: .7, clank: .8, drone: .45 } },
    fireside: { name: "Fireside",  desc: "Leather chairs, a low fire, rain at the window.",
                mix: { fire: .9, crackle: .45, rain: .22, wind: .18 } },
    wayfarer: { name: "Wayfarer",  desc: "Open road under a wide sky; birds, wind, far thunder.",
                mix: { forest: .65, wind: .45, gust: .4, thunder: .18 } },
    night:    { name: "Night watch", desc: "The museum after midnight — crickets and a far-off bell.",
                mix: { crickets: .7, wind: .3, belltoll: .45, drone: .12 } },
    blackout: { name: "Blackout",  desc: "Power's out. Something in the walls is awake.",
                mix: { drone: .8, gust: .5, belltoll: .5, scifi: .22 } },
    tavern:   { name: "Tavern",    desc: "Low talk, clinking glass, a fire in the corner.",
                mix: { crowd: .65, fire: .35, crackle: .3, drone: .12 } },
    archive:  { name: "Deep archive", desc: "Paper dust, quiet machines, rain on the roof.",
                mix: { office: .6, rain: .22, drone: .3, scifi: .15 } },
    mirage:   { name: "Mirage",    desc: "Heat-shimmer on the horizon; the machines are dreaming.",
                mix: { scifi: .5, drone: .4, gust: .4, belltoll: .3, crickets: .25 } },
    depths:   { name: "Depths",    desc: "Forty fathoms down. Pressure, dark water, a far-off bell.",
                mix: { drone: .75, gust: .5, belltoll: .35, scifi: .15 } },
    grid:     { name: "Grid",      desc: "Chrome midnight. Neon hum and iron percussion.",
                mix: { scifi: .65, drone: .45, clank: .3, crackle: .15 } },
    signal:   { name: "Signal",    desc: "Something out there is transmitting. The bell answers.",
                mix: { scifi: .7, drone: .5, belltoll: .45, thunder: .15 } },
    solaris:  { name: "Solaris",   desc: "Coronal winds and high-altitude radiation hum under the sun.",
                mix: { drone: .85, scifi: .65, gust: .45, belltoll: .2 } },
    alchemist:{ name: "Alchemist", desc: "The bubbling crucible, hearth embers, and old paper dust.",
                mix: { fire: .75, crackle: .65, office: .35, drone: .25 } },
    glacier:  { name: "Hyperborean", desc: "Sub-zero polar gale howling over permafrost and glacial ice.",
                mix: { wind: .85, gust: .8, drone: .55, belltoll: .35 } },
    valhalla: { name: "Valhalla",  desc: "Roaring hearthfire, striking hammers of the armory, and mountain wind.",
                mix: { fire: .85, crackle: .75, clank: .6, wind: .35 } },
    off:      { name: "Off",       desc: "Silence. Just the music.", mix: {} },
  };
  const PRESET_ORDER = ["storm", "foundry", "fireside", "wayfarer", "night", "blackout", "tavern", "archive", "mirage", "depths", "grid", "signal", "solaris", "alchemist", "glacier", "valhalla", "off"];

  const KEY = "tr_ambient_v2";
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- state ---------------------------------------------------------------
  const state = { layers: {}, master: 0.8, intensity: 60, lightning: 70, preset: null };
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
      if (raw.preset && PRESETS[raw.preset]) state.preset = raw.preset;
    }
  } catch { /* fresh */ }
  function writeState() {
    try { localStorage.setItem(KEY, JSON.stringify({ layers: state.layers, master: state.master, intensity: state.intensity, lightning: state.lightning, preset: state.preset })); } catch { /* ignore */ }
  }

  // ---- audio graph ----------------------------------------------------------
  let ctx = null, masterGain = null, noiseBuf = null;
  const nodes = {}; // id -> { gain, pan, el? , synth? , src? }
  function ensureCtx() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = state.master;
    masterGain.connect(ctx.destination);

    // FFT Analyser for real-time visualizer
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    masterGain.connect(analyser);

    // shared 2s white-noise buffer for the synth layers
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

  // ---- stereo drift: every layer wanders slowly through the stereo field ----
  let driftTimer = null;
  function startPanDrift() {
    if (driftTimer || reducedMotion) return;
    const wander = () => {
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const id of LAYER_IDS) {
        const p = nodes[id].pan; if (!p) continue;
        // keep extremes subtle: ±0.55 so nothing hard-pans away
        const target = (Math.random() * 2 - 1) * 0.55;
        p.pan.cancelScheduledValues(now);
        p.pan.setValueAtTime(p.pan.value, now);
        p.pan.linearRampToValueAtTime(target, now + 6 + Math.random() * 10);
      }
    };
    wander();
    driftTimer = setInterval(wander, 9000);
  }

  // ---- synth layer builders (each returns { stop }) -------------------------
  function lfo(param, rate, depth, base) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = rate; g.gain.value = depth;
    o.connect(g); g.connect(param);
    if (Number.isFinite(base)) param.value = base;
    o.start();
    return o;
  }
  const synthBuilders = {
    // Deep sub drone: three detuned low oscillators with a slow breathing LFO.
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
    // Wind swells: looped noise through a wandering bandpass, gain breathing.
    gust(n) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 480; bp.Q.value = 0.45;
      const g = ctx.createGain(); g.gain.value = 0.32;
      src.connect(bp); bp.connect(g); g.connect(n.gain); src.start();
      const l1 = lfo(g.gain, 0.09, 0.2, 0.32);
      const l2 = lfo(bp.frequency, 0.05, 260, 480);
      return { stop() { [l1, l2].forEach((o) => { try { o.stop(); } catch {} }); try { src.stop(); } catch {} g.disconnect(); } };
    },
    // Fire sparkle: random tiny noise bursts, bright bandpass, fast decay.
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
    // Foundry clanks: distant metallic FM hits at irregular intervals.
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
    // Distant bell: sparse tolls, harmonic partials, long decay.
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
  };

  // ---- layer control ---------------------------------------------------------
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
    if (id === "rain") setTimeout(() => (state.layers.rain.on ? startCanvas() : stopCanvas()), 60);
    if (id === "thunder") scheduleBolt();
    if (id === "fire") updateFireFx();
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
  function applyPreset(name) {
    if (!PRESETS[name]) return;
    if (name === "off") {
      for (const id of LAYER_IDS) if (state.layers[id].on) setOn(id, false);
      state.preset = "off"; markPreset("off"); writeState(); syncUi();
      return;
    }
    if (!ensureCtx()) return;
    // First pass: enable everything in the mix (volumes set silently).
    for (const id of Object.keys(PRESETS[name].mix)) {
      state.layers[id].vol = PRESETS[name].mix[id];
      if (!state.layers[id].on) {
        state.layers[id].on = true;
        const n = nodes[id];
        if (RECORDED[id]) startRecorded(id);
        else if (!n.synth) n.synth = synthBuilders[id](n);
      }
    }
    // Second pass: disable everything else, then fade all.
    for (const id of LAYER_IDS) {
      const want = Object.prototype.hasOwnProperty.call(PRESETS[name].mix, id);
      if (!want && state.layers[id].on) {
        state.layers[id].on = false;
        const n = nodes[id];
        if (n.el) n.el.pause();
        if (n.synth) { try { n.synth.stop(); } catch {} n.synth = null; }
      }
      if (ctx) rampGain(id, 1.2);
    }
    if (state.layers.rain.on) startCanvas(); else stopCanvas();
    scheduleBolt();
    state.preset = name;
    markPreset(name); writeState(); syncUi();
  }

  // ---- canvas rain (kept from v3; intensity-coupled) --------------------------
  const canvas = document.createElement("canvas");
  canvas.id = "rain-canvas";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx2d = canvas.getContext("2d");
  let raf = null, drops = [], t0 = 0;
  function dropCount() { return Math.round(40 + (state.intensity / 100) * 220); }
  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seedDrops() {
    const n = Math.min(280, Math.max(30, Math.floor(dropCount() * Math.min(1.4, (innerWidth * innerHeight) / 900000))));
    const boost = 0.7 + (state.intensity / 100) * 0.9;
    drops = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      len: (10 + Math.random() * 22) * boost, spd: (9 + Math.random() * 9) * boost,
      op: (0.10 + Math.random() * 0.22) * (0.6 + (state.intensity / 100) * 0.7),
      drift: -1.5 - Math.random() * 1.5, ph: Math.random() * Math.PI * 2,
    }));
  }
  function tick(now) {
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, innerWidth, innerHeight);
    ctx2d.lineWidth = 1.1;
    const gust = Math.sin((now - t0) / 2600) * 2.2;
    for (const d of drops) {
      const sway = Math.sin((now - t0) / 900 + d.ph) * 0.6;
      ctx2d.strokeStyle = `rgba(150, 180, 205, ${d.op.toFixed(3)})`;
      ctx2d.beginPath(); ctx2d.moveTo(d.x, d.y);
      ctx2d.lineTo(d.x + d.drift + gust + sway, d.y + d.len); ctx2d.stroke();
      d.y += d.spd; d.x += (d.drift + gust) * 0.35;
      if (d.y > innerHeight + 30) { d.y = -30; d.x = Math.random() * (innerWidth + 60) - 30; }
      if (d.x < -60) d.x = innerWidth + 40; else if (d.x > innerWidth + 60) d.x = -40;
    }
    raf = requestAnimationFrame(tick);
  }
  function startCanvas() {
    if (reducedMotion || !ctx2d) return;
    sizeCanvas(); seedDrops(); t0 = performance.now();
    canvas.hidden = false;
    if (raf == null) raf = requestAnimationFrame(tick);
    window.addEventListener("resize", sizeCanvas);
  }
  function stopCanvas() {
    if (raf != null) { cancelAnimationFrame(raf); raf = null; }
    window.removeEventListener("resize", sizeCanvas);
    canvas.hidden = true;
    if (ctx2d) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    drops = [];
  }

  // ---- lightning: where there's thunder, there's lightning --------------------
  // A full-screen flash while the thunder layer plays. Not sample-synced (the
  // loop's claps aren't exposed) — it strikes on its own slow random timer,
  // harder when the thunder volume is up. Blood-red under the Cursed Wing.
  const bolt = document.createElement("div");
  bolt.id = "lightning-flash";
  bolt.setAttribute("aria-hidden", "true");
  document.body.appendChild(bolt);
  let boltTimer = 0;
  function strike() {
    if (reducedMotion) return;
    const v = state.layers.thunder.vol * (state.lightning / 100);
    const cursed = document.documentElement.dataset.atmo === "cursedwing";
    bolt.style.setProperty("--bolt", cursed ? "rgba(255,70,70,0.5)" : "rgba(190,215,255,0.5)");
    bolt.style.setProperty("--bolt-op", (0.25 + v * 0.55).toFixed(2));
    bolt.classList.remove("strike");
    void bolt.offsetWidth; // restart the animation
    bolt.classList.add("strike");
  }
  function scheduleBolt() {
    clearTimeout(boltTimer);
    if (!state.layers.thunder.on || reducedMotion) return;
    boltTimer = setTimeout(() => {
      strike();
      // occasional double-strike: a second flash a beat later
      if (Math.random() < 0.35) setTimeout(strike, 700 + Math.random() * 900);
      scheduleBolt();
    }, 9000 + Math.random() * 17000);
  }
  // ---- fire glow: where there's fire sound, there's firelight --------------------
  // A warm flickering vignette plus rising embers, intensity follows the fire
  // layer's volume. Mirrors the lightning/thunder pairing.
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
  function updateFireFx() {
    const on = state.layers.fire && state.layers.fire.on && !reducedMotion;
    const v = state.layers.fire ? state.layers.fire.vol : 0;
    fireGlow.classList.toggle("lit", !!on);
    emberLayer.classList.toggle("lit", !!on);
    fireGlow.style.setProperty("--fire-op", (0.25 + v * 0.6).toFixed(2));
    if (on && !emberLayer.children.length) seedEmbers();
  }
  const btn = document.getElementById("btn-rain");
  const panel = document.createElement("div");
  panel.className = "ambient-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ambient sound mixer");
  const layerLabel = (id) => (RECORDED[id] || SYNTH[id]).label;
  const layerRow = (id) => `
    <div class="amb-layer" data-layer="${id}">
      <button type="button" class="amb-layertoggle" data-layerbtn="${id}" aria-pressed="false">
        <span class="amb-meter" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="amb-layername">${layerLabel(id)}${id === "thunder" ? ' <span class="amb-bolt" title="Lightning flashes on screen">⚡</span>' : ""}${id === "fire" ? ' <span class="amb-bolt" title="Firelight glows on screen">🔥</span>' : ""}</span>
      </button>
      <input type="range" class="amb-vol" data-vol="${id}" min="0" max="1" step="0.01"
             value="${state.layers[id].vol}" aria-label="${layerLabel(id)} volume" />
    </div>`;
  panel.innerHTML = `
    <div class="amb-head">
      <div><div class="amb-title">Soundscape</div><div class="amb-sub">generative ambience engine</div></div>
      <canvas id="amb-fft-canvas" class="amb-fft" width="80" height="20" aria-hidden="true" style="margin-left:auto;margin-right:0.75rem;border-radius:3px;background:rgba(0,0,0,0.3)"></canvas>
      <button type="button" id="amb-close" aria-label="Close mixer">×</button>
    </div>
    <div class="amb-secname">Scenes</div>
    <div class="amb-presets">
      ${PRESET_ORDER.map((p) => `<button type="button" class="amb-preset" data-preset="${p}"><span>${PRESETS[p].name}</span></button>`).join("")}
    </div>
    <div class="amb-preset-desc" id="amb-preset-desc">Layers fade in and out smoothly, drift slowly across the stereo field, and mix with the music player. Rain and fire show on screen too — tap any layer to build your own weather.</div>
    <div class="amb-secname">Binaural Brainwave Entrainment</div>
    <div class="amb-binaural-bar" style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.8rem">
      <button type="button" class="amb-bb-btn btn small active" data-bb="off" style="font-size:0.72rem;padding:0.25rem 0.55rem">Off</button>
      <button type="button" class="amb-bb-btn btn small" data-bb="alpha" title="10Hz Alpha Focus" style="font-size:0.72rem;padding:0.25rem 0.55rem">Alpha · 10Hz Focus</button>
      <button type="button" class="amb-bb-btn btn small" data-bb="theta" title="6Hz Theta Meditation" style="font-size:0.72rem;padding:0.25rem 0.55rem">Theta · 6Hz Zen</button>
      <button type="button" class="amb-bb-btn btn small" data-bb="delta" title="2.5Hz Delta Stillness" style="font-size:0.72rem;padding:0.25rem 0.55rem">Delta · 2Hz Stillness</button>
    </div>
    <div class="amb-secname">Recorded</div>
    <div class="amb-layers">${Object.keys(RECORDED).map(layerRow).join("")}</div>
    <div class="amb-secname">Synthesized live</div>
    <div class="amb-layers">${Object.keys(SYNTH).map(layerRow).join("")}</div>
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
      <label class="amb-master">⚡ Flash <input type="range" id="amb-lightning" min="0" max="100" step="1" value="${state.lightning}" aria-label="Lightning flash intensity" /></label>
    </div>`;
  document.body.appendChild(panel);

  function markPreset(name) {
    state.preset = name;
    panel.querySelectorAll(".amb-preset").forEach((b) => b.classList.toggle("active", b.dataset.preset === name));
    const d = panel.querySelector("#amb-preset-desc");
    if (d) d.textContent = name && PRESETS[name] ? PRESETS[name].desc : "Custom mix — your layers, your weather.";
  }
  function syncUi() {
    for (const id of LAYER_IDS) {
      const row = panel.querySelector(`.amb-layer[data-layer="${id}"]`);
      if (!row) continue;
      row.classList.toggle("on", state.layers[id].on);
      row.querySelector("[data-layerbtn]").setAttribute("aria-pressed", String(state.layers[id].on));
    }
    syncVolUi();
    if (btn) btn.setAttribute("aria-pressed", String(LAYER_IDS.some((id) => state.layers[id].on)));
    markPreset(state.preset);
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
    if (state.layers.rain.on) { seedDrops(); }
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
    const canvas = panel.querySelector("#amb-fft-canvas");
    if (canvas && !panel.hidden && analyser) {
      const g = canvas.getContext("2d");
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      g.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 16;
      const barW = canvas.width / bars - 1;
      for (let i = 0; i < bars; i++) {
        const val = data[i * 2] / 255;
        const h = Math.max(2, val * canvas.height);
        g.fillStyle = val > 0.05 ? "rgba(200, 169, 74, 0.85)" : "rgba(255, 255, 255, 0.12)";
        g.fillRect(i * (barW + 1), canvas.height - h, barW, h);
      }
    }
    requestAnimationFrame(drawFft);
  }
  requestAnimationFrame(drawFft);

  // Restore persisted ambience on boot (autoplay-safe: play() may reject).
  if (LAYER_IDS.some((k) => state.layers[k].on) && ensureCtx()) {
    for (const k of LAYER_IDS) {
      if (!state.layers[k].on) continue;
      const n = nodes[k];
      if (RECORDED[k]) {
        const el = new Audio();
        el.loop = true; el.preload = "auto"; el.crossOrigin = "anonymous";
        el.src = RECORDED[k].url;
        ctx.createMediaElementSource(el).connect(n.gain);
        n.el = el;
        el.play().then(() => rampGain(k)).catch(() => { state.layers[k].on = false; writeState(); });
      } else {
        n.synth = synthBuilders[k](n);
        rampGain(k);
      }
    }
    if (state.layers.rain.on) setTimeout(startCanvas, 400);
    if (state.layers.thunder.on) scheduleBolt();
  }
  syncUi();
  updateFireFx();

  // Public hooks for the atmosphere system ("Set the scene" pairing).
  window.TitanAmbient = {
    applyPreset,
    setOn,
    setVol,
    openMixer() { panel.hidden = false; },
    closeMixer() { panel.hidden = true; },
    get mixerOpen() { return !panel.hidden; },
  };
})();
