<!-- doc-status: current; normative: yes; how model numismatic accuracy is measured (separate from the operational scorecard) -->
# Model numismatic accuracy

What this measures: how well each AI model reads and identifies **these** coins, separately from whether it follows the contribution rules (that is `CONTRIBUTOR_SCORES.md`). Created 2026-10-05 (fix-list #16). No model has been measured yet: the first numbers come from the photo-model bake-off (fix-list #4).

## Rules
- **Only a test with known answers counts.** Answers come from owner-verified records (`verified: true`, `by: owner`) or from a coin with a cited catalog match. Day-to-day contributions are not accuracy data: their mistakes are caught by sampling, which is biased.
- **Two pools, never mixed.** The *research pool* is everything the AIs see during normal work. The *locked set* (fix-list #19) is a list of specimen ids whose answers are never shown to any contributor (not in prompts, change-file feedback or FEEDBACK docs). The locked set's answers live outside the files contributors read. A specimen that leaks (its answer appears in a prompt or feedback) moves to the research pool and is replaced.
- **Weight the hard cases.** The locked set leans on worn coins, look-alike varieties, poor photos, unusual countries, conflicting references, wrong pen labels (the 18 "Still being checked" coins are candidates) and past disagreements between models.
- **Same inputs for everyone.** Every model gets the same photo files (same crop version: photo `crop.method`/`tool_version`, fix-list #15) and the same prompt version. Record both with every run (event `provenance`, fix-list #14).

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
None yet.
