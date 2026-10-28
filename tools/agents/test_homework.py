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
            for kind in {a["kind"] for a in mine}:     # at most `per_kind` open batches of one kind (default 1): variety first
                self.assertLessEqual(sum(1 for a in mine if a["kind"] == kind), max(1, ag.get("per_kind", 1)), f"{agent}: too many open {kind} batches")
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
        agree["source"] = "https://www.ngccoin.com/price-guide/world/test-agree-cuid-2: the same value, read again by the second reader"   # not a Numista id: a made-up N# is now refused
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
        n = target[2].split(".")[1] if "." in target[2] else ""      # issues.{N}.mintage; a plain field (ruler) has no index
        fact = next(f for f, e, fld in HW.VERIFY_FACTS if e == target[0] and fld.replace("{N}", n) == target[2])
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
                  "old": d["record"]["value"], "new": d["record"]["value"], "source": "https://www.ngccoin.com/price-guide/world/test-third-cuid-3: the record's value, read by a third reader",
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
        it = next(v for v in r["pool"].values() if v["kind"] == "verify" and v["field"] == "denomination.value" and v["blind"] and not v["payload"].get("ledger"))
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


class LoopUpgrades(unittest.TestCase):
    """2026-10-15: contradictions as homework (#102), planted wrong values (#99), yearly re-checks (#94), Claude's spot checks (#95)."""
    def test_contradictions_become_homework_except_the_mechanical_ones(self):
        tmp = sandbox(); ctx = HW.load_context(tmp)
        # live data may hold no open contradiction (2026-10-28: the intake closed the last one), so plant one that needs research too
        live = sorted(ctx["live"])[0]
        ctx["truth"] = ctx["truth"] + [{"rule": "copy_differs", "id": "C001", "field": "issue.mintage", "detail": "x"},
                                       {"rule": "mint_unknown", "id": live, "field": "issue.mintage", "detail": "planted by the test"}]
        pool = HW.pool_contradiction(ctx)
        self.assertTrue(pool, "the truth checks found contradictions, so there must be homework")
        self.assertFalse([i for i in pool if ":copy_differs:" in i], "mechanical findings stay with truth_checks.py --fix")
        for it in pool.values():
            self.assertEqual(it["kind"], "contradiction"); self.assertTrue(it["lines"]); self.assertIn(it["payload"]["rule"], HW.CONTRA_ASK)

    def test_ledger_facts_on_a_photographed_coin_are_read_blind_first(self):
        """#125: year, mint and face value still as imported from the ledger go to a blind photo read, ahead of other checks; no photo, no item."""
        tmp = sandbox(); ctx = HW.load_context(tmp)
        pool = HW.pool_verify(ctx, lambda a: 0.0)
        led = [i for i in pool.values() if i["payload"].get("ledger")]
        self.assertTrue(led, "the collection still has ledger facts on photographed coins")
        for it in led:
            self.assertTrue(it["blind"]); self.assertIn(it["payload"]["fact"], HW.BLIND)
            self.assertIsNone(it["payload"]["value"], "a blind read never shows the ledger's value")
            self.assertTrue(all(HW.photos_of(ctx, c) for c in it["coins"]), "only coins with a live photo")
            self.assertTrue(it["payload"]["audit"], "the never-checked ledger goes first")
        nophoto = {sid for sid in ctx["live"] if not HW.photos_of(ctx, sid)}
        self.assertFalse([i for i in led if i["entity"] == "specimen" and set(i["coins"]) <= nophoto])

    def test_recheck_sends_old_checked_facts_back_once_a_year(self):
        tmp = sandbox(); ctx = HW.load_context(tmp)
        ctx["now"] = "2026-10-15T00:00:00Z"
        self.assertFalse([i for i in HW.pool_verify(ctx, lambda a: 0.0).values() if i["payload"].get("recheck")])
        ctx["now"] = "2028-01-15T00:00:00Z"
        old = [i for i in HW.pool_verify(ctx, lambda a: 0.0).values() if i["payload"].get("recheck")]
        self.assertTrue(old); self.assertLessEqual(len(old), HW.RECHECK_PER_MONTH)
        self.assertTrue(all(len(i["authors"]) >= 2 for i in old), "a re-check never goes to either of the two who checked it")

    def test_planted_values_are_caught_or_missed(self):
        import canary as CAN
        rate = CAN.RATE; CAN.RATE = 1.0
        try:
            tmp = sandbox(); r = run_refresh(tmp, NOW)
            os.environ["TITAN_ASSIGNMENTS"] = os.path.join(tmp, "docs", "agents", "homework", "assignments.json")
            col = A.C.Collection(os.path.join(tmp, "collection")); planted = []
            for a in r["state"]["assignments"]:
                if a["status"] != "open" or a["kind"] != "verify": continue
                for ln in open(os.path.join(tmp, "docs", "agents", "homework", "sheets", a["id"] + ".jsonl"), encoding="utf-8"):
                    x = json.loads(ln); rec = col.types.get(x["id"]) if x["entity"] == "type" else col.specs.get(x["id"])
                    if x.get("new") is not None and "old" in x and x["new"] != HW.get_path(rec, x["field"]):
                        planted.append((x, HW.get_path(rec, x["field"])))
            self.assertGreaterEqual(len(planted), 2, "with every item chosen, verify sheets must carry planted values")
            agent = planted[0][0]["by"]; same = [p for p in planted if p[0]["by"] == agent][:3]
            if len(same) < 3: self.skipTest("need three planted lines from one AI")
            src = "https://en.numista.com/catalogue/pieces1234.html, the Features table row"
            missed = dict(same[0][0], ts=LATER, source=src)                          # sent back as shown: rubber-stamped
            caught = dict(same[1][0], ts=LATER, source=src, new=same[1][1])          # the true value: it really checked
            reworded = dict(same[2][0], ts=LATER, source=src, new=f"{same[2][1]} and something more")   # changed the planted value, in its own words
            before = len(A.C.Collection(os.path.join(tmp, "collection")).disagreements)
            st, rep, _ = apply(tmp, [missed, caught, reworded], name=f"changes_{PV.agent_of(agent)}_20261009-1201.jsonl")
            txt = "\n".join(rep)
            self.assertIn("canary missed", txt); self.assertIn("canary caught", txt)
            self.assertEqual(len(A.C.Collection(os.path.join(tmp, "collection")).disagreements), before + 1,
                             "a planted value sent back is never filed; an answer that differs from the record too is judged as usual")
            rows = [json.loads(l) for l in open(os.path.join(tmp, "docs", "agents", "homework", "canaries.jsonl"), encoding="utf-8")]
            self.assertEqual(sorted(x["outcome"] for x in rows), ["caught", "caught", "missed"], "changing the planted value counts as caught in any wording")
            m = HW.measure(HW.load_context(tmp))[PV.agent_of(agent)]
            self.assertEqual((m["canaries_caught"], m["canaries_missed"]), (2, 1))
        finally:
            CAN.RATE = rate; os.environ.pop("TITAN_ASSIGNMENTS", None)

    def test_claude_spot_check_counts_and_files_a_difference(self):
        tmp = sandbox(); col = A.C.Collection(os.path.join(tmp, "collection"))
        tid, t = next((k, v) for k, v in sorted(col.types.items()) if isinstance(v.get("ruler"), str) and v["ruler"])
        line = {"ts": LATER, "by": "model:claude", "entity": "type", "id": tid, "op": "set", "field": "ruler", "old": t["ruler"], "new": t["ruler"] + " (spot check)",
                "source": "https://en.numista.com/catalogue/pieces1234.html, the Features table row", "verified": False, "phase": 2, "confidence": "high",
                "provenance": {"model": "claude-opus", "prompt_version": "INTAKE@2026-10-15", "workflow": "spot-check", "run_id": "t", "inputs": []}}
        st, rep, _ = apply(tmp, [line], name="changes_claude_20261009-1202.jsonl")
        self.assertIn("filed, NOT applied", "\n".join(rep))
        col = A.C.Collection(os.path.join(tmp, "collection"))
        self.assertEqual(col.types[tid]["ruler"], t["ruler"], "a spot check never overwrites")
        self.assertTrue(HW.measure(HW.load_context(tmp))["claude"]["checks_done"] >= 1)

    def test_a_check_answer_is_compared_by_meaning_not_spelling(self):
        V = A.check_verdict
        rec = [{"number": "241", "system": "KM"}, {"number": "124", "system": "Schön"}, {"number": "152", "system": "Numista", "url": "https://en.numista.com/catalogue/pieces152.html"}]
        self.assertEqual(V("catalogs", rec, {"numista": "N#152", "km": "KM#241", "schon": "Schön#124"})[0], "same")
        self.assertEqual(V("catalogs", rec, {"numista": "N#152", "km": "KM#241", "schon": "Schön#124", "gad": "Gad#4"})[0], "same")
        self.assertEqual(V("catalogs", rec, [{"system": "N", "number": "152"}])[0], "partial", "naming only some catalogues is not a full check")
        self.assertEqual(V("catalogs", rec, {"km": "KM#242", "numista": "N#152", "schon": "Schön#124"})[0], "differs")
        self.assertEqual(V("composition.text", "copper-nickel", "Copper-nickel")[0], "same")
        self.assertEqual(V("composition.text", "nickel brass (75% copper, 21% zinc, 4% nickel)", "Nickel brass (75 % Cu, 21 % Zn, 4% Ni)")[0], "same")
        self.assertEqual(V("composition.text", "bronze", "brass")[0], "differs")
        self.assertEqual(V("issues.0.mintage", 100, 101)[0], "differs")
        self.assertEqual(V("issue.mint_marks", ["Mo"], "Mo")[0], "same", "one mark sent without its list is the same mark")
        self.assertEqual(V("issue.mint_marks", ["B"], [])[0], "differs")
        self.assertEqual(V("issue.mint_marks", ["D", "F"], "D")[0], "differs")
        # alloy spellings (Gemini's verify answers, 2026-10-28): same metal and parts in another format = same
        self.assertEqual(V("composition.text", "nickel brass (Cu 70 / Zn 18 / Ni 12)", "nickel brass (70% Copper, 18% Zinc, 12% Nickel)")[0], "same")
        self.assertEqual(V("composition.text", "CuNi 75/25", "copper-nickel (75% copper, 25% nickel)")[0], "same")
        self.assertEqual(V("composition.text", "cupronickel", "copper-nickel (75% Copper, 25% Nickel)")[0], "same")
        self.assertEqual(V("composition.text", "nickel brass (Cu 70 / Zn 18 / Ni 12)", "nickel brass (75% Copper, 21% Zinc, 4% Nickel)")[0], "differs")
        self.assertEqual(V("composition.text", "CuNi 75/25", "CuNi 80/20")[0], "differs")
        self.assertEqual(V("composition.text", "copper-nickel", "nickel")[0], "differs")

    def test_a_dict_or_partial_catalogue_answer_never_rewrites_the_list(self):
        import canary as CAN
        rate = CAN.RATE; CAN.RATE = 0.0
        try:
            tmp = sandbox(); r = run_refresh(tmp, NOW)
            col = A.C.Collection(os.path.join(tmp, "collection"))
            pick = None
            for a in r["state"]["assignments"]:
                if a["status"] != "open" or a["kind"] != "verify": continue
                for t in a["items"]:
                    rec = col.types.get(t["id"]) if t["entity"] == "type" else None
                    if t.get("field") == "catalogs" and rec and len(rec.get("catalogs") or []) >= 2: pick = (a, t, rec); break
                if pick: break
            if not pick: self.skipTest("no catalogue item on a verify sheet")
            a, t, rec = pick; cats = copy.deepcopy(rec["catalogs"])
            base = {"ts": LATER, "by": f"model:{a['agent']}", "entity": "type", "id": t["id"], "op": "set", "field": "catalogs", "old": cats,
                    "source": "https://en.numista.com/catalogue/pieces1234.html, the References row", "verified": False, "phase": 2, "confidence": "high",
                    "provenance": {"model": a["agent"], "workflow": "homework-verify", "run_id": a["id"], "inputs": []}}      # "assignment" key dropped
            as_dict = dict(base, new={x["system"].lower(): f"#{x['number']}" for x in cats})
            st, rep, _ = apply(tmp, [as_dict], name=f"changes_{a['agent']}_20261009-1203.jsonl"); txt = "\n".join(rep)
            self.assertIn("taken from provenance.run_id", txt); self.assertIn("typed differently", txt)
            self.assertEqual(A.C.Collection(os.path.join(tmp, "collection")).types[t["id"]]["catalogs"], cats, "an agreeing answer keeps the record's own list")
            before = len(A.C.Collection(os.path.join(tmp, "collection")).disagreements)
            part = dict(base, ts="2026-10-09T12:05:00Z", new=[cats[0]])
            st, rep, _ = apply(tmp, [part], name=f"changes_{a['agent']}_20261009-1204.jsonl")
            self.assertIn("checked only part", "\n".join(rep))
            c2 = A.C.Collection(os.path.join(tmp, "collection"))
            self.assertEqual(c2.types[t["id"]]["catalogs"], cats, "a partial answer never drops the other catalogue numbers")
            self.assertEqual(len(c2.disagreements), before, "a partial answer is not a disagreement")
        finally:
            CAN.RATE = rate

    def test_every_issue_line_names_its_year(self):
        tmp = sandbox(); run_refresh(tmp, NOW); n = 0
        d = os.path.join(tmp, "docs", "agents", "homework", "sheets")
        for f in os.listdir(d):
            for ln in open(os.path.join(d, f), encoding="utf-8"):
                x = json.loads(ln)
                if x["entity"] == "type" and x["field"].startswith("issues.") and x["source"].startswith("FILL"):
                    n += 1; self.assertIn("this line is the ", x["source"], x)
        self.assertGreater(n, 0, "no issue-level sheet line to test")

    def test_an_ai_with_its_own_lease_gets_the_shorter_deadline(self):
        tmp = sandbox(); p = os.path.join(tmp, "docs", "agents", "roles.json")
        roles = json.load(open(p, encoding="utf-8")); agent = next(a for a, ag in roles["agents"].items() if ag.get("status") == "active")
        roles["agents"][agent]["lease_days"] = 2
        with open(p, "w", encoding="utf-8") as fh: json.dump(roles, fh)
        r = run_refresh(tmp, NOW)
        mine = [a for a in r["state"]["assignments"] if a["agent"] == agent and a["status"] == "open"]
        self.assertTrue(mine, "no assignment issued to test")
        for a in mine: self.assertEqual(a["lease_until"], HW._days(NOW, 2), a["id"])
        others = [a for a in r["state"]["assignments"] if a["agent"] != agent and a["status"] == "open"]
        for a in others:                # everyone else: the kind's lease, or their own when that is shorter
            own = roles["agents"][a["agent"]].get("lease_days"); kd = roles["kinds"][a["kind"]].get("lease_days", 7)
            self.assertEqual(a["lease_until"], HW._days(NOW, min(kd, own) if own else kd), a["id"])

    def test_a_sheet_split_into_parts_stays_open_until_its_deadline(self):
        tmp = sandbox(); r = run_refresh(tmp, NOW)
        a = next(x for x in r["state"]["assignments"] if x["agent"] == "muse" and x["kind"] == "verify")
        sp = os.path.join(tmp, "docs", "agents", "homework", "assignments.json"); st = json.load(open(sp, encoding="utf-8"))
        next(x for x in st["assignments"] if x["id"] == a["id"])["parts"] = 2
        with open(sp, "w", encoding="utf-8") as fh: json.dump(st, fh, indent=1, ensure_ascii=False)
        line = copy.deepcopy(HW.sheet(a, r["pool"], r["roles"])[0])
        line["source"] = "https://www.ngccoin.com/price-guide/world/test-part-cuid-4: the same value, read again from part 1"
        status, rep, _ = apply(tmp, [line])
        self.assertEqual(status, "applied", rep)
        r2 = HW.run(tmp, LATER)       # part 1 answered, before the deadline: still open, nothing handed back
        a2 = next(x for x in r2["state"]["assignments"] if x["id"] == a["id"])
        self.assertEqual(a2["status"], "open")
        self.assertIn("on Drive in 2 parts", open(os.path.join(tmp, "docs", "agents", "QUEUE_muse.md"), encoding="utf-8").read())
        self.assertIn(f"{a['id']} (part 1 of 2).jsonl", open(os.path.join(tmp, "docs", "agents", "drive", "QUEUE_muse.txt"), encoding="utf-8").read())
        after = HW._days(a["lease_until"], 1)
        r3 = HW.run(tmp, after)        # past the deadline it closes as answered (done), not expired
        a3 = next(x for x in r3["state"]["assignments"] if x["id"] == a["id"])
        self.assertEqual(a3["status"], "done")

    def test_only_your_own_sheet_and_a_real_assignment_are_accepted(self):
        """2026-10-22: Gemini sent Grok's Oct 10 sheet lines (from a stale Drive copy of the repository) under its own assignment id."""
        tmp = sandbox(); r = run_refresh(tmp, NOW); st = r["state"]
        a = next(x for x in st["assignments"] if x["agent"] == "muse" and x["kind"] == "verify")
        b = next(x for x in st["assignments"] if x["agent"] == "grok" and x["status"] == "open")
        mine = HW.sheet(a, r["pool"], r["roles"]); theirs = HW.sheet(b, r["pool"], r["roles"])
        everyone = [ln for x in st["assignments"] if x["agent"] != "muse" and x["status"] == "open" for ln in HW.sheet(x, r["pool"], r["roles"])]
        on = {(t["entity"], t["id"]) for t in a["items"]}
        col = A.C.Collection(os.path.join(tmp, "collection"))
        def related(ln):
            if (ln["entity"], ln["id"]) in on: return True
            specs = {i for k, i in on if k == "specimen"}; types = {i for k, i in on if k == "type"}
            return (ln["entity"] == "type" and any((col.specs.get(x) or {}).get("type") == ln["id"] for x in specs)) or \
                   (ln["entity"] == "specimen" and (col.specs.get(ln["id"]) or {}).get("type") in types)
        stray = copy.deepcopy(next(ln for ln in everyone if not related(ln)))
        stray["by"] = mine[0]["by"]; stray["provenance"] = dict(mine[0]["provenance"]); stray["source"] = "https://www.ngccoin.com/price-guide/world/test-stray-cuid-9: a line copied from another sheet"
        status, rep, _ = apply(tmp, [stray], "changes_muse_20261009-1201.jsonl")
        self.assertEqual(status, "rejected", rep); self.assertIn("is not on your sheet " + a["id"], "\n".join(rep))
        made_up = copy.deepcopy(mine[0]); made_up["provenance"] = dict(made_up["provenance"], assignment="HW-muse-verify-19990101-9", run_id="x")
        made_up["source"] = "https://www.ngccoin.com/price-guide/world/test-made-up-cuid-8: a made-up assignment id"
        status, rep, _ = apply(tmp, [made_up], "changes_muse_20261009-1202.jsonl")
        self.assertEqual(status, "rejected", rep); self.assertIn("does not exist", "\n".join(rep))
        other = copy.deepcopy(theirs[0]); other["by"] = mine[0]["by"]; other["source"] = "https://www.ngccoin.com/price-guide/world/test-other-cuid-7: another AI's sheet"
        status, rep, _ = apply(tmp, [other], "changes_muse_20261009-1203.jsonl")
        self.assertEqual(status, "rejected", rep); self.assertIn("belongs to grok", "\n".join(rep))
        # every blank names its coin, and a blind reading never shows the answer in that name
        for x in st["assignments"]:
            if x["status"] != "open": continue
            for ln in HW.sheet(x, r["pool"], r["roles"]):
                if ln["source"].startswith("FILL"): self.assertTrue(ln["source"].startswith("FILL ("), ln["source"][:80])
        for it in r["pool"].values():
            if it["kind"] == "verify" and it["blind"] and it["payload"]["fact"] in ("year", "denomination"):
                sp = col.specs[it["coins"][0]]
                hidden = str(sp["issue"]["year"]) if it["payload"]["fact"] == "year" else None
                if hidden: self.assertNotIn(hidden, [x.strip() for x in it["label"].split("·")], it["label"])

    def test_blank_facts_become_fill_sheets_that_merge(self):
        """2026-10-23 (owner: "Load up muse"): a Phase 2 fact still blank on a type we hold is a fill item; an answered line merges."""
        tmp = sandbox(); r = run_refresh(tmp, NOW)
        fills = [it for it in r["pool"].values() if it["kind"] == "fill"]
        self.assertTrue(fills, "no blank facts found")
        a = next((x for x in r["state"]["assignments"] if x["kind"] == "fill" and x["status"] == "open"), None)
        self.assertIsNotNone(a, "no fill assignment issued")
        sheet = HW.sheet(a, r["pool"], r["roles"])
        self.assertTrue(all(ln["source"].startswith("FILL (") and ln["new"] in (None, "", [], "unknown") for ln in sheet), sheet[0])
        answers = {"nominal.edge": "Plain", "period": "Republic", "nominal.alignment": "coin", "nominal.thickness_mm": 1.5,
                   "design.obverse": "Arms · REPUBLIC · date", "design.reverse": "Value · 10 · CENTS"}   # whichever blank the live data still has
        ln = copy.deepcopy(next(x for x in sheet if x["field"] in answers))
        ln["new"] = answers[ln["field"]]; ln["source"] = "https://en.numista.com/catalogue/pieces99999.html: Features table row"
        status, rep, _ = apply(tmp, [ln], f"changes_{a['agent']}_20261009-1204.jsonl")
        self.assertEqual(status, "applied", rep)
        col = A.C.Collection(os.path.join(tmp, "collection"))
        self.assertEqual(HW.get_path(col.types[ln["id"]], ln["field"]), ln["new"])
        r2 = HW.run(tmp, LATER)
        it = r2["pool"].get(f"fill:{ln['id']}")
        self.assertTrue(it is None or not any(f == ln["field"] for _, _, f, _ in it["lines"]), "a filled fact left the fill pool")

    def test_commas_inside_an_inscription_are_not_shorthand(self):
        motto = {"C001": {"story": "A 1962 1-franc coin from France. The back shows 1 FRANC, an olive branch, the motto LIBERTE, EGALITE, FRATERNITE, and the date."}}
        listy = {"C001": {"story": "A 1962 franc. Sower, olive branch, oak, stars, date, RF on the front."}}
        self.assertEqual(HW.pool_plain({"live": motto, "details": {}}, set()), {}, "a capital-letter motto made a plain story look like shorthand")
        self.assertIn("plain:C001", HW.pool_plain({"live": listy, "details": {}}, set()), "a list of fragments is still shorthand")

    def test_a_resent_check_counts_once(self):
        ev = {"by": "model:gemini", "entity": "type", "id": "DE.KM.214", "field": "issues.0.mintage", "old": 20475000, "new": 20475000,
              "provenance": {"assignment": "HW-gemini-verify-20261012-1"}}
        ctx = {"details": {}, "disagreements": [], "col": {"events": [dict(ev, ts="2026-10-12T21:09:15Z"), dict(ev, ts="2026-10-15T03:00:00Z")], "specs": {}},
               "root": tempfile.mkdtemp(prefix="hw_resend_")}
        try: self.assertEqual(HW.measure(ctx)["gemini"]["checks_done"], 1, "the same fact checked twice by one AI is one check")
        finally: shutil.rmtree(ctx["root"], ignore_errors=True)


if __name__ == "__main__":
    unittest.main(verbosity=2, warnings="ignore")
