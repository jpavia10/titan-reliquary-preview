/* Hologram (Experimental UI, Grok exp worker, 2026-10-20). Everything forms by rotational coalescence of particles.
   A real-time GPGPU simulation (sim.js): 1M particles on a phone or tablet, 4M on a big desktop screen, driven by curl-noise
   vortices, spring targets and a touch flow you can stir with your finger. Home: the collection is a ring of light around
   you (one cluster per coin, year runs around the ring, metal sets the hue); a 45" curved ultrawide sees most of the ring.
   Tap a cluster: the whole field spirals in and builds that coin from its own photo, plus the light panel behind its facts.
   Back: it bursts and flows home. HDR render + bloom, RGB fringe, scanlines, flicker, tilt/mouse parallax.
   Contract via shells/exp/kit.js (search, sourced facts + provenance, back, mute). Uses the app's shared three.js. */
const THREE = window.THREE;   // the app's one shared three.js (js/three.min.js)
if (!THREE) throw new Error("three.js not loaded");
import { xpMount, yearOf, metalOf, ping, audio, coinTone } from "../exp/kit.js";
import { createSim } from "./sim.js";

const HUE = { gold: [1.0, 0.72, 0.3], silver: [0.55, 0.85, 1.0], copper: [1.0, 0.45, 0.28], base: [0.45, 1.0, 0.8], unknown: [0.7, 0.65, 1.0] };
const QUAD_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

