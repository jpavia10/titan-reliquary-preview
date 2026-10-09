#!/usr/bin/env python3
"""The research loop: homework for the other AIs, generated from the data (docs/agents/RESEARCH_LOOP.md).

    python3 tools/agents/homework.py                    refresh: close finished assignments, issue new ones, write every page
    python3 tools/agents/homework.py --check            exit 1 when an active AI has fewer than 3 open tasks (owner rule 10)
    python3 tools/agents/homework.py --dry-run          say what would change; write nothing
    python3 tools/agents/homework.py --pool [KIND]      list the open work pool (all kinds, or one)
    options: --now 2026-10-09T09:00:00Z (tests) --root DIR (a copy of the repo; tests)

Every run is a pure function of the collection (collection/), the roles (docs/agents/roles.json), the hand-written projects
(docs/agents/queues.json) and the assignment state (docs/agents/homework/assignments.json):

  1. POOLS   every open job is computed from a gap in the data: a catalogue fact without an exact source (cite), a catalogue number that
             disagrees with Numista (catno), a fact only one contributor stands behind (verify), a mint mark nobody read (read-mint), a
             story nobody else checked (story-check) or still in shorthand (plain-story), an open research question (research), a value
             without a price page (value), a disagreement between two AIs (arbitrate). A job disappears when its gap closes.
  2. CLOSE   an open assignment is done when all its items closed, or when the AI answered it (a merged event names it in
             provenance.assignment): items it left out go back to the pool, marked as tried by that AI. Past its lease it expires.
  3. ISSUE   each active AI is topped up to its capacity from the kinds it does (roles.json, in order), highest priority first. An AI never
             gets a fact it wrote to check, nor a disagreement it is part of. Two AIs that tried and could not do an item park it.
  4. WRITE   docs/agents/QUEUE_{ai}.md (the text of its Drive doc 'WORK QUEUE for ...'), docs/agents/homework/{ai}.json,
             one pre-filled answer sheet per open assignment (docs/agents/homework/sheets/{id}.jsonl), the overview (QUEUES.md)
             and the measured numbers (docs/agents/homework/metrics.json).
publish.py runs it after every real publish, so the loop turns on its own: merge -> rebuild -> new homework.
"""
import datetime, hashlib, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import provenance as PV  # noqa: E402

PAGES = "https://jpavia10.github.io/titan-reliquary-preview/"
RAW = "https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/"
MIN_OPEN = 3
FILL = "FILL"                      # answer-sheet placeholder: a line whose source still starts with it is left out, never an error
STATES_OPEN = ("now", "next", "later", "always")
STORY_LINT = re.compile(r"·|\s\+\s|&|\(shown\)|\btypical\b|\bCu-?Ni\b|\bCu\s?\d|\.\d{3}\s?Ag\b|//|\b[A-Za-z]{3,}/[A-Za-z]{3,}\b|(?:[^.,;!?]+,){4,}")
NOT_RESEARCH = re.compile(r"Confirm at Phase 2|pro photos|physical coin|in hand|the owner", re.I)
VERIFY_FACTS = (("catalog", "type", "catalogs"), ("mintage", "type", "issues.{N}.mintage"), ("composition", "type", "composition.text"),
                ("weight", "type", "nominal.weight_g"), ("design", "type", "design.text"), ("ruler", "type", "ruler"), ("series", "type", "series"),
                ("period", "type", "period"), ("year", "specimen", "issue.year"), ("mint", "specimen", "issue.mint_marks"))
BLIND = {"year", "mint"}          # photo readings: the second reader must not see the first reading
MINT_HINT = {
    "US": "US mint marks: P (Philadelphia; most coins before 1980 carry none), D (Denver), S (San Francisco), W (West Point). On modern coins the mark is on the obverse near the date; on older ones often on the reverse.",
    "DE": "German mint letters: A (Berlin), D (Munich), F (Stuttgart), G (Karlsruhe), J (Hamburg). Usually near the date or under the eagle; on euro coins on the national side.",
    "MX": "Mexico City coins carry Mo (an M with a small o above it) near the date.",
    "GB": "UK coins carry no mint mark: send mint_text 'no mint mark (Royal Mint)' only if you can see the whole coin.",
    "FR": "French coins carry the Paris or Pessac mint mark (cornucopia) and the engraver's mark beside the date.",
}


def now_utc():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _days(ts, n):
    t = datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ") + datetime.timedelta(days=n)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _h(s, salt="audit-v1"):
    return int(hashlib.sha256(f"{s}|{salt}".encode()).hexdigest()[:8], 16) / 2 ** 32


def get_path(rec, field):
    v = rec
    for p in field.split("."):
        if isinstance(v, dict): v = v.get(p)
        elif isinstance(v, list) and p.isdigit() and int(p) < len(v): v = v[int(p)]
        else: return None
    return v


def paths(root):
    hw = os.path.join(root, "docs", "agents", "homework")
    return {"roles": os.path.join(root, "docs", "agents", "roles.json"), "queues": os.path.join(root, "docs", "agents", "queues.json"),
            "state": os.path.join(hw, "assignments.json"), "hw": hw, "sheets": os.path.join(hw, "sheets"), "agents": os.path.join(root, "docs", "agents"),
            "raw_index": os.path.join(root, "docs", "photos", "raw_capture_index.json"),
            "catno": os.path.join(root, "docs", "requests", "catalog_disagreements_20261008.json")}


def _load(p, default=None):
    if not os.path.exists(p): return default
    with open(p, encoding="utf-8") as fh: return json.load(fh)


def _write(p, text):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as fh: fh.write(text)


