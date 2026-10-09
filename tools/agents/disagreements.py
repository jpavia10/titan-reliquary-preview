#!/usr/bin/env python3
"""Kept AI disagreements (fix list #18; collection/disagreements.jsonl; docs/agents/RESEARCH_LOOP.md section 5).

Most disagreements are filed by apply_changes.py (a verify line that disagrees) and settled by tools/agents/homework.py (a later event by a
third contributor or Joseph). This is for the rest: a conflict Claude finds at intake, a double read, a review.

    python3 tools/agents/disagreements.py list [--open]
    python3 tools/agents/disagreements.py open --entity type --id CH.KM.21a --field issues.0.mintage --value 10000000 --by model:muse-spark
             --source "..." --how intake|double-read|review|manual [--ts 2026-10-08T23:02:00Z] [--note "..."]
    python3 tools/agents/disagreements.py resolve D0003 --winner record|claim|neither|sources-disagree --by model:claude --source "..."
             [--error-by model:muse-spark|none] [--ts ...]
`--value` is JSON (a number, "text", [..]). The record side (value, who set it, source) is read from the master. Never edits a coin record:
when the claim wins, the fix is an ordinary change file; this only keeps the account.
"""
import datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import collection_io as C  # noqa: E402
import provenance as PV  # noqa: E402


def now_utc(): return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_path(rec, field):
    v = rec
    for p in field.split("."):
        if isinstance(v, dict): v = v.get(p)
        elif isinstance(v, list) and p.isdigit() and int(p) < len(v): v = v[int(p)]
        else: return None
    return v


def setter(col, ent, rid, field):
    for e in reversed(col.changes):
        if e["entity"] != ent or e["id"] != rid or PV._derived(e): continue
        f = e["field"]
        if f == field or field.startswith(f + ".") or f == "(new record)": return e
    return None


def record_of(col, ent, rid):
    return {"type": col.types, "specimen": col.specs}.get(ent, {}).get(rid) or (col.lot(rid) if ent == "lot" else col.album(rid) if ent == "album" else col.issuer(rid) if ent == "issuer" else None)


def open_one(col, ent, rid, field, value, by, source, how, ts, note=None, assignment=None):
    rec = record_of(col, ent, rid)
    if rec is None: raise SystemExit(f"{ent} {rid} does not exist")
    cur = get_path(rec, field); s = setter(col, ent, rid, field)
    n = max([int(d["id"][1:]) for d in col.disagreements] or [0]) + 1
    coins = [rid] if ent == "specimen" else sorted(k for k, sp in col.specs.items() if sp["type"] == rid) if ent == "type" else []
    d = {"id": f"D{n:04d}", "opened": ts, "entity": ent, "rid": rid, "field": field, "coins": coins,
         "record": {"value": cur, "by": s.get("by") if s else None, "source": s.get("source") if s else None, "ts": s.get("ts") if s else None},
         "claim": {"value": value, "by": by, "source": source, "ts": ts, "assignment": assignment, "provenance": None},
         "how": how, "status": "open", "resolution": None, "note": note}
    col.disagreements.append(d)
    return d


def resolve_one(col, did, winner, by, source, error_by, ts):
    d = next((x for x in col.disagreements if x["id"] == did), None)
    if d is None: raise SystemExit(f"no disagreement {did}")
    rec = record_of(col, d["entity"], d["rid"])
    if error_by == "auto": error_by = {"record": d["claim"]["by"], "claim": d["record"]["by"]}.get(winner)
    d["status"] = "resolved"
    d["resolution"] = {"ts": ts, "by": by, "value": get_path(rec, d["field"]), "winner": winner, "source": source, "error_by": None if error_by in (None, "none") else error_by}
    return d


def main(argv):
    coll = os.path.join(ROOT, "collection")
    arg = lambda k, dflt=None: argv[argv.index(k) + 1] if k in argv else dflt
    col = C.Collection(coll)
    cmd = argv[0] if argv else "list"
    if cmd == "list":
        for d in col.disagreements:
            if "--open" in argv and d["status"] != "open": continue
            r = d.get("resolution") or {}
            print(f"{d['id']} {d['status']:<8} {d['entity']} {d['rid']} {d['field']}: record {json.dumps(d['record']['value'])[:30]} ({PV.friendly(d['record']['by'])}) "
                  f"vs {json.dumps(d['claim']['value'])[:30]} ({PV.friendly(d['claim']['by'])})" + (f" -> {r.get('winner')}" if r else ""))
        return 0
    if cmd == "open":
        d = open_one(col, arg("--entity"), arg("--id"), arg("--field"), json.loads(arg("--value")), arg("--by"), arg("--source"), arg("--how", "manual"),
                     arg("--ts", now_utc()), arg("--note"))
        col.save(); print(f"filed {d['id']}"); return 0
    if cmd == "resolve":
        d = resolve_one(col, argv[1], arg("--winner"), arg("--by", "model:claude"), arg("--source"), arg("--error-by", "auto"), arg("--ts", now_utc()))
        col.save(); print(f"{d['id']} resolved: {d['resolution']['winner']}"); return 0
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
