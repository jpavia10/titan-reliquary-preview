#!/usr/bin/env python3
"""Regenerate tools/prices/fixtures/ (SYNTHETIC sample files in the real formats; the numbers are made up for tests and are never real prices).
usage: python3 tools/prices/make_fixtures.py"""
import datetime, json, os, random

HERE = os.path.dirname(os.path.abspath(__file__)); FX = os.path.join(HERE, "fixtures")
os.makedirs(FX, exist_ok=True)
rnd = random.Random(20260911)
days = []
d = datetime.date(2026, 9, 11)
while d <= datetime.date(2026, 9, 29):
    if d.weekday() < 5: days.append(d)
    d += datetime.timedelta(days=1)

def walk(start, vol):
    v = start; out = []
    for _ in days:
        v *= 1 + rnd.uniform(-vol, vol); out.append(round(v, 3))
    return out

ag = walk(58.0, 0.012); au = walk(4100.0, 0.006)

def stooq(vals):
    lines = ["Date,Open,High,Low,Close,Volume"]
    for dd, c in zip(days, vals):
        lines.append(f"{dd.isoformat()},{c * 0.998:.3f},{c * 1.006:.3f},{c * 0.994:.3f},{c:.3f},0")
    return "\n".join(lines) + "\n"

def yahoo(vals, sym):
    ts = [int(datetime.datetime(dd.year, dd.month, dd.day, 13, 30, tzinfo=datetime.timezone.utc).timestamp()) for dd in days]
    closes = list(vals); closes[3] = None            # one null close, like the real feed on a bad bar
    return json.dumps({"chart": {"result": [{"meta": {"symbol": sym, "gmtoffset": -14400, "timezone": "EDT"}, "timestamp": ts,
                                             "indicators": {"quote": [{"close": closes}]}}], "error": None}}, indent=1) + "\n"

open(os.path.join(FX, "sample_stooq_xagusd.csv"), "w", newline="\n").write(stooq(ag))
open(os.path.join(FX, "sample_stooq_xauusd.csv"), "w", newline="\n").write(stooq(au))
open(os.path.join(FX, "sample_yahoo_SI=F.json"), "w", newline="\n").write(yahoo([round(x * 1.01, 3) for x in ag], "SI=F"))
open(os.path.join(FX, "sample_yahoo_GC=F.json"), "w", newline="\n").write(yahoo([round(x * 1.004, 2) for x in au], "GC=F"))
open(os.path.join(FX, "sample_goldapi_XAG.json"), "w", newline="\n").write(json.dumps({"currency": "USD", "currencySymbol": "$", "exchangeRate": 1, "name": "Silver", "price": 59.8125, "symbol": "XAG", "updatedAt": "2026-09-30T22:14:50Z", "updatedAtReadable": "a few seconds ago"}, indent=1) + "\n")
open(os.path.join(FX, "sample_goldapi_XAU.json"), "w", newline="\n").write(json.dumps({"currency": "USD", "currencySymbol": "$", "exchangeRate": 1, "name": "Gold", "price": 4155.2, "symbol": "XAU", "updatedAt": "2026-09-30T22:14:50Z", "updatedAtReadable": "a few seconds ago"}, indent=1) + "\n")
print("fixtures written to", FX)
