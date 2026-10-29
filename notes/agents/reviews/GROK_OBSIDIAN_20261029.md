<!-- doc-status: current; normative: no -->
# Grok's Obsidian openings (gold, v3-v9, gold-live): review (2026-10-29)

Owner: "grok made 1 for obsidian i think" / "Grok already made a github test pave for them u can use my other github site".
The work is in the owner's separate repo `jpavia10/titan-v6-splash-viewer` (GitHub Pages), folders `gold/` to `gold-v9/` and
`gold-live/`, made on 2026-10-28 with the owner scoring each version (v2 1, v4 "PlayStation", v6 3.5, v8 about 5). The openings audit
of the same day (`OPENINGS_AUDIT_20261029.md`) covered only Gemini's bundles and missed this repo.

How it was checked: every NOTES.md read; `gold-live` run at phone size (390x844, Android user agent, software GL) on Low and on its
phone default Medium, frames at 0.6-11 s and after a tap, no page or shader errors (Low 20-22 fps, Medium 20-26 fps on software GL);
the v7, v8 and v9 stills looked at full size; the app's live Obsidian Sun opening run the same way. Sheet: `grok_obsidian_20261029.jpg`.

## The versions
- **gold v2** (ray-marched point, black sun behind it): owner 1/10. **v3-v7** (three.js r160 physical glass on a mesh Grok generates
  from a distance field, its own Python): v4 "PlayStation", v6 3.5; v5-v7 use recorded Kenney CC0 impact sounds.
- **v8, v9:** Blender Cycles renders of the same mesh, a 15 s film (v8, 5.4 MB mp4) and v9 stills only (its mp4 is not in the repo).
  v9's stills are the best-looking glass of the series. Under rule 12 a film can't be an opening, so neither can be used as one.
- **gold-live (v4, newest):** live three.js: the knapped black-glass point (267k triangles), amber light at the thin edges, an
  amber pool on a slate floor, black-glass chips with real physics, a GPU particle field (shards, gold and silver motes, embers on High+),
  quality tiers Low-Max, a tap or a bass hit in the sound sends a shock through chips, particles and glow, and a "Chill realm" button
  that stays in the scene with a slow heartbeat. That is the first version of a theme room anyone has built.

## Against the live opening
The live Obsidian Sun opening (Gemini v2) is a flat yellow sun ring with green jade cells on a black field: clip art, no volcanic glass.
gold-live is plainly obsidian. As a direction it beats the live opening; as built it is not ready:
1. Blown white patches on the facets on every tier (the studio HDR's softboxes clip to pure white): they read as paint, not reflections.
2. The title sits on the amber glow column: "RELIQUARY" loses its R and I.
3. Its own three.js engine, loaded from unpkg (no offline, a second engine). Rule 12 wants the opening to be the theme's own world.
4. Weight: mesh 4.0 MB + HDR 1.6 MB + three.js about 1.2 MB = more than the app's whole first-load budget (5.5 MB); the full mesh on
   every tier.
5. gold-live's sound is all synthesized (a sawtooth pad and a synthetic boom); v5-v7 had recorded CC0 impacts. Owner rule: recordings.
6. Medium's shard field reads as confetti over the hero; Low has jagged edges (no anti-aliasing at half resolution).
7. No sun, no gold, no jade, no coin: the theme is "Obsidian Sun" (volcanic glass, jade, a hammered gold sun).

## What happens with it
Used, not shipped as is: gold-live becomes the starting point of the Obsidian Sun world in the depth upgrade
(`notes/agents/depth-upgrade.md`): one world for backdrop, opening and room, built on the owner's test site first, with the seven
faults above fixed (darker environment with strip lights instead of the clipped softboxes, the title clear of the glow, recorded sounds,
three.js vendored, a lighter mesh per tier, the field thinned, the gold sun and the coin brought in). Grok's ideas kept as they are:
sound driving the physics (`K.shock` / `K.audioCouple`), the tier table with a render scale, the chill realm, the knapped mesh tool.

Score: Grok row 32 in `collaborators/CONTRIBUTOR_SCORES.md` (6/10; owner-guided, so it says nothing about probation-style streaks).
