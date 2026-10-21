/* The Cabinet: a UI shell (Claude 2026-10-21). The collection as the coins themselves: every piece is its own photo cutout
   (Grok's TitanCutouts) drawn at its TRUE relative size (index `dia`, from the catalogue diameter), lying in velvet trays.
   Lenses (Country, Year, Value, New, Photos, Albums) re-sort the same coins and every coin glides to its new pocket, so
   the motion shows where a coin lives. Tap a coin and it lifts out of its pocket into your hand: drag or tap to turn it,
   tilt the phone and the light moves, read every fact with who said it, when and the source; Full record opens Classic's
   coin page with the photo-relief 3D coin. Albums are pages with real holes: filled ones hold a coin, missing ones are
   empty and priced. Contract (docs/design/THEME_CONTRACT.md): any coin in one tap (or search + Enter), sourced facts with
   provenance, a way back (Close, Esc) and home (UI), mute, search. Reads only data/ (read-only); never reaches into Classic's
   wings. Motion: Full / Calm / Off from TitanMotion (Calm and Off: no gliding, no fly-in). */
const BODY = `
<div class="cab-velvet" aria-hidden="true"></div>
<header class="cab-head">
  <div><span class="cab-kicker">The Cabinet</span><b id="cab-total">&nbsp;</b><span id="cab-sub"></span></div>
  <div class="cab-ctl">
    <button type="button" id="cab-find" aria-label="Search the collection"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg></button>
    <button type="button" id="cab-mute" aria-pressed="false" aria-label="Sound">♪</button>
    <button type="button" id="cab-ui" aria-label="Choose a UI">UI</button>
  </div>
</header>
<div class="cab-search" id="cab-searchbar" role="search" hidden>
  <input id="cab-q" type="search" autocomplete="off" enterkeyhint="go" aria-label="Find a coin or an album hole" placeholder="Country, year, coin, album…">
  <span id="cab-hits" aria-live="polite"></span>
  <button type="button" id="cab-all" title="Search everything (Classic's search)">All</button>
  <button type="button" id="cab-qx" aria-label="Close search">✕</button>
</div>
<main id="cab-scroll" tabindex="-1">
  <p class="cab-intro" id="cab-intro"></p>
  <div id="cab-world"></div>
  <div id="cab-albums" hidden></div>
</main>
<nav class="cab-lens" role="tablist" aria-label="Arrange the coins by">
  <button type="button" role="tab" data-lens="country">Country</button>
  <button type="button" role="tab" data-lens="year">Year</button>
  <button type="button" role="tab" data-lens="value">Value</button>
  <button type="button" role="tab" data-lens="new">New</button>
  <button type="button" role="tab" data-lens="photos">Photos</button>
  <button type="button" role="tab" data-lens="albums">Albums</button>
</nav>
<div id="cab-lift" role="dialog" aria-modal="true" aria-label="Coin" hidden>
  <div class="cab-veil"></div>
  <div class="cab-lift-bar">
    <button type="button" id="cab-close" aria-label="Put the coin back">✕ Back</button>
    <div class="nav"><button type="button" id="cab-prev" aria-label="Previous coin">‹</button><button type="button" id="cab-next" aria-label="Next coin">›</button></div>
  </div>
  <div class="cab-lift-in">
    <div class="cab-slot-wrap">
      <div class="cab-slot" id="cab-slot">
        <div class="cab-disc" id="cab-disc"><div class="cab-tilt" id="cab-tilt"><div class="cab-spin" id="cab-spin" role="button" tabindex="0" aria-label="Turn the coin over">
          <div class="cab-face f" id="cab-face-f"></div><div class="cab-face b" id="cab-face-b"></div>
        </div></div></div>
      </div>
      <p class="cab-side" id="cab-side"></p>
    </div>
    <section class="cab-card" id="cab-card" aria-live="polite"></section>
  </div>
</div>`;

