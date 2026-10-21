/* The Field: a UI shell (Grok 2026-10-20). One table holds the whole collection: rows are countries grouped by continent,
   across is the year, equal coins stack. Tap a coin and the camera comes down to it; the sheet shows only published facts,
   each with who checked it, when, and its source. Filters: album holes as gold rings, silver & gold, still to photograph.
   Contract (docs/design/THEME_CONTRACT.md): any coin in two taps (table or List & search), sourced facts + provenance (sheet;
   "Hold it" opens the full coin page with the photo-relief coin), Back crumb + UI switch home, mute, search.
   Shared services come in through svc; nothing here reaches into Classic's wings. Uses the app's one shared three.js (r128, offline via the precache). */
export async function mount(root, svc) {
const THREE = window.THREE;   // the app's one shared copy (js/three.min.js, r128); no second three.js on the page
if (!THREE) throw new Error("three.js not loaded");
const ac = new AbortController(), signal = ac.signal;
root.innerHTML = BODY;
/* ---------- data: only what the pipeline published (../../../data/) ---------- */
const DATA = "data/";
const $ = (s) => root.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let idx;
try { idx = await (await fetch(DATA + "index.json")).json(); }
catch (e) { root.innerHTML = '<p class="err">The Field could not read data/index.json (offline before the first visit?). Classic still works.</p>'; return { unmount() { root.innerHTML = ""; } }; }
const flips = idx.flips.filter((f) => f.status !== "Removed");
$("#fld-total").textContent = money(idx.board.grand);
$("#fld-totsub").textContent = `${flips.length} pieces · ${new Set(flips.map((f) => f.iso)).size} countries · ledger estimate, ${idx.generated_at_pt || idx.generated_at}`;
let wants = null; try { wants = await (await fetch(DATA + "wants.json")).json(); } catch (e) { /* no album data: the Albums filter says so */ }
const details = new Map();
const detail = (d) => { if (!details.has(d)) details.set(d, fetch(DATA + "detail/" + encodeURIComponent(d) + ".json").then((r) => r.json())); return details.get(d); };

/* ---------- motion setting: Full / Calm / Off, default from the OS ---------- */
const mq = matchMedia("(prefers-reduced-motion: reduce)");
const motion = mq.matches || svc.lite() ? "calm" : "full";   // the app owns the Motion setting; Lite counts as calm

/* ---------- layout: one field. Rows = countries grouped by continent; across = the year; equal coins stack ---------- */
const CONT_ORDER = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];
const yearOf = (f) => { const m = String(f.year || "").match(/\d{4}/); return m ? +m[0] : null; };
const years = flips.map(yearOf).filter((y) => y != null);
// broken axis (v2.1): 1880 onward at full scale; 1850-1879 on a compressed scale to its left (Indian cent holes stay readable);
// anything older (today one coin, 1378) gets its own marked slot so it cannot stretch the table by 500 years
const Y0 = Math.max(1880, Math.floor(Math.min(...years) / 10) * 10), Y1 = Math.ceil(Math.max(...years) / 10) * 10;
const YC = 1850, XC = 0.3, XGAP = 0.6;                // compressed years and the gap that marks the break
const X_EARLY = -(Y0 - YC) * XC - XGAP - 1.6, X_UNDATED = X_EARLY - 2.4;
const early = [...new Set(years.filter((y) => y < YC))].sort((a, b) => a - b);
const XS = 0.42;                                   // world units per year
const xOfYear = (y) => (y == null ? X_UNDATED : y < YC ? X_EARLY : y < Y0 ? -(Y0 - y) * XC - XGAP : (y - Y0) * XS);
const XMIN = X_UNDATED - 1.5;
const countries = [...new Set(flips.map((f) => f.country))];
const contOf = (c) => flips.find((f) => f.country === c).continent || "Other";
countries.sort((a, b) => (CONT_ORDER.indexOf(contOf(a)) - CONT_ORDER.indexOf(contOf(b))) || a.localeCompare(b));
const rowZ = new Map(); const contStart = new Map(); let z = 0, lastCont = null;
for (const c of countries) { const k = contOf(c); if (k !== lastCont) { if (lastCont) z += 1.6; contStart.set(k, z); lastCont = k; } rowZ.set(c, z); z += 1.15; }
const DEPTH = z, WIDTH = xOfYear(Y1);
const stackN = new Map();
const pos = flips.map((f) => { const y = yearOf(f), key = f.country + "|" + (y ?? "nd"); const n = stackN.get(key) || 0; stackN.set(key, n + 1);
  return new THREE.Vector3(xOfYear(y), 0.09 + n * 0.2, rowZ.get(f.country)); });

/* ---------- scene ---------- */
const stage = $("#fld-stage");
const renderer = new THREE.WebGLRenderer({ antialias: (devicePixelRatio || 1) < 2, /* MSAA is wasted at DPR 2+ on phones */ powerPreference: "high-performance" });
const DPR = Math.min(devicePixelRatio || 1, svc.lite() ? 1.25 : 2);
renderer.setPixelRatio(DPR); renderer.outputEncoding = THREE.sRGBEncoding; renderer.domElement.className = "fld-canvas";
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0b09); scene.fog = new THREE.Fog(0x0d0b09, 60, 140);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x1a140c, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-20, 40, 20); scene.add(key);

