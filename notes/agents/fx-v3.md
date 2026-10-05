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

@@TABLE@@

@@NUMBERS@@
