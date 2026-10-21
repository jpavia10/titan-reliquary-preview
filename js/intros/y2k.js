/* Millennium Chrome intro (Grok, 2026-10-20). The year 2000 as it imagined itself: a dial-up handshake screeches while drops of
   liquid chrome bead up on a white void, wobble and merge into one mirror blob that stretches into a ring, and the name lands
   in fat bevelled chrome with a lens flare skating across it and a "Y2K READY" sticker slapped on. WebGL: metaballs with a
   fake environment reflection (sky above, horizon line, warm floor) in one shader; 2D: gradient blobs. Sound: the modem, a
   rising synth sweep, a glossy startup chord, the sticker's slap. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-0.5*R)/min(R.x,R.y); uv.y=-uv.y+0.1;",
    "  float m=U0.x, ring=U0.y; float f=0.;",
    "  for(int i=0;i<7;i++){ float fi=float(i); float a=fi*0.897+T*0.6; vec2 c=vec2(cos(a),sin(a*1.3))*(0.34*(1.-m))+vec2(0.,0.);",
    "    vec2 rc=vec2(cos(fi*0.897+T*0.8),sin(fi*0.897+T*0.8))*0.2; c=mix(c,rc,ring); f+=0.012/(dot(uv-c,uv-c)+0.0005); }",
    "  float e=0.0025; vec2 g2=vec2(0.);",
    "  for(int i=0;i<7;i++){ float fi=float(i); float a=fi*0.897+T*0.6; vec2 c=vec2(cos(a),sin(a*1.3))*(0.34*(1.-m)); vec2 rc=vec2(cos(fi*0.897+T*0.8),sin(fi*0.897+T*0.8))*0.2; c=mix(c,rc,ring); vec2 d=uv-c; float q=dot(d,d)+0.0005; g2+=-0.024*d/(q*q); }",
    "  float th=1.0; float ins=smoothstep(th-0.06,th+0.06,f);",
    "  vec3 n=normalize(vec3(-g2*0.012,1.)); vec3 rf=reflect(vec3(0.,0.,-1.),n);",
    "  float hz=rf.y; vec3 env=hz>0.?mix(vec3(0.85,0.9,1.),vec3(0.25,0.35,0.75),pow(hz,0.6)):mix(vec3(0.55,0.45,0.4),vec3(0.12,0.1,0.12),pow(-hz,0.5));",
    "  env+=vec3(1.)*smoothstep(0.02,0.,abs(hz))*0.8; env+=vec3(1.)*pow(max(dot(rf,normalize(vec3(-0.4,0.5,0.8))),0.),40.);",
    "  vec3 bg=vec3(0.93,0.94,0.97)-length(uv)*0.08; vec3 col=mix(bg,env,ins);",
    "  col-=vec3(0.12)*smoothstep(th*0.6,th*0.95,f)*(1.-ins)*0.6;",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  I.reg("y2k", {
    dur: 4.3, still: 4.0,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, M = Math.min(W, H);
      var merge = K.eio(seg(t, 0.3, 1.6)), ring = K.eio(seg(t, 1.6, 2.4));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [merge, ring, 0, 0]))) {
        g.fillStyle = "#eef0f8"; g.fillRect(0, 0, W, H);
        for (var i = 0; i < 7; i++) { var a = i * 0.897 + t * 0.6, x = W / 2 + Math.cos(a) * M * 0.34 * (1 - merge), y = H / 2 - 0.1 * M - Math.sin(a * 1.3) * M * 0.34 * (1 - merge);
          var gr = g.createRadialGradient(x - 8, y - 8, 2, x, y, M * 0.12); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#8a93b8"); gr.addColorStop(1, "#2a2f55"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, M * 0.1, 0, K.PI2); g.fill(); }
      }
      // the name in bevelled chrome, landing with a bounce
      var na = seg(t, 2.3, 2.75);
      if (na > 0) { var fs = Math.min(W * (C.portrait ? 0.13 : 0.085), 84), y = H * 0.73, s = K.eob(na, 2.4);
        g.save(); g.translate(W / 2, y); g.scale(s, s); g.font = "900 italic " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
        var lines = C.portrait ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"];
        lines.forEach(function (ln, li) { var yy = (li - (lines.length - 1) / 2) * fs * 0.95, f2 = li && C.portrait ? 0.62 : 1; g.font = "900 " + fs * f2 + "px " + K.GEO;
          g.lineJoin = "round"; g.strokeStyle = "#14163a"; g.lineWidth = fs * f2 * 0.12; g.strokeText(ln, 0, yy); g.fillStyle = "#14163a"; g.fillText(ln, 3, yy + 5);
          var cg = g.createLinearGradient(0, yy - fs * 0.5 * f2, 0, yy + fs * 0.5 * f2); cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.42, "#c4cbe8"); cg.addColorStop(0.5, "#6a73a8"); cg.addColorStop(0.58, "#dfe3f5"); cg.addColorStop(1, "#ffffff");
          g.fillStyle = cg; g.fillText(ln, 0, yy); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.strokeText(ln, 0, yy); });
        g.restore();
        var fx = K.lerp(-W * 0.2, W * 1.2, seg(t, 2.7, 3.5)); if (t > 2.7 && t < 3.5) { g.save(); g.globalCompositeOperation = "lighter"; var fl = g.createRadialGradient(fx, y - fs * 0.2, 0, fx, y - fs * 0.2, fs * 1.2); fl.addColorStop(0, "rgba(255,255,255,.9)"); fl.addColorStop(0.2, "rgba(160,180,255,.4)"); fl.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = fl; g.fillRect(0, 0, W, H);
          g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(0, y - fs * 0.2 - 1, W, 2); [0.3, 0.55, 0.8].forEach(function (k, i) { g.fillStyle = "rgba(" + (i ? 120 : 255) + ",180,255,.25)"; g.beginPath(); g.arc(K.lerp(fx, W / 2, k * 2 - 0.5), y - fs * 0.2 + (k - 0.5) * 40, 6 + i * 8, 0, K.PI2); g.fill(); }); g.restore(); } }
      // the sticker
      var st = seg(t, 3.3, 3.45);
      if (st > 0) { var sx = W * 0.76, sy = H * 0.6, sc = 1 + 0.8 * (1 - K.eob(st, 2.5)), r = Math.min(W, H) * 0.08;
        g.save(); g.translate(sx, sy); g.rotate(0.25); g.scale(sc, sc); g.fillStyle = "#5b33c4"; g.beginPath(); for (var k = 0; k < 24; k++) { var a2 = k / 24 * K.PI2, rr = k % 2 ? r : r * 0.86; g.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); } g.closePath(); g.fill();
        g.fillStyle = "#fff"; g.font = "900 " + r * 0.34 + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Y2K", 0, -r * 0.16); g.font = "700 " + r * 0.22 + "px " + K.GEO; g.fillText("READY", 0, r * 0.22); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.0, 1650, 0.35, { type: "sine", v: 0.05 }); A.tone(0.0, 1850, 0.35, { v: 0.04 });                         // modem: dial tone pair
      A.noise(0.38, 0.5, { type: "bandpass", f: 2200, q: 2, v: 0.07 }); A.tone(0.45, 2100, 0.3, { type: "square", v: 0.02, to: 1200 });   // handshake screech
      A.noise(0.9, 0.7, { type: "bandpass", f: 1500, q: 4, shape: [[0.1, 0.05], [0.6, 0.04], [0.7, 0.0001]] });
      A.tone(0.6, 200, 1.7, { type: "sawtooth", v: 0.05, to: 1600, lp: 2500, a: 0.2 });                                 // synth sweep as the chrome merges
      [[261.63, 0.05], [392, 0.04], [523.25, 0.04], [659.25, 0.035], [987.77, 0.025]].forEach(function (n, i) { A.tone(2.32 + i * 0.03, n[0], 2.0, { type: "triangle", v: n[1], a: 0.01 }); });   // startup chord
      A.noise(3.3, 0.05, { type: "lowpass", f: 1500, v: 0.25 });
    }
  });
})();
