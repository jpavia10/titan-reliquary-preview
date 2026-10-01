#!/usr/bin/env python3
"""Offline tests for tools/prices/fetch_prices.py (python3 tools/prices/test_fetch_prices.py). No network: fixtures + an injected fetch()."""
import warnings; warnings.simplefilter('ignore')
import datetime, json, os, shutil, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); FX = os.path.join(HERE, "fixtures")
sys.path.insert(0, HERE)
import fetch_prices as F

def fx(name): return open(os.path.join(FX, name), encoding="utf-8").read()

def fake(overrides=None, down=()):
    """fetch(url) serving the fixtures; `down` = substrings of urls that fail; `overrides` = {substring: text}."""
    def f(url):
        if any(x in url for x in down): raise OSError("blocked in test")
        for k, v in (overrides or {}).items():
            if k in url: return v
        if "stooq" in url: return fx("sample_stooq_xagusd.csv" if "xagusd" in url else "sample_stooq_xauusd.csv")
        if "SI=F" in url: return fx("sample_yahoo_SI=F.json")
        if "GC=F" in url: return fx("sample_yahoo_GC=F.json")
        if "gold-api" in url: return fx("sample_goldapi_XAG.json" if url.endswith("XAG") else "sample_goldapi_XAU.json")
        raise AssertionError(url)
    return f

NOW = datetime.datetime(2026, 9, 30, 22, 15, tzinfo=datetime.timezone.utc)

class Parsers(unittest.TestCase):
    def test_stooq(self):
        r = F.parse_stooq(fx("sample_stooq_xagusd.csv"))
        self.assertEqual(len(r), 13); self.assertIn("2026-09-11", r); self.assertNotIn("2026-09-12", r)   # Saturday: no row
        self.assertTrue(all(5 < v < 500 for v in r.values()))
        self.assertEqual(F.parse_stooq("Date,Open,High,Low,Close,Volume\n2026-09-11,1,1,1,0,0\nbad,1,1,1,5,0\n2026-09-14,1,1,1,nan,0\n"), {})   # 0 / bad date / NaN skipped
        self.assertEqual(F.parse_stooq("No data"), {})

    def test_yahoo(self):
        r = F.parse_yahoo(fx("sample_yahoo_SI=F.json"))
        self.assertEqual(len(r), 12)                                   # 13 bars, one null close skipped
        self.assertNotIn("2026-09-16", r)                              # the null bar
        self.assertIn("2026-09-11", r)                                 # 13:30Z + (-4h) = same local day
        with self.assertRaises(ValueError): F.parse_yahoo(json.dumps({"chart": {"result": None, "error": {"code": "Not Found"}}}))

    def test_goldapi(self):
        p, at = F.parse_goldapi(fx("sample_goldapi_XAG.json"))
        self.assertEqual((p, at), (59.8125, "2026-09-30T22:14:50Z"))
        with self.assertRaises(ValueError): F.parse_goldapi('{"price": 0}')
        with self.assertRaises(ValueError): F.parse_goldapi('{"price": "NaN"}')
        self.assertIsNone(F.parse_goldapi('{"price": 5, "updatedAt": "garbage"}')[1])

    def test_ranges(self):
        self.assertTrue(F.valid("xag_usd", 60)); self.assertFalse(F.valid("xag_usd", 0)); self.assertFalse(F.valid("xag_usd", float("nan")))
        self.assertFalse(F.valid("xau_usd", 41.5)); self.assertFalse(F.valid("xag_usd", None))

