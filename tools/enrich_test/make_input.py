#!/usr/bin/env python3
"""Build the closed-book metadata-enrichment test from tools/bakeoff/testset.json.

Writes (run from the repo root):
  tools/enrich_test/input.json    what a model is shown: scan, country, year, denomination, label, metal/size line.
  tools/enrich_test/answers.json  the held-out ledger values: km, mintage (int, only where the ledger has one), mint mark.
Nothing else from the ledger (refs, notes, design, mintage text) is shown, so the model cannot copy the answer.
Caveat: the ledger values were themselves researched by AI + the owner, so this measures AGREEMENT with the ledger.
Every disagreement is a list of records to verify against a real catalog, not proof the model is wrong.
"""
import glob, json, re

def main():
    det = {}
    for p in sorted(glob.glob("data/detail/*.json")):
        det.update(json.load(open(p, encoding="utf-8")))
    idx = {f["scan"]: f for f in json.load(open("data/index.json", encoding="utf-8"))["flips"]}
    test = json.load(open("tools/bakeoff/testset.json", encoding="utf-8"))
    inp, ans = [], {}
    for t in test:
        f, d = idx[t["scan"]], det[t["scan"]]
        inp.append({"scan": t["scan"], "country": f["country"], "year": str(f["year"]), "denomination": t["denom"],
                    "label": f["label"], "metal_and_size": str(d.get("metal", "")).split("·")[0:4] and " · ".join(str(d.get("metal", "")).split(" · ")[:3])})
        m = re.search(r"\d{1,3}(?:,\d{3})+|\d{4,}", str(d.get("mintage", "")))
        ans[t["scan"]] = {"km": t["km"], "mintage": int(m.group(0).replace(",", "")) if m else None, "mint_mark": t["mint"] or None}
    json.dump(inp, open("tools/enrich_test/input.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(ans, open("tools/enrich_test/answers.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(inp), "coins;", sum(1 for a in ans.values() if a["mintage"]), "with a ledger mintage;", sum(1 for a in ans.values() if a["mint_mark"]), "with a clean mint mark")

if __name__ == "__main__":
    main()
