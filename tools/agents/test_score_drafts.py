#!/usr/bin/env python3
"""Tests for the score drafts (fix list #91; python3 tools/agents/test_score_drafts.py). A small made-up root, never the real collection:

  - the scorecard's file names are read in every form it uses (a/-b/-c lists, a..b ranges, a bare '-YYYYMMDD-HHMM', '-HHMM' with the row's date)
  - a file named in the scorecard, or older than the AI's last scored file, gets no draft
  - a homework file: complete counts the sheet over the AI's other files too, a line off the sheet costs the tier point, a disagreement that
    went against it and a missed canary cost accuracy, an agreeing check and a caught canary count as held
  - a re-filed file is accepted 0, a rejected file is bounced unscored with its first reason, nothing cross-checked shows "?"
"""
import atexit, json, os, shutil, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score_drafts as SD  # noqa: E402

SCORES = """# Contributor scorecard

## Muse (on probation)

| # | Date | Submission | Score | Notes |
|---|---|---|---|---|
| 1 | 2026-10-03 | `changes_muse_20261003-2208/-2215/-2232.jsonl` | **7 / 10** | x |
| 2 | 2026-10-17 | `changes_muse_20261017-0435..0505` | **7 / 10** | x |

## Grok (not on probation)

| # | Date | Submission | Score | Notes |
|---|---|---|---|---|
| 1 | 2026-10-15 | `changes_grok-bot_20261015-2244..2246.jsonl` + `-20261019-2316.jsonl` | **9 / 10** | x |

## Gemini

| # | Date | Submission | Score | Notes |
|---|---|---|---|---|
| 1 | 2026-10-12 | four files sent as `-verify50` (renamed by Claude to `-1626/-1633`) | **7 / 10** | x |
"""

V = "HW-muse-verify-20261020-1"


def line(ts, rid, field, new, aid=V, by="model:muse-spark", src="Numista N#1 row 1990"):
    return {"ts": ts, "by": by, "entity": "specimen", "id": rid, "op": "set", "field": field, "new": new, "source": src, "verified": False, "phase": 2,
            "provenance": {"model": "muse-spark", "prompt_version": "HOMEWORK@2026-10-20", "workflow": "homework-verify", "run_id": aid, "assignment": aid, "inputs": []}}


