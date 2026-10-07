#!/usr/bin/env python3
"""Convert Muse's own new-coin format into proper change files (fix list #47).

Muse keeps sending one line per coin as {"event": "specimen-create", "id": "NEW-n", "country", "year", "denomination", "mint_mark",
"class", "story", "confidence", "source", "value": {"amount", "currency", "confidence", "basis"}, "photo_sha256", "notes"}.
The pipeline cannot read that, so Claude re-filed it by hand three times. This does the mechanical part:

  python3 tools/pipeline/muse_convert.py MUSE_FILE.jsonl [--dry]

  - country name -> issuer (must already exist; a new country is left for Claude, because it needs a continent and currency)
  - denomination ("5 francs", "10 cent") -> an existing type of that country with the same value and unit whose issues cover the
    year (else the only same-denomination type, else a new Phase 1 type {ISO}.X.{value}-{unit})
  - value: the AI_START_HERE basis order. Same type already in the collection -> that coin's value; otherwise Muse's figure, kept low.
  - every event keeps by: model:muse-spark, phase 1, Muse's own source, plus a provenance note that it was converted.

It never reads the photo: the printed CHECK list is what Claude still verifies against the photo before publishing.
Output: collection/_incoming/changes_muse_{stamp}.jsonl (stamp from the input name) and a .CONVERTED.txt note in applied/.
Exit 2 when any line cannot be converted (nothing is written).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import collection_io as C  # noqa: E402

UNIT_ALIASES = {"cent": "cent", "cents": "cent", "centavo": "centavo", "centavos": "centavo", "centime": "centime", "centimes": "centime",
                "franc": "franc", "francs": "franc", "penny": "penny", "pence": "penny", "new pence": "penny", "new penny": "penny",
                "para": "para", "pare": "para", "rappen": "rappen", "piso": "piso", "peso": "peso", "pesos": "peso", "dollar": "dollar",
                "dollars": "dollar", "kopek": "kopek", "kopeks": "kopek", "kopecks": "kopek", "øre": "øre", "ore": "øre", "krona": "krona",
                "kronor": "krona", "kuruş": "kurus", "kurus": "kurus", "yen": "yen", "won": "won", "lire": "lira", "lira": "lira", "euro": "euro",
                "euro cent": "cent", "dinar": "dinar", "pfennig": "pfennig", "groschen": "groschen", "sentimo": "sentimo", "sentimos": "sentimo"}


def unit_key(u):
    u = (u or "").strip().lower()
    return UNIT_ALIASES.get(u, UNIT_ALIASES.get(u.split()[-1] if u else u, u.rstrip("s")))


def parse_denom(text):
    m = re.match(r"\s*([\d.,/]+)\s*(.+?)\s*$", text or "")
    if not m: return None, None
    v = m.group(1).replace(",", ".")
    try: val = float(v) if "/" not in v else float(v.split("/")[0]) / float(v.split("/")[1])
    except ValueError: return None, None
    return val, m.group(2)


def slug(v, unit):
    n = int(v) if float(v).is_integer() else v
    return f"{n}-{re.sub(r'[^a-z0-9]+', '-', unit.lower()).strip('-')}"


def convert(lines, col, ts, src_name):
    """-> (events, checks, problems)"""
    by_name = {i["name"].lower(): i for i in col.issuers}
    events, checks, problems = [], [], []
    prov = {"model": "muse-spark", "prompt_version": "unknown (Muse's own format)", "workflow": "phase1-photo",
            "run_id": "muse-conv-" + src_name, "raw": "converted by tools/pipeline/muse_convert.py from Muse's off-contract format"}
    n_new = 0
    for ln, m in enumerate(lines, 1):
        if m.get("event") != "specimen-create": problems.append(f"line {ln}: not a specimen-create line"); continue
        iss = by_name.get(str(m.get("country", "")).lower())
        if not iss: problems.append(f"line {ln}: country {m.get('country')!r} is not in the issuer list yet (Claude adds it: continent + currency)"); continue
        iso = iss["iso"]; year = m.get("year"); val, unit = parse_denom(m.get("denomination"))
        if val is None: problems.append(f"line {ln}: cannot read the denomination {m.get('denomination')!r}"); continue
        same = [t for t in col.types.values() if t.get("country") == iso and abs((t["denomination"].get("value") or 0) - val) < 1e-9
                and unit_key(t["denomination"].get("unit")) == unit_key(unit)]
        cover = [t for t in same if any(i.get("year") == year for i in t.get("issues", []))]
        mm = [m["mint_mark"]] if m.get("mint_mark") else []
        issue = {"year": year, "mint_marks": mm, "mint_text": f"{mm[0]}" if mm else "no mint mark visible"}
        src = (m.get("source") or "").strip() + " [converted from Muse's off-contract format by muse_convert.py]"
        base = {"ts": ts, "by": "model:muse-spark", "verified": False, "phase": 1, "confidence": m.get("confidence") or "med", "source": src,
                "provenance": dict(prov, inputs=[{"file": re.findall(r"[\w\-.]+\.(?:jpe?g|png|webp)", m.get("source") or "")[0]}] if re.findall(r"[\w\-.]+\.(?:jpe?g|png|webp)", m.get("source") or "") else [])}
        if cover or len(same) == 1:
            t = (cover or same)[0]; tid = t["id"]
            if not cover: checks.append(f"line {ln}: {year} is not yet an issue of {tid}; the pipeline adds it: check the type really fits")
        else:
            cur = (same[0]["denomination"].get("currency") if same else None) or next((t["denomination"].get("currency") for t in col.types.values() if t.get("country") == iso), None)
            tid = f"{iso}.X.{slug(val, unit)}"
            if tid not in col.types and not any(e.get("id") == tid for e in events):
                events.append(dict(base, entity="type", id=tid, op="create", field="(new record)",
                                   new={"class": "coin", "denomination": {"value": val, "unit": unit, "currency": cur}, "issues": [issue]}))
            if len(same) > 1: checks.append(f"line {ln}: {len(same)} types of {iso} {m.get('denomination')} and none lists {year}: made {tid}; pick the right one")
        # value: same type in the collection first (AI_START_HERE basis order), else Muse's figure (kept low)
        sib = [s for s in col.specs.values() if s.get("type") == tid and (s.get("value") or {}).get("est_usd") is not None]
        v = m.get("value") or {}
        if sib:
            est = sib[0]["value"]["est_usd"]; basis = f"same type in the collection ({sib[0]['id']}, ${est:.2f})"
        else:
            est = v.get("amount"); basis = f"Muse's figure ({v.get('basis') or 'no basis given'}); Claude: compare with similar coins in the collection"
            checks.append(f"line {ln}: value ${est} is Muse's own ({v.get('basis')}); check against comparable coins")
        cur_face = next((t["denomination"].get("currency") for t in col.types.values() if t.get("id") == tid), None) or (events[-1]["new"]["denomination"]["currency"] if events and events[-1]["entity"] == "type" else None)
        n_new += 1
        events.append(dict(base, entity="specimen", id=f"NEW-{n_new}", op="create", field="(new record)", source=src + f"; value basis: {basis}",
                           new={"type": tid, "year_raw": str(year), "issue": issue, "story": m.get("story"),
                                "notes": (m.get("notes") or "")[:400] or None,
                                "value": {"est_usd": est, "confidence": "low", "face": {"amount": val, "currency": cur_face}}}))
        checks.append(f"line {ln}: read {m.get('country')} {year} {m.get('denomination')}{' ' + mm[0] if mm else ''} on the photo yourself (sha256 {str(m.get('photo_sha256'))[:12]}...)")
        dup = [s["id"] for s in col.specs.values() if s.get("type") == tid and (s.get("issue") or {}).get("year") == year and (s.get("issue") or {}).get("mint_marks", []) == mm]
        if dup: checks.append(f"line {ln}: {', '.join(dup)} already is {tid} {year}{' ' + mm[0] if mm else ''}: same coin twice?")
    return events, checks, problems


def main(argv):
    if not argv or argv[0] in ("-h", "--help"): print(__doc__); return 0
    path = argv[0]; dry = "--dry" in argv
    lines = [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]
    name = os.path.basename(path)
    m = re.search(r"(\d{8})-(\d{4})", name)
    ts = f"{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:]}T{m.group(2)[:2]}:{m.group(2)[2:]}:00Z" if m else "2026-01-01T00:00:00Z"
    col = C.Collection(os.path.join(ROOT, "collection"))
    events, checks, problems = convert(lines, col, ts, name.split(".")[0])
    for p in problems: print("CANNOT CONVERT", p)
    if problems: return 2
    print(f"{len(events)} event(s) from {len(lines)} coin(s)")
    for c in checks: print("CHECK", c)
    if dry: return 0
    out = os.path.join(ROOT, "collection", "_incoming", name if name.endswith(".jsonl") else name + ".jsonl")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        for e in events: fh.write(json.dumps(e, ensure_ascii=False) + "\n")
    os.makedirs(os.path.join(ROOT, "collection", "_incoming", "applied"), exist_ok=True)
    with open(os.path.join(ROOT, "collection", "_incoming", "applied", name.split(".")[0] + ".CONVERTED.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"{name}: Muse's off-contract format, converted by tools/pipeline/muse_convert.py.\nOriginal lines:\n")
        for l in lines: fh.write(json.dumps(l, ensure_ascii=False) + "\n")
        fh.write("\nChecks for Claude:\n" + "\n".join(checks) + "\n")
    print("wrote", os.path.relpath(out, ROOT), "- verify the CHECK lines against the photos, then run publish.py")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