# ------------------------------------------------------------------------------------------------ context
def load_context(root=ROOT, coll=None):
    import build_app_data as B, truth_checks as TC
    from collection_io import read_jsonl
    coll = coll or os.path.join(root, "collection")
    col = B.load_collection(coll)
    _, det = B.build_specimens(col)
    details = {k: v for recs in det.values() for k, v in recs.items()}
    raw = {}
    for r in (_load(paths(root)["raw_index"], {}) or {}).get("photos", []):
        raw[r["file"]] = r.get("drive_id")
    live = {k: s for k, s in col["specs"].items() if (s.get("lifecycle") or {}).get("status") != "Removed"}
    return {"root": root, "coll": coll, "col": col, "details": details, "truth": TC.findings(col), "live": live,
            "disagreements": read_jsonl(os.path.join(coll, "disagreements.jsonl")), "raw": raw}


def coin_line(ctx, sid):
    """One readable line about a coin for an item table."""
    d = ctx["details"].get(sid) or {}
    return " · ".join(str(x) for x in (sid, d.get("country"), d.get("year"), d.get("denom")) if x)


def photos_of(ctx, sid):
    out = []
    for p in ctx["col"]["photos"]:
        if p.get("specimen") != sid or p.get("superseded_by") or (p.get("review") or {}).get("status") in ("rejected", "reshoot"): continue
        src = (p.get("crop") or {}).get("source_file")
        did = ctx["raw"].get(src) if src else None
        out.append({"side": p.get("side"), "url": PAGES + p["path"], "file": os.path.basename(p["path"]), "original": src,
                    "drive": f"https://drive.google.com/file/d/{did}/view" if did else None})
    return out


def sheet_line(by, aid, kind, ent, rid, field, old, new, source, issued, inputs=(), blind=False, model=None):
    ln = {"ts": issued, "by": by, "entity": ent, "id": rid, "op": "set", "field": field}
    if not blind: ln["old"] = old
    ln.update({"new": new, "source": source, "verified": False, "phase": 2, "confidence": "high",
               "provenance": {"model": model or agent, "prompt_version": f"HOMEWORK@{issued[:10]}", "workflow": f"homework-{kind}", "assignment": aid,
                              "run_id": aid, "inputs": [{"file": f} for f in inputs]}})
    return ln


# ------------------------------------------------------------------------------------------------ pools
def _item(kind, iid, ent, rid, field, coins, label, prio, authors=(), payload=None, lines=(), blind=False, inputs=()):
    return {"item": iid, "kind": kind, "entity": ent, "id": rid, "field": field, "coins": list(coins), "label": label, "prio": prio,
            "authors": sorted(set(a for a in authors if a)), "payload": payload or {}, "lines": list(lines), "blind": blind, "inputs": list(inputs)}


def pool_cite(ctx):
    import numista_sweep as NS
    col = ctx["col"]; out = {}
    for n, r in enumerate(NS.rows(col, ctx["details"], ctx["truth"])):
        t = col["types"][r["type"]]; lines = []
        if t.get("class") != "coin": continue          # tokens and props have no catalogue entry (Grok, round 1)
        for ask in r["ask"]:
            for f in [x.strip() for x in ask.split(":")[0].split("+")]:
                lines.append(("type", r["type"], f, get_path(t, f)))
                if f == "nominal.weight_g":
                    nom = t.get("nominal") or {}
                    if nom.get("weight_approx"): lines.append(("type", r["type"], "nominal.weight_approx", nom.get("weight_approx")))
                    for k in ("weight_min_g", "weight_max_g"):
                        if nom.get(k) is not None: lines.append(("type", r["type"], f"nominal.{k}", nom.get(k)))
        out[f"cite:{r['type']}"] = _item("cite", f"cite:{r['type']}", "type", r["type"], None, r["coins"], f"{r['country']} {r['denomination']} ({r['type']})",
                                         (n,), payload={k: r[k] for k in ("issues", "catalogs", "weight_g", "diameter_mm", "composition", "ask", "note")}, lines=lines)
    return out


def pool_catno(ctx):
    rows = (_load(paths(ctx["root"])["catno"], {}) or {}).get("rows", [])
    by_type = {}
    for r in rows: by_type.setdefault(r["type"], []).append(r)
    out = {}
    for n, (tid, rs) in enumerate(sorted(by_type.items())):
        t = ctx["col"]["types"].get(tid)
        if not t: continue
        cats = t.get("catalogs") or []
        later = any(e.get("entity") == "type" and e.get("id") == tid and e.get("field") == "catalogs" and (e.get("ts") or "") >= "2026-10-09"
                    and PV.classify(e) == "reference" for e in ctx["col"]["events"])      # someone re-read the entry after the list was made
        open_rows = [] if later else [r for r in rs if r["numista_says"] not in [str(c.get("number")) for c in cats if c.get("system") == r["system"]]]
        if not open_rows: continue
        out[f"catno:{tid}"] = _item("catno", f"catno:{tid}", "type", tid, "catalogs", rs[0]["coins"], tid, (n,),
                                    payload={"disputes": [{k: r[k] for k in ("system", "record", "numista_says", "numista", "url")} for r in open_rows]},
                                    lines=[("type", tid, "catalogs", cats)])
    return out


def _author(entry):
    rev = {v: k for k, v in PV.NAMES.items()}
    return rev.get(entry.get("by"), (entry.get("by") or "").lower())


