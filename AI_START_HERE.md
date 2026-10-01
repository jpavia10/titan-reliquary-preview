# Titan Reliquary · START HERE (for any AI: Claude, Gemini, Grok, Muse, …)

Titan Reliquary is a private coin and precious-metals collection (273 coins/tokens, 21 bullion lots, 2 sets) kept by Joseph Pavia (the "owner"). Its master record is a folder of JSON files called `collection/`. The website is generated from it.

The owner says one of these in chat, or a scheduled task says it:
- **"Titan: process the staging folder"** → do every photo in STAGING, one coin at a time (section 1).
- **"Titan: process the staging folder as a batch"** → same work, one change file for the whole batch (section 2).
- **"Titan: Phase 2 review of C### (or: of the whole collection)"** → critical analysis (section 4).
- **"Titan: process the album scans"** → Phase 1.5 (section 5).
- **"Titan: process the image requests"** (Grok, still images only) → Drive `art-requests-images (Grok)`, rules `IMAGE_START_HERE (for Grok)`.
- **"Titan: process the video requests"** (Gemini Veo, video only) → Drive `art-requests-video (Gemini Veo)`, rules `VIDEO_START_HERE (for Gemini Veo)`. Both: `docs/art/ART_QUEUE.md`.

You never edit code, the website, GitHub, the Drive mirror, or the collection files directly. You read the master, look at photos, and write **one change file**, which you drop in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Claude (the integrator) merges it with the pipeline and owns the site. This holds for Grok too: Grok no longer publishes a ledger and does not edit GitHub or the Drive mirror. If any older document (`collection/README.md` hand-edit steps, `DRIVE_ANALYSIS.md`, old ledger notes) says otherwise, it is out of date; follow this page and `collection/templates/INSTRUCTIONS.md`.

Schema: **v3** (`schema/v3/`). Every field has a tier: Phase 1, Phase 1.5, Phase 2, owner only, pipeline only. `collection/templates/FIELDS.md` lists them (column "who writes it"). The exact file format is in `collection/templates/INSTRUCTIONS.md` (read it next, it is one page); every field you may write is in `collection/templates/FIELDS.md`.

## Where things are (these are the real folder names)
| What | Where |
|---|---|
| The master (read this) | GitHub repo `jpavia10/titan-reliquary-preview`, folder `collection/`: coins = `specimens/{ISO}.json`, what a coin IS = `types/{ISO}.json`, binder volumes = `albums.json`, bullion/sets = `lots.json`. Read-only mirror on Drive: `Titan Reliquary/collection/` |
| Photos to process | Drive `Titan Reliquary/STAGING (drop coin photos here)/` |
| Where your change file goes | Drive `Titan Reliquary/collection-incoming (AI change files)/`. If you can commit to the repo instead, `collection/_incoming/` there. If you can do neither (plain chat), print the whole file in a code block and tell the owner to save it under its file name in the Drive folder above. |
| The exact change-file format + rules | `collection/templates/INSTRUCTIONS.md`, worked examples `collection/templates/phase1_template.jsonl`, `phase2_template.jsonl` |
| Every writable field, type and unit | `collection/templates/FIELDS.md` |
| Photo naming and folders | `docs/PHOTO_FOLDERS.md` |

## Check your file before you hand it over
- **You can run Python** (repo cloned, `pip install jsonschema`): `python3 tools/pipeline/apply_changes.py --dry-run <your file>`. It prints `APPLIED … (dry run, nothing written)` or `REJECTED` with one line per problem. Fix and rerun until it applies.
- **You cannot run code**: go through the self-check list at the end of `collection/templates/INSTRUCTIONS.md` (section 7). A file with one bad line is rejected whole, so check every line.

