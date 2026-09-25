/* Titan Reliquary — rainstorm + ambient mixer.
   The header rain button toggles (a) a looping rain sound and (b) a
   full-viewport canvas rain-streak overlay (pointer-events:none).
   The ambient panel adds distant thunder, fireplace crackle, and night wind,
   each with its own toggle + volume. Sounds are hotlinked MP3s (not committed
   to the repo; documented in CHANGELOG.md). Rain and the lofi player
   (audio.js) use separate <audio> elements so they play simultaneously.
   prefers-reduced-motion: canvas animation is skipped; sound still works. */
(() => {
  "use strict";

  // Verified direct MP3 URLs (Mixkit Sound Effects Free License: free for
  // commercial use, no attribution required). Verified 2026-09-25.
  const SOUNDS = {
    rain:    { label: "Rain",            url: "https://assets.mixkit.co/active_storage/sfx/2394/2394-preview.mp3", artist: "Mixkit", license: "Mixkit Free" },
    thunder: { label: "Distant thunder", url: "https://assets.mixkit.co/active_storage/sfx/2395/2395-preview.mp3", artist: "Mixkit", license: "Mixkit Free" },
    fire:    { label: "Fireplace",       url: "https://assets.mixkit.co/active_storage/sfx/1330/1330-preview.mp3", artist: "Mixkit", license: "Mixkit Free" },
    wind:    { label: "Night wind",      url: "https://assets.mixkit.co/active_storage/sfx/2483/2483-preview.mp3", artist: "Mixkit", license: "Mixkit Free" },
  };

  const STATE_KEY = "tr_ambient_v1";
  const ORDER = ["rain", "thunder", "fire", "wind"];

  function readState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (s && typeof s === "object") return s;
    } catch { /* ignore */ }
    return {};
  }
  function writeState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }
  const saved = readState();
  const state = {};
  for (const k of ORDER) {
    state[k] = {
      on: !!(saved[k] && saved[k].on),
      vol: Number.isFinite(saved[k] && saved[k].vol) ? Math.min(1, Math.max(0, saved[k].vol)) : (k === "rain" ? 0.55 : 0.4),
    };
  }

  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const btn = document.getElementById("btn-rain");
  const anySounds = ORDER.some((k) => SOUNDS[k].url);
  if (!btn || !anySounds) {
    if (btn) btn.style.display = "none";
    return; // no sound URLs configured: hide the button, do nothing
  }

  // ---- audio elements (one per sound; looped) -----------------------------
  const els = {};
  for (const k of ORDER) {
    const cfg = SOUNDS[k];
    if (!cfg.url) continue;
    const a = new Audio();
    a.preload = "none";
    a.loop = true;
    a.volume = state[k].vol;
    els[k] = a;
  }

  function setOn(k, on) {
    if (!els[k]) return;
    state[k].on = on;
    writeState();
    if (on) {
      if (!els[k].src) els[k].src = SOUNDS[k].url;
      els[k].play().catch(() => {
        state[k].on = false;
        writeState();
        syncUi();
        say(`${SOUNDS[k].label} could not start (network or autoplay block)`);
      });
    } else {
      els[k].pause();
    }
    syncUi();
  }

  // ---- canvas rain --------------------------------------------------------
  const canvas = document.createElement("canvas");
  canvas.id = "rain-canvas";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let raf = null;
  let drops = [];

  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seedDrops() {
    const n = Math.min(220, Math.floor((innerWidth * innerHeight) / 9000));
    drops = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      len: 10 + Math.random() * 22,
      spd: 9 + Math.random() * 9,
      op: 0.12 + Math.random() * 0.25,
      drift: -1.5 - Math.random() * 1.5,
    }));
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.lineWidth = 1.1;
    for (const d of drops) {
      ctx.strokeStyle = `rgba(150, 180, 205, ${d.op})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.drift, d.y + d.len);
      ctx.stroke();
      d.y += d.spd;
      d.x += d.drift * 0.4;
      if (d.y > innerHeight + 30) { d.y = -30; d.x = Math.random() * (innerWidth + 60) - 30; }
    }
    raf = requestAnimationFrame(tick);
  }
  function startCanvas() {
    if (reducedMotion) return; // sound still works; animation skipped
    sizeCanvas();
    seedDrops();
    canvas.hidden = false;
    if (raf == null) raf = requestAnimationFrame(tick);
    window.addEventListener("resize", sizeCanvas);
  }
  function stopCanvas() {
    if (raf != null) { cancelAnimationFrame(raf); raf = null; }
    window.removeEventListener("resize", sizeCanvas);
    canvas.hidden = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drops = [];
  }

  // ---- toast (local, tiny) -------------------------------------------------
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

  // ---- ambient panel -------------------------------------------------------
  const panel = document.createElement("div");
  panel.className = "ambient-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Ambient sound mixer");
  panel.innerHTML = `
    <div class="ambient-head">
      <h3>Ambience</h3>
      <button type="button" class="lofi-collapse" id="amb-close" aria-label="Close ambience panel">×</button>
    </div>
    ${ORDER.filter((k) => els[k]).map((k) => `
      <div class="ambient-row" data-sound="${k}">
        <button type="button" class="amb-toggle" data-sound="${k}" aria-pressed="false" aria-label="Toggle ${SOUNDS[k].label}"></button>
        <span class="amb-name">${SOUNDS[k].label}</span>
        <input type="range" min="0" max="1" step="0.01" value="${state[k].vol}" data-vol="${k}" aria-label="${SOUNDS[k].label} volume" />
      </div>`).join("")}
    <p class="ambient-note">Sounds loop and mix with the lofi player. Rain also shows falling rain on screen (animation off when reduced motion is set).</p>`;
  document.body.appendChild(panel);

  function syncUi() {
    btn.setAttribute("aria-pressed", String(state.rain.on));
    panel.querySelectorAll(".amb-toggle").forEach((t) => {
      t.setAttribute("aria-pressed", String(!!state[t.dataset.sound].on));
    });
    const rainOn = state.rain.on;
    if (rainOn) startCanvas(); else stopCanvas();
  }

  btn.addEventListener("click", (e) => {
    if (e.shiftKey) { panel.hidden = false; return; } // shift-click: open the mixer without toggling rain
    const next = !state.rain.on;
    if (next) panel.hidden = false; // reveal the mixer the first time rain is enabled
    setOn("rain", next);
  });
  panel.querySelectorAll(".amb-toggle").forEach((t) => {
    t.addEventListener("click", () => setOn(t.dataset.sound, !state[t.dataset.sound].on));
  });
  panel.querySelectorAll("input[data-vol]").forEach((r) => {
    r.addEventListener("input", () => {
      const k = r.dataset.vol;
      state[k].vol = parseFloat(r.value);
      if (els[k]) els[k].volume = state[k].vol;
      writeState();
    });
  });
  panel.querySelector("#amb-close").addEventListener("click", () => { panel.hidden = true; });

  // Restore persisted ambience on boot (rain restored silently; autoplay-safe).
  for (const k of ORDER) {
    if (state[k].on && els[k]) {
      els[k].src = SOUNDS[k].url;
      els[k].play().catch(() => { state[k].on = false; writeState(); });
    }
  }
  syncUi();
})();
