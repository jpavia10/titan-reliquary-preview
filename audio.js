/* Titan Reliquary — music station player (v3).
   Twenty stations live in js/playlist.js (TITAN_STATIONS). Tracks are HOTLINKED mp3s
   (Kevin MacLeod / incompetech.com and Jason Shaw / audionautix.com, CC-BY 4.0 —
   credit shown in the player UI); they are not committed to the repo and will not
   work offline (see CHANGELOG.md).
   Rain/ambience is separate (ambient.js), so music and rain mix.
   The floating pill always names the current station — it never says "lofi"
   when another station is playing. The station can be changed manually from
   the player bar's station menu, or programmatically via TitanLofi.playStation.

   v3 (FX & Sound pass) — dead-track handling:
   - Nothing is fetched until the user asks for music (no boot-time preload).
   - A track that errors, or has not started after LOAD_TIMEOUT, is skipped silently.
     After MAX_STREAK dead tracks in a row (or when the browser is offline) the
     player STOPS and shows "Radio unavailable" — it never loops.
   - At most ONE toast per skip run ("Skipped N unavailable tracks").
   - Tracks that failed while the network was demonstrably fine (a later track
     played) are remembered for DEAD_TTL in localStorage and skipped without a request.
   - TitanLofi.audit() probes a station in the browser and lists dead URLs.
   - Global mute (persisted) shared with ambient.js via the "titan:mute" event. */
