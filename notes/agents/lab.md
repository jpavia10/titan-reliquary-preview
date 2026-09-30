# Conservation Lab (wing IV) - audit and plan

Agent: lab wing, branch `claude/wing-lab`, base `5ef9717` (tr50). Date 2026-09-30.

## Audit (what was there)

| Area | Finding | Severity |
|---|---|---|
| Staging card ("Pro Photo Phase 2 Staging Album") | Hard-coded "top 5" queue with **invented data**: C114 is listed at $125 (ledger: $12), C066 as "1966 1 Franc" (ledger: 1978 5 francs), C065 as "1968 1 Franc" (ledger: 2014 5 francs), metals and ASW made up. Claims "AI photo generation has been halted". Copies a Windows `G:\` path and says "Stage 1: pure coin macro (NO labels)", which contradicts the agreed protocol (labels on the flip are part of the scan). | High (wrong facts shown to the owner) |
| Photo workflow | None. No way to load a scan, check it, pair front/back, see the crop, track status, or hand anything to the Drive staging folder. The lab's stated purpose ("Phase 2") had no tool. | High |
| Shooting sessions | Country cards with a 0 % bar; fine as data but a dead end (buttons jump to the Gallery). | Medium |
| DoF calculator | Formulas correct (thin-lens DoF, N_eff = N(1+m), subject-to-image distance). But the diffraction alert fires at the default "sweet spot" (f/8 at 1:1 -> f/16 effective) and then advises "stop down to f/8" (it already is f/8, and that would be opening up). No Airy-disc vs CoC comparison; "working distance" label is really subject-to-sensor distance. Labels 0.65 rem, too small. | Medium |
| Lighting guide | Four cards, click only toggles a highlight; no diagram, no "when to use for a 2x2 flip scan" advice; mylar glare (the real problem for flips) not mentioned. | Medium |
| Die-axis sandbox | Works, but canvas colours are hard-coded (black disc even in the light Conservator theme), 9 px canvas text, "Potential collector premium error!" at 10 degrees (grading services only note rotations of ~15 degrees or more), "Standard US" wording used for every coin. | Medium |
| Phone | Everything stacks, but 0.65-0.75 rem labels and small hit targets; the staging table needs horizontal scroll. | Medium |

## Ranked improvements (impact / effort / risk)

1. Phase-2 workspace: drop/camera intake, local previews, deterministic quality checks with plain-language advice. High / high / low (new file).
2. Pairing helper: coin picker (search ser/country/year), front/back assignment, auto-pair by file name, crop overlays (2x2 square, 86 % circle, label band) with manual nudge. High / medium / low.
3. Status board (Logged / Photographed / Verified / Reshoot), progress counters, "next up" rule. High / medium / low.
4. Export: JSON manifest + ZIP of crops (2600 master, 1200 circle, 400 thumb, 800 label) via bundled fflate. High / medium / low.
5. Persist session: IndexedDB for image blobs, localStorage for small state, all in try/catch; in-memory fallback is announced. High / low / low.
6. Remove the fabricated staging card from the lab page. High / trivial / low.
7. Rebuild optics calculator (correct diffraction test, flip-scanner DPI helper, larger type), lighting guide (diagrams + flip-specific advice), die-axis tool (theme-aware canvas, honest wording). Medium / medium / low.

## Decisions

- DO: build all of the above as a module in `wings/lab.js` + `styles/lab.css`. `app.js` edits are three single-line switches inside `renderLab()` so that, when the module is loaded, it renders the lab body (workspace + bench) instead of `shootingSec()` / `renderLabProSuite()` / `initLabProSuite()`. The old functions stay as a fallback (the integrator may delete them later).
- DO: keep "Requests from Titan" and the Next IDs / Next SER tables (real ledger data).
- DO NOT: claim OCR/AI recognition. The ser on Side 2 is not read from pixels; pairing uses the file name or the owner's pick, and "Verified" is the owner's confirmation that the Side 1 label and Side 2 ser match the ledger record shown next to the crop.
- DO NOT: perspective-correct ("warp") the flip. The browser version does an axis-aligned square crop scaled to 2400 px; true 4-corner warping is left to the Drive pipeline and is stated in the manifest.
- DO NOT: write to `data/`, change the Gallery "staging" filter (gallery wing owns it), or change the Lab nav badge (it reads `phase2_done` from the ledger, not local session state).
