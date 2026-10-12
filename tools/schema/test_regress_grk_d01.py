#!/usr/bin/env python3
"""GRK-D-01 regression: a key written twice in one collection JSON object must fail validation (json.load keeps only the last copy).
python3 tools/schema/test_regress_grk_d01.py   (needs jsonschema; copies collection/ to a temp folder, never touches the real one)"""
import warnings; warnings.simplefilter("ignore")
import contextlib, io, json, os, shutil, sys, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import validate as V

def run(d):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): rc = V.main(d, update_manifest=True)     # what publish.py does: refresh the manifest, then validate
    return rc, buf.getvalue()

class DuplicateKeys(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="grk-d01-"); self.d = os.path.join(self.tmp, "collection")
        shutil.copytree(os.path.join(ROOT, "collection"), self.d, ignore=shutil.ignore_patterns("_incoming"))
    def tearDown(self): shutil.rmtree(self.tmp, True)

    def test_clean_copy_is_clean(self):
        rc, out = run(self.d)
        self.assertEqual(rc, 0, out[-400:])

    def test_duplicate_specimen_key_is_reported(self):
        p = os.path.join(self.d, "specimens", "CH.json")
        s = open(p, encoding="utf-8").read(); recs = json.loads(s); k = sorted(recs)[0]
        alt = dict(recs[k], notes="a second copy of the same record")
        open(p, "w", encoding="utf-8").write(s.replace("{", "{\n  " + json.dumps(k) + ": " + json.dumps(alt, ensure_ascii=False) + ",", 1))
        rc, out = run(self.d)
        self.assertEqual(rc, 1, "a duplicated specimen key validated CLEAN")
        self.assertIn(f"key {k!r} appears twice", out)

if __name__ == "__main__":
    unittest.main(verbosity=2)
