#!/usr/bin/env python3
"""ONE-TIME: snapshot the ledger v254 board (Grok's computed totals) into collection/board.json.

usage (repo root):  python3 tools/pipeline/snapshot_board.py data/ collection/ [--force]

`data/` here must be the v254 Grok publish (the current one in git). board.json carries what the ledger COMPUTED and v2 does
not store: board totals, metals/spot, age stats, moments, flags, albums_glance, requests, per-country notes, and the display
strings of the 28 lots (label, cat, mint, face ...). `basis` holds the sums of the v2 records at snapshot time; build_app_data.py
adds (current records - basis) to the ledger figures, so an unchanged collection reproduces the ledger exactly and a new coin moves
the totals by exactly its value. Board totals are authoritative (owner 2026-09-30: "all silver is logged from Grok, use that info").
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build_app_data as B
import display as D

CARRY = ("board", "metals", "age", "drip", "value", "moments", "flags", "world", "albums_glance", "photos", "requests", "counts", "root", "policy", "precious")
LOT_EXTRA = ("asw_oz", "agw_oz", "label", "cat", "mint", "face", "face_line", "continent", "contents", "qty")

def main(data, coll, force=False):
    out = f"{coll}/board.json"
    if os.path.exists(out) and not force: raise SystemExit(f"{out} exists; refusing to overwrite (use --force; it discards later edits)")
    idx = B.load(f"{data}/index.json"); col = B.load_collection(coll)
    col["board"] = None
    basis = D.basis(col)
    basis["_spec_est_sum"] = round(sum((s["value"].get("est_usd") or 0) for s in col["specs"].values()), 6)
    basis["_ledger_flips_usd_all"] = idx["drip"]["board_snapshot"]["flips_usd"]
    disp = {}
    for kind in ("bullion", "sets", "housing", "stamps"):
        for r in idx[kind]:
            e = {k: r[k] for k in LOT_EXTRA if k in r and not (k == "qty" and r[k] == str(r.get("qty_n")))}
            disp[r["scan"]] = e
    det = {}
    import glob
    for pth in glob.glob(f"{data}/detail/*.json"): det.update(B.load(pth))
    # ledger country names that differ from collection/ref/issuers.json (curated names): the app still groups/filters by the ledger spelling
    legacy = {}
    for f in idx["flips"]:
        t = col["types"][col["specs"][f["scan"]]["type"]]; iid = t.get("issuer") or t["country"]
        if col["issuers"][iid]["name"] != f["country"]: legacy[iid] = f["country"]
    fp = {sid: {k: r[k] for k in ("melt", "melt_raw", "asw_source") if k in r} for sid, r in det.items() if "asw_source" in r or "melt" in r}
    board = {"source": "ledger v254 (Grok)", "snapshot_of": {"ledger_version": idx["ledger_version"], "generated_at": idx["generated_at"], "content_hash": idx["content_hash"]},
             "authority": "Board totals (Ag oz, Au oz, grand total, album value) are authoritative per owner 2026-09-30: 'all silver is logged from Grok, use that info'. They are not recomputed from itemized records; records only move them by their own change since this snapshot (see basis).",
             "basis": basis, "index": {k: idx[k] for k in CARRY}, "issuer_legacy_name": legacy, "flip_precious": fp, "lot_display": disp}
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(board, f, ensure_ascii=False, sort_keys=False, indent=0, separators=(",", ": ")); f.write("\n")
    print(f"wrote {out}: basis {basis}")

if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    main(a[0], a[1], "--force" in sys.argv)
