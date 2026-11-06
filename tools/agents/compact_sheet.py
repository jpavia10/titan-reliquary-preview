#!/usr/bin/env python3
"""Compact answer sheets for an AI that reads Drive only (owner, 2026-11-05: "load up gemini"; "hyper specific so it doesnt artificially complete work").

A full sheet line is ~800 bytes of JSON, so 160 lines are 120 KB: too big for one Drive upload and for one answer. The compact sheet numbers
every line of one or more open sheets, shows only what the AI must look at, and takes back one short JSON row per number:

  python3 tools/agents/compact_sheet.py make HW-gemini-verify-20261105-1 [HW-... ...] --out DIR [--max-bytes 12000]
      -> DIR/'{pack} (part k of K).txt' (each part stands alone: the rules on top, then its numbered lines)
         + docs/agents/homework/packs/{pack}.json: the code -> sheet line map, frozen, so a sheet re-rendered later never shifts a code
  python3 tools/agents/compact_sheet.py answers ANSWERS.jsonl [--out collection/_incoming] [--now 2026-11-06T10:00:00Z]
      -> one ordinary change file per agent (changes_{agent}_{YYYYMMDD-HHMM}.jsonl) built from the sheet lines, + a report of every row left out

An answer row: {"line": "V12", "verdict": "agree" | "differ" | "cannot", "new": <only with differ>, "url": "<exact page>", "quote": "<the words on it>"}
The converter never fills a gap: a row without an exact page or a quote, an agree on a value it cannot see, a differ that repeats the shown
value, or a number not on the sheet is left out and listed, never guessed. What it writes still goes through apply_changes like any file.
"""
import argparse, datetime, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SHEETS = os.path.join(ROOT, "docs", "agents", "homework", "sheets")
PACKS = os.path.join(ROOT, "docs", "agents", "homework", "packs")      # the frozen code -> line map of every pack sent out (a sheet can change later)
FILL = "FILL"
PREFIX = {"verify": "V", "cite": "C", "story-check": "S", "value": "P", "fill": "F", "read-mint": "M", "research": "R", "arbitrate": "A",
          "plain-story": "W", "catno": "N", "contradiction": "X"}
PHOTO = re.compile(r"^C\d{3}_(obv|rev)\w*\.(webp|jpe?g|png)$", re.I)


def kind_of(sheet_id):
    m = re.match(r"HW-[\w.]+?-((?:read-mint|story-check|plain-story)|[a-z]+)-\d{8}-\d+$", sheet_id)
    return m.group(1) if m else "verify"


def load_sheet(sheet_id, sheets=SHEETS):
    with open(os.path.join(sheets, sheet_id + ".jsonl"), encoding="utf-8") as fh:
        return [json.loads(x) for x in fh if x.strip()]


def numbered(sheet_ids, sheets=SHEETS):
    """[(code, sheet_id, line)] with codes unique across the pack: V1.. for verify, C1.. for cite, ..."""
    out, seen = [], {}
    for sid in sheet_ids:
        p = PREFIX.get(kind_of(sid), "L")
        for ln in load_sheet(sid, sheets):
            seen[p] = seen.get(p, 0) + 1
            out.append((f"{p}{seen[p]}", sid, ln))
    return out


def _show(v, n=400):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[:n - 1] + "…"


def label(ln):
    m = re.match(r"FILL \((.*?)\):", ln.get("source") or "")
    return m.group(1) if m else f"{ln['entity']} {ln['id']}"


def blind(ln):
    return ln.get("new") is None and ("photo file" in (ln.get("source") or "") or bool((ln.get("provenance") or {}).get("inputs")))


FORMAT = {   # the form "new" must take, by field (the pipeline rejects any other form)
    "catalogs": 'a list: [{"system": "KM", "number": "123"}, {"system": "Numista", "number": "NNNN", "url": "https://en.numista.com/catalogue/piecesNNNN.html"}]',
    "nominal.weight_g": "a number in grams, e.g. 5.5", "nominal.diameter_mm": "a number in mm, e.g. 24.5",
    "composition.text": 'the alloy as the entry gives it, e.g. "copper-nickel (75% copper, 25% nickel)"',
    "composition.metal_class": "one of gold silver platinum palladium copper bronze brass nickel cupronickel aluminum steel plated steel zinc iron clad bimetallic other",
    "mintage": "a whole number (pieces struck for THAT year and mint), e.g. 34472000",
    "value.est_usd": "a number in US dollars for this coin as photographed, e.g. 0.75", "value.confidence": "low | medium | high",
    "period": "a short era name", "issue.mint_marks": 'a list of the letters on the coin, e.g. ["D"], or [] for none',
    "issue.year": "the year on the coin, a whole number", "denomination.value": "the number in the denomination, e.g. 25",
}


