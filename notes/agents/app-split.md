<!-- doc-status: current; normative: yes -->
# Splitting app.js into modules (fix list #32)

`app.js` is one ~7,300-line function where every section shares closure variables, so one fix can break another wing.
Rule: **step by step, no rewrite.** Each step moves one self-contained block into its own file, keeps behaviour identical,
and must pass `python3 tools/smoke/smoke.py` (phone + desktop, offline included) before it ships.

## Pattern
- A moved block becomes a file under `js/` that registers itself on one global (`window.TitanAppUI`, later `window.TitanAppX`).
- If app.js calls it, the file loads **before** app.js and app.js reads it with a no-motion fallback, so a missing file never breaks the app.
- If it needs app.js helpers, it reaches them only through `window.__galleryBridge` (already the public surface; add to it, never to globals).
- Add the file to `index.html` (with `?v=trNN`) and to `sw.js` SHELL_URLS / precache, then run the smoke test.

## Done
1. **2026-10-07 (tr96): `js/app-ui.js`**: background grain texture, gold-dust motes, count-up numbers, reveal-on-scroll, Konami easter egg (~80 lines out).
2. **2026-10-07 (tr97): `js/app-format.js`** (`window.TitanFormat`: `$`, `$$`, number/money formatters, `esc`) and **`js/app-insights.js`** (`window.TitanInsights`: collection intelligence + shooting sessions, pure functions of the flip list; app.js passes `vault.flips`).
3. **2026-10-07 (tr97): `js/app-atmo-css.js`** (`window.TitanAtmoCss`: loads only the active atmosphere stylesheet, `window.TitanAtmoReady`) and **`js/app-overlay.js`** (`window.TitanOverlay`: remember/restore focus, Tab focus trap, topmost overlay, offline banner). The sheets themselves (atmosphere, keys, palette) stay in app.js. Fixed on the way: Tab could leave the search palette when focus was on an element outside its focusable list (pre-existing).
   app.js 7,3xx -> 7,119 lines. Helpers no longer have fallbacks: app-format.js is required (it is in the precache like app.js).

## Next candidates (smallest dependency surface first)
4. Search palette (Ctrl/Cmd-K): needs `ensureSearch`, `openDrawer`: move with a bridge call.
5. Atmosphere system (~230 lines): theme switching; touches Scene Studio; move after 3.
6. Collection intelligence + shooting sessions (~140 lines): pure functions of the flip list.
7. The big blocks last, one at a time, each behind its own smoke check: slabs and coin drawings (~1,700 lines), the cover-flow carousel (~1,100), the Vault (~1,650), the album binders (~110) and the rest of the wings and dossier (~1,270).
