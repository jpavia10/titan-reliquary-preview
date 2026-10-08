# Titan Reliquary · Deep review, round 1 · Grok Bot (Titan Reliquary agent)

Finding IDs use `GRK-{section}-{nn}`. "UNVERIFIED" marks anything I didn't check myself. Every catalogue claim gives the exact URL I fetched, and a fact I could only see in a search-result snippet is labelled that way. This is a read-only review. I edited nothing on GitHub or Drive and put nothing in `collection-incoming`. The change lines in section 2 are a proposal for Claude to merge (or not).

---

## 0. Header

| Item | Value |
|---|---|
| Model / version | Grok Bot (Titan Reliquary agent); provenance model id `grok-bot` |
| Prompt | `docs/prompts/DEEP_REVIEW_ROUND1.md` (owner's brief, sections 0-8) |
| Started / finished | Wed 2026-10-07 19:08 PT / 19:40 PT (box clock, America/Los_Angeles) |
| Repo state reviewed | fresh clone of `jpavia10/titan-reliquary-preview` at `20d35a78afd6727dc196166a1491f56d9146f310` (committed 2026-10-07 18:46 PT), build tr98. I did not use the older box copy `/workspace/titan-reliquary-preview` as a source. |
| Run id | `grok-bot-deep-review-20261007-1908` |

**What I read in the repo (all at the commit above):**
`CLAUDE.md`, `AI_START_HERE.md`, `docs/FIX_LIST.md`, `collection/CURATION_OPEN.md`, `collection/templates/INSTRUCTIONS.md`, `collection/templates/FIELDS.md`, `collection/changes.jsonl` (2,113 lines, searched and read in the Muse Round 3/4 region), `collection/types/*.json`, `collection/specimens/*.json`, `collection/albums.json`, `collection/owner_questions.json`, `data/status.json`, `data/index.json`, `data/prices.json`, `data/questions.json`, `data/detail/*.json` (certainty counts), and code: `tools/pipeline/publish.py` (all of it), `tools/pipeline/apply_changes.py` (all of it), `tools/pipeline/provenance.py` (lines 1-112), `sw.js` (all of it), `app.js` (fetch/detail paths 392-443, plus reduced-motion grep), `wings/questions.js` (lines 15-40, 114), `splash.js` (lines 15-40, 205-268, 325-383), `splash.css` (lines 51-67), `styles/simple.css` (all of it), `styles/atmo/afterhours.css` and `conservator.css` (colour tokens), `wings/fx/engine.js` (reduced-motion paths), `atlas.js` (data tables), `tools/smoke/smoke.py` (lines 101-116), `.github/workflows/prices.yml`.

**What I ran (on the box, in a scratch copy, never in the clone or on GitHub):**
- Pipeline tests with `jsonschema` installed in a venv: `test_pipeline.py` 37/37 pass, `test_migrations.py` 11/11 pass, `test_value_history.py` OK, `test_parity.py` OK. Without `jsonschema`, 24 of the 37 fail with a misleading message (GRK-3-13).
- `publish.py --no-incoming --now 2026-10-07T22:29:15Z` in scratch gave **zero git diff** against the committed `data/`, so `data/` is reproducible from `collection/`.
- `node --check` on every non-minified JS file passes.
- `apply_changes.py --dry-run` with three small probe files (GRK-3-03, GRK-3-04) and with the section 2 change file (accepted: 32 events, dry run, nothing written).
- Contrast ratios worked out with the WCAG 2.x formula (script `contrast.py`).
- Headless Google Chrome (SwiftShader WebGL) load of the Motion Lab study (section 6), served over http from a scratch copy, plus a `file://` load to test the fallback.

**Drive (read-only):** `FEEDBACK for Grok (read before your next submission)` (id `1A-EmEtXx-ObtCxXi9EX9Atl0QHhR-1s7Plyty1ftMMo`), and `AI_START_HERE (any AI reads this first)` (id `1A3KYOQpwbGDkCvDtQ7WiK_IKxTCftUWfztzTpRWTI5s`, read from its search snippet, which holds the whole 1,950-byte doc). I located `reviews-incoming (AI deep reviews)` (folder id `1TwMHllmBubtAgoPi3F3tiqquwxMSDri5`). I did not open the archived Grok ledger under `_archive`.

**External URLs fetched successfully (content seen):**
- Numista: https://en.numista.com/catalogue/pieces5904.html, https://en.numista.com/catalogue/pieces549.html, https://en.numista.com/catalogue/pieces2183.html, https://en.numista.com/catalogue/pieces2187.html, https://en.numista.com/catalogue/index.php?r=malta+euro+cent&ct=coin&mode=simplifie, https://en.numista.com/catalogue/pieces2562.html, https://en.numista.com/catalogue/pieces149.html, https://en.numista.com/catalogue/pieces3752.html, https://en.numista.com/catalogue/pieces844.html, https://en.numista.com/catalogue/pieces1935.html, https://en.numista.com/catalogue/pieces1442.html, https://en.numista.com/catalogue/pieces10856.html, https://en.numista.com/catalogue/pieces1190.html
- Wikipedia raw wikitext: https://en.wikipedia.org/w/index.php?title=Five_pence_(British_coin)&action=raw, https://en.wikipedia.org/w/index.php?title=Ten_pence_(British_coin)&action=raw, https://en.wikipedia.org/w/index.php?title=Penny_(British_decimal_coin)&action=raw
- https://coinhunter.co.uk/2010/, https://coinhunter.co.uk/2015/
- PCGS CoinFacts: https://www.pcgs.com/coinfacts/coin/1957-d-10c/5115, https://www.pcgs.com/coinfacts/coin/1976-d-25c-clad/5897, https://www.pcgs.com/coinfacts/coin/1976-25c-clad/5896 (and https://www.pcgs.com/coinfacts/coin/1957-10c/5114 loaded, but I couldn't find the mintage figure in the page text)

**External URLs that failed (anything from these is marked "search snippet only"):**
- Numista blocked direct fetch with a "Verification successful… Enable JavaScript and cookies" page, retried at least once: pieces2403 (Eritrea 50c), pieces2940 (Saudi 1 qirsh), pieces5712 (East Caribbean 10c), pieces6694 (Mexico 10 centavos), pieces189 (Swiss 2 francs). I only saw their facts in search-engine result snippets.
- Royal Mint mintage pages (filled in by JavaScript; no figures in the HTML) and onlinecoin.club (browser check). curl gets HTTP 403 from Numista, NGC and ucoin.

---

## 1. State check (claims that disagree with each other or with the code)

| ID | Source A (quoted) | Source B (quoted or measured) | Which is right |
|---|---|---|---|
| GRK-1-01 | `collection/CURATION_OPEN.md:109` "## 8. Album volumes that need the owner's fresh scans (Phase 1.5): 23 of 33" | `CLAUDE.md:90` "**All 33 albums read from page photos** (needs_scan 0)", `docs/FIX_LIST.md:14` "all 33 albums read from your page photos"; `collection/albums.json` has `needs_scan: true` on **0 of 33** (counted) | B. CURATION section 8 is stale and should be closed. |
| GRK-1-02 | `docs/FIX_LIST.md:22` "the app works offline"; `:20` "a 23-point phone + desktop smoke test (offline included)" | `sw.js:12-95` precaches only the shell and wings; `data/detail/*.json`, `data/search.json`, `data/questions.json` and `photos/p1/*` are fetched on demand (`sw.js:153-156`, `app.js:436-443`). `tools/smoke/smoke.py:101-116` only checks that the Hall total shows after an offline reload. | B. Only the Hall works offline unless the coin, photo or search was opened before (GRK-3-01). |
| GRK-1-03 | `CLAUDE.md:146` and `:152` "5 type conflicts to check physically" | `CURATION_OPEN.md` section 1 (lines 7-25): two of its entries are struck out as settled (C139 → ES.KM.1144, line 13; C183 → GB.KM.1334, line 17). Still open: T001/T002 stars, C153 lion vs shield, NO.KM.460 Schön. | B: three open, not five. |
| GRK-1-04 | `docs/FIX_LIST.md:82` (#39) "Fix the 12 catalog numbers Muse flagged… Spain 2014 cent… Turkey…" and `CURATION_OPEN.md:85` "C139 Spain 2014 1 cent = KM#1144 (re-attribute from ES.KM.1040), C208 Turkey 10 kurus = KM#1241" | Records: C139 is already on type `ES.KM.1144` (catalogs KM#1144, Numista#10856) and C208 is already on `TR.KM.1241` (`CURATION_OPEN.md:52` "C208 moved to TR.KM.1241") | B. Two of the 12 are done, so #39 has 10 left (section 2 supplies the evidence for them). |
| GRK-1-05 | `docs/FIX_LIST.md:82` "Numista is blocked from my container, so NGC or a catalogue page instead"; `CLAUDE.md:72` (tr95) "Numista is blocked from the container (egress)" | From this box, Numista type pages load through a page fetcher (13 fetched for this review, listed in section 0). Direct curl gets 403 and some pages hit a JavaScript check. | Both are true for their own machine. What matters: another agent can supply Numista evidence, so #39 and #40 don't have to wait for Claude's container. |
| GRK-1-06 | `CURATION_OPEN.md:25` "Numista N#1442 added to the type. Neither NGC nor Numista gives a Schön number" | https://en.numista.com/catalogue/pieces1442.html References: "KM# 460 … Schön# 107" | B. Numista gives Schön# 107. The type still carries both `Schön 76` and `Schön 107` (fix in section 2). |
| GRK-1-07 | `docs/FIX_LIST.md:15` "**1** fact confirmed by you"; `:26` "1 confirmed by you" | `collection/changes.jsonl`: 4 events by `owner`, **0** with `verified: true` (counted). `data/detail` certainty levels: `owner` 1, `verified` 0 (counted: ai 680, reference 146, photo 81, review 56, owner 1 = 964, which matches the 964 total). The one fact is line 663 (C273 notes, source "owner confirmed in chat 2026-10-02: the year is 2005", `verified: false`). | The totals are right, but "confirmed by you" overstates it: nothing has been confirmed with the app's Confirm (verified) yet. Say "1 owner-stated, 0 confirmed". |
| GRK-1-08 | `CURATION_OPEN.md:95` "**Silver in binders is not counted.** … is in no total" | `CURATION_OPEN.md` section 7b (line 97 on) "So album silver IS in the 63.27 oz board total (the note below that said it was in no t[otal]…" | 7b is right. Delete the line 95 bullet. |
| GRK-1-09 | `CLAUDE.md:12` "`app.js` (~7.5k lines), `styles.css` (~11.5k lines)" | `wc -l`: app.js **7,119**, styles.css 11,553; `docs/FIX_LIST.md:100` "7,300 → 7,119 lines" | B for app.js. Minor, but CLAUDE.md is what every agent reads first. |
| GRK-1-10 | `docs/FIX_LIST.md:11` "**$5,369** headline value, priced daily from real spot" | `data/prices.json` `board_quote` is dated 2026-09-30 (Ag $60.586) with total_usd 5,365.54, while `latest` is 2026-10-07 22:28 UTC (15:28 PT), Ag $59.881 / Au $4,106.0. `data/index.json` `board.grand` 5,369.19 is the 09-30 ledger board. The Hall itself uses `prices.latest` first (`wings/hall.js:89-92`). | The app is right. The doc's "$5,369" is a 7-day-old frozen board figure. At today's spot the bullion and flip silver/gold (about 38.37 oz Ag + 0.1322 oz Au) come out roughly $34 lower. That's my own arithmetic, so treat it as approximate. |

---
## 2. Data truth audit

How I worked: I dumped all 285 specimens with their type facts (`dump.py`), wrote a scanner for internal contradictions (`scan.py`: same type, year and mint with different mintages; numeric mintage next to "unknown" text; weight outside the nominal range; catalogue numbers that don't match the type id), then checked the riskiest records against the exact catalogue entries. I ranked them by how sure I am and how much they matter. Two patterns account for most of the errors:

1. **Muse Round 4 mintages that belong to a neighbouring coin.** These are the 10 su figure filed on the 20 su, a Philadelphia figure filed on unsorted or unknown-mint US coins, and the GB 2010 figures (which have no change event, so they came in with the ledger import).
2. **The Krause numbers Muse flagged are real errors.** I could confirm every one I was able to open.

### 2a. Top 25, strongest first

| # | ID | Record · field | Current | Proposed | Source (exact) | Conf. |
|---|---|---|---|---|---|---|
| 1 | GRK-2-01 | C258 · `issue.mintage` | 20,000,000 | **15,000,000** | Numista N#5904 https://en.numista.com/catalogue/pieces5904.html (20 Xu 1953 mintage 15 000 000). The current number came from `changes.jsonl:1502`, whose source reads "Numista, VN-SOV 10 su 1953 KM#1…", i.e. the 10 Xu figure. | high |
| 2 | GRK-2-02 | VN-SOV.KM.1 · `catalogs` | KM#1 | **KM#2**, Schön#36, Numista#5904 | same page: References "KM# 2 … Schön# 36". KM#1 is the 10 Xu. The type id stays (ids are permanent). | high |
| 3 | GRK-2-03 | VN-SOV.KM.1 · `nominal` | weight range 1.5-2 g, diameter range 23-24 mm (ledger) | **2.2 g, 27 mm** (ranges cleared) | same page: Weight 2.2 g, Diameter 27 mm | high |
| 4 | GRK-2-04 | GR.KM.117 (C248) · `catalogs` | KM#117, Schön#48 | **KM#130, Schön#140**, Numista#549 | https://en.numista.com/catalogue/pieces549.html (2 Drachmes 1982, Karaiskakis): "KM# 130 … Schön# 140". The 1982 mintage of 64,414,000 already on C248 is correct. Weight 6.1 → 6 g. | high |
| 5 | GRK-2-05 | C248 · `story` | "…obverse shows Manto Mavrogenous…" (Muse story, `changes.jsonl:1073`) | Replace with Georgios Karaiskakis (the 1982-1986 2-drachma portrait). Mavrogenous is the later 2-drachma design. | N#549 (as above), titled "Karaiskakis" | high (not in the jsonl: a story is free text, and Claude or the owner should reword it) |
| 6 | GRK-2-06 | MT.KM.128 (C028, 5 c 2013) · `catalogs` | KM#128 | **KM#127**, Numista#2183 | https://en.numista.com/catalogue/pieces2183.html (5 Euro Cent, KM# 127; 2013 mintage 10 000 000, which matches C028) | high |
| 7 | GRK-2-07 | MT.KM.132 (C064, €1 2008) · `catalogs` | KM#132 | **KM#131**, Numista#2187 | https://en.numista.com/catalogue/pieces2187.html (1 Euro KM# 131; "2008 F" mintage 14 000 000, which matches C064) | high |
| 8 | GRK-2-08 | MT.KM.129 (C043, 10 c 2008) · `catalogs` | KM#129 | **KM#128**, Numista#2184 | Numista listing https://en.numista.com/catalogue/index.php?r=malta+euro+cent&ct=coin&mode=simplifie (10 c = KM#128, 20 c = KM#129) | high |
| 9 | GRK-2-09 | NL.KM.170 (C198, 1 c 1948) · `catalogs` | KM#170, Schön#58 | **KM#175, Schön#60**, Numista#2562 | https://en.numista.com/catalogue/pieces2562.html ("KM# 175 … Schön# 60"; 1948 mintage 175 000 000, which matches) | high |
| 10 | GRK-2-10 | NL.KM.239 (C040, 20 c 2001) · `catalogs` | KM#239, Schön#115 | **KM#238, Schön#121**, Numista#149 | https://en.numista.com/catalogue/pieces149.html ("KM# 238 … Schön# 121"; 2001 mintage 97 600 000, which matches). KM#239 is the 50 c. | high |
| 11 | GRK-2-11 | PH.KM.198 (C246, 10 sentimos 1971) · `composition`, `nominal` | aluminum, 1.5 g, 19 mm | **nickel brass (Cu 70 / Zn 18 / Ni 12), 2 g, 17.85 mm** | https://en.numista.com/catalogue/pieces3752.html | high |
| 12 | GRK-2-12 | GB.KM.1109 · `issues.1.mintage` (2010; C178, C179) | 180,250,500 | **396,245,500** | https://en.wikipedia.org/w/index.php?title=Five_pence_(British_coin)&action=raw (row "2010 ‖ 396,245,500") and https://coinhunter.co.uk/2010/ | high |
| 13 | GRK-2-13 | GB.KM.1110 · `issues.0.mintage` (2010; C154) | 25,320,500 | **96,600,500** | https://en.wikipedia.org/w/index.php?title=Ten_pence_(British_coin)&action=raw (row "2010 ‖ 96,600,500"), https://coinhunter.co.uk/2010/ | high |
| 14 | GRK-2-14 | GB.KM.1107 · `issues.0.mintage` (2010; C218) | 421,002,000 | **609,603,000** | https://en.wikipedia.org/w/index.php?title=Penny_(British_decimal_coin)&action=raw (row "2010 ‖ 609,603,000"), https://coinhunter.co.uk/2010/ | high |
| 15 | GRK-2-15 | GB.KM.1334 · `issues.1.mintage` (2015; C183 holds 163,000,000) | null on the type, 163,000,000 on C183 | **536,600,000** | Five pence raw (2015 has two rows: 163,000,000 Rank-Broadley and 536,600,000 Clark), https://coinhunter.co.uk/2015/. C183 is the Clark portrait (`CURATION_OPEN.md:17`). | high |
| 16 | GRK-2-16 | C073 (26 × 1976 quarters, "mixed P/D") · `issue.mintage` | 809,784,016 (the Philadelphia figure; `changes.jsonl:1467`) | **null**, with `mintage_text` "mixed tube: 1976 P 809,784,016 + 1976 D 860,118,839" | https://www.pcgs.com/coinfacts/coin/1976-25c-clad/5896, https://www.pcgs.com/coinfacts/coin/1976-d-25c-clad/5897 | high |
| 17 | GRK-2-17 | C088 (1957 dime, mint "not shown") · `issue.mintage` | 160,160,000 (Philadelphia; `changes.jsonl:1468`) | **null**, with `mintage_text` naming both | https://www.pcgs.com/coinfacts/coin/1957-d-10c/5115 (1957-D 113,354,330). The 160,160,000 Philadelphia figure is the one already on the record; I didn't find it in the PCGS page text (UNVERIFIED here). | high |
| 18 | GRK-2-18 | NO.KM.460 (C144, C268) · `catalogs` | KM#460, Schön#76, Schön#107, Numista#1442 | KM#460, **Schön#107**, Numista#1442 | https://en.numista.com/catalogue/pieces1442.html (Schön# 107 only). C144 30,898,003 and C268 18,966,552 are correct per the same page. | high |
| 19 | GRK-2-19 | DE.KM.124 (C238) · `composition.text` | "CuNi" | **copper-nickel clad nickel** | https://en.numista.com/catalogue/pieces844.html and https://en.numista.com/catalogue/pieces1935.html (both 2 Mark portraits) | high |
| 20 | GRK-2-20 | CH.KM.21a 1968 B · mintage, C003 vs C115 | type issue and C003: 10,000,000 ("~10,000,000"); C115: 31,588,000 | **31,588,000** on the type issue and C003 (one issue, one number) | Numista N#189 (search snippet only; direct fetch blocked). The contradiction itself is certain: the same type, year and mint show two different mintages in the app (`display.py:160-163` shows C003's text and C115's number). | med-high |
| 21 | GRK-2-21 | ER.KM.46 (C212, 50 c 1997) · `catalogs`, `composition`, `nominal` | KM#46, nickel-plated steel, 5.0 g, 24.5 mm | **KM#47**, nickel-clad steel, 7.8 g, 25 mm; Numista#2403 | search snippet only (Numista N#2403; NGC "eritrea-50-cents-km-47-1997" price-guide URL seen in results, not fetched). Muse and Claude both flag KM#47 (`CURATION_OPEN.md:85`). | med |
| 22 | GRK-2-22 | MX.KM.433 (C161, 10 centavos 1945) · `catalogs`, `composition`, `nominal.weight_g` | KM#433, bronze, weight null (ledger range) | **KM#432**, copper-nickel (Cu 80 / Ni 20), 5.5 g; Numista#6694. 1945 mintage 9,558,000 OK. | search snippet only (N#6694). C161 is on the approximate-weight list (`CURATION_OPEN.md:47`). | med |
| 23 | GRK-2-23 | SA.KM.20 (C231, 1 qirsh AH1378) · `catalogs`, `nominal`, `issue.year` | KM#20, no weight or diameter, year 1958 | **KM#40**, 3.2 g, 22 mm (CuNi); AH1378 shown by Numista as 1959 | search snippet only (N#2940). Before changing the year, convert AH1378 → AD with a proper converter (AH1378 runs from July 1958 to July 1959). | med |
| 24 | GRK-2-24 | EC.KM.38 (C159, 10 c 2004) · `catalogs` | KM#38 | **KM#37** (Numista#5712: 2002-2007, 2.59 g, 18.06 mm) | search snippet only (N#5712; fetch blocked) | med |
| 25 | GRK-2-25 | DE.KM.124 (C238, 2 DM 1973 D) · `catalogs` | KM#124 **and** KM#A127 on one type | One portrait per type: Adenauer = KM#124 / J.406 / N#844, Heuss = KM#A127 / J.407 / N#1935. The mintage on file (10,393,000) is the **Adenauer 1973 D** figure; Heuss 1973 D is 10,379,000. | N#844 and N#1935 (fetched) | med (the owner has to say which portrait it is: question 1 in section 8) |

**Other things I noticed but kept out of the top 25:**
- **Malta Schön numbers** (MT.KM.128/129/132 carry Schön#128/129/132, the same digits as the wrong KM numbers). They look copied from the KM column. UNVERIFIED: I kept them unchanged in the change lines and flagged them here.
- **C064 mint mark.** Numista lists the 2008 €1 as "2008 F" (https://en.numista.com/catalogue/pieces2187.html). C064 has `mint_marks: []` and mint_text "often Paris/Utrecht contract". This needs a look at the coin before writing `F` (question 5).
- **C246 mint_text** says "Manila / BSP era", while my notes from N#3752 attribute the 1971 striking to the US Mint (Denver). I'm not certain enough of that detail to propose it. UNVERIFIED.
- **FR.KM.888b.1 weight.** 3.75 g on the specimen against a 3.5 g nominal. N#1190 (https://en.numista.com/catalogue/pieces1190.html) notes heavier 1945 strikes, and the 1946 mintage of 61,332,000 is correct. Low confidence, so it's not in the change lines.
- **Systemic: 114 specimens carry a number in `issue.mintage` while `issue.mintage_text` still says "unknown…".** The app hides this (`display.py:162` prefers the number), but search (`build_app_data.py:62` indexes `mintage`) and anyone reading the JSON see both. Root cause is GRK-3-05.
- **Checked and correct (no change):** HK KM#69a cupronickel; TW Y#551 Cu 92 / Ni 6 / Al 2; C139 Spain 2014 1 c = KM#1144 / N#10856 with 2014 mintage 69,400,000 (https://en.numista.com/catalogue/pieces10856.html); the GB mintages other than the four above; C144 and C268 Norway mintages; C198 and C040 mintages.
- **Not checked (UNVERIFIED):** VN 1000 đồng composition, TT 25 c, GR.KM.90 1970, missing Swiss mint marks on C066/C278, round-number German mintages (C037 3,509,935,000).

### 2b. Change lines (high confidence only)

This file was dry-run against a scratch copy of `collection/` with `tools/pipeline/apply_changes.py --dry-run`: **"APPLIED changes_grok-bot_20261007-1908.jsonl: 32 event(s) merged (dry run, nothing written)"**, including one re-cite (C246 mintage unchanged, exact source added). Every line carries `old` (stale-edit guard), `phase: 2`, `verified: false`, an exact source and the provenance object. Notes:
- The GB type mintage events also update the matching specimens through `issue_copies` (`apply_changes.py:416-420`), and `after_set` clears any `mintage_text` that contradicts the new number (`apply_changes.py:428-436`).
- It is **not** in `collection-incoming`. Suggested name if Claude chooses to merge it: `changes_grok-bot_20261007-1908.jsonl`.

```jsonl
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "catalogs", "old": [{"number": "1", "system": "KM"}], "new": [{"number": "2", "system": "KM"}, {"number": "36", "system": "Schön"}, {"number": "5904", "system": "Numista"}], "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): 20 Xu 1953 State of Vietnam, references KM# 2, Schön# 36; KM#1 is the 10 Xu", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.weight_min_g", "old": 1.5, "new": null, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): weight 2.2 g (replaces the ledger's ~1.5-2 g range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.weight_max_g", "old": 2.0, "new": null, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): weight 2.2 g (replaces the ledger's ~1.5-2 g range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.weight_approx", "old": true, "new": false, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): weight 2.2 g (replaces the ledger's ~1.5-2 g range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.weight_g", "old": null, "new": 2.2, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): weight 2.2 g (replaces the ledger's ~1.5-2 g range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.diameter_min_mm", "old": 23.0, "new": null, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): diameter 27 mm (replaces the ledger's 23-24 mm range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.diameter_max_mm", "old": 24.0, "new": null, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): diameter 27 mm (replaces the ledger's 23-24 mm range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.diameter_approx", "old": true, "new": false, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): diameter 27 mm (replaces the ledger's 23-24 mm range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "VN-SOV.KM.1", "field": "nominal.diameter_mm", "old": null, "new": 27, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): diameter 27 mm (replaces the ledger's 23-24 mm range)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/VN.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "specimen", "id": "C258", "field": "issue.mintage", "old": 20000000, "new": 15000000, "source": "Numista N#5904 (https://en.numista.com/catalogue/pieces5904.html): 1953 mintage 15 000 000 for the 20 Xu; the 20,000,000 in changes.jsonl line 1502 is the 10 Xu (KM#1) figure", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/specimens/VN.json"}, {"file": "collection/changes.jsonl"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "GR.KM.117", "field": "catalogs", "old": [{"number": "117", "system": "KM"}, {"number": "48", "system": "Schön"}], "new": [{"number": "130", "system": "KM"}, {"number": "140", "system": "Schön"}, {"number": "549", "system": "Numista"}], "source": "Numista N#549 (https://en.numista.com/catalogue/pieces549.html): Greece 2 Drachmes 1982 (Karaiskakis), references KM# 130, Schön# 140", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/GR.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "GR.KM.117", "field": "nominal.weight_g", "old": 6.1, "new": 6, "source": "Numista N#549 (https://en.numista.com/catalogue/pieces549.html): weight 6 g", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/GR.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "MT.KM.128", "field": "catalogs", "old": [{"number": "128", "system": "KM"}, {"number": "128", "system": "Schön"}], "new": [{"number": "127", "system": "KM"}, {"number": "128", "system": "Schön"}, {"number": "2183", "system": "Numista"}], "source": "Numista N#2183 (https://en.numista.com/catalogue/pieces2183.html): Malta 5 Euro Cent, KM# 127 (2013 mintage 10 000 000); Schön entry left unchanged, not checked", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/MT.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "MT.KM.129", "field": "catalogs", "old": [{"number": "129", "system": "KM"}, {"number": "129", "system": "Schön"}], "new": [{"number": "128", "system": "KM"}, {"number": "129", "system": "Schön"}, {"number": "2184", "system": "Numista"}], "source": "Numista N#2184, Malta 10 Euro Cent = KM# 128, per the Numista listing https://en.numista.com/catalogue/index.php?r=malta+euro+cent&ct=coin&mode=simplifie ; Schön entry left unchanged, not checked", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/MT.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "MT.KM.132", "field": "catalogs", "old": [{"number": "132", "system": "KM"}, {"number": "132", "system": "Schön"}], "new": [{"number": "131", "system": "KM"}, {"number": "132", "system": "Schön"}, {"number": "2187", "system": "Numista"}], "source": "Numista N#2187 (https://en.numista.com/catalogue/pieces2187.html): Malta 1 Euro, KM# 131 (2008 F mintage 14 000 000); Schön entry left unchanged, not checked", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/MT.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "NL.KM.170", "field": "catalogs", "old": [{"number": "170", "system": "KM"}, {"number": "58", "system": "Schön"}], "new": [{"number": "175", "system": "KM"}, {"number": "60", "system": "Schön"}, {"number": "2562", "system": "Numista"}], "source": "Numista N#2562 (https://en.numista.com/catalogue/pieces2562.html): Netherlands 1 Cent 1948 Wilhelmina, references KM# 175, Schön# 60; 1948 mintage 175 000 000", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/NL.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "NL.KM.239", "field": "catalogs", "old": [{"number": "239", "system": "KM"}, {"number": "115", "system": "Schön"}], "new": [{"number": "238", "system": "KM"}, {"number": "121", "system": "Schön"}, {"number": "149", "system": "Numista"}], "source": "Numista N#149 (https://en.numista.com/catalogue/pieces149.html): Netherlands 20 Euro Cents Beatrix 1999-2006, references KM# 238, Schön# 121; 2001 mintage 97 600 000", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/NL.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "PH.KM.198", "field": "composition.text", "old": "aluminum", "new": "nickel brass (Cu 70 / Zn 18 / Ni 12)", "source": "Numista N#3752 (https://en.numista.com/catalogue/pieces3752.html): composition nickel brass (copper 70%, zinc 18%, nickel 12%)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/PH.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "PH.KM.198", "field": "composition.metal_class", "old": "aluminum", "new": "brass", "source": "Numista N#3752 (https://en.numista.com/catalogue/pieces3752.html): nickel brass", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/PH.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "PH.KM.198", "field": "nominal.weight_g", "old": 1.5, "new": 2, "source": "Numista N#3752 (https://en.numista.com/catalogue/pieces3752.html): weight 2 g", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/PH.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "PH.KM.198", "field": "nominal.diameter_mm", "old": 19.0, "new": 17.85, "source": "Numista N#3752 (https://en.numista.com/catalogue/pieces3752.html): diameter 17.85 mm", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/PH.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "specimen", "id": "C246", "field": "issue.mintage", "old": 80000000, "new": 80000000, "source": "Numista N#3752 (https://en.numista.com/catalogue/pieces3752.html): 10 Sentimos 1971 mintage 80 000 000 (re-cite: changes.jsonl line 1492 cited the 25 sentimos)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/specimens/PH.json"}, {"file": "collection/changes.jsonl"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "DE.KM.124", "field": "composition.text", "old": "CuNi", "new": "copper-nickel clad nickel", "source": "Numista N#844 (https://en.numista.com/catalogue/pieces844.html) and N#1935 (https://en.numista.com/catalogue/pieces1935.html): both 2 Mark 1969-1987 types (Adenauer, Heuss) are copper-nickel clad nickel", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/DE.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "NO.KM.460", "field": "catalogs", "old": [{"number": "460", "system": "KM"}, {"number": "76", "system": "Schön"}, {"number": "107", "system": "Schön"}, {"number": "1442", "system": "Numista"}], "new": [{"number": "460", "system": "KM"}, {"number": "107", "system": "Schön"}, {"number": "1442", "system": "Numista"}], "source": "Numista N#1442 (https://en.numista.com/catalogue/pieces1442.html): Norway 50 Øre NOREG, references KM# 460, Schön# 107 (no Schön# 76)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/NO.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "GB.KM.1334", "field": "issues.1.mintage", "old": null, "new": 536600000, "source": "https://en.wikipedia.org/w/index.php?title=Five_pence_(British_coin)&action=raw mintage table: 2015 = 163,000,000 (Rank-Broadley) + 536,600,000 (Clark); https://coinhunter.co.uk/2015/ lists 536,600,000; C183 is the Clark portrait (CURATION_OPEN.md section 1)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/GB.json"}, {"file": "collection/CURATION_OPEN.md"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "GB.KM.1109", "field": "issues.1.mintage", "old": 180250500, "new": 396245500, "source": "https://en.wikipedia.org/w/index.php?title=Five_pence_(British_coin)&action=raw mintage table: 2010 = 396,245,500; https://coinhunter.co.uk/2010/ agrees", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/GB.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "GB.KM.1110", "field": "issues.0.mintage", "old": 25320500, "new": 96600500, "source": "https://en.wikipedia.org/w/index.php?title=Ten_pence_(British_coin)&action=raw mintage table: 2010 = 96,600,500; https://coinhunter.co.uk/2010/ agrees", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/GB.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "type", "id": "GB.KM.1107", "field": "issues.0.mintage", "old": 421002000, "new": 609603000, "source": "https://en.wikipedia.org/w/index.php?title=Penny_(British_decimal_coin)&action=raw mintage table: 2010 = 609,603,000; https://coinhunter.co.uk/2010/ agrees", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/types/GB.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "specimen", "id": "C073", "field": "issue.mintage", "old": 809784016, "new": null, "source": "Mixed P/D tube (record's own mint_text): https://www.pcgs.com/coinfacts/coin/1976-25c-clad/5896 (P 809,784,016) and https://www.pcgs.com/coinfacts/coin/1976-d-25c-clad/5897 (D 860,118,839); one number cannot describe 26 mixed coins", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/specimens/US.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "specimen", "id": "C073", "field": "issue.mintage_text", "old": "unknown (mixed tube · common clad years)", "new": "mixed tube: 1976 P 809,784,016 + 1976 D 860,118,839 (clad circulation)", "source": "https://www.pcgs.com/coinfacts/coin/1976-25c-clad/5896 and https://www.pcgs.com/coinfacts/coin/1976-d-25c-clad/5897", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/specimens/US.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "specimen", "id": "C088", "field": "issue.mintage", "old": 160160000, "new": null, "source": "Mint unknown (record's own mint_text: reverse not shown); the Philadelphia figure does not apply to a 1957-D; https://www.pcgs.com/coinfacts/coin/1957-d-10c/5115 (D 113,354,330)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/specimens/US.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
{"ts": "2026-10-08T02:30:00Z", "by": "model:grok-bot", "entity": "specimen", "id": "C088", "field": "issue.mintage_text", "old": "unknown (P/D reverse mark not shown)", "new": "unknown until the reverse is photographed: 1957-D 113,354,330; 1957 Philadelphia 160,160,000 as previously recorded", "source": "https://www.pcgs.com/coinfacts/coin/1957-d-10c/5115 (1957-D mintage 113,354,330)", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "grok-bot", "prompt_version": "DEEP_REVIEW_ROUND1", "workflow": "phase2-research", "inputs": [{"file": "collection/specimens/US.json"}], "run_id": "grok-bot-deep-review-20261007-1908", "tokens": null, "cost_usd": null}}
```

---
## 3. Code review (real defects only)

Severity is from the owner's point of view: S1 = shows wrong facts or loses data, S2 = a feature visibly breaks, S3 = friction or hygiene. Wherever a repro is marked "reproduced", I actually ran it.

| ID | Sev | Where | Defect |
|---|---|---|---|
| GRK-3-01 | S2 | `sw.js:12-95`, `sw.js:153-156`, `app.js:436-443` | The offline promise only covers the Hall. Coin views, photos and search fail offline unless opened before. |
| GRK-3-02 | S2 | `wings/questions.js:20-24`, `:114` | When offline, Questions says "No open questions right now. Thank you!" and keeps saying it after reconnecting. |
| GRK-3-03 | S1 | `tools/pipeline/apply_changes.py:235` | The 2026-10-21 provenance deadline is checked against the contributor's own `ts`, so a wrong clock or back-dating bypasses it. |
| GRK-3-04 | S1 | `apply_changes.py:222-225` | The exact-source rule only applies when the source names a site. A source naming nothing passes. |
| GRK-3-05 | S1 | `apply_changes.py:422-436` | A specimen-level `issue.mintage` write never reaches the type issue or the other coins of that issue, and never clears contradicting text. |
| GRK-3-06 | S2 | `splash.js:240-243` | On a phone the first tap on the opening film turns the sound **on** instead of skipping. |
| GRK-3-07 | S3 | `splash.js:29` vs `:379` | The film path ignores the 7.4 s "never hold the visitor longer" cap and holds for up to 20 s. |
| GRK-3-08 | S2 | `splash.css:51-53, 60` | The Skip button is 11 px text, about 35 px tall, invisible for 1.9 s, with contrast down to 1.15:1 over bright frames. |
| GRK-3-09 | S2 | `styles/simple.css:27-31, 55, 65-66` | The Simple view ("base type 22px") renders labels at 16, 13.6 and 12.8 px because `rem` resolves against the 16 px root. |
| GRK-3-10 | S3 | `sw.js:126-133, 155`, `:104` | The photo cache grows forever: each `?v=` re-cut adds a copy and nothing prunes old ones. |
| GRK-3-11 | S3 | `tools/smoke/smoke.py:101-116` | The "offline included" smoke step can't catch GRK-3-01 or GRK-3-02. |
| GRK-3-12 | S3 | `tools/pipeline/publish.py:103-113` vs `:114-118`, `:148-153` | Step 1 writes `collection/` and archives inbox files before steps 2-5 can fail. Step 6 deletes `data/detail` and then copies (not atomic). |
| GRK-3-13 | S3 | `apply_changes.py:600-603` | A missing `jsonschema` shows up as a per-line "could not apply this event (ModuleNotFoundError…)" on every event. |
| GRK-3-14 | S3 | `tools/pipeline/provenance.py:17-18` | The certainty label "Reference" accepts the bare words "catalog", "Royal Mint" and "US Mint", which the merge rule (#17) calls not exact. |

### GRK-3-01 · Offline covers only the Hall (S2)
- **Code.** `sw.js` precaches `SHELL_URLS` + `WING_URLS` (lines 12-95; 108 URLs, all present, `?v=tr98` matches `BUILD`). `data/` goes network-first into `titan-data-*` (line 153-154). `photos/p1/` goes cache-first only after a first view (line 155-156). The coin view needs `data/detail/{bucket}.json` (`app.js:436-443`, `ensureDetail`), and search needs `data/search.json` (loaded lazily). None of the 49 detail files, `search.json` or `questions.json` is precached.
- **Repro (by reading; not run on a device).** Fresh install with the network on, open only the Hall, switch to airplane mode, reload (the Hall works), tap any coin you haven't opened before: the detail fetch rejects and no cached copy exists. The same goes for search and for photos you haven't seen.
- **Smallest fix.** Have `publish.py` write a list of the 49 detail URLs plus `search.json` and `questions.json` (they already sit in `data/`). After `activate`, the service worker fetches that list in the background into `DATA` (not in `install`, so first paint isn't blocked). Keep photos as they are, and add an opt-in "Save all photos for offline" button in Health (208 × about 30-60 KB webp). Then GRK-3-11.

### GRK-3-02 · Offline Questions reports "No open questions" (S2)
- **Code.** `load()` (`wings/questions.js:20-24`) does `fetch("data/questions.json").then(r => r.ok ? r.json() : {questions: []}).catch(() => ({questions: []})).then(d => (data = d))`. On failure it stores an **empty list in `data`** and the promise in `loading`, so the session never retries. Line 114 then renders "No open questions right now. Thank you!".
- **Repro (by reading).** Open the app offline without having opened Questions before, then tap Hall footer → Questions. You get the thank-you message and a badge with no count, even though 10 questions are open. Reconnecting doesn't help until a full reload.
- **Why it matters.** This is exactly the dad flow in #52 and #3: he sees "thank you", stops looking, and the questions sit unanswered.
- **Smallest fix.** On failure, return `{questions: null, error: true}`, don't memoise it (`loading = null`), and render "Can't load the questions right now (offline?). Try again." with a retry button.

### GRK-3-03 · Provenance deadline keyed to the contributor's own timestamp (S1, before Oct 21)
- **Code.** `apply_changes.py:235` `elif str(e.get("by","")).startswith("model:") and str(e.get("ts","")) >= PROVENANCE_REQUIRED_FROM:` compares the event's own `ts`, which the AI writes, sometimes from a wrong clock. INSTRUCTIONS even tells an AI that can't read a clock to make up a plausible time.
- **Reproduced.** `/tmp/t2.jsonl` was a `model:test-bot` story event with `"ts":"2025-01-01T00:00:00Z"` and no provenance. The dry run gave "WARNING … no provenance on 1 model event(s)" and then "APPLIED t2.jsonl: 1 event(s) merged". After Oct 21 the same file would still merge, because its ts sorts before the deadline. Any AI with a stale clock (2024/2025 dates are common) bypasses the rule for good.
- **Smallest fix.** Compare against the merge-time clock: `datetime.date.today().isoformat() >= PROVENANCE_REQUIRED_FROM`. Also reject a `ts` more than 1 day in the future or before the master's creation (2026-09-30).

### GRK-3-04 · Exact-source rule only bites when a site is named (S1)
- **Code.** `apply_changes.py:222-225`: `if (REFERENCE.search(src) and not EXACT_REF.search(src) and not PHOTO_FILE.search(src) and any(...REF_FIELDS))`. The rejection needs `REFERENCE` (a site name or URL) to match **first**, so a source that names no site at all skips the check.
- **Reproduced.** `/tmp/t1.jsonl` set C154 `issue.mintage` to 123,456,789 with source "my own careful research notes 2026" (≥8 characters, not junk): **APPLIED**. `/tmp/t3.jsonl`, the same event with source "Numista says so 2026": **REJECTED** ("names a catalogue or site but not the entry"). So the rule punishes the more honest source. (Neither file was merged; dry run in scratch.)
- **Smallest fix.** For events that touch `REF_FIELDS`, require `EXACT_REF.search(src) or PHOTO_FILE.search(src)` and drop the `REFERENCE.search(src)` precondition. Add a test with the t1 source.

### GRK-3-05 · A mintage has two homes, and only one of them is kept in sync (S1)
- **Code.** A type edit `issues.N.mintage` is copied to matching specimens (`issue_copies`, `apply_changes.py:416-420`), and contradicting `mintage_text` is cleared (`:428-436`). A **specimen** edit `issue.mintage` (Muse wrote 100+ of these in Round 4) only calls `ensure_issue` (`:427`). It doesn't update the type issue or sibling specimens, and doesn't clear the specimen's own "unknown" text.
- **Evidence (counted with `cert.py`).** 120 specimens whose `issue.mintage` differs from their type issue: 118 where the type is null and the specimen has a number, plus **C115 (31,588,000) vs CH.KM.21a 1968 B (10,000,000)**, which C003 also carries, and C275 (null vs type 453,173,500). In the app, two 1968-B Swiss 2-franc coins show different mintages. 114 specimens show a number next to "unknown" text. `integrity.py` has no check for this.
- **Smallest fix.** In `after_set`, for `entity == "specimen"` and a field starting with `issue.mintage`, mirror the value to the matching type issue (log a `script:pipeline` event so the audit trail stays honest). That also updates siblings and clears the contradicting text. Add an integrity warning: "same type, year and mint marks, different mintage". Longer term, make the type issue the only home and drop the copy from the specimen.

### GRK-3-06 · First tap on the film turns sound on instead of skipping (S2, dad-facing)
- **Code.** `splash.js:240-243`: `if (Sfx.isOn() && !soundUnlocked && e.target !== btnSkip) { unlockSound(); return; } // first tap = sound on … not skip`. Sound is on by default (`splash.js:92` "sound: synthesized, ON by default (owner, 2026-10-01)"; `:95-96`; the header comment at `:12` still says "off by default"), and iOS/Android block autoplay sound, so on a phone the first tap anywhere unmutes the film (`unlockSound` → `v.muted = false`, line 215).
- **Repro (by reading).** Fresh session on a phone, the film starts muted. Tap the picture to get rid of it and the explosions get loud. A second tap skips. Only a tap that lands exactly on the small Skip pill (GRK-3-08) skips first time.
- **Smallest fix.** A tap anywhere skips. Sound only comes on from the sound button or the "Tap for sound" hint (`:208`), which already exists.

### GRK-3-07 · The film ignores the splash's own cap (S3)
- **Code.** `splash.js:29` `var CAP_MS = 7400; // wall-clock cap from script start: never hold the visitor longer`. The film path sets `window.__tsFilmUntil = performance.now() + 20000; later(function () { finish(true, 0.5); }, 20000); // clips run ~15 s` (`:379`). The film plays on every new session (`sessionStorage` flag, `:303`), and an installed PWA launch is a new session.
- **Smallest fix.** Either clamp the film to `CAP_MS` (start the exit at CAP_MS - EXIT) or play it once per day (`localStorage` date) and fall back to the 6.5 s 3D splash otherwise. Pair it with a setting under #59.

### GRK-3-08 · Skip pill is small, faint and late (S2)
- **Code.** `splash.css:53` `.ts-skip { … font-size: 11px; letter-spacing: .3em; text-transform: uppercase; padding: 10px 14px 10px 17px; }` gives a box roughly 33-35 px tall (my estimate from 11 px text plus 20 px padding). `:51` text `#b9b5ad` on `rgba(8,8,8,.35)` over the film. `:60` `animation: tsFade .8s ease 1.1s forwards` means `opacity: 0` until about 1.9 s. `.ts-sound` is 40 × 40 px (`:54`).
- **Contrast (calculated).** Over a black frame 10.09:1. Over a mid-grey frame (#808080) 3.59:1. Over a white frame (explosions, fireworks) **1.15:1**.
- **Smallest fix.** `font-size: 16px; min-height: 48px; min-width: 88px; background: rgba(0,0,0,.72); color: #fff;`, visible from 0 s. Sound button 48 × 48.

### GRK-3-09 · Simple view type is smaller than its own spec (S2, dad-facing)
- **Code.** The header of `styles/simple.css:3` promises "Base type 22px, headings 32px+, tap targets 56px+". `.simple-view` sets `font-size: 22px` (`:10`), but the children use `rem`, which resolves against the **root** (`html` has no font-size in `styles.css:170-176`, so 16 px): `.sv-big` 1.1rem = 17.6 px (`:27`), `.sv-note`, `.sv-id`, `.sv-foot`, `.sv-flip-t` and `.sv-eg` 1rem = **16 px** (`:28, 30, 31, 46, 66`), `.sv-fam small` .85rem = **13.6 px** (`:55`), `.sv-noimg` .8rem = **12.8 px** (`:65`). Headings are fine (2.2rem = 35 px). Colours pass easily: ink 18.88:1, "yes" green 8.20:1, "maybe" on soft 6.90:1, dark-mode button 13.84:1 (calculated).
- **Smallest fix.** Change `rem` to `em` in those seven rules (em follows the 22 px base): 1em = 22 px, .85em = 18.7 px, .8em = 17.6 px. Do it before the #60 Dad test so the test measures the intended design.

### GRK-3-10 · Photo cache never shrinks (S3)
- **Code.** Photo URLs carry a content hash (`photos/p1/C001_rev.webp?v=da5570f5` in `data/index.json`). `cacheFirst` keys by the full request including `?v=` (`sw.js:126-133`). `IMG = "titan-thumbs-v1"` is never renamed, and `activate` keeps it (`:104`). Each re-crop adds a new entry and the old one stays forever. Staleness is **not** a problem (the hash changes the URL); only storage grows.
- **Smallest fix.** In `cacheFirst` for `IMG`, before `cache.put`, delete keys with the same `pathname` and a different `search`.

### GRK-3-11 · Smoke's offline step can't see the real offline failures (S3)
- **Code.** `tools/smoke/smoke.py:101-116`: go offline, reload, assert `#hero-grand` shows a `$` value. That's all.
- **Smallest fix.** Add two assertions while offline: open a coin you haven't opened before (expect the dossier, not an error) and open Questions (expect 10 cards or an explicit offline message, never "No open questions").

### GRK-3-12 · Half-published states (S3)
- **Code.** Step 1 (`publish.py:103-113`) applies and **moves** each inbox file (to `applied/`) and writes `collection/` before steps 2-5 (validate `:114-118`, build, `check_outputs` and parity `:140-146`) can fail. `apply_file` validates its own merge, so step 2 rarely fails, but a post-build failure leaves `collection/` changed, the inbox empty and `data/` stale, and the next plain run reports nothing pending. Step 6 removes every `data/detail/*.json` and then copies the new ones (`:151-152`). An interruption between the two leaves a partial `data/detail`.
- **Smallest fix.** Print a loud "collection/ changed but data/ NOT rebuilt: rerun publish.py --no-incoming" on any failure after step 1. For step 6, copy into `data/detail.new/` and `os.replace` the directory.

### GRK-3-13 · Missing dependency reported as 32 separate event errors (S3)
- **Reproduced.** Without `jsonschema`, `test_pipeline.py` shows 24 of 37 failing with "could not apply this event (ModuleNotFoundError…)". `check_schema` imports `validate` per event, and `apply_file` catches it at `:603` as a generic exception. There is a proper message at `:611`, but the import fails earlier.
- **Smallest fix.** `import validate` (and so `jsonschema`) once at the top of `apply_file`, and fail the whole run with "pip install jsonschema".

### GRK-3-14 · "Reference" label is looser than the merge rule (S3)
- **Code.** `provenance.py:17-18` `REF_RE` accepts `\bcatalog(?:ue)?\b`, `Royal Mint`, `\bUS Mint\b` and `\briksbank\b` as references. `apply_changes.py:56-57` `EXACT_REF` rejects a publisher name with no entry. Today only 5 events get "Reference" from the loose words alone (counted), so the impact is small. But the label also never checks that the cited entry is the right coin: C258's source "Numista, VN-SOV 10 su 1953 KM#1" earns "Reference" for a wrong number.
- **Smallest fix.** Use the same `EXACT_REF` in both files. Separately, a "Reference" certainty should show the cited entry as a link so a human can see at a glance when it's the wrong coin (NEW-A in section 5).

**Checked and fine:**
- Reduced motion is honoured by the splash (it takes the still path before the film, `splash.js:337` comes before `:349`), the FX engine (one static frame, `wings/fx/engine.js:41-42, 503-504, 647`), `ambient.js`, the wings and 30+ stylesheets.
- `networkFirst` caches `data/` without the `?t=` query (`sw.js:114-117`), so offline reuse of anything already fetched works.
- The Hall prefers the daily quote (`wings/hall.js:89-92`).
- Theme colour tokens pass AA: Afterhours muted on bg 7.06:1, on surface 6.73:1; Conservator muted on bg 6.64:1 (calculated).
- All 108 service-worker shell URLs exist. `data/` rebuilds byte-identically.

---
## 4. Fix list review

### 4a. Every open Tier 1 item

| # | Verdict | Why (evidence) |
|---|---|---|
| #3 Settle open questions | **Keep, top.** Add 2 questions from this review (C238 portrait, C064 mint mark) and a third if C088 stays. | 10 open in `data/questions.json` (counted, matches the doc). GRK-3-02 has to be fixed first or the dad may see "No open questions" offline. |
| #54 Shoot list | **Keep.** Put coins with an open data question first: C088 reverse (mint mark decides its mintage), C238 portrait side, C073 tube sort. | The order should come from "a photo settles a fact", not only value. Section 2 #16, #17 and #25 are each settled by one photo. |
| #57 Phase 1 finish line | **Keep.** Count "mintage consistent with type" as a Phase 1 completeness check once GRK-3-05 lands. | Otherwise 118 type issues stay null while the bar says done. |
| #52 Questions badge for dad | **Keep, but after GRK-3-02.** | A badge that reads 0 offline is worse than no badge. |
| #39 Fix Muse's 12 catalog numbers | **Shrink to 10 and do it now with this review's evidence.** | C139 and C208 are already done (GRK-1-04). Section 2 has exact Numista entries for Malta ×3, C198 and C248 (plus C258, C040 and NO.KM.460, which weren't in the 12). C212, C231 and C159 have search snippets only, so Claude needs one fetch each, or another agent can do it. |
| #40 Replace 15 approximate weights | **Keep.** Fold in the VN-SOV, C161 and C231 weights from section 2. | `CURATION_OPEN.md:47` lists them. VN-SOV's range is replaced in the change lines (2.2 g, 27 mm). |
| #4 Photo-model bake-off | **Keep.** Freeze the 30-coin answer key before any AI (including me) sees it, and keep this review's fixes out of the key until they're merged and owner-checked. | Otherwise the key itself carries the Round 4 errors (the GB 2010 figures, for example). |
| #19 Locked coin test | **Defer behind #4** (as written). Fine. | Needs #4's harness. |
| #55 Two AIs read each new coin | **Keep.** Add a third, cheap signal: a lint that the claimed KM# exists for that denomination and year range (GRK-2-02 and GRK-2-10 are "neighbour number" errors a lint can catch). | |
| #51 GitHub job versions before Oct 19 | **Keep, do first (date-bound).** UNVERIFIED: I didn't open the workflow `uses:` lines. Only `prices.yml` was read. | 12 days left. |
| #58 Restore drill | **Keep.** Also restore with `--parity`, and check the zip includes `collection/_incoming/applied/` (the audit trail). | |
| #60 Dad test | **Keep, but fix GRK-3-09 (Simple view 13-16 px labels) and GRK-3-06/08 (splash tap and Skip) first,** or the test will spend its ten minutes on known bugs. | |
| #30 Design direction | **Keep (needs owner).** | |
| #32 Split app.js | **Keep.** Next split target: `ensureDetail` and the coin view, because GRK-3-01's offline fix touches them. | app.js is 7,119 lines (GRK-1-09). |
| #25 Speed budget | **Keep.** Add the Motion Lab fps meter (section 6) as the phone reference: it reports fps and grain count and steps itself down. | |
| #59 One motion setting | **Keep.** Include the splash film (GRK-3-07) and splash sound under the same Full / Calm / Off. | Today the film ignores everything except the OS reduce-motion setting. |

### 4b. Missing items (≤10)

| New | Item | Tier | Ties to |
|---|---|---|---|
| GRK-4-01 (NEW-1) | **Real offline:** precache detail, search and questions after activate, plus an opt-in "save photos offline" | 1 · Safety net | GRK-3-01, GRK-3-11, GRK-1-02 |
| GRK-4-02 (NEW-2) | **One home for each mintage** (type issue), mirror specimen writes, plus an integrity check | 1 · Truth | GRK-3-05, GRK-2-20 |
| GRK-4-03 (NEW-3) | **Close the two contract holes before Oct 21:** exact-source applies to no-site sources, provenance deadline by the merge clock | 1 · Truth | GRK-3-03, GRK-3-04 |
| GRK-4-04 (NEW-4) | **Merge (or reject with reasons) this review's 32 change lines** after a human spot-check of 3 lines | 1 · Truth | section 2b |
| GRK-4-05 (NEW-5) | **Story fact-check:** AI stories make catalogue claims (C248 portrait, C275 mintage) that aren't covered by EXACT_REF; lint stories against the record | 2 | GRK-2-05 |
| GRK-4-06 (NEW-6) | **mintage / mintage_text agreement lint** (114 records) | 2 | section 2 note |
| GRK-4-07 (NEW-7) | **Splash: tap-to-skip, film once per day, bigger Skip** | 1 · Gate (before the #60 Dad test) | GRK-3-06/07/08 |
| GRK-4-08 (NEW-8) | **Simple view rem → em** | 1 · Gate (before #60) | GRK-3-09 |
| GRK-4-09 (NEW-9) | **Retire or auto-generate stale docs** (CURATION section 8, line 95, the "5 type conflicts" line, the "~7.5k" line) | 3 | GRK-1-01/03/08/09 |
| GRK-4-10 (NEW-10) | **Photo-cache pruning** | 3 | GRK-3-10 |

### 4c. Cuts
- **GRK-4-11 · #35 Finish the 12 missing splash films:** cut. The film already defeats the 7.4 s cap (GRK-3-07), the Oct 5 run spent about $52 for 2 clips (FEEDBACK doc), and more films add nothing to "the most trustworthy record".
- **GRK-4-12 · #21 Sounds for effect moments** and **#28 Vault narration voice:** cut or park until #63. They work against "calm by default".
- **#22 Tune sound from listening notes:** keep only as "fix what the owner reports".
- **#19:** keep, but clearly behind #4 (it's already written that way).

---

## 5. Best in the world

Best-in-class tools and what Titan should copy. These are products and projects I know; I didn't re-fetch their sites for this review, so treat the feature descriptions as from memory.
- **Numista** (catalogue + personal collection): one URL per type (N#), with a per-year, per-mint mintage table on the type page and references (KM, Schön, …) on every page. Titan's type ↔ N# link is the cheapest way to make every catalogue fact one tap from proof.
- **PCGS CoinFacts / NGC World Price Guide:** per-date, per-mint pages (US mintage by P/D/S), population and price history. Titan needs the per-mint split (C073, C088).
- **ucoin.net / Colnect:** collection plus want list per country and year with swap lists. That's the model for "What's missing?" across albums.
- **CoinSnap / Coinoscope:** phone-camera identification with a ranked list of candidates. That's the UX for #65, but the record should keep the candidate list and confidence (that's #18).
- **Nomisma.org and the ANS MANTIS database:** linked-data identifiers for coin types, so the same type can't be catalogued twice under different numbers. That's a model for type dedup (NEW-C below).
- **Museum online collections (British Museum, Smithsonian NNC):** every object shows its sources, inventory number and "curator's comments" separately from the catalogue description. That's the same split as Titan's certainty chip vs story.

**Top 5 features to build, mapped:**

1. **GRK-5-01 · Source chips that open the exact entry** (N#5904 → Numista page; PCGS #5897 → CoinFacts), shown next to every "Reference" fact. *Maps to:* NEW (call it NEW-A); builds on the done #17 and #9/#10. It also exposes "right number, wrong coin" errors (GRK-3-14) to the owner in one glance.
2. **GRK-5-02 · Per-type issue table as the only home of mintage and mint marks,** with every specimen pointing at one row. *Maps to:* NEW-2 (GRK-3-05). Numista-style.
3. **GRK-5-03 · Want and gap list per album and per country, printable,** with a dad-sized checklist. *Maps to:* #64 (printable inventory) + #52; uses the album slot data that already exists (917/1775).
4. **GRK-5-04 · Camera identify → draft record with a candidate list,** scored by the #4 winner. *Maps to:* #65 via #4/#19, plus #18 for keeping disagreements.
5. **GRK-5-05 · Type dedup and linking:** store `Numista` on every type (today **2 of 167** types carry a Numista number, counted), and warn when two types share an N# or one type carries two KM or two Schön numbers (counted: US.KM.204 KM#204 + KM#A204 for the 1976 quarter tube, DE.KM.124, NO.KM.460). *Maps to:* NEW (NEW-C); helps #39 and #40.

---
## 6. Motion Lab #56: gold-dust study

### 6a. Design (GRK-6-01)

**Goal (from #56):** "the gold and silver dust that forms your real coins as you scroll (then the 49 countries, then an album page; your finger stirs it)." It sits off the critical path and on its own page, so it never touches the app or Tier 1.

**The four forms (one scroll section each):**

| Section | What the dust becomes | Where the data comes from (same origin) | Fallback if the data can't load |
|---|---|---|---|
| 0 Dust | a soft cloud, mostly gold with some silver grains | none | none needed |
| 1 Coin | a real coin, sampled from its `photos/p1/*.webp`. Grains go to relief edges, lettering and the rim (local-contrast weighting), and each grain takes its pixel's colour, tinted silver or gold from the photo's saturation. "Next coin" cycles through the photographed coins, most valuable first. | `../data/index.json` (`flips[].thumb`) + `../photos/p1/…` read with canvas `getImageData` | a procedural disc (rim and relief rings) with no invented lettering, and the screen says "procedural stand-in" |
| 2 Countries | 55 % of the grains trace the continents (the outline already in `atlas.js`, `CONTINENT_PATHS`, equirectangular 1000 × 500). 45 % cluster on each of the 49 countries (coordinates from `atlas.js` `COUNTRY_COORDS`), with cluster size and brightness growing with √(coin count) from `data/index.json` `world`. | `../atlas.js` read as text (not executed) + `../data/index.json` | countries in a plain banded layout, labelled on screen |
| 3 Album | the first album with slot data (A001 Lincoln cents, 89 holes, 77 filled): filled holes are lit copper discs, empty holes dim rings. The caption gives the real counts. | `../collection/albums.json` | A001 counts only (89/77); empty holes drawn last, and the screen says so |

**Motion rules:**
- **Morph.** One vertex shader holds all four target positions and colours as attributes. `uStage` (0-3) blends them. Each grain leaves at its own moment (`seed × 0.3` of the segment) but every grain **arrives exactly** on the form, so the coin is sharp when you stop.
- **Flow.** A divergence-free field (each component ignores its own axis, the same property curl noise has) carries grains between forms, so the dust neither piles up nor tears holes in itself. Its strength peaks halfway between forms and is near zero on a form.
- **Stir.** A pointer or finger is projected onto the z = 0 plane. Grains within about 0.5 units swirl tangentially, with a slight push outward and a little lift. The stir energy decays (0.12^dt). Calm stirs gently, Full strongly, Still not at all.
- **Settle and rest.** In Calm the loop stops about 6 s after the last input or scroll, which saves battery. Full keeps a slow drift and sparkle.

**Device tiers and budget:**
- Buffers are built once at 60k grains. Tiers draw 60k / 32k / 16k / 8k through `geometry.setDrawRange`, so stepping down costs nothing.
- The starting tier comes from `hardwareConcurrency`, `deviceMemory` and screen size. The pixel ratio is capped by tier (2 / 1.75 / 1.5 / 1).
- At runtime, two seconds below 45 fps steps down one tier (the change is noted on screen).
- Additive blending gets gain-compensated as the count rises, so a phone at 8k grains and a desktop at 60k look equally bright.
- On a portrait phone the camera pulls back until the 4.8-unit map and album fit the width, and grain size compensates.
- An fps meter (top right) shows fps and grain count. That's the reference measurement for #25.

**Accessibility:**
- **OS "reduce motion" → Still:** no animation loop. Each section renders one finished frame, scrolling snaps between them, there's no stir, and the "Full" choice isn't applied while the OS asks for less motion. If the OS setting changes mid-visit, the page switches to Still.
- **Otherwise Calm by default** (#63: "calm by default"), with Full as opt-in. The choice is remembered.
- Text cards carry the content; the canvas is `aria-hidden`.
- Buttons are 48 px minimum with a visible focus ring. Card text on the card background is well above 4.5:1. I didn't run a separate tool over it, but the colours are the theme's light ink on near-black.
- No WebGL → a still photo of a real coin plus one plain sentence.

**What it deliberately does not do:** no CDN, no build step, no network beyond same-origin repo files, no change to the app, no new data. It reads `collection/albums.json` directly because `data/` has no album slot file. That's fine for a lab page; #63 would use a published file.

**How to try it:** copy it to `motion-lab/index.html` (one level below the repo root, so `../js/three.min.js` resolves) on a branch, and open `https://<pages-host>/motion-lab/`. `#stage=1`, `#stage=2` or `#stage=3` pins a single study (handy for comparing on a phone).

**Verification I ran:**
- `node --check` on the extracted script: OK.
- Headless Google Chrome with SwiftShader WebGL, served over http from a scratch copy of the repo at 430×900 and 1280×800: `data-ready="1"`, coin title "Netherlands · 1967 · 1 Gulden" (C223, sampled from `photos/p1/C223_rev.webp`; crown, "1 G" and NEDERLAND legible in the dust), map title "49 countries", album "A001 · Whitman 9030 · Lincoln 1941-1974 #2", no script errors in the console (only SwiftShader "GPU stall due to ReadPixels" performance notes, removed with `willReadFrequently`).
- With `--force-prefers-reduced-motion`, Still is selected and the loop doesn't run.
- From `file://` every fallback engaged and was announced.
- I couldn't measure real phone fps on the box (software WebGL). The owner's phone report (#25) is the real test.

### 6b. The file (GRK-6-02: `motion-lab-gold-dust-study.html`, complete)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>Motion Lab · Gold dust study (#56)</title>
<!-- Titan Reliquary · Motion Lab study for fix-list #56 ("gold and silver dust that forms your real coins as you scroll,
     then the 49 countries, then an album page; your finger stirs it"). Written by Grok Bot (Titan Reliquary agent), 2026-10-07.
     Lives in its own folder one level below the repo root (e.g. motion-lab/index.html) so ../js/three.min.js (r128, global THREE),
     ../data/index.json, ../atlas.js, ../collection/albums.json and ../photos/p1/*.webp resolve on the same origin.
     No network beyond those same-origin files, no CDN, no build. Opened from file:// or with the data missing, it falls back to a
     procedural coin, a banded country layout and the A001 counts noted below, and says so on screen.
     Motion: OS "reduce motion" = Still (one frame per section, no animation loop). Otherwise Calm by default; Full is opt-in. -->
<style>
  :root { --ink: #f3efe6; --muted: #c9c2b3; --bg: #07070a; --gold: #e9c46a; --line: rgba(243,239,230,.28); }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--ink); font: 18px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  #stage { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; touch-action: pan-y; }
  #fallback { position: fixed; inset: 0; display: none; place-items: center; text-align: center; padding: 24px; }
  #fallback img { width: min(60vw, 320px); border-radius: 50%; display: block; margin: 0 auto 16px; }
  main { position: relative; z-index: 1; pointer-events: none; }
  section { min-height: 100vh; display: flex; align-items: flex-end; padding: 0 20px calc(28px + env(safe-area-inset-bottom)); }
  .card { pointer-events: auto; max-width: 34rem; background: rgba(7,7,10,.72); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
  .card h2 { margin: 0 0 6px; font-size: 1.35rem; line-height: 1.25; color: var(--gold); }
  .card p { margin: 0; color: var(--muted); }
  #hud { position: fixed; z-index: 3; top: max(12px, env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  #hud button { min-height: 48px; min-width: 48px; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--line); background: rgba(7,7,10,.78); color: var(--ink); font: 600 16px/1 system-ui, sans-serif; cursor: pointer; }
  #hud button[aria-pressed="true"] { background: var(--gold); color: #111; border-color: var(--gold); }
  #hud button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
  #fps { margin-left: auto; font: 600 14px/1.2 ui-monospace, Menlo, Consolas, monospace; color: var(--ink); background: rgba(7,7,10,.78); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; min-width: 9.5rem; text-align: right; }
  #note { position: fixed; z-index: 3; left: 12px; bottom: calc(8px + env(safe-area-inset-bottom)); font-size: 13px; color: var(--muted); max-width: 70vw; }
  section[hidden] { display: none; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
</head>
<body>
<canvas id="stage" aria-hidden="true"></canvas>
<div id="fallback" role="img" aria-label="Still picture of a coin from the collection"><div><img id="fbimg" alt=""><p>This phone cannot draw the 3D dust, so here is the coin as a still picture.</p></div></div>
<div id="hud" role="toolbar" aria-label="Motion settings">
  <button type="button" data-mode="still" aria-pressed="false">Still</button>
  <button type="button" data-mode="calm" aria-pressed="true">Calm</button>
  <button type="button" data-mode="full" aria-pressed="false">Full</button>
  <button type="button" id="next" aria-label="Show the next coin">Next coin</button>
  <span id="fps" aria-live="off">-- fps</span>
</div>
<main>
  <section data-stage="0"><div class="card"><h2>Dust</h2><p>Gold and silver dust. Scroll down and it gathers into one of your coins. Touch the screen to stir it.</p></div></section>
  <section data-stage="1"><div class="card"><h2 id="coinTitle">Your coin</h2><p id="coinText">Every grain of dust takes its colour from the real photo of this coin.</p></div></section>
  <section data-stage="2"><div class="card"><h2 id="mapTitle">49 countries</h2><p id="mapText">The dust spreads into the countries your coins come from. Brighter, bigger clusters mean more coins.</p></div></section>
  <section data-stage="3"><div class="card"><h2 id="albumTitle">An album page</h2><p id="albumText">Then it settles into an album: lit holes have a coin, dim rings are still empty.</p></div></section>
</main>
<div id="note"></div>
<script src="../js/three.min.js"></script>
<script>
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var note = $("#note"), fpsEl = $("#fps");
  var notes = [];
  function say(msg) { notes.push(msg); note.textContent = notes.join(" · "); }

  /* ---------------- motion preference: Still / Calm / Full ---------------- */
  var rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mode = (rmq && rmq.matches) ? "still" : "calm";
  try { var saved = localStorage.getItem("motionlab_mode"); if (saved && !(rmq && rmq.matches)) mode = saved; } catch (e) {}
  function setMode(m) {
    mode = m;
    Array.prototype.forEach.call(document.querySelectorAll("#hud [data-mode]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === m)); });
    try { localStorage.setItem("motionlab_mode", m); } catch (e) {}
    if (m === "still") { stir = 0; renderOnce(); fpsEl.textContent = "still · no animation"; } else kick();
  }
  if (rmq && rmq.addEventListener) rmq.addEventListener("change", function () { if (rmq.matches) setMode("still"); });

  /* ---------------- WebGL + tier ---------------- */
  var canvas = $("#stage");
  if (typeof THREE === "undefined") { noGL("three.min.js did not load"); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: "high-performance" }); }
  catch (e) { noGL("WebGL unavailable"); return; }
  var cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  var small = Math.min(screen.width, screen.height) < 500;
  var TIERS = [60000, 32000, 16000, 8000];
  var tier = (cores >= 8 && mem >= 8 && !small) ? 0 : (cores >= 6 && mem >= 4) ? 1 : (cores >= 4) ? 2 : 3;
  var N = TIERS[0];                         // buffers are built once at the top size; lower tiers just draw fewer points
  var dprCap = [2, 1.75, 1.5, 1][tier];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setClearColor(0x07070a, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  /* ---------------- deterministic random ---------------- */
  var rs = 1234567;
  function rnd() { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; }
  function gauss() { var u = rnd() || 1e-6, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }

  /* ---------------- buffers ---------------- */
  var pCloud = new Float32Array(N * 3), pCoin = new Float32Array(N * 3), pMap = new Float32Array(N * 3), pAlbum = new Float32Array(N * 3);
  var cCoin = new Float32Array(N * 3), cMap = new Float32Array(N * 3), cAlbum = new Float32Array(N * 3), seed = new Float32Array(N);
  var GOLD = [0.91, 0.74, 0.38], SILVER = [0.82, 0.84, 0.88], COPPER = [0.85, 0.52, 0.34];
  for (var i = 0; i < N; i++) {
    var r = 2.6 * Math.cbrt(rnd()), th = rnd() * 6.2831853, ph = Math.acos(2 * rnd() - 1);
    pCloud[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.4; pCloud[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pCloud[i * 3 + 2] = r * Math.cos(ph) * 0.8;
    seed[i] = rnd();
  }
  var geo = new THREE.BufferGeometry();
  function attr(name, arr, n) { var a = new THREE.BufferAttribute(arr, n); geo.setAttribute(name, a); return a; }
  attr("position", pCloud, 3);
  var aCoin = attr("pCoin", pCoin, 3), aMap = attr("pMap", pMap, 3), aAlbum = attr("pAlbum", pAlbum, 3);
  var aCCoin = attr("cCoin", cCoin, 3), aCMap = attr("cMap", cMap, 3), aCAlbum = attr("cAlbum", cAlbum, 3);
  attr("aSeed", seed, 1);
  geo.setDrawRange(0, TIERS[tier]);

  var uniforms = {
    uStage: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uSize: { value: 26 }, uStir: { value: 0 },
    uPtr: { value: new THREE.Vector3(9, 9, 0) }, uFlow: { value: 0.35 }, uSpark: { value: 0 }, uGain: { value: 0.55 }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      "attribute vec3 pCoin; attribute vec3 pMap; attribute vec3 pAlbum;",
      "attribute vec3 cCoin; attribute vec3 cMap; attribute vec3 cAlbum; attribute float aSeed;",
      "uniform float uStage, uTime, uPx, uSize, uStir, uFlow, uSpark; uniform vec3 uPtr;",
      "varying vec3 vCol; varying float vA;",
      // divergence-free flow: each component ignores its own axis, so the field neither piles dust up nor tears holes in it
      "vec3 flow(vec3 p, float t) {",
      "  return vec3(sin(p.y * 1.7 + t) + 0.6 * cos(p.z * 2.3 - t * 0.7),",
      "              sin(p.z * 1.3 - t * 0.8) + 0.6 * cos(p.x * 1.9 + t * 0.5),",
      "              sin(p.x * 1.5 + t * 0.6) + 0.6 * cos(p.y * 2.1 - t * 0.9));",
      "}",
      "void main() {",
      "  float st = clamp(uStage, 0.0, 3.0), si = min(floor(st), 2.0), sf = st - si;",
      "  float s = si + clamp((sf - aSeed * 0.3) / 0.7, 0.0, 1.0);",              // per-grain stagger: each grain leaves at its own moment, all arrive exactly
      "  float w0 = clamp(1.0 - s, 0.0, 1.0), w1 = clamp(1.0 - abs(s - 1.0), 0.0, 1.0);",
      "  float w2 = clamp(1.0 - abs(s - 2.0), 0.0, 1.0), w3 = clamp(s - 2.0, 0.0, 1.0);",
      "  w0 = w0 * w0 * (3.0 - 2.0 * w0); w1 = w1 * w1 * (3.0 - 2.0 * w1); w2 = w2 * w2 * (3.0 - 2.0 * w2); w3 = w3 * w3 * (3.0 - 2.0 * w3);",
      "  float ws = max(w0 + w1 + w2 + w3, 1e-4);",
      "  vec3 p = (position * w0 + pCoin * w1 + pMap * w2 + pAlbum * w3) / ws;",
      "  vec3 cloudCol = mix(vec3(0.91, 0.74, 0.38), vec3(0.82, 0.84, 0.88), step(0.62, aSeed));",
      "  vCol = (cloudCol * 0.55 * w0 + cCoin * w1 + cMap * w2 + cAlbum * w3) / ws;",
      "  float between = 1.0 - max(max(w0, w1), max(w2, w3)) / ws;",            // 0 on a form, up to ~0.5 half way between two
      "  float t = uTime * 0.35 + aSeed * 6.2831853;",
      "  p += flow(p * 0.9 + aSeed, uTime * 0.25) * (between * 0.9 + w0 * 0.25 + 0.012) * uFlow;",
      "  vec2 d = p.xy - uPtr.xy; float r2 = dot(d, d); float f = uStir * exp(-r2 / 0.28);",
      "  p.xy += vec2(-d.y, d.x) * f * 0.85 + d * f * 0.18; p.z += f * 0.35 * sin(aSeed * 40.0 + uTime * 3.0);",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_Position = projectionMatrix * mv;",
      "  float tw = 1.0 + uSpark * 0.9 * pow(max(0.0, sin(t * 3.0 + aSeed * 50.0)), 24.0);",
      "  float fine = 1.0 - 0.45 * w1 / ws;",                                   // finer grains on the coin so its relief resolves
      "  gl_PointSize = uSize * uPx * fine * (0.55 + aSeed * 0.9) * tw / max(0.5, -mv.z);",
      "  vA = 0.55 + 0.45 * tw - between * 0.25;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "precision mediump float;",
      "uniform float uGain; varying vec3 vCol; varying float vA;",
      "void main() {",
      "  vec2 q = gl_PointCoord - 0.5; float d = dot(q, q);",
      "  if (d > 0.25) discard;",
      "  float a = exp(-d * 18.0);",
      "  gl_FragColor = vec4(vCol * a * vA * uGain, 1.0);",
      "}"
    ].join("\n")
  });
  var points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  /* ---------------- data (same origin) ---------------- */
  function getJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }); }
  function getText(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.text(); }); }
  function loadImage(u) {
    return new Promise(function (res, rej) { var im = new Image(); im.decoding = "async"; im.onload = function () { res(im); }; im.onerror = function () { rej(new Error("image " + u)); }; im.src = u; });
  }

  /* coin: sample a real photo; brightness decides where grains land and how high they stand */
  var coins = [], coinIx = 0;
  function sampleCoin(img, label) {
    var S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S;
    var g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, S, S);
    var px = g.getImageData(0, 0, S, S).data;              // throws on a cross-origin / file:// image: caller falls back
    var sat = 0, n = 0;
    for (var k = 0; k < px.length; k += 64) { var mx = Math.max(px[k], px[k + 1], px[k + 2]), mn = Math.min(px[k], px[k + 1], px[k + 2]); if (px[k + 3] > 128 && mx > 30) { sat += (mx - mn) / mx; n++; } }
    var metal = (n && sat / n > 0.22) ? GOLD : SILVER;
    // weight each pixel by its local contrast (relief edges, lettering, rim) plus a little base so the field still shows,
    // then draw grains from the cumulative weights: every grain lands, and detail gets the most grains
    var lum = new Float32Array(S * S), blur = new Float32Array(S * S), cdf = new Float32Array(S * S), det = new Float32Array(S * S);
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) { var o = (y * S + x) * 4; lum[y * S + x] = (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255; }
    var R2 = 3;
    for (var y2 = 0; y2 < S; y2++) for (var x2 = 0; x2 < S; x2++) {
      var acc = 0, cnt = 0;
      for (var dy = -R2; dy <= R2; dy += 1) { var yy = y2 + dy; if (yy < 0 || yy >= S) continue; for (var dx = -R2; dx <= R2; dx += 2) { var xx = x2 + dx; if (xx < 0 || xx >= S) continue; acc += lum[yy * S + xx]; cnt++; } }
      blur[y2 * S + x2] = acc / cnt;
    }
    var tot = 0;
    for (var k2 = 0; k2 < S * S; k2++) {
      var xk = (k2 % S) / (S - 1) * 2 - 1, yk = Math.floor(k2 / S) / (S - 1) * 2 - 1;
      var inside = (xk * xk + yk * yk <= 0.97) && px[k2 * 4 + 3] > 100;
      det[k2] = Math.abs(lum[k2] - blur[k2]);
      var e = det[k2] * 6; tot += inside ? 0.03 + Math.min(1.5, e * e) + 0.25 * lum[k2] * lum[k2] : 0; cdf[k2] = tot;
    }
    fillCoin(function () {
      var t = rnd() * tot, lo = 0, hi = S * S - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cdf[mid] < t) lo = mid + 1; else hi = mid; }
      var x = ((lo % S) + rnd()) / S * 2 - 1, y = (Math.floor(lo / S) + rnd()) / S * 2 - 1, o = lo * 4;
      var l = Math.min(1, 0.1 + Math.pow(lum[lo], 1.5) * 0.9 + det[lo] * 2.5);
      return [x, -y, l, px[o] / 255, px[o + 1] / 255, px[o + 2] / 255];
    }, metal);
    $("#coinTitle").textContent = label;
  }
  function proceduralCoin() {                             // fallback only: rim, field and relief rings, no fake legend
    fillCoin(function () {
      var a = rnd() * 6.2831853, rr = Math.sqrt(rnd()) * 0.97, rim = rr > 0.86 ? 1 : 0, ring = Math.abs(Math.sin(rr * 18.0)) > 0.92 ? 1 : 0;
      var l = 0.35 + 0.5 * rim + 0.3 * ring; return [Math.cos(a) * rr, Math.sin(a) * rr, l, l, l, l];
    }, GOLD);
    $("#coinTitle").textContent = "A coin (procedural stand-in)";
  }
  function fillCoin(pick, metal) {
    var R = 1.45;
    for (var i = 0; i < N; i++) {
      var s = pick() || [gauss() * 0.02, gauss() * 0.02, 0.3, 0.3, 0.3, 0.3];
      pCoin[i * 3] = s[0] * R; pCoin[i * 3 + 1] = s[1] * R; pCoin[i * 3 + 2] = (s[2] - 0.5) * 0.12;
      var lit = 0.15 + Math.pow(s[2], 1.4) * 1.4;
      cCoin[i * 3] = (metal[0] * 0.7 + s[3] * 0.3) * lit; cCoin[i * 3 + 1] = (metal[1] * 0.7 + s[4] * 0.3) * lit; cCoin[i * 3 + 2] = (metal[2] * 0.7 + s[5] * 0.3) * lit;
    }
    aCoin.needsUpdate = true; aCCoin.needsUpdate = true; renderOnce();
  }

  /* map: land from atlas.js's continent outline, countries from its coordinates, weighted by real coin counts */
  function buildMap(world, coords, landPath) {
    var W = 4.8, H = 2.4, land = [];
    if (landPath && window.Path2D) {
      var cv = document.createElement("canvas"); cv.width = 400; cv.height = 200;
      var g = cv.getContext("2d", { willReadFrequently: true }); g.scale(0.4, 0.4); g.fillStyle = "#fff"; g.fill(new Path2D(landPath));
      var d = g.getImageData(0, 0, 400, 200).data;
      for (var y = 0; y < 200; y += 1) for (var x = 0; x < 400; x += 1) if (d[(y * 400 + x) * 4 + 3] > 128) land.push([x / 400, y / 200]);
    }
    var pts = [], total = 0;
    world.forEach(function (w, k) {
      var c = coords && coords[w.iso], u, v;
      if (c) { u = (c.lon + 180) / 360; v = (90 - c.lat) / 180; }
      else { u = 0.08 + (k % 10) * 0.092; v = 0.25 + Math.floor(k / 10) * 0.12; }   // no coordinates: a plain banded layout
      var wt = Math.sqrt(w.count); pts.push({ u: u, v: v, wt: wt, n: w.count }); total += wt;
    });
    var landShare = land.length ? 0.55 : 0;
    for (var i = 0; i < N; i++) {
      var u, v, col, z = 0;
      if (rnd() < landShare) {
        var L = land[Math.floor(rnd() * land.length)]; u = L[0] + (rnd() - 0.5) / 400; v = L[1] + (rnd() - 0.5) / 200; col = [0.30, 0.25, 0.15];
      } else {
        var t = rnd() * total, p = pts[0];
        for (var k = 0; k < pts.length; k++) { t -= pts[k].wt; if (t <= 0) { p = pts[k]; break; } }
        var spread = 0.004 + 0.0016 * Math.sqrt(p.n);
        u = p.u + gauss() * spread; v = p.v + gauss() * spread * 1.6; z = Math.abs(gauss()) * 0.05 * Math.sqrt(p.n) / 3;
        var b = 0.7 + Math.min(1, p.n / 30) * 0.6; col = [GOLD[0] * b, GOLD[1] * b, GOLD[2] * b];
      }
      pMap[i * 3] = (u - 0.5) * W; pMap[i * 3 + 1] = (0.5 - v) * H; pMap[i * 3 + 2] = z;
      cMap[i * 3] = col[0]; cMap[i * 3 + 1] = col[1]; cMap[i * 3 + 2] = col[2];
    }
    aMap.needsUpdate = true; aCMap.needsUpdate = true;
    $("#mapTitle").textContent = world.length + " countries";
  }

  /* album: one real album's slot list (filled = lit disc, empty = dim ring) */
  function buildAlbum(album) {
    var slots = album.slots, n = slots.length, cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
    var cell = Math.min(4.4 / cols, 2.6 / rows), hole = cell * 0.36;
    var tint = /copper|bronze|cent/i.test((album.metal_text || "") + " " + (album.denomination_text || "")) ? COPPER : /silver/i.test(album.metal_text || "") ? SILVER : GOLD;
    for (var i = 0; i < N; i++) {
      var k = Math.floor(rnd() * n), sl = slots[k], cx = ((k % cols) - (cols - 1) / 2) * cell, cy = ((rows - 1) / 2 - Math.floor(k / cols)) * cell;
      var filled = sl.state === "filled", a = rnd() * 6.2831853, rr = filled ? Math.sqrt(rnd()) * hole : hole * (1.0 + gauss() * 0.04);
      pAlbum[i * 3] = cx + Math.cos(a) * rr; pAlbum[i * 3 + 1] = cy + Math.sin(a) * rr; pAlbum[i * 3 + 2] = filled ? 0.03 : 0;
      var b = filled ? 0.85 + 0.35 * (1 - rr / hole) : 0.28;
      var c = filled ? tint : [0.55, 0.55, 0.6];
      cAlbum[i * 3] = c[0] * b; cAlbum[i * 3 + 1] = c[1] * b; cAlbum[i * 3 + 2] = c[2] * b;
    }
    aAlbum.needsUpdate = true; aCAlbum.needsUpdate = true;
    var filledN = slots.filter(function (s) { return s.state === "filled"; }).length;
    $("#albumTitle").textContent = album.id + " · " + (album.title || album.family || "album");
    $("#albumText").textContent = filledN + " of " + n + " holes have a coin (" + (album.family || "") + "). Lit holes have a coin, dim rings are still empty.";
  }

  // Offline / file:// fallback for the album only: the A001 COUNTS from collection/albums.json on 2026-10-07 (89 holes, 77 filled).
  // Which holes are empty is not known offline, so the 12 empty rings are simply drawn last; the screen says this is a fallback.
  var A001_FALLBACK = { id: "A001", title: "Whitman 9030 · Lincoln 1941-1974 #2", family: "Lincoln cents", metal_text: "95% Copper Bronze", denomination_text: "1¢ Wheat Cent", slots: [] };
  for (var q = 0; q < 89; q++) A001_FALLBACK.slots.push({ state: q < 77 ? "filled" : "empty" });

  function nextCoin() {
    if (!coins.length) return;
    coinIx = (coinIx + 1) % coins.length; var c = coins[coinIx];
    loadImage("../" + c.thumb).then(function (im) { sampleCoin(im, c.label); }).catch(function () { say("photo " + c.scan + " did not load"); });
  }
  $("#next").addEventListener("click", nextCoin);
  Array.prototype.forEach.call(document.querySelectorAll("#hud [data-mode]"), function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); }); });

  var index = getJSON("../data/index.json").catch(function () { return null; });
  var atlas = getText("../atlas.js").catch(function () { return null; });
  var albums = getJSON("../collection/albums.json").catch(function () { return null; });

  index.then(function (ix) {
    if (ix && ix.flips) {
      coins = ix.flips.filter(function (f) { return f.thumb && f.status !== "Removed"; });
      coins.sort(function (a, b) { return (b.est || 0) - (a.est || 0); });       // most valuable photographed coins first
      coinIx = -1; if (coins.length) nextCoin(); else proceduralCoin();
    } else { proceduralCoin(); say("offline: data/index.json not reachable, procedural coin"); }
    return atlas.then(function (src) {
      var coords = null, land = null;
      if (src) {
        try { var m = /const COUNTRY_COORDS = (\{[\s\S]*?\n\});/.exec(src); if (m) coords = JSON.parse(m[1]); } catch (e) { coords = null; }
        var p = /const CONTINENT_PATHS = "([^"]+)"/.exec(src); if (p) land = p[1];
      }
      if (!coords) say("map coordinates unavailable, banded layout");
      var world = (ix && ix.world) || [];
      if (!world.length) { world = []; for (var k = 0; k < 49; k++) world.push({ iso: "", count: 1 }); say("country counts unavailable"); }
      buildMap(world, coords, land);
    });
  }).then(function () {
    return albums.then(function (al) {
      var a = al && (Array.isArray(al) ? al : al.albums || []).filter(function (x) { return x.slots && x.slots.length; });
      if (a && a.length) buildAlbum(a[0]); else { buildAlbum(A001_FALLBACK); say("album list unavailable, A001 counts from 2026-10-07"); }
      document.documentElement.setAttribute("data-ready", "1"); renderOnce();
    });
  }).catch(function (e) { say("load problem: " + e.message); });

  // the coin photo could fail to sample (file://): catch the SecurityError once and fall back
  var _sample = sampleCoin;
  sampleCoin = function (img, label) { try { _sample(img, label); } catch (e) { proceduralCoin(); say("photo pixels unreadable here (open over http), procedural coin"); } };

  /* ---------------- scroll -> stage ---------------- */
  var target = 0, stage = 0, pinned = false;
  function readScroll() {
    if (pinned) { if (mode === "still") renderOnce(); else kick(); return; }
    var secs = document.querySelectorAll("main section"), vh = window.innerHeight, best = 0;
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    best = (window.scrollY / max) * (secs.length - 1);
    target = Math.max(0, Math.min(3, best));
    if (mode === "still") { stage = Math.round(target); renderOnce(); } else kick();
  }
  window.addEventListener("scroll", readScroll, { passive: true });

  /* ---------------- pointer stir (Calm: gentle, Full: strong; Still: off) ---------------- */
  var stir = 0, ptrWorld = new THREE.Vector3(9, 9, 0), ray = new THREE.Vector3();
  function onPtr(e) {
    if (mode === "still") return;
    var x = (e.clientX / window.innerWidth) * 2 - 1, y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
    var t = -camera.position.z / ray.z; ptrWorld.copy(camera.position).addScaledVector(ray, t);
    stir = Math.min(1, stir + (mode === "full" ? 0.35 : 0.15)); kick();
  }
  window.addEventListener("pointermove", onPtr, { passive: true });
  window.addEventListener("pointerdown", onPtr, { passive: true });

  /* ---------------- render loop with fps meter and automatic step-down ---------------- */
  var running = false, last = 0, t0 = performance.now(), frames = 0, fpsT = 0, slow = 0, idle = 0;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // pull back until the 4.8-unit-wide map and album fit the width (portrait phones), never closer than 5.2
    var fit = 2.6 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.z = Math.max(5.2, fit);
    camera.updateProjectionMatrix(); uniforms.uPx.value = renderer.getPixelRatio() * (h / 900) * (camera.position.z / 5.2);
    setGain();
    renderOnce();
  }
  window.addEventListener("resize", resize);
  function draw(now) {
    uniforms.uTime.value = (now - t0) / 1000;
    uniforms.uStage.value = stage;
    uniforms.uStir.value = stir;
    uniforms.uPtr.value.copy(ptrWorld);
    uniforms.uFlow.value = mode === "full" ? 0.55 : mode === "calm" ? 0.3 : 0.0;
    uniforms.uSpark.value = mode === "full" ? 1 : 0;
    renderer.render(scene, camera);
  }
  // additive dust saturates to white when many grains overlap: dim each grain as the grain count rises
  function setGain() { uniforms.uGain.value = 0.55 * Math.min(1, Math.sqrt(12000 / geo.drawRange.count)); }
  function renderOnce() { if (!running) draw(performance.now()); }
  function kick() { if (mode === "still" || running || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var speed = mode === "full" ? 3.2 : 1.6;               // Calm morphs at half speed
    stage += (target - stage) * Math.min(1, dt * speed);
    stir *= Math.pow(0.12, dt);
    draw(now);
    frames++; fpsT += dt;
    if (fpsT >= 0.5) {
      var fps = frames / fpsT; fpsEl.textContent = fps.toFixed(0) + " fps · " + (geo.drawRange.count / 1000).toFixed(0) + "k";
      if (fps < 45 && tier < TIERS.length - 1) { if (++slow >= 4) { tier++; geo.setDrawRange(0, TIERS[tier]); setGain(); slow = 0; say("stepped down to " + TIERS[tier] / 1000 + "k grains"); } } else slow = 0;
      frames = 0; fpsT = 0;
    }
    // stop the loop when nothing moves (Calm keeps a slow drift for 6 s after the last input, then rests)
    var settled = Math.abs(target - stage) < 0.002 && stir < 0.01;
    idle = settled ? idle + dt : 0;
    if (mode === "still" || document.hidden || (idle > (mode === "full" ? 1e9 : 6))) { running = false; fpsEl.textContent = "resting · " + (geo.drawRange.count / 1000).toFixed(0) + "k"; return; }
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });

  function noGL(why) {
    $("#stage").style.display = "none"; $("#fallback").style.display = "grid"; fpsEl.textContent = "no WebGL";
    getJSON("../data/index.json").then(function (ix) { var f = (ix.flips || []).filter(function (x) { return x.thumb; })[0]; if (f) { $("#fbimg").src = "../" + f.thumb; $("#fbimg").alt = f.label; } }).catch(function () {});
    say(why); document.documentElement.setAttribute("data-ready", "1");
  }

  // deep link to one study: #stage=0..3 pins that form (scrolling no longer morphs); remove the hash to scroll through all four
  var hs = /stage=([0-3])/.exec(location.hash);
  if (hs) {
    pinned = true; stage = target = +hs[1];
    Array.prototype.forEach.call(document.querySelectorAll("main section"), function (sec, k) { if (k !== +hs[1]) sec.hidden = true; });
  }
  resize(); setMode(mode); readScroll();
})();
</script>
</body>
</html>
```

---

## 7. Own lane (what I'd do next, inside the rules)

1. **GRK-7-01 · Phase 2 catalogue sweep, one change file per batch of about 20 types.** For each type: open its Numista entry (from this box the type pages load through the page fetcher; about 1 in 3 hits a JavaScript check and needs a retry or another source), then write `catalogs` (with the Numista number, raising coverage from 2 of 167), nominal weight and diameter, composition and per-issue mintage, each citing `Numista N#… (URL)`. Start with the 15 approximate-weight types (#40) and the 3 search-snippet-only items in section 2 (C212, C231, C159). Files go to `collection-incoming` only when the owner asks for that run.
2. **GRK-7-02 · Recheck every Muse Round 4 mintage against its own source string.** `changes.jsonl` lines around 1400-1510 (the Round 4 block; I cited 1422-1502) are where the "neighbour figure" errors live (C258, C246, C073, C088). A source naming a different denomination or mint than the record is a mechanical check, and I can list them all in one pass.
3. **GRK-7-03 · Answer my own feedback.** The FEEDBACK doc's 10/10 standard is to check `_raw_capture/_phase1/` before uploading, never invent ids, and hold what I can't name. That stays my rule for STAGING runs. For #55 I read without seeing Muse's answer.
4. **GRK-7-04 · Bake-off (#4): participate, never score.** I must not see the answer key. If I helped assemble it, I shouldn't be scored on it.
5. **GRK-7-05 · Not my lane:** code, GitHub, `data/`, verifying facts, or merging. Section 3's fixes are for Claude.

---

## 8. Questions for Joseph (≤5)

1. **GRK-8-01 · C238, 2 Deutsche Mark 1973 D:** whose name is written next to the portrait, **KONRAD ADENAUER** or **THEODOR HEUSS**? It decides KM#124 or KM#A127 and which mintage applies (10,393,000 or 10,379,000).
2. **GRK-8-02 · C088, 1957 dime:** on the torch side, left of the torch near the bottom, is there a small **D**? No letter means Philadelphia (160,160,000 per the current record); D means Denver (113,354,330, PCGS).
3. **GRK-8-03 · C073, the tube of 26 1976 quarters:** keep it as one mixed lot (no single mintage), or sort it into P (no letter) and D piles and log two records?
4. **GRK-8-04 · Opening film:** should a tap anywhere skip it, and should it play at most once a day instead of every time the app opens? Today the first tap turns the sound on (section 3, GRK-3-06/07).
5. **GRK-8-05 · C064, Malta 2008 €1:** is there a small **F** (Paris mint mark) on the Maltese side? Numista lists the 2008 coin as "2008 F".
