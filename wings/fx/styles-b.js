/* TitanFX style presets (notes/agents/styles-20.md, section 1): style-ascii, style-splitflap, style-kinetic, style-pixel
   (The Construct, Grand Terminal, Bauhaus, Arcade). Loads after wings/fx/presets.js.
   All four draw their glyphs, flaps, letters and sprites into the engine's per-layer canvas (def.canvas -> uTex, texture unit 2)
   and shade it on the GPU: placement, glow, scrolling and the text-safe mask happen in the fragment pass. Premultiplied output:
   alpha 0 adds light on the dark themes; Bauhaus (light) paints ink with alpha. */
(function () {
  "use strict";
  var FX = window.TitanFX;
  if (!FX || !FX.register) return;

  var H = [
    "uniform sampler2D uTex; uniform vec2 uTexRes;",
    "vec2 P(vec2 fc){ return (fc-.5*uRes)/uRes.y - uPar; }",
    "float asp(){ return uRes.x/uRes.y; }",
    // sample the canvas inside a rect (centre C, half size S in screen-height units); canvas y runs down
    "vec4 texRect(vec2 p, vec2 C, vec2 S){ vec2 q = (p-C)/S; if (abs(q.x) > 1. || abs(q.y) > 1.) return vec4(0.); return texture(uTex, vec2(q.x*.5+.5, .5-q.y*.5)); }"
  ].join("\n") + "\n";

  /* the collection's countries and counts, read once (Grand Terminal's board); falls back to a fixed list offline */
  var countries = null, cWant = false;
  function loadCountries() {
    if (countries || cWant) return countries;
    cWant = true;
    try {
      fetch("data/index.json").then(function (r) { return r.json(); }).then(function (d) {
        var n = {};
        (d.flips || []).forEach(function (f) {
          var c = String(f.country || "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
          if (c) n[c] = (n[c] || 0) + 1;
        });
        var l = Object.keys(n).map(function (k) { return [k, n[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
        if (l.length) countries = l;
      }).catch(function () { /* offline: fallback list */ });
    } catch (e) { /* ignore */ }
    return countries;
  }
  var FALLBACK = [["UNITED STATES", 60], ["SWITZERLAND", 24], ["GERMANY", 22], ["FRANCE", 20], ["MEXICO", 18], ["UNITED KINGDOM", 16],
                  ["NETHERLANDS", 10], ["ITALY", 9], ["CANADA", 8], ["AUSTRALIA", 8], ["JAPAN", 6], ["SPAIN", 5]];

  /* =====================================================================================================================
     1. style-ascii · The Construct. A real coin from the collection rendered as green phosphor ASCII art (luminance ramp
        " .:-=+*#%@" over a 72x72 cell grid) that keeps re-quantising under a slow scan line, framed by sparse falling glyph columns
        drawn procedurally in the shader (5x7 hashed glyph cells) and a faint CRT bloom. Sits right of centre on wide screens and in
        the upper band on phones. Also answers fix list #23: the effect stays dim behind text (safe mask + low gain).
     ===================================================================================================================== */
  var RAMP = " .:-=+*#%@";
  function asciiCanvas(c, w, h, t, info) {
    var N = 72, cell = w / N;
    var img = info.coin;
    if (!c.__lum || (img && c.__src !== img.src)) {
      var lum = new Float32Array(N * N), off = document.createElement("canvas"); off.width = N; off.height = N;
      var o = off.getContext("2d");
      if (img) {
        o.drawImage(img, 0, 0, N, N);
        var d = o.getImageData(0, 0, N, N).data;
        for (var i = 0; i < N * N; i++) { var a = d[i * 4 + 3] / 255; lum[i] = a * (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255; }
        c.__src = img.src;
      } else {
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {        // procedural coin: rim, field and a central bust shape
          var dx = (x - N / 2 + 0.5) / (N / 2), dy = (y - N / 2 + 0.5) / (N / 2), r = Math.sqrt(dx * dx + dy * dy);
          var v = r > 1 ? 0 : r > 0.86 ? 0.85 : 0.35 + 0.4 * Math.exp(-((dx + 0.1) * (dx + 0.1) + (dy + 0.05) * (dy + 0.05)) * 6);
          lum[y * N + x] = v;
        }
        c.__src = "proc";
      }
      c.__lum = lum; c.__frame = -1;
    }
    var fr = Math.floor(t * 3);
    if (fr === c.__frame) return false;
    c.__frame = fr;
    c.clearRect(0, 0, w, h);
    c.font = "700 " + Math.round(cell * 1.15) + "px ui-monospace, Menlo, Consolas, monospace";
    c.textAlign = "center"; c.textBaseline = "middle";
    var scan = (t * 0.12) % 1;
    for (var yy = 0; yy < N; yy++) {
      var near = Math.abs(yy / N - scan) < 0.03;
      for (var xx = 0; xx < N; xx++) {
        var l = c.__lum[yy * N + xx];
        if (l < 0.04) continue;
        var jit = near ? (Math.sin(xx * 12.9898 + fr * 7.1) * 0.5 + 0.5) * 0.35 : 0;
        var k = Math.min(RAMP.length - 1, Math.max(1, Math.floor((l + jit) * (RAMP.length - 1) + 0.5)));
        var g = 140 + Math.floor(115 * l);
        c.fillStyle = near ? "rgb(220,255,230)" : "rgb(" + Math.floor(g * 0.25) + "," + g + "," + Math.floor(g * 0.45) + ")";
        c.fillText(RAMP[k], (xx + 0.5) * cell, (yy + 0.5) * cell);
      }
    }
    return true;
  }
  FX.register("style-ascii", {
    layer: "front", still: 9, safe: 0.97, gain: 0.85,
    canvas: { w: 512, h: 512, fps: 3, draw: asciiCanvas },
    moments: [{ name: "rescan", every: [30, 70], dur: 3 }],
    glsl: H + [
      "float glyph(vec2 cid, vec2 sub, float seed){ vec2 s = floor(sub*vec2(5.,7.)); float on = step(.55, h21(cid*3.17+s*1.31+seed)); vec2 f = fract(sub*vec2(5.,7.)); return on*step(.12,f.x)*step(f.x,.88)*step(.1,f.y)*step(f.y,.9); }",
      "vec4 ascii(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float t = uTime; float I = clamp(uInt,0.,1.3);",
      "  vec2 C = a > .9 ? vec2(a*.5-.42, .02) : vec2(0., .22); float S = a > .9 ? .42 : min(.42, a*.46);",
      "  vec4 tx = texRect(p, C, vec2(S));",
      "  vec3 c = tx.rgb*tx.a*.55;",
      // falling glyph columns (procedural), in the outer margins
      "  float cs = 14.*uScale/uRes.y; vec2 g = p/cs; vec2 cid = floor(g); vec2 sub = fract(g);",
      "  float col = cid.x; float speed = 3. + 6.*h11(col*7.3); float head = fract(-t*speed*cs*.9 + h11(col*1.9))*(1.4)-.7;",
      "  float y = cid.y*cs; float tail = clamp(1.-(y-head)/.45, 0., 1.)*step(head, y);",
      "  float margin = smoothstep(.15, .4, abs(p.x)/max(.3, a*.5));",
      "  float on = step(.72, h11(col*3.7)) * tail * margin;",
      "  float gl = on > 0.01 ? glyph(cid, sub, floor(t*8.+h11(cid.y)*8.)) : 0.;",
      "  float headGlow = on*exp(-pow((y-head)/cs, 2.)*.5);",
      "  c += vec3(.2,1.,.45)*gl*on*.22 + vec3(.75,1.,.82)*gl*headGlow*.35;",
      "  float k = mK(); if (k >= 0.) { float band = exp(-pow((p.y - mix(.6, -.6, k))*12., 2.)); c += vec3(.4,1.,.6)*band*.12; }",
      "  float vig = .9 + .1*sin(fc.y*3.14159);",
      "  return vec4(c*vig*I, 0.);",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return ascii(fc); }" }]
  });

  /* =====================================================================================================================
     2. style-splitflap · Grand Terminal. A departures board high on the wall: rows of split-flap cells that flip letter by letter
        to the collection's countries and how many coins came from each ("MEXICO  18  BOARDING"), drawn in the canvas with the real
        mechanics (the top half folds down over a seam, intermediate letters rattle past), amber on board black. A new page of
        destinations every ~9 s; the moment refreshes the whole board at once.
     ===================================================================================================================== */
  var FL_COLS = 22, FL_ROWS = 6, FL_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var STATUS = ["ON TIME", "BOARDING", "DEPARTED", "ON TIME", "ARRIVED", "ON TIME"];
  function pad(s, n) { s = String(s).slice(0, n); while (s.length < n) s += " "; return s; }
  function boardPage(page) {
    var l = loadCountries() || FALLBACK, rows = [];
    for (var r = 0; r < FL_ROWS; r++) {
      var it = l[(page * FL_ROWS + r) % l.length];
      var name = pad(it[0], 13), n = String(it[1]); while (n.length < 3) n = " " + n;
      rows.push(pad(name + n + " " + STATUS[(page + r) % STATUS.length], FL_COLS));
    }
    return rows;
  }
  function flapCanvas(c, w, h, t) {
    var page = Math.floor(t / 9), st = c.__st;
    if (!st) { st = c.__st = { page: -1, cur: [], want: [], start: [] }; for (var i = 0; i < FL_ROWS * FL_COLS; i++) { st.cur.push(" "); st.want.push(" "); st.start.push(0); } }
    if (page !== st.page) {
      st.page = page; var rows = boardPage(page);
      for (var r = 0; r < FL_ROWS; r++) for (var q = 0; q < FL_COLS; q++) { var k = r * FL_COLS + q; st.want[k] = rows[r][q] || " "; st.start[k] = t + r * 0.12 + q * 0.035; }
    }
    var moving = false;
    var cw = w / FL_COLS, rh = (h - 30) / FL_ROWS;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(255,196,61,.9)"; c.font = "700 20px 'Helvetica Neue', Arial, sans-serif"; c.textBaseline = "middle"; c.textAlign = "left";
    c.fillText("DEPARTURES", 8, 14);
    c.textAlign = "center"; c.font = "700 " + Math.round(rh * 0.62) + "px 'Helvetica Neue', Arial, sans-serif";
    for (var rr = 0; rr < FL_ROWS; rr++) {
      for (var qq = 0; qq < FL_COLS; qq++) {
        var kk = rr * FL_COLS + qq, x = qq * cw, y = 30 + rr * rh;
        var cur = st.cur[kk], want = st.want[kk], ch = cur, fold = 0;
        if (cur !== want && t >= st.start[kk]) {
          moving = true;
          var steps = Math.floor((t - st.start[kk]) / 0.07), ci = FL_CHARS.indexOf(cur), wi = FL_CHARS.indexOf(want);
          if (ci < 0) ci = 0; if (wi < 0) wi = 0;
          var dist = (wi - ci + FL_CHARS.length) % FL_CHARS.length;
          if (steps >= Math.min(dist, 7)) { st.cur[kk] = want; ch = want; }
          else { ch = FL_CHARS[(ci + steps + 1) % FL_CHARS.length]; fold = ((t - st.start[kk]) / 0.07) % 1; }
        } else if (cur !== want) moving = true;
        c.fillStyle = "#1c2026"; c.fillRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
        c.fillStyle = "#ffc43d"; c.fillText(ch, x + cw / 2, y + rh / 2 + 1);
        c.fillStyle = "rgba(0,0,0,.75)"; c.fillRect(x + 1.5, y + rh / 2 - 0.75, cw - 3, 1.5);
        if (fold > 0) { c.fillStyle = "rgba(10,12,15," + (0.65 * (1 - fold)).toFixed(3) + ")"; c.fillRect(x + 1.5, y + 1.5, cw - 3, (rh / 2 - 2) * (1 - fold)); }
      }
    }
    return moving || !c.__drawn ? (c.__drawn = 1, true) : false;
  }
  FX.register("style-splitflap", {
    layer: "front", still: 4, safe: 0.97,
    canvas: { w: 704, h: 246, fps: 12, draw: flapCanvas },
    glsl: H + [
      "vec4 flap(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3);",
      "  float W = min(a*.94, 1.7); vec2 S = vec2(W*.5, W*.5*246./704.); vec2 C = vec2(0., .5 - S.y - .07);",
      "  vec4 tx = texRect(p, C, S);",
      "  vec2 q = (p-C)/S; float frame = (abs(q.x) < 1.02 && abs(q.y) < 1.04) ? 1. : 0.;",
      "  float glow = exp(-pow(max(0., abs(q.y)-1.)*14., 2.))*exp(-pow(max(0., abs(q.x)-1.)*14., 2.))*.06;",
      "  vec3 c = tx.rgb*tx.a*.62 + vec3(1.,.77,.24)*glow;",
      "  return vec4(c*I, tx.a*.25*I*frame);",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return flap(fc); }" }]
  });

  /* =====================================================================================================================
     3. style-kinetic · Bauhaus (light). The coin legends in huge type, set once into four canvas strips (solid and outline
        versions) and slid by the shader in bands at different speeds and directions, switching between solid and outline every
        few seconds, red / blue / black ink at poster-texture strength (darken only, never light).
     ===================================================================================================================== */
  var LEG = ["E PLURIBUS UNUM · ", "LIBERTY · IN GOD WE TRUST · ", "CONFOEDERATIO HELVETICA · ", "REPUBLIQUE FRANCAISE · "];
  function kineticCanvas(c, w, h) {
    if (c.__done) return false;
    c.clearRect(0, 0, w, h);
    var bh = h / 8;
    c.textBaseline = "middle"; c.textAlign = "left";
    for (var i = 0; i < 4; i++) {
      var fs = Math.round(bh * 0.86);
      c.font = "900 " + fs + "px Futura, 'Century Gothic', 'Avenir Next', 'Trebuchet MS', sans-serif";
      var s = LEG[i], tw = c.measureText(s).width, x = 0;
      while (x < w) {                                                   // solid strip
        c.fillStyle = "#000"; c.fillText(s, x, bh * (2 * i) + bh / 2); x += tw;
      }
      x = 0; c.lineWidth = Math.max(2, fs * 0.05); c.strokeStyle = "#000";
      while (x < w) { c.strokeText(s, x, bh * (2 * i + 1) + bh / 2); x += tw; }   // outline strip
    }
    c.__done = 1;
    return true;
  }
  FX.register("style-kinetic", {
    layer: "front", still: 2, safe: 0.98,
    canvas: { w: 1024, h: 512, fps: 1, draw: kineticCanvas },
    glsl: H + [
      "vec4 kin(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float t = uTime; float I = clamp(uInt,0.,1.3);",
      "  vec3 col[4]; col[0] = vec3(.07); col[1] = vec3(.71,.14,.09); col[2] = vec3(.11,.31,.63); col[3] = vec3(.07);",
      "  float ys[4]; ys[0] = .36; ys[1] = .1; ys[2] = -.16; ys[3] = -.4;",
      "  vec3 c = vec3(0.); float al = 0.;",
      "  for (int i=0;i<4;i++){",
      "    float fi = float(i); float bh = .12 + .03*mod(fi,2.);",
      "    float v = (p.y - ys[i])/bh; if (abs(v) > .5) continue;",
      "    float dir = mod(fi,2.) < .5 ? 1. : -1.; float sp = (.018 + .01*fi)*dir;",
      "    float u = fract((p.x/(bh*8.)) + t*sp + fi*.37);",
      "    float sw = step(.5, fract(t/7. + fi*.25));",                  // solid <-> outline every few seconds
      "    float row = (2.*fi + sw);",
      "    vec2 uv = vec2(u, (row + (.5 - v))/8.);",
      "    float m = texture(uTex, uv).a;",
      "    float k = .085*m; c = mix(c, col[i], k/(max(al+k, .0001))); al = max(al, k);",
      "  }",
      "  return vec4(c*al, al)*I;",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return kin(fc); }" }]
  });

  /* =====================================================================================================================
     4. style-pixel · Arcade. A 240 x 135 pixel scene drawn crisp (nearest sampling): a parallax pixel skyline with lit windows
        along the bottom, twinkling pixel stars, spinning pixel coins bouncing on the rooftops, a blinking INSERT COIN in a
        3x5 pixel font, and the moment: a shower of coins and a 1UP. Coin yellow, teal and pink on purple-black.
     ===================================================================================================================== */
  var FONT = { I: [7, 2, 2, 2, 7], N: [5, 7, 7, 7, 5], S: [6, 4, 2, 1, 6], E: [7, 4, 6, 4, 7], R: [6, 5, 6, 5, 5], T: [7, 2, 2, 2, 2],
               C: [3, 4, 4, 4, 3], O: [2, 5, 5, 5, 2], U: [5, 5, 5, 5, 7], P: [6, 5, 6, 4, 4], "1": [2, 6, 2, 2, 7], " ": [0, 0, 0, 0, 0] };
  function ptext(c, s, x, y, k) { for (var i = 0; i < s.length; i++) { var g = FONT[s[i]] || FONT[" "]; for (var r = 0; r < 5; r++) for (var b = 0; b < 3; b++) if (g[r] & (4 >> b)) c.fillRect(x + (i * 4 + b) * k, y + r * k, k, k); } }
  var COIN = ["..####..", ".#ffff#.", "#ff##ff#", "#f#ff#f#", "#f#ff#f#", "#ff##ff#", ".#ffff#.", "..####.."];
  function pcoin(c, x, y, ph) {
    var wv = Math.abs(Math.cos(ph)), cw = Math.max(1, Math.round(8 * wv)), ox = Math.round((8 - cw) / 2);
    for (var r = 0; r < 8; r++) for (var q = 0; q < cw; q++) {
      var src = COIN[r][Math.min(7, Math.floor(q / cw * 8))];
      if (src === ".") continue;
      c.fillStyle = src === "#" ? "#b8860b" : (wv < 0.4 ? "#ffe99a" : "#ffd23f"); c.fillRect(x + ox + q, y + r, 1, 1);
    }
  }
  function pixelCanvas(c, w, h, t) {
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, w, h);
    var i, s;
    for (i = 0; i < 46; i++) {                                     // stars
      var sx = (i * 53.7) % w, sy = (i * 29.3) % (h * 0.55), tw = Math.sin(t * (1.5 + (i % 5) * 0.4) + i) > 0.55;
      c.fillStyle = tw ? "#ffffff" : "#6b5fb0"; c.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
      if (tw && i % 7 === 0) { c.fillRect(Math.floor(sx) - 1, Math.floor(sy), 3, 1); c.fillRect(Math.floor(sx), Math.floor(sy) - 1, 1, 3); }
    }
    var layers = [[0.12, "#1a1446", 0.6], [0.25, "#241b5c", 0.8]];   // two skyline layers, parallax
    for (var L = 0; L < 2; L++) {
      var sp = layers[L][0], col = layers[L][1], hk = layers[L][2], off = Math.floor(t * 6 * sp) % 40;
      for (var bx = -40; bx < w + 40; bx += 10) {
        var seed = Math.floor((bx + off * 0) / 10) + L * 31 + Math.floor(t * 6 * sp / 40) * 0, bh = 14 + ((seed * 37 + L * 11) % 23) * hk;
        var X = bx - off;
        c.fillStyle = col; c.fillRect(X, h - bh, 10, bh);
        if (L === 1) for (var wy = h - bh + 3; wy < h - 2; wy += 4) for (var wx = 2; wx < 9; wx += 3) {
          if (((seed * 7 + wy * 3 + wx) % 5) === 0) { c.fillStyle = ((Math.floor(t * 0.5) + seed + wy) % 9 === 0) ? "#ff6bd6" : "#ffd23f"; c.fillRect(X + wx, wy, 1, 1); }
        }
      }
    }
    for (i = 0; i < 4; i++) {                                       // bouncing coins
      var cx = Math.floor(30 + i * 52 + Math.sin(t * 0.3 + i) * 8), bounce = Math.abs(Math.sin(t * 2.2 + i * 1.3)), cy = Math.floor(h - 44 - bounce * 22 - i * 3);
      pcoin(c, cx, cy, t * 3 + i);
    }
    c.fillStyle = "#40e0d0";
    if (Math.floor(t * 1.6) % 2 === 0) ptext(c, "INSERT COIN", w - 46 * 1 - 4, 6, 1);
    var mo = c.__mo || 0;
    if (t - mo < 0) mo = 0;
    if (Math.floor(t / 37) !== c.__mk) { c.__mk = Math.floor(t / 37); c.__mo = t; mo = t; }
    var k = (t - mo) / 3;
    if (k >= 0 && k < 1) {                                          // the moment: coin shower + 1UP
      for (i = 0; i < 14; i++) { var rx = (i * 41 + 13) % w, ry = Math.floor(-10 + k * (h + 20) * (0.6 + (i % 4) * 0.15)); pcoin(c, rx, ry, t * 5 + i); }
      c.fillStyle = "#ff6bd6"; ptext(c, "1UP", Math.floor(w / 2 - 6), Math.floor(h * 0.3 - k * 12), 2);
    }
    return true;
  }
  FX.register("style-pixel", {
    layer: "front", still: 5, safe: 0.97,
    canvas: { w: 240, h: 135, fps: 10, nearest: true, draw: pixelCanvas },
    glsl: H + [
      "vec4 pix(vec2 fc){",
      "  vec2 p = P(fc); float a = asp(); float I = clamp(uInt,0.,1.3);",
      "  float W = a*.5; float Hh = W*135./240.; vec2 C = vec2(0., -.5 + Hh);",
      "  if (Hh > .5) { Hh = .5; W = Hh*240./135.; C = vec2(0., 0.); }",
      "  vec4 tx = texRect(p, C, vec2(W, Hh));",
      "  float scan = .85 + .15*step(.5, fract(fc.y/3.));",
      "  vec3 c = tx.rgb*tx.a*scan*.75;",
      "  return vec4(c*I, tx.a*.18*I);",
      "}"
    ].join("\n") + "\n",
    passes: [{ frag: "vec4 fx(vec2 fc){ return pix(fc); }" }]
  });
})();
