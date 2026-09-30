#!/usr/bin/env python3
"""Turn schema/seed/albums.seed.json (Grok's ALBUMS.md, rev 2026-09-22) into schema-v2 AlbumVolume records with slot grids.

Rules (owner, 2026-09-30: "fill slot details from the Whitman album model and mark them 'inferred'"):
  * A slot is named either by the ledger (occupant_status "ledger" when ALBUMS.md says whether it is filled) or by the published
    Whitman layout ("inferred", provenance "inferred: Whitman <model> ...").
  * A Whitman grid is generated ONLY when its slot count equals the ledger's stated slot count (arithmetic check below);
    otherwise only ledger-named slots are listed and the rest stay unnamed (slots_total - len(slots)).
  * When the ledger gives a filled COUNT and names only the holes (A016, A021, A027), the unnamed-but-modelled slots are
    "filled" with status "inferred" (slot arithmetic). When it names only some filled slots of a count-only volume the rest are "unknown".
  * Holes are never stored. missing = slots_total - slots_filled_claimed (see album_calc.py).
Everything generated is reproducible: python3 tools/albums/build_slots.py prints the audit table.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")

def S(label, year=None, mint=None, variety=None, key=False):
    return {"label": label, "year": year, "mint": mint, "variety": variety, "key": key}

def lab_p(y, bare_below=1980):
    return str(y) if y < bare_below else f"{y}-P"

def lab_m(y, m, bare_below=1980):
    return lab_p(y, bare_below) if m == "P" else f"{y}-{m}"

def pd_years(a, b, mints="PD", bare_below=1980):
    return [S(lab_m(y, m, bare_below), y, m) for y in range(a, b + 1) for m in mints]

# ---------------- Whitman layouts (each is checked against the ledger's slot count) ----------------
def grid_A001():  # Whitman 9030 Lincoln 1941-1974 #2
    g = pd_years(1941, 1955, "PDS", 1980) + pd_years(1956, 1964, "PD", 1980)
    g += [S(str(y), y, None) for y in (1965, 1966, 1967)]
    return g + pd_years(1968, 1974, "PDS", 1980)

def grid_A003(): return pd_years(2005, 2024)                      # Whitman 1939 Roosevelt starting 2005
def grid_A005(): return pd_years(1946, 1955, "PDS", 1980) + pd_years(1956, 1964, "PD", 1980)  # Whitman 9029 Roosevelt 1946-1964

def grid_A007():  # Whitman Kennedy 1964-1985: 1964 P D, 1965-67 no mint, 1968-70 D only, 1971-74 P D, 1976-85 P D
    g = pd_years(1964, 1964, "PD")
    g += [S(str(y), y, None) for y in (1965, 1966, 1967)]
    g += [S(f"{y}-D", y, "D") for y in (1968, 1969, 1970)]
    return g + pd_years(1971, 1974) + pd_years(1976, 1985)

def grid_A008(): return pd_years(1986, 2003)                      # Whitman Kennedy 1986-2003
def grid_A020(): return pd_years(2000, 2008)                      # Whitman 8060 Sacagawea 2000-2008

def grid_A016():  # Whitman 9033 Lincoln 1975-2013 #3 (90 slots)
    g = pd_years(1975, 1981)
    for m in "PD":
        for met in ("Cu", "Zn"):
            for sz in ("large", "small"):
                lab = f"1982{'' if m == 'P' else '-D'} {met} {sz} date"
                g.append(S(lab, 1982, m, f"{met} {sz} date"))
    g += pd_years(1983, 2008)
    for m in "PD":
        for d in ("Birth & Early Childhood", "Formative Years", "Professional Life", "Presidency"):
            g.append(S(f"2009 {d} ({m})", 2009, m, d))
    return g + pd_years(2010, 2013)

STATES = {1999: "Delaware Pennsylvania New-Jersey Georgia Connecticut", 2000: "Massachusetts Maryland South-Carolina New-Hampshire Virginia",
          2001: "New-York North-Carolina Rhode-Island Vermont Kentucky", 2002: "Tennessee Ohio Louisiana Indiana Mississippi",
          2003: "Illinois Alabama Maine Missouri Arkansas", 2004: "Michigan Florida Texas Iowa Wisconsin",
          2005: "California Minnesota Oregon Kansas West-Virginia", 2006: "Nevada Nebraska Colorado North-Dakota South-Dakota",
          2007: "Montana Washington Idaho Wyoming Utah", 2008: "Oklahoma New-Mexico Arizona Alaska Hawaii",
          2009: "District-of-Columbia Puerto-Rico Guam American-Samoa US-Virgin-Islands Northern-Mariana-Islands"}

def grid_A021():  # Whitman 8078 State / DC / Territory quarters deluxe (56 designs x P,D = 112)
    g = []
    for y, names in STATES.items():
        for n in names.split(" "):
            for m in "PD":
                g.append(S(f"{y}-{m} {n.replace('-', ' ')}", y, m, n.replace("-", " ")))
    return g

PARKS = {2010: ["Hot Springs", "Yellowstone", "Yosemite", "Grand Canyon", "Mt. Hood"], 2011: ["Gettysburg", "Glacier", "Olympic", "Vicksburg", "Chickasaw"],
         2012: ["El Yunque", "Chaco Culture", "Acadia", "Hawaii Volcanoes", "Denali"], 2013: ["White Mountain", "Perry's Victory", "Great Basin", "Fort McHenry", "Mount Rushmore"],
         2014: ["Great Smoky Mountains", "Shenandoah", "Arches", "Great Sand Dunes", "Everglades"], 2015: ["Homestead", "Kisatchie", "Blue Ridge", "Bombay Hook", "Saratoga"],
         2016: ["Shawnee", "Cumberland Gap", "Harpers Ferry", "Theodore Roosevelt", "Fort Moultrie"], 2017: ["Effigy Mounds", "Frederick Douglass", "Ozark", "Ellis Island", "George Rogers Clark"],
         2018: ["Pictured Rocks", "Apostle Islands", "Voyageurs", "Cumberland Island", "Block Island"],
         2019: ["Lowell", "American Memorial", "War in the Pacific", "San Antonio Missions", "Frank Church River of No Return"],
         2020: ["Pu'uhonua o Honaunau", "Salt River Bay", "Weir Farm", "Marsh-Billings-Rockefeller", "Tallgrass Prairie"], 2021: ["Tuskegee Airmen"]}

def grid_A027():  # Whitman 2875 National Park quarters deluxe: 11 years x 5 x (P,D) + 2021 Tuskegee (2) = 112 labeled ports + 8 unlabeled ports = 120
    g = [S(f"{y} {n}-{m}", y, m, n) for y, ns in PARKS.items() for n in ns for m in "PD"]
    g += [S(f"2021 unlabeled {m} port {i}", 2021, m, "unlabeled port") for m in "PD" for i in range(1, 5)]
    return g

GRIDS = {"A001": (grid_A001, "Whitman 9030"), "A003": (grid_A003, "Whitman 1939"), "A005": (grid_A005, "Whitman 9029"),
         "A007": (grid_A007, "Whitman Kennedy 1964-1985"), "A008": (grid_A008, "Whitman Kennedy 1986-2003"),
         "A016": (grid_A016, "Whitman 9033"), "A020": (grid_A020, "Whitman 8060"), "A021": (grid_A021, "Whitman 8078"), "A027": (grid_A027, "Whitman 2875")}

KEY_LABELS = {"A026": {"1996"}}

def year_of(label):
    m = re.search(r"(?<!\d)(1[89]\d\d|20\d\d)(?!\d)", label or "")
    return int(m.group(1)) if m else None

def mint_of(label):
    m = re.search(r"-(P|D|S|W)\b", label or "") or re.search(r"\((P|D|S|W)\)", label or "") or re.match(r"^(P|D|S|W) \d{4}", label or "")
    return m.group(1) if m else None

def canon(label):
    return re.sub(r"\s+", " ", label.strip().lower())

def title_years(title):
    part = title.split(" · ", 1)[-1]
    ys = [int(x) for x in re.findall(r"(?<!\d)(1[89]\d\d|20\d\d)(?!\d)", part)]
    if not ys: return None, None
    if re.search(r"starting|from", part, re.I) and len(ys) == 1: return ys[0], None
    return ys[0], ys[-1]

def whitman_no(title):
    m = re.match(r"Whitman (\d{4}) ", title)
    return m.group(1) if m else None

def build_volume(v, meta, issues):
    vid = v["id"]; total = v["slots_total"]; claimed = v["filled_count"]
    filled_names, hole_names = v.get("filled"), v.get("holes")
    slots, n = [], 0
    def add(label, state, status, prov=None, year=None, mint=None, variety=None, key=False):
        nonlocal n
        n += 1
        slots.append({"slot": f"s{n:03d}", "label": label, "year": year if year is not None else year_of(label), "mint": mint if mint is not None else mint_of(label),
                      "variety": variety, "key": key or (label in KEY_LABELS.get(vid, ())), "state": state, "occupant_status": status, "provenance": prov, "occupant": None})
    grid_src = "none"
    if vid in GRIDS and total is not None:
        fn, model = GRIDS[vid]; grid = fn()
        if len(grid) != total:
            issues.append(f"{vid}: Whitman model has {len(grid)} slots but the ledger states {total}; grid NOT used")
        else:
            fset = {canon(x) for x in (filled_names or [])}; hset = {canon(x) for x in (hole_names or [])}
            labels = {canon(g["label"]) for g in grid}
            stray = sorted((fset | hset) - labels)
            if stray:
                issues.append(f"{vid}: ledger names not in the Whitman model: {stray}; grid NOT used")
            else:
                prov = f"inferred: {model} layout; model slot count {total} equals the ledger's stated count"
                for g in grid:
                    c = canon(g["label"])
                    if c in fset: add(g["label"], "filled", "ledger", None, g["year"], g["mint"], g["variety"], g["key"])
                    elif c in hset: add(g["label"], "empty", "ledger", None, g["year"], g["mint"], g["variety"], g["key"])
                    elif filled_names is None and hole_names is not None:   # ledger: N filled, these are the only holes
                        add(g["label"], "filled", "inferred", prov + "; ledger names only the holes, so every other slot is filled (slot arithmetic)", g["year"], g["mint"], g["variety"], g["key"])
                    elif filled_names is not None and hole_names is None and v["evidence"] == "enumerated":
                        add(g["label"], "empty", "inferred", prov + "; ledger names only the filled slots", g["year"], g["mint"], g["variety"], g["key"])
                    else:
                        add(g["label"], "unknown", "unknown", prov + "; slot named from the layout only, the ledger does not say whether it is filled", g["year"], g["mint"], g["variety"], g["key"])
                grid_src = "ledger+whitman-model" if (filled_names or hole_names) else "whitman-model"
    if grid_src == "none":
        for x in (filled_names or []): add(x, "filled", "ledger")
        for x in (hole_names or []): add(x, "empty", "ledger")
        if slots: grid_src = "ledger"
        if v.get("unaccounted"):
            for _ in range(v["unaccounted"]):
                add(None, "unknown", "unknown", "slot arithmetic: the ledger states %d slots and accounts for %d" % (total, total - v["unaccounted"]))
    # volume-level consistency checks (the ledger's own arithmetic)
    nf = sum(1 for s in slots if s["state"] == "filled"); ne = sum(1 for s in slots if s["state"] == "empty")
    if total is not None and len(slots) > total: issues.append(f"{vid}: {len(slots)} named slots exceed slots_total {total}")
    if nf > claimed: issues.append(f"{vid}: {nf} slots named filled exceed the claimed count {claimed}")
    if total is not None and ne > total - claimed: issues.append(f"{vid}: {ne} slots named empty exceed missing-by-count {total - claimed}")
    y0, y1 = title_years(v["title"])
    needs_scan = v["evidence"] != "enumerated" or bool(v.get("unaccounted")) or bool(v.get("slots_approx"))
    return {"id": vid, "family": v["family"], "binder": meta.get("binder"), "title": v["title"], "whitman": whitman_no(v["title"]),
            "denomination_text": meta.get("denomination_text"), "metal_text": meta.get("metal_text"), "year_start": y0, "year_end": y1,
            "slots_total": total, "slots_total_approx": bool(v.get("slots_approx")), "slots_filled_claimed": claimed, "evidence": v["evidence"],
            "grid_source": grid_src, "needs_scan": needs_scan, "note": v.get("note"), "slots": slots}

def build_all(seed_path=None, meta_path=None):
    seed = json.load(open(seed_path or os.path.join(ROOT, "schema", "seed", "albums.seed.json"), encoding="utf-8"))
    meta = json.load(open(meta_path or os.path.join(HERE, "app_meta.json"), encoding="utf-8"))["volumes"]
    issues = []
    vols = [build_volume(v, meta.get(v["id"], {}), issues) for v in sorted(seed["volumes"], key=lambda x: x["id"])]
    return vols, issues, seed

if __name__ == "__main__":
    sys.path.insert(0, HERE)
    import album_calc
    vols, issues, seed = build_all()
    print("issues:", issues or "none")
    tot = {}
    for v in vols:
        c = album_calc.summary(v)
        print(f"{v['id']} total={v['slots_total']} claimed={v['slots_filled_claimed']} named={len(v['slots'])} missing={c['missing']} grid={v['grid_source']} scan={v['needs_scan']}")
        for s in v["slots"]: tot[(s["state"], s["occupant_status"])] = tot.get((s["state"], s["occupant_status"]), 0) + 1
    print(tot)
