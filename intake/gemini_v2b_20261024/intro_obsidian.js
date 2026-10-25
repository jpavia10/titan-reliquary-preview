/* Obsidian Sun intro v2 (Gemini, theme #47, 2026-10-24; plan in notes/agents/themes-37-50.md:
   "Rings rotate and lock, their teeth stop on the letters").
   v2 fixes from REVIEW from Claude (2026-10-24).txt:
   1. 3D analytical bevel normals & moving torch specular light across volcanic glass, hammered gold cartouches, pointed solar rays, and jadeite cabochons.
   2. Scaled to screen width (`S = min(1.0, A * 0.96)`) so the entire sun stone fits inside a 390x844 phone screen.
   3. Samples `texture2D(TX, cuv)` directly (not `1.0 - cuv.y`) so TITAN RELIQUARY is upright. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*R)/R.y; float A = R.x/R.y, t = T;",
    "  float S = min(1.0, A * 0.96);",
    "  vec2 bCenter = vec2(0.0, U0.x);",
    "  vec2 bp = (p - bCenter) / S; float r = length(bp); float a = atan(bp.y, bp.x); float bRad = 0.225;",
    "  vec2 rDir = bp / (r + 1e-5);",
    "  vec2 tDir = vec2(-rDir.y, rDir.x);",
    "  vec2 lXY = vec2(0.34*cos(t*0.7), 0.30*sin(t*0.6));",
    "  vec3 L = normalize(vec3(lXY - bp, 0.44));",
    "  vec3 V = vec3(0.0, 0.0, 1.0);",
    "  vec3 H = normalize(L + V);",
    "  float warp = vn(bp*4.5)*0.65 + vn(bp*11.0)*0.35;",
    "  float phase = r*38.0 - warp*5.2 + a*2.0;",
    "  float conchSlope = cos(phase) * (0.45 + 0.35*sin(r*14.0 + warp*3.0));",
    "  vec3 obN = normalize(vec3(-rDir * conchSlope * 0.42, 1.0));",
    "  float obDiff = max(0.0, dot(obN, L));",
    "  float obSpec = pow(max(0.0, dot(obN, H)), 52.0);",
    "  float obFres = pow(1.0 - max(0.0, dot(obN, V)), 3.2);",
    "  vec3 col = vec3(0.022, 0.019, 0.028)*(0.60 + 0.85*obDiff) + vec3(0.14, 0.11, 0.20)*obFres*0.58 + vec3(0.95, 0.86, 0.70)*obSpec*0.34;",
    "  float sp1 = 1.0 - smoothstep(0.0, 1.4, t); sp1 = sp1*sp1;",
    "  float sp2 = 1.0 - smoothstep(0.2, 1.8, t); sp2 = sp2*sp2;",
    "  float sp3 = 1.0 - smoothstep(0.4, 2.2, t); sp3 = sp3*sp3;",
    "  float r1In = bRad + 0.012, r1Out = bRad + 0.078;",
    "  if(r >= r1In && r <= r1Out){",
    "    float a1 = a + sp1*4.5;",
    "    float u1 = (fract(a1*20.0/6.2831853) - 0.5)*2.0;",
    "    float v1 = ((r - r1In)/(r1Out - r1In) - 0.5)*2.0;",
    "    float box = max(abs(u1)*0.82, abs(v1)*0.78);",
    "    float cartouche = smoothstep(0.76, 0.58, box);",
    "    float peen = vn(bp*42.0) - 0.5;",
    "    vec2 bevGrad = rDir*(v1*0.85 - sin(v1*4.5)*0.25) + tDir*(u1*0.85 - cos(u1*4.5)*0.25) + vec2(peen, -peen)*0.28;",
    "    vec3 gN = normalize(vec3(-bevGrad, 1.0));",
    "    float gDiff = max(0.0, dot(gN, L));",
    "    float gSpec = pow(max(0.0, dot(gN, H)), 38.0);",
    "    vec3 baseGold = vec3(0.78, 0.57, 0.19)*(0.42 + 0.88*gDiff) + vec3(1.0, 0.91, 0.60)*gSpec*0.72;",
    "    vec3 ring1Col = mix(vec3(0.05, 0.038, 0.022), baseGold, 0.20 + 0.80*cartouche);",
    "    col = mix(col, ring1Col, smoothstep(r1In, r1In+0.004, r) * smoothstep(r1Out, r1Out-0.004, r));",
    "  }",
    "  float r2In = bRad + 0.084, r2Out = bRad + 0.154;",
    "  if(r >= r2In && r <= r2Out){",
    "    float a2 = a - sp2*5.2;",
    "    float u2 = (fract(a2*12.0/6.2831853) - 0.5)*2.0;",
    "    float v2 = ((r - r2In)/(r2Out - r2In) - 0.5)*2.0;",
    "    float dome = max(0.0, 1.0 - (u2*u2*0.88 + v2*v2*0.96));",
    "    float cab = smoothstep(0.04, 0.22, dome);",
    "    float vein = vn(bp*24.0 + 3.7);",
    "    vec2 jGrad = rDir*v2*0.95 + tDir*u2*0.88 + (vein - 0.5)*0.12;",
    "    vec3 jN = normalize(vec3(-jGrad, 1.0));",
    "    float jDiff = max(0.0, dot(jN, L));",
    "    float jSpec = pow(max(0.0, dot(jN, H)), 64.0);",
    "    vec3 jadeAlb = mix(vec3(0.04, 0.24, 0.15), vec3(0.22, 0.64, 0.42), smoothstep(0.22, 0.78, vein));",
    "    vec3 jadeCol = jadeAlb*(0.50 + 0.78*jDiff) + vec3(0.90, 1.0, 0.95)*jSpec*0.65;",
    "    vec3 ring2Col = mix(vec3(0.56, 0.40, 0.13)*(0.45 + 0.55*jDiff), jadeCol, cab);",
    "    col = mix(col, ring2Col, smoothstep(r2In, r2In+0.004, r) * smoothstep(r2Out, r2Out-0.004, r));",
    "  }",
    "  float r3In = bRad + 0.160, r3Out = bRad + 0.248;",
    "  if(r >= r3In && r <= r3Out){",
    "    float a3 = a + sp3*3.8;",
    "    float cell8 = (fract(a3*8.0/6.2831853) - 0.5)*2.0;",
    "    float cell16 = (fract((a3 + 0.392699)*8.0/6.2831853) - 0.5)*2.0;",
    "    float taper = (r - r3In) / (r3Out - r3In);",
    "    float halfW1 = max(0.0, 0.62*(1.0 - taper));",
    "    float inRay1 = smoothstep(halfW1 + 0.04, halfW1 - 0.02, abs(cell8));",
    "    float taper2 = clamp(taper / 0.58, 0.0, 1.0);",
    "    float halfW2 = max(0.0, 0.36*(1.0 - taper2)) * step(taper, 0.58);",
    "    float inRay2 = smoothstep(halfW2 + 0.04, halfW2 - 0.02, abs(cell16));",
    "    float collar = smoothstep(0.18, 0.12, taper);",
    "    float mask3 = max(collar, max(inRay1, inRay2));",
    "    float slopeT = (inRay1 >= inRay2) ? clamp(cell8 / (halfW1 + 0.05), -1.0, 1.0) : clamp(cell16 / (halfW2 + 0.05), -1.0, 1.0);",
    "    float peen3 = vn(bp*46.0) - 0.5;",
    "    vec3 rN = normalize(vec3(-tDir*slopeT*0.75 - rDir*0.28 + vec2(peen3, -peen3)*0.22, 1.0));",
    "    float rDiff = max(0.0, dot(rN, L));",
    "    float rSpec = pow(max(0.0, dot(rN, H)), 42.0);",
    "    vec3 rayGold = vec3(0.80, 0.58, 0.18)*(0.40 + 0.88*rDiff) + vec3(1.0, 0.92, 0.62)*rSpec*0.70;",
    "    col = mix(col, rayGold, mask3 * smoothstep(r3In, r3In+0.004, r));",
    "  }",
    "  if(r < bRad + 0.012){",
    "    float bezel = smoothstep(bRad+0.012, bRad+0.002, r) * smoothstep(bRad-0.006, bRad+0.002, r);",
    "    col = mix(col, vec3(0.84, 0.64, 0.26), bezel*0.88);",
    "    if(r < bRad){",
    "      vec2 cuv = clamp(bp / (bRad*2.0) + 0.5, 0.0, 1.0);",
    "      vec3 card = texture2D(TX, cuv).rgb * vec3(1.0, 0.96, 0.88);",
    "      card = card / (1.0 + 0.35*card);",
    "      float rev = smoothstep(1.95, 2.75, t);",
    "      col = mix(col, card*0.66*rev, smoothstep(bRad, bRad-0.006, r));",
    "    }",
    "  }",
    "  float lockPulse = exp(-abs(t - 2.2)*8.0) * exp(-abs(r - bRad)*14.0);",
    "  col += vec3(1.0, 0.82, 0.38) * lockPulse * 0.35;",
    "  col *= 1.0 - 0.34*smoothstep(0.44, 1.06, length(p*vec2(1.0/A*1.15, 1.0)));",
    "  gl_FragColor = vec4(min(col, vec3(0.58)), 1.0);",
    "}"
  ].join("\n");

  function cardTex() {
    var W = 512, H = 512, c = K.mk(W, H), g = c.getContext("2d");
    var gr = g.createRadialGradient(W/2, H/2, 20, W/2, H/2, W/2);
    gr.addColorStop(0, "#1e1924"); gr.addColorStop(1, "#08070a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#f0bc58"; g.lineWidth = 3;
    g.beginPath(); g.arc(W/2, H/2, 224, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(104, 224, 164, 0.5)"; g.lineWidth = 1.5;
    g.beginPath(); g.arc(W/2, H/2, 210, 0, Math.PI * 2); g.stroke();
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    g.fillStyle = "#f4efe6"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 24px " + serif; g.fillText("volcanic glass & hammered gold", W / 2, 178);
    g.font = "600 56px " + serif; g.fillText("TITAN", W / 2, 242);
    g.font = "600 36px " + serif; g.fillText("RELIQUARY", W / 2, 296);
    g.font = "italic 22px " + serif; g.fillText("in the obsidian sun stone", W / 2, 352);
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

  I.reg("obsidian", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, port = W < H;
      var by = port ? -0.01 : -0.02, brad = port ? 0.112 : 0.225;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [by, brad, 0, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#080709"; g.fillRect(0, 0, W, H);
      var r = brad * H, cx = W / 2, cy = H / 2 - by * H;
      g.strokeStyle = "#f0bc58"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.stroke();
      if (t > 2.0) {
        var a = Math.min(1, (t - 2.0) / 0.8); g.save(); g.globalAlpha = a;
        g.fillStyle = "#f4efe6"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = Math.min(r * 0.34, 52);
        g.font = "600 " + fs + "px Georgia, serif"; g.fillText("TITAN", cx, cy - fs * 0.35);
        g.font = "600 " + (fs * 0.65) + "px Georgia, serif"; g.fillText("RELIQUARY", cx, cy + fs * 0.45);
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      ["temple", "fire", "clank", "crickets"].forEach(function (n) { warm(A.ctx, n); });
      if (!cut(A, "temple", 0.0, [0, 4.5], 1.0, 0.32, 0.8, 1800)) {
        A.noise(0.0, 4.4, { type: "bandpass", f: 380, q: 1.0, v: 0.03, shape: [[0.4, 0.03], [2.2, 0.035], [4.4, 0.0001]] });
      }
      [1.4, 1.8, 2.2].forEach(function (lt, idx) {
        if (!cut(A, "clank", lt, [0, 0.35], 0.9 + idx * 0.08, 0.26, 0.1, 2000)) {
          A.noise(lt, 0.03, { type: "bandpass", f: 1100 + idx * 250, q: 5.0, v: 0.05 });
        }
      });
      cut(A, "fire", 0.4, [0, 4.0], 1.0, 0.22, 0.7, 2200);
    }
  });
})();
