# Phase 2 intake: pro scans to the site

## What the owner does
1. Write the coin's id (`C###`) on its 2x2 flip.
2. Scan the front and the back of every flip on the pro scanner.
3. Drop the scans in Drive `Titan Reliquary/STAGING (drop coin photos here)`. Good names pair themselves: `C042_obv.jpg`, `C042_rev.jpg`
   (`_front` / `_back` work too). Any name works, because the id is read from the writing on the flip.
4. Say "Titan: process the staging folder". Files over about 7 MB cannot be read through the Drive connector; save a smaller JPEG
   (long edge 4000 px, quality ~85) next to it and say so.

## What Claude does
1. Lists STAGING and gives crop agents batches (`tools/photos/P2_AGENT_BRIEF.md`). Each agent reads the id, finds front vs back from the
   design, cuts the round image and the 2x2 flip square, checks every cut by eye, and writes one result line per scan.
2. Reviews the agents' check images. Scans whose written id disagrees with the coin, or that cannot be read, go back to the owner as a short list; they are never registered.
3. `python3 tools/photos/register_photos.py RESULTS_DIR --phase 2` copies the images into the site and writes one change file
   (`collection/_incoming/changes_script_{stamp}-photos-p2.jsonl`).
4. `python3 tools/pipeline/publish.py` merges it, rebuilds `data/`, and the app shows the new photos. Then push and deploy as usual.
5. Scores outside AIs as usual if one helped; files the scan originals into `_raw_capture/{CONT}/{ISO}/`.

## Files
| What | Site path | Photo id |
|---|---|---|
| Round cut-out, 1200 px WebP | `photos/p2/C042_obv.webp` | `C042-obv-p2` |
| 2x2 flip square, 1600 px WebP | `photos/p2/C042_obv_2x2.webp` | `C042-obv-p2-2x2` |
| Full scan (master) | stays on Drive only (`Titan Reliquary/photos/`), not in the site repo: full scans are too big for GitHub Pages | none |
| A re-scan (second take) | `..._t2` in the names | `C042-obv-p2t2`, ... |

Phase 1 phone cut-outs stay in `photos/p1/`. When a Phase 2 photo of the same coin, side and kind arrives, the Phase 1 one is marked
`superseded_by` in the photo record (`op: set`, the one edit a photo record allows) and the app stops listing it. The files stay, and the history is in `changes.jsonl`.
A 2x2 with no round cut-out replaces the Phase 1 circle too.

## What the app shows
Phase 2 photos come first, and the round one comes before the 2x2 of the same side (so tiles, the coin view and the showcase stay round). Only
Phase 1 photos carry the "phone photo" label. The Phase 2 checklist counts photos with `phase: 2`.

## Not registered (listed for the owner)
`mismatch` (id on the flip disagrees with what the coin shows), `ambiguous` (no readable id), `unusable`, `download_failed`.
