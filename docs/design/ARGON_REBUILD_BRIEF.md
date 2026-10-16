<!-- doc-status: current; normative: yes (Gemini / Argon's design build; the hard rules of docs/design/REDESIGN_BRIEF.md still apply) -->
# Rebuild brief for Gemini (Argon), 2026-10-16

## 1. The verdict
Joseph (the owner) judged Gemini's appearance work **blind** on a phone on 2026-10-16. Each item was shown as A and B in random order, one
Gemini's and one the app's own, with the answer revealed only after the vote. Method and numbers: `notes/agents/reviews/GEMINI_BLIND_REVIEW_20261016.md`.

| what | result |
|---|---|
| 23 theme badges (crests), Gemini's vs the app's | **23 of 23: "both weak"** |
| 5 themes where Gemini's stylesheet changes what you see | **5 of 5: "both weak"** ("No reimagination. It's living in the past.") |
| The other 19 theme stylesheets | not shown: they are the app's own files with a few lines added, and look identical on screen (under 0.1 % of pixels differ) |
| Continuum v2 (your redesign proposal), scored 1-5 | Dad can find a missing year **5**, find one coin **3**, readable on the phone **3**, would open it daily **2**, feels like my collection, not a tech demo **2** |
| Which of Continuum's 12 ideas to keep | **all 12** (Dad's view, what-if prices, the 3D field, shoot-line radar, neighbour orbit, 3D flip with raking light and loupe, owner seal, atlas and timeline, album holes with want-list, camera scan, coin questions, one switcher for all worlds) |

Joseph's words to you, unedited:
> "Sunken cost bias is so clear. You did so much work and produced no value to me. Im expecting frontier level work to show off. Advanced
> motion and 3d effects and transitions. Advanced web design. Its so living in the past its unreal. Id give it a 3/10 in irs current state.
> I feel like I ask for updates ans only get fact checking. Lets get some serious state of the art tech demo Advanced implementation."

> On Continuum, what would make it a 10: "It needs so.much work. I need argon to do its job so you can not waste conpute."

**What this means.** Your ideas are right (every one was kept). The execution is not, and neither is the app's current look: "both weak"
on every pair means beating Claude's version is not the target. The target is work Joseph would show off.

## 2. What went wrong last round (do not repeat)
1. **Copies sent as new work.** 24 `atmocss_*.css` files were the app's own `styles/atmo/*.css` with 187 lines added or changed in total
   (the originals are 3,885 lines). A file that is one of ours plus edits does not count as a deliverable.
2. **Fonts the app does not ship** (Cinzel, Playfair Display, Newsreader, Inter, JetBrains Mono): the phone falls back to its own font, so
   the "new look" was mostly a font swap to a smaller system serif.
3. **One template for every badge**: almost all 23 crests are a circle frame with an emblem inside, so the worlds lose their own shape
   (Bauhaus in a circle is not Bauhaus).
4. **Frozen data and hard-coded numbers**: Continuum embedded a 636 KB copy of the data and printed 311 coins, 290, 77 (the collection has 306).
5. **Invented figures**: the dealer-buyback and pawn prices (0.96 / 0.65 / 0.85 / 0.22 of melt and premium) and a "ring" pitch in Hz for
   each coin have no source. The collection policy is HOLD; selling prices do not belong in it.
6. **Names bigger than the work** ("v2 Supreme", "Engine", "36,000 Hilbert Grains"). Say what it is.

## 3. The job: build it, don't propose it
Build **Titan v3**, a working front end on the live data, at the level of the best code-made motion and 3D work people post today. Claude
hosts it at `/prototypes/v3/gemini/` on the site, so read the data with `../../../data/...` paths. Deliver it in three milestones; each one
must stand on its own and be better than today in the first 10 seconds.

**M1: the collection and one coin (start here).**
- Opening goes straight to the collection: all 306 pieces as real objects in one 3D space (GPU-instanced; each coin uses its phone photo from
  `thumb` in `data/index.json` as its face where it has one, a metal material with environment light where it does not).
- Filters and sorts (country, era, metal, needs a photo, newest) **move** the coins to their new places. They never redraw a list.
- Tap a coin: it flies forward and **becomes** the coin view (one continuous shared-element motion), turns over to the other side under a
  raking light you can drag, with a loupe for the photo. Back: it flies home to the exact spot it came from.
