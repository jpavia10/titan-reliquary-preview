# Titan Reliquary · image request queue (for any image AI: Gemini, SuperGrok, ChatGPT, …)

Claude (the integrator) writes image requests into a Drive folder. A scheduled image AI checks the folder, makes the images
and saves them where Claude collects them. The owner does nothing.

## Folders (Google Drive, `Titan Reliquary/`)
| Folder | Who writes | What |
|---|---|---|
| `art-requests (AI image jobs)/` | Claude | one request file per job: `artreq_{YYYYMMDD-HHMM}_{slug}.json` |
| `art-requests (AI image jobs)/` | image AI | a marker per finished job: `artreq_..._{slug}.DONE.txt` (or `.FAILED.txt`) |
| `art-incoming (AI images)/` | image AI | the images, in a subfolder named after the request id |

## If you are the image AI ("Titan: process the art requests")
1. Open `Titan Reliquary/art-requests (AI image jobs)/`. A request is **open** when its `.json` file has no matching `.DONE.txt` or `.FAILED.txt` file next to it. Skip anything that is not open.
2. For each open request, oldest first, read the JSON. Entries with `"type": "video"` are video clips (use your video model, e.g. Veo or Imagine; MP4, ≥1080p, the given `duration_s`); everything else is a still image. Apply its `global_style`, `negative` and `coin_rule` to every image, and make each entry in `images` at the given `aspect_ratio`, as photorealistic and high quality as you can. Never add text, logos, watermarks or borders.
3. Save each image to `Titan Reliquary/art-incoming (AI images)/{request id}/` using its exact `file_name` (PNG or JPG, the largest size you can make). Create the subfolder if it is missing.
4. When the request is complete, create `{request id}.DONE.txt` in `art-requests (AI image jobs)/`. Write one line per image: `file_name | ok` or `file_name | skipped: reason`, then a last line with your model name and the date. If you could make none of them, create `{request id}.FAILED.txt` with the reason instead.
5. Never edit or delete a request file, and never touch any other Titan Reliquary folder.
If you cannot write to Drive, stop and say so; do not paste images into chat instead.

## If you are Claude (integrator)
- New image need: write `docs/art/requests/{request id}.json` (template: `docs/art/IMAGE_PROMPTS.json`, plus `"request_id"`, `"status": "open"`, `"requested_by"`, `"created"`), commit it, and upload the same file to the Drive requests folder. Do NOT ask the owner to copy and paste prompts.
- On "Titan: import the art" (or when a `.DONE.txt` appears): download from `art-incoming (AI images)/{request id}/`, review every image (reject anything plasticky, with text or with warped coins), compress to WebP (hero 1600x1000 ≤250 KB, card 640x400 ≤60 KB, icons per spec), wire them in, and record the result in `docs/art/requests/{request id}.result.md`.

## Review loop (owner rule, 2026-10-01)
If the delivered images or clips are weak (CGI look, warped coins, readable invented text, wrong framing, low resolution, morphing metal, cheap effects),
Claude does NOT ship them and does NOT ask the owner. It writes a NEW request (`artreq_{YYYYMMDD-HHMM}_{slug}-r{n}.json`, `"supersedes"` the previous one,
which gets a `.DONE.txt` marked "SUPERSEDED: rejected, see -r{n}"). The new request tightens the prompt around exactly what failed (quote the defect and the fix),
keeps what worked, and may ask a different model. Record the verdict per file in `docs/art/requests/{request id}.result.md`. Repeat until it is genuinely premium.
