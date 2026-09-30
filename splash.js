/* Titan Reliquary · splash.js — "The Vault" (splash v2, tr51)
   A one-per-session cinematic intro for the Grand Hall, rendered as a real 3D scene (three.js r128):
     · the camera starts in a pitch-dark vault; four spotlights snap on one by one (volumetric beams)
       revealing walls of brass safe-deposit boxes, marble columns and a great round vault door
     · a procedurally struck gold proof coin rises out of a black pedestal, lands with a chime, catches a
       light sweep and a lens glint; its ring lettering names a real coin from the collection
     · glossy black-marble floor with a genuine planar reflection (mirrored second render)
     · hand-written post-processing: HDR bloom (dual filter), anamorphic streak, depth-of-field focus pull,
       chromatic aberration, vignette, ACES filmic tone mapping, grain
     · ENTER: the dial spins, the vault door swings open, light floods out and the camera flies through
     · optional synthesized sound (off until you turn it on), tilt parallax on phones, haptic pulse on Enter
   Adaptive quality (5 tiers, drops while running if frames are slow); CSS coin without WebGL; quick fade with
   prefers-reduced-motion. Starts only if <html> has class "ts-on" (set by the inline gate in index.html).
   Replay:  TitanSplash.replay()  or ?splash=1.  Skip: ?nosplash.  Force a quality tier: ?splashq=0..4 */
