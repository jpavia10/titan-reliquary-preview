#!/usr/bin/env python3
"""End-to-end tests for the contribution pipeline (python3 tools/pipeline/test_pipeline.py). Needs jsonschema. Works on temp copies only.

  - the collection writer round-trips byte for byte
  - parity: building from collection/ reproduces the golden data/ (test_parity.py)
  - the two templates apply (Phase 1 creates a coin, Phase 2 edits it), publish rebuilds data/, the new coin is in index.json and the edit shows
  - re-applying is a no-op; every kind of bad contribution is rejected and changes nothing
  - publish refuses to publish a collection that does not validate
"""
import warnings; warnings.simplefilter("ignore")
import pathlib, glob, hashlib, json, os, shutil, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import collection_io as C

PY = sys.executable
T1 = os.path.join(ROOT, "collection", "templates", "phase1_template.jsonl")
T2 = os.path.join(ROOT, "collection", "templates", "phase2_template.jsonl")

def _base():
    """The live collection the sandboxes copy: tests derive ids and counts from it, so real coins arriving never break them."""
    col = C.Collection(os.path.join(ROOT, "collection"))
    nums = [int(k[1:]) for k in col.specs if k[:1] == "C" and k[1:].isdigit()]
    return col, max([0] + nums) + 1            # new coins number straight on from the highest existing C id
BASE, _NEXT_N = _base()
NEXT, NEXT2 = "C%03d" % _NEXT_N, "C%03d" % (_NEXT_N + 1)
BOARD = json.load(open(os.path.join(ROOT, "data", "index.json"), encoding="utf-8"))["board"]   # the live board the sandbox starts from
def logged_on(day):
    """Existing specimens logged on `day` and their summed estimate (the portfolio test compares against a real baseline)."""
    hits = [x for x in BASE.specs.values() if (x.get("acquisition") or {}).get("logged_at") == day]
    return len(hits), sum(((x.get("value") or {}).get("est_usd") or 0) for x in hits)

def t2(tmp):
    """The Phase 2 template edits the placeholder C000 (so an AI copying it never edits a real coin); the tests point it at the coin Phase 1 creates."""
    out = os.path.join(tmp, "phase2_template.jsonl")
    with open(T2, encoding="utf-8") as f, open(out, "w", encoding="utf-8") as g: g.write(f.read().replace('"C000"', '"%s"' % NEXT).replace("C000_", NEXT + "_"))
    return out

def tree_hash(d):
    h = hashlib.sha256()
    for root, dirs, files in os.walk(d):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(root, f); h.update(os.path.relpath(p, d).encode()); h.update(pathlib.Path(p).read_bytes())
    return h.hexdigest()

def run(*args, **kw):
    return subprocess.run([PY, *args], capture_output=True, text=True, cwd=ROOT, **kw)

def sandbox():
    tmp = tempfile.mkdtemp(prefix="pipe-test-")
    shutil.copytree(os.path.join(ROOT, "collection"), os.path.join(tmp, "collection"), ignore=shutil.ignore_patterns("_incoming"))
    shutil.copytree(os.path.join(ROOT, "data"), os.path.join(tmp, "data"))
    shutil.copyfile(os.path.join(ROOT, "version.json"), os.path.join(tmp, "version.json"))
    return tmp

def write_events(tmp, name, events):
    p = os.path.join(tmp, name)
    with open(p, "w", encoding="utf-8") as f:
        for e in events: f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return p

def ev(**kw):
    e = {"ts": "2026-10-03T10:00:00Z", "by": "model:test", "source": "test fixture", "verified": False, "phase": 2}
    e.update(kw); return e

