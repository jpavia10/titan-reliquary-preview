# Photo folders and file names (owner-approved layout, 2026-09-30)

The owner delegated this layout to the integrator. It **extends Grok's existing photo system** (Drive
`photos/README.md`, standard `master-v1`) instead of creating a second one. There is exactly **one** photo home on Drive:
`Titan Reliquary/` (2026-10-01: `photos/` and `_raw_capture/` were moved there from the retired `Titan Reliquary Collection`, which is now
`Titan Reliquary/_archive/grok-ledger-v254 (...)` together with Grok's old LEDGER.md, ALBUMS.md and scripts).

## Phases (owner's numbering)
| Phase | What | Photos kept as |
|---|---|---|
| 1 | Initial photo of every coin (phone, one side pen-labelled with country / year / denomination). AI writes the initial metadata. | Raw reference only (never a master) |
| — | **After every coin has Phase 1 metadata:** one-time serial (`ser`) reassignment, no bias to scan order (`tools/schema/reassign_ser.py`, dry-run until then). `id` (`C###`) never changes. | — |
| 1.5 | Fresh scans of every album page, to finalize album slots | Raw reference only |
| 2 | Pro photos: owner writes the final `ser` on the flip, scans **at least 2 photos per coin** (obverse + reverse) | Masters (after the QC gate + approval) |

## Drive tree (`Titan Reliquary/`)
The owner's drop spot is `Titan Reliquary/STAGING (drop coin photos here)/` (listed at the bottom of this page). The pipeline files its contents into this tree; `Inbox/` below is the pipeline's own intake and the owner does not need to use it.
```
Inbox/                                  ← drop EVERYTHING here from the phone or scanner (any file name works;
  _processed/                              good names pair automatically, see below). Titan files them.
_raw_capture/                           ← private, never published, never deleted
  _phase1/{albums,coins,bullion,sets,unidentified}/  Phase 1 photos (owner's first chat/phone photos); name starts with A###/C###/B###/S###, NOID_ = no id yet
  _albums/                                 Phase 1.5 fresh album scans {A###}_p{NN}_{YYYYMMDD}.jpg (created when they arrive)
                                           index of both: docs/photos/raw_capture_index.json (file -> Drive id)
  {CONT}/{ISO}/                            Phase 2 untouched originals (as today)
  _test_only/                              test fixtures (as today)
photos/                                 ← Phase 2 approved masters only (master-v1: 2600 px, no EXIF)
  {CONT}/{ISO}/                            {SER}_{year}_{denomSlug}_{role}.jpg
  _superseded/                             replaced masters are MOVED here, never deleted
```
- `{CONT}` = `AF AS EU NA OC SA`; `{ISO}` = ISO 3166 alpha-2 (`CH`, `MX`); `{id}` = permanent key `C###`/`T###`.
- `{role}`: `obv` and `rev` are **required** (the 2 minimum). Optional extras: `label` (the handwritten flip),
  `edge`, `detail-01`, `detail-02`… (numbered, two digits).
- `{denomSlug}`: denomination without spaces in Title Case, e.g. `5Centavos`, `1Franc`, `50Ore`.
- Example: `photos/EU/CH/EU-CH-008_1969_1Franc_obv.jpg`, `…_rev.jpg`, `…_label.jpg`.
- Because Phase 2 happens **after** the serial reassignment, the `ser` in a master's name is final. If a ser
  ever has to change, use `photo_pipeline.py rename-ser` (queues Drive renames); never rename by hand.

## Names that pair themselves (Inbox and the app's Lab)
The Lab and the pipeline read the ser or id and the side from the file name:
`EU-CH-008_obv.jpg`, `EU-CH-008_rev.jpg`, `C001_front.jpg`, `C001 back.jpg`, `EU-CH-008-2.jpg` all pair.
Anything else still works; it is matched by capture time (front then back within 5 minutes) or by hand.

## Retired (empty, moved to `Titan Reliquary/_archive/`)
`Titan Reliquary/PHOTO_STAGING/` (old "Stage 1 bare coin, no labels" protocol, which contradicts the owner's
plan) and `Titan Reliquary/photos/` (`thumbs`, `agent_cropped`, `raw_archive`, `phase2_pro_staging`).
They held no photos. Nothing was deleted.

## What lives in `Titan Reliquary/` (the app folder) instead
```
site-backups/   titan-reliquary-site_{YYYY-MM-DD}_{build}.zip   (daily, last 14 kept)   ← tools/drive/sync_to_drive.gs
collection/     mirror of the repo's v2 master collection/ (coins, types, albums, lots, valuations, changes)
  _incoming/    older name of the change-file drop (still created by the sync script)
STAGING (drop coin photos here)/        <- the owner drops Phase 1 / 1.5 photos here; an AI reads them from here ("Titan: process the staging folder")
collection-incoming (AI change files)/  <- an AI without repo access saves its change file here: changes_{agent}_{YYYYMMDD-HHMM}.jsonl
                                          (format: collection/templates/INSTRUCTIONS.md); the integrator validates and merges it
```
