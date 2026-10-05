/* Titan Reliquary · Simple view for Dad (#simple). Big type, plain sentences, three jobs:
   1. "What's missing?"  pick an album family -> years still missing (data/wants.json, the pipeline's master list)
   2. "Do I have...?"    one search box -> Yes / Not yet, with the flip photo (data/index.json flips + wants.json slots + search.json)
   3. "At a glance"      a few facts as sentences (data/index.json)
   Read-only: nothing here is typed by hand and nothing is written. Honesty: "Yes" only when the data says so
   (a filled album slot the ledger does not mark inferred, or a logged flip / bullion lot / set).
   Reached by the hash #simple (Hall button "Simple view"). Styles: styles/simple.css (own high-contrast palette,
   light or dark chosen from the active atmosphere's background). API: TitanSimple.open(), .close(), ._answer(q) for tests. */
(function () {
  "use strict";
  let root = null, idx = null, wants = null, search = null, loading = null, lastFocus = null;
  const state = { family: "American Silver Eagles", showAll: false };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const fmtInt = (n) => Number(n).toLocaleString("en-US");
  const money0 = (n) => "$" + Math.round(Number(n)).toLocaleString("en-US");
  const SYN = { half: "halve", halves: "halve", penny: "cent", pennies: "cent", cents: "cent", nickels: "nickel", dimes: "dime", quarters: "quarter", dollars: "dollar", eagles: "eagle", pfennigs: "pfennig" };
  const stem = (w) => SYN[w] || (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
  const STOP = new Set("the a an do i have my any coin coins in from of is there got did own with and for it me am are".split(" "));
  const words = (s) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

  function getJSON(url) { return fetch(url).then((r) => { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); }); }
  function load() {
    if (idx && wants) return Promise.resolve();
    if (loading) return loading;
    loading = Promise.all([
      window.vault && window.vault.flips ? window.vault : getJSON("data/index.json"),
      window.TitanWants && window.TitanWants.data ? window.TitanWants.data : getJSON("data/wants.json"),
    ]).then(([i, w]) => { idx = i; wants = w; }).catch((e) => { loading = null; throw e; });
    return loading;
  }
  function loadSearch() {
    if (search) return Promise.resolve(search);
    return getJSON("data/search.json").then((s) => (search = s)).catch(() => (search = []));
  }

  /* ---------- palette: light or dark, from the active atmosphere's background ---------- */
  function lum(c) {
    const m = String(c || "").trim().match(/^#([0-9a-f]{3,8})$/i);
    let r, g, b;
    if (m) { let h = m[1]; if (h.length < 6) h = h.split("").map((x) => x + x).join(""); r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
    else { const n = String(c).match(/[\d.]+/g); if (!n || n.length < 3) return null; [r, g, b] = n.map(Number); }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function applyTone() {
    if (!root) return;
    let l = null;
    try { l = lum(getComputedStyle(document.documentElement).getPropertyValue("--bg")); } catch (e) { /* ignore */ }
    if (l == null) l = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? 1 : 0;
    root.dataset.tone = l > 0.5 ? "light" : "dark";
  }

  /* ---------- album data helpers ---------- */
  const slotText = (s) => (/^\d{4}(-[A-Z]{1,2})?$/.test(s.label) ? s.label : String(s.year || s.label));
  const slotSort = (a, b) => (a.year || 0) - (b.year || 0) || String(a.mint || "").localeCompare(String(b.mint || ""));
  const volName = (v) => String(v.title || "").split(" · ").pop();
  function families() {
    const m = new Map();
    for (const v of wants.volumes) { if (!m.has(v.family)) m.set(v.family, []); m.get(v.family).push(v); }
    return m;
  }
  const famNice = (f) => f.replace(/^American /, "");

  /* ---------- 1. What's missing ---------- */
  function volAnswer(v) {
    const total = v.slots_total, have = v.filled;
    const head = `<h4>${esc(volName(v))} <span class="sv-id">(album ${esc(v.id)})</span></h4>`;
    if (v.missing === 0) return `<article class="sv-card">${head}<p class="sv-big"><strong>Nothing missing.</strong> You have all ${total == null ? have : total}.</p></article>`;
    if (v.missing == null) return `<article class="sv-card">${head}<p class="sv-big">The ledger does not say how many are missing here yet.</p></article>`;
    const miss = (v.missing_named || []).slice().sort(slotSort);
    const unnamed = v.unnamed_missing || 0;
    let h = `<article class="sv-card">${head}<p class="sv-big">You have <strong>${fmtInt(have)}</strong>${total != null ? ` of <strong>${fmtInt(total)}</strong>` : ""}. <strong>${fmtInt(v.missing)} missing.</strong></p>`;
    if (miss.length) h += `<p class="sv-label" id="m-${esc(v.id)}">Missing:</p><ul class="sv-chips" aria-labelledby="m-${esc(v.id)}">${miss.map((s) => `<li>${esc(slotText(s))}</li>`).join("")}</ul>`;
    if (unnamed) h += `<p class="sv-note">${unnamed} more empty ${unnamed === 1 ? "spot" : "spots"} cannot be named yet. They need a fresh photo of the album page.</p>`;
    if (v.maybe_missing && v.maybe_missing.length) h += `<p class="sv-note">Not sure about: ${v.maybe_missing.slice().sort(slotSort).map((s) => esc(slotText(s))).join(", ")}.</p>`;
    return h + "</article>";
  }
  function renderMissing() {
    const fam = families();
    const names = [...fam.keys()];
    if (!fam.has(state.family)) state.family = names[0];
    const btns = names.map((f) => {
      const vs = fam.get(f), miss = vs.reduce((a, v) => a + (v.missing || 0), 0);
      return `<button type="button" class="sv-fam" data-fam="${esc(f)}" aria-pressed="${f === state.family}"><span>${esc(famNice(f))}</span><small>${miss} missing</small></button>`;
    }).join("");
    const vs = fam.get(state.family);
    const sumHave = vs.reduce((a, v) => a + (v.filled || 0), 0), sumMiss = vs.reduce((a, v) => a + (v.missing || 0), 0);
    root.querySelector("#sv-fams").innerHTML = btns;
    root.querySelector("#sv-missing-out").innerHTML = `<h3 class="sv-answer-title">${esc(famNice(state.family))}: you have ${fmtInt(sumHave)}, missing ${fmtInt(sumMiss)}</h3>` +
      (vs.length > 1 ? `<p class="sv-note">This series has ${vs.length} albums, listed below.</p>` : "") + vs.map(volAnswer).join("");
  }

  /* ---------- 2. Do I have ...? ---------- */
  function parse(q) {
    const toks = words(q);
    let year = null, mint = null;
    const ws = [];
    for (const t of toks) {
      if (/^(1[5-9]|20)\d\d$/.test(t) && year == null) year = Number(t);
      else if (/^[pdsw]$/.test(t)) mint = t.toUpperCase();
      else if (!STOP.has(t) && t.length > 1) ws.push(stem(t));
    }
    return { year, mint, ws, raw: String(q || "").trim() };
  }
  const hasWord = (hayToks, w) => hayToks.some((h) => h === w || (w.length >= 3 && h.startsWith(w)));
  function volMatches(v, p) {
    if (!p.ws.length) return true;
    const hay = words([v.family, v.title, v.denomination, v.metal].join(" ")).map(stem);
    return p.ws.every((w) => hasWord(hay, w));
  }
  function itemMatches(f, p) {
    const hay = words([f.country, f.denom, f.label, f.mint].join(" ")).map(stem);
    if (p.year != null && String(f.year).slice(0, 4) !== String(p.year)) return false;
    return p.ws.every((w) => hasWord(hay, w));
  }
  const mintOk = (s, p) => !p.mint || String(s.mint || "").toUpperCase() === p.mint;

  function answerFor(q) {
    const p = parse(q);
    if (!p.ws.length && p.year == null) return { p, empty: true };
    const res = { p, albums: [], flips: [], coverNoSlot: [] };
    for (const v of wants.volumes) {
      if (!volMatches(v, p)) continue;
      if (p.year == null) { if (p.ws.length) res.albums.push({ v, summary: true }); continue; }
      const have = (v.have_named || []).filter((s) => s.year === p.year && mintOk(s, p));
      const miss = (v.missing_named || []).filter((s) => s.year === p.year && mintOk(s, p));
      const maybe = (v.maybe_missing || []).filter((s) => s.year === p.year && mintOk(s, p));
      if (have.length || miss.length || maybe.length) res.albums.push({ v, have, miss, maybe });
      else if (v.year_start && p.year >= v.year_start && (!v.year_end || p.year <= v.year_end)) res.coverNoSlot.push(v);
    }
    for (const pool of [idx.flips, idx.bullion, idx.sets, idx.housing, idx.stamps]) for (const f of pool || []) if (itemMatches(f, p)) res.flips.push(f);
    return res;
  }

  const flipName = (f) => (f.kind === "flip" || f.kind === "token" ? `${f.country} ${f.year} ${f.denom}` : f.label || `${f.country} ${f.year} ${f.denom}`);
  function flipCard(f) {
    const img = f.thumb ? `<img src="${esc(f.thumb)}" alt="Phone photo of ${esc(flipName(f))}" width="88" height="88" loading="lazy">` : `<span class="sv-noimg" aria-hidden="true">no photo yet</span>`;
    const where = f.kind === "flip" || f.kind === "token" ? "flip" : f.kind === "bullion" ? "bullion lot" : f.kind === "set" ? "set" : "item";
    return `<li><a class="sv-flip" href="#coin=${esc(f.scan)}">${img}<span class="sv-flip-t"><strong>${esc(flipName(f))}</strong><span>${where} ${esc(f.scan)}. Tap to open.</span></span></a></li>`;
  }
  const LIMIT = 6;
  function renderAnswer(q) {
    const out = root.querySelector("#sv-find-out");
    if (!idx || !wants) return;
    if (!String(q || "").trim()) { out.innerHTML = ""; return; }
    const r = answerFor(q);
    if (r.empty) { out.innerHTML = `<p class="sv-big">Type a year, a coin or a country. For example: <em>1964 Kennedy</em>.</p>`; return; }
    const yes = [], miss = [], maybes = [];
    for (const a of r.albums) {
      if (a.summary) continue;
      const nm = volName(a.v);
      const hv = a.have.filter((s) => !s.inferred), inf = a.have.filter((s) => s.inferred);
      if (hv.length) yes.push(`<p class="sv-big"><span class="sv-tag sv-yes">Yes</span> The ${esc(nm)} album (${esc(a.v.id)}) has <strong>${hv.map((s) => esc(slotText(s))).join(" and ")}</strong>.</p>`);
      if (inf.length) maybes.push(`<p class="sv-big"><span class="sv-tag sv-maybe">Probably</span> ${inf.map((s) => esc(slotText(s))).join(" and ")} in the ${esc(nm)} album (${esc(a.v.id)}) is filled by counting, not yet confirmed from a photo.</p>`);
      if (a.miss.length) miss.push(`<p class="sv-big"><span class="sv-tag sv-no">Missing</span> from album ${esc(a.v.id)} (${esc(nm)}): <strong>${a.miss.map((s) => esc(slotText(s))).join(" and ")}</strong>. That hole is empty.</p>`);
      if (a.maybe.length) maybes.push(`<p class="sv-big"><span class="sv-tag sv-maybe">Not sure</span> ${a.maybe.map((s) => esc(slotText(s))).join(", ")} in album ${esc(a.v.id)}.</p>`);
    }
    const shown = state.showAll ? r.flips : r.flips.slice(0, LIMIT);
    if (r.flips.length) {
      yes.push(`<p class="sv-big"><span class="sv-tag sv-yes">Yes</span> ${r.flips.length === 1 ? "You have this one" : `You have <strong>${r.flips.length}</strong> that match`} in flips, bullion or sets:</p><ul class="sv-flips">${shown.map(flipCard).join("")}</ul>` +
        (r.flips.length > LIMIT && !state.showAll ? `<button type="button" class="sv-btn" data-showall>Show all ${r.flips.length}</button>` : ""));
    }
    let html = yes.join("") + maybes.join("") + miss.join("");
    const sums = r.albums.filter((a) => a.summary);
    if (sums.length) {
      html += `<p class="sv-big">Albums that match:</p><ul class="sv-sums">${sums.map((a) => `<li><button type="button" class="sv-btn sv-wide" data-showfam="${esc(a.v.family)}">${esc(volName(a.v))}: ${a.v.filled} filled, ${a.v.missing == null ? "?" : a.v.missing} missing. See the list</button></li>`).join("")}</ul>`;
    }
    const cover = r.coverNoSlot.length && r.p.year != null
      ? `<p class="sv-note">Album ${r.coverNoSlot.map((v) => esc(v.id) + " (" + esc(volName(v)) + ")").join(", ")} covers ${r.p.year}, but the list has no named slot for it.</p>` : "";
    if (!yes.length && !maybes.length && !miss.length && !sums.length) {
      out.innerHTML = `<p class="sv-big"><span class="sv-tag sv-no">Not yet</span> Not in the collection yet. I found no flip, bullion lot or album slot for “${esc(r.p.raw)}”.</p>${cover}<div id="sv-notes"></div>`;
      fallbackNotes(r, out.querySelector("#sv-notes"));
      return;
    }
    out.innerHTML = html + (miss.length || yes.length ? "" : cover);
  }
  // last resort: the coin notes (data/search.json) mention every word. Said plainly as "mentioned", never as "you have".
  function fallbackNotes(r, el) {
    const need = [...r.p.ws, ...(r.p.year != null ? [String(r.p.year)] : [])];
    if (!need.length) return;
    loadSearch().then((s) => {
      const hits = [];
      for (const row of Array.isArray(s) ? s : Object.entries(s)) {
        if (typeof row[1] === "string" && need.every((w) => row[1].includes(w))) hits.push(row[0]);
        if (hits.length >= 5) break;
      }
      const pools = [idx.flips, idx.bullion, idx.sets, idx.housing, idx.stamps];
      const items = hits.map((id) => { for (const pool of pools) { const f = (pool || []).find((x) => x.scan === id); if (f) return f; } return null; }).filter(Boolean);
      if (items.length && el.isConnected) el.innerHTML = `<p class="sv-note">The notes on these coins mention it, so they may be close:</p><ul class="sv-flips">${items.map(flipCard).join("")}</ul>`;
    });
  }

  /* ---------- 3. At a glance ---------- */
  function renderGlance() {
    const c = idx.counts || {}, pr = idx.precious || {}, b = idx.board || {};
    const filled = wants.volumes.reduce((a, v) => a + (v.filled || 0), 0);
    const miss = wants.volumes.reduce((a, v) => a + (v.missing || 0), 0);
    const ag = pr.combined_silver && pr.combined_silver.oz, au = pr.combined_gold && pr.combined_gold.oz;
    const facts = [
      `You have <strong>${fmtInt(c.flips || 0)}</strong> coins and tokens in flips, from <strong>${fmtInt(c.countries || 0)}</strong> countries.`,
      `Your ${wants.volumes.length} albums hold <strong>${fmtInt(filled)}</strong> coins, with <strong>${fmtInt(miss)}</strong> empty spots still to fill.`,
    ];
    if (ag != null) facts.push(`You own about <strong>${(+ag).toFixed(1)} troy ounces</strong> of silver${au ? ` and <strong>${(+au).toFixed(2)}</strong> of gold` : ""}.`);
    if (b.grand) facts.push(`The whole collection is worth about <strong>${money0(b.grand)}</strong>. It is on HOLD, not for sale.`);
    root.querySelector("#sv-glance-list").innerHTML = facts.map((f) => `<li class="sv-big">${f}</li>`).join("");
  }

  /* ---------- shell ---------- */
  function build() {
    root = document.createElement("div");
    root.id = "simple-view"; root.className = "simple-view"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "sv-title");
    root.innerHTML = `
      <div class="sv-shell">
        <div class="sv-top">
          <h1 id="sv-title" tabindex="-1">Simple view</h1>
          <button type="button" class="sv-btn" data-close>Back to the collection</button>
        </div>
        <nav class="sv-jump" aria-label="Sections"><a href="#sv-sec-find" data-jump="sv-sec-find">Do I have…?</a><a href="#sv-sec-missing" data-jump="sv-sec-missing">What's missing?</a><a href="#sv-sec-glance" data-jump="sv-sec-glance">At a glance</a></nav>
        <section id="sv-sec-find" aria-labelledby="sv-h-find">
          <h2 id="sv-h-find">Do I have…?</h2>
          <form id="sv-form" role="search" autocomplete="off">
            <label for="sv-q">Type a coin, a year or a country</label>
            <div class="sv-row"><input id="sv-q" type="search" inputmode="search" enterkeyhint="search" placeholder="for example: 1964 Kennedy" spellcheck="false">
            <button type="submit" class="sv-btn sv-primary">Look</button></div>
            <p class="sv-eg">Try: <button type="button" class="sv-eg-btn" data-eg="1964 Kennedy">1964 Kennedy</button> <button type="button" class="sv-eg-btn" data-eg="Silver Eagle 2008">Silver Eagle 2008</button> <button type="button" class="sv-eg-btn" data-eg="Germany 1971">Germany 1971</button></p>
          </form>
          <div id="sv-find-out" class="sv-out" aria-live="polite"></div>
        </section>
        <section id="sv-sec-missing" aria-labelledby="sv-h-missing">
          <h2 id="sv-h-missing">What's missing?</h2>
          <p class="sv-big">Pick an album series:</p>
          <div id="sv-fams" class="sv-fams" role="group" aria-label="Album series"></div>
          <div id="sv-missing-out" class="sv-out" aria-live="polite"></div>
        </section>
        <section id="sv-sec-glance" aria-labelledby="sv-h-glance">
          <h2 id="sv-h-glance">At a glance</h2>
          <ul id="sv-glance-list" class="sv-glance"></ul>
        </section>
        <p class="sv-foot">Everything here is read from the collection list. If something looks wrong, tell Joseph.</p>
      </div>`;
    document.body.appendChild(root);
    const qEl = () => root.querySelector("#sv-q");
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-close]")) { close(true); return; }
      const fam = t.closest("[data-fam]");
      if (fam) { state.family = fam.dataset.fam; renderMissing(); return; }
      const j = t.closest("[data-jump]");
      if (j) { e.preventDefault(); const el = root.querySelector("#" + j.dataset.jump); const h = el.querySelector("h2"); el.scrollIntoView(); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); return; }
      const eg = t.closest("[data-eg]");
      if (eg) { qEl().value = eg.dataset.eg; state.showAll = false; renderAnswer(qEl().value); return; }
      if (t.closest("[data-showall]")) { state.showAll = true; renderAnswer(qEl().value); return; }
      const sf = t.closest("[data-showfam]");
      if (sf) { state.family = sf.dataset.showfam; renderMissing(); root.querySelector("#sv-sec-missing").scrollIntoView(); }
      // a coin link (#coin=...) is opened by the app's router; the hashchange handler below hides this view
    });
    root.querySelector("#sv-form").addEventListener("submit", (e) => { e.preventDefault(); state.showAll = false; renderAnswer(qEl().value); });
    let timer = 0;
    qEl().addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { state.showAll = false; renderAnswer(e.target.value); }, 350); });
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  }

  function open() {
    if (!root) build();
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    applyTone();
    root.hidden = false;
    document.body.classList.add("simple-open");
    window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "simple-open" } }));
    document.body.style.overflow = "hidden";
    root.scrollTop = 0;
    root.querySelector("#sv-title").focus({ preventScroll: true });
    load().then(() => {
      if (root.hidden) return;
      renderGlance(); renderMissing();
      const q = root.querySelector("#sv-q").value; if (q) renderAnswer(q);
    }).catch(() => {
      root.querySelector("#sv-missing-out").innerHTML = `<p class="sv-big">The collection list could not be loaded. Open the app once while online, then it also works offline.</p>`;
    });
  }
  function close(navigate) {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("simple-open");
    window.dispatchEvent(new CustomEvent("titan:ui", { detail: { kind: "simple-close" } }));
    document.body.style.overflow = "";
    if (navigate && /^#simple/i.test(location.hash)) location.hash = "hall";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
  }
  function route() { if (/^#simple(\b|$)/i.test(location.hash)) open(); else close(false); }
  window.addEventListener("hashchange", route);
  window.addEventListener("titan:atmo", applyTone);
  window.TitanSimple = { open, close, load, _answer: (q) => answerFor(q) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", route); else route();
})();
