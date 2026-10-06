"""Display rules: turn v2 records into the strings and blocks the app reads. Pure functions, no I/O.

v2 stores facts once (tools/schema/fmt.py formats them); the app's view files still carry the ledger's display strings
(year_line, face_line, label, metal, specs ...). These functions re-derive those strings from the structured facts.
"""
import datetime, json, re, unicodedata

DASH = "—"
SYSTEM_OUT = {"Sch": "Schön"}          # catalog system names as the app printed them
CONT_CODE = {"AF": "Africa", "AN": "Antarctica", "AS": "Asia", "EU": "Europe", "NA": "North America", "OC": "Oceania", "SA": "South America"}

def _ymd(ts):
    return ts[:10]

# ---------------------------------------------------------------------------------- number / text helpers
def num_txt(x, places=None):
    """3.0 -> '3', 4.4 -> '4.4' (shortest); with places -> fixed."""
    if x is None: return None
    if places is not None: return f"{x:.{places}f}"
    return f"{x:g}" if abs(x) < 1e15 else str(x)

def meas_txt(v, approx, lo, hi, unit, fixed=None):
    if lo is not None and hi is not None: return f"~{num_txt(lo)}–{num_txt(hi)} {unit}"
    if v is None: return None
    return ("~" if approx else "") + (num_txt(v, fixed) if fixed is not None else num_txt(v)) + f" {unit}"

def title_words(s):
    return " ".join(w[:1].upper() + w[1:] if w else w for w in s.split(" "))

def currency_of(t, spec=None):
    return (t["denomination"].get("currency")
            or ((spec or {}).get("value", {}).get("face") or {}).get("currency"))

def denom_raw(t):
    """The denomination as the ledger wrote it: '1 franc', '5 centavos', 'Spielmarke “20” (GR)'."""
    d = t["denomination"]
    if d.get("display") and d.get("value") is None and not d.get("named"): return d["display"]
    if d.get("display") and (d.get("named") or d.get("value") is None): return d["display"]
    v, unit = d.get("value"), (d.get("unit") or "")
    if v is None: return unit
    if abs(v - round(v)) < 1e-9: n = str(int(round(v)))
    elif abs(v - 0.5) < 1e-9: n = "1/2" if unit.startswith("franc") else "½"      # the ledger wrote '1/2 franc' but '½ penny'
    elif abs(v - 0.25) < 1e-9: n = "1/4"
    else: n = num_txt(v)
    if unit[:1] in "¢%": return f"{n}{unit}"
    if unit[:1] in "$£€¥₹": return f"{unit[0]}{n}{(' ' + unit[1:].strip()) if unit[1:].strip() else ''}"
    return f"{n} {unit}".strip()

def denom_line(t, spec):
    raw = denom_raw(t); cur = currency_of(t, spec)
    if not cur or f"· {cur}" in raw: return raw
    return f"{raw} · {cur}"

def split_segs(text, sep=" · "):
    out, depth, cur_, i = [], 0, "", 0
    t = str(text)
    while i < len(t):
        ch = t[i]
        depth += (ch == "(") - (ch == ")")
        if depth <= 0 and t.startswith(sep, i): out.append(cur_.strip()); cur_ = ""; i += len(sep); continue
        cur_ += ch; i += 1
    out.append(cur_.strip())
    return out

# ---------------------------------------------------------------------------------- specimen
def is_token(t):
    return t.get("class") in ("token", "prop", "medal")

def iso_of(spec, t):
    return t["country"]

def issuer_name(col, t):
    iid = t.get("issuer") or t["country"]
    legacy = ((col.get("board") or {}).get("issuer_legacy_name") or {})
    return legacy.get(iid) or col["issuers"][iid]["name"]

def continent_of(col, t):
    return col["issuers"][t.get("issuer") or t["country"]]["continent"]

def refs_text(t):
    return " · ".join(f"{SYSTEM_OUT.get(c['system'], c['system'])}#{c['number']}" for c in t["catalogs"])

