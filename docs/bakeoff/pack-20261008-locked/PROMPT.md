<!-- doc-status: current; normative: yes (for this test) -->
# Titan Reliquary photo test (locked pack, 2026-10-08)

You are taking part in a blind test of how well AI models read coins from a photo. Same photos, same prompt, for every model.

**Rules**
- Look only at the photos in this folder. Do not search this repository, its data files, or its other photos: the answers are in there
  and a looked-up answer scores as invalid. Web references (Numista, NGC, PCGS) are allowed for the catalogue number only.
- If you are not sure of a field, answer null. A wrong confident answer is worse than null.
- Each photo is one coin, cut out of a phone photo; it may be turned a little. Only one side is shown.

**Photos**: 15 files, `BK-xxxx.webp` (list below).

**Answer**: one JSON object, nothing else, keyed by the file name without `.webp`:
```json
{"BK-0a1b": {"country": "Switzerland", "year": "1969", "denom": "1 franc", "mint": "B", "km": "24a.1", "confidence": "high"}}
```
- `country`: the issuing country in English. `year`: the date on the coin converted to the Western year (null if it is not on the
  shown side). `denom`: value and unit as on the coin. `mint`: the mint mark letters, "" if the shown side has none, null if you cannot
  tell. `km`: the Krause number without "KM#". `confidence`: high / med / low for the whole answer.
- Send the JSON to Joseph in chat, or save it as `bakeoff_{yourmodel}_{YYYYMMDD-HHMM}.json` in Drive
  `Titan Reliquary/bakeoff (blind photo test)/`. Add one line: your exact model name and version, and the cost if you can see it.

**Files**
- BK-066c.webp
- BK-081f.webp
- BK-0b42.webp
- BK-0db2.webp
- BK-3964.webp
- BK-5c23.webp
- BK-7c56.webp
- BK-aedb.webp
- BK-bb29.webp
- BK-bcc1.webp
- BK-c0cc.webp
- BK-d3b6.webp
- BK-e0c9.webp
- BK-f617.webp
- BK-fe34.webp
