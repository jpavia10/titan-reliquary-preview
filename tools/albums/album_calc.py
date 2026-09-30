#!/usr/bin/env python3
"""Computed album answers. Holes are NEVER stored in the data; they are computed here from slots + the ledger's filled count.

  missing            = slots_total - slots_filled_claimed          (None when either is unknown)
  missing_named      = labels of slots whose state is 'empty'       (what you can list: '1988, 1989, ...')
  unnamed_missing    = missing - len(missing_named)                 (empty slots the ledger counts but does not name)
  exact              = True when the per-slot states fully explain the count (no 'unknown' slots, no unnamed remainder)

usage:  python3 tools/albums/album_calc.py collection/           -> table for every volume
        python3 tools/albums/album_calc.py collection/ A026      -> the missing years of one volume
"""
import json, sys, os

def summary(v):
    slots = v["slots"]
    total, claimed = v["slots_total"], v["slots_filled_claimed"]
    named_empty = [s for s in slots if s["state"] == "empty"]
    unknown = [s for s in slots if s["state"] == "unknown"]
    filled = [s for s in slots if s["state"] == "filled"]
    missing = (total - claimed) if (total is not None and claimed is not None) else None
    unnamed = max(0, total - len(slots)) if total is not None else None
    return {"total": total, "filled_claimed": claimed, "missing": missing, "missing_named": [s["label"] for s in named_empty],
            "unnamed_missing": (missing - len(named_empty)) if missing is not None else None,
            "named_filled": len(filled), "named_unknown": len(unknown), "unnamed_slots": unnamed,
            "approx": bool(v.get("slots_total_approx")),
            "exact": bool(not unknown and missing is not None and not v.get("slots_total_approx") and v["evidence"] == "enumerated")}

if __name__ == "__main__":
    d = sys.argv[1]
    vols = json.load(open(os.path.join(d, "albums.json"), encoding="utf-8"))
    if len(sys.argv) > 2:
        v = next(x for x in vols if x["id"] == sys.argv[2]); c = summary(v)
        print(f"{v['id']} {v['title']}\nmissing {c['missing']} of {c['total']}" + ("" if c["exact"] else "  (not exact: see evidence/needs_scan)"))
        print("named missing:", ", ".join(c["missing_named"]) or "none named")
    else:
        for v in vols:
            c = summary(v)
            print(f"{v['id']}  {str(c['missing']):>4} missing of {str(c['total']):>4}{'~' if c['approx'] else ' '} {v['evidence']:<10} scan={'Y' if v['needs_scan'] else 'n'}  {v['title']}")
