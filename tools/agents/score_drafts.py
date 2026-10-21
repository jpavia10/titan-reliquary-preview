#!/usr/bin/env python3
"""Score drafts (fix list #91): every outside AI's merged change file gets a drafted operational-reliability score, so the scorecard and the
FEEDBACK docs stay current without bookkeeping. Claude reads each draft, adjusts it, adds the praise and the initiative note, and moves the row
into collaborators/CONTRIBUTOR_SCORES.md; a file named there drops off the drafts.

    python3 tools/agents/score_drafts.py            writes collaborators/SCORE_DRAFTS.md (publish.py runs it after every real publish)

The rubric is the one at the top of CONTRIBUTOR_SCORES.md (10 points). Drafted from what the pipeline knows, never from the file's own claims:
  place 2      file name `changes_{agent}_{YYYYMMDD-HHMM}.jsonl` (2), any other name (1)
  accepted 2   merged as sent (2); re-filed by Claude (0). A file Claude edited before merging is still a 2 here: adjust it by hand
  accurate 3   of the file's facts that something else has cross-checked since: held = a later independent source or reading agreed, a
               disagreement went its way, a planted canary was caught, a verify answer agreed with the record; wrong = a disagreement went
               against it (resolution.error_by), the owner corrected it, a canary was sent back as right. Batch formula: 3 x share held
               (100 % = 3, 90-99 = 2, 67-89 = 1, else 0); nothing cross-checked yet = "?" (the draft total says so)
  complete 2   homework: share of the assignment's items answered (90 % = 2, 50 % = 1); other files: every line has a provenance and a source
  tier 1       no line outside its assignment and no verify answer on the AI's own fact
Rejected files are bounced unscored (rubric: a rejected file does not reset probation); they are listed with the first reason.
"""
import collections, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import provenance as PV  # noqa: E402

NAME_OK = re.compile(r"^changes_([a-z0-9-]+)_(\d{8})-(\d{4})\.jsonl$")
ANY = re.compile(r"^changes_([a-z0-9-]+?)_(\d{8})-(\d{4})")


def _read(p):
    with open(p, encoding="utf-8", errors="replace") as fh: return fh.read()


def _lines(p):
    out = []
    if not os.path.exists(p): return out
    for l in _read(p).splitlines():
        l = l.strip()
        if not l: continue
        try: out.append(json.loads(l))
        except ValueError: out.append({})
    return out


def _agent(tok): return PV.agent_of("model:" + tok)


def scored(text):
    """(agent, 'YYYYMMDD-HHMM') the scorecard names, by section (## Grok ...): full stamps, then the short '-HHMM' and 'a..b' forms that
    follow them in the same row ('changes_muse_20261003-2208/-2215/-2232', '..2249', '-20261019-2316', '-1626/-1633' with the row's date)."""
    out = set(); agent = None
    for row in text.splitlines():
        h = re.match(r"^##\s+(\w+)", row)
        if h: agent = _agent(h.group(1).lower()); continue
        if agent is None or not row.startswith("|"): continue
        dm = re.search(r"\|\s*(\d{4})-(\d{2})-(\d{2})", row); day = "".join(dm.groups()) if dm else None
        prev = None
        for m in re.finditer(r"(\d{8})-(\d{4})|(\.\.|/|`)-?(\d{4})(?![\d-])", row):
            if m.group(1):
                day, prev = m.group(1), m.group(2); out.add((agent, f"{day}-{prev}")); continue
            if not day: continue
            hhmm = m.group(4)
            if m.group(3) == ".." and prev:
                out.update((agent, f"{day}-{t:04d}") for t in range(int(prev), int(hhmm) + 1) if t % 100 < 60)
            out.add((agent, f"{day}-{hhmm}")); prev = hhmm
    return out


def band(share):
    return 3 if share >= 1 else 2 if share >= .9 else 1 if share >= .67 else 0


def refiled(applied):
    """AI file name -> the changes_claude file it was re-filed as (from the REFILED notes)."""
    out = {}
    for n in glob.glob(os.path.join(applied, "*REFILED*")):
        text = _read(n)
        m = re.match(r"(changes_claude_\d{8}-\d{4})", os.path.basename(n))
        target = m.group(1) + ".jsonl" if m else None
        if not target:
            m = re.search(r"(changes_claude_\d{8}-\d{4})\.jsonl", text); target = m.group(1) + ".jsonl" if m else None
        for x in re.findall(r"changes_(?!claude)[a-z0-9-]+_\d{8}-\d{4}", text): out.setdefault(x + ".jsonl", target)
    return out


