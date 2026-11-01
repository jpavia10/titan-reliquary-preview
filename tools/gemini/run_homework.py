#!/usr/bin/env python3
"""Answer the Gemini API's homework sheets through the API (owner, 2026-10-31: "Gemini api will be a new source and sub sources based on
model used"; CLAUDE.md rule 13: the owner's free-tier key, used by Claude from the session).

  python3 tools/gemini/run_homework.py [--model M] [--assignment HW-gemini-api-...] [--dry]     (default: 3.5 Flash Lite for text-only
                                                                                                   sheets, 3.6 Flash for photo sheets)
  python3 tools/gemini/run_homework.py --photo photos/p1/C123_obv.webp [--model ...]     a blind first reading of one photo (prints JSON)
  python3 tools/gemini/run_homework.py --pack docs/bakeoff/pack-20261008-main --out FILE --model M    the blind photo test on one model

The source is "gemini-api" (docs/agents/roles.json); each model is a sub-source: every line is written `by: model:gemini-api:<model>` with
`provenance.model: <model>`, so the loop measures each model on its own (homework.py measure() "models") while all of them are one
contributor, and one family with the Gemini app (never two readers of one fact: tools/pipeline/provenance.py FAMILY).
What it answers: photo readings (read-mint, the blind year / mint / face value checks) with the coin's own photos attached, and plain-English
story rewrites. The free tier has no Google Search quota and Numista, NGC, uCoin and Colnect refuse Google's page fetcher, so it never answers
a line that needs a catalogue page; any line whose source names a web address is dropped (nothing it did not open can reach the file).
Every answer is checked here before the file is written (types, digits and capital-letter inscriptions kept in a rewrite); then publish.py
merges collection/_incoming/changes_gemini-api_YYYYMMDD-HHMM.jsonl like any contributor's file.
"""
import argparse, datetime, glob, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "agents"))
import ask as A            # noqa: E402  (tools/gemini/ask.py: key, retries, streaming)

SOURCE = "gemini-api"
PROMPT_VERSION = "GEMINI-API-HOMEWORK@2026-10-31"
SHEETS = os.path.join(ROOT, "docs", "agents", "homework", "sheets")
STATE = os.path.join(ROOT, "docs", "agents", "homework", "assignments.json")
INCOMING = os.path.join(ROOT, "collection", "_incoming")
URL = re.compile(r"https?://", re.I)
LEGEND = re.compile(r"\b[A-ZÀ-ÖØ-Þ]{3,}\b")
PAUSE = 4.0                # seconds between calls (free-tier requests per minute)
DEFAULT = "gemini-3.6-flash"   # photo work: the photo test, 2026-10-31 (collaborators/MODEL_ACCURACY.md): no real misread of country, year or face value
TEXT_MODEL = "gemini-3.5-flash-lite"   # text-only work (owner, 2026-11-01: "Flash lite should probably be used for text only stuff"): fast, its own quota
TEXT_KINDS = {"plain-story"}           # sheets with no photo: rewording only, every number and inscription checked by same_facts()


def model_for(kind, override=None):
    """--model wins; else Flash Lite for text-only sheets and 3.6 Flash for photo sheets."""
    return override or (TEXT_MODEL if kind in TEXT_KINDS else DEFAULT)
NO_PHOTO = {"gemini-3.5-flash-lite": "misread 2 years, 7 face values and 3 mint marks of 30 in the photo test",
            "gemma-4-31b-it": "misread real years, face values and mint marks in the photo test (47 % core)"}   # they take no photo work


class Quota(Exception): pass

SYSTEM = ("You read real coins from photographs for a private collection's records. Answer only from what you can see in the photos. "
          "Never guess: when a detail is worn, hidden or outside the photo, answer null. Answer with one JSON object and nothing else.")
HOW = {"issue.year": "the year on the coin as a number (the Western year: convert a Hijri, Showa, Heisei or ROC date and say so in `seen`)",
       "issue.mint_marks": 'the mint letters as a list, e.g. ["D"], or [] when you can see the whole coin and it has none',
       "issue.mint_text": 'one short phrase: the mark and where it is, e.g. "D (Denver), right of the date", or "no mint mark"',
       "denomination.value": "the face value as a number, e.g. 50 for 50 centavos, 0.5 for a half franc"}


def now_utc(): return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def photo_path(name):
    hits = glob.glob(os.path.join(ROOT, "photos", "**", name), recursive=True)
    return hits[0] if hits else None


def json_of(text):
    """The first JSON object or list in an answer (the model sometimes wraps it in a code fence)."""
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    s = m.group(1) if m else text
    for o, c in (("{", "}"), ("[", "]")):
        i, j = s.find(o), s.rfind(c)
        if i >= 0 and j > i:
            try: return json.loads(s[i:j + 1])
            except ValueError: continue
    return None


