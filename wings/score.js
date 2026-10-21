/* Titan Reliquary · per-theme music (TitanScore). Owner: music worker (see collaborators/SHARED_LOG.md).
   Owner rule (2026-10-20): the SONG is always real recorded human music, licensed (credits: audio/score/CREDITS.md); the computer
   only does the effects around it (stinger, UI sounds, filters, crossfades, ducking).
   audio/score/<id>/manifest.json lists the theme's tracks and two decks: "browse" (a playlist) and "coin" (plays while a coin page is
   open). Adaptive states, all smooth crossfades / filter moves on the audio clock:
     browse · coin (deck swap; the browse song pauses and resumes where it was) · search (song filtered and lowered, ~8 s) · idle (75 s
     without input: darker and quieter).
   Songs stream through <audio> elements (MediaElementSource), never decoded whole. A scene (wings/scene-engine.js SCENES[x].score)
   starts the score into its own music gain, so mute, volume, the scene crossfade, background pause and TitanGen.duck() all apply.
   The first time a theme's score starts on a page, its intro stinger (designed sound) plays and the song enters on its hit.
   API: TitanScore.has(id) · .start(g, id, {ctx, input}) -> bool · .state(name) · .ui(kind, ctx, out, vol) -> bool · .stinger(id) · .now() */
