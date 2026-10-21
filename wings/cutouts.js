/* TitanCutouts (Grok 2026-10-20): shared service. Maps a coin photo to its alpha cutout (made by tools/photos/cutouts.py), so
   coins can be drawn as real sprites that overlap, cast shadows and sit at depth. Falls back to the original photo when a
   cutout failed its quality check or the manifest is not loaded yet.
   API: TitanCutouts.ready() -> Promise; .src(photoUrl, {thumb}) -> url; .has(photoUrl) -> bool */
(function () {
  "use strict";
  let rows = null, p = null;
  const stemOf = (u) => { const m = String(u || "").match(/photos\/p1\/([^/?#]+)\.webp/); return m ? m[1] : null; };
  function ready() { return (p = p || fetch("photos/cut/manifest.json?v=" + (window.TITAN_BUILD || "")).then((r) => r.json()).then((m) => (rows = m.photos || {})).catch(() => (rows = {}))); }
  function has(u) { const s = stemOf(u), r = rows && s && rows[s]; return !!(r && r.ok); }
  function src(u, o) { const s = stemOf(u), r = rows && s && rows[s]; if (!r || !r.ok) return u; return (o && o.thumb ? r.thumb : r.file) + "?v=" + r.v; }
  window.TitanCutouts = { ready, has, src, _rows: () => rows };
})();