def call(model, text, images=(), system=SYSTEM, log=None):
    try: ans, finish, usage = A.ask(text, model, 8192, 0.1, system, "low" if "lite" in model or model.startswith("gemini-3") else None, images)
    except SystemExit as e: raise Quota(str(e)[:200])      # the day's free quota (3.6 Flash: 20 requests) or a stalled model: keep what is answered
    if log is not None: log.append({"model": model, "in": usage.get("promptTokenCount"), "out": usage.get("candidatesTokenCount"), "finish": finish})
    time.sleep(PAUSE)
    return (json_of(ans) if finish == "STOP" else None), int((usage.get("promptTokenCount") or 0) + (usage.get("candidatesTokenCount") or 0))


def typed(field, v):
    """The value in the record's own type, or None when it is not one."""
    if v is None: return None
    if field == "issue.year": return v if isinstance(v, int) and 600 < v < 2100 else (int(v) if isinstance(v, str) and v.isdigit() and 600 < int(v) < 2100 else None)
    if field == "issue.mint_marks": return v if isinstance(v, list) and all(isinstance(x, str) and 0 < len(x) <= 4 for x in v) else None
    if field == "denomination.value": return v if isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0 else None
    if field == "issue.mint_text": return v.strip() if isinstance(v, str) and 3 <= len(v.strip()) <= 120 else None
    return None


def read_photos(model, coin, lines, log):
    """One coin, its photo lines answered together. -> {field: (value, seen, file)}"""
    files = sorted({x["file"] for ln in lines for x in (ln.get("provenance") or {}).get("inputs", []) if x.get("file")})
    paths = [p for p in (photo_path(f) for f in files) if p]
    if not paths: return {}, 0
    # the sheet's label hides the fact it asks for (homework.py BLIND); with two lines on one coin, one label would show the other's answer
    label = re.sub(r"^FILL \((.*?)\).*$", r"\1", lines[0].get("source") or "", flags=re.S) if len(lines) == 1 else ""
    ask_for = {ln["field"]: HOW.get(ln["field"], "what you read") for ln in lines}
    text = (f"Coin {coin}" + (f" (the record calls it: {label})" if label and "·" in label else "") + f". Photos: {', '.join(os.path.basename(p) for p in paths)} (in that order).\n"
            "Read these facts from the photos and answer as JSON: {\"answers\": {field: {\"value\": ..., \"seen\": \"what you saw and on which photo\"}}}.\n"
            + "\n".join(f"- {f}: {h}" for f, h in ask_for.items()))
    out, tok = call(model, text, paths, log=log)
    res = {}
    for f, a in ((out or {}).get("answers") or {}).items():
        if f in ask_for and isinstance(a, dict):
            v = typed(f, a.get("value")); seen = str(a.get("seen") or "").strip()
            if v is not None and len(seen) >= 4 and not URL.search(seen): res[f] = (v, seen[:160], os.path.basename(paths[0]))
    return res, tok


def same_facts(old, new):
    """A rewrite keeps every number and every capital-letter inscription of the story."""
    nums = lambda s: sorted(re.findall(r"\d+(?:[.,]\d+)?", s))
    return nums(old) == nums(new) and set(LEGEND.findall(old)) <= set(LEGEND.findall(new)) and 0.6 <= len(new) / max(1, len(old)) <= 1.4


def rewrite(model, lines, log):
    items = [{"id": ln["id"], "story": ln.get("old") or ""} for ln in lines if ln.get("old")]
    if not items: return {}, 0
    text = ("Rewrite each coin story in plain, warm English for the owner's collection app. Keep every fact, number, name, inscription (in capitals, "
            "exactly as written) and the order of ideas; change only the wording so it reads easily aloud: short sentences, no lists of more than "
            "three things, no abbreviations (copper-nickel, not Cu-Ni), no symbols (·, &, /, +). Never add a fact. Answer as JSON: "
            "{\"stories\": {id: \"the new story\"}}.\n\n" + json.dumps(items, ensure_ascii=False))
    out, tok = call(model, text, system="You edit short museum labels. Answer with one JSON object and nothing else.", log=log)
    res = {}
    for ln in lines:
        new = ((out or {}).get("stories") or {}).get(ln["id"])
        if isinstance(new, str) and new.strip() and new.strip() != ln.get("old") and same_facts(ln.get("old") or "", new.strip()) and not URL.search(new): res[ln["id"]] = new.strip()
    return res, tok


