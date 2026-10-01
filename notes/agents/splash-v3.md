# Splash v3 · "Vault Door"

Owner request (2026-10-01): "Level up that opening animation." Target: flagship phone (S24 Ultra class) or better, always online.
Brief: Apple-keynote / Patek-film / AAA title-sequence polish, neutral premium palette (blackened steel, polished silver, one warm
tungsten light, no navy/gold, no neon), 5-7 s, real-time, never a hard cut into the app.

Files touched: `splash.js` (rewritten), `splash.css` (rewritten), `index.html` (splash markup block only: lines of `#tr-splash`).
No new files are loaded by the app, so **nothing new for `sw.js`** (`splash.js` / `splash.css` were already in `SHELL_URLS`).
No `?v=` stamps, no `version.json`, no push. Rule 8 respected: zero bitmaps, zero Blender; every surface is procedural at runtime.

## The film (timeline, seconds from the first presented frame)

| t | beat |
|---|---|
| 0.00-0.34 | Black. Warm-up frame compiles every shader behind the dark; the clock starts after it. |
| 0.34 | The tungsten key lamp strikes (relay flicker, then a 1.2 s warm-up). It rakes across the door from upper left; the machining reveals itself: turned rings, engine-turned rosette, tick-mark dial, polished bezel. Slow dolly in, slight drift. |
| 1.2-2.5 | The spoked wheel turns; twelve polished bolt rods retract in sequence (58 ms stagger, ease-out with a small settle). Each bolt nudges the camera by a hair. |
| 2.5 | Last, heavy release: bigger shake, dust kicked into the beam, door unseats 7 cm. |
| 2.65-3.95 | The door swings open on its three hinge barrels (ease-in-out, 110 degrees). Light spills out (spot + cone shaft); through the gap a silver coin glints in the chamber. Focus is racked from the door to the coin. |
| 3.9-4.6 | The camera pushes through the tunnel (fov 36 -> 31, exposure swell = the eye adjusting). |
| 4.6-5.6 | Studio chamber: dark glossy floor with a true mirrored reflection, a soft glow cyclorama, a product-shot cone of light, dust. One silver coin from the collection turns from its reverse (laurel) to its obverse (owl), DOF resolved on the coin. |
| 5.05 | Country (tracked-out caps) and `year · denomination` (italic) fade in, small. 5.5: a tiny "Titan Reliquary" wordmark. |
| 5.6-6.5 | Hand-off: exposure blooms the coin out, the type leaves, and a soft radial dissolve (feathered, with a warm thin ring of light) expands from the coin and reveals the live app underneath. Done at 6.5 s; wall-clock cap 7.4 s from script start. |

The featured coin is a real silver flip: those the ledger counts as silver (`metals.inventory.ag.junk_flips.pieces`, 5 flips today:
C031 Australia 1943 threepence, C088 USA 1957 Roosevelt dime, C223 Netherlands 1967 gulden, C235 Guatemala 1934 10 centavos,
C263 Mexico 1950 25 centavos), a different one per visit (remembered in `localStorage tr_splash_feat_v3`). If `window.vault` is late
(900 ms), a built-in fallback list of the same five is used. The coin's own lettering carries the country and year (obverse legend) and
the denomination (reverse); there is no per-coin artwork yet (0 photos exist), so the design is a generic "owl of Athena" obverse and
laurel reverse, clearly a motif and not a claim about the real coin.

## Techniques

- **Materials**: `MeshPhysicalMaterial` everywhere (clearcoat on the blackened steel; polished/brushed silver; turned finish via roughness maps).
  three r128 has no `anisotropy` on materials, so brushed/turned looks come from roughness maps and geometry (lathe profiles with chamfers). Textures that
  alias under bump derivatives were avoided on purpose (no bump maps; the rosette is a pre-baked normal map; seams/rivets are real geometry).
- **IBL**: `PMREMGenerator.fromScene` of a procedural RoomEnvironment-style studio (overhead tungsten softbox, neutral side strips, a gradient front fill,
  a back kicker, a hot spot for sparkle). Built at runtime, nothing shipped. Material `envMapIntensity` ramps with the light reveal, so the intro is lit by the lamp, not the room.
- **Coin**: a height map drawn on a canvas (rim, dentils, arc legend, owl with feather scallops / laurel wreath, denomination), box-blurred, turned into a **normal map** and a
  **roughness map** (polished mirror field, frosted relief) in 8 row-bands so no task is long; reeded edge from a tiled normal map; the faces are slightly dished so the mirror
  sweeps a gradient as it turns. Texture size 1536 (tier 0), 1024 (1-2), 768/512 below.
- **Light**: five `SpotLight`s + one point light with `physicallyCorrectLights`, PCF-soft shadows from the key (2048/1024/512 by tier).
- **Volumetrics**: three cone-mesh shaders (additive, view-angle falloff, animated angular streaks) for the key lamp, the spill from the opened vault and the coin spot,
  plus up to 700 GPU dust motes (vertex-shader drift, brightness = membership of the three cones, near-camera fade).
