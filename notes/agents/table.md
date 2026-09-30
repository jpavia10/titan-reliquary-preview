# Wing: 3D Table (integration review)

Branch: worktree-agent-a4337f9e1fbcef9ba, base tr53 (861d061).

## Findings
The rescued rewrite (`origin/claude/rescue-wing-table-1b943576ffe0b03f`, based on 5ef9717) is complete and far better than the live table. Its own audit lists 9 bugs in the old table: undefined `shadowPlane`, leaked textures, no dispose on exit, dock covered by the app nav, no WebGL guard, global key handlers, r128 material warnings, wrong colour pipeline, bad USDZ scale. The rewrite fixes all of them.

Verified on the rewrite (Chromium, SwiftShader):
- Zero pageerror and zero warnings (only blocked-external-font network errors).
- Open and close 5 times via `launchSpatialTable`: canvas count 0 -> 1 -> 0 each time (renderer disposed, `forceContextLoss` called).
- Entry points: Hall "3D Table" button, dock "3D TABLE" tab, `launchSpatialTable`, `TitanSpatial.open('C010')` all open. `#header-btn-spatial` does not exist in index.html (app.js binds it with `?.`, harmless).
- Render on demand: 0 renders while idle, 0 while the tab is hidden.
- Esc closes; Tab stays trapped in the modal (30 presses); focus returns to the opener; keys E/R/L/V/Space/arrows work and are shielded from the app underneath.
- Phone 390x844: no horizontal page scroll, dock not covered by the app nav (`body.trt-open .wings` hidden), title plate and Exit readable.
- Reduced motion: orbit damping off, tweens shortened (honoured in code).

## Decisions
- Kept the rescue. Live tr53 `spatial.js` only had a few label fixes, all covered by the rewrite (its labels use only record fields: "LEDGER #", status, Est., oz from `asw_oz`/`agw_oz`).
- Changes on top of the rescue: devicePixelRatio cap lowered from 1.75/2 to 1.5 (adaptive quality can still drop it to 0.85/1); permanent line "A drawing from the record, not a photo" in the title plate; focus restore retried after 60 ms if the first attempt lost to the layout change.
- Loaded `styles/table.css?v=tr53` via the `<!--WS:table-->` hook only. No `app.js`, `sw.js`, `data/` edits.

## For the integrator
- Add `styles/table.css` to the `sw.js` precache list (spatial.js is already there).
- The static HUD markup inside `#spatial-museum-modal` in index.html is replaced at runtime by `buildHUD`; it can be deleted later (not touched here).
- On a 390px phone the dock is wider than the screen and scrolls sideways inside its pill; worth a look for small phones.
- Software GL build takes about 3.5 s; the veil "Setting the table" shows meanwhile.

## Status
Done and committed. Not pushed.
