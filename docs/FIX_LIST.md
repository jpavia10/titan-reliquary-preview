<!-- doc-status: current; normative: no -->
# Titan Fix List (text copy)

Text copy of the owner's live checklist (claude.ai/artifact/Aogoa4MfwCVPpck9xKUV8M), rendered from docs/fixlist/items.json by tools/fixlist/render.py together with the artifact, so the two never differ. Item numbers never change. Copied 2026-10-20, build tr145.

## State of the union (2026-10-20, build tr145)

The one thing to be best in the world at: the most trustworthy record of a personal coin collection, researched by a team of AIs that check each other. Every fact shows where it came from, which AI or person said it, who checked it and how sure we are, and you confirm what only the coin can answer with one tap. Nobody does this for a private collection.

- **306** pieces in flips (300 coins, 6 tokens), 51 countries
- **$5,390** headline value at the latest metal prices (silver $60.59, gold $4,162)
- **227** pieces with a phone photo; 79 still need one, 14 have both sides
- **216 / 306** pieces through Phase 1 (70.6 %): 79 need a photo, 31 need a mint mark read
- **917 / 1775** album slots filled, all 33 albums read from your page photos
- **52.4 %** of the 3,402 facts on screen are cited or confirmed; 474 are Checked by two independent sources

### What is strong

- **A research system that runs itself.** Every gap in the data is homework: the loop hands each AI the jobs it is best at, never its own facts to check, files every disagreement instead of overwriting, and measures each AI by how often its facts turn out wrong. Since Oct 20 the never-checked ledger facts go first, read blind from the photos, and about 900 items are out to Grok, Muse and Gemini.
- **Trust machinery.** Every fact has a certainty label, a history and now a link to its exact source; “Checked” means two independent sources agree. The change history is sealed (a correction is a new line, never an edit), and every photo is fingerprinted against its original.
- **One pipeline, one master, tested on every update.** Any AI drops a change file; one script checks it, merges it and rebuilds the site. 51 pipeline tests, 18 research-loop tests, a 38-point phone + desktop smoke test and a GitHub integrity check run on every update; a monthly restore drill rebuilds the whole site from the backup.
- **Never silently broken.** Daily prices, live-site check, smoke and integrity checks and a daily backup zip run on GitHub; Health warns when any fails.
- **Exportable, printable, recoverable.** The whole collection opens as a spreadsheet (coins, album holes, lots, every source) and as one JSON file, a printable inventory exists, and a recovery card says how to rebuild everything from the daily backup.

### What is holding it back

