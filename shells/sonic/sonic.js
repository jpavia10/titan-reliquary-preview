/* Sonic (Experimental UI, Grok exp worker, 2026-10-20). Your collection as an instrument you play with a finger.
   Every coin is a struck tone: height = year (newer sits higher and rings higher), left/right = where it is from (the
   Americas pan left, Asia and Oceania right, the same way you hear it), timbre = metal (silver rings bright, gold mellow).
   Drag across the field and every coin you pass is struck; each strike sends a real shock ring through a field of 400k GPU
   particles (summed damped waves in the vertex shader, shared fx/ curl-noise drift), and HDR bloom catches the wavefronts.
   Tap a coin to hold it: the camera leans in (<0.6 s), the coin rings long and its sourced facts rise.
   Contract via shells/exp/kit.js. Shared: window.THREE, shells/exp/post.js (HDR bloom), fx/ (TitanFXK.NOISE GLSL). */
const THREE = window.THREE; if (!THREE) throw new Error("three.js not loaded");
import { xpMount, yearOf, metalOf, ping, coinTone } from "../exp/kit.js";
import { createPost } from "../exp/post.js";
const FXK = window.TitanFXK || {};
const NOISE = FXK.NOISE || "float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }\nfloat vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\nfloat fbm(vec2 p){ float s = 0., a = .5; for (int i=0;i<5;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }\nfloat fbm3(vec2 p){ float s = 0., a = .5; for (int i=0;i<3;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }\nvec2 curl(vec2 p, float t){ float e = .02; float n1 = fbm3(p+vec2(0,e)+t), n2 = fbm3(p-vec2(0,e)+t), n3 = fbm3(p+vec2(e,0)+t), n4 = fbm3(p-vec2(e,0)+t); return vec2(n1-n2, -(n3-n4))/(2.*e); }\n";
const CONT = ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"];   // west to east = left to right in your ears
const COL = { gold: [1.0, 0.72, 0.28], silver: [0.72, 0.86, 1.0], copper: [1.0, 0.46, 0.24], base: [0.62, 1.0, 0.82], unknown: [0.85, 0.75, 1.0] };
const Y0 = 1800, Y1 = 2026, NS = 16;
const yN = (y) => 1 - 2 * Math.sqrt(Math.max(0, Math.min(1, (Y1 + 2 - Math.max(Y0, y)) / (Y1 + 2 - Y0))));   // sqrt time: recent decades get room, the 1800s still fit   // NS = live shock rings

