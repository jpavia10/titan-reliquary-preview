# Display parity: generating `data/` from `collection/` (2026-09-30)

`python3 tools/pipeline/test_parity.py` : 17,378 field comparisons vs the v254 `data/`: exact 17,092 + normalised 167, curated 119, **derived 0, known 0, unexplained 0**.
(Before: exact 16,229, curated 178, derived 966, known 2.)

## What was done
- **`Specimen.ledger_text`** (new optional object in `schema/v2/defs.schema.json`; keys `label face face_line metal refs specs specs_tail denom cat photo_stem mint`).
  It keeps the ledger v254 wording verbatim where the display string is NOT derivable from the structured facts:
  FX / "(demonetized 2002)" / Melt notes on the face value, mint letters in labels (`2011-J`; no rule separates the coins that have it), catalogue and
  spec tails, denomination flourishes (`1 franc · FRF (nouveau franc)`), toning remarks inside the metal line. It is formatting only; the build shows the
  stored string instead of the derived one. **Caveat:** a stored key masks the fact behind it. When someone corrects that fact (catalogs, nominal, composition,
  face), clear the matching `ledger_text` key in the same ChangeEvent. `tools/pipeline/capture_ledger_text.py` regenerates the complete set from the v254 `data/`
  (it is idempotent and only emits events for specimens whose `ledger_text` would change). Applied as 280 ChangeEvents, `by model:sonnet-5.5`, `verified false`.
- **photo_stem is frozen to the v254 spelling** (Drive master photo names depend on it): derived by rule (`10Pf`, `5DM`, `10Fr`, `3Kopeks`, ...), the 13 irregular ones
  (`1943S`, `AH1378`, `Spielmarke20`, `MeijerPony`, `BicentennialQuarter`, ...) via `ledger_text.photo_stem`. All 273 match v254 (incl. the 7 coins whose denomination was curated).
- **C146 mint** fixed by ChangeEvent (`HK.KM.69a issues.0.mint_text`): the ledger's `mint` field was cut mid-parenthesis (`Llantrisant / HK Mint era)`). The mint name now leads.
  C073 quantity 26 was already in.
- **search.json**: same coverage (273 ids) and the v254 field order (denom_line, label, notes, design, refs, mint, metal, specs, mintage, tender, face, parked, cat, continent, added,
  scan_note, joined with ` · `, an `unknown` mint left out): 269/273 texts were reproduced exactly before number aliases were added. Number aliases (`4.00` also as `4`, `4.0`) are appended
  because the ledger spelled the same weight differently per record. Devanagari vowel signs are kept (v254 stripped them, so `रुपया` now matches).

## Remaining differences (all deliberate curation, none unexplained)
The test lists each as `curated`; each is backed by a ChangeEvent in `collection/changes.jsonl`.
| fields (count) | reason |
|---|---|
| design (33) | type `design.text` rewritten to one wording shared by sibling specimens (C266/C267, C010/C104 ...) |
| label (12), denom / denom_line (11 each) | denomination or issuer renamed on the type: `1/2 franc` vs `½ franc`, `Germany (Empire)`, `Vietnam (State of Vietnam)`, `Mexico (Chihuahua)`, tokens `Spielmarke “20”`, `Ride Token (...)`, prop `$1` |
| specs (12) | type alignment curated to a single value (CH 2 Fr / ½ Fr: `coin alignment (early CuNi)`, `medal/coin alignment per year variety`); C031/C073/C088 weight/diameter moved out of specs into `nominal`; C144 thickness 1.7 mm |
| metal (8) | composition text or weight curated (C031, C073, C088, C144, C220, C242: richer composition; C031/C088 now show g/mm instead of the ASW oz) |
| refs (4) | type keeps one catalogue number (C153 KM#989 only, its KM#1110 is in notes/sources; C183; C144/C268 gain `Schön#107`) |
| face (1), face_line (2), tender (1), year_line (1), mint (2), notes (2), diameter (1) | C020 face 0.005 -> 0.01 pound; C144 tender text; C146 mint; C010 / T003 markdown heading removed from notes; C073 diameter 24.3 |

Search: 31 entries lack some v254 word, all on coins above whose wording a curation event rewrote (the test fails if any other coin loses a word).

## Known loss (curation side, for the owner)
The curated specs for the 8 Swiss coins lose the remark `(early CuNi)` / `per year variety` (only the alignment value was kept); the tail after it is preserved in `ledger_text.specs_tail`.
