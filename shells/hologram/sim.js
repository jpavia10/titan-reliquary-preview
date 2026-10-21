/* Hologram GPGPU particle sim (Grok exp worker). Position + velocity live in float textures (ping-pong); every frame a
   velocity pass applies curl-noise vortices, a vortex swirl around the current target, spring attraction to the target
   (home cluster or coin/panel point cloud) and the touch flow; a position pass integrates. Rendering samples the texture. */
const THREE = window.THREE;   // the app's one shared three.js (js/three.min.js)
if (!THREE) throw new Error("three.js not loaded");
const QUAD_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const NOISE = `
vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
float gnoise(vec3 p){ vec3 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hash3(i),f), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x), mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x), mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
vec3 pot(vec3 p){ return vec3(gnoise(p), gnoise(p+vec3(31.4,-12.7,5.1)), gnoise(p+vec3(-7.3,19.9,43.2))); }
vec3 curl(vec3 p){ const float e = 0.1; vec3 dx = vec3(e,0,0), dy = vec3(0,e,0), dz = vec3(0,0,e);
  vec3 a = pot(p+dy)-pot(p-dy), b = pot(p+dz)-pot(p-dz), c = pot(p+dx)-pot(p-dx);
  return vec3(a.z - b.y, b.x - c.z, c.y - a.x) / (2.0*e); }`;
export function createSim(renderer, T, homeData, colData) {
  const type = renderer.capabilities.isWebGL2 && renderer.extensions.has("EXT_color_buffer_float") ? THREE.FloatType : THREE.HalfFloatType;
  const mk = () => new THREE.WebGLRenderTarget(T, T, { type, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const pos = [mk(), mk()], vel = [mk(), mk()];
  const tex = (d) => { const t = new THREE.DataTexture(d, T, T, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true; return t; };
  const homeT = tex(homeData), coinData = new Float32Array(T * T * 4), coinT = tex(coinData);
  const homeC = tex(colData), coinCData = new Float32Array(T * T * 4), coinC = tex(coinCData);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); sc.add(quad);
  const U = { tPos: { value: null }, tVel: { value: null }, tHome: { value: homeT }, tCoin: { value: coinT }, uMix: { value: 0 }, uT: { value: 0 }, uDt: { value: 0.016 },
    uCoinM: { value: new THREE.Matrix4() }, uCoinC: { value: new THREE.Vector3() }, uRay0: { value: new THREE.Vector3() }, uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uStir: { value: new THREE.Vector3() }, uStirOn: { value: 0 }, uBurst: { value: 0 } };
  const velM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: QUAD_VS, fragmentShader: `precision highp float; varying vec2 vUv;
    uniform sampler2D tPos, tVel, tHome, tCoin; uniform float uMix, uT, uDt, uStirOn, uBurst; uniform mat4 uCoinM; uniform vec3 uCoinC, uRay0, uRayD, uStir; ${NOISE}
    void main(){ vec4 P = texture2D(tPos, vUv); vec3 p = P.xyz, v = texture2D(tVel, vUv).xyz; float s = P.w;
      vec3 home = texture2D(tHome, vUv).xyz; vec3 coin = (uCoinM * vec4(texture2D(tCoin, vUv).xyz, 1.0)).xyz;
      float k = clamp(uMix*1.4 - s*0.4, 0.0, 1.0);                     // staggered: the core arrives first, the halo last
      vec3 tgt = mix(home, coin, k), d = tgt - p; float dist = length(d);
      vec3 ctr = mix(home, uCoinC, k);
      // 1. curl-noise turbulence: strong in flight, calm once settled
      float fly = smoothstep(0.02, 1.5, dist);
      v += curl(p*0.35 + vec3(0.0, uT*0.07, 0.0)) * (0.25 + 2.4*fly) * uDt;
      // 2. vortex: particles orbit the target's vertical axis as they fall in (rotational coalescence)
      vec3 r = p - ctr; r.y = 0.0; v += cross(vec3(0.0,1.0,0.0), r) * (1.8 * fly / (0.6 + dot(r,r)*0.08)) * uDt;
      // 3. spring to the target, critically damped near it
      v += d * (2.2 + 9.0*k) * uDt; v *= 1.0 - (1.6 + 3.5*(1.0-fly)) * uDt;
      // 4. touch flow: a drag pushes nearby particles along with it and swirls them (stirring a fluid)
      if (uStirOn > 0.0) { vec3 w = p - uRay0; float t = max(0.0, dot(w, uRayD)); vec3 q = w - uRayD*t; float f = exp(-dot(q,q)*1.6);
        v += (uStir*6.0 + cross(uRayD, q)*2.5) * f * uStirOn * uDt * 10.0; }
      // 5. a burst on dissolve: everything blows outward along the flow before settling home
      v += normalize(p - uCoinC + 1e-4) * uBurst * (0.5+s) * 4.0 * uDt;
      gl_FragColor = vec4(v, 1.0); }` });
  const posM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: QUAD_VS, fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tPos, tVel; uniform float uDt;
    void main(){ vec4 P = texture2D(tPos, vUv); gl_FragColor = vec4(P.xyz + texture2D(tVel, vUv).xyz * uDt, P.w); }` });
  const initM = new THREE.ShaderMaterial({ uniforms: { tHome: { value: homeT } }, vertexShader: QUAD_VS, fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tHome;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec4 H = texture2D(tHome, vUv); vec3 p = H.xyz * (0.2 + 2.2*h(vUv)) + vec3(0.0, (h(vUv*3.1)-0.5)*20.0, 0.0); gl_FragColor = vec4(p, h(vUv*7.7)); }` });
  const zeroM = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }" });
  const run = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(sc, cam); };
  run(initM, pos[0]); run(zeroM, vel[0]); renderer.setRenderTarget(null);
  let i = 0;
  return { U, T, coinData, coinCData, coinT, coinC, homeC,
    pos: () => pos[i].texture,
    step(dt, t) { U.uDt.value = Math.min(dt, 1 / 20); U.uT.value = t;
      U.tPos.value = pos[i].texture; U.tVel.value = vel[i].texture; run(velM, vel[1 - i]);
      U.tVel.value = vel[1 - i].texture; run(posM, pos[1 - i]); i = 1 - i; renderer.setRenderTarget(null); },
    dispose() { [...pos, ...vel].forEach((r) => r.dispose()); [homeT, coinT, homeC, coinC].forEach((t) => t.dispose()); [velM, posM, initM, zeroM].forEach((m) => m.dispose()); } };
}
