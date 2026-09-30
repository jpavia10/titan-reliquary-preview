# Titan Reliquary data schema v2 (DRAFT for owner review)

Status: design + working migration, **not yet wired into the app**. The live app still reads v1. Everything here is additive: `schema/v2/`, `tools/schema/`.
Tools: `migrate_v1_to_v2.py` (v1 → v2), `validate.py` (schema + cross-reference checks), `fmt.py` + `test_fmt.py` (display rules, 54 test cases).

## 1. Why change: what the audit of today's data found

| Finding | Evidence |
|---|---|
| **The same coin lives in 3 places** | `index.json` (21 fields/coin), `detail/*.json` (48 fields/coin), `master_catalog.json` (15 fields, old `TITAN-###` IDs, 300 specimens vs the real 273). 2,731 values are duplicated between index and detail. |
| **Type facts are copied onto every coin** | 273 coins are only **156 distinct types**; 52 types are shared by 2+ coins. Design text, tender status, specs, refs are re-typed per coin, and disagree: **25 conflicts** between coins of the same type (21 in the design text, 3 in composition, 1 in tender status), plus 11 records whose country name differs from its siblings (`Mexico` vs `Mexico (Chihuahua)`, etc.). |
| **Display strings are stored as data** | `continent_line`, `year_line`, `denom_line`, `face_line` pack 3-4 facts each into one sentence (e.g. `"1996 · Mint: So / S · Santiago (mark left of neck)"`, `"50 CLP (~$0.05) · Est: $0.50 · Conf: high"`). A baked-in exchange rate goes stale; nothing can be sorted or filtered on them. |
| **Numbers trapped in prose** | Weight is only in the `metal` text ("4.40 g · 23.2 mm · reeded · circulated · white 2×2 staple flip"); thickness in `specs`; KM# inside `refs`; mint mark inside `year_line`; 197 of 273 `mint` values are longer than a mark (place names, notes), not marks. |
| **Values the model can't express** | `½ franc`, `threepence (3d)`, `Spielmarke “20”`, weight ranges (`~5–5.5 g`), coins with only a Y# or Schön# (no KM#), historical issuers (`Germany (Empire)`, `Mexico (Chihuahua)`, `Vietnam (State of Vietnam)`), tender states like "withdrawn 2012". |
| **The album data isn't data** | The 33 album volumes (917 filled slots of 1,738) are a hand-typed object inside `app.js`, not in any data file. **In 26 of 33 volumes the count of open slots does not match the list of "holes"** (e.g. A026 Silver Eagles: 36 slots, 18 filled, so 18 missing, but 6 holes listed). "Which years am I missing?" can therefore be answered wrongly today. |
| **Missing entirely** | condition/grade, certification, purchase price and date, who it came from, story, storage location, valuation history, photo records, an audit trail for AI-written facts. |

## 2. The model (one idea: separate what a coin IS from what you HOLD)

```
Issuer ──< Type ──< Issue (year+mint, mintage, varieties)
                        ^
Series ──< Slot >───────┤ (a slot expects an issue)          Photo >── Specimen ──> housing / location
Album volume ──< Slot ──occupant──> Specimen                  Valuation (append-only)  ChangeEvent (audit log)
Lot (bullion, sets, housing, stamps)
```

- **Type** = the catalogue coin (`CH.KM.24a.1`). Written once. Holds specs, design, tender, catalog numbers, and its **Issues** (1969 Bern: mintage 17,688,000).
- **Specimen** = the physical piece you own (`C001`). Holds condition, what it is stored in, where you got it, its story, its value, its photos.
- **Slot / Album / Series** = what a binder page *expects* vs what fills it. **Holes are computed** (slot with no occupant), never typed. This is what answers "which Silver Eagle year am I missing?" correctly.
- **ChangeEvent** = append-only log of who set which field (owner, or `model:opus-5.5`), from what source, and whether a human verified it. This keeps AI-researched facts traceable.

## 3. Identity

| Key | Rule |
|---|---|
| `id` (permanent) | `C###` coin, `T###` token, `B###` bullion lot, `S###` set, `H###` housing, `P###` stamps. Never changes, never reused. Photos and history hang off it. |
| `ser` (display, reassignable once) | `EU-CH-008`: continent-country-sequence. Reassigned once after Phase 1 (see `PHOTO_PROTOCOL.md`), then frozen. |
| Type id | `{ISO}.{catalog}.{number}`, catalog priority KM > Y > Schön > JNDA; else `{ISO}.X.{denomination-slug}`. Deterministic, so re-running the migration gives the same ids. |
| `TITAN-###` | Dropped (decision recorded in the photo protocol). |

