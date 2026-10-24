/* Cloud Forest intro v2 (Gemini, theme #44, 2026-10-24; plan in notes/agents/themes-37-50.md:
   "Rise through fern layers into light, the name in dewdrops").
   v2 changes per Claude's review (2026-10-24):
   1. Fixed GLSL ES 1.00 compilation error: replaced integer '%' operator with mod(float(i), 3.0).
   2. Matched the organic drooping Cyathea tree-fern fronds, subsurface sun transmission, and clear basin halo
      (clearMask = smoothstep(bRad+0.035, bRad+0.155, bDist)) so fronds never cover TITAN RELIQUARY.
   3. Inscribed the title card inside the circular medallion so it never clips on phone or desktop. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    "vec2 fernFrond(vec2 p, float len, float wid, float sway, float droopDir){",
    "  float t = clamp(p.x/len, 0.0, 1.0);",
    "  float arch = droopDir * (0.14*t*t + 0.09*t*t*t) + sin(p.x*3.0 - sway)*0.028*t;",
    "  p.y -= arch;",
    "  if(p.x < -0.02 || p.x > len + 0.03) return vec2(1.0, 0.0);",
    "  float env = wid * pow(sin(clamp(t, 0.0, 1.0)*3.14159265), 0.75) * (1.0 - 0.28*t);",
    "  float rachisW = 0.0045*(1.0 - 0.65*t);",
    "  float rachis = abs(p.y) - rachisW;",
    "  float py = abs(p.y);",
    "  float u = clamp(py / max(env, 1e-4), 0.0, 1.5);",
    "  float freq = 34.0;",
    "  float bend = 0.26*py + 0.95*py*py;",
    "  float localX = (p.x - bend)*freq;",
    "  float pinCell = (fract(localX) - 0.5)/freq;",
    "  float pinnule = 0.0016 * sin(py*210.0) * smoothstep(0.1, 0.8, u);",
    "  float pinHalfW = (0.0105*(1.0 - 0.32*t) * (1.0 - 0.55*u*u) + pinnule) * smoothstep(1.06, 0.78, u);",
    "  float pin = max(abs(pinCell) - pinHalfW, py - env);",
    "  float d = min(rachis, pin);",
    "  float trans = clamp(u*0.75 + 0.25*(1.0 - abs(pinCell)/max(pinHalfW, 1e-4)), 0.0, 1.0) * step(rachisW, py);",
    "  return vec2(d, trans);",
    "}",
    "vec2 canopyLayer(vec2 p, float sc, float seed, float t, float partOpen){",
    "  vec2 best = vec2(1.0, 0.0);",
    "  for(int i=0; i<6; i++){",
    "    float fi = float(i) + seed*7.0;",
    "    float side = (i<3) ? -1.0 : 1.0;",
    "    float row = mod(float(i), 3.0);",
    "    vec2 orig = vec2(side*(0.40 + 0.16*partOpen + 0.14*h1(fi*1.3)), 0.48 - row*0.30 + 0.07*h1(fi*2.1));",
    "    float ang = (side<0.0 ? -0.28 - row*0.14 : 3.42 + row*0.14) + (h1(fi*3.7)-0.5)*0.22 + 0.04*sin(t*0.65 + fi);",
    "    float cs = cos(ang), sn = sin(ang);",
    "    vec2 lp = (p - orig)*sc;",
    "    lp = vec2(cs*lp.x + sn*lp.y, -sn*lp.x + cs*lp.y);",
    "    vec2 f = fernFrond(lp, 0.64, 0.145, t*0.85 + fi, side);",
    "    f.x /= sc;",
    "    if(f.x < best.x) best = f;",
    "  }",
    "  return best;",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*R)/R.y; float A = R.x/R.y, PX = 1.0/R.y, t = T;",
    "  float rise = smoothstep(0.0, 2.2, t); rise = rise*rise*(3.0-2.0*rise);",
    "  float dawn = smoothstep(0.7, 2.4, t);",
    "  vec2 camP = p + vec2(0.0, (1.0 - rise)*0.24);",
    "  vec3 col = mix(vec3(0.010, 0.026, 0.017), vec3(0.045, 0.125, 0.082), smoothstep(-0.55, 0.58, camP.y) * (0.35 + 0.65*dawn));",
    "  vec2 bCenter = vec2(0.0, U0.x);",
    "  vec2 bp = camP - bCenter; float bRad = U0.y; float bDist = length(bp);",
    "  float clearMask = smoothstep(bRad + 0.035, bRad + 0.155, bDist * mix(0.65, 1.0, rise));",
    "  vec2 sunPos = vec2(-0.34*A, 0.64);",
    "  vec2 toP = camP - sunPos; float rDist = length(toP); float rAng = atan(toP.y, toP.x);",
    "  float s1 = 0.5 + 0.5*cos((rAng + 0.92)*14.0 + sin(rAng*5.0 + t*0.15)*1.2);",
    "  float s2 = 0.5 + 0.5*sin((rAng + 0.85)*23.0 - t*0.10);",
    "  float cone = smoothstep(-1.52, -0.42, rAng) * smoothstep(0.02, -0.52, rAng);",
    "  float shafts = (0.35*pow(s1, 1.8) + 0.65*pow(s1*s2, 2.4)) * cone;",
    "  float mist = vn(camP*4.0 + vec2(t*0.04, -t*0.02))*0.6 + vn(camP*8.5)*0.4;",
    "  float beam = shafts * (0.38 + 1.55*mist*mist) * exp(-rDist*0.78) * dawn;",
    "  vec2 fFar = canopyLayer(camP, 1.32, 1.0, t*0.55, rise);",
    "  float aFar = smoothstep(PX*6.5, -PX*4.5, fFar.x) * clearMask;",
    "  vec3 cFar = vec3(0.024, 0.068, 0.045) + vec3(0.16, 0.34, 0.14)*beam*0.6 + vec3(0.22, 0.46, 0.18)*fFar.y*beam*0.8;",
    "  col = mix(col, cFar, aFar*0.82);",
    "  col += vec3(0.36, 0.66, 0.28) * beam * 0.34;",
    "  vec2 fMid = canopyLayer(camP, 1.0, 2.0, t*0.75, rise);",
    "  float aMid = smoothstep(PX*2.2, -PX*1.5, fMid.x) * clearMask;",
    "  float midRim = smoothstep(0.014, 0.0, abs(fMid.x)) * (0.35 + 1.6*beam);",
    "  vec3 cMid = vec3(0.015, 0.044, 0.026) + vec3(0.38, 0.72, 0.22)*fMid.y*(0.25 + 1.35*beam) + vec3(0.52, 0.86, 0.36)*midRim;",
    "  col = mix(col, cMid, aMid);",
    // Mossy basalt basin & dewdrop title reveal
    "  float dropT = max(0.0, t - 2.0);",
    "  float rip = (t > 2.0) ? sin(bDist*44.0 - dropT*15.0) * exp(-dropT*1.2) * exp(-bDist*5.5) : 0.0;",
    "  if(bDist < bRad + 0.044){",
    "    float rim = smoothstep(bRad+0.044, bRad+0.016, bDist) * smoothstep(bRad-0.010, bRad+0.012, bDist);",
    "    float m1 = vn(bp*18.0), m2 = vn(bp*40.0 + 3.7);",
    "    vec3 stone = mix(vec3(0.026, 0.038, 0.032), vec3(0.14, 0.34, 0.11)*(0.5 + 1.2*beam), smoothstep(0.35, 0.68, m1*0.7 + m2*0.3));",
    "    col = mix(col, stone, rim);",
    "    if(bDist < bRad){",
    "      vec2 ruv = clamp(bp / (bRad*2.0) + 0.5 + normalize(bp + 1e-4)*rip*0.016, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, ruv).rgb * vec3(0.90, 0.98, 0.88);",
    "      float rev = smoothstep(2.05, 2.85, t) * smoothstep(0.0, 0.02, (t - 2.0)*0.48 - bDist);",
    "      vec3 water = mix(vec3(0.05, 0.12, 0.08), card*0.64, rev);",
    "      water += vec3(0.42, 0.74, 0.36)*beam*0.18;",
    "      water += vec3(0.68, 0.94, 0.60)*max(0.0, rip)*0.36;",
    "      col = mix(col, water, smoothstep(bRad, bRad-0.008, bDist));",
    "    }",
    "  }",
    "  col += vec3(0.42, 0.74, 0.32) * beam * 0.28;",
    "  if(t > 1.35 && t < 2.02){",
    "    float dy = mix(0.38, bCenter.y, pow((t - 1.35)/0.65, 2.0));",
    "    float dd = length((p - vec2(0.0, dy))*vec2(1.4, 0.85));",
    "    col += vec3(0.78, 0.98, 0.72) * smoothstep(0.016, 0.002, dd);",
    "  }",
    "  vec2 fNear = canopyLayer(camP, 0.78, 3.5, t*1.0, rise);",
    "  float aNear = smoothstep(PX*1.4, -PX*1.2, fNear.x) * clearMask;",
    "  float nearRim = smoothstep(0.009, 0.0, abs(fNear.x)) * (0.3 + 1.4*beam);",
    "  vec3 cNear = vec3(0.008, 0.024, 0.015) + vec3(0.34, 0.68, 0.20)*fNear.y*(0.2 + 1.25*beam) + vec3(0.55, 0.90, 0.38)*nearRim;",
    "  col = mix(col, cNear, aNear);",
    "  col *= 1.0 - 0.36*smoothstep(0.40, 1.04, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.62)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#102419"); gr.addColorStop(1, "#050c08");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#a6e27a"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(210, 244, 184, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#e9f5ee"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("cloud forest reliquary", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("beneath the montane canopy", W / 2, 352);
    return c;
  }

  var BUF = {}, LOADING = {};
  function warm(ctx, name, dir) {
    if (BUF[name] || LOADING[name] || !window.fetch) return; LOADING[name] = 1;
    var ext = (function () { try { return new Audio().canPlayType('audio/webm; codecs="opus"') ? ".webm" : ".m4a"; } catch (e) { return ".m4a"; } })();
    fetch("audio/" + (dir || "ambience") + "/" + name + ext).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return; return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
    }).then(function (b) { if (b) BUF[name] = b; }).catch(function () { LOADING[name] = 0; });
  }
  function cut(A, name, s, seg, rate, v, rel, lp) {
    var b = BUF[name]; if (!b) return false;
    var x = A.ctx, src = x.createBufferSource(), g = x.createGain(), t = A.t0 + s, end = t + seg[1] / rate;
    src.buffer = b; src.playbackRate.value = rate;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, Math.max(t, end - rel)); g.gain.linearRampToValueAtTime(0, end);
    var last = g; if (lp) { var f = x.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; g.connect(f); last = f; }
    src.connect(g); last.connect(A.out); src.start(t, seg[0], seg[1]); A.nodes.push(src); return true;
  }

  I.reg("canopy", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.02 : -0.03, brad = port ? 0.225 : 0.255;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#060d09"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#a6e27a"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#e9f5ee"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["drips", "birds", "frogs", "windTrees"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "windTrees", 0.0, [0, 4.5], 1.0, 0.28, 0.8, 1400)) {
        A.noise(0.0, 4.4, { type: "bandpass", f: 650, q: 0.7, v: 0.035, shape: [[0.4, 0.035], [2.2, 0.04], [4.4, 0.0001]] });
      }
      if (!cut(A, "drips", 0.3, [0, 4.2], 1.0, 0.38, 0.6, 2800)) {
        A.noise(2.0, 0.04, { type: "bandpass", f: 1850, q: 6.0, v: 0.06 });
      }
      cut(A, "birds", 1.2, [0, 3.3], 1.0, 0.22, 0.7, 3600);
      cut(A, "frogs", 1.8, [0, 2.7], 1.0, 0.20, 0.6, 2400);
    }
  });
})();
