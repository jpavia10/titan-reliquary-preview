# Hall wing: integration notes (agent: Hall & Vault integrator)

Base: integration head a30625e. Compared with `origin/claude/rescue-wing-hall-c1a7bf8c6642194e` (built on older 5ef9717) and the original plan (`origin/claude/wing-hall:notes/agents/hall.md`).

## What the main line already had (kept, not replaced)
Ledger-derived ticker (`renderMarketTickerTape`), honest terminal (`syncTermToLedger`, SNAPSHOT badge, `#term-honesty` note), valuation hub above the exhibit, exhibit hold logic (hover/focus/touch/offscreen/inactive wing), phone control grids, "Value above melt" wording, honest placard labels.

## Brought over from the rescue branch
- `wings/hall.js` + `styles/hall.css` (hooks `<!--WS:hall-->` / `<!--WJ:hall-->`, `?v=tr51`):
  - plan item C: "At a glance" strip of six large tiles (pieces, flips, countries, albums, silver oz, gold oz), each opens Gallery / Study / Vault; all figures from `window.vault` (`counts`, `board`, `precious`, `metals`). The old small text row is hidden.
  - as-of line under the valuation (ledger version, spot timestamp, Ag/Au spot).
  - melt-bar labels hide when the segment is too narrow; ticker duplicates hidden under reduced motion so the strip is one scrollable copy (plan G); keyboard activation of ticker items.
  - chart redraw on resize/rotation via `window.TitanHallChart`.
- app.js: plan item E in `renderTerminalChart` (theme tokens through getComputedStyle, 12px axis labels, no fake full-height volume bars when a series has no volume, NaN volume -> 0); melt legend shows Silver/Gold/Value-above-melt dollars with oz and spot as sub-lines; placard "Appraised Value" -> "Ledger estimate"; Phase-2 filename box removed from the museum placard.
- Dropped from the rescue `hall.js`: its terminal caption (main already has `#term-honesty`) and its exhibit touch-hold (main already holds).

## Fixes of my own
- styles.css pins dark "instrument" tokens on ticker/exhibit/hero figure/valuation hub in conservator/notepad/odyssey, while the Hall paints those surfaces from theme tokens. Result was pale text on paper (hero figure, ticker, placard 1.1 to 2:1). `hall.css` now makes those panels take their parent's tokens back (`--ink: inherit` etc.), so they are dark-on-paper in light rooms and light-on-dark in dark rooms.
- Melt-bar labels: solid dark pill with white text (was white on pale indigo, 1.6:1).
- Token-based fixes for exhibit arrows, SNAPSHOT badge, up/down deltas, asset/mode buttons, note-cards, lab banner, HOLD badge. Phone timeframe buttons 44px.

## Not done / for others
- `--faint` fails AA in every atmosphere (`#live-status`, note-card labels); that is a token-level decision (themes owner). Hall note-cards use `--muted` instead.
- Terminal history series remain illustrative and are labelled as such. No real price history exists.

## Status
Done and tested (desktop 1300x820, phone 390x844, no horizontal scroll, zero pageerrors). Audit (afterhours, conservator, notepad, zen, samadhi, silkroad): no remaining failures from Hall or Vault elements; remaining ones are `#live-status` (`--faint`), slab barcode (slab owner), "Ambience" button (fixed colour outside scope).
