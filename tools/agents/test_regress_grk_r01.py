#!/usr/bin/env python3
"""Regression test for Grok review GRK-R-01 (python3 tools/agents/test_regress_grk_r01.py).

settle() closed a disagreement on ANY later sourced event by a third contributor on the field or a parent of it, and took the winner from
the current record. A write to issues.2 made only to fix mint_text (the mintage left as it was) therefore "confirmed" the record's mintage
and booked the challenger as wrong (error_by), which feeds demotion.
"""
import copy, os, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import homework as H                    # noqa: E402

URL = "https://en.numista.com/catalogue/pieces185.html"
D = {"id": "D0999", "status": "open", "entity": "type", "rid": "CH.KM.21.1", "field": "issues.2.mintage", "opened": "2026-10-10T00:00:00Z",
     "record": {"by": "model:muse", "value": 1000}, "claim": {"by": "model:grok-bot", "value": 2000}}


def ctx(events, mintage):
    issue = {"year": 1990, "mint_text": "B", "mintage": mintage}
    return {"col": {"events": events, "types": {"CH.KM.21.1": {"issues": [{}, {}, issue]}}, "specs": {}}, "disagreements": [copy.deepcopy(D)]}


def ev(by, field, new, src=URL):
    return {"ts": "2026-10-11T08:00:00Z", "by": by, "entity": "type", "id": "CH.KM.21.1", "field": field, "new": new, "source": src}


class Settle(unittest.TestCase):
    def test_parent_write_by_third_ai_does_not_settle(self):
        c = ctx([ev("model:gemini", "issues.2", {"year": 1990, "mint_text": "B (fixed)", "mintage": 1000}, URL + " mint row")], 1000)
        self.assertEqual(H.settle(c, "2026-10-11T09:00:00Z"), [])
        self.assertEqual(c["disagreements"][0]["status"], "open")

    def test_exact_field_write_settles_on_its_own_value(self):
        c = ctx([ev("model:gemini", "issues.2.mintage", 2000)], 2000)
        self.assertEqual(H.settle(c, "2026-10-11T09:00:00Z"), ["D0999"])
        r = c["disagreements"][0]["resolution"]
        self.assertEqual((r["winner"], r["error_by"]), ("claim", "model:muse"))

    def test_winner_is_the_event_value_not_the_record(self):
        # the record moved on after the settling event (a later edit): the settling event still decides
        c = ctx([ev("model:gemini", "issues.2.mintage", 2000)], 1000)
        H.settle(c, "2026-10-11T09:00:00Z")
        self.assertEqual(c["disagreements"][0]["resolution"]["winner"], "claim")

    def test_owner_parent_write_settles(self):
        c = ctx([ev("owner", "issues.2", {"year": 1990, "mint_text": "B", "mintage": 1000}, "owner")], 1000)
        self.assertEqual(H.settle(c, "2026-10-11T09:00:00Z"), ["D0999"])
        self.assertEqual(c["disagreements"][0]["resolution"]["winner"], "record")


if __name__ == "__main__":
    unittest.main(verbosity=2)
