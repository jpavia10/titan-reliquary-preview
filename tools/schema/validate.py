#!/usr/bin/env python3
"""Validate a v2 data directory: JSON Schema per record + referential integrity.
usage (repo root):  python3 tools/schema/validate.py DIR          exit code 0 = clean
Needs: pip install jsonschema
"""
import glob, json, os, re, sys, collections
from jsonschema import Draft202012Validator

HERE = os.path.dirname(os.path.abspath(__file__))
DEFS = json.load(open(os.path.join(HERE, "..", "..", "schema", "v2", "defs.schema.json"), encoding="utf-8"))

def validator(name):
    return Draft202012Validator({"$schema": DEFS["$schema"], "$defs": DEFS["$defs"], "$ref": f"#/$defs/{name}"})

def load(p):
    return json.load(open(p, encoding="utf-8"))

def main(d):
    errs = collections.defaultdict(list)
    def check(entity, key, rec):
        for e in validator(entity).iter_errors(rec):
            path = "/".join(str(x) for x in e.absolute_path)
            errs[f"schema:{entity}"].append(f"{key} {path or '(root)'}: {e.message[:110]}")

    issuers = {r["id"]: r for r in load(f"{d}/ref/issuers.json")}
    for r in issuers.values(): check("Issuer", r["id"], r)
    types = {}
    for p in sorted(glob.glob(f"{d}/types/*.json")):
        for k, t in load(p).items():
            check("Type", k, t); types[k] = t
            if k != t["id"]: errs["ref"].append(f"type key {k} != id {t['id']}")
            if t["country"] not in issuers: errs["ref"].append(f"type {k}: unknown issuer {t['country']}")
    specs = {}
    sers = collections.Counter()
    for p in sorted(glob.glob(f"{d}/specimens/*.json")):
        for k, s in load(p).items():
            check("Specimen", k, s)
            if k in specs: errs["ref"].append(f"duplicate specimen id {k}")
            specs[k] = s
            if s.get("ser"): sers[s["ser"]] += 1
            t = types.get(s["type"])
            if not t: errs["ref"].append(f"specimen {k}: unknown type {s['type']}"); continue
            marks = tuple(s["issue"]["mint_marks"])
            if not any(i["year"] == s["issue"]["year"] and tuple(i["mint_marks"]) == marks for i in t["issues"]):
                errs["ref"].append(f"specimen {k}: issue {s['issue']['year']}/{marks} not listed under type {s['type']}")
    for ser, n in sers.items():
        if n > 1: errs["ref"].append(f"duplicate ser {ser} x{n}")
    lots = load(f"{d}/lots.json")
    for l in lots:
        check("Lot", l["id"], l)
        if l["id"] in specs: errs["ref"].append(f"lot id {l['id']} collides with a specimen id")
    for a in load(f"{d}/albums.json"): check("AlbumVolume", a["id"], a)
    boot = load(f"{d}/boot.json")
    if len(boot["rows"]) != len(specs): errs["ref"].append(f"boot rows {len(boot['rows'])} != specimens {len(specs)}")
    ids_boot = {r[0] for r in boot["rows"]}
    if ids_boot != {int(re.sub(r'\D', '', k)) for k in specs}: errs["ref"].append("boot ids differ from specimen ids")
    print(f"checked: {len(issuers)} issuers, {len(types)} types, {len(specs)} specimens, {len(lots)} lots, boot rows {len(boot['rows'])}")
    total = sum(len(v) for v in errs.values())
    for k, v in errs.items():
        print(f"\n{k}: {len(v)} problem(s)")
        for x in v[:12]: print("  ", x)
    print("\nRESULT:", "CLEAN" if total == 0 else f"{total} problem(s)")
    return 0 if total == 0 else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
