/* Ask (Experimental UI, Grok exp worker, 2026-10-20). Chat with your collection.
   A deterministic question parser over the published data/index.json (read only, no AI guessing, no network model): it
   understands counts, totals, oldest/newest, most/least valuable, metal, country, continent, decade/era, photos, and lists.
   Every answer cites the exact coins it used (tap one for its sourced facts) and says which published file the numbers come from.
   Stage: a GPU constellation. Every coin is a light in a slow curl-noise galaxy (200k dust, HDR bloom); when an answer cites
   coins they fly together into a bright constellation in front of the camera (~0.5 s) while the rest dim.
   Contract via shells/exp/kit.js. Shared: window.THREE, shells/exp/post.js, fx/ TitanFXK.NOISE. */
const THREE = window.THREE; if (!THREE) throw new Error("three.js not loaded");
import { xpMount, yearOf, metalOf, money, esc, ping, coinTone } from "../exp/kit.js";
import { createPost } from "../exp/post.js";
const NOISE = (window.TitanFXK || {}).NOISE || "float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }\nfloat vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\nfloat fbm3(vec2 p){ float s = 0., a = .5; for (int i=0;i<3;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }\nvec2 curl(vec2 p, float t){ float e = .02; float n1 = fbm3(p+vec2(0,e)+t), n2 = fbm3(p-vec2(0,e)+t), n3 = fbm3(p+vec2(e,0)+t), n4 = fbm3(p-vec2(e,0)+t); return vec2(n1-n2, -(n3-n4))/(2.*e); }\n";
const COL = { gold: [1.0, 0.74, 0.3], silver: [0.75, 0.87, 1.0], copper: [1.0, 0.5, 0.28], base: [0.66, 1.0, 0.85], unknown: [0.86, 0.78, 1.0] };
const METAL_W = { gold: "gold", silver: "silver", copper: "copper", bronze: "copper", nickel: "base", steel: "base", "base": "base" };

