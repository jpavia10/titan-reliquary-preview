<!-- doc-status: current; normative: no -->
# Titan Fix List (text copy)

Text copy of the owner's live checklist (claude.ai/artifact/Aogoa4MfwCVPpck9xKUV8M), rendered from docs/fixlist/items.json by tools/fixlist/render.py together with the artifact, so the two never differ. Item numbers never change. Copied 2026-10-10, build tr107.

## State of the union (2026-10-10, build tr107)

The one thing to be best in the world at: the most trustworthy record of a personal coin collection, researched by a team of AIs that check each other. Every fact shows where it came from, which AI or person said it, who checked it and how sure we are, and you confirm what only the coin can answer with one tap. Nobody does this for a private collection.

- **290** pieces in flips (284 coins, 6 tokens), 50 countries
- **$5,380** headline value at the latest metal prices (silver $60.59, gold $4,162)
- **213** pieces with a phone photo; 77 still need one, 14 have both sides
- **175 / 290** pieces through Phase 1 (60.3 %): 77 need a photo, 57 need a mint mark read
- **917 / 1775** album slots filled, all 33 albums read from your page photos
- **19.9 %** of the 3,241 facts on screen are cited or confirmed; 43 are Checked by two independent sources

### What is strong

- **A research system that runs itself.** Since Oct 9 every gap in the data is homework: the loop hands each AI the jobs it is best at, never its own facts to check, files every disagreement instead of overwriting, and measures each AI by how often its facts turn out wrong. Grok, Muse and Gemini have assignments now; the blind photo tests recur on their own.
- **Trust machinery.** Every fact has a certainty label, a history and now a link to its exact source; “Checked” means two independent sources agree. The change history is sealed (a correction is a new line, never an edit), and every photo is fingerprinted against its original.
- **One pipeline, one master, tested on every update.** Any AI drops a change file; one script checks it, merges it and rebuilds the site. 48 pipeline tests, 10 research-loop tests, a 38-point phone + desktop smoke test and a GitHub integrity check run on every update; a monthly restore drill rebuilds the whole site from the backup.
- **Never silently broken.** Daily prices, live-site check, smoke and integrity checks and a daily backup zip run on GitHub; Health warns when any fails.
- **Dad-readable, and printable.** The Simple view answers “Do I have…?” in big type, the app works offline, and there is now a printable inventory with photos.

### What is holding it back

