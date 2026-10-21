/* Prism intro (Grok, 2026-10-20). You look down a kaleidoscope. The barrel turns in two clicks and the coloured chips inside tumble
   and fall, mirrored into a six-fold rose that is never the same twice; on the last turn the chips settle into concentric
   rings like a coin's rim and beads, and the name comes through the glass split into red, green and blue that slide together
   into white. WebGL: the six mirrors and the tumbling chips are one shader (polar fold, moving chip field); 2D: mirrored wedges.
   Sound: the barrel's ratchet, chips rattling as they fall, a glassy shimmer, a resolving chime. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "vec3 hue(float h){return clamp(abs(mod(h*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-0.5*R)/min(R.x,R.y); uv.y-=0.06; float r=length(uv); float a=atan(uv.y,uv.x)+U0.x;",
    "  float seg=3.14159/3.; a=mod(a,seg*2.); a=abs(a-seg);",
    "  vec2 p=vec2(cos(a),sin(a))*r;",
    "  float tumble=U0.y, settle=U0.z; vec3 col=vec3(0.);",
    "  for(int i=0;i<14;i++){ float fi=float(i); vec2 c=vec2(h21(vec2(fi,1.3))*0.42, h21(vec2(fi,7.1))*0.24)+vec2(0.,-0.15*fract(tumble+h21(vec2(fi,3.)))+0.1);",
    "    vec2 ring=vec2(cos(fi*0.2)*(0.12+0.035*mod(fi,4.)),sin(fi*0.2)*(0.12+0.035*mod(fi,4.))*0.3);",
    "    c=mix(c,ring+vec2(0.12+0.035*mod(fi,4.),0.)*0.0+vec2(0.11+0.06*mod(fi,4.),0.02),settle);",
    "    float d=length(p-c); float sz=0.035+0.03*h21(vec2(fi,9.));",
    "    vec3 cc=hue(h21(vec2(fi,5.))+T*0.02)*(0.6+0.4*h21(vec2(fi,2.)));",
    "    col+=cc*smoothstep(sz,sz*0.88,d)*0.95+cc*0.12*exp(-d*40.);}",
    "  col+=vec3(0.95,0.85,1.)*smoothstep(0.004,0.,abs(r-0.36))*settle;",
    "  col+=vec3(0.95,0.8,1.)*smoothstep(0.003,0.,abs(r-0.31))*settle*0.6;",
    "  col*=smoothstep(0.47,0.45,r); col+=vec3(0.07,0.04,0.1)*smoothstep(0.45,0.5,r)*0.;",
    "  col+=vec3(0.06,0.03,0.09)*(1.-smoothstep(0.45,0.47,r))*0.4;",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  I.reg("kaleido", {
    dur: 4.2, still: 3.9,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, M = Math.min(W, H);
      var turn = K.eob(seg(t, 0.2, 0.8), 1.2) * 0.9 + K.eob(seg(t, 1.2, 1.8), 1.2) * 0.9 + K.eo3(seg(t, 2.2, 2.9)) * 0.7;
      var tumble = K.eo2(seg(t, 0.2, 1.0)) * 0.6 + K.eo2(seg(t, 1.2, 2.0)) * 0.6, settle = K.eio(seg(t, 2.2, 2.9));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [turn, tumble, settle, 0]))) {
        g.fillStyle = "#130b20"; g.fillRect(0, 0, W, H); var cx = W / 2, cy = H / 2 - 0.06 * M, R = 0.46 * M;
        for (var w = 0; w < 6; w++) { g.save(); g.translate(cx, cy); g.rotate(turn + w * Math.PI / 3); if (w % 2) g.scale(1, -1);
          g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, 0, Math.PI / 3); g.closePath(); g.clip();
          for (var i = 0; i < 9; i++) { g.fillStyle = "hsl(" + (i * 40 + t * 10) + ",80%,60%)"; g.beginPath(); g.arc(R * (0.2 + 0.08 * i) , R * 0.15 * K.hash(i + Math.floor(tumble * 5)), R * 0.07, 0, K.PI2); g.fill(); } g.restore(); }
      }
      // the barrel's rim
      g.strokeStyle = "rgba(238,111,214,.35)"; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2 - 0.06 * M, 0.465 * M, 0, K.PI2); g.stroke();
      // the name: three colour channels sliding together into white
      var na = seg(t, 2.85, 3.6);
      if (na > 0) { var fs = Math.min(W * 0.075, 46), y = H / 2 - 0.06 * M + 0.5 * M + fs * 1.4, sp = (1 - K.eo3(na)) * fs * 0.5;
        g.save(); g.globalCompositeOperation = "lighter"; g.font = "700 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle"; g.globalAlpha = Math.min(1, na * 2);
        g.fillStyle = "#ff0040"; g.fillText("TITAN RELIQUARY", W / 2 - sp, y); g.fillStyle = "#00ff60"; g.fillText("TITAN RELIQUARY", W / 2, y + sp * 0.3); g.fillStyle = "#3040ff"; g.fillText("TITAN RELIQUARY", W / 2 + sp, y); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      [0.2, 1.2, 2.2].forEach(function (s) { for (var k = 0; k < 6; k++) A.noise(s + k * 0.07, 0.012, { type: "highpass", f: 3500, v: 0.1 }); });   // ratchet
      for (var i = 0; i < 70; i++) { var s = (i < 35 ? 0.3 : 1.3) + (i % 35) * 0.022 + K.hash(i) * 0.05; A.tone(s, 2500 + K.hash(i * 5) * 3500, 0.02, { v: 0.03, type: "triangle" }); }   // chips falling
      A.noise(2.2, 0.8, { type: "bandpass", f: 7000, q: 3, shape: [[0.3, 0.05], [0.8, 0.0001]] });
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) { A.bell(2.9 + i * 0.05, f, 1.4, 0.04, [[1, 1], [2.76, 0.2]]); });
    }
  });
})();
