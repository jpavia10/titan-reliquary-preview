#!/usr/bin/env python3
"""End-to-end tests for the research loop (python3 tools/agents/test_homework.py). Needs jsonschema. Works on temp copies only.

  - a refresh issues assignments within each AI's capacity, never hands an AI its own facts, and keeps 3+ open tasks per active AI
  - an AI answering its verify sheet: agreeing lines become 'Checked' (two independent sources), a disagreeing line is filed in
    collection/disagreements.jsonl and NOT applied, a line still saying FILL is left out (no error), a stale line is skipped
  - the answered assignment closes; left-out items go back to the pool, marked as tried by that AI; the disagreement becomes an arbitrate item
  - a third contributor's sourced event settles the disagreement and counts the error against the loser
  - placeholder-only and stale-only files change nothing; refreshes are deterministic
"""
import atexit, copy, json, os, shutil, subprocess, sys, tempfile, unittest, warnings
warnings.simplefilter("ignore")

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import homework as HW  # noqa: E402
import apply_changes as A  # noqa: E402
import provenance as PV  # noqa: E402

NOW = "2026-10-09T09:30:00Z"
LATER = "2026-10-09T12:00:00Z"


def sandbox():
    tmp = tempfile.mkdtemp(prefix="hw-test-"); atexit.register(shutil.rmtree, tmp, True)
    shutil.copytree(os.path.join(ROOT, "collection"), os.path.join(tmp, "collection"), ignore=shutil.ignore_patterns("_incoming"))
    for d in ("docs/agents", "docs/requests", "docs/photos"):
        shutil.copytree(os.path.join(ROOT, d), os.path.join(tmp, d), ignore=shutil.ignore_patterns("homework"))
    return tmp


def run_refresh(tmp, now):
    return HW.run(tmp, now)


