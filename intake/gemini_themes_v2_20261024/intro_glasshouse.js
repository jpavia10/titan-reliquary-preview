/* The Glasshouse intro v2 (Gemini, theme #48, 2026-10-24).
   Wrought-iron glazing arches assemble over steamed glass panes and swaying palm silhouettes as lantern light clears the central oculus. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*R)/R.y; float A = R.x/R.y, t = T;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 bCenter = vec2(0.0, U0.x);",
    "  vec2 bp = (p - bCenter) / S; float r = length(bp); float a = atan(bp.y, bp.x); float bRad = 0.228;",
    "  vec2 rDir = bp / (r + 1e-5); vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  vec2 lXY = vec2(0.28*sin(t*0.65), 0.24*cos(t*0.55));",
    "  vec3 L = normalize(vec3(lXY - bp, 0.48)); vec3 V = vec3(0.0, 0.0, 1.0); vec3 H = normalize(L + V);",
    "  float ribs = 16.0;",
    "  float secA = (fract(a*ribs/6.2831853) - 0.5)*2.0;",
    "  float steam = vn(bp*5.5 + vec2(0.0, t*0.08));",
    "  float clearWave = smoothstep(0.8, 2.6, t);",
    "  float lantern = smoothstep(0.2, 1.8, t) * exp(-length(bp - lXY*0.4)*2.8);",
    "  float frond1A = atan(bp.y - 0.30, bp.x + 0.34) + 0.05*sin(t*0.8);",
    "  float frond1R = length(bp - vec2(-0.34, 0.30));",
    "  float leaf1 = smoothstep(0.15, 0.65, sin(frond1A*28.0 + frond1R*12.0)) * smoothstep(0.62, 0.18, frond1R);",
    "  float frond2A = atan(bp.y - 0.28, bp.x - 0.36) - 0.05*cos(t*0.75);",
    "  float frond2R = length(bp - vec2(0.36, 0.28));",
    "  float leaf2 = smoothstep(0.15, 0.65, sin(frond2A*26.0 - frond2R*11.0)) * smoothstep(0.62, 0.18, frond2R);",
    "  vec3 col = mix(vec3(0.025, 0.055, 0.048), vec3(0.08, 0.20, 0.14), clamp(leaf1 + leaf2, 0.0, 1.0)*0.75 + steam*0.25);",
    "  col += vec3(0.88, 0.68, 0.34) * lantern * 0.24;",
    "  if(r >= bRad){",
    "    float grow = smoothstep(0.0, 1.6, t);",
    "    float ribDist = abs(secA) * (r * 3.14159 / ribs);",
    "    float mainRib = smoothstep(0.011, 0.004, ribDist) * step(r, bRad + grow*0.45);",
    "    float ring1 = smoothstep(0.009, 0.003, abs(r - (bRad + 0.085))) * smoothstep(0.5, 1.2, t);",
    "    float ring2 = smoothstep(0.010, 0.003, abs(r - (bRad + 0.185))) * smoothstep(0.9, 1.6, t);",
    "    float scallopR = bRad + 0.042 + 0.024*cos(a*ribs*2.0);",
    "    float filigree = smoothstep(0.006, 0.002, abs(r - scallopR)) * step(r, bRad + 0.085) * smoothstep(0.6, 1.4, t);",
    "    float ironMask = clamp(mainRib + ring1 + ring2 + filigree*0.85, 0.0, 1.0);",
    "    vec3 iN = normalize(vec3(-tDir*sign(secA)*mainRib*0.7, 1.0));",
    "    float iSpec = pow(max(0.0, dot(iN, H)), 42.0);",
    "    vec3 ironCol = vec3(0.12, 0.22, 0.18) + vec3(0.80, 0.94, 0.86)*iSpec*0.58;",
    "    col = mix(col, ironCol, ironMask);",
    "  }",
    "  if(r < bRad + 0.018){",
    "    float bezel = smoothstep(bRad+0.018, bRad+0.003, r) * smoothstep(bRad-0.006, bRad+0.003, r);",
    "    col = mix(col, vec3(0.62, 0.78, 0.64), bezel*0.88);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb;",
    "      card = card / (1.0 + 0.35*card);",
    "      float rev = smoothstep(1.85, 2.75, t);",
    "      col = mix(col, card*0.68*rev, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float mistPulse = exp(-abs(t - 2.1)*6.0) * exp(-abs(r - bRad)*14.0);",
    "  col += vec3(0.65, 0.94, 0.78) * mistPulse * 0.32;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#12241d"); gr.addColorStop(1, "#060d0a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#8cd9b3"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(220, 195, 128, 0.48)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#edf5f0"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("steamed glass & wrought iron", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("under the midnight palm dome", W / 2, 352);
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

  I.reg("glasshouse", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.01 : -0.02, brad = port ? 0.112 : 0.225;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#060d0a"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#8cd9b3"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#edf5f0"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["rain", "thunder", "drips", "windTrees"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "rain", 0.0, [0, 4.5], 1.0, 0.28, 0.8, 2200)) {
        A.noise(0.0, 4.4, { type: "bandpass", f: 900, q: 0.8, v: 0.03 });
      }
      cut(A, "drips", 0.6, [0, 3.8], 1.0, 0.20, 0.6, 2600);
      cut(A, "windTrees", 0.2, [0, 4.2], 0.95, 0.18, 0.7, 1600);
    }
  });
})();
