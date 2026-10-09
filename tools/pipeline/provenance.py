#!/usr/bin/env python3
"""Certainty labels and a short history for every specimen (fix-list #9 and #10). Pure functions over collection/changes.jsonl; deterministic.

build(col, details) adds to each specimen's detail record:
  certainty {fact: {level, by, ts, source, links?, n?}}   level in LEVELS. A displayed fact with NO entry is "imported" (from the original ledger): the
                                              default for most facts, and leaving it out keeps the detail files small. Use level_of(cert, fact).
  history   [{ts, who, what}]                  newest first, at most 12, same-day events by one contributor merged

How sure we are (2026-10-09, the research loop, docs/agents/RESEARCH_LOOP.md): every event that states the fact's CURRENT value supports it, not only the
last one, and the strongest supporter decides. "checked" = at least two different contributors (two AIs, or an AI and Claude) each stated the current
value with their own exact source or photo; an AI never checks itself. The mintage of a coin is decided only by events about its own issue (year +
mint), not by edits to other years of the same type.
"""
import re, json, os

LEVELS = ("verified", "owner", "checked", "reference", "photo", "ai", "imported", "review")
CITED = ("verified", "owner", "checked", "reference")     # the trust meter's "cited or confirmed"
SOURCED = ("reference", "photo")                          # levels that count towards "checked"
NOT_FROM_PHOTO = {"mintage", "catalog"}                   # nobody can read these off a coin: a photo-only source makes them an AI guess
NOT_A_READER = {"ledger"}                                 # the v254 import's own notes are not an independent reader
# who wrote an event -> one contributor id (two ids of one AI are one contributor: Grok's chat and its bot are not two independent readers)
AGENT_OF = {"model:grok": "grok", "model:grok-bot": "grok", "model:muse-spark": "muse", "model:muse": "muse", "model:claude": "claude", "model:opus-5.5": "claude",
            "model:sonnet-5.5": "ledger", "model:gemini": "gemini", "model:chatgpt": "chatgpt", "model:gpt": "chatgpt", "script:integrator": "claude"}
NAMES = {"grok": "Grok", "muse": "Muse", "claude": "Claude", "gemini": "Gemini", "chatgpt": "ChatGPT", "ledger": "Ledger import", "owner": "Owner"}
SRC_MAX = 140
LEDGER_DAY = "2026-09-30"      # the v254 ledger import; coins logged on or before it came with it
MAX_HISTORY = 12

# A catalogue / publication / URL the reader could look up. A bare "Numista/NGC/Krause" (no number) deliberately does NOT match.
# Grok's review GRK-3-14: the same test as the merge rule (#17), so "Reference" never accepts a bare publisher name ("catalog", "Royal Mint").
REF_RE = re.compile(r"KM\s?#\s?[A-Za-z]?\d|\bN#\s?\d|Numista\s+(?:no\.?|#|N#|N°)?\s*\d|Sch[öo]n\s?#?\s?[A-Za-z]?\d|Jaeger\s?(?:#|no\.?)?\s?[A-Za-z]?\d"
                    r"|\bY#\s?\d|https?://|\bPCGS\s*#\s*\d|\b(?:p\.|page|pp\.)\s*\d", re.I)
PHOTO_RE = re.compile(r"\bphotos?/|\.(?:webp|jpe?g|png)\b|\b(?:phone|page) photo\b", re.I)
TAIL_RE = re.compile(r"\s*\[phase \d[^\]]*\]\s*$")

