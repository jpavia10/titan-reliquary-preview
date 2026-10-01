# TitanFX: GPU overlay engine (fx-v2)

Owner feedback: "Effects are super basic... other ways to render more intense and higher quality overlays?" This replaces the 2D-canvas
weather in `ambient.js` with one full-screen WebGL2 canvas and 17 fragment-shader / GPU-instanced presets.

## Files
| File | What |
|---|---|
| `wings/fx/engine.js` | Engine. One canvas `#titan-fx` (fixed, `pointer-events:none`, `aria-hidden`, z-index 7), preset registry, adaptive quality, lightning, video overlay. Extends the existing `window.TitanFX` that `app.js` already exports (`canvasLoop`, `clear`, `matrixRain`, `particles`, `live` keep working). |
| `wings/fx/presets.js` | The presets (GLSL ES 3.00) and the World alias table. |
| `wings/fx/ui.js` | Atmosphere + scene -> preset maps, `TitanFXUI.mount(sheet)` (Effects control in Scene Studio Settings), `TitanFXUI.setWorld({fx, intensity})`. |
| `styles/fx.css` | Appended block: hides the legacy `#rain-canvas` / `#lightning-flash` / `#ember-layer` while TitanFX runs; Effects control styles. |
| `tools/fx/perf.js` | Playwright perf + health test (fps per preset vs off, 30-switch leak test, hidden test). |
| `index.html`, `sw.js` | Three script tags before `scene-engine.js`; three entries in `WING_URLS` (all small JS; no `?v=` bump). |
| `wings/scene.js` | ONE line (marked `TitanFX hook`) after `document.body.appendChild(sheet)`. |
| `ambient.js` | ONE change in `checkCanvasState()`: its 2D canvas stays off while `TitanFX.owns()` (WebGL2 available). If WebGL2 is missing, `owns()` is false and the old canvas weather runs exactly as before. |

## API
```js
TitanFX.play('storm', { intensity: 0.9 });   // any preset id or alias; "a*0.6+b" composites (weights after *)
TitanFX.stop(1.2);                            // fade seconds; stop(0) frees all GL resources at once
TitanFX.setIntensity(0.7);                    // user master 0..1 (multiplies every preset)
TitanFX.setLevel('off'|'subtle'|'full');      // subtle = half strength + no film; full adds film
TitanFX.setFilm(0.5);                         // grain / vignette / gate weave / halation finishing layer
TitanFX.playVideo('art/fx/smoke.webm', { blend: 'screen', opacity: .5 });  // optional art; missing file = silent no-op
TitanFX.setVideoMap({ 'midnight-gallery': 'art/fx/dust.webm' });          // auto-play per preset id
TitanFX.thunder({ delay: 0, strength: 1 });   // same as window.dispatchEvent(new CustomEvent('titan:thunder', {detail}))
TitanFX.supported / owns() / stats() / state() / presets()
```
Settings persist in `localStorage['titan.fx.v1']` (level, intensity, film); per-preset quality step in `titan.fx.q.v1`.

### Presets by id (what a World manifest can reference: `TitanFX.play('<id>')`)
Base: `rain-on-glass`, `storm`, `glass-frost`, `snow`, `embers`, `fog`, `godrays`, `dust`, `caustics`, `aurora`, `stars`, `prism`, `smoke`, `incense`, `candle`, `lanterns`, `scanlines`, plus `film` (finishing layer, added automatically at Full).
Aliases (composites): `light-rain`, `snow-on-glass` (frost + snow), `hearth`, `mint`, `hoard-hall`, `torch`, `lantern-sway`, `polar`, `observatory`, `caravanserai`, `blue-note`, `alchemist`, `black-site`, `temple`, `night-city`, `shipwreck`, `midnight-gallery`.

| World (theme-pot.md) | FX asked for | Preset id |
|---|---|---|
| Midnight Gallery | dust in light shafts, film | `midnight-gallery` (= `dust`) |
| Conservator's Bench | none / dust | `dust` (low) |
| The Mint | embers, heat shimmer | `mint` (`embers` + fog) |
| Hoard Hall | embers + snow at edges | `hoard-hall` |
| Blue Note | smoke, film | `blue-note` (`smoke` + light rain) |
| Captain's Cabin | lantern sway light, dust | `lantern-sway` (`candle` + `dust`) |
| Shipwreck | caustics, particulate | `shipwreck` (`caustics` + `dust`) |
| Prism | prism glints, light leaks | `prism` |
| Night City | rain on glass | `night-city` |
| Black Site | scanlines, fog | `black-site` (`scanlines`: fog + sweep band + scanlines) |
| Forbidden Wing | candle flicker, fog | `candle*1+fog*0.5` |
| Observatory | stars | `observatory` |
| Alchemist's Study | smoke, sparks | `alchemist` |
| Polar Vault | aurora, snow | `polar` |
| Imperial Treasury | drifting lanterns, petals | `lanterns` |
| Temple Garden | light rain, incense | `temple` |
| Caravanserai | stars, lamp flicker | `caravanserai` |
| Fireside Den | embers, snow on glass | embers + glass-frost + snow (3 layers) |
| Roman Treasury | dust, torch light | `torch` |
| Private Bank / Clear | none | `null` (no overlay) |

