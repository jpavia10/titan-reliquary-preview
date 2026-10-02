# Field reference (generated: do not edit)

Every field path you can write in a change event, per entity, and **who may write it** (schema v3 phase tiers). Generated from `schema/v3/defs.schema.json` + `schema/v3/field_tiers.json` by `python3 tools/pipeline/field_reference.py`.

How to read it: `field` in your event is the **path** below. `N` is a list position starting at 0 (`issues.0.mintage`). `null` means "not known" and is always allowed where the type lists `null`. Types: `string`, `number` (decimal), `integer` (whole), `boolean` (`true`/`false`), `array` (JSON list), `object`. A path that names a whole object or list replaces all of it; prefer the leaf path (one event per fact). Units are in the field name: `_g` grams, `_mm` millimetres, `_oz` troy ounces, `_usd` US dollars. `id`, `ser` and `research` are written by the pipeline only. A story the owner wrote is never overwritten without `supersedes`.

A value of the wrong type, or a field your phase may not write, rejects your whole file with a line-numbered report (nothing is changed). Check yourself first: `python3 tools/pipeline/apply_changes.py --dry-run <file>`.

## Phase 1 at a glance (quick pass from a staging photo)

A Phase 1 file creates or matches the coin and records only these fields (plus `notes`). Everything else waits for Phase 2.

| entity | Phase 1 fields |
|---|---|
| `type` | `class`, `denomination`, `issues.N.year`, `issues.N.mint_marks`, `issues.N.mint_text`, `issues.N.qualifier` |
| `specimen` | `type`, `year_raw`, `quantity`, `story`, `notes`, `issue.year`, `issue.mint_marks`, `issue.mint_text`, `issue.qualifier`, `value.est_usd`, `value.confidence`, `value.face` |
| `lot` | `kind`, `country`, `year_raw`, `denom_text`, `qty`, `notes` |
| `issuer` | `id`, `name`, `iso`, `continent` |

Phase 1 never writes: ser (serial numbers are assigned by the pipeline and reassigned once after Phase 1); condition.* (no grade, strike, luster, toning, cleaned or damage judgement); type catalog numbers (catalogs, or a type id with a catalog number: a Phase 1 type id is always {ISO}.X.{denomination-slug}); price_paid_usd and melt (owner / pipeline); value.est_usd IS Phase 1 since schema v4: a default estimate with confidence low, refined in Phase 2; mintage, composition, weights and sizes, design descriptions (Phase 2, with a cited source).

Phase 2 (after the pro photos) fills every other **Phase 2** field below that the photos and cited sources support, and may refine the Phase 1 fields and the story. `owner only` fields are written only by the owner; `pipeline only` fields are never written by a contribution.

## entity `specimen`: one physical piece the owner holds (`C###` coin, `T###` token/medal/prop)

Required keys of a whole record: `acquisition`, `id`, `issue`, `lifecycle`, `type`.

