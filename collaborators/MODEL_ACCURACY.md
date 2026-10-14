<!-- doc-status: current; normative: yes; how model numismatic accuracy is measured (separate from the operational scorecard) -->
# Model numismatic accuracy

What this measures: how well each AI model reads and identifies **these** coins, separately from whether it follows the contribution rules (that is `CONTRIBUTOR_SCORES.md`). Created 2026-10-05 (fix-list #16). No model has been measured yet: the first numbers come from the photo-model bake-off (fix-list #4).

## Rules
- **Only a test with known answers counts.** Answers come from owner-verified records (`verified: true`, `by: owner`) or from a coin with a cited catalog match. Day-to-day contributions are not accuracy data: their mistakes are caught by sampling, which is biased.
- **Two pools, never mixed.** The *research pool* is everything the AIs see during normal work. The *locked set* (fix-list #19) is a list of specimen ids whose answers are never shown to any contributor (not in prompts, change-file feedback or FEEDBACK docs). The locked set's answers live outside the files contributors read. A specimen that leaks (its answer appears in a prompt or feedback) moves to the research pool and is replaced.
- **Weight the hard cases.** The locked set leans on worn coins, look-alike varieties, poor photos, unusual countries, conflicting references, wrong pen labels (the 18 "Still being checked" coins are candidates) and past disagreements between models.
- **Same inputs for everyone.** Every model gets the same photo files (same crop version: photo `crop.method`/`tool_version`, fix-list #15) and the same prompt version. Record both with every run (event `provenance`, fix-list #14).

## The packs (2026-10-08, fix list #4 and #19)
- **main**: 30 blind photos of coins whose answers we trust. **locked**: 15 blind photos of hard coins with known answers (corrected after logging, the only coin of its country, look-alike variety types). Both in `docs/bakeoff/`; how to run and score: `tools/bakeoff/README.md`.
- Answer keys: Drive `_locked (answer keys: Claude only)`, sha256 committed in `tools/bakeoff/commitments.jsonl`. The locked set's coin ids are written nowhere else.
- Bar for doing Phase 2 research: core accuracy ≥ 95 %, invented rate ≤ 1 %, false confidence ≤ 5 %.

## Measured per run
| Field | Meaning |
|---|---|
| model, prompt_version, crop version, date | what was tested |
| country / year / denomination / mint mark | share correct |
| variety / catalog number | share correct (Phase 2 questions) |
| said "unsure" when wrong | uncertainty recognised |
| false-confidence rate | answered "high" confidence and was wrong |
| cost (tokens or USD) | for knowledge per dollar (fix-list #20) |

## Results
| date | model | pack | prompt | photos answered | core accuracy | KM accuracy | invented rate | false confidence | cost |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-09 | Grok (grok-bot), blind main pack, 2026-10-08 | main (2026-10-08) | BAKEOFF@2026-10-08 | 30 of 30 | 78% | 57% | 3.8% | 0% | n/a |
| 2026-10-09 | Muse (muse-spark-1.3), blind main pack, 2026-10-08 | main (2026-10-08) | BAKEOFF@2026-10-08 | 30 of 30 | 71% | 17% | 5.3% | 17% | n/a |
| 2026-10-14 | Grok (grok-bot), blind LOCKED pack, 2026-10-10 | locked (2026-10-08) | BAKEOFF@2026-10-08 | 15 of 15 | 76% | 47% | 3.0% | 0% | n/a |
| 2026-10-14 | Gemini (gemini app), blind main pack, 2026-10-12 | main (2026-10-08) | BAKEOFF@2026-10-08 | 30 of 30 | 85% | 63% | 3.0% | 0% | n/a |

Caveat for the 2026-10-09 rows: Grok and Muse have both worked on this collection's records (stories, Numista sweep, new coins), so the main pack partly measures recall of familiar coins, not only reading from the photo (Grok's catalogue numbers match the records it had just swept). Use them to compare the two contributors, not as a true accuracy. The real measure is the locked pack (15 coins, never shown to a contributor); it is run once, near the photo-model decision (fix list #19).

Caveat for the 2026-10-14 rows: Grok's locked-pack run is the first true measure (15 coins chosen as the hardest: look-alike types, corrected records, single-country coins). It held back when unsure (17 of 60 core fields left blank) and invented only 2 values out of 66; it is the reference number for the photo-model decision (fix list #19). Gemini's main-pack run has the same familiar-set caveat as the others, and a stronger one: Gemini worked from a full copy of the repository in Drive (including `photos/p1/` and `data/`), so its catalogue numbers may come from the records rather than the photo. Gemini's locked pack is the measure that counts; it is not due until Gemini is back (the Argon release broke its app, owner 2026-10-14).
