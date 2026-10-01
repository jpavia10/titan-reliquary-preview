#!/usr/bin/env python3
"""Validate a v3 collection: JSON Schema per record + referential integrity + manifest integrity.

usage (repo root):  python3 tools/schema/validate.py collection/ [--update-manifest]
    exit code 0 = clean.  --update-manifest first rewrites manifest.json (hashes, counts, totals) so a normal edit is:
    edit the record, append a ChangeEvent line to changes.jsonl, run this command, commit.
Needs: pip install jsonschema
"""
import glob, hashlib, json, os, re, sys, collections
from jsonschema import Draft202012Validator

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "albums"))
import manifest as mf
DEFS = json.load(open(os.path.join(HERE, "..", "..", "schema", "v3", "defs.schema.json"), encoding="utf-8"))
_V = {}

def validator(name):
    if name not in _V: _V[name] = Draft202012Validator({"$schema": DEFS["$schema"], "$defs": DEFS["$defs"], "$ref": f"#/$defs/{name}"})
    return _V[name]

def load(p):
    return json.load(open(p, encoding="utf-8"))

def jsonl(p):
    rows = []
    for n, ln in enumerate(open(p, encoding="utf-8"), 1):
        if ln.strip():
            try: rows.append((n, json.loads(ln)))
            except ValueError as e: rows.append((n, {"__bad__": str(e)}))
    return rows

