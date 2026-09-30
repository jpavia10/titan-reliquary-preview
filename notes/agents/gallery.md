# Gallery wing: audit and plan (agent: gallery, branch `claude/wing-gallery`)

Base: `main` @ 5ef9717 (tr50). Scope: `#pane-gallery` (`renderGallery`, `filteredFlips`,
`flipQueryMatch`, Cover Flow, wall, slab/flip/planchet modes), the flip dossier
(`openDrawer`) and the Ctrl/Cmd+K palette.

## Findings (measured in headless Chromium, 1300x820 and 390x844)

### Bugs
1. **Click handlers pile up on every re-render (critical).** `renderGallery()` adds a new
   `click` and `keydown` listener to the persistent `#gallery-body` each time it runs. After a
   normal boot plus three typed characters, one tap on a card's "3D Flip" badge toggled the
   class 6 times (so the flip did nothing), and one tap on a card called `openDrawer` 6 times
   (6 detail fetches and re-renders).
2. **Space and arrow keys are taken over across the whole wing.** The Cover Flow key handler
   runs on `window` whenever the gallery is active and no text field has focus. So Space on
   any focused button (filters, tiles) flips the carousel and cancels the button press, and
   arrows on a focused card move the carousel.
3. **Counts disagree with the view.** "Crown Jewels" returns early from `filteredFlips()` and
   ignores every filter, but the toolbar still shows the filters and says "12 / 273".
   "Awaiting Phase 2 · N" counts one rule and filters with a different one. The year box does
   substring matching ("19" matches everything; "7" matches 1970-1979 and 1987).
4. **Every keystroke rebuilds the whole wing** (trays, rail, Cover Flow shell, toolbar, 45
   country chips, first 28 slabs), then restores focus and caret by hand. About 300-600 ms per
   key with software GL. The first 28 wall cards alone are about 5,300 DOM nodes, because each
   card renders two full slabs, each with an SVG, a drop-shadow filter and a reticle.
5. **Duplicate SVG ids.** The rail, the Cover Flow and the wall render the same `arc-top-*` and
   `pl-shadow-*` ids for the same coin.

### Honesty (the "do not invent data" rule)
6. The wall slabs and the dossier print grading and certification claims that do not exist:
   "GEM PROOF", "GEM MS", "CERT #C271", "CERTIFIED PROVENANCE", "holographic provenance
   pedigree seal", "precision laser die calibration", "Specimen Alloy". These are circulated
   coins in cardboard 2x2 flips with no grading.
7. The dossier caliper prints a diameter (22.0 or 26.5 mm fallback) and a die alignment
   ("Coin ↑↓ 180°" default) as if measured, even when the ledger has no such data. The real
   diameter is often in the detail `metal` text (for example "23.2 mm"). The alignment is
   sometimes in `specs`.
8. The dossier repeats the same facts three times (spec grid, Identity, Value), and the story
   (design, notes) ends up at the very bottom.

### Filtering and sorting power
9. No filters for continent, era (decade or year range), value band, type (coin or token) or
   confidence. Silver is split between a tray and a button. There is no "recently added"
   sort (the "Newest" sort is by scan number), no "oldest/newest year", and no "lowest value".
10. No saved or shareable views. The hash only knows `#gallery` and `#coin=`.
11. No "clear all", no summary of active filters, and the empty state is a bare "No matches".

### Mobile and ergonomics
12. On a phone, the slab header truncates the country ("MEX…"). Primary facts are 10-11 px
    dark red on navy (low contrast). The active mode button is red on dark red. The 45-chip
    country strip scrolls sideways off-screen. Filters take about 4 rows before any coin.
13. The "Latest adds" rail repeats the Cover Flow (both are newest-first).

### Palette
14. It only finds flips (8 max). No bullion, sets, albums, countries, wings or actions. No
    arrow-key navigation: Enter always opens the first row.

