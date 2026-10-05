/* Titan Reliquary: generative music layer v2 ("TitanMusic").
   Everything is synthesized live with Web Audio (no samples, no network). Plugs into TitanGen (wings/scene-engine.js):

     TitanMusic.forMix(mix, name)  -> { id, spec } | null     which music a scene/mix wants (spec null = no music)
     TitanMusic.start(spec, { ctx, input, exclusive, fadeIn, colour, seed }) -> session { stop(fadeSec), setLevel(x), setTempoScale(x) }
     TitanMusic.stop(fadeSec) / .setLevel(x) / .setTempoScale(x)   act on every live session

   What it plays (see notes/agents/music-v2.md):
     * harmony: per-scene key / mode / tempo / roman-numeral progressions in sections A and B, voice-led (least movement,
       essential chord tones kept), cycling through varied forms, with occasional modulation (dominant pivot) in long sessions
     * instruments: felt piano, strings pad (detuned saws, slow filter, chorus), warm and glass pads, plucked harp
       (Karplus-Strong rendered into short cached buffers), upright / sub bass, music-box and celesta, brush / lo-fi drums
       (pre-rendered hits), choir "ooh" (formant-filtered saws)
     * melody: a short motif that develops (transpose, inversion, augmentation, diminution, retrograde, fragment, cadence),
       phrased with long rests, snapped to chord tones on strong / long notes, humanised timing and velocity
     * scheduling: one Worker-driven tick, chords are planned when they enter the 2.5 s look-ahead window on the audio clock,
       events are instantiated only inside the window, a voice budget caps oscillators, every node is released. */
