/* Marbled Endpapers intro (Grok, 2026-10-20). A closed, gilt-tooled leather binding fills the screen. The cover swings open on
   its hinge toward you (perspective: the free edge grows as it turns, the leather darkens edge-on) and behind it the endpaper is
   still wet: the marbling flows and is combed into its final pattern while you watch. A bookplate is laid on it and the name
   is gold-tooled, a glint running across the leaf. WebGL: the living marble (domain-warped ink bands with comb chevrons);
   2D fallback: a still marble. Sound: leather creak, the cover's air, a soft thump as it lands, a dry pad as the plate is pressed. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/R; uv.y=1.-uv.y; vec2 p=vec2(uv.x*R.x/R.y,uv.y)*1.8;",
    "  float flow=U0.x, comb=U0.y;",
    "  vec2 q=vec2(fbm(p+vec2(0.,T*0.25*flow)),fbm(p+vec2(5.2,1.3)-T*0.2*flow));",
    "  vec2 w=p+2.2*q; w.y+=comb*0.35*sin(w.x*9.)*exp(-pow(fract(uv.x*7.)-.5,2.)*30.);",
    "  float f=fbm(w+vec2(0.,comb*0.6));",
    "  float b=fract(f*3.2+q.x*0.9);",
    "  vec3 c1=vec3(.137,.188,.42),c2=vec3(.478,.122,.169),c3=vec3(.76,.57,.23),c4=vec3(.294,.424,.561),cr=vec3(.937,.894,.8);",
    "  vec3 col=b<.22?c1:b<.38?cr:b<.58?c2:b<.7?c3:b<.86?c4:cr;",
    "  float edge=min(abs(b-.22),abs(b-.58)); col*=1.-.25*smoothstep(.02,0.,edge);",
    "  col*=0.92+0.08*vn(gl_FragCoord.xy*.7);",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function cover(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(5);
    var gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#5a1820"); gr.addColorStop(1, "#2c0b10"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,.12)" : "rgba(255,220,200,.04)"; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }   // grain
    var m = Math.min(W, H) * 0.07; g.strokeStyle = "#c2913a"; g.lineWidth = 2; g.strokeRect(m, m, W - 2 * m, H - 2 * m); g.lineWidth = 1; g.strokeRect(m + 7, m + 7, W - 2 * m - 14, H - 2 * m - 14);
    g.fillStyle = "#c2913a"; [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(function (p) { g.save(); g.translate(p[0], p[1]); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); });
    g.save(); g.translate(W / 2, H / 2); g.strokeStyle = "#c2913a"; g.lineWidth = 1.5;                     // a tooled lozenge
    g.beginPath(); g.moveTo(0, -H * 0.16); g.lineTo(W * 0.18, 0); g.lineTo(0, H * 0.16); g.lineTo(-W * 0.18, 0); g.closePath(); g.stroke();
    g.beginPath(); g.arc(0, 0, Math.min(W, H) * 0.05, 0, K.PI2); g.stroke(); g.restore();
    return c;
  }
  function stillMarble(W, H) {
    var c = K.mk(W, H), g = c.getContext("2d"), r = K.rng(71), cols = ["#23306b", "#efe4cc", "#7a1f2b", "#c2913a", "#4b6c8f"];
    g.fillStyle = "#efe4cc"; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 70; i++) { g.fillStyle = cols[i % 5]; g.beginPath(); g.ellipse(r() * W, r() * H, 10 + r() * W * 0.18, 6 + r() * H * 0.05, r() * 3, 0, K.PI2); g.fill(); }
    return c;
  }
  I.reg("marbled", {
    dur: 4.3, still: 4.0,
    init: function (C) {
      C.L = I.gl(C, FRAG); C.cov = cover(Math.round(C.W), Math.round(C.H)); if (!C.L) C.still = stillMarble(Math.round(C.W / 2), Math.round(C.H / 2));
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var flow = 1 - K.eo3(seg(t, 2.6, 3.6)), comb = K.eio(seg(t, 1.7, 2.8));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [flow, comb, 0, 0]))) g.drawImage(C.still, 0, 0, W, H);
      // the cover opening toward the viewer: angle 0 (closed) -> 100 degrees; drawn as vertical slices with perspective
      var a = K.eio(seg(t, 0.35, 1.65)) * 1.75;
      if (a < Math.PI / 2) {
        var cw = Math.cos(a) * W, grow = 1 + 0.22 * Math.sin(a), n = C.lite ? 16 : 40, sw = W / n;
        for (var i = 0; i < n; i++) { var u = i / n, x = u * cw, h = H * (1 + (grow - 1) * u), y = (H - h) / 2;
          g.drawImage(C.cov, i * sw, 0, sw + 1, H, x, y, cw / n + 1, h); }
        g.fillStyle = "rgba(0,0,0," + (0.55 * Math.sin(a)) + ")"; g.beginPath(); g.moveTo(0, 0); g.lineTo(cw, (H - H * grow) / 2); g.lineTo(cw, (H + H * grow) / 2); g.lineTo(0, H); g.fill();
        // shadow the cover throws on the paper
        var sh = g.createLinearGradient(cw, 0, cw + W * 0.25 * Math.sin(a), 0); sh.addColorStop(0, "rgba(20,10,8,.45)"); sh.addColorStop(1, "rgba(20,10,8,0)"); g.fillStyle = sh; g.fillRect(cw, 0, W * 0.25, H);
      }
      // gutter shadow on the left (the spine)
      var gu = g.createLinearGradient(0, 0, W * 0.08, 0); gu.addColorStop(0, "rgba(30,15,10,.55)"); gu.addColorStop(1, "rgba(30,15,10,0)"); g.fillStyle = gu; g.fillRect(0, 0, W * 0.08, H);
      // the bookplate, laid down (drops a little, its shadow tightens), then gold-tooled
      var pl = seg(t, 2.8, 3.2);
      if (pl > 0) {
        var pw = Math.min(W * 0.72, 420), ph = pw * 0.62, px = W / 2, py = H * 0.46, d = (1 - K.eo3(pl));
        g.save(); g.translate(px, py - d * 18); g.scale(1 + d * 0.06, 1 + d * 0.06); g.globalAlpha = Math.min(1, pl * 3);
        g.shadowColor = "rgba(40,20,10,.35)"; g.shadowBlur = 6 + d * 26; g.shadowOffsetY = 3 + d * 18; g.fillStyle = "#f7f1e3"; g.fillRect(-pw / 2, -ph / 2, pw, ph); g.shadowColor = "transparent";
        g.strokeStyle = "#7a1f2b"; g.lineWidth = 1.2; g.strokeRect(-pw / 2 + 8, -ph / 2 + 8, pw - 16, ph - 16);
        g.fillStyle = "#7a1f2b"; g.font = "italic 500 " + Math.round(ph * 0.1) + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Ex Libris", 0, -ph * 0.26);
        var gl = seg(t, 3.15, 3.6), fs = Math.round(Math.min(ph * 0.2, pw * 0.1));
        g.font = "600 " + fs + "px " + K.SERIF; var tw = g.measureText("TITAN RELIQUARY").width;
        if (gl > 0) {
          var gg = g.createLinearGradient(-tw / 2, 0, tw / 2, 0), sx = K.lerp(-0.3, 1.3, seg(t, 3.4, 4.1));
          gg.addColorStop(0, "#8a6420"); gg.addColorStop(K.clamp(sx - 0.12, 0, 1), "#b8872e"); gg.addColorStop(K.clamp(sx, 0, 1), "#fff1b8"); gg.addColorStop(K.clamp(sx + 0.12, 0, 1), "#b8872e"); gg.addColorStop(1, "#8a6420");
          g.globalAlpha = Math.min(1, gl * 2.5); g.fillStyle = "#5a3d10"; g.fillText("TITAN RELIQUARY", 0.8, ph * 0.04 + 1); g.fillStyle = gg; g.fillText("TITAN RELIQUARY", 0, ph * 0.04);
          g.font = "italic 400 " + Math.round(fs * 0.5) + "px " + K.SERIF; g.fillStyle = "#23306b"; g.fillText("a collection and its stories", 0, ph * 0.25);
        }
        g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      for (var i = 0; i < 9; i++) A.noise(0.35 + i * 0.09 + K.hash(i) * 0.04, 0.05, { type: "bandpass", f: 300 + K.hash(i * 3) * 400, q: 6, v: 0.09 });   // leather creak, a grainy stutter
      A.noise(0.6, 1.1, { type: "lowpass", f: 900, to: 300, shape: [[0.3, 0.09], [1.1, 0.0001]] });                       // the air of the cover
      A.tone(1.62, 70, 0.3, { v: 0.25, to: 45 }); A.noise(1.62, 0.12, { type: "lowpass", f: 400, v: 0.18 });                  // it lands
      A.noise(1.7, 1.1, { type: "bandpass", f: 2500, q: 0.6, shape: [[0.3, 0.025], [1.1, 0.0001]] });                       // the comb through wet size
      A.noise(2.95, 0.1, { type: "lowpass", f: 1200, v: 0.14 });                                                               // the plate pressed
      A.bell(3.4, 1318.5, 0.9, 0.035, [[1, 1], [2.4, 0.3]]);                                                                    // the glint
    }
  });
})();
