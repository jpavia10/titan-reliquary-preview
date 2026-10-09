#!/usr/bin/env python3
"""Score one model's answers to a blind photo pack (fix list #4 bake-off, #19 locked test) against its answer key.

    python3 tools/bakeoff/score.py --key KEY.json ANSWERS.json [--json] [--record "Model name and version" [--cost USD]]

KEY.json      the pack's answer key from Drive `_locked (answer keys: Claude only)` (made by tools/bakeoff/make_pack.py). Its sha256 must
              match the line in tools/bakeoff/commitments.jsonl, so a key changed after the runs is refused.
ANSWERS.json  the model's reply: {"BK-0a1b": {"country": ..., "year": ..., "denom": ..., "mint": ..., "km": ..., "confidence": ...}, ...}
              A field the model is unsure of is null / "" / "unknown": never counted as wrong.
--record      appends one row to collaborators/MODEL_ACCURACY.md (totals only: never a coin id or an answer, so the set stays blind).
--agent ID    (with --record) also logs the run in docs/agents/homework/calibration.jsonl, so the research loop knows when this AI is due again
              (docs/agents/roles.json `calibration`: every AI retakes each pack on a cadence; the locked pack decides who reads Phase 2).

Per field: correct, wrong (a confident value that does not match = an invented value), abstained.
  core accuracy      correct / scored over country, year, denomination, plus mint where the key has a mint mark
  invented rate      wrong / all scored fields (the number to keep near zero)
  false confidence   answers marked "high" with at least one wrong core field / answers marked "high"
"""
import datetime, hashlib, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
FIELDS = ["country", "year", "denom", "mint", "km"]
CORE = ["country", "year", "denom", "mint"]
ALIAS = {"usa": "united states", "us": "united states", "united states of america": "united states", "uk": "united kingdom",
         "great britain": "united kingdom", "britain": "united kingdom", "taiwan": "taiwan roc", "republic of china": "taiwan roc",
         "korea": "south korea", "republic of korea": "south korea", "west germany": "germany", "federal republic of germany": "germany"}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).lower()
    s = "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9. ]+", " ", s)).strip()


def stem(s):   # "1 franc" == "1 francs", "Threepence (3d)" == "threepence"
    w = [x[:-1] if len(x) > 3 and x.endswith("s") else x for x in norm(s).replace("3d", "").split()]
    return " ".join(x for x in w if x not in ("euro",) or len(w) == 1)


def abstained(v):
    return v is None or norm(v) in ("", "unknown", "unsure", "n a", "none", "null")


def same(field, gold, got):
    if field == "country":
        g, o = ALIAS.get(norm(gold), norm(gold)), ALIAS.get(norm(got), norm(got))
        return g == o or (len(o) > 3 and (o in g or g in o))
    if field == "denom": return stem(gold) == stem(got) or norm(gold).replace("$", "") == norm(got).replace("dollar", "").strip()
    if field == "km": return norm(gold).replace("km", "").strip() == norm(got).replace("km", "").replace("#", "").strip()
    if field == "year": return re.sub(r"\D", "", str(gold)) == re.sub(r"\D", "", str(got))[-4:]
    return norm(gold) == norm(got)


def score(key_items, out):
    tally = {f: {"correct": 0, "wrong": 0, "abstained": 0, "n": 0} for f in FIELDS}
    hi = hi_wrong = 0
    for name, g in key_items.items():
        got = out.get(name) or out.get(name + ".webp") or {}
        wrong_core = False
        for f in FIELDS:
            if f == "mint" and not g.get("mint"): continue          # no mint mark on the key's coin: the shown side may not carry it
            if abstained(g.get(f)): continue
            t = tally[f]; t["n"] += 1; v = got.get(f)
            if abstained(v): t["abstained"] += 1
            elif same(f, g[f], v): t["correct"] += 1
            else: t["wrong"] += 1; wrong_core = wrong_core or f in CORE
        if norm(got.get("confidence")) == "high":
            hi += 1; hi_wrong += wrong_core
    return tally, {"high": hi, "high_wrong": hi_wrong}


def summarize(tally, conf, n_items, n_answered):
    n = sum(tally[f]["n"] for f in CORE); c = sum(tally[f]["correct"] for f in CORE)
    w = sum(t["wrong"] for t in tally.values()); total = sum(t["n"] for t in tally.values())
    return {"photos": n_items, "answered": n_answered, "core_accuracy": round(c / n, 4) if n else 0, "invented_rate": round(w / total, 4) if total else 0,
            "km_accuracy": round(tally["km"]["correct"] / tally["km"]["n"], 4) if tally["km"]["n"] else 0,
            "false_confidence": round(conf["high_wrong"] / conf["high"], 4) if conf["high"] else 0}


