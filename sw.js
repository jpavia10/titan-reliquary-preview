/* Titan Reliquary service worker · build tr99
   - App shell precached per build (versioned cache names; old caches deleted on activate)
   - version.json + data/*: network-first (no-store) so a new publish always wins; cache = offline fallback
   - audio/ambience/: runtime cache-first (filled the first time a sound is played; not precached)
   - thumbs/: cache-first (URLs carry ?v=<file hash>, so a changed image is a new URL)
   NOTE: publish_all.sh regenerates the build stamp on merge — update BUILD + SHELL_URLS then. */
const BUILD = "tr99";
const SHELL = "titan-shell-" + BUILD;
const DATA = "titan-data-" + BUILD;
const IMG = "titan-thumbs-v1";
const AMB = "titan-ambience-v1"; // real recordings: cached on first play (too big to precache), kept across builds
const SHELL_URLS = ["./", "index.html", "atlas.js?v=" + BUILD, "js/app-motion.js?v=" + BUILD, "js/app-format.js?v=" + BUILD, "js/app-insights.js?v=" + BUILD, "js/app-overlay.js?v=" + BUILD, "js/app-atmo-css.js?v=" + BUILD, "js/app-ui.js?v=" + BUILD, "app.js?v=" + BUILD, "spatial.js?v=" + BUILD, "deepzoom.js?v=" + BUILD, "styles.css?v=" + BUILD, "splash.js?v=" + BUILD, "splash.css?v=" + BUILD, "manifest.webmanifest",
  "icons/icon-192.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "favicon.svg",
  "fonts/Fraunces-500.woff2", "fonts/Fraunces-600.woff2", "fonts/Fraunces-700.woff2",
  "js/three.min.js", "js/OrbitControls.js", "js/fflate.min.js", "js/USDZExporter.js", "js/qrcode.min.js", "js/openseadragon.min.js",
  "js/playlist.js?v=" + BUILD, "audio.js?v=" + BUILD, "ambient.js?v=" + BUILD];
const WING_URLS = [
  "styles/atmo/abyss.css?v=" + BUILD,
  "styles/atmo/afterhours.css?v=" + BUILD,
  "styles/atmo/alchemist.css?v=" + BUILD,
  "styles/atmo/all.css?v=" + BUILD,
  "styles/atmo/colossus.css?v=" + BUILD,
  "styles/atmo/conservator.css?v=" + BUILD,
  "styles/atmo/construct.css?v=" + BUILD,
  "styles/atmo/cursedwing.css?v=" + BUILD,
  "styles/atmo/dynasty.css?v=" + BUILD,
  "styles/atmo/glacier.css?v=" + BUILD,
  "styles/atmo/kaleido.css?v=" + BUILD,
  "styles/atmo/neon.css?v=" + BUILD,
  "styles/atmo/nocturne.css?v=" + BUILD,
  "styles/atmo/notepad.css?v=" + BUILD,
  "styles/atmo/odyssey.css?v=" + BUILD,
  "styles/atmo/samadhi.css?v=" + BUILD,
  "styles/atmo/silkroad.css?v=" + BUILD,
  "styles/atmo/solaris.css?v=" + BUILD,
  "styles/atmo/valhalla.css?v=" + BUILD,
  "styles/atmo/xeno.css?v=" + BUILD,
  "styles/atmo/zen.css?v=" + BUILD,
  "styles/fx.css?v=" + BUILD,
  "styles/gallery.css?v=" + BUILD,
  "styles/hall.css?v=" + BUILD,
  "styles/lab.css?v=" + BUILD,
  "styles/scene.css?v=" + BUILD,
  "styles/worlds.css?v=" + BUILD,
  "styles/slab-legibility.css?v=" + BUILD,
  "styles/study.css?v=" + BUILD,
  "styles/table.css?v=" + BUILD,
  "styles/themes.css?v=" + BUILD,
  "styles/vault.css?v=" + BUILD,
  "styles/simple.css?v=" + BUILD,
  "styles/health.css?v=" + BUILD,
  "styles/questions.css?v=" + BUILD,
  "styles/wants.css?v=" + BUILD,
  "wings/albums-data.js?v=" + BUILD,
  "wings/atmo/abyss.js?v=" + BUILD,
  "wings/atmo/afterhours.js?v=" + BUILD,
  "wings/atmo/alchemist.js?v=" + BUILD,
  "wings/atmo/colossus.js?v=" + BUILD,
  "wings/atmo/conservator.js?v=" + BUILD,
  "wings/atmo/construct.js?v=" + BUILD,
  "wings/atmo/core.js?v=" + BUILD,
  "wings/atmo/cursedwing.js?v=" + BUILD,
  "wings/atmo/dynasty.js?v=" + BUILD,
  "wings/atmo/glacier.js?v=" + BUILD,
  "wings/atmo/kaleido.js?v=" + BUILD,
  "wings/atmo/neon.js?v=" + BUILD,
  "wings/atmo/nocturne.js?v=" + BUILD,
  "wings/atmo/notepad.js?v=" + BUILD,
  "wings/atmo/odyssey.js?v=" + BUILD,
  "wings/atmo/samadhi.js?v=" + BUILD,
  "wings/atmo/silkroad.js?v=" + BUILD,
  "wings/atmo/solaris.js?v=" + BUILD,
  "wings/atmo/valhalla.js?v=" + BUILD,
  "wings/atmo/xeno.js?v=" + BUILD,
  "wings/atmo/zen.js?v=" + BUILD,
  "wings/gallery.js?v=" + BUILD,
  "wings/hall.js?v=" + BUILD,
  "wings/lab.js?v=" + BUILD,
  "wings/fx/engine.js?v=" + BUILD,
  "wings/fx/presets.js?v=" + BUILD,
  "wings/fx/ui.js?v=" + BUILD,
  "wings/music-engine.js?v=" + BUILD,
  "wings/scene-engine.js?v=" + BUILD,
  "wings/ui-sounds.js?v=" + BUILD,
  "wings/scene.js?v=" + BUILD,
  "wings/study.js?v=" + BUILD,
  "wings/themes.js?v=" + BUILD,
  "wings/themes/manifest.js?v=" + BUILD,
  "wings/themes/worlds.js?v=" + BUILD,
  "wings/vault.js?v=" + BUILD,
  "wings/simple.js?v=" + BUILD,
  "wings/health.js?v=" + BUILD,
  "wings/questions.js?v=" + BUILD,
  "wings/wants.js?v=" + BUILD,
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll([...SHELL_URLS, ...WING_URLS])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== SHELL && k !== DATA && k !== IMG && k !== AMB) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok) cache.put(req.url.split("?")[0], fresh.clone());
    return fresh;
  } catch (err) {
    const hit = await cache.match(req.url.split("?")[0]);
    if (hit) {   // offline: say so in a header, so the page never mistakes this saved copy for a fresh answer
      const h = new Headers(hit.headers); h.set("x-titan-from-cache", "1");
      return new Response(await hit.blob(), { status: hit.status, statusText: hit.statusText, headers: h });
    }
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) {
    if (cacheName === IMG) {   // Grok's review GRK-3-10: a re-cut photo has a new ?v=; drop the old copies of the same file so the cache never grows forever
      const path = new URL(req.url).pathname;
      for (const k of await cache.keys()) { const u = new URL(k.url); if (u.pathname === path && u.search !== new URL(req.url).search) await cache.delete(k); }
    }
    cache.put(req, res.clone());
  }
  return res;
}

