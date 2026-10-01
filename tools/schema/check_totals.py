#!/usr/bin/env python3
"""Reconcile collection/ with the ledger export it was built from.

usage (repo root):  python3 tools/schema/check_totals.py SRC COLLECTION_DIR
    SRC = the pipeline's data/ folder (or the repo root containing it).   Exit 0 = every hard check passes.

HARD checks (must match exactly / within rounding; a failure means the master lost or invented something):
  * every ledger flip and lot id appears exactly once in collection/, and collection/ holds no id the ledger does not have
    (catches any record the ledger does not have)
  * counts per kind, per-record est_usd, sum of est_usd per kind (records vs the ledger's own record lists)
  * silver / gold troy oz for flips, sets, gold lots and the American Silver Eagle albums vs the ledger's METALS inventory
KNOWN DELTAS (printed, allowed only at the exact amount recorded here; any other difference fails):
  * bullion silver: records add up to 36.5 oz, the ledger's METALS.json says 37.9997 oz (a 'remainder to board 63.27' plug)
  * board value: the ledger board is re-priced at spot $60.59, the records keep the estimate made at $63.50 (and albums are not itemized)
"""
import glob, json, os, sys

def load(p): return json.load(open(p, encoding="utf-8"))

KNOWN = {"bullion_silver_oz": (1.4997, 0.0005, "ledger METALS.json bullion Ag 37.9997 oz is 'remainder to board 63.27'; the B### records add up to 36.5 oz. Unexplained 1.4997 oz: owner/Grok to check (CURATION_OPEN.md)."),
         "board_vs_records_usd": (141.34, 0.02, "ledger board is re-priced at spot $60.59; the B###/S### estimates were made at $63.50/oz, flips/housing/stamps at their own dates")}

