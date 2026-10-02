# How to contribute to the Titan Reliquary collection (any AI, one page) · schema v3

**The contract (2026-10-01):** contributors (Grok, Gemini, Muse, any AI) never edit GitHub, the website, the Drive mirror or the collection files. You write **one change file** `changes_{agent}_{YYYYMMDD-HHMM}.jsonl` and drop it in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Claude (the integrator) merges it with the pipeline and owns the site. If any other document (old README steps, `DRIVE_ANALYSIS.md`, old ledger notes) tells you to hand-edit records or says Grok owns GitHub or `LEDGER.md`, it is out of date: follow this page and `AI_START_HERE.md`.

Read `AI_START_HERE.md` (repo root) first for the job and the folders. This page is the file format. You never edit the collection files. You write **one file of change events**, and the pipeline checks and merges it. The owner never touches code or data. Every field you may write, with its type and unit: `FIELDS.md` (same folder).

## 1. Your file
- Name: `changes_{agent}_{YYYYMMDD-HHMM}.jsonl`, for example `changes_gemini_20261002-1830.jsonl`.
- Format: JSON Lines. One event per line, each line a complete JSON object, no comments, no trailing commas, no blank-line separated pretty-printing. Copy `phase1_template.jsonl` or `phase2_template.jsonl` and change the values (the `EXAMPLE ONLY` words in the templates' `source` are yours to replace).
- Where it goes: Drive `Titan Reliquary/collection-incoming (AI change files)/`. After processing, Claude deletes your change file from the Drive drop folder (the archived copy lives in the repo at `collection/_incoming/applied/`). A file that has disappeared was merged. If it was rejected, Claude leaves `{your file name}.REJECTED.txt` in the drop folder with the line-numbered reasons: fix them and drop a NEW file (new timestamp). If you can commit to the repo, `collection/_incoming/`. In plain chat: print the file in one code block and tell the owner to save it under that name in the Drive folder.

## 2. The event
```
{"ts":"2026-10-02T18:30:00Z","by":"model:gemini-2.5","entity":"specimen","id":"C042","field":"condition.grade","old":null,"new":"VF-20","source":"pro photos C042_obv.jpg + C042_rev.jpg","verified":false,"phase":2,"confidence":"med"}
```
| key | meaning |
|---|---|
| `ts` | the current UTC time, exactly `YYYY-MM-DDTHH:MM:SSZ`. If you cannot read a clock, use today's date and a plausible time. Many events in one file may share the same `ts`. |
| `by` | `model:<your model id>`, letters/digits/dot/dash only, no spaces (`model:gemini-2.5`). Only the owner writes `owner`. |
| `entity` | `specimen` (one physical coin, `C###`/`T###`), `type` (what the coin IS, shared by all its specimens), `lot` (bullion/sets), `album` (a binder volume `A###`), `issuer`, `photo` |
| `id` | the record's id. For a new specimen or lot: a placeholder `NEW-1`, `NEW-2` … (the pipeline assigns the real id). For a new type: `{ISO}.{catalog}.{number}` (`CH.KM.24a.1`), or with no catalog number `{ISO}.X.{denomination}` in lower case with hyphens, number first (`CA.X.1-cent`, `CH.X.5-rappen`). If that id already exists but is a different coin (other metal or design), append `.2`, `.3` … |
| `op` | `"set"` (default: change one field of an existing record) or `"create"` (add a new record: then `field` is exactly `"(new record)"` and `new` is the whole record, see section 3). `album` records cannot be created, only set. `photo` events are create-only and are written by the photo pipeline, not by you. |
| `field` | dotted path inside the record, e.g. `condition.grade`, `nominal.weight_g`, `issues.0.mintage` (`0` = first list item), `catalogs`. See `FIELDS.md` for every legal path. |
| `new` | the new value, in the right JSON type (number is `2.8` not `"2.8"`, boolean is `true` not `"yes"`, list is `[...]`). **Unknown = `null`, never `""`, "unknown" or "n/a".** Units are in the field name (`_g`, `_mm`, `_oz`, `_usd`). |
| `old` | optional: the value you saw. If it changed meanwhile your file is rejected (good: re-read and resubmit) |
| `source` | **required for every model event**: where the fact came from: photo file name, catalog + number, URL, sold-comps date. At least 8 characters; "n/a", "unknown", "AI", "test" and the like are rejected. |
| `verified` | always `false`. Only the owner verifies. |
| `phase` | **required**: `1` (quick pass from a staging photo), `1.5` (album scans) or `2` (critical analysis with the pro photos and cited sources). Each phase may write only its own fields (schema v3 tiers, column "who writes it" in `FIELDS.md`); anything else rejects the file. |
| `confidence` | `low` / `med` / `high`. Optional but please give it. |
| `supersedes` | only to overwrite an owner-verified field: the `ts` of that verified event, plus a `source` saying why (section 6) |

## 3. Phase 1: quick pass (thin, plus a story)
Look at the photo of the pen-labelled coin. Phase 1 records **only**: match an existing specimen or create `NEW-n`; country, year, denomination, mint mark, class; and a short **story**. Nothing else (see the "Phase 1 at a glance" table in `FIELDS.md`).
1. **Match first.** Search `collection/types/{ISO}.json` and `collection/specimens/{ISO}.json` (see `AI_START_HERE.md` section 1). If the coin is already in the master, do not create anything; you may add or refine its `story` with a `set` event (`entity: specimen`, `field: story`).
2. **New type** (only if none fits): `op: "create"`, id `{ISO}.X.{denomination-slug}` (lower case, hyphens, number first: `CA.X.1-cent`, `CH.X.5-rappen`; **never a catalog number in Phase 1**; country = the `{ISO}` prefix, which must be an issuer id in `collection/ref/issuers.json`). `new` holds only `class` (`coin`, `token`, `medal`, `prop`), `denomination` (`value`, `unit`, `currency`) and `issues` (`year`, `mint_marks`, `mint_text`, `qualifier`). If that id exists but is a different coin, append `.2`, `.3` …
3. **New specimen:** `op: "create"`, `"id":"NEW-1"`, `field: "(new record)"`, `new` = `type`, `year_raw` (exactly as on the coin, a string: `"1978"`, `"ND"`), `issue` (`year`, `mint_marks`, `mint_text`, `qualifier`), `story`, `notes`. Leave everything else out (it defaults to `null`).
4. **Story:** 2-4 plain sentences: what the coin is, where and when it comes from, one interesting fact that is visible or well known (the design, the era, the metal history). No invented history, no value talk, no grade. The owner's own story always wins.
5. **Never in Phase 1:** serial (`ser`), grade or any condition judgement, catalog numbers, price or value, mintage, composition, weights/sizes, design write-ups. The checker rejects them; Phase 2 adds them with sources.
Several coins in a batch: `NEW-1`, `NEW-2`, … (unique within the file; later lines may refer to `NEW-2`). Two coins in one photo: two specimens, same `source`, say left/right in `notes`. A token, medal or prop: its type has that `class` and its specimen id becomes `T###` automatically.

## 4. Phase 2: critical analysis (correct and fill)
After the pro photos (obverse + reverse at minimum). Fill every **Phase 2** field in `FIELDS.md` that the photos and cited sources actually support, and correct or refine the Phase 1 fields and the story. New in v3: `type.period`, `type.ruler`, `type.commemorates`, `specimen.variety`, `specimen.measured.die_axis_deg`, and `specimen.research.open_questions` (questions you could not settle). One event per fact you can source (see `phase2_template.jsonl`): catalog numbers (`catalogs`), type weight/diameter/edge (`nominal.*`, catalogue values, not measurements), composition, `issues.N.mintage`, `design.text`, `legal_tender`, `value.est_usd`, and the condition fields. Wrong existing data: set the correct value with your source. Do not guess; if you cannot source it, leave it alone. The condition fields `condition.grade`, `strike`, `luster`, `toning`, `cleaned`, `damage` are judged by eye, so their `source` must contain at least one photo file name (`C042_obv.jpg`) or a cited reference (`Numista N#…`, `KM#…`, URL), or the file is rejected.

## 5. Phase 1.5: album scans (slot events)
Entity `album`, `id` = the volume (`A026`), default `op` (`set`). The volume's `slots` list holds only the slots we can name; `slots.N` is list position N (0 = first), see `FIELDS.md`. For each slot you can read off a scan, set one event per field:
```
{"ts":"2026-10-12T09:00:00Z","by":"model:gemini-2.5","entity":"album","id":"A005","field":"slots.0.state","new":"filled","source":"album scan A005_p01_20261012.jpg, slot 1946 holds a coin","verified":false,"phase":1.5,"confidence":"high"}
{"ts":"2026-10-12T09:00:00Z","by":"model:gemini-2.5","entity":"album","id":"A005","field":"slots.0.occupant_status","new":"inferred","source":"album scan A005_p01_20261012.jpg, slot 1946 holds a coin","verified":false,"phase":1.5,"confidence":"high"}
{"ts":"2026-10-12T09:00:00Z","by":"model:gemini-2.5","entity":"album","id":"A005","field":"slots.0.provenance","new":"inferred: scan A005_p01_20261012.jpg shows a coin in slot 1946","source":"album scan A005_p01_20261012.jpg, slot 1946 holds a coin","verified":false,"phase":1.5,"confidence":"high"}
```
- `occupant_status`: `ledger` = the owner's own ledger (`ALBUMS.md`) states this slot (**you never write `ledger`**); `inferred` = you read it off a scan or from the Whitman layout, and then `provenance` must say so; `unknown` = not known. Never present `inferred` as fact.
- To add a slot we could not name before, set the whole `slots` list (read the current list first, append, keep every old entry unchanged, give the new one the next `s###` id; pass `old` to guard).
- Do not change `slots_total` or `slots_filled_claimed` (owner-verified counts) or `id`. The checker cross-checks them: the number of slots marked `empty` may not exceed `slots_total - slots_filled_claimed`, otherwise the file is rejected ("N slots empty but only M are missing by count"). If a scan contradicts the owner's counts, do not force it: leave those slots `unknown` and say so in chat. Setting `needs_scan` to `false` is for the owner.
- `occupant` (a specimen id) only if you are sure which `C###` sits in the slot; otherwise leave it `null`.

## 6. Rules the checker enforces
- A field the owner verified cannot be overwritten, unless your event carries `"supersedes": "<ts of the verified event>"` and a `source` saying why.
- `id`s are permanent and never reused; new ids follow the counters (`NEW-n` placeholders do this for you: new coins number straight on from the highest existing `C` id (C271, then C272 Austria 1925, C273 Germany 2005, C274 next; owner decision 2026-10-02, replacing the old C297-C300 rule). Example files use the placeholder `C000`, which never exists: never copy it into a real file).
- Each event's fields must belong to its `phase` (schema v3 tiers in `FIELDS.md`). `owner only` and `pipeline only` fields are never written by a model.
- Whole file or nothing: one bad event rejects the file with a line-numbered report (`_incoming/rejected/*.report.txt`); fix it and resubmit. A wrong-typed value (text where a number belongs, a value outside the allowed words) is reported on its own line, never a crash. Submitting the same file twice is harmless.
- Model events need a real `source` (section 2) and condition judgements need a photo file or cited reference (section 4).
- `data/` (the website's view) is generated; never copy from it.

## 7. Check your file first
**With code execution** (repo cloned, `pip install jsonschema`): `python3 tools/pipeline/apply_changes.py --dry-run <file>` from the repo root. It reads the real master, applies your events to a scratch copy and prints either `APPLIED … (dry run, nothing written)` or `REJECTED` plus one line per problem. Nothing is changed. Rerun until it is clean.

**Without code execution**, tick every item for every line:
1. Each line is one valid JSON object (double quotes, no trailing comma, `true`/`false`/`null` in lower case).
2. Has `ts` (exact format), `by` (`model:<id>`), `entity`, `id`, `field`, `new`, and `source` (8+ characters, real).
3. `verified` is `false` or absent. `phase` is present. No `ser`, no `id`, no `research` changes.
4. `op: "create"` lines have `field: "(new record)"` and a whole record in `new`; `set` lines use a path that exists in `FIELDS.md`.
5. Every type in a `new` record is the right JSON type and unit (numbers unquoted, `year_raw` a string, lists are lists, enum values spelled exactly as in `FIELDS.md`).
6. A type is created *before* any specimen that uses it; `NEW-n` placeholders are unique.
7. Phase 1 lines touch only Phase 1 fields (type: class, denomination, issues; specimen: type, year_raw, issue, story, notes). Any condition judgement is Phase 2 and names a photo file or reference in `source`.
8. Unknown values are `null`, not `""`/"unknown".

## 8. What happens next
`python3 tools/pipeline/publish.py` applies pending files, validates, rebuilds the website data and prints a summary. The owner sees the result on the site; everything you changed is in `collection/changes.jsonl` with your name, source and `verified: false` until the owner checks it.
