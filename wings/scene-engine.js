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

  /* Ambient beds. `label` is shown in the studio. */
  const BEDS = {
    rain:    { label: "Rain on glass",   icon: "🌧", level: 0.7 },
    thunder: { label: "Distant thunder", icon: "⛈", level: 0.6 },
    fire:    { label: "Fireplace",       icon: "🔥", level: 0.7 },
    room:    { label: "Quiet room",      icon: "🏛", level: 0.6 },
    wind:    { label: "Wind",            icon: "🍃", level: 0.6 },
    insects: { label: "Night insects",   icon: "🌙", level: 0.6 },
    hum:     { label: "Vault hum",       icon: "🔒", level: 0.6 },
    clock:   { label: "Clock tick",      icon: "⏱", level: 0.5 },
    vinyl:   { label: "Vinyl crackle",   icon: "💿", level: 0.5 }
  };
  const BED_ORDER = ["rain", "thunder", "fire", "room", "wind", "insects", "hum", "clock", "vinyl"];

  /* One-tap scenes. beds: id -> level 0..1; music flags below. */
  const SCENES = {
    study:   { name: "Quiet study", icon: "📖", desc: "Soft pads, a little piano, a quiet room.", atmo: "conservator",
               beds: { room: 0.7, wind: 0.15 }, pad: 0.7, piano: true, bells: false, beat: false,
               root: "D", mode: "lydian", prog: [0, 4, 3, 1], chordSec: 14, gap: [5, 11], vol: 0.55 },
    rainy:   { name: "Rainy archive", icon: "🌧", desc: "Rain on the skylight, far thunder, slow lo-fi beat.", atmo: "afterhours",
               beds: { rain: 0.8, thunder: 0.5, room: 0.3 }, pad: 0.55, piano: true, bells: false, beat: true,
               root: "A", mode: "dorian", prog: [0, 3, 5, 4], chordSec: 0, gap: [4, 9], bpm: 70, vol: 0.55 },
    vault:   { name: "Midnight vault", icon: "🔒", desc: "Deep hum, a slow clock, a distant bell.", atmo: "nocturne",
               beds: { hum: 0.8, clock: 0.55, room: 0.2 }, pad: 0.45, piano: false, bells: true, beat: false,
               root: "E", mode: "phrygian", prog: [0, 0, 5, 3], chordSec: 18, gap: [9, 18], vol: 0.5 },
    hearth:  { name: "Hearth", icon: "🔥", desc: "Crackling fire, warm pads, gentle piano.", atmo: "valhalla",
               beds: { fire: 0.85, room: 0.35, wind: 0.12 }, pad: 0.65, piano: true, bells: false, beat: false,
               root: "F", mode: "major", prog: [0, 5, 3, 4], chordSec: 13, gap: [6, 13], vol: 0.55 },
    lofi:    { name: "Lo-fi evening", icon: "🎧", desc: "Laid-back beat, vinyl crackle, soft keys.", atmo: "neon",
               beds: { vinyl: 0.7, rain: 0.25 }, pad: 0.5, piano: true, bells: true, beat: true,
               root: "C", mode: "dorian", prog: [1, 4, 0, 5], chordSec: 0, gap: [3, 7], bpm: 78, vol: 0.55 },
    garden:  { name: "Night garden", icon: "🌙", desc: "Crickets, a light breeze, slow bells.", atmo: "zen",
               beds: { insects: 0.8, wind: 0.35 }, pad: 0.4, piano: false, bells: true, beat: false,
               root: "G", mode: "pent", prog: [0, 2, 1, 3], chordSec: 15, gap: [5, 10], vol: 0.5 },
    snow:    { name: "Snowed in", icon: "❄", desc: "Soft wind, a glassy pad, very quiet.", atmo: "glacier",
               beds: { wind: 0.7, room: 0.2 }, pad: 0.7, piano: false, bells: true, beat: false,
               root: "Bb", mode: "lydian", prog: [0, 1, 4, 1], chordSec: 17, gap: [8, 16], vol: 0.5 },
    storm:   { name: "Thunderstorm", icon: "⛈", desc: "Heavy rain and rolling thunder, no music.", atmo: "odyssey",
               beds: { rain: 1, thunder: 0.9, wind: 0.4 }, pad: 0, piano: false, bells: false, beat: false,
               root: "D", mode: "minor", prog: [0], chordSec: 12, gap: [8, 12], vol: 0.55 }
  };
  const SCENE_ORDER = ["study", "rainy", "vault", "hearth", "lofi", "garden", "snow", "storm"];

  const E = {
    ctx: null, groups: [], playing: false, paused: false, mix: null, name: "",
    vol: 0.6, musLevel: 0.9, ambLevel: 0.9, bass: 0, mid: 0, treble: 0, duck: false,
    bgPause: false, worker: null, timer: 0, msd: null, el: null, via: "none", killedSources: 0
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
  function mkImpulse(ctx, sec) {
    const sr = ctx.sampleRate, n = Math.floor(sr * sec), buf = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.45 * t);   // darker as it decays
        d[i] = lp * Math.pow(1 - t, 3.2) * 1.6;
      }
    }
    return buf;
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
    E.ambBus.connect(bus); E.musBus.connect(bus);
    const verb = ctx.createConvolver(); verb.buffer = mkImpulse(ctx, 1.7);
    const ambSend = ctx.createGain(), musSend = ctx.createGain(), wet = ctx.createGain();
    ambSend.gain.value = 0.16; musSend.gain.value = 0.42; wet.gain.value = 0.9;
    E.ambBus.connect(ambSend); E.musBus.connect(musSend); ambSend.connect(verb); musSend.connect(verb); verb.connect(wet); wet.connect(bus);
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
    if (!ctx || ctx.state !== "running") return;
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
    const g = { dead: false, srcs: [], tickers: [], bed: ctx.createGain(), mus: ctx.createGain(), bedOut: ctx.createGain(), musOut: ctx.createGain(), t0: ctx.currentTime + 0.05 };
    g.bed.connect(g.bedOut); g.mus.connect(g.musOut); g.bedOut.connect(E.ambBus); g.musOut.connect(E.musBus);
    g.bedOut.gain.value = 0; g.musOut.gain.value = 0;
    g.src = (s) => { g.srcs.push(s); s.onended = () => { const i = g.srcs.indexOf(s); if (i >= 0) g.srcs.splice(i, 1); try { s.disconnect(); } catch (e) { /* ignore */ } }; return s; };
    g.fade = (to, sec) => {
      const t = ctx.currentTime;
      for (const p of [g.bedOut.gain, g.musOut.gain]) { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(to, t + Math.max(0.05, sec)); }
    };
    g.kill = () => {
      if (g.dead) return; g.dead = true; g.tickers.length = 0;
      for (const s of g.srcs.slice()) { try { s.onended = null; s.stop(); } catch (e) { /* ignore */ } try { s.disconnect(); } catch (e) { /* ignore */ } E.killedSources++; }
      g.srcs.length = 0;
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

  /* ---------- ambient beds ---------- */
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

  function padChord(g, t, dur, midis, lvl, flt) {
    const ctx = E.ctx, att = Math.min(3.2, dur * 0.3), rel = Math.min(4.5, dur * 0.4);
    const per = lvl * 0.2 / Math.sqrt(midis.length);
    midis.forEach((m, i) => {
      const f = mtof(m);
      [["triangle", 0, 0.55], ["sine", 4, 0.45]].forEach(([type, det, w]) => {
        const o = g.src(ctx.createOscillator()); o.type = type; o.frequency.value = f; o.detune.value = det + rnd(-5, 5);
        const v = ctx.createGain();
        v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(per * w * (i === 0 ? 0.7 : 1), t + att);
        v.gain.setValueAtTime(per * w * (i === 0 ? 0.7 : 1), t + dur); v.gain.linearRampToValueAtTime(0, t + dur + rel);
        o.connect(v); v.connect(flt); o.start(t); o.stop(t + dur + rel + 0.1);
      });
    });
  }
  function voicePiano(g, t, midi, lvl) {
    const ctx = E.ctx, f = mtof(midi), dur = 2.6 + (84 - midi) * 0.04;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(5000, f * 5);
    const v = ctx.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(lvl * 0.2, t + 0.006); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [["triangle", 1, 1], ["sine", 2, 0.28], ["sine", 3.01, 0.08]].forEach(([type, mul, w]) => {
      const o = g.src(ctx.createOscillator()); o.type = type; o.frequency.value = f * mul; o.detune.value = rnd(-3, 3);
      const wv = ctx.createGain(); wv.gain.value = w; o.connect(wv); wv.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    });
    lp.connect(v); v.connect(g.mus);
  }
  function voiceBell(g, t, midi, lvl) {
    const ctx = E.ctx, f = mtof(midi), dur = 4.5;
    const c = g.src(ctx.createOscillator()), m = g.src(ctx.createOscillator()), mg = ctx.createGain(), v = ctx.createGain();
    c.type = "sine"; c.frequency.value = f; m.type = "sine"; m.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.7);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(lvl * 0.16, t + 0.005); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    m.connect(mg); mg.connect(c.frequency); c.connect(v); v.connect(g.mus);
    c.start(t); m.start(t); c.stop(t + dur + 0.1); m.stop(t + dur + 0.1);
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
    g.beat = ctx.createBiquadFilter(); g.beat.type = "lowpass"; g.beat.frequency.value = 3400; g.beat.connect(g.mus);
    const flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 1500; flt.Q.value = 0.4; flt.connect(g.mus);
    lfo(g, 0.045, 500, flt.frequency);
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
    for (const id of BED_ORDER) { const L = mix.beds && mix.beds[id]; if (L > 0 && BUILD[id]) BUILD[id](g, L); }
    if ((mix.pad > 0) || mix.piano || mix.bells || mix.beat) buildMusic(g, mix);
    return g;
  }

  function play(mix, opts) {
    opts = opts || {};
    const ctx = ensure(); if (!ctx) return false;
    E.mix = mix; E.name = opts.name || E.name || ""; E.playing = true; E.paused = false; E.userStopped = false;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (E.el && E.el.paused) { const p = E.el.play(); if (p && p.catch) p.catch(() => {}); }
    const fade = opts.fade == null ? 3 : opts.fade;
    for (const g of E.groups) { if (g.dead) continue; g.fade(0, fade); const dead = g; setTimeout(() => dead.kill(), fade * 1000 + 400); }
    const g = buildGroup(mix);
    E.groups.push(g);
    g.fade(1, fade);
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
    BEDS, BED_ORDER, SCENES, SCENE_ORDER,
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
    level() { if (!E.an) return 0; E.an.getFloatTimeDomainData(E.anBuf); let s = 0; for (let i = 0; i < E.anBuf.length; i++) s += E.anBuf[i] * E.anBuf[i]; return Math.sqrt(s / E.anBuf.length); },
    stats: () => ({ groups: E.groups.length, sources: E.groups.reduce((n, g) => n + g.srcs.length, 0), killed: E.killedSources, ctx: E.ctx ? E.ctx.state : "none", via: E.via })
  };
})();
