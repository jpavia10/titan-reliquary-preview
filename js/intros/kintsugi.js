/* Kintsugi intro (Grok, theme #39, 2026-10-20). A black raku-glazed tile carries the name, pressed into the clay.
   Act 1 (0-1.0 s): soft window light slides over the glaze; the name reads only as a faint embossing.
   Act 2 (1.0-1.8 s): a single strike: fractures race out from the centre across the tile (Voronoi seams revealed by a
   travelling front), the pieces shift by a hair.
   Act 3 (1.8-3.4 s): liquid gold runs into the seams from the impact point outward, and then floods the letters of the name,
   which end as polished gold set into the mended black glaze. GPU fragment shader at full resolution; 2D path: gold name.
   Sound: a clay tap, the crack (bright noise burst with a falling resonance), a gold pour hiss, and a soft temple-bell glint. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "vec2 h22(vec2 p){ float a=h21(p); return vec2(a,h21(p+a*17.1)); }",
    "float fb(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }",
    "vec2 vor(vec2 x){ vec2 n=floor(x), f=fract(x), mg=vec2(0.), mr=vec2(0.); float md=8.;",
    "  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 r=g+h22(n+g)-f; float d=dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }",
    "  md=8.; for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g=mg+vec2(float(i),float(j)); vec2 r=g+h22(n+g)-f; if(dot(mr-r,mr-r)>1e-5) md=min(md, dot(.5*(mr+r), normalize(r-mr))); }",
    "  return vec2(md, h21(n+mg)); }",
    "float msk(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5,q.y/U1.z+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float strike=U0.x, pour=U0.y, flood=U0.z, glint=U0.w;",
    "  float r=length(p);",
    "  vec2 v=vor(p*2.8+.15*vec2(fb(p*3.),fb(p*3.+5.))); vec2 v2=vor(p*11.+3.);",
    "  float shift=step(.001,strike)*(v.y-.5)*.0025; vec2 ps=p+shift;",
    "  float m=msk(ps); float mx=msk(ps+vec2(.003,0.))-msk(ps-vec2(.003,0.)), my=msk(ps+vec2(0.,.003))-msk(ps-vec2(0.,.003));",
    "  float g1=fb(ps*3.+3.), g2=fb(ps*vec2(2.,9.));",
    "  vec3 N=normalize(vec3(-mx*2.+(g1-.5)*.2+p.x*.2,-my*2.+(g2-.5)*.12+p.y*.2,1.));",
    "  float lx=mix(-1.2,.8,smoothstep(0.,3.4,T)); vec3 L=normalize(vec3(lx,.6,.7)), H=normalize(L+vec3(0.,0.,1.));",
    "  vec3 col=vec3(.02,.019,.022)+vec3(.02,.015,.01)*g1; col*=.85+.15*smoothstep(0.,.03,vor(p*30.).x);",
    "  col+=vec3(.85,.88,.95)*(pow(max(dot(N,H),0.),70.)*.6+pow(max(dot(N,H),0.),8.)*.05);",
    "  float front=strike*1.6; float w=.012*(.7+.6*vn(p*8.)); float sel=smoothstep(.46,.54,fb(p*1.2+2.)); float seam=smoothstep(w,w*.35,v.x/2.8)*step(r,front)*sel+smoothstep(w*.5,w*.2,v2.x/11.)*step(r,front*.6)*smoothstep(.6,.66,fb(p*2.+7.));",
    "  float gold=seam*smoothstep(0.,1.,pour*2.2-r*1.6);",
    "  col=mix(col,vec3(.003),seam*(1.-gold));",
    "  float letter=smoothstep(.45,.6,m)*smoothstep(0.,1.,flood*2.5-abs(p.x)*1.2);",
    "  gold=max(gold, letter);",
    "  vec3 au=vec3(1.,.72,.3); float bead=1.-abs(fract(v.x*40.)-.5)*0.; vec3 Ng=normalize(vec3(N.xy*.6,1.));",
    "  vec3 gc=au*(.2+.55*pow(max(dot(Ng,H),0.),6.))+vec3(1.,.93,.75)*pow(max(dot(Ng,H),0.),40.)*3.+au*.25*fb(p*60.);",
    "  col=mix(col,gc,gold);",
    "  col+=vec3(1.,.9,.7)*glint*exp(-pow((p.x-mix(-1.,1.,glint))*6.,2.))*letter*1.5;",
    "  col+=vec3(1.,.8,.5)*exp(-r*18.)*exp(-max(T-1.,0.)*6.)*step(1.,T)*1.2;",            // the strike flash
    "  col=1.-exp(-col*1.25); col*=1.-.4*dot(p*.8,p*.8);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(2.5px)";
    var serif = "\"Cormorant Garamond\", \"Hoefler Text\", Georgia, serif";
    if (st) { g.font = "600 280px " + serif; g.fillText("TITAN", 512, 330); g.font = "600 150px " + serif; g.fillText("RELIQUARY", 512, 690); }
    else { g.font = "600 220px " + serif; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  I.reg("kintsugi", {
    dur: 4.6, still: 4.1,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, asp = W / H;
      var strike = K.eio(seg(t, 1.0, 1.8)), pour = seg(t, 1.8, 3.0), flood = seg(t, 2.4, 3.4), glint = seg(t, 3.5, 4.3);
      var hw = Math.min(asp * 0.5 * 0.84, 1.75), dz = hw * 2 / (C.texAsp || 5.12);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [strike, pour, flood, glint], [hw, 0, dz, 0])) return;
      g.fillStyle = "#070608"; g.fillRect(0, 0, W, H);
      var fs = Math.min(W * 0.1, 96); g.save(); g.globalAlpha = Math.max(0.15, flood); g.font = "600 " + fs + "px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
      var gr = g.createLinearGradient(0, H / 2 - fs, 0, H / 2 + fs); gr.addColorStop(0, "#ffe3a3"); gr.addColorStop(0.5, "#c8912f"); gr.addColorStop(1, "#7a5418"); g.fillStyle = gr;
      if (C.portrait) { g.fillText("TITAN", W / 2, H / 2 - fs / 2); g.fillText("RELIQUARY", W / 2, H / 2 + fs / 2); } else g.fillText("TITAN RELIQUARY", W / 2, H / 2);
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.15, 55, 1.2, { type: "sine", v: 0.06, a: 0.6 });                                                  // room
      A.noise(1.0, 0.03, { type: "bandpass", f: 2600, q: 2, v: 0.25 }); A.tone(1.0, 880, 0.25, { type: "triangle", v: 0.08, to: 520 });   // the strike
      for (var j = 0; j < 18; j++) A.noise(1.02 + j * 0.035 + Math.random() * 0.02, 0.012, { type: "highpass", f: 4000 + Math.random() * 3000, v: 0.04 + Math.random() * 0.04 });   // cracks running
      A.noise(1.8, 1.5, { type: "bandpass", f: 1800, to: 900, q: 0.6, shape: [[0.3, 0.05], [1.2, 0.03], [1.5, 0.0001]] });   // the gold pour
      A.bell(3.5, 523.25, 3.2, 0.07, [[1, 1], [2.76, 0.35], [5.4, 0.18], [8.93, 0.06]]);                          // a temple-bell glint
    }
  });
})();
