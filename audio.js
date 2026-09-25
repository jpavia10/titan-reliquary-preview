/* Titan Reliquary — integrated lofi player.
   Playlist lives in js/playlist.js (static, outside data/ so publish_all.sh cannot clobber it).
   Tracks are HOTLINKED mp3s — they are not committed to the repo and will not
   work offline (documented in CHANGELOG.md). Rain/ambience is separate (ambient.js),
   so lofi and rain can play simultaneously (separate <audio> elements). */
(() => {
  "use strict";

  const VOL_KEY = "tr_lofi_vol_v1";
  const TRACK_KEY = "tr_lofi_track_v1";
  const AUTO_KEY = "tr_lofi_autoplay_v1";

  const playlist = (window.TITAN_PLAYLIST || []).filter((t) => t && t.url);
  if (!playlist.length) return; // playlist missing: stay silent, no UI

  let idx = 0;
  let audio = new Audio();
  audio.preload = "none";
  let playing = false;
  let skipGuard = 0; // consecutive failed tracks
  let collapsed = false;

  // ---- state -------------------------------------------------------------
  function readNum(key, dflt) {
    try { const v = parseFloat(localStorage.getItem(key)); return Number.isFinite(v) ? v : dflt; } catch { return dflt; }
  }
  function readInt(key, dflt) {
    try { const v = parseInt(localStorage.getItem(key), 10); return Number.isInteger(v) ? v : dflt; } catch { return dflt; }
  }
  function readBool(key, dflt) {
    try { const v = localStorage.getItem(key); return v == null ? dflt : v === "1"; } catch { return dflt; }
  }
  idx = Math.min(Math.max(0, readInt(TRACK_KEY, 0)), playlist.length - 1);
  audio.volume = Math.min(1, Math.max(0, readNum(VOL_KEY, 0.6)));
  const autoplayPref = readBool(AUTO_KEY, true);

  // Mobile Safari: resume an AudioContext on first touch (lofi itself uses <audio>).
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
  bar.setAttribute("aria-label", "Lofi music player");
  bar.innerHTML = `
    <div class="lofi-row">
      <button type="button" class="lofi-btn" data-act="prev" aria-label="Previous track" title="Previous">⏮</button>
      <button type="button" class="lofi-btn lofi-play" data-act="play" aria-label="Play or pause" title="Play/Pause">▶</button>
      <button type="button" class="lofi-btn" data-act="next" aria-label="Next track" title="Next">⏭</button>
      <div class="lofi-now"><div class="t" id="lofi-title">—</div><div class="a" id="lofi-artist">—</div></div>
      <div class="lofi-vol">
        <input type="range" id="lofi-vol" min="0" max="1" step="0.01" value="${audio.volume}" aria-label="Lofi volume" />
      </div>
      <button type="button" class="lofi-collapse" data-act="collapse" aria-label="Collapse player" title="Collapse">–</button>
    </div>
    <div class="lofi-meta">
      <span class="lofi-credit" id="lofi-credit"></span>
      <span id="lofi-count"></span>
    </div>`;
  document.body.appendChild(bar);

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "lofi-pill";
  pill.hidden = true;
  pill.innerHTML = `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span>Tap for lofi</span>`;
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
  const elCredit = bar.querySelector("#lofi-credit");
  const elCount = bar.querySelector("#lofi-count");
  const volInput = bar.querySelector("#lofi-vol");
  const btnCollapse = bar.querySelector('[data-act="collapse"]');

  function showBar() { bar.hidden = false; }
  function hidePill() { pill.hidden = true; }
  function showPill() { pill.hidden = false; showBar(); }

  function updateNowPlaying() {
    const t = playlist[idx];
    elTitle.textContent = t.title || "Untitled";
    elTitle.title = t.title || "";
    elArtist.textContent = t.artist || "";
    elArtist.title = t.artist || "";
    elCount.textContent = `${idx + 1} / ${playlist.length}`;
    elCredit.textContent = t.license === "CC-BY" && t.credit ? t.credit : (t.license ? `© ${t.artist} · ${t.license}` : "");
    btnPlay.textContent = playing ? "⏸" : "▶";
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function loadTrack(i, autoplay) {
    idx = (i + playlist.length) % playlist.length;
    skipGuard = 0;
    audio.src = playlist[idx].url;
    audio.preload = "auto";
    try { localStorage.setItem(TRACK_KEY, String(idx)); } catch { /* ignore */ }
    updateNowPlaying();
    if (autoplay) play();
  }

  async function play() {
    ensureCtx();
    if (!audio.src) loadTrack(idx, false);
    try {
      await audio.play();
    } catch (e) {
      // Autoplay blocked (or network hiccup): show the pulsing tap pill.
      playing = false;
      updateNowPlaying();
      showPill();
      return;
    }
    playing = true;
    hidePill();
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

  audio.addEventListener("ended", () => { loadTrack(idx + 1, true); });
  audio.addEventListener("play", () => { playing = true; updateNowPlaying(); });
  audio.addEventListener("pause", () => { playing = false; updateNowPlaying(); });
  audio.addEventListener("error", () => {
    // Dead track: skip gracefully. If the whole list fails, stop and say so.
    skipGuard += 1;
    if (skipGuard >= playlist.length) {
      pause();
      say("Lofi: every track failed to load — check your connection");
      return;
    }
    const t = playlist[idx];
    say(`Skipped a dead track (${t.title || "untitled"})`);
    loadTrack(idx + 1, playing);
  });

  bar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "play") toggle();
    else if (act === "next") next();
    else if (act === "prev") prev();
    else if (act === "collapse") {
      collapsed = !collapsed;
      bar.classList.toggle("collapsed", collapsed);
      b.textContent = collapsed ? "＋" : "–";
      b.setAttribute("aria-label", collapsed ? "Expand player" : "Collapse player");
    }
  });
  volInput.addEventListener("input", () => {
    audio.volume = parseFloat(volInput.value);
    try { localStorage.setItem(VOL_KEY, String(audio.volume)); } catch { /* ignore */ }
  });
  pill.addEventListener("click", () => { play(); });

  // ---- boot --------------------------------------------------------------
  updateNowPlaying();
  showBar();
  loadTrack(idx, false);
  if (autoplayPref) {
    // Autoplay is usually blocked unmuted — the rejection path shows the pill.
    play();
  } else {
    showBar();
  }
  // Persist the autoplay preference: toggling play counts as opting in, pausing as opting out.
  audio.addEventListener("play", () => { try { localStorage.setItem(AUTO_KEY, "1"); } catch { /* ignore */ } });
  audio.addEventListener("pause", () => {
    // Only treat an explicit pause (not track-skip internals) as opting out.
    try { localStorage.setItem(AUTO_KEY, playing ? "1" : "0"); } catch { /* ignore */ }
  });
})();
