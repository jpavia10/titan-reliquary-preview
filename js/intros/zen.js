/* Zen Garden intro (Grok, 2026-10-20). Overhead, moonlit karesansui. A five-tine rake draws one long S-curve across the sand
   (the camera eases down from a high crop), three stones drop and the sand answers with raked rings around each, then the name
   is pressed INTO the sand as a relief and a vermilion seal is stamped. Sound: the rake's scrape follows its speed, low wooden
   thuds for the stones, one singing bowl at the seal. WebGL: the sand is a lit heightfield (normals from the height, moonlight
   grazing from the left); 2D fallback draws the same grooves as strokes. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var STONES = [[0.27, 0.30, 0.060], [0.72, 0.58, 0.085], [0.40, 0.80, 0.048]];   // x, y (fraction of the screen), radius (fraction of min side)
  var DROP = [1.55, 1.85, 2.1];
  var FRAG = [
    "float curveY(float x){return 0.5+0.17*sin(x*5.2+0.6)+0.05*sin(x*13.0);}",
    "float H(vec2 p, vec2 q){",              // p in 0..1 screen, q in aspect units
    "  float asp=R.x/R.y; float h=0.04*vn(q*180.)+0.02*vn(q*37.);",
    "  float prog=U0.x;",
    "  float cy=curveY(p.x); float dy=(curveY(p.x+0.002)-cy)/0.002; float d=(p.y-cy)/sqrt(1.+dy*dy)*(1./asp);",
    "  float band=0.085; float tip=smoothstep(prog,prog-0.03,p.x);",
    "  if(abs(d)<band){ float gv=0.5+0.5*cos(d/band*15.70796); h+= (gv-0.5)*0.55*tip*smoothstep(band,band*0.85,abs(d)); }",
    "  else { float off=abs(d)-band; float lines=0.5+0.5*cos(off*55.); h+= (lines-0.5)*0.10*smoothstep(0.,0.05,off)*U0.w; }",
    "  for(int i=0;i<3;i++){",
    "    vec3 s=i==0?vec3(0.27,0.30,0.060):i==1?vec3(0.72,0.58,0.085):vec3(0.40,0.80,0.048);",
    "    float dt=i==0?U1.x:i==1?U1.y:U1.z;",
    "    vec2 c=vec2(s.x*asp,s.y); float r=length(q-c); float rr=s.z*min(asp,1.)*1.0;",
    "    float ring=smoothstep(0.,1.,dt)*(rr*3.2); float w=smoothstep(ring,ring-0.04,r)*smoothstep(rr*0.9,rr*1.2,r);",
    "    h=mix(h, 0.5+0.28*cos((r-rr)*95.), w*0.85*step(0.001,dt));",
    "    h-= exp(-pow((r-rr*(1.0+0.6*dt))/(0.012+0.02*dt),2.))*0.25*max(0.,1.-dt)*step(0.001,dt);",   /* the splash ring of the drop */
    "  }",
    "  vec2 tc=vec2(p.x,1.-p.y); vec4 m=texture2D(TX,tc); float halo=m.g; float tx=m.r;",
    "  h=mix(h,0.02*vn(q*180.),smoothstep(0.,0.6,halo)*U0.z); h-=tx*0.7*U0.z;",
    "  return h;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/R; uv.y=1.-uv.y; float asp=R.x/R.y;",
    "  float z=mix(1.22,1.0,U0.y); vec2 p=(uv-vec2(0.35,0.4))/z+vec2(0.35,0.4);",   /* camera: eases out from a crop near the rake's start */
    "  vec2 q=vec2(p.x*asp,p.y); float e=1.5/R.y;",
    "  float h0=H(p,q), hx=H(p+vec2(e/asp,0.),q+vec2(e,0.)), hy=H(p+vec2(0.,e),q+vec2(0.,e));",
    "  vec3 n=normalize(vec3(h0-hx,h0-hy,e*30.));",
    "  vec3 L=normalize(vec3(-0.75,-0.35,0.45)); float dif=max(dot(n,L),0.);",
    "  vec3 sand=vec3(0.50,0.52,0.53)*(0.88+0.24*vn(q*400.));",
    "  vec3 col=sand*(0.10+1.05*dif)*vec3(0.80,0.88,1.0);",
    "  for(int i=0;i<3;i++){",
    "    vec3 s=i==0?vec3(0.27,0.30,0.060):i==1?vec3(0.72,0.58,0.085):vec3(0.40,0.80,0.048);",
    "    float dt=i==0?U1.x:i==1?U1.y:U1.z; if(dt<=0.) continue;",
    "    float k=clamp(dt*3.,0.,1.); float sc=mix(1.6,1.,k*k);",
    "    vec2 c=vec2(s.x*asp,s.y); vec2 d=(q-c)/(s.z*min(asp,1.)*sc); d.x*=1.0+0.15*sin(float(i)*3.);",
    "    float sh=smoothstep(1.35,0.8,length(d-vec2(0.22,0.16)*sc)); col*=1.-0.55*sh*k;",   /* shadow */
    "    float r=length(d); if(r<1.){ vec3 sn=normalize(vec3(d*0.9,sqrt(max(0.,1.-r*r)))); float rd=max(dot(sn,L),0.);",
    "      float gr=vn(d*6.+float(i)*7.)*0.5+vn(d*19.)*0.25; vec3 st=vec3(0.13,0.14,0.15)*(0.6+gr)+pow(max(dot(reflect(-L,sn),vec3(0,0,1)),0.),18.)*0.35;",
    "      col=mix(col, st*(0.25+1.1*rd), smoothstep(1.,0.96,r)*smoothstep(0.,0.4,k)); }",
    "  }",
    "  float vig=smoothstep(1.25,0.35,length((uv-0.5)*vec2(asp,1.)*0.9)); col*=mix(0.35,1.,vig);",
    "  col*=U1.w; col+= (h21(gl_FragCoord.xy+T)-0.5)*0.025;",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");

  function nameLines(C, fs) { return C.portrait ? [["TITAN", 0], ["RELIQUARY", fs * 1.15]] : [["TITAN  RELIQUARY", fs * 0.3]]; }
  function textMask(C) {                                          // R = the letters (pressed in), G = the smoothed plate around them
    var W = C.W, H = C.H, c = K.mk(Math.round(W * 0.5), Math.round(H * 0.5)), g = c.getContext("2d");
    var fs = Math.min(W * (C.portrait ? 0.11 : 0.07), 84) * 0.5, y0 = c.height * (C.portrait ? 0.16 : 0.15), cy = y0 + (C.portrait ? fs * 0.58 : fs * 0.3);
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
    g.save(); g.translate(c.width / 2, cy); g.scale(1.6, 1); var pl = g.createRadialGradient(0, 0, fs * 0.6, 0, 0, fs * 2.6);
    pl.addColorStop(0, "rgb(0,255,0)"); pl.addColorStop(1, "rgb(0,0,0)"); g.fillStyle = pl; g.fillRect(-c.width, -c.height, c.width * 2, c.height * 2); g.restore();
    g.globalCompositeOperation = "lighter"; g.font = "500 " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgb(255,0,0)"; g.shadowBlur = fs * 0.1; g.fillStyle = "rgb(255,0,0)";
    nameLines(C, fs).forEach(function (l) { g.fillText(l[0], c.width / 2, y0 + l[1]); });
    C.nameFs = fs * 2; C.nameY = y0 * 2; return c;
  }
  function seal(g, x, y, s, a) {
    g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(-0.05);
    g.fillStyle = "#b8321f"; g.beginPath(); g.rect(-s / 2, -s / 2, s, s); g.fill();
    g.globalCompositeOperation = "destination-out"; g.font = "700 " + s * 0.36 + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("T", -s * 0.18, -s * 0.16); g.fillText("R", s * 0.18, s * 0.18); g.lineWidth = s * 0.05; g.strokeStyle = "#000"; g.strokeRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
    g.restore();
  }
  I.reg("zen", {
    dur: 4.2, still: 3.9,
    init: function (C) {
      C.L = I.gl(C, FRAG); C.mask = textMask(C);
      if (C.L) C.L.tex(C.mask);
    },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg, eo3 = K.eo3;
      var prog = K.eio(seg(t, 0.25, 2.35)) * 1.08, cam = K.eio(seg(t, 0.2, 3.2)), press = eo3(seg(t, 2.55, 3.25)), lines = eo3(seg(t, 0.9, 2.6));
      var drops = DROP.map(function (d) { return t < d ? 0 : seg(t, d, d + 1.3); }), light = K.sm(seg(t, 0, 0.6)) * (1 - 0.0 * t);
      g.clearRect(0, 0, W, H);
      if (C.L && C.L.draw(t, [prog, cam, press, lines], [drops[0], drops[1], drops[2], light])) { /* sand drawn on the GL layer */ }
      else {                                                       // 2D: the same composition as strokes
        g.fillStyle = "#3a3d40"; g.fillRect(0, 0, W, H); g.globalAlpha = light;
        g.strokeStyle = "rgba(220,228,235,.35)"; g.lineWidth = 1.4;
        for (var k = -2; k <= 2; k++) { g.beginPath(); for (var x = 0; x <= prog * W; x += 6) { var u = x / W, y = (0.5 + 0.17 * Math.sin(u * 5.2 + 0.6) + 0.05 * Math.sin(u * 13)) * H + k * 9; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
        STONES.forEach(function (s, i) { var d = drops[i]; if (!d) return; var r = s[2] * Math.min(W, H);
          for (var j = 1; j < 5; j++) { var rr = r * (1 + j * 0.45); if (rr > r * 3.2 * d) break; g.beginPath(); g.arc(s[0] * W, s[1] * H, rr, 0, K.PI2); g.stroke(); }
          g.fillStyle = "#1d2023"; g.beginPath(); g.arc(s[0] * W, s[1] * H, r, 0, K.PI2); g.fill(); });
        if (press > 0) { g.globalAlpha = press * 0.8; g.fillStyle = "#16181a"; g.font = "500 " + C.nameFs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
          nameLines(C, C.nameFs).forEach(function (l) { g.fillText(l[0], W / 2, C.nameY + l[1]); }); }
        g.globalAlpha = 1;
      }
      // the seal, stamped: a quick press (overshoot) and the ink settles
      var st = seg(t, 3.15, 3.45);
      if (st > 0) { var s = Math.min(W, H) * 0.085, sc = 1 + 0.6 * (1 - K.eob(st, 2.2)); seal(g, W - s * 1.1, H - s * 1.3 - (C.portrait ? H * 0.05 : 0), s * sc, Math.min(1, st * 3) * 0.92); }
      var cap = seg(t, 3.3, 3.8);
      if (cap > 0) { g.globalAlpha = cap * 0.75; g.fillStyle = "#e9eef2"; g.font = "400 " + Math.max(11, Math.min(W, H) * 0.028) + "px " + K.SERIF; g.textAlign = "left";
        g.fillText("every coin, a stone in the garden", Math.min(W, H) * 0.06, H - Math.min(W, H) * 0.08 - (C.portrait ? H * 0.05 : 0)); g.globalAlpha = 1; }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.25, 2.1, { type: "bandpass", f: 900, to: 2400, q: 0.8, shape: [[0.05, 0.05], [0.6, 0.12], [1.2, 0.16], [1.8, 0.1], [2.1, 0.0001]] });   // the rake's scrape: loudest at full speed
      A.noise(0.25, 2.1, { type: "highpass", f: 4500, q: 0.5, shape: [[0.3, 0.02], [1.2, 0.035], [2.1, 0.0001]] });
      DROP.forEach(function (d, i) { A.tone(d + 0.12, 95 - i * 12, 0.35, { v: 0.32, to: 55, glide: 0.2 }); A.noise(d + 0.12, 0.08, { type: "lowpass", f: 700, v: 0.2 }); });
      A.bell(3.17, 196, 3.2, 0.14);                                // the bowl
      A.tone(3.17, 197.5, 3.0, { v: 0.05 });                       // its slow beat
    }
  });
})();
