<!-- doc-status: current; normative: yes (for Grok) -->
# WORK QUEUE for Grok (updated 2026-10-09 19:33 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** active. Strongest outside contributor (Numista sweep 9/10, story fixes 10/10, best blind photo test so far): opens Numista, careful exact sources, flags what it cannot settle.
**How you get this:** Drive doc 'WORK QUEUE for Grok' in Titan Reliquary/ (the same page is docs/agents/QUEUE_grok.md on GitHub). Drops change files in Drive collection-incoming (AI change files).

## Finish first

### Fact-check the coin stories, C151 to C283  (fix list #73)

Your first 18 fixes (C161 to C262, changes_grok-bot_20261008-1101/1102/1103) are merged: every one checked out. Carry on through C283 the same way: check each story against its own record and the cited Numista entry; where a claim is wrong, send a corrected story (source = the exact entry; say what was wrong; change only the wrong sentence). (While this is open, nobody else is given these stories: they are reserved for you.)

**Done when:** Every story from C151 to C283 checked; a list of the ones you changed and why (in your FEEDBACK doc note).

## Calibration test due: the locked photo pack (15 coins)  (fix list #19)

Open https://github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-locked and follow its PROMPT.md (raw: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/bakeoff/pack-20261008-locked/PROMPT.md). Answer ONLY from the photos: never search this repository or its data for the coins. Save `bakeoff_grok_YYYYMMDD-HHMM.json` in Drive `Titan Reliquary/bakeoff (blind photo test)/` (or reply with it in chat). This is your first time with this pack. Its coin ids exist only in Claude's locked key; it decides which AI reads the Phase 2 pro photos.

**Done when:** the answer file is in Drive; Claude scores it and your numbers appear in collaborators/MODEL_ACCURACY.md.

## Homework (generated from the data)

How homework works (read once):
1. Each assignment has an id (HW-...). Answer ONE assignment per change file: `changes_{you}_{YYYYMMDD-HHMM}.jsonl` in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Every line carries `"assignment": "<the id>"` inside `provenance`.
2. Start from the answer sheet: it is pre-filled (download it from the link, or copy the block). Change only `new` (when the record is wrong) and `source` (your exact source), and set `ts` to the current UTC time. A line whose source still starts with FILL counts as 'left out': no error, it simply goes back to the pool. Delete nothing else.
3. Never guess. Leave out what you cannot do; it goes to another AI or to Joseph. Two AIs that could not do an item park it.
4. You never get your own facts to check, and a check never overwrites: a value that disagrees is filed as a disagreement for a third reader.
5. Finish within the lease (the date on each assignment); after it the items go back to the pool.
6. When you finish, start the next assignment straight away. New assignments appear here after every merge.

### 1. HW-grok-cite-20261009-1 · Cataloguer · Cite the catalogue facts of 19 coin types · due 2026-10-16  (fix list #72)

For each coin type below, open its Numista entry (or find it) and send the facts listed under `ask`, each as its own line with the exact entry URL and the table row you read in `source`. Where the record is already right, send the same value back with your source (a re-citation is how a guess becomes Reference). Leave a line out when the entry does not give that fact; leave a whole type out when there is no entry (say why in one line of your note).

**Done when:** One change file answering this assignment; everything you left out goes back to the pool.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-grok-cite-20261009-1.jsonl (save your edited copy as changes_grok_YYYYMMDD-HHMM.jsonl)

