#!/usr/bin/env python3
"""Referential integrity + orphan report for collection/ and the generated data/.

problems(col, out)  -> list of hard failures (publish refuses on any)
warnings(col)       -> list of soft findings (reported in data/status.json, never block a publish)
status(col, out, build, now) -> the generated system status (data/status.json): the one machine-readable source for
                       counts, photo coverage, open questions and versions. Docs and the app read their numbers from it.

usage: python3 tools/pipeline/integrity.py [collection/ [data/]]   prints the orphan report, exit 1 on any problem
"""
import glob, json, os, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)


def _load(p):
    with open(p, encoding="utf-8") as f: return json.load(f)


def _live(p):
    return not p.get("superseded_by") and (p.get("review") or {}).get("status") not in ("rejected", "reshoot")


def problems(col, out=None, root=None):
    """root: the checkout the collection belongs to (photo paths are relative to it); the repo root is also searched."""
    p = []
    roots = [r for r in (root, ROOT) if r]
    specs, types, issuers, photos = col["specs"], col["types"], col["issuers"], col["photos"]
    pids = Counter(ph["id"] for ph in photos)
    p += [f"photo id {i} appears {n} times" for i, n in pids.items() if n > 1]
    for sid, s in specs.items():
        if s.get("type") not in types: p.append(f"{sid}: type {s.get('type')} does not exist")
        for ref in s.get("photos") or []:
            rid = ref if isinstance(ref, str) else (ref or {}).get("id")
            if rid and rid not in pids: p.append(f"{sid}: photo {rid} does not exist")
    for tid, t in types.items():
        iss = t.get("issuer") or t.get("country")
        if iss not in issuers: p.append(f"type {tid}: issuer/country {iss} does not exist")
    sers = Counter(s.get("ser") for s in specs.values() if s.get("ser"))
    p += [f"serial {k} is used by {n} specimens" for k, n in sers.items() if n > 1]
    for ph in photos:
        if ph.get("specimen") not in specs: p.append(f"photo {ph['id']}: specimen {ph.get('specimen')} does not exist")
        if ph.get("phase") not in (1, 2): p.append(f"photo {ph['id']}: phase {ph.get('phase')!r} is not 1 or 2")
        if ph.get("superseded_by") and ph["superseded_by"] not in pids: p.append(f"photo {ph['id']}: superseded_by {ph['superseded_by']} does not exist")
        if _live(ph) and ph.get("path") and not any(os.path.exists(os.path.join(r, ph["path"])) for r in roots): p.append(f"photo {ph['id']}: file {ph['path']} is missing")
    for a in col["albums"]:
        for sl in a.get("slots") or []:
            o = sl.get("occupant")
            if o and o not in specs: p.append(f"album {a['id']} slot {sl.get('slot')}: occupant {o} does not exist")
    if out:
        idx = _load(f"{out}/index.json")
        flips = [f["scan"] for f in idx["flips"]]
        dup = [k for k, n in Counter(flips).items() if n > 1]
        if dup: p.append(f"index.flips has duplicates {dup[:5]}")
        detail = {}
        for f in glob.glob(f"{out}/detail/*.json"): detail.update(_load(f))
        srch = _load(f"{out}/search.json")
        for name, keys in (("index", set(flips)), ("detail", set(detail)), ("search", set(srch))):
            if keys - set(specs): p.append(f"{name} has entries for unknown specimens {sorted(keys - set(specs))[:5]}")
            if set(specs) - keys: p.append(f"{name} is missing specimens {sorted(set(specs) - keys)[:5]}")
    return p


def warnings(col):
    used_types = {s.get("type") for s in col["specs"].values()} | {(l.get("type") if isinstance(l, dict) else None) for l in col["lots"]}
    used_iss = {t.get("issuer") or t.get("country") for t in col["types"].values()} | {s.get("issuer") for s in col["specs"].values()}
    w = [f"type {t} has no specimen or lot" for t in sorted(set(col["types"]) - used_types)]
    w += [f"issuer {i} has no type" for i in sorted(set(col["issuers"]) - used_iss)]
    nocrop = [ph["id"] for ph in col["photos"] if _live(ph) and ph.get("kind") in ("crop_circle", "crop_2x2") and not ph.get("crop")]
    if nocrop: w.append(f"{len(nocrop)} live cropped photo(s) have no crop settings (`crop`): {', '.join(nocrop[:5])}{' ...' if len(nocrop) > 5 else ''}")
    return w


