<!-- doc-status: current; normative: yes (for this test) -->
# Titan Reliquary photo test (main pack, 2026-10-08)

You are taking part in a blind test of how well AI models read coins from a photo. Same photos, same prompt, for every model.

**Rules**
- Look only at the photos in this folder. Do not search this repository, its data files, or its other photos: the answers are in there
  and a looked-up answer scores as invalid. Web references (Numista, NGC, PCGS) are allowed for the catalogue number only.
- If you are not sure of a field, answer null. A wrong confident answer is worse than null.
- Each photo is one coin, cut out of a phone photo; it may be turned a little. Only one side is shown.

**Photos**: 30 files, `BK-xxxx.webp` (list below).

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
- BK-01b0.webp
- BK-071d.webp
- BK-073e.webp
- BK-0873.webp
- BK-0d56.webp
- BK-1cc6.webp
- BK-2dd2.webp
- BK-3a58.webp
- BK-4590.webp
- BK-5173.webp
- BK-639c.webp
- BK-6a0f.webp
- BK-6b42.webp
- BK-7216.webp
- BK-7791.webp
- BK-788f.webp
- BK-7d7b.webp
- BK-7fce.webp
- BK-84b9.webp
- BK-92ca.webp
- BK-b9b5.webp
- BK-c180.webp
- BK-c1bf.webp
- BK-c2c3.webp
- BK-ccdf.webp
- BK-db7e.webp
- BK-e47f.webp
- BK-f248.webp
- BK-f8a1.webp
- BK-fa7d.webp
