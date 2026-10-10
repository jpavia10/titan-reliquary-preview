# Twenty styles, six new themes, motion splashes, Motion Lab (integrator spec, 2026-10-10)

Owner, 2026-10-10, after sending two TikToks ("20 insane Claude animation styles" and the Textura Agency particle site):
"Build those animation styles in the Motion Lab on second video. Then for the first one there's 20 examples. Incorporate each example
into the existing themes when appropriate. When it isn't, create a new theme for it to exist. Do all theme related tasks now. Upgrade any
UI changes needed. Add motion splashes etc."

This lifts, for theme and motion work only, the design pause and the "theme catalog frozen at 20" note. The Signature rules in
`notes/agents/theme-pot.md` still hold where they can: token-only new themes, AA contrast, the perf budget, reduced motion. Hero art for new
themes comes later from the art queue (rule 9); until then the picker shows the swatch.

## 1. Where each style lives

| # | Style | Theme (id) | How it shows |
|---|---|---|---|
| 1 | Particles | Midnight Gallery (`afterhours`) | FX `style-particles`: video-2 look. Moonlit blue light beams, a fine dust field the pointer stirs; a rare moment gathers the dust into a real coin's silhouette, then it bursts back |
| 2 | Liquid morph | The Mint (`colossus`) | FX `style-liquid`: molten silver metaballs that merge and split, chrome highlights, ember rim light |
| 3 | Holographic | Prism (`kaleido`) | FX `style-holo`: thin-film rainbow foil bands sweeping the screen, sparkle glints; UI: holographic sheen on cards |
| 4 | Neon glow | Neon Vault (`neon`) | FX `style-neon`: neon tube shapes (coin ring, $ sign, stars) with bloom and a rare flicker |
| 14 | Retro VHS | Neon Vault (`neon`) | FX `style-vhs`: tracking band, chroma split, faint scanlines, the synth sun; combined `style-neon+style-vhs*0.7` |
| 5 | Wireframe 3D | Solar Observatory (`solaris`) | FX `style-wireframe`: a slowly turning wireframe armillary sphere / planet grid, gold lines on indigo, perspective floor grid |
| 6 | Glassmorphism | Hyperborean Vault (`glacier`) | FX `style-glass`: large soft aurora colour blobs drifting behind; UI: frosted-glass panels (backdrop blur, light edge) |
| 10 | ASCII art | The Construct (`construct`) | FX `style-ascii`: a real coin photo rendered as green ASCII characters, glyph columns; also fix list #23 (terminal readability) |
| 11 | Gradient mesh | Samadhi (`samadhi`) | FX `style-mesh`: 4-6 soft colour fields (saffron, rose, plum, indigo) breathing and orbiting, fine grain |
| 19 | Art deco | Nocturne (`nocturne`) | FX `style-deco`: gold sunburst fans, stepped chevrons, a slow shimmer sweep; UI: deco double rules |
| 15 | Halftone | Conservator (`conservator`) | FX `style-halftone`: soft shapes printed as an ink dot screen on the paper, very low alpha (light theme) |
| 20 | Neo-brutalism | Plaintext (`notepad`) | UI only, no motion: thick black borders, hard offset shadows on buttons and cards, bold type, one yellow accent for "current" |
| 17 | Pixel art | NEW Arcade (`arcade`) | FX `style-pixel`: 8-bit night skyline, pixel stars, coin sprites, a blinking INSERT COIN; nearest-neighbour |
| 12 | Comic book | NEW Pulp Adventure (`pulp`) | FX `style-comic`: Ben-Day dots, speed lines, a rare POW / KAPOW burst; UI: ink outlines, hard shadows |
| 18 | Blueprint | NEW Drafting Room (`drafting`) | FX `style-blueprint`: drafting grid, a coin drawn to scale (concentric rims, reeding ticks, dimension lines "Ø 24.3 mm"), turning gears |
| 9 | Clay 3D | NEW Clay Diorama (`diorama`) | FX `style-clay`: soft matte clay shapes (coin stacks, a tiny vault door, spheres, torus) on an |
| 8 | Isometric | NEW Clay Diorama (`diorama`) | ... isometric floor grid, pastel, soft occlusion; combined `style-clay` (one preset) |
| 16 | Bauhaus | NEW Bauhaus (`bauhaus`) | FX `style-bauhaus`: primary circles, squares, triangles and bars sliding on a grid |
| 7 | Kinetic type | NEW Bauhaus (`bauhaus`) | FX `style-kinetic`: coin legends in huge type sliding and stacking (LIBERTY, E PLURIBUS UNUM, HELVETIA, IN GOD WE TRUST, REPUBLIQUE FRANCAISE) |
| 13 | Split-flap | NEW Grand Terminal (`terminal`) | FX `style-splitflap`: a departures board whose flaps flip to the collection's countries and counts |

