/* Titan Reliquary: the new front (preview). A museum at night: the theme's photograph behind smoked glass, the coins lit like jewelry.
   It reads the same published data (data/index.json, data/detail/{ISO}.json) and stands on the photograph engine (wings/plate.js).
   Views: Hall (#/), the Wall (#/wall), a specimen (#/coin/C001), the Vault (#/vault), Worlds (#/worlds). Nothing here writes data. */
const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function h(tag, attrs, ...kids) {
  if (attrs != null && (attrs.nodeType || typeof attrs !== "object" || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  const [name, ...cls] = tag.split("."); const el = document.createElement(name || "div"); if (cls.length) el.className = cls.join(" ");
  if (attrs) for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else if (k === "style" && typeof v === "object") Object.assign(el.style, v); else if (k === "dataset") Object.assign(el.dataset, v); else el.setAttribute(k, v === true ? "" : v); }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false && k !== "") el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
const svg = (d, size = 22) => { const el = document.createElementNS("http://www.w3.org/2000/svg", "svg"); el.setAttribute("viewBox", "0 0 24 24"); el.setAttribute("width", size); el.setAttribute("height", size); el.setAttribute("fill", "none"); el.setAttribute("stroke", "currentColor"); el.setAttribute("stroke-width", "1.5"); el.setAttribute("stroke-linecap", "round"); el.setAttribute("stroke-linejoin", "round"); el.setAttribute("aria-hidden", "true"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); el.append(p); return el; };
const IC = { hall: "M3 10.5L12 4l9 6.5M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20", wall: "M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z", vault: "M4 5h16v14H4zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5M12 6.5v3M12 14.5v3M6.5 12h3M14.5 12h3",
  world: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.200 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.400 5.600 12 3", back: "M14.5 5l-7 7l7 7", next: "M9.500 5l7 7l-7 7", search: "M10.5 17a6.500 6.500 0 1 0 0-13a6.500 6.500 0 0 0 0 13M20 20l-4.500-4.500", x: "M6 6l12 12M18 6L6 18", flip: "M4 12a8 8 0 0 1 13.700-5.600L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.700 5.600L4 15M4 20v-5h5", door: "M6 21V4h12v17M4 21h16M14.500 12.500h.010" };
const usd = (n, d = 2) => (n == null || isNaN(n) ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const oz = (n, d = 2) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const cut = (u) => (u ? u.replace("photos/p1/", "photos/cut/") : null);
const theme = () => document.documentElement.dataset.atmo || "afterhours";
/** The calendar year of a piece: the Gregorian year in brackets when the coin carries another era ("AH 1378 (1958)"), else its first four digits. */
const yearOf = (c) => { const s = String(c.year || ""); const m = s.match(/\((\d{4})\)/) || s.match(/(\d{4})/); return m ? parseInt(m[1], 10) : 9999; };

const S = { D: null, coins: [], byId: new Map(), detail: new Map(), q: "", cont: "All", sort: "country", wallTop: 0, last: null, room: null };
const stage = $("#stage");

/* ------------------------------------------------------------------ pieces ------------------------------------------------------------------ */
function coinImg(c, cls = "", eager = false) {
  if (!c.thumb) return h("span.blank" + (cls ? "." + cls : ""), { "aria-hidden": "true" }, h("b", c.iso || "?"), h("small", String(c.year || "")));
  const img = h("img" + (cls ? "." + cls : ""), { src: cut(c.thumb), alt: "", loading: eager ? "eager" : "lazy", fetchpriority: eager ? "high" : null, decoding: "async", width: 512, height: 512, draggable: "false" });
  img.addEventListener("error", () => { if (!img.dataset.fb) { img.dataset.fb = "1"; img.src = c.thumb; } }, { once: true });
  return img;
}
function tile(c, grouped) {
  const a = h("a.tile", { href: `#/coin/${c.scan}`, "aria-label": c.label, dataset: { id: c.scan } }, h("span.disc", coinImg(c)), h("span.cap", h("b", grouped ? c.denom : c.country), h("small", grouped ? String(c.year || "n.d.") : `${c.year || "n.d."} · ${c.denom}`)));
  a.addEventListener("click", () => { const im = $("img", a); if (im) im.style.viewTransitionName = "coin"; S.last = c.scan; });
  return a;
}
function go(hash) { location.hash = hash; }

/* ------------------------------------------------------------------ Hall ------------------------------------------------------------------ */
function hall(root) {
  const D = S.D, B = D.board, M = D.metals; const total = B.grand; const [whole, cents] = usd(total).split(".");
  const melt = (M.melt.ag_usd || 0) + (M.melt.au_usd || 0);
  const best = S.coins.filter((c) => c.thumb).sort((a, b) => (b.est || 0) - (a.est || 0)).slice(0, 14);
  const newest = S.coins.filter((c) => c.thumb).sort((a, b) => String(b.added).localeCompare(String(a.added)) || b.scan.localeCompare(a.scan)).slice(0, 14);
  const yr = yearOf; const oldest = S.coins.slice().sort((x, y) => yr(x) - yr(y))[0]; const deep = (D.world || []).slice().sort((x, y) => y.count - x.count)[0];
  const shelf = (title, list, note, lead) => h("section.shelf", h("header", h("h2", title), h("small", note)), h("div.shelf-row", list.map((c, i) => { const a = tile(c); a.classList.add("big"); if (lead && i < 2) { const im = $("img", a); if (im) { im.loading = "eager"; im.setAttribute("fetchpriority", "high"); } } return a; })));
  root.append(
    h("section.hero",
      h("p.eyebrow", "The collection · held, not for sale"),
      h("h1.grand", { "aria-label": usd(total) }, h("span", whole), h("small", "." + cents)),
      h("p.hero-line", `${oz(M.oz.ag)} oz silver · ${oz(M.oz.au, 4)} oz gold · ${usd(melt, 0)} in metal`),
      h("div.trio",
        h("a", { href: "#/wall" }, h("b", D.counts.vault.toLocaleString("en-US")), h("small", "pieces")),
        h("a", { href: "#/wall" }, h("b", String(D.counts.countries)), h("small", "countries")),
        h("a", { href: "#/vault" }, h("b", String(B.albums.folders)), h("small", "albums")))),
    shelf("Crown of the collection", best, "by estimate", true),
    shelf("Latest arrivals", newest, newest[0] ? "added " + newest[0].added : ""),
    h("section.glass", h("header", h("h2", "By the numbers")), h("div.facts4",
      oldest ? h("a", { href: `#/coin/${oldest.scan}` }, h("small", "Oldest piece"), h("b", String(yr(oldest))), h("span", `${oldest.country} · ${oldest.denom}`)) : null,
      deep ? h("a", { href: "#/wall" }, h("small", "Deepest bench"), h("b", String(deep.count)), h("span", `pieces from ${deep.country}`)) : null,
      h("a", { href: "#/wall" }, h("small", "Photographed"), h("b", `${D.photos.coins_with_photos}`), h("span", `of ${D.counts.flips} specimens`)),
      h("a", { href: "#/vault" }, h("small", "In metal"), h("b", `${Math.round((melt / total) * 100)}%`), h("span", "of the estimate is silver and gold")))),
    h("section.doors",
      h("a.door", { href: "#/wall" }, svg(IC.wall), h("span", h("b", "The Wall"), h("small", `${D.counts.flips} specimens, ${D.photos.coins_with_photos} photographed`)), svg(IC.next, 18)),
      h("a.door", { href: "#/vault" }, svg(IC.vault), h("span", h("b", "The Vault"), h("small", `${D.counts.bullion} bullion lots · ${B.albums.folders} albums`)), svg(IC.next, 18)),
      h("a.door", { href: "#/worlds" }, svg(IC.world), h("span", h("b", "Worlds"), h("small", "50 rooms to stand in")), svg(IC.next, 18)),
      h("a.door.quiet", { href: "index.html" }, svg(IC.door), h("span", h("b", "The classic app"), h("small", "Study, Lab, questions and Scene Studio until they move here")), svg(IC.next, 18))),
    h("footer.foot", `Ledger ${D.generated_at_pt || ""} · metal at the recorded spot of ${M.as_of_local || M.as_of || ""}`));
}

/* ------------------------------------------------------------------ the Wall ------------------------------------------------------------------ */
function wall(root) {
  const conts = ["All", ...Array.from(new Set(S.coins.map((c) => c.continent).filter(Boolean))).sort()];
  const grid = h("div.wall-body"); const count = h("small.count");
  const input = h("input", { type: "search", placeholder: "Country, year, denomination, number", value: S.q, "aria-label": "Search the wall", autocomplete: "off", enterkeyhint: "search" });
  const chips = h("div.chips", { role: "radiogroup", "aria-label": "Continent" }); const sorts = h("div.chips.sorts", { role: "radiogroup", "aria-label": "Order" });
  const draw = () => {
    chips.replaceChildren(...conts.map((n) => h("button" + (n === S.cont ? ".on" : ""), { type: "button", role: "radio", "aria-checked": String(n === S.cont), onclick: () => { S.cont = n; draw(); } }, n)));
    sorts.replaceChildren(...[["country", "By country"], ["year", "Oldest first"], ["est", "By estimate"], ["added", "Newest in"]].map(([k, n]) => h("button" + (k === S.sort ? ".on" : ""), { type: "button", role: "radio", "aria-checked": String(k === S.sort), onclick: () => { S.sort = k; draw(); } }, n)));
    const q = S.q.trim().toLowerCase(); const yr = yearOf;
    let list = S.coins.filter((c) => (S.cont === "All" || c.continent === S.cont) && (!q || `${c.label} ${c.scan} ${c.ser} ${c.country} ${c.year} ${c.denom}`.toLowerCase().includes(q)));
    list = list.sort(S.sort === "year" ? (a, b) => yr(a) - yr(b) : S.sort === "est" ? (a, b) => (b.est || 0) - (a.est || 0) : S.sort === "added" ? (a, b) => String(b.added).localeCompare(String(a.added)) || b.scan.localeCompare(a.scan) : (a, b) => a.country.localeCompare(b.country) || yr(a) - yr(b));
    count.textContent = `${list.length} of ${S.coins.length}`;
    if (!list.length) { grid.replaceChildren(h("div.empty", h("b", "Nothing on the wall matches"), h("small", "Try a country, a year or a number like C242."), h("button.btn", { type: "button", onclick: () => { S.q = ""; S.cont = "All"; input.value = ""; draw(); } }, "Show everything"))); return; }
    if (S.sort === "country") { const groups = new Map(); for (const c of list) { if (!groups.has(c.country)) groups.set(c.country, []); groups.get(c.country).push(c); }
      grid.replaceChildren(...Array.from(groups, ([name, cs]) => h("section.group", h("header", h("h2", name), h("small", String(cs.length))), h("div.grid", cs.map(tile)))));
    } else grid.replaceChildren(h("div.grid", list.map((c) => tile(c))));
    if (S.last) { const t = grid.querySelector(`[data-id="${S.last}"] img`); if (t) t.style.viewTransitionName = "coin"; }
  };
  let timer; input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { S.q = input.value; draw(); }, 120); });
  root.append(h("header.page-head", h("p.eyebrow", "Wing I"), h("h1", "The Wall"), count), h("div.filters", h("label.search", svg(IC.search, 18), input), chips, sorts), grid);
  draw();
  requestAnimationFrame(() => { if (S.last) { const t = grid.querySelector(`[data-id="${S.last}"]`); if (t) t.scrollIntoView({ block: "center" }); } else stage.scrollTop = S.wallTop; });
  return () => { S.wallTop = stage.scrollTop; };
}

