# Atmospheres (themes): contract, conventions, audit

Owner of the shared system: themes agent (branch `claude/themes`).
Per-atmosphere redesigns: one agent per atmosphere, each editing only its own two files.

## 1. How to audit

```bash
python3 -m http.server 8148 &            # from the repo root (use your own port if told to)
NODE_PATH=/opt/node22/lib/node_modules node tools/themes/audit.js \
  --themes glacier --out /tmp/audit-glacier        # one theme, all 5 wings, desktop + phone
# faster loops while iterating:
#   --wings hall,vault --vps desktop   --no-shots   --static (no browser)
#   --base http://localhost:PORT/
```

Outputs in `--out` (default `tools/themes/out/`, git-ignored): `report.md`, `report.json`,
`sheets/<theme>.jpg` (contact sheet: 5 wings x desktop + phone, token chips, fail counts),
`sheets/_overview_<vp>_<wing>.jpg` (all themes side by side), `shots/*.jpg`.
Look at the sheets with an image viewer (Read tool) before and after every change.

What it measures:
- **Token pairs** (table in section 3) from computed CSS variables.
- **Text contrast**: every visible text element in the wing + chrome; fg (with opacity chain)
  composited over the effective background (ancestor colours + gradient stops; the darkest and
  lightest candidates are kept, the worst wins). WCAG AA: 4.5:1, 3:1 for >= 24px or >= 18.66px bold.
  Elements over photos (`url()` backgrounds) are skipped. Gradient/conic backdrops can produce
  false positives (e.g. text inside the vault donut); judge with the screenshot.
- **Theme-blind colours**: failing elements whose fg or bg is identical in every atmosphere,
  mapped to the CSS rule or inline style that paints them (needs a run over >3 themes).
- **Registry**: swatch, crest, picker card, pre-paint list, `ATMOS` entry, token coverage.
- Static lists of literal colours in `styles.css` (outside theme blocks) and `app.js`.

`--block styles/themes.css,styles/atmo/,wings/themes.js,wings/atmo/` serves those files empty
(= the tree before the atmosphere work), handy for before/after on the same checkout; e.g.
`--block styles/atmo/glacier.css` shows the legacy look of one theme.

The browser runs with software compositing (no GL); under heavy CPU load the GL compositor handed
stale frames to screenshots. The audit freezes animations (reduced motion + injected CSS, `getAnimations().finish()`), blocks
off-origin requests, and restarts the browser if another process kills it.

## 2. Per-atmosphere file convention (so 20 agents never touch the same lines)

| What | File | Notes |
|---|---|---|
| Tokens, body background, wordmark, swatch, extras | `styles/atmo/<name>.css` | Loads after `styles.css` + `styles/themes.css`; same selector = wins. Stub exists. |
| Crest | `wings/atmo/<name>.js` | `TitanAtmoCrest("<name>", innerMarkup)` replaces `<symbol id="crest-<name>">`. `null` keeps the legacy crest. Stub exists. |
| Template | `styles/atmo/_template.css`, `wings/atmo/_template.js` | Copy the structure; every token documented. |

Rules for per-atmosphere agents:
1. Edit ONLY `styles/atmo/<name>.css` and `wings/atmo/<name>.js`. Do not edit `styles.css`,
   `index.html`, `app.js`, `styles/themes.css` or another theme's files. The legacy rules for your
   theme in `styles.css` stay; override them in your file with the same selector (the stub lists
   their line numbers). If a legacy rule cannot be overridden (e.g. `!important`), write it in
   your notes for the themes agent.
2. Scope every rule to `html[data-atmo="<name>"]` (the swatch `.sw-<name>` is the only exception).
3. Define every required token (section 3). Semantic tokens have defaults in `styles/themes.css`;
   override them when the audit says the default fails for your palette (`--on-gold` especially).
4. Crest: 200x200 viewBox, `currentColor` only (fill or stroke, with opacity for depth); no
   hard-coded colours (`fill="#000"` breaks on light themes), no scripts, no external refs, < 4 KB.
   It is shown as a low-opacity watermark in the hero, the exhibit, and cover flow.