(function () {
  "use strict";
  var html = document.documentElement;
  var root = document.getElementById("tr-splash");
  if (!root || !html.classList.contains("ts-on")) return;
  window.__tsReady = true;

  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s) { return root.querySelector(s); };
  var app = document.getElementById("app");
  var state = "intro";            // intro → entering → done
  var tStart = performance.now();
  var gl = null;                  // set when the 3D scene is running
  var timers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut3(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  /* ---------- title: split into letters ---------- */
  var idx = 0;
  [].forEach.call(root.querySelectorAll(".ts-line"), function (line) {
    var txt = line.textContent;
    line.textContent = "";
    for (var i = 0; i < txt.length; i++) {
      var s = document.createElement("span");
      s.className = "ts-l"; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", idx++);
      s.textContent = txt[i];
      line.appendChild(s);
    }
  });

  /* ---------- featured coin: a different real specimen each visit ---------- */
  var featured = null, featEl = $(".ts-feature"), featV = $(".ts-feature-v");
  function pickFeatured(v) {
    if (featured || !v || !v.flips || !v.flips.length) return;
    var list = v.flips.filter(function (f) { return f && f.country && f.year && f.denom; });
    if (!list.length) return;
    var last = null; try { last = localStorage.getItem("tr_splash_feat_v1"); } catch (e) {}
    var f, tries = 0;
    do { f = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && f.scan === last && ++tries < 10);
    try { localStorage.setItem("tr_splash_feat_v1", f.scan || ""); } catch (e) {}
    var country = String(f.country).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    var denom = f.label ? String(f.label).split(" · ").pop() : String(f.denom);
    if (!denom || /^\d{4}/.test(denom)) denom = String(f.denom).replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    featured = { country: country, year: String(f.year), denom: denom, scan: f.scan || "" };
    if (featV) featV.textContent = country + " · " + featured.year + " · " + denom;
    if (featEl) featEl.classList.add("ts-has");
    if (gl && gl.setFeatured) gl.setFeatured();
  }

  /* ---------- stats (from the live vault when available) ---------- */
  var statEls = {
    flips: $('[data-k="flips"]'), countries: $('[data-k="countries"]'), value: $('[data-k="value"]')
  };
  var fmt = {
    flips: function (n) { return Math.round(n).toLocaleString("en-US"); },
    countries: function (n) { return Math.round(n).toLocaleString("en-US"); },
    value: function (n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  };
  var target = { flips: 273, countries: 45, value: 5584 };   // last known; replaced by live data
  var shown = { flips: 0, countries: 0, value: 0 };
  var countStart = 0;
  function readVault() {
    var v = window.vault;
    if (!v || !v.flips) return false;
    var isos = {}, n = 0;
    v.flips.forEach(function (f) { if (f.iso && !isos[f.iso]) { isos[f.iso] = 1; n++; } });
    target.flips = v.flips.length; target.countries = n || target.countries;
    var g = v.board && v.board.grand; if (typeof g === "number") target.value = g;
    pickFeatured(v);
    return true;
  }
  var poll = setInterval(function () { if (readVault()) clearInterval(poll); }, 150);   // cleared at cleanup at the latest
  readVault();
  function tickStats(now) {
    if (!countStart) return;
    var e = clamp((now - countStart) / 1700, 0, 1), k = 1 - Math.pow(1 - e, 4);
    for (var key in statEls) {
      shown[key] += (target[key] * k - shown[key]) * 0.35;      // eases toward target, also follows late live data
      if (e >= 1) shown[key] = target[key];
      if (statEls[key]) statEls[key].textContent = fmt[key](shown[key]);
    }
  }
  later(function () { countStart = performance.now(); }, 3700);
  if (reduce) { countStart = 1; }
  // without the WebGL scene (fallback coin) the stats still need to count up
  var statTimer = setInterval(function () { if (!gl) tickStats(performance.now()); if (state === "done") clearInterval(statTimer); }, 50);

  /* ---------- layout: the coin fills the free band above the copy ---------- */
  function measure() {
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    var copyTop = $(".ts-copy").getBoundingClientRect().top;
    var topPad = h < 560 ? 10 : 56, avail = Math.max(copyTop - topPad - 6, 110);
    var coinPx = Math.min(avail * 0.9, w * 0.66, h * 0.46), cy = topPad + avail / 2;
    root.style.setProperty("--ts-cy", Math.round(cy) + "px");
    root.style.setProperty("--ts-coin", Math.round(coinPx) + "px");
    return { w: w, h: h, coinPx: coinPx, cy: cy };
  }
  measure();
  if (window.ResizeObserver) { try { new ResizeObserver(function () { if (state !== "done") { measure(); if (gl) gl.layout(); } }).observe($(".ts-copy")); } catch (e) {} }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (state !== "done") { measure(); if (gl) gl.layout(); } });

  /* ---------- sound: tiny synthesized design, off until the visitor turns it on ---------- */
  var Sfx = (function () {
    var KEY = "tr_splash_sound_v1", on = false, ctx = null, out = null, noise = null, drone = null;
    try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}
    function ensure() {
      if (!on) return null;
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
          ctx = new AC();
          var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
          out = ctx.createGain(); out.gain.value = 0.85; out.connect(comp); comp.connect(ctx.destination);
          var len = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          noise = buf;
        }
        if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      } catch (e) { ctx = null; return null; }
      return ctx;
    }
    function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
    function tone(type, f, t, peak, dec, f2, glide, att) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (glide || dec));
      env(g, t, att || 0.004, peak, dec); o.connect(g); g.connect(out); o.start(t); o.stop(t + (att || 0.004) + dec + 0.05);
    }
    function burst(t, peak, dec, ftype, freq, q, f2) {
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
      if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dec);
      env(g, t, 0.003, peak, dec); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.4); s.stop(t + dec + 0.1);
    }
    var api = {
      isOn: function () { return on; },
      set: function (v) {
        on = !!v; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
        if (on) { if (ensure()) api.drone(); } else api.stop(0.2);
      },
      gesture: function () { if (on && state === "intro") { if (ensure()) api.drone(); } },
      clunk: function (i) {                   // a theatre light snapping on
        if (!ctx) return; var t = ctx.currentTime + 0.01;
        burst(t, 0.45, 0.07, "bandpass", 2300 - i * 250, 3);
        tone("sine", 120 - i * 10, t, 0.55, 0.28, 45);
        burst(t + 0.005, 0.12, 0.5, "lowpass", 500, 0.7);
      },
      ring: function () {                     // the coin chimes as it settles
        if (!ctx) return; var t = ctx.currentTime + 0.01, f0 = 1760;
        [[1, 0.16, 2.6], [1.506, 0.11, 1.9], [2.24, 0.08, 1.3], [2.92, 0.05, 0.9], [3.66, 0.035, 0.6]].forEach(function (p) {
          tone("sine", f0 * p[0], t, p[1], p[2]); tone("sine", f0 * p[0] + 2.6, t, p[1] * 0.6, p[2] * 0.8);
        });
        burst(t, 0.2, 0.04, "highpass", 5000, 0.7);
        tone("sine", 196, t, 0.18, 1.4, 0, 0, 0.05);
      },
      drone: function () {
        if (!ctx || drone) return;
        var t = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter(), nodes = [];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 2.5);
        lp.type = "lowpass"; lp.frequency.value = 230; lp.Q.value = 0.9; lp.connect(g); g.connect(out);
        [[55, "sawtooth", 0.35], [55.35, "sawtooth", 0.35], [27.5, "sine", 0.9], [82.6, "triangle", 0.12]].forEach(function (d) {
          var o = ctx.createOscillator(), og = ctx.createGain(); o.type = d[1]; o.frequency.value = d[0]; og.gain.value = d[2];
          o.connect(og); og.connect(lp); o.start(t); nodes.push(o);
        });
        var n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
        n.buffer = noise; n.loop = true; nf.type = "bandpass"; nf.frequency.value = 140; nf.Q.value = 0.8; ng.gain.value = 0.5;
        n.connect(nf); nf.connect(ng); ng.connect(lp); n.start(t); nodes.push(n);
        var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 90;
        lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); nodes.push(lfo);
        drone = { g: g, nodes: nodes };
      },
      enter: function () {                    // bolts, the heavy thud, the door's breath, then light
        if (!ctx) return; var t = ctx.currentTime + 0.01;
        [0, 0.075, 0.15].forEach(function (d, i) { burst(t + d, 0.35, 0.05, "bandpass", 2600 - i * 300, 4); tone("square", 700 - i * 80, t + d, 0.04, 0.05, 300); });
        tone("sine", 78, t + 0.24, 0.95, 1.0, 30, 0.6);
        burst(t + 0.24, 0.55, 0.8, "lowpass", 260, 0.8);
        burst(t + 0.34, 0.14, 1.3, "bandpass", 260, 1.4, 2400);
        [440, 554.4, 659.3, 880, 1318.5].forEach(function (f, i) { tone("sine", f, t + 0.85 + i * 0.03, 0.045, 2.4, 0, 0, 0.35); });
        if (drone) { drone.g.gain.cancelScheduledValues(t); drone.g.gain.setValueAtTime(drone.g.gain.value || 0.2, t); drone.g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2); }
      },
      stop: function (fade) {
        if (!ctx) return; var c = ctx, o = out; ctx = null; drone = null;
        try { o.gain.setTargetAtTime(0.0001, c.currentTime, Math.max(fade, 0.01) / 3); } catch (e) {}
        setTimeout(function () { try { c.close(); } catch (e) {} }, fade * 1000 + 200);
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
  if (btnSound) btnSound.addEventListener("click", function (e) { e.stopPropagation(); Sfx.set(!Sfx.isOn()); syncSound(); });
  function onGesture() { Sfx.gesture(); }
  window.addEventListener("pointerdown", onGesture, true);

  /* ---------- tilt parallax on phones ---------- */
  var tilt = { on: false, x: 0, y: 0 }, coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return;
    tilt.on = true; tilt.x = clamp(e.gamma / 22, -1, 1); tilt.y = clamp((e.beta - 50) / 22, -1, 1);
  }
  var needPerm = !!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function");
  if (coarse && window.DeviceOrientationEvent && !needPerm) window.addEventListener("deviceorientation", onOrient);
  function askTilt() {                     // iOS: only from a tap, never on load; silently ignored if refused
    if (!needPerm || !coarse) return; needPerm = false;
    try { DeviceOrientationEvent.requestPermission().then(function (r) { if (r === "granted") window.addEventListener("deviceorientation", onOrient); }).catch(function () {}); } catch (e) {}
  }

  /* ---------- lifecycle ---------- */
  function lockApp(on) {
    if (!app) return;
    if (on) { app.setAttribute("aria-hidden", "true"); if ("inert" in app) app.inert = true; }
    else { app.removeAttribute("aria-hidden"); if ("inert" in app) app.inert = false; }
  }
  lockApp(true);
  root.classList.add("ts-run");

  var btnEnter = $(".ts-enter"), btnSkip = $(".ts-skip");
  function onKey(e) {
    if (state === "done") return;
    var k = e.key, tgt = e.target;
    var ownBtn = tgt && (tgt === btnSkip || tgt === btnSound);
    if ((k === "Enter" || k === " " || k === "Spacebar") && ownBtn) {
      e.stopPropagation();            // let Skip / Sound act on their own key press
    } else if (k === "Enter" || k === " " || k === "Spacebar") {
      e.preventDefault(); e.stopPropagation(); Sfx.gesture(); enter(false);
    } else if (k === "Escape") {
      e.preventDefault(); e.stopPropagation(); enter(true);
    } else if (k !== "Tab") {
      e.stopPropagation();            // keep the app's hotkeys quiet behind the splash
    }
  }
  window.addEventListener("keydown", onKey, true);

  btnEnter.addEventListener("click", function () { enter(false); });
  btnSkip.addEventListener("click", function () { enter(true); });
  later(function () { try { btnEnter.focus({ preventScroll: true }); } catch (e) {} }, 4300);

  function enter(skip) {
    if (state !== "intro") return;
    state = "entering";
    root.classList.add("ts-entering");
    if (!skip) { try { if (navigator.vibrate) navigator.vibrate([14, 70, 38]); } catch (e) {} }
    if (gl && !skip && !reduce) { Sfx.enter(); gl.startEnter(); }
    else { Sfx.stop(0.4); finish(); }
  }

  var finished = false;
  function finish() {
    if (finished) return; finished = true;
    html.classList.add("ts-reveal");                  // app becomes visible under the fading splash
    root.classList.add("ts-out");
    later(cleanup, 800);
  }
  function cleanup() {
    state = "done";
    clearInterval(poll); clearInterval(statTimer); timers.forEach(clearTimeout);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("deviceorientation", onOrient);
    if (gl) gl.dispose();
    gl = null;
    Sfx.stop(2.2);
    lockApp(false);
    html.classList.remove("ts-on", "ts-reveal");
    try { sessionStorage.setItem("tr_splash_v1", "1"); } catch (e) {}
    if (root.parentNode) root.parentNode.removeChild(root);
    try { window.dispatchEvent(new CustomEvent("titan:splash-done")); } catch (e) {}
  }
  function onResize() { measure(); if (gl) gl.layout(); }
  window.addEventListener("resize", onResize);

  window.TitanSplash = {
    replay: function () {
      try { sessionStorage.removeItem("tr_splash_v1"); } catch (e) {}
      var u = new URL(location.href); u.searchParams.set("splash", "1"); u.hash = ""; location.href = u.toString();
    }
  };

  /* ---------- 3D scene ---------- */
  function fail() { root.classList.add("ts-nogl"); root.classList.remove("ts-glon"); gl = null; }
  if (reduce || !window.THREE) { root.classList.add("ts-nogl"); return; }

  var fontReady = (document.fonts && document.fonts.load)
    ? Promise.race([document.fonts.load('600 64px "Fraunces"'), new Promise(function (r) { setTimeout(r, 900); })])
    : Promise.resolve();
  fontReady.then(function () {
    if (state === "done") return;
    try { initGL(); } catch (err) { if (window.console) console.warn("splash gl", err); if (gl && gl.dispose) { try { gl.dispose(); } catch (e) {} } fail(); }
  });

  function initGL() {
    var THREE = window.THREE;
    var canvas = $(".ts-gl");
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) { fail(); return; }
    if (!renderer.getContext()) { fail(); return; }
    canvas.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); if (alive === false || state === "done") return; if (gl) gl.dispose(); fail(); });
    renderer.setClearColor(0x000000, 1);
    renderer.localClippingEnabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    var caps = renderer.capabilities, ext = renderer.extensions;
    var maxAniso = caps.getMaxAnisotropy ? Math.min(caps.getMaxAnisotropy(), 8) : 1;
    var disposables = [];                 // textures + render targets we own
    function own(x) { disposables.push(x); return x; }

    /* --- quality tiers --- */
    var TIERS = [
      { dpr: 2,    msaa: 1, post: 1, refl: 1, dof: 1, streak: 1, lv: 5, dust: 1 },
      { dpr: 1.5,  msaa: 0, post: 1, refl: 1, dof: 1, streak: 1, lv: 5, dust: 1 },
      { dpr: 1.25, msaa: 0, post: 1, refl: 1, dof: 0, streak: 0, lv: 4, dust: 0.7 },
      { dpr: 1,    msaa: 0, post: 1, refl: 0, dof: 0, streak: 0, lv: 3, dust: 0.5 },
      { dpr: 1,    msaa: 0, post: 0, refl: 0, dof: 0, streak: 0, lv: 0, dust: 0.5 }
    ];
    var forced = /[?&]splashq=(\d)/.exec(location.search);
    var small = Math.min(window.innerWidth, window.innerHeight) < 520;
    var tier = (function () {
      if (forced) return clamp(+forced[1], 0, 4);
      var cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
      var save = navigator.connection && navigator.connection.saveData;
      if (save) return 3;
      if (cores <= 2 || mem <= 1) return 3;
      if (cores <= 4 || mem <= 2) return small ? 2 : 1;
      return small ? 1 : 0;
    })();
    var Q = TIERS[tier];

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.019);
    var FAR = 90;
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, FAR);
    var W3 = new THREE.Group();         // everything that is mirrored in the floor
    scene.add(W3);

    /* world layout (coin centre at the origin) */
    var RAD = 1.6, HALF = 0.09;
    var FLOOR = -4.1, CEIL = 8.5, WALLZ = -9.5, DOORY = -0.45, RD = 3.05, PED_TOP = -2.4;

    /* --- environment: a warm studio so the gold has something to mirror --- */
    (function () {
      var c = document.createElement("canvas"); c.width = 1024; c.height = 512;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#0d0a05"); g.addColorStop(0.45, "#3a2c12"); g.addColorStop(0.55, "#5a4520"); g.addColorStop(1, "#070503");
      x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
      if (x.filter !== undefined) x.filter = "blur(10px)";
      function box(x0, y0, w, h, col) { x.fillStyle = col; x.fillRect(x0, y0, w, h); }
      box(90, 110, 120, 240, "#fff1cf"); box(690, 90, 90, 260, "#ffe7b0"); box(360, 20, 300, 46, "#fffaf0");
      box(500, 300, 220, 30, "#c9d8ff"); box(0, 250, 1024, 14, "#b08a3a");
      var tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
      var pm = new THREE.PMREMGenerator(renderer);
      var rt = pm.fromEquirectangular(tex);
      scene.environment = own(rt.texture);
      tex.dispose(); pm.dispose();
    })();

    function canvasTex(c, srgb, rep) {
      var t = new THREE.CanvasTexture(c); t.anisotropy = maxAniso;
      if (srgb) t.encoding = THREE.sRGBEncoding;
      if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      return own(t);
    }
    function mkc(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
    function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

    /* ================= the coin ================= */
    var CX = 512, CY = 512, R = 512, S = 1024;
    function ringWords() {
      if (!featured) return "TITAN · RELIQUARY · VAULT & MUSEUM · MMXXVI · ";
      var t = (featured.country + " · " + featured.year + " · " + featured.denom).toUpperCase() + " · ";
      if (t.length < 34) t += "TITAN RELIQUARY · ";
      return t;
    }
    function paintFace(kind) {
      var cc = mkc(S), rc = mkc(S), bc = mkc(S);
      var g = cc.getContext("2d"), r = rc.getContext("2d"), b = bc.getContext("2d");
      var L = [
        { c: g, field: "#c99a36", dev: "#f4d98c" },
        { c: r, field: "#262626", dev: "#bdbdbd" },   // mirror field (low roughness), frosted devices
        { c: b, field: "#3a3a3a", dev: "#ffffff" }    // relief
      ];
      var bg = g.createRadialGradient(CX * 0.8, CY * 0.7, 40, CX, CY, R);
      bg.addColorStop(0, "#f0cf76"); bg.addColorStop(0.55, "#cf9f3a"); bg.addColorStop(1, "#9a6f1e");
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      r.fillStyle = L[1].field; r.fillRect(0, 0, S, S);
      b.fillStyle = L[2].field; b.fillRect(0, 0, S, S);
      g.save(); g.translate(CX, CY); g.lineWidth = 1.2;
      for (var i = 0; i < 260; i++) { var a = i / 260 * Math.PI * 2; g.strokeStyle = "rgba(255,244,205," + (0.03 + (i % 3) * 0.02) + ")"; g.beginPath(); g.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
      g.restore();
      function each(mode, fn) { L.forEach(function (l) { l.c.fillStyle = l.c.strokeStyle = l[mode]; fn(l.c); }); }
      function ring(rad, w, mode) { each(mode || "dev", function (c) { c.lineWidth = w; c.beginPath(); c.arc(CX, CY, rad, 0, 7); c.stroke(); }); }
      function disc(rad, mode) { each(mode || "dev", function (c) { c.beginPath(); c.arc(CX, CY, rad, 0, 7); c.fill(); }); }
      function beads(rad, n, size) { each("dev", function (c) { for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; c.beginPath(); c.arc(CX + Math.cos(a) * rad, CY + Math.sin(a) * rad, size, 0, 7); c.fill(); } }); }
      function ringText(text, rad, size) {
        var n = text.length, step = Math.PI * 2 / n;
        size = Math.min(size, Math.max(34, (Math.PI * 2 * rad / n) * 1.08));
        each("dev", function (c) {
          c.font = '600 ' + Math.round(size) + 'px "Fraunces", Georgia, serif'; c.textAlign = "center"; c.textBaseline = "middle";
          for (var i = 0; i < n; i++) {
            var a = -Math.PI / 2 + (i + 0.5) * step;
            c.save(); c.translate(CX + Math.cos(a) * rad, CY + Math.sin(a) * rad); c.rotate(a + Math.PI / 2); c.fillText(text[i], 0, 0); c.restore();
          }
        });
      }
      ring(R * 0.955, 18);
      beads(R * 0.885, 108, 5.5);
      if (kind === 0) {
        ringText(ringWords(), R * 0.775, 58);
        ring(R * 0.655, 5);
        each("dev", function (c) {
          for (var i = 0; i < 48; i++) {
            var a = i / 48 * Math.PI * 2, long = i % 2 === 0, r0 = R * 0.2, r1 = R * (long ? 0.5 : 0.42), hw = long ? 0.028 : 0.02;
            c.beginPath(); c.moveTo(CX + Math.cos(a - hw) * r0, CY + Math.sin(a - hw) * r0); c.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); c.lineTo(CX + Math.cos(a + hw) * r0, CY + Math.sin(a + hw) * r0); c.closePath(); c.fill();
          }
        });
        each("dev", function (c) {
          for (var side = -1; side <= 1; side += 2) {
            for (var k = 0; k < 15; k++) {
              var t = k / 14, a = Math.PI / 2 - side * (0.18 + t * 2.25);
              var rr = R * 0.585, px = CX + Math.cos(a) * rr, py = CY + Math.sin(a) * rr;
              c.save(); c.translate(px, py); c.rotate(a + (side < 0 ? Math.PI / 2 : -Math.PI / 2) + side * 0.55);
              c.beginPath(); c.ellipse(0, 0, 10 + (1 - t) * 7, 31 - t * 6, 0, 0, 7); c.fill(); c.restore();
            }
          }
        });
        disc(R * 0.19);
        each("field", function (c) {
          c.font = '600 190px "Fraunces", Georgia, serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("T", CX, CY + 12);
        });
        ring(R * 0.19, 6);
      } else {
        ringText("CUSTODIA · LEGATUM · MEMORIA · FIDES · ", R * 0.775, 58);
        ring(R * 0.655, 5);
        ring(R * 0.6, 10);
        each("dev", function (c) {
          c.lineCap = "round";
          for (var i = 0; i < 60; i++) { var a = i / 60 * Math.PI * 2, l = i % 5 === 0 ? 0.075 : 0.04; c.lineWidth = i % 5 === 0 ? 7 : 3.5; c.beginPath(); c.moveTo(CX + Math.cos(a) * R * 0.53, CY + Math.sin(a) * R * 0.53); c.lineTo(CX + Math.cos(a) * R * (0.53 - l), CY + Math.sin(a) * R * (0.53 - l)); c.stroke(); }
        });
        each("dev", function (c) { for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + Math.PI / 8; c.beginPath(); c.arc(CX + Math.cos(a) * R * 0.36, CY + Math.sin(a) * R * 0.36, 26, 0, 7); c.fill(); } });
        each("field", function (c) { for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + Math.PI / 8; c.beginPath(); c.arc(CX + Math.cos(a) * R * 0.36, CY + Math.sin(a) * R * 0.36, 11, 0, 7); c.fill(); } });
        disc(R * 0.17);
        each("field", function (c) {
          c.beginPath();
          for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? R * 0.045 : R * 0.13; c.lineTo(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr); }
          c.closePath(); c.fill();
        });
      }
      var t = { map: canvasTex(cc, true), rough: canvasTex(rc), bump: canvasTex(bc) };
      return t;
    }
    // three's CylinderGeometry cap UVs are rotated a quarter turn (and the bottom cap is mirrored); undo that per face
    var ROT_TOP = Math.PI / 2, ROT_BOT = -Math.PI / 2;
    function orient(t, rot) { [t.map, t.rough, t.bump].forEach(function (x) { x.center.set(0.5, 0.5); x.rotation = rot; }); }
    function faceMaterial(t) {
      return new THREE.MeshStandardMaterial({ map: t.map, roughnessMap: t.rough, roughness: 1, metalness: 1, bumpMap: t.bump, bumpScale: 2.6, envMapIntensity: 1.55 });
    }
    var obv = paintFace(0), rev = paintFace(1);
    orient(obv, ROT_TOP); orient(rev, ROT_BOT);
    var edgeTex = (function () {
      var c = mkc(32, 8), x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 32, 0);
      g.addColorStop(0, "#5a3f10"); g.addColorStop(0.45, "#f0d074"); g.addColorStop(1, "#5a3f10");
      x.fillStyle = g; x.fillRect(0, 0, 32, 8);
      var t = canvasTex(c, true, true); t.repeat.set(110, 1); return t;
    })();
    var coin = new THREE.Group(); coin.rotation.order = "YXZ";
    var coinMats = [new THREE.MeshStandardMaterial({ map: edgeTex, metalness: 1, roughness: 0.32, envMapIntensity: 1.3 }), faceMaterial(obv), faceMaterial(rev)];
    var body = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, HALF * 2, 160, 1), coinMats);
    body.rotation.x = Math.PI / 2;
    coin.add(body);
    var rimMat = new THREE.MeshStandardMaterial({ color: 0xc99a34, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
    var rimGeo = new THREE.TorusGeometry(RAD - 0.055, 0.06, 20, 200);
    var rimA = new THREE.Mesh(rimGeo, rimMat); rimA.position.z = HALF; coin.add(rimA);
    var rimB = new THREE.Mesh(rimGeo, rimMat); rimB.position.z = -HALF; coin.add(rimB);
    W3.add(coin);
    // the coin emerges through the pedestal's top: clip whatever is still below it
    var pedClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(PED_TOP + 0.01));
    coinMats.concat([rimMat]).forEach(function (m) { m.clippingPlanes = [pedClip]; });
    var coinFeatured = false;
    function setFeatured() {
      if (coinFeatured || !featured) return; coinFeatured = true;
      var old = obv; obv = paintFace(0); orient(obv, ROT_TOP);
      var m = coinMats[1]; m.map = obv.map; m.roughnessMap = obv.rough; m.bumpMap = obv.bump;
      [old.map, old.rough, old.bump].forEach(function (t) { t.dispose(); });
    }
    if (featured) setFeatured();

    /* ================= the vault ================= */
    // safe-deposit box wall: colour / roughness / relief, one 4×6 tile, repeated
    var TILE = 4.6;
    var wallT = (function () {
      var N = 1024, cols = 4, rows = 6, cw = N / cols, rh = N / rows;
      var cc = mkc(N), rc = mkc(N), bc = mkc(N), g = cc.getContext("2d"), r = rc.getContext("2d"), b = bc.getContext("2d");
      var rn = rnd(7);
      g.fillStyle = "#050403"; g.fillRect(0, 0, N, N);
      r.fillStyle = "#e0e0e0"; r.fillRect(0, 0, N, N);
      b.fillStyle = "#000"; b.fillRect(0, 0, N, N);
      for (var cy = 0; cy < rows; cy++) for (var cx = 0; cx < cols; cx++) {
        var x0 = cx * cw + 6, y0 = cy * rh + 6, w = cw - 12, h = rh - 12, tone = rn();
        var l = 20 + tone * 9, grd = g.createLinearGradient(x0, y0, x0, y0 + h);
        grd.addColorStop(0, "hsl(38,44%," + (l + 6) + "%)"); grd.addColorStop(1, "hsl(36,48%," + (l - 5) + "%)");
        g.fillStyle = grd; g.fillRect(x0, y0, w, h);
        for (var s = 0; s < 40; s++) { var yy = y0 + rn() * h; g.fillStyle = "rgba(255,230,180," + (0.02 + rn() * 0.05) + ")"; g.fillRect(x0, yy, w, 1); }
        r.fillStyle = "rgb(" + Math.round(95 + tone * 50) + ",0,0)"; r.fillStyle = "#" + ((1 << 24) + (Math.round(95 + tone * 50) * 0x10101)).toString(16).slice(1); r.fillRect(x0, y0, w, h);
        b.fillStyle = "#9a9a9a"; b.fillRect(x0, y0, w, h);
        // raised frame
        b.strokeStyle = "#fff"; b.lineWidth = 7; b.strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
        g.strokeStyle = "rgba(255,226,160,.22)"; g.lineWidth = 3; g.strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
        // number plate
        var px = x0 + w / 2 - 34, py = y0 + 22;
        g.fillStyle = "#c9a864"; g.fillRect(px, py, 68, 26); b.fillStyle = "#fff"; b.fillRect(px, py, 68, 26); r.fillStyle = "#555"; r.fillRect(px, py, 68, 26);
        g.fillStyle = "#3a2a10"; g.font = "600 18px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(String(100 + cy * cols + cx + Math.floor(rn() * 800)), px + 34, py + 14);
        // two keyholes
        [0.32, 0.68].forEach(function (k) {
          var kx = x0 + w * k, ky = y0 + h * 0.62;
          g.fillStyle = "#b8955a"; g.beginPath(); g.arc(kx, ky, 14, 0, 7); g.fill();
          b.fillStyle = "#fff"; b.beginPath(); b.arc(kx, ky, 14, 0, 7); b.fill();
          g.fillStyle = "#0b0804"; g.beginPath(); g.arc(kx, ky - 3, 5, 0, 7); g.fill(); g.fillRect(kx - 2, ky - 2, 4, 11);
          b.fillStyle = "#000"; b.beginPath(); b.arc(kx, ky - 3, 5, 0, 7); b.fill(); b.fillRect(kx - 2, ky - 2, 4, 11);
        });
        // corner rivets
        [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]].forEach(function (p) {
          g.fillStyle = "#d9bd7c"; g.beginPath(); g.arc(x0 + p[0], y0 + p[1], 4, 0, 7); g.fill();
          b.fillStyle = "#fff"; b.beginPath(); b.arc(x0 + p[0], y0 + p[1], 4, 0, 7); b.fill();
        });
      }
      return { map: canvasTex(cc, true, true), rough: canvasTex(rc, false, true), bump: canvasTex(bc, false, true) };
    })();
    var wallMat = new THREE.MeshStandardMaterial({ map: wallT.map, roughnessMap: wallT.rough, roughness: 1, metalness: 0.75, bumpMap: wallT.bump, bumpScale: 0.035, envMapIntensity: 0.28, color: 0xffffff });
    function scaleUV(geo, sx, sy, ox, oy) {
      var uv = geo.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx + (ox || 0), uv.getY(i) * sy + (oy || 0)); uv.needsUpdate = true; return geo;
    }
    // back wall with a round hole for the door
    var FR_OUT = RD + 0.75;
    (function () {
      var sh = new THREE.Shape();
      sh.moveTo(-20, FLOOR); sh.lineTo(20, FLOOR); sh.lineTo(20, CEIL); sh.lineTo(-20, CEIL); sh.lineTo(-20, FLOOR);
      var hole = new THREE.Path(); hole.absarc(0, DOORY, FR_OUT - 0.05, 0, Math.PI * 2, true); sh.holes.push(hole);
      var geo = new THREE.ShapeGeometry(sh, 64);
      scaleUV(geo, 1 / TILE, 1 / TILE, 0.5, -FLOOR / TILE);
      var m = new THREE.Mesh(geo, wallMat); m.position.z = WALLZ; W3.add(m);
    })();
    [-1, 1].forEach(function (side) {
      var len = 26, geo = scaleUV(new THREE.PlaneGeometry(len, CEIL - FLOOR), len / TILE, (CEIL - FLOOR) / TILE);
      var m = new THREE.Mesh(geo, wallMat);
      m.rotation.y = -side * Math.PI / 2; m.position.set(side * 8.5, (CEIL + FLOOR) / 2, WALLZ + len / 2); W3.add(m);
    });
    var ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.9, metalness: 0 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL, 0); W3.add(ceil);

    // columns flanking the door
    var fluteT = (function () {
      var c = mkc(256, 8), x = c.getContext("2d");
      for (var i = 0; i < 256; i++) { var v = Math.round(128 + 127 * Math.cos(i / 256 * Math.PI * 2 * 1)); x.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; x.fillRect(i, 0, 1, 8); }
      var t = canvasTex(c, false, true); t.repeat.set(20, 1); return t;
    })();
    var colMat = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.22, metalness: 0.1, bumpMap: fluteT, bumpScale: 0.06, envMapIntensity: 0.5 });
    var brass = new THREE.MeshStandardMaterial({ color: 0xc79a45, roughness: 0.28, metalness: 1, envMapIntensity: 1.0 });
    var brassDoor = brass.clone(), brassPed = brass.clone();
    var colX = RD + 2.25;
    [-1, 1].forEach(function (side) {
      var gcol = new THREE.Group(); gcol.position.set(side * colX, 0, WALLZ + 0.9);
      var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, CEIL - FLOOR - 1.4, 40, 1, true), colMat);
      shaft.position.y = (CEIL + FLOOR) / 2; gcol.add(shaft);
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.82, 0.55, 40), brass); base.position.y = FLOOR + 0.27; gcol.add(base);
      var tor = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 48), brass); tor.rotation.x = Math.PI / 2; tor.position.y = FLOOR + 0.62; gcol.add(tor);
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.6, 0.7, 40), brass); cap.position.y = CEIL - 0.85; gcol.add(cap);
      W3.add(gcol);
    });

    /* --- the vault door --- */
    var doorT = (function () {
      var N = 1024, c0 = N / 2, cc = mkc(N), rc = mkc(N), bc = mkc(N), g = cc.getContext("2d"), r = rc.getContext("2d"), b = bc.getContext("2d");
      var grd = g.createRadialGradient(c0 * 0.8, c0 * 0.7, 20, c0, c0, c0);
      grd.addColorStop(0, "#8d8b86"); grd.addColorStop(0.6, "#66645f"); grd.addColorStop(1, "#43413d");
      g.fillStyle = grd; g.fillRect(0, 0, N, N);
      r.fillStyle = "#6a6a6a"; r.fillRect(0, 0, N, N); b.fillStyle = "#808080"; b.fillRect(0, 0, N, N);
      var rn = rnd(11);
      for (var rr = 4; rr < c0; rr += 2) { g.strokeStyle = (rn() < 0.5 ? "rgba(255,255,255," : "rgba(0,0,0,") + (0.02 + rn() * 0.05) + ")"; g.lineWidth = 1.5; g.beginPath(); g.arc(c0, c0, rr, 0, 7); g.stroke(); }
      function groove(rad, w) { [[g, "rgba(10,9,8,.8)"], [b, "#000"], [r, "#bbb"]].forEach(function (p) { p[0].strokeStyle = p[1]; p[0].lineWidth = w; p[0].beginPath(); p[0].arc(c0, c0, rad, 0, 7); p[0].stroke(); }); }
      function raised(rad, w, col) { [[g, col], [b, "#fff"], [r, "#444"]].forEach(function (p) { p[0].strokeStyle = p[1]; p[0].lineWidth = w; p[0].beginPath(); p[0].arc(c0, c0, rad, 0, 7); p[0].stroke(); }); }
      groove(c0 * 0.965, 8); raised(c0 * 0.93, 14, "#a9a59c"); groove(c0 * 0.895, 4);
      for (var i = 0; i < 48; i++) {
        var a = i / 48 * Math.PI * 2, x = c0 + Math.cos(a) * c0 * 0.86, y = c0 + Math.sin(a) * c0 * 0.86;
        g.fillStyle = "#b5b0a6"; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
        b.fillStyle = "#fff"; b.beginPath(); b.arc(x, y, 8, 0, 7); b.fill();
      }
      // engraved legend
      var txt = "TITAN RELIQUARY · VAULT & MUSEUM · SECURITAS · MMXXVI · ", n = txt.length, rad = c0 * 0.76;
      [[g, "rgba(20,18,14,.85)"], [b, "#000"], [r, "#aaa"]].forEach(function (p) {
        var x = p[0]; x.fillStyle = p[1]; x.font = '600 40px "Fraunces", Georgia, serif'; x.textAlign = "center"; x.textBaseline = "middle";
        for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + (i + 0.5) / n * Math.PI * 2; x.save(); x.translate(c0 + Math.cos(a) * rad, c0 + Math.sin(a) * rad); x.rotate(a + Math.PI / 2); x.fillText(txt[i], 0, 0); x.restore(); }
      });
      groove(c0 * 0.68, 6); raised(c0 * 0.64, 10, "#b09d74");
      for (var j = 0; j < 12; j++) {
        var a2 = j / 12 * Math.PI * 2, x2 = c0 + Math.cos(a2) * c0 * 0.5, y2 = c0 + Math.sin(a2) * c0 * 0.5;
        g.fillStyle = "#9b978f"; g.beginPath(); g.arc(x2, y2, 22, 0, 7); g.fill(); g.fillStyle = "#3b3934"; g.beginPath(); g.arc(x2, y2, 9, 0, 7); g.fill();
        b.fillStyle = "#fff"; b.beginPath(); b.arc(x2, y2, 22, 0, 7); b.fill(); b.fillStyle = "#555"; b.beginPath(); b.arc(x2, y2, 9, 0, 7); b.fill();
      }
      groove(c0 * 0.36, 5);
      return { map: canvasTex(cc, true), rough: canvasTex(rc), bump: canvasTex(bc) };
    })();
    var steel = new THREE.MeshStandardMaterial({ color: 0x8a8780, roughness: 0.34, metalness: 1, envMapIntensity: 0.75 });
    var doorFaceMat = new THREE.MeshStandardMaterial({ map: doorT.map, roughnessMap: doorT.rough, roughness: 1, metalness: 1, bumpMap: doorT.bump, bumpScale: 0.05, envMapIntensity: 0.8 });
    var DOOR_Z = WALLZ + 0.32, DOOR_T = 0.85;
    var hinge = new THREE.Group(); hinge.position.set(-RD, DOORY, DOOR_Z); W3.add(hinge);
    var door = new THREE.Group(); door.position.set(RD, 0, 0); hinge.add(door);
    var dFace = new THREE.Mesh(new THREE.CircleGeometry(RD, 128), doorFaceMat); door.add(dFace);
    var dEdge = new THREE.Mesh(new THREE.CylinderGeometry(RD, RD, DOOR_T, 128, 1, true), steel); dEdge.rotation.x = Math.PI / 2; dEdge.position.z = -DOOR_T / 2; door.add(dEdge);
    var dBack = new THREE.Mesh(new THREE.CircleGeometry(RD, 64), new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.55, metalness: 0.9, envMapIntensity: 0.3 })); dBack.rotation.y = Math.PI; dBack.position.z = -DOOR_T; door.add(dBack);
    var bev = new THREE.Mesh(new THREE.TorusGeometry(RD - 0.02, 0.07, 12, 160), brassDoor); door.add(bev);
    var bev2 = new THREE.Mesh(new THREE.TorusGeometry(RD * 0.64, 0.05, 10, 128), brassDoor); bev2.position.z = 0.02; door.add(bev2);
    // spoked handle wheel
    var wheel = new THREE.Group(); wheel.position.z = 0.02; door.add(wheel);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.42, 48), brassDoor); hub.rotation.x = Math.PI / 2; hub.position.z = 0.21; wheel.add(hub);
    var hubCap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel); hubCap.rotation.x = Math.PI / 2; hubCap.position.z = 0.42; wheel.add(hubCap);
    var spokeGeo = new THREE.CylinderGeometry(0.075, 0.09, 1.55, 16), knobGeo = new THREE.SphereGeometry(0.17, 24, 16);
    for (var sp = 0; sp < 5; sp++) {
      var arm = new THREE.Group(); arm.rotation.z = sp / 5 * Math.PI * 2; arm.position.z = 0.34;
      var spk = new THREE.Mesh(spokeGeo, brassDoor); spk.position.y = 0.95; arm.add(spk);
      var knob = new THREE.Mesh(knobGeo, brassDoor); knob.position.y = 1.75; arm.add(knob);
      wheel.add(arm);
    }
    // frame: face ring, brass lips and the tunnel behind the door
    var frameMat = new THREE.MeshStandardMaterial({ color: 0x57544e, roughness: 0.4, metalness: 1, envMapIntensity: 0.6 });
    var frameFace = new THREE.Mesh(new THREE.RingGeometry(RD + 0.03, FR_OUT, 128, 1), frameMat); frameFace.position.set(0, DOORY, WALLZ + 0.34); W3.add(frameFace);
    [RD + 0.05, FR_OUT].forEach(function (rr, k) { var t = new THREE.Mesh(new THREE.TorusGeometry(rr, k ? 0.13 : 0.08, 14, 160), brassDoor); t.position.set(0, DOORY, WALLZ + 0.36); W3.add(t); });
    for (var bi = 0; bi < 24; bi++) {
      var ba = bi / 24 * Math.PI * 2, bolt = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), brassDoor);
      bolt.position.set(Math.cos(ba) * (RD + 0.42), DOORY + Math.sin(ba) * (RD + 0.42), WALLZ + 0.36); W3.add(bolt);
    }
    var tunnel = new THREE.Mesh(new THREE.CylinderGeometry(RD + 0.03, RD + 0.03, 3.2, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.45, metalness: 1, side: THREE.BackSide, envMapIntensity: 0.4 }));
    tunnel.rotation.x = Math.PI / 2; tunnel.position.set(0, DOORY, WALLZ - 1.25); W3.add(tunnel);
    // what lies beyond the door: warm light with soft rays (HDR, so the bloom takes it from there)
    var hallMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uT: { value: 0 } }, fog: false,
      vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uI, uT; varying vec2 vP; void main() { float r = length(vP) / " + (RD + 0.1).toFixed(2) + "; float a = atan(vP.y, vP.x);" +
        " vec3 c = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.6, 0.26), smoothstep(0.0, 1.0, r)) * (1.2 - 0.7 * r);" +
        " c *= 0.92 + 0.08 * sin(a * 13.0 + uT * 0.6) * smoothstep(0.15, 0.9, r); gl_FragColor = vec4(c * uI, 1.0); }"
    });
    var hall = new THREE.Mesh(new THREE.CircleGeometry(RD + 0.1, 64), hallMat); hall.position.set(0, DOORY, WALLZ - 2.8); W3.add(hall);
    var hallLight = new THREE.PointLight(0xffd79a, 0, 30, 1.6); hallLight.position.set(0, DOORY, WALLZ - 1.2); W3.add(hallLight);

    /* --- the pedestal: a black drum plinth; the coin materialises out of its top through a disc of light --- */
    var ped = new THREE.Group(); W3.add(ped);
    var pedMat = new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 0.14, metalness: 0.25, envMapIntensity: 0.9 });
    var PR = 1.78, pedH = PED_TOP - FLOOR - 0.34;
    var pedBody = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR + 0.12, pedH, 72), pedMat); pedBody.position.y = FLOOR + 0.34 + pedH / 2; ped.add(pedBody);
    var pedBase = new THREE.Mesh(new THREE.CylinderGeometry(PR + 0.32, PR + 0.38, 0.34, 72), pedMat); pedBase.position.y = FLOOR + 0.17; ped.add(pedBase);
    [[PR + 0.01, PED_TOP - 0.03, 0.05], [PR + 0.06, PED_TOP - 0.3, 0.025], [PR + 0.14, FLOOR + 0.36, 0.04]].forEach(function (p) {
      var t = new THREE.Mesh(new THREE.TorusGeometry(p[0], p[2], 12, 120), brassPed); t.rotation.x = Math.PI / 2; t.position.y = p[1]; ped.add(t);
    });
    var glowRingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), toneMapped: false });
    var glowRing = new THREE.Mesh(new THREE.TorusGeometry(PR - 0.16, 0.022, 8, 120), glowRingMat); glowRing.rotation.x = Math.PI / 2; glowRing.position.y = PED_TOP + 0.004; ped.add(glowRing);
    var emitMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uColor: { value: new THREE.Color(1.0, 0.82, 0.5) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uI; uniform vec3 uColor; varying vec2 vP; void main() { float r = length(vP) / " + (PR - 0.1).toFixed(2) + "; float slot = exp(-abs(vP.y) * 16.0) * smoothstep(1.0, 0.8, r); float a = smoothstep(1.0, 0.0, r) * 0.55 + slot * 1.4; gl_FragColor = vec4(uColor * a * uI, 1.0); }"
    });
    var emitter = new THREE.Mesh(new THREE.CircleGeometry(PR - 0.1, 64), emitMat); emitter.rotation.x = -Math.PI / 2; emitter.position.y = PED_TOP + 0.01; ped.add(emitter);

    /* --- floor: black marble with brass inlay, planar reflection injected into the shader --- */
    var floorT = (function () {
      var N = 1024, cc = mkc(512), rc = mkc(512), mc = mkc(512), g = cc.getContext("2d"), r = rc.getContext("2d"), m = mc.getContext("2d"), rn = rnd(3);
      [g, r, m].forEach(function (x) { x.scale(0.5, 0.5); });   // painted in 1024 units, stored at 512 to save GPU memory
      g.fillStyle = "#0d0c0b"; g.fillRect(0, 0, N, N); r.fillStyle = "#3a3a3a"; r.fillRect(0, 0, N, N); m.fillStyle = "#000"; m.fillRect(0, 0, N, N);
      if (g.filter !== undefined) g.filter = "blur(1.2px)";
      for (var v = 0; v < 16; v++) {
        var x = rn() * N, y = rn() * N, ang = rn() * Math.PI * 2;
        g.strokeStyle = "rgba(" + (rn() < 0.3 ? "190,160,110" : "150,145,140") + "," + (0.04 + rn() * 0.09) + ")"; g.lineWidth = 0.8 + rn() * 2.2;
        g.beginPath(); g.moveTo(x, y);
        for (var k = 0; k < 14; k++) { ang += (rn() - 0.5) * 0.9; x += Math.cos(ang) * 45; y += Math.sin(ang) * 45; g.lineTo(x, y); }
        g.stroke();
      }
      if (g.filter !== undefined) g.filter = "none";
      [[g, "#8c6a2c"], [r, "#707070"], [m, "#fff"]].forEach(function (p) { p[0].fillStyle = p[1]; p[0].fillRect(0, 0, N, 5); p[0].fillRect(0, 0, 5, N); p[0].fillRect(0, N / 2 - 2, N, 4); p[0].fillRect(N / 2 - 2, 0, 4, N); });
      var t = { map: canvasTex(cc, true, true), rough: canvasTex(rc, false, true), metal: canvasTex(mc, false, true) };
      [t.map, t.rough, t.metal].forEach(function (x) { x.repeat.set(8, 8); });
      return t;
    })();
    var reflU = { tRefl: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uRefl: { value: 0 } };
    var floorMat = new THREE.MeshStandardMaterial({ map: floorT.map, roughnessMap: floorT.rough, metalnessMap: floorT.metal, roughness: 1, metalness: 1, envMapIntensity: 0.25 });
    floorMat.onBeforeCompile = function (sh) {
      sh.uniforms.tRefl = reflU.tRefl; sh.uniforms.uRes = reflU.uRes; sh.uniforms.uRefl = reflU.uRefl;
      sh.fragmentShader = "uniform sampler2D tRefl;\nuniform vec2 uRes;\nuniform float uRefl;\n" + sh.fragmentShader.replace("#include <tonemapping_fragment>", [
        "if (uRefl > 0.0) {",
        "  vec2 suv = gl_FragCoord.xy / uRes;",
        "  vec2 o = vec2(1.5 / uRes.x, 3.0 / uRes.y) * 2.0;",
        "  vec3 rf = texture2D(tRefl, suv).rgb * 0.4 + (texture2D(tRefl, suv + vec2(o.x, 0.0)).rgb + texture2D(tRefl, suv - vec2(o.x, 0.0)).rgb + texture2D(tRefl, suv + vec2(0.0, o.y)).rgb + texture2D(tRefl, suv - vec2(0.0, o.y)).rgb) * 0.15;",
        "  float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);",
        "  gl_FragColor.rgb += rf * uRefl * (0.3 + 0.7 * pow(1.0 - nv, 4.0));",
        "}",
        "#include <tonemapping_fragment>"].join("\n"));
    };
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, 4); scene.add(floor);

    /* --- lights: four spotlights that snap on, a sweep, a whisper of ambient --- */
    var amb = new THREE.AmbientLight(0xffe2b0, 0); W3.add(amb);
    var beamDefs = [
      { at: 0.45, col: 0xffd49a, I: 2.8, ang: 0.3, from: [-4.2, CEIL - 0.2, -4.6], to: [-6.2, FLOOR, -5.6], cone: 1 },
      { at: 0.85, col: 0xffd49a, I: 2.8, ang: 0.3, from: [4.2, CEIL - 0.2, -4.6], to: [6.2, FLOOR, -5.6], cone: 1 },
      { at: 1.25, col: 0xffe6bf, I: 3.0, ang: 0.34, from: [0, CEIL - 0.2, -4.2], to: [0, DOORY - 0.6, WALLZ], cone: 1 },
      { at: 1.75, col: 0xfff1d6, I: 4.2, ang: 0.2, from: [0, CEIL - 0.2, 0.6], to: [0, PED_TOP, 0], cone: 1 }
    ];
    var coneVS = [
      "varying float vAlong; varying vec3 vN; varying vec3 vV;",
      "uniform float uLen;",
      "void main() {",
      "  vAlong = clamp(-position.y / uLen, 0.0, 1.0);",
      "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
      "  vN = normalize(normalMatrix * normal); vV = -mv.xyz;",
      "  gl_Position = projectionMatrix * mv;",
      "}"].join("\n");
    var coneFS = [
      "varying float vAlong; varying vec3 vN; varying vec3 vV;",
      "uniform vec3 uColor; uniform float uI; uniform float uTime;",
      "void main() {",
      "  float edge = abs(dot(normalize(vN), normalize(vV)));",
      "  float a = pow(edge, 2.2) * pow(1.0 - vAlong, 1.2) * smoothstep(0.0, 0.06, vAlong);",
      "  a *= 0.82 + 0.18 * sin(vAlong * 23.0 - uTime * 0.9 + edge * 5.0);",
      "  gl_FragColor = vec4(uColor * a * uI, 1.0);",
      "}"].join("\n");
    var lampGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.5, 24), lampMat = new THREE.MeshStandardMaterial({ color: 0x151310, roughness: 0.5, metalness: 0.8 });
    var beams = beamDefs.map(function (d, i) {
      var sl = new THREE.SpotLight(d.col, 0, 0, d.ang, 0.55, 1);
      sl.position.set(d.from[0], d.from[1], d.from[2]); sl.target.position.set(d.to[0], d.to[1], d.to[2]);
      W3.add(sl); W3.add(sl.target);
      var from = new THREE.Vector3().fromArray(d.from), to = new THREE.Vector3().fromArray(d.to);
      var dir = to.clone().sub(from), len = dir.length() + (i < 2 ? 0 : 1.5); dir.normalize();
      var r0 = Math.tan(d.ang) * len * 0.92;
      var cg = new THREE.ConeGeometry(r0, len, 48, 1, true); cg.translate(0, -len / 2, 0);
      var cm = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(d.col) }, uI: { value: 0 }, uLen: { value: len }, uTime: { value: 0 } },
        vertexShader: coneVS, fragmentShader: coneFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false
      });
      var cone = new THREE.Mesh(cg, cm); cone.position.copy(from); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      cone.renderOrder = 5; W3.add(cone);
      var lamp = new THREE.Mesh(lampGeo, lampMat); lamp.position.copy(from); lamp.quaternion.copy(cone.quaternion); lamp.position.addScaledVector(dir, -0.2); W3.add(lamp);
      var lensM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
      var lens = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), lensM); lens.position.copy(from); lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); lens.position.addScaledVector(dir, 0.06); W3.add(lens);
      return { d: d, light: sl, cone: cone, mat: cm, lensM: lensM, from: from, dir: dir, len: len, cos: Math.cos(d.ang), k: 0 };
    });
    var sweep = new THREE.SpotLight(0xfff2da, 0, 0, 0.16, 0.9, 1); sweep.position.set(-9, 3, 10); sweep.target.position.set(0, 0, 0); W3.add(sweep); W3.add(sweep.target);
    var fill = new THREE.SpotLight(0xffe0b0, 0, 0, 0.14, 0.9, 1); fill.position.set(-6, 3.5, 12); fill.target.position.set(0, 0, 0); W3.add(fill); W3.add(fill.target);
    var rimL = new THREE.SpotLight(0x9db8ff, 0, 0, 0.16, 0.9, 1); rimL.position.set(7, -1, -4); rimL.target.position.set(0, 0, 0); W3.add(rimL); W3.add(rimL.target);
    function flick(t) {                               // snap on with a stutter, like an old theatre lamp
      if (t < 0) return 0;
      if (t < 0.3) return [1, 0.1, 0.85, 0, 0.35, 1][Math.floor(t / 0.05)] || 1;
      return 1;
    }

    /* --- dust: GPU-animated motes that only show inside the beams, bigger and softer out of focus --- */
    var NB = 5;
    var dustU = {
      uTime: { value: 0 }, uPx: { value: 400 }, uFocus: { value: 17 }, uDof: { value: 0.1 }, uColor: { value: new THREE.Color(0xffe0a0) },
      uFade: { value: 0 }, uApex: { value: [] }, uDir: { value: [] }, uBeam: { value: [] }, uFloor: { value: FLOOR }, uH: { value: CEIL - FLOOR }
    };
    for (var bj = 0; bj < NB; bj++) { dustU.uApex.value.push(new THREE.Vector3()); dustU.uDir.value.push(new THREE.Vector3(0, -1, 0)); dustU.uBeam.value.push(new THREE.Vector3(0.9, 0, 10)); }
    var nDust = Math.round((small ? 900 : 1600));
    var dustGeo = new THREE.BufferGeometry();
    (function () {
      var pos = new Float32Array(nDust * 3), ph = new Float32Array(nDust), sz = new Float32Array(nDust), spd = new Float32Array(nDust), rn = rnd(5);
      for (var i = 0; i < nDust; i++) {
        var nearBeam = i % 3;
        var x = nearBeam === 0 ? (rn() - 0.5) * 3.2 : (rn() - 0.5) * 15, z = nearBeam === 0 ? (rn() - 0.5) * 3.2 : WALLZ + 1 + rn() * 16;
        pos[i * 3] = x; pos[i * 3 + 1] = FLOOR + rn() * (CEIL - FLOOR); pos[i * 3 + 2] = z;
        ph[i] = rn() * 6.283; sz[i] = 0.5 + rn() * rn() * 1.8; spd[i] = 0.05 + rn() * 0.22;
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      dustGeo.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
      dustGeo.setAttribute("aSz", new THREE.BufferAttribute(sz, 1));
      dustGeo.setAttribute("aSp", new THREE.BufferAttribute(spd, 1));
    })();
    var dustMat = new THREE.ShaderMaterial({
      uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: [
        "#define NB " + NB,
        "attribute float aPh; attribute float aSz; attribute float aSp;",
        "uniform float uTime, uPx, uFocus, uDof, uFade, uFloor, uH;",
        "uniform vec3 uApex[NB]; uniform vec3 uDir[NB]; uniform vec3 uBeam[NB];",
        "varying float vA;",
        "void main() {",
        "  vec3 p = position;",
        "  p.y = uFloor + mod(p.y - uFloor + uTime * aSp, uH);",
        "  p.x += sin(uTime * 0.37 + aPh) * 0.35; p.z += cos(uTime * 0.29 + aPh * 1.3) * 0.3;",
        "  vec4 wp = modelMatrix * vec4(p, 1.0);",
        "  float lit = 0.0;",
        "  for (int i = 0; i < NB; i++) {",
        "    vec3 d = wp.xyz - uApex[i]; float L = dot(d, uDir[i]); float c = L / max(length(d), 1e-3);",
        "    lit += step(0.0, L) * smoothstep(uBeam[i].x, mix(uBeam[i].x, 1.0, 0.45), c) * uBeam[i].y * (1.0 - 0.6 * clamp(L / uBeam[i].z, 0.0, 1.0));",
        "  }",
        "  vec4 mv = viewMatrix * wp; float z = -mv.z;",
        "  float coc = min(abs(z - uFocus) * uDof, 4.0);",
        "  gl_PointSize = aSz * (1.0 + coc * 2.2) * uPx / max(z, 0.5);",
        "  vA = min(lit, 1.6) * uFade * (0.35 + 0.65 * fract(aPh * 7.13)) / (1.0 + coc * coc * 1.6) * (0.75 + 0.25 * sin(uTime * 2.0 + aPh * 9.0));",
        "  gl_Position = projectionMatrix * mv;",
        "}"].join("\n"),
      fragmentShader: [
        "uniform vec3 uColor; varying float vA;",
        "void main() { vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; float a = smoothstep(1.0, 0.15, r); gl_FragColor = vec4(uColor * vA * a * a * 1.4, 1.0); }"].join("\n")
    });
    var dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; dust.renderOrder = 6; scene.add(dust);

    /* ================= post-processing ================= */
    var hdr = (function () {
      if (caps.isWebGL2) return ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float");
      return ext.has("OES_texture_half_float") && ext.has("OES_texture_half_float_linear") && ext.has("EXT_color_buffer_half_float");
    })();
    var quadGeo = new THREE.BufferGeometry();
    quadGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    quadGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    var quad = new THREE.Mesh(quadGeo, null); quad.frustumCulled = false;
    var postScene = new THREE.Scene(); postScene.add(quad);
    var postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var VS = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
    function pmat(fs, uni) { return new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false }); }
    var mPre = pmat([
      "uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uTh; varying vec2 vUv;",
      "vec3 s(vec2 o) { return min(texture2D(tSrc, vUv + o * uTexel).rgb, vec3(40.0)); }",
      "void main() {",
      "  vec3 c = (s(vec2(-1.0,-1.0)) + s(vec2(1.0,-1.0)) + s(vec2(-1.0,1.0)) + s(vec2(1.0,1.0))) * 0.25;",
      "  float br = max(c.r, max(c.g, c.b)); float knee = uTh * 0.5;",
      "  float soft = clamp(br - uTh + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 1e-4);",
      "  c *= max(soft, br - uTh) / max(br, 1e-4);",
      "  gl_FragColor = vec4(c, 1.0);",
      "}"].join("\n"), { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uTh: { value: 1.0 } });
    var mDown = pmat([
      "uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;",
      "void main() {",
      "  vec2 h = uTexel;",
      "  vec3 c = texture2D(tSrc, vUv).rgb * 4.0 + texture2D(tSrc, vUv - h).rgb + texture2D(tSrc, vUv + h).rgb + texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture2D(tSrc, vUv - vec2(h.x, -h.y)).rgb;",
      "  gl_FragColor = vec4(c / 8.0, 1.0);",
      "}"].join("\n"), { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    var mUp = pmat([
      "uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel; varying vec2 vUv;",
      "void main() {",
      "  vec2 h = uTexel;",
      "  vec3 c = texture2D(tSrc, vUv + vec2(-2.0 * h.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(2.0 * h.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, 2.0 * h.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, -2.0 * h.y)).rgb;",
      "  c += (texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb) * 2.0;",
      "  gl_FragColor = vec4(c / 12.0 + texture2D(tAdd, vUv).rgb, 1.0);",
      "}"].join("\n"), { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    var mStreak = pmat([
      "uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uStep; varying vec2 vUv;",
      "void main() {",
      "  vec3 c = vec3(0.0); float wsum = 0.0;",
      "  for (int i = -7; i <= 7; i++) { float f = float(i); float w = exp(-f * f / 18.0); c += texture2D(tSrc, vUv + vec2(f * uStep * uTexel.x, 0.0)).rgb * w; wsum += w; }",
      "  gl_FragColor = vec4(c / wsum, 1.0);",
      "}"].join("\n"), { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uStep: { value: 1 } });
    var mDepth = new THREE.ShaderMaterial({
      uniforms: { uFar: { value: FAR } },
      vertexShader: "varying float vZ; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uFar; varying float vZ; void main() { gl_FragColor = vec4(clamp(vZ / uFar, 0.0, 1.0), 0.0, 0.0, 1.0); }"
    });
    var compU = {
      tScene: { value: null }, tBloom: { value: null }, tBlur: { value: null }, tDepth: { value: null }, tStreak: { value: null },
      uBloom: { value: 0.9 }, uStreak: { value: 0.0 }, uCA: { value: 0.012 }, uVig: { value: 1 }, uGrain: { value: 0.035 }, uExposure: { value: 1.0 },
      uTonemap: { value: 1 }, uDof: { value: 0 }, uFocus: { value: 0.2 }, uRange: { value: 0.1 }, uTime: { value: 0 }, uFade: { value: 1 },
      uGlint: { value: 0 }, uGlintPos: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uHasStreak: { value: 0 }
    };
    var mComp = pmat([
      "uniform sampler2D tScene, tBloom, tBlur, tDepth, tStreak;",
      "uniform float uBloom, uStreak, uCA, uVig, uGrain, uExposure, uTonemap, uDof, uFocus, uRange, uTime, uFade, uGlint, uAspect, uHasStreak;",
      "uniform vec2 uGlintPos, uRes; varying vec2 vUv;",
      "vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }",
      "vec3 tsACES(vec3 c) {",
      "  const mat3 mi = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));",
      "  const mat3 mo = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));",
      "  c = mi * (c / 0.6); c = RRTAndODTFit(c); return clamp(mo * c, 0.0, 1.0);",
      "}",
      "vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }",
      "float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
      "void main() {",
      "  vec2 uv = vUv; vec2 d = uv - 0.5;",
      "  float ca = uCA * dot(d, d);",
      "  vec3 col = vec3(texture2D(tScene, uv - d * ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv + d * ca).b);",
      "  if (uDof > 0.0) {",
      "    float z = texture2D(tDepth, uv).r;",
      "    float coc = smoothstep(0.0, 1.0, clamp(abs(z - uFocus) / uRange, 0.0, 1.0)) * uDof;",
      "    col = mix(col, texture2D(tBlur, uv).rgb, coc);",
      "  }",
      "  col += texture2D(tBloom, uv).rgb * uBloom;",
      "  if (uHasStreak > 0.0) col += texture2D(tStreak, uv).rgb * uStreak * vec3(0.75, 0.85, 1.25);",
      "  if (uGlint > 0.0) {",
      "    vec2 g = (uv - uGlintPos) * vec2(uAspect, 1.0); float r = length(g);",
      "    float core = exp(-r * r * 12000.0) * 2.2 + exp(-r * 45.0) * 0.35;",
      "    float sx = exp(-abs(g.y) * 1100.0) * exp(-abs(g.x) * 14.0), sy = exp(-abs(g.x) * 1100.0) * exp(-abs(g.y) * 20.0);",
      "    vec2 gr = vec2(g.x + g.y, g.x - g.y) * 0.7071; float sd = (exp(-abs(gr.y) * 1400.0) * exp(-abs(gr.x) * 22.0) + exp(-abs(gr.x) * 1400.0) * exp(-abs(gr.y) * 22.0)) * 0.5;",
      "    vec3 fl = vec3(1.0, 0.9, 0.7) * (core + sx * 1.6 + sy + sd);",
      "    vec2 axis = uGlintPos - 0.5;",
      "    for (int i = 0; i < 3; i++) { float k = i == 0 ? -0.35 : (i == 1 ? -0.9 : 0.45); vec2 gp = (uv - (0.5 + axis * k)) * vec2(uAspect, 1.0); float gl = length(gp);",
      "      float rad = i == 0 ? 0.03 : (i == 1 ? 0.07 : 0.018); fl += (i == 1 ? vec3(0.35, 0.55, 1.0) : vec3(1.0, 0.7, 0.35)) * smoothstep(rad, rad * 0.6, gl) * 0.12; }",
      "    col += fl * uGlint;",
      "  }",
      "  col *= uExposure;",
      "  if (uTonemap > 0.5) col = tsACES(col);",
      "  float v = length(d * vec2(uAspect, 1.0) / max(uAspect, 1.0) * 1.35);",
      "  col *= mix(1.0, smoothstep(1.05, 0.2, v), uVig * 0.85);",
      "  col = toSRGB(clamp(col, 0.0, 1.0));",
      "  col += (hash(uv * uRes + fract(uTime * 7.3) * 91.0) - 0.5) * uGrain;",
      "  gl_FragColor = vec4(col * uFade, 1.0);",
      "}"].join("\n"), compU);

    var T = null;          // render targets
    function makeRT(w, h, opt) {
      opt = opt || {};
      var o = { type: opt.ldr || !hdr ? THREE.UnsignedByteType : THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!opt.depth, stencilBuffer: false };
      var rt = opt.msaa ? new THREE.WebGLMultisampleRenderTarget(Math.max(1, w), Math.max(1, h), o) : new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), o);
      if (opt.msaa) rt.samples = 4;
      rt.texture.generateMipmaps = false;
      return rt;
    }
    function freeTargets() { if (!T) return; T.all.forEach(function (rt) { rt.dispose(); }); T = null; }
    function buildTargets(W, H) {
      freeTargets();
      T = { all: [], W: W, H: H };
      function add(rt) { T.all.push(rt); return rt; }
      if (Q.refl) T.refl = add(makeRT(W >> 1, H >> 1, { depth: 1 }));
      if (!Q.post) return;
      T.scene = add(makeRT(W, H, { depth: 1, msaa: Q.msaa && caps.isWebGL2 && typeof THREE.WebGLMultisampleRenderTarget === "function" }));
      T.A = []; T.B = [];
      for (var i = 1; i <= Q.lv; i++) { T.A[i] = add(makeRT(Math.max(2, W >> i), Math.max(2, H >> i))); if (i < Q.lv) T.B[i] = add(makeRT(Math.max(2, W >> i), Math.max(2, H >> i))); }
      if (Q.dof) { T.depth = add(makeRT(W >> 2, H >> 2, { depth: 1, ldr: 1 })); T.D1 = add(makeRT(W >> 1, H >> 1)); T.D2 = add(makeRT(W >> 2, H >> 2)); }
      if (Q.streak) { T.S1 = add(makeRT(W >> 2, H >> 3)); T.S2 = add(makeRT(W >> 2, H >> 3)); }
    }
    function pass(mat, src, dst) {
      if (mat.uniforms.tSrc) { mat.uniforms.tSrc.value = src.texture; mat.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); }
      quad.material = mat; renderer.setRenderTarget(dst); renderer.render(postScene, postCam);
    }
    var hideInDepth = [dust, emitter].concat(beams.map(function (b) { return b.cone; }));
    function renderFrame() {
      var W = T.W, H = T.H;
      // 1 · planar reflection: mirror the world through the floor and render it at half resolution
      if (Q.refl && T.refl) {
        floor.visible = false; dust.visible = false;
        W3.scale.y = -1; W3.position.y = 2 * FLOOR; W3.updateMatrixWorld(true);
        renderer.setRenderTarget(T.refl); renderer.render(scene, camera);
        W3.scale.y = 1; W3.position.y = 0; W3.updateMatrixWorld(true);
        floor.visible = true; dust.visible = true;
        reflU.tRefl.value = T.refl.texture; reflU.uRefl.value = 0.9;
      } else reflU.uRefl.value = 0;
      if (!Q.post) { reflU.uRes.value.set(W, H); renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
      reflU.uRes.value.set(W, H);
      // 2 · the scene in HDR
      renderer.setRenderTarget(T.scene); renderer.render(scene, camera);
      // 3 · depth (quarter res) for the focus pull
      if (Q.dof && compU.uDof.value > 0.001) {
        hideInDepth.forEach(function (o) { o.visible = false; });
        var bg = scene.background; scene.background = WHITE; scene.overrideMaterial = mDepth; scene.fog = null;
        renderer.setRenderTarget(T.depth); renderer.render(scene, camera);
        scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
        hideInDepth.forEach(function (o) { o.visible = true; });
        pass(mDown, T.scene, T.D1); pass(mDown, T.D1, T.D2);
      }
      // 4 · bloom: threshold, dual-filter down, up and accumulate
      pass(mPre, T.scene, T.A[1]);
      for (var i = 2; i <= Q.lv; i++) pass(mDown, T.A[i - 1], T.A[i]);
      for (var j = Q.lv - 1; j >= 1; j--) { mUp.uniforms.tAdd.value = T.A[j].texture; pass(mUp, j === Q.lv - 1 ? T.A[Q.lv] : T.B[j + 1], T.B[j]); }
      // 5 · anamorphic streak
      if (Q.streak && T.S1) { mStreak.uniforms.uStep.value = 2.0; pass(mStreak, T.A[2], T.S1); mStreak.uniforms.uStep.value = 7.0; pass(mStreak, T.S1, T.S2); }
      // 6 · composite to the screen
      compU.tScene.value = T.scene.texture; compU.tBloom.value = (Q.lv > 1 ? T.B[1] : T.A[1]).texture;
      compU.tBlur.value = T.D2 ? T.D2.texture : T.scene.texture; compU.tDepth.value = T.depth ? T.depth.texture : T.scene.texture;
      compU.tStreak.value = T.S2 ? T.S2.texture : T.A[1].texture; compU.uHasStreak.value = T.S2 ? 1 : 0;
      compU.uRes.value.set(W, H); compU.uTonemap.value = hdr ? 1 : 0;
      mPre.uniforms.uTh.value = hdr ? 1.0 : 0.72;
      quad.material = mComp; renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    }
    var fog = scene.fog, WHITE = new THREE.Color(1, 1, 1);
    function applyToneMode() {
      // HDR post: render the scene linear, tone-map in the composite; LDR/no post: let three tone-map
      var tm = (Q.post && hdr) ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
      if (renderer.toneMapping !== tm) {
        renderer.toneMapping = tm; renderer.toneMappingExposure = 1.0;
        scene.traverse(function (o) { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.needsUpdate = true; }); });
      }
    }

    /* ================= camera rig + layout ================= */
    var rig = { D: 18, offY: 0, w: 1, h: 1, cy: 0 };
    var dpr = 1;
    function layout() {
      var m = measure(), w = m.w, h = m.h;
      dpr = Math.min(window.devicePixelRatio || 1, Q.dpr);
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      var W = Math.floor(w * dpr), H = Math.floor(h * dpr);
      if (!T || T.W !== W || T.H !== H || T.tier !== tier) { buildTargets(W, H); T.tier = tier; }
      camera.aspect = w / h;
      var coinPx = m.coinPx * (w / h < 0.75 ? 0.84 : 0.77);
      rig.D = (RAD * 2 * h / coinPx) / (2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)));
      rig.offY = Math.round(h / 2 - (m.cy - coinPx * 0.13));   // sit a touch high so the pedestal clears the copy
      rig.w = w; rig.h = h; rig.cy = m.cy;
      compU.uAspect.value = w / h;
      dustU.uPx.value = h * dpr * 0.06;
      applyToneMode();
    }
    layout();

    /* --- interaction: drag to spin, pointer / tilt parallax --- */
    var yaw = 0, spin = 0, idleSpin = 0.42, dragging = false, lastX = 0, lastT = 0, downX = 0, downY = 0, px = 0, py = 0, tx = 0, ty = 0;
    canvas.addEventListener("pointerdown", function (e) { dragging = true; lastX = downX = e.clientX; downY = e.clientY; lastT = performance.now(); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
    function onMove(e) {
      var w = root.clientWidth || 1, h = root.clientHeight || 1;
      tx = (e.clientX / w - 0.5) * 2; ty = (e.clientY / h - 0.5) * 2;
      if (!dragging) return;
      var now = performance.now(), dx = e.clientX - lastX, dt = Math.max((now - lastT) / 1000, 0.001);
      yaw += dx * 0.011; spin = clamp(dx * 0.011 / dt, -14, 14); lastX = e.clientX; lastT = now;
    }
    function endDrag(e) {
      if (dragging && e && Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) < 8) askTilt();
      dragging = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);

    /* image-based light follows the spotlights, so the vault really starts pitch dark */
    var envGroups = [
      { mats: [wallMat, colMat, brass, floorMat, lampMat, ceil.material], beams: [0, 1], floor: 0.06 },
      { mats: [doorFaceMat, steel, brassDoor, frameMat, tunnel.material], beams: [2], floor: 0.04 },
      { mats: coinMats.concat([rimMat, pedMat, brassPed]), beams: [3], floor: 0.0 }
    ];
    envGroups.forEach(function (g) { g.base = g.mats.map(function (m) { return m.envMapIntensity; }); });
    function envRamp() {
      envGroups.forEach(function (g) {
        var k = 0; g.beams.forEach(function (i) { k = Math.max(k, beams[i].k); });
        k = g.floor + (1 - g.floor) * k;
        g.mats.forEach(function (m, i) { m.envMapIntensity = g.base[i] * k; });
      });
    }

    /* ================= timeline ================= */
    var TL = { rise: 1.95, riseDur: 1.25, land: 3.2, focusA: 2.0, focusB: 3.1, sweep: 3.25, sweepDur: 1.3, glint: 3.7, dolly: 4.8, idle: 4.3 };
    var clock = 0, paused = false, enterT = -1, raf = 0, last = performance.now(), alive = true, frames = [], landed = false, rendered = 0;
    var cues = beams.map(function () { return false; });
    var v3 = new THREE.Vector3(), camPos = new THREE.Vector3(), lookAt = new THREE.Vector3(), heroPos = new THREE.Vector3(), heroLook = new THREE.Vector3();
    var flashEl = $(".ts-flash");

    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var raw = Math.max((now - last) / 1000, 0), rdt = Math.min(raw, 0.1); last = now;
      var dt = paused ? 0 : rdt;
      clock += dt;
      var t = clock;
      tickStats(now);

      // adaptive quality: step down a tier when frames are slow (the first frames compile shaders, so skip them);
      // a device that is far too slow drops straight to the cheapest tier
      if (!forced && tier < 4 && enterT < 0 && rendered > 5) {
        frames.push(Math.min(raw, 0.3));
        if (frames.length >= 24) {
          var avg = frames.reduce(function (a, b) { return a + b; }, 0) / frames.length; frames = [];
          if (avg > 0.028) { tier = avg > 0.09 ? 4 : tier + 1; Q = TIERS[tier]; layout(); dustGeo.setDrawRange(0, Math.round(nDust * Q.dust)); }
        }
      }

      /* lights snap on one by one */
      var s = enterT >= 0 ? t - enterT : -1;
      beams.forEach(function (b, i) {
        var on = flick(t - b.d.at), breath = 1 + 0.025 * Math.sin(t * 1.3 + i * 2.1) + 0.015 * Math.sin(t * 7.1 + i);
        if (!cues[i] && t >= b.d.at) { cues[i] = true; Sfx.clunk(i); }
        b.k = on * breath * (i < 3 ? 1 - (i === 2 ? 0.5 : 0.35) * smooth((t - TL.land + 0.2) / 1.2) : 1);
        b.light.intensity = b.d.I * b.k;
        // the camera flies through the coin's beam on Enter: fade that cone so it never fills the lens
        var through = s >= 0 && i === 3 ? 1 - smooth((s - 0.15) / 0.35) : 1;
        b.mat.uniforms.uI.value = 0.2 * b.k * (i === 3 ? 1.25 : 1) * through; b.mat.uniforms.uTime.value = t;
        b.lensM.color.setScalar(6 * b.k).multiply(b.mat.uniforms.uColor.value);
        dustU.uApex.value[i].copy(b.from); dustU.uDir.value[i].copy(b.dir); dustU.uBeam.value[i].set(b.cos, b.k * (i === 3 ? 1.3 : 0.9), b.len);
      });
      amb.intensity = 0.1 * clamp((t - 0.5) / 1.5, 0, 1);
      envRamp();

      /* the coin rises out of the pedestal, spinning, then settles with a chime */
      var rp = clamp((t - TL.rise) / TL.riseDur, 0, 1), re = easeOut3(rp);
      var settle = t > TL.rise + TL.riseDur ? Math.exp(-(t - TL.rise - TL.riseDur) * 3.2) * Math.sin((t - TL.rise - TL.riseDur) * 9) * 0.06 : 0;
      var idle = smooth((t - TL.idle) / 1.6);
      if (!landed && t >= TL.rise + TL.riseDur) { landed = true; Sfx.ring(); }
      coin.visible = t > TL.rise - 0.05;
      var riseSpin = (1 - re) * Math.PI * 6;
      if (!dragging) spin += (idleSpin * idle - spin) * (1 - Math.exp(-dt * 1.4));
      if (!dragging) yaw += spin * dt;
      var ptx = tilt.on ? tilt.x : tx, pty = tilt.on ? tilt.y : ty;
      px += (ptx - px) * (1 - Math.exp(-dt * 3.5)); py += (pty - py) * (1 - Math.exp(-dt * 3.5));
      coin.position.set(0, lerp(PED_TOP - RAD - 0.3, 0, re) + settle + Math.sin(t * 1.1) * 0.05 * smooth((t - TL.land) / 1), 0);
      coin.rotation.y = yaw + riseSpin + px * 0.25 * idle;
      coin.rotation.x = py * 0.18 * idle;
      coin.rotation.z = Math.sin(t * 0.7) * 0.03 * idle;
      var rising = rp > 0 && rp < 1 ? Math.sin(rp * Math.PI) : 0;
      glowRingMat.color.setRGB(3.2, 2.1, 0.9).multiplyScalar(beams[3].k * (0.5 + 0.5 * Math.exp(-Math.max(t - TL.land, 0) * 1.5) + rising));
      emitMat.uniforms.uI.value = rising * 2.2 + (t > TL.rise - 0.25 ? Math.exp(-Math.pow((t - TL.rise + 0.05) / 0.2, 2)) * 1.5 : 0);

      /* light sweep across the coin, then a key light parks front-left */
      var sw = clamp((t - TL.sweep) / TL.sweepDur, 0, 1);
      sweep.position.set(lerp(-10, 10, easeInOut(sw)), 2.5 + Math.sin(sw * Math.PI) * 1.2, 10);
      sweep.intensity = Math.sin(sw * Math.PI) * 4.2;
      fill.intensity = 1.4 * smooth((t - TL.sweep - 0.4) / 1.4) * (1 + 0.03 * Math.sin(t * 0.9));
      rimL.intensity = 1.6 * smooth((t - TL.land + 0.4) / 1.2);
      dustU.uApex.value[4].copy(sweep.position); dustU.uDir.value[4].copy(v3.copy(sweep.target.position).sub(sweep.position).normalize()); dustU.uBeam.value[4].set(Math.cos(0.2), sweep.intensity * 0.12, 25);

      /* camera: slow dolly-in with a little arc, parallax, then the Enter flight */
      var dk = easeInOut(clamp(t / TL.dolly, 0, 1));
      var dist = rig.D * lerp(1.5, 1, dk), elev = lerp(0.2, 0.075, dk) - py * 0.025 * idle, az = lerp(-0.2, 0, dk) + px * 0.05 * idle + Math.sin(t * 0.21) * 0.01;
      heroLook.set(0, 0, 0);
      heroPos.set(Math.sin(az) * Math.cos(elev) * dist, Math.sin(elev) * dist, Math.cos(az) * Math.cos(elev) * dist);
      var offY = rig.offY, fov = 35, doorOpen = 0;
      if (s >= 0) {
        // dial spins, door swings, light floods out, camera flies through
        wheel.rotation.z = -easeInOut(s / 0.55) * Math.PI * 1.1;
        doorOpen = easeInOut((s - 0.3) / 0.95);
        hinge.rotation.y = -doorOpen * 1.85;
        var fk = Math.pow(clamp((s - 0.12) / 1.3, 0, 1), 2.2);
        var doorC = v3.set(0, DOORY, WALLZ - 2);
        camPos.copy(heroPos).lerp(doorC, fk * 1.02);
        lookAt.copy(heroLook).lerp(doorC.set(0, DOORY, WALLZ - 3), smooth(s / 0.6));
        offY = rig.offY * (1 - smooth(s / 0.7));
        fov = 35 + fk * 22;
        coin.position.y += Math.pow(clamp(s / 0.9, 0, 1), 2) * 9; coin.rotation.x += s * 4;
        spin += 20 * dt;
        hallMat.uniforms.uI.value = doorOpen * 1.6 + fk * fk * 22; hallMat.uniforms.uT.value = t;
        hallLight.intensity = doorOpen * 2.2;
        compU.uExposure.value = 1 + fk * 1.2;
        flashEl.style.opacity = String(smooth((s - 1.05) / 0.4));
        if (s > 1.47 && !finishing) { finishing = true; finish(); }
      } else {
        camPos.copy(heroPos); lookAt.copy(heroLook);
      }
      camera.position.copy(camPos); camera.lookAt(lookAt);
      if (camera.fov !== fov) { camera.fov = fov; }
      camera.setViewOffset(rig.w, rig.h, 0, Math.round(offY), rig.w, rig.h);
      camera.updateProjectionMatrix();

      /* focus pull: sharp on the door while the room lights up, then racks to the coin as it lands */
      var dCoin = camPos.length(), dDoor = camPos.distanceTo(v3.set(0, DOORY, WALLZ));
      var fp = smooth((t - TL.focusA) / (TL.focusB - TL.focusA));
      var focus = s >= 0 ? lerp(dCoin, dDoor, smooth(s / 0.5)) : lerp(dDoor, dCoin, fp);
      compU.uFocus.value = focus / FAR; compU.uRange.value = 18 / FAR;
      compU.uDof.value = Q.dof && !dbgOff.dof ? 0.6 : 0;
      dustU.uFocus.value = focus; dustU.uDof.value = 0.16;
      dustU.uTime.value = t; dustU.uFade.value = clamp(t - 0.3, 0, 1);

      /* hero moment: a glint on the rim as the sweep passes */
      var gk = Math.exp(-Math.pow((t - TL.glint) / 0.28, 2));
      compU.uGlint.value = s >= 0 ? 0 : gk * 0.9;
      if (gk > 0.01) {
        v3.set(-0.72 * RAD, 0.7 * RAD, HALF + 0.05).applyEuler(coin.rotation).add(coin.position).project(camera);
        compU.uGlintPos.value.set(v3.x * 0.5 + 0.5, v3.y * 0.5 + 0.5);
      }
      compU.uStreak.value = 0.22 + gk * 0.35 + (s >= 0 ? doorOpen * 0.15 : 0);
      compU.uBloom.value = 0.6 + gk * 0.2;
      compU.uTime.value = t;
      if (dbgOff.streak) compU.uStreak.value = 0;
      if (dbgOff.bloom) compU.uBloom.value = 0;
      compU.uFade.value = 1;

      renderFrame();
      if (++rendered === 2) root.classList.add("ts-glon");
    }
    var finishing = false, dbgOff = {};

    gl = {
      layout: layout,
      setFeatured: setFeatured,
      startEnter: function () { enterT = clock; },
      dispose: function () {
        alive = false; cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", endDrag); window.removeEventListener("pointercancel", endDrag);
        freeTargets();
        [scene, postScene].forEach(function (sc) {
          sc.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
          });
        });
        [mPre, mDown, mUp, mStreak, mDepth, mComp].forEach(function (m) { m.dispose(); });
        disposables.forEach(function (x) { try { x.dispose(); } catch (e) {} });
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
        if (window.TitanSplash) delete window.TitanSplash._debug;
      }
    };
    window.TitanSplash._debug = {
      setYaw: function (y) { yaw = y; spin = 0; idleSpin = 0; },
      seek: function (tt) { clock = tt; paused = true; for (var i = 0; i < cues.length; i++) cues[i] = beams[i].d.at <= tt; landed = tt > TL.rise + TL.riseDur; },
      play: function () { paused = false; },
      enterT: function () { return enterT; },
      off: function (k, v) { dbgOff[k] = v; },
      info: function () {
        v3.copy(coin.position).project(camera);
        return { tier: tier, hdr: hdr, webgl2: caps.isWebGL2, msaa: !!(T && T.scene && T.scene.isWebGLMultisampleRenderTarget), dpr: dpr, clock: clock,
          coin: { x: (v3.x * 0.5 + 0.5) * rig.w, y: (0.5 - v3.y * 0.5) * rig.h }, featured: featured,
          cam: camera.position.toArray(), k: beams.map(function (b) { return b.k; }), yaw: yaw, spin: spin, px: px, coinY: coin.position.y, exp: compU.uExposure.value };
      }
    };
    raf = requestAnimationFrame(frame);
  }
})();