## Ranked improvements (impact / effort / risk)
| # | Change | Impact | Effort | Risk |
|---|---|---|---|---|
| A | New gallery renderer in `wings/gallery.js`: bind listeners once, re-render only the wall on filter change (debounced), cache tile HTML, add tiles in batches | High (fixes 1, 4) | M | Low (legacy path kept as fallback) |
| B | Finder: search + Continent / Country (faceted counts) / Era / Metal / Value / Type + sort (recently added, year up/down, value up/down, country, SER); active-filter chips; Clear all; honest counts; trays become one-tap presets | High (3, 9, 11) | M | Low |
| C | Shareable views: `#gallery?cont=Europe&era=1960&sort=year` (kept in the URL while browsing, plus a "Copy link" button) | Med (10) | S | Low |
| D | Rebuilt wall tile: large, readable museum placard (country, year, denomination, value, Ag), a procedural coin face in a frame per mode, reverse drawn on demand, no fake grades | High (6, 12) | M | Low-Med (visual) |
| E | Keyboard: arrow keys move between tiles, Enter opens, F flips; the Cover Flow keys stay on the carousel | Med (2) | S | Low |
| F | Empty and no-result states that name the filters and offer one-tap fixes ("Remove 'Asia' → 12 pieces") | Med | S | Low |
| G | Palette v2: grouped results over flips, bullion, sets, housing, stamps, album families, countries, wings, actions; up/down/Enter; recent items | High (14) | M | Low |
| H | Flip dossier v2: honest "photo pending" stage, one clean museum label, story (design, mintage, refs, notes), measured diameter only when the ledger has it, full record in a collapsible | High (6, 7, 8) | M | Med (shared drawer; only flips/tokens use the new body) |
| I | Virtual scrolling for the wall | Low at 273 | L | Med (not done: batches + `content-visibility` are enough) |

## Decisions
- **Do:** A-H. All new code goes in `wings/gallery.js` and `styles/gallery.css`. In `app.js`,
  a small bridge (`window.__galleryBridge`) sits next to `renderGallery`, plus one-line
  delegations at the top of `renderGallery`, `renderPalette` and `openDrawer`'s body template.
  There is also an extension hook in `filteredFlips` so the Cover Flow, the dossier prev/next
  and the 3D table all see the same filtered list. If `wings/gallery.js` fails to load (for
  example offline before `sw.js` precaches it), the legacy code runs unchanged.
- **Keep:** the Cover Flow engine (its own 11-node window is fine), restyled and fed by the
  same filters. Also the three presentation modes (now CSS frames around one tile).
- **Drop from the gallery view:** the "Latest adds" rail (now the "Recently added" sort), the
  45-chip country strip (now the Country facet with counts), the fake grade slabs on the
  wall, and the Phase-2 "Awaiting · 273" button (every flip awaits Phase 2, so it filtered
  nothing).
- **Not done:** true virtualization (I); changes to `renderMuseumSlab` itself (it is shared
  with the Cover Flow, the Hall and the 3D table, so its fake labels are reported, not changed);
  any `data/` change.

## Status (implementation agent, branch `worktree-agent-ab8460336533ae0e4`, base main @ 8079876 / tr51)

Already on main before this pass (verified, not redone): plan items 1, 2, 3, 6 and half of 7
(handlers bound once, Cover Flow keys scoped, Crown Jewels respects filters + `yearMatches`, no fake
GEM / CERT text on slabs, caliper labels its diameter source).

| Item | State | Commit |
|---|---|---|
| B Finder (search, facets with live counts, sorts, chips, Clear all, presets) | done | see git log |
| A Performance (wall-only re-render, cached tiles, batches) | done | see git log |

Measured (headless Chromium, software GL, shared 4-CPU box, so use the ratios): typing five characters in
the search box cost 220-610 ms per key and produced 9-12 long tasks in the classic gallery; the Finder does
2-50 ms of synchronous work per key (list 0.5-2 ms, facets 0.3-3 ms, wall 0.1-15 ms once tiles are cached)
and moves the Cover Flow and the state save to 260-300 ms after the last change. Gallery DOM after boot:
5,323 nodes (28 tiles, two full slabs each) -> 2,168 nodes (24 tiles, obverse only; the reverse slab is
drawn the first time a tile is flipped) on desktop and 1,967 (12 tiles) on a phone.
