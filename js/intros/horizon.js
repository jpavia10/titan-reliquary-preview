/* Event Horizon intro (Grok, theme #38, 2026-10-20). The name seen through a black hole's gravitational lens.
   Act 1 (0-1.3 s): a deep starfield; a black hole drifts in front of it and the stars smear into arcs and an Einstein ring.
   Act 2 (1.1-2.7 s): TITAN RELIQUARY appears behind the hole, lensed: torn into a ring and mirrored arcs around the shadow,
   with a hot accretion ring (one side brighter, Doppler beaming) spinning around it.
   Act 3 (2.6-3.6 s): the hole slides away and shrinks; the light un-bends and the name resolves, clean and glowing, as a last
   flare of light rings out. Lensing is the thin-lens point mass (beta = theta - thetaE^2/theta) on the GPU at full resolution.
   2D path: the name in white-gold glow. Sound: a sub drone that bends in pitch, a whooshing pass, a bright ring at the resolve. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float msk(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5,q.y/U1.z+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "float stars(vec2 q){ vec2 g=q*90.; vec2 id=floor(g); float h=h21(id); vec2 f=fract(g)-.5; return step(.985,h)*exp(-dot(f,f)*28.)*(.5+2.*h21(id+3.)); }",
    "vec3 bg(vec2 q, float nm){ vec3 c=vec3(.004,.004,.012)+vec3(.05,.02,.08)*vn(q*2.5)*vn(q*5.+3.)+vec3(.02,.04,.07)*vn(q*4.+9.)*.6;",
    "  c+=vec3(.9,.85,1.)*stars(q); c+=vec3(.75,.85,1.)*stars(q*.6+7.)*.6;",
    "  float m=msk(q)*nm; c=mix(c, vec3(1.,.93,.82)*1.15, smoothstep(.45,.6,m)); c+=vec3(1.,.7,.4)*exp(-pow((m-.5)*5.,2.))*.9*nm+vec3(1.,.55,.25)*exp(-pow((m-.25)*3.,2.))*.22*nm*smoothstep(0.,.05,m); return c; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float asp=R.x/R.y;",
    "  float k=U0.x, nm=U0.y, fl=U0.z; vec2 H=vec2(U1.w,0.);",   // the hole's centre
    "  float thE=.16*k; vec2 d=p-H; float r=max(length(d),1e-4);",
    "  vec2 src=p-d/r*(thE*thE/r);",                                           // thin-lens point mass
    "  float shadow=smoothstep(thE*.62,thE*.55,r);",
    "  vec3 col=bg(src, nm);",
    "  float ang=atan(d.y,d.x); float ring=exp(-pow((r-thE*.98)/(thE*.06+.001),2.));",
    "  float beam=.55+.45*cos(ang-.4); float sw=.6+.4*vn(vec2(ang*3.+T*4.,r*40.));",
    "  vec2 dd=d*vec2(1.,3.6); float rd=length(dd); float disk=exp(-pow((rd-thE*1.55)/(thE*.5+.001),2.))*step(thE*.7,r)*(.6+.4*vn(vec2(atan(dd.y,dd.x)*4.-T*3.,rd*30.)));",
    "  col=mix(col, vec3(0.), shadow);",
    "  col+=(vec3(1.,.55,.18)*ring*2.2*beam*sw+vec3(1.,.62,.25)*disk*1.4*(.5+.7*(.5+.5*cos(atan(dd.y,dd.x)-.3))))*k;",
    "  float fr=exp(-pow((length(p)-U0.w*1.6)*10.,2.))*U0.w*(1.-U0.w)*4.; col+=vec3(1.,.85,.6)*fr;",
    "  col=1.-exp(-col*1.3); col*=1.-.35*dot(p*.8,p*.8);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(2px)";
    if (st) { g.font = "300 290px " + K.GEO; g.fillText("TITAN", 512, 330); g.font = "300 160px " + K.GEO; g.fillText("RELIQUARY", 512, 690); }
    else { g.font = "300 210px " + K.GEO; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  I.reg("horizon", {
    dur: 4.6, still: 4.1,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, asp = W / H;
      var arrive = K.eio(seg(t, 0.0, 1.3)), leave = K.eio(seg(t, 2.6, 3.6));
      var k = arrive * (1 - leave * 0.92), hx = (1 - arrive) * -0.9 * asp + leave * 0.75 * asp, nm = K.eio(seg(t, 1.1, 1.9)), flare = seg(t, 3.2, 4.0);
      var hw = Math.min(asp * 0.5 * 0.86, 1.8), dz = hw * 2 / (C.texAsp || 5.12);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [k, nm, 0, flare], [hw, 0, dz, hx])) return;
      g.fillStyle = "#020208"; g.fillRect(0, 0, W, H);
      var fs = Math.min(W * 0.1, 96); g.save(); g.globalAlpha = nm; g.font = "300 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#fff1dc"; g.shadowColor = "#ff9a40"; g.shadowBlur = 24;
      if (C.portrait) { g.fillText("TITAN", W / 2, H / 2 - fs / 2); g.fillText("RELIQUARY", W / 2, H / 2 + fs / 2); } else g.fillText("TITAN RELIQUARY", W / 2, H / 2);
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.05, 38, 3.4, { type: "sine", v: 0.26, a: 1.0, to: 30 });                                         // the drone, bending down as the hole passes
      A.tone(0.4, 76.5, 3.0, { type: "sawtooth", v: 0.03, lp: 220, a: 1.2, to: 61 });
      A.noise(0.2, 1.6, { type: "bandpass", f: 180, to: 900, q: 0.6, shape: [[0.9, 0.07], [1.6, 0.0001]] });     // it drifts in
      A.noise(2.6, 1.0, { type: "bandpass", f: 1400, to: 260, q: 0.7, shape: [[0.25, 0.07], [1.0, 0.0001]] });   // and away
      A.bell(3.25, 987.77, 2.2, 0.05, [[1, 1], [2.01, 0.4], [3.98, 0.15]]); A.bell(3.4, 1479.98, 1.8, 0.03, [[1, 1], [2.7, 0.2]]);
    }
  });
})();
