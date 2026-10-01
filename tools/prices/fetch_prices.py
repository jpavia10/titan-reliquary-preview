#!/usr/bin/env python3
"""Daily gold + silver spot history for Titan Reliquary. Stdlib only (urllib, csv, json). Run by .github/workflows/prices.yml.

usage (repo root):
    python3 tools/prices/fetch_prices.py [--collection collection/] [--since YYYY-MM-DD] [--refresh] [--today YYYY-MM-DD] [--accept-jumps] [--no-live] [--dry-run]

What it writes (collection/prices/, tier "system": this script is the ONLY writer):
  spot_daily.jsonl   one line per UTC date {date, xag_usd, xau_usd, source, fetched_at[, carried][, provisional]}, ascending
  latest.json        {xag_usd, xau_usd, at, source}: the latest live quote (gold-api.com)

How:
  1. dates to fill = every date from --since (default: day 0 = the earliest acquisition.logged_at in collection/) to YESTERDAY (UTC)
     that has no line yet (a `provisional` line also counts as missing once a real close exists for it). --refresh re-fetches and
     overwrites existing non-ledger lines.
  2. history, primary: stooq daily CSV (xagusd, xauusd = spot). Fallback for dates still missing: Yahoo Finance chart JSON
     (SI=F, GC=F = FUTURES closes, labelled as such in `source`).
  3. today's quote: gold-api.com /price/XAG and /price/XAU -> latest.json, and a `provisional` line for today (replaced by the real close
     on a later run).
  4. every value is validated: plausible range, no 0/NaN, and a day-over-day move above 15% against the previous accepted value is
     REJECTED and logged (the date stays missing; --accept-jumps overrides after a human looked). Never overwrites a line unless --refresh.
  5. dates between two real prices that no source returned (weekends, holidays) carry the previous close forward with `carried: true`.
     Dates after the last real price are NOT carried (a lagging source must not be papered over); a later run fills them.
Exit code 0 even when sources are down (a partial result is still committed); 1 only for a hard error (bad arguments, unwritable files,
nothing could be written AND a source returned garbage). Everything it did is printed.
"""
import csv, datetime, glob, io, json, math, os, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
UA = {"User-Agent": "Mozilla/5.0 (titan-reliquary price script; +https://github.com/jpavia10/titan-reliquary-preview)"}
RANGES = {"xag_usd": (5.0, 500.0), "xau_usd": (500.0, 20000.0)}
MAX_MOVE = 0.15
STOOQ = "https://stooq.com/q/d/l/?s={sym}&i=d"
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval=1d"
GOLDAPI = "https://api.gold-api.com/price/{sym}"
SRC_STOOQ = "stooq.com daily close xagusd+xauusd (spot)"
SRC_YAHOO = "yahoo finance daily close SI=F+GC=F (futures, not spot)"
SRC_LIVE = "gold-api.com quote"

# ----------------------------------------------------------------------------------------------------------------- parsers (pure, tested offline)
def _num(x):
    try: v = float(x)
    except (TypeError, ValueError): return None
    return v if math.isfinite(v) and v > 0 else None

def parse_stooq(text):
    """stooq daily CSV (Date,Open,High,Low,Close,Volume) -> {YYYY-MM-DD: close}. Rows with a bad date or close are skipped."""
    out = {}
    for row in csv.DictReader(io.StringIO(text.strip())):
        d = (row.get("Date") or "").strip(); c = _num(row.get("Close"))
        try: datetime.date.fromisoformat(d)
        except ValueError: continue
        if c is not None: out[d] = c
    return out

def parse_yahoo(text):
    """Yahoo chart JSON -> {YYYY-MM-DD: close}. The date is the exchange-local calendar date (timestamp + meta.gmtoffset). Null closes are skipped."""
    j = json.loads(text)
    res = ((j.get("chart") or {}).get("result") or [None])[0]
    if not res: raise ValueError("yahoo: no result (" + json.dumps((j.get("chart") or {}).get("error"))[:120] + ")")
    off = int((res.get("meta") or {}).get("gmtoffset") or 0)
    ts = res.get("timestamp") or []; closes = (((res.get("indicators") or {}).get("quote") or [{}])[0]).get("close") or []
    out = {}
    for t, c in zip(ts, closes):
        c = _num(c)
        if c is None: continue
        d = (datetime.datetime(1970, 1, 1) + datetime.timedelta(seconds=int(t) + off)).date().isoformat()
        out[d] = c
    return out

def parse_goldapi(text):
    """gold-api.com {"symbol":"XAG","price":60.58,"updatedAt":"2026-09-30T15:12:17Z"} -> (price, 'YYYY-MM-DDTHH:MM:SSZ' or None)."""
    j = json.loads(text); p = _num(j.get("price"))
    if p is None: raise ValueError("gold-api: no usable price")
    at = j.get("updatedAt")
    try: at = datetime.datetime.fromisoformat(str(at).replace("Z", "+00:00")).astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError: at = None
    return p, at