## 4. Variables (Tier 1 is in `schema/v2/defs.schema.json` now; Tier 2 is planned nullable fields, added only when you want them)

**Who fills a field:** `owner` = only you know it. `AI` = a model can research it, but it is written with provenance and unverified until checked. `measured` = from the physical piece. `derived` = computed, never stored.

### Type (written once per coin type)
| Group | Fields | Filled by |
|---|---|---|
| Identity | `id`, `country`, `issuer`, `class` (coin/token/medal/prop/note/stamp) | AI + owner |
| Denomination | `value` (0.5 allowed), `unit`, `currency`, `named`, `display` override | AI |
| Catalogs | `catalogs[]` (KM, Y, Schön, JNDA, Numista, PCGS#...), `url` | AI |
| Composition | `text`, `metal_class` (enum), `fineness` (0-1) | AI |
| Nominal spec | `weight_g`, `diameter_mm`, `thickness_mm` (+ approx flags), `edge`, `shape`, `alignment` | AI |
| Precious | `asw_oz`, `agw_oz` | derived from weight × fineness |
| Design | `obverse`, `reverse`, `legend`, `designers[]`, `text` | AI, owner-approved |
| Legal tender | `status` (enum), `until`, `text` | AI |
| Issues[] | `year`, `qualifier` (circa/ND), `calendar` + `calendar_year` (AH etc.), `mint_marks[]`, `mint_text`, `mintage`, `varieties[]` (code, key date) | AI |
| Tier 2 | `series[]` memberships, `population` (PCGS/NGC counts), `price_guide` (source, value, date), `die_variety` (VAM, Cherrypicker), `error_type`, `rarity_scale`, `related_types[]`, `image_ref` (a reference image) | AI |

### Specimen (one per piece you hold)
| Group | Fields | Filled by |
|---|---|---|
| Identity | `id`, `ser`, `type`, `issue`, `year_raw` (as recorded), `quantity` | owner / pipeline |
| Condition | `text`, `grade` (Sheldon/descriptive), `grader`, `cert`, `strike`, `luster`, `toning`, `cleaned`, `damage[]` | owner (grade), AI (drafts) |
| Measured | `weight_g`, `diameter_mm`, `thickness_mm`, `magnetic` | measured |
| Housing | `kind` (flip_2x2/slab/tube/album/capsule/box/pouch/loose), `text`, `location` (container, page, slot) | owner |
| Acquisition | `logged_at`, `acquired_on`, `source`, `price_paid_usd`, `family` (who it came from) | owner |
| Value | `est_usd`, `confidence`, `face` (amount, currency) | AI + owner |
| Lifecycle | `status` (Logged/Photographed/Verified/Removed), `removed_on`, `removed_reason` (sold/traded/gifted/culled/lost) | owner |
| Narrative | `story` (never AI-written), `tags[]`, `notes`, `photos[]` | owner |
| Tier 2 | `seller_type`, `invoice_ref`, `provenance_chain[]`, `insurance` (covered, appraised_value, appraised_on, appraiser), `storage_env` (humidity, desiccant, last_inspected), `featured` + `sort_weight` (what the museum shows first), `sentimental` (1-5), `want_priority`, `disposal_plan`, `authenticity` (method, verified_on), `related_specimens[]` (siblings), `tax_lot` | owner |

### Lot, Album volume + Slot, Photo, Valuation, ChangeEvent, Issuer
See `defs.schema.json`. Highlights: **Photo** replaces today's 8 scattered photo fields (`photo`, `photo_dir`, `photo_stem`, `has_photo`, `phase2_done`, `awaiting_phase2`, `thumb`, `photos`) with real records (side, phase, kind, path, sha256, size, review status/reason, superseded_by). **Valuation** is append-only, so value can be charted over time. **Issuer** table fixes historical issuers.

## 5. Conventions (the "formatting is mastered" part)
- `null` = not known. Never `""`, `"unknown"`, `"n/a"`. Display renders every null as `—`.
- Units are implied by the field name: `_g`, `_mm`, `_oz` (troy), `_usd`. No unit inside a number, no number inside a sentence.
- Dates ISO-8601 (`2026-09-11`); years are integers; the raw string is kept in `year_raw` for audit.
- Enums for anything the UI filters on (metal class, tender status, housing kind, lifecycle, condition grader). No free-text where a filter needs to work.
- **Display strings are never stored.** `fmt.py` builds them from fields, so one rule shows a year, money, weight etc. identically everywhere. Rules, with 54 test cases (`schema/v2/format_cases.json`), the JS client must match:

| Value | Rule | Example |
|---|---|---|
| Year | 4 digits; `ND`; `ca. 1970s`; `AH 1235 (1820)` | `1969` |
| Denomination | number + Title-Case unit; ½ ¼ ¾ glyphs; `$1`, `10¢` attach; manual override is reported | `1 Franc`, `½ Franc`, `10¢ Roosevelt` |
| Money | `$`, thousands separators, always 2 decimals, half-up rounding; compact `$12.3k` for tight spaces | `$5,584.11`, `$0.05` |
| Weight / size | g 2 decimals; mm 1-2 decimals; `~` for approximate; ranges with an en dash | `4.40 g`, `26.0 mm`, `5.0–5.5 g` |
| Troy oz | 4 decimals under 1 oz, 3 above | `0.0419 oz` |
| Mintage | thousands separators; compact `37.6M` | `37,598,000` |
| Fineness | leading-dot thousandths; percent variant | `.925`, `90%` |
| Missing | em dash | `—` |

## 6. Backend efficiency (measured on the real data, gzip = what GitHub Pages actually sends)

| Payload | v1 | v2 | Change |
|---|---|---|---|
| List/boot data for all 273 coins | 9.3 KB gz (91.4 KB raw) | **4.4 KB gz** (15.3 KB raw) | **53% smaller** (columnar, integer-coded) |
| Whole `index.json` today (boards, stats, flips...) | 24.0 KB gz | boot + small summaries | roughly 5x smaller boot |
| Every coin's full record | 74.0 KB gz | 66.3 KB gz (specimens 47.5 KB + shared types 19.1 KB) | only ~10% smaller |

**Honest reading:** the bytes are not the main win. Full records shrink only ~10% because the long free-text `notes` (avg 382 characters × 273) dominate. The wins are (1) a boot payload that is ~5x smaller so the first paint is faster, (2) records loaded one at a time when a coin is opened (a specimen record is about 1.2 KB raw) instead of whole-country shards, and above all (3) **correctness and queryability**: no conflicting copies, computed holes, typed fields you can sort, filter and chart.

Layout: `boot.json` (columnar list data) · `types/{ISO}.json` · `specimens/{ISO}.json` · `lots.json` · `albums.json` · `photos/` · `valuations.jsonl` · `changes.jsonl` (append-only) · `ref/issuers.json` · `manifest.json` (schema version, counts, content hash). Deterministic key order so git diffs are small and the content hash is stable.

## 7. What the migration proved (run on all 273 coins + 28 lots + 33 albums)
- Parsed cleanly: year 273/273, denomination 261/273, weight 247/273, KM# 258/273, tender 271/273.
- Everything that did not parse is **kept as raw text and listed** in `report.json` (12 denominations, 26 weights, 15 KM#, 2 tender, 25 type conflicts, 11 country-name variants, 26 inconsistent album volumes). None was guessed.
- Result validates with **0 schema errors and 0 broken cross-references**; the validator was proven by injecting 5 faults, all caught.

## 8. Before → after for one coin (C001)

**v1 (`detail/CH.json`, abridged; display strings and type facts mixed with the coin):**
```json
{
  "scan": "C001",
  "ser": "EU-CH-008",
  "country": "Switzerland",
  "year": "1969",
  "denom": "1 franc · CHF",
  "continent_line": "Europe · Country: Switzerland · ISO: CH",
  "year_line": "1969 · Mint: B · Bern (1969 also struck London under same B)",
  "denom_line": "1 franc · CHF",
  "face_line": "1.00 CHF (~$1.23) · Est: $1.25 · Conf: high",
  "refs": "KM#24a.1",
  "metal": "CuNi 75/25 · 4.40 g · 23.2 mm · reeded · circulated · white 2×2 staple flip",
  "specs": "thickness 1.55 mm · coin alignment",
  "mintage": "37,598,000 (17,688,000 Bern + 19,910,000 London; both B)",
  "tender": "still legal tender",
  "parked": "white 2×2 staple flip",
  "status": "Logged",
  "photo": "pending pro rescan · target EU-CH-008_1969_1Fr_{obv|rev}.jpg",
  "photo_dir": "photos/EU/CH",
  "photo_stem": "EU-CH-008_1969_1Fr",
  "has_photo": false,
  "phase2_done": false,
  "awaiting_phase2": true,
  "est": 1.25,
  "est_raw": "1.25",
  "conf": "high",
  "face": "1.00 CHF (~$1.23)",
  "mint": "B"
}
```

**v2 Specimen** (`specimens/CH.json`):
```json
{
  "acquisition": {
    "acquired_on": null,
    "family": null,
    "logged_at": "2026-09-11",
    "price_paid_usd": null,
    "source": null
  },
  "condition": {
    "cert": null,
    "cleaned": null,
    "grade": null,
    "grader": null,
    "text": "circulated",
    "toning": null
  },
  "housing": {
    "kind": "flip_2x2",
    "location": null,
    "text": "white 2×2 staple flip"
  },
  "id": "C001",
  "issue": {
    "mint_marks": [
      "B"
    ],
    "mint_text": "B · Bern (1969 also struck London under same B)",
    "mintage": 37598000,
    "mintage_text": "37,598,000 (17,688,000 Bern + 19,910,000 London; both B)",
    "qualifier": null,
    "year": 1969
  },
  "lifecycle": {
    "removed_on": null,
    "removed_reason": null,
    "status": "Logged"
  },
  "measured": {
    "diameter_mm": 23.2,
    "thickness_mm": null,
    "weight_g": null
  },
  "notes": "SER EU-CH-008. Helvetia-standing type reverse shown (wreath · 1 Fr. · 1969 · B). Not silver — CuNi from 1968 on. Huge mintage (~37.6M total B). Common circulating; near FX face. No melt premium. Swiss 1 Fr ladder siblings include C093 / EU-CH-010 (1970) and C094 / EU-CH-020 (1986). Switzerland flips now 24.",
  "photos": [],
  "ser": "EU-CH-008",
  "story": null,
  "tags": [],
  "type": "CH.KM.24a.1",
  "value": {
    "confidence": "high",
    "est_usd": 1.25,
    "face": {
      "amount": 1.0,
      "currency": "CHF"
    }
  },
  "year_raw": "1969"
}
```

**v2 Type** (`types/CH.json`, shared by every coin of this type):
```json
{
  "catalogs": [
    {
      "number": "24a.1",
      "system": "KM"
    }
  ],
  "class": "coin",
  "composition": {
    "fineness": null,
    "metal_class": "cupronickel",
    "text": "CuNi 75/25"
  },
  "country": "CH",
  "denomination": {
    "currency": "CHF",
    "unit": "franc",
    "value": 1.0
  },
  "id": "CH.KM.24a.1",
  "issues": [
    {
      "mint_marks": [
        "B"
      ],
      "mint_text": "B · Bern (1969 also struck London under same B)",
      "mintage": 37598000,
      "mintage_text": "37,598,000 (17,688,000 Bern + 19,910,000 London; both B)",
      "qualifier": null,
      "year": 1969
    }
  ],
  "legal_tender": {
    "status": "current",
    "text": "still legal tender"
  },
  "nominal": {
    "alignment": "coin",
    "diameter_approx": false,
    "diameter_mm": 23.2,
    "edge": "reeded",
    "thickness_mm": 1.55,
    "weight_approx": false,
    "weight_g": 4.4
  },
  "precious": {
    "asw_oz": null
  }
}
```

## 9. Decisions for the owner
1. **Adopt v2 as the target?** (Nothing changes in the app until you say so; migration is additive.)
2. **Album coins get IDs?** The 930 coins in binders are not itemized today. To answer "which years am I missing" reliably, each binder slot needs enumerating once (I can generate the slot grid from the series rule, and you confirm what is physically present). Itemized album coins would get `C###` keys from the same counter.
3. **Which Tier 2 fields do you want?** I'd add them all as nullable; unused ones cost nothing.
4. **Master file format:** today the source of truth is a 468 KB markdown ledger (`LEDGER.md`) parsed by a script on Grok's machine. v2 works best with structured JSON as the master, with the markdown generated for reading. That is a bigger change to Grok's pipeline and needs a plan before anyone edits.
5. **Curation queue** (a one-time human/AI review): the 25 type conflicts, the 12 unparsed denominations, and the 3 issuer name variants (Germany, Mexico, Vietnam).

## 10. Next steps (in order)
1. You answer the decisions above.
2. Wire a v2 adapter in the app behind a flag (v1 keeps working).
3. Itemize album slots; replace the hard-coded table in `app.js`.
4. Fill Tier 2 fields as you choose; AI enrichment writes through `ChangeEvent` with provenance.
