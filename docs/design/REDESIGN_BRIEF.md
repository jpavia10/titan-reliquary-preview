<!-- doc-status: current; normative: yes (for any AI doing UI / motion design homework) -->
# Redesign brief: Titan Reliquary, the next interface (2026-10-15)

Joseph (the owner), 2026-10-15: *"Design and UI needs to come into focus soon... since I've learned the capabilities of things like motion and
other dynamic 3D animations made from code the bar is much higher... the framework is good but the UI still sucks. The atmosphere area is
clunky. We are too fixed into the wings and it's from an early design so I think that's hindering. I'm not fixed on anything: if it can be
smoother and better in any way I'm down to add and move things around. I want to keep all functions but I think there are more novel ways of
presenting data. This is the precipice of a new reality but we are seemingly building for the past with a smart framework."*

So: **keep every function, rethink everything else.** The data, the research loop and the pipeline stay; the way a person meets the
collection is open. The current app: https://jpavia10.github.io/titan-reliquary-preview/ (try it on a phone first). Earlier layout studies
(not chosen): /prototypes/. Motion studies so far: /motion-lab/.

## Who it is for
- **Joseph** on his phone (Android, Chrome), daily: what's new, what to photograph, answering the coin questions, showing it off.
- **His dad**, sometimes, on the same app (owner, 2026-10-20: "He is 53 not a [child]. Just make my experience and he will check it and be
  like damn nice"). Design for Joseph; there is no separate simplified mode to design for. "Which Silver Eagle year am I missing?" still
  has to be easy to answer in the main app, because it is a good question, not because of who asks it.
- Both on desktop now and then. Offline must keep working.

## Every function that must survive (somewhere, in some form)
| today | what it does |
|---|---|
| Hall | headline value (live metal prices), value-over-time chart + spot terminal, glance tiles, trust line ("N % of facts cited"), what's new |
| Gallery | all 306 pieces: finder (country, era, metal, sort), shareable views, tiles with the phone photos; the coin view (dossier): photos both sides, deep zoom, story, every fact with its certainty label (Verified / Checked / Reference / Photo / AI guess / From ledger), its history and source links, "I checked the coin" confirm |
| Vault | bullion and silver/gold totals, melt vs collector value, what-if prices |
| Study | the collection by country / era / type (atlas map, timelines, insights) |
| Lab | the shoot list (what to photograph next, Phase 1 finish line), Phase 2 photo QC, Scan a coin (camera checks) |
| Albums | 33 albums hole by hole, What's missing, cost to complete, printable want list |
| 3D Table | a coin as a 3D object on a table (flip, light) |
| Questions | things only Joseph can settle, with Send to Claude and a receipt |
| Simple view | Dad's big-type mode: "Do I have...?", "What's missing?", at a glance |
| Search | one search over everything (command palette) |
| Scene Studio | 26 themes ("Worlds"), ambient sound + real music, GPU effects, Motion setting (Full / Calm / Off), the opening film |
| Health | is this copy current, background jobs, offline caches, speed report, printable inventory |

## What is wrong now (start here, then find more)
1. **Wings** (Hall / Gallery / Vault / Study / Lab tabs) are an early museum metaphor that boxes the data in; moving between them feels like
   changing apps.
2. **The atmosphere area (Scene Studio) is clunky**: themes, sound, effects and settings are a long panel of controls.
3. **Data is shown as lists and cards** where it could be spatial, physical and alive (coins are objects; albums are pages; value moves with
   the market; the collection is a world map and a timeline).
4. Motion is decoration on top, not the way you move through the data.

## The bar
Code-made motion and 3D at the level of the best work people post (scroll-driven GPU particles, morphing between views, objects with real
light, shared-element transitions, physics). Every motion must *explain* something (where a coin lives, how a value changed, what is
missing), never only decorate. Smooth on a mid-range phone.

## Hard rules (a proposal that breaks one is rejected)
- **Zero build**: plain HTML, CSS and ES modules; Three.js (or another library) only from cdnjs.cloudflare.com / cdn.jsdelivr.net with an
  exact version. No npm, no bundler, no framework build step.
- **Real data only**: read `data/index.json` (the boot index: every flip, board totals), `data/detail/{ISO}.json` (one per country),
  `data/search.json`, `data/wants.json`, `data/status.json`, `data/prices.json` with relative paths, as the app does. Never invent a coin,
  a value or a count; never hard-code coin facts.
- **Readable**: WCAG AA contrast for all text, 16 px minimum body text on a phone, every action reachable by tap and by keyboard, nothing
  only on hover. (The old Simple view stays as a function, but it is not a design target; the main app is.)
- **Motion setting**: honour `prefers-reduced-motion` and offer Calm (one still frame or a short fade) and Off.
- **Speed**: first screen under 2 s on a mid phone over 4G, no main-thread block over 200 ms, 55+ fps while scrolling. Effects pause when
  the tab is hidden.
- **Offline**: the app is a PWA; a prototype need not be, but say how your idea works offline.
- **No text inside generated images**; no brand marks on coins.

## What to deliver
Each AI's part is on its WORK QUEUE page. Every deliverable goes to Drive `Titan Reliquary/design-incoming (AI UI proposals)/`, named
`design_{ai}_{YYYYMMDD-HHMM}_{short-name}.{md|html|zip}`:

1. **A written proposal** (`.md`, 1-3 pages): the idea in one sentence; how a person moves through it (from opening the app to answering a
   question to finding a missing Silver Eagle); where every function from the table above lives; what is novel about how the data is shown;
   what it costs (effort, risks, speed on a phone); 3-6 sketches or screenshots if you can make them.
2. **A working prototype** (`.html`, one file, or a `.zip` of a few files) of the one idea that matters most, built on the real data.
   Put it where it will live: Claude hosts it at `/prototypes/v2/{ai}/` on the site, so read data with `../../../data/index.json` style paths.
   Show, in the first 10 seconds, why it is better than today.

Claude opens every prototype on a phone-sized screen, checks the hard rules, hosts the good ones side by side at `/prototypes/v2/`, and
Joseph picks what goes into the app. Only picked pieces are built into the app, in small steps, each behind the Motion setting.
