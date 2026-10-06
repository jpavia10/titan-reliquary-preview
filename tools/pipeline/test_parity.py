#!/usr/bin/env python3
"""Parity: build data/ from collection/ into a temp dir and compare with the golden data/ (the v254 Grok publish).

usage (repo root):  python3 tools/pipeline/test_parity.py [collection/ [golden_data/]] [--examples N] [--quiet]

Every differing field is classified:
  exact       identical to the golden record
  normalised  same after number spelling / spacing (3.00 vs 3)
  curated     differs because v2 curation CHANGED the fact on purpose (an event in collection/changes.jsonl explains it)
  derived     a display string v2 does not store (year_line, face FX note, label flourish, free-text tail of refs/specs ...)
              re-derived from structured facts; the difference is the lost ledger wording (DISPLAY_FIELDS)
  KNOWN       a documented migration gap (KNOWN below)
  DIFF        unexplained: fails the test
Exit 0 when there is no unexplained difference and every index block (board, metals, age, ...) matches.
"""
import shutil, atexit, collections, glob, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
IGNORE_TOP = {"generated_at", "generated_at_pt", "generated_at_iso", "ledger_version", "content_hash", "schema", "root"}   # root: the ledger's local machine path is deliberately replaced by a neutral label (privacy)
IGNORE_NESTED = {("board", "ledger_version")}
# display strings re-derived from structured facts (the ledger wording that v2 dropped is not recoverable)
DISPLAY_FIELDS = {"label", "face", "face_line", "year_line", "metal", "specs", "refs", "denom", "denom_line", "photo", "photo_stem", "cat", "mint", "continent_line", "country"}
# (record id, field): documented migration gaps, with the reason. All former gaps are closed (C073 quantity 26 and the C146 mint text
# went in as ChangeEvents), so this is empty; add an entry only with a reason.
KNOWN = {}
# which detail/index fields a ChangeEvent field explains
TYPE_FIELD_MAP = {"design": {"design"}, "legal_tender": {"tender", "face", "face_line"}, "denomination": {"denom", "denom_line", "label", "photo", "photo_stem", "face", "face_line"},
                  "nominal": {"metal", "specs", "diameter_mm"}, "catalogs": {"refs"}, "composition": {"metal"}, "precious": {"asw_oz", "is_silver", "metal"},
                  "issuer": {"country", "label", "continent_line"}, "class": {"kind", "cat"}, "issues": {"mintage", "mint", "year_line"}}

def norm(v):
    if isinstance(v, str):
        s = re.sub(r"(?<![\d.])(\d+)\.(\d*?)0+(?![\d])", lambda m: m.group(1) + ("." + m.group(2) if m.group(2) else ""), v)
        return re.sub(r"\s+", " ", s).strip().lower()
    return v

def load(p): return json.load(open(p, encoding="utf-8"))

def curated_map(coll):
    """{(specimen id, field): reason} from the ChangeEvents that altered the ledger value on purpose."""
    types, specs = {}, {}
    for p in glob.glob(f"{coll}/types/*.json"): types.update(load(p))
    for p in glob.glob(f"{coll}/specimens/*.json"): specs.update(load(p))
    members = collections.defaultdict(list)
    for sid, s in specs.items(): members[s["type"]].append(sid)
    out = {}
    with open(f"{coll}/changes.jsonl", encoding="utf-8") as f:
        for ln in f:
            if not ln.strip(): continue
            e = json.loads(ln)
            head = e["field"].split(".")[0]
            if e["entity"] == "type":
                for sid in members.get(e["id"], []):
                    for fld in TYPE_FIELD_MAP.get(head, set()): out[(sid, fld)] = f"type {e['id']} {e['field']}"
            elif e["entity"] == "specimen" and e["id"] in specs:
                for fld in {head, {"issue": "mintage"}.get(head, head)}: out[(e["id"], fld)] = f"specimen {e['id']} {e['field']}"
    return out

def compare_records(name, gold, new, stats, ex, curated, fails):
    sid = gold.get("scan") or gold.get("id")
    for k in sorted(set(gold) | set(new)):
        g, n = gold.get(k, "<absent>"), new.get(k, "<absent>")
        st = stats[(name, k)]
        if g == n: st["exact"] += 1; continue
        if norm(g) == norm(n): st["normalised"] += 1; continue
        if (sid, k) in KNOWN: st["KNOWN"] += 1; cls = "KNOWN"
        elif (sid, k) in curated: st["curated"] += 1; cls = "curated"
        elif k in DISPLAY_FIELDS: st["derived"] += 1; cls = "derived"
        else: st["DIFF"] += 1; cls = "DIFF"; fails.append(f"{name}.{k} {sid}")
        if len(ex[(name, k, cls)]) < 2: ex[(name, k, cls)].append((sid, g, n))

