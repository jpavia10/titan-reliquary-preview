<!-- doc-status: current; normative: no -->
<!-- Muse's phone walkthrough (Drive design-incoming, design_muse_20261015-0316_walkthrough.md), kept with the round-2 proposals by Claude 2026-10-15. Tap counts are from a static code read of tr101, not a live phone. -->

# UI rethink, part 3 — phone walkthrough: what is clunky today

**By:** Muse (Sebastian) · **Date:** 2026-10-15 · **Build inspected:** tr101 (repo `titan-reliquary-preview`, static code inspection of `index.html`, `app.js`, `wings/*.js`, `js/*.js`)

## Method (read this first)

I cannot tap a live phone — as a background agent I have no live-browser control. This walkthrough is built from a full static read of the tr101 codebase: every tap count below traces to a real element ID, function, or view in the code (`#btn-search`, `setWing()`, `openAlbumInspector()`, `#atmo-sheet`, `wings/questions.js`, etc.), plus my standing knowledge of the app from prior sessions. Where I infer rather than verify, I say so. Claude should spot-check the tap counts against the live build; the structural findings (buried entry points, split controls, missing flows) hold regardless.

Viewport assumed: Joseph's Galaxy S24 Ultra, Chrome, one-handed.

---

## The 10 jobs, ranked worst-first by clunkiness

### 1. Show the collection to a friend — WORST: no flow exists

**Taps:** N/A — there is no designed path.
**Where it gets stuck:** Everywhere. There is no present mode, no "show off" view, no guided tour. The closest primitives are a "Copy link" button in the Gallery (per `wings/gallery.js`) and QR generation that only appears in `spatial.js` (the 3D table). Handing a friend your phone means handing them whichever wing you happen to be in, with all the chrome, sheets, and small-type controls attached.
**Why:** Showing off is one of Joseph's stated daily jobs ("showing it off"), but the app was designed as a solo research tool. A friend gets the Lab shoot list and the Questions queue alongside the coins. There is no "kiosk mode": big coins, auto-advancing, nothing tappable that breaks the spell.

### 2. "Which Silver Eagle year am I missing?" (dad's question)

**Taps:** ~6. Bottom nav → **Study** → scroll to the "Age & Albums" section → tap the Silver Eagles 1986–2021 album → album inspector modal opens → page through the slots grid → visually spot the empty hole(s).
**Where it gets stuck:** (a) Albums are not a wing — a first-time user (dad) has no reason to look inside "Study" for albums. (b) The answer is never stated as a sentence. The inspector shows holes; the human does the subtraction. (c) The album family tabs, filter pills, page/spread toggle, and flip-page controls all compete for attention before the question is answered.
**Why:** This is the single most-asked question in the household and it takes six taps plus visual scanning to answer. The data already knows the missing years (`data/wants.json` → `missing_named`); the UI just never says them out loud.

### 3. Check what's missing in an album (Joseph's version)

**Taps:** ~5–6, same path as #2, then tap **📑 Want List** (`#album-btn-wantlist`) to generate the missing-holes list.
**Where it gets stuck:** The Want List generator exists and works — but it lives at the end of the same buried path. Nothing on the Hall or in the Lab points at it. A "what's missing" job should be reachable in two taps from anywhere; today it's an expedition.
**Why:** Same root cause as #2: albums are tenants inside the Study wing instead of a first-class destination, so every album job pays the navigation tax.

### 4. Change the World and its sound (Joseph's own complaint — confirmed)

**Taps:** ~3 to change the look: scene bar → **Scene** (`#btn-atmo`) → `#atmo-sheet` opens with 26 `#atmo-card`s → scroll → tap "Set the scene →". Sound is worse.
**Where it gets stuck:** (a) 26 long cards in one scrolling sheet — picking a world means reading 26 paragraphs. (b) Sound lives in **three places**: each atmo card "pairs with" an ambience+music combo, but there is also the separate lofi player bar and the **Ambience** button (`#btn-rain`) in the Hall header. Changing the world does not make it obvious what is playing or how to change just the sound. (c) The sheet is a modal dialog (`role="dialog"`, `aria-modal`) — it takes over the whole phone.
**Why:** Joseph said it directly: "the atmosphere area is clunky." The brief lists it as known-wrong #2. The pairing concept (world+sound as one choice) is good; the execution is a 26-row settings page.

