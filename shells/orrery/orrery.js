/* Orrery (Experimental UI, Grok exp worker, 2026-10-20). Your collection as a working brass orrery.
   The sun is today. Every decade is an orbit: the older a coin, the farther out it circles and the slower it goes (Kepler's
   third law, so the inner, recent coins whip round while the 1800s crawl). Each coin is a real lit metal disc wearing its own
   photo; continents set where on the orbit a coin starts. A disc of dust (600k GPU points, shared fx/ curl noise) drifts with
   the orbits. Drag to swing round it, pinch or scroll to zoom, the clock button sets how fast time runs. Tap a coin: time
   stops, the camera flies to it and the coin turns to face you while its sourced facts rise.
   Contract via shells/exp/kit.js. Shared: window.THREE, shells/exp/post.js (HDR bloom), fx/ (TitanFXK.NOISE GLSL, TitanFXK.ptr). */
const THREE = window.THREE; if (!THREE) throw new Error("three.js not loaded");
import { xpMount, yearOf, metalOf, ping, coinTone, esc } from "../exp/kit.js";
import { createPost } from "../exp/post.js";
const FXK = window.TitanFXK || {};
const NOISE = FXK.NOISE || "float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }\nfloat vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\nfloat fbm(vec2 p){ float s = 0., a = .5; for (int i=0;i<5;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }\nfloat fbm3(vec2 p){ float s = 0., a = .5; for (int i=0;i<3;i++){ s += a*vn(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= .5; } return s; }\nvec2 curl(vec2 p, float t){ float e = .02; float n1 = fbm3(p+vec2(0,e)+t), n2 = fbm3(p-vec2(0,e)+t), n3 = fbm3(p+vec2(e,0)+t), n4 = fbm3(p-vec2(e,0)+t); return vec2(n1-n2, -(n3-n4))/(2.*e); }\n";
const CONT = ["Europe", "North America", "South America", "Asia", "Africa", "Oceania"];
const RIM = { gold: 0xe8c060, silver: 0xd8dde4, copper: 0xc07040, base: 0xb8bcb0, unknown: 0xb0a890 };