export const mount = (root, svc) => xpMount(root, svc, { id: "hologram", title: "HOLOGRAM", hint: "Drag to stir the light and turn the ring · tap a light to form that coin", stage: async (ctx) => {
  const { flips, stageEl, signal } = ctx, N = flips.length;
  const W = () => stageEl.clientWidth || innerWidth, H = () => stageEl.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); stageEl.appendChild(renderer.domElement);
  // a capable GPU is assumed: 1024^2 = 1M particles everywhere, 2048^2 = 4M on large screens (the 4090 ultrawide)
  const q = new URLSearchParams(location.search).get("holoT");
  const T = q ? +q : (screen.width * screen.height * (devicePixelRatio || 1) ** 2 > 3.2e6 && !/Mobi|Android|iPad|iPhone/.test(navigator.userAgent) ? 2048 : 1024);
  const P = T * T;

  /* home layout: a ring of coin clusters around the viewer, ordered by year, plus an ambient vortex field */
  const R = 9, ys = flips.map(yearOf);
  const order = flips.map((f, i) => i).sort((a, b) => (ys[a] || 9999) - (ys[b] || 9999));
  const ang = new Float32Array(N), hgt = new Float32Array(N);
  order.forEach((i, k) => { ang[i] = (k / N) * Math.PI * 2; hgt[i] = ((k * 7) % 5 - 2) * 0.85 + Math.sin(k * 0.37) * 0.3; });
  const centers = flips.map((f, i) => new THREE.Vector3(Math.sin(ang[i]) * R, hgt[i], -Math.cos(ang[i]) * R));
  const home = new Float32Array(P * 4), hcol = new Float32Array(P * 4), ref = new Float32Array(P * 2);
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random()); };
  for (let p = 0; p < P; p++) {
    ref[p * 2] = ((p % T) + 0.5) / T; ref[p * 2 + 1] = (Math.floor(p / T) + 0.5) / T;
    const i = p % N, c = centers[i], hu = HUE[metalOf(flips[i])] || HUE.unknown, s = Math.random(), o = p * 4;
    if (s < 0.6) { const r = s < 0.35 ? Math.abs(gauss()) * 0.1 : 0.16 + Math.random() * 0.2, a = Math.random() * 6.2832;
      home[o] = c.x + Math.cos(a) * r * Math.cos(ang[i]); home[o + 1] = c.y + Math.sin(a) * r; home[o + 2] = c.z + Math.cos(a) * r * Math.sin(ang[i]);
      const k = s < 0.35 ? 3.0 : 0.8; hcol[o] = hu[0] * k; hcol[o + 1] = hu[1] * k; hcol[o + 2] = hu[2] * k; }
    else { const r = 2.5 + Math.pow(Math.random(), 0.7) * 17, a = Math.random() * 6.2832;
      home[o] = Math.sin(a) * r; home[o + 1] = gauss() * 2.8; home[o + 2] = -Math.cos(a) * r; hcol[o] = 0.02; hcol[o + 1] = 0.06; hcol[o + 2] = 0.11; }
    home[o + 3] = 1; hcol[o + 3] = 1;
  }
  const sim = createSim(renderer, T, home, hcol); const SU = sim.U;

  /* draw: every particle reads its simulated position; hue blends from home to the coin's photo colour */
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * 3), 3)); geo.setAttribute("ref", new THREE.BufferAttribute(ref, 2));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const RU = { tPos: { value: null }, tHC: { value: sim.homeC }, tCC: { value: sim.coinC }, uMix: SU.uMix, uPx: { value: 1 }, uT: SU.uT, uDense: { value: Math.min(1, 14000 / P) } };   // a formed coin packs every particle into one disc: keep it from washing out
  const pmat = new THREE.ShaderMaterial({ uniforms: RU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 ref; uniform sampler2D tPos, tHC, tCC; uniform float uMix, uPx, uT, uDense; varying vec3 vC;
      void main(){ vec4 P = texture2D(tPos, ref); float k = clamp(uMix*1.4 - P.w*0.4, 0.0, 1.0);
        vC = mix(texture2D(tHC, ref).rgb, texture2D(tCC, ref).rgb * uDense, k) * (0.85 + 0.3*sin(uT*3.0 + P.w*60.0));
        vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, uPx * 7.0 / max(0.4, -mv.z)); }`,
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord-0.5; float r = dot(q,q)*4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC*(1.0-r)*0.55, 1.0); }" });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  const pts = new THREE.Points(geo, pmat); pts.frustumCulled = false; scene.add(pts);

  /* HDR post: bright pass -> two blur levels -> composite (ACES, RGB fringe, scanlines, flicker, vignette) */
  const hdr = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const main = hdr(), b1 = [hdr(), hdr()], b2 = [hdr(), hdr()];
  const pc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), ps = new THREE.Scene(), pq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); ps.add(pq);
  const blurM = new THREE.ShaderMaterial({ uniforms: { tD: { value: null }, uDir: { value: new THREE.Vector2() }, uTh: { value: 0 } }, vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tD; uniform vec2 uDir; uniform float uTh; varying vec2 vUv;
      vec3 S(vec2 o){ vec3 c = texture2D(tD, vUv + o).rgb; return uTh > 0.0 ? max(c - uTh, 0.0) : c; }
      void main(){ vec3 c = S(vec2(0))*0.227; c += (S(uDir*1.38)+S(-uDir*1.38))*0.316; c += (S(uDir*3.23)+S(-uDir*3.23))*0.07; gl_FragColor = vec4(c, 1.0); }` });
  const compM = new THREE.ShaderMaterial({ uniforms: { tD: { value: main.texture }, tB1: { value: b1[0].texture }, tB2: { value: b2[0].texture }, uT: SU.uT, uRes: { value: new THREE.Vector2(1, 1) } }, vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tD, tB1, tB2; uniform float uT; uniform vec2 uRes; varying vec2 vUv;
      float h(float n){ return fract(sin(n)*43758.5453); }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      vec3 S(vec2 u){ return texture2D(tD,u).rgb + texture2D(tB1,u).rgb*1.1 + texture2D(tB2,u).rgb*1.6; }
      void main(){ vec2 c = vUv-0.5; vec2 k = c*(0.004 + 0.01*dot(c,c));
        vec3 col = vec3(S(vUv+k).r, S(vUv).g, S(vUv-k).b);
        col = aces(col*1.25);
        col *= 0.88 + 0.12*sin(vUv.y*uRes.y*1.5 + uT*8.0);
        col *= 0.95 + 0.05*h(floor(uT*24.0));
        col *= 0.93 + 0.07*smoothstep(0.0, 0.03, abs(fract(vUv.y*0.6 - uT*0.07)-0.5));
        col *= 1.0 - dot(c,c)*0.8; col += vec3(0.0, 0.012, 0.022);
        gl_FragColor = vec4(col, 1.0); }` });
  const pass = (m, t) => { pq.material = m; renderer.setRenderTarget(t); renderer.render(ps, pc); };
  function resize() { const w = W(), h = H(), pr = renderer.getPixelRatio(); renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h > 2 ? 50 : w / h > 1.2 ? 58 : 74; camera.updateProjectionMatrix(); RU.uPx.value = pr * Math.sqrt(1048576 / P) * (h / 900);
    main.setSize(w * pr, h * pr); b1.forEach((r) => r.setSize(w * pr / 4, h * pr / 4)); b2.forEach((r) => r.setSize(w * pr / 12, h * pr / 12)); compM.uniforms.uRes.value.set(w * pr, h * pr); }
  resize(); addEventListener("resize", resize, { signal });

  /* camera: yaw (the ring) + parallax from mouse or device tilt */
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { par.tx = (e.clientX / innerWidth - 0.5) * 0.7; par.ty = (e.clientY / innerHeight - 0.5) * 0.45; } }, { signal });
  addEventListener("deviceorientation", (e) => { if (e.gamma != null) { par.tx = Math.max(-1, Math.min(1, e.gamma / 30)) * 0.55; par.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.4; } }, { signal });
  let yaw = 0, vyaw = 0, drag = null, mode = "home", cur = -1, mixT = 0, spin = 0, burst = 0;
  const fwd = new THREE.Vector3(), coinC = new THREE.Vector3(), dummy = new THREE.Object3D();
  function placeCam() { camera.position.set(par.x * Math.cos(yaw), 0.2 - par.y, par.x * Math.sin(yaw)); fwd.set(Math.sin(yaw), 0, -Math.cos(yaw));
    camera.lookAt(camera.position.x + fwd.x * 5 + par.x * 0.3 * Math.cos(yaw), 0.2 - par.y * 0.5, camera.position.z + fwd.z * 5); camera.updateMatrixWorld(); }

  /* touch: drag stirs the fluid (and turns the ring at home, spins the coin when formed); a still tap picks */
  const el = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), lastP = new THREE.Vector3(), nowP = new THREE.Vector3();
  const rayAt = (x, y, out) => { ndc.set(x / W() * 2 - 1, 1 - y / H() * 2); ray.setFromCamera(ndc, camera); SU.uRay0.value.copy(ray.ray.origin); SU.uRayD.value.copy(ray.ray.direction); return ray.ray.at(6, out); };
  el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, lx: e.clientX, moved: 0 }; rayAt(e.clientX, e.clientY, lastP); el.setPointerCapture(e.pointerId);
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (x) { /* ignore */ } }, { signal });
  el.addEventListener("pointermove", (e) => { if (!drag) return; drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y));
    const dx = e.clientX - drag.lx; drag.lx = e.clientX;
    if (mode === "home") { vyaw = -dx / W() * 1.6; yaw += vyaw; } else spin += dx * 0.012;
    rayAt(e.clientX, e.clientY, nowP); SU.uStir.value.subVectors(nowP, lastP).multiplyScalar(4); SU.uStirOn.value = 1; lastP.copy(nowP); }, { signal });
  el.addEventListener("pointerup", (e) => { const d = drag; drag = null; SU.uStirOn.value = 0; if (!d || d.moved > 8 || mode !== "home") return; const i = pick(e.clientX, e.clientY); if (i >= 0) ctx.open(i); }, { signal });
  const v = new THREE.Vector3();
  function pick(x, y) { let best = -1, bd = 48 * 48; for (let i = 0; i < N; i++) { v.copy(centers[i]).project(camera); if (v.z > 1 || v.z < -1) continue;
    const d = ((v.x + 1) / 2 * W() - x) ** 2 + ((1 - v.y) / 2 * H() - y) ** 2; if (d < bd) { bd = d; best = i; } } return best; }

  /* the coin's point cloud: sampled from its own photo (density + relief follow the image), a lit rim, and a panel frame */
  const imgCache = new Map();
  const loadImg = (src) => { if (!imgCache.has(src)) imgCache.set(src, new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; })); return imgCache.get(src); };
  async function formCoin(i) {
    const f = flips[i], S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d", { willReadFrequently: true });
    const im = f.thumb ? await loadImg(f.thumb) : null; if (cur !== i) return;
    const hu = HUE[metalOf(f)] || HUE.unknown;
    if (im) { g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip(); g.drawImage(im, 0, 0, S, S); g.restore(); }
    else { g.fillStyle = `rgb(${hu.map((x) => x * 190 | 0)})`; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.fill(); g.fillStyle = "#000"; g.font = "bold 64px system-ui"; g.textAlign = "center"; g.fillText(String(ys[i] || "?"), S / 2, S / 2 + 22); }
    const d = g.getImageData(0, 0, S, S).data, D = sim.coinData, C = sim.coinCData, RAD = 1.05, TH = 0.07, wide = W() / H() > 1.2;
    for (let p = 0; p < P; p++) { const o = p * 4, s = Math.random(); let x, y;
      if (s > 0.9) { // the panel: a frame of light where the facts appear (below on a phone, to the right on wide screens)
        const pw = wide ? 2.4 : 3.4, ph = wide ? 3.2 : 1.6, cx = wide ? 3.6 : 0, cy = wide ? 0 : -3.1, e = Math.random() * 2 * (pw + ph);
        x = e < pw ? -pw / 2 + e : e < pw + ph ? pw / 2 : e < 2 * pw + ph ? pw / 2 - (e - pw - ph) : -pw / 2; y = e < pw ? ph / 2 : e < pw + ph ? ph / 2 - (e - pw) : e < 2 * pw + ph ? -ph / 2 : -ph / 2 + (e - 2 * pw - ph);
        D[o] = cx + x + gauss() * 0.01; D[o + 1] = cy + y + gauss() * 0.01; D[o + 2] = -0.3; C[o] = 1.2; C[o + 1] = 4.5; C[o + 2] = 6.0; continue; }
      if (s > 0.8) { const a = Math.random() * 6.2832; D[o] = Math.cos(a) * RAD; D[o + 1] = Math.sin(a) * RAD; D[o + 2] = (Math.random() - 0.5) * TH * 2.2; C[o] = hu[0] * 4; C[o + 1] = hu[1] * 4; C[o + 2] = hu[2] * 4; continue; }
      let k = 0, n = 0; do { do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; } while (x * x + y * y > 1);
        k = ((((1 - y) / 2 * (S - 1)) | 0) * S + (((x + 1) / 2 * (S - 1)) | 0)) * 4; } while (++n < 4 && Math.random() > 0.2 + (d[k] + d[k + 1] + d[k + 2]) / 765);
      const lum = (d[k] + d[k + 1] + d[k + 2]) / 765;
      D[o] = x * RAD; D[o + 1] = y * RAD; D[o + 2] = (s < 0.4 ? 1 : -1) * (TH + lum * 0.1);
      const m = 0.3, b = 1.6; C[o] = ((d[k] / 255) * (1 - m) + hu[0] * m) * b; C[o + 1] = ((d[k + 1] / 255) * (1 - m) + hu[1] * m) * b; C[o + 2] = ((d[k + 2] / 255) * (1 - m) + hu[2] * m) * b; }
    sim.coinT.needsUpdate = true; sim.coinC.needsUpdate = true; mode = "coin"; spin = 0; vyaw = 0;
    whoosh(); const t = coinTone(f); setTimeout(() => cur === i && ping(svc, t.freq, t.bright, 0, 0.16, 1.8), 1300);
  }
  function whoosh(out) { const a = audio(svc); if (!a) return; const n = a.sampleRate * 1.6, b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (let k = 0; k < n; k++) ch[k] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime; s.buffer = b; f.type = "bandpass"; f.Q.value = 7;
    f.frequency.setValueAtTime(out ? 2600 : 260, t); f.frequency.exponentialRampToValueAtTime(out ? 220 : 2800, t + 1.4); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.55);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); }

  let raf = 0, last = performance.now(), time = 0, frames = 0, fpsT = last, fps = 0;
  function loop(now) { raf = requestAnimationFrame(loop); const real = Math.min(0.25, (now - last) / 1000), dt = Math.min(0.05, real); last = now; time += dt;
    if (!drag && mode === "home") { yaw += vyaw; vyaw *= 0.95; yaw += dt * 0.015; }
    if (mode === "coin" && !drag) spin += dt * 0.3;
    par.x += (par.tx - par.x) * 0.06; par.y += (par.ty - par.y) * 0.06; placeCam();
    if (mode === "coin") { coinC.copy(camera.position).addScaledVector(fwd, 4.4); coinC.y += 0.35; dummy.position.copy(coinC); dummy.lookAt(camera.position); dummy.rotateY(spin); dummy.updateMatrixWorld(); SU.uCoinM.value.copy(dummy.matrixWorld); SU.uCoinC.value.copy(coinC); }
    mixT += ((mode === "coin" ? 1 : 0) - mixT) * Math.min(1, real * 1.1); SU.uMix.value = mixT;
    burst *= Math.pow(0.12, dt); SU.uBurst.value = burst;
    sim.step(dt, time); RU.tPos.value = sim.pos();
    renderer.setRenderTarget(main); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(scene, camera);
    const u = blurM.uniforms, w1 = b1[0].width, h1 = b1[0].height, w2 = b2[0].width, h2 = b2[0].height;
    u.tD.value = main.texture; u.uTh.value = 0.35; u.uDir.value.set(1 / w1, 0); pass(blurM, b1[1]);
    u.uTh.value = 0; u.tD.value = b1[1].texture; u.uDir.value.set(0, 1 / h1); pass(blurM, b1[0]);
    u.tD.value = b1[0].texture; u.uDir.value.set(1 / w2, 0); pass(blurM, b2[1]); u.tD.value = b2[1].texture; u.uDir.value.set(0, 1 / h2); pass(blurM, b2[0]);
    pass(compM, null);
    frames++; if (now - fpsT > 1000) { fps = frames; frames = 0; fpsT = now; } }
  raf = requestAnimationFrame(loop);
  ctx.hint(`${(P / 1e6).toFixed(1)}M simulated particles · drag to stir the light · tap a light to form that coin`);
  window.__holo = { warm(n) { for (let k = 0; k < n; k++) { time += 1 / 30; sim.step(1 / 30, time); } }, particles: P, fps: () => fps, mix: () => mixT, mode: () => mode };
  return {
    focus(i) { cur = i; formCoin(i); },
    blur() { if (mode === "coin") { whoosh(true); burst = 1.6; } mode = "home"; cur = -1; },
    unmount() { cancelAnimationFrame(raf); sim.dispose(); geo.dispose(); pmat.dispose(); blurM.dispose(); compM.dispose(); [main, ...b1, ...b2].forEach((r) => r.dispose()); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); delete window.__holo; }
  };
} });