def check_commitment(key_path):
    blob = open(key_path, "rb").read(); sha = hashlib.sha256(blob).hexdigest()
    k = json.loads(blob)
    rows = [json.loads(l) for l in open(os.path.join(HERE, "commitments.jsonl"), encoding="utf-8") if l.strip()]
    hit = next((r for r in rows if r["key_sha256"] == sha), None)
    if not hit: sys.exit(f"REFUSED: this key's sha256 {sha[:16]}... is not in tools/bakeoff/commitments.jsonl (changed after the pack was made?)")
    return k, hit


def record(model, prompt_version, which, s, cost, made):
    p = os.path.join(ROOT, "collaborators", "MODEL_ACCURACY.md")
    txt = open(p, encoding="utf-8").read()
    head = "| date | model | pack | prompt | photos answered | core accuracy | KM accuracy | invented rate | false confidence | cost |"
    row = (f"| {datetime.date.today().isoformat()} | {model} | {which} ({made[:10]}) | {prompt_version} | {s['answered']} of {s['photos']} | "
           f"{s['core_accuracy']:.0%} | {s['km_accuracy']:.0%} | {s['invented_rate']:.1%} | {s['false_confidence']:.0%} | {cost or 'n/a'} |")
    if head not in txt:
        txt = txt.replace("## Results\nNone yet.", "## Results\n" + head + "\n|---|---|---|---|---|---|---|---|---|---|")
    lines = txt.rstrip("\n").split("\n"); i = max(n for n, l in enumerate(lines) if l.startswith("|"))
    lines.insert(i + 1, row)
    open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("recorded in collaborators/MODEL_ACCURACY.md")


if __name__ == "__main__":
    argv, args, VAL = sys.argv[1:], [], ("--key", "--record", "--cost", "--agent")
    i = 0
    while i < len(argv):
        if argv[i] in VAL: i += 2; continue
        if not argv[i].startswith("--"): args.append(argv[i])
        i += 1
    if "--key" not in sys.argv or not args: sys.exit(__doc__)
    kp = sys.argv[sys.argv.index("--key") + 1]
    key, hit = check_commitment(kp)
    out = json.load(open(args[0], encoding="utf-8"))
    tally, conf = score(key["items"], out)
    s = summarize(tally, conf, len(key["items"]), sum(1 for k in key["items"] if (out.get(k) or out.get(k + ".webp"))))
    if "--json" in sys.argv: print(json.dumps({"fields": tally, **s}, indent=1))
    else:
        print(f"{key['set']} pack {key['made'][:10]} ({key['prompt_version']}): {s['answered']} of {s['photos']} photos answered")
        print(f"{'field':8} {'ok':>4} {'wrong':>6} {'abst':>5} {'n':>4}")
        for f, t in tally.items(): print(f"{f:8} {t['correct']:>4} {t['wrong']:>6} {t['abstained']:>5} {t['n']:>4}")
        print(f"core accuracy {s['core_accuracy']:.1%}   KM {s['km_accuracy']:.1%}   invented-value rate {s['invented_rate']:.1%}   false confidence {s['false_confidence']:.0%}")
    if "--record" in sys.argv:
        cost = sys.argv[sys.argv.index("--cost") + 1] if "--cost" in sys.argv else None
        record(sys.argv[sys.argv.index("--record") + 1], key["prompt_version"], key["set"], s, cost, key["made"])
        if "--agent" in sys.argv:
            cal = os.path.join(ROOT, "docs", "agents", "homework", "calibration.jsonl")
            os.makedirs(os.path.dirname(cal), exist_ok=True)
            with open(cal, "a", encoding="utf-8", newline="\n") as fh:
                fh.write(json.dumps({"agent": sys.argv[sys.argv.index("--agent") + 1], "pack": key["set"], "made": key["made"][:10], "date": datetime.date.today().isoformat(),
                                     "core_accuracy": round(s["core_accuracy"], 3), "invented_rate": round(s["invented_rate"], 3),
                                     "false_confidence": round(s["false_confidence"], 3), "answered": s["answered"], "photos": s["photos"]}) + "\n")
            print("logged in docs/agents/homework/calibration.jsonl")
