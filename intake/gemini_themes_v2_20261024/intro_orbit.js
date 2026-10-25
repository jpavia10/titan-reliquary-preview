/* Low Orbit intro v2 (Gemini, theme #49, 2026-10-24).
   Mechanical Cupola shutter blades iris open over Earth's curved atmospheric airglow limb and sunrise terminator. */
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
    "  vec2 lXY = vec2(0.36*cos(t*0.5), 0.28 + 0.10*sin(t*0.4));",
    "  vec3 L = normalize(vec3(lXY - bp, 0.45)); vec3 V = vec3(0.0, 0.0, 1.0); vec3 H = normalize(L + V);",
    "  vec2 earthCenter = vec2(-0.08, -1.28);",
    "  float dEarth = length(bp - earthCenter) - 1.42;",
    "  float onEarth = smoothstep(0.008, -0.012, dEarth);",
    "  float airglow1 = exp(-abs(dEarth - 0.012)*38.0);",
    "  float airglow2 = exp(-max(0.0, dEarth)*14.0);",
    "  float sunSweep = smoothstep(0.3, 2.2, t);",
    "  float sunAng = atan(bp.y - earthCenter.y, bp.x - earthCenter.x);",
    "  float termFlare = exp(-abs(sunAng - (1.25 + sunSweep*0.35))*4.5) * exp(-abs(dEarth)*24.0);",
    "  vec2 geoUV = (bp - earthCenter)*3.4 + vec2(t*0.03, 0.0);",
    "  float cities = smoothstep(0.28, 0.52, vn(geoUV*16.0)*vn(geoUV*28.0)) * smoothstep(0.0, -0.06, dEarth);",
    "  vec3 earthCol = vec3(0.012, 0.03, 0.065) + vec3(0.98, 0.76, 0.36)*cities*0.75;",
    "  vec3 col = mix(vec3(0.01, 0.015, 0.025), earthCol, onEarth);",
    "  col += (vec3(0.16, 0.58, 0.98)*airglow2*0.42 + vec3(0.38, 0.90, 0.98)*airglow1*0.52 + vec3(1.0, 0.82, 0.46)*termFlare*0.50) * smoothstep(0.0, 1.4, t);",
    "  float frameIn = bRad + 0.145;",
    "  float strutDist = abs(fract(a*6.0/6.2831853) - 0.5) * (r * 3.14159 / 3.0);",
    "  float strut = smoothstep(0.022, 0.012, strutDist) * step(bRad + 0.016, r);",
    "  float outerHull = smoothstep(frameIn - 0.01, frameIn + 0.008, r);",
    "  float hullBevel = smoothstep(frameIn + 0.032, frameIn, r) * outerHull;",
    "  float panelSeam = smoothstep(0.006, 0.001, abs(fract(a*6.0/6.2831853)-0.5)*r) + smoothstep(0.006, 0.001, abs(r - (frameIn + 0.14)));",
    "  float pressureRing = smoothstep(0.016, 0.006, abs(r - (bRad + 0.024)));",
    "  float frameMask = clamp(outerHull + strut + pressureRing, 0.0, 1.0);",
    "  vec3 tiN = normalize(vec3(-rDir*(hullBevel - pressureRing)*0.85, 1.0));",
    "  float tiSpec = pow(max(0.0, dot(tiN, H)), 48.0);",
    "  vec3 tiCol = vec3(0.05, 0.065, 0.09)*(1.0 - 0.25*panelSeam) + vec3(0.65, 0.86, 1.0)*tiSpec*(0.15 + 0.75*hullBevel + 0.65*strut + 0.65*pressureRing);",
    "  col = mix(col, tiCol, frameMask);",
    "  float iris = smoothstep(0.1, 1.7, t);",
    "  if(r < bRad + 0.016){",
    "    float bezel = smoothstep(bRad+0.016, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    col = mix(col, vec3(0.45, 0.72, 0.92), bezel*0.88);",
    "    if(r < bRad){",
    "      float shutterMask = step(r, bRad * iris);",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb;",
    "      card = card / (1.0 + 0.35*card);",
    "      float rev = smoothstep(1.85, 2.75, t);",
    "      vec3 inner = mix(vec3(0.04, 0.06, 0.09), card*0.68*rev, shutterMask);",
    "      col = mix(col, inner, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float lockPulse = exp(-abs(t - 2.1)*6.5) * exp(-abs(r - bRad)*14.0);",
    "  col += vec3(0.45, 0.88, 1.0) * lockPulse * 0.34;",
    "  col *= 1.0 - 0.32*smoothstep(0.45, 1.05, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#0e1826"); gr.addColorStop(1, "#05080f");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#78c8ff"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255, 205, 112, 0.48)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#eef4fb"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("400 km above the night limb", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("in the cupola nadir window", W / 2, 352);
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

  I.reg("orbit", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.01 : -0.02, brad = port ? 0.112 : 0.225;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#05080f"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#78c8ff"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#eef4fb"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["roomTone", "projector", "clank", "wind"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "roomTone", 0.0, [0, 4.5], 0.85, 0.32, 0.8, 900)) {
        A.noise(0.0, 4.4, { type: "lowpass", f: 320, q: 0.9, v: 0.03 });
      }
      cut(A, "projector", 0.2, [0, 2.2], 0.9, 0.18, 0.5, 1400);
      cut(A, "clank", 1.7, [0, 0.35], 1.1, 0.22, 0.1, 2200);
    }
  });
})();