`TitanFXUI.map.atmo` already lists the 20 current atmospheres AND the World ids above, so switching `data-atmo` to a World id works with no further wiring; a World can also force its own preset with `TitanFXUI.setWorld({ fx: '<id>', intensity })`.
Scenes (`TitanFXUI.map.scene`): Quiet study `dust`, Rainy archive `rain-on-glass`, Midnight vault `fog`, Hearth `hearth`, Lo-fi evening `night-city`, Night garden `stars+fog`, Snowed in `snow-on-glass`, Thunderstorm `storm`. A scene wins until the lighting is changed by hand.

## How it renders
- One `WebGL2` context, attribute-less drawing (`gl_VertexID` full-screen triangle, `gl_InstanceID` for particles): nothing is uploaded, no buffers to leak.
- Premultiplied alpha: alpha 0 with rgb > 0 = additive light, rgb 0 with alpha > 0 = darkening. Presets read the theme (`--bg`, `--ink`, `--gold`) and `uLight` so the same preset works on dark and light atmospheres.
- Rain on glass (own implementation): stick-slip sliding drops, trails that wipe condensation clear, beads left behind, drops grow when they swallow a bead, refraction of a procedural bokeh backdrop built from the theme palette, specular + rim shading. Storm adds wind-driven streaks, a jagged forked bolt (SDF) and a multi-stroke flash envelope that lights the haze and the lenses.
- Embers / snow / dust / lanterns / marine particles are instanced quads (160..1300 instances by quality and intensity).
- DPR capped at 1.5 (`setDprCap`), frame cap about 60 fps (not 120 on high-refresh phones), rAF stops while the tab is hidden (visual only, audio never touched), `prefers-reduced-motion` renders ONE static frame (live-follows the OS setting), context loss is handled, and when idle the canvas and context are released.
- Adaptive quality ladder `[scale, layers]`: 1/3, .85/2, .7/2, .6/1, .5/1, .42/0. First 2 s of every new preset: frame cost is measured with a 1x1 `readPixels` (forces the GPU to finish, so it is the honest cost, not the rAF interval); a median over 12 ms steps down. The result is remembered per preset on this device. A 2.5 s watchdog also steps down if the average rAF interval stays over 30 ms.
- Lightning: `titan:thunder` (`detail: {delay (ms), strength}`) fires the flash on presets with `lightning: true` (storm). The audio engine should dispatch it when the thunder sound STARTS (lightning leads thunder; use `delay` to model distance). If no event arrives for 60 s, the engine flashes on its own every 6-18 s, so a silent Thunderstorm still looks right. (`scene-engine.js` is owned by another agent and was not touched; one `window.dispatchEvent(new CustomEvent("titan:thunder",{detail:{strength}}))` in its thunder bed hooks it up; check tr61's ambience v3 for a thunder hook before adding one.)

## Readability (WCAG AA)
Overlays sit above the page, so two things keep text AA:
1. **Text-safe mask (layout-agnostic).** The engine walks the DOM text nodes (generic `TreeWalker`, skips `aria-hidden`, scripts, SVG, the studio sheet), takes each node's `Range` rect, paints them into a small (1/4 resolution) canvas with soft edges, and uploads it as one R/G/B texture (`uSafe`). Every preset's final colour is multiplied by `1 - 0.7 * mask`, so rain, haze, light and flash recede around text and play in the gaps. The mask rebuilds on scroll (120 ms), resize, `titan:atmo`, `hashchange`, DOM mutations (700 ms) and every 1.5 s while running, scans text nodes at most every 2.5 s, caps at 3000 nodes. It knows nothing about the Hall or any wing, so it survives the pending layout change. `TitanFX.setTextSafe(0..0.95)` changes the strength, `refreshSafe()` forces a rebuild.
2. **Low base alpha** (average alpha well under 0.1 outside particles) and light atmospheres get 30% less strength and 55% less film (`theme.light`), because dark text on a pale ground has little contrast to spare.

Check: Hall, 26 visible text runs (desktop) / 8 (phone), the scrolling ticker excluded. `tools/fx/contrast.py` compares each run's fg/bg (fg = mean of text pixels, bg = median of the rest) in an OFF screenshot and in the ON screenshot of each preset. "Cross" = passed AA OFF (4.5, or 3 for large/bold text) and fails ON.

| | before the mask (alpha caps only) | with the mask |
|---|---|---|
| Dark atmosphere, desktop, mean ON/OFF ratio | 0.80 to 1.08 (rain 0.90, storm 0.80, godrays 0.88) | 0.94 to 0.99 |
| Dark atmosphere, worst single run | 0.485 (dust) | 0.84 (storm, during a flash) |
| Light atmosphere (conservator), runs crossing below AA | 3 to 7 per preset | 0 |
| Dark phone | 0 crossing, worst 0.52 | 0 crossing, worst 0.75 |

Dark desktop with the mask (`afterhours`): every preset has min ratio 0.84 to 0.96. The ONLY run that crosses is the card label "TOTAL ESTIMATED VALUATION", whose own contrast is 4.53:1 (it passes AA by 0.03); ON it measures 4.34 to 4.50 in 10 of 17 presets (embers, snow, caustics, aurora, stars, prism, candle: 0 crossings). Raising `setTextSafe` to 0.9 removes it at the cost of more visible "cut-outs"; the label itself needs a slightly lighter token (the Hall's small caps sit at 4.5 to 5.0 on the light atmosphere too). Not changed here.

## Performance
Software GL only (no GPU in the container), shared 4-CPU box at load average about 14 (two Blender renders, other agents' browsers), so absolute numbers are meaningless; `tools/fx/perf.js` prints them and compares with "off".

| | off | with a preset (adaptive quality) |
|---|---|---|
| Desktop 1366x820 (rAF fps, mean of 16 presets) | 9.4 | 10.9 to 14.3; every preset settles at scale 0.42 / layers 0 (storm 0.5 / 1) within the 2 s calibration |
| Pixel 7 emulation 412x915 @2.625 (DPR capped 1.5), 8 presets | 50.1 | 15.5 (aurora), 17.8 (rain, storm), 18.4 (caustics), 21 (smoke), 24 (fog), 27 (embers, snow) |

Reading it: the desktop baseline is already starved by the box, so the overlay is within noise of off there; on the phone profile the CPU rasteriser pays the full cost of each shader at the floor step (260x575 px). That is the expected SwiftShader result; on an Adreno 750 these shaders (1 to 3 passes, no texture reads besides the 1/4-res mask) are a few milliseconds at 1.5 DPR. First priority on a real device: run `tools/fx/perf.js` against the deployed site and look at `scale`/`quality` per preset; anything stuck at step 0 is cheap, anything dropping to step 3+ needs a lighter shader.

Health checks (same script, both viewports): 
- **No page errors, no shader compile warnings** (all 17 presets + 17 aliases; the harness fails on any `TitanFX` console message).
- **30 preset switches leak nothing:** after 30 `play()` calls, 2 live programs on desktop and 3 on phone (the active preset's passes + film), created minus deleted equals live; texture count 1; after `stop(0)`: 0 programs, 0 textures, `hasGL: false` (the canvas and context are released, not just hidden).
- **Hidden tab:** `running` goes false on `visibilitychange` (rAF stops, video pauses) and true again on return. Audio is never touched.
- **Reduced motion:** one static frame (frozen time per preset), live-follows the OS setting; the loop and the video do not run.
- Frame cost per preset is also measured by the engine itself (1x1 `readPixels` after the draw); the numbers above come from rAF.


## Screenshots
`notes/agents/fx-v2/<preset>-<desktop|phone>-<atmosphere>.webp` (Hall, `afterhours` dark; selected presets also over `conservator`, the light paper atmosphere). Shots are taken at the engine's quality step 2 (0.7 render scale, 2 layers; `TitanFX.setQuality(2)`) because the container has no GPU, and are therefore a little softer than a phone would show. 41 files: 17 presets on desktop and phone over the dark Hall, 7 over the light one. Film is on in all of them. Tools: `tools/fx/shots.js`, `tools/fx/contrast.py`.

## Merge with tr61 (Themes tab) and the video overlay
- Merged `origin/main` (tr61). The hook line sits right after the sheet markup, so `TitanFXUI.mount` puts the Effects control (Off / Subtle / Full + Strength) at the top of the Sound tab's Settings panel and hides the old "Show falling rain..." switch.
- A World from `TitanWorlds` with a non-null `fx` (and optional `fxIntensity`, `fxVideo`) wins over the table in `ui.js`; the manifest's `fx: null` entries fall back to the table, which already covers the 20 atmosphere ids and the Worlds ids.
- `kaleido` / `prism` plays `art/fx/kaleido-glints.webm` through `TitanFX.playVideo` (screen blend, opacity .55, muted loop). Checked in Chromium: `readyState` 4, playing, removed on switching to another atmosphere, no errors. The file (75 KB) is not in the service-worker precache (not a small JS/CSS file): offline it is simply absent and the WebGL layers carry the look.

## Not verified / open
- No real GPU here: every timing is SwiftShader on a shared 4-CPU box (load average about 14 with two Blender jobs). Use it to compare presets and "off", not as absolute fps. On the S24 Ultra expect the adaptive step to stay at 1/3.
- Compile time is large on SwiftShader (about 10 s for the rain shaders); on a GPU it is milliseconds, and `KHR_parallel_shader_compile` is used where present so first play does not block the main thread.
- The text-safe mask makes effects recede around text by design; on very text-dense pages (Gallery tables) the overlay will be mostly in the gaps. `setTextSafe(0.5)` shows more of it.
- Rain and glass cannot blur the page behind them (no DOM capture in zero-build); the "glass" is condensation haze + refractive lenses over a procedural bokeh built from the theme colours.
- `titan:thunder` is not yet dispatched by `scene-engine.js` (see above). Video overlay (`playVideo`) is wired and a no-op when the file is absent; no `art/fx/*.webm` exists yet.
- Heat shimmer is a rising warm haze + wavering light bands, not true refraction of the page (same reason).