export const mount = (root, svc) => xpMount(root, svc, { id: "sonic", title: "SONIC", hint: "Drag a finger across to play · tap a coin to hold it", stage: async (ctx) => {
  const { flips, stageEl, signal } = ctx, N = flips.length;
  const W = () => stageEl.clientWidth || innerWidth, H = () => stageEl.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); stageEl.appendChild(renderer.domElement);
  const post = createPost(renderer, { exposure: 1.05, vignette: 0.8, bloom: 0.85, fringe: 0.25, tint: [0.002, 0.002, 0.006] });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);

  /* layout in a unit field: x in [-1,1] by continent band (width ~ count^0.6) then country column; y in [-1,1] by year */
  const ys = flips.map(yearOf), cn = CONT.map((c) => flips.filter((f) => f.continent === c).length);
  const wts = cn.map((n) => (n ? Math.pow(n, 0.6) + 1 : 0)), wsum = wts.reduce((a, b) => a + b, 0) || 1;
  const bands = []; let acc = -1; CONT.forEach((c, k) => { const w = (wts[k] / wsum) * 2; if (w) bands.push({ c, x0: acc, x1: acc + w }); acc += w; });
  const pos = new Float32Array(N * 2);
  bands.forEach((b) => { const ids = flips.map((f, i) => i).filter((i) => flips[i].continent === b.c), cs = [...new Set(ids.map((i) => flips[i].country))].sort();
    ids.forEach((i) => { const k = cs.indexOf(flips[i].country), x = b.x0 + (b.x1 - b.x0) * (0.08 + 0.84 * (k + 0.5) / cs.length); pos[i * 2] = x; }); });
  flips.forEach((f, i) => { if (!CONT.includes(f.continent)) pos[i * 2] = (Math.random() - 0.5) * 0.2;
    const y = ys[i]; pos[i * 2 + 1] = y == null ? -1.05 : yN(y);
    pos[i * 2] += (Math.random() - 0.5) * 0.012; pos[i * 2 + 1] += (Math.random() - 0.5) * 0.01; });
  let SX = 1.6, SY = 1.0;   // field half-size in world units; set per aspect in resize()
  const wx = (i) => pos[i * 2] * SX, wy = (i) => pos[i * 2 + 1] * SY;

  /* shock rings: x, y, start time, strength + colour; shared by the particle field, the coins and the floor */
  const sW = Array.from({ length: NS }, () => new THREE.Vector4(0, 0, -99, 0)), sC = Array.from({ length: NS }, () => new THREE.Vector3(1, 1, 1));
  let sK = 0; const SU = { uS: { value: sW }, uSC: { value: sC }, uT: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uSz: { value: new THREE.Vector2(SX, SY) }, uFing: { value: new THREE.Vector3(0, 0, 0) }, uCs: { value: 0.02 } };
  const WAVE = `uniform vec4 uS[${NS}]; uniform vec3 uSC[${NS}]; uniform float uT;
    // a damped travelling ring from each strike: returns height, adds the glow colour of the wavefront
    float waves(vec2 p, out vec3 glow){ float h = 0.0; glow = vec3(0); for (int k = 0; k < ${NS}; k++){ float age = uT - uS[k].z; if (age < 0.0 || age > 3.0) continue;
      float r = length(p - uS[k].xy), front = r - age*0.9, env = exp(-age*1.6) * uS[k].w / (1.0 + r*3.0);
      float w = sin(front*26.0) * exp(-front*front*30.0); h += w*env; glow += uSC[k] * exp(-front*front*160.0) * env * 2.2; } return h; }`;

  /* labels (HTML): continents along the bottom, years down the side */
  const labs = document.createElement("div"); labs.className = "son-labs"; stageEl.appendChild(labs);
  const L = [...bands.map((b) => ({ t: b.c.replace("North America", "N. America").replace("South America", "S. Am."), x: (b.x0 + b.x1) / 2, w: b.x1 - b.x0, y: -1.14, k: "c" })), ...[1800, 1900, 1950, 1980, 2000, 2020].map((y) => ({ t: String(y), x: -1.0, y: yN(y) + 0.03, k: "y" }))]
    .map((l) => { const e = document.createElement("span"); e.className = "son-" + l.k; e.textContent = l.t; labs.appendChild(e); return { ...l, e }; });

  /* the field: 400k particles on a gently curved sheet, drifting with shared fx/ curl noise and lifted by every ring */
  const DN = Math.round(400000 * (+(new URLSearchParams(location.search).get("sonDust")) || 1)), dp = new Float32Array(DN * 3);
  for (let k = 0; k < DN; k++) { dp[k * 3] = Math.random() * 2 - 1; dp[k * 3 + 1] = Math.random() * 2 - 1; dp[k * 3 + 2] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3)); dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  const field = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: NOISE + WAVE + `uniform float uPx; uniform vec2 uSz; uniform vec3 uFing; varying vec3 vC;
      void main(){ vec2 q = position.xy * (uSz + 0.35); float s = position.z;
        q += curl(q*0.9 + s*0.01, uT*0.015) * 0.025;
        vec3 g; float h = waves(q, g);
        float fd = length(q - uFing.xy), fing = uFing.z * exp(-fd*fd*14.0);
        vec3 p = vec3(q, h*0.12 + (fbm3(q*1.4 + uT*0.04) - 0.5)*0.05 - fing*0.06 - dot(q,q)*0.02);
        float band = 0.5 + 0.5*sin(q.y*18.0/uSz.y);   // faint decade lines in the dust
        vC = vec3(0.3,0.38,0.7)*(0.07 + 0.09*s + 0.03*band) + g*0.4 + vec3(0.35,0.55,1.0)*fing*0.12 + vec3(0.5,0.6,1.0)*max(h,0.0)*0.6;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uPx*(1.0 + s*1.2)*(2.6/max(0.5,-mv.z)) + 0.4; }`,
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord-0.5; float d = dot(q,q)*4.0; if (d>1.0) discard; gl_FragColor = vec4(vC*(1.0-d), 1.0); }" }));
  field.frustumCulled = false; scene.add(field);

  /* coins: instanced glowing discs; each rings (flares + vibrates) when struck, the held one swells */
  const hit = new Float32Array(N), held = new Float32Array(N), cg = new THREE.InstancedBufferGeometry();
  cg.index = new THREE.PlaneGeometry(1, 1).index; cg.setAttribute("position", new THREE.PlaneGeometry(1, 1).getAttribute("position"));
  const ip = new Float32Array(N * 2), ic = new Float32Array(N * 3);
  flips.forEach((f, i) => { ic.set(COL[metalOf(f)] || COL.unknown, i * 3); });
  cg.setAttribute("iPos", new THREE.InstancedBufferAttribute(ip, 2)); cg.setAttribute("iCol", new THREE.InstancedBufferAttribute(ic, 3));
  const hitA = new THREE.InstancedBufferAttribute(hit, 1), heldA = new THREE.InstancedBufferAttribute(held, 1); hitA.setUsage(THREE.DynamicDrawUsage); heldA.setUsage(THREE.DynamicDrawUsage);
  cg.setAttribute("iHit", hitA); cg.setAttribute("iHeld", heldA); cg.instanceCount = N;
  const coinsM = new THREE.Mesh(cg, new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: WAVE + `uniform float uCs; attribute vec2 iPos; attribute vec3 iCol; attribute float iHit, iHeld; varying vec2 vQ; varying vec3 vC; varying float vH, vHeld;
      void main(){ vec3 g; float h = waves(iPos, g); float sz = uCs * (1.0 + iHit*0.9) + iHeld*0.05;
        float jit = iHit * sin(uT*90.0 + iPos.x*40.0) * 0.004;
        vec3 p = vec3(iPos + vec2(jit, 0.0), h*0.12 + 0.02 + iHeld*0.12) + vec3(position.xy*sz*2.0, 0.0);
        vQ = position.xy*2.0; vC = iCol; vH = iHit; vHeld = iHeld; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `varying vec2 vQ; varying vec3 vC; varying float vH, vHeld;
      void main(){ float r = length(vQ); if (r > 1.0) discard;
        float disc = smoothstep(0.42, 0.38, r), rim = exp(-pow((r-0.4)*14.0, 2.0)), halo = exp(-r*r*6.0)*(0.25 + vH*1.6);
        float rings = vHeld * exp(-pow((r-0.7)*10.0,2.0)) * 0.8;
        vec3 c = vC*(disc*(0.16 + vH*1.6) + rim*(0.55 + vH*2.4) + halo*0.35 + rings) * (1.0 - vHeld*0.6);
        gl_FragColor = vec4(c, 1.0); }` }));
  coinsM.frustumCulled = false; scene.add(coinsM);

  /* the playhead: a vertical beam of light that follows your finger */
  const BU = { uX: { value: 0 }, uA: { value: 0 }, uT: SU.uT };
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), new THREE.ShaderMaterial({ uniforms: BU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "uniform float uA, uT; varying vec2 vU; void main(){ float x = abs(vU.x-0.5)*2.0; float c = exp(-x*x*900.0)*1.4 + exp(-x*x*30.0)*0.12; float fl = 0.85 + 0.15*sin(vU.y*60.0 - uT*12.0); gl_FragColor = vec4(vec3(0.55,0.75,1.0)*c*uA*fl*smoothstep(0.0,0.2,vU.y)*smoothstep(1.0,0.8,vU.y), 1.0); }" }));
  scene.add(beam);
  /* the held coin wears its own photo, lit by the rings around it */
  const faceM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), faceM); scene.add(face);
  const loader = new THREE.TextureLoader(); let faceFor = -1;
  function wear(i) { faceFor = i; faceM.opacity = 0; const f = flips[i]; if (!f.thumb) { faceM.map = null; faceM.color.setRGB(...(COL[metalOf(f)] || COL.unknown)); faceM.needsUpdate = true; return; }
    loader.load(f.thumb, (t) => { if (faceFor !== i) return t.dispose(); t.encoding = THREE.sRGBEncoding; faceM.map && faceM.map.dispose(); faceM.map = t; faceM.color.setRGB(0.92, 0.92, 0.92); faceM.needsUpdate = true; }); }

  const cam = { x: 0, y: 0, z: 3, tx: 0, ty: -0.25, tz: 3, lx: 0, ly: 0, tlx: 0, tly: 0 };
  let focusI = null;
  function resize() { const w = W(), h = H(), pr = renderer.getPixelRatio(), a = w / h; renderer.setSize(w, h, false); camera.aspect = a; camera.updateProjectionMatrix(); post.resize(w, h, pr);
    SY = 1.0; SX = Math.max(0.62, Math.min(2.5, a * 1.05)); SU.uSz.value.set(SX, SY);
    for (let i = 0; i < N; i++) { ip[i * 2] = wx(i); ip[i * 2 + 1] = wy(i); } cg.getAttribute("iPos").needsUpdate = true;
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360); cam.base = Math.max((SY * 2 + 0.75) / vh, (SX * 2 + 0.3) / (vh * a)); if (focusI == null) cam.tz = cam.base;
    SU.uCs.value = (Math.min(16, Math.max(10, w / 90)) / h) * cam.base * vh * 0.5;
    L.forEach((l) => { if (l.k === "c") l.e.hidden = (l.w * SX) / (cam.base * vh * a) * w < 64; }); }
  resize(); cam.z = cam.base * 1.6; addEventListener("resize", resize, { signal });

  /* playing: strikes ring the coin and launch a shock ring; throttled so a fast scrub stays musical */
  const lastHit = new Float32Array(N).fill(-9); let lastPing = 0, strikes = 0, time = 0;
  function strike(i, gain = 0.11, dur = 1.1, amp = 1) { const f = flips[i], t = coinTone(f), c = COL[metalOf(f)] || COL.unknown;
    hit[i] = 1; lastHit[i] = time; strikes++;
    sW[sK].set(wx(i), wy(i), time, amp); sC[sK].set(c[0], c[1], c[2]); sK = (sK + 1) % NS;
    const now = performance.now(); if (now - lastPing > 45) { lastPing = now; ping(svc, t.freq, t.bright, pos[i * 2], gain, dur); } }
  const el = renderer.domElement, ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), pl = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hv = new THREE.Vector3(), v = new THREE.Vector3();
  const toField = (x, y) => { ndc.set(x / W() * 2 - 1, 1 - y / H() * 2); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(pl, hv) ? hv : null; };
  const screenOf = (i) => { v.set(wx(i), wy(i), 0.02).project(camera); return [(v.x + 1) / 2 * W(), (1 - v.y) / 2 * H()]; };
  function nearest(x, y, rad) { let bd = rad * rad, bi = -1; for (let i = 0; i < N; i++) { const [sx, sy] = screenOf(i), d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; }
  let drag = null;
  function scrubTo(x, y) { const p = toField(x, y); if (!p) return; SU.uFing.value.set(p.x, p.y, 1); BU.uX.value = p.x; BU.uA.value = 1; beam.position.set(p.x, 0, 0.05);
    const px = drag ? drag.px : x, py = drag ? drag.py : y;   // strike everything the finger swept past since the last move, not just under it
    const r = 26, minx = Math.min(px, x) - r, maxx = Math.max(px, x) + r, miny = Math.min(py, y) - r, maxy = Math.max(py, y) + r;
    for (let i = 0; i < N; i++) { if (time - lastHit[i] < 0.35) continue; const [sx, sy] = screenOf(i); if (sx < minx || sx > maxx || sy < miny || sy > maxy) continue;
      const dx = x - px, dy = y - py, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((sx - px) * dx + (sy - py) * dy) / L2)), ex = px + dx * t - sx, ey = py + dy * t - sy;
      if (ex * ex + ey * ey < r * r) strike(i); }
    if (drag) { drag.px = x; drag.py = y; } }
  el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, moved: 0 }; if (focusI == null) scrubTo(e.clientX, e.clientY); }, { signal });
  el.addEventListener("pointermove", (e) => { if (!drag) { const p = toField(e.clientX, e.clientY); if (p) SU.uFing.value.set(p.x, p.y, 0.5); return; }
    drag.moved += Math.abs(e.clientX - drag.px) + Math.abs(e.clientY - drag.py); if (focusI == null || drag.moved > 12) scrubTo(e.clientX, e.clientY); }, { signal });
  const up = (e) => { const d = drag; drag = null; BU.uA.value = 0; if (d && d.moved < 10) { const i = nearest(e.clientX, e.clientY, 40); if (i >= 0) ctx.open(i); } };
  el.addEventListener("pointerup", up, { signal }); el.addEventListener("pointercancel", () => { drag = null; BU.uA.value = 0; }, { signal });
  el.addEventListener("pointerleave", () => { SU.uFing.value.z = 0; }, { signal });

  let raf = 0, last = performance.now(), idle = 0, lost = false, alive = true;
  el.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; }, { signal });   // the browser took the GPU back: wait, don't draw
  el.addEventListener("webglcontextrestored", () => { lost = false; }, { signal });
  function loop(now) { if (!alive) return; raf = requestAnimationFrame(loop); if (lost || renderer.getContext().isContextLost()) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; if (svc.coverOpen() && !document.querySelector(".shell-pick:not([hidden])")) return;
    time += dt; SU.uT.value = time; idle += dt;
    if (!drag && focusI == null && idle > 2.6) { idle = 0; const i = (Math.random() * N) | 0; hit[i] = 0.6; sW[sK].set(wx(i), wy(i), time, 0.35); sC[sK].set(...(COL[metalOf(flips[i])] || COL.unknown)); sK = (sK + 1) % NS; }   // the field breathes on its own: silent ripples
    if (drag) idle = 0; if (!drag) SU.uFing.value.z *= 0.92;
    const kd = Math.exp(-dt * 3.2); for (let i = 0; i < N; i++) { hit[i] *= kd; held[i] += ((i === focusI ? 1 : 0) - held[i]) * Math.min(1, dt * 12); }
    hitA.needsUpdate = true; heldA.needsUpdate = true;
    if (faceFor >= 0) { const hv2 = held[faceFor]; faceM.opacity = Math.min(1, hv2 * 1.2) * (faceM.map || !flips[faceFor].thumb ? 1 : 0); face.position.set(wx(faceFor), wy(faceFor), 0.16); face.scale.setScalar(0.02 + hv2 * 0.26); face.rotation.z = Math.sin(time * 0.7) * 0.06; face.visible = hv2 > 0.01; }
    if (focusI != null) { const portrait = W() / H() < 1 && W() < 900; cam.tlx = wx(focusI) + (W() > 900 ? 0.18 : 0); cam.tly = wy(focusI) - (portrait ? 0.32 : 0.05); cam.tx = cam.tlx; cam.ty = cam.tly - 0.55; cam.tz = 1.25; }
    else { cam.tlx = 0; cam.tly = 0; cam.tx = 0; cam.ty = -0.32 * cam.base / 3; cam.tz = cam.base; }
    const kk = 1 - Math.pow(0.0008, dt);   // settles in ~0.55 s at any frame rate
    cam.x += (cam.tx - cam.x) * kk; cam.y += (cam.ty - cam.y) * kk; cam.z += (cam.tz - cam.z) * kk; cam.lx += (cam.tlx - cam.lx) * kk; cam.ly += (cam.tly - cam.ly) * kk;
    camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(cam.lx, cam.ly, 0);
    const w = W(), h = H(), show = focusI == null;
    L.forEach((l) => { v.set(l.x * SX, l.y * SY, 0).project(camera); l.e.style.opacity = show ? "1" : "0"; l.e.style.transform = `translate3d(${((v.x + 1) / 2 * w) | 0}px,${((1 - v.y) / 2 * h) | 0}px,0) translate(${l.k === "y" ? "0" : "-50%"},-50%)`; });
    post.render(scene, camera, time, 0.85); }
  raf = requestAnimationFrame(loop);
  window.__sonic = { coins: N, particles: DN, particlesFull: 400000, strikes: () => strikes, focus: () => focusI, strike: (i) => strike(i),
    scrub(x0, y0, x1, y1, n = 24) { drag = { x: x0, y: y0, px: x0, py: y0, moved: 99 }; for (let k = 0; k <= n; k++) scrubTo(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n); drag = null; BU.uA.value = 0; },
    warm(n) { for (let k = 0; k < n; k++) loop(performance.now()); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } };
  ctx.hint(`${N} coins · up = newer, higher note · left to right = Americas to Asia · drag to play, tap to hold`);
  return {
    focus(i) { focusI = i; wear(i); strike(i, 0.16, 2.4, 2.2); },
    blur() { focusI = null; },
    unmount() { alive = false; cancelAnimationFrame(raf); post.dispose(); scene.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); delete window.__sonic; }
  };
} });
