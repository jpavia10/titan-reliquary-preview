<!-- doc-status: current; normative: no -->
# Titan Fix List (text copy)

Text copy of the owner's live checklist (claude.ai/artifact/Aogoa4MfwCVPpck9xKUV8M), rendered from docs/fixlist/items.json by tools/fixlist/render.py together with the artifact, so the two never differ. Item numbers never change. Copied 2026-10-29, build tr263.

## State of the union (2026-10-29, build tr263)

The one thing to be best in the world at: the most trustworthy record of a personal coin collection, researched by a team of AIs that check each other. Every fact shows where it came from, which AI or person said it, who checked it and how sure we are, and you confirm what only the coin can answer with one tap. Nobody does this for a private collection.

- **306** pieces in flips (300 coins, 6 tokens), 51 countries
- **$5,390** headline value at the latest metal prices (silver $60.59, gold $4,162)
- **227** pieces with a phone photo; 79 still need one, 14 have both sides
- **219 / 306** pieces through Phase 1 (71.6 %): 79 need a photo, 28 need a mint mark read
- **917 / 1775** album slots filled, all 33 albums read from your page photos
- **57.0 %** of the 3,449 facts on screen are cited or confirmed; 1367 are Checked by two independent sources

### What is strong

- **A research system that runs itself.** Every gap in the data is homework: the loop hands each AI the jobs it is best at, never its own facts to check, files every disagreement instead of overwriting, and measures each AI by how often its facts turn out wrong. Since Oct 20 the never-checked ledger facts go first, read blind from the photos, and about 900 items are out to Grok, Muse and Gemini.
- **Trust machinery.** Every fact has a certainty label, a history and now a link to its exact source; “Checked” means two independent sources agree. The change history is sealed (a correction is a new line, never an edit), and every photo is fingerprinted against its original.
- **One pipeline, one master, tested on every update.** Any AI drops a change file; one script checks it, merges it and rebuilds the site. 53 pipeline tests, 19 research-loop tests, a 38-point phone + desktop smoke test and a GitHub integrity check run on every update; a monthly restore drill rebuilds the whole site from the backup.
- **Never silently broken.** Daily prices, live-site check, smoke and integrity checks and a daily backup zip run on GitHub; Health warns when any fails.
- **Exportable, printable, recoverable.** The whole collection opens as a spreadsheet (coins, album holes, lots, every source) and as one JSON file, a printable inventory exists, and a recovery card says how to rebuild everything from the daily backup.

### What is holding it back

