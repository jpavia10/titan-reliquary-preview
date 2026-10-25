/* Light Well intro v2 (Gemini, theme #46, 2026-10-24; plan in notes/agents/themes-37-50.md:
   "A ceiling shutter opens, light sweeps the cast name").
   v2 fixes from REVIEW from Claude (2026-10-24).txt:
   - Samples `texture2D(TX, cuv)` directly (not `1.0 - cuv.y`) because TitanIntro uploads textures with UNPACK_FLIP_Y_WEBGL = true.
   - Matches fx_lightwell.js v2 cool architectural mineral concrete, form-tie cones, and tone-mapped plinth illumination. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*R)/R.y; float A = R.x/R.y, t = T;",
    "  float plankH = 0.095; float row = floor(p.y / plankH); float fy = fract(p.y / plankH);",
    "  float seam = smoothstep(0.018, 0.0, fy) + smoothstep(0.982, 1.0, fy);",
    "  float agg = vn(p*58.0)*0.6 + vn(p*125.0)*0.4;",
    "  float imprint = vn(vec2(p.x*9.0 + row*4.1, p.y*28.0));",
    "  vec2 tieCell = vec2(mod(p.x + 0.16, 0.32) - 0.16, (fy - 0.5)*plankH);",
    "  float tieD = length(tieCell);",
    "  float tieCone = smoothstep(0.012, 0.004, tieD);",
    "  float tieRim = smoothstep(0.016, 0.011, tieD) * smoothstep(0.006, 0.011, tieD);",
    "  vec3 baseGrey = vec3(0.118, 0.122, 0.128) + (row - 2.0*floor(row*0.5))*vec3(0.004, 0.004, 0.005);",
    "  vec3 alb = baseGrey * (0.94 + 0.10*(agg - 0.5) + 0.05*(imprint - 0.5) - 0.28*seam - 0.38*tieCone + 0.08*tieRim);",
    // Ceiling shutter opening & sweeping sun blade
    "  float openAmt = smoothstep(0.20, 1.65, t);",
    "  float sweep = (1.0 - smoothstep(0.35, 2.55, t))*0.36;",
    "  vec2 slitOrigin = vec2(A < 1.0 ? -0.18 : -0.22*A, 0.56);",
    "  float restX = (A < 1.0 ? 0.08 : 0.18) + sweep;",
    "  vec2 bDir = normalize(vec2(restX, -1.0));",
    "  vec2 bPerp = vec2(-bDir.y, bDir.x);",
    "  vec2 relP = p - slitOrigin;",
    "  float along = dot(relP, bDir);",
    "  float across = dot(relP, bPerp);",
    "  float halfW = (0.042 + max(0.0, along)*0.095) * openAmt;",
    "  float inBlade = smoothstep(halfW + 0.045, max(0.0, halfW - 0.018), abs(across)) * step(0.0, along) * step(0.01, openAmt);",
    "  vec3 col = alb * (0.48 + 1.15*inBlade);",
    // Central cast-concrete plinth & medallion
    "  vec2 bCenter = vec2(0.0, U0.x);",
    "  vec2 bp = p - bCenter; float bRad = U0.y; float bDist = length(bp);",
    "  if(bDist < bRad + 0.032){",
    "    float bevel = smoothstep(bRad+0.026, bRad+0.006, bDist) * smoothstep(bRad-0.006, bRad+0.006, bDist);",
    "    col = mix(col, vec3(0.13, 0.134, 0.14) + vec3(0.88, 0.76, 0.52)*inBlade*0.55, bevel);",
    "    if(bDist < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb;",
    "      float rev = smoothstep(1.35, 2.55, t);",
    "      vec3 litCard = card * (0.58 + 0.18*inBlade) * rev;",
    "      litCard = litCard / (1.0 + 0.35*litCard);",
    "      col = mix(col, litCard, smoothstep(bRad, bRad-0.005, bDist));",
    "    }",
    "  }",
    "  float plinthMask = smoothstep(bRad - 0.01, bRad + 0.04, bDist);",
    "  float haze = vn(p*4.5 + vec2(t*0.03, -t*0.02))*0.6 + vn(p*9.5)*0.4;",
    "  col += vec3(0.95, 0.84, 0.58) * inBlade * (0.08 + 0.28*haze*haze) * exp(-along*0.65) * (0.12 + 0.88*plinthMask) * 0.36;",
    "  col *= 1.0 - 0.34*smoothstep(0.42, 1.06, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#1d1e22"); gr.addColorStop(1, "#0b0c0e");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#ecc468"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(247, 223, 158, 0.45)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#f2efe9"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("architectural sanctuary", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("concrete and one blade of sun", W / 2, 352);
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

  I.reg("lightwell", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.02 : -0.03, brad = port ? 0.185 : 0.245;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#0a0a0b"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#ecc468"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 1.8) {
        var a = Math.min(1, (t - 1.8) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#f2efe9"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      warm(A.ctx, "organ", "cuts"); ["hall", "temple", "clank"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "hall", 0.0, [0, 4.5], 1.0, 0.35, 0.8, 1600)) {
        A.noise(0.0, 4.4, { type: "bandpass", f: 420, q: 0.9, v: 0.03, shape: [[0.4, 0.03], [2.2, 0.035], [4.4, 0.0001]] });
      }
      if (!cut(A, "clank", 0.30, [0, 0.6], 0.85, 0.28, 0.2, 1800)) {
        A.noise(0.32, 0.04, { type: "bandpass", f: 950, q: 4.0, v: 0.05 });
      }
      cut(A, "temple", 0.8, [0, 3.6], 1.0, 0.25, 0.8, 2200);
    }
  });
})();
