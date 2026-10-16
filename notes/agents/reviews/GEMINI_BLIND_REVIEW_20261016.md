<!-- doc-status: current; normative: no -->
# Gemini's appearance work, judged blind (2026-10-16)

Owner, 2026-10-16: "I need to criticize argon work so we can send it feedback for a real rebuild. I want to eliminate sunken cost bias."
Review page (owner only): https://claude.ai/artifact/5bc8r7rf9Urx4QEdr8at1K . Verdicts are in its database, collection `verdicts`
(one document per item: `crest-<theme>`, `theme-<theme>`, `continuum`, `css`, `overall`; each crest/theme document carries
`gemini_side` and `winner` = gemini | ours | neither | tie). Read them with the ArtifactData tool (`list`, collection `verdicts`).

Source: Gemini's code intake, branch `art-intake`, commit `adcf6d9`, folder `intake/gemini-code-20261014/`
(24 `atmocss_*.css`, 23 `atmojs_*.js` crests). Continuum v2: Drive `design-incoming`, file `design_gemini_20261014-1935_continuum-v2.html`.

## Theme stylesheets: measured, not a redesign
Gemini's 24 files are our live `styles/atmo/<theme>.css` (unchanged since 2026-10-10) with **187 lines added or changed** in total
(our 24 files: 3,885 lines). Screenshots at 390x844 (2x), Motion Off, Hall / Gallery / coin C258, live file vs Gemini's served in its place
(`ab_shots.py`, `pixel_diff.py`, threshold 12/255). 19 of 24 differ by under 0.1 % of pixels. The 5 that change visibly do so mainly by naming
fonts the app does not ship (Cinzel, Playfair Display, Newsreader, Inter, JetBrains Mono), so the phone falls back to its own serif for body text;
those 5 are blind pairs on the review page.

| theme | lines added/changed | lines replaced | % pixels Hall | Gallery | coin |
|---|---|---|---|---|---|
| conservator | 6 | 0 | 14.60 | 29.03 | 16.71 |
| colossus | 11 | 0 | 13.79 | 19.75 | 10.47 |
| nocturne | 11 | 0 | 13.73 | 17.37 | 10.46 |
| afterhours | 11 | 0 | 2.38 | 0.75 | 1.62 |
| valhalla | 14 | 4 | 0.00 | 1.19 | 0.00 |
| odyssey | 19 | 5 | 0.04 | 0.08 | 0.00 |
| abyss | 1 | 0 | 0.00 | 0.00 | 0.00 |
| alchemist | 1 | 0 | 0.00 | 0.00 | 0.00 |
| arcade | 10 | 0 | 0.00 | 0.00 | 0.00 |
| bauhaus | 11 | 0 | 0.00 | 0.00 | 0.00 |
| construct | 1 | 0 | 0.00 | 0.00 | 0.00 |
| diorama | 10 | 0 | 0.00 | 0.00 | 0.00 |
| drafting | 11 | 0 | 0.00 | 0.00 | 0.00 |
| dynasty | 1 | 0 | 0.00 | 0.00 | 0.00 |
| glacier | 14 | 5 | 0.00 | 0.00 | 0.00 |
| neon | 1 | 0 | 0.00 | 0.00 | 0.00 |
| notepad | 1 | 0 | 0.00 | 0.00 | 0.00 |
| pulp | 10 | 0 | 0.00 | 0.00 | 0.00 |
| samadhi | 1 | 0 | 0.00 | 0.00 | 0.00 |
| silkroad | 7 | 1 | 0.00 | 0.00 | 0.00 |
| solaris | 14 | 4 | 0.00 | 0.00 | 0.00 |
| terminal | 9 | 0 | 0.00 | 0.00 | 0.00 |
| xeno | 1 | 0 | 0.00 | 0.00 | 0.00 |
| zen | 11 | 4 | 0.00 | 0.00 | 0.00 |

What the lines do: `.sw-<theme>` picker swatches and `--sw-ink` (already set in `styles/themes.css`; 6 repaint the swatch), font tokens for fonts
not loaded, a gold fill on `.tab.active` (9 themes), a gold gradient on primary buttons (3), stronger glow in `--elev-*` (4), zen background tweaks.

## Crests: a real comparison
23 crests. 9 are live since tr114 (`bf4edd6`: arcade, conservator, dynasty, nocturne, notepad, odyssey, samadhi, terminal, diorama; compared
against the sprite before it, `bf4edd6^:index.html`); 14 were not used (compared against the live sprite or the `wings/atmo/<theme>.js` override).
`crest_extract.js` pulls all three versions. Sides are balanced (12 A / 11 B for crests, 3 / 2 for themes), fixed at build time.

## Continuum v2
Shown as a demo copy: banner says the data is frozen at 2026-10-14 (it says 311 coins), the dealer-buyback and pawn tiles (made-up 0.96 / 0.65 /
0.85 / 0.22 factors) and the per-coin "ring" pitches (made-up Hz) are hidden. Scored by the owner on 5 questions (dad can find a missing year,
daily use, find one coin, feels like his collection, readable on the phone) + which of 12 ideas to keep + what to throw out + what makes it a 10.

## Result (owner marked done 2026-10-16 05:23 UTC)
- Crests: 23 of 23 "both weak". Themes: 5 of 5 "both weak" (Conservator: "No reimagination. Its living in the past"). Nothing to port: no
  version won, Gemini's or the app's. Alchemist note: "If its ourorboros its shitty. Make all of them better why is the bar so low".
- Continuum v2: dad 5, coin 3, read 3, daily 2, ours 2; all 12 ideas kept; "It needs so.much work. I need argon to do its job so you can not
  waste conpute."
- Overall, to Gemini: "Sunken cost bias is so clear. You did so much work and produced no value to me. Im expecting frontier level work to
  show off. Advanced motion and 3d effects and transitions. Advanced web design. Its so living in the past its unreal. Id give it a 3/10 in
  irs current state. I feel like I ask for updates ans only get fact checking. Lets get some serious state of the art tech demo Advanced
  implementation."
- Follow-up: `docs/design/ARGON_REBUILD_BRIEF.md` (Titan v3, M1 first), first in Gemini's queue; also in Drive design-incoming, FEEDBACK
  and WORK QUEUE docs. Found on the way: C200's display label still said 1978 from the old ledger (record 2008); fixed in `display.py`
  (a ledger label naming another year is dropped) + its note (`changes_claude_20261016-0545`).
