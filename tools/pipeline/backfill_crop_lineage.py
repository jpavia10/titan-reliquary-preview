#!/usr/bin/env python3
"""One-off: give every existing Phase 1 photo record its `crop` settings, from docs/photos/p1_crops.jsonl.

usage (repo root):  python3 tools/pipeline/backfill_crop_lineage.py [--dry]
Writes collection/_incoming/changes_script_{stamp}-crop-lineage.jsonl, one `op: set` on field `crop` per photo; `python3 tools/pipeline/publish.py`
merges it. Rows are matched to photo records by the cut-out file name (`out` == the file name of the record's path), so a coin with several candidate
rows (look-alike coins in one photo) can only match the row whose cut was actually published. Nothing is invented: the cut time and the source photo's
hash were not recorded, so `ts` and `source_sha256` stay null; the tool version is "1" (crop_coin.py as it was for the whole Phase 1 run).
Records with no row (the two rectangular prop-note crops T005/T006 were cut by hand) are listed and left without `crop`.
"""
import datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "photos"))
import crop_coin


def build(root=ROOT, ts=None):
    rows = [json.loads(l) for l in open(os.path.join(root, "docs", "photos", "p1_crops.jsonl"), encoding="utf-8") if l.strip()]
    photos = json.load(open(os.path.join(root, "collection", "photos.json"), encoding="utf-8"))
    by_out = {r["out"]: r for r in rows if r.get("out")}
    events, unmatched = [], []
    for p in photos:
        if p.get("phase") != 1 or p.get("crop"): continue
        r = by_out.get(os.path.basename(p["path"]))
        if r is None or any(r.get(k) is None for k in ("cx", "cy", "r")) or (r.get("id"), r.get("side")) != (p["specimen"], p["side"]):
            unmatched.append(p["id"]); continue
        crop = crop_coin.crop_record("circle", r["file"], r["cx"], r["cy"], r["r"], r.get("rot") or 0, p.get("width"))
        events.append({"ts": ts, "by": "script:backfill_crop_lineage", "entity": "photo", "id": p["id"], "op": "set", "field": "crop", "new": crop,
                       "source": f"docs/photos/p1_crops.jsonl row for {r['file']} (the Phase 1 cut settings recorded when {os.path.basename(p['path'])} was made)",
                       "provenance": {"workflow": "phase1-crop-backfill", "prompt_version": "P1_AGENT_BRIEF", "inputs": [{"file": r["file"]}]}})
    return events, unmatched


def main(argv):
    now = datetime.datetime.now(datetime.timezone.utc); ts = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    events, unmatched = build(ROOT, ts)
    path = os.path.join(ROOT, "collection", "_incoming", f"changes_script_{now:%Y%m%d-%H%M}-crop-lineage.jsonl")
    if events and "--dry" not in argv:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            for e in events: f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"{len(events)} photo records get crop settings{' (dry run)' if '--dry' in argv else ' -> ' + os.path.relpath(path, ROOT)}; no row for {len(unmatched)}: {', '.join(unmatched)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