def write(root, rel, text):
    p = os.path.join(root, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh: fh.write(text)


def jl(rows): return "".join(json.dumps(r) + "\n" for r in rows)


class Drafts(unittest.TestCase):
    def setUp(self):
        self.root = r = tempfile.mkdtemp(prefix="drafts-test-"); atexit.register(shutil.rmtree, r, True)
        write(r, "collaborators/CONTRIBUTOR_SCORES.md", SCORES)
        write(r, "docs/agents/roles.json", json.dumps({"agents": {"grok": {}, "muse": {}, "gemini": {}, "chatgpt": {}}}))
        items = [{"item": f"verify:specimen:C00{i}:issue.year", "entity": "specimen", "id": f"C00{i}", "field": "issue.year"} for i in range(1, 5)]
        write(r, "docs/agents/homework/assignments.json", json.dumps({"assignments": [{"id": V, "agent": "muse", "kind": "verify", "items": items}]}))
        a = [line("2026-10-20T10:00:00Z", "C001", "issue.year", 1990), line("2026-10-20T10:00:01Z", "C002", "issue.year", 1991),
             line("2026-10-20T10:00:02Z", "C009", "notes", "off the sheet")]
        b = [line("2026-10-20T11:00:00Z", "C003", "issue.year", 1993), line("2026-10-20T11:00:01Z", "C004", "issue.year", None, src="FILL: your source")]
        write(r, "collection/_incoming/applied/changes_muse_20261020-1000.jsonl", jl(a))
        write(r, "collection/_incoming/applied/changes_muse_20261020-1100.jsonl", jl(b))
        log = [dict(a[0], old=1990), dict(a[2], old=None), dict(b[0], old=1993)]          # C001 agreed with the record; C002 went to a disagreement
        write(r, "collection/changes.jsonl", jl(log))
        dis = {"id": "D0001", "entity": "specimen", "rid": "C002", "field": "issue.year", "status": "resolved",
               "claim": {"by": a[1]["by"], "ts": a[1]["ts"], "value": 1991}, "record": {"by": None, "ts": None, "value": 1981},
               "resolution": {"winner": "record", "error_by": "model:muse-spark", "source": "third reader: the photo reads 1981"}}
        write(r, "collection/disagreements.jsonl", jl([dis]))
        write(r, "docs/agents/homework/canaries.jsonl", jl([{"ts": b[0]["ts"], "assignment": V, "agent": "muse", "item": "verify:specimen:C003:issue.year", "outcome": "caught"}]))
        # older than Muse's last scored file: no draft, even though the scorecard never names it
        write(r, "collection/_incoming/applied/changes_muse_20261010-0900.jsonl", jl([line("2026-10-10T09:00:00Z", "C001", "notes", "x")]))
        # Grok: one named in the scorecard by a bare '-20261019-2316', one re-filed, one rejected
        write(r, "collection/_incoming/applied/changes_grok-bot_20261019-2316.jsonl", jl([line("2026-10-19T23:16:00Z", "C001", "notes", "x", by="model:grok-bot")]))
        g = line("2026-10-20T12:00:00Z", "C005", "notes", "kept as re-filed", aid="none", by="model:grok-bot")
        write(r, "collection/_incoming/applied/changes_claude_20261020-1300.jsonl", jl([g]))
        write(r, "collection/_incoming/applied/changes_claude_20261020-1300.REFILED-NOTE.txt", "changes_claude_20261020-1300.jsonl = Grok's changes_grok-bot_20261020-1200.jsonl, ts fixed.\n")
        write(r, "collection/_incoming/rejected/changes_grok-bot_20261020-1400.jsonl", jl([g]))
        write(r, "collection/_incoming/rejected/changes_grok-bot_20261020-1400.jsonl.report.txt", "REJECTED changes_grok-bot_20261020-1400.jsonl: 1 problem(s)\n  line 1: model events need a provenance\n")

    def test_scorecard_names_in_every_form(self):
        s = SD.scored(SCORES)
        for st in ("20261003-2208", "20261003-2215", "20261003-2232", "20261017-0435", "20261017-0440", "20261017-0505"): self.assertIn(("muse", st), s)
        self.assertNotIn(("muse", "20261017-0460"), s)
        for st in ("20261015-2244", "20261015-2245", "20261015-2246", "20261019-2316"): self.assertIn(("grok", st), s)
        self.assertIn(("gemini", "20261012-1626"), s); self.assertIn(("gemini", "20261012-1633"), s)

    def test_a_claude_file_in_a_row_is_not_the_ais_and_a_late_file_of_the_day_is_drafted(self):
        """2026-10-24: Muse's rows named changes_claude_20261024-0641/-0643, which hid 21 late Muse files stamped before them."""
        card = SCORES.replace("| 2 | 2026-10-17 |", "| 3 | 2026-10-24 | `changes_muse_20261024-0552.jsonl`, corrected by `changes_claude_20261024-0641/-0643` | **10 / 10** | x |\n| 2 | 2026-10-17 |")
        s = SD.scored(card)
        self.assertIn(("muse", "20261024-0552"), s)
        self.assertNotIn(("muse", "20261024-0641"), s); self.assertNotIn(("muse", "20261024-0643"), s)
        r = tempfile.mkdtemp(prefix="sd_late_"); atexit.register(shutil.rmtree, r, True)
        write(r, "collaborators/CONTRIBUTOR_SCORES.md", card)
        write(r, "docs/agents/roles.json", json.dumps({"agents": {"muse": {}, "grok": {}, "gemini": {}}}))
        line = {"ts": "2026-10-24T05:13:00Z", "by": "model:muse-spark", "entity": "type", "id": "XX.KM.1", "op": "set", "field": "ruler", "new": "A"}
        for n in ("20261024-0513", "20261024-0601", "20261023-0900"): write(r, f"collection/_incoming/applied/changes_muse_{n}.jsonl", jl([line]))
        names = sorted(d["file"] for d in SD.build(r)[0])
        self.assertEqual(names, ["changes_muse_20261024-0513.jsonl", "changes_muse_20261024-0601.jsonl"], "late files of the last scored day are drafted; an older day is not")

    def test_drafts(self):
        drafts, bounced = SD.write(self.root)
        by = {d["file"]: d for d in drafts}
        self.assertEqual(sorted(by), ["changes_grok-bot_20261020-1200.jsonl", "changes_muse_20261020-1000.jsonl", "changes_muse_20261020-1100.jsonl"])
        m = by["changes_muse_20261020-1000.jsonl"]
        self.assertEqual((m["place"], m["accepted"], m["complete"], m["tier"]), (2, 2, 1, 0))       # 3 of 4 items over both files (75 %); C009 off the sheet
        self.assertEqual(m["accurate"], 0)                                                       # 1 held (C001 agreed), 1 wrong (D0001): 50 %
        self.assertTrue(any("D0001 went against it" in n for n in m["notes"]))
        self.assertTrue(any("outside the assignment" in n for n in m["notes"]))
        n = by["changes_muse_20261020-1100.jsonl"]
        self.assertEqual((n["accurate"], n["complete"], n["tier"], n["total"]), (3, 1, 1, 9))   # caught canary + an agreeing answer; the sheet is 75 % answered
        self.assertTrue(any("1 left blank" in x for x in n["notes"]))
        g = by["changes_grok-bot_20261020-1200.jsonl"]
        self.assertEqual(g["accepted"], 0); self.assertIsNone(g["accurate"]); self.assertTrue(g["pending"])
        self.assertEqual([b["file"] for b in bounced], ["changes_grok-bot_20261020-1400.jsonl"])
        self.assertIn("provenance", bounced[0]["why"])
        page = open(os.path.join(self.root, "collaborators", "SCORE_DRAFTS.md"), encoding="utf-8").read()
        self.assertIn("bounced, unscored", page); self.assertIn("+ accuracy ?", page); self.assertIn("## Muse", page)

    def test_a_scored_file_drops_off(self):
        with open(os.path.join(self.root, "collaborators", "CONTRIBUTOR_SCORES.md"), "a", encoding="utf-8") as fh:
            fh.write("\n## Muse (again)\n\n| 3 | 2026-10-20 | `changes_muse_20261020-1000/-1100.jsonl` | **6 / 10** | x |\n")
        drafts, _ = SD.build(self.root)
        self.assertEqual([d["file"] for d in drafts], ["changes_grok-bot_20261020-1200.jsonl"])


if __name__ == "__main__":
    unittest.main(verbosity=1)