def apply(tmp, lines, name="changes_muse_20261009-1200.jsonl"):
    p = os.path.join(tmp, name)
    with open(p, "w", encoding="utf-8") as fh: fh.write("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in lines))
    asg = A.load_assignments(os.path.join(tmp, "docs", "agents", "homework", "assignments.json"))
    return A.apply_file(p, os.path.join(tmp, "collection"), assignments=asg)


class Loop(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = sandbox()
        cls.r1 = run_refresh(cls.tmp, NOW)

    def test_1_issue_rules(self):
        st, roles, pool = self.r1["state"], self.r1["roles"], self.r1["pool"]
        for agent, ag in roles["agents"].items():
            mine = [a for a in st["assignments"] if a["agent"] == agent and a["status"] == "open"]
            self.assertLessEqual(len(mine), ag.get("capacity", 0), agent)
            self.assertEqual(len({a["kind"] for a in mine}), len(mine), f"{agent}: one open assignment per kind")
            for a in mine:
                self.assertIn(a["kind"], ag["kinds"])
                for it in a["items"]:
                    self.assertNotIn(agent, pool[it["item"]]["authors"], f"{agent} got its own fact {it['item']}")
        self.assertEqual(HW.check(roles, self.r1["queues"], st), [])
        busy = [it["item"] for a in st["assignments"] if a["status"] == "open" for it in a["items"]]
        self.assertEqual(len(busy), len(set(busy)), "an item is in two open assignments")

    def test_1b_no_two_assignments_write_one_field(self):
        st, pool = self.r1["state"], self.r1["pool"]
        taken = {}
        for a in st["assignments"]:
            if a["status"] != "open": continue
            for it in a["items"]:
                p = pool.get(it["item"])
                if p is None: continue
                self.assertFalse(HW._clashes(taken, p), f"{a['id']} {it['item']} writes a field another open assignment writes")
                HW._take(taken, p)
        # a withdrawn assignment frees its fields and is not counted as answered or expired
        tmp = sandbox(); r = run_refresh(tmp, NOW)
        a = next(x for x in r["state"]["assignments"] if x["status"] == "open")
        HW.withdraw(r["state"], a["id"], NOW, "test")
        self.assertEqual(a["status"], "withdrawn")
        self.assertRaises(SystemExit, HW.withdraw, r["state"], a["id"], NOW, "twice")

    def test_2_deterministic(self):
        other = sandbox(); r = run_refresh(other, NOW)
        self.assertEqual(json.dumps(r["state"], sort_keys=True), json.dumps(self.r1["state"], sort_keys=True))

    def test_3_answer_a_verify_sheet(self):
        tmp = self.tmp; st = self.r1["state"]
        a = next(x for x in st["assignments"] if x["agent"] == "muse" and x["kind"] == "verify")
        sheet = HW.sheet(a, self.r1["pool"], self.r1["roles"])
        self.assertTrue(all(ln["provenance"]["assignment"] == a["id"] and ln["source"].startswith("FILL") for ln in sheet))
        agree, disagree, left = copy.deepcopy(sheet[0]), copy.deepcopy(sheet[1]), copy.deepcopy(sheet[2])
        agree["source"] = "Numista N#999999 (https://en.numista.com/catalogue/pieces999999.html): the same value, read again by the second reader"
        disagree["source"] = "https://www.ngccoin.com/price-guide/world/test-entry-cuid-1: a different figure on this page"
        disagree["new"] = ([{"number": "1", "system": "KM"}] if isinstance(disagree["new"], list) else (disagree["new"] + 1 if isinstance(disagree["new"], int) else "a different text"))
        before = json.load(open(os.path.join(tmp, "collection", "types", disagree["id"].split(".")[0] + ".json"), encoding="utf-8")) if disagree["entity"] == "type" else None
        status, rep, ev = apply(tmp, [agree, disagree, left])
        self.assertEqual(status, "applied", rep)
        text = "\n".join(rep)
        self.assertIn("re-cited", text); self.assertIn("filed as disagreements", text); self.assertIn("left out", text)
        dis = [json.loads(x) for x in open(os.path.join(tmp, "collection", "disagreements.jsonl"), encoding="utf-8")]
        d = next(x for x in dis if x["field"] == disagree["field"] and x["rid"] == disagree["id"])
        self.assertEqual(d["status"], "open"); self.assertEqual(d["claim"]["assignment"], a["id"]); self.assertEqual(d["how"], "verify")
        if before is not None:     # nothing was overwritten
            now_t = json.load(open(os.path.join(tmp, "collection", "types", disagree["id"].split(".")[0] + ".json"), encoding="utf-8"))
            self.assertEqual(HW.get_path(before[disagree["id"]], disagree["field"]), HW.get_path(now_t[disagree["id"]], disagree["field"]))
        # the agreed fact is now "checked"
        ctx = HW.load_context(tmp)
        target = (agree["entity"], agree["id"], agree["field"])
        coins = [k for k, s in ctx["live"].items() if (s["type"] if target[0] == "type" else k) == target[1]]
        fact = next(f for f, e, fld in HW.VERIFY_FACTS if e == target[0] and fld.replace("{N}", target[2].split(".")[1] if "{N}" in fld else "") == target[2])
        lv = PV.level_of(ctx["details"][coins[0]]["certainty"], fact)
        self.assertEqual(lv, "checked", (target, PV.resolve(ctx["details"][coins[0]]["certainty"], fact)))
        # refresh: the assignment closes, left-out items are tried by muse, the disagreement is an arbitrate job for neither party
        r2 = HW.run(tmp, LATER, ctx=ctx)
        a2 = next(x for x in r2["state"]["assignments"] if x["id"] == a["id"])
        self.assertEqual(a2["status"], "done")
        self.assertTrue(any(t["agent"] == "muse" for t in r2["state"]["tried"].get(f"verify:{left['entity']}:{left['id']}:{left['field']}", [])))
        arb = r2["pool"].get(f"arb:{d['id']}")
        self.assertIsNotNone(arb)
        self.assertIn("muse", arb["authors"])
        self.assertNotIn(f"verify:{agree['entity']}:{agree['id']}:{agree['field']}", r2["pool"], "a checked fact left the verify pool")
        # a third contributor's sourced event settles it: the record stays, the claim's author is counted wrong
        claude = {"ts": "2026-10-09T13:00:00Z", "by": "model:claude", "entity": disagree["entity"], "id": disagree["id"], "op": "set", "field": disagree["field"],
                  "old": d["record"]["value"], "new": d["record"]["value"], "source": "Numista N#888888 (https://en.numista.com/catalogue/pieces888888.html): the record's value, read by a third reader",
                  "verified": False, "phase": 2, "provenance": {"model": "claude", "workflow": "arbitrate", "run_id": "test", "inputs": []}}
        st3, rep3, _ = apply(tmp, [claude], "changes_claude_20261009-1300.jsonl")
        self.assertEqual(st3, "applied", rep3)
        r3 = HW.run(tmp, "2026-10-09T14:00:00Z")
        dis = {x["id"]: x for x in (json.loads(l) for l in open(os.path.join(tmp, "collection", "disagreements.jsonl"), encoding="utf-8"))}
        self.assertEqual(dis[d["id"]]["status"], "resolved"); self.assertEqual(dis[d["id"]]["resolution"]["winner"], "record")
        self.assertEqual(PV.agent_of(dis[d["id"]]["resolution"]["error_by"]), "muse")
        self.assertGreaterEqual(r3["metrics"]["muse"]["wrong"], 1)

    def test_4_placeholder_and_stale_change_nothing(self):
        tmp = sandbox(); r = run_refresh(tmp, NOW)
        a = next(x for x in r["state"]["assignments"] if x["agent"] == "grok" and x["kind"] == "cite")
        sheet = HW.sheet(a, r["pool"], r["roles"])
        status, rep, _ = apply(tmp, sheet[:3], "changes_grok-bot_20261009-1200.jsonl")
        self.assertEqual(status, "already-applied", rep); self.assertIn("left out", rep[0])
        stale = copy.deepcopy(sheet[0]); stale["old"] = "not what the record says"; stale["source"] = "https://en.numista.com/catalogue/pieces1.html row 1"
        status, rep, _ = apply(tmp, [stale], "changes_grok-bot_20261009-1210.jsonl")
        self.assertEqual(status, "already-applied", rep); self.assertIn("stale", "\n".join(rep))

    def test_5_photo_cannot_back_a_mintage(self):
        tmp = sandbox()
        t = json.load(open(os.path.join(tmp, "collection", "types", "IT.json"), encoding="utf-8"))
        tid = next(k for k, v in t.items() if v.get("issues"))
        ev = {"ts": "2026-10-09T10:00:00Z", "by": "model:grok-bot", "entity": "type", "id": tid, "op": "set", "field": "issues.0.mintage", "new": 123456,
              "source": "read from photo C287_rev.webp", "verified": False, "phase": 2, "provenance": {"model": "grok-bot", "run_id": "t", "inputs": []}}
        status, rep, _ = apply(tmp, [ev], "changes_grok-bot_20261009-1000.jsonl")
        self.assertEqual(status, "rejected"); self.assertIn("cannot be read from a photo", "\n".join(rep))

    def test_6_issues_are_append_only(self):
        tmp = sandbox()
        import collection_io as C
        col = C.Collection(os.path.join(tmp, "collection"))
        sid, s = next((k, v) for k, v in sorted(col.specs.items()) if col.types[v["type"]]["issues"] and (v["issue"]["year"] or 0) > 1900)
        before = [PV._issue_key(i) for i in col.types[s["type"]]["issues"]]
        ev = {"ts": "2026-10-09T10:00:00Z", "by": "owner", "entity": "specimen", "id": sid, "op": "set", "field": "issue.year", "new": 1801, "source": "test: an earlier year"}
        status, rep, _ = apply(tmp, [ev], "changes_owner_20261009-1000.jsonl")
        self.assertEqual(status, "applied", rep)
        col = C.Collection(os.path.join(tmp, "collection"))
        after = [PV._issue_key(i) for i in col.types[s["type"]]["issues"]]
        self.assertEqual(after[: len(before)], before, "an existing issue moved: issues.N would point at a different year")

    def test_9_blind_second_read_makes_a_new_coin_checked(self):
        """#55: a second AI reading the photo blind and agreeing makes the first reading 'Checked'; disagreeing files a disagreement."""
        tmp = sandbox(); r = run_refresh(tmp, NOW)
        it = next(v for v in r["pool"].values() if v["kind"] == "verify" and v["field"] == "denomination.value" and v["blind"])
        self.assertIsNone(it["payload"]["value"], "a blind item must not show the first reading")
        author = it["authors"][0]
        reader = next(a for a in ("grok", "muse", "gemini") if a != author)
        aid = "HW-%s-verify-20261009-9" % reader
        st = json.load(open(os.path.join(tmp, "docs", "agents", "homework", "assignments.json"), encoding="utf-8"))
        st["assignments"].append({"id": aid, "agent": reader, "kind": "verify", "issued": NOW, "lease_until": "2026-10-16T09:30:00Z", "status": "open",
                                  "closed": None, "result": None, "items": [{"item": it["item"], "entity": it["entity"], "id": it["id"], "field": it["field"]}]})
        json.dump(st, open(os.path.join(tmp, "docs", "agents", "homework", "assignments.json"), "w", encoding="utf-8"))
        import collection_io as C
        cur = HW.get_path(C.Collection(os.path.join(tmp, "collection")).types[it["id"]], "denomination.value")
        by = json.load(open(os.path.join(ROOT, "docs", "agents", "roles.json"), encoding="utf-8"))["agents"][reader]["by"][0]
        ln = {"ts": LATER, "by": by, "entity": "type", "id": it["id"], "op": "set", "field": "denomination.value", "new": cur,
              "source": f"read blind from photo {it['inputs'][0] if it['inputs'] else 'C000_obv.webp'}", "verified": False, "phase": 2,
              "provenance": {"model": reader, "assignment": aid, "run_id": aid, "inputs": []}}
        status, rep, _ = apply(tmp, [ln], f"changes_{reader}_20261009-1300.jsonl")
        self.assertEqual(status, "applied", rep); self.assertIn("re-read from the photo", "\n".join(rep))
        ctx = HW.load_context(tmp)
        self.assertEqual(PV.level_of(ctx["details"][it["coins"][0]]["certainty"], "denomination"), "checked")

    def test_8_demotion_needs_certainty(self):
        roles = json.load(open(os.path.join(ROOT, "docs", "agents", "roles.json"), encoding="utf-8"))
        def m(wrong, n):
            lo, hi = HW.wilson(wrong, n); return {"x": {"checked_n": n, "wrong": wrong, "error_rate": wrong / n, "error_ci95": [lo, hi]}}
        self.assertFalse(HW.demoted("x", roles, m(4, 17)), "4 of 17 could be bad luck")
        self.assertTrue(HW.demoted("x", roles, m(12, 30)), "12 of 30 is surely above 15 %")
        self.assertFalse(HW.demoted("x", roles, m(3, 5)), "fewer than 10 checks never demote")

    def test_7_change_log_is_append_only(self):
        tmp = sandbox()
        import collection_io as C, chain as CH
        d = os.path.join(tmp, "collection")
        CH.update(d)
        self.assertEqual(CH.problems(d), [])
        col = C.Collection(d)
        col.changes[0] = dict(col.changes[0], source="quietly rewritten")
        with self.assertRaises(CH.HistoryRewritten): col.save()
        col = C.Collection(d)                       # appending is fine and extends the chain
        col.changes.append({"ts": "2026-10-09T10:00:00Z", "by": "owner", "entity": "specimen", "id": next(iter(col.specs)), "field": "notes", "old": None, "new": "x", "source": "test", "verified": False})
        col.save()
        self.assertEqual(CH.problems(d), [])
        self.assertEqual(CH.tip(d)["lines"], len(col.changes))
        with open(os.path.join(d, "changes.jsonl"), encoding="utf-8") as fh: lines = fh.readlines()
        lines[1] = lines[1][:-2] + " }\n"            # a hand edit of an old line (same meaning, different bytes)
        with open(os.path.join(d, "changes.jsonl"), "w", encoding="utf-8") as fh: fh.writelines(lines)
        self.assertTrue(CH.problems(d))


if __name__ == "__main__":
    unittest.main(verbosity=2, warnings="ignore")
