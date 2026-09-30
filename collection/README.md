# Titan Reliquary collection master (schema v2)

**This folder is the master record of the collection.** Any agent, on any machine, may read it and update it by following the contract below. It replaces the ledger export as the place where facts live (owner decision, 2026-09-30). The app's `data/` folder (`index.json`, `detail/*.json`, `search.json`, `master_catalog.json`) is a **generated view for the website**, never the master: never edit it by hand and never copy facts from it back here without checking.

Bootstrapped 2026-09-30 from ledger **v254** (Grok's pipeline output, generated 2026-09-30 15:12 UTC) by `tools/schema/migrate_v1_to_v2.py`. The migration was a one-time bootstrap; it refuses to overwrite this folder.

## Files
| Path | What it holds |
|---|---|
| `manifest.json` | schema version, source ledger version + time, counts, totals, `content_hash`, and a `files` list (path, sha256, bytes) of **every** file here except itself. `tools/drive/sync_to_drive.gs` mirrors exactly those files to Drive. |
| `boot.json` | columnar, integer-coded list of all specimens for first paint (generated; do not hand-edit, see "After any edit") |
| `types/{ISO}.json` | one record per **Type** (what a coin IS): denomination, catalog numbers, composition, nominal weight/size, design, legal tender, every known Issue (year + mint marks + mintage). Shared by all specimens of that type. |
| `specimens/{ISO}.json` | one record per **Specimen** (the physical piece the owner holds): `C001`, `T001`. Condition, housing, acquisition, value estimate, story, notes, photo ids. |
| `lots.json` | bullion lots `B###`, sets `S###`, housing `H###`, stamps `P###` (held as a group) |
| `albums.json` | the 33 binder volumes `A###` and their **slot grids**. Holes are computed (see below). |
| `ref/issuers.json` | who issued (45 countries + 3 historical issuers: `DE-EMP`, `MX-CHI`, `VN-SOV`) |
| `photos.json` | photo records (Phase 1 / 1.5 / 2). **Empty: 0 photos exist yet.** |
| `valuations.jsonl` | append-only, one dated value per specimen/lot (v254: 301 lines) |
| `changes.jsonl` | append-only audit log: one **ChangeEvent** per fact changed since the ledger |
| `CURATION_OPEN.md` | what the data could not settle; raw values were kept. Owner/Grok checklist. |
| `SER_REASSIGN_PLAN.md` | dry-run plan for the one-time serial reassignment. **Not applied.** |
| `_incoming/` | Drive-only drop zone (not in git) for agents without GitHub access, see below |

Records are one per line (sorted keys), so `git diff` shows exactly which record changed. The schema is `schema/v2/defs.schema.json` (entity definitions; Tier 2 fields are present and `null` until someone fills them).

## Identity rules
- `id` is permanent and never reused: `C###` coin, `T###` token/prop/novelty, `B###` bullion lot, `S###` set, `H###` housing, `P###` stamps, `A###` album volume. Photos, history and valuations hang off it. Retired ids: **`C297`-`C300`** (an earlier agent invented four "1914 France 5 Francs" records that are not in the ledger; they must never appear).
- `ser` (e.g. `EU-CH-008`) is the display serial. It stays as the ledger has it until the **one-time reassignment** (Phase 1 metadata for all coins, then reassign with no bias to scan order, then Phase 2 pro photos). Do not edit `ser` by hand; see `SER_REASSIGN_PLAN.md`.
- Type id: `{issuer}.{catalog}.{number}` with catalog priority KM > Y > Schön (`Sch`) > JNDA, e.g. `CH.KM.24a.1`, `SU.Y.126a`; with no catalog number: `{issuer}.X.{denomination-slug}`. `{issuer}` is the ISO code, or a historical issuer id from `ref/issuers.json` (`MX-CHI.KM.612`). `TITAN-###` ids are dropped.

## Meaning of `null`, `verified`, `inferred`
- **`null` = not known.** Never `""`, `"unknown"` or `"n/a"`. Empty arrays mean "none recorded". The app renders every null as an em dash.
- **`verified`** lives on ChangeEvents. `false` = written by a model or pipeline and not yet checked by a human; `true` = the owner (or a named person) checked it against the physical piece or a reference. Everything the bootstrap curation changed is `verified: false`.
- **`inferred`** lives on album slots (`occupant_status`). `ledger` = the ledger's `ALBUMS.md` states this slot; `inferred` = derived from the published Whitman layout or slot arithmetic only (with `provenance: "inferred: Whitman <model> ..."`); `unknown` = not known. Never present an inferred slot as ledger fact.
- `specimen.measured.*` is null until someone measures the piece. The weights and sizes in `types/` are catalogue/ledger specifications, not measurements.
- Units are in the field name: `_g`, `_mm`, `_oz` (troy), `_usd`. A range is `weight_min_g`/`weight_max_g` with `weight_g: null`. Face amounts are in the currency's major unit (50 øre = `0.5` NOK).

## How to update a field
1. Edit the record in `types/`, `specimens/`, `lots.json`, `albums.json` or `ref/issuers.json` (keep one record per line, keys as they are).
2. Append **one line** to `changes.jsonl` (never edit or delete earlier lines):
   `{"ts":"2026-10-02T18:30:00Z","by":"model:opus-5.5","entity":"specimen","id":"C001","field":"condition.grade","old":null,"new":"AU-55","source":"owner photo review","verified":false}`
   `by` is `owner`, `model:<id>` or `script:<name>`; `field` is a dotted path; `old`/`new` are the old and new values; `source` says where the fact came from.
3. Run `python3 tools/schema/validate.py collection/ --update-manifest` (needs `pip install jsonschema`). It must print `RESULT: CLEAN`.
4. If you changed a value that also appears in `boot.json` (ser, year, denomination, estimate, status, type) change that row too; the validator checks it. For a value estimate also append a line to `valuations.jsonl` (`{"id","at","est_usd","method","spot_ag","spot_au","source"}`, one per id per date).
5. Commit. Only one session integrates into `main` at a time.

## How to add a coin
1. Pick the next free id: the highest existing `C###` number + 1 (never reuse one). During the handover the ledger pipeline may also allocate `C###` ids, so compare with the newest ledger export first (`python3 tools/schema/check_totals.py <ledger data dir> collection/` shows ids on either side only).
2. Find its Type (same issuer + catalog number). If none exists add one to `types/{ISO}.json` (list the issue year and mint marks under `issues`). If the type exists but this year/mint is not listed, add the Issue to it.
3. Add the Specimen to `specimens/{ISO}.json` (`type`, `issue` copied from the type's matching issue, `year_raw` exactly as recorded, `acquisition.logged_at`, `lifecycle.status: "Logged"`, every other field `null`/`[]`), add its boot row and a valuation line.
4. Append a ChangeEvent for each fact the model supplied (`entity: "specimen"`, `field: "(new record)"` is fine for the creation itself), then validate.

## Albums
`albums.json` lists each volume's **named** slots only; `slots_total - len(slots)` are unnamed slots. **Holes are never stored**: `python3 tools/albums/album_calc.py collection/` computes them (`missing = slots_total - slots_filled_claimed`; the named missing slots are those with `state: "empty"`). Example: `python3 tools/albums/album_calc.py collection/ A026` lists the 18 missing American Silver Eagle years. Volumes with `needs_scan: true` (23 of 33: 11 count-only, 12 partial) are finalized from the owner's fresh album scans at **Phase 1.5**, not by guessing. Once album coins are itemized they get `C###` ids and go in `slot.occupant`.

## Photos (Drive, see `docs/PHOTO_FOLDERS.md`)
Phase 1 phone photos and Phase 1.5 album scans are raw reference only; Phase 2 pro photos (at least obverse + reverse per coin) are masters. A photo gets one record in `photos.json` (`id`, `specimen`, `side`, `phase`, `kind`, `path`, `sha256`, review status) and its id is listed in `specimen.photos`. Paths follow `photos/{CONT}/{ISO}/{SER}_{year}_{denomSlug}_{role}.jpg`.

## Drive and `_incoming/`
`tools/drive/sync_to_drive.gs` mirrors the files listed in `manifest.json` to Google Drive `Titan Reliquary/collection/` daily. An agent with **no GitHub access** puts a file `collection/_incoming/changes_{agent}_{YYYYMMDD-HHMM}.jsonl` in that Drive folder (same ChangeEvent format as `changes.jsonl`, plus the full new value in `new`). The integrator validates those files, applies them to the records here, and appends them to `changes.jsonl`. `_incoming/` is never part of the manifest.

## Rules
- Never edit `data/` (generated) and never hand-edit `manifest.json`/`boot.json` hashes: use `--update-manifest`.
- Never rewrite history in `changes.jsonl` and never reuse an `id`.
- Don't fill `story` (the owner's words only). AI-researched facts go in with `verified: false` and a real `source`.
- Keep `CURATION_OPEN.md` current: delete an item only when a ChangeEvent with `verified: true` settles it.
- Tools: `tools/schema/validate.py` (schema + references + manifest), `check_totals.py` (reconcile with a ledger export), `test_fmt.py` (display rules, 54 cases), `reassign_ser.py` (dry-run), `tools/albums/album_calc.py` (computed holes).
