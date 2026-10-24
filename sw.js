/* Titan Reliquary service worker · build tr256
   - App shell precached per build (versioned cache names; old caches deleted on activate)
   - version.json + data/*: network-first (no-store) so a new publish always wins; cache = offline fallback, and after 4 s on a hung connection
   - audio/ambience/ + audio/cuts/: runtime cache-first (filled the first time a sound is played; not precached)
   - thumbs/: cache-first (URLs carry ?v=<file hash>, so a changed image is a new URL)
   NOTE: publish_all.sh regenerates the build stamp on merge — update BUILD + SHELL_URLS then. */
const BUILD = "tr256";
const SHELL = "titan-shell-" + BUILD;
const DATA = "titan-data-" + BUILD;
const IMG = "titan-thumbs-v1";
const AMB = "titan-ambience-v1"; // real recordings: cached on first play (too big to precache), kept across builds
const SHELL_URLS = ["./", "index.html", "atlas.js?v=" + BUILD, "js/app-motion.js?v=" + BUILD, "js/app-format.js?v=" + BUILD, "js/app-data.js?v=" + BUILD, "js/app-insights.js?v=" + BUILD, "js/app-overlay.js?v=" + BUILD, "js/app-atmo-css.js?v=" + BUILD, "js/app-ui.js?v=" + BUILD, "js/app-palette.js?v=" + BUILD, "app.js?v=" + BUILD, "spatial.js?v=" + BUILD, "deepzoom.js?v=" + BUILD, "styles.css?v=" + BUILD, "js/motion-splash.js?v=" + BUILD, "js/intros/kit.js?v=" + BUILD, "js/intros/zen.js?v=" + BUILD, "js/intros/arcade.js?v=" + BUILD, "js/intros/construct.js?v=" + BUILD, "js/intros/neon.js?v=" + BUILD, "js/intros/notepad.js?v=" + BUILD, "js/intros/terminal.js?v=" + BUILD, "js/intros/valhalla.js?v=" + BUILD, "js/intros/xeno.js?v=" + BUILD, "js/intros/marbled.js?v=" + BUILD, "js/intros/drafting.js?v=" + BUILD, "js/intros/solaris.js?v=" + BUILD, "js/intros/conservator.js?v=" + BUILD, "js/intros/cathedral.js?v=" + BUILD, "js/intros/dynasty.js?v=" + BUILD, "js/intros/alchemist.js?v=" + BUILD, "js/intros/cursedwing.js?v=" + BUILD, "js/intros/samadhi.js?v=" + BUILD, "js/intros/abyss.js?v=" + BUILD, "js/intros/bauhaus.js?v=" + BUILD, "js/intros/odyssey.js?v=" + BUILD, "js/intros/kaleido.js?v=" + BUILD, "js/intros/y2k.js?v=" + BUILD, "js/intros/ferro.js?v=" + BUILD, "js/intros/lumen.js?v=" + BUILD, "js/intros/rift.js?v=" + BUILD, "js/intros/horizon.js?v=" + BUILD, "js/intros/kintsugi.js?v=" + BUILD, "js/intros/supercell.js?v=" + BUILD, "js/intros/tourbillon.js?v=" + BUILD, "js/intros/darkroom.js?v=" + BUILD, "js/intros/silverscreen.js?v=" + BUILD, "js/intros/canopy.js?v=" + BUILD, "js/intros/silkroad.js?v=" + BUILD, "js/intros/diorama.js?v=" + BUILD, "js/intros/contour.js?v=" + BUILD, "js/intros/afterhours.js?v=" + BUILD, "js/intros/pulp.js?v=" + BUILD, "js/intros/glacier.js?v=" + BUILD, "js/intros/papercut.js?v=" + BUILD, "js/intros/colossus.js?v=" + BUILD, "js/intros/freefall.js?v=" + BUILD, "js/intros/sketch.js?v=" + BUILD, "js/intros/banknote.js?v=" + BUILD, "splash.js?v=" + BUILD, "splash.css?v=" + BUILD, "manifest.webmanifest",
  "icons/icon-192.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "favicon.svg",
  "fonts/Fraunces-500.woff2", "fonts/Fraunces-600.woff2", "fonts/Fraunces-700.woff2" , "fonts/Yellowtail-400.woff2",
  "js/three.min.js", "js/OrbitControls.js", "js/fflate.min.js", "js/USDZExporter.js", "js/qrcode.min.js", "js/openseadragon.min.js",
  "js/playlist.js?v=" + BUILD, "audio.js?v=" + BUILD, "ambient.js?v=" + BUILD, "audio/scape/bridge.js?v=" + BUILD];
