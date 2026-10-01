# Theme art + Themes picker (agent notes, 2026-10-01)

## What shipped
- **Photoreal art pipeline** `tools/art/` (Blender 5.0.1 via `pip install bpy pillow`, Cycles CPU, OpenImageDenoise):
  - `kit.py` shared helpers: materials (aged silver/gold/bronze coin with AO-driven toning + scratches, brass, velvet, marble with thin veins, walnut, glass, stone, emissive), lights/world/camera, mesh helpers, a real coin mesh (polar grid displaced by a PIL text/rays/laurel height map, reeded-style flat reverse), photographic post (bloom, chromatic fringe, vignette, grain), webp encoder with size caps.
  - `render_themes.py` one function per theme (`@theme("id", **post)`), CLI: `nice -n 10 python3 tools/art/render_themes.py --only kaleido --samples 64 --res 1600x1000` (`--draft` = 800x500 at 24 spp, `--all`). Writes `art/_masters/<id>.png` (gitignored), `art/themes/<id>.webp` (1600x1000) and `<id>-card.webp` (640x400).
  - `glints.py` seamless 5 s loop overlay (see below); `ui_test.js` (screenshots, page errors, horizontal scroll), `fps_test.js` (Hall scroll fps).
- **Prism (id `kaleido`)**: white beam into a crystal prism, spectrum fan, silver dollar (relief from a height map) on black obsidian, bokeh. Spectrum is a light-sheet mesh plus 13 narrow coloured spots (so the rainbow really lights the coin and floor). 1600x1000, 64 spp, 30 min wall time under load (about 12 CPU-min is the quiet-box figure for 800x500 drafts x4). `art/themes/kaleido.webp` 41 KB, card 11 KB.
- **Prism glints** `art/fx/kaleido-glints.webm`: 1280x720, 24 fps x 5 s, VP9, 75 KB, black background, for `mix-blend-mode: screen`. Loop is exact (all motion is sin/cos of the loop phase). Regenerate with `python3 tools/art/glints.py [crf]`. The FX agent only needs to play it; nothing wires it yet.
- **Themes tab** in Scene Studio (`wings/scene.js`, blocks marked `THEMES-TABS`): tabs Scenes | Themes | Sound at the top of the sheet; Themes is the default and what the scene-bar button and `#atmo` open (`TitanScene.open("themes")`). The old "Lighting" chip row is gone. The sound/mixer markup is only wrapped in a `Sound` panel and a `Scenes` panel; no sound code touched.
  - Cards: art card (lazy, async) or the old swatch, name, one-line mood, "Current" badge. Tap applies with a ~350 ms page cross-fade (View Transitions, fallback body fade, none under reduced motion).
  - `wings/themes/manifest.js` (data only, `TITAN_WORLDS`): `{ id, name, collection, mood, tier, art, tokens, fx, scene }` for all 20 atmospheres. `wings/themes/worlds.js` renders the grid (Signature cards first by collection, then Classic) and applies tokens. `styles/worlds.css` has the card and tab styles.
  - sw.js: new files in the shell precache; `art/themes/*-card.webp` is cache-first at runtime (cache on first view). Heroes are not cached.
  - `#atmo-sheet` is no longer reachable (Scene Studio replaces it); its markup is still read by scene.js for names, safe to delete later.
- **Hero backdrop hook is OFF** (`window.TITAN_WORLD_BACKDROP = false` in the manifest) because the layout redesign is pending. When true, only the active World's image is requested (card on phones, hero on large screens) and `.hero` gets a dark gradient over it. Delete the marked block in `styles/worlds.css` to remove. Hall scroll, Pixel 7 emulation, 4x CPU: 58.0 fps backdrop off, 55.6 fps on (kaleido). Text contrast over the art was not measured with `tools/themes/audit.js` (it skips photo backgrounds); the gradient is 66-100% of `--bg`.

## Tiers (honest status)
- Prism ships its new art but is still **tier "classic"** in the manifest: it keeps `styles/atmo/kaleido.css` (pink-orchid structural theme, mismatched with the new black/spectrum art). It is NOT a Signature World: no tokens-only palette, no FX preset, no recorded-ambience scene. Becoming Signature needs a tokens-only `kaleido` palette (near-black ground, one spectrum accent), the glints overlay player and a scene id.
- Everything else is Classic with its old swatch art. No new World ids were added (Fireside Den, Roman Treasury, Private Bank are pending, not in the picker).

## Not done / pending
- **Midnight Gallery (`afterhours`)**: scene is in `render_themes.py` (marble columns, vitrine, spot, mullioned moon window) but the 24 spp draft was not up to the bar (flat grey-blue floor, washed coin), so it is not rendered at full quality, not shipped, `art: null`. Next fixes: darker floor/less moon bounce, coin key light from the side for relief, remove glass, add haze.
- Fireside Den, Shipwreck, The Mint and the rest of the 20: not started.
- Render time was the limit: one 1600x1000 64 spp frame took ~30 min with the box shared. Budget 2-4 min/image is only realistic with no other agents and no volume/glass heavy scene; Prism uses glass + fog box and is slower. Use `--samples 32` plus OIDN for iteration.
- Known flaws in Prism: coin face is slightly glittery (bump scale in `coin_material` is a bit high), prism body reads dark/noisy, the incoming beam strip is crude at left. Dispersion inside the glass is not simulated (Cycles has none); the fan is art-directed.
- Contrast audit (`tools/themes/audit.js`) was not re-run: no token or atmosphere CSS changed.

## Tests (Playwright chromium, serviceWorkers blocked)
Pixel 7 and 1366x820: zero page errors, no horizontal scroll, Themes tab and 4 themes applied (kaleido, afterhours, glacier, neon). Screenshots and `contact.webp` in `notes/agents/theme-art/`.
