<!-- doc-status: current; normative: no -->
# Titan Reliquary: flagship audit and the new front (2026-11-12)

Owner, 2026-11-12: "Focus on the design and less on the details. Build it based on what it should and could be not with a bias to what
exists. I just threw some shit together and im deeply unsatisfied."

## How it was measured

`tools/audit/perf.py` (serves the repository like GitHub Pages: gzip, ETag, 10-minute cache) on a 390x844 phone profile with a
150 ms round trip, 1.6 / 0.75 Mbit/s and a 4x slower processor. Three runs: (A) first visit as shipped, (B) first visit without the
film, (C) a return visit. Screens were captured in the same browser at 390x844.

## What the old front does (build tr281)

| | First visit, with film | First visit, no film | Return visit |
|---|---|---|---|
| First paint | 3.3 s | 2.1 s | 0.5 s |
| Largest paint | 3.3 s | **7.7 s** | 2.4 s |
| Usable | **11.1 s** | | 3.2 s |
| Blocked time | 2.0 s | 1.4 s | 1.0 s |
| Layout shift | 0.007 | **0.444** | **0.510** |
| Requests / weight | 132 / 1.75 MB | 131 / 1.72 MB | 84 KB |
| Elements on the page | 10,813 | 10,810 | |

88 scripts (3.2 MB before compression, one deferred), 24 stylesheets (654 KB), `app.js` 382 KB, `styles.css` 345 KB.

What is wrong with it as a design (screens: `img/2026-11-12-before-1.jpg`, `img/2026-11-12-before-2.jpg`), worst first:

1. **Text sits on the photograph with nothing under it.** Wing titles and intro lines are unreadable on any bright room.
2. **The first thing on every screen is settings** (Search, UI, Graphics, Scene), not the collection.
3. **The Hall is a wall of boxes and ledger shorthand.** No hierarchy: the total, eight tiles, a simulator and a tool bar all shout.
4. **The Gallery opens on a one-coin carousel**, not on the coins. 356 pieces are several taps away.
5. **Study and Lab draw late or half-drawn** at phone size; text overlaps the room.
6. Six destinations in the bottom bar, two with badges; the 3D table is a wing though it is a tool.
7. Everything loads up front (three.js, the atlas, the scene engine) whether or not it is used.

## The decision

Rebuild the front from what it should be, on the parts that are good: the published data (`data/`), the coin cutouts
(`photos/cut/`), the photograph engine (`wings/plate.js`), the films. The old front stays at `index.html` until the new one covers
everything; nothing in it changed in this build.

## The new front (`next.html`, `next/app.js`, `next/next.css`)

A museum at night: the room's photograph behind smoked glass, coins lit like jewelry, one serif, gold as the only accent.
Screens: `img/2026-11-12-new-front.jpg`.

- **Hall**: the ledger's total, the metal in one line, two shelves of coins (by estimate, newest), four facts, three doors.
- **The Wall**: every specimen as its cutout, by country or year or estimate or arrival; search; continent chips. A tapped coin grows into its page.
- **A specimen**: the coin large, turn it over when both sides exist, the story and every fact from `data/detail/`.
- **The Vault**: silver and gold ounces at the recorded spot, where the value sits, bullion lots, albums.
- **Worlds**: all 50 rooms; pick one and it is the backdrop; step inside and look around (drag, pinch, tap the light).
- **Opening**: the film first, then the theme's own opening with its title on its photograph, then the collection. Once a session.

| Same profile | Old front | New front |
|---|---|---|
| First visit with film: usable | 11.1 s | **1.7 s** |
| First visit, no film: largest paint | 7.7 s | **2.2 s** |
| Blocked time (first visit, no film) | 1.4 s | **0.4 s** (one task: the shader compiling in a software renderer) |
| Layout shift | 0.44 to 0.51 | **0.000** |
| Requests / weight | 131 / 1.72 MB | **15 / 0.64 MB** |
| Elements on the page | 10,810 | **293** (Hall) |

Gate: `tools/smoke/test_next_front.py` (CL-NEXT-01, in the smoke workflow): totals match the ledger, all specimens on the Wall,
search and its empty state, a specimen's facts, the Vault's ounces, 50 rooms, one canvas, the room, the opening's order, no page errors.

## Not done yet (honest list)

- The new front has no sound, no owner questions, no Study, no Lab (shoot list, camera scan), no Scene Studio, no 3D table. Those live in the classic app, one tap from the Hall.
- Not tried on a real phone. Contrast was checked by eye on a dark, a bright and a mid room, not measured on all 50.
- Memory across theme switches and offline behaviour of the new front were not measured.

## Plan, in order

1. Owner looks at `next.html` on his phone; taste changes first.
2. Owner questions and the album shelves in the new front (the two things he uses most after the coins).
3. Sound: the room's recording and the opening's music behind one switch.
4. Study and Lab rebuilt to the new design; Scene Studio as the room's own controls.
5. Swap: the new front becomes `index.html`, the old one moves to `classic.html`, the smoke tests follow.
6. Then delete: the unused scripts and the old stylesheet, measured again.
