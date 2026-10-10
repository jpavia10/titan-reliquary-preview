#!/usr/bin/env python3
"""End-to-end test of the intake bridge (python3 tools/bridge/test_intake.py). Works on a sandbox copy of the repo (no art/ or audio/).

One listing, as the Drive bridge would send it, with every kind of file the drop folder sees:
  a Gemini homework answer (merges; the assignment closes), a Muse file with an owner line (held), a file named for Claude (held),
  a Muse file apply_changes rejects, owner answers (held), a note (listed only), an already-merged file (duplicate), a Grok file
  carrying a Muse line (rejected), one of our own .REJECTED.txt notes (ignored).
Then: the same listing again changes nothing; `hold` after a failed check; `reviewed` clears the score list.
"""
import atexit, json, os, shutil, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
NOW = "2026-10-10T09:00:00Z"
SKIP = {"art", "audio", ".git", "node_modules", "prototypes", "motion-lab"}


def sandbox():
    tmp = tempfile.mkdtemp(prefix="bridge-test-"); atexit.register(shutil.rmtree, tmp, True)
    for n in os.listdir(ROOT):
        if n in SKIP: continue
        s = os.path.join(ROOT, n)
        (shutil.copytree if os.path.isdir(s) else shutil.copy2)(s, os.path.join(tmp, n))
    shutil.rmtree(os.path.join(tmp, "docs", "agents", "bridge"), ignore_errors=True)
    return tmp


def line(**kw):
    e = {"ts": "2026-10-10T08:30:00Z", "op": "set", "verified": False, "phase": 2, "confidence": "high"}
    e.update(kw); return json.dumps(e, ensure_ascii=False)


def drop(i, name, text=None, size=None):
    f = {"id": f"drive-{i}", "name": name, "updated": "2026-10-10T08:40:00.000Z", "size": size if size is not None else len((text or "").encode())}
    if text is not None: f["text"] = text
    return f


def listing(tmp):
    sheet = os.path.join(tmp, "docs", "agents", "homework", "sheets", "HW-gemini-verify-20261009-1.jsonl")
    first = json.loads(open(sheet, encoding="utf-8").readline())
    first.update(ts="2026-10-10T08:30:00Z", source="https://en.numista.com/catalogue/pieces112.html: mintage table row '2003 A' = 20 475 000")
    dup_name = "changes_grok_20261001-1821.jsonl"
    dup_text = open(os.path.join(tmp, "collection", "_incoming", "applied", dup_name), encoding="utf-8").read()
    prov = {"model": "muse", "prompt_version": "test", "workflow": "test", "inputs": []}
    return {"kind": "titan-bridge/1", "made": "2026-10-10T08:59:00Z", "tick": {"at": "2026-10-10T08:15:00Z", "errors": []},
            "drop": [
                drop(1, "changes_gemini_20261010-0830.jsonl", json.dumps(first, ensure_ascii=False) + "\n"),
                drop(2, "changes_muse_20261010-0831.jsonl", line(by="owner", entity="specimen", id="C001", field="story", new="x", source="owner said so") + "\n"),
                drop(3, "changes_claude_20261010-0832.jsonl", line(by="model:claude", entity="specimen", id="C001", field="story", new="x", source="https://en.numista.com/catalogue/pieces185.html") + "\n"),
                drop(4, "changes_muse_20261010-0833.jsonl", line(by="model:muse", entity="specimen", id="C001", field="no_such_field", new=1,
                                                                source="https://en.numista.com/catalogue/pieces185.html", provenance=prov) + "\n"),
                drop(5, "answers_owner_20261010-0834.json", json.dumps({"kind": "owner-answers", "answers": []})),
                drop(6, "access_gemini_20261010-0835.txt"),
                drop(7, dup_name, dup_text),
                drop(8, "changes_grok_20261010-0836.jsonl", line(by="model:muse", entity="specimen", id="C001", field="story", new="x", source="https://en.numista.com/catalogue/pieces185.html") + "\n"),
                drop(9, "changes_muse_20261008-2302.jsonl.REJECTED.txt"),
            ],
            "staging": {"count": 2, "newest": [{"name": "NOID_Peru_1990_sol_obv.jpg", "updated": "2026-10-10T07:00:00Z"}]},
            "bakeoff": {"count": 0, "newest": []}}


def run(tmp, *args):
    r = subprocess.run([sys.executable, os.path.join(tmp, "tools", "bridge", "intake.py"), *args], capture_output=True, text=True, cwd=tmp)
    return r.returncode, r.stdout + r.stderr


