/* wings/atmosphere.js: the Atmosphere (replaces the Scene Studio sheet as the face of themes, sound and look). Claude, 2026-10-30.
   Owner, 2026-10-30: "When are you updating the ui for the atmosphere and ambient area. Its still the clunky gold and black bullshit";
   rule 12(c): rebuilt at high fidelity, layers that move in depth, and it leads into the room.

   The live theme world is the whole background (the collection steps aside while this is open). Over it, in four depths that slide
   against each other with the pointer or the phone's tilt:
     far    the theme's name and mood, very large and light
     middle a ring of theme portals in 3D (every theme's picture card on a cylinder): drag or swipe to turn it, tap the front portal to
            go there (the world changes behind and its camera flies in), tap a side portal to bring it to the front; the groups filter it
     near   the dock: the sound orb (play / pause, a ring that follows the music), the volume, Sound, Look, and Step inside (the room)
   Sound and Look open as glass panels. Sound: this theme's sound, the moods, the layers in the mix with a level each. Look: Motion,
   Graphics quality, the Opening, the opening on a theme switch. "All settings" opens the old studio for the rest (radio, tone, saved
   scenes). Everything it changes goes through the same calls as before (TitanScene, TitanWorlds, TitanMotion, TitanQuality, TitanOpening),
   so it is saved the same way. styles/atmosphere.css loads with the first open.
   TitanAtmosphere.open([tab]) / close() / isOpen(); #btn-atmo opens it (app.js openAtmoSheet). */