def hint(ln):
    """What the line asks, in a few words, from the sheet's own FILL text (the year hint, the value format)."""
    src = ln.get("source") or ""
    out = []
    m = re.search(r"\(this line is the (\d{4}) issue[^)]*\)", src)
    if m: out.append(f"the {m.group(1)} row only")
    m = re.search(r"`new` = (.+?); leave FILL", src) or re.search(r"`new` = ([^;)]+)", src)   # the hint may hold its own ( ) and ;
    f = ln.get("field", "")
    fmt = FORMAT.get(f) or FORMAT.get(f.split(".")[-1]) if not m else None
    if m: out.append("new = " + m.group(1).strip())
    elif fmt: out.append("new = " + fmt)
    return " · ".join(out)


def row_text(code, ln, kind):
    what = f"{ln['entity']} {ln['id']} · {ln['field']}"
    if blind(ln) and ln["entity"] == "type":   # a type id like GB.X.20-pence names the denomination: hide it on a blind read
        what = f"type (id hidden on a blind read) · {ln['field']}"
    shown = ln.get("new")
    if kind == "story-check":
        body = f"story: «{_show(ln.get('old'), 900)}»"
    elif blind(ln):
        pics = [x.get("file") for x in (ln.get("provenance") or {}).get("inputs") or [] if x.get("file")]
        body = "BLIND: read it yourself" + (f" from {', '.join(pics)}" if pics else "") + " (nothing shown on purpose)"
    elif shown in (None, "", []):
        body = "EMPTY: find it (nothing recorded yet)"
    else:
        body = f"shown: «{_show(shown)}»"
    h = hint(ln)
    return f"{code} | {label(ln)} | {what} | {body}" + (f" | {h}" if h else "")


RULES = """TITAN HOMEWORK, COMPACT SHEET {pack} (part {k} of {K}) · sheets {sheets} · lines {first}-{last} of {total} · due {due}
SEND: Drive 'Titan Reliquary/collection-incoming (AI change files)/answers_{agent}_{pack}_part{k}_YYYYMMDD-HHMM.jsonl' (UTC time you
finished), ONE JSON row per line code below and nothing else (no code fences):
 {{"line":"V12","verdict":"agree","url":"https://en.numista.com/catalogue/piecesNNNN.html","quote":"Obverse: National arms, eagle left"}}
 {{"line":"V13","verdict":"differ","new":"Ubico era","url":"https://...","quote":"the words on that page that show it"}}
 {{"line":"V14","verdict":"cannot","url":"","quote":"where you looked and why it is not there"}}
RULES (a row breaking one is thrown out and counts against you):
 1. {total_part} rows for this part, one per code. Count before you save.
 2. url = the exact page you read for THIS coin (never a front page, a search page or another coin's page). BLIND lines: url = the photo file.
 3. quote = the words on that page (or what you see on the coin) that show it, 8-200 characters.
 4. agree only when YOUR source shows what 'shown' says. Some shown values are planted wrong; agreeing with one is a miss.
 5. differ: "new" = what your source shows, in the form after 'new ='. BLIND and EMPTY lines: differ with your value, or cannot.
 6. cannot = you looked and it is not there. An honest cannot beats a guess. Never answer from memory; never copy 'shown' into new.
 7. S lines: agree = every claim holds on your page; differ = new is the story with only the wrong words fixed. P lines: a price page for
    this coin and year; quote = the price row + the grade you assumed.
LINES:
"""