// the table: decade lines and continent bands explain the two axes
const grid = new THREE.Group(); scene.add(grid);
const lineMat = new THREE.LineBasicMaterial({ color: 0x3a3226 });
for (let y = YC; y < Y0; y += 10) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xOfYear(y), 0, -1), new THREE.Vector3(xOfYear(y), 0, DEPTH)]); grid.add(new THREE.Line(g, lineMat)); }
for (let y = Y0; y <= Y1; y += 10) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xOfYear(y), 0, -1), new THREE.Vector3(xOfYear(y), 0, DEPTH)]); grid.add(new THREE.Line(g, lineMat)); }
const bandMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16 });
const CONT_COL = { "Europe": 0x6f8fd8, "North America": 0xd8a35f, "South America": 0x7fc29b, "Asia": 0xd77b7b, "Africa": 0xc9b45a, "Oceania": 0x5fc4cf, "Other": 0x999999 };
for (const [k, z0] of contStart) { const rows = countries.filter((c) => contOf(c) === k).length;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH - XMIN, rows * 1.15), bandMat(CONT_COL[k] || 0x999999)); m.rotation.x = -Math.PI / 2; m.position.set((WIDTH + XMIN) / 2, 0, z0 + rows * 1.15 / 2 - 0.575); grid.add(m); }
// highlight strip for the chosen coin's row and year
const hiRow = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH - XMIN, 1.1), new THREE.MeshBasicMaterial({ color: 0xe2bd6a, transparent: true, opacity: 0 })); hiRow.rotation.x = -Math.PI / 2; hiRow.position.y = 0.01; scene.add(hiRow);
const hiCol = new THREE.Mesh(new THREE.PlaneGeometry(0.5, DEPTH + 2), new THREE.MeshBasicMaterial({ color: 0xe2bd6a, transparent: true, opacity: 0 })); hiCol.rotation.x = -Math.PI / 2; hiCol.position.set(0, 0.012, DEPTH / 2); scene.add(hiCol);

// every coin: one instanced draw call. Bright = has a phone photo, dim = still to photograph (data: thumb)
const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.16, 28);
const coinMat = new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.35 });
const coins = new THREE.InstancedMesh(coinGeo, coinMat, flips.length);
const M = new THREE.Matrix4(), col = new THREE.Color();
function baseColor(i) { const f = flips[i]; col.set(CONT_COL[f.continent] || 0x999999); col.lerp(new THREE.Color(0xd9d2c3), 0.45); if (!f.thumb) col.multiplyScalar(0.45); return col; }
flips.forEach((f, i) => { M.makeTranslation(pos[i].x, pos[i].y, pos[i].z); coins.setMatrixAt(i, M); coins.setColorAt(i, baseColor(i)); });
scene.add(coins);

// the chosen coin, lifted out of its stack (a real mesh so it can carry the photo)
const hero = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 64),
  [new THREE.MeshStandardMaterial({ color: 0xbdb6a8, metalness: 0.8, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0xd9d2c3, metalness: 0.2, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0xd9d2c3, metalness: 0.2, roughness: 0.6 })]);
hero.visible = false; scene.add(hero);
const texLoader = new THREE.TextureLoader(); const texCache = new Map();
const reliefCache = new Map();
let reliefN = 0;
function reliefOn(m, t) {   // shared service: the photo's own shading becomes relief that relights as the hero coin turns
  m.normalMap = null; m.roughnessMap = null; m.metalness = 0.2; m.roughness = 0.6;
  if (!window.TitanRelief || !t.image) return; let r = reliefCache.get(t);
  if (!r) { const d = window.TitanRelief.derive(t.image, { size: svc.lite() ? 192 : 256 }); if (!d) return;
    const mk = (cv) => { const x = new THREE.CanvasTexture(cv); x.center.set(0.5, 0.5); x.rotation = Math.PI / 2; return x; };
    r = { n: mk(d.normal), r: mk(d.rough) }; reliefCache.set(t, r); }
  m.normalMap = r.n; m.normalScale.set(1.2, 1.2); m.roughnessMap = r.r; m.roughness = 1; m.metalness = 0.55; reliefN++;
}
function photoTex(f) { if (!texCache.has(f.scan)) texCache.set(f.scan, texLoader.loadAsync(f.thumb).then((tx) => { tx.encoding = THREE.sRGBEncoding; tx.center.set(0.5, 0.5); tx.rotation = Math.PI / 2; return tx; }).catch(() => null)); return texCache.get(f.scan); }

/* ---------- camera: overview framing that fits a phone in portrait ---------- */
const view = { tx: WIDTH / 2, tz: DEPTH / 2, dist: 0 };
function fitDist(setTx) { const a = camera.aspect, vf = THREE.MathUtils.degToRad(camera.fov);
  const needH = (DEPTH + 4) / (2 * Math.tan(vf / 2)), needW = (WIDTH + 10) / (2 * Math.tan(vf / 2) * a);
  // portrait phone: fit every country row top to bottom and show the most recent decades; drag sideways for older years
  const d = Math.min(Math.max(needH, needW), needH * 1.05) * 0.92;
  const seenW = 2 * Math.tan(vf / 2) * a * d; if (setTx) view.tx = Math.max(seenW / 2 - 7, WIDTH - seenW / 2 + 1.5); return d; }
