"""Integrator remap of Gemini run-4 Titan lines onto the record's real fields (Claude, 2026-11-22).
Why: the GT-SECOND round-2 sheet named abstract facts (value, mint, catalog...) and its example used 'value.usd' (Claude's error);
GT-FILL asked to leave not-found fields unsent, but the files carry them as null. Nothing here changes a value Gemini sent."""
import json, glob, os, re, sys
COL, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
specs = {}
for f in glob.glob(os.path.join(COL, "specimens", "*.json")): specs.update(json.load(open(f)))
TO = {"value.usd": ("specimen", "value.est_usd"), "issue.mint_marks": ("specimen", "issue.mint_marks"), "issue.mint": ("specimen", "issue.mint_marks"),
      "mint": ("specimen", "issue.mint_marks"), "issue.year": ("specimen", "issue.year"),
      "catalog": ("type", "catalogs"), "catalog.km": ("type", "catalogs"), "catalogs": ("type", "catalogs"),
      "denomination": ("type", "denomination.value"), "composition": ("type", "composition.text"), "composition.text": ("type", "composition.text"),
      "ruler": ("type", "ruler")}
FREE = {"story", "design", "design.text", "period", "type.period"}     # free text: the sheet never showed the record's text, so an 'agree' cannot be judged
report = {"kept": 0, "remapped": 0, "left_free_text": 0, "left_null": 0, "left_unreadable": 0, "fill_null_dropped": 0}
notes = []
def mint_marks(v):
    if isinstance(v, list): return v
    if isinstance(v, str) and re.search(r"no mint ?mark", v, re.I): return []
    return None
def catalogs(v):
    if isinstance(v, list): return v
    m = re.match(r"\s*(KM|Y|N|Sch[oö]n)\s*#\s*([\w.\-]+)\s*$", str(v), re.I)
    return [{"system": {"n": "Numista"}.get(m.group(1).lower(), m.group(1).upper() if m.group(1).lower() in ("km", "y") else m.group(1)), "number": m.group(2)}] if m else None
def denom(v):
    m = re.match(r"\s*(\d+(?:\.\d+)?)\b", str(v)); return (float(m.group(1)) if "." in m.group(1) else int(m.group(1))) if m else None
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(os.path.join(SRC, "*.jsonl"))):
    out = []
    for n, l in enumerate(open(f), 1):
        if not l.strip(): continue
        e = json.loads(l); e.setdefault("op", "set")
        rid = (e.get("provenance") or {}).get("run_id", "")
        if rid.startswith("GT-FILL"):
            if e.get("new") is None: report["fill_null_dropped"] += 1; continue
            out.append(e); report["kept"] += 1; continue
        fld = e["field"]
        if e.get("new") is None: report["left_null"] += 1; continue
        if fld in FREE: report["left_free_text"] += 1; continue
        ent, nf = TO[fld]; new = e["new"]
        if nf == "issue.mint_marks": new = mint_marks(new)
        elif nf == "catalogs": new = catalogs(new)
        elif nf == "denomination.value": new = denom(new)
        if new is None: report["left_unreadable"] += 1; notes.append(f"{e['id']} {fld}={json.dumps(e['new'])[:80]}"); continue
        if ent == "type": e["id"] = specs[e["id"]]["type"]
        if (ent, nf, new) != (e["entity"], fld, e["new"]): report["remapped"] += 1
        e["entity"], e["field"], e["new"] = ent, nf, new
        e.pop("old", None)            # blind: the sheet showed no value
        out.append(e); report["kept"] += 1
    with open(os.path.join(OUT, os.path.basename(f)), "w") as w:
        for e in out: w.write(json.dumps(e, ensure_ascii=False) + "\n")
print(json.dumps(report)); print("unreadable:", *notes, sep="\n  ")
