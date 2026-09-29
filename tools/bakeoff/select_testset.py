#!/usr/bin/env python3
"""Pick ~30 known-answer coins for the photo-metadata model bake-off.

Only 'high'-confidence flips with a numeric year and a KM# in the detail record are eligible,
so every answer is trustworthy. The pick is stratified (the collection is ~80% European, a plain
random sample would hardly test anything else): all eligible non-European ISOs first (one coin
each, then more), silver coins guaranteed, remaining slots round-robin over European ISOs.
Deterministic. Run from the repo root; writes tools/bakeoff/testset.json.
"""
import glob, json, itertools
from collections import defaultdict

N = 30
NON_EU_QUOTA = 12
SILVER_MIN = 5

def km(refs):
    import re
    m = re.search(r"KM#\s*([\w.]+)", refs or "")
    return m.group(1).lower() if m else ""

def main():
    idx = json.load(open("data/index.json", encoding="utf-8"))
    det = {}
    for p in sorted(glob.glob("data/detail/*.json")):
        det.update(json.load(open(p, encoding="utf-8")))
    pool = []
    for f in idx["flips"]:
        d = det.get(f["scan"], {})
        if f.get("conf") == "high" and str(f["year"]).isdigit() and km(d.get("refs")):
            pool.append((f, d))
    pool.sort(key=lambda t: t[0]["scan"])
    by_iso = defaultdict(list)
    for f, d in pool:
        by_iso[f["iso"]].append((f, d))
    picked, seen = [], set()

    def take(pair):
        if pair[0]["scan"] not in seen and len(picked) < N:
            seen.add(pair[0]["scan"]); picked.append(pair)

    non_eu = [i for i in sorted(by_iso) if by_iso[i][0][0]["continent"] != "Europe"]
    for rnd in range(3):  # up to 3 rounds over non-European countries
        for i in non_eu:
            if len([p for p in picked if p[0]["continent"] != "Europe"]) >= NON_EU_QUOTA: break
            if rnd < len(by_iso[i]): take(by_iso[i][rnd])
    silver = [p for p in pool if p[1].get("is_silver")]
    for p in silver:
        if sum(1 for q in picked if q[1].get("is_silver")) >= SILVER_MIN: break
        take(p)
    eu = [i for i in sorted(by_iso) if by_iso[i][0][0]["continent"] == "Europe"]
    for rnd in itertools.count():
        if len(picked) >= N or all(rnd >= len(by_iso[i]) for i in eu): break
        for i in eu:
            if rnd < len(by_iso[i]): take(by_iso[i][rnd])
    picked.sort(key=lambda t: t[0]["scan"])
    out = []
    for f, d in picked:
        out.append({"scan": f["scan"], "ser": f["ser"], "country": f["country"], "iso": f["iso"],
                    "continent": f["continent"], "year": str(f["year"]),
                    "denom": str(f["denom"]).split("·")[0].strip(), "mint": f.get("mint") or "",
                    "km": km(d.get("refs")), "is_silver": bool(d.get("is_silver"))})
    json.dump(out, open("tools/bakeoff/testset.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(out), "coins;", sum(o["is_silver"] for o in out), "silver;",
          len({o["iso"] for o in out}), "countries;", sum(o["continent"] != "Europe" for o in out), "non-European")

if __name__ == "__main__":
    main()
