# Contributor scorecard

Claude (integrator) scores every submission from an outside AI. The owner asked for this on 2026-10-03 so that Muse can earn its way off probation. Grok and others can be scored the same way.

## How a submission is scored (10 points)

| Part | Points | Full marks means |
|---|---|---|
| Right place, right name | 2 | Change files go in `collection-incoming (AI change files)/` as `changes_{agent}_{YYYYMMDD-HHMM}.jsonl`. Photos go in `STAGING (drop coin photos here)/`, named with the coin id (`C274_Mexico_1995_10Centavos_rev.jpeg`), plus one `photos_{agent}_{YYYYMMDD-HHMM}.json` summary per upload run. |
| Accepted as sent | 2 | The pipeline takes it with no edits by Claude (2). Small fixes (1). Rejected or re-filed (0). |
| Accurate | 3 | Every fact Claude checks against the photo holds: country, year, denomination, mint mark. Lose 1 per fact that is wrong or written in the wrong form. |
| Complete | 2 | The photo is uploaded with its camera time (EXIF) kept, `source` names the photo file, and a Phase 1 default value is included. |
| Stays in its tier | 1 | No catalog numbers, grades, prices or cited sources that Phase 1 does not allow, and no claims about sources it did not use. |

For a batch (many coins or slots in one run), the accuracy points are 3 times the share of checked facts that hold, rounded down (100% = 3, 90-99% = 2, 67-89% = 1).

**Probation ends** after 3 submissions in a row that each score 8 or more, with no accuracy fault. Claude records that here and tells the owner.

## Muse (on probation)

| # | Date | Submission | Score | Notes |
|---|---|---|---|---|
| 1 | 2026-10-02 | `changes_muse_20261002-0302.jsonl` (1995 Mexico 10 centavos, Phase 1) | **4 / 10** | Place 2, accepted 0, accurate 2, complete 0, tier 0. Good: correct file name and folder, correct `op: create` structure, `phase` and `confidence` set, right year and denomination, a short readable story. Faults: mint mark written `M°` instead of `Mo` (the form the collection uses); cited "Greysheet KM-547" (a catalog number is not Phase 1, and Greysheet does not price world coins); no default value; the photo was not uploaded, so nothing could be checked. Re-filed by Claude as C274. |
| 2 | 2026-10-02 | Photo `NOID_Mexico_1995_10-centavos_rev.jpeg` in STAGING (attributed to Muse: no summary file, and it is in none of Grok's summaries) | **7 / 10** | Place 1, accepted 1, accurate 3, complete 1, tier 1. Good: right folder, EXIF camera time kept, and the coin is what the change file said (1995, Mo, 10 centavos, checked at full zoom). Faults: named `NOID_` although C274 had been in the shared log since tr81; no `photos_muse_*.json` summary; a chat-compressed copy (946x2048) instead of the original photo. Filed as `C274_Mexico_1995_10Centavos_rev.jpeg`. |

Streak toward leaving probation: **0 of 3** (no submission has reached 8 yet).

## Grok (not on probation)

| # | Date | Submission | Score | Notes |
|---|---|---|---|---|
| 1 | 2026-10-01 | `changes_grok_20261001-1821.jsonl` (Austria 1925 2 groschen, first Phase 1 coin) | **8 / 10** | Place 2, accepted 1, accurate 3, complete 1, tier 1. Good: clean issuer + type + specimen creates that validated first time. Faults: a note about a "Swiss 2 rappen" mis-call referred to a record that never existed (Claude removed it); no photo on Drive to check against. |
| 2 | 2026-10-01 | `changes_grok_20261001-2112.jsonl` (Phase 1.5 album pass, 210 events, 8 albums) | **9 / 10** | Place 2, accepted 1, accurate 3, complete 2, tier 1. Good: every slot map Claude later checked hole by hole against the page photos held (A006, A008, A022, A024, A031 exact; A014 = 54 was right and the ledger's 57 was wrong). Fault: whole-list slot rewrites echoed the empty Phase 2 `occupant` leaf, which the pipeline had to learn to accept. |
| 3 | 2026-10-02 | Held album drafts for A012, A015, A032, A033 (JSON in the change-file folder) | **3 / 10** | Place 1, accepted 0, accurate 0, complete 1, tier 1. Good: holding the albums it was unsure of, instead of sending them, was the right call. Faults: a JSON draft instead of a change file; A033 1947 Blunt 7 and 1953 Shoulder Fold marked filled but empty; A015 read as 9 coins, the photo shows 8. |
| 4 | 2026-10-01/02 | Photo passes 1 to 5 (~101 chat photos named, uploaded to the change-file folder, with 5 pass summaries) | **7 / 10** | Place 1, accepted 1, accurate 2, complete 2, tier 1. Good: summaries with hashes, EXIF time and a reason per file; it held the 217 it could not name instead of guessing. Faults: photos went to the change-file folder, not STAGING; 9 of about 101 names were wrong (the C019 "angles" were C051/C030/C022, C019 rev was C018, C006 angle2 was C050, C131 was C053, Italy 2 lire was C033, an A005 page was named A012, Singapore 1973 read as 1976). |
| 5 | 2026-10-02/03 | STAGING runs: 94 photos + 12 `photos_grok_*.json` summaries | **9 / 10** | Place 2, accepted 1, accurate 3, complete 2, tier 1. Good: right folder, id-prefixed names, one summary per run with EXIF time, and it caught and corrected all 8 of its own earlier wrong names (Claude checked each at full zoom: all 8 corrections are right). All 42 new coin names match the records. Fault: 43 of the 94 files were byte-identical re-uploads of photos already filed. |

Grok average so far: 7.2 / 10 (36 / 50). Trend: improving (3, 7 earlier; 9 on the latest run).
