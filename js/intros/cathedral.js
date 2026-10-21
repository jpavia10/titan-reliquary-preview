/* Cathedral Glass intro (Grok, 2026-10-20). Inside, before dawn: a tall lancet window is only its black lead lattice. Sunrise
   climbs it from the sill, and pane by pane the glass catches (each piece flares as it lights, then settles into its colour);
   when the rose at the top takes the light, shafts fall through the dust onto the stone floor and carry the name down onto it
   in coloured light. WebGL: the window (Voronoi glass, lead came, per-pane ignition), the shafts and the floor are one shader;
   2D fallback: the same order with simpler panes. Sound: an organ chord that adds a voice as the window fills, then the full
   chord with a low pedal note when the light reaches the floor. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "vec2 h22(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}",
    "float arch(vec2 p){ if(p.y<1.0) return 1.-abs(p.x); return min(1.6-length(p-vec2(-0.6,1.)), 1.6-length(p-vec2(0.6,1.))); }",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y; vec2 s=vec2((uv.x-0.5)*asp,uv.y);",
    "  float wh=0.37; vec2 wp=vec2(s.x/(wh*0.42),(s.y-0.36)/(wh*0.52));",       /* window space */
    "  float ins=step(0.,arch(wp))*step(0.,wp.y);",
    "  float rise=U0.x, floorL=U0.y;",
    "  vec2 g=wp*vec2(3.2,3.0); vec2 ip=floor(g), fp=fract(g); float d1=8.,d2=8.; vec2 best=vec2(0.);",
    "  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)); vec2 pt=o+0.15+0.7*h22(ip+o); float d=length(fp-pt); if(d<d1){d2=d1;d1=d;best=ip+o;}else if(d<d2)d2=d;}",
    "  float lead=smoothstep(0.06,0.1,d2-d1)*smoothstep(0.,0.04,arch(wp));",
    "  vec2 hc=h22(best+3.1); float on=smoothstep(0.,0.06,rise*3.4-(best.y/3.0+0.5+hc.x*0.25));",
    "  float flare=exp(-pow((rise*3.4-(best.y/3.0+0.5+hc.x*0.25))*14.-0.6,2.));",
    "  vec3 pal[5]; pal[0]=vec3(0.75,0.08,0.12); pal[1]=vec3(0.1,0.2,0.75); pal[2]=vec3(0.95,0.7,0.15); pal[3]=vec3(0.1,0.55,0.3); pal[4]=vec3(0.5,0.15,0.6);",
    "  int ci=int(floor(hc.y*5.)); vec3 gc=pal[0]; if(ci==1)gc=pal[1]; if(ci==2)gc=pal[2]; if(ci==3)gc=pal[3]; if(ci==4)gc=pal[4];",
    "  float tex=0.55+0.55*vn(wp*30.)+0.15*vn(wp*7.);",
    "  float rosed=length(wp-vec2(0.,1.75)); float rose=smoothstep(0.42,0.4,rosed)*step(1.4,wp.y);",
    "  vec3 glass=gc*tex*(0.25+1.1*on)+vec3(1.,0.95,0.8)*flare*0.9;",
    "  float ra=atan(wp.y-1.75,wp.x); float pet=abs(fract(ra*8./6.28318)-0.5); float ring=abs(fract(rosed*7.)-0.5);",
    "  vec3 rc=mix(pal[1],pal[0],step(0.5,fract(rosed*3.5)))*(0.25+1.2*smoothstep(0.82,0.95,rise))+vec3(1.,0.9,0.6)*exp(-pow((rise-0.93)*30.,2.));",
    "  rc*=smoothstep(0.02,0.06,pet)*smoothstep(0.03,0.08,ring); rc=mix(rc,pal[2]*(0.4+smoothstep(0.85,1.,rise)),smoothstep(0.1,0.08,rosed));",
    "  glass=mix(glass*step(0.44,rosed), rc, rose);",
    "  vec3 col=vec3(0.03,0.025,0.05);",
    "  col=mix(col, glass*lead, ins);",
    "  float sill=smoothstep(0.012,0.,abs(wp.y))*step(abs(wp.x),1.1); col+=vec3(0.15,0.12,0.1)*sill;",
    "  vec2 src=vec2(0.,0.6); vec2 dir=normalize(s-vec2(0.,0.55)); float beam=0.;",
    "  if(s.y<0.36){ float k=(0.36-s.y); float xw=s.x+k*0.55; float wx=xw/(wh*0.42); beam=smoothstep(1.,0.85,abs(wx))*(0.35+0.65*pow(vn(vec2(wx*9.,T*0.2)),2.))*exp(-k*3.); }",
    "  vec3 bc=vec3(1.,0.85,0.6)*beam*floorL*0.28; bc+=vec3(1.)*0.03*floorL*pow(vn(s*60.+vec2(0.,T*0.6)),8.)*beam*8.;",   /* dust in the shafts */
    "  col+=bc;",
    "  float fl=smoothstep(0.17,0.12,s.y); col=mix(col, col+vec3(0.06,0.05,0.05)*(0.6+0.4*vn(s*vec2(8.,30.))), fl);",
    "  col*=smoothstep(1.3,0.3,length((uv-vec2(0.5,0.55))*vec2(asp,1.)));",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  I.reg("cathedral", {
    dur: 4.6, still: 4.3,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var rise = K.sm(seg(t, 0.25, 2.6)), floorL = K.sm(seg(t, 2.5, 3.3));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [rise, floorL, 0, 0]))) {
        g.fillStyle = "#0d0b14"; g.fillRect(0, 0, W, H);
        var ww = Math.min(W * 0.36, H * 0.18), cx = W / 2, sy = H * 0.64, cols = ["#b31420", "#1a33bf", "#f2b326", "#1a8c4d", "#80269a"];
        for (var j = 0; j < 7; j++) for (var i = 0; i < 4; i++) { var y = sy - (j + 1) * ww * 0.36, lit = rise * 7 > j; g.fillStyle = lit ? cols[(i * 3 + j) % 5] : "#16121f"; g.fillRect(cx - ww + i * ww / 2 + 2, y + 2, ww / 2 - 4, ww * 0.36 - 4); }
        if (floorL > 0) { g.fillStyle = "rgba(255,220,160," + 0.12 * floorL + ")"; g.beginPath(); g.moveTo(cx - ww, sy); g.lineTo(cx + ww, sy); g.lineTo(cx + ww * 2.4, H); g.lineTo(cx - ww * 0.4, H); g.fill(); }
      }
      // the name, cast as coloured light onto the floor (perspective: wide and flattened, slightly skewed with the shafts)
      if (floorL > 0) {
        var fs = Math.min(W * 0.085, 60), y = H * 0.88;
        g.save(); g.translate(W / 2 + W * 0.04, y); g.transform(1, 0, -0.35, 0.55, 0, 0); g.globalCompositeOperation = "lighter"; g.globalAlpha = K.sm(seg(t, 2.9, 3.6));
        g.font = "700 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
        var gr = g.createLinearGradient(-fs * 4, 0, fs * 4, 0); ["#ff4a5a", "#ffd26a", "#5a8aff", "#4fe08a", "#d46aff"].forEach(function (c, i) { gr.addColorStop(i / 4, c); });
        g.fillStyle = gr; g.shadowColor = "rgba(255,220,160,.9)"; g.shadowBlur = 24; g.fillText("TITAN RELIQUARY", 0, 0); g.restore();
      }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      [[0.3, 130.81], [0.8, 196.0], [1.3, 261.63], [1.8, 329.63], [2.3, 392.0]].forEach(function (n, i) {   // the window fills: a voice per stage
        A.tone(n[0], n[1], 4.3 - n[0], { type: "square", v: 0.03, lp: 900, a: 0.35 }); A.tone(n[0], n[1] * 2, 4.3 - n[0], { type: "sine", v: 0.025, a: 0.4 }); });
      A.tone(2.6, 65.41, 2.0, { type: "sawtooth", v: 0.08, lp: 300, a: 0.3 });                                // the pedal as the light reaches the floor
      A.tone(2.6, 523.25, 1.8, { type: "triangle", v: 0.03, a: 0.5 });
    }
  });
})();
