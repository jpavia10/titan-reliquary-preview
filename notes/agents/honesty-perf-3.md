# Honesty + contrast + atmosphere-CSS pass (3 commits)

## 1. Hall "Precious Metals Terminal": nothing fake

Removed: the invented price history (`TERM_DATA`, ~540 lines of illustrative OHLC for 1H/24H/7D/30D/1Y/5Y/ALL, Au/Ag ratio "history", candles, volume bars, the "illustrative" disclaimer, the 52-week and 24H range boxes) and every stale sample number in `index.html` ($5,584.11, +$142.80, $5,441.00, +$3,574.66, 178%, Ag $63.38, Au $4,253, $4,010, $1,012, $1,630.05 ...). Static markup now shows an em dash until the ledger snapshot fills it in. Stale numeric fallbacks in `app.js` (`?? 5584.11`, `63.38`, `4252.90`, `4009.86`, `562.23`, `71.8`, `10.1`, `"67.1"`) were set to 0 so a missing field can never display an invented figure. (`splash.js` still has `value: 5584` as "last known" for the splash counter; that file belongs to the splash agent and is replaced by live data.)

What the panel shows now (all from the published ledger):
- Headline: vault estimated total and its change vs the prior quote (`metals.board_delta.d_grand`).
- Chart stage: a real-points-only line of `value.history`, one point per date in `collection/valuations.jsonl` (sum of the itemized valuations of that date, with the item count in the hover card; straight segments, no smoothing). With fewer than two dated points it shows an honest message instead (today: "One valuation date on record so far (Sep 30, 2026: $3,475.65 across 301 valued items) ... a chart appears once a second dated valuation is published").
- Boxes: Silver spot and Gold spot (latest quote, change vs prior quote, prior value), Value composition (silver melt, gold melt, above melt, with a proportion bar), Physical custody.
- Caption: "Latest quote as of <as_of_local> (<source>). Changes compare with the previous published quote. The ledger keeps no price history."

Pipeline: `tools/pipeline/build_app_data.py` now emits `value.history` (`[{at, usd, n}]`, `valuation_history()`), `data/index.json` was regenerated with the pipeline (only `value` changed; `search.json` and `detail/` identical, `test_pipeline.py` 16/16 OK, `test_parity.py` PARITY OK). `version.json` untouched.

Caveat to keep honest: the itemized valuations total $3,475.65, not the board total ($5,393.70, which also has bullion/albums/housing from the board); the chart caption says "itemized valuation entries ... number of valued items can differ between dates".

## 2. Contrast

Root cause (conservator, notepad): `styles/hall.css` made the ticker, exhibit and (notepad) valuation hub take their parent's tokens back (`--ink: inherit`), but those atmospheres paint those cases dark/inverse, so dark paper ink landed on a dark case (1.0 to 1.9:1). Fix at token level in `styles/hall.css` (after the generic reset): conservator ticker + exhibit and notepad ticker + exhibit + hub keep their light case tokens. `TOTAL ESTIMATED VALUATION` (`.hero-cap`) and `.hall-asof` now use `color-mix(in srgb, var(--muted) 68%, var(--ink))` in every atmosphere. Abyss: the section-head rule was a gradient on the heading box (the audit sampled it as the text background, 2.7:1); it is now a `::after` line.

`tools/themes/audit.js --aa 4.8` (new flag) requires 4.8:1 for small text (3:1 large), Hall, 20 atmospheres x desktop+phone:

| | before | after |
|---|---|---|
| text fails at 4.8 (Hall) | conservator 80 (min 1.02), notepad 126 (min 1.00), abyss 10 (min 2.69) = 216 | 2 (conservator "Now exhibiting", see below) |

The remaining 2 are an audit artefact: the kicker is light on the dark walnut case (screenshot checked, about 11:1), the audit samples the paper behind the translucent top bar.

Pixel check (Playwright screenshots, text pixels vs median background of each run, ticker + valuation card, 34 text runs per atmosphere, desktop and phone, all 20 atmospheres): minimum ratio per atmosphere 5.01 (nocturne) to 11.6 (notepad); 0 runs under 4.8 (emoji glyphs skipped). Lowest five: nocturne 5.19, colossus 5.28, afterhours 5.51, odyssey 5.78, conservator 6.23 (after the label lift). Conservator ticker before/after was checked visually (oxblood-on-walnut unreadable -> cream on walnut).

Outside the Hall the 4.8 audit still reports other items (578 across all wings in both builds; unchanged by this work).

## 3. Load only the active atmosphere's stylesheet

