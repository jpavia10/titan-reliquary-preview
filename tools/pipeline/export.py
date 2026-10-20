#!/usr/bin/env python3
"""Plain-format export of the whole collection (fix list #104): nothing is locked into this one app. Written by publish.py on every publish:

  data/export/coins.csv          one row per piece in a flip (coins and tokens): what it is, its catalogue facts, value, story, photos,
                                 and for the key facts how sure we are and the source (opens in any spreadsheet)
  data/export/album_holes.csv    one row per album hole: album, label, filled / empty / unknown, the price of a missing hole and its source
  data/export/lots.csv           bullion, sets, stamps and storage, one row each
  data/export/collection.json    the full master record in one file (types, pieces, albums, lots, photos, board totals) plus each piece's
                                 certainty and sources; any future app or person can rebuild everything from it
  data/export/README.txt         what each file is, in plain words

Pure function of collection/ and the built data/ (detail/*.json for certainty, wants.json for hole prices); never edits anything.
    python3 tools/pipeline/export.py [collection/ [data/]]
"""
import csv, glob, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import build_app_data as B  # noqa: E402

LV = {"verified": "verified by the owner", "owner": "owner", "checked": "checked (two sources)", "reference": "catalogue source",
      "photo": "read from the photo", "ai": "AI estimate", "imported": "from the original ledger", "review": "being checked"}
FACTS = ("year", "mint", "denomination", "catalog", "mintage", "composition", "design", "value", "story")


def _cert(cert, fact):
    e = (cert or {}).get(fact) or {"level": "imported"}
    if "like" in e and e["like"] in cert: e = dict(cert[e["like"]], level=e["level"])
    return LV.get(e.get("level"), e.get("level") or ""), (e.get("source") or "")


def _cat(t, system):
    return ", ".join(str(c.get("number")) for c in t.get("catalogs") or [] if c.get("system") == system)


def _issue(t, s):
    si = s.get("issue") or {}
    for i in t.get("issues") or []:
        if i.get("year") == si.get("year") and sorted(i.get("mint_marks") or []) == sorted(si.get("mint_marks") or []): return i
    return {}


def _csv(rows, head):
    buf = io.StringIO(newline="")
    w = csv.writer(buf, lineterminator="\r\n")           # CRLF + UTF-8 BOM below: Excel and Numbers open it with accents intact
    w.writerow(head)
    for r in rows: w.writerow(["" if v is None else v for v in r])
    return "﻿" + buf.getvalue()


def coin_rows(col, det, pages):
    T = col["types"]; P = {p["id"]: p for p in col["photos"]}
    head = ["id", "serial", "kind", "country", "year", "denomination", "mint", "type_id", "KM", "Numista", "composition", "weight_g",
            "diameter_mm", "design", "ruler", "period", "mintage", "value_usd", "value_confidence", "status", "added", "story", "photos"]
    for f in FACTS: head += [f + "_how_sure", f + "_source"]
    rows = []
    for k in sorted(col["specs"]):
        s = col["specs"][k]; t = T.get(s["type"]) or {}; d = det.get(k) or {}; si = s.get("issue") or {}; v = s.get("value") or {}
        nom = t.get("nominal") or {}; den = t.get("denomination") or {}
        live = [P[p] for p in s.get("photos") or [] if p in P and not P[p].get("superseded_by") and (P[p].get("review") or {}).get("status") not in ("rejected", "reshoot")]
        r = [k, s.get("ser"), d.get("kind") or s.get("kind"), d.get("country"), si.get("year"),
             d.get("denom") or " ".join(str(x) for x in (den.get("value"), den.get("unit")) if x is not None),
             "/".join(si.get("mint_marks") or []) or (si.get("mint_text") or ""), s["type"], _cat(t, "KM"), _cat(t, "Numista"),
             (t.get("composition") or {}).get("text"), nom.get("weight_g"), nom.get("diameter_mm"), (t.get("design") or {}).get("text"),
             t.get("ruler"), t.get("period"), si.get("mintage") if si.get("mintage") is not None else _issue(t, s).get("mintage"),
             v.get("est_usd"), v.get("confidence"), (s.get("lifecycle") or {}).get("status"), (s.get("acquisition") or {}).get("logged_at"),
             s.get("story"), " ".join(pages + p["path"] for p in live)]
        for f in FACTS: r += list(_cert(d.get("certainty"), f))
        rows.append(r)
    return head, rows


