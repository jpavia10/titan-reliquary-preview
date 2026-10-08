#!/usr/bin/env python3
"""data/reshoot.json: the coins that still need a Phase 1 phone photo, and why.

A flip "has a phone photo" when its specimen has at least one live photo record (either side is enough for Phase 1).
The reason for each missing one comes from the crop log docs/photos/p1_crops.jsonl (written when the photos were cut):
  together   in a group photo next to look-alikes, so the photo cannot show which coin is which -> photograph it alone
  unusable   the photo is blurry, glared or cut off -> retake
  too_big    the photo file is over ~7 MB, which the Drive connector cannot download -> re-upload a smaller copy
  not_round  a paper note or other non-coin item that needs a rectangular crop (Claude's job, nothing to reshoot)
  none       no phone photo was ever filed -> photograph it

Order (fix list #54): every list is sorted the same way:
  1. a photo that settles an open fact comes first (an open owner question about the coin, then an open research question or a year the
     type never issued, then a mint mark not read yet); `settles` says what
  2. then value x doubt (default value x how unsure: value confidence and the share of the coin's facts that nobody has cited or confirmed)
  3. then age (oldest first)
`other_side` is the second batch: coins whose phone photo shows one side only (`side` = the side still needed).
`confirm` (fix list #78): for each coin, up to 3 facts to check while it is in hand, weakest first; the Lab's Confirm button queues them for
the Questions page (tools/pipeline/owner_answers.py turns them into verified owner events).
`phase1` (fix list #57): every piece not through Phase 1 yet and what it lacks (tools/pipeline/phase1.py).
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phase1 as P1  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CROPS = os.path.join(ROOT, "docs", "photos", "p1_crops.jsonl")
STATUS = {"ambiguous": "together", "unusable": "unusable", "download_failed": "too_big"}
ORDER = ("none", "together", "unusable", "too_big", "not_round")
TEXT = {
    "none": "No phone photo yet. Photograph it.",
    "together": "Only in a group photo next to look-alikes. Photograph this flip on its own.",
    "unusable": "The phone photo is too blurry, glared or cut off. Retake it.",
    "too_big": "The photo file is too big to download. Re-upload a smaller copy (under 7 MB).",
    "not_round": "Not a round coin: Claude will cut it as a rectangle. Nothing to reshoot.",
}

def load_crops(path=CROPS):
    rows = []
    if os.path.exists(path):
        for ln in open(path, encoding="utf-8"):
            if ln.strip(): rows.append(json.loads(ln))
    return rows

def ids_of(v):
    """'C042' -> [C042]; group rows from the crop log: 'C167,C168' / 'C187-C192' (a range) / 'C216?' (a guess: skipped)."""
    v = str(v or "").strip()
    if not v or v.endswith("?"): return []
    out = []
    for part in v.split(","):
        part = part.strip()
        m = re.fullmatch(r"([CT])(\d{3})-[CT]?(\d{3})", part)
        if m: out += [f"{m[1]}{n:03d}" for n in range(int(m[2]), int(m[3]) + 1)]
        elif re.fullmatch(r"[CT]\d{3}", part): out.append(part)
    return out

CONF_W = {"low": 1.0, "med": 0.7, "high": 0.4}
WEAK = {"review": 0, "ai": 1, "imported": 2, "photo": 3, "reference": 4}   # owner / verified are never asked again
IN_HAND = ("year", "mint", "denomination", "country")                      # facts you can check by looking at the coin
SETTLE_RULES = ("mint_unknown", "year_not_issued")                          # truth findings a photo of the coin can settle


def doubt(det):
    """0..1: the share of the coin's displayed facts nobody has cited, confirmed or read from a photo."""
    import provenance as PV
    facts = PV.facts_present(det); cert = det.get("certainty") or {}
    return sum(1 for f in facts if PV.level_of(cert, f) in ("ai", "imported", "review")) / len(facts) if facts else 1.0


def confirm_facts(s, det, n=3):
    """Up to n facts to check with the coin in hand, weakest label first; a mint is only offered when a mark was recorded (an empty
    mark list has nothing to confirm)."""
    import provenance as PV
    cert = det.get("certainty") or {}; out = []
    for f in IN_HAND:
        lv = PV.level_of(cert, f)
        if lv not in WEAK: continue
        if f == "mint":
            if not s["issue"].get("mint_marks"): continue
            label = "Mint mark " + "/".join(s["issue"]["mint_marks"])
        elif f == "year":
            if s["issue"].get("year") is None: continue
            label = f"Year {s['issue']['year']}"
        elif f == "denomination": label = str(det.get("denom") or "").split(" · ")[0]
        else: label = str(det.get("country") or "")
        if label: out.append({"fact": f, "label": label, "level": lv})
    return sorted(out, key=lambda x: (WEAK[x["level"]], IN_HAND.index(x["fact"])))[:n]


