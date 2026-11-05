# Intake 2026-11-04 (Claude): files of 31 October - 4 November

Merged (originals byte-exact in `collection/_incoming/originals-20261104/`, format fixes listed there):
- Grok `changes_grok_20261031-1059..1104` (arbitrate x2, cite, story-check, verify x2; 80 lines). Its notes: `notes_grok_20261031-1103.md` (3 of 75 verify items left out: C036 year '200?' not legible at 512 px, C058 1985 vs 1983 too soft, C304 Mo not legible; six period/ruler/design corrections it filed against the entries), `notes_grok_20261031-1105.md` (C300 Bahamas 1984 25c: N#9352 lists 1984 only as a Franklin Mint proof, 1,036 struck; needs the coin or its photo; left open).
- Gemini `changes_gemini_20261031-1801..1804` (plain-story, verify, cite, arbitrate). Its notes: `NOTES_for_Claude_from_Gemini_20261031.md` (Google Doc: manifest with MD5s, the room-layer sets, Supercell from `artreq_20261031-0400_room-layers-gemini-next6`).
- Muse `changes_muse_20261031-1056/-1057` + `collection/prices/wants_values_muse_20261031-1758.json` (supersedes `-1030-0312` for the 1916-D: the CoinStudy Good row, $1,161, low confidence; the Heritage $2,751 sale in the note). Its notes: `NOTES_for_claude_20261031.md` + addendum. Cite sheet HW-muse-cite-20261030-1 left out on purpose: none of the four entries (N#5712, 42670, 14370, 1159) states a mintage for the year held. Flagged DE.KM.255 issues.2/3 mint_text 'J · Hamburg' / 'G · Karlsruhe' on F rows: fixed by Claude (`changes_claude_20261104-1552`).
- Gemini API `changes_gemini-api_20261104-1534` (C036, C031: parked photos, filed as D0151, D0152; the API no longer takes parked items).
- Claude: `-1533` (D0149, circulation figure kept), `-1552` (DE.KM.255 mint text), `-1558` (C053's stale open question removed: the record reads F since 2026-10-28).

Settled by the new answers: D0126, D0128, D0135-D0141. Open: D0142-D0148, D0150-D0152 (loop third readers).

## Evening: Muse's 33 chat coins (C305-C337)

The owner photographed 33 new coins in flips on 2026-11-02 (19:02-20:52, Galaxy S24 Ultra) and identified them with Muse in chat; Muse filed them on 11-04 (`changes_muse_20261104-0930`, 35 photos, notes packet). Claude read every photo at full zoom; country, year and denomination hold for all 33.
- Reformatted before merging (`originals-20261104/FORMAT_FIXES.md`): Phase 1 type ids, value folded into the create, face units, two coins on their own X type (`BS.X.1-cent.2` 1974, `AU.X.10-cents.2` 1966). Issuers CZ and RU created (`changes_claude_20261104-2150`).
- Claude's corrections (`changes_claude_20261104-2200`): Mo on C315, C319, C323, C324 (on the photographed side); C313's monogram is under РУБЛЕЙ on the photographed side, too small to read; stories of C307, C311, C335 (beaded border, no wreath) and C313 (value side, not the eagle); C337 copper-nickel, not nickel (KM#26 1879-1980; KM#26b nickel 1932-1941); C336 10 cent and C318 10 pence confirmed by size against the 2x2 card (Muse had inferred both).
- Photos: 35 round cut-outs `photos/p1/C305_rev.webp` ... (`changes_script_20261104-2147-photos-p1`), crops logged in `docs/photos/p1_crops.jsonl`, originals in `docs/photos/raw_capture_index.json` (Drive `_raw_capture/_phase1/coins`).
- Owner questions: `q-bahamas-2015-cents` (C306, C327, C332: three coins or one; the camera times suggest three), `q-bahamas-2015-magnet` (zinc or steel), `q-c313-mint` (ММД or ЛМД).
- Possible double entries (dupes.json): C314 vs C266 (Korea 2012 10 won) and C318 vs C157 (UK 2014 10p): different photo sessions, nothing on the coins to tell; kept as second coins (the owner's rule for Muse's new-coin photos).
- Owner, 2026-11-05: "I confirmed all years by hand while I labeled": all 33 years owner-verified (`changes_owner_20261105-0110`).
- Loop fix: a new coin's story and default value were not credited to their author (the create event), so the loop gave Muse its own 33 stories and values to check; fixed in `tools/agents/homework.py` (test), both sheets withdrawn and re-issued to Gemini.
