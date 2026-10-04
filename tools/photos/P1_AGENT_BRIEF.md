# Coin photo crop job (read fully before starting)

Goal: cut each coin out of the owner's Phase 1 phone photos as a round image for the Titan Reliquary app.
**Accuracy is the whole job.** The owner rejected an earlier crop because it clipped the coin's rim. Every
output must include the ENTIRE coin out to its outside edge, centred, upright, with only a hair of background.

Paths (P = a scratch working folder, e.g. your session scratchpad + /p1; the integrator makes jobs/batchN.json from docs/photos/raw_capture_index.json):
- Your job list: `P/jobs/batchN.json` (file, drive_id, asset, note, local).
- Raw photos go in `P/raw/` (files marked `local: true` are already there).
- Tool: `python3 /home/user/titan-reliquary-preview/tools/photos/crop_coin.py` (detect | check | cut; read its docstring).
- Check sheets: `P/check/`. Final cuts: `P/out/`. Results: append JSON lines to `P/results_batchN.jsonl`.
- Do NOT touch the git repo, Drive (other than downloading), or other batches' files.

## Per photo
1. **Download** (if not local): call `mcp__Google_Drive__download_file_content` with `fileId` = drive_id. The result is
   saved to a tool-results .txt file holding JSON `{content: base64, ...}`. Decode it:
   `python3 -c "import json,base64,sys;d=json.load(open(sys.argv[1]));open(sys.argv[2],'wb').write(base64.b64decode(d['content']))" RESULT.txt P/raw/FILE`
   (If the content ever comes back inline instead, skip that photo with status `download_failed`; do not transcribe base64.)
2. **Detect**: `crop_coin.py detect P/raw/FILE P/check` and Read `P/check/STEM.detect.jpg` (numbered red circles, coordinates in the JSON printed).
   Detection is only a hint and is often wrong (flip windows, staples, shadows score high). Find the coin yourself.
3. **Check**: `crop_coin.py check P/raw/FILE P/check CX CY R ROT` and Read `P/check/STEM.check.jpg`.
   - Left panel: red circle = R (should sit exactly ON the coin's outer edge), green = what is kept (R + 3 %).
   - Middle: zooms on the N/E/S/W edge. In EVERY zoom the green line must be fully outside the metal (on background),
     and the red line on or just outside the metal edge. If metal is outside green anywhere, R is too small or the centre is off.
   - Right: the final cut. The design must be upright (legend/portrait/date the way a catalog shows it; within ~5 degrees).
     ROT is degrees counter-clockwise.
   - Iterate CX/CY/R/ROT until all four zooms pass. Typical: 2-4 checks per photo. Photos taken at an angle show the coin's
     side wall as a crescent: include it (circle around the whole silhouette); never cut through it.
   - The 2x2 flip's plastic window ring and the cardboard are NOT the coin: don't confuse the window edge with the coin edge.
4. **Cut**: `crop_coin.py cut P/raw/FILE P/out/ID_SIDE.webp CX CY R ROT` and Read `P/out/ID_SIDE.preview.jpg` as the final check.
   Name: `ID_SIDE.webp`, e.g. `C042_obv.webp`, `T002_rev.webp`. If this coin+side already has a cut (a second photo), use
   `ID_SIDE_2.webp` and say in the result which one is better (sharper, less glare, flatter angle).
5. **Side**: start from the filename (`_obv` / `_rev`). Obverse = the side with the ruler/portrait, the state's name or national
   emblem (for euro coins the national side is the obverse, the common map/value side is the reverse). If the filename has no side
   or is clearly wrong, use what you see and note it.
6. **Identity**: the file name gives the coin id(s). Confirm against the record: Read
   `/home/user/titan-reliquary-preview/data/detail/{ISO}.json` (key = coin id; `year`, `denom`, `country`, `year_line` has the mint mark).
   If what you can read on the coin (date, denomination, country, mint mark) contradicts the record, still crop it, but set
   `status: "mismatch"` and say what you read. Never guess a date you cannot read; say "unreadable".
7. **Photos with several coins** (file names listing several ids like `C091_C092_...`, or `_x26`): crop a coin only if you can
   tie it to ONE specific id by something visible (date, mint mark, country) that differs between the listed ids' records.
   If two or more coins are indistinguishable from the photo (same visible design, the date on the hidden side), skip them with
   `status: "ambiguous"` and a reason. Never give one coin's photo to another coin.
8. **Unusable** (blurry, coin mostly hidden, heavy glare over the design, coin partly out of frame): `status: "unusable"` + reason. Do not cut.

## Result line (one per output or skip), append to P/results_batchN.jsonl
{"file": "...", "id": "C042", "side": "obv", "out": "C042_obv.webp", "cx": 0, "cy": 0, "r": 0, "rot": 0,
 "status": "ok|mismatch|ambiguous|unusable|download_failed", "best": true, "read": "what you read on the coin", "note": "..."}
(`out`/`cx`.. may be null when skipped. `best`: false only for the weaker of two cuts of the same id+side.)

## Finish
Every photo in your batch must have at least one result line. Then reply with: counts by status, every non-ok item with its reason,
and any crop you are less than sure about (file + why). Keep the reply short.
