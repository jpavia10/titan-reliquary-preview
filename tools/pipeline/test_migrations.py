#!/usr/bin/env python3
"""Schema upgrade tests: every data-format upgrade keeps every fact (python3 tools/pipeline/test_migrations.py). Needs jsonschema.

The upgrades that exist as code:
  v1 -> v2   tools/schema/migrate_v1_to_v2.py   ledger export (index.json + detail/*.json + version.json) -> collection/ master
  v2 -> v3   tools/schema/migrate_v2_to_v3.py   in place: adds nullable fields + research block, changes no value
  v3 -> v4   no script and no data change: "schema v4" (2026-10-02) only moved fields between phase tiers (schema/v3/field_tiers.json)
             and added enum values, so there is nothing to migrate; the live collection validating against the current schema is its test
             (test_pipeline.py also holds test_roundtrip_is_byte_identical for the live collection: load -> save -> same bytes).

Fixture (tools/pipeline/fixtures/migrations/): v1_ledger/ is a tiny ledger export (3 coins from 2 countries, 1 bullion lot, plus the album
seed that the migration always adds), expected/v2 and expected/v3 are the frozen outputs. Re-freeze after an INTENDED change to a migration:
    python3 tools/pipeline/test_migrations.py --refreeze
The curation tables (tools/schema/curation.py) are keyed by the real ledger's ids, so the tests empty them; what is tested is the parsing and
writing of facts, not the owner's curation decisions (those live in collection/changes.jsonl).
"""
import warnings; warnings.simplefilter("ignore")
import contextlib, copy, glob, io, json, os, shutil, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
FIX = os.path.join(HERE, "fixtures", "migrations"); V1 = os.path.join(FIX, "v1_ledger"); EXP = os.path.join(FIX, "expected")
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "schema"))
import collection_io as C
import curation as cur
import migrate_v1_to_v2 as M1

FROZEN = ("types", "specimens", "lots.json", "ref/issuers.json", "valuations.jsonl")     # the facts; boot.json / manifest.json / changes.jsonl carry build metadata
TABLES = ("CONFLICTS", "DENOMS", "SERIALS", "TENDER")

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()

def jl(p): return [json.loads(l) for l in read(p).splitlines() if l.strip()]

def jload(p): return json.loads(read(p))

def collection_records(d):
    """{'specimens': {id: rec}, 'types': {id: rec}} of a collection folder."""
    out = {"specimens": {}, "types": {}}
    for kind in out:
        for p in sorted(glob.glob(os.path.join(d, kind, "*.json"))): out[kind].update(jload(p))
    return out

def run_v1_to_v2(out):
    """The real migration, with the id-keyed curation tables emptied and the board reconciliation (needs the full ledger) stubbed."""
    saved = {n: getattr(cur, n) for n in TABLES}; saved_ct = M1.check_totals.run
    try:
        for n in TABLES: setattr(cur, n, {})
        M1.check_totals.run = lambda src, o: ([], [])
        with contextlib.redirect_stdout(io.StringIO()): M1.main(V1, out)
    finally:
        for n, v in saved.items(): setattr(cur, n, v)
        M1.check_totals.run = saved_ct

def run_v2_to_v3(d):
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "schema", "migrate_v2_to_v3.py"), d], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr

def validate(d):
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "schema", "validate.py"), d], capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr

def tree(d, rels):
    out = {}
    for rel in rels:
        p = os.path.join(d, rel)
        if os.path.isdir(p):
            for f in sorted(os.listdir(p)): out[f"{rel}/{f}"] = read(os.path.join(p, f))
        elif os.path.exists(p): out[rel] = read(p)
    return out

def subset(a, b, path=""):
    """Every fact of a is in b (dict keys recursively; lists and scalars must be equal). -> list of differences."""
    if isinstance(a, dict):
        if not isinstance(b, dict): return [f"{path}: not an object any more"]
        return [d for k in a for d in (subset(a[k], b[k], f"{path}.{k}") if k in b else [f"{path}.{k}: missing"])]
    return [] if a == b else [f"{path}: {a!r} became {b!r}"]