- **Photos are the bottleneck.** 79 pieces have no photo and none has a pro photo yet; Phase 2 cannot start before them.
- **A quarter of the facts are still the old ledger's word.** 863 of 3,402 facts on screen were never checked (1,106 before Oct 21); the AIs' blind photo reads keep shrinking it.
- **The loop needs a chat to turn.** Nothing the AIs drop merges until a session opens, until the 10-minute install (#92).

### The next three moves, in order

- **1. Photograph the missing coins.** 79 pieces; Scan a coin names and sends each one.
- **2. The 10-minute install (#92).** Then the AIs' files merge every hour without a chat.
- **3. A 5-coin pro-photo test (#61).** I prepare the standard; you shoot five coins; I run them end to end.

## What unlocks what (read right to left: do the last link first)

- **Phase 2 pro photos (#61)** needs the new serial numbers (#5, grouped by country: decided) ← Phase 1 at 100 % (216 of 306: 79 photos and 31 mint marks missing)
- **The loop running without a chat (#92)** needs your one-time install ← nothing else
- **Titan v3 (#119)** needs Grok's theme pass to finish ← your design direction (#30)

## Waiting on you (not tickable: only you can do these)

- Switch on the autonomous intake + Drive backup (once, about 10 minutes): follow docs/INTAKE_BRIDGE.md. Never paste the URL or the key in a chat; tell me “the bridge is installed” (#92).
- Print the recovery card: Drive → Titan Reliquary → 'RECOVERY CARD (print this, keep it in the safe)'; write your recovery codes on it by hand.
- Photograph the missing coins with Scan a coin (Hall footer): 79 pieces still have no photo. That is most of what stands between Phase 1 and 100 %.
- Optional: a free Numista API key as the GitHub secret NUMISTA_API_KEY turns on collector values for every coin (#62). Never paste the key in a chat.

## Questions for you (11 open, all in the app; only the coin itself can answer)

- **T001** How many stars are on token T001 (the 20 play token with GR)?
- **C153** Turn over C153, the 2008 UK 10 pence. Does the back show a crowned lion, or a piece of the Royal Shield?
- **C159** East Caribbean coins are filed under the code EC, which is really Ecuador's code. Switch East Caribbean to XC?
- **?** Your Mercury dime album (A006): from your page photos it has 77 holes, but the record says about 80. Is 77 right?
- **C275** Do you have two UK 5 pence coins dated 1992?
- **C140** Please take a phone photo of C140's map side (Spain 2008 1 cent) and drop it in the STAGING folder.
- **C023** Turn over C023, the 1918 iron 20 in the oak wreath. Is the other side a crowned double-headed eagle with a shield on its chest?
- **C238** On C238, the 1973 D West German 2 mark, whose name is written next to the portrait: KONRAD ADENAUER or THEODOR HEUSS?
- **C088** On C088, the 1957 dime, look on the torch side, left of the torch near the bottom. Is there a small D?
- **C064** On C064, the Malta 2008 1 euro, is there a small F on the Maltese (cross) side?
- **C073** C073 is a tube of 26 1976 quarters. Keep it as one mixed lot, or sort it into no-letter and D piles?
- **→** Answer them in the app: Hall footer → Questions. Tap your answers, then “Save answers file” into the Drive change-file folder, or “Copy for chat” and paste it to me.

## The other AIs (what each one is doing now (updated 2026-10-29))

The research loop hands out homework from the data after every update (docs/agents/RESEARCH_LOOP.md): each AI gets the kinds it is best at, never its own facts to check, and a different AI checks every fact. Their full pages: Drive “WORK QUEUE for …” docs, and docs/agents/ in the repo.


### Grok (active)

Strongest contributor, treated as a top model (owner, 2026-10-10: "Grok is basically opus if it needs to be so I think they get the hardest shit"): research questions, disagreements to settle, catalogue numbers and citations first, plus the code and security reviews.

- Now GPU worlds for the 31 themes still on the first engine, one at a time (Midnight Gallery, Prism, The Mint, Shipwreck first) #128
- Now Sound hunt: music and room sounds for your 17 themes (24 pieces of music, 85 field recordings) #83
- Now Replace the 45 ambience sounds of unknown licence with recordings whose licence is on their own page #83
- Now Album prices: third reader for the 40 holes in A017-A033 where the first two prices disagree most #62
- Homework Researcher: 1 items, due 11-02 HW-grok-research-20261023-1
- Homework Cataloguer: 7 items, due 11-04 HW-grok-cite-20261028-1
- Then UI rethink, step 2: The Field's three filters, on the real data #116
- Then Splash film: Coinverse 16:9 again, plain coins (only when Joseph says the credits allow) #56
- Then Music: a recording for each of the 3 held pieces #83
- Always Read new coin photos (with Muse, blind)

Measured: 926 of its facts checked by another AI: 916 confirmed, 10 wrong. Gets work: Drive doc 'WORK QUEUE for Grok' in Titan Reliquary/ (the same page is docs/agents/QUEUE_grok.md on GitHub). Drops change files in Drive collection-incoming (AI change files).


### Muse (active)

Researcher and writer, loaded up (owner, 2026-10-23: "Load up muse"; 2026-10-10: "I think muse wants to step up so maybe see what they got in them"): capacity 40, up to 8 batches per kind, every kind incl. catalogue numbers and the new 'fill' sheets (blank specs, designers, obverse/reverse text on the types we hold). Harder work first (research questions, catalogue citations, collector values). Off probation 2026-10-24: 4 files in a row scored 10 with no accuracy fault (changes_muse_20261024-0509 to -0552; RESEARCH_LOOP.md section 9); its facts are now checked at the measured-error rate.

- Now Sound hunt: music and room sounds for your 17 themes (22 pieces of music, 85 field recordings) #83
- Now Cite your own era fields: 263 'period' facts on 138 types are still 'AI guess' #48
- Now Which side to shoot: the 31 coins whose mint mark is unread #57
- Now Album prices: third reader for the 40 holes in A001-A016 where the first two prices disagree most #62
- Now Second reader on Grok's Numista batches #72
- Now Theme pictures: the 22 wide heroes (priority 2) #113
- Homework Appraiser: 1 items, due 11-02 HW-muse-value-20261023-1
- Homework Writer: 4 items, due 10-30 HW-muse-plain-story-20261023-1
- Homework Second reader: 2 items, due 10-31 HW-muse-verify-20261024-2
- Homework Cataloguer: 1 items, due 10-31 HW-muse-cite-20261024-1
- Homework Second reader: 4 items, due 10-31 HW-muse-verify-20261024-3
- Homework Second reader: 3 items, due 10-31 HW-muse-verify-20261024-4
- Homework Fact-checker: 20 items, due 11-04 HW-muse-story-check-20261028-1
- Homework Arbiter: 1 items, due 11-04 HW-muse-arbitrate-20261028-1
- Homework Cataloguer: 2 items, due 11-07 HW-muse-fill-20261028-1
- Homework Fact-checker: 13 items, due 11-04 HW-muse-story-check-20261028-2
- Homework Arbiter: 12 items, due 11-04 HW-muse-arbitrate-20261028-2
- Homework Photo reader: 1 items, due 11-04 HW-muse-read-mint-20261028-1
- Homework Second reader: 80 items, due 11-04 HW-muse-verify-20261028-1
- Homework Second reader: 21 items, due 11-04 HW-muse-verify-20261028-2
- Homework Photo reader: 4 items, due 11-05 HW-muse-read-mint-20261029-1
- Always Read new coin photos (with Grok, blind)

Measured: 489 of its facts checked by another AI: 477 confirmed, 12 wrong. Gets work: Drive doc 'WORK QUEUE for Muse' in Titan Reliquary/ (docs/agents/QUEUE_muse.md). Drops change files in Drive collection-incoming (AI change files).


### Gemini (active)

Loaded to the maximum (owner, 2026-10-22: "Homework is the best way I can get it to listen to me and complete tasks. Load it up with an obscene amount of homework"). Measured 2026-10-22: 0 of 16 assignments issued since Oct 14 answered; tonight's design-text file 11 of 26 right (its redo on 2026-10-23: 24 of 26, score 8); blind locked photo test 76 % core, 3.0 % invented (ties Grok). Capacity 40, up to 8 batches per kind, 5-day deadlines (an ignored sheet goes back to the pool for Grok and Muse sooner). Off probation 2026-10-23: 4 files in a row scored 8+ with no accuracy fault (changes_gemini_20261023-1644 to -1647; RESEARCH_LOOP.md section 9); its facts are now checked at the measured-error rate like Grok's. 2026-10-23 (owner: 'update its homework but keep its scope high'): + fill (blank Phase 2 facts, the kind its design-text redo did well), and theme, motion and music builds as projects.

- Now Numista price estimates for every coin we hold (268 issues of 173 types) #62
- Now Sound hunt: music and room sounds for your 16 themes (13 pieces of music, 80 field recordings) #83
- Now Second reader for all 33 albums, from the page photos (blind) #55
- Homework Second reader: 80 items, due 10-31 HW-gemini-verify-20261020-1
- Homework Second reader: 80 items, due 10-31 HW-gemini-verify-20261021-1
- Homework Second reader: 80 items, due 10-31 HW-gemini-verify-20261021-2
- Homework Second reader: 80 items, due 10-31 HW-gemini-verify-20261022-1
- Homework Second reader: 78 items, due 10-31 HW-gemini-verify-20261022-2
- Homework Fact-checker: 36 items, due 11-05 HW-gemini-story-check-20261024-1
- Homework Cataloguer: 8 items, due 11-05 HW-gemini-fill-20261024-1
- Homework Second reader: 14 items, due 11-05 HW-gemini-verify-20261024-1
- Homework Arbiter: 10 items, due 11-05 HW-gemini-arbitrate-20261024-2
- Homework Fact-checker: 2 items, due 11-05 HW-gemini-story-check-20261024-2
- Homework Cataloguer: 12 items, due 11-05 HW-gemini-fill-20261024-2
- Homework Cataloguer: 12 items, due 11-05 HW-gemini-fill-20261024-3
- Homework Cataloguer: 12 items, due 11-05 HW-gemini-fill-20261024-4
- Homework Cataloguer: 3 items, due 11-05 HW-gemini-fill-20261024-5
- Homework Second reader: 80 items, due 11-05 HW-gemini-verify-20261024-2
- Homework Second reader: 53 items, due 11-05 HW-gemini-verify-20261024-3
- Homework Photo reader: 1 items, due 11-02 HW-gemini-read-mint-20261028-1
- Then Titan v3 M1: build the accepted spec (the 2026-10-24 file is not it) #116, #117
- Always Read new coin photos as the third blind reader

Measured: 438 of its facts checked by another AI: 436 confirmed, 2 wrong. Gets work: Drive doc 'WORK QUEUE for Gemini' in Titan Reliquary/ (docs/agents/QUEUE_gemini.md), from whichever Gemini Joseph opens: the Gemini app (Argon), Antigravity or Gemini Spark. Files go to Drive collection-incoming (AI change files) as changes_gemini_YYYYMMDD-HHMM.jsonl. Gemini saves every file itself; nothing goes through Joseph (owner, 2026-10-23).


### ChatGPT (parked)

Parked (owner, 2026-10-10: "Chatgpt is too manual so I dont expect stuff to come from there since it requires me"): no Drive access, so every task needs Joseph to paste it. Its projects moved to Grok (reviews) and Muse (Dad's guide). Nothing is expected from it.

- Test Blind photo test, the main pack (30 coins) #4

Measured: None of its facts checked by another AI yet. Gets work: Its page is https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/QUEUE_chatgpt.md; it takes part only when it can save its files to Drive itself (ChatGPT's Google Drive connector). Joseph never pastes anything for it (owner, 2026-10-23).


## Your calls (only you can do these; each takes minutes)

- [ ] **#129 The opening films and the 1 GB site limit**: The site is at 924 MB of GitHub Pages' 1 GB. Under your new rule (no prerendered openings) the Grok films stop playing; they are 430 MB. Say 'remove the films' (they stay in git history and on Drive) and the site drops to about 500 MB, with room for the new recordings. The other way out is #99: create the empty repos titan-films and titan-music so I can move the films and music there. Needs first: you: one word · Unlocks: the sound hunt's recordings, more themes _[small, needs you, new]_
- [ ] **#92 The loop turns without a chat: autonomous intake**: Built and tested. Every hour a GitHub job merges the AIs' change files from Drive through every gate and test, rebuilds the site and refreshes each AI's WORK QUEUE doc; the same install starts the daily Drive backup and Health's stale-backup warning. Until then I merge by hand in a session. Until then nothing backs up to Drive by itself: the newest site backup in Drive is from Sep 28 (the daily one on GitHub is current), and Gemini can only open sheets Claude copies to Drive by hand. Needs first: you: the one-time install, about 10 minutes (docs/INTAKE_BRIDGE.md: one Apps Script project, two GitHub secrets) · Unlocks: #50, #93, daily progress with no session open _[partly done, large, needs you, new]_
- [ ] **#114 Try it on your phone and tell me**: Everything was tuned on a software graphics chip, never on a real phone. Open a few themes; tell me which effects are too strong, too faint or stutter, and anything in the sound or music that bothers you. One tap adds your phone's speed: Health → Measure speed → Add this speed report. Needs first: your phone, 10 minutes _[small, needs you, new]_
- [ ] **#3 Settle the open curation questions**: 14 questions wait in the app (Hall footer → Questions), including the A006 hole count (80 → 77, only you can lower it) and “Where did they come from?”. With the coin in hand each takes seconds; most can wait for the pro-photo session. Needs first: you, with the coins · Unlocks: Phase 1 at 100 %, #5 _[partly done, medium, needs you]_
- [ ] **#30 Pick the final design direction**: Grok's The Field is in the app as a UI toggle since tr181; the AIs' other proposals are in /prototypes/v2/. Pick a direction (or say "neither") and buttons, layout and Titan v3 follow it. Unlocks: #29, #63, splash and icon _[large, needs you]_
- [ ] **#127 Narrow two write paths (your call)**: From the #106 review. (1) Since Oct 19 grok-bot pushes code straight to main; the checks run after, but nothing stops a bad push. Safer: Grok pushes to grok/* branches and I merge as soon as integrity and smoke are green. (2) Grok, Muse and Gemini reach your whole Google Drive through their connections. Narrower: a separate Google account that only holds the shared Titan Reliquary folder. Say yes to either and I write Grok's new instructions or the share steps. _[small, needs you, new]_

## Next up (me and the AIs)

- [ ] **#128 Theme framework: one engine, a room for every theme, openings on the theme's own world (locked; now piece by piece)**: Owner, Oct 29: "get the framework for all of the themes locked so i can just improve piece by piece". Locked: one engine (TitanFXK), the world contract, the room shell and the gate CL-WORLD-01 (docs/design/THEME_FRAMEWORK.md; status per theme in docs/themes/FRAMEWORK_STATUS.md). In the app: Scene Studio > Step inside opens any theme's room over its live world (drag, pinch, tap, tilt; Look, Sound, Opening), and Supercell, Tourbillon and Silver Screen open on their own world at launch, handing the same world to the app. The other GPU worlds go through Gemini's conversion and the gate; the 31 themes still on the first engine are Grok's homework (task 12); then Scene Studio v4 in depth. Needs first: your phone to judge the rooms and openings (#114) · Unlocks: rooms for all 50 themes, openings without films (#129) _[partly done, large]_
- [ ] **#5 Reassign the serial numbers (grouped by country)**: Decided (you, Oct 21): grouped by country, e.g. EU-CH-001, EU-CH-002 in year order, ties broken by a salted hash so scan order never shows. The plan for all 306 pieces is ready (collection/SER_REASSIGN_PLAN.md); it is applied once, then frozen, and the new number is what you write on each flip's back. Needs first: Phase 1 at 100 % (216 of 306) and your East Caribbean code answer (EC or XC, in Questions) · Unlocks: #61 (Phase 2 pro photos) _[large]_
- [ ] **#61 Phase 2 photo standard and a 5-coin test shoot**: Light, background, scale and file names for the pro photos, tested on 5 coins end to end (pairing, 2x2 and circle crops, registering, the quality check) so the rest are shot once. Grok's varieties checklist (what to look for under the loupe on each US, UK and German coin) becomes the shoot checklist. Needs first: nothing for the test; the full shoot needs #5 · Unlocks: Phase 2, #64, #79 _[medium, needs you, new]_
- [ ] **#62 Real collector values**: Grok appraises with a cited price page per value (63 coins priced twice so far, 62 agreed). Your free Numista API key turns on a weekly job that fills in every coin. Needs first: your free Numista API key (Waiting on you) · Unlocks: a firmer headline, #107 _[partly done, large, new]_

## Done (119 shipped, merged or dropped (numbers never change))

- [x] **#104 Export everything in plain formats**: Oct 20: data/export/ is rebuilt on every publish: coins.csv (all 306 pieces, 41 columns, with "how sure" and the source for 9 key facts), album_holes.csv (all 1,775 holes, with the price and source of each missing one), lots.csv, collection.json (the whole master record plus every certainty label) and a plain README. Opens in Excel, Numbers or Google Sheets; linked from the printable inventory (insurance copy). _[done Oct 20]_
- [x] **#106 Who can change what**: Oct 20: docs/WHO_CAN_CHANGE_WHAT.md lists every way in (GitHub accounts and app, each GitHub job's token, the repo secrets, Drive and its connectors, the Apps Script) with its guard. Narrowed: the integrity, smoke and restore-drill jobs now get read-only tokens. Two paths are wider than needed and wait for you: #127. _[done Oct 20]_
- [x] **#123 Process Grok's Oct 16 drop**: Oct 20: Grok's Oct 15-19 files and Muse's Oct 17 files merged through the gates (175 lines), the C301 and C304 photos cut and live, 37 disagreements settled (Grok won every one Claude could decide, incl. the euro globe/map side on 10 types). Scores: Grok 9, Muse 7. The Field v2 was already hosted by Grok at /prototypes/v2/grok/. _[done Oct 20]_
- [x] **#124 Decide on two possible duplicates: C300 and C301**: Oct 19 (you): keep both. C301 has its own photo now (Oct 20: the file filed under C293 was really C301's 1989 coin, so that photo is retired); C293 and C300 still need a photo of their own (shoot list). _[decided Oct 19]_
- [x] **#60 Dad test**: Dropped (you, Oct 20: "Too focused on my dad's easy navigation ... Just make my experience and he will check it and be like damn nice"). The app is designed for your own experience; no separate Dad test. _[dropped Oct 20]_
- [x] **#109 Your dad's phone**: Dropped with #60 (Oct 20): your dad uses the same app as you. _[dropped Oct 20]_
- [x] **#85 The research loop: homework generated from the data**: Oct 9 (tr104): every gap in the data is a job (cite a catalogue fact, check another AI's fact, read a mint mark, fact-check or simplify a story, answer a research question, appraise a value, settle a disagreement). After every update the loop closes answered homework, hands each AI new assignments in the kinds it is best at, never its own facts, and measures how often each one is wrong. docs/agents/RESEARCH_LOOP.md. _[done]_
- [x] **#86 “Checked”: two independent sources agree**: Oct 9 (tr104): a new label above Reference. A fact is Checked when two different contributors each stated it with their own exact source or photo; an AI never checks itself. 25 facts so far; every check another AI does adds more. _[done]_
- [x] **#87 Answer sheets and a gate that never overwrites**: Oct 9 (tr104): every assignment comes with a pre-filled answer sheet; an unfilled line is simply left out, a line written against an old value is skipped (not a rejected file), and a check that disagrees is filed, never written over the record. A mintage or catalogue number is never accepted on a photo alone. _[done]_
- [x] **#88 The blind photo tests recur by themselves**: Oct 9 (tr105): each AI is due the main test every 6 months and the locked test every 90 days; due tests appear at the top of its page and the scores are logged, so accuracy is measured over time, not once. _[done]_
- [x] **#89 A coin's year list can no longer shift under pending files**: Oct 9 (tr104): adding a new coin used to re-sort its type's years, so an AI line written for “the 4th year” could land on another year with the same empty value. Years are now append-only. _[done]_
- [x] **#90 Held music is searched again on every run**: Oct 9: pieces with no qualifying recording are re-searched on every music run and reported, never used until reviewed. It found Handel's Ombra mai fu by Les Arts Florissants on its first run. Also fixed: the encoder had silently lost its quality settings. _[done]_
- [x] **#55 Two AIs read each new coin**: Oct 9 (tr105): automatic. When an AI reads a new coin from its photo, the year, mint mark and face value go blind to a second AI (it never sees the first reading); agreement makes them “Checked”, a difference becomes a disagreement record. New-coin files are also compared with double_read.py before merging. _[done]_
- [x] **#18 Keep AI disagreements as records**: Oct 9 (tr104): every disagreement between two contributors is kept in collection/disagreements.jsonl with both values, both sources, who said what and how it was settled. A check that disagrees is filed there and never overwrites the record; a third reader (or you) settles it, and the loser is counted wrong. The first 7 are the Oct 8 Muse-vs-record conflicts. _[done]_
- [x] **#74 Source chips that open the exact entry**: Oct 9 (tr104): tap any label in a coin's view: the panel now has “Open the source” links to the exact entry (Numista N#… opens its catalogue page), so a right number on the wrong coin shows at a glance. _[done]_
- [x] **#76 A change log that can never be quietly rewritten**: Oct 9 (tr104): every line of the change history is chained to the one before (collection/changes.chain). Saving refuses to change an old line, the checker compares the chain with the file, and a GitHub job checks on every update that the history only grew. The fingerprint is published with the data, so any saved copy pins the history up to its day. _[done]_
- [x] **#79 Fingerprint every photo**: Oct 9 (tr104): all 217 cut-outs carry the fingerprint of the original phone photo they were cut from, checked against Drive by file id (13 same-name duplicates caught). A photo without one is flagged in Health. _[done]_
- [x] **#64 Printable inventory for insurance and family**: Oct 9 (tr105): rebuilt on every update, linked from Health: an insurance copy (with values and how sure we are) and a family copy without values. Photo, id, what it is, where it came from, a tick-off column; prints on Letter or A4. Still yours to decide: which copy goes to whom. _[done (v1)]_
- [x] **#72 Grok's Numista sweep (round 1)**: Oct 8 (tr102): Grok swept 152 of 162 types in 9 batches overnight: 484 facts, each with the exact Numista entry and the row it read. Catalogue fixes (Guatemala, Trinidad, Mexico, Vietnam, Jamaica, USSR), catalogue weights and sizes instead of ranges, Schön numbers. The trust meter went from 5.7 % to 18.1 %. Round 2 (47 types, 93 facts and 31 catalogue numbers) is in its queue. _[done]_
- [x] **#71 Settle the Swiss 1968 B mintage**: Oct 8 (tr102): Grok read the 1968 B row of Numista N#189: 31,588,000 struck at Bern; the 10,000,000 is London’s 1968 striking without a mint mark. Both coins now show 31,588,000 (labelled Reference). _[done]_
- [x] **#40 Replace the approximate weights with catalog weights**: Oct 8 (tr102): every swept type now carries the catalogue weight and size from Numista instead of a range (Jamaica $1 3.65 g, Mexico 5 pesos 3 g, Trinidad 25 cents 3.53 g and more); the few left are in Grok’s round 2. _[done]_
- [x] **#82 Sound: smooth start, on by default, one tap = the whole scene**: Oct 8 (tr101): the stutter at the start came from work piling up in the first two seconds (measuring loudness on the phone, building the reverb, switching the effect, a fragile background-sound route). All moved out of the way: start-up blocking went from about 1.2 s to 0.1 s on a fast computer. Sound now starts with your first tap (Off is remembered). Tapping a theme brings its sound and music; tapping a scene brings its lighting and effect. _[done]_
- [x] **#84 Always work queued for the other AIs**: Oct 8: Grok, Muse and ChatGPT each have a standing queue (Gemini’s is parked until you fix it): Drive “WORK QUEUE for …” docs, and a GitHub page for ChatGPT. Each starts the next task by itself; I refresh the queues at every intake. See “The other AIs” above. _[done]_
- [x] **#75 One honest trust meter**: Oct 8 (tr100): the Hall, the Simple view and Health show how much of what the app says is proven: today 5.7 % of the 3,181 facts on screen are cited or confirmed (69 % come from the original ledger unchecked, 21 % are AI readings, 2.5 % read from a photo). It rises every time you confirm a fact or an AI cites the exact entry. _[done]_
- [x] **#57 Phase 1 finish line**: Oct 8 (tr100): one bar in the Lab and in Health: 172 of 285 pieces are through Phase 1. The 7 fields are frozen (photo, country, year, denomination, mint mark read from the coin, story, default value); 77 still need a photo and 55 need their mint mark read. The Lab lists exactly what each piece lacks. _[done]_
- [x] **#54 Shoot list in the right order**: Oct 8 (tr100): Lab → Shoot list. Photos that settle one of your questions come first, then a research question, then an unread mint mark, then value × doubt, then the oldest. “Start here” shows the top 12; a second batch lists the 194 coins that need their other side, and which side. _[done]_
- [x] **#78 Confirm while you hold it**: Oct 8 (tr100): every coin on the shoot list shows up to 3 facts to check in hand (“Right? Year 1978”). One tap queues the confirmation for the Questions page; your answers file turns them into verified facts. _[done]_
- [x] **#52 Questions badge for your dad**: Oct 8 (tr100): the Hall shows “15 questions only the coin can answer” next to the trust number, and the Simple view opens with a big “Answer the questions” button. _[done]_
- [x] **#59 One motion setting**: Oct 8 (tr100): Scene Studio → Sound → Settings → Motion: Full / Calm / Off for everything that moves (effects, the opening film, page movement, the Motion Lab). It follows the phone’s reduce-motion setting until you pick one; Off skips the opening film. _[done]_
- [x] **#81 Haptics on phones**: Oct 8 (tr100): a tiny tick when you tap a button, tab or chip; a double tick for a confirm or an answer. Android vibrates; iPhone (iOS 18) gets the system tick. Switch: next to Motion in Settings. _[done]_
- [x] **#58 Restore drill**: Oct 8 (tr100): the backup zip was rebuilt into an empty folder; the master validated, the data came out identical (285 flips, same headline) and the restored site passed all 27 smoke checks on phone and desktop. Runs again on the 3rd of every month. The opening films and sound recordings are left out of the compact backup on purpose (they stay in GitHub). _[done]_
- [x] **#39 Fix the catalog numbers Muse flagged**: Oct 6–8: 11 of 12 fixed, Eritrea last (C212 is KM#47, Numista N#2403, 7.8 g, 25 mm; Grok re-checks it in the sweep). The 12th, the C238 portrait name, is a question for you in the app. _[done]_
- [x] **#66 Deep review by four outside AIs**: Oct 8 (tr99): Grok, Muse, ChatGPT and Gemini each reviewed the whole project; every claim was checked against the files before anything was used. Scores: Grok 10, Muse 8, ChatGPT 5 (it read an old copy), Gemini 1 (it could not open the files and invented a review). 43 coin corrections merged: Vietnam, Greece, Malta, Netherlands, Philippines, UK mintages, East Caribbean, Saudi, Cuba, Thailand, the Swiss 2 francs split, the Greek coin's story. _[done]_
- [x] **#67 The whole collection works offline**: Every coin's page, search and the questions are now saved on the phone after the app opens, not only the Hall; Health has “Save all coin photos for offline”. The smoke test proves it by opening a never-viewed coin with the network off. _[done]_
- [x] **#68 The big number moves with silver and gold**: The headline used to be the Sept 30 figure ($5,369). It now uses the latest daily metal prices and says which day, the same number as the Portfolio chart. _[done]_
- [x] **#69 Truth checks on every publish**: A new check finds records that contradict each other or claim more than their evidence (Health → Contradictions to check). It went from 257 findings to 31: 114 mintages given their one home, 111 stale “unknown” notes cleared. What is left is real work: the Swiss 1968 conflict (#71), the C238 portrait, and 28 US/German coins whose mint letter can't be read. _[done]_
- [x] **#70 Contract holes closed**: Every AI catalogue fact now needs the exact entry or the photo, even when the source names no site; the Oct 21 provenance deadline goes by the day of the merge, not the AI's own clock; a coin's mintage has one home and writing it on one coin updates the others of that issue; publishing can no longer leave the app half-written. _[done]_
- [x] **#80 Dad-facing fixes from the reviews**: A tap anywhere now skips the opening film (it used to turn the sound on); Skip is large and readable over any frame; Simple view labels follow its 22 px base (some were 13–16 px); Questions says “can't load” when offline instead of “no open questions”. _[done]_
- [x] **#51 GitHub job versions before Oct 19**: Checked GitHub's own warnings: the old actions already run on the new engine. The real Oct 19 change is Ubuntu 26, so the smoke test (which installs a browser) is pinned to Ubuntu 24.04. _[done]_
- [x] **#11 “Why do we believe this?” per fact**: Already there since tr93: tap any certainty label in a coin’s view to see who said it, when, the source, and whether it was checked; History shows every change. _[done]_
- [x] **#53 Act on Muse's process audit**: tr98: the next coin id is now published for every AI; a possible double entry is flagged at intake; files in a made-up format are bounced instead of fixed by Claude; the record of which AI made each fact is required from Oct 21; reshoot naming written down. A bounced file no longer costs probation. _[done]_
- [x] **#49 Warn when a daily job fails**: Health now has a "Background jobs" section, and the Hall's Health button shows ⚠ when any job failed. _[done]_
- [x] **#47 Read in Muse's own file format automatically**: A converter now turns Muse's own format into proper change files and lists what to check on the photo, including possible duplicates. _[done]_
- [x] **#37 Count the silver already sitting in your albums**: Your albums hold 1.06 oz of silver (1964 Kennedy, 1966 and 1967 40% halves, two Roosevelt dimes, a Mercury dime, a 1964 quarter), and it is in the silver total. _[done]_
- [x] **#38 Explain the 1.5 oz of bullion silver no record accounts for**: Solved from Grok's own notes: the 1.5 oz is the silver in your albums, counted from day one. One album was over-estimated (Kennedy A007: the photo shows 3 silver halves, not 6), so silver is now 62.83 oz and the total $28 lower. _[done]_
- [x] **#46 Retire the unused Swiss type record**: CH.KM.24a has no coins since the split; remove it so the integrity report is clean. _[not needed]_
- [x] **#1 Process new drops from Grok and Muse**: Muse's 3 coins filed as C281 France 1994 5 francs, C282 Yugoslavia 1965 50 para, C283 Germany 2002 10 cent; photos cut; Muse scored 7/10. _[done]_
- [x] **#12 Show value with its uncertainty**: The Hall headline now reads: about $5.4k = melt $4,383 (firm) plus about $1.0k collector premium (estimate). _[done]_
- [x] **#13 Label album slots as tracked, not catalogued**: Album counts now say "tracked, not catalogued" in the Hall, Study and Simple view. _[done]_
- [x] **#17 Exact sources per fact**: Catalogue facts from an AI must cite the exact entry (Numista N#…, KM#…, URL, page); a bare "Numista" now rejects the file. _[done]_
- [x] **#20 Track AI cost against facts produced**: New collaborators/AI_RUNS.md: one line per AI file (events, kept, verified, cost). Costs fill in once AIs report them. _[done]_
- [x] **#24 Music tempo slider in Scene Studio**: Tempo slider (70–140 %) in Scene Studio → Sound, remembered between visits. _[done]_
- [x] **#26 Gallery side cards show the coin backs**: Side cards now show the coin's photo even when only the back was photographed (same rule as the tiles). _[done]_
- [x] **#27 Study "0 of 0" chips**: No longer happens: every album now has a known slot total. _[done]_
- [x] **#31 Automatic smoke test of the whole app**: 23 checks on phone and desktop (every wing, search, coin view, 3D table, offline) run on every deploy. _[done]_
- [x] **#36 Questions for you, answered in the app**: Questions page in the app (Hall footer → Questions): tap answers, then send them as one file. _[done]_
- [x] **#41 Find possible duplicate records**: One possible double entry: C169 and C275 (both UK 1992 5p). Now a question for you. _[done]_
- [x] **#42 Warn when the spot price is stale**: The Hall shows the daily price date and warns if it is over 36 h old. Also fixed the daily price job, which failed on Oct 5. _[done]_
- [x] **#43 Owner "confirm" button on each fact**: Tap any label in a coin's view → "I checked the coin: this is right". It waits in Questions until you send it. _[done]_
- [x] **#44 Certainty chips in the Lab, Study and 3D table**: Lab and Study already open the same coin view with labels; the 3D table got a "How sure we are" button. _[done]_
- [x] **#45 Tell Grok and Muse about provenance in their feedback docs**: Grok and Muse feedback docs now carry the provenance and exact-source rules. _[done]_
- [x] **#9 Certainty labels in the coin view**: Each fact marked Verified, Owner-confirmed, Reference-backed, AI guess or Needs review. _[done]_
- [x] **#10 Coin history in the coin view**: A short timeline: logged, story added, photo found a mismatch, corrected. _[done]_
- [x] **#14 Record which AI, prompt and photo produced each fact**: So a later correction shows what went wrong and who got it right. _[done]_
- [x] **#15 Keep crop settings with every photo**: Cheap now and impossible to recover later. Lets us test whether better crops make the AIs read coins better. _[done]_
- [x] **#16 Split the AI scorecard in two**: "Follows the rules" (today's score) vs "gets coins right" (new, measured). _[done]_
- [x] **#33 Schema upgrade tests**: Prove each data-format upgrade keeps every fact. _[done]_
- [x] **#34 Update the Drive "AI_START_HERE" doc**: Make the Drive copy match the repo so outside AIs see the current counts and rules. _[done]_
- [x] **#6 Health screen in the app**: Shows which build and data version you are seeing, offline cache state, photo coverage, problems found. _[done]_
- [x] **#7 Automatic live-site check after each deploy**: A GitHub job confirms the live site really serves the new build and data. _[done]_
- [x] **#8 Refresh button says what happened**: "Updated to tr92" or "Already current", never a silent reload. _[done]_
- [x] **#110 The 20 animation styles, inside the themes**: Done (tr108-tr110), from your first video: every one of the 20 styles is a live GPU effect in the theme it suits: Particles in Midnight Gallery, Liquid morph in The Mint, Holographic in Prism, Neon glow + Retro VHS in Neon Vault, Wireframe 3D in Solar Observatory, Glassmorphism in Hyperborean Vault, ASCII art in The Construct, Gradient mesh in Samadhi, Art deco in Nocturne, Halftone in Conservator, Neo-brutalism in Plaintext; the other nine got new themes (#111). Each theme's old signature effect stays underneath, softer, and each has a rare “moment” with a sound (#21). Every theme passes the contrast check. _[done]_
- [x] **#111 Six new themes for the styles that had no home**: Done (tr108): Arcade (pixel art), Pulp Adventure (comic book), Drafting Room (blueprint), Clay Diorama (clay 3D + isometric), Bauhaus (Bauhaus + kinetic type) and Grand Terminal (split-flap departures board with your 50 countries). 26 themes now, in a new “Studio” group; each has its own colours, crest, sound scene and interface touches (ink outlines, pixel corners, blueprint lines...). The Themes picker now shows every theme with a small live preview. _[done]_
- [x] **#112 A motion splash for every theme**: Done (tr110-tr113): each of the 26 themes has its own 3-second motion in its style (dust forming the title, molten letters, a KAPOW, a split-flap board, a coin drawn as a blueprint...). Since tr112 every launch plays the Grok film, then the theme's motion, then the app (a tap skips to the app); since tr113 picking a theme plays its motion too. Scene Studio > Settings > Opening changes it; Calm shows one still frame; Off skips it. _[done]_
- [x] **#21 Sounds for the effect moments**: Done (tr110): every effect moment has its own short sound (the whale, the press strike, the shooting star, POW, the clay drop, the foil sweep...), at most one every 12 seconds and only while the app is on screen; Scene Studio > Settings has an “Effect moment sounds” switch. _[done]_
- [x] **#23 Black Site terminal readability**: Done (tr109): the Construct's terminal is hidden on narrow screens and drawn at 14 px without glow; its falling code gave way to the new ASCII-art effect, which keeps clear of text. _[done]_
- [x] **#56 Motion Lab test page**: Done (tr110): six studies at /motion-lab/: gold dust (Grok), Morph (your second video, rebuilt with your coins: dust sheet, a coin formed from its photo, the burst, light ribbons, blue beams), coin flip with a rim light, a tile growing into the coin view, the Confirm seal (AI guess → Owner verified) and a coin settling into album A026. Still / Calm / Full on each. Oct 14: two more coin-flip studies, 3B by Grok and 3C by Gemini (its coin notes are marked unchecked). Tell me which ones you want in the app (#63). _[done]_
- [x] **#115 Effects keep moving while you scroll**: Done (tr111): since tr82 the effects froze while a page scrolled (to keep scrolling smooth on phones). Now they keep moving at a scroll frame rate that steps down from 30 to 20 to 12 frames a second if the phone struggles, never to zero, and the text protection follows the page as it moves. _[done]_
- [x] **#118 Answers you send get a receipt**: Done (tr116; you: "How do I know that you got those three answers?"). Questions has Send to Claude: it opens GitHub with your answers filled in, you press Submit, and a robot (owner-answers.yml, only for your own issues) merges them, publishes and replies on the issue. The phone shows each batch as Not sent, Sent (waiting) or Received with the counts, whichever way you sent it (GitHub, a chat copy or a Drive file). Offline it says so and keeps them. _[done]_
- [x] **#101 A third research AI, so disagreements never wait on me**: Oct 15 (tr116): Gemini is back on every surface (Argon chat, Antigravity, Spark; owner: "I pay for the shit so I expect it to function as we desire"), with arbitration first on its list, so Grok-vs-Muse disagreements no longer wait for me. _[done]_
- [x] **#102 Every contradiction becomes homework**: Oct 15 (tr116): a new homework kind, contradictions: every truth-check finding that needs research (30 today: German and US coins with a mintage but no mint mark read) goes to an AI as a job with an exact ask; the mechanical ones are still fixed by the script. Grok and Gemini have the first batches. _[done]_
- [x] **#99 Canary checks for the checkers**: Oct 15 (tr116): about 6 % of the values a check list shows are planted wrong on purpose (a real value of the same field from another coin type; the record stays right). An AI that sends one back unchanged was rubber-stamping; one that sends the true value caught it. Never filed as a disagreement; counted on the AI's page and in metrics (tools/pipeline/canary.py). _[done]_
- [x] **#94 Old sources re-checked on a cadence**: Oct 15 (tr116): each month a sample of 12 Checked facts cited more than a year ago goes back to a second reader (never to either of the two who checked it); a changed entry becomes a disagreement. Nothing is that old yet, so the first ones come in October 2027. _[done]_
- [x] **#95 My own spot checks counted**: Oct 15 (tr116): my own spot checks at an intake go through the same gate as an AI's check (workflow spot-check): the same value with my source = Checked and counted as a check I did; a different value = a disagreement for a third reader, never an overwrite. _[done]_
- [x] **#97 One onboarding path for any new AI**: Oct 15 (tr116): one path, written down (RESEARCH_LOOP.md section 9) and one command (tools/agents/new_agent.py): proof of access, the main photo test, half batches with every fact checked, full batches after the first good submission, off probation after 3 in a row that score 8+. _[done]_
- [x] **#96 Cost per checked fact**: Oct 15 (tr116): collaborators/AI_RUNS.md now shows, per AI, how many of its facts another contributor checked, how many held up, how many were wrong, and the cost per fact that held up (when the AI reports its cost). _[done]_
- [x] **#100 Re-test an AI when its model changes**: Oct 15 (tr116): a model name never seen before for an AI (provenance.model in its files) makes it new again: for 30 days its facts are checked first, and both photo tests come back on its page. Gemini coming back on Argon is the first case. _[done]_
- [x] **#91 Scores drafted by the pipeline**: Oct 21: after every publish, tools/agents/score_drafts.py drafts a score for each outside AI file merged since the scorecard's last row (collaborators/SCORE_DRAFTS.md): place from the file name, accepted 0 when I re-filed it, accuracy from what was cross-checked since (disagreements it lost or won, canaries, a later agreeing source, an owner correction), complete from how much of its homework sheet it answered (across its files), tier from lines off its sheet. Rejected files are listed as bounced, unscored. I adjust each draft, add the praise and move it into the scorecard; INBOX.md points there. _[done]_
- [x] **#4 Photo-model bake-off**: Measured: main 30-coin test Grok 78 % right / 3.8 % invented, Muse 71 % / 5.3 %, Gemini 85 % / 3.0 % (from a repo copy, a weak measure). Grok is the reference reader. The tests now repeat by themselves on each AI's page (every 180 days, locked every 90). _[done Oct 21]_
- [x] **#19 Locked coin test for scoring AIs over time**: Locked 15-coin test taken: Grok 76 % core / 3.0 % invented, Muse 74.5 % / 7.6 %. Gemini's comes due on its page when it is back; repeats are automatic. _[done Oct 21]_
- [x] **#48 Re-cite Muse's 26 vague sources**: Muse's 26 vague sources are cite homework now: each moves to Reference when an exact entry arrives. _[handed to the loop]_
- [x] **#50 Process your answers file automatically**: Done another way (tr116): Questions → Send to Claude opens a GitHub issue that merges your answers by itself and replies with a receipt. _[done (Send to Claude)]_
- [x] **#63 Motion into the app**: The 20 styles run inside the themes, every theme opens with its own motion and plays it when you pick it, and Grok has rebuilt the intros for all 34 themes. Motion Lab studies come in with the design work (#30) if you pick any. _[done Oct 21]_
- [x] **#65 Scan a coin in the app**: Scan a coin is live (Hall footer, or Lab → Shoot list): it checks sharpness, size and glare, names the photo and sends it to Drive STAGING. Reading the coin inside the app is dropped: it needs an AI key, and a key must never sit in a public site. _[done (v1)]_
- [x] **#73 Fact-check the stories**: Every story checked only by its author is a standing homework job now. _[handed to the loop]_
- [x] **#83 Real classical recordings**: 23 real recordings play in the scenes and on the radio's Classical station. _[done]_
- [x] **#105 A recovery card**: Written: docs/RECOVERY_CARD.md and the Drive doc 'RECOVERY CARD (print this, keep it in the safe)'. Printing it is on your list. _[done Oct 20]_
- [x] **#107 What completing each album would cost**: All 33 albums priced, about $19,000 to complete (847 of 861 holes); Grok's second source for the key dates is in. _[done Oct 20]_
- [x] **#117 A better atmosphere control (replaces the Scene Studio panel)**: Rebuilt Oct 20 (tr127): Themes | Sound | Settings with a compact header; anything beyond that is part of Titan v3 (#119). _[done (Scene Studio v3)]_
- [x] **#122 Judge every design blind before it ships**: The blind A/B page is the method for every design from now on. _[done]_
- [x] **#125 Check the ledger's facts against the photos**: Oct 21: I read 213 ledger facts blind from the photos (212 agreed, 1 went to a third reader: C220). The AIs' own blind reads of the rest run as homework. _[done for my part]_
- [x] **#2 Fix album A006 hole count (80 → 77)**: Mercury dime album: the 80 was an estimate; your page photos show 77 holes. It is a question in the app, because only you can lower a count. _[merged into #3]_
- [x] **#77 Where each coin came from**: Ready: Questions → “Where did they come from?”: pick how (bought, inherited, a gift, found, a trip), from whom and when, tick the coins by country, send. They become your own records and show in each coin's view and the printable inventory. _[merged into #3]_
- [x] **#93 Each AI's page copied to its Drive doc automatically**: Built (tr116): the loop now writes each AI's compact Drive copy (docs/agents/drive/QUEUE_{ai}.txt: its NEW note, the live link, one line per assignment), and the Drive bridge copies that file into the AI's doc whenever it changes. Until the bridge is installed I paste the same file by hand. _[merged into #92]_
- [x] **#103 Warn when the Drive backup is stale**: Health shows the age of the newest Drive backup and warns past 7 days. Today the only Drive copy is from Sept 28. _[merged into #92]_
- [x] **#22 Tune sound and music from your listening**: Levels, rain, 3D placement, choir, drums: fix what you report. _[merged into #114]_
- [x] **#25 Speed budget and phone check**: Fixed limits are checked on every deploy (first load, page size, time to a real value, longest freeze). Now one tap brings your phone's real numbers: Health → Measure speed → Add this speed report to my answers file. _[merged into #114]_
- [x] **#29 Make buttons look tappable**: Some controls do not look clickable. _[merged into #30]_
- [x] **#116 Rethink the interface beyond the wings (AI homework)**: Oct 15: your call ("the framework is good but the UI still sucks... too fixed into the wings... more novel ways of presenting data"). A design brief (docs/design/REDESIGN_BRIEF.md, also in Drive 'design-incoming (AI UI proposals)') lists every function to keep, what is wrong today, the bar and the hard rules. Grok proposes a structure beyond the five wings with a working prototype, Gemini builds two prototypes (a novel data view and the atmosphere control), Muse walks the app on a phone and ranks what is clunky with ten references. I host the good prototypes side by side at /prototypes/v2/ for you to try; only what you pick goes into the app, in small steps. Oct 16: Grok's The Field is hosted at /prototypes/v2/grok/ (v2 sent, see #123); Gemini's Continuum v2 scored 3/10 blind, every one of its 12 ideas kept, and became Titan v3 (#119-#121). _[merged into #30]_
- [x] **#120 Titan v3, step 2: albums as real pages**: Each album as a physical page with real holes: filled holes hold the coin, missing ones are empty and lit, printed circles look different, pages turn. "Which Silver Eagle year am I missing?" answered in a couple of taps from opening, in the main app. Cost to complete and the want list from data/wants.json. _[merged into #119]_
- [x] **#121 Titan v3, step 3: live value and three showpiece worlds**: The headline value moves with the metal prices; one world switch changes look, light, effect and sound together as a transition instead of a settings panel (this replaces #117). Three worlds made at showpiece quality instead of 26, each with its own badge drawn from scratch: on Oct 16 you judged all 23 badge pairs and 5 theme pairs "both weak", ours as well as Gemini's. _[merged into #119]_
- [x] **#126 A varieties checklist for the pro-photo session**: Grok's new homework: for every US, UK and German coin in a flip, the known varieties and errors of that exact year and mint (small/large date, doubled dies, wide/close AM...), what to look for under the loupe, on which side, and what it is worth if found. Becomes the Phase 2 shoot checklist, so no variety is missed while the coin is out of its flip. _[merged into #61]_
- [x] **#28 Vault narration voice**: Parked, as Grok suggested; say so if you want the voice reviewed. _[dropped Oct 21]_
- [x] **#32 Split app.js into modules**: Paused for good while Grok edits the app files every day; splitting now would collide with his work. Steps 1-5 are in. _[dropped Oct 21]_
- [x] **#35 Finish the 12 missing splash films**: Every theme now has its own intro; more films cost about $26 a clip. _[dropped Oct 21]_
- [x] **#98 Targets and progress per kind of fact**: The trust meter and the Phase 1 bar already show the progress. _[dropped Oct 21]_
- [x] **#108 Family stories for each coin**: Not asked for; Where it came from (#3) covers the basics. Say so to bring it back. _[dropped Oct 21]_
- [x] **#113 Pictures for every theme card**: Superseded: Grok's theme rebuild brings each theme's pictures with it. _[dropped Oct 21]_
- [x] **#119 Titan v3: the collection as one 3D space, albums as real pages, live value**: One plan in three steps: every piece as a real 3D coin you fly into; albums as physical pages with real holes; a headline that moves with the metal prices and one world switch for look, light and sound. Spec in docs/design/v3/M1_SPEC.md. On hold (you, Oct 20) while Grok upgrades the themes. _[merged into #128]_
