/* wings/atmosphere.js: the Atmosphere (replaces the Scene Studio sheet as the face of themes, sound and look). Claude, 2026-10-30.
   Owner, 2026-10-30: "When are you updating the ui for the atmosphere and ambient area. Its still the clunky gold and black bullshit";
   rule 12(c): rebuilt at high fidelity, layers that move in depth, and it leads into the room.
   Owner, later the same day: "Its glitchy. Theres also no way to custom control the ambient sounds or effects. Many features ... were
   stripped. I wanted a new ui but not pillage my efforts." So every control of the old studio is here, in the new look.

   The live theme world is the whole background (the collection steps aside while this is open). Over it, in four depths that slide
   against each other with the mouse or the phone's tilt (never with a finger: a swipe on the ring must not sway the screen):
     far    the theme's name and mood, very large and light
     middle a ring of theme portals in 3D (every theme's picture card on a cylinder): drag or swipe to turn it, tap the front portal to
            go there (the world changes behind and its camera flies in), tap a side portal to bring it to the front; the groups filter it
     near   the dock: the sound orb (play / pause, a ring that follows the music), the volume, Sound, Look, and Step inside (the room)
   Sound and Look open as glass panels with tabs, and the ring steps back while one is open:
     Sound  Scenes (this theme's sound, moods, my scenes, every theme's sound, internet radio) · Mixer (build your own mix: every
            recorded layer, the music, a level each, save as a scene, load, clear) · Levels (music, ambience, bass, mid, treble) ·
            Settings (sound follows the theme, background, time of day, sound space, interface sounds)
     Look   Effects (this theme's own effect controls, kept per theme; the screen effects Off / Subtle / Full, strength, film, a moment) ·
            + Add (any effect in the library on top of this theme, a strength each, wings/fx/layers.js) ·
            Motion (Full / Calm / Off, taps, graphics quality) · Opening (the opening, fly-in on a pick, play it now) · App (updates,
            the classic studio)
   Everything goes through the same calls as before (TitanScene, TitanWorlds, TitanFX, TitanFXK, TitanMotion, TitanQuality,
   TitanOpening, TitanUISounds), so it is saved the same way and the classic studio shows the same state. A tab is built once and then
   updated in place (a 2 s check, titan:gen, titan:music, titan:radio): it is never rebuilt under a finger.
   styles/atmosphere.css loads with the first open. TitanAtmosphere.open([panel or "panel:tab"]) / close() / isOpen(); #btn-atmo opens
   it (app.js openAtmoSheet). */
