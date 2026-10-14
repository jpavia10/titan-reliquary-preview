#!/usr/bin/env python3
"""Regression test for Grok review GRK-B-02 (python3 tools/pipeline/test_regress_grk_b02.py).

re.match(r"^(owner|...)$", by) accepted by = "owner\\n" (Python's `$` also matches just before a final newline). The bridge compares
by == "owner" exactly, so the line was neither held nor rejected, and it merged with the owner's rank and without the model source rules.
"""
import json, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import apply_changes as A               # noqa: E402


def dry(*events):
    p = os.path.join(tempfile.mkdtemp(), "changes_grok_20261011-1950.jsonl")
    with open(p, "w", encoding="utf-8") as fh:
        for e in events: fh.write(json.dumps(e, ensure_ascii=False) + "\n")
    return A.apply_file(p, os.path.join(ROOT, "collection"), dry_run=True, assignments={})


def ev(**kw):
    e = {"ts": "2026-10-11T08:30:00Z", "op": "set", "verified": False, "phase": 2, "confidence": "high",
         "entity": "specimen", "id": "C001", "field": "story", "new": "Regression probe story.", "source": "probe"}
    e.update(kw); return e


class ByFullMatch(unittest.TestCase):
    def test_trailing_newline_owner_rejected(self):
        st, rep, _ = dry(ev(by="owner\n"))
        self.assertEqual(st, "rejected", rep)
        self.assertTrue(any("must be owner, model:<id>" in r for r in rep), rep)

    def test_trailing_newline_model_rejected(self):
        st, rep, _ = dry(ev(by="model:grok-bot\n", source="https://en.numista.com/catalogue/pieces185.html"))
        self.assertEqual(st, "rejected", rep)

    def test_plain_owner_still_applies(self):
        st, rep, _ = dry(ev(by="owner"))
        self.assertEqual(st, "applied", rep)


if __name__ == "__main__":
    unittest.main(verbosity=2)