(function () {
  "use strict";
  if (window.TitanAtmosphere) return;
  var html = document.documentElement, BUILD = window.TITAN_BUILD || "";
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var motion = function () { return window.TitanMotion && window.TitanMotion.level ? window.TitanMotion.level() : "full"; };
  var root = null, cssReady = null, state = { open: false, pos: 0, vel: 0, group: "All", list: [], raf: 0, drag: null, panel: null, last: null, tilt: [0, 0], ptr: [0, 0] };

  function css() {
    if (cssReady) return cssReady;
    cssReady = new Promise(function (ok) {
      if (document.querySelector('link[href^="styles/atmosphere.css"]')) return ok();
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "styles/atmosphere.css?v=" + BUILD;
      l.onload = ok; l.onerror = ok; document.head.appendChild(l); setTimeout(ok, 1500);
    });
    return cssReady;
  }
  function worlds() { return window.TitanWorlds ? window.TitanWorlds : null; }
  function current() { return html.getAttribute("data-atmo") || "afterhours"; }
  function groups() {
    var W = worlds(); if (!W || !W.groups) return [{ name: "All", list: [] }];
    var g = W.groups(), all = [];
    g.forEach(function (x) { x.list.forEach(function (w) { all.push(w); }); });
    return [{ name: "All", list: all }].concat(g.map(function (x) { return { name: x.name, list: x.list }; }));
  }
  function listFor(name) { var g = groups().filter(function (x) { return x.name === name; })[0] || groups()[0]; return g.list; }
  function accent() {
    var cs = getComputedStyle(html), a = (cs.getPropertyValue("--accent") || cs.getPropertyValue("--gold") || "").trim();
    return a || "#c9d6ff";
  }

  /* ------------------------------------------------------------------ markup ------------------------------------------------------------------ */
  function build() {
    root = document.createElement("div");
    root.id = "atmos"; root.className = "atm"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Atmosphere");
    root.innerHTML =
      '<div class="atm-shade" aria-hidden="true"></div>' +
      '<header class="atm-head atm-l1">' +
        '<div class="atm-kick"><span class="atm-dot" aria-hidden="true"></span>Atmosphere</div>' +
        '<h2 class="atm-name" id="atm-name"></h2>' +
        '<p class="atm-mood" id="atm-mood"></p>' +
      '</header>' +
      '<button type="button" class="atm-x" id="atm-x" aria-label="Close the Atmosphere">' + svg("x") + '</button>' +
      '<div class="atm-groups atm-l2" role="tablist" aria-label="Kinds of theme" id="atm-groups"></div>' +
      '<div class="atm-ring atm-l3" id="atm-ring" aria-label="Themes: drag to turn, tap the front one to go there" role="listbox"></div>' +
      '<p class="atm-hint atm-l3" id="atm-hint" aria-live="polite"></p>' +
      '<button type="button" class="atm-enter atm-l4" id="atm-enter"><span class="atm-enter-ring" aria-hidden="true"></span><span class="atm-enter-t">Step inside</span><span class="atm-enter-s">the theme on its own, the collection away</span></button>' +
      '<div class="atm-dock atm-l4" role="group" aria-label="Sound and look">' +
        '<button type="button" class="atm-orb" id="atm-orb" aria-label="Play the sound"><span class="atm-orb-lv" aria-hidden="true"></span><span class="atm-orb-i" aria-hidden="true">' + svg("play") + '</span></button>' +
        '<div class="atm-vol"><input type="range" id="atm-vol" min="0" max="1" step="0.01" aria-label="Volume"><span class="atm-now" id="atm-now"></span></div>' +
        '<button type="button" class="atm-pill" data-open="sound" aria-expanded="false">Sound</button>' +
        '<button type="button" class="atm-pill" data-open="look" aria-expanded="false">Look</button>' +
      '</div>' +
      '<section class="atm-panel" id="atm-p-sound" data-panel="sound" aria-label="Sound" hidden></section>' +
      '<section class="atm-panel" id="atm-p-look" data-panel="look" aria-label="Look" hidden></section>';
    document.body.appendChild(root);
    root.querySelector("#atm-x").addEventListener("click", close);
    root.querySelector("#atm-enter").addEventListener("click", enter);
    root.querySelector("#atm-orb").addEventListener("click", function () { var S = window.TitanScene; if (S && S.toggle) S.toggle(); later(syncSound, 120); });
    root.querySelector("#atm-vol").addEventListener("input", function (e) { var S = window.TitanScene; if (S && S.setVolume) S.setVolume(+e.target.value); });
    root.querySelectorAll("[data-open]").forEach(function (b) { b.addEventListener("click", function () { panel(state.panel === b.dataset.open ? null : b.dataset.open); }); });
    root.addEventListener("keydown", onKey);
    var ring = root.querySelector("#atm-ring");
    ring.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", function (e) { state.ptr = [e.clientX / innerWidth - .5, e.clientY / innerHeight - .5]; }, { passive: true });
    window.addEventListener("deviceorientation", function (e) { if (!state.open || e.gamma == null) return; state.tilt = [Math.max(-1, Math.min(1, e.gamma / 30)) * .5, Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * .5]; }, { passive: true });
    root.addEventListener("click", function (e) { if (state.panel && !e.target.closest(".atm-panel, [data-open]")) panel(null); });
  }
  function svg(n) {
    var P = { x: '<path d="M6 6l12 12M18 6L6 18"/>', play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>' };
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' + P[n] + "</svg>";
  }
  var later = function (f, ms) { return setTimeout(f, ms); };

  /* ------------------------------------------------------------------ the ring ------------------------------------------------------------------ */
  var cards = [];
  function renderGroups() {
    var box = root.querySelector("#atm-groups");
    box.innerHTML = groups().map(function (g) {
      return '<button type="button" role="tab" class="atm-g" aria-selected="' + (g.name === state.group) + '" data-g="' + esc(g.name) + '">' + esc(g.name) + "<small>" + g.list.length + "</small></button>";
    }).join("");
    box.querySelectorAll(".atm-g").forEach(function (b) { b.addEventListener("click", function () { setGroup(b.dataset.g); }); });
  }
  function setGroup(name) {
    state.group = name; state.list = listFor(name);
    var i = state.list.map(function (w) { return w.id; }).indexOf(current());
    state.pos = state.target = i >= 0 ? i : 0; state.vel = 0;
    root.querySelectorAll(".atm-g").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.g === name)); });
    renderRing(true);
  }
  function renderRing(fly) {
    var ring = root.querySelector("#atm-ring");
    ring.innerHTML = ""; cards = [];
    state.list.forEach(function (w, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "atm-card"; b.dataset.i = i; b.dataset.id = w.id; b.setAttribute("role", "option");
      b.setAttribute("aria-label", w.name + (w.id === current() ? ", on now" : ""));
      b.innerHTML = '<span class="atm-card-img" aria-hidden="true"></span><span class="atm-card-glow" aria-hidden="true"></span>' +
        '<span class="atm-card-t"><b>' + esc(w.name) + "</b><small>" + esc((w.styles && w.styles[0]) || w.collection || "") + "</small></span>" +
        (w.id === current() ? '<span class="atm-card-on">On now</span>' : "");
      ring.appendChild(b); cards.push({ el: b, w: w, img: false });
    });
    if (fly && motion() === "full") { ring.classList.remove("fly"); void ring.offsetWidth; ring.classList.add("fly"); }
    fit(); layout(); hint();
  }
  /* the cylinder: card i sits at angle (i - pos) * STEP; only the nearest few are drawn (and only their pictures load) */
  /* the ring sits in the space between the group pills and Step inside, its cards as tall as that space allows */
  var geo = { W: 230, H: 317 };
  function fit() {
    var hd = root.querySelector(".atm-head").getBoundingClientRect(), gr = root.querySelector("#atm-groups");
    gr.style.top = Math.round(hd.bottom + 14) + "px";
    var g = gr.getBoundingClientRect(), e = root.querySelector("#atm-enter").getBoundingClientRect();
    var top = g.bottom + 14, bot = e.top - 30, narrow = innerWidth < 700;
    var H = Math.max(160, Math.min((bot - top) * .9, narrow ? 330 : 400)), W = Math.min(narrow ? innerWidth * .6 : 300, H / 1.38);
    geo = { W: W, H: W * 1.38 };
    var ring = root.querySelector("#atm-ring"), mid = (top + bot) / 2;
    ring.style.top = Math.round(mid) + "px";
    root.querySelector("#atm-hint").style.top = Math.round(mid + geo.H / 2 + 10) + "px";
  }
  function layout() {
    var narrow = innerWidth < 700, W = geo.W, STEP = narrow ? .5 : .42, R = narrow ? W * 1.55 : W * 2.7;
    for (var i = 0; i < cards.length; i++) {
      var n = cards.length, c = cards[i], d = n > 2 ? ((i - state.pos) % n + n * 1.5) % n - n / 2 : i - state.pos, a = d * STEP, vis = Math.abs(d) < (narrow ? 3.2 : 4.2);   // a ring: it wraps around
      if (!vis) { if (c.el.style.display !== "none") c.el.style.display = "none"; continue; }
      if (c.el.style.display === "none") c.el.style.display = "";
      if (!c.img && c.w.art && c.w.art.card) { c.img = true; c.el.querySelector(".atm-card-img").style.backgroundImage = 'url("art/themes/' + c.w.art.card + '")'; }
      var x = Math.sin(a) * R, z = (Math.cos(a) - 1) * R, k = Math.max(0, 1 - Math.abs(d) * .28);
      c.el.style.width = Math.round(W) + "px"; c.el.style.height = Math.round(geo.H) + "px";
      c.el.style.transform = "translate(-50%,-50%) translate3d(" + x.toFixed(1) + "px,0," + z.toFixed(1) + "px) rotateY(" + (a * -57.3 * .85).toFixed(2) + "deg)";
      c.el.style.opacity = (.25 + .75 * k).toFixed(3);
      c.el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      c.el.classList.toggle("front", Math.abs(d) < .5);
      c.el.tabIndex = Math.abs(d) < .5 ? 0 : -1;
    }
  }
  function hint() {
    var i = idx(state.pos), w = state.list[i], h = root.querySelector("#atm-hint");
    if (!w) { h.textContent = ""; return; }
    h.innerHTML = w.id === current() ? '<span class="atm-on-dot"></span>You are here' : "Tap to go to <b>" + esc(w.name) + "</b>";
  }
  function down(e) {
    if (e.button && e.button !== 0) return;
    state.drag = { x: e.clientX, y: e.clientY, p0: state.pos, t: performance.now(), lx: e.clientX, lt: performance.now(), moved: false, card: e.target.closest(".atm-card") };
    state.vel = 0; try { root.querySelector("#atm-ring").setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
    var ring = root.querySelector("#atm-ring");
    var mv = function (ev) {
      var D = state.drag; if (!D) return; var dx = ev.clientX - D.x;
      if (Math.abs(dx) > 6) D.moved = true;
      var W = geo.W;
      state.pos = clampPos(D.p0 - dx / (W * .9));
      var now = performance.now(), dt = Math.max(1, now - D.lt); state.vel = -(ev.clientX - D.lx) / (W * .9) / dt * 16; D.lx = ev.clientX; D.lt = now;
      layout(); hint();
    };
    var up = function () {
      ring.removeEventListener("pointermove", mv); ring.removeEventListener("pointerup", up); ring.removeEventListener("pointercancel", up);
      var D = state.drag; state.drag = null; if (!D) return;
      if (!D.moved && D.card) { var i = +D.card.dataset.i; if (i === idx(state.pos)) go(state.list[i]); else spinTo(i); return; }
      state.target = clampPos(Math.round(state.pos + state.vel * 8)); spin();
    };
    ring.addEventListener("pointermove", mv); ring.addEventListener("pointerup", up); ring.addEventListener("pointercancel", up);
  }
  function clampPos(p) { return p; }   // the ring wraps: any position is fine, the card is idx(pos)
  function idx(p) { var n = state.list.length || 1; return ((Math.round(p) % n) + n) % n; }
  function spinTo(i) { var n = state.list.length || 1, cur = Math.round(state.pos), d = ((i - idx(cur)) % n + n * 1.5) % n - n / 2; state.target = cur + Math.round(d); state.vel = 0; spin(); }
  function spin() {
    cancelAnimationFrame(state.raf);
    if (motion() === "off") { state.pos = state.target; layout(); hint(); return; }
    var tick = function () {
      var d = state.target - state.pos; state.vel = state.vel * .82 + d * .09; state.pos += state.vel * .5;
      if (Math.abs(d) < .002 && Math.abs(state.vel) < .002) { state.pos = state.target; layout(); hint(); return; }
      layout(); hint(); state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }
  /* go to a theme: the world changes behind (its stylesheet, sound and GPU world), then its camera flies in on its own engine */
  function go(w) {
    if (!w || w.id === current()) { pulse(); return; }
    var W = worlds(); if (!W || !W.apply) return;
    html.classList.add("atm-going");
    W.apply(w.id);
    setTimeout(function () { html.classList.remove("atm-going"); }, 900);
    flyIn(w.id);
    setTimeout(function () { title(); renderRing(false); syncSound(); }, 450);
  }
  function pulse() { var f = root.querySelector(".atm-card.front"); if (!f || motion() === "off") return; f.classList.remove("pulse"); void f.offsetWidth; f.classList.add("pulse"); }
  /* the theme's own opening camera move, played on its world behind the Atmosphere (no title, no splash) */
  function flyIn(id) {
    var R = window.TitanRoom; if (!R || !R.path || motion() !== "full") return;
    var t0 = performance.now();
    (function wait() {
      var K = window.TitanFXK, d = K && K.debug && K.debug(), room = K && K.room && K.room(id);
      if (d && d.id === id && d.frames > 1 && room && room.opening) { var O = Object.assign({}, room.opening, { at: null }); R.path(O, "opening", null, function () { if (K.resetView) K.resetView(); }); return; }
      if (performance.now() - t0 < 6000 && state.open) setTimeout(wait, 120);
    })();
  }

  /* ------------------------------------------------------------------ head, sound ------------------------------------------------------------------ */
  function title() {
    var W = worlds(), w = W && W.byId(current());
    root.querySelector("#atm-name").textContent = w ? w.name : "";
    root.querySelector("#atm-mood").textContent = w ? w.mood || "" : "";
    root.style.setProperty("--atm-acc", accent());
  }
  var music = null;
  window.addEventListener("titan:music", function (e) { music = e.detail || null; if (state.open) syncSound(); });
  function syncSound() {
    if (!root) return;
    var G = window.TitanGen, S = window.TitanScene, playing = !!(G && G.isPlaying && G.isPlaying());
    var orb = root.querySelector("#atm-orb");
    orb.classList.toggle("on", playing); orb.setAttribute("aria-label", playing ? "Pause the sound" : "Play the sound");
    orb.querySelector(".atm-orb-i").innerHTML = svg(playing ? "pause" : "play");
    var st = S && S.state ? S.state() : null, vol = root.querySelector("#atm-vol");
    if (st && document.activeElement !== vol) vol.value = st.vol;
    var now = root.querySelector("#atm-now");
    now.textContent = playing ? (music ? "♪ " + music.title + (music.composer ? " · " + music.composer : "") : (S && S.name ? S.name() : "")) : "Sound is off";
    if (state.panel === "sound") renderSound();
  }
  function meter() {
    if (!state.open) return;
    var G = window.TitanGen, lv = G && G.isPlaying && G.isPlaying() && G.level ? Math.min(1, G.level() * 6) : 0;
    state.lv = (state.lv || 0) * .8 + lv * .2;
    root.style.setProperty("--atm-lv", state.lv.toFixed(3));
    var px = state.ptr[0] + state.tilt[0], py = state.ptr[1] + state.tilt[1];
    state.px = (state.px || 0) + (px - (state.px || 0)) * .08; state.py = (state.py || 0) + (py - (state.py || 0)) * .08;
    var qx = state.px.toFixed(3), qy = state.py.toFixed(3);   // only when it moved: a settled layer stays put (and stays tappable)
    if (qx !== state.qx || qy !== state.qy) { state.qx = qx; state.qy = qy; root.style.setProperty("--px", qx); root.style.setProperty("--py", qy); }
    state.meter = requestAnimationFrame(meter);
  }

  /* ------------------------------------------------------------------ panels ------------------------------------------------------------------ */
  function panel(name) {
    state.panel = name;
    root.querySelectorAll(".atm-panel").forEach(function (p) { var on = p.dataset.panel === name; p.hidden = !on; });
    root.querySelectorAll("[data-open]").forEach(function (b) { b.setAttribute("aria-expanded", String(b.dataset.open === name)); });
    root.classList.toggle("panel-on", !!name);
    if (name === "sound") renderSound();
    if (name === "look") renderLook();
  }
  function renderSound() {
    var G = window.TitanGen, S = window.TitanScene, box = root.querySelector("#atm-p-sound"); if (!G || !S) { box.innerHTML = "<p>Sound is not available here.</p>"; return; }
    var st = S.state(), own = S.themeScene ? S.themeScene(current()) : null, beds = (st.mix && st.mix.beds) || {};
    var moods = (G.SCENE_ORDER || []).filter(function (id) { return G.SCENES[id] && (G.WORLD_ORDER || []).indexOf(id) < 0; });
    var active = document.activeElement && box.contains(document.activeElement) && document.activeElement.type === "range";
    if (active) return;   // never rebuild under a finger on a slider
    var ids = (G.BED_ORDER || []).filter(function (id) { return (beds[id] || 0) > 0; });
    box.innerHTML =
      '<div class="atm-ph"><h3>Sound</h3><button type="button" class="atm-link" data-all="sound">All sound settings</button></div>' +
      (own ? '<button type="button" class="atm-own' + (st.scene === own ? " on" : "") + '" data-scene="' + esc(own) + '"><span class="atm-own-i" aria-hidden="true">' + esc(G.SCENES[own].icon || "◉") + "</span><span><b>This theme's sound</b><small>" + esc(G.SCENES[own].name) + "</small></span></button>" : "") +
      '<h4>Moods</h4><div class="atm-moods">' + moods.map(function (id) {
        var s = G.SCENES[id]; return '<button type="button" class="atm-mood-b' + (st.scene === id ? " on" : "") + '" data-scene="' + esc(id) + '"><span aria-hidden="true">' + esc(s.icon || "◉") + "</span>" + esc(s.name) + "</button>";
      }).join("") + "</div>" +
      "<h4>In the mix</h4>" + (ids.length ? '<div class="atm-mix">' + ids.map(function (id) {
        var b = G.BEDS[id]; return '<label class="atm-mrow"><span class="atm-mi" aria-hidden="true">' + esc(b.icon) + '</span><span class="atm-ml">' + esc(b.label) + '</span><input type="range" min="0.02" max="1" step="0.01" value="' + beds[id] + '" data-bed="' + esc(id) + '" aria-label="' + esc(b.label) + ' level"></label>';
      }).join("") + "</div>" : '<p class="atm-note">Nothing is playing yet: start this theme\'s sound or a mood.</p>');
    box.querySelectorAll("[data-scene]").forEach(function (b) { b.addEventListener("click", function () { S.play(b.dataset.scene, { visual: false, fade: 2 }); later(syncSound, 300); }); });
    box.querySelectorAll("[data-bed]").forEach(function (r) { r.addEventListener("input", function () { S.setLevel(r.dataset.bed, +r.value); }); });
    box.querySelector('[data-all="sound"]').addEventListener("click", function () { allSettings("sound"); });
  }
  function seg(name, opts, cur, note) {
    return '<div class="atm-set"><div class="atm-set-h">' + esc(name) + '</div><div class="atm-seg" role="radiogroup" aria-label="' + esc(name) + '">' +
      opts.map(function (o) { return '<button type="button" role="radio" aria-checked="' + (o[0] === cur) + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + "</button>"; }).join("") +
      "</div>" + (note ? '<p class="atm-note">' + esc(note) + "</p>" : "") + "</div>";
  }
  function renderLook() {
    var box = root.querySelector("#atm-p-look"), M = window.TitanMotion, Q = window.TitanQuality, O = window.TitanOpening;
    var sw = (function () { try { return localStorage.getItem("titan.opening.switch") !== "0"; } catch (e) { return true; } })();
    box.innerHTML = '<div class="atm-ph"><h3>Look</h3><button type="button" class="atm-link" data-all="settings">All settings</button></div>' +
      (M ? seg("Motion", [["full", "Full"], ["calm", "Calm"], ["off", "Off"]], M.choice ? M.choice() : M.level(), "Calm keeps the worlds still; Off stops every animation.") : "") +
      (Q ? seg("Graphics", [["auto", "Auto"], ["low", "Low"], ["medium", "Medium"], ["high", "High"], ["ultra", "Ultra"], ["max", "Max"]], Q.choice, "Changing it reloads the app at the new quality.") : "") +
      (O ? seg("Opening", [["motion", "The theme's own"], ["none", "None"]], O.choice ? O.choice() : "motion", "Each theme opens on its own world, rendered live.") : "") +
      '<label class="atm-tog"><input type="checkbox" id="atm-sw"' + (sw ? " checked" : "") + '><span>Fly into a theme when I pick it</span></label>';
    var sets = box.querySelectorAll(".atm-set");
    var bind = function (el, fn) { if (!el) return; el.querySelectorAll("[data-v]").forEach(function (b) { b.addEventListener("click", function () { fn(b.dataset.v); el.querySelectorAll("[data-v]").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); }); }); };
    var k = 0;
    if (M) bind(sets[k++], function (v) { M.set(v); });
    if (Q) bind(sets[k++], function (v) { if (v !== Q.choice) Q.set(v); });
    if (O) bind(sets[k++], function (v) { O.set(v); });
    box.querySelector("#atm-sw").addEventListener("change", function (e) { try { localStorage.setItem("titan.opening.switch", e.target.checked ? "1" : "0"); } catch (err) { /* private mode */ } });
    box.querySelector('[data-all="settings"]').addEventListener("click", function () { allSettings("settings"); });
  }
  function allSettings(tab) { close(true); var S = window.TitanScene; if (S && S.open) S.open(tab); }

  /* ------------------------------------------------------------------ open, close, enter ------------------------------------------------------------------ */
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); if (state.panel) panel(null); else close(); }
    else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !(e.target && e.target.type === "range")) { e.preventDefault(); state.target = Math.round(state.pos) + (e.key === "ArrowRight" ? 1 : -1); state.vel = 0; spin(); }
    else if (e.key === "Enter" && e.target && e.target.classList && e.target.classList.contains("atm-card")) { e.preventDefault(); go(state.list[+e.target.dataset.i]); }
  }
  function open(tab) {
    return css().then(function () {
      if (!root) build();
      if (state.open) { if (tab === "sound" || tab === "look") panel(tab); return; }
      state.last = document.activeElement; state.open = true;
      title(); renderGroups(); setGroup(state.group);
      root.hidden = false; html.classList.add("tr-atmos");
      requestAnimationFrame(function () { root.classList.add("in"); });
      panel(tab === "sound" || tab === "look" ? tab : null);
      syncSound(); cancelAnimationFrame(state.meter); state.meter = requestAnimationFrame(meter);
      state.poll = setInterval(syncSound, 1200);
      window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
      setTimeout(function () { var f = root.querySelector(".atm-card.front") || root.querySelector("#atm-x"); if (f) f.focus({ preventScroll: true }); }, 60);
    });
  }
  function close(quick) {
    if (!root || !state.open) return;
    state.open = false; cancelAnimationFrame(state.meter); cancelAnimationFrame(state.raf); clearInterval(state.poll);
    root.classList.remove("in"); html.classList.remove("tr-atmos");
    setTimeout(function () { if (!state.open) root.hidden = true; }, quick === true ? 0 : 380);
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    if (state.last && document.contains(state.last) && state.last.focus) { try { state.last.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function enter() { var R = window.TitanRoom; close(true); if (R && R.open) R.open(); }
  window.addEventListener("resize", function () { if (state.open) { fit(); layout(); } });
  window.addEventListener("titan:atmo", function () { if (state.open) { title(); } });

  window.TitanAtmosphere = { open: open, close: close, isOpen: function () { return state.open; }, go: function (id) { var W = worlds(); if (W) go(W.byId(id)); }, _state: state };
})();
