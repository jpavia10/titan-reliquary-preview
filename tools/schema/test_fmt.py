#!/usr/bin/env python3
"""Run schema/v2/format_cases.json against tools/schema/fmt.py; with a data dir, also format every migrated record and flag oddities.
usage: python3 tools/schema/test_fmt.py [V2_DIR]"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fmt

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
cases = json.load(open(os.path.join(root, "schema", "v2", "format_cases.json"), encoding="utf-8"))
bad = 0
for c in cases:
    got = fmt.FUNCS[c["fn"]](*c["args"])
    if got != c["out"]:
        bad += 1; print(f"FAIL {c['fn']}({json.dumps(c['args'], ensure_ascii=False)}): expected {c['out']!r}, got {got!r}")
print(f"{len(cases) - bad}/{len(cases)} format cases pass")
if len(sys.argv) > 1:
    d = sys.argv[1]; n = dash = 0; sample = []
    types = {}
    for p in glob.glob(f"{d}/types/*.json"): types.update(json.load(open(p, encoding="utf-8")))
    for p in glob.glob(f"{d}/specimens/*.json"):
        for s in json.load(open(p, encoding="utf-8")).values():
            t = types[s["type"]]; n += 1
            row = [fmt.year(s["issue"]), fmt.denomination(t["denomination"]), fmt.money(s["value"]["est_usd"]), fmt.grams(t["nominal"]["weight_g"]),
                   fmt.millimetres(t["nominal"]["diameter_mm"], t["nominal"]["diameter_approx"]), fmt.mintage(s["issue"]["mintage"]), fmt.catalogs(t["catalogs"])]
            dash += sum(x == fmt.DASH for x in row)
            if s["id"] in ("C001", "C031", "C033", "C088", "C263"): sample.append((s["id"], row))
    print(f"formatted {n} specimens; {dash} em-dash cells (fields with no data)")
    for i, r in sample: print(" ", i, " | ".join(r))
sys.exit(1 if bad else 0)