## 1. Phase 1: quick pass (one photo = one coin)
The owner pen-labels one side of each flip (country, year, denomination). For each photo in STAGING:
1. Read the label and the coin. Identify country, year, denomination, visible mint mark, metal (a guess is fine, say so in `confidence`).
2. Search the master for it (`types/{ISO}.json`, then `specimens/{ISO}.json`; `{ISO}` is the two-letter country code, see `collection/ref/issuers.json`). The ledger already holds 273 pieces that have no photos yet, so a photo usually shows a coin that is already there. **Already there** = a specimen of the same type, year and mint mark exists. Count them: if the ledger has N such specimens and this run has shown you fewer than N photos of it, do not create a record; note "matches C###" in your chat summary (the owner pairs photos to ids later). Only a photo beyond that count is a new piece. If you cannot tell, do not create; list it under "possible duplicates".
3. New piece → write the Phase 1 events (create the type `{ISO}.X.{denomination-slug}` if no existing type fits; create the specimen with id `NEW-1`, `NEW-2`, …), with `source` = the photo's file name, `phase: 1`, an honest `confidence`. Phase 1 stays **thin**: country, year, denomination, mint mark, class, and a short **story** (2-4 plain sentences). Already in the master → no new record; you may add its `story`.
4. Unknown fact → `null`. Phase 1 never writes a serial, a grade or other condition judgement, a catalog number, a price/value, a mintage, composition, weights or sizes: the checker rejects the whole file. Those are Phase 2.
Special cases: **two coins in one photo** → one specimen per coin, same `source` file, say left/right in `notes`. **Medal, token or prop** → type `class: "token"` / `"medal"` / `"prop"` (its specimen gets a `T###` id automatically). **Label unreadable or coin unidentifiable** → write no events for it; list the file in your summary so the owner can re-shoot. **Country not in `ref/issuers.json`** → create the issuer first (`entity: "issuer"`, `op: "create"`, needs name, iso, continent). Note: East Caribbean States uses `EC` in this project even though ISO `EC` is Ecuador (open question, `collection/CURATION_OPEN.md`): use the existing issuer id, do not invent a new code.
Serial numbers (`ser`) are NOT yours: they are assigned automatically and reassigned once, after Phase 1 is finished.

## 2. Batches
"Batch" = the same work for every photo, written as **one** file `changes_{agent}_{YYYYMMDD-HHMM}.jsonl` (e.g. `changes_gemini_20261002-1830.jsonl`). Order matters inside the file: create a type *before* the specimens that use it. Finish with a short summary in chat: how many photos, how many new coins, how many skipped (already in the master), every possible duplicate, and every photo you could not read. Do not move or delete the photos; the pipeline files them.

## 3. What happens after you hand the file over
The integrator (or the scheduled job) runs `python3 tools/pipeline/publish.py`: it applies your file, validates, and rebuilds the site. A file with any problem is rejected whole with a report (`rejected/*.report.txt` next to the drop folder); nothing changes. Fix the reported lines and submit the file again under a new name. Submitting a file twice is harmless.

## 4. Phase 2: critical analysis (after the pro photos)
Phase 2 starts after the serial reassignment. For each coin: check every field against the pro photos (obverse + reverse at minimum) and a cited reference (Krause/KM#, Numista N#, mint data). Correct what is wrong (including the Phase 1 fields and story), and fill every **Phase 2** field in `collection/templates/FIELDS.md` that the photos and sources actually support (new in v3: `period`, `ruler`, `commemorates`, `variety`, `measured.die_axis_deg`, `research.open_questions`). One event per fact, each with its `source`.
- Condition fields (`condition.grade`, `strike`, `luster`, `toning`, `cleaned`, `damage`) only from the pro photos: `source` must name at least one photo file (e.g. `C042_obv.jpg + C042_rev.jpg`) or a cited reference. The checker rejects anything else, and rejects sources like "n/a", "AI", "unknown" or anything under 8 characters.
- `verified` is always `false`; only the owner verifies.
- Photo records (`photos.json`) are created by the photo pipeline, not by you; just cite the file names.

## 5. Phase 1.5: album scans
Binder volumes whose contents are only partly known (`needs_scan: true` in `albums.json`) are finalized from the owner's fresh scans of each album page. Scans are in STAGING too, named `A###_p{NN}_{YYYYMMDD}.jpg` (volume, page). For each scan, write **album** events (`entity: "album"`, `id: "A026"`, `op` is the default `set`; you cannot create a volume): per slot, `slots.N.state` (`filled` / `empty` / `unknown`), `slots.N.occupant_status` and, where useful, `slots.N.label`. `ledger` = the owner's own ledger (`ALBUMS.md`) states it; **never write `ledger` yourself**. What you read off a scan is `inferred` and needs `slots.N.provenance` such as `"inferred: scan A026_p03_20261010.jpg, slot 5 visibly empty"`. Do not change `slots_total` or `slots_filled_claimed` (owner-verified counts); if the scan contradicts them, say so in your chat summary. Details and an example: INSTRUCTIONS.md section 5.

## 6. What you must never do
Edit `data/` (it is generated), GitHub or the Drive mirror, overwrite a story the owner wrote, set `ser`, reuse or invent ids, overwrite a field the owner verified, or present an inferred value as fact (album slots filled from the Whitman model are marked `inferred`). Never put a token, password or personal file path in a change file.
