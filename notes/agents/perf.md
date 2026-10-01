# Mobile performance notes

(Pass 1's section lives on the pass-1 branch / main notes; this file adds pass 2. Merge the two when integrating.)

## Pass 2 (tr55 base) — Pixel 7 emulation, 6x CPU, harness `/tmp/mobperf2/mobperf.js`, medians of 5 runs

| Wing | Boot blocking (sum / max task) | Open blocking (sum) | Scroll fps | Max scroll task |
|---|---|---|---|---|
| Hall (boot) | ~1.9-2.2 s / ~800 ms  ->  **1.33 s / 400 ms** | n/a | 54 -> 55 | 60 -> 66 ms |
| Gallery | ~2.2 s -> 1.64 s / 309 ms | 740-870 -> **470 ms** | 48 -> 47 | 176-219 -> 110 ms |
| Vault | ~2.2 s -> 1.43 s | 1.44-1.53 s -> **300 ms** | 61 -> 55 | 0 -> 61 ms |
| Study | ~2.0 s -> 1.58 s | 390-455 -> 430 ms | 31 -> **42** | ~490 -> 289 ms |
| Lab | ~1.9-2.2 s -> 1.63 s | 355-360 -> 344 ms | 53-57 -> 55 | 87-127 -> 106 ms |

Numbers vary +-15% between runs (other agents share the 4 CPUs).

### Profile hot spots (before)
- Boot: Style recalc (UpdateLayoutTree 880 ms) + Layout (540 ms) dominate, not JS. Top single selector: `body:has(.lofi-bar...) main` (about 150 ms of style work per boot: a `:has()` on `<body>` is re-evaluated on every DOM change anywhere). `renderTerminalChart` (426 ms) was really a forced layout of the whole Hall (getBoundingClientRect) inside the boot task. `Number.toLocaleString(locale, options)` and `localeCompare(..., options)` rebuild an Intl object per call (money/num/intFmt/bySer: ~200 ms self in total).
- Vault open: the 4 s strongroom door cinematic (buildDoor painted ~8 large canvases + 3D layers: 560 ms).
- Study scroll: `.atlas-pulse` animated SVG `r` (geometry) on ~60 circles = layout of the whole Study every frame; the album shelf (58 binders, 1,650 nodes) laid out in one 350 ms task when scrolled near.

### Changes (all presentation-only; no data/sw/version edits, no `?v=` bumps, audio files untouched)
1. `styles.css` + `app.js`: `body:has(.lofi-bar...)` selectors replaced by `html[data-lofi="open|collapsed"]`; app.js mirrors the bar's `hidden`/`collapsed` state with a read-only MutationObserver (audio.js is not touched).
2. `app.js`: terminal chart is drawn only when `#term-chart-stage` is within 200 px of the viewport (IntersectionObserver; dirty flag re-draws on demand). Verified the canvas has pixels after scrolling to it, on phone and desktop.
3. `app.js`, `wings/hall.js`, `wings/vault.js`, `wings/lab.js`: shared `Intl.NumberFormat` / `Intl.Collator` instances (identical output).
4. `styles/hall.css` (phones): inactive exhibit slides `content-visibility: hidden` (4 x 175 nodes no longer styled/laid out).
5. `styles/study.css`: atlas pulse + route-flow animations off on phones/touch/reduced motion (static rings stay); `.album-binder-card` `content-visibility: auto`.
6. `wings/vault.js`: the door does not auto-play on phones/touch (`?vaultdoor=1` and the replay button still force it). `styles/vault.css`: per-lot `content-visibility: auto` on phones.
7. `wings/gallery.js`: wall batch on phones 8 -> 4 tiles (smaller tasks).

### Not reached / ideas
- Boot target 1.2 s: median 1.33 s. Remaining: ~340 ms of first-paint layouts during HTML parse, DOMContentLoaded work (hall.js init 77, study.js init 89 forced `fitMeltLabels`/`enhanceStudy`), and the idle prebuild of Vault/Study/Lab (~170-460 ms in 2-3 long tasks). Removing the prebuild would meet the boot target but pushes Study/Lab open to ~550-600 ms; slicing `renderStudy`/`renderLab` into sub-50 ms chunks is the real fix.
- Gallery scroll is capped near 47-52 fps by style recalc of inserted tiles (3,000 CSS rules; atmosphere rules such as `html[data-atmo="notepad"] *` are tested on every element). Loading only the active atmosphere's stylesheet would help every wing.
- Study scroll 42 fps: atlas card (400 nodes) and `.card` containment relayouts.