def pool_verify(ctx, audit_rate):
    col, det = ctx["col"], ctx["details"]
    open_d = {(d["entity"], d["rid"], d["field"]) for d in ctx["disagreements"] if d.get("status") == "open"}
    order = [f for f, _, _ in VERIFY_FACTS]; out = {}
    for sid, s in sorted(ctx["live"].items()):
        cert = (det.get(sid) or {}).get("certainty") or {}
        t = col["types"].get(s["type"]) or {}
        for fact, ent, field in VERIFY_FACTS:
            e = PV.resolve(cert, fact) if fact in cert else None
            if not e or e.get("level") not in PV.SOURCED: continue
            author = _author(e)
            if author in ("owner", "ledger", ""): continue
            if "{N}" in field:
                n = next((i for i, x in enumerate(t.get("issues") or []) if PV._issue_key(x) == PV._issue_key(s["issue"])), None)
                if n is None: continue
                field_n = field.replace("{N}", str(n))
            else: field_n = field
            rid = s["type"] if ent == "type" else sid
            rec = t if ent == "type" else s
            val = get_path(rec, field_n)
            if val in (None, "", []) or (ent, rid, field_n) in open_d: continue
            iid = f"verify:{ent}:{rid}:{field_n}"
            if iid in out:
                out[iid]["coins"].append(sid); continue
            est = max([(x.get("value") or {}).get("est_usd") or 0 for k, x in ctx["live"].items() if (x["type"] == rid if ent == "type" else k == sid)] or [0])
            audit = _h(iid) < audit_rate(author)
            pics = photos_of(ctx, sid) if fact in BLIND else []
            out[iid] = _item("verify", iid, ent, rid, field_n, [sid], f"{fact} of {coin_line(ctx, sid)}", (0 if audit else 1, -est, order.index(fact), iid),
                             authors=[author], blind=fact in BLIND, inputs=[p["file"] for p in pics],
                             payload={"fact": fact, "author": e.get("by"), "value": None if fact in BLIND else val,
                                      "their_source": None if fact in BLIND else e.get("source"), "links": [] if fact in BLIND else e.get("links") or [],
                                      "photos": pics, "audit": audit},
                             lines=[(ent, rid, field_n, val)])
    return out


def _story_state(ctx, sid):
    """-> (author of the current story, checked by someone else since?)"""
    evs = [(i, e) for i, e in enumerate(ctx["col"]["events"]) if e.get("entity") == "specimen" and e.get("id") == sid and e.get("field") == "story"]
    last = None
    for i, e in evs:
        if e.get("old") != e.get("new"): last = (i, e)
    author = PV.agent_of(last[1].get("by")) if last else "ledger"
    checked = any(i > (last[0] if last else -1) and e.get("old") == e.get("new") and PV.agent_of(e.get("by")) != author for i, e in evs)
    return author, checked


def record_summary(ctx, sid):
    d = ctx["details"].get(sid) or {}
    return {k: d.get(k) for k in ("country", "year", "denom", "mint", "refs", "metal", "specs", "mintage", "design", "ruler", "series", "period") if d.get(k)}


def pool_story(ctx, reserved):
    out = {}
    for sid, s in sorted(ctx["live"].items()):
        if not (s.get("story") or "").strip() or ("story-check", sid) in reserved: continue
        author, checked = _story_state(ctx, sid)
        if checked: continue
        out[f"story:{sid}"] = _item("story-check", f"story:{sid}", "specimen", sid, "story", [sid], coin_line(ctx, sid), (sid,), authors=[author],
                                    payload={"story": s["story"], "record": record_summary(ctx, sid)}, lines=[("specimen", sid, "story", s["story"])])
    return out


def pool_plain(ctx, reserved):
    out = {}
    for sid, s in sorted(ctx["live"].items()):
        st = s.get("story") or ""
        if not st or ("plain-story", sid) in reserved: continue
        m = STORY_LINT.search(st)
        if not m: continue
        out[f"plain:{sid}"] = _item("plain-story", f"plain:{sid}", "specimen", sid, "story", [sid], coin_line(ctx, sid), (sid,),
                                    payload={"story": st, "shorthand": m.group(0).strip()[:40]}, lines=[("specimen", sid, "story", st)])
    return out


def _facts_in(text):
    return {f for f, rx in PV.Q_WORDS.items() if re.search(rx, text or "", re.I)}


def owner_topics(ctx):
    """{coin: facts its open owner questions are about}: research leaves those to Joseph (the coin in hand settles them)."""
    import owner_answers as OA
    qs = OA.load_questions(ctx["coll"]); done = OA.answered_ids(ctx["coll"])
    out = {}
    for q in qs.values():
        if q["id"] in done or not q.get("coin"): continue
        out.setdefault(q["coin"], set()).update(_facts_in(q.get("ask", "") + " " + q.get("why", "")))
    return out


def pool_research(ctx):
    out = {}; owner = owner_topics(ctx)
    for sid, s in sorted(ctx["live"].items()):
        qs = (s.get("research") or {}).get("open_questions") or []
        for q in qs:
            if NOT_RESEARCH.search(q) or (_facts_in(q) & owner.get(sid, set())): continue
            iid = f"research:{sid}:{hashlib.sha256(q.encode()).hexdigest()[:8]}"
            t = ctx["col"]["types"].get(s["type"]) or {}
            lines = [("specimen", sid, "research.open_questions", qs)]
            if re.search(r"design note", q, re.I): lines.insert(0, ("type", s["type"], "design.text", (t.get("design") or {}).get("text")))
            out[iid] = _item("research", iid, "specimen", sid, None, [sid], coin_line(ctx, sid), (sid, iid),
                             payload={"question": q, "record": record_summary(ctx, sid), "type": s["type"],
                                      "remove_with": [x for x in qs if x != q]}, lines=lines)
    return out


def pool_value(ctx):
    out = []
    spot = (ctx["col"].get("spot_latest") or {})
    for sid, s in ctx["live"].items():
        est = (s.get("value") or {}).get("est_usd")
        if est is None: continue
        lv = PV.level_of((ctx["details"].get(sid) or {}).get("certainty") or {}, "value")
        if lv in PV.CITED: continue
        t = ctx["col"]["types"].get(s["type"]) or {}
        asw = (t.get("precious") or {}).get("asw_oz") or 0
        melt = round(asw * (spot.get("xag_usd") or 0), 2) if asw else None
        out.append((-est, sid, _item("value", f"value:{sid}", "specimen", sid, "value", [sid], coin_line(ctx, sid), (-est, sid),
                                     payload={"est_usd": est, "confidence": (s.get("value") or {}).get("confidence"), "silver_oz": asw or None, "melt_usd": melt,
                                              "photos": photos_of(ctx, sid)},
                                     lines=[("specimen", sid, "value.est_usd", est), ("specimen", sid, "value.confidence", (s.get("value") or {}).get("confidence"))])))
    return {it["item"]: it for _, _, it in sorted(out)}