const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
function overviewPose(out) { out.look.set(view.tx, 0, view.tz); out.pos.set(view.tx, view.dist * 0.94, view.tz + view.dist * 0.34); return out; }
function applyCam() { camera.position.copy(cam.pos); camera.lookAt(cam.look); }
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (!view.dist || state === "field") { view.dist = view.dist || fitDist(true); } scene.fog.near = fitDist() * 0.9; scene.fog.far = fitDist() * 2.4; if (state === "field") { overviewPose(cam); applyCam(); } kick(); }
let state = "field";
addEventListener("resize", resize, { signal });

/* ---------- labels: continents, decades, the chosen row ---------- */
const labels = $("#fld-labels"); const labEls = [];
function addLab(text, cls, p) { const el = document.createElement("div"); el.className = "lab " + cls; el.textContent = text; labels.appendChild(el); labEls.push({ el, p, pin: cls.includes("year") && state !== "coin", anchor: cls.includes("cont") ? "translate(0,-50%)" : "translate(-50%,-50%)" }); return el; }
for (const [k, z0] of contStart) addLab(k, "cont", new THREE.Vector3(XMIN + 0.5, 0, z0 - 0.4));
for (let y = Y0; y <= Y1; y += (Y1 - Y0 > 100 ? 20 : 10)) addLab(String(y), "year", new THREE.Vector3(xOfYear(y), 0, -1.6));
if (flips.some((f) => yearOf(f) == null)) addLab("undated", "year", new THREE.Vector3(X_UNDATED, 0, -1.6));
if (early.length) addLab(early.join(", "), "year hot", new THREE.Vector3(X_EARLY, 0, -1.6));   // the own slot says its real year(s)
addLab("1850–79", "year", new THREE.Vector3(xOfYear(1864.5), 0, -1.6));
// the break between the scales is drawn as a gap with two short marks
for (const bx of [-XGAP / 2 - 0.12, -XGAP / 2 + 0.12, X_EARLY + 0.9]) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(bx, 0.02, -1.2), new THREE.Vector3(bx, 0.02, DEPTH + 0.2)]); grid.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x8a7650 }))); }
const rowLab = addLab("", "cont hot", new THREE.Vector3()); rowLab.style.display = "none";
const v3 = new THREE.Vector3();
const RULER_Y = () => Math.round(root.querySelector("header").getBoundingClientRect().bottom + 6);
function placeLabels() { const w = innerWidth, h = innerHeight;
  for (const L of labEls) { if (L.el.style.display === "none") continue; // year labels are pinned to a ruler under the header: the axis stays readable wherever you pan on a phone
    if (L.pin) v3.set(L.p.x, 0, cam.look.z).project(camera); else v3.copy(L.p).project(camera);
    const off = v3.z > 1 || v3.x < -1.2 || v3.x > 1.2 || (!L.pin && (v3.y < -1.2 || v3.y > 1.2));
    if (off !== L.off) { L.el.style.visibility = off ? "hidden" : "visible"; L.off = off; } if (off) continue;
    const x = Math.round((v3.x + 1) / 2 * w), y = L.pin ? RULER_Y() : Math.round((1 - v3.y) / 2 * h);
    if (x !== L.x || y !== L.y) { L.x = x; L.y = y; L.el.style.transform = `translate3d(${x}px,${y}px,0) ${L.anchor}`; } } }

/* ---------- render on demand + fps meter (only frames that move count) ---------- */
let raf = 0, anims = [], frames = [], lastT = 0, labelsDirty = true; const camKey = new THREE.Matrix4();
const fpsEl = $("#fld-fps"); const showFps = /[?&]fps/.test(location.search); fpsEl.hidden = !showFps;
window.__fieldFrames = frames;
function kick() { if (!raf && !document.hidden) { lastT = 0; raf = requestAnimationFrame(tick); } }
function tick(t) {
  raf = 0;
  if (lastT) { frames.push(t - lastT); if (frames.length > 600) frames.shift(); }
  lastT = t;
  anims = anims.filter((a) => { const k = Math.min(1, (t - (a.t0 = a.t0 == null ? t : a.t0)) / a.ms); a.step(a.ease ? a.ease(k) : k); if (k >= 1) { a.done && a.done(); return false; } return true; });
  applyCam(); renderer.render(scene, camera);
  camera.updateMatrixWorld(); if (labelsDirty || !camKey.equals(camera.matrixWorld)) { camKey.copy(camera.matrixWorld); labelsDirty = false; placeLabels(); }
  if (showFps && frames.length > 10) { const last = frames.slice(-60); fpsEl.textContent = (1000 / (last.reduce((a, b) => a + b, 0) / last.length)).toFixed(0) + " fps"; }
  if (anims.length || drag.active) raf = requestAnimationFrame(tick); else lastT = 0;
}
document.addEventListener("visibilitychange", () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else kick(); }, { signal });
const ease = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
function animate(ms, step, done) { if (motion === "full") { anims.push({ ms, step, done, ease }); kick(); } else { step(1); done && done(); kick(); } }

