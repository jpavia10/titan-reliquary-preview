#!/usr/bin/env python3
"""Tests for compact answer sheets (python3 tools/agents/test_compact_sheet.py). Temp copies only.

  - every line of every sheet in a pack gets one code, parts stay under the byte limit, each part carries the rules
  - a FILL hint keeps its whole example, brackets and all
  - BLIND lines show no value (nor a type id that names it); EMPTY lines say so; a planted value is shown like any other
  - answers: agree copies the shown value, differ takes the AI's own (typed like the old one), cannot is left out;
    no exact page, the sheet's example page, no quote, an agree on a BLIND/EMPTY line, a differ that repeats the shown value,
    a code not on the sheet and a second answer to one code are all left out and listed
  - converted lines carry the sheet line's assignment and provenance, so apply_changes merges them like a full sheet
"""
import atexit, json, os, shutil, sys, tempfile, unittest, warnings
warnings.simplefilter("ignore")
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import compact_sheet as CS  # noqa: E402
import test_homework as T  # noqa: E402
import apply_changes as A  # noqa: E402

PROV = {"model": "gemini", "prompt_version": "HOMEWORK@2026-11-05", "workflow": "homework-verify", "assignment": "HW-gemini-verify-20261105-9",
        "run_id": "HW-gemini-verify-20261105-9", "inputs": []}


def line(**kw):
    x = {"ts": "2026-11-05T03:17:36Z", "by": "model:gemini", "entity": "type", "id": "MX.KM.443", "op": "set", "field": "period",
         "old": "Mexican Republic", "new": "Mexican Republic", "source": "FILL (period of C263 · Mexico · 1950 · 25 centavos · MXP): YOUR own exact source",
         "verified": False, "phase": 2, "confidence": "high", "provenance": json.loads(json.dumps(PROV))}
    x.update(kw); return x


