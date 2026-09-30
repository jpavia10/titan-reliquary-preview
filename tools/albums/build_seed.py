#!/usr/bin/env python3
"""Build schema/seed/albums.seed.json + ALBUMS_AUDIT.md from what Grok's ALBUMS.md (rev 2026-09-22) actually says
about each binder, and compare it with the hand-typed table in app.js (ALBUM_METADATA).

Every number below was transcribed from ALBUMS.md; nothing is inferred except two things, both marked:
  * A026 / A025 are one-coin-per-year books, so their slot grid is generated from the year range and holes are the complement.
  * counts (filled + holes == slots) are recomputed here, never trusted.
evidence levels:  enumerated = every slot is accounted for (filled list and/or hole list adds up to slots_total)
                  partial    = some slots named, the rest only counted
                  count-only = only 'filled/slots' is known (the per-slot map lives in the album photos, not in the ledger)
usage (repo root):  python3 tools/albums/build_seed.py
"""
import json, subprocess, sys, os

def app_table():
    sys.path.insert(0, "tools/schema")
    import migrate_v1_to_v2 as m
    out = {}
    for fam, meta in m.load_albums().items():
        for vid, v in meta["volumes"].items(): out[vid] = dict(v, family=fam)
    return out

def yrs(a, b): return [str(y) for y in range(a, b + 1)]

V = {}
def vol(id, title, slots, filled_n, evidence, filled=None, holes=None, note=None, slots_approx=False, unaccounted=None):
    V[id] = dict(id=id, title=title, slots_total=slots, slots_approx=slots_approx, filled_count=filled_n, evidence=evidence,
                 filled=filled, holes=holes, note=note, unaccounted=unaccounted)

# ---- fully enumerated ----
p1 = "1941 1942 1942-D 1943 1943-D 1943-S 1944 1944-D 1945 1945-D 1945-S 1946 1946-D 1946-S 1947-D 1948 1948-D 1948-S 1949-D 1950 1950-D".split()
p2 = "1951 1951-D 1951-S 1952 1952-D 1953 1953-D 1953-S 1954 1954-D 1955 1955-D 1956 1956-D 1957 1957-D 1958 1958-D 1959 1959-D 1960 1960-D 1961 1961-D 1962 1962-D 1963".split()
p3 = ["1963-D", "1964", "1964-D", "1965", "1966", "1967"] + [f"{y}{s}" for y in range(1968, 1975) for s in ("", "-D", "-S")]
vol("A001", "Whitman 9030 · Lincoln 1941-1974 #2", 87, 75, "enumerated", p1 + p2 + p3,
    "1941-D 1941-S 1942-S 1944-S 1947 1947-S 1949 1949-S 1950-S 1952-S 1954-S 1955-S".split(),
    "Page 3 expanded from 'complete 1963-D through 1974-S'. Plus 2 unlabeled extras (Memorial rev, Lincoln obv) that hold no year.")
vol("A002", "Whitman 4304 · Lincoln Starting 2014 #4", 24, 17, "partial",
    "2014 2014-D 2015 2015-D 2016 2016-D 2017-P 2017-D 2018 2018-D 2019-D 2019-W 2020 2021 2022-D 2023 2024-D".split(),
    "2019 2020-D 2021-D 2022 2023-D 2024".split(), "17 labeled filled + 6 named holes = 23 of 24; one slot unaccounted. Extras page holds 1 cent with no year.", unaccounted=1)
vol("A009", "Whitman · Kennedy Halves 2004-2021 #3", 36, 15, "enumerated",
    "2004-D 2005-D 2006-P 2007-D 2008-D 2009-D 2013-P 2015-D 2016-P 2016-D 2017-D 2018-D 2020-D 2021-P 2021-D".split(),
    "2004-P 2005-P 2006-D 2007-P 2008-P 2009-P 2010-P 2010-D 2011-P 2011-D 2012-P 2012-D 2013-D 2014-P 2014-D 2015-P 2017-P 2018-P 2019-P 2019-D 2020-P".split())
vol("A016", "Whitman 9033 · Lincoln 1975-2013 #3", 90, 84, "enumerated", None,
    ["1982 Cu small date", "1982 Zn small date", "1982-D Zn small date", "2009 Birth & Early Childhood (P)", "2009 Professional Life (P)", "2009 Presidency (P)"],
    "Filled list not enumerated; the 6 holes are. 84 + 6 = 90.")
vol("A017", "Whitman 4908 · American Innovation $1 2018-2023 #1", 42, 0, "enumerated", [], None, "Empty shell: every slot is a hole.")
vol("A021", "Whitman 8078 · State/DC/Terr Quarters Deluxe 1999-2009", 112, 107, "enumerated", None,
    ["2003-P Maine", "2003-D Alabama", "2007-P Wyoming", "2009-P Guam", "2009-D American Samoa"], "120 ports in the book, 112 labeled. Filled list not enumerated; the 5 holes are. 107 + 5 = 112.")
