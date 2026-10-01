#!/usr/bin/env python3
"""Portfolio value history: value(d) for every date from day 0 to the latest price date. Pure functions of the collection + collection/prices/.

    value(d) = sum over items present on d of [ metal oz x spot(d) + that item's non-metal premium ]
               + unitemised board metal (oz x spot(d)) + residual bucket "albums, sets, housing (ledger)"

  items      specimens (acquisition.logged_at <= d, counted through lifecycle.removed_on), lots (logged_at <= d), albums (no date: counted from day 0)
  metal oz   specimen: type.precious.asw_oz/agw_oz x quantity; lot: asw_oz / agw_oz; album: asw_oz_per_slot x slots_filled_claimed
  premium    est_usd - (oz x the spot the estimate was made at: the ledger's 63.50 Ag / 4,350 Au, from valuations.jsonl); a non-metal item's premium is its
             est_usd (floored at 0)
  calibrate  at the board quote date (collection/board.json metals.as_of) the model must equal the authoritative board total ($5,393.70):
             board silver/gold ounces not found in any record (63.27 oz on the board vs the itemised ounces) are carried as "unitemised metal" at spot(d),
             and what is still left is ONE constant dollar residual, the honest bucket "albums, sets, housing (ledger)", counted from day 0.
Only the standard library.
"""
import datetime

VAL_AG_DEFAULT = 63.5      # the ledger's valuation spot for silver items ("Melt: $63.50 @ $63.50/oz")
VAL_AU_DEFAULT = 4350.0    # and for gold lots
BUCKET = "albums, sets, housing (ledger)"

def valuation_spots(col):
    """The spot each valuation was made at (valuations.jsonl; the ledger stored the gold figure in spot_ag on 2 lines)."""
    ag, au = {}, {}
    for v in col.get("valuations", []):
        for k in ("spot_ag", "spot_au"):
            x = v.get(k)
            if x is None: continue
            (au if (k == "spot_au" or x > 1000) else ag).setdefault(x, 0); (au if (k == "spot_au" or x > 1000) else ag)[x] += 1
    mode = lambda d, default: max(d, key=d.get) if d else default
    return mode(ag, VAL_AG_DEFAULT), mode(au, VAL_AU_DEFAULT)

def _day(x): return x[:10] if x else None

def items(col):
    """-> list of {id, kind, start, end, ag, au, premium}; start None = undated (counted from day 0)."""
    vag, vau = valuation_spots(col); out = []
    def prem(est, ag, au):
        est = est or 0.0
        if not ag and not au: return max(0.0, est)
        return est - ag * vag - au * vau
    for sid, s in col["specs"].items():
        t = col["types"][s["type"]]; q = s.get("quantity") or 1; p = t.get("precious") or {}
        ag = (p.get("asw_oz") or 0) * q; au = (p.get("agw_oz") or 0) * q
        out.append({"id": sid, "kind": "specimen", "start": _day((s.get("acquisition") or {}).get("logged_at")), "end": _day((s.get("lifecycle") or {}).get("removed_on")),
                    "ag": ag, "au": au, "premium": prem((s.get("value") or {}).get("est_usd"), ag, au)})
    for l in col["lots"]:
        ag = l.get("asw_oz") or 0; au = l.get("agw_oz") or 0
        out.append({"id": l["id"], "kind": l["kind"], "start": _day(l.get("logged_at")), "end": _day(l.get("removed_on")), "ag": ag, "au": au, "premium": prem(l.get("est_usd"), ag, au)})
    for a in col["albums"]:
        ag = (a.get("asw_oz_per_slot") or 0) * (a.get("slots_filled_claimed") or 0)
        out.append({"id": a["id"], "kind": "album", "start": None, "end": None, "ag": ag, "au": 0.0, "premium": 0.0})
    return out

def day0(its):
    ds = [i["start"] for i in its if i["start"]]
    return min(ds) if ds else None

def present(i, d, d0):
    return (i["start"] or d0) <= d and (i["end"] is None or d <= i["end"])

def drange(a, b):
    d = datetime.date.fromisoformat(a); e = datetime.date.fromisoformat(b)
    while d <= e: yield d.isoformat(); d += datetime.timedelta(days=1)

def board_quote(col):
    m = col["board"]["index"]["metals"]
    return {"date": m["as_of"], "xag_usd": m["spot"]["ag_usd_oz"], "xau_usd": m["spot"]["au_usd_oz"], "source": m.get("source"), "at": m.get("source_updated_at"),
            "total_usd": col["board"]["index"]["board"]["grand"], "oz_ag": m["oz"]["ag"] if "oz" in m else col["board"]["index"]["board"]["silver"]["oz"],
            "oz_au": col["board"]["index"]["board"]["gold"]["oz"]}

def calibration(col, its=None):
    """-> dict(unitemised_ag_oz, unitemised_au_oz, residual_usd, model_at_board_usd, ...) so that model(board date, board quote) == board total."""
    its = its if its is not None else items(col); bq = board_quote(col); d0 = day0(its) or bq["date"]
    pres = [i for i in its if present(i, bq["date"], d0)]
    ag = sum(i["ag"] for i in pres); au = sum(i["au"] for i in pres)
    un_ag = round(bq["oz_ag"] - ag, 4); un_au = round(bq["oz_au"] - au, 6)
    base = ag * bq["xag_usd"] + au * bq["xau_usd"] + sum(i["premium"] for i in pres) + un_ag * bq["xag_usd"] + un_au * bq["xau_usd"]
    return {"unitemised_ag_oz": un_ag, "unitemised_au_oz": un_au, "itemised_ag_oz": round(ag, 4), "itemised_au_oz": round(au, 6),
            "residual_usd": round(bq["total_usd"] - base, 2), "items_at_board_date": len(pres), "board": bq}

