#!/usr/bin/env python3
"""Add an AI to the research loop the one way every AI comes in (fix list #97; docs/agents/RESEARCH_LOOP.md section 9).

    python3 tools/agents/new_agent.py ID "Name" [--caps web,vision,drive,numista,code] [--capacity 6] [--dry]

Writes a roles.json entry (active, on probation, onboarding = half batches, every fact it writes checked first) and a queues.json entry with
the proof-of-access task and the standing blind photo-reading task. The next publish (or `python3 tools/agents/homework.py`) writes its page
docs/agents/QUEUE_{id}.md and the compact Drive copy docs/agents/drive/QUEUE_{id}.txt; the main photo test appears on it by itself.
Claude then makes its two Drive docs ('WORK QUEUE for {Name}', 'FEEDBACK for {Name}') and pastes the page.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
KINDS = ["verify", "read-mint", "story-check", "contradiction", "research", "value", "cite", "plain-story"]   # checking first, writing new facts later


def access_task(name, aid):
    raw = "https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/"
    return {"n": 1, "title": "Proof of access (3 quick questions)", "fix": "#97", "state": "now",
            "what": (f"Before any homework, show that you can open the files. Open these three links and quote ONE exact line from each: "
                     f"(1) {raw}docs/agents/QUEUE_{aid}.md (this page), (2) {raw}data/status.json (the line with \"build\"), "
                     f"(3) {raw}AI_START_HERE.md (its first heading). Save the three quotes as access_{aid}_YYYYMMDD-HHMM.txt in Drive "
                     "'collection-incoming (AI change files)', or reply with them in one code block. Never guess a line you could not open: say which link failed."),
            "done_when": "Claude checked the three quotes against the files; your first homework batch is already below."}


def photo_task(aid):
    return {"n": 2, "title": "Read new coin photos, blind", "fix": "#55", "state": "always",
            "what": "Whenever NOID photos appear in Drive STAGING, write a Phase 1 change file for them per AI_START_HERE (section 2b), without looking at any other AI's read first.",
            "done_when": "Ongoing."}


def main(argv):
    if len(argv) < 2 or argv[0].startswith("-"): print(__doc__); return 1
    aid, name = argv[0].lower(), argv[1]
    caps = (argv[argv.index("--caps") + 1] if "--caps" in argv else "web,vision,drive").split(",")
    cap = int(argv[argv.index("--capacity") + 1]) if "--capacity" in argv else 6
    rp, qp = os.path.join(ROOT, "docs", "agents", "roles.json"), os.path.join(ROOT, "docs", "agents", "queues.json")
    roles, queues = json.load(open(rp, encoding="utf-8")), json.load(open(qp, encoding="utf-8"))
    if aid in roles["agents"]: print(f"{aid} is already in roles.json"); return 2
    roles["agents"][aid] = {"name": name, "status": "active", "probation": True, "onboarding": True, "by": [f"model:{aid}"], "model": aid, "caps": caps,
                            "capacity": cap, "kinds": [k for k in KINDS if all(c in caps for c in roles["kinds"][k].get("needs", []))],
                            "strength": f"New ({name}): proof of access first, then half batches with every fact checked; full batches after its first good submission, off probation after 3 in a row that score 8+.",
                            "reach": f"Drive doc 'WORK QUEUE for {name}' in Titan Reliquary/ (docs/agents/QUEUE_{aid}.md). Drops change files in Drive collection-incoming (AI change files) as changes_{aid}_YYYYMMDD-HHMM.jsonl."}
    queues["agents"].append({"id": aid, "name": name, "status": "active", "strength": roles["agents"][aid]["strength"], "reach": roles["agents"][aid]["reach"],
                             "drive_note": f"NEW: welcome, {name}. Start with the proof of access below, then the homework.", "tasks": [access_task(name, aid), photo_task(aid)]})
    if "--dry" in argv: print(json.dumps(roles["agents"][aid], indent=1)); return 0
    for p, d in ((rp, roles), (qp, queues)):
        ind = 1 if open(p, encoding="utf-8").read(4) == '{\n "' else 2          # keep each file's own indent
        with open(p, "w", encoding="utf-8", newline="\n") as fh: json.dump(d, fh, ensure_ascii=False, indent=ind); fh.write("\n")
    print(f"added {aid} ({name}) to roles.json and queues.json; next: python3 tools/agents/homework.py, then the two Drive docs")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