/* ---------- the core move: field -> one coin -> back ---------- */
let cur = -1, saved = null;
const crumbs = $("#fld-crumbs");
function crumbBar(f, n) {
  crumbs.innerHTML = [`<span class="crumb">${esc(f.continent)}</span>`, `<span class="crumb"><b>${esc(f.country)}</b></span>`,
    `<span class="crumb">${esc(f.year)}${n > 1 ? ` · ${n} in this stack` : ""}</span>`, `<button type="button" class="crumb" id="fld-btn-back">Back to all ${flips.length}</button>`].join("");
  $("#fld-btn-back").addEventListener("click", back);
  const on = (i, ms) => setTimeout(() => crumbs.children[i] && crumbs.children[i].classList.add("on"), motion === "full" ? ms : 0);
  on(0, 0); on(1, 260); on(2, 520); on(3, 700);
}
async function open(i) {
  if (state !== "field") return; state = "flying"; root.classList.add("coin"); cur = i; $("#fld-hint").style.opacity = 0;
  const f = flips[i], p = pos[i].clone().setY(pos[i].y + rise[i]), n = stackN.get(f.country + "|" + (yearOf(f) ?? "nd"));
  saved = { pos: cam.pos.clone(), look: cam.look.clone() };
  hiRow.position.set((WIDTH + XMIN) / 2, 0.01, p.z); hiCol.position.x = p.x;
  rowLab.textContent = f.country; rowLab.style.display = ""; labelsDirty = true; labEls.find((L) => L.el === rowLab).p.set(p.x + 1.2, 0.3, p.z);
  crumbBar(f, n);
  // hide the instance, put the hero coin in its place, with its photo on the face if it has one
  M.makeScale(0, 0, 0); coins.setMatrixAt(i, M); coins.instanceMatrix.needsUpdate = true;
  hero.position.copy(p); hero.rotation.set(0, 0, 0); hero.scale.setScalar(1); hero.visible = true;
  hero.material[1].map = null; hero.material[1].color.set(0xd9d2c3); hero.material[1].needsUpdate = true;
  // v2: the photo (and the detail file) are fetched BEFORE the flight starts, so the texture upload does not land mid-flight.
  // We wait at most 450 ms; a slow photo still arrives later and is put on then.
  detail(f.d || "_misc").catch(() => {});
  if (f.thumb) { const tp = photoTex(f); const tx = await Promise.race([tp, new Promise((r) => setTimeout(() => r(null), 450))]);
    const put = (t) => { if (!t || cur !== i) return; hero.material[1].map = t; hero.material[1].color.set(0xffffff); reliefOn(hero.material[1], t); hero.material[1].needsUpdate = true; renderer.initTexture && renderer.initTexture(t); kick(); };
    if (tx) put(tx); else tp.then(put); }
  const from = { pos: cam.pos.clone(), look: cam.look.clone() };
  // 1) the row and the year light up (where it lives); 2) the camera comes down to the stack; 3) the coin rises and turns to you
  const lift = new THREE.Vector3(p.x, 2.2, p.z + 0.2);
  // look below the coin so it sits in the top third, above the sheet
  const to = { look: new THREE.Vector3(p.x, -0.9, p.z + 0.2), pos: new THREE.Vector3(p.x, 2.2 + 6.4, p.z + 8.4) };
  if (motion === "calm") fadeCut();
  animate(500, (k) => { hiRow.material.opacity = 0.35 * k; hiCol.material.opacity = 0.3 * k; });
  animate(1100, (k) => { cam.pos.lerpVectors(from.pos, to.pos, k); cam.look.lerpVectors(from.look, to.look, k); },
    () => { state = "coin"; showSheet(i); });
  animate(1100, (k) => { const kk = Math.max(0, (k - 0.35) / 0.65); hero.position.lerpVectors(p, lift, kk); hero.rotation.x = kk * (Math.PI / 2 - 0.55); hero.scale.setScalar(1 + kk * 1.4); });
}
function back() {
  if (state !== "coin") return; state = "flying"; hideSheet();
  const i = cur, p = pos[i].clone().setY(pos[i].y + rise[i]), from = { pos: cam.pos.clone(), look: cam.look.clone() }, hp = hero.position.clone(), hr = hero.rotation.x, hs = hero.scale.x;
  if (motion === "calm") fadeCut();
  animate(1000, (k) => { cam.pos.lerpVectors(from.pos, saved.pos, k); cam.look.lerpVectors(from.look, saved.look, k);
    hero.position.lerpVectors(hp, p, k); hero.rotation.x = hr * (1 - k); hero.scale.setScalar(hs + (1 - hs) * k);
    hiRow.material.opacity = 0.35 * (1 - k); hiCol.material.opacity = 0.3 * (1 - k); },
    () => { hero.visible = false; M.makeTranslation(p.x, p.y, p.z); coins.setMatrixAt(i, M); coins.instanceMatrix.needsUpdate = true;
      rowLab.style.display = "none"; crumbs.innerHTML = ""; state = "field"; root.classList.remove("coin"); labelsDirty = true; cur = -1; kick(); lastFocus && lastFocus.focus && lastFocus.focus(); });
}
function fadeCut() { const fd = $("#fld-fade"); fd.style.opacity = 1; setTimeout(() => (fd.style.opacity = 0), 180); }