Themes with no new style keep their current signature effect: Odyssey, The Cursed Wing, Shipwreck, Xenohold, The Alchemist, Gilded Armory,
Dynasty, Zen Garden, Silk Road.

## 2. The six new themes (token-only: `styles/atmo/{id}.css` holds ONLY the token block)

| id | Name | Collection | Mood (picker line) | Scheme | Scene | Station |
|---|---|---|---|---|---|---|
| arcade | Arcade | Studio | Insert coin: an 8-bit arcade where every piece is a token and the high score is your collection. | dark | arcade | synthwave |
| pulp | Pulp Adventure | Studio | A 1940s treasure-hunt comic: ink, Ben-Day dots and a POW on every find. | light | pulp | jazz |
| drafting | Drafting Room | Museum | The engraver's drafting room: every coin drawn to scale, every dimension measured. | dark | drafting | classical |
| diorama | Clay Diorama | Studio | A miniature vault in soft clay, seen from above like a toy model. | light | diorama | lofi |
| bauhaus | Bauhaus | Studio | Primary shapes and moving type: the coin legends as a 1920s Bauhaus poster. | light | bauhaus | classical |
| terminal | Grand Terminal | Journeys | A grand railway hall: fifty countries on the departures board. | dark | terminal | adventure |

Palettes (all token pairs pass the template's legibility rules; checked):
- arcade: bg #0b0820, surface #161038, surface2 #211a4e, ink #f6f3ff, muted #cfc8f2, faint #a99fe2, gold #ffd23f, on-gold #1a1200, teal #40e0d0
- pulp: bg #f6ecd2, surface #fffaee, surface2 #efe1bf, ink #17120d, muted #3b3127, faint #5a4c3c, gold (comic red) #b3101f, on-gold #fff, yellow #ffd400, blue #1f4fa8
- drafting: bg #0c2a50, surface #11355f, surface2 #17416f, ink #f3f8ff, muted #cfe0f5, faint #a6c2e4, gold (pencil amber) #ffd27a, on-gold #1a1204
- diorama: bg #f3ece4, surface #fffaf5, surface2 #efe4d7, ink #2a2320, muted #4c423d, faint #675b55, gold (terracotta) #a9481f, on-gold #fff, pastels #f4b6c2 #a8d8ea #ffe08a #b8e0c2
- bauhaus: bg #f2efe6, surface #ffffff, surface2 #e8e3d5, ink #111111, muted #2f2f2f, faint #4f4f4f, gold (red) #b42416, on-gold #fff, blue #1d4ea1, yellow #f2c230
- terminal: bg #0d0f12, surface #171b20, surface2 #20252c, ink #f6f3ea, muted #d2cdbe, faint #aaa493, gold (flap amber) #ffc43d, on-gold #15100a

## 3. FX rules (every `style-*` preset)
- Registered with `TitanFX.register(id, def)` in one of four files (one owner each): `wings/fx/styles-a.js` (particles, liquid, holo,
  neon, vhs), `wings/fx/styles-c.js` (wireframe, glass, mesh, deco, halftone), `wings/fx/styles-b.js` (ascii, splitflap, kinetic, pixel),
  `wings/fx/styles-d.js` (comic, blueprint, clay, bauhaus). Read `wings/fx/engine.js` (header) and `wings/fx/presets.js` (the fx-v3 presets are the model: `T3`,
  `G3`, `PV`, `F_SOFT`, `fin`). Copy helpers you need into your file; do not edit presets.js.
- Text, glyphs and sprites: the new `canvas` option (engine header): a small 2D canvas per layer, uploaded as `uTex` on texture unit 2. Keep it
  small (<= 512 x 512) and slow (<= 12 fps); return false from draw when nothing changed.
- The overlay sits over the page and is attenuated over text by the engine's text-safe mask. Keep average alpha low; on light themes
  (`uLight` = 1) draw ink-toned, never bright light. Body text must stay WCAG AA with the effect at Full.
- `still`: reduced motion and Motion "Calm"/"Off" draw one still frame (the engine handles it; make the still frame look intentional).
- Perf: Pixel 7 at 4x CPU, Hall scroll >= 50 fps with the effect on. Use `uQ` (0..3) to drop octaves / particle counts. No per-frame
  allocations, no layout reads in draw.
- `moments` for the rare signature events (dust gathers into a coin, POW burst, neon flicker, split-flap full refresh).
- Test in the container: `python3 -m http.server` + Playwright with `executable_path="/opt/pw-browsers/chromium"` and
  `args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]` (SwiftShader WebGL2 works). Open `index.html?nosplash`, set the
  theme with `TitanSetAtmo('<id>')`, then `TitanFX.play('<preset>', {intensity: .9})`, wait, screenshot at 390x844 and 1300x820. Look at
  every screenshot yourself. Software GL is slow, so judge looks, not fps.

## 4. Motion splashes (`js/motion-splash.js`)
- One short opening per theme (2.5-3.5 s at Full) in that theme's style; themes without a new style get a particle intro in their palette
  that forms the theme's crest (`#crest-{id}` SVG symbol in index.html), then the TITAN RELIQUARY wordmark. Ends by dissolving into the app,
  never a hard cut. Tap or any key skips.
- Opening setting (Scene Studio > Settings, stored in `localStorage titan.opening`): `mix` (default: the film on the first open of the day,
  the theme's motion splash on later opens), `film`, `motion`, `none`. Motion Off = no opening; Calm = a still frame of the theme splash for
  about a second, then a fade.
- Uses the real featured coin photo where a style draws a coin. No new network hosts, no new big assets.

## 5. Motion Lab (`motion-lab/`, never loaded by the app)
- `motion-lab/index.html` becomes the list of studies; Grok's gold-dust study moves to `motion-lab/dust.html` (unchanged code).
- Study 2 `morph.html`: the Textura Agency site from the owner's second video, rebuilt with the collection: deep blue cinematic room with
  volumetric light beams from the top left; a flowing sheet of dust (a wave surface of points) behind a grid of real coin photo cards;
  scrolling gathers the dust into a real coin (sampled from its photo), then it bursts into a sparkle cloud and re-forms as the year in huge
  numerals, then the country's outline, then an album page; finally it dissolves into violet wisps that become glowing light ribbons drawn
  across the screen. Pointer stirs the dust locally; big quiet words on the sides (ENVISION / IMAGINE / MANIFEST style, but coin words:
  STRUCK, KEPT, REMEMBERED). Still / Calm / Full; follows `localStorage titan.motion`; phone tier with fewer points.
- Studies 3-6 (fix list #56): `flip.html` coin flip with a moving rim light; `tile.html` a gallery tile growing into the coin view;
  `seal.html` the Confirm seal (AI guess -> Owner verified); `album.html` a coin settling into its album hole.

## 6. Ownership (parallel work; one owner per file)
- Integrator: index.html, app.js, sw.js, version.json, wings/themes/*, wings/fx/ui.js, wings/scene-engine.js, js/playlist.js, ambient.js,
  styles.css, styles/themes.css, styles/style-layer.css, styles/atmo/{arcade,pulp,drafting,diorama,bauhaus,terminal}.css, docs, fix list.
- Agent "styles A": wings/fx/styles-a.js; may append a clearly marked "Style (styles-20)" section to styles/atmo/{afterhours,colossus,kaleido,
  neon}.css (classic tier: the UI treatment of its style).
- Agent "styles C": wings/fx/styles-c.js; same for styles/atmo/{solaris,glacier,samadhi,nocturne,conservator}.css (e.g. glacier frosted panels).
- Agent "styles B": wings/fx/styles-b.js; may append to styles/atmo/{construct,notepad}.css (ASCII + #23; neo-brutalist Plaintext).
- Agent "styles D": wings/fx/styles-d.js only (its themes are token-only; propose token changes in the report).
- Agent "splash": js/motion-splash.js, splash.js, splash.css, and the one Settings line in wings/scene.js.
- Agents "lab" and "lab2": motion-lab/*.
Report the final preset id + intensity per theme; the integrator sets `fx` in the manifest and `wings/fx/ui.js`.