- **Most facts are still not proven.** Of 3,233 facts on screen, 602 are cited or confirmed (18.6 %), 25 of them Checked by two sources; 1,870 still come from the original ledger unchecked and 631 are AI readings without an exact source. The loop works through them as homework, but it only turns when a chat session runs.
- **The loop needs me to turn it.** AIs drop files in Drive; nothing merges until a session opens. The autonomous intake (#92) that removes this is built and tested; it switches on with your one-time install (about 10 minutes).
- **Only two AIs research today.** Gemini is relaunching through its access check; until a third AI is proven, disagreements between Grok and Muse wait for me (#101).
- **Photos are the bottleneck.** 77 coins have no photo, 194 only one side, none have pro photos. The new Scan page makes each one a few taps; Phase 2 cannot start before them.
- **The look is not decided.** The design pause continues (#30): polish comes after the foundation, as you said.

### The next three moves, in order

- **1. Turn guesses into facts.** Answer the 14 questions and the new “Where did they come from?” section; photograph the missing coins with Scan a coin, tapping “Right?” on each fact while the coin is in your hand.
- **2. Let the loop run.** Do the one-time install for #92 (docs/INTAKE_BRIDGE.md; it also starts the Drive backup), give Gemini its WORK QUEUE doc (it starts with a 3-question access check) and add the free Numista key.
- **3. Measure, then decide.** The locked test (Grok, Muse) and the main test (Gemini, ChatGPT) decide who reads Phase 2; then pick the look (#30).

## What unlocks what (read right to left: do the last link first)

- **The loop running without a chat (#92)** needs your one-time install (one Apps Script project, two GitHub secrets; about 10 minutes) ← nothing else: the bridge, the loop, the gates and the tests are built
- **Phase 2 pro photos (#61)** needs serial numbers (#5) ← Phase 1 at 100 % (now 175 of 290: Scan a coin) ← the missing photos and mint marks + your answers (#3)
- **Which AI reads Phase 2 (#19)** needs the locked test from Grok and Muse (due on their pages now) ← the main test from Gemini and ChatGPT (#4)
- **Reading a coin inside the app (#65 next step)** needs the winner of #19 ← a key kept outside the public site (#92's machinery)
- **Disagreements settled without me (#101)** needs a third research AI through the onboarding (#97: Gemini first)
- **Real collector values for every coin (#62)** needs Grok's appraisal homework (running) + your free Numista API key (the weekly price job)
- **Motion and the gold dust in the app (#63)** needs design direction (#30) + app split (#32) + your phone speed number (#25) + your picks from the Motion Lab (#56)
- **Buttons that look tappable (#29)** needs design direction (#30) + the Dad test (#60)

## Waiting on you (not tickable: only you can do these)

- Switch on the autonomous intake + Drive backup (once, about 10 minutes): follow docs/INTAKE_BRIDGE.md (github.com/jpavia10/titan-reliquary-preview/blob/main/docs/INTAKE_BRIDGE.md): one Apps Script project and two GitHub secrets. Then the AIs' files merge by themselves every hour and Drive gets a daily backup (#92, #93, #103). Never paste the URL or the key in a chat; tell me “the bridge is installed” and I run the first check.
- Answer the 14 questions in the app (Hall footer → Questions), and the new “Where did they come from?” section: pick how you got a group of coins, tick them by country, send (#77).
- Photograph the missing coins with Scan a coin (Hall footer, or Lab → Shoot list → Scan with the camera): it checks each photo, names it and sends it to Drive STAGING. Unlocks Phase 1 at 100 %.
- Start Gemini: paste the link to its Drive doc “WORK QUEUE for Gemini” and say “do the first task”. It begins with a 3-question access check, then the photo test.
- Give ChatGPT the photo test and its queue: “Read https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/QUEUE_chatgpt.md and do the next task”, then paste its answer back to me.
- Get a free Numista API key (numista.com → your account → API) and add it in GitHub: the repository → Settings → Secrets and variables → Actions → New secret, name NUMISTA_API_KEY. The weekly price job then fills in collector values (#62). Never paste the key in a chat.
- Measure your phone's speed: Health → Measure speed → Add this speed report to my answers file, then send the answers file (#25).
- Decide who gets which inventory copy: Health → Printable inventory (with values for the insurer, without for the family) (#64).
- Decide: does every coin need both sides photographed? Or can the common side of common coins be shared from one good photo? It sets the size of the “other side” batch (194 coins) and #61.
- Decide: should the opening film play once a day instead of every time the app opens?
- Re-upload 4 photos smaller than 7 MB: C105–C113, C114, C115/116, C117–C119.
- Try the Motion Lab and listen: jpavia10.github.io/titan-reliquary-preview/motion-lab/ (tell me the meter's number), and what sounds or feels off (#22).

## Questions for you (14 open, all in the app; only the coin itself can answer)

- **C066** Look at the date on C066, the Swiss 5 francs. Does it end in 6 or in 8?
- **T001** How many stars are on token T001 (the 20 play token with GR)?
- **C153** Turn over C153, the 2008 UK 10 pence. Does the back show a crowned lion, or a piece of the Royal Shield?
- **C159** East Caribbean coins are filed under the code EC, which is really Ecuador's code. Switch East Caribbean to XC?
- **?** Your Mercury dime album (A006): from your page photos it has 77 holes, but the record says about 80. Is 77 right?
- **C275** Do you have two UK 5 pence coins dated 1992?
- **C140** Please take a phone photo of C140's map side (Spain 2008 1 cent) and drop it in the STAGING folder.
- **C053** Look under the date on C053, the 2011 German 20 cent. Is the small letter an F or a J?
- **C206** On C206, the Japanese 1 yen, read the date characters at the bottom. Is it 四十六 (46) or 五十一 (51)?
- **C023** Turn over C023, the 1918 iron 20 with the oak wreath. What words are on the other side?
- **C238** On C238, the 1973 D West German 2 mark, whose name is written next to the portrait: KONRAD ADENAUER or THEODOR HEUSS?
- **C088** On C088, the 1957 dime, look on the torch side, left of the torch near the bottom. Is there a small D?
- **C064** On C064, the Malta 2008 1 euro, is there a small F on the Maltese (cross) side?
- **C073** C073 is a tube of 26 1976 quarters. Keep it as one mixed lot, or sort it into no-letter and D piles?
- **→** Answer them in the app: Hall footer → Questions. Tap your answers, then “Save answers file” into the Drive change-file folder, or “Copy for chat” and paste it to me.

## The other AIs (what each one is doing now (updated 2026-10-10))

The research loop hands out homework from the data after every update (docs/agents/RESEARCH_LOOP.md): each AI gets the kinds it is best at, never its own facts to check, and a different AI checks every fact. Their full pages: Drive “WORK QUEUE for …” docs, and docs/agents/ in the repo.


### Grok (active)

Strongest outside contributor (Numista sweep 9/10, story fixes 10/10, best blind photo test so far): opens Numista, careful exact sources, flags what it cannot settle.

- Now Fact-check the coin stories, C151 to C283 #73
- Test Blind photo test, the locked pack (15 coins) #19
- Homework Cataloguer: 20 items, due 10-16 HW-grok-cite-20261009-1
- Homework Fact-checker: 25 items, due 10-16 HW-grok-story-check-20261009-1
- Homework Appraiser: 25 items, due 10-19 HW-grok-value-20261009-1
- Homework Second reader: 25 items, due 10-17 HW-grok-verify-20261010-1
- Then Music: a recording for each of the 3 held pieces #83
- Then Motion Lab study 2: the coin flip #56
- Always Read new coin photos (with Muse, blind)

Measured: 41 of its facts checked by another AI: 41 confirmed, 0 wrong. Gets work: Drive doc 'WORK QUEUE for Grok' in Titan Reliquary/ (the same page is docs/agents/QUEUE_grok.md on GitHub). Drops change files in Drive collection-incoming (AI change files).


### Muse (active)

Good researcher and writer (scores 8, then 6; probation streak 0 of 3): second reader for Grok's catalogue facts, plain-English stories for Joseph's dad.

- Now Re-cite your 26 vague sources #48
- Now Second reader on Grok's Numista batches #72
- Test Blind photo test, the locked pack (15 coins) #19
- Homework Second reader: 25 items, due 10-16 HW-muse-verify-20261009-1
- Homework Researcher: 5 items, due 10-19 HW-muse-research-20261009-1
- Homework Writer: 15 items, due 10-16 HW-muse-plain-story-20261009-2
- Always Read new coin photos (with Grok, blind)

Measured: 35 of its facts checked by another AI: 31 confirmed, 4 wrong. Gets work: Drive doc 'WORK QUEUE for Muse' in Titan Reliquary/ (docs/agents/QUEUE_muse.md). Drops change files in Drive collection-incoming (AI change files).


### Gemini (active)

Vision (and Veo video). Back from parked on 2026-10-09: starts with a proof-of-access check, the blind photo test and small photo-reading batches; every fact it writes is checked by another AI until it has 3 good submissions in a row.

- Now Proof of access (do this first) #4
- Test Blind photo test, the main pack (30 coins) #4
- Homework Photo reader: 5 items, due 10-16 HW-gemini-read-mint-20261009-1
- Homework Second reader: 12 items, due 10-16 HW-gemini-verify-20261009-1
- Then Open art and video jobs #35
- Always Read new coin photos as the third blind reader

Measured: None of its facts checked by another AI yet. Gets work: Drive doc 'WORK QUEUE for Gemini' in Titan Reliquary/ (docs/agents/QUEUE_gemini.md). If it cannot write to Drive, it replies with the file in one code block and Joseph pastes it to Claude.


### ChatGPT (occasional)

Strong reasoning and code review; no Drive access, so everything goes through chat. Takes part less often than the others (owner, 2026-10-09): projects only, no generated homework.

- Now Review two new modules #32
- Test Blind photo test, the main pack (30 coins) #4
- Then Dad's one-page guide #60
- Then Find the holes in the research loop #85

Measured: None of its facts checked by another AI yet. Gets work: Joseph pastes https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/QUEUE_chatgpt.md into ChatGPT and says 'do the next task'; the answer is pasted back to Claude.


## Tier 0 · The research system that runs itself (the foundation for everything else: facts found, checked and measured as homework over time)


### Make it run without a chat

- [ ] **#92 The loop turns without a chat: autonomous intake**: Built and tested (tr107). Every hour a GitHub job asks a small Google Apps Script in your Drive for new change files, merges the outside AIs' files through every gate and test, publishes, turns the loop and rebuilds the site; the Drive side then trashes merged files, leaves REJECTED notes with a HOW TO FIX line and refreshes each AI's WORK QUEUE doc. Owner answers and anything that needs judgement wait for me in docs/agents/bridge/INBOX.md. No GitHub key anywhere: the job uses GitHub's own short-lived token. Needs first: you: the one-time install, about 10 minutes (docs/INTAKE_BRIDGE.md: one Apps Script project, two GitHub secrets) · Unlocks: #50, #93, daily progress with no session open _[partly done, large, needs you, new]_
- [ ] **#93 Each AI's page copied to its Drive doc automatically**: Today I paste each changed WORK QUEUE page into its Drive doc by hand at every intake. Built into #92's Drive script: it copies a page whenever it changes. Needs first: #92 installed _[partly done, medium, new]_
- [ ] **#91 Scores drafted by the pipeline**: Each submission's score (right place, accepted as sent, accurate, complete, in its tier) drafted from the merge report and the cross-checks, so CONTRIBUTOR_SCORES and each AI's feedback stay current without my bookkeeping; I only adjust and add the praise. Unlocks: #92 running unattended _[medium, new]_
- [ ] **#50 Process your answers file automatically**: When you drop answers_owner_*.json in Drive, it becomes records without waiting for a chat. #92 lists it for me but does not merge it on its own: your answers become Verified facts, and any AI with access to the folder could write a file under that name. Two ways: Google Drive added to the daily routine, or an answers file the app signs so #92 can tell it is yours. Needs first: Drive in the routine (you), or a signed answers file (#92 installed first) _[medium]_

### Make it trustworthy at scale

- [ ] **#99 Canary checks for the checkers**: Now and then a check item shows a deliberately wrong value (the record itself stays right). An AI that 'agrees' with it is rubber-stamping, and it shows in its numbers. The only way to know a checker really checks. _[medium, new]_
- [ ] **#102 Every contradiction becomes homework**: The truth checks (30 coins whose mint mark is unread but carry a mintage, two catalogue numbers on one type, years a type was never issued) feed the loop directly, routed to the right kind of job, instead of waiting in Health. _[small, new]_
- [ ] **#94 Old sources re-checked on a cadence**: Catalogue pages change and links die. A small sample of facts cited more than a year ago goes back to a second reader each month; a changed entry becomes a disagreement record. _[medium, new]_
- [ ] **#95 My own spot checks counted**: At each intake I check a sample of each AI's facts myself; those checks go into the same numbers as the AIs' checks (I am an AI too, and I never check my own facts). _[small, new]_
- [ ] **#98 Targets and progress per kind of fact**: Goals like every catalogue number Checked by January, every mint mark read by Phase 2, every story checked by someone other than its author, with a progress line for each in Health. _[medium, new]_

### Grow the team

- [ ] **#97 One onboarding path for any new AI**: Access check, then the main photo test, then half-size batches with every fact checked, then full membership after 3 good submissions in a row. Gemini is the first to go through it (relaunched Oct 9); any future AI follows the same path from roles.json. _[partly done, small, new]_
- [ ] **#101 A third research AI, so disagreements never wait on me**: With only Grok and Muse researching, a Grok-vs-Muse disagreement needs me as the third reader. A third AI that passes the onboarding (#97) settles them inside the loop. Needs first: Gemini through its onboarding, or another AI you pick _[medium, needs you, new]_
- [ ] **#100 Re-test an AI when its model changes**: Every file records the AI's exact model; when it changes, the loop treats it as new again (more of its facts checked first) and puts both photo tests on its page. _[small, new]_
- [ ] **#96 Cost per checked fact**: AI_RUNS.md gains the loop's numbers: what each AI's facts cost and how many held up under a check, so we pay for knowledge, not volume. _[small, new]_

## Tier 1 · Truth and measurement (turn guesses into facts and measure who is right)


### Truth

- [ ] **#3 Settle the open curation questions**: 14 questions wait in the app (Hall footer → Questions), plus the new “Where did they come from?” section (#77). With the coin in hand each takes seconds. The research loop no longer leaves answered questions open: 13 stale research questions were closed on Oct 9. Needs first: you, with the coins · Unlocks: Phase 1 at 100 %, #5 _[partly done, medium, needs you]_
- [ ] **#73 Fact-check the stories**: Now part of the research loop: every story nobody but its author has checked is a job (157 open); Grok has C151–C283 in progress and 25 more as homework. A checked story is re-sent with the exact entry it was checked against; a wrong sentence is corrected with its source. Needs first: nothing: running _[partly done, medium, new]_
- [ ] **#48 Re-cite Muse's 26 vague sources**: Muse has the list (its REJECTED note and queue): each one moves from “AI guess” to “Reference” when Muse resends it with the exact entry. Still pending. Needs first: Muse's next file _[small]_
- [ ] **#62 Real collector values**: Two paths, both built: Grok now has appraiser homework (25 coins at a time, each value citing the exact price page and the grade assumed; a cited value is re-appraised after a year). And a weekly GitHub job fetches Numista's price estimates per grade for every coin with a Numista number, once you add a free Numista API key. Values still change only through a cited file. Needs first: your free Numista API key (Waiting on you) · Unlocks: a firmer headline, #107 _[partly done, large, new]_

### Measure the AIs

- [ ] **#4 Photo-model bake-off**: Grok and Muse took the main 30-coin test on Oct 8 (Grok 78 % right, 3.8 % invented, never wrong when sure; Muse 71 %, 5.3 %, 17 %). The test now recurs by itself: it is on Gemini's and ChatGPT's pages as due, and every AI retakes it every 6 months so we see who improves. Needs first: ChatGPT's reply (you paste) and Gemini's access check · Unlocks: #19, which AI does Phase 2 research _[partly done, medium, needs you]_
- [ ] **#19 Locked coin test for scoring AIs over time**: The 15-coin locked test is now due on Grok's and Muse's pages (it opens only after the main test, then every 90 days). Its coin ids exist only in my locked key; it decides which AI reads the Phase 2 pro photos. Needs first: Grok's and Muse's answers · Unlocks: #65, fair scores over time _[partly done, large]_

## Tier 1 · Safety net (nothing is lost, nothing is quietly changed)

- [ ] **#103 Warn when the Drive backup is stale**: Health shows the age of the newest Drive backup and warns past 7 days. Today the only Drive copy is from Sept 28. Needs first: the Drive backup installed (it comes with the #92 install) _[small, needs you, new]_
- [ ] **#104 Export everything in plain formats**: One click: every coin, album and lot as a spreadsheet (CSV) and as structured data, with sources and certainty, for insurance, an estate, or any future app. Nothing locked into this one. _[small, new]_
- [ ] **#105 A recovery card**: One printed page in the safe: where everything lives (GitHub, Drive, the app), which accounts own it, and how to rebuild the site from the backup (the restore drill's steps in plain words). _[small, needs you, new]_
- [ ] **#106 Who can change what**: A short review of every write path (GitHub, Drive folders, keys in workflows, the AIs' access), with anything wider than needed narrowed. Gets more important once #92 runs unattended. _[small, new]_

## Tier 1 · Gates for design and motion (needed before any visual work)

- [ ] **#60 Dad test**: Ten minutes watching your dad use the Simple view (“Which Silver Eagle years am I missing?”). The known bugs are fixed first (bigger Simple view labels, tap-to-skip on the film), so the test sees the real design. Needs first: nothing · Unlocks: #29, #30 _[small, needs you, new]_
- [ ] **#30 Pick the final design direction**: Combine the three prototypes or ask for new options. This ends the design pause; every visual change waits on it. Needs first: #60 (recommended) · Unlocks: #29, #63, splash and icon _[large, needs you]_
- [ ] **#32 Split app.js into modules**: Steps 1–5 done (tr96–tr105; step 5 = the data layer, js/app-data.js). Next: the theme system and its effects (it shares a global name with the GPU effects, so it moves with a check), then the big wings one at a time, each smoke-tested. Needs first: nothing · Unlocks: #63, the redesign after #30 _[partly done, large]_
- [ ] **#25 Speed budget and phone check**: Fixed limits are checked on every deploy (first load, page size, time to a real value, longest freeze). Now one tap brings your phone's real numbers: Health → Measure speed → Add this speed report to my answers file. Needs first: your phone report · Unlocks: #63, effects tuning _[partly done, medium]_

## Parallel track · Motion (wanted, kept off the critical path)

- [ ] **#56 Motion Lab test page**: First study live at /motion-lab/ (built by Grok, checked by me): gold and silver dust forms one of your real coins from its photo, then the 49 countries, then album A001; your finger stirs it; Still / Calm / Full. Next studies: the coin flip, a tile growing into the coin view, the Confirm seal, a coin settling into its album hole. Needs first: nothing: never touches the app · Unlocks: #63 _[partly done, medium]_
- [ ] **#63 Motion into the app**: Only the studies you pick from #56, built on the chosen design, calm by default and off when the phone asks for less motion. Needs first: #30, #32, #25 and your picks from #56 (the motion setting #59 is done) _[large, new]_

## Tier 2 · Capabilities on the foundation (each one names what it waits on)


### Phase 2 and photos

- [ ] **#61 Phase 2 photo standard and a 5-coin test shoot**: Light, background, scale and file names for the pro photos, tested on 5 coins end to end before the real run (pairing, 2×2 and circle crops, registering, the quality check), so 290 coins are shot once. The scan page's photo checks (#65) are the start of the quality gate. Needs first: nothing for the test; the full shoot needs #5 · Unlocks: Phase 2, #64, #79 _[medium, needs you, new]_
- [ ] **#5 Plan the serial reassignment**: New display serials with no scan-order bias, done once. Decide first: should the numbers mean something (grouped by country) or carry no pattern? Needs first: #57 at 100 % and your East Caribbean code answer (#3) · Unlocks: #61 (you write the new id on each coin’s back) _[large, needs you]_
- [ ] **#65 Scan a coin in the app**: Version 1 is live: Hall footer → Scan a coin (or Lab → Shoot list → Scan with the camera). Pick the coin (your shoot list first), take the photo, see whether it is sharp, big enough and free of glare, and send it to Drive STAGING or to an AI app with the reading prompt, already named the way the pipeline expects. Next: the AI that wins the locked test (#19) reads it without leaving the app (needs a key that never sits in the public site). Needs first: #19 for the in-app reading _[partly done, large, new]_

### Value and family

- [ ] **#77 Where each coin came from**: Ready: Questions → “Where did they come from?”: pick how (bought, inherited, a gift, found, a trip), from whom and when, tick the coins by country, send. They become your own records and show in each coin's view and the printable inventory. Needs first: you _[partly done, medium, needs you, new]_
- [ ] **#107 What completing each album would cost**: The 858 named missing coins in your albums, each with a cited price for a typical grade, summed per album: “A026 Silver Eagles: 18 missing years, about $X”. HOLD stays the policy; this is for planning and wish lists. Needs first: #62 (prices) _[medium, new]_
- [ ] **#108 Family stories for each coin**: Your words (or your dad's) about a coin: who had it, where it was found. Typed or a voice note turned into text, kept as the owner's own story, which always wins over an AI's. _[medium, needs you, new]_
- [ ] **#109 Your dad's phone**: The Simple view as an icon on his home screen, opening straight to “Do I have…?”, read-only, with large type checked on his own phone. Needs first: his phone for 10 minutes _[small, needs you, new]_

### Music

- [ ] **#83 Real classical recordings**: 23 recordings play now, in the scenes and on the radio's Classical station. Oct 9: Handel's Largo (Ombra mai fu) is live, sung by Lea Desandre with Les Arts Florissants (CC BY 3.0), so the 1920 Caruso question is gone; every file was re-made at the intended 96 kb/s, so most got smaller. Still nothing qualifying for Nimrod, Rêverie or a piano Gymnopédie No. 3: they are re-searched on every music run, and Grok has them as a project. Needs first: nothing: re-searched on every run · Unlocks: more rooms with real music _[partly done, small, new]_

## Always on (routine collection work, done as drops arrive)

- [ ] **#2 Fix album A006 hole count (80 → 77)**: Mercury dime album: the 80 was an estimate; your page photos show 77 holes. It is a question in the app, because only you can lower a count. Needs first: your answer in Questions _[small, needs you]_

## Tier 3 · Polish (never ahead of Tiers 0 to 2. No new themes.)

- [ ] **#29 Make buttons look tappable**: Some controls do not look clickable, which is hardest on your dad. Needs first: #30 and #60 _[medium]_
- [ ] **#23 Black Site terminal readability**: The one theme where text contrast is borderline with effects on. Needs first: nothing (reviewers: defer until #30) _[small]_
- [ ] **#22 Tune sound and music from your listening**: Levels, rain, 3D placement, choir, drums: fix what you report. Needs first: your listening notes _[small, needs you]_
- [ ] **#21 Sounds for the effect moments**: A whale call when the whale passes, a clang when the press strikes, a whoosh for the shooting star. Grok suggests parking this until #63 (calm by default). Needs first: nothing _[small]_
- [ ] **#28 Vault narration voice**: Review the spoken voice in the Vault wing. Grok suggests parking it. Needs first: your ears _[small, needs you]_
- [ ] **#35 Finish the 12 missing splash films**: Any video AI, max 4 clips per run. Grok and Muse both suggest cutting this until the design is chosen (#30): about $52 bought 2 clips. Needs first: a video AI with credits, and #30 _[medium, needs you]_

## Done (shipped and checked)

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
