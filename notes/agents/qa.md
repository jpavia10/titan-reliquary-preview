# QA audit, build tr55 (2026-10-01), report only, no code or data changed

Method: worktree at live build, served on :8808, Playwright (desktop 1366x800 and Pixel 7), external hosts blocked.
Scratch scripts and screenshots: /tmp/qa/ (boot-*.png, phone-*.png, deep-*.png, offline.png, audit/report.md).

## Scoreboard (what passed)
- Boot: 0 console errors, 0 page errors, no horizontal scroll, all 5 wings render, desktop and phone.
- Pipeline: `validate.py` CLEAN (48 issuers, 156 types, 273 specimens, 28 lots, 33 albums); `test_pipeline.py` 9/9 OK; `test_parity.py` PARITY OK (17378 comparisons, 0 unexplained).
- Offline: SW registered by hand, 84 files in `titan-shell-tr55`; offline reload shows Hall ($5,393.70), the other 4 wings, a dossier and search; 0 errors. Manifest + 5 icons valid.
- Deep links `#coin=C001`, `#coin=EU-CH-008`, `#coin=NA-CA-001`, each wing hash, `#gallery?cont=Europe`: work. Search finds country, year, denomination, ser, C-number. Esc closes palette and drawer. Dossier next (ArrowRight) works. Reduced motion: 0 infinite animations running, 18 `prefers-reduced-motion` rules.
- Good dry-run (template) merges 2 events; a bad one is rejected with readable per-line reasons.

## Findings

### Honesty
**H1 High: Calipers / "Forensic Metrology" show invented measurements as "Measured Physical Coin Planchet Diameter".**
app.js:1230-1266 (`getSpecimenDiameter`, `getSpecimenThickness`), 1296-1315 (`renderCaliperHud`), 1332-1336 (guide text). With 0 photos there are no measurements. Diameter comes from a regex on the denomination (any "5 centavos" = 25.0 mm, "1 gulden" = 25.0, unknown = 26.5/22.0 mm); thickness is `dia/14.5` clamped to 1.1-3.2 mm; "Die Clock Orientation" is a constant (180 degrees for every coin); the LCD title says "Measured". `getSpecimenDiameterSource()` already returns `"estimate"` but the HUD ignores it. The HUD is also on the Hall exhibit (Calipers button).
Fix: show only values with source `ledger`/`measured`; otherwise "not measured yet"; delete thickness and die-clock for coins without data; retitle "Measured" to "Catalogue diameter". Effort S.

**H2 High: the "pedigree" slab looks like a grading certificate.** app.js:1381-1415. Each tile carries `ARCHIVE № NA-MX-001`, `LEDGER #C114`, a barcode strip (constant string), "TITAN ARCHIVE", "TITAN SECURE ARCHIVE ★", "Security Hallmark", "TITAN ARCHIVAL REPOSITORY", plus "Conf med". The numbers are real ser/ids but the form reads as an authentication slab, and `ser` is provisional until the reassignment (the "ARCHIVE №" will change). Dad may think these coins are certified.
Fix: "Ref (provisional)" instead of "ARCHIVE №", drop barcode and "Secure/Hallmark". Effort S.

**H3 Medium: album slot dossiers invent attributes.** app.js:6286-6312. Every slot gets `tender` "Canadian/United States Legal Tender", `diameter_mm` from denomination, `year = startYear + i` when no year, and "Album Specimen (Encapsulated in Binder)" for slots the audit says are only count-only/partial (`schema/seed/ALBUMS_AUDIT.md`: 11 count-only + 12 partial). CLAUDE.md requires `"inferred"` marking; the dossier does not show it.
Fix: an "inferred from the Whitman model" chip on each generated field. Effort M.

**H4 Medium: Study "Missing Years" says "This list is complete: every slot in these 2 binders is accounted for"** (phone-study.png) although album contents may be partial. Overclaims certainty on the owner's founding question. Show the evidence level (enumerated / partial / count-only) next to the 18. Effort S.

**H5 Medium: Hall numbers that do not reconcile.** Tile "FLIPS 273 / $184 est." but `board.flips.cards` = 267 (data/index.json: "$183.82 / 267 cards"). "PIECES 1,636 in the vault" includes ~930 album coins (many count-only) and has no "about". Silver "63.27 oz" includes 24 oz of album ASE estimated from an unverified count (`metals.inventory.ag.ase_albums`).
Fix: say "about", footnote what is counted; reconcile 267 vs 273. Effort S.

