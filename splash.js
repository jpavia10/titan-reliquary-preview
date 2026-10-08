/* Titan Reliquary · splash.js — "Vault Door" (splash v3)
   A cinematic ~6.5 s real-time opening, one per session, rendered with the vendored three.js r128:
     0.0  darkness, one tungsten spot strikes and rakes across a massive blackened-steel door
     1.3  the spoked wheel turns, twelve polished bolts retract in sequence, a last heavy clunk
     2.8  the door swings open, light spills out into the room (volumetric shaft + dust)
     3.6  the camera pushes through the tunnel into a studio chamber, focus pulls to ONE silver coin from the collection
     5.0  the coin turns under product light; country / year / denomination appear as small type
     5.6  hand-off: the coin dissolves in light and the app is revealed underneath (canvas alpha), never a hard cut
   Techniques: MeshPhysicalMaterial (clearcoat), procedural RoomEnvironment-style IBL via PMREMGenerator (no bitmaps),
   a coin whose relief is a runtime-drawn height map turned into normal + roughness maps (owl obverse, laurel reverse,
   reeded edge), PCF-soft shadows, cone-shader light shafts with animated streaks, GPU dust motes, MSAA HDR target,
   dual-filter bloom, depth-of-field focus pull, ACES, grain, vignette. Optional WebAudio sound (off by default).
   Tiers 0-4 (?splashq=N forces one); the tier is chosen from the frame time of the first ~500 ms (still black).
   Replay: TitanSplash.replay() or ?splash=1.  Skip: ?nosplash, or tap / click / any key.  See notes/agents/splash-v3.md */
