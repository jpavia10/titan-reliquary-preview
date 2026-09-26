/* Titan Reliquary — music station player (v2).
   Twelve stations live in js/playlist.js (TITAN_STATIONS): Lofi, Classical, Epic,
   Jazz, Adventure, Dark, Psych, Abyss, Synthwave, Quiet, Construct, Xeno. Tracks are HOTLINKED mp3s (Kevin MacLeod,
   incompetech.com, CC-BY 4.0 — credit shown in the player UI); they are not
   committed to the repo and will not work offline (see CHANGELOG.md).
   Rain/ambience is separate (ambient.js), so music and rain mix.
   The floating pill always names the current station — it never says "lofi"
   when another station is playing. The station can be changed manually from
   the player bar's station menu, or programmatically via TitanLofi.playStation. */
(() => {
  "use strict";

  const VOL_KEY = "tr_lofi_vol_v1";
  const STATION_KEY = "tr_music_station_v1";
  const TRACK_KEY = "tr_music_track_v3"; // per-station: "<station>::<idx>::<title>"
  const AUTO_KEY = "tr_lofi_autoplay_v1";

  const stations = window.TITAN_STATIONS || {};
  const order = window.TITAN_STATION_ORDER || Object.keys(stations);
  const valid = order.filter((k) => stations[k] && stations[k].tracks && stations[k].tracks.length);
  if (!valid.length) return; // stations missing: stay silent, no UI

  let stationKey = "lofi";
  try {
    const s = localStorage.getItem(STATION_KEY);
    if (s && valid.includes(s)) stationKey = s;
  } catch { /* ignore */ }

  const tracks = () => stations[stationKey].tracks;
  let idx = 0;
  let audio = new Audio();
  audio.preload = "none";
  let playing = false;
  let skipGuard = 0;
  let collapsed = false;
  let everPlayed = false;

  // ---- state -------------------------------------------------------------
  function readNum(key, dflt) {
    try { const v = parseFloat(localStorage.getItem(key)); return Number.isFinite(v) ? v : dflt; } catch { return dflt; }
  }
  function readTrack() {
    const list = tracks();
    try {
      // v3 per-station key first
      const raw = localStorage.getItem(TRACK_KEY);
      if (raw) {
        const parts = raw.split("::");
        if (parts[0] === stationKey && parts.length >= 3) {
          const i = parseInt(parts[1], 10);
          const title = parts.slice(2).join("::");
          if (Number.isInteger(i)) {
            const clamped = Math.min(Math.max(0, i), list.length - 1);
            if (title && list[clamped] && list[clamped].title !== title) {
              const moved = list.findIndex((t) => t.title === title);
              return moved >= 0 ? moved : 0;
            }
            return clamped;
          }
        }
      }
      // one-time migration from the old lofi-only keys
      if (stationKey === "lofi") {
        const old = localStorage.getItem("tr_lofi_track_v2");
        if (old) {
          const sep = old.lastIndexOf("::");
          const i = parseInt(sep > 0 ? old.slice(0, sep) : old, 10);
          if (Number.isInteger(i)) return Math.min(Math.max(0, i), list.length - 1);
        }
      }
    } catch { /* ignore */ }
    return 0;
  }
  function writeTrack() {
    try {
      const t = tracks()[idx];
      localStorage.setItem(TRACK_KEY, `${stationKey}::${idx}::${(t && t.title) || ""}`);
    } catch { /* ignore */ }
  }
  function writeStation() {
    try { localStorage.setItem(STATION_KEY, stationKey); } catch { /* ignore */ }
  }
  idx = readTrack();
  audio.volume = Math.min(1, Math.max(0, readNum(VOL_KEY, 0.6)));

  // Mobile Safari: resume an AudioContext on first touch (music itself uses <audio>).
  let ac = null;
  function ensureCtx() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ac) ac = new AC();
      if (ac.state === "suspended") ac.resume().catch(() => {});
    } catch { /* ignore */ }
  }
  document.addEventListener("touchstart", ensureCtx, { passive: true, once: false });
  document.addEventListener("pointerdown", ensureCtx, { passive: true });

  // ---- UI ----------------------------------------------------------------
  const bar = document.createElement("div");
  bar.className = "lofi-bar";
  bar.hidden = true;
  bar.setAttribute("aria-label", "Music player");
  bar.innerHTML = `
    <div class="lofi-row">
      <button type="button" class="lofi-btn" data-act="prev" aria-label="Previous track" title="Previous">⏮</button>
      <button type="button" class="lofi-btn lofi-play" data-act="play" aria-label="Play or pause" title="Play/Pause">▶</button>
      <button type="button" class="lofi-btn" data-act="next" aria-label="Next track" title="Next">⏭</button>
      <button type="button" class="lofi-stationbtn" data-act="station" aria-label="Change station" title="Change station"><span class="ls-dot" aria-hidden="true"></span><span id="lofi-station">Lofi</span><span class="ls-caret" aria-hidden="true">▾</span></button>
      <div class="lofi-now"><div class="t" id="lofi-title">—</div><div class="a" id="lofi-artist">—</div></div>
      <div class="lofi-vol">
        <input type="range" id="lofi-vol" min="0" max="1" step="0.01" value="${audio.volume}" aria-label="Music volume" />
      </div>
      <button type="button" class="lofi-btn" data-act="ambience" aria-label="Ambient sounds" title="Ambient sounds — rain, fire, storms and more">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="6" y1="3" x2="6" y2="21" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="18" y1="3" x2="18" y2="21" />
          <circle cx="6" cy="14" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="8" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="18" cy="16" r="2.6" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button type="button" class="lofi-collapse" data-act="collapse" aria-label="Collapse player" title="Collapse">–</button>
    </div>
    <div class="station-menu" id="station-menu" hidden role="menu" aria-label="Music stations"></div>
    <div class="lofi-meta">
      <span class="lofi-credit" id="lofi-credit"></span>
      <span id="lofi-count"></span>
    </div>`;
  document.body.appendChild(bar);

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "lofi-pill";
  pill.hidden = true;
  pill.innerHTML = `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span id="music-pill-label">Set the scene</span>`;
  document.body.appendChild(pill);

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.hidden = true;
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  let toastT = null;
  function say(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { toast.hidden = true; }, 3500);
  }

  const btnPlay = bar.querySelector('[data-act="play"]');
  const elTitle = bar.querySelector("#lofi-title");
  const elArtist = bar.querySelector("#lofi-artist");
  const elStation = bar.querySelector("#lofi-station");
  const elCredit = bar.querySelector("#lofi-credit");
  const elCount = bar.querySelector("#lofi-count");
  const elPillLabel = pill.querySelector("#music-pill-label");
  const volInput = bar.querySelector("#lofi-vol");
  const btnCollapse = bar.querySelector('[data-act="collapse"]');
  const stationMenu = bar.querySelector("#station-menu");

  function stationName() { return stations[stationKey].name; }
  function showBar() { bar.hidden = false; }
  function hidePill() { pill.hidden = true; }
  function showPill() { pill.hidden = false; }

  // Tuck the floating player chrome behind overlays (dossier, palette, sheets)
  // so it never covers overlay content; restore exactly what was showing after.
  let tucked = false, pillWasShown = false, barWasShown = false;
  window.addEventListener("titan:overlay", (e) => {
    if (e.detail && e.detail.open) {
      if (tucked) return;
      tucked = true;
      pillWasShown = !pill.hidden;
      barWasShown = !bar.hidden;
      pill.hidden = true;
      bar.hidden = true;
    } else if (tucked) {
      tucked = false;
      if (pillWasShown) pill.hidden = false;
      if (barWasShown) bar.hidden = false;
    }
  });

  function updatePill() {
    const t = tracks()[idx];
    if (playing) {
      elPillLabel.textContent = `♪ ${stationName()} · ${t.title || "Untitled"}`;
      pill.classList.add("live");
    } else if (everPlayed) {
      elPillLabel.textContent = `❚❚ ${stationName()} — set the scene`;
      pill.classList.remove("live");
    } else {
      elPillLabel.textContent = `Set the scene · ${valid.length} stations`;
      pill.classList.remove("live");
    }
    pill.setAttribute("aria-label", elPillLabel.textContent);
  }

  function updateNowPlaying() {
    const list = tracks();
    const t = list[idx];
    elTitle.textContent = t.title || "Untitled";
    elTitle.title = t.title || "";
    elArtist.textContent = t.artist || "";
    elArtist.title = t.artist || "";
    elStation.textContent = stationName();
    elCount.textContent = `${idx + 1} / ${list.length}`;
    elCredit.textContent = t.license === "CC-BY" && t.credit ? t.credit : (t.license ? `© ${t.artist} · ${t.license}` : "");
    btnPlay.textContent = playing ? "⏸" : "▶";
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    const stBtn = bar.querySelector('[data-act="station"]');
    if (stBtn) stBtn.setAttribute("data-station", stationKey);
    updatePill();
  }

  function loadTrack(i, autoplay) {
    const list = tracks();
    idx = (i + list.length) % list.length;
    skipGuard = 0;
    audio.src = list[idx].url;
    audio.preload = "auto";
    writeTrack();
    updateNowPlaying();
    if (autoplay) play();
  }

  async function play() {
    ensureCtx();
    if (!audio.src) loadTrack(idx, false);
    try {
      await audio.play();
    } catch (e) {
      // Autoplay blocked (or network hiccup): show the station pill.
      playing = false;
      updateNowPlaying();
      showPill();
      return;
    }
    playing = true;
    everPlayed = true;
    hidePill();
    showBar();
    updateNowPlaying();
  }
  function pause() {
    audio.pause();
    playing = false;
    updateNowPlaying();
  }
  function toggle() { (playing ? pause() : play()); }
  function next() { loadTrack(idx + 1, playing); }
  function prev() { loadTrack(idx - 1, playing); }

  function setStation(key, autoplay) {
    if (!valid.includes(key) || key === stationKey) {
      if (key === stationKey) { renderStationMenu(); stationMenu.hidden = true; }
      return;
    }
    const wasPlaying = playing;
    pause();
    stationKey = key;
    writeStation();
    idx = readTrack();
    renderStationMenu();
    stationMenu.hidden = true;
    // Fresh <audio> src for the new station; keep the bar visible context.
    audio.removeAttribute("src");
    audio.preload = "none";
    loadTrack(idx, false);
    say(`Station: ${stationName()} — ${stations[key].tag}`);
    if (autoplay || wasPlaying) play();
    else { showBar(); }
  }
  function playStation(key) {
    setStation(key, true);
    if (stationKey === key && !playing) play();
  }

  function renderStationMenu() {
    stationMenu.innerHTML = valid.map((k) => `
      <button type="button" role="menuitemradio" aria-checked="${k === stationKey}" class="station-opt${k === stationKey ? " current" : ""}" data-station="${k}">
        <span class="so-dot" aria-hidden="true"></span>
        <span class="so-name">${stations[k].name}</span>
        <span class="so-tag">${stations[k].tag || ""}</span>
      </button>`).join("");
  }

  audio.addEventListener("ended", () => { loadTrack(idx + 1, true); });
  audio.addEventListener("play", () => { playing = true; updateNowPlaying(); });
  audio.addEventListener("pause", () => { playing = false; updateNowPlaying(); });
  audio.addEventListener("error", () => {
    // Dead track: skip gracefully. If the whole station fails, stop and say so.
    const list = tracks();
    skipGuard += 1;
    if (skipGuard >= list.length) {
      pause();
      say(`${stationName()}: every track failed to load — check your connection`);
      return;
    }
    const t = list[idx];
    say(`Skipped a dead track (${t.title || "untitled"})`);
    loadTrack(idx + 1, playing);
  });

  bar.addEventListener("click", (e) => {
    const opt = e.target.closest(".station-opt[data-station]");
    if (opt) {
      setStation(opt.dataset.station, true);
      stationMenu.hidden = true;
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "play") toggle();
    else if (act === "next") next();
    else if (act === "prev") prev();
    else if (act === "station") {
      renderStationMenu();
      stationMenu.hidden = !stationMenu.hidden;
    } else if (act === "collapse") {
      collapsed = !collapsed;
      bar.classList.toggle("collapsed", collapsed);
      b.textContent = collapsed ? "＋" : "–";
      b.setAttribute("aria-label", collapsed ? "Expand player" : "Collapse player");
    } else if (act === "ambience") {
      try { window.TitanAmbient?.openMixer(); } catch { /* ambience not ready */ }
    }
  });
  // Tapping outside the station menu closes it.
  document.addEventListener("pointerdown", (e) => {
    if (!stationMenu.hidden && !e.target.closest(".station-menu") && !e.target.closest('[data-act="station"]')) {
      stationMenu.hidden = true;
    }
  }, { passive: true });
  volInput.addEventListener("input", () => {
    audio.volume = parseFloat(volInput.value);
    try { localStorage.setItem(VOL_KEY, String(audio.volume)); } catch { /* ignore */ }
  });
  // Pill toggles play/pause; it always names the live station.
  // If first interaction, trigger the full 'Set the scene' atmosphere experience.
  pill.addEventListener("click", () => {
    if (!playing && !everPlayed && typeof window.setTheScene === "function") {
      const cur = document.documentElement.getAttribute("data-atmo") || "afterhours";
      window.setTheScene(cur);
    } else {
      toggle();
    }
  });

  // ---- boot --------------------------------------------------------------
  renderStationMenu();
  updateNowPlaying();
  loadTrack(idx, false);
  showPill();
  audio.addEventListener("play", () => { try { localStorage.setItem(AUTO_KEY, "1"); } catch { /* ignore */ } });
  audio.addEventListener("pause", () => {
    try { localStorage.setItem(AUTO_KEY, playing ? "1" : "0"); } catch { /* ignore */ }
  });
  // Public hooks: atmosphere system ("Set the scene") + manual station control.
  // TitanLofi keeps its v1 shape so older callers still work.
  window.TitanLofi = {
    play, pause, toggle,
    isPlaying: () => playing,
    playStation,
    setStation: (k) => setStation(k, playing),
    station: () => stationKey,
    stations: () => valid.map((k) => ({ key: k, name: stations[k].name, tag: stations[k].tag })),
  };
})();
