/* Zen intro v2 (Gemini, theme #52, 2026-10-24).
   Wooden rake tines draw 3D concentric and parallel grooves through white Shirakawa gravel around a mossy Kurama stone. */
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
    "  vec2 lXY = vec2(0.32*cos(t*0.45), 0.28*sin(t*0.38));",
    "  vec3 L = normalize(vec3(lXY - bp, 0.46)); vec3 V = vec3(0.0, 0.0, 1.0); vec3 H = normalize(L + V);",
    "  float rakeProgress = smoothstep(0.0, 1.8, t);",
    "  float ringWeight1 = exp(-max(0.0, r - bRad)*5.5);",
    "  float grooveField = mix(bp.y + 0.08*sin(bp.x*6.0), r, ringWeight1);",
    "  float groovePhase = grooveField * 135.0;",
    "  float ridgeSlope = cos(groovePhase) * rakeProgress;",
    "  vec2 gGrad = mix(vec2(0.0, 1.0), rDir, ringWeight1) * ridgeSlope * 0.72;",
    "  vec3 gN = normalize(vec3(-gGrad, 1.0));",
    "  float gDiff = max(0.0, dot(gN, L));",
    "  float gSpec = pow(max(0.0, dot(gN, H)), 32.0);",
    "  vec3 col = vec3(0.11, 0.125, 0.115)*(0.45 + 0.75*gDiff) + vec3(0.76, 0.86, 0.72)*gSpec*0.28;",
    "  float mossOuter = bRad + 0.052 + 0.014*vn(bp*14.0);",
    "  if(r < mossOuter){",
    "    float mossRing = smoothstep(mossOuter, mossOuter - 0.014, r) * smoothstep(bRad, bRad + 0.018, r);",
    "    col = mix(col, vec3(0.18, 0.30, 0.15)*(0.5 + 0.6*gDiff), mossRing);",
    "  }",
    "  if(r < bRad + 0.018){",
    "    float bezel = smoothstep(bRad+0.018, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    col = mix(col, vec3(0.55, 0.68, 0.50), bezel*0.88);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb;",
    "      card = card / (1.0 + 0.35*card);",
    "      float rev = smoothstep(1.85, 2.75, t);",
    "      col = mix(col, card*0.68*rev, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float bowlPulse = exp(-abs(t - 2.0)*6.0) * exp(-abs(r - bRad)*14.0);",
    "  col += vec3(0.72, 0.88, 0.64) * bowlPulse * 0.34;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#151b15"); gr.addColorStop(1, "#090b09");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#b8d89a"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(192, 204, 192, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#eff4ee"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("raked shirakawa gravel & moss", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("in the karesansui courtyard", W / 2, 352);
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

  I.reg("zen", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.01 : -0.02, brad = port ? 0.112 : 0.225;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#090b09"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#b8d89a"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#eff4ee"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["bowl", "windTrees", "temple", "drips"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "bowl", 0.0, [0, 4.5], 1.0, 0.30, 0.8, 2200)) {
        A.noise(0.0, 4.4, { type: "bandpass", f: 440, q: 1.2, v: 0.03 });
      }
      cut(A, "windTrees", 0.3, [0, 4.0], 0.95, 0.22, 0.7, 1800);
      cut(A, "drips", 1.9, [0, 0.8], 1.0, 0.20, 0.2, 2400);
    }
  });
})();
