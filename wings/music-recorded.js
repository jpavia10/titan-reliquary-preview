/* Titan Reliquary · recorded music (owner 2026-10-08: "make the music better, at minimum the classical music").
   Real public-domain / CC recordings from audio/music/ (fetched and checked by tools/music/fetch_classical.py; credits in
   audio/music/CREDITS.md). A scene with a `rec` mood (wings/scene-engine.js SCENES: "piano" or "orchestra") plays them in place of the
   generated music; the engine falls back to the generated music when a recording cannot load (offline before first play, a network error).
   Streaming through an <audio> element (MediaElementSource), never decoded whole: a 5-minute piece would be ~100 MB of samples on a phone.
   Loaded before wings/scene-engine.js uses it; reads audio/music/manifest.json once.
   API: TitanRecMusic.has(mood), .start(group, mood, {ctx, input, fallback}) -> true, .now() -> the current track or null, .load() */
(() => {
  "use strict";
  if (window.TitanRecMusic) return;
  const BASE = "audio/music/";
  let man = null, loading = null, current = null;
  const recent = [];

  function load() {
    if (man) return Promise.resolve(man);
    if (!loading) loading = fetch(BASE + "manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => (man = m && Array.isArray(m.tracks) ? m : { tracks: [] }))
      .catch(() => { loading = null; return null; });
    return loading;
  }
  const byMood = (mood) => (man ? man.tracks.filter((t) => (t.moods || []).indexOf(mood) >= 0) : []);
  function has(mood) { if (!man) load(); return byMood(mood).length > 0; }
  function pick(mood) {
    const all = byMood(mood); if (!all.length) return null;
    const fresh = all.filter((t) => recent.indexOf(t.id) < 0), pool = fresh.length ? fresh : all;
    const t = pool[Math.floor(Math.random() * pool.length)];
    recent.push(t.id); while (recent.length > Math.max(0, Math.min(8, all.length - 1))) recent.shift();
    return t;
  }
  function announce(t) { try { window.dispatchEvent(new CustomEvent("titan:music", { detail: t ? { title: t.title, composer: t.composer, performer: t.performer, license: t.license, source: t.source } : null })); } catch (e) { /* ignore */ } }

  function start(g, mood, o) {
    const ctx = o.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(o.input);
    let el = null, src = null, stopped = false, gapT = 0, fails = 0, played = 0;
    const drop = () => {
      if (el) { live.delete(el); try { el.pause(); el.removeAttribute("src"); el.load(); } catch (e) { /* ignore */ } }
      if (src) { try { src.disconnect(); } catch (e) { /* ignore */ } }
      el = null; src = null;
    };
    function next() {
      if (stopped || g.dead) return;
      const t = pick(mood);
      if (!t) { stop(); if (o.fallback) o.fallback(); return; }
      drop();
      el = new Audio(); el.preload = "auto"; el.src = BASE + t.file; live.add(el);
      try { src = ctx.createMediaElementSource(el); src.connect(out); } catch (e) { fail(); return; }
      const me = el;
      el.addEventListener("playing", () => {
        if (me !== el) return;
        fails = 0; played++; current = t; announce(t);
        const now = ctx.currentTime; out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(out.gain.value, now); out.gain.linearRampToValueAtTime(1, now + 2.5);
      }, { once: true });
      el.addEventListener("ended", () => { if (me !== el) return; current = null; announce(null); gapT = setTimeout(next, 3000 + Math.random() * 5000); });
      el.addEventListener("error", () => { if (me === el) fail(); });
      const pr = el.play(); if (pr && pr.catch) pr.catch(() => { /* a paused context or no gesture yet: 'playing' fires when it can */ });
    }
    function fail() {
      fails++;
      if (played === 0 && fails >= 2) { stop(); if (o.fallback) o.fallback(); return; }   // nothing ever played (offline): generated music instead
      if (fails < 4) gapT = setTimeout(next, 800); else stop();
    }
    function stop() {
      if (stopped) return; stopped = true; clearTimeout(gapT);
      drop(); try { out.disconnect(); } catch (e) { /* ignore */ }
      if (current) { current = null; announce(null); }
    }
    g.rel.push(stop);                                    // the scene's group ends (another scene, Off): the music ends with it
    next();
    return true;
  }

  // pause / resume with the engine (TitanGen pause suspends the context; the element must stop too, or it runs on silently)
  const live = new Set();
  window.addEventListener("titan:gen", (e) => {
    const d = e.detail || {};
    if (d.type === "pause") live.forEach((el) => { try { el.pause(); } catch (err) { /* ignore */ } });
    else if (d.type === "play") live.forEach((el) => { if (el.paused && !el.ended) { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); } });
  });
  window.TitanRecMusic = { has, start, load, now: () => current };
  if (document.readyState === "complete") setTimeout(load, 1500); else window.addEventListener("load", () => setTimeout(load, 1500), { once: true });
})();
