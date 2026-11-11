<!-- doc-status: current; normative: no -->
# Sound-hunt finds (project sound-hunt-20261029)

The outside AIs' answers to `docs/agents/SOUND_HUNT.md`, copied from Drive `sound-incoming (AI music + field recording finds)/` on 2026-11-07. Nothing here is in the app yet.

| File | AI | Music | Field recordings | Replacements | Not found |
|---|---|---|---|---|---|
| `sound_grok_20261105-0308.json` | Grok | 24 | 79 | 46 (for the Moodist ambience sounds) | 54 |
| `sound_gemini_20261105-0355.json` | Gemini | 13 | 103 | | 6 |
| `sound_gemini_20261105-1425.json` | Gemini | 13 | 115 | | 0 |
| `sound_muse_20261109-0450.json` | Muse (tranche 1) | 1 | 10 | | 17 |
| `sound_muse_20261109-0837.json` | Muse (tranche 2) | 21 | 48 | | 37 |
| `sound_gemini_20261109-1525.json` | Gemini (tranche 3, gap fill) | 0 | 14 (archive.org, CC0 USC sound-effects library) | | 0 |

Copied 2026-11-07 (Grok, Gemini) and 2026-11-11 (Muse x2, Gemini tranche 3). Gemini's 14:25 file is its second pass over the same list (the 03:55 file is kept for the record; read 14:25 first).

2026-11-08: the music picks for the seven themes without music of their own went through the intake: 4 kept (tr277), the rest refused or held (`docs/music/REVIEW.md`; Grok row 42). Field recordings and replacements: not yet.

Next step (for the rest): every pick goes through the music intake (`.github/workflows/music-intake.yml` + `tools/music/fetch_classical.py`: licence, performer, right piece, modern recording) and is listened to before it enters `docs/music/wanted.json` or `audio/`. The finds are not scored until then (CONTRIBUTOR_SCORES).

Muse's own caveats on its tranche 2 (notes in each entry): the Casals Sarabande (ferro) and the 1940 Pizzicato-Polka (freefall) rest on European public-domain statements, not a US rationale: drop them under a strict US test. Gemini's 14 tranche-3 finds are all archive.org USC/Craig Smith items marked CC0 on the item page; check each item page's licence line before use.