vol("A025", "Whitman · American Silver Eagles Starting 2021", 9, 6, "enumerated", yrs(2021, 2026), ["future slot 1 (2027+)", "future slot 2 (2027+)", "future slot 3 (2027+)"],
    "6 labeled years filled; 3 unlabeled empty slots for later years.")
_f26 = "1986 1987 1992 2001 2002 2005 2006 2007 2008 2013 2014 2015 2016 2017 2018 2019 2020 2021".split()
vol("A026", "Whitman · American Silver Eagles 1986-2021", 36, 18, "enumerated", _f26, [y for y in yrs(1986, 2021) if y not in _f26],
    "One coin per year 1986-2021 = 36 slots; owner count 18 verified against pages. Holes are the complement (computed).")
vol("A027", "Whitman 2875 · National Park Quarters Deluxe 2010-2021", 120, 95, "enumerated", None,
    ["2010 Yosemite-P", "2010 Mt. Hood-D", "2011 Glacier-P", "2011 Vicksburg-P", "2012 El Yunque-P", "2012 Chaco Culture-P", "2012 Chaco Culture-D", "2012 Acadia-P",
     "2012 Hawaii Volcanoes-P", "2014 Great Smoky Mountains-P", "2016 Shawnee-P", "2016 Theodore Roosevelt-P", "2017 Effigy Mounds-P", "2018 Voyageurs-P",
     "2019 Lowell-P", "2019 American Memorial-P", "2019 San Antonio Missions-P", "2019 Frank Church River of No Return-P", "2020 Weir Farm-P",
     "2021 Tuskegee Airmen-P", "2021 unlabeled P port 1", "2021 unlabeled P port 2", "2021 unlabeled P port 3", "2021 unlabeled P port 4", "2021 unlabeled D port 1"],
    "Hole sheet rebuilt slot-by-slot in the ledger. 95 + 25 = 120.")
_pf = "2007 Washington;2007 Adams;2007 Jefferson;2008 J.Q. Adams;2008 Van Buren;2009 Tyler;2010 Fillmore;2010 Pierce;2010 Buchanan;2011 Grant;2011 Garfield;2014 Harding".split(";")
_pe = ("2007 Madison;2008 Monroe;2008 Jackson;2009 Harrison;2009 Polk;2009 Taylor;2010 Lincoln;2011 Johnson;2011 Hayes;2012 Arthur;2012 Cleveland 1st;2012 B. Harrison;2012 Cleveland 2nd;"
       "2013 McKinley;2013 T. Roosevelt;2013 Taft;2013 Wilson;2014 Coolidge;2014 Hoover;2014 F.D. Roosevelt;2015 Truman;2015 Eisenhower;2015 Kennedy;2015 L.B. Johnson;"
       "2016 Nixon;2016 Ford;2016 Carter;2016 Reagan").split(";")
_df = ("2007 Washington;2007 Adams;2007 Jefferson;2007 Madison;2008 Monroe;2008 J.Q. Adams;2008 Jackson;2009 Harrison;2009 Tyler;2009 Taylor;2010 Fillmore;2010 Pierce;"
       "2010 Buchanan;2010 Lincoln;2011 Johnson;2011 Grant;2011 Hayes;2011 Garfield").split(";")
_de = ["2008 Van Buren", "2009 Polk"] + [f"{y} {n}" for y, ns in {2012: "Arthur;Cleveland 1st;B. Harrison;Cleveland 2nd", 2013: "McKinley;T. Roosevelt;Taft;Wilson",
       2014: "Coolidge;Hoover;F.D. Roosevelt;Harding", 2015: "Truman;Eisenhower;Kennedy;L.B. Johnson", 2016: "Nixon;Ford;Carter;Reagan"}.items() for n in ns.split(";")]
vol("A030", "Whitman 2382 · Presidential $1 Deluxe P+D 2007-2016", 80, 30, "enumerated", [f"P {x}" for x in _pf] + [f"D {x}" for x in _df],
    [f"P {x}" for x in _pe] + [f"D {x}" for x in _de], "From the ledger's slot-by-slot hole sheet: 12 P + 18 D filled, 28 P + 22 D empty.")
vol("A029", "Whitman 9018 · Washington Quarters 1932-1947 #1", 42, 0, "enumerated", [], None, "Empty shell (owner verified).")

# ---- partial ----
vol("A015", "Whitman 9009 · Jefferson Nickels 1938-1961 #1", None, 9, "partial", "1939 1940 1947 1950-D 1953-S 1954-D 1955 1959 1961".split(), None,
    "Mostly empty; total slot count not stated in the ledger. 1950-D is the key. Wartime silver nickels 1942-45 empty.", slots_approx=True)
