# Format fixes before merging (Claude, 2026-11-04)

The files in this folder are the contributors' originals, byte-exact from Drive. The merged copies differ only in format:
- Grok `changes_grok_20261031-1059` line 2, `-1100` line 1: a `notes` key (not in the change-event schema) moved to the end of `source` as `| note: ...`.
- Grok `-1059` line 2, `-1103` line 28: `confidence: "medium"` written as `med` (the schema's spelling).
No value, source or provenance was changed.

## Muse `changes_muse_20261104-0930.jsonl` (33 chat coins, 2026-11-04 evening)

The original and Muse's notes packet (`NOTES_for_claude_20261104-chat-coins.md`) are in this folder. The pipeline rejected the original (160 problems); the merged copy differs only in:
- **Type ids:** the 14 new types carried catalogue numbers (`VA.KM.A52.2`, `GB.KM.868`, ...), which a Phase 1 type never does; renamed to `{ISO}.X.{denomination}` (`VA.X.20-lire`, `GB.X.half-penny`, `FR.X.2-francs`, `CZ.X.5-korun`, `RU.X.20-roubles`, `GB.X.20-pence`, `MX.X.2-nuevos-pesos`, `SE.X.1-krona`, `PT.X.20-centavos`, `MX.X.5-pesos`, `GB.X.1-shilling`, `IE.X.10-pence`, `NO.X.50-ore`, `ES.X.5-pesetas`). The catalogue numbers stay in the notes packet for Phase 2.
- **Default value:** the 33 separate `field: "value"` create lines were folded into each specimen's create as `new.value` (the template's form); their source text was appended to the specimen's `source`.
- **Face value in the major unit** (house convention, e.g. 20 centimes = 0.2 FRF): NEW-12 20 pence 20 -> 0.2 GBP, NEW-14 10 pence 10 -> 0.1, NEW-17 20 centimes 20 -> 0.2 FRF, NEW-18 20 centavos 20 -> 0.2 PTE, NEW-26 10 pence 10 -> 0.1 IEP, NEW-25 shilling 1 -> 0.05 GBP; NEW-5 halfpenny 0.5 GBP -> null (as C164: no exact decimal value).
- **Two coins on their own Phase 1 type** (Claude's call, from Muse's own catalogue table): NEW-22 Bahamas 1974 cent -> `BS.X.1-cent.2` (BS.X.1-cent is the copper-plated 2015 cent of C276), NEW-27 Australia 1966 10 cents -> `AU.X.10-cents.2` (AU.X.10-cents is C295's 2006 coin, KM#402; the 1966 coin is KM#65). Both types and the issuers CZ and RU are created by `changes_claude_20261104-2150.jsonl`.
- **Notes:** removed two sentences that the renames made untrue (NEW-1 "The type id carries the catalog's A prefix ...", NEW-27 "Filed under the collection's existing 10 cents type ...") and the pointer "Catalog references are in the NOTES packet for this file."
No country, year, denomination, mint mark, story or value amount was changed here. Claude's photo corrections (4 Mexican Mo marks, the Russian monogram, 4 stories, the 1944 5 rappen metal, the German and UK 10 denominations confirmed by size) are their own events in `changes_claude_20261104-2200.jsonl`.
