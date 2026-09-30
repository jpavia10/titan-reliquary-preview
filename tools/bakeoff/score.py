#!/usr/bin/env python3
"""Score one model's photo-metadata output against tools/bakeoff/testset.json.

usage: python3 tools/bakeoff/score.py MODEL_OUTPUT.json [--json]

MODEL_OUTPUT.json: {"C001": {"country": "...", "year": "1969", "denom": "1 franc", "mint": "B", "km": "24a.1"}, ...}
A field the model is unsure of should be null / "" / "unknown" (that is NOT penalised as wrong).
Per field: correct, wrong (a confident value that does not match = an invented value), abstained.
Headline numbers: core accuracy (country, year, denom, mint) and the invented-value rate.
"""
import json, re, sys, unicodedata

FIELDS = ["country", "year", "denom", "mint", "km"]
CORE = ["country", "year", "denom"]

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).lower()
    s = "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F)
    return re.sub(r"[^a-z0-9. ]+", " ", s).strip()

def stem(s):  # fold plural and currency words: "1 franc" == "1 francs"
    return " ".join(w[:-1] if len(w) > 3 and w.endswith("s") else w for w in norm(s).split())

def abstained(v):
    return v is None or norm(v) in ("", "unknown", "unsure", "n a", "none", "null")

def same(field, gold, got):
    if field == "country": return norm(gold) == norm(got) or norm(gold) in norm(got) or norm(got) in norm(gold)
    if field == "denom": return stem(gold) == stem(got)
    if field == "km": return norm(gold).replace("km", "").strip() == norm(got).replace("km", "").strip()
    return norm(gold) == norm(got)

def score(gold, out):
    tally = {f: {"correct": 0, "wrong": 0, "abstained": 0, "n": 0} for f in FIELDS}
    for g in gold:
        got = out.get(g["scan"], {})
        for f in FIELDS:
            if abstained(g.get(f)): continue  # no ground truth for this coin/field
            t = tally[f]; t["n"] += 1
            v = got.get(f)
            if abstained(v): t["abstained"] += 1
            elif same(f, g[f], v): t["correct"] += 1
            else: t["wrong"] += 1
    return tally

def summarize(tally):
    n = sum(tally[f]["n"] for f in CORE + ["mint"])
    c = sum(tally[f]["correct"] for f in CORE + ["mint"])
    w = sum(t["wrong"] for t in tally.values())
    total = sum(t["n"] for t in tally.values())
    return {"core_accuracy": round(c / n, 4) if n else 0, "invented_rate": round(w / total, 4) if total else 0}

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: sys.exit(__doc__)
    gold = json.load(open("tools/bakeoff/testset.json", encoding="utf-8"))
    tally = score(gold, json.load(open(args[0], encoding="utf-8")))
    s = summarize(tally)
    if "--json" in sys.argv: print(json.dumps({"fields": tally, **s}, indent=1))
    else:
        print(f"{'field':8} {'ok':>4} {'wrong':>6} {'abst':>5} {'n':>4}")
        for f, t in tally.items(): print(f"{f:8} {t['correct']:>4} {t['wrong']:>6} {t['abstained']:>5} {t['n']:>4}")
        print(f"core accuracy {s['core_accuracy']:.1%}   invented-value rate {s['invented_rate']:.1%}")
