/* Shipwreck intro (Grok, 2026-10-20). A dive. You drop through the surface light (god rays shrinking above you), a depth gauge
   counts down past 40 m as the water turns from teal to black and marine snow drifts up past the lens; a submersible lamp clicks
   on and its cone sweeps the dark until it finds the hull of a wreck on the bottom, a gold glint in its hold, and the name on the
   ship's bow plate. WebGL: water column, caustic rays, lamp cone and silt in one shader; 2D: gradients and a drawn hull.
   Sound: the splash, the pressure rumble, sonar pings slowing as you near, the lamp's relay click, a metal groan from the hull. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y; vec2 p=vec2((uv.x-.5)*asp,uv.y);",
    "  float dep=U0.x, lamp=U0.y, ang=U0.z;",
    "  vec3 col=mix(vec3(0.05,0.35,0.42),vec3(0.0,0.03,0.06),dep)*(0.4+0.6*uv.y*(1.-dep)+0.15);",
    "  float rays=pow(vn(vec2(p.x*7.+p.y*1.5,T*0.3)),3.)*smoothstep(0.2,1.,uv.y)*(1.-dep)*0.8; col+=vec3(0.5,0.9,0.9)*rays*0.35;",
    "  vec2 lo=vec2(0.,1.05); vec2 d=p-lo; float a=atan(d.x,-d.y); float cone=smoothstep(0.32,0.2,abs(a-ang))*lamp*exp(-length(d)*0.9);",
    "  col+=vec3(0.75,0.85,0.8)*cone*0.55;",
    "  vec2 sp=p*vec2(24.,24.)+vec2(0.,T*2.2); vec2 ci=floor(sp), cf=fract(sp)-0.5; vec2 o=vec2(h21(ci),h21(ci+7.1))-0.5; float sn=smoothstep(0.06,0.0,length(cf-o*0.7))*step(0.75,h21(ci+3.3));",
    "  col+=vec3(0.8,0.9,0.9)*sn*(0.12+cone*1.2);",
    "  col*=smoothstep(1.4,0.2,length((uv-0.5)*vec2(asp,1.)));",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function hull(g, W, H, a) {                          // the wreck: a listing hull with ribs showing, a broken mast
    g.save(); g.globalAlpha = a; g.translate(W * 0.5, H * 0.8); g.rotate(-0.12);
    var L = Math.min(W * 0.9, H * 0.6);
    g.fillStyle = "#0e1a1e"; g.beginPath(); g.moveTo(-L / 2, -L * 0.08); g.quadraticCurveTo(-L * 0.45, L * 0.1, -L * 0.2, L * 0.13); g.lineTo(L * 0.42, L * 0.12); g.quadraticCurveTo(L * 0.55, -L * 0.02, L * 0.5, -L * 0.14); g.closePath(); g.fill();
    g.strokeStyle = "rgba(120,170,170,.25)"; g.lineWidth = 2; for (var i = 0; i < 9; i++) { var x = -L * 0.3 + i * L * 0.08; g.beginPath(); g.moveTo(x, -L * 0.07); g.quadraticCurveTo(x + 6, L * 0.03, x, L * 0.12); g.stroke(); }
    g.strokeStyle = "#0b1416"; g.lineWidth = 6; g.beginPath(); g.moveTo(L * 0.05, -L * 0.08); g.lineTo(L * 0.12, -L * 0.42); g.lineTo(L * 0.2, -L * 0.36); g.stroke();
    g.restore();
  }
  I.reg("abyss", {
    dur: 4.6, still: 4.3,
    init: function (C) { C.L = I.gl(C, FRAG); C.snow = []; for (var i = 0; i < 60; i++) C.snow.push([K.hash(i), K.hash(i + 99), K.hash(i + 7)]); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var dep = K.eio(seg(t, 0.1, 2.3)), lamp = t > 2.1 ? (t < 2.16 ? 0.4 : 1) : 0, sw = K.eio(seg(t, 2.2, 3.3)), ang = K.lerp(-0.6, 0.12, sw) + Math.sin(t * 1.3) * 0.03;
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [dep, lamp, ang, 0]))) {
        var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, K.mixc("#0d6b78", "#01070c", dep)); bg.addColorStop(1, K.mixc("#05343d", "#000203", dep)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        if (lamp) { g.fillStyle = "rgba(190,215,205,.18)"; g.beginPath(); g.moveTo(W / 2, -10); g.lineTo(W / 2 + Math.tan(ang - 0.3) * H, H); g.lineTo(W / 2 + Math.tan(ang + 0.3) * H, H); g.fill(); }
      }
      // the wreck, only where the lamp has found it
      var found = K.sm(seg(t, 2.9, 3.5)); if (found > 0) hull(g, W, H, found * 0.95);
      var gl = seg(t, 3.3, 3.6) * (1 - seg(t, 4.0, 4.6));
      if (gl > 0) { var gx = W * 0.47, gy = H * 0.8; g.save(); g.globalCompositeOperation = "lighter"; var gg = g.createRadialGradient(gx, gy, 0, gx, gy, 30); gg.addColorStop(0, "rgba(255,220,120," + gl + ")"); gg.addColorStop(1, "rgba(255,200,80,0)"); g.fillStyle = gg; g.fillRect(gx - 30, gy - 30, 60, 60);
        g.strokeStyle = "rgba(255,240,200," + gl + ")"; g.lineWidth = 1; g.beginPath(); g.moveTo(gx - 14, gy); g.lineTo(gx + 14, gy); g.moveTo(gx, gy - 14); g.lineTo(gx, gy + 14); g.stroke(); g.restore(); }
      // the depth gauge (left edge) and the bow plate
      var m = Math.round(dep * 41.6 * 10) / 10, fs = Math.max(12, Math.min(W * 0.035, 18));
      g.fillStyle = "rgba(178,238,243,.85)"; g.font = "600 " + fs + "px " + K.MONO; g.textAlign = "left"; g.textBaseline = "middle";
      g.fillText("DEPTH " + m.toFixed(1) + " m", 16, H - 26); g.fillStyle = "rgba(178,238,243,.4)"; for (var i = 0; i < 12; i++) g.fillRect(16, H * 0.25 + i * H * 0.04, i % 3 ? 6 : 12, 1);
      g.fillStyle = "#4fd6e2"; g.fillRect(16, H * 0.25 + dep * H * 0.44 - 2, 18, 3);
      var bp = K.eo3(seg(t, 3.5, 4.1));
      if (bp > 0) { var big = Math.min(W * 0.08, 48); g.save(); g.globalAlpha = bp; g.textAlign = "center"; g.font = "700 " + big + "px " + K.SERIF; g.fillStyle = "#b8a77a"; g.shadowColor = "rgba(79,214,226,.6)"; g.shadowBlur = 14;
        g.fillText("TITAN RELIQUARY", W / 2, H * 0.52); g.font = "500 " + big * 0.32 + "px " + K.MONO; g.shadowBlur = 0; g.fillStyle = "rgba(178,238,243,.75)"; g.fillText("WRECK FOUND \u00b7 41.6 m", W / 2, H * 0.52 + big * 0.85); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.05, 0.6, { type: "lowpass", f: 2500, to: 300, shape: [[0.03, 0.3], [0.6, 0.0001]] });               // the splash in
      A.noise(0.3, 4.2, { type: "lowpass", f: 140, q: 0.6, shape: [[1.0, 0.18], [3.8, 0.14], [4.2, 0.0001]] });     // pressure rumble
      [0.7, 1.4, 2.0, 2.5, 2.9, 3.25].forEach(function (s) { A.tone(s, 1250, 0.7, { v: 0.06, a: 0.003 }); A.tone(s + 0.18, 1250, 0.5, { v: 0.015 }); });   // sonar, closing in
      A.noise(2.1, 0.02, { type: "highpass", f: 2500, v: 0.2 }); A.tone(2.1, 60, 0.12, { v: 0.15 });                   // lamp relay
      A.tone(3.0, 110, 1.4, { type: "sawtooth", v: 0.05, to: 82, lp: 500, q: 6, a: 0.2 });                            // the hull groans
      A.bell(3.35, 2093, 1.2, 0.03, [[1, 1], [2.7, 0.3]]);
    }
  });
})();
