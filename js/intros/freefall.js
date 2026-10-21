/* Free Fall intro (Grok, 2026-10-20). We jump. The plane door frame whips up and out of view, then we are dropping face-down
   through cloud layers that rush toward the lens (GL: raymarched-feel fbm slabs with speed streaks); the horizon tilts and
   rolls; at the canopy snap the motion brakes hard, the camera swings up to see a parachute bloom, and the name hangs on it.
   Sound: engine roar cut off by wind, a building rush, the canopy crack, then silence and a single bright synth note. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p.xy+p.z*1.7);p=p*2.02+1.3;a*=.5;}return s;}",
    "void main(){vec2 uv=gl_FragCoord.xy/R;vec2 s=(uv-.5)*vec2(R.x/R.y,1.);float z=U0.x,roll=U0.y,brake=U0.z;",
    " float c=cos(roll),si=sin(roll);s=mat2(c,-si,si,c)*s;",
    " vec3 col=mix(vec3(.25,.45,.75),vec3(.75,.85,.95),uv.y);float acc=0.;",
    " for(int i=0;i<5;i++){float d=fract(z*.8+float(i)*.2);float sc=mix(5.,.4,d);float n=fbm(vec3(s*sc+float(i)*3.1,float(i)));",
    "  float a=smoothstep(.45,.75,n)*smoothstep(0.,.25,d)*smoothstep(1.,.75,d);acc=max(acc,a);col=mix(col,vec3(1.)*(.82+.18*n),a*.85);}",
    " float st=h21(floor(vec2(atan(s.y,s.x)*40.,0.)));col+=vec3(st*smoothstep(.2,.9,length(s))*(1.-brake)*.08*step(.8,st));",
    " col=mix(col,vec3(.55,.72,.92),brake*.5);gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  I.reg("freefall", {
    dur: 4.2, still: 3.9,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var snap = 2.3, fall = Math.min(t, snap) * (0.6 + Math.min(t, snap) * 0.35) + Math.max(0, t - snap) * 0.08, roll = Math.sin(Math.min(t, snap) * 1.6) * 0.5 * (1 - seg(t, snap, snap + 0.6)), brake = K.eo3(seg(t, snap, snap + 0.5));
      var shake = t < snap ? 2 + t * 1.5 : Math.max(0, 8 * (1 - (t - snap) / 0.3)); C.cv.style.transform = "translate(" + (K.hash(t * 91) - 0.5) * shake + "px," + (K.hash(t * 53) - 0.5) * shake + "px)";
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [fall, roll, brake, 0]))) { var sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#6a90c8"); sk.addColorStop(1, "#c8daf0"); g.fillStyle = sk; g.fillRect(0, 0, W, H);
        for (var i = 0; i < 10; i++) { var d = (fall * 0.8 + i * 0.1) % 1, r = K.lerp(20, W, d); g.fillStyle = "rgba(255,255,255," + 0.5 * Math.sin(d * Math.PI) + ")"; g.beginPath(); g.ellipse(W * K.hash(i), H * K.hash(i + 5), r, r * 0.4, 0, 0, K.PI2); g.fill(); } }
      // the plane door, whipping away
      var dr = seg(t, 0, 0.5); if (dr < 1) { var off = K.ei2(dr) * H * 1.2; g.fillStyle = "#2b2f36"; g.fillRect(0, -off, W * 0.12, H); g.fillRect(W * 0.88, -off, W * 0.12, H); g.fillRect(0, H * 0.82 - off, W, H * 0.3); g.fillStyle = "#f2c230"; g.fillRect(0, H * 0.82 - off, W, 6); }
      // canopy
      var op = K.eob(seg(t, snap, snap + 0.45), 1.8); if (op > 0) { var cx = W / 2, cy = H * K.lerp(0.1, 0.32, brake), cw = Math.min(W * 0.86, 480) * op, ch = cw * 0.32;
        g.save(); g.strokeStyle = "rgba(30,30,40,.6)"; g.lineWidth = 1; for (var k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(cx - cw / 2 + cw * k / 8, cy); g.lineTo(cx, cy + cw * 0.9); g.stroke(); }
        var cols = ["#ff5a36", "#ffd23a", "#ff5a36", "#ffffff", "#ff5a36", "#ffd23a", "#ff5a36", "#ffffff"]; for (k = 0; k < 8; k++) { g.fillStyle = cols[k]; g.beginPath(); g.moveTo(cx - cw / 2 + cw * k / 8, cy); g.quadraticCurveTo(cx - cw / 2 + cw * (k + 0.5) / 8, cy - ch * 1.1, cx - cw / 2 + cw * (k + 1) / 8, cy); g.quadraticCurveTo(cx - cw / 2 + cw * (k + 0.5) / 8, cy - ch * 0.75, cx - cw / 2 + cw * k / 8, cy); g.fill(); }
        g.fillStyle = "#1a1d24"; g.beginPath(); g.arc(cx, cy + cw * 0.9, 5, 0, K.PI2); g.fill(); g.fillRect(cx - 3, cy + cw * 0.9 + 4, 6, 14); g.restore();
        var nm = seg(t, snap + 0.5, snap + 1.0); if (nm > 0) { var fs = Math.min(W * 0.1, 56); g.save(); g.globalAlpha = nm; g.font = "800 " + fs + "px " + K.SANS; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(20,40,80,.35)"; g.fillText("TITAN RELIQUARY", W / 2 + 2, H * 0.78 + 3); g.fillStyle = "#fff"; g.fillText("TITAN RELIQUARY", W / 2, H * 0.78);
          g.font = "600 " + fs * 0.26 + "px " + K.MONO; g.fillText("ALT 4,200 FT  \u00b7  CANOPY OPEN", W / 2, H * 0.78 + fs * 0.85); g.restore(); } }
    },
    dispose: function (C) { if (C.cv) C.cv.style.transform = ""; },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0, 70, 0.45, { type: "sawtooth", v: 0.08, lp: 400 }); A.noise(0, 0.45, { type: "lowpass", f: 500, v: 0.15 });
      A.noise(0.35, 1.95, { type: "bandpass", f: 400, to: 1800, q: 0.7, shape: [[0.5, 0.05], [1.9, 0.25], [1.95, 0.0001]] });
      A.noise(2.3, 0.12, { type: "lowpass", f: 1500, v: 0.6 }); A.tone(2.3, 90, 0.25, { to: 40, v: 0.25 });
      A.noise(2.4, 1.6, { type: "lowpass", f: 300, v: 0.03 }); A.tone(2.85, 880, 1.3, { type: "triangle", v: 0.06, a: 0.05 }); A.tone(2.85, 1318.5, 1.3, { v: 0.03, a: 0.2 });
    }
  });
})();
