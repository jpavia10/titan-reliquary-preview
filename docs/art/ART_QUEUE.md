# Titan Reliquary · art request queue (one queue for ANY AI: images + video with sound; 2026-10-01)

Claude (the integrator) writes requests into one Drive queue. Any AI with an image or video model (Grok, Gemini/Veo, Muse...) processes it on a schedule; the owner does nothing.
Each AI first writes `{request id}.CLAIMED-{model}.txt` (a claim younger than 24 h means skip), and honours `assigned_to` (`any` or a named model).

| Queue (Drive, `Titan Reliquary/`) | Who processes it | Rules doc on Drive | Output folder | Command |
|---|---|---|---|---|
| `art-requests (any AI: images + video)/` | any image/video AI (Grok Imagine, Gemini Veo, Muse...) | `ART_START_HERE (any AI: images + video)` | `art-incoming (AI images + video)/{request id}/` | "Titan: process the art requests" |

Grok's video model makes up to 15 s clips at 24 fps with sound (H.264 + AAC, 1088x1920 / 1920x1088, no 4K); Gemini Veo also takes jobs and may offer 4K.
Deliver at FULL native quality, no size limit (owner, 2026-10-01: beyond Full HD; never let download limits constrain the art). Large files reach the repo through
`.github/workflows/art-intake.yml` (GitHub runner downloads from Drive -> branch `art-intake`, `intake/{request id}/` + MANIFEST.txt); Claude then
`git fetch origin art-intake` and makes the web renditions locally. Needs the output folder shared as "Anyone with the link: Viewer" (one-time owner step).
Art direction is the owner's: for the splash he wants maximal blockbuster/psychedelic spectacle, not restraint (`artreq_20261001-2045_splash-film-v3-maximal`).
Claude may still reassign a job to another model (for example Gemini Veo) by naming it in `assigned_to`; the folders stay the same.

## Request files
`artreq_{YYYYMMDD-HHMM}_{slug}.json` with `request_id`, `status`, `assigned_to`, `instructions`, `deliverable_spec`, `global_style`, `negative`, `coin_rule`,
`images` (each with `file_name`, `aspect_ratio`, `takes` or `type: video` + `duration_s` + `shot`) and, for video, `shots` (timed shot lists).
A request is open until a `{request id}.DONE.txt` or `.FAILED.txt` sits next to it. Repo copies: `docs/art/requests/` (older copies name the retired
split folders; their deliveries were moved into the single output folder).

## Claude's side
- New need: write `docs/art/requests/{id}.json`, commit, upload it to the queue folder. Never ask the owner to copy and paste prompts.
- "Titan: import the art": download from the output folder, review every file, compress (WebP heroes 1600x1000 <=250 KB, cards 640x400 <=60 KB; video H.264/VP9 <=4 MB for the splash), wire in (splash: set `FILM` in splash.js), record `docs/art/requests/{id}.result.md`.

## Review loop (owner rule, 2026-10-01)
Weak results (CGI look, warped coins, readable invented text, wrong framing, low resolution, morphing metal, cheap effects) are never shipped and the owner is not asked.
Claude writes a NEW request `{id}-r{n}.json` that `"supersedes"` the old one (which gets a `.DONE.txt` "SUPERSEDED: rejected, see -r{n}"), tightening the prompt around
exactly what failed while keeping what worked, possibly for a different model. Repeat until it is genuinely premium.

## Video rules (owner, 2026-10-01)
- One file per clip, WITH sound. Never request `_silent`/muted copies: the app mutes on its side.
- Every splash clip ends with **THE LANDING**: the last ~2 s rush forward into the centre into a soft bright glow (no fade to black, no cut).
  The app continues that motion: `filmExit()` in splash.js zooms the film past the viewer (scale, bloom, blur, fade) while the app rises out of it; skip uses the same exit.
- Prompts are short and time-coded (`beats`), with `look` + `the_landing` shared, clips ranked by priority so a model that runs out of credits leaves the rest for the next AI.
