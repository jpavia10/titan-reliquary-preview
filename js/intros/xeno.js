/* Xenohold intro (Grok, 2026-10-20). Something is looking back. Two wet membranes peel apart on a living iris (fibres, a slit
   pupil that dilates as it focuses on you), the eye flicks, then fires a teal scanning plane down the screen. Behind the scan,
   a column of alien script writes itself and is translated in place into TITAN RELIQUARY, character by character. WebGL: the
   iris, lids and scan line are one shader; 2D fallback: a painted iris and the same scan and translation. Sound: a slow organic
   drone, a wet click as the lids part, the scan sweep, the chitter of translation. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var NAME = "TITAN RELIQUARY";
  var FRAG = [
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-0.5*R)/min(R.x,R.y); uv.y=-uv.y; float t=T;",
    "  vec2 c=vec2(U0.z*0.03,-0.12+U0.w*0.01); vec2 p=uv-c; float r=length(p); float a=atan(p.y,p.x);",
    "  float open=U0.x, dil=U0.y, scan=U1.x, fade=U1.y;",
    "  float fib=vn(vec2(a*14.,r*9.-t*0.2))*0.6+vn(vec2(a*40.,r*30.))*0.4;",
    "  vec3 iris=mix(vec3(0.02,0.18,0.15),vec3(0.33,0.96,0.78),pow(fib,1.6))*smoothstep(0.36,0.12,r);",
    "  iris+=vec3(0.9,0.6,0.15)*smoothstep(0.1,0.0,abs(r-0.13))*0.4*fib;",
    "  float pw=mix(0.012,0.06,dil); float slit=smoothstep(pw,pw*0.6,abs(p.x)/(1.-pow(min(abs(p.y)/0.24,1.),2.)+0.001))*step(abs(p.y),0.24);",
    "  vec3 col=iris*(1.-slit);",
    "  float sclera=smoothstep(0.75,0.3,r); col+=vec3(0.05,0.09,0.07)*sclera*(0.6+0.4*vn(uv*12.+t*0.1))*(1.-smoothstep(0.32,0.38,r)*0.0);",
    "  col+=vec3(0.15,0.4,0.3)*pow(max(0.,1.-length(p-vec2(-0.08,0.08))*9.),3.);",       /* wet highlight */
    "  float lid=0.02+open*0.42; float shape=lid*(1.-pow(abs(uv.x)/0.95,2.));",
    "  float m=smoothstep(shape,shape-0.02,abs(uv.y-c.y));",
    "  vec3 flesh=vec3(0.03,0.06,0.05)*(0.7+0.6*vn(uv*vec2(8.,30.)))+vec3(0.,0.15,0.1)*pow(vn(uv*vec2(3.,40.)+t*0.3),6.);",
    "  col=mix(flesh,col,m);",
    "  float sl=uv.y+0.9-scan*1.9; col+=vec3(0.33,0.96,0.78)*(exp(-abs(sl)*90.)*1.5+exp(-abs(sl)*12.)*0.15)*step(0.001,scan)*step(scan,0.999);",
    "  col*=fade; col*=smoothstep(1.4,0.2,length(uv));",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function glyph(g, seed, x, y, s) {                  // an alien character: 3-4 strokes on a hidden 3x4 lattice, deterministic
    var r = K.rng(seed), P = [];
    for (var i = 0; i < 4; i++) P.push([Math.floor(r() * 3) / 2, Math.floor(r() * 4) / 3]);
    g.beginPath(); g.moveTo(x + P[0][0] * s * 0.6, y + P[0][1] * s); for (i = 1; i < 4; i++) g.lineTo(x + P[i][0] * s * 0.6, y + P[i][1] * s); g.stroke();
    g.beginPath(); g.arc(x + P[3][0] * s * 0.6, y + P[3][1] * s, s * 0.08, 0, K.PI2); g.fill();
  }
  I.reg("xeno", {
    dur: 4.4, still: 4.1,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, M = Math.min(W, H);
      var open = K.eob(seg(t, 0.35, 1.2), 0.8) * (1 - 0.85 * Math.exp(-Math.pow((t - 1.75) * 18, 2))), dil = 1 - K.eo3(seg(t, 1.0, 1.9));   // opens, one blink, focuses
      var look = Math.sin(seg(t, 1.9, 2.3) * Math.PI) * 1.0, scan = seg(t, 2.25, 3.0), fade = 1 - 0.55 * K.eo3(seg(t, 2.6, 3.4));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [open, dil, look, 0], [scan, fade, 0, 0]))) {
        g.fillStyle = "#020706"; g.fillRect(0, 0, W, H);
        var cx = W / 2, cy = H / 2 + 0.12 * M, rr = 0.33 * M, lh = (0.02 + open * 0.42) * M;
        g.save(); g.beginPath(); g.ellipse(cx, cy, M * 0.95 / 2 * 2, lh, 0, 0, K.PI2); g.clip(); g.globalAlpha = fade;
        var gr = g.createRadialGradient(cx, cy, 2, cx, cy, rr); gr.addColorStop(0, "#000"); gr.addColorStop(0.15, "#0d3b31"); gr.addColorStop(0.6, "#55f5c6"); gr.addColorStop(1, "#04130f"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, K.PI2); g.fill();
        g.fillStyle = "#000"; g.beginPath(); g.ellipse(cx, cy, M * (0.012 + 0.05 * dil), M * 0.24, 0, 0, K.PI2); g.fill(); g.restore(); g.globalAlpha = 1;
        if (scan > 0 && scan < 1) { var sy = H * scan; g.fillStyle = "rgba(85,245,198,.9)"; g.fillRect(0, sy - 1, W, 2); g.fillStyle = "rgba(85,245,198,.12)"; g.fillRect(0, sy - 30, W, 30); }
      }
      // the script, written behind the scan line, then translated character by character
      if (t > 2.3) {
        var fs = Math.min(W * 0.075, 46), n = NAME.length, lines = C.portrait ? ["TITAN", "RELIQUARY"] : [NAME], y0 = H * (C.portrait ? 0.2 : 0.22);
        g.save(); g.lineWidth = Math.max(1.5, fs * 0.07); g.lineCap = "round"; g.textAlign = "left"; g.textBaseline = "top"; g.font = "600 " + fs + "px " + K.GEO;
        var idx = 0;
        lines.forEach(function (ln, li) {
          var y = y0 + li * fs * 1.35, cw = fs * 0.78, x0 = W / 2 - ln.length * cw / 2;
          for (var k = 0; k < ln.length; k++, idx++) {
            if (ln[k] === " ") continue;
            var x = x0 + k * cw, writ = H * seg(t, 2.25, 3.0) > y, tr = seg(t, 3.0 + idx * 0.05, 3.18 + idx * 0.05);
            if (!writ) continue;
            if (tr < 1) { g.globalAlpha = 1 - tr; g.strokeStyle = "#55f5c6"; g.fillStyle = "#55f5c6"; glyph(g, 31 + idx * 17 + Math.floor(t * (tr > 0 ? 30 : 0)), x + cw * 0.12, y + fs * 0.1, fs * 0.82); }
            if (tr > 0) { g.globalAlpha = tr; g.fillStyle = "#e9f6ee"; g.shadowColor = "#55f5c6"; g.shadowBlur = 14 * (1 - tr) + 4; g.fillText(ln[k], x + (1 - tr) * 4, y); g.shadowBlur = 0; }
          }
        });
        g.restore(); g.globalAlpha = 1;
        var cap = seg(t, 3.9, 4.25); if (cap > 0) { g.globalAlpha = cap * 0.8; g.fillStyle = "#a4d1c4"; g.font = "500 " + Math.max(11, fs * 0.28) + "px " + K.MONO; g.textAlign = "center"; g.fillText("SPECIMEN ARCHIVE \u00b7 TRANSLATED", W / 2, y0 + (C.portrait ? 2.7 : 1.4) * fs * 1.0 + fs * 0.4); g.globalAlpha = 1; }
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0, 46, 4.3, { type: "sawtooth", v: 0.08, lp: 220, a: 0.6 }); A.tone(0, 46.7, 4.3, { type: "sawtooth", v: 0.06, lp: 200, a: 0.8 });   // the drone, slowly beating
      A.noise(0.35, 0.5, { type: "lowpass", f: 500, to: 180, shape: [[0.03, 0.22], [0.15, 0.08], [0.5, 0.0001]] });   // lids part, wet
      A.noise(1.72, 0.08, { type: "lowpass", f: 700, v: 0.12 });                                               // the blink
      A.tone(1.0, 300, 0.9, { v: 0.05, to: 900 });                                                              // focusing
      A.tone(2.25, 2400, 0.75, { v: 0.05, to: 600, type: "triangle" }); A.noise(2.25, 0.75, { type: "bandpass", f: 6000, to: 1500, q: 6, v: 0.05 });
      for (var i = 0; i < NAME.length; i++) if (NAME[i] !== " ") A.tone(3.0 + i * 0.05, 1200 + (i * 211) % 900, 0.04, { type: "square", v: 0.025 });
    }
  });
})();
