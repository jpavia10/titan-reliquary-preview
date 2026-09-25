# Titan Reliquary — Drive & Pipeline Analysis
**Analyzed 2026-09-25 by Sebastian from the Drive mirror** (`Titan Reliquary Collection`).
Purpose: give the theme-refresh worker (and Grok) the full picture behind the published site,
so the redesign honors the foundation Joseph built. PRESENTATION ONLY — none of this changes.

## 1. System architecture
- **Source of truth:** `/home/box/collection` on Joseph's computer (SCAR18). Never touched by us.
- **Drive mirror:** live copy for Joseph + AI access. Text files mirror by re-upload (trash only the prior
  id of the same file); `photos/` and `_raw_capture/` are append-only.
- **Publish:** `bash /home/box/collection/gui/publish_all.sh` → parses LEDGER.md et al → builds the
  static site → orphan force-pushes the app repo + 3 photo shard repos
  (`titan-photos-na` / `-eu` / `-as`, one per continent) → writes a Drive re-sync plan.
- **The app** (`jpavia10.github.io/titan-reliquary`) is GENERATED OUTPUT. It polls `version.json`
  every 30s (10s during a live drip, toggled by `gui/drip_mode.sh`) and reloads only on change.
- **Audience note:** the Drive doc "TAP HERE – Titan Reliquary (live)" is the **live viewer for Joseph's dad**.
  Readability for a non-collector matters — the archival-paper Ledger theme may be the right default for him.

## 2. Data model (LEDGER.md v252 — the master vault, ~467 KB)
- **273 flips** in white 2×2s. `C###`/`T###` = permanent coin key (never reused/renumbered).
  `SER` = `{CONT}-{ISO}-{NNN}` display/file key (e.g. `EU-CH-006`).
- **21 bullion** (`B###`), **2 sets** (`S###`), **4 housing** (`H###` Sentry safes + chest/scale),
  **1 stamp card** (`P001`), **33 albums** (~930 coins, tracked separately from flips).
- **Board:** grand **$5,584.11** · vault **1636** pieces · next soft beat **1700** · 45 countries ·
  Ag ~63.27 oz @ $63.38 · Au ~0.1322 oz @ $4,252.90 (spots via `refresh_metals.py`, weekday 8 AM PT).
- **Moments (13):** milestone narrative (oldest flip 1883, heritage lines, soft-beat locks, newest adds).
  **Keep-an-eye flags** (A020 Sacagawea investigation, 1982 roll, cull watch C251/C262).
- **Requests from Titan** (`REQUESTS.json` + auto-generated at build): micro-tasks that would firm up
  data (e.g. R001: confirm unreadable year digit on C272). These are Grok's data-quality loop surfacing in the UI.
- **Policy: HOLD / do not sell.** Finance syncs via sister file A14 (VALUE.md). Valuation rules in VALUE.md
  (junk Ag = melt @ live spot, ASE = melt + year premium, etc.).

## 3. Two-phase digitization (DIGITIZE.md) — the photo pipeline
- **Phase 1 = the drip.** Chat photo → full SER card, `Status: Logged`. **Record only — no photo
  is ever attached** (drip photos never touch the record, not even as preview).
- **Phase 2 = the shoot.** The handwritten label is written on the flip FIRST, then both sides are
  photographed with the whole 2×2 in frame → standardized **master** → QC gate → agent approves →
  `Status: Photographed`. `Verified` = label + diameter checks done.
- **Master standard** (PHOTOS.json schema 2, keyed by coin key): 2600 px canvas, flip warped to exactly
  2400 px (47.244 px/mm), 100 px #1A1A1A margin, white balance set on the cardboard, no EXIF.
  **A photo record exists only if the handwritten label is visible** — otherwise RESHOOT.
- **QC gate:** diameter measured from the 50.8 mm flip; >5% off the card spec → REVIEW.
  Masters are never edited/deleted; a replacement is a new file, old goes to `photos/_superseded/`.
- **Flow:** phone shots → Drive `Inbox/` → `photo_pipeline.py ingest` (pairs front/back) →
  **Titan identifies the coin** → `photo_pipeline.py file` (staged masters + QC sheet) →
  agent views sheet → `approve` / `reject --reason` (RESHOOT becomes a "Requests from Titan" item with a tip) →
  `drive-ops` / `drive-done` → publish. `tools/inbox_watch.gs` pings Titan when new Inbox shots land.
- **Raws** stay private in `_raw_capture/{CONT}/{ISO}/`, never published. Derived crops (coin 1200px,
  thumb 400px, label 800px) are rebuildable from the master at any time.
- **Current state:** 0 photos published in the latest snapshot (photo shard repos exist but are empty);
  the Inbox is empty. Photo coverage will grow via this pipeline — the theme MUST handle
  "Awaiting photo" gracefully (it does) and should celebrate newly photographed coins.

## 4. Who does what (do not cross the lines)
- **Joseph:** the collection, the pipeline, the publish. Final say on everything.
- **Grok ("Titan"):** owns the collection DATA domain — drip logging, coin ID from photos, masters + QC,
  requests, metals/age refreshes. We do not touch data semantics, LEDGER, or the pipeline.
- **Sebastian (us):** PRESENTATION ONLY — theme, typography, surfacing existing metadata, ambient
  features (audio/rain). Additive only; never delete.

## 5. What the theme must respect
1. `data/index.json`, `data/detail/`, `version.json` are READ-ONLY inputs. New static assets
   (fonts, JS modules, playlist) live OUTSIDE `data/` so `publish_all.sh` can't clobber them.
2. Photo states are first-class: Logged (no photo) / Photographed / Verified. The "Awaiting photo"
   empty state is part of the design, not an error.
3. Live-update behavior (30s poll, 10s drip, auto-reload toast) must keep working in every theme.
4. The dossier is the heart of the app — every SER field, Ag melt @ live spot, measured-vs-spec
   diameter, photo roles (obv/rev/label). The placard restyle must not hide any field.
5. "Requests from Titan" and the shooting list are the app's forward motion — keep them prominent.
6. Offline PWA: self-host fonts (no CDN); hotlinked audio is the documented exception (note in CHANGELOG).
7. Mobile + PC: Joseph shoots/updates from his phone; Dad views on whatever he has.
