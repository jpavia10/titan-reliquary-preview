/* Titan Reliquary - TitanFX: GPU overlay engine.
   One full-screen WebGL2 canvas (pointer-events:none, aria-hidden) draws cinematic overlays written as fragment shaders and
   GPU-instanced particles. Presets register themselves from wings/fx/presets.js.

   API (window.TitanFX)
     play(id, {intensity, film, tint})  start a preset by id (crossfades from the previous one). `id` may be a composite,
                                        e.g. "embers+snow". Also accepts an alias registered with alias().
     stop(fadeSec)                      fade everything out and release GL resources.
     setIntensity(v)                    user master intensity 0..1 (multiplies every preset's own intensity).
     setLevel("off"|"subtle"|"full")    off stops, subtle = half strength and no film, full = everything.
     setFilm(v)                         film finishing layer 0..1 (grain, vignette, gate weave, halation).
     playVideo(src, {blend, opacity})   optional pre-rendered looping webm/mp4 overlay (mix-blend-mode: screen); silent no-op if missing.
     register(id, def) / alias(id, spec) / presets() / supported / owns() / stats() / state()
   Events: listens to "titan:thunder" ({detail:{delay, strength}}) -> lightning flash on presets that use it.
           dispatches "titan:fx" ({detail:{type, preset}}).
   Quality: DPR capped at 1.5 (setDprCap), render scale + layer quality adapt from the first 2 s of measured frame cost
   (> 12 ms -> step down). Pauses (visual only) when the tab is hidden; reduced motion = one static frame. */
