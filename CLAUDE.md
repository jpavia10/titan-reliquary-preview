# Titan Reliquary: start here (any agent)

Private coin and precious-metals collection viewer for Joseph Pavia (`jpavia10`).
Read this file first, then `collaborators/SHARED_LOG.md` (newest entries at the top).
**Processing coin photos or adding/correcting coin data? Read `AI_START_HERE.md` and follow only that.** Follow `AI_START_HERE.md` and the change-file contract (`collection/templates/INSTRUCTIONS.md`), not any hand-edit steps left in older docs (`DRIVE_ANALYSIS.md`, `FRAMEWORK_BRIEF.md`, old ledger notes); those still describe Grok owning GitHub and the old `LEDGER.md` and are superseded.
**Contract:** Grok (and any other contributor) does not edit GitHub or the Drive mirror. It only drops `changes_{agent}_{YYYYMMDD-HHMM}.jsonl` in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Claude merges that (`tools/pipeline/publish.py`) and owns the site.
Last verified: 2026-10-01 (build tr55).

## What it is
- Zero-build PWA: vanilla HTML/CSS/ES6 (Three.js for the 3D table). No npm, no bundler.
- Live code (repo root): `index.html`, `app.js` (~7.5k lines), `styles.css` (~11.5k lines), `atlas.js`, `spatial.js`, `deepzoom.js`, `audio.js`, `ambient.js`, `sw.js`, `version.json`.
- Data (read-only to the app): `data/index.json` (boot index), `search.json`, `detail/{ISO}.json`.
- Data pipeline (Python) is in this repo: `tools/pipeline/` (`publish.py`, `apply_changes.py`, tests), `tools/schema/` (validator). It builds `data/` from `collection/`. Needs `pip install jsonschema`. Run `python3 tools/pipeline/test_pipeline.py` and `test_parity.py` after touching it.
- Local server: `python -m http.server 8000`

