/* Titan Reliquary · the data layer shared by app.js, the Gallery wing and the coin view (fix list #32, step 5; notes/agents/app-split.md).
   Loaded before app.js. One place that knows how the app reads its generated files:
     TitanData.fetchJson(url)          a fresh copy (no-store + a cache-busting query); the service worker answers from its cache offline
     TitanData.details(getFlips)       the per-country detail cache: .ensure(scan) merges data/detail/{bucket}.json into the lean flip once,
                                       .clear() forgets everything (a new publish), .map is the Map itself (the Gallery bridge reads it)
   No state beyond the caches it is asked to create. */
(() => {
  "use strict";
  async function fetchJson(url) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
    return r.json();
  }
  function details(getFlips) {
    const map = new Map();                      // detail bucket -> {scan: full card}
    const inflight = new Map();                 // bucket -> promise: two taps on one country fetch it once
    async function ensure(scan) {
      const lean = (getFlips() || []).find((f) => f.scan === scan);
      if (!lean || lean._full) return lean;
      const bucket = lean.d || "_misc";
      if (!map.has(bucket)) {
        if (!inflight.has(bucket)) inflight.set(bucket, fetchJson(`data/detail/${encodeURIComponent(bucket)}.json`).finally(() => inflight.delete(bucket)));
        map.set(bucket, await inflight.get(bucket));
      }
      const full = map.get(bucket)[scan];
      if (full) Object.assign(lean, full, { _full: true });
      return lean;
    }
    return { map, ensure, clear: () => { map.clear(); inflight.clear(); } };
  }
  window.TitanData = { fetchJson, details };
})();
