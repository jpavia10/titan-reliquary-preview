/* Free Fall intro (Grok, 2026-10-20, v2). Terminal velocity. Face-down through stacked cloud decks that rush up at the lens
   (GL fbm slabs, radial motion blur, vapour streaks), the horizon rolling; a gold coin tumbles alongside you, flashing each
   time its face catches the sun. You punch through the last deck into clear air: the land is a mile below (fields, river,
   a town grid, all slowly growing), and the collection's coins fall in loose formation around you at different depths.
   On the beat they snap, in parallax, into the letters of TITAN RELIQUARY; a sun glint crosses the word. No parachute.
   Sound: wind roar that keeps building, buffeting, a whoomph through the deck, airy silence below, then the coins'
   chiming snap and a low swell. WebGL with 2D fallback; Lite has fewer coins and no blur. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+1.3;a*=.5;}return s;}",
    "vec3 clouds(vec2 s,float z){vec3 col=mix(vec3(.30,.50,.80),vec3(.80,.88,.97),clamp(.5+s.y,0.,1.));",
    " for(int i=0;i<6;i++){float d=fract(z+float(i)/6.);float sc=mix(6.,.35,d);float n=fbm(s*sc+float(i)*7.1);",
    "  float a=smoothstep(.42,.72,n)*smoothstep(0.,.3,d)*smoothstep(1.,.8,d);col=mix(col,vec3(1.)*(.78+.25*n),a*.9);}return col;}",
    "vec3 land(vec2 s,float g){vec2 p=s*mix(2.6,1.7,g)+vec2(.3,.1);float n=fbm(p*3.);vec2 w=p+.08*vec2(fbm(p*5.),fbm(p*5.+4.));",
    " vec3 c=mix(vec3(.28,.42,.22),vec3(.55,.55,.32),h21(floor(w*vec2(9.,6.))));",   /* field patchwork */
    " c=mix(c,vec3(.36,.5,.28),smoothstep(.45,.6,n));",
    " float rv=abs(p.y-.15*sin(p.x*4.)-.05);c=mix(c,vec3(.35,.55,.75),1.-smoothstep(.006,.014,rv));",
    " vec2 tg=abs(fract((p-vec2(.25,-.2))*90.)-.5);float town=smoothstep(.1,.05,length(p-vec2(.25,-.2)))*step(.47,max(tg.x,tg.y))*.0;vec2 fc=abs(fract(w*vec2(9.,6.))-.5);c=mix(c,vec3(.78,.7,.45),step(.8,h21(floor(w*vec2(9.,6.))+5.))*.6);c*=1.-.35*smoothstep(.46,.5,max(fc.x,fc.y));c*=.92+.08*vn(w*80.);c*=1.-.25*smoothstep(.5,.7,fbm(p*1.5+T*.05));",
    " return mix(c,vec3(.7,.8,.92),.35);}",
    "void main(){vec2 uv=gl_FragCoord.xy/R;vec2 s=(uv-.5)*vec2(R.x/R.y,1.);float z=U0.x,roll=U0.y,blur=U0.z,below=U0.w;",
    " float c=cos(roll),si=sin(roll);s=mat2(c,-si,si,c)*s;vec3 col=vec3(0.);",
    " for(int k=0;k<3;k++){float f=1.-float(k)*.05*blur;vec2 q=s*f;col+=below>.5?land(q,U1.x):clouds(q,z-float(k)*.02*blur);}col/=3.;",
    " if(below>.5){float deck=U1.y;col=mix(col,vec3(1.),deck);}",
    " float r=length(s);float st=h21(vec2(floor(atan(s.y,s.x)*60.),floor(r*3.-z*30.)));col+=vec3(.9)*step(.93,st)*smoothstep(.25,.8,r)*blur*.35;",
    " col*=1.-.35*smoothstep(.5,1.,r);gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function pts(W, H, n) {                                   // target points inside the title
    var c = K.mk(W, H), g = c.getContext("2d"), fs = Math.min(W * 0.15, 92); g.font = "900 " + fs + "px " + K.SANS; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("TITAN", W / 2, H * 0.47); g.fillText("RELIQUARY", W / 2, H * 0.47 + fs * 1.05); var d = g.getImageData(0, 0, W, H).data, P = [], r = K.rng(7), tries = 0;
    while (P.length < n && tries++ < 60000) { var x = r() * W | 0, y = r() * H | 0; if (d[(y * W + x) * 4 + 3] > 128) P.push([x, y]); } return { P: P, fs: fs };
  }
  function coin(g, x, y, r, ph, glint) {
    var sx = Math.cos(ph); g.save(); g.translate(x, y); g.rotate(ph * 0.3); g.scale(Math.max(0.12, Math.abs(sx)), 1);
    var gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); gr.addColorStop(0, "#fff2c0"); gr.addColorStop(0.55, "#d9a640"); gr.addColorStop(1, "#7a4e14");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, K.PI2); g.fill(); g.strokeStyle = "rgba(255,236,170,.9)"; g.lineWidth = Math.max(1, r * 0.12); g.beginPath(); g.arc(0, 0, r * 0.82, 0, K.PI2); g.stroke(); g.restore();
    if (glint > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,245,210," + glint + ")"; g.fillRect(x - r * 2.2, y - 1, r * 4.4, 2); g.fillRect(x - 1, y - r * 2.2, 2, r * 4.4); g.restore(); }
  }
  var PUNCH = 2.25, SNAP = 3.05;
  I.reg("freefall", {
    dur: 4.4, still: 4.15,
    init: function (C) { C.L = I.gl(C, FRAG); var n = C.lite ? 70 : 150, T = pts(Math.round(C.W), Math.round(C.H), n); C.tp = T.P; C.fs = T.fs;
      var r = K.rng(21); C.cs = C.tp.map(function () { return [r() * 1.4 - 0.2, r() * 1.4 - 0.2, 0.3 + r() * 0.9, r() * 6.28, r()]; }); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, lite = C.lite, i;
      var v = Math.min(t, PUNCH), z = v * (0.5 + v * 0.42), roll = Math.sin(t * 1.3) * 0.35 * (1 - seg(t, PUNCH, PUNCH + 0.8)), blur = lite ? 0 : (t < PUNCH ? 0.4 + v * 0.3 : 0.25 * (1 - seg(t, PUNCH, PUNCH + 0.6)));
      var below = t >= PUNCH ? 1 : 0, deck = below ? 1 - K.eo3(seg(t, PUNCH, PUNCH + 0.35)) : 0, grow = seg(t, PUNCH, 4.4);
      var shake = lite ? 0 : (t < PUNCH ? 1 + v * 2.2 : Math.max(0, 10 * (1 - (t - PUNCH) / 0.25)));
      C.cv.style.transform = shake ? "translate(" + (K.hash(t * 91) - 0.5) * shake + "px," + (K.hash(t * 53) - 0.5) * shake + "px)" : "";
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [z, roll, blur, below], [grow, deck, 0, 0]))) {
        var sk = g.createLinearGradient(0, 0, 0, H); if (below) { sk.addColorStop(0, "#8fa86a"); sk.addColorStop(1, "#5f7a48"); } else { sk.addColorStop(0, "#5a84c0"); sk.addColorStop(1, "#c8daf0"); } g.fillStyle = sk; g.fillRect(0, 0, W, H);
        if (!below) for (i = 0; i < 10; i++) { var d = (z + i * 0.1) % 1, rr = K.lerp(20, W * 1.2, d * d); g.fillStyle = "rgba(255,255,255," + 0.6 * Math.sin(d * Math.PI) + ")"; g.beginPath(); g.ellipse(W * K.hash(i), H * K.hash(i + 5), rr, rr * 0.45, 0, 0, K.PI2); g.fill(); }
        else { g.fillStyle = "rgba(255,255,255," + deck + ")"; g.fillRect(0, 0, W, H); } }
      // vapour trails off the edges of frame (the speed)
      if (t < PUNCH + 0.3 && !lite) { g.save(); g.globalCompositeOperation = "lighter"; for (i = 0; i < 26; i++) { var a = K.hash(i) * K.PI2, ph = (t * (2.5 + K.hash(i + 3) * 2) + K.hash(i + 7)) % 1, r0 = Math.max(W, H) * (0.15 + ph * 0.9);
          g.strokeStyle = "rgba(255,255,255," + 0.35 * ph * (1 - seg(t, PUNCH, PUNCH + 0.3)) + ")"; g.lineWidth = 1 + ph * 2.5; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); g.lineTo(W / 2 + Math.cos(a) * (r0 + 60 + ph * 120), H / 2 + Math.sin(a) * (r0 + 60 + ph * 120)); g.stroke(); } g.restore(); }
      // the sun through the deck: a soft flare that the clouds pulse over
      if (t < PUNCH) { g.save(); g.globalCompositeOperation = "lighter"; var fx0 = W * 0.18, fy0 = H * 0.12, pk = 0.35 + 0.25 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
        var fg = g.createRadialGradient(fx0, fy0, 0, fx0, fy0, Math.max(W, H) * 0.5); fg.addColorStop(0, "rgba(255,244,214," + pk + ")"); fg.addColorStop(1, "rgba(255,230,190,0)"); g.fillStyle = fg; g.fillRect(0, 0, W, H);
        [0.35, 0.6, 1.25].forEach(function (k2, j) { var gx = K.lerp(fx0, W / 2, k2 * 2), gy = K.lerp(fy0, H / 2, k2 * 2); g.fillStyle = "rgba(" + ["180,220,255", "255,210,160", "200,255,220"][j] + "," + pk * 0.25 + ")"; g.beginPath(); g.arc(gx, gy, Math.min(W, H) * (0.03 + j * 0.03), 0, K.PI2); g.fill(); }); g.restore(); }
      // the companion coin, tumbling alongside in the clouds
      if (t < SNAP) { var cr = Math.min(W, H) * 0.09, cxp = W * (0.68 + 0.06 * Math.sin(t * 1.7)), cyp = H * (0.36 + 0.05 * Math.cos(t * 2.1)), ph = t * 7.5, gl = Math.pow(Math.max(0, Math.cos(ph)), 24);
        coin(g, cxp, cyp, cr * (1 + seg(t, PUNCH, SNAP) * 0.2), ph, gl * 0.9); }
      if (below && t < PUNCH + 0.7 && !lite) { var wp = seg(t, PUNCH, PUNCH + 0.7); g.save(); for (i = 0; i < 9; i++) { var a2 = K.hash(i + 30) * K.PI2, rr2 = Math.max(W, H) * (0.3 + wp * 0.9);
          g.fillStyle = "rgba(255,255,255," + 0.55 * (1 - wp) + ")"; g.beginPath(); g.ellipse(W / 2 + Math.cos(a2) * rr2, H / 2 + Math.sin(a2) * rr2, W * 0.35, W * 0.12, a2, 0, K.PI2); g.fill(); } g.restore(); }
      // below the deck: the collection falling in formation, then snapping into the title
      if (below) { var fi = seg(t, PUNCH, PUNCH + 0.4), sn = K.eo3(seg(t, SNAP, SNAP + 0.55)), cr2 = Math.max(3, C.fs * 0.075);
        for (i = 0; i < C.cs.length; i++) { var c = C.cs[i], p = C.tp[i], dep = c[2], fx = (c[0] + Math.sin(t * 0.8 + i) * 0.01) * W, fy = (c[1] - (t - PUNCH) * 0.05 * dep) * H;
          var x = K.lerp(fx, p[0], sn), y = K.lerp(fy, p[1], sn), rad = K.lerp(cr2 * 2.6 * dep, cr2, sn), spin = c[3] + t * 6 * (1 - sn);
          g.globalAlpha = fi; coin(g, x, y, rad, spin, 0); }
        g.globalAlpha = 1;
        var ft = seg(t, SNAP + 0.45, SNAP + 0.8); if (ft > 0) { g.save(); g.globalAlpha = ft; g.font = "900 " + C.fs + "px " + K.SANS; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(255,226,140,.0)";
          var tg = g.createLinearGradient(0, H * 0.4, 0, H * 0.6); tg.addColorStop(0, "#fff2c0"); tg.addColorStop(0.5, "#e0ac48"); tg.addColorStop(1, "#9a6a20"); g.fillStyle = tg; g.shadowColor = "rgba(10,20,10,.85)"; g.shadowBlur = 18; g.shadowOffsetY = 5;
          g.fillText("TITAN", W / 2, H * 0.47); g.fillText("RELIQUARY", W / 2, H * 0.47 + C.fs * 1.05); g.restore();
          var sw = seg(t, SNAP + 0.7, SNAP + 1.2); if (sw > 0 && sw < 1) { g.save(); g.globalCompositeOperation = "lighter"; var gx = K.lerp(W * 0.1, W * 0.9, sw), gy = H * 0.47 - C.fs * 0.3; g.fillStyle = "rgba(255,250,220,.9)"; g.fillRect(gx - 30, gy - 1, 60, 2); g.fillRect(gx - 1, gy - 30, 2, 60); g.restore(); }
          g.save(); g.globalAlpha = seg(t, SNAP + 0.8, SNAP + 1.1); g.font = "600 " + Math.max(11, W * 0.03) + "px " + K.MONO; g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.9)"; g.fillText("ALT 5,280 FT  \u00b7  120 MPH  \u00b7  TERMINAL", W / 2, H * 0.47 + C.fs * 1.8); g.restore(); } }
    },
    dispose: function (C) { if (C.cv) C.cv.style.transform = ""; },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, PUNCH, { type: "bandpass", f: 300, to: 1600, q: 0.6, shape: [[0.3, 0.08], [PUNCH - 0.1, 0.38], [PUNCH, 0.0001]] });       // building roar
      A.noise(0, PUNCH, { type: "lowpass", f: 140, v: 0.2 }); for (var i = 0; i < 8; i++) A.noise(0.3 + i * 0.25, 0.12, { type: "lowpass", f: 400, v: 0.12 });   // buffeting
      for (i = 0; i < 5; i++) A.bell(0.5 + i * 0.42, 2637, 0.25, 0.015, [[1, 1], [2.4, 0.3]]);                                                // the companion coin's flashes
      A.noise(PUNCH - 0.05, 0.45, { type: "lowpass", f: 2000, to: 200, v: 0.45 }); A.tone(PUNCH, 60, 0.5, { to: 35, v: 0.25 });             // whoomph through the deck
      A.noise(PUNCH + 0.2, 2.0, { type: "bandpass", f: 700, q: 0.5, shape: [[0.3, 0.04], [2.0, 0.0001]] });                                     // airy below
      [1046.5, 1318.5, 1567.98, 2093, 2637].forEach(function (f, k) { A.bell(SNAP + 0.05 + k * 0.07, f, 1.4, 0.04, [[1, 1], [2.32, 0.4], [4.25, 0.15]]); });   // the snap
      A.tone(SNAP, 98, 1.3, { type: "sawtooth", v: 0.04, lp: 500, a: 0.2 }); A.tone(SNAP, 146.83, 1.3, { type: "sawtooth", v: 0.03, lp: 600, a: 0.2 });
    }
  });
})();
