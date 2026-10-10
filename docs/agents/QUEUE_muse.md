<!-- doc-status: current; normative: yes (for Muse) -->
# WORK QUEUE for Muse (updated 2026-10-10 16:39 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** active (probation: every fact you write is checked by another AI until 3 submissions in a row score 8+). Good researcher and writer (scores 8, then 6; probation streak 0 of 3): second reader for Grok's catalogue facts, plain-English stories for Joseph's dad.
**How you get this:** Drive doc 'WORK QUEUE for Muse' in Titan Reliquary/ (docs/agents/QUEUE_muse.md). Drops change files in Drive collection-incoming (AI change files).

## Finish first

### Re-cite your 26 vague sources  (fix list #48)

Your first file (changes_muse_20261008-2302.jsonl) bounced on two schema faults; read changes_muse_20261008-2302.jsonl.REJECTED.txt in the drop folder. Resend the 18 lines that match the record with an exact catalogue entry (Numista N# + URL, or the NGC page URL) in source, provenance.inputs as {"file": url}, no ts inside provenance. Leave out the 7 lines the note lists.

**Done when:** One file that merges as sent; the 18 facts move from 'AI guess' to 'Reference'.

### Second reader on Grok's Numista batches  (fix list #72)

If you already started this spot check (5 facts from each of Grok's 9 sweep batches, reported in your FEEDBACK doc), finish it the same way. If you have not started, skip it: the 'Second reader' homework below is the same job with a pre-filled answer sheet, and it counts towards your probation.

**Done when:** Either your 45-fact report in the FEEDBACK doc, or the verify homework answered.

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

### 1. HW-muse-verify-20261009-1 · Second reader · Check 22 facts another AI wrote · due 2026-10-16  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-verify-20261009-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **catalog of C073 · USA · 1976 · 25 cents · USD · Bicentennial (1776–1976)** `type US.KM.204 catalogs` = `[{"number": "204", "system": "KM"}, {"number": "205", "system": "Schön"}, {"number": "56"…` (written by Grok: Numista N#56 (https://en.numista.com/catalogue/pieces56.html) references: KM# 204, Schön# 205)
- **catalog of C065 · Switzerland · 2014 · 5 francs · CHF** `type CH.KM.40a.4 catalogs` = `[{"number": "40a.4", "system": "KM"}, {"number": "36a", "system": "Schön"}, {"number": "1…` (written by Grok: Numista N#195 (https://en.numista.com/catalogue/pieces195.html) references: KM# 40a.4, Schön# 36a; the entry covers KM# 40a; its 1994-2018 r) [audit sample]
- **mintage of C066 · Switzerland · 1978 · 5 francs · CHF** `type CH.KM.40a.1 issues.0.mintage` = `4411000` (written by Grok: Numista N#195 (https://en.numista.com/catalogue/pieces195.html): mintage table row '1978' = 4 411 000 (re-cite; matches the record); circula)
- **mintage of C088 · USA · 1957 · 10¢ Roosevelt** `type US.KM.195 issues.0.mintage` = `275200000` (written by Grok: Numista N#52 (https://en.numista.com/catalogue/pieces52.html): mintage table row '1957 (161 400 000) + 1957 D (113 800 000)' = 275 200 000; )
- **catalog of C082 · Switzerland · 1979 · 10 rappen · CHF** `type CH.KM.27 catalogs` = `[{"number": "27", "system": "KM"}, {"number": "25", "system": "Schön"}, {"number": "24", …` (written by Grok: Numista N#173 (https://en.numista.com/catalogue/pieces173.html) references: KM# 27, Schön# 25, Y# 24)
- **mintage of C003 · Switzerland · 1968 · 2 francs · CHF** `type CH.KM.21a issues.0.mintage` = `31588000` (written by Grok: Numista N#189 (https://en.numista.com/catalogue/pieces189.html): mintage table row '1968 B' = 31 588 000 (re-cite; matches the record); the ) [audit sample]
- **mintage of C082 · Switzerland · 1979 · 10 rappen · CHF** `type CH.KM.27 issues.1.mintage` = `18000000` (written by Grok: Numista N#173 (https://en.numista.com/catalogue/pieces173.html): mintage table row '1979' = 18 000 000 (record had 18 010 000; corrected); c)
- **catalog of C072 · France · 2000 · 2 euro · EUR** `type FR.KM.1289 catalogs` = `[{"number": "1289", "system": "KM"}, {"number": "658", "system": "Schön"}, {"number": "10…` (written by Grok: Numista N#104 (https://en.numista.com/catalogue/pieces104.html) references: KM# 1289, Schön# 658, Gad 1789# 8, Gad Euro# 801.0 etc.; Numista)
- **catalog of C263 · Mexico · 1950 · 25 centavos · MXN** `type MX.KM.443 catalogs` = `[{"number": "443", "system": "KM"}, {"number": "43", "system": "Schön"}, {"number": "972"…` (written by Grok: Numista N#972 (https://en.numista.com/catalogue/pieces972.html) references: KM# 443, Schön# 43) [audit sample]
- **catalog of C080 · Germany · 2002 · 1 euro · EUR** `type DE.KM.213 catalogs` = `[{"number": "213", "system": "KM"}, {"number": "212", "system": "Schön"}, {"number": "111…` (written by Grok: Numista N#111 (https://en.numista.com/catalogue/pieces111.html) references: KM# 213, J# 488, Schön# 212, AKS# K2; Numista also lists J# 488,)
- **composition of C238 · Germany · 1973 · 2 Deutsche Mark · DEM** `type DE.KM.124 composition.text` = `copper-nickel clad nickel` (written by Grok: Numista N#844 (https://en.numista.com/catalogue/pieces844.html) and N#1935 (https://en.numista.com/catalogue/pieces1935.html): both 2 Mark 1) [audit sample]
- **catalog of C243 · France · 1946 · 5 francs · FRF (old franc · pre-nouveau)** `type FR.KM.888b.1 catalogs` = `[{"number": "888b.1", "system": "KM"}, {"number": "203b", "system": "Schön"}, {"number": …` (written by Grok: Numista N#1190 (https://en.numista.com/catalogue/pieces1190.html) references: KM# 888b.1, Schön# 203b; the entry lists KM# 888b; its 1946 (P) [audit sample]
- **catalog of C281 · France · 1994 · 5 francs · FRF** `type FR.X.5-francs catalogs` = `[{"number": "926a.1", "system": "KM"}, {"number": "235a", "system": "Schön"}, {"number": …` (written by Grok: Numista N#8 (https://en.numista.com/catalogue/pieces8.html) references: KM# 926a.1, Schön# 235a)
- **catalog of C240 · Italy · 1965 · 100 lire · ITL** `type IT.KM.96.1 catalogs` = `[{"number": "96.1", "system": "KM"}, {"number": "96", "system": "Schön"}, {"number": "304…` (written by Grok: Numista N#304 (https://en.numista.com/catalogue/pieces304.html) references: KM# 96.1, Schön# 96)
- **catalog of C255 · Netherlands · 1892 · 1 cent · NLG** `type NL.KM.107.2 catalogs` = `[{"number": "107.2", "system": "KM"}, {"number": "963", "system": "Sch"}, {"number": "107…` (written by Grok: Numista N#1070 (https://en.numista.com/catalogue/pieces1070.html) references: KM# 107, Sch# 695-701, 963-968; N#1070 is the shared page for ) [audit sample]
- **catalog of C258 · Vietnam (State of Vietnam) · 1953 · 20 su · VND (State of Vietnam đồng)** `type VN-SOV.KM.1 catalogs` = `[{"number": "2", "system": "KM"}, {"number": "36", "system": "Schön"}, {"number": "5904",…` (written by Grok: Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): 20 Xu 1953 State of Vietnam, references KM# 2, Schön# 36; KM#1 is the 10 )
- **mintage of C243 · France · 1946 · 5 francs · FRF (old franc · pre-nouveau)** `type FR.KM.888b.1 issues.0.mintage` = `61332000` (written by Grok: Numista N#1190 (https://en.numista.com/catalogue/pieces1190.html): mintage table row '1946' = 61 332 000 (re-cite; matches the record); Pari)
- **mintage of C281 · France · 1994 · 5 francs · FRF** `type FR.X.5-francs issues.0.mintage` = `9973818` (written by Grok: Numista N#8 (https://en.numista.com/catalogue/pieces8.html): mintage table has two 1994 rows, 3 973 818 (Franc 2014# 341/30) and 6 000 000 ()
- **mintage of C240 · Italy · 1965 · 100 lire · ITL** `type IT.KM.96.1 issues.0.mintage` = `36440000` (written by Grok: Numista N#304 (https://en.numista.com/catalogue/pieces304.html): mintage table row '1965 R' = 36 440 000 (re-cite; matches the record)) [audit sample]
- **mintage of C255 · Netherlands · 1892 · 1 cent · NLG** `type NL.KM.107.2 issues.0.mintage` = `5000000` (written by Grok: Numista N#1070 (https://en.numista.com/catalogue/pieces1070.html): mintage table row '1892 (KM# 107.2, Sch# 963)' = 5 000 000 (re-cite; matc)
- **composition of C219 · Jamaica · 2015 · 1 dollar · JMD** `type JM.KM.189 composition.text` = `nickel clad steel` (written by Grok: Numista N#14369 (https://en.numista.com/catalogue/pieces14369.html): composition nickel clad steel -> metal_class clad)
- **catalog of C239 · Australia · 1944 · 1 penny · AUD (pre-decimal)** `type AU.KM.36 catalogs` = `[{"number": "36", "system": "KM"}, {"number": "23", "system": "Schön"}, {"number": "5788"…` (written by Grok: Numista N#5788 (https://en.numista.com/catalogue/pieces5788.html) references: KM# 36, Schön# 23) [audit sample]

### 2. HW-muse-research-20261009-1 · Researcher · Answer 5 open research questions · due 2026-10-19  (fix list #3)

Each item is a question the record still carries ('Still being checked' in the app). Find the answer in an exact source. Send the corrected fact (if it needs one) AND the question-removal line (research.open_questions without that question), both with the exact source. If the answer needs the coin in Joseph's hand, leave it out and say so in your note.

**Done when:** One change file; questions you could not settle left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-research-20261009-1.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C028 · Malta · 2013 · 5 euro cent · EUR** (MT.KM.128): The Schön number 128 may be a copy of the old, wrong KM number (KM was 128, now 127); Numista N#2183 lists no Schön number. Find the Schön Euro catalogue entry for the Malta 5 cent, or the number should be removed. Record: {"country": "Malta", "year": "2013", "denom": "5 euro cent · EUR", "mint": "Malta euro issue (temple national)", "refs": "KM#127 · Schön#128 · Numista#2183", "metal": "copper-plated steel · 3.92 g · 21.25 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.67 mm · medal alignmen…
- **C043 · Malta · 2008 · 10 euro cent · EUR** (MT.KM.129): The Schön number 129 may be a copy of the old, wrong KM number (KM was 129, now 128); Numista N#2184 lists no Schön number. Find the Schön Euro catalogue entry for the Malta 10 cent, or the number should be removed. Record: {"country": "Malta", "year": "2008", "denom": "10 euro cent · EUR", "mint": "Malta euro issue (first year)", "refs": "KM#128 · Schön#129 · Numista#2184", "metal": "Nordic gold (Cu 89 / Al 5 / Zn 5 / Sn 1) · 4.10 g · 19.75 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.93 m…
- **C204 · Trinidad and Tobago · 2014 · 25 cents · TTD** (TT.KM.33): Cosmetic: the design note describes the Scarlet Ibis and Cocrico (the coat-of-arms supporters on the obverse) but omits the actual reverse motif, which references give as the Chaconia flower. Fix when the record is next touched. Record: {"country": "Trinidad and Tobago", "year": "2014", "denom": "25 cents · TTD", "mint": "not on shown arms side", "refs": "KM#32 · Schön#31 · Numista#1159", "metal": "cupronickel · 3.53 g · 20 mm · reeded · circulated / bright · white 2×2 staple flip", "specs": "thickness unknown · medal alignment", …
- **C212 · Eritrea · 1997 · 50 cents · ERN (nakfa)** (ER.KM.46): The design note says the obverse shows the State of Eritrea arms / a camel, but the Numista entry (N#2403) shows soldiers with a flag on the common side. Which is right? Check the design note against the entry and the photo. Record: {"country": "Eritrea", "year": "1997", "denom": "50 cents · ERN (nakfa)", "mint": "not on shown reverse (Asmara / Royal Mint era typical)", "refs": "KM#47 · Schön#47 · Numista#2403", "metal": "nickel-clad steel · 7.80 g · 25 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2 m…
- **C232 · Vietnam · 2003 · 1000 đồng · VND** (VN.KM.71): References describe a reverse motif (the One Pillar Pagoda) that the design note omits; the catalogue number is settled (KM# 72, Numista N#2104). Check the design note against the coin or the Numista entry. Record: {"country": "Vietnam", "year": "2003", "denom": "1000 đồng · VND", "mint": "not on shown emblem side", "refs": "KM#72 · Schön#144 · Numista#2104", "metal": "brass plated steel · 3.80 g · 19 mm · reeded · circulated bright · white 2×2 staple flip", "specs": "thickness unknown · medal alignment", "mi…

### 3. HW-muse-plain-story-20261009-2 · Writer · Rewrite 15 stories in plain English · due 2026-10-16  (fix list #60)

Joseph's dad reads these. Each story below still uses shorthand (·, +, &, slashes, metal codes like CuNi or .720 Ag, or a bare list of design elements). Rewrite it as 2 to 4 plain sentences, keeping every fact exactly: change the wording, never the facts. Source: 'plain-English rewrite of the existing story; no facts changed'.

**Done when:** One change file; the stories pass the plain-English check.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-muse-plain-story-20261009-2.jsonl (save your edited copy as changes_muse_YYYYMMDD-HHMM.jsonl)

Items:
- **C031 · Australia · 1943 · Threepence (3d) · AUD**: “A 1943 3 pence from Australia. The obverse shows George VI; the reverse shows three wheat stalks; IND:IMP still in legend, AUSTRALIA, THREE PENCE, 1943, S. Struck in .925 sterling silver.” (shorthand: `IND:IMP still in legend, AUSTRALIA, THRE`)
- **C033 · France · 1969 · 1/2 franc · FRF**: “A 1969 0.5 franc from France. The obverse shows La Semeuse left (Oscar Roty); the reverse shows 1/2 FRANC; olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.” (shorthand: `olive sprig, LIBERTE, EGALITE, FRATERNIT`)
- **C035 · Germany · 1971 · 50 Pfennig · DEM**: “A 1971 50 Pfennig from Germany. Trümmerfrau planting oak sapling (Richard M. Werner and Gerda Werner), Bundesadler value side. Struck in CuNi 75/25.” (shorthand: `CuNi`)
- **C045 · Netherlands · 2014 · 5 euro cent · EUR**: “A 2014 5 euro cent from Netherlands. National Willem-Alexander right-facing portrait, Willem-Alexander Koning der Nederlanden (vertical), date, 12 stars, common Europe map side (Luc Luycx). Struck in copper-plated steel.” (shorthand: `National Willem-Alexander right-facing p`)
- **C048 · Germany · 1993 · 1 Deutsche Mark · DEM**: “A 1993 1 Deutsche Mark from Germany. Bundesadler, value 1 between oak sprigs, DEUTSCHE MARK (Josef Bernhart). Struck in CuNi.” (shorthand: `CuNi`)
- **C049 · France · 1989 · 10 francs · FRF**: “A 1989 10 francs from France. The obverse shows Génie de la Liberté (after François Rude; the reverse shows 10 F; Bastille column), LIBERTE, EGALITE, FRATERNITE, date, RF. Struck in bimetallic (nickel center with an aluminum-bronze ring).” (shorthand: `Bastille column), LIBERTE, EGALITE, FRAT`)
- **C050 · Germany · 1982 · 1 Deutsche Mark · DEM**: “A 1982 1 Deutsche Mark from Germany. Bundesadler, value 1 between oak sprigs, DEUTSCHE MARK (Josef Bernhart). Struck in CuNi.” (shorthand: `CuNi`)
- **C057 · Germany · 1982 · 50 Pfennig · DEM**: “A 1982 50 Pfennig from Germany. Trümmerfrau planting oak sapling (Richard M. Werner and Gerda Werner), Bundesadler value side. Struck in CuNi 75/25.” (shorthand: `CuNi`)
- **C058 · Germany · 1985 · 50 Pfennig · DEM**: “A 1985 50 Pfennig from Germany. Trümmerfrau planting oak sapling (Richard M. Werner and Gerda Werner), Bundesadler value side. Struck in CuNi 75/25.” (shorthand: `CuNi`)
- **C059 · France · 1960 · 1 franc · FRF (nouveau franc)**: “A 1960 1 franc from France. The obverse shows La Semeuse left (Oscar Roty); the reverse shows 1 FRANC; REPUBLIQUE FRANÇAISE, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.” (shorthand: `REPUBLIQUE FRANÇAISE, olive sprig, LIBER`)
- **C060 · France · 1971 · 1/2 franc · FRF**: “A 1971 0.5 franc from France. The obverse shows La Semeuse left (Oscar Roty); the reverse shows 1/2 FRANC; olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.” (shorthand: `olive sprig, LIBERTE, EGALITE, FRATERNIT`)
- **C068 · Switzerland · 1963 · 20 rappen · CHF**: “A 1963 20 rappen from Switzerland. Libertas right on the obverse, 20 in wreath on the reverse, engravers Karl Schwenzer and Carl Friedrich Voigt. Struck in CuNi 75/25.” (shorthand: `CuNi`)
- **C069 · Jamaica · 1975 · 50 cents · JMD**: “A 1975 50 cents from Jamaica. Arms, crocodile, Taino supporters, OUT OF MANY, ONE PEOPLE, JAMAICA, FIFTY CENTS, 1975. Struck in cupronickel.” (shorthand: `Arms, crocodile, Taino supporters, OUT O`)
- **C073 · USA · 1976 · 25 cents · USD · Bicentennial (1776–1976)**: “A 1976 25 cents from USA. The obverse shows Washington; the reverse shows drummer boy (Jack L. Ahr); dual-date 1776–1976, E PLURIBUS UNUM, QUARTER DOLLAR. Struck in Cu-Ni clad (copper core visible on reeded edges).” (shorthand: `Cu-Ni`)
- **C076 · Switzerland · 1989 · 20 rappen · CHF**: “A 1989 20 rappen from Switzerland. Libertas right on the obverse, 20 in wreath on the reverse, engravers Karl Schwenzer and Carl Friedrich Voigt. Struck in CuNi 75/25.” (shorthand: `CuNi`)

## Projects (after the homework)

### Read new coin photos (with Grok, blind)  [ALWAYS]  (fix list #55)

Whenever NOID photos appear in STAGING: Phase 1 change file per AI_START_HERE, without looking at Grok's read first (AI_START_HERE 2b).

**Done when:** Ongoing.

## Your recent files (what happened to each file you sent)

- 2026-10-10 01:54 UTC `changes_muse_20261009-1035.jsonl`: rejected: the note changes_muse_20261009-1035.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: specimen field 'denomination' is a Phase 2 field; a phase 1 contribution may not write it (see collection/templates/FIELDS.md))
- 2026-10-10 01:54 UTC `changes_muse_20261009-1028.jsonl`: rejected: the note changes_muse_20261009-1028.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: specimen field 'country' is a Phase 2 field; a phase 1 contribution may not write it (see collection/templates/FIELDS.md))
- 2026-10-10 01:54 UTC `changes_muse_20261009-1025.jsonl`: rejected: the note changes_muse_20261009-1025.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: specimen field 'denomination' is a Phase 2 field; a phase 1 contribution may not write it (see collection/templates/FIELDS.md))
- 2026-10-10 01:54 UTC `changes_muse_20261009-1015.jsonl`: rejected: the note changes_muse_20261009-1015.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: specimen field 'country' is a Phase 2 field; a phase 1 contribution may not write it (see collection/templates/FIELDS.md))
- 2026-10-10 01:54 UTC `changes_muse_20261009-1006.jsonl`: rejected: the note changes_muse_20261009-1006.jsonl.REJECTED.txt in the drop folder says why; fix it and send it under a new time stamp (line 1: specimen field 'country' is a Phase 2 field; a phase 1 contribution may not write it (see collection/templates/FIELDS.md))

## Your numbers (measured, not self-reported)

- Assignments answered: 0; expired: 0.
- Your facts checked by another contributor: 35 (31 confirmed, 4 wrong; error rate 11.4 %, 95 % range 4-26 %). Checks you did for others: 0. Open disagreements you are part of: 0.
- Share of your new facts that get checked first: 100 %.
