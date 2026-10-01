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

  const DEF = { scene: "off", mix: null, vol: 0.55, mus: 0.9, amb: 0.9, bass: 0, mid: 0, treble: 0, motion: null, bgPause: false };
  let st = clone(DEF);
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ }
  if (st.scene !== "off" && st.scene !== "custom" && !G.SCENES[st.scene]) st.scene = "off";
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };

  window.TITAN_BG_PAUSE = !!st.bgPause;
  G.setBackgroundPause(st.bgPause);
  G.setVolume(st.vol); G.setLevels(st.mus, st.amb); G.setTone(st.bass, st.mid, st.treble);
  if (st.motion != null && window.TitanAmbient && window.TitanAmbient.setVisualEnabled) window.TitanAmbient.setVisualEnabled(!!st.motion);

  const sceneName = () => (st.scene === "custom" ? "Custom mix" : st.scene === "off" ? "" : G.SCENES[st.scene].name);

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
      <p class="ss-status" id="ss-status" role="status" aria-live="polite"></p>
      <div class="ss-master"><label for="ss-vol">Volume</label><input type="range" id="ss-vol" min="0" max="1" step="0.01" aria-label="Master volume"><span class="ss-vol-n" id="ss-vol-n"></span></div>
      <div class="ss-btnrow"><button type="button" class="ss-btn primary" id="ss-play">▶ Play</button><button type="button" class="ss-btn off" id="ss-off">■ Off</button></div>
    </div>
    <h3 class="ss-h">Pick a scene</h3>
    <p class="ss-sub">One tap sets the lighting, the sounds and the music together.</p>
    <div class="ss-scenes" id="ss-scenes">${G.SCENE_ORDER.map((id) => { const s = G.SCENES[id]; return `<button type="button" class="ss-scene" data-scene="${id}" aria-pressed="false"><span class="i" aria-hidden="true">${s.icon}</span><span class="n">${esc(s.name)}</span><span class="d">${esc(s.desc)}</span></button>`; }).join("")}</div>
    <h3 class="ss-h">Lighting</h3>
    <div class="ss-chips" id="ss-atmos">${atmoCards.map((a) => `<button type="button" class="ss-chip" data-atmo="${a.val}" aria-pressed="false"><span class="sw ${a.sw}" aria-hidden="true"></span>${esc(a.name)}</button>`).join("")}</div>
    <details class="ss-details" id="ss-build"><summary>Build your own sound</summary><div class="in">
      <p class="ss-sub">Tap to switch each sound on or off.</p>
      <div class="ss-chips" id="ss-beds">${G.BED_ORDER.map((id) => `<button type="button" class="ss-chip" data-bed="${id}" aria-pressed="false"><span aria-hidden="true">${G.BEDS[id].icon}</span>${esc(G.BEDS[id].label)}</button>`).join("")}</div>
      <h3 class="ss-h">Music (made live, never downloaded)</h3>
      <div class="ss-chips" id="ss-music">
        <button type="button" class="ss-chip" data-mus="pad" aria-pressed="false">Soft pads</button>
        <button type="button" class="ss-chip" data-mus="piano" aria-pressed="false">Piano</button>
        <button type="button" class="ss-chip" data-mus="bells" aria-pressed="false">Bells</button>
        <button type="button" class="ss-chip" data-mus="beat" aria-pressed="false">Lo-fi beat</button>
      </div></div></details>
    <details class="ss-details"><summary>Mix and tone</summary><div class="in">
      <div class="ss-row"><span>Music</span><input type="range" id="ss-mus" min="0" max="1" step="0.01" aria-label="Music level"></div>
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
      <label class="ss-check"><input type="checkbox" id="ss-motion"><span>Show falling rain, embers and sparks on screen</span></label>
      <label class="ss-check"><input type="checkbox" id="ss-bg"><span>Pause sound when the app is in the background</span></label>
      <p class="ss-note">By default sound keeps playing when you switch apps or lock the phone.</p>
      <div id="ss-moved"></div></div></details>
  </div>`;
  document.body.appendChild(sheet);
  /* TitanFX hook (effects control in Settings) */ if (window.TitanFXUI) window.TitanFXUI.mount(sheet);

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
    sheet.querySelectorAll("[data-bed]").forEach((b) => b.setAttribute("aria-pressed", String(!!(m.beds && m.beds[b.dataset.bed] > 0))));
    sheet.querySelectorAll("[data-mus]").forEach((b) => { const k = b.dataset.mus; b.setAttribute("aria-pressed", String(k === "pad" ? m.pad > 0 : !!m[k])); });
    $("#ss-mus", sheet).value = st.mus; $("#ss-amb", sheet).value = st.amb;
    $("#ss-bass", sheet).value = st.bass; $("#ss-mid", sheet).value = st.mid; $("#ss-treble", sheet).value = st.treble;
    const mo = $("#ss-motion", sheet); mo.checked = st.motion == null ? !!(window.TitanAmbient && window.TitanAmbient.visualEnabled && window.TitanAmbient.visualEnabled()) : !!st.motion;
    $("#ss-bg", sheet).checked = !!st.bgPause;
    if (barBtn) { barBtn.classList.toggle("is-playing", playing); }
    if (barName) barName.textContent = (playing || paused) && nm ? nm : (document.documentElement.getAttribute("data-atmo") ? atmoName(lastAtmo) : "Lighting");
    if (barBtn) barBtn.setAttribute("aria-label", `Scene Studio. ${playing ? "Playing " + nm : "Silent"}. Lighting: ${atmoName(lastAtmo)}`);
  }
  function atmoName(v) { const a = atmoCards.find((c) => c.val === v); return a ? a.name : v; }

  function start(fade) {
    if (!st.mix) return;
    if (radioOn) stopRadio();
    const ok = G.play(mixNow(), { name: sceneName(), fade: fade == null ? 2.5 : fade });
    if (!ok) el.status.textContent = "This browser cannot make sound.";
    st.wasPlaying = true; save(); render();
  }
  function pickScene(id) {
    const s = G.SCENES[id]; if (!s) return;
    st.scene = id; st.mix = { beds: clone(s.beds), pad: s.pad, piano: s.piano, bells: s.bells, beat: s.beat, root: s.root, mode: s.mode, prog: s.prog, chordSec: s.chordSec, gap: s.gap, bpm: s.bpm };
    if (window.TitanSetAtmo && s.atmo) window.TitanSetAtmo(s.atmo);
    start(3);
  }
  function customise(fn) {
    if (!st.mix) st.mix = { beds: {}, pad: 0, piano: false, bells: false, beat: false, root: "D", mode: "dorian", prog: [0, 4, 3, 1], chordSec: 14, gap: [5, 10], bpm: 74 };
    fn(st.mix); st.scene = "custom"; start(1.2);
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

  /* ---------- events ---------- */
  let last = null;
  function open() {
    if (!sheet.hidden) return;
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
  bind("#ss-amb", (v) => { st.amb = v; G.setLevels(null, v); });
  const tone = () => G.setTone(st.bass, st.mid, st.treble);
  bind("#ss-bass", (v) => { st.bass = v; tone(); }); bind("#ss-mid", (v) => { st.mid = v; tone(); }); bind("#ss-treble", (v) => { st.treble = v; tone(); });
  sheet.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.scene) pickScene(b.dataset.scene);
    else if (b.dataset.atmo) { if (window.TitanSetAtmo) window.TitanSetAtmo(b.dataset.atmo); lastAtmo = b.dataset.atmo; render(); }
    else if (b.dataset.bed) customise((m) => { m.beds = m.beds || {}; const id = b.dataset.bed; if (m.beds[id] > 0) delete m.beds[id]; else m.beds[id] = G.BEDS[id].level; });
    else if (b.dataset.mus) customise((m) => { const k = b.dataset.mus; if (k === "pad") m.pad = m.pad > 0 ? 0 : 0.6; else { m[k] = !m[k]; if (k === "beat" && m.beat && !m.bpm) m.bpm = 74; } });
  });
  $("#ss-motion", sheet).addEventListener("change", (e) => { st.motion = e.target.checked; save(); if (window.TitanAmbient && window.TitanAmbient.setVisualEnabled) window.TitanAmbient.setVisualEnabled(st.motion); });
  $("#ss-bg", sheet).addEventListener("change", (e) => { st.bgPause = e.target.checked; window.TITAN_BG_PAUSE = st.bgPause; G.setBackgroundPause(st.bgPause); save(); });
  window.addEventListener("titan:atmo", (e) => { lastAtmo = e.detail.atmo; render(); });
  window.addEventListener("titan:gen", () => { render(); });

  // The bar button opens the studio (app.js binds #btn-atmo -> openAtmoSheet -> TitanScene.open).
  window.TitanScene = {
    open, close, isOpen: () => !sheet.hidden, stop: stopAll,
    state: () => clone(st), play: pickScene, scenes: () => G.SCENE_ORDER.slice()
  };
  render();
})();
