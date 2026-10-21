/* Titan Reliquary · 3D coin (TitanCoin3D). Grok, 2026-10-20.
   The coin page shows the coin as a real 3D object: a struck metal disc (three.js, vendored js/three.min.js) with
   physically based metal lighting from an environment tinted by the theme, a reeded edge, the photographed (or drawn)
   faces on both sides, and:
     - a flip-in when a coin opens (a spring settles it; skipped under reduced motion)
     - drag to tilt/spin with inertia; on release a spring settles it on the nearest face; a tap flips it over
     - a gentle tilt from the phone's motion sensor (iOS asks once, on the first touch of the coin)
     - a "Flat" button (44 px) returns to the flat photos; the choice is remembered (localStorage tr_coin3d_v1)
   Renders only while something moves (idle = zero GPU), caps pixel ratio at 2 and drops to 1 on a slow device,
   pauses while the page is hidden. No three.js / no WebGL: nothing changes. */
(() => {
  "use strict";
  const KEY = "tr_coin3d_v1";
  /* quality fallback (Grok 2026-10-20): a weak or data-saving device gets the light version of today's new effects. <html class="tr-lite">,
     window.TitanLite. Force with localStorage tr_lite_v1 = "1" / "0". */
  const LITE = (() => { try { const f = localStorage.getItem("tr_lite_v1"); if (f === "1") return true; if (f === "0") return false; } catch (e) { /* ignore */ }
    const n = navigator, c = n.connection || {}; return !!(c.saveData || (n.deviceMemory && n.deviceMemory <= 1) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2)); })();
  window.TitanLite = LITE; if (LITE) document.documentElement.classList.add("tr-lite");
  const T = window.THREE;
  if (!T) return;
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (e) { /* ignore */ }
  let R = null;   // the live view
  let lastTitle = null;
  /* shared element: remember the coin picture of the tile that was tapped, so the 3D coin can fly out of it */
  let lastTile = null;
  document.addEventListener("pointerdown", (e) => {
    const card = e.target && e.target.closest && e.target.closest("[data-scan]");
    const pic = card && card.querySelector("img, svg, .ph-slot, .gx-coin, .coin");
    if (pic) { const r = pic.getBoundingClientRect(); if (r.width > 8) lastTile = { r, t: performance.now() }; }
  }, { capture: true, passive: true });

  function buzz(ms) { try { if (!reduce.matches && navigator.vibrate && (!window.TitanUISounds || window.TitanUISounds.isEnabled())) navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  function cssVar(n, d) { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; }
  function metalOf(text) {
    const t = (text || "").toLowerCase();
    if (/cuni|cupro|nickel|copper-nickel|silver|\bag\b|steel|alumin(i)?um\b|\bal\b|\bni\b/.test(t) && !/bronze|brass/.test(t)) return { c: 0xdfe3e8, r: 0.28 };
    if (/gold|\bau\b/.test(t)) return { c: 0xf2c867, r: 0.26 };
    if (/brass|aluminum-bronze|aluminium-bronze|nordic gold/.test(t)) return { c: 0xe0c070, r: 0.32 };
    if (/copper|bronze|\bcu\b|zinc-plated copper|copper-plated/.test(t)) return { c: 0xd08a5c, r: 0.34 };
    return { c: 0xdfe3e8, r: 0.28 };   // silver, nickel, cupronickel, steel, aluminium
  }
  function envFor(renderer, accent) {
    const pm = new T.PMREMGenerator(renderer), sc = new T.Scene();
    const sky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true }));
    const g = sky.geometry, pos = g.attributes.position, col = [], a = new T.Color(accent), lo = new T.Color(0x0a0c10), hi = new T.Color(0xffffff);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; const c = y > 0 ? lo.clone().lerp(a, Math.min(1, y * 1.2)).lerp(hi, Math.max(0, y - 0.6) * 1.5) : lo.clone().lerp(a, 0.15 * (1 + y)); col.push(c.r, c.g, c.b); }
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); sc.add(sky);
    const panel = (x, y, z, w, h, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
    panel(-4, 5, 4, 5, 2, 3.2); panel(5, 2, 3, 1.2, 5, 2.2); panel(0, -2, -6, 8, 1, 0.8);
    const rt = pm.fromScene(sc, 0.03); pm.dispose(); return rt.texture;
  }
  function reedTex() {
    const c = document.createElement("canvas"); c.width = 512; c.height = 8; const x = c.getContext("2d");
    for (let i = 0; i < 512; i += 4) { x.fillStyle = "#8080ff"; x.fillRect(i, 0, 2, 8); x.fillStyle = "#c080ff"; x.fillRect(i + 2, 0, 1, 8); x.fillStyle = "#4080ff"; x.fillRect(i + 3, 0, 1, 8); }
    const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.set(2, 1); return t;
  }
  function faceTex(fig, label, metalHex, cb) {
    const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
    const base = "#" + metalHex.toString(16).padStart(6, "0");
    x.fillStyle = "#e8e8e8"; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * S / 2; x.strokeStyle = "rgba(" + (Math.random() < 0.5 ? "255,255,255" : "120,120,120") + ",0.06)"; x.beginPath(); x.arc(S / 2, S / 2, r, a, a + 0.4); x.stroke(); }
    const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.center.set(0.5, 0.5);
    const img = fig && fig.querySelector("img");
    const src = img && (img.currentSrc || img.src);
    if (src) {
      const im = new Image(); im.decoding = "async"; if (!/^(data|blob):/.test(src) && new URL(src, location.href).origin !== location.origin) im.crossOrigin = "anonymous";
      im.onload = () => { try { const s = Math.min(im.naturalWidth, im.naturalHeight); x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
        x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, S, S); x.restore(); tex.needsUpdate = true;
        // photo-derived relief: the photo's own shading becomes raised relief that relights as the coin turns
        try { const rl = window.TitanRelief && window.TitanRelief.derive(c, { size: LITE ? 256 : 384 }); if (rl) ret.relief = rl; } catch (e) { /* flat photo */ }
        cb && cb(true); } catch (e) { /* tainted: keep the struck blank */ } };
      const ret = { tex, photo: true }; im.src = src; return ret;
    }
    // drawn face: an engraved blank with a beaded border and the legend
    x.strokeStyle = "rgba(0,0,0,0.35)"; x.lineWidth = 10; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 18, 0, Math.PI * 2); x.stroke();
    x.fillStyle = "rgba(0,0,0,0.28)"; for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2; x.beginPath(); x.arc(S / 2 + Math.cos(a) * (S / 2 - 40), S / 2 + Math.sin(a) * (S / 2 - 40), 4, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = "rgba(20,16,10,0.55)"; x.textAlign = "center"; x.textBaseline = "middle";
    const words = String(label || "").split(/\s*·\s*/).filter(Boolean);
    x.font = "700 64px Georgia, serif"; x.fillText((words[1] || words[0] || "").slice(0, 14), S / 2, S / 2 - 20);
    x.font = "600 34px Georgia, serif"; x.fillText((words[0] || "").slice(0, 22), S / 2, S / 2 + 50);
    return { tex, photo: false };
  }

  const sig = (st) => [...st.querySelectorAll(".gxd-faces > figure, .gxd-face")].map((f) => { const i = f.querySelector("img"); return i ? i.getAttribute("src") : "svg"; }).join("|");
  /* Each theme's own 3D world around the coin: depth layers of particles that drift and parallax as the coin is turned or the
     phone tilts. [kind, colour, count, speed] kinds: rise (embers, bubbles), fall (snow, ash, petals), drift (dust, spores, stars), pixel */
  const WORLD = {
    afterhours: ["drift", 0xe8d9b0, 70, 0.04], conservator: ["drift", 0x9a7a4a, 50, 0.02], colossus: ["rise", 0xffa040, 80, 0.25],
    nocturne: ["drift", 0xcfa95f, 60, 0.05], odyssey: ["drift", 0xffd9a0, 60, 0.06], cursedwing: ["fall", 0xb03020, 60, 0.12],
    abyss: ["rise", 0x9ff0f6, 90, 0.18], neon: ["fall", 0x35e6ff, 90, 0.5], notepad: ["drift", 0x000000, 0, 0], construct: ["fall", 0x33ff66, 120, 0.7],
    xeno: ["drift", 0x55f5c6, 80, 0.08], solaris: ["drift", 0xffb52e, 90, 0.1], alchemist: ["rise", 0xdfb75a, 70, 0.12], glacier: ["fall", 0xffffff, 120, 0.15],
    valhalla: ["rise", 0xff8a30, 100, 0.3], dynasty: ["fall", 0xff5a5a, 50, 0.1], zen: ["fall", 0xf2b8c6, 40, 0.08], samadhi: ["rise", 0xffc78f, 60, 0.06],
    silkroad: ["drift", 0xe0b070, 90, 0.15], arcade: ["pixel", 0xffd23f, 60, 0.3], pulp: ["drift", 0xffffff, 40, 0.05], drafting: ["drift", 0xffffff, 50, 0.03],
    diorama: ["drift", 0xfff0d0, 40, 0.04], bauhaus: ["pixel", 0xb42416, 24, 0.05], terminal: ["drift", 0xffc43d, 40, 0.03], marbled: ["drift", 0x7a1f2b, 30, 0.02],
    cathedral: ["drift", 0xe9b44c, 70, 0.03], contour: ["drift", 0xffffff, 40, 0.03], banknote: ["drift", 0x1f5e43, 30, 0.02], freefall: ["fall", 0xffffff, 80, 0.6],
    sketch: ["drift", 0x333333, 30, 0.03], papercut: ["fall", 0xffffff, 30, 0.08], y2k: ["drift", 0xffffff, 70, 0.08], ferro: ["rise", 0x6fe7ff, 90, 0.12], lumen: ["drift", 0x3fe0ff, 90, 0.10], rift: ["rise", 0x6dff8a, 90, 0.12], horizon: ["drift", 0xffae5c, 80, 0.06], kintsugi: ["fall", 0xe2b25c, 50, 0.05], kaleido: ["drift", 0xee6fd6, 80, 0.06]
  };
  /* drawn on a cheap 2D canvas behind the WebGL coin (the coin itself still renders only while it moves) */
  function makeWorld(wrap, atmo, light, st) {
    const w = WORLD[atmo] || WORLD.afterhours; if (!w[2]) return null;
    const c = document.createElement("canvas"); c.className = "c3d-world"; c.setAttribute("aria-hidden", "true"); wrap.insertBefore(c, wrap.firstChild);
    const x = c.getContext("2d"), n = Math.round(w[2] * (LITE ? 0.4 : MOBILE ? 0.7 : 1)), P = [];
    for (let i = 0; i < n; i++) P.push({ x: Math.random(), y: Math.random(), z: 0.25 + Math.random() * 0.75, s: Math.random() * 100 });
    P.sort((a, b) => a.z - b.z);
    const col = "#" + w[1].toString(16).padStart(6, "0"), kind = w[0], v = w[3];
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, timer = 0, dead = false, cost = 0, frames = 0;
    function size() { dpr = Math.min(1.5, window.devicePixelRatio || 1); W = c.clientWidth; H = c.clientHeight; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    function draw(now) {
      raf = 0; if (dead) return; const c0 = performance.now(); const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.03); last = now; const t = now / 1000;
      if (c.width !== Math.round(c.clientWidth * dpr)) size();
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); x.fillStyle = col; x.globalCompositeOperation = light ? "source-over" : "lighter";
      const px = (st.yaw - st.ty) * 40 + st.tilt.x * 140, py = st.pitch * 50 + st.tilt.y * 120;
      for (const p of P) {
        if (!reduce.matches) {
          if (kind === "rise") { p.y -= v * dt * 0.25 * p.z; p.x += Math.sin(t * 0.7 + p.s) * 0.0004; if (p.y < -0.05) p.y = 1.05; }
          else if (kind === "fall") { p.y += v * dt * 0.25 * p.z; p.x += Math.sin(t * 0.9 + p.s) * 0.0005; if (p.y > 1.05) p.y = -0.05; }
          else if (kind === "drift") { p.x += Math.sin(t * 0.21 + p.s) * v * dt * 0.05; p.y += Math.cos(t * 0.17 + p.s) * v * dt * 0.05; }
        }
        const X = ((p.x * W + px * p.z) % W + W) % W, Y = ((p.y * H + py * p.z) % H + H) % H, r = (kind === "pixel" ? 2.5 : 1.6) * (0.5 + p.z);
        x.globalAlpha = (light ? 0.35 : 0.55) * (0.35 + p.z * 0.65) * (kind === "drift" ? 0.75 + 0.25 * Math.sin(t * 1.3 + p.s) : 1);
        if (kind === "pixel") x.fillRect(X, Y, r * 2, r * 2); else { x.beginPath(); x.arc(X, Y, r, 0, 6.283); x.fill(); }
      }
      // watchdog: a frame of the world costing > 4 ms (averaged) halves the particles; twice more and the world holds still
      cost = cost * 0.9 + (performance.now() - c0) * 0.1; frames++;
      if (frames > 30 && cost > 4) { frames = 0; cost = 0; if (P.length > 12) P.length = Math.floor(P.length / 2); else return; }
      if (!reduce.matches && !document.hidden) timer = setTimeout(() => { raf = requestAnimationFrame(draw); }, LITE ? 48 : 28);
    }
    size(); raf = requestAnimationFrame(draw);
    return { get n() { return P.length; }, poke() { if (!raf && !timer) raf = requestAnimationFrame(draw); }, wake() { clearTimeout(timer); timer = 0; if (!raf) raf = requestAnimationFrame(draw); },
      dispose() { dead = true; cancelAnimationFrame(raf); clearTimeout(timer); c.remove(); } };
  }
  const MOBILE = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent || "");

  function build(stage) {
    destroy();
    const faces = stage.querySelectorAll(".gxd-faces > figure, .gxd-face");
    if (!faces.length) return;
    const drawer = stage.closest("#drawer-body") || document;
    const title = (drawer.querySelector(".gxd-head h2") || {}).textContent || "";
    const sub = (drawer.querySelector(".gxd-head p, .gxd-sub") || {}).textContent || "";
    const mdt = [...drawer.querySelectorAll("dt, th")].find((d) => /metal|composition/i.test(d.textContent));
    const metal = metalOf(mdt && mdt.nextElementSibling ? mdt.nextElementSibling.textContent.slice(0, 80) : "");
    const wrap = document.createElement("div"); wrap.className = "c3d-wrap";
    wrap.innerHTML = '<canvas class="c3d-canvas" aria-label="3D coin: drag to turn it, tap to flip it over" role="img"></canvas>' +
      '<div class="c3d-hint" aria-hidden="true">Drag to turn · tap to flip</div><div class="c3d-row"><button type="button" class="c3d-toggle" data-no-uisound aria-pressed="true">Flat photos</button>' +
      (window.TitanSpatial ? '<button type="button" class="c3d-toggle c3d-ar" data-no-uisound>On your table (AR)</button>' : "") + "</div>";
    stage.insertBefore(wrap, stage.firstChild);
    const canvas = wrap.querySelector("canvas");
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: !LITE, alpha: true, powerPreference: "low-power" }); } catch (e) { wrap.remove(); return; }
    stage.classList.add("c3d-on");
    let dpr = Math.min(LITE ? 1.25 : 2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0, 4.4);
    const accent = cssVar("--gold", "#d4af37");
    scene.environment = envFor(renderer, accent);
    const key = new T.DirectionalLight(0xffffff, 0.6); key.position.set(-2, 3, 4); scene.add(key);
    const rake = new T.PointLight(0xfff2dc, LITE ? 0.9 : 1.3, 12, 1.6); rake.position.set(-2.4, 1.6, 2.2); scene.add(rake);   // a low raking light that follows the tilt, so the relief reads
    const geo = new T.CylinderGeometry(1, 1, 0.11, 128, 1, false);
    const rim = new T.MeshStandardMaterial({ color: metal.c, metalness: 1, roughness: metal.r + 0.08, normalMap: reedTex(), normalScale: new T.Vector2(0.9, 0.9) });
    const applyRelief = (f, m) => { if (!f.relief || m.normalMap) return; const mk = (cv, srgb) => { const t = new T.CanvasTexture(cv); if (srgb) t.encoding = T.sRGBEncoding; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.anisotropy = 4; return t; };
      m.normalMap = mk(f.relief.normal); m.normalScale = new T.Vector2(1.2, 1.2); m.roughnessMap = mk(f.relief.rough); m.roughness = 1; m.metalness = 0.6; m.envMapIntensity = 1.6; m.needsUpdate = true; R && (R.relief = (R.relief || 0) + 1); };
    const f1 = faceTex(faces[0], title + " · " + sub, metal.c, () => { applyRelief(f1, top); kick(); }), f2 = faceTex(faces[1] || faces[0], title + " · " + sub, metal.c, () => { applyRelief(f2, bot); kick(); });
    const fm = (f) => new T.MeshStandardMaterial({ map: f.tex, metalness: f.photo ? 0.5 : 1, roughness: f.photo ? 0.45 : metal.r, color: f.photo ? 0xffffff : metal.c, envMapIntensity: 1.3 });
    const top = fm(f1), bot = fm(f2);
    // cylinder caps face +Y/-Y: stand the coin up so its faces look at the camera
    const coin = new T.Mesh(geo, [rim, top, bot]); coin.rotation.x = Math.PI / 2;
    const pivot = new T.Group(); pivot.add(coin); scene.add(pivot);
    // cap UVs run sideways in three: turn both faces upright
    f1.tex.rotation = Math.PI / 2; f2.tex.rotation = Math.PI / 2;
    const atmo = document.documentElement.dataset.atmo || "afterhours";
    const light = getComputedStyle(document.documentElement).getPropertyValue("--scheme").trim() === "light";
    let world = null;
    const shadow = new T.Mesh(new T.CircleGeometry(1.15, 48), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.position.set(0, 0, -0.6); scene.add(shadow);

    // physics state: yaw (spin, flips between faces) + pitch (tilt), each a damped spring with velocity
    const s = { yaw: 0, vy: 0, ty: 0, pitch: 0, vp: 0, tp: 0, sc: 1, vs: 0, tilt: { x: 0, y: 0 }, drag: null, raf: 0, last: 0, slow: 0 };
    if (!reduce.matches && lastTitle !== title) { s.yaw = -Math.PI * 3; s.sc = 0.55; s.pitch = 0.5; }   // flip-in once per coin
    lastTitle = title;
    if (!f1.photo && f2.photo) { s.yaw += Math.PI; s.ty = Math.PI; }   // only the back is photographed: show the photo first, not the drawn blank
    function size() { const w = wrap.clientWidth || 320, h = Math.round(Math.min(340, Math.max(220, w * 0.72))); canvas.style.height = h + "px"; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    size();
    world = makeWorld(wrap, atmo, light, s);
    if (lastTile && performance.now() - lastTile.t < 1500 && !reduce.matches && canvas.animate) {
      const from = lastTile.r; lastTile = null;
      requestAnimationFrame(() => { const to = canvas.getBoundingClientRect(); if (!to.width) return;
        const sc = Math.max(0.08, Math.min(from.width, from.height) / Math.min(to.width, to.height));
        const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
        canvas.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: 0.7 }, { transform: "none", opacity: 1 }],
          { duration: 560, easing: "cubic-bezier(.2,.9,.25,1.12)" }); });
    }
    function frame(now) {
      // Springs run on wall-clock time in fixed 1/120 s sub-steps, so a slow or busy frame never slows the motion down
      // (the old single 50 ms-capped step made flips take several times longer on a loaded device and land late).
      s.raf = 0; const el = Math.min(0.25, s.last ? (now - s.last) / 1000 : 0.016); s.last = now;
      const n = Math.max(1, Math.ceil(el * 120)), dt = el / n;
      if (!s.drag) for (let i = 0; i < n; i++) {
        const k = 38, d = 9.5;
        s.vy += ((s.ty - s.yaw) * k - s.vy * d) * dt; s.yaw += s.vy * dt;
        s.vp += ((s.tp + s.tilt.y - s.pitch) * k - s.vp * d) * dt; s.pitch += s.vp * dt;
      }
      s.vs += ((1 - s.sc) * 60 - s.vs * 11) * dt; s.sc += s.vs * dt;
      pivot.rotation.set(s.pitch, s.yaw + s.tilt.x, 0); pivot.scale.setScalar(s.sc);
      rake.position.set(-2.4 + s.tilt.x * 9 - s.vy * 0.05, 1.6 - s.tilt.y * 8, 2.2);
      shadow.scale.setScalar(s.sc * (1 - Math.abs(Math.sin(s.yaw)) * 0.5)); shadow.position.x = Math.sin(s.yaw) * 0.12;
      if (!s.drag && s.armLand && Math.abs(s.ty - s.yaw) < 0.04) { s.armLand = false; buzz(6); }
      const t0 = performance.now(); renderer.render(scene, cam);
      /* no auto-downscale: assume a capable GPU (Joseph); quality comes from TitanQuality */
      const moving = s.drag || Math.abs(s.vy) + Math.abs(s.vp) + Math.abs(s.vs) > 0.002 || Math.abs(s.ty - s.yaw) + Math.abs(s.tp + s.tilt.y - s.pitch) + Math.abs(1 - s.sc) > 0.001;
      if (moving && !document.hidden) s.raf = requestAnimationFrame(frame);
      else s.last = 0;
    }
    function kick() { if (!s.raf) s.raf = requestAnimationFrame(frame); }
    function settle() { const n = Math.round(s.ty / Math.PI) * Math.PI; s.ty = n; s.tp = 0; }
    function flip() { buzz(10); s.armLand = true; s.ty = Math.round(s.ty / Math.PI) * Math.PI + Math.PI; /* from the face it is heading to, not where it is mid-spin: a flip during the flip-in used to land on the same face */ s.vy += 3; kick(); try { window.TitanUISounds && window.TitanUISounds.play("flip"); } catch (e) { /* ignore */ } }
    let motionAsked = false;
    function askMotion() {
      if (motionAsked) return; motionAsked = true;
      const DOE = window.DeviceOrientationEvent;
      const listen = () => window.addEventListener("deviceorientation", onTilt, { passive: true });
      if (DOE && typeof DOE.requestPermission === "function") DOE.requestPermission().then((r) => { if (r === "granted") listen(); }).catch(() => {});
      else if (DOE) listen();
    }
    let base = null;
    function onTilt(e) {
      if (reduce.matches || e.beta == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      s.tilt.x = Math.max(-0.35, Math.min(0.35, (e.gamma - base.g) / 90)); s.tilt.y = Math.max(-0.3, Math.min(0.3, (e.beta - base.b) / 110)); kick();
    }
    canvas.addEventListener("pointerdown", (e) => {
      askMotion(); canvas.setPointerCapture(e.pointerId);
      s.drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() }; s.vy = s.vp = 0; kick();
    });
    canvas.addEventListener("pointermove", (e) => {
      const d = s.drag; if (!d) return; const now = performance.now(), dx = e.clientX - d.lx, dy = e.clientY - d.ly, dt = Math.max(1, now - d.lt) / 1000;
      d.moved += Math.abs(dx) + Math.abs(dy); s.yaw += dx * 0.012; s.pitch = Math.max(-0.9, Math.min(0.9, s.pitch + dy * 0.008));
      s.vy = dx * 0.012 / dt; s.vp = dy * 0.008 / dt; d.lx = e.clientX; d.ly = e.clientY; d.lt = now; kick();
      if (d.moved > 8) e.preventDefault();
    });
    const up = () => {
      const d = s.drag; if (!d) return; s.drag = null;
      if (d.moved < 8 && performance.now() - d.t < 350) { flip(); return; }
      s.ty = s.yaw + s.vy * 0.35; settle(); kick();   // inertia carries it, then the spring lands it on a face
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.style.touchAction = "pan-y";
    const tog = wrap.querySelector(".c3d-toggle");
    tog.addEventListener("click", () => { setOn(false); });
    const arb = wrap.querySelector(".c3d-ar");
    if (arb) arb.addEventListener("click", () => {
      const m = /coin=([^&]+)/.exec(location.hash); const key = m ? decodeURIComponent(m[1]) : null; const sp = window.TitanSpatial; if (!key || !sp) return;
      buzz(12); sp.open(key, "flip");
      let n = 0; (function wait() { const st = sp._debug && sp._debug.state(); if (st && st.open && st.built) { sp.exportAR(); return; } if (++n < 40) setTimeout(wait, 150); })();
    });
    const ro = window.ResizeObserver ? new ResizeObserver(() => { size(); kick(); }) : null; if (ro) ro.observe(wrap);
    const vis = () => { if (!document.hidden) { kick(); if (world) world.wake(); } }; document.addEventListener("visibilitychange", vis);
    R = { world: () => world, sig: sig(stage), stage, wrap, renderer, ro, vis, onTilt, s, flip, dispose() {
      cancelAnimationFrame(s.raf); if (world) world.dispose(); if (ro) ro.disconnect(); document.removeEventListener("visibilitychange", vis); window.removeEventListener("deviceorientation", onTilt);
      geo.dispose(); [rim, top, bot].forEach((m) => { if (m.map) m.map.dispose(); if (m.normalMap) m.normalMap.dispose(); if (m.roughnessMap) m.roughnessMap.dispose(); m.dispose(); });
      if (scene.environment) scene.environment.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
      wrap.remove(); stage.classList.remove("c3d-on");
    } };
    kick();
  }
  function destroy() { if (R) { const r = R; R = null; r.dispose(); } }
  function flatButton(stage) {
    if (stage.querySelector(".c3d-flatbar")) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "c3d-toggle c3d-flatbar"; b.setAttribute("data-no-uisound", ""); b.textContent = "View in 3D";
    b.addEventListener("click", () => { b.remove(); setOn(true); });
    stage.insertBefore(b, stage.firstChild);
  }
  function setOn(v) {
    on = !!v; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
    const st = document.querySelector("#drawer-body .gxd-stage"); if (!st) return;
    if (on) { const fb = st.querySelector(".c3d-flatbar"); if (fb) fb.remove(); build(st); } else { destroy(); flatButton(st); }
  }
  function scan() {
    const st = document.querySelector("#drawer-body .gxd-stage");
    if (R && (!st || R.stage !== st || !document.body.contains(R.stage))) destroy();
    if (R && R.stage === st && R.sig !== sig(st)) { destroy(); }
    if (!st || (R && R.stage === st)) return;
    if (on) build(st); else flatButton(st);
  }
  let pend = 0;
  function boot() {
    const body = document.getElementById("drawer-body"); if (!body) return;
    new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; scan(); }); }).observe(body, { childList: true, subtree: true });
    scan();
  }
  window.addEventListener("titan:ui", (e) => { if (e.detail && e.detail.kind === "coin-close") { destroy(); lastTitle = null; } });
  window.addEventListener("titan:atmo", () => { const st = R && R.stage; if (st) { destroy(); if (on) build(st); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.TitanCoin3D = { isOn: () => on, setOn, active: () => !!R, state: () => (R ? { yaw: R.s.yaw, target: R.s.ty, pitch: R.s.pitch, scale: R.s.sc, world: R.world() ? R.world().n : 0, relief: R.relief || 0 } : null), worlds: () => Object.keys(WORLD), flip: () => { if (R) R.flip(); } };
})();