def metal_text(t, s):
    n = t["nominal"]; parts = [t["composition"]["text"] or ""]
    w = meas_txt(n.get("weight_g"), n.get("weight_approx"), n.get("weight_min_g"), n.get("weight_max_g"), "g", None if n.get("weight_g") is None else 2)
    dm = meas_txt(n.get("diameter_mm"), n.get("diameter_approx"), n.get("diameter_min_mm"), n.get("diameter_max_mm"), "mm")
    for x in (w, dm, n.get("edge"), s["condition"].get("text"), s["housing"].get("text")):
        if x: parts.append(x)
    return " · ".join(p for p in parts if p)

def specs_text(t):
    n = t["nominal"]; parts = []
    parts.append(f"thickness {num_txt(n['thickness_mm'])} mm" if n.get("thickness_mm") is not None else "thickness unknown")
    if n.get("alignment"): parts.append(f"{n['alignment']} alignment")
    return " · ".join(parts)

def money2(a):
    """2 decimals, but never round away a real fraction of a cent/penny (½p = 0.005, not 0.01)."""
    return f"{a:.2f}" if abs(a * 100 - round(a * 100)) < 1e-9 else f"{a:.3f}".rstrip("0")

def face_txt(s, t):
    f = (s["value"].get("face") or {}); a = f.get("amount"); cur = f.get("currency")
    if a is None: return "none"
    sym = {"GBP": "£", "EUR": "€"}.get(cur)
    if sym: return f"{sym}{money2(a)}"
    if cur == "USD" or (cur == "CAD" and t["country"] == "CA"): return f"${money2(a)}"
    whole = abs(a - round(a)) < 1e-9
    if cur in ("KRW", "JPY", "ITL", "GRD", "CLP", "COP", "VND", "TWD", "INR", "CRC", "YUD", "MXP", "HUF", "VAL", "SUR"): txt = str(int(round(a))) if whole else f"{a:g}"
    else: txt = money2(a)
    return f"{txt} {cur}" if cur else txt

DEAD_CCY = {"FRF", "DEM", "NLG", "ITL", "GRD", "SUR", "YUD", "MXP", "VAL", "ESP", "PTE", "IEP"}

def face_annot(s, t):
    """'(demonetized)' only for currencies that no longer exist. The ledger's FX note '(~$1.23)' is stale by design and not reproduced."""
    cur = ((s["value"].get("face") or {}).get("currency"))
    return " (demonetized)" if cur in DEAD_CCY and t["legal_tender"]["status"] in ("demonetized", "withdrawn") else ""

def mint_first(text):
    return text.split(" · ")[0] if text else ""      # the ledger cut at the first ' · ' even inside parentheses

def denom_slug(t, s):
    raw = denom_raw(t)
    base = unicodedata.normalize("NFD", raw.split(" · ")[0].replace("đ", "d").replace("Đ", "D").replace("ø", "o").replace("Ø", "O"))
    base = "".join(c for c in base if not 0x300 <= ord(c) <= 0x36F)
    base = re.sub(r"^(1/2|½) ", "Half ", base)
    return re.sub(r"[^A-Za-z0-9]+", "", title_words(base))

def photo_stem(s, t):
    ser = s.get("ser") or s["id"]
    yr = s["year_raw"] if s["year_raw"].isdigit() else "ND"
    slug = denom_slug(t, s)
    m = re.match(r"^(\d+)(DeutscheMark|Pfennig|Francs?|Kopecks)$", slug)
    if m and slug not in STEM_DENOM: slug = m.group(1) + STEM_SUFFIX[m.group(2)]     # ledger stem spellings: 10Pf, 5DM, 10Fr, 3Kopeks
    return f"{ser}_{yr}_{STEM_DENOM.get(slug, slug)}"

STEM_SUFFIX = {"DeutscheMark": "DM", "Pfennig": "Pf", "Franc": "Fr", "Francs": "Fr", "Kopecks": "Kopeks"}
STEM_DENOM = {"HalfFranc": "HalfFr", "HalfFrancs": "HalfFr", "1Franc": "1Fr", "2Francs": "2Fr", "5Francs": "5Fr", "5Rappen": "5Rp", "10Rappen": "10Rp", "20Rappen": "20Rp"}

