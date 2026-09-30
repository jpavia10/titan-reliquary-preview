#!/usr/bin/env python3
"""Bootstrap the v2 collection master from the pipeline's v1 output (Grok's ledger export).

usage (repo root):   python3 tools/schema/migrate_v1_to_v2.py SRC OUT [--force] [--report FILE]
    SRC   the pipeline's data/ folder, or the repo root that contains data/ (and version.json next to it)
    OUT   output folder, normally collection/

ONE-TIME BOOTSTRAP. After this run collection/ IS the master: agents edit it directly and append ChangeEvents.
The script therefore refuses to write into a folder that already holds a manifest.json unless --force is given
(--force rebuilds from the ledger and DISCARDS every later change, so do not use it on the live master).

Rules: never guess silently. Whatever a parser cannot read is kept as raw text and listed in the --report.
Curation (tools/schema/curation.py) then resolves what the data can settle; each change is a ChangeEvent in changes.jsonl and
each question the data cannot settle is listed in CURATION_OPEN.md. Display strings (continent_line, year_line, denom_line,
face_line, label) are NOT migrated; fmt.py derives them. Nothing parsed from a description is stored as a measurement:
specimen.measured stays null until someone measures the piece.
"""
import collections, glob, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "albums"))
import curation as cur
import manifest as mf
import build_slots
import check_totals
import reassign_ser

ENC = dict(ensure_ascii=False, sort_keys=True)
SCHEMA_VERSION = "2.0.0"
J = lambda o: json.dumps(o, separators=(",", ":"), **ENC)

# kept for tools/albums/build_seed.py (compares the ledger with the hand-typed table in app.js); the migration itself does not use it
def load_albums():
    src = open("app.js", encoding="utf-8").read()
    i = src.index("const ALBUM_METADATA = {"); j = src.index("{", i); d = 0
    for k in range(j, len(src)):
        d += (src[k] == "{") - (src[k] == "}")
        if d == 0: break
    js = src[j:k + 1]
    code = "console.log(JSON.stringify(" + "(" + js + ")" + "))"
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)


# ---------- writers (one record per line: small, readable git diffs) ----------
def w(path, text):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f: f.write(text)

def dump_map(path, m):
    w(path, "{\n" + ",\n".join(f"{json.dumps(k, ensure_ascii=False)}:{J(v)}" for k, v in sorted(m.items())) + "\n}\n")

def dump_list(path, rows):
    w(path, "[\n" + ",\n".join(J(r) for r in rows) + "\n]\n")

def dump_jsonl(path, rows):
    w(path, "".join(J(r) + "\n" for r in rows))

def dump_albums(path, vols):
    parts = []
    for v in vols:
        head = {k: x for k, x in v.items() if k != "slots"}
        parts.append(J(head)[:-1] + ',"slots":[\n' + ",\n".join("  " + J(s) for s in v["slots"]) + "\n]}")
    w(path, "[\n" + ",\n".join(parts) + "\n]\n")

# ---------- text helpers ----------
def split_segs(text, sep=" · "):
    out, depth, cur_, i = [], 0, "", 0
    t = str(text)
    while i < len(t):
        ch = t[i]
        depth += (ch == "(") - (ch == ")")
        if depth <= 0 and t.startswith(sep, i):
            out.append(cur_.strip()); cur_ = ""; i += len(sep); continue
        cur_ += ch; i += 1
    out.append(cur_.strip())
    return out

def num(s): return float(s)

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

def parse_currency(denom_line):
    m = re.search(r"·\s*([A-Z]{3})\b", str(denom_line or ""))
    return m.group(1) if m else None

def parse_denom(text, denom_line):
    t = str(text).strip(); cur_ = parse_currency(denom_line)
    m = re.match(r"^([$£€¥₹])?\s*(\d+)\s*/\s*(\d+)\s+(.*)$", t)             # 1/2 franc
    if m and int(m.group(3)): return {"value": int(m.group(2)) / int(m.group(3)), "unit": ((m.group(1) or "") + " " + m.group(4)).strip(), "currency": cur_}, True
    m = re.match(r"^([$£€¥₹])?\s*(\d+(?:\.\d+)?)\s*(.*)$", t)
    if not m: return {"value": None, "unit": t, "currency": cur_}, False
    unit = ((m.group(1) or "") + " " + m.group(3)).strip()
    v = float(m.group(2))
    return {"value": v, "unit": unit, "currency": cur_}, True

EDGE = ("plain", "reeded", "lettered", "ornamented", "milled", "smooth", "segmented", "security", "interrupted")
COND = ("circulated", "BU", "AU", "XF", "VF", "toned", "uncirculated", "proof")
NUM = r"(~?)(\d+(?:\.\d+)?)"

def meas(text, unit):
    """(value, approx, min, max) for a measurement like '4.40 g', '~1.41 g', '~5–5.5 g'; None when absent."""
    m = re.fullmatch(NUM + r"\s*[–-]\s*(\d+(?:\.\d+)?)\s*" + unit, text.strip())
    if m: return (None, True, num(m.group(2)), num(m.group(3)))
    m = re.fullmatch(NUM + r"\s*" + unit, text.strip())
    if m: return (num(m.group(2)), bool(m.group(1)), None, None)
    return None

def find_meas(text, unit, label=None):
    pre = (label + r"\s*") if label else r"(?<![\d.])"
    m = re.search(pre + NUM + r"\s*[–-]\s*(\d+(?:\.\d+)?)\s*" + unit + r"\b", text)
    if m: return (None, True, num(m.group(2)), num(m.group(3)))
    m = re.search(pre + NUM + r"\s*" + unit + r"\b", text)
    if m: return (num(m.group(2)), bool(m.group(1)), None, None)
    return None

