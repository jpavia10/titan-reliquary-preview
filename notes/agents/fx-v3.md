# TitanFX v3: a richer engine and one signature effect per theme

Owner request: "Each theme should have special effects. Upgrade the effects engine then add them."
Branch `claude/fx-v3` (from `main` at tr89). Builds on `fx-v2.md` (read it first for the base architecture: one WebGL2 overlay,
text-safe mask, adaptive quality, Effects Off/Subtle/Full). Nothing in the app layout or UI was touched.

## What changed in the engine (`wings/fx/engine.js`, public API unchanged)
| Feature | How it works |
|---|---|
| **Depth: back + front layers** | Every preset can declare `front: {rate, size, alpha, kind, color}`: a handful (2 to 5 by quality tier) of very large, out-of-focus particles that drift past the "camera" now and then (about half of the cycles are skipped, so it stays sparse). Kinds: 0 soft disc, 1 bokeh disc with rim, 2 petal/fibre-like soft ellipse. They sit at 2.4x the parallax depth of the back layer. One extra instanced draw per layer (a few quads). On light themes they turn into faint ink-toned shapes. |
| **Glow (cheap bloom)** | A particle pass with `glow: k` is also drawn into a 1/4-size RGBA target, then composited additively through a 17-tap blur. Gated by quality: only at ladder steps 0 to 2 (render scale >= 0.7); the target, texture and program are created on demand and released with the context (counted in `stats()`, flat across switches). Used by sparks, embers, spores, lanterns, glints, bokeh, motes. |
| **Pointer parallax** | `pointermove` (touch drags too) moves the whole layer by at most 1.6 % of the screen height, smoothed (`1 - exp(-3.2 dt)`), through the shared `uPar` uniform (`P(fc)` in presets and `warp()` in particle vertex shaders both honour it; front particles move 2.4x). `TitanFX.setPointerParallax(0..0.03)` tunes or disables it. |
| **Scroll drift** | Scroll events leave a small impulse (max 5 % of the height); after the scroll settles the layer eases toward it and back to 0 (tau about 0.75 s). The tr82 rule is untouched: nothing renders while a scroll is moving, the drift only plays after the 160 ms settle, and the quality watchdog still ignores that gap. |
| **Tap / click ripple** | `pointerdown` records the point and time (`uTap = x, y, age, strength`). A preset opts in with `tap: true` (generic expanding ring added by the engine to the first pass, light on dark themes, a darker ring on light ones, plus a radial push on particles through `warp()`) or `tap: "warp"` (push only). Presets can read `uTap`/`uTapOn` themselves. |
| **Moments** | A preset declares `moments: [{name, every: [min, max] seconds, dur}]`. The engine schedules each layer in the frame loop (no timers: nothing to leak, nothing fires while the tab is hidden). The first one comes after 0.3 to 0.8 of the lower bound, then every `every` seconds, picked at random. The shader sees `uMoment = (seconds since start, seed, dur, index)` (`x < 0` = none) and helpers `mK()` (0..1 progress) and `mEnv()` (0 to 1 to 0 bump). Each start dispatches `titan:fx` `{type:"moment", preset, name, dur}` so the sound engine can react later. `TitanFX.moment(name?)` forces one (tests, screenshots). Reduced motion: moments are never scheduled and `moment()` returns false. |
| **Audio-reactive** | `uAudio` (0..1, smoothed, 15 Hz) from `TitanGen.level()` when `TitanGen` exists and `isPlaying()` is true; any exception or absence = 0 (three errors turn it off). Every preset gets a gentle breathing from it (`c *= 1 + 0.22 uAudio`). `wings/scene-engine.js` / `scene.js` were not touched. |
| **App events** | New `titan:coin` event (`{detail:{id}}`), dispatched in `openDrawer()` in `app.js` (one line, where the dossier opens). The engine answers with an accent pulse (`uPulse`: all presets brighten by up to 35 % and fade over about 0.8 s). `TitanFX.pulse()` does the same on demand. |
| **Per-preset text safety** | A preset can set `safe: 0..0.95` to raise the text-safe mask strength just for itself. Default mask strength is now 0.78 (was 0.70). `TitanFX.setTextSafe(v)` / `refreshSafe()` exist now (the v2 notes mentioned them, the code did not have them). |
| Kept | quality ladder, 12 ms budget, DPR cap 1.5, pause when hidden, reduced motion = one static frame (pointer, tap, moments, pulse and audio are all off), Effects Off/Subtle/Full, context-loss recovery, `stats()` leak counters (`stats()` also shows `bloom`, `par`, `pulse`, `tapAge`, `audio`, `moments`). |

