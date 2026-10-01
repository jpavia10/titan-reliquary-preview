/* Titan Reliquary service worker · build tr57
   - App shell precached per build (versioned cache names; old caches deleted on activate)
   - version.json + data/*: network-first (no-store) so a new publish always wins; cache = offline fallback
   - thumbs/: cache-first (URLs carry ?v=<file hash>, so a changed image is a new URL)
   NOTE: publish_all.sh regenerates the build stamp on merge — update BUILD + SHELL_URLS then. */
const BUILD = "tr57";
const SHELL = "titan-shell-" + BUILD;
const DATA = "titan-data-" + BUILD;
const IMG = "titan-thumbs-v1";
const SHELL_URLS = ["./", "index.html", "atlas.js?v=" + BUILD, "app.js?v=" + BUILD, "spatial.js?v=" + BUILD, "deepzoom.js?v=" + BUILD, "styles.css?v=" + BUILD, "splash.js?v=" + BUILD, "splash.css?v=" + BUILD, "manifest.webmanifest",
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
  "styles/slab-legibility.css?v=" + BUILD,
  "styles/study.css?v=" + BUILD,
  "styles/table.css?v=" + BUILD,
  "styles/themes.css?v=" + BUILD,
  "styles/vault.css?v=" + BUILD,
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
  "wings/study.js?v=" + BUILD,
  "wings/themes.js?v=" + BUILD,
  "wings/vault.js?v=" + BUILD];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll([...SHELL_URLS, ...WING_URLS])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== SHELL && k !== DATA && k !== IMG) await caches.delete(k);
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
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // shard images: browser HTTP cache
  const path = url.pathname;
  if (path.endsWith("/version.json") || path.includes("/data/")) {
    e.respondWith(networkFirst(req, DATA));
  } else if (path.includes("/thumbs/")) {
    e.respondWith(cacheFirst(req, IMG));
  } else if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match("index.html", { ignoreSearch: true })));
  } else {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