**H6 Medium: "Live Market Baseline" badge (app.js:734, index.html:489).** Spot is a dated snapshot (2026-09-30 08:12 PT, gold-api.com), not live. The dates are shown elsewhere, but "Live" is untrue when Dad opens it days later, and nothing warns that spot is stale.
Fix: "Spot as of 30 Sep", staleness warning after 2 days. Effort S.

**H7 Low: a terminal theme effect prints fake rows** ("$1 MS-63 $142.10", "provenance verified - chain of custody intact"), app.js:7420-7435. Decoration only; label as DEMO or remove. Effort S.

**H8 Low: gallery chip "Silver reserves, 5 coins"** (wings/gallery.js:59) counts silver flips only; most silver is in albums and bullion. Rename "Silver flips". Effort S.

### Dad-readability
**D1 High: tiny text on important info (phone, computed sizes).** Slab 7.7 px (barcode), 8.96 px (holo brand), 9.6 px (cert num, seal, metal), 10.2 px (grade line), 11.2 px (conf, melt), SVG labels 3.6-4.2 px; eyebrows 11.5 px; "HOLD" badge 10.9 px; ledger chip 11.5 px; ticker tags 11.5 px; Study binder stat labels 11.5 px (174 of them); Lab request kind 10.2 px; `.btn` 12.2 px (all Study/Gallery buttons).
Fix: a global floor (`--fs-min:14px`) in styles.css / slab-legibility.css. Effort M.

**D2 High: contrast.** `tools/themes/audit.js` (desktop + phone, 20 atmospheres, 200 states): text fails 1122 (299 unique signatures), token-pair fails 0, console errors 0. Top causes:
1. Museum slab fixed colours, every theme, 1.9 to 3.0:1: `.slab-barcode` #3b4049 on #06080d (1.91), footer melt 2.76, cert num 2.82, pedigree sub 2.89, footer price 2.9, seal text 3.0, grade 3.04. Some may be measured mid-fade; verify on a settled capture. 11 elements are "theme-blind".
2. `conservator`: ticker price #221c12 on #211a11 = 1.02:1 (invisible) and Hall exhibit chevrons 1.02:1 (124 fails).
3. `notepad`: 170 fails, min 1.00:1, 45 signatures (worst).
4. `abyss`: 80 fails.
Also visible in the default atmosphere (phone-hall.png): ticker label `LEDGER` dark red on near-black, and the first ticker item is cut off ("AL MELT").
Fix: repair conservator, notepad, abyss tokens first, then move slab colours into theme tokens. Effort M.

