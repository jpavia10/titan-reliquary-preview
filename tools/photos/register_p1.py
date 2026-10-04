#!/usr/bin/env python3
"""Turn reviewed Phase 1 coin cut-outs into site files + photo records.

  register_p1.py RESULTS_DIR [--dry]

RESULTS_DIR holds `results_*.jsonl` (one line per crop, written by the crop agents; see tools/photos/crop_coin.py)
and `out/` (the WebP cut-outs). Every line with status "ok" or "mismatch" (the coin in that flip, whose record disagrees; listed in CURATION_OPEN) and best != false becomes:
  - photos/p1/{ID}_{side}.webp in the site (served next to the app, cached by sw.js on first view)
  - a photo record via collection/_incoming/changes_script_{stamp}-photos-p1.jsonl (entity photo, op create,
    id {ID}-{side}-p1, kind crop_circle, phase 1), merged by `python3 tools/pipeline/publish.py`.
A photo id is never reused: a coin+side that already has a p1 record is skipped (cut a new id to replace it).
"""
import datetime, glob, hashlib, json, os, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "photos", "p1")

def main(src, dry=False):
    have = {p["id"] for p in json.load(open(os.path.join(ROOT, "collection", "photos.json")))}
    sd = os.path.join(ROOT, "collection", "specimens")
    specs = {k for f in os.listdir(sd) for k in (lambda d: d if isinstance(d, dict) else {x["id"]: x for x in d})(json.load(open(os.path.join(sd, f))))}
    rows = [json.loads(l) for f in sorted(glob.glob(os.path.join(src, "results_*.jsonl"))) for l in open(f) if l.strip()]
    now = datetime.datetime.now(datetime.timezone.utc); ts = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    events, skipped, seen = [], [], set()
    for r in rows:
        if r.get("status") not in ("ok", "mismatch") or r.get("best") is False or not r.get("out"): continue
        cid, side = r["id"], r["side"]; pid = f"{cid}-{side}-p1"
        if cid not in specs: skipped.append((pid, "no such specimen")); continue
        if pid in have or pid in seen: skipped.append((pid, "already registered")); continue
        seen.add(pid)
        name = f"{cid}_{side}.webp"; blob = open(os.path.join(src, "out", r["out"]), "rb").read()
        if not dry:
            os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, name), "wb").write(blob)
        events.append({"ts": ts, "by": "script:photo_crop_p1", "entity": "photo", "id": pid, "op": "create", "field": "(new record)",
                       "new": {"specimen": cid, "side": side, "phase": 1, "kind": "crop_circle", "path": f"photos/p1/{name}",
                               "sha256": hashlib.sha256(blob).hexdigest(), "width": 512, "height": 512, "captured_at": None,
                               "review": {"status": "approved", "reason": "rim-safe circle cut checked edge by edge (N/E/S/W zooms) and reviewed by Claude"}},
                       "source": f"Phase 1 chat photo {r['file']} (Drive Titan Reliquary/_raw_capture/_phase1/coins); cut cx={r['cx']} cy={r['cy']} r={r['r']} rot={r['rot']}"})
    path = os.path.join(ROOT, "collection", "_incoming", f"changes_script_{now:%Y%m%d-%H%M}-photos-p1.jsonl")
    if events and not dry:
        with open(path, "w") as f:
            for e in events: f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"{len(events)} photo records{' (dry run)' if dry else ' -> ' + os.path.relpath(path, ROOT)}; skipped {len(skipped)}")
    for s in skipped: print("  skip", *s)

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1], "--dry" in sys.argv)