class Bridge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = sandbox()
        cls.L = os.path.join(cls.tmp, "listing.json")
        with open(cls.L, "w", encoding="utf-8") as fh: json.dump(listing(cls.tmp), fh)
        cls.rc, cls.out = run(cls.tmp, "run", "--listing", cls.L, "--now", NOW)
        cls.br = os.path.join(cls.tmp, "docs", "agents", "bridge")
        cls.state = json.load(open(os.path.join(cls.br, "processed.json"), encoding="utf-8"))

    def outcome(self, name):
        return next(e["outcome"] for e in self.state["files"].values() if e["name"] == name)

    def test_1_outcomes(self):
        self.assertEqual(self.rc, 0, self.out[-3000:])
        exp = {"changes_gemini_20261010-0830.jsonl": "merged", "changes_muse_20261010-0831.jsonl": "held", "changes_claude_20261010-0832.jsonl": "held",
               "changes_muse_20261010-0833.jsonl": "rejected", "answers_owner_20261010-0834.json": "held", "changes_grok_20261001-1821.jsonl": "duplicate",
               "changes_grok_20261010-0836.jsonl": "rejected"}
        for n, o in exp.items(): self.assertEqual(self.outcome(n), o, n)
        names = {e["name"] for e in self.state["files"].values()}
        self.assertNotIn("access_gemini_20261010-0835.txt", names, "a note is only listed")
        self.assertNotIn("changes_muse_20261008-2302.jsonl.REJECTED.txt", names, "our own notes are ignored")
        inc = os.path.join(self.tmp, "collection", "_incoming")
        self.assertTrue(os.path.exists(os.path.join(inc, "applied", "changes_gemini_20261010-0830.jsonl")))
        self.assertTrue(os.path.exists(os.path.join(inc, "rejected", "changes_muse_20261010-0833.jsonl.report.txt")))
        for n in ("changes_muse_20261010-0831.jsonl", "changes_claude_20261010-0832.jsonl", "changes_grok_20261010-0836.jsonl"):
            self.assertFalse(os.path.exists(os.path.join(inc, n)) or os.path.exists(os.path.join(inc, "applied", n)), f"{n} must not be merged")
        rej = next(e for e in self.state["files"].values() if e["name"] == "changes_grok_20261010-0836.jsonl")
        self.assertIn("may only carry grok's own lines", rej["report"][0])

    def test_2_the_loop_turned(self):
        asg = json.load(open(os.path.join(self.tmp, "docs", "agents", "homework", "assignments.json"), encoding="utf-8"))
        a = next(x for x in asg["assignments"] if x["id"] == "HW-gemini-verify-20261009-1")
        self.assertEqual(a["status"], "done", "an answered assignment closes")
        page = open(os.path.join(self.tmp, "docs", "agents", "QUEUE_gemini.md"), encoding="utf-8").read()
        self.assertIn("changes_gemini_20261010-0830.jsonl", page, "the AI's page shows what happened to its file")

    def test_3_inbox_and_log(self):
        ib = open(os.path.join(self.br, "INBOX.md"), encoding="utf-8").read()
        self.assertIn("## Score these (rule 2): 1", ib)
        self.assertIn("## Held for Claude (left in the drop folder): 3", ib)
        self.assertIn("access_gemini_20261010-0835.txt", ib)
        self.assertIn("NOID_Peru_1990_sol_obv.jpg", ib)
        runs = [json.loads(l) for l in open(os.path.join(self.br, "runs.jsonl"), encoding="utf-8")]
        self.assertEqual(len(runs), 1); self.assertEqual(runs[0]["publish"], "ok")
        self.assertEqual(runs[0]["merged"], ["changes_gemini_20261010-0830.jsonl"])
        msg = open(os.path.join(self.br, ".commit_message"), encoding="utf-8").read()
        self.assertTrue(msg.startswith("intake: merged 1 file(s) from Gemini"), msg)
        self.assertNotIn("text", json.dumps(self.state["last_listing"]), "the stored listing never keeps file contents")

    def test_4_same_listing_again_is_a_no_op(self):
        rc, out = run(self.tmp, "run", "--listing", self.L, "--now", "2026-10-10T10:00:00Z")
        self.assertEqual(rc, 3, out[-1500:])

    def test_5_hold_and_reviewed(self):
        L = json.load(open(self.L, encoding="utf-8"))
        sheet = os.path.join(self.tmp, "docs", "agents", "homework", "sheets")
        new = drop(20, "changes_muse_20261010-1100.jsonl", line(by="model:muse", entity="specimen", id="C001", field="story", new=None, source="FILL: nothing") + "\n")
        L["drop"].append(new)
        p = os.path.join(self.tmp, "listing2.json"); json.dump(L, open(p, "w", encoding="utf-8"))
        o = os.path.join(self.tmp, "outcomes.json")
        rc, out = run(self.tmp, "run", "--listing", p, "--now", "2026-10-10T11:00:00Z", "--outcomes", o)
        self.assertIn(rc, (0,), out[-1500:])
        rc, out = run(self.tmp, "hold", "--outcomes", o, "--reason", "test_pipeline failed", "--now", "2026-10-10T11:05:00Z")
        self.assertEqual(rc, 0, out)
        st = json.load(open(os.path.join(self.br, "processed.json"), encoding="utf-8"))
        self.assertEqual(st["files"]["drive-20"]["outcome"], "held")
        self.assertIn("test_pipeline failed", st["files"]["drive-20"]["summary"])
        rc, out = run(self.tmp, "reviewed", "changes_gemini_20261010-0830.jsonl")
        self.assertEqual(rc, 0, out)
        ib = open(os.path.join(self.br, "INBOX.md"), encoding="utf-8").read()
        self.assertIn("## Score these (rule 2): 0", ib)
        rc, out = run(self.tmp, "resolve", "changes_claude_20261010-0832.jsonl", "--rejected", "Claude's own files are never dropped in Drive")
        self.assertEqual(rc, 0, out)
        st = json.load(open(os.path.join(self.br, "processed.json"), encoding="utf-8"))
        self.assertEqual(st["files"]["drive-3"]["outcome"], "rejected")
        rc, out = run(self.tmp, "resolve", "changes_muse_20261010-1100.jsonl", "--retry")
        st = json.load(open(os.path.join(self.br, "processed.json"), encoding="utf-8"))
        self.assertNotIn("drive-20", st["files"], "--retry forgets the record so the next run looks again")


if __name__ == "__main__":
    unittest.main(verbosity=1, warnings="ignore")
