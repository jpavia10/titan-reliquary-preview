#!/usr/bin/env python3
"""Generate data/wants.json ("What's missing") FROM collection/albums.json, using tools/albums/album_calc.py's arithmetic.

usage (repo root):  python3 tools/pipeline/build_wants.py collection/ data/wants.json [--generated-at 2026-10-01T12:00:00Z]
publish.py calls build() and installs the file with the rest of data/. A pure function of the master: never edit data/wants.json by hand.

Honesty rules baked in:
  * missing (count) = slots_total - slots_filled_claimed (album_calc); None when the ledger does not give a total.
  * `missing_named` = slots whose state is 'empty' (the ledger names them: fact).
  * `maybe_missing` = slots whose state is 'unknown' (named from the Whitman layout only; the ledger does not say if they are filled).
    They are only ever shown as "not known yet", never as missing.
  * `inferred_fill` = True when other slots were counted filled by arithmetic ("ledger names only the holes"): shown as "probably here".
  * evidence 'count-only' volumes list no years at all; the app says "N missing, specific years unknown until the album scan (Phase 1.5)".
Only the Python 3 standard library is used.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "albums"))
from album_calc import summary   # noqa: E402

def slot_row(s):
    inferred = s.get("occupant_status") == "inferred" or str(s.get("provenance") or "").startswith("inferred")
    return {"label": s["label"], "year": s.get("year"), "mint": s.get("mint"), "state": s["state"], "inferred": bool(inferred),
            **({"variety": s["variety"]} if s.get("variety") else {})}

def unit_of(slots):
    return "coins" if any(s.get("mint") for s in slots) else "years"

def build_volume(v):
    c = summary(v)
    slots = v["slots"]
    named = [s for s in slots if s["state"] == "empty"]
    maybe = [s for s in slots if s["state"] == "unknown"]
    filled = [s for s in slots if s["state"] == "filled"]
    inferred_fill = any(s["state"] == "filled" and (s.get("occupant_status") == "inferred" or str(s.get("provenance") or "").startswith("inferred")) for s in slots)
    if v["evidence"] == "count-only": named = []   # count-only volumes have no empty slots; stated for clarity
    return {
        "id": v["id"], "title": v["title"], "family": v["family"], "binder": v.get("binder"),
        "denomination": v.get("denomination_text"), "metal": v.get("metal_text"),
        "year_start": v.get("year_start"), "year_end": v.get("year_end"),
        "unit": unit_of(slots) if slots else "slots",
        "evidence": v["evidence"], "needs_scan": bool(v["needs_scan"]),
        "slots_total": c["total"], "slots_total_approx": c["approx"],
        "filled": c["filled_claimed"], "missing": c["missing"],
        "exact": c["exact"], "unnamed_missing": c["unnamed_missing"], "inferred_fill": inferred_fill,
        "missing_named": [slot_row(s) for s in named],
        "maybe_missing": [slot_row(s) for s in maybe],
        "have_named": [slot_row(s) for s in filled],
        "note": v.get("note"),
    }

def build(albums, generated_at=None):
    vols = [build_volume(v) for v in albums]
    return {
        "schema": "wants/1", "generated_at": generated_at, "source": "collection/albums.json (computed with tools/albums/album_calc.py)",
        "totals": {"volumes": len(vols), "needs_scan": sum(1 for v in vols if v["needs_scan"]),
                   "named_missing": sum(len(v["missing_named"]) for v in vols),
                   "missing_known": sum(v["missing"] for v in vols if v["missing"] is not None),
                   "volumes_without_total": sum(1 for v in vols if v["missing"] is None)},
        "volumes": vols,
    }

def main(argv):
    coll, out = argv[0], argv[1]
    gen = argv[argv.index("--generated-at") + 1] if "--generated-at" in argv else None
    with open(os.path.join(coll, "albums.json"), encoding="utf-8") as f: albums = json.load(f)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f: json.dump(build(albums, gen), f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {out}")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
