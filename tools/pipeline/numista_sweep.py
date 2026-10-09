#!/usr/bin/env python3
"""Worklist for Grok's Numista sweep (fix list #72; also #39 Eritrea, #40 approximate weights, #71 the Swiss 1968 B mintage).

Grok can open Numista where Claude's container cannot. This writes every coin type in the collection (types with at least one live coin)
with what it still needs from the catalogue, in batches of 20, the special asks first:

    python3 tools/pipeline/numista_sweep.py [collection/] [--out docs/requests/numista_sweep_worklist.json]

Each row: batch, type, coins, country, denomination, issues (with N = the list position for `issues.N.mintage`), catalogs, weight /
diameter / composition as stored, `ask` (the facts to send) and `note` (what is known to be wrong or disputed). Grok answers with an
ordinary change file (collection/templates/INSTRUCTIONS.md): one event per fact, an exact Numista URL in every `source`, provenance on
every line. The worklist never changes data by itself.
"""
import datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

BATCH = 20
WEAK = ("ai", "imported", "review")
NOTES = {   # disputes found in review, asked of the sweep (fix list numbers in brackets). Round 1 (2026-10-08) settled ER.KM.46 (KM#47), CH.KM.21a
            # (1968 B = 31,588,000, Numista's Bern row) and found no Schön number for the Malta euro types; what is still open lives on as research
            # questions on the coins (C212 design, C028/C043/C064 Schön), which tools/agents/homework.py hands out.
}


def _cert_levels(details, sid):
    return (details.get(sid) or {}).get("certainty") or {}


def rows(col, details, truth):
    import provenance as PV
    live = {k: s for k, s in col["specs"].items() if (s.get("lifecycle") or {}).get("status") != "Removed"}
    by_type = {}
    for k, s in sorted(live.items()): by_type.setdefault(s["type"], []).append(s)
    two = {f["id"]: f["detail"] for f in truth if f["rule"] == "two_numbers"}
    mint_unread = {f["id"] for f in truth if f["rule"] == "mint_unknown"}
    out = []
    for tid, specs in sorted(by_type.items()):
        t = col["types"][tid]; nom = t.get("nominal") or {}; comp = t.get("composition") or {}
        cats = [{"system": c.get("system"), "number": c.get("number")} for c in t.get("catalogs") or []]
        held = {(s["issue"]["year"], tuple(s["issue"]["mint_marks"]), s["issue"].get("qualifier")) for s in specs}
        issues = []
        for n, i in enumerate(t.get("issues") or []):
            key = (i.get("year"), tuple(i.get("mint_marks") or []), i.get("qualifier"))
            if key not in held: continue
            coins = [s["id"] for s in specs if (s["issue"]["year"], tuple(s["issue"]["mint_marks"]), s["issue"].get("qualifier")) == key]
            lv = min((PV.level_of(_cert_levels(details, c), "mintage") for c in coins), key=lambda x: PV.LEVELS.index(x))
            issues.append({"N": n, "year": i.get("year"), "mint_marks": i.get("mint_marks") or [], "coins": coins, "mintage": i.get("mintage"),
                           "mintage_label": lv if i.get("mintage") is not None else None,
                           "mint_read": not any(c in mint_unread for c in coins)})
        ask = []
        if not any(c["system"] in ("N", "Numista") for c in cats): ask.append("catalogs: add the Numista entry {system: \"Numista\", number, url}")
        if nom.get("weight_g") is None or nom.get("weight_approx") or nom.get("weight_min_g") is not None:
            ask.append("nominal.weight_g: the catalogue weight as one number (and weight_approx false; weight_min_g/weight_max_g null)")
        if nom.get("diameter_mm") is None or nom.get("diameter_approx"): ask.append("nominal.diameter_mm")
        if not comp.get("text") or not comp.get("metal_class"): ask.append("composition.text + composition.metal_class")
        for i in issues:
            if i["year"] is not None and (i["mintage"] is None or i["mintage_label"] in WEAK):   # an undated token has no mintage to look up
                what = f"issues.{i['N']}.mintage: {i['year']}{' ' + '/'.join(i['mint_marks']) if i['mint_marks'] else ''}"
                if not i["mint_read"]: what += " (the mint mark on our coin is not read: send the all-mints total and say so in source)"
                ask.append(what)
        note = NOTES.get(tid)
        if tid in two: note = (note + " " if note else "") + f"The type carries two numbers in one catalogue ({two[tid]}): say which one this coin is."
        if not ask and not note: continue
        d = t.get("denomination") or {}
        out.append({"type": tid, "coins": [s["id"] for s in specs], "country": t.get("country"),
                    "denomination": d.get("display") or (f"{d.get('value'):g} {d.get('unit') or ''}".strip() if d.get("value") is not None else d.get("named")),
                    "issues": issues, "catalogs": cats, "weight_g": nom.get("weight_g"), "weight_approx": bool(nom.get("weight_approx")),
                    "weight_range_g": [nom.get("weight_min_g"), nom.get("weight_max_g")] if nom.get("weight_min_g") is not None else None,
                    "diameter_mm": nom.get("diameter_mm"), "composition": comp.get("text"), "ask": ask, "note": note})
    def prio(r):
        approx = any(a.startswith("nominal.weight_g") for a in r["ask"])
        return (0 if r["note"] else 1 if approx else 2, -len(r["ask"]), r["type"])
    out.sort(key=prio)
    for n, r in enumerate(out): r["batch"] = n // BATCH + 1
    return out


def build(coll):
    import build_app_data as B, truth_checks as TC
    col = B.load_collection(coll)
    _, det = B.build_specimens(col)
    details = {k: v for recs in det.values() for k, v in recs.items()}
    rs = rows(col, details, TC.findings(col))
    return {"schema": "numista-sweep/1", "made": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "for": "Grok (fix list #72)", "batch_size": BATCH, "batches": max([r["batch"] for r in rs] or [0]), "types": len(rs),
            "how": "One change file per batch: changes_grok-bot_{YYYYMMDD-HHMM}.jsonl in Drive collection-incoming (AI change files). One event per "
                   "fact, entity \"type\", the field path from `ask`, an exact Numista URL (https://en.numista.com/catalogue/pieces{N}.html) in "
                   "every source, phase 2, verified false, provenance on every line. Leave a fact out when the entry does not give it.",
            "rows": rs}


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    coll = a[0] if a else os.path.join(ROOT, "collection")
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(ROOT, "docs", "requests", "numista_sweep_worklist.json")
    w = build(coll)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as fh:   # one row per line: small, and still readable in a browser or a diff
        head = {k: v for k, v in w.items() if k != "rows"}
        fh.write(json.dumps(head, ensure_ascii=False)[:-1] + ', "rows": [\n' + ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in w["rows"]) + "\n]}\n")
    asks = sum(len(r["ask"]) for r in w["rows"])
    print(f"{w['types']} types, {asks} facts asked, {w['batches']} batches of {BATCH} -> {os.path.relpath(out, ROOT)}")