(function () {
  "use strict";
  if (window.TitanFX && window.TitanFX.register) return;
  var prevFX = window.TitanFX;   // app.js already exposes a TitanFX object (canvasLoop, clear, matrixRain...): extend it, never replace it

  var LS = "titan.fx.v1", LSQ = "titan.fx.q.v1";
  var BUDGET_MS = 12, CAL_MS = 2000, FPS_CAP = 62;
  var LADDER = [[1, 3], [0.85, 2], [0.7, 2], [0.6, 1], [0.5, 1], [0.42, 0]];   // [render scale, quality 0..3]

  var presets = {}, aliases = {};
  var cfg = { level: "full", intensity: 0.8, film: 0.5, dprCap: 1.5 };
  try { var sv = JSON.parse(localStorage.getItem(LS) || "{}"); for (var k in sv) if (k in cfg) cfg[k] = sv[k]; } catch (e) { /* storage blocked */ }
  var qMem = {};
  try { qMem = JSON.parse(localStorage.getItem(LSQ) || "{}") || {}; } catch (e) { qMem = {}; }
  function save() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }
  function saveQ() { try { localStorage.setItem(LSQ, JSON.stringify(qMem)); } catch (e) { /* ignore */ } }

  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduced = !!(rmq && rmq.matches);

  /* ---------- support probe (one throwaway context, released at once) ---------- */
  var support = null;
  function probe() {
    if (support !== null) return support;
    support = false;
    try {
      var c = document.createElement("canvas"), g = c.getContext("webgl2");
      if (g) { support = true; var ext = g.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); }
    } catch (e) { support = false; }
    return support;
  }

  /* ---------- state ---------- */
  var canvas = null, gl = null, vao = null, parallel = null;
  var layers = [];            // active preset layers (each {id, def, passes[], fade, target, intensity, ...})
  var filmLayer = null;       // finishing layer
  var want = null;            // {id, intensity, film, tint} last request (survives context loss)
  var raf = 0, running = false, lastDraw = 0, tStart = 0, tPause = 0, frozenT = 0;
  var scaleStep = 0, cal = null, wd = { n: 0, sum: 0, t: 0 };
  var live = { programs: 0, created: 0, deleted: 0 };
  var flash = { t0: -9, strokes: null, x: 0, seed: 0 }, extThunder = 0, thunderTimer = 0, boltTimer = 0;
  var theme = { bg: [0.1, 0.09, 0.08], ink: [0.9, 0.85, 0.75], acc: [0.8, 0.65, 0.3], light: 0 };
  var videoEl = null, videoMap = {};
  var fadeMs = 1400, forced = null;

  /* ---------- theme colours (read from the CSS tokens of the active atmosphere/World) ---------- */
  var probeEl = null;
  function cssColor(varName, fb) {
    try {
      if (!probeEl) { probeEl = document.createElement("span"); probeEl.setAttribute("aria-hidden", "true"); probeEl.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden"; document.documentElement.appendChild(probeEl); }
      probeEl.style.color = ""; probeEl.style.color = "var(" + varName + ")";
      var m = getComputedStyle(probeEl).color.match(/[\d.]+/g);
      if (m && m.length >= 3) return [m[0] / 255, m[1] / 255, m[2] / 255];
    } catch (e) { /* ignore */ }
    return fb;
  }
  function readTheme() {
    var bg = cssColor("--bg", theme.bg), ink = cssColor("--ink", theme.ink), acc = cssColor("--gold", theme.acc);
    theme = { bg: bg, ink: ink, acc: acc, light: bg[0] * 0.2126 + bg[1] * 0.7152 + bg[2] * 0.0722 > 0.45 ? 1 : 0 };
  }

  /* ---------- GL helpers ---------- */
  var PRELUDE_COMMON =
    "#version 300 es\nprecision highp float;\nprecision highp int;\n" +
    "uniform vec2 uRes; uniform float uTime, uInt, uQ, uScale, uFade, uLight, uFlash, uStatic, uFilm;\n" +
    "uniform vec3 uBg, uInk, uAcc, uBolt, uTint;\n" +
    "#define PI 3.14159265\n" +
    "float h11(float p){ return fract(sin(p*127.1+31.7)*43758.5453); }\n" +
    "float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }\n" +
    "vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))))*43758.5453); }\n" +
    "float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\n" +
    "float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }\n" +
    "float fbmQ(vec2 p, int n){ float a=.5, s=0.; for(int i=0;i<6;i++){ if(i>=n) break; s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }\n" +
    "vec3 hsv(float h, float s, float v){ vec3 k=clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.); return v*mix(vec3(1.),k,s); }\n";
  var VS_FULL = "#version 300 es\nvoid main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }\n";
  var FS_MAIN = "\nout vec4 outColor;\nvoid main(){ outColor = fx(gl_FragCoord.xy) * uFade; }\n";
  var FS_MAIN_I = "\nout vec4 outColor;\nvoid main(){ outColor = fxi() * uFade; }\n";
  var FS_HEAD_I = "#version 300 es\nprecision highp float;\nuniform float uFade, uLight, uInt, uQ, uTime, uFlash; uniform vec3 uBg, uInk, uAcc, uTint;\nin vec4 vA; in vec2 vQ;\n";

  function compile(type, src, label) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  }
  function mkProgram(vs, fs, label) {
    var p = gl.createProgram(), a = compile(gl.VERTEX_SHADER, vs), b = compile(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    live.programs++; live.created++;
    var rec = { p: p, a: a, b: b, label: label, ok: null, u: {} };
    return rec;
  }
  function progStatus(rec) {
    if (rec.ok !== null) return rec.ok;
    if (parallel && !gl.getProgramParameter(rec.p, parallel.COMPLETION_STATUS_KHR)) return null;
    rec.ok = !!gl.getProgramParameter(rec.p, gl.LINK_STATUS);
    if (!rec.ok) {
      try {
        console.warn("TitanFX: shader '" + rec.label + "' failed: " + (gl.getShaderInfoLog(rec.a) || "") + (gl.getShaderInfoLog(rec.b) || "") + (gl.getProgramInfoLog(rec.p) || ""));
      } catch (e) { /* ignore */ }
    }
    gl.detachShader(rec.p, rec.a); gl.detachShader(rec.p, rec.b); gl.deleteShader(rec.a); gl.deleteShader(rec.b);
    return rec.ok;
  }
  function delProgram(rec) { try { gl.deleteProgram(rec.p); } catch (e) { /* ignore */ } live.programs--; live.deleted++; }
  function uloc(rec, name) {
    var u = rec.u;
    if (!(name in u)) u[name] = gl.getUniformLocation(rec.p, name);
    return u[name];
  }

  function buildPasses(def) {
    var out = [];
    (def.passes || []).forEach(function (ps, i) {
      var rec;
      if (ps.frag) rec = mkProgram(VS_FULL, PRELUDE_COMMON + (def.glsl || "") + ps.frag + FS_MAIN, def.id + "#" + i);
      else rec = mkProgram(ps.vert.indexOf("#version") === 0 ? ps.vert : PRELUDE_COMMON + ps.vert, FS_HEAD_I + ps.ifrag + FS_MAIN_I, def.id + "#" + i);
      rec.pass = ps; out.push(rec);
    });
    return out;
  }

  /* ---------- layers ---------- */
  function makeLayer(def, intensity, tint) {
    return { id: def.id, def: def, passes: buildPasses(def), fade: 0, target: 1, intensity: intensity, tint: tint || null, born: performance.now() };
  }
  function killLayer(l) { l.passes.forEach(delProgram); l.passes = []; l.dead = true; }
  function pruneLayers(force) {
    layers = layers.filter(function (l) { if (l.dead) return false; if (l.target === 0 && (l.fade <= 0.004 || force)) { killLayer(l); return false; } return true; });
  }

  function resolve(id) {
    var out = [];
    (function expand(spec, w, depth) {
      String(spec).split("+").forEach(function (part) {
        var m = part.trim().split("*"), pid = m[0].trim(), ww = (m[1] ? parseFloat(m[1]) : 1) * w;
        if (!isFinite(ww)) ww = w;
        if (presets[pid]) out.push({ def: presets[pid], w: ww });
        else if (aliases[pid] && depth < 3) expand(aliases[pid], ww, depth + 1);
      });
    })(aliases[id] || id, 1, 0);
    return out.slice(0, 3);     // at most 3 stacked presets: each is a full-screen pass
  }

  /* ---------- canvas / context ---------- */
  function ensureGL() {
    if (gl && !gl.isContextLost()) return true;
    if (!probe()) return false;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "titan-fx"; canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:7;opacity:0;transition:opacity .6s ease;contain:strict";
      canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (e.target !== canvas) return; stopLoop(); layers.forEach(function (l) { l.passes = []; }); layers = []; filmLayer = null; live.programs = 0; gl = null; });
      canvas.addEventListener("webglcontextrestored", function () { /* handled by ensure on next play */ });
      document.body.appendChild(canvas);
    }
    try {
      gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: "default" });
    } catch (e) { gl = null; }
    if (!gl) return false;
    parallel = gl.getExtension("KHR_parallel_shader_compile");
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.DITHER); gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return true;
  }
  function lostRecover() {
    if (gl && gl.isContextLost()) { gl = null; layers = []; filmLayer = null; live.programs = 0; if (want) play(want.id, want.opts); }
  }

  var cw = 0, ch = 0, curScale = 1;
  function sizeCanvas() {
    if (!canvas || !gl) return;
    var dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap || 1.5);
    var step = LADDER[Math.min(scaleStep, LADDER.length - 1)];
    var vw = window.innerWidth, vh = window.innerHeight;
    curScale = dpr * step[0];
    var w = Math.max(2, Math.round(vw * curScale)), h = Math.max(2, Math.round(vh * curScale));
    if (w !== cw || h !== ch) { canvas.width = w; canvas.height = h; cw = w; ch = h; }
  }
  var rzT = 0;
  function onResize() { clearTimeout(rzT); rzT = setTimeout(function () { sizeCanvas(); if (!running) drawOnce(); }, 150); }

  /* ---------- lightning ---------- */
  function strike(strength, delay) {
    clearTimeout(thunderTimer);
    thunderTimer = setTimeout(function () {
      var now = performance.now() / 1000, s = Math.max(0.3, Math.min(1.3, strength || 1));
      var second = 0.07 + Math.random() * 0.12;
      flash = { t0: now, x: (Math.random() - 0.5) * 1.1, seed: Math.random() * 100,
        strokes: [[0, 1.0 * s, 0.07], [second, 0.55 * s, 0.06], [second + 0.12 + Math.random() * 0.15, 0.85 * s, 0.16], [0.05, 0.28 * s, 0.55]] };
    }, Math.max(0, delay || 0));
  }
  function flashValue(now) {
    if (!flash.strokes) return [0, 0];
    var t = now - flash.t0, sum = 0, bolt = 0;
    if (t > 2.2) { flash.strokes = null; return [0, 0]; }
    for (var i = 0; i < flash.strokes.length; i++) {
      var s = flash.strokes[i], dt = t - s[0];
      if (dt < 0) continue;
      var v = s[1] * Math.min(1, dt / 0.012) * Math.exp(-dt / s[2]);
      sum += v; if (i < 3) bolt = Math.max(bolt, v);
    }
    return [Math.min(1.4, sum), Math.min(1, bolt * 1.4)];
  }
  function scheduleSelf() {
    clearTimeout(boltTimer);
    var any = layers.some(function (l) { return l.def.lightning && l.target > 0; });
    if (!any || reduced) return;
    boltTimer = setTimeout(function () {
      if (!document.hidden && !(performance.now() - extThunder < 60000)) strike(0.8 + Math.random() * 0.5, 0);
      scheduleSelf();
    }, 6000 + Math.random() * 12000);
  }
  window.addEventListener("titan:thunder", function (e) {
    extThunder = performance.now();
    var d = (e && e.detail) || {};
    if (reduced || document.hidden) return;
    if (layers.some(function (l) { return l.def.lightning && l.target > 0; })) strike(d.strength == null ? 1 : d.strength, d.delay || 0);
  });

  /* ---------- drawing ---------- */
  function setCommon(rec, l, tNow, fade, fl) {
    var set1 = function (n, v) { var u = uloc(rec, n); if (u !== null) gl.uniform1f(u, v); };
    var set3 = function (n, a, b, c) { var u = uloc(rec, n); if (u !== null) gl.uniform3f(u, a, b, c); };
    var q = LADDER[Math.min(scaleStep, LADDER.length - 1)][1];
    var tint = (l && l.tint) || null;
    var u = uloc(rec, "uRes"); if (u !== null) gl.uniform2f(u, cw, ch);
    set1("uTime", tNow); set1("uQ", q); set1("uScale", curScale); set1("uFade", fade);
    set1("uLight", theme.light); set1("uFlash", fl[0]); set1("uStatic", reduced ? 1 : 0);
    set3("uBg", theme.bg[0], theme.bg[1], theme.bg[2]); set3("uInk", theme.ink[0], theme.ink[1], theme.ink[2]);
    var a = tint || theme.acc; set3("uAcc", a[0], a[1], a[2]);
    set3("uTint", a[0], a[1], a[2]);
    set3("uBolt", flash.x, fl[1], flash.seed);
  }
  function drawLayer(l, tNow, fl) {
    var ready = true;
    for (var i = 0; i < l.passes.length; i++) if (progStatus(l.passes[i]) === null) { ready = false; break; }
    if (!ready) return false;
    var eff = l.intensity * userGain() * (l.def.gain || 1) * (1 - 0.3 * theme.light);   // light atmospheres: dark text on a pale ground has little contrast to spare
    for (i = 0; i < l.passes.length; i++) {
      var rec = l.passes[i];
      if (!rec.ok) continue;
      gl.useProgram(rec.p);
      setCommon(rec, l, tNow, Math.max(0, Math.min(1, l.fade)), fl);
      var ui = uloc(rec, "uInt"); if (ui !== null) gl.uniform1f(ui, eff);
      var uf = uloc(rec, "uFilm"); if (uf !== null) gl.uniform1f(uf, (l.film == null ? 0 : l.film) * (1 - 0.55 * theme.light));
      var ps = rec.pass;
      if (ps.vert) {
        var q = LADDER[Math.min(scaleStep, LADDER.length - 1)][1];
        var n = Math.max(1, Math.round(ps.count[Math.min(3, q)] * (0.3 + 0.7 * Math.min(1, eff))));
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      } else gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return true;
  }
  function userGain() { return cfg.level === "subtle" ? cfg.intensity * 0.5 : cfg.intensity; }
  function filmAmount() { return cfg.level === "full" ? cfg.film : 0; }

  var frameCost = [];
  function render(now, measure) {
    if (!gl || gl.isContextLost()) return;
    var tNow = reduced ? (frozenT || 14) : (now - tStart) / 1000;
    var fl = reduced ? [0, 0] : flashValue(now / 1000);
    gl.viewport(0, 0, cw, ch);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var t0 = performance.now(), drawn = false;
    for (var i = 0; i < layers.length; i++) { if (drawLayer(layers[i], tNow, fl)) drawn = true; }
    if (filmLayer) { filmLayer.film = filmAmount(); filmLayer.intensity = 1; if (drawLayer(filmLayer, tNow, fl)) drawn = true; }
    if (measure && drawn) {
      var px = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // forces the GPU to finish: honest per-frame cost
      if (cal && cal.skip) cal.skip--; else frameCost.push(performance.now() - t0);
    }
    return drawn;
  }

  function startCal() { cal = { t0: performance.now(), win: performance.now() }; frameCost = []; }
  function evalCal(now) {
    if (!cal) return;
    var n = frameCost.length;
    var slow = n && frameCost[n - 1] > BUDGET_MS * 6;      // one very slow frame is enough to act (software GL, old phones)
    if (!slow && (now - cal.win < 380 || n < 4)) { if (now - cal.t0 > CAL_MS + 1500 && n) finishCal(); return; }
    var s = frameCost.slice().sort(function (a, b) { return a - b; }), med = s[s.length >> 1];
    frameCost = []; cal.win = now;
    if (med > BUDGET_MS && scaleStep < LADDER.length - 1) { scaleStep++; sizeCanvas(); frameCost = []; cal.skip = 1; }
    else finishCal();
  }
  function finishCal() { if (want) { qMem[want.id] = scaleStep; saveQ(); } cal = null; }
  function watchdog(dt) {
    wd.n++; wd.sum += dt; wd.t += dt;
    if (wd.t > 2500) {
      var avg = wd.sum / wd.n; wd.n = 0; wd.sum = 0; wd.t = 0;
      if (avg > 30 && scaleStep < LADDER.length - 1) { scaleStep++; sizeCanvas(); if (want) { qMem[want.id] = scaleStep; saveQ(); } }
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = now - lastDraw;
    if (dt < 1000 / FPS_CAP - 1.5) return;
    lastDraw = now;
    if (dt < 250) watchdog(dt); else { wd.n = 0; wd.sum = 0; wd.t = 0; }
    var step = dt / 1000 / (fadeMs / 1000);
    for (var i = 0; i < layers.length; i++) { var l = layers[i]; l.fade += (l.target > l.fade ? 1 : -1) * Math.min(Math.abs(l.target - l.fade), step); }
    if (filmLayer) { filmLayer.fade += (filmLayer.target > filmLayer.fade ? 1 : -1) * Math.min(Math.abs(filmLayer.target - filmLayer.fade), step); }
    pruneLayers();
    if (!layers.length && (!filmLayer || filmLayer.target === 0 && filmLayer.fade <= 0.004)) { idle(); return; }
    render(now, !!cal);
    if (cal) evalCal(now);
  }
  function idle() {
    stopLoop();
    if (filmLayer && filmLayer.target === 0) { killLayer(filmLayer); filmLayer = null; }
    if (gl && !gl.isContextLost()) { gl.clear(gl.COLOR_BUFFER_BIT); }
    if (canvas) canvas.style.opacity = "0";
    releaseGL();
    document.documentElement.removeAttribute("data-titanfx");
    emit("idle");
  }
  function releaseGL() {
    if (!gl) return;
    if (vao) { try { gl.deleteVertexArray(vao); } catch (e) { /* ignore */ } vao = null; }
    var ext = null; try { ext = gl.getExtension("WEBGL_lose_context"); } catch (e) { /* ignore */ }
    if (ext) { try { ext.loseContext(); } catch (e) { /* ignore */ } }
    gl = null;
    if (canvas) { canvas.remove(); canvas = null; cw = ch = 0; }   // a lost context cannot be reused: next play builds a new canvas
  }
  function startLoop() {
    if (running || document.hidden) return;
    if (reduced) { drawOnce(); return; }
    running = true; lastDraw = 0;
    if (!tStart) tStart = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function drawOnce() {
    if (!gl || gl.isContextLost()) return;
    layers.forEach(function (l) { l.fade = l.target; });
    if (filmLayer) filmLayer.fade = filmLayer.target;
    pruneLayers(true);
    var guard = 0;
    (function tryDraw() {
      if (!gl || gl.isContextLost()) return;
      var ok = render(performance.now(), false);
      if (!ok && layers.length && guard++ < 60) setTimeout(tryDraw, 50);
    })();
  }
  function emit(type) { try { window.dispatchEvent(new CustomEvent("titan:fx", { detail: { type: type, preset: want ? want.id : null } })); } catch (e) { /* ignore */ } }

  document.addEventListener("visibilitychange", function () {   // VISUAL only: audio is never touched here
    if (document.hidden) { stopLoop(); if (videoEl) try { videoEl.pause(); } catch (e) { /* ignore */ } }
    else {
      if (layers.length || filmLayer) { tPause = 0; startLoop(); }
      if (videoEl) try { videoEl.play().catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
    }
  });
  if (rmq) {
    var onRM = function () {
      reduced = !!rmq.matches;
      if (reduced) { stopLoop(); clearTimeout(boltTimer); if (videoEl) videoEl.pause(); if (gl) drawOnce(); }
      else if (layers.length || filmLayer) startLoop();
    };
    if (rmq.addEventListener) rmq.addEventListener("change", onRM); else if (rmq.addListener) rmq.addListener(onRM);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  window.addEventListener("titan:atmo", function () { setTimeout(readTheme, 30); setTimeout(readTheme, 600); });

  /* ---------- public ---------- */
  function play(id, opts) {
    opts = opts || {};
    want = { id: id, opts: opts };
    if (cfg.level === "off") return false;
    if (!ensureGL()) return false;
    var parts = resolve(id);
    if (!parts.length) { console.warn("TitanFX: unknown preset '" + id + "'"); return false; }
    readTheme();
    var base = opts.intensity == null ? 0.8 : opts.intensity;
    var key = parts.map(function (p) { return p.def.id; }).join("+");
    var cur = layers.filter(function (l) { return l.target > 0; });
    var same = cur.length === parts.length && cur.every(function (l, i) { return l.id === parts[i].def.id; });
    if (same) {
      cur.forEach(function (l, i) { l.intensity = base * parts[i].w; l.tint = opts.tint || null; });
    } else {
      layers.forEach(function (l) { l.target = 0; });
      if (layers.length > 3) { layers.slice(0, layers.length - 3).forEach(killLayer); pruneLayers(true); }
      parts.forEach(function (p) { layers.push(makeLayer(p.def, base * p.w, opts.tint)); });
      scaleStep = qMem[key] != null ? Math.min(qMem[key], LADDER.length - 1) : (qMem[parts[0].def.id] != null ? Math.min(qMem[parts[0].def.id], LADDER.length - 1) : 0);
      want.id = key;
      if (forced != null) { scaleStep = forced; cal = null; } else if (qMem[key] == null) startCal(); else cal = null;
    }
    var fa = opts.film != null ? opts.film : null;
    if (fa !== null) cfg.film = fa;
    if (presets.film && !filmLayer) { filmLayer = makeLayer(presets.film, 1); }
    if (filmLayer) filmLayer.target = filmAmount() > 0 ? 1 : 0;
    sizeCanvas();
    canvas.style.zIndex = parts[0].def.layer === "back" ? "0" : "7";
    canvas.style.mixBlendMode = "";
    canvas.style.opacity = "1";
    document.documentElement.setAttribute("data-titanfx", "on");
    scheduleSelf();
    if (!tStart) tStart = performance.now();
    if (reduced) { frozenT = parts[0].def.still || 14; drawOnce(); } else startLoop();
    if (opts.video !== undefined || videoMap[parts[0].def.id]) playVideo(opts.video || videoMap[parts[0].def.id]);
    emit("play");
    return true;
  }
  function stop(fadeSec) {
    want = null; clearTimeout(boltTimer);
    if (videoEl) stopVideo();
    if (!gl) return;
    if (fadeSec === 0) { layers.forEach(killLayer); layers = []; if (filmLayer) { killLayer(filmLayer); filmLayer = null; } idle(); return; }
    fadeMs = Math.max(200, (fadeSec == null ? 1.2 : fadeSec) * 1000);
    layers.forEach(function (l) { l.target = 0; });
    if (filmLayer) filmLayer.target = 0;
    if (reduced) { layers.forEach(killLayer); layers = []; if (filmLayer) { killLayer(filmLayer); filmLayer = null; } idle(); return; }
    startLoop();
    setTimeout(function () { fadeMs = 1400; }, fadeMs + 100);
  }
  function setIntensity(v) { cfg.intensity = Math.max(0, Math.min(1, +v || 0)); save(); if (gl && reduced) drawOnce(); }
  function setLevel(l) {
    if (l !== "off" && l !== "subtle" && l !== "full") return;
    var was = cfg.level; cfg.level = l; save();
    if (l === "off") { stop(0.6); }
    else if (was === "off" && want0()) { play(want0().id, want0().opts); }
    else if (filmLayer) filmLayer.target = filmAmount() > 0 ? 1 : 0;
    if (gl && reduced) drawOnce();
  }
  var lastWant = null;
  function want0() { return want || lastWant; }
  var _stop = stop;
  stop = function (f) { if (want) lastWant = want; _stop(f); };   // eslint-disable-line no-func-assign
  var _setLevel = setLevel;
  setLevel = function (l) { if (l === "off" && want) lastWant = want; _setLevel(l); };   // eslint-disable-line no-func-assign
  function setFilm(v) { cfg.film = Math.max(0, Math.min(1, +v || 0)); save(); if (filmLayer) filmLayer.target = filmAmount() > 0 ? 1 : 0; else if (cfg.film > 0 && gl && presets.film) { filmLayer = makeLayer(presets.film, 1); filmLayer.target = filmAmount() > 0 ? 1 : 0; startLoop(); } }
  function setDprCap(v) { cfg.dprCap = Math.max(1, Math.min(3, +v || 1.5)); save(); sizeCanvas(); }

  /* ---------- video overlay (optional pre-rendered art; absent file = no-op) ---------- */
  function playVideo(src, o) {
    stopVideo();
    if (!src || reduced || cfg.level === "off") return false;
    o = o || {};
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("aria-hidden", "true"); v.setAttribute("muted", "");
    v.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:7;opacity:0;transition:opacity 1s ease;mix-blend-mode:" + (o.blend || "screen");
    v.addEventListener("error", function () { if (videoEl === v) stopVideo(); });
    v.addEventListener("canplay", function () { v.style.opacity = String(o.opacity == null ? 0.55 * (cfg.level === "subtle" ? 0.6 : 1) : o.opacity); });
    v.src = src;
    document.body.appendChild(v); videoEl = v;
    try { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { if (videoEl === v) stopVideo(); }); } catch (e) { stopVideo(); }
    return true;
  }
  function stopVideo() { if (videoEl) { try { videoEl.pause(); videoEl.removeAttribute("src"); videoEl.load(); } catch (e) { /* ignore */ } videoEl.remove(); videoEl = null; } }

  var api = {
    play: play, stop: stop, setIntensity: setIntensity, setLevel: setLevel, setFilm: setFilm, setDprCap: setDprCap,
    playVideo: playVideo, stopVideo: stopVideo,
    setVideoMap: function (m) { videoMap = m || {}; },
    register: function (id, def) { def.id = id; presets[id] = def; },
    alias: function (id, spec) { aliases[id] = spec; },
    presets: function () { return Object.keys(presets).concat(Object.keys(aliases)).filter(function (k) { return k !== "film"; }); },
    get supported() { return probe(); },
    owns: function () { return probe(); },              // when true, ambient.js leaves its 2D canvas weather off
    thunder: function (d) { window.dispatchEvent(new CustomEvent("titan:thunder", { detail: d || {} })); },
    stats: function () { return { programs: live.programs, created: live.created, deleted: live.deleted, layers: layers.length, running: running, scale: LADDER[scaleStep][0], quality: LADDER[scaleStep][1], cost: frameCost.length ? frameCost[frameCost.length - 1] : null, canvas: canvas ? [cw, ch] : null, hasGL: !!gl }; },
    state: function () { return { level: cfg.level, intensity: cfg.intensity, film: cfg.film, reduced: reduced, playing: want ? want.id : null }; },
    setQuality: function (step) { forced = step == null ? null : Math.max(0, Math.min(LADDER.length - 1, step | 0)); if (forced != null) { scaleStep = forced; cal = null; sizeCanvas(); } },
    _lost: lostRecover
  };
  var target = prevFX || {};
  Object.keys(api).forEach(function (k) { Object.defineProperty(target, k, Object.getOwnPropertyDescriptor(api, k)); });
  window.TitanFX = target;
})();
