#!/usr/bin/env python3
"""Certainty labels and a short history for every specimen (fix-list #9 and #10). Pure functions over collection/changes.jsonl; deterministic.

build(col, details) adds to each specimen's detail record:
  certainty {fact: {level, by, ts, source}}   level in LEVELS. A displayed fact with NO entry is "imported" (from the original ledger): that is the
                                              default for ~65 % of facts and leaving it out keeps the detail files small. Use level_of(cert, fact).
  history   [{ts, who, what}]                  newest first, at most 12, same-day events by one contributor merged
"""
import re, json, os

LEVELS = ("verified", "owner", "reference", "photo", "ai", "imported", "review")
SRC_MAX = 140
LEDGER_DAY = "2026-09-30"      # the v254 ledger import; coins logged on or before it came with it
MAX_HISTORY = 12

# A catalogue / publication / URL the reader could look up. A bare "Numista/NGC/Krause" (no number) deliberately does NOT match.
REF_RE = re.compile(r"KM\s?#\s?[A-Za-z]?\d|\bN#\s?\d|Numista\s+(?:no\.?|#)\s*\d|Sch[öo]n\s?#?\s?[A-Za-z]?\d|Jaeger\s?(?:#|no\.?)?\s?[A-Za-z]?\d"
                    r"|\bY#\s?\d|https?://|\briksbank\b|Royal Mint|\bUS Mint\b|\bU\.S\. Mint\b|\bcatalog(?:ue)?\b", re.I)
PHOTO_RE = re.compile(r"\bphotos?/|\.(?:webp|jpe?g|png)\b|\b(?:phone|page) photo\b", re.I)
TAIL_RE = re.compile(r"\s*\[phase \d[^\]]*\]\s*$")

# fact -> (specimen-event field prefixes, type-event field prefixes); a prefix matches the field itself or "prefix." / "prefix/..." children
FACTS = {
    "country":      ((), ("issuer",)),
    "year":         (("year", "date"), ()),
    "denomination": ((), ("denomination",)),
    "mint":         (("issue.mint",), ("issues.0.mint",)),
    "catalog":      ((), ("catalogs",)),
    "composition":  ((), ("composition",)),
    "weight":       ((), ("nominal.weight",)),
    "mintage":      (("issue.mintage",), ("issues",)),
    "value":        (("value",), ()),
    "story":        (("story",), ()),
    "design":       ((), ("design",)),
    "series":       ((), ("series",)),
    "ruler":        ((), ("ruler",)),
    "period":       ((), ("period",)),
}
RETYPE_FACTS = {"catalog", "design"}   # moving a coin to another type is evidence about these (its catalog number and design), not about country, denomination, metal...
Q_WORDS = {   # an open question matching one of these puts the fact under review
    "country": r"\bissuer\b|\bwrong country\b|\bcountry (?:is|may be)\b", "year": r"\b(?:date|dated|year)\b", "denomination": r"\bdenomination\b|\bface value\b",
    "mint": r"\bmint\b", "catalog": r"KM\s?#|\bcatalog|\btype (?:is|record|attribution|carries)|\bnumista\b", "composition": r"\bcomposition\b|\bmetal\b|\balloy\b",
    "weight": r"\bweight\b", "mintage": r"\bmintage\b", "value": r"\bestimated value\b|\bvalue estimate\b|\bworth\b", "story": r"\bstory\b",
    "design": r"\bdesign\b|\bportrait\b", "series": r"\bseries\b", "ruler": r"\bruler\b", "period": r"\bperiod\b|\bera\b",
}

def _s(x): return x if isinstance(x, str) else ""

def load_events(coll_dir):
    p = os.path.join(coll_dir, "changes.jsonl")
    if not os.path.exists(p): return []
    with open(p, encoding="utf-8") as f: return [json.loads(l) for l in f if l.strip()]

def friendly(by):
    by = _s(by)
    if by.startswith("owner"): return "Owner"
    return {"model:muse-spark": "Muse", "model:grok": "Grok", "model:claude": "Claude", "model:opus-5.5": "Claude", "model:sonnet-5.5": "Ledger import",
            "script:photo_crop_p1": "Photo tool", "script:integrator": "Claude"}.get(by, by.split(":")[-1].capitalize() or "Unknown")

def classify(ev):
    """One event -> its certainty level. Owner first, then the evidence its source cites."""
    by, src = _s(ev.get("by")), _s(ev.get("source"))
    if by.startswith("owner"): return "verified" if ev.get("verified") else "owner"
    if by == "model:sonnet-5.5" and "ledger" in src.lower(): return "imported"
    if REF_RE.search(src): return "reference"
    if PHOTO_RE.search(src): return "photo"
    return "ai"

def _match(field, prefixes):
    field = _s(field)
    return any(field == p or field.startswith(p + ".") or field.startswith(p + "/") for p in prefixes)

