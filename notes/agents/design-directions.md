# Hall design directions (2026-10-01)

Owner feedback: the app feels like "2005 MySpace", not a billion-dollar corporate site; he also said the old navy/gold identity, the splash and the app icon are not sacred. Three finished prototypes of the Hall live in `prototypes/` (chooser: `prototypes/index.html`). All three use the real ledger numbers (snapshot inlined, refreshed from `../../data/index.json` when reachable), body text 16px or larger, no invented prices, grades or history, and none reuses the old palette or crest. The live app is untouched.

Shared content in every direction: top bar (Search + Scene), hero value $5,393.70, metals (63.27 oz Ag, 0.1322 oz Au, melt values), quick tiles (1,636 pieces / 273 flips / 45 countries / 33 albums), "What's missing" (A026 Silver Eagles 1986-2021, 18 of 36 years, computed from `collection/albums.json` / ALBUMS_AUDIT.md), photo progress 0 of 273, wing entrances (Gallery, Vault, Study, Lab, 3D Table).

Measured scroll (Pixel 7 viewport, 4x CPU throttle, software GL in a shared box): D1 60 fps, D2 58 fps, D3 60 fps. The D2 coin is re-lit only when scrolling settles; while moving it is a compositor-only transform.

## 1. Private Bank (`prototypes/design-1-private-bank/`)
Quiet luxury: ink hero with one huge Cormorant Garamond number, ivory pages, Hanken Grotesk for text, hairline rules, a single gold accent used for labels and thin bars. Holdings are an elegant ruled list with share bars; Silver Eagle years are a 6x6 year grid (filled = solid, missing = dashed gold). Light and dark both supported. No glow, little motion (fade-up only).
Roll-out cost: low-medium. It is typography and tokens, not effects. One token file (ink, ivory, gold, two fonts) plus a ruled-list, stat and year-grid component set covers every wing; Gallery becomes a quiet contact sheet. The 20 atmospheres collapse to two (ivory, ink).
Risks: least "wow" on first open; serif display numerals need care at small sizes (use the serif only at 28px and up).

## 2. Product Page (`prototypes/design-2-product/`)
Cinematic launch page: full-bleed black hero with a WebGL-lit silver coin (height map plus procedural studio reflections, pointer/tilt/scroll responsive), giant gradient value, then numbered sections with sticky headers and scroll reveals: Value (stacked bar), Metals (one circle per troy ounce, gold shown to scale), Countries (dot-matrix world map with bubbles sized by count), Albums (18 in amber, a 36-bar timeline), Photography (progress ring plus the three phases), and a snap-scroll card rail for the wings. Slot `prototypes/design-2-product/art/hero.webp` takes the Blender render: when present it replaces the generated coin automatically (the 404 in the console until then is expected).
Roll-out cost: highest. Each wing needs its own story layout, hero art per wing, and a shared reveal/sticky system; the map and coin shader are reusable. Needs real art (the Blender renders) to reach full quality, and phone GPU budget for a second WebGL context beside the 3D Table.
Risks: scroll-story pages suit a one-time tour better than a daily tool; Dad may find the long scroll tiring.

## 3. Modern Fintech (`prototypes/design-3-fintech/`)
Bento dashboard in the Stripe/Linear mould: dark by default with layered surfaces (hairline borders, soft inner highlight, pointer spotlight), light mode toggle, Inter, muted indigo accent. Charts are hand-drawn SVG: stacked bar and interactive donut for value, silver ounce composition, countries/continents bars with a segmented control, album year grid. Search opens a command palette (press `/`). Spot deltas compare only the two ledger snapshots on file; there is no sparkline because the ledger has no price history, and the page says so.
Roll-out cost: medium. Card, chart and segmented-control components are small and reuse across wings; Gallery becomes a filterable table/grid, Vault a metals dashboard. The most familiar pattern to build and to maintain.
Risks: can look generic if the card system is not kept disciplined; density is the highest of the three.

## Recommendation
Build **Direction 1, Private Bank, as the base**, and borrow two things from the others: the ounce-by-ounce metals visual and dot map from Direction 2 (as one Vault and one Study feature, not a whole style), and the card/chart components plus the search palette from Direction 3 for the data-heavy wings (Gallery filters, Study). Reasons: the collection is held, not traded, so calm authority fits the content; it is the most readable for Dad (large numerals, high contrast, almost no motion); it is the cheapest to roll out and to keep consistent across seven wings; and it replaces the 20-atmosphere maintenance burden with two modes. Direction 2 is the best first impression and the best use of the Blender art, so keep it as the splash/intro and the "tour" page. If the owner prefers pure wow, pick 2; if he prefers a tool that feels like a banking app, pick 3.

## App icon concepts (512x512 PNG, content kept inside the central 60% for Android adaptive masks)
Checked at 48 px in the prototypes folder: each stays legible.
1. Private Bank: ink square, ivory Didone-style capital T inside a thin gold ring. Quiet, one glyph.
2. Product Page: pure black with a single lit silver coin and a warm under-glow. No letter; it reads as "a coin" at any size.
3. Modern Fintech: indigo gradient tile with a white donut ring that has one gap; echoes the value chart.

## Splash concepts
1. Private Bank: a black screen, the ivory serif T draws itself with a gold hairline ring sweeping once around it (1.2 s), then the ring becomes the top rule of the Hall and the value fades up in the serif. No sound, no loop; skippable with any tap.
2. Product Page: black, one silver coin rises into a single soft key light while the value counts up to $5,393.70, then the coin settles at the top of the hero and the page scrolls in behind it. Reuses the hero WebGL coin (or the Blender render), so splash and hero are one continuous shot. Optional soft click, off by default.
3. Modern Fintech: dark surface, the donut icon draws its ring (0.8 s) and the six holdings segments grow outward into the dashboard's value donut, then the cards fade in with a short stagger. Under a second, never replays in the same session.