def run(src, d):
    data = src if os.path.exists(os.path.join(src, "index.json")) else os.path.join(src, "data")
    idx = load(os.path.join(data, "index.json"))
    types = {}; specs = {}
    for p in sorted(glob.glob(f"{d}/types/*.json")): types.update(load(p))
    for p in sorted(glob.glob(f"{d}/specimens/*.json")):
        for k, v in load(p).items():
            specs.setdefault(k, []).append(v)
    lots = {}
    for l in load(f"{d}/lots.json"): lots.setdefault(l["id"], []).append(l)
    rows, fails, known = [], [], []
    def hard(name, ok, detail):
        rows.append(("PASS" if ok else "FAIL", name, detail))
        if not ok: fails.append(name)
    flips = {f["scan"]: f for f in idx["flips"]}
    lot_src = {r["scan"]: (k, r) for k in ("bullion", "sets", "housing", "stamps") for r in idx.get(k, [])}
    dup = sorted(k for k, v in list(specs.items()) + list(lots.items()) if len(v) != 1)
    hard("each id appears exactly once", not dup, f"duplicates: {dup}" if dup else f"{len(specs)} specimens + {len(lots)} lots, no duplicates")
    miss = sorted(set(flips) - set(specs)) + sorted(set(lot_src) - set(lots)); extra = sorted(set(specs) - set(flips)) + sorted(set(lots) - set(lot_src))
    hard("no ledger id missing", not miss, f"missing: {miss}" if miss else "0 missing")
    hard("no id the ledger does not have", not extra, f"extra: {extra}" if extra else "0 extra")
    c = idx["counts"]
    hard("count: flips", len(specs) == c["flips"] == len(flips), f"collection {len(specs)} / ledger index {len(flips)} / counts.flips {c['flips']}")
    for k, label in (("bullion", "bullion"), ("set", "sets"), ("housing", "housing"), ("stamp", "stamps")):
        n = sum(1 for v in lots.values() if v[0]["kind"] == k)
        hard(f"count: {label}", n == c[label], f"collection {n} / ledger {c[label]}")
    bad = [k for k, f in flips.items() if k in specs and abs((specs[k][0]["value"]["est_usd"] or 0) - f["est"]) > 0.005]
    bad += [k for k, (kind, r) in lot_src.items() if k in lots and abs((lots[k][0]["est_usd"] or 0) - (r["est"] or 0)) > 0.005]
    hard("per-record est_usd equals the ledger", not bad, f"differ: {bad}" if bad else "all 301 records equal")
    f_sum = round(sum(s[0]["value"]["est_usd"] or 0 for s in specs.values()), 2); f_led = round(sum(f["est"] for f in flips.values()), 2)
    hard("sum est_usd: flips", abs(f_sum - f_led) < 0.01, f"collection ${f_sum:,.2f} / ledger records ${f_led:,.2f}")
    for k in ("bullion", "sets", "housing", "stamps"):
        a = round(sum(v[0]["est_usd"] or 0 for v in lots.values() if v[0]["kind"] == k.rstrip("s")), 2) if k != "housing" else round(sum(v[0]["est_usd"] or 0 for v in lots.values() if v[0]["kind"] == "housing"), 2)
        b = round(sum(r["est"] or 0 for r in idx.get(k, [])), 2)
        hard(f"sum est_usd: {k}", abs(a - b) < 0.01, f"collection ${a:,.2f} / ledger records ${b:,.2f}")
    inv = idx["metals"]["inventory"]
    ag_f = round(sum((types[s[0]["type"]]["precious"].get("asw_oz") or 0) for s in specs.values()), 4)
    hard("silver oz: flips", abs(ag_f - inv["ag"]["junk_flips"]["oz"]) < 0.0005, f"collection {ag_f} / ledger {inv['ag']['junk_flips']['oz']}")
    ag_s = round(sum(v[0]["asw_oz"] or 0 for v in lots.values() if v[0]["kind"] == "set"), 4)
    hard("silver oz: sets (S001)", abs(ag_s - inv["ag"]["s001_proof"]["oz"]) < 0.0005, f"collection {ag_s} / ledger {inv['ag']['s001_proof']['oz']}")
    alb = load(f"{d}/albums.json"); ag_a = round(sum((a.get("asw_oz_per_slot") or 0) * (a["slots_filled_claimed"] or 0) for a in alb), 4)
    hard("silver oz: American Silver Eagle albums", abs(ag_a - inv["ag"]["ase_albums"]["oz"]) < 0.0005, f"collection {ag_a} / ledger {inv['ag']['ase_albums']['oz']}")
    au = round(sum(v[0]["agw_oz"] or 0 for v in lots.values()), 4); au_led = round(sum(x["oz"] for x in inv["au"].values()), 4)
    hard("gold oz (lots)", abs(au - au_led) < 0.00005, f"collection {au} / ledger {au_led}; ledger combined_gold {idx['precious']['combined_gold']['oz']}")
    au_f = sum((types[s[0]["type"]]["precious"].get("agw_oz") or 0) for s in specs.values())
    hard("gold oz (flips)", abs(au_f - idx["precious"]["flip_gold"]["oz"]) < 0.00005, f"collection {au_f} / ledger {idx['precious']['flip_gold']['oz']}")
    # known deltas
    ag_b = round(sum(v[0]["asw_oz"] or 0 for v in lots.values() if v[0]["kind"] == "bullion"), 4)
    d1 = round(inv["ag"]["bullion"]["oz"] - ag_b, 4); exp, tol, why = KNOWN["bullion_silver_oz"]
    ok = abs(d1 - exp) <= tol; known.append(("bullion silver oz", f"collection {ag_b} vs ledger {inv['ag']['bullion']['oz']} (delta {d1})", ok, why))
    tot_ag = round(ag_f + ag_s + ag_a + ag_b, 4)
    known.append(("silver oz, all buckets", f"collection {tot_ag} vs ledger {idx['precious']['combined_silver']['oz']} (delta {round(idx['precious']['combined_silver']['oz'] - tot_ag, 4)}, all from bullion)", abs(round(idx['precious']['combined_silver']['oz'] - tot_ag, 4) - exp) <= tol, "same cause"))
    recs = round(f_sum + sum(v[0]["est_usd"] or 0 for v in lots.values()), 2)
    board = idx["board"]; led_ex_alb = round(board["grand"] - board["albums"]["usd"], 2)
    d2 = round(recs - led_ex_alb, 2); exp2, tol2, why2 = KNOWN["board_vs_records_usd"]
    known.append(("estimated value (records vs board)", f"collection records ${recs:,.2f} vs ledger board excl. albums ${led_ex_alb:,.2f} (delta ${d2:,.2f}); ledger headline ${board['grand']:,.2f} = board + albums ${board['albums']['usd']:,.2f}, albums not itemized", abs(d2 - exp2) <= tol2, why2))
    for k, detail, ok, why in known:
        rows.append(("KNOWN" if ok else "FAIL", k, detail + "  | " + why))
        if not ok: fails.append(k)
    return rows, fails

if __name__ == "__main__":
    rows, fails = run(sys.argv[1], sys.argv[2])
    for st, name, detail in rows: print(f"{st:5} {name}: {detail}")
    print("\nRESULT:", "ALL HARD CHECKS PASS (known deltas documented)" if not fails else f"FAILED: {', '.join(fails)}")
    sys.exit(1 if fails else 0)
