#!/usr/bin/env python3
"""Build / refresh collection/manifest.json.

usage (repo root):  python3 tools/schema/manifest.py collection/ [--source-ledger v254 --source-generated-at 2026-09-30T15:12:46Z --source-hash ce9ece47...]

The manifest lists EVERY file under collection/ except manifest.json itself as {"path", "sha256", "bytes"}, sorted by path.
tools/drive/sync_to_drive.gs mirrors exactly those files to Google Drive. content_hash = sha256 of the sorted "path:sha256\\n" lines,
so it changes whenever any file changes. Counts and totals are recomputed from the records. The `source` block (ledger version,
generated_at) is kept from the existing manifest unless overridden on the command line.
"""
import glob, hashlib, json, os, re, sys

SCHEMA_VERSION = "3.0.0"
SKIP_DIRS = {"_incoming"}        # Drive drop zone; never part of the repo master

def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
    return h.hexdigest()

def list_files(d):
    out = []
    for root, dirs, files in os.walk(d):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS and not x.startswith("."))
        for n in sorted(files):
            rel = os.path.relpath(os.path.join(root, n), d).replace(os.sep, "/")
            if rel == "manifest.json" or n.startswith("."): continue
            out.append(rel)
    return sorted(out)

def load(p): return json.load(open(p, encoding="utf-8"))

def counts_and_totals(d):
    types = {}; specs = {}
    for p in sorted(glob.glob(f"{d}/types/*.json")): types.update(load(p))
    for p in sorted(glob.glob(f"{d}/specimens/*.json")): specs.update(load(p))
    lots = load(f"{d}/lots.json"); albums = load(f"{d}/albums.json")
    n_lines = lambda p: sum(1 for ln in open(p, encoding="utf-8") if ln.strip()) if os.path.exists(p) else 0
    cnt = {"specimens": len(specs), "types": len(types), "lots": len(lots), "albums": len(albums), "issuers": len(load(f"{d}/ref/issuers.json")),
           "countries": len({t["country"] for t in types.values()}), "photos": len(load(f"{d}/photos.json")),
           "valuations": n_lines(f"{d}/valuations.jsonl"), "spot_days": n_lines(f"{d}/prices/spot_daily.jsonl"), "changes": n_lines(f"{d}/changes.jsonl"),
           "lots_by_kind": {k: sum(1 for l in lots if l["kind"] == k) for k in sorted({l["kind"] for l in lots})},
           "album_slots_total": sum(a["slots_total"] or 0 for a in albums), "album_slots_filled_claimed": sum(a["slots_filled_claimed"] or 0 for a in albums)}
    spec_est = sum(s["value"]["est_usd"] or 0 for s in specs.values())
    prec = lambda s, k: (types.get(s["type"], {}).get("precious", {}).get(k) or 0) * (s.get("quantity") or 1)   # a bad type ref is reported by validate.py, not here
    spec_asw = sum(prec(s, "asw_oz") for s in specs.values())
    spec_agw = sum(prec(s, "agw_oz") for s in specs.values())
    alb_asw = sum((a.get("asw_oz_per_slot") or 0) * a["slots_filled_claimed"] for a in albums if a.get("asw_oz_per_slot"))
    tot = {"specimens_est_usd": round(spec_est, 2), "lots_est_usd": round(sum(l["est_usd"] or 0 for l in lots), 2),
           "records_est_usd": round(spec_est + sum(l["est_usd"] or 0 for l in lots), 2),
           "silver_oz": {"specimens": round(spec_asw, 4), "lots": round(sum(l["asw_oz"] or 0 for l in lots), 4), "albums": round(alb_asw, 4)},
           "gold_oz": {"specimens": round(spec_agw, 4), "lots": round(sum(l["agw_oz"] or 0 for l in lots), 4)}}
    tot["silver_oz"]["total"] = round(sum(tot["silver_oz"].values()), 4); tot["gold_oz"]["total"] = round(sum(tot["gold_oz"].values()), 4)
    return cnt, tot

def build(d, source=None):
    old = load(f"{d}/manifest.json") if os.path.exists(f"{d}/manifest.json") else {}
    files = [{"path": p, "sha256": sha256_file(os.path.join(d, p)), "bytes": os.path.getsize(os.path.join(d, p))} for p in list_files(d)]
    cnt, tot = counts_and_totals(d)
    src = dict(old.get("source") or {}); src.update(source or {})
    src.setdefault("ledger_repo", "https://github.com/jpavia10/titan-reliquary")
    h = hashlib.sha256("".join(f"{f['path']}:{f['sha256']}\n" for f in files).encode()).hexdigest()
    m = {"schema_version": SCHEMA_VERSION, "built_by": "tools/schema/manifest.py", "source": src, "counts": cnt, "totals": tot, "content_hash": h, "files": files}
    if old.get("ledger_reconciliation"): m["ledger_reconciliation"] = old["ledger_reconciliation"]
    return m

def write(d, source=None, extra=None):
    m = build(d, source)
    if extra: m.update(extra)
    with open(f"{d}/manifest.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(m, f, indent=1, ensure_ascii=False, sort_keys=False); f.write("\n")
    return m

if __name__ == "__main__":
    a = sys.argv[1:]
    d = a[0]; src = {}
    for flag, key in (("--source-ledger", "ledger_version"), ("--source-generated-at", "generated_at"), ("--source-hash", "content_hash")):
        if flag in a: src[key] = a[a.index(flag) + 1]
    m = write(d, src or None)
    print(f"manifest: {len(m['files'])} files, content_hash {m['content_hash'][:16]}")
