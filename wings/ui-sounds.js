/* Titan Reliquary · interface sounds (TitanUISounds).
   Short, soft, synthesized Web Audio cues that answer what the user does. Listens for `titan:ui` CustomEvents
   (detail.kind = flip | coin-open | coin-close | wing | search | simple-open | simple-close), dispatched by one-liners
   in app.js, wings/gallery.js and wings/simple.js. Also callable: TitanUISounds.play("flip").

   Routing: TitanGen.uiBus() -> { ctx, input } when the ambience engine offers it (shares output route, limiter, background play);
   otherwise a private AudioContext created on the first gesture, straight to destination.
   Ducking: TitanGen.duck(db, ms) if present (feature-detected; no ducking otherwise).
   Rules: nothing before the first user gesture; honours the global mute ("titan:mute", localStorage tr_mute_v1);
   setting "Interface sounds" (default on) + volume persisted in localStorage "titan.uisound.v1"; at most MAX_VOICES at once;
   one shared noise buffer per context, no convolvers. */
(function () {
  "use strict";
  var KEY = "titan.uisound.v1", MUTE_KEY = "tr_mute_v1", MAX_VOICES = 4;
  var S = { on: true, vol: 0.7 };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || "null"); if (raw) { if (typeof raw.on === "boolean") S.on = raw.on; if (typeof raw.vol === "number") S.vol = Math.min(1, Math.max(0, raw.vol)); } } catch (e) { /* ignore */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { /* ignore */ }
  var gestured = false, simpleOpen = false, coinOpen = false, ownCtx = null, ownOut = null;
  var noise = null, noiseCtx = null, voices = [];
  var stats = { played: {}, skipped: {}, duckCalls: 0, holds: 0 };
  var holdTimer = 0, lastWing = null, lastPlay = {};

  function count(o, k) { o[k] = (o[k] || 0) + 1; }
  function gen() { return window.TitanGen || null; }
  function busOf() { var g = gen(); try { return g && typeof g.uiBus === "function" ? g.uiBus() : null; } catch (e) { return null; } }

  /* ---- routing ---- */
  function route() {
    var b = busOf();
    if (b && b.ctx && b.input) return { ctx: b.ctx, out: b.input, shared: true };
    if (!gestured) return null;
    if (!ownCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ownCtx = new AC(); ownOut = ownCtx.createGain(); ownOut.gain.value = 1; ownOut.connect(ownCtx.destination); } catch (e) { ownCtx = null; return null; }
    }
    return { ctx: ownCtx, out: ownOut, shared: false };
  }
  function noiseBuf(ctx) {
    if (noise && noiseCtx === ctx) return noise;
    var n = Math.floor(ctx.sampleRate * 1.2), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 22222;
    for (var i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 1073741823.5) - 1; }
    noise = b; noiseCtx = ctx; return b;
  }

  /* ---- ducking ---- */
  function duck(db, ms) {
    var g = gen();
    if (g && typeof g.duck === "function") { try { g.duck(db, ms); stats.duckCalls++; } catch (e) { /* ignore */ } }
  }
  /* Reading mode: hold a duck while a coin view / the simple view is open. TitanGen.duck(db, ms) is timed, so renew it
     until released, then duck(0, 400) to bring the beds back. */
  var hold = { db: 0 };
  function holdDuck(db) {
    if (hold.db === db && holdTimer) return;
    hold.db = db; clearInterval(holdTimer); stats.holds++;
    duck(db, 20000);
    holdTimer = setInterval(function () { if (hold.db) duck(hold.db, 20000); }, 15000);
  }
  function releaseDuck() {
    clearInterval(holdTimer); holdTimer = 0;
    if (hold.db) { hold.db = 0; duck(0, 400); }
  }
  function syncHold() { var d = simpleOpen ? 6 : (coinOpen ? 4 : 0); if (d) holdDuck(d); else releaseDuck(); }

  /* ---- voices ---- */
  function voiceStart(ctx, dur) {
    var now = ctx.currentTime;
    voices = voices.filter(function (e) { return e > now; });
    if (voices.length >= MAX_VOICES) return false;
    voices.push(now + dur + 0.05);
    return true;
  }
  function env(ctx, out, t, peak, att, dec) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
    g.connect(out); return g;
  }
  function tone(ctx, out, t, f, peak, att, dec, type, f2) {
    var o = ctx.createOscillator(), g = env(ctx, out, t, peak, att, dec);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + att + dec);
    o.connect(g); o.start(t); o.stop(t + att + dec + 0.05);
  }
  function puff(ctx, out, t, dur, peak, type, f1, f2, q, att) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = type; bp.Q.value = q || 0.8;
    bp.frequency.setValueAtTime(f1, t); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = env(ctx, out, t, peak, att || 0.01, dur);
    s.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.8); s.stop(t + dur + (att || 0.01) + 0.05);
  }

  var SOUNDS = {
    /* coin tink: inharmonic partials, fast decay, slight random pitch */
    flip: { dur: 0.45, duck: [1.5, 300], fn: function (c, o, t) {
      var f = 1500 * Math.pow(2, (Math.random() - 0.5) * 0.28), r = [1, 2.32, 3.87, 5.41], p = [0.07, 0.04, 0.022, 0.012], d = [0.28, 0.2, 0.12, 0.08];
      for (var i = 0; i < r.length; i++) tone(c, o, t, f * r[i], p[i], 0.002, d[i]);
      puff(c, o, t, 0.02, 0.03, "highpass", 3500, 0, 0.7, 0.001);
      tone(c, o, t + 0.07, f * 0.62 * 2.32, 0.02, 0.002, 0.12);   // the coin settling
    } },
    /* velvet whoosh + tiny chime */
    "coin-open": { dur: 0.9, duck: [1.5, 300], fn: function (c, o, t) {
      puff(c, o, t, 0.34, 0.07, "bandpass", 380, 1300, 0.6, 0.12);
      tone(c, o, t + 0.12, 880, 0.035, 0.02, 0.6); tone(c, o, t + 0.12, 1318.5, 0.018, 0.02, 0.5);
    } },
    "coin-close": { dur: 0.4, duck: [1, 250], fn: function (c, o, t) {
      puff(c, o, t, 0.22, 0.04, "bandpass", 1100, 360, 0.6, 0.05);
      tone(c, o, t + 0.05, 659, 0.015, 0.02, 0.25);
    } },
    /* vault door: low thump + bolt latch, under 1 s */
    vault: { dur: 1.0, duck: [2, 700], fn: function (c, o, t) {
      tone(c, o, t, 95, 0.5, 0.006, 0.42, "sine", 42);
      puff(c, o, t, 0.2, 0.12, "lowpass", 500, 120, 0.7, 0.004);
      var L = [[0.30, 1], [0.46, 0.8]];
      for (var i = 0; i < L.length; i++) {
        var tt = t + L[i][0], k = L[i][1];
        tone(c, o, tt, 610, 0.07 * k, 0.001, 0.14); tone(c, o, tt, 1410, 0.05 * k, 0.001, 0.09); tone(c, o, tt, 2790, 0.025 * k, 0.001, 0.06);
        puff(c, o, tt, 0.03, 0.06 * k, "bandpass", 2400, 0, 1.2, 0.001);
      }
      tone(c, o, t + 0.55, 140, 0.12, 0.01, 0.3, "triangle", 70);
    } },
    wing: { dur: 0.12, duck: null, fn: function (c, o, t) {
      tone(c, o, t, 1900, 0.028, 0.002, 0.05); puff(c, o, t, 0.012, 0.012, "highpass", 4000, 0, 0.7, 0.001);
    } },
    search: { dur: 0.4, duck: [1, 250], fn: function (c, o, t) {
      puff(c, o, t, 0.3, 0.05, "bandpass", 1200, 3200, 0.5, 0.09);
    } }
  };

  function blocked() {
    if (!S.on) return "off";
    if (muted) return "muted";
    if (!gestured) return "nogesture";
    if (simpleOpen) return "simple";
    return null;
  }
  function play(kind) {
    var def = SOUNDS[kind]; if (!def) return false;
    var why = blocked();
    if (why) { count(stats.skipped, why); return false; }
    var now = performance.now();
    if (lastPlay[kind] && now - lastPlay[kind] < 60) { count(stats.skipped, "rate"); return false; }
    var r = route(); if (!r) { count(stats.skipped, "noroute"); return false; }
    var ctx = r.ctx;
    try { if (ctx.state === "suspended") ctx.resume(); } catch (e) { /* ignore */ }
    if (!voiceStart(ctx, def.dur)) { count(stats.skipped, "voices"); return false; }
    lastPlay[kind] = now;
    try {
      var out = ctx.createGain(); out.gain.value = Math.pow(S.vol, 1.6) * 1.4; out.connect(r.out);
      def.fn(ctx, out, ctx.currentTime + 0.005);
      setTimeout(function () { try { out.disconnect(); } catch (e) { /* ignore */ } }, (def.dur + 0.4) * 1000);
    } catch (e) { count(stats.skipped, "error"); return false; }
    count(stats.played, kind);
    if (def.duck && !hold.db) duck(def.duck[0], def.duck[1]);
    return true;
  }

  /* ---- event wiring ---- */
  window.addEventListener("titan:ui", function (e) {
    var d = e.detail || {}, k = d.kind;
    if (k === "simple-open") { simpleOpen = true; syncHold(); return; }
    if (k === "simple-close") { simpleOpen = false; syncHold(); return; }
    if (k === "coin-open") { var was = coinOpen; coinOpen = true; if (!was) play("coin-open"); syncHold(); return; }
    if (k === "coin-close") { var w = coinOpen; coinOpen = false; syncHold(); if (w) play("coin-close"); return; }
    if (k === "wing") {
      if (d.wing === lastWing) return;
      lastWing = d.wing;
      play(d.wing === "vault" ? "vault" : "wing"); return;
    }
    if (SOUNDS[k]) play(k);
  });
  window.addEventListener("titan:mute", function (e) { muted = !!(e.detail && e.detail.muted); });
  function onGesture() {
    gestured = true;
    document.removeEventListener("pointerdown", onGesture, true); document.removeEventListener("keydown", onGesture, true); document.removeEventListener("touchstart", onGesture, true);
  }
  document.addEventListener("pointerdown", onGesture, true); document.addEventListener("keydown", onGesture, true); document.addEventListener("touchstart", onGesture, true);

  /* ---- settings UI (Scene Studio > Sound > Settings) ---- */
  function mount(sheet) {
    if (!sheet || sheet.querySelector("#ss-ui-on")) return;
    var anchor = sheet.querySelector("#ss-moved"); if (!anchor || !anchor.parentNode) return;
    var box = document.createElement("div");
    box.className = "ss-uisounds";
    box.innerHTML = '<label class="ss-check"><input type="checkbox" id="ss-ui-on"><span>Interface sounds (soft clicks and whooshes)</span></label>' +
      '<div class="ss-row"><span>Interface volume</span><input type="range" id="ss-ui-vol" min="0" max="100" step="5" aria-label="Interface sound volume"></div>';
    anchor.parentNode.insertBefore(box, anchor);
    var on = box.querySelector("#ss-ui-on"), vol = box.querySelector("#ss-ui-vol");
    on.checked = S.on; vol.value = Math.round(S.vol * 100); vol.disabled = !S.on;
    on.addEventListener("change", function () { S.on = on.checked; vol.disabled = !S.on; save(); if (S.on) { gestured = true; play("wing"); } });
    var tm = 0;
    vol.addEventListener("input", function () { S.vol = vol.value / 100; save(); clearTimeout(tm); tm = setTimeout(function () { play("flip"); }, 160); });
  }

  window.TitanUISounds = {
    play: play, mount: mount,
    setEnabled: function (v) { S.on = !!v; save(); }, isEnabled: function () { return S.on; },
    setVolume: function (v) { S.vol = Math.min(1, Math.max(0, v)); save(); }, getVolume: function () { return S.vol; },
    stats: function () { return { played: stats.played, skipped: stats.skipped, duckCalls: stats.duckCalls, holds: stats.holds, voices: voices.length, hold: hold.db, muted: muted, on: S.on, gestured: gestured, shared: !!busOf(), ownCtx: ownCtx ? ownCtx.state : "none" }; },
    _debug: { ownCtx: function () { return ownCtx; }, ownOut: function () { return ownOut; } }
  };
})();
