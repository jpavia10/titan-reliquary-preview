#!/usr/bin/env python3
"""Turn reviewed coin crops into site files + photo records (Phase 1 phone cut-outs or Phase 2 pro scans).

  register_photos.py RESULTS_DIR --phase 1|2 [--dry]

RESULTS_DIR holds `results_*.jsonl` (one line per crop, written by the crop agents; see tools/photos/crop_coin.py and
tools/photos/P2_AGENT_BRIEF.md) and `out/` (the cut images the lines name). Columns used:
  file, id, side, cx, cy, r, rot, status, read, best        (all phases)
  out          round cut-out, WebP                           (kind crop_circle)
  out2x2       square 2x2-flip crop, WebP or JPEG            (kind crop_2x2; Phase 2)
  out_master   full-resolution scan, kept as is              (kind master; Phase 2, optional)
  take         2, 3, ... for a re-scan of a coin+side that already has a Phase 2 photo (optional)

Phase 1: status ok or mismatch (the coin in the flip disagrees with its record; listed in CURATION_OPEN); circle only, 512 px.
  photos/p1/{ID}_{side}.webp, photo id {ID}-{side}-p1.
Phase 2: status ok only (a mismatch, ambiguous or unusable scan is never registered; the agent's line is the to-do list).
  photos/p2/{ID}_{side}.webp (circle, 1200 px), photos/p2/{ID}_{side}_2x2.webp (2x2, 1600 px), photos/p2/{ID}_{side}_master.{ext},
  photo ids {ID}-{side}-p2, {ID}-{side}-p2-2x2, {ID}-{side}-p2-master (re-scan: ...-p2t2 etc.).
  Each new photo then supersedes the live photo of the same coin + side + kind (a circle replaces the Phase 1 circle;
  a 2x2 with no circle replaces it too), via `op: set` on `superseded_by`, so the app shows only the newest.
Both write one change file, collection/_incoming/changes_script_{stamp}-photos-p{N}.jsonl, merged by
`python3 tools/pipeline/publish.py`. A photo id is never reused: an id that already exists is skipped.
--root DIR points the tool at another repo copy (dry runs); default is this repo.
"""
import datetime, glob, hashlib, io, json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
KIND_SUFFIX = {"crop_circle": "", "crop_2x2": "-2x2", "master": "-master"}
NAME_SUFFIX = {"crop_circle": "", "crop_2x2": "_2x2", "master": "_master"}

def load_collection(root):
    c = os.path.join(root, "collection")
    photos = json.load(open(os.path.join(c, "photos.json"), encoding="utf-8"))
    sd = os.path.join(c, "specimens")
    specs = {k for f in os.listdir(sd) for k in (lambda d: d if isinstance(d, dict) else {x["id"]: x for x in d})(json.load(open(os.path.join(sd, f), encoding="utf-8")))}
    return photos, specs

def encode(src_path, kind, phase):
    """-> (bytes, ext, width, height). Circles and 2x2 crops are re-encoded to the site size; a master is kept byte for byte."""
    raw = open(src_path, "rb").read()
    im = Image.open(io.BytesIO(raw)); w, h = im.size
    if kind == "master": return raw, os.path.splitext(src_path)[1].lower().lstrip(".") or "jpg", w, h
    if phase == 1: return raw, "webp", w, h                    # Phase 1 cut-outs are already final (512 px, q82)
    target = 1200 if kind == "crop_circle" else 1600
    if max(w, h) > target: im = im.resize((target, round(h * target / w)) if w >= h else (round(w * target / h), target), Image.LANCZOS)
    buf = io.BytesIO()
    if kind == "crop_circle": im.convert("RGBA").save(buf, "WEBP", quality=82, method=6)
    else: im.convert("RGB").save(buf, "WEBP", quality=85, method=6)
    return buf.getvalue(), "webp", im.size[0], im.size[1]

