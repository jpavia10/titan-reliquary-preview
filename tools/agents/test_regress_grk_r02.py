#!/usr/bin/env python3
"""Regression test for Grok review GRK-R-02 (python3 tools/agents/test_regress_grk_r02.py).

An assignment was answered (and its leftover items booked as "tried" by the assignee) by ANY line naming its id in
provenance.assignment, whoever wrote it; apply_changes likewise gave any author the assignment treatment (divert, stale-not-rejected).
Only the assignee's own lines may answer its assignment.
"""
import json, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path[:0] = [HERE, os.path.join(ROOT, "tools", "pipeline")]
import homework as H                    # noqa: E402
import apply_changes as A               # noqa: E402

AID = "HW-grok-verify-20261011-1"
ASG = {"id": AID, "agent": "grok", "kind": "verify", "status": "open", "items": [{"entity": "specimen", "id": "C001", "field": "story"}]}


def ev(by, **kw):
    e = {"ts": "2026-10-11T08:30:00Z", "op": "set", "verified": False, "phase": 2, "confidence": "high", "by": by,
         "entity": "specimen", "id": "C001", "field": "story", "new": "x", "source": "https://en.numista.com/catalogue/pieces185.html",
         "provenance": {"model": by.split(":")[-1], "prompt_version": "t", "workflow": "t", "inputs": [], "assignment": AID}}
    e.update(kw); return e


class AssigneeOnly(unittest.TestCase):
    def test_answered_ignores_other_authors(self):
        ctx = {"col": {"events": [ev("model:muse")]}, "disagreements": [
            {"entity": "specimen", "rid": "C002", "claim": {"by": "model:gemini", "assignment": AID}}]}
        self.assertEqual(H.answered(ctx, {AID: "grok"}), {})
        ctx["col"]["events"].append(ev("model:grok-bot"))
        self.assertEqual(H.answered(ctx, {AID: "grok"}), {AID: {("specimen", "C001")}})

    def test_apply_gives_no_assignment_treatment_to_others(self):
        # a stale line answering an assignment is skipped as "stale, not counted"; from anyone else it is an ordinary stale edit (rejected)
        p = os.path.join(tempfile.mkdtemp(), "changes_muse_20261011-1950.jsonl")
        with open(p, "w", encoding="utf-8") as fh: fh.write(json.dumps(ev("model:muse", old="not the current story")) + "\n")
        st, rep, _ = A.apply_file(p, os.path.join(ROOT, "collection"), dry_run=True, assignments={AID: ASG})
        self.assertEqual(st, "rejected", rep)
        self.assertTrue(any("belongs to grok" in r for r in rep), rep)

    def test_assignee_still_gets_it(self):
        p = os.path.join(tempfile.mkdtemp(), "changes_grok_20261011-1950.jsonl")
        with open(p, "w", encoding="utf-8") as fh: fh.write(json.dumps(ev("model:grok-bot", old="not the current story")) + "\n")
        st, rep, _ = A.apply_file(p, os.path.join(ROOT, "collection"), dry_run=True, assignments={AID: ASG})
        self.assertEqual(st, "already-applied", rep)      # "nothing to merge: 1 stale"


if __name__ == "__main__":
    unittest.main(verbosity=2)
