<!-- doc-status: current; normative: yes (for Gemini) -->
# WORK QUEUE for Gemini (updated 2026-10-10 07:41 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** active (probation: every fact you write is checked by another AI until 3 submissions in a row score 8+). Vision (and Veo video). Back from parked on 2026-10-09: starts with a proof-of-access check, the blind photo test and small photo-reading batches; every fact it writes is checked by another AI until it has 3 good submissions in a row.
**How you get this:** Drive doc 'WORK QUEUE for Gemini' in Titan Reliquary/ (docs/agents/QUEUE_gemini.md). If it cannot write to Drive, it replies with the file in one code block and Joseph pastes it to Claude.

## Finish first

### Proof of access (do this first)  (fix list #4)

Three checks, answered in one short reply. (a) In this doc, find your first homework assignment below: give its id (it starts HW-gemini-) and how many items it has. (b) Open the first item's photo by its Drive link (the 'original' link) or its GitHub link: give the file name and say which side of the coin it shows and the year you can read. (c) Open https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/roles.json and give the value of "updated". If you cannot open something, say exactly which link failed and stop there: never describe a file you could not open (your last review was scored 1/10 for that). Save the reply as access_gemini_{YYYYMMDD-HHMM}.txt in Drive collection-incoming (AI change files), or reply in chat and Joseph pastes it to Claude.

**Done when:** Claude confirms all three answers against the files; then the homework below is yours.

## Calibration test due: the main photo pack (30 coins)  (fix list #4)

Open https://github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-main and follow its PROMPT.md (raw: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/bakeoff/pack-20261008-main/PROMPT.md). Answer ONLY from the photos: never search this repository or its data for the coins. Save `bakeoff_gemini_YYYYMMDD-HHMM.json` in Drive `Titan Reliquary/bakeoff (blind photo test)/` (or reply with it in chat). This is your first time with this pack.

**Done when:** the answer file is in Drive; Claude scores it and your numbers appear in collaborators/MODEL_ACCURACY.md.

## Homework (generated from the data)

How homework works (read once):
1. Each assignment has an id (HW-...). Answer ONE assignment per change file: `changes_{you}_{YYYYMMDD-HHMM}.jsonl` in Drive `Titan Reliquary/collection-incoming (AI change files)/`. Every line carries `"assignment": "<the id>"` inside `provenance`.
2. Start from the answer sheet: it is pre-filled (download it from the link, or copy the block). Change only `new` (when the record is wrong) and `source` (your exact source), and set `ts` to the current UTC time. A line whose source still starts with FILL counts as 'left out': no error, it simply goes back to the pool. Delete nothing else.
3. Never guess. Leave out what you cannot do; it goes to another AI or to Joseph. Two AIs that could not do an item park it.
4. You never get your own facts to check, and a check never overwrites: a value that disagrees is filed as a disagreement for a third reader.
5. Finish within the lease (the date on each assignment); after it the items go back to the pool.
6. When you finish, start the next assignment straight away. New assignments appear here after every merge.

### 1. HW-gemini-read-mint-20261009-1 · Photo reader · Read the mint mark on 5 coins from their photos · due 2026-10-16  (fix list #57)

Phase 1 cannot finish until every coin's mint mark is read. Open each coin's photo (GitHub link or Drive original), find the mint mark where this country puts it, and send `issue.mint_marks` (e.g. ["D"]) and `issue.mint_text` (e.g. "D (Denver), left of the date", or "no mint mark (Philadelphia)") with the photo file name in `source`. If the side with the mark is not in the photo, or you cannot read it at full zoom, leave the coin out: it goes on Joseph's shoot list. Never guess.

**Done when:** One change file; unreadable coins left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-gemini-read-mint-20261009-1.jsonl (save your edited copy as changes_gemini_YYYYMMDD-HHMM.jsonl)