| field path | who writes it | type | units | meaning |
|---|---|---|---|---|
| `id` | pipeline only | string matching `^[A-Z]\d{3,}$` |  |  |
| `ser` | pipeline only | string or null matching `^(AF\|AN\|AS\|EU\|NA\|OC\|SA)-[A-Z0-9]{2,3}-\d{3}$` |  |  |
| `type` | **Phase 1** | string |  |  |
| `issue.year` | **Phase 1** | integer or null |  |  |
| `issue.qualifier` | **Phase 1** | one of null, `circa`, `ND`, `unparsed` |  |  |
| `issue.decade` | Phase 2 | boolean |  |  |
| `issue.calendar` | Phase 2 | string |  | Non-Gregorian calendar the coin is dated in: AH, SE, BE, ROC ... |
| `issue.calendar_year` | Phase 2 | integer |  |  |
| `issue.mint_marks` | **Phase 1** | list of string |  |  |
| `issue.mint_text` | **Phase 1** | string or null |  | Mint name / location / where the mark sits. Free text until the mint table is curated. |
| `issue.mintage` | Phase 2 | integer or null |  |  |
| `issue.mintage_text` | Phase 2 | string or null |  |  |
| `issue.varieties` | Phase 2 | list of object |  |  |
| `issue.varieties.N.code` | Phase 2 | string |  |  |
| `issue.varieties.N.desc` | Phase 2 | string |  |  |
| `issue.varieties.N.key` | Phase 2 | boolean |  |  |
| `year_raw` | **Phase 1** | string |  | The year exactly as recorded, kept for audit. |
| `quantity` | **Phase 1** | integer, >= 1 |  |  |
| `condition.text` | Phase 2 | string or null |  | Plain-language state as recorded ('circulated', 'toned'). |
| `condition.grade` | Phase 2 | string or null |  | Sheldon or descriptive: 'MS-65', 'VF-30', 'AU'. |
| `condition.grader` | Phase 2 | one of null, `self`, `PCGS`, `NGC`, `ANACS`, `ICG`, `CACG`, `other` |  |  |
| `condition.cert` | Phase 2 | string or null |  | Third-party certification number. |
| `condition.strike` | Phase 2 | string or null |  |  |
| `condition.luster` | Phase 2 | string or null |  |  |
| `condition.toning` | Phase 2 | string or null |  |  |
| `condition.cleaned` | Phase 2 | boolean or null |  |  |
| `condition.damage` | Phase 2 | list of string |  |  |
| `measured.weight_g` | Phase 2 | number or null | grams |  |
| `measured.diameter_mm` | Phase 2 | number or null | millimetres |  |
| `measured.thickness_mm` | Phase 2 | number or null | millimetres |  |
| `measured.magnetic` | Phase 2 | boolean or null |  |  |
| `measured.die_axis_deg` | Phase 2 | number or null, >= 0 |  | PHASE 2. Measured die axis in degrees (0 = medal, 180 = coin alignment). |
| `housing.kind` | Phase 2 | one of null, `flip_2x2`, `slab`, `tube`, `album`, `capsule`, `box`, `pouch`, `loose`, `other` |  |  |
| `housing.text` | Phase 2 | string or null |  |  |
| `housing.location` | owner only | object or null |  |  |
| `housing.location.container` | owner only | string |  |  |
| `housing.location.page` | owner only | integer or null |  |  |
| `housing.location.slot` | owner only | string or null |  |  |
| `acquisition.logged_at` | owner only | string (YYYY, YYYY-MM or YYYY-MM-DD) |  |  |
| `acquisition.acquired_on` | owner only | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `acquisition.source` | owner only | string or null |  |  |
| `acquisition.price_paid_usd` | owner only | number or null | US dollars |  |
| `acquisition.family` | owner only | string or null |  | Who it came from or is associated with (family attribution). |
| `value.est_usd` | **Phase 1** | number or null, >= 0 | US dollars |  |
| `value.confidence` | **Phase 1** | one of `low`, `med`, `high` |  |  |
| `value.face.amount` | **Phase 1** | number or null |  |  |
| `value.face.currency` | **Phase 1** | string (ISO 4217 code, e.g. USD) or null |  |  |
| `lifecycle.status` | owner only | one of `Logged`, `Photographed`, `Verified`, `Removed` |  |  |
| `lifecycle.removed_on` | owner only | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `lifecycle.removed_reason` | owner only | one of null, `sold`, `traded`, `gifted`, `culled`, `lost` |  |  |
| `story` | **Phase 1** | string or null |  | A short narrative for this piece (what it is, where it comes from, why it is interesting). Allowed from Phase 1 (2-4 sentences, plain facts visible or well known; no invented history). The owner's own words always win: an owner-verified story is never overwritten without 'supersedes'. |
| `ledger_text` | pipeline only | object or null |  | Ledger v254 wording kept verbatim where the website's display string cannot be derived from the structured facts (FX/demonetised note on the face value, catalogue and spec tails, label and denomination flourishes, frozen photo-name stem). The app build shows a value here instead of the derived string. Formatting only: never a source of facts; clear a key when the structured fact it shadows is corrected. |
| `ledger_text.label` | pipeline only | string |  |  |
| `ledger_text.face` | pipeline only | string |  |  |
| `ledger_text.face_line` | pipeline only | string |  |  |
| `ledger_text.metal` | pipeline only | string |  |  |
| `ledger_text.refs` | pipeline only | string |  |  |
| `ledger_text.specs` | pipeline only | string |  |  |
| `ledger_text.specs_tail` | pipeline only | string |  | ledger remark appended after the derived thickness/alignment text |
| `ledger_text.denom` | pipeline only | string |  |  |
| `ledger_text.cat` | pipeline only | string |  |  |
| `ledger_text.photo_stem` | pipeline only | string |  |  |
| `ledger_text.mint` | pipeline only | string |  |  |
| `tags` | Phase 2 | list of string |  |  |
| `notes` | **Phase 1** | string |  |  |
| `photos` | pipeline only | list of string |  | Photo ids (see Photo). |
| `serial_number` | Phase 2 | string or null |  | Printed serial of a note or prop note. null for coins. |
| `seller_type` | owner only | string or null |  | TIER 2. dealer, auction, private, gift, inheritance, found... |
| `invoice_ref` | owner only | string or null |  | TIER 2. |
| `provenance_chain` | Phase 2 | list of object or null |  | TIER 2. Ordered previous holders. |
| `provenance_chain.N.holder` | Phase 2 | string |  |  |
| `provenance_chain.N.from` | Phase 2 | string or null |  |  |
| `provenance_chain.N.to` | Phase 2 | string or null |  |  |
| `provenance_chain.N.note` | Phase 2 | string or null |  |  |
| `insurance` | owner only | object or null |  | TIER 2. |
| `insurance.covered` | owner only | boolean or null |  |  |
| `insurance.appraised_value_usd` | owner only | number or null | US dollars |  |
| `insurance.appraised_on` | owner only | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `insurance.appraiser` | owner only | string or null |  |  |
| `storage_env` | owner only | object or null |  | TIER 2. |
| `storage_env.humidity_pct` | owner only | number or null |  |  |
| `storage_env.desiccant` | owner only | boolean or null |  |  |
| `storage_env.last_inspected` | owner only | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `featured` | owner only | boolean or null |  | TIER 2. Show first in the museum. |
| `sort_weight` | owner only | number or null |  | TIER 2. Manual ordering weight for the museum. |
| `sentimental` | owner only | integer or null, >= 1 |  | TIER 2. Owner's sentimental rating 1-5. |
| `want_priority` | owner only | integer or null, >= 1 |  | TIER 2. For wanted-list use. |
| `disposal_plan` | owner only | string or null |  | TIER 2. keep, sell, gift, trade... (owner policy today: HOLD / do not sell). |
| `authenticity` | Phase 2 | object or null |  | TIER 2. |
| `authenticity.method` | Phase 2 | string or null |  |  |
| `authenticity.verified_on` | Phase 2 | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `related_specimens` | Phase 2 | list of string or null |  | TIER 2. Sibling specimen ids. |
| `tax_lot` | owner only | string or null |  | TIER 2. |
| `variety` | Phase 2 | string or null |  | PHASE 2. Attributed die variety / sub-type of THIS specimen (e.g. 'Doubled die obverse FS-101'), with a cited source. null = not attributed. |
| `research` | pipeline only | object or null |  | SYSTEM. Research progress, maintained by the pipeline from the change events (never written by a contributor). |
| `research.phase` | pipeline only | one of `0`, `1`, `2` |  | Highest research phase applied: 0 = ledger import only, 1 = Phase 1 quick pass, 2 = Phase 2 critical analysis. |
| `research.phase1_at` | pipeline only | string or null |  |  |
| `research.phase1_by` | pipeline only | string or null |  |  |
| `research.phase2_at` | pipeline only | string or null |  |  |
| `research.phase2_by` | pipeline only | string or null |  |  |
| `research.open_questions` | Phase 2 | list of string |  | PHASE 2 may append questions it could not settle (for the owner or a later pass). |