def type_issue(t, s):
    """The Type's own record of this year/mint (the master), falling back to the specimen's copy."""
    marks = s["issue"].get("mint_marks") or []
    for i in t["issues"]:
        if i["year"] == s["issue"].get("year") and (i.get("mint_marks") or []) == marks and i.get("qualifier") == s["issue"].get("qualifier"): return i
    return s["issue"]

def year_line(s, t=None):
    i = s["issue"]; yr = s["year_raw"]
    mt = i.get("mint_text")
    return f"{yr} · Mint: {mt}" if mt else yr


def label(col, s, t):
    yr = s["year_raw"]
    mm = s["issue"].get("mint_marks") or []
    ctry = issuer_name(col, t)
    den = title_words(denom_raw(t).split(" · ")[0])
    return f"{ctry} · {yr} · {den}"

def mintage_txt(i):
    txt = i.get("mintage_text")
    if txt and not (i.get("mintage") and txt.strip().lower().startswith("unknown")): return txt
    return f"{i['mintage']:,}" if i.get("mintage") else "unknown"     # a researched number beats an older "unknown" text

def photo_list(col, s):
    """The specimen's live photos as the app reads them: [{role, url, phase, kind}], Phase 2 first, then by id."""
    by_id = {p["id"]: p for p in col.get("photos") or []}
    out = []
    for pid in s.get("photos") or []:
        p = by_id.get(pid)
        if not p or p.get("superseded_by") or (p.get("review") or {}).get("status") in ("rejected", "reshoot"): continue
        out.append({"id": pid, "role": p["side"], "url": p["path"] + (f"?v={p['sha256'][:8]}" if p.get("sha256") else ""), "phase": p.get("phase"), "kind": p["kind"]})
    return sorted(out, key=lambda x: (-(x["phase"] or 0), x["id"]))

def specimen_detail(col, s, t):
    iss = issuer_name(col, t); cont = continent_of(col, t); iso = t["country"]
    ser = s.get("ser"); est = s["value"].get("est_usd")
    conf = s["value"].get("confidence")
    face = face_txt(s, t) + face_annot(s, t)
    est_txt = f"{est:.2f}" if est is not None else None
    cont_code = (ser or "XX-")[:2]
    dl = denom_line(t, s)
    stem = photo_stem(s, t)
    tok = is_token(t)
    lt = s.get("ledger_text") or {}          # ledger wording kept verbatim where it cannot be derived (schema: Specimen.ledger_text)
    if "denom" in lt: dl = lt["denom"]
    if "photo_stem" in lt: stem = lt["photo_stem"]
    if "face" in lt: face = lt["face"]
    d = {"kind": "token" if tok else "flip", "scan": s["id"], "ser": ser, "country": iss, "year": s["year_raw"], "denom": dl,
         "scan_note": f"{s['id']} (temporary · renumber after reorg)", "added": s["acquisition"]["logged_at"],
         "cat": "token / exonumia (not legal tender)" if tok else "coin",
         "continent_line": f"{cont} · Country: {iss} · ISO: {iso}", "year_line": year_line(s, t), "denom_line": dl,
         "refs": refs_text(t), "metal": metal_text(t, s), "specs": specs_text(t), "mintage": mintage_txt(s["issue"]),
         "design": t["design"]["text"], "tender": t["legal_tender"].get("text") or "", "qty": str(s.get("quantity") or 1),
         "face_line": f"{face} · Est: ${est_txt} · Conf: {conf}", "label": label(col, s, t),
         "photo": f"pending pro rescan · target {stem}_{{obv|rev}}.jpg", "parked": s["housing"].get("text"), "notes": s.get("notes") or "",
         "status": s["lifecycle"]["status"], "continent": cont, "iso": iso, "mint": mint_first(s["issue"].get("mint_text")), "face": face,
         "est": est, "est_raw": est_txt, "conf": conf, "qty_n": s.get("quantity") or 1}
    for k in ("label", "metal", "refs", "specs", "cat", "mint", "face_line"):
        if k in lt: d[k] = lt[k]
    if lt.get("specs_tail") and "specs" not in lt: d["specs"] = f"{d['specs']} · {lt['specs_tail']}"     # the ledger's free-text remark after thickness/alignment
    asw = t["precious"].get("asw_oz"); agw = t["precious"].get("agw_oz")
    d["is_silver"] = bool(asw); d["is_gold"] = bool(agw)
    n = t["nominal"]; dm = n.get("diameter_mm") if n.get("diameter_mm") is not None else n.get("diameter_max_mm")
    if dm is not None: d["diameter_mm"] = dm
    d["photo_dir"] = f"photos/{cont_code}/{iso}"; d["photo_stem"] = stem
    d["photos"] = photo_list(col, s); d["has_photo"] = bool(d["photos"])
    if s.get("story"): d["story"] = s["story"]     # short reader text (schema v3 Phase 1 field); omitted when empty
    for k in ("ruler", "period", "commemorates"):      # Phase 2 context on the type; omitted when empty
        if t.get(k): d[k] = t[k]
    if t.get("series"): d["series"] = ", ".join(t["series"]) if isinstance(t["series"], list) else t["series"]
    oq = (s.get("research") or {}).get("open_questions") or []
    if oq: d["open_questions"] = list(oq)
    d["phase2_done"] = False; d["awaiting_phase2"] = s["lifecycle"]["status"] == "Logged"
    ranked = sorted(d["photos"], key=lambda p: (p["kind"] != "crop_circle", p["role"] != "obv"))   # round crop first (tiles are round), then obverse
    tp = ranked[0] if ranked else None
    d["thumb"] = tp["url"] if tp else None                # list/tile picture: the obverse photo, else the reverse
    if tp: d["thumb_side"] = tp["role"]
    if asw:
        d["asw_oz"] = asw
        d.update(((col.get("board") or {}).get("flip_precious") or {}).get(s["id"], {}))
        d["melt_live"] = round(asw * col["board"]["index"]["metals"]["spot"]["ag_usd_oz"], 4)
    return d