class Run(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix="prices-test-"); self.log = []
    def tearDown(self): shutil.rmtree(self.d, ignore_errors=True)
    def run_(self, **kw):
        kw.setdefault("since", "2026-09-11"); kw.setdefault("now", NOW); kw.setdefault("today", "2026-09-30")
        kw.setdefault("fetch", fake()); kw.setdefault("log", self.log.append)
        return F.run(self.d, **kw)
    def rows(self): return F.read_rows(os.path.join(self.d, "prices", "spot_daily.jsonl"))

    def test_backfill_from_day0_with_carry_and_today(self):
        rep = self.run_(); rows = self.rows()
        self.assertEqual(sorted(rows), list(F.drange("2026-09-11", "2026-09-30")))          # no missing date, day 0 .. today
        self.assertTrue(rows["2026-09-12"]["carried"]); self.assertEqual(rows["2026-09-12"]["xag_usd"], rows["2026-09-11"]["xag_usd"])
        self.assertIn("carried from 2026-09-11", rows["2026-09-12"]["source"])
        self.assertTrue(rows["2026-09-27"]["carried"])
        self.assertIn("stooq", rows["2026-09-15"]["source"]); self.assertNotIn("carried", rows["2026-09-15"])
        self.assertTrue(rows["2026-09-30"]["provisional"]); self.assertEqual(rows["2026-09-30"]["xag_usd"], 59.8125)
        latest = json.load(open(os.path.join(self.d, "prices", "latest.json")))
        self.assertEqual((latest["xag_usd"], latest["xau_usd"], latest["at"]), (59.8125, 4155.2, "2026-09-30T22:14:50Z"))
        self.assertEqual(rep["rejected"], [])

    def test_rerun_is_a_noop_and_never_overwrites(self):
        self.run_(); before = open(os.path.join(self.d, "prices", "spot_daily.jsonl")).read()
        rep = self.run_(now=NOW + datetime.timedelta(hours=1), fetch=fake({"xagusd": fx("sample_stooq_xagusd.csv").replace("2026-09-15,", "2026-09-15,9").replace(",0\n2026-09-15", ",0\n2026-09-15")}))
        self.assertEqual(rep["added"], []); self.assertEqual([d for d in rep["replaced"] if d != "2026-09-30"], [])
        after = open(os.path.join(self.d, "prices", "spot_daily.jsonl")).read()
        a = {json.loads(l)["date"]: json.loads(l) for l in before.splitlines()}; b = {json.loads(l)["date"]: json.loads(l) for l in after.splitlines()}
        for dte in a:
            if dte != "2026-09-30": self.assertEqual(a[dte], b[dte], dte)               # only today's provisional line may be refreshed

    def test_refresh_overwrites_but_ledger_rows_are_protected(self):
        os.makedirs(os.path.join(self.d, "prices"))
        F.write_rows(os.path.join(self.d, "prices", "spot_daily.jsonl"), {
            "2026-09-14": {"date": "2026-09-14", "xag_usd": 50.0, "xau_usd": 4000.0, "source": "stooq old value (test)", "fetched_at": "2026-09-15T00:00:00Z"},
            "2026-09-15": {"date": "2026-09-15", "xag_usd": 50.5, "xau_usd": 4001.0, "source": "gold-api.com quote 2026-09-30 15:12Z via ledger v254 (board.json metals.spot)", "fetched_at": "2026-09-30T15:12:17Z"}})
        self.run_(since="2026-09-14"); r = self.rows()
        self.assertEqual(r["2026-09-14"]["xag_usd"], 50.0); self.assertEqual(r["2026-09-15"]["xag_usd"], 50.5)       # existing lines untouched without --refresh
        self.run_(since="2026-09-14", refresh=True); r = self.rows()
        self.assertNotEqual(r["2026-09-14"]["xag_usd"], 50.0); self.assertEqual(r["2026-09-15"]["xag_usd"], 50.5)    # refreshed / protected

    def test_fallback_to_yahoo_labels_futures(self):
        self.run_(fetch=fake(down=("stooq",))); r = self.rows()
        self.assertIn("futures", r["2026-09-15"]["source"]); self.assertIn("SI=F", r["2026-09-15"]["source"])
        self.assertTrue(r["2026-09-16"]["carried"])                                      # the null Yahoo bar: carried, not invented
        self.assertTrue(any("stooq FAILED" in x for x in self.log))

    def test_both_history_sources_down_still_writes_today_only(self):
        rep = self.run_(fetch=fake(down=("stooq", "yahoo")), since="2026-09-29", today="2026-09-30"); r = self.rows()
        self.assertEqual(sorted(r), ["2026-09-30"])                                       # nothing carried before/after: no invented history
        self.assertTrue(any("yahoo FAILED" in x for x in self.log))

    def test_jump_over_15_percent_is_rejected_and_logged(self):
        lines = fx("sample_stooq_xagusd.csv").splitlines()
        i = next(n for n, l in enumerate(lines) if l.startswith("2026-09-17"))
        cols = lines[i].split(","); cols[4] = str(float(cols[4]) * 1.5); lines[i] = ",".join(cols)
        rep = self.run_(fetch=fake({"xagusd": "\n".join(lines)})); r = self.rows()
        self.assertEqual([d for d, _ in rep["rejected"]], ["2026-09-17"])
        self.assertNotIn("2026-09-17", r)                                                # rejected date: left missing (never taken from the source, never faked); the value builder carries the last good price over it
        self.assertTrue(any("REJECTED 2026-09-17" in x for x in self.log))
        self.run_(fetch=fake({"xagusd": "\n".join(lines)}), refresh=True, accept_jumps=True)
        self.assertNotIn("carried", self.rows()["2026-09-17"])                           # --accept-jumps after a human looked

    def test_zero_and_implausible_rejected(self):
        bad = fx("sample_stooq_xauusd.csv").replace("2026-09-18,", "2026-09-18,1,1,1,0,0\n#,", 1)
        lines = [l for l in fx("sample_stooq_xauusd.csv").splitlines()]
        i = next(n for n, l in enumerate(lines) if l.startswith("2026-09-22")); cols = lines[i].split(","); cols[4] = "41.5"; lines[i] = ",".join(cols)
        rep = self.run_(fetch=fake({"xauusd": "\n".join(lines)}))
        self.assertIn("2026-09-22", [d for d, _ in rep["rejected"]])
        live = self.run_(fetch=fake({"gold-api": '{"price":0,"symbol":"XAG"}'}), since="2026-09-29")
        self.assertTrue(any("gold-api" in x and "FAILED" in x for x in self.log))

    def test_day0_is_earliest_logged_at(self):
        os.makedirs(os.path.join(self.d, "specimens"))
        json.dump({"C001": {"acquisition": {"logged_at": "2026-09-15"}}, "C002": {"acquisition": {"logged_at": "2026-09-11"}}}, open(os.path.join(self.d, "specimens", "US.json"), "w"))
        json.dump([{"id": "B001", "logged_at": "2026-09-12"}, {"id": "H001", "logged_at": None}], open(os.path.join(self.d, "lots.json"), "w"))
        self.assertEqual(F.day0(self.d), "2026-09-11")
        rep = self.run_(since=None); self.assertEqual(min(self.rows()), "2026-09-11")

    def test_yahoo_range_choice(self):
        self.assertEqual(F.yahoo_range(3), "5d"); self.assertEqual(F.yahoo_range(20), "1mo"); self.assertEqual(F.yahoo_range(80), "3mo"); self.assertEqual(F.yahoo_range(4000), "10y")

if __name__ == "__main__":
    unittest.main(verbosity=1, warnings="ignore")
