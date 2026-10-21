/* Rift Garage intro (Grok, theme #36, 2026-10-20). Original "portal garage lab": no borrowed names, characters or marks.
   Act 1 (0-1.2 s): a dark garage; a hanging bulb flickers; a green spark crackles in mid-air and tears open into a swirling rift
   (domain-warped spiral plasma, white-hot core, a crackling rim of arcs) that floods the corrugated wall with green light.
   Act 2 (1.1-2.4 s): TITAN RELIQUARY is flung out of the rift toward the camera, glowing, trailing plasma, overshooting and settling.
   Act 3 (2.4-3.4 s): the rift snaps shut behind it with a white flash and a shockwave; the name holds, lit green from below.
   One GPU fragment shader at full device resolution; 2D path: the name in green glow. Sound: sizzle, the tear, a whoosh, the snap. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fb(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }",
    "float msk(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5,q.y/U1.z+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float asp=R.x/R.y;",
    "  float open=U0.x, fling=U0.y, shut=U0.z, flash=U0.w;",
    "  float bul=.5+.5*step(.35,vn(vec2(T*14.,1.)))*step(T,1.)+step(1.,T)*.5;",       // the bulb flickers, then holds
    "  vec2 bp=vec2(-.3*asp,.42); float db=length(p-bp);",
    "  vec3 col=vec3(.03,.034,.038)*(.75+.35*(.5+.5*sin(p.x*90.)))*(.4+.6*bul);",
    "  col+=vec3(1.,.72,.4)*bul*(.05/(1.+db*db*30.)+exp(-db*90.)*1.5);",
    "  if(p.y<-.28) col=vec3(.025,.027,.026)*(.7+.5*fb(p*vec2(4.,30.)));",
    "  vec2 C=vec2(0.,.02); float Rr=.26*open*(1.-shut); vec2 q=p-C; q.x*=.8; float r=length(q), a=atan(q.y,q.x);",
    "  vec3 g=vec3(.2,1.,.4);",
    "  if(Rr>.001){ float rr=r/(Rr*(1.+fb(vec2(a*2.,T*.6))*.2)); float sw=a+2.*T+3.2/(rr+.25); vec2 w=vec2(cos(sw),sin(sw))*rr*3.;",
    "    float f=fb(w+fb(w*1.7+T*.5)*1.6); float ins=smoothstep(1.02,.94,rr);",
    "    col=mix(col,vec3(0.),ins*.6)+mix(g,vec3(.6,1.,.15),f)*(.6+1.6*f*f)*ins*1.6+vec3(.85,1.,.8)*exp(-rr*rr*9.)*3.*ins+g*exp(-pow((rr-1.)*16.,2.))*3.;",
    "    for(int i=0;i<7;i++){ float fi=float(i); float aa=fi*2.399+floor(T*8.+fi)*1.7; float d=abs(sin(a-aa+(fb(vec2(r*14.,T*9.+fi*3.))-.5)*.9))*r; col+=vec3(.6,1.,.7)*exp(-d*R.y*.45)*step(rr,1.03+.22*h21(vec2(fi,floor(T*8.))))*step(1.,rr)*(1.-(rr-1.)*4.)*step(.4,h21(vec2(fi,floor(T*11.))))*1.6; } }",
    "  float spark=exp(-r*R.y*.05)*smoothstep(0.,.2,T)*(1.-open)*(.6+.4*vn(vec2(T*40.,2.))); col+=g*spark*3.;",
    "  col+=g*(.15*open*(1.-shut))/(1.+r*r*10.)*4.;",                                // the rift floods the wall
    "  float s=mix(.05,1.,fling); vec2 nq=(p-C*(1.-fling))/s; float m=msk(nq)*step(.001,fling);",
    "  float edge=exp(-pow((m-.5)*6.,2.)); float fill=smoothstep(.45,.6,m);",
    "  vec3 chrome=mix(vec3(.08,.14,.1),vec3(.92,1.,.94),smoothstep(-.6,.6,nq.y/U1.z*2.))*(.5+.5*fb(nq*vec2(3.,30.)));",
    "  col=mix(col,chrome*(.7+.7*shut)+g*.25,fill*fling)+g*edge*(1.8+(1.-fling)*3.)*fling+g*.05*shut*exp(-abs(p.y)*6.);",
    "  col+=vec3(.8,1.,.85)*flash*1.5+g*exp(-pow((r-shut*1.6)*12.,2.))*shut*(1.-shut)*4.;",
    "  col=1.-exp(-col*1.2); col*=1.-.4*dot(p*.8,p*.8);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(2px)";
    if (st) { g.font = "900 300px " + K.GEO; g.fillText("TITAN", 512, 330); g.font = "900 168px " + K.GEO; g.fillText("RELIQUARY", 512, 690); }
    else { g.font = "900 220px " + K.GEO; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  I.reg("rift", {
    dur: 4.4, still: 3.9,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var open = K.eio(seg(t, 0.5, 1.2)), fl = seg(t, 1.1, 2.4), fling = fl <= 0 ? 0 : 1 + Math.sin(fl * Math.PI * 1.5) * Math.exp(-fl * 3) * 0.25 - Math.pow(1 - fl, 3);
      var shut = K.eio(seg(t, 2.4, 2.9)), flash = Math.exp(-Math.pow((t - 2.85) * 8, 2));
      var hw = Math.min(W / H * 0.5 * 0.86, 1.8), dz = hw * 2 / (C.texAsp || 5.12);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [open, fling, shut, flash], [hw, 0, dz, 0])) return;
      g.fillStyle = "#050706"; g.fillRect(0, 0, W, H);
      var fs = Math.min(W * 0.1, 96); g.save(); g.globalAlpha = Math.min(1, fl * 2); g.font = "900 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#c9ffd4"; g.shadowColor = "#3dff6a"; g.shadowBlur = 24;
      if (C.portrait) { g.fillText("TITAN", W / 2, H / 2 - fs / 2); g.fillText("RELIQUARY", W / 2, H / 2 + fs / 2); } else g.fillText("TITAN RELIQUARY", W / 2, H / 2);
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      for (var j = 0; j < 14; j++) A.noise(0.15 + j * 0.03 + Math.random() * 0.02, 0.02, { type: "bandpass", f: 3000 + Math.random() * 3000, q: 4, v: 0.05 });   // the spark sizzles
      A.noise(0.5, 0.8, { type: "bandpass", f: 300, to: 2400, q: 0.7, shape: [[0.1, 0.12], [0.6, 0.06], [0.8, 0.0001]] });   // the tear
      A.tone(0.5, 60, 2.2, { type: "sawtooth", v: 0.07, lp: 500, a: 0.4, to: 90 }); A.tone(0.55, 120.5, 2, { type: "sine", v: 0.05, a: 0.5 });
      A.noise(1.1, 0.9, { type: "bandpass", f: 2400, to: 500, q: 0.9, shape: [[0.15, 0.1], [0.9, 0.0001]] });               // whoosh as the name flies out
      A.tone(2.82, 45, 1.2, { v: 0.32, to: 32 }); A.noise(2.82, 0.4, { type: "highpass", f: 3500, shape: [[0.02, 0.1], [0.4, 0.0001]] });   // snap shut
      A.bell(2.95, 1567.98, 1.6, 0.04, [[1, 1], [2.76, 0.3], [5.4, 0.1]]);
    }
  });
})();