**D3 Medium: touch targets under 44 px.** Study nav pills 34 px high (6, the Study's main navigation), Study `.btn` 40 px (10), Gallery "Inspect Dossier" 38 px and "3D Flip" badge 26 px, Cover Flow scrubber 6 px, Lab checkbox 22x22 and `.btn` 38 px, Study text input 30 px. Bottom nav is fine.
Fix: `min-height:44px` on `.btn`, `.study-nav-pill`, inputs. Effort S.

**D4 Medium: the floating "Set the scene - 20 stations" pill and search FAB cover content on phone** on every wing (phone-hall/gallery/study.png): they sit on top of the first row of the next card. A 20-station music control is the most prominent control on screen while search is a small circle.
Fix: shrink the pill to an icon, dock the FAB above the nav and label it "Search". Effort S.

**D5 Medium: jargon.** "Forensic Guide", "die reticle", "planchet", "pedigree", "Crown Jewels", "Market Sensitivity Simulator", "melt", "Value above melt", "Vault Intelligence", "Storage Buckets", "Ledger v2:613cfbca159d564a" (a hash in the header chip and under the headline), "SER", "Conf med/high". Use plain words. Effort M.

**D6 Medium: "Which Silver Eagle year am I missing?" is 1 tap from the Hall (Study).** Study opens on "Which years am I missing?" with American Silver Eagles preselected and "18 years missing" on the first screen: meets the 3-tap goal. But: the pill row highlights "World Atlas & Map" while the content is Missing Years (phone-study.png, deep-_study.png, fresh profile, `#study`); the list of the 18 years is below the fold under the floating pill; the Hall has no "What am I missing?" shortcut.
Fix: correct the pill state, add a Hall button, show the 18 years as large chips under the number. Effort S.

### Correctness
**C1 Medium: Back never returns to the previous wing.** Wing tab clicks use `history.replaceState` (app.js:262-263), so Android Back from Study leaves the app. Measured: after clicking Study then Lab, Back stays on Lab (no entries added by clicks). Hash-typed navigation does work. Fix: `pushState` for wing changes and one entry per opened dossier. Effort S.

**C2 Low: `#coin=C999` silently shows the Hall** and keeps a bad hash; no "not in the collection" message. Effort S.

**C3 Low: `#3d` and `#atmo` open overlays but the hash is not cleared on close**, so a reload re-opens them. Effort S.

**C4 Low: search ranking.** "5 francs" returns 1/2 franc and 2 francs (matches "franc"); "Silver Eagle" lists a Mexican 50 centavos first (note text) before the ASE vault lot and albums; "1/2 dollar" returns nothing. Rank exact denomination/series first; add synonyms (half dollar / 50 cents). Effort M.

**C5 Low: keyboard focus.** The 11 Hall ticker items are tab stops (11 tabs of non-interactive text), and these controls showed no outline or box-shadow in my probe: `sim-toggle-btn`, Obverse, 3D Flip, 3D Table, Calipers, Loupe, Inspect Dossier, terminal asset/time buttons. Re-check visually. Fix: `tabindex=-1` on the ticker; global `:focus-visible{outline:3px solid;outline-offset:2px}`. Effort S.

**C6 Low: unlabeled icon buttons.** Study `atlas-cam-btn` buttons and some Lab `btn small` have no accessible name. Add aria-labels. Effort S.

### Offline / PWA (passes; items)
**P1 Low:** `data/*.json` and `detail/*.json` are not in the install precache (SHELL_URLS), they enter the cache only after use. Precache `index.json`, `search.json`, `master_catalog.json` (~0.8 MB). Effort S.
**P2 Medium:** SW BUILD, `?v=trNN` in index.html and version.json are bumped by hand (sw.js header says publish_all.sh does it; that script is not in this repo). Make `publish.py` stamp all three and add a test that fails when they differ. Effort S.
**P3 Low:** wing buttons have `aria-selected` but no `role=tab`/`tablist`; add roles or drop aria-selected. Manifest lacks `id`. Effort S.

### Data pipeline
- Tests pass (see scoreboard).
- **PL1 Medium: a wrong-typed value crashes with a Python traceback, not a rejection report.** `{"field":"value.est_usd","new":"lots"}` through `apply_changes.py --dry-run` ends in `TypeError: type str doesn't define __round__` (`collection_io.make_boot`, line 82). An AI sees a stack trace and gets no report file. Validate types against schema/v2 before building boot rows. Effort S.
- **PL2 Medium: rules in INSTRUCTIONS are not enforced.** A Phase 2 `condition.grade = "MS-70"` with `source:"test"` on C001 (no photos exist) is accepted. Rule says grade only from pro photos and a real source. Require a photo record for grade and a recognisable source. Effort M.
- **PL3 Low:** `value.est_usd = -5` is caught only at final validation ("1 problem(s)") with no line number. Effort S.
- **Gaps for an AI that has never seen the project (Gemini/Grok):**
  1. Drive path contradicts: AI_START_HERE says `collection-incoming (AI change files)/`, INSTRUCTIONS.md says `Titan Reliquary/collection/_incoming/`. Pick one.
  2. `op` (`create` vs `set`) is missing from the INSTRUCTIONS event table (only in section 3 text and `apply_changes.py --help`).
  3. The entity list omits `album` (accepted by the tool), and Phase 1.5 (album scans; `--help` accepts 1 | 1.5 | 2) has no instructions at all.
  4. No field reference: record shapes are inferable only from two templates. Point to `schema/v2/` and list required fields per entity and allowed values (`metal_class`, `housing.kind`, `lifecycle.status`).
  5. No guidance on ISO codes for territories and the `EC` clash (CURATION_OPEN.md section 6), two coins in one photo (a test exists, the doc is silent), duplicates across photos, medals/tokens, unreadable labels beyond "report it".
  6. Never says how to dry-run (`python3 tools/pipeline/apply_changes.py --dry-run file`) nor when the pipeline runs; the daily routine has no Drive/repo connector (CLAUDE.md log), so a Gemini user gets no feedback loop.
  7. The example file name uses 2026-10-02 (a future date); confusing.

### Dead weight and risk
- **R1 Medium: the whole inventory and values are public.** Pages serves `collection/` (all 273 specimens, valuations, housing "SentrySafe", board totals), CLAUDE.md and planning docs; `robots.txt` Disallow and `noindex` only hide it from search. Grep found no token, key, email or street address (`ghp_`, `github_pat_`, `AIza`, `sk-ant`, private keys, emails), so nothing credential-like leaks; the owner accepted public hosting, but publishing only `data/` and the app (not `collection/`, docs) reduces exposure. Effort M.
- **R2 Medium: external hotlinks.** Music from incompetech.com, audionautix.com, files.freemusicarchive.org (20+ tracks per station, `DISABLED = {}` empty, js/playlist.js:557) and Mixkit SFX (ambient.js:37). Not verifiable from this sandbox (hosts blocked). Offline they fail quietly. Run `await TitanLofi.audit()` in a real browser; self-host if any are dead. Effort S to audit, M to self-host.
- **R3 Low: stale docs.** CLAUDE.md: "ledger v252, ~$5,584" vs live v2:613cfbca... $5,393.70; "Pipeline (Python) is on Drive, not in this repo" is false (tools/pipeline/); "Last verified 2026-09-30 (build TR50)" vs tr55; "Open questions" 3 and 4 (LEDGER.md backup, TAP HERE doc) are resolved or moot; "Known caveats" `parse_vault.py` / `/home/box` / hand-syncing mirrors are obsolete; "21 bullion lots" vs 28 lots in validate (state what the other 7 are). `collection/board.json` has `"root": "/home/box/collection"` (Grok's box path) in a public file. CHANGELOG.md is the old theme-refresh branch log ("local only, never pushed"); DRIVE_ANALYSIS.md and FRAMEWORK_BRIEF.md have no live reader.
- **R4 Low: dead files.** `stage/` (436 KB) and `photos/agent_cropped/TITAN-299/300_*.webp` + `photos/thumbs/*` are the retired ids (C297-C300) while the app has 0 photos; `tools/enrich_test/__pycache__` is committed. Delete after confirming no references. Effort S.
- **R5 Low: size.** app.js 397 KB + styles.css 338 KB on first paint, plus 84 files on SW install. Not blocking.
- **R6 Low:** the daily routine `trig_01YRZeFHBmSJWHyxt43nQ5nc` has no Drive connector or repo; it does nothing until the owner adds them.

## Things the owner probably wants but has not asked for (ranked)
1. **Dad Mode.** One remembered switch: 18-20 px text, three big buttons (What am I missing? / Find a coin / What is it worth), no music pill, no atmospheres, no jargon. Fixes D1, D4, D5 for the person who matters.
2. **"Missing years" for every series, not just Silver Eagles.** Big year chips per series, a printable/shareable want list for coin shows, and an honest evidence badge per album. The Study has the engine; the Hall needs a one-tap entry.
3. **Family "estate sheet" printout.** One page/PDF: what is where, approximate melt value, what is collectable, who to call, the HOLD policy in plain language; regenerated by the pipeline. Doubles as an insurance inventory.
4. **Staleness and backup honesty on the Hall.** "Prices as of 30 Sep (3 days old)", "Backed up to Drive 1 Oct", "Photos: 0 of 273"; a daily spot refresh (the routine has no connectors yet) and a documented restore drill so the backup is proven.
5. **Phone photo-session helper.** "Next coins to photograph" checklist with the pen-label guide in big letters, duplicate warning, progress bar to the end of Phase 1.
6. A non-public link (passphrase page or private hosting) instead of robots.txt (R1).
7. Change history and undo: "Recently changed by AI (not verified)" and a `revert` command per change file (changes.jsonl already holds the data).
8. Verified/unverified markers in the dossier (green check = owner confirmed) so Dad can tell facts from AI guesses.
9. Duplicate/near-duplicate finder across flips for the physical sort.
10. An "update available" banner after each publish and a one-line add-to-home-screen hint for Dad.