def parse_metal(text, specs):
    segs = split_segs(text)
    comp = segs[0] if segs else ""
    out = {"composition": comp, "weight": None, "diameter": None, "edge": None, "asw_oz": None, "condition_text": None, "shape": None, "extra": [], "src": {}}
    pm = re.search(r"\(([^)]*)\)", comp)
    if pm and re.search(r"\b(g|mm)\b", pm.group(1)):                        # 'copper (~6.3–6.9 g · ~25 mm)'
        for piece in split_segs(pm.group(1)):
            g = meas(piece, "g"); d = meas(piece, "mm")
            if g and not out["weight"]: out["weight"] = g; out["src"]["weight"] = f"metal text (inside parentheses): '{piece}'"
            if d and not out["diameter"]: out["diameter"] = d; out["src"]["diameter"] = f"metal text (inside parentheses): '{piece}'"
        out["composition"] = re.sub(r"\s*\([^)]*\b(?:g|mm)\b[^)]*\)", "", comp).strip()
    for s in segs[1:]:
        g = meas(s, "g")
        if g: out["weight"] = g; out["src"]["weight"] = f"metal text: '{s}'"; continue
        d = meas(s, "mm")
        if d: out["diameter"] = d; out["src"]["diameter"] = f"metal text: '{s}'"; continue
        m = re.match(r"ASW\s*~?([\d.]+)\s*oz", s)
        if m: out["asw_oz"] = float(m.group(1)); continue
        if s.lower().startswith(EDGE) and not re.search(r"stock|paper|note", s, re.I): out["edge"] = s; continue
        if any(s.lower().startswith(c.lower()) for c in COND): out["condition_text"] = s; continue
        if re.search(r"heptagon", s, re.I): out["shape"] = "heptagonal (7-sided)"; continue
        if re.search(r"scalloped", s, re.I): out["shape"] = "scalloped (7-lobed)"; continue
        out["extra"].append(s)
    sp = str(specs)
    if not out["weight"]:
        g = find_meas(sp, "g", r"(?:weight|each)")
        if g: out["weight"] = g; out["src"]["weight"] = "specs text"
    if not out["diameter"]:
        d = find_meas(sp, "mm", r"diameter")
        if d: out["diameter"] = d; out["src"]["diameter"] = "specs text"
    for piece in split_segs(sp):                       # unlabeled segments such as 'each ~5.67 g · 24.3 mm'
        body = re.sub(r"^(?:each|weight|diameter)\s*", "", piece)
        if not out["diameter"]:
            d = meas(body, "mm")
            if d: out["diameter"] = d; out["src"]["diameter"] = f"specs text: '{piece}'"
    return out

def strip_paren(c): return re.sub(r"\([^)]*\)", "", c)

def _one_class(c):
    if re.search(r"paper|slug", c): return "other"
    if "bimetal" in c: return "bimetallic"
    if re.search(r"clad", c) and not re.search(r"plated", c): return "clad"
    if "plated" in c: return "plated steel"
    if "nordic" in c: return "brass"
    if re.search(r"sterling|silver|\bag\b", c): return "silver"
    if "gold" in c: return "gold"
    if re.search(r"aluminum-bronze|aluminium-bronze|aluminum-nickel bronze|al-bronze", c): return "bronze"
    if "bronze" in c: return "bronze"
    if "brass" in c: return "brass"
    if re.search(r"cupronickel|cuni|cu-ni|copper-nickel|copper nickel", c): return "cupronickel"
    if re.search(r"aluminum|aluminium", c): return "aluminum"
    if re.search(r"stainless|acmonital|steel", c): return "steel"
    if "nickel" in c: return "nickel"
    if "copper" in c: return "copper"
    if "zinc" in c: return "zinc"
    if "iron" in c: return "iron"
    return "other"

def metal_class(comp):
    base = strip_paren(comp.lower())
    parts = [p for p in re.split(r"\s+/\s+|(?<=[a-z])/(?=[a-z])", base) if p.strip()]
    classes = {_one_class(p) for p in parts}
    return classes.pop() if len(classes) == 1 else "other"

def fineness(comp):
    m = re.search(r"(?<![\d])\.(\d{3})\b", comp)
    if m: return float("0." + m.group(1))
    m = re.search(r"(\d{2})\s*%\s*silver", comp, re.I)
    return int(m.group(1)) / 100 if m else None

def parse_specs(text):
    t = str(text)
    m = re.search(r"thickness\s*~?\s*([\d.]+)\s*mm", t)
    a = re.search(r"\b(coin|medal)\s+alignment", t)
    return (float(m.group(1)) if m else None), (a.group(1) if a else None)

SYS = {"KM": "KM", "Y": "Y", "Schön": "Sch", "Schon": "Sch", "JNDA": "JNDA"}
def parse_refs(refs):
    return [{"system": s, "number": n} for s, n in re.findall(r"([A-Za-zÖöüÜ]+)#\s*([\w.\-/]+)", str(refs))]

def type_key(prefix, refs, denom_text):
    for sysname in ("KM", "Y", "Schön", "JNDA"):
        r = next((x for x in refs if x["system"] == sysname), None)
        if r: return f"{prefix}.{SYS[sysname]}.{r['number'].lower()}", sysname
    return f"{prefix}.X.{slug(denom_text)}", None