export const mount = (root, svc) => xpMount(root, svc, { id: "orrery", title: "ORRERY", hint: "Drag to swing round · pinch to zoom · tap a coin", stage: async (ctx) => {
  const { flips, stageEl, signal } = ctx, N = flips.length, NOW = 2026;
  const W = () => stageEl.clientWidth || innerWidth, H = () => stageEl.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); stageEl.appendChild(renderer.domElement);
  const post = createPost(renderer, { exposure: 1.15, vignette: 0.75, bloom: 1.0, tint: [0.004, 0.003, 0.006] });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, 0.05, 400);

  /* orbits: one per decade; radius grows with age (sqrt keeps the 1800s on screen); anything before 1800 gets the outer "deep time" orbit */
  const ys = flips.map(yearOf), decOf = (y) => (y == null ? null : Math.floor(y / 10) * 10);
  const decades = [...new Set(ys.filter((y) => y != null && y >= 1800).map(decOf))].sort((a, b) => b - a);
  const rOf = (y) => (y == null ? 1.35 : y < 1800 ? 11.5 : 2.0 + 1.55 * Math.sqrt(Math.max(0, NOW - decOf(y) - 5) / 10));
  const deep = ys.some((y) => y != null && y < 1800), undated = ys.some((y) => y == null);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.32, emissive: 0x2a1c08, emissiveIntensity: 0.6 });
  const ringGroup = new THREE.Group(); scene.add(ringGroup);
  const tiltOf = (r) => ({ x: Math.sin(r * 3.1) * 0.05, z: Math.cos(r * 2.3) * 0.05 });
  const orbitRadii = [...decades.map((d) => rOf(d + 5)), ...(deep ? [rOf(1500)] : [])];
  orbitRadii.forEach((r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012 + r * 0.0012, 8, 220), brass); t.rotation.x = Math.PI / 2 + tiltOf(r).x; t.rotation.y = tiltOf(r).z; ringGroup.add(t); });
  // armillary meridians: two tall brass hoops and a base arm, so it reads as an instrument rather than a diagram
  [0, Math.PI / 2].forEach((a) => { const m = new THREE.Mesh(new THREE.TorusGeometry(orbitRadii[orbitRadii.length - 1] + 0.6, 0.03, 8, 260, Math.PI), brass); m.rotation.y = a; ringGroup.add(m); });

  /* the sun: today. Boiling plasma from the shared fx/ fbm noise, bright enough to bloom */
  const sunU = { uT: { value: 0 } };
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.75, 96, 64), new THREE.ShaderMaterial({ uniforms: sunU,
    vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: NOISE + `uniform float uT; varying vec3 vN; varying vec3 vP;
      void main(){ vec2 q = vec2(atan(vP.z, vP.x)*1.6, vP.y*2.6); float n = fbm(q*2.2 + vec2(uT*0.05, -uT*0.03)); float g = fbm(q*6.0 - n*2.0 + uT*0.1);
        float rim = pow(1.0 - abs(dot(vN, vec3(0,0,1))), 2.0);
        vec3 c = mix(vec3(1.0,0.35,0.05), vec3(1.0,0.85,0.45), g) * (2.2 + 2.5*n) + vec3(1.0,0.5,0.15)*rim*3.0; gl_FragColor = vec4(c, 1.0); }` }));
  scene.add(sun);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial(), color: 0xffaa55, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 })); halo.scale.set(5, 5, 1); scene.add(halo);
  const sunL = new THREE.PointLight(0xffd9a0, 3.2, 0, 1.2); scene.add(sunL); scene.add(new THREE.AmbientLight(0x404858, 0.55));
  const fill = new THREE.PointLight(0xfff2e0, 0, 0, 1); scene.add(fill);   // a lamp over your shoulder when you hold a coin
  const rimL = new THREE.DirectionalLight(0x8fb4ff, 0.6); rimL.position.set(-5, 8, -6); scene.add(rimL);
  function radial() { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,200,120,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

  /* coins: real lit discs wearing their photos; orbit speed follows Kepler (omega ~ r^-1.5) */
  // where on its orbit a coin starts: the circle is shared out between continents by how many coins each has, so the busy ones spread out
  const cOrder = flips.map((f, i) => i).sort((a, b) => ((CONT.indexOf(flips[a].continent) + 7) % 7 - (CONT.indexOf(flips[b].continent) + 7) % 7) || ((ys[a] || 0) - (ys[b] || 0)));
  const startAng = new Float32Array(N); cOrder.forEach((i, k) => { startAng[i] = (k / N) * Math.PI * 2 * 7.0 + (Math.random() - 0.5) * 0.04; });
  const loader = new THREE.TextureLoader(), coinGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.028, 48);
  const coins = flips.map((f, i) => {
    const r = rOf(ys[i]);
    const rim = new THREE.MeshStandardMaterial({ color: RIM[metalOf(f)] || RIM.unknown, metalness: 1, roughness: 0.28 });
    const face = new THREE.MeshStandardMaterial({ color: f.thumb ? 0xffffff : (RIM[metalOf(f)] || RIM.unknown), metalness: 0.55, roughness: 0.38 });
    if (f.thumb) loader.load(f.thumb, (t) => { t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2; t.encoding = THREE.sRGBEncoding; face.map = t; face.needsUpdate = true; });
    const m = new THREE.Mesh(coinGeo, [rim, face, face]); m.userData.i = i;
    const piv = new THREE.Group(); piv.add(m); scene.add(piv);
    return { m, piv, r, a0: startAng[i], w: 0.9 / Math.pow(r, 1.5), y: (Math.random() - 0.5) * 0.18, tilt: tiltOf(r), lift: 0, spin: Math.random() * 6 };
  });

  /* orbital dust: 600k points in Keplerian rotation, displaced by the shared fx/ curl noise; touch lights the dust near the finger */
  const DN = Math.round(500000 * (+(new URLSearchParams(location.search).get("orrDust")) || 1)),   /* ?orrDust= only for CPU-rendered review shots */
    dpos = new Float32Array(DN * 3), dseed = new Float32Array(DN);
  const rMax = orbitRadii[orbitRadii.length - 1] + 1;
  for (let k = 0; k < DN; k++) { const r = 1.2 + Math.pow(Math.random(), 0.75) * rMax, a = Math.random() * 6.2832; dpos[k * 3] = r; dpos[k * 3 + 1] = a; dpos[k * 3 + 2] = (Math.random() - 0.5) * (0.05 + r * 0.03); dseed[k] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dpos, 3)); dg.setAttribute("seed", new THREE.BufferAttribute(dseed, 1)); dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  const DU = { uClock: { value: 0 }, uT: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uTouch: { value: new THREE.Vector3(0, 0, -1) } };
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: DU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: NOISE + `attribute float seed; uniform float uClock, uT, uPx; uniform vec3 uTouch; varying vec3 vC;
      void main(){ float r = position.x, a = position.y + uClock * 0.9 / pow(r, 1.5);
        vec3 p = vec3(cos(a)*r, position.z, sin(a)*r);
        vec2 cu = curl(p.xz*0.35, uT*0.02); p.xz += cu*0.12; p.y += (fbm3(p.xz*0.8 + uT*0.03)-0.5)*0.12;
        float near = uTouch.z > 0.0 ? exp(-dot(p.xz-uTouch.xy, p.xz-uTouch.xy)*1.2) : 0.0;
        float heat = exp(-r*0.35); vC = mix(vec3(0.35,0.42,0.6), vec3(1.0,0.62,0.3), heat) * (0.05 + 0.1*seed) + vec3(0.6,0.8,1.0)*near*0.5;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uPx*(1.0 + seed*1.5)*(4.0/max(0.5,-mv.z)) + 0.5; }`,
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord-0.5; float d = dot(q,q)*4.0; if (d>1.0) discard; gl_FragColor = vec4(vC*(1.0-d), 1.0); }" }));
  dust.frustumCulled = false; scene.add(dust);
  // a far starfield so the instrument floats in space
  const SN = 20000, sp = new Float32Array(SN * 3); for (let k = 0; k < SN; k++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, sq = Math.sqrt(1 - u * u), R = 120 + Math.random() * 80, v = { x: sq * Math.cos(th) * R, y: u * R, z: sq * Math.sin(th) * R }; sp.set([v.x, v.y, v.z], k * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9aa6c0, size: 0.9, sizeAttenuation: false })));

  /* decade labels: HTML, projected onto each orbit's near edge */
  const labs = document.createElement("div"); labs.className = "orr-labs"; stageEl.appendChild(labs);
  const labList = [...decades.map((d) => ({ t: d + "s", r: rOf(d + 5) })), ...(deep ? [{ t: "before 1800", r: rOf(1500) }] : []), { t: "today", r: 0 }]
    .filter((L, k, a) => k === 0 || k === a.length - 1 || Math.abs(L.r - a[k - 1].r) > 0.45 || /0s$/.test(L.t) && +L.t.slice(0, 4) % 50 === 0)
    .map((L) => { const e = document.createElement("span"); e.textContent = L.t; labs.appendChild(e); return { ...L, e }; });

  /* camera: orbit around the instrument; starts with a sweep in from overhead */
  const cam = { az: 0.1, el: 0.9, d: rMax * 2.2, taz: 0.55, tel: 0.42, td: rMax * 1.55, look: new THREE.Vector3(), tlook: new THREE.Vector3() };
  function resize() { const w = W(), h = H(), pr = renderer.getPixelRatio(); renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : w / h > 2 ? 34 : 42; camera.updateProjectionMatrix(); post.resize(w, h, pr);
    if (!focusI && focusI !== 0) cam.td = rMax * (w / h < 0.8 ? 2.1 : 1.45); }
  let focusI = null; resize(); addEventListener("resize", resize, { signal });
  const el = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), pts = new Map();
  let drag = null;
  el.addEventListener("pointerdown", (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: 0, d0: null }; }, { signal });
  el.addEventListener("pointermove", (e) => { const p = pts.get(e.pointerId); if (!p || !drag) { touchAt(e.clientX, e.clientY); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (drag.d0) cam.td = Math.min(rMax * 4, Math.max(1.2, cam.td * drag.d0 / d)); drag.d0 = d; return; }
    cam.taz += dx * 0.006; cam.tel = Math.max(0.08, Math.min(1.45, cam.tel + dy * 0.005)); touchAt(e.clientX, e.clientY); }, { signal });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size) return; const d = drag; drag = null; if (d && d.moved < 8) tap(e.clientX, e.clientY); };
  el.addEventListener("pointerup", up, { signal }); el.addEventListener("pointercancel", up, { signal });
  el.addEventListener("wheel", (e) => { e.preventDefault(); cam.td = Math.min(rMax * 4, Math.max(1.2, cam.td * Math.exp(e.deltaY * 0.001))); }, { signal, passive: false });
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function touchAt(x, y) { ndc.set(x / W() * 2 - 1, 1 - y / H() * 2); ray.setFromCamera(ndc, camera); if (ray.ray.intersectPlane(plane, hit)) DU.uTouch.value.set(hit.x, hit.z, 1); }
  function tap(x, y) { ndc.set(x / W() * 2 - 1, 1 - y / H() * 2); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(coins.map((c) => c.m)); let i = hits.length ? hits[0].object.userData.i : -1;
    if (i < 0) { let bd = 44 * 44; const v = new THREE.Vector3(); coins.forEach((c, k) => { c.m.getWorldPosition(v); v.project(camera); if (v.z > 1) return; const d = ((v.x + 1) / 2 * W() - x) ** 2 + ((1 - v.y) / 2 * H() - y) ** 2; if (d < bd) { bd = d; i = k; } }); }
    if (i >= 0) ctx.open(i); }

  /* time: how fast the orrery runs; tap the clock to cycle */
  const SPEEDS = [0, 0.25, 1, 4], clockB = document.createElement("button"); let sp_i = 2; clockB.type = "button"; clockB.className = "orr-clock";
  const syncClock = () => { clockB.textContent = ["⏸ Stopped", "▶ Slow", "▶ Running", "⏩ Fast"][sp_i]; clockB.setAttribute("aria-label", "Orrery speed: " + clockB.textContent.slice(2)); };
  syncClock(); clockB.addEventListener("click", () => { sp_i = (sp_i + 1) % SPEEDS.length; syncClock(); }, { signal }); stageEl.appendChild(clockB);

  let raf = 0, last = performance.now(), time = 0, clock = 0, speed = 1;
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), fp = new THREE.Vector3();
  function loop(now) { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (svc.coverOpen() && !document.querySelector('.shell-pick:not([hidden])')) return;   // the coin page is on top: rest the GPU
    time += dt;
    speed += ((focusI != null ? 0 : SPEEDS[sp_i]) - speed) * Math.min(1, dt * 6); clock += dt * speed * 0.35;
    sunU.uT.value = time; DU.uClock.value = clock; DU.uT.value = time; sun.rotation.y = time * 0.05;
    coins.forEach((c, i) => { const a = c.a0 + clock * c.w;
      c.piv.position.set(Math.cos(a) * c.r, c.y + Math.sin(a) * c.tilt.x * c.r, Math.sin(a) * c.r);
      const sel = i === focusI, s = sel ? 2.2 : 1; c.lift += ((sel ? 0.7 : 0) - c.lift) * Math.min(1, dt * 8); c.piv.position.y += c.lift; c.m.scale.x += (s - c.m.scale.x) * Math.min(1, dt * 9); c.m.scale.y = c.m.scale.z = c.m.scale.x;
      if (sel) { q.setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, c.piv.position, camera.up)); c.piv.quaternion.slerp(q, Math.min(1, dt * 10)); c.m.rotation.set(-Math.PI / 2, 0, 0); }
      else { c.m.rotation.set(0.35, 0, 0.2); c.piv.rotation.set(0, -a + time * 0.0, 0); c.m.rotation.y = c.spin + time * 0.4; } });
    if (focusI != null) { const c = coins[focusI]; c.piv.getWorldPosition(fp); cam.tlook.copy(fp); }
    else cam.tlook.set(0, 0, 0);
    if (!drag && focusI == null) cam.taz += dt * 0.02;
    const kk = 1 - Math.pow(0.0015, dt);   // frame-rate independent ease: a fly-to settles in about 0.6 s
    cam.az += (cam.taz - cam.az) * kk; cam.el += (cam.tel - cam.el) * kk; cam.d += (cam.td - cam.d) * kk; cam.look.lerp(cam.tlook, kk);
    camera.position.set(cam.look.x + Math.cos(cam.el) * Math.sin(cam.az) * cam.d, cam.look.y + Math.sin(cam.el) * cam.d, cam.look.z + Math.cos(cam.el) * Math.cos(cam.az) * cam.d);
    camera.lookAt(cam.look); fill.position.copy(camera.position).add(new THREE.Vector3(0, 0.6, 0)); fill.intensity += ((focusI != null ? 0.8 : 0) - fill.intensity) * 0.08;
    if (focusI != null && innerWidth / innerHeight < 1) { camera.setViewOffset(W(), H(), 0, H() * 0.22, W(), H()); } else camera.clearViewOffset();
    const w = W(), h = H();
    labList.forEach((L) => { v.set(Math.sin(cam.az) * L.r, 0, Math.cos(cam.az) * L.r).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && focusI == null;
      L.e.style.opacity = vis ? "1" : "0"; if (vis) L.e.style.transform = `translate3d(${((v.x + 1) / 2 * w) | 0}px,${((1 - v.y) / 2 * h) | 0}px,0) translate(-50%,-140%)`; });
    post.render(scene, camera, time, 0.9); }
  raf = requestAnimationFrame(loop);
  window.__orrery = { orbits: orbitRadii.length, dust: DN, dustFull: 500000, warm(n) { for (let k = 0; k < n; k++) loop(performance.now()); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, focus: () => focusI };
  ctx.hint(`${orbitRadii.length} orbits, one per decade · older coins circle farther out and slower · tap a coin`);
  return {
    focus(i) { focusI = i; cam.td = 2.6; cam.tel = 0.25; const t = coinTone(flips[i]); ping(svc, t.freq, t.bright, 0, 0.15, 1.6); },
    blur() { focusI = null; resize(); cam.tel = 0.42; },
    unmount() { cancelAnimationFrame(raf); post.dispose(); scene.traverse((o) => { o.geometry && o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map && x.map.dispose(); x.dispose(); }); }); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); delete window.__orrery; }
  };
} });
