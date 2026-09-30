#!/usr/bin/env python3
"""Score a model's closed-book enrichment answers.  usage: python3 tools/enrich_test/score.py RESULT.json [--detail]

RESULT.json: {"C001": {"km": "24a.1", "mintage": 37598000, "mint_mark": "B", "confidence": "high"}, ...}
null / "" / "unknown" = the model declined to answer (never counted as wrong).
Per field: correct, wrong (= confident wrong answer, the dangerous kind), abstained.
Mintage counts as correct within 2 % of the ledger figure. Also reports accuracy among "high"-confidence answers (calibration).
"""
import json, re, sys

def declined(v):
    return v is None or str(v).strip().lower() in ("", "unknown", "n/a", "none", "null", "?")

def norm_km(v):
    return re.sub(r"[^a-z0-9.]", "", str(v).lower().replace("km", ""))

def grade(field, gold, got):
    if declined(got): return "abstained"
    if field == "km": return "correct" if norm_km(gold) == norm_km(got) else "wrong"
    if field == "mintage":
        try: g = float(str(got).replace(",", ""))
        except ValueError: return "wrong"
        return "correct" if abs(g - gold) <= 0.02 * gold else "wrong"
    return "correct" if str(gold).strip().lower() == str(got).strip().lower() else "wrong"

def run(answers, out):
    tally = {f: {"correct": 0, "wrong": 0, "abstained": 0, "n": 0} for f in ("km", "mintage", "mint_mark")}
    hi = {"correct": 0, "n": 0}
    rows = []
    for scan, gold in answers.items():
        got = out.get(scan, {})
        for f in tally:
            if gold.get(f) in (None, ""): continue
            g = grade(f, gold[f], got.get(f))
            tally[f]["n"] += 1; tally[f][g] += 1
            if g != "abstained" and str(got.get("confidence", "")).lower() == "high":
                hi["n"] += 1; hi["correct"] += g == "correct"
            if g == "wrong": rows.append((scan, f, gold[f], got.get(f)))
    return tally, hi, rows

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: sys.exit(__doc__)
    answers = json.load(open("tools/enrich_test/answers.json", encoding="utf-8"))
    tally, hi, rows = run(answers, json.load(open(args[0], encoding="utf-8")))
    print(f"{'field':10} {'ok':>4} {'wrong':>6} {'declined':>9} {'n':>4}")
    for f, t in tally.items(): print(f"{f:10} {t['correct']:>4} {t['wrong']:>6} {t['abstained']:>9} {t['n']:>4}")
    n = sum(t["n"] for t in tally.values()); w = sum(t["wrong"] for t in tally.values()); c = sum(t["correct"] for t in tally.values())
    print(f"overall: {c}/{n} correct, {w} confidently wrong ({w / n:.1%}); high-confidence answers correct: {hi['correct']}/{hi['n']}")
    if "--detail" in sys.argv:
        for r in rows: print("  WRONG", r[0], r[1], "ledger:", r[2], "model:", r[3])