def parse_tender(t):
    l = str(t).lower()
    if l.startswith("still legal tender"): return {"status": "current"}
    if "demonetiz" in l or "demonetis" in l:
        m = re.search(r"(\d{4}-\d{2}-\d{2})", l) or re.search(r"demonetiz\w*[^0-9]{0,12}(\d{4})", l)
        return {"status": "demonetized", "until": m.group(1) if m else None}
    if l.startswith("withdrawn"):
        m = re.search(r"(\d{4}-\d{2}-\d{2})", l) or re.search(r"withdrawn\D{0,12}(\d{4})", l)
        return {"status": "withdrawn", "until": m.group(1) if m else None}
    if "not legal tender" in l: return {"status": "none"}
    return None

def parse_mint(year_line, index_mint):
    m = re.search(r"Mint:\s*(.+)$", str(year_line))
    body = m.group(1) if m else str(index_mint or "")
    first = split_segs(body)[0]
    marks = []
    if not re.match(r"(?i)\s*(unknown|n/a|not\b|mixed)", first):
        marks = [x.strip() for x in re.split(r"\s*/\s*", first) if re.fullmatch(r"[A-Z][A-Za-z]{0,2}", x.strip())]
    return {"marks": marks, "text": body}

def parse_mintage(t):
    if re.match(r"\s*(unknown|n/a|none)", str(t), re.I): return None      # 'unknown (... dated-1914 ...)' must not yield 1914
    m = re.search(r"\d{1,3}(?:,\d{3})+|\d{4,}", str(t))
    return int(m.group(0).replace(",", "")) if m else None

def parse_face(face_line, type_cur, iso):
    """Face amount in the currency's MAJOR unit, e.g. 50 øre -> 0.5 NOK. The stale FX '(~$1.23)' is dropped."""
    m = re.match(r"^\s*([A-Z]{0,2}[$£€¥₹])?\s*(\d+(?:\.\d+)?)(?![\w.])\s*([A-Z]{3})?", str(face_line or ""))
    if not m: return {"amount": None, "currency": None}
    sym = {"£": "GBP", "€": "EUR", "¥": "JPY", "₹": "INR"}.get(m.group(1) or "", None)
    if m.group(1) and m.group(1).endswith("$"): sym = type_cur or ("USD" if iso == "US" and m.group(1) == "$" else None)
    return {"amount": float(m.group(2)), "currency": m.group(3) or sym or type_cur}

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

TIER2_TYPE = ("series", "population", "price_guide", "die_variety", "error_type", "rarity_scale", "related_types", "image_ref")
TIER2_SPEC = ("seller_type", "invoice_ref", "provenance_chain", "insurance", "storage_env", "featured", "sort_weight", "sentimental",
              "want_priority", "disposal_plan", "authenticity", "related_specimens", "tax_lot")

def get_path(d, path):
    for p in path.split("."): d = d[p]
    return d

def set_path(d, path, v):
    ps = path.split(".")
    for p in ps[:-1]: d = d[p]
    d[ps[-1]] = v

CHECKED = ("design.text", "composition.text", "legal_tender", "catalogs", "denomination", "nominal.weight_g", "nominal.weight_min_g", "nominal.weight_max_g",
           "nominal.diameter_mm", "nominal.diameter_min_mm", "nominal.diameter_max_mm", "nominal.edge", "nominal.shape", "nominal.thickness_mm", "nominal.alignment", "issuer")