- **Floor reflection**: the chamber floor is a dark, 72 % opaque glossy plane over a mirrored copy of the coin (two extra draws, no second scene render).
- **Post (hand-written)**: MSAA HDR half-float target, soft-knee bloom with a 13-tap dual-filter pyramid (up to 6 levels), thin-lens DOF (half-res linear depth pass + 14-tap
  golden-angle gather on a quarter-res blur; focus is keyed to the door, then racked to the coin), tiny radial chromatic aberration, anamorphic-ish vignette, ACES, split-tone
  (faint steel shadows, warm highlights), dithered film grain, exposure keyframes (the whiteout through the tunnel), and the **alpha iris** hand-off.
- **Hand-off**: the canvas has `alpha: true` and the composite pass outputs premultiplied alpha, so the wipe is real transparency (no CSS mask, no overlay element) and the
  live app shows through. The app is made visible (`ts-reveal`) at the start of the hand-off, never before.
- **Camera**: monotone cubic-Hermite keyframes (z, x, y, look-at, fov, exposure, bloom, focus) so every move eases in and out with no overshoot; living drift fades out for the product shot.
- **Sound** (WebAudio, OFF by default, same stored preference `tr_splash_sound_v1` and the same top-left toggle as v2): lamp relay + transformer hum, wheel ratchet ticks, a
  "tchk + thunk" per bolt, a sub-bass clunk, a bandpass-swept door groan, an airy whoosh for the push, a bell-partial shimmer + warm bed on the coin; a synthesized convolution
  room (decaying noise IR) gives it space. Cues fire from the timeline, so they stay in sync with dropped frames.

## Tiers (`?splashq=0..4` forces one)

| tier | dpr cap | MSAA | bloom levels | DOF | volumetrics | dust | shadow | coin tex | floor reflection |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 2 | 4x | 6 | yes | cones + streaks | 700 | 2048 | 1536 | yes |
| 1 | 1.5 | 4x | 5 | yes | cones + streaks | 450 | 1024 | 1024 | yes |
| 2 | 1.25 | no | 4 | no | cones | 260 | 1024 | 1024 | yes |
| 3 | 1 | no | 3 | no | none (dust only) | 90 | 512 | 768 | no |
| 4 | 1 | no | none: renderer ACES straight to screen | no | none | 0 | none | 512 | no (cross-fade hand-off) |

Start tier from hardware hints (8+ cores and 6+ GB -> 0; <=4 cores -> 1/2; save-data or <=2 cores -> 3), then the **frame-time probe** over the first ~500 ms (still black,
so a change is invisible): average rAF interval > 20.5 ms steps one tier down, > 34 ms to tier 3, > 60 ms to tier 4. One more step down is allowed mid-flight if 24 frames
average > 38 ms. No HDR render targets -> tier 4. WebGL failure -> instant 0.25 s fade to the app. `prefers-reduced-motion` -> a still lit frame (CSS coin, the same type) held 1.5 s, then a 0.5 s cross-fade.

## Behaviour contract (verified, see "Proof")

Once per session on a plain load (`sessionStorage tr_splash_v1`), `?nosplash` skips, `?splash=1` forces, deep links skip (index.html gate unchanged), `TitanSplash.replay()` works,
tap / click / any key (Escape included; Tab and modifiers excepted) skips to the app with a 0.42 s fade, wall-clock cap 7.4 s, hidden-tab safe.
Cleanup frees every geometry, material (and its maps), texture, render target, the PMREM target, `renderer.dispose()` + `forceContextLoss()`, so `wings/fx/` gets the GPU back.
Test hooks (harmless in production): `?splashhold` (no cap, no auto-render), `TitanSplash._debug.seek(t)`, `.info()`, `.perf()`, `.tier(n)`; `window.__tsPerfLast` after dispose.

## Proof (this folder)

PROOF_PLACEHOLDER

## What I would do next

1. Real per-coin art: once Phase 2 photos exist, use the featured coin's own obverse/reverse scan as albedo + a height map from shape-from-shading, replacing the generic owl.
2. A real GPU profile on an S24 Ultra (Chrome remote debugging); tune tier 0/1 thresholds from real frame times, and try `renderer.compileAsync`-style staged compilation if a driver stalls.
3. Light-wipe colour from the active atmosphere (`data-atmo`): the ring could pick up a hint of the destination's background, so dark and light worlds both resolve gracefully.
4. Convolution hits for the groan from a recorded impulse (real-recording ambience is the project direction), and haptics on each bolt on Android (`navigator.vibrate`).
5. Depth-aware volumetric softening (fade the cones where they meet geometry) and a second, deeper light-shaft pass at tier 0 only.
6. A "tilt to look" parallax on the product shot (v2 had it), and a drag-to-spin for the coin during the last 1.5 s.
