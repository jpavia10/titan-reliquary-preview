/* Nocturne intro v2 (Gemini, theme #51, 2026-10-24).
   Beeswax candlelight reveals the gilded cast-iron harp and vibrating overstrung strings of a concert grand piano. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*R)/R.y; float A = R.x/R.y, t = T;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 bCenter = vec2(0.0, U0.x);",
    "  vec2 bp = (p - bCenter) / S; float r = length(bp); float a = atan(bp.y, bp.x); float bRad = 0.226;",
    "  vec2 rDir = bp / (r + 1e-5); vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  float candleIn = smoothstep(0.0, 1.5, t);",
    "  vec2 c1XY = vec2(-0.30*cos(t*0.5), 0.26*sin(t*0.4));",
    "  vec3 L = normalize(vec3(c1XY - bp, 0.44)); vec3 V = vec3(0.0, 0.0, 1.0); vec3 H = normalize(L + V);",
    "  float uTreb = bp.x*0.848 + bp.y*0.530;",
    "  float vTreb = -bp.x*0.530 + bp.y*0.848;",
    "  float pluckEnv = exp(-abs(t - 1.4)*2.5);",
    "  float trebPhase = (uTreb + 0.005*sin(vTreb*18.0 + t*28.0)*pluckEnv)*125.0;",
    "  float trebWire = smoothstep(0.15, 0.85, cos(trebPhase));",
    "  vec3 trebN = normalize(vec3(-0.848*sin(trebPhase)*0.75, -0.530*sin(trebPhase)*0.75, 1.0));",
    "  float trebSpec = pow(max(0.0, dot(trebN, H)), 48.0) * trebWire;",
    "  vec3 col = (vec3(0.045, 0.028, 0.018) + vec3(0.55, 0.58, 0.65)*trebWire*0.22 + vec3(0.96, 0.84, 0.58)*trebSpec*0.65) * candleIn;",
    "  float portA = (fract(a*8.0/6.2831853) - 0.5)*2.0;",
    "  float portR = (r - (bRad + 0.095))*18.0;",
    "  float harpPlate = smoothstep(0.55, 0.68, length(vec2(portA*0.75, portR))) * smoothstep(bRad+0.02, bRad+0.04, r) * smoothstep(bRad+0.18, bRad+0.15, r);",
    "  float harpRing = smoothstep(0.022, 0.008, abs(r - (bRad + 0.165)));",
    "  float goldMask = clamp(harpPlate*0.65 + harpRing, 0.0, 1.0) * candleIn;",
    "  vec3 hN = normalize(vec3(-rDir*sin((r - bRad)*45.0)*0.45, 1.0));",
    "  float hSpec = pow(max(0.0, dot(hN, H)), 38.0);",
    "  col = mix(col, vec3(0.68, 0.50, 0.20)*0.65 + vec3(1.0, 0.88, 0.58)*hSpec*0.60, goldMask*0.82);",
    "  if(r < bRad + 0.018){",
    "    float bezel = smoothstep(bRad+0.018, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    col = mix(col, vec3(0.84, 0.66, 0.30), bezel*0.88);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb;",
    "      card = card / (1.0 + 0.35*card);",
    "      float rev = smoothstep(1.85, 2.75, t);",
    "      col = mix(col, card*0.68*rev, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float chordPulse = exp(-abs(t - 1.9)*6.0) * exp(-abs(r - bRad)*14.0);",
    "  col += vec3(0.96, 0.78, 0.40) * chordPulse * 0.35;",
    "  col *= 1.0 - 0.34*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#181422"); gr.addColorStop(1, "#07070c");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#e6be6a"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(196, 189, 212, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#f2eff8"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("candlelit rosewood & gilded harp", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("in the late-night recital salon", W / 2, 352);
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

  I.reg("nocturne", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.01 : -0.02, brad = port ? 0.112 : 0.225;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#07070c"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#e6be6a"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#f2eff8"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["hall", "roomTone", "vinyl", "bowl"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "hall", 0.0, [0, 4.5], 1.0, 0.32, 0.8, 1800)) {
        A.noise(0.0, 4.4, { type: "lowpass", f: 420, q: 0.8, v: 0.03 });
      }
      cut(A, "bowl", 1.2, [0, 3.2], 0.92, 0.22, 0.7, 2000);
      cut(A, "vinyl", 0.0, [0, 4.4], 1.0, 0.14, 0.6, 2600);
    }
  });
})();