5. Swatch `.sw-<name>`: a 1:1 miniature of the theme (its bg, surface, accent); it sits in a
   64px-tall rounded box in the Atmosphere sheet, with the theme's crest drawn over its right end
   in `--sw-ink` (set it inside the `.sw-<name>` rule; keep the right end dark or light enough for it).
6. Motion: transform/opacity/background-position only; add a `prefers-reduced-motion` block.
   Full-screen FX (canvases, particles, `themeFx` in `app.js`, `ambient.js`) belong to the FX agent:
   write requests in your notes instead.
7. No external assets, no `@import`, no build step, keep the console clean.
8. Run the audit for your theme before and after; target 0 token-pair fails and no text-contrast
   fails that are caused by your tokens. Report remaining fails caused by hard-coded colours.

Integrator notes: `sw.js` `SHELL_URLS` must list `styles/themes.css`, `styles/atmo/*.css`,
`wings/themes.js` and `wings/atmo/*.js` for offline use (not done on this branch: `sw.js` is frozen).

## 3. Token contract

Every atmosphere defines (`html[data-atmo="<name>"] { ... }`):

| Token | Role | Minimum |
|---|---|---|
| `--bg`, `--bg2` | page background (primary, secondary band) | |
| `--surface`, `--surface2` | cards/panels; chips/inputs/raised rows | visibly distinct from `--bg` |
| `--ink` | body text | 7:1 on `--bg`, `--surface`, `--th-bg`; 4.5:1 on `--surface2` |
| `--muted` | secondary text (often 10-12px labels) | 6:1 on `--bg`, `--surface`; 4.5:1 on `--surface2` |
| `--faint` | hints, placeholders, "missing" values (styles.css uses it as small TEXT in ~18 rules) | 4.5:1 on `--bg`, `--surface` |
| `--cardmeta` | card meta lines | 4.5:1 on `--surface` |
| `--gold` | the theme accent (historical name): accent text, fills, active states | 4.5:1 on `--bg`, `--surface` |
| `--gold-soft` | soft accent text | 4.5:1 on `--bg`, `--surface` |
| `--gold-deep` | accent borders, deep fills (decorative) | |
| `--line`, `--line-strong` | hairlines, card borders | |
| `--ok`, `--warn`, `--bad` | status text/chips | 4.5:1 on `--surface` |
| `--shadow` | legacy card shadow | |
| `--th-bg` | table header background | |
| `--tabgrad1`, `--tabgrad2` | active tab / pill gradient | |
| `--toastgrad1`, `--toastgrad2` | toast gradient | |
| `--foot-bg`, `--drawerbar-bg` | bottom nav glass; drawer header glass | |
| `--ph-bg` | image placeholder | |
| `--sel-bg`, `--row-hover` | selected row, hovered row | |
| `--hold-bg` | HOLD banner (may be a gradient) | |
| `--skeleton1`, `--skeleton2` | loading shimmer | |
| `--grain-op` | film grain opacity 0..0.1 | |

Semantic tokens (NEW, defaults in `styles/themes.css`, override per theme when needed):

| Token | Role | Default | Minimum |
|---|---|---|---|
| `--scheme` | `light` or `dark`; drives `color-scheme` (native controls, scrollbars) | `dark` (`light` for conservator, notepad) | |
| `--on-gold` | text/icons on a solid `--gold` fill | `#0b0a08` (light themes: near-white) | 4.5:1 on `--gold` |
| `--focus` | keyboard focus ring | `var(--gold-soft)` | 3:1 on `--bg`, `--surface` |
| `--elev-1` | resting card depth | soft 2-10px shadow | |
| `--elev-2` | hover / raised | 12-32px shadow | |
| `--elev-3` | sheets, drawers, popovers | 30-80px shadow | |
| `--scrim` | dim layer behind overlays | `rgba(0,0,0,.62)` | |

Optional: `--font`, `--serif`, `--mono`, `--radius`, `--ease-out`, `--wing-dur`, `--wing-rise`.

Adoption by wing code (optional, always with a fallback so nothing depends on this branch):
`color: var(--on-gold, #0b0a08)`, `box-shadow: var(--elev-2, var(--shadow))`,
`outline: 3px solid var(--focus, var(--gold))`.

## 4. Baseline and scorecard

(filled in below by the themes agent)
