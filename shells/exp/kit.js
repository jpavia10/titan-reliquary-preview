/* Experimental UI kit (Grok, exp worker, 2026-10-20). Shared plumbing for the Experimental shells (one folder each under shells/):
   data loading (published data/ only, read only), the five contract points (any coin reachable, sourced facts + provenance,
   back/home, mute, search) and a neutral house look. Each experiment supplies only its own stage.
   Usage: export const mount = (root, svc) => xpMount(root, svc, { id, title, hint, stage: async (ctx) => ({ unmount, focus(i)?, back()? }) }) */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const yearOf = (f) => { const m = String(f.year || "").match(/\d{4}/); return m ? +m[0] : null; };
export const metalOf = (f) => { const s = ((f.metal || "") + " " + (f.denom || "") + " " + (f.label || "")).toLowerCase();
  return f.is_gold || /gold/.test(s) ? "gold" : f.is_silver || /silver/.test(s) ? "silver" : /bronze|copper/.test(s) ? "copper" : /nickel|cupro|steel|alumin|zinc/.test(s) ? "base" : "unknown"; };
const LVL = { verified: "Verified", checked: "Checked", reference: "Reference", photo: "Photo", guess: "AI guess", ledger: "From ledger" };
const FIELD = { catalog: "Catalogue", composition: "Metal", mintage: "Mintage", value: "Value", year: "Year", denomination: "Denomination", mint: "Mint", design: "Design", weight: "Weight", diameter: "Diameter", story: "Story" };

let actx = null;
export function audio(svc) { if (svc.isMuted()) return null; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) { return null; } return actx; }
/* a short struck-metal ping: pitch and brightness follow the coin, so every tap sounds like *that* coin */
export function ping(svc, freq = 880, bright = 0.5, pan = 0, gain = 0.18, dur = 1.2) {
  const a = audio(svc); if (!a) return; const t = a.currentTime, o = a.createGain(); o.gain.setValueAtTime(0.0001, t); o.gain.exponentialRampToValueAtTime(gain, t + 0.005); o.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = o; if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); o.connect(p); out = p; } out.connect(a.destination);
  [1, 2.76, 5.4, 8.93].forEach((r, k) => { const s = a.createOscillator(), g = a.createGain(); s.type = "sine"; s.frequency.value = freq * r; g.gain.value = k ? bright / (k * 1.6) : 1; s.connect(g); g.connect(o); s.start(t); s.stop(t + dur); });
}
export function coinTone(f) { const y = yearOf(f) || 1950, m = metalOf(f); return { freq: 220 * Math.pow(2, (y - 1850) / 60), bright: { gold: 0.25, silver: 0.7, copper: 0.35, base: 0.5, unknown: 0.4 }[m] }; }