/* ---- the parser: plain words in, a filter + an operation out. Pure function, easy to test. ---- */
export function answer(q, flips, board) {
  const s = " " + String(q || "").toLowerCase().replace(/[?!.,]/g, " ") + " ";
  let set = flips.map((f, i) => i), why = [];
  for (const [w, m] of Object.entries(METAL_W)) if (s.includes(" " + w + " ")) { set = set.filter((i) => metalOf(flips[i]) === m); why.push(w); break; }
  const countries = [...new Set(flips.map((f) => f.country).filter(Boolean))].sort((a, b) => b.length - a.length);
  const c = countries.find((c) => s.includes(" " + c.toLowerCase() + " ")); if (c) { set = set.filter((i) => flips[i].country === c); why.push("from " + c); }
  const conts = [...new Set(flips.map((f) => f.continent).filter(Boolean))];
  const ct = conts.find((x) => s.includes(" " + x.toLowerCase() + " ") || (x === "Europe" && s.includes(" european ")) || (x === "Asia" && s.includes(" asian ")));
  if (ct && !c) { set = set.filter((i) => flips[i].continent === ct); why.push("from " + ct); }
  let m = s.match(/ (1[5-9]|20)(\d)0s /); if (m) { const d = +(m[1] + m[2] + "0"); set = set.filter((i) => { const y = yearOf(flips[i]); return y != null && y >= d && y < d + 10; }); why.push("from the " + d + "s"); }
  m = s.match(/ (before|after|since) (\d{4}) /); if (m) { const y0 = +m[2]; set = set.filter((i) => { const y = yearOf(flips[i]); return y != null && (m[1] === "before" ? y < y0 : y >= y0); }); why.push(m[1] + " " + y0); }
  m = s.match(/ (?:in|from|year) (\d{4}) /); if (m && !/ (before|after|since) /.test(s)) { const y0 = +m[1]; set = set.filter((i) => yearOf(flips[i]) === y0); why.push("dated " + y0); }
  if (/ (no|without|missing|needs?) (a )?photo/.test(s) || / shoot list /.test(s)) { set = set.filter((i) => !flips[i].thumb); why.push("still needing a photo"); }
  else if (/ (with|has|have) (a )?photo/.test(s)) { set = set.filter((i) => !!flips[i].thumb); why.push("with a photo"); }
  const mw = why.length && METAL_W[why[0]] ? why.shift() + " " : ""; const scope = mw + "coins" + (why.length ? " " + why.join(", ") : ""); if (mw) why.unshift(mw.trim());
  const yr = (i) => yearOf(flips[i]), est = (i) => (flips[i].est == null ? null : +flips[i].est);
  const sum = set.reduce((a, i) => a + (est(i) || 0), 0), valued = set.filter((i) => est(i) != null).length;
  const by = (k, dir) => set.filter((i) => k(i) != null).sort((a, b) => dir * (k(a) - k(b)));
  const n = (m = s.match(/ (?:top|(\d+)) /)) && m[1] ? Math.min(20, +m[1]) : 5;
  if (!set.length) return { text: `I found no ${scope}. Try fewer words, or open Search to browse.`, cite: [] };
  if (/ (oldest|earliest) /.test(s)) { const r = by(yr, 1).slice(0, n); return { text: `The oldest ${scope}: ${r.map((i) => `${flips[i].label}`).join("; ")}.`, cite: r }; }
  if (/ (newest|latest|most recent|youngest) /.test(s)) { const r = by(yr, -1).slice(0, n); return { text: `The newest ${scope}: ${r.map((i) => flips[i].label).join("; ")}.`, cite: r }; }
  if (/ (most valuable|priciest|best|worth the most|highest value|expensive) /.test(s)) { const r = by(est, -1).slice(0, n); return { text: `The most valuable ${scope}: ${r.map((i) => `${flips[i].label} (${money(est(i))})`).join("; ")}.`, cite: r }; }
  if (/ (least valuable|cheapest|worth the least|lowest value) /.test(s)) { const r = by(est, 1).slice(0, n); return { text: `The least valuable ${scope}: ${r.map((i) => `${flips[i].label} (${money(est(i))})`).join("; ")}.`, cite: r }; }
  if (/ (worth|value|total|sum) /.test(s)) return { text: `Your ${scope} are estimated at ${money(sum)} in total (${valued} of ${set.length} have an estimate).` + (!why.length && board && board.grand ? ` The whole collection, including bullion, albums, sets and stamps, is ${money(board.grand)}.` : ""), cite: by(est, -1).slice(0, 12) };
  if (/ (which countries|what countries|countries) /.test(s)) { const cs = {}; set.forEach((i) => (cs[flips[i].country] = (cs[flips[i].country] || 0) + 1)); const top = Object.entries(cs).sort((a, b) => b[1] - a[1]);
    return { text: `${top.length} countries: ${top.slice(0, 12).map(([k, v]) => `${k} ${v}`).join(", ")}${top.length > 12 ? "…" : ""}.`, cite: set.slice(0, 12) }; }
  if (/ (how many|count|number of) /.test(s) || why.length) return { text: `You have ${set.length} ${scope}${valued ? `, estimated at ${money(sum)} together` : ""}.`, cite: by(est, -1).concat(set.filter((i) => est(i) == null)).slice(0, 12) };
  return { text: `I can answer things like "how many silver coins", "oldest coins from Germany", "most valuable gold", "coins from the 1960s", "what's it all worth" or "which coins need a photo". I only use your published collection, nothing made up.`, cite: [] };
}
const SUGGEST = ["How many silver coins?", "Oldest coins", "Most valuable", "Coins from the 1960s", "What's it all worth?", "Which need a photo?"];

