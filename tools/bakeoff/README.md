<!-- doc-status: current; normative: yes; how the photo-model bake-off (#4) and the locked coin test (#19) are run -->
# Photo-model bake-off and the locked coin test

Goal: measure how well each AI reads a coin from a photo, on photos it cannot look up, and pick which AI does Phase 2 research
(fix list #4). The locked set (#19) is a second, harder pack kept apart from all day-to-day work, so scores stay fair over time.
Results go to `collaborators/MODEL_ACCURACY.md` (accuracy) — not to `CONTRIBUTOR_SCORES.md` (rule-following).

## The packs (2026-10-08)
| pack | photos | what is in it | where |
|---|---|---|---|
| main | 30 | coins whose answers we trust (high-confidence record, KM number, phone photo, numeric year, no open question, no contradiction), up to 12 from outside Europe, the silver ones included | `docs/bakeoff/pack-20261008-main/` |
| locked | 15 | hard coins with known answers: corrected after logging, the only coin of its country, or a type with a look-alike variety | `docs/bakeoff/pack-20261008-locked/` |

The photos are named `BK-xxxx.webp` at random. They are re-encoded, resized and slightly turned, so they never match the public
`photos/p1/` files byte for byte, and the phone cut-outs show only the coin (the pen label is cut away). Each pack has a `PROMPT.md`:
the one prompt every model gets, and the answer format.

**The answer keys are not in this repository.** They are in Drive `Titan Reliquary/_locked (answer keys: Claude only)/`. Their sha256
is committed in `commitments.jsonl`, and the scorer refuses a key whose hash is not there, so a key cannot be changed after the runs.
Residual risk, stated plainly: a model with code tools could compare the blind photos with the public ones by eye; the prompt forbids
looking anything up, and the Phase 2 pro photos (never public) will remove the risk for the locked set.

`testset.json` / `select_testset.py` (2026-09) are the older PUBLIC list of 30 known-answer coins. They stay for the closed-book text
test in `tools/enrich_test/`, never for scoring photo reads.

## Run a model
1. Give the model the pack folder (`https://github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-main`)
   and its `PROMPT.md`, nothing else. Same photos and prompt for every model (prompt version `BAKEOFF@2026-10-08`).
2. Its JSON reply lands in chat or in Drive `Titan Reliquary/bakeoff (blind photo test)/`.
3. Claude downloads the key from `_locked` into its scratch folder (never the repo) and scores:
   `python3 tools/bakeoff/score.py --key KEY.json ANSWERS.json --record "exact model name" --cost 0.12`
4. Tell the model only its totals. Never the coin ids or the answers (that would burn the pack).

## Scoring
- Per field: correct / wrong / abstained. Abstaining (null, "", "unknown") is never wrong.
- **Core accuracy** = correct over country, year, denomination, plus the mint mark where the key has one.
- **Invented-value rate** = confident wrong answers over all scored fields. Keep it near zero.
- **False confidence** = answers marked "high" with a wrong core field, over answers marked "high".
- Bar to do Phase 2 research: core accuracy ≥ 95 %, invented rate ≤ 1 %, false confidence ≤ 5 %. Cheapest model that clears it wins.

## Make a new pack
`python3 tools/bakeoff/make_pack.py --set main --key-out SCRATCH_DIR` (then `--set locked`, same `--key-out`, so the locked pack never
repeats a main coin). Upload the key to `_locked`, commit the photos, `PROMPT.md` and the new `commitments.jsonl` line. Replace a pack
when it leaks (its answers appear in a prompt or feedback) or once every model has taken it.
