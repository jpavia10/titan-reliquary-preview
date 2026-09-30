#!/usr/bin/env python3
"""Migrate the v1 data (data/index.json + data/detail/*.json + app.js album table) to schema v2.

usage (repo root):  python3 tools/schema/migrate_v1_to_v2.py OUT_DIR
Writes OUT_DIR/{manifest,boot,lots,albums,prov}.json, ref/*.json, types/{ISO}.json, specimens/{ISO}.json, report.json.

Rules: never guess silently. Whatever a parser cannot read is kept as raw text AND listed in report.json ("unparsed").
Display strings (continent_line, year_line, denom_line, face_line, label) are NOT migrated; they are derived again at build time.
"""
import glob, gzip, json, os, re, subprocess, sys, collections

V1 = "data"
ENC = dict(ensure_ascii=False, sort_keys=True)

def dump(path, obj, indent=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=indent, separators=(",", ":") if indent is None else None, **ENC)

def gz(obj):
    return len(gzip.compress(json.dumps(obj, separators=(",", ":"), **ENC).encode("utf-8"), 9))

def raw(obj):
    return len(json.dumps(obj, separators=(",", ":"), **ENC).encode("utf-8"))

# ---------- field parsers (each returns parsed value or None; caller records failures) ----------
def parse_year(y):
    r = str(y).strip()
    if re.fullmatch(r"\d{4}", r): return {"year": int(r), "qualifier": None}
    m = re.fullmatch(r"ca\.?\s*(\d{4})s?", r, re.I)
    if m: return {"year": int(m.group(1)), "qualifier": "circa", "decade": r.lower().endswith("s")}
    if r.upper() == "ND": return {"year": None, "qualifier": "ND"}
    m = re.match(r"AH\s*(\d+)\s*\((\d{4})\)", r)
    if m: return {"year": int(m.group(2)), "qualifier": None, "calendar": "AH", "calendar_year": int(m.group(1))}
    return None

def parse_denom(text, denom_line):
    t = str(text).strip()
    cur = None
    m = re.search(r"·\s*([A-Z]{3})\s*$", str(denom_line or ""))
    if m: cur = m.group(1)
    m = re.match(r"^([$£€¥₹])?\s*(\d+(?:\.\d+)?)\s*(.*)$", t)
    if not m: return {"value": None, "unit": t, "currency": cur}, False
    unit = ((m.group(1) or "") + " " + m.group(3)).strip()
    return {"value": float(m.group(2)), "unit": unit, "currency": cur}, True

EDGE = ("plain", "reeded", "lettered", "ornamented", "milled", "smooth", "segmented", "security", "interrupted")
COND = ("circulated", "BU", "AU", "XF", "VF", "toned", "uncirculated", "proof")
def parse_metal(text):
    segs = [s.strip() for s in str(text).split(" · ")]
    out = {"composition": segs[0] if segs else "", "weight_g": None, "weight_approx": False, "diameter_mm": None,
           "diameter_approx": False, "edge": None, "asw_oz": None, "condition_text": None, "extra": []}
    for s in segs[1:]:
        m = re.fullmatch(r"(~?)([\d.]+)\s*g", s)
        if m: out["weight_g"] = float(m.group(2)); out["weight_approx"] = bool(m.group(1)); continue
        m = re.fullmatch(r"(~?)([\d.]+)\s*mm", s)
        if m: out["diameter_mm"] = float(m.group(2)); out["diameter_approx"] = bool(m.group(1)); continue
        m = re.match(r"ASW\s*~?([\d.]+)\s*oz", s)
        if m: out["asw_oz"] = float(m.group(1)); continue
        if s.lower().startswith(EDGE): out["edge"] = s; continue
        if any(s.lower().startswith(c.lower()) for c in COND): out["condition_text"] = s; continue
        out["extra"].append(s)
    return out

def metal_class(comp):
    c = comp.lower()
    for k, v in (("silver", "silver"), (" ag", "silver"), ("sterling", "silver"), ("gold", "gold"), ("cupronickel", "cupronickel"), ("cuni", "cupronickel"),
                 ("nickel-plated", "plated steel"), ("copper-plated", "plated steel"), ("steel", "steel"), ("aluminum", "aluminum"),
                 ("bronze", "bronze"), ("nordic", "brass"), ("brass", "brass"), ("copper", "copper"), ("zinc", "zinc"), ("nickel", "nickel")):
        if k in c or c.endswith(k.strip()): return v
    return "other"

def fineness(comp):
    m = re.search(r"\.(\d{3})\b", comp)
    if m: return float("0." + m.group(1))
    m = re.search(r"(\d{2})\s*%\s*silver", comp, re.I)
    return int(m.group(1)) / 100 if m else None

