/* Solar Observatory intro (Grok, 2026-10-20). The dome's shutters grind apart, and through the slit you are at the eyepiece: a
   live sun (boiling granulation, limb darkening, sunspots) fills the field, and a black disc (the moon, or a coin held to the
   sun) slides across it. At second contact the last bead of light flares into the diamond ring, then totality: the corona opens
   in streamers and the name appears in its light. WebGL: sun, corona and ring in one shader; 2D fallback: gradients.
   Sound: the dome motor and its stop, then a choir-like chord that swells at totality, a glassy ring at the diamond. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.1;a*=.5;}return s;}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-0.5*R)/min(R.x,R.y); uv.y-=0.08;",
    "  float rs=0.34, r=length(uv), a=atan(uv.y,uv.x); vec2 mo=vec2(U0.x,U0.x*0.12); float rm=0.345;",
    "  float mu=sqrt(max(0.,1.-pow(r/rs,2.)));",
    "  float gran=fbm(uv*38.+vec2(T*0.4,-T*0.3))*0.6+fbm(uv*90.-T*0.5)*0.4;",
    "  vec3 sun=vec3(1.,0.72,0.28)*(0.35+0.65*pow(mu,0.55))*(0.75+0.45*gran);",
    "  sun*=1.-0.85*smoothstep(0.025,0.012,length(uv-vec2(0.08,-0.05)))-0.6*smoothstep(0.015,0.007,length(uv-vec2(-0.11,0.09)));",
    "  vec3 col=sun*step(r,rs);",
    "  col+=vec3(1.,0.6,0.2)*0.25*exp(-max(0.,r-rs)*30.)*step(rs,r)*(1.-U0.y);",              /* glare outside the limb */
    "  float dm=length(uv-mo); float occ=smoothstep(rm,rm-0.003,dm); col*=1.-occ;",
    "  float tot=U0.y;",
    "  float str=pow(fbm(vec2(a*3.,r*2.-T*0.05))*1.2,2.5)+0.25*pow(abs(cos(a*2.)),6.);",
    "  vec3 cor=vec3(0.9,0.93,1.)*(exp(-(r-rs)*7.)*(0.5+str*1.6))*step(rs*0.99,r)*tot;",
    "  col+=cor;",
    "  col+=vec3(1.,0.35,0.45)*exp(-abs(r-rs)*260.)*tot*0.7*(0.5+0.5*vn(vec2(a*20.,T)));",   /* chromosphere */
    "  vec2 bp=vec2(cos(U0.z),sin(U0.z))*rs; float bead=exp(-length(uv-bp)*90.)*U0.w*3.; col+=vec3(1.,0.97,0.9)*bead;",
    "  col+=vec3(1.,0.95,0.85)*U0.w*0.5*exp(-length(uv-bp)*6.);",
    "  float hx=abs(uv.y-bp.y)*1.; col+=vec3(1.)*U0.w*0.35*exp(-hx*80.)*exp(-abs(uv.x-bp.x)*3.);",  /* the flare streak */
    "  float field=smoothstep(0.5,0.47,length(uv+vec2(0.,0.08)*0.)); col*=mix(0.,1.,field); col+=vec3(0.015,0.012,0.01)*field;",
    "  gl_FragColor=vec4(col*U1.x,1.);}"
  ].join("\n");
  I.reg("solaris", {
    dur: 4.6, still: 4.3,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, M = Math.min(W, H);
      var mx = K.lerp(0.75, 0.0, K.eo2(seg(t, 0.8, 2.45))), tot = K.sm(seg(t, 2.45, 3.0)), bead = Math.exp(-Math.pow((t - 2.42) * 7, 2)), up = K.sm(seg(t, 0.55, 1.0));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [mx, tot, Math.PI * 0.94, bead], [up, 0, 0, 0]))) {
        var cx = W / 2, cy = H / 2 - 0.08 * M, rs = 0.34 * M;
        g.fillStyle = "#050507"; g.fillRect(0, 0, W, H); g.globalAlpha = up;
        if (tot > 0) { var co = g.createRadialGradient(cx, cy, rs, cx, cy, rs * 2.4); co.addColorStop(0, "rgba(235,240,255," + 0.8 * tot + ")"); co.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = co; g.fillRect(0, 0, W, H); }
        var sg = g.createRadialGradient(cx, cy, 0, cx, cy, rs); sg.addColorStop(0, "#ffd27a"); sg.addColorStop(1, "#d9661e"); g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, rs, 0, K.PI2); g.fill();
        g.fillStyle = "#050507"; g.beginPath(); g.arc(cx + mx * M, cy - mx * 0.12 * M, rs * 1.013, 0, K.PI2); g.fill(); g.globalAlpha = 1;
      }
      // the dome shutters, sliding apart
      var op = K.eio(seg(t, 0.1, 1.0)), half = W / 2 * (1 - op);
      if (op < 1) { g.fillStyle = "#0b0b10"; g.fillRect(0, 0, half, H); g.fillRect(W - half, 0, half, H);
        g.fillStyle = "rgba(255,255,255,.05)"; for (var r = 0; r < H; r += 34) { g.fillRect(0, r, half, 1); g.fillRect(W - half, r, half, 1); }
        g.fillStyle = "#1b1b22"; g.fillRect(half - 6, 0, 6, H); g.fillRect(W - half, 0, 6, H); }
      // the name, in the corona's light
      var na = seg(t, 3.05, 3.7);
      if (na > 0) { var fs = Math.min(W * 0.075, 46), y = H / 2 - 0.08 * M + 0.34 * M + fs * 2.4;
        g.save(); g.textAlign = "center"; g.textBaseline = "middle"; g.font = "500 " + fs + "px " + K.SERIF; g.globalAlpha = na; g.fillStyle = "#fff4dc"; g.shadowColor = "rgba(255,230,180,.8)"; g.shadowBlur = 20;
        var trk = fs * 0.22 * (1 - K.eo3(na)) + fs * 0.08, txt = "TITAN RELIQUARY", tw = 0, k; for (k = 0; k < txt.length; k++) tw += g.measureText(txt[k]).width + (k < txt.length - 1 ? trk : 0); var x = W / 2 - tw / 2;
        for (k = 0; k < txt.length; k++) { var cw = g.measureText(txt[k]).width; g.fillText(txt[k], x + cw / 2, y); x += cw + trk; }
        g.font = "400 " + Math.max(11, fs * 0.3) + "px " + K.MONO; g.shadowBlur = 0; g.globalAlpha = na * 0.7; g.fillStyle = "#d3c6a6"; g.fillText("TOTALITY \u00b7 00:00:" + ("0" + Math.floor(seg(t, 2.45, 4.6) * 40)).slice(-2), W / 2, y + fs * 1.1);
        g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.1, 48, 0.95, { type: "sawtooth", v: 0.1, lp: 260, a: 0.08 }); A.noise(0.1, 0.9, { type: "bandpass", f: 180, q: 2, v: 0.1 });   // dome motor
      A.noise(1.0, 0.15, { type: "lowpass", f: 500, v: 0.25 }); A.tone(1.0, 80, 0.3, { v: 0.2, to: 50 });                                  // it stops
      A.bell(2.42, 1975, 1.4, 0.05, [[1, 1], [1.5, 0.4], [2.01, 0.25]]);                                                                    // the diamond
      [[220, 0.06], [277.18, 0.045], [329.63, 0.045], [440, 0.03], [554.37, 0.02]].forEach(function (n, i) {                               // the chord swells at totality
        A.tone(2.5, n[0], 2.0, { type: "sawtooth", v: n[1], lp: 1200, a: 0.9, detune: (i % 2 ? 6 : -6) }); A.tone(2.5, n[0] * 1.003, 2.0, { type: "triangle", v: n[1] * 0.8, a: 1.0 }); });
    }
  });
})();
