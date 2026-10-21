/* Deck (Experimental UI, Grok exp worker, 2026-10-20). Your collection as a deck of cards.
   Every coin is a card: its photo, name, year, a suit by continent (Spades = Europe, Hearts = North America, Diamonds = Asia,
   Clubs = South America, Stars = Africa, Suns = Oceania), a value pip row and a holographic foil that follows your finger or the phone's tilt.
   Two ways in: FAN, a springy fan of the whole deck you flick through (every card reachable), and READING, which shuffles and
   deals three cards face down (Oldest · Heaviest hitter · Wild card, drawn from whatever suit you pick); tap to turn them.
   Tap a turned card for its sourced facts. Pure DOM + CSS 3D transforms (GPU composited) so it holds 60 fps on a phone;
   every transition is under 0.5 s and a tap skips it. Contract via shells/exp/kit.js. */
import { xpMount, yearOf, metalOf, money, esc, ping, coinTone } from "../exp/kit.js";
const SUIT = { "Europe": ["♠", "Spades · Europe"], "North America": ["♥", "Hearts · N. America"], "Asia": ["♦", "Diamonds · Asia"], "South America": ["♣", "Clubs · S. America"], "Africa": ["★", "Stars · Africa"], "Oceania": ["✺", "Suns · Oceania"], other: ["✧", "Wild"] };
const suitOf = (f) => (SUIT[f.continent] ? f.continent : "other");