def answer_sheet(model, asg, log, out):
    p = os.path.join(SHEETS, asg["id"] + ".jsonl")
    if not os.path.exists(p): print(f"{asg['id']}: no sheet file"); return []
    lines = [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]
    stamp = now_utc(); n0 = len(out)
    def emit(ln, new, source, tok):
        e = dict(ln, ts=stamp, by=f"model:{SOURCE}:{model}", new=new, source=source[:300])
        pv = dict(e.get("provenance") or {}); pv.update(model=model, prompt_version=PROMPT_VERSION, run_id=f"{asg['id']}@{model}", tokens=tok); e["provenance"] = pv
        if URL.search(e["source"]): return          # it opened no page: a web address cannot be its source
        out.append(e)
    if asg["kind"] == "plain-story":
        for i in range(0, len(lines), 8):
            res, tok = rewrite(model, lines[i:i + 8], log)
            for ln in lines[i:i + 8]:
                if ln["id"] in res: emit(ln, res[ln["id"]], f"plain-English rewrite of the existing story; no facts changed (Gemini API, {model})", tok // max(1, len(res)))
        return len(out) - n0
    if model in NO_PHOTO: print(f"{asg['id']}: {model} takes no photo work ({NO_PHOTO[model]}); use --model {DEFAULT}"); return 0
    by_coin = {}
    for ln in lines:
        if ln.get("field") in HOW and (ln.get("provenance") or {}).get("inputs"): by_coin.setdefault(ln["id"], []).append(ln)
        # a line needing a catalogue page (non-blind verify) is left out: it goes back to the pool for an AI with web access
    for coin, ls in by_coin.items():
        res, tok = read_photos(model, coin, ls, log)
        for ln in ls:
            if ln["field"] in res:
                v, seen, f = res[ln["field"]]
                emit(ln, v, f"{f}: {seen} (read by the Gemini API, {model})", tok // max(1, len(res)))
    return len(out) - n0


def blind_photo(model, path):
    """A first reading of a new photo: country, year, face value, mint mark (printed, never filed: Claude matches it to a coin first)."""
    out, _ = call(model, "Read this coin. Answer as JSON: {\"country\": 2-letter ISO code, \"year\": number (Western year), \"denomination\": \"face value with "
                  "its unit, as on the coin\", \"mint_marks\": [letters] or [], \"side\": \"obverse or reverse\", \"seen\": \"what you read and where\"}. "
                  "Use null for anything you cannot read.", [path])
    return out


def run_pack(model, pack, out):
    """The blind photo test (fix list #4) on one model: one call per photo, the pack's own PROMPT.md, answers saved as the pack asks.
    Score it with tools/bakeoff/score.py --key KEY.json OUT --record "Gemini API (<model>)" --agent gemini-api."""
    brief = open(os.path.join(pack, "PROMPT.md"), encoding="utf-8").read()
    files = sorted(f for f in os.listdir(pack) if f.startswith("BK-") and f.endswith(".webp"))
    res, log = {}, []
    if os.path.exists(out): res = json.load(open(out, encoding="utf-8"))
    for f in files:
        k = f[:-5]
        if k in res: continue
        try: a, _ = call(model, brief + f"\n\nThis call shows ONE photo: {f}. Answer for it alone, as {{\"{k}\": {{...}}}}.", [os.path.join(pack, f)],
                    system="You read real coins from photographs. Answer with one JSON object and nothing else.", log=log)
        except Quota as e: print(f"stopped at {k}: {e}"); break
        res[k] = (a or {}).get(k) if isinstance(a, dict) else None
        json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)     # saved after every photo: a stopped run resumes
    print(f"{model}: {sum(1 for v in res.values() if v)} of {len(files)} answered, {sum((x.get('in') or 0) + (x.get('out') or 0) for x in log)} tokens -> {out}")


def main():
    a = argparse.ArgumentParser(); a.add_argument("--model", help=f"one model for every sheet (default: {TEXT_MODEL} for text-only sheets, {DEFAULT} for photo sheets)"); a.add_argument("--assignment"); a.add_argument("--dry", action="store_true")
    a.add_argument("--photo"); a.add_argument("--pack"); a.add_argument("--out")
    o = a.parse_args()
    if o.photo or o.pack: o.model = o.model or DEFAULT          # a photo: the photo reader unless named
    if o.pack: run_pack(o.model, o.pack, o.out or f"bakeoff_{SOURCE}-{o.model}.json"); return 0
    if o.photo:
        print(json.dumps({"model": o.model, "by": f"model:{SOURCE}:{o.model}", "reading": blind_photo(o.model, o.photo)}, ensure_ascii=False, indent=1)); return 0
    state = json.load(open(STATE, encoding="utf-8"))
    mine = [x for x in state["assignments"] if x["agent"] == SOURCE and x["status"] == "open" and (not o.assignment or x["id"] == o.assignment)]
    if not mine: print("the Gemini API has no open homework (python3 tools/agents/homework.py hands it some when its pools have work)"); return 0
    log, lines = [], []
    for asg in mine:
        try: got = answer_sheet(model_for(asg["kind"], o.model), asg, log, lines)
        except Quota as e: print(f"stopped: {e} (the answers so far are kept; run again tomorrow for the rest)"); break
        print(f"{asg['id']} ({asg['kind']}): {got} lines answered of {len(asg['items'])} items")
    tok = sum((x.get("in") or 0) + (x.get("out") or 0) for x in log)
    print(f"{len(log)} calls ({', '.join(sorted({x['model'] for x in log})) or 'none'}), {tok} tokens; {sum(1 for x in log if x['finish'] != 'STOP')} cut short")
    if not lines or o.dry: return 0
    os.makedirs(INCOMING, exist_ok=True)
    p = os.path.join(INCOMING, f"changes_{SOURCE}_{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M')}.jsonl")
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        for e in lines: fh.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"wrote {os.path.relpath(p, ROOT)} ({len(lines)} lines); next: python3 tools/pipeline/publish.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