Items:
- **DE 2 Deutsche Mark (DE.KM.124)** coins C238. Ask: catalogs: add the Numista entry {system: "Numista", number, url}. Note: The type carries two numbers in one catalogue (2 KM numbers: 124, A127): say which one this coin is.
- **AU 1 cent (AU.X.1-cent)** coins C288. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; composition.text + composition.metal_class; issues.0.mintage: 1983
- **HN 50 centavos (HN.X.50-centavos)** coins C286. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; composition.text + composition.metal_class; issues.0.mintage: 2012
- **MX 50 centavos (MX.X.50-centavos)** coins C284. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; composition.text + composition.metal_class; issues.0.mintage: 2009 Mo
- **SK 5 euro cent (SK.X.5-euro-cent)** coins C285. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; composition.text + composition.metal_class; issues.0.mintage: 2009
- **BS 1 cent (BS.X.1-cent)** coins C276. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; issues.0.mintage: 2015
- **DE 20 Pfennig (DE-EMP.X.20-pfennig)** coins C023. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; issues.0.mintage: 1918
- **JM 10 dollars (JM.KM.191)** coins C230. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; issues.0.mintage: 2015
- **MX 5 centavos (MX-CHI.KM.612)** coins C114. Ask: catalogs: add the Numista entry {system: "Numista", number, url}; nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null); nominal.diameter_mm; issues.0.mintage: 1914
- **FR 5 francs (FR.KM.888b.1)** coins C243. Ask: nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null)
- **FR 2 euro cent (FR.KM.1283)** coins C034, C127, C128. Ask: issues.0.mintage: 2009; issues.1.mintage: 2010; issues.2.mintage: 2017
- **FR 0.5 franc (FR.KM.931.1)** coins C033, C060, C221. Ask: issues.0.mintage: 1969; issues.1.mintage: 1971; issues.2.mintage: 1986
- **FR 10 euro cent (FR.KM.1285)** coins C095, C096. Ask: issues.0.mintage: 1999; issues.1.mintage: 2002
- **FR 10 euro cent (FR.KM.1410)** coins C054, C097. Ask: issues.0.mintage: 2010; issues.1.mintage: 2015
- **GB 5 pence (GB.KM.1109d)** coins C180, C181, C182. Ask: issues.0.mintage: 2012; issues.1.mintage: 2014
- **GB 10 pence (GB.KM.1110d)** coins C155, C156, C157. Ask: issues.0.mintage: 2013; issues.1.mintage: 2014
- **SU 1 kopek (SU.Y.126a)** coins C042, C044. Ask: issues.0.mintage: 1962; issues.1.mintage: 1974
- **BZ 25 cents (BZ.X.25-cents)** coins C280. Ask: issues.0.mintage: 2007
- **CH 0.5 franc (CH.KM.23a)** coins C008, C015. Ask: issues.0.mintage: 1968 B

### 2. HW-grok-catno-20261009-1 · Cataloguer · Settle 29 catalogue numbers that disagree with Numista · due 2026-10-16  (fix list #74)

Each row is a catalogue number (Schön, Jaeger) where the record and the Numista entry disagree. Open the entry, and send the type's whole `catalogs` list with the corrected number (or the same list when the record is right), with the entry URL in `source`.

**Done when:** One change file; a row you could not settle is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-grok-catno-20261009-1.jsonl (save your edited copy as changes_grok_YYYYMMDD-HHMM.jsonl)

