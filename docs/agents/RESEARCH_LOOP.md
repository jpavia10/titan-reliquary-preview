<!-- doc-status: current; normative: yes -->
# The research loop: how the collection gets researched by itself

**Goal (owner, 2026-10-09):** "I care less about filling categories and finding all facts than about setting up the framework for it to just be
done as agent homework over time." The loop turns every gap in the data into homework, hands it to the AI best suited to it, has a different
AI check the result, keeps every disagreement, measures each AI by how often it turns out to be wrong, and routes the next homework by those
numbers. Claude integrates; nobody types a task list by hand.

```
   collection/ (the master)
        │  publish.py: merge change files -> validate -> rebuild data/ -> homework.py
        ▼
   POOLS: a job for every gap ──► ISSUE: to the best-suited AI that did not write the fact ──► the AI answers its sheet
        ▲                                                                                        │
        │                                                                                        ▼
   MEASURE: confirmed / wrong per AI ◄── SETTLE: a third reader or Joseph ◄── GATE: apply_changes.py
                                                                               (agree = re-cited, "Checked";
                                                                                disagree = filed, never applied)
```

## 1. The trust ladder (what the app's labels mean)

| label | meaning |
|---|---|
| ✓ Verified | Joseph checked the coin in hand and confirmed it |
| Owner | Joseph said so, not re-checked |
| ✓ Checked | two different contributors (two AIs, or an AI and Claude) each stated the current value with their own exact source or photo |
| Reference | one contributor, with an exact source (catalogue entry, URL, book + page) |
| Photo | read from a photo by one reader (never for a mintage or a catalogue number: nobody can read those off a coin) |
| AI guess | an AI said it without an exact source |
| From ledger | carried over from Grok's original ledger, never checked |
| ⚠ Needs review | an open question or disagreement is about it |

Every event that states the CURRENT value supports it; the strongest supporter decides the label (tools/pipeline/provenance.py). The trust
meter's "cited or confirmed" = Verified + Owner + Checked + Reference. A mintage is decided only by events about the coin's own year and mint.

## 2. Job kinds (docs/agents/roles.json) and where each comes from

| kind | role | made from | closes when |
|---|---|---|---|
| cite | Cataloguer | a coin type with catalogue facts below Reference (tools/pipeline/numista_sweep.py rows; tokens and props excluded) | the type has nothing left to ask |
| catno | Cataloguer | a Schön / Jaeger number that disagrees with Numista (docs/requests/catalog_disagreements_*.json) | the record carries Numista's number, or the entry was re-read |
| verify | Second reader | a fact only ONE contributor stands behind (Reference or Photo); blind for photo readings | it is Checked, or a disagreement is filed |
| read-mint | Photo reader | a coin whose mint mark nobody read but which has a photo | the mint mark is read |
| story-check | Fact-checker | a story nobody but its author has checked | someone else re-cites it (unchanged, with an exact source) or corrects it |
| plain-story | Writer | a story still in shorthand (·, +, &, slashes, CuNi, bare lists) | the plain-English check passes |
| research | Researcher | an open research question (not one only the coin in hand can answer, not one already asked of Joseph) | the question is removed with an exact source |
| value | Appraiser | a value without a cited price page | the value cites one |
| arbitrate | Arbiter | an open disagreement | a third contributor (or Joseph) settles it |

Hand-written work that cannot be computed (work in progress, code reviews, guides, music, motion, onboarding) stays in
`docs/agents/queues.json` as projects. A project with `reserves` holds those coins of those kinds for its AI while it is open.

## 3. The rules of assignment (tools/agents/homework.py)