def _truth(col):
    """Contradictions inside the records (tools/pipeline/truth_checks.py); integrity above only checks that the graph is well formed."""
    import truth_checks as TC
    return dict(TC.summary(TC.findings(col)), note="contradictions and over-specific claims; list in data/truth.json")


def _next_ids(specs):
    """Muse's audit #1: the id the pipeline will give the next new coin / token (ids are never reused, removed ones count)."""
    def nxt(prefix):
        nums = [int(k[1:]) for k in specs if k[:1] == prefix and k[1:].isdigit()]
        return f"{prefix}{(max(nums) if nums else 0) + 1:03d}"
    return {"coin": nxt("C"), "token": nxt("T"),
            "note": "Name photos of a new piece NOID_... and use NEW-1, NEW-2 in change files; the pipeline assigns these ids in order. "
                    "Only another contributor's file merged first can take them."}


def status(col, out, build, now, root=None):
    import display as D, phase1 as P1
    specs = col["specs"]
    active = {k: s for k, s in specs.items() if (s.get("lifecycle") or {}).get("status") != "Removed"}
    tok = {k for k, s in active.items() if D.is_token(col["types"][s["type"]])}
    live = [ph for ph in col["photos"] if _live(ph)]
    sides = {}
    for ph in live: sides.setdefault(ph["specimen"], set()).add(ph.get("side"))
    by_phase = lambda n: {ph["specimen"] for ph in live if ph.get("phase") == n}
    oq = sum(len(((s.get("research") or {}).get("open_questions")) or []) for s in active.values())
    oq_specs = sum(1 for s in active.values() if ((s.get("research") or {}).get("open_questions")))
    lots = Counter((l.get("kind") if isinstance(l, dict) else "?") for l in col["lots"])
    albums = col["albums"]
    m = col["manifest"]
    resh = f"{out}/reshoot.json"
    return {
        "schema": "status/1",
        "generated_at": now,
        "build": build,
        "schema_version": m.get("schema_version"),
        "collection_hash": m.get("content_hash"),
        "note": "Generated by tools/pipeline/publish.py. The authoritative counts: never copy them into docs by hand.",
        "specimens": {"total": len(active), "coins": len(active) - len(tok), "tokens": len(tok), "removed": len(specs) - len(active)},
        "lots": dict(sorted(lots.items())),
        "albums": {"volumes": len(albums), "families": len({a.get("family") for a in albums}),
                   "slots": sum(len(a.get("slots") or []) for a in albums),
                   "slots_filled": sum(1 for a in albums for s in a.get("slots") or [] if s.get("state") == "filled"),
                   "note": "album slots are tracked occupants, not catalogued specimens"},
        "next_ids": _next_ids(specs),
        "countries": len({col["types"][s["type"]].get("country") for s in active.values()}),
        "photos": {"records": len(col["photos"]), "live": len(live),
                   "specimens_with_any": len(sides), "specimens_with_both_sides": sum(1 for v in sides.values() if {"obv", "rev"} <= v),
                   "phase1_specimens": len(by_phase(1)), "phase2_specimens": len(by_phase(2)),
                   "still_needed": (_load(resh)["total"] if os.path.exists(resh) else None)},
        "research": {"open_questions": oq, "specimens_with_open_questions": oq_specs},
        "integrity": {"problems": len(problems(col, out, root)), "warnings": warnings(col)},
        "truth": _truth(col),
        "phase1": P1.summary(col),
        "trust": P1.trust(P1.details_from(out) if os.path.isdir(os.path.join(out, "detail")) else {}),
    }


if __name__ == "__main__":
    import build_app_data as B
    d = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "collection")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "data")
    col = B.load_collection(d)
    pr, wr = problems(col, out), warnings(col)
    print("ORPHAN / INTEGRITY REPORT")
    for x in pr: print("  PROBLEM", x)
    for x in wr: print("  warning", x)
    print(f"{len(pr)} problems, {len(wr)} warnings")
    sys.exit(1 if pr else 0)
