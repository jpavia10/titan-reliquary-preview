/* Shared HDR post for experimental shells (Grok exp worker): scene -> half-float target -> bright pass + two blur levels ->
   ACES composite with optional RGB fringe, scanlines, flicker, vignette. Uses the app's shared window.THREE. */
const THREE = window.THREE;
const VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
export function createPost(renderer, opt = {}) {
  const hdr = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
  const main = hdr(), b1 = [hdr(), hdr()], b2 = [hdr(), hdr()];
  const pc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), ps = new THREE.Scene(), pq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); ps.add(pq);
  const blurM = new THREE.ShaderMaterial({ uniforms: { tD: { value: null }, uDir: { value: new THREE.Vector2() }, uTh: { value: 0 } }, vertexShader: VS,
    fragmentShader: `uniform sampler2D tD; uniform vec2 uDir; uniform float uTh; varying vec2 vUv;
      vec3 S(vec2 o){ vec3 c = texture2D(tD, vUv + o).rgb; return uTh > 0.0 ? max(c - uTh, 0.0) : c; }
      void main(){ vec3 c = S(vec2(0))*0.227; c += (S(uDir*1.38)+S(-uDir*1.38))*0.316; c += (S(uDir*3.23)+S(-uDir*3.23))*0.07; gl_FragColor = vec4(c, 1.0); }` });
  const U = { tD: { value: main.texture }, tB1: { value: b1[0].texture }, tB2: { value: b2[0].texture }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uFringe: { value: opt.fringe ?? 0.0 }, uScan: { value: opt.scan ?? 0.0 }, uFlick: { value: opt.flicker ?? 0.0 }, uVig: { value: opt.vignette ?? 0.6 }, uExp: { value: opt.exposure ?? 1.0 }, uBloom: { value: opt.bloom ?? 1.0 }, uTint: { value: new THREE.Vector3(...(opt.tint || [0, 0, 0])) } };
  const compM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS,
    fragmentShader: `uniform sampler2D tD, tB1, tB2; uniform float uT, uFringe, uScan, uFlick, uVig, uExp, uBloom; uniform vec2 uRes; uniform vec3 uTint; varying vec2 vUv;
      float h(float n){ return fract(sin(n)*43758.5453); }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      vec3 S(vec2 u){ return texture2D(tD,u).rgb + (texture2D(tB1,u).rgb*1.1 + texture2D(tB2,u).rgb*1.6) * uBloom; }
      void main(){ vec2 c = vUv-0.5; vec2 k = c*(0.004 + 0.01*dot(c,c)) * uFringe;
        vec3 col = vec3(S(vUv+k).r, S(vUv).g, S(vUv-k).b);
        col = aces(col*uExp);
        col *= 1.0 - uScan*(0.5 - 0.5*sin(vUv.y*uRes.y*1.5 + uT*8.0));
        col *= 1.0 - uFlick*h(floor(uT*24.0));
        col *= 1.0 - dot(c,c)*uVig; col += uTint;
        gl_FragColor = vec4(col, 1.0); }` });
  const pass = (m, t) => { pq.material = m; renderer.setRenderTarget(t); renderer.render(ps, pc); };
  return { U,
    resize(w, h, pr) { main.setSize(w * pr, h * pr); b1.forEach((r) => r.setSize(w * pr / 4, h * pr / 4)); b2.forEach((r) => r.setSize(w * pr / 12, h * pr / 12)); U.uRes.value.set(w * pr, h * pr); },
    render(scene, camera, t, th = 0.35) { U.uT.value = t;
      renderer.setRenderTarget(main); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(scene, camera);
      const u = blurM.uniforms; u.tD.value = main.texture; u.uTh.value = th; u.uDir.value.set(1 / b1[0].width, 0); pass(blurM, b1[1]);
      u.uTh.value = 0; u.tD.value = b1[1].texture; u.uDir.value.set(0, 1 / b1[0].height); pass(blurM, b1[0]);
      u.tD.value = b1[0].texture; u.uDir.value.set(1 / b2[0].width, 0); pass(blurM, b2[1]); u.tD.value = b2[1].texture; u.uDir.value.set(0, 1 / b2[0].height); pass(blurM, b2[0]);
      pass(compM, null); },
    dispose() { [main, ...b1, ...b2].forEach((r) => r.dispose()); blurM.dispose(); compM.dispose(); } };
}