/* ------------------------------------------------------------------ a specimen ------------------------------------------------------------------ */
async function coin(root, id) {
  const c = S.byId.get(id); if (!c) { root.append(h("div.empty", h("b", "No such piece"), h("a.btn", { href: "#/wall" }, "Back to the wall"))); return; }
  S.last = id; const i = S.coins.indexOf(c), prev = S.coins[i - 1], next = S.coins[i + 1];
  const face = h("div.face", coinImg(c, "hero-coin", true)); const im = $("img", face); if (im) im.style.viewTransitionName = "coin";
  const flipBtn = h("button.pill", { type: "button", hidden: true }, svg(IC.flip, 16), h("span", "Turn it over"));
  const facts = h("dl.facts"); const story = h("p.story");
  root.append(
    h("div.spec-top", h("a.round", { href: "#/wall", "aria-label": "Back to the wall" }, svg(IC.back)), h("span.ser", c.ser || c.scan), h("span.spacer"),
      prev ? h("a.round", { href: `#/coin/${prev.scan}`, "aria-label": "Previous piece" }, svg(IC.back, 18)) : null, next ? h("a.round", { href: `#/coin/${next.scan}`, "aria-label": "Next piece" }, svg(IC.next, 18)) : null),
    h("section.spec", h("div.plinth", face, h("i.glow"), flipBtn),
      h("p.eyebrow", `${c.country}${c.continent ? " · " + c.continent : ""}`), h("h1", `${c.denom}`), h("p.year", String(c.year || "n.d."), c.mint ? h("small", " · mint " + c.mint) : null),
      h("div.trio", h("span", h("b", usd(c.est)), h("small", "estimate")), h("span", h("b", c.conf || "—"), h("small", "confidence")), h("span", h("b", c.dia ? String(c.dia) : "—"), h("small", "mm across")))),
    h("section.glass", story, facts), h("footer.foot", `${c.scan} · added ${c.added || ""}${c.thumb ? "" : " · not yet photographed"}`));
  try {
    if (!S.detail.has(c.iso)) S.detail.set(c.iso, fetch(`data/detail/${c.iso}.json`).then((r) => r.json()));
    const d = (await S.detail.get(c.iso))[id]; if (!d || !root.isConnected) return;
    story.textContent = d.story || "";
    const rows = [["Year", d.year_line], ["Denomination", d.denom_line], ["Made of", d.metal], ["Specifications", d.specs], ["Mintage", d.mintage], ["Design", d.design], ["Period", d.period], ["Face value", d.face_line], ["References", d.refs], ["Notes", Array.isArray(d.notes) ? d.notes.join(" · ") : d.notes]];
    facts.replaceChildren(...rows.filter(([, v]) => v && String(v).trim()).flatMap(([k, v]) => [h("dt", k), h("dd", String(v))]));
    const sides = (d.photos || []).filter((p) => p.url); const other = sides.find((p) => p.role && p.role !== c.thumb_side);
    if (other && im) { let showing = 0; const urls = [cut(c.thumb), cut(other.url)]; new Image().src = urls[1]; flipBtn.hidden = false;
      const turn = () => { showing = 1 - showing; face.classList.add("turn"); setTimeout(() => { im.src = urls[showing]; }, reduced() ? 0 : 210); setTimeout(() => face.classList.remove("turn"), reduced() ? 0 : 440); };
      flipBtn.addEventListener("click", turn); face.addEventListener("click", turn); face.classList.add("can-turn"); }
  } catch (e) { story.textContent = "The full record needs a connection the first time this country is opened."; }
}

