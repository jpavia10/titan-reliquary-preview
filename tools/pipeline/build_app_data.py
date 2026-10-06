#!/usr/bin/env python3
"""Generate the app's view files (data/index.json, data/detail/{ISO}.json, data/search.json) FROM the v2 master.

usage (repo root):  python3 tools/pipeline/build_app_data.py collection/ data/ [--version-json version.json]

The v2 collection is the master; this is a pure function of it (plus collection/board.json, the ledger-computed
board snapshot). It writes exactly the shape the app read from the v254 Grok publish. Nothing here is hand-edited.

Where v2 deliberately dropped a ledger display string (year_line, face_line FX text, label flourishes, free-text tails of
refs/specs) it is re-derived by the rules below; tools/pipeline/test_parity.py reports every remaining difference.
Only the Python 3 standard library is used. (data/master_catalog.json, a stale v1 file the app never read, was deleted 2026-10-01.)
"""
import glob, hashlib, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from display import *   # noqa: F401,F403  (pure string-rendering rules, see display.py)
import value_history as VH
import provenance as PV

def load(p):
    with open(p, encoding="utf-8") as f: return json.load(f)

def load_collection(d):
    types, specs = {}, {}
    spec_file = {}
    for p in sorted(glob.glob(f"{d}/types/*.json")): types.update(load(p))
    for p in sorted(glob.glob(f"{d}/specimens/*.json")):
        iso = os.path.basename(p)[:-5]
        for k, s in load(p).items(): specs[k] = s; spec_file[k] = iso
    col = {"types": types, "specs": specs, "spec_file": spec_file,
           "lots": load(f"{d}/lots.json"), "albums": load(f"{d}/albums.json"),
           "issuers": {r["id"]: r for r in load(f"{d}/ref/issuers.json")},
           "photos": load(f"{d}/photos.json"), "manifest": load(f"{d}/manifest.json")}
    bp = f"{d}/board.json"
    col["board"] = load(bp) if os.path.exists(bp) else None
    vp = f"{d}/valuations.jsonl"
    col["events"] = PV.load_events(d)
    col["valuations"] = [json.loads(l) for l in open(vp, encoding="utf-8") if l.strip()] if os.path.exists(vp) else []
    sp = f"{d}/prices/spot_daily.jsonl"
    col["spot"] = {}
    if os.path.exists(sp):
        for l in open(sp, encoding="utf-8"):
            if l.strip(): r = json.loads(l); col["spot"][r["date"]] = r
    lp = f"{d}/prices/latest.json"
    col["spot_latest"] = load(lp) if os.path.exists(lp) else None
    return col

def dump(path, obj):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))

def norm(s):
    s = unicodedata.normalize("NFD", str(s if s is not None else ""))
    s = "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F).lower()
    s = s.replace("ø", "o").replace("æ", "ae").replace("ß", "ss")
    return re.sub(r"\s+", " ", s).strip()

# the ledger v254 search text: these detail fields, in this order, joined with ' · ', an 'unknown' mint left out (verified: 269/273
# v254 entries are reproduced exactly, the rest differ in Devanagari vowel signs, which Grok's normaliser stripped and norm() keeps)
SEARCH_FIELDS = ["denom_line", "label", "notes", "design", "refs", "mint", "metal", "specs", "mintage", "tender", "face", "parked", "cat", "continent", "added", "scan_note"]

def number_spellings(text):
    """'4.00' also as '4' / '4.0', '27.4' also as '27.40': the ledger spelled the same weight/size differently from record to record, and a search for any spelling must still hit."""
    out = []
    for m in re.finditer(r"(?<![\w.])(~?)(\d+(?:\.\d+)?)(?![\w.])", text):
        x = float(m.group(2))
        for v in (f"{x:g}", f"{x:.1f}", f"{x:.2f}"):
            v = m.group(1) + v
            if v != m.group() and v not in out: out.append(v)
    return out

def search_text(r):
    parts = [str(r[k]) for k in SEARCH_FIELDS if r.get(k) and not (k == "mint" and r[k] == "unknown")]
    text = norm(" · ".join(parts))
    extra = number_spellings(" ".join(str(r.get(k) or "") for k in ("metal", "specs")))
    return text + (" · " + " ".join(extra) if extra else "")

# ------------------------------------------------------------------------------------------------ specimens
def build_specimens(col):
    """-> (index flips list, {iso_file: {scan: detail}})"""
    flips, detail = [], {}
    for sid in sorted(col["specs"]):
        s = col["specs"][sid]; t = col["types"][s["type"]]
        det = specimen_detail(col, s, t)
        flips.append(specimen_index_row(col, s, t, det))
        detail.setdefault(col["spec_file"][sid], {})[sid] = det
    PV.build(col, {sid: d for recs in detail.values() for sid, d in recs.items()})    # certainty labels + history (provenance.py), added in place
    return flips, detail

