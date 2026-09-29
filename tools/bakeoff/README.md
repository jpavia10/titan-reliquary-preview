# Photo-metadata model bake-off

Goal: pick the cheapest vision model that reads a Phase 1 photo (pen-labelled flip) and fills the core record fields with no invented values. Protocol: `docs/PHOTO_PROTOCOL.md` on Drive, Step 2.

## Files
- `select_testset.py` builds `testset.json`: 30 known-answer coins from the ledger (only `high` confidence, numeric year, KM# present), stratified so non-European and silver coins are tested (the collection is ~80% European).
- `score.py` scores a model's output against `testset.json`.

## Run
1. Photograph each coin in `testset.json` per Phase 1 (pen label on Side 1, whole 2x2 in frame, dark background). Name files `{scan}.jpg` (for example `C001.jpg`).
2. Run every candidate model on every photo with the same prompt (below). Save one JSON per model: `{"C001": {"country": "...", "year": "...", "denom": "...", "mint": "...", "km": "..."}, ...}`.
3. `python3 tools/bakeoff/score.py results/MODEL.json`

## Prompt (same for all models)
> This is a photo of a coin in a 2x2 flip with a handwritten label. Return JSON with keys country, year, denom, mint, km (Krause number without the "KM#" prefix). Use only what you can see on the coin or label or confirm from a standard catalog. If you are not sure of a field, return null. A wrong confident answer is worse than null.

## Scoring
- Per field: correct / wrong / abstained. Abstaining (null, "", "unknown") is never counted as wrong.
- **Core accuracy** = correct over country, year, denom, mint. Mint is only scored for coins whose ledger value is a bare mark like `B` (the ledger's mint field is otherwise free text), so it covers only some coins.
- **Invented-value rate** = confident wrong answers over all scored fields. This is the number to keep near zero.
- Suggested bar: core accuracy >= 95% and invented-value rate <= 1%. Then pick the cheapest model that clears it; record cost and seconds per coin alongside.
