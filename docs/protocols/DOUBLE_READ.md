<!-- doc-status: current; normative: yes; the blind two-AI reading of new coins (fix list #55) -->
# Two AIs read each new coin (blind)

**Why:** one AI's reading of a photo is one opinion. Two independent readings that agree are much stronger evidence; where they disagree,
we know exactly what to ask Joseph. It also measures each AI on real new coins, not only on test packs (feeds fix list #18).

**Who and when:** Muse and Grok, for the next 10 new coins (the NOID photos that arrive in Drive STAGING after 2026-10-08). Then Joseph
decides whether to keep it for every new coin.

## The rules for the two readers
1. Read the NOID photo and write your Phase 1 change file exactly as `AI_START_HERE` says (one file per photo batch, NEW-1, NEW-2 ...).
2. **Blind:** do not open the other AI's change file, its photo summary, its FEEDBACK doc or the chat where it answered, for these coins,
   until your own file is in `collection-incoming (AI change files)`. If you saw it by accident, say so in your file's `notes`; your read
   then counts as not blind.
3. Put the photo file name in `provenance.inputs` (`{"file": "NOID_..."}`) on every line. That is how the two reads are paired.
4. Say "unsure" (null) instead of guessing. A disagreement on a guess costs Joseph a question; an honest null costs nothing.

## What Claude does
1. Waits until both files for the same photos are in (or 48 hours, then merges the one that came).
2. Runs `python3 tools/pipeline/double_read.py FILE_A FILE_B --log` before merging either. It pairs the coins by photo and compares
   country, year, denomination, mint mark and default value (estimates within 50 % count as the same).
3. **All agree:** merge one file; the facts carry two independent reads (both noted in the history).
   **A field disagrees:** merge the agreed facts; add an owner question for each disagreement (`collection/owner_questions.json`,
   it shows up in the app's Questions page and the shoot list). The photo or Joseph decides; nobody's reading is taken on trust.
4. Each pair is logged in `collaborators/DOUBLE_READS.jsonl`; the agreement rate per AI goes into `MODEL_ACCURACY.md` with the next
   bake-off results. Both readers get their result in their FEEDBACK doc (which fields matched the other reader and the final answer).