export async function xpMount(root, svc, opt) {
  const ac = new AbortController(), signal = ac.signal;
  root.classList.add("xp"); document.documentElement.classList.add("xp-on"); root.dataset.xp = opt.id;
  root.innerHTML = `<div class="xp-stage" id="xp-stage"></div>
  <header class="xp-head"><button type="button" id="xp-back" aria-label="Back">←</button><div class="xp-title"><b>${esc(opt.title)}</b><span id="xp-sub">loading…</span></div>
    <button type="button" id="xp-search" aria-label="Search coins">⌕</button><button type="button" id="xp-mute" aria-label="Mute"></button><button type="button" id="xp-ui" aria-label="Choose a UI">UI</button></header>
  <div class="xp-hint" id="xp-hint">${esc(opt.hint || "")}</div>
  <div class="xp-find" id="xp-find" hidden><div class="xp-find-in"><input id="xp-q" type="search" placeholder="Country, year, denomination, C-number…" aria-label="Search coins" autocomplete="off"><button type="button" id="xp-find-x" aria-label="Close search">✕</button></div><div id="xp-list" role="list"></div></div>
  <section class="xp-sheet" id="xp-sheet" tabindex="-1" aria-live="polite"></section>`;
  const $ = (s) => root.querySelector(s);
  let idx; try { idx = await (await fetch("data/index.json")).json(); }
  catch (e) { root.innerHTML = '<p class="xp-err">Could not read the collection (offline before the first visit?). Classic still works.</p><button type="button" onclick="TitanShell.set(\'classic\')">Back to Classic</button>'; return { unmount() { root.innerHTML = ""; } }; }
  const flips = idx.flips.filter((f) => f.status !== "Removed");
  const details = new Map();
  const detail = (f) => { const d = f.d || "_misc"; if (!details.has(d)) details.set(d, fetch("data/detail/" + encodeURIComponent(d) + ".json").then((r) => r.json()).catch(() => ({}))); return details.get(d).then((m) => m[f.scan] || null); };
  let state = "home", cur = -1, stage = null;
  $("#xp-sub").textContent = `${flips.length} pieces · ${money(idx.board.grand)}`;

  /* (4) mute */
  const syncMute = () => { const m = svc.isMuted(); $("#xp-mute").textContent = m ? "🔇" : "🔊"; $("#xp-mute").setAttribute("aria-pressed", String(m)); $("#xp-mute").setAttribute("aria-label", m ? "Sound off (tap for on)" : "Sound on (tap to mute)"); };
  syncMute(); $("#xp-mute").addEventListener("click", () => { svc.setMuted(!svc.isMuted()); syncMute(); stage && stage.onMute && stage.onMute(svc.isMuted()); }, { signal });
  $("#xp-ui").addEventListener("click", () => svc.chooseUI(), { signal });

  /* (2) the coin sheet: published facts only, each with its certainty, who and when, and the source link */
  const sheet = $("#xp-sheet");
  async function open(i, from) {
    const f = flips[i]; if (!f) return; cur = i; state = "coin";
    sheet.innerHTML = `<h2>${esc(f.label)}</h2><div class="xp-sub">${esc(f.scan)}…</div>`; sheet.classList.add("open");
    if (from !== "stage" && stage && stage.focus) stage.focus(i);
    const r = await detail(f); if (cur !== i) return;
    const photos = (r && r.photos || []).map((p) => `<img src="${esc(p.url)}" alt="${esc(f.label)}, ${p.role === "obv" ? "front" : p.role === "rev" ? "back" : esc(p.role)}" loading="lazy">`).join("") || (f.thumb ? `<img src="${esc(f.thumb)}" alt="${esc(f.label)}">` : "");
    const cert = r && r.certainty ? Object.entries(r.certainty).filter(([, c]) => c && c.level).map(([k, c]) => `<dt>${esc(FIELD[k] || k)}</dt><dd><span class="lvl ${esc(c.level)}">${esc(LVL[c.level] || c.level)}</span> ${esc(c.by || "")}${c.ts ? " · " + esc(c.ts) : ""}${(c.links || []).slice(0, 1).map((u) => ` · <a href="${esc(u)}" target="_blank" rel="noopener">source</a>`).join("")}${c.like ? " · same as " + esc(FIELD[c.like] || c.like) : ""}</dd>`).join("") : "";
    sheet.innerHTML = `<button type="button" class="xp-close" id="xp-sheet-back" aria-label="Back">← Back</button><h2>${esc((r && r.label) || f.label)}</h2>
      <div class="xp-sub">${esc(f.scan)}${f.ser ? " · " + esc(f.ser) : ""} · ${f.est != null ? money(f.est) + " est. (" + esc(f.conf || "") + ")" : "no estimate yet"}</div>
      ${photos ? `<div class="xp-ph">${photos}</div>` : `<p class="xp-sub">No phone photo yet: on the shoot list.</p>`}
      ${r && r.story ? `<p>${esc(r.story)}</p>` : ""}${r && r.metal ? `<p class="xp-sub">${esc(r.metal)}${r.mintage ? " · mintage " + esc(r.mintage) : ""}</p>` : ""}
      ${cert ? `<h3>Where each fact comes from</h3><dl class="facts">${cert}</dl>` : `<p class="xp-sub">No sourced facts published yet for this coin.</p>`}
      <div class="xp-acts"><button type="button" id="xp-hold">Hold it (3D, every source)</button></div>`;
    $("#xp-hold").addEventListener("click", () => svc.openCoin(f.scan)); $("#xp-sheet-back").addEventListener("click", back);
    sheet.focus({ preventScroll: true });
  }
  /* (3) back: sheet -> stage's own back step -> the UI chooser (home is Classic) */
  function back() {
    if (!$("#xp-find").hidden) { $("#xp-find").hidden = true; return; }
    if (state === "coin") { sheet.classList.remove("open"); state = "home"; cur = -1; stage && stage.blur && stage.blur(); return; }
    if (stage && stage.back && stage.back()) return;
    svc.chooseUI();
  }
  $("#xp-back").addEventListener("click", back, { signal });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !svc.coverOpen()) back(); }, { signal, capture: true });   // capture: runs before the coin page closes itself

  /* (5) search */
  const norm = (s) => String(s || "").toLowerCase();
  function list(q) { const t = norm(q).split(/\s+/).filter(Boolean);
    const hits = flips.map((f, i) => [f, i]).filter(([f]) => t.every((w) => norm(`${f.label} ${f.scan} ${f.ser} ${f.country} ${f.continent} ${f.year} ${f.denom}`).includes(w))).slice(0, 80);
    $("#xp-list").innerHTML = hits.map(([f, i]) => `<button type="button" role="listitem" data-i="${i}">${f.thumb ? `<img src="${esc(f.thumb)}" alt="" loading="lazy">` : "<i></i>"}<span><b>${esc(f.label)}</b><small>${esc(f.scan)} · ${f.est != null ? money(f.est) : "—"}</small></span></button>`).join("") || '<p class="xp-sub">No coin matches.</p>'; }
  $("#xp-search").addEventListener("click", () => { $("#xp-find").hidden = false; list($("#xp-q").value); $("#xp-q").focus(); }, { signal });
  $("#xp-q").addEventListener("input", (e) => list(e.target.value), { signal });
  $("#xp-find-x").addEventListener("click", () => ($("#xp-find").hidden = true), { signal });
  $("#xp-list").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) { $("#xp-find").hidden = true; open(+b.dataset.i); } }, { signal });

  const ctx = { root, svc, idx, flips, detail, open, back, signal, stageEl: $("#xp-stage"), hint: (t) => { $("#xp-hint").textContent = t; }, lite: svc.lite() || matchMedia("(prefers-reduced-motion: reduce)").matches };
  try { stage = await opt.stage(ctx); } catch (e) { console.warn("experimental stage failed", e); ctx.stageEl.innerHTML = '<p class="xp-err">This experiment could not start here. Search and coin pages still work.</p>'; }
  window.__exp = { id: opt.id, state: () => state, open: (i) => open(i), back, count: flips.length, stage: () => stage };
  return { unmount() { ac.abort(); try { stage && stage.unmount && stage.unmount(); } catch (e) { /* ignore */ } if (window.__exp && window.__exp.id === opt.id) delete window.__exp; root.innerHTML = ""; document.documentElement.classList.remove("xp-on"); } };
}
