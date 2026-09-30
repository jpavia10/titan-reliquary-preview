# Vault wing: audit and plan (agent: vault, branch `claude/wing-vault`)

Baseline: `main` @ 5ef9717 (tr50). Screenshots of the old wing: `before_desk_*.png` in the session scratchpad.

## Findings (old wing, TR49 overhaul)

### Door animation (the owner's complaint)
- A flat 440px CSS circle with 4 rectangles for "bolts", a dashed dial and a red label, on a blurred dark overlay.
  It rotates -55deg, scales and fades in ~1.3 s. There is no depth, no metal, no light, no weight, no reveal.
- Not skippable, no reduced-motion handling, fixed 440px size (overflows a 390px phone), plays once per page load only.

### Numbers and honesty (serious)
- "LIVE SPOT FEED" is false: the data is a snapshot (`metals.as_of_local` 2026-09-24 08:28 PT, gold-api.com).
- Daily changes are invented constants ("+1.42%", "+0.65%", "-0.76%", "+0.32%"). The real change vs the previous fix is
  in `metals.prior_spot`: silver -$1.27 (-1.96%), gold -$27.80 (-0.65%).
- 24h sparklines are `Math.random()` noise (different on every visit). 52-week ranges are invented constants.
- Platinum tile: price $1,380.50 is invented; the collection holds no platinum.
- "Total Vault Equity" $3,475.65 excludes the coin albums ($2,126.37), but the melt figure it is compared against
  ($4,572) includes the 24 oz of Silver Eagles that live in those albums. Result: "Collector Premium +$0.00",
  a melt bar at 131% width and "Premium -31.6%". Apples vs oranges.
- Liquidation calculator hard-codes gold at $4,252.90 (ignores data), the "Marketplace" channel uses an invented
  13% fee and includes the SentrySafes' value, and "Optimal Blend = max(melt, market)" is not what its caption says.
- Lot cards show ledger melt at the ledger's old $63.50 spot without saying so.
- Melt check: 63.27 oz x $63.377 = $4,009.86 and 0.1322 oz x $4,252.90 = $562.23 (matches `metals.melt`), total $4,572.09. OK.

### Theme / readability
- Every dashboard panel is hard-coded near-black (`#0e0f14` etc). In light atmospheres (conservator) the numbers are
  `--gold-soft` = maroon on black: illegible. Labels at 0.65-0.75rem monospace, low-contrast `--muted` on dark.
- Hard-coded Tailwind colors (#94a3b8, #10b981, #06b6d4, #eab308) ignore all 20 atmospheres.
- A fixed green "laser grid" (`.vault-interior::before`) covers the whole viewport.
- Content uses `.reveal`; in a full-page capture most of the wing is blank until scrolled.
- Phone: 7-column table scrolls sideways; search box for 5 rows is noise.

## Ranked plan (impact / effort / risk)
1. Rebuild the door as a cinematic layered scene: canvas-painted brushed-steel door with real 3D thickness
   (stacked CSS 3D layers), spinning combination dial + 5-spoke handwheel with parallax, 12 locking bolts that retract
   in a staggered heavy motion, clunk shake, light seam, door swings on its hinge, theme-tinted light, god rays and dust
   in the beam, tunnel interior with a glimpse of stacked ingots, camera push-through into a bloom, content rises in.
   Skippable (tap, Esc/Enter/Space, Skip button), reduced motion = no door, once per session (sessionStorage),
   `TitanVault.replayDoor()` / `?vaultdoor=1` to replay. HIGH / high / low (isolated file).
2. Replace invented market data with real snapshot data: spot + as-of stamp + real change vs previous fix, remove
   fake sparklines, 52w ranges, platinum. HIGH / low / low.
3. Fix the equity comparison: use the ledger board (`board.grand` incl. albums) and categories from `board`.
   HIGH / low / low.
4. New "where the metal sits" breakdown from `metals.inventory` (albums / bullion / set / flips; gold per lot). MED / low.
5. Theme-token dashboard, large type, >= 44px targets, phone-first layout; table becomes cards on phones. HIGH / med.
6. Lot cards: grouped (gold / silver / sets / housing / stamps), weight from the lot's own record, melt at recorded
   spot (ledger melt shown only when weight unknown, labelled), cleaner CSS miniatures. MED / med.
7. Calculator rebuilt as "If spot moves": silver + gold sliders from the recorded spot, dealer bid % as an explicit
   assumption, delta vs today, HOLD policy shown. MED / low.

## Not doing
- No live price fetching (offline PWA, no network assets). No changes to `data/`, schema, splash, sw, versions.
- Not deleting the old TR49 CSS/JS in `styles.css`/`app.js` (would cause conflicts with other agents); the new wing
  is rendered by `wings/vault.js` through a 4-line delegation at the top of `renderVault()`, with the old code as fallback.
- No WebGL: layered canvas-2D + CSS 3D gives believable metal at a fraction of the cost on phones and keeps the
  splash's GL context free.