/* ------------------------------------------------------------------ the Vault ------------------------------------------------------------------ */
function vault(root) {
  const D = S.D, M = D.metals, B = D.board; const ag = M.melt.ag_usd, au = M.melt.au_usd, metal = ag + au; const share = metal / B.grand;
  const bar = (label, v, total, cls) => h("div.bar-row", h("span", label), h("span.bar", h("i." + cls, { style: { width: Math.max(2, (v / total) * 100) + "%" } })), h("b", usd(v, 0)));
  const lots = [...(D.bullion || [])].sort((a, b) => (b.est || 0) - (a.est || 0));
  root.append(h("header.page-head", h("p.eyebrow", "Wing II"), h("h1", "The Vault"), h("small.count", "HOLD · do not sell")),
    h("section.glass.metal", h("div.metal-two",
        h("div.ingot.ag", h("small", "Silver"), h("b", oz(M.oz.ag), h("i", " oz")), h("span", `${usd(ag)} at ${usd(M.spot.ag_usd_oz)}`)),
        h("div.ingot.au", h("small", "Gold"), h("b", oz(M.oz.au, 4), h("i", " oz")), h("span", `${usd(au)} at ${usd(M.spot.au_usd_oz)}`))),
      h("p.hero-line", `Metal is ${(share * 100).toFixed(0)}% of the ${usd(B.grand, 0)} estimate · spot recorded ${M.as_of_local || M.as_of || ""}`)),
    h("section.glass", h("header", h("h2", "Where the value sits")),
      bar("Bullion", B.bullion.usd, B.grand, "ag"), bar("Albums", B.albums.usd, B.grand, "au"), bar("Flips", B.flips.usd, B.grand, "cu"), bar("Housing", B.housing.usd, B.grand, "st"), bar("Sets", B.sets.usd, B.grand, "st")),
    h("section.glass", h("header", h("h2", "Bullion lots"), h("small", String(lots.length))), h("div.rows", lots.map((l) => h("div.row", h("span.mark" + (l.is_gold ? ".au" : ".ag"), l.is_gold ? "Au" : "Ag"), h("span.row-main", h("b", l.label || l.denom), h("small", [l.asw_oz ? l.asw_oz + " oz" : "", l.melt_raw || "", l.scan].filter(Boolean).join(" · "))), h("b.num", usd(l.est, 0)))))),
    h("section.glass", h("header", h("h2", "Albums"), h("small", `${B.albums.folders} volumes · about ${B.albums.coins} coins`)), h("div.rows", [...(D.albums_glance || [])].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 14).map((a) => h("div.row", h("span.row-main", h("b", a.family), h("small", `${a.coins} coins · ${a.pulse || a.ids || ""}`)), h("b.num", usd(a.total, 0)))))),
    h("footer.foot", "Totals are the ledger's own (collection/board.json). Estimates, not appraisals."));
}