# ---------------------------------------------------------------------------------------------------------------------
def build(src):
    data = src if os.path.exists(os.path.join(src, "index.json")) else os.path.join(src, "data")
    idx = json.load(open(os.path.join(data, "index.json"), encoding="utf-8"))
    det = {}
    for p in sorted(glob.glob(os.path.join(data, "detail", "*.json"))): det.update(json.load(open(p, encoding="utf-8")))
    vpath = os.path.join(os.path.dirname(os.path.abspath(data)), "version.json")
    ver = json.load(open(vpath, encoding="utf-8")) if os.path.exists(vpath) else {}
    ctx = {"idx": idx, "events": [], "open": [], "unparsed": collections.defaultdict(list), "unresolved": [], "ver": ver}

    flips = sorted(idx["flips"], key=lambda f: f["scan"])
    # default issuer name per ISO = the most common country name among non-variant records
    names = collections.defaultdict(collections.Counter); cont = {}
    for f in flips:
        cont[f["iso"]] = f["continent"]
        if f["country"] not in cur.ISSUERS: names[f["iso"]][f["country"]] += 1
    countries = {iso: {"name": c.most_common(1)[0][0], "continent": cont[iso]} for iso, c in names.items()}
    issuers = {iso: {"id": iso, "name": v["name"], "iso": iso, "continent": v["continent"], "from": None, "to": None, "successor": None, "note": None} for iso, v in countries.items()}
    for raw, v in cur.ISSUERS.items():
        if any(f["country"] == raw for f in flips):
            issuers[v["id"]] = {"id": v["id"], "name": v["name"], "iso": v["iso"], "continent": cont[v["iso"]], "from": v["from_"], "to": v["to"], "successor": None, "note": v["note"]}

    specimens = collections.defaultdict(dict); type_specs = collections.defaultdict(list)
    for f in flips:
        d = det[f["scan"]]; iso = f["iso"]; sid = f["scan"]
        yr = parse_year(f["year"])
        if yr is None: ctx["unparsed"]["year"].append((sid, f["year"])); yr = {"year": None, "qualifier": "unparsed"}
        den, ok = parse_denom(f["denom"], d.get("denom_line"))
        if den["currency"] is None: den["currency"] = parse_face(d.get("face_line"), None, iso)["currency"]   # e.g. '10¢ Roosevelt' + '$0.10' -> USD
        if not ok or sid in cur.DENOMS: ctx["unparsed"]["denomination"].append((sid, f["denom"]))
        met = parse_metal(d.get("metal", ""), d.get("specs", ""))
        # the v252 parser read only a single 'N g' segment of the metal field; anything else counts as previously unparsed
        if not (met["weight"] and met["weight"][0] is not None and met["src"].get("weight", "").startswith("metal text: ")): ctx["unparsed"]["weight_g"].append((sid, d.get("metal", "")[:70]))
        thick, align = parse_specs(d.get("specs", ""))
        refs = parse_refs(d.get("refs", ""))
        if not any(r["system"] == "KM" for r in refs): ctx["unparsed"]["km"].append((sid, d.get("refs", "")[:60]))
        tender = parse_tender(d.get("tender", ""))
        if tender is None or tender["status"] == "withdrawn": ctx["unparsed"]["tender"].append((sid, d.get("tender", "")[:60]))
        mint = parse_mint(d.get("year_line"), f.get("mint"))
        raw_country = f["country"]
        issuer_id = cur.ISSUERS[raw_country]["id"] if raw_country in cur.ISSUERS else (iso if raw_country == countries[iso]["name"] else None)
        if issuer_id is None: ctx["open"].append({"kind": "issuer", "ids": [sid], "what": f"country name '{raw_country}' differs from '{countries[iso]['name']}'", "why": "unexpected issuer variant; add it to curation.ISSUERS"}); issuer_id = iso
        tkey, _ = type_key(issuer_id, refs, f["denom"])
        composition = met["composition"]
        w = met["weight"]; dm = met["diameter"]
        nominal = {"weight_g": w[0] if w else None, "weight_approx": bool(w and w[1]), "weight_min_g": w[2] if w else None, "weight_max_g": w[3] if w else None,
                   "diameter_mm": dm[0] if dm else None, "diameter_approx": bool(dm and dm[1]), "diameter_min_mm": dm[2] if dm else None, "diameter_max_mm": dm[3] if dm else None,
                   "thickness_mm": thick, "edge": met["edge"], "shape": met["shape"], "alignment": align}
        tinfo = {"id": tkey, "country": iso, "issuer": issuer_id if issuer_id != iso else None, "class": class_of(d.get("cat")), "denomination": dict(den, named=None, display=None), "catalogs": refs,
                 "composition": {"text": composition, "metal_class": metal_class(composition), "fineness": fineness(met["composition"])},
                 "nominal": nominal, "precious": {"asw_oz": met["asw_oz"] if met["asw_oz"] is not None else d.get("asw_oz"), "agw_oz": d.get("agw_oz")},
                 "design": {"text": d.get("design", ""), "obverse": None, "reverse": None, "designers": [], "legend": None},
                 "legal_tender": dict(tender or {"status": "unknown"}, text=d.get("tender", "")), "issues": [], "tags": []}
        tinfo["legal_tender"].setdefault("until", None)
        for k in TIER2_TYPE: tinfo[k] = None
        type_specs[tkey].append((sid, tinfo, met, raw_country))
        issue = {"year": yr["year"], "qualifier": yr["qualifier"], "mint_marks": mint["marks"], "mint_text": mint["text"], "mintage": parse_mintage(d.get("mintage", "")), "mintage_text": d.get("mintage", "")}
        if yr.get("calendar"): issue.update(calendar=yr["calendar"], calendar_year=yr["calendar_year"])
        if yr.get("decade"): issue["decade"] = True
        tinfo["_issue"] = issue
        notes = d.get("notes", "")
        spec = {"id": sid, "ser": f["ser"], "type": tkey, "issue": issue, "year_raw": str(f["year"]),
                "condition": {"text": met["condition_text"], "grade": None, "grader": None, "cert": None, "strike": None, "luster": None, "toning": None, "cleaned": None, "damage": []},
                "measured": {"weight_g": None, "diameter_mm": None, "thickness_mm": None, "magnetic": None},
                "housing": {"kind": housing_kind(d.get("parked")), "text": d.get("parked"), "location": None},
                "acquisition": {"logged_at": f["added"], "acquired_on": None, "source": None, "price_paid_usd": None, "family": None},
                "value": {"est_usd": f["est"], "confidence": f["conf"], "face": parse_face(d.get("face_line"), den["currency"], iso)},
                "lifecycle": {"status": f["status"], "removed_on": None, "removed_reason": None},
                "story": None, "tags": [], "notes": notes, "photos": [], "serial_number": None}
        for k in TIER2_SPEC: spec[k] = None
        spec["_raw"] = {"denom": f["denom"], "tender": d.get("tender", ""), "country": raw_country, "face_line": d.get("face_line"), "iso": iso}
        specimens[iso][sid] = spec

    # ---- collapse specimens of one type into one Type record; detect field conflicts between siblings ----
    types, variants = {}, {}
    for tkey, lst in type_specs.items():
        base = lst[0][1]
        iss = {}
        for sid, t, met, rc in lst:
            i = t.pop("_issue"); iss.setdefault((i["year"], tuple(i["mint_marks"])), i)
        for path in CHECKED:
            seen = collections.OrderedDict()
            for sid, t, met, rc in lst: seen.setdefault(json.dumps(get_path(t, path), sort_keys=True, ensure_ascii=False), []).append(sid)
            if len(seen) > 1: variants[(tkey, path)] = [{"value": json.loads(k), "specimens": v} for k, v in seen.items()]
        base.pop("_issue", None)
        base["issues"] = sorted(iss.values(), key=lambda i: (i["year"] or 0, i["mint_text"] or ""))
        types[tkey] = base
    ctx.update(flips=flips, det=det, countries=countries, issuers=issuers, specimens=specimens, types=types, variants=variants, type_specs=type_specs, cont=cont)
    return ctx