(() => {
  "use strict";
  if (window.TitanScore) return;
  const BASE = "audio/score/", man = {}, loading = {}, bufs = new Map(), stung = {};
  const KNOWN = ["neon", "y2k", "freefall", "arcade", "ferro"];
  const UI_MAP = { flip: "tap", "coin-open": "coin", "coin-close": "back", wing: "open", search: "search", "simple-open": "open", "simple-close": "back" };
  let live = null, stateName = "browse", searchT = 0, idleT = 0, coinOpen = false, paused = false;

  function load(id) {
    if (man[id]) return Promise.resolve(man[id]);
    if (!loading[id]) loading[id] = fetch(BASE + id + "/manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => (man[id] = m)).catch(() => { loading[id] = null; return null; });
    return loading[id];
  }
  const has = (id) => !!id && KNOWN.indexOf(id) >= 0;
  function buf(ctx, url) {
    if (bufs.has(url)) return bufs.get(url);
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); }));
    p.catch(() => bufs.delete(url)); bufs.set(url, p); return p;
  }
  function announce(t) { try { window.dispatchEvent(new CustomEvent("titan:music", { detail: t ? { title: t.title, composer: t.artist, performer: t.artist, license: t.license, source: t.url } : null })); } catch (e) { /* ignore */ } }

  function deck(S, name) {
    const ctx = S.ctx, gain = ctx.createGain(); gain.gain.value = 0; gain.connect(S.filter);
    const D = { name, gain, list: S.m.decks[name] || [], i: 0, el: null, src: null, track: null };
    D.i = Math.floor(Math.random() * D.list.length);
    D.next = () => {
      if (S.dead || !D.list.length) return;
      const id = D.list[D.i % D.list.length]; D.i++; const t = S.m.tracks[id];
      if (D.el) { try { D.el.pause(); D.el.removeAttribute("src"); D.el.load(); } catch (e) { /* ignore */ } }
      if (D.src) { try { D.src.disconnect(); } catch (e) { /* ignore */ } }
      const el = new Audio(); el.preload = "auto"; el.src = BASE + S.id + "/" + t.file; D.el = el; D.track = t;
      try { D.src = ctx.createMediaElementSource(el); D.src.connect(gain); } catch (e) { return; }
      el.addEventListener("ended", () => { if (D.el === el) setTimeout(D.next, 1500); });
      el.addEventListener("playing", () => { if (D.el === el && S.active === D) announce(t); });
      if (S.active === D && !paused) D.play();
    };
    D.play = () => { if (!D.el) return D.next(); if (D.el.paused && !paused) { const p = D.el.play(); if (p && p.catch) p.catch(() => {}); } };
    D.pause = () => { if (D.el && !D.el.paused) try { D.el.pause(); } catch (e) { /* ignore */ } };
    return D;
  }

  function start(g, id, o) {
    if (!has(id)) return false;
    const ctx = o.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(o.input);
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 20000; filter.Q.value = 0.5; filter.connect(out);
    const S = { id, ctx, out, filter, dead: false, decks: {}, active: null, enterAt: 0 };
    load(id).then((m) => {
      if (!m || S.dead) return;
      S.m = m; Object.keys(m.decks).forEach((n) => { S.decks[n] = deck(S, n); });
      let delay = 0.05;
      if (m.stinger && !stung[id]) {
        stung[id] = 1;
        buf(ctx, BASE + id + "/" + m.stinger.file).then((b) => {
          if (S.dead) return; const s = ctx.createBufferSource(); s.buffer = b; s.connect(o.input); s.start(ctx.currentTime + 0.05);
        }).catch(() => {});
        delay = (m.stinger.hit || 0) + 0.05;
      }
      live = S;
      setTimeout(() => { if (S.dead) return; out.gain.setTargetAtTime(1, ctx.currentTime, 0.6); apply(0.05); }, delay * 1000);
    }).catch(() => {});
    g.rel.push(() => {
      if (S.dead) return; S.dead = true;
      Object.values(S.decks).forEach((D) => { D.pause(); if (D.el) { try { D.el.removeAttribute("src"); D.el.load(); } catch (e) { /* ignore */ } } });
      try { out.disconnect(); } catch (e) { /* ignore */ }
      if (live === S) { live = null; announce(null); }
    });
    return true;
  }

  function apply(tau) {
    const S = live; if (!S || !S.m) return;
    const st = S.m.states[stateName] || S.m.states.browse, t = S.ctx.currentTime, k = tau == null ? 0.6 : tau;
    const want = S.decks[st.deck] || S.decks.browse;
    S.filter.frequency.setTargetAtTime(st.lp || 20000, t, k);
    if (S.active !== want) {
      const old = S.active; S.active = want;
      if (old) { old.gain.gain.setTargetAtTime(0, t, 0.5); setTimeout(() => { if (S.active !== old) old.pause(); }, 2500); }
      want.play(); if (want.track) announce(want.track);
    }
    want.gain.gain.setTargetAtTime(st.gain == null ? 1 : st.gain, t, old0(k));
  }
  const old0 = (k) => Math.max(k, 0.4);
  function setState(n) { if (n !== stateName) { stateName = n; apply(); } }
  function recompute() { setState(coinOpen ? "coin" : (searchT ? "search" : "browse")); }
  function poke() { clearTimeout(idleT); if (stateName === "idle") recompute(); idleT = setTimeout(() => { if (!coinOpen) setState("idle"); }, 75000); }
  function searching() { clearTimeout(searchT); searchT = setTimeout(() => { searchT = 0; recompute(); }, 8000); }
  window.addEventListener("titan:ui", (e) => {
    const k = (e.detail || {}).kind;
    if (k === "coin-open") coinOpen = true; else if (k === "coin-close") coinOpen = false; else if (k === "search") searching();
    poke(); recompute();
  });
  ["pointerdown", "keydown", "wheel"].forEach((ev) => window.addEventListener(ev, poke, { passive: true, capture: true }));
  document.addEventListener("input", (e) => { const t = e.target; if (t && (t.type === "search" || /search/i.test((t.id || "") + (t.name || "") + (t.className || "")))) { searching(); recompute(); } }, true);
  window.addEventListener("titan:gen", (e) => {              // the scene engine's pause / resume (background, Off): songs follow
    const d = e.detail || {};
    if (d.type === "pause") { paused = true; if (live) Object.values(live.decks).forEach((D) => D.pause()); }
    else if (d.type === "play") { paused = false; if (live && live.active) live.active.play(); }
  });
  poke();

  function playBuf(ctx, out, url, vol) {
    return buf(ctx, url).then((b) => { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(out); s.start(); s.onended = () => { try { g.disconnect(); } catch (e) { /* ignore */ } }; });
  }
  function ui(kind, ctx, out, vol) {
    const S = live, name = UI_MAP[kind] || kind;
    if (!S || !S.m || S.ctx !== ctx || !S.m.ui || !S.m.ui[name]) return false;
    playBuf(ctx, out, BASE + S.id + "/" + S.m.ui[name], (vol == null ? 1 : vol) * 0.9).catch(() => {});
    return true;
  }
  function stinger(id) {
    const gb = window.TitanGen && window.TitanGen.uiBus && window.TitanGen.uiBus(); if (!gb || !has(id)) return false;
    stung[id] = 1; load(id).then((m) => m && m.stinger && playBuf(gb.ctx, gb.input, BASE + id + "/" + m.stinger.file, 0.9)).catch(() => {});
    return true;
  }
  window.TitanScore = { has, start, ui, stinger, load, state: (n) => (n ? setState(n) : stateName), live: () => (live ? live.id : null), now: () => (live && live.active ? live.active.track : null) };
})();
