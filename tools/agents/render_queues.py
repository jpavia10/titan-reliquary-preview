#!/usr/bin/env python3
"""Kept for the old command (CLAUDE.md rule 10). The standing queues are now the research loop: tools/agents/homework.py renders
docs/agents/QUEUE_{ai}.md from the generated homework (docs/agents/roles.json) plus the hand-written projects (docs/agents/queues.json).

    python3 tools/agents/render_queues.py            = python3 tools/agents/homework.py           (refresh + write every page)
    python3 tools/agents/render_queues.py --check    = python3 tools/agents/homework.py --check   (exit 1 when an active AI has < 3 open tasks)
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import homework  # noqa: E402

if __name__ == "__main__":
    sys.exit(homework.main(sys.argv[1:]))
