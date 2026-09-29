# Titan Reliquary: start here (any agent)

Private coin and precious-metals collection viewer for Joseph Pavia (`jpavia10`).
Read this file first, then `collaborators/SHARED_LOG.md` (newest entries at the top).
Last verified: 2026-09-29 (build TR49, commit `a15e411`).

## What it is
- Zero-build PWA: vanilla HTML/CSS/ES6 (Three.js for the 3D table). No npm, no bundler.
- Live code (repo root): `index.html`, `app.js` (~7.5k lines), `styles.css` (~11.5k lines), `atlas.js`, `spatial.js`, `deepzoom.js`, `audio.js`, `ambient.js`, `sw.js`, `version.json`.
- Data (read-only to the app): `data/index.json` (boot index), `search.json`, `master_catalog.json`, `detail/{ISO}.json`.
- Pipeline (Python) is on Drive under `pipeline/`, not in this repo. See "Known caveats" before running anything.
- Local server: `python -m http.server 8000`

## Collection facts (from `data/index.json`, ledger v252)
- 273 flips (coins/tokens in 2x2 flips), 21 bullion lots, 2 sets, 45 countries, 62 album families.
- Policy: **HOLD / do not sell.** Estimated value ~$5,584. Physical silver ~63 oz, gold ~0.13 oz.
- **0 photos exist.** All 273 flips are status `Logged` and awaiting Phase 2.

## Where things live
| Thing | Location |
|---|---|
| Code | `github.com/jpavia10/titan-reliquary-preview` (branch `main`), live at `jpavia10.github.io/titan-reliquary-preview/` |
| Drive backup | Google Drive folder `Titan Reliquary` (meant to be the single home; consolidation is planned, not done) |
| Old/original app | `jpavia10.github.io/titan-reliquary` (Grok's) |
| Photo shard sites | `titan-photos-{as,eu,na}` GitHub Pages repos |

## Rules
1. Check `SHARED_LOG.md`, do your work, append a 2-3 line entry.
2. Ownership: Grok = data/pipeline, Sebastian/Muse = look and feel, Antigravity = QA/release. Coordinate in the log.
3. Never edit generated files in `data/` by hand.
4. Keep Dad-readable (high contrast, large type) and offline PWA working.
5. Never print, copy, or commit any GitHub token. Cloud sessions use the GitHub connection.
6. Anything worth keeping gets backed up to the Drive folder above.

## Photo workflow (owner's intent, confirmed in chat 2026-09-28)
1. Phase 1: photo each coin; owner pen-labels one side with country, year, denomination. AI generates metadata from the photo.
2. After all coins are done, AI reallocates serial IDs with **no bias to scan order**.
3. Phase 2: owner writes the new ID on the back, pro-scans front and back into a staging folder.
4. AI pairs the photos using the notes, then crops to 2x2 and circle.

## Owner's goals (as of 2026-09-28)
1. Masterpiece desktop + mobile app; the owner's dad can view it (e.g. "which Silver Eagle year am I missing?"). Only the owner and dad will use it, so public GitHub Pages is acceptable.
2. Photo workflow above, with AI-generated metadata from a photo (in-app scan is a later goal; a Drive inbox + watcher is the realistic first step). Pick the model by bake-off: ~30 coins already in the ledger, score each model against the known answers.
3. Consolidate everything onto Google Drive only. Back up core collection JSON (`data/`) separately from the app.
4. Every piece of work gets backed up to the Drive folder.
5. Work in small steps; do obvious fixes first; no big changes until the owner confirms.

## Status log (newest first)
- 2026-09-29: Session moved to the cloud. Repo cloned from GitHub; `CLAUDE.md` restored from the Drive copy (the earlier local commit never reached GitHub).
- 2026-09-28: Audit done. `CLAUDE.md` and corrected `README.md` written. All project files copied to Drive. Old local copies recycled; Desktop shortcut now points at the live preview site.
- 2026-09-28: GitHub token removed from git remote URLs. It was not stored elsewhere; cloud sessions use the GitHub connection.
- Not yet started: Drive consolidation (top level still holds older duplicate app files), ROADMAP checkbox cleanup, photo-doc reconciliation, model bake-off.

## Open questions for the owner
1. Which photo protocol is current? Owner's plan above (pen label, unbiased IDs, back label, pro scan) versus the "Stage 1 bare coin" staging protocol.
2. Which ID scheme wins: `EU-CH-008`, `TITAN-###`, or new?
3. Is the master `LEDGER.md` (Grok's box, `/home/box/collection`) backed up anywhere?
4. Is the preview repo the official app? The Drive "TAP HERE" doc may still open the old `jpavia10.github.io/titan-reliquary`.

## Known caveats (unresolved, do not assume)
- Three docs describe the photo workflow differently (`docs/DIGITIZE.md`, `docs/ARCHIVAL_STAGING_PROTOCOL.md`, `collaborators/AI_MODEL_UNIVERSAL_INGESTION_GUIDE.md`). Owner's plan above wins until reconciled.
- Three ID schemes coexist: `C###`, `EU-CH-008`, `TITAN-###`. Final scheme undecided.
- `pipeline/parse_vault.py` and `publish_all.sh` use Linux paths (`/home/box/collection`). The master `LEDGER.md` is not in this folder.
- Deploy previously meant hand-syncing mirrors and bumping `?v=trXX` and `version.json`. See `README_CONTEXT_HANDOFF.md` on Drive.
- GitHub Pages is publicly reachable; `noindex` only hides it from search.
