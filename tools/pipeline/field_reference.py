#!/usr/bin/env python3
"""Generate collection/templates/FIELDS.md (every writable field path per entity, with type and units) from schema/v2/defs.schema.json.

usage (repo root):  python3 tools/pipeline/field_reference.py [--check]
    --check   exit 1 if collection/templates/FIELDS.md is out of date (used by test_pipeline.py)
After regenerating, run: python3 tools/schema/validate.py collection/ --update-manifest   (FIELDS.md is listed in manifest.json)
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SCHEMA = os.path.join(ROOT, "schema", "v2", "defs.schema.json")
OUT = os.path.join(ROOT, "collection", "templates", "FIELDS.md")
ENTITIES = [("specimen", "Specimen", "one physical piece the owner holds (`C###` coin, `T###` token/medal/prop)"),
            ("type", "Type", "what a coin IS; shared by all its specimens (`CH.KM.24a.1`, `CA.X.1-cent`)"),
            ("lot", "Lot", "bullion `B###`, set `S###`, housing `H###`, stamps `P###`"),
            ("album", "AlbumVolume", "a binder volume `A###` and its slot grid (Phase 1.5)"),
            ("photo", "Photo", "one photo record (create only: `op: create`)"),
            ("issuer", "Issuer", "who issued (country or historical issuer; create only)")]
UNITS = [("_g", "grams"), ("_mm", "millimetres"), ("_oz", "troy ounces"), ("_usd", "US dollars"), ("_cents", "cents")]

DEFS = json.load(open(SCHEMA, encoding="utf-8"))["$defs"]

def resolve(s):
    while "$ref" in s:
        ref = DEFS[s["$ref"].split("/")[-1]]
        s = {**ref, **{k: v for k, v in s.items() if k != "$ref"}}
    return s

def typ(s):
    s = resolve(s)
    if "oneOf" in s or "anyOf" in s:
        parts = [typ(x) for x in s.get("oneOf", s.get("anyOf"))]
        return " or ".join(dict.fromkeys(parts))
    if "enum" in s:
        return "one of " + ", ".join("null" if v is None else f'`{v}`' for v in s["enum"])
    if "const" in s: return f"`{s['const']}`"
    t = s.get("type", "any")
    ts = t if isinstance(t, list) else [t]
    out = []
    for x in ts:
        if x == "array":
            it = resolve(s.get("items", {}))
            out.append("list of " + (it.get("type", "object") if not isinstance(it.get("type"), list) else "/".join(it["type"]) if it.get("type") else "object"))
        else: out.append(x)
    r = " or ".join(out)
    pat = s.get("pattern")
    if pat == r"^\d{4}(-\d{2}(-\d{2})?)?$": r += " (YYYY, YYYY-MM or YYYY-MM-DD)"
    elif pat == r"^[A-Z]{3}$": r += " (ISO 4217 code, e.g. USD)"
    elif pat: r += f" matching `{pat}`"
    if "minimum" in s: r += f", >= {s['minimum']}"
    if "format" in s: r += f" ({s['format']})"
    return r

def units(path, s):
    leaf = path.split(".")[-1]
    for suf, u in UNITS:
        if leaf.endswith(suf): return u
    return ""

def walk(s, path, rows, depth=0):
    s = resolve(s)
    if "oneOf" in s or "anyOf" in s:                                       # date-or-null style unions
        subs = [resolve(x) for x in s.get("oneOf", s.get("anyOf"))]
        objs = [x for x in subs if x.get("type") == "object" and x.get("properties")]
        if not objs: rows.append((path, typ(s), units(path, s), s.get("description", ""))); return
        walk(objs[0], path, rows, depth); return
    t = s.get("type")
    ts = t if isinstance(t, list) else [t]
    if "object" in ts and s.get("properties"):
        if path and "null" in ts:
            rows.append((path, typ(s), units(path, s), s.get("description", "")))      # the whole object may be set to null
        elif path and depth > 0 and not s.get("description"):
            pass
        for k, v in s["properties"].items(): walk(v, f"{path}.{k}" if path else k, rows, depth + 1)
        return
    if "array" in ts and s.get("items") is not None:
        it = resolve(s["items"])
        rows.append((path, typ(s), units(path, s), s.get("description", "")))          # whole list (replace all)
        if it.get("type") == "object" and it.get("properties"):
            for k, v in it["properties"].items(): walk(v, f"{path}.N.{k}", rows, depth + 1)
        return
    rows.append((path, typ(s), units(path, s), s.get("description", "")))

def required(s):
    return set(resolve(s).get("required", []))

def build():
    L = ["# Field reference (generated: do not edit)", "",
         "Every field path you can write in a change event, per entity. Generated from `schema/v2/defs.schema.json` by `python3 tools/pipeline/field_reference.py`.", "",
         "How to read it: `field` in your event is the **path** below. `N` is a list position starting at 0 (`issues.0.mintage`). "
         "`null` means \"not known\" and is always allowed where the type lists `null`. Types: `string`, `number` (decimal), `integer` (whole), `boolean` (`true`/`false`), `array` (JSON list), `object`. "
         "A path that names a whole object or list replaces all of it; prefer the leaf path (one event per fact). "
         "Units are in the field name: `_g` grams, `_mm` millimetres, `_oz` troy ounces, `_usd` US dollars. "
         "`id` and `ser` can never be written by a contribution; `story` is only the owner's.", "",
         "A value of the wrong type rejects your whole file with a line-numbered report (nothing is changed). Check yourself first: `python3 tools/pipeline/apply_changes.py --dry-run <file>`.", ""]
    for ent, name, blurb in ENTITIES:
        sch = resolve(DEFS[name]); rows = []
        walk(sch, "", rows)
        req = sorted(required(sch))
        L += [f"## entity `{ent}`: {blurb}", ""]
        if req: L += [f"Required keys of a whole record: {', '.join('`'+r+'`' for r in req)}.", ""]
        L += ["| field path | type | units | meaning |", "|---|---|---|---|"]
        for path, ty, un, desc in rows:
            if not path: continue
            d = " ".join(desc.split()).replace("|", "/")
            ty = ty.replace("|", "\\|")
            L.append(f"| `{path}` | {ty} | {un} | {d} |")
        L.append("")
    return "\n".join(L).rstrip() + "\n"

def main(argv):
    text = build()
    if "--check" in argv:
        cur = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if cur != text: print("collection/templates/FIELDS.md is out of date: run python3 tools/pipeline/field_reference.py"); return 1
        return 0
    open(OUT, "w", encoding="utf-8", newline="\n").write(text)
    print(f"wrote {OUT} ({text.count(chr(10))} lines)")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