/* ---------- v2 filters: Albums (holes as empty rings), Silver & gold, To photograph. Live data only ---------- */
const rise = new Float32Array(flips.length);           // current lift of each coin (To photograph raises the unphotographed ones)
const lit = new Uint8Array(flips.length).fill(1);
const SILVER = new Set(Object.keys(idx.metals?.inventory?.ag?.junk_flips?.pieces || {}));   // the flips the metals ledger counts as silver
const GOLD = new Set(Object.keys(idx.metals?.inventory?.au?.flips?.pieces || {}));          // none today: gold is all bullion
const rowOfFamily = (fam) => (/canada/i.test(fam) ? "Canada" : "USA");                     // every album family is US except the two Canada cent albums
const families = new Map();
for (const v of (wants?.volumes || [])) { const k = v.family; (families.get(k) || families.set(k, []).get(k)).push(v); }
const ringGeo = new THREE.TorusGeometry(0.34, 0.07, 8, 28); ringGeo.rotateX(Math.PI / 2);
const MAXR = Math.max(1, ...[...families.values()].map((vs) => vs.reduce((a, v) => a + v.missing_named.length, 0)));
const rings = new THREE.InstancedMesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0xe2bd6a, emissive: 0x4a3510, metalness: 0.6, roughness: 0.4 }), MAXR);
rings.count = 0; rings.frustumCulled = false; scene.add(rings); let ringData = [];
let filter = "all", family = null;
const fnote = $("#fld-fnote");
function stackTop(country, y) { const k = country + "|" + (y ?? "nd"); return 0.09 + (stackN.get(k) || 0) * 0.2; }
function setColors() { for (let i = 0; i < flips.length; i++) { const c = baseColor(i); if (!lit[i]) c.multiplyScalar(0.14); else if (filter !== "all") c.set(0xffd27a); coins.setColorAt(i, c); } coins.instanceColor.needsUpdate = true; }
function setRise(target) {
  const from = Float32Array.from(rise);
  animate(700, (k) => { for (let i = 0; i < flips.length; i++) { if (i === cur) continue; rise[i] = from[i] + (target[i] - from[i]) * k; const sc = filter !== "all" && lit[i] ? 1.4 : 1; M.makeScale(sc, sc, sc).setPosition(pos[i].x, pos[i].y + rise[i], pos[i].z); coins.setMatrixAt(i, M); } coins.instanceMatrix.needsUpdate = true; });
}
function flyRow(country, x) { if (!rowZ.has(country)) return; const from = cam.pos.clone(), fl = cam.look.clone();
  const tz = rowZ.get(country), d0 = view.dist, d1 = Math.min(view.dist, 34), tx0 = view.tx, tz0 = view.tz;
  animate(900, (k) => { view.tx = tx0 + ((x ?? tx0) - tx0) * k; view.tz = tz0 + (tz - tz0) * k; view.dist = d0 + (d1 - d0) * k; overviewPose(cam); }); }