# fact -> (specimen-event field prefixes, type-event field prefixes); a prefix matches the field itself or "prefix." / "prefix/..." children
FACTS = {
    "country":      ((), ("issuer", "country")),
    "year":         (("year", "date", "issue.year"), ()),
    "denomination": ((), ("denomination",)),
    "mint":         (("issue.mint", "issue.mint_marks", "issue.mint_text"), ("issues.0.mint",)),
    "catalog":      ((), ("catalogs",)),
    "composition":  ((), ("composition",)),
    "weight":       ((), ("nominal.weight", "nominal.weight_g")),
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

def agent_of(by):
    """'model:grok-bot' -> 'grok'; 'owner' / 'person:...' -> 'owner'; an unknown model -> its own name; a script -> the script id."""
    by = _s(by)
    if by.startswith(("owner", "person:")): return "owner"
    if by in AGENT_OF: return AGENT_OF[by]
    if by.startswith("model:"):
        m = by[6:].lower()
        for k, a in (("grok", "grok"), ("muse", "muse"), ("claude", "claude"), ("gemini", "gemini"), ("chatgpt", "chatgpt"), ("gpt", "chatgpt")):
            if k in m: return a
        return m
    return by

def friendly(by):
    by = _s(by)
    if by.startswith("owner"): return "Owner"
    if by == "script:photo_crop_p1": return "Photo tool"
    a = agent_of(by)
    return NAMES.get(a) or (by.split(":")[-1].capitalize() or "Unknown")

def classify(ev):
    """One event -> its certainty level. Owner first, then the evidence its source cites."""
    by, src = _s(ev.get("by")), _s(ev.get("source"))
    if by.startswith("owner"): return "verified" if ev.get("verified") else "owner"
    if by == "model:sonnet-5.5" and "ledger" in src.lower(): return "imported"
    if REF_RE.search(src): return "reference"
    if PHOTO_RE.search(src): return "photo"
    return "ai"

def level_for(ev, fact):
    """classify(), except that a mintage or catalog number backed only by a photo is an AI guess (fix 2026-10-09)."""
    lv = classify(ev)
    return "ai" if lv == "photo" and fact in NOT_FROM_PHOTO else lv

def _match(field, prefixes):
    field = _s(field)
    return any(field == p or field.startswith(p + ".") or field.startswith(p + "/") for p in prefixes)

def _entry(ev, fact=None):
    level = level_for(ev, fact) if fact else classify(ev)
    if level == "imported": return None
    return {"level": level, "by": friendly(ev.get("by")), "ts": _s(ev.get("ts"))[:10], "source": TAIL_RE.sub("", _s(ev.get("source")))[:SRC_MAX]}

# ---------------------------------------------------------------------------------------------- what an event claims about a fact
_MISSING = object()
CLAIM_PATHS = {   # fact -> leaf paths whose value IS the fact (an event on a parent path is read down to the leaf)
    "country": ("country",), "year": ("issue.year", "year"), "denomination": ("denomination",), "mint": ("issue.mint_marks", "issue.mint_text", "issue.mint"),
    "composition": ("composition.text",), "weight": ("nominal.weight_g", "nominal.weight"), "value": ("value.est_usd",), "story": ("story",),
    "design": ("design.text",), "series": ("series",), "ruler": ("ruler",), "period": ("period",)}

def _descend(v, parts):
    for p in parts:
        if isinstance(v, dict) and p in v: v = v[p]
        elif isinstance(v, list) and p.isdigit() and int(p) < len(v): v = v[int(p)]
        else: return _MISSING
    return v

def _canon(v): return json.dumps(v, sort_keys=True, ensure_ascii=False)

def _cat_key(cats):
    """The catalog number a reader would check first: KM, else Y, else the first non-Numista entry (a url added later is not a new claim)."""
    if not isinstance(cats, list): return None
    rows = [(str(c.get("system")), str(c.get("number"))) for c in cats if isinstance(c, dict) and c.get("number") not in (None, "")]
    for want in ("KM", "Y"):
        hit = [r for r in rows if r[0] == want]
        if hit: return hit[0]
    rows = [r for r in rows if r[0] not in ("N", "Numista")]
    return rows[0] if rows else None

def _issue_key(i): return (i.get("year"), tuple(i.get("mint_marks") or []), i.get("qualifier")) if isinstance(i, dict) else None

def issue_index_map(type_events, current_issues):
    """{file order of an issues.N.* event: the (year, mint_marks, qualifier) issue it addressed}: replays the type's whole-list writes, so an
    old index still names the issue it meant even if the list changed since."""
    state = None
    for _, e in type_events:
        if e.get("field") == "(new record)" and isinstance(e.get("new"), dict) and isinstance(e["new"].get("issues"), list): state = e["new"]["issues"]; break
        if e.get("field") == "issues" and isinstance(e.get("old"), list): state = e["old"]; break
    if state is None: state = current_issues or []
    out = {}
    for i, e in type_events:
        f = _s(e.get("field"))
        if f == "issues" and isinstance(e.get("new"), list): state = e["new"]
        elif f == "(new record)" and isinstance(e.get("new"), dict) and isinstance(e["new"].get("issues"), list): state = e["new"]["issues"]
        elif f.startswith("issues."):
            n = f.split(".")[1]
            if n.isdigit() and int(n) < len(state): out[i] = _issue_key(state[int(n)])
    return out

def claim(i, e, fact, ctx):
    """-> the (path, value) this event states about the fact on this coin, or None when it states nothing comparable.
    ctx: {"issue": the coin's issue key, "imap": issue_index_map(...) for its type, "year": the coin's year}."""
    f = _s(e.get("field")); new = e.get("new")
    if fact == "mintage":
        if f in ("issue.mintage",): return ("mintage", _canon(new)) if new is not None else None
        if f == "issue" and isinstance(new, dict): return ("mintage", _canon(new["mintage"])) if new.get("mintage") is not None else None
        if f == "issues" and isinstance(new, list):
            hit = next((x for x in new if _issue_key(x) == ctx.get("issue")), None)
            return ("mintage", _canon(hit["mintage"])) if hit and hit.get("mintage") is not None else None
        if f.startswith("issues.") and (ctx.get("imap") or {}).get(i) == ctx.get("issue"):
            rest = f.split(".")[2:]
            v = new if rest == ["mintage"] else _descend(new, ["mintage"]) if not rest else _MISSING
            return ("mintage", _canon(v)) if v is not _MISSING and v is not None else None
        return None
    if fact == "catalog":
        if f == "catalogs": k = _cat_key(new); return ("catalogs", k) if k else None
        if f == "type": return ("type", _s(new))
        return None
    if fact == "year" and f == "notes" and _s(e.get("by")).startswith("owner"): return ("issue.year", _canon(ctx.get("year")))   # the owner's "year confirmed" note
    for t in CLAIM_PATHS.get(fact, ()):
        if f == t: return (t, _canon(new))
        if t.startswith(f + "."):
            v = _descend(new, t[len(f) + 1:].split("."))
            if v is not _MISSING: return (t, _canon(v))
        if f.startswith(t + "."): return (f, _canon(new))        # a write inside the fact (e.g. denomination.value): agrees only with the same path
    return None

def _question_hit(fact, questions, tokens):
    rx = re.compile(Q_WORDS[fact], re.I)
    return any(rx.search(q) or any(t and t in q for t in tokens) for q in questions)

def _derived(e):
    """Bookkeeping copies the pipeline writes (one issue, one number; cleared 'unknown' text; an issue added for a coin). They move a value
    that some other event already established, so they never decide how sure we are: the event that brought the fact in does."""
    by, src = _s(e.get("by")), _s(e.get("source"))
    return (by in ("script:truth-checks", "script:pipeline") or src.startswith(("cleared:", "mirrored from", "one issue, one number"))
            or bool(re.match(r"issue \d{4}\S*(?: \S+)? added because specimen", src)))

LINK_RE = re.compile(r"https?://[^\s,;)\]>\"']+")
NUMISTA_RE = re.compile(r"\bN#\s?(\d{1,7})\b|\bNumista\s+(?:no\.?|#|N#|N°)?\s*(\d{1,7})\b", re.I)

def links(*sources, max_n=3):
    """Openable sources (fix list #74): every URL, and Numista N#1234 as its catalogue page, from the FULL source text (before it is shortened)."""
    out = []
    for src in sources:
        src = _s(src)
        for u in LINK_RE.findall(src): out.append(u.rstrip(".:"))
        for a, b in NUMISTA_RE.findall(src): out.append(f"https://en.numista.com/catalogue/pieces{a or b}.html")
    seen = []
    for u in out:
        if u not in seen: seen.append(u)
    return seen[:max_n]

def certainty(sid, type_id, ix, facts, questions=(), tokens=None, legacy=False, ctx=None):
    """-> {fact: entry} for the given facts. `ix` = {(entity, id): [(file order, event)]}; `ctx` (claim()) names the coin's issue.
    Every event on the specimen or its type that states the fact's CURRENT value (the value the last event stated) supports it; the strongest
    supporter's level stands (verified > owner > reference > photo > ai > imported), and two different contributors with sources make it "checked".
    With no event, the specimen's ledger import, then the record's own creation event, stand in; with neither the fact is 'review'. An open question
    about the fact (or its value) puts it under review unless the owner verified it."""
    tokens = tokens or {}; ctx = ctx or {}
    spec_ev = ix.get(("specimen", sid), []); type_ev = ix.get(("type", type_id), [])
    out = {}
    for fact in facts:
        sp, ty = FACTS[fact]
        cand = [(_s(e.get("ts")), i, e) for i, e in spec_ev if _match(e.get("field"), sp)]
        cand += [(_s(e.get("ts")), i, e) for i, e in type_ev if _match(e.get("field"), ty)]
        if fact in RETYPE_FACTS: cand += [(_s(e.get("ts")), i, e) for i, e in spec_ev if e.get("field") == "type"]
        cand = [c for c in cand if not _derived(c[2])]
        if fact == "year":   # an owner note that confirms the year
            cand += [(_s(e.get("ts")), i, e) for i, e in spec_ev if e.get("field") == "notes" and _s(e.get("by")).startswith("owner") and re.search(r"\b(year|date)\b", _s(e.get("source")), re.I)]
        if fact == "mintage":   # only events about this coin's own issue (year + mint), not other years of the type
            cand = [c for c in cand if claim(c[1], c[2], fact, ctx) is not None or not _s(c[2].get("field")).startswith("issues")]
        ent = None; ev = max(cand, key=lambda c: (c[0], c[1])) if cand else None
        if ev is not None:
            cur = claim(ev[1], ev[2], fact, ctx)
            support = [c for c in cand if cur is not None and claim(c[1], c[2], fact, ctx) == cur] or [ev]
            top = min(LEVELS.index(level_for(c[2], fact)) for c in support)
            best = max((c for c in support if LEVELS.index(level_for(c[2], fact)) == top), key=lambda c: (c[0], c[1]))     # the newest of the strongest
            ent = _entry(best[2], fact)
            if ent is not None:
                ent["links"] = links(best[2].get("source"))
                srcd = [c for c in support if level_for(c[2], fact) in SOURCED and agent_of(c[2].get("by")) not in NOT_A_READER and not _s(c[2].get("by")).startswith("script:")]
                who = sorted({agent_of(c[2].get("by")) for c in srcd})
                if ent["level"] in SOURCED and len(who) >= 2:
                    last = max(srcd, key=lambda c: (c[0], c[1]))[2]
                    ent.update({"level": "checked", "by": " + ".join(NAMES.get(a, a.capitalize()) for a in who), "n": len(who), "ts": _s(last.get("ts"))[:10],
                                "source": TAIL_RE.sub("", _s(last.get("source")))[:SRC_MAX], "links": links(*[c[2].get("source") for c in sorted(srcd, key=lambda c: (c[0], c[1]), reverse=True)])})
                if not ent["links"]: del ent["links"]
        else:
            evx = next((e for _, e in spec_ev if e.get("field") == "ledger_text"), None) or next((e for _, e in spec_ev if e.get("field") == "(new record)"), None)
            if evx is None and fact in RETYPE_FACTS: evx = next((e for _, e in type_ev if e.get("field") == "(new record)"), None)
            ent = _entry(evx, fact) if evx else (None if legacy else {"level": "review"})      # None = from the ledger import
            if ent is not None and "source" in ent:
                lk = links(evx.get("source"))
                if lk: ent["links"] = lk
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
        k = (e["level"], e["by"], e["ts"], e["source"], tuple(e.get("links") or ()), e.get("n"))
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
    imaps = {}
    for sid, det in details.items():
        s = col["specs"][sid]; tid = s["type"]
        cat = [re.sub(r"\s", "", m) for m in re.findall(r"KM#\s?[A-Za-z]?\d+[a-z]?", det.get("refs") or "")]
        toks = {"year": [str(det["year"])] if re.fullmatch(r"\d{4}", str(det.get("year") or "")) else [], "catalog": cat}
        if tid not in imaps: imaps[tid] = issue_index_map(ix.get(("type", tid), []), (col["types"].get(tid) or {}).get("issues"))
        ctx = {"issue": _issue_key(s.get("issue")), "imap": imaps[tid], "year": (s.get("issue") or {}).get("year")}
        det["certainty"] = share(certainty(sid, tid, ix, facts_present(det), (s.get("research") or {}).get("open_questions") or [], toks,
                                           legacy=_s(det.get("added")) <= LEDGER_DAY, ctx=ctx))
        det["history"] = history(sid, tid, [e for _, e in ix.get(("specimen", sid), []) + ix.get(("type", tid), [])], photo_ev.get(sid, []))
    return details
