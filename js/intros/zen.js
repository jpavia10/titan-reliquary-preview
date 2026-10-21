/* Zen Garden intro (Grok, 2026-10-20, v2: GPU sand). Overhead, moonlit karesansui made of grains, not lines. Up to ~1M
   particles on desktop and ~260k on a phone (auto-scaled by screen class) stream across the garden on a curl-noise current,
   each grain integrated on the GPU (WebGL2 float ping-pong: one simulation pass per 1/60 s step, deterministic, so seeking
   and skipping replay exactly). A five-tine rake sweeps through and parts the current into combed wakes; then the flow
   itself carves the name: grains are pushed out of the letterforms and pile up on their rims, so TITAN RELIQUARY appears as
   dark grooves edged in bright sand, and the current slows to stillness. A vermilion seal is pressed last.
   Same technique as the Zen Garden theme's own particle field (curl noise + float-texture integration).
   Fallbacks: no float render targets / Lite / no WebGL2 -> a 2D canvas with ~5k grains on the same field and the carved name;
   reduced motion -> the final still. Sound: sand hiss that follows the flow, the rake's scrape, a wooden knock, a singing bowl. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var VQ = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var COMMON = "#version 300 es\nprecision highp float;\n" +
    "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n" +
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}\n" +
    "float psi(vec2 p,float t){return vn(p*vec2(2.2,3.)+vec2(t*.07,0.))*.6+vn(p*6.+vec2(0.,t*.13)+7.)*.25;}\n";
  var INIT = COMMON + "uint hu(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}out vec4 o;void main(){uvec2 c=uvec2(gl_FragCoord.xy);uint k=hu(c.x+hu(c.y*1973u));o=vec4(float(hu(k)&0xffffffu)/16777216.,float(hu(k+1u)&0xffffffu)/16777216.,0.,float(hu(k+2u)&0xffffffu)/16777216.);}";
  var SIM = COMMON + [
    "uniform sampler2D S;uniform sampler2D M;uniform float t,dt,asp,rx,rake,carve,settle;out vec4 o;",
    "void main(){vec4 s=texelFetch(S,ivec2(gl_FragCoord.xy),0);vec2 p=s.xy;float e=.004;",
    " vec2 q=p*vec2(asp,1.);float a=psi(q+vec2(0.,e),t),b=psi(q-vec2(0.,e),t),c=psi(q+vec2(e,0.),t),d=psi(q-vec2(e,0.),t);",
    " vec2 v=vec2((a-b),-(c-d))/(2.*e)*.035+vec2(.045,.004*sin(p.y*9.+t));",
    /* the rake: a curved line sweeping right->left; grains near it are shoved sideways and combed into five tines */
    " float lx=rx+.06*sin(p.y*5.+1.),dx=p.x-lx;float near=exp(-dx*dx*160.)*rake;v.x-=near*.35;",
    " float combed=smoothstep(.0,.08,dx)*rake+step(.5,rake)*0.;float ph=p.y*170.+sin(p.x*7.)*3.;float keep=1.-smoothstep(.02,.2,texture(M,p).r)*carve;v.y-=sin(ph)*combed*.007*keep;",
    /* carving: push out of the letterforms (down the gradient of the blurred mask) */
    " float m=texture(M,p).r;vec2 g=vec2(texture(M,p+vec2(.003,0.)).r-texture(M,p-vec2(.003,0.)).r,texture(M,p+vec2(0.,.003)).r-texture(M,p-vec2(0.,.003)).r);",
    " v-=normalize(g+1e-5)*smoothstep(.32,.5,m)*carve*1.2; v*=mix(1.,mix(1.,.04,settle),step(.0,1.));",
    " p+=v*dt; s.z+=dt; if(p.x>1.)p.x-=1.; if(p.x<0.)p.x+=1.; if(p.y>1.)p.y-=1.; if(p.y<0.)p.y+=1.;",
    " o=vec4(p,s.z,s.w);}"].join("\n");
  var RV = "#version 300 es\nprecision highp float;uniform sampler2D S,M;uniform int N;uniform float ps,carve;out float w;out float lum;out vec3 tint;" +
    "void main(){ivec2 c=ivec2(gl_VertexID%N,gl_VertexID/N);vec4 s=texelFetch(S,c,0);vec2 p=s.xy;gl_Position=vec4(p*2.-1.,0.,1.);gl_PointSize=ps;w=s.w;" +
    "float e=.004;vec2 g=vec2(texture(M,p+vec2(e,0.)).r-texture(M,p-vec2(e,0.)).r,texture(M,p+vec2(0.,e)).r-texture(M,p-vec2(0.,e)).r);float m=texture(M,p).r;" +
    "float rim=smoothstep(.0,.08,m)*(1.-smoothstep(.25,.45,m))*carve;float lit=dot(normalize(g+1e-5),normalize(vec2(.6,-.8)));" +
    "float moon=.55+.6*smoothstep(1.3,0.,length(p-vec2(.2,.95)));lum=(.75+.25*fract(s.w*7.3))*moon*(1.+rim*(1.6*max(lit,0.)-.5*max(-lit,0.)));tint=mix(vec3(1.),vec3(.78,.86,1.05),.5*moon-.2);}";
  var RF = "#version 300 es\nprecision highp float;in float w;in float lum;in vec3 tint;uniform float al;out vec4 o;void main(){vec3 c=mix(vec3(.82,.78,.68),vec3(.95,.92,.84),w)*lum*tint;o=vec4(c*al,al);}";
  function mask(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), fs = Math.min(W * 0.15, 96); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.font = "600 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    g.shadowColor = "#fff"; g.shadowBlur = fs * 0.06; g.shadowOffsetX = 10000; g.fillText("TITAN", W / 2 - 10000, H * 0.44); g.fillText("RELIQUARY", W / 2 - 10000, H * 0.44 + fs * 1.05);
    g.shadowBlur = 0; g.shadowOffsetX = 0; g.globalAlpha = 0.7; g.fillText("TITAN", W / 2, H * 0.44); g.fillText("RELIQUARY", W / 2, H * 0.44 + fs * 1.05); return { c: c, fs: fs };
  }
  function setup(C) {
    if (C.lite) return null;
    var cv = document.createElement("canvas"); cv.className = "ts-mo ts-mogl"; cv.setAttribute("aria-hidden", "true");
    var x = null; try { x = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" }); } catch (e) { x = null; }
    if (!x || !x.getExtension("EXT_color_buffer_float")) return null;
    function prog(vs, fs) { function sh(ty, src) { var s = x.createShader(ty); x.shaderSource(s, src); x.compileShader(s); if (!x.getShaderParameter(s, x.COMPILE_STATUS)) { if (window.console) console.warn("zen", x.getShaderInfoLog(s)); return null; } return s; }
      var a = sh(x.VERTEX_SHADER, vs), b = sh(x.FRAGMENT_SHADER, fs); if (!a || !b) return null; var p = x.createProgram(); x.attachShader(p, a); x.attachShader(p, b); x.bindAttribLocation(p, 0, "p"); x.linkProgram(p); return x.getProgramParameter(p, x.LINK_STATUS) ? p : null; }
    var Pi = prog(VQ, INIT), Ps = prog(VQ, SIM), Pr = prog(RV, RF); if (!Pi || !Ps || !Pr) return null;
    var big = !C.small && Math.max(C.W, C.H) > 900, N = big ? 1024 : 512;
    var b = x.createBuffer(); x.bindBuffer(x.ARRAY_BUFFER, b); x.bufferData(x.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), x.STATIC_DRAW); x.enableVertexAttribArray(0); x.vertexAttribPointer(0, 2, x.FLOAT, false, 0, 0);
    function tex(w, h, fl) { var t = x.createTexture(); x.bindTexture(x.TEXTURE_2D, t); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, fl ? x.LINEAR : x.NEAREST); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, fl ? x.LINEAR : x.NEAREST);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_S, x.CLAMP_TO_EDGE); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_T, x.CLAMP_TO_EDGE); return t; }
    var T = [], F = []; for (var i = 0; i < 2; i++) { T.push(tex()); x.texImage2D(x.TEXTURE_2D, 0, x.RGBA32F, N, N, 0, x.RGBA, x.FLOAT, null); var f = x.createFramebuffer(); x.bindFramebuffer(x.FRAMEBUFFER, f); x.framebufferTexture2D(x.FRAMEBUFFER, x.COLOR_ATTACHMENT0, x.TEXTURE_2D, T[i], 0);
      if (x.checkFramebufferStatus(x.FRAMEBUFFER) !== x.FRAMEBUFFER_COMPLETE) return null; F.push(f); }
    x.bindFramebuffer(x.FRAMEBUFFER, null);
    var mk = mask(Math.round(C.W * 0.5), Math.round(C.H * 0.5)); C.fs = mk.fs * 2; var Mt = tex(0, 0, true); x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, true); x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, x.RGBA, x.UNSIGNED_BYTE, mk.c);
    var U = {}; ["S", "M", "t", "dt", "asp", "rx", "rake", "carve", "settle"].forEach(function (n) { U[n] = x.getUniformLocation(Ps, n); });
    var Ur = { M: x.getUniformLocation(Pr, "M"), carve: x.getUniformLocation(Pr, "carve"), S: x.getUniformLocation(Pr, "S"), N: x.getUniformLocation(Pr, "N"), ps: x.getUniformLocation(Pr, "ps"), al: x.getUniformLocation(Pr, "al") };
    var L = C._gl = { cv: cv, x: x, N: N, T: T, F: F, cur: 0, simT: -1, Pi: Pi, Ps: Ps, Pr: Pr, U: U, Ur: Ur, Mt: Mt };
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); C._glDead = true; cv.style.display = "none"; });
    var d = I.res(C, big ? 0.8 : 0.7); cv.width = Math.round(C.W * d); cv.height = Math.round(C.H * d);
    C.root.insertBefore(cv, C.cv); return L;
  }
  function P(t) { return { rx: K.lerp(1.15, -0.15, K.eio(K.seg(t, 0.7, 2.0))), rake: K.seg(t, 0.7, 0.8) * (1 - K.seg(t, 1.9, 2.0)), carve: K.eio(K.seg(t, 1.9, 2.8)), settle: K.eio(K.seg(t, 2.6, 3.6)) }; }
  function gpu(C, t) {
    var L = C._gl, x = L.x; if (C._glDead) return false; var dt = 1 / 60;
    if (L.simT < 0 || t < L.simT - 1e-4) { x.useProgram(L.Pi); x.bindFramebuffer(x.FRAMEBUFFER, L.F[0]); x.viewport(0, 0, L.N, L.N); x.drawArrays(x.TRIANGLES, 0, 3); L.cur = 0; L.simT = 0; }
    x.useProgram(L.Ps); x.uniform1i(L.U.S, 0); x.uniform1i(L.U.M, 1); x.uniform1f(L.U.dt, dt); x.uniform1f(L.U.asp, C.W / C.H); x.activeTexture(x.TEXTURE1); x.bindTexture(x.TEXTURE_2D, L.Mt); x.activeTexture(x.TEXTURE0);
    var n = 0; while (L.simT + dt <= t + 1e-6 && n++ < 400) { var p = P(L.simT); x.uniform1f(L.U.t, L.simT); x.uniform1f(L.U.rx, p.rx); x.uniform1f(L.U.rake, p.rake); x.uniform1f(L.U.carve, p.carve); x.uniform1f(L.U.settle, p.settle);
      x.bindTexture(x.TEXTURE_2D, L.T[L.cur]); x.bindFramebuffer(x.FRAMEBUFFER, L.F[1 - L.cur]); x.viewport(0, 0, L.N, L.N); x.drawArrays(x.TRIANGLES, 0, 3); L.cur = 1 - L.cur; L.simT += dt; }
    x.bindFramebuffer(x.FRAMEBUFFER, null); x.viewport(0, 0, L.cv.width, L.cv.height); x.clearColor(0.06, 0.055, 0.05, 1); x.clear(x.COLOR_BUFFER_BIT);
    x.useProgram(L.Pr); x.bindTexture(x.TEXTURE_2D, L.T[L.cur]); x.uniform1i(L.Ur.S, 0); x.uniform1i(L.Ur.N, L.N); x.uniform1i(L.Ur.M, 1); x.uniform1f(L.Ur.carve, P(t).carve); x.activeTexture(x.TEXTURE1); x.bindTexture(x.TEXTURE_2D, L.Mt); x.activeTexture(x.TEXTURE0);
    var density = (L.N * L.N) / (L.cv.width * L.cv.height); x.uniform1f(L.Ur.ps, density < 0.6 ? 1.6 : 1.0); x.uniform1f(L.Ur.al, Math.min(0.5, 0.2 / Math.max(0.3, density)));
    x.enable(x.BLEND); x.blendFunc(x.ONE, x.ONE); x.drawArrays(x.POINTS, 0, L.N * L.N); x.disable(x.BLEND); return true;
  }
  function cpu(C, t) {                                   // 2D fallback: a few thousand grains on the same idea, analytic in t
    var g = C.g, W = C.W, H = C.H, p = P(t), i;
    g.fillStyle = "#1a1714"; g.fillRect(0, 0, W, H); g.fillStyle = "rgba(225,215,190,.55)";
    for (i = 0; i < (C.lite ? 2500 : 5000); i++) { var x0 = K.hash(i), y0 = K.hash(i + 0.5), x = (x0 + t * 0.045 * (1 - 0.9 * p.settle) + 0.02 * Math.sin(y0 * 12 + t)) % 1, y = y0 + 0.01 * Math.sin(x0 * 20 + t * 2);
      var dx = x - (p.rx + 0.06 * Math.sin(y * 5 + 1)); if (p.rake && Math.abs(dx) < 0.03) x += Math.sign(dx) * 0.03; g.fillRect(x * W, y * H, 1.3, 1.3); }
    if (p.carve > 0) { var fs = Math.min(W * 0.15, 96); g.save(); g.globalAlpha = p.carve; g.font = "600 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 3; g.strokeStyle = "rgba(240,230,205,.8)"; g.fillStyle = "#0d0b0a";
      ["TITAN", "RELIQUARY"].forEach(function (s, k) { g.strokeText(s, W / 2, H * 0.44 + k * fs * 1.05); g.fillText(s, W / 2, H * 0.44 + k * fs * 1.05); }); g.restore(); }
  }
  I.reg("zen", {
    dur: 4.2, still: 4.0,
    init: function (C) { C.L = setup(C); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      g.clearRect(0, 0, W, H);
      if (!(C.L && gpu(C, t))) cpu(C, t);
      // moonlight + vignette over the sand
      var v = g.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8); v.addColorStop(0, "rgba(170,195,240,.16)"); v.addColorStop(0.6, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.55)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
      // the rake head, riding the sweep
      var p = P(t); if (p.rake > 0) { var rx = p.rx * W; g.save(); g.globalAlpha = p.rake; g.fillStyle = "#3a2a1c"; g.fillRect(rx - 6, H * 0.18, 12, H * 0.64); g.fillStyle = "rgba(255,230,190,.2)"; g.fillRect(rx - 6, H * 0.18, 2, H * 0.64); g.fillStyle = "#2a1e14"; g.fillRect(rx + 6, H * 0.49, W * 0.6, 6); g.restore(); }
      // the seal
      var sl = K.eob(seg(t, 3.3, 3.55), 2); if (sl > 0) { var fs = C.fs || Math.min(W * 0.15, 96), sx = W / 2 + fs * 2.3 > W - 30 ? W - 48 : W / 2 + fs * 2.3, sy = H * 0.44 + fs * 1.9, sz = 34 * (2 - sl);
        g.save(); g.globalAlpha = Math.min(1, sl); g.translate(W * 0.78, sy); g.rotate(0.05); g.fillStyle = "#c8322a"; g.fillRect(-sz / 2, -sz / 2, sz, sz); g.fillStyle = "#f6e6d0"; g.font = "700 " + sz * 0.34 + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("\u5bf6", 0, -sz * 0.15); g.fillText("\u7bb1", 0, sz * 0.22); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 3.6, { type: "bandpass", f: 5200, q: 0.7, shape: [[0.4, 0.05], [2.0, 0.06], [3.3, 0.012], [3.6, 0.0001]] });   // the sand's hiss, fading as it settles
      A.noise(0.7, 1.3, { type: "bandpass", f: 1400, to: 900, q: 3, shape: [[0.15, 0.1], [1.1, 0.08], [1.3, 0.0001]] });            // the rake
      A.tone(0.7, 180, 0.15, { type: "triangle", v: 0.15, to: 120 });                                                                 // wood knock as it bites
      A.noise(1.9, 0.9, { type: "lowpass", f: 700, to: 300, v: 0.05 });                                                               // the carve
      A.tone(3.32, 140, 0.2, { type: "triangle", v: 0.18, to: 90 });                                                                  // seal
      A.bell(3.35, 196, 3.0, 0.08, [[1, 1], [2.71, 0.45], [5.15, 0.2], [8.2, 0.08]]); A.bell(3.36, 196 * 1.007, 2.5, 0.04, [[1, 1], [2.71, 0.3]]);   // singing bowl (beating)
    }
  });
})();
