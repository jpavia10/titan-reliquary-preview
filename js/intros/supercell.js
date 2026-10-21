/* Supercell intro (Claude, theme #40, 2026-10-21; Grok's plan in notes/agents/themes-37-50.md: "three in-cloud flashes reveal the
   name, a ground strike stamps it").
   Act 1 (0-0.7 s): a dark storm base fills the frame and turns slowly; a dusk band burns under it; wind.
   Act 2 (0.7-2.6 s): three flashes inside the cloud, each closer and brighter. The name is carved into the cloud: every flash shows the
   letters as dark shapes with a lit rim, the way a backlit cloud shows its edges. Thunder rolls after each flash, nearer each time.
   Act 3 (2.85-4.6 s): a ground strike comes down onto the name; the letters flare white-hot, then cool to lightning-lit silver.
   GPU fragment shader at full resolution; 2D path: the name in silver under a drawn bolt. Sound: wind, three distant thunder rolls
   (delayed by distance), the close crack and its boom. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fb(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }",
    "float msk(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5,q.y/U1.z+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float f1=U0.x, f2=U0.y, f3=U0.z, st=U0.w, cool=U1.w, by=U1.y;",
    "  float a=T*.05; mat2 rm=mat2(cos(a),-sin(a),sin(a),cos(a)); vec2 q=rm*p*1.4;",
    "  float c=fb(q*1.6+vec2(T*.03,0.)), c2=fb(q*3.6-vec2(0.,T*.05));",
    "  float dens=smoothstep(.25,.85,c*.7+c2*.4+(p.y+.25)*.35);",
    "  vec3 col=mix(vec3(.018,.022,.032),vec3(.07,.068,.085),dens);",
    "  col+=vec3(.62,.28,.12)*smoothstep(-.28,-.52,p.y)*.7*(1.-dens*.5);",                                  // the dusk band under the storm
    "  vec2 P1=vec2(-.5,.16), P2=vec2(.42,.26), P3=vec2(0.,.04);",
    "  float L=f1*exp(-length(p-P1)*3.2)*.55+f2*exp(-length(p-P2)*2.6)*.85+f3*exp(-length(p-P3)*1.7)*1.35;",
    "  vec3 lc=vec3(.72,.8,1.);",
    "  col+=lc*L*(.25+1.3*dens*(1.-c2*.45));",                                                               // the cloud lit from inside
    "  float m=msk(p); float mx=msk(p+vec2(.004,0.))-msk(p-vec2(.004,0.)), my=msk(p+vec2(0.,.004))-msk(p-vec2(0.,.004));",
    "  float rim=clamp(length(vec2(mx,my))*3.,0.,1.); float Lb=f1*.35+f2*.6+f3;",
    "  col=mix(col,col*.22,m*smoothstep(0.,.3,Lb)*(1.-st)); col+=lc*rim*Lb*(1.-st*.6);",                       // carved letters, backlit rims
    "  float age=max(T-2.85,0.);",
    "  if(st>0.){ float s=clamp((p.y-by)/(.55-by),0.,1.); float bx=(vn(vec2(s*7.,3.))-.5)*.12+(vn(vec2(s*24.,9.))-.5)*.025;",
    "    float d=abs(p.x-bx); float bolt=exp(-d*R.y*.35)*step(by,p.y)*step(p.y,.55)*exp(-age*5.);",
    "    col+=vec3(.85,.9,1.)*(bolt*9.+exp(-d*30.)*.5*exp(-age*5.)*smoothstep(by-.06,by+.04,p.y)); col+=vec3(.8,.85,1.)*exp(-age*4.)*.45;",
    "    vec3 hot=mix(vec3(3.),vec3(.72,.8,.95)*(.75+.35*fb(p*9.)),cool); col=mix(col,hot,m*st); col+=lc*rim*st*.4; }",
    "  col=1.-exp(-col*1.3); col*=1.-.35*dot(p,p);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(2px)";
    var sans = "\"Inter\", \"Helvetica Neue\", Arial, sans-serif";
    if (st) { g.font = "800 260px " + sans; g.fillText("TITAN", 512, 330); g.font = "800 130px " + sans; g.fillText("RELIQUARY", 512, 690); }
    else { g.font = "800 200px " + sans; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  // a flash with two return strokes, a pure function of time
  function fl(t, t0, p) { if (t < t0) return 0; var a = t - t0; return p * (Math.exp(-a * 9) + 0.7 * (a > 0.07 ? Math.exp(-(a - 0.07) * 14) : 0) + 0.4 * (a > 0.16 ? Math.exp(-(a - 0.16) * 12) : 0)); }
  I.reg("supercell", {
    dur: 4.6, still: 4.3,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, asp = W / H;
      var f1 = fl(t, 0.7, 0.6), f2 = fl(t, 1.4, 0.85), f3 = fl(t, 2.1, 1), st = t >= 2.85 ? 1 : 0, cool = seg(t, 3.0, 4.2);
      var hw = Math.min(asp * 0.5 * 0.84, 1.75), dz = hw * 2 / (C.texAsp || 5.12);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [f1, f2, f3, st], [hw, dz * 0.5, dz, cool])) return;
      var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#05070c"); gr.addColorStop(0.78, "#11131b"); gr.addColorStop(1, "#5a2a14");
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      var fs = Math.min(W * 0.1, 96); g.save(); g.globalAlpha = Math.max(0.2, Math.max(f3, st)); g.font = "800 " + fs + "px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = st ? "#dfe7f5" : "#7a8597";
      if (C.portrait) { g.fillText("TITAN", W / 2, H / 2 - fs / 2); g.fillText("RELIQUARY", W / 2, H / 2 + fs / 2); } else g.fillText("TITAN RELIQUARY", W / 2, H / 2);
      g.restore();
      if (st && t < 3.3) { g.save(); g.strokeStyle = "rgba(225,235,255," + (1 - (t - 2.85) / 0.45) + ")"; g.lineWidth = 3; g.beginPath(); var x = W / 2, y = 0; g.moveTo(x, y);
        while (y < H / 2 - fs) { y += H * 0.05; x += (Math.sin(y * 0.37) + Math.sin(y * 0.11)) * W * 0.02; g.lineTo(x, y); } g.stroke(); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 4.6, { type: "lowpass", f: 380, q: 0.7, v: 0.12, shape: [[0.6, 0.12], [4.2, 0.1], [4.6, 0.0001]] });                        // wind
      [[0.7, 3.2, 0.1], [1.4, 2.0, 0.16], [2.1, 1.1, 0.22]].forEach(function (r) {                                                         // thunder rolls, nearer each time
        var d = r[1] / 3.4; A.noise(r[0] + d, 2.2, { type: "lowpass", f: 240, to: 90, q: 0.8, v: r[2], shape: [[0.15, r[2]], [1.2, r[2] * 0.5], [2.2, 0.0001]] }); });
      A.noise(2.85, 0.09, { type: "highpass", f: 2500, v: 0.5 }); A.noise(2.87, 0.25, { type: "bandpass", f: 1200, q: 0.8, v: 0.35 });   // the crack
      A.tone(2.9, 70, 1.6, { type: "sine", v: 0.32, a: 0.01, to: 32 }); A.noise(2.95, 2.4, { type: "lowpass", f: 300, to: 80, q: 0.9, v: 0.3, shape: [[0.1, 0.3], [1.4, 0.12], [2.4, 0.0001]] });
    }
  });
})();