class Pipeline(unittest.TestCase):
    def apply(self, tmp, *files):
        return run(os.path.join(HERE, "apply_changes.py"), "--collection", os.path.join(tmp, "collection"), *files)

    def publish(self, tmp, *extra):
        return run(os.path.join(HERE, "publish.py"), "--collection", os.path.join(tmp, "collection"), "--out", os.path.join(tmp, "data"),
                   "--version", os.path.join(tmp, "version.json"), "--now", "2026-10-09T12:00:00Z", *extra)

    def test_roundtrip_is_byte_identical(self):
        tmp = sandbox(); before = tree_hash(os.path.join(tmp, "collection"))
        C.Collection(os.path.join(tmp, "collection")).save()
        self.assertEqual(before, tree_hash(os.path.join(tmp, "collection")))

    def test_parity_with_golden(self):
        r = run(os.path.join(HERE, "test_parity.py"))
        self.assertEqual(r.returncode, 0, r.stdout[-2500:])
        self.assertIn("UNEXPLAINED 0", r.stdout)

    def test_templates_end_to_end(self):
        tmp = sandbox()
        r = self.apply(tmp, T1, t2(tmp))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("APPLIED phase1_template.jsonl", r.stdout); self.assertIn("APPLIED phase2_template.jsonl", r.stdout)
        p = self.publish(tmp)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        idx = json.load(open(os.path.join(tmp, "data", "index.json"), encoding="utf-8"))
        row = next(f for f in idx["flips"] if f["scan"] == NEXT)                      # the new coin is in the index
        self.assertEqual((row["country"], row["year"], row["status"], row["kind"]), ("Canada", "1978", "Logged", "flip"))
        nflips = sum(1 for x in BASE.specs.values() if (x.get("lifecycle") or {}).get("status") != "Removed") + 1
        self.assertEqual(len(idx["flips"]), nflips); self.assertEqual(idx["counts"]["flips"], nflips)
        self.assertEqual(row["est"], 0.15)                                               # Phase 1 set a default 0.05 (low); Phase 2 refined it to 0.15
        det = json.load(open(os.path.join(tmp, "data", "detail", "CA.json"), encoding="utf-8"))[NEXT]
        self.assertIn("900,000,000", det["mintage"])                                     # Phase 2 mintage reached the detail view
        self.assertIn("2.80 g", det["metal"]); self.assertIn("19.05 mm", det["metal"])   # Phase 2 nominal weight + diameter
        self.assertEqual(det["refs"], "KM#59.2")                                         # Phase 2 catalog number
        self.assertAlmostEqual(idx["board"]["flips"]["usd"], BOARD["flips"]["usd"] + 0.15, 2)   # the board moves by exactly the new coin's value
        self.assertEqual(idx["board"]["flips"]["cards"], BOARD["flips"]["cards"] + 1)
        self.assertAlmostEqual(idx["board"]["grand"], BOARD["grand"] + 0.15, 2)
        self.assertEqual(idx["board"]["silver"]["oz"], 63.27); self.assertEqual(idx["board"]["gold"]["oz"], 0.1322)   # board metals stay authoritative
        self.assertTrue(json.load(open(os.path.join(tmp, "data", "search.json")))[NEXT])
        ver = json.load(open(os.path.join(tmp, "version.json")))
        self.assertTrue(ver["ledger_version"].startswith("v3:")); self.assertEqual(ver["generated_at"], "2026-10-09T12:00:00Z"); self.assertEqual(ver["newest_flip"], NEXT)
        log = [json.loads(ln) for ln in open(os.path.join(tmp, "collection", "changes.jsonl"), encoding="utf-8") if ln.strip()]
        self.assertTrue(any(e["id"] == NEXT and e["field"] == "value.est_usd" and e["old"] == 0.05 and e["new"] == 0.15 and e["verified"] is False for e in log))
        # the validator is happy with the result
        v = run(os.path.join(ROOT, "tools", "schema", "validate.py"), os.path.join(tmp, "collection"))
        self.assertEqual(v.returncode, 0, v.stdout)

    def test_new_coin_enters_the_portfolio_series_from_its_logged_date(self):
        tmp = sandbox()
        spot = os.path.join(tmp, "collection", "prices", "spot_daily.jsonl")
        days = ["2026-09-%02d" % n for n in range(11, 31)] + ["2026-10-%02d" % n for n in range(1, 10)]
        with open(spot, "w", encoding="utf-8") as f:                                     # synthetic flat prices for the sandbox only
            for d in days: f.write(json.dumps({"date": d, "xag_usd": 60.585999, "xau_usd": 4161.5, "source": "synthetic test row", "fetched_at": "2026-10-09T00:00:00Z"}) + "\n")
        self.assertEqual(self.apply(tmp, T1, t2(tmp)).returncode, 0)
        p = self.publish(tmp); self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        spec = json.load(open(os.path.join(tmp, "collection", "specimens", "CA.json"), encoding="utf-8"))[NEXT]
        self.assertEqual(spec["acquisition"]["logged_at"], "2026-10-02")                 # logged_at defaults to the creating event's date
        idx = json.load(open(os.path.join(tmp, "data", "index.json"), encoding="utf-8")); pf = idx["value"]["portfolio_daily"]
        rows = {r[0]: r for r in pf["rows"]}
        k, kusd = logged_on("2026-10-02")                                                # real coins already logged that day
        self.assertEqual(rows["2026-10-02"][5], rows["2026-10-01"][5] + 1 + k)                         # not before its date, from it onward
        self.assertGreaterEqual(rows["2026-10-09"][5], rows["2026-10-02"][5])
        self.assertAlmostEqual(rows["2026-10-02"][1] - rows["2026-10-01"][1], 0.15 + kusd, places=2)    # flat prices: the step is exactly the new coins
        self.assertEqual(rows["2026-10-02"][6], 1 + k)
        self.assertIn({"d": "2026-10-02", "n": 1 + k}, pf["markers"])
        px = json.load(open(os.path.join(tmp, "data", "prices.json"), encoding="utf-8"))
        self.assertEqual(px["spot"]["rows"][0][0], "2026-09-11"); self.assertEqual(px["spot"]["rows"][-1][0], "2026-10-09")

    def test_reapply_is_a_noop(self):
        tmp = sandbox(); self.apply(tmp, T1, t2(tmp))
        h = tree_hash(os.path.join(tmp, "collection"))
        r = self.apply(tmp, T1, t2(tmp))
        self.assertEqual(r.returncode, 0); self.assertIn("nothing to do", r.stdout)
        self.assertEqual(h, tree_hash(os.path.join(tmp, "collection")))

    def test_incoming_drop_zone(self):
        tmp = sandbox(); inc = os.path.join(tmp, "collection", "_incoming"); os.makedirs(inc)
        shutil.copyfile(T1, os.path.join(inc, "changes_claude_20261002-1830.jsonl"))
        r = self.publish(tmp)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue(os.path.exists(os.path.join(inc, "applied", "changes_claude_20261002-1830.jsonl")))
        self.assertIn(NEXT, open(os.path.join(tmp, "data", "search.json"), encoding="utf-8").read())

    def reject(self, events, expect, setup=None):
        tmp = sandbox()
        if setup: setup(tmp)
        before = tree_hash(os.path.join(tmp, "collection"))
        f = write_events(tmp, "changes_bad.jsonl", events)
        r = self.apply(tmp, f)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("REJECTED", r.stdout); self.assertIn(expect, r.stdout)
        self.assertEqual(before, tree_hash(os.path.join(tmp, "collection")), "a rejected file must change nothing")

    def test_rejections(self):
        self.reject([ev(entity="specimen", id="C001", field="condition.grade", new="MS-70", verified=True)], "only the owner")
        self.reject([ev(entity="specimen", id="C001", field="condition.nope.deeper", new=1)], "no field")
        self.reject([ev(entity="specimen", id="C999", field="notes", new="x")], "does not exist")
        self.reject([ev(entity="specimen", id="C001", field="id", new="C002")], "permanent")
        self.reject([ev(entity="specimen", id="C001", field="ser", new="EU-CH-099")], "reassignment")
        def owner_story(tmp):
            f = write_events(tmp, "owner.jsonl", [ev(by="owner", entity="specimen", id="C001", field="story", new="Dad gave me this one in 1990.", source="owner, in chat")])
            assert self.apply(tmp, f).returncode == 0
        self.reject([ev(entity="specimen", id="C001", field="story", new="A Swiss franc.", source="photo C001_label.jpg")], "owner's words win", setup=owner_story)
        self.reject([ev(entity="specimen", id="C001", field="notes", new="x", old="not the current value")], "stale edit")
        self.reject([ev(entity="specimen", id="C001", field="notes", new="x", source=None)], "real 'source'")
        self.reject([ev(entity="specimen", id="C001", field="condition.cleaned", new="maybe", source="pro photo C001_obv.jpg")], "validation")          # schema violation
        self.reject([ev(entity="specimen", id="C001", field="bogus_key", new=1)], "validation")                         # unknown leaf: the schema rejects it
        self.reject([{"ts": "2026-10-03T10:00:00Z", "by": "model:t", "entity": "specimen", "id": "C001", "field": "notes", "new": "x", "source": "s", "surprise": 1}], "unknown key")
        self.reject([ev(entity="specimen", id="C%03d" % (_NEXT_N + 5), op="create", field="(new record)", new={"type": "CH.KM.24a.1", "year_raw": "1969"})], "next free 'C' id is " + NEXT)      
        self.reject([ev(entity="specimen", id="NEW-1", op="create", field="(new record)", new={"type": "XX.KM.1", "year_raw": "1969"})], "does not exist")
        self.reject([ev(entity="type", id="C001", op="create", field="(new record)", new={})], "type id")
        self.reject([ev(entity="album", id="A099", op="create", field="(new record)", new={})], "albums are created")
        self.reject([ev(entity="specimen", id="C001", op="create", field="(new record)", new={})], "already exists")

    def test_v3_phase_tiers(self):
        p1 = dict(phase=1, source="photo IMG_0412.jpg (pen label)")
        e = ev(entity="specimen", id="C001", field="notes", new="x"); e.pop("phase")
        self.reject([e], 'needs "phase"')
        tmp = sandbox()                                                                   # schema v4: Phase 1 sets a default value
        r = self.apply(tmp, write_events(tmp, "changes_v.jsonl", [ev(entity="specimen", id="C001", field="value.est_usd", new=1.0, **p1), ev(entity="specimen", id="C001", field="value.confidence", new="low", **p1)]))
        self.assertEqual(r.returncode, 0, r.stdout)
        self.reject([ev(entity="specimen", id="C001", field="measured.weight_g", new=2.5, **p1)], "Phase 2 field")
        self.reject([ev(entity="specimen", id="C001", field="condition.text", new="circulated", **p1)], "Phase 2 field")
        self.reject([ev(entity="type", id="CA.KM.59.2", op="create", field="(new record)", new={"class": "coin", "denomination": {"value": 1, "unit": "cent", "currency": "CAD"}}, **p1)], "never carries a catalog number")
        self.reject([ev(entity="type", id="CH.KM.24a.1", field="catalogs", new=[{"system": "KM", "number": "24a.1"}], **p1)], "Phase 2 field")
        self.reject([ev(entity="specimen", id="C001", field="acquisition.price_paid_usd", new=5.0)], "the owner only")
        self.reject([ev(entity="specimen", id="C001", field="research.phase", new=2)], "pipeline only")
        self.reject([ev(entity="album", id="A026", field="year_start", new=1985, phase=1.5, source="scan A026_p01_20261010.jpg")], "pipeline only")
        # allowed: Phase 1 story + notes, and the pipeline records research progress
        tmp = sandbox()
        f = write_events(tmp, "ok.jsonl", [ev(entity="specimen", id="C001", field="story", new="A Swiss franc from 1969, struck in Bern.", **p1)])
        r = self.apply(tmp, f); self.assertEqual(r.returncode, 0, r.stdout)
        s = C.Collection(os.path.join(tmp, "collection")).specs["C001"]
        self.assertGreaterEqual(s["research"]["phase"], 1); self.assertEqual(s["research"]["phase1_at"], "2026-10-03T10:00:00Z"); self.assertEqual(s["research"]["phase1_by"], "model:test")

    def test_verified_fields_are_protected(self):
        tmp = sandbox(); cdir = os.path.join(tmp, "collection")
        owner = ev(ts="2026-10-03T09:00:00Z", by="owner", entity="specimen", id="C001", field="condition.grade", new="AU-55", verified=True, source="owner checked the coin")
        self.assertEqual(self.apply(tmp, write_events(tmp, "changes_owner.jsonl", [owner])).returncode, 0)
        h = tree_hash(cdir)
        r = self.apply(tmp, write_events(tmp, "changes_ai.jsonl", [ev(ts="2026-10-04T09:00:00Z", entity="specimen", id="C001", field="condition.grade", new="VF-20", source="pro photo C001_obv.jpg")]))
        self.assertEqual(r.returncode, 1); self.assertIn("VERIFIED by owner", r.stdout); self.assertEqual(h, tree_hash(cdir))
        bad = ev(ts="2026-10-04T09:00:00Z", entity="specimen", id="C001", field="condition", new={"text": "x", "grade": "F", "grader": None, "cert": None, "strike": None, "luster": None, "toning": None, "cleaned": None, "damage": []}, source="pro photo C001_obv.jpg")
        self.assertEqual(self.apply(tmp, write_events(tmp, "changes_ai2.jsonl", [bad])).returncode, 1)              # a parent edit cannot sneak past it either
        ok = ev(ts="2026-10-04T09:00:00Z", entity="specimen", id="C001", field="condition.grade", new="VF-20", supersedes="2026-10-03T09:00:00Z", source="re-graded from pro photo C001_obv.jpg")
        r = self.apply(tmp, write_events(tmp, "changes_ai3.jsonl", [ok]))
        self.assertEqual(r.returncode, 0, r.stdout); self.assertIn("SUPERSEDED", r.stdout)

    def test_album_slot_rewrite_may_echo_empty_occupants_but_never_write_them(self):
        slots = lambda occ: [{"slot": "s001", "label": "1962", "year": 1962, "mint": "P", "variety": None, "key": False, "state": "filled",
                              "occupant_status": "inferred", "provenance": "inferred: test photo idx 1", "occupant": occ}]
        a15 = lambda occ: ev(entity="album", id="A014", field="slots", new=slots(occ), phase=1.5, source="test album photo idx 1, Whitman 9039")
        tmp = sandbox(); r = self.apply(tmp, write_events(tmp, "changes_ok.jsonl", [a15(None)]))
        self.assertEqual(r.returncode, 0, r.stdout)                                     # occupant stays null: not a Phase 2 write
        self.reject([a15("C001")], "slots.0.occupant' is a Phase 2 field")            # filling an occupant is Phase 2
        def seed(tmp):                                                                  # an occupant already recorded ...
            col = C.Collection(os.path.join(tmp, "collection")); col.album("A014")["slots"] = slots("C001"); col.save()
        self.reject([a15(None)], "slots.0.occupant' is a Phase 2 field", setup=seed)  # ... cannot be erased by Phase 1.5 either

    def test_album_scan_may_raise_counts_from_a_photo_but_never_lower_them(self):
        cur = BASE.album("A012")["slots_total"]
        cnt = lambda n, src="album page photo A012_idx076.jpeg, every hole counted", phase=1.5: ev(entity="album", id="A012", field="slots_total", new=n, phase=phase, source=src)
        tmp = sandbox(); r = self.apply(tmp, write_events(tmp, "changes_raise.jsonl", [cnt(cur + 1)]))
        self.assertEqual(r.returncode, 0, r.stdout)                                     # schema v4: a photo of the page may raise the hole count
        self.assertEqual(C.Collection(os.path.join(tmp, "collection")).album("A012")["slots_total"], cur + 1)
        self.reject([cnt(cur - 1)], "never lower it")                                   # ... but never lower it
        self.reject([cnt(cur + 1, src="counted the holes in the album")], "photo of the page")
        self.reject([cnt(cur + 1, phase=1)], "may not write it")                        # Phase 1 never touches album counts

    def test_placeholder_ids_and_two_coins_in_one_file(self):
        tmp = sandbox()
        spec = lambda n: ev(entity="specimen", id=f"NEW-{n}", op="create", field="(new record)", new={"type": "CH.KM.24a.1", "year_raw": "1969", "issue": {"year": 1969, "mint_marks": ["B"]}, "notes": f"coin {n}"})
        r = self.apply(tmp, write_events(tmp, "changes_two.jsonl", [spec(1), ev(ts="2026-10-03T10:00:01Z", entity="specimen", id="NEW-2", op="create", field="(new record)", new={"type": "CH.KM.24a.1", "year_raw": "1969", "issue": {"year": 1969, "mint_marks": ["B"]}, "notes": "coin 2"}),
                                                                ev(ts="2026-10-03T10:00:02Z", entity="specimen", id="NEW-2", field="notes", new="coin 2 edited")]))
        self.assertEqual(r.returncode, 0, r.stdout)
        specs = C.Collection(os.path.join(tmp, "collection")).specs
        self.assertEqual(specs[NEXT]["notes"], "coin 1"); self.assertEqual(specs[NEXT2]["notes"], "coin 2 edited")
        self.assertEqual(self.apply(tmp, os.path.join(tmp, "changes_two.jsonl")).returncode, 0)                      # idempotent even with placeholders
        self.assertEqual(len(C.Collection(os.path.join(tmp, "collection")).specs), len(BASE.specs) + 2)

    def test_wrong_typed_values_are_a_readable_rejection(self):
        for field, val in (("value.est_usd", "lots"), ("value.est_usd", -5), ("measured.weight_g", "heavy"), ("housing.kind", "shoebox")):
            tmp = sandbox(); f = write_events(tmp, "changes_bad.jsonl", [ev(entity="specimen", id="C001", field=field, new=val)])
            r = self.apply(tmp, f)
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertNotIn("Traceback", r.stderr); self.assertIn("line 1:", r.stdout); self.assertIn("fails schema validation", r.stdout)
        tmp = sandbox(); f = write_events(tmp, "changes_bad.jsonl", [ev(entity="specimen", id="C001", field="issue.mint_marks", new="D")])        # string where a list belongs
        r = self.apply(tmp, f); self.assertEqual(r.returncode, 1); self.assertNotIn("Traceback", r.stderr); self.assertIn("line 1:", r.stdout)
        tmp = sandbox(); f = write_events(tmp, "changes_bad.jsonl", [ev(entity="specimen", id="C001", op="create", field="(new record)", new={"type": "CH.KM.24a.1", "year_raw": 1969})])
        r = self.apply(tmp, f); self.assertEqual(r.returncode, 1); self.assertNotIn("Traceback", r.stderr)                                       # year_raw must be a string

    def test_junk_sources_rejected(self):
        for src in ("n/a", "unknown", "AI", "short", "None", "ai estimate", "   "):
            self.reject([ev(entity="specimen", id="C001", field="notes", new="x", source=src)], "source")
        tmp = sandbox()                                                                                                                         # a real source passes
        self.assertEqual(self.apply(tmp, write_events(tmp, "changes_ok.jsonl", [ev(entity="specimen", id="C001", field="notes", new="x", source="Numista N#1234")])).returncode, 0)

    def test_condition_judgement_needs_a_photo_or_reference(self):
        self.reject([ev(entity="specimen", id="C001", field="condition.grade", new="MS-70", phase=2, source="looks good to me")], "photo file")
        self.reject([ev(entity="specimen", id="C001", field="condition.grade", new="MS-70", phase=2, source="from the Phase 2 pro photos")], "photo file")
        self.reject([ev(entity="specimen", id="C001", field="condition.toning", new="even brown", phase=2, source="visual inspection")], "photo file")
        self.reject([ev(entity="specimen", id="C001", field="condition.grade", new="VF-20", phase=1, source="photo IMG_0412.jpg")], "Phase 1 never")
        self.reject([ev(entity="specimen", id="C001", field="condition", phase=2, source="seems fine to me",
                        new={"text": "x", "grade": "F", "grader": None, "cert": None, "strike": None, "luster": None, "toning": None, "cleaned": None, "damage": []})], "photo file")
        for src in ("pro photos C001_obv.jpg + C001_rev.jpg", "Numista N#1234 plus photo", "https://en.numista.com/1234"):
            tmp = sandbox()
            r = self.apply(tmp, write_events(tmp, "changes_ok.jsonl", [ev(entity="specimen", id="C001", field="condition.grade", new="VF-20", phase=2, source=src)]))
            self.assertEqual(r.returncode, 0, r.stdout)
        tmp = sandbox()                                                                                                                         # clearing a judgement needs no photo
        self.assertEqual(self.apply(tmp, write_events(tmp, "changes_ok.jsonl", [ev(entity="specimen", id="C001", field="condition.grade", new=None, source="owner asked to clear")])).returncode, 0)

    def test_no_private_paths_in_collection_or_docs(self):
        import re
        bad = re.compile(r"/home/\w+|/Users/\w+|C:\\Users|ghp_[A-Za-z0-9]{20}|github_pat_|[\w.]+@gmail\.com")
        hits = []
        for top in ("collection", "docs"):
            for root, dirs, files in os.walk(os.path.join(ROOT, top)):
                dirs[:] = [d for d in dirs if d != "_incoming"]
                for f in files:
                    if f.endswith((".json", ".jsonl", ".md", ".txt")):
                        for n, ln in enumerate(open(os.path.join(root, f), encoding="utf-8", errors="replace"), 1):
                            if bad.search(ln): hits.append(f"{os.path.relpath(os.path.join(root, f), ROOT)}:{n}")
        self.assertEqual(hits, [])

    def test_field_reference_is_current(self):
        r = run(os.path.join(HERE, "field_reference.py"), "--check")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_album_slot_event_and_dry_run(self):
        tmp = sandbox(); a = C.Collection(os.path.join(tmp, "collection")).album("A026")
        e = ev(entity="album", id="A026", field="slots.0.state", new="filled", phase=1.5, source="album scan A026_p01_20261010.jpg")
        r = run(os.path.join(HERE, "apply_changes.py"), "--collection", os.path.join(tmp, "collection"), "--dry-run", write_events(tmp, "changes_album.jsonl", [e]))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr); self.assertIn("dry run", r.stdout)
        self.assertEqual(C.Collection(os.path.join(tmp, "collection")).album("A026")["slots"][0]["state"], a["slots"][0]["state"])   # a dry run writes nothing
        bad = ev(entity="album", id="A026", field="slots.0.state", new="full", phase=1.5, source="album scan A026_p01_20261010.jpg")
        r = run(os.path.join(HERE, "apply_changes.py"), "--collection", os.path.join(tmp, "collection"), write_events(tmp, "changes_album_bad.jsonl", [bad]))
        self.assertEqual(r.returncode, 1); self.assertIn("fails schema validation", r.stdout)

    def test_wants_json_matches_album_calc_and_is_generated(self):
        sys.path.insert(0, os.path.join(ROOT, "tools", "albums"))
        import album_calc, build_wants
        albums = json.load(open(os.path.join(ROOT, "collection", "albums.json"), encoding="utf-8"))
        w = json.load(open(os.path.join(ROOT, "data", "wants.json"), encoding="utf-8"))
        self.assertEqual({v["id"] for v in w["volumes"]}, {a["id"] for a in albums})
        for a in albums:                                  # every number equals album_calc's
            c = album_calc.summary(a); v = next(x for x in w["volumes"] if x["id"] == a["id"])
            self.assertEqual((v["slots_total"], v["filled"], v["missing"]), (c["total"], c["filled_claimed"], c["missing"]), a["id"])
            self.assertEqual([x["label"] for x in v["missing_named"]], c["missing_named"], a["id"])
            if a["evidence"] == "count-only": self.assertEqual(v["missing_named"], [], a["id"])
            self.assertFalse(any(x["state"] != "empty" for x in v["missing_named"]), a["id"])   # an unknown/inferred slot is never listed as missing
        a26 = next(v for v in w["volumes"] if v["id"] == "A026")
        self.assertEqual(a26["missing"], 18); self.assertEqual(len(a26["missing_named"]), 18)
        self.assertEqual([x["year"] for x in a26["missing_named"]], [1988, 1989, 1990, 1991, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2003, 2004, 2009, 2010, 2011, 2012])
        self.assertTrue(all(x["state"] == "filled" for x in a26["have_named"]))
        # no hand edits: the committed file is exactly what the master builds (generated_at is the publish stamp, so compare the rest)
        fresh = build_wants.build(albums, w["generated_at"])
        self.assertEqual(json.dumps(fresh, ensure_ascii=False, separators=(",", ":")), open(os.path.join(ROOT, "data", "wants.json"), encoding="utf-8").read())

    def test_publish_writes_wants_json(self):
        tmp = sandbox(); os.remove(os.path.join(tmp, "data", "wants.json")) if os.path.exists(os.path.join(tmp, "data", "wants.json")) else None
        r = self.publish(tmp); self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(json.load(open(os.path.join(tmp, "data", "wants.json")))["generated_at"], json.load(open(os.path.join(tmp, "version.json")))["generated_at"])

    def test_phase2_photo_supersedes_the_phase1_photo(self):
        tmp = sandbox()
        p1 = next(p for p in BASE.photos if p["phase"] == 1 and p["kind"] == "crop_circle" and p["side"] == "obv")
        cid = p1["specimen"]; pid = f"{cid}-obv-p2"
        new = {"specimen": cid, "side": "obv", "phase": 2, "kind": "crop_circle", "path": f"photos/p2/{cid}_obv.webp", "sha256": "ab" * 32, "width": 1200, "height": 1200, "captured_at": None,
               "review": {"status": "approved", "reason": "test"}}
        mk = lambda **kw: ev(by="script:photo_crop_p2", entity="photo", **kw)
        create = mk(id=pid, op="create", field="(new record)", new=new)
        sup = lambda a, b: mk(id=a, op="set", field="superseded_by", new=b)
        self.reject([sup(p1["id"], "NOPE-obv-p2")], "not a photo record", setup=None)
        r = self.apply(tmp, write_events(tmp, "changes_script_x.jsonl", [create, sup(p1["id"], pid)]))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        photos = {p["id"]: p for p in C.Collection(os.path.join(tmp, "collection")).photos}
        self.assertEqual(photos[p1["id"]]["superseded_by"], pid)
        r = self.publish(tmp); self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        iso = next(s for s in BASE.specs.values() if s["id"] == cid)["type"].split(".")[0]
        det = json.load(open(os.path.join(tmp, "data", "detail", iso + ".json"), encoding="utf-8"))[cid]
        obv = [p for p in det["photos"] if p["role"] == "obv"]
        self.assertEqual([p["id"] for p in obv], [pid]); self.assertEqual(obv[0]["phase"], 2)

    def test_photo_edits_other_than_superseded_by_are_rejected(self):
        p1 = next(p for p in BASE.photos if p["phase"] == 1)
        self.reject([ev(by="script:photo_crop_p2", entity="photo", id=p1["id"], op="set", field="path", new="photos/x.webp")], "superseded_by", setup=None)

    def test_publish_refuses_a_broken_collection(self):
        tmp = sandbox()
        p = os.path.join(tmp, "collection", "specimens", "CH.json"); s = open(p, encoding="utf-8").read()
        open(p, "w", encoding="utf-8").write(s.replace('"type":"CH.KM.24a.1"', '"type":"CH.KM.NOPE"', 1))              # dangling type reference
        data_before = tree_hash(os.path.join(tmp, "data")); ver_before = open(os.path.join(tmp, "version.json")).read()
        r = self.publish(tmp)
        self.assertEqual(r.returncode, 1); self.assertIn("PUBLISH REFUSED", r.stderr)
        self.assertEqual(data_before, tree_hash(os.path.join(tmp, "data"))); self.assertEqual(ver_before, open(os.path.join(tmp, "version.json")).read())

if __name__ == "__main__":
    unittest.main(verbosity=2, warnings="ignore")
