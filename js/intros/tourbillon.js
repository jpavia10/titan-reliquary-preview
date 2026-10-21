/* Tourbillon intro (Claude, theme #41, 2026-10-21; Grok's plan in notes/agents/themes-37-50.md: "crown winds, balance starts,
   gears cascade, hands sweep to the name").
   Act 1 (0-1.0 s): close on the sunburst ratchet wheel under a watchmaker's lamp; the crown winds it, one tooth per click.
   Act 2 (1.0-2.0 s): the camera dives past the ratchet; underneath, the gilt screw balance starts to swing (amplitude grows to 250
   degrees at 3 Hz, motion-blurred) and the escapement begins to tick.
   Act 3 (1.9-3.0 s): the train cascades out from the balance, wheel after wheel meshing with the last (tooth counts solved like
   fx/tourbillon.js), every wheel stepping on the beat; the camera pulls back.
   Act 4 (2.9-4.6 s): two blued Breguet hands sweep a full turn and lock at ten past ten; the name is engraved in their wake, in
   polished silver under smoked sapphire; the repeater strikes twice and a glint runs along the letters.
   GPU fragment shader at full resolution; 2D path: the name in silver with the hands at 10:10. Sound: real recordings when they are
   in memory (the tick and tock of audio/ambience/clock, a strike from audio/ambience/chimes, the same cuts the theme's soundscape
   uses), otherwise short filtered clicks and a two-note gong; the recordings load in the background for the next time. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var PI = Math.PI;
  function f(v) { return (+v).toFixed(5); }
  /* the cascade: a chain of wheels round the balance, each meshing with the one before (same tooth size) */
  var MOD = .0068, CH = [{ c: [.338, .123], R: .13 }], STEPS = [[-70, .17], [-150, .1], [-160, .12], [160, .16], [120, .2], [50, .12]];
  STEPS.forEach(function (s) { var p = CH[CH.length - 1], a = s[0] * PI / 180, d = p.R + s[1]; CH.push({ c: [p.c[0] + Math.cos(a) * d, p.c[1] + Math.sin(a) * d], R: s[1], from: CH.length - 1 }); });
  (function () { var g1 = CH[1], a = -10 * PI / 180; CH.push({ c: [g1.c[0] + Math.cos(a) * (g1.R + .3), g1.c[1] + Math.sin(a) * (g1.R + .3)], R: .3, from: 1 });
    var g5 = CH[5]; CH.push({ c: [g5.c[0] - (g5.R + .28), g5.c[1]], R: .28, from: 5 }); })();
  CH.forEach(function (g, i) { g.n = Math.round(2 * g.R / MOD); g.R = g.n * MOD / 2; g.t0 = 1.95 + i * .1; g.sp = g.R > .12 ? 5 : 4;
    if (g.from == null) { g.A = 0; g.B = 1; return; } var p = CH[g.from], phi = Math.atan2(g.c[1] - p.c[1], g.c[0] - p.c[0]), s1 = 2 * PI / p.n, s2 = 2 * PI / g.n;
    var b = -s2 / s1, a = phi + PI - s2 * .5 + s2 * phi / s1;   // psi = a + b*psi_prev (from mesh() in fx/tourbillon.js)
    g.A = a + b * p.A; g.B = b * p.B; });
  var GEARS = CH.map(function (g) {
    return "  { vec2 g=q-vec2(" + f(g.c[0]) + "," + f(g.c[1]) + "); float ap=smoothstep(" + f(g.t0) + "," + f(g.t0 + .22) + ",T); float sc=mix(.82,1.,ap)+.05*sin(clamp((T-" + f(g.t0) + ")*12.,0.,3.1416));" +
      " float R=" + f(g.R) + "; if(ap>0.&&dot(g,g)<(R*sc+.02)*(R*sc+.02)){ vec2 gq=r2(g/sc,-(" + f(g.A) + "+" + f(g.B) + "*P0)); float d=gear(gq,R," + g.n + "., " + g.sp + ".)*sc;" +
      " float bt=clamp(-d/.004,0.,1.); vec2 T2=normalize(vec2(-g.y,g.x)+1e-5); vec3 c=gilt(g,T2,bt,L); col=mix(col,c*(.55+.45*ap),cov(d)*ap); } }";
  }).join("\n");
  var FRAG = [
    "#define PI 3.14159265",
    "vec2 r2(vec2 v,float a){ float c=cos(a), s=sin(a); return vec2(c*v.x-s*v.y, s*v.x+c*v.y); }",
    "float PX;",
    "float cov(float d){ return clamp(.5-d/PX,0.,1.); }",
    "float gear(vec2 q,float R,float n,float sp){ float r=length(q), a=atan(q.y,q.x); float mo=2.*R/n, ra=R+mo*.95, rd=R-mo*1.2, seg=6.2832/n, la=mod(a,seg)-seg*.5;",
    "  float tip=clamp((r-R+mo*.3)/(ra-R+mo*.3),0.,1.); float w=mo*PI*.24*(1.-.55*tip*tip); float d=min(r-rd,max(abs(la)*r-w,r-ra));",
    "  if(sp>0.){ float rim=rd-max(.011,R*.1), hub=max(.02,R*.17), ss=6.2832/sp, sa=mod(a+ss*.5,ss)-ss*.5, sw=max(.006,R*.05);",
    "    float wd=max(max(hub-r,r-rim),sw-abs(sa)*r); d=max(d,-wd); } return d; }",
    "float brush(vec2 T, vec3 H, float w){ vec2 B=vec2(-T.y,T.x); float a=dot(T,H.xy)/w, b=dot(B,H.xy)/(H.z*.5); return exp(-a*a-b*b); }",
    // satin gilt with a polished chamfer at the edges; L = lamp position (x, y, height) in movement units
    "vec3 gilt(vec2 g, vec2 T, float bt, vec3 L){ vec3 P=vec3(g,0.); vec3 Ld=normalize(L-vec3(0.,0.,0.)); vec3 H=normalize(Ld+vec3(0.,0.,1.));",
    "  vec3 c=vec3(.1,.07,.03)*.6+vec3(1.,.74,.38)*(brush(T,H,.07)*.6+.06);",
    "  return mix(c+vec3(1.,.85,.6)*(1.-bt)*.5, c, bt); }",
    "float cumB(float x, float hw){ float fl=floor(x), u=x-fl; return fl*2.*hw+min(u,hw)+max(0.,u-(1.-hw)); }",
    "float sweep(float u0, float Ls, float hw, float pxu){ float l=sqrt(Ls*Ls+pxu*pxu); return clamp((cumB(u0+l*.5,hw)-cumB(u0-l*.5,hw))/l,0.,1.); }",
    "float msk(vec2 s){ vec2 uv=vec2(s.x/U0.x*.5+.5,(s.y-U0.w)/U0.y+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "float hand(vec2 s, float a, float len, float w, float moon){ vec2 d=vec2(cos(a),sin(a)); vec2 h=vec2(dot(s,d),dot(s,vec2(-d.y,d.x)));",
    "  float taper=w*(1.-.75*clamp(h.x/len,0.,1.)); float body=max(abs(h.y)-taper, max(-h.x-.035, h.x-len));",
    "  float mn=abs(length(h-vec2(len*moon,0.))-w*2.1)-w*.55; return min(min(body,mn), length(s)-w*2.2); }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float A=R.x/R.y; float port=U0.z; PX=1./R.y;",
    "  float t=T, tau=max(t-1.,0.);",
    // the camera: close on the ratchet, a dive past it to the balance, then a pull back for the cascade
    "  vec2 ax=port>.5?vec2(.5,A*.5):vec2(A*.5,.5); float kf=min(1.,min(ax.x/.78,ax.y/.44));",
    "  float z=mix(1.5,1.12,smoothstep(.0,1.,t)); z=mix(z,1.,smoothstep(1.,1.8,t)); z=mix(z,.86,smoothstep(1.9,3.,t));",
    "  vec2 pr=port>.5?vec2(-p.y,p.x):p; vec2 q=pr/(z*kf); PX=1./(R.y*z*kf);",
    "  float lx=mix(-.7,.5,smoothstep(0.,4.4,t)); vec3 L=vec3(lx,.45,.7);",
    // the plate: dark ruthenium perlage
    "  vec2 gp=q/.045, cl=floor(gp); vec2 dv=vec2(.5); float bo=-1e9;",                                  // overlapping perlage spots, the last one on top
    "  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 id=cl+vec2(float(i),float(j)); vec2 d=gp-(id+.5+(vec2(h21(id),h21(id+7.))-.5)*.18); if(length(d)<.9){ float o=id.y*977.+id.x; if(o>bo){ bo=o; dv=d/.9*.62; } } }",
    "  vec2 Tp=normalize(vec2(-dv.y,dv.x)+1e-5); vec3 H=normalize(normalize(L-vec3(q,0.))+vec3(0.,0.,1.));",
    "  float lamp=smoothstep(0.,.6,t)*(1.1/(1.+dot(q-L.xy,q-L.xy)*1.6));",
    "  vec3 col=vec3(.02,.021,.025)+vec3(.4,.42,.48)*brush(Tp,H,.16)*.35*lamp; col*=.88+.12*smoothstep(.62,.45,length(dv));",
    // act 1: the ratchet wheel (sunburst steel) winding a tooth per click, then the dive past it
    "  float steps=0.; for(int i=0;i<6;i++){ float tc=.12+float(i)*.13; steps+=smoothstep(tc,tc+.05,t); }",
    "  float dive=smoothstep(.95,1.55,t); float rs=1.+dive*2.6; float ra=1.-smoothstep(1.15,1.6,t);",
    "  if(ra>0.){ vec2 g=q/rs; float d=gear(r2(g,steps*6.2832/60.),.33,60.,0.)*rs; if(d<PX*2.){ vec2 T=normalize(g+1e-5);",
    "      vec3 c=vec3(.05,.052,.058)+vec3(.72,.74,.8)*brush(T,H,.07)*(.25+.75*lamp)*.9; float bt=clamp(-d/.006,0.,1.); c+=vec3(.9,.92,1.)*(1.-bt)*.45*lamp;",
    "      float rr=length(g); c=mix(c,vec3(.03,.06,.22)+vec3(.4,.55,1.)*pow(max(1.-rr/.07,0.),2.)*.6,smoothstep(.072,.068,rr)); c=mix(c,vec3(.01,.015,.05),smoothstep(.012,.008,abs(r2(g,steps*6.2832/60.+.6).y))*step(rr,.066));",
    "      col=mix(col,c,cov(d)*ra); } }",
    // the crown wheel at the edge, meshing with the ratchet
    "  if(ra>0.){ vec2 cc=vec2(.33+.12,.0)*rs; vec2 g=(q-cc)/rs; float d=gear(r2(g,-steps*6.2832/24.+.1309),.12,24.,4.)*rs; if(d<PX*2.){ vec3 c=vec3(.06)+vec3(.72,.74,.8)*brush(normalize(g+1e-5),H,.07)*.8*lamp; col=mix(col,c,cov(d)*ra); } }",
    // act 2: the balance swings up (analytic motion blur), the hairspring breathes
    "  float amp=4.36*smoothstep(1.,1.7,t); float ph=6.2832*3.*tau; float bal=amp*sin(ph), Ls=amp*6.2832*3.*cos(ph)*.01; float bv=smoothstep(.9,1.35,t);",
    "  if(bv>0.){ float rb=length(q), a=atan(q.y,q.x);",
    "    if(rb<.23){ float dr=abs(rb-.2)-.012; vec2 T=normalize(vec2(-q.y,q.x)+1e-5); vec3 gl=vec3(.12,.085,.035)+vec3(1.,.74,.42)*(brush(T,H,.06)*.9+.08)*(.4+.6*lamp*1.4);",
    "      col=mix(col,gl,cov(dr)*bv);",
    "      float ca=sweep((a-bal-1.5708)/2.0944,Ls/2.0944,.0065/rb/2.0944,PX/rb/2.0944)*smoothstep(.024,.028,rb)*step(rb,.19); col=mix(col,gl*.95,ca*bv);",
    "      float ds=abs(rb-.218); if(ds<.0095){ float w=sqrt(max(.009*.009-ds*ds,0.))/rb; col=mix(col,gl*1.1,sweep((a-bal)/.5236,Ls/.5236,w/.5236,PX/rb/.5236)*bv); }",
    "      if(rb>.035&&rb<.165){ float wr=1.-(rb-.035)/.13; float v=(rb-.035)/.0095-(a-bal*wr*.9)/6.2832; float hv=sweep(v+.5,Ls*wr*.9/6.2832,.0009/.0095,PX/.0095);",
    "        col=mix(col,vec3(.05,.1,.4)+vec3(.3,.45,1.)*.5*lamp,hv*bv); }",
    "      float hub=length(q)-.03; col=mix(col,vec3(.2,0.,.02)+vec3(.9,.1,.15)*smoothstep(.03,0.,rb)*.8+vec3(1.)*smoothstep(.012,.0,length(q-vec2(-.008,.008)))*.6,cov(hub)*bv); } }",
    // act 3: the train cascades out, every wheel stepping on the beat
    "  float bt6=max(t-1.9,0.)*6.; float P0=(floor(bt6)+1.-exp(-fract(bt6)*40.))/6.*1.1;",
    GEARS,
    // act 4: smoked sapphire band, the name engraved where the minute hand has passed, the hands lock at ten past ten
    "  float sw=smoothstep(2.95,4.,t); sw=sw*sw*(3.-2.*sw); float am=1.5708-sw*7.3304; float ah=3.2289-sw*.6109;",
    "  float hs=min(1.,(port>.5?A*.5:.5)/.4);",
    "  vec2 sp=p/hs; float band=smoothstep(2.85,3.3,t);",
    "  float bandM=exp(-pow((p.y-U0.w)/(U0.y*.85),2.)*2.)*step(abs(p.x),U0.x*1.15); col*=1.-.55*band*bandM;",
    "  float ap=atan(p.y,p.x); float passed=mod(1.5708-ap+12.5664,6.2832); float rv=clamp(((1.5708-am)-passed)/.25,0.,1.)*step(2.95,t);",
    "  float m=msk(p); float mx=msk(p+vec2(.0025,0.))-msk(p-vec2(.0025,0.)), my=msk(p+vec2(0.,.0025))-msk(p-vec2(0.,.0025));",
    "  if(m>.002){ vec3 N=normalize(vec3(-mx*2.5,-my*2.5,1.)); vec3 Ln=normalize(vec3(lx,.6,.6)); float spc=pow(max(dot(N,normalize(Ln+vec3(0.,0.,1.))),0.),40.);",
    "    float gx=smoothstep(4.,4.6,t); float glint=exp(-pow((p.x-mix(-U0.x*1.2,U0.x*1.2,gx))*5.,2.))*step(4.,t)*(1.-gx*.5);",
    "    vec3 silver=vec3(.62,.64,.7)*(.55+.45*N.z)+vec3(1.)*spc*.9+vec3(1.,.97,.9)*glint*1.4*m;",
    "    col=mix(col,silver,smoothstep(.3,.6,m)*rv); }",
    "  float lock=exp(-max(t-4.,0.)*9.)*step(4.,t);",
    "  for(int i=0;i<2;i++){ float a=i==0?ah:am; float len=i==0?.22:.33; float d=hand(sp,a,len,i==0?.009:.0065,.72)*hs; float hv=smoothstep(2.9,3.15,t);",
    "    if(d<PX*hs*2.){ vec2 dd=vec2(cos(a),sin(a)); float side=dot(sp,vec2(-dd.y,dd.x)); vec3 blue=vec3(.02,.05,.2)+vec3(.25,.45,1.)*(.35+.65*smoothstep(-.006,.006,side*(lx>0.?1.:-1.)))*.85+vec3(.6,.75,1.)*lock*.6;",
    "      col=mix(col,blue,clamp(.5-d/(PX*hs),0.,1.)*hv); } }",
    "  { float hv=smoothstep(2.9,3.15,t); float d=length(sp)-.016; col=mix(col,vec3(.03,.06,.22)+vec3(.5,.65,1.)*smoothstep(.016,0.,length(sp-vec2(-.005,.006)))*.8,clamp(.5-d*hs/(PX*hs),0.,1.)*hv); }",
    // the sapphire's violet sheen, the loupe vignette, a little film tone
    "  col+=vec3(.42,.36,.85)*exp(-pow((dot(p,normalize(vec2(1.,.62)))-.3+t*.04)/.12,2.))*.035;",
    "  col*=1.-.45*smoothstep(.45,1.05,length(p*vec2(1./A*1.2,1.))); col*=smoothstep(0.,.35,t);",
    "  col=1.-exp(-col*1.25);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(1.6px)";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", \"Hoefler Text\", Georgia, serif";
    if (st) { g.font = "600 250px " + serif; g.fillText("TITAN", 512, 330); g.font = "600 128px " + serif; g.fillText("RELIQUARY", 512, 680); }
    else { g.font = "600 190px " + serif; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  /* real recordings for the sound when they are already in memory (decoded once per session, shared by every play) */
  var BUF = {}, LOADING = {};
  var TICKS = [[.664, .13], [1.67, .13], [2.664, .13], [3.67, .13]], GONG = [13.735, .6];
  function warm(ctx, name) { if (BUF[name] || LOADING[name] || !window.fetch) return; LOADING[name] = 1;
    var ext = (function () { try { return new Audio().canPlayType('audio/webm; codecs="opus"') ? ".webm" : ".m4a"; } catch (e) { return ".m4a"; } })();
    fetch("audio/ambience/" + name + ext).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) { if (!ab) return;
      return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); }).then(function (b) { if (b) BUF[name] = b; }).catch(function () { LOADING[name] = 0; }); }
  function cut(A, name, s, seg, rate, v, rel) { var b = BUF[name]; if (!b) return false; var x = A.ctx, src = x.createBufferSource(), g = x.createGain(), t = A.t0 + s, end = t + seg[1] / rate;
    src.buffer = b; src.playbackRate.value = rate; g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, Math.max(t, end - rel)); g.gain.linearRampToValueAtTime(0, end);
    src.connect(g); g.connect(A.out); src.start(t, seg[0], seg[1]); A.nodes.push(src); return true; }
  I.reg("tourbillon", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, asp = W / H, port = asp < 1 ? 1 : 0;
      var hw = Math.min(asp * .5 * .8, 1.6), dz = hw * 2 / (C.texAsp || 5.12), yc = port ? -.2 : -.15;
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [hw, dz, port, yc], [0, 0, 0, 0])) return;
      var gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7); gr.addColorStop(0, "#15161b"); gr.addColorStop(1, "#050507");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, R = Math.min(W, H) * .3, sw = K.seg(t, 2.95, 4), am = PI / 2 - sw * 7.3304, ah = 3.2289 - sw * .6109;
      g.save(); g.strokeStyle = "rgba(201,160,90,.55)"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * .65, 0, 2 * PI); g.stroke(); g.restore();
      [[ah, R * .62, 6], [am, R * .95, 4]].forEach(function (h) { g.save(); g.strokeStyle = "#5f86ff"; g.lineWidth = h[2]; g.lineCap = "round"; g.beginPath(); g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(h[0]) * h[1], cy - Math.sin(h[0]) * h[1]); g.stroke(); g.restore(); });
      var fs = Math.min(W * .095, 92); g.save(); g.globalAlpha = Math.min(1, Math.max(.15, (t - 2.95) / .8)); g.font = "600 " + fs + "px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#d9dde6";
      var ty = cy - yc * H; if (C.portrait) { g.fillText("TITAN", cx, ty - fs * .55); g.fillText("RELIQUARY", cx, ty + fs * .55); } else g.fillText("TITAN RELIQUARY", cx, ty);
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return; warm(A.ctx, "clock"); warm(A.ctx, "chimes");
      var rec = !!(BUF.clock && BUF.chimes);
      for (var i = 0; i < 6; i++) { var tc = .12 + i * .13;                                                                      // the crown winds the ratchet
        if (!(rec && cut(A, "clock", tc, TICKS[i % 4], 3.1 + i * .06, .5, .01))) { A.noise(tc, .03, { type: "bandpass", f: 4200 + i * 150, q: 3, v: .22 }); A.noise(tc + .006, .05, { type: "bandpass", f: 1500, q: 2, v: .08 }); } }
      for (var n = 2; n < 20; n++) { var tb = 1 + n / 6; if (tb > 4.5) break; var v = Math.min(1, (tb - 1.2) / .6) * .32;                  // the escapement starts
        if (!(rec && cut(A, "clock", tb, TICKS[n % 4], 2.3, v, .012))) A.noise(tb, .018, { type: "bandpass", f: n % 2 ? 3300 : 3900, q: 4, v: v * .5 }); }
      [[4, .3, 1250], [4.22, .225, 937]].forEach(function (s) {                                                                       // the repeater strikes as the hands lock
        if (!(rec && cut(A, "chimes", s[0], GONG, s[1], .55, .25))) A.bell(s[0], s[2], 1.6, .12, [[1, 1], [2.32, .35], [4.25, .12]]); });
    }
  });
})();
