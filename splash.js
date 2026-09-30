/* Titan Reliquary · splash.js — "The Awakening"
   A one-per-session cinematic intro for the Grand Hall:
     · a procedurally struck gold proof coin (WebGL, three.js) that tumbles in, catches a light sweep,
       and can be dragged and spun; mirror fields + frosted relief, image-based reflections
     · drifting gold dust, god rays, film grain, letter-by-letter title reveal, live vault stats
     · ENTER flies the camera through the coin into the hall
   Falls back to a CSS coin without WebGL, and to a quick fade with prefers-reduced-motion.
   Starts only if <html> has class "ts-on" (set by the inline gate in index.html).
   Replay any time:  TitanSplash.replay()   or add ?splash=1 to the URL. Skip: ?nosplash */
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
  function smooth(x) { return x * x * (3 - 2 * x); }

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
    return true;
  }
  var poll = setInterval(function () { if (readVault() || performance.now() - tStart > 8000) clearInterval(poll); }, 200);
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
  later(function () { countStart = performance.now(); }, 3000);
  if (reduce) { countStart = 1; }

  /* ---------- layout: the coin (3D or CSS fallback) fills the free band above the copy ---------- */
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

  /* ---------- lifecycle ---------- */
  function lockApp(on) {
    if (!app) return;
    if (on) { app.setAttribute("aria-hidden", "true"); if ("inert" in app) app.inert = true; }
    else { app.removeAttribute("aria-hidden"); if ("inert" in app) app.inert = false; }
  }
  lockApp(true);
  root.classList.add("ts-run");

  function onKey(e) {
    if (state === "done") return;
    var k = e.key;
    if (k === "Enter" || k === " " || k === "Spacebar") {
      e.preventDefault(); e.stopPropagation(); enter(false);
    } else if (k === "Escape") {
      e.preventDefault(); e.stopPropagation(); enter(true);
    } else if (k !== "Tab") {
      e.stopPropagation();            // keep the app's hotkeys quiet behind the splash
    }
  }
  window.addEventListener("keydown", onKey, true);

  var btnEnter = $(".ts-enter"), btnSkip = $(".ts-skip");
  btnEnter.addEventListener("click", function () { enter(false); });
  btnSkip.addEventListener("click", function () { enter(true); });
  later(function () { try { btnEnter.focus({ preventScroll: true }); } catch (e) {} }, 3700);

  function enter(skip) {
    if (state !== "intro") return;
    state = "entering";
    root.classList.add("ts-entering");
    if (gl && !skip && !reduce) { gl.startEnter(performance.now()); }
    else { finish(); }
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
    clearInterval(poll); timers.forEach(clearTimeout);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    if (gl) gl.dispose();
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
  function fail() { root.classList.add("ts-nogl"); gl = null; }
  if (reduce || !window.THREE) { if (!reduce) fail(); if (reduce) { root.classList.add("ts-nogl"); } return; }

  var fontReady = (document.fonts && document.fonts.load)
    ? Promise.race([document.fonts.load('600 64px "Fraunces"'), new Promise(function (r) { setTimeout(r, 900); })])
    : Promise.resolve();
  fontReady.then(function () { try { initGL(); } catch (err) { if (window.console) console.warn("splash gl", err); fail(); } });

  function initGL() {
    var THREE = window.THREE;
    var canvas = $(".ts-gl");
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { fail(); return; }
    canvas.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); fail(); });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    var maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    var small = Math.min(window.innerWidth, window.innerHeight) < 520;
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 2 : 2);

    /* --- environment: a studio of softboxes, so the metal has something to mirror --- */
    (function () {
      var c = document.createElement("canvas"); c.width = 1024; c.height = 512;
      var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#0d0a05"); g.addColorStop(0.45, "#3a2c12"); g.addColorStop(0.55, "#5a4520"); g.addColorStop(1, "#070503");
      x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
      if (x.filter !== undefined) x.filter = "blur(10px)";
      function box(x0, y0, w, h, col) { x.fillStyle = col; x.fillRect(x0, y0, w, h); }
      box(90, 110, 120, 240, "#fff1cf");        // key softbox, left
      box(690, 90, 90, 260, "#ffe7b0");         // right
      box(360, 20, 300, 46, "#fffaf0");         // overhead strip
      box(500, 300, 220, 30, "#c9d8ff");        // cool kicker for colour contrast on the gold
      box(0, 250, 1024, 14, "#b08a3a");         // horizon glow
      var tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
      var pm = new THREE.PMREMGenerator(renderer);
      var rt = pm.fromEquirectangular(tex);
      scene.environment = rt.texture;
      tex.dispose(); pm.dispose();
    })();

    /* --- coin faces: colour + roughness + relief maps, painted together --- */
    var CX = 512, CY = 512, R = 512, S = 1024;
    var ROT_TOP = Math.PI / 2, ROT_BOT = -Math.PI / 2, FLIP_BOT = false;
    function mk() { var c = document.createElement("canvas"); c.width = c.height = S; return c; }
    function paintFace(kind) {
      var cc = mk(), rc = mk(), bc = mk();
      var g = cc.getContext("2d"), r = rc.getContext("2d"), b = bc.getContext("2d");
      var L = [
        { c: g, field: "#c99a36", dev: "#f4d98c" },
        { c: r, field: "#262626", dev: "#bdbdbd" },   // mirror field (low roughness), frosted devices
        { c: b, field: "#3a3a3a", dev: "#ffffff" }    // relief
      ];
      // base fills
      var bg = g.createRadialGradient(CX * 0.8, CY * 0.7, 40, CX, CY, R);
      bg.addColorStop(0, "#f0cf76"); bg.addColorStop(0.55, "#cf9f3a"); bg.addColorStop(1, "#9a6f1e");
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      r.fillStyle = L[1].field; r.fillRect(0, 0, S, S);
      b.fillStyle = L[2].field; b.fillRect(0, 0, S, S);
      // cartwheel luster streaks (colour only)
      g.save(); g.translate(CX, CY); g.lineWidth = 1.2;
      for (var i = 0; i < 260; i++) { var a = i / 260 * Math.PI * 2; g.strokeStyle = "rgba(255,244,205," + (0.03 + (i % 3) * 0.02) + ")"; g.beginPath(); g.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
      g.restore();
      function each(mode, fn) { L.forEach(function (l) { l.c.fillStyle = l.c.strokeStyle = l[mode]; fn(l.c); }); }
      function ring(rad, w, mode) { each(mode || "dev", function (c) { c.lineWidth = w; c.beginPath(); c.arc(CX, CY, rad, 0, 7); c.stroke(); }); }
      function disc(rad, mode) { each(mode || "dev", function (c) { c.beginPath(); c.arc(CX, CY, rad, 0, 7); c.fill(); }); }
      function beads(rad, n, size) { each("dev", function (c) { for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; c.beginPath(); c.arc(CX + Math.cos(a) * rad, CY + Math.sin(a) * rad, size, 0, 7); c.fill(); } }); }
      function ringText(text, rad, size) {
        var n = text.length, step = Math.PI * 2 / n;
        each("dev", function (c) {
          c.font = '600 ' + size + 'px "Fraunces", Georgia, serif'; c.textAlign = "center"; c.textBaseline = "middle";
          for (var i = 0; i < n; i++) {
            var a = -Math.PI / 2 + (i + 0.5) * step;
            c.save(); c.translate(CX + Math.cos(a) * rad, CY + Math.sin(a) * rad); c.rotate(a + Math.PI / 2); c.fillText(text[i], 0, 0); c.restore();
          }
        });
      }
      ring(R * 0.955, 18);                 // raised outer rim
      beads(R * 0.885, 108, 5.5);
      if (kind === 0) {
        ringText("TITAN · RELIQUARY · VAULT & MUSEUM · MMXXVI · ", R * 0.775, 58);
        ring(R * 0.655, 5);
        // sunburst
        each("dev", function (c) {
          for (var i = 0; i < 48; i++) {
            var a = i / 48 * Math.PI * 2, long = i % 2 === 0, r0 = R * 0.2, r1 = R * (long ? 0.5 : 0.42), hw = long ? 0.028 : 0.02;
            c.beginPath(); c.moveTo(CX + Math.cos(a - hw) * r0, CY + Math.sin(a - hw) * r0); c.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); c.lineTo(CX + Math.cos(a + hw) * r0, CY + Math.sin(a + hw) * r0); c.closePath(); c.fill();
          }
        });
        // laurel wreath, two sprays that meet at the bottom
        each("dev", function (c) {
          for (var side = -1; side <= 1; side += 2) {
            for (var k = 0; k < 15; k++) {
              var t = k / 14, a = Math.PI / 2 - side * (0.18 + t * 2.25);          // from bottom up each side
              var rr = R * 0.585, px = CX + Math.cos(a) * rr, py = CY + Math.sin(a) * rr;
              c.save(); c.translate(px, py); c.rotate(a + (side < 0 ? Math.PI / 2 : -Math.PI / 2) + side * 0.55);
              c.beginPath(); c.ellipse(0, 0, 10 + (1 - t) * 7, 31 - t * 6, 0, 0, 7); c.fill(); c.restore();
            }
          }
        });
        disc(R * 0.19);                                       // frosted medallion
        each("field", function (c) {                          // mirror-finish "T" struck into it
          c.font = '600 190px "Fraunces", Georgia, serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("T", CX, CY + 12);
        });
        ring(R * 0.19, 6);
      } else {
        ringText("CUSTODIA · LEGATUM · MEMORIA · FIDES · ", R * 0.775, 58);
        ring(R * 0.655, 5);
        ring(R * 0.6, 10);
        // vault dial ticks
        each("dev", function (c) {
          c.lineCap = "round";
          for (var i = 0; i < 60; i++) { var a = i / 60 * Math.PI * 2, l = i % 5 === 0 ? 0.075 : 0.04; c.lineWidth = i % 5 === 0 ? 7 : 3.5; c.beginPath(); c.moveTo(CX + Math.cos(a) * R * 0.53, CY + Math.sin(a) * R * 0.53); c.lineTo(CX + Math.cos(a) * R * (0.53 - l), CY + Math.sin(a) * R * (0.53 - l)); c.stroke(); }
        });
        // eight locking bolts
        each("dev", function (c) { for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + Math.PI / 8; c.beginPath(); c.arc(CX + Math.cos(a) * R * 0.36, CY + Math.sin(a) * R * 0.36, 26, 0, 7); c.fill(); } });
        each("field", function (c) { for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + Math.PI / 8; c.beginPath(); c.arc(CX + Math.cos(a) * R * 0.36, CY + Math.sin(a) * R * 0.36, 11, 0, 7); c.fill(); } });
        disc(R * 0.17);
        each("field", function (c) {                          // eight-point star in the hub
          c.beginPath();
          for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? R * 0.045 : R * 0.13; c.lineTo(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr); }
          c.closePath(); c.fill();
        });
      }
      var map = new THREE.CanvasTexture(cc); map.encoding = THREE.sRGBEncoding; map.anisotropy = maxAniso;
      var rough = new THREE.CanvasTexture(rc); rough.anisotropy = maxAniso;
      var bump = new THREE.CanvasTexture(bc); bump.anisotropy = maxAniso;
      return { map: map, rough: rough, bump: bump };
    }
    // three's CylinderGeometry cap UVs are rotated a quarter turn (and the bottom cap is mirrored); undo that per face
    function orient(t, rot, flip) {
      [t.map, t.rough, t.bump].forEach(function (x) {
        x.center.set(0.5, 0.5); x.rotation = rot;
        if (flip) { x.wrapS = THREE.RepeatWrapping; x.repeat.x = -1; x.offset.x = 1; }
      });
    }
    function faceMaterial(t) {
      return new THREE.MeshStandardMaterial({ map: t.map, roughnessMap: t.rough, roughness: 1, metalness: 1, bumpMap: t.bump, bumpScale: 2.6, envMapIntensity: 1.45 });
    }
    var obv = paintFace(0), rev = paintFace(1);
    orient(obv, ROT_TOP, false); orient(rev, ROT_BOT, FLIP_BOT);

    /* --- reeded edge --- */
    var edgeTex = (function () {
      var c = document.createElement("canvas"); c.width = 32; c.height = 8; var x = c.getContext("2d");
      var g = x.createLinearGradient(0, 0, 32, 0);
      g.addColorStop(0, "#5a3f10"); g.addColorStop(0.45, "#f0d074"); g.addColorStop(1, "#5a3f10");
      x.fillStyle = g; x.fillRect(0, 0, 32, 8);
      var t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(110, 1); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t;
    })();

    var RAD = 1.6, HALF = 0.09;
    var coin = new THREE.Group(); coin.rotation.order = "YXZ";
    var body = new THREE.Mesh(
      new THREE.CylinderGeometry(RAD, RAD, HALF * 2, 160, 1),
      [new THREE.MeshStandardMaterial({ map: edgeTex, metalness: 1, roughness: 0.32, envMapIntensity: 1.3 }), faceMaterial(obv), faceMaterial(rev)]
    );
    body.rotation.x = Math.PI / 2;               // cap +Y → faces the camera (+Z)
    coin.add(body);
    var rimMat = new THREE.MeshStandardMaterial({ color: 0xc99a34, metalness: 1, roughness: 0.3, envMapIntensity: 1.15 });
    var rimGeo = new THREE.TorusGeometry(RAD - 0.055, 0.06, 20, 200);
    var rimA = new THREE.Mesh(rimGeo, rimMat); rimA.position.z = HALF; coin.add(rimA);
    var rimB = new THREE.Mesh(rimGeo, rimMat); rimB.position.z = -HALF; coin.add(rimB);
    scene.add(coin);

    var key = new THREE.DirectionalLight(0xffe4a6, 1.6); key.position.set(-6, 4, 6); scene.add(key);
    var kick = new THREE.DirectionalLight(0x9db8ff, 0.55); kick.position.set(6, -2, -3); scene.add(kick);
    scene.add(new THREE.AmbientLight(0xffe9c0, 0.12));

    /* --- gold dust --- */
    var sprite = (function () {
      var c = document.createElement("canvas"); c.width = c.height = 64; var x = c.getContext("2d");
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,244,205,1)"); g.addColorStop(0.25, "rgba(255,214,120,.65)"); g.addColorStop(1, "rgba(255,190,70,0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
    })();
    function makeDust(n, size, opacity) {
      var geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), ph = new Float32Array(n), sp = new Float32Array(n);
      for (var i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 18; pos[i * 3 + 1] = (Math.random() - 0.5) * 12; pos[i * 3 + 2] = -6 + Math.random() * 10; ph[i] = Math.random() * 6.283; sp[i] = 0.1 + Math.random() * 0.32; }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({ map: sprite, size: size, sizeAttenuation: true, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xf2cf78 });
      var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
      return { pts: pts, geo: geo, pos: pos, ph: ph, sp: sp, n: n, mat: mat, base: opacity };
    }
    var nDust = small ? 170 : 340;
    var dustA = makeDust(nDust, 0.16, 0.85), dustB = makeDust(Math.round(nDust * 0.6), 0.34, 0.32);
    function stepDust(d, dt, T, mult) {
      for (var i = 0; i < d.n; i++) {
        var j = i * 3;
        d.pos[j + 1] += d.sp[i] * dt * mult;
        d.pos[j] += Math.sin(T * 0.45 + d.ph[i]) * 0.16 * dt;
        if (d.pos[j + 1] > 6.2) { d.pos[j + 1] = -6.2; d.pos[j] = (Math.random() - 0.5) * 18; }
      }
      d.geo.attributes.position.needsUpdate = true;
    }

    /* --- layout: coin sits above the copy block --- */
    function layout() {
      var m = measure(), w = m.w, h = m.h;
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.set(0, 0, (RAD * 2 * h / m.coinPx) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
      camera.setViewOffset(w, h, 0, Math.round(h / 2 - m.cy), w, h);   // moves the picture so the coin sits at cy
      camera.updateProjectionMatrix();
    }
    layout();

    /* --- interaction: drag to spin, pointer parallax --- */
    var yaw = 0, spin = 0, idleSpin = 0.5, dragging = false, lastX = 0, lastT = 0, px = 0, py = 0, tx = 0, ty = 0;
    canvas.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; lastT = performance.now(); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
    window.addEventListener("pointermove", function (e) {
      var w = root.clientWidth || 1, h = root.clientHeight || 1;
      tx = (e.clientX / w - 0.5) * 2; ty = (e.clientY / h - 0.5) * 2;
      if (!dragging) return;
      var now = performance.now(), dx = e.clientX - lastX, dt = Math.max((now - lastT) / 1000, 0.001);
      yaw += dx * 0.011; spin = clamp(dx * 0.011 / dt, -14, 14); lastX = e.clientX; lastT = now;
    });
    function endDrag() { dragging = false; }
    window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);

    /* --- main loop --- */
    var glowEl = $(".ts-glow"), flashEl = $(".ts-flash");
    var raf = 0, last = performance.now(), enterT0 = 0, frames = [], degraded = false, alive = true;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      var T = (now - tStart) / 1000;
      tickStats(now);

      // adaptive quality: drop pixel ratio + dust if the device struggles
      if (!degraded && T > 2.5) {
        frames.push(dt); if (frames.length > 50) frames.shift();
        if (frames.length === 50) { var avg = frames.reduce(function (a, b) { return a + b; }, 0) / 50; if (avg > 0.034) { degraded = true; dpr = 1; layout(); dustB.pts.visible = false; } }
      }

      // entrance: coin rises out of the dark while tumbling forward, lands face-on
      var e = clamp((T - 0.35) / 1.7, 0, 1), ee = 1 - Math.pow(1 - e, 3);
      var idle = smooth(clamp((T - 2.0) / 1.3, 0, 1));
      if (!dragging) spin += (idleSpin * idle - spin) * (1 - Math.exp(-dt * 1.4));
      if (!dragging) yaw += spin * dt;
      px += (tx - px) * (1 - Math.exp(-dt * 4)); py += (ty - py) * (1 - Math.exp(-dt * 4));
      var scale = 1, boost = 1, s = 0;
      if (enterT0) { s = (now - enterT0) / 1000; boost = 1 + s * 9; spin += 30 * dt * clamp(s / 0.5, 0, 1); }
      coin.visible = e > 0;
      coin.position.y = (1 - ee) * -6.8 + Math.sin(T * 1.15) * 0.06 * ee;
      coin.rotation.x = (1 - ee) * -Math.PI * 5 + py * 0.22 * idle;
      coin.rotation.y = yaw + px * 0.28 * idle;
      coin.rotation.z = Math.sin(T * 0.7) * 0.03 * idle;
      if (enterT0) { scale = 1 + Math.pow(clamp(s / 0.95, 0, 1), 2.4) * 8.5; coin.scale.setScalar(scale); }

      // light sweep + glow
      var sw = clamp((T - 2.05) / 1.3, 0, 1);
      key.position.x = -6 + sw * 12 + Math.sin(T * 0.6) * 0.8; key.intensity = 1.5 + Math.sin(sw * Math.PI) * 2.2;
      var flare = Math.sin(sw * Math.PI);
      glowEl.style.opacity = String(clamp(ee * (0.55 + 0.12 * Math.sin(T * 1.7)) + flare * 0.35, 0, 1) * (enterT0 ? clamp(1 - s * 1.2, 0, 1) : 1));
      glowEl.style.transform = "scale(" + (0.9 + ee * 0.15 + flare * 0.1 + (enterT0 ? s * 1.4 : 0)) + ")";

      stepDust(dustA, dt, T, boost); stepDust(dustB, dt, T, boost);
      var dustFade = clamp((T - 0.2) / 1.2, 0, 1);
      dustA.mat.opacity = dustA.base * dustFade; dustB.mat.opacity = dustB.base * dustFade;

      if (enterT0) {
        flashEl.style.opacity = String(smooth(clamp((s - 0.4) / 0.5, 0, 1)));
        if (s > 0.95) { enterT0 = 0; finishSoon(); }
      }
      renderer.render(scene, camera);
    }
    var finishing = false;
    function finishSoon() { if (finishing) return; finishing = true; finish(); }

    gl = {
      layout: layout,
      startEnter: function (now) { enterT0 = now; },
      dispose: function () {
        alive = false; cancelAnimationFrame(raf);
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
            ["map", "roughnessMap", "bumpMap"].forEach(function (k) { if (m[k]) m[k].dispose(); }); m.dispose();
          });
        });
        if (scene.environment) scene.environment.dispose();
        sprite.dispose(); edgeTex.dispose();
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      }
    };
    window.TitanSplash._debug = { setYaw: function (y) { yaw = y; spin = 0; idleSpin = 0; } };
    raf = requestAnimationFrame(frame);
  }
})();
