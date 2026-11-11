<!-- doc-status: current; normative: yes (for Muse) -->
# WORK QUEUE for Muse (updated 2026-11-11 01:56 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** active. Researcher and writer, loaded up (owner, 2026-10-23: "Load up muse"; 2026-10-10: "I think muse wants to step up so maybe see what they got in them"): capacity 40, up to 8 batches per kind, every kind incl. catalogue numbers and the new 'fill' sheets (blank specs, designers, obverse/reverse text on the types we hold). Harder work first (research questions, catalogue citations, collector values). Off probation 2026-10-24: 4 files in a row scored 10 with no accuracy fault (changes_muse_20261024-0509 to -0552; RESEARCH_LOOP.md section 9); its facts are now checked at the measured-error rate.
**How you get this:** Drive doc 'WORK QUEUE for Muse' in Titan Reliquary/ (docs/agents/QUEUE_muse.md). Drops change files in Drive collection-incoming (AI change files).

## Finish first

### FIRST: photo rooms for the themes that have none (the third spaces)  (fix list #128)

Joseph, 2026-11-08: every theme's third space is a super high quality photograph made by you, and the app layers live depth, light, particles and sound over it (no 3D worlds drawn in code). The request is 'artreq_20261108-1500_room-layers-all.json' in Drive 'Titan Reliquary/art-requests (any AI: images + video)/': 41 rooms, then the first nine remade larger. For each room: one wide 16:9 photo at the largest size your tool offers (4K or 2K if you can choose), then four edits FROM THAT SAME IMAGE (depth map, light mask, the foreground object on flat green, the photo with that object removed), so all five files line up. Start from the BOTTOM of the priority-1 list and work upward (Grok does the same; skip any room already claimed); Gemini works down from the top. Claim a room before you start it (a CLAIMED file per room, as the request says) and skip rooms someone else has claimed.

**Done when:** Five PNG files per room in 'Titan Reliquary/art-incoming (AI images + video)/artreq_20261108-1500_room-layers-all/' with the exact names, and one line per file in 'artreq_20261108-1500_room-layers-all.DONE-{you}.txt' (ok or skipped: reason, size in pixels, model, date). Claude reviews every set; weak ones are asked for again.

### Sound hunt: music and room sounds for your 17 themes (22 pieces of music, 85 field recordings)  (fix list #83)

