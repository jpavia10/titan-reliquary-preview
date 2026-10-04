# Phase 2 pro-scan crop job (read fully before starting)

Goal: turn the owner's pro scans of each 2x2 flip into two site images per side: a **round cut-out** (1200 px) and the
**square 2x2 flip crop** (1600 px). **Accuracy is the whole job.** Never clip the coin's rim, never give one coin's scan to
another coin, never guess an id. Background: `docs/PHASE2_INTAKE.md`; the Phase 1 job (`P1_AGENT_BRIEF.md` in git history) is the model.

Paths (P = a scratch working folder, e.g. your session scratchpad + /p2; the integrator makes `P/jobs/batchN.json` from a Drive listing of STAGING: file, drive_id, size):
- Raw scans: `P/raw/`. Check sheets: `P/check/`. Final cuts: `P/out/`. Results: append JSON lines to `P/results_batchN.jsonl`.
- Tool: `python3 tools/photos/crop_coin.py` (detect | check | cut | cut2x2; read its docstring).
- Do NOT touch the git repo, Drive (other than downloading), or other batches' files. The integrator registers your results.

## Per scan
1. **Download** (if not local): `mcp__Google_Drive__download_file_content` with `fileId` = drive_id. The result is saved to a
   tool-results .txt file holding JSON `{content: base64, ...}`. Decode it:
   `python3 -c "import json,base64,sys;d=json.load(open(sys.argv[1]));open(sys.argv[2],'wb').write(base64.b64decode(d['content']))" RESULT.txt P/raw/FILE`
   - If the content comes back inline instead of in a file, skip the scan with `status: "download_failed"`; never transcribe base64.
   - **Files over about 7 MB fail through the Drive connector.** Mark `download_failed`, note "over 7 MB", and tell the integrator
     so the owner can drop a smaller copy (same name plus `_small`, JPEG quality ~85, long edge 4000 px is plenty). Never wait on it.
2. **Read the id.** The owner writes the coin's id (`C###`, also `T###` for a token) on the flip. Read it from the photo at
   full zoom. A file name may also carry it (`C042_front.jpg`, `C042 back.jpg`, `C042_obv.jpg`); accept it from there too.
   - Photo and file name agree: fine. Only one gives an id: use it. Neither: `status: "ambiguous"`, note "no id", do not cut.
   - The two disagree, or you cannot read the writing: do not pick one, `status: "ambiguous"` and say what each says.
   - **Never guess an id** from the coin's look, the file order or neighbouring scans.
3. **Confirm against the record.** Read `data/detail/{ISO}.json` (key = id; `year`, `denom`, `country`, `year_line` has the mint mark).
   If the coin you see (date, denomination, country, mint mark) contradicts the record of the id written on the flip,
   set `status: "mismatch"` and say what you read. A mismatch is NOT registered, the owner decides which is wrong. Never guess a date you cannot read: write "unreadable".
4. **Side.** Front vs back from the design, not the file name: obverse = ruler / portrait / state name / national emblem
   (euro coins: the national side is the obverse, the common map/value side the reverse). If the owner's file name says
   front/back and the design disagrees, use the design and note it. A scan of the handwritten flip label alone is `side: "label"` (2x2 only, no circle).
5. **Detect, then check the circle.** `crop_coin.py detect P/raw/FILE P/check`, Read `STEM.detect.jpg` (a hint only; flip windows,
   staples and shadows score high). Then `crop_coin.py check P/raw/FILE P/check CX CY R ROT` and Read `STEM.check.jpg`:
   - Red = R (must sit ON the coin's outer edge), green = what is kept (R + 3 %). In **each of the four N/E/S/W zooms** the green line is fully outside the metal
     and the red on or just outside it. Iterate CX/CY/R/ROT until all four pass. Photos at an angle show the side wall as a crescent: include it.
   - The plastic window ring and the cardboard are not the coin. ROT = degrees counter-clockwise; the design upright within ~5 degrees.
6. **Cut both.**
   - Circle: `crop_coin.py cut P/raw/FILE P/out/ID_SIDE.webp CX CY R ROT --size 1200`; Read `ID_SIDE.preview.jpg`.
   - 2x2: `crop_coin.py cut2x2 P/raw/FILE P/out/ID_SIDE_2x2.webp CX CY R ROT --id ID` and **Read `ID_SIDE_2x2.2x2check.jpg`**.
     Green square must sit on the cardboard edges with all four corners inside the photo; the whole flip, coin centred, no neighbour's flip inside it.
     It prints JSON: `method` (detected | diameter | explicit), `warn`, `off_photo_px`. If `warn` is set or the green square is wrong, fix it:
     `--box BX BY SIDE` (centre and side in photo pixels, read from the check image) or `--diameter-mm D`. If the flip is cut off by the photo edge, the
     2x2 is `unusable` (still cut the circle if the coin is whole, and say so).
   - Keep the full scan as-is for the integrator: say in the result line if it is a clean scan worth keeping as a master (`out_master` = the file name you copied to `P/out/`; leave it out otherwise).
7. **Two takes of one coin+side**: name the second `ID_SIDE_t2.webp` / `ID_SIDE_t2_2x2.webp`, set `"take": 2` and say which is better (`best`: false on the weaker). Do not overwrite.
8. **Unusable** (blurry, glare over the design, coin mostly hidden): `status: "unusable"` + reason; do not cut.

## Result line (one per scan), append to P/results_batchN.jsonl
{"file": "scan name", "id": "C042", "side": "obv", "out": "C042_obv.webp", "out2x2": "C042_obv_2x2.webp", "out_master": null,
 "cx": 0, "cy": 0, "r": 0, "rot": 0, "status": "ok|mismatch|ambiguous|unusable|download_failed", "best": true,
 "read": "id as written + what you read on the coin (date, denomination, mint mark, 'unreadable' where so)", "note": "..."}
(`out`/`cx`.. may be null when skipped. Every id+side that is `ok` needs both `out` and `out2x2`, except a `label` side: `out2x2` only.)

## Finish
Every scan in your batch has a result line. Reply short: counts by status, every non-ok item with its reason (the owner needs the
mismatch / ambiguous / over-7-MB list to fix them), and any crop you are less than sure about (file + why).
