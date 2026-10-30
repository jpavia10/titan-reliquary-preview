/* Titan Reliquary — Scene Studio (UI). One sheet for lighting (20 atmospheres), sound and music.
   Engine: wings/scene-engine.js (TitanGen: recorded beds + real recorded music only, never generated). Internet radio (audio.js) is an optional extra.
   The Scene bar (#scene-bar, index.html) holds #btn-search and #btn-atmo (opens this sheet). */
(() => {
  "use strict";
  const G = window.TitanGen;
  if (!G) return;
  const KEY = "titan.scene.v1";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const DEF = { scene: "off", mix: null, mine: [], vol: 0.55, mus: 0.9, amb: 0.9, bass: 0, mid: 0, treble: 0, tempo: 1, motion: null, bgPause: false, spatial: null, timeAware: true };
  let st = clone(DEF);
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ }
  if (G.ALIASES && G.ALIASES[st.scene]) st.scene = G.ALIASES[st.scene];
  if (!Array.isArray(st.mine)) st.mine = [];
  const userScene = (id) => st.mine.find((u) => u.id === id);
  if (st.scene !== "off" && st.scene !== "custom" && !G.SCENES[st.scene] && !userScene(st.scene)) st.scene = "off";
  /* "My mix": the mixer's current layers, saved on every change under its own key */
  const MYKEY = "titan.mymix.v1";
  const saveMine = () => { try { if (st.mix) localStorage.setItem(MYKEY, JSON.stringify(st.mix)); } catch (e) { /* ignore */ } };
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(MYKEY) || "null"); } catch (e) { return null; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

  window.TITAN_BG_PAUSE = !!st.bgPause;
  G.setBackgroundPause(st.bgPause);
  if (st.spatial) G.setSpatial(st.spatial);
  G.setTimeAware(st.timeAware !== false);
  G.setVolume(st.vol); G.setLevels(st.mus, st.amb); G.setTone(st.bass, st.mid, st.treble);
  if (st.motion != null && window.TitanAmbient && window.TitanAmbient.setVisualEnabled) window.TitanAmbient.setVisualEnabled(!!st.motion);

  const sceneName = () => (st.scene === "custom" ? "My mix" : st.scene === "off" ? "" : userScene(st.scene) ? userScene(st.scene).name : (G.SCENES[st.scene] || { name: "" }).name);
  const sceneBtn = (id, s) => `<button type="button" class="ss-scene" data-scene="${id}" aria-pressed="false"><span class="i" aria-hidden="true">${s.icon}</span><span class="n">${esc(s.name)}</span><span class="d">${esc(s.desc)}</span></button>`;

  /* ---------- markup ---------- */
  const sheet = document.createElement("div");
  sheet.id = "scene-sheet"; sheet.className = "scene-sheet"; sheet.hidden = true;
  const atmoCards = [...document.querySelectorAll("#atmo-sheet .atmo-card")].map((c) => ({
    val: c.dataset.atmoVal, name: ($(".atmo-card-name", c) || {}).textContent || c.dataset.atmoVal,
    sw: ([...(($(".atmo-swatch", c) || {}).classList || [])].find((k) => k.indexOf("sw-") === 0)) || ""
  }));
  /* Scene Studio v3 (2026-10-20, owner: "make the grouping of the themes and the ui of the atmosphere and sound not suck. Its very bad").
     One compact sticky header on every tab: the tabs and close, a "now" card (the theme's picture, its name, what is playing, Play), the
     volume and Off. Three tabs: Themes (grouped, wings/themes/worlds.js), Sound (this theme's sound first, then moods, then the mixer),
     Settings (everything that was hidden at the bottom of Sound). */
  const bedChip = (id) => { const b = G.BEDS[id]; return `<button type="button" class="ss-bed" data-bed="${id}" aria-pressed="false"><span class="i" aria-hidden="true">${b.icon}</span>${esc(b.label)}${b.kind === "event" ? '<small> · now and then</small>' : ""}</button>`; };
  /* every theme's own sound, in the Themes tab's group order (scene-engine's WORLD_ORDER predates the newer themes) */
  const WORLD_SOUNDS = (() => {
    const out = [], seen = {}, add = (id) => { if (id && G.ALIASES && G.ALIASES[id]) id = G.ALIASES[id]; if (id && G.SCENES[id] && !seen[id]) { seen[id] = 1; out.push(id); } };
    const TW = window.TitanWorlds;
    if (TW && TW.groups) TW.groups().forEach((g) => g.list.forEach((w) => add(w.scene)));
    G.WORLD_ORDER.forEach(add);
    return out;
  })();
  const wchip = (id) => { const s = G.SCENES[id]; return `<button type="button" class="ss-wchip" data-scene="${id}" aria-pressed="false"><span class="i" aria-hidden="true">${s.icon}</span>${esc(s.name)}</button>`; };
  sheet.innerHTML = `
  <div class="ss-card" role="dialog" aria-modal="true" aria-labelledby="ss-title">
    <div class="ss-top">
      <h2 class="ss-title" id="ss-title">Scene Studio</h2>
      <div class="ss-head">
        <!-- THEMES-TABS:begin -->
        <div class="ss-tabs" role="tablist" aria-label="Scene Studio sections">
          <button type="button" class="ss-tab" role="tab" id="ss-tab-themes" data-tab="themes" aria-controls="ss-p-themes" aria-selected="true">Themes</button>
          <button type="button" class="ss-tab" role="tab" id="ss-tab-sound" data-tab="sound" aria-controls="ss-p-sound" aria-selected="false">Sound</button>
          <button type="button" class="ss-tab" role="tab" id="ss-tab-settings" data-tab="settings" aria-controls="ss-p-settings" aria-selected="false">Settings</button>
        </div>
        <!-- THEMES-TABS:end -->
        <button type="button" class="ss-x" id="ss-close" aria-label="Close Scene Studio">×</button>
      </div>
      <div class="ss-nowcard">
        <span class="ss-now-pic" id="ss-now-pic" aria-hidden="true"></span>
        <div class="ss-now-txt"><span class="ss-now-theme" id="ss-now-theme"></span><p class="ss-status" id="ss-status" role="status" aria-live="polite"></p></div>
        <button type="button" class="ss-btn primary ss-playbtn" id="ss-play">▶ Play</button>
        <button type="button" class="ss-btn ss-roombtn" id="ss-room" title="The theme on its own, away from the collection">Step inside</button>
      </div>
      <div class="ss-master"><label for="ss-vol">Volume</label><input type="range" id="ss-vol" min="0" max="1" step="0.01" aria-label="Master volume"><span class="ss-vol-n" id="ss-vol-n"></span><button type="button" class="ss-btn off ss-offbtn" id="ss-off" aria-label="Sound off (stays off next time)">■ Off</button></div>
      <p class="ss-now" id="ss-now" hidden></p>
    </div>
    <!-- THEMES-TABS:panel-themes --><div class="ss-panel" id="ss-p-themes" role="tabpanel" aria-labelledby="ss-tab-themes"><div id="ss-themes"></div></div>
    <!-- THEMES-TABS:panel-sound --><div class="ss-panel" id="ss-p-sound" role="tabpanel" aria-labelledby="ss-tab-sound" hidden>
    <div id="ss-theme-snd"></div>
    <h3 class="ss-h">Moods</h3>
    <p class="ss-sub">Real recordings with music underneath. One tap sets the sound and lights the room to match.</p>
    <div class="ss-scenes" id="ss-scenes">${G.SCENE_ORDER.map((id) => sceneBtn(id, G.SCENES[id])).join("")}</div>
    <div id="ss-mine-wrap" hidden><h3 class="ss-h">My scenes</h3><div class="ss-scenes" id="ss-mine"></div></div>
    <details class="ss-details" id="ss-worlds"><summary>Every theme's own sound <span class="ss-count">${WORLD_SOUNDS.length}</span></summary><div class="in">
      <p class="ss-sub">Each theme's sound and music. A tap also switches to that theme.</p>
      <div class="ss-wchips">${WORLD_SOUNDS.map(wchip).join("")}</div></div></details>
    <details class="ss-details" id="ss-build"><summary>Build your own mix</summary><div class="in">
      <p class="ss-sub">Tap sounds to add them; each one you add gets its own level below. Saved automatically as My mix.</p>
      <h4 class="ss-gh">In your mix</h4>
      <div class="ss-mixlist" id="ss-mixlist"><p class="ss-note">Nothing yet: tap a sound below.</p></div>
      <h4 class="ss-gh">Music (real recordings)</h4>
      <div class="ss-chips" id="ss-music">
        <button type="button" class="ss-chip" data-mus="piano" aria-pressed="false">Piano</button>
        <button type="button" class="ss-chip" data-mus="orchestra" aria-pressed="false">Strings and orchestra</button>
      </div>
      ${G.BED_GROUPS.map((grp) => `<h4 class="ss-gh">${esc(grp)}</h4><div class="ss-beds">` + G.BED_ORDER.filter((id) => G.BEDS[id].group === grp).map(bedChip).join("") + "</div>").join("")}
      <h4 class="ss-gh">Keep this mix</h4>
      <div class="ss-savebox"><input type="text" id="ss-savename" maxlength="30" placeholder="Name this scene" aria-label="Name for the new scene"><button type="button" class="ss-btn" id="ss-save">Save as a scene</button></div>
      <div class="ss-btnrow"><button type="button" class="ss-btn" id="ss-loadmine">Load My mix</button><button type="button" class="ss-btn" id="ss-clearmix">Clear all</button></div>
      <p class="ss-note" id="ss-savemsg" role="status" aria-live="polite"></p></div></details>
    <details class="ss-details"><summary>Mix and tone</summary><div class="in">
      <div class="ss-row"><span>Music</span><input type="range" id="ss-mus" min="0" max="1" step="0.01" aria-label="Music level"></div>
      <div class="ss-row"><span>Ambience</span><input type="range" id="ss-amb" min="0" max="1" step="0.01" aria-label="Ambience level"></div>
      <div class="ss-row"><span>Bass</span><input type="range" id="ss-bass" min="-8" max="8" step="1" aria-label="Bass"></div>
      <div class="ss-row"><span>Mid</span><input type="range" id="ss-mid" min="-8" max="8" step="1" aria-label="Mid tones"></div>
      <div class="ss-row"><span>Treble</span><input type="range" id="ss-treble" min="-8" max="8" step="1" aria-label="Treble"></div>
      <p class="ss-note">A soft limiter keeps loud moments from clipping.</p></div></details>
    <details class="ss-details" id="ss-radio-d"><summary>Internet radio</summary><div class="in">
      <p class="ss-sub">Needs an internet connection and may be unavailable. Everything above always works offline.</p>
      <select id="ss-station" aria-label="Radio station"></select>
      <div class="ss-btnrow"><button type="button" class="ss-btn" id="ss-radio-play">▶ Play radio</button></div>
      <p class="ss-radio-status" id="ss-radio-status" role="status" aria-live="polite"></p></div></details>
    </div><!-- /sound panel -->
    <div class="ss-panel" id="ss-p-settings" role="tabpanel" aria-labelledby="ss-tab-settings" hidden>
    <div class="in" id="ss-set-mount">
      <label class="ss-check"><input type="checkbox" id="ss-follow"><span>Sound follows the theme (each theme has its own sound)</span></label>
      <label class="ss-check"><input type="checkbox" id="ss-motion"><span>Show falling rain, embers and sparks on screen</span></label>
      <label class="ss-check"><input type="checkbox" id="ss-bg"><span>Pause sound when the app is in the background</span></label>
      <p class="ss-note" id="ss-bg-note">By default sound keeps playing when you switch apps or lock the phone.</p>
      <label class="ss-check"><input type="checkbox" id="ss-tod"><span>Shift the sounds with the time of day (birds at dawn, quieter crowds at night)</span></label>
      <label class="ss-check" id="ss-spatial-row"><span>Sound space</span> <select id="ss-spatial"><option value="3d">3D (headphones are best)</option><option value="stereo">Stereo</option><option value="off">Off</option></select></label>
      <div id="ss-moved"></div></div>
    </div><!-- /settings panel -->
  </div>`;
  document.body.appendChild(sheet);
  /* TitanFX hook (effects control in Settings) */ if (window.TitanFXUI) window.TitanFXUI.mount(sheet);
  /* TitanMotion hook (one motion setting Full / Calm / Off + haptics, fix list #59) */ if (window.TitanMotion) window.TitanMotion.mount(sheet);
  /* TitanOpening hook (Opening: Mix / Film / Theme motion / None, js/motion-splash.js) */ if (window.TitanOpening) window.TitanOpening.mount(sheet);
  /* TitanUISounds hook (interface sounds toggle + volume) */ if (window.TitanUISounds) window.TitanUISounds.mount(sheet);
  /* Settings tab: the hooks above add their controls into one container; sort them into three plain sections */
  (() => {
    const host = $("#ss-set-mount", sheet), pane = $("#ss-p-settings", sheet);
    if (!host || !pane) return;
    const sec = (title, nodes) => {
      const s = document.createElement("section"); s.className = "ss-set in";
      s.innerHTML = `<h3 class="ss-h">${esc(title)}</h3>`;
      nodes.filter(Boolean).forEach((n) => s.appendChild(n)); return s;
    };
    const lbl = (id) => { const e = $("#" + id, sheet); return e ? e.closest("label") : null; };
    const look = [$(".ss-motion-set", host), $(".ss-opening-set", host), [...host.querySelectorAll(".ss-fx")].find((b) => !b.classList.contains("ss-motion-set") && !b.classList.contains("ss-opening-set")), lbl("ss-motion")];
    const sound = [lbl("ss-follow"), lbl("ss-bg"), $("#ss-bg-note", host), lbl("ss-tod"), $("#ss-spatial-row", host), $(".ss-uisounds", host)];
    pane.appendChild(sec("Look and motion", look));
    pane.appendChild(sec("Sound", sound));
    pane.appendChild(sec("Updates", [$("#ss-moved", host)]));
    [...host.children].forEach((n) => pane.querySelector(".ss-set").appendChild(n));   // anything a later hook added stays reachable
    host.remove();
  })();

  // Auto-refresh toggle and the "checked 23s ago" line live in Settings now (same elements, same ids).
  const moved = $("#ss-moved", sheet);
  const autoLbl = document.querySelector(".hero-actions .auto-toggle"), liveSt = document.getElementById("live-status");
  if (autoLbl) { const sp = autoLbl.querySelector("span"); if (sp) sp.textContent = "Check for updates automatically"; moved.appendChild(autoLbl); }
  if (liveSt) moved.appendChild(liveSt);
  const ha = document.getElementById("hero-actions"); if (ha) ha.hidden = true;

  /* ---------- helpers ---------- */
  const el = { status: $("#ss-status", sheet), vol: $("#ss-vol", sheet), volN: $("#ss-vol-n", sheet), play: $("#ss-play", sheet), off: $("#ss-off", sheet) };
  const barBtn = document.getElementById("btn-atmo"), barName = document.getElementById("atmo-name");
  let radioOn = false, lastAtmo = document.documentElement.getAttribute("data-atmo") || "afterhours";

  function mixNow() { return st.mix ? clone(st.mix) : null; }
  /* "In your mix": a level slider for each layer that is on (the chips above add and remove layers). Rebuilt only when the set of layers
     changes, so a slider being dragged is never replaced under the finger. */
  let mixKey = null;
  function renderMixList(beds) {
    const box = $("#ss-mixlist", sheet); if (!box) return;
    const ids = G.BED_ORDER.filter((id) => (beds[id] || 0) > 0), key = ids.join(",");
    if (key !== mixKey) {
      mixKey = key;
      box.innerHTML = ids.length ? ids.map((id) => { const b = G.BEDS[id]; return `<div class="ss-mrow on" data-row="${id}"><span class="ss-mi" aria-hidden="true">${b.icon}</span><label class="ss-ml" for="ss-m-${id}">${esc(b.label)}</label><input type="range" id="ss-m-${id}" data-level="${id}" min="0.02" max="1" step="0.01" aria-label="${esc(b.label)} level"><span class="ss-mn" aria-hidden="true"></span><button type="button" class="ss-rm" data-bed="${id}" aria-label="Remove ${esc(b.label)}">×</button></div>`; }).join("")
        : '<p class="ss-note">Nothing yet: tap a sound below.</p>';
    }
    box.querySelectorAll(".ss-mrow").forEach((r) => { const id = r.dataset.row, v = beds[id] || 0, inp = r.querySelector("input"); if (document.activeElement !== inp) inp.value = v; r.querySelector(".ss-mn").textContent = Math.round(v * 100); });
  }
  /* the now card: the current theme's picture and name, and what is playing */
  function renderNow(playing, paused, nm) {
    const W = window.TitanWorlds, w = W && W.byId(lastAtmo), pic = $("#ss-now-pic", sheet);
    $("#ss-now-theme", sheet).textContent = atmoName(lastAtmo);
    if (pic && pic.dataset.for !== lastAtmo) {
      pic.dataset.for = lastAtmo;
      pic.className = "ss-now-pic" + (w && w.art ? "" : " atmo-swatch sw-" + lastAtmo);
      pic.innerHTML = w && w.art ? `<img alt="" decoding="async" src="art/themes/${esc(w.art.card)}">` : "";
    }
  }
  /* Sound tab, first card: the sound of the theme on screen now */
  let sndKey = null;
  function renderThemeSound() {
    const box = $("#ss-theme-snd", sheet); if (!box) return;
    const w = window.TitanWorlds && window.TitanWorlds.byId(lastAtmo);
    let id = w && w.scene; if (id && G.ALIASES && G.ALIASES[id]) id = G.ALIASES[id];
    const key = id && G.SCENES[id] ? id : "";
    if (key !== sndKey) {
      sndKey = key;
      box.innerHTML = key ? `<h3 class="ss-h">This theme's sound</h3><div class="ss-theme-snd">${sceneBtn(key, G.SCENES[key])}</div>` : "";
      const b = box.querySelector(".ss-scene"); if (b) b.setAttribute("aria-pressed", String(st.scene === key));
    }
  }
  function render() {
    const playing = G.isPlaying(), paused = G.isPaused(), nm = sceneName();
    el.status.textContent =
      playing ? `♪ ${nm}` : paused ? `Paused · ${nm}` : (nm && st.mix ? `${nm} · tap Play` : "Silent · pick a sound");
    el.play.textContent = playing ? "❚❚ Pause" : "▶ Play";
    el.play.disabled = !st.mix;
    el.off.disabled = !(playing || paused);
    el.vol.value = st.vol; el.volN.textContent = Math.round(st.vol * 100) + "%";
    sheet.querySelectorAll("[data-scene]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === st.scene)));
    sheet.querySelectorAll("[data-atmo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.atmo === lastAtmo)));
    const m = st.mix || {}, beds = m.beds || {};
    sheet.querySelectorAll(".ss-bed").forEach((b) => b.setAttribute("aria-pressed", String((beds[b.dataset.bed] || 0) > 0)));
    renderMixList(beds);
    renderNow(playing, paused, nm);
    renderThemeSound();
    const mine = $("#ss-mine", sheet); $("#ss-mine-wrap", sheet).hidden = !st.mine.length;
    mine.innerHTML = st.mine.map((u) => `<div class="ss-mine-item">${sceneBtn(u.id, { icon: "★", name: u.name, desc: "Your scene" })}<button type="button" class="ss-del" data-del="${u.id}" aria-label="Remove ${esc(u.name)}">Remove</button></div>`).join("");
    const recOf = (x) => x.rec || ((x.pad > 0 || x.piano || x.bells || x.beat) ? "piano" : null);   // an old saved mix: its music was the piano
    sheet.querySelectorAll("[data-mus]").forEach((b) => { b.setAttribute("aria-pressed", String(!m.score && recOf(m) === b.dataset.mus)); });
    $("#ss-mus", sheet).value = st.mus; $("#ss-amb", sheet).value = st.amb;
    $("#ss-bass", sheet).value = st.bass; $("#ss-mid", sheet).value = st.mid; $("#ss-treble", sheet).value = st.treble;
    const mo = $("#ss-motion", sheet); mo.checked = st.motion == null ? !!(window.TitanAmbient && window.TitanAmbient.visualEnabled && window.TitanAmbient.visualEnabled()) : !!st.motion;
    $("#ss-bg", sheet).checked = !!st.bgPause;
    $("#ss-follow", sheet).checked = st.follow !== false;
    $("#ss-tod", sheet).checked = st.timeAware !== false; $("#ss-spatial", sheet).value = G.getSpatial();
    if (barBtn) { barBtn.classList.toggle("is-playing", playing); }
    if (barName) barName.textContent = (playing || paused) && nm ? nm : (document.documentElement.getAttribute("data-atmo") ? atmoName(lastAtmo) : "Lighting");
    if (barBtn) barBtn.setAttribute("aria-label", `Scene Studio. ${playing ? "Playing " + nm : "Silent"}. Lighting: ${atmoName(lastAtmo)}`);
  }
  function atmoName(v) { const w = window.TitanWorlds && window.TitanWorlds.byId(v); if (w) return w.name; const a = atmoCards.find((c) => c.val === v); return a ? a.name : v; }

  function start(fade) {
    if (!st.mix) return;
    if (radioOn) stopRadio();
    const ok = G.play(mixNow(), { name: sceneName(), fade: fade == null ? 2.5 : fade });
    if (!ok) el.status.textContent = "This browser cannot make sound.";
    st.wasPlaying = true; st.userOff = false; save(); render();
  }
  /* the World whose manifest names this sound scene (theme id = atmosphere id) */
  const worldOfScene = (id) => { const W = (window.TitanWorlds && window.TitanWorlds.worlds) || []; const w = W.find((x) => x.scene === id); return w ? w.id : null; };
  /* One tap = the whole scene (owner 2026-10-08: "when I click a scene it should also load effects and sound and music"): the sound and
     its music start first, then the lighting and its effect follow (World scenes switch to their World). opts.visual === false keeps the
     current look (auto-start, theme clicks that already switched it). */
  function pickScene(id, opts) {
    opts = opts || {};
    if (G.ALIASES && G.ALIASES[id]) id = G.ALIASES[id];
    const u = userScene(id);
    if (u) { st.scene = id; st.mix = clone(u.mix); saveMine(); start(opts.fade || 2.5); if (opts.visual !== false && u.atmo && window.TitanSetAtmo) window.TitanSetAtmo(u.atmo); return; }
    const s = G.SCENES[id]; if (!s) return;
    st.scene = id; st.mix = { beds: clone(s.beds), pad: s.pad, piano: s.piano, bells: s.bells, beat: s.beat, root: s.root, mode: s.mode, prog: s.prog, chordSec: s.chordSec, gap: s.gap, bpm: s.bpm, arc: s.arc, spat: s.spat, rec: s.rec, score: s.score };
    saveMine(); start(opts.fade || 2.5);
    if (opts.visual === false) return;
    if (s.world) { const wid = worldOfScene(id); if (wid && wid !== lastAtmo && window.TitanWorlds) { lastAtmo = wid; window.TitanWorlds.apply(wid); } }
    else if (window.TitanSetAtmo && s.atmo) window.TitanSetAtmo(s.atmo);
  }
  function customise(fn) {
    if (!st.mix) st.mix = { beds: {}, pad: 0, piano: false, bells: false, beat: false, root: "D", mode: "dorian", prog: [0, 4, 3, 1], chordSec: 14, gap: [5, 10], bpm: 74 };
    fn(st.mix); st.scene = "custom"; saveMine(); start(1.5);
  }
  function msg(t) { const e = $("#ss-savemsg", sheet); if (e) e.textContent = t; }
  /* mixer slider / icon: change one bed's level live; only rebuild the scene when a bed has to be added */
  function setLevel(id, v) {
    if (!st.mix) st.mix = { beds: {}, pad: 0, piano: false, bells: false, beat: false, root: "D", mode: "dorian", prog: [0, 4, 3, 1], chordSec: 14, gap: [5, 10], bpm: 74 };
    st.mix.beds = st.mix.beds || {};
    const had = st.mix.beds[id] > 0;
    if (v > 0) st.mix.beds[id] = v; else delete st.mix.beds[id];
    st.scene = "custom"; saveMine(); save();
    if (G.isActive() && (had || v <= 0) && G.setBedLevel(id, v)) { render(); return; }
    if (v > 0) start(1.5); else render();
  }
  function saveScene() {
    const name = ($("#ss-savename", sheet).value || "").trim();
    if (!st.mix || !Object.keys(st.mix.beds || {}).length) { msg("Add at least one sound first."); return; }
    if (!name) { msg("Type a name first."); return; }
    st.mine.push({ id: "u" + Date.now().toString(36), name: name.slice(0, 30), mix: clone(st.mix), atmo: lastAtmo });
    $("#ss-savename", sheet).value = ""; save(); render(); msg(`Saved "${name}" under My scenes.`);
  }
  function stopAll() { G.stop(0.8); st.wasPlaying = false; st.userOff = true; save(); render(); }      // Off is remembered: no auto-start next visit

  /* ---------- radio ---------- */
  const radio = window.TitanLofi;
  const selSt = $("#ss-station", sheet), radioBtn = $("#ss-radio-play", sheet), radioSt = $("#ss-radio-status", sheet);
  if (radio && radio.stations) {
    selSt.innerHTML = radio.stations().map((s) => `<option value="${s.key}">${esc(s.name)}${s.tag ? " — " + esc(s.tag) : ""}</option>`).join("");
    try { selSt.value = radio.station(); } catch (e) { /* ignore */ }
  } else { $("#ss-radio-d", sheet).hidden = true; }
  function stopRadio() { try { radio.pause(); } catch (e) { /* ignore */ } radioOn = false; G.setMusicDuck(false); renderRadio(); }
  function renderRadio() {
    if (!radio) return;
    const s = radio.status ? radio.status() : {};
    radioBtn.textContent = s.playing || s.wantPlay ? "❚❚ Stop radio" : "▶ Play radio";
    radioSt.textContent = s.down ? s.note : s.playing ? `Now playing: ${s.title}${s.artist ? " · " + s.artist : ""}` : s.wantPlay ? "Connecting…" : (s.note || "Not playing.");
    if (barBtn) barBtn.classList.toggle("is-playing", G.isPlaying() || !!s.playing);
  }
  radioBtn.addEventListener("click", () => {
    const s = radio.status();
    if (s.playing || s.wantPlay) { stopRadio(); return; }
    radioOn = true; G.setMusicDuck(true);       // the scene's music steps aside; ambient beds stay
    try { radio.setVolume(st.vol); radio.setMuted(false); radio.setStation(selSt.value); radio.play(); } catch (e) { /* ignore */ }
    renderRadio();
  });
  selSt.addEventListener("change", () => { try { radio.setStation(selSt.value); } catch (e) { /* ignore */ } });
  window.addEventListener("titan:radio", () => { renderRadio(); const s = radio.status(); if (!s.playing && !s.wantPlay && radioOn) { radioOn = false; G.setMusicDuck(false); } });

  /* THEMES-TABS:js begin ---------- tabs + Themes picker (see wings/themes/worlds.js) ---------- */
  const TAB_KEY = "titan.scene.tab";
  const card = $(".ss-card", sheet), themesEl = $("#ss-themes", sheet);
  let tab = "themes";
  const TABS = ["themes", "sound", "settings"];
  try { const t = localStorage.getItem(TAB_KEY); if (t === "scenes" || t === "sound") tab = "sound"; else if (t === "settings") tab = t; } catch (e) { /* ignore */ }
  function setTab(t, focus) {
    if (t === "scenes") t = "sound";                     // the old Scenes tab is the top of Sound now
    if (TABS.indexOf(t) < 0) t = "themes";
    tab = t; card.dataset.tab = t;
    sheet.querySelectorAll(".ss-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
    sheet.querySelectorAll(".ss-panel").forEach((p) => { p.hidden = p.id !== "ss-p-" + t; });
    if (t === "themes" && window.TitanWorlds) { if (!themesEl.firstChild) window.TitanWorlds.render(themesEl); else window.TitanWorlds.mark(themesEl); }
    try { localStorage.setItem(TAB_KEY, t); } catch (e) { /* ignore */ }
    if (focus) { const b = $("#ss-tab-" + t, sheet); if (b) b.focus(); }
  }
  sheet.querySelector(".ss-tabs").addEventListener("click", (e) => { const b = e.target.closest(".ss-tab"); if (b) setTab(b.dataset.tab); });
  sheet.querySelector(".ss-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = TABS.indexOf(tab);
    setTab(TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length], true); e.preventDefault();
  });
  function pickWorld(wid) {
    const w = window.TitanWorlds.byId(wid); if (!w) return;
    let sid = w.scene; if (sid && G.ALIASES && G.ALIASES[sid]) sid = G.ALIASES[sid];
    // the World's sound + music start in the same tap (unless "Sound follows the theme" is off or the radio is playing)
    if (st.follow !== false && !radioOn && sid && G.SCENES[sid] && !(G.isPlaying() && st.scene === sid)) pickScene(sid, { visual: false });
    lastAtmo = wid; window.TitanWorlds.apply(wid);
    window.TitanWorlds.mark(themesEl, wid);
    render();
  }
  themesEl.addEventListener("click", (e) => {
    if (!window.TitanWorlds) return;
    const f = e.target.closest("[data-th-filter]");
    if (f) { themesEl.dataset.filter = f.dataset.thFilter; window.TitanWorlds.render(themesEl); return; }
    if (e.target.closest("[data-th-surprise]")) { const id = window.TitanWorlds.surprise(themesEl.dataset.filter, lastAtmo); if (id) pickWorld(id); return; }
    const b = e.target.closest(".th-card"); if (b) pickWorld(b.dataset.world);
  });
  window.addEventListener("titan:atmo", () => { if (window.TitanWorlds && themesEl.firstChild) window.TitanWorlds.mark(themesEl); });
  /* THEMES-TABS:js end */

  /* ---------- events ---------- */
  let last = null;
  function open(which) {
    if (!sheet.hidden) { if (which) setTab(which); return; }
    setTab(which || tab);
    last = document.activeElement;
    renderRadio(); render();
    sheet.hidden = false;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
    $("#ss-close", sheet).focus();
  }
  function close() {
    if (sheet.hidden) return;
    sheet.hidden = true;
    window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
    if (last && document.contains(last) && last.focus) { try { last.focus(); } catch (e) { /* ignore */ } }
  }
  $("#ss-close", sheet).addEventListener("click", close);
  // the theme's room (wings/room.js): Scene Studio closes first, then the room opens over the live world
  $("#ss-room", sheet).addEventListener("click", () => { close(); setTimeout(() => { if (window.TitanRoom) window.TitanRoom.open(); }, 120); });
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
  el.play.addEventListener("click", () => {
    if (G.isPlaying()) { G.pause(); st.wasPlaying = false; save(); render(); }
    else if (G.isPaused()) { G.resume(); st.wasPlaying = true; save(); render(); }
    else start(2);
  });
  el.off.addEventListener("click", stopAll);
  el.vol.addEventListener("input", () => { st.vol = +el.vol.value; G.setVolume(st.vol); el.volN.textContent = Math.round(st.vol * 100) + "%"; if (radioOn) { try { radio.setVolume(st.vol); } catch (e) { /* ignore */ } } save(); });
  const bind = (id, fn) => $(id, sheet).addEventListener("input", (e) => { fn(+e.target.value); save(); });
  bind("#ss-mus", (v) => { st.mus = v; G.setLevels(v, null); });
  bind("#ss-amb", (v) => { st.amb = v; G.setLevels(null, v); });
  const tone = () => G.setTone(st.bass, st.mid, st.treble);
  bind("#ss-bass", (v) => { st.bass = v; tone(); }); bind("#ss-mid", (v) => { st.mid = v; tone(); }); bind("#ss-treble", (v) => { st.treble = v; tone(); });
  sheet.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.scene) pickScene(b.dataset.scene);
    else if (b.dataset.atmo) { if (window.TitanSetAtmo) window.TitanSetAtmo(b.dataset.atmo); lastAtmo = b.dataset.atmo; render(); }
    else if (b.dataset.bed) setLevel(b.dataset.bed, ((st.mix && st.mix.beds && st.mix.beds[b.dataset.bed]) > 0) ? 0 : G.BEDS[b.dataset.bed].level);
    else if (b.dataset.del) { st.mine = st.mine.filter((u) => u.id !== b.dataset.del); if (st.scene === b.dataset.del) st.scene = "custom"; save(); render(); }
    else if (b.id === "ss-save") saveScene();
    else if (b.id === "ss-loadmine") { const m = loadMine(); if (m) { st.mix = m; st.scene = "custom"; start(2); } else msg("No saved mix yet."); }
    else if (b.id === "ss-clearmix") { st.mix = { beds: {}, pad: 0, piano: false, bells: false, beat: false, root: "D", mode: "dorian", prog: [0, 4, 3, 1], chordSec: 14, gap: [5, 10], bpm: 74 }; st.scene = "custom"; saveMine(); G.stop(0.8); st.wasPlaying = false; save(); render(); }
    else if (b.dataset.mus) customise((m) => { const k = b.dataset.mus, on = !m.score && (m.rec || ((m.pad > 0 || m.piano || m.bells || m.beat) ? "piano" : null)) === k;
      m.rec = on ? null : k; m.score = null; m.pad = 0; m.piano = m.bells = m.beat = false; });   // one recorded music at a time; tap again = no music
  });
  sheet.addEventListener("input", (e) => { const t = e.target; if (t.dataset && t.dataset.level) { setLevel(t.dataset.level, +t.value); const n = t.parentNode.querySelector(".ss-mn"); if (n) n.textContent = +t.value > 0 ? Math.round(t.value * 100) : ""; } });
  $("#ss-motion", sheet).addEventListener("change", (e) => { st.motion = e.target.checked; save(); if (window.TitanAmbient && window.TitanAmbient.setVisualEnabled) window.TitanAmbient.setVisualEnabled(st.motion); });
  $("#ss-tod", sheet).addEventListener("change", (e) => { st.timeAware = e.target.checked; G.setTimeAware(st.timeAware); save(); });
  $("#ss-spatial", sheet).addEventListener("change", (e) => { st.spatial = e.target.value; G.setSpatial(st.spatial); save(); });
  $("#ss-bg", sheet).addEventListener("change", (e) => { st.bgPause = e.target.checked; window.TITAN_BG_PAUSE = st.bgPause; G.setBackgroundPause(st.bgPause); save(); });
  window.addEventListener("titan:atmo", (e) => { lastAtmo = e.detail.atmo; followTheme(e.detail.atmo); render(); });
  /* each World has its own sound scene (manifest `scene`): while sound plays, a theme change crossfades to that World's mix */
  /* GRK-M-04 (2026-10-20, Joseph: "Dynasty had NO sound"): taps inside the studio never auto-start sound, and following the theme
     only worked once something was already playing, so a first visit that went straight to the Scene studio and picked a theme stayed
     silent. Now choosing a theme after any tap starts that theme's scene, unless Off was pressed (remembered) or the radio is on. */
  let gestured = false;
  ["pointerdown", "keydown"].forEach((g) => document.addEventListener(g, () => { gestured = true; }, { capture: true, once: true }));
  function followTheme(atmo) {
    if (radioOn) return;
    const w = window.TitanWorlds && window.TitanWorlds.byId(atmo);
    const id = w && w.scene && (G.ALIASES && G.ALIASES[w.scene] || w.scene);
    if (!(id && G.SCENES[id])) return;
    if (!G.isActive()) {
      if (st.userOff || !gestured) return;
      try { const c = G.ensure(); if (c && c.state !== "running") c.resume().catch(() => {}); } catch (err) { /* ignore */ }
      off(); pickScene(id, { visual: false, fade: 3 }); return;
    }
    if (st.follow === false || !G.isPlaying()) return;
    if (st.scene !== id) pickScene(id, { visual: false });
  }
  $("#ss-follow", sheet).addEventListener("change", (e) => { st.follow = e.target.checked; save(); if (st.follow) followTheme(lastAtmo); });
  window.addEventListener("titan:gen", () => { render(); });
  /* the recording now playing (wings/music-recorded.js): piece, composer, performer and license, so every recording is credited */
  window.addEventListener("titan:music", (e) => {
    const t = e.detail, n = $("#ss-now", sheet); if (!n) return;
    n.hidden = !t;
    if (t) n.textContent = `♪ ${t.title} · ${t.composer}${t.performer && t.performer !== "see source page" ? " · " + t.performer : ""} (${t.license})`;
  });

  // The bar button opens the studio (app.js binds #btn-atmo -> openAtmoSheet -> TitanScene.open).
  /* the controls the Atmosphere screen (wings/atmosphere.js) drives: the same state, saved the same way */
  const toggle = () => { if (G.isPlaying()) { G.pause(); st.wasPlaying = false; } else if (G.isPaused()) { G.resume(); st.wasPlaying = true; } else { st.userOff = false; start(2); } save(); render(); };
  const setVol = (v) => { st.vol = Math.min(1, Math.max(0, +v || 0)); G.setVolume(st.vol); if (radioOn) { try { radio.setVolume(st.vol); } catch (e) { /* ignore */ } } save(); render(); };
  const themeScene = (id) => { const w = window.TitanWorlds && window.TitanWorlds.byId(id || lastAtmo); let s = w && w.scene; if (s && G.ALIASES && G.ALIASES[s]) s = G.ALIASES[s]; return s && G.SCENES[s] ? s : null; };
  const playTheme = (id) => { const s = themeScene(id); if (s) { st.userOff = false; pickScene(s, { visual: false, fade: 2.5 }); } };
  window.TitanScene = {
    open, close, setTab, openThemes: () => open("themes"), isOpen: () => !sheet.hidden, stop: stopAll,
    state: () => clone(st), play: pickScene, scenes: () => G.SCENE_ORDER.slice(), worlds: () => G.WORLD_ORDER.slice(),
    toggle, setVolume: setVol, setLevel, themeScene, playTheme, name: sceneName
  };
  if (!st.mix && st.scene === "custom") { const m = loadMine(); if (m) st.mix = m; }
  render();

  /* Sound on by default (owner 2026-10-08: "it isn't on by default"). Browsers allow sound only after a tap, so the first tap anywhere
     starts the current theme's scene (its recordings and music) with a slow fade. Not when the owner pressed Off last time (remembered),
     not over the radio, and not when the tap was on the opening film's own sound button (the film is playing its sound then). */
  function autoStart(e) {
    const t = e && e.target;
    if (t && t.closest && t.closest(".ts-sound-hint, .ts-sound, #scene-sheet, [data-no-autosound]")) return;   // the film's sound button, or the studio itself
    off();
    if (st.userOff || G.isActive() || radioOn) return;
    // Unlock the audio inside the tap itself (iOS needs that), but start the scene only after the tap has finished: starting it renames
    // the Scene button, and a bar that shifts between press and release swallowed the very tap that started it (smoke test, Search).
    try { const c = G.ensure(); if (c && c.state !== "running") c.resume().catch(() => {}); } catch (err) { /* ignore */ }
    setTimeout(() => {
      if (st.userOff || G.isActive() || radioOn) return;
      const w = window.TitanWorlds && window.TitanWorlds.byId(lastAtmo);
      let id = w && w.scene; if (id && G.ALIASES && G.ALIASES[id]) id = G.ALIASES[id];
      if (!(id && G.SCENES[id])) id = st.scene !== "off" && st.scene !== "custom" && (G.SCENES[st.scene] || userScene(st.scene)) ? st.scene : "midnight-gallery";
      pickScene(id, { visual: false, fade: 4 });
    }, 450);
  }
  const GEST = ["pointerdown", "keydown"];
  function off() { GEST.forEach((g) => document.removeEventListener(g, autoStart, true)); }
  if (!st.userOff) GEST.forEach((g) => document.addEventListener(g, autoStart, true));
  window.TitanScene.autoStartArmed = () => !st.userOff;
})();