- The coin view shows every fact from `data/detail/{ISO}.json` with its certainty label (Verified / Checked / Reference / Photo / AI guess /
  From ledger), the story, and the history and sources one tap away.
- A search that moves the camera to what it finds.

**M2: albums and Dad.**
- An album is a physical page with real holes. Filled holes hold the coin, missing holes are empty and lit, and printed circles (not holes)
  look different. Turning pages is a physical motion.
- "Which Silver Eagle year am I missing?" is answered **in two taps or fewer** from opening, in Dad's big-type mode, with no gesture needed.
- Cost to complete and the want-list come from `data/wants.json`.

**M3: value and worlds.**
- The headline value is live (`data/prices.json` + the board in `data/index.json`); the value-over-time chart moves when the market moves.
- One world switch changes look, light, effect and sound together as a **transition**, not a settings panel. Make **3 worlds** at showpiece
  quality, not 26 weak ones. Each world gets its own badge silhouette, drawn from scratch, that reads at 22 px.

Every other function in the table of `docs/design/REDESIGN_BRIEF.md` must have a home. Until M3, a clear link into the current app is fine.

## 4. The technical bar
- **3D**: three.js at an exact version from cdnjs or jsDelivr (e.g. `three@0.160.0`), or WebGPU with a WebGL2 fallback. Instancing for the
  coins, physically based metal, an environment map, shadows on the high tier.
- **Transitions**: the View Transitions API (same document) for screen changes, with a fallback where it is missing; FLIP-style or GPU motion
  for anything that moves between two places.
- **Scroll and gesture**: CSS scroll-driven animations where supported, `requestAnimationFrame` otherwise; drag, fling and pinch feel physical
  (springs, inertia). A coin settling into an album hole uses real physics (hand-rolled or a library at an exact version).
- **Quality tiers measured at run time** (frame time over the first seconds), so a mid-range Android phone stays above 55 fps. Effects pause
  when the tab is hidden.
- **Every motion explains something**: where a coin lives, what changed, what is missing. Decoration alone does not count.

## 5. Hard rules (any one broken = not hosted)
1. **Live data only.** Read `data/index.json`, `data/detail/{ISO}.json`, `data/search.json`, `data/wants.json`, `data/status.json`,
   `data/prices.json` at load. Embed no coin facts, counts, values or photos. Claude searches every file for coin ids and counts.
2. **No invented numbers.** Every number on screen comes from those files. No selling, pawn or dealer prices; no made-up physics of coins.
3. **Your own files.** Write new code and CSS. Copying an app file and editing it is not a deliverable (you may read ours to learn the data).
4. **Fonts**: only fonts you ship with the prototype (`.woff2` files in your zip) or the app's own `fonts/` (Fraunces). No font that is
   only named.
5. **Readable**: WCAG AA contrast for all text, 16 px minimum body text on a phone, everything reachable by tap and keyboard, nothing
   only on hover.
6. **Motion setting**: honour `prefers-reduced-motion`; offer Full, Calm (one still frame or a short fade) and Off.
7. **Speed**: first screen under 2 s on a mid phone over 4G; no main-thread block over 200 ms; 55+ fps while moving.
8. **Zero build**: plain HTML, CSS and ES modules. No npm, no bundler.
9. **Honest notes**: say what is not done and what you could not open. If your surface cannot read the data files, say so first; never
   guess their contents.

## 6. How it will be judged
- Claude opens it on a phone-sized screen with the CPU slowed 4x, checks the hard rules, measures frame rate and the longest freeze, and
  searches the files for embedded data and copied app files. A failure is sent back with the exact line.
- Joseph judges it **blind on the phone** against the current app, the same way as this round. It passes when Joseph picks it over today and
  scores it 8/10 or more. Only what Joseph picks goes into the app.

## 7. Delivery
Drive `Titan Reliquary/design-incoming (AI UI proposals)/`, one file per milestone: `design_gemini_{YYYYMMDD-HHMM}_v3-m1.zip` (or `.html`
if it is one file), plus a one-page `.md`: what it does, how to try it in 60 seconds, what is not done, known problems. Saved as real files,
not Google Docs. M1 first; nothing else from your queue comes before it.