const LEVELS = {
  verified: ["Verified by you", "#7fd1a0"], owner: ["You said so", "#7fd1a0"], checked: ["Checked by two sources", "#8fc3ff"],
  reference: ["From a catalogue", "#b9a6ff"], photo: ["Read from the photo", "#e0bd78"], ai: ["AI estimate", "#f0a07a"],
  imported: ["From the old ledger", "#b3a89e"], review: ["Being checked", "#ff9c9c"]
};
const CONT_ORDER = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function mount(root, svc) {
  const ac = new AbortController(), signal = ac.signal;
  root.innerHTML = BODY;
  const $ = (s) => root.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => n == null ? "" : "$" + Number(n).toLocaleString("en-US", n >= 100 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cents = (n) => n == null ? "" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const motion = () => (window.TitanMotion && window.TitanMotion.level ? window.TitanMotion.level() : (matchMedia("(prefers-reduced-motion: reduce)").matches ? "calm" : "full"));
  const full = () => motion() === "full" && !svc.lite();
  const sound = (k) => { try { window.TitanUISounds && window.TitanUISounds.play && window.TitanUISounds.play(k); } catch (e) { /* ignore */ } };
  const tick = (k) => { try { window.TitanHaptics && window.TitanHaptics.tick && window.TitanHaptics.tick(k || "tap"); } catch (e) { /* ignore */ } };
  root.dataset.motion = motion();

  /* ---------- data: only what the pipeline published ---------- */
  let idx;
  try { idx = await (await fetch("data/index.json")).json(); }
  catch (e) { root.innerHTML = '<p class="cab-empty">The Cabinet could not read data/index.json (offline before the first visit?). Classic still works: press UI.</p>'; return { unmount() { root.innerHTML = ""; } }; }
  const flips = idx.flips.filter((f) => f.status !== "Removed");
  const details = new Map();
  const detail = (d) => { if (!details.has(d)) details.set(d, fetch("data/detail/" + encodeURIComponent(d) + ".json").then((r) => r.json()).catch(() => ({}))); return details.get(d); };
  const side = (o) => (o.photos || []).reduce((m, p) => (m[p.role] = m[p.role] || p.url, m), {});
  let wants = null, status = null, questions = null;
  const wantsP = fetch("data/wants.json").then((r) => r.json()).then((w) => (wants = w)).catch(() => null);
  const statusP = Promise.all([fetch("data/status.json").then((r) => r.json()).catch(() => null), fetch("data/questions.json").then((r) => r.json()).catch(() => null)])
    .then(([s, q]) => { status = s; questions = q; });
  const cut = window.TitanCutouts;
  if (cut && cut.ready) await Promise.race([cut.ready().catch(() => null), new Promise((r) => setTimeout(r, 1500))]);
  const thumbOf = (f) => !f.thumb ? null : (cut && cut.has && cut.has(f.thumb) ? { src: cut.src(f.thumb, { thumb: true }), cut: true } : { src: f.thumb, cut: false });
  const fullOf = (u) => !u ? null : (cut && cut.has && cut.has(u) ? { src: cut.src(u), cut: true } : { src: u, cut: false });

  /* ---------- the headline: the same live value as Classic's Hall (latest Portfolio value), else the board total ---------- */
  const pd = (idx.value || {}).portfolio_daily, last = pd && pd.rows && pd.rows.length ? Object.fromEntries(pd.cols.map((c, i) => [c, pd.rows[pd.rows.length - 1][i]])) : null;
  const total = last && Number(last.total) > 0 ? Number(last.total) : (idx.board || {}).grand;
  const countries = new Set(flips.map((f) => f.iso)).size;
  const priced = last && last.d ? new Date(last.d + "T12:00:00Z") : null;
  $("#cab-sub").innerHTML = `${flips.length} pieces · ${countries} countries` + (priced ? `<small>metal at ${MONTHS[priced.getUTCMonth()]} ${priced.getUTCDate()} prices</small>` : "");
  const totEl = $("#cab-total");
  if (full() && total) { const t0 = performance.now(), D = 1100; const step = (t) => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      totEl.textContent = cents(Math.round(total * e * 100) / 100); if (k < 1 && !signal.aborted) requestAnimationFrame(step); else totEl.textContent = cents(total); }; requestAnimationFrame(step); }
  else totEl.textContent = cents(total);

  /* ---------- flags (only when the ISO code really names this country: EC is East Caribbean here, not Ecuador) ---------- */
  let regions = null; try { regions = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { /* old browser: no flags */ }
  const flagCache = new Map();
  const flag = (iso, name) => {
    if (flagCache.has(iso)) return flagCache.get(iso);
    let f = "";
    if (regions && /^[A-Z]{2}$/.test(iso || "")) { const n = regions.of(iso) || "", a = n.toLowerCase().split(/[ ,]/)[0], b = String(name || "").toLowerCase().split(/[ ,]/)[0];
      if (n && n !== iso && (a === b || n.toLowerCase() === String(name).toLowerCase())) f = String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)); }
    flagCache.set(iso, f); return f;
  };

  /* ---------- the coins: one button each, built once; lenses only move them ---------- */
  const world = $("#cab-world"), scroller = $("#cab-scroll");
  const median = 21;
  const shortYear = (y) => { const s = String(y || ""), m = s.match(/\((\d{4})\)/) || s.match(/\d{4}/); return m ? (m[1] || m[0]) : (s.slice(0, 4) || "?"); };
  const coins = flips.map((f, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "cab-coin"; b.dataset.i = i;
    const th = thumbOf(f);
    b.setAttribute("aria-label", `${f.label || f.country + " " + f.year + " " + f.denom}${f.est != null ? ", " + money(f.est) : ""}${th ? "" : ", no photo yet"}`);
    b.innerHTML = '<span class="pk"></span>' + (th ? `<span class="cf${th.cut ? " cut" : ""}"><img alt="" decoding="async" draggable="false"></span>`
      : `<span class="cf blank${f.is_silver ? " ag" : ""}"><b>${esc(shortYear(f.year))}</b><small>${esc(f.denom || "")}</small></span>`)
      + (f.is_silver ? '<span class="ag-dot" title="silver"></span>' : "") + `<span class="tag">${f.est != null ? money(f.est) : "no value yet"}</span>`;
    world.appendChild(b);
    return { f, el: b, th, mm: Number(f.dia) > 0 ? Number(f.dia) : median, x: 0, y: 0, d: 0, placed: false, hay: [f.label, f.country, f.year, f.denom, f.scan, f.ser, f.mint, f.continent].join(" ").toLowerCase() };
  });
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { const c = coins[+e.target.dataset.i]; io.unobserve(e.target); load(c); } }, { root: scroller, rootMargin: "700px 0px" }) : null;
  const load = (c) => { const img = c.el.querySelector("img"); if (img && !img.src && c.th) img.src = c.th.src; };
  coins.forEach((c) => (c.th ? (io ? io.observe(c.el) : load(c)) : 0));

  /* ---------- lenses: each returns groups { title, sub, cont, note, items[] } in display order ---------- */
  const yearOf = (f) => { const m = String(f.year || "").match(/\d{4}/); return m ? +m[0] : null; };
  const sum = (items) => items.reduce((a, i) => a + (Number(flips[i].est) || 0), 0);
  const byCountry = (a, b) => (flips[a].country || "").localeCompare(flips[b].country || "") || (yearOf(flips[a]) || 0) - (yearOf(flips[b]) || 0);
  const ALL = flips.map((_, i) => i);
  const LENS = {
    country() {
      const m = new Map(); for (const i of ALL) { const k = flips[i].country || "Unknown"; (m.get(k) || m.set(k, []).get(k)).push(i); }
      const g = [...m.entries()].map(([k, items]) => ({ key: k, cont: flips[items[0]].continent || "Other", items: items.sort((a, b) => (yearOf(flips[a]) || 0) - (yearOf(flips[b]) || 0)) }));
      g.sort((a, b) => ((CONT_ORDER.indexOf(a.cont) + 99) % 99) - ((CONT_ORDER.indexOf(b.cont) + 99) % 99) || b.items.length - a.items.length || a.key.localeCompare(b.key));
      let lastCont = null;
      return g.map((x) => { const first = x.cont !== lastCont; lastCont = x.cont; const f = flips[x.items[0]];
        return { title: x.key, flag: flag(f.iso, f.country), cont: first ? x.cont : null, sub: `${x.items.length} ${x.items.length === 1 ? "piece" : "pieces"} · ${money(sum(x.items))}`, items: x.items }; });
    },
    year() {
      const m = new Map(); for (const i of ALL) { const y = yearOf(flips[i]); const k = y == null ? "No date" : Math.floor(y / 10) * 10; (m.get(k) || m.set(k, []).get(k)).push(i); }
      return [...m.entries()].sort((a, b) => (a[0] === "No date") - (b[0] === "No date") || a[0] - b[0])
        .map(([k, items]) => ({ title: k === "No date" ? "No date" : `${k}s`, sub: `${items.length} ${items.length === 1 ? "piece" : "pieces"} · ${money(sum(items))}`,
          items: items.sort((a, b) => (yearOf(flips[a]) || 0) - (yearOf(flips[b]) || 0) || byCountry(a, b)) }));
    },
    value() {
      const bands = [["$100 and up", 100, 1e12], ["$10 to $100", 10, 100], ["$1 to $10", 1, 10], ["Under $1", 0, 1]];
      const out = bands.map(([t, lo, hi]) => ({ title: t, items: ALL.filter((i) => flips[i].est != null && flips[i].est >= lo && flips[i].est < hi).sort((a, b) => flips[b].est - flips[a].est) }));
      out.push({ title: "No value yet", items: ALL.filter((i) => flips[i].est == null) });
      return out.filter((g) => g.items.length).map((g) => ({ ...g, sub: `${g.items.length} ${g.items.length === 1 ? "piece" : "pieces"}` + (g.title !== "No value yet" ? ` · ${money(sum(g.items))}` : "") }));
    },
    new() {
      const day = (f) => (f.added ? new Date(f.added + "T12:00:00Z") : null);
      const wk = (d) => { const m = new Date(d); const dow = (m.getUTCDay() + 6) % 7; m.setUTCDate(m.getUTCDate() - dow); return m.toISOString().slice(0, 10); };
      const m = new Map(); for (const i of ALL) { const d = day(flips[i]); const k = d ? wk(d) : "0000"; (m.get(k) || m.set(k, []).get(k)).push(i); }
      return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, items]) => { const d = k === "0000" ? null : new Date(k + "T12:00:00Z");
        return { title: d ? `Week of ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` : "Date not logged", sub: `${items.length} added · ${money(sum(items))}`,
          items: items.sort((a, b) => String(flips[b].added || "").localeCompare(String(flips[a].added || "")) || byCountry(a, b)) }; });
    },
    photos() {
      const need = ALL.filter((i) => !flips[i].thumb).sort(byCountry), have = ALL.filter((i) => flips[i].thumb).sort(byCountry);
      return [{ title: "Still needs a phone photo", sub: `${need.length} ${need.length === 1 ? "piece" : "pieces"}`, note: 'Photograph them with <button type="button" class="cab-link" data-go="scan">Scan a coin</button>: it checks the photo, names it and sends it to Drive.', items: need },
              { title: "Photographed", sub: `${have.length} pieces`, items: have }].filter((g) => g.items.length);
    }
  };

  /* ---------- layout: coins at true scale, packed in rows inside each tray ---------- */
  let lens = "country", groups = [], order = [], trays = [], movingT = 0;
  const scale = () => { const w = Math.min(world.clientWidth || scroller.clientWidth, 1180); return Math.max(2.2, Math.min(3.6, (w - 56) / 138)); };
  function layout(animate) {
    const s = scale(), W = world.clientWidth || scroller.clientWidth, L = 12 + 16, R = W - 12 - 16, GX = 10, GY = lens === "value" ? 30 : 14;
    root.style.setProperty("--s", s);
    const old = trays; trays = [];
    let y = 0, n = 0; order = [];
    const made = groups.map((g) => { const t = document.createElement("section"); t.className = "cab-tray" + (animate && full() ? " gone" : "");
      t.innerHTML = `<div class="cab-th">` + (g.cont ? `<span class="cab-cont">${esc(g.cont)}</span>` : "") + `<h2>${g.flag ? `<span class="fl" aria-hidden="true">${g.flag}</span>` : ""}${esc(g.title)} <small>${esc(g.sub || "")}</small></h2>` + (g.note ? `<p class="cab-note">${g.note}</p>` : "") + `</div>`;
      world.insertBefore(t, world.firstChild); trays.push(t); return t; });
    const heads = made.map((t) => t.firstChild.offsetHeight);          // one layout pass for every tray header
    groups.forEach((g, gi) => {
      const t = made[gi], headH = heads[gi];
      let x = L, cy = y + headH + 12, row = [];
      const flush = () => { const h = Math.max(...row.map((c) => c.d)); for (const c of row) { c.ny = cy + (h - c.d) / 2; } cy += h + GY; row = []; };
      for (const i of g.items) { const c = coins[i]; c.d = Math.round(c.mm * s); if (x + c.d > R && row.length) { flush(); x = L; } c.nx = x; row.push(c); x += c.d + GX; order.push(i); c.ord = n++; }
      if (row.length) flush();
      const h = cy - y + 4;
      t.style.top = y + "px"; t.style.height = h + "px";
      y += h + 14;
    });
    world.style.height = Math.max(y, 10) + "px";
    const showing = new Set(order);
    const fly = animate && full();
    if (fly) { world.classList.add("moving"); clearTimeout(movingT); movingT = setTimeout(() => world.classList.remove("moving"), 1400); }
    else world.classList.add("still");
    for (const c of coins) {
      const on = showing.has(+c.el.dataset.i);
      c.el.style.display = on ? "" : "none"; if (!on) continue;
      if (c.sized !== c.d) { c.el.style.width = c.el.style.height = c.d + "px"; c.el.style.setProperty("--d", c.d + "px"); c.el.classList.toggle("tiny", c.d < 46); c.sized = c.d; }
      c.el.style.transitionDelay = fly ? Math.min(c.ord * 2.5, 480) + "ms" : "0ms";
      c.el.style.transform = `translate3d(${c.nx}px, ${c.ny}px, 0)`; c.x = c.nx; c.y = c.ny;
    }
    if (!fly) { void world.offsetWidth; world.classList.remove("still"); }
    if (fly) requestAnimationFrame(() => trays.forEach((t) => t.classList.remove("gone")));
    for (const t of old) { t.classList.add("gone"); setTimeout(() => t.remove(), fly ? 460 : 0); }
    applySearch();
  }
  /* the first open: coins drop into their pockets, nearest first (Full motion only, first screen only) */
  function dropIn() {
    if (!full()) return;
    const vh = scroller.clientHeight + 200;
    for (const c of coins) { if (c.el.style.display === "none" || c.y > vh) continue;
      c.el.style.transition = "none"; c.el.style.opacity = "0"; c.el.style.transform = `translate3d(${c.x}px, ${c.y - 46}px, 0) scale(.82)`; }
    void world.offsetWidth;
    for (const c of coins) { if (c.el.style.display === "none" || c.y > vh) continue;
      c.el.style.transition = ""; c.el.style.transitionDelay = Math.min(c.ord * 9, 700) + "ms"; c.el.style.opacity = ""; c.el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`; }
  }

  function intro() {
    const p = $("#cab-intro");
    const tr = status && status.trust, p1 = status && status.phase1, nq = questions && questions.questions ? questions.questions.length : null;
    const bits = {
      country: `Every piece at its true size, by country. Tap a coin to lift it out.`,
      year: `The same coins, oldest decade first.`,
      value: `Most valuable first, with each coin's estimate under it.`,
      new: `What came in lately, newest week first.`,
      photos: p1 ? `<b>${p1.done} of ${p1.total}</b> pieces are through Phase 1; the blank ones below still need a phone photo.` : `The blank ones still need a phone photo.`,
      albums: `Every album as a page: filled holes hold a coin, empty ones show what it costs to fill them.`
    };
    let extra = "";
    if (lens === "country" && tr) extra = ` <b>${tr.pct_cited} %</b> of the facts are cited or confirmed.` + (nq ? ` <button type="button" class="cab-link" data-go="questions">${nq} questions</button> only the coin can answer.` : "");
    p.innerHTML = bits[lens] + extra;
  }
  statusP.then(() => !signal.aborted && intro());

  function setLens(id, quiet) {
    if (!LENS[id] && id !== "albums") return;
    lens = id; root.dataset.lens = id;
    root.querySelectorAll(".cab-lens button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.lens === id)));
    try { localStorage.setItem("tr.cabinet.lens", id); } catch (e) { /* ignore */ }
    intro();
    if (id === "albums") { world.hidden = true; $("#cab-albums").hidden = false; albums(); }
    else { world.hidden = false; $("#cab-albums").hidden = true; groups = LENS[id](); layout(!quiet); }
    if (!quiet) { scroller.scrollTo({ top: 0, behavior: full() ? "smooth" : "auto" }); sound("wing"); tick("tap"); }
  }

  /* ---------- albums: pages with real holes ---------- */
  let albumsBuilt = false;
  async function albums() {
    const box = $("#cab-albums");
    if (albumsBuilt) return applySearch();
    await wantsP;
    if (!wants || !wants.volumes) { box.innerHTML = '<p class="cab-empty">The album data (data/wants.json) is not here yet. Classic shows the albums under Albums.</p>'; return; }
    albumsBuilt = true;
    let fam = null, html = "";
    for (const v of wants.volumes) {
      if (v.family !== fam) { fam = v.family; html += `<h2 class="cab-fam">${esc(fam)}</h2>`; }
      const tot = v.slots_total || (v.filled + v.missing) || 0, pct = tot ? Math.round((v.filled / tot) * 100) : 0;
      const cost = v.cost && v.cost.usd ? ` · about ${money(v.cost.usd)} to complete` : "";
      const mt = String(v.metal || v.denomination || ""), m = /gold/i.test(mt) ? "au" : /silver/i.test(mt) ? "ag" : /copper|bronze|zinc|cent/i.test(mt) ? "cu" : /nickel|clad|cupro/i.test(mt) ? "ni" : "au";
      html += `<details class="cab-alb" data-v="${esc(v.id)}" data-m="${m}"><summary><span class="t">${esc(v.title)}</span><span class="pct">${pct} %</span>
        <span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span><span class="m">${v.filled} of ${tot}${v.slots_total_approx ? " (about)" : ""} filled · ${v.missing} missing${cost}</span></summary><div class="cab-page"></div></details>`;
    }
    box.innerHTML = html;
    box.addEventListener("toggle", (e) => { const d = e.target; if (d.open && !d.dataset.built) fillPage(d); }, { capture: true, signal });
    applySearch();
  }
  function fillPage(d) {
    const v = wants.volumes.find((x) => x.id === d.dataset.v); if (!v) return;
    d.dataset.built = "1";
    const holes = [...(v.have_named || []).map((h) => ({ ...h, have: true })), ...(v.missing_named || []).map((h) => ({ ...h, have: false }))]
      .sort((a, b) => (a.year || 0) - (b.year || 0) || String(a.label).localeCompare(String(b.label)));
    d.querySelector(".cab-page").innerHTML = holes.map((h) => `<span class="cab-hole${h.have ? " have" : ""}" data-l="${esc(String(h.label).toLowerCase())}" title="${esc(h.label)}${h.have ? " · in the album" : " · missing"}${h.price && h.price.usd ? " · about " + money(h.price.usd) + " (" + esc(h.price.grade || "") + ")" : ""}"><i></i><span>${esc(h.label)}</span>${!h.have && h.price && h.price.usd ? `<span class="p">${money(h.price.usd)}</span>` : ""}</span>`).join("")
      + (v.unnamed_missing ? `<p class="cab-more">Plus ${v.unnamed_missing} more empty ${v.unnamed_missing === 1 ? "hole" : "holes"} without a printed label.</p>` : "");
    applySearch();
  }

  /* ---------- search: matching coins (or album holes) stay lit, the rest step back ---------- */
  const bar = $("#cab-searchbar"), q = $("#cab-q");
  let hits = [];
  function applySearch() {
    const toks = (q.value || "").toLowerCase().split(/\s+/).filter(Boolean);
    if (lens === "albums") {
      let n = 0;
      root.querySelectorAll("details.cab-alb").forEach((d) => {
        const v = wants && wants.volumes.find((x) => x.id === d.dataset.v); if (!v) return;
        const head = [v.title, v.family, v.denomination, v.metal].join(" ").toLowerCase();
        const lab = [...(v.have_named || []), ...(v.missing_named || [])].map((h) => String(h.label).toLowerCase());
        const okHead = toks.every((t) => head.includes(t)), holeHit = toks.length && !okHead && toks.every((t) => lab.some((l) => l.includes(t)) || head.includes(t));
        const show = !toks.length || okHead || holeHit; d.hidden = !show; if (show && toks.length) n++;
        if (holeHit && !d.open) d.open = true;
        if (d.dataset.built) d.querySelectorAll(".cab-hole").forEach((h) => h.classList.toggle("hit", !!toks.length && toks.some((t) => h.dataset.l.includes(t)) && !okHead));
      });
      $("#cab-hits").textContent = toks.length ? `${n} ${n === 1 ? "album" : "albums"}` : "";
      return;
    }
    hits = [];
    for (const i of order) { const c = coins[i], ok = !toks.length || toks.every((t) => c.hay.includes(t));
      c.el.classList.toggle("dim", !!toks.length && !ok); c.el.classList.toggle("hit", !!toks.length && ok); if (toks.length && ok) hits.push(i); }
    $("#cab-hits").textContent = toks.length ? `${hits.length} found` : "";
  }
  q.addEventListener("input", () => { applySearch(); if (hits.length && lens !== "albums") { const c = coins[hits[0]]; scroller.scrollTo({ top: Math.max(0, c.y - 40), behavior: full() ? "smooth" : "auto" }); } }, { signal });
  q.addEventListener("keydown", (e) => { if (e.key === "Enter" && hits.length && lens !== "albums") { e.preventDefault(); lift(hits[0]); } }, { signal });
  const openSearch = () => { bar.hidden = false; q.focus(); sound("search"); };
  const closeSearch = () => { bar.hidden = true; q.value = ""; applySearch(); $("#cab-find").focus(); };
  $("#cab-find").addEventListener("click", openSearch, { signal });
  $("#cab-qx").addEventListener("click", closeSearch, { signal });
  $("#cab-all").addEventListener("click", () => svc.search(), { signal });

  /* ---------- the lifted coin ---------- */
  const lf = $("#cab-lift"), disc = $("#cab-disc"), spin = $("#cab-spin"), tilt = $("#cab-tilt"), slot = $("#cab-slot");
  let cur = -1, angle = 0, lastFocus = null;
  const faceHtml = (src, f, which) => src ? `<img alt="${esc(f.label || "")} (${which})" class="${src.cut ? "" : "round"}" src="${esc(src.src)}" draggable="false"><span class="sheen"></span>`
    : `<div class="blank"><b>${esc(String(f.year || ""))}</b><span>${esc(f.denom || "")}</span><span>No photo of the ${which} yet</span></div>`;
  function setFaces(i, det) {
    const f = flips[i], s = det ? side(det) : {}, first = f.thumb_side || "obv", second = first === "obv" ? "rev" : "obv";
    const name = (k) => (k === "obv" ? "front" : "back");
    const a = s[first] || f.thumb, b = s[second];
    $("#cab-face-f").innerHTML = faceHtml(fullOf(a) || thumbOf(f), f, name(first));
    $("#cab-face-b").innerHTML = faceHtml(fullOf(b), f, name(second));
    $("#cab-face-f").dataset.side = name(first); $("#cab-face-b").dataset.side = name(second);
    sideLabel();
  }
  const sideLabel = () => { const front = (((angle % 360) + 360) % 360) < 90 || (((angle % 360) + 360) % 360) > 270;
    $("#cab-side").textContent = `The ${front ? $("#cab-face-f").dataset.side : $("#cab-face-b").dataset.side} · tap or drag to turn it over`; };
  const chip = (cert, key) => {
    let e = cert && cert[key]; if (!e) e = { level: "imported" };
    const base = e.like && cert[e.like] ? { ...cert[e.like], level: e.level } : e;
    const [lab, col] = LEVELS[base.level] || [base.level || "", "#999"];
    const links = (base.links || []).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").slice(0, 48))}</a>`).join(" ");
    const prov = [base.by, base.ts, base.source && !links ? base.source : (base.source || "").replace(/https?:\/\/\S+/g, "").trim()].filter(Boolean).map(esc).join(" · ");
    return `<button type="button" class="cab-chip" style="--c:${col}" aria-expanded="false"><i></i>${esc(lab)}</button><span class="cab-prov" hidden>${prov || "No source recorded."}${links ? " " + links : ""}</span>`;
  };
  async function fillCard(i) {
    const f = flips[i], card = $("#cab-card");
    card.innerHTML = `<h2>${esc(f.country)} ${esc(f.year || "")}</h2><div class="who">${esc(f.denom || "")}${f.mint ? " · mint " + esc(f.mint) : ""} · ${esc(f.scan)}</div>
      <div class="val">${f.est != null ? money(f.est) : "No value yet"}<small>${f.conf ? esc(f.conf) + " confidence" : ""}</small></div><p class="cab-side">Loading the record…</p>`;
    const det = (await detail(f.d))[f.scan];
    if (cur !== i) return;
    if (!det) { card.querySelector(".cab-side").textContent = "The full record could not be loaded (offline?)."; return; }
    setFaces(i, det);
    const c = det.certainty || {};
    const rows = [["Year", det.year, "year"], ["Mint", det.mint && det.year_line ? det.year_line.split(" · ").slice(1).join(" · ").replace(/^Mint:\s*/i, "") : det.mint, "mint"], ["Face value", det.denom_line, "denomination"],
      ["Metal", det.metal, "composition"], ["Mintage", det.mintage, "mintage"], ["Catalogue", det.refs, "catalog"], ["Design", det.design, "design"],
      ["Value", det.est != null ? money(det.est) + (det.conf ? ` (${det.conf} confidence)` : "") : null, "value"], ["Where it came from", det.origin, "acquisition"]].filter((r) => r[1]);
    card.innerHTML = `<h2>${esc(det.country)} ${esc(det.year || "")}</h2><div class="who">${esc(det.denom_line || det.denom || "")}${det.mint ? " · mint " + esc(det.mint) : ""} · ${esc(det.scan)}${det.ser ? " · " + esc(det.ser) : ""}</div>
      <div class="val">${det.est != null ? money(det.est) : "No value yet"}<small>${det.conf ? esc(det.conf) + " confidence" : ""}</small></div>
      ${det.story ? `<p class="story">${esc(det.story)}</p>${chip(c, "story")}` : ""}
      <dl class="cab-facts">${rows.map(([k, v, key]) => `<dt>${esc(k)}</dt><dd>${esc(v)}<br>${chip(c, key)}</dd>`).join("")}</dl>
      ${(det.history || []).length ? `<details class="cab-hist"><summary>History of this record (${det.history.length})</summary><ol>${det.history.map((h) => `<li>${esc(h.ts)} · ${esc(h.what)}</li>`).join("")}</ol></details>` : ""}
      <div class="cab-acts"><button type="button" class="main" id="cab-full">Full record and the 3D coin</button><button type="button" id="cab-turn">Turn it over</button></div>`;
  }
  $("#cab-card").addEventListener("click", (e) => {
    const ch = e.target.closest(".cab-chip"); if (ch) { const p = ch.nextElementSibling; p.hidden = !p.hidden; ch.setAttribute("aria-expanded", String(!p.hidden)); return; }
    if (e.target.closest("#cab-full")) { svc.openCoin(flips[cur].scan); return; }
    if (e.target.closest("#cab-turn")) turn(180);
  }, { signal });

  function rectOf(c) { const r = c.el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; }
  function lift(i) {
    if (i == null || i < 0) return;
    const c = coins[i]; if (!c) return;
    const opening = lf.hidden;
    if (!opening) { swap(i, i > cur ? 1 : -1); return; }
    cur = i; angle = 0; spin.style.transition = "none"; spin.style.transform = "rotateY(0deg)"; void spin.offsetWidth; spin.style.transition = "";
    lastFocus = document.activeElement;
    const D = Math.round(Math.min(window.innerWidth - 48, 360, window.innerHeight * 0.46));
    slot.style.setProperty("--D", D + "px");
    setFaces(i, null); fillCard(i);
    lf.hidden = false; lf.scrollTop = 0; c.el.classList.add("out");
    const s = slot.getBoundingClientRect(), t = rectOf(c);
    if (full()) disc.animate([{ transform: `translate(${t.x - s.left}px, ${t.y - s.top}px) scale(${t.w / D})` }, { transform: "none" }], { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)" });
    requestAnimationFrame(() => lf.classList.add("on"));
    sound("coin-open"); tick("tap");
    $("#cab-close").focus({ preventScroll: true });
  }
  function swap(i, dir) {
    const was = coins[cur]; was && was.el.classList.remove("out");
    cur = i; coins[i].el.classList.add("out"); angle = 0;
    const go = () => { spin.style.transition = "none"; spin.style.transform = "rotateY(0deg)"; void spin.offsetWidth; spin.style.transition = ""; setFaces(i, null); fillCard(i); lf.scrollTop = 0; };
    if (full()) { disc.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-dir * 38}%) rotate(${-dir * 8}deg)`, opacity: 0 }], { duration: 170, easing: "ease-in" }).onfinish = () => {
        go(); disc.animate([{ transform: `translateX(${dir * 38}%) rotate(${dir * 8}deg)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" }); }; }
    else go();
    sound("flip"); tick("tap");
    const c = coins[i]; if (c.y < scroller.scrollTop || c.y > scroller.scrollTop + scroller.clientHeight - 120) scroller.scrollTo({ top: Math.max(0, c.y - 80) });
  }
  function close() {
    if (lf.hidden) return;
    const c = coins[cur]; const s = slot.getBoundingClientRect();
    const done = () => { lf.hidden = true; lf.classList.remove("on"); c && c.el.classList.remove("out"); cur = -1; (lastFocus && lastFocus.focus) ? lastFocus.focus({ preventScroll: true }) : c && c.el.focus({ preventScroll: true }); };
    lf.classList.remove("on"); sound("coin-close");
    if (!c || !full()) return done();
    const t = rectOf(c), vis = t.y > -t.w && t.y < window.innerHeight;
    if (!vis) return done();
    const D = s.width; spin.style.transform = "rotateY(0deg)";
    disc.animate([{ transform: "none" }, { transform: `translate(${t.x - s.left}px, ${t.y - s.top}px) scale(${t.w / D})` }], { duration: 480, easing: "cubic-bezier(.4,0,.2,1)" }).onfinish = done;
  }
  const step = (k) => { const p = order.indexOf(cur); const n = order[(p + k + order.length) % order.length]; if (n != null) lift(n); };
  const turn = (deg) => { angle += deg; spin.style.transform = `rotateY(${angle}deg)`; sideLabel(); sound("flip"); tick("tap"); };
  $("#cab-close").addEventListener("click", close, { signal });
  $("#cab-prev").addEventListener("click", () => step(-1), { signal });
  $("#cab-next").addEventListener("click", () => step(1), { signal });
  lf.querySelector(".cab-veil").addEventListener("click", close, { signal });
  spin.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(180); } }, { signal });
  /* drag to turn the coin; a tap turns it over */
  let drag = null;
  spin.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, a: angle, moved: false }; spin.setPointerCapture(e.pointerId); spin.style.transition = "none"; }, { signal });
  spin.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true; if (drag.moved) { angle = drag.a + dx * 0.7; spin.style.transform = `rotateY(${angle}deg)`; } }, { signal });
  const endDrag = () => { if (!drag) return; spin.style.transition = ""; if (!drag.moved) { drag = null; turn(180); return; }
    angle = Math.round(angle / 180) * 180; spin.style.transform = `rotateY(${angle}deg)`; sideLabel(); drag = null; };
  spin.addEventListener("pointerup", endDrag, { signal }); spin.addEventListener("pointercancel", endDrag, { signal });
  /* swipe the card sideways for the next coin */
  let sw = null;
  $("#cab-card").addEventListener("touchstart", (e) => { const t = e.touches[0]; sw = { x: t.clientX, y: t.clientY }; }, { passive: true, signal });
  $("#cab-card").addEventListener("touchend", (e) => { if (!sw) return; const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1); }, { passive: true, signal });

  /* ---------- light: the pointer or the phone's tilt moves it; the lifted coin also tilts toward you ---------- */
  let lx = 35, ly = 25, tx = 0, ty = 0, raf = 0;
  const paint = () => { raf = 0; root.style.setProperty("--lx", lx + "%"); root.style.setProperty("--ly", ly + "%"); if (!lf.hidden) tilt.style.transform = `rotateX(${tx}deg) rotateY(${ty}deg)`; };
  const light = (nx, ny) => { if (!full()) return; lx = 10 + nx * 80; ly = 8 + ny * 70; tx = (0.5 - ny) * 10; ty = (nx - 0.5) * 14; if (!raf) raf = requestAnimationFrame(paint); };
  root.addEventListener("pointermove", (e) => { if (!lf.hidden) light(e.clientX / window.innerWidth, e.clientY / window.innerHeight); }, { signal, passive: true });
  window.addEventListener("deviceorientation", (e) => { if (e.gamma == null || lf.hidden) return; light(Math.max(0, Math.min(1, 0.5 + e.gamma / 60)), Math.max(0, Math.min(1, 0.5 + (e.beta - 40) / 60))); }, { signal, passive: true });

  /* ---------- wiring ---------- */
  world.addEventListener("click", (e) => { const b = e.target.closest(".cab-coin"); if (b) lift(+b.dataset.i); }, { signal });
  root.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); location.hash = g.dataset.go; } }, { signal });
  root.querySelector(".cab-lens").addEventListener("click", (e) => { const b = e.target.closest("[data-lens]"); if (b && b.dataset.lens !== lens) setLens(b.dataset.lens); }, { signal });
  $("#cab-ui").addEventListener("click", () => svc.chooseUI(), { signal });
  const mute = $("#cab-mute"); const syncMute = () => { const m = svc.isMuted(); mute.setAttribute("aria-pressed", String(!m)); mute.textContent = m ? "♪ off" : "♪"; mute.setAttribute("aria-label", m ? "Sound is off: turn it on" : "Sound is on: turn it off"); };
  mute.addEventListener("click", () => { svc.setMuted(!svc.isMuted()); syncMute(); }, { signal }); syncMute();
  document.addEventListener("keydown", (e) => {
    if (svc.coverOpen()) return;                         // Classic's coin page or the UI chooser is on top: their Esc
    if (e.key === "Escape") { if (!lf.hidden) { e.preventDefault(); close(); } else if (!bar.hidden) { e.preventDefault(); closeSearch(); } }
    else if (!lf.hidden && e.key === "ArrowRight") step(1);
    else if (!lf.hidden && e.key === "ArrowLeft") step(-1);
    else if (e.key === "/" && lf.hidden && document.activeElement !== q) { e.preventDefault(); openSearch(); }
  }, { signal });
  let rt = 0; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => lens !== "albums" && layout(false), 160); }, { signal });
  const head = root.querySelector(".cab-head"); const headH = () => root.style.setProperty("--headH", head.offsetHeight + 6 + "px"); headH();
  window.addEventListener("titan:motion", () => (root.dataset.motion = motion()), { signal });

  let start = "country"; try { start = localStorage.getItem("tr.cabinet.lens") || "country"; } catch (e) { /* ignore */ }
  setLens(LENS[start] || start === "albums" ? start : "country", true);
  if (lens !== "albums") dropIn();

  /* Classic's GPU effect layer would keep drawing under the opaque cover: pause it, and give it back on the way out */
  const FX = window.TitanFX, hadFx = !!(FX && FX.state && FX.state().playing);
  if (hadFx) { try { FX.stop(0.3); } catch (e) { /* ignore */ } }
  window.addEventListener("titan:atmo", () => setTimeout(() => { try { if (FX && FX.state().playing) FX.stop(0.3); } catch (e) { /* ignore */ } }, 60), { signal });

  window.__cabinet = { state: () => (lf.hidden ? "cabinet" : "coin"), lens: () => lens, setLens, lift: (scan) => lift(flips.findIndex((f) => f.scan === scan)), close, count: () => flips.length, order: () => order.slice() };
  return {
    unmount() { ac.abort(); io && io.disconnect(); if (raf) cancelAnimationFrame(raf); delete window.__cabinet; root.innerHTML = "";
      if (hadFx) { try { window.TitanFXUI && window.TitanFXUI.apply ? window.TitanFXUI.apply() : 0; } catch (e) { /* ignore */ } } }
  };
}
