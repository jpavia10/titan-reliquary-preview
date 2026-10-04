#!/usr/bin/env python3
"""data/reshoot.json: the coins that still need a Phase 1 phone photo, and why.

A flip "has a phone photo" when its specimen has at least one live photo record (either side is enough for Phase 1).
The reason for each missing one comes from the crop log docs/photos/p1_crops.jsonl (written when the photos were cut):
  together   in a group photo next to look-alikes, so the photo cannot show which coin is which -> photograph it alone
  unusable   the photo is blurry, glared or cut off -> retake
  too_big    the photo file is over ~7 MB, which the Drive connector cannot download -> re-upload a smaller copy
  not_round  a paper note or other non-coin item that needs a rectangular crop (Claude's job, nothing to reshoot)
  none       no phone photo was ever filed -> photograph it
"""
import json, os, re

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

def build(col, generated_at, crops=None):
    crops = load_crops() if crops is None else crops
    live_photo = {p["specimen"] for p in col["photos"] if not p.get("superseded_by")
                  and (p.get("review") or {}).get("status") not in ("rejected", "reshoot")}
    by_id = {}
    for r in crops:
        ids = ids_of(r.get("id"))
        if r.get("status") == "download_failed":   # a photo never seen: every id in its file name is waiting on it
            ids = sorted(set(ids) | set(re.findall(r"(?:^|_)([CT]\d{3})(?=_)", r.get("file") or "")))
        for cid in ids: by_id.setdefault(cid, []).append(r)
    import build_app_data as B
    pick = ("too_big", "not_round", "together", "unusable")
    items = []
    for sid, s in sorted(col["specs"].items()):
        if s["lifecycle"]["status"] == "Removed" or sid in live_photo: continue
        det = B.specimen_detail(col, s, col["types"][s["type"]])
        rows = by_id.get(sid, [])
        found = set()
        for r in rows:
            st = STATUS.get(r.get("status"))
            if st == "unusable" and any(w in (r.get("note") or "").lower() for w in ("rectangular", "paper note")): st = "not_round"
            if st: found.add(st)
        reason = next((k for k in pick if k in found), "none")
        note = next((r.get("note") for r in rows if STATUS.get(r.get("status")) and r.get("note")), None)
        items.append({"id": sid, "ser": det.get("ser"), "country": det.get("country"), "year": det.get("year"), "denom": det.get("denom"),
                      "reason": reason, "file": next((r.get("file") for r in rows), None), "note": note})
    counts = {k: sum(1 for i in items if i["reason"] == k) for k in ORDER}
    return {"schema": "reshoot/1", "generated_at": generated_at, "source": "collection/photos.json + docs/photos/p1_crops.jsonl",
            "reasons": TEXT, "counts": counts, "total": len(items), "items": items}