const WING_URLS = [
  "audio/scape/engine.js?v=" + BUILD,
  "audio/scape/presets.js?v=" + BUILD,
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
  "styles/atmo/arcade.css?v=" + BUILD,
  "styles/atmo/pulp.css?v=" + BUILD,
  "styles/atmo/drafting.css?v=" + BUILD,
  "styles/atmo/diorama.css?v=" + BUILD,
  "styles/atmo/bauhaus.css?v=" + BUILD,
  "styles/atmo/terminal.css?v=" + BUILD,
  "styles/atmo/canopy.css?v=" + BUILD,
  "styles/atmo/silverscreen.css?v=" + BUILD,
  "styles/atmo/darkroom.css?v=" + BUILD,
  "styles/atmo/tourbillon.css?v=" + BUILD,
  "styles/atmo/supercell.css?v=" + BUILD,
  "styles/atmo/kintsugi.css?v=" + BUILD,
  "styles/atmo/horizon.css?v=" + BUILD,
  "styles/atmo/rift.css?v=" + BUILD,
  "styles/atmo/lumen.css?v=" + BUILD,
  "styles/atmo/ferro.css?v=" + BUILD,
  "styles/atmo/marbled.css?v=" + BUILD,
  "styles/atmo/cathedral.css?v=" + BUILD,
  "styles/atmo/contour.css?v=" + BUILD,
  "styles/atmo/banknote.css?v=" + BUILD,
  "styles/atmo/freefall.css?v=" + BUILD,
  "styles/atmo/sketch.css?v=" + BUILD,
  "styles/atmo/papercut.css?v=" + BUILD,
  "styles/atmo/y2k.css?v=" + BUILD,
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
  "styles/style-layer.css?v=" + BUILD,
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
  "wings/fx/styles-a.js?v=" + BUILD,
  "wings/fx/styles-b.js?v=" + BUILD,
  "wings/fx/styles-c.js?v=" + BUILD,
  "wings/fx/styles-d.js?v=" + BUILD,
  "wings/fx/styles-e.js?v=" + BUILD,
  "wings/fx/styles-n.js?v=" + BUILD,
  "fx/kit.js?v=" + BUILD,
  "fx/atmos.js?v=" + BUILD,
  "fx/particles-gpu.js?v=" + BUILD,
  "fx/fluid.js?v=" + BUILD,
  "fx/post.js?v=" + BUILD,
  "fx/volume.js?v=" + BUILD,
  "fx/metal.js?v=" + BUILD,
  "fx/rd.js?v=" + BUILD,
  "fx/demo.html?v=" + BUILD,
  "fx/themes.js?v=" + BUILD,
  "fx/ferro.js?v=" + BUILD,
  "fx/lumen.js?v=" + BUILD,
  "fx/rift.js?v=" + BUILD,
  "fx/horizon.js?v=" + BUILD,
  "fx/kintsugi.js?v=" + BUILD,
  "fx/supercell.js?v=" + BUILD,
  "fx/tourbillon.js?v=" + BUILD,
  "fx/darkroom.js?v=" + BUILD,
  "fx/silverscreen.js?v=" + BUILD,
  "fx/canopy.js?v=" + BUILD,
  "fx/scenes-nms.js?v=" + BUILD,
  "fx/textures.css?v=" + BUILD,
  "wings/fx/ui.js?v=" + BUILD,
  "wings/music-recorded.js?v=" + BUILD,
  "wings/score.js?v=" + BUILD,
  "wings/scene-engine.js?v=" + BUILD,
  "wings/ui-sounds.js?v=" + BUILD,
  "wings/relief.js?v=" + BUILD,
  "wings/quality.js?v=" + BUILD,
  "styles/quality.css?v=" + BUILD,
  "wings/cutouts.js?v=" + BUILD,
  "photos/cut/manifest.json?v=" + BUILD,
  "shells/shell.js?v=" + BUILD,
  "shells/field/field.js?v=" + BUILD,
  "shells/field/field.css?v=" + BUILD,
  "shells/cabinet/cabinet.js?v=" + BUILD,
  "shells/cabinet/cabinet.css?v=" + BUILD,
  "shells/exp/kit.js?v=" + BUILD,
  "shells/exp/exp.css?v=" + BUILD,
  "shells/hologram/hologram.js?v=" + BUILD,
  "shells/hologram/hologram.css?v=" + BUILD,
  "shells/hologram/sim.js?v=" + BUILD,
  "shells/exp/post.js?v=" + BUILD,
  "shells/orrery/orrery.js?v=" + BUILD,
  "shells/orrery/orrery.css?v=" + BUILD,
  "shells/deck/deck.js?v=" + BUILD,
  "shells/deck/deck.css?v=" + BUILD,
  "themes/manifest.json?v=" + BUILD,
  "wings/coin3d.js?v=" + BUILD,
  "wings/signature/core.js?v=" + BUILD,
  "wings/scene.js?v=" + BUILD,
  "wings/study.js?v=" + BUILD,
  "wings/themes.js?v=" + BUILD,
  "wings/themes/manifest.js?v=" + BUILD,
  "wings/themes/worlds.js?v=" + BUILD,
  "wings/vault.js?v=" + BUILD,
  "wings/simple.js?v=" + BUILD,
  "wings/health.js?v=" + BUILD,
  "wings/questions.js?v=" + BUILD,
  "wings/scan.js?v=" + BUILD,
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

/* Network first, but never wait forever: on a weak signal that connects and then sends nothing ("lie-fi"), a fetch can hang for
   minutes. After WAIT_MS the saved copy (if there is one) answers; the network answer still lands in the cache for next time. */
const WAIT_MS = 4000;
async function networkFirst(req, cacheName, e) {
  const cache = await caches.open(cacheName);
  const key = req.url.split("?")[0];
  const net = fetch(req, { cache: "no-store" }).then((fresh) => {
    if (fresh && fresh.ok) return cache.put(key, fresh.clone()).catch(() => {}).then(() => fresh);
    return fresh;
  });
  if (e) e.waitUntil(net.catch(() => {}));
  const saved = async () => {
    const hit = await cache.match(key);
    if (!hit) return null;   // offline: say so in a header, so the page never mistakes this saved copy for a fresh answer
    const h = new Headers(hit.headers); h.set("x-titan-from-cache", "1");
    return new Response(await hit.blob(), { status: hit.status, statusText: hit.statusText, headers: h });
  };
  let timer;
  const slow = new Promise((_, no) => { timer = setTimeout(() => no(new Error("slow network")), WAIT_MS); });
  try {
    return await Promise.race([net, slow]);
  } catch (err) {
    const hit = await saved();
    if (hit) return hit;
    return net;      // nothing saved yet: keep waiting for the network (or its error)
  } finally { clearTimeout(timer); }
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
  if (url.pathname.includes("/audio/music/") && !url.pathname.endsWith("manifest.json")) return;   // recorded music streams (range requests); offline = no music (never generated)
  const path = url.pathname;
  if (path.endsWith("/version.json") || path.includes("/data/")) {
    e.respondWith(networkFirst(req, DATA, e));
  } else if (path.includes("/thumbs/") || path.includes("/photos/") || /\/art\/themes\/[^/]+-card\.webp$/.test(path)) {   // theme cards: cache on first view, not precached
    e.respondWith(cacheFirst(req, IMG));
  } else if (path.includes("/audio/ambience/") || path.includes("/audio/cuts/")) {   // recordings and short cuts from recordings: cached the first time they play
    e.respondWith(cacheFirst(req, AMB));
  } else if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, SHELL, e).catch(() => caches.match("index.html", { ignoreSearch: true })));
  } else {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
