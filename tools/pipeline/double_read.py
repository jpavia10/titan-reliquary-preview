#!/usr/bin/env python3
"""Two AIs read each new coin, blind (fix list #55). Compare their Phase 1 change files BEFORE either is merged.

    python3 tools/pipeline/double_read.py FILE_A.jsonl FILE_B.jsonl [--log]

Protocol (docs/protocols/DOUBLE_READ.md): for the next 10 new coins, Muse and Grok each read the same NOID photo and drop an ordinary
Phase 1 change file without opening the other's file first. This tool pairs their new coins (by the photo named in provenance.inputs,
else by NEW-n order) and compares country, year, denomination, mint mark and default value:
  agree      both said the same: merge either file (the agreed facts are now backed by two independent reads)
  disagree   the owner or the photo decides: the tool prints the question to put in collection/owner_questions.json after the merge
  unpaired   a photo only one AI read
--log appends one line per pair to collaborators/DOUBLE_READS.jsonl (agreement data for scoring, fix list #18).
Read-only otherwise: it never merges or edits anything.
"""
import datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
FIELDS = ("country", "year", "denomination", "mint", "value")


def load(path):
    ev = [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]
    by = next((e.get("by") for e in ev if e.get("by")), "?")
    return by, ev


def _photo(e):
    for i in (e.get("provenance") or {}).get("inputs") or []:
        f = os.path.basename(str(i.get("file") or ""))
        if f: return f
    m = re.search(r"\b(NOID[\w.-]+\.(?:jpe?g|png|heic|webp))", json.dumps(e.get("new") or {}), re.I)
    return m.group(1) if m else None


def readings(events, col):
    """-> [{photo, new_id, country, year, denomination, mint, value}] for every specimen this file creates."""
    new_types = {e["id"]: e["new"] for e in events if e.get("entity") == "type" and e.get("op") == "create" and isinstance(e.get("new"), dict)}
    out = []
    for e in events:
        if not (e.get("entity") == "specimen" and e.get("op") == "create" and isinstance(e.get("new"), dict)): continue
        n = e["new"]; tid = n.get("type"); t = new_types.get(tid) or col["types"].get(tid) or {}
        d = t.get("denomination") or {}
        iso = t.get("country") or (tid.split(".")[0] if tid else None)
        out.append({"photo": _photo(e), "new_id": e.get("id"), "type": tid, "country": iso,
                    "year": (n.get("issue") or {}).get("year"),
                    "denomination": (f"{d.get('value'):g} {d.get('unit') or ''}".strip() if d.get("value") is not None else d.get("named") or d.get("display")),
                    "mint": "/".join((n.get("issue") or {}).get("mint_marks") or []) or "none",
                    "value": (n.get("value") or {}).get("est_usd")})
    return out


def _same(f, a, b):
    if f == "value":   # a default value is an estimate: within 50 % (or 10 cents) counts as the same
        if a is None or b is None: return a == b
        return abs(a - b) <= max(0.10, 0.5 * max(a, b))
    if f == "denomination": return re.sub(r"s\b", "", str(a or "").lower()) == re.sub(r"s\b", "", str(b or "").lower())
    return a == b


def pair(ra, rb):
    pairs, used = [], set()
    for a in ra:
        j = next((k for k, b in enumerate(rb) if k not in used and a["photo"] and (b["photo"] or "").lower() == a["photo"].lower()), None)
        if j is not None: used.add(j); pairs.append((a, rb[j]))
    left_a = [a for a in ra if not any(a is p[0] for p in pairs)]
    left_b = [b for k, b in enumerate(rb) if k not in used]
    if left_a and len(left_a) == len(left_b) and not any(x["photo"] for x in left_a + left_b):   # no photo names: fall back to NEW-n order
        pairs += list(zip(left_a, left_b)); left_a, left_b = [], []
    return pairs, left_a, left_b


def compare(path_a, path_b, col):
    by_a, ea = load(path_a); by_b, eb = load(path_b)
    pairs, ua, ub = pair(readings(ea, col), readings(eb, col))
    rows = []
    for a, b in pairs:
        diff = [f for f in FIELDS if not _same(f, a[f], b[f])]
        rows.append({"photo": a["photo"] or b["photo"], "a": a, "b": b, "agree": [f for f in FIELDS if f not in diff], "disagree": diff})
    return {"a": by_a, "b": by_b, "file_a": os.path.basename(path_a), "file_b": os.path.basename(path_b), "pairs": rows, "only_a": ua, "only_b": ub}


def report(r):
    L = [f"double read: {r['a']} ({r['file_a']}) vs {r['b']} ({r['file_b']})"]
    for p in r["pairs"]:
        tag = "AGREE   " if not p["disagree"] else "DISAGREE"
        L.append(f"  {tag} {p['photo'] or p['a']['new_id']}: " + ", ".join(f"{f} {p['a'][f]!r}" for f in FIELDS if f in p["agree"]))
        for f in p["disagree"]:
            L.append(f"           {f}: {r['a']} says {p['a'][f]!r}, {r['b']} says {p['b'][f]!r}  -> owner question after the merge: "
                     f"\"Look at the new coin in {p['photo'] or 'the photo'}: is the {f} {p['a'][f]} or {p['b'][f]}?\"")
    for x in r["only_a"]: L.append(f"  ONLY {r['a']}: {x['photo'] or x['new_id']}")
    for x in r["only_b"]: L.append(f"  ONLY {r['b']}: {x['photo'] or x['new_id']}")
    n = len(r["pairs"]); full = sum(1 for p in r["pairs"] if not p["disagree"])
    fields = sum(len(p["agree"]) for p in r["pairs"]); tot = n * len(FIELDS)
    L.append(f"  {full} of {n} coins fully agree; {fields} of {tot} facts agree" + (f" ({100 * fields / tot:.0f} %)" if tot else ""))
    return "\n".join(L)


def log(r):
    p = os.path.join(ROOT, "collaborators", "DOUBLE_READS.jsonl")
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(p, "a", encoding="utf-8", newline="\n") as fh:
        for x in r["pairs"]:
            fh.write(json.dumps({"ts": now, "photo": x["photo"], "a": r["a"], "b": r["b"], "agree": x["agree"], "disagree": x["disagree"],
                                 "a_says": {f: x["a"][f] for f in x["disagree"]}, "b_says": {f: x["b"][f] for f in x["disagree"]}}, ensure_ascii=False) + "\n")
    print(f"logged {len(r['pairs'])} pair(s) to collaborators/DOUBLE_READS.jsonl")


if __name__ == "__main__":
    files = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(files) != 2: sys.exit(__doc__)
    import build_app_data as B
    col = B.load_collection(os.path.join(ROOT, "collection"))
    r = compare(files[0], files[1], col)
    print(report(r))
    if "--log" in sys.argv: log(r)