def parse_specs(text):
    t = str(text)
    m = re.search(r"thickness\s*([\d.]+)\s*mm", t)
    a = re.search(r"\b(coin|medal)\s+alignment", t)
    return (float(m.group(1)) if m else None), (a.group(1) if a else None)

def parse_refs(refs):
    return [{"system": s, "number": n} for s, n in re.findall(r"([A-Za-zÖöüÜ]+)#\s*([\w.\-/]+)", str(refs))]

def parse_tender(t):
    l = str(t).lower()
    if l.startswith("still legal tender"): return {"status": "current"}
    if "demonetiz" in l or "demonetis" in l:
        m = re.search(r"(\d{4}-\d{2}-\d{2})", l); return {"status": "demonetized", "until": m.group(1) if m else None}
    if "not legal tender" in l: return {"status": "none"}
    return None

def parse_mint(year_line, index_mint):
    m = re.search(r"Mint:\s*(.+)$", str(year_line))
    body = m.group(1) if m else str(index_mint or "")
    parts = [p.strip() for p in body.split(" · ")]
    marks_raw = parts[0]
    marks = [x.strip() for x in re.split(r"\s*/\s*", marks_raw) if re.fullmatch(r"[A-Za-z]{1,3}", x.strip())]
    return {"marks": marks, "text": body}

def parse_mintage(t):
    m = re.search(r"\d{1,3}(?:,\d{3})+|\d{4,}", str(t))
    return int(m.group(0).replace(",", "")) if m else None

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")

def housing_kind(parked):
    p = str(parked).lower()
    for k, v in (("staple flip", "flip_2x2"), ("slab", "slab"), ("tube", "tube"), ("album", "album"), ("capsule", "capsule"), ("box", "box"), ("pouch", "pouch")):
        if k in p: return v
    return "other" if p else None

def class_of(cat):
    c = str(cat).lower()
    if "prop" in c: return "prop"
    if "token" in c or "exonumia" in c: return "token"
    if "medal" in c: return "medal"
    return "coin"

def load_albums():
    src = open("app.js", encoding="utf-8").read()
    i = src.index("const ALBUM_METADATA = {"); j = src.index("{", i); d = 0
    for k in range(j, len(src)):
        d += (src[k] == "{") - (src[k] == "}")
        if d == 0: break
    js = src[j:k + 1]
    code = "console.log(JSON.stringify(" + "(" + js + ")" + "))"
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)