def _entry(ev):
    level = classify(ev)
    if level == "imported": return None
    return {"level": level, "by": friendly(ev.get("by")), "ts": _s(ev.get("ts"))[:10], "source": TAIL_RE.sub("", _s(ev.get("source")))[:SRC_MAX]}

def _question_hit(fact, questions, tokens):
    rx = re.compile(Q_WORDS[fact], re.I)
    return any(rx.search(q) or any(t and t in q for t in tokens) for q in questions)

def certainty(sid, type_id, ix, facts, questions=(), tokens=None, legacy=False):
    """-> {fact: entry} for the given facts. `ix` = {(entity, id): [(file order, event)]}.
    The LAST event (by ts, then file order) that set the fact, on the specimen or on its type, decides the level. With no event, the specimen's ledger import,
    then the record's own creation event, stand in; with neither the fact is 'review'. An open question about the fact (or its value) puts it under review
    unless the owner verified it."""
    tokens = tokens or {}
    spec_ev = ix.get(("specimen", sid), []); type_ev = ix.get(("type", type_id), [])
    out = {}
    for fact in facts:
        sp, ty = FACTS[fact]
        cand = [(_s(e.get("ts")), i, e) for i, e in spec_ev if _match(e.get("field"), sp)]
        cand += [(_s(e.get("ts")), i, e) for i, e in type_ev if _match(e.get("field"), ty)]
        if fact in RETYPE_FACTS: cand += [(_s(e.get("ts")), i, e) for i, e in spec_ev if e.get("field") == "type"]
        if fact == "year":   # an owner note that confirms the year
            cand += [(_s(e.get("ts")), i, e) for i, e in spec_ev if e.get("field") == "notes" and _s(e.get("by")).startswith("owner") and re.search(r"\b(year|date)\b", _s(e.get("source")), re.I)]
        ev = max(cand, key=lambda c: (c[0], c[1]))[2] if cand else None
        if ev is None:
            ev = next((e for _, e in spec_ev if e.get("field") == "ledger_text"), None) or next((e for _, e in spec_ev if e.get("field") == "(new record)"), None)
            if ev is None and fact in RETYPE_FACTS: ev = next((e for _, e in type_ev if e.get("field") == "(new record)"), None)
        ent = _entry(ev) if ev else (None if legacy else {"level": "review"})      # None = from the ledger import
        if (ent is None or ent["level"] != "verified") and _question_hit(fact, questions, tokens.get(fact, ())):
            ent = {"level": "review", **{k: ent[k] for k in ("by", "ts", "source") if ent and k in ent}}
        if ent is not None: out[fact] = ent
    return out

# ---------------------------------------------------------------------------------------------- history
_PHRASE = {"issue.mintage": "mintage", "ruler": "ruler", "period": "period", "series": "series", "commemorates": "what it commemorates",
           "design.text": "the design note", "composition.text": "composition", "denomination": "denomination", "catalogs": "catalog numbers",
           "legal_tender": "legal tender status", "notes": "a note", "value": "the value", "issues": "mint and mintage details",
           "issuer": "the country", "quantity": "the quantity", "serial_number": "the serial number"}

def _join(items):
    items = list(dict.fromkeys(items))
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]

def _flag_text(ev):
    old = ev.get("old") if isinstance(ev.get("old"), list) else []
    new = [q for q in (ev.get("new") if isinstance(ev.get("new"), list) else []) if q not in old]
    if not new: return None
    q = new[0]
    m = re.search(r"Mint letter reads (\w+).*?record says (\w+)", q)
    if m: return f"Photo shows mint {m.group(1)}, record says {m.group(2)}: flagged for review"
    m = re.search(r"Date reads ([^.;]{1,24}?) on the Phase 1 photo.*?record says (\d{4})", q)
    if m: return f"Photo date reads {m.group(1)}, record says {m.group(2)}: flagged for review"
    return "Flagged for review: " + (q[:90].rstrip() + ("..." if len(q) > 90 else ""))

def _retype_text(ev):
    src = _s(ev.get("source")); why = ""
    if PHOTO_RE.search(src): why = " (from the photo legend)" if "legend" in src.lower() else " (from the photo)"
    return f"{friendly(ev.get('by'))} moved it to type {ev.get('new')}{why}"

