/* Ferrofluid intro v2 (Grok, 2026-10-20): three GPU moments. 1 THE DROP: a black drop falls in slow motion into a mirror pool
   under a studio softbox, throws a crown and a rebound jet, and rings the surface out. 2 THE FIELD: low across the pool, a hidden
   magnet sweeps beneath and a wave of Rosensweig spikes (hex lattice heightfield) stands up and follows it. 3 THE NAME: from above,
   the field takes the shape of the name and the spikes rise and sharpen into TITAN RELIQUARY; a light sweeps across. HDR, bloom,
   ACES. OLDF below is the Lite / no-GPU fallback. Older notes: Ferrofluid intro (Grok, theme #37, 2026-10-20). One black drop falls into a mirror pool and rings it out; then a hidden magnet,
   shaped like the name, sweeps beneath the surface from left to right and the fluid stands up into a field of Rosensweig spikes
   that spell TITAN RELIQUARY, glinting under a studio softbox, before the spikes sharpen once more and hold. The magnet's field is
   the name itself, rendered to a blurred texture and sampled as the field strength in a raymarched heightfield (WebGL2 assumed;
   2D path: the name in glossy black with rim light). Sound: drop plip, sub ring, magnetic swell and a crackle as spikes rise. */
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = [
    "float fld(vec2 q){ vec2 uv=vec2(q.x/U1.x*.5+.5, (q.y-U1.y)/U1.z); if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; float f=texture2D(TX,uv).r; return f*smoothstep(uv.x-.08,uv.x,U0.y*1.2-.1); }",
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
    "    col=env(r)*(.45+fr)+vec3(.15,.8,1.)*pow(1.-max(dot(n,vec3(0.,1.,0.)),0.),2.)*.13;",
    "    vec3 L1=normalize(vec3(cos(T*.7),.32,sin(T*.7))), L2=normalize(vec3(-.6,.5,-.4)); float rim=1.-n.y;",
    "    col+=vec3(1.,.96,.9)*pow(max(dot(r,L1),0.),40.)*9.*rim+vec3(.5,.9,1.)*pow(max(dot(r,L2),0.),18.)*4.*rim*exp(-max(t-1.4,0.)*.5); }",
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

  /* v2: a million iron filings (one WebGL2 point each, positions a pure function of t and gl_VertexID, so frames can drop and
     ?splashhold seeks stay exact). Act 1 (0-1.4 s): filings lie scattered on the plate; a bar magnet slides beneath left to right and
     they rotate onto its dipole field lines and creep toward the poles. Act 2 (1.3-2.5 s): they lift and stream along curling paths
     into the letters of the name (rejection-sampled on the GPU against a mask of the name), standing up as they land.
     Act 3 (2.2-3.2 s): the liquid rises through them in the same letters and the filings melt into it. Lit by a light that orbits. */
  var PVS = [
    "#version 300 es", "precision highp float;",
    "uniform float T, ASP, HW, DZ, MSZ, AK; uniform sampler2D M; out float vA, vAng, vG;",
    "float h(float n){ uint x = floatBitsToUint(n)*747796405u+2891336453u; x = ((x >> ((x >> 28u)+4u)) ^ x)*277803737u; x = (x >> 22u) ^ x; return float(x)/4294967295.; }",
    "float sg(float t,float a,float b){ return clamp((t-a)/(b-a),0.,1.); }",
    "float eio(float x){ return x<.5?4.*x*x*x:1.-pow(-2.*x+2.,3.)/2.; }",
    "float mask(vec2 p){ vec2 uv = vec2(p.x/HW*.5+.5, p.y/DZ+.5); if (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return 0.; return texture(M, uv).r; }",
    "void main(){ float id = float(gl_VertexID); float a = h(id*.0137+.11), b = h(id*.0191+.73), c = h(id*.0071+.37), d = h(id*.0113+.59);",
    "  vec2 s = vec2((a-.5)*ASP*1.08, (b-.5)*1.08);",
    "  float mx = mix(-ASP*.28, ASP*.28, eio(sg(T,.1,1.4))); float pl = .1+.12*min(ASP,2.); vec2 N = vec2(mx-pl,0.), S = vec2(mx+pl,0.);",
    "  vec2 dn = s-N, ds = s-S; vec2 B = dn/pow(dot(dn,dn)+.002,1.5) - ds/pow(dot(ds,ds)+.002,1.5); float Bm = length(B);",
    "  float al = smoothstep(.15,5.,Bm); float ang0 = c*6.2832; float angB = atan(B.y,B.x);",
    "  float psi = atan(dn.y,dn.x)-atan(ds.y,ds.x); psi = mod(psi+3.1416,6.2832)-3.1416;",
    "  float e = .002; vec2 sx = s+vec2(e,0.), sy = s+vec2(0.,e);",
    "  float px_ = mod(atan((sx-N).y,(sx-N).x)-atan((sx-S).y,(sx-S).x)+3.1416,6.2832)-3.1416, py_ = mod(atan((sy-N).y,(sy-N).x)-atan((sy-S).y,(sy-S).x)+3.1416,6.2832)-3.1416;",
    "  vec2 gp = vec2(px_-psi, py_-psi)/e; float L = 22.; float tgt = (floor(psi*L/6.2832)+.5)*6.2832/L;",
    "  float pull = al*smoothstep(.0,.5,sg(T,.15,1.5))*(1.-sg(T,1.35,1.7));",
    "  vec2 pa = s + gp/max(dot(gp,gp),1e-3)*(tgt-psi)*pull*.9;",
    "  vec2 toM = vec2(mx,0.)-pa; pa += normalize(toM+1e-5)*min(length(toM)*.25,.01*al)*pull;",
    "  float ang = mix(ang0, angB, al*sg(T,.1,.6));",
    // act 2: a target inside the name (8 tries); filings with no target stay on the plate as the field's halo
    "  vec2 tg = vec2(0.); float has = 0.;",
    "  for (int i=0;i<8;i++){ float fi = float(i); vec2 q = vec2((h(id*.031+fi*7.1)-.5)*2.*HW, (h(id*.047+fi*3.3)-.5)*DZ); if (has<.5 && mask(q)>.5){ tg = q; has = 1.; } }",
    "  float k = has*eio(sg(T, 1.3+d*.5, 2.15+d*.35));",
    "  vec2 perp = vec2(-(tg-pa).y,(tg-pa).x); vec2 pos = mix(pa,tg,k) + perp*sin(k*3.1416)*(.35+.4*c)*(b-.5);",
    "  pos.y += sin(k*3.1416)*.06;",
    "  float gx = mask(tg+vec2(.004,0.))-mask(tg-vec2(.004,0.)), gy = mask(tg+vec2(0.,.004))-mask(tg-vec2(0.,.004));",
    "  ang = mix(ang, atan(gy,gx)+(d-.5)*.8, k);",
    "  float melt = sg(T, 2.25+a*.4, 3.0+a*.3);",
    "  float lit = T*1.6; vG = pow(abs(cos(ang-lit)),28.)*(.6+1.4*k)*(1.-melt);",
    "  vA = smoothstep(0.,.35,T)*(1.-melt)*(has>.5 ? 1. : 1.-.65*sg(T,1.6,2.6));",
    "  vAng = ang; gl_Position = vec4(pos.x/(ASP*.5), pos.y/.5, 0., 1.);",
    "  gl_PointSize = MSZ*(1.+.6*k*(1.-melt)); }"
  ].join("\n");
  var PFS = [
    "#version 300 es", "precision highp float;", "uniform float AK; in float vA, vAng, vG; out vec4 o;",
    "void main(){ vec2 q = gl_PointCoord*2.-1.; float cs = cos(vAng), sn = sin(vAng); q = mat2(cs,sn,-sn,cs)*q;",
    "  float n = smoothstep(.32,.05,abs(q.y))*smoothstep(1.,.55,abs(q.x)); if (n*vA < .01) discard;",
    "  vec3 steel = vec3(.06,.065,.075)+vec3(.35,.4,.45)*(q.y*.5+.5)*.4; vec3 col = steel + vec3(1.,.97,.92)*vG*2.2;",
    "  float al = n*vA*(.35+.5*vG)*AK; o = vec4(col*al, al); }"
  ].join("\n");
  function filings(C) {
    if (C.lite) return null;
    var cv = document.createElement("canvas"); cv.className = "ts-mo ts-mogl"; cv.setAttribute("aria-hidden", "true");
    var x = null; try { x = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: "high-performance" }); } catch (e) { x = null; }
    if (!x) return null;
    function sh(t, src) { var o = x.createShader(t); x.shaderSource(o, src); x.compileShader(o); if (!x.getShaderParameter(o, x.COMPILE_STATUS)) { if (window.console) console.warn("ferro filings", x.getShaderInfoLog(o)); return null; } return o; }
    var v = sh(x.VERTEX_SHADER, PVS), f = sh(x.FRAGMENT_SHADER, PFS); if (!v || !f) return null;
    var pr = x.createProgram(); x.attachShader(pr, v); x.attachShader(pr, f); x.linkProgram(pr); if (!x.getProgramParameter(pr, x.LINK_STATUS)) return null;
    var u = {}; ["T", "ASP", "HW", "DZ", "MSZ", "M", "AK"].forEach(function (n) { u[n] = x.getUniformLocation(pr, n); });
    var tx = x.createTexture(); x.bindTexture(x.TEXTURE_2D, tx); x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, true);
    x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, x.RGBA, x.UNSIGNED_BYTE, maskTex(C));
    x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, x.LINEAR); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, x.LINEAR);
    x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_S, x.CLAMP_TO_EDGE); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_T, x.CLAMP_TO_EDGE);
    var vao = x.createVertexArray(); x.bindVertexArray(vao);
    var big = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1) >= 2500;
    var N = Math.min(4194304, I.count(C, big ? 2097152 : 1048576));                 // a million filings on a phone; two million on a big screen
    var m = /[?&]fxkscale=([0-9.]+)/.exec(location.search); if (m) N = Math.round(N * +m[1]);
    C.root.insertBefore(cv, C.cv);
    return { cv: cv, draw: function (t, hw, dz) {
      var d = I.res(C, 1), w = Math.round(C.W * d), hh = Math.round(C.H * d); if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      x.viewport(0, 0, w, hh); x.clearColor(0, 0, 0, 0); x.clear(x.COLOR_BUFFER_BIT); if (t > 3.4) return;
      x.useProgram(pr); x.enable(x.BLEND); x.blendFunc(x.ONE, x.ONE_MINUS_SRC_ALPHA);
      x.uniform1f(u.T, t); x.uniform1f(u.ASP, C.W / C.H); x.uniform1f(u.HW, hw); x.uniform1f(u.DZ, dz); x.uniform1f(u.AK, Math.max(.4, Math.min(1, Math.sqrt(262144 / N)))); x.uniform1f(u.MSZ, Math.max(2, 2.2 * d * Math.min(1.6, C.H / 700)));
      x.activeTexture(x.TEXTURE0); x.bindTexture(x.TEXTURE_2D, tx); x.uniform1i(u.M, 0); x.bindVertexArray(vao); x.drawArrays(x.POINTS, 0, N);
    }, free: function () { try { var e = x.getExtension("WEBGL_lose_context"); if (e) e.loseContext(); } catch (er) { /* ignore */ } cv.width = 1; cv.height = 1; if (cv.parentNode) cv.parentNode.removeChild(cv); } };
  }
  function maskTex(C) {                          // the same layout as the field texture, unblurred: where the filings land
    var st = C.W / C.H < 1.2, c = st ? K.mk(768, 768) : K.mk(1536, 300), g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    if (st) { g.font = "900 230px " + K.GEO; g.fillText("TITAN", 384, 250); g.font = "900 128px " + K.GEO; g.fillText("RELIQUARY", 384, 520); }
    else { g.font = "900 170px " + K.GEO; g.fillText("TITAN RELIQUARY", 768, 158); }
    return c;
  }
  var OLDF = {
    dur: 4.6, still: 4.1,
    init: function (C) { C.L = I.gl(C, FRAG); if (C.L) { C.ntex = nameTex(C); C.L.tex(C.ntex); } C.P = filings(C); },
    dispose: function (C) { if (C.P) { C.P.free(); C.P = null; } },
    draw: function (C, t) {
      var g = C.g, W = C.W, H = C.H, seg = K.seg;
      var dy = -2;
      var ring = 0, sweep = K.eio(seg(t, 2.05, 3.05)), crackle = seg(t, 2.1, 3.2) > 0 && t < 3.2 ? 1 : 0.15;
      var hw = Math.min(W / H * 0.5 * 0.88, 1.9), dz = hw * 2 / (C.texAsp || 4), sharp = (34 + 5 * K.eob(seg(t, 3.3, 3.7), 2)) / dz;   // the name spans the screen, ultrawide included; ~34 spikes per name height
      g.clearRect(0, 0, W, H);
      if (C.P) C.P.draw(t, hw, dz);
      if (C.L && C.L.draw(t, [ring, sweep, crackle, sharp], [hw, 1.0, dz, dy])) return;
      g.fillStyle = "#030406"; g.fillRect(0, 0, W, H);
      var fs = Math.min(W * 0.11, 90), a = sweep;
      g.save(); g.globalAlpha = a; g.font = "900 " + fs + "px " + K.GEO; g.textAlign = "center"; g.textBaseline = "middle";
      var gr = g.createLinearGradient(0, H * 0.6 - fs / 2, 0, H * 0.6 + fs / 2); gr.addColorStop(0, "#8fefff"); gr.addColorStop(0.15, "#111"); gr.addColorStop(1, "#000");
      g.fillStyle = gr; g.fillText(C.portrait ? "TITAN" : "TITAN RELIQUARY", W / 2, H * 0.6); if (C.portrait) g.fillText("RELIQUARY", W / 2, H * 0.6 + fs); g.restore();
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0.15, 1.3, { type: "highpass", f: 5000, shape: [[0.2, 0.025], [0.9, 0.06], [1.3, 0.0001]] });              // filings hiss as the magnet drags them
      for (var j = 0; j < 30; j++) A.noise(0.2 + j * 0.04 + Math.random() * 0.03, 0.015, { type: "bandpass", f: 6000 + Math.random() * 3000, q: 3, v: 0.03 });
      A.tone(0.15, 52, 1.4, { type: "sine", v: 0.12, a: 0.3 });                                                      // the bar magnet passing beneath
      A.noise(1.3, 1.0, { type: "bandpass", f: 900, to: 3800, q: 0.8, shape: [[0.3, 0.09], [0.8, 0.05], [1.0, 0.0001]] });   // the swarm lifts and streams
      A.tone(2.05, 55, 1.6, { type: "sawtooth", v: 0.06, lp: 260, a: 0.6 }); A.tone(2.05, 110.5, 1.6, { type: "sine", v: 0.05, a: 0.7 });   // the liquid rises
      for (var i = 0; i < 26; i++) A.noise(2.15 + i * 0.04 + Math.random() * 0.03, 0.02, { type: "highpass", f: 3000 + Math.random() * 4000, v: 0.05 + Math.random() * 0.05 });
      A.tone(2.1, 40, 1.5, { v: 0.3, to: 34 });
      A.bell(3.35, 880, 1.6, 0.06, [[1, 1], [2.4, 0.4], [3.9, 0.2]]);                                                 // the glint
    }
  };
  /* ---------- inline GPU kit (WebGL2, HDR): fluid sim, stateless GPU particles, bloom + ACES post ---------- */
  function GPU(C, scale) {
    var cv = document.createElement("canvas"); cv.className = "ts-mo ts-mogl"; cv.setAttribute("aria-hidden", "true");
    var x = null; try { x = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" }); } catch (e) { x = null; }
    if (!x || !x.getExtension("EXT_color_buffer_float")) return null; x.getExtension("OES_texture_float_linear");
    var d = I.res(C, scale || 1); cv.width = Math.round(C.W * d); cv.height = Math.round(C.H * d);
    var VQ = "#version 300 es\nin vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    var HD = "#version 300 es\nprecision highp float;precision highp sampler2D;in vec2 uv;out vec4 o;\n" +
      "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n" +
      "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}\n" +
      "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+1.7;a*=.5;}return s;}\n";
    var buf = x.createBuffer(); x.bindBuffer(x.ARRAY_BUFFER, buf); x.bufferData(x.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), x.STATIC_DRAW);
    var G = { x: x, cv: cv, HD: HD, W: cv.width, H: cv.height, progs: [] };
    G.prog = function (fs, vs) {
      function sh(ty, src) { var s = x.createShader(ty); x.shaderSource(s, src); x.compileShader(s); if (!x.getShaderParameter(s, x.COMPILE_STATUS)) { if (window.console) console.warn("intro gpu", x.getShaderInfoLog(s)); return null; } return s; }
      var a = sh(x.VERTEX_SHADER, vs || VQ), b = sh(x.FRAGMENT_SHADER, vs ? fs : HD + fs); if (!a || !b) return null;
      var p = x.createProgram(); x.attachShader(p, a); x.attachShader(p, b); x.bindAttribLocation(p, 0, "p"); x.linkProgram(p); if (!x.getProgramParameter(p, x.LINK_STATUS)) return null;
      var U = {}, n = x.getProgramParameter(p, x.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var inf = x.getActiveUniform(p, i); U[inf.name] = { l: x.getUniformLocation(p, inf.name), t: inf.type }; }
      return { p: p, U: U };
    };
    G.fbo = function (w, h, lin) { var t = x.createTexture(); x.bindTexture(x.TEXTURE_2D, t); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, lin === false ? x.NEAREST : x.LINEAR); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, lin === false ? x.NEAREST : x.LINEAR);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_S, x.CLAMP_TO_EDGE); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_T, x.CLAMP_TO_EDGE); x.texImage2D(x.TEXTURE_2D, 0, x.RGBA16F, w, h, 0, x.RGBA, x.HALF_FLOAT, null);
      var f = x.createFramebuffer(); x.bindFramebuffer(x.FRAMEBUFFER, f); x.framebufferTexture2D(x.FRAMEBUFFER, x.COLOR_ATTACHMENT0, x.TEXTURE_2D, t, 0); var ok = x.checkFramebufferStatus(x.FRAMEBUFFER) === x.FRAMEBUFFER_COMPLETE; x.bindFramebuffer(x.FRAMEBUFFER, null);
      return ok ? { t: t, f: f, w: w, h: h } : null; };
    G.dbl = function (w, h) { var a = G.fbo(w, h), b = G.fbo(w, h); if (!a || !b) return null; return { r: a, w: b, swap: function () { var t = this.r; this.r = this.w; this.w = t; } }; };
    G.tex = function (src) { var t = x.createTexture(); x.bindTexture(x.TEXTURE_2D, t); x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, true); x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, x.RGBA, x.UNSIGNED_BYTE, src); x.generateMipmap(x.TEXTURE_2D);
      x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, x.LINEAR_MIPMAP_LINEAR); x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, x.LINEAR); x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL, false); return t; };
    G.run = function (P, u, target, n) {           // u: {name: number|[..]|{t:texture}}; textures bound to units in order
      x.useProgram(P.p); var unit = 0;
      for (var k in u) { var e = P.U[k]; if (!e) continue; var v = u[k];
        if (v && v.t !== undefined) { x.activeTexture(x.TEXTURE0 + unit); x.bindTexture(x.TEXTURE_2D, v.t); x.uniform1i(e.l, unit++); }
        else if (typeof v === "number") { if (e.t === x.INT) x.uniform1i(e.l, v); else x.uniform1f(e.l, v); }
        else if (v.length === 2) x.uniform2f(e.l, v[0], v[1]); else if (v.length === 3) x.uniform3f(e.l, v[0], v[1], v[2]); else x.uniform4f(e.l, v[0], v[1], v[2], v[3]); }
      if (target) { x.bindFramebuffer(x.FRAMEBUFFER, target.f); x.viewport(0, 0, target.w, target.h); } else { x.bindFramebuffer(x.FRAMEBUFFER, null); x.viewport(0, 0, cv.width, cv.height); }
      if (n) x.drawArrays(x.POINTS, 0, n); else { x.bindBuffer(x.ARRAY_BUFFER, buf); x.enableVertexAttribArray(0); x.vertexAttribPointer(0, 2, x.FLOAT, false, 0, 0); x.drawArrays(x.TRIANGLES, 0, 3); }
    };
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); C._glDead = true; cv.style.display = "none"; });
    C._gl = { cv: cv, x: x }; C.root.insertBefore(cv, C.cv);
    return G;
  }
  /* Navier-Stokes (stable fluids): velocity, dye, curl/vorticity confinement, pressure projection, solid mask */
  var FL = {
    adv: "uniform sampler2D V,S,B;uniform vec2 tx;uniform float dt,dis;void main(){vec2 c=uv-dt*texture(V,uv).xy*tx;o=dis*texture(S,c)*(1.-texture(B,uv).r);}",
    spl: "uniform sampler2D S;uniform vec2 pt,asp;uniform vec4 col;uniform float r;void main(){vec2 d=(uv-pt)*asp;o=texture(S,uv)+col*exp(-dot(d,d)/r);}",
    frc: "uniform sampler2D V,D;uniform float dt,g;void main(){vec4 v=texture(V,uv);float m=texture(D,uv).g;v.y-=g*m*dt;o=v;}",
    crl: "uniform sampler2D V;uniform vec2 tx;void main(){float L=texture(V,uv-vec2(tx.x,0)).y,R=texture(V,uv+vec2(tx.x,0)).y,T=texture(V,uv+vec2(0,tx.y)).x,Bm=texture(V,uv-vec2(0,tx.y)).x;o=vec4(.5*(R-L-T+Bm),0,0,1);}",
    vor: "uniform sampler2D V,Q;uniform vec2 tx;uniform float k,dt;void main(){float L=texture(Q,uv-vec2(tx.x,0)).x,R=texture(Q,uv+vec2(tx.x,0)).x,T=texture(Q,uv+vec2(0,tx.y)).x,Bm=texture(Q,uv-vec2(0,tx.y)).x,c=texture(Q,uv).x;vec2 f=.5*vec2(abs(T)-abs(Bm),abs(R)-abs(L));f/=length(f)+1e-4;f*=k*c;f.y*=-1.;o=texture(V,uv)+vec4(f*dt,0,0);}",
    div: "uniform sampler2D V,B;uniform vec2 tx;void main(){float L=texture(V,uv-vec2(tx.x,0)).x,R=texture(V,uv+vec2(tx.x,0)).x,T=texture(V,uv+vec2(0,tx.y)).y,Bm=texture(V,uv-vec2(0,tx.y)).y;o=vec4(.5*(R-L+T-Bm),0,0,1);}",
    prs: "uniform sampler2D P,Dv;uniform vec2 tx;void main(){float L=texture(P,uv-vec2(tx.x,0)).x,R=texture(P,uv+vec2(tx.x,0)).x,T=texture(P,uv+vec2(0,tx.y)).x,Bm=texture(P,uv-vec2(0,tx.y)).x;o=vec4((L+R+T+Bm-texture(Dv,uv).x)*.25,0,0,1);}",
    grd: "uniform sampler2D P,V,B;uniform vec2 tx;void main(){float L=texture(P,uv-vec2(tx.x,0)).x,R=texture(P,uv+vec2(tx.x,0)).x,T=texture(P,uv+vec2(0,tx.y)).x,Bm=texture(P,uv-vec2(0,tx.y)).x;vec2 v=texture(V,uv).xy-.5*vec2(R-L,T-Bm);o=vec4(v*(1.-texture(B,uv).r),0,1);}",
    clr: "uniform sampler2D S;uniform float k;void main(){o=texture(S,uv)*k;}"
  };
  function Fluid(G, w, h, solid) {
    var P = {}; for (var k in FL) { P[k] = G.prog(FL[k]); if (!P[k]) return null; }
    var F = { V: G.dbl(w, h), D: G.dbl(w, h), Pr: G.dbl(w, h), Dv: G.fbo(w, h), Q: G.fbo(w, h), B: G.fbo(w, h), tx: [1 / w, 1 / h], asp: [w / h, 1] };
    if (!F.V || !F.D || !F.Pr || !F.Dv || !F.Q || !F.B) return null;
    G.run(G.prog(solid), {}, F.B);
    F.reset = function () { [F.V, F.D, F.Pr].forEach(function (d) { G.run(P.clr, { S: d.r, k: 0 }, d.w); d.swap(); }); };
    F.splat = function (pt, r, vel, dye) { G.run(P.spl, { S: F.V.r, pt: pt, asp: F.asp, col: [vel[0], vel[1], 0, 0], r: r }, F.V.w); F.V.swap(); G.run(P.spl, { S: F.D.r, pt: pt, asp: F.asp, col: dye, r: r }, F.D.w); F.D.swap(); };
    F.step = function (dt, grav, vort) {
      G.run(P.frc, { V: F.V.r, D: F.D.r, dt: dt, g: grav }, F.V.w); F.V.swap();
      G.run(P.crl, { V: F.V.r, tx: F.tx }, F.Q); G.run(P.vor, { V: F.V.r, Q: F.Q, tx: F.tx, k: vort, dt: dt }, F.V.w); F.V.swap();
      G.run(P.div, { V: F.V.r, B: F.B, tx: F.tx }, F.Dv); G.run(P.clr, { S: F.Pr.r, k: 0.8 }, F.Pr.w); F.Pr.swap();
      for (var i = 0; i < 22; i++) { G.run(P.prs, { P: F.Pr.r, Dv: F.Dv, tx: F.tx }, F.Pr.w); F.Pr.swap(); }
      G.run(P.grd, { P: F.Pr.r, V: F.V.r, B: F.B, tx: F.tx }, F.V.w); F.V.swap();
      G.run(P.adv, { V: F.V.r, S: F.V.r, B: F.B, tx: [1, 1], dt: dt, dis: 0.995 }, F.V.w); F.V.swap();
      G.run(P.adv, { V: F.V.r, S: F.D.r, B: F.B, tx: [1, 1], dt: dt, dis: 0.998 }, F.D.w); F.D.swap();
    };
    return F;
  }
  /* bloom (threshold, 5-level down/up chain) + ACES tonemap + grain + vignette, optional heat-haze offset */
  var PST = {
    thr: "uniform sampler2D S;void main(){vec3 c=texture(S,uv).rgb;float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(.9,2.2,l),1);}",
    dn: "uniform sampler2D S;uniform vec2 tx;void main(){vec3 c=texture(S,uv).rgb*4.;c+=texture(S,uv+tx*vec2(-1,-1)).rgb+texture(S,uv+tx*vec2(1,-1)).rgb+texture(S,uv+tx*vec2(-1,1)).rgb+texture(S,uv+tx*vec2(1,1)).rgb;c+=2.*(texture(S,uv+tx*vec2(2,0)).rgb+texture(S,uv-tx*vec2(2,0)).rgb+texture(S,uv+tx*vec2(0,2)).rgb+texture(S,uv-tx*vec2(0,2)).rgb);o=vec4(c/16.,1);}",
    up: "uniform sampler2D S,A;uniform vec2 tx;void main(){vec3 c=texture(S,uv+tx*vec2(-1,-1)).rgb+texture(S,uv+tx*vec2(1,-1)).rgb+texture(S,uv+tx*vec2(-1,1)).rgb+texture(S,uv+tx*vec2(1,1)).rgb;o=vec4(c*.25+texture(A,uv).rgb,1);}",
    fin: "uniform sampler2D S,Bl,Hz;uniform float bloom,haze,T,expo;vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}" +
      "void main(){vec2 q=uv;float hz=texture(Hz,uv).r*haze;q+=hz*.012*vec2(vn(uv*40.+vec2(0,T*6.))-.5,vn(uv*40.+vec2(9,T*7.))-.5);vec3 c=texture(S,q).rgb+texture(Bl,q).rgb*bloom;" +
      "c=aces(c*expo);c=pow(c,vec3(1./2.2));c*=1.-.35*smoothstep(.45,1.1,length((uv-.5)*vec2(1.,1.3)));c+=(h21(uv*vec2(1311,977)+T)-.5)*.025;o=vec4(c,1);}"
  };
  function Post(G) {
    var P = {}; for (var k in PST) { P[k] = G.prog(PST[k]); if (!P[k]) return null; }
    var hdr = G.fbo(G.W, G.H), L = [], w = G.W >> 1, h = G.H >> 1; if (!hdr) return null;
    for (var i = 0; i < 5; i++) { L.push(G.fbo(Math.max(2, w), Math.max(2, h))); w >>= 1; h >>= 1; }
    var U = L.map(function (l) { return G.fbo(l.w, l.h); });
    return { hdr: hdr, out: function (o) {
      G.run(P.thr, { S: hdr }, L[0]);
      for (var i = 1; i < 5; i++) G.run(P.dn, { S: L[i - 1], tx: [1 / L[i - 1].w, 1 / L[i - 1].h] }, L[i]);
      G.run(P.dn, { S: L[4], tx: [1 / L[4].w, 1 / L[4].h] }, U[4]);
      for (i = 3; i >= 0; i--) G.run(P.up, { S: U[i + 1], A: L[i], tx: [0.5 / U[i + 1].w, 0.5 / U[i + 1].h] }, U[i]);
      G.run(P.fin, { S: hdr, Bl: U[0], Hz: o.hz || hdr, bloom: o.bloom, haze: o.haze || 0, T: o.T, expo: o.expo || 1 }, null);
    } };
  }
  /* ---------- Ferrofluid v2: three long, full-bleed GPU moments ---------- */
  var FP = { drop: [0, 1.6], field: [1.6, 3.3], name: [3.3, 5.0] }, TD = 0.62;
  var FSC = [
    "uniform sampler2D TX;uniform vec2 R;uniform float T,st,lt,cs,mx,grow,sharp,sweep,port,fall;uniform vec3 ro,ta;uniform vec2 NS;",
    "vec3 env(vec3 r){vec3 c=vec3(.003,.0035,.004)+vec3(.018,.02,.024)*smoothstep(-.1,.9,r.y);",
    " c+=vec3(1.,.98,.95)*2.6*(st>1.5?smoothstep(.08,.16,r.y)*smoothstep(.8,.7,r.y):smoothstep(.26,.32,r.y)*smoothstep(.55,.48,r.y))*(.75+.25*sin(atan(r.z,r.x)*3.));",
    " c+=vec3(.25,.85,1.)*3.*smoothstep(.9,.96,dot(normalize(vec3(r.x,0.,r.z)),normalize(vec3(.9,0.,-.3))))*smoothstep(.25,.3,r.y)*smoothstep(.6,.5,r.y);",
" c+=vec3(1.,.82,.6)*2.2*smoothstep(.95,.985,dot(r,normalize(vec3(-.85,.35,.35))));return c;}",                            /* warm kicker */
    "float field(vec2 q){",
    " if(st<.5)return 0.;",
    " if(st<1.5){float b=exp(-pow((q.x-mx)/.75,2.))*smoothstep(1.8,.2,abs(q.y));return b*grow;}",
    " vec2 u=vec2(.5+q.x/NS.x,.5-q.y/NS.y);if(u.x<0.||u.x>1.||u.y<0.||u.y>1.)return 0.;",
    " float m=textureLod(TX,u,mix(3.,1.2,sharp)).r;return smoothstep(.08,.6,m)*grow;}",
    "vec2 hexc(vec2 p){vec2 s=vec2(1.,1.7320508);vec2 a=mod(p,s)-s*.5,b=mod(p-s*.5,s)-s*.5;return dot(a,a)<dot(b,b)?a:b;}",
    "float H(vec2 q){float h=0.;",
    " if(st<.5){float a=T-"+TD.toFixed(3)+";if(a>0.){float r=length(q);h+=.05*sin(r*16.-a*13.)*exp(-r*.7)*exp(-a*.9)*smoothstep(a*1.5+.15,a*1.5-.35,r);}}",
    " else{vec2 g=hexc(q/cs)*cs;float F=field(q-g);if(F>.002){float d=length(g)/(cs*.55);float tip=mix(1.6,3.2,sharp);h+=F*cs*mix(2.2,3.4,sharp)*pow(max(0.,1.-d),tip);}",
    "  h+=.012*field(q)*sin(T*9.+q.x*7.);}",
    " return h;}",
    "float sdT(vec3 p,float R0,float r){vec2 q=vec2(length(p.xz)-R0,p.y);return length(q)-r;}",
    "float map(vec3 p,out int m){m=1;float d=(p.y-H(p.xz))*.42;",
    " if(st<.5){float yd=mix(2.6,0.,fall);float s=length(p-vec3(0,yd+.2,0))-.17;vec3 q=p-vec3(0,yd+.2,0);s=length(q*vec3(1.,1.+.25*fall*fall,1.))-.17;if(fall>=1.)s=1e3;",
    "  float a=T-"+TD.toFixed(3)+";if(a>0.&&a<.55){float k=a/.55;float cr=sdT(p-vec3(0,.05*sin(k*3.14)*1.4,0),.12+k*.6,.03*(1.-k)+.005);float ang=atan(p.z,p.x);cr+=.03*(1.-k)*(.5+.5*sin(ang*13.));s=min(s,max(cr,-p.y+.0));}",
    "  if(a>.25&&a<1.){float k=(a-.25)/.75;float hj=.65*sin(k*3.14);vec3 c=p;c.y-=clamp(c.y,0.,hj);s=min(s,length(c)-.05*(1.-k*.5));float dr=length(p-vec3(0,hj+.12*k+.05,0))-.06*(1.-k);if(k<.9)s=min(s,dr);}",
    "  if(s<d){d=s;m=2;}}",
    " return d;}",
    "vec3 nrm(vec3 p){int m;vec2 e=vec2(.0015,0);return normalize(vec3(map(p+e.xyy,m)-map(p-e.xyy,m),map(p+e.yxy,m)-map(p-e.yxy,m),map(p+e.yyx,m)-map(p-e.yyx,m)));}",
    "void main(){vec2 s=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);vec3 w=normalize(ta-ro),u=normalize(cross(w,vec3(0,1,0))),v=cross(u,w);float f=port>.5?1.15:1.6;vec3 rd=normalize(s.x*u+s.y*v+f*w);",
    " float t=.01;int m=0;bool hit=false;for(int i=0;i<200;i++){vec3 p=ro+rd*t;float d=map(p,m);if(abs(d)<.0005*t+.0002){hit=true;break;}t+=d;if(t>16.)break;}",
    " vec3 col=vec3(.004,.0045,.006)+vec3(.012,.016,.02)*smoothstep(.1,-.4,s.y);",
    " if(hit){vec3 p=ro+rd*t;vec3 n=nrm(p);vec3 r=reflect(rd,n);float fr=.06+.94*pow(1.-max(dot(n,-rd),0.),5.);",
    "  float hh=p.y;float ao=clamp(.45+hh*6.+.55*smoothstep(0.,.02,hh),.25,1.);",
    "  col=env(r)*fr*ao+vec3(.004,.0045,.005);",
    "  float sw=exp(-pow(dot(p.xz,vec2(.9,.43))-mix(-4.,4.,sweep),2.)*3.)*step(.01,sweep)*step(sweep,.99);col+=env(r)*sw*.8*ao;",
    "  col*=exp(-max(t-6.5,0.)*.2);}",
    " o=vec4(col,1.);}"
  ].join("\n");
  function nameTex(port) {
    var w = port ? 1024 : 2048, h = port ? 1024 : 512, c = K.mk(w, h), g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    var lines = port ? ["TITAN", "RELIQUARY"] : ["TITAN RELIQUARY"], fs = port ? 230 : 300;
    lines.forEach(function (ln, i) { g.font = "900 " + fs + "px " + K.SANS; var tw = g.measureText(ln).width, f2 = Math.min(fs, fs * w * 0.92 / tw); g.font = "900 " + f2 + "px " + K.SANS; g.fillText(ln, w / 2, port ? h * (0.3 + i * 0.4) : h / 2); });
    return c;
  }
  function fsetup(C) {
    var G = GPU(C, C.W * C.H > 2.2e6 ? 0.7 : 0.85); if (!G) return null; var Po = Post(G); if (!Po) return null; var Sc = G.prog(FSC); if (!Sc) return null;
    var port = C.H > C.W; return { G: G, Po: Po, Sc: Sc, tx: { t: G.tex(nameTex(port)) }, port: port, NS: port ? [2.7, 2.7] : [4.8, 1.2] };
  }
  function fcam(t, port) {
    var e;
    if (t < FP.drop[1]) { e = K.eio(K.seg(t, 0, FP.drop[1])); return { ro: [0.0, 0.35 + 0.2 * e, (port ? 2.3 : 1.9) - 0.3 * e], ta: [0, 0.2 - 0.08 * e, 0] }; }
    if (t < FP.field[1]) { e = K.eio(K.seg(t, FP.field[0], FP.field[1])); return { ro: [-2.2 + 1.6 * e, 0.42 + 0.1 * e, 1.9], ta: [0.2 + 0.6 * e, 0.12, -0.4] }; }
    e = K.eo3(K.seg(t, FP.name[0], FP.name[1]));
    return port ? { ro: [0, 2.9 - 0.3 * e, 3.3 - 0.4 * e], ta: [0, 0, -0.35] } : { ro: [0, 2.0 - 0.25 * e, 3.4 - 0.4 * e], ta: [0, 0, -0.25] };
  }
  I.reg("ferro", {
    dur: 5.0, still: 4.9,
    init: function (C) { C.F = C.lite ? null : fsetup(C); if (!C.F) { OLDF.init(C); C.old = true; } },
    draw: function (C, t) {
      if (C.old || C._glDead) { if (!C.old) { OLDF.init(C); C.old = true; } OLDF.draw(C, Math.min(t * 4.6 / 5.0, 4.6)); return; }
      var F = C.F, G = F.G, g = C.g, W = C.W, H = C.H, seg = K.seg, st = t < FP.drop[1] ? 0 : t < FP.field[1] ? 1 : 2, P = st === 0 ? FP.drop : st === 1 ? FP.field : FP.name, lt = seg(t, P[0], P[1]), c = fcam(t, F.port);
      var u = { TX: F.tx, R: [G.W, G.H], T: t, st: st, lt: lt, cs: 0.1, mx: 0, grow: 0, sharp: 0, sweep: 0, port: F.port ? 1 : 0, fall: 0, ro: c.ro, ta: c.ta, NS: F.NS };
      if (st === 0) u.fall = Math.min(1, Math.pow(seg(t, 0.05, TD), 2));
      else if (st === 1) { u.cs = 0.11; u.mx = -2.6 + 5.2 * K.eio(lt); u.grow = K.eio(seg(lt, 0, 0.25)) * (0.85 + 0.15 * Math.sin(t * 7)); }
      else { u.cs = F.port ? 0.065 : 0.055; u.grow = K.eo3(seg(lt, 0, 0.45)); u.sharp = K.eio(seg(lt, 0.3, 0.75)); u.sweep = seg(lt, 0.55, 0.9); }
      g.clearRect(0, 0, W, H);
      G.run(F.Sc, u, F.Po.hdr);
      F.Po.out({ bloom: 0.55, haze: 0, T: t, expo: 1.2 * seg(t, 0, 0.3) });
      if (st === 2) { var nm = seg(t, 4.25, 4.75); if (nm > 0) { var tf = Math.min(W * 0.07, H * 0.05, 44); g.save(); g.globalAlpha = nm; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "600 " + tf * 0.36 + "px " + K.MONO; if ("letterSpacing" in g) g.letterSpacing = tf * 0.08 + "px"; g.fillStyle = "#b4f3ff"; g.fillText("FERROFLUID  \u00b7  FIELD 0.42 T  \u00b7  TITAN RELIQUARY", W / 2, H * 0.9); g.restore(); } }
    },
    sound: function (C) {
      var A = I.audio(C); if (!A) return;
      A.noise(0, 5.0, { type: "lowpass", f: 180, shape: [[0.3, 0.05], [4.6, 0.05], [5.0, 0.0001]] });                       // room tone
      A.tone(TD, 1400, 0.12, { to: 380, v: 0.18 }); A.tone(TD, 60, 1.2, { to: 38, v: 0.35 });                                 // plip + sub ring
      A.tone(TD + 0.35, 900, 0.1, { to: 1600, v: 0.06 });
      A.tone(1.6, 48, 1.7, { type: "sawtooth", v: 0.05, lp: 200, to: 72 }); A.noise(1.6, 1.7, { type: "bandpass", f: 400, to: 1400, q: 2, shape: [[0.4, 0.08], [1.5, 0.1], [1.7, 0.0001]] });   // magnetic swell
      for (var i = 0; i < 40; i++) A.noise(3.35 + K.hash(i) * 0.8, 0.02, { type: "highpass", f: 5000, v: 0.05 + K.hash(i + 3) * 0.05 });   // crackle as spikes rise
      A.bell(4.3, 1318, 1.4, 0.03, [[1, 1], [2.76, 0.3]]);
    }
  });
})();
