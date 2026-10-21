/* Ferrofluid intro (Grok, theme #37, 2026-10-20). One black drop falls into a mirror pool and rings it out; then a hidden magnet,
   shaped like the name, sweeps beneath the surface from left to right and the fluid stands up into a field of Rosensweig spikes
   that spell TITAN RELIQUARY, glinting under a studio softbox, before the spikes sharpen once more and hold. The magnet's field is
   the name itself, rendered to a blurred texture and sampled as the field strength in a raymarched heightfield (WebGL2 assumed;
   2D path: the name in glossy black with rim light). Sound: drop plip, sub ring, magnetic swell and a crackle as spikes rise. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fld(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5, (q.y-U1.y)/U1.z); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; float f=texture2D(TX,uv).r; return f*smoothstep(uv.x-.08,uv.x,U0.y*1.15-.05); }",
    "float hx(vec2 q){ vec2 s=vec2(1.,1.7320508); vec2 a=mod(q,s)-.5*s,b=mod(q-.5*s,s)-.5*s; return min(dot(a,a),dot(b,b)); }",
    "float hgt(vec2 q){ float f=fld(q); float sc=U0.w; float d=sqrt(hx(q*sc))/sc; float sp=max(0.,1.-d*sc*2.); sp=sp*sp*(3.-2.*sp);",
    "  float h=sp*(.5*U1.z*f)*(.85+.15*sin(T*9.+q.x*3.)*U0.z)+.025*f;",
    "  float rr=length(q-vec2(0.,U1.y+U1.z*.5))*(.25/U1.z); float rp=U0.x; h+=.03*sin(rr*28.-rp*22.)*exp(-rr*2.)*exp(-rp*1.6)*step(.001,rp);",
    "  return h; }",
    "vec3 env(vec3 r){ vec3 c=vec3(.005,.006,.01)+vec3(.02,.03,.05)*max(r.y,0.);",
    "  c+=vec3(1.,.97,.92)*smoothstep(.97,.995,dot(r,normalize(vec3(-.75,.45,.45))))*9.;",
    "c+=vec3(.55,.6,.7)*smoothstep(.98,.6,r.y)*smoothstep(-.1,.5,r.y)*.35+vec3(.2,.9,1.)*smoothstep(.6,1.,-r.z)*.0;",
    "  c+=vec3(.9,.95,1.)*exp(-(r.x-.62)*(r.x-.62)*60.)*smoothstep(.2,.7,r.y)*2.2;",
    "  c+=vec3(.15,.8,1.)*exp(-r.y*r.y*160.)*.6; return c; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y;",
    "  vec3 ro=vec3(0.,3.,U1.y+U1.z*.5-.5), rd=normalize(vec3(p.x,-3.,p.y+.5)); ",
    "  vec3 col=vec3(.004,.005,.008)+vec3(.02,.04,.06)*smoothstep(-.6,.4,p.y)*.4;",
    "  float dy=U1.w; if(dy>-1.){ float dd=length(p-vec2(0.,dy)); col+=vec3(1.)*smoothstep(.022,.015,dd)*.0; col=mix(col,vec3(.0),smoothstep(.022,.016,dd)); col+=vec3(.9,.95,1.)*smoothstep(.006,.0,abs(dd-.016))*.9; }",
    "  if(rd.y<-.01){ float t=(ro.y-U1.z*.5)/-rd.y, lt=t, tm=ro.y/-rd.y; bool hit=false; float dt=(tm-t)/96.;",
    "    for(int i=0;i<96;i++){ vec3 x=ro+rd*t; if(x.y-hgt(x.xz)<0.){hit=true;break;} lt=t; t+=dt; }",
    "    if(!hit) t=tm;",
    "    for(int i=0;i<7;i++){ float m=.5*(t+lt); vec3 x=ro+rd*m; if(x.y-hgt(x.xz)<0.) t=m; else lt=m; }",
    "    vec3 x=ro+rd*t; vec2 e=vec2(.0025,0.);",
    "    vec3 n=normalize(vec3(hgt(x.xz-e.xy)-hgt(x.xz+e.xy),2.*e.x,hgt(x.xz-e.yx)-hgt(x.xz+e.yx)));",
    "    vec3 r=reflect(rd,n); float fr=.04+.96*pow(1.-max(dot(n,-rd),0.),5.);",
    "    col=env(r)*(.45+fr)+vec3(.15,.8,1.)*pow(1.-max(dot(n,vec3(0.,1.,0.)),0.),2.)*.28;",
    "    vec3 L1=normalize(vec3(cos(T*.7),.32,sin(T*.7))), L2=normalize(vec3(-.6,.5,-.4)); float rim=1.-n.y;",
    "    col+=vec3(1.,.96,.9)*pow(max(dot(r,L1),0.),48.)*5.*rim+vec3(.5,.9,1.)*pow(max(dot(r,L2),0.),24.)*2.*rim*exp(-max(t-1.4,0.)*.5); }",
    "  col=col/(1.+col*.6); col=pow(col,vec3(.92));",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {                            // the magnet: the name, blurred into a smooth field (stacked on a portrait screen)
    var st = C.W / C.H < 1.2, c = st ? K.mk(768, 768) : K.mk(1536, 300), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(4px)";
    if (st) { g.font = "900 230px " + K.GEO; g.fillText("TITAN", 384, 250); g.font = "900 128px " + K.GEO; g.fillText("RELIQUARY", 384, 520); }
    else { g.font = "900 170px " + K.GEO; g.fillText("TITAN RELIQUARY", 768, 158); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  I.reg("ferro", {
    dur: 4.4, still: 3.9,
    init: function (C) { C.L = I.gl(C, FRAG); if (C.L) { C.ntex = nameTex(C); C.L.tex(C.ntex); } },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var fall = seg(t, 0, 0.62), dy = fall < 1 ? K.lerp(0.62, 0.08, fall * fall) : -2;
      var ring = t > 0.62 ? t - 0.62 : 0, sweep = K.eio(seg(t, 1.0, 2.7)), crackle = seg(t, 1.2, 3.0) > 0 && t < 3.0 ? 1 : 0.15;
      var hw = Math.min(W / H * 0.5 * 0.88, 1.9), dz = hw * 2 / (C.texAsp || 4), sharp = (34 + 5 * K.eob(seg(t, 3.1, 3.5), 2)) / dz;   // the name spans the screen, ultrawide included; ~34 spikes per name height
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [ring, sweep, crackle, sharp], [hw, 1.0, dz, dy])) return;
      g.fillStyle = "#030406"; g.fillRect(0, 0, W, H);
      var fs = Math.min(W * 0.11, 90), a = sweep;
      g.save(); g.globalAlpha = a; g.font = "900 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
      var gr = g.createLinearGradient(0, H * 0.6 - fs / 2, 0, H * 0.6 + fs / 2); gr.addColorStop(0, "#8fefff"); gr.addColorStop(0.15, "#111"); gr.addColorStop(1, "#000");
      g.fillStyle = gr; g.fillText(C.portrait ? "TITAN" : "TITAN RELIQUARY", W / 2, H * 0.6); if (C.portrait) g.fillText("RELIQUARY", W / 2, H * 0.6 + fs); g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.6, 1900, 0.12, { to: 700, v: 0.12 }); A.tone(0.62, 48, 1.4, { v: 0.35, to: 38 });           // plip and the sub ring
      A.tone(1.0, 55, 2.2, { type: "sawtooth", v: 0.06, lp: 260, a: 0.8 }); A.tone(1.0, 110.5, 2.2, { type: "sine", v: 0.05, a: 0.9 });   // magnetic swell
      for (var i = 0; i < 26; i++) A.noise(1.2 + i * 0.065 + Math.random() * 0.03, 0.02, { type: "highpass", f: 3000 + Math.random() * 4000, v: 0.05 + Math.random() * 0.05 });   // spikes crackle up
      A.bell(3.15, 880, 1.6, 0.06, [[1, 1], [2.4, 0.4], [3.9, 0.2]]);                                    // the glint
    }
  });
})();