def specimen_index_row(col, s, t, det):
    keys = ("scan", "ser", "kind", "country", "iso", "continent", "year", "denom", "label", "mint", "added", "est", "conf", "face", "qty_n", "status", "awaiting_phase2")
    r = {}
    for k in keys: r[k] = det[k]
    r["denom"] = denom_raw(t)
    r["d"] = col["spec_file"][s["id"]]
    if "asw_oz" in det: r["is_silver"] = True; r["asw_oz"] = det["asw_oz"]; r["melt_live"] = det["melt_live"]
    if det.get("thumb"): r["thumb"] = det["thumb"]; r["thumb_side"] = det["thumb_side"]   # gallery tiles show the photo before the detail loads
    return r

# ---------------------------------------------------------------------------------- lots
def lot_row(col, l):
    disp = ((col["board"] or {}).get("lot_display") or {}).get(l["id"], {})
    kind = l["kind"]; est = l["est_usd"]; melt = l.get("melt_usd")
    r = {"kind": kind, "scan": l["id"], "country": l["country"], "year": l["year_raw"], "denom": l["denom_text"], "added": l["logged_at"],
         "cat": disp.get("cat", kind), "denom_line": l["denom_text"], "metal": l["composition_text"], "qty": disp.get("qty", str(l["qty"])),
         "face_line": refresh_lot_face_line(disp.get("face_line", ""), est, melt), "label": disp.get("label", f"{l['country']} · {l['year_raw']} · {l['denom_text']}"),
         "parked": l["storage_text"], "notes": l["notes"]}
    if kind == "stamp" and disp.get("contents") is not None: r["contents"] = disp["contents"]
    r["mint"] = disp.get("mint", ""); r["continent"] = disp.get("continent", ""); r["face"] = disp.get("face", "")
    r["est"] = est; r["est_raw"] = f"{est:.2f}"; r["conf"] = l["confidence"]
    if kind in ("bullion", "set"):
        r["melt"] = melt; r["melt_raw"] = f"{melt:.2f}" if melt is not None else None
    r["qty_n"] = l["qty"]
    if kind == "bullion":
        if "asw_oz" in disp: r["asw_oz"] = l["asw_oz"]
        if "agw_oz" in disp: r["agw_oz"] = l["agw_oz"]
    r["is_silver"] = bool(l.get("asw_oz")) and kind == "bullion"; r["is_gold"] = bool(l.get("agw_oz")) and kind == "bullion"
    return {k: v for k, v in r.items() if v is not None}

