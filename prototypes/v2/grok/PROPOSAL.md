<!-- doc-status: current; normative: no -->
<!-- Grok's written proposal (Drive design-incoming, design_grok_20261014-1913_field.md), hosted with its prototype by Claude 2026-10-15. -->

# The Field: UI rethink, part 1 (queue #116)

Author: Grok · 2026-10-14 19:13 PT · prototype: `design_grok_20261014-1913_field.html`. To run it, put it at `prototypes/v2/grok/index.html`; it reads `../../../data/index.json` and `data/detail/{ISO}.json`.

## What I saw on the live app (412×915 phone, headless Chrome, 2026-10-14)
- The first screen sets eight or more equal-weight controls against one another: the five wings plus Scenes, Themes and Sound. The Hall glance-tile row adds more: Missing Years, World Atlas & Map, Vault Intelligence, Precious Metals, Age & Albums, Storage Buckets.
- No single control is the obvious first tap. The answer to "what is this collection" is spread across 5 wings × many tabs.
- A coin always opens as a dossier without context: you cannot see where it sits among the other 305 pieces.

## Structure A: "The Field" (chosen)
One continuous space replaces the five wings. All 306 coins lie on a single table, one InstancedMesh and one draw call:
- **Rows** are countries, grouped into continent bands.
- **Across** is the year. The axis breaks before 1880, so the single 1378 piece does not stretch the table by 500 years.
- **Height** is how many coins share a country and year: they form a stack.
- **Brightness** shows whether the coin has a phone photo (`thumb`): 226 bright, 80 dim. That dimness is the shoot list made visible.

Semantic zoom goes world → continent → country row → year stack → coin → (3D/die). The core move:
1. Tap a coin, or pick it in *List & search*. Its row and year column light up, and the breadcrumbs appear in turn: *Europe › Germany › 1984 · 2 in this stack*.
2. The camera comes down to the stack, and the coin lifts out of it and turns its photographed face to you.
3. The sheet opens with photos, story, metal, every fact with its certainty label and source, and the history.
4. **Back** (button or Esc) reverses the same path. The coin goes back into its gap, so you see where it lives.

## Structure B: "Orbit" (coin-centred)
There is always one coin in the middle, surrounded by rings of its neighbours: same country, same decade, same album, same metal. Tapping a neighbour makes it the centre. The overview is the outermost ring.
- Good for wandering and for "what's related".
- Bad as a model of the whole collection: totals, gaps and "do I have X?" need a separate overview. That brings a second navigation system back, which is the thing we are trying to remove.

## Why A
- **One mental model.** Every question becomes a place on the table: a gap in a row (missing years), dim coins (to photograph), band size (where the collection is strong).
- **The transition carries information**, not just decoration. That is the brief's ask.
- **Cheap to build:** one instanced draw call, render on demand, and it reuses the current data files unchanged.
- **B is kept as a mode.** Inside a coin, "neighbours" can show B's rings later.

## Every function in the brief's table, and where it goes
| today | in The Field |
|---|---|
| Hall | The top bar: grand total ($5,366.79 from `board.grand`), count, date. The field itself is the glance. The value chart and spot terminal go in a "Value" sheet opened from the total. The trust line goes under the total. What's new pulses the newest coins once. |
| Gallery + dossier | The field is the gallery and the coin sheet is the dossier (photos, story, certainty chips, sources, history). The finder becomes filters that dim non-matching coins in place. A shareable view is a URL of filter + camera. Deep zoom and "I checked the coin" go in the sheet. |
| Vault | The metal filter lights bullion and silver; the "Value" sheet holds melt vs collector value and what-if prices. |
| Study | Already built in: rows = country, across = era, bands = continent. Atlas/timeline insights become annotations on the field. |
| Lab | The dim coins are the shoot list. A "To photograph" filter adds a Phase 1 counter, and Photo QC and Scan open from the coin sheet. |
| Albums | An album filter shows holes as empty rings in the rows. What's missing, cost to complete and the printable want list go in the album sheet. |
| 3D Table | The last zoom step: the lifted coin can be flipped and lit (the hero mesh already exists). |
| Questions | A badge on affected coins, plus a "Questions" sheet from the top bar (Send to Claude, receipt). |
| Simple view | *List & search* is a plain, big-type list of real buttons. Simple view = start with that list open, text at 20 px or larger, Motion Off, and the two buttons "Do I have…?" and "What's missing?". |
| Search | *List & search* (country, year, denomination, catalogue number); Ctrl-K opens it. |
| Scene Studio | The Motion switch (Full/Calm/Off) is on the main screen. Worlds/sound/film move to a settings sheet. |
| Health | A settings sheet: copy current, jobs, caches, speed, printable inventory. |

## Walkthroughs
- **Open → answer a question.** "How many German coins?" Tap Germany's row label and it lights up; the count appears in the crumb.
- **Find a missing Silver Eagle.** Album filter "Silver Eagles": the US row shows filled discs plus empty rings for the missing years. Tap an empty ring to get the want-list entry. No invented data: an empty ring comes from the album definition, not from a coin record.

## What is new
The coin's place is shown by motion: row, column and stack. No wings, and a single navigation idea.

## Hard rules: status in the prototype
- **Zero build**, one file. Three.js 0.160.0 from cdnjs at a pinned URL.
- **Real data only.** Fields that are missing are left out, never filled in.
- **16 px minimum text.** Tap targets are at least 44 px; every action is a real button; Esc goes back; nothing is hover-only.
- **Motion** Full / Calm (fade cut) / Off. The default comes from `prefers-reduced-motion`, and the choice is saved.
- **Pauses when the tab is hidden** (the rAF loop stops); renders on demand only.
- **Offline:** the page is static. The plan is to add it and `data/index.json` to the SW precache and keep the detail files network-first with a cache fallback. If a detail file fails, the sheet still shows the index row.

## Measurements (local main c6cd7b9 served over http, Playwright + Chrome 154, 412×915, DPR 2.625)
- **Rendering is software GL (SwiftShader) on a CPU-only box**, so these numbers are a floor and will be well below a real phone GPU.
- **Results:**

  | phase | mean fps |
  |---|---|
  | open flight | 33.5 |
  | back flight | 40.6 |
  | drag pan | 52.9 |

- **55+ fps on a real phone is NOT verified yet.** The next step is to test on Joseph's phone with `?fps`.
- **DPR 1 gave about the same numbers**, so the limit is CPU/JS rather than fill. The likely costs are the per-frame DOM label placement and the texture upload at the start of the flight.
- **Reduced motion:** with `reduce` set, open and back render no animation frames, and state, crumbs and sheet are correct.
- **Console:** no errors except a favicon 404.

## Risks / next
- **Labels:** cache the label positions, or move them to a canvas.
- **Texture:** preload the photo before the flight.
- **Gestures:** pinch is untested, because synthetic pinch does not work in headless Chrome.
- **Not built yet:** the filters (albums, metal, to-photograph). Album holes need album definitions from the data.
