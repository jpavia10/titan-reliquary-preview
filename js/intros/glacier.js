/* Hyperborean Vault intro (Grok, 2026-10-20). We are inside a wall of ancient ice, looking out. Fracture lines race across
   the glass with a crack you feel; each new fault refracts and bends the blue world behind it (GL: a Voronoi shatter field
   with per-shard offset and chromatic dispersion). At the last crack the shards drift apart and frost burns off from the
   centre, uncovering the name etched into a polished ice plate. Sound: deep ice groans, sharp cracks with sub thumps, a
   glassy shimmer. WebGL with a 2D fallback. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "vec3 vor(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;vec2 id=vec2(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(h21(i+g),h21(i+g+7.3));vec2 r=g+o-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=i+g;}else if(d<d2)d2=d;}return vec3(sqrt(d2)-sqrt(d1),id);}",
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.1+3.1;a*=.5;}return s;}",
    "void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 s=vec2((uv.x-.5)*asp,uv.y-.5);",
    " float crack=U0.x,part=U0.y,frost=U0.z;",
    " vec3 v=vor(s*3.2);float r=length(s);float reach=crack*1.4;",
    " float edge=(1.-smoothstep(0.,0.018,v.x))*step(r+h21(v.yz)*0.3,reach);",
    " vec2 off=(vec2(h21(v.yz),h21(v.yz+3.))-.5)*0.06*step(r+h21(v.yz)*0.3,reach)+normalize(s+1e-4)*part*0.08*h21(v.yz+1.);",
    " vec3 col;for(int c=0;c<3;c++){vec2 q=s+off*(1.+float(c)*0.25);float n=fbm(q*2.5+T*0.05);float ch=mix(0.15,0.95,n);col[c]=c==0?ch*0.35:c==1?ch*0.7:ch;}",
    " col+=vec3(.7,.9,1.)*edge*1.2;",
    " float tx=texture2D(TX,vec2(uv.x,uv.y)).r;",
    " float fr=smoothstep(frost-0.05,frost+0.05,r)*(1.-step(1.,frost)*0.);",
    " col=mix(col,vec3(.86,.93,1.)*(0.8+0.2*fbm(s*14.)),fr*0.75);",
    " col=mix(col*(1.-tx*(1.-fr)*0.5),vec3(1.),tx*(1.-fr));",
    " col*=smoothstep(1.4,0.2,r);gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function label(W, H) { var c = K.mk(W, H), g = c.getContext("2d"), fs = Math.min(W * 0.085, 48); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.font = "300 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("TITAN RELIQUARY", W / 2, H / 2);
    g.font = "500 " + fs * 0.26 + "px " + K.MONO; g.fillText("SEALED  \u00b7  \u221274\u00b0  \u00b7  VAULT XXXIV", W / 2, H / 2 + fs * 0.9); return c; }
  var CR = [0.25, 0.85, 1.35, 1.8];
  I.reg("glacier", {
    dur: 4.2, still: 3.9,
    init: function (C) { C.L = I.gl(C, FRAG); if (C.L) C.L.tex(label(Math.round(C.W), Math.round(C.H))); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, i, cr = 0;
      for (i = 0; i < CR.length; i++) cr += K.eo3(seg(t, CR[i], CR[i] + 0.14)) * 0.25;
      var part = K.eio(seg(t, 2.0, 3.6)), frost = K.lerp(0, 1.2, K.eo3(seg(t, 2.1, 3.3)));
      var shake = 0; for (i = 0; i < CR.length; i++) { var d = t - CR[i]; if (d > 0 && d < 0.2) shake = (1 - d / 0.2) * 5; }
      C.cv.style.transform = shake ? "translate(" + (K.hash(t * 99) - 0.5) * shake + "px," + (K.hash(t * 77) - 0.5) * shake + "px)" : "";
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [cr, part, frost, 0]))) {
        var bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.7); bg.addColorStop(0, "#8fd0ff"); bg.addColorStop(1, "#06223a"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.strokeStyle = "rgba(230,248,255,.85)"; g.lineWidth = 1.2; var r = K.rng(5);
        for (i = 0; i < 30 * cr; i++) { var a = r() * K.PI2, l = Math.min(W, H) * (0.2 + r() * 0.5); g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 + Math.cos(a) * l * 0.5 + (r() - 0.5) * 30, H / 2 + Math.sin(a) * l * 0.5); g.lineTo(W / 2 + Math.cos(a) * l, H / 2 + Math.sin(a) * l); g.stroke(); }
        g.save(); g.globalAlpha = seg(t, 2.2, 3.2); g.drawImage(label(W, H), 0, 0); g.globalCompositeOperation = "source-over"; g.restore();
      }
    },
    dispose: function (C) { if (C.cv) C.cv.style.transform = ""; },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0, 48, 2.4, { type: "sawtooth", to: 36, v: 0.05, lp: 160, a: 0.5 });
      CR.forEach(function (s, i) { A.noise(s, 0.09, { type: "highpass", f: 2500 + i * 600, v: 0.4 }); A.noise(s, 0.4, { type: "bandpass", f: 900, q: 3, v: 0.1 }); A.tone(s, 70, 0.3, { to: 30, v: 0.22 }); });
      [1318.5, 1567.98, 1975.53, 2637.02].forEach(function (f, i) { A.bell(2.3 + i * 0.11, f, 1.6, 0.03, [[1, 1], [2.76, 0.3]]); });
      A.tone(2.2, 164.81, 1.8, { type: "triangle", v: 0.05, a: 0.4 }); A.tone(2.2, 246.94, 1.8, { type: "triangle", v: 0.03, a: 0.4 });
    }
  });
})();