def main(d, update_manifest=False):
    if update_manifest: mf.write(d)
    errs = collections.defaultdict(list)
    def check(entity, key, rec):
        for e in validator(entity).iter_errors(rec):
            path = "/".join(str(x) for x in e.absolute_path)
            errs[f"schema:{entity}"].append(f"{key} {path or '(root)'}: {e.message[:110]}")

    issuers = {r["id"]: r for r in load(f"{d}/ref/issuers.json")}
    for r in issuers.values(): check("Issuer", r["id"], r)
    types = {}
    for p in sorted(glob.glob(f"{d}/types/*.json")):
        iso = os.path.basename(p)[:-5]
        for k, t in load(p).items():
            check("Type", k, t); types[k] = t
            if k != t["id"]: errs["ref"].append(f"type key {k} != id {t['id']}")
            if t["country"] != iso: errs["ref"].append(f"type {k} is in types/{iso}.json but country is {t['country']}")
            if t["country"] not in issuers: errs["ref"].append(f"type {k}: unknown issuer {t['country']}")
            if t.get("issuer") and t["issuer"] not in issuers: errs["ref"].append(f"type {k}: unknown issuer id {t['issuer']}")
            if t.get("issuer") and issuers.get(t["issuer"], {}).get("iso") != t["country"]: errs["ref"].append(f"type {k}: issuer {t['issuer']} belongs to a different ISO than {t['country']}")
            pre = k.split(".")[0]
            if pre not in issuers: errs["ref"].append(f"type {k}: id prefix {pre} is not an issuer id")
            elif (t.get("issuer") or t["country"]) != pre: errs["ref"].append(f"type {k}: id prefix {pre} does not match issuer {t.get('issuer') or t['country']}")
            n = t["nominal"]
            for a, b in (("weight_min_g", "weight_max_g"), ("diameter_min_mm", "diameter_max_mm")):
                if (n.get(a) is None) != (n.get(b) is None) or (n.get(a) is not None and n[a] > n[b]): errs["ref"].append(f"type {k}: {a}/{b} inconsistent")
            if n.get("weight_g") is not None and n.get("weight_min_g") is not None: errs["ref"].append(f"type {k}: weight_g and a weight range are both set")
    specs = {}; sers = collections.Counter()
    for p in sorted(glob.glob(f"{d}/specimens/*.json")):
        iso = os.path.basename(p)[:-5]
        for k, s in load(p).items():
            check("Specimen", k, s)
            if k != s["id"]: errs["ref"].append(f"specimen key {k} != id {s['id']}")
            if k in specs: errs["ref"].append(f"duplicate specimen id {k}")
            specs[k] = s
            if s.get("ser"): sers[s["ser"]] += 1
            t = types.get(s["type"])
            if not t: errs["ref"].append(f"specimen {k}: unknown type {s['type']}"); continue
            if t["country"] != iso: errs["ref"].append(f"specimen {k} is in specimens/{iso}.json but its type is {t['country']}")
            marks = tuple(s["issue"]["mint_marks"])
            if not any(i["year"] == s["issue"]["year"] and tuple(i["mint_marks"]) == marks for i in t["issues"]):
                errs["ref"].append(f"specimen {k}: issue {s['issue']['year']}/{marks} not listed under type {s['type']}")
    for ser, n in sers.items():
        if n > 1: errs["ref"].append(f"duplicate ser {ser} x{n}")
    lots = {}
    for l in load(f"{d}/lots.json"):
        check("Lot", l["id"], l)
        if l["id"] in specs: errs["ref"].append(f"lot id {l['id']} collides with a specimen id")
        if l["id"] in lots: errs["ref"].append(f"duplicate lot id {l['id']}")
        lots[l["id"]] = l
    albums = {}
    for a in load(f"{d}/albums.json"):
        check("AlbumVolume", a["id"], a); albums[a["id"]] = a
        ids = collections.Counter(s["slot"] for s in a["slots"])
        for sl, n in ids.items():
            if n > 1: errs["ref"].append(f"album {a['id']}: duplicate slot id {sl}")
        if a["slots_total"] is not None and len(a["slots"]) > a["slots_total"]: errs["ref"].append(f"album {a['id']}: {len(a['slots'])} named slots > slots_total {a['slots_total']}")
        nf = sum(1 for s in a["slots"] if s["state"] == "filled"); ne = sum(1 for s in a["slots"] if s["state"] == "empty")
        if a["slots_filled_claimed"] is not None and nf > a["slots_filled_claimed"]: errs["ref"].append(f"album {a['id']}: {nf} slots filled but the ledger claims {a['slots_filled_claimed']}")
        if a["slots_total"] is not None and a["slots_filled_claimed"] is not None and ne > a["slots_total"] - a["slots_filled_claimed"]: errs["ref"].append(f"album {a['id']}: {ne} slots empty but only {a['slots_total'] - a['slots_filled_claimed']} are missing by count")
        for s in a["slots"]:
            if s["occupant_status"] == "inferred" and not (s.get("provenance") or "").startswith("inferred:"): errs["ref"].append(f"album {a['id']} {s['slot']}: inferred slot needs provenance 'inferred: ...'")
            if s["state"] == "unknown" and s["occupant_status"] != "unknown": errs["ref"].append(f"album {a['id']} {s['slot']}: state unknown must have occupant_status unknown")
            if s["state"] in ("filled", "empty") and s["occupant_status"] == "unknown": errs["ref"].append(f"album {a['id']} {s['slot']}: a {s['state']} slot cannot have occupant_status unknown")
            if s.get("occupant") and s["occupant"] not in specs: errs["ref"].append(f"album {a['id']} {s['slot']}: unknown occupant {s['occupant']}")
    photos = load(f"{d}/photos.json")
    for ph in photos:
        check("Photo", ph.get("id"), ph)
        if ph["specimen"] not in specs: errs["ref"].append(f"photo {ph['id']}: unknown specimen {ph['specimen']}")
    for k, s in specs.items():
        for pid in s["photos"]:
            if pid not in {x["id"] for x in photos}: errs["ref"].append(f"specimen {k}: unknown photo {pid}")
    # boot
    boot = load(f"{d}/boot.json")
    if len(boot["rows"]) != len(specs): errs["ref"].append(f"boot rows {len(boot['rows'])} != specimens {len(specs)}")
    ids_boot = [r[0] for r in boot["rows"]]
    if len(set(ids_boot)) != len(ids_boot) or set(ids_boot) != set(specs): errs["ref"].append("boot ids differ from specimen ids")
    for r in boot["rows"]:
        s = specs.get(r[0])
        if s and (r[1] != s["ser"] or r[11] >= len(boot["types"]) or boot["types"][r[11]] != s["type"] or r[7] != round((s["value"]["est_usd"] or 0) * 100)):
            errs["ref"].append(f"boot row {r[0]} disagrees with its specimen record")
    # valuations
    vseen = collections.Counter()
    for n, v in jsonl(f"{d}/valuations.jsonl"):
        if "__bad__" in v: errs["jsonl"].append(f"valuations line {n}: {v['__bad__']}"); continue
        check("Valuation", f"line {n}", v)
        if v["id"] not in specs and v["id"] not in lots: errs["ref"].append(f"valuations line {n}: unknown id {v['id']}")
        vseen[(v["id"], v["at"])] += 1
    for k, c in vseen.items():
        if c > 1: errs["ref"].append(f"valuation {k[0]} dated {k[1]} appears {c} times")
    # changes
    nchg = 0
    for n, e in jsonl(f"{d}/changes.jsonl"):
        nchg += 1
        if "__bad__" in e: errs["jsonl"].append(f"changes line {n}: {e['__bad__']}"); continue
        check("ChangeEvent", f"line {n}", e)
        pool = {"type": types, "specimen": specs, "lot": lots, "album": albums, "issuer": issuers}.get(e.get("entity"), {})
        if e.get("id") not in pool and e.get("entity") != "photo": errs["ref"].append(f"changes line {n}: {e.get('entity')} {e.get('id')} does not exist")
    # manifest
    mp = f"{d}/manifest.json"
    if not os.path.exists(mp): errs["manifest"].append("manifest.json is missing")
    else:
        m = load(mp)
        for e in validator("Manifest").iter_errors(m): errs["manifest"].append(f"manifest {'/'.join(str(x) for x in e.absolute_path)}: {e.message[:100]}")
        listed = {}
        for f in m.get("files", []):
            if f["path"] in listed: errs["manifest"].append(f"{f['path']} listed twice")
            listed[f["path"]] = f
            fp = os.path.join(d, f["path"])
            if not os.path.isfile(fp): errs["manifest"].append(f"listed file is missing: {f['path']}"); continue
            if mf.sha256_file(fp) != f["sha256"]: errs["manifest"].append(f"hash mismatch: {f['path']} (edited without refreshing the manifest?)")
            if os.path.getsize(fp) != f["bytes"]: errs["manifest"].append(f"size mismatch: {f['path']}")
        if [f["path"] for f in m.get("files", [])] != sorted(listed): errs["manifest"].append("files are not sorted by path")
        for p in mf.list_files(d):
            if p not in listed: errs["manifest"].append(f"file not listed in the manifest: {p}")
        exp = hashlib.sha256("".join(f"{f['path']}:{f['sha256']}\n" for f in m.get("files", [])).encode()).hexdigest()
        if m.get("content_hash") != exp: errs["manifest"].append("content_hash does not match the files list")
        cnt, _ = mf.counts_and_totals(d)
        if m.get("counts") != cnt: errs["manifest"].append("counts in the manifest are stale")
        if errs["manifest"]: errs["manifest"].append("fix: python3 tools/schema/validate.py %s --update-manifest" % d)
    print(f"checked: {len(issuers)} issuers, {len(types)} types, {len(specs)} specimens, {len(lots)} lots, {len(albums)} albums, {len(photos)} photos, {nchg} change events, boot rows {len(boot['rows'])}")
    total = sum(len(v) for k, v in errs.items())
    for k, v in errs.items():
        print(f"\n{k}: {len(v)} problem(s)")
        for x in v[:15]: print("  ", x)
    print("\nRESULT:", "CLEAN (0 schema errors, 0 broken references)" if total == 0 else f"{total} problem(s)")
    return 0 if total == 0 else 1

if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    sys.exit(main(a[0], "--update-manifest" in sys.argv))