def pool_read_mint(ctx):
    import phase1 as P1
    out = {}
    for sid, s in sorted(ctx["live"].items()):
        if P1.mint_read(s["issue"]): continue
        pics = photos_of(ctx, sid)
        if not pics: continue
        iso = (ctx["col"]["types"].get(s["type"]) or {}).get("country")
        est = (s.get("value") or {}).get("est_usd") or 0
        out[f"mint:{sid}"] = _item("read-mint", f"mint:{sid}", "specimen", sid, "issue", [sid], coin_line(ctx, sid), (-est, sid),
                                   payload={"photos": pics, "hint": MINT_HINT.get(iso, "Look up where this country puts its mint mark (the Numista entry shows it); many coins carry none."),
                                            "mint_text_now": s["issue"].get("mint_text")}, inputs=[p["file"] for p in pics],
                                   lines=[("specimen", sid, "issue.mint_marks", s["issue"].get("mint_marks") or []), ("specimen", sid, "issue.mint_text", s["issue"].get("mint_text"))])
    return out


def pool_arbitrate(ctx):
    out = {}
    for d in ctx["disagreements"]:
        if d.get("status") != "open": continue
        rec = (ctx["col"]["types"] if d["entity"] == "type" else ctx["col"]["specs"]).get(d["rid"]) or {}
        out[f"arb:{d['id']}"] = _item("arbitrate", f"arb:{d['id']}", d["entity"], d["rid"], d["field"], d.get("coins") or [], f"{d['id']} {d['rid']} {d['field']}", (d["id"],),
                                      authors=[PV.agent_of(d["record"].get("by")), PV.agent_of(d["claim"].get("by"))],
                                      payload={"record": d["record"], "claim": {k: d["claim"].get(k) for k in ("value", "by", "source", "ts")}},
                                      lines=[(d["entity"], d["rid"], d["field"], get_path(rec, d["field"]))])
    return out


def reservations(queues):
    """(kind, coin) pairs a hand-written project still holds (e.g. Grok's story fact-check C151-C283 while it is in progress)."""
    res = set()
    for a in queues.get("agents", []):
        for t in a.get("tasks", []):
            r = t.get("reserves")
            if r and t.get("state") in STATES_OPEN:
                for k in r.get("kinds", []):
                    for c in r.get("coins", []): res.add((k, c))
    return res


def pools(ctx, roles, queues, metrics=None):
    reserved = reservations(queues)
    rate = lambda a: audit_rate(a, roles, metrics or {})
    out = {}
    for f in (pool_cite(ctx), pool_catno(ctx), pool_story(ctx, reserved), pool_plain(ctx, reserved), pool_research(ctx),
              pool_value(ctx), pool_read_mint(ctx), pool_arbitrate(ctx)):
        out.update(f)
    # a fact another job is about to change is not handed out to be checked at the same time (it would only go stale)
    busy = {(e, i, f) for it in out.values() for e, i, f, _ in it["lines"]}
    out.update({k: v for k, v in pool_verify(ctx, rate).items() if (v["entity"], v["id"], v["field"]) not in busy})
    return out


# ------------------------------------------------------------------------------------------------ measuring
def wilson(k, n, z=1.96):
    if n == 0: return (0.0, 1.0)
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (max(0.0, (c - r) / d), min(1.0, (c + r) / d))


def measure(ctx):
    """Per contributor: facts another contributor confirmed (agree), disagreements settled against it (wrong), its own checks of others."""
    m = {}
    def row(a): return m.setdefault(a, {"confirmed": 0, "wrong": 0, "checks_done": 0, "disagreements_open": 0})
    seen = set(); rev = {v: k for k, v in PV.NAMES.items()}
    for sid, d in ctx["details"].items():
        for fact in (d.get("certainty") or {}):
            e = PV.resolve(d["certainty"], fact)
            if e.get("level") != "checked": continue
            key = (fact, ((ctx["col"]["specs"].get(sid) or {}).get("type") if fact not in ("year", "mint", "value", "story") else sid), e.get("source"))
            if key in seen: continue
            seen.add(key)
            for nm in (e.get("by") or "").split(" + "):
                row(rev.get(nm, nm.lower()))["confirmed"] += 1
    for d in ctx["disagreements"]:
        if d.get("status") == "open":
            for side in ("record", "claim"): row(PV.agent_of(d[side].get("by")))["disagreements_open"] += 1
        r = d.get("resolution") or {}
        if r.get("error_by"): row(PV.agent_of(r["error_by"]))["wrong"] += 1
        if r.get("winner") in ("record", "claim") and d[r["winner"]].get("by"): row(PV.agent_of(d[r["winner"]]["by"]))["confirmed"] += 1   # it held up under a check
    for e in ctx["col"]["events"]:
        aid = (e.get("provenance") or {}).get("assignment") if isinstance(e.get("provenance"), dict) else None
        if aid and "-verify-" in aid and e.get("old") == e.get("new"): row(PV.agent_of(e.get("by")))["checks_done"] += 1
    for a, r in m.items():
        n = r["confirmed"] + r["wrong"]
        r["checked_n"] = n; r["error_rate"] = round(r["wrong"] / n, 3) if n else None
        lo, hi = wilson(r["wrong"], n); r["error_ci95"] = [round(lo, 3), round(hi, 3)] if n else None
    return m


def audit_rate(agent, roles, metrics):
    au = roles.get("audit", {}); ag = roles.get("agents", {}).get(agent, {})
    if ag.get("probation"): return au.get("probation_rate", 1.0)
    r = metrics.get(agent) or {}
    if (r.get("checked_n") or 0) < au.get("new_until_checks", 20): return au.get("new_rate", 0.5)
    return max(au.get("min_rate", 0.15), min(1.0, 2 * (r.get("error_rate") or 0) + 0.1))


