/* Titan Reliquary · signature experiences (TitanSig). Grok, 2026-10-20.
   THE CONTRACT (the only thing every world must keep; everything else - layout, navigation, metaphor, camera - is the theme's own):
     1. any coin reachable in a couple of steps   2. its sourced facts + provenance viewable (ctx.facts(scan))
     3. always a way back / home (the ✕, Escape)   4. a mute control (the ♪ button)   5. search (the ⌕ button)
   The shell draws only those three controls; a world can hide its title/hint HUD with def.hud = false.
   A theme can register a full-screen 3D world you move through to browse the collection (zen: stones in a raked garden,
   arcade: a claw machine, construct: a floating data-space, neon: a lit vault wall, notepad: a flippable notebook...).
   Core supplies: the overlay + canvas (three.js, vendored js/three.min.js), coin textures from the gallery thumbnails, a camera
   that flies (eased, interruptible), tap picking, drag, a custom post-processing pass per theme (one full-screen shader over a
   render target: bloom / scanlines / ink bleed / ripples), an animated intro, adaptive music (levels and tempo follow scroll
   and selection through TitanGen) and spatial sound (stereo-panned, depth-pitched cues through TitanGen.uiBus()).
   Picking a coin flies the camera to it, then opens its coin page (#coin=SCAN).
   Lite mode (window.TitanLite): fewer coins, pixel ratio 1, no post pass. Reduced motion: no intro, cuts instead of flights.
   Theme modules live in wings/signature/<id>.js and load on demand. API: TitanSig.register(id, def), .open(id), .close(), .has(id). */