def make(sheet_ids, out_dir, agent=None, max_bytes=12000, sheets=SHEETS, due=None, pack=None, packs=None):
    rows = numbered(sheet_ids, sheets)
    if not rows: raise SystemExit("no lines in " + ", ".join(sheet_ids))
    agent = agent or (rows[0][2].get("provenance") or {}).get("model") or rows[0][2]["by"].split(":")[-1]
    pack = pack or (sheet_ids[0] if len(sheet_ids) == 1 else f"PACK-{agent}-{hashlib.sha1('|'.join(sheet_ids).encode()).hexdigest()[:6]}")
    texts = [row_text(c, ln, kind_of(sid)) for c, sid, ln in rows]
    parts, cur, size = [], [], 0
    budget = max_bytes - 2300                                     # room for the rules on top of every part
    for i, t in enumerate(texts):
        b = len(t.encode("utf-8")) + 1
        if cur and size + b > budget: parts.append(cur); cur, size = [], 0
        cur.append(i); size += b
    if cur: parts.append(cur)
    os.makedirs(out_dir, exist_ok=True); written = []
    if packs:
        os.makedirs(packs, exist_ok=True)
        with open(os.path.join(packs, pack + ".json"), "w", encoding="utf-8") as fh:
            json.dump({"pack": pack, "agent": agent, "made": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "due": due,
                       "sheets": list(sheet_ids), "parts": len(parts), "lines": {c: [sid, ln] for c, sid, ln in rows}}, fh, ensure_ascii=False, indent=0)
            fh.write("\n")
    for k, idx in enumerate(parts, 1):
        head = RULES.format(pack=pack, k=k, K=len(parts), sheets=", ".join(sheet_ids), first=rows[idx[0]][0], last=rows[idx[-1]][0],
                            total=len(rows), total_part=len(idx), due=due or "see your WORK QUEUE", agent=agent)
        body = head + "".join(texts[i] + "\n" for i in idx)
        name = f"{pack} (part {k} of {len(parts)}).txt"
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as fh: fh.write(body)
        written.append((name, len(body.encode("utf-8")), len(idx)))
    return written


def _coerce(new, old):
    if isinstance(old, list) and isinstance(new, str): return [x.strip() for x in new.split(",") if x.strip()] if "," in new else [new.strip()]
    if isinstance(old, (int, float)) and not isinstance(old, bool) and isinstance(new, str):
        try: return int(new) if re.fullmatch(r"-?\d+", new.strip().replace(",", "")) else float(new.strip().replace(",", ""))
        except ValueError: return new
    return new


EXAMPLE_URL = re.compile(r"NNNN|pieces1234\.html|example\.com", re.I)   # the sheet's own examples (2026-10-15: two answers cited N#1234)


def front_page(url):
    if EXAMPLE_URL.search(url or ""): return True
    m = re.match(r"https?://[^/]+/?(.*)$", url or "")
    if not m: return True
    path = m.group(1)
    return path in ("", "index.html") or bool(re.match(r"^(search|catalogue/?$|\?)", path))


def convert(rows, sheet_index, now):
    """rows: parsed answer rows; sheet_index: code -> (sheet_id, line). Returns ({agent: [change lines]}, [(code, why)])."""
    out, left, seen = {}, [], set()
    for r in rows:
        code = str(r.get("line") or r.get("n") or "").strip().upper()
        if code not in sheet_index: left.append((code or "?", "not a line code on the sheet")); continue
        if code in seen: left.append((code, "answered twice: only the first row counts")); continue
        seen.add(code)
        sid, ln = sheet_index[code]
        verdict = str(r.get("verdict") or "").strip().lower(); url = str(r.get("url") or "").strip(); quote = str(r.get("quote") or "").strip()
        if verdict == "cannot": left.append((code, "cannot: " + (quote[:120] or "no reason given"))); continue
        if verdict not in ("agree", "differ"): left.append((code, f"verdict {verdict!r} is not agree / differ / cannot")); continue
        is_blind = blind(ln)
        if is_blind:
            if not PHOTO.match(os.path.basename(url)) and front_page(url): left.append((code, "a blind line cites the photo file read (e.g. C114_obv.webp)")); continue
        elif front_page(url): left.append((code, f"not an exact page: {url[:80] or '(empty)'}")); continue
        if not (8 <= len(quote) <= 400): left.append((code, "quote missing or longer than 400 characters")); continue
        shown = ln.get("new")
        if verdict == "agree":
            if shown in (None, "", []) or is_blind: left.append((code, "agree with nothing shown: a BLIND or EMPTY line needs differ + your value")); continue
            new = shown
        else:
            if "new" not in r or r.get("new") in (None, "") and not isinstance(shown, list): left.append((code, "differ without a new value")); continue
            new = _coerce(r["new"], ln.get("old") if ln.get("old") is not None else shown)
            if new == shown and not is_blind and shown not in (None, "", []): left.append((code, "differ repeats the shown value (use agree)")); continue
        x = json.loads(json.dumps(ln))
        x["ts"] = now; x["new"] = new
        x["source"] = f"{url} (\"{quote}\")"
        prov = x.setdefault("provenance", {}); ins = [i for i in prov.get("inputs") or [] if i.get("file") != url]
        prov["inputs"] = [{"file": url}] + ins if url else ins
        prov["workflow"] = prov.get("workflow") or "homework"; prov["raw"] = f"compact answer {code}"
        m = re.match(r"HW-(.+?)-(?:read-mint|story-check|plain-story|[a-z]+)-\d{8}-\d+$", prov.get("assignment") or sid)
        agent = m.group(1) if m else (prov.get("model") or "unknown")
        out.setdefault(agent, []).append(x)
    return out, left


