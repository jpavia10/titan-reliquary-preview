#!/usr/bin/env python3
"""Truth checks: contradictions and claims more specific than their evidence (deep review round 1: ChatGPT's "no field may be more
specific than the evidence supporting it", Grok's mintage lints). Integrity (integrity.py) asks "is the graph well formed?"; this asks
"does the record contradict itself?". Run on every publish: the counts go into data/status.json (`truth`), the list into data/truth.json.

    python3 tools/pipeline/truth_checks.py [collection/]           report
    python3 tools/pipeline/truth_checks.py [collection/] --fix     also write the mechanical fixes as a script change file in
                                                                   collection/_incoming/ (then run publish.py): type issue mintages
                                                                   backfilled from their coins, coin copies synced from the type,
                                                                   'unknown' mintage text cleared where a number exists

Rules (rule id: what it means)
  issue_disagrees      two coins of the same type, year and mint marks carry different mintages (one issue, one number)
  copy_differs         a coin's issue copy and its type issue disagree (the type is the home of the mintage)
  number_but_unknown   a mintage number next to text that says it is unknown
  mint_unknown         a US or German coin with no readable mint mark but a mintage figure (those countries strike at several mints,
                       so the figure must be the all-mints total; check it)
  two_numbers          a type carries two numbers in the same catalogue (two different coins on one record)
  weight_off           a coin's measured weight is more than 8 % from the type's catalogue weight
  year_not_issued      a coin's year is not one of its type's issues
  euro_too_early       a euro coin dated before its country adopted the euro
  us_silver_year       a US dime / quarter / half whose silver content does not fit its year (90 % ends in 1964; 1965-70 halves are 40 %)
"""
import collections, datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

EURO_FROM = {"AT": 1999, "BE": 1999, "DE": 1999, "ES": 1999, "FI": 1999, "FR": 1999, "IE": 1999, "IT": 1999, "LU": 1999, "NL": 1999, "PT": 1999,
             "GR": 2001, "MC": 2001, "SM": 2002, "VA": 2002, "SI": 2007, "CY": 2008, "MT": 2008, "SK": 2009, "EE": 2011, "LV": 2014, "LT": 2015,
             "AD": 2014, "HR": 2023}
MULTI_MINT = {"US", "DE"}
UNKNOWN_TXT = re.compile(r"\bunknown\b|not (?:yet )?(?:known|found)", re.I)
MINT_UNSEEN = re.compile(r"mixed|not shown|not visible|not on (?:the )?shown|unknown|unreadable", re.I)


def _key(i):
    return (i["year"], tuple(i["mint_marks"]), i.get("qualifier"))


def findings(col):
    """col: build_app_data.load_collection() dict or a collection_io.Collection (types/specs as dicts). -> list of findings."""
    types = col["types"] if isinstance(col, dict) else col.types
    specs = col["specs"] if isinstance(col, dict) else col.specs
    out = []
    add = lambda rule, rid, field, detail: out.append({"rule": rule, "id": rid, "field": field, "detail": detail})
    live = {k: s for k, s in specs.items() if (s.get("lifecycle") or {}).get("status") != "Removed"}
    groups = collections.defaultdict(list)
    for k, s in live.items(): groups[(s["type"],) + _key(s["issue"])].append(k)
    for g, ids in sorted(groups.items()):
        ms = {live[i]["issue"].get("mintage") for i in ids} - {None}
        if len(ms) > 1: add("issue_disagrees", ",".join(ids), "issue.mintage", f"{g[0]} {g[1]}: " + ", ".join(f"{i} {live[i]['issue'].get('mintage'):,}" if live[i]['issue'].get('mintage') is not None else f"{i} none" for i in ids))
    for k, s in sorted(live.items()):
        t = types.get(s["type"]) or {}
        si = s["issue"]; ti = next((i for i in t.get("issues") or [] if _key(i) == _key(si)), None)
        if ti is None:
            add("year_not_issued", k, "issue.year", f"{s['type']} has no issue {si['year']} {'/'.join(si['mint_marks'])}".strip())
        elif ti.get("mintage") != si.get("mintage"):
            add("copy_differs", k, "issue.mintage", f"coin {si.get('mintage')} vs type {s['type']} {ti.get('mintage')}")
        if si.get("mintage") is not None and UNKNOWN_TXT.search(si.get("mintage_text") or ""):
            add("number_but_unknown", k, "issue.mintage_text", f"{si['mintage']:,} next to {si['mintage_text'][:60]!r}")
        iso = t.get("country") or ""
        if (iso in MULTI_MINT and not si["mint_marks"] and si.get("mintage") is not None and MINT_UNSEEN.search(si.get("mint_text") or "")):
            add("mint_unknown", k, "issue.mintage", f"{iso} {si['year']}: mint not read ({(si.get('mint_text') or '')[:50]}); {si['mintage']:,} must be the all-mints total")
        w = (s.get("measured") or {}).get("weight_g"); nw = (t.get("nominal") or {}).get("weight_g")
        if w and nw and abs(w - nw) / nw > 0.08: add("weight_off", k, "measured.weight_g", f"{w} g measured vs {nw} g catalogue")
        cur = (t.get("denomination") or {}).get("currency")
        if cur == "EUR" and si["year"] and iso in EURO_FROM and si["year"] < EURO_FROM[iso]:
            add("euro_too_early", k, "issue.year", f"{iso} adopted the euro in {EURO_FROM[iso]}, coin dated {si['year']}")
        if iso == "US" and si["year"]:
            v = (t.get("denomination") or {}).get("value"); txt = ((t.get("composition") or {}).get("text") or "").lower()
            if v in (10.0, 25.0, 50.0):
                silver90 = "90%" in txt or "90 %" in txt; silver40 = "40%" in txt or "40 %" in txt; clad = "clad" in txt and not (silver90 or silver40)
                y = si["year"]
                if (silver90 and y >= 1965) or (silver40 and not (v == 50.0 and 1965 <= y <= 1970)) or (clad and y <= 1964):
                    add("us_silver_year", k, "type.composition", f"{v:g}¢ {y}: {txt[:40]!r}")
    for k, t in sorted(types.items()):
        c = collections.Counter(x.get("system") for x in t.get("catalogs") or [])
        for sysname, n in c.items():
            if n > 1: add("two_numbers", k, "catalogs", f"{n} {sysname} numbers: " + ", ".join(x["number"] for x in t["catalogs"] if x.get("system") == sysname))
    return out