(function () {
  "use strict";
  if (window.TitanAtmosphere) return;
  var html = document.documentElement, BUILD = window.TITAN_BUILD || "";
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var motion = function () { return window.TitanMotion && window.TitanMotion.level ? window.TitanMotion.level() : "full"; };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  var TABKEY = "titan.atmos.tabs";
  var root = null, cssReady = null, layers = [];
  var state = { open: false, pos: 0, vel: 0, target: 0, group: "All", list: [], raf: 0, drag: null, panel: null, last: null, tilt: [0, 0], ptr: [0, 0],
    tabs: { sound: "scenes", look: "effects" }, keys: {} };
  try { var t0 = JSON.parse(ls.get(TABKEY) || "null"); if (t0 && t0.sound) state.tabs.sound = t0.sound; if (t0 && t0.look) state.tabs.look = t0.look; } catch (e) { /* ignore */ }

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
  var TABS = {
    sound: [["scenes", "Scenes"], ["mixer", "Mixer"], ["levels", "Levels"], ["settings", "Settings"]],
    look: [["effects", "Effects"], ["add", "+ Add"], ["motion", "Motion"], ["opening", "Opening"], ["app", "App"]]
  };
  function panelShell(name, title) {
    return '<section class="atm-panel" id="atm-p-' + name + '" data-panel="' + name + '" aria-label="' + title + '" hidden>' +
      '<div class="atm-ph"><h3>' + title + "</h3>" + (name === "sound" ? '<button type="button" class="atm-off" data-act="off" aria-label="Sound off (stays off next time)">' + svg("stop") + "<span>Off</span></button>" : "") +
        '<button type="button" class="atm-px" data-act="close-panel" aria-label="Close ' + title + '">' + svg("down") + "</button></div>" +
      '<div class="atm-tabs" role="tablist" aria-label="' + title + '">' + TABS[name].map(function (t) {
        return '<button type="button" role="tab" class="atm-tab" data-ptab="' + t[0] + '" aria-selected="false">' + t[1] + "</button>"; }).join("") + "</div>" +
      '<div class="atm-pb" role="tabpanel"></div></section>';
  }
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
      panelShell("sound", "Sound") + panelShell("look", "Look");
    document.body.appendChild(root);
    layers = [[".atm-l1", -10, -6], [".atm-l2", -18, -10], [".atm-l3", -30, -16], [".atm-l4", -6, -3]].map(function (L) { return { els: [].slice.call(root.querySelectorAll(L[0])), x: L[1], y: L[2] }; });
    root.querySelector("#atm-x").addEventListener("click", function () { close(); });
    root.querySelector("#atm-enter").addEventListener("click", enter);
    root.querySelector("#atm-orb").addEventListener("click", function () { var S = window.TitanScene; if (S && S.toggle) S.toggle(); later(sync, 150); });
    root.querySelector("#atm-vol").addEventListener("input", function (e) { var S = window.TitanScene; if (S && S.setVolume) S.setVolume(+e.target.value); });
    root.querySelectorAll("[data-open]").forEach(function (b) { b.addEventListener("click", function () { panel(state.panel === b.dataset.open ? null : b.dataset.open); }); });
    root.querySelector("#atm-ring").addEventListener("pointerdown", down);
    /* depth follows a mouse; on a phone only the tilt moves it (a finger on the ring is a swipe, not a look) */
    root.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") state.ptr = [e.clientX / innerWidth - .5, e.clientY / innerHeight - .5]; }, { passive: true });
    window.addEventListener("deviceorientation", function (e) { if (!state.open || e.gamma == null) return; state.tilt = [Math.max(-1, Math.min(1, e.gamma / 30)) * .5, Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * .5]; }, { passive: true });
    root.addEventListener("click", function (e) { if (state.panel && !e.target.closest(".atm-panel, [data-open], .atm-dock")) panel(null); });
    root.querySelectorAll(".atm-panel").forEach(function (p) {
      p.addEventListener("click", onPanelClick);
      p.addEventListener("input", onPanelInput);
      p.addEventListener("change", onPanelChange);
      p.addEventListener("keydown", function (e) {   // arrows move between the tabs
        var t = e.target.closest && e.target.closest(".atm-tab"); if (!t || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        e.preventDefault(); e.stopPropagation();
        var list = TABS[p.dataset.panel].map(function (x) { return x[0]; }), i = list.indexOf(state.tabs[p.dataset.panel]);
        setTab(p.dataset.panel, list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length], true);
      });
    });
  }
  function svg(n) {
    var P = { x: '<path d="M6 6l12 12M18 6L6 18"/>', play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>',
      stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>', down: '<path d="M6 9l6 6 6-6"/>' };
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P[n] + "</svg>";
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
      b.innerHTML = '<span class="atm-card-img" aria-hidden="true"></span><span class="atm-card-glow" aria-hidden="true"></span>' +
        '<span class="atm-card-t"><b>' + esc(w.name) + "</b><small>" + esc((w.styles && w.styles[0]) || w.collection || "") + "</small></span>" +
        '<span class="atm-card-on" hidden>On now</span>';
      ring.appendChild(b); cards.push({ el: b, w: w, img: false });
    });
    markRing();
    if (fly && motion() === "full") { ring.classList.remove("fly"); void ring.offsetWidth; ring.classList.add("fly"); }
    fit(); layout(); hint();
  }
  /* which portal is on now: marked in place (rebuilding the ring after a pick made it flash) */
  function markRing() {
    var cur = current();
    cards.forEach(function (c) {
      var on = c.w.id === cur;
      c.el.setAttribute("aria-label", c.w.name + (on ? ", on now" : ""));
      c.el.querySelector(".atm-card-on").hidden = !on;
      c.el.classList.toggle("is-on", on);
    });
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
    /* a panel fills the space under the theme's name (the name stays, the mood line steps aside) */
    var nm = root.querySelector("#atm-name").getBoundingClientRect();
    root.style.setProperty("--atm-ptop", Math.round(Math.max(nm.bottom + 14, 90)) + "px");
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
    var t = w.id === current() ? '<span class="atm-on-dot"></span>You are here' : "Tap to go to <b>" + esc(w.name) + "</b>";
    if (h.innerHTML !== t) h.innerHTML = t;
  }
  function down(e) {
    if (e.button && e.button !== 0) return;
    cancelAnimationFrame(state.raf);
    state.drag = { x: e.clientX, y: e.clientY, p0: state.pos, t: performance.now(), lx: e.clientX, lt: performance.now(), moved: false, card: e.target.closest(".atm-card") };
    state.vel = 0; try { root.querySelector("#atm-ring").setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
    var ring = root.querySelector("#atm-ring");
    var mv = function (ev) {
      var D = state.drag; if (!D) return; var dx = ev.clientX - D.x;
      if (Math.abs(dx) > 6) D.moved = true;
      var W = geo.W;
      state.pos = D.p0 - dx / (W * .9);
      var now = performance.now(), dt = Math.max(1, now - D.lt); state.vel = -(ev.clientX - D.lx) / (W * .9) / dt * 16; D.lx = ev.clientX; D.lt = now;
      layout(); hint();
    };
    var up = function () {
      ring.removeEventListener("pointermove", mv); ring.removeEventListener("pointerup", up); ring.removeEventListener("pointercancel", up);
      var D = state.drag; state.drag = null; if (!D) return;
      if (!D.moved && D.card) { var i = +D.card.dataset.i; if (i === idx(state.pos)) go(state.list[i]); else spinTo(i); return; }
      state.target = Math.round(state.pos + Math.max(-4, Math.min(4, state.vel * 8))); spin();
    };
    ring.addEventListener("pointermove", mv); ring.addEventListener("pointerup", up); ring.addEventListener("pointercancel", up);
  }
  function idx(p) { var n = state.list.length || 1; return ((Math.round(p) % n) + n) % n; }   // the ring wraps: any position is fine
  function spinTo(i) { var n = state.list.length || 1, cur = Math.round(state.pos), d = ((i - idx(cur)) % n + n * 1.5) % n - n / 2; state.target = cur + Math.round(d); state.vel = 0; spin(); }
  function spin() {
    cancelAnimationFrame(state.raf);
    if (motion() === "off") { state.pos = state.target; layout(); hint(); return; }
    /* a spring stepped in 60ths of a second, so it settles in the same time however slowly the phone draws */
    var last = performance.now();
    var tick = function (now) {
      var n = Math.min(30, Math.max(1, Math.round((now - last) / 16.7))); last = now;
      for (var i = 0; i < n; i++) { var d = state.target - state.pos; state.vel = state.vel * .82 + d * .09; state.pos += state.vel * .5; }
      if (Math.abs(state.target - state.pos) < .002 && Math.abs(state.vel) < .002) { state.pos = state.target; state.raf = 0; layout(); hint(); return; }
      layout(); hint(); state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }
  /* the theme on now came from somewhere else (a theme's sound, the classic studio): bring its portal to the front */
  function follow() {
    if (state.drag) return;
    var i = state.list.map(function (w) { return w.id; }).indexOf(current());
    if (i >= 0 && i !== idx(state.target)) spinTo(i);
  }
  /* go to a theme: the world changes behind (its stylesheet, sound and GPU world), then its camera flies in on its own engine */
  function go(w) {
    if (!w || w.id === current()) { pulse(); return; }
    var W = worlds(); if (!W || !W.apply) return;
    html.classList.add("atm-going");
    W.apply(w.id);
    setTimeout(function () { html.classList.remove("atm-going"); }, 900);
    if (ls.get("titan.opening.switch") !== "0") flyIn(w.id);
    title(); fit(); markRing(); hint(); sync();
  }
  function pulse() { var f = root.querySelector(".atm-card.front"); if (!f || motion() === "off") return; f.classList.remove("pulse"); void f.offsetWidth; f.classList.add("pulse"); }
  /* the theme's own opening camera move, played on its world behind the Atmosphere (no title, no splash) */
  function flyIn(id, force) {
    var R = window.TitanRoom; if (!R || !R.path || (motion() !== "full" && !force)) return false;
    var t0 = performance.now();
    (function wait() {
      var K = window.TitanFXK, d = K && K.debug && K.debug(), room = K && K.room && K.room(id);
      if (d && d.id === id && d.frames > 1 && room && room.opening) { var O = Object.assign({}, room.opening, { at: null }); R.path(O, "opening", null, function () { if (K.resetView) K.resetView(); }); return; }
      if (performance.now() - t0 < 6000 && state.open) setTimeout(wait, 120);
    })();
    return true;
  }

  /* ------------------------------------------------------------------ head, dock ------------------------------------------------------------------ */
  function title() {
    var W = worlds(), w = W && W.byId(current());
    root.querySelector("#atm-name").textContent = w ? w.name : "";
    root.querySelector("#atm-mood").textContent = w ? w.mood || "" : "";
    root.style.setProperty("--atm-acc", accent());
  }
  var music = null;
  window.addEventListener("titan:music", function (e) { music = e.detail || null; if (state.open) sync(); });
  window.addEventListener("titan:gen", function () { if (state.open) later(sync, 60); });
  window.addEventListener("titan:radio", function () { if (state.open) sync(); });
  /* the dock and the open panel, updated in place */
  function sync() {
    if (!root || !state.open) return;
    var G = window.TitanGen, S = window.TitanScene, playing = !!(G && G.isPlaying && G.isPlaying()), radio = !!(S && S.radio && S.radio.on && S.radio.on());
    var orb = root.querySelector("#atm-orb"), on = playing || radio;
    if (orb.classList.contains("on") !== on || !orb.dataset.set) {
      orb.dataset.set = "1"; orb.classList.toggle("on", on); orb.setAttribute("aria-label", on ? "Pause the sound" : "Play the sound");
      orb.querySelector(".atm-orb-i").innerHTML = svg(on ? "pause" : "play");
    }
    var st = S && S.state ? S.state() : null, vol = root.querySelector("#atm-vol");
    if (st && document.activeElement !== vol) vol.value = st.vol;
    var rs = radio && S.radio.status ? S.radio.status() : null;
    var t = rs && rs.playing ? "Radio · " + (rs.title || "") + (rs.artist ? " · " + rs.artist : "") : playing ? (music ? "♪ " + music.title + (music.composer ? " · " + music.composer : "") : (S && S.name ? S.name() : "")) : (G && G.isPaused && G.isPaused() ? "Paused" : "Sound is off");
    var now = root.querySelector("#atm-now"); if (now.textContent !== t) now.textContent = t;
    if (state.panel) refresh(state.panel);
  }
  /* the depths and the orb's level, once a frame while open; nothing is written when nothing moved */
  function meter(now) {
    if (!state.open) return;
    var dt = Math.min(500, Math.max(1, (now || 0) - (state.mt || now || 0))); state.mt = now; var ease = 1 - Math.pow(.92, dt / 16.7);
    var G = window.TitanGen, lv = G && G.isPlaying && G.isPlaying() && G.level ? Math.min(1, G.level() * 6) : 0;
    state.lv = (state.lv || 0) * .8 + lv * .2;
    var q = Math.round(state.lv * 50) / 50;
    if (q !== state.lvq) { state.lvq = q; var ring = root.querySelector(".atm-orb-lv"); ring.style.opacity = (.15 + q * 1.2).toFixed(2); ring.style.transform = "scale(" + (1 + q * .35).toFixed(3) + ")"; }
    var still = motion() !== "full" || !!state.panel;
    var px = still ? 0 : state.ptr[0] + state.tilt[0], py = still ? 0 : state.ptr[1] + state.tilt[1];
    if (!state.drag) { state.px = (state.px || 0) + (px - (state.px || 0)) * ease; state.py = (state.py || 0) + (py - (state.py || 0)) * ease; }   // held while a finger is on the ring
    var qx = Math.round(state.px * 400) / 400, qy = Math.round(state.py * 400) / 400;
    if (qx !== state.qx || qy !== state.qy) {
      state.qx = qx; state.qy = qy;
      layers.forEach(function (L) { var tr = "translate3d(" + (qx * L.x).toFixed(2) + "px," + (qy * L.y).toFixed(2) + "px,0)"; L.els.forEach(function (el) { el.style.transform = tr; }); });
    }
    state.meter = requestAnimationFrame(meter);
  }

  /* ------------------------------------------------------------------ panels ------------------------------------------------------------------ */
  function panelEl(name) { return root.querySelector("#atm-p-" + name); }
  function panel(name) {
    state.panel = name;
    root.querySelectorAll(".atm-panel").forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    root.querySelectorAll("[data-open]").forEach(function (b) { b.setAttribute("aria-expanded", String(b.dataset.open === name)); });
    root.classList.toggle("panel-on", !!name);
    if (name) { fit(); setTab(name, state.tabs[name]); }
  }
  function setTab(name, tab, focus) {
    if (!TABS[name].some(function (t) { return t[0] === tab; })) tab = TABS[name][0][0];
    state.tabs[name] = tab; ls.set(TABKEY, JSON.stringify(state.tabs));
    var p = panelEl(name);
    p.querySelectorAll(".atm-tab").forEach(function (b) { var on = b.dataset.ptab === tab; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    state.keys[name] = null; refresh(name);
    p.querySelector(".atm-pb").scrollTop = 0;
  }
  /* each tab: key() names what its markup depends on (a change rebuilds it), build() writes it, update() sets the live values in place */
  function refresh(name) {
    var p = panelEl(name), T = PANES[name + ":" + state.tabs[name]]; if (!p || !T) return;
    var body = p.querySelector(".atm-pb"), k = state.tabs[name] + "|" + T.key();
    if (k !== state.keys[name]) {
      if (busy(body)) return;                            // never rebuild under a finger
      var top = body.scrollTop; state.keys[name] = k; body.innerHTML = T.build(); body.scrollTop = top;
    }
    T.update(body);
  }
  function busy(box) { var a = document.activeElement; return !!(a && box.contains(a) && (a.type === "range" || a.tagName === "SELECT" || a.type === "text")); }
  function held(el) { return el === document.activeElement && (el.type === "range" || el.type === "text"); }
  function chk(box, sel, v) { var el = box.querySelector(sel); if (el && el.checked !== !!v) el.checked = !!v; }
  function txt(box, sel, t) { var el = box.querySelector(sel); if (el && el.textContent !== t) el.textContent = t; }
  function pressed(box, sel, fn) { box.querySelectorAll(sel).forEach(function (b) { var v = String(!!fn(b)); if (b.getAttribute("aria-pressed") !== v) b.setAttribute("aria-pressed", v); }); }
  function radios(box, group, cur) { box.querySelectorAll('[data-seg="' + group + '"] [data-v]').forEach(function (b) { var v = String(b.dataset.v === cur); if (b.getAttribute("aria-checked") !== v) b.setAttribute("aria-checked", v); }); }

  /* pieces */
  function h(t, sub) { return "<h4>" + esc(t) + "</h4>" + (sub ? '<p class="atm-note atm-sub">' + esc(sub) + "</p>" : ""); }
  function note(t, id) { return '<p class="atm-note"' + (id ? ' id="' + id + '"' : "") + ">" + esc(t) + "</p>"; }
  function seg(group, label, opts, cur) {
    return '<div class="atm-seg" role="radiogroup" aria-label="' + esc(label) + '" data-seg="' + group + '">' +
      opts.map(function (o) { return '<button type="button" role="radio" aria-checked="' + (o[0] === cur) + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + "</button>"; }).join("") + "</div>";
  }
  function slider(id, label, min, max, step, v) {
    return '<label class="atm-sl"><span class="atm-sl-l">' + esc(label) + '</span><input type="range" data-in="' + esc(id) + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + esc(label) + '"><output class="atm-sl-n"></output></label>';
  }
  function tog(opt, label, on) { return '<label class="atm-tog"><input type="checkbox" data-opt="' + esc(opt) + '"' + (on ? " checked" : "") + "><span>" + esc(label) + "</span></label>"; }
  function sceneB(id, s, cls, extra) {
    return '<button type="button" class="' + (cls || "atm-mood-b") + '" data-act="scene" data-scene="' + esc(id) + '"' + (extra || "") + ' aria-pressed="false"><span class="atm-ic" aria-hidden="true">' + esc(s.icon || "◉") + "</span><span>" + esc(s.name) + "</span></button>";
  }
  function pct(v) { return Math.round(v * 100) + "%"; }
  function db(v) { v = Math.round(v); return (v > 0 ? "+" : "") + v + " dB"; }
  function outOf(input, t) { var o = input.parentNode.querySelector("output"); if (o && o.textContent !== t) o.textContent = t; }
  function times(v, def) { return def ? (Math.round(v / def * 100) / 100) + "×" : String(Math.round(v * 100) / 100); }
  function themeName(id) { var W = worlds(), w = W && W.byId(id); return w ? w.name : id; }
  function kitRoom() { var K = window.TitanFXK, d = K && K.debug ? K.debug() : null; return d && d.id === current() && K.room && K.savedLook ? K.room(current()) : null; }
  function kitPending() { var K = window.TitanFXK; return !!(K && K.lazy && K.lazy[current()] && !kitRoom()); }

  var G = function () { return window.TitanGen; }, S = function () { return window.TitanScene; };
  var PANES = {
    /* ---- Sound > Scenes: this theme's sound, moods, my scenes, every theme's sound, internet radio ---- */
    "sound:scenes": {
      key: function () { var s = S(); if (!s || !G() || !s.userScenes) return "none"; return (s.themeScene(current()) || "") + "|" + s.userScenes().map(function (u) { return u.id; }).join(); },
      build: function () {
        var g = G(), s = S(); if (!g || !s || !s.userScenes) return note("Sound is not available in this browser.");
        var own = s.themeScene(current()), worldsS = s.worldSounds(), mine = s.userScenes();
        var moods = (g.SCENE_ORDER || []).filter(function (id) { return g.SCENES[id] && worldsS.indexOf(id) < 0; });
        return (own ? '<button type="button" class="atm-own" data-act="scene" data-scene="' + esc(own) + '" aria-pressed="false"><span class="atm-own-i" aria-hidden="true">' + esc(g.SCENES[own].icon || "◉") + "</span><span><b>This theme's sound</b><small>" + esc(g.SCENES[own].name) + "</small></span></button>" : "") +
          h("Moods", "Real recordings with music underneath.") + '<div class="atm-chips">' + moods.map(function (id) { return sceneB(id, g.SCENES[id]); }).join("") + "</div>" +
          (mine.length ? h("My scenes") + '<div class="atm-chips">' + mine.map(function (u) {
            return '<span class="atm-mine">' + sceneB(u.id, { icon: "★", name: u.name }) + '<button type="button" class="atm-rm" data-act="del" data-id="' + esc(u.id) + '" aria-label="Remove ' + esc(u.name) + '">×</button></span>'; }).join("") + "</div>" : "") +
          h("Every theme's own sound", "A tap plays it and goes to that theme.") + '<div class="atm-chips atm-chips-s">' + worldsS.map(function (id) { return sceneB(id, g.SCENES[id], "atm-mood-b atm-small", ' data-world="1"'); }).join("") + "</div>" +
          (s.radio && s.radio.ok() ? h("Internet radio", "Needs a connection and may be down; everything above works offline.") +
            '<div class="atm-radio"><select data-sel="station" aria-label="Radio station">' + s.radio.stations().map(function (r) { return '<option value="' + esc(r.key) + '">' + esc(r.name) + (r.tag ? " · " + esc(r.tag) : "") + "</option>"; }).join("") + "</select>" +
            '<button type="button" class="atm-btn" data-act="radio" id="atm-radio-b">Play radio</button></div>' + note("", "atm-radio-st") : "");
      },
      update: function (box) {
        var s = S(); if (!s || !s.userScenes) return; var st = s.state();
        pressed(box, '[data-act="scene"]', function (b) { return b.dataset.scene === st.scene; });
        if (s.radio && s.radio.ok()) {
          var r = s.radio.status() || {}, sel = box.querySelector('[data-sel="station"]');
          if (sel && document.activeElement !== sel && sel.value !== s.radio.station()) sel.value = s.radio.station();
          txt(box, "#atm-radio-b", r.playing || r.wantPlay ? "Stop radio" : "Play radio");
          txt(box, "#atm-radio-st", r.down ? r.note || "" : r.playing ? "Now playing: " + (r.title || "") + (r.artist ? " · " + r.artist : "") : r.wantPlay ? "Connecting…" : (r.note || ""));
        }
      }
    },
    /* ---- Sound > Mixer: build your own mix ---- */
    "sound:mixer": {
      key: function () { var st = S() && S().state(), b = (st && st.mix && st.mix.beds) || {}; return G() && S() && S().toggleBed ? (G().BED_ORDER || []).filter(function (id) { return (b[id] || 0) > 0; }).join() : "none"; },
      build: function () {
        var g = G(), s = S(); if (!g || !s || !s.toggleBed) return note("Sound is not available in this browser.");
        var st = s.state(), beds = (st.mix && st.mix.beds) || {}, ids = g.BED_ORDER.filter(function (id) { return (beds[id] || 0) > 0; });
        return h("In your mix", "Tap sounds below to add them; each gets its own level. Kept as My mix.") +
          (ids.length ? '<div class="atm-mix">' + ids.map(function (id) {
            var b = g.BEDS[id]; return '<div class="atm-mrow"><span class="atm-mi" aria-hidden="true">' + esc(b.icon) + "</span>" + slider("bed:" + id, b.label, .02, 1, .01, beds[id]) +
              '<button type="button" class="atm-rm" data-act="rm" data-bed="' + esc(id) + '" aria-label="Remove ' + esc(b.label) + '">×</button></div>'; }).join("") + "</div>"
            : note("Nothing yet: tap a sound below.")) +
          h("Music (real recordings)") + '<div class="atm-chips"><button type="button" class="atm-chip" data-act="mus" data-mus="piano" aria-pressed="false">Piano</button><button type="button" class="atm-chip" data-act="mus" data-mus="orchestra" aria-pressed="false">Strings and orchestra</button></div>' +
          (g.BED_GROUPS || []).map(function (grp) {
            return h(grp) + '<div class="atm-chips">' + g.BED_ORDER.filter(function (id) { return g.BEDS[id].group === grp; }).map(function (id) {
              var b = g.BEDS[id]; return '<button type="button" class="atm-chip" data-act="bed" data-bed="' + esc(id) + '" aria-pressed="false"><span class="atm-ic" aria-hidden="true">' + esc(b.icon) + "</span>" + esc(b.label) + (b.kind === "event" ? "<small> · now and then</small>" : "") + "</button>"; }).join("") + "</div>";
          }).join("") +
          h("Keep this mix") + '<div class="atm-save"><input type="text" data-txt="name" maxlength="30" placeholder="Name this scene" aria-label="Name for the new scene"><button type="button" class="atm-btn" data-act="save">Save as a scene</button></div>' +
          '<div class="atm-row"><button type="button" class="atm-btn" data-act="loadmix">Load My mix</button><button type="button" class="atm-btn" data-act="clearmix">Clear all</button></div>' + note("", "atm-savemsg");
      },
      update: function (box) {
        var s = S(); if (!s || !s.toggleBed) return; var st = s.state(), beds = (st.mix && st.mix.beds) || {}, mus = s.music();
        pressed(box, '[data-act="bed"]', function (b) { return (beds[b.dataset.bed] || 0) > 0; });
        pressed(box, '[data-act="mus"]', function (b) { return b.dataset.mus === mus; });
        box.querySelectorAll('[data-in^="bed:"]').forEach(function (r) { var v = beds[r.dataset.in.slice(4)] || 0; if (!held(r)) r.value = v; outOf(r, pct(+r.value)); });
      }
    },
    /* ---- Sound > Levels: music against ambience, and the tone ---- */
    "sound:levels": {
      key: function () { return S() && S().setTone ? "1" : "none"; },
      build: function () {
        if (!S() || !S().setTone) return note("Sound is not available in this browser.");
        var st = S().state();
        return h("Mix") + slider("mus", "Music", 0, 1, .01, st.mus) + slider("amb", "Ambience", 0, 1, .01, st.amb) +
          h("Tone") + slider("bass", "Bass", -8, 8, 1, st.bass) + slider("mid", "Mid", -8, 8, 1, st.mid) + slider("treble", "Treble", -8, 8, 1, st.treble) +
          '<div class="atm-row"><button type="button" class="atm-btn" data-act="flat">Flat tone</button></div>' + note("A soft limiter keeps loud moments from clipping.");
      },
      update: function (box) {
        if (!S() || !S().setTone) return; var st = S().state();
        [["mus", st.mus, pct], ["amb", st.amb, pct], ["bass", st.bass, db], ["mid", st.mid, db], ["treble", st.treble, db]].forEach(function (x) {
          var el = box.querySelector('[data-in="' + x[0] + '"]'); if (!el) return; if (!held(el)) el.value = x[1]; outOf(el, x[2](+el.value)); });
      }
    },
    /* ---- Sound > Settings ---- */
    "sound:settings": {
      key: function () { return (window.TitanUISounds ? "ui" : "-") + (S() && S().setOpt ? "s" : "-"); },
      build: function () {
        var s = S(), st = s ? s.state() : {}, U = window.TitanUISounds, out = "";
        if (s && s.setOpt) out += h("The sound") + tog("follow", "Sound follows the theme (each theme has its own sound)", st.follow !== false) +
          tog("bgPause", "Pause the sound when the app is in the background", !!st.bgPause) + note("By default sound keeps playing when you switch apps or lock the phone.") +
          tog("timeAware", "Shift the sounds with the time of day (birds at dawn, quieter crowds at night)", st.timeAware !== false) +
          '<label class="atm-field"><span>Sound space</span><select data-sel="spatial" aria-label="Sound space"><option value="3d">3D (headphones are best)</option><option value="stereo">Stereo</option><option value="off">Off</option></select></label>';
        if (U) out += h("Interface sounds") + tog("ui-on", "Soft clicks and whooshes when you tap", U.isEnabled()) +
          tog("ui-mo", "Sounds for the effects' rare moments (a whale, the press, a shooting star)", U.momentSounds ? U.momentSounds() : true) +
          slider("uivol", "Interface volume", 0, 1, .05, U.getVolume());
        return out || note("Sound is not available in this browser.");
      },
      update: function (box) {
        var s = S(), st = s ? s.state() : {}, g = G(), U = window.TitanUISounds;
        chk(box, '[data-opt="follow"]', st.follow !== false); chk(box, '[data-opt="bgPause"]', !!st.bgPause); chk(box, '[data-opt="timeAware"]', st.timeAware !== false);
        var sp = box.querySelector('[data-sel="spatial"]'); if (sp && g && g.getSpatial && document.activeElement !== sp && sp.value !== g.getSpatial()) sp.value = g.getSpatial();
        if (U) { chk(box, '[data-opt="ui-on"]', U.isEnabled()); var v = box.querySelector('[data-in="uivol"]'); if (v) { v.disabled = !U.isEnabled(); outOf(v, pct(+v.value)); } var m = box.querySelector('[data-opt="ui-mo"]'); if (m) m.disabled = !U.isEnabled(); }
      }
    },
    /* ---- Look > Effects: this theme's own effect controls (kept per theme) and the screen effects ---- */
    "look:effects": {
      key: function () { var R = kitRoom(); return current() + "|" + (R ? (R.look || []).length : (kitPending() ? "wait" : "fx")); },
      build: function () {
        var cur = current(), R = kitRoom(), K = window.TitanFXK, FX = window.TitanFX, fs = FX && FX.state && FX.supported !== false ? FX.state() : null, out = "";
        if (R && (R.look || []).length) {
          var sv = K.savedLook(cur);
          out += h("This theme's effects", "Your setting for " + themeName(cur) + ", kept for next time; the room starts from it too.") +
            R.look.map(function (c) { var v = sv[c.id] != null ? sv[c.id] : c.def; return slider("look:" + c.id, c.label, c.min, c.max, "any", v); }).join("") +
            '<div class="atm-row"><button type="button" class="atm-btn" data-act="lookreset">Back to the theme\'s own</button>' + (window.TitanRoom ? '<button type="button" class="atm-btn" data-act="room">Step inside to play with it</button>' : "") + "</div>";
        } else if (kitPending()) out += h("This theme's effects") + note("The theme's world is still loading…");
        if (fs) {
          out += h("Screen effects", R ? "Film grain and vignette over the world." : "Rain, snow, fire and light over the theme; Full adds film grain and vignette.") +
            seg("fxlevel", "Screen effects", [["off", "Off"], ["subtle", "Subtle"], ["full", "Full"]], fs.level) +
            (R ? "" : slider("fxint", "Strength", .1, 1, .05, fs.intensity)) + (fs.film != null ? slider("film", "Film", 0, 1, .01, fs.film) : "") +
            (R ? "" : '<div class="atm-row"><button type="button" class="atm-btn" data-act="moment">A moment</button></div>') +
            note("Effects pause when the app is in the background; sound does not.");
        }
        return out || note("Effects are not available in this browser.");
      },
      update: function (box) {
        var K = window.TitanFXK, R = kitRoom(), FX = window.TitanFX, fs = FX && FX.state ? FX.state() : null;
        if (R && K.savedLook) { var sv = K.savedLook(current()); (R.look || []).forEach(function (c) { var el = box.querySelector('[data-in="look:' + c.id + '"]'); if (!el) return; if (!held(el)) el.value = sv[c.id] != null ? sv[c.id] : c.def; outOf(el, times(+el.value, c.def)); }); }
        if (fs) { radios(box, "fxlevel", fs.level); var a = box.querySelector('[data-in="fxint"]'); if (a) { if (!held(a)) a.value = fs.intensity; outOf(a, pct(+a.value)); } var f = box.querySelector('[data-in="film"]'); if (f) { if (!held(f)) f.value = fs.film; outOf(f, pct(+f.value)); } }
      }
    },
    /* ---- Look > + Add: any effect in the library on top of this theme (wings/fx/layers.js), saved per theme, on in the room too ---- */
    "look:add": {
      key: function () { var L = window.TitanFXLayers; return L ? current() + "|" + L.list(current()).map(function (e) { return e.id; }).join() + "|" + L.lib().length : "none"; },
      build: function () {
        var L = window.TitanFXLayers; if (!L) return note("Effects are not available in this browser.");
        var cur = current(), mine = L.list(cur), libl = L.lib();
        return h("Added to " + themeName(cur), "Any effect, on top of the theme's own world; kept for this theme and on in the room too. Up to three screen effects at once (a fourth takes the place of the oldest); the paint swirl runs on the world itself and follows your finger.") +
          (mine.length ? '<div class="atm-mix">' + mine.map(function (e) {
            return '<div class="atm-mrow"><span class="atm-mi" aria-hidden="true">' + esc(e.icon) + "</span>" + slider("layer:" + e.id, e.name, .05, 1.6, .05, e.w) +
              '<button type="button" class="atm-rm" data-act="unlayer" data-id="' + esc(e.id) + '" aria-label="Remove ' + esc(e.name) + '">×</button></div>'; }).join("") + "</div>" +
            '<div class="atm-row"><button type="button" class="atm-btn" data-act="layers-clear">Remove all</button>' + (window.TitanRoom ? '<button type="button" class="atm-btn" data-act="room">Step inside with them</button>' : "") + "</div>"
            : note("Nothing added yet: pick any effect below.")) +
          L.groups().map(function (g) {
            var items = libl.filter(function (x) { return x.group === g; }); if (!items.length) return "";
            return h(g) + '<div class="atm-chips">' + items.map(function (x) { return '<button type="button" class="atm-chip" data-act="layer" data-id="' + esc(x.id) + '" aria-pressed="false"><span class="atm-ic" aria-hidden="true">' + esc(x.icon) + "</span>" + esc(x.name) + "</button>"; }).join("") + "</div>";
          }).join("");
      },
      update: function (box) {
        var L = window.TitanFXLayers; if (!L) return; var cur = current(), mine = L.list(cur);
        pressed(box, '[data-act="layer"]', function (b) { return L.on(cur, b.dataset.id); });
        mine.forEach(function (e) { var el = box.querySelector('[data-in="layer:' + e.id + '"]'); if (!el) return; if (!held(el)) el.value = e.w; outOf(el, Math.round(e.w * 100) + "%"); });
      }
    },
    /* ---- Look > Motion: motion, taps, graphics ---- */
    "look:motion": {
      key: function () { return "1"; },
      build: function () {
        var M = window.TitanMotion, Q = window.TitanQuality, H = window.TitanHaptics, out = "";
        if (M) out += h("Motion") + seg("motion", "Motion", [["full", "Full"], ["calm", "Calm"], ["off", "Off"]], M.level()) + note("", "atm-mo-note");
        if (H && H.supported && H.supported()) out += tog("haptics", "Tiny vibration when you tap a button", H.enabled());
        if (Q) out += h("Graphics") + seg("quality", "Graphics", [["auto", "Auto"], ["low", "Low"], ["medium", "Medium"], ["high", "High"], ["ultra", "Ultra"], ["max", "Max"]], Q.choice) + note("Changing it reloads the app at the new quality.");
        return out || note("Nothing to set here.");
      },
      update: function (box) {
        var M = window.TitanMotion; if (!M) return;
        radios(box, "motion", M.level());
        txt(box, "#atm-mo-note", (M.level() === "full" ? "Full: the worlds, effects and page movement all play." : M.level() === "calm" ? "Calm: the worlds hold still, numbers appear without counting up." : "Off: nothing moves.") + (M.choice && !M.choice() ? " (Following this phone's reduce-motion setting.)" : ""));
      }
    },
    /* ---- Look > Opening ---- */
    "look:opening": {
      key: function () { var R = kitRoom(); return current() + "|" + (R && R.opening ? 1 : 0); },
      build: function () {
        var O = window.TitanOpening, R = kitRoom(), out = "";
        if (O) out += h("When the app starts") + seg("opening", "Opening", [["motion", "The theme's own"], ["none", "None"]], O.choice ? O.choice() : "motion") + note("Each theme opens on its own world, rendered live, then the app appears over it. A tap skips straight to the app.");
        out += h("When you pick a theme") + tog("switch", "Fly into a theme when I pick it", ls.get("titan.opening.switch") !== "0");
        if (R && R.opening && window.TitanRoom) out += '<div class="atm-row"><button type="button" class="atm-btn" data-act="flyin">Play ' + esc(themeName(current())) + "'s opening now</button></div>";
        return out;
      },
      update: function (box) { var O = window.TitanOpening; if (O && O.choice) radios(box, "opening", O.choice()); }
    },
    /* ---- Look > App: updates, the classic studio ---- */
    "look:app": {
      key: function () { return "1"; },
      build: function () {
        var a = document.getElementById("auto-refresh");
        return h("Updates") + (a ? tog("auto", "Check for a newer version automatically", a.checked) : "") + '<p class="atm-note" id="atm-live"></p>' +
          h("The classic studio", "The older Scene Studio sheet: the same settings, laid out as a list.") +
          '<div class="atm-row"><button type="button" class="atm-btn" data-act="classic">Open the classic studio</button></div>';
      },
      update: function (box) { var a = document.getElementById("auto-refresh"); if (a) chk(box, '[data-opt="auto"]', a.checked); var l = document.getElementById("live-status"); txt(box, "#atm-live", l ? l.textContent.trim() : ""); }
    }
  };

  /* one listener per panel: clicks, slider moves and switches by their data- names */
  function onPanelClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    var s = S(), FX = window.TitanFX, K = window.TitanFXK, p = b.closest(".atm-panel"), name = p.dataset.panel;
    if (b.dataset.ptab) { setTab(name, b.dataset.ptab); return; }
    var sg = b.closest("[data-seg]");
    if (sg && b.dataset.v) { segPick(sg.dataset.seg, b.dataset.v); radios(p, sg.dataset.seg, b.dataset.v); later(sync, 60); return; }
    switch (b.dataset.act) {
      case "close-panel": panel(null); return;
      case "off": if (s) { s.stop(); if (s.radio && s.radio.on()) s.radio.stop(); } break;
      case "scene":
        if (!s) break;
        s.play(b.dataset.scene, { visual: false, fade: 2 });
        if (b.dataset.world) { var wid = s.sceneOfWorld && s.sceneOfWorld(b.dataset.scene), W = worlds(); if (wid && wid !== current() && W) go(W.byId(wid)); }
        break;
      case "del": if (s) s.deleteScene(b.dataset.id); break;
      case "bed": if (s) s.toggleBed(b.dataset.bed); break;
      case "rm": if (s) s.setLevel(b.dataset.bed, 0); break;
      case "mus": if (s) s.setMusic(b.dataset.mus); break;
      case "save": if (s) { var inp = p.querySelector('[data-txt="name"]'), m = s.saveScene(inp ? inp.value : ""); if (/^Saved/.test(m) && inp) { inp.value = ""; inp.blur(); } txt(p, "#atm-savemsg", m); } break;
      case "loadmix": if (s && !s.loadMix()) txt(p, "#atm-savemsg", "No saved mix yet."); break;
      case "clearmix": if (s) s.clearMix(); break;
      case "flat": if (s) s.setTone(0, 0, 0); break;
      case "radio": if (s && s.radio) { var r = s.radio.status() || {}; if (r.playing || r.wantPlay) s.radio.stop(); else { var sel = p.querySelector('[data-sel="station"]'); s.radio.play(sel ? sel.value : null); } } break;
      case "moment": if (FX && FX.moment) FX.moment(); break;
      case "layer": if (window.TitanFXLayers) window.TitanFXLayers.toggle(current(), b.dataset.id); break;
      case "unlayer": if (window.TitanFXLayers && window.TitanFXLayers.on(current(), b.dataset.id)) window.TitanFXLayers.toggle(current(), b.dataset.id); break;
      case "layers-clear": if (window.TitanFXLayers) window.TitanFXLayers.clear(current()); break;
      case "lookreset": if (K && K.saveLook) { K.saveLook(current(), {}); lookScape({}); } break;
      case "room": enter(); return;
      case "flyin": panel(null); flyIn(current(), true); return;
      case "classic": allSettings(); return;
      default: return;
    }
    later(sync, 80);
  }
  function segPick(group, v) {
    var M = window.TitanMotion, Q = window.TitanQuality, O = window.TitanOpening, FX = window.TitanFX;
    if (group === "motion" && M) M.set(v);
    else if (group === "quality" && Q && v !== Q.choice) Q.set(v);
    else if (group === "opening" && O) O.set(v);
    else if (group === "fxlevel" && FX) FX.setLevel(v);
  }
  var uiT = 0;
  function onPanelInput(e) {
    var t = e.target, id = t.dataset && t.dataset.in; if (!id) return;
    var s = S(), v = +t.value, FX = window.TitanFX, K = window.TitanFXK;
    if (id.indexOf("bed:") === 0) { if (s) s.setLevel(id.slice(4), v); outOf(t, pct(v)); }
    else if (id === "mus" || id === "amb") { if (s) s.setMix(id === "mus" ? v : null, id === "amb" ? v : null); outOf(t, pct(v)); }
    else if (id === "bass" || id === "mid" || id === "treble") { if (s) s.setTone(id === "bass" ? v : null, id === "mid" ? v : null, id === "treble" ? v : null); outOf(t, db(v)); }
    else if (id === "uivol") { var U = window.TitanUISounds; if (U) { U.setVolume(v); clearTimeout(uiT); uiT = setTimeout(function () { U.play("flip"); }, 160); } outOf(t, pct(v)); }
    else if (id === "fxint") { if (FX) FX.setIntensity(v); outOf(t, pct(v)); }
    else if (id === "film") { if (FX) FX.setFilm(v); outOf(t, pct(v)); }
    else if (id.indexOf("layer:") === 0) { if (window.TitanFXLayers) window.TitanFXLayers.set(current(), id.slice(6), v); outOf(t, Math.round(v * 100) + "%"); }
    else if (id.indexOf("look:") === 0 && K && K.saveLook) {
      var R = kitRoom(); if (!R) return;
      var look = K.savedLook(current()); look[id.slice(5)] = v;      // only the control that moved: the others keep their exact value
      K.saveLook(current(), look); lookScape(look);
      var c = (R.look || []).filter(function (x) { return "look:" + x.id === id; })[0]; outOf(t, times(v, c ? c.def : 1));
    }
  }
  /* a look control that also moves the soundscape (room data `scape`) moves it here too, while that soundscape plays */
  function lookScape(look) {
    var R = kitRoom(), T = window.TitanScape; if (!R || !T || !T.setParam) return;
    (R.look || []).forEach(function (c) { if (c.scape) { try { T.setParam(c.scape, look[c.id] != null ? look[c.id] : c.def); } catch (e) { /* not playing */ } } });
  }
  function onPanelChange(e) {
    var t = e.target, s = S();
    if (t.dataset.sel === "spatial") { if (s) s.setOpt("spatial", t.value); t.blur(); return; }
    if (t.dataset.sel === "station") { if (s && s.radio) s.radio.set(t.value); t.blur(); return; }
    var o = t.dataset.opt; if (!o) return;
    var U = window.TitanUISounds;
    if (o === "follow" || o === "bgPause" || o === "timeAware") { if (s) s.setOpt(o, t.checked); }
    else if (o === "ui-on" && U) U.setEnabled(t.checked);
    else if (o === "ui-mo" && U && U.setMomentSounds) U.setMomentSounds(t.checked);
    else if (o === "haptics" && window.TitanHaptics) { window.TitanHaptics.set(t.checked); if (t.checked) window.TitanHaptics.tick("success"); }
    else if (o === "switch") ls.set("titan.opening.switch", t.checked ? null : "0");
    else if (o === "auto") { var a = document.getElementById("auto-refresh"); if (a && a.checked !== t.checked) { a.checked = t.checked; a.dispatchEvent(new Event("change", { bubbles: true })); } }
    later(sync, 60);
  }
  function allSettings() { var was = state.panel; close(true); var s = S(); if (s && s.open) s.open(was === "look" ? "settings" : "sound"); }

  /* ------------------------------------------------------------------ open, close, enter ------------------------------------------------------------------ */
  function onKey(e) {
    var t = e.target, field = t && (t.type === "range" || t.type === "text" || t.tagName === "SELECT");
    if (!state.open || (window.TitanRoom && document.getElementById("troom"))) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (state.panel) { var b = root.querySelector('[data-open="' + state.panel + '"]'); panel(null); if (b) b.focus(); } else close(); }
    else if (state.panel || field) return;
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); state.target = Math.round(state.target) + (e.key === "ArrowRight" ? 1 : -1); state.vel = 0; spin(); }
    else if (e.key === "Enter" && t && t.classList && t.classList.contains("atm-card")) { e.preventDefault(); go(state.list[+t.dataset.i]); }
  }
  function open(tab) {
    return css().then(function () {
      if (!root) build();
      var parts = String(tab || "").split(":"), pn = parts[0] === "sound" || parts[0] === "look" ? parts[0] : null;
      if (pn && parts[1]) state.tabs[pn] = parts[1];
      if (state.open) { if (pn) panel(pn); return; }
      state.last = document.activeElement; state.open = true;
      title(); renderGroups(); setGroup(state.group);
      root.hidden = false; html.classList.add("tr-atmos");
      requestAnimationFrame(function () { root.classList.add("in"); });
      panel(pn);
      sync(); cancelAnimationFrame(state.meter); state.meter = requestAnimationFrame(meter);
      state.poll = setInterval(sync, 2000);
      window.addEventListener("keydown", onKey, true);   // on the window: Escape works wherever the focus went
      window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
      setTimeout(function () { var f = root.querySelector(".atm-card.front") || root.querySelector("#atm-x"); if (f) f.focus({ preventScroll: true }); }, 60);
    });
  }
  function close(quick) {
    if (!root || !state.open) return;
    state.open = false; cancelAnimationFrame(state.meter); cancelAnimationFrame(state.raf); clearInterval(state.poll); window.removeEventListener("keydown", onKey, true);
    root.classList.remove("in"); html.classList.remove("tr-atmos");
    setTimeout(function () { if (!state.open) root.hidden = true; }, quick === true ? 0 : 380);
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    if (state.last && document.contains(state.last) && state.last.focus) { try { state.last.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function enter() { var R = window.TitanRoom; close(true); if (R && R.open) R.open(); }
  window.addEventListener("resize", function () { if (state.open) { fit(); layout(); } });
  window.addEventListener("titan:atmo", function () { if (!state.open) return; title(); fit(); layout(); markRing(); hint(); follow(); if (state.panel) { state.keys[state.panel] = null; refresh(state.panel); } });
  window.addEventListener("titan:motion", function () { if (state.open && state.panel === "look") refresh("look"); });

  window.TitanAtmosphere = { open: open, close: close, isOpen: function () { return state.open; }, go: function (id) { var W = worlds(); if (W) go(W.byId(id)); },
    panel: function (n, t) { if (t) state.tabs[n] = t; panel(n || null); }, _state: state };
})();