- `index.html`: the `all.css` (20 `@import`s) link is replaced by a tiny inline script that `document.write`s one `<link id="atmo-css" data-atmo-css="NAME">` for the saved atmosphere, right after the early pre-paint script, so it is render-blocking exactly as before (verified: at first paint `data-atmo=conservator`, `--bg` is the conservator paper and the only atmosphere sheet in `document.styleSheets` is `conservator.css`). Cache stamp is copied from the `styles.css?v=` link, so the stamp tooling needs no change. `<noscript>` falls back to afterhours.
- `app.js` ("ATMO CSS LOADER" block just above `setAtmo`): switching loads the new sheet next to the old one (same cascade slot; every rule is scoped to its own `html[data-atmo]`), flips `data-atmo` when it is ready (no flash, old theme stays until then), then removes the old sheet. If the sheet is already present it is synchronous as before. Rapid switching: the last request wins and exactly one atmosphere sheet remains. `window.TitanAtmoReady()` returns the promise of the last switch.
- `wings/themes/worlds.js`: the view transition / fade waits on `TitanAtmoReady()`. `tools/themes/audit.js` waits on it too.
- `sw.js` is unchanged: `WING_URLS` still lists all 20 `styles/atmo/*.css?v=BUILD` (plus the now-unused `all.css`, harmless). Verified with the service worker registered on localhost: 21 atmosphere sheets in the shell cache, then offline all 20 switch fine (link present and `data-atmo` correct, no errors).

Measured (Pixel 7 emulation, 4x CPU, serviceWorkers blocked, interleaved before/after builds, median of 3; the box was shared with other agents at load average 7 to 13, so absolute fps is far below a real phone and run-to-run noise is large; the style-recalc rows are the dependable ones):

| wing | build | CSS rules in document | boot style recalc ms | style probe ms* | scroll fps | style recalc during scroll ms |
|---|---|---|---|---|---|---|
| Hall | before | 4580 | 291 | 26 | 9.9 | 145 |
| Hall | after | 3816 | 208 | 19 | 10.7 | 108 |
| Gallery | before | 4580 | 316 | 167 | 9.2 | 132 |
| Gallery | after | 3816 | 187 | 96 | 10.7 | 62 |
| Study | before | 4580 | 331 | 95 | 9.0 | 93 |
| Study | after | 3816 | 205 | 45 | 15.8 | 94 |

\* clone the open wing's whole subtree (Hall 1,206 / Gallery 2,171 / Study 2,801 nodes) into the page and force a style+layout pass, median of 7; this isolates selector matching/style cost for freshly inserted nodes (what Gallery scroll does).

Boot style recalc -29 to -41%, fresh-node style cost -27 to -53% (Gallery -43%, Study -53%), 764 fewer rules in the document (20 sheets -> 1). fps rows are inside the noise on this loaded box; re-run `perf.js`-style measurement on an idle machine for the 47 -> ? Gallery and 42 -> ? Study numbers.

Correction to the earlier note: the "~3,000 rules" were mostly NOT atmosphere sheets. `document.styleSheets` counts `all.css` as 20 `@import` rules; counting the imported sheets too, the document had 4,580 rules of which the 20 atmosphere sheets are about 830 (about 40 each). Most of the remainder is `styles.css`, which also carries 218 `html[data-atmo="..."]` selector lines for specific atmospheres. Next step for style cost: move those per-atmosphere blocks from `styles.css` into the atmosphere sheets (or load per-wing CSS lazily), and stop the idle prebuild.

Visual regression: 100 screenshots (20 atmospheres x Hall, Gallery, Vault, Study, Lab, 1300x820, animations frozen) before vs after: 97 identical (<0.2% of pixels differ); the 3 others (xeno-hall 2.0%, glacier-hall 0.35%, glacier-vault 0.23%) are animated canvas/glow variance (aurora, snow) in headless frames, not layout or colour. Phone (390x844) all 20 x 5 wings: no page errors, no horizontal scroll. Desktop: same, no page errors, no horizontal scroll.

## Files touched

`app.js` (terminal block, stale fallbacks, ATMO CSS LOADER block), `index.html` (terminal markup, static sample numbers, atmosphere link), `styles.css` (small terminal block at the end), `styles/hall.css`, `styles/atmo/abyss.css`, `wings/themes/worlds.js`, `tools/pipeline/build_app_data.py`, `data/index.json` (regenerated), `tools/themes/audit.js` (`--aa`, waits for `TitanAtmoReady`). No `?v=` stamp, `version.json` or `sw.js` change; nothing pushed.