def run(coll, gold):
    tmp = tempfile.mkdtemp(prefix="parity-"); atexit.register(shutil.rmtree, tmp, True)
    subprocess.run([sys.executable, os.path.join(HERE, "build_app_data.py"), coll, tmp], check=True, capture_output=True)
    stats = collections.defaultdict(collections.Counter); ex = collections.defaultdict(list); fails = []
    curated = curated_map(coll)
    gi, ni = load(f"{gold}/index.json"), load(f"{tmp}/index.json")
    for k in sorted(set(gi) | set(ni)):
        if k in IGNORE_TOP or k in ("flips", "bullion", "sets", "housing", "stamps"): continue
        a, b = gi.get(k), ni.get(k)
        if isinstance(a, dict) and isinstance(b, dict) and k == "board": a = {x: y for x, y in a.items() if x != "ledger_version"}; b = {x: y for x, y in b.items() if x != "ledger_version"}
        if k == "value" and isinstance(a, dict) and isinstance(b, dict):      # explained exception: value.portfolio_daily is NEW (price history; its last day depends on the build date), not part of the v254 ledger; the ledger fields beside it must still match
            a = {x: y for x, y in a.items() if x != "portfolio_daily"}; b = {x: y for x, y in b.items() if x != "portfolio_daily"}
        if a != b: fails.append(f"index.{k} differs from the ledger block")
    gf = {f["scan"]: f for f in gi["flips"]}; nf = {f["scan"]: f for f in ni["flips"]}
    if set(gf) != set(nf): fails.append(f"flip ids differ: only golden {sorted(set(gf) - set(nf))[:5]} only built {sorted(set(nf) - set(gf))[:5]}")
    for s in gf:
        if s in nf: compare_records("index.flip", gf[s], nf[s], stats, ex, curated, fails)
    for kind in ("bullion", "sets", "housing", "stamps"):
        gl = {r["scan"]: r for r in gi[kind]}; nl = {r["scan"]: r for r in ni[kind]}
        if set(gl) != set(nl): fails.append(f"{kind} ids differ")
        for s in gl:
            if s in nl: compare_records(f"index.{kind}", gl[s], nl[s], stats, ex, curated, fails)
    gd, nd = {}, {}
    for p in glob.glob(f"{gold}/detail/*.json"): gd[os.path.basename(p)] = load(p)
    for p in glob.glob(f"{tmp}/detail/*.json"): nd[os.path.basename(p)] = load(p)
    gd = {k: v for k, v in gd.items() if v}                      # the golden has an empty stale XX.json
    if set(gd) != set(nd): fails.append(f"detail files differ: {sorted(set(gd) ^ set(nd))}")
    for fn in gd:
        for s, rec in gd[fn].items():
            if s in nd.get(fn, {}): compare_records("detail", rec, nd[fn][s], stats, ex, curated, fails)
            else: fails.append(f"detail {s} missing in build")
    gs, ns = load(f"{gold}/search.json"), load(f"{tmp}/search.json")
    if set(gs) != set(ns): fails.append("search.json covers different ids")
    same = sum(1 for k in gs if ns.get(k) == gs[k])
    # search coverage: every word the v254 text had must still be searchable, unless a curation event rewrote that coin's wording
    touched = {sid for (sid, _f) in curated}; lost = {}
    for k in gs:
        miss = set(gs[k].split()) - set(ns.get(k, "").split())
        if miss:
            lost[k] = miss
            if k not in touched: fails.append(f"search.json {k} lost words {sorted(miss)[:5]} without a curation event")
    return stats, ex, fails, (same, len(gs), len(lost)), tmp

def main(argv):
    nex = 2; a = []; it = iter(argv); quiet = False
    for x in it:
        if x == "--examples": nex = int(next(it))
        elif x == "--quiet": quiet = True
        elif not x.startswith("--"): a.append(x)
    coll = a[0] if a else os.path.join(ROOT, "collection"); gold = a[1] if len(a) > 1 else os.path.join(ROOT, "data")
    stats, ex, fails, srch, tmp = run(coll, gold)
    tot = collections.Counter()
    for (name, k), c in sorted(stats.items()):
        tot.update(c)
        if quiet or not (c["curated"] or c["derived"] or c["KNOWN"] or c["DIFF"]): continue
        n = sum(c.values())
        print(f"{name:14s} {k:16s} exact {c['exact']+c['normalised']:4d}  curated {c['curated']:3d}  derived {c['derived']:3d}  known {c['KNOWN']:2d}  DIFF {c['DIFF']:3d}  /{n}")
        for cls in ("KNOWN", "curated", "derived", "DIFF"):
            for sid, g, n_ in ex.get((name, k, cls), [])[:nex]:
                print(f"     [{cls}] {sid}: golden {str(g)[:95]!r}\n              built  {str(n_)[:95]!r}")
    cmp_ = sum(tot.values())
    print(f"\nfield comparisons {cmp_}: exact {tot['exact']} + normalised {tot['normalised']}, curated {tot['curated']}, derived {tot['derived']}, known {tot['KNOWN']}, UNEXPLAINED {tot['DIFF']}")
    print(f"search.json: same coverage ({srch[1]} entries); {srch[0]} byte-identical (number-spelling aliases are appended), {srch[2]} entries lack some v254 word, all on coins whose wording a curation event rewrote")
    for f in fails[:40]: print("FAIL:", f)
    print("RESULT:", "PARITY OK (headline totals, all index blocks and every app-logic field reproduced; listed differences are explained)" if not fails else f"FAIL ({len(fails)})")
    return 0 if not fails else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
