# Theme contract and UI shells (Grok, 2026-10-20)

## Three separate things
- **Shell (UI)**: a whole way of moving through the collection. Today: **Classic** (the wings, the default) and **The Field**.
  Chosen with the **UI** button (scene bar in Classic, header in The Field). The choice persists (`localStorage["tr.shell"]`); `?ui=<id>` overrides for one visit.
- **Theme**: a world's look, sound and feel (the 30+ atmospheres).
- **Theme x shell design**: a hand-made combination. A theme provides a separate, independent implementation per shell. There is no adapter that reskins one shell from another.

## The contract (the only things every shell must do)
1. Any coin is reachable within a couple of steps.
2. The coin's sourced facts and their provenance (who, when, the source) are viewable.
3. There is always a way back, and home (the UI switch returns to Classic).
4. There is a mute control.
5. Search is available.

Each point has a test. For The Field it's `tools/smoke/test_regress_grk_sh01.py`. For theme worlds inside Classic it's `test_regress_grk_s01.py`.

## Shared services (all a shell may use from the app)
`TitanShell.svc`: `lite()`, `isMuted()`, `setMuted()`, `openCoin(scan)` (the full coin page with the photo-relief 3D coin, above any shell), `search()`, `coverOpen()`, `chooseUI()`.
Plus the shared globals `TitanRelief.derive()` (photo-derived relief), `TitanLofi`/`TitanGen` (audio), and the published `data/` files (read only).
A shell must not reach into Classic's wings, grid or DOM.

## Files
```
shells/shell.js                 registry, setting, toggle, mounting, svc
shells/<shell>/<shell>.js        ES module: export async function mount(root, svc) -> { unmount() }
shells/<shell>/<shell>.css       the shell's neutral house look, scoped to #shell-<shell>
themes/manifest.json             { "<shell>": ["<theme>", ...] }  which theme x shell designs exist
themes/<theme>/<shell>/theme.css a hand-made design for that combination (loaded only if listed)
```
If a theme has no design for the current shell, the shell keeps its neutral look (`<html data-shell-theme="neutral">`). It is never reskinned automatically.

## Adding or removing a shell
- **Add**: put the folder under `shells/`, add one entry to `SHELLS` in `shells/shell.js`, add its files to the `sw.js` precache, add a contract test, and add a row to `UI_REGISTRY.md`. It ships as its own commit.
- **Remove**: revert that commit, or delete the folder, its `SHELLS` entry and its precache lines. Anyone who had chosen it falls back to Classic.

## Theme names
The display name is the human label. The id never changes, because saved choices, CSS and files all use it. Anywhere people read it (logs, reports, commits, progress docs, test output), write **Display Name (id)**, e.g. *Gilded Armory (valhalla)*. In code, call `TitanWorldLabel(id)`.
Ids that read like a different name are listed in `TITAN_WORLD_ALIASES` (wings/themes/manifest.js). `tools/themes/test_names.js` fails if a new one is left out.
Today's aliases: Prism (kaleido), Midnight Gallery (afterhours), The Mint (colossus), Shipwreck (abyss), Plaintext (notepad), Solar Observatory (solaris), Hyperborean Vault (glacier), Gilded Armory (valhalla), Survey Map (contour), Treasury Note (banknote), Paper Hills (papercut), Millennium Chrome (y2k).
