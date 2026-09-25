/* Titan Reliquary service worker · build tr11
   - App shell precached per build (versioned cache names; old caches deleted on activate)
   - version.json + data/*: network-first (no-store) so a new publish always wins; cache = offline fallback
   - thumbs/: cache-first (URLs carry ?v=<file hash>, so a changed image is a new URL)
   NOTE: publish_all.sh regenerates the build stamp on merge — update BUILD + SHELL_URLS then. */
const BUILD = "tr19";
const SHELL = "titan-shell-" + BUILD;
const DATA = "titan-data-" + BUILD;
const IMG = "titan-thumbs-v1";
const SHELL_URLS = ["./", "index.html", "app.js?v=" + BUILD, "styles.css?v=" + BUILD, "manifest.webmanifest",
  "icons/icon-192.png", "icons/apple-touch-icon.png", "favicon.svg",
  "fonts/Fraunces-500.woff2", "fonts/Fraunces-600.woff2", "fonts/Fraunces-700.woff2",
  "js/playlist.js?v=" + BUILD, "audio.js?v=" + BUILD, "ambient.js?v=" + BUILD];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
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