## entity `type`: what a coin IS; shared by all its specimens (`CH.KM.24a.1`, `CA.X.1-cent`)

Required keys of a whole record: `class`, `composition`, `country`, `denomination`, `id`, `issues`.

| field path | who writes it | type | units | meaning |
|---|---|---|---|---|
| `id` | pipeline only | string matching `^[A-Z]{2}(-[A-Z0-9]+)?\.[A-Za-z]+\.[\w.\-]+$` |  | {ISSUER}.{catalog system}.{number}, e.g. CH.KM.24a.1; fallback ISO.X.denomination-slug |
| `country` | pipeline only | string matching `^[A-Z]{2}$` |  |  |
| `issuer` | pipeline only | string or null |  | Issuer id when it is not simply the country (see ref/issuers). |
| `class` | **Phase 1** | one of `coin`, `token`, `medal`, `prop`, `note`, `stamp`, `other` |  |  |
| `denomination.value` | **Phase 1** | number or null |  | Decimal face amount, 0.5 for a half. null when the coin has no numeric value (a named token). |
| `denomination.unit` | **Phase 1** | string |  | Unit word as struck/commonly named: 'franc', 'euro cent', 'øre', '¢'. |
| `denomination.currency` | **Phase 1** | string (ISO 4217 code, e.g. USD) or null |  |  |
| `denomination.named` | **Phase 1** | string or null |  | Popular name when it differs: 'Roosevelt', 'threepence', 'Balanza'. |
| `denomination.display` | **Phase 1** | string or null |  | Manual override when the auto-formatter cannot express it. Use sparingly; every use is reported. |
| `catalogs` | Phase 2 | list of object |  |  |
| `catalogs.N.system` | Phase 2 | string |  | KM (Krause), Y (Yeoman), Schön, JNDA, Sp (Spink), N (Numista), PCGS, CoinFacts ... |
| `catalogs.N.number` | Phase 2 | string |  |  |
| `catalogs.N.edition` | Phase 2 | string or null |  |  |
| `catalogs.N.url` | Phase 2 | string or null |  |  |
| `composition.text` | Phase 2 | string |  |  |
| `composition.metal_class` | Phase 2 | one of `gold`, `silver`, `platinum`, `palladium`, `copper`, `bronze`, `brass`, `nickel`, `cupronickel`, `aluminum`, `steel`, `plated steel`, `zinc`, `iron`, `clad`, `bimetallic`, `other` |  |  |
| `composition.fineness` | Phase 2 | number or null, >= 0 |  |  |
| `nominal.weight_g` | Phase 2 | number or null | grams |  |
| `nominal.weight_approx` | Phase 2 | boolean |  |  |
| `nominal.weight_min_g` | Phase 2 | number or null | grams | Lower bound when the catalogue/ledger gives a range (then weight_g is null). |
| `nominal.weight_max_g` | Phase 2 | number or null | grams |  |
| `nominal.diameter_mm` | Phase 2 | number or null | millimetres |  |
| `nominal.diameter_approx` | Phase 2 | boolean |  |  |
| `nominal.diameter_min_mm` | Phase 2 | number or null | millimetres |  |
| `nominal.diameter_max_mm` | Phase 2 | number or null | millimetres |  |
| `nominal.thickness_mm` | Phase 2 | number or null | millimetres |  |
| `nominal.edge` | Phase 2 | string or null |  |  |
| `nominal.shape` | Phase 2 | string or null |  |  |
| `nominal.alignment` | Phase 2 | one of null, `coin`, `medal` |  |  |
| `precious.asw_oz` | Phase 2 | number or null | troy ounces |  |
| `precious.agw_oz` | Phase 2 | number or null | troy ounces |  |
| `design.text` | Phase 2 | string |  |  |
| `design.obverse` | Phase 2 | string or null |  |  |
| `design.reverse` | Phase 2 | string or null |  |  |
| `design.designers` | Phase 2 | list of string |  |  |
| `design.legend` | Phase 2 | string or null |  |  |
| `legal_tender.status` | Phase 2 | one of `current`, `demonetized`, `withdrawn`, `superseded`, `none`, `unknown` |  |  |
| `legal_tender.until` | Phase 2 | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `legal_tender.text` | Phase 2 | string |  |  |
| `issues` | Phase 2 | list of object |  |  |
| `issues.N.year` | **Phase 1** | integer or null |  |  |
| `issues.N.qualifier` | **Phase 1** | one of null, `circa`, `ND`, `unparsed` |  |  |
| `issues.N.decade` | Phase 2 | boolean |  |  |
| `issues.N.calendar` | Phase 2 | string |  | Non-Gregorian calendar the coin is dated in: AH, SE, BE, ROC ... |
| `issues.N.calendar_year` | Phase 2 | integer |  |  |
| `issues.N.mint_marks` | **Phase 1** | list of string |  |  |
| `issues.N.mint_text` | **Phase 1** | string or null |  | Mint name / location / where the mark sits. Free text until the mint table is curated. |
| `issues.N.mintage` | Phase 2 | integer or null |  |  |
| `issues.N.mintage_text` | Phase 2 | string or null |  |  |
| `issues.N.varieties` | Phase 2 | list of object |  |  |
| `issues.N.varieties.N.code` | Phase 2 | string |  |  |
| `issues.N.varieties.N.desc` | Phase 2 | string |  |  |
| `issues.N.varieties.N.key` | Phase 2 | boolean |  |  |
| `tags` | Phase 2 | list of string |  |  |
| `series` | Phase 2 | list of string or null |  | TIER 2. Series memberships (e.g. 'Statehood quarters'). |
| `population` | Phase 2 | object or null |  | TIER 2. Third-party grading population counts. |
| `population.pcgs` | Phase 2 | integer or null |  |  |
| `population.ngc` | Phase 2 | integer or null |  |  |
| `population.as_of` | Phase 2 | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `price_guide` | Phase 2 | object or null |  | TIER 2. A dated price-guide figure with its source. |
| `price_guide.source` | Phase 2 | string |  |  |
| `price_guide.value_usd` | Phase 2 | number or null | US dollars |  |
| `price_guide.grade` | Phase 2 | string or null |  |  |
| `price_guide.date` | Phase 2 | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `die_variety` | Phase 2 | object or null |  | TIER 2. |
| `die_variety.system` | Phase 2 | string |  | VAM, Cherrypicker, FS, WEX... |
| `die_variety.code` | Phase 2 | string |  |  |
| `die_variety.desc` | Phase 2 | string or null |  |  |
| `error_type` | Phase 2 | string or null |  | TIER 2. Mint error class (off-center, doubled die...). |
| `rarity_scale` | Phase 2 | object or null |  | TIER 2. |
| `rarity_scale.system` | Phase 2 | string |  | Sheldon, Universal (R-1..R-8), Numista... |
| `rarity_scale.value` | Phase 2 | string |  |  |
| `related_types` | Phase 2 | list of string or null |  | TIER 2. Type ids of related types. |
| `image_ref` | Phase 2 | string or null |  | TIER 2. A reference image (not one of the owner's photos). |
| `period` | Phase 2 | string or null |  | PHASE 2. Historical period / regime, e.g. 'Weimar Republic', 'Showa era'. |
| `ruler` | Phase 2 | string or null |  | PHASE 2. Ruler or authority named on or responsible for the coin, e.g. 'Elizabeth II'. |
| `commemorates` | Phase 2 | string or null |  | PHASE 2. What a commemorative issue commemorates; null for circulation types. |

## entity `lot`: bullion `B###`, set `S###`, housing `H###`, stamps `P###`

Required keys of a whole record: `id`, `kind`.

| field path | who writes it | type | units | meaning |
|---|---|---|---|---|
| `id` | pipeline only | string matching `^[A-Z]\d{3,}$` |  |  |
| `kind` | **Phase 1** | one of `bullion`, `set`, `housing`, `stamp` |  |  |
| `country` | **Phase 1** | string or null |  |  |
| `year_raw` | **Phase 1** | string or null |  |  |
| `denom_text` | **Phase 1** | string or null |  |  |
| `composition_text` | Phase 2 | string or null |  |  |
| `qty` | **Phase 1** | integer or null |  |  |
| `asw_oz` | Phase 2 | number or null | troy ounces |  |
| `agw_oz` | Phase 2 | number or null | troy ounces |  |
| `est_usd` | Phase 2 | number or null | US dollars |  |
| `melt_usd` | pipeline only | number or null | US dollars |  |
| `confidence` | Phase 2 | one of `low`, `med`, `high` or null |  |  |
| `storage_text` | owner only | string or null |  |  |
| `notes` | **Phase 1** | string |  |  |
| `logged_at` | pipeline only | string or null |  |  |

## entity `album`: a binder volume `A###` and its slot grid (Phase 1.5)

Required keys of a whole record: `evidence`, `family`, `grid_source`, `id`, `needs_scan`, `slots`, `slots_total`, `title`.

| field path | who writes it | type | units | meaning |
|---|---|---|---|---|
| `id` | pipeline only | string matching `^A\d{3}$` |  |  |
| `family` | pipeline only | string |  |  |
| `binder` | pipeline only | string or null |  |  |
| `title` | pipeline only | string |  |  |
| `whitman` | pipeline only | string or null |  | Whitman folder / product number when known ('9034', '2875'). |
| `denomination_text` | pipeline only | string or null |  |  |
| `metal_text` | pipeline only | string or null |  |  |
| `year_start` | pipeline only | integer or null |  |  |
| `year_end` | pipeline only | integer or null |  |  |
| `slots_total` | Phase 1.5 (raise only, photo) | integer or null |  |  |
| `slots_total_approx` | pipeline only | boolean |  | true when the ledger gives only an approximate slot count. |
| `slots_filled_claimed` | Phase 1.5 (raise only, photo) | integer or null |  | Filled count stated by the ledger (owner-verified). |
| `evidence` | pipeline only | one of `enumerated`, `partial`, `count-only` |  | How much of the per-slot picture the ledger contains. |
| `grid_source` | pipeline only | one of `ledger`, `whitman-model`, `ledger+whitman-model`, `photo`, `none` |  | Where the slot names come from. |
| `asw_oz_per_slot` | pipeline only | number or null |  | Troy oz of pure silver per filled slot when every coin in the volume is the same bullion piece (American Silver Eagles = 1.0); null otherwise. |
| `needs_scan` | pipeline only | boolean |  | true = finalize with the owner's fresh album scans at Phase 1.5. |
| `note` | Phase 2 | string or null |  |  |
| `slots` | Phase 1.5 | list of object |  |  |
| `slots.N.slot` | Phase 1.5 | string |  | Stable slot id within the volume: 's001', 's002'... in page order. Never reused. |
| `slots.N.label` | Phase 1.5 | string or null |  | Slot name as printed / as the ledger writes it: '1988', '1947-D', '2010 Yosemite-P'. |
| `slots.N.year` | Phase 1.5 | integer or null |  |  |
| `slots.N.mint` | Phase 1.5 | string or null |  |  |
| `slots.N.variety` | Phase 1.5 | string or null |  |  |
| `slots.N.key` | Phase 1.5 | boolean |  | Key/semi-key date. |
| `slots.N.state` | Phase 1.5 | one of `filled`, `empty`, `unknown`, `wanted`, `not_applicable` |  | unknown = slot exists but the ledger does not say whether it is filled. |
| `slots.N.occupant_status` | Phase 1.5 | one of `ledger`, `photo`, `inferred`, `unknown` |  | ledger = ALBUMS.md enumerates this slot's state; photo = read slot by slot from a photo of the page (provenance names the photo file; schema v4); inferred = from the Whitman layout / slot arithmetic only; unknown = not known. |
| `slots.N.provenance` | Phase 1.5 | string or null |  | Required when occupant_status is 'inferred' (e.g. 'inferred: Whitman 9034 layout'). |
| `slots.N.occupant` | Phase 2 | string or null |  | Specimen id once album coins are itemized (none yet). |

## entity `photo`: one photo record (create only: `op: create`)

Required keys of a whole record: `id`, `kind`, `path`, `side`, `specimen`.

| field path | who writes it | type | units | meaning |
|---|---|---|---|---|
| `id` | pipeline only | string |  |  |
| `specimen` | pipeline only | string |  |  |
| `side` | pipeline only | one of `obv`, `rev`, `edge`, `label` |  |  |
| `phase` | pipeline only | one of `1`, `2` |  |  |
| `kind` | pipeline only | one of `raw`, `master`, `crop_2x2`, `crop_circle`, `thumb` |  |  |
| `path` | pipeline only | string |  |  |
| `sha256` | pipeline only | string or null |  |  |
| `width` | pipeline only | integer or null |  |  |
| `height` | pipeline only | integer or null |  |  |
| `captured_at` | pipeline only | string (date-time) or null |  |  |
| `review.status` | pipeline only | one of `pending`, `approved`, `rejected`, `reshoot` |  |  |
| `review.reason` | pipeline only | string or null |  |  |
| `superseded_by` | pipeline only | string or null |  |  |

## entity `issuer`: who issued (country or historical issuer; create only)

Required keys of a whole record: `continent`, `id`, `iso`, `name`.

| field path | who writes it | type | units | meaning |
|---|---|---|---|---|
| `id` | **Phase 1** | string |  |  |
| `name` | **Phase 1** | string |  |  |
| `iso` | **Phase 1** | string matching `^[A-Z]{2}$` |  |  |
| `continent` | **Phase 1** | one of `Africa`, `Antarctica`, `Asia`, `Europe`, `North America`, `Oceania`, `South America` |  |  |
| `from` | Phase 2 | integer or null |  |  |
| `to` | Phase 2 | integer or null |  |  |
| `successor` | Phase 2 | string or null |  |  |
| `note` | Phase 2 | string or null |  |  |