vol("A018", "Whitman 9023 · Eisenhower-Anthony $1 1971-81, 1999", 30, 9, "partial",
    ["Ike 1974-D"] + [f"Anthony {x}" for x in "1979-P 1979-D 1979-S 1980-P 1980-D 1980-S 1999-P 1999-D".split()],
    ["Anthony 1981-P", "Anthony 1981-D", "Anthony 1981-S", "one open bottom slot"], "All other Ike slots empty (about 17); not individually named.")
vol("A019", "Whitman 3163 · Native American $1 Starting 2009", 36, 2, "partial", ["2009-D Three Sisters", "2011-D Wampanoag Treaty"], None,
    "Every other slot through 2021 is empty (plus unlabeled opens); not individually named.")
vol("A020", "Whitman 8060 · Sacagawea $1 2000-2008", 18, 8, "partial", ["2000-P", "2000-D", "2001-D"], None,
    "NEEDS INVESTIGATION per the ledger: 8 physical coins, only 3 dates locked; 4 unlabeled eagle-reverse coins and 1 Presidential mis-slot.", slots_approx=True)
vol("A022", "Whitman 9003 · Indian Head / Flying Eagle 1857-1909", 58, 1, "partial", ["1899"], None, "Nearly the whole book is empty.", slots_approx=True)
vol("A023", "Whitman 9004 · Lincoln Cents 1909-1940 #1", 90, 7, "partial", "1917 1930 1932-D 1933 1934 1937 1940".split(), None,
    "Owner count 7 verified. Rest empty (no 1909 / VDB).", slots_approx=True)
vol("A024", "Whitman 9046 · 20th Century Type Coins", 37, 10, "partial",
    ["1943 steel cent", "Bicentennial quarter", "Washington clad quarter", "Kennedy clad half", "Bicentennial half", "1992 birth-year cent", "1992 birth-year nickel",
     "1992 birth-year dime", "1992 birth-year quarter", "1992 birth-year half"], None, "Edition slot counts vary 35-41.", slots_approx=True)
vol("A028", "Whitman 4950 · Crossing Delaware / American Women 2021-2025", 46, 13, "partial",
    ["2021 Crossing the Delaware P", "2021 Crossing the Delaware D", "2022 Angelou P", "2022 Angelou D", "2022 Ride D", "2022 Mankiller P", "2022 Mankiller D",
     "2022 Otero-Warren D", "2023 Honoree 1 D", "2023 Honoree 2 D", "2023 Honoree 3 D"],
    ["2022 Ride P", "2022 Otero-Warren P", "Anna May Wong (both)", "most 2023-P", "nearly all 2024-2025"], "Owner count 13 authoritative; 11 named, 2 more sit in later or unlabeled ports.")
vol("A031", "Whitman 9008 · Buffalo Nickels 1913-1938", 65, 1, "partial", ["1936"], None, "One coin; the other 64 slots are empty.")
vol("A032", "Whitman 4049 · Canada Small Cents #2 1989-2012", 36, 7, "partial", "1989 1990 1998 1999 2000 2001 2004".split(), None, "Rest empty; notable gaps 1991-97, 2002, 2003 varieties, 2004P, 2005-2012.")
vol("A033", "Whitman 2479 · Canada Small Cents #1 1920-1988", 75, 35, "partial",
    ["1942", "1947", "1951"] + [str(y) for y in range(1955, 1965)] + ["1965 Small Beads", "1966", "1967", "1968", "1969", "1970", "1971", "1972", "1973"] + [str(y) for y in range(1975, 1985)] + ["1985 Pointed 5", "1986", "1987"],
    ["all 1920-1941", "1936 Dot", "1943-1946", "both 1947 Maple Leaf", "1948-1950", "1952", "both 1953", "1954", "1965 Large Beads", "1974", "1985 Blunt 5", "1988"], "Holes named as groups, not slot by slot.")

# ---- count-only (per-slot map is in the album photos, not in the ledger) ----
for id, title, slots, filled, approx in [
    ("A003", "Whitman 1939 · Roosevelt Starting 2005 #3", 40, 39, False), ("A004", "Whitman 9034 · Roosevelt 1965-2004 #2", 78, 74, False),
    ("A005", "Whitman 9029 · Roosevelt 1946-1964 #1", 48, 2, True), ("A006", "Whitman 9014 · Mercury 1916-1945", 80, 1, True),
    ("A007", "Whitman · Kennedy Halves 1964-1985 #1", 36, 32, False), ("A008", "Whitman · Kennedy Halves 1986-2003 #2", 36, 32, False),
    ("A010", "Whitman 9040 · Washington Quarters 1965-1987 #3", None, 59, True), ("A011", "Whitman 9032 · Washington Quarters 1988-1998 #4", 42, 25, True),
    ("A012", "Whitman · Washington Quarters 1948-1964 #2", 36, 1, True), ("A013", "Whitman 9035 · Jefferson Nickels Starting 1996 #3", None, 56, True),
    ("A014", "Whitman 9039 · Jefferson Nickels 1962-1995 #2", None, 57, True)]:
    vol(id, title, slots, filled, "count-only", None, None, "Only the fill count is in the ledger; a dated map needs the album photos or a physical check.", slots_approx=approx)
