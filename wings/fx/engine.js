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
   fx-v3 additions: depth (back/front layers, a sparse out-of-focus FRONT particle layer, glow/bloom for bright particles),
     interaction (smoothed pointer parallax, gentle scroll drift that settles, tap ripple/burst for presets with `tap`),
     "moments" (rare signature events a preset declares in `moments:[{name,every:[min,max],dur}]`, drives uMoment),
     audio-reactive uAudio (from TitanGen.level() when present, else 0), coin-open accent pulse (listens to "titan:coin").
     TitanFX.moment(name?) forces a moment, TitanFX.pulse() an accent pulse.
   Events: listens to "titan:thunder" ({detail:{delay, strength}}) -> lightning flash on presets that use it,
           "titan:coin" ({detail:{id}}) -> brief accent pulse.
           dispatches "titan:fx" ({detail:{type, preset, name?}}), type: play | idle | moment.
   Styles (2026-10-10, notes/agents/styles-20.md): a preset may declare `canvas: { w, h, fps, draw(ctx, w, h, t, info) }`. The engine owns
     a small 2D canvas per layer, calls draw at most `fps` times a second (once for a still frame) and uploads it as `uniform sampler2D uTex`
     (texture unit 2) with `uniform vec2 uTexRes`; draw returns false when nothing changed (no upload). info = { bg, ink, acc (css rgb()),
     light (0/1), q (quality 0..3), still (bool), coin (an HTMLImageElement of a real coin photo once loaded, else null) }. Text, glyphs
     and sprites (ASCII art, split-flap letters, kinetic type, pixel sprites) are drawn there and shaded on the GPU like every other pass;
     the preset declares `uniform sampler2D uTex; uniform vec2 uTexRes;` in its glsl. `canvas.nearest: true` = pixel-exact sampling.
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
  var live = { programs: 0, created: 0, deleted: 0, tex: 0 };
  var flash = { t0: -9, strokes: null, x: 0, seed: 0 }, extThunder = 0, thunderTimer = 0, boltTimer = 0;
  var theme = { bg: [0.1, 0.09, 0.08], ink: [0.9, 0.85, 0.75], acc: [0.8, 0.65, 0.3], light: 0 };
  var videoEl = null, videoMap = {};
  var SAFE_K = 0.85;                       // how much the effect is attenuated over text (0 = off)
  var scrolling = false, scrollT = 0, SCROLL_SETTLE_MS = 160;
  /* scroll motion (tr111, owner: "Whenever I scroll the animations pause on every screen on every theme. Its annoying"): tr82 froze the
     effect mid-scroll for speed (Pixel 7 4x CPU: Gallery 33 -> ~57 fps). Now it keeps moving at a scroll frame rate that steps down
     30 -> 20 -> 12 fps when the page itself drops frames (never to zero), and the text mask follows the page: the mask is shifted by the
     distance scrolled since it was built (max of shifted and unshifted, so fixed bars stay covered too) and rebuilt every 280 ms. */
  var SCROLL_FPS = [30, 20, 12], SCROLL_JANK_MS = 22, SCROLL_REMASK_MS = 280;
  var scr = { off: 0, step: 0, ema: 16.7, slow: 0, lastRaf: 0, pos: window.WeakMap ? new WeakMap() : null };
  var safe = { tex: null, cv: null, cx: null, nodes: [], scanAt: 0, dirty: true, t: 0, built: 0, mut: null };
  var fadeMs = 1400, forced = null;
  /* fx-v3 state: interaction, moments, audio, glow */
  var par = { x: 0, y: 0, tx: 0, ty: 0 }, ptr = { x: 0, y: 0 }, drift = { v: 0, imp: 0, last: null };
  var tap = { x: 0, y: 0, t0: -99, s: 0 }, pulseT0 = -99, audioV = 0, audioT = 0, audioErr = 0;
  var glow = { fbo: null, tex: null, prog: null, w: 0, h: 0 };
  var PAR_MAX = 0.016, DRIFT_MAX = 0.05;
  var rw = 0, rh = 0, rscale = 1;      // viewport / scale used by the draw in progress (the glow target is 1/4 size)

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
    "uniform vec2 uPar, uPtr; uniform vec4 uTap, uMoment; uniform float uAudio, uPulse, uRing;\n" +
    "#define PI 3.14159265\n" +
    "float mK(){ return uMoment.z > 0. ? uMoment.x / uMoment.z : -1.; }\n" +
    "float mEnv(){ float k = mK(); return k < 0. ? 0. : smoothstep(0.,.12,k)*(1.-smoothstep(.62,1.,k)); }\n" +
    "float h11(float p){ return fract(sin(p*127.1+31.7)*43758.5453); }\n" +
    "float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }\n" +
    "vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))))*43758.5453); }\n" +
    "float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\n" +
    "float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }\n" +
    "float fbmQ(vec2 p, int n){ float a=.5, s=0.; for(int i=0;i<6;i++){ if(i>=n) break; s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }\n" +
    "vec3 hsv(float h, float s, float v){ vec3 k=clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.); return v*mix(vec3(1.),k,s); }\n";
  var VS_FULL = "#version 300 es\nvoid main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }\n";
  var FS_SAFE = "uniform sampler2D uSafe; uniform float uSafeK, uSafeOff;\n" +
    "float safeAt(vec2 fc){ float a = texture(uSafe, fc / uRes).r; return uSafeOff == 0. ? a : max(a, texture(uSafe, (fc - vec2(0., uSafeOff)) / uRes).r); }\n";
  var RING = "vec4 tapRing(){ if (uRing < .5 || uTap.w <= 0. || uTap.z > 2.4) return vec4(0.);\n" +
    "  vec2 pp = (gl_FragCoord.xy-.5*uRes)/uRes.y; float age = uTap.z; float d = length(pp-uTap.xy);\n" +
    "  float ring = exp(-pow((d-age*.5)/(.03+age*.02),2.))*exp(-age*1.7)*uTap.w;\n" +
    "  vec3 rc = mix(uAcc, vec3(1.), .35);\n" +
    "  return vec4(rc*ring*.2*(1.-uLight), ring*.07*uLight); }\n";
  var FS_MAIN = "\n" + FS_SAFE + RING + "out vec4 outColor;\nvoid main(){ vec4 c = fx(gl_FragCoord.xy) * uFade; c += tapRing()*uFade; c *= 1. + .35*uPulse + .22*uAudio; float s = safeAt(gl_FragCoord.xy); outColor = c * (1. - uSafeK * s); }\n";
  var FS_MAIN_I = "\n" + FS_SAFE + "out vec4 outColor;\nvoid main(){ vec4 c = fxi() * uFade; c *= 1. + .35*uPulse + .22*uAudio; float s = safeAt(gl_FragCoord.xy); outColor = c * (1. - uSafeK * s); }\n";
  var FS_HEAD_I = "#version 300 es\nprecision highp float;\nuniform vec2 uRes, uPar, uPtr; uniform vec4 uMoment, uTap; uniform float uFade, uLight, uInt, uQ, uTime, uFlash, uAudio, uPulse, uScale; uniform vec3 uBg, uInk, uAcc, uTint; uniform vec3 uFrontC;\nin vec4 vA; in vec2 vQ;\nfloat mK(){ return uMoment.z > 0. ? uMoment.x / uMoment.z : -1.; }\nfloat mEnv(){ float k = mK(); return k < 0. ? 0. : smoothstep(0.,.12,k)*(1.-smoothstep(.62,1.,k)); }\n";

  /* fx-v3 front layer: a few large out-of-focus particles drifting past the camera (sparse: most cycles are skipped) */
  var VHEAD3 = "#version 300 es\nprecision highp float;\n#define PI 3.14159265\nuniform vec2 uRes, uPar, uPtr; uniform vec4 uTap, uMoment; uniform float uTime, uInt, uQ, uScale, uLight, uFlash, uTapOn, uAudio, uPulse;\nout vec4 vA; out vec2 vQ;\n" +
    "float h11(float p){ return fract(sin(p*127.1+31.7)*43758.5453); }\n" +
    "float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }\n" +
    "vec2 rot2(vec2 v, float a){ float c=cos(a), s=sin(a); return vec2(c*v.x-s*v.y, s*v.x+c*v.y); }\n" +
    "float mK(){ return uMoment.z > 0. ? uMoment.x / uMoment.z : -1.; }\n" +
    "float mEnv(){ float k = mK(); return k < 0. ? 0. : smoothstep(0.,.12,k)*(1.-smoothstep(.62,1.,k)); }\n" +
    "vec2 warp(vec2 ndc, float dz){\n" +
    "  float asp = uRes.x/uRes.y; vec2 p = ndc*vec2(asp*.5,.5) + uPar*dz;\n" +
    "  if (uTapOn > .5 && uTap.w > 0.) { vec2 d = p-uTap.xy; float L = length(d)+1e-4; float w = exp(-pow((L-uTap.z*.55)/.14,2.))*exp(-uTap.z*1.8)*uTap.w; p += d/L*w*.06; }\n" +
    "  return p/vec2(asp*.5,.5); }\n" +
    "void emit(vec2 ndc, vec2 halfPx, vec2 corner, vec4 a){ gl_Position = vec4(warp(ndc,1.) + corner*halfPx*2./uRes, 0., 1.); vQ = corner; vA = a; }\n" +
    "void cull(){ gl_Position = vec4(2.,2.,2.,1.); vQ = vec2(0.); vA = vec4(0.); }\n";
  var FRONT_VERT = VHEAD3 + "uniform vec4 uFrontA;\n" + [
    "void main(){",
    "  float fi = float(gl_InstanceID);",
    "  vec2 corner = vec2(float(gl_VertexID&1), float(gl_VertexID>>1))*2.-1.;",
    "  float r1=h11(fi*3.7+1.), r2=h11(fi+7.7), r3=h11(fi+19.1), r4=h11(fi+33.3);",
    "  float life = (16.+20.*r2)/max(.2,uFrontA.x);",
    "  float ph = uTime/life + r1*5.; float cyc = floor(ph); float age = fract(ph);",
    "  if (h11(cyc*13.1+fi*5.7) > .55) { cull(); return; }",
    "  float dirx = h11(cyc*3.3+fi) > .5 ? 1. : -1.;",
    "  vec2 pos = vec2((age*2.7-1.35)*dirx, (r3*2.-1.)*.78 + sin(age*3.+r1*9.)*.1 + (age-.5)*(r4-.5)*.4);",
    "  float fade = smoothstep(0.,.2,age)*(1.-smoothstep(.8,1.,age));",
    "  float sz = uFrontA.y*uRes.y*(.45+r3*.9);",
    "  gl_Position = vec4(warp(pos, 2.4) + corner*sz*2./uRes, 0., 1.); vQ = corner;",
    "  vA = vec4(age, fade*uFrontA.z*(.6+.4*r4), r4, uFrontA.w);",
    "}"].join("\n");
  var FRONT_FRAG = [
    "vec4 fxi(){",
    "  float d = length(vQ); if (d > 1.) return vec4(0.);",
    "  float soft = exp(-d*d*3.2), disc = smoothstep(1.,.88,d), rim = smoothstep(.6,.92,d)*disc;",
    "  float a = vA.w < .5 ? soft : (vA.w < 1.5 ? disc*.4+rim*.9 : soft*.55+rim*.35);",
    "  vec3 c = mix(uFrontC, uInk*.5, uLight);",
    "  float e = a*vA.y*uInt;",
    "  return vec4(c*e, e*mix(.12,.5,uLight)*(1.-.6*uLight*0.));",
    "}"].join("\n");
  var GLOW_FS = "#version 300 es\nprecision highp float;\nuniform sampler2D uGlow, uSafe; uniform vec2 uRes, uTexel; uniform float uK, uFade, uSafeK, uSafeOff;\nout vec4 outColor;\n" +
    "void main(){ vec2 uv = gl_FragCoord.xy/uRes; vec3 s = texture(uGlow, uv).rgb*.2;\n" +
    "  for (int i=0;i<8;i++){ float a = float(i)*.7854+.3; vec2 o = vec2(cos(a), sin(a));\n" +
    "    s += texture(uGlow, uv+o*uTexel*1.7).rgb*.075 + texture(uGlow, uv+o*uTexel*3.9).rgb*.0275; }\n" +
    "  float m = texture(uSafe, uv).r; if (uSafeOff != 0.) m = max(m, texture(uSafe, (gl_FragCoord.xy - vec2(0., uSafeOff))/uRes).r);\n" +
    "  outColor = vec4(s*uK*uFade*(1.-uSafeK*m), 0.); }\n";

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
    if (def.front) {
      var fp = { front: def.front, count: [2, 3, 4, 5], vert: FRONT_VERT, ifrag: "uniform vec4 uFrontA;\n" + FRONT_FRAG };
      var fr = mkProgram(FRONT_VERT, FS_HEAD_I + fp.ifrag + FS_MAIN_I, def.id + "#front");
      fr.pass = fp; out.push(fr);
    }
    return out;
  }

  /* ---------- layers ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function makeLayer(def, intensity, tint) {
    var l = { id: def.id, def: def, passes: buildPasses(def), fade: 0, target: 1, intensity: intensity, tint: tint || null, born: performance.now() };
    if (def.moments && def.moments.length && !reduced) { var ev = def.moments[0].every || [30, 80]; l.mo = { next: (tStart ? (performance.now() - tStart) / 1000 : 0) + rnd(ev[0] * 0.3, ev[0] * 0.8), cur: null }; }
    return l;
  }
  function killLayer(l) { l.passes.forEach(delProgram); l.passes = []; l.dead = true; if (l.ctex) { try { if (gl) gl.deleteTexture(l.ctex.tex); } catch (e) { /* ignore */ } live.tex--; l.ctex = null; } }
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

  /* ---------- text-safe mask: the overlay is attenuated over text so WCAG AA holds whatever the layout is ---------- */
  var SKIP = "script,style,svg,canvas,video,#titan-fx,#scene-sheet,#tr-splash,[aria-hidden='true']";
  function scanSafe() {
    var out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, c = 0;
    while ((n = w.nextNode()) && c < 3000) {
      var t = n.nodeValue; if (!t || t.length < 2 || !/\S/.test(t)) continue;
      var e = n.parentElement; if (!e || (e.closest && e.closest(SKIP))) continue;
      out.push(n); c++;
    }
    safe.nodes = out; safe.scanAt = performance.now();
  }
  function buildSafe() {
    if (!gl || !safe.tex || SAFE_K <= 0) return;
    var vw = window.innerWidth, vh = window.innerHeight, S = 4, W = Math.max(2, Math.ceil(vw / S)), H = Math.max(2, Math.ceil(vh / S));
    if (!safe.cv) { safe.cv = document.createElement("canvas"); safe.cx = safe.cv.getContext("2d"); }
    if (safe.cv.width !== W || safe.cv.height !== H) { safe.cv.width = W; safe.cv.height = H; }
    var cx = safe.cx; cx.shadowBlur = 0; cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H); cx.fillStyle = "#fff"; cx.shadowColor = "#fff"; cx.shadowBlur = 5;   // soft edges: no visible boxes around text
    // text drawn into a <canvas> (the Hall terminal prompt, charts) is not in the DOM: treat modest-size canvases as one soft block
    var cvs = document.querySelectorAll("canvas"), ci;
    cx.fillStyle = "rgba(255,255,255,.92)";
    for (ci = 0; ci < cvs.length && ci < 24; ci++) {
      var cv = cvs[ci]; if (cv.id === "titan-fx" || cv.getAttribute("aria-hidden") === "true" && cv.closest("#tr-splash")) continue;
      var cb = cv.getBoundingClientRect();
      if (cb.width < 40 || cb.height < 24 || cb.width * cb.height > 0.6 * vw * vh || cb.bottom < 0 || cb.top > vh || cb.right < 0 || cb.left > vw) continue;
      if (cv.closest && cv.closest("#scene-sheet")) continue;
      cx.fillRect(cb.left / S, cb.top / S, cb.width / S, cb.height / S);
    }
    cx.fillStyle = "#fff";
    var r = document.createRange(), pad = 3;
    for (var i = 0; i < safe.nodes.length; i++) {
      var nd = safe.nodes[i]; if (!nd.isConnected) continue;
      try { r.selectNodeContents(nd); } catch (e) { continue; }
      var b = r.getBoundingClientRect();
      if (b.width < 2 || b.height < 2 || b.bottom < -pad || b.top > vh + pad || b.right < -pad || b.left > vw + pad) continue;
      cx.fillRect((b.left - pad) / S, (b.top - pad) / S, (b.width + 2 * pad) / S, (b.height + 2 * pad) / S);
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, safe.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, safe.cv);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    safe.dirty = false; safe.built = performance.now(); scr.off = 0;   // the mask now matches the page as it is
  }
  /* how far (canvas px, gl y up) the page has scrolled since the mask was built */
  function safeOffPx() { return scr.off ? scr.off * (ch / Math.max(1, window.innerHeight)) : 0; }
  function markSafe(delayMs) {
    safe.dirty = true;
    if (safe.t) return;
    safe.t = setTimeout(function () {
      safe.t = 0;
      if (!gl) return;
      if (performance.now() - safe.scanAt > 2500 || safe.mutDirty) { scanSafe(); safe.mutDirty = false; }
      buildSafe();
      if (reduced && gl) drawOnce();
    }, delayMs == null ? 160 : delayMs);
  }
  function startSafe() {
    if (SAFE_K <= 0) return;
    scanSafe(); buildSafe();
    if (!safe.listen) {
      safe.listen = true;
      window.addEventListener("scroll", function (e) {   // the effect keeps moving; the mask follows the page and is rebuilt once the scroll settles
        scrolling = true;
        var t = e && e.target, el = (!t || t === document) ? (document.scrollingElement || document.documentElement) : t;
        if (el && (el === document.scrollingElement || el === document.documentElement || el === document.body || el.clientHeight > window.innerHeight * 0.5)) {
          var st = el.scrollTop || 0, last = scr.pos && scr.pos.has(el) ? scr.pos.get(el) : st;   // vertical page scrolls only (a carousel moves sideways inside its own band)
          if (scr.pos) scr.pos.set(el, st);
          scr.off += st - last;
        }
        if (scrollT) clearTimeout(scrollT);
        scrollT = setTimeout(function () { scrollT = 0; scrolling = false; if (gl) markSafe(0); }, SCROLL_SETTLE_MS);
      }, { passive: true, capture: true });
      window.addEventListener("resize", function () { if (gl) markSafe(200); });
      window.addEventListener("hashchange", function () { if (gl) { safe.mutDirty = true; markSafe(350); } });
      window.addEventListener("titan:atmo", function () { if (gl) { safe.mutDirty = true; markSafe(500); } });
      if (window.MutationObserver) {
        var mo = new MutationObserver(function () { safe.mutDirty = true; if (gl) markSafe(700); });
        mo.observe(document.body, { childList: true, subtree: true });
      }
      setInterval(function () { if (gl && running && !document.hidden) markSafe(0); }, 1500);   // catches layout changes nothing else announces (animations, lazy content)
    }
  }

  /* ---------- canvas / context ---------- */
  function ensureGL() {
    if (gl && !gl.isContextLost()) return true;
    if (!probe()) return false;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "titan-fx"; canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:7;opacity:0;transition:opacity .6s ease;contain:strict";
      canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (e.target !== canvas) return; stopLoop(); layers.forEach(function (l) { l.passes = []; l.ctex = null; }); layers = []; filmLayer = null; live.programs = 0; gl = null; safe.tex = null; live.tex = 0; glow = { fbo: null, tex: null, prog: null, w: 0, h: 0 }; });
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
    safe.tex = gl.createTexture(); live.tex++; safe.built = 0;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, safe.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return true;
  }
  function lostRecover() {
    if (gl && gl.isContextLost()) { gl = null; layers = []; filmLayer = null; live.programs = 0; glow = { fbo: null, tex: null, prog: null, w: 0, h: 0 }; if (want) play(want.id, want.opts); }
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
  function setCommon(rec, l, tNow, fade, fl, first) {
    var set1 = function (n, v) { var u = uloc(rec, n); if (u !== null) gl.uniform1f(u, v); };
    var set3 = function (n, a, b, c) { var u = uloc(rec, n); if (u !== null) gl.uniform3f(u, a, b, c); };
    var set2 = function (n, a, b) { var u = uloc(rec, n); if (u !== null) gl.uniform2f(u, a, b); };
    var q = LADDER[Math.min(scaleStep, LADDER.length - 1)][1];
    var tint = (l && l.tint) || null, def = l && l.def, dz = (def && def.depth != null) ? def.depth : 1;
    var u = uloc(rec, "uRes"); if (u !== null) gl.uniform2f(u, rw, rh);
    set1("uTime", tNow); set1("uQ", q); set1("uScale", rscale); set1("uFade", fade);
    set1("uLight", theme.light); set1("uFlash", fl[0]); set1("uStatic", reduced ? 1 : 0);
    set3("uBg", theme.bg[0], theme.bg[1], theme.bg[2]); set3("uInk", theme.ink[0], theme.ink[1], theme.ink[2]);
    var a = tint || theme.acc; set3("uAcc", a[0], a[1], a[2]);
    set3("uTint", a[0], a[1], a[2]);
    set3("uBolt", flash.x, fl[1], flash.seed);
    set1("uSafeK", glowDraw ? 0 : Math.max(SAFE_K, (def && def.safe) || 0)); set1("uSafeOff", safeOffPx()); var us = uloc(rec, "uSafe"); if (us !== null) gl.uniform1i(us, 0);
    // fx-v3
    var tapOn = def && def.tap ? 1 : 0, nowS = performance.now() / 1000, age = tap.t0 > -50 ? nowS - tap.t0 : 99;
    set2("uPar", reduced ? 0 : (par.x * dz), reduced ? 0 : ((par.y + drift.v) * dz)); set2("uPtr", ptr.x, ptr.y);
    var u4 = uloc(rec, "uTap"); if (u4 !== null) gl.uniform4f(u4, tap.x, tap.y, age, (tapOn && !reduced && age < 2.6) ? tap.s : 0);
    set1("uTapOn", tapOn); set1("uRing", (first && def && def.tap === true) ? 1 : 0);
    var mo = !reduced && l && l.mo && l.mo.cur, um = uloc(rec, "uMoment");
    if (um !== null) { if (mo) gl.uniform4f(um, tNow - mo.t0, mo.seed, mo.dur, mo.idx); else gl.uniform4f(um, -1, 0, 1, 0); }
    set1("uAudio", reduced ? 0 : audioV); set1("uPulse", reduced ? 0 : pulseValue(nowS));
    var pf = rec.pass && rec.pass.front;
    if (pf) {
      var uA = uloc(rec, "uFrontA"); if (uA !== null) gl.uniform4f(uA, pf.rate == null ? 0.6 : pf.rate, pf.size == null ? 0.12 : pf.size, pf.alpha == null ? 0.14 : pf.alpha, pf.kind == null ? 1 : pf.kind);
      var fc = pf.color || [a[0], a[1], a[2]]; set3("uFrontC", fc[0], fc[1], fc[2]);
    }
  }
  /* ---- styles: per-layer 2D canvas texture (def.canvas), texture unit 2 ---- */
  var coinImg = null, coinWant = false;
  function coinPhoto() {   // one real coin photo for styles that draw a coin (ASCII art, pixel sprite): the first flip with an obverse photo
    if (coinImg || coinWant) return coinImg && coinImg.complete && coinImg.naturalWidth ? coinImg : null;
    coinWant = true;
    try {
      fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) {
        var f = (d.flips || []).filter(function (x) { return x.thumb && x.thumb_side === "obv"; });
        if (!f.length) return;
        var pick = f[Math.floor(Math.random() * f.length)], im = new Image();
        im.decoding = "async"; im.onload = function () { coinImg = im; }; im.src = pick.thumb;
      }).catch(function () { /* offline before the index was cached: styles draw without it */ });
    } catch (e) { /* ignore */ }
    return null;
  }
  function css(c) { return "rgb(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + ")"; }
  function updCanvas(l, tNow, q) {
    var cd = l.def.canvas, ct = l.ctex;
    if (!ct) {
      var w = cd.w || 256, h = cd.h || 256, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      ct = l.ctex = { cv: cv, cx: cv.getContext("2d"), w: w, h: h, tex: gl.createTexture(), last: -1e9, n: 0 }; live.tex++;
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ct.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, cd.nearest ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, cd.nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      gl.activeTexture(gl.TEXTURE0);
    }
    var gap = 1 / Math.max(1, cd.fps || 8);
    if (!glowDraw && (ct.n === 0 || (!reduced && tNow - ct.last >= gap))) {
      var changed = true;
      try { changed = cd.draw(ct.cx, ct.w, ct.h, tNow, { bg: css(theme.bg), ink: css(theme.ink), acc: css(theme.acc), light: theme.light, q: q, still: reduced, coin: coinPhoto() }) !== false; }
      catch (e) { if (!ct.err) { ct.err = 1; try { console.warn("TitanFX: canvas draw '" + l.id + "' failed", e); } catch (e2) { /* ignore */ } } changed = false; }
      ct.last = tNow;
      if (changed || ct.n === 0) {
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ct.tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ct.cv);
        gl.activeTexture(gl.TEXTURE0);
        ct.n++;
      }
    }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ct.tex); gl.activeTexture(gl.TEXTURE0);
    return true;
  }
  var glowDraw = false;
  function pulseValue(nowS) { var d = nowS - pulseT0; return d < 0 || d > 3 ? 0 : Math.exp(-d / 0.8) * Math.min(1, d / 0.06); }
  function drawLayer(l, tNow, fl, glowOnly) {
    var ready = true;
    for (var i = 0; i < l.passes.length; i++) if (progStatus(l.passes[i]) === null) { ready = false; break; }
    if (!ready) return false;
    var eff = l.intensity * userGain() * (l.def.gain || 1) * (1 - 0.3 * theme.light);   // light atmospheres: dark text on a pale ground has little contrast to spare
    var q = LADDER[Math.min(scaleStep, LADDER.length - 1)][1], any = false;
    if (l.def.canvas && !updCanvas(l, tNow, q)) return false;
    for (i = 0; i < l.passes.length; i++) {
      var rec = l.passes[i];
      if (!rec.ok) continue;
      var ps = rec.pass;
      if (glowOnly && !ps.glow) continue;
      gl.useProgram(rec.p);
      setCommon(rec, l, tNow, Math.max(0, Math.min(1, l.fade)), fl, i === 0);
      var ui = uloc(rec, "uInt"); if (ui !== null) gl.uniform1f(ui, glowOnly ? eff * ps.glow : eff);
      var uf = uloc(rec, "uFilm"); if (uf !== null) gl.uniform1f(uf, (l.film == null ? 0 : l.film) * (1 - 0.55 * theme.light));
      if (l.ctex) { var ut = uloc(rec, "uTex"); if (ut !== null) gl.uniform1i(ut, 2); var utr = uloc(rec, "uTexRes"); if (utr !== null) gl.uniform2f(utr, l.ctex.w, l.ctex.h); }
      if (ps.vert) {
        var n = ps.front ? ps.count[Math.min(3, q)] : Math.max(1, Math.round(ps.count[Math.min(3, q)] * (0.3 + 0.7 * Math.min(1, eff))));
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      } else gl.drawArrays(gl.TRIANGLES, 0, 3);
      any = true;
    }
    return any || !glowOnly;
  }
  /* ---- glow (cheap bloom): glow-flagged particle passes are drawn into a 1/4-size target, blurred while compositing (additive) ---- */
  function bloomOn() { return scaleStep <= 2 && cfg.level !== "off"; }
  function glowWanted() { if (!bloomOn()) return false; for (var i = 0; i < layers.length; i++) { var ps = layers[i].passes; for (var j = 0; j < ps.length; j++) if (ps[j].pass && ps[j].pass.glow) return true; } return false; }
  function ensureGlow() {
    var gw = Math.max(2, Math.ceil(cw / 4)), gh = Math.max(2, Math.ceil(ch / 4));
    if (!glow.tex) {
      glow.tex = gl.createTexture(); live.tex++;
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glow.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      glow.w = 0;
      glow.fbo = gl.createFramebuffer();
    }
    if (glow.w !== gw || glow.h !== gh) {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glow.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gw, gh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, glow.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glow.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      glow.w = gw; glow.h = gh;
    }
    if (!glow.prog) glow.prog = mkProgram(VS_FULL, GLOW_FS, "glow");
    return true;
  }
  function releaseGlow() {
    if (glow.prog) { delProgram(glow.prog); glow.prog = null; }
    if (glow.tex) { try { gl.deleteTexture(glow.tex); } catch (e) { /* ignore */ } glow.tex = null; live.tex--; }
    if (glow.fbo) { try { gl.deleteFramebuffer(glow.fbo); } catch (e) { /* ignore */ } glow.fbo = null; }
    glow.w = glow.h = 0;
  }
  function drawGlow(tNow, fl) {
    ensureGlow();
    if (progStatus(glow.prog) === null || !glow.prog.ok) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, glow.fbo);
    gl.viewport(0, 0, glow.w, glow.h); gl.clear(gl.COLOR_BUFFER_BIT);
    rw = glow.w; rh = glow.h; rscale = curScale / 4; glowDraw = true;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, safe.tex);
    var any = false;
    for (var i = 0; i < layers.length; i++) { if (layers[i].fade > 0.01 && drawLayer(layers[i], tNow, fl, true)) any = true; }
    glowDraw = false; rw = cw; rh = ch; rscale = curScale;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cw, ch);
    if (!any) return;
    var rec = glow.prog; gl.useProgram(rec.p);
    var set = function (n, f) { var u = uloc(rec, n); if (u !== null) f(u); };
    set("uRes", function (u) { gl.uniform2f(u, cw, ch); }); set("uTexel", function (u) { gl.uniform2f(u, 1 / glow.w, 1 / glow.h); });
    set("uK", function (u) { gl.uniform1f(u, 1.25 * (1 - 0.7 * theme.light)); }); set("uFade", function (u) { var f = 0; layers.forEach(function (l) { f = Math.max(f, Math.min(1, l.fade)); }); gl.uniform1f(u, f); });
    set("uSafeK", function (u) { var k = SAFE_K; layers.forEach(function (l) { k = Math.max(k, l.def.safe || 0); }); gl.uniform1f(u, k); }); set("uSafe", function (u) { gl.uniform1i(u, 0); }); set("uSafeOff", function (u) { gl.uniform1f(u, safeOffPx()); }); set("uGlow", function (u) { gl.uniform1i(u, 1); });
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glow.tex); gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function userGain() { return cfg.level === "subtle" ? cfg.intensity * 0.5 : cfg.intensity; }
  function filmAmount() { return cfg.level === "full" ? cfg.film : 0; }

  var frameCost = [];
  function render(now, measure) {
    if (!gl || gl.isContextLost()) return;
    var tNow = reduced ? (frozenT || 14) : (now - tStart) / 1000;
    var fl = reduced ? [0, 0] : flashValue(now / 1000);
    rw = cw; rh = ch; rscale = curScale; glowDraw = false;
    gl.viewport(0, 0, cw, ch);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, safe.tex);
    var t0 = performance.now(), drawn = false;
    if (glowWanted()) drawGlow(tNow, fl); else if (glow.tex) releaseGlow();
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

  /* ---------- fx-v3: interaction (pointer parallax, scroll drift, tap), moments, audio ---------- */
  function interact(dt) {
    if (reduced) return;
    var k = 1 - Math.exp(-dt * 3.2);
    par.x += (par.tx - par.x) * k; par.y += (par.ty - par.y) * k;
    drift.imp *= Math.exp(-dt / 0.75);                       // the impulse a scroll leaves behind decays...
    drift.v += (drift.imp - drift.v) * (1 - Math.exp(-dt * 5));   // ...and the layer follows it, so after a scroll it eases out then settles
    if (Math.abs(drift.imp) < 1e-5 && Math.abs(drift.v) < 1e-5) { drift.imp = 0; drift.v = 0; }
  }
  function onPointerMove(e) {
    if (reduced || !gl) return;
    var vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    ptr.x = (e.clientX - vw / 2) / vh; ptr.y = -(e.clientY - vh / 2) / vh;
    par.tx = Math.max(-PAR_MAX, Math.min(PAR_MAX, -ptr.x * 0.03)); par.ty = Math.max(-PAR_MAX, Math.min(PAR_MAX, -ptr.y * 0.03));
  }
  function onPointerDown(e) {
    if (reduced || !gl || !layers.length) return;
    var vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    tap.x = (e.clientX - vw / 2) / vh; tap.y = -(e.clientY - vh / 2) / vh; tap.t0 = performance.now() / 1000; tap.s = 1;
  }
  var scrollPos = window.WeakMap ? new WeakMap() : null;
  function onScrollDrift(e) {
    if (reduced) return;
    var t = e && e.target, el = (!t || t === document) ? (document.scrollingElement || document.documentElement) : t;
    var st = el.scrollTop || 0, last = scrollPos && scrollPos.has(el) ? scrollPos.get(el) : 0;
    var d = st - last; if (scrollPos) scrollPos.set(el, st);
    if (Math.abs(d) < 1600) drift.imp = Math.max(-DRIFT_MAX, Math.min(DRIFT_MAX, drift.imp + d * 0.00006));
  }
  function tickMoments(tNow) {
    if (reduced) return;
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i], mo = l.mo; if (!mo || l.target === 0 || l.fade < 0.6) continue;
      var ms = l.def.moments;
      if (mo.cur && tNow > mo.cur.t0 + mo.cur.dur) { var ev = ms[mo.cur.idx].every || [30, 80]; mo.cur = null; mo.next = tNow + rnd(ev[0], ev[1]); }
      else if (!mo.cur && tNow >= mo.next) startMoment(l, Math.floor(Math.random() * ms.length), tNow);
    }
  }
  function startMoment(l, idx, tNow) {
    var m = l.def.moments[idx]; if (!m || !l.mo) return false;
    l.mo.cur = { idx: idx, t0: tNow, dur: m.dur || 8, seed: Math.random() * 100, name: m.name || ("m" + idx) };
    emit("moment", { preset: l.id, name: l.mo.cur.name, dur: l.mo.cur.dur });
    return true;
  }
  function forceMoment(name) {
    if (reduced) return false;
    var tNow = (performance.now() - (tStart || performance.now())) / 1000;
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i]; if (!l.def.moments || l.target === 0) continue;
      if (!l.mo) l.mo = { next: 1e9, cur: null };
      var idx = 0; if (name) { idx = -1; l.def.moments.forEach(function (m, j) { if (m.name === name) idx = j; }); if (idx < 0) continue; }
      return startMoment(l, idx, tNow);
    }
    return false;
  }
  function sampleAudio(now) {
    if (reduced || now - audioT < 66) return;
    audioT = now;
    var tgt = 0, G = window.TitanGen;
    if (G && audioErr < 3) {
      try {
        var playing = typeof G.isPlaying === "function" ? G.isPlaying() : true;
        var lv = playing && typeof G.level === "function" ? +G.level() : 0;
        if (isFinite(lv) && lv > 0) tgt = Math.min(1, lv * 5);
      } catch (e) { audioErr++; }
    }
    audioV += (tgt - audioV) * 0.25;
    if (audioV < 0.002) audioV = 0;
  }

  function scrollPace(rdt) {          // the page dropping frames while it scrolls: step the scroll frame rate down (30 -> 20 -> 12), never to zero
    if (!(rdt > 0 && rdt < 250)) return;
    scr.ema += (rdt - scr.ema) * 0.15;
    if (scr.ema > SCROLL_JANK_MS) { scr.slow += rdt; if (scr.slow > 700 && scr.step < SCROLL_FPS.length - 1) { scr.step++; scr.slow = 0; scr.ema = 16.7; } }
    else scr.slow = Math.max(0, scr.slow - rdt * 0.5);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var rdt = scr.lastRaf ? now - scr.lastRaf : 0; scr.lastRaf = now;
    if (scrolling) scrollPace(rdt);
    var dt = now - lastDraw;
    if (dt < 1000 / (scrolling ? SCROLL_FPS[scr.step] : FPS_CAP) - 1.5) return;
    lastDraw = now;
    if (scrolling) {                     // the watchdog ignores scroll frames (they are capped on purpose); the mask is refreshed as the page moves
      wd.n = 0; wd.sum = 0; wd.t = 0; scr.frames = (scr.frames || 0) + 1;
      if (gl && safe.tex && SAFE_K > 0 && now - safe.built > SCROLL_REMASK_MS) buildSafe();
    } else if (dt < 250) watchdog(dt); else { wd.n = 0; wd.sum = 0; wd.t = 0; }
    var step = dt / 1000 / (fadeMs / 1000);
    for (var i = 0; i < layers.length; i++) { var l = layers[i]; l.fade += (l.target > l.fade ? 1 : -1) * Math.min(Math.abs(l.target - l.fade), step); }
    if (filmLayer) { filmLayer.fade += (filmLayer.target > filmLayer.fade ? 1 : -1) * Math.min(Math.abs(filmLayer.target - filmLayer.fade), step); }
    pruneLayers();
    if (!layers.length && (!filmLayer || filmLayer.target === 0 && filmLayer.fade <= 0.004)) { idle(); return; }
    if (dt < 250) { interact(dt / 1000); tickMoments((now - tStart) / 1000); sampleAudio(now); }
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
    releaseGlow();
    if (vao) { try { gl.deleteVertexArray(vao); } catch (e) { /* ignore */ } vao = null; }
    if (safe.tex) { try { gl.deleteTexture(safe.tex); } catch (e) { /* ignore */ } safe.tex = null; live.tex--; }
    var ext = null; try { ext = gl.getExtension("WEBGL_lose_context"); } catch (e) { /* ignore */ }
    if (ext) { try { ext.loseContext(); } catch (e) { /* ignore */ } }
    gl = null;
    if (canvas) { canvas.remove(); canvas = null; cw = ch = 0; }   // a lost context cannot be reused: next play builds a new canvas
  }
  function startLoop() {
    if (running || document.hidden) return;
    if (reduced) { drawOnce(); return; }
    running = true; lastDraw = 0; scr.lastRaf = 0;
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
  function emit(type, extra) { try { var d = { type: type, preset: want ? want.id : null }; if (extra) for (var k in extra) d[k] = extra[k]; window.dispatchEvent(new CustomEvent("titan:fx", { detail: d })); } catch (e) { /* ignore */ } }

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
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
  window.addEventListener("scroll", onScrollDrift, { passive: true, capture: true });
  window.addEventListener("titan:coin", function () { if (!reduced && gl) pulseT0 = performance.now() / 1000; });

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
    if (!safe.built || !safe.tex || performance.now() - safe.built > 5000 || safe.dirty) startSafe();
    canvas.style.zIndex = parts[0].def.layer === "back" ? "0" : "7";
    canvas.style.mixBlendMode = "";
    canvas.style.opacity = "1";
    document.documentElement.setAttribute("data-titanfx", "on");
    scheduleSelf();
    if (!tStart) tStart = performance.now();
    if (reduced) { frozenT = parts[0].def.still || 14; drawOnce(); } else startLoop();
    var vsrc = opts.video !== undefined ? opts.video : videoMap[parts[0].def.id];
    if (vsrc) { if (!videoEl || videoEl.getAttribute('data-src') !== vsrc) playVideo(vsrc, opts.videoOpts); } else if (videoEl) stopVideo();
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
    v.src = src; v.setAttribute("data-src", src);
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
    stats: function () { return { programs: live.programs, textures: live.tex, created: live.created, deleted: live.deleted, layers: layers.length, running: running, scale: LADDER[scaleStep][0], quality: LADDER[scaleStep][1], cost: frameCost.length ? frameCost[frameCost.length - 1] : null, canvas: canvas ? [cw, ch] : null, hasGL: !!gl, bloom: !!glow.tex, par: [+par.x.toFixed(4), +(par.y + drift.v).toFixed(4)], pulse: +pulseValue(performance.now() / 1000).toFixed(3), tapAge: tap.t0 > -50 ? +(performance.now() / 1000 - tap.t0).toFixed(2) : null, audio: audioV, moments: layers.map(function (l) { return l.mo && l.mo.cur ? l.mo.cur.name : null; }), scroll: { step: scr.step, fps: SCROLL_FPS[scr.step], frames: scr.frames || 0, off: +scr.off.toFixed(1) } }; },
    state: function () { return { light: theme.light, level: cfg.level, intensity: cfg.intensity, film: cfg.film, reduced: reduced, playing: want ? want.id : null }; },
    vhead: VHEAD3,
    moment: forceMoment,
    safeCanvas: function () { return safe.cv; },   // debug: the text-safe mask (1/4 resolution)
    benchmark: function (n) {   // synchronous frame-cost probe (1x1 readPixels forces the GPU to finish): {median, p90} in ms at the current quality step
      if (!gl || gl.isContextLost() || !layers.length) return null;
      var a = [], px = new Uint8Array(4); n = n || 12;
      for (var i = 0; i < n + 2; i++) { var t0 = performance.now(); render(performance.now(), false); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (i >= 2) a.push(performance.now() - t0); }
      a.sort(function (x, y) { return x - y; });
      return { median: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * 0.9)].toFixed(2), scale: LADDER[scaleStep][0], quality: LADDER[scaleStep][1] };
    },
    setTextSafe: function (v) { SAFE_K = Math.max(0, Math.min(0.95, +v || 0)); markSafe(0); if (gl && reduced) drawOnce(); },
    refreshSafe: function () { safe.mutDirty = true; markSafe(0); },
    pulse: function () { if (!reduced) pulseT0 = performance.now() / 1000; },
    setPointerParallax: function (v) { PAR_MAX = Math.max(0, Math.min(0.03, +v || 0)); },
    setQuality: function (step) { forced = step == null ? null : Math.max(0, Math.min(LADDER.length - 1, step | 0)); if (forced != null) { scaleStep = forced; cal = null; sizeCanvas(); } },
    _lost: lostRecover
  };
  var target = prevFX || {};
  Object.keys(api).forEach(function (k) { Object.defineProperty(target, k, Object.getOwnPropertyDescriptor(api, k)); });
  window.TitanFX = target;
})();