(() => {
  "use strict";
  const T = window.THREE;
  const DEFS = {}, AVAIL = [];   // themes with a module in wings/signature/ (loaded on demand); each theme commit adds its id
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const lite = () => window.TitanLite === true;
  let X = null;   // the live experience

  function canGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
  function loadModule(id) {
    if (DEFS[id]) return Promise.resolve(DEFS[id]);
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = "wings/signature/" + id + ".js?v=" + (window.TITAN_BUILD || "");
      s.onload = () => (DEFS[id] ? res(DEFS[id]) : rej(new Error("no def"))); s.onerror = rej; document.head.appendChild(s); });
  }
  function coins(n) {
    const f = (window.vault && window.vault.flips) || [];
    const withPic = f.filter((c) => c.thumb), rest = f.filter((c) => !c.thumb);
    return withPic.concat(rest).slice(0, n);
  }
  /* ---- textures: the gallery thumbnail cropped to a disc, cached per scan ---- */
  const texCache = new Map();
  function coinTex(c, opts) {
    const key = c.scan + (opts && opts.square ? ":sq" : "");
    if (texCache.has(key)) return texCache.get(key);
    const S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S; const x = cv.getContext("2d");
    const g = x.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S / 2); g.addColorStop(0, "#f4f4f4"); g.addColorStop(1, "#8a8a8a");
    x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 6.283); x.fill();
    x.fillStyle = "rgba(0,0,0,0.6)"; x.textAlign = "center"; x.font = "700 40px Georgia, serif"; x.fillText(String(c.year || ""), S / 2, S / 2 + 6);
    x.font = "600 22px Georgia, serif"; x.fillText(String(c.country || "").slice(0, 16), S / 2, S / 2 + 40);
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
    if (c.thumb) { const im = new Image(); im.onload = () => { const s = Math.min(im.naturalWidth, im.naturalHeight); x.clearRect(0, 0, S, S); x.save();
        if (!(opts && opts.square)) { x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 6.283); x.clip(); }
        x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, S, S); x.restore(); t.needsUpdate = true; }; im.src = c.thumb; }
    texCache.set(key, t); return t;
  }
  /* ---- sound: spatial cues + adaptive layers ---- */
  function bus() { try { return window.TitanGen && window.TitanGen.uiBus ? window.TitanGen.uiBus() : null; } catch (e) { return null; } }
  function cue(freq, pan, depth, kind) {
    const b = bus(); if (!b || !b.ctx) return; const c = b.ctx, t = c.currentTime + 0.01;
    try {
      const p = c.createStereoPanner ? c.createStereoPanner() : null, g = c.createGain(), o = c.createOscillator(), lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 7000 / (1 + (depth || 0) * 0.6);        // further away = darker
      o.type = kind || "sine"; o.frequency.setValueAtTime(freq / (1 + (depth || 0) * 0.08), t);
      const pk = 0.05 / (1 + (depth || 0) * 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(lp); lp.connect(g); if (p) { p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(b.input); } else g.connect(b.input);
      o.start(t); o.stop(t + 0.4);
    } catch (e) { /* ignore */ }
  }
  const music = {
    base: null,
    enter() { const G = window.TitanGen; if (!G) return; this.base = 1; try { G.setLevels(1.15, 0.75); } catch (e) { /* ignore */ } },
    motion(speed) { const G = window.TitanGen; if (!G) return; const k = Math.min(1, Math.abs(speed));   // moving: music lifts and quickens a touch
      try { G.setLevels(1.15 + k * 0.25, 0.75 - k * 0.2); if (G.setMusicTempo) G.setMusicTempo(1 + k * 0.08); } catch (e) { /* ignore */ } },
    select() { const G = window.TitanGen; if (!G) return; try { if (G.duck) G.duck(4, 1400); } catch (e) { /* ignore */ } },
    leave() { const G = window.TitanGen; if (!G) return; try { G.setLevels(1, 1); if (G.setMusicTempo) G.setMusicTempo(1); } catch (e) { /* ignore */ } }
  };

  /* ---- the overlay ---- */
  function open(id) {
    if (X) close(true);
    if (!T || !canGL()) return Promise.resolve(false);
    return loadModule(id).then((def) => { start(id, def); return true; }).catch(() => false);
  }
  function start(id, def) {
    const root = document.createElement("div"); root.id = "sig"; root.className = "sig sig-" + id; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", def.label);
    root.innerHTML = '<canvas class="sig-canvas" aria-hidden="true"></canvas><div class="sig-hud"><div class="sig-title"></div><div class="sig-hint"></div><div class="sig-pick" aria-live="polite"></div></div>' +
      '<div class="sig-ctl"><button type="button" class="sig-btn sig-search" aria-label="Search the collection">⌕</button><button type="button" class="sig-btn sig-mute" aria-pressed="false" aria-label="Mute sound">♪</button>' +
      '<button type="button" class="sig-btn sig-close" aria-label="Leave ' + def.label + '">✕</button></div><div class="sig-intro" aria-hidden="true"></div>' +
      '<aside class="sig-facts" hidden aria-live="polite"><button type="button" class="sig-btn sig-facts-x" aria-label="Close facts">✕</button><div class="sig-facts-body"></div></aside>';
    document.body.appendChild(root); document.documentElement.classList.add("sig-open");
    if (def.hud === false) root.querySelector(".sig-hud").classList.add("sig-hud-off");
    const muteB = root.querySelector(".sig-mute");
    const syncMute = () => { const m = window.TitanLofi && window.TitanLofi.isMuted ? window.TitanLofi.isMuted() : false; muteB.setAttribute("aria-pressed", m ? "true" : "false"); muteB.textContent = m ? "🔇" : "♪"; muteB.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound"); };
    muteB.addEventListener("click", () => { if (window.TitanLofi && window.TitanLofi.setMuted) window.TitanLofi.setMuted(!window.TitanLofi.isMuted()); syncMute(); }); syncMute();
    root.querySelector(".sig-search").addEventListener("click", () => { close(); const b = document.getElementById("btn-search"); if (b) b.click(); });
    const factsEl = root.querySelector(".sig-facts");
    root.querySelector(".sig-facts-x").addEventListener("click", () => { factsEl.hidden = true; });
    root.querySelector(".sig-title").textContent = def.label; root.querySelector(".sig-hint").textContent = def.hint || "Drag to move · tap a coin";
    const canvas = root.querySelector("canvas");
    const renderer = new T.WebGLRenderer({ canvas, antialias: !lite(), powerPreference: "high-performance" });
    const dpr = Math.min(lite() ? 1 : 2, window.devicePixelRatio || 1); renderer.setPixelRatio(dpr);
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 1, 0.05, 200);
    const ctx = { T, id, def, root, canvas, renderer, scene, camera, lite: lite(), reduce: reduce.matches, coins: coins(lite() ? (def.liteCount || 18) : (def.count || 40)),
      tex: coinTex, cue, music, pickables: [], t: 0, look: new T.Vector3(), fly: null, pickHud: root.querySelector(".sig-pick"), state: {} };
    ctx.flyTo = (pos, look, dur, done) => {
      if (ctx.reduce || !dur) { camera.position.copy(pos); ctx.look.copy(look); camera.lookAt(ctx.look); if (done) done(); return; }
      ctx.fly = { p0: camera.position.clone(), l0: ctx.look.clone(), p1: pos.clone(), l1: look.clone(), t: 0, dur, done };
    };
    // post pass: scene -> render target -> one full-screen theme shader
    let rt = null, postScene = null, postCam = null, postMat = null;
    if (def.post && !ctx.lite) {
      rt = new T.WebGLRenderTarget(2, 2, { type: T.UnsignedByteType }); rt.texture.encoding = T.sRGBEncoding;
      postMat = new T.ShaderMaterial({ uniforms: Object.assign({ tDiffuse: { value: rt.texture }, uTime: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uPulse: { value: 0 } }, def.postUniforms || {}),
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }", fragmentShader: def.post, depthTest: false, depthWrite: false });
      postScene = new T.Scene(); postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
    }
    ctx.post = postMat;
    function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      if (rt) { rt.setSize(Math.round(w * dpr), Math.round(h * dpr)); postMat.uniforms.uRes.value.set(w * dpr, h * dpr); } if (def.resize) def.resize(ctx, w, h); }
    def.enter(ctx); size(); camera.lookAt(ctx.look);
    // intro moment
    const intro = root.querySelector(".sig-intro");
    if (!ctx.reduce && def.intro) { root.classList.add("sig-intro-on"); def.intro(ctx, intro); setTimeout(() => root.classList.remove("sig-intro-on"), def.introMs || 1600); }
    music.enter();
    // input
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    let drag = null, speed = 0;
    canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; if (def.press) def.press(ctx, e); });
    canvas.addEventListener("pointermove", (e) => { if (!drag) { if (def.hover) def.hover(ctx, e); return; } const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      speed = Math.min(1, (Math.abs(dx) + Math.abs(dy)) / 40); if (def.drag) def.drag(ctx, dx, dy, e); });
    const up = (e) => { if (!drag) return; const moved = Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0), quick = performance.now() - drag.t < 400; drag = null;
      if (def.release) def.release(ctx, e);
      if (moved < 10 && quick) { v2.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera);
        const hit = ray.intersectObjects(ctx.pickables, true)[0]; let o = hit && hit.object; while (o && !o.userData.coin) o = o.parent;
        if (o) choose(o); else if (def.tap) def.tap(ctx, e, ray); } };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", () => { drag = null; });
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); speed = Math.min(1, Math.abs(e.deltaY) / 120); if (def.drag) def.drag(ctx, 0, -e.deltaY * 0.5, e); }, { passive: false });
    function choose(o) {
      const c = o.userData.coin; music.select();
      const wp = new T.Vector3(); o.getWorldPosition(wp); const sp = wp.clone().project(camera);
      cue(880, sp.x, Math.max(0, camera.position.distanceTo(wp) - 2) * 0.2, "triangle"); try { if (navigator.vibrate && !ctx.reduce) navigator.vibrate(12); } catch (e) { /* ignore */ }
      ctx.pickHud.textContent = [c.country, c.year, c.denom].filter(Boolean).join(" · ");
      const go = () => { close(); location.hash = "coin=" + encodeURIComponent(c.scan); };
      if (def.choose) def.choose(ctx, o, go); else { const n = (def.focusOffset ? def.focusOffset(ctx, o) : new T.Vector3(0, 0, 1.6)); ctx.flyTo(wp.clone().add(n), wp, 0.9, () => setTimeout(go, 150)); }
    }
    ctx.choose = choose;
    /* contract 2: the coin's own sourced facts, each with who checked it, when, and the source (links kept) */
    ctx.facts = (scan) => {
      const br = window.__galleryBridge; const body = factsEl.querySelector(".sig-facts-body"); factsEl.hidden = false; body.textContent = "Loading…";
      const p = br && br.ensureDetail ? br.ensureDetail(scan) : Promise.resolve(null);
      return Promise.resolve(p).then((c) => {
        c = c || (br && br.findCard ? br.findCard(scan) : null); if (!c) { body.textContent = "No record."; return null; }
        const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
        const rows = Object.entries(c.certainty || {}).filter(([, v]) => v && v.source).map(([k, v]) =>
          `<li><b>${esc(k)}</b> · ${esc(v.level)}${v.by ? " · " + esc(v.by) : ""}${v.ts ? " · " + esc(v.ts) : ""}<br><span>${esc(v.source)}</span>${(v.links || []).map((u) => /^https?:/.test(u) ? ` <a href="${esc(u)}" target="_blank" rel="noopener">source ↗</a>` : "").join("")}</li>`).join("");
        body.innerHTML = `<h3>${esc(c.label || c.scan)}</h3><p>${esc(c.metal || "")}${c.diameter_mm ? " · " + esc(c.diameter_mm) + " mm" : ""}</p>` +
          (c.story ? `<p>${esc(c.story)}</p>` : "") + (rows ? `<h4>Where each fact comes from</h4><ul>${rows}</ul>` : "<p>No sourced facts recorded yet.</p>") +
          `<p><a href="#coin=${encodeURIComponent(c.scan)}" class="sig-open-coin">Open the full coin page</a></p>`;
        body.querySelector(".sig-open-coin").addEventListener("click", () => close());
        return c;
      });
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    root.querySelector(".sig-close").addEventListener("click", () => close());
    window.addEventListener("resize", size);
    // loop
    let raf = 0, last = 0, slow = 0, frames = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame); if (document.hidden) { last = 0; return; }
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now; ctx.t += dt;
      if (ctx.fly) { const f = ctx.fly; f.t += dt / f.dur; const k = f.t >= 1 ? 1 : 1 - Math.pow(1 - f.t, 3);
        camera.position.lerpVectors(f.p0, f.p1, k); ctx.look.lerpVectors(f.l0, f.l1, k); if (f.t >= 1) { ctx.fly = null; if (f.done) f.done(); } }
      speed *= Math.exp(-dt * 2.5); if ((frames++ & 7) === 0) music.motion(speed);
      if (def.frame) def.frame(ctx, dt, ctx.t, speed);
      camera.lookAt(ctx.look);
      const c0 = performance.now();
      if (rt) { postMat.uniforms.uTime.value = ctx.t; renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam); }
      else renderer.render(scene, camera);
      if (performance.now() - c0 > 14 && ++slow > 40 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); size(); slow = 0; }
    }
    raf = requestAnimationFrame(frame);
    X = { id, ctx, dispose() {
      cancelAnimationFrame(raf); window.removeEventListener("resize", size); document.removeEventListener("keydown", onKey);
      if (def.leave) def.leave(ctx);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { if (mm.map && !mm.map.userData.shared) mm.map.dispose(); mm.dispose(); }); });
      if (rt) { rt.dispose(); postMat.dispose(); }
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
      root.remove(); document.documentElement.classList.remove("sig-open"); music.leave();
    } };
    try { window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } })); } catch (e) { /* ignore */ }
  }
  function close() {
    if (!X) return; const x = X; X = null; x.dispose();
    texCache.forEach((t) => t.dispose()); texCache.clear();
    try { window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } })); } catch (e) { /* ignore */ }
  }
  /* ---- launcher: an "Enter ..." button in the Gallery header for themes with a signature experience ---- */
  function launcher() {
    const atmo = document.documentElement.dataset.atmo, head = document.querySelector("#pane-gallery .wing-head");
    let b = document.getElementById("sig-enter");
    if (!head || AVAIL.indexOf(atmo) < 0 || !T || !canGL()) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "sig-enter"; b.className = "sig-enter";
      b.addEventListener("click", () => open(document.documentElement.dataset.atmo)); head.appendChild(b); }
    const names = { notepad: "Open the notebook", construct: "Enter the data-space", zen: "Walk the stone garden", neon: "Light the vault wall", arcade: "Play the claw machine" };
    b.textContent = (names[atmo] || "Enter the world") + " →";
  }
  window.addEventListener("titan:atmo", () => setTimeout(launcher, 50));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(launcher, 300)); else setTimeout(launcher, 300);
  window.TitanSig = { register(id, def) { DEFS[id] = def; }, open, close, has: (id) => AVAIL.indexOf(id) >= 0, available: () => AVAIL.slice(), isOpen: () => !!X, ctx: () => (X ? X.ctx : null) };
})();