/* ------------------------------------------------------------------ Worlds ------------------------------------------------------------------ */
async function worlds(root) {
  await loadPlate(); const P = window.TitanPlate; const ids = P ? P.list : [];
  if (!P) { root.append(h("div.empty", h("b", "The rooms did not load"), h("small", "They need a connection the first time."))); return; }
  const pick = (id) => { document.documentElement.setAttribute("data-atmo", id); try { localStorage.setItem("tr_atmo_v1", id); } catch (e) { /* this visit only */ } draw(); };
  const grid = h("div.world-grid"); const head = h("header.page-head");
  const draw = () => { const cur = theme(); const name = P && P.cfg(cur) ? P.cfg(cur).name : cur;
    head.replaceChildren(h("p.eyebrow", "You are in"), h("h1", name), h("button.btn", { type: "button", onclick: enterRoom }, svg(IC.door, 18), "Step into the room"));
    grid.replaceChildren(...ids.map((id) => h("button.world" + (id === cur ? ".on" : ""), { type: "button", "aria-pressed": String(id === cur), onclick: () => pick(id) }, h("img", { src: `art/themes/${id}-card.webp`, alt: "", loading: "lazy", decoding: "async" }), h("span", P.cfg(id).name)))); };
  root.append(head, grid); draw();
}
function enterRoom() {
  const P = window.TitanPlate; if (!P || S.room) return; const r = P.room(theme()); S.room = r; let last = null, dist = 0;
  const pts = new Map(); const layer = h("div.room", { role: "dialog", "aria-label": r.name + ": drag to look around" },
    h("div.room-cap", h("p.eyebrow", "A room of your own"), h("h1", r.name), h("small", "Drag to look around · pinch to lean in · tap the light")), h("button.round.room-x", { type: "button", "aria-label": "Leave the room", onclick: leave }, svg(IC.x)));
  function leave() { r.stop(); S.room = null; layer.remove(); document.body.classList.remove("in-room"); }
  layer.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; layer.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY, e.clientX, e.clientY]; });
  layer.addEventListener("pointermove", (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (dist) r.pinch(d / dist); dist = d; return; }
    r.drag(e.clientX - last[0], e.clientY - last[1]); last[0] = e.clientX; last[1] = e.clientY; layer.classList.add("moved"); });
  const up = (e) => { if (pts.size === 1 && last && Math.hypot(e.clientX - last[2], e.clientY - last[3]) < 6) r.tap(e.clientX / innerWidth, 1 - e.clientY / innerHeight); pts.delete(e.pointerId); dist = 0; r.release(); };
  layer.addEventListener("pointerup", up); layer.addEventListener("pointercancel", up);
  layer.addEventListener("wheel", (e) => { e.preventDefault(); r.pinch(e.deltaY < 0 ? 1.06 : 0.94); }, { passive: false });
  addEventListener("keydown", function esc(e) { if (e.key === "Escape") { leave(); removeEventListener("keydown", esc); } });
  document.body.classList.add("in-room"); document.body.append(layer);
}

