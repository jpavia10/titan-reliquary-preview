#!/usr/bin/env python3
"""Fingerprint the original phone photos behind each cut-out (fix list #79).

Every Phase 1 cut-out records the hash of the cut-out itself (`sha256`) and, since tr102, of the original it was cut from
(`crop.source_sha256`). This fills in the originals' hashes for the older records, so a silently swapped original can be detected
and the bake-off's "same photos for every model" promise can be checked byte for byte.

    python3 tools/photos/fingerprint_sources.py DIR [--out collection/_incoming/] [--ts 2026-10-09T15:00:00Z]

DIR holds downloaded originals: the image files themselves, Drive-connector dumps (JSON {"title", "content": base64}), or
{"title", "sha256"} records written when a large download was hashed on arrival (scratch/fp_collect.py style). For every original whose
name is a photo record's crop.source_file and whose fingerprint is still empty, one ChangeEvent (by script:fingerprint, field
crop.source_sha256) goes into changes_script_{stamp}-fingerprints.jsonl, and docs/photos/raw_capture_index.json gets the same sha256.
A hash that disagrees with one already recorded is reported, never written (the original changed: cut a new photo record).
"""
import base64, datetime, glob, hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))


def read_any(path):
    """-> (file name, bytes) for an image file or a Drive-connector JSON dump; None when it is neither."""
    with open(path, "rb") as fh: data = fh.read()
    if data[:1] == b"{":
        try:
            d = json.loads(data)
            if isinstance(d, dict) and d.get("content") and d.get("title"): return d["title"], base64.b64decode(d["content"])
            if isinstance(d, dict) and d.get("title") and d.get("sha256"): return d["title"], d["sha256"]      # already hashed (a large download, hashed on arrival)
        except ValueError: pass
        return None
    return os.path.basename(path), data


def main(argv):
    src_dir = argv[0]
    out_dir = argv[argv.index("--out") + 1] if "--out" in argv else os.path.join(ROOT, "collection", "_incoming")
    ts = argv[argv.index("--ts") + 1] if "--ts" in argv else datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    photos = json.load(open(os.path.join(ROOT, "collection", "photos.json"), encoding="utf-8"))
    rip = os.path.join(ROOT, "docs", "photos", "raw_capture_index.json"); raw = json.load(open(rip, encoding="utf-8"))
    by_file = {r["file"]: r for r in raw["photos"]}
    hashes, problems = {}, []
    for p in sorted(glob.glob(os.path.join(src_dir, "*"))):
        got = read_any(p)
        if not got: continue
        name, data = got
        hashes[name] = data if isinstance(data, str) else hashlib.sha256(data).hexdigest()
    events = []
    for ph in photos:
        c = ph.get("crop") or {}
        f = c.get("source_file")
        if not f or f not in hashes: continue
        h = hashes[f]
        if c.get("source_sha256"):
            if c["source_sha256"] != h: problems.append(f"{ph['id']}: {f} hashes to {h[:12]}..., the record says {c['source_sha256'][:12]}...: the original changed")
            continue
        did = (by_file.get(f) or {}).get("drive_id")
        events.append({"ts": ts, "by": "script:fingerprint", "entity": "photo", "id": ph["id"], "op": "set", "field": "crop.source_sha256", "new": h,
                       "source": f"sha256 of the original {f} as stored in Drive _raw_capture" + (f" (file id {did})" if did else ""), "verified": False})
    for f, h in hashes.items():
        r = by_file.get(f)
        if r is None: continue
        if r.get("sha256") and r["sha256"] != h: problems.append(f"raw index: {f} was {r['sha256'][:12]}..., now {h[:12]}...")
        else: r["sha256"] = h
    with open(rip, "w", encoding="utf-8", newline="\n") as fh: json.dump(raw, fh, ensure_ascii=False, indent=1); fh.write("\n")
    if events:
        stamp = ts[:16].replace("-", "").replace(":", "").replace("T", "-")
        out = os.path.join(out_dir, f"changes_script_{stamp}-fingerprints.jsonl")
        with open(out, "w", encoding="utf-8", newline="\n") as fh: fh.write("".join(json.dumps(e, ensure_ascii=False) + "\n" for e in events))
        print(f"{len(events)} fingerprint event(s) -> {os.path.relpath(out, ROOT)}")
    print(f"{len(hashes)} original(s) hashed; raw index updated" + ("".join("\nPROBLEM " + x for x in problems)))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