# ---------------------------------------------------------------------------------------------------------------------
def curate(ctx):
    ev, T, S = ctx["events"], ctx["types"], {s["id"]: s for iso in ctx["specimens"] for s in ctx["specimens"][iso].values()}
    ctx["S"] = S
    tsp = ctx["type_specs"]
    def members(tid): return [sid for sid, *_ in tsp[tid]]

    # 1. type conflicts
    covered = set()
    for (tid, path), vs in sorted(ctx["variants"].items()):
        res = cur.CONFLICTS.get((tid, path))
        nonnull = [v for v in vs if v["value"] is not None]
        if res is None and path.startswith("nominal.") and len(nonnull) == 1:   # a sibling simply has the value the others lack
            set_path(T[tid], path, nonnull[0]["value"])
            cur.event(ctx, "type", tid, path, None, nonnull[0]["value"], f"filled from sibling record {', '.join(nonnull[0]['specimens'])} of the same type; the other record(s) do not state it")
            continue
        if res is None: ctx["unresolved"].append((tid, path, vs)); continue
        covered.add((tid, path))
        old = vs
        if res["new"] == "BASE": new = get_path(T[tid], path)
        else:
            new = res["new"]; set_path(T[tid], path, new)
            if path == "composition.text":
                T[tid]["composition"]["metal_class"] = metal_class(new); T[tid]["composition"]["fineness"] = fineness(new)
            if path == "legal_tender": T[tid]["legal_tender"] = dict(new)
        cur.event(ctx, "type", tid, path, old, new, res["source"])
        if res.get("open"): cur.opened(ctx, "type-conflict", members(tid), f"{tid} {path}", res["open"])
    for key in cur.CONFLICTS:
        if key not in covered: ctx["unresolved"].append((key[0], key[1], "resolution defined but no conflict found (stale entry)"))

    # 2. denominations
    done_types = {}
    for sid, r in cur.DENOMS.items():
        tid = S[sid]["type"]; t = T[tid]
        new = {k: r[k] for k in ("value", "unit", "currency", "named", "display")}
        if tid in done_types:
            if done_types[tid] != new: ctx["unresolved"].append((tid, "denomination", f"{sid} disagrees with an earlier denomination fix"))
            continue
        old_raw = S[sid]["_raw"]["denom"]
        t["denomination"] = new; done_types[tid] = new
        cur.event(ctx, "type", tid, "denomination", old_raw, new, r["source"] + (f" (specimens {', '.join(x for x in cur.DENOMS if S[x]['type'] == tid)})"))
    for sid, serial in cur.SERIALS.items():
        S[sid]["serial_number"] = serial
        cur.event(ctx, "specimen", sid, "serial_number", None, serial, "moved out of the ledger denomination text; a serial is a property of the piece, not of the type")

    # 3. tender
    for sid, r in cur.TENDER.items():
        tid = S[sid]["type"]; old = dict(T[tid]["legal_tender"])
        T[tid]["legal_tender"] = {"status": r["status"], "until": r["until"], "text": old["text"]}
        cur.event(ctx, "type", tid, "legal_tender", {"status": "unknown", "raw_text": old["text"]}, T[tid]["legal_tender"], r["source"])
        if r.get("open"): cur.opened(ctx, "tender", [sid], f"{tid} legal tender", r["open"])

    # 4. catalog priority (missing KM#): the type id moved from ISO.X.* to the next catalog in the priority list
    for tid, lst in sorted(tsp.items()):
        t = T[tid]
        km = any(c["system"] == "KM" for c in t["catalogs"])
        if not km and ".X." not in tid:
            for sid, *_ in lst:
                cur.event(ctx, "specimen", sid, "type", None, tid, f"ledger refs '{ctx['det'][sid]['refs'][:70]}' carry no KM#; type keyed by the next catalog in the priority KM > Y > Schön > JNDA (SCHEMA_V2 section 3)")
        if not km and ".X." in tid:
            for sid, *_ in lst:
                if sid in ("T001", "T002", "T003", "T004", "T005", "T006", "C023"): continue
                cur.event(ctx, "specimen", sid, "type", None, tid, "no catalog number in the ledger refs; type keyed by denomination slug")

    # 5. weights the v252 parser could not read (26 specimens): read from specs text, kept as ranges, or left null
    seen_t, bare_ids, range_ids = set(), [], []
    for sid, raw in ctx["unparsed"].get("weight_g", []):
        tid = S[sid]["type"]; t = T[tid]; n = t["nominal"]
        src = next(m["src"].get("weight", "") for x, _, m, _ in tsp[tid] if x == sid)
        if n["weight_g"] is None and n["weight_min_g"] is None: bare_ids.append(sid)
        elif n["weight_g"] is None: range_ids.append(sid)
        if tid in seen_t: continue
        seen_t.add(tid)
        if n["weight_g"] is not None:
            cur.event(ctx, "type", tid, "nominal.weight_g", None, n["weight_g"], f"parsed from the ledger record of {sid}: {src}; the v252 parser read only a bare 'N g' segment of the metal field")
        elif n["weight_min_g"] is not None:
            cur.event(ctx, "type", tid, "nominal.weight_min_g/weight_max_g", None, [n["weight_min_g"], n["weight_max_g"]], f"ledger gives a range for {sid} ({src}); kept as a range, weight_g stays null, weight_approx true")
    if bare_ids:
        cur.opened(ctx, "weight", bare_ids, "No weight anywhere in the ledger record", "Kept null. Give the catalogue weight or weigh the piece (Phase 2). Paper prop notes have no standard weight.")
    if range_ids:
        cur.opened(ctx, "weight", range_ids, "Weight is only the ledger's approximate range ('~5–5.5 g')", "Stored as weight_min_g/weight_max_g, weight_g null. Replace with the catalogue weight (Krause/Numista) or a scale reading. Not guessed.")

    # 6. issuer variants
    for raw, v in cur.ISSUERS.items():
        ids = [f["scan"] for f in ctx["flips"] if f["country"] == raw]
        if not ids: continue
        cur.event(ctx, "issuer", v["id"], "record", None, ctx["issuers"][v["id"]], f"ledger country name '{raw}' folds an issuer into the country; ISO {v['iso']} cannot express it")
        for tid in sorted({S[i]["type"] for i in ids}):
            cur.event(ctx, "type", tid, "issuer", raw, v["id"], f"ledger country name '{raw}' ({', '.join(ids)}); historical issuer recorded in ref/issuers.json")

    # 7. ledger notes carrying a chapter heading from the markdown source
    for sid, s in sorted(S.items()):
        if "\n" in s["notes"]:
            new = s["notes"].split("\n", 1)[0].rstrip()
            cur.event(ctx, "specimen", sid, "notes", s["notes"], new, "markdown chapter heading from the ledger ('### Chapter ...') leaked into the notes field; removed, the rest is unchanged")
            s["notes"] = new

    # 8. things only the owner can settle
    for o in cur.OPEN_EXTRA:
        o = dict(o)
        if o["ids"] == ["C?? (EC)"]: o["ids"] = [sid for sid, s in sorted(S.items()) if s["_raw"]["iso"] == "EC"]
        ctx["open"].append(o)
    amb = sorted(t["id"] for t in T.values() if t["composition"]["metal_class"] == "other" and t["class"] not in ("prop",))
    if amb:
        cur.opened(ctx, "composition", [sid for tid in amb for sid, *_ in tsp[tid]], "Composition text is ambiguous or not an alloy (types %s)" % ", ".join(amb),
                   "metal_class is 'other'; the ledger text lists alternatives ('brass / CuNi-clad', 'bronze / brass') or an unknown alloy. Confirm the real alloy.")
    return ctx