Items:
- **C088 · USA · 1957 · 10¢ Roosevelt**: mint text now 1957 · mintmark not on obverse (1946–1964 mark is reverse — not shown). Photos: obv: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C088_obv.webp (original: https://drive.google.com/file/d/1CFp6DDPmszLTtmOAh_FkBTHRahIaQLYH/view). US mint marks: P (Philadelphia; most coins before 1980 carry none), D (Denver), S (San Francisco), W (West Point). On modern coins the mark is on the obverse near the date; on older ones often on the reverse.
- **C023 · Germany (Empire) · 1918 · 20 Pfennig · German Empire Mark system**: mint text now unknown (not on this wreath side (often on eagle/obverse)). Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C023_rev.webp (original: https://drive.google.com/file/d/1AvM21rocsNxH3aDzEmOFa5QZqFXsVwwP/view). German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.
- **C212 · Eritrea · 1997 · 50 cents · ERN (nakfa)**: mint text now not on shown reverse (Asmara / Royal Mint era typical). Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C212_rev.webp (original: https://drive.google.com/file/d/1lJ_hnOHicDrl48_DINrCEKsLoNLYLjio/view). Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none.
- **C219 · Jamaica · 2015 · 1 dollar · JMD**: mint text now not on shown reverse. Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C219_rev.webp (original: https://drive.google.com/file/d/17lWYcKIqJMMukdXfOkNIHAFQHvDR6kvt/view). Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none.
- **C230 · Jamaica · 2015 · 10 dollars · JMD**: mint text now not on shown arms side. Photos: rev: https://jpavia10.github.io/titan-reliquary-preview/photos/p1/C230_rev.webp (original: https://drive.google.com/file/d/15yFngSl6ciHYgZNxpIruxqZUmnHtF1gz/view). Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none.

Answer sheet (the same as the link):

```jsonl
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C088", "op": "set", "field": "issue.mint_marks", "old": [], "new": [], "source": "FILL: the photo file you read it from, e.g. C088_obv.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C088_obv.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C088", "op": "set", "field": "issue.mint_text", "old": "1957 · mintmark not on obverse (1946–1964 mark is reverse — not shown)", "new": "1957 · mintmark not on obverse (1946–1964 mark is reverse — not shown)", "source": "FILL: the photo file you read it from, e.g. C088_obv.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C088_obv.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C023", "op": "set", "field": "issue.mint_marks", "old": [], "new": [], "source": "FILL: the photo file you read it from, e.g. C023_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C023_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C023", "op": "set", "field": "issue.mint_text", "old": "unknown (not on this wreath side (often on eagle/obverse))", "new": "unknown (not on this wreath side (often on eagle/obverse))", "source": "FILL: the photo file you read it from, e.g. C023_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C023_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C212", "op": "set", "field": "issue.mint_marks", "old": [], "new": [], "source": "FILL: the photo file you read it from, e.g. C212_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C212_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C212", "op": "set", "field": "issue.mint_text", "old": "not on shown reverse (Asmara / Royal Mint era typical)", "new": "not on shown reverse (Asmara / Royal Mint era typical)", "source": "FILL: the photo file you read it from, e.g. C212_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C212_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C219", "op": "set", "field": "issue.mint_marks", "old": [], "new": [], "source": "FILL: the photo file you read it from, e.g. C219_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C219_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C219", "op": "set", "field": "issue.mint_text", "old": "not on shown reverse", "new": "not on shown reverse", "source": "FILL: the photo file you read it from, e.g. C219_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C219_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C230", "op": "set", "field": "issue.mint_marks", "old": [], "new": [], "source": "FILL: the photo file you read it from, e.g. C230_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C230_rev.webp"}]}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "specimen", "id": "C230", "op": "set", "field": "issue.mint_text", "old": "not on shown arms side", "new": "not on shown arms side", "source": "FILL: the photo file you read it from, e.g. C230_rev.webp, and where on the coin the mark is", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-read-mint", "assignment": "HW-gemini-read-mint-20261009-1", "run_id": "HW-gemini-read-mint-20261009-1", "inputs": [{"file": "C230_rev.webp"}]}}
```

### 2. HW-gemini-verify-20261009-1 · Second reader · Check 10 facts another AI wrote · due 2026-10-16  (fix list #18)

Each fact was written by ANOTHER contributor with one source. Find your own source for it: a different page is best, the same entry read again is fine. If your source agrees, send the value back unchanged with YOUR source: the fact becomes 'Checked' (two independent sources). If it disagrees, put your value in `new` with your source: nothing is overwritten; it is filed as a disagreement for a third reader or Joseph. Blind items (photo readings) do not show the current value: read the photo yourself.

**Done when:** One change file; a fact you could not check is left out.

**Answer sheet:** https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/homework/sheets/HW-gemini-verify-20261009-1.jsonl (save your edited copy as changes_gemini_YYYYMMDD-HHMM.jsonl)

Items:
- **mintage of C071 · Germany · 2003 · 2 euro · EUR** `type DE.KM.214 issues.0.mintage` = `20475000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista 2 euro Germany (1st map, N#112), 2003-A circulation)) [audit sample]
- **mintage of C070 · Netherlands · 2002 · 2 euro · EUR** `type NL.KM.241 issues.0.mintage` = `37200000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista, NL 2 euro 2002 (KM#241))) [audit sample]
- **mintage of C263 · Mexico · 1950 · 25 centavos · MXN** `type MX.KM.443 issues.0.mintage` = `77060000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista, MX 25c 1950 Mo balanza (KM#443); NGC and heritcoin agree)) [audit sample]
- **mintage of C211 · Italy · 1987 · 500 lire · ITL** `type IT.KM.111 issues.0.mintage` = `200000000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista, IT 500 lire 1987 R (KM#111) circulation; proof 10000 excluded)) [audit sample]
- **mintage of C084 · Italy · 2002 · 1 euro · EUR** `type IT.KM.216 issues.0.mintage` = `965725300` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista, IT 1 euro 2002 R (KM#216) circulation; BU 150000 excluded)) [audit sample]
- **catalog of C164 · United Kingdom · 1932 · ½ penny · GBP** `type GB.KM.837 catalogs` = `[{"number": "837", "system": "KM"}, {"number": "4004", "system": "Numista", "url": "https…` (written by Grok: Numista N#4004 (https://en.numista.com/catalogue/pieces4004.html) references: KM# 837, Sp# 4058, Schön# 15c; Numista also lists Spink 4058 a)
- **mintage of C103 · Germany · 1982 · 1 Deutsche Mark · DEM** `type DE.KM.110 issues.0.mintage` = `11520000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista N#846, 1982-J circulation)) [audit sample]
- **mintage of C050 · Germany · 1982 · 1 Deutsche Mark · DEM** `type DE.KM.110 issues.1.mintage` = `70000000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista N#846, 1982 year total; no mint mark recorded)) [audit sample]
- **mintage of C006 · Germany · 1984 · 1 Deutsche Mark · DEM** `type DE.KM.110 issues.2.mintage` = `32400000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista N#846 (DE.KM.110, 1 DM), 1984 year total; no mint mark recorded)) [audit sample]
- **mintage of C048 · Germany · 1993 · 1 Deutsche Mark · DEM** `type DE.KM.110 issues.3.mintage` = `8400000` (written by Muse: Titan Round 4 mintage research 2026-10-03 (Numista N#846, 1993-D circulation)) [audit sample]

Answer sheet (the same as the link):

```jsonl
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "DE.KM.214", "op": "set", "field": "issues.0.mintage", "old": 20475000, "new": 20475000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "NL.KM.241", "op": "set", "field": "issues.0.mintage", "old": 37200000, "new": 37200000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "MX.KM.443", "op": "set", "field": "issues.0.mintage", "old": 77060000, "new": 77060000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "IT.KM.111", "op": "set", "field": "issues.0.mintage", "old": 200000000, "new": 200000000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "IT.KM.216", "op": "set", "field": "issues.0.mintage", "old": 965725300, "new": 965725300, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "GB.KM.837", "op": "set", "field": "catalogs", "old": [{"number": "837", "system": "KM"}, {"number": "4004", "system": "Numista", "url": "https://en.numista.com/catalogue/pieces4004.html"}], "new": [{"number": "837", "system": "KM"}, {"number": "4004", "system": "Numista", "url": "https://en.numista.com/catalogue/pieces4004.html"}], "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "DE.KM.110", "op": "set", "field": "issues.0.mintage", "old": 11520000, "new": 11520000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "DE.KM.110", "op": "set", "field": "issues.1.mintage", "old": 70000000, "new": 70000000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "DE.KM.110", "op": "set", "field": "issues.2.mintage", "old": 32400000, "new": 32400000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
{"ts": "2026-10-09T14:42:02Z", "by": "model:gemini", "entity": "type", "id": "DE.KM.110", "op": "set", "field": "issues.3.mintage", "old": 8400000, "new": 8400000, "source": "FILL: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "gemini", "prompt_version": "HOMEWORK@2026-10-09", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261009-1", "run_id": "HW-gemini-verify-20261009-1", "inputs": []}}
```

## Projects (after the homework)

### Read new coin photos as the third blind reader  [ALWAYS]  (fix list #55)

After the access check and the photo test: whenever NOID photos appear in Drive STAGING, write a Phase 1 change file for them per AI_START_HERE (section 2b), without looking at Grok's or Muse's reads first.

**Done when:** Ongoing.

### Open art and video jobs  [LATER]  (fix list #35)

The art queue (ART_START_HERE in Drive): claim a job before starting. Paused while video credits are low and the design is not chosen (#30).

**Done when:** When credits allow and Joseph asks.

## Your numbers (measured, not self-reported)

- Assignments answered: 0; expired: 0.
- None of your facts has been checked by another contributor yet.
- Share of your new facts that get checked first: 100 %.