class World:
    """Everything the drafts read once: the change log, disagreements, canaries, assignments."""
    def __init__(self, root):
        self.root = root; coll = os.path.join(root, "collection")
        self.log = _lines(os.path.join(coll, "changes.jsonl"))
        self.by_key = {(e.get("ts"), e.get("by"), e.get("entity"), e.get("id"), e.get("field")): e for e in self.log}
        self.later = collections.defaultdict(list)
        for e in self.log: self.later[(e.get("entity"), e.get("id"), e.get("field"))].append(e)
        self.dis = _lines(os.path.join(coll, "disagreements.jsonl"))
        hw = os.path.join(root, "docs", "agents", "homework")
        self.canaries = _lines(os.path.join(hw, "canaries.jsonl"))
        a = json.loads(_read(os.path.join(hw, "assignments.json"))) if os.path.exists(os.path.join(hw, "assignments.json")) else {}
        self.asg = {x["id"]: x for x in (a.get("assignments") or [])}
        self.answers = collections.defaultdict(list)          # assignment -> answered lines in every merged file (an AI may split one sheet over files)
        for p in glob.glob(os.path.join(coll, "_incoming", "applied", "changes_*.jsonl")):
            for e in _lines(p):
                pv = e.get("provenance") if isinstance(e.get("provenance"), dict) else {}
                aid = pv.get("assignment") or pv.get("run_id")
                if aid in self.asg and not blank(e): self.answers[aid].append(e)


def key(e): return (e.get("ts"), e.get("by"), e.get("entity"), e.get("id"), e.get("field"))
def fact(e): return (e.get("entity"), e.get("id"), e.get("field"))


def accuracy(w, lines, agent):
    """-> (held, wrong, notes) over this file's lines."""
    held = wrong = 0; notes = []
    mine = {key(e) for e in lines}
    asg = {(e.get("provenance") or {}).get("assignment") or (e.get("provenance") or {}).get("run_id") for e in lines if isinstance(e.get("provenance"), dict)}
    for e in lines:
        ev = w.by_key.get(key(e))
        if ev is None: continue
        f = fact(e); verdict = None
        for d in w.dis:
            if d.get("status") != "resolved" or (d.get("entity"), d.get("rid"), d.get("field")) != f: continue
            rec = d.get("record") or {}
            if (rec.get("ts"), rec.get("by")) != (e.get("ts"), e.get("by")): continue
            r = d.get("resolution") or {}
            if PV.agent_of(r.get("error_by")) == agent: verdict = "wrong"; notes.append(f"{d['id']} went against it ({e.get('id')} {e.get('field')}: {str(r.get('source') or '')[:90]})")
            elif r.get("winner") == "record" and verdict is None: verdict = "held"
        if verdict is None and ev.get("old") == ev.get("new"): verdict = "held"           # agreed with the record (a check that matched)
        if verdict is None:
            for x in w.later[f]:
                if (x.get("ts") or "") <= (e.get("ts") or "") or key(x) in mine: continue
                if x.get("by", "").startswith("owner") and x.get("verified") and x.get("new") != ev.get("new"):
                    verdict = "wrong"; notes.append(f"the owner corrected {e.get('id')} {e.get('field')}"); break
                if PV.agent_of(x.get("by")) not in (agent, "claude-script") and not str(x.get("by", "")).startswith("script:") and x.get("new") == ev.get("new"):
                    verdict = "held"; break
        held += verdict == "held"; wrong += verdict == "wrong"
    for d in w.dis:                                                              # lines that were filed as disagreements, never applied
        c = d.get("claim") or {}
        if c.get("by") is None or (c.get("ts"), c.get("by"), d.get("entity"), d.get("rid"), d.get("field")) not in mine: continue
        if d.get("status") != "resolved": continue
        r = d.get("resolution") or {}
        if PV.agent_of(r.get("error_by")) == agent: wrong += 1; notes.append(f"{d['id']} went against it ({d.get('rid')} {d.get('field')}: {str(r.get('source') or '')[:90]})")
        elif r.get("winner") == "claim": held += 1
    ts = {e.get("ts") for e in lines}
    for c in w.canaries:
        if c.get("assignment") in asg and c.get("agent") == agent and c.get("ts") in ts:
            if c.get("outcome") == "missed": wrong += 1; notes.append(f"canary missed: a planted wrong value sent back as right ({c.get('item')})")
            elif c.get("outcome") == "caught": held += 1
    return held, wrong, notes


