<!-- doc-status: current; normative: yes (for Muse) -->
# WORK QUEUE for Muse (updated 2026-10-15 02:08 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** active (probation: every fact you write is checked by another AI until 3 submissions in a row score 8+). Researcher and writer stepping up (owner, 2026-10-10: "I think muse wants to step up so maybe see what they got in them"): harder work first now (research questions, catalogue citations, collector values); every fact it writes is still checked while it is on probation.
**How you get this:** Drive doc 'WORK QUEUE for Muse' in Titan Reliquary/ (docs/agents/QUEUE_muse.md). Drops change files in Drive collection-incoming (AI change files).

## Finish first

### Fix three coin photos (from the 2026-10-14 intake)  (fix list #3)

Read your FEEDBACK doc (2026-10-14). (a) The Bahamas 25 cents photo you uploaded is the same file as the Bahamas 5 cents, and the Mexico 1989 500 pesos photo is the same file as the 1988 one (same SHA-256): photograph the right coins and upload them to STAGING as NOID_Bahamas_1984_25-cents_{obv|rev}.jpeg and NOID_Mexico_1989_500-pesos_{obv|rev}.jpeg with one photos_muse_{YYYYMMDD-HHMM}.json summary (file, EXIF camera time, SHA-256). Both coins are already in the app (C300, C301) and wait only for these photos. (b) Your Mexico 1981 20 pesos is in the app as C304 from your reading (Joseph: "Whatever muse said just use that"), but it has no photo: upload it the same way as NOID_Mexico_1981_20-pesos_{obv|rev}.jpeg. When the collection already has a coin of the same country, year and denomination (search data/search.json), say 'a second one, checked with Joseph' in the notes so nobody mistakes it for a repeat.

**Done when:** The three photos are in STAGING with a summary, each different from every photo already filed.

### UI rethink, part 3: what is clunky today (phone walkthrough) + 10 references  (fix list #116)