function applyFilter(f, fam) {
  if (state !== "field") return; filter = f; family = fam || null;
  root.querySelectorAll(".filters button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
  const target = new Float32Array(flips.length); rings.count = 0; ringData = [];
  flips.forEach((x, i) => { lit[i] = f === "all" ? 1 : f === "metal" ? +(SILVER.has(x.scan) || GOLD.has(x.scan)) : f === "photo" ? +!x.thumb : 0; if (f === "photo" && !x.thumb) target[i] = 1.4; });
  let note = "";
  if (f === "metal") {
    const pr = idx.precious || {};
    note = `${SILVER.size} silver piece${SILVER.size === 1 ? "" : "s"} on the table (${pr.flip_silver?.oz ?? "?"} oz Ag). Gold on the table: ${GOLD.size || "none"}. `
      + `Not on the table: bullion ${pr.bullion_silver?.oz ?? "?"} oz Ag + ${pr.bullion_gold?.oz ?? "?"} oz Au, and the silver in the albums.`;
  } else if (f === "photo") {
    const n = flips.filter((x) => !x.thumb).length; note = `${n} of ${flips.length} still need a phone photo; they rise. The rest dim.`;
  } else if (f === "album") {
    const vs = families.get(fam) || []; const row = rowOfFamily(fam); const yrs = new Map();
    for (const v of vs) for (const m of v.missing_named) {
      const k = m.year; const n = yrs.get(k) || 0; yrs.set(k, n + 1);
      const y = typeof m.year === "number" ? m.year : null; const x = xOfYear(y), z = rowZ.get(row);
      if (z == null) continue;
      M.makeTranslation(x, stackTop(row, y) + 0.12 + n * 0.22, z); rings.setMatrixAt(rings.count, M); ringData[rings.count++] = { m, v };
    }
    rings.instanceMatrix.needsUpdate = true; rings.boundingSphere = null; rings.boundingBox = null;   // raycast must see the new instances
    const holes = ringData.length, priced = ringData.filter((r) => r.m.price?.usd != null), cost = priced.reduce((a, r) => a + r.m.price.usd, 0);
    note = `${esc(fam)}: ${holes} hole${holes === 1 ? "" : "s"} in ${vs.length} album${vs.length === 1 ? "" : "s"} (gold rings in the ${esc(row)} row). `
      + (priced.length ? `Priced ${priced.length}: ${money(cost)} to fill. ` : "") + (holes ? "Tap a ring for the want-list entry." : "Nothing missing.");
    flips.forEach((x, i) => { lit[i] = +(x.country === row); });
    if (holes) { const xs = ringData.map((r) => xOfYear(typeof r.m.year === "number" ? r.m.year : null)); flyRow(row, (Math.min(...xs) + Math.max(...xs)) / 2); }
  }
  if (f === "album" && rowZ.has(rowOfFamily(fam))) { const row = rowOfFamily(fam); rowLab.textContent = row + " · " + fam; rowLab.style.display = ""; const xs = ringData.map((r) => xOfYear(typeof r.m.year === "number" ? r.m.year : null)); labEls.find((L) => L.el === rowLab).p.set(xs.length ? Math.min(...xs) - 0.6 : 0, 0.3, rowZ.get(row) - 0.9); }
  else if (state === "field") rowLab.style.display = "none";
  labelsDirty = true; fnote.hidden = !note; fnote.innerHTML = note; setColors(); setRise(target); kick();
}
function showRing(k) {
  const { m, v } = ringData[k]; const pr = m.price; const url = pr && (pr.source.match(/https?:\/\/\S+/) || [])[0];
  lastFocus = document.activeElement;
  sheet.innerHTML = `<h2 id="fld-sh-title">Missing: ${esc(m.label)}${m.variety ? " · " + esc(m.variety) : ""}</h2>
    <div class="sub">${esc(v.id)} · ${esc(v.title)}</div>
    <dl class="facts"><dt>Album</dt><dd>${esc(v.denomination)} · ${esc(v.metal)}</dd><dt>Hole</dt><dd>${esc(m.year)}${m.mint ? " · mint " + esc(m.mint) : ""} · ${esc(m.state)}</dd>
    <dt>Price</dt><dd>${pr ? `${money(pr.usd)} (${esc(pr.grade)}) <span class="lvl reference">${esc(pr.confidence)}</span> ${esc(pr.by)} · ${esc(pr.date)}` : "not priced yet"}</dd>
    ${pr ? `<dt>Source</dt><dd>${esc(pr.source.replace(/https?:\/\/\S+/, "").replace(/[:\s]+$/, ""))}${url ? ` · <a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--gold)">open</a>` : ""}</dd>` : ""}</dl>
    <button type="button" id="fld-btn-ring-close">Close</button>`;
  $("#fld-btn-ring-close").addEventListener("click", () => { hideSheet(); lastFocus && lastFocus.focus && lastFocus.focus(); });
  sheet.classList.add("open"); sheet.focus({ preventScroll: true });
}
const albumsDlg = $("#fld-albums");
albumsDlg.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0;font-size:22px">Albums: show the holes</h2><button type="button" id="fld-btn-close-alb">Close</button></div>`
  + (families.size ? [...families].map(([fam, vs]) => { const h = vs.reduce((a, v) => a + v.missing_named.length, 0);
      return `<button type="button" class="fam" data-fam="${esc(fam)}">${esc(fam)}<small>${vs.length} album${vs.length === 1 ? "" : "s"} · ${h} missing</small></button>`; }).join("")
    : `<p class="sub">Album data (data/wants.json) could not be read.</p>`);
function closeAlbums() { albumsDlg.classList.remove("open"); $('[data-f="album"]').focus(); }
$("#fld-btn-close-alb").addEventListener("click", closeAlbums);
albumsDlg.addEventListener("click", (e) => { const b = e.target.closest("button[data-fam]"); if (!b) return; albumsDlg.classList.remove("open"); applyFilter("album", b.dataset.fam); $('[data-f="album"]').focus(); });
root.querySelectorAll(".filters button").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.f === "album") { hideSheet(); albumsDlg.classList.add("open"); albumsDlg.querySelector("button.fam, button").focus(); }
  else { hideSheet(); applyFilter(b.dataset.f); } }));