# ---------------------------------------------------------------------------------------------------------------------
def lots_from(ctx):
    idx = ctx["idx"]; lots = []
    for kind in ("bullion", "sets", "housing", "stamps"):
        for r in idx.get(kind, []):
            k = kind.rstrip("s") if kind != "housing" else "housing"
            asw, agw = r.get("asw_oz"), r.get("agw_oz")
            if asw is None and r.get("is_silver") and k == "bullion":
                m = re.search(r"(\d+(?:\.\d+)?)\s*troy oz", r.get("denom", ""))
                if m:
                    asw = round(float(m.group(1)) * int(r.get("qty_n") or 1), 4)
                    cur.event(ctx, "lot", r["scan"], "asw_oz", None, asw, f"derived: '{m.group(1)} troy oz' (denomination) x quantity {r.get('qty_n') or 1}; ledger convention ASW = troy oz of the .999 piece")
            if asw is None and k == "set":
                m = re.search(r"ASW:?\s*~?([\d.]+)\s*oz", r.get("face_line", ""))
                if m:
                    asw = float(m.group(1)); cur.event(ctx, "lot", r["scan"], "asw_oz", None, asw, "parsed from the ledger value line ('Ag ASW ~%s oz')" % m.group(1))
            lots.append({"id": r["scan"], "kind": k, "country": r.get("country"), "year_raw": r.get("year"), "denom_text": r.get("denom"), "composition_text": r.get("metal"),
                         "qty": r.get("qty_n"), "asw_oz": asw, "agw_oz": agw, "est_usd": r.get("est"), "melt_usd": r.get("melt"), "confidence": r.get("conf"),
                         "storage_text": r.get("parked"), "notes": r.get("notes", ""), "logged_at": r.get("added")})
    return sorted(lots, key=lambda l: l["id"])

