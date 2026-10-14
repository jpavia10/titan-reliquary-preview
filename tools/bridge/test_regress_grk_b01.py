#!/usr/bin/env python3
"""Regression test for Grok review GRK-B-01 (python3 tools/bridge/test_regress_grk_b01.py).

A raw U+2028 / U+2029 / U+0085 inside a JSON string is legal JSON. str.splitlines() breaks the line there, so the bridge's per-line checks
(owner / verified / another AI's lines) saw two unparsable halves and skipped them, while apply_changes.read_events (which splits on newlines
only) read the whole line and merged it. The bridge must see the same lines the merge sees.
"""
import json, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path[:0] = [HERE, os.path.join(ROOT, "tools", "pipeline")]
import intake as I                      # noqa: E402
import apply_changes as A               # noqa: E402


def line(sep, **kw):
    e = {"ts": "2026-10-11T08:30:00Z", "op": "set", "phase": 2, "confidence": "high", "entity": "specimen", "id": "C001", "field": "story",
         "new": "x", "source": "https://en.numista.com/catalogue/pieces185.html", "note": "a" + sep + "b"}
    e.update(kw); return json.dumps(e, ensure_ascii=False)


class LineSeparators(unittest.TestCase):
    def test_owner_line_with_separator_is_held(self):
        for sep in ("\u2028", "\u2029", "\x85"):
            text = line(sep, by="owner", verified=True) + "\n"
            held, rej = I.line_problems(text, "grok")
            self.assertTrue(held, f"owner/verified line with {sep!r} inside a string was not held")
            # and the merge really reads it as one event (why it matters)
            p = os.path.join(tempfile.mkdtemp(), "f.jsonl")
            with open(p, "w", encoding="utf-8", newline="\n") as fh: fh.write(text)
            events, errs = A.read_events(p)
            self.assertEqual((len(events), errs), (1, []))
            self.assertEqual(events[0][1]["by"], "owner")

    def test_other_ai_line_with_separator_is_rejected(self):
        held, rej = I.line_problems(line("\u2028", by="model:muse") + "\n", "grok")
        self.assertTrue(rej, "a model:muse line in a grok file hid behind U+2028")

    def test_classify_does_not_stage(self):
        f = {"id": "drive-x", "name": "changes_grok_20261011-1950.jsonl", "updated": "2026-10-11T08:40:00.000Z",
             "text": line("\u2028", by="owner", verified=True) + "\n"}
        f["size"] = len(f["text"].encode())
        kind, why = I.classify(f, {"files": {}}, {"grok", "muse", "gemini"})
        self.assertEqual(kind, "held", why)

    def test_plain_lines_unchanged(self):
        ok = line("", by="model:grok-bot") + "\r\n" + line("", by="model:grok-bot") + "\n"
        self.assertEqual(I.line_problems(ok, "grok"), ([], []))
        self.assertTrue(I.line_problems(line("", by="owner") + "\r" + line("", by="model:grok-bot"), "grok")[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
