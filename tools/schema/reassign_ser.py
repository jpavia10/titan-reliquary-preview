#!/usr/bin/env python3
"""DRY-RUN plan for the one-time serial (`ser`) reassignment. It NEVER edits collection/.

usage (repo root):  python3 tools/schema/reassign_ser.py collection/ [--out collection/SER_REASSIGN_PLAN.md]

Owner's order (2026-09-30): Phase 1 metadata for every coin -> THEN one reassignment with NO bias to scan order -> THEN Phase 2 pro photos
(the owner writes the new ser on the flip). `ser` is frozen only after that; the permanent key is `id` (C###).
Sort order: continent -> country -> year -> denomination. Ties (same country, year and denomination) are broken by a hash of the id
with a published salt, NOT by id or scan order, so no coin is favoured for having been scanned early.
    key = (continent name, country name, year [ND/unknown last], face value, denomination unit, mint marks, sha256(SALT + id))
New ser = {continent code}-{ISO}-{NNN}, numbered from 001 within each ISO, in that order. The continent code and ISO stay as they are.
"""
import hashlib, json, glob, os, sys

SALT = "titan-reliquary/ser-reassign/v1:"

def load(p): return json.load(open(p, encoding="utf-8"))

def plan(d):
    issuers = {i["id"]: i for i in load(f"{d}/ref/issuers.json")}
    types = {}; specs = []
    for p in sorted(glob.glob(f"{d}/types/*.json")): types.update(load(p))
    for p in sorted(glob.glob(f"{d}/specimens/*.json")): specs += list(load(p).values())
    rows = []
    for s in specs:
        t = types[s["type"]]; iso = t["country"]; i = issuers[iso]
        face = s["value"]["face"]["amount"]
        if face is None: face = t["denomination"]["value"]
        y = s["issue"]["year"]
        key = (i["continent"], i["name"], 9999 if y is None else y, face if face is not None else 1e12, t["denomination"]["unit"].lower(),
               ",".join(s["issue"]["mint_marks"]), hashlib.sha256((SALT + s["id"]).encode()).hexdigest())
        rows.append((key, s, t, iso))
    rows.sort(key=lambda r: r[0])
    seq = {}; out = []
    for key, s, t, iso in rows:
        seq[iso] = seq.get(iso, 0) + 1
        code = s["ser"].split("-")[0]
        out.append({"id": s["id"], "old": s["ser"], "new": f"{code}-{iso}-{seq[iso]:03d}", "iso": iso, "continent": key[0], "country": key[1], "year": s["issue"]["year"], "year_raw": s["year_raw"], "denom": t["denomination"]})
    return out

def readiness(d):
    """What still blocks applying the plan: Phase 1 at 100 % (#57) and the owner's East Caribbean code answer (#3)."""
    root = os.path.dirname(os.path.abspath(d)); L = []
    st = os.path.join(root, "data", "status.json"); qs = os.path.join(root, "data", "questions.json")
    p1 = load(st).get("phase1") or {} if os.path.exists(st) else {}
    if p1: L.append(f"- Phase 1 finish line: {p1.get('done')} of {p1.get('total')} pieces ({p1.get('pct')} %); the plan is applied only at 100 %, so the numbers below still move.")
    q = [x for x in (load(qs).get("questions") or [])] if os.path.exists(qs) else []
    if any(x.get("id") == "q-ec-code" for x in q): L.append("- Open owner question q-ec-code (East Caribbean filed as EC, which is Ecuador's code; XC?): the answer changes those coins' country code.")
    return L or ["- Nothing blocks it any more: ask the owner for the go."]

def render(d, out):
    import fmt
    n_changed = sum(1 for r in out if r["old"] != r["new"])
    news = [r["new"] for r in out]
    assert len(set(news)) == len(news), "new ser values are not unique"
    L = ["# Serial reassignment plan (DRY RUN)", "",
         "> **NOT APPLIED. Run after Phase 1 completes** (every coin has its initial metadata). Nothing in `collection/` was changed by this file; `ser` values in the records are still the ledger's.", "",
         "Method: sort by continent, then country, then year (no-date last), then face value; ties are broken by a hash of the permanent `id` (salt `%s`), not by scan order. "
         "New `ser` = continent code + ISO + a 3-digit sequence from 001 within each ISO. The permanent key `id` (`C###`/`T###`) never changes." % SALT.rstrip(":"), "",
         f"- specimens: {len(out)}; ser values that would change: {n_changed}; unchanged: {len(out) - n_changed}; all new values unique: yes", "",
         "**Owner decision (2026-10-21, fix list #5): the numbers are grouped by country** (EU-CH-001, EU-CH-002 ... in year order), "
         "not a plain number with no pattern. The new `ser` is what the owner writes on each flip's back for Phase 2.", "",
         "Ready to apply?"] + readiness(d) + ["",
         "Regenerate: `python3 tools/schema/reassign_ser.py collection/` (deterministic). Applying the plan is a separate step, run once Phase 1 is at 100 %: rewrite `ser` in `specimens/*.json` and `boot.json`, "
         "append one ChangeEvent per specimen (`field: ser`), refresh the manifest, then tell the photo workflow the new numbers.", ""]
    cur = None
    for r in out:
        if (r["continent"], r["country"]) != cur:
            cur = (r["continent"], r["country"]); L += ["", f"## {cur[0]} / {cur[1]} ({r['iso']})", "", "| id | year | denomination | old ser | new ser |", "|---|---|---|---|---|"]
        L.append(f"| {r['id']} | {r['year_raw']} | {fmt.denomination(r['denom'])} | {r['old']} | {r['new']}{'' if r['old'] != r['new'] else ' (same)'} |")
    return "\n".join(L) + "\n"

if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    d = a[0]
    outp = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(d, "SER_REASSIGN_PLAN.md")
    if outp in a: a.remove(outp)
    text = render(d, plan(d))
    open(outp, "w", encoding="utf-8", newline="\n").write(text)
    if os.path.abspath(outp).startswith(os.path.abspath(d) + os.sep):      # the plan lives in collection/: keep its manifest hash current
        import contextlib, io, validate as V
        with contextlib.redirect_stdout(io.StringIO()): V.main(d, update_manifest=True)
    print(f"wrote {outp} (dry run; no record was changed)")
