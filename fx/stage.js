/* fx/stage.js: TitanStage, the scene library on the GPU kit (theme framework, docs/design/THEME_FRAMEWORK.md, phase D).
   A theme's world is K.stage(id, def): the world writes only its scene (GLSL) and its room data; the stage does the rest of the contract
   the same way for every theme:
     - the camera from the view: a "ray" world orbits its subject (yaw), tilts (pitch), moves toward it (move) and lifts (up), or with
       cam.mode "walk" (an interior) turns the head where you stand (yaw, pitch), walks the way you face (move) and lifts (up); a "flat" world
       gets flatP(uv, depth): screen coordinates seen through the view with parallax by depth (far layers move less)
     - render scale by quality tier (TitanQuality; never lowered on its own), drawn into a target and upsampled when below 1
     - taps (the last 6: uTaps[i] = screen xy, age in seconds, strength; age < 0 = empty), moments (def.moments, uMoment = age, seed, dur,
       index; age < 0 = none), a speed control as an offset on the clock (look id "speed"), the look controls (uLook = the first four, in
       the room's order), the smoothed pointer (uPtr; held at the centre in the room, which reads the pointer itself)
     - debug (tier, scale, cam, look) and dispose
   def = { kind: "ray" | "flat", glsl: "...the scene: vec3 render(vec2 uv) ...", cam: { pos, target, fov, mode } (ray), scale: { low.. } (optional),
           roomCam: { pos, target, fov, mode } (the room's own place, blended to on entering), pre: function (gl, c, S) {} (own passes first),
           grade: a power on the scene's colour before the post module (.75 lifts the darks; default 1),
           moments: [{ name, every: [min, max], dur }], uniforms: function (gl, u, c, S) {}, step: function (c, S) {}, init: function (gl, S) {},
           dispose: function (gl, S) {}, particles: [ kit particle stacks ], post: { post module settings }, room: { ... } }
   GLSL the scene can use (after K.NOISE and K.NOISE3): uRes, uT, uTier (0 low .. 3 max), uView, uLook, uTaps[6], uMoment, uPtr,
   camRay(uv) + uCO (camera position) for a ray world, flatP(uv, depth) for a flat world, tapRing(uv, speed, width) and tapGlow(uv, size),
   ign(fragCoord) (interleaved gradient noise, for jittering loops),
   and after the world's own `float map(vec3 p)`: K.stage.RAY adds march(ro, rd, maxT), nrm(p), shadow(ro, rd, k), ao(p, n). STEPS is set
   by the tier. The scene writes `vec3 render(vec2 uv)` (uv 0..1, y up). */
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var TQ = { low: 0, medium: 1, high: 2, ultra: 3, max: 3 }, SCALE = { low: .5, medium: .62, high: .75, ultra: .9, max: 1 };
  function tier() { try { var q = String(window.TitanQuality.tier()).toLowerCase(); if (TQ[q] != null) return q; } catch (e) { /* no quality setting */ } return "high"; }
  var COMMON = [
    "uniform vec2 uRes; uniform float uT, uTier; uniform vec4 uView, uLook, uMoment; uniform vec4 uTaps[6]; uniform vec2 uPtr;",
    "uniform vec3 uCO, uCF, uCR, uCU; uniform float uFov;",
    "float ASP(){ return uRes.x/uRes.y; }",
    "vec3 camRay(vec2 uv){ vec2 p = (uv-.5)*vec2(ASP(),1.); return normalize(uCF + (p.x*uCR + p.y*uCU)*uFov); }",
    "vec2 flatP(vec2 uv, float depth){ vec2 p = (uv-.5)*vec2(ASP(),1.); return (p - vec2(uView.x, uView.y+uView.w)*depth)*exp(-uView.z*depth); }",
    "float tapRing(vec2 uv, float speed, float width){ float s = 0.; for (int i=0;i<6;i++){ vec4 t = uTaps[i]; if (t.z < 0. || t.z > 4.) continue;",
    "  float d = length((uv-t.xy)*vec2(ASP(),1.)); s += exp(-pow((d - t.z*speed)/width, 2.))*exp(-t.z*1.3)*t.w; } return s; }",
    "float tapGlow(vec2 uv, float size){ float s = 0.; for (int i=0;i<6;i++){ vec4 t = uTaps[i]; if (t.z < 0. || t.z > 4.) continue;",
    "  float d = length((uv-t.xy)*vec2(ASP(),1.)); s += exp(-d*d/(size*size))*exp(-t.z*1.8)*t.w; } return s; }",
    "float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(.06711056,.00583715)))); }",   // interleaved gradient noise: jitter for loops
    "float momentK(){ return uMoment.x < 0. ? 0. : smoothstep(0., .25*uMoment.z, uMoment.x)*smoothstep(uMoment.z, .6*uMoment.z, uMoment.x); }"
  ].join("\n") + "\n";
  /* raymarch helpers: put after the world's own float map(vec3 p) */
  var RAY = [
    "float march(vec3 ro, vec3 rd, float maxT){ float t = 0.; for (int i=0;i<STEPS;i++){ float d = map(ro+rd*t); if (d < .0015*t || t > maxT) break; t += d*.9; } return t; }",
    "vec3 nrm(vec3 p){ vec2 e = vec2(.0015, 0.); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }",
    "float shadow(vec3 ro, vec3 rd, float k){ float r = 1., t = .02; for (int i=0;i<SHADOW_STEPS;i++){ float h = map(ro+rd*t); r = min(r, k*h/t); t += clamp(h, .02, .5); if (r < .02 || t > 12.) break; } return clamp(r, 0., 1.); }",
    "float ao(vec3 p, vec3 n){ float o = 0., w = 1.; for (int i=1;i<=4;i++){ float h = .05*float(i)*float(i); o += w*(h - map(p+n*h)); w *= .6; } return clamp(1. - 2.2*o, 0., 1.); }"
  ].join("\n") + "\n";
  var UP = "#version 300 es\nprecision highp float; out vec4 o; uniform sampler2D uA; uniform vec2 uRes;\nvoid main(){ vec2 u = gl_FragCoord.xy/uRes; o = vec4(texture(uA, u).rgb, 1.); }";

  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

  /* the world's shader compiles in the background (KHR_parallel_shader_compile): a big raymarcher can take a second to link on a phone,
     and a synchronous compile would freeze the page for it. Until it is ready the world draws its dark base; errors log as "[fxk]". */
  function compileAsync(gl, fsSrc) {
    var ext = gl.getExtension("KHR_parallel_shader_compile"), vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, K.FSQ); gl.shaderSource(fs, fsSrc); gl.compileShader(vs); gl.compileShader(fs);
    var p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    var h = { p: p, u: null, state: 0 };
    h.poll = function () {
      if (h.state) return h.state;
      if (ext && !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR)) return 0;
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("[fxk]", gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(p)); h.state = -1; return -1; }
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, a.name); }
      h.u = u; h.state = 1; gl.deleteShader(vs); gl.deleteShader(fs); return 1;
    };
    return h;
  }

  K.stage = function (id, def) {
    var look = K.look || function (i, d) { return d; };
    K.mod(id, function (gl, s, K) {
      var T = tier(), tq = TQ[T], scale = (def.scale && def.scale[T]) || SCALE[T];
      var steps = (def.steps || [48, 64, 90, 120])[tq], sh = (def.shadowSteps || [12, 18, 24, 32])[tq];
      var src = "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + (K.NOISE3 || "") + "#define STEPS " + steps + "\n#define SHADOW_STEPS " + sh +
        "\n#define TIER " + tq + "\n#define GRADE " + (def.grade || 1).toFixed(3) + "\n" + COMMON + def.glsl +
        "\nvoid main(){ o = vec4(min(pow(max(render(gl_FragCoord.xy/uRes), 0.), vec3(GRADE)), vec3(64.)), 1.); }";   /* never an infinity: the bloom would spread it over the screen */
      var pw = compileAsync(gl, src);
      var pu = scale < 1 ? K.compile(K.FSQ, UP) : null; if (scale < 1 && !pu) return null;
      var S = { tier: T, tq: tq, scale: scale, look: look, taps: [], tOff: 0, moment: null, nextMoment: 0, ptr: [.5, .5], view: {}, data: {} };
      var rt = null, seen = K.ptr.tap, TAPS = new Float32Array(24), CAM = def.cam || { pos: [0, 1, -4], target: [0, 1, 0], fov: 1 };
      function mk(w, h) { if (rt && rt.w === w && rt.h === h) return; if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); }
        var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        if (K.halfRT) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); });
        [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); });
        var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); rt = { t: t, f: f, w: w, h: h }; }
      /* the camera: yaw orbits the target, pitch tilts the view, move goes toward the target (never through it), up lifts both */
      /* the room is its own place (owner 2026-10-30: "a third place ... something entirely new"): a world may give it its own camera
         (def.roomCam); entering and leaving the room blends between the two over about a second */
      var CAM0 = CAM;
      function camFor(v) {
        var RC = def.roomCam; if (!RC) return CAM0;
        var want = v.mode === "room" ? 1 : 0, dt = S.c ? Math.min(.1, S.c.dt || .016) : .016;
        S.camK = S.camK == null ? want : S.camK + (want - S.camK) * Math.min(1, dt * 2.2);
        if ((S.c && S.c.still) || S.resetSeen !== K.viewReset) { S.camK = want; S.resetSeen = K.viewReset; }   // a reset puts the camera back at once
        var k = S.camK * S.camK * (3 - 2 * S.camK), L = function (a, b) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
        return { mode: k > .5 ? (RC.mode || CAM0.mode) : CAM0.mode, pos: L(CAM0.pos, RC.pos), target: L(CAM0.target, RC.target), fov: (CAM0.fov || 1) + ((RC.fov || 1) - (CAM0.fov || 1)) * k,
          walk: CAM0.walk, bounds: k > .5 ? RC.bounds : CAM0.bounds };
      }
      function camera(v) {
        CAM = camFor(v); S.camFov = CAM.fov || 1;
        if (CAM.mode === "walk") return walk(v);
        var p = CAM.pos, tg = CAM.target, yaw = v.yaw || 0, d = [p[0] - tg[0], p[1] - tg[1], p[2] - tg[2]], cy = Math.cos(yaw), sy = Math.sin(yaw);
        var dr = [d[0] * cy + d[2] * sy, d[1], -d[0] * sy + d[2] * cy], L = Math.hypot(dr[0], dr[1], dr[2]), k = Math.max(.15, (L - (v.move || 0)) / L), up = v.up || 0;
        var pos = [tg[0] + dr[0] * k, tg[1] + dr[1] * k + up, tg[2] + dr[2] * k], f = norm([tg[0] - pos[0], tg[1] + up - pos[1], tg[2] - pos[2]]);
        var r = norm(cross([0, 1, 0], f)), u = cross(f, r), pit = v.pitch || 0, cp = Math.cos(pit), sp = Math.sin(pit);
        f = norm([f[0] * cp + u[0] * sp, f[1] * cp + u[1] * sp, f[2] * cp + u[2] * sp]); u = cross(f, r);
        return { pos: pos, f: f, r: r, u: u };
      }
      /* an interior (cam.mode "walk"): yaw and pitch turn the head where you stand, move walks the way you face (or along cam.walk, a fixed
         direction such as the hall's axis), up lifts; cam.bounds [[min xyz], [max xyz]] keeps the camera inside the room */
      function walk(v) {
        var p = CAM.pos, f0 = norm([CAM.target[0] - p[0], CAM.target[1] - p[1], CAM.target[2] - p[2]]), yaw = v.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
        var f = [f0[0] * cy + f0[2] * sy, f0[1], -f0[0] * sy + f0[2] * cy], h = CAM.walk ? norm(CAM.walk) : norm([f[0], 0, f[2]]), m = v.move || 0, up = v.up || 0;
        var pos = [p[0] + h[0] * m, p[1] + up, p[2] + h[2] * m], B = CAM.bounds;
        if (B) for (var i = 0; i < 3; i++) pos[i] = Math.min(B[1][i], Math.max(B[0][i], pos[i]));
        var r = norm(cross([0, 1, 0], f)), u = cross(f, r), pit = v.pitch || 0, cp = Math.cos(pit), sp = Math.sin(pit);
        f = norm([f[0] * cp + u[0] * sp, f[1] * cp + u[1] * sp, f[2] * cp + u[2] * sp]); u = cross(f, r);
        return { pos: pos, f: f, r: r, u: u };
      }
      S.startMoment = function (i) { var M = def.moments; if (!M || !M[i] || !S.c) return; var m = M[i]; S.moment = { i: i, t0: S.c.t, dur: m.dur, seed: Math.random() * 100 };
        S.nextMoment = S.c.t + m.dur + m.every[0] * (.5 + Math.random() * .5); };   /* a world can start a moment itself (e.g. on the opening's touch) */
      if (def.init) def.init(gl, S);
      var part = {
        name: id,
        step: function (c) {
          var v = c.view || {}; S.view = v; S.c = c;
          if (v.mode === "backdrop" || !v.mode) S.tOff = 0; else S.tOff += c.dt * (look("speed", 1) - 1);
          var room = v.mode === "room", tx = room ? .5 : c.ptr.x, ty = room ? .5 : c.ptr.y, k = Math.min(1, c.dt * 2.5);
          S.ptr[0] += (tx - S.ptr[0]) * k; S.ptr[1] += (ty - S.ptr[1]) * k;
          if (c.ptr.tap !== seen) { seen = c.ptr.tap; S.taps.unshift({ x: c.ptr.tx, y: c.ptr.ty, t: c.t, s: 1 }); if (S.taps.length > 6) S.taps.length = 6; if (def.onTap) def.onTap(c.ptr.tx, c.ptr.ty, S); }
          var M = def.moments;
          if (M && M.length && !c.still) {
            if (!S.nextMoment) S.nextMoment = c.t + M[0].every[0] * (.4 + Math.random() * .4);
            if (S.moment && c.t - S.moment.t0 > S.moment.dur) S.moment = null;
            if (!S.moment && c.t >= S.nextMoment) { var i = Math.floor(Math.random() * M.length), m = M[i]; S.moment = { i: i, t0: c.t, dur: m.dur, seed: Math.random() * 100 };
              S.nextMoment = c.t + m.every[0] + Math.random() * (m.every[1] - m.every[0]); }
          }
          if (def.step) def.step(c, S);
        },
        draw: function (c) {
          var st = pw.poll();
          if (st === 1 && def.pre) def.pre(gl, c, S);   /* the world's own passes first (a simulation into its textures) */
          if (st !== 1) { K.bindTarget(); gl.clearColor(.006, .006, .01, 1); gl.clear(gl.COLOR_BUFFER_BIT); if (st === 0 && c.still && K.redraw) setTimeout(K.redraw, 150); return; }
          var w = Math.max(2, Math.round(c.w * scale)), h = Math.max(2, Math.round(c.h * scale)), v = S.view || {};
          if (pu) { mk(w, h); gl.bindFramebuffer(gl.FRAMEBUFFER, rt.f); gl.viewport(0, 0, w, h); } else { K.bindTarget(); w = c.w; h = c.h; }
          gl.disable(gl.BLEND); gl.useProgram(pw.p); var u = pw.u, t = c.t + S.tOff;
          gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uT, t); gl.uniform1f(u.uTier, tq);
          gl.uniform4f(u.uView, v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0);
          var L = ((def.room && def.room.look) || []).map(function (x) { return look(x.id, 1); }); while (L.length < 4) L.push(1);
          gl.uniform4f(u.uLook, L[0], L[1], L[2], L[3]);
          for (var i = 0; i < 6; i++) { var tp = S.taps[i]; TAPS.set(tp ? [tp.x, tp.y, c.t - tp.t, tp.s] : [0, 0, -1, 0], i * 4); }
          if (u.uTaps) gl.uniform4fv(u.uTaps, TAPS);
          var m = S.moment; if (u.uMoment) gl.uniform4f(u.uMoment, m ? c.t - m.t0 : -1, m ? m.seed : 0, m ? m.dur : 1, m ? m.i : 0);
          if (u.uPtr) gl.uniform2f(u.uPtr, S.ptr[0], S.ptr[1]);
          if (def.kind === "ray") { var B = camera(v); S.cam = B;
            gl.uniform3f(u.uCO, B.pos[0], B.pos[1], B.pos[2]); gl.uniform3f(u.uCF, B.f[0], B.f[1], B.f[2]); gl.uniform3f(u.uCR, B.r[0], B.r[1], B.r[2]); gl.uniform3f(u.uCU, B.u[0], B.u[1], B.u[2]);
            gl.uniform1f(u.uFov, CAM.fov || 1); }
          if (def.uniforms) def.uniforms(gl, u, c, S);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (pu) { K.bindTarget(); gl.useProgram(pu.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rt.t); gl.uniform1i(pu.u.uA, 0); gl.uniform2f(pu.u.uRes, c.w, c.h); gl.drawArrays(gl.TRIANGLES, 0, 3); }
        },
        debug: function () { var v = S.view || {}, L = {}; ((def.room && def.room.look) || []).forEach(function (x) { L[x.id] = look(x.id, 1); });
          var cam = def.kind === "ray" && S.cam ? S.cam.pos.concat(S.cam.f) : [v.yaw || 0, v.pitch || 0, v.move || 0, v.up || 0];
          return { tier: T, scale: scale, ready: pw.state !== 0, failed: pw.state === -1, cam: cam.map(function (x) { return +x.toFixed(3); }), look: L, moment: S.moment ? def.moments[S.moment.i].name : null, taps: S.taps.length }; },
        dispose: function () { if (def.dispose) def.dispose(gl, S); gl.deleteProgram(pw.p); if (pu) gl.deleteProgram(pu.p); if (rt) { gl.deleteTexture(rt.t); gl.deleteFramebuffer(rt.f); } }
      };
      return part;
    });
    K.themes[id] = { stack: [{ mod: id }].concat(def.particles || [], [Object.assign({ mod: "post", bloom: 1, threshold: .8, knee: .5, exposure: 1, aberr: .08, grain: .03, vig: .5 }, def.post || {})]), room: def.room };
  };
  K.stage.RAY = RAY;
})();