## Collection facts (from `collection/` = ledger v254 + later change events; `data/index.json` is generated from it)
- 273 flips (coins/tokens in 2x2 flips), 21 bullion lots, 2 sets, 45 countries, 33 album volumes in 12 families (the board shows "62 album families", Grok's count).
- Policy: **HOLD / do not sell.** Board total $5,393.70 (`collection/board.json`, authoritative). Physical silver ~63.27 oz, gold ~0.1322 oz.
- **0 photos exist.** All 273 flips are status `Logged` and awaiting Phase 2.

## Where things live
| Thing | Location |
|---|---|
| Code | `github.com/jpavia10/titan-reliquary-preview` (branch `main`), live at `jpavia10.github.io/titan-reliquary-preview/` |
| Drive | Google Drive folder `Titan Reliquary` is the one home (consolidated; contents under "Data master" below) |
| Old/original app | `jpavia10.github.io/titan-reliquary` (Grok's): retired as the source; this repo is the official app |
| Photo shard sites | `titan-photos-{as,eu,na}` GitHub Pages repos |

## Rules
0. **Deploying:** GitHub Pages does NOT rebuild for pushes made by the Claude GitHub app (the live site silently stayed at aa45918 for ~30 pushes on 2026-09-30). After pushing to `main`, trigger the build by updating `DEPLOY_STAMP.txt` through the GitHub connector (acts as the owner's account), then confirm a new "pages build and deployment" run for that commit finishes `success`. Never report "live" before that run succeeds.
1. Check `SHARED_LOG.md`, do your work, append a 2-3 line entry.
2. Ownership: Claude = integrator (repo, pipeline, site, merges every change file). Grok, Gemini, Muse and other AIs contribute data only as change files in the Drive drop folder. Coordinate in the log.
3. Never edit generated files in `data/` by hand.
4. Keep Dad-readable (high contrast, large type) and offline PWA working.
5. Never print, copy, or commit any GitHub token. Cloud sessions use the GitHub connection.
6. Anything worth keeping gets backed up to the Drive folder above.
7. **Themes ("Worlds"):** every new or rebuilt theme ships at the Signature standard in `notes/agents/theme-pot.md` (manifest-only tokens, photoreal art, GPU effect, real-recording ambience, AA contrast, perf budget). Never add a theme the old "Classic" way.
8. **Images and video (owner rule, 2026-10-01):** never render stills with Blender or code in the container, and never ask the owner to copy and paste prompts. Write requests into the one art queue (`docs/art/ART_QUEUE.md`): Drive `art-requests (Grok: images + video)/`, processed by Grok (stills and video with sound, rules `ART_START_HERE (for Grok: images + video)`), output in `art-incoming (AI images + video)/`; keep a repo copy in `docs/art/requests/`. On "Titan: import the art" review every file; weak results are rejected and re-requested automatically (review loop). Blender only for short animated loops, if at all.

## Photo workflow (owner's intent, confirmed in chat 2026-09-28)
1. Phase 1: photo each coin; owner pen-labels one side with country, year, denomination. AI generates metadata from the photo.
2. After all coins are done, AI reallocates serial IDs with **no bias to scan order**.
3. Phase 2: owner writes the new ID on the back, pro-scans front and back into a staging folder.
4. AI pairs the photos using the notes, then crops to 2x2 and circle.

**Phase 1.5 (added 2026-09-30):** the owner's numbering is 1 = initial chat photos, 1.5 = updated album scans, 2 = pro photos. Album volumes whose contents are only partly known (11 count-only + 12 partial in `schema/seed/ALBUMS_AUDIT.md`) are finalized by asking the owner for fresh scans of every album at Phase 1.5, not by guessing from `ALBUMS.md`.

## Owner's goals (as of 2026-09-28)
1. Masterpiece desktop + mobile app; the owner's dad can view it (e.g. "which Silver Eagle year am I missing?"). Only the owner and dad will use it, so public GitHub Pages is acceptable.
2. Photo workflow above, with AI-generated metadata from a photo (in-app scan is a later goal; a Drive inbox + watcher is the realistic first step). Pick the model by bake-off: ~30 coins already in the ledger, score each model against the known answers.
3. Consolidate everything onto Google Drive only. Back up core collection JSON (`data/`) separately from the app.
4. Every piece of work gets backed up to the Drive folder.
5. Work in small steps; do obvious fixes first; no big changes until the owner confirms.

## Status log (newest first)
- 2026-10-01: **Drive consolidated (final):** everything lives in `Titan Reliquary/`. `photos/` + `_raw_capture/` moved to its top level; the old `Titan Reliquary Collection` (Grok's LEDGER.md, ALBUMS.md, Inbox, scripts) is `_archive/grok-ledger-v254 (...)`; empty `Grok Bot` and the combined art queue were trashed. Art queues: `art-requests-images (Grok)` -> `art-incoming (AI images)`, `art-requests-video (Gemini Veo)` -> `art-incoming-video (Gemini Veo clips)`. tr69: Grok's theme art live (Prism, Midnight Gallery, Shipwreck, The Mint); splash sound on by default.
- 2026-10-01 (tr64-tr68): What's missing (data/wants.json, A026 = 18), honest terminal + AA contrast + single atmosphere CSS (tr65), splash v3 + film path (tr66/67; FILM const in splash.js, set on art import), real prices: `collection/prices/spot_daily.jsonl` + `latest.json` written only by `tools/prices/fetch_prices.py`, run daily 22:15 UTC by `.github/workflows/prices.yml` (stooq, Yahoo fallback, gold-api latest), `value.portfolio_daily` from `tools/pipeline/value_history.py` (calibrated to the $5,393.70 board on 2026-09-30); terminal defaults to Portfolio value with a live gold-api quote in the browser.
- 2026-10-01: **Owner confirmed Grok knows its new role:** no more LEDGER.md/ledger updates; Grok only drops change files and relies on Claude for the master, the pipeline and the site. Consequence: nothing refreshes the spot quote or board totals any more (they were Grok ledger output, last 2026-09-30 08:12 PT); see SHARED_LOG for the proposed quote-update path.
- 2026-10-01 (tr61, tr62): Scene Studio tabs Scenes | Themes | Sound (`wings/themes/manifest.js` + `worlds.js`), first Blender render (Prism; Blender on this box is ~30 min/image, so theme art now comes from SuperGrok/Gemini via `docs/art/IMAGE_PROMPTS.json` + Drive `art-incoming (AI images)`). tr62: TitanFX GPU effects (`wings/fx/`, 17 presets + World aliases, Effects Off/Subtle/Full in Sound > Settings, default Full); the thunder recording dispatches `titan:thunder` so lightning flashes with it.
- 2026-10-01: **Design direction PAUSED by the owner.** He will combine elements from the three prototypes (`/prototypes/`) or ask for new options. Until then: no layout/visual redesign, splash or icon changes; only work that is independent of layout (data/pipeline, ambience engine, FX engine, theme art assets, perf). tr60 = ambience v3 (real recordings).
- 2026-10-01: **Schema v3** (`schema/v3/`, `schema/SCHEMA_V3.md`): phase tiers per field (`schema/v3/field_tiers.json`) enforced by `apply_changes.py`. Phase 1 is thin (match or `NEW-n`; country, year, denomination, mint mark, class) plus a short `story`; no serial, grade, catalog number, price. Phase 2 fills the rest from pro photos + cited sources. Models must send `phase`. New nullable fields: `specimen.research` (pipeline-kept progress), `variety`, `measured.die_axis_deg`, `type.period/ruler/commemorates`. `FIELDS.md` shows who writes each field; the Phase 1 field list is in `INSTRUCTIONS.md` + `FIELDS.md`. C297-C300 leftovers purged. Contract: contributors only drop change files; Claude merges and owns the site.
- 2026-10-01 (tr58, tr59): perf pass 2 on all wings (notes/agents/perf.md); Scene Studio = sticky top bar + offline generative audio engine `wings/scene-engine.js`; background playback is the default, pausing in background is an opt-in setting (owner request). Remaining perf misses: Gallery scroll ~47 fps, Study ~42 fps (style recalc from ~3,000 CSS rules; load only the active atmosphere CSS next).
- 2026-10-01: Pipeline guards + docs: `apply_changes.py` now checks every event against the schema type (a wrong-typed value is a line-numbered rejection, never a traceback), rejects junk sources (< 8 chars, "n/a", "AI"...) and any condition judgement (grade, strike, luster, toning, cleaned, damage) without a photo file or cited reference in `source`. New `collection/templates/FIELDS.md` (generated by `tools/pipeline/field_reference.py`), `AI_START_HERE.md` + `collection/templates/INSTRUCTIONS.md` rewritten (Phase 1.5 album slot events, `op: create`, self-check). `collection/board.json` no longer carries a local machine path.
- 2026-10-01 (tr55): **The site is now generated from the v2 master** (`python3 tools/pipeline/publish.py`: apply `collection/_incoming/` change files -> validate -> rebuild `data/`). Parity vs Grok's v254: 0 unexplained differences; headline $5,393.70 / Ag 63.27 oz / Au 0.1322 oz unchanged. Grok's LEDGER.md publish is no longer the site's source. Mobile perf pass: gallery scroll 24-28 -> 48-49 fps (Pixel 7, 6x CPU). Drive consolidated (one home `Titan Reliquary/`). Routine "Titan daily intake" (06:56 PT daily, trig_01YRZeFHBmSJWHyxt43nQ5nc) created WITHOUT the Drive connector or repo attached: add both in the claude.ai Routines settings, or just say "Titan: process the staging folder" in any session.
- 2026-09-30 (tr53): Live: all 20 atmospheres (contrast fails 3436 -> ~650, token-pair fails 53 -> 0), museum-slab legibility, Gallery v2 (finder with live counts, shareable `#gallery?cont=..&era=..&sort=..` views, placard tiles, palette v2, honest dossier v2), Hall glance tiles + theme-aware chart, rescued Vault wing (verified honest), Lab/Study follow-ups. Offline verified (76+ files precached). Schema v2 master in `collection/` (see its README; validate with `tools/schema/validate.py collection/`). Other thread's work rescued to `claude/rescue-*` branches and reconciled. 3D Table (rescued rewrite, GPU cleanup) and Sound/FX (one AudioContext, hidden-tab suspend, no timer leaks, one toast when tracks are dead) merged as tr54. Radio URLs could not be verified from the cloud container (hosts blocked): run `await TitanLofi.audit()` in a browser console and add dead titles to `DISABLED` in `js/playlist.js`.
- 2026-09-30: All finished agent branches merged (lab, study, themes, splash-v2 = tr51). Fixed a live self-reload loop (every 30 s) in `checkWebVersion()`. Work now runs as an Opus integrator + Sonnet agents in git worktrees, max ~4 at a time (4-CPU box; each agent runs its own browser).
- 2026-09-30: Honesty + wing pass on `main`: ledger-derived Hall ticker/terminal/Vault spot (no invented prices, grades or certs), Hall first-screen layout, Gallery handler/filter fixes, sw.js build sync, dark-panel contrast in light atmospheres. Agent branches `wing-lab`, `wing-study`, `themes`, `splash-v2` are now merged. Plans for hall/gallery/lab are in `notes/agents/` on their branches.
- 2026-09-30: Schema v2 drafted (`schema/SCHEMA_V2.md`, `schema/v2/`, `tools/schema/`): type/specimen split, computed album holes, formatting rules, migration + validator. Not wired into the app; awaiting owner decisions (section 9 of the doc).
- 2026-09-30: tr51 splash v2 "The Vault" (merged to `main`). Real 3D vault scene (spotlights, deposit-box walls, round vault door, pedestal, planar floor reflection), hand-written post (bloom, DOF focus pull, streak, ACES), featured real coin per visit, optional synthesized sound (off by default), tilt parallax, door-opening Enter. `?splashq=0..4` forces a quality tier. Same behaviour contract as tr50.
- 2026-09-30: tr50 shipped "The Awakening" splash (`splash.js`, `splash.css`). Shows once per session on a plain load; `?nosplash` skips, `?splash=1` forces, `TitanSplash.replay()` replays. Also earlier: full-text search fixed (`data/search.json` + `tools/build_search.py`), photo-metadata bake-off kit in `tools/bakeoff/` (deferred), Drive consolidated.
- 2026-09-29: Session moved to the cloud. Repo cloned from GitHub; `CLAUDE.md` restored from the Drive copy (the earlier local commit never reached GitHub).
- 2026-09-28: Audit done. `CLAUDE.md` and corrected `README.md` written. All project files copied to Drive. Old local copies recycled; Desktop shortcut now points at the live preview site.
- 2026-09-28: GitHub token removed from git remote URLs. It was not stored elsewhere; cloud sessions use the GitHub connection.
- Not yet started: ROADMAP checkbox cleanup, model bake-off. (Drive consolidation and photo-doc reconciliation are done.)

## Cross-thread handoff (received 2026-09-30) — standing instructions
Owner's standing instructions: don't ask permission; push finished work live after testing; resume the nearest-to-done work one at a time; then do a full improvement pass. Run ~4-6 agents at a time max (20 pushed load to 30-50 and caused stale screenshots). Use Opus to orchestrate and Sonnet for agents (Fable needs usage credits). Only ONE session integrates into `main` at a time.
- Albums: `ALBUMS.md` on Drive is the only album source found. Fill slot details from the Whitman album model and mark each such value `"inferred"` (never present inferred slots as ledger fact).
- A second thread (another machine) had UNPUSHED agent worktrees: a rewritten `ambient.js`, Vault/Table/Study/Hall/Gallery wing work, 11 paused themes. They are not on GitHub. To rescue them, in that thread run for each worktree: `git -C <worktree> push origin HEAD:refs/heads/claude/rescue-<name>`; the integrator then compares them with main before merging anything.
- Resolved from that handoff: splash-v2 merge (done, tr51); 30 s reload bug (fixed); sw.js offline list (fixed); crest API mismatch (`TitanAtmoCrest` now aliased in `wings/atmo/core.js`); Lab `EU-CH-008_front.jpg` pairing (fixed, 1638/1638 test names pair).
- **Owner decisions (answered 2026-09-30):**
  1. **Schema v2 is adopted** (it is more complete: one copy per fact, computed album holes, provenance). Migrate and update ALL outdated metadata to v2. v2 JSON becomes the master that any agent can read and update; Tier 2 fields are added as nullable.
  2. **Order:** Phase 1 (initial metadata for every coin) → THEN serial reassignment (once, no scan-order bias) → THEN Phase 2 pro photos. `ser` is frozen only after reassignment; the permanent key is `id` (`C###`).
  3. **Google Drive holds:** a zip backup of the site; all metadata (coins, albums, whole collection) in the v2 layout so any agent anywhere can add/update it; all pro photos, named consistently in a logical folder tree. Phase 2 = at least 2 photos per coin (obverse + reverse; label/edge/detail optional).
  4. **Phone-photo folders:** owner delegated the layout to the integrator (see `docs/PHOTO_FOLDERS.md` once written).

## Data master (2026-09-30)
- **`collection/` (schema v3, `schema/v3/` + `schema/SCHEMA_V3.md`) is the master for metadata**; `data/` is generated from it by `tools/pipeline/publish.py` (never edit `data/` by hand). Imported from ledger v254 (Grok, 2026-09-30 08:12 PT), the last Grok-generated snapshot.
- Owner decision: the ledger board totals (Grok's logged silver/gold/value) are authoritative (`collection/board.json`). Still open in `collection/CURATION_OPEN.md`: 5 type conflicts to check physically; EC code clash (Ecuador vs East Caribbean).
- Drive: `tools/drive/sync_to_drive.gs` (install once) mirrors `collection/` and a daily site zip into Drive `Titan Reliquary/`. Photo layout: `docs/PHOTO_FOLDERS.md` (one photo home: `Titan Reliquary/photos/` + `_raw_capture/`, moved there 2026-10-01).
- Drive `Titan Reliquary/` is the one home: `OPEN TITAN RELIQUARY (the app)` shortcut, `AI_START_HERE`, `STAGING (drop coin photos here)`, `collection-incoming (AI change files)`, `site-backups/`, `_archive/` (old copies). The old TAP HERE doc was retired (trashed) 2026-09-30.

## Resolved questions and what is still open
- Answered (owner, 2026-09-30): the owner's photo plan above is the protocol (the "Stage 1 bare coin" protocol is dead); the permanent key is `id` (`C###`), `ser` (`EU-CH-008`) is only the display serial, `TITAN-###` is dropped; `collection/` replaces Grok's `LEDGER.md` as the master (v254 is the last Grok snapshot); the preview repo is the official app.
- Still open (`collection/CURATION_OPEN.md`): 5 type conflicts to check physically; the `EC` code clash (Ecuador vs East Caribbean); which photo-model wins the bake-off (`tools/bakeoff/`, deferred).
- Caveat: GitHub Pages is publicly reachable; `noindex` only hides it from search.

## Cleanup (2026-10-01)
- Deleted: `stage/`, `photos/` (the invented "1914 France 5 Francs" TITAN-299/300 images), and the stale `data/master_catalog.json` (v1, held the fake C297-C300 records; the app never read it). The fake France records are gone everywhere. Owner decision: the next four real coins take **C297, C298, C299, C300** (closing the gap the four purged fake records left in the old 1-296 item sequence), then C301 onward. The pending request R001 (German 1 euro cent, year to confirm) becomes C297.
- `DRIVE_ANALYSIS.md` and `FRAMEWORK_BRIEF.md` are historical (banner at the top); do not follow them.

## Album data (2026-09-30)
The album table hard-coded in `app.js` (`ALBUM_METADATA`) is wrong in places. The ledger's `ALBUMS.md` (Grok, rev 2026-09-22; on Drive in `Titan Reliquary/_archive/grok-ledger-v254 (...)/`) is the better source. `schema/seed/albums.seed.json` transcribes it (evidence level per volume: enumerated / partial / count-only) and `schema/seed/ALBUMS_AUDIT.md` lists every disagreement. Example: A026 Silver Eagles 1986-2021 is missing 18 years, not the 6 the app shows, and the app wrongly lists 2008 and 2017 as missing. Rebuild with `python3 tools/albums/build_seed.py`.
