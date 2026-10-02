#!/usr/bin/env python3
"""Tests for the portfolio value model (python3 tools/pipeline/test_value_history.py). Works on the real collection/, in memory; spot rows here are
SYNTHETIC test data (never written anywhere)."""
import warnings; warnings.simplefilter("ignore")
import copy, os, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import build_app_data as B
import value_history as V

COL = B.load_collection(os.path.join(ROOT, "collection"))
BQ = V.board_quote(COL)

def flat(a, b, ag=BQ["xag_usd"], au=BQ["xau_usd"]):
    return {d: {"date": d, "xag_usd": ag, "xau_usd": au, "source": "synthetic test row", "fetched_at": "2026-10-01T00:00:00Z"} for d in V.drange(a, b)}

class ValueModel(unittest.TestCase):
    def test_board_date_calibration_within_a_dollar(self):
        v = V.model_at(COL, BQ["date"], BQ["xag_usd"], BQ["xau_usd"])
        self.assertAlmostEqual(v, 5393.70, delta=1.0)
        pf = V.portfolio(COL, flat("2026-09-11", "2026-10-02"))
        row = next(r for r in pf["rows"] if r[0] == BQ["date"])
        self.assertAlmostEqual(row[1], BQ["total_usd"], delta=1.0)
        # melt split matches the board's own melt lines
        self.assertAlmostEqual(row[2], 3833.28, delta=1.0); self.assertAlmostEqual(row[3], 550.15, delta=1.0)

    def test_monotone_step_at_logged_dates_when_prices_are_flat(self):
        pf = V.portfolio(COL, flat("2026-09-11", "2026-10-02")); rows = pf["rows"]
        self.assertEqual(rows[0][0], "2026-09-11"); self.assertEqual(rows[-1][0], "2026-10-02")
        tot = [r[1] for r in rows]
        self.assertTrue(all(b >= a - 0.005 for a, b in zip(tot, tot[1:])), "flat prices: the series never falls")
        for prev, cur in zip(rows, rows[1:]):
            if cur[6] == 0: self.assertAlmostEqual(cur[1], prev[1], delta=0.005, msg=cur[0])      # no item added: no step
            else: self.assertGreaterEqual(cur[1], prev[1] - 0.005)                                 # items added: a step up (or flat for a Phase 1 coin with no estimate yet)
        self.assertEqual([m["d"] for m in pf["markers"]][:9], ["2026-09-11", "2026-09-12", "2026-09-13", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-22", "2026-09-24"])   # the v254 ledger days (later coins add more)
        self.assertEqual(pf["markers"][0]["n"], 75)
        first = rows[0]; self.assertGreater(first[1], 1000)                                         # albums + residual are there from day 0
        self.assertEqual(rows[-1][5], sum(1 for i in V.items(COL) if i["kind"] != "album"))      # every specimen + lot present at the end
        fx = [r[8] for r in rows]; self.assertTrue(all(b >= a - 0.005 for a, b in zip(fx, fx[1:])), "the fixed-price growth line never falls")

    def test_undated_albums_are_counted_from_day_0(self):
        pf = V.portfolio(COL, flat("2026-09-11", "2026-09-12"))
        self.assertEqual(pf["undated_albums"], 33)
        self.assertIn("undated", pf["caption"]); self.assertIn("albums, sets, housing (ledger)", pf["caption"])
        # silver in albums (24 oz) is in the day-0 melt
        self.assertGreater(pf["rows"][0][2], 24 * BQ["xag_usd"])

    def test_metal_moves_with_spot_premium_does_not(self):
        lo = V.portfolio(COL, flat("2026-09-29", "2026-09-30", ag=50.0, au=4000.0))["rows"][-1]
        hi = V.portfolio(COL, flat("2026-09-29", "2026-09-30", ag=60.0, au=4000.0))["rows"][-1]
        self.assertAlmostEqual(hi[4], lo[4], delta=0.005)                                           # premium bucket identical
        oz = 63.27; self.assertAlmostEqual(hi[2] - lo[2], 10 * oz, delta=0.5)                       # silver melt moves by $10 x board ounces

    def test_removed_specimen_stops_counting_after_its_date(self):
        col = copy.deepcopy(COL); sid = "C001"
        col["specs"][sid]["lifecycle"]["removed_on"] = "2026-09-20"
        its = V.items(col); i = next(x for x in its if x["id"] == sid)
        self.assertTrue(V.present(i, "2026-09-20", "2026-09-11")); self.assertFalse(V.present(i, "2026-09-21", "2026-09-11"))
        pf = V.portfolio(col, flat("2026-09-19", "2026-09-22"))
        self.assertEqual(pf["rows"][1][5] - pf["rows"][2][5], 1)                                    # n drops by one on the 21st

    def test_item_added_later_appears_only_from_its_date(self):
        col = copy.deepcopy(COL)
        spec = col["specs"]["C001"]; spec = copy.deepcopy(spec); spec["id"] = "C999"; spec["acquisition"]["logged_at"] = "2026-10-03"; spec["value"]["est_usd"] = 12.5
        col["specs"]["C999"] = spec
        pf = V.portfolio(col, flat("2026-09-29", "2026-10-05"), today="2026-10-05"); rows = {r[0]: r for r in pf["rows"]}
        self.assertEqual(rows["2026-10-03"][5], rows["2026-10-02"][5] + 1)
        self.assertAlmostEqual(rows["2026-10-03"][1] - rows["2026-10-02"][1], 12.5, delta=0.005)
        self.assertEqual(rows["2026-10-03"][6], 1); self.assertEqual(rows["2026-10-02"][6], sum(1 for i in V.items(COL) if i["start"] == "2026-10-02" and i["kind"] != "album"))   # only the real coins logged that day

    def test_series_extends_to_today_with_the_last_price_marked_carried(self):
        pf = V.portfolio(COL, flat("2026-09-29", "2026-09-30"), today="2026-10-02")
        self.assertEqual(pf["rows"][-1][0], "2026-10-02"); self.assertEqual(pf["rows"][-1][7], "c"); self.assertEqual(pf["last_price_date"], "2026-09-30")

    def test_no_prices_means_an_honest_empty_series(self):
        pf = V.portfolio(COL, {}); self.assertEqual(pf["rows"], []); self.assertIsNone(pf["priced_from"])

    def test_calibration_numbers_are_stable(self):
        c = V.calibration(COL)
        self.assertEqual(c["unitemised_au_oz"], 0.0); self.assertAlmostEqual(c["unitemised_ag_oz"], 1.4997, places=3)
        self.assertGreater(c["residual_usd"], 0); self.assertLess(c["residual_usd"], 1000)

if __name__ == "__main__":
    unittest.main(verbosity=1, warnings="ignore")
