/* Titan Reliquary — "Stormroom" ambient mixer (v2).
   Upgrades over v1: every layer runs through the Web Audio graph
   (per-layer GainNode + master gain) so toggles fade in/out over ~1.4s
   instead of cutting; a Storm Intensity slider couples rain loudness to the
   canvas rain (drizzle -> downpour, with wind gusts); one-tap presets
   (Storm / Fireside / Night watch / Off); master volume; long-press the
   rain button to open the mixer without toggling.
   Sounds are hotlinked Mixkit MP3s (Mixkit Free License, no attribution
   required — not committed to the repo, documented in CHANGELOG.md).
   Rain and the lofi player (audio.js) use separate chains so they mix.
   prefers-reduced-motion: canvas animation is skipped; sound still works. */
(() => {
  "use strict";

  // Verified direct MP3 URLs (Mixkit Sound Effects Free License).
  const SOUNDS = {
    rain:    { label: "Rain",            url: "https://assets.mixkit.co/active_storage/sfx/2394/2394-preview.mp3" },
    thunder: { label: "Distant thunder", url: "https://assets.mixkit.co/active_storage/sfx/2395/2395-preview.mp3" },
    fire:    { label: "Fireplace",       url: "https://assets.mixkit.co/active_storage/sfx/1330/1330-preview.mp3" },
    wind:    { label: "Night wind",      url: "https://assets.mixkit.co/active_storage/sfx/2483/2483-preview.mp3" },
  };
  const ORDER = ["rain", "thunder", "fire", "wind"];
  const ICONS = {
    rain: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17.5 13a4.5 4.5 0 0 0-.9-8.9A6 6 0 0 0 5.2 6.3 4 4 0 0 0 6 14.5"/><line x1="8" y1="17" x2="7" y2="21"/><line x1="12" y1="16" x2="11" y2="20"/><line x1="16" y1="17" x2="15" y2="21"/></svg>',
    thunder: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 12a4.5 4.5 0 0 0-.9-8.9A6 6 0 0 0 5.2 5.3 4 4 0 0 0 6 13.5"/><path d="M13 13l-3.5 5.5H12l-1 3.5 4.5-6.5H13l1-2.5z" fill="currentColor" stroke="none"/></svg>',
    fire: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-6.8 0-3.2-2-5.3-3.5-7C14 6.5 13 5 13 2.5 10 5 8.5 7.5 8.5 10c-1-.5-1.8-1.3-2.3-2.5C5.4 9.4 5 11.4 5 13.2 5 19.2 8 22 12 22z"/></svg>',
    wind: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8h9a3 3 0 1 0-3-3"/><path d="M3 12h13a3 3 0 1 1-3 3"/><path d="M3 16h6a2.5 2.5 0 1 1-2.5 2.5"/></svg>',
  };
  const PRESETS = {
    storm: { label: "Storm",     layers: { rain: [true, 0.65], thunder: [true, 0.55], fire: [false, 0.5], wind: [true, 0.3] },  intensity: 85 },
    fireside: { label: "Fireside", layers: { rain: [false, 0.4], thunder: [false, 0.4], fire: [true, 0.7], wind: [true, 0.22] }, intensity: 30 },
    night: { label: "Night watch", layers: { rain: [true, 0.35], thunder: [false, 0.4], fire: [false, 0.5], wind: [true, 0.5] }, intensity: 25 },
    off:   { label: "Off",       layers: { rain: [false, 0.55], thunder: [false, 0.4], fire: [false, 0.5], wind: [false, 0.4] }, intensity: 55 },
  };

  const STATE_KEY = "tr_ambient_v2";
  const OLD_KEY = "tr_ambient_v1";
  const FADE_S = 1.4;

  function readState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (s && s.layers) return s;
      // migrate v1 shape -> v2
      const o = JSON.parse(localStorage.getItem(OLD_KEY) || "null");
      if (o && typeof o === "object") {
        const layers = {};
        for (const k of ORDER) layers[k] = { on: !!(o[k] && o[k].on), vol: Number.isFinite(o[k] && o[k].vol) ? o[k].vol : 0.4 };
        return { layers, intensity: 55, master: 0.9 };
      }
    } catch { /* ignore */ }
    return null;
  }
  const saved = readState() || {};
  const state = {
    layers: {},
    intensity: Number.isFinite(saved.intensity) ? Math.min(100, Math.max(0, saved.intensity)) : 55,
    master: Number.isFinite(saved.master) ? Math.min(1, Math.max(0, saved.master)) : 0.9,
  };
  for (const k of ORDER) {
    const s = (saved.layers || {})[k] || {};
    state.layers[k] = {
      on: !!s.on,
      vol: Number.isFinite(s.vol) ? Math.min(1, Math.max(0, s.vol)) : (k === "rain" ? 0.55 : 0.4),
    };
  }
  function writeState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const btn = document.getElementById("btn-rain");
  if (!btn) return;

  // ---- Web Audio graph: source -> layerGain -> master -> destination ----
  let actx = null, masterGain = null;
  const nodes = {}; // k -> {el, src, gain}
  function ensureGraph() {
    if (actx) { if (actx.state === "suspended") actx.resume().catch(() => {}); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      actx = new AC();
      masterGain = actx.createGain();
      masterGain.gain.value = state.master;
      masterGain.connect(actx.destination);
      for (const k of ORDER) {
        const el = new Audio();
        el.preload = "none";
        el.loop = true;
        el.crossOrigin = "anonymous";
        const src = actx.createMediaElementSource(el);
        const g = actx.createGain();
        g.gain.value = 0;
        src.connect(g); g.connect(masterGain);
        nodes[k] = { el, gain: g, fadeT: null };
      }
      return true;
    } catch { return false; }
  }
  function layerTarget(k) {
    // audible target for a layer that is ON (0 when off); rain scales with intensity
    if (!state.layers[k].on) return 0;
    let v = state.layers[k].vol;
    if (k === "rain") v *= 0.25 + 0.75 * (state.intensity / 100);
    return Math.min(1, Math.max(0, v));
  }
  function rampGain(k) {
    const n = nodes[k];
    if (!n || !actx) return;
    const t = actx.currentTime;
    n.gain.gain.cancelScheduledValues(t);
    n.gain.gain.setValueAtTime(n.gain.gain.value, t);
    n.gain.gain.linearRampToValueAtTime(layerTarget(k), t + FADE_S);
    clearTimeout(n.fadeT);
    if (!state.layers[k].on) {
      n.fadeT = setTimeout(() => { try { n.el.pause(); } catch { /* ignore */ } }, (FADE_S + 0.15) * 1000);
    }
  }
  function setOn(k, on) {
    if (!ensureGraph()) { say("Audio not supported here"); return; }
    const n = nodes[k];
    state.layers[k].on = on;
    writeState();
    if (on) {
      clearTimeout(n.fadeT);
      if (!n.el.src) n.el.src = SOUNDS[k].url;
      n.el.play().catch(() => {
        state.layers[k].on = false;
        writeState(); syncUi();
        say(`${SOUNDS[k].label} could not start (network or autoplay block)`);
      });
    }
    rampGain(k);
    syncUi();
  }
  function applyVolumes() {
    if (!actx) return;
    for (const k of ORDER) rampGain(k);
    const t = actx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(state.master, t + 0.4);
  }
  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p || !ensureGraph()) return;
    for (const k of ORDER) {
      const [on, vol] = p.layers[k];
      state.layers[k] = { on, vol };
      const n = nodes[k];
      clearTimeout(n.fadeT);
      if (on) {
        if (!n.el.src) n.el.src = SOUNDS[k].url;
        n.el.play().catch(() => { state.layers[k].on = false; });
      }
    }
    state.intensity = p.intensity;
    writeState();
    applyVolumes();
    seedDrops();
    syncUi();
  }

  // ---- canvas rain (intensity-coupled, with gusts) ----------------------
  const canvas = document.createElement("canvas");
  canvas.id = "rain-canvas";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let raf = null, drops = [], t0 = 0;
  function dropCount() { return Math.round(40 + (state.intensity / 100) * 220); }
  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seedDrops() {
    const n = Math.min(280, Math.max(30, Math.floor(dropCount() * Math.min(1.4, (innerWidth * innerHeight) / 900000))));
    const boost = 0.7 + (state.intensity / 100) * 0.9;
    drops = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      len: (10 + Math.random() * 22) * boost,
      spd: (9 + Math.random() * 9) * boost,
      op: (0.10 + Math.random() * 0.22) * (0.6 + (state.intensity / 100) * 0.7),
      drift: -1.5 - Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2,
    }));
  }
  function tick(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.lineWidth = 1.1;
    const gust = Math.sin((now - t0) / 2600) * 2.2; // slow wind gusts
    for (const d of drops) {
      const sway = Math.sin((now - t0) / 900 + d.ph) * 0.6;
      ctx.strokeStyle = `rgba(150, 180, 205, ${d.op.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.drift + gust + sway, d.y + d.len);
      ctx.stroke();
      d.y += d.spd;
      d.x += (d.drift + gust) * 0.35;
      if (d.y > innerHeight + 30) { d.y = -30; d.x = Math.random() * (innerWidth + 60) - 30; }
      if (d.x < -60) d.x = innerWidth + 40; else if (d.x > innerWidth + 60) d.x = -40;
    }
    raf = requestAnimationFrame(tick);
  }
  function startCanvas() {
    if (reducedMotion) return;
    sizeCanvas(); seedDrops(); t0 = performance.now();
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

  // ---- toast (local, tiny) ----------------------------------------------
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

  // ---- mixer panel -------------------------------------------------------
  const panel = document.createElement("div");
  panel.className = "ambient-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ambient sound mixer");
  const INT_LABELS = [[15, "Drizzle"], [45, "Steady"], [75, "Heavy"], [101, "Downpour"]];
  const intLabel = (v) => (INT_LABELS.find(([lim]) => v < lim) || INT_LABELS[3])[1];
  panel.innerHTML = `
    <div class="ambient-head">
      <h3>Stormroom</h3>
      <button type="button" class="lofi-collapse" id="amb-close" aria-label="Close ambience panel">×</button>
    </div>
    <div class="amb-presets" role="group" aria-label="Ambience presets">
      ${Object.entries(PRESETS).map(([key, p]) => `<button type="button" class="amb-preset" data-preset="${key}">${p.label}</button>`).join("")}
    </div>
    <div class="amb-intensity">
      <div class="amb-intensity-top"><span>Storm intensity</span><strong id="amb-int-label">${intLabel(state.intensity)}</strong></div>
      <input type="range" id="amb-intensity" min="0" max="100" step="1" value="${state.intensity}" aria-label="Storm intensity" />
    </div>
    ${ORDER.map((k) => `
      <div class="ambient-row" data-sound="${k}">
        <span class="amb-ico" aria-hidden="true">${ICONS[k]}</span>
        <button type="button" class="amb-toggle" data-sound="${k}" aria-pressed="false" aria-label="Toggle ${SOUNDS[k].label}"></button>
        <span class="amb-name">${SOUNDS[k].label}</span>
        <input type="range" min="0" max="1" step="0.01" value="${state.layers[k].vol}" data-vol="${k}" aria-label="${SOUNDS[k].label} volume" />
      </div>`).join("")}
    <div class="amb-master">
      <span>Master</span>
      <input type="range" id="amb-master" min="0" max="1" step="0.01" value="${state.master}" aria-label="Master ambience volume" />
    </div>
    <p class="ambient-note">Layers fade in and out smoothly and mix with the lofi player. Rain shows on screen too (still picture when reduced motion is set). Long-press the rain button to open this mixer.</p>`;
  document.body.appendChild(panel);

  function syncUi() {
    btn.setAttribute("aria-pressed", String(state.layers.rain.on));
    panel.querySelectorAll(".amb-toggle").forEach((t) => {
      t.setAttribute("aria-pressed", String(!!state.layers[t.dataset.sound].on));
    });
    const lbl = panel.querySelector("#amb-int-label");
    if (lbl) lbl.textContent = intLabel(state.intensity);
    const rainOn = state.layers.rain.on;
    if (rainOn) startCanvas(); else stopCanvas();
  }

  // rain button: tap toggles rain · long-press (600ms) opens mixer
  let pressT = null, longFired = false;
  btn.addEventListener("pointerdown", () => {
    longFired = false;
    pressT = setTimeout(() => { longFired = true; panel.hidden = false; }, 600);
  });
  btn.addEventListener("pointerup", (e) => {
    clearTimeout(pressT);
    if (longFired) return;
    if (e.shiftKey) { panel.hidden = false; return; } // desktop: shift-click opens mixer
    const next = !state.layers.rain.on;
    if (next && panel.hidden) panel.hidden = false; // reveal the mixer the first time rain starts
    setOn("rain", next);
  });
  btn.addEventListener("pointerleave", () => clearTimeout(pressT));
  btn.addEventListener("contextmenu", (e) => { if (longFired) e.preventDefault(); });

  panel.querySelectorAll(".amb-toggle").forEach((t) => {
    t.addEventListener("click", () => setOn(t.dataset.sound, !state.layers[t.dataset.sound].on));
  });
  panel.querySelectorAll("input[data-vol]").forEach((r) => {
    r.addEventListener("input", () => {
      const k = r.dataset.vol;
      state.layers[k].vol = parseFloat(r.value);
      writeState();
      if (actx) rampGain(k);
    });
  });
  panel.querySelector("#amb-intensity").addEventListener("input", (e) => {
    state.intensity = parseInt(e.target.value, 10);
    writeState();
    panel.querySelector("#amb-int-label").textContent = intLabel(state.intensity);
    if (actx) rampGain("rain");
    if (!canvas.hidden) seedDrops();
  });
  panel.querySelector("#amb-master").addEventListener("input", (e) => {
    state.master = parseFloat(e.target.value);
    writeState();
    if (actx && masterGain) {
      const t = actx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.linearRampToValueAtTime(state.master, t + 0.3);
    }
  });
  panel.querySelectorAll(".amb-preset").forEach((b) => {
    b.addEventListener("click", () => applyPreset(b.dataset.preset));
  });
  panel.querySelector("#amb-close").addEventListener("click", () => { panel.hidden = true; });

  // Restore persisted ambience on boot (autoplay-safe: play() may reject).
  if (ORDER.some((k) => state.layers[k].on) && ensureGraph()) {
    for (const k of ORDER) {
      if (!state.layers[k].on) continue;
      const n = nodes[k];
      n.el.src = SOUNDS[k].url;
      n.gain.gain.value = 0;
      n.el.play().then(() => rampGain(k)).catch(() => { state.layers[k].on = false; writeState(); });
    }
  }
  syncUi();
})();