def _money(x): return f"${x:,.2f}"

def refresh_lot_face_line(line, est, melt):
    """Keep the ledger's wording but re-render the Est / Melt numbers from the records."""
    if est is not None: line = re.sub(r"(Est: )\$[\d,]+(?:\.\d+)?", lambda m: m.group(1) + _money(est), line, count=1)
    if melt is not None: line = re.sub(r"(Melt: )~?\$[\d,]+(?:\.\d+)?", lambda m: m.group(1) + ("~" if "~" in m.group(0) else "") + _money(melt), line, count=1)
    return line

# ---------------------------------------------------------------------------------- blocks (board etc.)
def basis(col):
    """Sums computed from the records, stored in board.json at snapshot time; the build applies (current - basis) to the ledger figures."""
    specs, types = col["specs"], col["types"]
    b = {"flip_usd": 0.0, "flip_cards": 0, "token_usd": 0.0, "token_cards": 0, "ag_oz": 0.0, "au_oz": 0.0}
    for s in specs.values():
        t = types[s["type"]]; e = s["value"].get("est_usd") or 0
        if is_token(t): b["token_usd"] += e; b["token_cards"] += 1
        else: b["flip_usd"] += e; b["flip_cards"] += 1
        q = s.get("quantity") or 1
        b["ag_oz"] += (t["precious"].get("asw_oz") or 0) * q; b["au_oz"] += (t["precious"].get("agw_oz") or 0) * q
    for k in ("bullion", "set", "housing", "stamp"):
        ls = [l for l in col["lots"] if l["kind"] == k]
        b[f"{k}_usd"] = sum(l["est_usd"] or 0 for l in ls); b[f"{k}_cards"] = len(ls)
        if k in ("bullion", "set"): b["ag_oz"] += sum(l["asw_oz"] or 0 for l in ls); b["au_oz"] += sum(l["agw_oz"] or 0 for l in ls)
    return {k: round(v, 6) for k, v in b.items()}

def _rerender_raw(raw, usd, cards=None):
    raw = re.sub(r"\$[\d,]+(?:\.\d+)?", lambda m: _money(usd), raw, count=1)
    if cards is not None: raw = re.sub(r"(\d+)( cards)", lambda m: f"{cards}{m.group(2)}", raw, count=1)
    return raw

def corrected_index(bd):
    """The ledger board snapshot with its documented corrections applied (collection/board.json `corrections`): evidence-backed
    fixes to Grok's own estimates (e.g. an album's silver mix read from the page photo). Each moves silver oz, album value and the grand total."""
    idx = json.loads(json.dumps(bd["index"]))
    for c in bd.get("corrections") or []:
        dag = float(c.get("ag_oz") or 0); dalb = float(c.get("albums_usd") or 0)
        b = idx["board"]
        if dag:
            b["silver"]["oz"] = round(b["silver"]["oz"] + dag, 4)
            if "oz" in idx["metals"]: idx["metals"]["oz"]["ag"] = b["silver"]["oz"]
        if dalb:
            b["albums"]["usd"] = round(b["albums"]["usd"] + dalb, 2)
            b["albums"]["raw"] = re.sub(r"^\$[\d,]+\.\d\d", _money(b["albums"]["usd"]), b["albums"]["raw"])
            b["grand"] = round(b["grand"] + dalb, 2); b["grand_raw"] = _money(b["grand"])
    return idx

