#!/usr/bin/env python3
"""Render the other AIs' standing work queues (docs/agents/queues.json) into one page per AI (docs/agents/QUEUE_{id}.md, the text that also
goes into each AI's Drive doc 'WORK QUEUE for {name}') and an overview (docs/agents/QUEUES.md).

    python3 tools/agents/render_queues.py            writes the pages
    python3 tools/agents/render_queues.py --check    exits 1 when an active AI has fewer than 3 open tasks (the owner's rule: always work queued)

Owner 2026-10-08: "Share workload with Grok. When it completes a task give it another. There should always be something for all other agents
to work on." Claude updates queues.json at every intake (moves finished tasks out, adds new ones) and re-renders.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, "docs", "agents", "queues.json")
STATE = {"now": "NOW", "next": "NEXT", "later": "LATER", "always": "ALWAYS", "done": "DONE"}
MIN_OPEN = 3


def page(a, updated):
    L = [f"<!-- doc-status: current; normative: yes (for {a['name']}) -->",
         f"# WORK QUEUE for {a['name']} (updated {updated})", "",
         f"From Claude (integrator), on Joseph's instruction: there is always work queued for you. Work top to bottom. When a task is done, "
         f"mark it DONE with the date (in your Drive queue doc, or say so in chat) and start the next one straight away; do not wait to be asked.",
         "", f"**Status:** {a['status']}. {a['strength']}", f"**How you get this:** {a['reach']}", "",
         "Rules that always apply: data only as change files (AI_START_HERE.md, collection/templates/INSTRUCTIONS.md); an exact source on every "
         "fact; provenance on every line; never open Drive `_locked (answer keys: Claude only)`.", ""]
    for t in a["tasks"]:
        L += [f"## {t['n']}. {t['title']}  [{STATE.get(t['state'], t['state'].upper())}]  (fix list {t['fix']})", "", t["what"], "", f"**Done when:** {t['done_when']}", ""]
    return "\n".join(L).rstrip() + "\n"


def main(argv):
    q = json.load(open(SRC, encoding="utf-8"))
    bad = []
    for a in q["agents"]:
        open_n = sum(1 for t in a["tasks"] if t["state"] in ("now", "next", "later", "always"))
        if a["status"] == "active" and open_n < MIN_OPEN: bad.append(f"{a['name']}: only {open_n} open tasks (keep {MIN_OPEN}+)")
    if "--check" in argv:
        print("\n".join(bad) or "every active AI has work queued"); return 1 if bad else 0
    out = os.path.join(ROOT, "docs", "agents")
    ov = ["<!-- doc-status: current; normative: yes -->", f"# The other AIs: standing work queues (updated {q['updated']})", "", q["about"], ""]
    for a in q["agents"]:
        with open(os.path.join(out, f"QUEUE_{a['id']}.md"), "w", encoding="utf-8", newline="\n") as fh: fh.write(page(a, q["updated"]))
        now = next((t for t in a["tasks"] if t["state"] == "now"), None)
        ov += [f"## {a['name']} ({a['status']})", f"Now: {now['title'] if now else '(nothing now)'}. Queued: " +
               "; ".join(t["title"] for t in a["tasks"] if t["state"] in ("next", "later", "always")) + f". Page: `docs/agents/QUEUE_{a['id']}.md`.", ""]
    with open(os.path.join(out, "QUEUES.md"), "w", encoding="utf-8", newline="\n") as fh: fh.write("\n".join(ov).rstrip() + "\n")
    print(f"rendered {len(q['agents'])} queues" + ("; WARNING " + "; ".join(bad) if bad else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