V["A011"]["note"] = "Ledger: 25 physical, 3 mid-panel empties not pinned to dates; bottom panel empty. Needs a physical check."

def check(v):
    f, h, s = v["filled"], v["holes"], v["slots_total"]
    c = {}
    if f is not None: c["filled_list_matches_count"] = len(f) == v["filled_count"] if v["evidence"] != "partial" or len(f) == v["filled_count"] else False
    if s is not None and f is not None and h is not None: c["filled_plus_holes_equals_slots"] = (len(f) + len(h) == s)
    if s is not None and h is not None and f is None: c["filled_count_plus_holes_equals_slots"] = (v["filled_count"] + len(h) == s)
    return c

def main():
    app = app_table()
    rows, contradictions = [], []
    out = []
    for id in sorted(V):
        v = dict(V[id]); a = app.get(id, {})
        v["family"] = a.get("family")
        v["checks"] = check(v)
        v["app"] = {"totalSlots": a.get("totalSlots"), "filled": a.get("filled"), "holes": a.get("holes")}
        problems = []
        if a:
            if v["slots_total"] is not None and not v["slots_approx"] and a["totalSlots"] != v["slots_total"]: problems.append(f"slots: app {a['totalSlots']} vs ledger {v['slots_total']}")
            if a["filled"] != v["filled_count"]: problems.append(f"filled: app {a['filled']} vs ledger {v['filled_count']}")
            if v["holes"] is not None and v["evidence"] == "enumerated":
                app_h = {str(x).replace(" Key Date", "").replace(" Key", "") for x in a.get("holes", [])}
                led_h = set(v["holes"])
                wrongly_listed = sorted(x for x in app_h if v["filled"] is not None and x in set(v["filled"]))
                missed = sorted(led_h - app_h) if id in ("A026",) else []
                if wrongly_listed: problems.append(f"app lists as MISSING but the ledger has them FILLED: {', '.join(wrongly_listed)}")
                if id == "A026": problems.append(f"app shows {len(a['holes'])} holes; the ledger's real holes number {len(led_h)}")
        v["problems_vs_app"] = problems
        out.append(v)
    os.makedirs("schema/seed", exist_ok=True)
    json.dump({"source": "Grok ALBUMS.md rev 2026-09-22 (Drive: Titan Reliquary Collection/ALBUMS.md)", "built_by": "tools/albums/build_seed.py",
               "totals": {"volumes": len(out), "filled_claimed": sum(v["filled_count"] for v in out)}, "volumes": out},
              open("schema/seed/albums.seed.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ev = {k: sum(1 for v in out if v["evidence"] == k) for k in ("enumerated", "partial", "count-only")}
    bad_sum = [v["id"] for v in out if any(x is False for x in v["checks"].values())]
    md = ["# Album data audit (ledger ALBUMS.md vs the table hand-typed in app.js)", "",
          f"Volumes: {len(out)} · evidence: **{ev['enumerated']} enumerated** (every slot accounted for), **{ev['partial']} partial**, **{ev['count-only']} count-only** (per-slot map exists only in the album photos).", "",
          f"Internal arithmetic check (filled + holes = slots) fails for: {', '.join(bad_sum) or 'none'}.", "",
          "## Where the app's table disagrees with the ledger", ""]
    for v in out:
        if v["problems_vs_app"]: md += [f"- **{v['id']}** {v['title']}"] + [f"  - {p}" for p in v["problems_vs_app"]]
    a26 = next(v for v in out if v["id"] == "A026")
    md += ["", "## The Silver Eagle answer (A026, 1986-2021), computed from the ledger", "",
           f"- Filled ({len(a26['filled'])}): {', '.join(a26['filled'])}",
           f"- **Missing ({len(a26['holes'])}): {', '.join(a26['holes'])}**",
           "- A025 (2021+): 2021-2026 all filled, 3 empty slots for 2027+.", ""]
    open("schema/seed/ALBUMS_AUDIT.md", "w", encoding="utf-8").write("\n".join(md))
    print(f"volumes {len(out)} | evidence {ev} | arithmetic failures {bad_sum}")
    print("\n".join(md[6:6 + 60]))

if __name__ == "__main__":
    main()