New shader helpers available to every preset: `mK()`, `mEnv()`, `uMoment`, `uPar`, `uPtr`, `uTap`, `uAudio`, `uPulse`; in the particle toolkit (`presets.js`) `PV({...})` builds
a generic rise/fall/sway/spin particle vertex shader (with a `mod` hook), `PO`/`F_SOFT`/`F_GLINT` the matching fragments.

## Theme to effect (one preset each, `presets.js`, manifest `fx` + `fxIntensity`, `ui.js` ATMO table all agree)
All 20 are single-purpose presets (one full-screen pass plus 1 to 3 small instanced passes, so they cost less than the stacked aliases they replace).
Every one has a sparse `front` layer, tap response and at least one moment.

| Theme (id, name) | Preset (intensity) | Look | Moment(s) (every, length) |
|---|---|---|---|
| kaleido, Prism | `prismatic` (0.9) | refracting caustic lattice with chromatic split, drifting light leaks, rainbow glints (glow) | `spectrum-sweep` (28-65 s, 9 s): a rainbow band wipes across; `flare` (4 s): a prismatic star flare with spectral ring |
| afterhours, Midnight Gallery | `moonlit` (0.85) | cold moonlight shafts from a skylight (top right), dust in the beam, a pale pool on the floor | `case-glint` (30-75 s, 7 s): a specular sheen sweeps over a display case; `moon-cloud` (40-90 s, 12 s): the shafts dim and return |
| conservator | `loupe` (0.6) | paper-dust motes (ink toned), faint window-frame shadow bars; light-theme safe (darkening only) | `loupe-pass` (32-80 s, 11 s): a brass loupe ring with a glint glides across |
| colossus, The Mint | `mint-forge` (0.9) | forge glow and heat shimmer at the foot, molten sparks flying on gravity arcs (streaks, glow) | `press-strike` (24-60 s, 3.6 s): white-gold flash, shock ring, burst of 40+ sparks |
| nocturne, Nocturne (Blue Note) | `bluenote` (0.85) | blue smoke, a spotlight cone that sways through it with a pool on the floor, an art-deco sunburst of gold glints at the bottom | `spotlight-swing` (28-70 s, 10 s): the cone sweeps wide and flares; `brass-glint` (3 s): a brass sparkle |
| odyssey, Captain's Cabin | `voyage` (0.85) | swaying lantern light, rolling-horizon tint (amber dawn above, sea below, rocking), sea spray streaks | `wave-crest` (25-65 s, 8 s): the ship heels, the lantern swings wide, spray surges |
| cursedwing, Forbidden Wing | `crypt` (0.9) | three candle flames, warm ambient fill eaten by shadows that crawl in from the edges, drifting ash | `cold-breath` (30-80 s, 7 s): the flames gutter, a pale cold mist sweeps over, shadows surge, then the flames relight |
| abyss, Shipwreck | `deepsea` (0.9) | caustics and light beams from above, marine snow in two depths | `whale` (35-90 s, 22 s): a whale silhouette crosses the haze (backlit patch, body, flukes, fin) |
| neon, Night City | `nightcity` (0.85) | rain on glass (the v2 droplet shader) refracting a neon palette, big out-of-focus neon signs (glow) | `headlights` (22-55 s, 6 s): a car's lights and tail-lights pass; `sign-flicker` (30-75 s, 3 s): the signs buzz and flicker |
| notepad, Plaintext (Private Bank) | `paperink` (0.6) | paper fibres and drifting ink-bleed, alpha below about 0.03, dark specks, nothing bright | `ink-drop` (35-90 s, 12 s): one slow blot spreads with feathered edges and fades |
| construct, The Construct | `phosphor` (0.8) | falling green phosphor code (columns, 5x7 glyph cells, bright heads), CRT scanlines, refresh band, vignette; `safe` 0.9 | `glitch` (22-55 s, 2.6 s): rows tear sideways with RGB split |
| xeno, Xenohold | `spores` (0.85) | bioluminescent spores (cyan, magenta, lime, pulsing, glow), a hex containment lattice that shimmers in waves, field glow at the sides | `field-surge` (26-62 s, 7 s): a ring of the lattice lights up from a point |
| solaris, Solar Observatory | `coronagraph` (0.85) | stars turning slowly about an off-screen pole, a black occulting disc in the top-right corner with a streaming corona | `shooting-star` (22-60 s, 2.6 s); `prominence` (40-90 s, 9 s): a looping arch of fire on the limb |
| alchemist, The Alchemist | `athanor` (0.85) | emerald vapour, a slowly turning hermetic ring (runic ticks, two triangles), sparks rising from it (glow) | `transmutation` (28-70 s, 8 s): the ring turns silver-green to gold, a flash, a spark burst |
| glacier, Hyperborean Vault (Polar Vault) | `polar-ice` (0.85) | aurora curtains, frost creeping in from the edges (crystal ridges, breathes over about 3 min), diamond dust (glints) | `aurora-flare` (28-75 s, 11 s): curtains surge, rays rise, colour drifts to magenta |
| valhalla, Gilded Armory (Hoard Hall) | `mead-hall` (0.9) | hearth glow low left with embers rising (glow), cold light and snow blowing in at the door on the right | `log-crack` (24-60 s, 2.8 s): the fire flares, embers burst; `door-gust` (30-75 s, 8 s): the door light and snow gust across |
| dynasty, Imperial Treasury | `lantern-feast` (0.85) | red-gold haze, paper lanterns rising (glow), tumbling gold-leaf flecks that flash when they catch the light | `lantern-release` (30-70 s, 14 s): twelve big lanterns rise together |
| zen, Temple Garden | `garden` (0.85) | falling petals (tumbling), rain ripples spreading on dark water, mist at the horizon | `petal-gust` (25-65 s, 9 s): a gust sweeps the petals and one great ripple spreads |
| samadhi | `incense-curl` (0.85) | two curling saffron incense columns (laminar then turbulent), saffron haze, slow golden motes (glow) | `singing-bowl` (30-75 s, 9 s): concentric rings radiate from the bottom centre, motes brighten |
| silkroad, Silk Road (Caravanserai) | `dunes` (0.85) | dense desert stars, a milky-way band, drifting sand haze, sand streaming on the wind, a distant lamp | `sandstorm` (30-80 s, 12 s): haze and sand surge, the stars dim |

