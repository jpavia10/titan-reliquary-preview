"""Reference formatters for schema v2. The app's JavaScript formatters must produce IDENTICAL output for every case in
schema/v2/format_cases.json (run tools/schema/test_fmt.py). Rules are deliberately few and boring: one way to show each kind of value.
Missing / unknown values always render as the em dash '—', never as 'unknown', 'n/a', 'null' or a blank."""
from decimal import Decimal, ROUND_HALF_UP
import re

DASH = "—"
FRAC = {0.5: "½", 0.25: "¼", 0.75: "¾", 1 / 3: "⅓", 2 / 3: "⅔", 0.125: "⅛"}
PRE = "$£€¥₹"

def _q(x, places):
    return Decimal(str(x)).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)

def _trim(d, min_places=0):
    s = format(d, "f")
    if "." in s:
        head, tail = s.split(".")
        tail = tail.rstrip("0")
        tail = tail.ljust(min_places, "0")
        s = head + ("." + tail if tail else "")
    return s

def _group(s):
    head, _, tail = s.partition(".")
    neg = head.startswith("-"); head = head.lstrip("-")
    head = f"{int(head):,}"
    return ("-" if neg else "") + head + ("." + tail if tail else "")

def year(issue):
    y, q = issue.get("year"), issue.get("qualifier")
    if q == "ND": return "ND"
    if y is None: return DASH
    if issue.get("calendar"): return f"{issue['calendar']} {issue['calendar_year']} ({y})"
    if q == "circa": return f"ca. {y}" + ("s" if issue.get("decade") else "")
    return str(y)

def _title(w):
    return w if not w or not w[0].isalpha() or w.lower() in ("of", "de", "the", "and") else w[0].upper() + w[1:]

def denomination(d):
    if d.get("display"): return d["display"]
    v, unit = d.get("value"), (d.get("unit") or "").strip()
    unit = " ".join(_title(w) for w in unit.split(" "))
    if v is None: return unit or DASH
    if v in FRAC: num = FRAC[v]
    elif abs(v - round(v)) < 1e-9: num = str(int(round(v)))
    else: num = _trim(_q(v, 2), 0)
    if unit[:1] in PRE: return f"{unit[:1]}{num}{(' ' + unit[1:].strip()) if unit[1:].strip() else ''}"
    if unit[:1] in "¢%": return f"{num}{unit}"
    return f"{num} {unit}".strip()

def money(x, compact=False):
    if x is None: return DASH
    d = _q(x, 2); neg = d < 0; a = abs(d)
    if compact and a >= 10000:
        s = _trim(_q(a / 1000, 1), 0) + "k"
    else:
        s = _group(format(a, "f"))
    return ("-" if neg else "") + "$" + s

def grams(m):
    if m is None: return DASH
    if isinstance(m, dict):
        if m.get("min") is not None and m.get("max") is not None: return f"{_trim(_q(m['min'], 2), 1)}–{_trim(_q(m['max'], 2), 1)} g"
        v, ap = m.get("value"), m.get("approx")
    else:
        v, ap = m, False
    if v is None: return DASH
    return ("~" if ap else "") + _trim(_q(v, 2), 2) + " g"

def millimetres(x, approx=False):
    if x is None: return DASH
    return ("~" if approx else "") + _trim(_q(x, 2), 1) + " mm"

def troy_oz(x):
    if x is None: return DASH
    return (format(_q(x, 4), "f") if x < 1 else _trim(_q(x, 3), 1)) + " oz"

def mintage(n, compact=False):
    if n is None: return DASH
    if compact and n >= 1_000_000: return _trim(_q(n / 1_000_000, 1), 0) + "M"
    if compact and n >= 10_000: return _trim(_q(n / 1_000, 1), 0) + "k"
    return f"{n:,}"

def fineness(f, percent=False):
    if f is None: return DASH
    if percent: return _trim(_q(f * 100, 1), 0) + "%"
    return "." + format(_q(f, 3), "f").split(".")[1]

def catalogs(refs):
    return " · ".join(f"{r['system']}# {r['number']}" for r in refs) if refs else DASH

def long_date(iso):
    if not iso: return DASH
    m = re.fullmatch(r"(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?", iso)
    if not m: return DASH
    mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    y, mm, dd = m.groups()
    if not mm: return y
    return f"{mo[int(mm) - 1]} {int(dd)}, {y}" if dd else f"{mo[int(mm) - 1]} {y}"

def tender(t):
    s = {"current": "Legal tender", "demonetized": "Demonetized", "withdrawn": "Withdrawn", "superseded": "Superseded", "none": "Not legal tender", "unknown": DASH}[t["status"]]
    return f"{s} ({t['until'][:4]})" if t["status"] in ("demonetized", "withdrawn") and t.get("until") else s

def plural(n, one, many=None):
    return f"{n:,} {one if n == 1 else (many or one + 's')}"

FUNCS = {"year": year, "denomination": denomination, "money": money, "grams": grams, "millimetres": millimetres, "troy_oz": troy_oz,
         "mintage": mintage, "fineness": fineness, "catalogs": catalogs, "long_date": long_date, "tender": tender, "plural": plural}