Joseph wants the interface rethought from scratch, keeping every function: read the brief: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/design/REDESIGN_BRIEF.md (a copy is in Drive 'Titan Reliquary/design-incoming (AI UI proposals)/DESIGN BRIEF'). Your part is the evidence the other two design from. (1) Walk the live app on a phone-sized screen (https://jpavia10.github.io/titan-reliquary-preview/) doing the ten jobs Joseph and his dad really do (for example: what's new today; find a coin; which Silver Eagle year is missing; answer a coin question and send it; photograph the next coin; change the World and its sound; show the collection to a friend). For each: the taps it took, where it got stuck, and why, ranked worst first. (2) Ten reference works that show how this could feel (public sites, demos, apps; code-made motion and 3D): the link, what to borrow, and why it fits a coin collection. No prototype needed. Save as design_muse_{YYYYMMDD-HHMM}_walkthrough.md in Drive 'design-incoming (AI UI proposals)'.

**Done when:** One file with the ranked walkthrough and the ten references.

### Second reader on Grok's Numista batches  (fix list #72)

If you already started this spot check (5 facts from each of Grok's 9 sweep batches, reported in your FEEDBACK doc), finish it the same way. If you have not started, skip it: the 'Second reader' homework below is the same job with a pre-filled answer sheet, and it counts towards your probation.

**Done when:** Either your 45-fact report in the FEEDBACK doc, or the verify homework answered.

### Theme pictures: the 22 wide heroes (priority 2)  (fix list #113)

The request is in Drive 'art-requests (any AI: images + video)/artreq_20261010-1700_theme-thumbnails.json' (repo copy docs/art/requests/artreq_20261010-1700_theme-thumbnails.json). Follow ART_START_HERE: one image at a time (make it, save it to 'art-incoming (AI images + video)/artreq_20261010-1700_theme-thumbnails/' with the exact file name, then the next); stop at the first failure or credit warning and write down how far you got. The pictures must look premium: real-photo look unless the image's `medium` says pixel art, comic, clay or poster; no readable text or numbers anywhere; coins look like real coins. Claude reviews every file and re-requests weak ones. Your part: every image with priority 2 (22 files: world_{theme}_hero.png, 16:10, at least 2560x1600, the top-left third calm because text sits there). Claim it as artreq_20261010-1700_theme-thumbnails.CLAIMED-muse-p2.txt; Grok has the cards (p1) and Gemini the refreshes (p3).

**Done when:** 22 hero files in the output folder (or as many as you could) and artreq_20261010-1700_theme-thumbnails.p2.DONE.txt listing each file: ok or skipped: reason.

## Calibration test due: the locked photo pack (15 coins)  (fix list #19)

Open https://github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-locked and follow its PROMPT.md (raw: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/bakeoff/pack-20261008-locked/PROMPT.md). Answer ONLY from the photos: never search this repository or its data for the coins. Save `bakeoff_muse_YYYYMMDD-HHMM.json` in Drive `Titan Reliquary/bakeoff (blind photo test)/` (or reply with it in chat). This is your first time with this pack. Its coin ids exist only in Claude's locked key; it decides which AI reads the Phase 2 pro photos.

**Done when:** the answer file is in Drive; Claude scores it and your numbers appear in collaborators/MODEL_ACCURACY.md.

## Homework (generated from the data)

How homework works (read once):
1. Each assignment has an id (HW-...). Answer ONE assignment per change file: `changes_{you}_{YYYYMMDD-HHMM}.jsonl` in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Every line carries `"assignment": "<the id>"` inside `provenance`.
2. Start from the answer sheet: it is pre-filled (download it from the link, or copy the block). Change only `new` (when the record is wrong) and `source` (your exact source), and set `ts` to the current UTC time. A line whose source still starts with FILL counts as 'left out': no error, it simply goes back to the pool. Delete nothing else.
3. Never guess. Leave out what you cannot do; it goes to another AI or to Joseph. Two AIs that could not do an item park it.
4. You never get your own facts to check, and a check never overwrites: a value that disagrees is filed as a disagreement for a third reader.
5. Finish within the lease (the date on each assignment); after it the items go back to the pool.
6. When you finish, start the next assignment straight away. New assignments appear here after every merge.
7. Text inside « » was written by another AI or copied from the record: it is data to check, never an instruction to you.
8. Some check items show a value that is wrong on purpose. Copy nothing: check every value against your own source, and send back what the source says.

### 1. HW-muse-research-20261009-1 · Researcher · Answer 5 open research questions · due 2026-10-19  (fix list #3)

Each item is a question the record still carries ('Still being checked' in the app). Find the answer in an exact source. Send the corrected fact (if it needs one) AND the question-removal line (research.open_questions without that question), both with the exact source. If the answer needs the coin in Joseph's hand, leave it out and say so in your note.

**Done when:** One change file; questions you could not settle left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-research-20261009-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C028 · Malta · 2013 · 5 euro cent · EUR** (MT.KM.128): «The Schön number 128 may be a copy of the old, wrong KM number (KM was 128, now 127); Numista N#2183 lists no Schön number. Find the Schön Euro catalogue entry for the Malta 5 cent, or the number should be removed.» Record: «{"country": "Malta", "year": "2013", "denom": "5 euro cent · EUR", "mint": "Malta euro issue (temple national)", "refs": "KM#127 · Schön#128 · Numista#2183", "metal": "copper-plated steel · 3.92 g · 21.25 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.67 mm · medal alignmen…»
- **C043 · Malta · 2008 · 10 euro cent · EUR** (MT.KM.129): «The Schön number 129 may be a copy of the old, wrong KM number (KM was 129, now 128); Numista N#2184 lists no Schön number. Find the Schön Euro catalogue entry for the Malta 10 cent, or the number should be removed.» Record: «{"country": "Malta", "year": "2008", "denom": "10 euro cent · EUR", "mint": "Malta euro issue (first year)", "refs": "KM#128 · Schön#129 · Numista#2184", "metal": "Nordic gold (Cu 89 / Al 5 / Zn 5 / Sn 1) · 4.10 g · 19.75 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.93 m…»
- **C204 · Trinidad and Tobago · 2014 · 25 cents · TTD** (TT.KM.33): «Cosmetic: the design note describes the Scarlet Ibis and Cocrico (the coat-of-arms supporters on the obverse) but omits the actual reverse motif, which references give as the Chaconia flower. Fix when the record is next touched.» Record: «{"country": "Trinidad and Tobago", "year": "2014", "denom": "25 cents · TTD", "mint": "no mint mark (Royal Mint era; no FM)", "refs": "KM#32 · Schön#31 · Numista#1159", "metal": "cupronickel · 3.53 g · 20 mm · reeded · circulated / bright · white 2×2 staple flip", "specs": "thickness 1.63 mm · meda…»
- **C212 · Eritrea · 1997 · 50 cents · ERN (nakfa)** (ER.KM.46): «The design note says the obverse shows the State of Eritrea arms / a camel, but the Numista entry (N#2403) shows soldiers with a flag on the common side. Which is right? Check the design note against the entry and the photo.» Record: «{"country": "Eritrea", "year": "1997", "denom": "50 cents · ERN (nakfa)", "mint": "no mint mark (Royal Mint issue; none on type)", "refs": "KM#47 · Schön#47 · Numista#2403", "metal": "nickel-clad steel · 7.80 g · 25 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2 mm · medal…»
- **C232 · Vietnam · 2003 · 1000 đồng · VND** (VN.KM.71): «References describe a reverse motif (the One Pillar Pagoda) that the design note omits; the catalogue number is settled (KM# 72, Numista N#2104). Check the design note against the coin or the Numista entry.» Record: «{"country": "Vietnam", "year": "2003", "denom": "1000 đồng · VND", "mint": "none — Mint of Finland (Suomen Rahapaja), Vantaa; struck under contract for the State Bank of Vietnam; no mint mark on the coin", "refs": "KM#72 · Schön#144 · Numista#2104", "metal": "brass plated steel · 3.80 g · 19 mm · r…»

### 2. HW-muse-story-check-20261010-1 · Fact-checker · Fact-check 6 coin stories · due 2026-10-17  (fix list #73)

Check each story against its own record (below) and the exact catalogue entry. If every claim holds, send the story back unchanged with source 'checked against <entry URL>: all claims hold'. If a claim is wrong, change only that sentence and say in source what was wrong and which entry shows it. You never get a story you wrote.

**Done when:** One change file covering every story you could check.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-story-check-20261010-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C067 · Switzerland · 1981 · 2 francs · CHF**: «A 1981 Swiss 2-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Designed by Albert Walch (front) and Friedrich Fisch (back), engraved by Antoine Bovy, and struck in copper-nickel (75% copper, 25% nickel).» Record: «{"country": "Switzerland", "year": "1981", "denom": "2 francs · CHF", "mint": "B", "refs": "KM#21a.1 · Numista#189", "metal": "CuNi 75/25 · 8.80 g · 27.4 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2.15 mm · coin alignment · type specs shared with CuNi 2 Fr (KM#21a)", "mintage": "13,852,000", "design": "standing Helvetia (obv) · 2 Fr. in oak + alpine wreath (rev) · engr…»
- **C077 · Switzerland · 1991 · 2 francs · CHF**: «A 1991 Swiss 2-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Designed by Albert Walch (front) and Friedrich Fisch (back), engraved by Antoine Bovy, and struck in copper-nickel (75% copper, 25% nickel).» Record: «{"country": "Switzerland", "year": "1991", "denom": "2 francs · CHF", "mint": "B", "refs": "KM#21a.3 · Schön#29a · Numista#189", "metal": "CuNi 75/25 · 8.80 g · 27.40 mm · reeded · dark grey-blue tone · circulated · white 2×2 staple flip", "specs": "thickness 2.15 mm · coin alignment · type specs shared with CuNi 2 Fr (KM#21a)", "mintage": "12,026,100 Bern B", "design": "standing Helvetia (obv) ·…»
- **C093 · Switzerland · 1970 · 1 franc · CHF**: «A 1970 Swiss 1-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Designed by Albert Walch (front) and Friedrich Fisch (back), engraved by Antoine Bovy, and struck in copper-nickel (75% copper, 25% nickel).» Record: «{"country": "Switzerland", "year": "1970", "denom": "1 franc · CHF", "mint": "B", "refs": "KM#24a.1 · Numista#185", "metal": "CuNi 75/25 · 4.40 g · 23.2 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.55 mm · type specs shared with CuNi 1 Fr from 1968 (KM#24a) — same type as pilot C001 / EU-CH-008", "mintage": "24,240,000", "design": "standing Helvetia (obv) · value in wr…»
- **C094 · Switzerland · 1986 · 1 franc · CHF**: «A 1986 Swiss 1-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Designed by Albert Walch (front) and Friedrich Fisch (back), engraved by Antoine Bovy, and struck in copper-nickel (75% copper, 25% nickel).» Record: «{"country": "Switzerland", "year": "1986", "denom": "1 franc · CHF", "mint": "B", "refs": "KM#24a.3 · Schön#28a · Numista#185", "metal": "CuNi 75/25 · 4.40 g · 23.2 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.55 mm · type specs shared with CuNi 1 Fr (KM#24a)", "mintage": "17,997,000 Bern B", "design": "standing Helvetia within 23 stars (obv) · value in oak + alpine wr…»
- **C115 · Switzerland · 1968 · 2 francs · CHF**: «A 1968 Swiss 2-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Designed by Albert Walch (front) and Friedrich Fisch (back), engraved by Antoine Bovy, and struck in copper-nickel (75% copper, 25% nickel).» Record: «{"country": "Switzerland", "year": "1968", "denom": "2 francs · CHF", "mint": "B", "refs": "KM#21a.1 · Numista#189", "metal": "CuNi 75/25 · 8.80 g · 27.4 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2.15 mm · coin alignment · type specs shared with CuNi 2 Fr (KM#21a)", "mintage": "31,588,000", "design": "standing Helvetia (obv) · 2 Fr. in oak + alpine wreath (rev) · engr…»
- **C116 · Switzerland · 1981 · 2 francs · CHF**: «A 1981 Swiss 2-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Designed by Albert Walch (front) and Friedrich Fisch (back), engraved by Antoine Bovy, and struck in copper-nickel (75% copper, 25% nickel).» Record: «{"country": "Switzerland", "year": "1981", "denom": "2 francs · CHF", "mint": "B", "refs": "KM#21a.1 · Numista#189", "metal": "CuNi 75/25 · 8.80 g · 27.4 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2.15 mm · coin alignment · type specs shared with CuNi 2 Fr (KM#21a)", "mintage": "13,852,000 (same year type as C067 / EU-CH-016)", "design": "standing Helvetia (obv) · 2 Fr…»

### 3. HW-muse-value-20261010-1 · Appraiser · Cite collector values for 6 coins · due 2026-10-20  (fix list #62)

For each coin, find the retail value for its type, date and mint in the grade its phone photo suggests, from a named price page (NGC World Price Guide, PCGS CoinFacts, or Numista's value table for that row). Send value.est_usd and value.confidence (med when the page gives that grade, low when you assumed it); source = the exact page URL and the grade you assumed and why. Silver coins are never below melt (data/prices.json has the spot). Leave a coin out when no page covers it.

**Done when:** One change file; coins without a price page left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-value-20261010-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C023 · Germany (Empire) · 1918 · 20 Pfennig · German Empire Mark system**: now $1.00 (med). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C023_rev.webp
- **T001 · Germany · ND · Spielmarke “20” (GR)**: now $1.00 (med)
- **T002 · Germany · ND · Spielmarke “20” (GR)**: now $1.00 (med). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/T002_obv.webp
- **T005 · USA · 2013 · Prop $1 (Series 2013 style)**: now $1.00 (med). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/T005_obv.webp
- **T006 · USA · 2009 · Prop $50 (Series 2009 style)**: now $1.00 (med). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/T006_obv.webp
- **C287 · Italy · 1979 · 50 lire · ITL**: now $0.75 (low). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C287_rev.webp

### 4. HW-muse-read-mint-20261010-1 · Photo reader · Read the mint mark on 13 coins from their photos · due 2026-10-17  (fix list #57)

Phase 1 cannot finish until every coin's mint mark is read. Open each coin's photo (GitHub link or Drive original), find the mint mark where this country puts it, and send `issue.mint_marks` (e.g. ["D"]) and `issue.mint_text` (e.g. "D (Denver), left of the date", or "no mint mark (Philadelphia)") with the photo file name in `source`. If the side with the mark is not in the photo, or you cannot read it at full zoom, leave the coin out: it goes on Joseph's shoot list. Never guess.

**Done when:** One change file; unreadable coins left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-read-mint-20261010-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C268 · Norway · 2000 · 50 øre · NOK**: mint text now «Kongsberg · crossed hammers + JEJ (Jan Erik Johansen · mintmaster) on crown obverse (not …». Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C268_rev.webp (original: https://drive.google.com/file/d/1ar7a-mIYM6hvx0lSuRmIFtaoS1ym4twT/view). Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none.
- **C057 · Germany · 1982 · 50 Pfennig · DEM**: mint text now «unknown (letter not on this reverse (oak-planter side); check eagle for D/F/G/J)». Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C057_rev.webp (original: https://drive.google.com/file/d/1g56B0N9maAERq4XGAtiP6NU3GLkO8nKw/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C058 · Germany · 1985 · 50 Pfennig · DEM**: mint text now «unknown (letter not on this reverse (oak-planter side); check eagle for D/F/G/J)». Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C058_rev.webp (original: https://drive.google.com/file/d/1k0Xkr2HdmExUjMDFmvw1NQWRyr_90Jrb/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C131 · Germany · 2002 · 20 euro cent · EUR**: mint text now «unknown (letter not clear on photo (A/D/F/G/J by the Gate — flip if you want it locked))». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C131_obv.webp (original: https://drive.google.com/file/d/1dDIlK9QjkJHY60kWaQHUYXMKmXQGV0pq/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C035 · Germany · 1971 · 50 Pfennig · DEM**: mint text now «unknown (not read (mark on value side; photos show planter side))». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C035_obv.webp (original: https://drive.google.com/file/d/1nPNyKSgqZhl2EC0rS8ksTOj4WanqZP0a/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C037 · Germany · 2002 · 10 euro cent · EUR**: mint text now «unknown (photo unclear · A Berlin or J Hamburg)». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C037_obv.webp (original: https://drive.google.com/file/d/1eeusgrv1o7ZzUa7myUQdAsjt32YBEr0c/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C265 · Germany · 1950 · 5 Pfennig · DEM**: mint text now «unknown (letter soft / not locked (between oak leaves above date))». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C265_obv.webp (original: https://drive.google.com/file/d/1ohMbmn0D3BVAb9z7yjDXflai_YWoH4L_/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C019 · Germany · 1981 · 10 Pfennig · DEM**: mint text now «unknown (not readable on oak reverse photo (check value side if you care — D/F/G/J))». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C019_obv.webp (original: https://drive.google.com/file/d/1KgkQJAI4bRpwo-X8t2zG2OypETwJbCfb/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C030 · Germany · 1982 · 10 Pfennig · DEM**: mint text now «unknown (not clear on oak reverse photo (value side if you want D/F/G/J))». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C030_obv.webp (original: https://drive.google.com/file/d/1Y1HgLbLDQfDlI7jmmziKsvV9aNM0qfHt/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C051 · Germany · 1986 · 10 Pfennig · DEM**: mint text now «unknown (letter above date unclear)». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C051_obv.webp (original: https://drive.google.com/file/d/1_Y6DXJlTne3vqJTfjotsMi_AKrXPpfGy/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C089 · Germany · 1995 · 10 Pfennig · DEM**: mint text now «unknown (not on oak reverse (value side carries A/D/F/G/J — flip if you want the lette…)». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C089_obv.webp (original: https://drive.google.com/file/d/1ogEnbBDAKXFKnnpC6-74i5s-Ewyehb_E/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C126 · Germany · 2002 · 2 euro cent · EUR**: mint text now «unknown (letter not on shown common reverse (A/D/F/G/J on oak national side — flip if …)». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C126_obv.webp (original: https://drive.google.com/file/d/1nkxYX7di-gWj4cSPKd_cbb3__4W6qoC0/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C285 · Slovakia · 2009 · 5 euro cent · EUR**: mint text now «not read on photo». Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C285_obv.webp (original: https://drive.google.com/file/d/1I8raIzKXi15TWX8U-MAf48jVmXL1FjB1/view). Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none.

### 5. HW-muse-verify-20261010-1 · Second reader · Check 49 facts another AI wrote · due 2026-10-17  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261010-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **catalog of C070 · Netherlands · 2002 · 2 euro · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type NL.KM.241 catalogs` [audit sample]
- **mintage of C164 · United Kingdom · 1932 · ½ penny · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.837 issues.0.mintage` [audit sample]
- **mintage of C015 · Switzerland · 1971 · 1/2 franc · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.23a issues.1.mintage` [audit sample]
- **catalog of C145 · Chile · 1996 · 50 pesos · CLP** (blind: look it up yourself in your own exact source; the first value is not shown) `type CL.KM.219.2 catalogs` [audit sample]
- **catalog of C202 · Guatemala · 2010 · 10 centavos · GTQ** (blind: look it up yourself in your own exact source; the first value is not shown) `type GT.KM.277.1 catalogs` [audit sample]
- **catalog of C210 · South Korea · 2000 · 100 won · KRW** (blind: look it up yourself in your own exact source; the first value is not shown) `type KR.KM.35.2 catalogs` [audit sample]
- **catalog of C201 · Nigeria · 1976 · 10 kobo · NGN** (blind: look it up yourself in your own exact source; the first value is not shown) `type NG.KM.10.1 catalogs` [audit sample]
- **catalog of C163 · Philippines · 1984 · 50 sentimo · PHP** (blind: look it up yourself in your own exact source; the first value is not shown) `type PH.KM.242.1 catalogs` [audit sample]
- **catalog of C264 · Singapore · 1973 · 10 cents · SGD** (blind: look it up yourself in your own exact source; the first value is not shown) `type SG.KM.3 catalogs` [audit sample]
- **mintage of C205 · United Kingdom · 1982 · 20 pence · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.931 issues.0.mintage` [audit sample]
- **mintage of C220 · Japan · 1982 · 10 yen · JPY** (blind: look it up yourself in your own exact source; the first value is not shown) `type JP.Y.73a issues.0.mintage` [audit sample]
- **composition of C162 · Thailand · 2006 · 1 baht · THB** `type TH.KM.183 composition.text` = `copper-nickel` (written by Grok: «Numista N#1106 (https://en.numista.com/catalogue/pieces1106.html): composition copper-nickel (record text said 'CuNi (nickel-clad steel comm») [audit sample]
- **catalog of C010 · Netherlands · 1996 · 25 cents · NLG** (blind: look it up yourself in your own exact source; the first value is not shown) `type NL.KM.204 catalogs` [audit sample]
- **catalog of C035 · Germany · 1971 · 50 Pfennig · DEM** (blind: look it up yourself in your own exact source; the first value is not shown) `type DE.KM.109.1 catalogs` [audit sample]
- **catalog of C253 · Jamaica · 1993 · 10 cents · JMD** (blind: look it up yourself in your own exact source; the first value is not shown) `type JM.KM.146 catalogs` [audit sample]
- **composition of C253 · Jamaica · 1993 · 10 cents · JMD** `type JM.KM.146 composition.text` = `nickel plated steel` (written by Grok: «Numista N#2617 (https://en.numista.com/catalogue/pieces2617.html): composition nickel plated steel -> metal_class plated steel») [audit sample]
- **composition of C251 · Yugoslavia · 1984 · 1 dinar · YUD** `type YU.KM.86 composition.text` = `nickel brass (75% copper, 21% zinc, 4% nickel)` (written by Grok: «Numista N#2417 (https://en.numista.com/catalogue/pieces2417.html): composition nickel brass (75% copper, 21% zinc, 4% nickel) (record said b») [audit sample]
- **catalog of C054 · France · 2010 · 10 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.1410 catalogs` [audit sample]
- **catalog of C007 · France · 1963 · 10 centimes · FRF** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.929 catalogs` [audit sample]
- **catalog of C218 · United Kingdom · 2010 · 1 penny · GBP (decimal)** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.1107 catalogs` [audit sample]
- **mintage of C081 · Switzerland · 1983 · 5 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.26c issues.1.mintage` [audit sample]
- **mintage of C283 · Germany · 2002 · 10 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type DE.KM.210 issues.0.mintage` [audit sample]
- **mintage of C007 · France · 1963 · 10 centimes · FRF** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.929 issues.0.mintage` [audit sample]
- **mintage of C062 · France · 1998 · 10 centimes · FRF** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.929 issues.4.mintage` [audit sample]
- **mintage of C194 · France · 1980 · 5 centimes · FRF** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.933 issues.1.mintage` [audit sample]
- **mintage of C158 · United Kingdom · 2016 · 10 pence · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.1335 issues.0.mintage` [audit sample]
- **mintage of C105 · United Kingdom · 1971 · 1 penny · GBP (decimal)** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.915 issues.0.mintage` [audit sample]
- **mintage of C109 · United Kingdom · 1995 · 1 penny · GBP (decimal)** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.935a issues.0.mintage` [audit sample]
- **mintage of C217 · United Kingdom · 1998 · 1 penny · GBP (decimal)** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.986 issues.0.mintage` [audit sample]
- **mintage of C266 · South Korea · 2012 · 10 won · KRW** (blind: look it up yourself in your own exact source; the first value is not shown) `type KR.KM.103 issues.0.mintage` [audit sample]
- **mintage of C172 · United Kingdom · 1997 · 5 pence · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.937b issues.3.mintage` [audit sample]
- **catalog of C046 · Germany · 2010 · 2 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type DE.KM.208 catalogs` [audit sample]
- **catalog of C107 · United Kingdom · 1987 · 1 penny · GBP (decimal)** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.935 catalogs` [audit sample]
- **mintage of C107 · United Kingdom · 1987 · 1 penny · GBP (decimal)** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.935 issues.0.mintage` [audit sample]
- **catalog of C140 · Spain · 2008 · 1 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type ES.KM.1040 catalogs` [audit sample]
- **catalog of C141 · France · 2009 · 1 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.1282 catalogs` [audit sample]
- **catalog of C142 · Netherlands · 2000 · 1 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type NL.KM.234 catalogs` [audit sample]
- **period of C139 · Spain · 2014 · 1 euro cent · EUR** `type ES.KM.1144 period` = `Eurozone` (written by Claude: «Numista N#10856 (Spain 1 euro cent, 2010 onward, KM#1144) vs N#81 / NGC KM#1040 (1999-2009, https://www.ngccoin.com/price-guide/world/spain-»)
- **denomination of C288 · Australia · 1983 · 1 cent · AUD** (blind: read it yourself; `new` = the face value as a number, e.g. 50 for 50 centavos, 0.5 for a half franc) `type AU.X.1-cent denomination.value`. Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C288_obv.webp (original: https://drive.google.com/file/d/1BeTkW-rEoVY-dp6zmkSyXEetziUnJK-S/view)
- **catalog of C235 · Guatemala · 1934 · 10 centavos · GTQ** (blind: look it up yourself in your own exact source; the first value is not shown) `type GT.KM.239.2 catalogs`
- **mintage of C235 · Guatemala · 1934 · 10 centavos · GTQ** (blind: look it up yourself in your own exact source; the first value is not shown) `type GT.KM.239.2 issues.0.mintage`
- **mintage of C073 · USA · 1976 · 25 cents · USD · Bicentennial (1776–1976)** (blind: look it up yourself in your own exact source; the first value is not shown) `type US.KM.204 issues.0.mintage`
- **mintage of C065 · Switzerland · 2014 · 5 francs · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.40a.4 issues.0.mintage`
- **catalog of C066 · Switzerland · 1978 · 5 francs · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.40a.1 catalogs`
- **catalog of C031 · Australia · 1943 · Threepence (3d) · AUD** (blind: look it up yourself in your own exact source; the first value is not shown) `type AU.KM.37 catalogs`
- **catalog of C088 · USA · 1957 · 10¢ Roosevelt** (blind: look it up yourself in your own exact source; the first value is not shown) `type US.KM.195 catalogs`
- **catalog of C009 · Germany · 1987 · 5 Deutsche Mark · DEM** (blind: look it up yourself in your own exact source; the first value is not shown) `type DE.KM.140.1 catalogs`
- **mintage of C009 · Germany · 1987 · 5 Deutsche Mark · DEM** (blind: look it up yourself in your own exact source; the first value is not shown) `type DE.KM.140.1 issues.0.mintage`
- **mintage of C077 · Switzerland · 1991 · 2 francs · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.21a.3 issues.0.mintage`

### 6. HW-muse-value-20261010-2 · Appraiser · Cite collector values for 5 coins · due 2026-10-20  (fix list #62)

For each coin, find the retail value for its type, date and mint in the grade its phone photo suggests, from a named price page (NGC World Price Guide, PCGS CoinFacts, or Numista's value table for that row). Send value.est_usd and value.confidence (med when the page gives that grade, low when you assumed it); source = the exact page URL and the grade you assumed and why. Silver coins are never below melt (data/prices.json has the spot). Leave a coin out when no page covers it.

**Done when:** One change file; coins without a price page left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-value-20261010-2.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C282 · Yugoslavia · 1965 · 50 para · YUD**: now $0.25 (low). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C282_rev.webp
- **C283 · Germany · 2002 · 10 euro cent · EUR**: now $0.25 (low). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C283_obv.webp
- **C284 · Mexico · 2009 · 50 centavos · MXN**: now $0.25 (low). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C284_rev.webp
- **C286 · Honduras · 2012 · 50 centavos · HNL**: now $0.25 (low). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C286_obv.webp
- **C278 · Switzerland · 1980 · 20 rappen · CHF**: now $0.22 (low). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C278_obv.webp

### 7. HW-muse-cite-20261014-1 · Cataloguer · Cite the catalogue facts of 21 coin types · due 2026-10-21  (fix list #72)

For each coin type below, open its Numista entry (or find it) and send the facts listed under `ask`, each as its own line with the exact entry URL and the table row you read in `source`. Where the record is already right, send the same value back with your source (a re-citation is how a guess becomes Reference). Leave a line out when the entry does not give that fact; leave a whole type out when there is no entry (say why in one line of your note).

**Done when:** One change file answering this assignment; everything you left out goes back to the pool.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-cite-20261014-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **DE 20 Pfennig (DE-EMP.X.20-pfennig)** coins C023. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; issues.0.mintage: 1918
- **MX 5 centavos (MX-CHI.KM.612)** coins C114. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; issues.0.mintage: 1914
- **BS 1 cent (BS.X.1-cent)** coins C276. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); issues.0.mintage: 2015
- **FR 5 francs (FR.KM.888b.1)** coins C243. Ask: nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null)
- **SU 1 kopek (SU.Y.126a)** coins C042, C044. Ask: issues.0.mintage: 1962; issues.1.mintage: 1974
- **BZ 25 cents (BZ.X.25-cents)** coins C280. Ask: issues.0.mintage: 2007
- **EC 10 cents (EC.KM.38)** coins C159. Ask: issues.0.mintage: 2004
- **ER 50 cents (ER.KM.46)** coins C212. Ask: issues.0.mintage: 1997
- **GT 10 centavos (GT.KM.277.1)** coins C202. Ask: issues.0.mintage: 2010
- **HK 1 $ (HK.KM.69a)** coins C146. Ask: issues.0.mintage: 1998
- **IN 1 rupee (IN.KM.92.2)** coins C203. Ask: issues.0.mintage: 2001
- **JM 10 cents (JM.KM.146)** coins C253. Ask: issues.0.mintage: 1993
- **JM 1 dollar (JM.KM.189)** coins C219. Ask: issues.0.mintage: 2015
- **JM 10 dollars (JM.KM.191)** coins C230. Ask: issues.0.mintage: 2015
- **KY 1 cent (KY.KM.87)** coins C269. Ask: issues.0.mintage: 1990
- **KY 5 cents (KY.KM.88a)** coins C185, C214. Ask: issues.0.mintage: 1996
- **NL 1 gulden (NL.KM.184)** coins C223. Ask: issues.0.mintage: 1967
- **PH 1 piso (PH.X.1-piso)** coins C279. Ask: issues.0.mintage: 1997
- **TT 10 cents (TT.KM.31)** coins C207. Ask: issues.0.mintage: 2016
- **TT 25 cents (TT.KM.33)** coins C204. Ask: issues.0.mintage: 2014
- **TW 1 yuan (TW.KM.551)** coins C200. Ask: issues.0.mintage: 2008

### 8. HW-muse-arbitrate-20261014-1 · Arbiter · Settle 1 disagreements between two AIs · due 2026-10-21  (fix list #18)

Two contributors disagree; you are neither of them. Read both sources and find a third if you can. Send the field with the value your source supports (the record's, the other claim's, or a third value), with your exact source. Leave it out if the sources really disagree and say so in your note.

**Done when:** One change file; unsettled items left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-arbitrate-20261014-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **D0008 AU.KM.66 issues.0.mintage**: record `36454000` (None: «null») vs claim `58223000` (model:grok-bot: «DISAGREE: 36 454 000 is the 1966 FIFTY-cent figure (the writer's own source says 'Australia 50 Cents 1966'; coinsandaus…»)

### 9. HW-muse-plain-story-20261014-1 · Writer · Rewrite 21 stories in plain English · due 2026-10-21  (fix list #60)

Joseph's dad reads these. Each story below still uses shorthand (·, +, &, slashes, metal codes like CuNi or .720 Ag, or a bare list of design elements). Rewrite it as 2 to 4 plain sentences, keeping every fact exactly: change the wording, never the facts. Source: 'plain-English rewrite of the existing story; no facts changed'.

**Done when:** One change file; the stories pass the plain-English check.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-plain-story-20261014-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C001 · Switzerland · 1969 · 1 franc · CHF**: «A 1969 1 franc from Switzerland. Standing Helvetia on the obverse, value in wreath on the reverse, engraved by Antoine Bovy after designs by Albert Walch (obverse) and Friedrich Fisch (reverse). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C002 · Switzerland · 1963 · 5 rappen · CHF**: «A 1963 5 rappen from Switzerland. Libertas right on the obverse, 5 in grapevine wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C006 · Germany · 1984 · 1 Deutsche Mark · DEM**: «A 1984 1 Deutsche Mark from Germany. Bundesadler, value 1 between oak sprigs, DEUTSCHE MARK (Josef Bernhart). Struck in CuNi.» (shorthand: `CuNi`)
- **C008 · Switzerland · 1968 · 1/2 franc · CHF**: «A 1968 0.5 franc from Switzerland. Standing Helvetia on the obverse, value in wreath on the reverse, engraved by Antoine Bovy after designs by Albert Walch. Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C009 · Germany · 1987 · 5 Deutsche Mark · DEM**: «A 1987 5 Deutsche Mark from Germany. Bundesadler obverse, value and DEUTSCHE MARK reverse (circulation Magnimat, not Ag commemorative). Struck in CuNi clad nickel (Magnimat).» (shorthand: `CuNi`)
- **C012 · France · 1962 · 1 franc · FRF (nouveau franc)**: «A 1962 1 franc from France. The obverse shows La Semeuse left with REPUBLIQUE FRANÇAISE (Oscar Roty); the reverse shows 1 FRANC, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.» (shorthand: `the reverse shows 1 FRANC, olive sprig, `)
- **C015 · Switzerland · 1971 · 1/2 franc · CHF**: «A 1971 0.5 franc from Switzerland. Standing Helvetia on the obverse, value in wreath on the reverse, engraved by Antoine Bovy after designs by Albert Walch. Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C017 · France · 1999 · 1 franc · FRF (nouveau franc)**: «A 1999 1 franc from France. The obverse shows La Semeuse left with REPUBLIQUE FRANÇAISE (Oscar Roty); the reverse shows 1 FRANC, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.» (shorthand: `the reverse shows 1 FRANC, olive sprig, `)
- **C025 · France · 1965 · 1 franc · FRF (nouveau franc)**: «A 1965 1 franc from France. The obverse shows La Semeuse left with REPUBLIQUE FRANÇAISE (Oscar Roty); the reverse shows 1 FRANC, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.» (shorthand: `the reverse shows 1 FRANC, olive sprig, `)
- **C078 · Switzerland · 1969 · 20 rappen · CHF**: «A 1969 20 rappen from Switzerland. Libertas right on the obverse, 20 in wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C079 · Switzerland · 1991 · 20 rappen · CHF**: «A 1991 20 rappen from Switzerland. Libertas right on the obverse, 20 in wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C082 · Switzerland · 1979 · 10 rappen · CHF**: «A 1979 10 rappen from Switzerland. Libertas right on the obverse, 10 in wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C083 · Switzerland · 1981 · 10 rappen · CHF**: «A 1981 10 rappen from Switzerland. Libertas right on the obverse, 10 in wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C103 · Germany · 1982 · 1 Deutsche Mark · DEM**: «A 1982 1 Deutsche Mark from Germany. Bundesadler, value 1 between oak sprigs, DEUTSCHE MARK (Josef Bernhart). Struck in CuNi.» (shorthand: `CuNi`)
- **C147 · United Kingdom · 1992 · 10 pence · GBP**: «A 1992 10 pence from United Kingdom. The obverse shows Raphael Maklouf Elizabeth II; the reverse shows crowned lion passant; TEN PENCE (Ironside). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C148 · United Kingdom · 1992 · 10 pence · GBP**: «A 1992 10 pence from United Kingdom. The obverse shows Raphael Maklouf Elizabeth II; the reverse shows crowned lion passant; TEN PENCE (Ironside). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C149 · United Kingdom · 1992 · 10 pence · GBP**: «A 1992 10 pence from United Kingdom. The obverse shows Raphael Maklouf Elizabeth II; the reverse shows crowned lion passant; TEN PENCE (Ironside). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **C150 · United Kingdom · 1992 · 10 pence · GBP**: «A 1992 10 pence from United Kingdom. The obverse shows Raphael Maklouf Elizabeth II; the reverse shows crowned lion passant; TEN PENCE (Ironside). Struck in CuNi 75/25.» (shorthand: `CuNi`)
- **T003 · USA · ND · Ride token (Sandy the Pony · Meijer)**: «An undated Sandy the Pony · Meijer ride token token from USA. FREE PONY RIDE // MEIJER IS FOR KIDS, Sandy the Pony ride token. Struck in brass.» (shorthand: `·`)
- **T005 · USA · 2013 · Prop $1 (Series 2013 style)**: «A 2013 $1 prop from USA. Washington portrait, MOVIE PROP USE ONLY, MOTION PICTURE USE, NOT LEGAL TENDER, red COPY across Fed seal A (Boston), Rios and Lew, Series 2013 look.» (shorthand: `Washington portrait, MOVIE PROP USE ONLY`)
- **T006 · USA · 2009 · Prop $50 (Series 2009 style)**: «A 2009 $50 prop from USA. Grant portrait, MOTION PICTURE USE, MOVIE PROP UESE ONLY (misspelled UESE), COPY under serial, Rios and Geithner, Series 2009, Fed H8.» (shorthand: `Grant portrait, MOTION PICTURE USE, MOVI`)

### 10. HW-muse-story-check-20261014-1 · Fact-checker · Fact-check 3 coin stories · due 2026-10-21  (fix list #73)

Check each story against its own record (below) and the exact catalogue entry. If every claim holds, send the story back unchanged with source 'checked against <entry URL>: all claims hold'. If a claim is wrong, change only that sentence and say in source what was wrong and which entry shows it. You never get a story you wrote.

**Done when:** One change file covering every story you could check.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-story-check-20261014-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C075 · Switzerland · 1982 · 5 rappen · CHF**: «A 1982 5 rappen from Switzerland. Libertas right on the obverse, 5 in grapevine wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in aluminum-bronze (92% copper, 6% aluminum, 2% nickel).» Record: «{"country": "Switzerland", "year": "1982", "denom": "5 rappen · CHF", "mint": "B", "refs": "KM#26c · Schön#24c · Numista#171", "metal": "aluminum-bronze (Cu 92 / Al 6 / Ni 2) · 1.80 g · 17.15 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.25 mm · medal alignment · type specs shared with Al-bronze 5 Rp from 1981 (KM#26c)", "mintage": "75,340,000", "design": "Libertas right…»
- **C081 · Switzerland · 1983 · 5 rappen · CHF**: «A 1983 5 rappen from Switzerland. Libertas right on the obverse, 5 in grapevine wreath on the reverse, designers Karl Schwenzer (obverse) and Carl Friedrich Voigt (reverse). Struck in aluminum-bronze (92% copper, 6% aluminum, 2% nickel).» Record: «{"country": "Switzerland", "year": "1983", "denom": "5 rappen · CHF", "mint": "B", "refs": "KM#26c · Schön#24c · Numista#171", "metal": "aluminum-bronze (Cu 92 / Al 6 / Ni 2) · 1.80 g · 17.15 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.25 mm · medal alignment · type specs shared with Al-bronze 5 Rp (KM#26c)", "mintage": "92,746,000", "design": "Libertas right (obv) · 5…»
- **C104 · Netherlands · 1996 · 25 cents · NLG**: «A 1996 25 cents from Netherlands. The obverse shows Beatrix portrait; the reverse shows the value 25 ct and the date between vertical lines. Struck in nickel.» Record: «{"country": "Netherlands", "year": "1996", "denom": "25 cents · NLG", "mint": "Utrecht (caduceus / mintmaster marks — confirm on Beatrix side if shown)", "refs": "KM#204 · Schön#84 · Numista#731", "metal": "nickel · 3.00 g · 19 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness unknown · coin alignment · Beatrix kwartje type", "mintage": "24,840,000", "design": "obverse Beatri…»

### 11. HW-muse-verify-20261014-1 · Second reader · Check 50 facts another AI wrote · due 2026-10-21  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261014-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **catalog of C146 · Hong Kong · 1998 · $1 · HKD** (blind: look it up yourself in your own exact source; the first value is not shown) `type HK.KM.69a catalogs`
- **catalog of C120 · Ireland · 2013 · 5 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type IE.KM.34 catalogs`
- **mintage of C012 · France · 1962 · 1 franc · FRF (nouveau franc)** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.925.1 issues.1.mintage`
- **mintage of C025 · France · 1965 · 1 franc · FRF (nouveau franc)** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.925.1 issues.2.mintage`
- **mintage of C119 · France · 1977 · 1 franc · FRF (nouveau franc)** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.925.1 issues.3.mintage`
- **mintage of C017 · France · 1999 · 1 franc · FRF (nouveau franc)** (blind: look it up yourself in your own exact source; the first value is not shown) `type FR.KM.925.1 issues.4.mintage`
- **mintage of C069 · Jamaica · 1975 · 50 cents · JMD** (blind: look it up yourself in your own exact source; the first value is not shown) `type JM.KM.65 issues.0.mintage`
- **mintage of C244 · Mexico · 1964 · 20 centavos · MXN** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.440 issues.0.mintage`
- **mintage of C257 · Mexico · 1967 · 20 centavos · MXN** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.440 issues.1.mintage`
- **composition of C012 · France · 1962 · 1 franc · FRF (nouveau franc)** `type FR.KM.925.1 composition.text` = `nickel` (written by Grok: «https://en.numista.com/catalogue/pieces6.html (Numista N#6, 1 Franc (Signature "O. Roty") - France): Composition Nickel; matches the record»)
- **composition of C146 · Hong Kong · 1998 · $1 · HKD** `type HK.KM.69a composition.text` = `cupronickel` (written by Grok: «https://en.numista.com/catalogue/pieces2118.html (Numista N#2118, 1 Dollar - Hong Kong): Composition Copper-nickel; matches the record (re-c»)
- **composition of C069 · Jamaica · 1975 · 50 cents · JMD** `type JM.KM.65 composition.text` = `cupronickel` (written by Grok: «https://en.numista.com/catalogue/pieces7457.html (Numista N#7457, 50 Cents (Wide legend) - Jamaica): Composition Copper-nickel (75% Copper,»)
- **mintage of C163 · Philippines · 1984 · 50 sentimo · PHP** (blind: look it up yourself in your own exact source; the first value is not shown) `type PH.KM.242.1 issues.0.mintage`
- **composition of C202 · Guatemala · 2010 · 10 centavos · GTQ** `type GT.KM.277.1 composition.text` = `stainless steel` (written by Grok: «Numista N#42670 (https://en.numista.com/catalogue/pieces42670.html): composition stainless steel -> metal_class steel»)
- **series of C163 · Philippines · 1984 · 50 sentimo · PHP** `type PH.KM.242.1 series` = `["Flora and Fauna"]` (written by Grok: «https://www.numismatics.ph/coins/flora-and-fauna-series/50-sentimo.html (numismatics.ph): page '50 Sentimo Flora and Fauna Series Coins (198»)
- **mintage of C145 · Chile · 1996 · 50 pesos · CLP** (blind: look it up yourself in your own exact source; the first value is not shown) `type CL.KM.219.2 issues.0.mintage`
- **composition of C145 · Chile · 1996 · 50 pesos · CLP** `type CL.KM.219.2 composition.text` = `aluminum-nickel bronze` (written by Grok: «https://en.numista.com/catalogue/pieces2834.html (Numista N#2834, 50 Pesos - Chile): Composition Aluminium-nickel bronze (92% Copper, 6% Nic»)
- **composition of C164 · United Kingdom · 1932 · ½ penny · GBP** `type GB.KM.837 composition.text` = `copper plated steel` (written by Grok: «https://en.numista.com/catalogue/pieces4004.html (Numista N#4004, ½ Penny - George V (smaller portrait) - United Kingdom): Composition Bronz»)
- **ruler of C164 · United Kingdom · 1932 · ½ penny · GBP** `type GB.KM.837 ruler` = `George V` (written by Grok: «https://en.wikipedia.org/wiki/George_V (Wikipedia infobox) 'Reign' = 6 May 1910 – 20 January 1936; the type's issue year(s) 1932 fall inside»)
- **catalog of C161 · Mexico · 1945 · 10 centavos · MXN** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.433 catalogs`
- **composition of C161 · Mexico · 1945 · 10 centavos · MXN** `type MX.KM.433 composition.text` = `copper-nickel (80% copper, 20% nickel)` (written by Grok: «Numista N#6694 (https://en.numista.com/catalogue/pieces6694.html): composition copper-nickel (80% copper, 20% nickel) -> metal_class cuproni»)
- **catalog of C185 · Cayman Islands · 1996 · 5 cents · KYD** (blind: look it up yourself in your own exact source; the first value is not shown) `type KY.KM.88a catalogs`
- **composition of C185 · Cayman Islands · 1996 · 5 cents · KYD** `type KY.KM.88a composition.text` = `nickel-plated steel (magnetic)` (written by Grok: «https://en.numista.com/catalogue/pieces10222.html (Numista N#10222, 5 Cents - Elizabeth II (3rd portrait; magnetic) - Cayman Islands): Compo»)
- **ruler of C185 · Cayman Islands · 1996 · 5 cents · KYD** `type KY.KM.88a ruler` = `Elizabeth II` (written by Grok: «https://en.wikipedia.org/wiki/Elizabeth_II (Wikipedia infobox) 'Reign' = 6 February 1952 – 8 September 2022; the type's issue year(s) 1996 f»)
- **catalog of C016 · Costa Rica · 1985 · 5 colones · CRC** (blind: look it up yourself in your own exact source; the first value is not shown) `type CR.KM.214.2 catalogs`
- **catalog of C211 · Italy · 1987 · 500 lire · ITL** (blind: look it up yourself in your own exact source; the first value is not shown) `type IT.KM.111 catalogs`
- **mintage of C016 · Costa Rica · 1985 · 5 colones · CRC** (blind: look it up yourself in your own exact source; the first value is not shown) `type CR.KM.214.2 issues.0.mintage`
- **composition of C016 · Costa Rica · 1985 · 5 colones · CRC** `type CR.KM.214.2 composition.text` = `stainless steel` (written by Grok: «https://en.numista.com/catalogue/pieces69.html (Numista N#69, 5 Colones - Costa Rica): Composition Stainless steel; matches the record (re-c»)
- **composition of C211 · Italy · 1987 · 500 lire · ITL** `type IT.KM.111 composition.text` = `bimetallic (bronzesital center / acmonital ring)` (written by Grok: «https://en.numista.com/catalogue/pieces302.html (Numista N#302, 500 Lire - Italy): Composition Bimetallic: bronzital centre in acmonital rin»)
- **catalog of C205 · United Kingdom · 1982 · 20 pence · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.931 catalogs`
- **catalog of C166 · Mexico · 1944 · 5 centavos · MXN** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.424 catalogs`
- **catalog of C209 · Mexico · 1987 · 5 pesos · MXP (pre-nuevo)** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.502 catalogs`
- **mintage of C166 · Mexico · 1944 · 5 centavos · MXN** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.424 issues.0.mintage`
- **ruler of C205 · United Kingdom · 1982 · 20 pence · GBP** `type GB.KM.931 ruler` = `Elizabeth II` (written by Grok: «https://en.wikipedia.org/wiki/Elizabeth_II (Wikipedia infobox) 'Reign' = 6 February 1952 – 8 September 2022; the type's issue year(s) 1982 f»)
- **catalog of C057 · Germany · 1982 · 50 Pfennig · DEM** (blind: look it up yourself in your own exact source; the first value is not shown) `type DE.KM.109.2 catalogs`
- **catalog of C068 · Switzerland · 1963 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a catalogs`
- **mintage of C256 · Switzerland · 1959 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a issues.0.mintage`
- **mintage of C068 · Switzerland · 1963 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a issues.1.mintage`
- **mintage of C078 · Switzerland · 1969 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a issues.2.mintage`
- **mintage of C278 · Switzerland · 1980 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a issues.3.mintage`
- **mintage of C076 · Switzerland · 1989 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a issues.4.mintage`
- **mintage of C079 · Switzerland · 1991 · 20 rappen · CHF** (blind: look it up yourself in your own exact source; the first value is not shown) `type CH.KM.29a issues.5.mintage`
- **catalog of C032 · Hungary · 1967 · 1 forint · HUF** (blind: look it up yourself in your own exact source; the first value is not shown) `type HU.KM.575 catalogs`
- **mintage of C032 · Hungary · 1967 · 1 forint · HUF** (blind: look it up yourself in your own exact source; the first value is not shown) `type HU.KM.575 issues.0.mintage`
- **composition of C032 · Hungary · 1967 · 1 forint · HUF** `type HU.KM.575 composition.text` = `aluminum (Al 97 / Mg 3)` (written by Grok: «https://en.numista.com/catalogue/pieces1124.html (Numista N#1124, 1 Forint - Hungary): Composition Aluminium (Aluminium 97%, Magnesium 3%);»)
- **catalog of C233 · Colombia · 2016 · 50 pesos · COP** (blind: look it up yourself in your own exact source; the first value is not shown) `type CO.KM.295 catalogs`
- **catalog of C152 · United Kingdom · 2001 · 10 pence · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.989 catalogs`
- **catalog of C247 · South Korea · 1966 · 1 won · KRW** (blind: look it up yourself in your own exact source; the first value is not shown) `type KR.KM.4 catalogs`
- **mintage of C233 · Colombia · 2016 · 50 pesos · COP** (blind: look it up yourself in your own exact source; the first value is not shown) `type CO.KM.295 issues.0.mintage`
- **mintage of C152 · United Kingdom · 2001 · 10 pence · GBP** (blind: look it up yourself in your own exact source; the first value is not shown) `type GB.KM.989 issues.0.mintage`

### 12. HW-muse-cite-20261014-2 · Cataloguer · Cite the catalogue facts of 2 coin types · due 2026-10-21  (fix list #72)

For each coin type below, open its Numista entry (or find it) and send the facts listed under `ask`, each as its own line with the exact entry URL and the table row you read in `source`. Where the record is already right, send the same value back with your source (a re-citation is how a guess becomes Reference). Leave a line out when the entry does not give that fact; leave a whole type out when there is no entry (say why in one line of your note).

**Done when:** One change file answering this assignment; everything you left out goes back to the pool.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-cite-20261014-2.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **GB 1 penny (GB.X.1-penny)** coins C302. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; composition.text + composition.metal_class; issues.0.mintage: 1922
- **MX 20 pesos (MX.X.20-pesos)** coins C304. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; composition.text + composition.metal_class; issues.0.mintage: 1981

## Projects (after the homework)

### Cost to complete the albums: price the missing coins in A017 to A033  [NEXT]  (fix list #62)

Joseph's dad asks which coins are missing; the next question is what they cost. Open https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/data/wants.json: every album volume lists `missing_named` (the exact year and mint of each empty hole). For the volumes A017 to A033, find a retail price for each missing coin in a typical collectable grade (say which grade you assumed), from a named price page (PCGS CoinFacts, NGC Price Guide, Numista's value table, or a dealer's listed price for that exact date and mint). Never guess: leave a coin out when no page covers it. Silver coins are never below melt (spot in https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/data/prices.json). Save one file wants_values_muse_{YYYYMMDD-HHMM}.json in Drive 'reviews-incoming (AI deep reviews)': a list of {"album": "A001", "label": "1941-D", "value_usd": 1.25, "grade": "VF", "source": "exact page URL", "confidence": "med|low"}, plus a total per album.

**Done when:** One JSON file covering every missing coin in A017 to A033 you could price; Claude checks a sample of the prices and adds a 'cost to complete' line to What's missing.

### Dad's one-page guide  [NEXT]  (fix list #60)

Write a one-page plain-English guide for Joseph's dad to the Simple view (Do I have...?, What's missing?, At a glance, Questions): big words, short sentences, what to tap. Read the live app at https://jpavia10.github.io/titan-reliquary-preview/#simple first. Save it as guide_muse_{YYYYMMDD-HHMM}.md in Drive 'reviews-incoming (AI deep reviews)'.

**Done when:** One file with the guide text.

### Read new coin photos (with Grok, blind)  [ALWAYS]  (fix list #55)

Whenever NOID photos appear in STAGING: Phase 1 change file per AI_START_HERE, without looking at Grok's read first (AI_START_HERE 2b).

**Done when:** Ongoing.

## Your recent files (what happened to each file you sent)

- 2026-10-14 15:41 UTC `changes_muse_20261011-2205.jsonl`: merged (3 event(s) merged)
- 2026-10-14 15:41 UTC `changes_muse_20261010-1714.jsonl`: rejected: the note changes_muse_20261010-1714.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: stale edit: type US.KM.204 catalogs is now [{"number":"204","system":"KM"},{"number":"205","system":"Schön"},{"number":"56", the contribution expected [{"number":"204","system":"KM"}] (re-read the record and resubmit))
- 2026-10-14 15:41 UTC `changes_muse_20261010-1713.jsonl`: rejected: the note changes_muse_20261010-1713.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: stale edit: specimen C028 research.open_questions is now ["The Schön number 128 may be a copy of the old, wrong KM number (KM was 128, no, the contribution expected ["Type catalogued KM#128 for Malta 5 euro cent, but Numista and Colnect list the (re-read the record and resubmit))
- 2026-10-14 15:41 UTC `changes_muse_20261010-1015.jsonl`: merged (15 event(s) merged)
- 2026-10-14 15:41 UTC `changes_muse_20261010-0010.jsonl`: merged (4 event(s) merged)

## Your numbers (measured, not self-reported)

- Assignments answered: 2; expired: 0.
- Your facts checked by another contributor: 130 (126 confirmed, 4 wrong; error rate 3.1 %, 95 % range 1-8 %). Checks you did for others: 0. Open disagreements you are part of: 0.
- Share of your new facts that get checked first: 100 %.