Old presets (`rain-on-glass`, `storm`, `embers`, `aurora`, ... and every alias) are all still registered and unchanged; the World ids in `ui.js` (`midnight-gallery`, `the-mint`, `hoard-hall`, ...) now point at the same new presets as the atmospheres they descend from (Clear and Private Bank stay effect-free).


## Measurements (container: software GL, no GPU, shared 4-CPU box; harness in the session scratchpad, ported to Python: `look`, `contrast`, `perf`, `health`, `export`)
### Frame cost and fps, Pixel 7 profile (412x915 @2.625, 4x CPU throttle)
Absolute numbers are SwiftShader and say little; what matters is that nothing got more expensive than what it replaces and that the engine's own ladder still copes.
- Every theme settles at ladder step 5 (0.42 scale, layers 0) under SwiftShader, exactly like every v2 preset did (fx-v2.md). Glow therefore never turns on in this container (it is gated to steps 0 to 2); it was exercised at forced step 2 in the screenshots and `health` runs.
- `TitanFX.benchmark(10)` at forced step 2 (0.7 scale, ms per frame incl. GPU finish; old = the preset the theme used before):

| theme | new preset ms | old preset ms | | theme | new ms | old ms |
|---|---|---|---|---|---|---|
| kaleido | 129 | 98 | | solaris | 69 | 112 |
| afterhours | 78 | 124 | | alchemist | 144 | 104 |
| conservator | 50 | 70 | | glacier | 159 | 126 |
| colossus | 116 | 131 | | valhalla | 126 | 110 |
| nocturne | 89 | 147 | | dynasty | 94 | 26 |
| odyssey | 63 | 183 | | zen | 59 | 152 |
| cursedwing | 107 | 130 | | samadhi | 137 | 59 |
| abyss | 90 | 84 | | silkroad | 81 | 106 |
| neon | 178 | 126 | | notepad | 59 | (none) |
| construct | 64 | 75 | | xeno | 130 | 111 |

  Cheaper than before: 10 of 19; costlier: kaleido, abyss, neon, xeno, alchemist, glacier, valhalla, dynasty, samadhi (the ones with glow passes or two full-screen layers' worth of work folded into one). During a moment the cost moves by +0 to +20 ms at this step (nightcity and deepsea unchanged). On a real GPU the ladder only has to leave step 0/1; no preset was tuned to a GPU here (none available). First priority on a device: run `TitanFX.benchmark()` per theme and look for ones that drop below step 2.
- rAF fps with the effect at the settled step (idle box would be higher): 13.5 to 30.6 (FX off on the same box 50 to 60, Hall); old presets 13 to 33. No theme is below its predecessor by more than 5 fps except dynasty (32.8 -> 24.6) and samadhi (24.7 -> 19.5).
- Gallery scroll (25 x 300 px, same harness as tr82): on this box the figure is 2 to 8 fps with FX **off** as well as on (host load average 4 to 5 from other sessions, 4x throttle), so tr82's 55 fps cannot be reproduced here. Controlled comparison on solaris and conservator (FX off / old preset / new preset): 3.8 / 2.3 / 4.6 and 5.9 / 6.0 / 6.8 fps (first run of two). The new layer is not slower than off or old. The hold-still-while-scrolling code path is unchanged and the drift only runs after the 160 ms settle (see below); a re-check on an idle box or a phone is still advised.

### Contrast (WCAG AA), Hall, desktop 1366x820 and phone 412x915, Full effects, steady state and mid-moment
Method as in fx-v2.md (24 to 29 text runs; fg = mean of text pixels, bg = median of the rest; "cross" = AA when the effect is OFF and below AA when ON). Four ON frames per theme (two steady, two mid-moment) plus a control frame with the effect OFF (page animations alone).
- Desktop final: **19 of 20 themes have 0 crossings in every frame**; mean ON/OFF ratio 0.98 to 1.00 (xeno 0.987, abyss 0.982), worst single run 0.86 to 0.99 (xeno 0.90, dynasty 0.87 for one frame while a lantern sits behind a label).
- Three themes show crossings that are not the overlay: construct (the Hall terminal types and blinks, canvas text: the OFF control frame crosses too, 7.0 -> 1 to 2.4 in both), samadhi (a 5.03 -> 4.35 on the "Updated" chip in one frame; control also dips to 4.4) and alchemist (4.5 vs 4.95 on a small label, a tie at 4.48 to 4.50; athanor `safe` raised to 0.96 afterwards).
- What it took: default text-safe strength 0.70 -> 0.85, per-preset `safe` (prismatic 0.97, phosphor 0.94, athanor 0.96, samadhi 0.93, nightcity 0.9, polar-ice 0.9, bluenote 0.88, deepsea/voyage/lantern 0.86), canvases masked as soft blocks (they hold text the DOM walker cannot see), brighter themes toned down (prismatic 0.9 -> 0.75, phosphor 0.8 -> 0.7).
- **Found and fixed: the Prism video overlay** (`art/fx/kaleido-glints.webm`, screen blend 0.55, a plain `<video>`) is not covered by the text-safe mask; with it on, Prism body text fell to 3.6 to 4.4 (min ratio 0.58) in this test. `ui.js` no longer auto-plays it (`VIDEO = {}`); the preset draws its own glints. `fxVideo` in a manifest still works.
- Light themes (conservator, notepad): mean ratio 0.999 and 1.000, 0 crossings; overlay alpha on notepad stays under about 0.03.
- Phone: see the table at the end (same method, 8 to 29 runs).

### Health
- No console errors or shader warnings in any run (all 20 presets compile; `errors_normal: []`).
- 30 theme switches (20 themes, then 10 again): at the same theme on lap 1 and lap 2 the counters are identical (conservator: 4 programs, 1 texture, created minus deleted = 4; notepad: 3, 1, 3), after 30: 3 programs, 1 texture, 1 layer; `stop(0)`: 0 programs, 0 textures, `hasGL false`, created = deleted. Glow target/texture/program are created and released with the context.
- Reduced motion (OS setting): `running false`, no moment (`moment()` returns false), a pointer move + click + forced moment change no pixel (max diff 0.0 between frames 1.5 s apart), parallax 0.
- Interaction: pointer at top-right / bottom-left gives par = (-0.0158, -0.0112) / (0.0155, 0.0103) (clamped to 0.016, smoothed); click sets tap age 0.21 s after 200 ms; `titan:coin` fired once from a real dossier open and the pulse read 0.82 150 ms later; scroll 900 px: par.y stays 0 during the scroll, 0.024 at 0.9 s, 0.028 at 1.5 s, 0.010 at 3.5 s (eases in after the settle, then decays).
- Moment event: `titan:fx` `{type:"moment", preset:"spores", name:"field-surge"}` observed. Audio: with a faked `TitanGen.level()` = 0.1 the smoothed `uAudio` reached 0.48 (it is boosted x5); with no TitanGen it stays 0. Effects Off releases GL (`hasGL false`), Subtle runs, Full runs.
- Hidden tab: `running false`, resumes true.

## Screenshots
Scratchpad folder `fxv3/` (not committed): `NN_<theme>_desktop_hall.png` (Hall as shipped, text-safe mask on), `_bare.png` (the effect alone, page hidden), `_moment_<name>.png` (bare, mid-moment) for all 20 themes (60 files; 1366x820, quality step 2 like fx-v2's shots). Notable moments: whale (deepsea), press-strike (mint-forge), shooting-star (coronagraph), glitch (phosphor), lantern-release, aurora-flare.

## Not done / open
- No real GPU: nothing tuned on hardware; glow (gated to ladder steps 0 to 2) only seen at a forced step. Do a phone pass with `TitanFX.benchmark()` per theme.
- Gallery scroll fps could not be reproduced at tr82 levels in this container (see above); re-measure on an idle box.
- Not wired: the sound engine does not listen to `titan:fx` moments yet; `TitanGen.level()` is read defensively (it exists today in `scene-engine.js`).
- `index.html`/`sw.js` need the integrator's usual `?v=` bump (no new files were added). App-side change: one line in `app.js` (`titan:coin` in `openDrawer`).
- Prism's `kaleido-glints.webm` is no longer auto-played (AA, see above); the file stays.
- The Hall terminal in Construct is a canvas with animating text; its contrast cannot be judged frame by frame.

### Phone contrast (412x915 @2.625, 20 themes, same four ON frames + control)
19 of 20 themes: 0 crossings except odyssey, where the "Updated" chip reads 4.46/4.43 vs 4.51 OFF (a 0.05 margin tie; control clean). Mean ratios 0.98 to 1.00; worst single run 0.75 (dynasty, mid lantern-release, no crossing), 0.85 (neon), 0.88 (samadhi). Construct on the phone reports 7 to 11 crossings and mean 0.52, but this is the Hall terminal panel (a floating, typing canvas) sliding over the card text between the OFF and ON frames: the OFF control frame itself shows 3 crossings, and the screenshot (`11_construct_phone_hall.png`) shows the rain receding cleanly around the text. Treat as measurement noise; recheck on a device.