/* ---------- the coin sheet: only published facts, each with its certainty label ---------- */
const LVL = { verified: "Verified", checked: "Checked", reference: "Reference", photo: "Photo", guess: "AI guess", ledger: "From ledger" };
const FIELD = { catalog: "Catalogue", composition: "Metal", mintage: "Mintage", value: "Value", year: "Year", denomination: "Denomination", mint: "Mint", design: "Design", weight: "Weight", diameter: "Diameter", story: "Story" };
const sheet = $("#fld-sheet"); let lastFocus = null;
async function showSheet(i) {
  const f = flips[i]; let r = null;
  try { r = (await detail(f.d || "_misc"))[f.scan]; } catch (e) { /* offline or missing: the index row is still shown */ }
  if (cur !== i) return;
  const photos = (r && r.photos || []).map((p) => `<img src="${esc(p.url)}" alt="${esc((r.label || f.label) + ", " + (p.role === "obv" ? "front" : p.role === "rev" ? "back" : p.role))}" loading="lazy">`).join("");
  const cert = r && r.certainty ? Object.entries(r.certainty).map(([k, c]) => `<dt>${esc(FIELD[k] || k)}</dt><dd><span class="lvl ${esc(c.level)}">${esc(LVL[c.level] || c.level)}</span> ${esc(c.by || "")}${c.ts ? " · " + esc(c.ts) : ""}${(c.links || []).slice(0, 1).map((u) => ` · <a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--gold)">source</a>`).join("")}</dd>`).join("") : "";
  const hist = r && r.history ? r.history.slice(0, 4).map((h) => `<li>${esc(h.ts)} · ${esc(h.what)}</li>`).join("") : "";
  sheet.innerHTML = `<button type="button" class="fld-back-top" id="fld-btn-back3" aria-label="Back to all ${flips.length} coins">← All ${flips.length}</button><h2 id="fld-sh-title">${esc((r && r.label) || f.label)}</h2>
    <div class="sub">${esc(f.scan)}${f.ser ? " · " + esc(f.ser) : ""} · ${f.est != null ? money(f.est) + " est. (" + esc(f.conf || "") + ")" : "no estimate yet"}</div>
    ${photos ? `<div class="row">${photos}</div>` : `<p class="sub">No phone photo yet: on the shoot list.</p>`}
    ${r && r.story ? `<p>${esc(r.story)}</p>` : ""}
    ${r && r.metal ? `<p class="sub">${esc(r.metal)}</p>` : ""}
    ${cert ? `<dl class="facts">${cert}</dl>` : ""}
    ${hist ? `<ul class="hist">${hist}</ul>` : ""}
    <div class="fld-acts"><button type="button" id="fld-btn-hold">Hold it (3D, every source)</button><button type="button" id="fld-btn-back2">Back to all ${flips.length}</button></div>`;
  $("#fld-btn-hold").addEventListener("click", () => svc.openCoin(f.scan));
  $("#fld-btn-back2").addEventListener("click", back);
  $("#fld-btn-back3").addEventListener("click", back);
  sheet.classList.add("open"); sheet.focus({ preventScroll: true });
}
function hideSheet() { sheet.classList.remove("open"); }
let covered = false;   // read before Classic handles the key: Escape that closes the coin page must not also leave the coin here
addEventListener("keydown", () => { covered = svc.coverOpen(); }, { capture: true, signal });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !covered) { if ($("#fld-list").classList.contains("open")) closeList(); else if (albumsDlg.classList.contains("open")) closeAlbums(); else if (state === "field" && sheet.classList.contains("open")) hideSheet(); else back(); } }, { signal });

/* ---------- touch: drag to pan, pinch / wheel to zoom, tap to open ---------- */
const drag = { active: false, pts: new Map(), moved: 0, d0: 0, dist0: 0 };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const el = renderer.domElement;
el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag.active = true; drag.moved = 0;
  if (drag.pts.size === 2) { const [a, b] = [...drag.pts.values()]; drag.d0 = Math.hypot(a.x - b.x, a.y - b.y); drag.dist0 = view.dist; } kick(); });
el.addEventListener("pointermove", (e) => { const p = drag.pts.get(e.pointerId); if (!p || state !== "field") return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.pts.size === 2) { const [a, b] = [...drag.pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); view.dist = THREE.MathUtils.clamp(drag.dist0 * drag.d0 / d, 6, fitDist() * 1.3); }
  else { const s = view.dist / innerHeight * 1.1; const half = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect * view.dist * 0.95; view.tx = THREE.MathUtils.clamp(view.tx - dx * s, Math.min(XMIN + half, WIDTH), Math.max(WIDTH + 2 - half, XMIN + half)); view.tz = THREE.MathUtils.clamp(view.tz - dy * s, -2, DEPTH + 2); }
  overviewPose(cam); });
const up = (e) => { drag.pts.delete(e.pointerId); if (!drag.pts.size) { drag.active = false;
  if (drag.moved < 8 && state === "field") { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const rh = rings.count ? ray.intersectObject(rings)[0] : null; if (rh) { showRing(rh.instanceId); return; }
    hideSheet(); const hit = ray.intersectObject(coins)[0]; if (hit) { lastFocus = $("#fld-btn-list"); open(hit.instanceId); } } } };
el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
el.addEventListener("wheel", (e) => { if (state !== "field") return; e.preventDefault(); view.dist = THREE.MathUtils.clamp(view.dist * (1 + e.deltaY * 0.001), 6, fitDist() * 1.3); overviewPose(cam); kick(); }, { passive: false });

