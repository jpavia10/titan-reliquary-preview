# Vault wing: review of the rescued module

Reviewed `origin/claude/rescue-wing-vault-70231190895da685` (`wings/vault.js` 1269 lines, `styles/vault.css` 885 lines, 7-line delegation in `renderVault`).

## Verdict: kept, with fixes
Honesty check (every shown number compared with `window.vault`):
- Hero melt $4,572.09 = `metals.melt.ag_usd` 4,009.86 + `au_usd` 562.23; spot Ag $63.38 / Au $4,252.90, prior-fix changes -1.96% / -0.65% from `metals.prior_spot`; ratio 67.1; as-of and source from `metals`.
- Where the metal sits: `metals.inventory` (ASE albums 24 oz, bullion 37.9997, S001 0.897, flips 0.3733; gold 0.0322 + 0.1 oz).
- Composition from `board` (bullion 3,011.74, albums 2,126.37, flips 188.41, housing 183, sets 74.89, stamps 1.50; total 5,584.11). Apples-to-apples (includes albums), fixing the old "-31.6% premium".
- Lots: 28 cards = `bullion` + `sets` + `housing` + `stamps` (28). Weights read from each lot's own record; melt at recorded spot.
- Flips table: silver flips from `flips[].asw_oz`; melt = asw x spot.
- "If the price moves": pure arithmetic, dealer percentage is labelled "your assumption", HOLD policy shown.
- No random sparklines, no invented platinum / 52-week / fee numbers. Integrator fixes are not regressed (they are superseded: spot ticker from metals, calculator now on recorded gold spot).

## Fixes applied
- **Name clash (would have broken the app):** the rescue set `window.TitanVault = {...}`, overwriting `app.js`'s `window.TitanVault = () => vault` accessor used by `tools/themes/audit.js` (and any agent). Renamed the module export to `window.TitanVaultWing`; app.js delegates to it.
- Melt uses the ledger's published `metals.melt` when present (was $4,572.10 by rounding; now $4,572.09).
- What-if sliders: steps were coarse (0.5 / 10) so at load the page showed "+$7.40 vs today". Fine steps, value at recorded spot treated exactly, now "same as today".
- Contrast: up/down deltas mixed toward `--ink` (was 3.9 to 4.3:1 in dark atmospheres); active filter chip count opacity.
- Legacy fallback (TR49 block in styles.css, used only if the wing fails to load): donut centre now an opaque `--surface` disc with token text; `.bullion-bar-stamp/-weight` solid dark on the silver bar; `.bullion-mint-box-label` light on its always-dark box. No `.slab-*` rules touched.
- Integration: `<!--WS:vault-->` / `<!--WJ:vault-->` hooks, `?v=tr51`; fallback verified (blocking vault.js shows the legacy vault, no errors).

## Door
Cinematic strongroom door plays once per session when the Vault is active; skippable (tap, Esc/Enter/Space, Skip), none under reduced motion, `?vaultdoor=1` or `TitanVaultWing.replayDoor()` to replay. No errors in 6.5 s runs.

## Status
Done. Desktop and phone: no horizontal scroll, zero pageerrors, no buttons under 44px on phone. Audit shows no Vault failures in afterhours, conservator, notepad, zen, samadhi, silkroad.