WORDING_KINDS = {"verify", "plain-story"}       # checking others and rewording never write a new fact, so demotion never stops them


def demoted(agent, roles, metrics):
    """Demoted only when we are sure: the LOWER end of the 95 % range of its error rate is above the line (a few unlucky checks never demote)."""
    au = roles.get("audit", {}); r = metrics.get(agent) or {}
    return (r.get("checked_n") or 0) >= au.get("demote_min_checks", 10) and bool(r.get("error_ci95")) and r["error_ci95"][0] > au.get("demote_error_rate", 0.15)


# ------------------------------------------------------------------------------------------------ disagreements settle themselves
def settle(ctx, now):
    """An open disagreement is settled when a later event (by the owner, or by a third contributor with an exact source) sets or re-states the
    field. -> list of resolved ids (the records are updated in place)."""
    done = []
    for d in ctx["disagreements"]:
        if d.get("status") != "open": continue
        parties = {PV.agent_of(d["record"].get("by")), PV.agent_of(d["claim"].get("by"))}
        for e in ctx["col"]["events"]:
            if e.get("entity") != d["entity"] or e.get("id") != d["rid"] or (e.get("ts") or "") < d["opened"] or PV._derived(e): continue
            f = e.get("field") or ""
            if not (f == d["field"] or d["field"].startswith(f + ".")): continue
            who = PV.agent_of(e.get("by")); owner = who == "owner"
            if not owner and (who in parties or PV.classify(e) not in ("reference", "photo")): continue
            rec = (ctx["col"]["types"] if d["entity"] == "type" else ctx["col"]["specs"]).get(d["rid"]) or {}
            cur = get_path(rec, d["field"])
            win = "claim" if cur == d["claim"]["value"] else "record" if cur == d["record"]["value"] else "neither"
            loser = {"claim": d["record"].get("by"), "record": d["claim"].get("by")}.get(win)
            d["status"] = "resolved"
            d["resolution"] = {"ts": e.get("ts"), "by": e.get("by"), "value": cur, "winner": win, "source": (e.get("source") or "")[:300], "error_by": loser}
            done.append(d["id"]); break
    return done


# ------------------------------------------------------------------------------------------------ the loop
def answered(ctx):
    """{assignment id: set of (entity, id) its merged events touched} (diverted verify lines count too)."""
    a = {}
    for e in ctx["col"]["events"]:
        pv = e.get("provenance") if isinstance(e.get("provenance"), dict) else {}
        if pv.get("assignment"): a.setdefault(pv["assignment"], set()).add((e.get("entity"), e.get("id")))
    for d in ctx["disagreements"]:
        aid = (d.get("claim") or {}).get("assignment")
        if aid: a.setdefault(aid, set()).add((d["entity"], d["rid"]))
    return a


def eligible(agent, item, roles, state, metrics):
    ag = roles["agents"][agent]; k = roles["kinds"][item["kind"]]
    if agent in item["authors"]: return False
    if any(c not in ag.get("caps", []) for c in k.get("needs", [])): return False
    if item["blind"] and "vision" not in ag.get("caps", []): return False
    if any(t["agent"] == agent for t in state["tried"].get(item["item"], [])): return False
    return True


