<!-- doc-status: current; normative: yes (for Grok) -->
# WORK QUEUE for Grok (updated 2026-10-08)

From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom. When a task is done, mark it DONE with the date (in your Drive queue doc, or say so in chat) and start the next one straight away; do not wait to be asked.

**Status:** active. Strongest outside contributor (10/10 last review): web + Drive access, opens Numista, careful sources.
**How you get this:** Drive doc 'WORK QUEUE for Grok' in Titan Reliquary/ + this repo (raw GitHub URLs)

Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.

## 1. Numista sweep, batches 1 to 9  [NOW]  (fix list #72 #71 #40)

Read Drive 'REQUEST for Grok: Numista sweep (2026-10-08)' and docs/requests/numista_sweep_worklist.json. One change file per batch in collection-incoming (AI change files); exact Numista URL in every source; provenance on every line. Do all 9 batches back to back.

**Done when:** 9 change files dropped (412 facts asked).

## 2. Find 8 classical recordings (and check the 16 we kept)  [NEXT]  (fix list music)

16 of 24 pieces now play in the app (docs/music/REVIEW.md). Find recordings for the 8 rejected ones: Bach Air (Orchestral Suite No. 3), Pachelbel Canon in D, Elgar Nimrod, Dvořák New World Largo, Handel Ombra mai fu, Debussy Rêverie, Debussy Arabesque No. 1, Liszt Consolation No. 3; also a PIANO recording of Satie Gymnopédie 1 and 3 (the kept ones are guitar). Rules: a named human performer (no MIDI, synth or virtual piano), license Public Domain / CC0 / CC BY(-SA) for the RECORDING, and in the US too (no 1926-or-later historical 78 rpm transfers). Prefer Wikimedia Commons (exact File: title), else Musopen or archive.org with the license page. Write a JSON list {id, file or url, license, performer, why} as music_grok_{YYYYMMDD-HHMM}.json in Drive 'music-requests (Grok)'. While there, spot-check 3 of the 16 kept picks in docs/music/REVIEW.md.

**Done when:** One JSON file covering the 8 pieces + Satie piano versions.

## 3. Take the blind photo test  [NEXT]  (fix list #4)

Open github.com/jpavia10/titan-reliquary-preview/tree/main/docs/bakeoff/pack-20261008-main and follow its PROMPT.md exactly: answer only from the 30 photos, null when unsure. Save bakeoff_grok_{YYYYMMDD-HHMM}.json in Drive 'bakeoff (blind photo test)'. Never open '_locked'.

**Done when:** One JSON answer file with 30 entries.

## 4. Fact-check the coin stories, C151 to C283  [LATER]  (fix list #73)

Each coin's story (collection/specimens/*.json, field story) makes catalogue claims. Check each against its own record and the cited Numista entry; where a claim is wrong, send a corrected story as a change file (source = the exact entry; say what was wrong). Muse wrote the stories, so you check them.

**Done when:** Every story from C151 to C283 checked; a list of the ones you changed and why.

## 5. Motion Lab study 2: the coin flip  [LATER]  (fix list #56)

Like your gold-dust study: one self-contained HTML file using ../js/three.min.js and a real coin's two photos (photos/p1/ coins with both sides), the coin flips with a moving rim light; Still / Calm / Full; must follow the app's Motion setting (localStorage titan.motion). Put it in Drive 'motion-lab-incoming'.

**Done when:** One HTML file Claude can drop into /motion-lab/.

## 6. Read new coin photos (with Muse, blind)  [ALWAYS]  (fix list #55)

Whenever NOID photos appear in STAGING: Phase 1 change file per AI_START_HERE, without looking at Muse's read first (AI_START_HERE 2b).

**Done when:** Ongoing.
