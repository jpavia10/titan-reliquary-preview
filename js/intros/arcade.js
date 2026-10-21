/* Arcade intro (Grok, 2026-10-20). A cabinet powering on: the CRT snaps on from a bright line, attract mode rolls (raster bars,
   the pixel logo drops and bounces), INSERT COIN blinks, a spinning pixel coin falls into the slot, CREDIT 01 and PLAYER 1 START,
   then the screen dissolves block by block into the app. Drawn at true low resolution (a 160 px wide frame buffer) and shown through
   a CRT shader: barrel curve, scanlines, aperture-grille mask, bloom, power-on aperture, block dissolve. 2D fallback: the same
   frame scaled with nearest-neighbour and drawn scanlines. Sound: 8-bit, square and triangle voices like a real board. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var PIX = '700 %px "Press Start 2P", "Courier New", ' + K.MONO;
  var FRAG = [
    "vec2 curve(vec2 uv){uv=uv*2.-1.;vec2 o=abs(uv.yx)/vec2(5.5,4.5);uv=uv+uv*o*o;return uv*.5+.5;}",
    "void main(){",
    "  vec2 uv0=gl_FragCoord.xy/R; vec2 uv=curve(uv0);",
    "  float on=U0.x, dis=U0.y;",
    "  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0.,0.,0.,1.-dis);return;}",
    "  float ab=0.0018+0.004*(1.-on);",
    "  vec3 c=vec3(texture2D(TX,uv+vec2(ab,0)).r,texture2D(TX,uv).g,texture2D(TX,uv-vec2(ab,0)).b);",
    "  vec3 b=vec3(0.); for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){b+=texture2D(TX,uv+vec2(float(i),float(j))*vec2(2.2/R.x,2.2/R.y)*1.6).rgb;}} b/=25.;",
    "  c+=b*0.9;",
    "  float sl=0.62+0.38*sin(uv.y*U0.z*3.14159*2.); c*=sl;",
    "  float m=mod(gl_FragCoord.x,3.); c*=vec3(m<1.?1.15:0.85,m>=1.&&m<2.?1.15:0.85,m>=2.?1.15:0.85);",
    "  float ap=smoothstep(on*0.52+0.002,on*0.52-0.004,abs(uv.y-0.5)); float line=exp(-abs(uv.y-0.5)*260.)*(1.-on)*step(0.02,U0.w);",
    "  c=c*ap+vec3(0.85,0.9,1.)*line*smoothstep(0.5,0.02,abs(uv.x-0.5));",
    "  vec2 vg=uv*(1.-uv.yx); c*=pow(vg.x*vg.y*15.,0.22); c+=vec3(0.02,0.025,0.04)*U0.w;",
    "  float bl=floor(uv.x*U1.x)+floor(uv.y*U1.y)*97.; float hold=step(dis,h21(vec2(bl,3.1)));",
    "  float a=hold; gl_FragColor=vec4(c*a,a);}"
  ].join("\n");

  var F5 = {                                          // a 5x7 bitmap font, as on the boards (rows top to bottom)
    A: "01110 10001 10001 11111 10001 10001 10001", C: "01110 10001 10000 10000 10000 10001 01110", D: "11110 10001 10001 10001 10001 10001 11110",
    E: "11111 10000 10000 11110 10000 10000 11111", H: "10001 10001 10001 11111 10001 10001 10001", I: "01110 00100 00100 00100 00100 00100 01110",
    L: "10000 10000 10000 10000 10000 10000 11111", N: "10001 11001 10101 10011 10001 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110",
    P: "11110 10001 10001 11110 10000 10000 10000", Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
    S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100", U: "10001 10001 10001 10001 10001 10001 01110",
    V: "10001 10001 10001 10001 10001 01010 00100", Y: "10001 10001 01010 00100 00100 00100 00100", "0": "01110 10011 10101 10101 11001 10001 01110",
    "1": "00100 01100 00100 00100 00100 00100 01110", "2": "01110 10001 00001 00110 01000 10000 11111", "6": "00110 01000 10000 11110 10001 10001 01110",
    ",": "00000 00000 00000 00000 00000 00100 01000", "(": "00010 00100 01000 01000 01000 00100 00010", ")": "01000 00100 00010 00010 00010 00100 01000", " ": "00000 00000 00000 00000 00000 00000 00000"
  };
  function bitText(text, sc, color, shade) {
    var n = text.length, c = K.mk(n * 6 * sc + 2, 8 * sc + 2), g = c.getContext("2d");
    for (var i = 0; i < n; i++) { var rows = (F5[text[i]] || F5[" "]).split(" ");
      for (var y = 0; y < 7; y++) for (var x = 0; x < 5; x++) if (rows[y][x] === "1") {
        g.fillStyle = shade && y > 4 ? shade : color; g.fillRect(i * 6 * sc + x * sc, y * sc, sc, sc); } }
    c.tw = n * 6 * sc - sc; return c;
  }
  function coinSprite(g, x, y, r, ph) {                // a spinning coin: the face narrows with cos, edge pixels when side-on
    var w = Math.max(1, Math.round(Math.abs(Math.cos(ph)) * r)), side = Math.cos(ph) < 0;
    g.fillStyle = "#8a5a00"; g.fillRect(x - w - 1, y - r, (w + 1) * 2, r * 2);
    g.fillStyle = side ? "#e0a800" : "#ffd23f";
    for (var j = -r + 1; j < r; j++) { var hw = Math.round(Math.sqrt(1 - (j / r) * (j / r)) * w); g.fillRect(x - hw, y + j, hw * 2, 1); }
    if (w > 3) { g.fillStyle = "#fff6c0"; g.fillRect(x - Math.round(w * 0.5), y - Math.round(r * 0.5), Math.max(1, Math.round(w * 0.3)), 2); g.fillStyle = "#b07800"; g.fillRect(x - 1, y - 2, 2, 5); }
  }
  I.reg("arcade", {
    dur: 4.6, still: 3.1, wipe: true,
    init: function (C) {
      var W = C.W, H = C.H, bw = 160, bh = Math.round(160 * H / W);
      if (bh > 300) { bh = 300; } if (bh < 90) bh = 90;
      C.bw = bw; C.bh = bh; C.buf = K.mk(bw, bh); C.bg = C.buf.getContext("2d"); C.bg.imageSmoothingEnabled = false;
      C.logo1 = bitText("TITAN", 4, "#ffd23f", "#ff8a1f"); C.logo2 = bitText("RELIQUARY", 2, "#40e0d0", "#2a9fd6");
      C.logo1s = bitText("TITAN", 4, "#c0306a"); C.logo2s = bitText("RELIQUARY", 2, "#2a1a6a");
      C.ins = bitText("INSERT COIN", 1, "#ffffff"); C.cred = bitText("CREDIT 01", 1, "#ffd23f");
      C.p1 = bitText("PLAYER 1 START", 1, "#ff5fa2"); C.hi = bitText("HI 1,000,000", 1, "#ff4a4a"); C.cp = bitText("(C) 2026 PAVIA", 1, "#8f87c9");
      C.stars = []; for (var i = 0; i < 60; i++) C.stars.push([C.rnd() * bw, C.rnd() * bh, 0.3 + C.rnd() * 1.4]);
      C.L = I.gl(C, FRAG, { alpha: true, nearest: false, scale: C.small ? 1 : 0.75 });
      C.revealed = false;
    },
    draw: function (C, t) {
      var g = C.bg, bw = C.bw, bh = C.bh, seg = K.seg, i;
      var on = K.eo3(seg(t, 0.05, 0.4)), dis = K.ei2(seg(t, 3.75, 4.5));
      g.fillStyle = "#07051a"; g.fillRect(0, 0, bw, bh);
      if (t > 0.3) {
        // raster bars behind the logo (an attract-mode staple)
        for (i = 0; i < 6; i++) { var by = Math.round(bh * 0.18 + Math.sin(t * 2.6 + i * 0.55) * bh * 0.08 + i * 3); var hue = (i * 50 + t * 120) % 360;
          for (var k = 0; k < 3; k++) { g.fillStyle = "hsl(" + hue + ",90%," + (25 + k * 18) + "%)"; g.fillRect(0, by + k, bw, 1); g.fillRect(0, by + 5 - k, bw, 1); } }
        C.stars.forEach(function (s) { var x = Math.round((s[0] - t * 30 * s[2]) % bw + bw) % bw; g.fillStyle = s[2] > 1.2 ? "#fff" : "#6c63b5"; g.fillRect(x, Math.round(s[1]), 1, 1); });
        var ld = seg(t, 0.45, 1.25), ly = Math.round(K.lerp(-30, bh * 0.2, K.bounce(ld)));
        var lx1 = Math.round((bw - C.logo1.tw) / 2), lx2 = Math.round((bw - C.logo2.tw) / 2);
        g.drawImage(C.logo1s, lx1 + 2, ly + 2); g.drawImage(C.logo1, lx1, ly);
        if (t > 1.1) { var l2 = Math.round(K.lerp(bw, lx2, K.eo3(seg(t, 1.1, 1.45)))); g.drawImage(C.logo2s, l2 + 1, ly + 37); g.drawImage(C.logo2, l2, ly + 36); }
        g.drawImage(C.hi, Math.round((bw - C.hi.tw) / 2), 3);
        g.drawImage(C.cp, Math.round((bw - C.cp.tw) / 2), bh - 10);
      }
      var slotY = Math.round(bh * 0.78), sx = Math.round(bw / 2);
      if (t > 1.45) {                                   // the coin slot and its light
        g.fillStyle = "#2b2357"; g.fillRect(sx - 12, slotY - 5, 24, 12); g.fillStyle = (t > 2.35 ? "#ffd23f" : "#ff4a4a"); g.fillRect(sx - 9, slotY - 2, 18, 6); g.fillStyle = "#000"; g.fillRect(sx - 1, slotY - 1, 2, 4);
        if (t < 2.35 && Math.floor(t * 3.2) % 2 === 0) g.drawImage(C.ins, Math.round((bw - C.ins.tw) / 2), slotY - 16);
        var cf = seg(t, 1.8, 2.35), ci = K.eob(seg(t, 1.45, 1.75), 2);   // a big coin spins in, hangs, then drops into the slot
        if (t < 2.35) { var cy = Math.round(K.lerp(bh * 0.5, slotY, K.ei3(cf))) + Math.round(Math.sin(t * 6) * 2 * (1 - cf)); coinSprite(g, sx, cy, Math.max(2, Math.round((16 * ci) * (1 - cf * 0.75))), t * (9 + cf * 14)); }
        if (t > 2.35) {
          g.drawImage(C.cred, Math.round((bw - C.cred.tw) / 2), slotY + 10);
          if (t > 2.65 && Math.floor(t * 8) % 2 === 0) g.drawImage(C.p1, Math.round((bw - C.p1.tw) / 2), slotY - 16);
          var fl = 1 - seg(t, 2.35, 2.55); if (fl > 0) { g.globalAlpha = fl * 0.7; g.fillStyle = "#fff"; g.fillRect(0, 0, bw, bh); g.globalAlpha = 1; }
        }
      }
      if (dis > 0 && !C.revealed) { C.revealed = true; C.reveal(); }
      var cg = C.g, W = C.W, H = C.H;
      cg.clearRect(0, 0, W, H);
      if (C.L) { C.L.tex(C.buf); if (C.L.draw(t, [on, dis, bh, t > 0.02 ? 1 : 0], [bw / 4, bh / 4, 0, 0])) return; }
      // 2D fallback: nearest-neighbour upscale, drawn scanlines, power-on aperture, block dissolve
      cg.imageSmoothingEnabled = false;
      var ah = H * on; cg.save(); cg.beginPath(); cg.rect(0, (H - ah) / 2, W, Math.max(2, ah)); cg.clip();
      cg.drawImage(C.buf, 0, 0, W, H); cg.fillStyle = "rgba(0,0,0,.28)"; var sp = H / bh; for (var y = 0; y < H; y += sp) cg.fillRect(0, y + sp * 0.6, W, sp * 0.4);
      cg.restore();
      if (dis > 0) { var nx = 40, ny = Math.round(40 * H / W), cw = W / nx, ch = H / ny;
        for (var bx = 0; bx < nx; bx++) for (var byy = 0; byy < ny; byy++) if (K.hash(bx * 131 + byy * 7) < dis) cg.clearRect(bx * cw, byy * ch, cw + 1, ch + 1); }
      cg.imageSmoothingEnabled = true;
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.tone(0.05, 55, 0.5, { type: "sawtooth", v: 0.16, lp: 300 });           // power-on thump + degauss
      A.noise(0.05, 0.35, { type: "lowpass", f: 400, v: 0.25 });
      [0.55, 0.7, 0.85, 1.0].forEach(function (s, i) { A.tone(s, 880 - i * 160, 0.07, { type: "square", v: 0.06 }); });   // logo bounces
      A.tone(1.12, 220, 0.25, { type: "triangle", v: 0.12, to: 880 });          // swoosh-in of the second line
      for (var i = 0; i < 3; i++) A.tone(1.55 + i * 0.31, 1046, 0.05, { type: "square", v: 0.03 });   // insert coin blink ticks
      A.tone(1.75, 1400, 0.55, { type: "square", v: 0.05, to: 300 });          // the coin falls
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { A.tone(2.36 + i * 0.065, f, 0.16, { type: "square", v: 0.07 }); });   // credit!
      [[2.7, 392], [2.82, 523.25], [2.94, 659.25], [3.06, 783.99], [3.18, 1046.5]].forEach(function (n) { A.tone(n[0], n[1], 0.22, { type: "triangle", v: 0.13 }); A.tone(n[0], n[1] / 2, 0.22, { type: "square", v: 0.03 }); });
      A.noise(3.75, 0.7, { type: "bandpass", f: 3000, to: 300, q: 2, v: 0.07 });   // dissolve
    }
  });
})();