def history(sid, type_id, events, photos=(), max_n=MAX_HISTORY):
    """-> [{ts, who, what}] newest first. `events` = every event about the specimen or its type; `photos` = [{ts, by, phase, side}].
    Same-day verbs by one contributor merge ("Muse added mintage, ruler and series"); the import line always stays (last)."""
    lines = []     # (ts, who, text)            standalone sentences
    verbs = {}     # (ts, who) -> [(verb, object)]
    imported = None
    for ev in events:
        ent, f, by, ts = ev.get("entity"), _s(ev.get("field")), _s(ev.get("by")), _s(ev.get("ts"))[:10]
        if not ((ent == "specimen" and ev.get("id") == sid) or (ent == "type" and ev.get("id") == type_id)): continue
        who = friendly(by)
        if by == "model:sonnet-5.5" and classify(ev) == "imported":
            if imported is None or ts < imported: imported = ts
            continue
        if f == "(new record)":
            if ent == "specimen": lines.append((ts, who, f"{who} logged the coin"))
        elif f == "ledger_text": continue
        elif ent == "specimen" and f == "type": lines.append((ts, who, _retype_text(ev)))
        elif f == "research.open_questions":
            t = _flag_text(ev)
            if t: lines.append((ts, who, t))
        elif by.startswith("owner"): lines.append((ts, who, "Owner: " + _s(ev.get("source"))[:90]))
        elif f == "story": verbs.setdefault((ts, who), []).append(("rewrote" if ev.get("old") else "wrote", "the story"))
        elif f in _PHRASE: verbs.setdefault((ts, who), []).append(("added", _PHRASE[f]))
        elif ent == "type" and f.startswith("nominal."): verbs.setdefault((ts, who), []).append(("added", "measurements"))
    for (ts, who), vs in verbs.items():
        parts = []
        for verb in ("wrote", "rewrote", "added"):
            objs = [o for v, o in vs if v == verb]
            if objs: parts.append(f"{verb} {_join(objs)}")
        lines.append((ts, who, f"{who} " + "; ".join(parts)))
    ph = {}
    for p in photos:
        key = (_s(p.get("ts"))[:10], "Pro photo" if p.get("phase") == 2 else "Phone photo")
        ph.setdefault(key, []).append({"obv": "obverse", "rev": "reverse"}.get(p.get("side"), _s(p.get("side")) or "photo"))
    for (ts, kind), sides in ph.items(): lines.append((ts, "Photo tool", f"{kind} added ({' and '.join(sorted(set(sides)))})"))
    uniq = sorted(set(lines), key=lambda r: (r[0], r[2]), reverse=True)
    out = [{"ts": ts, "who": who, "what": text} for ts, who, text in uniq]
    tail = [{"ts": imported, "who": "Ledger import", "what": "Imported from Grok's ledger"}] if imported else []
    return out[: max_n - len(tail)] + tail

def share(cert):
    """Size: a fact whose entry equals an earlier one on the same coin (same type-change photo, same research round) becomes {"level", "like": first fact}."""
    seen = {}
    for fact, e in cert.items():
        if "source" not in e: continue
        k = (e["level"], e["by"], e["ts"], e["source"])
        if k in seen: cert[fact] = {"level": e["level"], "like": seen[k]}
        else: seen[k] = fact
    return cert

def level_of(cert, fact):
    """The level of a displayed fact: no entry = imported (from the original ledger)."""
    return (cert.get(fact) or {}).get("level", "imported")

def resolve(cert, fact):
    """The full entry for a fact (follows "like")."""
    e = cert.get(fact) or {"level": "imported"}
    return {**cert[e["like"]], "level": e["level"]} if "like" in e else e

# ---------------------------------------------------------------------------------------------- collection-wide
def index_events(events):
    ix = {}
    for i, e in enumerate(events): ix.setdefault((e.get("entity"), e.get("id")), []).append((i, e))
    return ix

def facts_present(det):
    pairs = (("country", det.get("country")), ("year", det.get("year")), ("denomination", det.get("denom")), ("mint", det.get("mint") and det["mint"] != "unknown"),
             ("catalog", det.get("refs")), ("composition", det.get("metal")), ("weight", det.get("specs") and re.search(r"\d\s?g\b", det["specs"])),
             ("mintage", det.get("mintage")), ("value", det.get("est") is not None), ("story", det.get("story")), ("design", det.get("design")),
             ("series", det.get("series")), ("ruler", det.get("ruler")), ("period", det.get("period")))
    return [f for f, ok in pairs if ok]

def build(col, details):
    """details = {sid: detail record}; adds 'certainty' and 'history' to each in place (deterministic)."""
    events = col.get("events") or []
    ix = index_events(events)
    photo_ev = {}
    for e in events:
        n = e.get("new")
        if e.get("entity") == "photo" and e.get("field") == "(new record)" and isinstance(n, dict):
            photo_ev.setdefault(n.get("specimen"), []).append({"ts": e.get("ts"), "by": e.get("by"), "phase": n.get("phase"), "side": n.get("side")})
    for sid, det in details.items():
        s = col["specs"][sid]; tid = s["type"]
        cat = [re.sub(r"\s", "", m) for m in re.findall(r"KM#\s?[A-Za-z]?\d+[a-z]?", det.get("refs") or "")]
        toks = {"year": [str(det["year"])] if re.fullmatch(r"\d{4}", str(det.get("year") or "")) else [], "catalog": cat}
        det["certainty"] = share(certainty(sid, tid, ix, facts_present(det), (s.get("research") or {}).get("open_questions") or [], toks, legacy=_s(det.get("added")) <= LEDGER_DAY))
        det["history"] = history(sid, tid, [e for _, e in ix.get(("specimen", sid), []) + ix.get(("type", tid), [])], photo_ev.get(sid, []))
    return details