- **A third of the facts are still the old ledger's word.** Of 3,402 facts on screen, 1,781 are cited or confirmed (52.4 %), 474 of them Checked by two sources; 1,106 still come from the original ledger unchecked and 371 are AI readings without an exact source. The ledger's year, mint and face value on photographed coins are now first in line (#125).
- **The loop needs me to turn it.** AIs drop files in Drive; nothing merges until a session opens. The autonomous intake (#92) that removes this is built and tested; it switches on with your one-time install (about 10 minutes).
- **The interface is behind the system, and you said so.** Judged blind on Oct 16, every badge and theme pair came back "both weak". Grok is upgrading the themes on main now; Titan v3 (#119-#121) waits until that pass is done, and is built for your own experience.
- **Photos are the bottleneck.** 80 pieces have no photo, most have only one side, none have pro photos. The Scan page makes each one a few taps; Phase 2 cannot start before them.
- **Gemini has gone quiet.** Nothing from Gemini since Oct 16; its 15 assignments include the 12 disagreements only a third reader can settle. Claude settles the clear ones meanwhile.

### The next three moves, in order

- **1. Let the AIs work.** Send Grok, Muse and Gemini to their WORK QUEUE docs (all updated today, with bigger batches). The one-time install for #92 still saves the most: their files then merge every hour without a chat.
- **2. Photograph the missing coins.** 79 pieces have no photo (C293 and C300 among them); Scan a coin names and sends each one. That and the 31 unread mint marks are all that stands between Phase 1 and 100 %.
- **3. Print the recovery card.** And decide #127 (Grok's direct pushes, the AIs' Drive reach) when you have a minute.

## What unlocks what (read right to left: do the last link first)

- **The loop running without a chat (#92)** needs your one-time install (one Apps Script project, two GitHub secrets; about 10 minutes) ← nothing else: the bridge, the loop, the gates and the tests are built
- **Phase 2 pro photos (#61)** needs serial numbers (#5) ← Phase 1 at 100 % (now 216 of 306: 79 photos and 31 mint marks missing) ← the ledger checked against the photos (#125) + the varieties checklist (#126)
- **Which AI reads Phase 2 (#19)** needs Muse's locked test (due on its page) and Gemini's when it is back ← Grok's is in: 76 % right, 3.0 % invented
- **Reading a coin inside the app (#65 next step)** needs the winner of #19 ← a key kept outside the public site (#92's machinery)
- **Disagreements settled without me (#101)** needs Gemini to answer its arbitration homework (12 open, on its page; nothing from Gemini since Oct 16) ← Claude settles the clear ones meanwhile (37 on Oct 20)
- **Real collector values for every coin (#62)** needs Grok's appraisal homework (running) + your free Numista API key (the weekly price job); album costs (#107) use the same prices
- **Motion and the gold dust in the app (#63)** needs design direction (#30) + app split (#32) + your phone speed number (#25) + your picks from the Motion Lab (#56)
- **Buttons that look tappable (#29)** needs design direction (#30)

## Waiting on you (not tickable: only you can do these)

- Switch on the autonomous intake + Drive backup (once, about 10 minutes): follow docs/INTAKE_BRIDGE.md (github.com/jpavia10/titan-reliquary-preview/blob/main/docs/INTAKE_BRIDGE.md): one Apps Script project and two GitHub secrets. Then the AIs' files merge by themselves every hour and Drive gets a daily backup (#92, #93, #103). Never paste the URL or the key in a chat; tell me “the bridge is installed” and I run the first check.
- Print the recovery card: Drive → Titan Reliquary → 'RECOVERY CARD (print this, keep it in the safe)'; write your GitHub and Google recovery codes on it by hand (#105).
- Two write paths to narrow, your call: Grok's direct pushes to main, and the AIs' reach into your whole Drive (#127).
- No rush on the coin questions: they can wait for the pro-photo session. When you do answer some, press Send to Claude on the Questions page; it then shows Received when they are in (#118).
- Photograph the missing coins with Scan a coin (Hall footer, or Lab → Shoot list → Scan with the camera): it checks each photo, names it and sends it to Drive STAGING. Unlocks Phase 1 at 100 %.
- Get a free Numista API key (numista.com → your account → API) and add it in GitHub: the repository → Settings → Secrets and variables → Actions → New secret, name NUMISTA_API_KEY. The weekly price job then fills in collector values (#62). Never paste the key in a chat.
- Measure your phone's speed: Health → Measure speed → Add this speed report to my answers file, then send the answers file (#25).
- Decide who gets which inventory copy: Health → Printable inventory (with values for the insurer, without for the family) (#64).
- Decide: does every coin need both sides photographed? Or can the common side of common coins be shared from one good photo? It sets the size of the “other side” batch (194 coins) and #61.
- Opening: every launch plays the Grok film, then the theme's motion, and picking a theme plays its motion too; 9 new Grok films joined the rotation on Oct 14. Change it in Scene Studio → Settings → Opening (#112).
- Re-upload 4 photos smaller than 7 MB: C105–C113, C114, C115/116, C117–C119.
- Judge the new designs blind: when Titan v3 step 1 or The Field v2 is ready I send you a blind-test link; pick A, B or both weak (#119, #122). The older prototypes are at jpavia10.github.io/titan-reliquary-preview/prototypes/v2/.
- Try the new theme effects on your phone: open a few themes (Scene Studio → Themes) and tell me which effects are too strong, too faint or stutter (#114).

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

## The other AIs (what each one is doing now (updated 2026-10-20))

The research loop hands out homework from the data after every update (docs/agents/RESEARCH_LOOP.md): each AI gets the kinds it is best at, never its own facts to check, and a different AI checks every fact. Their full pages: Drive “WORK QUEUE for …” docs, and docs/agents/ in the repo.


### Grok (active)

Strongest contributor, treated as a top model (owner, 2026-10-10: "Grok is basically opus if it needs to be so I think they get the hardest shit"): research questions, disagreements to settle, catalogue numbers and citations first, plus the code and security reviews.

- Now Varieties to look for at the pro-photo session (every US, UK and German coin in a flip) #61
- Now Mintages still blank on 24 coins #3
- Now Album prices: a second source for the 40 most expensive holes #62
- Homework Photo reader: 2 items, due 10-21 HW-grok-read-mint-20261014-1
- Homework Photo reader: 2 items, due 10-21 HW-grok-read-mint-20261014-2
- Homework Appraiser: 2 items, due 10-29 HW-grok-value-20261019-1
- Homework Arbiter: 2 items, due 10-27 HW-grok-arbitrate-20261020-1
- Homework Fact-checker: 3 items, due 10-27 HW-grok-story-check-20261020-1
- Homework Second reader: 21 items, due 10-27 HW-grok-verify-20261020-1
- Homework Second reader: 20 items, due 10-27 HW-grok-verify-20261020-2
- Homework Fact-checker: 45 items, due 10-27 HW-grok-story-check-20261020-2
- Homework Second reader: 80 items, due 10-27 HW-grok-verify-20261020-3
- Homework Second reader: 80 items, due 10-27 HW-grok-verify-20261020-4
- Then UI rethink, step 2: The Field's three filters, on the real data #116
- Then Splash film: Coinverse 16:9 again, plain coins (only when Joseph says the credits allow) #56
- Then Music: a recording for each of the 3 held pieces #83
- Always Read new coin photos (with Muse, blind)

Measured: 431 of its facts checked by another AI: 430 confirmed, 1 wrong. Gets work: Drive doc 'WORK QUEUE for Grok' in Titan Reliquary/ (the same page is docs/agents/QUEUE_grok.md on GitHub). Drops change files in Drive collection-incoming (AI change files).


### Muse (active)

Researcher and writer stepping up (owner, 2026-10-10: "I think muse wants to step up so maybe see what they got in them"): harder work first now (research questions, catalogue citations, collector values); every fact it writes is still checked while it is on probation.

- Now Cite your own era fields: 263 'period' facts on 138 types are still 'AI guess' #48
- Now Which side to shoot: the 31 coins whose mint mark is unread #57
- Now Second reader on Grok's Numista batches #72
- Now Theme pictures: the 22 wide heroes (priority 2) #113
- Homework Fact-checker: 2 items, due 10-27 HW-muse-story-check-20261020-1
- Homework Arbiter: 10 items, due 10-27 HW-muse-arbitrate-20261020-1
- Homework Second reader: 50 items, due 10-27 HW-muse-verify-20261020-1
- Homework Photo reader: 1 items, due 10-27 HW-muse-read-mint-20261020-1
- Homework Arbiter: 8 items, due 10-27 HW-muse-arbitrate-20261020-2
- Homework Second reader: 50 items, due 10-27 HW-muse-verify-20261020-2
- Homework Writer: 40 items, due 10-27 HW-muse-plain-story-20261020-1
- Homework Fact-checker: 41 items, due 10-27 HW-muse-story-check-20261020-2
- Homework Second reader: 80 items, due 10-27 HW-muse-verify-20261020-3
- Homework Second reader: 80 items, due 10-27 HW-muse-verify-20261020-4
- Always Read new coin photos (with Grok, blind)

Measured: 297 of its facts checked by another AI: 289 confirmed, 8 wrong. Gets work: Drive doc 'WORK QUEUE for Muse' in Titan Reliquary/ (docs/agents/QUEUE_muse.md). Drops change files in Drive collection-incoming (AI change files).


### Gemini (active)

Back on (owner, 2026-10-15: "Unpause gemini I pay for the shit so I expect it to function as we desire. Whether on gemini argon in chat or antigravity or gemini spark"). The third research AI (fix list #101): it settles Grok-vs-Muse disagreements first, then every other kind, in full batches. Expected to be a powerhouse (owner, 2026-10-10): vision, research, code (Antigravity) and Veo video. On probation: every fact it writes is checked by another AI until it has 3 good submissions in a row.

- Now Design text for the 26 types that have none or only a guess #72
- Now Third reader: settle the 12 open disagreements first #101
- Test Blind photo test, the locked pack (15 coins) #19
- Homework Photo reader: 4 items, due 10-21 HW-gemini-read-mint-20261014-1
- Homework Second reader: 50 items, due 10-21 HW-gemini-verify-20261014-1
- Homework Appraiser: 13 items, due 10-24 HW-gemini-value-20261014-1
- Homework Fact-checker: 17 items, due 10-21 HW-gemini-story-check-20261014-1
- Homework Second reader: 50 items, due 10-21 HW-gemini-verify-20261014-2
- Homework Fact fixer: 15 items, due 10-22 HW-gemini-contradiction-20261015-1
- Homework Appraiser: 9 items, due 10-25 HW-gemini-value-20261015-1
- Homework Fact-checker: 9 items, due 10-22 HW-gemini-story-check-20261015-1
- Homework Arbiter: 7 items, due 10-22 HW-gemini-arbitrate-20261015-1
- Homework Cataloguer: 2 items, due 10-22 HW-gemini-cite-20261015-1
- Homework Writer: 11 items, due 10-27 HW-gemini-plain-story-20261020-1
- Homework Arbiter: 5 items, due 10-27 HW-gemini-arbitrate-20261020-1
- Homework Photo reader: 2 items, due 10-27 HW-gemini-read-mint-20261020-1
- Homework Second reader: 80 items, due 10-27 HW-gemini-verify-20261020-1
- Homework Fact-checker: 7 items, due 10-27 HW-gemini-story-check-20261020-1
- Then Send the Titan v3 M1 build (your spec is accepted; only the .html is missing) #116, #117
- Then Second reader for all 33 albums, from the page photos (blind) #55
- Then Theme pictures: the heroes for Prism, Midnight Gallery, The Mint and Shipwreck #113
- Always Read new coin photos as the third blind reader

Measured: 96 of its facts checked by another AI: 96 confirmed, 0 wrong. Gets work: Drive doc 'WORK QUEUE for Gemini' in Titan Reliquary/ (docs/agents/QUEUE_gemini.md), from whichever Gemini Joseph opens: the Gemini app (Argon), Antigravity or Gemini Spark. Files go to Drive collection-incoming (AI change files) as changes_gemini_YYYYMMDD-HHMM.jsonl; a surface that cannot write to Drive replies with the file in one code block and Joseph pastes it to Claude.


### ChatGPT (parked)

Parked (owner, 2026-10-10: "Chatgpt is too manual so I dont expect stuff to come from there since it requires me"): no Drive access, so every task needs Joseph to paste it. Its projects moved to Grok (reviews) and Muse (Dad's guide). Nothing is expected from it.

- Test Blind photo test, the main pack (30 coins) #4

Measured: None of its facts checked by another AI yet. Gets work: Joseph pastes https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/agents/QUEUE_chatgpt.md into ChatGPT and says 'do the next task'; the answer is pasted back to Claude.


## Tier 0 · The research system that runs itself (the foundation for everything else: facts found, checked and measured as homework over time)


### Make it run without a chat

- [ ] **#92 The loop turns without a chat: autonomous intake**: Built and tested (tr107). Every hour a GitHub job asks a small Google Apps Script in your Drive for new change files, merges the outside AIs' files through every gate and test, publishes, turns the loop and rebuilds the site; the Drive side then trashes merged files, leaves REJECTED notes with a HOW TO FIX line and refreshes each AI's WORK QUEUE doc. Owner answers and anything that needs judgement wait for me in docs/agents/bridge/INBOX.md. No GitHub key anywhere: the job uses GitHub's own short-lived token. Needs first: you: the one-time install, about 10 minutes (docs/INTAKE_BRIDGE.md: one Apps Script project, two GitHub secrets) · Unlocks: #50, #93, daily progress with no session open _[partly done, large, needs you, new]_
- [ ] **#93 Each AI's page copied to its Drive doc automatically**: Built (tr116): the loop now writes each AI's compact Drive copy (docs/agents/drive/QUEUE_{ai}.txt: its NEW note, the live link, one line per assignment), and the Drive bridge copies that file into the AI's doc whenever it changes. Until the bridge is installed I paste the same file by hand. Needs first: #92 installed _[partly done, medium, new]_
- [ ] **#91 Scores drafted by the pipeline**: Each submission's score (right place, accepted as sent, accurate, complete, in its tier) drafted from the merge report and the cross-checks, so CONTRIBUTOR_SCORES and each AI's feedback stay current without my bookkeeping; I only adjust and add the praise. Unlocks: #92 running unattended _[medium, new]_
- [ ] **#50 Process your answers file automatically**: When you drop answers_owner_*.json in Drive, it becomes records without waiting for a chat. #92 lists it for me but does not merge it on its own: your answers become Verified facts, and any AI with access to the folder could write a file under that name. Two ways: Google Drive added to the daily routine, or an answers file the app signs so #92 can tell it is yours. Needs first: Drive in the routine (you), or a signed answers file (#92 installed first) _[medium]_
- [x] **#118 Answers you send get a receipt**: Done (tr116; you: "How do I know that you got those three answers?"). Questions has Send to Claude: it opens GitHub with your answers filled in, you press Submit, and a robot (owner-answers.yml, only for your own issues) merges them, publishes and replies on the issue. The phone shows each batch as Not sent, Sent (waiting) or Received with the counts, whichever way you sent it (GitHub, a chat copy or a Drive file). Offline it says so and keeps them. _[done]_

### Make it trustworthy at scale

- [x] **#99 Canary checks for the checkers**: Oct 15 (tr116): about 6 % of the values a check list shows are planted wrong on purpose (a real value of the same field from another coin type; the record stays right). An AI that sends one back unchanged was rubber-stamping; one that sends the true value caught it. Never filed as a disagreement; counted on the AI's page and in metrics (tools/pipeline/canary.py). _[done]_
- [x] **#102 Every contradiction becomes homework**: Oct 15 (tr116): a new homework kind, contradictions: every truth-check finding that needs research (30 today: German and US coins with a mintage but no mint mark read) goes to an AI as a job with an exact ask; the mechanical ones are still fixed by the script. Grok and Gemini have the first batches. _[done]_
- [x] **#94 Old sources re-checked on a cadence**: Oct 15 (tr116): each month a sample of 12 Checked facts cited more than a year ago goes back to a second reader (never to either of the two who checked it); a changed entry becomes a disagreement. Nothing is that old yet, so the first ones come in October 2027. _[done]_
- [x] **#95 My own spot checks counted**: Oct 15 (tr116): my own spot checks at an intake go through the same gate as an AI's check (workflow spot-check): the same value with my source = Checked and counted as a check I did; a different value = a disagreement for a third reader, never an overwrite. _[done]_
- [ ] **#98 Targets and progress per kind of fact**: Goals like every catalogue number Checked by January, every mint mark read by Phase 2, every story checked by someone other than its author, with a progress line for each in Health. _[medium, new]_

### Grow the team

- [x] **#97 One onboarding path for any new AI**: Oct 15 (tr116): one path, written down (RESEARCH_LOOP.md section 9) and one command (tools/agents/new_agent.py): proof of access, the main photo test, half batches with every fact checked, full batches after the first good submission, off probation after 3 in a row that score 8+. _[done]_
- [x] **#101 A third research AI, so disagreements never wait on me**: Oct 15 (tr116): Gemini is back on every surface (Argon chat, Antigravity, Spark; owner: "I pay for the shit so I expect it to function as we desire"), with arbitration first on its list, so Grok-vs-Muse disagreements no longer wait for me. _[done]_
- [x] **#100 Re-test an AI when its model changes**: Oct 15 (tr116): a model name never seen before for an AI (provenance.model in its files) makes it new again: for 30 days its facts are checked first, and both photo tests come back on its page. Gemini coming back on Argon is the first case. _[done]_
- [x] **#96 Cost per checked fact**: Oct 15 (tr116): collaborators/AI_RUNS.md now shows, per AI, how many of its facts another contributor checked, how many held up, how many were wrong, and the cost per fact that held up (when the AI reports its cost). _[done]_

## Tier 1 · Truth and measurement (turn guesses into facts and measure who is right)


### Truth

- [ ] **#125 Check the ledger's facts against the photos**: Oct 20: 1,106 facts on screen still come straight from Grok's original ledger, never checked, and the first 3 ever checked were all wrong. The year, mint and face value of every coin with a photo (441 facts) now go to the AIs first as blind photo reads; a second agreeing read makes a fact Checked. Batches are bigger too (Grok 24 assignments, Muse 20, Gemini 16; about 900 items out today). Unlocks: #57 (Phase 1 at 100 %), #61 _[partly done, medium, new]_
- [ ] **#3 Settle the open curation questions**: 14 questions wait in the app (Hall footer → Questions), plus the “Where did they come from?” section (#77). With the coin in hand each takes seconds. Oct 15: the three about Muse's coins are settled on Muse's readings, as you asked (C302 UK 1922 penny, C303 a second Australia 1983 one cent, C304 Mexico 1981 20 pesos). Needs first: you, with the coins · Unlocks: Phase 1 at 100 %, #5 _[partly done, medium, needs you]_
- [ ] **#73 Fact-check the stories**: Part of the research loop: every story nobody but its author has checked is a job. Grok's checks so far all held up; it has C151-C283 plus 33 more stories as homework. A checked story is re-sent with the exact entry it was checked against; a wrong sentence is corrected with its source. Needs first: nothing: running _[partly done, medium, new]_
- [ ] **#48 Re-cite Muse's 26 vague sources**: Muse has the list (its REJECTED note and queue): each one moves from “AI guess” to “Reference” when Muse resends it with the exact entry. Still pending. Needs first: Muse's next file _[small]_
- [ ] **#62 Real collector values**: Two paths, both built: Grok has appraiser homework (each value citing the exact price page and the grade assumed; a cited value is re-appraised after a year), and a weekly GitHub job fetches Numista's price estimates per grade once you add a free Numista API key. Oct 14: Grok and Gemini priced 63 of the same coins independently and agreed on 62. Values still change only through a cited file. Needs first: your free Numista API key (Waiting on you) · Unlocks: a firmer headline, #107 _[partly done, large, new]_
- [ ] **#126 A varieties checklist for the pro-photo session**: Grok's new homework: for every US, UK and German coin in a flip, the known varieties and errors of that exact year and mint (small/large date, doubled dies, wide/close AM...), what to look for under the loupe, on which side, and what it is worth if found. Becomes the Phase 2 shoot checklist, so no variety is missed while the coin is out of its flip. Needs first: Grok's file · Unlocks: #61 _[small, new]_

### Measure the AIs

- [ ] **#4 Photo-model bake-off**: Main 30-coin test: Grok 78 % right, 3.8 % invented (Oct 8); Muse 71 %, 5.3 %, 17 % false confidence; Gemini 85 %, 3.0 % (Oct 12, but it worked from a copy of the repository in Drive, so its catalogue numbers may come from our own records: a weak measure). The test recurs by itself every 6 months. Needs first: Gemini's locked test when it is back (paused: the Argon release broke its app) · Unlocks: #19, which AI does Phase 2 research _[partly done, medium, needs you]_
- [ ] **#19 Locked coin test for scoring AIs over time**: Grok took the 15-coin locked test (Oct 10): 76 % of the core fields right, 47 % of catalogue numbers, 3.0 % invented (2 of 66 values), never wrong when sure; it left 17 of 60 core fields blank rather than guess. This is the reference number for who reads the Phase 2 pro photos. Muse's and Gemini's locked tests are still due. Needs first: Muse's locked test; Gemini's when it is back · Unlocks: #65, fair scores over time _[partly done, large]_

## Tier 1 · Safety net (nothing is lost, nothing is quietly changed)

- [ ] **#105 A recovery card**: Oct 20: written. Repo copy docs/RECOVERY_CARD.md; Drive doc 'RECOVERY CARD (print this, keep it in the safe)' in Titan Reliquary/: where everything lives, which accounts own it, what to do if the site stops loading or GitHub is gone (rebuild from the backup zip in plain steps), and where the spreadsheet export is. Your part: print it, write the GitHub and Google recovery codes on it by hand, put it in the safe. _[partly done, small, needs you]_
- [ ] **#127 Narrow two write paths (your call)**: From the #106 review. (1) Since Oct 19 grok-bot pushes code straight to main; the checks run after, but nothing stops a bad push. Safer: Grok pushes to grok/* branches and I merge as soon as integrity and smoke are green. (2) Grok, Muse and Gemini reach your whole Google Drive through their connections. Narrower: a separate Google account that only holds the shared Titan Reliquary folder. Say yes to either and I write Grok's new instructions or the share steps. _[small, needs you, new]_
- [ ] **#103 Warn when the Drive backup is stale**: Health shows the age of the newest Drive backup and warns past 7 days. Today the only Drive copy is from Sept 28. Needs first: the Drive backup installed (it comes with the #92 install) _[small, needs you, new]_

## Tier 1 · Gates for design and motion (needed before any visual work)

- [ ] **#32 Split app.js into modules**: Steps 1–5 done (tr96–tr105; step 5 = the data layer, js/app-data.js). Next: the theme system and its effects (it shares a global name with the GPU effects, so it moves with a check), then the big wings one at a time, each smoke-tested. Needs first: nothing · Unlocks: #63, the redesign after #30 _[partly done, large]_
- [ ] **#25 Speed budget and phone check**: Fixed limits are checked on every deploy (first load, page size, time to a real value, longest freeze). Now one tap brings your phone's real numbers: Health → Measure speed → Add this speed report to my answers file. Needs first: your phone report · Unlocks: #63, effects tuning _[partly done, medium]_

## On hold · Titan v3, the app worth showing off (you, Oct 20: wait while Grok upgrades the themes; built for your own experience, judged blind against today's app)


### Build

- [ ] **#119 Titan v3, step 1: the whole collection as one 3D space, and one coin**: All 306 pieces as real 3D coins with their phone photos; filters and sorts move the coins instead of redrawing a list; tap a coin and it flies forward into its own view (flip, a raking light you drag, a loupe, every fact with its certainty label), back flies it home; search moves the camera. Gemini's plan for it is accepted as the spec (docs/design/v3/M1_SPEC.md, Oct 16); the build itself has not arrived yet. I check Drive for it on Oct 17 (16:30 UTC); if it is still missing I ask you whether I should build it from the spec. On hold (you, Oct 20): wait while Grok upgrades the themes on main. Needs first: Gemini's build (its first task) · Unlocks: #120, #121, the blind test against today's app (#122) _[partly done, large, new]_
- [ ] **#120 Titan v3, step 2: albums as real pages**: Each album as a physical page with real holes: filled holes hold the coin, missing ones are empty and lit, printed circles look different, pages turn. "Which Silver Eagle year am I missing?" answered in a couple of taps from opening, in the main app. Cost to complete and the want list from data/wants.json. Needs first: #119 _[large, new]_
- [ ] **#121 Titan v3, step 3: live value and three showpiece worlds**: The headline value moves with the metal prices; one world switch changes look, light, effect and sound together as a transition instead of a settings panel (this replaces #117). Three worlds made at showpiece quality instead of 26, each with its own badge drawn from scratch: on Oct 16 you judged all 23 badge pairs and 5 theme pairs "both weak", ours as well as Gemini's. Needs first: #120 · Unlocks: #30 (the final look) _[large, new]_

### Judge and pick

- [ ] **#122 Judge every design blind before it ships**: Started Oct 16: the blind review page showed each badge and theme as A and B in random order and saved your picks (claude.ai/artifact/5bc8r7rf9Urx4QEdr8at1K). It found that Gemini's 24 theme files were our files with 187 lines changed (19 look identical on screen) and that all 28 pairs were "both weak". Every Titan v3 step, Grok's The Field and any new theme goes through the same test against today's app before anything changes in the app. Unlocks: #30 _[partly done, small, new]_
- [ ] **#116 Rethink the interface beyond the wings (AI homework)**: Oct 15: your call ("the framework is good but the UI still sucks... too fixed into the wings... more novel ways of presenting data"). A design brief (docs/design/REDESIGN_BRIEF.md, also in Drive 'design-incoming (AI UI proposals)') lists every function to keep, what is wrong today, the bar and the hard rules. Grok proposes a structure beyond the five wings with a working prototype, Gemini builds two prototypes (a novel data view and the atmosphere control), Muse walks the app on a phone and ranks what is clunky with ten references. I host the good prototypes side by side at /prototypes/v2/ for you to try; only what you pick goes into the app, in small steps. Oct 16: Grok's The Field is hosted at /prototypes/v2/grok/ (v2 sent, see #123); Gemini's Continuum v2 scored 3/10 blind, every one of its 12 ideas kept, and became Titan v3 (#119-#121). Needs first: the three AIs' deliverables · Unlocks: #30, #63, #29 _[partly done, large, new]_
- [ ] **#117 A better atmosphere control (replaces the Scene Studio panel)**: You called it clunky: themes, sound, effects and settings are one long panel. Gemini prototypes one smooth control with a live preview (part of #116); the winner replaces the panel, keeping every setting. Oct 16: now part of Titan v3 step 3 (#121). Needs first: #116 (Gemini's prototype) _[medium, new]_
- [ ] **#30 Pick the final design direction**: Combine the three prototypes or ask for new options. This ends the design pause; every visual change waits on it. Needs first: #60 (recommended) · Unlocks: #29, #63, splash and icon _[large, needs you]_

## Parallel track · Motion (the owner's videos of 2026-10-10: the 20 styles, six new themes, motion splashes and the Motion Lab)

- [x] **#56 Motion Lab test page**: Done (tr110): six studies at /motion-lab/: gold dust (Grok), Morph (your second video, rebuilt with your coins: dust sheet, a coin formed from its photo, the burst, light ribbons, blue beams), coin flip with a rim light, a tile growing into the coin view, the Confirm seal (AI guess → Owner verified) and a coin settling into album A026. Still / Calm / Full on each. Oct 14: two more coin-flip studies, 3B by Grok and 3C by Gemini (its coin notes are marked unchecked). Tell me which ones you want in the app (#63). _[done]_
- [ ] **#63 Motion into the app**: Started (tr108-tr110): the 20 animation styles now run inside the themes and every theme opens with its own motion splash (#110, #112). Still to come: only the Motion Lab studies you pick from #56 (coin flip, tile to coin view, Confirm seal, album settle), calm by default and off when the phone asks for less motion. Needs first: your picks from #56 (the motion setting #59 is done) _[partly done, large, new]_
- [x] **#110 The 20 animation styles, inside the themes**: Done (tr108-tr110), from your first video: every one of the 20 styles is a live GPU effect in the theme it suits: Particles in Midnight Gallery, Liquid morph in The Mint, Holographic in Prism, Neon glow + Retro VHS in Neon Vault, Wireframe 3D in Solar Observatory, Glassmorphism in Hyperborean Vault, ASCII art in The Construct, Gradient mesh in Samadhi, Art deco in Nocturne, Halftone in Conservator, Neo-brutalism in Plaintext; the other nine got new themes (#111). Each theme's old signature effect stays underneath, softer, and each has a rare “moment” with a sound (#21). Every theme passes the contrast check. _[done]_
- [x] **#111 Six new themes for the styles that had no home**: Done (tr108): Arcade (pixel art), Pulp Adventure (comic book), Drafting Room (blueprint), Clay Diorama (clay 3D + isometric), Bauhaus (Bauhaus + kinetic type) and Grand Terminal (split-flap departures board with your 50 countries). 26 themes now, in a new “Studio” group; each has its own colours, crest, sound scene and interface touches (ink outlines, pixel corners, blueprint lines...). The Themes picker now shows every theme with a small live preview. _[done]_
- [x] **#112 A motion splash for every theme**: Done (tr110-tr113): each of the 26 themes has its own 3-second motion in its style (dust forming the title, molten letters, a KAPOW, a split-flap board, a coin drawn as a blueprint...). Since tr112 every launch plays the Grok film, then the theme's motion, then the app (a tap skips to the app); since tr113 picking a theme plays its motion too. Scene Studio > Settings > Opening changes it; Calm shows one still frame; Off skips it. _[done]_
- [ ] **#113 Pictures for every theme card**: Mostly done (tr114): Grok made picker cards for all 26 themes; 25 are live (Midnight Gallery keeps its own), and themes without a wide picture use the card. Still open: the 22 wide heroes (Muse) and refreshed heroes for Prism, Midnight Gallery, The Mint and Shipwreck (Gemini, when it is back). Needs first: Muse's heroes; Gemini's 4 when it is back _[partly done, medium, new]_
- [ ] **#114 Try the new effects on your phone**: Every effect and splash was tuned on a software graphics chip in my container, never on a real phone. Open a few themes on yours and tell me which effects are too strong, too faint or stutter; I tune them in one pass. Needs first: your phone, 10 minutes _[small, needs you, new]_
- [x] **#115 Effects keep moving while you scroll**: Done (tr111): since tr82 the effects froze while a page scrolled (to keep scrolling smooth on phones). Now they keep moving at a scroll frame rate that steps down from 30 to 20 to 12 frames a second if the phone struggles, never to zero, and the text protection follows the page as it moves. _[done]_

## Tier 2 · Capabilities on the foundation (each one names what it waits on)


### Phase 2 and photos

- [ ] **#61 Phase 2 photo standard and a 5-coin test shoot**: Light, background, scale and file names for the pro photos, tested on 5 coins end to end before the real run (pairing, 2×2 and circle crops, registering, the quality check), so 290 coins are shot once. The scan page's photo checks (#65) are the start of the quality gate. Needs first: nothing for the test; the full shoot needs #5 · Unlocks: Phase 2, #64, #79 _[medium, needs you, new]_
- [ ] **#5 Plan the serial reassignment**: New display serials with no scan-order bias, done once. Decide first: should the numbers mean something (grouped by country) or carry no pattern? Needs first: #57 at 100 % and your East Caribbean code answer (#3) · Unlocks: #61 (you write the new id on each coin’s back) _[large, needs you]_
- [ ] **#65 Scan a coin in the app**: Version 1 is live: Hall footer → Scan a coin (or Lab → Shoot list → Scan with the camera). Pick the coin (your shoot list first), take the photo, see whether it is sharp, big enough and free of glare, and send it to Drive STAGING or to an AI app with the reading prompt, already named the way the pipeline expects. Next: the AI that wins the locked test (#19) reads it without leaving the app (needs a key that never sits in the public site). Needs first: #19 for the in-app reading _[partly done, large, new]_

### Value and family

- [ ] **#77 Where each coin came from**: Ready: Questions → “Where did they come from?”: pick how (bought, inherited, a gift, found, a trip), from whom and when, tick the coins by country, send. They become your own records and show in each coin's view and the printable inventory. Needs first: you _[partly done, medium, needs you, new]_
- [ ] **#107 What completing each album would cost**: Started (tr114): What's missing and the Simple view now show a price on every missing hole of albums A001-A016 and a cost to complete per album (Grok's list from price guides: 289 holes, about $2,731 in all). It is a floor: key dates look low against dealer guides, so Grok is getting a second source for the 10 most expensive holes. Muse has A017-A033. HOLD stays the policy; this is for planning and wish lists. Needs first: Muse's prices for A017-A033; Grok's second source _[partly done, medium, new]_
- [ ] **#108 Family stories for each coin**: Your words (or your dad's) about a coin: who had it, where it was found. Typed or a voice note turned into text, kept as the owner's own story, which always wins over an AI's. _[medium, needs you, new]_

### Music

- [ ] **#83 Real classical recordings**: 23 recordings play now, in the scenes and on the radio's Classical station. Oct 9: Handel's Largo (Ombra mai fu) is live, sung by Lea Desandre with Les Arts Florissants (CC BY 3.0), so the 1920 Caruso question is gone; every file was re-made at the intended 96 kb/s, so most got smaller. Still nothing qualifying for Nimrod, Rêverie or a piano Gymnopédie No. 3: they are re-searched on every music run, and Grok has them as a project. Needs first: nothing: re-searched on every run · Unlocks: more rooms with real music _[partly done, small, new]_

## Always on (routine collection work, done as drops arrive)

- [ ] **#2 Fix album A006 hole count (80 → 77)**: Mercury dime album: the 80 was an estimate; your page photos show 77 holes. It is a question in the app, because only you can lower a count. Needs first: your answer in Questions _[small, needs you]_

## Tier 3 · Polish (never ahead of Tiers 0 to 2. No new themes.)

- [ ] **#29 Make buttons look tappable**: Some controls do not look clickable. Needs first: #30 and #60 _[medium]_
- [x] **#23 Black Site terminal readability**: Done (tr109): the Construct's terminal is hidden on narrow screens and drawn at 14 px without glow; its falling code gave way to the new ASCII-art effect, which keeps clear of text. _[done]_
- [ ] **#22 Tune sound and music from your listening**: Levels, rain, 3D placement, choir, drums: fix what you report. Needs first: your listening notes _[small, needs you]_
- [x] **#21 Sounds for the effect moments**: Done (tr110): every effect moment has its own short sound (the whale, the press strike, the shooting star, POW, the clay drop, the foil sweep...), at most one every 12 seconds and only while the app is on screen; Scene Studio > Settings has an “Effect moment sounds” switch. _[done]_
- [ ] **#28 Vault narration voice**: Review the spoken voice in the Vault wing. Grok suggests parking it. Needs first: your ears _[small, needs you]_
- [ ] **#35 Finish the 12 missing splash films**: Any video AI, max 4 clips per run. Grok and Muse both suggest cutting this until the design is chosen (#30): about $52 bought 2 clips. Needs first: a video AI with credits, and #30 _[medium, needs you]_

## Done (shipped and checked)

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