def build_lots(col):
    out = {"bullion": [], "set": [], "housing": [], "stamp": []}
    for l in col["lots"]:
        out[l["kind"]].append(lot_row(col, l))
    return out["bullion"], out["set"], out["housing"], out["stamp"]

# ------------------------------------------------------------------------------------------------ index
def valuation_history(col):
    """Real dated valuation entries from collection/valuations.jsonl, summed per date: [{at, usd, n}] (n = items valued that day).
    The app plots these as-is; it never invents points between them."""
    by = {}
    for r in col["valuations"]:
        if r.get("at") and r.get("est_usd") is not None:
            d = by.setdefault(r["at"], [0.0, 0]); d[0] += r["est_usd"]; d[1] += 1
    return [{"at": k, "usd": round(v[0], 2), "n": v[1]} for k, v in sorted(by.items())]

def prices_file(col, pf, version):
    """data/prices.json: the spot history for the terminal's Silver / Gold / ratio series, the latest quote, and what the app needs to reprice the portfolio with a live quote."""
    rows = [[d, r["xag_usd"], r["xau_usd"], "c" if r.get("carried") else ("p" if r.get("provisional") else "")] for d, r in sorted(col["spot"].items())]
    srcs = sorted({r["source"] for r in col["spot"].values() if not r.get("carried")})
    nonmetal = None
    if pf["rows"]:
        last = pf["rows"][-1]; nonmetal = last[4]
    return {"spot": {"cols": ["d", "xag_usd", "xau_usd", "k"], "rows": rows}, "sources": srcs, "latest": col["spot_latest"], "board_quote": pf["board_quote"],
            "oz": {"ag": pf.get("ag_oz"), "au": pf.get("au_oz")}, "nonmetal_usd": nonmetal, "bucket": pf["bucket"], "residual_usd": pf["residual_usd"],
            "day0": pf["day0"], "generated_at": version["generated_at"]}

def build_index(col, flips, lots, version):
    b = col["board"]
    if b is None: raise SystemExit("collection/board.json is missing (snapshot of the ledger board; see tools/pipeline/snapshot_board.py)")
    from_board = b["index"]
    bullion, sets, housing, stamps = lots
    idx = {}
    idx["generated_at"] = version["generated_at"]
    idx["generated_at_pt"] = version["generated_at_pt"]
    idx["generated_at_iso"] = version["generated_at_iso"]
    idx["ledger_version"] = version["ledger_version"]
    idx["board"] = board_totals(col, flips, lots, version)
    idx["metals"] = metals_block(col, idx["board"])
    for k in ("age", "drip", "value", "moments", "flags"):
        idx[k] = json.loads(json.dumps(from_board[k]))
    idx["bullion"], idx["sets"], idx["housing"], idx["stamps"] = bullion, sets, housing, stamps
    idx["world"] = world_block(col, flips, from_board["world"])
    idx["albums_glance"] = from_board["albums_glance"]
    idx["photos"] = photos_block(col, flips, from_board["photos"])
    idx["requests"] = from_board["requests"]
    idx["counts"] = counts_block(col, flips, from_board["counts"])
    idx["root"] = from_board["root"]; idx["policy"] = from_board["policy"]
    idx["precious"] = precious_block(col, idx["metals"], from_board["precious"])
    idx["flips"] = flips
    idx["schema"] = 2
    idx["content_hash"] = col["manifest"]["content_hash"][:16]
    idx["value"] = {"estimated_total": idx["board"]["grand"], "status": from_board["value"].get("status"), "policy": from_board["value"].get("policy"),
                    "history": valuation_history(col)}
    drip_block(col, idx)
    pf = VH.portfolio(col, col["spot"], today=version["generated_at"][:10])
    idx["value"]["portfolio_daily"] = pf
    return idx

def main(argv):
    a = [x for x in argv if not x.startswith("--")]
    src, out = a[0], a[1]
    vpath = argv[argv.index("--version-json") + 1] if "--version-json" in argv else None
    col = load_collection(src)
    version = make_version(col, vpath)
    flips, detail = build_specimens(col)
    lots = build_lots(col)
    idx = build_index(col, flips, lots, version)
    for iso, recs in detail.items(): dump(f"{out}/detail/{iso}.json", recs)
    # remove stale detail files of ISOs that no longer exist
    for p in glob.glob(f"{out}/detail/*.json"):
        if os.path.basename(p)[:-5] not in detail: os.remove(p)
    dump(f"{out}/index.json", idx)
    dump(f"{out}/prices.json", prices_file(col, idx["value"]["portfolio_daily"], version))
    live = {f["scan"] for f in flips}; srch = {}
    for recs in detail.values():
        for sid, r in recs.items():
            if sid in live:
                text = search_text(r)
                if text: srch[sid] = text
    dump(f"{out}/search.json", srch)
    print(f"built {out}/: {len(flips)} flips, {sum(len(x) for x in lots)} lots, {len(detail)} detail files, {len(srch)} search entries")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
