<!-- doc-status: current; normative: yes (for Gemini API) -->
# WORK QUEUE for Gemini API (updated 2026-11-12 03:00 UTC)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

**Status:** active (probation: every fact you write is checked by another AI until 3 submissions in a row score 8+). New source (owner, 2026-10-31: "Gemini api will be a new source and sub sources based on model used"): the Gemini API on the owner's free-tier key, run by Claude from the session (tools/gemini/run_homework.py). Each model it runs on is a sub-source (by model:gemini-api:<model>, e.g. model:gemini-api:gemini-3.8-flash), measured on its own. It reads coin photos and checks photo readings with 3.6 Flash, and rewords stories with 3.5 Flash Lite (owner, 2026-11-01: "Flash lite should probably be used for text only stuff"; Lite misread real years and face values in the photo test, so it takes no photo work); it has no web search (the free tier has no search quota) and opens only pages it names that let Google's fetcher in (Wikipedia, Foronum, CoinArchives; Numista, NGC, uCoin and Colnect refuse it), so it takes no cite, catno, fill, value or research work. On probation like any new AI: every fact it writes is checked first. Not independent of the Gemini app (one vendor, one model family): it never checks the app's facts, the app never checks its facts, and the two together never make a fact Checked.
**How you get this:** No Drive, no chat: Claude runs it (python3 tools/gemini/run_homework.py), which answers its open sheets in docs/agents/homework/sheets/ and writes collection/_incoming/changes_gemini-api_YYYYMMDD-HHMM.jsonl; publish.py merges it like any contributor's file. A line citing a web page it did not actually open is dropped before the file is written.

## Finish first

### Model bake-off: which Gemini model reads coins best  (fix list #4)

Run the main blind photo pack (tools/bakeoff/make_pack.py, 30 coins) through each free model that sees images (gemini-3.8-flash, gemini-3.6-flash, gemini-3.5-flash-lite, gemma-4-31b-it; Gemini 4 Argon has no free-tier quota: limit 0 on 2026-10-31), each as its own sub-source, and score each with tools/bakeoff/score.py --agent gemini-api --key against the locked key. The best model becomes the default for its sheets; a model with an invented rate over 5 % takes no photo work. First runs (2026-10-31): 3.5 Flash Lite 30 of 30 (74 % core, 36 % invented) and Gemma 4 31B 23 of 30 (47 %) are recorded and take no photo work; 3.6 Flash read 17 of 30 with no real misread of country, year or face value before its free limit of 20 requests a day: it is the default; finish its last 13 photos when its daily quota allows (after its sheets), then record it with --agent gemini-api. 3.8 Flash stalls: try again later.

**Done when:** Each model has a row in collaborators/MODEL_ACCURACY.md and docs/agents/homework/calibration.jsonl.

## Calibration test due: the locked photo pack (15 coins)  (fix list #19)

Open https://github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-locked and follow its PROMPT.md (raw: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/docs/bakeoff/pack-20261008-locked/PROMPT.md). Answer ONLY from the photos: never search this repository or its data for the coins. Save `bakeoff_gemini-api_YYYYMMDD-HHMM.json` in Drive `Titan Reliquary/bakeoff (blind photo test)/` (or reply with it in chat). This is your first time with this pack. Its coin ids exist only in Claude's locked key; it decides which AI reads the Phase 2 pro photos.

**Done when:** the answer file is in Drive; Claude scores it and your numbers appear in collaborators/MODEL_ACCURACY.md.

## Projects (after the homework)

### Read new coin photos, blind  [ALWAYS]  (fix list #55)

Whenever NOID photos appear in Drive STAGING, Claude runs each new photo through the API (python3 tools/gemini/run_homework.py --photo FILE) for a blind first reading of country, year, denomination and mint mark, before reading any other AI's answer. It is a second, independent reading of the photo (never of the app Gemini's reading).

**Done when:** Ongoing.

## Your numbers (measured, not self-reported)

- Assignments answered: 4; expired: 1.
- Your facts checked by another contributor: 11 (3 confirmed, 8 wrong; error rate 72.7 %, 95 % range 43-90 %). Checks you did for others: 6. Open disagreements you are part of: 1.
- Share of your new facts that get checked first: 100 %.
