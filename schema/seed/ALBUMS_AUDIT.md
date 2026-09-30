# Album data audit (ledger ALBUMS.md vs the table hand-typed in app.js)

Volumes: 33 · evidence: **10 enumerated** (every slot accounted for), **12 partial**, **11 count-only** (per-slot map exists only in the album photos).

Internal arithmetic check (filled + holes = slots) fails for: A002, A018, A020, A028, A033.

## Where the app's table disagrees with the ledger

- **A001** Whitman 9030 · Lincoln 1941-1974 #2
  - slots: app 90 vs ledger 87
- **A002** Whitman 4304 · Lincoln Starting 2014 #4
  - slots: app 68 vs ledger 24
- **A004** Whitman 9034 · Roosevelt 1965-2004 #2
  - slots: app 80 vs ledger 78
- **A009** Whitman · Kennedy Halves 2004-2021 #3
  - slots: app 24 vs ledger 36
- **A011** Whitman 9032 · Washington Quarters 1988-1998 #4
  - filled: app 20 vs ledger 25
- **A017** Whitman 4908 · American Innovation $1 2018-2023 #1
  - slots: app 20 vs ledger 42
- **A018** Whitman 9023 · Eisenhower-Anthony $1 1971-81, 1999
  - slots: app 16 vs ledger 30
- **A019** Whitman 3163 · Native American $1 Starting 2009
  - slots: app 12 vs ledger 36
- **A020** Whitman 8060 · Sacagawea $1 2000-2008
  - filled: app 3 vs ledger 8
- **A025** Whitman · American Silver Eagles Starting 2021
  - slots: app 16 vs ledger 9
- **A026** Whitman · American Silver Eagles 1986-2021
  - app lists as MISSING but the ledger has them FILLED: 2008, 2017
  - app shows 6 holes; the ledger's real holes number 18
- **A027** Whitman 2875 · National Park Quarters Deluxe 2010-2021
  - slots: app 112 vs ledger 120
- **A028** Whitman 4950 · Crossing Delaware / American Women 2021-2025
  - slots: app 40 vs ledger 46
- **A029** Whitman 9018 · Washington Quarters 1932-1947 #1
  - slots: app 40 vs ledger 42
- **A032** Whitman 4049 · Canada Small Cents #2 1989-2012
  - slots: app 52 vs ledger 36
- **A033** Whitman 2479 · Canada Small Cents #1 1920-1988
  - slots: app 50 vs ledger 75

## The Silver Eagle answer (A026, 1986-2021), computed from the ledger

- Filled (18): 1986, 1987, 1992, 2001, 2002, 2005, 2006, 2007, 2008, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021
- **Missing (18): 1988, 1989, 1990, 1991, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2003, 2004, 2009, 2010, 2011, 2012**
- A025 (2021+): 2021-2026 all filled, 3 empty slots for 2027+.
