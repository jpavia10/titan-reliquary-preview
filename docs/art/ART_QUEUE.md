# Titan Reliquary · art request queues (split 2026-10-01: Grok = stills, Gemini Veo = video)

Claude (the integrator) writes requests into two Drive queues. A scheduled AI processes each queue; the owner does nothing.

| Queue (Drive, `Titan Reliquary/`) | Who processes it | Rules doc on Drive | Output folder | Command |
|---|---|---|---|---|
| `art-requests-images (Grok)/` | Grok (or any image AI) - **still images only** | `IMAGE_START_HERE (for Grok)` | `art-incoming (AI images)/{request id}/` | "Titan: process the image requests" |
| `art-requests-video (Gemini Veo)/` | Gemini with Veo - **video only, with native audio** | `VIDEO_START_HERE (for Gemini Veo)` | `art-incoming-video (Gemini Veo clips)/{request id}/` | "Titan: process the video requests" |

Grok never takes video jobs (its video/audio is weaker than Veo's); Gemini never takes the image queue unless Claude reassigns a job by copying it there.

## Request files
`artreq_{YYYYMMDD-HHMM}_{slug}.json` with `request_id`, `status`, `assigned_to`, `instructions`, `deliverable_spec`, `global_style`, `negative`, `coin_rule`,
`images` (each with `file_name`, `aspect_ratio`, `takes` or `type: video` + `duration_s` + `shot`) and, for video, `shots` (timed shot lists).
A request is open until a `{request id}.DONE.txt` or `.FAILED.txt` sits next to it. Repo copies: `docs/art/requests/`.

## Claude's side
- New need: write `docs/art/requests/{id}.json`, commit, upload it to the right queue folder. Never ask the owner to copy and paste prompts.
- "Titan: import the art": download from the output folder, review every file, compress (WebP heroes 1600x1000 <=250 KB, cards 640x400 <=60 KB; video H.264/VP9 <=4 MB for the splash), wire in (splash: set `FILM` in splash.js), record `docs/art/requests/{id}.result.md`.

## Review loop (owner rule, 2026-10-01)
Weak results (CGI look, warped coins, readable invented text, wrong framing, low resolution, morphing metal, cheap effects) are never shipped and the owner is not asked.
Claude writes a NEW request `{id}-r{n}.json` that `"supersedes"` the old one (which gets a `.DONE.txt` "SUPERSEDED: rejected, see -r{n}"), tightening the prompt around
exactly what failed while keeping what worked, possibly for a different model. Repeat until it is genuinely premium.