def main(out):
    idx = json.load(open(f"{V1}/index.json", encoding="utf-8"))
    det = {}
    for p in sorted(glob.glob(f"{V1}/detail/*.json")): det.update(json.load(open(p, encoding="utf-8")))
    rep = {"unparsed": collections.defaultdict(list), "conflicts": [], "counts": {}}
    countries, types, specimens = {}, {}, collections.defaultdict(dict)
    type_specs = collections.defaultdict(list)

    for f in idx["flips"]:
        d = det[f["scan"]]
        iso = f["iso"]
        prev = countries.setdefault(iso, {"name": f["country"], "continent": f["continent"]})
        if prev["name"] != f["country"]: rep["conflicts"].append(f"country name for {iso}: {prev['name']} vs {f['country']}")
        yr = parse_year(f["year"])
        if yr is None: rep["unparsed"]["year"].append((f["scan"], f["year"])); yr = {"year": None, "qualifier": "unparsed"}
        den, ok = parse_denom(f["denom"], d.get("denom_line"))
        if not ok: rep["unparsed"]["denomination"].append((f["scan"], f["denom"]))
        met = parse_metal(d.get("metal", ""))
        if met["weight_g"] is None: rep["unparsed"]["weight_g"].append((f["scan"], d.get("metal", "")[:60]))
        thick, align = parse_specs(d.get("specs", ""))
        refs = parse_refs(d.get("refs", ""))
        km = next((r["number"] for r in refs if r["system"] == "KM"), None)
        if km is None: rep["unparsed"]["km"].append((f["scan"], d.get("refs", "")[:50]))
        tender = parse_tender(d.get("tender", ""))
        if tender is None: rep["unparsed"]["tender"].append((f["scan"], d.get("tender", "")[:60]))
        mint = parse_mint(d.get("year_line"), f.get("mint"))
        cls = class_of(d.get("cat"))
        tkey = f"{iso}.KM.{km.lower()}" if km else f"{iso}.X.{slug(f['denom'])}"
        design_txt = d.get("design", "")
        tinfo = {"id": tkey, "country": iso, "class": cls, "denomination": den, "catalogs": refs,
                 "composition": {"text": met["composition"], "metal_class": metal_class(met["composition"]), "fineness": fineness(met["composition"])},
                 "nominal": {"weight_g": met["weight_g"], "weight_approx": met["weight_approx"], "diameter_mm": met["diameter_mm"], "diameter_approx": met["diameter_approx"], "thickness_mm": thick, "edge": met["edge"], "alignment": align},
                 "precious": {"asw_oz": met["asw_oz"] if met["asw_oz"] is not None else d.get("asw_oz")},
                 "design": {"text": design_txt}, "legal_tender": dict(tender or {"status": "unknown"}, text=d.get("tender", "")), "issues": []}
        type_specs[tkey].append((f["scan"], tinfo))
        issue = {"year": yr["year"], "qualifier": yr["qualifier"], "mint_marks": mint["marks"], "mint_text": mint["text"], "mintage": parse_mintage(d.get("mintage", "")), "mintage_text": d.get("mintage", "")}
        if yr.get("calendar"): issue.update(calendar=yr["calendar"], calendar_year=yr["calendar_year"])
        if yr.get("decade"): issue["decade"] = True
        specimens[iso][f["scan"]] = {
            "id": f["scan"], "ser": f["ser"], "type": tkey, "issue": issue,
            "year_raw": str(f["year"]),
            "condition": {"text": met["condition_text"], "grade": None, "grader": None, "cert": None, "toning": None, "cleaned": None},
            "measured": {"weight_g": None, "diameter_mm": d.get("diameter_mm"), "thickness_mm": None},
            "housing": {"kind": housing_kind(d.get("parked")), "text": d.get("parked"), "location": None},
            "acquisition": {"logged_at": f["added"], "acquired_on": None, "source": None, "price_paid_usd": None, "family": None},
            "value": {"est_usd": f["est"], "confidence": f["conf"], "face": {"amount": den["value"], "currency": den["currency"]}},
            "lifecycle": {"status": f["status"], "removed_on": None, "removed_reason": None},
            "story": None, "tags": [], "notes": d.get("notes", ""), "photos": [],
        }
        issue_key = (yr["year"], tuple(mint["marks"]))
        tinfo["_issue"] = issue

    # collapse specimens of the same type into one Type record; report field conflicts among them
    for tkey, lst in type_specs.items():
        base = lst[0][1]
        issues = {}
        for scan, t in lst:
            iss = t.pop("_issue"); issues[(iss["year"], tuple(iss["mint_marks"]))] = iss
            for fld in (("design", "text"), ("legal_tender", "text"), ("nominal", "weight_g"), ("nominal", "diameter_mm"), ("composition", "text")):
                a, b = base[fld[0]][fld[1]], t[fld[0]][fld[1]]
                if a != b: rep["conflicts"].append(f"type {tkey}: {fld[0]}.{fld[1]} differs on {lst[0][0]} vs {scan}")
        base.pop("_issue", None)
        base["issues"] = sorted(issues.values(), key=lambda i: (i["year"] or 0, i["mint_text"]))
        types[tkey] = base

    by_iso_types = collections.defaultdict(dict)
    for k, t in types.items(): by_iso_types[t["country"]][k] = t

    # lots: bullion, sets, housing, stamps (kept generic; their own schema is small)
    lots = []
    for kind in ("bullion", "sets", "housing", "stamps"):
        for r in idx.get(kind, []):
            lots.append({"id": r["scan"], "kind": kind.rstrip("s") if kind != "housing" else "housing", "country": r.get("country"), "year_raw": r.get("year"),
                         "denom_text": r.get("denom"), "composition_text": r.get("metal"), "qty": r.get("qty_n"), "asw_oz": r.get("asw_oz"), "agw_oz": r.get("agw_oz"),
                         "est_usd": r.get("est"), "melt_usd": r.get("melt"), "confidence": r.get("conf"), "storage_text": r.get("parked"), "notes": r.get("notes", ""), "logged_at": r.get("added")})

    # albums
    meta = load_albums(); albums = []; bad = 0
    for fam, m in meta.items():
        for vid, v in m.get("volumes", {}).items():
            missing = v["totalSlots"] - v["filled"]; listed = len(v.get("holes", []))
            ok = missing == listed
            bad += not ok
            albums.append({"id": vid, "family": fam, "binder": m.get("binderType"), "title": v["title"], "denomination_text": v["denom"], "metal_text": v["metal"],
                           "year_start": v["startYear"], "year_end": v["endYear"], "slots_total": v["totalSlots"], "slots_filled_claimed": v["filled"],
                           "holes_listed": v.get("holes", []), "audit": {"missing_by_count": missing, "holes_listed": listed, "consistent": ok}})

    # ---- boot payload: columnar, integer-coded ----
    iso_list = sorted(countries); iso_ix = {k: i for i, k in enumerate(iso_list)}
    type_list = sorted(types); type_ix = {k: i for i, k in enumerate(type_list)}
    den_list = sorted({s["issue"] and types[s["type"]]["denomination"]["unit"] for iso in specimens for s in specimens[iso].values()}); den_ix = {k: i for i, k in enumerate(den_list)}
    conf_ix = {"low": 0, "med": 1, "high": 2}; status_ix = {"Logged": 0, "Photographed": 1, "Verified": 2, "Removed": 3}
    rows = [s for iso in iso_list for s in specimens[iso].values()]
    rows.sort(key=lambda s: int(re.sub(r"\D", "", s["id"])))
    boot = {"v": 2, "cols": ["id", "ser", "iso", "year", "yq", "denom_v", "denom_u", "est_cents", "conf", "status", "flags", "type"],
            "yq": ["", "circa", "ND", "unparsed"], "iso": iso_list, "denom_units": den_list, "types": type_list,
            "rows": [[int(re.sub(r"\D", "", s["id"])), s["ser"].split("-", 1)[1] if False else s["ser"], iso_ix[s["type"].split(".")[0]], s["issue"]["year"],
                      ["", "circa", "ND", "unparsed"].index(s["issue"]["qualifier"] or ""), types[s["type"]]["denomination"]["value"],
                      den_ix[types[s["type"]]["denomination"]["unit"]], round(s["value"]["est_usd"] * 100), conf_ix[s["value"]["confidence"]],
                      status_ix[s["lifecycle"]["status"]], 0, type_ix[s["type"]]] for s in rows]}

    # ---- write ----
    os.makedirs(out, exist_ok=True)
    for iso, d in by_iso_types.items(): dump(f"{out}/types/{iso}.json", d)
    for iso, d in specimens.items(): dump(f"{out}/specimens/{iso}.json", d)
    dump(f"{out}/ref/issuers.json", [{"id": k, "name": v["name"], "iso": k, "continent": v["continent"], "from": None, "to": None, "successor": None} for k, v in sorted(countries.items())]);
    dump(f"{out}/ref/countries.json", countries); dump(f"{out}/boot.json", boot); dump(f"{out}/lots.json", lots); dump(f"{out}/albums.json", albums)
    dump(f"{out}/prov.json", {"default": {"source": "ledger:v252 (AI-researched + owner cues)", "verified": False, "migrated_by": "migrate_v1_to_v2.py"}})

    flips_v1 = idx["flips"]
    v1_detail = {k: det[k] for k in (f["scan"] for f in flips_v1)}
    v2_spec = {s["id"]: s for iso in specimens for s in specimens[iso].values()}
    n = len(flips_v1)
    tp = lambda name: n - len(rep["unparsed"].get(name, []))
    rep["counts"] = {"specimens": n, "types": len(types), "types_shared_by_multiple_specimens": sum(1 for t in type_specs.values() if len(t) > 1),
                     "lots": len(lots), "albums_volumes": len(albums), "albums_inconsistent": bad, "countries": len(countries),
                     "parse_ok": {k: f"{tp(k)}/{n}" for k in ("year", "denomination", "weight_g", "km", "tender")}}
    rep["size"] = {"v1_flips_in_index_raw": raw(flips_v1), "v1_flips_in_index_gz": gz(flips_v1),
                   "v1_index_all_raw": raw(idx), "v1_index_all_gz": gz(idx),
                   "v2_boot_raw": raw(boot), "v2_boot_gz": gz(boot),
                   "v1_detail_flips_raw": raw(v1_detail), "v1_detail_flips_gz": gz(v1_detail),
                   "v2_specimens_raw": raw(v2_spec), "v2_specimens_gz": gz(v2_spec),
                   "v2_types_raw": raw(types), "v2_types_gz": gz(types),
                   "v2_specimens_plus_types_raw": raw([v2_spec, types]), "v2_specimens_plus_types_gz": gz([v2_spec, types])}
    rep["unparsed"] = {k: v for k, v in rep["unparsed"].items()}
    dump(f"{out}/report.json", rep, indent=1)
    dump(f"{out}/manifest.json", {"schema_version": "2.0.0-draft", "source": "v1 ledger v252", "counts": rep["counts"]}, indent=1)
    print(json.dumps(rep["counts"], indent=1)); print(json.dumps(rep["size"], indent=1))
    print("unparsed:", {k: len(v) for k, v in rep["unparsed"].items()}, "| conflicts:", len(rep["conflicts"]))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "build/v2")
