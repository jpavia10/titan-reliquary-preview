#!/usr/bin/env python3
"""The Phase 1 finish line (fix list #57) and the trust meter (#75). Pure functions; publish.py puts the counts in data/status.json
(`phase1`, `trust`) and the per-coin list in data/reshoot.json (`phase1`).

Phase 1 is done for a piece when it has all 7 of these (definition frozen 2026-10-08; changing it needs the owner):
  photo         at least one live phone photo (either side)
  country       the type names a country
  year          the coin has a year (or is recorded as undated: qualifier "ND")
  denomination  the type has a denomination
  mint          the mint mark was read from the coin (a mark, or a clear "no mint mark"); "unknown", "not on the shown side" and the like do not count
  story         a short story
  value         a default value (value.est_usd)

The trust meter counts every fact the coin view shows (provenance.facts_present) by its certainty label (provenance.LEVELS):
  cited or confirmed = verified + owner + reference;  photo = read from a photo;  ai = an AI said it, no exact source yet;
  imported = from the original ledger (never cited);  review = under question.
    python3 tools/pipeline/phase1.py [collection/]     prints both
"""
import collections, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import provenance as PV  # noqa: E402
from truth_checks import MINT_UNSEEN  # noqa: E402

FIELDS = ("photo", "country", "year", "denomination", "mint", "story", "value")
LABEL = {"photo": "phone photo", "country": "country", "year": "year", "denomination": "denomination", "mint": "mint mark read from the coin",
         "story": "story", "value": "default value"}
MINT_NOT_READ = re.compile(MINT_UNSEEN.pattern + r"|not (?:yet )?read|unclear|not clear", re.I)
CITED = ("verified", "owner", "reference")


def live_photo_ids(col):
    return {p["specimen"] for p in col["photos"] if not p.get("superseded_by") and (p.get("review") or {}).get("status") not in ("rejected", "reshoot")}


def mint_read(issue):
    if issue.get("mint_marks"): return True
    txt = (issue.get("mint_text") or "").strip()
    return bool(txt) and not MINT_NOT_READ.search(txt)


def lacks(col, s, photos=None):
    """-> the Phase 1 fields this specimen still lacks, in FIELDS order."""
    photos = live_photo_ids(col) if photos is None else photos
    t = col["types"].get(s["type"]) or {}; i = s.get("issue") or {}; d = t.get("denomination") or {}
    have = {"photo": s["id"] in photos, "country": bool(t.get("country")), "year": i.get("year") is not None or i.get("qualifier") == "ND",
            "denomination": d.get("value") is not None or bool(d.get("named") or d.get("display")), "mint": mint_read(i),
            "story": bool((s.get("story") or "").strip()), "value": (s.get("value") or {}).get("est_usd") is not None}
    return [f for f in FIELDS if not have[f]]


def _active(col):
    return {k: s for k, s in sorted(col["specs"].items()) if (s.get("lifecycle") or {}).get("status") != "Removed"}


def items(col):
    """[{id, lacks}] for every live piece that is not through Phase 1 yet."""
    photos = live_photo_ids(col)
    return [{"id": k, "lacks": l} for k, s in _active(col).items() for l in [lacks(col, s, photos)] if l]


def summary(col):
    act = _active(col); todo = items(col)
    miss = collections.Counter(f for r in todo for f in r["lacks"])
    done = len(act) - len(todo)
    return {"fields": list(FIELDS), "total": len(act), "done": done, "pct": round(100 * done / len(act), 1) if act else 0.0,
            "missing": {f: miss.get(f, 0) for f in FIELDS},
            "note": "a piece is through Phase 1 when it has all 7 fields; the per-coin list is in data/reshoot.json (phase1)"}


def details_from(out):
    """{sid: detail} from a built data/ folder (data/detail/*.json)."""
    det = {}
    for p in sorted(glob.glob(os.path.join(out, "detail", "*.json"))):
        with open(p, encoding="utf-8") as fh: det.update(json.load(fh))
    return det


def trust(details):
    lv = collections.Counter()
    for d in details.values():
        cert = d.get("certainty") or {}
        for f in PV.facts_present(d): lv[PV.level_of(cert, f)] += 1
    n = sum(lv.values()); pct = lambda x: round(100 * x / n, 1) if n else 0.0
    cited = sum(lv[k] for k in CITED)
    return {"facts": n, "by_level": {k: lv.get(k, 0) for k in PV.LEVELS}, "cited_or_confirmed": cited, "pct_cited": pct(cited),
            "pct_photo": pct(lv["photo"]), "pct_ai": pct(lv["ai"]), "pct_ledger": pct(lv["imported"]), "pct_review": pct(lv["review"]),
            "note": "every fact the coin view shows, by its certainty label; cited or confirmed = verified + owner + reference"}


if __name__ == "__main__":
    import build_app_data as B
    col = B.load_collection(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "collection"))
    print(json.dumps(summary(col), indent=1))
    _, det = B.build_specimens(col)
    print(json.dumps(trust({k: v for recs in det.values() for k, v in recs.items()}), indent=1))