### 5. Photograph the next coin

**Taps:** ~3. Bottom nav → **Lab** → find the Phase 1 shoot list section (built from `data/reshoot.json`) → read which coin is next.
**Where it gets stuck:** The Lab wing bundles three different jobs: the shoot list ("what do I photograph next"), Phase 2 photo QC, and "Scan a coin" (camera checks). The single most action-oriented item in the whole app — *photograph THIS coin now* — shares a room with QA tooling. On the Hall there is a "lab banner," but the actual next-coin answer still requires entering the wing and scanning the list.
**Why:** The shoot list should be a glanceable, one-item-deep answer ("next up: …"), not a section inside a multi-purpose wing. When Joseph has a coin in hand, every extra tap is friction against the physical task.

### 6. What's new today

**Taps:** 0 to reach, several scrolls to find. It lives on the **Hall** (`#hall-body`: "wing entrances, lab banner, curator notes"), which is the landing wing.
**Where it gets stuck:** The Hall stacks the market ticker tape, hero, glance tiles, wing entrances, the lab banner, and curator notes in one long scroll. "What's new" has no badge, no "since your last visit" marker, no single visual anchor — it is one section among many, and its position shifts as other sections grow. There is a questions-count link ("N questions only the coin can answer") in the Hall header area, which is the closest thing to a live badge, but it only covers questions.
**Why:** A daily-check job needs a daily-check affordance: one number, one place, visible without scrolling. Today the answer is "scroll the Hall and look around."

### 7. Answer a coin question and send it

**Taps:** ~4–5. Hall footer → **Questions** (`#btn-questions`, `href="#questions"`) → tap an answer on a question → answers accumulate in `localStorage` ("titan.answers") → **Save answers file** or **Copy for chat** (`wings/questions.js` `send()`) → leave the app to get the file/text to Claude.
**Where it gets stuck:** The answering part is genuinely good (tap an answer, it waits on-device). The sending part leaves the app: save a file, then manually ferry it to Claude. "Copy for chat" is the smoother path, but it still depends on the user knowing to paste it into a chat with the right agent.
**Why:** The loop doesn't close inside the app. For a pipeline whose whole point is Joseph-answers-questions → Claude-ingests, the handoff is a manual file shuffle. (Noted: the coming "intake bridge" robot may change this — worth re-walking after it lands.)

### 8. Find a specific coin

**Taps:** ~2 + typing. Scene bar → **Search** (`#btn-search`, or Ctrl/⌘K) → palette opens (`#palette`, `js/app-palette.js`) → type → up to 8 results → tap (or Enter for the first).
**Where it gets stuck:** (a) Only 8 results — a common query ("penny", "1988") drowns. (b) Matching is literal (SER / scan / country / year / denom); no fuzzy, no "did you mean." (c) The Ctrl+K shortcut is invisible to dad; the search button itself is small and labeled only with an icon + "Search" in the slim scene bar.
**Why it's not worse:** This is one of the better flows. Result rows show the estimate (`pal-est`) right in the list, which is exactly the glanceable value answer job #9 wants. The palette is genuinely useful — it just needs more results and forgiveness.

### 9. Look up a coin's value

**Taps:** ~2–3 via search (value shown in the palette row), or ~4 via Gallery → tap coin → dossier drawer (`openDrawer()`) → find the value among the facts with its certainty label.
**Where it gets stuck:** In the dossier, the value sits inside a long fact list (story, specs, certainty labels like Verified / Checked / Reference / Photo / AI guess / From ledger, history, source links, "I checked the coin" confirm). The information is all there — it is just not hierarchized for the "what's it worth" glance.
**Why it's not worse:** The data model is right (every value carries its certainty), and the palette shortcut covers the quick case. The dossier needs visual hierarchy, not more data.

### 10. Navigate back to start from deep in the app — LEAST BAD