def board_totals(col, flips, lots, version):
    bd = col["board"]; cur = basis(col); base = bd["basis"]
    b = corrected_index(bd)["board"]
    def upd(key, cur_usd, base_usd, cur_n, base_n, has_cards):
        d = round(cur_usd - base_usd, 2); dn = cur_n - base_n
        if abs(d) < 0.005 and dn == 0: return 0.0
        b[key]["usd"] = round(b[key]["usd"] + d, 2)
        if has_cards: b[key]["cards"] = b[key]["cards"] + dn
        b[key]["raw"] = _rerender_raw(b[key]["raw"], b[key]["usd"], b[key].get("cards") if has_cards else None)
        return d
    delta = 0.0
    delta += upd("flips", cur["flip_usd"], base["flip_usd"], cur["flip_cards"], base["flip_cards"], True)
    delta += upd("bullion", cur["bullion_usd"], base["bullion_usd"], cur["bullion_cards"], base["bullion_cards"], True)
    delta += upd("housing", cur["housing_usd"], base["housing_usd"], 0, 0, False)
    delta += upd("stamps", cur["stamp_usd"], base["stamp_usd"], 0, 0, False)
    delta += upd("sets", cur["set_usd"], base["set_usd"], 0, 0, False)
    # tokens are not on the ledger board's flip line; their value changes only move the grand total via the records' own sums
    tok = round(cur["token_usd"] - base["token_usd"], 2)
    if abs(tok) >= 0.005: delta += tok
    if abs(delta) >= 0.005:
        b["grand"] = round(b["grand"] + delta, 2); b["grand_raw"] = _money(b["grand"])
    # metals: ledger board oz are authoritative (owner 2026-09-30); records' own change in oz is added on top
    d_ag = round(cur["ag_oz"] - base["ag_oz"], 4); d_au = round(cur["au_oz"] - base["au_oz"], 4)
    spot_ag = bd["index"]["metals"]["spot"]["ag_usd_oz"]; spot_au = bd["index"]["metals"]["spot"]["au_usd_oz"]
    ag = round(b["silver"]["oz"] + d_ag, 4); au = round(b["gold"]["oz"] + d_au, 4)
    b["silver"].update(oz=ag, usd=ag, melt=round(ag * spot_ag, 2), spot=round(spot_ag, 2))
    b["gold"].update(oz=au, usd=au, melt=round(au * spot_au, 2), spot=spot_au)
    b["silver"]["raw"] = re.sub(r"~[\d.]+ oz known · spot \$[\d.,]+/oz · melt \$[\d,.]+", f"~{ag:g} oz known · spot ${b['silver']['spot']:,.2f}/oz · melt ${b['silver']['melt']:,.2f}", b["silver"]["raw"])
    b["gold"]["raw"] = re.sub(r"~[\d.]+ oz known · spot \$[\d.,]+/oz · melt \$[\d,.]+", f"~{au:g} oz known · spot ${spot_au:,.2f}/oz · melt ${b['gold']['melt']:,.2f}", b["gold"]["raw"])
    b["spot_ag"] = b["silver"]["spot"]; b["spot_au"] = spot_au
    b["ledger_version"] = version["ledger_version"]
    return b

def metals_block(col, board):
    m = corrected_index(col["board"])["metals"]
    m["oz"] = {"ag": board["silver"]["oz"], "au": board["gold"]["oz"]}
    m["melt"] = {"ag_usd": board["silver"]["melt"], "au_usd": board["gold"]["melt"]}
    m["board"] = {"flips": board["flips"]["usd"], "bullion": board["bullion"]["usd"], "sets": board["sets"]["usd"], "albums": board["albums"]["usd"],
                  "housing": board["housing"]["usd"], "stamps": board["stamps"]["usd"], "grand": board["grand"]}
    return m

def precious_block(col, metals, carried):
    p = json.loads(json.dumps(carried))
    p["spot_ag"] = metals["spot"]["ag_usd_oz"]; p["spot_au"] = metals["spot"]["au_usd_oz"]
    p["combined_silver"]["oz"] = metals["oz"]["ag"]; p["combined_silver"]["melt"] = metals["melt"]["ag_usd"]
    p["combined_gold"]["oz"] = metals["oz"]["au"]; p["combined_gold"]["melt"] = metals["melt"]["au_usd"]
    return p

