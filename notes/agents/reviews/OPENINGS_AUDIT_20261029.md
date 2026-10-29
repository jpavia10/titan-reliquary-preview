<!-- doc-status: current; normative: no -->
# Openings audit: every Gemini opening version vs the live one (2026-10-29)

Owner: "are you truly caught up? I feel like some of those intros could be used" / "if you didnt do that then you didnt really go
through everything". This is the full pass: every opening in Gemini's v4, v5, v6 and v8 bundles, run in the real app with
`?opening=motion&theme=ID&splashhold` (each version swapped in for `js/intros/{id}.js`) and frozen at the same moments, phone size
(390x844), software GL. 165 runs over 45 themes for v4-v6 (frames 1.2, 2.6, 4.0 s) plus the five v8 themes (0.8, 1.8, 2.8 s).
Sheet: `openings_audit_20261029.jpg` (8 themes: live, v4, v5, v6, and Gemini's own v8 still).

## Findings

- **v4, v5, v6 (54 entries each; nine are for theme ids the app does not have):** one opening repeated 54 times. The same
  centred TITAN RELIQUARY plaque sits on a theme-tinted fog in every theme; only the colours and an overlay change (bars, rings, a
  tile pattern). v5 draws the title's reflection mirrored below it (Glacier, Shipwreck); v6 adds a bloom that washes out the frame
  and the THX "Deep Note" chord in every theme. Kintsugi, Event Horizon, Rift Garage, Lumen Circuit and Ferrofluid have no v4-v6.
  No page or shader errors.
- **v8 (Shipwreck, The Mint, Obsidian Sun, Silver Screen, Tourbillon):** does not run on the app's opening kit (its shaders
  redefine the kit's own uniforms `R`, `T`, `U0`, `U1`, `TX`, so every one falls back to an outline). In its own host (Gemini's
  stills) each is a still poster: the coin photo and the title card over one motif. Each runs 14 s.
- **The live openings** are each their own scene: the ink-wash scroll (Dynasty), the caravan at sunset (Silk Road), the flask and
  orb (Alchemist), the Notepad window (Plaintext), the gears (Tourbillon), the curtains and title card (Silver Screen), the
  bioluminescent eye (Xenohold), the eclipse (Solar Observatory). The live Obsidian Sun opening is Gemini's own v2.

## Verdict, theme by theme

None of the v4-v8 openings is better than the opening live for its theme, so none replaces one. Two ideas are worth keeping for the
rebuild (below): Low Orbit's Earth limb seen through the cupola frame (v4/v5) and Hyperborean Vault's aurora over the cracked ice
(v4). From v8, the closing frame (the coin and the title together) is a good end card for any opening.

## What changes anyway

Owner rule of 2026-10-29: an opening runs on its theme's own engine (the same GPU world, particles and sound as the theme), rendered
live from code at the device's quality tier, never a film. None of the live openings does that today either: each is its own small
scene in `js/intros/{id}.js`. So the openings get rebuilt on the theme engines as part of the depth upgrade (see
`notes/agents/depth-upgrade.md`), and these Gemini versions are not the starting point. Not scored again: v4-v6 and v8 were scored
on 2026-10-27/28 (CONTRIBUTOR_SCORES rows 39-40); this pass confirms those scores by running every version in the app.

## Missed in this pass, reviewed the same day
Grok's Obsidian openings (gold v2 to v9 and gold-live) are in the owner's other repo, `jpavia10/titan-v6-splash-viewer`, not in any
Drive or Gemini bundle, so this pass did not see them. Reviewed separately: `GROK_OBSIDIAN_20261029.md` (gold-live is plainly obsidian
and beats the live Obsidian Sun opening as a direction; it becomes the starting point of the Obsidian room and opening).

