/* TitanRelief (Grok 2026-10-20): photo-derived relief, a shared service.
   A coin photo is lit from roughly one side, so its brightness carries the shape of the design. We turn that into
   height (brightness with the broad lighting removed, then smoothed) and a tangent-space normal map (Sobel slope of
   the height), plus a roughness map (recesses hold toning and dirt, so they are rougher). Runs once per face at
   256-384 px in a few ms; nothing leaves the device. Pure function of the pixels: same photo, same relief.
   API: TitanRelief.derive(sourceCanvas, {size, strength}) -> {normal, rough, height} canvases, or null if unreadable. */
(function () {
  "use strict";
  function blur(src, w, h, r) {           // separable box blur, run twice (close to a Gaussian)
    let a = src, b = new Float32Array(w * h);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) { let acc = 0; const o = y * w;
        for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) { b[o + x] = acc / (2 * r + 1); acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
      const c = new Float32Array(w * h);
      for (let x = 0; x < w; x++) { let acc = 0;
        for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) { c[y * w + x] = acc / (2 * r + 1); acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
      a = c;
    }
    return a;
  }
  function derive(source, opt) {
    opt = opt || {}; const N = opt.size || 320, k = opt.strength || 1.8;
    const c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d", { willReadFrequently: true });
    let px; try { x.drawImage(source, 0, 0, N, N); px = x.getImageData(0, 0, N, N).data; } catch (e) { return null; }   // tainted photo: no relief
    const L = new Float32Array(N * N), R = N / 2;
    for (let i = 0; i < N * N; i++) L[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    const broad = blur(L, N, N, Math.max(4, N >> 4));          // the photo's lighting gradient
    const fine = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) fine[i] = L[i] - broad[i];
    let H = blur(fine, N, N, 2);                                 // kill sensor noise, keep the design
    let lo = 1e9, hi = -1e9; for (let i = 0; i < N * N; i++) { if (H[i] < lo) lo = H[i]; if (H[i] > hi) hi = H[i]; }
    const span = Math.max(1e-4, hi - lo);
    for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) {    // fade relief to flat at the rim so the edge stays crisp
      const i = y * N + xx, d = Math.hypot(xx - R, y - R) / R; H[i] = ((H[i] - lo) / span) * (d < 0.94 ? 1 : Math.max(0, (1 - d) / 0.06));
    }
    const out = (fn) => { const o = document.createElement("canvas"); o.width = o.height = N; const ox = o.getContext("2d"), im = ox.createImageData(N, N);
      for (let i = 0; i < N * N; i++) { const v = fn(i, i % N, (i / N) | 0); im.data.set(v, i * 4); } ox.putImageData(im, 0, 0); return o; };
    const h = (xx, y) => H[Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, xx))];
    const normal = out((i, xx, y) => {
      const dx = (h(xx + 1, y - 1) + 2 * h(xx + 1, y) + h(xx + 1, y + 1)) - (h(xx - 1, y - 1) + 2 * h(xx - 1, y) + h(xx - 1, y + 1));
      const dy = (h(xx - 1, y + 1) + 2 * h(xx, y + 1) + h(xx + 1, y + 1)) - (h(xx - 1, y - 1) + 2 * h(xx, y - 1) + h(xx + 1, y - 1));
      let nx = -dx * k, ny = dy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255, 255];
    });
    const rough = out((i) => { const r = (0.6 - H[i] * 0.3) * 255; return [r, r, r, 255]; });   // green channel is what three reads
    const height = out((i) => { const v = H[i] * 255; return [v, v, v, 255]; });
    return { normal, rough, height };
  }
  window.TitanRelief = { derive };
})();
