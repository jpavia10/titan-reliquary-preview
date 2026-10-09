<!-- doc-status: current; normative: yes (for Grok) -->
# WORK QUEUE for Grok (updated 2026-10-09)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom. When a task is done, mark it DONE with the date (in your Drive queue doc, or say so in chat) and start the next one straight away; do not wait to be asked.

**Status:** active. Strongest outside contributor (Numista sweep 9/10, story fixes 10/10; best blind photo test so far): web + Drive access, opens Numista, careful sources.
**How you get this:** Drive doc 'WORK QUEUE for Grok' in Titan Reliquary/ + this repo (raw GitHub URLs)

Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

## 1. Fact-check the coin stories, C151 to C283  [NOW]  (fix list #73)

Your first 18 fixes (C161 to C262, changes_grok-bot_20261008-1101/1102/1103) are merged: every one checked out. Carry on through C283 the same way: check each story against its own record and the cited Numista entry; where a claim is wrong, send a corrected story (source = the exact entry; say what was wrong; change only the wrong sentence).

**Done when:** Every story from C151 to C283 checked; a list of the ones you changed and why (in your FEEDBACK doc note).

## 2. Numista sweep, round 2 (3 batches + catalogue numbers)  [NEXT]  (fix list #72)

Round 1 is merged (152 of 162 types, 484 facts; the trust meter went from 5.7 % to 18.1 %). docs/requests/numista_sweep_worklist.json is regenerated: 47 types, 93 facts, 3 batches (the 5 new coins C284 to C288, the 10 types round 1 left out, and facts Numista did not give last time; for a token or prop with no Numista entry, say so once in your note and skip it). Also docs/requests/catalog_disagreements_20261008.json: the 31 Schön / J numbers you flagged as DISAGREEMENT; send Numista's number for each (the record numbers came from the old ledger: several are copies of the KM number and the German J numbers are off by one).

**Done when:** 3 batch files and 1 catalogue-number file dropped.

## 3. Collector values for the 25 most valuable coins  [LATER]  (fix list #62)

data/index.json lists every coin with its current value (est). Take the 25 coins with the highest value. For each, find the retail value for its type, date and mint in the grade its phone photo suggests (say the grade you assumed and why, e.g. 'VF: rim wear, hair detail flat'), from a named price page: NGC World Price Guide or PCGS CoinFacts URL, or Numista's value table for that row. One change file: field value.est_usd (and value.confidence: med when the page gives the grade, low when you had to guess the grade); source = the exact page and the grade assumed. Silver coins: never below melt (data/prices.json has the spot). Leave a coin out when no page covers it.

**Done when:** One change file covering the 25 coins (or a note for each one left out).

## 4. Motion Lab study 2: the coin flip  [LATER]  (fix list #56)

Like your gold-dust study: one self-contained HTML file using ../js/three.min.js and a real coin's two photos (photos/p1/ coins with both sides), the coin flips with a moving rim light; Still / Calm / Full; must follow the app's Motion setting (localStorage titan.motion). Put it in Drive 'motion-lab-incoming'.

**Done when:** One HTML file Claude can drop into /motion-lab/.

## 5. Read new coin photos (with Muse, blind)  [ALWAYS]  (fix list #55)

Whenever NOID photos appear in STAGING: Phase 1 change file per AI_START_HERE, without looking at Muse's read first (AI_START_HERE 2b).

**Done when:** Ongoing.