(() => {
  "use strict";

  const VOL_KEY = "tr_lofi_vol_v1";
  const MUTE_KEY = "tr_mute_v1";
  const STATION_KEY = "tr_music_station_v1";
  const TRACK_KEY = "tr_music_track_v3"; // per-station: "<station>::<idx>::<title>"
  const AUTO_KEY = "tr_lofi_autoplay_v1";
  const DEAD_KEY = "tr_music_dead_v1";   // { url: epoch ms } tracks that failed while online
  const DEAD_TTL = 24 * 3600 * 1000;     // re-probe a "dead" track after a day
  const MAX_STREAK = 5;                  // dead tracks in a row before we stop and say so
  const LOAD_TIMEOUT = 20000;            // a track that has not started by then counts as dead

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
  const wrap = (i, n) => ((i % n) + n) % n;
  let idx = 0;
  const audio = new Audio();
  audio.preload = "none";
  let wantPlay = false;    // what the listener asked for (drives the ▶/⏸ button)
  let playing = false;     // the element is actually producing sound
  let collapsed = false;
  let everPlayed = false;
  let attachedKey = "";    // "<station>::<idx>" currently loaded into <audio>, "" = nothing
  let streak = 0;          // consecutive failures in this run
  let skipped = [];        // titles skipped in this run (for the one summary toast)
  let pendingDead = [];    // urls that failed in this run; committed only if a later track plays
  let radioDown = "";      // "" | "offline" | "unreachable"
  let watchdog = 0;
  let lastDownToast = 0;
  let duck = 1;            // 0..1 multiplier used by the ambient sleep timer

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

  // Volume + mute persist. (iOS ignores element.volume — the hardware buttons rule there.)
  let vol = Math.min(1, Math.max(0, readNum(VOL_KEY, 0.6)));
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* ignore */ }
  function applyVolume() {
    audio.volume = Math.min(1, Math.max(0, vol * duck));
    audio.muted = muted;
  }
  applyVolume();

  // Dead-track memory (pruned by TTL on load).
  let dead = {};
  try {
    const raw = JSON.parse(localStorage.getItem(DEAD_KEY) || "{}");
    const now = Date.now();
    for (const u of Object.keys(raw || {})) if (now - raw[u] < DEAD_TTL) dead[u] = raw[u];
  } catch { dead = {}; }
  function saveDead() { try { localStorage.setItem(DEAD_KEY, JSON.stringify(dead)); } catch { /* ignore */ } }
  const isDead = (t) => !!dead[t.url];

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
        <button type="button" class="lofi-mute" data-act="mute" aria-label="Mute all sound" aria-pressed="false" title="Mute / unmute all sound" style="appearance:none;border:0;background:none;color:var(--gold-soft);cursor:pointer;padding:0;width:28px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path class="mute-waves" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
            <path class="mute-slash" d="M16 9l6 6M22 9l-6 6" display="none" />
          </svg>
        </button>
        <input type="range" id="lofi-vol" min="0" max="1" step="0.01" value="${vol}" aria-label="Music volume" />
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
  const isMobileScreen = typeof window !== "undefined" && window.innerWidth <= 600;
  if (isMobileScreen) {
    collapsed = true;
    bar.classList.add("collapsed");
    const colBtn = bar.querySelector('[data-act="collapse"]');
    if (colBtn) {
      colBtn.textContent = "＋";
      colBtn.setAttribute("aria-label", "Expand player");
    }
  }
  document.body.appendChild(bar);

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "lofi-pill";
  pill.hidden = true;
  pill.innerHTML = `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span id="music-pill-label">Set the scene</span>`;
  document.body.appendChild(pill);

  // No toasts from the radio: notes go to the Scene Studio's inline status line (event "titan:radio").
  let lastNote = "";
  function say(msg) { lastNote = msg; emitRadio(); }
  function emitRadio() {
    try { window.dispatchEvent(new CustomEvent("titan:radio", { detail: radioStatus() })); } catch { /* ignore */ }
  }
  function radioStatus() {
    const t = tracks()[idx] || {};
    return { playing, wantPlay, down: radioDown, station: stationKey, stationName: stationName(), title: t.title || "", artist: t.artist || "", note: radioDown ? DOWN_MSG[radioDown].replace("⚠ ", "") : lastNote };
  }
  function setMediaSession() {
    if (!("mediaSession" in navigator)) return;
    try {
      const t = tracks()[idx] || {};
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title || "Internet radio", artist: t.artist || "Titan Reliquary", album: stationName(), artwork: [{ src: "icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] });
      navigator.mediaSession.setActionHandler("play", () => { play(); });
      navigator.mediaSession.setActionHandler("pause", () => { pause(); });
    } catch { /* unsupported */ }
  }

  const btnPlay = bar.querySelector('[data-act="play"]');
  const btnMute = bar.querySelector('[data-act="mute"]');
  const elTitle = bar.querySelector("#lofi-title");
  const elArtist = bar.querySelector("#lofi-artist");
  const elStation = bar.querySelector("#lofi-station");
  const elCredit = bar.querySelector("#lofi-credit");
  const elCount = bar.querySelector("#lofi-count");
  const elPillLabel = pill.querySelector("#music-pill-label");
  const volInput = bar.querySelector("#lofi-vol");
  const stationMenu = bar.querySelector("#station-menu");

  let tucked = false, pillWasShown = false, barWasShown = false;
  function stationName() { return stations[stationKey].name; }
  // While an overlay is open the chrome stays tucked away; these remember what to restore.
  function showBar() { if (tucked) barWasShown = true; else bar.hidden = false; }
  function hidePill() { if (tucked) pillWasShown = false; else pill.hidden = true; }
  function showPill() { if (tucked) pillWasShown = true; else pill.hidden = false; }

  // Tuck the floating player chrome behind overlays (dossier, palette, sheets)
  // so it never covers overlay content; restore exactly what was showing after.
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

  const DOWN_MSG = {
    offline: "⚠ Radio unavailable offline. Reconnect, then tap Play radio.",
    unreachable: "⚠ Radio unavailable right now. Tap Play radio to retry.",
  };

  function updatePill() {
    const t = tracks()[idx];
    if (radioDown) {
      elPillLabel.textContent = radioDown === "offline" ? "Radio unavailable offline" : "Radio unavailable";
      pill.classList.remove("live");
    } else if (playing) {
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

  function updateMuteUi() {
    btnMute.setAttribute("aria-pressed", String(muted));
    btnMute.setAttribute("aria-label", muted ? "Unmute all sound" : "Mute all sound");
    btnMute.querySelector(".mute-waves").setAttribute("display", muted ? "none" : "inline");
    btnMute.querySelector(".mute-slash").setAttribute("display", muted ? "inline" : "none");
  }

  function updateNowPlaying() {
    const list = tracks();
    const t = list[idx];
    elTitle.textContent = t.title || "Untitled";
    elTitle.title = t.title || "";
    const artist = radioDown ? DOWN_MSG[radioDown] : (t.artist || "");
    elArtist.textContent = artist;
    elArtist.title = artist;
    elStation.textContent = stationName();
    elCount.textContent = `${idx + 1} / ${list.length}`;
    elCredit.textContent = radioDown ? DOWN_MSG[radioDown]
      : (t.license === "CC-BY" && t.credit ? t.credit : (t.license ? `© ${t.artist} · ${t.license}` : ""));
    btnPlay.textContent = wantPlay ? "⏸" : "▶";
    btnPlay.setAttribute("aria-label", wantPlay ? "Pause" : "Play");
    const stBtn = bar.querySelector('[data-act="station"]');
    if (stBtn) stBtn.setAttribute("data-station", stationKey);
    updateMuteUi();
    updatePill();
    emitRadio();
  }

  // ---- playback ----------------------------------------------------------
  function clearWatchdog() { clearTimeout(watchdog); watchdog = 0; }
  function armWatchdog() {
    clearWatchdog();
    watchdog = setTimeout(() => { watchdog = 0; if (wantPlay && !playing) trackFailed(); }, LOAD_TIMEOUT);
  }

  // Point <audio> at the current track (the ONLY place a network request starts).
  function attach() {
    const key = stationKey + "::" + idx;
    if (attachedKey === key && audio.getAttribute("src")) return;
    attachedKey = key;
    audio.src = tracks()[idx].url;
    audio.preload = "auto";
  }
  // Drop the loaded track so nothing buffers in the background.
  function detach() {
    clearWatchdog();
    try { audio.pause(); } catch { /* ignore */ }
    audio.removeAttribute("src");
    try { audio.load(); } catch { /* ignore */ }
    attachedKey = "";
  }
  function selectTrack(i) {
    idx = wrap(i, tracks().length);
    writeTrack();
    if (!wantPlay) detach();
    updateNowPlaying();
  }
  // First non-dead track at/after `from` in direction `dir`; -1 when every track is known dead.
  function nextPlayable(from, dir = 1) {
    const list = tracks(), n = list.length;
    for (let k = 0; k < n; k++) {
      const j = wrap(from + k * dir, n);
      if (!isDead(list[j])) return j;
    }
    return -1;
  }
  function resetRun() { streak = 0; skipped = []; pendingDead = []; }

  function setRadioDown(reason) {
    radioDown = reason || "";
    bar.classList.toggle("radio-down", !!radioDown);
  }
  function goDown(reason) {
    wantPlay = false; playing = false;
    clearWatchdog();
    try { audio.pause(); } catch { /* ignore */ }
    resetRun();          // network trouble: do not blame individual tracks
    setRadioDown(reason);
    showBar(); hidePill();
    updateNowPlaying();
    const now = Date.now();
    if (now - lastDownToast > 30000) { lastDownToast = now; say(DOWN_MSG[reason].replace("⚠ ", "")); }
  }

  // Start (or continue) playing the current track. `wantPlay` is already true.
  function begin() {
    attach();
    armWatchdog();
    updateNowPlaying();
    const p = audio.play();
    if (p && p.catch) p.catch(onPlayRejected);
  }
  function onPlayRejected(e) {
    const name = e && e.name;
    if (name === "NotAllowedError") {
      // Autoplay blocked: stay quiet and let the pill invite a tap.
      wantPlay = false; playing = false;
      clearWatchdog();
      updateNowPlaying();
      showPill();
    }
    // AbortError: superseded by a newer load/pause. NotSupportedError: the <audio>
    // "error" event (below) does the skipping, so it is not handled twice.
  }

  function play() {
    resetRun();
    setRadioDown("");
    if (navigator.onLine === false) { goDown("offline"); return Promise.resolve(); }
    const j = nextPlayable(idx);
    if (j < 0) { goDown("unreachable"); return Promise.resolve(); }
    if (j !== idx) selectTrack(j);
    wantPlay = true;
    begin();
    return Promise.resolve();
  }
  function pause() {
    wantPlay = false;
    clearWatchdog();
    audio.pause();
    playing = false;
    updateNowPlaying();
  }
  function toggle() { (wantPlay ? pause() : play()); }

  // Manual next/prev: never touches the network unless music is on.
  function step(dir) {
    let j = nextPlayable(idx + dir, dir);
    if (j < 0) j = wrap(idx + dir, tracks().length); // everything known dead: browse anyway
    selectTrack(j);
    if (wantPlay) { resetRun(); begin(); }
  }
  const next = () => step(1);
  const prev = () => step(-1);

  // A track could not be played: skip quietly, or stop after MAX_STREAK.
  function trackFailed() {
    clearWatchdog();
    if (!wantPlay) return; // nobody asked for this track
    if (navigator.onLine === false) { goDown("offline"); return; }
    const list = tracks(), t = list[idx];
    streak += 1;
    skipped.push(t.title || "untitled");
    pendingDead.push(t.url);
    if (streak >= Math.min(MAX_STREAK, list.length)) { goDown("unreachable"); return; }
    const j = nextPlayable(idx + 1);
    if (j < 0 || j === idx) { goDown("unreachable"); return; }
    selectTrack(j);
    begin();
  }

  function onPlaying() {
    clearWatchdog();
    const first = !playing;
    playing = true; wantPlay = true; everPlayed = true; setMediaSession();
    // Something played, so the network is fine: the earlier failures are real dead links.
    if (pendingDead.length) {
      const now = Date.now();
      pendingDead.forEach((u) => { dead[u] = now; });
      saveDead();
    }
    if (skipped.length) {
      const n = skipped.length;
      say(`Skipped ${n} unavailable track${n === 1 ? "" : "s"}`);
    }
    resetRun();
    setRadioDown("");
    if (first) { hidePill(); showBar(); }   // not again on every re-buffer
    updateNowPlaying();
  }

  function setStation(key, autoplay) {
    if (!valid.includes(key)) return;
    if (key === stationKey) { renderStationMenu(); stationMenu.hidden = true; return; }
    const was = wantPlay;
    pause();
    detach();
    stationKey = key;
    writeStation();
    idx = readTrack();
    setRadioDown("");
    resetRun();
    renderStationMenu();
    stationMenu.hidden = true;
    updateNowPlaying();
    say(`Station: ${stationName()} — ${stations[key].tag}`);
    if (autoplay || was) play();
    else showBar();
  }
  function playStation(key) {
    if (!valid.includes(key)) return;
    if (key !== stationKey) setStation(key, true);
    else if (!wantPlay) play();
  }

  function renderStationMenu() {
    stationMenu.innerHTML = valid.map((k) => `
      <button type="button" role="menuitemradio" aria-checked="${k === stationKey}" class="station-opt${k === stationKey ? " current" : ""}" data-station="${k}">
        <span class="so-dot" aria-hidden="true"></span>
        <span class="so-name">${stations[k].name}</span>
        <span class="so-tag">${stations[k].tag || ""}</span>
      </button>`).join("");
  }

  // ---- mute / volume -----------------------------------------------------
  function setMuted(m, silent) {
    muted = !!m;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* ignore */ }
    applyVolume();
    updateMuteUi();
    if (!silent) window.dispatchEvent(new CustomEvent("titan:mute", { detail: { muted } }));
  }
  // Another module (ambient.js) may also toggle mute; stay in sync without echoing.
  window.addEventListener("titan:mute", (e) => {
    const m = !!(e.detail && e.detail.muted);
    if (m !== muted) setMuted(m, true);
  });

  // ---- <audio> events ----------------------------------------------------
  audio.addEventListener("playing", onPlaying);
  audio.addEventListener("play", () => { if (!audio.paused) wantPlay = true; }); // e.g. a media key
  audio.addEventListener("pause", () => {
    playing = false;
    // Paused from outside (headset, lock screen, another app) rather than by us or at the end of a track.
    if (!audio.ended && wantPlay && !watchdog) wantPlay = false;
    updateNowPlaying();
  });
  audio.addEventListener("ended", () => {
    if (!wantPlay) return;
    resetRun();
    const j = nextPlayable(idx + 1);
    if (j < 0) { goDown("unreachable"); return; }
    selectTrack(j);
    begin();
  });
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;              // src cleared on purpose
    const code = audio.error && audio.error.code;
    if (code === 1) return;                              // MEDIA_ERR_ABORTED: superseded by a newer load
    trackFailed();
  });
  window.addEventListener("online", () => {
    if (radioDown === "offline") { setRadioDown(""); updateNowPlaying(); }
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
    else if (act === "mute") setMuted(!muted);
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
    vol = parseFloat(volInput.value);
    if (muted && vol > 0) setMuted(false); // dragging the slider up un-mutes
    applyVolume();
    try { localStorage.setItem(VOL_KEY, String(vol)); } catch { /* ignore */ }
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

  // ---- diagnostics -------------------------------------------------------
  // TitanLofi.audit()            probes every station's tracks in this browser
  // TitanLofi.audit("jazz")      probes one station
  // TitanLofi.audit(null, true)  also remembers the dead ones (skipped without a request)
  // Uses a scratch <audio preload=metadata>, so no CORS headers are needed.
  async function audit(only, remember) {
    const keys = only ? [only] : valid;
    const jobs = [];
    const seen = new Set();
    for (const k of keys) {
      if (!stations[k]) continue;
      for (const t of stations[k].tracks) if (!seen.has(t.url)) { seen.add(t.url); jobs.push({ k, t }); }
    }
    const result = { ok: [], dead: [], slow: [] };
    const probe = (job) => new Promise((resolve) => {
      const a = new Audio();
      let done = false;
      const fin = (kind) => {
        if (done) return; done = true;
        clearTimeout(tm);
        a.removeAttribute("src"); try { a.load(); } catch { /* ignore */ }
        result[kind].push({ station: job.k, title: job.t.title, url: job.t.url });
        resolve();
      };
      const tm = setTimeout(() => fin("slow"), 15000);
      a.preload = "metadata";
      a.addEventListener("loadedmetadata", () => fin("ok"), { once: true });
      a.addEventListener("error", () => fin("dead"), { once: true });
      a.src = job.t.url;
    });
    let n = 0;
    const worker = async () => { while (n < jobs.length) await probe(jobs[n++]); };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (remember) {
      const now = Date.now();
      result.dead.forEach((d) => { dead[d.url] = now; });
      saveDead();
    }
    try { console.info(`[TitanLofi.audit] ${result.ok.length} ok, ${result.dead.length} dead, ${result.slow.length} slow`); console.table(result.dead); } catch { /* ignore */ }
    return result;
  }

  // ---- boot --------------------------------------------------------------
  renderStationMenu();
  updateNowPlaying();
  showPill();               // nothing is fetched until the listener asks for music
  audio.addEventListener("play", () => { try { localStorage.setItem(AUTO_KEY, "1"); } catch { /* ignore */ } });
  audio.addEventListener("pause", () => {
    try { localStorage.setItem(AUTO_KEY, wantPlay ? "1" : "0"); } catch { /* ignore */ }
  });
  // Public hooks: atmosphere system ("Set the scene") + manual station control.
  // TitanLofi keeps its v1 shape so older callers still work.
  window.TitanLofi = {
    play, pause, toggle,
    isPlaying: () => playing,
    isAvailable: () => !radioDown,
    playStation,
    setStation: (k) => setStation(k, wantPlay),
    station: () => stationKey,
    status: radioStatus,
    setVolume: (v) => { vol = Math.min(1, Math.max(0, v)); applyVolume(); try { localStorage.setItem(VOL_KEY, String(vol)); } catch { /* ignore */ } },
    getVolume: () => vol,
    stations: () => valid.map((k) => ({ key: k, name: stations[k].name, tag: stations[k].tag })),
    setMuted: (m) => setMuted(m),
    isMuted: () => muted,
    setDuck: (f) => { duck = Math.min(1, Math.max(0, f)); applyVolume(); },
    audit,
    deadTracks: () => Object.keys(dead),
  };
})();
