/* Titan Reliquary · Scan a coin (#scan, fix list #65, version 1).
   The phone's camera takes the photo; this page checks it (sharp enough, coin big enough, no burnt-out glare), names it exactly the way the
   pipeline expects ({id}_{Country}_{year}_{Denomination}_{obv|rev}.jpeg, `_v2` for a reshoot of a side that already has a photo,
   NOID_... for a coin that is not in the app yet: AI_START_HERE section 0) and hands the ORIGINAL file to the phone's share sheet:
   to Google Drive (folder STAGING) for the research loop, or to an AI app together with the reading prompt.
   It never calls an AI itself: the site is public and holds no keys. Which AI should read Phase 2 photos is decided by the locked test (#19).
   Coins to shoot come from data/reshoot.json (the Lab's shoot list, best first). Reuses the Health / Questions look (styles/health.css). */
(function () {
  "use strict";
  if (window.TitanScan) return;
  let root = null, lastFocus = null, shoot = null, flips = null;
  let pick = null;            // {id, country, year, denom, side, isNew, newText}
  let shot = null;            // {file, url, w, h, checks}
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const haptic = (kind) => { try { if (window.TitanHaptics) window.TitanHaptics.tick(kind); } catch (e) { /* no haptics */ } };

  function loadData() {
    const j = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    return Promise.all([shoot ? shoot : j("data/reshoot.json"), flips ? flips : j("data/index.json").then((d) => (d && d.flips) || [])])
      .then(([s, f]) => { shoot = s || { items: [], other_side: { items: [] } }; flips = f || []; });
  }
  function nextUp() {
    const a = (shoot.items || []).map((x) => Object.assign({ side: "obv", why: "no usable phone photo yet" }, x));
    const b = ((shoot.other_side || {}).items || []).map((x) => Object.assign({ why: "the other side" }, x));
    const seen = new Set(), out = [];
    for (const x of a.concat(b)) { const k = x.id + x.side; if (!seen.has(k)) { seen.add(k); out.push(x); } }
    return out;
  }

  /* ---------- names ---------- */
  const slug = (s) => String(s || "").replace(/\s*·.*$/, "").replace(/\b1\/2\b/g, "Half").replace(/[^A-Za-z0-9 ]+/g, " ").trim()
    .split(/\s+/).map((w) => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
  function fileName() {
    if (!pick) return "";
    if (pick.isNew) return `NOID_${slug(pick.newText || "coin")}_${pick.side}.jpeg`;
    const f = (flips || []).find((x) => x.scan === pick.id) || {};
    const v2 = pick.hasSide ? "_v2" : "";
    return `${pick.id}_${slug(f.country || pick.country)}_${String(f.year || pick.year || "ND").replace(/[^0-9A-Za-z-]/g, "")}_${slug(f.denom || pick.denom)}_${pick.side}${v2}.jpeg`;
  }

  /* ---------- photo checks (on a small copy; the original is what gets shared) ---------- */
  function analyse(img) {
    const S = 420, k = S / Math.max(img.naturalWidth, img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = 0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2];
    // background = the border; the coin = the biggest region near the middle that differs from it
    let bs = 0, bn = 0;
    for (let x = 0; x < w; x++) { bs += L[x] + L[(h - 1) * w + x]; bn += 2; }
    for (let y = 0; y < h; y++) { bs += L[y * w] + L[y * w + w - 1]; bn += 2; }
    const bg = bs / bn;
    let minx = w, miny = h, maxx = 0, maxy = 0, n = 0;
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      if (Math.abs(L[y * w + x] - bg) > 28) { n++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    const found = n > (w * h) * 0.02;
    const r = found ? Math.max(maxx - minx, maxy - miny) / 2 : Math.min(w, h) * 0.35;
    const cx = found ? (minx + maxx) / 2 : w / 2, cy = found ? (miny + maxy) / 2 : h / 2;
    // sharpness: variance of the Laplacian inside the coin; glare: share of burnt-out pixels inside the coin
    let s1 = 0, s2 = 0, m = 0, hot = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r * 0.8) continue;
      const i = y * w + x, lap = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - w] - L[i + w];
      s1 += lap; s2 += lap * lap; m++; if (L[i] > 250) hot++;
    }
    const varLap = m ? s2 / m - (s1 / m) * (s1 / m) : 0;
    const coinPx = Math.round((2 * r) / k);           // the coin's diameter in the ORIGINAL photo
    return { found, coinPx, sharp: varLap, glare: m ? hot / m : 0, fills: (2 * r) / Math.min(w, h),
             circle: { cx: cx / w, cy: cy / h, r: r / Math.min(w, h) } };
  }
  function verdicts(a) {
    return [
      { ok: a.found, text: a.found ? "Coin found in the middle" : "Could not find the coin: put it on a plain background that is darker or lighter than the coin" },
      { ok: a.coinPx >= 900, warn: a.coinPx >= 500, text: `Coin is ${a.coinPx} pixels across` + (a.coinPx >= 900 ? " (good)" : a.coinPx >= 500 ? " (usable; move closer for Phase 2)" : ": too small, move closer") },
      { ok: a.sharp >= 60, warn: a.sharp >= 25, text: a.sharp >= 60 ? "Sharp" : a.sharp >= 25 ? "A little soft: hold still, or tap the coin on the screen to focus" : "Blurry: hold still and tap the coin to focus, then retake" },
      { ok: a.glare <= 0.02, warn: a.glare <= 0.08, text: a.glare <= 0.02 ? "No glare" : "Glare on the coin: tilt the light or the coin, no flash" },
    ];
  }

  /* ---------- view ---------- */
  function html() {
    const items = nextUp().slice(0, 12);
    const name = fileName();
    const step1 = `<h2>1. Which coin?</h2>
      ${items.length ? `<p class="hv-sub">Next on your shoot list (the photos that settle the most come first):</p>
      <ol class="sc-list">${items.map((x) => `<li><button type="button" class="hv-btn sc-pick${pick && !pick.isNew && pick.id === x.id && pick.side === x.side ? " is-on" : ""}" data-pick="${esc(x.id)}" data-side="${esc(x.side)}">
        <b>${esc(x.id)}</b> ${esc(x.country)} ${esc(x.year)} · ${esc(String(x.denom || "").split(" · ")[0])} · <span>${x.side === "rev" ? "back" : "front"}: ${esc(x.why)}</span></button></li>`).join("")}</ol>` : ""}
      <label class="qv-free">Or another coin's id <input type="text" data-other maxlength="5" placeholder="e.g. C123" value="${pick && !pick.isNew && !items.some((x) => x.id === pick.id) ? esc(pick.id) : ""}"></label>
      <label class="qv-free">Or a coin that is not in the app yet: country, year, value <input type="text" data-new maxlength="60" placeholder="e.g. Mexico 1985 50 pesos" value="${pick && pick.isNew ? esc(pick.newText) : ""}"></label>`;
    const step2 = pick ? `<h2>2. Which side?</h2><div class="qv-opts" role="group" aria-label="Side">
        <button type="button" class="hv-btn qv-opt${pick.side === "obv" ? " is-on" : ""}" data-side-set="obv" aria-pressed="${pick.side === "obv"}">Front (obverse)</button>
        <button type="button" class="hv-btn qv-opt${pick.side === "rev" ? " is-on" : ""}" data-side-set="rev" aria-pressed="${pick.side === "rev"}">Back (reverse)</button></div>` : "";
    const step3 = pick ? `<h2>3. Take the photo</h2>
      <p class="hv-sub">Plain background, the coin in the middle third of the picture, light from one side, no flash. Tap the coin on the screen to focus.</p>
      <label class="hv-btn hv-primary sc-cam">Open the camera<input type="file" accept="image/*" capture="environment" data-cam hidden></label>
      ${shot ? `<div class="sc-prev"><img src="${esc(shot.url)}" alt="Your photo"><span class="sc-ring" style="left:${(shot.a.circle.cx * 100).toFixed(1)}%;top:${(shot.a.circle.cy * 100).toFixed(1)}%;width:${(shot.a.circle.r * 200 * Math.min(shot.w, shot.h) / shot.w).toFixed(1)}%;height:${(shot.a.circle.r * 200 * Math.min(shot.w, shot.h) / shot.h).toFixed(1)}%"></span></div>
        <ul class="sc-checks">${verdicts(shot.a).map((v) => `<li class="${v.ok ? "hv-ok" : v.warn ? "hv-warn" : "hv-bad"}">${v.ok ? "✓" : v.warn ? "!" : "✕"} ${esc(v.text)}</li>`).join("")}</ul>` : ""}` : "";
    const step4 = pick && shot ? `<h2>4. Send it</h2>
      <p class="hv-sub">File name: <code>${esc(name)}</code></p>
      <div class="qv-send"><button type="button" class="hv-btn hv-primary" data-send="drive">Save to Drive (STAGING)</button>
        <button type="button" class="hv-btn" data-send="ai">Ask an AI to read it</button>
        <button type="button" class="hv-btn" data-send="save">Save to this phone</button></div>
      <p class="hv-sub">Drive: choose the folder <b>Titan Reliquary / STAGING (drop coin photos here)</b>. The AIs pick it up from there, two of them read new coins blind, and the shoot list updates after the next merge.</p>
      <p class="qv-say" id="sc-say" role="status" hidden></p>` : "";
    return step1 + step2 + step3 + step4;
  }
  function applyTone() {      // the same light/dark choice as Questions: follow the active theme's background
    let dark = true;
    try {
      const m = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim().match(/^#([0-9a-f]{6})$/i);
      if (m) { const v = parseInt(m[1], 16); dark = (0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255 < 0.5; }
      else dark = !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
    } catch (e) { /* keep dark */ }
    root.dataset.tone = dark ? "dark" : "light";
  }
  function render() { const b = root.querySelector("#sc-body"); if (b) b.innerHTML = html(); }
  function say(m) { const s = root.querySelector("#sc-say"); if (s) { s.textContent = m; s.hidden = false; } }

  function choose(p) {
    pick = p; shot = null;
    if (!p || p.isNew) return render();
    const bridge = window.__galleryBridge;     // does this side already have a photo? then the new one is a reshoot (_v2)
    const done = (c) => { pick.hasSide = !!((c && c.photos) || []).some((x) => (x.role || x.side) === (pick.side === "obv" ? "obverse" : "reverse") || x.side === pick.side); render(); };
    if (bridge && bridge.ensureDetail) bridge.ensureDetail(p.id).then(done).catch(() => done(null)); else done(null);
  }
  function onPhoto(file) {
    if (!file) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { shot = { file, url, w: img.naturalWidth, h: img.naturalHeight, a: analyse(img) }; haptic("tap"); render(); root.querySelector(".sc-checks")?.scrollIntoView({ block: "nearest" }); };
    img.onerror = () => { shot = null; render(); alert("This photo could not be opened here. Try again, or send it from the Photos app."); };
    img.src = url;
  }
  async function send(how) {
    const name = fileName();
    const out = new File([shot.file], name, { type: shot.file.type || "image/jpeg" });
    const prompt = `Titan Reliquary, Phase 1 photo read. Photo: ${name}. Read only what you can see: country, year (Western), denomination, mint mark (or none), `
      + `and write a Phase 1 change file as https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/AI_START_HERE.md says ${pick.isNew ? "(a new coin: NEW-1)" : "(coin " + pick.id + " is already in the master: check it, do not create it)"}. `
      + "Upload the photo to Drive STAGING under this exact name first. Say null for anything you are not sure of.";
    if (how !== "save" && navigator.canShare && navigator.canShare({ files: [out] })) {
      try {
        await navigator.share(how === "ai" ? { files: [out], title: name, text: prompt } : { files: [out], title: name, text: "Save to Drive: Titan Reliquary / STAGING (drop coin photos here)" });
        haptic("success"); say(how === "ai" ? "Shared with the prompt. The AI's change file comes back through Drive." : "Shared. Pick the STAGING folder in Drive."); return;
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    if (how === "ai") { try { await navigator.clipboard.writeText(prompt); } catch (e) { /* no clipboard */ } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(out); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    say(how === "ai" ? "Saved the photo and copied the prompt: paste both into the AI app." : `Saved ${name}. Put it in Drive, folder STAGING.`);
  }

  function build() {
    root = document.createElement("div");
    root.id = "scan-view"; root.className = "health-view questions-view scan-view"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "sc-title");
    root.innerHTML = `<div class="hv-shell"><div class="hv-top"><h1 id="sc-title" tabindex="-1">Scan a coin</h1><button type="button" class="hv-btn" data-close>Close</button></div>
      <p class="hv-sub">Take a photo here: it is checked, named the way the AIs expect, and sent to Drive or to an AI in one tap.</p>
      <div id="sc-body"><p class="hv-status">Loading…</p></div></div>`;
    document.body.appendChild(root);
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-close]")) return close(true);
      const p = t.closest("[data-pick]");
      if (p) { const x = nextUp().find((i) => i.id === p.dataset.pick && i.side === p.dataset.side) || {}; return choose({ id: p.dataset.pick, side: p.dataset.side, country: x.country, year: x.year, denom: x.denom }); }
      const sd = t.closest("[data-side-set]");
      if (sd && pick) { pick.side = sd.dataset.sideSet; return choose(pick); }
      const snd = t.closest("[data-send]");
      if (snd && pick && shot) return send(snd.dataset.send);
    });
    root.addEventListener("change", (e) => {
      if (e.target.matches("[data-cam]")) onPhoto(e.target.files && e.target.files[0]);
      if (e.target.matches("[data-other]")) {
        const id = e.target.value.trim().toUpperCase(); const f = (flips || []).find((x) => x.scan === id);
        if (f) choose({ id, side: "obv", country: f.country, year: f.year, denom: f.denom }); else if (id) alert(id + " is not in the app. For a new coin, use the field below.");
      }
      if (e.target.matches("[data-new]")) { const v = e.target.value.trim(); if (v) choose({ isNew: true, newText: v, side: "obv" }); }
    });
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  }
  function open() {
    if (!root) build();
    if (!root.hidden) return;
    lastFocus = document.activeElement; root.hidden = false; document.body.style.overflow = "hidden"; root.scrollTop = 0;
    applyTone();
    root.querySelector("#sc-title").focus({ preventScroll: true });
    loadData().then(render);
  }
  function close(navigate) {
    if (!root || root.hidden) return;
    root.hidden = true; document.body.style.overflow = "";
    if (navigate && /^#scan/i.test(location.hash)) location.hash = "hall";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
  }
  function route() { if (/^#scan(\b|$)/i.test(location.hash)) open(); else close(false); }
  window.addEventListener("hashchange", route);
  window.TitanScan = { open, close, analyse, fileName: () => fileName() };
  if (/^#scan(\b|$)/i.test(location.hash)) setTimeout(route, 0);
})();