def refresh(ctx, roles, queues, state, now, log=None):
    log = log if log is not None else []
    for i in settle(ctx, now): log.append(f"disagreement {i} settled")
    metrics = measure(ctx)
    pool = pools(ctx, roles, queues, metrics)
    ans = answered(ctx)
    for a in state["assignments"]:
        if a["status"] != "open": continue
        left = [it for it in a["items"] if it["item"] in pool]
        if not left:
            a.update(status="done", closed=now, result={"items": len(a["items"]), "closed": len(a["items"]), "left": 0}); log.append(f"{a['id']} done: every item closed"); continue
        if a["id"] in ans:
            touched = ans[a["id"]]
            for it in left:
                state["tried"].setdefault(it["item"], []).append({"agent": a["agent"], "assignment": a["id"], "outcome": "attempted" if (it["entity"], it["id"]) in touched else "left out", "ts": now})
            a.update(status="done", closed=now, result={"items": len(a["items"]), "closed": len(a["items"]) - len(left), "left": len(left)})
            log.append(f"{a['id']} answered: {len(a['items']) - len(left)} of {len(a['items'])} closed, {len(left)} back to the pool"); continue
        if now > a["lease_until"]:
            a.update(status="expired", closed=now, result={"items": len(a["items"]), "closed": len(a["items"]) - len(left), "left": len(left)})
            log.append(f"{a['id']} expired ({len(left)} items back to the pool)")
    busy = {it["item"] for a in state["assignments"] if a["status"] == "open" for it in a["items"]}
    parked = {i for i, tr in state["tried"].items() if len({t["agent"] for t in tr}) >= 2}
    for agent, ag in roles["agents"].items():
        if ag.get("status") != "active": continue
        mine = [a for a in state["assignments"] if a["agent"] == agent and a["status"] == "open"]
        for kind in ag.get("kinds", []):
            if len(mine) >= ag.get("capacity", 0): break
            if kind not in WORDING_KINDS and demoted(agent, roles, metrics): continue     # too many of its own facts were wrong: it checks and rewords, it does not write new facts
            if any(a["kind"] == kind for a in mine): continue          # one open assignment per kind: variety, and nobody hoards a pool
            kd = roles["kinds"][kind]
            cand = sorted((it for it in pool.values() if it["kind"] == kind and it["item"] not in busy and it["item"] not in parked
                           and eligible(agent, it, roles, state, metrics)), key=lambda it: it["prio"])
            if not cand: continue
            batch = cand[: max(1, kd["batch"] // 2) if ag.get("onboarding") else kd["batch"]]
            a = new_assignment(state, agent, kind, batch, now, kd)
            mine.append(a); busy.update(it["item"] for it in batch)
            log.append(f"issued {a['id']}: {len(batch)} item(s)")
    state["updated"] = now
    return pool, metrics, parked


def new_assignment(state, agent, kind, items, now, kd):
    day = now[:10].replace("-", "")
    key = f"{agent}-{kind}-{day}"; n = state["seq"].get(key, 0) + 1; state["seq"][key] = n
    a = {"id": f"HW-{agent}-{kind}-{day}-{n}", "agent": agent, "kind": kind, "issued": now, "lease_until": _days(now, kd.get("lease_days", 7)),
         "status": "open", "closed": None, "result": None,
         "items": [{"item": it["item"], "entity": it["entity"], "id": it["id"], "field": it["field"]} for it in items]}
    state["assignments"].append(a)
    return a


def empty_state():
    return {"schema": "titan-homework/1", "about": "Assignment state of the research loop (tools/agents/homework.py; docs/agents/RESEARCH_LOOP.md). "
            "Generated: do not edit by hand. Assignments keep their items until answered or past the lease; `tried` remembers who could not do an item.",
            "updated": None, "seq": {}, "assignments": [], "tried": {}}


# ------------------------------------------------------------------------------------------------ pages
def sheet(a, pool, roles, issued_for_lines=None):
    """The pre-filled answer sheet of an open assignment: one JSON line per field to send."""
    ag = roles["agents"][a["agent"]]; out = []
    for ref in a["items"]:
        it = pool.get(ref["item"])
        if not it: continue
        for ent, rid, field, cur in it["lines"]:
            src = {"verify": f"{FILL}: YOUR own exact source for this value (not the one shown), e.g. https://en.numista.com/catalogue/pieces1234.html + the row you read",
                   "read-mint": f"{FILL}: the photo file you read it from, e.g. {it['inputs'][0] if it['inputs'] else 'C123_obv.webp'}, and where on the coin the mark is",
                   "plain-story": f"{FILL}: plain-English rewrite of the existing story; no facts changed",
                   "story-check": f"{FILL}: checked against <exact entry URL>: all claims hold (or: what was wrong + the entry that shows it)",
                   "value": f"{FILL}: exact price page URL + the grade you assumed and why",
                   "research": f"{FILL}: the exact source that answers the question (URL / Numista N# + row / book + page)"}.get(a["kind"], f"{FILL}: exact entry URL + the table row you read")
            new = None if it["blind"] else cur
            if a["kind"] == "research" and field == "research.open_questions": new = it["payload"]["remove_with"]
            out.append(sheet_line((ag.get("by") or [f"model:{a['agent']}"])[0], a["id"], a["kind"], ent, rid, field, cur, new, src, a["issued"], it["inputs"], it["blind"], ag.get("model")))
    return out


def _fmt(v, n=90):
    s = json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v
    return s if len(s) <= n else s[: n - 1] + "…"


def item_md(it):
    p = it["payload"]; k = it["kind"]
    if k == "cite":
        return f"- **{it['label']}** coins {', '.join(it['coins'])}. Ask: " + "; ".join(p["ask"]) + (f". Note: {p['note']}" if p.get("note") else "")
    if k == "catno":
        return f"- **{it['id']}** ({', '.join(it['coins'])}): " + "; ".join(f"{d['system']} record {'/'.join(d['record'])} vs Numista {d['numista_says']} ({d['url']})" for d in p["disputes"])
    if k == "verify":
        if it["blind"]:
            ph = "; ".join(f"{x['side']}: {x['url']}" + (f" (original: {x['drive']})" if x.get("drive") else "") for x in p["photos"])
            return f"- **{it['label']}** (blind: read it yourself) `{it['entity']} {it['id']} {it['field']}`. Photos: {ph or 'none'}"
        return (f"- **{it['label']}** `{it['entity']} {it['id']} {it['field']}` = `{_fmt(p['value'])}` (written by {p['author']}: {_fmt(p['their_source'], 140)})"
                + (" [audit sample]" if p.get("audit") else ""))
    if k == "read-mint":
        ph = "; ".join(f"{x['side']}: {x['url']}" + (f" (original: {x['drive']})" if x.get("drive") else "") for x in p["photos"])
        return f"- **{it['label']}**: mint text now {_fmt(p.get('mint_text_now'))}. Photos: {ph}. {p['hint']}"
    if k in ("story-check", "plain-story"):
        extra = f" Record: {_fmt(p.get('record'), 400)}" if k == "story-check" else f" (shorthand: `{p['shorthand']}`)"
        return f"- **{it['label']}**: “{p['story']}”{extra}"
    if k == "research":
        return f"- **{it['label']}** ({p['type']}): {p['question']} Record: {_fmt(p['record'], 300)}"
    if k == "value":
        return f"- **{it['label']}**: now ${p['est_usd']:,.2f} ({p.get('confidence') or 'low'})" + (f"; silver {p['silver_oz']} oz = melt ${p['melt_usd']:,.2f}" if p.get("melt_usd") else "") + (f". Photo: {p['photos'][0]['url']}" if p.get("photos") else "")
    if k == "arbitrate":
        return (f"- **{it['label']}**: record `{_fmt(p['record']['value'])}` ({p['record'].get('by')}: {_fmt(p['record'].get('source'), 120)}) vs claim "
                f"`{_fmt(p['claim']['value'])}` ({p['claim'].get('by')}: {_fmt(p['claim'].get('source'), 120)})")
    return f"- {it['label']}"


HOW = ("How homework works (read once):\n"
       "1. Each assignment has an id (HW-...). Answer ONE assignment per change file: `changes_{you}_{YYYYMMDD-HHMM}.jsonl` in Drive "
       "`Titan Reliquary/collection-incoming (AI change files)/`. Every line carries `\"assignment\": \"<the id>\"` inside `provenance`.\n"
       "2. Start from the answer sheet: it is pre-filled (download it from the link, or copy the block). Change only `new` (when the record is wrong) "
       "and `source` (your exact source), and set `ts` to the current UTC time. A line whose source still starts with FILL counts as 'left out': "
       "no error, it simply goes back to the pool. Delete nothing else.\n"
       "3. Never guess. Leave out what you cannot do; it goes to another AI or to Joseph. Two AIs that could not do an item park it.\n"
       "4. You never get your own facts to check, and a check never overwrites: a value that disagrees is filed as a disagreement for a third reader.\n"
       "5. Finish within the lease (the date on each assignment); after it the items go back to the pool.\n"
       "6. When you finish, start the next assignment straight away. New assignments appear here after every merge.")


def agent_page(agent, roles, queues, state, pool, metrics, now):
    ag = roles["agents"][agent]
    q = next((x for x in queues.get("agents", []) if x["id"] == agent), {"tasks": []})
    L = [f"<!-- doc-status: current; normative: yes (for {ag['name']}) -->", f"# WORK QUEUE for {ag['name']} (updated {now[:16].replace('T', ' ')} UTC)", "",
         f"From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom; when one task is done, start the next "
         f"without waiting. Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on "
         f"every fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.", "",
         f"**Status:** {ag['status']}{' (probation: every fact you write is checked by another AI until 3 submissions in a row score 8+)' if ag.get('probation') else ''}. {ag['strength']}",
         f"**How you get this:** {ag['reach']}", ""]
    tasks = q.get("tasks", [])
    first = [t for t in tasks if t["state"] == "now"]
    if first:
        L += ["## Finish first", ""]
        for t in first: L += [f"### {t['title']}  (fix list {t['fix']})", "", t["what"], "", f"**Done when:** {t['done_when']}", ""]
    mine = [a for a in state["assignments"] if a["agent"] == agent and a["status"] == "open"]
    if mine:
        L += ["## Homework (generated from the data)", "", HOW, ""]
        for n, a in enumerate(mine, 1):
            kd = roles["kinds"][a["kind"]]; items = [pool[x["item"]] for x in a["items"] if x["item"] in pool]
            L += [f"### {n}. {a['id']} · {kd['role']} · {kd['title'].format(n=len(items))} · due {a['lease_until'][:10]}  (fix list {kd['fix']})", "",
                  kd["what"], "", f"**Done when:** {kd['done_when']}", "",
                  f"**Answer sheet:** {RAW}docs/agents/homework/sheets/{a['id']}.jsonl (save your edited copy as changes_{agent}_YYYYMMDD-HHMM.jsonl)", "",
                  "Items:"] + [item_md(it) for it in items] + [""]
            if ag.get("inline_sheets"):      # an AI that cannot open GitHub gets the sheet in the page itself
                L += ["Answer sheet (the same as the link):", "", "```jsonl"] + [json.dumps(x, ensure_ascii=False) for x in sheet(a, pool, roles)] + ["```", ""]
    rest = [t for t in tasks if t["state"] in ("next", "later", "always")]
    if rest:
        L += ["## Projects (after the homework)", ""]
        for t in rest:
            L += [f"### {t['title']}  [{t['state'].upper()}]  (fix list {t['fix']})", "", t["what"], "", f"**Done when:** {t['done_when']}", ""]
    r = metrics.get(agent)
    done = [a for a in state["assignments"] if a["agent"] == agent and a["status"] != "open"]
    L += ["## Your numbers (measured, not self-reported)", "",
          f"- Assignments answered: {sum(1 for a in done if a['status'] == 'done')}; expired: {sum(1 for a in done if a['status'] == 'expired')}.",
          (f"- Your facts checked by another contributor: {r['checked_n']} ({r['confirmed']} confirmed, {r['wrong']} wrong"
           + (f"; error rate {100 * r['error_rate']:.1f} %, 95 % range {100 * r['error_ci95'][0]:.0f}-{100 * r['error_ci95'][1]:.0f} %)" if r.get("error_rate") is not None else ")")
           + f". Checks you did for others: {r['checks_done']}. Open disagreements you are part of: {r['disagreements_open']}.") if r else
          "- None of your facts has been checked by another contributor yet.",
          f"- Share of your new facts that get checked first: {round(100 * audit_rate(agent, roles, metrics))} %.", ""]
    return "\n".join(L).rstrip() + "\n"


def overview(roles, queues, state, pool, metrics, parked, ctx, now):
    from collections import Counter
    cnt = Counter(it["kind"] for it in pool.values())
    L = ["<!-- doc-status: current; normative: yes -->", f"# The research loop: who is doing what (updated {now[:16].replace('T', ' ')} UTC)", "",
         "Generated by tools/agents/homework.py after every publish (docs/agents/RESEARCH_LOOP.md). Each AI's page is docs/agents/QUEUE_{ai}.md, "
         "the same text as its Drive doc 'WORK QUEUE for ...'.", "", "## Open work in the pools", ""]
    L += [f"- **{k}** ({roles['kinds'][k]['role']}): {cnt.get(k, 0)}" for k in roles["kinds"]] + [""]
    L += ["## Assignments", ""]
    for agent, ag in roles["agents"].items():
        mine = [a for a in state["assignments"] if a["agent"] == agent and a["status"] == "open"]
        q = next((x for x in queues.get("agents", []) if x["id"] == agent), {"tasks": []})
        proj = [t["title"] for t in q.get("tasks", []) if t["state"] in STATES_OPEN]
        L += [f"### {ag['name']} ({ag['status']})", ""] + [f"- {a['id']}: {len(a['items'])} items, due {a['lease_until'][:10]}" for a in mine] + \
             [f"- project: {p}" for p in proj] + ([] if (mine or proj) else ["- nothing open"]) + [""]
    L += ["## Measured (facts checked by another contributor)", "", "| who | checked | confirmed | wrong | error rate | 95 % range |", "|---|---|---|---|---|---|"]
    for a, r in sorted(metrics.items()):
        if not r["checked_n"]: continue
        L.append(f"| {PV.NAMES.get(a, a)} | {r['checked_n']} | {r['confirmed']} | {r['wrong']} | {100 * r['error_rate']:.1f} % | {100 * r['error_ci95'][0]:.0f}-{100 * r['error_ci95'][1]:.0f} % |")
    od = [d for d in ctx["disagreements"] if d.get("status") == "open"]
    L += ["", f"## Open disagreements ({len(od)})", ""] + [f"- {d['id']} {d['entity']} {d['rid']} {d['field']}: {_fmt(d['record']['value'], 40)} ({PV.friendly(d['record'].get('by'))}) vs {_fmt(d['claim']['value'], 40)} ({PV.friendly(d['claim'].get('by'))})" for d in od]
    L += ["", f"## Parked (two AIs tried and could not do it: {len(parked)})", ""] + [f"- {i}" for i in sorted(parked)]
    return "\n".join(L).rstrip() + "\n"


def write_all(root, roles, queues, state, pool, metrics, parked, ctx, now):
    P = paths(root)
    _write(P["state"], json.dumps(state, ensure_ascii=False, indent=1) + "\n")
    os.makedirs(P["sheets"], exist_ok=True)
    keep = set()
    for a in state["assignments"]:
        if a["status"] != "open": continue
        fn = os.path.join(P["sheets"], f"{a['id']}.jsonl"); keep.add(os.path.basename(fn))
        _write(fn, "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in sheet(a, pool, roles)))
    for f in os.listdir(P["sheets"]):
        if f.endswith(".jsonl") and f not in keep: os.remove(os.path.join(P["sheets"], f))
    for agent in roles["agents"]:
        _write(os.path.join(P["agents"], f"QUEUE_{agent}.md"), agent_page(agent, roles, queues, state, pool, metrics, now))
        mine = [a for a in state["assignments"] if a["agent"] == agent and a["status"] == "open"]
        _write(os.path.join(P["hw"], f"{agent}.json"), json.dumps({"agent": agent, "updated": now, "assignments": [
            dict(a, items_full=[{k: v for k, v in pool[x["item"]].items() if k not in ("lines", "prio")} for x in a["items"] if x["item"] in pool]) for a in mine]},
            ensure_ascii=False, indent=1) + "\n")
    _write(os.path.join(P["agents"], "QUEUES.md"), overview(roles, queues, state, pool, metrics, parked, ctx, now))
    from collections import Counter
    _write(os.path.join(P["hw"], "metrics.json"), json.dumps({"updated": now, "pools": dict(Counter(it["kind"] for it in pool.values())),
                                                              "agents": metrics, "parked": sorted(parked),
                                                              "open_assignments": {a: sum(1 for x in state["assignments"] if x["agent"] == a and x["status"] == "open") for a in roles["agents"]}},
                                                             ensure_ascii=False, indent=1) + "\n")
    if ctx.get("disagreements_changed"):
        from collection_io import dump_jsonl
        dump_jsonl(os.path.join(ctx["coll"], "disagreements.jsonl"), ctx["disagreements"])


def summary(state, pool, metrics, roles):
    """The small block publish.py puts into data/status.json (`loop`)."""
    from collections import Counter
    return {"pools": dict(Counter(it["kind"] for it in pool.values())),
            "open_assignments": {a: sum(1 for x in state["assignments"] if x["agent"] == a and x["status"] == "open") for a in roles["agents"]},
            "answered": sum(1 for x in state["assignments"] if x["status"] == "done"),
            "checked_by_another": {a: {"checked": r["checked_n"], "wrong": r["wrong"]} for a, r in metrics.items() if r["checked_n"]}}


def check(roles, queues, state):
    bad = []
    for agent, ag in roles["agents"].items():
        if ag.get("status") != "active": continue
        q = next((x for x in queues.get("agents", []) if x["id"] == agent), {"tasks": []})
        n = sum(1 for a in state["assignments"] if a["agent"] == agent and a["status"] == "open") + sum(1 for t in q.get("tasks", []) if t["state"] in STATES_OPEN)
        if n < MIN_OPEN: bad.append(f"{ag['name']}: only {n} open tasks (keep {MIN_OPEN}+)")
    return bad


def run(root=ROOT, now=None, dry=False, coll=None, ctx=None, log=None):
    now = now or now_utc(); P = paths(root); log = log if log is not None else []
    roles = _load(P["roles"]); queues = _load(P["queues"], {"agents": []}); state = _load(P["state"]) or empty_state()
    ctx = ctx or load_context(root, coll)
    before = json.dumps(ctx["disagreements"], sort_keys=True)
    pool, metrics, parked = refresh(ctx, roles, queues, state, now, log)
    ctx["disagreements_changed"] = json.dumps(ctx["disagreements"], sort_keys=True) != before
    if not dry: write_all(root, roles, queues, state, pool, metrics, parked, ctx, now)
    return {"roles": roles, "queues": queues, "state": state, "pool": pool, "metrics": metrics, "parked": parked, "log": log}


def main(argv):
    root = argv[argv.index("--root") + 1] if "--root" in argv else ROOT
    now = argv[argv.index("--now") + 1] if "--now" in argv else None
    P = paths(root)
    if "--check" in argv:
        bad = check(_load(P["roles"]), _load(P["queues"], {"agents": []}), _load(P["state"]) or empty_state())
        print("\n".join(bad) or "every active AI has work queued"); return 1 if bad else 0
    if "--pool" in argv:
        i = argv.index("--pool"); kind = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("--") else None
        r = run(root, now, dry=True)
        for it in sorted(r["pool"].values(), key=lambda x: (x["kind"], x["prio"])):
            if kind is None or it["kind"] == kind: print(f"{it['kind']:<12} {it['item']:<48} {it['label'][:70]}")
        return 0
    r = run(root, now, dry="--dry-run" in argv)
    print("\n".join(r["log"]) or "no change")
    from collections import Counter
    print("pools: " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(it["kind"] for it in r["pool"].values()).items())))
    bad = check(r["roles"], r["queues"], r["state"])
    if bad: print("WARNING " + "; ".join(bad))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
