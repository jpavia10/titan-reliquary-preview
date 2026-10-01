# Titan Reliquary · art request queue (one queue, Grok: images + video with sound; consolidated 2026-10-01)

Claude (the integrator) writes requests into one Drive queue. Grok processes it on a schedule; the owner does nothing.

| Queue (Drive, `Titan Reliquary/`) | Who processes it | Rules doc on Drive | Output folder | Command |
|---|---|---|---|---|
| `art-requests (Grok: images + video)/` | Grok (Grok Imagine for stills, Grok Imagine Video with native audio for clips) | `ART_START_HERE (for Grok: images + video)` | `art-incoming (AI images + video)/{request id}/` | "Titan: process the art requests" |

Grok's video model makes 8 s clips at 24 fps with sound (H.264 + AAC, 1088x1920 / 1920x1088) plus `_silent` copies, so the earlier Gemini Veo queue was retired.
Every delivered file must be under 9 MB (Claude's Drive download limit is 10 MB): for video, add a `_web` copy (720p H.264 + AAC) next to any larger original.
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
