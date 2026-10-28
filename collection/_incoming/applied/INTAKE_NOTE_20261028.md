# Intake 2026-10-28 (Claude): Grok's tray of 10-27/28 + Gemini's 35 verify files of 10-24

## Grok (15 files merged, 1 superseded)
Applied in Grok's own order (catalogue fix before the verify lines; owner-question photo reads before their mintages).
Mechanical fixes by Claude, content unchanged (Grok stays the author of every line):
- `changes_grok_20261028-catalogue-fix`: `provenance.assignment` held a project id (`GROK-catalogue-fix-20261027`), not a homework id: moved to `run_id`; the 4 type creates got `field: "(new record)"`, their `id`, and lost the pipeline-only `country`. The new types EC.KM.37, GT.KM.277.6a, TT.KM.32, JM.KM.190 are exact copies of the old records (whose catalogue lists already named these numbers); the old keys stay as unused types (warnings), as CH.KM.24a did.
- `changes_grok_20261028-owner-q-photo`: the same assignment fix; the top-level `question` key moved into `provenance.raw`; C053 `issue.mint_text` `old` was null, the record held "J · Hamburg". Claude read all three photos at full zoom and agrees (C053 F, C206 Showa 46 = 1971, C066 1976); owner questions q-c053-mint, q-c206-date, q-c066-date closed as answered by two photo readers.
- `changes_grok_20261028-owner-q-mintage`: the same assignment fix; `provenance.inputs` were plain URLs (now `{file}` objects). **C053's 2011 F mintage (39,644,000) left out**: Numista lists 2011 F as undetermined and Foronum gives 39,600,000; it could not be checked (Numista is blocked from the container). C206 904,050,000 and C066 3,007,000 match Numista.
- `changes_grok_20261027-1946`: a model line carried `verified: true` (only the owner verifies): set to false; the value was unchanged (a re-citation).
- `changes_grok_20261027-1948`: superseded by Grok's own `-0251_story28` (Grok's note), not applied.
- `wants_values_grok_20261027-2000.json` -> `collection/prices/` (40 album-hole prices, NGC); `varieties_grok_20261027-2000.json` -> `docs/photos/varieties_checklist_grok_20261027.json` (124 things to look for at the pro-photo session; never facts about a coin).

## Gemini (35 files of 10-24 = 602 lines)
Two rounds answered the same 5 verify sheets: morning 1745-1808 (Gemini moved these to its superseded folder) and evening 1931-1945. For the 211 fields answered twice the evening line was kept; the 98 fields only the morning round answered were kept too (verify lines never change data). Files 1751-1808 had nothing left after that and were not applied. 27 lines with `new: null` = left out. Lines on the 4 renamed types stay on the old keys (they are not on the new keys' sheets).

## Pipeline (found by this intake)
- A check answer of one mint mark without its list (`"B"` for `["B"]`) and an alloy written another way (`Cu 70 / Zn 18 / Ni 12` = `70% Copper, 18% Zinc, 12% Nickel`; `cupronickel` = `CuNi 75/25`) now count as agreeing (`check_verdict`, `alloy_key`); 8 false disagreements were not filed. Tests in `tools/agents/test_homework.py`.

## Claude (third reader)
`changes_claude_20261028-1700`, `-1710`, `-1715`: D0108 C014 no mint mark (photo; Swiss 1970-1984 carry no B), D0113 C102 2015 F (photo, med), D0114/D0116/D0123/D0125 French euro mintages = circulation row (the record held circulation + BU + proof); C053/C102 mintages and the new 2011 F / 2015 F type rows cleared (they held the J / G figures); C023 note rewritten for the Austrian heller. Open for the loop's third reader: D0109 (C036 2002 or 2007: photo too soft), D0110, D0111, D0112, D0115, D0117-D0122, D0124.
