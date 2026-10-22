/* Silver Screen intro (Claude, theme #43, 2026-10-22; Grok's plan in notes/agents/themes-37-50.md: "curtain parts, beam ignites,
   iris title card").
   Act 1 (0-0.6 s): the house lights go down; the footlights stay up on the closed velvet curtain.
   Act 2 (0.5-1.8 s): the curtain parts and gathers at the sides of the stage; the screen is dark.
   Act 3 (1.25-2.1 s): the projector starts: the leader flickers on the screen and the beam rises out of the picture over the stalls.
   Act 4 (2.1-4.8 s): an iris opens on the title card (the collection presents TITAN RELIQUARY), flickering at 18 frames a second.
   It ends on the theme's own picture palace (fx/silverscreen.js: the same screen, drapes, beam and stalls), so the reel goes on from it.
   GPU fragment shader at full resolution; 2D path: the curtain and the card. Sound: real recordings when they are in memory (the opening
   phrase of Bach's Toccata BWV 565 on the organ, audio/cuts/organ; the projector's rattle from the clock recording, winding up to
   18 frames a second; its motor from the laboratory recording), otherwise filtered clicks and a hum. No organ without the recording. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }",
    "float h1(float n){ return fract(sin(n*127.1)*43758.5453); }",
    // the picture on the screen: the leader's flicker, then the iris opening on the title card; weave, flicker, grain, a scratch
    "vec3 film(vec2 uv, float t, bool fine){ float f=floor(t*18.); uv+=(vec2(h1(f),h1(f+7.))-.5)*vec2(.004,.006);",
    "  float on=smoothstep(1.25,1.32,t); vec3 lead=vec3(.55+.25*h1(f*1.9))*on*(1.-.5*pow(length(uv-.5)*1.4,2.));",
    "  vec3 card=texture2D(TX,clamp(uv,0.,1.)).rgb*vec3(1.,.86,.62); float ir=smoothstep(0.,.012,smoothstep(2.1,2.75,t)*.9-length((uv-.5)*vec2(1.333,1.)));",
    "  vec3 c=mix(lead,card,step(2.1,t)*ir); c=mix(c,lead*.3,step(2.1,t)*(1.-ir));",
    "  c*=.88+.12*h1(f*1.37); if(fine) c+=(h21(floor(gl_FragCoord.xy/1.5)+f*3.1)-.5)*.12*on;",
    "  float sx=h1(floor(f/5.)); c=mix(c,c*.4+.2,step(.6,h1(floor(f/5.)*7.))*smoothstep(.0016,0.,abs(uv.x-sx))*on);",
    "  c*=1.-.45*pow(length((uv-.5)*vec2(1.1,1.2)),2.2); return max(c,0.)*.62; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float A=R.x/R.y, PX=1./R.y, t=T; vec2 hs=U0.xy, sc=vec2(0.,U0.w); vec2 sq=p-sc, suv=sq/(hs*2.)+.5;",
    "  float house=1.-smoothstep(0.,.6,t), D=U1.x; vec2 inr=hs+vec2(D,.07);",
    "  vec3 avg=(film(vec2(.3,.4),t,false)+film(vec2(.7,.6),t,false)+film(vec2(.5,.5),t,false))/3.; float L=(dot(avg,vec3(.33))+.04)*smoothstep(1.2,1.4,t);",
    "  vec3 col=vec3(.012,.008,.008)+vec3(.05,.045,.05)*L*exp(-length(sq*vec2(.8,1.))*2.6)+vec3(.09,.06,.04)*house*exp(-length(sq)*1.2);",
    // the proscenium and the side walls' sconces (dimming with the house lights)
    "  float frame=max(sdBox(sq,inr+vec2(.035,.03)),-sdBox(sq,inr)); float LL=L+.05+.25*house;",
    "  if(frame<0.){ float fl=.5+.5*sin(sq.x*140.); vec3 gold=vec3(.42,.3,.12)*(.55+.45*fl)*(.25+3.*LL*exp(-abs(sq.x)*1.2))+vec3(.9,.7,.35)*pow(fl,8.)*LL*.6; col=mix(col,gold*.6,clamp(-frame/PX,0.,1.)); }",
    "  float wx=.5*(.5*A+inr.x+.035); if(.5*A-inr.x-.035>.12){ vec2 q=vec2(abs(p.x)-wx,p.y-.1); float shell=step(length(q*vec2(1.,1.4)),.032)*step(-.004,q.y);",
    "    col+=vec3(1.,.72,.42)*(.2*exp(-length(q*vec2(1.,.45))*9.)+.022*exp(-length(q)*3.))*(.35+.65*house)*(1.+1.5*house)+vec3(1.,.78,.5)*shell*.6*(.4+.6*house); }",
    // the screen (black masking + the picture), then the curtain over it, parting
    "  float sd=sdBox(sq,hs); float inner=sdBox(sq,inr);",
    "  if(inner<0.){ vec3 st=vec3(.006); if(sd<PX){ st=mix(st,film(clamp(suv,0.,1.),t,true)*1.05+.012,smoothstep(PX,-PX,sd)); }",
    "    float op=smoothstep(.5,1.8,t); op=op*op*(3.-2.*op); float cw=mix(inr.x,D,op);",              // each half's width: half the stage, then the drape
    "    float ax=abs(sq.x), e=inr.x-cw; float inC=smoothstep(e-.002,e+.002,ax);",
    "    float u=(ax-e)/max(cw,.001); float fold=.5+.5*sin(u*mix(26.,7.,op)*3.1416+sin(sq.y*6.)*1.2); fold=pow(fold,1.6);",
    "    float foot=exp(-(sq.y+inr.y)*2.6); vec3 vel=vec3(.34,.02,.04)*(.18+.82*fold)*(.12+1.4*foot*(.35+.65*(1.-op*.5))+2.4*L)+vec3(.5,.12,.08)*smoothstep(-hs.y,-hs.y-.08,sq.y)*.3;",
    "    vec3 c2=mix(st,vel,inC); float val=sq.y-hs.y-.005-.035*(1.-pow(abs(sin(sq.x/(hs.x*2.)*3.1416*3.)),.7)); float dv=smoothstep(-.002,.002,val);",
    "    float vf=.5+.5*sin(sq.y*160.+sin(sq.x*20.)*2.); vec3 swag=vec3(.32,.02,.04)*(.2+.8*vf)*(.3+2.*L+.4*foot)+vec3(.7,.5,.2)*smoothstep(.004,0.,abs(val))*(L+.1);",
    "    col=mix(c2,swag,dv); }",
    // footlights and the stalls
    "  float fy=sq.y+hs.y+.1; col+=vec3(1.,.62,.3)*.16*exp(-fy*fy*900.)*step(abs(sq.x),inr.x-.03)*(.6+.4*sin(sq.x*60.));",
    "  float dz=sc.y-hs.y-.1-p.y; float rows=U1.y/U1.z-U1.y/max(dz,.001); if(dz>U1.z){ float ri=floor(rows), rf=fract(rows); float sw=.05+.35*dz; float sx=fract(p.x/sw+ri*.37)-.5;",
    "    float e2=.3+.32*pow(abs(sx)*2.,2.6); float seat=step(e2,rf)*step(abs(sx),.47); float rim=smoothstep(.09,0.,rf-e2)*seat;",
    "    vec3 s2=mix(vec3(.004,.002,.002),vec3(.02,.006,.006)+vec3(.8,.1,.1)*rim*(.03+1.5*L+.3*house)*exp(-ri*.25),seat); col=mix(col,s2,smoothstep(0.,.004,dz-U1.z)); }",
    // the beam: from the booth behind you, rising out of the picture (the same geometry as the theme)
    "  vec2 S=U1.w>0.?vec2(-.14,-.6):vec2(-.34,-1.05); vec2 d=p-S; float r=length(d); vec2 dn=d/max(r,1e-4); vec2 iv=1./(abs(dn)+1e-5)*sign(dn+1e-7);",
    "  vec2 t0=(sc-hs-S)*iv, t1=(sc+hs-S)*iv, tn=min(t0,t1), tf=max(t0,t1); float tin=max(tn.x,tn.y), tou=min(tf.x,tf.y);",
    "  float inb=smoothstep(0.,.03,tou-tin)*smoothstep(tou-.004,tou+.03,r)*step(0.,tin)*smoothstep(0.,.02,sd)*smoothstep(1.25,1.5,t);",
    "  if(inb>0.){ vec2 ea=(S+dn*tin-sc)/(hs*2.)+.5, eb=(S+dn*tou-sc)/(hs*2.)+.5; vec3 ray=(film(clamp(ea,0.,1.),t,false)+film(clamp(mix(ea,eb,.5),0.,1.),t,false)+film(clamp(eb,0.,1.),t,false))/3.+.035*smoothstep(1.25,1.4,t);",
    "    vec2 hz=p*vec2(2.2,3.)+vec2(t*.03,-t*.015); float haze=vn(hz*2.)*.5+vn(hz*4.3)*.3+vn(hz*9.1)*.2;",
    "    col+=ray*(.08+2.6*haze*haze*haze)*.3*(1.-.45*U1.w)*(.25+.75*exp(-(r-tou)*2.2))*(.35+.65*smoothstep(0.,.14,r-tou))*inb; }",
    "  col*=1.-.4*smoothstep(.4,1.05,length(p*vec2(1./A*1.15,1.)));",
    "  col=col*1.05; col+=vec3(.012)*(h21(gl_FragCoord.xy+floor(t*18.))-.5);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function deco(g, W, H) { g.strokeStyle = "#e8e2d0"; g.lineWidth = 4; g.strokeRect(40, 40, W - 80, H - 80); g.lineWidth = 2; g.strokeRect(58, 58, W - 116, H - 116);
    [[58, 58, 1, 1], [W - 58, 58, -1, 1], [58, H - 58, 1, -1], [W - 58, H - 58, -1, -1]].forEach(function (c) { g.beginPath();
      for (var i = 0; i < 4; i++) { g.moveTo(c[0], c[1]); g.lineTo(c[0] + c[2] * (52 - i * 11), c[1] + c[3] * (15 + i * 12)); } g.stroke(); }); }
  function cardTex() {   // the title card, 4:3 like the screen
    var W = 1024, H = 768, c = K.mk(W, H), g = c.getContext("2d"); g.fillStyle = "#050505"; g.fillRect(0, 0, W, H); deco(g, W, H);
    var serif = "\"Cormorant Garamond\", \"Iowan Old Style\", \"Hoefler Text\", Georgia, serif"; g.fillStyle = "#efe9d8"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "italic 500 48px " + serif; g.fillText("the collection presents", W / 2, 236); g.font = "600 128px " + serif; g.fillText("TITAN", W / 2, 360);
    g.font = "600 76px " + serif; g.fillText("RELIQUARY", W / 2, 464); g.font = "italic 42px " + serif; g.fillText("a picture in many reels", W / 2, 572); return c;
  }
  /* recordings for the sound when they are already in memory (decoded once per session) */
  var BUF = {}, LOADING = {}, TICKS = [[.664, .13], [1.67, .13], [2.664, .13], [3.67, .13]];
  function warm(ctx, name, dir) { if (BUF[name] || LOADING[name] || !window.fetch) return; LOADING[name] = 1;
    var ext = (function () { try { return new Audio().canPlayType('audio/webm; codecs="opus"') ? ".webm" : ".m4a"; } catch (e) { return ".m4a"; } })();
    fetch("audio/" + (dir || "ambience") + "/" + name + ext).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) { if (!ab) return;
      return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); }).then(function (b) { if (b) BUF[name] = b; }).catch(function () { LOADING[name] = 0; }); }
  function cut(A, name, s, seg, rate, v, rel, lp) { var b = BUF[name]; if (!b) return false; var x = A.ctx, src = x.createBufferSource(), g = x.createGain(), t = A.t0 + s, end = t + seg[1] / rate;
    src.buffer = b; src.playbackRate.value = rate; g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, Math.max(t, end - rel)); g.gain.linearRampToValueAtTime(0, end);
    var last = g; if (lp) { var f = x.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; g.connect(f); last = f; }
    src.connect(g); last.connect(A.out); src.start(t, seg[0], seg[1]); A.nodes.push(src); return true; }
  function lay(W, H) { var A = W / H, port = A < 1, w = port ? A * .74 : Math.min(.86, A * .48);   // the theme's own layout (fx/silverscreen.js)
    return port ? { hs: [w / 2, w * .375], cy: .17, u1: [.045, .35, .06, 1] } : { hs: [w / 2, w * .375], cy: .03, u1: [.13, .08, .02, 0] }; }
  I.reg("silverscreen", {
    dur: 4.8, still: 4.6,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(cardTex()); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, Ly = lay(W, H);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [Ly.hs[0], Ly.hs[1], 0, Ly.cy], Ly.u1)) return;
      g.fillStyle = "#070404"; g.fillRect(0, 0, W, H);
      var sw = Ly.hs[0] * 2 * H, sh = Ly.hs[1] * 2 * H, sx = (W - sw) / 2, sy = H / 2 - Ly.cy * H - sh / 2, lit = Math.max(0, Math.min(1, (t - 1.3) / .4));
      g.fillStyle = "rgb(" + Math.round(10 + 150 * lit) + "," + Math.round(9 + 136 * lit) + "," + Math.round(8 + 112 * lit) + ")"; g.fillRect(sx, sy, sw, sh);
      if (t > 2.1) { var fs = Math.min(sw * .16, 90), a = Math.min(1, (t - 2.1) / .6); g.save(); g.globalAlpha = a; g.fillStyle = "#050505"; g.fillRect(sx, sy, sw, sh);
        g.fillStyle = "#efe2c4"; g.font = "600 " + fs + "px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TITAN", W / 2, sy + sh * .42); g.font = "600 " + fs * .6 + "px Georgia, serif"; g.fillText("RELIQUARY", W / 2, sy + sh * .62); g.restore(); }
      var op = K.seg(t, .5, 1.8), half = sw / 2 + 20, cw = half * (1 - op) + 14 * op; g.fillStyle = "#5a0710"; g.fillRect(sx - 20, sy - 20, cw, sh + 40); g.fillRect(sx + sw + 20 - cw, sy - 20, cw, sh + 40);
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return; warm(A.ctx, "organ", "cuts"); ["clock", "labHum"].forEach(function (n) { warm(A.ctx, n); });
      var rec = !!(BUF.clock && BUF.labHum);
      if (BUF.organ) cut(A, "organ", .3, [0, 5.3], 1, .7, .9);                                                                       // the organ (a recording or nothing)
      A.noise(.5, 1.35, { type: "bandpass", f: 900, q: .6, v: .05, shape: [[.3, .05], [1.1, .035], [1.35, .0001]] });             // the curtain's runners and the velvet
      for (var s = 1.25, n = 0; s < 4.8; n++) { var fps = Math.min(18, 6 + (s - 1.25) * 24);                                         // the projector winds up to 18 frames a second
        if (!(rec && cut(A, "clock", s, TICKS[n % 4], 2.7 + (n % 3) * .08, .22, .01, 2600))) A.noise(s, .012, { type: "bandpass", f: 2400, q: 2.5, v: .05 });
        s += 1 / fps; }
      if (!(rec && cut(A, "labHum", 1.2, [2, 3.6], 1, .3, .5, 520))) A.tone(1.2, 62, 3.6, { type: "sine", v: .02, a: .3 });             // its motor
    }
  });
})();
