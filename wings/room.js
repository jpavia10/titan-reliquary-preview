/* wings/room.js: the opening and the room on the theme's photograph (rule 12, docs/design/THEME_FRAMEWORK.md; owner 2026-11-08: every
   theme is a photograph with the app's live layers over it, no code-built worlds). This small part loads at boot: engineOpening() for
   splash.js (the opening on the photograph behind the app, wings/plate.js) and the loader for the room itself (wings/room-shell.js +
   styles/room-shell.css, fetched on the first Step inside). path() is the old world-camera move, kept for a world-room that is no more. */
(function () {
  "use strict";
  var html = document.documentElement;
  function K() { return window.TitanFXK; }
  function motion() {
    var m = html.dataset.motion; if (m === "calm" || m === "off") return m;
    try { if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return "calm"; } catch (e) { /* ignore */ }
    return "full";
  }
  function label(id) { var W = window.TITAN_WORLDS || [], w = W.filter(function (x) { return x.id === id; })[0]; return w ? w.name : id; }
  function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function lerp(a, b, e) { var o = {}; ["yaw", "pitch", "move", "up"].forEach(function (k) { var x = a && a[k] || 0, y = b && b[k] || 0; o[k] = x + (y - x) * e; }); return o; }

  /* a camera path on the running world: O = { dur, from, to, hit, at }. The view goes from -> to over dur seconds (eased), a touch lands
     at screen point `at` after `hit` seconds, onTitle runs at 55 %, onEnd at the end. seek(t, hold) jumps (hold = stay there: tests). */
  function path(O, mode, onTitle, onEnd) {
    var t0 = performance.now(), raf = 0, hit = false, titled = false, done = false, held = false;
    function at(t) {
      var k = Math.max(0, Math.min(1, t / O.dur)), v = lerp(O.from, O.to, ease(k)); v.mode = mode; K().setView(v);
      if (!hit && t >= (O.hit || 0)) { hit = true; if (O.at) K().tap(O.at[0], O.at[1]); }
      if (!titled && t >= O.dur * .55) { titled = true; if (onTitle) onTitle(); }
      if (k >= 1 && !held && !done) { done = true; if (onEnd) onEnd(); return false; }
      return !done;
    }
    function tick(now) { raf = 0; if (held || done) return; if (at((now - t0) / 1000)) raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return {
      seek: function (t, hold) { t0 = performance.now() - t * 1000; held = !!hold; if (t < (O.hit || 0)) hit = false; at(t); if (!held && !raf && !done) raf = requestAnimationFrame(tick); },
      stop: function () { done = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
      get t() { return (performance.now() - t0) / 1000; }
    };
  }

  /* The launch opening (splash.js motion path, when hasOpening(theme)): black at once, the splash goes transparent over the theme's
     photograph (wings/plate.js, already up behind the app), the camera pushes in out of the dark as the light comes up, the name comes
     up, then done() and the app fades in over the same photograph, which stays as the backdrop. If the photo is not up within 5 s
     (slow line, no WebGL2), fallback() runs the theme's separate opening instead. */
  var op = null;
  function engineOpening(root, id, done, fallback) {
    var stopped = false, p = null, PL = window.TitanPlate;
    function cls(on) { html.classList.toggle("ts-engine", on); root.classList.toggle("ts-engine", on); }
    cls(true);
    var dark = document.createElement("div"); dark.className = "ts-engine-dark"; root.appendChild(dark);
    var title = document.createElement("div"); title.className = "ts-engine-title"; title.setAttribute("aria-hidden", "true"); title.textContent = label(id); root.appendChild(title);
    window.__tsFilmUntil = performance.now() + 17000;          // the splash's 7.4 s cap waits for this opening (it ends itself)
    function undo() { cls(false); [dark, title].forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); }); }
    function back() { if (p) p.stop(); html.classList.remove("ts-engine"); root.classList.remove("ts-engine"); setTimeout(function () { html.classList.remove("ts-engine-fade"); }, 1100); }
    (PL ? PL.whenReady(id, 5000) : Promise.resolve(false)).then(function (ok) {
      if (stopped) return;
      if (!ok) { undo(); window.__tsFilmUntil = 0; op = null; stopped = true; fallback(); return; }
      start();
    });
    function start() {
      var dur = 5.6; window.__tsFilmUntil = performance.now() + (dur + 4) * 1000;
      p = PL.opening({ dur: dur, onTitle: function () { title.textContent = label(id); title.classList.add("on"); }, onEnd: function () { setTimeout(handoff, 700); } });   /* the name now: the theme list loads after the splash starts */
      requestAnimationFrame(function () { dark.style.opacity = "0"; });
    }
    function handoff() { if (stopped) return; html.classList.add("ts-engine-fade"); requestAnimationFrame(function () { if (stopped) return; back(); done(); }); }
    op = { id: id, feature: function () {}, get started() { return !!p; },
      seek: function (t, hold) { if (p) p.seek(t, hold); },
      stop: function () { if (stopped) return; stopped = true; back(); undo(); op = null; } };
    return op;
  }
  /* every theme opens on its photograph (owner 2026-11-08, "Do it for all 50"); Calm and Off keep the still opening. ?intro plays the
     separate opening scene instead (js/motion-splash.js: the fallback for Calm and for a browser without WebGL2), for its tests */
  function hasOpening(id) { return !!(window.TitanPlate && TitanPlate.has(id) && motion() === "full" && window.WebGL2RenderingContext && !/[?&]intro\b/.test(location.search)); }

  /* ============================== the room (wings/room-shell.js, loaded on first use) ============================== */
  var loading = null;
  function shell() {
    if (window.TitanRoomShell) return Promise.resolve(window.TitanRoomShell);
    if (!loading) loading = new Promise(function (res, rej) {
      var s = document.querySelector('script[src*="wings/room.js"]'), q = s && /\?v=[^&]+/.exec(s.src), v = q ? q[0] : "";
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "styles/room-shell.css" + v; document.head.appendChild(l);
      var sc = document.createElement("script"); sc.src = "wings/room-shell.js" + v;
      sc.onload = function () { res(window.TitanRoomShell); }; sc.onerror = function (e) { loading = null; rej(e); }; document.head.appendChild(sc); });
    return loading;
  }
  function open() { return shell().then(function (S) { return S.open({ path: path, label: label, motion: motion }); }); }

  window.TitanRoom = {
    hasOpening: hasOpening, engineOpening: engineOpening, path: path, open: open,
    close: function () { var c = window.TitanRoomShell && window.TitanRoomShell.current(); if (c) c.close(); },
    current: function () { return window.TitanRoomShell ? window.TitanRoomShell.current() : null; },
    op: function () { return op; }
  };
})();
