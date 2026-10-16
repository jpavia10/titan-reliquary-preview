<!-- doc-status: current; normative: yes (the spec for Titan v3 milestone M1; docs/design/ARGON_REBUILD_BRIEF.md hard rules still apply) -->
# Titan v3, milestone M1: the spec

Written by Gemini on 2026-10-16 06:10 UTC (Drive `design_gemini_20261016-0610_v3-m1.md`, made by accident while the owner was working on
another project with it). Kept by Claude as the M1 spec (owner, 2026-10-16: "If its useful keep all or part"): it was checked against the
real data and holds up (the certainty levels and the 101 facts whose label is inherited through `like` exist exactly as it says; 226 of
306 pieces have a phone photo, so its one-sided and no-photo handling matters).

**What is still owed: the build itself**, `design_gemini_{YYYYMMDD-HHMM}_v3-m1.html`, which did not reach Drive. Tracked as Gemini's first
task in `docs/agents/queues.json` (n 5); Claude checks Drive for it at every intake.

Claude's notes on the text below:
1. "pre-1880 axis break" is not needed: the earliest piece is 1883.
2. Section 5 of the rebuild brief applies in full: fonts shipped as `.woff2` (or the app's Fraunces), AA contrast, 16 px body text,
   everything reachable by tap and keyboard, no embedded coin data, no invented numbers.

---

# Titan Reliquary v3 — Milestone 1 (Spatial 3D Collection & Continuous Coin View)

**Deliverable:** `design_gemini_20261016-0610_v3-m1.html`
**Target Host Path:** `/prototypes/v3/gemini/index.html` (reads `../../../data/...` first, falls back to the live GitHub Pages site root)

---

## 1. What It Does
Milestone 1 replaces tab/wing switching and static DOM grids with a single continuous WebGL2 / Three.js (`0.160.0`) spatial stage driven 100% by the live repository data files:

1. **All Collection Pieces in One GPU-Instanced 3D Space:**
   - Opens directly into the collection with zero splash screen block.
   - Renders every piece from `data/index.json` (`flips`) in a **single `THREE.InstancedMesh` draw call** with physical thickness, reeded metallic edges, and a procedural studio PMREM environment map.
   - A non-blocking background loader decodes each coin's phone photo (`thumb` in `data/index.json`) into a dynamic GPU texture atlas so photographed coins display their actual phone photo on their 3D face in the collection space, while unphotographed pieces render as physically based brushed metal planchets (silver, gold, bronze/copper, or alloy).
2. **Spatial Sorts & Filters That Move the Coins (Never Redraw a List):**
   - **5 Spatial Layouts / Sorts:** *Country × Year Field* (continent-grouped rows, pre-1880 axis break, Z-stacks), *Era Chronology* (decadal terraces), *Metals & Value* (Gold, Silver, Bronze/Copper, and Alloy islands), *Needs a Photo* (elevates unphotographed pieces to a front shoot-line grid while photographed coins form an arc behind), and *Newest* (acquisition wave sorted by `added` date and ID).
   - **Live Filters (Country, Era, Metal, Needs Photo, Newest):** Filtering never redraws a DOM list. Matching coins physically fly forward into a focused center formation and the camera frames their bounding box, while non-matching coins recede and dim in place so collection context is always preserved.
3. **One Continuous Shared-Element Motion into the Coin View (and Back Home):**
   - Tapping any coin detaches its 3D instance at its exact `(x, y, z)` coordinates, flies it forward to the foreground inspection stage while executing a 180° turnover flip (honoring medal `↑↑` vs. coin `↑↓` die alignment from `specs`), and opens the specimen dossier.
   - **Interactive 360° Raking Light:** Drag the light ring around the coin (or use the azimuth `0°–360°` and elevation `8°–75°` controls) to sweep grazing light across a procedural Sobel relief bump map generated from the coin's photo.
   - **Interactive Optical Loupe (4× / 8×):** Drag a high-magnification optical loupe with a precision reticle across the obverse or reverse photo.
   - **Every Fact with Certainty Labels + Story + History + Sources:** Reads `data/detail/{ISO}.json` on demand, displaying the story, open questions, and every recorded fact paired with its certainty chip (*Verified*, *Checked*, *Reference*, *Photo*, *AI guess*, *Needs review*, *From ledger*, resolving `like` inheritance), plus expandable source citations and the chronological history log.
   - **Back Flies Home:** Pressing **Back** (or `Esc`) flies the 3D coin along its exact return trajectory back into the slot it came from in the collection table.
4. **Camera-Moving Search:**
   - Typing in the search bar (or pressing `/` or `Ctrl+K`) highlights matching coins in 3D and smoothly glides the camera to frame the centroid and bounding box of what it finds.
5. **Runtime Quality Tiers & Motion Control (`Full` / `Calm` / `Off`):**
   - Measures real frame times over the opening frames and steps down pixel ratio / lighting complexity if frame time exceeds `17.5 ms` (`< 57 fps`), idles the render loop (`0% CPU`) when motion settles, pauses when the tab is hidden, honors `prefers-reduced-motion`, and exposes a 1-tap `Full / Calm / Off` switch.

---

## 2. How to Try It in 60 Seconds
1. **0–15s (Pan & Sort the 3D Collection):** Drag to pan or pinch/scroll to zoom across the 3D coin field. Tap the bottom layout pills (**Era**, **Metal**, **Needs Photo**, **Newest**, **Country × Year**) and watch every coin physically fly to its new spatial coordinates.
2. **15–30s (Filter & Camera Search):** Type a country, year, or metal (e.g., `Switzerland`, `1943`, `silver`) into the top search bar—watch the 3D camera automatically glide to frame the matches. Or pick a **Country** / **Metal** filter to pull matching coins forward to center stage.
3. **30–50s (Fly a Coin Forward, Flip, Rake Light & Loupe):** Tap any coin in the 3D field. Watch it fly out of its slot and flip into the foreground inspection view. Tap **Flip 180°** (`Space`), drag the **Raking Light** angle slider or drag directly on the 3D coin to sweep grazing shadows across the relief, and tap **Loupe** (`L`) to drag the 4×/8× magnifier over the photo. Scroll down the dossier to inspect certainty chips and tap **Sources & History**.
4. **50–60s (Fly Home & Test Motion Modes):** Tap **← Back** (`Esc`) and watch the coin fly back into its exact gap in the table. Toggle **Motion: Full / Calm / Off** in the top bar.

---

## 3. What Isn't Done Yet (Milestone 2 & 3 Scope)
- **Milestone 2 (Not in M1):** Physical 33-album hole-by-hole pages with page-turn motion, physical coin-drop into album holes, and Dad's 2-tap missing Silver Eagle album view (currently linked to the main app via the **App Wings** menu; `data/wants.json` summary count is read if reachable).
- **Milestone 3 (Not in M1):** Live multi-asset historical trajectory chart terminal, what-if spot simulator, and the 3 showpiece Worlds transition switcher with custom silhouettes.
- **Direct Web Sandbox Note:** Outbound fetches from inside the Gemini chat container to GitHub are blocked by the container sandbox, so the exact schema of `data/index.json` and `data/detail/{ISO}.json` was verified directly against the repository mirror files in Google Drive (`ARGON_REBUILD_BRIEF.md`, `REDESIGN_BRIEF.md`, `index.json`, `TH.json`, `MT.json`, `NL.json`, `SA.json`, `AU.json`, `US.json`, `CH.json`). All runtime code loads `../../../data/...` first with automatic fallback to the live GitHub Pages site.

---

## 4. Known Problems & Tradeoffs
- **CORS on Standalone `file://` Open:** If opened via `file://` instead of a local HTTP server or GitHub Pages, browser CORS rules block local `../../../data/` fetches, so the loader automatically falls back to the live GitHub Pages data URLs. If an image fails CORS taint checks on a restricted proxy, the coin face gracefully falls back to its brushed metal planchet in the collection view while still rendering the photo in the DOM Loupe and Dossier.
- **Single-Face Photos:** Many Phase 1 flips currently have one side photographed (`obv` or `rev`). On the 3D Hero Coin, the photographed side renders with full photo + Sobel relief bump map, while the unphotographed side renders as a brushed metallic planchet labeled *Photo pending* rather than duplicating the opposite face.
