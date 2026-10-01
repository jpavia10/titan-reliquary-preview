/* Titan Reliquary · Curator's Study wing (albums): "Which years am I missing?"
   - Reads ledger album data from window.TITAN_ALBUMS (wings/albums-data.js, generated from
     schema/seed/albums.seed.json). Nothing here invents which coins are present.
   - Inventory Mode: the owner marks each slot (have / missing / not in album / key date).
     Marks live in localStorage (versioned key) and export/import as JSON; every hole, want list,
     meter and "years missing" answer is COMPUTED from ledger + owner marks, never typed.
   - Hooks into the app without moving its code: MutationObservers on #study-body and the binder
     inspector grid, a capture-phase click hook for the old "Want List" buttons, and
     window.TitanStudy.inspectorVolume() which app.js's renderAlbumInspectorView() asks for slots. */
(function () {
  "use strict";

  const STORE_KEY = "tr_study_albums_v1";
  const PREF_KEY = "tr_study_family_v1";
  const SCHEMA = "titan-reliquary/album-inventory";
  const VERSION = 1;

  const FAMILY_ORDER = [
    "American Silver Eagles", "Kennedy halves", "Washington quarters", "Dollar albums",
    "Roosevelt dimes", "Lincoln cents", "Indian / Flying Eagle", "Type set",
    "Jefferson nickels", "Canada small cents", "Buffalo nickels", "Mercury"
  ];
  const FAMILY_NAMES = {
    "American Silver Eagles": "American Silver Eagles",
    "Kennedy halves": "Kennedy Half Dollars",
    "Washington quarters": "Washington Quarters",
    "Dollar albums": "Dollar Coins",
    "Roosevelt dimes": "Roosevelt Dimes",
    "Lincoln cents": "Lincoln Cents",
    "Indian / Flying Eagle": "Indian Head & Flying Eagle Cents",
    "Type set": "20th Century Type Set",
    "Jefferson nickels": "Jefferson Nickels",
    "Canada small cents": "Canada Small Cents",
    "Buffalo nickels": "Buffalo Nickels",
    "Mercury": "Mercury Dimes"
  };
  const famName = (f) => FAMILY_NAMES[f] || f;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const toast = (msg) => { try { if (typeof window.showToast === "function") window.showToast(msg); } catch (e) { /* ignore */ } };
  const today = () => new Date().toISOString().slice(0, 10);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;

  /* ─────────────── storage (owner marks) ─────────────── */
  function emptyStore() { return { schema: SCHEMA, version: VERSION, updated: null, volumes: {} }; }
  let store = loadStore();
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyStore();
      const o = JSON.parse(raw);
      if (!o || o.schema !== SCHEMA || o.version !== VERSION || typeof o.volumes !== "object") return emptyStore();
      return o;
    } catch (e) { return emptyStore(); }
  }
  function saveStore() {
    store.updated = new Date().toISOString();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; } catch (e) { toast("Could not save on this device (storage blocked). Use Export to keep your marks."); return false; }
  }
  function volStore(id, create) {
    let v = store.volumes[id];
    if (!v && create) { v = store.volumes[id] = { marks: {}, added: [], updated: null }; }
    if (v) { v.marks = v.marks || {}; v.added = v.added || []; }
    return v || null;
  }

  /* ─────────────── ledger model ─────────────── */
  const MINT_ORDER = { "": 0, P: 1, D: 2, S: 3, W: 4, O: 5, CC: 6 };
  const normLabel = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, " ");
  const slugKey = (s) => normLabel(s).replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  function parseLabel(label) {
    const s = String(label);
    const ym = s.match(/\b(1[6-9]\d\d|20\d\d)\b/);
    const year = ym ? Number(ym[1]) : null;
    let mint = "";
    let m = s.match(/\b(?:1[6-9]\d\d|20\d\d)-([A-Z]{1,2})\b/) || s.match(/^([PDSW]) (?:1[6-9]|20)\d\d\b/) || s.match(/-([PDSW])$/) || s.match(/\(([PDSW])\)/) || s.match(/\b(?:1[6-9]\d\d|20\d\d)\s([PDSW])\b/);
    if (m) mint = m[1];
    return { year, mint };
  }
  const isAggregate = (label) => /^(all|most|nearly|both|one open|every)\b/i.test(label) || /\(both\)/i.test(label) || /\b\d{4}\s*[-–]\s*\d{4}\b/.test(label);
  const isFuture = (label) => /^future\b/i.test(label);
  function yearRange(title) {
    const m = String(title).match(/(\d{4})\s*[-–]\s*(\d{4})/);
    return m ? [Number(m[1]), Number(m[2])] : null;
  }
  /** A year-based grid is derived ONLY when the ledger's exact slot total equals years x mints. */
  function derivedLayout(v) {
    const r = yearRange(v.title);
    if (!r || !v.slots_total || v.slots_approx) return null;
    if (/state|park|presidential|women|innovation|type|native|anthony|eisenhower/i.test(v.title)) return null;
    const n = r[1] - r[0] + 1;
    const layouts = [["year", [""]], ["pd", ["P", "D"]], ["pds", ["P", "D", "S"]]];
    for (const [name, mints] of layouts) {
      if (n * mints.length === v.slots_total) return { name, mints, from: r[0], to: r[1], years: n };
    }
    return null;
  }
  function slotSort(a, b) {
    const ya = a.year == null ? 99999 : a.year, yb = b.year == null ? 99999 : b.year;
    if (ya !== yb) return ya - yb;
    const ma = MINT_ORDER[a.mint] ?? 9, mb = MINT_ORDER[b.mint] ?? 9;
    if (ma !== mb) return ma - mb;
    return a.label.localeCompare(b.label);
  }

  let ledgerById = null;
  function ledger() {
    if (ledgerById) return ledgerById;
    ledgerById = {};
    const data = window.TITAN_ALBUMS;
    if (!data || !Array.isArray(data.volumes)) return ledgerById;
    for (const v of data.volumes) ledgerById[v.id] = v;
    return ledgerById;
  }
  function familyVolumes(fam) {
    const start = (v) => { const r = yearRange(v.title); if (r) return r[0]; const m = String(v.title).match(/(1[6-9]\d\d|20\d\d)/); return m ? Number(m[1]) : 9999; };
    return Object.values(ledger()).filter((v) => v.family === fam).sort((a, b) => (start(a) - start(b)) || a.id.localeCompare(b.id));
  }
  function families() {
    const fams = new Set(Object.values(ledger()).map((v) => v.family));
    const out = FAMILY_ORDER.filter((f) => fams.has(f));
    for (const f of fams) if (!out.includes(f)) out.push(f);
    return out;
  }

  /** Build the effective slot list for a volume: ledger-named slots + derived layout + slots the owner added,
      each with ledger state, owner mark and the resulting state. */
  function buildVolume(id) {
    const v = ledger()[id];
    if (!v) return null;
    const vs = volStore(id, false);
    const marks = (vs && vs.marks) || {};
    const byNorm = new Map();
    const slots = [];
    const aggregates = [];
    const add = (label, ledgerState, source) => {
      const n = normLabel(label);
      if (byNorm.has(n)) { const s = byNorm.get(n); if (ledgerState && !s.ledger) s.ledger = ledgerState; return s; }
      const p = parseLabel(label);
      const s = { key: (source === "owner" ? "u:" : "") + slugKey(label), label: String(label), year: p.year, mint: p.mint, ledger: ledgerState || null, source, future: isFuture(label) };
      byNorm.set(n, s);
      slots.push(s);
      return s;
    };
    const lay = derivedLayout(v);
    if (lay) {
      for (let y = lay.from; y <= lay.to; y++) for (const m of lay.mints) add(m ? `${y}-${m}` : String(y), null, "layout");
    }
    const attach = (label, st) => {
      if (isAggregate(label)) { aggregates.push({ label, state: st }); return; }
      // "1988" in a P/D grid is the P slot
      if (lay && lay.mints[0] === "P" && /^\d{4}$/.test(String(label).trim())) label = `${label}-P`;
      add(label, st, "ledger");
    };
    (v.filled || []).forEach((l) => attach(l, "filled"));
    (v.holes || []).forEach((l) => attach(l, "empty"));
    (vs ? vs.added : []).forEach((a) => add(a.label, null, "owner"));
    for (const s of slots) {
      const mk = marks[s.key] || null;
      s.mark = mk && mk.state ? mk.state : null;
      s.keyDate = !!(mk && mk.key);
      s.state = s.mark || s.ledger || "unchecked";
      s.by = s.mark ? "you" : (s.ledger ? "ledger" : null);
    }
    slots.sort(slotSort);

    const c = { filled: 0, empty: 0, na: 0, unchecked: 0, you: 0 };
    for (const s of slots) { c[s.state === "not_applicable" ? "na" : s.state]++; if (s.mark) c.you++; }
    const inBook = slots.length - c.na;
    const total = v.slots_total;
    let rem = null, remFilled = null, remEmpty = null;
    if (total != null) {
      rem = Math.max(0, total - inBook);
      const claimed = v.filled_count != null ? v.filled_count : null;
      if (claimed != null) {
        remFilled = Math.max(0, Math.min(rem, claimed - c.filled));
        remEmpty = rem - remFilled;
      }
    }
    const missing = slots.filter((s) => s.state === "empty" && !s.future);
    const future = slots.filter((s) => s.state === "empty" && s.future);
    // Status: nothing unverified may look certain.
    let status, statusText;
    const listComplete = total != null && !v.slots_approx && c.unchecked === 0 && (remEmpty === 0) && aggregates.length === 0;
    if (slots.length && c.you === slots.length && rem === 0 && !v.slots_approx) { status = "confirmed"; statusText = "Checked by you, slot by slot"; }
    else if (v.evidence === "enumerated" && c.unchecked === 0) { status = "ledger"; statusText = "Ledger: every slot accounted for"; }
    else if (v.evidence === "count-only") { status = "needs"; statusText = "Ledger has counts only: needs inventory"; }
    else { status = "needs"; statusText = "Ledger is partial: needs inventory"; }
    return {
      id, v, layout: lay, slots, aggregates, counts: c, total, approx: !!v.slots_approx,
      rem, remFilled, remEmpty, missing, future, listComplete, status, statusText,
      filledCount: total != null && c.unchecked === 0 && remFilled != null ? c.filled + remFilled : (v.filled_count != null ? v.filled_count : c.filled),
      edited: vs && vs.updated ? vs.updated : null
    };
  }

  function evidenceBadge(b) {
    const cls = b.status === "confirmed" ? "ok" : b.status === "ledger" ? "ledger" : "needs";
    const icon = b.status === "confirmed" ? "✓" : b.status === "ledger" ? "📜" : "⚠";
    return `<span class="study-ev study-ev-${cls}" title="${esc(b.v.note || "")}">${icon} ${esc(b.statusText)}</span>`;
  }
  function rangeText(b) {
    const r = yearRange(b.v.title);
    if (r) return `${r[0]}–${r[1]}`;
    const m = String(b.v.title).match(/Starting (\d{4})/i);
    return m ? `${m[1]} onward` : "";
  }
  function shortTitle(v) { return String(v.title).replace(/^Whitman\s*\d*\s*·\s*/i, ""); }

  /* ─────────────── family answer (the founding question) ─────────────── */
  function familyAnswer(fam) {
    const vols = familyVolumes(fam).map((v) => buildVolume(v.id));
    const named = vols.reduce((n, b) => n + b.missing.length, 0);
    const unnamedOpen = vols.reduce((n, b) => n + (b.remEmpty || 0), 0);
    const unknownVols = vols.filter((b) => !b.listComplete && !(b.counts.filled === 0 && b.remFilled === 0 && b.rem === b.total));
    const needs = vols.filter((b) => b.status === "needs").length;
    const ev = { enumerated: 0, partial: 0, "count-only": 0, confirmed: 0 };
    vols.forEach((b) => { if (b.status === "confirmed") ev.confirmed++; else ev[b.v.evidence] = (ev[b.v.evidence] || 0) + 1; });
    // "Complete" only when every binder is ledger-enumerated (or checked by the owner) and nothing is unnamed.
    const allConfirmed = vols.every((b) => b.status === "confirmed" || b.v.evidence === "enumerated");
    return { fam, vols, named, unnamedOpen, needs, ev, complete: unknownVols.length === 0 && allConfirmed };
  }

  function volumeAnswerHtml(b, opts) {
    const big = opts && opts.big;
    const chips = b.missing.map((s) => `<li class="study-miss-chip${s.keyDate ? " is-key" : ""}${s.by === "you" ? " by-you" : ""}"><span>${esc(s.label)}</span>${s.keyDate ? '<em aria-label="key date">★ key</em>' : ""}</li>`).join("");
    const lines = [];
    if (b.future.length) lines.push(`${plural(b.future.length, "empty slot")} kept for future years (${esc(b.future.map((s) => s.label.replace(/^future slot \d+\s*/i, "").replace(/^\((.*)\)$/, "$1")).filter((x, i, a) => a.indexOf(x) === i).join(", "))}).`);
    if (b.aggregates.length) lines.push(`Ledger notes on other holes: ${b.aggregates.map((a) => `<q>${esc(a.label)}</q>`).join(", ")}.`);
    if (b.counts.unchecked) lines.push(`${plural(b.counts.unchecked, "slot")} not checked yet.`);
    if (b.total == null) lines.push(`The ledger does not give this binder's slot total${b.v.filled_count != null ? ` (it holds ${b.v.filled_count} coins)` : ""}.`);
    else if (b.remEmpty) lines.push(`${b.approx ? "About " : ""}${plural(b.remEmpty, "more open slot")} whose ${b.remEmpty === 1 ? "date is" : "dates are"} not named in the ledger.`);
    if (b.remFilled && b.status !== "confirmed" && b.v.evidence !== "enumerated") lines.push(`${plural(b.remFilled, "filled slot")} not itemized.`);
    const allOpen = b.total && b.filledCount === 0;
    const head = b.missing.length
      ? `<strong class="study-vol-count">${b.missing.length}</strong> missing`
      : (allOpen ? `<strong class="study-vol-count">Empty binder</strong>` : (b.listComplete && (b.status === "confirmed" || b.v.evidence === "enumerated") ? `<strong class="study-vol-count ok">Complete</strong>` : `<strong class="study-vol-count">None named yet</strong>`));
    return `
      <article class="study-vol-answer${big ? " big" : ""}" data-vol="${esc(b.id)}">
        <header>
          <div>
            <div class="study-vol-id">${esc(b.id)} · ${esc(rangeText(b))}</div>
            <h4>${esc(shortTitle(b.v))}</h4>
          </div>
          <div class="study-vol-head">${head}</div>
        </header>
        <div class="study-vol-meta">${evidenceBadge(b)}
          <span class="study-vol-fill">${b.total != null ? `${b.approx ? "≈" : ""}${b.filledCount} of ${b.total} slots filled` : `${b.v.filled_count ?? "?"} coins · slot total unknown`}</span>
        </div>
        ${chips ? `<ul class="study-miss-chips" aria-label="Missing in ${esc(b.id)}">${chips}</ul>` : ""}
        ${lines.length ? `<p class="study-vol-notes">${lines.join(" ")}</p>` : ""}
        <div class="study-vol-actions">
          <button type="button" class="study-btn" data-study-inv="${esc(b.id)}">✎ ${b.status === "needs" ? "Take inventory" : "Check / update slots"}</button>
        </div>
      </article>`;
  }

  function answerHtml(fam) {
    if (fam === "__all") {
      const all = families().map(familyAnswer);
      const total = all.reduce((n, a) => n + a.named, 0);
      return `
        <div class="study-answer-head">
          <div class="study-answer-big"><span class="n">${total}</span> <span class="w">named holes across all binders</span></div>
          <p class="study-answer-sub">Each series below shows only what the ledger or you have confirmed. Binders marked ⚠ need a slot-by-slot check before their list is complete.</p>
        </div>
        ${all.map((a) => `<section class="study-fam-block"><h3>${esc(famName(a.fam))} <span>${a.named} named${a.needs ? ` · ${a.needs} ⚠` : ""}</span></h3>${a.vols.map((b) => volumeAnswerHtml(b)).join("")}</section>`).join("")}`;
    }
    const a = familyAnswer(fam);
    const headline = a.named
      ? `<span class="n">${a.named}</span> <span class="w">${a.fam === "American Silver Eagles" ? (a.named === 1 ? "year" : "years") : (a.named === 1 ? "coin" : "coins")} missing</span>`
      : `<span class="w">${a.complete ? "Nothing missing" : "No missing dates named yet"}</span>`;
    const sub = a.complete
      ? `Every slot in ${a.vols.length === 1 ? "this binder" : `these ${a.vols.length} binders`} is accounted for in the ledger.`
      : `${a.needs ? `${plural(a.needs, "binder")} ${a.needs === 1 ? "needs" : "need"} a slot-by-slot check, so this list may be incomplete.` : "Some slots are not itemized, so this list may be incomplete."}${a.unnamedOpen ? ` At least ${a.unnamedOpen} more open ${a.unnamedOpen === 1 ? "slot is" : "slots are"} not yet named.` : ""}`;
    const evParts = [];
    if (a.ev.confirmed) evParts.push(`${a.ev.confirmed} checked by you`);
    if (a.ev.enumerated) evParts.push(`${a.ev.enumerated} listed slot by slot in the ledger`);
    if (a.ev.partial) evParts.push(`${a.ev.partial} only partly listed (inferred, needs a scan)`);
    if (a.ev["count-only"]) evParts.push(`${a.ev["count-only"]} with a coin count only (no slots listed)`);
    const evLine = `Evidence for ${plural(a.vols.length, "binder")}: ${evParts.join(", ")}.`;
    return `
      <div class="study-answer-head">
        <div class="study-answer-big">${headline}</div>
        <p class="study-answer-sub">${esc(sub)}</p>
        <p class="study-answer-sub study-evidence-line"><strong>${esc(evLine)}</strong></p>
      </div>
      ${a.vols.map((b) => volumeAnswerHtml(b, { big: true })).join("")}`;
  }

  /* ─────────────── plain text (copy / share / print) ─────────────── */
  function answerText(fam, checklist) {
    const fams = fam === "__all" ? families() : [fam];
    const out = [`TITAN RELIQUARY · WANT LIST · ${today()}`, ""];
    for (const f of fams) {
      const a = familyAnswer(f);
      out.push(`${famName(f).toUpperCase()}: ${a.named} missing${a.complete ? "" : " (list incomplete)"}`);
      for (const b of a.vols) {
        const head = `${b.id} ${shortTitle(b.v)}`;
        if (b.missing.length) {
          out.push(`  ${head}:`);
          if (checklist) b.missing.forEach((s) => out.push(`    [ ] ${s.label}${s.keyDate ? "  ★ key date" : ""}`));
          else out.push(`    ${b.missing.map((s) => s.label + (s.keyDate ? "★" : "")).join(", ")}`);
        } else if (fam !== "__all") {
          out.push(`  ${head}: ${b.listComplete && (b.status === "confirmed" || b.v.evidence === "enumerated") ? "complete" : "none named yet"}`);
        }
        if (b.aggregates.length) out.push(`    also (ledger): ${b.aggregates.map((x) => x.label).join("; ")}`);
        if (b.remEmpty) out.push(`    + ${b.approx ? "about " : ""}${b.remEmpty} open slot(s) not named yet`);
        if (b.status === "needs" && (b.missing.length || fam !== "__all")) out.push(`    ! needs a slot-by-slot check`);
      }
      out.push("");
    }
    const src = (window.TITAN_ALBUMS && window.TITAN_ALBUMS.source) || "ledger";
    out.push(`Source: ${src}${store.updated ? `; your in-app checks to ${store.updated.slice(0, 10)}` : ""}.`);
    return out.join("\n");
  }

  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); toast("Checklist copied"); return; } catch (e) { /* fall back */ }
    const ta = document.createElement("textarea");
    ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Checklist copied"); } catch (e) { toast("Copy failed: select the text and copy it"); }
    ta.remove();
  }
  async function shareText(fam) {
    const txt = answerText(fam, true);
    if (navigator.share) {
      try { await navigator.share({ title: "Want list", text: txt }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    download(`want-list-${fam === "__all" ? "all" : slugKey(fam).toLowerCase()}-${today()}.txt`, txt, "text/plain");
  }
  function download(name, text, type) {
    try {
      const blob = new Blob([text], { type: type || "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch (e) { toast("Download is not available here"); }
  }
  function printAnswer(fam) {
    let sheet = document.getElementById("study-print-sheet");
    if (!sheet) { sheet = document.createElement("div"); sheet.id = "study-print-sheet"; document.body.appendChild(sheet); }
    const fams = fam === "__all" ? families() : [fam];
    sheet.innerHTML = `
      <h1>Want list${fam === "__all" ? "" : ": " + esc(famName(fam))}</h1>
      <p class="sp-sub">Titan Reliquary · printed ${today()} · tick each coin as you find it</p>
      ${fams.map((f) => {
        const a = familyAnswer(f);
        return `<section><h2>${esc(famName(f))} <small>${a.named} missing${a.complete ? "" : " · list incomplete"}</small></h2>
          ${a.vols.map((b) => `<div class="sp-vol"><h3>${esc(b.id)} · ${esc(shortTitle(b.v))} <small>${esc(b.statusText)}</small></h3>
            ${b.missing.length ? `<ul>${b.missing.map((s) => `<li><span class="box"></span>${esc(s.label)}${s.keyDate ? " ★" : ""}</li>`).join("")}</ul>` : `<p>${b.listComplete ? "Complete." : "No missing dates named yet."}</p>`}
            ${b.aggregates.length ? `<p>Also (ledger): ${b.aggregates.map((x) => esc(x.label)).join("; ")}</p>` : ""}
            ${b.remEmpty ? `<p>+ ${b.approx ? "about " : ""}${b.remEmpty} open slot(s) not named yet.</p>` : ""}</div>`).join("")}</section>`;
      }).join("")}
      <p class="sp-src">Source: ${esc((window.TITAN_ALBUMS && window.TITAN_ALBUMS.source) || "ledger")}${store.updated ? `; in-app checks to ${esc(store.updated.slice(0, 10))}` : ""}.</p>`;
    document.documentElement.classList.add("study-printing");
    const done = () => { document.documentElement.classList.remove("study-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    try { window.print(); } catch (e) { /* ignore */ }
    setTimeout(done, 60000);
  }

  /* ─────────────── hero section in the Study ─────────────── */
  function getPrefFamily() {
    try { const f = localStorage.getItem(PREF_KEY); if (f && (f === "__all" || families().includes(f))) return f; } catch (e) { /* ignore */ }
    return "American Silver Eagles";
  }
  function setPrefFamily(f) { try { localStorage.setItem(PREF_KEY, f); } catch (e) { /* ignore */ } }

  function heroHtml(fam) {
    const opts = families().map((f) => `<option value="${esc(f)}"${f === fam ? " selected" : ""}>${esc(famName(f))}</option>`).join("");
    return `
      <div class="study-missing-card">
        <div class="study-missing-top">
          <div>
            <span class="study-eyebrow">The founding question</span>
            <h2 id="study-missing-title">Which years am I missing?</h2>
          </div>
          <label class="study-series-pick">
            <span>Series</span>
            <select id="study-family-select" aria-label="Choose a coin series">${opts}<option value="__all"${fam === "__all" ? " selected" : ""}>All binders (full want list)</option></select>
          </label>
        </div>
        <div class="study-answer" id="study-answer" aria-live="polite">${answerHtml(fam)}</div>
        <div class="study-answer-actions">
          <button type="button" class="study-btn primary" data-open-wants>What's missing: full list &amp; print</button>
          <button type="button" class="study-btn" data-study-act="print">🖨 Print checklist</button>
          <button type="button" class="study-btn" data-study-act="copy">📋 Copy as text</button>
          <button type="button" class="study-btn" data-study-act="share">↗ Share / save</button>
          <button type="button" class="study-btn" data-study-act="data">⇅ Export / import checks</button>
        </div>
      </div>`;
  }

  function bindAnswerActions(root, getFam) {
    root.addEventListener("click", (e) => {
      const inv = e.target.closest("[data-study-inv]");
      if (inv) { openInventory(inv.dataset.studyInv); return; }
      const act = e.target.closest("[data-study-act]");
      if (!act) return;
      const fam = getFam();
      const a = act.dataset.studyAct;
      if (a === "print") printAnswer(fam);
      else if (a === "copy") copyText(answerText(fam, true));
      else if (a === "share") shareText(fam);
      else if (a === "data") openInventory(familyVolumes(fam === "__all" ? "American Silver Eagles" : fam)[0]?.id, { focusData: true });
    });
  }

  function mountHero() {
    const body = document.getElementById("study-body");
    if (!body || document.getElementById("sec-missing")) return;
    if (!Object.keys(ledger()).length) return;
    const sec = document.createElement("section");
    sec.id = "sec-missing";
    sec.className = "study-missing";
    sec.setAttribute("aria-labelledby", "study-missing-title");
    let fam = getPrefFamily();
    sec.innerHTML = heroHtml(fam);
    const nav = body.querySelector(".study-nav-pills");
    if (nav && nav.nextSibling) body.insertBefore(sec, nav.nextSibling); else body.prepend(sec);
    sec.querySelector("#study-family-select").addEventListener("change", (e) => {
      fam = e.target.value; setPrefFamily(fam);
      sec.querySelector("#study-answer").innerHTML = answerHtml(fam);
    });
    bindAnswerActions(sec, () => fam);
    if (nav && !nav.querySelector(".study-nav-missing")) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "study-nav-pill study-nav-missing";
      pill.dataset.target = "#sec-missing";
      pill.textContent = "★ Missing Years";
      pill.addEventListener("click", () => {
        $$(".study-nav-pill", nav).forEach((p) => p.classList.toggle("active", p === pill));
        sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
      nav.prepend(pill);
    }
    // Missing Years is the first thing shown: highlight its pill, not "World Atlas".
    const mp = nav && nav.querySelector(".study-nav-missing");
    if (mp) $$(".study-nav-pill", nav).forEach((p) => p.classList.toggle("active", p === mp));
  }
  function refreshHero() {
    const sec = document.getElementById("sec-missing");
    if (!sec) return;
    const sel = sec.querySelector("#study-family-select");
    const fam = sel ? sel.value : getPrefFamily();
    const ans = sec.querySelector("#study-answer");
    if (ans) ans.innerHTML = answerHtml(fam);
  }

  /* ─────────────── shelf cards: honest numbers ─────────────── */
  function enhanceShelf() {
    const body = document.getElementById("study-body");
    if (!body || !Object.keys(ledger()).length) return;
    const vols = Object.values(ledger());
    const sub = body.querySelector(".album-shelf-header > div > div");
    if (sub && !sub.dataset.study) {
      const coins = vols.reduce((n, v) => n + (v.filled_count || 0), 0);
      const needs = vols.map((v) => buildVolume(v.id)).filter((b) => b.status === "needs").length;
      sub.dataset.study = "1";
      sub.textContent = `${families().length} series · ${vols.length} binders · ${coins} coins in binders (ledger count) · ${needs} binders need inventory`;
    }
    $$(".album-binder-card[data-album-family]:not(.staging-binder-card)", body).forEach((card) => {
      if (card.querySelector(".study-truth")) return;
      const fam = card.dataset.albumFamily;
      const list = familyVolumes(fam);
      if (!list.length) return;
      const built = list.map((v) => buildVolume(v.id));
      let filled = 0, total = 0, totalKnown = true, approx = false;
      for (const b of built) { if (b.total == null) totalKnown = false; else { total += b.total; filled += b.filledCount; } if (b.approx) approx = true; }
      const named = built.reduce((n, b) => n + b.missing.length, 0);
      const pct = totalKnown && total ? Math.round((filled / total) * 100) : null;
      // Replace the old guessed meter with ledger/owner numbers.
      const meta = card.querySelector(".binder-progress-meta");
      if (meta) {
        meta.innerHTML = `<span>${totalKnown ? `${approx ? "≈" : ""}${filled} of ${total} slots filled` : `${filled} coins · some slot totals unknown`}</span><span class="study-meta-holes">${named} named ${named === 1 ? "hole" : "holes"}</span>`;
      }
      const fill = card.querySelector(".binder-fill");
      if (fill) fill.style.width = `${pct == null ? 0 : pct}%`;
      const stats = card.querySelectorAll(".binder-stat-val");
      const lbls = card.querySelectorAll(".binder-stat-lbl");
      if (stats[1] && lbls[1]) { stats[1].textContent = pct == null ? "—" : `${approx ? "≈" : ""}${pct}%`; lbls[1].textContent = "Filled"; }
      const truth = document.createElement("div");
      truth.className = "study-truth";
      truth.innerHTML = built.map((b) => {
        const cls = b.status === "confirmed" ? "ok" : b.status === "ledger" ? "ledger" : "needs";
        const txt = b.missing.length ? `${b.missing.length} missing` : (b.total && b.filledCount === 0 ? "empty" : (b.listComplete && (b.status === "confirmed" || b.v.evidence === "enumerated") ? "complete" : "unknown"));
        return `<span class="study-truth-chip study-ev-${cls}" title="${esc(b.v.title)} · ${esc(b.statusText)}"><b>${esc(b.id)}</b> ${esc(txt)} ${cls === "needs" ? "⚠" : cls === "ok" ? "✓" : ""}</span>`;
      }).join("");
      const actions = card.querySelector(".binder-actions-row");
      if (actions) {
        card.insertBefore(truth, actions);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn small study-inv-open";
        btn.dataset.studyInv = list[0].id;
        btn.title = "Mark which slots are filled, slot by slot";
        btn.textContent = "✎ Inventory";
        btn.addEventListener("click", (e) => { e.stopPropagation(); openInventory(list[0].id); });
        actions.appendChild(btn);
      }
    });
  }

  /* ─────────────── binder inspector integration ─────────────── */
  let inspectorCurrent = null;
  /** Called by app.js renderAlbumInspectorView(): returns slots from ledger + owner marks, or null. */
  function inspectorVolume(id, family) {
    const b = buildVolume(id);
    if (!b) { inspectorCurrent = null; return null; }
    inspectorCurrent = { id, family: family || b.v.family, b };
    const slots = b.slots.filter((s) => s.state !== "not_applicable").map((s) => ({ label: s.label, year: s.year, state: s.state, key: s.keyDate }));
    if (b.rem) {
      const remUnknown = b.rem - (b.remFilled || 0) - (b.remEmpty || 0);
      for (let i = 0; i < (b.remFilled || 0); i++) slots.push({ label: "Filled (not itemized)", year: null, state: "filled", key: false, placeholder: true });
      for (let i = 0; i < (b.remEmpty || 0); i++) slots.push({ label: "Open (date not named)", year: null, state: "empty", key: false, placeholder: true });
      for (let i = 0; i < remUnknown; i++) slots.push({ label: "Not checked", year: null, state: "unchecked", key: false, placeholder: true });
    }
    inspectorCurrent.slots = slots;
    return { title: b.v.title, slots };
  }
  function enhanceInspector() {
    const cur = inspectorCurrent;
    const modal = document.getElementById("album-inspector-modal");
    if (!cur || !modal || modal.hidden) return;
    const b = cur.b;
    const title = document.getElementById("album-inspector-title");
    if (title) title.textContent = `${famName(cur.family)} · ${shortTitle(b.v)}`;
    const meta = document.getElementById("album-inspector-meta");
    if (meta) {
      const pct = b.total ? Math.round((b.filledCount / b.total) * 100) : null;
      meta.innerHTML = `<strong>${b.total != null ? `${b.approx ? "≈" : ""}${b.filledCount}` : (b.v.filled_count ?? "?")}</strong> of <strong>${b.total ?? "?"}</strong> slots filled${pct != null ? ` · <span class="study-gold">${pct}%</span>` : ""} · ${esc(b.statusText)}`;
      const bar = document.getElementById("album-progress-bar");
      if (bar) bar.style.width = `${pct || 0}%`;
    }
    // Volume tabs: ledger titles instead of the hand-typed ones.
    $$("#album-family-tabs .album-tab-btn").forEach((t) => {
      const v = ledger()[t.dataset.albumId];
      if (v) t.textContent = `${v.id}: ${shortTitle(v)}`;
    });
    // Banner with provenance + inventory action.
    const head = modal.querySelector(".album-header-main");
    if (head) {
      let ban = head.querySelector(".study-inspector-banner");
      if (!ban) { ban = document.createElement("div"); ban.className = "study-inspector-banner"; head.appendChild(ban); }
      ban.innerHTML = `${evidenceBadge(b)} <button type="button" class="study-btn small" data-study-inv="${esc(cur.id)}">✎ Inventory mode</button>`;
      ban.querySelector("button").onclick = () => { if (typeof window.closeAlbumInspector === "function") window.closeAlbumInspector(); openInventory(cur.id); };
    }
    // Slot cards: mark unchecked slots honestly (the stock renderer only knows filled/hole).
    const slots = cur.slots || [];
    let unchecked = 0;
    $$("#album-slots-grid .album-slot-card").forEach((card) => {
      const m = String(card.dataset.scan || "").match(/-S(\d+)-/);
      const s = m ? slots[Number(m[1]) - 1] : null;
      if (!s) return;
      if (s.state === "unchecked") {
        unchecked++;
        card.classList.add("study-unchecked");
        const pill = card.querySelector(".slot-status-pill");
        if (pill) { pill.textContent = "? NOT CHECKED"; pill.className = "slot-status-pill study-pill-unchecked"; }
        const lbl = card.querySelector(".slot-hole-lbl");
        if (lbl) lbl.textContent = "UNKNOWN";
        const den = card.querySelector(".slot-denom-tag");
        if (den) den.textContent = "Not checked yet";
        card.title = `${s.label}: not checked yet`;
      } else if (s.placeholder) {
        card.classList.add("study-placeholder");
      }
    });
    const cm = document.getElementById("album-count-missing");
    if (cm) {
      const nUnchecked = slots.filter((s) => s.state === "unchecked").length;
      const nEmpty = slots.filter((s) => s.state === "empty").length;
      cm.textContent = nUnchecked ? `${nEmpty} + ${nUnchecked}?` : String(nEmpty);
    }
    void unchecked;
  }

  /* ─────────────── Inventory Mode (modal) ─────────────── */
  let invState = { id: null, brush: "toggle", undo: [] };
  const BRUSHES = [
    ["toggle", "✓ / ✗", "Tap: have ⇄ missing"],
    ["na", "—", "Not in this binder"],
    ["key", "★", "Mark key date"],
    ["ledger", "↺", "Undo my mark"]
  ];

  function ensureInvModal() {
    let m = document.getElementById("study-inv-modal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "study-inv-modal";
    m.className = "study-modal";
    m.hidden = true;
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-labelledby", "study-inv-title");
    m.innerHTML = `<div class="study-modal-backdrop" data-study-close></div><div class="study-modal-shell" tabindex="-1"></div>`;
    document.body.appendChild(m);
    m.addEventListener("click", onInvClick);
    m.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeInventory(); }
    });
    m.addEventListener("change", onInvChange);
    return m;
  }

  function openInventory(id, opts) {
    if (!id || !ledger()[id]) return;
    const m = ensureInvModal();
    invState.id = id;
    invState.undo = [];
    renderInventory();
    m.hidden = false;
    document.documentElement.classList.add("study-modal-open");
    const shell = m.querySelector(".study-modal-shell");
    shell.scrollTop = 0;
    if (opts && opts.focusData) { const d = m.querySelector(".study-inv-data"); if (d) d.scrollIntoView({ block: "center" }); }
    shell.focus({ preventScroll: true });
  }
  function closeInventory() {
    const m = document.getElementById("study-inv-modal");
    if (!m || m.hidden) return;
    m.hidden = true;
    document.documentElement.classList.remove("study-modal-open");
    refreshAll();
  }

  function slotButton(s) {
    const st = s.state === "not_applicable" ? "na" : s.state;
    const stTxt = { filled: "Have", empty: "Missing", na: "Not in binder", unchecked: "Not checked" }[st];
    const src = s.by === "you" ? "you" : s.by === "ledger" ? "ledger" : (s.source === "layout" ? "layout" : "none");
    return `<button type="button" class="study-slot st-${st} src-${src}${s.keyDate ? " is-key" : ""}${s.future ? " is-future" : ""}" data-slot="${esc(s.key)}" aria-label="${esc(s.label)}: ${stTxt}${s.keyDate ? ", key date" : ""}${s.by === "you" ? ", checked by you" : s.by === "ledger" ? ", from ledger" : ""}">
      <span class="study-slot-label">${esc(s.label)}</span>
      <span class="study-slot-state">${st === "filled" ? "✓ " : st === "empty" ? "✗ " : st === "na" ? "— " : "? "}${stTxt}</span>
      ${s.keyDate ? '<span class="study-slot-key" aria-hidden="true">★</span>' : ""}
      <span class="study-slot-src" aria-hidden="true">${src === "you" ? "you" : src === "ledger" ? "ledger" : ""}</span>
    </button>`;
  }

  function renderInventory() {
    const m = ensureInvModal();
    const b = buildVolume(invState.id);
    if (!b) return;
    const fam = b.v.family;
    const sibs = familyVolumes(fam);
    const c = b.counts;
    const layoutNote = b.layout ? `<p class="study-inv-hint">Slot grid built from the binder title and the ledger's exact slot count: ${b.layout.years} years × ${b.layout.mints.length === 1 ? "1 coin" : b.layout.mints.join("/")} = ${b.total} slots.</p>` : "";
    const remNote = b.total == null
      ? `<p class="study-inv-hint warn">The ledger does not give this binder's slot total. Add the slots printed on its pages below, then mark each one.</p>`
      : (b.rem ? `<p class="study-inv-hint warn">${b.approx ? "About " : ""}${plural(b.rem, "slot")} of ${b.total} ${b.rem === 1 ? "is" : "are"} not itemized yet${b.remFilled != null ? ` (by the ledger's counts: ${b.remFilled} filled, ${b.remEmpty} open)` : ""}. Add them below to check them one by one.</p>` : "");
    const r = yearRange(b.v.title);
    m.querySelector(".study-modal-shell").innerHTML = `
      <header class="study-inv-head">
        <div>
          <span class="study-eyebrow">Inventory mode · ${esc(famName(fam))}</span>
          <h2 id="study-inv-title">${esc(b.id)} · ${esc(shortTitle(b.v))}</h2>
          <div class="study-inv-ev">${evidenceBadge(b)}${b.v.note ? `<span class="study-inv-note">Ledger: ${esc(b.v.note)}</span>` : ""}</div>
        </div>
        <button type="button" class="study-close" data-study-close aria-label="Close inventory">×</button>
      </header>
      ${sibs.length > 1 ? `<nav class="study-inv-tabs" aria-label="Binders in this series">${sibs.map((v) => `<button type="button" class="study-tab${v.id === b.id ? " active" : ""}" data-study-vol="${esc(v.id)}" aria-pressed="${v.id === b.id}">${esc(v.id)}<small>${esc(shortTitle(v))}</small></button>`).join("")}</nav>` : ""}
      <div class="study-inv-tally" aria-live="polite">
        <span class="t-have"><b>${c.filled}</b> have</span>
        <span class="t-miss"><b>${c.empty}</b> missing</span>
        <span class="t-unk"><b>${c.unchecked}</b> not checked</span>
        ${c.na ? `<span class="t-na"><b>${c.na}</b> not in binder</span>` : ""}
        <span class="t-you"><b>${c.you}</b> checked by you</span>
      </div>
      <div class="study-brushes" role="radiogroup" aria-label="What a tap does">
        ${BRUSHES.map(([k, ic, t]) => `<button type="button" role="radio" aria-checked="${invState.brush === k}" class="study-brush${invState.brush === k ? " active" : ""}" data-study-brush="${k}"><span class="ic">${ic}</span> ${t}</button>`).join("")}
        <button type="button" class="study-brush undo" data-study-undo ${invState.undo.length ? "" : "disabled"}>⎌ Undo last tap</button>
      </div>
      <p class="study-legend"><span class="lg lg-have">✓ Have</span><span class="lg lg-miss">✗ Missing</span><span class="lg lg-unk">? Not checked</span><span class="lg lg-src">thin border = from the ledger · solid border = checked by you</span></p>
      ${layoutNote}${remNote}
      <div class="study-slot-grid" role="group" aria-label="Slots">${b.slots.map(slotButton).join("") || '<p class="study-inv-hint">No slots are named yet for this binder.</p>'}</div>
      ${b.aggregates.length ? `<p class="study-inv-hint">Ledger notes on other holes: ${b.aggregates.map((a) => `<q>${esc(a.label)}</q>`).join(", ")}. Add those slots below to check them one by one.</p>` : ""}
      <div class="study-bulk">
        <button type="button" class="study-btn" data-study-bulk="confirm" ${b.slots.some((s) => s.ledger && !s.mark) ? "" : "disabled"}>✓ The ledger matches my binder (confirm all)</button>
        <button type="button" class="study-btn" data-study-bulk="have" ${c.unchecked ? "" : "disabled"}>Mark every unchecked slot “Have”</button>
        <button type="button" class="study-btn" data-study-bulk="miss" ${c.unchecked ? "" : "disabled"}>Mark every unchecked slot “Missing”</button>
      </div>
      <details class="study-add" ${b.total == null || b.rem ? "open" : ""}>
        <summary>Add slots printed in this binder</summary>
        <div class="study-add-row">
          <label>From year <input type="number" inputmode="numeric" min="1600" max="2100" id="study-add-from" value="${r ? r[0] : ""}"></label>
          <label>to <input type="number" inputmode="numeric" min="1600" max="2100" id="study-add-to" value="${r ? r[1] : ""}"></label>
          <fieldset><legend>Mint marks per year</legend>
            ${[["", "none"], ["P", "P"], ["D", "D"], ["S", "S"], ["W", "W"]].map(([v, t]) => `<label class="study-check"><input type="checkbox" class="study-add-mint" value="${v}" ${v === "" ? "checked" : ""}> ${t}</label>`).join("")}
          </fieldset>
          <button type="button" class="study-btn" data-study-add="range">Add year slots</button>
        </div>
        <div class="study-add-row">
          <label class="grow">One slot <input type="text" id="study-add-label" maxlength="60" placeholder="e.g. 1996-W or 1982 Cu small date"></label>
          <button type="button" class="study-btn" data-study-add="one">Add slot</button>
        </div>
        <p class="study-inv-hint">Slots you add start as “not checked”. Existing slots are never duplicated. “Undo my mark” removes a slot you added.</p>
      </details>
      <section class="study-inv-data" aria-label="Save and share your checks">
        <h3>Your checks are saved on this device</h3>
        <p class="study-inv-hint">Export a file to keep them safe or move them to another device. That file will become the real album data.</p>
        <div class="study-bulk">
          <button type="button" class="study-btn primary" data-study-data="export">⬇ Export all checks (.json)</button>
          <button type="button" class="study-btn" data-study-data="import">⬆ Import a checks file</button>
          <button type="button" class="study-btn danger" data-study-data="reset" ${volStore(b.id) ? "" : "disabled"}>Clear my checks for ${esc(b.id)}</button>
          <input type="file" accept="application/json,.json" id="study-import-file" hidden>
        </div>
        <p class="study-inv-hint">${store.updated ? `Last change: ${esc(new Date(store.updated).toLocaleString())}.` : "No checks yet."}</p>
      </section>`;
  }

  function markSlot(id, key, fn) {
    const vs = volStore(id, true);
    const prev = vs.marks[key] ? { ...vs.marks[key] } : null;
    const next = fn(prev ? { ...prev } : {});
    if (next && (next.state || next.key)) vs.marks[key] = { ...next, at: new Date().toISOString() };
    else delete vs.marks[key];
    vs.updated = new Date().toISOString();
    return prev;
  }

  function onInvClick(e) {
    const t = e.target;
    if (t.closest("[data-study-close]")) { closeInventory(); return; }
    const vol = t.closest("[data-study-vol]");
    if (vol) { invState.id = vol.dataset.studyVol; invState.undo = []; renderInventory(); return; }
    const br = t.closest("[data-study-brush]");
    if (br) { invState.brush = br.dataset.studyBrush; renderInventory(); return; }
    if (t.closest("[data-study-undo]")) {
      const u = invState.undo.pop();
      if (u) {
        const vs = volStore(u.id, true);
        if (u.prev) vs.marks[u.key] = u.prev; else delete vs.marks[u.key];
        if (u.addedLabel) vs.added.push({ label: u.addedLabel });
        vs.updated = new Date().toISOString();
        saveStore(); renderInventory();
      }
      return;
    }
    const slotEl = t.closest("[data-slot]");
    if (slotEl) { tapSlot(slotEl.dataset.slot); return; }
    const bulk = t.closest("[data-study-bulk]");
    if (bulk && !bulk.disabled) { doBulk(bulk.dataset.studyBulk); return; }
    const add = t.closest("[data-study-add]");
    if (add) { doAdd(add.dataset.studyAdd); return; }
    const d = t.closest("[data-study-data]");
    if (d && !d.disabled) {
      const a = d.dataset.studyData;
      if (a === "export") exportFile();
      else if (a === "import") { const f = document.getElementById("study-import-file"); if (f) { f.value = ""; f.click(); } }
      else if (a === "reset") {
        if (confirm(`Clear every check you made in ${invState.id}? The ledger data stays.`)) { delete store.volumes[invState.id]; saveStore(); invState.undo = []; renderInventory(); }
      }
    }
  }
  function onInvChange(e) {
    if (e.target && e.target.id === "study-import-file" && e.target.files && e.target.files[0]) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const n = importData(JSON.parse(String(fr.result)), true);
          if (n != null) { toast(`Imported checks for ${plural(n, "binder")}`); renderInventory(); }
        } catch (err) { alert("That file could not be read as a Titan Reliquary checks file."); }
      };
      fr.readAsText(e.target.files[0]);
    }
  }

  function tapSlot(key) {
    const id = invState.id;
    const b = buildVolume(id);
    const s = b && b.slots.find((x) => x.key === key);
    if (!s) return;
    const brush = invState.brush;
    let prev;
    if (brush === "ledger" && s.source === "owner") {
      const vs = volStore(id, true);
      prev = vs.marks[key] ? { ...vs.marks[key] } : null;
      delete vs.marks[key];
      vs.added = vs.added.filter((a) => "u:" + slugKey(a.label) !== key);
      vs.updated = new Date().toISOString();
      invState.undo.push({ id, key, prev, addedLabel: s.label });
    } else {
      prev = markSlot(id, key, (mk) => {
        if (brush === "toggle") mk.state = s.state === "filled" ? "empty" : "filled";
        else if (brush === "na") mk.state = s.state === "not_applicable" ? null : "not_applicable";
        else if (brush === "key") mk.key = !mk.key;
        else if (brush === "ledger") return null;
        return mk;
      });
      invState.undo.push({ id, key, prev });
    }
    if (invState.undo.length > 50) invState.undo.shift();
    saveStore();
    renderInventory();
    const again = document.querySelector(`#study-inv-modal [data-slot="${CSS.escape(key)}"]`);
    if (again) again.focus({ preventScroll: true });
  }

  function doBulk(kind) {
    const id = invState.id;
    const b = buildVolume(id);
    const vs = volStore(id, true);
    const now = new Date().toISOString();
    let n = 0;
    for (const s of b.slots) {
      const mk = vs.marks[s.key] || {};
      if (kind === "confirm" && s.ledger && !s.mark) { vs.marks[s.key] = { ...mk, state: s.ledger, at: now }; n++; }
      if ((kind === "have" || kind === "miss") && s.state === "unchecked") { vs.marks[s.key] = { ...mk, state: kind === "have" ? "filled" : "empty", at: now }; n++; }
    }
    vs.updated = now;
    invState.undo = [];
    saveStore(); renderInventory();
    toast(`${plural(n, "slot")} updated`);
  }

  function doAdd(kind) {
    const id = invState.id;
    const b = buildVolume(id);
    const have = new Set(b.slots.map((s) => normLabel(s.label)));
    const vs = volStore(id, true);
    const labels = [];
    if (kind === "range") {
      const from = Number(document.getElementById("study-add-from").value);
      const to = Number(document.getElementById("study-add-to").value);
      const mints = $$(".study-add-mint:checked").map((x) => x.value);
      if (!from || !to || to < from || to - from > 150 || !mints.length) { toast("Enter a year range and pick at least one mint mark"); return; }
      for (let y = from; y <= to; y++) for (const m of mints) labels.push(m ? `${y}-${m}` : String(y));
    } else {
      const inp = document.getElementById("study-add-label");
      const l = (inp.value || "").trim();
      if (!l) { toast("Type the slot's label first"); return; }
      labels.push(l);
    }
    let n = 0;
    for (const l of labels) {
      const nl = normLabel(l);
      const alt = /^\d{4}$/.test(l) ? normLabel(l + "-P") : (/^\d{4}-P$/i.test(l) ? normLabel(l.slice(0, 4)) : null);
      if (have.has(nl) || (alt && have.has(alt))) continue;
      vs.added.push({ label: l }); have.add(nl); n++;
    }
    vs.updated = new Date().toISOString();
    saveStore(); renderInventory();
    toast(n ? `${plural(n, "slot")} added` : "Those slots already exist");
  }

  /* ─────────────── export / import ─────────────── */
  function exportData() {
    const vols = Object.values(ledger()).map((v) => {
      const b = buildVolume(v.id);
      return {
        id: v.id, family: v.family, title: v.title, evidence: v.evidence,
        slots_total: v.slots_total, slots_approx: !!v.slots_approx, filled_count_ledger: v.filled_count,
        layout: b.layout ? b.layout.name : null,
        slots: b.slots.map((s) => ({
          slot: s.key, label: s.label, year: s.year, mint: s.mint || null, key: s.keyDate,
          state: s.state, source: s.by, ledger_state: s.ledger, added_by_owner: s.source === "owner"
        })),
        counts: { filled: b.counts.filled, empty: b.counts.empty, not_applicable: b.counts.na, unchecked: b.counts.unchecked, checked_by_owner: b.counts.you, not_itemized: b.rem },
        ledger_hole_notes: b.aggregates.map((a) => a.label),
        missing: b.missing.map((s) => s.label)
      };
    });
    return {
      schema: SCHEMA, version: VERSION, exported_at: new Date().toISOString(),
      app_build: window.TITAN_BUILD || null,
      ledger_source: (window.TITAN_ALBUMS && window.TITAN_ALBUMS.source) || null,
      note: "state: filled | empty | not_applicable | unchecked. source: 'you' = checked in the app, 'ledger' = from ALBUMS.md, null = not checked. 'inventory' is the raw record used for import.",
      inventory: JSON.parse(JSON.stringify(store)),
      volumes: vols
    };
  }
  function exportFile() {
    download(`titan-album-checks-${today()}.json`, JSON.stringify(exportData(), null, 2), "application/json");
    toast("Checks exported");
  }
  /** Accepts an export file or a raw store. Replaces the owner's checks for the binders in the file. */
  function importData(obj, ask) {
    const inv = obj && obj.inventory ? obj.inventory : obj;
    if (!inv || inv.schema !== SCHEMA || typeof inv.volumes !== "object") throw new Error("not a checks file");
    if (inv.version !== VERSION) throw new Error("unsupported version");
    const ids = Object.keys(inv.volumes).filter((id) => ledger()[id]);
    if (ask && !confirm(`Replace your checks for ${plural(ids.length, "binder")} (${ids.join(", ")}) with the ones in this file?`)) return null;
    for (const id of ids) {
      const v = inv.volumes[id] || {};
      store.volumes[id] = { marks: { ...(v.marks || {}) }, added: Array.isArray(v.added) ? v.added.filter((a) => a && a.label).map((a) => ({ label: String(a.label).slice(0, 80) })) : [], updated: v.updated || new Date().toISOString() };
    }
    saveStore();
    refreshAll();
    return ids.length;
  }

  /* ─────────────── old Want List buttons → the honest answer ─────────────── */
  let missingModalFam = null;
  function openMissing(fam) {
    let m = document.getElementById("study-missing-modal");
    if (!m) {
      m = document.createElement("div");
      m.id = "study-missing-modal";
      m.className = "study-modal";
      m.hidden = true;
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      m.setAttribute("aria-labelledby", "study-mm-title");
      m.innerHTML = `<div class="study-modal-backdrop" data-study-close></div><div class="study-modal-shell" tabindex="-1"></div>`;
      document.body.appendChild(m);
      m.addEventListener("click", (e) => {
        if (e.target.closest("[data-study-close]")) { closeMissing(); return; }
        const inv = e.target.closest("[data-study-inv]");
        if (inv) { closeMissing(); openInventory(inv.dataset.studyInv); return; }
        const act = e.target.closest("[data-study-act]");
        if (!act) return;
        const a = act.dataset.studyAct;
        if (a === "print") printAnswer(missingModalFam);
        else if (a === "copy") copyText(answerText(missingModalFam, true));
        else if (a === "share") shareText(missingModalFam);
      });
      m.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeMissing(); } });
    }
    missingModalFam = fam && (fam === "__all" || families().includes(fam)) ? fam : "__all";
    m.querySelector(".study-modal-shell").innerHTML = `
      <header class="study-inv-head">
        <div><span class="study-eyebrow">Want list</span><h2 id="study-mm-title">${missingModalFam === "__all" ? "Everything I'm missing" : `Missing: ${esc(famName(missingModalFam))}`}</h2></div>
        <button type="button" class="study-close" data-study-close aria-label="Close want list">×</button>
      </header>
      <div class="study-answer">${answerHtml(missingModalFam)}</div>
      <div class="study-answer-actions">
        <button type="button" class="study-btn primary" data-study-act="print">🖨 Print checklist</button>
        <button type="button" class="study-btn" data-study-act="copy">📋 Copy as text</button>
        <button type="button" class="study-btn" data-study-act="share">↗ Share / save</button>
      </div>`;
    m.hidden = false;
    document.documentElement.classList.add("study-modal-open");
    m.querySelector(".study-modal-shell").focus({ preventScroll: true });
  }
  function closeMissing() {
    const m = document.getElementById("study-missing-modal");
    if (m && !m.hidden) { m.hidden = true; document.documentElement.classList.remove("study-modal-open"); }
  }
  document.addEventListener("click", (e) => {
    const t = e.target && e.target.closest ? e.target.closest("#btn-shelf-wantlist, #album-btn-wantlist") : null;
    if (!t || !Object.keys(ledger()).length) return;
    e.preventDefault();
    e.stopPropagation();
    if (t.id === "album-btn-wantlist") {
      const fam = inspectorCurrent ? inspectorCurrent.family : "__all";
      if (typeof window.closeAlbumInspector === "function") window.closeAlbumInspector();
      openMissing(fam);
    } else {
      openMissing("__all");
    }
  }, true);

  /* ─────────────── wiring ─────────────── */
  function refreshAll() {
    refreshHero();
    const body = document.getElementById("study-body");
    if (body) {
      $$(".study-truth, .study-inv-open", body).forEach((el) => el.remove());
      const sub = body.querySelector(".album-shelf-header > div > div[data-study]");
      if (sub) delete sub.dataset.study;
      enhanceShelf();
    }
  }
  function enhanceStudy() {
    mountHero();
    enhanceShelf();
  }

  function init() {
    if (!Object.keys(ledger()).length) return;
    const body = document.getElementById("study-body");
    if (body) {
      new MutationObserver(() => { if (!document.getElementById("sec-missing") || !body.querySelector(".study-truth")) enhanceStudy(); })
        .observe(body, { childList: true });
      enhanceStudy();
    }
    const grid = document.getElementById("album-slots-grid");
    if (grid) new MutationObserver(enhanceInspector).observe(grid, { childList: true });
  }

  window.TitanStudy = {
    inspectorVolume, buildVolume, familyAnswer, answerText, exportData, importData,
    openInventory, closeInventory, openMissing, closeMissing,
    families, storeKey: STORE_KEY
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