def world_block(col, flips, carried):
    from collections import defaultdict
    by = defaultdict(list)
    for f in flips: by[f["iso"]].append(f)
    notes = {w["iso"]: w for w in carried}
    out = []
    for iso in sorted(by, key=lambda i: (-0 if False else 0, notes.get(i, {}).get("country", i))):
        pass
    order = [w["iso"] for w in carried] + sorted(i for i in by if i not in notes)
    for iso in order:
        if iso not in by: continue
        n = notes.get(iso, {})
        sers = [f["ser"].rsplit("-", 1)[1] for f in by[iso] if f.get("ser")]
        out.append({"country": n.get("country") or col["issuers"].get(iso, {}).get("name", iso), "iso": iso, "ser_max": max(sers) if sers else "000",
                    "count": len(by[iso]), "note": n.get("note", "")})
    return out

def photos_block(col, flips, carried):
    p = json.loads(json.dumps(carried)); ph = col["photos"]
    with_photo = {x["specimen"] for x in ph}
    p["images"] = len(ph); p["coins_with_photos"] = len(with_photo)
    p["total_active"] = len(flips)
    sc = {}
    for f in flips: sc[f["status"]] = sc.get(f["status"], 0) + 1
    p["status_counts"] = sc
    return p

def counts_block(col, flips, carried):
    c = dict(carried)
    c["flips"] = len(flips)
    for k, key in (("bullion", "bullion"), ("sets", "set"), ("housing", "housing"), ("stamps", "stamp")): c[k] = sum(1 for l in col["lots"] if l["kind"] == key)
    c["countries"] = len({f["iso"] for f in flips})
    return c

def drip_block(col, idx):
    d = idx["drip"]; specs = col["specs"]
    def nxt(prefix, ids, width=3):
        n = max([int(i[1:]) for i in ids if i[:1] == prefix] or [0]) + 1
        return f"{prefix}{n:0{width}d}"
    ids = list(specs) + [l["id"] for l in col["lots"]]
    # the ledger may hold ids that are not in the collection yet (requests); never hand out one below the ledger's counter
    led = d["next_ids"]
    d["next_ids"] = {k: (nxt(pfx, ids) if k == "flip" else max(led[k], nxt(pfx, ids))) for k, pfx in (("flip", "C"), ("token", "T"), ("bullion", "B"), ("housing", "H"), ("set", "S"), ("stamp", "P"))}
    d["board_snapshot"]["grand"] = idx["board"]["grand"]
    d["board_snapshot"]["flips_cards"] = len(specs)
    d["board_snapshot"]["countries"] = idx["counts"]["countries"]
    d["board_snapshot"]["flips_usd"] = round(sum((s["value"].get("est_usd") or 0) for s in specs.values()) - col["board"]["basis"]["_spec_est_sum"] + col["board"]["basis"]["_ledger_flips_usd_all"], 2)
    d["metals_live"] = re.sub(r"Ag \$[\d.,]+/oz · Au \$[\d.,]+/oz", f"Ag ${idx['metals']['spot']['ag_usd_oz']:,.2f}/oz · Au ${idx['metals']['spot']['au_usd_oz']:,.2f}/oz", d["metals_live"])

def make_version(col, vpath):
    """Version block for index.json. With a version.json (publish.py writes it first) its stamps are used; otherwise derived from the manifest's source time."""
    import os, datetime
    m = col["manifest"]; ledger = "v3:" + m["content_hash"][:16]
    if vpath and os.path.exists(vpath):
        v = json.load(open(vpath, encoding="utf-8"))
        return {"generated_at": v["generated_at"], "generated_at_pt": v.get("generated_at_pt", ""), "generated_at_iso": v.get("generated_at_iso", v["generated_at"]), "ledger_version": v.get("ledger_version", ledger)}
    g = m["source"]["generated_at"]
    return dict(zip(("generated_at", "generated_at_pt", "generated_at_iso"), stamps(g)), ledger_version=ledger)

def stamps(utc):
    """'2026-09-30T15:12:46Z' -> (utc, '2026-09-30 08:12 PT', '2026-09-30T08:12:46-07:00')"""
    import datetime
    t = datetime.datetime.strptime(utc, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    try:
        import zoneinfo
        pt = t.astimezone(zoneinfo.ZoneInfo("America/Los_Angeles"))
        return utc, pt.strftime("%Y-%m-%d %H:%M PT"), pt.isoformat()
    except Exception:
        return utc, t.strftime("%Y-%m-%d %H:%M UTC"), t.isoformat().replace("+00:00", "Z")