def valuations(ctx, lots):
    ver = ctx["ver"]; at = (ver.get("generated_at_iso") or ver.get("generated_at") or "2026-09-30")[:10]
    m = ctx["idx"].get("metals", {}).get("spot", {})
    out = []
    for f in ctx["flips"]:
        d = ctx["det"][f["scan"]]; fl = d.get("face_line", "")
        sp = re.search(r"@\s*\$([\d.]+)/oz", fl)
        melt = bool(re.search(r"Melt:\s*\$([\d.]+)", fl)) and abs(float(re.search(r"Melt:\s*\$([\d.]+)", fl).group(1)) - f["est"]) < 0.005
        out.append({"id": f["scan"], "at": at, "est_usd": f["est"], "method": "melt" if melt else "ai", "spot_ag": float(sp.group(1)) if sp else None, "spot_au": None,
                    "source": f"ledger {ver.get('ledger_version', 'v254')}" + (" (melt at the spot stated in the ledger value line)" if melt else " (AI-researched estimate, owner cues)")})
    for l in lots:
        if l["est_usd"] is None: continue
        r = next(x for k in ("bullion", "sets", "housing", "stamps") for x in ctx["idx"].get(k, []) if x["scan"] == l["id"])
        sp = re.search(r"@\s*\$([\d.]+)/oz", r.get("face_line", ""))
        out.append({"id": l["id"], "at": at, "est_usd": l["est_usd"], "method": "melt" if l["melt_usd"] is not None else "ai", "spot_ag": float(sp.group(1)) if sp else None, "spot_au": None,
                    "source": f"ledger {ver.get('ledger_version', 'v254')} (melt + premium as stated in the ledger)" if l["melt_usd"] is not None else f"ledger {ver.get('ledger_version', 'v254')}"})
    return sorted(out, key=lambda v: v["id"])

def boot_payload(ctx, types, rows_src):
    iso_list = sorted({s["_raw"]["iso"] for s in rows_src}); iso_ix = {k: i for i, k in enumerate(iso_list)}
    type_list = sorted(types); type_ix = {k: i for i, k in enumerate(type_list)}
    den_list = sorted({types[s["type"]]["denomination"]["unit"] for s in rows_src}); den_ix = {k: i for i, k in enumerate(den_list)}
    conf_ix = {"low": 0, "med": 1, "high": 2}; status_ix = {"Logged": 0, "Photographed": 1, "Verified": 2, "Removed": 3}; yq = ["", "circa", "ND", "unparsed"]
    rows = []
    for s in sorted(rows_src, key=lambda s: s["id"]):
        t = types[s["type"]]
        flags = (0 if s["photos"] else 1) + (2 if t["class"] != "coin" else 0) + (4 if (t["precious"]["asw_oz"] or t["precious"]["agw_oz"]) else 0)
        rows.append([s["id"], s["ser"], iso_ix[s["_raw"]["iso"]], s["issue"]["year"], yq.index(s["issue"]["qualifier"] or ""), t["denomination"]["value"], den_ix[t["denomination"]["unit"]],
                     round(s["value"]["est_usd"] * 100), conf_ix[s["value"]["confidence"]], status_ix[s["lifecycle"]["status"]], flags, type_ix[s["type"]]])
    return {"v": 2, "cols": ["id", "ser", "iso", "year", "yq", "denom_v", "denom_u", "est_cents", "conf", "status", "flags", "type"], "yq": yq, "iso": iso_list, "denom_units": den_list, "types": type_list,
            "conf": ["low", "med", "high"], "status": ["Logged", "Photographed", "Verified", "Removed"], "flags_doc": "bit1 = no photo yet, bit2 = not a coin (token/prop/medal), bit4 = holds silver or gold", "rows": rows}


def write_open(ctx, out, vols, src):
    T, S = ctx["types"], ctx["S"]
    ev = collections.Counter((e["entity"], e["field"].split(".")[0].split("/")[0]) for e in ctx["events"])
    L = ["# Curation: what the owner (or Grok) still has to check", "",
         "Generated by `tools/schema/migrate_v1_to_v2.py` on 2026-09-30 from ledger %s. Every change the model made is a line in `changes.jsonl` (`by: model:sonnet-5.5`, `verified: false`). "
         "Where the data could not settle a question the raw value was **kept** and the question is listed here. Nothing below was guessed." % ctx["ver"].get("ledger_version", "v254"), "",
         "When you settle an item: edit the record, append a ChangeEvent with `verified: true` and `by: owner`, run `python3 tools/schema/validate.py collection/ --update-manifest`, then delete the item from this file.", ""]
    groups = collections.OrderedDict([("type-conflict", "1. Same type, different description (check the coin itself)"), ("tender", "2. Legal-tender status"), ("catalog", "3. Catalog numbers"),
                                      ("weight", "4. Weights"), ("composition", "5. Composition (alloy) is ambiguous"), ("issuer", "6. Issuer / ISO code")])
    for k, title in groups.items():
        items = [o for o in ctx["open"] if o["kind"] == k]
        if not items: continue
        L += [f"## {title}", ""]
        for o in items:
            ids = ", ".join(o["ids"]) if len(o["ids"]) <= 14 else ", ".join(o["ids"][:14]) + f" (+{len(o['ids']) - 14} more)"
            L.append(f"- **{o['what']}**  \n  Specimens: {ids}  \n  {o['why']}")
        L.append("")
    rows, fails = check_totals.run(src, out)
    L += ["## 7. Ledger arithmetic that does not add up (Grok / owner)", ""]
    for st, name, detail in rows:
        if st == "KNOWN": L.append(f"- **{name}**: {detail}")
    L += ["- **Albums are not itemized.** The ledger's album value ($2,059.39 on the board) and the ~930 binder coins are not specimen records; only the slot grids exist. The v254 headline ($5,393.70) therefore cannot be rebuilt from `collection/` alone.",
          "- **Silver in binders is not counted.** The ledger's 63.27 oz counts only the American Silver Eagles in A025/A026 (24 oz). Older silver in albums (Mercury dimes A006, pre-1965 Roosevelt A005, 1964 Kennedy A007, pre-1965 Washington quarters A012/A029, war nickels A015) is in no total. The Phase 1.5 album scans will show how much there is.", ""]
    need = [v for v in vols if v["needs_scan"]]
    L += [f"## 8. Album volumes that need the owner's fresh scans (Phase 1.5): {len(need)} of {len(vols)}", "",
          "Computed holes are exact only for volumes the ledger enumerates; the rest stay flagged until each album is re-scanned. `python3 tools/albums/album_calc.py collection/` prints the table.", ""]
    for v in need:
        why = "count-only (the ledger gives only the fill count)" if v["evidence"] == "count-only" else ("partial (some slots named)" if v["evidence"] == "partial" else "approximate slot count or one slot unaccounted")
        L.append(f"- **{v['id']}** {v['title']}: {v['slots_filled_claimed']} filled of {v['slots_total'] if v['slots_total'] is not None else '?'}{'~' if v['slots_total_approx'] else ''}; {why}")
    L += ["", "## What was changed automatically (for reference)", ""]
    for (ent, fld), n in sorted(ev.items()): L.append(f"- {n} x `{ent}` `{fld}`")
    L.append("")
    w(f"{out}/CURATION_OPEN.md", "\n".join(L))

