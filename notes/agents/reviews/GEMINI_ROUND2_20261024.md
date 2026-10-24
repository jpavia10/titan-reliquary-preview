<!-- doc-status: current; normative: no (review record) -->
# Gemini round 2 review (2026-10-24)

Owner: "Check again im sure gemini did stuff look everywhere". Found by a full Drive sweep (every page of the search), all delivered
2026-10-24 between 04:00 and 07:00 UTC. Every package was run in the app on software WebGL (phone 390x844 and desktop 1280x760):
the world at 3, 6 and 9 s, after opening a coin and after a tap, and the opening at 0.6 / 1.6 / 2.4 / 3.2 / 4.4 s. Scores:
`collaborators/CONTRIBUTOR_SCORES.md` Gemini rows 23-31.

## Shipped (tr255)
- **Theme #44 Cloud Forest v2** (`fx/canopy.js`, `js/intros/canopy.js`): every point of the v1 review fixed. One line changed by
  Claude: the opening sampled its title card with `1.0 - uv.y`, but the intro kit already uploads textures flipped
  (`UNPACK_FLIP_Y_WEBGL`), so the name was drawn upside down; now `texture2D(TX, ruv)`. Wired with `add_theme.py` + kit lazy map,
  sw precache, intro tag, group "Weather and sky", scape `rainforest`, alias, 3D dust, UI voice. About 35 % slower than Silver
  Screen on software GL (4.5 vs 6 fps phone in the same bench); not yet seen on a real phone. Card + hero requested
  (`artreq_20261024-0900_theme-art-canopy-silverscreen`); its two music picks queued in `docs/music/wanted.json`.
- **Images**: cards for Supercell (take 2), Tourbillon (take 2), Darkroom (take 1), Silver Screen (take 1); heroes for Supercell,
  Tourbillon, Darkroom; refreshed heroes for Midnight Gallery (afterhours) and Shipwreck (abyss). WebP 640x400 / 1600x1000.

## Not shipped
| Package | What is wrong (seen on screen or in the compiler log) |
|---|---|
| #45 Salt Mirror | World and intro never compile: the shader lines are joined with `"\\n"` (a backslash and an n) instead of a line break; `ERROR 0:1 '\' unexpected token`. No world on any device. |
| #46 Light Well | Good idea and material. On a phone the sun blade lands on the coin and burns the photo to plain white; the concrete reads as dark wooden planks; opening name upside down. |
| #47 Obsidian Sun | Flat 2D graphic (flat yellow petals, flat green and gold bands), no volcanic glass, not photoreal; rings cut off at the phone edges; coin burnt out; opening name upside down. |
| #48 Glasshouse, #49 Low Orbit, #50 Sahel, Nocturne + Zen rebuilds | One template: the five world files are identical except `#define MOTIF 1..5` and colours, the five intros identical except colours and two captions. Each world is a dark gradient with a ring round the coin (a few grid lines, a blue limb, an amber glow, motes, faint rings); the caption is drawn over the coin photo while a coin opens. Nocturne and Zen already exist and are better. |
| Every intro | Name upside down (`1.0 - uv.y` on a texture the kit flips on upload). |

## Motion studies 2-6
- 2 Turn a coin: never draws. `transpose()` is not in GLSL ES 1.00, so the program does not link (it never checks the compile
  status, so nothing says so). Back photos are guessed by renaming `_obv.` to `_rev.` and 404.
- 3 Coin dust: works. The "country outline" stage is a random blob generated from a hash of the country name, presented as the
  country's shape; the coin is stretched into an ellipse (aspect handled only for wide screens).
- 4 Into the album: works; the click is a synthesized oscillator (brief: recorded sounds only); every slot starts lit, so the lit
  state means nothing.
- 5 Theme wipe: works (ink bleed, frost, solar sweep, interruptible); the three worlds are plain noise colours.
- 6 Coin page worlds: the coin fills the screen and is cut off on a phone.

## Titan v3 M1
`design_gemini_20261016-0610_v3-m1.html` is a flat grid of tiles with a 2D magnifier, not the accepted spec
(`docs/design/v3/M1_SPEC.md`). Its fact table marks country, year and denomination of every coin **Verified** and the value
**Checked** without reading any certainty data. Not hosted.

## Music
`music_gemini_20261023-2135.json`: El Noi de la Mare (Jujutacular, guitar, 2009, CC BY-SA 3.0) and C. P. E. Bach Flute Sonata
Wq. 131 (La Guirlande, 2016, CC BY 3.0), both real recordings with page quotes. Queued for the intake (it checks each page).
Salt Mirror's sheet names a 1932 Schnabel recording (not public domain in the US) "or Paul Pitman": not queued.

## What to do differently
1. Run what you build before you send it: open the page, read the console, look at the screen on a phone size. Every bug above
   shows in the first 10 seconds.
2. One theme at a time, each its own design. Never one shader with a motif switch.
3. A README lists only checks that were actually run, with what was seen.
