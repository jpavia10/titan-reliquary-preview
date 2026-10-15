#!/usr/bin/env python3
"""Tests for tools/bridge/owner_answers_issue.py (the app's "Send to Claude" GitHub issue -> answers file + receipt)."""
import json, os, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import owner_answers_issue as OI  # noqa: E402

GOOD = {"kind": "owner-answers", "made": "2026-10-15T13:28:11.123Z", "answers": [{"confirm": {"scan": "C073", "fact": "year"}}]}


def body(obj, fence="```json"):
    return "Titan answers from the app. Press Submit.\n\nConfirmed: C073 year\n\n" + fence + "\n" + json.dumps(obj) + "\n```\n"


class IssueAnswers(unittest.TestCase):
    def test_extract_takes_the_block_and_the_title_stamp(self):
        name, data = OI.extract(body(GOOD), "Titan answers 20261015-1328")
        self.assertEqual(name, "answers_owner_20261015-1328.json"); self.assertEqual(data, GOOD)
        name, _ = OI.extract(body(GOOD, "```"), "something else")          # no stamp in the title: from `made`
        self.assertEqual(name, "answers_owner_20261015-1328.json")

    def test_extract_refuses_anything_that_is_not_an_answers_file(self):
        for b, why in (("no block here", "no ```json block"), (body({"kind": "x", "answers": [1]}), "not an owner answers file"),
                       (body({"kind": "owner-answers", "answers": []}), "no answers"), ("```json\n{not json}\n```", "not valid JSON"),
                       (body(dict(GOOD, answers=[{}] * 501)), "more than 500")):
            with self.assertRaises(ValueError) as cm: OI.extract(b, "Titan answers 20261015-1328")
            self.assertIn(why, str(cm.exception))

    def test_receipt_says_what_arrived_and_keeps_the_issue_open_for_follow_ups(self):
        log = "1 change event(s), 1 answer(s) recorded, 0 follow-up(s)\nreceipt: 1 answer(s)"
        b, keep = OI.receipt(log); self.assertIn("**Received.** 1 answer(s) recorded, 1 fact(s) now marked Verified", b["body"]); self.assertFalse(keep)
        b, keep = OI.receipt(log + "\nFOLLOW-UP q-x: do this by hand"); self.assertIn("- q-x: do this by hand", b["body"]); self.assertTrue(keep)
        b, keep = OI.receipt("", "the pipeline tests failed"); self.assertIn("Not merged yet", b["body"]); self.assertIn("the pipeline tests failed", b["body"]); self.assertTrue(keep)


if __name__ == "__main__":
    unittest.main()
