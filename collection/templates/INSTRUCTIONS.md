# How to contribute to the Titan Reliquary collection (any AI, one page)

You never edit the collection files. You write **one file of change events**, and the pipeline checks and merges it. The owner never touches code or data.

## 1. Your file
- Name: `changes_{agent}_{YYYYMMDD-HHMM}.jsonl` (for example `changes_gemini_20261002-1830.jsonl`).
- Format: JSON Lines, one event per line, no comments. Copy `phase1_template.jsonl` or `phase2_template.jsonl` and change the values.
- Where it goes: `collection/_incoming/` in the repo, or the Drive folder `Titan Reliquary/collection/_incoming/` if you have no GitHub access.

## 2. The event
```
{"ts":"2026-10-02T18:30:00Z","by":"model:gemini-2.5","entity":"specimen","id":"C042","field":"condition.grade","old":null,"new":"VF-20","source":"pro photo C042_obv.jpg + C042_rev.jpg","verified":false,"phase":2,"confidence":"med"}
```
| key | meaning |
|---|---|
| `ts` | now, UTC, `YYYY-MM-DDTHH:MM:SSZ` |
| `by` | `model:<your model id>` (only the owner writes `owner`) |
| `entity` | `specimen` (one physical coin, `C###`/`T###`), `type` (what the coin IS, shared by all its specimens), `lot` (bullion/sets), `issuer`, `photo` |
| `id` | the record's id |
| `field` | dotted path inside the record, e.g. `condition.grade`, `nominal.weight_g`, `issues.0.mintage`, `catalogs` |
| `new` | the new value. **Unknown = `null`, never `""`, "unknown" or "n/a".** Units are in the field name (`_g`, `_mm`, `_oz`, `_usd`). |
| `old` | optional: the value you saw. If it changed meanwhile your file is rejected (good: re-read and resubmit) |
| `source` | **required**: where the fact came from (photo file name, catalog + number, URL, sold-comps date). No source, no change. |
| `verified` | always `false`. Only the owner verifies. |
| `phase`, `confidence` | `1` / `2`; `low` / `med` / `high` |

## 3. Phase 1: quick pass (identify and record what is visible)
Look at the photo of the pen-labelled coin. Write two events (see `phase1_template.jsonl`):
1. `op: "create"` a **type** if none fits (id `{ISO}.{catalog}.{number}`, or `{ISO}.X.{denomination-slug}` when no catalog number is known, e.g. `CA.X.1-cent`). Fill only what you can see: denomination, country, year, visible mint mark, metal guess, design as seen. Check first that a matching type does not already exist (`collection/types/{ISO}.json`).
2. `op: "create"` the **specimen** with `"id":"NEW-1"` (the pipeline assigns the real `C###`), `field: "(new record)"`, `new` = `type`, `year_raw` (exactly as on the coin), `issue` (year + mint marks), `condition.text`, `value.est_usd` + `value.confidence`, `notes`. Leave everything else out; it defaults to `null`. Never write `story` (the owner's words only) and never set `ser` (assigned automatically, reassigned once after Phase 1).

## 4. Phase 2: critical analysis (correct and fill)
One event per fact you can source (see `phase2_template.jsonl`): catalog numbers (`catalogs`), type weight/diameter/edge (`nominal.*`, catalogue values, not measurements), composition, `issues.N.mintage`, `design.text`, `legal_tender`, `value.est_usd`, condition grade from the pro photos. Wrong existing data: set the correct value with your source. Do not guess; if you cannot source it, leave it alone.

## 5. Rules the checker enforces
- A field the owner verified cannot be overwritten, unless your event carries `"supersedes": "<ts of the verified event>"` and a `source` saying why.
- `id`s are permanent and never reused; new ids follow the counters (`NEW-n` placeholders do this for you). `C297`-`C300` are retired.
- Whole file or nothing: one bad event rejects the file with a report (`_incoming/rejected/*.report.txt`); fix it and resubmit. Submitting the same file twice is harmless.
- `data/` (the website's view) is generated; never copy from it.

## 6. What happens next
`python3 tools/pipeline/publish.py` applies pending files, validates, rebuilds the website data and prints a summary. The owner sees the result on the site; everything you changed is in `collection/changes.jsonl` with your name, source and `verified: false` until the owner checks it.