def spot_lookup(rows, last_day):
    """rows {date: row} -> function d -> (xag, xau, kind) with kind '' real, 'c' carried (in the file or by this build), 'p' provisional; None before the first price."""
    ds = sorted(rows)
    def f(d):
        if d in rows:
            r = rows[d]; return r["xag_usd"], r["xau_usd"], "c" if r.get("carried") else ("p" if r.get("provisional") else "")
        prev = [x for x in ds if x < d]
        if not prev: return None
        r = rows[prev[-1]]; return r["xag_usd"], r["xau_usd"], "c"                  # a rejected/missing/not-yet-fetched day: the last good price
    return f

def portfolio(col, spot_rows, today=None):
    """-> dict with meta + columnar rows. spot_rows: {date: {xag_usd, xau_usd, carried?, provisional?}}. `today` (YYYY-MM-DD) extends the series with the last price."""
    its = items(col); cal = calibration(col, its); bq = cal["board"]; d0 = day0(its) or bq["date"]
    last_spot = max(spot_rows) if spot_rows else None
    through = max([x for x in (last_spot, today) if x]) if (last_spot or today) else None
    out = {"cols": ["d", "total", "ag_melt", "au_melt", "premium", "n", "added", "k"], "rows": [], "markers": []}
    if not spot_rows or not through:
        out.update(meta(col, its, cal, d0, None, None, spot_rows)); return out
    f = spot_lookup(spot_rows, through)
    first = next((d for d in drange(d0, through) if f(d)), None)
    unag, unau, res = cal["unitemised_ag_oz"], cal["unitemised_au_oz"], cal["residual_usd"]
    added = {}
    for i in its:
        if i["start"] and i["kind"] != "album": added[i["start"]] = added.get(i["start"], 0) + 1
    for d in (drange(first, through) if first else []):
        pres = [i for i in its if present(i, d, d0)]
        s = f(d); ag_oz = sum(i["ag"] for i in pres) + unag; au_oz = sum(i["au"] for i in pres) + unau
        agm = ag_oz * s[0]; aum = au_oz * s[1]; prem = sum(i["premium"] for i in pres) + res
        out["rows"].append([d, round(agm + aum + prem, 2), round(agm, 2), round(aum, 2), round(prem, 2), sum(1 for i in pres if i["kind"] != "album"), added.get(d, 0), s[2]])
    out["markers"] = [{"d": d, "n": n} for d, n in sorted(added.items()) if first and d >= first]
    out.update(meta(col, its, cal, d0, first, through, spot_rows))
    out["ag_oz"] = round(sum(i["ag"] for i in its if present(i, through or d0, d0)) + unag, 4)
    out["au_oz"] = round(sum(i["au"] for i in its if present(i, through or d0, d0)) + unau, 6)
    return out

def meta(col, its, cal, d0, first, through, spot_rows):
    bq = cal["board"]; nd = sum(1 for i in its if i["kind"] == "album")
    dated = [i for i in its if i["kind"] != "album"]
    cap = (f"Portfolio value = metal content x that day's spot + each item's non-metal premium, counting every item from the day it was added "
           f"(acquisition.logged_at; {len(dated)} specimens and lots, day 0 = {d0}). {nd} album volumes are undated (counted from day 0). "
           f"Calibrated to the ledger board total ${bq['total_usd']:,.2f} at the {bq['date']} quote; the remainder ${cal['residual_usd']:,.2f} is shown as "
           f"\"{BUCKET}\" and counted from day 0. Metal is repriced daily from the real spot history; premiums are the ledger's own estimates and do not move.")
    return {"method": "metal oz x spot(d) + premium; calibrated to the board total at the board quote date", "day0": d0, "priced_from": first, "through": through,
            "last_price_date": max(spot_rows) if spot_rows else None, "bucket": BUCKET, "residual_usd": cal["residual_usd"],
            "unitemised_oz": {"ag": cal["unitemised_ag_oz"], "au": cal["unitemised_au_oz"]}, "itemised_oz": {"ag": cal["itemised_ag_oz"], "au": cal["itemised_au_oz"]},
            "board_quote": {k: bq[k] for k in ("date", "xag_usd", "xau_usd", "source", "at", "total_usd")}, "undated_albums": nd, "caption": cap}

def model_at(col, d, ag_spot, au_spot, its=None):
    """Value on date d at the given spots (used by tests and the calibration check)."""
    its = its if its is not None else items(col); cal = calibration(col, its); d0 = day0(its)
    pres = [i for i in its if present(i, d, d0)]
    return round(sum(i["ag"] for i in pres) * ag_spot + sum(i["au"] for i in pres) * au_spot + cal["unitemised_ag_oz"] * ag_spot + cal["unitemised_au_oz"] * au_spot
                 + sum(i["premium"] for i in pres) + cal["residual_usd"], 2)
