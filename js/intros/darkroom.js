/* Darkroom intro (Claude, theme #42, 2026-10-22; Grok's plan in notes/agents/themes-37-50.md: "enlarger exposes, paper slides in, name
   develops from white").
   Act 1 (0-0.5 s): the red safelight comes up on the bench.
   Act 2 (0.5-1.4 s): the enlarger clicks on: its white beam projects the negative onto the sheet on the easel, the name in light.
   Act 3 (1.45-2.2 s): the sheet slides into the developer tray, a ripple runs from its edge, the liquid settles and rocks.
   Act 4 (2.2-4.6 s): the name comes up out of the white paper, the darkest strokes first, through the moving caustics; the timer
   ticks and its bell rings as the print is done.
   GPU fragment shader at full resolution; 2D path: the tray and the developed name. Sound: real recordings when they are in memory
   (the clock recording's tick for the timer, strikes from the chimes recording for its bell, a river cut for the slosh, the same
   cuts the theme's soundscape uses), otherwise filtered clicks, a swish and a two-note bell; they load in the background. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float PX;",
    "float msk(vec2 s){ vec2 uv=vec2(s.x/U0.x*.5+.5,(s.y-U0.w)/U0.y+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "float sdRR(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }",
    // the developer's surface: four crossing wavelets + the sheet's ripple; gradient and Laplacian are analytic
    "vec4 surf(vec2 q, float t, float rip, vec2 rc){ vec2 K1=vec2(31.,13.), K2=vec2(-17.,29.), K3=vec2(23.,-27.), K4=vec2(-9.,-35.); float A=.00012*(1.+rip*2.);",
    "  float a1=dot(q,K1)+t*1.7, a2=dot(q,K2)-t*1.3, a3=dot(q,K3)+t*1.1+1.7, a4=dot(q,K4)-t*1.9+.4;",
    "  vec2 g=A*(K1*cos(a1)+K2*cos(a2)+K3*cos(a3)+K4*cos(a4)); float lap=-A*(dot(K1,K1)*sin(a1)+dot(K2,K2)*sin(a2)+dot(K3,K3)*sin(a3)+dot(K4,K4)*sin(a4));",
    "  float r=length(q-rc), age=max(t-2.05,0.), f=age*.5; float w=rip*exp(-age*1.4)*.004/(1.+r*4.); float ph=(r-f)*70., env=exp(-pow((r-f)*7.,2.));",
    "  g+=w*env*cos(ph)*70.*normalize(q-rc+1e-5); lap-=w*env*sin(ph)*4900.;",
    "  return vec4(g,lap,0.); }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float A=R.x/R.y; PX=1./R.y; float t=T; vec3 SAFE=vec3(1.,.13,.05);",
    "  float safe=smoothstep(0.,.55,t); vec2 sl=vec2(-A*.38,.42); float lamp=1.25/(1.+dot(p-sl,p-sl)*1.4)*safe;",
    "  vec2 hs=vec2(U0.x*1.18,max(U0.y*.62,.16));",                                                     // the sheet, a little larger than the name
    "  vec3 col=vec3(.03,.008,.006)*lamp*(.7+.5*vn(p*7.));",
    // the easel set: exposure under the enlarger
    "  float ea=1.-smoothstep(1.42,1.6,t);",
    "  if(ea>0.){ float en=smoothstep(.5,.54,t)*(1.-smoothstep(1.34,1.42,t))*(1.+.04*sin(t*90.)); vec3 e=vec3(.04,.012,.01)*lamp;",
    "    float de=sdRR(p,hs+vec2(.05),.01); e=mix(e,vec3(.06,.016,.012)*lamp,step(de,0.));",                // the easel's blades
    "    float ds=sdRR(p,hs,.004); float m=msk(p); vec3 paper=vec3(.85)*SAFE*lamp*.55;",
    "    vec3 beam=vec3(1.,.97,.9)*(.1+1.6*smoothstep(.2,.7,m))*en;",                                       // the negative: the name in light
    "    paper+=beam; e=mix(e,paper,clamp(.5-ds/PX,0.,1.)); e+=vec3(1.,.95,.85)*en*.05*exp(-dot(p,p)*2.);",
    "    col=mix(col,e,ea); }",
    // the tray set: the sheet slides in, then develops
    "  float ta=smoothstep(1.4,1.6,t);",
    "  if(ta>0.){ vec2 th=vec2(max(hs.x+.12,.3),hs.y+.14); float dO=sdRR(p,th,.06), dI=sdRR(p,th-.028,.045);",
    "    vec3 tr=col; if(dO<PX){ float rt=clamp(dI/.028,0.,1.); vec3 rim=vec3(.07,.02,.015)*lamp*(.5+.5*(1.-abs(rt*2.-1.)))+SAFE*.25*pow(1.-abs(rt*2.-1.),10.)*lamp; tr=mix(tr,rim,clamp(.5-dO/PX,0.,1.)); }",
    "    if(dI<PX){ float sli=smoothstep(1.5,2.1,t); sli=1.-pow(1.-sli,3.); vec2 off=vec2(0.,-(1.-sli)*(th.y*2.+.1));",
    "      vec4 S=surf(p,t,step(2.05,t),vec2(0.,-hs.y)); vec2 b=p-S.xy*.03; float cau=clamp(1.-S.z*.03,.4,2.2);",
    "      vec3 bot=vec3(.08,.02,.015)*(.8+.2*smoothstep(0.,.004,abs(fract(b.y/.04)-.5)*.04-.003));",
    "      vec2 sq=b-off; float ds=sdRR(sq,hs,.004);",
    "      if(ds<PX){ float m=msk(sq); float D=smoothstep(2.2,4.2,t)+(vn(sq*6.+t*.2)-.5)*.08; float den=smoothstep(.25,.75,m);",
    "        float shown=den*smoothstep(.04+.3*(1.-den),.9,D); vec3 paper=vec3(.9*(1.-shown*.96));",
    "        bot=mix(bot,paper,clamp(.5-ds/PX,0.,1.)); }",
    "      vec3 liq=bot*SAFE*lamp*cau*.85; vec3 n=normalize(vec3(-S.xy*1.5,1.)); vec3 V=normalize(vec3(0.,-.2,2.4)-vec3(p,0.)); vec3 Ld=normalize(vec3(sl,1.)-vec3(p,0.));",
    "      float rl=max(dot(reflect(-V,n),Ld),0.); liq+=SAFE*(pow(rl,1400.)*4.+pow(rl,120.)*.15)*safe;",
    "      tr=mix(tr,liq,clamp(.5-dI/PX,0.,1.)); }",
    "    col=mix(col,tr,ta); }",
    // the timer's bell: a faint green glint of its luminous dial at the edge of the frame
    "  float bell=smoothstep(4.15,4.2,t)*exp(-max(t-4.2,0.)*3.); col+=vec3(.25,1.,.42)*bell*.06*exp(-dot(p-vec2(A*.42,-.38),p-vec2(A*.42,-.38))*30.);",
    "  col*=1.-.5*smoothstep(.4,1.1,length(p*vec2(1./A*1.15,1.)));",
    "  col=1.-exp(-col*1.3);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(1.5px)";
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", \"Hoefler Text\", Georgia, serif";
    if (st) { g.font = "600 250px " + serif; g.fillText("TITAN", 512, 330); g.font = "600 128px " + serif; g.fillText("RELIQUARY", 512, 680); }
    else { g.font = "600 190px " + serif; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  /* recordings for the sound when they are already in memory (decoded once per session) */
  var BUF = {}, LOADING = {}, TICKS = [[.664, .13], [1.67, .13]], GONG = [13.735, .6];
  function warm(ctx, name) { if (BUF[name] || LOADING[name] || !window.fetch) return; LOADING[name] = 1;
    var ext = (function () { try { return new Audio().canPlayType('audio/webm; codecs="opus"') ? ".webm" : ".m4a"; } catch (e) { return ".m4a"; } })();
    fetch("audio/ambience/" + name + ext).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) { if (!ab) return;
      return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); }).then(function (b) { if (b) BUF[name] = b; }).catch(function () { LOADING[name] = 0; }); }
  function cut(A, name, s, seg, rate, v, rel, lp) { var b = BUF[name]; if (!b) return false; var x = A.ctx, src = x.createBufferSource(), g = x.createGain(), t = A.t0 + s, end = t + seg[1] / rate;
    src.buffer = b; src.playbackRate.value = rate; g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, Math.max(t, end - rel)); g.gain.linearRampToValueAtTime(0, end);
    var last = g; if (lp) { var f = x.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; g.connect(f); last = f; }
    src.connect(g); last.connect(A.out); src.start(t, seg[0], seg[1]); A.nodes.push(src); return true; }
  I.reg("darkroom", {
    dur: 4.6, still: 4.4,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, asp = W / H, port = asp < 1 ? 1 : 0;
      var hw = Math.min(asp * .5 * .66, 1.2), dz = hw * 2 / (C.texAsp || 5.12);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [hw, dz, port, 0], [0, 0, 0, 0])) return;
      g.fillStyle = "#0a0302"; g.fillRect(0, 0, W, H);
      var tw = W * .8, th = H * .5; g.fillStyle = "#1d0604"; g.fillRect((W - tw) / 2, (H - th) / 2, tw, th);
      var pw = tw * .8, ph = th * .76; g.fillStyle = "rgb(" + Math.round(200 * Math.min(1, t / .6)) + ",34,18)"; g.fillRect((W - pw) / 2, (H - ph) / 2, pw, ph);
      var d = K.seg(t, 2.2, 4.2), fs = Math.min(W * .085, 84); g.save(); g.globalAlpha = Math.max(0, d); g.fillStyle = "#120302"; g.font = "600 " + fs + "px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
      if (C.portrait) { g.fillText("TITAN", W / 2, H / 2 - fs * .55); g.fillText("RELIQUARY", W / 2, H / 2 + fs * .55); } else g.fillText("TITAN RELIQUARY", W / 2, H / 2);
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return; ["clock", "chimes", "river"].forEach(function (n) { warm(A.ctx, n); });
      var rec = !!(BUF.clock && BUF.chimes && BUF.river);
      A.noise(.5, .02, { type: "highpass", f: 2500, v: .25 }); A.noise(1.4, .02, { type: "highpass", f: 2200, v: .2 });               // the enlarger's switch, on and off
      A.tone(.52, 100, .86, { type: "sine", v: .025, a: .02 }); A.noise(.52, .86, { type: "lowpass", f: 400, v: .03 });              // its lamp hum
      A.noise(1.5, .55, { type: "bandpass", f: 2600, q: .7, v: .05, shape: [[.1, .05], [.45, .03], [.55, .0001]] });                 // the sheet sliding
      if (!(rec && cut(A, "river", 2.02, [12.3, .8], 1, .55, .45, 1400))) A.noise(2.02, .7, { type: "lowpass", f: 900, v: .12, shape: [[.08, .12], [.7, .0001]] });   // into the developer
      for (var s = 2.4; s < 4.2; s += 1) if (!(rec && cut(A, "clock", s, TICKS[Math.round(s) % 2], 1, .3, .02))) A.noise(s, .02, { type: "bandpass", f: 3200, q: 3, v: .12 });   // the timer
      [0, .17, .34].forEach(function (o) { if (!(rec && cut(A, "chimes", 4.2 + o, GONG, .78, .45, .15))) A.bell(4.2 + o, 3300, .5, .05, [[1, 1], [2.4, .3]]); });   // its bell
    }
  });
})();
