# What's missing (Silver Eagle question) - agent notes

Goal: the owner's dad asks "Which Silver Eagle year am I missing?" and the app answers from the master data only.

## Data flow
`collection/albums.json` (master) -> `tools/pipeline/build_wants.py` (same arithmetic as `tools/albums/album_calc.py`) -> `data/wants.json`
(called by `tools/pipeline/publish.py`, installed with the other data files; never hand-edit).

Per volume: `id, title, family, binder, denomination, metal, year_start/end, unit (years|coins|slots), evidence (enumerated|partial|count-only),
needs_scan, slots_total (+approx), filled, missing (null when the ledger gives no total), unnamed_missing, exact, inferred_fill,
missing_named[] (state empty = fact), maybe_missing[] (state unknown, layout-named only), have_named[] (inferred flag)`.

Honesty rules: a slot is MISSING only when the ledger names it empty. Slots counted filled by arithmetic (`occupant_status: inferred`) are
"probably here". Unknown slots are "not known yet", never "missing". Count-only albums list no years: "N missing, specific years unknown until the album scan (Phase 1.5)".
A026 = 18 of 36 years missing: 1988-91, 1993-2000, 2003, 2004, 2009-2012 (2008 and 2017 are NOT missing).

Tests: `tools/pipeline/test_pipeline.py` (`test_wants_json_matches_album_calc_and_is_generated`, `test_publish_writes_wants_json`): every volume equals album_calc,
A026 = 18 named years, no unknown/inferred slot in missing_named, committed file == fresh build (no hand edits).
Browser check: `NODE_PATH=/opt/node22/lib/node_modules node tools/wants_check.js http://localhost:PORT/ outdir`.

## App
- `wings/wants.js` + `styles/wants.css`: self-contained overlay (`TitanWants.open({family,q})`, `[data-open-wants]` delegate, Esc closes, focus returned).
  Every rule is scoped to `#wants-view` / `.hall-wants-entry` / the print sheet; colours only from atmosphere tokens (ink on bg/surface, inverse for MISSING),
  status by text + border style + fill, never colour alone. Restyle by editing wants.css only.
- Search box (series/year/denomination), series select, "only albums with something missing", big "Print want list" button.
- Print: `#wants-print` built on demand, `body.wants-printing` hides everything else; black on white, one column, 18pt+, grouped by series,
  rows year | mint | denomination with a tick box, footer with the data date. Prints what the filters currently show.
- Offline: `data/*` is already network-first with cache fallback in `sw.js`; `wants.js` fetches `data/wants.json` once at idle so it is cached. `wings/wants.js` and `styles/wants.css` added to the sw.js precache list.

## Every place changed
- `tools/pipeline/build_wants.py` (new), `tools/pipeline/publish.py` (build + install wants.json), `tools/pipeline/test_pipeline.py` (2 tests), `data/wants.json` (generated).
- `index.html`: `styles/wants.css` link, `wings/wants.js` script (same `?v=tr63` as its neighbours; stamps NOT bumped).
- `sw.js`: wants.css / wants.js in WING_URLS (BUILD untouched).
- `wings/study.js`: one button "What's missing: full list & print" in the Study hero (`data-open-wants`). Study's own hero/inventory already read `wings/albums-data.js`, which agrees with the master on every volume (checked: 0 differences in total, filled count and named holes).
- `app.js` (small separated blocks):
  1. Hall: one `.hall-wants-entry` tile right after the `wing-grid` (no redesign).
  2. New block `applyMasterAlbumData` between `ALBUM_METADATA` and `ALBUM_FAMILIES_ORDER`: when `titan:wants` fires (or `TitanWants.data` exists) it overwrites, per volume, `title, totalSlots, filled, holes, startYear/endYear, denom, metal` and sets `masterMissing`/`masterEvidence`. `ALBUM_METADATA` is kept for `binderType`, `ids`, family order/names only. Then re-renders the Study shelf if shown.
  3. Shelf card holes total (`totalHoles`): uses `masterMissing` when known.
  4. Inspector header: "N of M slots filled"; when the master has no slot total (A010, A013, A014) it says "slot total not yet known (needs the album scan)" instead of printing `null`; slot count fallback is `totalSlots || filled || 36` rather than inventing 36.
  5. `openWantListModal()` (the old Want List modal, which INVENTED holes and "Est Acquisition" prices) now redirects to the new view. The old modal markup in index.html is left in place but unreachable.

## Known leftovers
- The Album Inspector's page grid still pads slots by position when no Study layout exists; the Study layout (master-agreeing) is used for all enumerated volumes.
- ALBUM_METADATA's hard-coded literals are still in app.js (now overwritten at load); delete them in a later cleanup once the inspector no longer needs `binderType`.
- Count-only albums (A003-A015 etc.) need the Phase 1.5 album scans before the years can be named; the page says so.
