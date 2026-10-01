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
- Lightning: `titan:thunder` (`detail: {delay (ms), strength}`) fires the flash on presets with `lightning: true` (storm). The audio engine should dispatch it when the thunder sound STARTS (lightning leads thunder; use `delay` to model distance). If no event arrives for 60 s, the engine flashes on its own every 6-18 s, so a silent Thunderstorm still looks right. (`scene-engine.js` is owned by another agent and was not touched; one `window.dispatchEvent(new CustomEvent("titan:thunder",{detail:{strength}}))` in its thunder bed hooks it up.)

## Readability (WCAG AA)
Overlays sit above content, so alpha is kept low and never reaches solid over text. Check = Hall, desktop, `afterhours`: 25 visible text runs per preset (ticker excluded, it scrolls); measured fg/bg from the OFF and ON screenshots (`contrast.py` in this note's workflow: fg = mean of text pixels, bg = median of the rest). A run "fails" only if it passed AA OFF and fails ON.

CONTRAST_TABLE

## Performance
PERF_TABLE

## Screenshots
`notes/agents/fx-v2/<preset>-<desktop|phone>-<atmosphere>.webp` (Hall, `afterhours` dark; selected presets also over `conservator`, the light paper atmosphere). Shots use the engine's quality step 3 (0.7 render scale, 2 layers) because the container has no GPU.

## Not verified / open
- No real GPU here: every timing is SwiftShader on a shared 4-CPU box (load average about 14 with two Blender jobs). Use it to compare presets and "off", not as absolute fps. On the S24 Ultra expect the adaptive step to stay at 1/3.
- Compile time is large on SwiftShader (about 10 s for the rain shaders); on a GPU it is milliseconds, and `KHR_parallel_shader_compile` is used where present so first play does not block the main thread.
- Rain and glass cannot blur the page behind them (no DOM capture in zero-build); the "glass" is condensation haze + refractive lenses over a procedural bokeh built from the theme colours.
- `titan:thunder` is not yet dispatched by `scene-engine.js` (see above). Video overlay (`playVideo`) is wired and a no-op when the file is absent; no `art/fx/*.webm` exists yet.
- Heat shimmer is a rising warm haze + wavering light bands, not true refraction of the page (same reason).