(() => {
  "use strict";

  const LOOKAHEAD = 2.5, TICK_MS = 250;
  const MOBILE = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/.test(navigator.userAgent || "");
  const CAP = MOBILE ? 44 : 64;                  // oscillator-equivalents alive at once, per session
  const LITE = MOBILE;                           // fewer partials / detuned copies on phones
  const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const MODES = {
    major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
    minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10]
  };
  const MELS = { pent: [0, 2, 4, 7, 9], minpent: [0, 3, 5, 7, 10] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function rngOf(seed) {
    if (seed == null) return Math.random;
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ================= harmony ================= */
  const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const SYM_RE = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|dim)?(maj9|maj7|m9|m7|add9|sus2|sus4|9|7|6)?$/;
  const symCache = {};
  /* roman numeral -> { rs: semitones above the key's tonic, tones: semitone offsets above the chord root, ess: indices that must sound } */
  function parseChord(sym, mode) {
    const key = mode + "|" + sym;
    if (symCache[key]) return symCache[key];
    const m = SYM_RE.exec(sym);
    if (!m) throw new Error("TitanMusic: bad chord symbol " + sym);
    const sc = MODES[mode] || MODES.major, deg = ROMANS.indexOf(m[2].toUpperCase()), minor = m[2] === m[2].toLowerCase();
    const rs = (sc[deg] + (m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0) + 12) % 12;
    let tones = m[3] ? [0, 3, 6] : minor ? [0, 3, 7] : [0, 4, 7];
    const suf = m[4];
    if (suf === "sus2") tones = [0, 2, 7]; else if (suf === "sus4") tones = [0, 5, 7];
    else if (suf === "7" || suf === "m7") tones = tones.concat(10);
    else if (suf === "maj7") tones = tones.concat(11);
    else if (suf === "6") tones = tones.concat(9);
    else if (suf === "add9") tones = tones.concat(14);
    else if (suf === "9") tones = tones.concat(10, 14);
    else if (suf === "maj9") tones = tones.concat(11, 14);
    else if (suf === "m9") tones = tones.concat(10, 14);
    const seventh = tones.findIndex((x) => x === 10 || x === 11);
    const out = { sym, rs, tones, ess: seventh > 0 ? [0, 1, seventh] : [0, 1], plain: !suf && !m[3], minor };
    symCache[key] = out; return out;
  }
  /* legacy scene-engine mixes give scale degrees, not numerals */
  function chordFromDegree(mode, deg) {
    const pent = MELS[mode];
    if (pent) return { sym: "d" + deg, rs: pent[deg % 5], tones: [0, 2, 7], ess: [0, 1], plain: false, minor: false };
    const sc = MODES[mode] || MODES.major, n = 7, at = (k) => sc[(deg + k) % n] + (deg + k >= n ? 12 : 0) - sc[deg];
    return { sym: "d" + deg, rs: sc[deg], tones: [0, at(2), at(4)], ess: [0, 1], plain: true, minor: at(2) === 3 };
  }

  const VSTYLE = {
    close: { n: 4, lo: 55, hi: 74, gap: 9 },
    open: { n: 4, lo: 50, hi: 78, gap: 14 },
    shell: { n: 3, lo: 52, hi: 72, gap: 12 },
    wide: { n: 3, lo: 48, hi: 79, gap: 19 }
  };
  /* Voice leading: choose, for each voice, which chord tone it takes, so the total movement from the previous voicing is
     smallest while root, third (and seventh) always sound and voices keep their order and a sensible spacing. */
  function voiceLead(prev, pcs, ess, st, R) {
    const V = st.n, T = pcs.length;
    const near = [];                 // near[v][p] = midi for voice v playing pc p
    for (let v = 0; v < V; v++) {
      const ref = prev ? prev[v] : st.lo + (st.hi - st.lo) * (v + 0.5) / V; near[v] = [];
      for (let p = 0; p < T; p++) {
        let best = null, bd = 1e9;
        for (let m = st.lo; m <= st.hi; m++) if (m % 12 === pcs[p] % 12) { const d = Math.abs(m - ref); if (d < bd) { bd = d; best = m; } }
        near[v][p] = best == null ? ref : best;
      }
    }
    const a = new Array(V); let best = null, bc = 1e9;
    (function rec(v) {
      if (v === V) {
        let c = 0; const used = {};
        for (let i = 0; i < V; i++) { used[a[i]] = (used[a[i]] || 0) + 1; c += prev ? Math.abs(near[i][a[i]] - prev[i]) : 0; }
        for (const e of ess) if (!used[e]) c += 60;
        for (let p = 0; p < T; p++) if (!used[p]) c += 2.5;
        for (let i = 1; i < V; i++) {
          const gap = near[i][a[i]] - near[i - 1][a[i - 1]];
          if (gap <= 0) c += 50; else if (gap < 3 && i > 1) c += 4 * (3 - gap); else if (gap > st.gap) c += 3 * (gap - st.gap);
        }
        if (used[1] > 1) c += 3;
        c += R() * 0.8;
        if (c < bc) { bc = c; best = a.map((p, i) => near[i][p]); }
        return;
      }
      for (let p = 0; p < T; p++) { a[v] = p; rec(v + 1); }
    })(0);
    return best.slice().sort((x, y) => x - y);
  }
  function bassNear(prev, pc, lo, hi) {
    const ref = prev == null ? (lo + hi) / 2 : prev; let best = lo, bd = 1e9;
    for (let m = lo; m <= hi; m++) if (m % 12 === pc % 12) { const d = Math.abs(m - ref); if (d < bd) { bd = d; best = m; } }
    return best;
  }

  /* ================= shared buffers (cached across sessions: AudioBuffers belong to no context) ================= */
  const BR = 22050;                                       // rendered-buffer rate (the sources resample)
  const KS = new Map();
  /* Karplus-Strong string, rendered once per pitch: noise burst -> averaging delay loop with a first-order allpass for exact tuning. */
  function ksRender(midi, bright) {
    const f = mtof(midi), T60 = clamp(3.4 - (midi - 45) * 0.03, 1.0, 3.0), total = Math.floor(BR * Math.min(T60 * 1.05 + 0.3, 3.2));
    const Nf = BR / f - 0.5, L = Math.max(2, Math.floor(Nf)), frac = Nf - L, C = (1 - frac) / (1 + frac);
    const y = new Float32Array(total), ex = new Float32Array(L + 1), a = 0.25 + 0.5 * bright;
    let lp = 0, mean = 0;
    for (let i = 0; i <= L; i++) { lp += ((Math.random() * 2 - 1) - lp) * a; ex[i] = lp; mean += lp; }
    mean /= L + 1; const pp = Math.max(1, Math.floor(L * 0.18));
    for (let i = 0; i <= L; i++) y[i] = (ex[i] - mean) - (i >= pp ? (ex[i - pp] - mean) * 0.7 : 0);
    const g = Math.pow(10, -3 / (T60 * f));
    let vp = 0, ap = 0;
    for (let n = L + 1; n < total; n++) {
      const v = 0.5 * (y[n - L] + y[n - L - 1]), o = C * v + vp - C * ap; vp = v; ap = o; y[n] = g * o;
    }
    let pk = 0; for (let i = 0; i < total; i++) { const x = Math.abs(y[i]); if (x > pk) pk = x; }
    const k = 0.85 / (pk || 1), F = Math.floor(BR * 0.12);
    for (let i = 0; i < total; i++) { let s = y[i] * k; if (i > total - F) s *= (total - i) / F; y[i] = s; }
    return y;
  }
  function ksBuffer(ctx, midi, bright) {
    const key = midi + "|" + (bright > 0.5 ? 1 : 0);
    let b = KS.get(key);
    if (b) { KS.delete(key); KS.set(key, b); return b; }
    const d = ksRender(midi, bright > 0.5 ? 0.8 : 0.4);
    b = ctx.createBuffer(1, d.length, BR); b.getChannelData(0).set(d);
    KS.set(key, b);
    if (KS.size > 40) KS.delete(KS.keys().next().value);
    return b;
  }
  let NOISE = null, DRUMS = null;
  function noiseBuf(ctx) {
    if (!NOISE) { NOISE = ctx.createBuffer(1, BR * 2, BR); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return NOISE;
  }
  function drumBufs(ctx) {
    if (DRUMS) return DRUMS;
    const mk = (n, fn) => { const b = ctx.createBuffer(1, n, BR), d = b.getChannelData(0); fn(d, n); return b; };
    const D = { kick: [], snare: [], hat: [] };
    for (let v = 0; v < 3; v++) {
      D.kick.push(mk(Math.floor(BR * 0.4), (d, n) => {
        let ph = 0; const f0 = 42 + v * 3;
        for (let i = 0; i < n; i++) { const t = i / BR, fr = f0 + 85 * Math.exp(-t / 0.032); ph += 2 * Math.PI * fr / BR; d[i] = Math.sin(ph) * Math.exp(-t / 0.11) * (1 - Math.exp(-t / 0.003)) * 0.9; }
      }));
      D.snare.push(mk(Math.floor(BR * 0.3), (d, n) => {           // brush sweep: band-limited noise, slow swell, soft decay
        let lp = 0, lp2 = 0;
        for (let i = 0; i < n; i++) {
          const t = i / BR, w = Math.random() * 2 - 1; lp += (w - lp) * 0.55; lp2 += (lp - lp2) * 0.12;
          const hp = lp - lp2, env = Math.min(1, t / 0.03) * Math.exp(-t / 0.075);
          d[i] = hp * env * 0.9 + Math.sin(2 * Math.PI * (180 + v * 8) * t) * Math.exp(-t / 0.05) * 0.18;
        }
      }));
      D.hat.push(mk(Math.floor(BR * 0.1), (d, n) => {
        let lp = 0;
        for (let i = 0; i < n; i++) { const t = i / BR, w = Math.random() * 2 - 1; lp += (w - lp) * 0.35; d[i] = (w - lp) * Math.exp(-t / 0.02) * Math.min(1, t / 0.002) * 0.7; }
      }));
    }
    DRUMS = D; return D;
  }
  function mkHall(ctx, rt60, pre) {                                  // port of scene-engine's dark hall (only used when no downstream colour exists)
    const sr = ctx.sampleRate, p = Math.floor(pre * sr), n = Math.floor(sr * (rt60 * 1.15)) + p, buf = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c); let lp = 0, lp2 = 0;
      for (let k = 0; k < 10; k++) { const t = p + Math.floor(sr * (0.004 + 0.075 * Math.pow(Math.random(), 1.3))); if (t < n) d[t] += (Math.random() < 0.5 ? -1 : 1) * 0.55 * Math.pow(0.82, k); }
      for (let i = p; i < n; i++) {
        const t = (i - p) / sr, env = Math.exp(-6.91 * t / rt60) * Math.min(1, t / 0.04), coef = 0.62 - 0.52 * Math.min(1, t / (rt60 * 0.8));
        lp += ((Math.random() * 2 - 1) - lp) * coef; lp2 += (lp - lp2) * 0.7; d[i] += lp2 * env * 0.9;
      }
    }
    return buf;
  }
  function tapeCurve(k) { const n = 1024, c = new Float32Array(n), th = Math.tanh(k); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / th; } return c; }
  /* tape colour + hall, same character as TitanGen's music bus; returns the node to connect sources to */
  function buildColour(ctx, dest) {
    const inp = ctx.createGain(), tone = ctx.createBiquadFilter(), drive = ctx.createGain(), sat = ctx.createWaveShaper(), make = ctx.createGain();
    tone.type = "lowpass"; tone.frequency.value = 6800; tone.Q.value = 0.4; drive.gain.value = 1.5; sat.curve = tapeCurve(1.6); make.gain.value = 0.7;
    inp.connect(tone); tone.connect(drive); drive.connect(sat); sat.connect(make); make.connect(dest);
    const verb = ctx.createConvolver(); verb.buffer = mkHall(ctx, 4.8, 0.03);
    const send = ctx.createGain(), wet = ctx.createGain(); send.gain.value = 0.55; wet.gain.value = 0.85;
    inp.connect(send); send.connect(verb); verb.connect(wet); wet.connect(dest);
    return { input: inp, nodes: [inp, tone, drive, sat, make, verb, send, wet] };
  }

  /* ================= session ================= */
  const SESS = new Set();
  let worker = null, timer = 0, globalLevel = 1, globalTempo = 1;

  function mkSession(spec, opts) {
    const ctx = opts.ctx, R = rngOf(opts.seed);
    const rnd = (a, b) => a + R() * (b - a), pick = (arr) => arr[Math.floor(R() * arr.length)];
    const wpick = (pairs) => { let s = 0; for (const p of pairs) s += p[1]; let x = R() * s; for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; } return pairs[0][0]; };
    const S = {
      spec, ctx, R, rnd, pick, id: opts.id || "", q: [], ends: [], srcs: new Set(), stopped: false, killed: false,
      level: 1, tempo: 1, manual: !!opts.manual, rec: !!opts.rec, iv: [], nextAt: 0, cycles: 0, trans: 0, mods: 0,
      forms: [], secChords: [], up: null, prevVoice: null, prevBass: null, chordsPlayed: 0, section: "A", notesMel: 0, peak: 0,
      phrase: [], melAt: 0, lastMel: null, motif: null, buses: {}, extra: [], dropped: 0
    };
    const colourNodes = [];
    S.out = ctx.createGain(); S.out.gain.value = 0;
    let dest = opts.input || ctx.destination;
    if (opts.colour) { const c = buildColour(ctx, dest); dest = c.input; colourNodes.push(...c.nodes); }
    S.out.connect(dest);
    S.baseGain = 1;
    const inst = S.inst = normInst(spec.inst || {});
    S.mode = spec.mode || "major";
    S.keyPc = NOTE[spec.key || "C"];
    S.melScale = MELS[spec.melScale] || MODES[S.mode] || MODES.major;

    /* ---- voices: every source is registered, its chain is disconnected when its last source ends ---- */
    S.budget = (n, prio) => { let c = 0; for (const e of S.ends) c++; return c + n <= CAP * (prio ? 0.78 : 1); };
    S.voice = (nodes) => {
      let n = 0;
      nodes = nodes.slice();
      const done = () => { if (--n <= 0) for (const x of nodes) { try { x.disconnect(); } catch (e) { /* ignore */ } } };
      const reg = (o) => {
        n++; S.srcs.add(o);
        o.onended = () => { S.srcs.delete(o); try { o.disconnect(); } catch (e) { /* ignore */ } done(); };
        const st = o.start.bind(o), sp = o.stop.bind(o); let t0 = 0;
        o.start = (t, a, b) => { t0 = t; if (b !== undefined) { S.ends.push(t + b); if (S.rec) S.iv.push([t, t + b]); } return st(t, a, b); };
        o.stop = (t) => { S.ends.push(t); if (S.rec) S.iv.push([t0, t]); return sp(t); };
        return o;
      };
      return {
        keep(...xs) { for (const x of xs) if (x) nodes.push(x); },
        osc(type, f, det) { const o = reg(ctx.createOscillator()); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; return o; },
        buf(b) { const s = reg(ctx.createBufferSource()); s.buffer = b; return s; }
      };
    };
    S.gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    S.filt = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; };
    S.pan = (p) => { if (!ctx.createStereoPanner) return null; const n = ctx.createStereoPanner(); n.pan.value = clamp(p, -1, 1); return n; };
    S.lfo = (rate, depth, target, bag) => {                   // slow modulator that lives as long as the session
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = rate; const d = ctx.createGain(); d.gain.value = depth;
      o.connect(d); d.connect(target); o.start(); S.extra.push(o, d); return o;
    };
    /* shared per-session chains (built on first use) */
    S.bus = (kind) => {
      if (S.buses[kind]) return S.buses[kind];
      let b;
      if (kind === "strings") {
        const inp = S.gain(1), lp = S.filt("lowpass", 950, 0.45), dry = S.gain(0.55), wet = S.gain(0.5), mix = S.gain(1);
        inp.connect(lp); lp.connect(dry); dry.connect(mix);
        S.lfo(0.037, 380, lp.frequency);
        // chorus: two slowly modulated delays, one per side
        for (const [base, rate, depth, pan] of [[0.017, 0.31, 0.0032, -0.55], [0.025, 0.23, 0.0038, 0.55]]) {
          const dl = ctx.createDelay(0.06); dl.delayTime.value = base; S.lfo(rate, depth, dl.delayTime);
          const p = S.pan(pan); lp.connect(dl); if (p) { dl.connect(p); p.connect(wet); S.extra.push(p); } else dl.connect(wet);
          S.extra.push(dl);
        }
        wet.connect(mix); mix.connect(S.out); S.extra.push(inp, lp, dry, wet, mix); b = { in: inp };
      } else if (kind === "warm" || kind === "glass") {
        const inp = S.gain(1), lp = S.filt("lowpass", kind === "warm" ? 1100 : 2600, 0.3);
        inp.connect(lp); lp.connect(S.out); S.lfo(0.045, kind === "warm" ? 380 : 700, lp.frequency); S.extra.push(inp, lp); b = { in: inp };
      } else if (kind === "choir") {
        const inp = S.gain(1), hp = S.filt("highpass", 90), sum = S.gain(1), vs = ctx.createOscillator(), vg = S.gain(6);
        inp.connect(hp);
        // "ooh" formants: F1 ~ 310, F2 ~ 870, F3 ~ 2250
        for (const [f, q, g] of [[310, 7, 1], [870, 9, 0.3], [2250, 12, 0.05]]) { const bp = S.filt("bandpass", f, q), gg = S.gain(g); hp.connect(bp); bp.connect(gg); gg.connect(sum); S.extra.push(bp, gg); }
        sum.connect(S.out); vs.frequency.value = 4.9; vs.connect(vg); vs.start();      // vibrato (cents) shared by every choir voice
        S.extra.push(inp, hp, sum, vs, vg); b = { in: inp, vib: vg };
      }
      S.buses[kind] = b; return b;
    };

    /* ---- instruments ---- */
    const I_ = {
      strings(t, midis, dur, lvl) {
        const bus = S.bus("strings"), att = Math.min(3.2, dur * 0.3), rel = Math.min(4, dur * 0.36);
        midis.forEach((m, i) => {
          if (!S.budget(LITE ? 1 : 2, 0)) return;
          const g = ctx.createGain(), V = S.voice([g]), f = mtof(m), w = lvl * 0.17 / Math.sqrt(midis.length) * (i === 0 ? 0.8 : 1);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(w, t + att); g.gain.setValueAtTime(w, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
          for (const det of LITE ? [rnd(-4, 4)] : [-8 + rnd(-3, 3), 8 + rnd(-3, 3)]) { const o = V.osc("sawtooth", f, det); o.connect(g); o.start(t); o.stop(t + dur + rel + 0.1); }
          g.connect(bus.in);
        });
      },
      warm(t, midis, dur, lvl) {                                  // the original pad character: detuned sines + a little triangle
        const bus = S.bus("warm"), att = Math.min(3.6, dur * 0.3), rel = Math.min(5, dur * 0.42), per = lvl * 0.2 / Math.sqrt(midis.length);
        midis.forEach((m, i) => {
          if (!S.budget(3, 0)) return;
          const f = mtof(m), w = per * (i === 0 ? 0.7 : 1), g = ctx.createGain(), V = S.voice([g]);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(w, t + att); g.gain.setValueAtTime(w, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
          [["sine", -7, 0.42], ["sine", 7, 0.42], ["triangle", rnd(-2, 2), 0.2]].forEach(([type, det, k]) => {
            if (LITE && k < 0.3 && type === "triangle") return;
            const o = V.osc(type, f, det + rnd(-3, 3)), kg = S.gain(k); o.connect(kg); kg.connect(g); o.start(t); o.stop(t + dur + rel + 0.1); V.keep(kg);
          });
          g.connect(bus.in);
        });
      },
      glass(t, midis, dur, lvl) {                                 // sines with a soft octave shimmer
        const bus = S.bus("glass"), att = Math.min(3.0, dur * 0.28), rel = Math.min(4.5, dur * 0.4), per = lvl * 0.17 / Math.sqrt(midis.length);
        midis.forEach((m) => {
          if (!S.budget(3, 0)) return;
          const f = mtof(m), g = ctx.createGain(), V = S.voice([g]);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(per, t + att); g.gain.setValueAtTime(per, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
          for (const [mul, w, det] of [[1, 0.55, -5], [1, 0.55, 5], [2.003, 0.2 + (LITE ? 0 : 0.0), 0], [3.01, 0.06, 0]]) {
            if (LITE && mul > 2.5) continue;
            const o = V.osc("sine", f * mul, det + rnd(-2, 2)), kg = S.gain(w); o.connect(kg); kg.connect(g); V.keep(kg); o.start(t); o.stop(t + dur + rel + 0.1);
          }
          g.connect(bus.in);
        });
      },
      choir(t, midis, dur, lvl) {                                 // formant-filtered saws: a soft "ooh"
        const bus = S.bus("choir"), att = Math.min(3.5, dur * 0.34), rel = Math.min(4.5, dur * 0.4);
        midis.slice(0, 3).forEach((m) => {
          if (!S.budget(2, 1)) return;
          const f = mtof(m), g = ctx.createGain(), V = S.voice([g]), w = lvl * 0.075;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(w, t + att); g.gain.setValueAtTime(w, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
          for (const det of LITE ? [0] : [-6, 6]) { const o = V.osc("sawtooth", f, det + rnd(-4, 4)); bus.vib.connect(o.detune); o.connect(g); o.start(t); o.stop(t + dur + rel + 0.1); }
          g.connect(bus.in);
        });
      },
      piano(t, midi, vel, light) {
        if (!S.budget(light || LITE ? 3 : 7, 0)) return;
        const f = mtof(midi), dur = clamp(3.4 + (84 - midi) * 0.05, 2.2, 5.6), lp = S.filt("lowpass", 1000, 0.3), v = ctx.createGain(), pn = S.pan((midi - 62) / 40);
        const V = S.voice([lp, v, pn].filter(Boolean));
        // melody notes get the closing filter (the felt-piano bloom and fade); soft comping chords keep a static filter (an automated biquad costs a coefficient update every block)
        if (light) lp.frequency.value = Math.min(3600, f * 3.2);
        else { lp.frequency.setValueAtTime(Math.min(5200, f * (3.2 + vel * 3.6)), t); lp.frequency.exponentialRampToValueAtTime(Math.max(420, f * 1.5), t + dur * 0.7); }
        v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vel * 0.2, t + 0.018); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        [[1, 1, 2], [2.003, 0.34, 1], [3.01, 0.12, 1], [4.03, 0.05, 1]].forEach(([mul, w, nOsc], k) => {
          if ((LITE || light) && k > 2) return;
          const pd = Math.max(0.6, dur * (k ? 0.9 / (1 + k * 0.7) : 1)), a = ctx.createGain(); a.gain.setValueAtTime(w * 0.5, t); a.gain.exponentialRampToValueAtTime(0.0008, t + pd); a.connect(lp);
          for (const det of nOsc === 2 && !LITE && !light ? [-4.5, 4.5] : [rnd(-3, 3)]) { const o = V.osc("sine", f * mul, det + rnd(-1.5, 1.5)); o.connect(a); o.start(t); o.stop(t + pd + 0.05); }
          V.keep(a);
        });
        const b = V.osc("triangle", f), bg = ctx.createGain(); bg.gain.setValueAtTime(0.22, t); bg.gain.exponentialRampToValueAtTime(0.0008, t + dur * 0.5); b.connect(bg); bg.connect(lp); b.start(t); b.stop(t + dur * 0.5 + 0.1);
        V.keep(bg);
        const th = V.buf(noiseBuf(ctx)), tf = S.filt("lowpass", 700, 0.7), tg = ctx.createGain();   // felt thump
        tg.gain.setValueAtTime(0, t); tg.gain.linearRampToValueAtTime(0.05 * vel, t + 0.004); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        th.connect(tf); tf.connect(tg); tg.connect(lp); th.start(t, R() * 1.5, 0.06); V.keep(tf, tg);
        lp.connect(v); if (pn) { v.connect(pn); pn.connect(S.out); } else v.connect(S.out);
      },
      harp(t, midi, vel) {
        if (!S.budget(1, 1)) return;
        const b = ksBuffer(ctx, midi, vel > 0.6 ? 0.9 : 0.3), g = ctx.createGain(), pn = S.pan((midi - 66) / 30), V = S.voice([g, pn].filter(Boolean));
        const s = V.buf(b); g.gain.value = vel * 0.5; s.connect(g); if (pn) { g.connect(pn); pn.connect(S.out); } else g.connect(S.out);
        s.start(t); s.stop(t + b.duration + 0.02);
      },
      bell(t, midi, vel, kind) {
        if (!S.budget(LITE ? 2 : 4, 1)) return;
        const f = mtof(midi), box = kind !== "celesta", dur = box ? 4.2 : 3.4, lp = S.filt("lowpass", box ? 3600 : 4400, 0.3), v = ctx.createGain(), pn = S.pan((midi - 84) / 24 + rnd(-0.25, 0.25));
        const V = S.voice([lp, v, pn].filter(Boolean));
        v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vel * (box ? 0.13 : 0.12), t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const parts = box ? [[1, 1, 1], [2, 0.3, 0.55], [3.0, 0.1, 0.3], [4.17, 0.04, 0.18]] : [[1, 1, 1], [4.01, 0.22, 0.3], [9.4, 0.05, 0.1]];
        parts.forEach(([mul, w, dm], k) => {
          if (LITE && k > 1) return;
          const o = V.osc("sine", f * mul, rnd(-4, 4)), a = ctx.createGain(); a.gain.setValueAtTime(w, t); a.gain.exponentialRampToValueAtTime(0.001, t + dur * dm);
          o.connect(a); a.connect(lp); o.start(t); o.stop(t + dur + 0.1); V.keep(a);
        });
        lp.connect(v); if (pn) { v.connect(pn); pn.connect(S.out); } else v.connect(S.out);
      },
      upright(t, midi, vel, dur) {
        if (!S.budget(2, 0)) return;
        const f = mtof(midi), lp = S.filt("lowpass", 620, 0.5), g = ctx.createGain(), V = S.voice([lp, g]);
        lp.frequency.setValueAtTime(620, t); lp.frequency.exponentialRampToValueAtTime(190, t + dur * 0.8);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.012); g.gain.setTargetAtTime(0, t + 0.04, dur * 0.3);
        const a = V.osc("sine", f), b = V.osc("triangle", f), bk = S.gain(0.3); b.connect(bk); a.connect(lp); bk.connect(lp); V.keep(bk);
        a.start(t); a.stop(t + dur + 0.2); b.start(t); b.stop(t + dur + 0.2); lp.connect(g); g.connect(S.out);
      },
      sub(t, midi, vel, dur) {
        if (!S.budget(2, 0)) return;
        const f = mtof(midi), g = ctx.createGain(), V = S.voice([g]), rel = Math.min(3, dur * 0.4);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.42, t + 0.25); g.gain.setValueAtTime(vel * 0.42, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur + rel);
        const a = V.osc("sine", f), b = V.osc("triangle", f * 2, 3), bk = S.gain(0.08); b.connect(bk); a.connect(g); bk.connect(g); V.keep(bk);
        a.start(t); a.stop(t + dur + rel + 0.1); b.start(t); b.stop(t + dur + rel + 0.1); g.connect(S.out);
      },
      drum(kind, t, vel) {
        if (!S.budget(1, 1)) return;
        const D = drumBufs(ctx)[kind], b = D[Math.floor(R() * D.length)], g = ctx.createGain(), V = S.voice([g]), s = V.buf(b);
        g.gain.value = vel; s.connect(g); g.connect(S.out); s.start(t); s.stop(t + b.duration + 0.02);
      }
    };

    /* ---- harmony state machine ---- */
    const tonic = () => (S.keyPc + S.trans) % 12;
    function mkChord(sym) {
      const c = typeof sym === "object" ? sym : parseChord(sym, S.mode);
      return { rs: c.rs, tones: c.tones, ess: c.ess, sym: c.sym, beats: c.beats || spec.chordBeats || 12 };
    }
    function varyChord(sym) {
      if (typeof sym !== "string" || R() > (spec.ext == null ? 0.22 : spec.ext)) return sym;
      const c = parseChord(sym, S.mode); if (!c.plain) return sym;
      return sym + (c.minor ? pick(["7", "7", "9"]) : pick(["maj7", "add9", "6"]));
    }
    function newCycle() {
      S.cycles++;
      const forms = spec.forms || (spec.B ? [["A", "A", "B", "A"], ["A", "B", "A", "B"], ["A", "A", "B"], ["A", "B", "B", "A"]] : [["A", "A"]]);
      S.forms = pick(forms).slice();
      if (S.cycles > 1 && S.cycles % 3 === 0) mutateMotif();
      if (spec.mod !== false && S.cycles > 1 && S.cycles % (spec.modEvery || 3) === 0) {
        const nt = S.trans === 0 ? pick([2, 5, 7, -2, -5]) : (R() < 0.6 ? 0 : pick([2, 5, 7, -2].filter((x) => x !== S.trans)));
        S.trans = nt; S.mods++; S.lastMod = S.cycles;
        if (!spec.noPivot && (S.mode === "major" || S.mode === "minor" || S.mode === "dorian")) S.secChords.push({ sym: "V7*", rs: 7, tones: [0, 4, 7, 10], ess: [0, 1, 3], beats: Math.max(4, Math.round((spec.chordBeats || 12) / 2)) });
      }
    }
    function startSection() {
      if (!S.forms.length) newCycle();
      S.section = S.forms.shift();
      const list = spec[S.section] || spec.A;
      for (const s of list) S.secChords.push(mkChord(varyChord(s)));
    }
    function genChord() {
      if (!S.secChords.length) startSection();
      if (!S.secChords.length) startSection();
      const c = S.secChords.shift(); c.root = (tonic() + c.rs) % 12; c.sec = S.section; c.trans = S.trans; return c;
    }
    function takeChord() { const c = S.up || genChord(); S.up = genChord(); return c; }

    /* ---- melody ---- */
    const bar = () => 4 * 60 / (spec.bpm * S.tempo);
    function buildScale() {                                       // midi pitches of the melody scale in the current key (the "steps")
      S.sp = []; const root = tonic();
      for (let o = 24; o <= 108; o += 12) for (const s of S.melScale) S.sp.push(o + root + s);
      S.sp = S.sp.filter((m) => m >= 36 && m <= 100).sort((a, b) => a - b);
    }
    const stepOf = (m) => { let bi = 0, bd = 1e9; for (let i = 0; i < S.sp.length; i++) { const d = Math.abs(S.sp[i] - m); if (d < bd) { bd = d; bi = i; } } return bi; };
    const MEL_RANGE = { piano: [62, 82], harp: [60, 88], bell: [74, 98], box: [74, 98] };
    function melRange() {
      const mel = spec.melody; if (mel.range) return mel.range;
      const first = mel.inst && mel.inst[0] ? (Array.isArray(mel.inst[0]) ? mel.inst[0][0] : mel.inst[0]) : "piano";
      return MEL_RANGE[first] || MEL_RANGE.piano;
    }
    function newMotif() {
      const pats = [[1, 1, 2], [1.5, 0.5, 1, 1], [2, 1, 1, 2], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2], [1, 1, 1, 1], [3, 1, 2], [1, 2, 1]];
      const rh = pick(pats), notes = []; let s = 0;
      rh.forEach((d, i) => { if (i) s += pick([1, 1, -1, -1, 2, -2, 3, 0]); s = clamp(s, -3, 4); notes.push({ s, d }); });
      return notes;
    }
    function mutateMotif() { if (!S.motif) return; const i = Math.floor(R() * S.motif.length); S.motif = S.motif.map((n, k) => (k === i ? { s: clamp(n.s + pick([-1, 1, 2]), -3, 4), d: n.d } : n)); }
    function variant(op) {
      const m = S.motif.map((n) => ({ s: n.s, d: n.d }));
      switch (op) {
        case "transpose": { const k = pick([-2, -1, 1, 2, 3]); return m.map((n) => ({ s: n.s + k, d: n.d })); }
        case "invert": return m.map((n) => ({ s: -n.s, d: n.d }));
        case "augment": return m.map((n) => ({ s: n.s, d: n.d * 2 })).slice(0, 4);
        case "diminish": return m.map((n) => ({ s: n.s, d: Math.max(0.5, n.d * 0.5) }));
        case "retro": { const r = m.map((n) => n.s).reverse(); return m.map((n, i) => ({ s: r[i], d: n.d })); }
        case "fragment": { const k = Math.min(m.length, 2 + Math.floor(R() * 2)); const f = m.slice(0, k); f.push({ s: f[f.length - 1].s + pick([-1, 0, 1]), d: 2 }); return f; }
        case "cadence": { m[m.length - 1] = { s: 0, d: Math.max(2, m[m.length - 1].d) }; return m; }
        default: return m;
      }
    }
    const OPS = {
      A: [["same", 3], ["transpose", 3], ["fragment", 2], ["retro", 1], ["augment", 1], ["cadence", 2]],
      B: [["invert", 3], ["transpose", 3], ["augment", 2], ["same", 1], ["diminish", 1], ["cadence", 2]]
    };
    function planMelody(ch, tEnd) {
      const mel = spec.melody; if (!mel) return;
      if (!S.sp || S.spTrans !== S.trans) { S.sp = null; buildScale(); S.spTrans = S.trans; }
      if (!S.motif) { S.motif = newMotif(); S.melAt = ch.t0 + ch.D * (0.35 + R() * 0.3); }
      const beat = 60 / (spec.bpm * S.tempo), dens = mel.density == null ? 0.35 : mel.density, [rlo, rhi] = melRange();
      const lo = stepOf(rlo), hi = stepOf(rhi);
      for (let guard = 0; guard < 8; guard++) {
        if (!S.phrase.length) {
          let start = Math.max(S.melAt, ch.t0 + 0.05);
          start = ch.t0 + Math.ceil((start - ch.t0) / (beat * 0.5)) * beat * 0.5;      // on the half-beat grid
          if (start >= tEnd - beat) break;
          // phrase: a developed variant of the motif, anchored on a chord tone near where the last phrase ended
          const op = wpick(OPS[ch.sec === "B" ? "B" : "A"]), mv = variant(op);
          const ref = S.lastMel == null ? (rlo + rhi) / 2 : S.lastMel + rnd(-3, 3);
          let anchor = stepOf(ref), bd = 99;
          for (let k = -3; k <= 3; k++) { const i = clamp(anchor + k, 0, S.sp.length - 1); if (ch.pcs.includes(S.sp[i] % 12) && Math.abs(k) < bd) { bd = Math.abs(k); anchor = i; } }
          let t = start; const notes = [];
          mv.forEach((n, i) => {
            let idx = anchor + n.s; while (idx > hi) idx -= S.melScale.length; while (idx < lo) idx += S.melScale.length;
            const arch = 0.78 + 0.22 * Math.sin(Math.PI * (i + 0.5) / mv.length);
            notes.push({ t, idx, d: n.d * beat, vel: clamp(arch * rnd(0.72, 1.0) * (mel.vel || 1), 0.2, 1), first: i === 0, last: i === mv.length - 1 });
            t += n.d * beat;
          });
          S.phrase = notes; S.opLast = op;
          const restBars = dens >= 0.99 ? 0.25 : (rnd(2.2, 4.5) * (1 - dens) + rnd(0.5, 1.2) * dens) * (R() < 0.18 ? 1.8 : 1);
          S.melAt = t + restBars * bar();
        }
        const nt = S.phrase[0];
        if (!nt || nt.t >= tEnd) break;
        S.phrase.shift();
        // pitch snapping: first, last and long notes are chord tones; a long note never sits a semitone off a chord tone
        let idx = nt.idx; const isCT = (i) => ch.pcs.includes(S.sp[clamp(i, 0, S.sp.length - 1)] % 12);
        const clash = (i) => ch.pcs.some((p) => { const d = Math.abs(((S.sp[clamp(i, 0, S.sp.length - 1)] - p) % 12 + 12) % 12); return d === 1 || d === 11; });
        if ((nt.first || nt.last || nt.d > 1.9 * beat) && !isCT(idx)) {
          for (const k of [1, -1, 2, -2, 3, -3]) if (isCT(idx + k)) { idx += k; break; }
        } else if (nt.d > 1.4 * beat && clash(idx)) { for (const k of [1, -1, 2, -2]) if (!clash(idx + k)) { idx += k; break; } }
        idx = clamp(idx, 0, S.sp.length - 1);
        if (!nt.first && !nt.last && R() < 0.06) continue;                  // an occasional dropped inner note
        const midi = S.sp[idx], tt = nt.t + (R() + R() - 1) * 0.014, vel = nt.vel;
        S.lastMel = midi; S.notesMel++;
        const which = melInst();
        S.at(tt, () => playMel(which, tt, midi, vel));
      }
    }
    function melInst() {
      const l = spec.melody.inst || ["piano"];
      return wpick(l.map((x) => (Array.isArray(x) ? x : [x, 1])));
    }
    function playMel(which, t, midi, vel) {
      if (which === "piano" && inst.piano) I_.piano(t, midi, vel);
      else if (which === "harp" && inst.harp) I_.harp(t, midi, vel);
      else if (which === "bells" && inst.bells) I_.bell(t, midi, vel, inst.bells.type);
      else if (which === "piano" || which === "harp" || which === "bells") { if (inst.piano) I_.piano(t, midi, vel); else if (inst.harp) I_.harp(t, midi, vel); else if (inst.bells) I_.bell(t, midi, vel, inst.bells.type); }
    }

    /* ---- one chord: pad, bass, comping, arpeggios, choir, drums, melody ---- */
    S.at = (t, fn) => { S.q.push({ t, fn }); };
    function planChord() {
      const ch = takeChord(), beat = 60 / (spec.bpm * S.tempo), D = ch.beats * beat, t0 = S.nextAt;
      S.nextAt += D; ch.t0 = t0; ch.D = D;
      ch.pcs = ch.tones.map((x) => (ch.root + x) % 12);
      S.vstyle = VSTYLE[spec.voicing || "open"];
      const vo = voiceLead(S.prevVoice, ch.pcs, ch.ess, S.vstyle, R); S.prevVoice = vo; ch.vo = vo;
      const bassLo = spec.bassLo || 34, bassHi = spec.bassHi || 48;
      const bass = bassNear(S.prevBass, ch.root, bassLo, bassHi); S.prevBass = bass;
      S.chordsPlayed++; S.cur = ch;
      if (S.rec) (S.log = S.log || []).push({ t: t0, sym: ch.sym, sec: ch.sec, trans: ch.trans, vo: vo.slice(), bass });
      // pad
      if (inst.pad) { const f = I_[inst.pad.type] || I_.warm; S.at(t0, () => f(t0, vo, D, inst.pad.lvl)); }
      // choir: not every chord
      if (inst.choir && R() < (spec.choirP == null ? 0.45 : spec.choirP)) {
        const cv = vo.map((m) => (m > 69 ? m - 12 : m)); S.at(t0 + 0.2, () => I_.choir(t0 + 0.2, cv, D * 0.92, inst.choir.lvl));
      }
      // bass
      if (inst.bass) {
        const lvl = inst.bass.lvl;
        if (inst.bass.type === "sub") S.at(t0, () => I_.sub(t0, bass, lvl, D));
        else {
          const nxt = S.up ? bassNear(bass, S.up.root, bassLo, bassHi) : bass, fifth = bassNear(bass, (ch.root + 7) % 12, bassLo, bassHi);
          const hits = spec.walk ? Math.max(2, Math.round(ch.beats / 2)) : Math.max(1, Math.round(ch.beats / 4));
          for (let i = 0; i < hits; i++) {
            const bt = spec.walk ? i * 2 : i * 4, tt = t0 + bt * beat + rnd(-0.01, 0.012);
            let m = bass, v = lvl * (i === 0 ? 1 : 0.8);
            if (i > 0 && i < hits - 1) m = R() < 0.55 ? fifth : bass;
            if (i === hits - 1 && hits > 1 && spec.walk) m = nxt > bass ? nxt - (R() < 0.5 ? 1 : 2) : nxt + (R() < 0.5 ? 1 : 2);   // approach note
            if (i === hits - 1 && hits > 1 && !spec.walk && R() < 0.5) m = fifth;
            S.at(tt, () => I_.upright(tt, m, v, beat * (spec.walk ? 1.7 : 3)));
          }
        }
      }
      // piano comping (rolled chord at the change, or off-beat "sync" hits)
      if (inst.piano && spec.comp !== "none" && (spec.melody == null || true)) {
        const cn = vo.slice(0, 3).map((m, i) => (i === 0 ? m - 12 : m)), hitsAt = spec.comp === "sync" ? [0, 2.5] : [0];
        hitsAt.forEach((bt, hi) => {
          if (hi && R() < 0.35) return;
          const tt = t0 + bt * beat + (hi ? beat * 0.12 : 0), v = (hi ? 0.34 : 0.46) * inst.piano.lvl;
          cn.forEach((m, i) => { const t2 = tt + i * rnd(0.035, 0.07) + rnd(0, 0.012); S.at(t2, () => I_.piano(t2, m, v * rnd(0.85, 1.05), true)); });
        });
      }
      // harp arpeggios
      if (inst.harp && R() < (spec.harpP == null ? 0.75 : spec.harpP)) {
        const pool = vo.concat(vo.map((m) => m + 12).filter((m) => m < 90)), dir = pick(["up", "down", "updown"]), cnt = 4 + Math.floor(R() * 3);
        const arr = []; let i = dir === "down" ? pool.length - 1 : 0, st = dir === "down" ? -1 : 1;
        for (let k = 0; k < cnt; k++) { arr.push(pool[clamp(i, 0, pool.length - 1)]); i += st; if (dir === "updown" && (i >= pool.length - 1 || i < 0)) st = -st; }
        const step = (spec.harpStep || 0.75) * beat * rnd(0.9, 1.1), start = t0 + beat * rnd(0.5, 2.5);
        arr.forEach((m, k) => { const tt = start + k * step + rnd(0, 0.02), v = inst.harp.lvl * (0.75 + 0.25 * Math.sin(Math.PI * (k + 0.5) / cnt)) * rnd(0.8, 1); if (tt < t0 + D) S.at(tt, () => I_.harp(tt, m, v)); });
      }
      // drums
      if (inst.drums) planDrums(t0, D, beat);
      planMelody(ch, t0 + D);
      S.q.sort((a, b) => a.t - b.t);
    }
    function planDrums(t0, D, beat) {
      const dr = inst.drums, lofi = dr.type === "lofi", sw = spec.swing == null ? (lofi ? 0.2 : 0.14) : spec.swing, bars = Math.max(1, Math.round(D / (beat * 4))), L = dr.lvl;
      const hit = (kind, tt, v, jit) => { const t = tt + rnd(-jit, jit); S.at(t, () => I_.drum(kind, t, v)); };
      for (let b = 0; b < bars; b++) {
        const base = t0 + b * 4 * beat;
        for (let e = 0; e < 8; e++) {                       // hats on the off-beat eighths, and the main beats now and then (fewer nodes than every eighth)
          if (e % 2 ? R() < (lofi ? 0.12 : 0.3) : R() < 0.6) continue;
          const off = e % 2 ? sw * beat * 0.5 : 0;
          hit("hat", base + (e * 0.5) * beat + off, (e % 2 ? 0.28 : 0.38) * L * rnd(0.7, 1.15), 0.008);
        }
        hit("kick", base, 0.85 * L, 0.006);
        if (R() < (lofi ? 0.55 : 0.3)) hit("kick", base + 2.5 * beat + sw * beat * 0.25, 0.6 * L, 0.01);
        if (R() < (lofi ? 0.5 : 0.7)) hit("kick", base + 2 * beat, 0.55 * L, 0.008);
        hit("snare", base + 1 * beat, 0.75 * L * rnd(0.85, 1.05), 0.008);
        hit("snare", base + 3 * beat, 0.7 * L * rnd(0.85, 1.05), 0.008);
        if (R() < 0.15) hit("snare", base + 2.75 * beat, 0.25 * L, 0.01);
      }
    }

    /* ---- the scheduler ---- */
    S.step = (t0, t1) => {
      if (S.stopped || S.killed) return;
      if (S.ends.length) S.ends = S.ends.filter((e) => e > t0);
      if (S.nextAt === 0) S.nextAt = t0 + 0.1;
      else if (!S.manual && S.nextAt < t0 - 0.4) { S.q.length = 0; S.phrase.length = 0; S.nextAt = t0 + 0.1; S.melAt = t0; }   // resumed after a long suspension
      let guard = 0;
      const tp0 = performance.now();
      while (S.nextAt < t1 && guard++ < 6) planChord();
      const tp1 = performance.now(); if (tp1 - tp0 > (S.maxPlan || 0)) S.maxPlan = tp1 - tp0;
      let n = 0;
      while (S.q.length && S.q[0].t < t1 && (S.manual || n < 12)) {      // at most 12 events per tick on the main thread; the rest follow on the next tick (the look-ahead has slack)
        const e = S.q.shift();
        if (!S.manual && e.t < t0 - 0.5) { S.dropped++; continue; }
        try { e.fn(); n++; } catch (err) { S.err = err; }
      }
      const te = performance.now() - tp1; if (te > (S.maxEv || 0)) S.maxEv = te;
      S.live = S.ends.length;
      if (S.live > S.peakLive || S.peakLive == null) S.peakLive = S.live;
    };
    S.setLevel = (x) => { S.baseGain = x; applyGain(0.15); };
    function applyGain(tc) { if (S.killed || S.stopped) return; S.out.gain.setTargetAtTime(S.level * S.baseGain * globalLevel * (spec.vol == null ? 1 : spec.vol) * TRIM, ctx.currentTime, tc || 0.2); }
    S.applyGain = applyGain;
    S.setTempoScale = (x) => { S.tempo = clamp(x, 0.5, 2); };
    S.stop = (fade) => {
      if (S.stopped) { if (fade === 0) S.kill(); return; }
      S.stopped = true; S.q.length = 0; S.phrase.length = 0; fade = fade == null ? 1.5 : fade;
      if (fade <= 0.02 || S.manual) { S.kill(); return; }
      try { S.out.gain.cancelScheduledValues(ctx.currentTime); S.out.gain.setValueAtTime(S.out.gain.value, ctx.currentTime); S.out.gain.linearRampToValueAtTime(0, ctx.currentTime + fade); } catch (e) { /* ignore */ }
      S.killT = setTimeout(S.kill, fade * 1000 + 350);
    };
    S.kill = () => {
      if (S.killed) return; S.killed = true; S.stopped = true; clearTimeout(S.killT); S.q.length = 0;
      for (const o of Array.from(S.srcs)) { try { o.onended = null; o.stop(); } catch (e) { /* ignore */ } try { o.disconnect(); } catch (e) { /* ignore */ } }
      S.srcs.clear();
      for (const o of S.extra) { try { if (o.stop) o.stop(); } catch (e) { /* ignore */ } try { o.disconnect(); } catch (e) { /* ignore */ } }
      S.extra.length = 0;
      try { S.out.disconnect(); } catch (e) { /* ignore */ }
      for (const n of colourNodes) { try { n.disconnect(); } catch (e) { /* ignore */ } }
      SESS.delete(S); if (!SESS.size) stopTimer();
    };
    S.stats = () => ({ id: S.id, voices: S.srcs.size, scheduled: S.ends.length, queued: S.q.length, peakScheduled: S.peakLive || 0, chords: S.chordsPlayed, section: S.section, cycles: S.cycles, trans: S.trans, mods: S.mods, melNotes: S.notesMel, dropped: S.dropped, tempo: S.tempo, maxPlanMs: Math.round(S.maxPlan || 0), maxEvMs: Math.round(S.maxEv || 0) });
    return S;
  }
  const TRIM = 1;

  function normInst(i) {
    const o = {};
    const t = (v, dt) => (v == null || v === 0 || v === false ? null : Array.isArray(v) ? { type: v[0], lvl: v[1] } : { type: dt, lvl: typeof v === "number" ? v : 0.5 });
    o.pad = t(i.pad, "strings"); o.bass = t(i.bass, "upright"); o.drums = t(i.drums, "brush"); o.bells = t(i.bells, "box");
    o.piano = i.piano ? { lvl: typeof i.piano === "number" ? i.piano : 0.5 } : null;
    o.harp = i.harp ? { lvl: typeof i.harp === "number" ? i.harp : 0.4 } : null;
    o.choir = i.choir ? { lvl: typeof i.choir === "number" ? i.choir : 0.3 } : null;
    return o;
  }

  /* ---------- shared tick ---------- */
  function tick() {
    for (const S of Array.from(SESS)) {
      if (S.manual || S.killed) continue;
      const ctx = S.ctx; if (ctx.state !== "running") continue;
      const t0 = ctx.currentTime; try { S.step(t0, t0 + LOOKAHEAD); } catch (e) { S.err = e; }
    }
  }
  function startTimer() {
    if (worker || timer) return;
    try {
      const url = URL.createObjectURL(new Blob([`let t=0;onmessage=e=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),${TICK_MS});};`], { type: "text/javascript" }));
      worker = new Worker(url); worker.onmessage = tick; worker.postMessage(1); return;
    } catch (e) { worker = null; }
    timer = setInterval(tick, TICK_MS);
  }
  function stopTimer() {
    if (worker) { try { worker.postMessage(0); worker.terminate(); } catch (e) { /* ignore */ } worker = null; }
    if (timer) { clearInterval(timer); timer = 0; }
  }

  /* ================= scene specs =================
     key / mode (harmony) / melScale (pent, minpent or the mode) / bpm / chordBeats (one chord = chordBeats beats)
     A, B: progressions as roman numerals (case = quality; suffix 7 maj7 add9 sus2 sus4 6 9; b/# prefix), relative to the mode's scale
     voicing: close | open | shell | wide; ext: chance a plain chord gets a 7th/add9/6; mod / modEvery: modulation (default every 4th cycle)
     inst: pad [type,lvl] (strings | warm | glass), piano, harp, bells [box|celesta, lvl], bass [upright|sub, lvl], drums [brush|lofi, lvl], choir
     melody: { inst: ["piano", ["harp", 2]...], density 0..1 (higher = more phrases, fewer rests), range } or null */
  const SPECS = {
    rainy: { mood: "rain on a skylight, slow lo-fi", key: "A", mode: "dorian", bpm: 68, chordBeats: 8, A: ["i7", "IV", "III", "VII"], B: ["IV", "i7", "VII", "v7"], voicing: "open", comp: "sync", swing: 0.2,
      inst: { pad: ["warm", 0.4], piano: 0.55, bells: ["box", 0.25], bass: ["upright", 0.4], drums: ["lofi", 0.3] }, melody: { inst: [["piano", 3], ["bells", 1]], density: 0.4 } },
    vault: { mood: "cold stone, far bowl", key: "E", mode: "phrygian", bpm: 52, chordBeats: 12, A: ["i", "II", "i", "VI"], B: ["i", "vii", "VI", "II"], voicing: "wide", ext: 0.1,
      inst: { pad: ["strings", 0.4], bells: ["celesta", 0.3], harp: 0.2, bass: ["sub", 0.3] }, melody: { inst: ["bells"], density: 0.22 }, harpP: 0.4 },
    lofi: { mood: "laid-back evening keys", key: "C", mode: "dorian", bpm: 76, chordBeats: 8, A: ["ii7", "v7", "i7", "IV7"], B: ["i7", "IV7", "VII", "III"], voicing: "open", comp: "sync", swing: 0.24,
      inst: { pad: ["warm", 0.3], piano: 0.6, bells: ["celesta", 0.25], bass: ["upright", 0.42], drums: ["lofi", 0.34] }, melody: { inst: [["piano", 3], ["bells", 1]], density: 0.5 } },
    garden: { mood: "night garden, pentatonic", key: "G", mode: "major", melScale: "pent", bpm: 56, chordBeats: 12, A: ["Isus2", "IVadd9", "I", "Vsus4"], B: ["vi", "IV", "Isus2", "V"], voicing: "open", ext: 0,
      inst: { pad: ["glass", 0.32], harp: 0.5, bells: ["box", 0.3] }, melody: { inst: [["harp", 2], ["bells", 2]], density: 0.3 }, harpP: 0.8 },
    storm: null,
    "midnight-gallery": { mood: "after hours in a gallery", key: "A", mode: "dorian", bpm: 60, chordBeats: 12, A: ["i7", "IV", "i7", "VII"], B: ["III", "VII", "IV", "v7"], voicing: "open",
      inst: { pad: ["strings", 0.38], piano: 0.5, harp: 0.15, bass: ["sub", 0.25] }, melody: { inst: ["piano"], density: 0.35 } },
    conservator: { mood: "hushed bench, bright lydian", key: "D", mode: "lydian", bpm: 60, chordBeats: 12, A: ["I", "II", "I", "V"], B: ["vi", "V", "II", "I"], voicing: "close",
      inst: { pad: ["strings", 0.28], piano: 0.55, harp: 0.2, bass: ["upright", 0.18] }, melody: { inst: [["piano", 3], ["harp", 1]], density: 0.4 }, comp: "none" },
    mint: { mood: "furnace, metal, steady", key: "D", mode: "minor", bpm: 58, chordBeats: 12, A: ["i", "VI", "iv", "V"], B: ["III", "VII", "VI", "V"], voicing: "wide",
      inst: { pad: ["strings", 0.34], bells: ["celesta", 0.3], harp: 0.2, bass: ["sub", 0.38] }, melody: { inst: ["bells"], density: 0.28 } },
    hoard: { mood: "hall of timbers, a lyre", key: "E", mode: "phrygian", bpm: 54, chordBeats: 14, A: ["i", "VI", "iv", "i"], B: ["i", "II", "vii", "i"], voicing: "open",
      inst: { pad: ["strings", 0.38], harp: 0.4, bells: ["box", 0.2], bass: ["sub", 0.3] }, melody: { inst: [["harp", 3], ["bells", 1]], density: 0.3 } },
    bluenote: { mood: "late club, brushes, walking bass", key: "C", mode: "dorian", bpm: 72, chordBeats: 8, A: ["i7", "IV7", "III", "VII"], B: ["ii7", "v7", "i7", "IV7"], voicing: "shell", comp: "sync", walk: true, swing: 0.3, ext: 0.1,
      inst: { pad: ["strings", 0.14], piano: 0.62, bass: ["upright", 0.5], drums: ["brush", 0.28] }, melody: { inst: ["piano"], density: 0.5 } },
    cabin: { mood: "calm sea, harp and strings", key: "G", mode: "major", bpm: 60, chordBeats: 12, A: ["I", "IV", "I", "V"], B: ["vi", "IV", "I", "V"], voicing: "open",
      inst: { pad: ["strings", 0.36], harp: 0.4, bells: ["box", 0.2], bass: ["upright", 0.24] }, melody: { inst: [["harp", 3], ["bells", 1]], density: 0.35 } },
    shipwreck: { mood: "deep water, slow and low", key: "Bb", mode: "lydian", bpm: 48, chordBeats: 12, A: ["I", "II", "I", "vi"], B: ["vi", "V", "II", "I"], voicing: "wide", ext: 0.1,
      inst: { pad: ["strings", 0.45], piano: 0.28, bells: ["box", 0.22], bass: ["sub", 0.4] }, melody: { inst: [["bells", 2], ["piano", 1]], density: 0.2, range: [66, 92] }, comp: "none" },
    prism: { mood: "glass and light", key: "F", mode: "lydian", bpm: 58, chordBeats: 12, A: ["I", "V", "II", "iii"], B: ["vi", "II", "I", "V"], voicing: "open",
      inst: { pad: ["glass", 0.5], bells: ["celesta", 0.36], harp: 0.3 }, melody: { inst: [["bells", 3], ["harp", 2]], density: 0.4 }, harpP: 0.85, harpStep: 0.5 },
    nightcity: { mood: "wet neon, mid-tempo", key: "C", mode: "dorian", bpm: 74, chordBeats: 8, A: ["i7", "IV7", "III", "VII"], B: ["ii7", "v7", "i7", "IV7"], voicing: "open", comp: "sync", swing: 0.16,
      inst: { pad: ["strings", 0.3], piano: 0.45, bells: ["celesta", 0.2], bass: ["upright", 0.4], drums: ["lofi", 0.28] }, melody: { inst: [["piano", 2], ["bells", 1]], density: 0.4 } },
    blacksite: { mood: "cold, sparse, a few pings", key: "E", mode: "minor", bpm: 50, chordBeats: 14, A: ["i", "i", "VI", "iv"], B: ["VII", "VI", "iv", "i"], voicing: "wide", ext: 0.05,
      inst: { pad: ["warm", 0.28], bells: ["celesta", 0.22], bass: ["sub", 0.28] }, melody: { inst: ["bells"], density: 0.14, range: [76, 96] } },
    crypt: { mood: "stone, choir in the dark", key: "E", mode: "phrygian", bpm: 46, chordBeats: 14, A: ["i", "II", "i", "VI"], B: ["i", "iv", "VI", "II"], voicing: "wide", ext: 0.05,
      inst: { pad: ["strings", 0.24], choir: 0.38, bells: ["box", 0.22], bass: ["sub", 0.3] }, melody: { inst: ["bells"], density: 0.18 }, choirP: 0.7 },
    observatory: { mood: "wonder, celesta", key: "G", mode: "lydian", melScale: "pent", bpm: 56, chordBeats: 12, A: ["I", "II", "I", "V"], B: ["vi", "II", "I", "V"], voicing: "open",
      inst: { pad: ["strings", 0.3], bells: ["celesta", 0.4], harp: 0.25 }, melody: { inst: [["bells", 3], ["harp", 1]], density: 0.35 } },
    alchemist: { mood: "candlelit, minor piano", key: "A", mode: "minor", bpm: 56, chordBeats: 12, A: ["i", "VI", "III", "VII"], B: ["iv", "i", "V", "i"], voicing: "close",
      inst: { pad: ["strings", 0.32], piano: 0.5, harp: 0.2, bass: ["upright", 0.2] }, melody: { inst: [["piano", 3], ["harp", 1]], density: 0.35 } },
    polar: { mood: "ice, high crystalline", key: "A", mode: "lydian", bpm: 48, chordBeats: 14, A: ["I", "II", "iii", "I"], B: ["vi", "V", "II", "I"], voicing: "open",
      inst: { pad: ["glass", 0.45], bells: ["celesta", 0.3], harp: 0.15, bass: ["sub", 0.18] }, melody: { inst: ["bells"], density: 0.2, range: [78, 100] }, harpP: 0.4 },
    imperial: { mood: "court, guzheng-like harp and a distant choir", key: "D", mode: "major", melScale: "pent", bpm: 54, chordBeats: 12, A: ["Isus2", "Vsus2", "vi", "IVadd9"], B: ["I", "IV", "Isus2", "V"], voicing: "open", ext: 0,
      inst: { pad: ["strings", 0.3], harp: 0.5, choir: 0.28, bells: ["box", 0.2] }, melody: { inst: [["harp", 3], ["bells", 1]], density: 0.4 }, choirP: 0.4, harpP: 0.9, harpStep: 0.5 },
    temple: { mood: "bowl, choir, garden rain", key: "G", mode: "major", melScale: "pent", bpm: 50, chordBeats: 14, A: ["Isus2", "IIsus4", "IVsus2", "Vsus4"], B: ["vi", "Isus2", "IV", "I"], voicing: "open", ext: 0,
      inst: { pad: ["glass", 0.26], choir: 0.3, harp: 0.28, bells: ["box", 0.36] }, melody: { inst: [["bells", 3], ["harp", 1]], density: 0.28 }, choirP: 0.55 },
    caravanserai: { mood: "desert evening, plucked", key: "D", mode: "dorian", bpm: 58, chordBeats: 12, A: ["i", "IV", "i", "VII"], B: ["III", "VII", "IV", "i"], voicing: "open",
      inst: { pad: ["strings", 0.3], harp: 0.45, bells: ["celesta", 0.18], bass: ["sub", 0.25] }, melody: { inst: [["harp", 4], ["bells", 1]], density: 0.4 }, harpStep: 0.5 },
    fireside: { mood: "warm hearth, piano and strings", key: "F", mode: "major", bpm: 60, chordBeats: 12, A: ["I", "vi", "IV", "V"], B: ["ii", "V", "I", "IV"], voicing: "open",
      inst: { pad: ["strings", 0.35], piano: 0.6, harp: 0.18, bass: ["upright", 0.3] }, melody: { inst: [["piano", 4], ["harp", 1]], density: 0.4 } },
    roman: { mood: "marble, lyre, dignified", key: "D", mode: "minor", bpm: 54, chordBeats: 14, A: ["i", "iv", "V", "i"], B: ["III", "VII", "iv", "V"], voicing: "wide",
      inst: { pad: ["strings", 0.4], harp: 0.4, bells: ["celesta", 0.2], bass: ["sub", 0.3] }, melody: { inst: [["harp", 3], ["bells", 1]], density: 0.3 } },
    privatebank: { mood: "dignified quiet piano", key: "C", mode: "major", bpm: 62, chordBeats: 12, A: ["Imaj7", "V", "IV", "V"], B: ["vi", "ii", "IV", "V"], voicing: "close", ext: 0.1,
      inst: { pad: ["strings", 0.24], piano: 0.6, harp: 0.1, bass: ["upright", 0.24] }, melody: { inst: ["piano"], density: 0.35 }, comp: "none" },
    coast: { mood: "open water, lydian", key: "G", mode: "lydian", bpm: 60, chordBeats: 12, A: ["I", "V", "II", "iii"], B: ["vi", "V", "II", "I"], voicing: "open",
      inst: { pad: ["strings", 0.3], piano: 0.5, harp: 0.3 }, melody: { inst: [["piano", 3], ["harp", 2]], density: 0.4 } },
    closing: { mood: "last pages, minor piano", key: "A", mode: "minor", bpm: 54, chordBeats: 12, A: ["i", "iv", "VI", "V"], B: ["III", "VII", "VI", "V"], voicing: "close",
      inst: { pad: ["strings", 0.3], piano: 0.52, harp: 0.12, bass: ["upright", 0.18] }, melody: { inst: ["piano"], density: 0.32 } },
    train: { mood: "night train, steady drift", key: "D", mode: "dorian", bpm: 60, chordBeats: 12, A: ["i7", "IV", "i7", "v7"], B: ["III", "VII", "IV", "i7"], voicing: "open",
      inst: { pad: ["strings", 0.42], bells: ["box", 0.24], bass: ["sub", 0.25], harp: 0.12 }, melody: { inst: ["bells"], density: 0.3 }, harpP: 0.3 },
    cafe: { mood: "corner cafe, brushes, piano", key: "F", mode: "major", bpm: 72, chordBeats: 8, A: ["I", "IV", "V", "IV"], B: ["vi", "ii7", "V7", "I"], voicing: "shell", comp: "sync", walk: true, swing: 0.2, ext: 0.12,
      inst: { pad: ["strings", 0.12], piano: 0.58, bass: ["upright", 0.36], drums: ["brush", 0.22] }, melody: { inst: ["piano"], density: 0.45 } }
  };
  /* Scene loudness trims: offline RMS of 70 s of each scene (two seeds) measured, then scaled to a common 0.058 (clamped 0.55-1.7). */
  const VOL = {rainy: 0.85, vault: 0.69, lofi: 0.86, garden: 1.7, "midnight-gallery": 0.78, conservator: 1.68, mint: 0.55, hoard: 0.68, bluenote: 0.74, cabin: 1.3, shipwreck: 0.55, prism: 1.18, nightcity: 0.89, blacksite: 0.76, crypt: 0.71, observatory: 1.7, alchemist: 1.5, polar: 0.9, imperial: 1.7, temple: 1.7, caravanserai: 0.81, fireside: 1.15, roman: 0.67, privatebank: 1.46, coast: 1.7, closing: 1.61, train: 0.77, cafe: 0.99};
  for (const k of Object.keys(SPECS)) if (SPECS[k]) { SPECS[k].id = k; if (VOL[k]) SPECS[k].vol = VOL[k]; }

  /* ---------- from a TitanGen mix to a spec ---------- */
  function legacySpec(mix) {
    if (!(mix.pad > 0 || mix.piano || mix.bells || mix.beat)) return null;
    const mode = mix.mode || "major", pentLike = !!MELS[mode], hm = mode === "minpent" ? "minor" : pentLike ? "major" : mode;
    const prog = (mix.prog && mix.prog.length ? mix.prog : [0]).map((d) => chordFromDegree(mode, d));
    const bpm = mix.bpm || 70, beat = 60 / bpm, cb = mix.beat ? 8 : Math.max(4, Math.round((mix.chordSec || 14) / beat));
    return { id: "custom", key: mix.root || "C", mode: hm, melScale: pentLike ? mode : undefined, bpm, chordBeats: cb, A: prog, voicing: "open", ext: 0, mod: false,
      inst: { pad: mix.pad > 0 ? ["warm", mix.pad] : null, piano: mix.piano ? 0.55 : 0, bells: mix.bells ? ["box", 0.3] : null, bass: mix.beat ? ["upright", 0.4] : null, drums: mix.beat ? ["lofi", 0.3] : null },
      melody: (mix.piano || mix.bells) ? { inst: [mix.piano ? "piano" : null, mix.bells ? "bells" : null].filter(Boolean), density: 0.4 } : null };
  }
  function forMix(mix, name) {
    mix = mix || {};
    const G = window.TitanGen, SC = G && G.SCENES;
    let id = mix.scene && SC && SC[mix.scene] ? mix.scene : null;
    if (!id && SC && name) for (const k of Object.keys(SC)) if (SC[k].name === name) { id = k; break; }
    if (id && SC[id]) {
      const s = SC[id];
      if ((s.pad > 0) === (mix.pad > 0) && !!s.piano === !!mix.piano && !!s.bells === !!mix.bells && !!s.beat === !!mix.beat && (id in SPECS)) return { id, spec: SPECS[id] };
    }
    return { id: null, spec: legacySpec(mix) };
  }

  /* ================= public API ================= */
  function resolveBus(opts) {
    const o = Object.assign({}, opts || {});
    if (!o.ctx || !o.input) {
      const G = window.TitanGen; let mb = null;
      try { mb = G && G.musicBus ? G.musicBus() : null; } catch (e) { mb = null; }
      if (mb) { o.ctx = o.ctx || mb.ctx; o.input = o.input || mb.input; }
    }
    if (!o.ctx) throw new Error("TitanMusic.start needs { ctx }");
    return o;
  }
  const ACTIVE = () => Array.from(SESS).filter((s) => !s.stopped);
  const API = {
    supported: !!(window.AudioContext || window.webkitAudioContext),
    SPECS, MODES, LOOKAHEAD, CAP,
    forMix,
    start(spec, opts) {
      if (typeof spec === "string") spec = SPECS[spec];
      if (!spec) return null;
      const o = resolveBus(opts);
      if (o.exclusive !== false) for (const s of ACTIVE()) s.stop(o.stopFade == null ? 2.5 : o.stopFade);
      const S = mkSession(spec, Object.assign({ id: spec.id }, o));
      S.tempo = globalTempo; SESS.add(S);
      const fi = o.fadeIn == null ? (o.exclusive === false ? 0.05 : 2.5) : o.fadeIn;
      if (fi > 0.06) { S.out.gain.setValueAtTime(0, o.ctx.currentTime); S.out.gain.linearRampToValueAtTime(S.level * globalLevel * (spec.vol == null ? 1 : spec.vol) * TRIM, o.ctx.currentTime + fi); }
      else S.out.gain.value = S.level * globalLevel * (spec.vol == null ? 1 : spec.vol) * TRIM;
      if (!S.manual) { startTimer(); try { S.step(o.ctx.currentTime, o.ctx.currentTime + LOOKAHEAD); } catch (e) { S.err = e; } }
      return S;
    },
    stop(fade) { for (const s of Array.from(SESS)) s.stop(fade); },
    setLevel(x) { globalLevel = clamp(x, 0, 2); for (const s of SESS) s.applyGain(0.15); },
    setTempoScale(x) { globalTempo = clamp(x, 0.5, 2); for (const s of SESS) s.setTempoScale(globalTempo); },
    stats() { const a = Array.from(SESS).map((s) => s.stats()); return { sessions: a.length, voices: a.reduce((n, s) => n + s.voices, 0), list: a }; },
    sessions: () => Array.from(SESS),
    /* test hooks */
    debug: { parseChord, voiceLead, VSTYLE, ksRender, rngOf, mkSession, noteNames: NOTE },
    /* Plan `seconds` of music on an OfflineAudioContext without rendering and report the voice count over time. */
    simulate(spec, seconds, o) {
      o = o || {}; if (typeof spec === "string") spec = SPECS[spec]; if (!spec) return null;
      const ctx = o.ctx || new OfflineAudioContext(2, Math.floor(44100 * (o.render ? seconds : 1)), 44100);
      const S = mkSession(spec, { ctx, input: ctx.destination, manual: true, rec: true, seed: o.seed });
      S.out.gain.value = 1; S.tempo = o.tempo || 1;
      for (let t = 0; t < seconds; t += 0.25) S.step(t, t + LOOKAHEAD);
      const ev = []; for (const [a, b] of S.iv) { ev.push([a, 1]); ev.push([b, -1]); }
      ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]); let cur = 0, peak = 0; for (const e of ev) { cur += e[1]; if (cur > peak) peak = cur; }
      const out = { peakVoices: peak, sources: S.iv.length, chords: S.chordsPlayed, mods: S.mods, melNotes: S.notesMel, cycles: S.cycles, log: S.log, session: S, ctx, err: S.err ? String(S.err) : null };
      return out;
    }
  };
  window.TitanMusic = API;
})();