def overlap(a, b): return a == b or a.startswith(b + ".") or b.startswith(a + ".")
def blank(e): return e.get("new") is None or str(e.get("source") or "").lstrip().upper().startswith("FILL")


def draft(w, name, lines, agent, refiled_as=None):
    notes = []
    place = 2 if NAME_OK.match(name) and _agent(NAME_OK.match(name).group(1)) == agent else 1
    if place == 1: notes.append("file name is not changes_{agent}_{YYYYMMDD-HHMM}.jsonl")
    accepted = 0 if refiled_as else 2
    if refiled_as: notes.append(f"re-filed by Claude as {refiled_as}")
    model = [e for e in lines if str(e.get("by", "")).startswith("model:")]
    asg_ids = sorted({(e.get("provenance") or {}).get("assignment") or (e.get("provenance") or {}).get("run_id") for e in model
                      if isinstance(e.get("provenance"), dict) and ((e.get("provenance") or {}).get("assignment") or (e.get("provenance") or {}).get("run_id")) in w.asg})
    answered = [e for e in lines if not blank(e)]
    if asg_ids:
        items = sorted({(t.get("entity"), t.get("id"), t.get("field")) for a in asg_ids for t in w.asg[a].get("items") or []}, key=str)
        hit = lambda t, e: t[:2] == fact(e)[:2] and (not t[2] or overlap(t[2], e.get("field") or ""))      # same rule as apply_changes
        every = answered + [e for a in asg_ids for e in w.answers[a] if PV.agent_of(e.get("by")) == agent]
        got = sum(1 for t in items if any(hit(t, e) for e in every))
        share = got / max(1, len(items))
        complete = 2 if share >= .9 else 1 if share >= .5 else 0
        notes.append(f"answered {got} of {len(items)} items of {', '.join(asg_ids)}" + (" (with its other files for the same sheet)" if len(every) > len(answered) else ""))
        outside = [e for e in answered if not any(hit(t, e) for t in items)]
    else:
        noprov = sum(1 for e in model if not isinstance(e.get("provenance"), dict)); nosrc = sum(1 for e in answered if len(str(e.get("source") or "")) < 8)
        complete = 2 if not noprov and not nosrc else 1 if noprov + nosrc <= len(lines) // 2 else 0
        if noprov: notes.append(f"{noprov} line(s) without provenance")
        if nosrc: notes.append(f"{nosrc} line(s) without a source")
        outside = []
    own = []
    for e in answered:
        pv = e.get("provenance") if isinstance(e.get("provenance"), dict) else {}
        if "verify" not in str(pv.get("workflow") or "") and not str(pv.get("assignment") or pv.get("run_id") or "").startswith("HW-") : continue
        if (w.asg.get(pv.get("assignment") or pv.get("run_id")) or {}).get("kind") != "verify": continue
        prev = [x for x in w.later[fact(e)] if (x.get("ts") or "") < (e.get("ts") or "") and x.get("old") != x.get("new")]
        if prev and PV.agent_of(prev[-1].get("by")) == agent: own.append(e)
    tier = 0 if outside or own else 1
    if outside: notes.append(f"{len(outside)} line(s) outside the assignment (e.g. {outside[0].get('id')} {outside[0].get('field')})")
    if own: notes.append(f"{len(own)} verify answer(s) on its own earlier fact")
    kept = sum(1 for e in lines if key(e) in w.by_key); filed = sum(1 for d in w.dis if ((d.get("claim") or {}).get("ts"), (d.get("claim") or {}).get("by"), d.get("entity"), d.get("rid"), d.get("field")) in {(*key(e)[:2], *fact(e)) for e in lines})
    left = len(lines) - len(answered); dropped = len(answered) - kept - filed
    notes.insert(0, f"{len(lines)} lines: {kept} in the change log, {filed} filed as disagreements" + (f", {left} left blank" if left else "") + (f", {dropped} not written (stale, no change or already applied)" if dropped > 0 else ""))
    held, wrong, an = accuracy(w, lines, agent); notes += an
    acc = band(held / (held + wrong)) if held + wrong else None
    notes.append(f"cross-checked so far: {held} held, {wrong} wrong" if held + wrong else "nothing cross-checked yet")
    total = place + accepted + (acc or 0) + complete + tier
    return {"file": name, "agent": agent, "place": place, "accepted": accepted, "accurate": acc, "complete": complete, "tier": tier,
            "total": total, "pending": acc is None, "notes": notes}