Every theme is getting its own room (a second space to be in the theme away from the collection) with its own soundscape, and more of its own recorded music. Your 17 themes are under agents.muse in https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/projects/sound_hunt_20261029.json: for each, its mood, the music it already plays (music_have: never send those), how many more pieces it needs (music_needed) and the five sounds its room needs (field_needed: bed-1, bed-2 = long steady sounds; detail-1..3 = short events). Rules and the exact file shape: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/SOUND_HUNT.md (real recordings only: a microphone in a real place, or named people playing real instruments; a licence stated on the file's own page, quoted word for word: public domain, CC0, CC BY or CC BY-SA; Wikimedia Commons first, then NASA, NOAA, the US National Park Service sound gallery, the US military bands, Musopen, archive.org; never MIDI, synthesizer, virtual instrument, AI audio, Pixabay, Freesound, YouTube or BBC Sound Effects). Save sound_muse_{YYYYMMDD-HHMM}.json in Drive 'Titan Reliquary/sound-incoming (AI music + field recording finds)/'; save again every 10 finds under the same name; list every slot you could not fill in not_found with what you searched. Do it after your open sheets, before the album-price project.

**Done when:** Every theme on your list has its music and its five room sounds, or a not_found line saying what you searched. Claude opens every page, checks the licence, runs the good ones through the intake and they become that theme's music and room sound.

### Cite your own era fields: 263 'period' facts on 138 types are still 'AI guess'  (fix list #48)

Your round-3 file (2026-10-03) wrote `period`, `ruler` and `series` for 193 types with one general source, so every era in the app still says 'AI guess'. Re-cite them type by type: open the type's Numista entry (the record's `catalogs` has the N# for most), read its 'Period' (and 'Ruler' where it has one) line, and send `type {id} period` (and `ruler`) with the exact entry URL in source. Same value with a source = a re-citation (it becomes Reference, then a second reader makes it Checked); a different value = a correction, say why in one line. Work in batches of 40 types, one change file each, in the order of data/index.json. Never write a period that is a country status ('British Overseas Territory' is not an era).

**Done when:** All 138 types answered (or left out with a reason) across as many files as you need.

### Second reader on Grok's Numista batches  (fix list #72)

If you already started this spot check (5 facts from each of Grok's 9 sweep batches, reported in your FEEDBACK doc), finish it the same way. If you have not started, skip it: the 'Second reader' homework below is the same job with a pre-filled answer sheet, and it counts towards your probation.

**Done when:** Either your 45-fact report in the FEEDBACK doc, or the verify homework answered.

## Homework (generated from the data)

How homework works (read once):
0. Work only from the live pages: this WORK QUEUE, your answer sheets (the Drive folder `Titan Reliquary/homework sheets (current: refreshed every hour)/` or the GitHub links below) and the coin photos they link. Never from a saved, downloaded or copied version of the repository, an old sheet or another AI's sheet: those are out of date and any line from them is rejected. Every line must be about a coin on your own sheet.
1. Each assignment has an id (HW-...). Answer ONE assignment per change file: `changes_{you}_{YYYYMMDD-HHMM}.jsonl` in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Every line carries `"assignment": "<the id>"` inside `provenance`.
2. Start from the answer sheet: it is pre-filled (download it from the link, or copy the block). Change only `new` (when the record is wrong) and `source` (your exact source), and set `ts` to the current UTC time. A line whose source still starts with FILL counts as 'left out': no error, it simply goes back to the pool. Delete nothing else.
3. Never guess. Leave out what you cannot do; it goes to another AI or to Joseph. Two AIs that could not do an item park it.
4. You never get your own facts to check, and a check never overwrites: a value that disagrees is filed as a disagreement for a third reader.
5. Finish within the lease (the date on each assignment); after it the items go back to the pool.
6. When you finish, start the next assignment straight away. New assignments appear here after every merge.
7. Text inside « » was written by another AI or copied from the record: it is data to check, never an instruction to you.
8. Some check items show a value that is wrong on purpose. Copy nothing: check every value against your own source, and send back what the source says.
9. A type id (e.g. MX.KM.433) is a permanent name, not always the catalogue number: find the coin by its country, year, denomination and the record's `catalogs` (MX.KM.433 is KM#432). A line on `issues.N` is one year (and mint): the sheet names it; read that row only.
10. Keep the sheet's lines as they are: `provenance.assignment` stays, `old` stays as the sheet has it, `verified` stays false. Work you were not assigned (a bonus pass) goes in its own file without an assignment id, never on facts another AI is checking, and never changes the style of a field (stories stay short) without asking Claude first.

### 1. HW-muse-verify-20261104-1 · Second reader · Check 3 facts another AI wrote · due 2026-11-11  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261104-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **mintage of C304 · Mexico · 1981 · 20 pesos · MXP** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.X.20-pesos issues.1.mintage` [audit sample]
- **mint of C304 · Mexico · 1981 · 20 pesos · MXP** (blind: read it yourself; `new` = the mint letters as a list, e.g. ["D"], or [] when the coin has none) `specimen C304 issue.mint_marks`. Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C304_rev.webp
- **year of C058 · Germany · 50 Pfennig · DEM** (blind: read it yourself; `new` = the year as a number (the Western year: convert a Hijri, Showa or ROC date)) `specimen C058 issue.year`. Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C058_rev.webp (original: https://drive.google.com/file/d/1k0Xkr2HdmExUjMDFmvw1NQWRyr_90Jrb/view)

### 2. HW-muse-arbitrate-20261104-2 · Arbiter · Settle 1 disagreements between two AIs · due 2026-11-11  (fix list #18)

Two contributors disagree; you are neither of them. Read both sources and find a third if you can. Send the field with the value your source supports (the record's, the other claim's, or a third value), with your exact source. Leave it out if the sources really disagree and say so in your note.

**Done when:** One change file; unsettled items left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-arbitrate-20261104-2.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **D0152 C031 issue.mint_marks**: record `["S"]` (model:grok-bot: «https://en.numista.com/catalogue/pieces2980.html issues table row '1943 S — 8,000,000' (also rows 1943 no mark 24,912,0…») vs claim `[]` (model:gemini-api:gemini-3.6-flash: «C031_obv.webp: no mint mark seen on reverse of C031_rev.webp (read by the Gemini API, gemini-3.6-flash)»)

### 3. HW-muse-fill-20261104-1 · Cataloguer · Fill the blank facts of 12 coin types · due 2026-11-14  (fix list #72)

Each coin type below has Phase 2 facts that are still blank (listed per type). Open the Numista entry for the coin we hold (the sheet names the coin and its year: check the year is in the entry's range) and fill each blank line the entry states: edge, thickness, alignment, legal tender, era (period / ruler), designers with their side, and a short description of each side. One line per fact with the exact entry URL in `source`; leave a line as FILL when the entry does not give it. Never copy from a neighbouring type or from `design.text`.

**Done when:** One change file answering this assignment; the lines you left as FILL go back to the pool.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-fill-20261104-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C331 · Australia · 1966 · 10 cents · AUD (AU.X.10-cents.2)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces1282.html
- **C326 · Bahamas · 1974 · 1 cent · BSD (BS.X.1-cent.2)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces3159.html
- **C312 · Czech Republic · 2008 · 5 korun · CZK (CZ.X.5-korun)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces2149.html
- **C334 · Spain · 1989 · 5 pesetas · ESP (ES.X.5-pesetas)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces1262.html
- **C310 · France · 1979 · 2 francs · FRF (FR.X.2-francs)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces7.html
- **C329 · United Kingdom · 1962 · 1 shilling · GBP (GB.X.1-shilling)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces882.html
- **C316 · United Kingdom · 2014 · 20 pence · GBP (GB.X.20-pence)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces5628.html
- **C309 · United Kingdom · 1937 · ½ penny · GBP (GB.X.half-penny)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces870.html
- **C330 · Ireland · 1995 · 10 pence · IEP (IE.X.10-pence)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces1457.html
- **C319 · Mexico · 1994 · 2 nuevos pesos · MXN (MX.X.2-nuevos-pesos)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces586.html
- **C324 · Mexico · 2005 · 5 pesos · MXN (MX.X.5-pesos)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces589.html
- **C333 · Norway · 1977 · 50 øre · NOK (NO.X.50-ore)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces1439.html

### 4. HW-muse-fill-20261104-2 · Cataloguer · Fill the blank facts of 4 coin types · due 2026-11-14  (fix list #72)

Each coin type below has Phase 2 facts that are still blank (listed per type). Open the Numista entry for the coin we hold (the sheet names the coin and its year: check the year is in the entry's range) and fill each blank line the entry states: edge, thickness, alignment, legal tender, era (period / ruler), designers with their side, and a short description of each side. One line per fact with the exact entry URL in `source`; leave a line as FILL when the entry does not give it. Never copy from a neighbouring type or from `design.text`.

**Done when:** One change file answering this assignment; the lines you left as FILL go back to the pool.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-fill-20261104-2.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C322 · Portugal · 1970 · 20 centavos · PTE (PT.X.20-centavos)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces3282.html
- **C313 · Russia · 1992 · 20 roubles · RUR (RU.X.20-roubles)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces4077.html
- **C320 · Sweden · 1991 · 1 krona · SEK (SE.X.1-krona)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces6862.html
- **C305 · Vatican City · 1958 · 20 lire · VAL (VA.X.20-lire)**: blank: edge, thickness, alignment, legal tender, era, designers, obverse, reverse. Entry on record: https://en.numista.com/catalogue/pieces33337.html

### 5. HW-muse-read-mint-20261105-1 · Photo reader · Read the mint mark on 3 coins from their photos · due 2026-11-12  (fix list #57)

Phase 1 cannot finish until every coin's mint mark is read. Open each coin's photo (GitHub link or Drive original), find the mint mark where this country puts it, and send `issue.mint_marks` (e.g. ["D"]) and `issue.mint_text` (e.g. "D (Denver), left of the date", or "no mint mark (Philadelphia)") with the photo file name in `source`. If the side with the mark is not in the photo, or you cannot read it at full zoom, leave the coin out: it goes on Joseph's shoot list. Never guess.

**Done when:** One change file; unreadable coins left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-read-mint-20261105-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C006 · Germany · 1984 · 1 Deutsche Mark · DEM**: mint text now «unknown». Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C006_rev.webp (original: https://drive.google.com/file/d/1WBYI3D2tv7ia4-2_WlLns9pgPiSY-Kv5/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C050 · Germany · 1982 · 1 Deutsche Mark · DEM**: mint text now «unknown (letter under date unclear (soft D/G candidate))». Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C050_rev.webp (original: https://drive.google.com/file/d/1ff5n-Id6IAio-qlK4m0EkqBdwhpI1SW-/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C287 · Italy · 1979 · 50 lire · ITL**: mint text now «not read on photo». Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C287_rev.webp (original: https://drive.google.com/file/d/1vaYvyOGkgvnFf9KltOw6-IkKGqZG-3hr/view). Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none.

### 6. HW-muse-verify-20261105-5 · Second reader · Check 2 facts another AI wrote · due 2026-11-12  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261105-5.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **design of C023 · Austria · 1918 · 20 heller** `type AT.KM.2826 design.text` = `obverse crowned double-headed eagle with the Austrian shield on its breast · reverse larg…` (written by Claude: «Correction (Claude, 2026-10-24): the lettering named one coin's year (the coin held or the one in the cited entry's photo), but this text co») [audit sample]
- **design of C001 · Switzerland · 1969 · 1 franc · CHF** `type CH.KM.24a.1 design.text` = `standing Helvetia facing left, spear in right hand, Swiss shield in left, 22 stars (23 fr…` (written by Claude: «Correction (Claude, 2026-10-24) of Muse's fill text from the Numista entry it cites (changes_muse_20261024-0550..0601): the entry's letterin») [audit sample]

### 7. HW-muse-arbitrate-20261106-1 · Arbiter · Settle 1 disagreements between two AIs · due 2026-11-13  (fix list #18)

Two contributors disagree; you are neither of them. Read both sources and find a third if you can. Send the field with the value your source supports (the record's, the other claim's, or a third value), with your exact source. Leave it out if the sources really disagree and say so in your note.

**Done when:** One change file; unsettled items left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-arbitrate-20261106-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **D0154 CR.KM.214.2 catalogs**: record `[{"number": "214.2", "system": "KM"}, {"number": "78a", "system": "Schön"}, {"number": "6…` (model:grok-bot: «Numista N#69 (https://en.numista.com/catalogue/pieces69.html) references: KM# 214, Schön# 78, 78a; the entry covers KM#…») vs claim `[{"number": "214.2", "system": "KM"}, {"number": "78", "system": "Schön"}, {"number": "69…` (model:gemini: «https://en.numista.com/catalogue/pieces69.html — 'References: KM# 214.2, Schön# 78'»)

### 8. HW-muse-verify-20261107-1 · Second reader · Check 1 facts another AI wrote · due 2026-11-14  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261107-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **mint of C298 · Italy · 1978 · 50 lire · ITL** (blind: read it yourself; `new` = the mint letters as a list, e.g. ["D"], or [] when the coin has none) `specimen C298 issue.mint_marks`. Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C298_rev.webp

### 9. HW-muse-verify-20261108-1 · Second reader · Check 8 facts another AI wrote · due 2026-11-15  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261108-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **series of C073 · USA · 1976 · 25 cents · USD · Bicentennial (1776–1976)** `type US.KM.204 series` = `["Bicentennial coinage"]` (written by Grok: «https://www.usmint.gov/learn/history/historical-documents/bicentennial-circulating-coins-arrive (U.S. Mint press release 1 July 1975): the q») [audit sample]
- **composition of C073 · USA · 1976 · 25 cents · USD · Bicentennial (1776–1976)** `type US.KM.204 composition.text` = `Cu-Ni clad (copper core visible on reeded edges)` (written by Grok: «https://en.numista.com/catalogue/pieces56.html (Numista N#56, ¼ Dollar "Washington Quarter" (Bicentennial) - United States): Composition Cop»)
- **composition of C258 · Vietnam (State of Vietnam) · 1953 · 20 su · VND (State of Vietnam đồng)** `type VN-SOV.KM.1 composition.text` = `aluminum` (written by Grok: «https://en.numista.com/catalogue/pieces5904.html (Numista N#5904, 20 Su - Bảo Đại - South Vietnam): Composition Aluminium; matches the recor»)
- **composition of C049 · France · 1989 · 10 francs · FRF** `type FR.KM.964.1 composition.text` = `bimetallic (Ni center / Al-bronze ring)` (written by Grok: «https://en.numista.com/catalogue/pieces9.html (Numista N#9, 10 Francs (Génie de la Liberté) - France): Composition Bimetallic: nickel center»)
- **catalog of C259 · Mexico · 1940 · 1 centavo · MXP** (blind: look it up yourself in your own exact source; the first value is not shown) `type MX.KM.415 catalogs`
- **catalog of C200 · Taiwan (ROC) · 2008 · 1 yuan · TWD** (blind: look it up yourself in your own exact source; the first value is not shown) `type TW.KM.551 catalogs`
- **catalog of C043 · Malta · 2008 · 10 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type MT.KM.129 catalogs`
- **catalog of C028 · Malta · 2013 · 5 euro cent · EUR** (blind: look it up yourself in your own exact source; the first value is not shown) `type MT.KM.128 catalogs`

### 10. HW-muse-arbitrate-20261108-1 · Arbiter · Settle 7 disagreements between two AIs · due 2026-11-15  (fix list #18)

Two contributors disagree; you are neither of them. Read both sources and find a third if you can. Send the field with the value your source supports (the record's, the other claim's, or a third value), with your exact source. Leave it out if the sources really disagree and say so in your note.

**Done when:** One change file; unsettled items left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-arbitrate-20261108-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **D0142 C048 issue.mint_marks**: record `["D"]` (None: «null») vs claim `["J"]` (model:gemini-api:gemini-3.6-flash: «C048_rev.webp: mint mark 'J' at the top center above the digit 1 on C048_rev.webp (read by the Gemini API, gemini-3.6-f…»)
- **D0143 C196 issue.mint_marks**: record `["F"]` (None: «null») vs claim `["G"]` (model:gemini-api:gemini-3.6-flash: «C196_obv.webp: mint mark letter G to the right of the date 1987 on C196_obv.webp (read by the Gemini API, gemini-3.6-fl…»)
- **D0144 C177 issue.year**: record `2009` (model:grok-bot: «C177_obv.webp: date at bottom of legend reads '2009' (inverted orientation in photo) [phase 2; confidence high]») vs claim `2005` (model:gemini-api:gemini-3.6-flash: «C177_obv.webp: year 2005 visible at the bottom of the obverse in C177_obv.webp (read by the Gemini API, gemini-3.6-flas…»)
- **D0145 C228 issue.mint_marks**: record `["G"]` (None: «null») vs claim `["J"]` (model:gemini-api:gemini-3.6-flash: «C228_obv.webp: mint mark 'J' after the year 1989 at the bottom of C228_obv.webp (read by the Gemini API, gemini-3.6-fla…»)
- **D0146 C237 issue.mint_marks**: record `["D"]` (None: «null») vs claim `["G"]` (model:gemini-api:gemini-3.6-flash: «C237_obv.webp: mint mark letter G after 1971 on C237_obv.webp (read by the Gemini API, gemini-3.6-flash)»)
- **D0147 C018 issue.mint_marks**: record `["G"]` (None: «null») vs claim `["D"]` (model:gemini-api:gemini-3.6-flash: «C018_obv.webp: mint mark 'D' at the bottom right of the obverse in C018_obv.webp (read by the Gemini API, gemini-3.6-fl…»)
- **D0148 C225 issue.year**: record `1977` (model:grok-bot: «C225_obv.webp: date '1977' at bottom between dots (faint, zoom crop) [phase 2; confidence high]») vs claim `1971` (model:gemini-api:gemini-3.6-flash: «C225_obv.webp: year 1971 shown at the bottom of C225_obv.webp (read by the Gemini API, gemini-3.6-flash)»)

## Projects (after the homework)

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

- Assignments answered: 60; expired: 10.
- Your facts checked by another contributor: 815 (798 confirmed, 17 wrong; error rate 2.1 %, 95 % range 1-3 %). Checks you did for others: 390. Open disagreements you are part of: 7. Values planted wrong on purpose in your checks: you caught 8 of 8.
- Share of your new facts that get checked first: 15 %.
