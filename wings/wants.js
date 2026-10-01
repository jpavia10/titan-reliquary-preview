/* Titan Reliquary · "What's missing" (self-contained view; styles in styles/wants.css)
   Answers "Which Silver Eagle year am I missing?" for every album, driven ONLY by data/wants.json, which the pipeline
   generates from collection/albums.json (tools/pipeline/build_wants.py). Nothing here is typed by hand.
   Honesty: a slot is MISSING only when the ledger names it empty. Slots the ledger counts filled by arithmetic are
   "probably here"; count-only albums say "N missing, specific years unknown until the album scan (Phase 1.5)".
   API: TitanWants.open({family, q}), .close(), .data (after load), .print(); event "titan:wants" (detail = data) when loaded.
   Entry points: any element with [data-open-wants] (Hall tile, Study button). Easy to restyle: all markup uses wants-* classes. */
(function () {
  "use strict";
  const URL = "data/wants.json";
  let data = null, loading = null, root = null, lastFocus = null;
  const state = { q: "", family: "", onlyMissing: false };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch(URL, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((d) => { data = d; api.data = d; window.dispatchEvent(new CustomEvent("titan:wants", { detail: d })); return d; })
      .catch((e) => { loading = null; throw e; });
    return loading;
  }

  /* ---------- wording (pure functions of one volume) ---------- */
  function unitWord(v, n) { const u = v.unit === "years" ? "year" : v.unit === "coins" ? "coin" : "slot"; return n === 1 ? u : u + "s"; }
  function headline(v) {
    if (v.missing == null) return `Missing count not known: the ledger gives no slot total for this album`;
    if (v.missing === 0) return `Nothing missing: all ${v.slots_total} ${v.unit === "slots" ? "slots" : v.unit} filled`;
    if (v.slots_total == null) return `${v.missing} missing`;
    return `${v.missing} of ${v.slots_total}${v.slots_total_approx ? " (about)" : ""} ${v.unit === "slots" ? "slots" : v.unit} missing`;
  }
  function caveat(v) {
    if (v.evidence === "count-only") {
      return v.missing == null ? "The ledger has only a fill count for this album. Which years are missing is unknown until the album scan (Phase 1.5)."
        : `${v.missing} missing, specific years unknown until the album scan (Phase 1.5).`;
    }
    if (v.evidence === "partial") {
      const un = v.unnamed_missing;
      return `Partly known: ${v.missing_named.length} missing ${unitWord(v, v.missing_named.length)} named by the ledger${un > 0 ? `, ${un} more missing but not yet named` : ""}. The rest is confirmed by the album scan (Phase 1.5).`;
    }
    if (v.inferred_fill) return "The ledger names every hole; all other slots are counted as filled by arithmetic, so they are shown as \"probably here\".";
    return "";
  }

  /* ---------- the year grid for one album ---------- */
  function cells(v) {
    const out = [];
    const row = (s, kind) => ({ ...s, kind });
    const all = [];
    v.have_named.forEach((s) => all.push(row(s, s.inferred ? "probably" : "have")));
    v.missing_named.forEach((s) => all.push(row(s, "missing")));
    v.maybe_missing.forEach((s) => all.push(row(s, "unknown")));
    all.sort((a, b) => (a.year || 0) - (b.year || 0) || String(a.label).localeCompare(String(b.label)));
    for (const s of all) out.push(s);
    return out;
  }
  const KIND_TEXT = { have: "have it", missing: "MISSING", probably: "probably here", unknown: "not known yet" };
  function cellHtml(s) {
    const aria = `${s.label}: ${KIND_TEXT[s.kind]}`;
    return `<li class="wants-cell is-${s.kind}" aria-label="${esc(aria)}"><span class="wants-year">${esc(s.label)}</span><span class="wants-state">${s.kind === "missing" ? "✗ " : s.kind === "have" ? "✓ " : "? "}${esc(KIND_TEXT[s.kind])}</span></li>`;
  }

  function cardHtml(v) {
    const cs = cells(v);
    const showGrid = cs.length > 0;
    const miss = v.missing;
    const cls = miss === 0 ? "is-complete" : v.evidence === "count-only" ? "is-countonly" : "";
    return `<article class="wants-card ${cls}" data-vol="${esc(v.id)}" aria-labelledby="wants-t-${esc(v.id)}">
      <header class="wants-card-head">
        <div><span class="wants-album-id">Album ${esc(v.id)}</span>
        <h3 id="wants-t-${esc(v.id)}">${esc(v.title)}</h3></div>
        <p class="wants-count"><strong>${esc(headline(v))}</strong></p>
      </header>
      ${v.denomination ? `<p class="wants-meta">${esc(v.denomination)}${v.metal ? " · " + esc(v.metal) : ""}</p>` : ""}
      ${caveat(v) ? `<p class="wants-caveat">${esc(caveat(v))}</p>` : ""}
      ${showGrid ? `<ul class="wants-grid" role="list" aria-label="Slots in ${esc(v.title)}">${cs.map(cellHtml).join("")}</ul>
      <p class="wants-legend" aria-hidden="true"><span class="wants-key is-missing">✗ MISSING</span> <span class="wants-key is-have">✓ have it</span> ${cs.some((c) => c.kind === "probably") ? '<span class="wants-key is-probably">? probably here</span>' : ""}${cs.some((c) => c.kind === "unknown") ? '<span class="wants-key is-unknown">? not known yet</span>' : ""}</p>` : ""}
    </article>`;
  }

  /* ---------- filtering ---------- */
  function visibleVolumes() {
    const q = norm(state.q).trim();
    return data.volumes.filter((v) => {
      if (state.family && v.family !== state.family) return false;
      if (state.onlyMissing && !(v.missing == null || v.missing > 0)) return false;
      if (!q) return true;
      const hay = norm([v.id, v.title, v.family, v.denomination, v.metal, v.binder, v.missing_named.map((s) => s.label).join(" ")].join(" "));
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }
  function families() { const seen = []; data.volumes.forEach((v) => { if (!seen.includes(v.family)) seen.push(v.family); }); return seen; }

  function resultsHtml() {
    const vols = visibleVolumes();
    if (!vols.length) return `<p class="wants-empty">No album matches. Clear the search or choose "All series".</p>`;
    const byFam = new Map();
    vols.forEach((v) => { if (!byFam.has(v.family)) byFam.set(v.family, []); byFam.get(v.family).push(v); });
    return [...byFam].map(([f, vs]) => {
      const known = vs.reduce((n, v) => n + (v.missing || 0), 0);
      return `<section class="wants-family" aria-label="${esc(f)}"><h2 class="wants-family-name">${esc(f)}<small>${vs.length} album${vs.length === 1 ? "" : "s"} · ${known} missing counted</small></h2>${vs.map(cardHtml).join("")}</section>`;
    }).join("");
  }
  function summaryText() {
    const vols = visibleVolumes();
    const named = vols.reduce((n, v) => n + v.missing_named.length, 0);
    const unknown = vols.filter((v) => v.evidence === "count-only" || v.unnamed_missing > 0).length;
    return `${vols.length} album${vols.length === 1 ? "" : "s"} shown · ${named} missing slots named · ${unknown} album${unknown === 1 ? "" : "s"} still need${unknown === 1 ? "s" : ""} the album scan to name the rest`;
  }

  function dataDate() {
    const g = data && data.generated_at;
    if (!g) return "date unknown";
    const d = new Date(g);
    return isNaN(d) ? g : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  /* ---------- the printable want list (black on white, one column, 18pt+) ---------- */
  function printHtml() {
    const vols = visibleVolumes();
    const blocks = [];
    const byFam = new Map();
    vols.forEach((v) => { if (!byFam.has(v.family)) byFam.set(v.family, []); byFam.get(v.family).push(v); });
    for (const [f, vs] of byFam) {
      const parts = [];
      for (const v of vs) {
        if (v.missing === 0) continue;
        const denom = v.denomination || "";
        if (v.missing_named.length) {
          const rows = v.missing_named.map((s) => `<li><span class="wp-year">${esc(s.year != null ? s.year : s.label)}</span><span class="wp-mint">${s.mint ? "mint " + esc(s.mint) : "no mint mark"}</span><span class="wp-denom">${esc(denom)}${s.variety ? " (" + esc(s.variety) + ")" : ""}</span></li>`).join("");
          const more = v.unnamed_missing > 0 ? `<p class="wp-note">Plus ${v.unnamed_missing} more missing, years not yet known (album scan).</p>` : "";
          parts.push(`<h3>${esc(v.title)} <span>(${v.missing_named.length} to find)</span></h3><ul>${rows}</ul>${more}`);
        } else {
          parts.push(`<h3>${esc(v.title)}</h3><p class="wp-note">${v.missing == null ? "Missing count not known yet." : `${v.missing} missing, specific years unknown until the album scan.`}</p>`);
        }
      }
      if (parts.length) blocks.push(`<section><h2>${esc(f)}</h2>${parts.join("")}</section>`);
    }
    return `<h1>Coin want list</h1><p class="wp-sub">Titan Reliquary · things still missing from the albums</p>${blocks.join("") || "<p>Nothing missing in the albums shown.</p>"}<footer class="wp-foot">Collection data of ${esc(dataDate())} · Titan Reliquary</footer>`;
  }
  function printList() {
    if (!data) return;
    let sheet = document.getElementById("wants-print");
    if (!sheet) { sheet = document.createElement("div"); sheet.id = "wants-print"; sheet.setAttribute("aria-hidden", "true"); document.body.appendChild(sheet); }
    sheet.innerHTML = printHtml();
    document.body.classList.add("wants-printing");
    const done = () => { document.body.classList.remove("wants-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    setTimeout(() => { if (!matchMedia("print").matches) done(); }, 1500);
  }

  /* ---------- the view ---------- */
  function build() {
    root = document.createElement("div");
    root.id = "wants-view"; root.className = "wants-view"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "wants-title");
    root.innerHTML = `
      <div class="wants-shell">
        <header class="wants-top">
          <div>
            <p class="wants-eyebrow">Curator's Study</p>
            <h1 id="wants-title" tabindex="-1">What's missing</h1>
            <p class="wants-lede">Which years each album still needs. Only holes the ledger names are called missing.</p>
          </div>
          <button type="button" class="wants-btn wants-close" data-wants-close>Close</button>
        </header>
        <div class="wants-tools">
          <label class="wants-field"><span>Search a series or year</span><input type="search" id="wants-q" placeholder="e.g. Silver Eagle, 1996, quarters" autocomplete="off"></label>
          <label class="wants-field"><span>Series</span><select id="wants-family"></select></label>
          <label class="wants-check"><input type="checkbox" id="wants-only"><span>Only albums with something missing</span></label>
          <button type="button" class="wants-btn wants-print-btn" data-wants-print>Print want list</button>
        </div>
        <p class="wants-summary" id="wants-summary" role="status" aria-live="polite"></p>
        <div class="wants-results" id="wants-results"></div>
        <p class="wants-foot" id="wants-foot"></p>
      </div>`;
    document.body.appendChild(root);
    const q = root.querySelector("#wants-q"), fam = root.querySelector("#wants-family"), only = root.querySelector("#wants-only");
    q.addEventListener("input", () => { state.q = q.value; paint(); });
    fam.addEventListener("change", () => { state.family = fam.value; paint(); });
    only.addEventListener("change", () => { state.onlyMissing = only.checked; paint(); });
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-wants-close]")) close();
      else if (e.target.closest("[data-wants-print]")) printList();
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      else if (e.key === "Tab") {
        const f = [...root.querySelectorAll("button,input,select,a[href]")].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === root.querySelector("#wants-title"))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  function paint() {
    if (!root || !data) return;
    const fam = root.querySelector("#wants-family");
    if (!fam.options.length) fam.innerHTML = `<option value="">All series</option>` + families().map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
    fam.value = state.family;
    root.querySelector("#wants-q").value = state.q;
    root.querySelector("#wants-only").checked = state.onlyMissing;
    root.querySelector("#wants-summary").textContent = summaryText();
    root.querySelector("#wants-results").innerHTML = resultsHtml();
    root.querySelector("#wants-foot").textContent = `Source: the collection master (collection/albums.json), data of ${dataDate()}. Holes are computed, never typed.`;
  }

  function open(opts) {
    opts = opts || {};
    if (!root) build();
    lastFocus = document.activeElement;
    if (opts.family != null) state.family = opts.family || "";
    if (opts.q != null) state.q = opts.q;
    root.hidden = false;
    document.body.classList.add("wants-open");
    document.body.style.overflow = "hidden";
    root.querySelector("#wants-results").innerHTML = `<p class="wants-empty" role="status">Loading the master list…</p>`;
    root.querySelector(".wants-shell").scrollTop = 0;
    root.querySelector("#wants-title").focus();
    load().then(paint).catch(() => {
      root.querySelector("#wants-results").innerHTML = `<p class="wants-empty">The want list could not be loaded. Open the app once while online, then it also works offline.</p>`;
    });
  }
  function close() {
    if (!root) return;
    root.hidden = true;
    document.body.classList.remove("wants-open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* element gone */ } }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-wants]");
    if (t) { e.preventDefault(); open({ family: t.dataset.wantsFamily || "" }); }
  });

  const api = { open, close, print: printList, load, data: null, _state: state };
  window.TitanWants = api;
  // fetch once at idle so the file is in the service worker's data cache and the album numbers in app.js are the master's
  const kick = () => load().catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(kick, { timeout: 3000 }); else setTimeout(kick, 1200);
})();