def build(root=ROOT):
    w = World(root); coll = os.path.join(root, "collection"); applied = os.path.join(coll, "_incoming", "applied"); rejected = os.path.join(coll, "_incoming", "rejected")
    roles = json.loads(_read(os.path.join(root, "docs", "agents", "roles.json")))
    agents = set((roles.get("agents") or roles).keys())
    sp = os.path.join(root, "collaborators", "CONTRIBUTOR_SCORES.md")
    done = scored(_read(sp)) if os.path.exists(sp) else set()
    last = {}
    for a, st in done: last[a] = max(last.get(a, ""), st)
    ref = refiled(applied)

    def new(name):
        m = ANY.match(name)
        if not m: return None
        a = _agent(m.group(1)); st = f"{m.group(2)}-{m.group(3)}"
        if a not in agents or (a, st) in done or st <= last.get(a, ""): return None
        return a

    drafts, bounced = [], []
    for p in sorted(glob.glob(os.path.join(applied, "changes_*.jsonl"))):
        a = new(os.path.basename(p))
        if a: drafts.append(draft(w, os.path.basename(p), _lines(p), a))
    for name, target in sorted(ref.items()):
        a = new(name)
        if not a or not target or os.path.exists(os.path.join(applied, name)): continue
        lines = [e for e in _lines(os.path.join(applied, target)) if PV.agent_of(e.get("by")) == a]
        if lines: drafts.append(draft(w, name, lines, a, refiled_as=target))
    for p in sorted(glob.glob(os.path.join(rejected, "changes_*.jsonl"))):
        a = new(os.path.basename(p))
        if not a: continue
        rp = p + ".report.txt"; why = ""
        if os.path.exists(rp):
            rl = [l.strip() for l in _read(rp).splitlines() if l.strip()]
            why = next((l for l in rl if l.startswith("line ")), rl[0] if rl else "")
        bounced.append({"file": os.path.basename(p), "agent": a, "why": why[:200]})
    return drafts, bounced


def render(drafts, bounced, now=""):
    L = ["<!-- doc-status: current; normative: no; generated by tools/agents/score_drafts.py (fix list #91). Do not edit: adjust the score when you move a row into CONTRIBUTOR_SCORES.md. -->",
         "# Score drafts", "",
         "Drafted from the merge and the cross-checks since (rubric: top of `collaborators/CONTRIBUTOR_SCORES.md`). For each row: check it, adjust "
         "(a file you edited before merging is accepted 1, not 2), add what it did right and the initiative note, then move it into the scorecard "
         "and the AI's FEEDBACK doc. A file named in the scorecard drops off this page on the next publish.", ""]
    if not drafts and not bounced: return "\n".join(L + ["Nothing waiting: every outside AI's file is scored.", ""])
    for a in sorted({d["agent"] for d in drafts} | {b["agent"] for b in bounced}):
        L += [f"## {PV.NAMES.get(a, a.capitalize())}", "", "| File | Draft | Place | Accepted | Accurate | Complete | Tier | Found by the pipeline |", "|---|---|---|---|---|---|---|---|"]
        for d in (x for x in drafts if x["agent"] == a):
            tot = f"**{d['total']} / 10**" if not d["pending"] else f"**{d['total']} / 7** + accuracy ?"
            L.append(f"| `{d['file']}` | {tot} | {d['place']} | {d['accepted']} | {'?' if d['accurate'] is None else d['accurate']} | {d['complete']} | {d['tier']} | " + "; ".join(n.replace("|", "/") for n in d["notes"]) + " |")
        for b in (x for x in bounced if x["agent"] == a):
            L.append(f"| `{b['file']}` | bounced, unscored | | | | | | rejected: {b['why'].replace('|', '/')} |")
        L.append("")
    return "\n".join(L)


def write(root=ROOT):
    drafts, bounced = build(root)
    out = os.path.join(root, "collaborators", "SCORE_DRAFTS.md")
    with open(out, "w", encoding="utf-8", newline="\n") as fh: fh.write(render(drafts, bounced))
    return drafts, bounced


if __name__ == "__main__":
    d, b = write(sys.argv[1] if len(sys.argv) > 1 else ROOT)
    print(f"score drafts: {len(d)} to score, {len(b)} bounced (collaborators/SCORE_DRAFTS.md)")
