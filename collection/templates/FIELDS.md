# Field reference (generated: do not edit)

Every field path you can write in a change event, per entity. Generated from `schema/v2/defs.schema.json` by `python3 tools/pipeline/field_reference.py`.

How to read it: `field` in your event is the **path** below. `N` is a list position starting at 0 (`issues.0.mintage`). `null` means "not known" and is always allowed where the type lists `null`. Types: `string`, `number` (decimal), `integer` (whole), `boolean` (`true`/`false`), `array` (JSON list), `object`. A path that names a whole object or list replaces all of it; prefer the leaf path (one event per fact). Units are in the field name: `_g` grams, `_mm` millimetres, `_oz` troy ounces, `_usd` US dollars. `id` and `ser` can never be written by a contribution; `story` is only the owner's.

A value of the wrong type rejects your whole file with a line-numbered report (nothing is changed). Check yourself first: `python3 tools/pipeline/apply_changes.py --dry-run <file>`.

## entity `specimen`: one physical piece the owner holds (`C###` coin, `T###` token/medal/prop)

Required keys of a whole record: `acquisition`, `id`, `issue`, `lifecycle`, `type`.

| field path | type | units | meaning |
|---|---|---|---|
| `id` | string matching `^[A-Z]\d{3,}$` |  |  |
| `ser` | string or null matching `^(AF\|AN\|AS\|EU\|NA\|OC\|SA)-[A-Z0-9]{2,3}-\d{3}$` |  |  |
| `type` | string |  |  |
| `issue.year` | integer or null |  |  |
| `issue.qualifier` | one of null, `circa`, `ND`, `unparsed` |  |  |
| `issue.decade` | boolean |  |  |
| `issue.calendar` | string |  | Non-Gregorian calendar the coin is dated in: AH, SE, BE, ROC ... |
| `issue.calendar_year` | integer |  |  |
| `issue.mint_marks` | list of string |  |  |
| `issue.mint_text` | string or null |  | Mint name / location / where the mark sits. Free text until the mint table is curated. |
| `issue.mintage` | integer or null |  |  |
| `issue.mintage_text` | string or null |  |  |
| `issue.varieties` | list of object |  |  |
| `issue.varieties.N.code` | string |  |  |
| `issue.varieties.N.desc` | string |  |  |
| `issue.varieties.N.key` | boolean |  |  |
| `year_raw` | string |  | The year exactly as recorded, kept for audit. |
| `quantity` | integer, >= 1 |  |  |
| `condition.text` | string or null |  | Plain-language state as recorded ('circulated', 'toned'). |
| `condition.grade` | string or null |  | Sheldon or descriptive: 'MS-65', 'VF-30', 'AU'. |
| `condition.grader` | one of null, `self`, `PCGS`, `NGC`, `ANACS`, `ICG`, `CACG`, `other` |  |  |
| `condition.cert` | string or null |  | Third-party certification number. |
| `condition.strike` | string or null |  |  |
| `condition.luster` | string or null |  |  |
| `condition.toning` | string or null |  |  |
| `condition.cleaned` | boolean or null |  |  |
| `condition.damage` | list of string |  |  |
| `measured.weight_g` | number or null | grams |  |
| `measured.diameter_mm` | number or null | millimetres |  |
| `measured.thickness_mm` | number or null | millimetres |  |
| `measured.magnetic` | boolean or null |  |  |
| `housing.kind` | one of null, `flip_2x2`, `slab`, `tube`, `album`, `capsule`, `box`, `pouch`, `loose`, `other` |  |  |
| `housing.text` | string or null |  |  |
| `housing.location` | object or null |  |  |
| `housing.location.container` | string |  |  |
| `housing.location.page` | integer or null |  |  |
| `housing.location.slot` | string or null |  |  |
| `acquisition.logged_at` | string (YYYY, YYYY-MM or YYYY-MM-DD) |  |  |
| `acquisition.acquired_on` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `acquisition.source` | string or null |  |  |
| `acquisition.price_paid_usd` | number or null | US dollars |  |
| `acquisition.family` | string or null |  | Who it came from or is associated with (family attribution). |
| `value.est_usd` | number or null, >= 0 | US dollars |  |
| `value.confidence` | one of `low`, `med`, `high` |  |  |
| `value.face.amount` | number or null |  |  |
| `value.face.currency` | string (ISO 4217 code, e.g. USD) or null |  |  |
| `lifecycle.status` | one of `Logged`, `Photographed`, `Verified`, `Removed` |  |  |
| `lifecycle.removed_on` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `lifecycle.removed_reason` | one of null, `sold`, `traded`, `gifted`, `culled`, `lost` |  |  |
| `story` | string or null |  | The owner's narrative for this piece. Never AI-written. |
| `ledger_text` | object or null |  | Ledger v254 wording kept verbatim where the website's display string cannot be derived from the structured facts (FX/demonetised note on the face value, catalogue and spec tails, label and denomination flourishes, frozen photo-name stem). The app build shows a value here instead of the derived string. Formatting only: never a source of facts; clear a key when the structured fact it shadows is corrected. |
| `ledger_text.label` | string |  |  |
| `ledger_text.face` | string |  |  |
| `ledger_text.face_line` | string |  |  |
| `ledger_text.metal` | string |  |  |
| `ledger_text.refs` | string |  |  |
| `ledger_text.specs` | string |  |  |
| `ledger_text.specs_tail` | string |  | ledger remark appended after the derived thickness/alignment text |
| `ledger_text.denom` | string |  |  |
| `ledger_text.cat` | string |  |  |
| `ledger_text.photo_stem` | string |  |  |
| `ledger_text.mint` | string |  |  |
| `tags` | list of string |  |  |
| `notes` | string |  |  |
| `photos` | list of string |  | Photo ids (see Photo). |
| `serial_number` | string or null |  | Printed serial of a note or prop note. null for coins. |
| `seller_type` | string or null |  | TIER 2. dealer, auction, private, gift, inheritance, found... |
| `invoice_ref` | string or null |  | TIER 2. |
| `provenance_chain` | list of object or null |  | TIER 2. Ordered previous holders. |
| `provenance_chain.N.holder` | string |  |  |
| `provenance_chain.N.from` | string or null |  |  |
| `provenance_chain.N.to` | string or null |  |  |
| `provenance_chain.N.note` | string or null |  |  |
| `insurance` | object or null |  | TIER 2. |
| `insurance.covered` | boolean or null |  |  |
| `insurance.appraised_value_usd` | number or null | US dollars |  |
| `insurance.appraised_on` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `insurance.appraiser` | string or null |  |  |
| `storage_env` | object or null |  | TIER 2. |
| `storage_env.humidity_pct` | number or null |  |  |
| `storage_env.desiccant` | boolean or null |  |  |
| `storage_env.last_inspected` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `featured` | boolean or null |  | TIER 2. Show first in the museum. |
| `sort_weight` | number or null |  | TIER 2. Manual ordering weight for the museum. |
| `sentimental` | integer or null, >= 1 |  | TIER 2. Owner's sentimental rating 1-5. |
| `want_priority` | integer or null, >= 1 |  | TIER 2. For wanted-list use. |
| `disposal_plan` | string or null |  | TIER 2. keep, sell, gift, trade... (owner policy today: HOLD / do not sell). |
| `authenticity` | object or null |  | TIER 2. |
| `authenticity.method` | string or null |  |  |
| `authenticity.verified_on` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `related_specimens` | list of string or null |  | TIER 2. Sibling specimen ids. |
| `tax_lot` | string or null |  | TIER 2. |

