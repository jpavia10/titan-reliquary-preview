/* Titan Reliquary · per-theme adaptive scores (TitanScore). Owner: music worker (see collaborators/SHARED_LOG.md).
   Each theme with a score has audio/score/<id>/manifest.json: four stems of identical length (bed, drive, lead, shimmer) that loop
   seamlessly, an intro stinger and a signature UI set (tap, open, back, search, coin). All audio is original and rendered offline by
   tools/music/score/<id>.py (credits: audio/score/CREDITS.md).
   Adaptive: the stems run sample-locked; their levels follow the app state with smooth crossfades:
     browse (default) · coin (a coin page is open) · search (typing in search, ~8 s) · idle (no input for 75 s).
   Routing: a scene (wings/scene-engine.js SCENES[x].score) starts the score into its own music gain, so mute, volume, the scene
   crossfade and TitanGen.duck() all apply unchanged; the soundscape engine (audio/scape/) stays underneath.
   The shimmer stem goes through an HRTF panner that slowly orbits the listener.
   API: TitanScore.has(id) · .start(g, id, {ctx, input}) -> bool · .state(name) · .ui(kind, ctx, out, vol) -> bool · .stinger(id, ctx, out) */
(() => {
  "use strict";
  if (window.TitanScore) return;
  const BASE = "audio/score/", man = {}, loading = {}, bufs = new Map();
  const UI_MAP = { flip: "tap", "coin-open": "coin", "coin-close": "back", wing: "open", search: "search", "simple-open": "open", "simple-close": "back" };
  const stung = {}, stingBuf = {};
  let live = null, stateName = "browse", searchT = 0, idleT = 0;

  function load(id) {
    if (man[id]) return Promise.resolve(man[id]);
    if (!loading[id]) loading[id] = fetch(BASE + id + "/manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => (man[id] = m)).catch(() => { loading[id] = null; return null; });
    return loading[id];
  }
  const KNOWN = ["neon"];                                   // scores that exist; manifests are fetched lazily
  function has(id) { return !!id && KNOWN.indexOf(id) >= 0; }
  function buf(ctx, url) {
    const k = url; if (bufs.has(k)) return bufs.get(k);
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); }));
    p.catch(() => bufs.delete(k)); bufs.set(k, p); return p;
  }

  function start(g, id, o) {
    if (!has(id)) return false;
    const ctx = o.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(o.input);
    const S = { id, ctx, out, gains: {}, srcs: [], dead: false, panner: null, orbit: 0 };
    load(id).then((m) => {
      if (!m || S.dead) return;
      const names = Object.keys(m.stems);
      if (m.stinger) buf(ctx, BASE + id + "/" + m.stinger.file).then((b) => { stingBuf[id] = b; }).catch(() => {});
      return Promise.all(names.map((n) => buf(ctx, BASE + id + "/" + m.stems[n].file))).then((bs) => {
        if (S.dead) return;
        // first entry into this theme on this page: the intro stinger plays and the stems come in on its hit
        let t0 = ctx.currentTime + 0.12;
        if (m.stinger && !stung[id]) { stung[id] = 1; const sb = stingBuf[id]; if (sb) { const s = ctx.createBufferSource(); s.buffer = sb; s.connect(o.input); s.start(t0); t0 += m.stinger.hit || 0; } }
        names.forEach((n, i) => {
          const b = bs[i], meta = m.stems[n];
          const prime = Math.max(0, Math.min(0.1, b.duration - meta.total));   // decoder priming (AAC) shifts every sample later
          const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
          src.loopStart = meta.pad + prime; src.loopEnd = meta.pad + prime + meta.len;
          const gn = ctx.createGain(); gn.gain.value = (m.states[stateName] || m.states.browse)[n] || 0;
          src.connect(gn);
          if (n === "shimmer" && ctx.createPanner) {
            const p = ctx.createPanner(); p.panningModel = "HRTF"; p.distanceModel = "inverse"; p.refDistance = 1.5;
            gn.connect(p); p.connect(out); S.panner = p;
          } else gn.connect(out);
          src.start(t0, src.loopStart); S.srcs.push(src); S.gains[n] = gn;
        });
        out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(1, t0 + 3);
        S.m = m; live = S; apply(0.05);
        S.orbit = setInterval(() => {
          if (!S.panner) return; const a = ctx.currentTime * 0.12, p = S.panner;
          const x = Math.sin(a) * 2.2, z = -Math.cos(a) * 2.2, y = 0.4 * Math.sin(a * 0.7);
          if (p.positionX) { p.positionX.setTargetAtTime(x, ctx.currentTime, 0.3); p.positionY.setTargetAtTime(y, ctx.currentTime, 0.3); p.positionZ.setTargetAtTime(z, ctx.currentTime, 0.3); }
          else p.setPosition(x, y, z);
        }, 250);
      });
    }).catch(() => { /* a score that cannot load leaves the scene's own music path silent only for this group */ });
    const stop = () => {
      if (S.dead) return; S.dead = true; clearInterval(S.orbit);
      S.srcs.forEach((s) => { try { s.stop(); } catch (e) { /* ignore */ } });
      try { out.disconnect(); } catch (e) { /* ignore */ }
      if (live === S) live = null;
    };
    g.rel.push(stop);
    return true;
  }

  function apply(tau) {
    const S = live; if (!S || !S.m) return;
    const lv = S.m.states[stateName] || S.m.states.browse, t = S.ctx.currentTime;
    Object.keys(S.gains).forEach((n) => S.gains[n].gain.setTargetAtTime(lv[n] || 0, t, tau == null ? 0.8 : tau));
  }
  let coinOpen = false;
  function setState(name) { if (name !== stateName) { stateName = name; apply(); } }
  function recompute() { setState(coinOpen ? "coin" : (searchT ? "search" : "browse")); }
  function poke() {
    clearTimeout(idleT); if (stateName === "idle") recompute();
    idleT = setTimeout(() => { if (!coinOpen) setState("idle"); }, 75000);
  }
  window.addEventListener("titan:ui", (e) => {
    const k = (e.detail || {}).kind;
    if (k === "coin-open") coinOpen = true; else if (k === "coin-close") coinOpen = false;
    else if (k === "search") { clearTimeout(searchT); searchT = setTimeout(() => { searchT = 0; recompute(); }, 8000); }
    poke(); recompute();
  });
  ["pointerdown", "keydown", "wheel"].forEach((ev) => window.addEventListener(ev, poke, { passive: true, capture: true }));
  document.addEventListener("input", (e) => {
    const t = e.target; if (t && (t.type === "search" || /search/i.test((t.id || "") + (t.name || "") + (t.className || "")))) {
      clearTimeout(searchT); searchT = setTimeout(() => { searchT = 0; recompute(); }, 8000); recompute();
    }
  }, true);
  poke();

  function playBuf(ctx, out, url, vol, when) {
    return buf(ctx, url).then((b) => { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(out); s.start(when || 0); s.onended = () => { try { g.disconnect(); } catch (e) { /* ignore */ } }; });
  }
  /* the theme's signature UI sound: only while that theme's score is live on the same context (ui-sounds falls back to its synth) */
  function ui(kind, ctx, out, vol) {
    const S = live, name = UI_MAP[kind] || kind;
    if (!S || !S.m || S.ctx !== ctx || !S.m.ui[name]) return false;
    playBuf(ctx, out, BASE + S.id + "/" + S.m.ui[name], (vol == null ? 1 : vol) * 0.9).catch(() => {});
    return true;
  }
  /* intro stinger: the intro worker can call TitanScore.stinger(id) at its title moment (manifest.stinger.hit = seconds to the hit) */
  function stinger(id, ctx, out) {
    const gb = window.TitanGen && window.TitanGen.uiBus && window.TitanGen.uiBus();
    ctx = ctx || (gb && gb.ctx); out = out || (gb && gb.input); if (!ctx || !out || !has(id)) return false;
    load(id).then((m) => m && m.stinger && playBuf(ctx, out, BASE + id + "/" + m.stinger.file, 0.9)).catch(() => {});
    return true;
  }
  window.TitanScore = { has, start, ui, stinger, load, state: (n) => (n ? setState(n) : stateName), live: () => (live ? live.id : null) };
})();
