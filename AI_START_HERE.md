# Titan Reliquary · START HERE (for any AI: Claude, Gemini, Grok, Muse, …)

The owner says one of these in chat, or a scheduled task says it:
- **"Titan: process the staging folder"** → do every photo in STAGING, one coin at a time.
- **"Titan: process the staging folder as a batch"** → same work, one change file for the whole batch.
- **"Titan: Phase 2 review of C### (or: of the whole collection)"** → critical analysis, section 3.

You never edit code, the website, or the collection files directly. You read the master, look at photos,
and write **one change file**. The pipeline checks and merges it, and the website updates by itself.

## Where things are
| What | Where |
|---|---|
| The master (read this) | GitHub `jpavia10/titan-reliquary-preview` → `collection/` (coins = `specimens/{ISO}.json`, what a coin IS = `types/{ISO}.json`, albums, lots). Read-only mirror on Drive: `Titan Reliquary/collection/` |
| Photos to process | Drive `Titan Reliquary/STAGING (drop coin photos here)/` |
| Where your change file goes | GitHub `collection/_incoming/` if you can commit, otherwise Drive `Titan Reliquary/collection-incoming (AI change files)/` |
| The exact change-file format + rules | `collection/templates/INSTRUCTIONS.md` (one page) with worked examples `phase1_template.jsonl`, `phase2_template.jsonl` |
| Photo naming and folders | `docs/PHOTO_FOLDERS.md` |

## 1. Phase 1: quick pass (one photo = one coin)
The owner pen-labels one side of each flip (country, year, denomination). For each photo in STAGING:
1. Read the label and the coin. Identify country, year, denomination, visible mint mark, metal (guess is fine, say so).
2. Search the master for it (`types/{ISO}.json`, then `specimens/{ISO}.json`). Already there → skip it (note it in your summary).
3. New → write the Phase 1 events (create type if none fits, create specimen `NEW-n`), with `source` = the photo's file name,
   `phase: 1`, an honest `confidence`, and `value.est_usd` only if you can justify it.
4. Unknown fact → `null`. Never invent a grade, a mintage, a price or a catalog number in Phase 1.
Serial numbers (`ser`) are NOT yours: they are assigned automatically and reassigned once, after Phase 1 is finished.

## 2. Batches
"Batch" = the same work for every photo, written as **one** file `changes_{agent}_{YYYYMMDD-HHMM}.jsonl`.
Finish with a short summary in chat: how many photos, how many new coins, how many skipped (already in the master),
and every photo you could not read (the owner re-shoots those). Do not move or delete the photos; the pipeline files them.

## 3. Phase 2: critical analysis (after the pro photos)
For each coin: check every field against the pro photos (obverse + reverse at minimum) and a cited reference
(Krause/KM#, Numista N#, mint data). Correct what is wrong, fill what is empty, one event per fact, each with its `source`.
Condition grade only from the pro photos. `verified` is always `false`; only the owner verifies.

## 4. What you must never do
Edit `data/` (it is generated), write `story` (the owner's own words), set `ser`, reuse or invent ids,
overwrite a field the owner verified, or present an inferred value as fact (album slots filled from the Whitman model are marked `inferred`).