/* ------------------------------------------------------------------ shell ------------------------------------------------------------------ */
const NAV = [["", "Hall", IC.hall], ["wall", "Wall", IC.wall], ["vault", "Vault", IC.vault], ["worlds", "Worlds", IC.world]];
let cleanup = null;
function render() {
  const p = location.hash.replace(/^#\/?/, "").split("/"); const view = p[0] || ""; const tab = view === "coin" ? "wall" : view;
  const swap = () => { if (cleanup) { cleanup(); cleanup = null; } const box = h("div.view", { dataset: { view: view || "hall" } }); stage.replaceChildren(box); stage.scrollTop = 0; document.body.dataset.view = view || "hall";
    cleanup = (view === "wall" ? wall(box) : view === "coin" ? (coin(box, p[1]), null) : view === "vault" ? vault(box) : view === "worlds" ? (worlds(box), null) : hall(box)) || null;
    $("#nav").replaceChildren(...NAV.map(([id, name, ic]) => h("a" + (id === tab ? ".on" : ""), { href: "#/" + id, "aria-current": id === tab ? "page" : null }, svg(ic), h("span", name))));
    document.title = view === "coin" && S.byId.get(p[1]) ? `${S.byId.get(p[1]).label} · Titan Reliquary` : "Titan Reliquary"; };
  if (document.startViewTransition && !reduced() && stage.firstChild) { const vt = document.startViewTransition(swap); vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone.catch(() => {}); } else swap();   // a newer change may skip an older transition: that is fine
}

/* The opening keeps its order: the film first, then the theme's own opening on its photograph, then the collection. Once a session. */
function opening() {
  return new Promise((done) => {
    let seen = false; try { seen = !!sessionStorage.getItem("tn_opened"); sessionStorage.setItem("tn_opened", "1"); } catch (e) { /* private mode: play it */ }
    if (params.has("nosplash") || seen || reduced()) return done();
    const tall = innerHeight >= innerWidth; const films = tall ? ["titan_9x16", "hoard_9x16", "cathedral_9x16", "forge1_9x16", "coinrain_9x16", "zoom1_9x16"] : ["hoard_16x9", "cathedral_16x9", "forge_16x9", "zoom1_16x9"];
    const v = h("video", { src: `art/splash/${films[Math.floor(Math.random() * films.length)]}.mp4`, playsinline: true, muted: true, autoplay: true, preload: "auto", poster: "art/splash_poster.webp" }); v.muted = true;
    const title = h("div.open-title", h("p.eyebrow", "Titan Reliquary"), h("h1", ""));
    const layer = h("div.opening", { onclick: () => stepTwo() }, v, h("small.skip", "Tap to continue")); document.body.append(layer); let two = false, over = false; loadPlate();
    const end = () => { if (over) return; over = true; layer.classList.add("out"); setTimeout(() => layer.remove(), 700); done(); };
    async function stepTwo() { if (two) return end(); two = true; v.pause(); v.classList.add("out"); await loadPlate(); const P = window.TitanPlate;
      if (!P || !P.has(theme())) return end(); title.lastChild.textContent = P.cfg(theme()).name; layer.append(title); setTimeout(end, 8500);
      P.whenReady(theme(), 3000).then(() => { layer.classList.add("theme"); P.opening({ dur: 4.6, onTitle: () => title.classList.add("in"), onEnd: end }); }); }
    v.addEventListener("ended", stepTwo); v.addEventListener("error", stepTwo); setTimeout(() => { if (!two) stepTwo(); }, 14000);
    const pl = v.play(); if (pl && pl.catch) pl.catch(stepTwo);
  });
}

/* The room's photograph loads after the first coins are on screen (it is the backdrop, not the content). */
let plateAsked = null;
function loadPlate() {
  return plateAsked || (plateAsked = new Promise((ok) => { if (window.TitanPlate) return ok(true); const s = document.createElement("script"); s.src = "wings/plate.js"; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.append(s); }));
}
async function boot() {
  try { S.D = await (await fetch("data/index.json")).json(); } catch (e) { stage.replaceChildren(h("div.empty", h("b", "The ledger did not load"), h("small", "Check the connection and open the page again."), h("button.btn", { type: "button", onclick: () => location.reload() }, "Try again"))); document.documentElement.classList.add("ready"); return; }
  S.coins = (S.D.flips || []).slice().sort((a, b) => a.country.localeCompare(b.country) || String(a.year).localeCompare(String(b.year)) || a.scan.localeCompare(b.scan)); for (const c of S.coins) S.byId.set(c.scan, c);
  render(); addEventListener("hashchange", render);
  const lead = Array.from(document.querySelectorAll('img[fetchpriority="high"]')).slice(0, 2);
  Promise.race([Promise.all(lead.map((im) => (im.complete ? 1 : new Promise((ok) => { im.addEventListener("load", ok, { once: true }); im.addEventListener("error", ok, { once: true }); })))), new Promise((ok) => setTimeout(ok, 1500))]).then(loadPlate);
  await opening(); document.documentElement.classList.add("ready");
}
boot();
