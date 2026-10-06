#!/usr/bin/env python3
"""Turn the owner's answers from the app into verified change events (fix list #36 + #43).

The app (wings/questions.js) saves an answers file, `answers_owner_{YYYYMMDD-HHMM}.json`:
  {"kind": "owner-answers", "made": "<ISO time>", "answers": [
     {"q": "q-c066-date", "choice": "1976", "text": "optional free text"},      # a question from collection/owner_questions.json
     {"confirm": {"scan": "C094", "fact": "year"}}                              # "Confirm" on a certainty label in the coin view
  ]}

  python3 tools/pipeline/owner_answers.py ANSWERS.json [--dry]

writes collection/_incoming/changes_owner_{stamp}.jsonl (by: owner, verified: true; merged by publish.py), appends every answer to
collection/owner_answers.jsonl (closes the question in the app) and prints the follow-ups Claude still has to do by hand.
A confirm re-states the fact's CURRENT value with verified: true, so the certainty label becomes "Verified" (tools/pipeline/provenance.py).
"""
import datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import collection_io as C  # noqa: E402

# fact (as named by provenance.FACTS / the app's labels) -> (entity, field). Type facts are confirmed on the coin's type.
CONFIRM = {
    "year": ("specimen", "issue.year"), "mint": ("specimen", "issue.mint_marks"), "mintage": ("specimen", "issue.mintage"),
    "value": ("specimen", "value.est_usd"), "story": ("specimen", "story"),
    "country": ("type", "country"), "denomination": ("type", "denomination"), "catalog": ("type", "catalogs"),
    "composition": ("type", "composition"), "weight": ("type", "nominal.weight_g"), "design": ("type", "design"),
    "series": ("type", "series"), "ruler": ("type", "ruler"), "period": ("type", "period"),
}


def get_path(rec, field):
    cur = rec
    for k in field.split("."):
        if not isinstance(cur, dict): return None
        cur = cur.get(k)
    return cur


def load_questions(coll):
    p = os.path.join(coll, "owner_questions.json")
    return {q["id"]: q for q in C.read_json(p)["questions"]} if os.path.exists(p) else {}


def answered_ids(coll):
    p = os.path.join(coll, "owner_answers.jsonl")
    return {a.get("q") for a in C.read_jsonl(p)} if os.path.exists(p) else set()


def convert(answers, col, questions, ts):
    """-> (events, log_rows, followups, problems)"""
    events, log, follow, problems = [], [], [], []
    src = "owner answer in the app"

    def ev(entity, rid, field, new, why):
        events.append({"ts": ts, "by": "owner", "entity": entity, "id": rid, "op": "set", "field": field, "new": new,
                       "source": f"{src}: {why}"[:300], "verified": True})

    def confirm(scan, fact, why=None):
        spec = col.specs.get(scan)
        if not spec or fact not in CONFIRM: problems.append(f"confirm {scan}/{fact}: unknown coin or fact"); return False
        entity, field = CONFIRM[fact]
        rid = scan if entity == "specimen" else spec.get("type")
        rec = spec if entity == "specimen" else col.types.get(rid)
        cur = get_path(rec, field) if rec else None
        if cur in (None, "", []): problems.append(f"confirm {scan}/{fact}: the record has no value to confirm"); return False
        ev(entity, rid, field, cur, why or (f"confirmed {fact} of {scan}" + (f" (type {rid})" if entity == "type" else "")))
        return True

    for a in answers:
        if "confirm" in a:
            c = a["confirm"] or {}
            if confirm(c.get("scan"), c.get("fact")): log.append({"ts": ts, "confirm": {"scan": c.get("scan"), "fact": c.get("fact")}})
            continue
        q = questions.get(a.get("q"))
        if not q: problems.append(f"unknown question {a.get('q')!r}"); continue
        opt = next((o for o in q["options"] if o["label"] == a.get("choice")), None)
        if not opt: problems.append(f"{q['id']}: unknown choice {a.get('choice')!r}"); continue
        why = f"{q['id']}: {q['ask']} -> {opt['label']}" + (f" ({a['text']})" if a.get("text") else "")
        for eff in opt.get("effect", []):
            if "set" in eff:
                s = eff["set"]; ev(s["entity"], s["id"], s["field"], s["new"], why)
            elif "confirm" in eff:
                confirm(eff["confirm"]["scan"], eff["confirm"]["fact"], why)
        if opt.get("followup"): follow.append(f"{q['id']}: {opt['followup']}" + (f" Owner wrote: {a['text']}" if a.get("text") else ""))
        if not opt.get("keep_open"): log.append({"ts": ts, "q": q["id"], "choice": opt["label"], "text": a.get("text") or None, "followup": opt.get("followup")})
    return events, log, follow, problems


def main(argv):
    if not argv or argv[0] in ("-h", "--help"): print(__doc__); return 0
    dry = "--dry" in argv
    data = C.read_json(argv[0])
    if data.get("kind") != "owner-answers": print("not an owner answers file (kind != owner-answers)"); return 2
    coll = os.path.join(ROOT, "collection")
    col = C.Collection(coll)
    made = data.get("made") or datetime.datetime.now(datetime.timezone.utc).isoformat()
    ts = made[:19].replace(" ", "T") + "Z" if not made.endswith("Z") else made[:19] + "Z"
    events, log, follow, problems = convert(data.get("answers") or [], col, load_questions(coll), ts)
    stamp = ts[:16].replace("-", "").replace(":", "").replace("T", "-")
    for p in problems: print("SKIPPED", p)
    print(f"{len(events)} change event(s), {len(log)} answer(s) recorded, {len(follow)} follow-up(s)")
    for f in follow: print("FOLLOW-UP", f)
    if dry: return 0
    if events:
        out = os.path.join(coll, "_incoming", f"changes_owner_{stamp}.jsonl")
        with open(out, "w", encoding="utf-8", newline="\n") as fh:
            for e in events: fh.write(json.dumps(e, ensure_ascii=False) + "\n")
        print("wrote", os.path.relpath(out, ROOT), "(run tools/pipeline/publish.py)")
    if log:
        with open(os.path.join(coll, "owner_answers.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
            for r in log: fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
