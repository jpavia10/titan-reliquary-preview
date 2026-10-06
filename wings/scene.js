/* Titan Reliquary — Scene Studio (UI). One sheet for lighting (20 atmospheres), sound and music.
   Engine: wings/scene-engine.js (TitanGen, generative, offline). Internet radio (audio.js) is an optional extra.
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
  if (G.setMusicTempo && st.tempo && st.tempo !== 1) G.setMusicTempo(st.tempo);
  if (st.motion != null && window.TitanAmbient && window.TitanAmbient.setVisualEnabled) window.TitanAmbient.setVisualEnabled(!!st.motion);

  const sceneName = () => (st.scene === "custom" ? "My mix" : st.scene === "off" ? "" : userScene(st.scene) ? userScene(st.scene).name : (G.SCENES[st.scene] || { name: "" }).name);
  const sceneBtn = (id, s) => `<button type="button" class="ss-scene" data-scene="${id}" aria-pressed="false"><span class="i" aria-hidden="true">${s.icon}</span><span class="n">${esc(s.name)}</span><span class="d">${esc(s.desc)}</span></button>`;
  const mixRow = (id) => { const b = G.BEDS[id]; return `<div class="ss-mrow" data-row="${id}"><button type="button" class="ss-mi" data-bed="${id}" aria-pressed="false" aria-label="${esc(b.label)} on or off"><span aria-hidden="true">${b.icon}</span></button><label class="ss-ml" for="ss-m-${id}">${esc(b.label)}${b.kind === "event" ? '<small>now and then</small>' : ""}</label><input type="range" id="ss-m-${id}" data-level="${id}" min="0" max="1" step="0.01" aria-label="${esc(b.label)} level"><span class="ss-mn" aria-hidden="true"></span></div>`; };

  /* ---------- markup ---------- */
  const sheet = document.createElement("div");
  sheet.id = "scene-sheet"; sheet.className = "scene-sheet"; sheet.hidden = true;
  const atmoCards = [...document.querySelectorAll("#atmo-sheet .atmo-card")].map((c) => ({
    val: c.dataset.atmoVal, name: ($(".atmo-card-name", c) || {}).textContent || c.dataset.atmoVal,
    sw: ([...(($(".atmo-swatch", c) || {}).classList || [])].find((k) => k.indexOf("sw-") === 0)) || ""
  }));
  sheet.innerHTML = `
  <div class="ss-card" role="dialog" aria-modal="true" aria-labelledby="ss-title">
    <div class="ss-top">
      <div class="ss-head"><h2 class="ss-title" id="ss-title">Scene Studio</h2><button type="button" class="ss-x" id="ss-close" aria-label="Close Scene Studio">×</button></div>
      <!-- THEMES-TABS:begin -->
      <div class="ss-tabs" role="tablist" aria-label="Scene Studio sections">
        <button type="button" class="ss-tab" role="tab" id="ss-tab-scenes" data-tab="scenes" aria-controls="ss-p-scenes" aria-selected="false">Scenes</button>
        <button type="button" class="ss-tab" role="tab" id="ss-tab-themes" data-tab="themes" aria-controls="ss-p-themes" aria-selected="true">Themes</button>
        <button type="button" class="ss-tab" role="tab" id="ss-tab-sound" data-tab="sound" aria-controls="ss-p-sound" aria-selected="false">Sound</button>
      </div>
      <!-- THEMES-TABS:end -->
      <p class="ss-status" id="ss-status" role="status" aria-live="polite"></p>
      <div class="ss-master"><label for="ss-vol">Volume</label><input type="range" id="ss-vol" min="0" max="1" step="0.01" aria-label="Master volume"><span class="ss-vol-n" id="ss-vol-n"></span></div>
      <div class="ss-btnrow"><button type="button" class="ss-btn primary" id="ss-play">▶ Play</button><button type="button" class="ss-btn off" id="ss-off">■ Off</button></div>
    </div>
    <!-- THEMES-TABS:panel-scenes --><div class="ss-panel" id="ss-p-scenes" role="tabpanel" aria-labelledby="ss-tab-scenes" hidden>
    <h3 class="ss-h">Sound scenes</h3>
    <p class="ss-sub">Real recordings, layered, with soft music underneath. One tap sets the sound and the lighting.</p>
    <div class="ss-scenes" id="ss-scenes">${G.SCENE_ORDER.map((id) => sceneBtn(id, G.SCENES[id])).join("")}</div>
    <div id="ss-mine-wrap" hidden><h3 class="ss-h">My scenes</h3><div class="ss-scenes" id="ss-mine"></div></div>
    <details class="ss-details" id="ss-worlds"><summary>Sounds of the Worlds</summary><div class="in">
      <p class="ss-sub">The sound each World plays by default. Tap one to hear it on its own.</p>
      <div class="ss-scenes">${G.WORLD_ORDER.map((id) => sceneBtn(id, G.SCENES[id])).join("")}</div></div></details>
    </div><!-- /scenes panel -->
    <!-- THEMES-TABS:panel-themes --><div class="ss-panel" id="ss-p-themes" role="tabpanel" aria-labelledby="ss-tab-themes"><div id="ss-themes"></div></div>
    <!-- THEMES-TABS:panel-sound --><div class="ss-panel" id="ss-p-sound" role="tabpanel" aria-labelledby="ss-tab-sound" hidden>
    <details class="ss-details" id="ss-build"><summary>Build your own</summary><div class="in">
      <p class="ss-sub">Layer any recordings. Drag a slider up to add a sound; all the way down removes it. Saved automatically as My mix.</p>
      ${G.BED_GROUPS.map((grp) => `<h4 class="ss-gh">${esc(grp)}</h4>` + G.BED_ORDER.filter((id) => G.BEDS[id].group === grp).map(mixRow).join("")).join("")}
      <h4 class="ss-gh">Music (made live, never downloaded)</h4>
      <div class="ss-chips" id="ss-music">
        <button type="button" class="ss-chip" data-mus="pad" aria-pressed="false">Soft pads</button>
        <button type="button" class="ss-chip" data-mus="piano" aria-pressed="false">Piano</button>
        <button type="button" class="ss-chip" data-mus="bells" aria-pressed="false">Bells</button>
        <button type="button" class="ss-chip" data-mus="beat" aria-pressed="false">Lo-fi beat</button>
      </div>
      <h4 class="ss-gh">Keep this mix</h4>
      <div class="ss-savebox"><input type="text" id="ss-savename" maxlength="30" placeholder="Name this scene" aria-label="Name for the new scene"><button type="button" class="ss-btn" id="ss-save">Save as a scene</button></div>
      <div class="ss-btnrow"><button type="button" class="ss-btn" id="ss-loadmine">Load My mix</button><button type="button" class="ss-btn" id="ss-clearmix">Clear all</button></div>
      <p class="ss-note" id="ss-savemsg" role="status" aria-live="polite"></p></div></details>
    <details class="ss-details"><summary>Mix and tone</summary><div class="in">
      <div class="ss-row"><span>Music</span><input type="range" id="ss-mus" min="0" max="1" step="0.01" aria-label="Music level"></div>
      <div class="ss-row"><span>Tempo</span><input type="range" id="ss-tempo" min="0.7" max="1.4" step="0.05" aria-label="Music tempo (slower to faster)"><span class="ss-tempo-n" id="ss-tempo-n" aria-hidden="true"></span></div>
      <div class="ss-row"><span>Ambience</span><input type="range" id="ss-amb" min="0" max="1" step="0.01" aria-label="Ambience level"></div>
      <div class="ss-row"><span>Bass</span><input type="range" id="ss-bass" min="-8" max="8" step="1" aria-label="Bass"></div>
      <div class="ss-row"><span>Mid</span><input type="range" id="ss-mid" min="-8" max="8" step="1" aria-label="Mid tones"></div>
      <div class="ss-row"><span>Treble</span><input type="range" id="ss-treble" min="-8" max="8" step="1" aria-label="Treble"></div>
      <p class="ss-note">A soft limiter keeps loud moments from clipping.</p></div></details>
    <details class="ss-details" id="ss-radio-d"><summary>Internet radio (optional extra)</summary><div class="in">
      <p class="ss-sub">Needs an internet connection and may be unavailable. The sounds above always work offline.</p>
      <select id="ss-station" aria-label="Radio station"></select>
      <div class="ss-btnrow"><button type="button" class="ss-btn" id="ss-radio-play">▶ Play radio</button></div>
      <p class="ss-radio-status" id="ss-radio-status" role="status" aria-live="polite"></p></div></details>
    <details class="ss-details"><summary>Settings</summary><div class="in">
      <label class="ss-check"><input type="checkbox" id="ss-follow"><span>Sound follows the theme (each World has its own mix)</span></label>
      <label class="ss-check"><input type="checkbox" id="ss-motion"><span>Show falling rain, embers and sparks on screen</span></label>
      <label class="ss-check"><input type="checkbox" id="ss-bg"><span>Pause sound when the app is in the background</span></label>
      <p class="ss-note">By default sound keeps playing when you switch apps or lock the phone.</p>
      <label class="ss-check"><input type="checkbox" id="ss-tod"><span>Shift the sounds with the time of day (birds at dawn, quieter crowds at night)</span></label>
      <label class="ss-check"><span>Sound space</span> <select id="ss-spatial"><option value="3d">3D (headphones are best)</option><option value="stereo">Stereo</option><option value="off">Off</option></select></label>
      <div id="ss-moved"></div></div></details>
    </div><!-- /sound panel -->
  </div>`;
  document.body.appendChild(sheet);
  /* TitanFX hook (effects control in Settings) */ if (window.TitanFXUI) window.TitanFXUI.mount(sheet);
  /* TitanUISounds hook (interface sounds toggle + volume) */ if (window.TitanUISounds) window.TitanUISounds.mount(sheet);

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
  function render() {
    const playing = G.isPlaying(), paused = G.isPaused(), nm = sceneName();
    el.status.textContent =
      playing ? `Playing: ${nm}` : paused ? `Paused: ${nm}` : (nm && st.mix ? `${nm} is ready. Tap Play.` : "Silent. Pick a scene to begin.");
    el.play.textContent = playing ? "❚❚ Pause" : "▶ Play";
    el.play.disabled = !st.mix;
    el.off.disabled = !(playing || paused);
    el.vol.value = st.vol; el.volN.textContent = Math.round(st.vol * 100) + "%";
    sheet.querySelectorAll(".ss-scene").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === st.scene)));
    sheet.querySelectorAll("[data-atmo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.atmo === lastAtmo)));
    const m = st.mix || {};
    sheet.querySelectorAll(".ss-mrow").forEach((r) => {
      const id = r.dataset.row, v = (m.beds && m.beds[id]) || 0, inp = r.querySelector("input"), on = v > 0;
      r.classList.toggle("on", on); r.querySelector("[data-bed]").setAttribute("aria-pressed", String(on));
      if (document.activeElement !== inp) inp.value = v;
      r.querySelector(".ss-mn").textContent = on ? Math.round(v * 100) : "";
    });
    const mine = $("#ss-mine", sheet); $("#ss-mine-wrap", sheet).hidden = !st.mine.length;
    mine.innerHTML = st.mine.map((u) => `<div class="ss-mine-item">${sceneBtn(u.id, { icon: "★", name: u.name, desc: "Your scene" })}<button type="button" class="ss-del" data-del="${u.id}" aria-label="Remove ${esc(u.name)}">Remove</button></div>`).join("");
    sheet.querySelectorAll("[data-mus]").forEach((b) => { const k = b.dataset.mus; b.setAttribute("aria-pressed", String(k === "pad" ? m.pad > 0 : !!m[k])); });
    $("#ss-mus", sheet).value = st.mus; $("#ss-tempo", sheet).value = st.tempo || 1; $("#ss-tempo-n", sheet).textContent = Math.round((st.tempo || 1) * 100) + "%"; $("#ss-amb", sheet).value = st.amb;
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
    st.wasPlaying = true; save(); render();
  }
  function pickScene(id) {
    if (G.ALIASES && G.ALIASES[id]) id = G.ALIASES[id];
    const u = userScene(id);
    if (u) { st.scene = id; st.mix = clone(u.mix); if (u.atmo && window.TitanSetAtmo) window.TitanSetAtmo(u.atmo); saveMine(); start(2.5); return; }
    const s = G.SCENES[id]; if (!s) return;
    st.scene = id; st.mix = { beds: clone(s.beds), pad: s.pad, piano: s.piano, bells: s.bells, beat: s.beat, root: s.root, mode: s.mode, prog: s.prog, chordSec: s.chordSec, gap: s.gap, bpm: s.bpm, arc: s.arc, spat: s.spat };
    if (window.TitanSetAtmo && s.atmo && !s.world) window.TitanSetAtmo(s.atmo);   // World scenes are sound only here: the World manifest owns the lighting
    saveMine(); start(2.5);
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
  function stopAll() { G.stop(0.8); st.wasPlaying = false; st.scene = st.scene; save(); render(); }

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
    radioOn = true; G.setMusicDuck(true);       // generative music steps aside; ambient beds stay
    try { radio.setVolume(st.vol); radio.setMuted(false); radio.setStation(selSt.value); radio.play(); } catch (e) { /* ignore */ }
    renderRadio();
  });
  selSt.addEventListener("change", () => { try { radio.setStation(selSt.value); } catch (e) { /* ignore */ } });
  window.addEventListener("titan:radio", () => { renderRadio(); const s = radio.status(); if (!s.playing && !s.wantPlay && radioOn) { radioOn = false; G.setMusicDuck(false); } });

  /* THEMES-TABS:js begin ---------- tabs + Themes picker (see wings/themes/worlds.js) ---------- */
  const TAB_KEY = "titan.scene.tab";
  const card = $(".ss-card", sheet), themesEl = $("#ss-themes", sheet);
  let tab = "themes";
  try { const t = localStorage.getItem(TAB_KEY); if (t === "scenes" || t === "sound") tab = t; } catch (e) { /* ignore */ }
  function setTab(t, focus) {
    if (t !== "scenes" && t !== "themes" && t !== "sound") t = "themes";
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
    const order = ["scenes", "themes", "sound"], i = order.indexOf(tab);
    setTab(order[(i + (e.key === "ArrowRight" ? 1 : 2)) % 3], true); e.preventDefault();
  });
  themesEl.addEventListener("click", (e) => {
    const b = e.target.closest(".th-card"); if (!b || !window.TitanWorlds) return;
    lastAtmo = b.dataset.world; window.TitanWorlds.apply(b.dataset.world);
    themesEl.querySelectorAll(".th-card").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    render();
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
  bind("#ss-tempo", (v) => { st.tempo = v; $("#ss-tempo-n", sheet).textContent = Math.round(v * 100) + "%"; if (G.setMusicTempo) G.setMusicTempo(v); });
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
    else if (b.dataset.mus) customise((m) => { const k = b.dataset.mus; if (k === "pad") m.pad = m.pad > 0 ? 0 : 0.6; else { m[k] = !m[k]; if (k === "beat" && m.beat && !m.bpm) m.bpm = 74; } });
  });
  sheet.addEventListener("input", (e) => { const t = e.target; if (t.dataset && t.dataset.level) { setLevel(t.dataset.level, +t.value); const n = t.parentNode.querySelector(".ss-mn"); if (n) n.textContent = +t.value > 0 ? Math.round(t.value * 100) : ""; } });
  $("#ss-motion", sheet).addEventListener("change", (e) => { st.motion = e.target.checked; save(); if (window.TitanAmbient && window.TitanAmbient.setVisualEnabled) window.TitanAmbient.setVisualEnabled(st.motion); });
  $("#ss-tod", sheet).addEventListener("change", (e) => { st.timeAware = e.target.checked; G.setTimeAware(st.timeAware); save(); });
  $("#ss-spatial", sheet).addEventListener("change", (e) => { st.spatial = e.target.value; G.setSpatial(st.spatial); save(); });
  $("#ss-bg", sheet).addEventListener("change", (e) => { st.bgPause = e.target.checked; window.TITAN_BG_PAUSE = st.bgPause; G.setBackgroundPause(st.bgPause); save(); });
  window.addEventListener("titan:atmo", (e) => { lastAtmo = e.detail.atmo; followTheme(e.detail.atmo); render(); });
  /* each World has its own sound scene (manifest `scene`): while sound plays, a theme change crossfades to that World's mix */
  function followTheme(atmo) {
    if (st.follow === false || radioOn || !G.isPlaying()) return;
    const w = window.TitanWorlds && window.TitanWorlds.byId(atmo);
    const id = w && w.scene && (G.ALIASES && G.ALIASES[w.scene] || w.scene);
    if (id && G.SCENES[id] && st.scene !== id) pickScene(id);
  }
  $("#ss-follow", sheet).addEventListener("change", (e) => { st.follow = e.target.checked; save(); if (st.follow) followTheme(lastAtmo); });
  window.addEventListener("titan:gen", () => { render(); });

  // The bar button opens the studio (app.js binds #btn-atmo -> openAtmoSheet -> TitanScene.open).
  window.TitanScene = {
    open, close, setTab, openThemes: () => open("themes"), isOpen: () => !sheet.hidden, stop: stopAll,
    state: () => clone(st), play: pickScene, scenes: () => G.SCENE_ORDER.slice(), worlds: () => G.WORLD_ORDER.slice()
  };
  if (!st.mix && st.scene === "custom") { const m = loadMine(); if (m) st.mix = m; }
  render();
})();