def sheet_index_for(rows_codes):
    return {c: (sid, ln) for c, sid, ln in rows_codes}


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    m = sp.add_parser("make"); m.add_argument("sheets", nargs="+"); m.add_argument("--out", required=True); m.add_argument("--max-bytes", type=int, default=12000)
    m.add_argument("--due"); m.add_argument("--pack")
    a = sp.add_parser("answers"); a.add_argument("file"); a.add_argument("--pack", help="the pack id (default: the pack named in the file name)"); a.add_argument("--sheets", nargs="*", help="the pack's sheet ids (default: every sheet the rows' file name names)")
    a.add_argument("--out", default=os.path.join(ROOT, "collection", "_incoming")); a.add_argument("--now")
    o = ap.parse_args(argv)
    if o.cmd == "make":
        for name, size, n in make(o.sheets, o.out, max_bytes=o.max_bytes, due=o.due, pack=o.pack, packs=PACKS):
            print(f"{size:6d} B  {n:3d} lines  {name}")
        return 0
    raw = open(o.file, encoding="utf-8").read()
    rows = []
    for k, line in enumerate(raw.splitlines(), 1):
        line = line.strip().strip(",")
        if not line or line.startswith(("```", "//", "#")): continue
        try: rows.append(json.loads(line))
        except json.JSONDecodeError: print(f"row {k}: not JSON, left out: {line[:80]}", file=sys.stderr)
    frozen = None
    for name in sorted(os.listdir(PACKS)) if os.path.isdir(PACKS) else []:
        if name.endswith(".json") and (o.pack == name[:-5] or (not o.pack and name[:-5] in os.path.basename(o.file))): frozen = os.path.join(PACKS, name)
    if frozen:
        with open(frozen, encoding="utf-8") as fh: idx = {c: tuple(v) for c, v in json.load(fh)["lines"].items()}
        print(f"pack {os.path.basename(frozen)[:-5]}: {len(idx)} lines (frozen when it was sent)")
    else:
        ids = o.sheets or sorted(set(re.findall(r"HW-[\w.\-]+?-\d{8}-\d+", os.path.basename(o.file) + " " + raw)))
        if not ids: raise SystemExit("name the pack with --pack or its sheets with --sheets HW-...")
        idx = sheet_index_for(numbered(ids))
    now = o.now or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out, left = convert(rows, idx, now)
    stamp = now[:16].replace("-", "").replace(":", "").replace("T", "-")
    for agent, lines in out.items():
        p = os.path.join(o.out, f"changes_{agent}_{stamp}.jsonl")
        with open(p, "w", encoding="utf-8") as fh: fh.write("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in lines))
        print(f"{len(lines)} lines -> {p}")
    missing = sorted(set(idx) - {str(r.get('line') or r.get('n') or '').strip().upper() for r in rows}, key=lambda c: (c[0], int(c[1:])))
    print(f"{len(rows)} rows read, {sum(len(v) for v in out.values())} kept, {len(left)} left out, {len(missing)} codes not answered")
    for c, why in left: print(f"  {c}: {why}")
    if missing: print("  not answered: " + ", ".join(missing[:60]) + (" …" if len(missing) > 60 else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