def main(src, phase, dry=False, root=None):
    root = os.path.abspath(root or os.path.join(HERE, "..", ".."))
    photos, specs = load_collection(root)
    have = {p["id"] for p in photos}
    live = {}                                                  # (specimen, side, kind) -> [live photo ids], oldest first
    for p in photos:
        if not p.get("superseded_by") and (p.get("review") or {}).get("status") not in ("rejected", "reshoot"): live.setdefault((p["specimen"], p["side"], p["kind"]), []).append(p["id"])
    rows = [json.loads(l) for f in sorted(glob.glob(os.path.join(src, "results_*.jsonl"))) for l in open(f, encoding="utf-8") if l.strip()]
    now = datetime.datetime.now(datetime.timezone.utc); ts = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    by = f"script:photo_crop_p{phase}"
    outdir = os.path.join(root, "photos", f"p{phase}")
    creates, supersedes, skipped, seen, files = [], [], [], set(), []
    okay = ("ok", "mismatch") if phase == 1 else ("ok",)
    for r in rows:
        if r.get("status") not in okay or r.get("best") is False: continue
        cid, side = r.get("id"), r.get("side")
        if cid not in specs: skipped.append((f"{cid}-{side}", "no such specimen")); continue
        take = int(r.get("take") or 1); tk = f"t{take}" if take > 1 else ""
        made = {}
        for kind, col in (("crop_circle", "out"), ("crop_2x2", "out2x2"), ("master", "out_master")):
            if not r.get(col): continue
            if phase == 1 and kind != "crop_circle": continue
            pid = f"{cid}-{side}-p{phase}{tk}{KIND_SUFFIX[kind]}"
            if pid in have or pid in seen: skipped.append((pid, "already registered")); continue
            path = os.path.join(src, "out", r[col])
            if not os.path.exists(path): skipped.append((pid, f"missing file out/{r[col]}")); continue
            blob, ext, w, h = encode(path, kind, phase)
            name = f"{cid}_{side}{('_' + tk) if tk else ''}{NAME_SUFFIX[kind]}.{ext}"
            seen.add(pid); made[kind] = pid; files.append((name, blob))
            note = {"crop_circle": "rim-safe circle cut checked edge by edge (N/E/S/W zooms) and reviewed by Claude",
                    "crop_2x2": "2x2 flip square cut, checked on the 2x2check image and reviewed by Claude",
                    "master": "full-resolution scan as dropped by the owner"}[kind]
            src_txt = (f"Phase 1 chat photo {r['file']} (Drive Titan Reliquary/_raw_capture/_phase1/coins); cut cx={r['cx']} cy={r['cy']} r={r['r']} rot={r['rot']}" if phase == 1 else
                       f"Phase 2 pro scan {r['file']} (Drive Titan Reliquary/STAGING (drop coin photos here)); id {cid} read from the flip; cut cx={r['cx']} cy={r['cy']} r={r['r']} rot={r['rot']}")
            creates.append({"ts": ts, "by": by, "entity": "photo", "id": pid, "op": "create", "field": "(new record)",
                            "new": {"specimen": cid, "side": side, "phase": phase, "kind": kind, "path": f"photos/p{phase}/{name}", "sha256": hashlib.sha256(blob).hexdigest(),
                                    "width": w, "height": h, "captured_at": None, "review": {"status": "approved", "reason": note}},
                            "source": src_txt})
        # newest photo replaces the live one of the same coin + side + kind; a 2x2 with no circle also replaces the circle
        for kind, pid in made.items():
            if phase == 1: continue
            targets = list(live.get((cid, side, kind), []))
            if kind == "crop_2x2" and "crop_circle" not in made: targets += live.get((cid, side, "crop_circle"), [])
            for old in targets:
                if old != pid and not any(s["id"] == old for s in supersedes):
                    supersedes.append({"ts": ts, "by": by, "entity": "photo", "id": old, "op": "set", "field": "superseded_by", "new": pid,
                                       "source": f"replaced by Phase 2 photo {pid} ({r['file']})"})
    path = os.path.join(root, "collection", "_incoming", f"changes_script_{now:%Y%m%d-%H%M}-photos-p{phase}.jsonl")
    if creates and not dry:
        os.makedirs(outdir, exist_ok=True)
        for name, blob in files: open(os.path.join(outdir, name), "wb").write(blob)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            for e in creates + supersedes: f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"{len(creates)} photo records, {len(supersedes)} superseded{' (dry run)' if dry else ' -> ' + os.path.relpath(path, root)}; skipped {len(skipped)}")
    for s in skipped: print("  skip", *s)
    left = [r for r in rows if r.get("status") not in ("ok", "mismatch" if phase == 1 else "ok")]
    for r in left: print("  NOT registered:", r.get("file"), r.get("id"), r.get("side"), r.get("status"), "-", r.get("note") or r.get("read") or "")

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0].startswith("-"): sys.exit(__doc__)
    ph = int(a[a.index("--phase") + 1]) if "--phase" in a else None
    if ph not in (1, 2): sys.exit("--phase 1 or --phase 2 is required\n\n" + __doc__)
    main(a[0], ph, "--dry" in a, a[a.index("--root") + 1] if "--root" in a else None)