export const mount = (root, svc) => xpMount(root, svc, { id: "deck", title: "DECK", hint: "Flick the fan · tap the centre card to turn it · tap again for its facts", stage: async (ctx) => {
  const { flips, stageEl, signal } = ctx, N = flips.length;
  stageEl.innerHTML = `<div class="dk-table" id="dk-table"></div>
    <div class="dk-bar"><div class="dk-modes" role="tablist"><button type="button" data-mode="fan" aria-pressed="true">Fan</button><button type="button" data-mode="reading" aria-pressed="false">Reading</button></div>
    <div class="dk-suits" id="dk-suits" role="group" aria-label="Suit"></div><div class="dk-pos" id="dk-pos" aria-live="polite"></div></div>`;
  const $ = (s) => stageEl.querySelector(s), table = $("#dk-table");
  const vmax = Math.max(...flips.map((f) => f.est || 0), 1);
  const pips = (f) => { const n = f.est ? Math.max(1, Math.min(5, Math.ceil(Math.log10(1 + f.est) / Math.log10(1 + vmax) * 5))) : 0; return "◆".repeat(n) + "◇".repeat(5 - n); };
  const face = (f, i) => { const m = metalOf(f), [g, sn] = SUIT[suitOf(f)], y = yearOf(f);
    return `<div class="dk-face dk-${m}"><div class="dk-foil"></div><div class="dk-corner">${g}<small>${esc(f.scan)}</small></div>
      <div class="dk-art">${f.thumb ? `<img src="${esc(f.thumb)}" alt="" draggable="false" loading="lazy">` : `<span class="dk-noimg">${g}</span>`}</div>
      <div class="dk-name">${esc(f.country || "")}</div><div class="dk-sub">${esc(f.denom || "")}</div>
      <div class="dk-year">${y ?? "undated"}</div><div class="dk-pips" title="value">${pips(f)}</div><div class="dk-suit">${esc(sn.split(" · ")[0])}${m !== "unknown" ? " · " + m : ""} · ${f.est != null ? money(f.est) : "—"}</div>
      <div class="dk-corner dk-br">${g}</div></div>`; };
  const back = `<div class="dk-back"><div class="dk-backart"></div></div>`;

  /* suits = filters on the deck itself */
  const SUITS = [["all", "All suits"], ...Object.entries(SUIT).filter(([k]) => flips.some((f) => suitOf(f) === k)).map(([k, [g, n]]) => [k, g + " " + n.split(" · ")[1]])];
  let suit = "all", deck = flips.map((f, i) => i);
  $("#dk-suits").innerHTML = SUITS.map(([k, l]) => `<button type="button" data-suit="${k}" aria-pressed="${k === "all"}">${esc(l)}</button>`).join("");
  const order = () => { deck = flips.map((f, i) => i).filter((i) => suit === "all" || suitOf(flips[i]) === suit).sort((a, b) => (yearOf(flips[a]) || 9999) - (yearOf(flips[b]) || 9999)); };
  order();

  /* ---------- FAN: a virtualised arc; position is a float index with spring physics ---------- */
  let mode = "fan", pos = 0, vel = 0, target = null, drag = null, turned = -1, raf = 0, lastT = performance.now();
  const pool = new Map();   // deck index -> element
  const W = () => stageEl.clientWidth || innerWidth, H = () => stageEl.clientHeight || innerHeight;
  const cardW = () => Math.min(230, W() * 0.52, H() * 0.36);
  function el(k) { let e = pool.get(k); if (e) return e; const i = deck[k]; e = document.createElement("button"); e.type = "button"; e.className = "dk-card"; e.dataset.k = k;
    e.setAttribute("aria-label", `${flips[i].label}, card ${k + 1} of ${deck.length}`); e.innerHTML = `<div class="dk-inner">${face(flips[i], i)}${back}</div>`; table.appendChild(e); pool.set(k, e); return e; }
  function layoutFan(dt) {
    if (!drag) { if (target != null) { const f = (target - pos) * 90 - vel * 14; vel += f * dt; if (Math.abs(target - pos) < 0.002 && Math.abs(vel) < 0.01) { pos = target; vel = 0; } }
      else { vel *= Math.pow(0.02, dt); if (Math.abs(vel) < 0.6) target = Math.round(pos); } pos += vel * dt; }
    pos = Math.max(-0.4, Math.min(deck.length - 0.6, pos));
    const cw = cardW(), cx = W() / 2, cy = H() * 0.47, lo = Math.max(0, Math.floor(pos) - 7), hi = Math.min(deck.length - 1, Math.ceil(pos) + 7);
    for (const [k, e] of pool) if (k < lo || k > hi) { e.remove(); pool.delete(k); }
    for (let k = lo; k <= hi; k++) { const e = el(k), d = k - pos, ad = Math.abs(d);
      const x = cx + Math.sign(d) * (Math.min(ad, 1) * cw * 0.62 + Math.max(0, ad - 1) * cw * 0.2), rot = d * 7, lift = Math.max(0, 1 - ad) * 26, sc = 1 - Math.min(ad, 3) * 0.06;
      e.style.width = cw + "px"; e.style.height = cw * 1.62 + "px";
      e.style.transform = `translate3d(${(x - cw / 2).toFixed(1)}px,${(cy - cw * 0.81 - lift + ad * ad * 4).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      e.style.zIndex = String(1000 - Math.round(ad * 10)); e.classList.toggle("dk-turned", k === turned); e.classList.toggle("dk-center", ad < 0.5); }
    const c = Math.round(Math.max(0, Math.min(deck.length - 1, pos)));
    $("#dk-pos").textContent = deck.length ? `${c + 1} / ${deck.length} · ${flips[deck[c]].label}` : "No cards in this suit";
    if (turned >= 0 && Math.abs(turned - pos) > 0.6) turned = -1;
  }
  /* ---------- READING: three cards dealt from the current suit ---------- */
  let spread = [], open = [false, false, false];
  function deal() { const pool3 = deck.slice(); if (!pool3.length) { table.innerHTML = ""; return; }
    const oldest = pool3[0], rich = pool3.reduce((a, b) => ((flips[b].est || 0) > (flips[a].est || 0) ? b : a)), others = pool3.filter((i) => i !== oldest && i !== rich), wild = others.length ? others[(Math.random() * others.length) | 0] : pool3[(Math.random() * pool3.length) | 0];
    spread = [[oldest, "The Elder", "the oldest in this suit"], [rich, "The Treasure", "the most valuable"], [wild, "The Wanderer", "drawn at random"]]; open = [false, false, false];
    table.innerHTML = `<div class="dk-spread">${spread.map(([i, t, s], k) => `<div class="dk-slot"><button type="button" class="dk-card dk-deal" data-r="${k}" style="--d:${k * 90}ms" aria-label="${esc(t)}: face down, tap to turn"><div class="dk-inner">${face(flips[i], i)}${back}</div></button><b>${esc(t)}</b><small>${esc(s)}</small></div>`).join("")}</div>
      <button type="button" class="dk-redeal" id="dk-redeal">↻ Shuffle and deal again</button>`;
    $("#dk-redeal").addEventListener("click", () => { swish(); deal(); });
    $("#dk-pos").textContent = "Tap a card to turn it";
  }
  function setMode(m) { mode = m; stageEl.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    table.innerHTML = ""; pool.clear(); turned = -1; table.className = "dk-table dk-" + m; if (m === "reading") { swish(); deal(); } else { pos = target = Math.min(Math.round(pos), deck.length - 1); } }
  stageEl.querySelector(".dk-modes").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); }, { signal });
  $("#dk-suits").addEventListener("click", (e) => { const b = e.target.closest("[data-suit]"); if (!b) return; suit = b.dataset.suit;
    $("#dk-suits").querySelectorAll("[data-suit]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); order(); pos = target = 0; vel = 0; setMode(mode); }, { signal });

  /* input: drag the fan (velocity flick), tilt/pointer drive the foil, taps turn and open */
  table.addEventListener("pointerdown", (e) => { if (mode !== "fan") return; drag = { x: e.clientX, p: pos, t: performance.now(), moved: 0, vx: 0 }; target = null; table.setPointerCapture(e.pointerId); }, { signal });
  table.addEventListener("pointermove", (e) => { foil(e.clientX / innerWidth, e.clientY / innerHeight);
    if (!drag) return; const now = performance.now(), np = drag.p - (e.clientX - drag.x) / (cardW() * 0.62); drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x));
    drag.vx = (np - pos) / Math.max(0.008, (now - drag.t) / 1000); drag.t = now; pos = np; }, { signal });
  table.addEventListener("pointerup", (e) => { const d = drag; drag = null; if (!d) return;
    if (d.moved > 6) { vel = Math.max(-40, Math.min(40, d.vx)); target = null; tick(); return; }
    const c = e.target.closest(".dk-card"); if (!c) return; const k = +c.dataset.k;
    if (Math.round(pos) !== k) { target = k; return; }
    if (turned === k) ctx.open(deck[k]); else { turned = k; flip(deck[k]); } }, { signal });
  table.addEventListener("click", (e) => { if (mode !== "reading") return; const c = e.target.closest("[data-r]"); if (!c) return; const r = +c.dataset.r;
    if (!open[r]) { open[r] = true; c.classList.add("dk-turned"); c.setAttribute("aria-label", flips[spread[r][0]].label + " (tap for facts)"); flip(spread[r][0]); } else ctx.open(spread[r][0]); }, { signal });
  addEventListener("keydown", (e) => { if (mode !== "fan" || ctx.root.querySelector(".xp-sheet.open") || !ctx.root.querySelector("#xp-find").hidden) return;
    if (e.key === "ArrowRight") { target = Math.min(deck.length - 1, Math.round(pos) + 1); } else if (e.key === "ArrowLeft") { target = Math.max(0, Math.round(pos) - 1); } }, { signal });
  function foil(x, y) { stageEl.style.setProperty("--fx", (x * 100).toFixed(1) + "%"); stageEl.style.setProperty("--fy", (y * 100).toFixed(1) + "%"); stageEl.style.setProperty("--fa", ((x - 0.5) * 50).toFixed(1) + "deg"); }
  addEventListener("deviceorientation", (e) => { if (e.gamma != null) foil(0.5 + Math.max(-1, Math.min(1, e.gamma / 35)) / 2, 0.5 + Math.max(-1, Math.min(1, (e.beta - 45) / 35)) / 2); }, { signal });
  function flip(i) { const t = coinTone(flips[i]); ping(svc, t.freq, t.bright, 0, 0.12, 1.2); try { navigator.vibrate && navigator.vibrate(8); } catch (x) { /* ignore */ } }
  function swish() { ping(svc, 1400, 0.2, -0.3, 0.03, 0.15); setTimeout(() => ping(svc, 1700, 0.2, 0.3, 0.03, 0.15), 60); }

  function tick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) { raf = 0; const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (mode === "fan") { layoutFan(dt); if (drag || vel || (target != null && target !== pos)) raf = requestAnimationFrame(loop); } }
  addEventListener("resize", () => { if (mode === "fan") { layoutFan(0); } }, { signal });
  setInterval(() => { if (mode === "fan" && (drag || vel || target !== pos)) tick(); }, 100);
  layoutFan(0); tick(); foil(0.5, 0.4);
  window.__deck = { mode: () => mode, count: () => deck.length, center: () => deck[Math.round(pos)], go: (k) => { target = k; tick(); }, setMode, deal };
  return {
    focus(i) { if (mode === "reading" && spread.some((x) => x[0] === i)) return; if (mode !== "fan") setMode("fan"); const k = deck.indexOf(i); if (k < 0) { suit = "all"; $("#dk-suits [data-suit=all]").click(); } const kk = deck.indexOf(i); if (kk >= 0) { target = kk; turned = kk; tick(); } },
    blur() {},
    back() { if (mode === "reading") { setMode("fan"); return true; } return false; },
    unmount() { cancelAnimationFrame(raf); delete window.__deck; }
  };
} });