def hole_rows(col, wants):
    price = {}
    for v in (wants or {}).get("volumes") or []:
        for m in v.get("missing_named") or []:
            if m.get("price"): price[(v["id"], m["label"])] = m["price"]
    head = ["album", "title", "family", "slot", "label", "year", "mint", "state", "variety", "price_usd", "price_grade", "price_source"]
    rows = []
    for a in col["albums"]:
        for sl in a.get("slots") or []:
            p = price.get((a["id"], sl.get("label"))) or {}
            rows.append([a["id"], a.get("title"), a.get("family"), sl.get("slot"), sl.get("label"), sl.get("year"), sl.get("mint"), sl.get("state"),
                         sl.get("variety"), p.get("usd"), p.get("grade"), p.get("source")])
    return head, rows


def lot_rows(col):
    head = ["id", "kind", "country", "what", "composition", "silver_oz", "gold_oz", "value_usd", "melt_usd", "confidence", "logged", "notes"]
    rows = [[l.get("id"), l.get("kind"), l.get("country"), l.get("denom_text"), l.get("composition_text"), l.get("asw_oz"), l.get("agw_oz"),
             l.get("est_usd"), l.get("melt_usd"), l.get("confidence"), l.get("logged_at"), l.get("notes")] for l in col["lots"]]
    return head, rows


README = """Titan Reliquary: plain export of the whole collection
Made {when} from the master record (collection hash {hash}). Rebuilt on every publish, so this folder is always the current state.

coins.csv          every piece in a 2x2 flip ({n} rows: coins C### and tokens T###). Opens in Excel, Numbers or Google Sheets.
                   For the key facts (year, mint, face value, catalogue number, mintage, metal, design, value, story) there is a
                   "how sure" column (verified by the owner, checked by two sources, catalogue source, read from the photo,
                   AI estimate, from the original ledger) and a "source" column with the page or photo it came from.
album_holes.csv    every hole of the {albums} albums: filled, empty or unknown, and for a missing hole its estimated price and source.
lots.csv           bullion, mint and proof sets, stamps and storage.
collection.json    everything above and more in one structured file: every coin type, every piece, every album hole, every lot,
                   every photo record and the board totals, plus each piece's certainty and sources. With the photos
                   (photos/ in the app, originals in Google Drive) it is enough to rebuild the collection in any other app.

Values are estimates for insurance and planning, not offers. Policy: hold, do not sell.
"""


def build(coll, data):
    col = B.load_collection(coll)
    det = {}
    for p in sorted(glob.glob(os.path.join(data, "detail", "*.json"))): det.update(B.load(p))
    wp = os.path.join(data, "wants.json"); wants = B.load(wp) if os.path.exists(wp) else None
    st = B.load(os.path.join(data, "status.json")) if os.path.exists(os.path.join(data, "status.json")) else {}
    idx = B.load(os.path.join(data, "index.json"))
    pages = "https://jpavia10.github.io/titan-reliquary-preview/"
    out = {}
    h, r = coin_rows(col, det, pages); out["coins.csv"] = _csv(r, h); n = len(r)
    h, r = hole_rows(col, wants); out["album_holes.csv"] = _csv(r, h)
    h, r = lot_rows(col); out["lots.csv"] = _csv(r, h)
    full = {"about": "Titan Reliquary full export (fix list #104): the master record of collection/ in one file, plus certainty per piece.",
            "generated_at": idx.get("generated_at"), "content_hash": idx.get("content_hash"), "schema": idx.get("schema"),
            "board": idx.get("board"), "counts": idx.get("counts"), "types": col["types"], "specimens": col["specs"], "albums": col["albums"],
            "lots": col["lots"], "photos": col["photos"], "issuers": col["issuers"],
            "certainty": {k: (det.get(k) or {}).get("certainty") or {} for k in sorted(col["specs"])}}
    out["collection.json"] = json.dumps(full, ensure_ascii=False, indent=1) + "\n"
    out["README.txt"] = README.format(when=(idx.get("generated_at") or "")[:10], hash=idx.get("content_hash") or st.get("hash") or "", n=n, albums=len(col["albums"]))
    return out


def write(coll, data, dest=None):
    dest = dest or os.path.join(data, "export"); os.makedirs(dest, exist_ok=True)
    files = build(coll, data)
    for name, text in files.items():
        with open(os.path.join(dest, name), "w", encoding="utf-8", newline="") as fh: fh.write(text)
    return sorted(files)


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "collection")
    d = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "data")
    print("wrote", ", ".join(write(c, d)), "in", os.path.join(d, "export"))
