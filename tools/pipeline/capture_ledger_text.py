#!/usr/bin/env python3
"""One-time bridge: keep the ledger v254 display wording that cannot be derived from v2 facts, as ChangeEvents.

usage (repo root):  python3 tools/pipeline/capture_ledger_text.py [collection/ [golden_data/]] > changes_{agent}_{ts}.jsonl
Then apply with tools/pipeline/apply_changes.py.

For every specimen it builds the detail record from the collection WITHOUT any ledger_text, compares it with the golden
data/ (ledger v254 publish) and writes ONE event per specimen (only when its ledger_text would change) that sets `ledger_text` to the golden strings that differ
(after number/space normalisation). A field is skipped when a ChangeEvent deliberately changed the fact behind it
(curated): the curated value wins. The exception is photo_stem: Drive master photo names were built from the v254
stem, so it is always frozen to the golden spelling.
"""
import datetime, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import build_app_data as B
from test_parity import curated_map, norm

EXEMPT_ALWAYS = {"label", "refs", "denom", "cat"}     # a deliberate curation event changed the fact behind these: the curated value wins
FIELDS = ("label", "face", "metal", "refs", "specs", "denom", "cat", "photo_stem", "mint")

def _amount(txt):
    m = re.search(r"\d+(?:\.\d+)?", txt or "")
    return float(m.group()) if m else None

def main(argv):
    coll = argv[0] if argv else os.path.join(ROOT, "collection"); gold = argv[1] if len(argv) > 1 else os.path.join(ROOT, "data")
    col = B.load_collection(coll); cur = curated_map(coll)
    golden = {}
    for p in glob.glob(f"{gold}/detail/*.json"): golden.update({k: v for k, v in json.load(open(p, encoding="utf-8")).items()})
    ts = os.environ.get("CAPTURE_TS", "2026-09-30T22:10:00Z"); n = 0
    for sid in sorted(col["specs"]):
        s = dict(col["specs"][sid]); had = s.pop("ledger_text", None)
        det = B.specimen_detail(col, s, col["types"][s["type"]]); g = golden[sid]; lt = {}
        for f in FIELDS:
            gv, dv = g.get(f), det.get(f)
            if gv == dv or norm(gv) == norm(dv): continue
            why = cur.get((sid, f)) or (f == "denom" and cur.get((sid, "denom_line")))
            if f == "specs":
                segs = B.split_segs(gv)
                if why:       # curated thickness/alignment: keep only the ledger's remark after them
                    ai = next((i for i, x in enumerate(segs) if "alignment" in x), 0)
                    tail = " · ".join(segs[ai + 1:])
                    if tail: lt["specs_tail"] = tail
                    continue
            elif f == "photo_stem": pass
            elif f == "face" and why and _amount(gv) is not None and _amount(dv) is not None and _amount(gv) != _amount(dv): continue      # the face amount itself was corrected
            elif why and (f in EXEMPT_ALWAYS or any(w in why for w in ("composition", "weight_g", "thickness"))): continue
            lt[f] = gv
        fl = B.specimen_detail(col, {**s, "ledger_text": lt}, col["types"][s["type"]]).get("face_line")      # face_line follows face; keep its own text only when the ledger added more (Melt ...)
        if fl != g.get("face_line") and norm(fl) != norm(g.get("face_line")) and not ((sid, "face_line") in cur and "face" not in lt and (sid, "face") in cur): lt["face_line"] = g["face_line"]
        if lt == (had or {}): continue
        n += 1
        print(json.dumps({"ts": ts, "by": "model:sonnet-5.5", "entity": "specimen", "id": sid, "field": "ledger_text", "old": had, "new": lt or None,
                          "source": "ledger v254 data/detail/ wording kept verbatim (display string not derivable from v2 facts); photo_stem frozen to the v254 spelling",
                          "verified": False, "phase": 2, "confidence": "high"}, ensure_ascii=False, sort_keys=True))
    print(f"{n} specimens carry ledger_text", file=sys.stderr)

if __name__ == "__main__":
    main(sys.argv[1:])
