/* TitanQuality (Grok 2026-10-20): shared quality tiers that scale UP, never below the device floor.
   Device targets (Joseph): floor = Galaxy S24 Ultra (Adreno 750, Chrome) at a smooth 60fps; iPad Pro (Safari, WebGPU with WebGL2
   fallback); top = RTX 4090 + i9 on a 45" ultrawide (5120x2160, 21:9 or wider). Assume a capable GPU; never auto-downscale.
   Tiers: "base" (phones/tablets, the 60fps floor), "high" (desktop iGPU / unknown desktop), "ultra" (discrete desktop GPU).
   Lite mode (user choice) is the only thing that goes below base.
   API: TitanQuality.tier, .q {dpr, particles, volumetrics, post, shadow, msaa}, .ultrawide (aspect >= 2.1), .webgpu (bool) */
(function () {
  "use strict";
  const T = {
    lite:  { dpr: 1.25, particles: 0.25, volumetrics: 0, post: 0, shadow: 1024, msaa: 0 },
    base:  { dpr: 2,    particles: 1,    volumetrics: 1, post: 1, shadow: 2048, msaa: 4 },
    high:  { dpr: 2,    particles: 2,    volumetrics: 1, post: 2, shadow: 2048, msaa: 4 },
    ultra: { dpr: 2,    particles: 4,    volumetrics: 2, post: 2, shadow: 4096, msaa: 8 }
  };
  let gpu = "";
  try { const c = document.createElement("canvas"), g = c.getContext("webgl2") || c.getContext("webgl"), e = g && g.getExtension("WEBGL_debug_renderer_info"); gpu = (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "") || ""; g && g.getExtension("WEBGL_lose_context") && g.getExtension("WEBGL_lose_context").loseContext(); } catch (_) {}
  const touch = matchMedia("(pointer: coarse)").matches;
  const lite = () => window.TitanLite === true || document.documentElement.classList.contains("tr-lite");
  const forced = (/[?&]q=(lite|base|high|ultra)/.exec(location.search) || [])[1];
  const pick = () => forced || (lite() ? "lite" : touch ? "base" : /RTX|GeForce|Radeon RX|Arc A|Apple M\d (Max|Ultra)/i.test(gpu) ? "ultra" : "high");
  const api = { gpu, webgpu: !!navigator.gpu, tiers: T, get tier() { return pick(); }, get q() { return T[pick()]; },
    get ultrawide() { return innerWidth / Math.max(1, innerHeight) >= 2.1; } };
  const mark = () => { const d = document.documentElement; d.dataset.quality = api.tier; d.classList.toggle("tr-ultrawide", api.ultrawide); };
  addEventListener("resize", mark); document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mark) : mark();
  window.TitanQuality = api;
})();
