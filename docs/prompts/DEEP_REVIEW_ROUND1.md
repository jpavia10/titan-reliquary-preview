<!-- doc-status: current; normative: no -->
# Titan Reliquary: deep review, round 1 (prompt for outside flagship models, 2026-10-08)

Give this whole prompt to each model. Results land in Drive `Titan Reliquary/reviews-incoming (AI deep reviews)/` or are pasted to Claude, who verifies and merges them.

---

You are doing a deep, read-only review of Titan Reliquary for its owner, Joseph Pavia. Use your full output budget: depth beats breadth. Other flagship models get the same prompt; Claude (the project's integrator) will verify every claim against the files and merge the best findings. Unverifiable claims get thrown out, so evidence is everything.

## What Titan Reliquary is
A private coin and precious-metals collection app (a zero-build PWA: vanilla HTML/CSS/ES6, Three.js for 3D, no npm, no bundler, works offline). 285 coins and tokens from 49 countries, 33 albums, bullion lots; about $5.4k. Joseph and his dad use it; it must stay readable for his dad (large type, high contrast). The data lives in `collection/` (JSON master) and a Python pipeline builds the site data in `data/`. Several AIs contribute data only through change files; Claude merges them and owns the code and the site.
The goal: be the best in the world at one thing: **the most trustworthy record of a personal coin collection**, where every fact shows where it came from, who said it and how sure we are.

## Where everything is (all of it is yours to read)
- GitHub repo (public): https://github.com/jpavia10/titan-reliquary-preview (branch `main`)
- Any file raw: https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/PATH
- Full file list: https://api.github.com/repos/jpavia10/titan-reliquary-preview/git/trees/main?recursive=1
- Live app: https://jpavia10.github.io/titan-reliquary-preview/
- Google Drive (if you have access to Joseph's Drive): folder `Titan Reliquary` (your `FEEDBACK for {your name}` doc, `AI_START_HERE (any AI reads this first)`, `photos/`, `_raw_capture/`, `_archive/grok-ledger-v254 (...)` with the original ledger).

Read these first, in this order:
1. `CLAUDE.md` (project rules, history, owner decisions)
2. `docs/FIX_LIST.md` (the owner's current checklist, with prerequisites; item numbers never change)
3. `collaborators/SHARED_LOG.md` (top entries)
4. `AI_START_HERE.md`, `collection/templates/INSTRUCTIONS.md`, `collection/templates/FIELDS.md` (the data contract)
5. `data/status.json` (the generated counts), `collection/CURATION_OPEN.md`, `collaborators/CONTRIBUTOR_SCORES.md`, `collaborators/MODEL_ACCURACY.md`
Then use whatever else you need: `collection/types/*.json`, `collection/specimens/*.json`, `collection/albums.json`, `collection/board.json`, `collection/changes.jsonl` (large audit log), `data/detail/*.json` (per-coin certainty + history), `tools/pipeline/*.py`, `app.js`, `js/*.js`, `wings/*.js`, `sw.js`, `notes/agents/*.md`, `prototypes/`, coin photos in `photos/p1/`.

## Hard rules
- **Read-only.** Do not edit GitHub, do not edit or move anything on Drive, do not drop files in `collection-incoming`. Everything you produce goes in your reply. Only exception: if you can write to Drive, also save your full reply as `REVIEW_{yourmodel}_{YYYYMMDD-HHMM}.md` in `Titan Reliquary/reviews-incoming (AI deep reviews)/`.
- **Evidence or it does not count.** Every claim cites a file path plus line number or JSON key, or a URL (for catalogue facts: the exact entry, e.g. Numista N#12345, KM#24a.1, an NGC/PCGS page URL). Anything you could not check yourself is marked `UNVERIFIED`. Never invent file contents, line numbers, catalogue numbers or URLs; if a file was too large or unreachable, say so.
- **No secrets.** Never print or ask for tokens or passwords. Do not contact anyone.
- **This is not the photo-reading bake-off (#4).** The answers are visible in the repo, so do not present coin readings here as proof of your accuracy.
- Write anything meant for Joseph in plain English. Technical detail goes in the code and data sections.
- If you run out of output, stop at a section boundary and end with `CONTINUE FROM SECTION N`. Joseph will say "continue".

## Finding IDs
Give every finding an ID: `{CODE}-{section}-{nn}`, where CODE is 3 letters for your model (GRK = Grok, GEM = Gemini, MUS = Muse, GPT = ChatGPT, or your own). Example: `GEM-2-07`.

## Deliver these sections, in this order

### 0. Header
Your model name and version, the date and time, and two lists: every file or URL you actually opened, and everything you tried to open but could not.

### 1. Check the state (up to 10 findings)
Compare what the docs claim (`docs/FIX_LIST.md` "State of the union", `CLAUDE.md` "Collection facts" and status log) with the actual files (`data/status.json`, `collection/`). Report only real mismatches, each with both sources quoted.

### 2. Data truth audit (your top 25, strongest first)
Find factual errors in `collection/types/*.json` and `collection/specimens/*.json`, for example: a year outside the type's issue range; a composition wrong for that year (e.g. US 90 % silver ends in 1964 for dimes, quarters and halves; 1965-70 halves are 40 %); a mint mark not used that year; a euro coin dated before that country adopted the euro; a mintage that belongs to another year or mint; a denomination or unit that never existed for that issuer; a catalogue number that points at a different coin. For each: `id`, `field`, current value, proposed value, the exact source, your confidence (high / med / low).
Then repeat the high-confidence ones as change-file lines exactly as `collection/templates/INSTRUCTIONS.md` specifies: one JSON object per line, `"by": "model:{yourmodel}"`, `"phase": 2`, an exact `source`, `"verified": false`, and a `provenance` object (`model`, `prompt_version`: "DEEP_REVIEW_ROUND1", `workflow`: "phase2-research", `inputs`: the files you read, `run_id`, `tokens`/`cost_usd` or null). Put them in one fenced `jsonl` block. Do not upload them; Claude validates and merges.

### 3. Code review (up to 15 real defects, worst first)
Bugs in `tools/pipeline/*.py` and in the app (`app.js`, `js/`, `wings/`, `sw.js`): things that break, lose data, show a wrong number, fail offline, or hurt Joseph's dad (contrast, tiny tap targets, motion with no off switch). Each: file:line, what goes wrong, how to reproduce, the smallest fix. No style nits, no "consider refactoring".

### 4. The fix list, reviewed
- For every open **Tier 1** item in `docs/FIX_LIST.md`: keep it in Tier 1 or move it (say where), any missing prerequisite, the concrete first step, the main risk. One short paragraph each.
- Up to 10 things missing from the list entirely: title, which tier, what each needs first and what it unlocks.
- Anything that should be cut, and why.

### 5. Best in the world
What would make this the most trustworthy personal coin-collection record anywhere? Compare with tools you can actually cite (collection apps, grading-service registries, catalogue sites); mark anything you cannot source `UNVERIFIED`. End with your 5 highest-impact features ranked by how much they raise trust, each mapped to an existing fix-list number or marked NEW with its prerequisites.

### 6. Motion Lab (#56): the gold-dust study
Joseph wants a scroll-driven particle scene: gold and silver dust that forms his real coins (sampled from the photos in `photos/p1/*.webp`), then the 49 countries on a map, then an album page, with the finger or cursor stirring the dust. Constraints: vanilla ES6, the Three.js already vendored at `js/three.min.js` (no new libraries, no build step), works offline, smooth on a mid-range phone (the in-app meter calls 55 fps or more "smooth"), honours `prefers-reduced-motion` (calm or still), never blocks reading for Joseph's dad, and lives on its own test page, separate from the app. Give: the technical design (how photos become point targets, how shapes morph, the shader approach, particle counts per device tier, fallbacks, how to measure it), then, only if you can write complete working code with no placeholders, one self-contained HTML file for the first study.

### 7. Your own lane
One thing you can do for this project better than the other AIs (because of your tools, data access or strengths), stated as a concrete next task with its output format.

### 8. Questions for Joseph (up to 5)
Only things you could not settle from the files. Each answerable in one line.
