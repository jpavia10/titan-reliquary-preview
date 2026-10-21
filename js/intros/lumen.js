/* Lumen Circuit intro (Grok, theme #35, 2026-10-20). Original light-grid world, no borrowed names or marks.
   Act 1 (0-1.3 s): black void; a wave of light rolls in from the horizon across a mirror-black grid plain, lighting its lanes.
   Act 2 (1.1-2.7 s): two runners of light launch from the centre of the horizon, one left and one right, and trace the outline of
   TITAN RELIQUARY as they go, a hot white-amber head on a cyan wall of light; the outline is mirrored in the glossy floor.
   Act 3 (2.6-3.4 s): the letters charge: a flash, their glass faces fill with scanlines of light, and a data pulse runs the grid.
   One GPU fragment shader (grid by analytic perspective, name as a distance-like field from a blurred mask texture, reflection,
   bloom-style halos, filmic curve), rendered at full device resolution. 2D path: the name in cyan outline on a black grid.
   Sound: a sub swell under the wave, two light-runner zips, a charge-up and a bright synth chime (all synthesised effects). */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float msk(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5,(q.y-U1.y)/U1.z+.5); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture2D(TX,uv).r; }",
    "vec3 name(vec2 q, float refl){",
    "  float m=msk(q); float ux=q.x/U1.x*.5+.5; float d=abs(ux-.5)*2.;",                         // 0 at centre, 1 at the ends
    "  float tr=U0.y; float shown=smoothstep(tr+.004,tr-.004,d);",
    "  float edge=exp(-pow((m-.5)*7.,2.)); float core=exp(-pow((m-.5)*22.,2.)); float halo=exp(-pow((m-.42)*2.6,2.))*smoothstep(0.,.08,m);",
    "  vec3 cy=vec3(.25,.88,1.), am=vec3(1.,.72,.35);",
    "  vec3 c=(cy*edge*1.5+vec3(.85,.97,1.)*core*2.4+cy*halo*.35)*shown;",
    "  float hd=exp(-pow((d-tr)*60.,2.))*step(.02,tr)*step(tr,1.02)*(1.-U0.z); c+=mix(am,vec3(1.),.4)*edge*hd*5.;",   // the runners' heads on the trace front
    "  float fill=smoothstep(.5,.62,m)*U0.z; float scan=.55+.45*sin(q.y*R.y*.9-T*14.);",
    "  c+=fill*(vec3(.05,.16,.26)+cy*.7*scan*(.6+.4*sin(ux*40.-T*6.)))+fill*U0.w*vec3(1.4,1.6,1.8);",
    "  return c*refl; }",
    "void main(){ vec2 p=(gl_FragCoord.xy-.5*R)/R.y; float hy=-.07+U1.w*.0; vec3 col=vec3(.002,.003,.008);",
    "  vec3 cy=vec3(.2,.82,1.);",
    "  if(p.y>hy){ float e=p.y-hy; col+=cy*exp(-e*26.)*.35*smoothstep(0.,1.,U0.x*3.)+vec3(.04,.02,.09)*exp(-e*4.)*.5;",
    "    float rg=.025*vn(vec2(p.x*6.,1.))+.012*vn(vec2(p.x*19.,3.)); col=mix(col,vec3(.003,.004,.01),step(e,rg)*.9); col+=cy*exp(-abs(e-rg)*R.y*.35)*.9*smoothstep(0.,1.,U0.x*2.);",
    "    col+=name(p,1.);",
    "  } else {",
    "    float h=.32, z=h/(hy-p.y), wx=p.x*z, wz=z+T*3.2*U0.x;",
    "    float pz=z*z/h/R.y*1.5, px=z/R.y*1.5;",
    "    float lx=smoothstep(px,0.,abs(fract(wx+.5)-.5)), lz=smoothstep(pz,0.,abs(fract(wz*.5+.5)-.5)*2.);",
    "    float mj=smoothstep(px*.8,0.,abs(fract(wx/6.+.5)-.5)*6.); float hx=exp(-abs(fract(wx+.5)-.5)/(px*3.))*.25, hz=exp(-abs(fract(wz*.5+.5)-.5)*2./(pz*3.))*.25; float line=max(max(lx,lz)*.9,mj*1.6)+hx+hz;",
    "    float front=mix(70.,-1.,U0.x); float lit=smoothstep(front-.4,front+.4,z);",
    "    float band=exp(-pow((z-front)*1.2,2.))*3.;",
    "    float fade=exp(-z*.045);",
    "    col+=cy*line*(lit*1.1+band)*fade*(1.+U0.w*2.);",
    "    float pulse=exp(-pow(fract(wz*.06-T*.5)-.5,2.)*90.)*mj*U0.z; col+=cy*pulse*1.5*fade;",
    "    vec2 rq=vec2(p.x,2.*hy-p.y+.004*sin(p.y*260.+T*5.)); col+=name(rq,.3*smoothstep(-.6,hy,p.y));",
    "    col+=cy*.06*exp(-(hy-p.y)*30.)*U0.x; }",
    "  col+=vec3(.3,.8,1.)*.08*U0.w;",
    "  col=1.-exp(-col*1.25); col=pow(col,vec3(.95)); col*=1.-.35*dot(p*.8,p*.8);",
    "  gl_FragColor=vec4(col,1.); }"
  ].join("\n");
  function nameTex(C) {
    var st = C.W / C.H < 1.2, c = st ? K.mk(1024, 1024) : K.mk(2048, 400), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.filter = "blur(3px)";
    if (st) { g.font = "800 300px " + K.GEO; g.fillText("TITAN", 512, 330); g.font = "800 168px " + K.GEO; g.fillText("RELIQUARY", 512, 690); }
    else { g.font = "800 220px " + K.GEO; g.fillText("TITAN RELIQUARY", 1024, 210); }
    g.filter = "none"; C.texAsp = c.width / c.height; return c;
  }
  I.reg("lumen", {
    dur: 4.4, still: 3.9,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); if (C.L) C.L.tex(nameTex(C)); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var wave = K.eio(seg(t, 0.1, 1.4)), trace = K.eio(seg(t, 1.1, 2.7)), fill = K.eio(seg(t, 2.6, 3.2)), flash = Math.exp(-Math.pow((t - 2.75) * 6, 2));
      var hw = Math.min(W / H * 0.5 * 0.86, 1.8), dz = hw * 2 / (C.texAsp || 5.12), ny = 0.12 * (C.portrait ? 1.3 : 1);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [wave, trace, fill, flash], [hw, ny, dz, 0])) return;
      g.fillStyle = "#020309"; g.fillRect(0, 0, W, H);
      var hz = H * 0.57; g.strokeStyle = "rgba(63,224,255," + (0.35 * wave) + ")"; g.lineWidth = 1;
      for (var i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 6, hz); g.lineTo(W / 2 + i * W * 0.18, H); g.stroke(); }
      for (var k = 1; k < 9; k++) { var y = hz + (H - hz) * Math.pow(k / 9, 2); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      var fs = Math.min(W * 0.1, 96); g.save(); g.font = "800 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
      g.globalAlpha = trace; g.strokeStyle = "#3fe0ff"; g.lineWidth = 2; g.shadowColor = "#3fe0ff"; g.shadowBlur = 18;
      var ty = H * 0.4; if (C.portrait) { g.strokeText("TITAN", W / 2, ty - fs / 2); g.strokeText("RELIQUARY", W / 2, ty + fs / 2); } else g.strokeText("TITAN RELIQUARY", W / 2, ty);
      g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.1, 41, 1.6, { type: "sine", v: 0.22, a: 0.9, to: 55 });                                                   // the wave rolls in
      A.noise(0.2, 1.2, { type: "lowpass", f: 300, to: 1400, shape: [[0.8, 0.06], [1.2, 0.0001]] });
      A.tone(1.1, 220, 1.6, { type: "sawtooth", v: 0.035, lp: 2400, to: 880, a: 0.05 });                                 // runner zips (left / right)
      A.tone(1.12, 330, 1.6, { type: "square", v: 0.02, lp: 1800, to: 1320, a: 0.05 });
      A.tone(2.2, 55, 0.6, { type: "sawtooth", v: 0.06, lp: 400, to: 110, a: 0.5 });                                     // charge
      A.tone(2.72, 36, 1.4, { v: 0.32, to: 30 });                                                                        // the letters light
      A.noise(2.72, 0.5, { type: "highpass", f: 4000, shape: [[0.02, 0.08], [0.5, 0.0001]] });
      A.bell(2.8, 1318.5, 1.8, 0.05, [[1, 1], [2, 0.35], [3.01, 0.2]]); A.bell(2.95, 1975.5, 1.4, 0.03, [[1, 1], [2, 0.3]]);
    }
  });
})();
