/* Millennium Chrome intro (Grok, 2026-10-20, v2: restraint). A millennium product launch. A pale studio cyclorama; three
   translucent polycarbonate panels (Bondi aqua, ice, tangerine) glide in at different depths, throwing soft caustics on the
   floor. A single bead of liquid chrome falls into frame, spreads, and draws itself up into the wordmark; its surface
   reflects the studio (softbox, horizon, the panel colours) and the reflections slide as it settles. A thin, wide-tracked
   line of type follows. Everything in one WebGL pass (SDF panels, height-field chrome from a blurred text mask); 2D
   fallback is a gradient chrome wordmark over flat panels. Sound: an airy sine pad, glass taps as panels settle, a liquid
   swell as the chrome forms, a soft major-ninth startup chord. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}",
    "float ease(float x){x=clamp(x,0.,1.);return 1.-pow(1.-x,3.);}",
    "vec3 env(vec3 d,float sl){float y=d.y;vec3 c=mix(vec3(.18,.22,.27),vec3(.92,.96,1.),smoothstep(-.05,.5,y));",
    " c=mix(c,vec3(.55,.42,.36),smoothstep(0.,-.4,y));c+=vec3(1.)*smoothstep(.06,0.,abs(y-.35))*.9;",
    " c+=vec3(.2,.75,.85)*smoothstep(.25,0.,abs(d.x+.5-sl))*.35+vec3(1.,.55,.2)*smoothstep(.2,0.,abs(d.x-.6+sl))*.25;return c;}",
    "void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 s=vec2((uv.x-.5)*asp,uv.y-.5);float t=T;",
    " vec3 col=mix(vec3(.78,.85,.9),vec3(.95,.97,.98),uv.y);col*=1.-.18*length(s*vec2(.8,1.2));",
    " float floorY=-.2;float fl=smoothstep(floorY+.01,floorY-.01,s.y);col=mix(col,col*.93,fl);",
    " vec3 pc[3];pc[0]=vec3(.1,.62,.72);pc[1]=vec3(.55,.7,.85);pc[2]=vec3(1.,.55,.18);",
    " for(int i=0;i<3;i++){float fi=float(i);float e=ease((t-.1-fi*.22)/1.3);",
    "  vec2 c=vec2(mix(-1.2+fi*.2,-.32+fi*.32,e)*(i==1?-1.:1.),.06+fi*.05-.08);vec2 p=s-c;float rot=(fi-1.)*.06;p=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*p;",
    "  float d=box(p,vec2(.17,.24)*(1.-fi*.08),.05);",
    "  vec2 sp=vec2(s.x-c.x-.03,(s.y-floorY)*3.);float shd=smoothstep(.05,-.1,box(sp,vec2(.18,.12),.08))*fl;",
    "  float ca=pow(abs(sin(sp.x*30.+sin(sp.y*9.+t*1.5)*2.)*sin(sp.y*24.-t)),6.);col+=pc[i]*shd*(.18+.5*ca)*e;",
    "  float a=smoothstep(.003,-.003,d);float rim=smoothstep(.008,0.,abs(d))*.22;float sheen=smoothstep(.2,0.,abs(p.x+p.y*.6-mix(-.4,.4,fract(t*.25+fi*.3))))*.25;",
    "  col=mix(col,col*.5+pc[i]*.5,a*.75*e);col+=vec3(1.)*(rim+sheen*a)*e;}",
    " float form=U0.x,drop=U0.y,sl=U0.z;",
    " vec2 tuv=uv;float tex=texture2D(TX,tuv).r;",
    " vec2 bc=vec2(0.,mix(.7,.08,ease(drop)));float blob=exp(-dot(s-bc,s-bc)*mix(60.,8.,form)/(.4+ .6*smoothstep(.0,.6,drop)));",
    " float e2=1.5/R.y;",
    " float h=mix(blob,tex,form);float hx=mix(exp(-dot(s+vec2(e2,0.)-bc,s+vec2(e2,0.)-bc)*mix(60.,8.,form)/(.4+.6*smoothstep(0.,.6,drop))),texture2D(TX,tuv+vec2(1.5/R.x,0.)).r,form);",
    " float hy=mix(exp(-dot(s+vec2(0.,e2)-bc,s+vec2(0.,e2)-bc)*mix(60.,8.,form)/(.4+.6*smoothstep(0.,.6,drop))),texture2D(TX,tuv+vec2(0.,1.5/R.y)).r,form);",
    " float m=smoothstep(.46,.54,h)*step(.001,drop);",
    " vec3 n=normalize(vec3((h-hx)*70.,(h-hy)*70.,1.));vec3 rd=reflect(vec3(0.,0.,-1.),n);",
    " vec3 ch=env(vec3(rd.x,rd.y,rd.z),sl)*vec3(.96,.98,1.02);ch+=pow(max(0.,dot(n,normalize(vec3(-.4,.6,.7)))),60.)*.8;",
    " ch*=.85+.15*smoothstep(.5,.75,h);",
    " vec2 so=s-vec2(.0,-.012);float sh=smoothstep(.4,.6,mix(blob,texture2D(TX,tuv+vec2(0.,.012)).r,form))*.18;col*=1.-sh*(1.-m);",
    " col=mix(col,ch,m);gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  function mask(W, H) {                                     // blurred wordmark (height), drawn with the shadow trick so it blurs everywhere
    var c = K.mk(W, H), g = c.getContext("2d"), fs = Math.min(W * 0.105, 72); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.font = "700 " + fs + "px 'Eurostile','Michroma','Avenir Next','Helvetica Neue'," + K.SANS; g.textAlign = "center"; g.textBaseline = "middle";
    if ("letterSpacing" in g) g.letterSpacing = (fs * 0.04) + "px";
    g.shadowColor = "#fff"; g.shadowBlur = fs * 0.12; g.shadowOffsetX = 10000; g.fillStyle = "#fff";
    for (var k = 0; k < 2; k++) { g.fillText("TITAN", W / 2 - 10000, H * 0.42); g.fillText("RELIQUARY", W / 2 - 10000, H * 0.42 + fs * 1.0); }
    g.shadowBlur = 0; g.shadowOffsetX = 0; g.globalAlpha = 0.6; g.fillText("TITAN", W / 2, H * 0.42); g.fillText("RELIQUARY", W / 2, H * 0.42 + fs * 1.0);
    return { c: c, fs: fs };
  }
  I.reg("y2k", {
    dur: 4.2, still: 4.0,
    init: function (C) { C.L = I.gl(C, FRAG); C.M = mask(Math.round(C.W), Math.round(C.H)); if (C.L) C.L.tex(C.M.c); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var drop = seg(t, 0.7, 1.5), form = K.eio(seg(t, 1.45, 2.7)), sl = K.eio(seg(t, 1.8, 3.6)) * 0.8;
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [form, drop, sl, 0], [0, 0, 0, 0]))) {
        var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#f2f6f8"); bg.addColorStop(1, "#c6d5df"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        ["rgba(26,158,184,.35)", "rgba(190,215,235,.45)", "rgba(255,140,46,.35)"].forEach(function (c, i) { var e = K.eo3(seg(t, 0.1 + i * 0.22, 1.4 + i * 0.22)), x = W / 2 + (i - 1) * W * 0.3 * e + (i === 1 ? 0 : (1 - e) * (i - 1) * W);
          g.fillStyle = c; g.beginPath(); g.roundRect ? g.roundRect(x - W * 0.15, H * 0.3, W * 0.3, H * 0.4, 18) : g.rect(x - W * 0.15, H * 0.3, W * 0.3, H * 0.4); g.fill(); });
        if (form > 0) { g.save(); g.globalAlpha = form; var fs = C.M.fs; g.font = "700 " + fs + "px 'Eurostile','Michroma','Avenir Next','Helvetica Neue'," + K.SANS; g.textAlign = "center"; g.textBaseline = "middle";
          var cg = g.createLinearGradient(0, H * 0.42 - fs * 0.5, 0, H * 0.42 + fs * 1.5); cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.45, "#9aa6b4"); cg.addColorStop(0.5, "#3a434e"); cg.addColorStop(0.6, "#d8dee6"); cg.addColorStop(1, "#7a8592");
          g.fillStyle = cg; g.fillText("TITAN", W / 2, H * 0.42); g.fillText("RELIQUARY", W / 2, H * 0.42 + fs); g.restore(); } }
      var tl = seg(t, 2.9, 3.5); if (tl > 0) { var fs2 = Math.max(10, Math.min(W * 0.028, 14)); g.save(); g.globalAlpha = tl; g.font = "400 " + fs2 + "px 'Avenir Next','Helvetica Neue'," + K.SANS; g.textAlign = "center"; if ("letterSpacing" in g) g.letterSpacing = (fs2 * 0.5) + "px";
        g.fillStyle = "#4a5866"; g.fillText("MILLENNIUM EDITION  \u2014  MMXXVI", W / 2, H * 0.42 + C.M.fs * 2.0); g.restore(); }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      [220, 277.18, 329.63, 415.3].forEach(function (f) { A.tone(0, f, 2.6, { type: "sine", v: 0.025, a: 0.9 }); });
      [0.95, 1.17, 1.39].forEach(function (s, i) { A.bell(s + 0.4, [1760, 2217, 2637][i], 0.5, 0.025, [[1, 1], [3.1, 0.15]]); });
      A.tone(0.75, 300, 0.5, { type: "sine", to: 90, v: 0.06 }); A.noise(1.5, 1.2, { type: "bandpass", f: 400, to: 2600, q: 6, v: 0.04 });
      [329.63, 415.3, 493.88, 622.25, 739.99].forEach(function (f, i) { A.tone(2.7 + i * 0.03, f, 1.5, { type: "triangle", v: 0.035, a: 0.02, lp: 3000 }); });
    }
  });
})();