def summary(fs):
    return {"total": len(fs), "by_rule": dict(sorted(collections.Counter(f["rule"] for f in fs).items()))}


def fix_events(coll_dir, now):
    """Mechanical fixes as ChangeEvents (by script:truth-checks): backfill a type issue's mintage from its coins when they all agree and the
    type has none; sync a coin's copy from the type when the coin has none; clear 'unknown' text next to a number."""
    import collection_io as C
    col = C.Collection(coll_dir); ev = []
    def mk(ent, rid, field, old, new, src):
        e = {"ts": now, "by": "script:truth-checks", "entity": ent, "id": rid, "field": field, "old": old, "new": new, "source": src, "verified": False}
        if field.endswith("mintage_text"): del e["old"]      # an earlier backfill in the same file may already have cleared it (no change then)
        ev.append(e)
    groups = collections.defaultdict(list)
    for k, s in col.specs.items(): groups[(s["type"],) + _key(s["issue"])].append(s)
    for g, ss in sorted(groups.items()):
        t = col.types.get(g[0])
        if not t: continue
        n = next((n for n, i in enumerate(t["issues"]) if _key(i) == g[1:]), None)
        if n is None: continue
        ti = t["issues"][n]; ms = {s["issue"].get("mintage") for s in ss} - {None}
        if ti.get("mintage") is None and len(ms) == 1:
            m = ms.pop(); src = next(s["id"] for s in ss if s["issue"].get("mintage") == m)
            mk("type", t["id"], f"issues.{n}.mintage", None, m, f"one issue, one number: backfilled from coin {src} (deep review GRK-3-05); the coin's own event carries the citation")
            ti = dict(ti, mintage=m)
        if ti.get("mintage") is not None:
            for s in ss:
                if s["issue"].get("mintage") is None:
                    mk("specimen", s["id"], "issue.mintage", None, ti["mintage"], f"one issue, one number: copied from its type issue {t['id']} {g[1]}")
        if ti.get("mintage") is not None and UNKNOWN_TXT.search(ti.get("mintage_text") or ""):
            mk("type", t["id"], f"issues.{n}.mintage_text", ti["mintage_text"], None, f"cleared: says unknown next to the mintage {ti['mintage']:,}")
        for s in ss:
            m = s["issue"].get("mintage") if s["issue"].get("mintage") is not None else ti.get("mintage")
            if m is not None and UNKNOWN_TXT.search(s["issue"].get("mintage_text") or ""):
                mk("specimen", s["id"], "issue.mintage_text", s["issue"]["mintage_text"], None, f"cleared: says unknown next to the mintage {m:,}")
    return ev


def main(argv):
    import build_app_data as B
    coll = next((a for a in argv if not a.startswith("--")), os.path.join(ROOT, "collection"))
    fs = findings(B.load_collection(coll))
    for f in fs: print(f"  {f['rule']:<18} {f['id']:<12} {f['detail']}")
    print(json.dumps(summary(fs)))
    if "--fix" in argv:
        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        ev = fix_events(coll, now)
        if ev:
            out = os.path.join(coll, "_incoming", f"changes_script_{now[:10].replace('-', '')}-{now[11:16].replace(':', '')}-truth-fixes.jsonl")
            with open(out, "w", encoding="utf-8", newline="\n") as fh:
                for e in ev: fh.write(json.dumps(e, ensure_ascii=False) + "\n")
            print(f"wrote {len(ev)} fix event(s) to {os.path.relpath(out, ROOT)} (run publish.py)")
        else: print("nothing to fix mechanically")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
