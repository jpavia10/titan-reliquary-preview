# Grand Hall wing: audit and plan (agent: wing-hall, branch `claude/wing-hall`)

Base: `main` @ 5ef9717 (tr50). Audited at 1300x820 and 390x844 in `afterhours`, `conservator`, `neon`.

## Findings

### Correctness / honesty (the numbers people read)
1. **Live Wire ticker is fabricated.** Hard-coded items: "CH 1969 1-FRANC $12.50 +8.2%" (ledger est is $1.25),
   "MEXICO 1914 5c $125.00" (ledger $12.00), "US 1976 $2.40", "NETHERLANDS $16.50" (ledger $9.55), invented % moves,
   "COMEX REGISTERED 31.42M oz HISTORIC LOW", "INFLATION-ADJ PEAK $148.20". Spot items say Ag "+3.24%" and Au "+1.18%" while
   `metals.prior_spot` shows both **fell** (Ag -1.96%, Au -0.65%). The vault item reads `vault.grand` (does not exist) and silently
   falls back to a hard-coded 5584.11.
2. **Terminal headline deltas are fabricated** (`TERM_DATA.*.delta`, "+$142.80 (+2.62%)"), and the "Live" timeframe runs a
   random walk that mutates the displayed price every 2.8 s while the badge says "STREAMING". Nothing streams; spot is a
   snapshot from `metals.as_of_local`.
3. Terminal stat boxes: "Vault Gold Allocation 0.00 oz Au" (vault holds 0.1322 oz); "Numismatic Premium" uses
   `vault.stats.total_est` (does not exist) so it always uses the fallback; "Rebalance Indicator: Accumulate Silver" is
   investment advice the data does not support; "COMEX Active", "P.M. Fix" bid/ask are invented.
4. Melt breakdown calls `grand - melt` "Rarity Premium"/"Collector Premium". It is really everything that is not metal
   (album premiums, housing $183, stamps, sets, base-metal flips). Legend rounds gold to "0.13 oz".
5. Placard: "Valuation Multiple: Conf med" (label and value disagree); every top-5 flip is a "CABINET MASTERPIECE"
   (the #1 piece is a $12 coin).

### Layout / first impression
6. The collection value ($5,584.11) is below the fold on both desktop and phone; the first screen is a wordmark, a fake
   ticker and a huge exhibit. The only "at a glance" counts are a small muted text row far down, after the terminal.
7. Phone: exhibit control row (6 buttons) overflows sideways with no affordance; timeframe row (8 buttons) clips "ALL";
   melt-bar labels overflow their segments ("u · $562.2", "remium · $1,0"). Controls are 11-12 px text on ~26 px tall
   targets: too small for the older relative.
8. Exhibit auto-advances every 10 s even while the visitor is reading the placard or hovering the coin, and even when
   the Hall is not the active wing.

### Theming / rendering
9. Ticker is hard-coded near-black (#08090c) with dark-red symbols in light atmospheres (conservator): poor contrast.
10. Canvas chart hard-codes white grid/labels: axis labels invisible on `conservator`. Axis font is 10 px.
11. Volume bars: vault series has non-numeric volumes ("Physical Holdings") which parse to NaN -> 1, so every bar is
    full height (big flat green blocks).
12. Chart is never redrawn on resize/rotation (stale bitmap stretched until the next interaction).
13. Under reduced motion the marquee stops at the start and the remaining items are unreachable.

## Ranked improvements (impact / effort / risk)
| # | Change | Impact | Effort | Risk |
|---|---|---|---|---|
| A | Rebuild ticker from real data (grand, spot with true change vs prior spot, ratio, metal oz + melt, bullion, top flips by real est, counts); honest badge | High | S | Low |
| B | Terminal honesty: real spot/deltas from `metals`, remove random walk, "Snapshot" badge + as-of caption, "illustrative history" disclosure, fix gold 0.1322, remove advice | High | S | Low |
| C | "At a glance" strip: value hub moved up under the ticker + 6 large tiles (pieces, flips, countries, albums, silver, gold) that open the right wing | High | M | Low |
| D | Phone layout: exhibit controls as 3x2 grid, timeframes 4x2 grid, >=44 px targets, larger labels; melt labels hide when segment is narrow | High | S | Low |
| E | Theme-aware ticker + chart (tokens via getComputedStyle), 12 px axis labels, no fake volume bars, redraw on resize | Med | S | Low |
| F | Exhibit: pause rotation on hover/focus/touch, when off-screen or Hall inactive; honest placard labels; hide Phase-2 filename box from the museum placard | Med | S | Low |
| G | Reduced motion: ticker becomes a scrollable strip | Low | XS | None |

## Decided NOT to do
- Rewrite the ~540 lines of hard-coded `TERM_DATA` history: there is no real price history in `window.vault` to replace it
  with. Instead the series are labelled as illustrative and every *current* number is sourced from data.
- Touch the museum slab renderer (`renderMuseumSlab`, shared with gallery/table) or the 3D table.
- Change the section order of `#hall-body` (wings, notes, watchlist): content is fine and other agents may link to it.
- Any change under `data/`, schema, versioning, splash.