/* Grok's review GRK-3-01: offline used to cover only the Hall. After each new data build the page asks for "titan:warm" and every coin-detail
   file, search and the owner questions are saved, so any coin opens offline, not only the ones viewed before. Missing files only; a new
   data build (index generated_at) refreshes them all. Photos stay "saved when first seen" unless the owner saves them all from Health. */
async function warmData(withPhotos) {
  const cache = await caches.open(DATA), scope = self.registration.scope;
  const abs = (u) => new URL(u, scope).href;
  let idx;
  try { const r = await fetch(abs("data/index.json"), { cache: "no-store" }); if (!r.ok) return { ok: false }; idx = await r.clone().json(); await cache.put(abs("data/index.json"), r); }
  catch (_e) { return { ok: false }; }
  const mark = abs("data/.warm-" + String(idx.generated_at || idx.ledger_version || "x").replace(/[^\w.-]/g, ""));
  const fresh = !(await cache.match(mark));
  const urls = ["data/search.json", "data/questions.json", "data/prices.json", "data/status.json", "data/wants.json"];
  for (const f of idx.flips || []) urls.push("data/detail/" + encodeURIComponent(f.d || "_misc") + ".json");
  let n = 0;
  for (const u of [...new Set(urls)]) {
    if (!fresh && await cache.match(abs(u))) continue;
    try { const r = await fetch(abs(u), { cache: "no-store" }); if (r.ok) { await cache.put(abs(u), r); n++; } } catch (_e) { /* offline again: keep what we have */ }
  }
  await cache.put(mark, new Response("1"));
  let p = 0;
  if (withPhotos) {
    const img = await caches.open(IMG);
    for (const f of idx.flips || []) {
      if (!f.thumb) continue;
      const u = abs(f.thumb);
      if (await img.match(u)) continue;
      try { const r = await fetch(u); if (r.ok) { await img.put(u, r); p++; } } catch (_e) { /* skip */ }
    }
  }
  return { ok: true, data: n, photos: p };
}

/* Health view: reply with the build and the cache names so the page can show what is really running. */
self.addEventListener("message", (e) => {
  if (e.data && (e.data.type === "titan:warm" || e.data.type === "titan:warm-photos")) {
    const port = e.ports && e.ports[0];
    e.waitUntil(warmData(e.data.type === "titan:warm-photos").then((r) => { if (port) port.postMessage(Object.assign({ type: e.data.type }, r)); }));
    return;
  }
  if (!e.data || e.data.type !== "titan:sw-info") return;
  const port = e.ports && e.ports[0], src = port || e.source;
  e.waitUntil((async () => {
    let names = [];
    try { names = await caches.keys(); } catch (_e) { /* ignore */ }
    if (src) src.postMessage({ type: "titan:sw-info", build: BUILD, caches: names });
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // shard images: browser HTTP cache
  if (url.pathname.includes("/art/splash/")) return;   // splash films: native range requests, never cached by the SW
  const path = url.pathname;
  if (path.endsWith("/version.json") || path.includes("/data/")) {
    e.respondWith(networkFirst(req, DATA));
  } else if (path.includes("/thumbs/") || path.includes("/photos/") || /\/art\/themes\/[^/]+-card\.webp$/.test(path)) {   // theme cards: cache on first view, not precached
    e.respondWith(cacheFirst(req, IMG));
  } else if (path.includes("/audio/ambience/")) {
    e.respondWith(cacheFirst(req, AMB));
  } else if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match("index.html", { ignoreSearch: true })));
  } else {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
