#!/usr/bin/env python3
"""Collector values from Numista's price estimates (fix list #62). Run by .github/workflows/coin-values.yml on GitHub's machines (the Claude
container cannot reach Numista). Needs the repository secret NUMISTA_API_KEY (a free key from numista.com > API); without it, it does nothing.

usage (repo root):  NUMISTA_API_KEY=... python3 tools/prices/fetch_numista_values.py [--max-requests 400] [--days 30] [--dry-run]

For every coin type that carries a Numista number (catalogs system "Numista"), it reads the type's issues, matches each issue a coin in the
collection holds (year + mint letter), and stores Numista's price estimates per grade in USD:

  collection/prices/numista_values.json   {"fetched_at", "source", "types": {type id: {"numista": N, "url", "fetched_at",
                                            "issues": {"1968 B": {"issue_id", "prices": {"f": 0.4, "vf": 0.6, ...}}}}}}

Tier "system": this script is the only writer. It never changes a coin's value: the research loop shows the row to the appraiser
(tools/agents/homework.py, kind `value`), who picks the grade from the photo and cites the entry. A type fetched less than --days ago
is skipped, so the free request budget covers the collection over a few runs. API: https://api.numista.com/v3 (header Numista-API-Key).
"""
import datetime, json, os, sys, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
API = "https://api.numista.com/v3"
OUT = os.path.join(ROOT, "collection", "prices", "numista_values.json")


def now(): return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(path, key, params=None):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={"Numista-API-Key": key, "User-Agent": "titan-reliquary coin values (+github.com/jpavia10/titan-reliquary-preview)"})
    with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read().decode("utf-8"))


def wanted(coll):
    """{type id: (numista number, [(year, mint letters)])} for live coins of types with a Numista number."""
    types, specs = {}, {}
    for d, store in (("types", types), ("specimens", specs)):
        for f in sorted(os.listdir(os.path.join(coll, d))):
            if f.endswith(".json"): store.update(json.load(open(os.path.join(coll, d, f), encoding="utf-8")))
    out = {}
    for s in specs.values():
        if (s.get("lifecycle") or {}).get("status") == "Removed": continue
        t = types.get(s["type"]) or {}
        n = next((str(c.get("number")) for c in t.get("catalogs") or [] if c.get("system") in ("Numista", "N") and str(c.get("number") or "").isdigit()), None)
        if not n: continue
        out.setdefault(s["type"], (n, set()))[1].add((s["issue"].get("year"), "".join(s["issue"].get("mint_marks") or [])))
    return out


def match(issues, year, mint):
    hit = [i for i in issues if i.get("gregorian_year") == year or i.get("year") == year]
    if mint: hit = [i for i in hit if (i.get("mint_letter") or "").replace(" ", "") == mint] or hit
    else: hit = [i for i in hit if not i.get("mint_letter")] or hit
    return hit[0] if len(hit) >= 1 else None


def main(argv):
    key = os.environ.get("NUMISTA_API_KEY", "").strip()
    if not key:
        print("NUMISTA_API_KEY is not set: nothing fetched (add the repository secret to switch this on)"); return 0
    budget = int(argv[argv.index("--max-requests") + 1]) if "--max-requests" in argv else 400
    days = int(argv[argv.index("--days") + 1]) if "--days" in argv else 30
    data = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"source": "Numista API v3 price estimates (USD)", "types": {}}
    cut = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    used = 0; done = 0; errors = []
    for tid, (num, held) in sorted(wanted(os.path.join(ROOT, "collection")).items()):
        old = data["types"].get(tid)
        if old and old.get("fetched_at", "") > cut and all(f"{y} {m}".strip() in old.get("issues", {}) for y, m in held): continue
        if used + 1 + len(held) > budget: break
        try:
            iss = get(f"/types/{num}/issues", key); used += 1
            rows = {}
            for y, m in sorted(held, key=lambda x: (x[0] or 0, x[1])):
                i = match(iss if isinstance(iss, list) else iss.get("issues", []), y, m)
                if not i: rows[f"{y} {m}".strip()] = {"issue_id": None, "prices": {}, "note": "no matching issue on the entry"}; continue
                p = get(f"/types/{num}/issues/{i['id']}/prices", key, {"currency": "USD"}); used += 1
                rows[f"{y} {m}".strip()] = {"issue_id": i["id"], "prices": {r["grade"]: r["price"] for r in p.get("prices", []) if r.get("price") is not None}}
            data["types"][tid] = {"numista": int(num), "url": f"https://en.numista.com/catalogue/pieces{num}.html", "fetched_at": now(), "issues": rows}
            done += 1
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, KeyError, TypeError) as x:
            errors.append(f"{tid} (N#{num}): {type(x).__name__}: {str(x)[:120]}")
            if isinstance(x, urllib.error.HTTPError) and x.code in (401, 403, 429): break      # bad key or out of quota: stop, keep what we have
    data["fetched_at"] = now()
    print(f"{done} type(s) fetched with {used} request(s); {len(data['types'])} in the file" + "".join("\n  error " + e for e in errors[:20]))
    if "--dry-run" not in argv and done:
        with open(OUT, "w", encoding="utf-8", newline="\n") as fh: json.dump(data, fh, ensure_ascii=False, indent=1, sort_keys=True); fh.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