export const mount = (root, svc) => xpMount(root, svc, { id: "ask", title: "ASK", hint: "", stage: async (ctx) => {
  const { flips, stageEl, signal, idx } = ctx, N = flips.length;
  const W = () => stageEl.clientWidth || innerWidth, H = () => stageEl.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); stageEl.appendChild(renderer.domElement);
  const post = createPost(renderer, { exposure: 1.05, vignette: 0.85, bloom: 0.9, fringe: 0.2 });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100); camera.position.set(0, 0.6, 4.2); camera.lookAt(0, 0, 0);
  const U = { uT: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uMix: { value: 0 } };
  /* galaxy dust */
  const DN = Math.round(200000 * (+(new URLSearchParams(location.search).get("askDust")) || 1)), dp = new Float32Array(DN * 3);
  for (let k = 0; k < DN; k++) { const r = 0.3 + Math.pow(Math.random(), 0.6) * 3.2, arm = (k % 3) * 2.094, a = arm + r * 1.4 + (Math.random() - 0.5) * 0.9; dp.set([r, a, (Math.random() - 0.5) * 0.12 * (1 + r * 0.3)], k * 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3)); dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: NOISE + `uniform float uT, uPx, uMix; varying vec3 vC;
      void main(){ float r = position.x, a = position.y + uT*0.05/(0.4+r*0.3); vec3 p = vec3(cos(a)*r, position.z, sin(a)*r);
        p.xz += curl(p.xz*0.6, uT*0.02)*0.08; float heat = exp(-r*0.9);
        vC = mix(vec3(0.25,0.3,0.6), vec3(1.0,0.75,0.45), heat) * (0.5 + 0.3*fract(position.y*91.7)) * (1.0 - uMix*0.55);
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uPx*(7.0/max(0.5,-mv.z)) + 0.8; }`,
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord-0.5; float d = dot(q,q)*4.0; if (d>1.0) discard; gl_FragColor = vec4(vC*(1.0-d),1.0); }" }));
  dust.frustumCulled = false; scene.add(dust);
  /* coins: one light each; home = a place in the galaxy by year (older farther out), cite = a slot in the constellation */
  const home = new Float32Array(N * 3), tgt = new Float32Array(N * 3), cur = new Float32Array(N * 3), lit = new Float32Array(N), glow = new Float32Array(N), col = new Float32Array(N * 3);
  flips.forEach((f, i) => { const y = yearOf(f) || 1950, r = 0.5 + Math.sqrt(Math.max(0, 2026 - y) / 226) * 2.8, a = (i * 2.39996) % 6.283; home.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.15, Math.sin(a) * r], i * 3); col.set(COL[metalOf(f)] || COL.unknown, i * 3); });
  tgt.set(home); cur.set(home);
  // instanced billboards (not GL points: point size is capped on some GPUs), so every coin is a crisp disc at any size
  const cg = new THREE.InstancedBufferGeometry(), quad = new THREE.PlaneGeometry(1, 1); cg.index = quad.index; cg.setAttribute("position", quad.getAttribute("position"));
  const pA = new THREE.InstancedBufferAttribute(cur, 3), gA = new THREE.InstancedBufferAttribute(glow, 1); pA.setUsage(THREE.DynamicDrawUsage); gA.setUsage(THREE.DynamicDrawUsage);
  cg.setAttribute("iPos", pA); cg.setAttribute("glow", gA); cg.setAttribute("col", new THREE.InstancedBufferAttribute(col, 3)); cg.instanceCount = N;
  const coins = new THREE.Mesh(cg, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 iPos, col; attribute float glow; uniform float uMix, uT; varying vec3 vC; varying vec2 vQ;
      void main(){ vec4 mv = modelViewMatrix*vec4(iPos,1.0); float sz = 0.05 + glow*0.11 + glow*sin(uT*3.0 + iPos.x*9.0)*0.008; mv.xy += position.xy*sz;
        vQ = position.xy*2.0; vC = col * (0.7 + glow*1.6) * (1.0 - uMix*0.65*(1.0-glow)); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: "varying vec3 vC; varying vec2 vQ; void main(){ float r = length(vQ); if (r>1.0) discard; float core = smoothstep(0.32,0.24,r), rim = exp(-pow((r-0.3)*16.0,2.0)), halo = exp(-r*r*5.0)*0.35; gl_FragColor = vec4(vC*(core*0.6+rim+halo), 1.0); }" }));
  coins.frustumCulled = false; scene.add(coins);
  /* constellation lines between cited coins */
  const lineG = new THREE.BufferGeometry(), linePos = new Float32Array(40 * 6); lineG.setAttribute("position", new THREE.BufferAttribute(linePos, 3)); lineG.setDrawRange(0, 0);
  const lines = new THREE.LineSegments(lineG, new THREE.LineBasicMaterial({ color: 0x6f9cff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false })); lines.frustumCulled = false; scene.add(lines);
  let cited = [];
  function constellate(ids) { cited = ids; tgt.set(home); lit.fill(0); const n = ids.length, wide = W() / H() > 1.2;
    ids.forEach((i, k) => { const a = (k / Math.max(1, n)) * 6.283 + 0.4, rr = n === 1 ? 0 : 0.55 + 0.25 * (k % 2); tgt.set([(wide ? 0.9 : 0) + Math.cos(a) * rr * (wide ? 1.1 : 0.8), 1.0 + (wide ? 0 : 0.55) + Math.sin(a) * rr * 0.75, 1.6], i * 3); lit[i] = 1; });
    U.uMix.value = n ? 1 : 0; }
  function resize() { const w = W(), h = H(); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); post.resize(w, h, renderer.getPixelRatio()); if (cited.length) constellate(cited); }
  resize(); addEventListener("resize", resize, { signal });
  let raf = 0, last = performance.now(), time = 0, alive = true; const v = new THREE.Vector3();
  function loop(now) { if (!alive) return; raf = requestAnimationFrame(loop); if (renderer.getContext().isContextLost()) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (svc.coverOpen() && !document.querySelector(".shell-pick:not([hidden])")) return; time += dt; U.uT.value = time;
    const k = 1 - Math.pow(0.0005, dt);   // ~0.5 s flight at any frame rate
    for (let i = 0; i < N; i++) { const rot = lit[i] ? 0 : time * 0.05 / (0.4 + Math.hypot(home[i * 3], home[i * 3 + 2]) * 0.3), ca = Math.cos(rot), sa = Math.sin(rot);
      const hx = lit[i] ? tgt[i * 3] : home[i * 3] * ca - home[i * 3 + 2] * sa, hz = lit[i] ? tgt[i * 3 + 2] : home[i * 3] * sa + home[i * 3 + 2] * ca, hy = lit[i] ? tgt[i * 3 + 1] : home[i * 3 + 1];
      cur[i * 3] += (hx - cur[i * 3]) * k; cur[i * 3 + 1] += (hy - cur[i * 3 + 1]) * k; cur[i * 3 + 2] += (hz - cur[i * 3 + 2]) * k; glow[i] += (lit[i] - glow[i]) * k; }
    pA.needsUpdate = true; gA.needsUpdate = true;
    let L = 0; for (let k2 = 0; k2 + 1 < cited.length && k2 < 39; k2++) { const a = cited[k2], b = cited[k2 + 1]; linePos.set([cur[a * 3], cur[a * 3 + 1], cur[a * 3 + 2], cur[b * 3], cur[b * 3 + 1], cur[b * 3 + 2]], L * 6); L++; }
    lineG.attributes.position.needsUpdate = true; lineG.setDrawRange(0, L * 2); lines.material.opacity += ((L ? 0.45 : 0) - lines.material.opacity) * k;
    camera.position.set(Math.sin(time * 0.03) * 0.3, 0.6 + (W() / H() < 1 ? 0.5 : 0), 4.2 + (W() / H() < 1 ? 1.6 : 0)); camera.lookAt(0, W() / H() < 1 ? 0.15 : 0.25, 0);
    post.render(scene, camera, time, 0.8); }
  raf = requestAnimationFrame(loop);

  /* the chat */
  const chat = document.createElement("div"); chat.className = "ask-chat";
  chat.innerHTML = `<div class="ask-log" id="ask-log" role="log" aria-live="polite"></div><div class="ask-sug" id="ask-sug">${SUGGEST.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <form class="ask-in" id="ask-form"><input id="ask-q" type="text" autocomplete="off" placeholder="Ask about your coins…" aria-label="Ask a question about your collection"><button type="submit" aria-label="Ask">↑</button></form>`;
  stageEl.parentElement.appendChild(chat);
  const log = chat.querySelector("#ask-log"), src = `published collection index (data/index.json, ledger ${esc(String(idx.board.ledger_version || "").slice(0, 14))})`;
  let asked = 0;
  function ask(q) { q = String(q || "").trim(); if (!q) return; asked++; const r = answer(q, flips, idx.board);
    log.insertAdjacentHTML("beforeend", `<div class="ask-me">${esc(q)}</div><div class="ask-bot"><p>${esc(r.text)}</p>${r.cite.length ? `<div class="ask-cite">${r.cite.map((i) => `<button type="button" data-i="${i}">${flips[i].thumb ? `<img src="${esc(flips[i].thumb)}" alt="" loading="lazy">` : "<i></i>"}<span>${esc(flips[i].scan)}</span></button>`).join("")}</div>` : ""}<small>Source: ${src}. Tap a coin for who checked each fact.</small></div>`);
    log.scrollTop = log.scrollHeight; constellate(r.cite); if (r.cite[0] != null) { const t = coinTone(flips[r.cite[0]]); ping(svc, t.freq, t.bright, 0, 0.08, 1.4); } }
  chat.querySelector("#ask-form").addEventListener("submit", (e) => { e.preventDefault(); const i = chat.querySelector("#ask-q"); ask(i.value); i.value = ""; }, { signal });
  chat.addEventListener("click", (e) => { const s = e.target.closest("[data-q]"); if (s) return ask(s.dataset.q); const c = e.target.closest("[data-i]"); if (c) ctx.open(+c.dataset.i); }, { signal });
  log.innerHTML = `<div class="ask-bot"><p>Ask me anything about your ${N} pieces. I answer only from your published collection and show the coins behind every answer.</p></div>`;
  window.__ask = { ask, answer: (q) => answer(q, flips, idx.board), cited: () => cited.length, particles: DN, particlesFull: 200000, asked: () => asked, warm(n) { for (let j = 0; j < n; j++) loop(performance.now()); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } };
  return {
    back() { if (cited.length) { constellate([]); return true; } return false; },
    unmount() { alive = false; cancelAnimationFrame(raf); chat.remove(); post.dispose(); scene.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); delete window.__ask; }
  };
} });