class Compact(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix="cs-test-"); atexit.register(shutil.rmtree, self.d, True)
        self.sheets = os.path.join(self.d, "sheets"); os.makedirs(self.sheets)
        lines = [line(),
                 line(entity="specimen", id="C263", field="issue.mint_marks", old=["Mo"], new=None,
                      source="FILL (mint of C263 · Mexico · 1950 · 25 centavos · MXP): the photo file you read it from",
                      provenance=dict(PROV, inputs=[{"file": "C263_rev.webp"}])),
                 line(field="nominal.weight_g", old=None, new=None),
                 line(field="issues.0.mintage", old=77144000, new=77144000)]
        lines += [line(field="design.text", old="x" * 300, new="x" * 300) for _ in range(60)]
        with open(os.path.join(self.sheets, "HW-gemini-verify-20261105-9.jsonl"), "w", encoding="utf-8") as fh:
            fh.write("".join(json.dumps(x) + "\n" for x in lines))
        self.idx = CS.sheet_index_for(CS.numbered(["HW-gemini-verify-20261105-9"], self.sheets))

    def test_make_numbers_every_line_and_keeps_parts_small(self):
        out = os.path.join(self.d, "out")
        parts = CS.make(["HW-gemini-verify-20261105-9"], out, max_bytes=12000, sheets=self.sheets)
        self.assertGreater(len(parts), 1)
        text = ""
        for n, _, _ in parts:
            with open(os.path.join(out, n), encoding="utf-8") as fh: text += fh.read()
        self.assertTrue(all(size <= 12000 for _, size, _ in parts))
        self.assertEqual(sum(n for _, _, n in parts), 64)
        for k in range(1, 65): self.assertIn(f"\nV{k} | ", text)
        self.assertEqual(text.count("RULES (a row"), len(parts), "every part carries the rules")
        v2 = next(t for t in text.splitlines() if t.startswith("V2 | "))
        self.assertIn("BLIND", v2); self.assertNotIn("Mo", v2.split("|", 3)[3])
        self.assertIn("EMPTY", next(t for t in text.splitlines() if t.startswith("V3 | ")))

    def test_blind_line_on_a_type_hides_the_type_id(self):
        ln = line(entity="type", id="GB.X.20-pence", field="denomination.value", old=20, new=None,
                  source="FILL (denomination of C316 · United Kingdom · 2014): the photo file you read it from",
                  provenance=dict(PROV, inputs=[{"file": "C316_obv.webp"}]))
        t = CS.row_text("V1", ln, "verify")
        self.assertIn("BLIND", t); self.assertNotIn("20-pence", t); self.assertNotIn("GB.X", t)

    def test_fill_hint_keeps_brackets_inside_the_example(self):
        ln = line(field="design.designers", old=None, new=None,
                  source='FILL (C341 · DD · 1968): the exact entry URL (`new` = a list with each side in brackets, e.g. ["Arnold Machin (obverse)", '
                         '"Stuart Devlin (reverse)"]; leave FILL when the entry does not say)')
        self.assertIn('"Stuart Devlin (reverse)"]', CS.hint(ln))
        ln = line(field="legal_tender.text", old=None, new=None,
                  source="FILL (C341): the exact entry URL (`new` = a few words, e.g. demonetized 2002 (euro); leave FILL when the entry does not say)")
        self.assertTrue(CS.hint(ln).endswith("demonetized 2002 (euro)"), CS.hint(ln))

    def test_answers_keep_only_what_is_shown_on_a_real_page(self):
        url = "https://en.numista.com/catalogue/pieces972.html"
        rows = [{"line": "V1", "verdict": "agree", "url": url, "quote": "Period: United Mexican States"},
                {"line": "v3", "verdict": "differ", "new": "6.5", "url": url, "quote": "Weight 6.5 g"},
                {"line": "V2", "verdict": "differ", "new": "Mo", "url": "C263_rev.webp", "quote": "Mo above the date"},
                {"line": "V4", "verdict": "cannot", "url": "", "quote": "no mintage table"},
                {"line": "V5", "verdict": "agree", "url": "https://en.numista.com/", "quote": "front page only"},
                {"line": "V6", "verdict": "agree", "url": "https://en.numista.com/catalogue/piecesNNNN.html", "quote": "the sheet's example page"},
                {"line": "V7", "verdict": "agree", "url": url, "quote": ""},
                {"line": "V8", "verdict": "differ", "new": "x" * 300, "url": url, "quote": "repeats the shown text"},
                {"line": "V99", "verdict": "agree", "url": url, "quote": "not on the sheet"},
                {"line": "V1", "verdict": "differ", "new": "y", "url": url, "quote": "second answer"},
                {"line": "V9", "verdict": "maybe", "url": url, "quote": "not a verdict"}]
        out, left = CS.convert(rows, self.idx, "2026-11-06T10:00:00Z")
        kept = {(x["field"]): x for x in out["gemini"]}
        self.assertEqual(sorted(kept), ["issue.mint_marks", "nominal.weight_g", "period"])
        self.assertEqual(kept["period"]["new"], "Mexican Republic", "agree keeps the shown value")
        self.assertEqual(kept["nominal.weight_g"]["new"], "6.5", "old was null: the value stays as sent")
        self.assertEqual(kept["issue.mint_marks"]["new"], ["Mo"], "typed like the old value (a list)")
        self.assertIn(url, kept["period"]["source"]); self.assertIn("Period: United Mexican States", kept["period"]["source"])
        self.assertEqual(kept["period"]["provenance"]["assignment"], "HW-gemini-verify-20261105-9")
        self.assertEqual(kept["period"]["provenance"]["inputs"][0], {"file": url})
        why = dict(left)
        for c in ("V4", "V5", "V6", "V7", "V8", "V99", "V9"): self.assertIn(c, why, c)
        self.assertIn("twice", " ".join(w for c, w in left if c == "V1"))

    def test_converted_lines_merge_through_the_pipeline(self):
        tmp = T.sandbox(); r = T.run_refresh(tmp, T.NOW)
        a = next(x for x in r["state"]["assignments"] if x["status"] == "open" and x["kind"] == "verify"
                 and any(not CS.blind(ln) and ln.get("new") not in (None, "", []) for ln in CS.load_sheet(x["id"], os.path.join(tmp, "docs", "agents", "homework", "sheets"))))
        sheets = os.path.join(tmp, "docs", "agents", "homework", "sheets")
        idx = CS.sheet_index_for(CS.numbered([a["id"]], sheets))
        code, (sid, ln) = next((c, v) for c, v in idx.items() if not CS.blind(v[1]) and v[1].get("new") not in (None, "", []))
        out, left = CS.convert([{"line": code, "verdict": "agree", "url": "https://www.ngccoin.com/price-guide/world/mexico-25-centavos-km-443-1950-1953-cuid-1063436-duid-1196512",
                                 "quote": "the Features table row for this coin"}], idx, T.LATER)
        agent = next(iter(out))
        status, log, events = T.apply(tmp, out[agent], name=f"changes_{agent}_20261009-1200.jsonl")
        self.assertEqual(status, "applied", "\n".join(log))
        self.assertTrue(events, "\n".join(log))


if __name__ == "__main__":
    unittest.main(verbosity=1)