**Taps:** 1. The wing nav (`nav.wings`) is a **bottom** tab bar — thumb-friendly, always visible. `setWing()` defensively closes every modal, sheet, drawer, deep-zoom, and spatial table before switching, so you can never get wedged. Hash routing (`#hall`, `#gallery`…) means the back button and deep links mostly work; the coin drawer uses `replaceState` so Back isn't flooded.
**Where it gets stuck:** Minor: the coin drawer (`#drawer`) close affordance is a backdrop tap / X — fine, but there is no swipe-down-to-dismiss gesture on the drawer, which phone users expect. Wing switching also kills whatever you were doing in the previous wing (no per-wing scroll restoration evident).
**Why it's last:** This is the most solid piece of the current chrome. Keep the bottom nav and the defensive overlay cleanup in any redesign.

---

## Cross-cutting findings (for all three designers)

1. **The wings are honest navigation, but they box the data.** Five wings (Hall / Gallery / Vault / Study / Lab) + bottom tab bar works as chrome — but "albums" (a top-3 job) isn't a wing, "questions" isn't a wing, "simple view" is a hash route, and the shoot list shares the Lab with QC tools. Jobs don't map to wings 1:1, so users pay a translation tax on every task.
2. **The Hall is a scroll, not a dashboard.** Ticker + hero + tiles + banners + notes stack vertically with no persistent "start your day here" card. The three daily jobs (what's new, what to photograph, what to answer) should be one glanceable strip, not three sections.
3. **Sound has three homes.** Atmo-card pairings, the lofi player bar, the Ambience button. Unify into one audio control or make the pairing explicit and total.
4. **The dossier is complete but flat.** Every fact is present with provenance — a real achievement — but visual hierarchy doesn't distinguish "the answer" (value, date, denomination) from "the evidence" (certainty labels, sources). Dad's Simple view exists as a separate mode; the main dossier could borrow its ruthlessness.
5. **No kiosk / show-off mode.** A collection this visual wants a "hand the phone to a friend" mode: full-bleed coins, auto-advance, no chrome.
6. **Motion today is entrance-only.** Wing panes get a "rise-and-settle" on entry (skipped on phones via `cfLite()`), but nothing moves *between* states: opening a coin doesn't grow it out of its tile, switching wings doesn't carry anything across, values don't animate when spot prices update. The brief's bar — motion that *explains* — has no current examples to build on; it's greenfield.

---

## 10 reference works — link, what to borrow, why it fits a coin collection

1. **Bruno Simon's drivable portfolio** — https://boringwebsites.blog/posts/bruno-simon-the-portfolio-you-drive-a-car-around
   **Borrow:** the entire collection as one explorable 3D space; content discovered by moving through it, not by menus. Built with standard open libs (Three.js + physics + web audio), source public.
   **Why it fits:** Joseph already has a "3D Table" where a coin is an object with real light. Bruno Simon proves the next step: the *vault itself* as a navigable space — walk the aisles, coins on pedestals, albums as rooms. The bar Joseph cited ("motion and 3D made from code") is literally this site.

2. **Awwwards 2026 standards: motion as brand identity** — https://github.com/eskapeum/design-forge/blob/HEAD/references/awwwards-2026.md
   **Borrow:** the "ladder of immersion" (micro-parallax → one 3D hero → full 3D scene; climb only as high as the concept demands), named easing signatures, scroll storytelling, WebGL-as-interface-not-garnish.
   **Why it fits:** A checklist against gimmickry. Titan's redesign needs exactly this discipline: every effect must explain something (where a coin lives, how a value moved, what is missing).

3. **Awwwards 3D studio roster & techniques** — https://github.com/tacobuono/awwwards-3d/blob/HEAD/SKILL.md
   **Borrow:** Lusion's transmissive materials and color grading (coins are metal and glass — they want transmission, not flat shading); Active Theory's GLSL distortion and bloom; 14islands' signature page transitions; Resn's atmospheric particle work.
   **Why it fits:** A coin is a small metal disc under light. These studios' material work is the visual vocabulary for making 306 of them feel physical on a phone screen.

4. **257 curated Awwwards clones to study** — https://github.com/z4yt0n/awwwards-collection
   **Borrow:** working WebGL page-transition clones (shader-driven morphs between views), scroll-linked 3D product moments (the "fizzi" soda-can pattern: object reacts to scroll).
   **Why it fits:** Concrete, runnable examples of the two transitions Titan needs most: wing-to-wing morphs and the coin tile → dossier shared-element grow. Study the code, don't just watch the video.

5. **MET Museum Explorer (AI curator + magnifying lens)** — https://github.com/rbbtz/met-museum-explorer
   **Borrow:** the interactive magnifying lens for brushstroke-level inspection; the "AI curator" that narrates what you're looking at; personal exhibitions (user-curated sets).
   **Why it fits:** Titan already has deep zoom and per-fact certainty labels. The lens pattern + a narrating curator is the model for the coin dossier: inspect the coin, hear its story, save your own sets ("Dad's favorites").

6. **Rijksstudio: "Please touch"** — http://mw2013.museumsandtheweb.com/paper/rijksstudio-make-your-own-masterpiece/
   **Borrow:** the founding decision — all 125,000 works full-screen, zoom-first, *not* resized to fit; the first thing you see is an interesting detail, not the whole object; swipe through a set; information secondary to the visual encounter.
   **Why it fits:** This is the dossier done right. A coin *is* a detail — start zoomed into the portrait/date/mint mark, let the user pull back. Titan's deep zoom exists; Rijksstudio shows the interaction grammar around it.

7. **The Infinite Rijksmuseum (zoom out, infinitely)** — http://www.museumnext.com/article/inside-the-infinite-rijksmuseum-how-one-museum-is-rethinking-digital-collections/
   **Borrow:** the inverse move — start at one artwork, expand to artist → theme → cultural story, endlessly, over a unified linked-data layer.
   **Why it fits:** Titan's Study wing wants to be this: start at one coin → its type → its country → its era → the map. The "zoom out" journey is the antidote to wings-as-silos.

8. **Musea (museum-grade dark UI reference)** — https://github.com/hakangokdev/musea
   **Borrow:** restrained museum palette done well (near-black, one red, gold accents), glassmorphism used sparingly, Framer-Motion-grade page transitions, skeleton loading states.
   **Why it fits:** Closest in spirit to Titan's current aesthetic — proof that dark + gold can feel premium rather than heavy, and a catalog of micro-interactions (skeletons, transitions) Titan's lists-and-cards views lack.

9. **Giant-museum (GSAP museum template)** — https://github.com/ceodemitri/giant-museum
   **Borrow:** the practical patterns — hero gallery, artwork/artifact collection with filters and media modals, GSAP-driven reveals, Tailwind component discipline.
   **Why it fits:** Less glamorous than the Awwwards entries, more shippable. If the redesign ships in small steps (per the brief), this is the pattern library for "one better view at a time" without a rewrite.

10. **21 museum sites: MoMA's restraint, Frans Hals' timeline** — https://www.inclind.com/news/best-museum-website-designs
    **Borrow:** MoMA — bold color, huge collection photography, almost no text, one CTA; Frans Hals Museum — a year timeline down the side of the screen to browse exhibitions by era.
    **Why it fits:** Two directly transplantable ideas: (a) the Gallery as full-bleed photography with near-zero chrome (kiosk mode!), and (b) the Study view organized as a scrubbable timeline — "drag through 1900–2026 and watch the collection fill in."

---

## What I'd prototype first (if asked)

The **coin tile → dossier shared-element transition**: tap a coin in the Gallery and it grows out of its tile into the full dossier, with the value and certainty labels staggering in. One file, real data, ten seconds to feel the difference. It attacks findings #8/#9 directly and demonstrates the brief's "motion that explains" rule in miniature.

---

*Notes for Claude: tap counts are from tr101 static inspection — please verify against the live build before quoting them. The structural findings (albums buried in Study, sound in three places, no present mode, Hall-as-scroll) are code-verified and build-independent.*
