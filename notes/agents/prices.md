# Prices and portfolio value history

Grok used to publish spot quotes; it stopped. Nothing updated prices until this system. The Claude cloud container cannot reach any price site, GitHub Actions runners can, so a daily Action owns prices.

## Files
- `collection/prices/spot_daily.jsonl` (schema `SpotDaily`, tier `system`): one line per UTC date `{date, xag_usd, xau_usd, source, fetched_at[, carried][, provisional]}`. Written ONLY by `tools/prices/fetch_prices.py`.
- `collection/prices/latest.json` (`LatestSpot`): latest gold-api.com quote.
- Committed seed (the only real quotes known without network): 2026-09-30 board quote (Ag 60.585999 / Au 4161.5, gold-api.com via ledger v254, never replaced) and the ledger's prior quote (61.104 / 4160.5), dated 2026-09-29 by assumption (the ledger did not record the date) and flagged `provisional`, so the first real backfill replaces it. Everything from day 0 (2026-09-11) to 09-28 is empty until the first Action run.
- `data/prices.json` (generated): spot rows `[d, xag, xau, kind]` (kind `""` real, `c` carried, `p` provisional), sources, latest quote, board quote, current ounces and non-metal dollars (so the app can reprice with a live quote).
- `data/index.json` `value.portfolio_daily` (generated): `{cols:[d,total,ag_melt,au_melt,premium,n,added,k], rows, markers, caption, day0, priced_from, through, residual_usd, unitemised_oz, board_quote, ...}`.

## Sources and fallback (`tools/prices/fetch_prices.py`, stdlib only)
1. History primary: stooq daily CSV `xagusd`, `xauusd` (spot closes).
2. Fallback for dates still missing: Yahoo chart JSON `SI=F`, `GC=F` (FUTURES closes; `source` says "futures, not spot").
3. Today: gold-api.com `/price/XAG`, `/price/XAU` -> `latest.json` plus a `provisional` line for today (replaced by the close on a later run).
Dates filled: every date from day 0 (earliest `logged_at`, or `--since`) to yesterday (UTC) with no line, or with a `provisional` line.

## Validation
Range Ag 5..500, Au 500..20000, no 0/NaN; a day-over-day move over 15% against the previous accepted value is rejected and logged (date stays missing; value builder carries the last good price over it; `--accept-jumps` after a human looked). Existing dates are never overwritten without `--refresh`; ledger quote lines never, even with `--refresh`. Weekend/holiday dates between two real prices are `carried` (previous close repeated, regenerated every run). Dates after the last real price are not carried.
CLI: `python3 tools/prices/fetch_prices.py [--since YYYY-MM-DD] [--refresh] [--accept-jumps] [--no-live] [--dry-run]`. Tests (offline, fixtures in `tools/prices/fixtures/`, SYNTHETIC numbers made by `make_fixtures.py`): `python3 tools/prices/test_fetch_prices.py`.

## Value model (`tools/pipeline/value_history.py`)
`value(d) = sum over items present on d of [metal oz x spot(d) + premium] + unitemised board metal x spot(d) + residual`.
- Present: specimen/lot with `logged_at <= d` (counted through `lifecycle.removed_on`); albums have no date and count from day 0 ("undated").
- Metal oz: specimen `precious.asw_oz/agw_oz x quantity`; lot `asw_oz/agw_oz`; album `asw_oz_per_slot x slots_filled_claimed` (the 24 oz of Eagles).
- Premium: `est_usd - oz x the spot the estimate was made at` (valuations: 63.50 Ag, 4,350 Au); non-metal items premium = `est_usd` (floored at 0).
- Calibration at the board quote date (2026-09-30): board ounces (63.27 Ag) not found in any record (1.4997 oz) are carried as "unitemised metal" at spot; one constant dollar residual (currently $508.11) is the bucket "albums, sets, housing (ledger)", counted from day 0. Result equals $5,393.70 and the board melt lines ($3,833.28 / $550.15) at the board quote.
- Premiums do not move with spot; only metal does. Series starts at the first priced date; ends at the build date (extra days use the last price, kind `c`).
- Tests: `python3 tools/pipeline/test_value_history.py` (calibration within $1, monotone steps at logged dates with flat prices, removed items, new item from its date), and `test_pipeline.py::test_new_coin_enters_the_portfolio_series_from_its_logged_date`.

## App (Hall terminal)
Default view Portfolio value; Silver/Gold/Au-Ag ratio from `data/prices.json`; 7D/30D/90D/1Y/ALL; area or candles (bars aggregate real daily values: 1 day for <=30D, 7 days for 90D/1Y, 30 days for ALL over a year; open = previous bar close); hover/scrub readout; dashed markers "+75" on days items were added. Live quote: gold-api.com from the browser (4 s timeout, sanity-checked within 15% of the last quote), repricing the total and melt, badge "LIVE hh:mm"; fallback latest.json ("LAST QUOTE <time>"), then ledger board quote. Every number carries its as-of. Choices persist per viewer in localStorage (`tr_term_v1`).

## The Action (`.github/workflows/prices.yml`)
Daily 22:15 UTC and `workflow_dispatch` (inputs `since`, `refresh`): fetch, `publish.py` (only if `collection/prices` changed), commit as github-actions[bot], push to main, then POST `/pages/builds` (default-token pushes do not trigger the legacy Pages build, CLAUDE.md rule 0).
NOTE: if a git push of `.github/workflows/prices.yml` is refused (no `workflow` scope), commit it through the GitHub connector.
First run: Actions tab -> prices -> Run workflow (leave `since` empty: backfills from day 0).

## Failure modes
- stooq changes format or needs a key: Yahoo futures fill in (labelled); both down: only today's quote is written, history waits for the next run.
- Jump rejected: log says which date; the gap is carried by the value builder; verify, then `--since D --refresh --accept-jumps`.
- Page cannot reach gold-api.com (offline/CORS/slow): falls back to latest.json, then the ledger quote, always labelled.
- publish.py also bumps `version.json`; the Action commits that. Whoever integrates by hand should run `publish.py` too.
