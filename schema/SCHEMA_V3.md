# Schema v3 (2026-10-01)

v3 is v2 (`SCHEMA_V2.md`: type/specimen split, one copy per fact, computed album holes, provenance in `changes.jsonl`) plus **phase tiers**:
every field path has an owner, and the pipeline enforces it.

## Files
| File | What |
|---|---|
| `schema/v3/defs.schema.json` | entity definitions (JSON Schema 2020-12). `tools/schema/validate.py` checks `collection/` against it. |
| `schema/v3/field_tiers.json` | who may write each field path (longest prefix wins, `*` = list index). |
| `tools/schema/migrate_v2_to_v3.py` | the one-time, idempotent upgrade of `collection/` (adds the new nullable fields; changes no value). |
| `collection/templates/FIELDS.md` | generated reference: every path, its type, unit and **who writes it**, plus the Phase 1 list. |

## Tiers
| Tier | Who | Fields (summary; full list in `FIELDS.md`) |
|---|---|---|
| **phase1** | any model, `phase: 1` (also allowed in Phase 2) | type: `class`, `denomination`, `issues.N.year/mint_marks/mint_text/qualifier`; specimen: `type`, `year_raw`, `issue.year/mint_marks/mint_text/qualifier`, `quantity`, **`story`**, `notes`; issuer create; lot basics |
| **phase1_5** | `phase: 1.5` (album scans) | album `slots.N.state/occupant_status/label/provenance` |
| **phase2** | `phase: 2` (pro photos + cited sources) | everything else descriptive: catalogs, composition, nominal, precious, design, legal tender, mintage, condition, value, measured, variety, period, ruler, commemorates, `research.open_questions`, ... |
| **owner** | `by: owner` / `person:<name>` | acquisition, lifecycle, insurance, disposal plan, sentimental, want priority, featured, storage, housing location, album `slots_total` / `slots_filled_claimed` |
| **system** | the pipeline only | `id`, `ser`, `photos`, `research` (except `open_questions`), `ledger_text`, type `country`/`issuer` (from the id prefix) |

Rules the pipeline adds in v3 (`tools/pipeline/apply_changes.py`):
- A model event must carry `phase` (1, 1.5 or 2) and may only touch fields of that phase's tiers.
- A Phase 1 type id never carries a catalog number: `{ISO}.X.{denomination-slug}`. Phase 2 adds `catalogs`.
- `story` is allowed from Phase 1. A story last written by the owner can only be replaced with `supersedes` (the owner's words win).
- The pipeline keeps `specimen.research` (`phase` 0/1/2, who and when) in step with model events. All 273 ledger specimens start at phase 0
  (the 2026-09-30 bootstrap curation was ledger clean-up, not the owner's Phase 2).
- Ids: new coins number straight on from the highest existing `C` id (C271, then C272 Austria 1925, C273 Germany 2005, C274 next; owner decision 2026-10-02, replacing the old C297-C300 rule). `NEW-n` placeholders do this for you.

## New fields (all nullable, Phase 2 unless noted)
- `specimen.research` (system): `{phase, phase1_at, phase1_by, phase2_at, phase2_by, open_questions[]}`; `open_questions` is Phase 2.
- `specimen.variety`: attributed die variety of this piece (cited).
- `specimen.measured.die_axis_deg`: measured die axis, 0-360.
- `type.period`, `type.ruler`, `type.commemorates`.

## Contract
Contributors (Grok, Gemini, Muse, any AI) never edit GitHub, the Drive mirror or the records. They drop
`changes_{agent}_{YYYYMMDD-HHMM}.jsonl` in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Claude merges with
`python3 tools/pipeline/publish.py` (apply, validate, rebuild `data/`) and owns the site.

## Schema v4 (2026-10-02, owner): Phase 1 includes a default value
- `specimen.value.est_usd`, `value.confidence` and `value.face` move from Phase 2 to Phase 1 (`schema/v3/field_tiers.json`). Every Phase 1 coin carries a default estimate (confidence `low`) so it counts in the portfolio and the Growth line from the day it is logged.
- Picking the default: same type in the collection > comparable coins in the collection > melt (precious metal) > a named typical retail price. Phase 2 refines it for grade, variety and condition with a cited source.
- File layout is unchanged (still `schema/v3/`); only the tier rules moved.
- **Album counts from a photo (owner, 2026-10-02):** a Phase 1.5 event may RAISE `album.slots_total` or `slots_filled_claimed` when the page photo shows more holes or more coins than stored (tier `phase1_5_raise`). The event's `source` must name the photo file; a lower number is rejected and goes to the owner as a question. Never invent holes: count what the photo shows; the volume `id` never changes.
- New enum values: slot `occupant_status: "photo"` (read slot by slot from a photo of the page; `provenance` names the photo file) and volume `grid_source: "photo"`.
