/* Survey Map intro (Grok, 2026-10-20). A survey flight over unknown ground. The map is blank paper; as the plane's scan line
   crosses it, terrain is measured into existence: contour lines appear and thicken every fifth line, the land is shaded from
   lowland green to buff heights, then the camera tilts from overhead into an oblique view so the contours stand up as relief,
   and a summit marker is planted with the name as its label and its height. WebGL: the heightfield, isolines, hypsometric tint,
   hillshade and the tilt are one shader; 2D: drawn rings. Sound: a propeller drone panning across, survey beeps on each
   measured band, a soft arpeggio as the relief rises. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+1.7;a*=.5;}return s;}",
    "float hf(vec2 p){ float d=length(p-vec2(0.05,0.05)); return fbm(p*2.2+3.)*0.55+0.6*exp(-d*d*5.); }",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y; float scan=U0.x, tilt=U0.y;",
    "  vec2 s=vec2((uv.x-.5)*asp,uv.y-.5);",
    "  float k=1.+tilt*1.2*(0.5-s.y); vec2 p=vec2(s.x*k, (s.y+0.12*tilt)*(1.+tilt*0.8));",   /* oblique: rows compress toward the top */
    "  float h=hf(p), e=0.004; float hx=hf(p+vec2(e,0.)), hy=hf(p+vec2(0.,e));",
    "  vec3 n=normalize(vec3((h-hx)/e,(h-hy)/e,3.)); float sh=clamp(dot(n,normalize(vec3(-0.6,0.6,0.6))),0.,1.);",
    "  vec3 tint=h<0.45?mix(vec3(0.16,0.3,0.24),vec3(0.35,0.45,0.3),h/0.45):mix(vec3(0.55,0.5,0.36),vec3(0.86,0.8,0.68),(h-0.45)/0.6);",
    "  float lines=h*28.; float w=fwidth_(lines);",
    "  float iso=1.-smoothstep(0.,w*1.2,abs(fract(lines)-0.5)*2.-1.+w*2.); float major=step(4.,mod(floor(lines+0.5),5.));",
    "  vec3 paper=vec3(0.06,0.09,0.1);",
    "  float done=smoothstep(scan+0.02,scan-0.02,1.-uv.y);",
    "  vec3 col=mix(paper, tint*(0.45+0.75*sh*(0.4+0.6*tilt)), done*0.9);",
    "  col=mix(col, vec3(1.,0.75,0.35), iso*(0.12+0.55*major)*done);",
    "  col+=vec3(1.,0.71,0.28)*exp(-abs((1.-uv.y)-scan)*120.)*step(scan,0.999)*0.8;",
    "  col*=smoothstep(1.3,0.3,length((uv-.5)*vec2(asp,1.)));",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n").replace("float w=fwidth_(lines);", "float w=0.08;");
  I.reg("contour", {
    dur: 4.4, still: 4.1,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var scan = K.eio(seg(t, 0.2, 2.2)), tilt = K.eio(seg(t, 2.1, 3.2));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [scan, tilt, 0, 0]))) {
        g.fillStyle = "#0b1315"; g.fillRect(0, 0, W, H); g.save(); g.beginPath(); g.rect(0, 0, W, H * scan); g.clip(); g.strokeStyle = "rgba(255,181,71,.6)";
        for (var r = 1; r < 14; r++) { g.lineWidth = r % 5 ? 0.8 : 1.8; g.beginPath(); g.ellipse(W * 0.52, H * 0.45, r * W * 0.04, r * W * 0.03 * (1 - tilt * 0.5), 0, 0, K.PI2); g.stroke(); } g.restore();
      }
      // the plane, flying the scan line
      if (scan < 1) { var py = H * scan, px = W * (0.15 + 0.7 * scan); g.save(); g.translate(px, py); g.fillStyle = "#eef6f4"; g.beginPath(); g.moveTo(0, -10); g.lineTo(2.5, 8); g.lineTo(-2.5, 8); g.fill(); g.fillRect(-12, -1, 24, 3); g.fillRect(-5, 7, 10, 2); g.restore(); }
      // summit marker + label
      var mk = K.eob(seg(t, 3.1, 3.45), 2), lb = seg(t, 3.35, 3.8);
      if (mk > 0) { var sx = W * 0.53, sy = H * K.lerp(0.45, 0.5, tilt), fs = Math.min(W * 0.068, 40);
        g.fillStyle = "#ffb547"; g.beginPath(); g.moveTo(sx, sy - 16 * mk); g.lineTo(sx + 9 * mk, sy); g.lineTo(sx - 9 * mk, sy); g.closePath(); g.fill(); g.strokeStyle = "#0b1315"; g.lineWidth = 1.5; g.stroke();
        if (lb > 0) { g.save(); g.globalAlpha = lb; g.strokeStyle = "rgba(238,246,244,.8)"; g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy - 18); g.lineTo(sx, sy - 18 - fs * 1.4 * lb); g.stroke();
          g.font = "700 " + fs + "px " + K.SANS; g.textAlign = "center"; g.textBaseline = "bottom"; var lw = g.measureText("TITAN RELIQUARY").width; g.fillStyle = "rgba(11,19,21,.72)"; g.fillRect(sx - lw / 2 - 12, sy - 22 - fs * 2.5, lw + 24, fs * 1.75); g.fillStyle = "rgba(11,19,21,.6)"; g.fillText("TITAN RELIQUARY", sx + 1, sy - 22 - fs * 1.4 + 1); g.fillStyle = "#eef6f4"; g.fillText("TITAN RELIQUARY", sx, sy - 22 - fs * 1.4);
          g.font = "500 " + fs * 0.36 + "px " + K.MONO; g.fillStyle = "#ffd28a"; g.fillText("\u25b2 1,909 m  \u00b7  SURVEYED 2026", sx, sy - 22 - fs * 1.4 + fs * 0.5); g.restore(); } }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.1, 92, 2.3, { type: "sawtooth", v: 0.06, lp: 400, a: 0.3 }); A.tone(0.1, 92 * 1.5, 2.3, { type: "sawtooth", v: 0.02, lp: 500, a: 0.3 }); A.noise(0.1, 2.3, { type: "bandpass", f: 300, q: 1, shape: [[0.4, 0.06], [2.0, 0.05], [2.3, 0.0001]] });
      for (var i = 0; i < 10; i++) A.tone(0.3 + i * 0.19, 1760, 0.04, { type: "square", v: 0.02 });
      [329.63, 392, 493.88, 587.33, 659.25, 783.99].forEach(function (f, i) { A.tone(2.15 + i * 0.16, f, 0.9, { type: "triangle", v: 0.06, a: 0.01 }); });
      A.tone(3.12, 1318.5, 0.6, { v: 0.05 });
    }
  });
})();