1. Each active AI holds at most `capacity` open assignments, taken in the order of its `kinds` list: first one batch of each kind for every AI, then (`per_kind` 2) a second batch of a kind whose pool is still deep. Batches are halved while an AI is onboarding unless roles.json says `full_batches`. Since 2026-10-10 (owner: "Dont throttle it") the capacities and batches are large: Grok 14, Muse 12, Gemini 6.
2. **Nobody checks their own work**, Claude included: an AI is never given a fact it wrote to verify, a story it wrote to check, or a disagreement it is part of. Two ids of one AI (Grok's chat and its bot) are one contributor.
3. A job is in at most one open assignment. An assignment holds its items for its lease (7 to 10 days); past it, the items go back to the pool.
4. An assignment is answered when a merged line names it (`provenance.assignment`). Items it left out go back to the pool, marked as tried by that AI; when two different AIs could not do an item it is parked (listed in QUEUES.md for Claude or Joseph).
5. **Checks first where they matter most:** the verify pool is ordered by an audit sample (every fact of an AI on probation; half of a new AI's; then twice its measured error rate plus 10 %), then by the coin's value.
6. **Demotion:** an AI stops getting fact-writing kinds when, after 10 checks, even the low end of the 95 % range of its error rate is above 15 % (we are sure it is often wrong, not unlucky); it can still check others and reword stories.
7. A fact another job is about to change is not handed out for checking at the same time, and **no two open assignments write the same
   field** (or a parent or child of it): a story out for a fact-check is not also out for a plain-English rewrite (`_clashes`, test 1b).
8. **Withdrawing:** `python3 tools/agents/homework.py --withdraw HW-... "why"` takes back an open assignment nobody has started (status
   `withdrawn`, not counted as answered or expired for the AI) and issues its replacement in the same run; its sheet is removed. Say so in
   the AI's WORK QUEUE doc. First used 2026-10-09: HW-muse-plain-story-20261009-1 shared 9 stories with Grok's story check.
9. **Calibration** (`roles.json` `calibration`): each AI takes the main blind photo pack every 180 days and the locked pack every 90 days,
   the locked one only after the main one; due tests head its page. `tools/bakeoff/score.py --agent` logs each scored test in
   `docs/agents/homework/calibration.jsonl` and MODEL_ACCURACY.md.

## 4. The answer sheet and the gate (tools/pipeline/apply_changes.py)

Every assignment comes with a pre-filled sheet (`docs/agents/homework/sheets/{id}.jsonl`, also in the AI's page): one ordinary ChangeEvent
line per field, `old` = the record now, `provenance.assignment` = the id, `source` = `FILL: ...`.
- The AI changes only `new` (when the record is wrong), `source` (its exact source) and `ts`, and saves the file as
  `changes_{ai}_{YYYYMMDD-HHMM}.jsonl` in Drive `collection-incoming (AI change files)`.
- A line whose source still starts with `FILL` is **left out**: no error, the item goes back to the pool.
- A homework line whose `old` no longer matches the record is **stale**: skipped and reported, never a rejection.
- In a **verify** assignment nothing is ever overwritten: the same value with an exact source or photo = a logged re-citation
  (the fact becomes Checked); a different value = a record in `collection/disagreements.jsonl` (fix list #18), not applied.
- Blind verify lines have no `old` and `new: null`: the reader fills in what it sees; null = left out.
- Everything else (exact-source rule, junk sources, phase tiers, provenance) applies as for any change file. A mintage or catalogue
  number is never accepted on a photo alone.

## 5. Disagreements (collection/disagreements.jsonl)

One record per disagreement: both values, who said each, their sources, how it came up (verify, double-read, intake, review), and once
settled: who settled it, the value, the winner and who is counted wrong (`error_by`; null when the sources themselves disagree).
homework.py settles a disagreement by itself when a later event sets or re-states the field by Joseph or by a contributor who is
neither party, with an exact source. Claude is the default third reader while only two AIs research. Open disagreements put the fact
under review and become `arbitrate` jobs.

## 6. Measuring (docs/agents/homework/metrics.json, QUEUES.md, each AI's page, Health in the app)

- **confirmed**: facts of this AI that another contributor re-stated with its own source; **wrong**: disagreements settled against it.
- error rate = wrong / (confirmed + wrong), with a 95 % Wilson range (few checks = a wide range; the numbers do not pretend).
- This is accuracy on real work. `collaborators/MODEL_ACCURACY.md` (the blind photo tests, fix list #4 / #19) measures reading from photos on
  a fixed set; `collaborators/CONTRIBUTOR_SCORES.md` scores rule-following per submission (rule 2). All three feed roles.json.

## 7. Claude's part at every intake

Once the intake bridge is installed (`docs/INTAKE_BRIDGE.md`, fix list #92), steps 1 and 2 run by themselves every hour: the GitHub job
`intake.yml` merges the outside AIs' files, the loop turns, and the Drive side copies the changed pages into the WORK QUEUE docs. Until
then (no `DRIVE_BRIDGE_URL` + `DRIVE_BRIDGE_KEY` secrets, or `INBOX.md` says the bridge has not answered), Claude does 1 and 2 by hand.

1. Merge the drops (`publish.py`): the loop turns by itself at the end and rewrites every AI's page. With the bridge: read
   `docs/agents/bridge/INBOX.md` first. It lists what was merged and rejected (to score), what was held for Claude, other files, and
   STAGING. Handle each held file, then `python3 tools/bridge/intake.py resolve NAME --merged | --rejected "why" | --retry`.
2. Copy each changed page into its Drive doc `WORK QUEUE for {AI}` (ChatGPT reads its page on GitHub). With the bridge: automatic.
3. Score each submission (rule 2), then `python3 tools/bridge/intake.py reviewed NAME...`. Read the parked items and open
   disagreements in `docs/agents/QUEUES.md`: settle what a third source settles; turn what only the coin can answer into owner
   questions.
4. When the numbers say so, edit roles.json (capacity, kinds, probation) and say why in SHARED_LOG.

## 8. The safety net under it

- **The change log can never be quietly rewritten** (fix list #76): `collection/changes.chain` chains every line of changes.jsonl to the one
  before; the writer refuses to change an existing line; CI (`.github/workflows/integrity.yml`) checks the chain only ever grew since the
  previous main, the master validates, and the pipeline and loop tests pass. The tip is published in data/status.json (`chain`).
- **Issues are append-only**: `issues.N` always names the same year and mint, so a line written against the sheet can never land on another year.
- Every original photo is fingerprinted (`crop.source_sha256`, fix list #79), so a swapped photo shows.