(function () {
  "use strict";
  var html = document.documentElement;
  var root = document.getElementById("tr-splash");
  if (!root || !html.classList.contains("ts-on")) return;
  window.__tsReady = true;

  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s) { return root.querySelector(s); };
  var app = document.getElementById("app");
  var state = "intro";            // intro -> handoff -> done
  var tStart = performance.now();
  var gl = null;                  // set while the 3D scene is running
  var timers = [];
  var TOTAL = 6.5;                // seconds of timeline
  var CAP_MS = 7400;              // wall-clock cap from script start: never hold the visitor longer
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut3(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeInOutSine(x) { x = clamp(x, 0, 1); return -(Math.cos(Math.PI * x) - 1) / 2; }
  function easeOutBack(x, s) { x = clamp(x, 0, 1); s = s || 1.4; var c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); }

  /* ---------- featured coin: one real SILVER flip from the collection ---------- */
  // Silver flips are the ones the ledger counts as silver (metals.inventory.ag.junk_flips.pieces). Fallback list if data is late.
  var FALLBACK = [
    { country: "United States", year: "1957", denom: "Roosevelt 10¢", scan: "C088" },
    { country: "Netherlands", year: "1967", denom: "1 Gulden", scan: "C223" },
    { country: "Mexico", year: "1950", denom: "25 Centavos", scan: "C263" },
    { country: "Guatemala", year: "1934", denom: "10 Centavos", scan: "C235" },
    { country: "Australia", year: "1943", denom: "Threepence", scan: "C031" }
  ];
  var featured = null, featWait = [];
  function titleCase(s) { return s.replace(/\b([a-z])([a-z]*)/g, function (m, a, b) { return a.toUpperCase() + b; }); }
  function fromFlip(f) {
    var country = String(f.country).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    var denom = f.label ? String(f.label).split(" · ").slice(2).join(" · ") : "";
    if (!denom || /^\d{4}/.test(denom)) denom = titleCase(String(f.denom));
    var ph = f.photos && f.photos.obv ? String(f.photos.obv) : (f.photo_obv ? String(f.photo_obv) : "");   // hook: once Phase 2 photos exist, the real obverse becomes the coin face
    return { country: country, year: String(f.year), denom: denom, scan: f.scan || "", photo: ph };
  }
  function pickFeatured(v) {
    if (featured) return true;
    if (!v || !v.flips || !v.flips.length) return false;
    var pieces = null;
    try { pieces = v.metals.inventory.ag.junk_flips.pieces; } catch (e) {}
    var list = v.flips.filter(function (f) { return f && f.country && f.year && f.denom && pieces && pieces[f.scan]; });
    var withPhoto = v.flips.filter(function (f) { return f && f.country && f.year && f.denom && f.photos && f.photos.obv; });
    if (withPhoto.length) list = withPhoto;
    if (!list.length) return false;
    var last = null; try { last = localStorage.getItem("tr_splash_feat_v3"); } catch (e) {}
    var f, tries = 0;
    do { f = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && f.scan === last && ++tries < 10);
    try { localStorage.setItem("tr_splash_feat_v3", f.scan || ""); } catch (e) {}
    featured = fromFlip(f);
    return true;
  }
  function useFallback() {
    if (featured) return;
    featured = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
  }
  function whenFeatured(cb) { if (featured) cb(); else featWait.push(cb); }
  function gotFeatured() { var w = featWait; featWait = []; w.forEach(function (cb) { try { cb(); } catch (e) {} }); }
  if (pickFeatured(window.vault)) gotFeatured();
  else {
    var poll = setInterval(function () { if (pickFeatured(window.vault)) { clearInterval(poll); gotFeatured(); } }, 80);
    later(function () { clearInterval(poll); useFallback(); gotFeatured(); }, 900);
  }
  function showFeatureText() {
    var c = $(".ts-f-country"), m = $(".ts-f-meta");
    if (!featured || !c) return;
    c.textContent = featured.country; m.textContent = featured.year + "  ·  " + featured.denom;
    var kk = $(".ts-f-kicker"); if (kk) kk.textContent = "From the collection";
  }

  /* ---------- sound: synthesized, ON by default (owner, 2026-10-01); the sound button turns it off and that choice is remembered.
     Browsers allow sound before a tap only for installed apps / engaged sites; if blocked, the first tap turns sound on instead of skipping. */
  var Sfx = (function () {
    var KEY = "tr_splash_sound_v2", on = true, ctx = null, out = null, noise = null, verb = null, room = null;
    try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
    function ensure() {
      if (!on) return null;
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
          ctx = new AC();
          var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5;
          out = ctx.createGain(); out.gain.value = 0.9; out.connect(comp); comp.connect(ctx.destination);
          var len = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          noise = buf;
          // a synthesized stone-and-steel room: decaying noise impulse, darkened over time
          var rl = Math.floor(ctx.sampleRate * 2.4), rb = ctx.createBuffer(2, rl, ctx.sampleRate);
          for (var ch = 0; ch < 2; ch++) { var rd = rb.getChannelData(ch), lp = 0; for (var k = 0; k < rl; k++) { var e = Math.pow(1 - k / rl, 2.6); lp += (((Math.random() * 2 - 1) * e) - lp) * (0.55 - 0.45 * k / rl); rd[k] = lp * 1.6; } }
          verb = ctx.createConvolver(); verb.buffer = rb;
          room = ctx.createGain(); room.gain.value = 0.55; verb.connect(room); room.connect(out);
        }
        if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      } catch (e) { ctx = null; return null; }
      return ctx;
    }
    function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
    function wet(g, amt) { var s = ctx.createGain(); s.gain.value = amt; g.connect(s); s.connect(verb); }
    function tone(type, f, t, peak, dec, f2, att, rv) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec);
      env(g, t, att || 0.004, peak, dec); o.connect(g); g.connect(out); if (rv) wet(g, rv); o.start(t); o.stop(t + (att || 0.004) + dec + 0.05);
    }
    function burst(t, peak, dec, ftype, freq, q, f2, att, rv) {
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
      if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dec);
      env(g, t, att || 0.003, peak, dec); s.connect(f); f.connect(g); g.connect(out); if (rv) wet(g, rv); s.start(t, Math.random() * 0.4); s.stop(t + (att || 0.003) + dec + 0.1);
    }
    var hum = null;
    var api = {
      isOn: function () { return on; },
      set: function (v) {
        on = !!v; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
        if (on) ensure(); else api.stop(0.2);
      },
      gesture: function () { if (on) ensure(); },
      blocked: function () { return !!(on && (!ctx || ctx.state !== "running")); },
      strike: function () {                         // the tungsten lamp warms up: relay tick, transformer hum
        if (!ctx) return; var t = ctx.currentTime + 0.01;
        burst(t, 0.3, 0.05, "bandpass", 3200, 5, 0, 0.002, 0.2); tone("sine", 95, t, 0.4, 0.3, 48);
        if (!hum) {
          var g = ctx.createGain(), lp = ctx.createBiquadFilter(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
          g.gain.setValueAtTime(0.0001, t + 0.1); g.gain.exponentialRampToValueAtTime(0.05, t + 1.4);
          lp.type = "lowpass"; lp.frequency.value = 260; o1.type = "sawtooth"; o1.frequency.value = 50; o2.type = "sine"; o2.frequency.value = 100;
          o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o1.start(t); o2.start(t); hum = { g: g, o: [o1, o2] };
        }
      },
      tick: function (i) {                          // wheel ratchet
        if (!ctx) return; var t = ctx.currentTime + 0.005;
        burst(t, 0.12, 0.025, "bandpass", 2400 + (i % 3) * 300, 6); tone("square", 520, t, 0.025, 0.02, 300);
      },
      bolt: function (i) {                          // one bolt sliding home
        if (!ctx) return; var t = ctx.currentTime + 0.005;
        burst(t, 0.4, 0.05, "bandpass", 1900 - (i % 4) * 160, 3.2);
        tone("sine", 140 - (i % 4) * 8, t, 0.55, 0.16, 62);
        burst(t + 0.02, 0.18, 0.22, "lowpass", 700, 0.8, 0, 0.003, 0.3);
      },
      clunk: function () {                          // the last, heavy release
        if (!ctx) return; var t = ctx.currentTime + 0.01;
        tone("sine", 70, t, 1.0, 1.1, 27, 0.003, 0.5); burst(t, 0.6, 0.9, "lowpass", 300, 0.8, 90, 0.003, 0.6);
        burst(t, 0.3, 0.06, "bandpass", 1100, 2);
      },
      groan: function () {                          // the door's weight
        if (!ctx) return; var t = ctx.currentTime + 0.02, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = "sawtooth"; o2.type = "square"; o.frequency.setValueAtTime(46, t); o.frequency.linearRampToValueAtTime(63, t + 2.0); o2.frequency.setValueAtTime(46.9, t); o2.frequency.linearRampToValueAtTime(64.2, t + 2.0);
        f.type = "bandpass"; f.frequency.setValueAtTime(150, t); f.frequency.linearRampToValueAtTime(320, t + 2.0); f.Q.value = 3;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.26, t + 0.9); g.gain.linearRampToValueAtTime(0.0001, t + 2.3);
        o.connect(f); o2.connect(f); f.connect(g); g.connect(out); wet(g, 0.5); o.start(t); o2.start(t); o.stop(t + 2.4); o2.stop(t + 2.4);
        burst(t, 0.07, 2.0, "bandpass", 700, 6, 1700, 0.9);
      },
      whoosh: function () {                         // the push through the tunnel
        if (!ctx) return; var t = ctx.currentTime + 0.02;
        burst(t, 0.5, 1.5, "bandpass", 260, 0.9, 2600, 0.7, 0.4);
        burst(t + 0.7, 0.25, 1.0, "bandpass", 3600, 1.4, 900, 0.3, 0.5);
        tone("sine", 55, t + 0.4, 0.35, 1.8, 40, 0.5);
      },
      shimmer: function () {                        // silver: soft bell partials and a warm low bed
        if (!ctx) return; var t = ctx.currentTime + 0.02, f0 = 1568;
        [[1, 0.075, 3.4], [2.01, 0.05, 2.6], [2.76, 0.034, 2.1], [4.07, 0.02, 1.5], [5.4, 0.012, 1.0]].forEach(function (p, i) { tone("sine", f0 * p[0], t + i * 0.025, p[1], p[2], 0, 0.04, 0.7); });
        [110, 164.8, 220, 329.6].forEach(function (f, i) { tone("sine", f, t, 0.06, 3.2, 0, 0.8, 0.5); });
        burst(t, 0.07, 0.04, "highpass", 6000, 0.7, 0, 0.003, 0.6);
      },
      stop: function (fade) {
        if (!ctx) return; var c = ctx, o = out; ctx = null; hum = null;
        try { o.gain.setTargetAtTime(0.0001, c.currentTime, Math.max(fade, 0.01) / 3); } catch (e) {}
        setTimeout(function () { try { c.close(); } catch (e) {} }, fade * 1000 + 300);
      }
    };
    return api;
  })();
  var btnSound = $(".ts-sound");
  function syncSound() {
    if (!btnSound) return;
    var on = Sfx.isOn();
    btnSound.setAttribute("aria-pressed", on ? "true" : "false");
    btnSound.setAttribute("aria-label", on ? "Sound on. Turn sound off" : "Sound off. Turn sound on");
    btnSound.classList.toggle("ts-snd-on", on);
  }
  syncSound();
  /* try sound right away; if the browser holds it back, offer one tap to turn it on */
  var soundHint = null, soundUnlocked = false;
  if (Sfx.isOn()) {
    Sfx.gesture();
    later(function () {
      if (state === "done" || !Sfx.isOn() || !Sfx.blocked()) { soundUnlocked = true; return; }
      soundHint = document.createElement("button"); soundHint.type = "button"; soundHint.className = "ts-sound-hint"; soundHint.textContent = "Tap for sound";
      soundHint.style.cssText = "position:absolute;left:50%;bottom:calc(14% + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:6;padding:12px 22px;min-height:48px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(10,10,10,.55);color:#f3efe6;font:600 16px/1 system-ui,sans-serif;letter-spacing:.04em;backdrop-filter:blur(6px)";
      root.appendChild(soundHint);
    }, 350);
  }
  function unlockSound() {
    soundUnlocked = true; Sfx.gesture();
    var v = root.querySelector(".ts-film"); if (v) { try { v.muted = false; } catch (e) {} }
    if (soundHint) { soundHint.remove(); soundHint = null; }
  }
  if (btnSound) {
    btnSound.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    btnSound.addEventListener("click", function (e) { e.stopPropagation(); Sfx.set(!Sfx.isOn()); syncSound(); if (Sfx.isOn()) unlockSound(); });
  }

  /* ---------- lifecycle ---------- */
  function lockApp(on) {
    if (!app) return;
    if (on) { app.setAttribute("aria-hidden", "true"); if ("inert" in app) app.inert = true; }
    else { app.removeAttribute("aria-hidden"); if ("inert" in app) app.inert = false; }
  }
  lockApp(true);
  root.classList.add("ts-run");
  var btnSkip = $(".ts-skip");

  function onKey(e) {
    if (state === "done") return;
    var k = e.key, tgt = e.target;
    if ((k === "Enter" || k === " " || k === "Spacebar") && tgt === btnSound) { e.stopPropagation(); return; }   // let the sound button act
    if (k === "Tab" || k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") return;
    e.preventDefault(); e.stopPropagation(); skip();                                                                 // any other key skips
  }
  function onPointer(e) {
    if (state === "done") return; e.preventDefault();
    // Grok's review GRK-3-06: a tap anywhere skips (the dad flow: tap to get past the film). Sound comes on only from "Tap for sound" or the sound button.
    if (soundHint && e.target && e.target.closest && e.target.closest(".ts-sound-hint")) { unlockSound(); return; }
    Sfx.gesture(); skip();
  }
  window.addEventListener("keydown", onKey, true);
  root.addEventListener("pointerdown", onPointer);
  if (btnSkip) btnSkip.addEventListener("click", function (e) { e.stopPropagation(); skip(); });

  function skip() {
    if (state === "done") return;
    if (state === "handoff" && gl) { finish(false); return; }
    finish(true);
  }
  var finished = false;
  // quick = fade the whole splash out over a short time; otherwise the canvas is already transparent and we just clean up
  var filmEl = null;                                  // the playing opening film, if any (FILM path)
  function finish(quick, ms) {
    if (finished) return;
    if (filmEl && quick) return filmExit(Math.max(ms || 0, 0.9));   // skip, cap or end: always the zoom-through, never a hard cut
    finished = true;
    html.classList.add("ts-reveal");                  // the app becomes visible under whatever is left of the splash
    if (quick) {
      root.style.setProperty("--ts-out", (ms || 0.42) + "s");
      root.classList.add("ts-out");
      Sfx.stop(0.5);
      later(cleanup, (ms || 0.42) * 1000 + 80);
    } else cleanup();
  }
  /* Film exit (tr72): the camera keeps flying forward. The film zooms past the viewer (scale up, light bloom, blur, fade)
     while the app rises out of it (scale .88 -> 1, blur -> sharp, fade in) and the film's sound fades with it. */
  function filmExit(sec) {
    if (finished) return; finished = true;
    var v = filmEl;
    root.style.setProperty("--ts-exit", sec + "s");
    html.style.setProperty("--ts-exit", sec + "s");
    html.classList.add("ts-reveal", "ts-film-reveal");
    root.classList.add("ts-film-exit");
    var v0 = v ? v.volume : 0, t0 = performance.now();
    (function fade() {
      if (!v || state === "done") return;
      var k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      try { v.volume = v0 * (1 - k) * (1 - k); } catch (e) {}
      if (k < 1) requestAnimationFrame(fade);
    })();
    Sfx.stop(0.5);
    later(cleanup, sec * 1000 + 120);
  }
  function cleanup() {
    if (state === "done") return;
    state = "done";
    timers.forEach(clearTimeout);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("hashchange", onNav);
    window.removeEventListener("popstate", onNav);
    document.removeEventListener("visibilitychange", onVis);
    root.removeEventListener("pointerdown", onPointer);
    if (gl) { try { gl.dispose(); } catch (e) {} }
    gl = null;
    Sfx.stop(1.6);
    lockApp(false);
    html.classList.remove("ts-on", "ts-reveal", "ts-film-reveal");
    try { sessionStorage.setItem("tr_splash_v1", "1"); sessionStorage.removeItem("tr_splash_film_resume"); } catch (e) {}
    if (root.parentNode) root.parentNode.removeChild(root);
    try { window.dispatchEvent(new CustomEvent("titan:splash-done")); } catch (e) {}
  }
  function onVis() { if (!document.hidden && performance.now() - tStart > CAP_MS) finish(true, 0.2); }
  document.addEventListener("visibilitychange", onVis);
  function onResize() { if (gl && state !== "done") gl.layout(); }
  // Any navigation (a wing link, a #hash, back/forward) ends the intro: it must never linger over a wing.
  function onNav() { finish(true, 0.5); }
  window.addEventListener("hashchange", onNav);
  window.addEventListener("popstate", onNav);
  window.addEventListener("resize", onResize);
  var hold = /[?&]splashhold/.test(location.search);       // test/capture only: no cap, no auto-render (frames come from _debug.seek)
  if (!hold) later(function () { if (window.__tsFilmUntil && performance.now() < window.__tsFilmUntil) return; finish(true, 0.4); }, CAP_MS);       // wall-clock cap, whatever the GPU is doing

  window.TitanSplash = {
    replay: function () {
      try { sessionStorage.removeItem("tr_splash_v1"); } catch (e) {}
      var u = new URL(location.href); u.searchParams.set("splash", "1"); u.hash = ""; location.href = u.toString();
    }
  };

  /* ---------- reduced motion / no WebGL: a still, lit frame and a quiet cross-fade ---------- */
  function stillPath(why) {
    root.classList.add(why === "reduced" ? "ts-reduced" : "ts-nogl");
    whenFeatured(function () {
      if (state === "done") return;
      showFeatureText();
      root.classList.add("ts-stillon");
      var f = $(".ts-feature"); if (f) { f.style.transition = "opacity .5s ease"; f.style.opacity = "1"; }
      if (why === "reduced") later(function () { finish(true, 0.5); }, 1500);
      else finish(true, 0.3);
    });
  }
  if (reduce) { stillPath("reduced"); return; }

  /* ---------- FILM path (2026-10-01): a photoreal AI-generated opening film, when one has been imported ----------
     FILM is set by the integrator on "Titan: import the art" (art/splash/*.mp4, from the Drive art queue, docs/art/ART_QUEUE.md).
     null = no film yet, so the real-time 3D scene below runs. If the film cannot start within 5 s (or the codec is unsupported), the 3D scene runs instead. */
  var FILM = {     // tr71: Grok Imagine Video 1.5 clips (artreq_20261001-2045_splash-film-v3-maximal), 1080p + sound; one picked at random per launch, never the same twice in a row
    portrait:  ["art/splash/zoom1_9x16", "art/splash/zoom2_9x16", "art/splash/titan_9x16", "art/splash/dragon_9x16",
                "art/splash/coinverse1_9x16", "art/splash/coinverse2_9x16"],   // tr89: v5 "The Coinverse Opens" takes 1 + 2 (SuperGrok, artreq_20261005-0900)
    landscape: ["art/splash/zoom1_16x9"],     // base names: .webm (VP9 + Opus, 8 Mbps) where supported, else .mp4 (H.264 + AAC, 12 Mbps)
    tail: 1.4,
    exit: 1.6
  };
  if (FILM && !/[?&]splashgl\b/.test(location.search) && filmPath()) return;
  function pickFilm(list) {
    if (!list || !list.length) return null;
    if (typeof list === "string") return list;
    var forced = /[?&]film=(\d+)/.exec(location.search);
    if (forced) return list[clamp(+forced[1], 0, list.length - 1)];
    var last = null; try { last = localStorage.getItem("tr_splash_film_last"); } catch (e) {}
    var pool = list.length > 1 ? list.filter(function (f) { return f !== last; }) : list;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem("tr_splash_film_last", pick); } catch (e) {}
    return pick;
  }
  function filmPath() {
    var portrait = (window.innerHeight || 1) >= (window.innerWidth || 1);
    // One clip per launch: if the page reloaded mid-film (tab restore, manual refresh), resume the SAME clip where it was.
    var resume = null;
    try { resume = JSON.parse(sessionStorage.getItem("tr_splash_film_resume") || "null"); } catch (e) {}
    if (resume && !(resume.src && Date.now() - resume.at < 90000)) resume = null;
    var src = resume ? resume.src : pickFilm((portrait ? FILM.portrait : FILM.landscape) || FILM.portrait || FILM.landscape);
    if (!src) return false;
    var v = document.createElement("video");
    if (!resume) src += v.canPlayType('video/webm; codecs="vp9, opus"') ? ".webm" : ".mp4";
    if (resume && resume.t > 0.5) v.addEventListener("loadedmetadata", function () { try { v.currentTime = Math.min(resume.t, (v.duration || 99) - 2); } catch (e) {} }, { once: true });
    var lastSave = 0;
    v.className = "ts-film"; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
    v.preload = "auto"; v.src = src;
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s ease;background:#000;z-index:1";
    root.insertBefore(v, root.firstChild);
    root.classList.add("ts-filmon");
    filmEl = v;
    window.__tsFilmUntil = performance.now() + 20000; later(function () { finish(true, 0.5); }, 20000);   // clips run ~15 s; the film's own hard cap
    var started = false, tail = FILM.tail || 1.4, shown = false;
    var fallback = later(function () { if (started || state === "done") return; filmEl = null; v.remove(); root.classList.remove("ts-filmon"); window.__tsFilmUntil = 0; runGL(); }, 5000);
    v.addEventListener("playing", function () { started = true; clearTimeout(fallback); v.style.opacity = "1"; });
    var EXIT = FILM.exit || 1.6;                        // seconds: the zoom-through starts this long before the last frame
    v.addEventListener("timeupdate", function () {
      if (v.duration && v.currentTime > v.duration - EXIT) filmExit(EXIT);
      if (performance.now() - lastSave > 500) { lastSave = performance.now(); try { sessionStorage.setItem("tr_splash_film_resume", JSON.stringify({ src: src, t: v.currentTime, at: Date.now() })); } catch (e) {} }
      if (!shown && v.duration && v.currentTime > v.duration - tail - 1.2) {
        shown = true;
        whenFeatured(function () { if (state === "done") return; showFeatureText(); var f = $(".ts-feature"); if (f) { f.style.transition = "opacity .6s ease"; f.style.opacity = "1"; } });
      }
    });
    v.addEventListener("ended", function () { finish(true, 0.6); });
    v.addEventListener("error", function () { if (!started) { clearTimeout(fallback); filmEl = null; v.remove(); root.classList.remove("ts-filmon"); runGL(); } });
    var snd = $(".ts-sound");
    if (snd) snd.addEventListener("click", function () { try { v.muted = !v.muted; } catch (e) {} });
    if (Sfx.isOn()) { v.muted = false; }
    var p = v.play();
    if (p && p.catch) p.catch(function () { v.muted = true; var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {}); });   // sound blocked: play muted, "Tap for sound" unmutes
    return true;
  }
  runGL();
  function runGL() {
  if (!window.THREE) { stillPath("nogl"); finish(true, 0.25); return; }
  try { initGL(); } catch (err) {
    if (window.console) console.warn("splash gl", err);
    if (gl && gl.dispose) { try { gl.dispose(); } catch (e) {} } gl = null;
    root.classList.remove("ts-glon"); finish(true, 0.25);          // WebGL failed: instant fade to the app
  }
  }

  /* =====================================================================================================
     3D scene
     ===================================================================================================== */
  function initGL() {
    var THREE = window.THREE;
    var canvas = $(".ts-gl");
    var TIERS = [
      { dpr: 2,    msaa: 1, post: 1, lv: 6, dof: 1, vol: 2, dust: 700, shadow: 2048, tex: 1536, refl: 1 },
      { dpr: 1.5,  msaa: 1, post: 1, lv: 5, dof: 1, vol: 2, dust: 450, shadow: 1024, tex: 1024, refl: 1 },
      { dpr: 1.25, msaa: 0, post: 1, lv: 4, dof: 0, vol: 1, dust: 260, shadow: 1024, tex: 1024, refl: 1 },
      { dpr: 1,    msaa: 0, post: 1, lv: 3, dof: 0, vol: 0, dust: 90,  shadow: 512,  tex: 768,  refl: 0 },
      { dpr: 1,    msaa: 0, post: 0, lv: 0, dof: 0, vol: 0, dust: 0,   shadow: 0,    tex: 512,  refl: 0 }
    ];
    var forced = /[?&]splashq=(\d)/.exec(location.search);
    var cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    var small = Math.min(window.innerWidth, window.innerHeight) < 520;
    var tier = (function () {
      if (forced) return clamp(+forced[1], 0, 4);
      var save = navigator.connection && navigator.connection.saveData;
      if (save || cores <= 2 || mem <= 1) return 3;
      if (cores <= 4 || mem <= 2) return small ? 2 : 1;
      if (cores >= 8 && mem >= 6) return 0;      // flagship class: full quality, demoted by the frame-time probe if it cannot hold ~50 fps
      return 1;
    })();
    var Q = TIERS[tier];

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: tier >= 3, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", stencil: false });
    } catch (e) { throw new Error("no webgl"); }
    var ctx3 = renderer.getContext();
    if (!ctx3) throw new Error("no webgl ctx");
    var caps = renderer.capabilities, ext = renderer.extensions;
    var hdr = (function () {
      if (caps.isWebGL2) return ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float");
      return ext.has("OES_texture_half_float") && ext.has("OES_texture_half_float_linear") && ext.has("EXT_color_buffer_half_float");
    })();
    if (!hdr && tier < 4) { tier = 4; Q = TIERS[4]; }
    renderer.setClearColor(0x000000, 1);
    renderer.debug.checkShaderErrors = false;          // no synchronous link-status stall: programs finish compiling in parallel
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = Q.shadow > 0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    var maxAniso = Math.min(caps.getMaxAnisotropy ? caps.getMaxAnisotropy() : 1, 8);
    var owned = [];                                   // textures + render targets we must free
    function own(x) { owned.push(x); return x; }
    var viewW = 1, viewH = 1, dpr = 1;

    /* ---------- tiny helpers ---------- */
    function canvasEl(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
    function ctexture(c, opt) {
      var t = new THREE.CanvasTexture(c); opt = opt || {};
      t.anisotropy = maxAniso; if (opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      if (opt.srgb) t.encoding = THREE.sRGBEncoding;
      return own(t);
    }
    function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    function mat(p) { var m = new THREE.MeshPhysicalMaterial(p); mats.push(m); return m; }
    var mats = [];
    function lathe(pts, seg) {                       // profile (r, z) around the z axis; walk outward, up, then inward = outward normals
      var g = new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg || 128);
      g.rotateX(Math.PI / 2); return g;
    }

    /* ================= procedural textures (runtime canvases, never shipped bitmaps) ================= */
    // plate mottling: soft, low-frequency roughness variation (no high-frequency detail = no shimmer)
    function plateTexture() {
      var N = 256, c = canvasEl(N), g = c.getContext("2d"), r = rnd(7);
      g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, N, N);
      for (var i = 0; i < 260; i++) { var v = 100 + Math.round(r() * 70), rad = 8 + r() * 40; var gr = g.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, "rgba(" + v + "," + v + "," + v + ",0.35)"); gr.addColorStop(1, "rgba(" + v + "," + v + "," + v + ",0)"); g.save(); g.translate(r() * N, r() * N); g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore(); }
      return ctexture(c, { repeat: 1 });
    }
    // turned finish: fine concentric tool marks; V runs along the lathe profile
    function turnedTexture() {
      var c = canvasEl(8, 512), g = c.getContext("2d"), r = rnd(11);
      for (var y = 0; y < 512; y++) { var v = 128 + (r() - 0.5) * 14 + Math.sin(y * 0.12) * 10; g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(0, y, 8, 1); }
      return ctexture(c, { repeat: 1 });
    }
    // engine-turned rosette (guilloche) for the door's inner field: a drawn height field -> normal map (planar, centred)
    function guillocheTexture() {
      var N = 1024, c = canvasEl(N), g = c.getContext("2d", { willReadFrequently: true }), cx = N / 2;
      g.fillStyle = "#808080"; g.fillRect(0, 0, N, N);
      g.lineWidth = 3.2;
      for (var ring = 0; ring < 3; ring++) {
        var R0 = 90 + ring * 120, rr = 200 + ring * 40, n = 60 + ring * 14;
        for (var i = 0; i < n; i++) {
          var a = i / n * Math.PI * 2;
          g.strokeStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.arc(cx + Math.cos(a) * R0, cx + Math.sin(a) * R0, rr, 0, 7); g.stroke();
        }
      }
      var src = g.getImageData(0, 0, N, N).data, h = new Float32Array(N * N), t2 = new Float32Array(N * N), i2, x, y;
      for (i2 = 0; i2 < N * N; i2++) h[i2] = src[i2 * 4] / 255;
      for (var pass = 0; pass < 3; pass++) { for (y = 0; y < N; y++) for (x = 1; x < N - 1; x++) t2[y * N + x] = (h[y * N + x - 1] + h[y * N + x] + h[y * N + x + 1]) / 3; for (y = 1; y < N - 1; y++) for (x = 0; x < N; x++) h[y * N + x] = (t2[(y - 1) * N + x] + t2[y * N + x] + t2[(y + 1) * N + x]) / 3; }
      var out = g.createImageData(N, N), k = 3.2;
      for (y = 1; y < N - 1; y++) for (x = 1; x < N - 1; x++) {
        var dx = (h[y * N + x + 1] - h[y * N + x - 1]) * k, dy = (h[(y + 1) * N + x] - h[(y - 1) * N + x]) * k, il = 1 / Math.sqrt(dx * dx + dy * dy + 1), p = (y * N + x) * 4;
        out.data[p] = (-dx * il * 0.5 + 0.5) * 255; out.data[p + 1] = (dy * il * 0.5 + 0.5) * 255; out.data[p + 2] = (il * 0.5 + 0.5) * 255; out.data[p + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      return ctexture(c);
    }

    /* ================= image-based lighting: a RoomEnvironment-style studio, built at runtime ================= */
    function buildEnvironment() {
      var s = new THREE.Scene();
      var room = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 16), new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.BackSide }));
      s.add(room);
      var gc = canvasEl(8, 128), gg = gc.getContext("2d"), gr = gg.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.55, "#cfcfcf"); gr.addColorStop(1, "#303030"); gg.fillStyle = gr; gg.fillRect(0, 0, 8, 128);
      var gtex = new THREE.CanvasTexture(gc);
      function box(w, h, x, y, z, rx, ry, rgb, k, tex) {
        var m = new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0] * k, rgb[1] * k, rgb[2] * k), side: THREE.DoubleSide, map: tex || null });
        var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); s.add(p); return p;
      }
      var W = [1.0, 0.86, 0.68];                  // warm tungsten (about 3200 K)
      var N = [1.0, 1.0, 1.0];                  // clean neutral
      box(7, 3.6, 0, 4.3, 0, Math.PI / 2, 0, W, 5.5);                 // big overhead softbox
      box(0.9, 6.0, -7.6, 0.6, 0.5, 0, Math.PI / 2, N, 2.4);           // left strip
      box(0.7, 6.0, 7.6, 0.6, -1.5, 0, Math.PI / 2, N, 1.7);           // right strip
      box(10, 6, 0.3, 1.0, 7.6, 0, Math.PI, N, 0.6, gtex);        // front fill (behind the camera) with falloff
      box(5, 0.5, 0, 1.2, -7.6, 0, 0, W, 1.6);                         // back kicker
      box(1.2, 1.2, 4.2, 3.0, 3.2, Math.PI / 2 + 0.5, 0.3, N, 5);   // small hot spot for sparkle
      var pm = new THREE.PMREMGenerator(renderer);
      var rt = pm.fromScene(s, 0.035);
      pm.dispose(); gtex.dispose();
      s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      own(rt); return rt.texture;
    }

    /* ================= scene ================= */
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    scene.add(camera);
    var tb0 = performance.now(), bootM = {}, bootLast = tb0;
    function bootMark(n) { var x = performance.now(); bootM[n] = Math.round(x - bootLast); bootLast = x; }
    var envTex = buildEnvironment(); var tbEnv = performance.now() - tb0;
    scene.environment = envTex;

    var DOOR_R = 1.14, HOLE_R = 1.0, HINGE_X = -1.27, DZ = 0.13, WALL_T = 1.1, FLOOR_Y = -2.0, CH_FLOOR = -1.0;
    var COIN_Z = -6.0, COIN_Y = -0.69, COIN_R = 0.27, COIN_T = 0.042;

    var tq0 = performance.now(), plateTex = plateTexture(), tq1 = performance.now(), turnedTex = turnedTexture(), tq2 = performance.now(), guilTex = guillocheTexture(), tq3 = performance.now();
    plateTex.repeat.set(0.5, 0.5); var tbTex = performance.now() - tb0 - tbEnv;

    var mSteel = mat({ color: 0x1b1c1f, metalness: 0.72, roughness: 0.46, roughnessMap: plateTex, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.2 });
    var mWall = mat({ color: 0x151618, metalness: 0.7, roughness: 0.62, roughnessMap: plateTex, envMapIntensity: 0.18 });
    var mDoor = mat({ color: 0x17181b, metalness: 0.78, roughness: 0.4, roughnessMap: turnedTex, clearcoat: 0.35, clearcoatRoughness: 0.28, envMapIntensity: 0.5, side: THREE.DoubleSide });
    var mSilver = mat({ color: 0xdadbde, metalness: 1.0, roughness: 0.17, roughnessMap: turnedTex, envMapIntensity: 1.0, side: THREE.DoubleSide });
    var mSilverB = mat({ color: 0xc2c4c8, metalness: 1.0, roughness: 0.34, envMapIntensity: 0.9, side: THREE.DoubleSide });
    var mGuil = mat({ color: 0xaeb0b4, metalness: 1.0, roughness: 0.34, normalMap: guilTex, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.9 });
    var mLiner = mat({ color: 0x202124, metalness: 0.8, roughness: 0.38, roughnessMap: turnedTex, envMapIntensity: 0.25, side: THREE.BackSide });
    var mFloor = mat({ color: 0x0a0a0b, metalness: 0.45, roughness: 0.36, roughnessMap: plateTex, envMapIntensity: 0.4 });
    var envMats = [mSteel, mWall, mDoor, mSilver, mSilverB, mGuil, mLiner, mFloor];
    var envBase = envMats.map(function (m) { return m.envMapIntensity; });

    function add(parent, geo, m, x, y, z) { var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }

    // --- the wall with a round opening (a tunnel through it), floor outside ---
    (function () {
      var sh = new THREE.Shape(); sh.moveTo(-9, FLOOR_Y); sh.lineTo(9, FLOOR_Y); sh.lineTo(9, 6.5); sh.lineTo(-9, 6.5); sh.lineTo(-9, FLOOR_Y);
      var hole = new THREE.Path(); hole.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true); sh.holes.push(hole);
      var g = new THREE.ExtrudeGeometry(sh, { depth: WALL_T, bevelEnabled: false, curveSegments: 96 }); g.translate(0, 0, -WALL_T);
      add(scene, g, mWall);
      var fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mFloor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, FLOOR_Y, 14); fl.receiveShadow = true; scene.add(fl);
      var liner = new THREE.CylinderGeometry(HOLE_R, HOLE_R, WALL_T + 0.02, 96, 1, true); liner.rotateX(Math.PI / 2);
      add(scene, liner, mLiner, 0, 0, -WALL_T / 2);
      // armour-plate seams and rivets (real geometry, so nothing shimmers)
      var seamM = mat({ color: 0x050506, metalness: 0.85, roughness: 0.5, envMapIntensity: 0.3 }), rivG = new THREE.SphereGeometry(0.024, 10, 8), riv = [];
      [-6.5, -3.6, 3.6, 6.5].forEach(function (x) { add(scene, new THREE.BoxGeometry(0.045, 8.5, 0.03), seamM, x, 2.25, 0.012); for (var yy = FLOOR_Y + 0.3; yy < 6.3; yy += 0.45) { riv.push([x - 0.11, yy]); riv.push([x + 0.11, yy]); } });
      [-0.4, 2.7].forEach(function (y) { add(scene, new THREE.BoxGeometry(6.7, 0.045, 0.03), seamM, -5.9, y, 0.012); add(scene, new THREE.BoxGeometry(6.7, 0.045, 0.03), seamM, 5.9, y, 0.012); });
      var rv = new THREE.InstancedMesh(rivG, mSilverB, riv.length), rd = new THREE.Object3D(); riv.forEach(function (p, i) { rd.position.set(p[0], p[1], 0.02); rd.updateMatrix(); rv.setMatrixAt(i, rd.matrix); }); rv.receiveShadow = true; scene.add(rv);
      // polished lip at the far end of the tunnel
      add(scene, lathe([[HOLE_R - 0.06, -WALL_T], [HOLE_R + 0.001, -WALL_T], [HOLE_R + 0.001, -WALL_T + 0.05], [HOLE_R - 0.04, -WALL_T + 0.05], [HOLE_R - 0.06, -WALL_T]], 96), mSilver);
      // bezel on the wall around the door
      add(scene, lathe([[HOLE_R, 0], [1.31, 0], [1.31, 0.05], [1.27, 0.1], [1.12, 0.115], [HOLE_R, 0.115], [HOLE_R, 0]], 128), mSilverB);
      add(scene, lathe([[1.45, 0], [1.462, 0], [1.462, 0.012], [1.45, 0.012], [1.45, 0]], 128), mSilver);
      // dial of precision tick marks on the wall (instanced)
      var tg = new THREE.BoxGeometry(0.012, 0.075, 0.012), tm = mSilver, ticks = new THREE.InstancedMesh(tg, tm, 120), d = new THREE.Object3D();
      for (var i = 0; i < 120; i++) {
        var a = i / 120 * Math.PI * 2, big = i % 10 === 0, rr = 1.58;
        d.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.006); d.rotation.set(0, 0, a - Math.PI / 2); d.scale.set(big ? 1.7 : 1, big ? 1.6 : (i % 5 === 0 ? 1.25 : 0.9), 1); d.updateMatrix(); ticks.setMatrixAt(i, d.matrix);
      }
      ticks.castShadow = false; ticks.receiveShadow = true; scene.add(ticks);
    })();

    bootMark("wall");
    // --- the door (pivot at the hinge, body offset so its centre sits on the opening) ---
    var doorPivot = new THREE.Group(); doorPivot.position.set(HINGE_X, 0, 0); scene.add(doorPivot);
    var door = new THREE.Group(); door.position.set(-HINGE_X, 0, DZ); doorPivot.add(door);
    var wheel = new THREE.Group();
    (function () {
      // steel body with stepped field
      add(door, lathe([[0, 0], [1.10, 0], [1.14, 0.03], [1.14, 0.235], [1.105, 0.27], [0.99, 0.27], [0.985, 0.24], [0.66, 0.235], [0.655, 0.27], [0.60, 0.27], [0.595, 0.235], [0.4, 0.23], [0, 0.23]], 160), mDoor);
      // polished outer rim and inner ring
      add(door, lathe([[0.985, 0.25], [1.14, 0.25], [1.146, 0.28], [1.122, 0.318], [0.998, 0.318], [0.975, 0.288], [0.985, 0.25]], 160), mSilver);
      add(door, lathe([[0.60, 0.265], [0.66, 0.265], [0.66, 0.295], [0.645, 0.312], [0.615, 0.312], [0.60, 0.295], [0.60, 0.265]], 128), mSilver);
      // engine-turned rosette on the field
      var ring = new THREE.RingGeometry(0.665, 0.972, 160, 1), rm = new THREE.Mesh(ring, mGuil); rm.position.z = 0.243; rm.receiveShadow = true; door.add(rm);
      // hub
      add(door, lathe([[0, 0.23], [0.40, 0.23], [0.41, 0.26], [0.38, 0.30], [0.30, 0.335], [0.22, 0.35], [0.17, 0.39], [0.10, 0.43], [0.04, 0.45], [0, 0.45]], 96), mSilver);
      add(door, lathe([[0.30, 0.335], [0.315, 0.335], [0.315, 0.345], [0.30, 0.345], [0.30, 0.335]], 96), mSilverB);
      // hinge barrels on the left outside the door
      for (var i = -1; i <= 1; i++) {
        var hb = new THREE.CylinderGeometry(0.085, 0.085, 0.34, 32);
        var m1 = add(doorPivot, hb, mSilverB, 0, i * 0.62, 0.28); m1.scale.set(1, 1, 1);
        add(doorPivot, new THREE.BoxGeometry(0.2, 0.2, 0.05), mSteel, 0.06, i * 0.62, 0.15);
      }
      // wheel: rim, spokes, knobs
      wheel.position.z = 0.4; door.add(wheel);
      var tor = new THREE.TorusGeometry(0.50, 0.028, 20, 128); add(wheel, tor, mSilver);
      for (i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2, sg = new THREE.CylinderGeometry(0.02, 0.032, 0.62, 20); sg.rotateZ(Math.PI / 2); sg.translate(0.31 + 0.0, 0, 0);
        var sp = add(wheel, sg, mSilver); sp.rotation.z = a;
        var kn = lathe([[0, -0.07], [0.036, -0.07], [0.052, -0.04], [0.05, 0.03], [0.065, 0.06], [0.04, 0.085], [0, 0.09]], 24); kn.rotateY(Math.PI / 2);
        var kb = add(wheel, kn, mSilver, Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0); kb.rotation.z = a; kb.scale.set(1, 1, 1);
      }
    })();
    bootMark("door");
    // --- twelve bolts in housings on the wall ---
    var BOLTS = 12, bolts = [];
    (function () {
      var bg = lathe([[0, 0], [0.05, 0], [0.073, 0.035], [0.078, 0.07], [0.078, 0.5], [0.07, 0.56], [0.0, 0.575]], 40); bg.rotateY(Math.PI / 2); bg.translate(1.02, 0, 0);
      var cap = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 32); cap.rotateZ(Math.PI / 2);
      var hb = new THREE.BoxGeometry(0.64, 0.30, 0.31), ch = new THREE.BoxGeometry(0.64, 0.05, 0.19);
      for (var i = 0; i < BOLTS; i++) {
        var a = (i / BOLTS) * Math.PI * 2 + Math.PI / 12, g = new THREE.Group(); g.rotation.z = a; scene.add(g);
        add(g, hb, mSteel, 1.45, 0, 0.155);                       // housing block on the wall
        add(g, ch, mSteel, 1.45, 0.17, 0.35); add(g, ch, mSteel, 1.45, -0.17, 0.35);   // cheeks
        var b = new THREE.Group(); g.add(b);
        add(b, bg, mSilver, 0, 0, 0.51);                       // the bolt bar (engaged: its tip rests over the door rim)
                var sc = add(b, cap, mSilverB, 1.6, 0, 0.51);
        bolts.push(b);
      }
    })();

    bootMark("bolts");
    // --- the chamber behind the door ---
    var chamber = new THREE.Group(); scene.add(chamber);
    var backdropMat;
    (function () {
      var wallM = mat({ color: 0x0c0c0d, metalness: 0.5, roughness: 0.6, roughnessMap: plateTex, envMapIntensity: 0.25, side: THREE.FrontSide });
      var W = 8, H = 4, L = 9.6, zc = -WALL_T - L / 2;
      function pl(w, h, x, y, z, rx, ry) { var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); p.receiveShadow = true; chamber.add(p); return p; }
      pl(L, H, -W / 2, CH_FLOOR + H / 2, zc, 0, Math.PI / 2);
      pl(L, H, W / 2, CH_FLOOR + H / 2, zc, 0, -Math.PI / 2);
      pl(W, L, 0, CH_FLOOR + H, zc, Math.PI / 2, 0);
      // glossy chamber floor: a dark, partly transparent plane over a mirrored coin = cheap, convincing reflection
      var fl = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.3, roughness: 0.22, envMapIntensity: 0.22, transparent: true, opacity: 0.72, depthWrite: true }));
      fl.rotation.x = -Math.PI / 2; fl.position.set(0, CH_FLOOR, zc); fl.receiveShadow = true; chamber.add(fl); mats.push(fl.material); chamber.userData.floor = fl;
      // the far floor sinks into black so the horizon never reads as a hard line
      var fade = new THREE.Mesh(new THREE.PlaneGeometry(W, 6.4), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: {},
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "varying vec2 vUv; void main(){ float a = smoothstep(0.62, 1.0, vUv.y) * 0.97; float s = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x); gl_FragColor = vec4(0.0, 0.0, 0.0, a); }" }));
      fade.rotation.x = -Math.PI / 2; fade.position.set(0, CH_FLOOR + 0.004, -WALL_T - L + 3.2); fade.renderOrder = 2; chamber.add(fade);
      // cyclorama backdrop: a soft warm-grey glow behind the coin, falling to black
      backdropMat = new THREE.ShaderMaterial({
        uniforms: { uK: { value: 0 }, uTime: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: ["uniform float uK, uTime; varying vec2 vUv;",
          "void main(){ vec2 p = (vUv - vec2(0.5, 0.2)) * vec2(1.0, 1.5);",
          " float d = length(p); float g = (exp(-d*d*7.0)*0.8 + exp(-d*d*30.0)*0.5) * smoothstep(0.0, 0.2, vUv.y);",
          "",
          " vec3 c = mix(vec3(0.55,0.53,0.50), vec3(0.95,0.90,0.82), exp(-d*d*30.0)) * g * uK;",
          " gl_FragColor = vec4(c, 1.0); }"].join("\n"),
        depthWrite: true });
      var bd = new THREE.Mesh(new THREE.PlaneGeometry(W, H + 1.2), backdropMat); bd.position.set(0, CH_FLOOR + (H + 1.2) / 2, -WALL_T - L + 0.02); chamber.add(bd);
      // a few real "deposit box" panels at the sides keep the room from being an empty box
      var rg = rnd(5), pm = mat({ color: 0x15161a, metalness: 0.8, roughness: 0.45, envMapIntensity: 0.5 });
      for (var s = -1; s <= 1; s += 2) for (var k = 0; k < 6; k++) {
        var bx = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 1.1), pm); bx.position.set(s * (W / 2 - 0.05), CH_FLOOR + 0.5 + (k % 3) * 1.0, -2.2 - Math.floor(k / 3) * 1.2 - 3.4); chamber.add(bx);
      }
    })();

    bootMark("chamber");
    // --- the coin ---
    var coin = new THREE.Group(), coinMesh = new THREE.Group(), coinMirror = new THREE.Group();
    var faceMats = [], coinReady = false, coinMats = [];
    (function () {
      var rim = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_T, 192, 1, true); rim.rotateX(Math.PI / 2);
      var circ = new THREE.RingGeometry(0.0004, COIN_R * 0.999, 192, 28);       // a very slightly dished field: the mirror then sweeps a gradient as the coin turns
      (function () { var p = circ.attributes.position; for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), r = Math.sqrt(x * x + y * y) / COIN_R; p.setZ(i, 0.0075 * (1 - r * r)); } circ.computeVertexNormals(); })();
      var edgeC = canvasEl(64, 8), eg = edgeC.getContext("2d"), nx;
      for (var x = 0; x < 64; x++) { nx = Math.sin(x / 64 * Math.PI * 2); eg.fillStyle = "rgb(" + Math.round(128 + nx * 100) + ",128,235)"; eg.fillRect(x, 0, 1, 8); }
      var edgeN = ctexture(edgeC, { repeat: 1 }); edgeN.repeat.set(150, 1);
      var sideM = new THREE.MeshPhysicalMaterial({ color: 0xcfd0d3, metalness: 1, roughness: 0.3, normalMap: edgeN, normalScale: new THREE.Vector2(1.2, 1.2), envMapIntensity: 1.3 });
      var faceO = new THREE.MeshPhysicalMaterial({ color: 0xd9dadd, metalness: 1, roughness: 1, envMapIntensity: 1.0 });
      // 1x1 placeholder maps so the final program variant is compiled in the warm-up frame; the real maps swap in later with no recompile
      var dn = canvasEl(2, 2), dg = dn.getContext("2d"); dg.fillStyle = "rgb(128,128,255)"; dg.fillRect(0, 0, 2, 2);
      var dr = canvasEl(2, 2), dg2 = dr.getContext("2d"); dg2.fillStyle = "rgb(0,40,0)"; dg2.fillRect(0, 0, 2, 2);
      faceO.normalMap = ctexture(dn); faceO.roughnessMap = ctexture(dr);
      var faceR = faceO.clone();
      coinMats = [sideM, faceO, faceR]; faceMats = [faceO, faceR]; mats.push(sideM, faceO, faceR);
      function build(parent) {
        var s = new THREE.Mesh(rim, sideM); parent.add(s);
        var f = new THREE.Mesh(circ, faceO); f.position.z = COIN_T / 2; parent.add(f);
        var b = new THREE.Mesh(circ, faceR); b.position.z = -COIN_T / 2; b.rotation.y = Math.PI; parent.add(b);
        parent.traverse(function (o) { o.castShadow = false; o.receiveShadow = false; });
      }
      build(coinMesh); coin.add(coinMesh);
      build(coinMirror); coinMirror.scale.y = -1; coin.add(coinMirror);
      coin.position.set(0, COIN_Y, COIN_Z); coin.visible = false; scene.add(coin);
    })();
    // mirror lives under the glossy floor: its pivot sits at the mirrored height (set per frame with the coin pose)

    /* ---------- coin relief: a height map drawn at runtime, turned into normal + roughness maps ---------- */
    function gray(v) { v = Math.round(clamp(v, 0, 255)); return "rgb(" + v + "," + v + "," + v + ")"; }
    function arcText(g, text, R, cy, radius, angle, bottom, size, val) {
      g.save(); g.translate(R, cy); g.fillStyle = gray(val); g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "600 " + size + 'px "Fraunces", Georgia, serif';
      var chars = text.split(""), widths = chars.map(function (ch) { return g.measureText(ch).width + size * 0.3; }), total = widths.reduce(function (a, b) { return a + b; }, 0);
      var span = total / radius, a0 = bottom ? Math.PI + span / 2 : -span / 2, acc = 0;
      chars.forEach(function (ch, i) {
        var w = widths[i], a = bottom ? a0 - (acc + w / 2) / radius : a0 + (acc + w / 2) / radius; acc += w;
        g.save(); g.rotate(a); g.translate(0, bottom ? radius : -radius); g.rotate(bottom ? Math.PI : 0); g.fillText(ch, 0, 0); g.restore();
      });
      g.restore();
    }
    function fitText(g, text, maxW, size, weight) {
      g.font = weight + " " + size + 'px "Fraunces", Georgia, serif';
      while (size > 12 && g.measureText(text).width > maxW) { size -= 4; g.font = weight + " " + size + 'px "Fraunces", Georgia, serif'; }
      return size;
    }
    function drawLeaf(g, x, y, ang, len, wid, v, lw) {
      g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = gray(v); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -wid, len, 0); g.quadraticCurveTo(len * 0.45, wid, 0, 0); g.fill();
      g.strokeStyle = gray(v * 0.5); g.lineWidth = lw || Math.max(1, wid * 0.12); g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.9, 0); g.stroke(); g.restore();
    }
    function drawCommon(g, N, rimV) {
      var R = N / 2, S = R;
      g.fillStyle = gray(44); g.fillRect(0, 0, N, N);
      g.fillStyle = gray(rimV); g.beginPath(); g.arc(R, R, R * 0.996, 0, 7); g.fill();
      g.fillStyle = gray(44); g.beginPath(); g.arc(R, R, R * 0.925, 0, 7); g.fill();
      g.fillStyle = gray(120); g.beginPath(); g.arc(R, R, R * 0.925, 0, 7); g.lineWidth = R * 0.012; g.strokeStyle = gray(120); g.stroke();
      g.fillStyle = gray(44); g.beginPath(); g.arc(R, R, R * 0.92, 0, 7); g.fill();
      for (var i = 0; i < 112; i++) { var a = i / 112 * Math.PI * 2; g.fillStyle = gray(140); g.beginPath(); g.arc(R + Math.cos(a) * R * 0.885, R + Math.sin(a) * R * 0.885, R * 0.0105, 0, 7); g.fill(); }
      return { R: R, S: S };
    }
    // Abstract engine-turned medallion faces (no design, no lettering: obviously not a replica of any coin)
    function lineW(g, w, v) { g.lineWidth = w; g.strokeStyle = gray(v); g.lineCap = "round"; }
    function drawObverse(g, N) {
      var o = drawCommon(g, N, 150), R = o.R, i, k;
      lineW(g, R * 0.0042, 150);
      for (k = 0; k < 46; k++) {                        // concentric rosette bands: rings modulated by a slow sine, the classic guilloche weave
        var r0 = R * (0.30 + k * 0.0105), amp = R * 0.016 * (1 + Math.sin(k * 0.35)), n = 14 + (k % 3) * 2, ph = k * 0.21;
        g.beginPath(); for (i = 0; i <= 360; i++) { var a = i / 360 * Math.PI * 2, rr = r0 + amp * Math.sin(n * a + ph); i ? g.lineTo(R + Math.cos(a) * rr, R + Math.sin(a) * rr) : g.moveTo(R + Math.cos(a) * rr, R + Math.sin(a) * rr); } g.stroke();
      }
      lineW(g, R * 0.0036, 140);                        // radial sunburst on the outer band
      for (i = 0; i < 220; i++) { var b = i / 220 * Math.PI * 2; g.beginPath(); g.moveTo(R + Math.cos(b) * R * 0.79, R + Math.sin(b) * R * 0.79); g.lineTo(R + Math.cos(b) * R * 0.855, R + Math.sin(b) * R * 0.855); g.stroke(); }
      lineW(g, R * 0.012, 175); g.beginPath(); g.arc(R, R, R * 0.775, 0, 7); g.stroke(); g.beginPath(); g.arc(R, R, R * 0.285, 0, 7); g.stroke();
      g.fillStyle = gray(44); g.beginPath(); g.arc(R, R, R * 0.27, 0, 7); g.fill();       // polished mirror centre
      lineW(g, R * 0.006, 165); g.beginPath(); g.arc(R, R, R * 0.12, 0, 7); g.stroke();
    }
    function drawReverse(g, N) {
      var o = drawCommon(g, N, 150), R = o.R, i, k;
      lineW(g, R * 0.0042, 150);
      for (k = 0; k < 40; k++) {                        // overlapping-circle rosette (spirograph) like a watch dial
        var a = k / 40 * Math.PI * 2; g.beginPath(); g.arc(R + Math.cos(a) * R * 0.26, R + Math.sin(a) * R * 0.26, R * 0.34, 0, 7); g.stroke();
      }
      lineW(g, R * 0.0036, 140);
      for (i = 0; i < 160; i++) { var b = i / 160 * Math.PI * 2; g.beginPath(); g.moveTo(R + Math.cos(b) * R * 0.66, R + Math.sin(b) * R * 0.66); g.lineTo(R + Math.cos(b) * R * 0.85, R + Math.sin(b) * R * 0.85); g.stroke(); }
      g.fillStyle = gray(44); g.beginPath(); g.arc(R, R, R * 0.6, 0, 7); g.fill();          // mirror disc over the rosette core...
      lineW(g, R * 0.0042, 150);
      for (k = 0; k < 28; k++) { var a2 = k / 28 * Math.PI * 2; g.beginPath(); g.arc(R + Math.cos(a2) * R * 0.17, R + Math.sin(a2) * R * 0.17, R * 0.2, 0, 7); g.stroke(); }
      lineW(g, R * 0.012, 175); g.beginPath(); g.arc(R, R, R * 0.6, 0, 7); g.stroke();
    }
    // height -> blurred height -> normal map + roughness map; chunked so no task blocks the main thread
    function makeFaceMaps(draw, N, f, done) {
      var c = canvasEl(N), g = c.getContext("2d", { willReadFrequently: true });
      draw(g, N, f);
      var src = g.getImageData(0, 0, N, N).data, h = new Float32Array(N * N), tmp = new Float32Array(N * N), i;
      for (i = 0; i < N * N; i++) h[i] = src[i * 4] / 255;
      var rad = Math.max(1, Math.round(N / 560));
      function blurPass(a, b, horiz) {
        for (var y = 0; y < N; y++) {
          var acc = 0, cnt = 0, d = 2 * rad + 1;
          for (var k = -rad; k <= rad; k++) { var xx = clamp(k, 0, N - 1); acc += horiz ? a[y * N + xx] : a[xx * N + y]; }
          for (var x = 0; x < N; x++) {
            if (horiz) b[y * N + x] = acc / d; else b[x * N + y] = acc / d;
            var add = clamp(x + rad + 1, 0, N - 1), sub = clamp(x - rad, 0, N - 1);
            acc += horiz ? a[y * N + add] - a[y * N + sub] : a[add * N + y] - a[sub * N + y];
          }
        }
      }
      var steps = [
        function () { blurPass(h, tmp, true); blurPass(tmp, h, false); },
        function () { blurPass(h, tmp, true); blurPass(tmp, h, false); }
      ];
      var nc = canvasEl(N), ng = nc.getContext("2d"), nImg = ng.createImageData(N, N), rc = canvasEl(N), rg2 = rc.getContext("2d"), rImg = rg2.createImageData(N, N);
      var k = 9 * N / 1024, rr = rnd(3), band = 8;
      for (var b = 0; b < band; b++) (function (b) {
        steps.push(function () {
          var y0 = Math.floor(b * N / band), y1 = Math.floor((b + 1) * N / band);
          for (var y = y0; y < y1; y++) for (var x = 0; x < N; x++) {
            var xm = x > 0 ? x - 1 : x, xp = x < N - 1 ? x + 1 : x, ym = y > 0 ? y - 1 : y, yp = y < N - 1 ? y + 1 : y;
            var dx = (h[y * N + xp] - h[y * N + xm]) * 0.5 * k, dy = (h[yp * N + x] - h[ym * N + x]) * 0.5 * k, il = 1 / Math.sqrt(dx * dx + dy * dy + 1), p = (y * N + x) * 4;
            nImg.data[p] = (-dx * il * 0.5 + 0.5) * 255; nImg.data[p + 1] = (dy * il * 0.5 + 0.5) * 255; nImg.data[p + 2] = (il * 0.5 + 0.5) * 255; nImg.data[p + 3] = 255;
            var hv = h[y * N + x], fr = smooth((hv - 0.22) / 0.2);        // field = polished mirror, relief = frosted
            var ro = 0.1 + 0.46 * fr + (rr() - 0.5) * 0.05 + 0.03 * (0.5 + 0.5 * Math.cos(Math.atan2(y - N / 2, x - N / 2) * 3)) * (1 - fr);   // faint satin sectors = polish that sweeps rImg.data[p] = 0; rImg.data[p + 1] = clamp(ro, 0, 1) * 255; rImg.data[p + 2] = 0; rImg.data[p + 3] = 255;
          }
        });
      })(b);
      steps.push(function () {
        ng.putImageData(nImg, 0, 0); rg2.putImageData(rImg, 0, 0);
        var nt = ctexture(nc), rt = ctexture(rc); nt.generateMipmaps = true; rt.generateMipmaps = true;
        renderer.initTexture(nt); renderer.initTexture(rt); done({ n: nt, r: rt });
      });
      return steps;
    }
    var coinBuildStarted = false;
    function buildCoin(then) {
      if (coinBuildStarted) return; coinBuildStarted = true;
      var N = Q.tex, f = featured || FALLBACK[0];
      var a = makeFaceMaps(drawObverse, N, f, function (m) { faceO.normalMap = m.n; faceO.roughnessMap = m.r; faceO.normalScale.set(0.5, 0.5); });
      var b = makeFaceMaps(drawReverse, N, f, function (m) { faceR.normalMap = m.n; faceR.roughnessMap = m.r; faceR.normalScale.set(0.5, 0.5); });
      var q = a.concat(b);
      if (f.photo) q.push(function () {                      // real obverse photo (Phase 2) replaces the medallion face
        var im = new Image(); im.crossOrigin = "anonymous";
        im.onload = function () { if (!alive) return; try { var S = 1024, c = canvasEl(S), g = c.getContext("2d"); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip(); var m = Math.min(im.width, im.height); g.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, S, S); var t = ctexture(c, { srgb: true }); faceMats[0].map = t; faceMats[0].color.set(0xffffff); faceMats[0].normalMap = null; faceMats[0].roughness = 0.35; faceMats[0].roughnessMap = null; faceMats[0].needsUpdate = true; } catch (e) {} };
        im.src = f.photo;
      });
      q.push(function () { coinReady = true; coin.visible = true; if (then) then(); });
      var faceO = faceMats[0], faceR = faceMats[1], idx = 0;
      (function run() { if (!alive) return; var s = performance.now(); try { q[idx++](); } catch (e) { if (window.console) console.warn("coin step", e); } if (idx < q.length) setTimeout(run, 0); })();
    }

    bootMark("coin");
    /* ================= lights ================= */
    var key = new THREE.SpotLight(0xffd6a8, 0, 0, 0.34, 0.85, 2);       // warm tungsten key, upper left
    key.position.set(-3.6, 4.6, 7.4); key.target.position.set(0.1, -0.1, 0.2); scene.add(key, key.target);
    key.castShadow = true; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.near = 4; key.shadow.camera.far = 16; key.shadow.radius = 3;
    var rimL = new THREE.SpotLight(0xe8ecf4, 0, 0, 0.5, 0.9, 2);         // cool-neutral edge light from the right so silver edges read
    rimL.position.set(5.2, 1.4, 4.6); rimL.target.position.set(-0.2, 0.2, 0.2); scene.add(rimL, rimL.target);
    var spill = new THREE.SpotLight(0xfff0dc, 0, 0, 0.62, 0.7, 1.6);    // light pouring out of the opened vault
    spill.position.set(0, 0.05, -1.0); spill.target.position.set(0, -0.9, 8); scene.add(spill, spill.target);
    var coinKey = new THREE.SpotLight(0xffe2bd, 0, 0, 0.3, 0.92, 2);    // product-shot key above the coin
    coinKey.position.set(0.9, 3.0, COIN_Z + 2.4); coinKey.target.position.set(0, COIN_Y, COIN_Z); scene.add(coinKey, coinKey.target);
    var coinRim = new THREE.SpotLight(0xdfe6f2, 0, 0, 0.34, 0.9, 2);    // back-right kicker for the reeded edge
    coinRim.position.set(2.4, 0.9, COIN_Z - 2.6); coinRim.target.position.set(0, COIN_Y, COIN_Z); scene.add(coinRim, coinRim.target);
    var sweep = new THREE.SpotLight(0xfff1dc, 0, 0, 0.17, 0.9, 2);    // a travelling polish highlight that glides across the field as the medallion turns
    sweep.position.set(-0.6, COIN_Y + 0.2, COIN_Z + 1.4); sweep.target.position.set(0, COIN_Y, COIN_Z); scene.add(sweep, sweep.target);
    var coinFill = new THREE.PointLight(0xfff4e8, 0, 0, 2);
    coinFill.position.set(-1.6, 0.4, COIN_Z + 2.6); scene.add(coinFill);

    bootMark("lights");
    /* ================= volumetrics: cone-shader light shafts + GPU dust ================= */
    var NOISE_GLSL = [
      "float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }",
      "float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }"
    ].join("\n");
    var beamDefs = [];
    function makeBeam(apex, target, len, rEnd, color, rim) {
      var dir = new THREE.Vector3().subVectors(target, apex).normalize();
      var g = new THREE.CylinderGeometry(0.015, rEnd, len, 56, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
      var m = new THREE.ShaderMaterial({
        uniforms: { uK: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uNoise: { value: 1 }, uSeed: { value: Math.random() * 10 } },
        vertexShader: ["varying vec3 vW; varying vec3 vN; varying vec2 vUv;",
          "void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vUv = vec2(uv.x, 1.0-uv.y); gl_Position = projectionMatrix*viewMatrix*w; }"].join("\n"),
        fragmentShader: ["uniform float uK, uTime, uNoise, uSeed; uniform vec3 uColor; varying vec3 vW; varying vec3 vN; varying vec2 vUv;", NOISE_GLSL,
          "void main(){",
          " vec3 V = normalize(cameraPosition - vW); float f = abs(dot(normalize(vN), V));",
          " float core = pow(f, 1.6);",
          " float along = vUv.y;",
          " float a = smoothstep(0.0, 0.12, along) * pow(1.0 - along, 1.25);",
          " float nz = 1.0;",
          " if (uNoise > 0.5) { float s1 = vn(vec2(vUv.x*26.0 + uSeed, along*2.2 - uTime*0.08)); float s2 = vn(vec2(vUv.x*9.0 - uSeed, along*5.0 + uTime*0.05)); nz = 0.42 + 1.1*(s1*0.55 + s2*0.45); }",
          " float cam = smoothstep(0.15, 1.8, distance(cameraPosition, vW));",
          " gl_FragColor = vec4(uColor * (uK * core * a * nz * cam), 1.0);",
          "}"].join("\n"),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      var mesh = new THREE.Mesh(g, m); mesh.position.copy(apex); mesh.lookAt(target); mesh.frustumCulled = false; mesh.renderOrder = 5; scene.add(mesh);
      var def = { mesh: mesh, mat: m, apex: apex.clone(), dir: dir, cosO: Math.cos(Math.atan2(rEnd, len)) , cosI: Math.cos(Math.atan2(rEnd * 0.35, len)), len: len, k: 0 };
      beamDefs.push(def); return def;
    }
    var bKey = makeBeam(new THREE.Vector3(-3.6, 4.6, 7.4), new THREE.Vector3(0.1, -0.1, 0.2), 9.4, 2.6, 0xffd9b0);
    var bSpill = makeBeam(new THREE.Vector3(0, 0.05, -0.7), new THREE.Vector3(0, -0.6, 9), 9.8, 3.8, 0xfff2e0);
    var bCoin = makeBeam(new THREE.Vector3(0.9, 3.0, COIN_Z + 2.4), new THREE.Vector3(0, COIN_Y - 0.6, COIN_Z), 4.4, 1.15, 0xffe6c4);
    var dust, dustMat, nDust = TIERS[0].dust;
    (function () {
      var pos = new Float32Array(nDust * 3), seed = new Float32Array(nDust * 4), r = rnd(21);
      for (var i = 0; i < nDust; i++) {
        var out = r() < 0.62;
        pos[i * 3] = out ? (r() - 0.5) * 8 : (r() - 0.5) * 3.2; pos[i * 3 + 1] = out ? -1.8 + r() * 5 : -0.9 + r() * 2.6; pos[i * 3 + 2] = out ? -0.5 + r() * 9.5 : -1.5 - r() * 5.6;
        seed[i * 4] = 0.4 + r(); seed[i * 4 + 1] = 0.5 + r(); seed[i * 4 + 2] = 0.4 + r() * 1.4; seed[i * 4 + 3] = r();
      }
      var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
      var A = [], D = [], C = [], K = [], Ls = [];
      beamDefs.forEach(function (b) { A.push(b.apex); D.push(b.dir); C.push(new THREE.Vector2(b.cosO, b.cosI)); K.push(0); Ls.push(b.len); });
      dustMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uSize: { value: 0.007 }, uApex: { value: A }, uDir: { value: D }, uCos: { value: C }, uK: { value: K }, uLen: { value: Ls }, uAll: { value: 1 } },
        vertexShader: ["attribute vec4 aSeed; uniform float uTime, uPx, uSize, uAll; uniform vec3 uApex[3]; uniform vec3 uDir[3]; uniform vec2 uCos[3]; uniform float uK[3]; uniform float uLen[3]; varying float vB;",
          "void main(){",
          " vec3 p = position + vec3(sin(uTime*0.23*aSeed.x + aSeed.w*40.0), cos(uTime*0.17*aSeed.y + aSeed.w*23.0)*0.8, sin(uTime*0.13*aSeed.x + aSeed.w*11.0))*0.35*aSeed.x;",
          " p.y -= mod(uTime*0.025*aSeed.y + aSeed.w*3.0, 3.0) - 1.5;",
          " float b = 0.0;",
          " for (int i = 0; i < 3; i++) { vec3 d = p - uApex[i]; float L = length(d); float c = dot(d/L, uDir[i]); b += uK[i]*smoothstep(uCos[i].x, uCos[i].y, c)*smoothstep(0.3, 1.2, L)*(1.0 - smoothstep(0.55, 1.0, L/uLen[i])); }",
          " b *= 0.5 + 0.5*sin(uTime*aSeed.z*2.3 + aSeed.w*60.0);",
          " vB = b*uAll;",
          " vec4 mv0 = viewMatrix*vec4(p, 1.0); vB *= smoothstep(0.9, 3.0, -mv0.z);",
          " vec4 mv = viewMatrix*vec4(p, 1.0);",
          " gl_Position = projectionMatrix*mv;",
          " gl_PointSize = clamp(uSize*aSeed.y*uPx/max(-mv.z, 0.3), 1.2, 16.0*uPx);",
          "}"].join("\n"),
        fragmentShader: ["varying float vB; void main(){ if (vB < 0.003) discard; float d = length(gl_PointCoord-0.5)*2.0; float a = clamp(1.0-d, 0.0, 1.0); a *= a; gl_FragColor = vec4(vec3(1.0,0.93,0.82)*vB*a*3.2, 1.0); }"].join("\n"),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      dust = new THREE.Points(g, dustMat); dust.frustumCulled = false; dust.renderOrder = 6; scene.add(dust);
    })();

    bootMark("vol");
    /* ================= post-processing ================= */
    var quadGeo = new THREE.BufferGeometry();
    quadGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    quadGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    var quad = new THREE.Mesh(quadGeo, null); quad.frustumCulled = false;
    var postScene = new THREE.Scene(); postScene.add(quad);
    var postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    var pmats = [];
    function pmat(fs, uni) { var m = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false }); pmats.push(m); return m; }
    var mPre = pmat(["uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uTh; varying vec2 vUv;",
      "vec3 s(vec2 o){ return min(texture2D(tSrc, vUv + o*uTexel).rgb, vec3(8.0)); }",
      "void main(){",
      " vec3 c = (s(vec2(-1.0,-1.0)) + s(vec2(1.0,-1.0)) + s(vec2(-1.0,1.0)) + s(vec2(1.0,1.0)))*0.25;",
      " float l = max(c.r, max(c.g, c.b)); float k = smoothstep(uTh*0.55, uTh*1.6, l);",
      " gl_FragColor = vec4(c*k, 1.0); }"].join("\n"), { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uTh: { value: 1.0 } });
    var mDown = pmat(["uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;",
      "vec3 s(float x, float y){ return texture2D(tSrc, vUv + vec2(x,y)*uTexel).rgb; }",
      "void main(){",
      " vec3 a=s(-2.,2.), b=s(0.,2.), c=s(2.,2.), d=s(-2.,0.), e=s(0.,0.), f=s(2.,0.), g=s(-2.,-2.), h=s(0.,-2.), i=s(2.,-2.), j=s(-1.,1.), k=s(1.,1.), l=s(-1.,-1.), m=s(1.,-1.);",
      " gl_FragColor = vec4(e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125, 1.0); }"].join("\n"), { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    var mUp = pmat(["uniform sampler2D tSrc, tAdd; uniform vec2 uTexel; varying vec2 vUv;",
      "vec3 s(float x, float y){ return texture2D(tSrc, vUv + vec2(x,y)*uTexel).rgb; }",
      "void main(){",
      " vec3 u = s(-1.,1.)+s(1.,1.)+s(-1.,-1.)+s(1.,-1.) + 2.0*(s(0.,1.)+s(0.,-1.)+s(-1.,0.)+s(1.,0.)) + 4.0*s(0.,0.);",
      " gl_FragColor = vec4(u/16.0 + texture2D(tAdd, vUv).rgb, 1.0); }"].join("\n"), { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    var mDepth = new THREE.ShaderMaterial({
      vertexShader: "varying float vZ; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix*mv; }",
      fragmentShader: "varying float vZ; void main(){ gl_FragColor = vec4(vZ, 0.0, 0.0, 1.0); }" });
    var compU = {
      tScene: { value: null }, tBloom: { value: null }, tBlur: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
      uExposure: { value: 1 }, uBloom: { value: 0.2 }, uFocus: { value: 6 }, uAperture: { value: 1.0 }, uDof: { value: 0 }, uFade: { value: 0 }, uVig: { value: 0.55 }, uGrain: { value: 0.03 },
      uIris: { value: -1 }, uIrisC: { value: new THREE.Vector2(0.5, 0.45) }, uIrisF: { value: 0.5 }, uRing: { value: 0 }
    };
    var mComp = pmat(["uniform sampler2D tScene, tBloom, tBlur, tDepth; uniform vec2 uRes, uIrisC; uniform float uTime, uExposure, uBloom, uFocus, uAperture, uDof, uFade, uVig, uGrain, uIris, uIrisF, uRing; varying vec2 vUv;",
      "float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }",
      "vec3 aces(vec3 x){ x *= 0.62; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }",
      "vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }",
      "void main(){",
      " vec2 uv = vUv; vec2 cc = uv - 0.5;",
      " vec2 ca = cc*0.0004*length(cc)*2.0;",
      " vec3 sharp = vec3(texture2D(tScene, uv + ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv - ca).b);",
      " sharp = clamp(sharp, vec3(0.0), vec3(6.0)); if (!(sharp.r >= 0.0 && sharp.g >= 0.0 && sharp.b >= 0.0)) sharp = vec3(0.0);",
      " vec3 col = sharp;",
      " if (uDof > 0.5) {",
      "  float z = texture2D(tDepth, uv).r;",
      "  float coc = uAperture * abs(z - uFocus) / max(z, 0.2) * uRes.y * 0.012;",
      "  coc = min(coc, 26.0);",
      "  float m = smoothstep(0.35, 3.0, coc);",
      "  if (m > 0.001) {",
      "   vec3 acc = vec3(0.0); float wsum = 0.0; float rad = coc/uRes.y;",
      "   for (int i = 0; i < 14; i++) { float fi = float(i) + 0.5; float r = sqrt(fi/14.0); float a = fi*2.39996; vec2 o = vec2(cos(a), sin(a))*r*rad*vec2(uRes.y/uRes.x, 1.0);",
      "    vec3 t = texture2D(tBlur, uv + o).rgb; float w = 1.0 + dot(t, vec3(0.33))*0.35; acc += t*w; wsum += w; }",
      "   col = mix(sharp, acc/wsum, m);",
      "  }",
      " }",
      " col += texture2D(tBloom, uv).rgb * uBloom;",
      " col *= uExposure;",
      " float vg = dot(cc*vec2(1.0, 0.85), cc*vec2(1.0, 0.85)); col *= 1.0 - uVig*smoothstep(0.08, 0.62, vg);",
      " col = aces(col);",
      " col = mix(col*vec3(0.985, 0.995, 1.01), col*vec3(1.012, 1.0, 0.985), smoothstep(0.2, 0.9, dot(col, vec3(0.333))));",   // faint steel shadows, warm highlights
      " col = toSRGB(col);",
      " col += (hash(uv*uRes + fract(uTime*7.3)*91.0) - 0.5) * uGrain * (1.0 - 0.5*dot(col, vec3(0.333)));",
      " col *= uFade;",
      " float a = 1.0;",
      " if (uIris > -0.5) {",
      "  vec2 dd = (uv - uIrisC) * vec2(uRes.x/uRes.y, 1.0); float dist = length(dd);",
      "  a = smoothstep(uIris - uIrisF, uIris, dist);",
      "  float ring = exp(-pow((dist - (uIris - uIrisF*0.5))/(uIrisF*0.28), 2.0)) * uRing;",
      "  col = col * a + vec3(1.0, 0.96, 0.9) * ring * 0.55; a = clamp(max(a, ring*0.55), 0.0, 1.0);",
      "  gl_FragColor = vec4(col, a); return;",
      " }",
      " gl_FragColor = vec4(col, 1.0); }"].join("\n"), compU);

    var T = null;
    function makeRT(w, h, o) {
      o = o || {};
      var p = { type: o.ldr || !hdr ? THREE.UnsignedByteType : THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: o.near ? THREE.NearestFilter : THREE.LinearFilter, magFilter: o.near ? THREE.NearestFilter : THREE.LinearFilter, depthBuffer: !!o.depth, stencilBuffer: false };
      var rt = o.msaa ? new THREE.WebGLMultisampleRenderTarget(Math.max(1, w), Math.max(1, h), p) : new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), p);
      if (o.msaa) rt.samples = 4; rt.texture.generateMipmaps = false; return rt;
    }
    function freeTargets() { if (!T) return; T.all.forEach(function (rt) { rt.dispose(); }); T = null; }
    function buildTargets(W, H) {
      freeTargets(); T = { all: [], W: W, H: H, tier: tier };
      function add(rt) { T.all.push(rt); return rt; }
      if (!Q.post) return;
      T.scene = add(makeRT(W, H, { depth: 1, msaa: Q.msaa && caps.isWebGL2 && typeof THREE.WebGLMultisampleRenderTarget === "function" }));
      T.A = []; T.B = [];
      for (var i = 1; i <= Q.lv; i++) { T.A[i] = add(makeRT(Math.max(2, W >> i), Math.max(2, H >> i))); if (i < Q.lv) T.B[i] = add(makeRT(Math.max(2, W >> i), Math.max(2, H >> i))); }
      if (Q.dof) { T.depth = add(makeRT(W >> 1, H >> 1, { depth: 1, near: 1 })); T.D1 = add(makeRT(W >> 1, H >> 1)); T.D2 = add(makeRT(W >> 2, H >> 2)); }
    }
    function pass(m, src, dst) {
      if (m.uniforms.tSrc) { m.uniforms.tSrc.value = src.texture; m.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); }
      quad.material = m; renderer.setRenderTarget(dst); renderer.render(postScene, postCam);
    }
    var hideInDepth = [dust, bKey.mesh, bSpill.mesh, bCoin.mesh];
    function renderFrame() {
      var W = T.W, H = T.H;
      if (!Q.post) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
      renderer.setRenderTarget(T.scene); renderer.render(scene, camera);
      var dofOn = Q.dof && compU.uDof.value > 0.5;
      if (dofOn) {
        hideInDepth.forEach(function (o) { o.visible = false; });
        var bg = scene.background; scene.background = null; scene.overrideMaterial = mDepth;
        renderer.setClearColor(0xffffff, 1); renderer.setRenderTarget(T.depth); renderer.clear(); renderer.render(scene, camera);
        scene.overrideMaterial = null; scene.background = bg; renderer.setClearColor(0x000000, 1);
        hideInDepth.forEach(function (o) { o.visible = true; });
        pass(mDown, T.scene, T.D1); pass(mDown, T.D1, T.D2);
      }
      mPre.uniforms.uTh.value = 1.0;
      pass(mPre, T.scene, T.A[1]);
      for (var i = 2; i <= Q.lv; i++) pass(mDown, T.A[i - 1], T.A[i]);
      for (var j = Q.lv - 1; j >= 1; j--) { mUp.uniforms.tAdd.value = T.A[j].texture; pass(mUp, j === Q.lv - 1 ? T.A[Q.lv] : T.B[j + 1], T.B[j]); }
      compU.tScene.value = T.scene.texture; compU.tBloom.value = (Q.lv > 1 ? T.B[1] : T.A[1]).texture;
      compU.tBlur.value = T.D2 ? T.D2.texture : T.scene.texture; compU.tDepth.value = T.depth ? T.depth.texture : T.scene.texture;
      compU.uRes.value.set(W, H); compU.uDof.value = dofOn ? 1 : 0;
      quad.material = mComp; renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    }
    function applyEncoding() {
      var direct = !Q.post;
      var enc = direct ? THREE.sRGBEncoding : THREE.LinearEncoding, tm = direct ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
      if (renderer.outputEncoding !== enc || renderer.toneMapping !== tm) { renderer.outputEncoding = enc; renderer.toneMapping = tm; renderer.toneMappingExposure = 1.0; mats.forEach(function (m) { m.needsUpdate = true; }); }
    }

    bootMark("post");
    /* ================= layout ================= */
    var rig = { zD: 7, dEnd: 3, shift: 0.14, aspect: 1 };
    function layout() {
      var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
      viewW = w; viewH = h;
      dpr = Math.min(window.devicePixelRatio || 1, Q.dpr);
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      var W = Math.floor(w * dpr), H = Math.floor(h * dpr);
      if (!T || T.W !== W || T.H !== H || T.tier !== tier) buildTargets(W, H);
      var asp = w / h; camera.aspect = asp; rig.aspect = asp;
      var tanD = Math.tan(THREE.MathUtils.degToRad(36 / 2));
      rig.zD = Math.max(2.9 / (2 * tanD * asp), 5.9);                    // door (with bolts) fills the width on a phone, the height on a monitor
      var tanC = Math.tan(THREE.MathUtils.degToRad(27 / 2)), cw = COIN_R * 2 * 1.06;
      rig.dEnd = Math.max(cw / (0.4 * 2 * tanC), cw / (0.6 * 2 * tanC * asp));   // coin: at most 44% of the height, 62% of the width
      rig.shift = asp < 0.8 ? 0.2 : 0.26;
      dustMat.uniforms.uPx.value = h * dpr / (2 * tanD);
      applyEncoding(); camera.updateProjectionMatrix();
    }

    /* ================= timeline ================= */
    var TL = { strike: 0.34, wheel0: 1.2, wheel1: 2.5, bolt0: 1.45, boltStep: 0.058, boltDur: 0.34, clunk: 2.5, door0: 2.65, door1: 3.95, coinLight: 2.9, type: 5.05, mark: 5.5, hand0: 5.6, hand1: 6.5 };
    function curve(k, t) {                                    // monotone cubic Hermite through [time, value] keys
      var n = k.length; if (t <= k[0][0]) return k[0][1]; if (t >= k[n - 1][0]) return k[n - 1][1];
      var i = 0; while (t > k[i + 1][0]) i++;
      function sl(j) { if (j <= 0 || j >= n - 1) return 0; var a = (k[j][1] - k[j - 1][1]) / (k[j][0] - k[j - 1][0]), b = (k[j + 1][1] - k[j][1]) / (k[j + 1][0] - k[j][0]); return a * b <= 0 ? 0 : 2 * a * b / (a + b); }
      var t0 = k[i][0], t1 = k[i + 1][0], v0 = k[i][1], v1 = k[i + 1][1], d = t1 - t0, u = (t - t0) / d, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * d * sl(i) + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * d * sl(i + 1);
    }
    var cueFired = {}, boltFired = [], wheelTicks = 0;
    function cue(name, t, at, fn) { if (t >= at && !cueFired[name]) { cueFired[name] = 1; fn(); } }
    var camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), shake = 0, lastBoltsDone = 0;
    var featEl = $(".ts-feature"), markEl = $(".ts-mark"), handoffOn = false, typeA = -1, typeM = -1;

    function update(t, dt) {
      var zD = rig.zD, zEnd = COIN_Z + rig.dEnd;
      // --- lamp strike: relay flicker, then a warm-up ---
      var s = t - TL.strike, lamp = s < 0 ? 0 : s < 0.07 ? 0.16 : s < 0.13 ? 0.02 : s < 0.2 ? 0.5 : s < 0.25 ? 0.12 : 0.5 + 0.5 * smooth((s - 0.25) / 1.2);
      key.intensity = 300 * lamp; bKey.k = 0.3 * lamp; rimL.intensity = 40 * smooth((t - 0.9) / 1.2);
      var envK = smooth((t - 0.38) / 1.3);
      for (var i = 0; i < envMats.length; i++) envMats[i].envMapIntensity = envBase[i] * envK;
      // --- wheel + bolts ---
      var wp = easeInOutSine((t - TL.wheel0) / (TL.wheel1 - TL.wheel0));
      wheel.rotation.z = -wp * Math.PI * 0.62;
      for (var b = 0; b < BOLTS; b++) {
        var st = TL.bolt0 + b * TL.boltStep, p = (t - st) / TL.boltDur, e = p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.pow(1 - p, 3) + 0.05 * Math.sin(p * Math.PI * 2) * (1 - p);
        bolts[b].position.x = 0.36 * clamp(e, 0, 1.03);
        if (p >= 0.55 && !boltFired[b]) { boltFired[b] = 1; Sfx.bolt(b); shake = Math.max(shake, 0.18); }
      }
      while (wheelTicks < 14 && t >= TL.wheel0 + 0.05 + wheelTicks * 0.085 && t < TL.wheel1) { Sfx.tick(wheelTicks); wheelTicks++; }
      cue("strike", t, TL.strike, function () { Sfx.strike(); });
      cue("clunk", t, TL.clunk, function () { Sfx.clunk(); shake = 1; });
      cue("groan", t, TL.door0 - 0.05, function () { Sfx.groan(); });
      cue("whoosh", t, 3.55, function () { Sfx.whoosh(); });
      cue("shimmer", t, 4.9, function () { Sfx.shimmer(); });
      // --- door ---
      var dw = easeInOut((t - TL.door0) / (TL.door1 - TL.door0));
      doorPivot.rotation.y = -dw * 1.92;
      door.position.z = DZ + 0.07 * smooth((t - (TL.clunk + 0.05)) / 0.3);
      // --- light pouring out + the chamber coming alive ---
      var open = smooth((t - 2.95) / 1.5), cl = smooth((t - TL.coinLight) / 1.2);
      spill.intensity = 220 * open; bSpill.k = 0.22 * open;
      coinKey.intensity = 34 * cl; bCoin.k = 0.2 * cl; coinRim.intensity = 85 * cl; coinFill.intensity = 1.5 * cl;
      var sw = smooth((t - 4.6) / 0.6) * (1 - smooth((t - 6.1) / 0.4)); sweep.intensity = 5 * sw; sweep.position.x = lerp(-0.7, 0.7, easeInOutSine((t - 4.6) / 1.9)); sweep.position.y = COIN_Y + 0.12 + 0.1 * Math.sin(t * 1.4);
      backdropMat.uniforms.uK.value = 0.34 * cl;
      // --- the coin ---
      var rev = smooth((t - 4.2) / 1.0);
      var yaw = -2.7 * (1 - easeOut3((t - 3.0) / 3.9)) + 0.15 * Math.sin(t * 1.15), tilt = 0.04 * Math.sin(t * 0.9 + 0.5);
      coinMesh.rotation.set(tilt, yaw, 0); coinMirror.rotation.set(tilt, yaw, 0);
            coin.position.y = COIN_Y + 0.014 * Math.sin(t * 1.3);
      coinMirror.position.y = 2 * (CH_FLOOR - coin.position.y) ;
      
      // --- camera ---
      var zK = [[0, zD * 1.2], [1.5, zD * 1.02], [3.3, zD * 0.6], [3.9, 1.8], [4.55, -1.7], [5.6, zEnd], [7, zEnd - 0.12]];
      var cz = curve(zK, t);
      var cx = curve([[0, -0.4], [1.6, -0.18], [3.2, 0.0], [3.7, 0.0], [5.2, 0.0], [6.6, 0.1]], t), cy = curve([[0, -0.3], [1.6, -0.12], [3.2, 0.02], [3.7, 0.0], [4.5, -0.1], [5.6, COIN_Y + 0.1]], t);
      var fov = curve([[0, 38], [3.2, 36], [4.2, 31], [5.6, 27], [7, 27]], t);
      camPos.set(cx, cy, cz);
      var lookZ = curve([[0, 0.2], [3.3, -0.2], [3.9, -2.2], [4.5, -4.0], [5.2, COIN_Z]], t);
      var lookY = curve([[0, 0.05], [3.6, 0.0], [4.5, COIN_Y], [5.4, COIN_Y - rig.dEnd * Math.tan(THREE.MathUtils.degToRad(13.5)) * rig.shift * 1.1]], t);
      var lookX = curve([[0, 0.0], [3.6, 0.0], [5.2, 0.0]], t);
      // a living hand: slow drift, no jitter on the final product shot
      var drift = 1 - smooth((t - 4.6) / 0.8) * 0.9;
      camPos.x += (Math.sin(t * 0.7) * 0.02 + Math.sin(t * 1.9) * 0.006) * drift; camPos.y += Math.sin(t * 0.55 + 1.0) * 0.015 * drift;
      if (shake > 0.001) { camPos.x += Math.sin(t * 90) * 0.012 * shake; camPos.y += Math.cos(t * 77) * 0.01 * shake; shake *= Math.pow(0.0006, dt || 0.016); }
      camera.position.copy(camPos); camLook.set(lookX, lookY, lookZ);
      camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(camLook);
      // --- depth of field: focus on the door, then pull to the coin ---
      var doorDist = Math.max(0.5, cz - 0.3), coinDist = Math.max(0.5, cz - COIN_Z);
      var focus = curve([[0, doorDist], [3.2, doorDist], [3.7, 4.2], [4.3, coinDist * 1.0], [4.9, coinDist]], t);
      compU.uFocus.value = t < 3.2 ? doorDist : (t < 4.3 ? lerp(Math.max(doorDist, 0.5), coinDist, smooth((t - 3.3) / 1.1)) : coinDist);
      compU.uAperture.value = t < 3.3 ? 0.75 : 1.3;
      compU.uDof.value = Q.dof ? 1 : 0;
      // --- exposure, bloom, fade ---
      var ex = curve([[0, 1.0], [3.5, 1.0], [4.1, 1.35], [4.5, 1.7], [5.1, 0.95], [5.6, 0.9], [5.95, 2.4], [6.5, 2.6]], t);
      compU.uExposure.value = ex; compU.uBloom.value = curve([[0, 0.12], [3.4, 0.14], [4.4, 0.26], [5.2, 0.09], [5.6, 0.1], [6.0, 0.3], [6.5, 0.4]], t);
      compU.uFade.value = smooth(t / 0.45) ; compU.uTime.value = t; compU.uVig.value = 0.5;
      dustMat.uniforms.uTime.value = t; backdropMat.uniforms.uTime.value = t;
      var dk = Q.vol >= 1 ? 1 : 0; beamDefs.forEach(function (bd, ii) { bd.mat.uniforms.uK.value = bd.k * dk; bd.mat.uniforms.uTime.value = t; bd.mat.uniforms.uNoise.value = Q.vol >= 2 ? 1 : 0; bd.mesh.visible = dk > 0 && bd.k > 0.001; dustMat.uniforms.uK.value[ii] = bd.k * 2.4 + (ii === 0 && t > TL.clunk && t < TL.clunk + 0.8 ? 1.1 * (1 - (t - TL.clunk) / 0.8) : 0); });
      dustMat.uniforms.uAll.value = Q.dust > 0 ? 1 : 0;
      // --- type ---
      if (t >= TL.type && !cueFired.type) { cueFired.type = 1; whenFeatured(showFeatureText); }
      var outk = 1 - smooth((t - TL.hand0) / 0.3), ta = smooth((t - TL.type) / 1.3) * outk, tm = smooth((t - TL.mark) / 1.3) * outk * 0.85;
      if (featEl && Math.abs(ta - typeA) > 0.003) { typeA = ta; featEl.style.opacity = ta; featEl.style.transform = "translateY(" + ((1 - ta) * 10).toFixed(1) + "px)"; var cl = featEl.firstChild; if (cl) { var ls = (0.62 - 0.16 * easeOut3((t - TL.type) / 1.8)).toFixed(3) + "em"; cl.style.letterSpacing = ls; cl.style.paddingLeft = ls; } }
      if (markEl && Math.abs(tm - typeM) > 0.003) { typeM = tm; markEl.style.opacity = tm; }
      // --- hand-off: the coin dissolves in light, the app appears underneath ---
      if (t >= TL.hand0 && !Q.post) { if (!cueFired.t4) { cueFired.t4 = 1; finish(true, 0.8); } return; }   // no-post tier: plain cross-fade
      if (t >= TL.hand0) {
        if (!handoffOn) { handoffOn = true; state = "handoff"; root.classList.add("ts-handoff"); html.classList.add("ts-reveal"); }
        var hp = clamp((t - TL.hand0) / (TL.hand1 - TL.hand0), 0, 1), he = easeInOut(clamp((hp - 0.18) / 0.82, 0, 1));
        v3.copy(coin.position).project(camera); compU.uIrisC.value.set(v3.x * 0.5 + 0.5, v3.y * 0.5 + 0.5);
        var asp = viewW / viewH, icx = compU.uIrisC.value.x * asp, icy = compU.uIrisC.value.y, rmax = Math.hypot(Math.max(icx, asp - icx), Math.max(icy, 1 - icy)), fth = lerp(0.3, 0.6, he);
        compU.uIris.value = lerp(0.0, rmax + fth, he); compU.uIrisF.value = fth; compU.uRing.value = Math.sin(Math.min(he * 1.1, 1) * Math.PI) * 1.0;
      } else compU.uIris.value = -1;
    }
    var v3 = new THREE.Vector3();

    /* ================= main loop ================= */
    var alive = true, raf = 0, t0 = 0, last = 0, frames = 0, probe = [], probed = false, manual = null, lastT = 0;
    function applyTier(n) {
      if (n === tier) return; tier = n; Q = TIERS[n];
      var wasShadow = renderer.shadowMap.enabled; renderer.shadowMap.enabled = Q.shadow > 0; if (wasShadow !== renderer.shadowMap.enabled) mats.forEach(function (m) { m.needsUpdate = true; });
      if (Q.shadow > 0 && key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
      key.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512); key.castShadow = Q.shadow > 0;
      dust.geometry.setDrawRange(0, Q.dust);
      layout();
    }
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (state === "done") return;
      if (hold && manual === null) return;
      if (!t0) {                                        // warm-up frame: draws black (compiles every program), THEN the clock starts
        try { update(0, 0.016); renderFrame(); } catch (err) { if (window.console) console.warn("splash frame", err); alive = false; finish(true, 0.3); return; }
        t0 = performance.now(); last = t0; frames = 1; return;
      }
      var t = manual !== null ? manual : Math.max(0, (now - t0) / 1000), dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
      // pick the tier from the frame time of the first ~500 ms (still dark, so a change is invisible); allow one more step down later
      if (!forced && manual === null) {
        if (frames > 2 && t < 0.5) probe.push(now - last);
        else if (!probed && t >= 0.5) {
          probed = true; var avg = probe.length ? probe.reduce(function (a, b) { return a + b; }, 0) / probe.length : 16;
          var nt = avg > 60 ? 4 : avg > 34 ? Math.max(tier, 3) : avg > 20.5 ? tier + 1 : tier;
          applyTier(clamp(nt, 0, 4)); coinTex();
        }
      } else if (!probed && t >= 0.45) { probed = true; coinTex(); }
      if (t > 1.0 && !forced && manual === null && tier < 3) {                      // sustained slowness mid-flight: step down once
        slow.push(now - last); if (slow.length > 24) slow.shift();
        if (slow.length === 24 && !stepped && slow.reduce(function (a, b) { return a + b; }, 0) / 24 > 38) { stepped = true; applyTier(tier + 1); slow = []; }
      }
      last = now; frames++;
      var pa = performance.now(); try { update(t, dt); renderFrame(); var pd = performance.now() - pa; perf.n++; perf.sum += pd; if (pd > perf.max) perf.max = pd; if (pd > 40 && perf.big.length < 40) perf.big.push([+t.toFixed(2), Math.round(pd)]); } catch (err) { if (window.console) console.warn("splash frame", err); alive = false; root.classList.remove("ts-glon"); finish(true, 0.3); return; }
      if (frames === 2) { root.classList.add("ts-glon"); }
      if (t >= TL.hand1 && manual === null) { finish(false); }
    }
    var slow = [], stepped = false, coinStarted = false, perf = { n: 0, sum: 0, max: 0, big: [], boot: {} };
    function coinTex() { if (coinStarted) return; coinStarted = true; var go = function () { loadFonts(function () { buildCoin(); }); }; whenFeatured(go); }
    function loadFonts(cb) {
      var done = false, fin = function () { if (!done) { done = true; cb(); } };
      try { if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('600 64px "Fraunces"'), document.fonts.load('500 14px "Fraunces"')]).then(fin, fin); setTimeout(fin, 700); } else fin(); } catch (e) { fin(); }
    }

    // initial state
    applyTier(tier === 0 ? 0 : tier);          // no-op rebuild guard below
    tier = tier; Q = TIERS[tier];
    key.shadow.mapSize.set(Q.shadow || 512, Q.shadow || 512); key.castShadow = Q.shadow > 0;
    dust.geometry.setDrawRange(0, Q.dust);
    layout();
    update(0, 0.016);
    var tb1 = performance.now();
    try { renderer.compile(scene, camera); } catch (e) {}
    perf.boot = { marks: bootM, plate: Math.round(tq1 - tq0), turned: Math.round(tq2 - tq1), guil: Math.round(tq3 - tq2), env: Math.round(tbEnv), textures: Math.round(tbTex), build: Math.round(tb1 - tb0), compile: Math.round(performance.now() - tb1) };
    raf = requestAnimationFrame(frame);

    gl = {
      layout: layout,
      dispose: function () {
        alive = false; cancelAnimationFrame(raf);
        try { window.__tsPerfLast = window.TitanSplash._debug.perf(); } catch (e) {}
        freeTargets();
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
            ["map", "normalMap", "roughnessMap", "bumpMap", "metalnessMap", "envMap"].forEach(function (k) { if (m[k] && m[k].dispose) m[k].dispose(); });
            m.dispose();
          });
        });
        mats.forEach(function (m) { ["normalMap", "roughnessMap", "bumpMap"].forEach(function (k) { if (m[k]) m[k].dispose(); }); m.dispose(); });
        pmats.forEach(function (m) { m.dispose(); }); mDepth.dispose(); quadGeo.dispose();
        owned.forEach(function (x) { try { x.dispose(); } catch (e) {} });
        if (scene.environment) scene.environment = null;
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
        try { renderer.domElement.width = 1; renderer.domElement.height = 1; } catch (e) {}
        if (window.TitanSplash) delete window.TitanSplash._debug;
      }
    };
    window.TitanSplash._debug = {
      seek: function (tt) {                      // deterministic frame for tests / video capture
        manual = tt; if (!t0) t0 = performance.now(); if (!probed) { probed = true; coinTex(); }
        update(tt, 0.016); renderFrame(); if (!root.classList.contains("ts-glon")) root.classList.add("ts-glon"); return true;
      },
      free: function () { manual = null; },
      perf: function () { return { frames: perf.n, avgMs: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, maxMs: +perf.max.toFixed(1), big: perf.big, boot: perf.boot }; },
      info: function () { return { tier: tier, hdr: hdr, webgl2: caps.isWebGL2, dpr: dpr, coinReady: coinReady, featured: featured, frames: frames, size: [viewW, viewH], cam: camera.position.toArray() }; },
      tier: function (n) { forced = true; applyTier(n); }
    };
  }
})();