/* ---------- the same move without gestures: a real list (keyboard, screen reader, Dad) ---------- */
const list = $("#fld-list");
function renderList(q) {
  const qq = (q || "").toLowerCase().trim(); const by = new Map();
  flips.forEach((f, i) => { if (qq && !(f.label + " " + f.scan + " " + (f.ser || "")).toLowerCase().includes(qq)) return; (by.get(f.country) || by.set(f.country, []).get(f.country)).push(i); });
  list.querySelector(".groups").innerHTML = [...by].map(([c, is]) => `<h3>${esc(c)} (${is.length})</h3><div class="coins">${is.map((i) => `<button type="button" data-i="${i}">${esc(flips[i].year)} · ${esc(flips[i].denom)}</button>`).join("")}</div>`).join("") || '<p class="sub">Nothing matches.</p>';
}
list.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0;font-size:22px">All ${flips.length} pieces</h2><button type="button" id="fld-btn-close-list">Close</button></div>
  <label for="q" class="sub">Find a coin (country, year, denomination, id)</label><input id="fld-q" type="search" autocomplete="off"><div class="groups"></div>`;
renderList("");
$("#fld-q").addEventListener("input", (e) => renderList(e.target.value));
list.addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; closeList(); lastFocus = $("#fld-btn-list"); open(+b.dataset.i); });
function closeList() { list.classList.remove("open"); $("#fld-btn-list").focus(); }
$("#fld-btn-list").addEventListener("click", () => { if (state === "coin") back(); list.classList.add("open"); $("#fld-q").focus(); });
$("#fld-btn-close-list").addEventListener("click", closeList);


// contract 4 + home: mute and the UI switch live in the header
{ const mb = $("#fld-mute"); const sync = () => { const m = svc.isMuted(); mb.setAttribute("aria-pressed", String(m)); mb.textContent = m ? "🔇" : "♪"; mb.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound"); };
  mb.addEventListener("click", () => { svc.setMuted(!svc.isMuted()); sync(); }); sync(); $("#fld-ui").addEventListener("click", () => svc.chooseUI()); }
/* ---------- go: the whole collection settles onto the table (the opening says what this is: everything, by place and year) ---------- */
resize(); view.dist = fitDist(true); overviewPose(cam);
if (motion === "full") { const end = cam.pos.clone(), start = end.clone().add(new THREE.Vector3(0, 18, 14)); animate(1200, (k) => cam.pos.lerpVectors(start, end, k)); }
kick();
setTimeout(() => ($("#fld-hint").style.opacity = 0), 6000);
const api = { open, back, flips, state: () => state, frames, applyFilter, showRing, rings: () => ringData.length, families: () => [...families.keys()], relief: () => reliefN };
window.__field = api;
return Object.assign(api, { unmount() {
  ac.abort(); if (raf) cancelAnimationFrame(raf); raf = 0;
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const mm = o.material; (Array.isArray(mm) ? mm : mm ? [mm] : []).forEach((x) => { ["map", "normalMap", "roughnessMap"].forEach((k) => x[k] && x[k].dispose()); x.dispose(); }); });
  renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* ignore */ } root.innerHTML = ""; if (window.__field === api) delete window.__field;
} });
}
const BODY = "<div id=\"fld-stage\" aria-hidden=\"true\"></div>\n<div id=\"fld-labels\" aria-hidden=\"true\"></div>\n<div id=\"fld-fade\"></div>\n<header>\n  <div>\n    <div class=\"total\" id=\"fld-total\">…</div>\n    <div class=\"sub\" id=\"fld-totsub\">loading the collection</div>\n  </div>\n  <div style=\"display:flex;flex-direction:column;gap:6px;align-items:flex-end\">\n    <button type=\"button\" id=\"fld-btn-list\" aria-haspopup=\"dialog\">List &amp; search</button>\n    <div class=\"fld-ctl\"><button type=\"button\" id=\"fld-mute\" aria-pressed=\"false\" aria-label=\"Mute sound\">♪</button><button type=\"button\" id=\"fld-ui\" aria-label=\"Switch UI\">UI</button></div>\n  </div>\n</header>\n<div id=\"fld-hint\">Tap a coin. Drag to move, pinch to zoom.</div>\n<nav class=\"crumbs\" id=\"fld-crumbs\" aria-live=\"polite\" aria-label=\"Where this coin lives\"></nav>\n<section id=\"fld-sheet\" role=\"dialog\" aria-modal=\"false\" aria-labelledby=\"fld-sh-title\" tabindex=\"-1\"></section>\n<section id=\"fld-list\" role=\"dialog\" aria-modal=\"true\" aria-label=\"All coins\"></section>\n<div id=\"fld-fps\" hidden></div>\n<div id=\"fld-dock\"><div id=\"fld-fnote\" role=\"status\" aria-live=\"polite\" hidden></div>\n<div class=\"filters\" role=\"group\" aria-label=\"Show\">\n  <button type=\"button\" data-f=\"all\" aria-pressed=\"true\">All</button><button type=\"button\" data-f=\"album\" aria-pressed=\"false\" aria-haspopup=\"dialog\">Albums</button><button type=\"button\" data-f=\"metal\" aria-pressed=\"false\">Silver &amp; gold</button><button type=\"button\" data-f=\"photo\" aria-pressed=\"false\">To photograph</button>\n</div></div>\n<section id=\"fld-albums\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Choose an album family\"></section>";
