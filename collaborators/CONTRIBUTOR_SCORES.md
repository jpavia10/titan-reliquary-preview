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

**Probation ends** after 3 submissions in a row that each score 8 or more, with no accuracy fault. Claude records that here and tells the owner.

## Muse (on probation)

| # | Date | Submission | Score | Notes |
|---|---|---|---|---|
| 1 | 2026-10-02 | `changes_muse_20261002-0302.jsonl` (1995 Mexico 10 centavos, Phase 1) | **4 / 10** | Place 2, accepted 0, accurate 2, complete 0, tier 0. Good: correct file name and folder, correct `op: create` structure, `phase` and `confidence` set, right year and denomination, a short readable story. Faults: mint mark written `M°` instead of `Mo` (the form the collection uses); cited "Greysheet KM-547" (a catalog number is not Phase 1, and Greysheet does not price world coins); no default value; the photo was not uploaded, so nothing could be checked. Re-filed by Claude as C274. |
| 2 | 2026-10-02 | Photo `NOID_Mexico_1995_10-centavos_rev.jpeg` in STAGING (attributed to Muse: no summary file, and it is in none of Grok's summaries) | **7 / 10** | Place 1, accepted 1, accurate 3, complete 1, tier 1. Good: right folder, EXIF camera time kept, and the coin is what the change file said (1995, Mo, 10 centavos, checked at full zoom). Faults: named `NOID_` although C274 had been in the shared log since tr81; no `photos_muse_*.json` summary; a chat-compressed copy (946x2048) instead of the original photo. Filed as `C274_Mexico_1995_10Centavos_rev.jpeg`. |

Streak toward leaving probation: **0 of 3** (no submission has reached 8 yet).
