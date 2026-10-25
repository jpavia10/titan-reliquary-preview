/* Sahel Futurism intro v2 (Gemini, theme #50, 2026-10-24).
   Hammered-brass solar astrolabe alidade arms rotate over carved adobe reliefs and indigo inlay to lock on the title. */
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
    "  vec2 lXY = vec2(0.35*cos(t*0.55), 0.32*sin(t*0.45));",
    "  vec3 L = normalize(vec3(lXY - bp, 0.42)); vec3 V = vec3(0.0, 0.0, 1.0); vec3 H = normalize(L + V);",
    "  float plaster = vn(bp*18.0);",
    "  float pilasterX = sin(bp.x*22.0);",
    "  float chevron = sin(bp.x*36.0 + abs(fract(bp.y*8.0) - 0.5)*12.0);",
    "  vec3 adN = normalize(vec3(-cos(bp.x*22.0)*0.55, -(plaster - 0.5)*0.4, 1.0));",
    "  float adDiff = max(0.0, dot(adN, L));",
    "  vec3 col = mix(vec3(0.075, 0.038, 0.026), vec3(0.24, 0.115, 0.068), 0.35 + 0.65*adDiff + 0.10*chevron);",
    "  float spin = (1.0 - smoothstep(0.0, 2.0, t)); spin = spin*spin;",
    "  float astIn = bRad + 0.012, astOut = bRad + 0.155;",
    "  if(r >= astIn && r <= astOut){",
    "    float aRot = a + spin*4.2;",
    "    float band1 = smoothstep(0.014, 0.004, abs(r - (bRad + 0.036)));",
    "    float band2 = smoothstep(0.016, 0.005, abs(r - (bRad + 0.092)));",
    "    float band3 = smoothstep(0.012, 0.004, abs(r - (bRad + 0.142)));",
    "    float armCell = abs(fract(aRot*8.0/6.2831853) - 0.5)*2.0;",
    "    float armW = 0.16 + 0.08*sin((r - astIn)*42.0);",
    "    float arm = smoothstep(armW + 0.03, armW - 0.02, armCell);",
    "    float brassMask = clamp(band1 + band2 + band3 + arm*0.88, 0.0, 1.0);",
    "    vec3 brN = normalize(vec3(-rDir*sin((r - astIn)*85.0)*0.55 - tDir*armCell*arm*0.65, 1.0));",
    "    float brDiff = max(0.0, dot(brN, L));",
    "    float brSpec = pow(max(0.0, dot(brN, H)), 44.0);",
    "    vec3 brassCol = vec3(0.80, 0.54, 0.22)*(0.42 + 0.85*brDiff) + vec3(1.0, 0.88, 0.58)*brSpec*0.72;",
    "    vec3 dialCol = mix(vec3(0.04, 0.06, 0.14), brassCol, brassMask);",
    "    col = mix(col, dialCol, smoothstep(astIn, astIn+0.004, r) * smoothstep(astOut, astOut-0.004, r));",
    "  }",
    "  if(r < bRad + 0.014){",
    "    float bezel = smoothstep(bRad+0.014, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    col = mix(col, vec3(0.82, 0.56, 0.24), bezel*0.88);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb;",
    "      card = card / (1.0 + 0.35*card);",
    "      float rev = smoothstep(1.85, 2.75, t);",
    "      col = mix(col, card*0.68*rev, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float lockPulse = exp(-abs(t - 2.0)*6.5) * exp(-abs(r - bRad)*14.0);",
    "  col += vec3(0.96, 0.68, 0.32) * lockPulse * 0.35;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#24140e"); gr.addColorStop(1, "#0c0705");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#e89b54"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(116, 158, 232, 0.48)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#f6efe8"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("rammed earth & brass astrolabe", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("in the saharan solar court", W / 2, 352);
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

  I.reg("sahel", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.01 : -0.02, brad = port ? 0.112 : 0.225;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#0c0705"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#e89b54"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#f6efe8"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["wind", "fire", "clank", "temple"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "wind", 0.0, [0, 4.5], 0.9, 0.28, 0.8, 1200)) {
        A.noise(0.0, 4.4, { type: "bandpass", f: 420, q: 0.9, v: 0.03 });
      }
      cut(A, "clank", 1.9, [0, 0.35], 0.95, 0.24, 0.1, 2000);
      cut(A, "fire", 0.3, [0, 4.0], 1.0, 0.18, 0.6, 1800);
    }
  });
})();
