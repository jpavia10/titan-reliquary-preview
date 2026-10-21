/* Ferrofluid intro (Grok, theme #37, 2026-10-20). One black drop falls into a mirror pool and rings it out; then a hidden magnet,
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
    var N = big ? 2097152 : 1048576;                 // a million filings on a phone; two million on a big screen
    var m = /[?&]fxkscale=([0-9.]+)/.exec(location.search); if (m) N = Math.round(N * +m[1]);
    C.root.insertBefore(cv, C.cv);
    return { cv: cv, draw: function (t, hw, dz) {
      var d = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(C.W * d), hh = Math.round(C.H * d); if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
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
  I.reg("ferro", {
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
  });
})();