def valid(metal, v):
    lo, hi = RANGES[metal]
    return v is not None and math.isfinite(v) and lo <= v <= hi

# ----------------------------------------------------------------------------------------------------------------- files
def day0(collection):
    """Earliest acquisition.logged_at (specimens) / logged_at (lots) in the collection."""
    ds = []
    for p in glob.glob(os.path.join(collection, "specimens", "*.json")):
        with open(p, encoding="utf-8") as f: recs = json.load(f)
        for s in recs.values():
            d = (s.get("acquisition") or {}).get("logged_at")
            if d: ds.append(d[:10])
    with open(os.path.join(collection, "lots.json"), encoding="utf-8") as f: lots = json.load(f)
    for l in lots:
        if l.get("logged_at"): ds.append(l["logged_at"][:10])
    if not ds: raise SystemExit("no logged_at anywhere in the collection: cannot find day 0 (use --since)")
    return min(ds)

def read_rows(path):
    rows = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for ln in f:
                if ln.strip(): r = json.loads(ln); rows[r["date"]] = r
    return rows

def write_rows(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        for d in sorted(rows):
            f.write(json.dumps(rows[d], ensure_ascii=False, separators=(",", ":"), sort_keys=False) + "\n")

def drange(a, b):
    d = datetime.date.fromisoformat(a); e = datetime.date.fromisoformat(b)
    while d <= e: yield d.isoformat(); d += datetime.timedelta(days=1)

# ----------------------------------------------------------------------------------------------------------------- network
def http_get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r: return r.read().decode("utf-8", "replace")

def yahoo_range(days):
    for lim, name in ((5, "5d"), (28, "1mo"), (88, "3mo"), (175, "6mo"), (360, "1y"), (720, "2y"), (1800, "5y")):
        if days <= lim: return name
    return "10y"

def history(fetch, need, log, today):
    """-> {date: (xag, xau, source)} for the dates in `need` that a source returned (before validation). Primary stooq, fallback yahoo."""
    got = {}; need = sorted(need)
    if not need: return got
    days = (datetime.date.fromisoformat(today) - datetime.date.fromisoformat(need[0])).days + 3
    try:
        ag, au = parse_stooq(fetch(STOOQ.format(sym="xagusd"))), parse_stooq(fetch(STOOQ.format(sym="xauusd")))
        for d in need:
            if d in ag and d in au: got[d] = (ag[d], au[d], SRC_STOOQ)
        log(f"stooq: {len(ag)} silver / {len(au)} gold rows, {len(got)} of {len(need)} needed dates covered")
    except Exception as e:
        log(f"stooq FAILED: {type(e).__name__}: {str(e)[:120]}")
    left = [d for d in need if d not in got]
    if left:
        try:
            rng = yahoo_range(days)
            ag, au = parse_yahoo(fetch(YAHOO.format(sym="SI=F", rng=rng))), parse_yahoo(fetch(YAHOO.format(sym="GC=F", rng=rng)))
            n = 0
            for d in left:
                if d in ag and d in au: got[d] = (ag[d], au[d], SRC_YAHOO); n += 1
            log(f"yahoo (futures, range {rng}): filled {n} of {len(left)} remaining dates")
        except Exception as e:
            log(f"yahoo FAILED: {type(e).__name__}: {str(e)[:120]}")
    return got

def live_quote(fetch, log):
    try:
        ag, at1 = parse_goldapi(fetch(GOLDAPI.format(sym="XAG"))); au, at2 = parse_goldapi(fetch(GOLDAPI.format(sym="XAU")))
        if not (valid("xag_usd", ag) and valid("xau_usd", au)): log(f"gold-api: implausible quote Ag {ag} Au {au}: ignored"); return None
        return {"xag_usd": ag, "xau_usd": au, "at": max(x for x in (at1, at2) if x) if (at1 or at2) else None, "source": SRC_LIVE + " (api.gold-api.com XAG + XAU)"}
    except Exception as e:
        log(f"gold-api FAILED: {type(e).__name__}: {str(e)[:120]}"); return None

# ----------------------------------------------------------------------------------------------------------------- the run
def run(collection, since=None, refresh=False, today=None, accept_jumps=False, live=True, fetch=http_get, now=None, log=print, dry=False):
    """Returns {rows, added, replaced, rejected, carried, latest}. `fetch(url)->text` is injectable for tests."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    today = today or now.date().isoformat(); yday = (datetime.date.fromisoformat(today) - datetime.timedelta(days=1)).isoformat()
    stamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    path = os.path.join(collection, "prices", "spot_daily.jsonl")
    old = read_rows(path); start = since or day0(collection)
    old_carried = {d for d, r in old.items() if r.get("carried")}
    rows = {d: r for d, r in old.items() if not r.get("carried")}          # carried lines are derived: regenerated below on every run
    protected = lambda r: str(r.get("source", "")).startswith("ledger") or "via ledger v254" in str(r.get("source", ""))   # ledger quotes are never replaced
    want = [d for d in drange(start, yday) if d not in rows or rows[d].get("provisional") or (refresh and not protected(rows[d]))]
    rep = {"added": [], "replaced": [], "rejected": [], "carried": [], "latest": None}
    got = history(fetch, want, log, today)
    prev = None                                                              # previous accepted (xag, xau) in date order, existing lines included
    for d in sorted(set(rows) | set(got)):
        if d in got and d in want:
            ag, au, src = got[d]
            if not (valid("xag_usd", ag) and valid("xau_usd", au)):
                rep["rejected"].append((d, f"implausible value Ag {ag} Au {au}")); log(f"REJECTED {d}: implausible value Ag {ag} Au {au} ({src})"); continue
            if prev and not accept_jumps:
                mv = max(abs(ag / prev[0] - 1), abs(au / prev[1] - 1))
                if mv > MAX_MOVE:
                    rep["rejected"].append((d, f"{mv:.1%} day-over-day move")); log(f"REJECTED {d}: {mv:.1%} move vs the previous accepted close (Ag {ag} Au {au}, {src})"); continue
            (rep["replaced"] if d in rows else rep["added"]).append(d)
            rows[d] = {"date": d, "xag_usd": round(ag, 4), "xau_usd": round(au, 4), "source": src, "fetched_at": stamp}
        if d in rows: prev = (rows[d]["xag_usd"], rows[d]["xau_usd"])
    # today's live quote: latest.json + a provisional line for today (a real close replaces it on a later run)
    latest = live_quote(fetch, log) if live else None
    if latest:
        rep["latest"] = latest
        if today not in rows or rows[today].get("provisional") or (refresh and not protected(rows[today])):
            before = [rows[d] for d in sorted(rows) if d < today]
            base = (before[-1]["xag_usd"], before[-1]["xau_usd"]) if before else None
            if base and not accept_jumps and max(abs(latest["xag_usd"] / base[0] - 1), abs(latest["xau_usd"] / base[1] - 1)) > MAX_MOVE:
                rep["rejected"].append((today, "live quote moved over 15% vs the previous accepted close")); log(f"REJECTED live quote for {today}: over 15% move vs the previous close")
            else:
                (rep["replaced"] if today in rows else rep["added"]).append(today)
                rows[today] = {"date": today, "xag_usd": round(latest["xag_usd"], 4), "xau_usd": round(latest["xau_usd"], 4),
                               "source": latest["source"] + " (provisional until the daily close is available)", "fetched_at": latest["at"] or stamp, "provisional": True}
    # carry weekends/holidays: only gaps between two real prices (nothing after the last real price date, nothing before the first)
    if rows:
        rejected = {x[0] for x in rep["rejected"]}; last_real = max(rows); src_date = None
        for d in drange(min(rows), last_real):
            if d in rows: src_date = d; continue
            if d in rejected: continue                                        # a rejected date is a data problem, not a holiday
            b = rows[src_date]
            row = {"date": d, "xag_usd": b["xag_usd"], "xau_usd": b["xau_usd"], "source": f"carried from {src_date} (no market price on this date)", "fetched_at": stamp, "carried": True}
            if d in old_carried and all(old[d].get(k) == row[k] for k in ("xag_usd", "xau_usd", "source")): row = old[d]      # unchanged: keep its original fetched_at
            else: rep["carried"].append(d)
            rows[d] = row
    rep["rows"] = rows
    if not dry:
        write_rows(path, rows)
        if latest:
            with open(os.path.join(collection, "prices", "latest.json"), "w", encoding="utf-8", newline="\n") as f:
                json.dump({k: latest[k] for k in ("xag_usd", "xau_usd", "at", "source")}, f, indent=2); f.write("\n")
    log(f"spot_daily: {len(rows)} lines (+{len(rep['added'])} added, {len(rep['replaced'])} replaced, {len(rep['carried'])} newly carried, {len(rep['rejected'])} rejected)" + (" [dry run: nothing written]" if dry else ""))
    return rep

def main(argv):
    a = lambda n, d=None: argv[argv.index(n) + 1] if n in argv else d
    coll = a("--collection", os.path.join(ROOT, "collection"))
    rep = run(coll, since=a("--since"), refresh="--refresh" in argv, today=a("--today"), accept_jumps="--accept-jumps" in argv, live="--no-live" not in argv, dry="--dry-run" in argv)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