Items:
- **DE.KM.105** (C029, C187, C188, C189, C190, C191, C192): Schön record 105 vs Numista 103 (https://en.numista.com/catalogue/pieces854.html); J record 381 vs Numista 380 (https://en.numista.com/catalogue/pieces854.html)
- **DE.KM.107** (C195, C196, C197, C237, C265): Schön record 107 vs Numista 105 (https://en.numista.com/catalogue/pieces658.html)
- **DE.KM.109.1** (C035): Schön record 109 vs Numista 107 (https://en.numista.com/catalogue/pieces847.html)
- **DE.KM.109.2** (C057, C058): Schön record 109 vs Numista 107 (https://en.numista.com/catalogue/pieces847.html)
- **DE.KM.110** (C006, C048, C050, C103): Schön record 110 vs Numista 108 (https://en.numista.com/catalogue/pieces846.html)
- **DE.KM.140.1** (C009): Schön record 140 vs Numista 139 (https://en.numista.com/catalogue/pieces843.html); J record 413 vs Numista 415 (https://en.numista.com/catalogue/pieces843.html)
- **DE.KM.207** (C132, C133, C134, C135, C136, C137, C138, C273): J record 481 vs Numista 482 (https://en.numista.com/catalogue/pieces105.html)
- **DE.KM.208** (C046, C100, C126): J record 482 vs Numista 483 (https://en.numista.com/catalogue/pieces106.html)
- **DE.KM.209** (C099, C121): J record 483 vs Numista 484 (https://en.numista.com/catalogue/pieces107.html)
- **DE.KM.210** (C037, C283): J record 484 vs Numista 485 (https://en.numista.com/catalogue/pieces108.html)
- **DE.KM.211** (C131): J record 485 vs Numista 486 (https://en.numista.com/catalogue/pieces109.html)
- **DE.KM.212** (C026): J record 486 vs Numista 487 (https://en.numista.com/catalogue/pieces110.html)
- **DE.KM.214** (C071): J record 488 vs Numista 489 (https://en.numista.com/catalogue/pieces112.html)
- **GR.KM.90** (C245): Schön record 19 vs Numista 90 (https://en.numista.com/catalogue/pieces545.html)
- **HU.KM.575** (C032): Schön record 75 vs Numista 59a (https://en.numista.com/catalogue/pieces1124.html)
- **IE.KM.34** (C120): Schön record 34 vs Numista 33 (https://en.numista.com/catalogue/pieces123.html)
- **IT.KM.111** (C211): Schön record 111 vs Numista 110 (https://en.numista.com/catalogue/pieces302.html)
- **IT.KM.211** (C039): Schön record 211 vs Numista 229 (https://en.numista.com/catalogue/pieces130.html)
- **IT.KM.213** (C036): Schön record 213 vs Numista 231 (https://en.numista.com/catalogue/pieces132.html)
- **IT.KM.214** (C027, C061): Schön record 214 vs Numista 232 (https://en.numista.com/catalogue/pieces133.html)
- **IT.KM.215** (C055): Schön record 215 vs Numista 233 (https://en.numista.com/catalogue/pieces134.html)
- **IT.KM.216** (C084): Schön record 216 vs Numista 234 (https://en.numista.com/catalogue/pieces135.html)
- **NL.KM.204** (C010, C104): Schön record 89 vs Numista 84 (https://en.numista.com/catalogue/pieces731.html)
- **NL.KM.234** (C142): Schön record 110 vs Numista 117 (https://en.numista.com/catalogue/pieces145.html)
- **NL.KM.236** (C004): Schön record 112 vs Numista 119 (https://en.numista.com/catalogue/pieces147.html)
- **NL.KM.241** (C070): Schön record 117 vs Numista 124 (https://en.numista.com/catalogue/pieces152.html)
- **PT.KM.744** (C056): Schön record 174 vs Numista 245 (https://en.numista.com/catalogue/pieces157.html)
- **SE.KM.826a** (C165): Schön record 62a vs Numista 64 (https://en.numista.com/catalogue/pieces1516.html)
- **SK.KM.96** (C038): Schön record 96 vs Numista 94 (https://en.numista.com/catalogue/pieces5085.html)

### 3. HW-grok-story-check-20261009-1 · Fact-checker · Fact-check 25 coin stories · due 2026-10-16  (fix list #73)

Check each story against its own record (below) and the exact catalogue entry. If every claim holds, send the story back unchanged with source 'checked against <entry URL>: all claims hold'. If a claim is wrong, change only that sentence and say in source what was wrong and which entry shows it. You never get a story you wrote.

**Done when:** One change file covering every story you could check.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-grok-story-check-20261009-1.jsonl (save your edited copy as changes_grok_YYYYMMDD-HHMM.jsonl)

Items:
- **C001 · Switzerland · 1969 · 1 franc · CHF**: “A 1969 1 franc from Switzerland. Standing Helvetia on the obverse, value in wreath on the reverse, engravers Antoine Bovy, Albert Walch, and Fr. Fisch. Struck in CuNi 75/25.” Record: {"country": "Switzerland", "year": "1969", "denom": "1 franc · CHF", "mint": "B", "refs": "KM#24a.1 · Numista#185", "metal": "CuNi 75/25 · 4.40 g · 23.2 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.55 mm · coin alignment", "mintage": "37,598,000 (17,688,000 Bern + 19,910,000 London; both B)", "design": "standing Helvetia (obv) · value in wreath (rev) · engravers Antoin…
- **C002 · Switzerland · 1963 · 5 rappen · CHF**: “A 1963 5 rappen from Switzerland. Libertas right on the obverse, 5 in grapevine wreath on the reverse, engravers Karl Schwenzer and Carl Friedrich Voigt. Struck in CuNi 75/25.” Record: {"country": "Switzerland", "year": "1963", "denom": "5 rappen · CHF", "mint": "B", "refs": "KM#26 · Schön#24 · Y#23 · Numista#168", "metal": "CuNi 75/25 · 2.00 g · 17.15 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.25 mm · medal alignment · type specs shared with CuNi 5 Rp 1879–1980 (KM#26)", "mintage": "29,730,000 Bern B", "design": "Libertas right (obv) · 5 in grapevi…
- **C003 · Switzerland · 1968 · 2 francs · CHF**: “A 1968 Swiss 2-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Engraved by Antoine Bovy and Albert Walch, and struck in copper-nickel (75% copper, 25% nickel).” Record: {"country": "Switzerland", "year": "1968", "denom": "2 francs · CHF", "mint": "B", "refs": "KM#21a.1 · Numista#189", "metal": "CuNi 75/25 · 8.80 g · 27.4 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2.15 mm · coin alignment · type specs shared with CuNi 2 Fr from 1968 (KM#21a)", "mintage": "31,588,000", "design": "standing Helvetia (obv) · 2 Fr. in oak + alpine wreath (r…
- **C004 · Netherlands · 2000 · 5 euro cent · EUR**: “A 2000 Dutch 5-euro-cent coin. The Dutch side shows a portrait of Queen Beatrix with the words BEATRIX KONINGIN DER NEDERLANDEN (Beatrix, Queen of the Netherlands). The other side, shared by every euro country, was designed by Luc Luycx. Struck in copper-plated steel.” Record: {"country": "Netherlands", "year": "2000", "denom": "5 euro cent · EUR", "mint": "Utrecht (caduceus)", "refs": "KM#236 · Schön#112 · Numista#147", "metal": "copper-plated steel · 3.92 g · 21.25 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.67 mm · medal alignment · Beatrix national type", "mintage": "184,200,000", "design": "national Beatrix portrait + BEATRIX KONINGIN D…
- **C005 · France · 1986 · 20 centimes · FRF**: “A 1986 French 20-centime coin. The front shows Marianne, the symbol of France, facing left, by Henri Lagriffoul; the back shows the value with olive and wheat stalks and the motto LIBERTÉ, ÉGALITÉ, FRATERNITÉ, by Adrien Dieudonné. Struck in aluminium-bronze.” Record: {"country": "France", "year": "1986", "denom": "20 centimes · FRF", "mint": "Monnaie de Paris", "refs": "KM#930 · Schön#230 · Numista#4", "metal": "aluminum-bronze (Cu 92 / Al 6 / Ni 2) · 4.00 g · 23.5 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.4 mm · coin alignment · type specs shared with Al-bronze 20c 1962–2001 (KM#930)", "mintage": "40,000,011 (circulation · Monna…
- **C006 · Germany · 1984 · 1 Deutsche Mark · DEM**: “A 1984 1 Deutsche Mark from Germany. Bundesadler, value 1 between oak sprigs, DEUTSCHE MARK (Josef Bernhart). Struck in CuNi.” Record: {"country": "Germany", "year": "1984", "denom": "1 Deutsche Mark · DEM", "mint": "unknown", "refs": "KM#110 · Schön#110 · J#385 · Numista#846", "metal": "CuNi · 5.50 g · 23.5 mm · ornamented (arabesque) · circulated · white 2×2 staple flip", "specs": "thickness 1.75 mm · medal alignment", "mintage": "32,400,000", "design": "Bundesadler · value 1 between oak sprigs / DEUTSCHE MARK (Josef Bernhart)…
- **C007 · France · 1963 · 10 centimes · FRF**: “A 1963 French 10-centime coin. The front shows Marianne, the symbol of France, facing left, by Henri Lagriffoul; the back shows the value with olive and wheat stalks and the motto LIBERTÉ, ÉGALITÉ, FRATERNITÉ, by Adrien Dieudonné. Struck in aluminium-bronze.” Record: {"country": "France", "year": "1963", "denom": "10 centimes · FRF", "mint": "Monnaie de Paris", "refs": "KM#929 · Schön#229 · Numista#3", "metal": "aluminum-bronze (Cu 92 / Al 6 / Ni 2) · 3.00 g · 20 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.41 mm · coin alignment · type specs shared with Al-bronze 10c 1962–2001 (KM#929)", "mintage": "217,601,000 (circulation · Monna…
- **C008 · Switzerland · 1968 · 1/2 franc · CHF**: “A 1968 0.5 franc from Switzerland. Standing Helvetia on the obverse, value in wreath on the reverse, engravers Antoine Bovy and Albert Walch. Struck in CuNi 75/25.” Record: {"country": "Switzerland", "year": "1968", "denom": "1/2 franc · CHF", "mint": "B", "refs": "KM#23a · Schön#27a · Numista#181", "metal": "CuNi 75/25 · 2.20 g · 18.2 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.25 mm · coin alignment · type specs shared with CuNi ½ Fr from 1968 (KM#23a)", "mintage": "20,000,000 (+ separate Bern B variety ~44.9M reported)", "design": "st…
- **C009 · Germany · 1987 · 5 Deutsche Mark · DEM**: “A 1987 5 Deutsche Mark from Germany. Bundesadler reverse, value, DEUTSCHE MARK obverse (circulation Magnimat, not Ag commemorative). Struck in CuNi clad nickel (Magnimat).” Record: {"country": "Germany", "year": "1987", "denom": "5 Deutsche Mark · DEM", "mint": "J", "refs": "KM#140.1 · Schön#140 · J#413 (Magnimat circulation)", "metal": "CuNi clad nickel (Magnimat) · 10.00 g · 29 mm · lettered EINIGKEIT UND RECHT UND FREIHEIT · circulated · white 2×2 staple flip", "specs": "thickness 2.07 mm · medal alignment", "mintage": "~6,940,000 (1987-J circulation; +~45k proof)", "des…
- **C010 · Netherlands · 1996 · 25 cents · NLG**: “A 1996 25 cents from Netherlands. The obverse shows Beatrix portrait; the reverse shows squared grid field with large 25; ct, date. Struck in nickel.” Record: {"country": "Netherlands", "year": "1996", "denom": "25 cents · NLG", "mint": "Utrecht (caduceus)", "refs": "KM#204 · Schön#89 · Numista#731", "metal": "nickel · 3.00 g · 19 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness unknown · coin alignment · Beatrix kwartje type", "mintage": "24,840,000", "design": "obverse Beatrix portrait · reverse squared grid field with large 25 …
- **C011 · Italy · 1970 · 50 lire · ITL**: “A 1970 50 lire from Italy. The obverse shows head of Italia as the Republic, oak-crowned (Romagnoli); the reverse shows Vulcan at anvil with hammer; L.50, date, R (Giampaoli). Struck in Acmonital stainless steel.” Record: {"country": "Italy", "year": "1970", "denom": "50 lire · ITL", "mint": "R", "refs": "KM#95.1 · Schön#95 · Numista#724", "metal": "Acmonital stainless steel · 6.25 g · 24.8 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.95 mm · coin alignment · Vulcan large type 1954–89", "mintage": "21,411,000 (1970-R circulation)", "design": "obverse Italia / Republic head oak-crowned (…
- **C012 · France · 1962 · 1 franc · FRF (nouveau franc)**: “A 1962 1 franc from France. The obverse shows La Semeuse left (Oscar Roty); the reverse shows 1 FRANC; REPUBLIQUE FRANÇAISE, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.” Record: {"country": "France", "year": "1962", "denom": "1 franc · FRF (nouveau franc)", "mint": "Monnaie de Paris", "refs": "KM#925.1 · Schön#233 · Numista#6", "metal": "nickel · 6.00 g · 24 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.79 mm · coin alignment · type specs shared with nickel Semeuse 1 Fr 1960–2001 (KM#925.1) · magnetic Ni (not Ag)", "mintage": "14,014,136 (circu…
- **C013 · United Kingdom · 1971 · 2 new pence · GBP**: “A 1971 2 new pence from United Kingdom. The obverse shows Arnold Machin Elizabeth II; the reverse shows Plume of ostrich feathers in coronet; NEW PENCE (Ironside). Struck in bronze (97 Cu / 2.5 Zn / 0.5 Sn).” Record: {"country": "United Kingdom", "year": "1971", "denom": "2 new pence · GBP", "mint": "Royal Mint", "refs": "KM#916 · Schön#403 · Numista#664", "metal": "bronze (97 Cu / 2.5 Zn / 0.5 Sn) · 7.12 g · 25.9 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.85 mm · medal alignment · type specs shared with decimal 2p family · bronze era (pre–Sep 1992)", "mintage": "1,454,856,250 (ci…
- **C014 · Switzerland · 1974 · 2 francs · CHF**: “A 1974 Swiss 2-franc coin. The front shows Helvetia, the figure of Switzerland, standing with a spear and shield; the back shows the value inside a wreath of oak and alpine flowers. Engraved by Antoine Bovy and Albert Walch, and struck in copper-nickel (75% copper, 25% nickel).” Record: {"country": "Switzerland", "year": "1974", "denom": "2 francs · CHF", "mint": "B", "refs": "KM#21a.1 · Numista#189", "metal": "CuNi 75/25 · 8.80 g · 27.4 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 2.15 mm · coin alignment · type specs shared with CuNi 2 Fr (KM#21a)", "mintage": "15,007,000", "design": "standing Helvetia (obv) · 2 Fr. in oak + alpine wreath (rev) · engr…
- **C015 · Switzerland · 1971 · 1/2 franc · CHF**: “A 1971 0.5 franc from Switzerland. Standing Helvetia on the obverse, value in wreath on the reverse, engravers Antoine Bovy and Albert Walch. Struck in CuNi 75/25.” Record: {"country": "Switzerland", "year": "1971", "denom": "1/2 franc · CHF", "mint": "B", "refs": "KM#23a · Schön#27a · Numista#181", "metal": "CuNi 75/25 · 2.20 g · 18.2 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.25 mm · coin alignment · type specs shared with CuNi ½ Fr (KM#23a)", "mintage": "34,472,000", "design": "standing Helvetia (obv) · value in wreath (rev) · engrav…
- **C016 · Costa Rica · 1985 · 5 colones · CRC**: “A 1985 Costa Rican 5-colón coin. The front shows the national coat of arms inside a seven-sided frame; the back shows the value with a large ship, a coffee branch, the words AMERICA CENTRAL and B.C.C.R. (the central bank), and the value in Braille for blind users. Struck in stainless steel.” Record: {"country": "Costa Rica", "year": "1985", "denom": "5 colones · CRC", "mint": "Casa da Moeda do Brasil / Rio de Janeiro (large-ship type)", "refs": "KM#214.2 · Schön#78a · Numista#69", "metal": "stainless steel · 7.25 g · 26 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.92 mm · coin alignment · large ships · letters incuse on ribbon", "mintage": "25,000,000 (1985)", "de…
- **C017 · France · 1999 · 1 franc · FRF (nouveau franc)**: “A 1999 1 franc from France. The obverse shows La Semeuse left (Oscar Roty); the reverse shows 1 FRANC; REPUBLIQUE FRANÇAISE, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.” Record: {"country": "France", "year": "1999", "denom": "1 franc · FRF (nouveau franc)", "mint": "Monnaie de Paris", "refs": "KM#925.1 · Schön#233 · Numista#6", "metal": "nickel · 6 g · 24 mm · reeded · nice circulated / clean · white 2×2 staple flip", "specs": "thickness 1.79 mm · coin alignment · type specs shared with nickel Semeuse 1 Fr 1960–2001 (KM#925.1) · magnetic Ni (not Ag)", "mintage": "80,457,…
- **C018 · Germany · 1983 · 2 Pfennig · DEM**: “A 1983 2 Pfennig from Germany. Oak seedling reverse (Adolf Jäger), value, PFENNIG, BUNDESREPUBLIK DEUTSCHLAND obverse. Struck in copper-plated steel.” Record: {"country": "Germany", "year": "1983", "denom": "2 Pfennig · DEM", "mint": "G", "refs": "KM#106a · Schön#104a · J#381a · Numista#1937", "metal": "copper-plated steel · 2.90 g · 19.25 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.52 mm · medal alignment", "mintage": "47,575,000", "design": "oak seedling reverse (Adolf Jäger) · value / PFENNIG / BUNDESREPUBLIK DEUTSCHLAND …
- **C019 · Germany · 1981 · 10 Pfennig · DEM**: “A 1981 10 Pfennig from Germany. Oak seedling reverse (Adolf Jäger), value between rye ears, PFENNIG obverse. Struck in brass-plated steel.” Record: {"country": "Germany", "year": "1981", "denom": "10 Pfennig · DEM", "mint": "unknown (not readable on oak reverse photo (check value side if you care — D/F/G/J))", "refs": "KM#108 · Schön#106 · J#383 · Numista#850", "metal": "brass-plated steel · 4.00 g · 21.5 mm · plain · circulated / toned/circulated · white 2×2 staple flip", "specs": "thickness 1.7 mm · medal alignment", "mintage": "460,410,00…
- **C020 · United Kingdom · 1973 · ½ new penny · GBP**: “A 1973 half new penny from United Kingdom. The obverse shows Arnold Machin Elizabeth II; the reverse shows crowned St Edward's Crown (Christopher Ironside); NEW HALF PENNY, NEW PENNY era. Struck in bronze (97% copper, 2.5% zinc, 0.5% tin).” Record: {"country": "United Kingdom", "year": "1973", "denom": "½ new penny · GBP", "mint": "Royal Mint", "refs": "KM#914 · Numista#856", "metal": "bronze (97 Cu / 2.5 Zn / 0.5 Sn) · 1.78 g · 17.14 mm · plain · circulated / toned · white 2×2 staple flip", "specs": "thickness ~1.0 mm · medal alignment · type specs shared with decimal ½p 1971–1984 (KM#914)", "mintage": "365,680,000 (circulation · Royal Min…
- **C021 · Germany · 1970 · 10 Pfennig · DEM**: “A 1970 10 Pfennig from Germany. Oak seedling reverse (Adolf Jäger), value between rye ears, PFENNIG obverse. Struck in brass-plated steel.” Record: {"country": "Germany", "year": "1970", "denom": "10 Pfennig · DEM", "mint": "J", "refs": "KM#108 · Schön#106 · J#383 · Numista#850", "metal": "brass-plated steel · 4.00 g · 21.5 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.7 mm · medal alignment", "mintage": "40,115,000", "design": "oak seedling reverse (Adolf Jäger) · value between rye ears / PFENNIG obverse", "period"…
- **C022 · Germany · 1989 · 10 Pfennig · DEM**: “A 1989 10 Pfennig from Germany. Oak seedling reverse (Adolf Jäger), value between rye ears, PFENNIG obverse. Struck in brass-plated steel.” Record: {"country": "Germany", "year": "1989", "denom": "10 Pfennig · DEM", "mint": "G", "refs": "KM#108 · Schön#106 · J#383 · Numista#850", "metal": "brass-plated steel · 4.00 g · 21.5 mm · plain · circulated · white 2×2 staple flip", "specs": "thickness 1.7 mm · medal alignment", "mintage": "79,580,000", "design": "oak seedling reverse (Adolf Jäger) · value between rye ears / PFENNIG obverse", "period"…
- **C023 · Germany (Empire) · 1918 · 20 Pfennig · German Empire Mark system**: “A 1918 20 Pfennig from Germany. Large 20 in oak wreath, date 1918 (eagle or obverse mint letter often on the other side). Struck in iron (WWI-era emergency Notgeld family).” Record: {"country": "Germany (Empire)", "year": "1918", "denom": "20 Pfennig · German Empire Mark system", "mint": "unknown (not on this wreath side (often on eagle/obverse))", "refs": "unknown (no standard imperial iron 20 Pf KM; wartime iron Notgeld / ID soft)", "metal": "iron (WWI-era emergency / Notgeld family) · dark brown-grey patina / oxidized · circulated · white 2×2 staple flip", "specs": "unkno…
- **C024 · United Kingdom · 1977 · 2 new pence · GBP**: “A 1977 2 new pence from United Kingdom. The obverse shows Arnold Machin Elizabeth II; the reverse shows Plume of ostrich feathers in coronet; NEW PENCE (Ironside). Struck in bronze (97 Cu / 2.5 Zn / 0.5 Sn).” Record: {"country": "United Kingdom", "year": "1977", "denom": "2 new pence · GBP", "mint": "Royal Mint", "refs": "KM#916 · Schön#403 · Numista#664", "metal": "bronze (97 Cu / 2.5 Zn / 0.5 Sn) · 7.12 g · 25.9 mm · plain · dark brown circulated · white 2×2 staple flip", "specs": "thickness 1.85 mm · medal alignment · type specs shared with decimal 2p family · bronze era (pre–Sep 1992)", "mintage": "109,28…
- **C025 · France · 1965 · 1 franc · FRF (nouveau franc)**: “A 1965 1 franc from France. The obverse shows La Semeuse left (Oscar Roty); the reverse shows 1 FRANC; REPUBLIQUE FRANÇAISE, olive sprig, LIBERTE, EGALITE, FRATERNITE, date. Struck in nickel.” Record: {"country": "France", "year": "1965", "denom": "1 franc · FRF (nouveau franc)", "mint": "Monnaie de Paris", "refs": "KM#925.1 · Schön#233 · Numista#6", "metal": "nickel · 6.00 g · 24 mm · reeded · circulated · white 2×2 staple flip", "specs": "thickness 1.79 mm · coin alignment · type specs shared with nickel Semeuse 1 Fr 1960–2001 (KM#925.1) · magnetic Ni (not Ag)", "mintage": "44,286,591 (circu…

### 4. HW-grok-value-20261009-1 · Appraiser · Cite collector values for 25 coins · due 2026-10-19  (fix list #62)

For each coin, find the retail value for its type, date and mint in the grade its phone photo suggests, from a named price page (NGC World Price Guide, PCGS CoinFacts, or Numista's value table for that row). Send value.est_usd and value.confidence (med when the page gives that grade, low when you assumed it); source = the exact page URL and the grade you assumed and why. Silver coins are never below melt (data/prices.json has the spot). Leave a coin out when no page covers it.

**Done when:** One change file; coins without a price page left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-grok-value-20261009-1.jsonl (save your edited copy as changes_grok_YYYYMMDD-HHMM.jsonl)

Items:
- **C114 · Mexico (Chihuahua) · 1914 · 5 centavos · MXN revolutionary peso (Chihuahua · 1913–1915)**: now $12.00 (med)
- **C223 · Netherlands · 1967 · 1 gulden · NLG**: now $9.55 (high); silver 0.15 oz = melt $8.93. Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C223_rev.webp
- **C073 · USA · 1976 · 25 cents · USD · Bicentennial (1776–1976)**: now $6.50 (high)
- **C065 · Switzerland · 2014 · 5 francs · CHF**: now $6.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C065_rev.webp
- **C066 · Switzerland · 1978 · 5 francs · CHF**: now $6.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C066_rev.webp
- **T004 · USA · ca. 1970s · Miniature “penny” in printed cardboard flap**: now $5.00 (med)
- **C235 · Guatemala · 1934 · 10 centavos · GTQ**: now $4.90 (high); silver 0.077 oz = melt $4.58. Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C235_rev.webp
- **C088 · USA · 1957 · 10¢ Roosevelt**: now $4.59 (high); silver 0.0723 oz = melt $4.30. Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C088_obv.webp
- **C009 · Germany · 1987 · 5 Deutsche Mark · DEM**: now $3.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C009_obv.webp
- **C031 · Australia · 1943 · Threepence (3d) · AUD**: now $2.66 (high); silver 0.0419 oz = melt $2.49. Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C031_obv.webp
- **C003 · Switzerland · 1968 · 2 francs · CHF**: now $2.50 (high)
- **C014 · Switzerland · 1974 · 2 francs · CHF**: now $2.50 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C014_rev.webp
- **C067 · Switzerland · 1981 · 2 francs · CHF**: now $2.50 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C067_rev.webp
- **C077 · Switzerland · 1991 · 2 francs · CHF**: now $2.50 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C077_rev.webp
- **C115 · Switzerland · 1968 · 2 francs · CHF**: now $2.50 (high)
- **C116 · Switzerland · 1981 · 2 francs · CHF**: now $2.50 (high)
- **C242 · Switzerland · 1883 · 10 rappen · CHF**: now $2.50 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C242_obv.webp
- **C070 · Netherlands · 2002 · 2 euro · EUR**: now $2.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C070_obv.webp
- **C071 · Germany · 2003 · 2 euro · EUR**: now $2.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C071_obv.webp
- **C072 · France · 2000 · 2 euro · EUR**: now $2.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C072_obv.webp
- **C263 · Mexico · 1950 · 25 centavos · MXN**: now $2.00 (high); silver 0.0321 oz = melt $1.91. Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C263_rev.webp
- **C049 · France · 1989 · 10 francs · FRF**: now $1.50 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C049_rev.webp
- **C211 · Italy · 1987 · 500 lire · ITL**: now $1.50 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C211_rev.webp
- **T003 · USA · ND · Ride token (Sandy the Pony · Meijer)**: now $1.50 (med). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/T003_obv.webp
- **C001 · Switzerland · 1969 · 1 franc · CHF**: now $1.25 (high). Photo: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C001_rev.webp

## Projects (after the homework)

### Music: a recording for each of the 3 held pieces  [LATER]  (fix list #83)

Held in docs/music/wanted.json: Elgar Nimrod, Debussy Rêverie (only a saxophone arrangement found so far), Satie Gymnopédie 3 on piano (the search keeps finding No. 1). Handel's Largo is done: Lea Desandre with Les Arts Florissants (CC BY 3.0) is live since 2026-10-09. For each held piece, find one Wikimedia Commons file that is a real performance of exactly that piece (not a synth or MIDI render), public domain or CC BY / CC BY-SA, with the performer named; give the exact Commons file title, the license and the performer, the same way as your 2026-10-08 music check. Save it as music_grok_{YYYYMMDD-HHMM}.json in Drive 'music-requests'.

**Done when:** One JSON file with an exact Commons title (or 'none found' and why) for each held piece.

### Motion Lab study 2: the coin flip  [LATER]  (fix list #56)

Like your gold-dust study: one self-contained HTML file using ../js/three.min.js and a real coin's two photos (photos/p1/ coins with both sides), the coin flips with a moving rim light; Still / Calm / Full; must follow the app's Motion setting (localStorage titan.motion). Put it in Drive 'motion-lab-incoming'.

**Done when:** One HTML file Claude can drop into /motion-lab/.

### Read new coin photos (with Muse, blind)  [ALWAYS]  (fix list #55)

Whenever NOID photos appear in STAGING: Phase 1 change file per AI_START_HERE, without looking at Muse's read first (AI_START_HERE 2b).

**Done when:** Ongoing.

## Your numbers (measured, not self-reported)

- Assignments answered: 0; expired: 0.
- Your facts checked by another contributor: 23 (23 confirmed, 0 wrong; error rate 0.0 %, 95 % range 0-14 %). Checks you did for others: 0. Open disagreements you are part of: 0.
- Share of your new facts that get checked first: 15 %.