def settles(sid, s, questions, truth, lacks):
    out = [{"kind": "question", "id": q["id"], "text": q["ask"]} for q in questions if q.get("coin") == sid]
    out += [{"kind": "research", "text": q} for q in (s.get("research") or {}).get("open_questions") or []]
    seen = {f["rule"] for f in truth if f["id"] == sid and f["rule"] in SETTLE_RULES}
    if "mint" in lacks:
        out.append({"kind": "mint", "text": "Mint mark not read yet" + (": the mintage shown has to be the all-mints total until it is" if "mint_unknown" in seen else "")})
    if "year_not_issued" in seen: out.append({"kind": "year", "text": "The year is not one its type lists: read the date"})
    return out


def _row(col, sid, s, det, questions, truth, lacks):
    v = s.get("value") or {}; est = v.get("est_usd") or 0.0
    st = settles(sid, s, questions, truth, lacks)
    score = round(est * CONF_W.get(v.get("confidence"), 0.7) * (0.5 + doubt(det)), 4)
    return {"id": sid, "ser": det.get("ser"), "country": det.get("country"), "year": det.get("year"), "denom": det.get("denom"),
            "est_usd": v.get("est_usd"), "score": score, "settles": st, "confirm": confirm_facts(s, det)}


SETTLE_RANK = {"question": 0, "research": 1, "year": 1, "mint": 2}         # an owner question first, then a research question, then a mint mark


def _sort(rows):
    yr = lambda r: r["year"] if isinstance(r["year"], int) else 9999
    first = lambda r: min((SETTLE_RANK[x["kind"]] for x in r["settles"]), default=9)
    rows.sort(key=lambda r: (first(r), -r["score"], yr(r), r["id"]))
    for n, r in enumerate(rows, 1): r["rank"] = n
    return rows


def build(col, generated_at, crops=None, details=None, questions=None, truth=None):
    """details: {sid: detail with certainty} (publish passes the built data/detail; None = build them here). questions: the open owner
    questions (None = read collection/owner_questions.json minus the answered ones). truth: truth_checks findings (None = run them)."""
    import build_app_data as B
    crops = load_crops() if crops is None else crops
    if details is None:
        _, det = B.build_specimens(col); details = {k: v for recs in det.values() for k, v in recs.items()}
    if questions is None:
        import owner_answers as OA
        d = col.get("dir"); qs = OA.load_questions(d) if d else {}; done = OA.answered_ids(d) if d else set()
        questions = [q for q in qs.values() if q["id"] not in done]
    if truth is None:
        import truth_checks as TC
        truth = TC.findings(col)
    live = [p for p in col["photos"] if not p.get("superseded_by") and (p.get("review") or {}).get("status") not in ("rejected", "reshoot")]
    live_photo = {p["specimen"] for p in live}
    sides = {}
    for p in live: sides.setdefault(p["specimen"], set()).add(p.get("side"))
    by_id = {}
    for r in crops:
        ids = ids_of(r.get("id"))
        if r.get("status") == "download_failed":   # a photo never seen: every id in its file name is waiting on it
            ids = sorted(set(ids) | set(re.findall(r"(?:^|_)([CT]\d{3})(?=_)", r.get("file") or "")))
        for cid in ids: by_id.setdefault(cid, []).append(r)
    pick = ("too_big", "not_round", "together", "unusable")
    items, other, p1 = [], [], []
    for sid, s in sorted(col["specs"].items()):
        if s["lifecycle"]["status"] == "Removed": continue
        det = details.get(sid) or B.specimen_detail(col, s, col["types"][s["type"]])
        lacks = P1.lacks(col, s, live_photo)
        if lacks: p1.append({"id": sid, "lacks": lacks})
        row = _row(col, sid, s, det, questions, truth, lacks)
        if sid in live_photo:
            have = sides.get(sid, set())
            if not {"obv", "rev"} <= have:
                other.append(dict(row, side="rev" if "obv" in have else "obv"))
            continue
        rows = by_id.get(sid, [])
        found = set()
        for r in rows:
            st = STATUS.get(r.get("status"))
            if st == "unusable" and any(w in (r.get("note") or "").lower() for w in ("rectangular", "paper note")): st = "not_round"
            if st: found.add(st)
        reason = next((k for k in pick if k in found), "none")
        note = next((r.get("note") for r in rows if STATUS.get(r.get("status")) and r.get("note")), None)
        items.append(dict(row, reason=reason, file=next((r.get("file") for r in rows), None), note=note))
    _sort(items); _sort(other)
    counts = {k: sum(1 for i in items if i["reason"] == k) for k in ORDER}
    return {"schema": "reshoot/2", "generated_at": generated_at, "source": "collection/photos.json + docs/photos/p1_crops.jsonl",
            "order": "photos that settle an open fact first, then value x doubt, then oldest first",
            "reasons": TEXT, "counts": counts, "total": len(items), "items": items,
            "other_side": {"total": len(other), "settles": sum(1 for r in other if r["settles"]), "items": other},
            "phase1": {"fields": list(P1.FIELDS), "labels": P1.LABEL, "items": p1}}