## entity `type`: what a coin IS; shared by all its specimens (`CH.KM.24a.1`, `CA.X.1-cent`)

Required keys of a whole record: `class`, `composition`, `country`, `denomination`, `id`, `issues`.

| field path | type | units | meaning |
|---|---|---|---|
| `id` | string matching `^[A-Z]{2}(-[A-Z0-9]+)?\.[A-Za-z]+\.[\w.\-]+$` |  | {ISSUER}.{catalog system}.{number}, e.g. CH.KM.24a.1; fallback ISO.X.denomination-slug |
| `country` | string matching `^[A-Z]{2}$` |  |  |
| `issuer` | string or null |  | Issuer id when it is not simply the country (see ref/issuers). |
| `class` | one of `coin`, `token`, `medal`, `prop`, `note`, `stamp`, `other` |  |  |
| `denomination.value` | number or null |  | Decimal face amount, 0.5 for a half. null when the coin has no numeric value (a named token). |
| `denomination.unit` | string |  | Unit word as struck/commonly named: 'franc', 'euro cent', 'øre', '¢'. |
| `denomination.currency` | string (ISO 4217 code, e.g. USD) or null |  |  |
| `denomination.named` | string or null |  | Popular name when it differs: 'Roosevelt', 'threepence', 'Balanza'. |
| `denomination.display` | string or null |  | Manual override when the auto-formatter cannot express it. Use sparingly; every use is reported. |
| `catalogs` | list of object |  |  |
| `catalogs.N.system` | string |  | KM (Krause), Y (Yeoman), Schön, JNDA, Sp (Spink), N (Numista), PCGS, CoinFacts ... |
| `catalogs.N.number` | string |  |  |
| `catalogs.N.edition` | string or null |  |  |
| `catalogs.N.url` | string or null |  |  |
| `composition.text` | string |  |  |
| `composition.metal_class` | one of `gold`, `silver`, `platinum`, `palladium`, `copper`, `bronze`, `brass`, `nickel`, `cupronickel`, `aluminum`, `steel`, `plated steel`, `zinc`, `iron`, `clad`, `bimetallic`, `other` |  |  |
| `composition.fineness` | number or null, >= 0 |  |  |
| `nominal.weight_g` | number or null | grams |  |
| `nominal.weight_approx` | boolean |  |  |
| `nominal.weight_min_g` | number or null | grams | Lower bound when the catalogue/ledger gives a range (then weight_g is null). |
| `nominal.weight_max_g` | number or null | grams |  |
| `nominal.diameter_mm` | number or null | millimetres |  |
| `nominal.diameter_approx` | boolean |  |  |
| `nominal.diameter_min_mm` | number or null | millimetres |  |
| `nominal.diameter_max_mm` | number or null | millimetres |  |
| `nominal.thickness_mm` | number or null | millimetres |  |
| `nominal.edge` | string or null |  |  |
| `nominal.shape` | string or null |  |  |
| `nominal.alignment` | one of null, `coin`, `medal` |  |  |
| `precious.asw_oz` | number or null | troy ounces |  |
| `precious.agw_oz` | number or null | troy ounces |  |
| `design.text` | string |  |  |
| `design.obverse` | string or null |  |  |
| `design.reverse` | string or null |  |  |
| `design.designers` | list of string |  |  |
| `design.legend` | string or null |  |  |
| `legal_tender.status` | one of `current`, `demonetized`, `withdrawn`, `superseded`, `none`, `unknown` |  |  |
| `legal_tender.until` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `legal_tender.text` | string |  |  |
| `issues` | list of object |  |  |
| `issues.N.year` | integer or null |  |  |
| `issues.N.qualifier` | one of null, `circa`, `ND`, `unparsed` |  |  |
| `issues.N.decade` | boolean |  |  |
| `issues.N.calendar` | string |  | Non-Gregorian calendar the coin is dated in: AH, SE, BE, ROC ... |
| `issues.N.calendar_year` | integer |  |  |
| `issues.N.mint_marks` | list of string |  |  |
| `issues.N.mint_text` | string or null |  | Mint name / location / where the mark sits. Free text until the mint table is curated. |
| `issues.N.mintage` | integer or null |  |  |
| `issues.N.mintage_text` | string or null |  |  |
| `issues.N.varieties` | list of object |  |  |
| `issues.N.varieties.N.code` | string |  |  |
| `issues.N.varieties.N.desc` | string |  |  |
| `issues.N.varieties.N.key` | boolean |  |  |
| `tags` | list of string |  |  |
| `series` | list of string or null |  | TIER 2. Series memberships (e.g. 'Statehood quarters'). |
| `population` | object or null |  | TIER 2. Third-party grading population counts. |
| `population.pcgs` | integer or null |  |  |
| `population.ngc` | integer or null |  |  |
| `population.as_of` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `price_guide` | object or null |  | TIER 2. A dated price-guide figure with its source. |
| `price_guide.source` | string |  |  |
| `price_guide.value_usd` | number or null | US dollars |  |
| `price_guide.grade` | string or null |  |  |
| `price_guide.date` | string (YYYY, YYYY-MM or YYYY-MM-DD) or null |  |  |
| `die_variety` | object or null |  | TIER 2. |
| `die_variety.system` | string |  | VAM, Cherrypicker, FS, WEX... |
| `die_variety.code` | string |  |  |
| `die_variety.desc` | string or null |  |  |
| `error_type` | string or null |  | TIER 2. Mint error class (off-center, doubled die...). |
| `rarity_scale` | object or null |  | TIER 2. |
| `rarity_scale.system` | string |  | Sheldon, Universal (R-1..R-8), Numista... |
| `rarity_scale.value` | string |  |  |
| `related_types` | list of string or null |  | TIER 2. Type ids of related types. |
| `image_ref` | string or null |  | TIER 2. A reference image (not one of the owner's photos). |

## entity `lot`: bullion `B###`, set `S###`, housing `H###`, stamps `P###`

Required keys of a whole record: `id`, `kind`.

| field path | type | units | meaning |
|---|---|---|---|
| `id` | string matching `^[A-Z]\d{3,}$` |  |  |
| `kind` | one of `bullion`, `set`, `housing`, `stamp` |  |  |
| `country` | string or null |  |  |
| `year_raw` | string or null |  |  |
| `denom_text` | string or null |  |  |
| `composition_text` | string or null |  |  |
| `qty` | integer or null |  |  |
| `asw_oz` | number or null | troy ounces |  |
| `agw_oz` | number or null | troy ounces |  |
| `est_usd` | number or null | US dollars |  |
| `melt_usd` | number or null | US dollars |  |
| `confidence` | one of `low`, `med`, `high` or null |  |  |
| `storage_text` | string or null |  |  |
| `notes` | string |  |  |
| `logged_at` | string or null |  |  |

## entity `album`: a binder volume `A###` and its slot grid (Phase 1.5)

Required keys of a whole record: `evidence`, `family`, `grid_source`, `id`, `needs_scan`, `slots`, `slots_total`, `title`.

| field path | type | units | meaning |
|---|---|---|---|
| `id` | string matching `^A\d{3}$` |  |  |
| `family` | string |  |  |
| `binder` | string or null |  |  |
| `title` | string |  |  |
| `whitman` | string or null |  | Whitman folder / product number when known ('9034', '2875'). |
| `denomination_text` | string or null |  |  |
| `metal_text` | string or null |  |  |
| `year_start` | integer or null |  |  |
| `year_end` | integer or null |  |  |
| `slots_total` | integer or null |  |  |
| `slots_total_approx` | boolean |  | true when the ledger gives only an approximate slot count. |
| `slots_filled_claimed` | integer or null |  | Filled count stated by the ledger (owner-verified). |
| `evidence` | one of `enumerated`, `partial`, `count-only` |  | How much of the per-slot picture the ledger contains. |
| `grid_source` | one of `ledger`, `whitman-model`, `ledger+whitman-model`, `none` |  | Where the slot names come from. |
| `asw_oz_per_slot` | number or null |  | Troy oz of pure silver per filled slot when every coin in the volume is the same bullion piece (American Silver Eagles = 1.0); null otherwise. |
| `needs_scan` | boolean |  | true = finalize with the owner's fresh album scans at Phase 1.5. |
| `note` | string or null |  |  |
| `slots` | list of object |  |  |
| `slots.N.slot` | string |  | Stable slot id within the volume: 's001', 's002'... in page order. Never reused. |
| `slots.N.label` | string or null |  | Slot name as printed / as the ledger writes it: '1988', '1947-D', '2010 Yosemite-P'. |
| `slots.N.year` | integer or null |  |  |
| `slots.N.mint` | string or null |  |  |
| `slots.N.variety` | string or null |  |  |
| `slots.N.key` | boolean |  | Key/semi-key date. |
| `slots.N.state` | one of `filled`, `empty`, `unknown`, `wanted`, `not_applicable` |  | unknown = slot exists but the ledger does not say whether it is filled. |
| `slots.N.occupant_status` | one of `ledger`, `inferred`, `unknown` |  | ledger = ALBUMS.md enumerates this slot's state; inferred = from the Whitman layout / slot arithmetic only; unknown = not known. |
| `slots.N.provenance` | string or null |  | Required when occupant_status is 'inferred' (e.g. 'inferred: Whitman 9034 layout'). |
| `slots.N.occupant` | string or null |  | Specimen id once album coins are itemized (none yet). |

## entity `photo`: one photo record (create only: `op: create`)

Required keys of a whole record: `id`, `kind`, `path`, `side`, `specimen`.

| field path | type | units | meaning |
|---|---|---|---|
| `id` | string |  |  |
| `specimen` | string |  |  |
| `side` | one of `obv`, `rev`, `edge`, `label` |  |  |
| `phase` | one of `1`, `2` |  |  |
| `kind` | one of `raw`, `master`, `crop_2x2`, `crop_circle`, `thumb` |  |  |
| `path` | string |  |  |
| `sha256` | string or null |  |  |
| `width` | integer or null |  |  |
| `height` | integer or null |  |  |
| `captured_at` | string (date-time) or null |  |  |
| `review.status` | one of `pending`, `approved`, `rejected`, `reshoot` |  |  |
| `review.reason` | string or null |  |  |
| `superseded_by` | string or null |  |  |

## entity `issuer`: who issued (country or historical issuer; create only)

Required keys of a whole record: `continent`, `id`, `iso`, `name`.

| field path | type | units | meaning |
|---|---|---|---|
| `id` | string |  |  |
| `name` | string |  |  |
| `iso` | string matching `^[A-Z]{2}$` |  |  |
| `continent` | one of `Africa`, `Antarctica`, `Asia`, `Europe`, `North America`, `Oceania`, `South America` |  |  |
| `from` | integer or null |  |  |
| `to` | integer or null |  |  |
| `successor` | string or null |  |  |
| `note` | string or null |  |  |