# one run per test class: the migration is deterministic, so every test reads the same build
_BUILT = {}
def built():
    if not _BUILT:
        tmp = tempfile.mkdtemp(prefix="migr-"); v2 = os.path.join(tmp, "v2"); run_v1_to_v2(v2)
        v3 = os.path.join(tmp, "v3"); shutil.copytree(v2, v3); run_v2_to_v3(v3)
        _BUILT.update(tmp=tmp, v2=v2, v3=v3)
    return _BUILT

def refreeze():
    b = built()
    for ver in ("v2", "v3"):
        dest = os.path.join(EXP, ver); shutil.rmtree(dest, ignore_errors=True)
        for rel, text in tree(b[ver], FROZEN if ver == "v2" else ("types", "specimens")).items():
            os.makedirs(os.path.dirname(os.path.join(dest, rel)), exist_ok=True)
            with open(os.path.join(dest, rel), "w", encoding="utf-8", newline="\n") as f: f.write(text)
    print("re-frozen", EXP)


class MigrationFacts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = built(); cls.idx = jload(os.path.join(V1, "data", "index.json"))
        cls.det = {}
        for p in glob.glob(os.path.join(V1, "data", "detail", "*.json")): cls.det.update(jload(p))
        cls.v2 = collection_records(cls.b["v2"]); cls.v3 = collection_records(cls.b["v3"])

    # ---- frozen output: any change to what a migration writes is deliberate
    def test_v2_output_matches_the_frozen_expectation(self):
        self.assertEqual(tree(self.b["v2"], FROZEN), tree(os.path.join(EXP, "v2"), FROZEN), "v1->v2 output changed; if intended run --refreeze and review the diff")

    def test_v3_output_matches_the_frozen_expectation(self):
        self.assertEqual(tree(self.b["v3"], ("types", "specimens")), tree(os.path.join(EXP, "v3"), ("types", "specimens")), "v2->v3 output changed; if intended run --refreeze and review the diff")

    # ---- v1 -> v2: every input fact survives
    def test_every_coin_survives_with_its_facts(self):
        self.assertEqual(sorted(self.v2["specimens"]), sorted(f["scan"] for f in self.idx["flips"]))
        for f in self.idx["flips"]:
            s = self.v2["specimens"][f["scan"]]; d = self.det[f["scan"]]; t = self.v2["types"][s["type"]]
            self.assertEqual(s["ser"], f["ser"]); self.assertEqual(s["year_raw"], str(f["year"]))
            self.assertEqual(s["issue"]["year"], int(f["year"]), f["scan"])
            self.assertEqual(s["value"]["est_usd"], f["est"]); self.assertEqual(s["value"]["confidence"], f["conf"])
            self.assertEqual(s["acquisition"]["logged_at"], f["added"]); self.assertEqual(s["lifecycle"]["status"], f["status"])
            self.assertEqual(s["notes"].split("\n")[0], d["notes"].split("\n")[0].rstrip())
            self.assertEqual(s["housing"]["text"], d["parked"])
            self.assertIn(f["iso"], s["type"].split(".")[0]); self.assertEqual(t["country"], f["iso"])
            self.assertEqual(t["design"]["text"], d["design"])
            first = f["denom"].split()[0].replace(",", "")
            if first.replace(".", "", 1).isdigit(): self.assertEqual(t["denomination"]["value"], float(first), f["scan"])
            if f.get("mint"): self.assertIn(f["mint"], "".join(s["issue"]["mint_marks"]) + (s["issue"]["mint_text"] or ""), f["scan"])

    def test_every_lot_survives_with_its_facts(self):
        lots = {l["id"]: l for l in jload(os.path.join(self.b["v2"], "lots.json"))}
        want = [r for k in ("bullion", "sets", "housing", "stamps") for r in self.idx.get(k, [])]
        self.assertEqual(sorted(lots), sorted(r["scan"] for r in want))
        for r in want:
            l = lots[r["scan"]]
            for a, b in (("est_usd", "est"), ("qty", "qty_n"), ("year_raw", "year"), ("denom_text", "denom"), ("storage_text", "parked"), ("notes", "notes"), ("logged_at", "added"), ("melt_usd", "melt")):
                self.assertEqual(l[a], r.get(b), f"{r['scan']} {a}")
        vals = {v["id"]: v for v in jl(os.path.join(self.b["v2"], "valuations.jsonl"))}
        for f in self.idx["flips"] + want: self.assertEqual(vals[f["scan"]]["est_usd"], f["est"], f["scan"])

    def test_every_album_slot_survives(self):
        seed = jload(os.path.join(ROOT, "schema", "seed", "albums.seed.json"))["volumes"]
        albums = {a["id"]: a for a in jload(os.path.join(self.b["v2"], "albums.json"))}
        self.assertEqual(sorted(albums), sorted(v["id"] for v in seed))
        for v in seed:
            a = albums[v["id"]]
            self.assertEqual((a["title"], a["slots_total"], a["slots_filled_claimed"], a["evidence"]), (v["title"], v["slots_total"], v["filled_count"], v["evidence"]), v["id"])

    def test_migration_refuses_to_overwrite_a_live_master(self):
        with self.assertRaises(SystemExit): M1.main(V1, self.b["v2"])

    # ---- v2 -> v3: nothing is lost, only nullable fields are added
    def test_v3_keeps_every_v2_fact(self):
        for kind in ("specimens", "types"):
            self.assertEqual(sorted(self.v2[kind]), sorted(self.v3[kind]))
            for k, rec in self.v2[kind].items(): self.assertEqual(subset(rec, self.v3[kind][k], k), [])
        for rel in ("lots.json", "ref/issuers.json", "valuations.jsonl", "albums.json"):
            self.assertEqual(read(os.path.join(self.b["v2"], rel)), read(os.path.join(self.b["v3"], rel)), rel)

    def test_v3_adds_only_empty_new_fields(self):
        for s in self.v3["specimens"].values():
            self.assertEqual(s["research"], {"phase": 0, "phase1_at": None, "phase1_by": None, "phase2_at": None, "phase2_by": None, "open_questions": []})
            self.assertIsNone(s["variety"]); self.assertIsNone(s["measured"]["die_axis_deg"])
        for t in self.v3["types"].values(): self.assertEqual([t[k] for k in ("period", "ruler", "commemorates")], [None, None, None])

    def test_v2_to_v3_is_idempotent(self):
        tmp = tempfile.mkdtemp(prefix="migr2-"); d = os.path.join(tmp, "c"); shutil.copytree(self.b["v3"], d)
        before = tree(d, ("types", "specimens", "lots.json", "albums.json")); run_v2_to_v3(d)
        self.assertEqual(before, tree(d, ("types", "specimens", "lots.json", "albums.json")))

    def test_migrated_collection_validates_and_roundtrips(self):
        rc, out = validate(self.b["v3"]); self.assertEqual(rc, 0, out); self.assertIn("CLEAN", out)
        tmp = tempfile.mkdtemp(prefix="migr3-"); d = os.path.join(tmp, "c"); shutil.copytree(self.b["v3"], d)
        before = tree(d, ("types", "specimens", "lots.json", "albums.json", "photos.json", "valuations.jsonl", "changes.jsonl", "boot.json"))
        C.Collection(d).save()
        self.assertEqual(before, tree(d, tuple(before.keys())))

    # ---- the live collection, current schema
    def test_live_collection_validates(self):
        rc, out = validate(os.path.join(ROOT, "collection")); self.assertEqual(rc, 0, out)


if __name__ == "__main__":
    if "--refreeze" in sys.argv: refreeze(); sys.exit(0)
    unittest.main(verbosity=2, warnings="ignore")