def main(src, out, force=False, report=None):
    if os.path.exists(os.path.join(out, "manifest.json")) and not force:
        sys.exit(f"{out}/manifest.json exists: {out} is already the live master. Refusing to overwrite it (use --force only to rebuild from the ledger and DISCARD later changes).")
    ctx = build(src); curate(ctx)
    if ctx["unresolved"]:
        for u in ctx["unresolved"]: print("UNRESOLVED", u[0], u[1], json.dumps(u[2], ensure_ascii=False)[:600])
        sys.exit("curation incomplete: every type conflict needs an entry in tools/schema/curation.py")
    T, specimens = ctx["types"], ctx["specimens"]
    rows_src = [s for iso in specimens for s in specimens[iso].values()]
    lots = lots_from(ctx); vals = valuations(ctx, lots)
    vols, issues, _ = build_slots.build_all()
    if issues: sys.exit("album grid problems: " + "; ".join(issues))
    for v in vols:
        if v["id"] in ("A025", "A026"): v["asw_oz_per_slot"] = 1.0
        else: v["asw_oz_per_slot"] = None
        nl = sum(1 for s in v["slots"] if s["occupant_status"] == "ledger"); ni = sum(1 for s in v["slots"] if s["occupant_status"] == "inferred"); nu = sum(1 for s in v["slots"] if s["occupant_status"] == "unknown")
        cur.event(ctx, "album", v["id"], "slots", None, f"{len(v['slots'])} named slots of {v['slots_total']} (ledger {nl}, inferred {ni}, unknown {nu}); grid_source {v['grid_source']}",
                  "schema/seed/albums.seed.json (ALBUMS.md rev 2026-09-22) + Whitman layout where its slot count equals the ledger's; see tools/albums/build_slots.py", False)

    # ---- write ----
    os.makedirs(out, exist_ok=True)
    by_iso_types = collections.defaultdict(dict)
    for k, t in T.items(): by_iso_types[t["country"]][k] = t
    for iso, d in by_iso_types.items(): dump_map(f"{out}/types/{iso}.json", d)
    for iso, d in specimens.items():
        dump_map(f"{out}/specimens/{iso}.json", {k: {a: b for a, b in s.items() if a != "_raw"} for k, s in d.items()})
    dump_list(f"{out}/ref/issuers.json", sorted(ctx["issuers"].values(), key=lambda i: i["id"]))
    dump_list(f"{out}/lots.json", lots)
    dump_albums(f"{out}/albums.json", vols)
    dump_list(f"{out}/photos.json", [])
    dump_jsonl(f"{out}/valuations.jsonl", vals)
    order = {"type": 0, "issuer": 1, "specimen": 2, "lot": 3, "album": 4}
    events = sorted(ctx["events"], key=lambda e: (order[e["entity"]], e["id"], e["field"]))
    dump_jsonl(f"{out}/changes.jsonl", events)
    w(f"{out}/boot.json", J({k: v for k, v in boot_payload(ctx, T, rows_src).items() if k != "rows"})[:-1] + ',"rows":[\n' + ",\n".join(J(r) for r in boot_payload(ctx, T, rows_src)["rows"]) + "\n]}\n")
    write_open(ctx, out, vols, src)
    w(f"{out}/SER_REASSIGN_PLAN.md", reassign_ser.render(out, reassign_ser.plan(out)))
    ver = ctx["ver"]
    mf.write(out, {"ledger_version": ver.get("ledger_version", ctx["idx"].get("ledger_version")), "generated_at": ver.get("generated_at", ctx["idx"].get("generated_at")),
                   "content_hash": ver.get("content_hash", ctx["idx"].get("content_hash")), "ledger_repo": "https://github.com/jpavia10/titan-reliquary"})
    ctx["_out"] = out
    if report:
        w(report, json.dumps({"unparsed": ctx["unparsed"], "variants": [[k[0], k[1], v] for k, v in ctx["variants"].items()], "open": ctx["open"], "events": len(events)}, indent=1, ensure_ascii=False))
    print(f"wrote {out}: {len(rows_src)} specimens, {len(T)} types, {len(lots)} lots, {len(vols)} albums, {len(vals)} valuations, {len(events)} change events")
    return ctx

if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    rep = sys.argv[sys.argv.index("--report") + 1] if "--report" in sys.argv else None
    if rep and rep in a: a.remove(rep)
    if len(a) < 2: sys.exit(__doc__)
    main(a[0], a[1], "--force" in sys.argv, rep)
