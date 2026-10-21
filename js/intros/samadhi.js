/* Samadhi intro (Grok, 2026-10-20). The screen breathes with you. A warm field of light swells on a slow inhale (the words
   "breathe in" rise and fade), holds, and on the exhale it settles while a thread of incense smoke rises from a single ember,
   curling and widening, and the name gathers out of the smoke as it drifts. Nothing moves fast. WebGL: the breath light and
   curl-noise smoke are one shader; 2D fallback: soft gradients and a drawn smoke line. Sound: a tanpura drone (the four-string
   cycle), a breath that swells and releases with the light, a small bell on the exhale. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.02+3.1;a*=.5;}return s;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y; vec2 p=vec2((uv.x-0.5)*asp,uv.y);",
    "  float br=U0.x, sm=U0.y;",
    "  float d=length(p-vec2(0.,0.55)); vec3 col=vec3(0.06,0.03,0.025)+vec3(1.,0.62,0.35)*0.55*br*exp(-d*d*(6.-3.*br));",
    "  float h=p.y-0.18; float age=clamp(h/0.75,0.,1.);",
    "  vec2 q=p; q.x+=0.06*sin(p.y*7.-T*0.9)*age+0.12*(fbm(vec2(p.y*2.-T*0.15,T*0.1))-0.5)*age*1.6;",
    "  float wdt=0.004+0.06*age*age; float s=exp(-pow(q.x/wdt,2.))*step(0.,h)*smoothstep(sm*0.85+0.02,sm*0.85-0.06,h);",
    "  s*=0.7+0.6*fbm(vec2(q.x*30.,p.y*6.-T*0.6)); s*=1.-age*0.6;",
    "  col+=vec3(0.92,0.86,0.8)*s*0.65;",
    "  float em=exp(-length(p-vec2(0.,0.18))*90.)*(0.8+0.2*sin(T*7.)); col+=vec3(1.,0.45,0.15)*em*1.5;",
    "  col*=smoothstep(1.3,0.3,length((uv-0.5)*vec2(asp,1.)));",
    "  gl_FragColor=vec4(col,1.);}"
  ].join("\n");
  I.reg("samadhi", {
    dur: 4.8, still: 4.5,
    init: function (C) { C.L = I.gl(C, FRAG); },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var inh = K.sm(seg(t, 0.1, 1.8)), exh = K.sm(seg(t, 2.2, 4.2)), br = inh * (1 - 0.55 * exh), smoke = K.eo2(seg(t, 1.9, 4.4));
      g.clearRect(0, 0, W, H);
      if (!(C.L && C.L.draw(t, [br, smoke, 0, 0]))) {
        g.fillStyle = "#100807"; g.fillRect(0, 0, W, H);
        var gr = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.min(W, H) * (0.3 + 0.3 * br)); gr.addColorStop(0, "rgba(255,170,110," + 0.5 * br + ")"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = "rgba(235,220,205,.4)"; g.lineWidth = 2; g.beginPath(); var y0 = H * 0.82; g.moveTo(W / 2, y0);
        for (var y = 0; y < H * 0.6 * smoke; y += 6) g.lineTo(W / 2 + Math.sin(y * 0.03 - t) * y * 0.08, y0 - y); g.stroke();
      }
      var wd = seg(t, 0.3, 0.9) * (1 - seg(t, 1.5, 2.0)), fs = Math.min(W * 0.05, 26);
      if (wd > 0) { g.globalAlpha = wd * 0.8; g.fillStyle = "#ffe3c4"; g.font = "400 italic " + fs + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("breathe in", W / 2, H * 0.45 - (wd * 10)); g.globalAlpha = 1; }
      var wo = seg(t, 2.3, 2.8) * (1 - seg(t, 3.2, 3.6));
      if (wo > 0) { g.globalAlpha = wo * 0.7; g.fillStyle = "#ffe3c4"; g.font = "400 italic " + fs + "px " + K.SERIF; g.textAlign = "center"; g.fillText("and let it go", W / 2, H * 0.45 + 10 - wo * 10); g.globalAlpha = 1; }
      // the name gathers out of the smoke: letters drift in from the plume's curl, each from its own offset, blurred to sharp
      var na = seg(t, 3.2, 4.4);
      if (na > 0) { var txt = "TITAN RELIQUARY", big = Math.min(W * 0.075, 46); g.font = "500 " + big + "px " + K.SERIF; g.textAlign = "center"; g.textBaseline = "middle";
        var tw = g.measureText(txt).width, x = W / 2 - tw / 2;
        for (var i = 0; i < txt.length; i++) { var cw = g.measureText(txt[i]).width, a = K.eo3(K.clamp(na * 1.6 - i * 0.04, 0, 1)), ox = (K.hash(i) - 0.5) * 60 * (1 - a), oy = -40 * (1 - a) + Math.sin(i + t) * 3 * (1 - a);
          g.globalAlpha = a; g.fillStyle = "#fff5e8"; g.shadowColor = "rgba(255,200,150,.7)"; g.shadowBlur = 4 + 16 * (1 - a); g.fillText(txt[i], x + cw / 2 + ox, H * 0.3 + oy); x += cw; }
        g.shadowBlur = 0; g.globalAlpha = 1; }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      [[0, 98], [0.9, 146.83], [1.8, 146.83], [2.7, 73.42], [3.6, 98]].forEach(function (n) {   // tanpura: Pa, Sa, Sa, low Sa, cycling (G2 = Pa below D)
        A.tone(n[0], n[1], 2.6, { type: "sawtooth", v: 0.05, lp: 1500, q: 3, a: 0.02 }); A.tone(n[0], n[1] * 2.002, 2.4, { v: 0.02, a: 0.03 }); });
      A.noise(0.1, 1.8, { type: "bandpass", f: 700, to: 1400, q: 0.6, shape: [[1.6, 0.06], [1.8, 0.0001]] });       // inhale
      A.noise(2.2, 2.0, { type: "bandpass", f: 1200, to: 500, q: 0.6, shape: [[0.2, 0.06], [2.0, 0.0001]] });       // exhale
      A.bell(2.3, 880, 3.0, 0.06, [[1, 1], [2.32, 0.35], [4.1, 0.12]]);
    }
  });
})();
