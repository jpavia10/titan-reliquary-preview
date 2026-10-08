#!/usr/bin/env python3
"""Build a blind photo pack for the photo-model bake-off (fix list #4) and the locked coin test (#19).

    python3 tools/bakeoff/make_pack.py --set main   [--n 30] [--key-out DIR]
    python3 tools/bakeoff/make_pack.py --set locked [--n 15] [--key-out DIR]

What it makes
  docs/bakeoff/pack-{YYYYMMDD}-{set}/BK-xxxx.webp   the coin photos under random names (public: the names say nothing)
  docs/bakeoff/pack-{YYYYMMDD}-{set}/PROMPT.md       the one prompt every model gets, and the answer format
  {key-out}/bakeoff_key_{YYYYMMDD}-{set}.json        THE ANSWER KEY: blind name -> coin id + answers. Never committed: it goes to Drive
                                                     `_locked (answer keys: Claude only)` and nowhere else
  tools/bakeoff/commitments.jsonl                    one line per pack: the key's sha256 (so nobody can change the key after the runs)

Why it is blind: this repo is public and every coin's record is in it. A model can only be tested on photos it cannot look up, so
  - the coins are picked at random (secrets module) from the coins whose answers we trust, and the list is only in the key;
  - each photo is re-encoded, resized and turned a little, so its bytes never match the public photos/p1/ file;
  - the phone cut-outs show only the coin (the pen label is cut away).
Residual risk, stated plainly: a model with code tools could compare the blind photos with the 222 public ones by eye. The prompt
forbids looking anything up in the repo; Phase 2 pro photos (never public) will remove the risk for the locked set.

Which coins
  main    30 coins whose answers we trust (high-confidence record, a KM number, a live phone photo, a numeric year, no open question,
          no truth finding, no owner question), stratified: up to 12 from outside Europe, at least 5 silver, the rest European
  locked  15 hard coins with known answers, kept apart from day-to-day work: coins whose type/year/denomination was corrected after
          logging (past disagreements), coins from a country with only one coin here, coins of a type with a look-alike variety
          (another type with the same country + denomination), never any main-set coin. Their ids stay in the key only.
"""
import datetime, hashlib, io, json, os, re, secrets, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
PROMPT_VERSION = "BAKEOFF@2026-10-08"
RNG = secrets.SystemRandom()

PROMPT = """# Titan Reliquary photo test ({set} pack, {made})

You are taking part in a blind test of how well AI models read coins from a photo. Same photos, same prompt, for every model.

**Rules**
- Look only at the photos in this folder. Do not search this repository, its data files, or its other photos: the answers are in there
  and a looked-up answer scores as invalid. Web references (Numista, NGC, PCGS) are allowed for the catalogue number only.
- If you are not sure of a field, answer null. A wrong confident answer is worse than null.
- Each photo is one coin, cut out of a phone photo; it may be turned a little. Only one side is shown.

**Photos**: {n} files, `BK-xxxx.webp` (list below).

**Answer**: one JSON object, nothing else, keyed by the file name without `.webp`:
```json
{{"BK-0a1b": {{"country": "Switzerland", "year": "1969", "denom": "1 franc", "mint": "B", "km": "24a.1", "confidence": "high"}}}}
```
- `country`: the issuing country in English. `year`: the date on the coin converted to the Western year (null if it is not on the
  shown side). `denom`: value and unit as on the coin. `mint`: the mint mark letters, "" if the shown side has none, null if you cannot
  tell. `km`: the Krause number without "KM#". `confidence`: high / med / low for the whole answer.
- Send the JSON to Joseph in chat, or save it as `bakeoff_{{yourmodel}}_{{YYYYMMDD-HHMM}}.json` in Drive
  `Titan Reliquary/bakeoff (blind photo test)/`. Add one line: your exact model name and version, and the cost if you can see it.

**Files**
{files}
"""


def load():
    import build_app_data as B, truth_checks as TC, owner_answers as OA
    col = B.load_collection(os.path.join(ROOT, "collection"))
    _, det = B.build_specimens(col)
    details = {k: v for recs in det.values() for k, v in recs.items()}
    qs = OA.load_questions(col["dir"]); done = OA.answered_ids(col["dir"])
    owner_q = {q.get("coin") for q in qs.values() if q["id"] not in done}
    truth = {f["id"] for f in TC.findings(col)} | {i for f in TC.findings(col) for i in f["id"].split(",")}
    return col, details, owner_q, truth


def answers(col, s, det):
    t = col["types"][s["type"]]
    km = next((c["number"] for c in t.get("catalogs") or [] if c.get("system") == "KM"), None)
    return {"country": det.get("country"), "year": str(s["issue"]["year"]) if s["issue"].get("year") is not None else None,
            "denom": str(det.get("denom") or "").split(" · ")[0] or None, "mint": "".join(s["issue"].get("mint_marks") or []),
            "km": km, "is_silver": bool(det.get("is_silver"))}


def photos_of(col, sid):
    live = [p for p in col["photos"] if p["specimen"] == sid and not p.get("superseded_by") and p.get("kind") == "crop_circle"
            and (p.get("review") or {}).get("status") not in ("rejected", "reshoot")]
    out = []
    for p in live:
        f = os.path.join(ROOT, "photos", "p1", f"{sid}_{p.get('side')}.webp")
        if os.path.exists(f): out.append((p.get("side"), f))
    return out


def trusted(col, details, owner_q, truth):
    ok = []
    for sid, s in sorted(col["specs"].items()):
        if s["lifecycle"]["status"] == "Removed" or not sid.startswith("C"): continue
        det = details.get(sid) or {}
        if (s.get("value") or {}).get("confidence") != "high": continue
        if (s.get("research") or {}).get("open_questions") or sid in owner_q or sid in truth: continue
        a = answers(col, s, det)
        if not (a["year"] and a["year"].isdigit() and a["km"] and a["country"] and a["denom"]): continue
        if not photos_of(col, sid): continue
        ok.append(sid)
    return ok


def corrected_ids(col):
    """Specimens whose type, year or denomination was changed after they were logged (a past disagreement that was settled)."""
    out = set()
    for e in col.get("events") or []:
        if e.get("entity") == "specimen" and e.get("field") in ("type", "issue.year", "year_raw") and e.get("op", "set") != "create":
            out.add(e.get("id"))
    return out


def pick_main(col, details, pool, n):
    rows = [(sid, answers(col, col["specs"][sid], details[sid]), details[sid].get("continent")) for sid in pool]
    RNG.shuffle(rows)
    pick = []
    for sid, a, cont in rows:
        if cont != "Europe" and sum(1 for r in pick if r[2] != "Europe") < 12: pick.append((sid, a, cont))
    for sid, a, cont in rows:
        if len(pick) >= n: break
        if a["is_silver"] and sid not in {r[0] for r in pick} and sum(1 for r in pick if r[1]["is_silver"]) < 5: pick.append((sid, a, cont))
    for sid, a, cont in rows:
        if len(pick) >= n: break
        if sid not in {r[0] for r in pick}: pick.append((sid, a, cont))
    return [r[0] for r in pick[:n]]


def pick_locked(col, details, pool, n, exclude):
    import collections
    per_country = collections.Counter(col["types"][s["type"]].get("country") for s in col["specs"].values())
    sib = collections.Counter((t.get("country"), json.dumps(t.get("denomination"), sort_keys=True)) for t in col["types"].values())
    fixed = corrected_ids(col)
    cand = []
    for sid in pool:
        if sid in exclude: continue
        t = col["types"][col["specs"][sid]["type"]]
        why = []
        if sid in fixed: why.append("corrected after logging")
        if per_country[t.get("country")] == 1: why.append("only coin of its country")
        if sib[(t.get("country"), json.dumps(t.get("denomination"), sort_keys=True))] > 1: why.append("look-alike variety type")
        if why: cand.append((len(why), RNG.random(), sid, why))
    cand.sort(reverse=True)
    return [(c[2], c[3]) for c in cand[:n]]


def blind_image(src, dst):
    from PIL import Image
    im = Image.open(src).convert("RGBA")
    ang = RNG.uniform(-20, 20)
    im = im.rotate(ang, resample=Image.BICUBIC, expand=False)
    size = RNG.choice((432, 448, 464))
    im = im.resize((size, size), Image.LANCZOS)
    bg = Image.new("RGBA", im.size, (18, 18, 18, 255)); bg.alpha_composite(im)
    buf = io.BytesIO(); bg.convert("RGB").save(buf, "WEBP", quality=RNG.choice((78, 80, 82)), method=4)
    data = buf.getvalue()
    with open(dst, "wb") as fh: fh.write(data)
    return hashlib.sha256(data).hexdigest()


def main(argv):
    which = argv[argv.index("--set") + 1] if "--set" in argv else "main"
    n = int(argv[argv.index("--n") + 1]) if "--n" in argv else (30 if which == "main" else 15)
    key_out = argv[argv.index("--key-out") + 1] if "--key-out" in argv else None
    if not key_out: sys.exit("--key-out DIR is required: the key must never land in the repo (use your scratch folder, then upload it to Drive _locked)")
    if os.path.abspath(key_out).startswith(ROOT + os.sep): sys.exit("--key-out is inside the repository: refusing (the key would become public)")
    col, details, owner_q, truth = load()
    pool = trusted(col, details, owner_q, truth)
    made = datetime.datetime.now(datetime.timezone.utc)
    stamp = made.strftime("%Y%m%d")
    if which == "locked":
        prev = set()
        kd = os.path.join(key_out)
        for f in os.listdir(kd) if os.path.isdir(kd) else []:
            if f.startswith("bakeoff_key_") and f.endswith("-main.json"): prev |= {v["id"] for v in json.load(open(os.path.join(kd, f)))["items"].values()}
        chosen = pick_locked(col, details, pool, n, prev)
    else:
        chosen = [(sid, ["trusted answer"]) for sid in pick_main(col, details, pool, n)]
    outdir = os.path.join(ROOT, "docs", "bakeoff", f"pack-{stamp}-{which}")
    os.makedirs(outdir, exist_ok=True)
    items, used = {}, set()
    for sid, why in chosen:
        side, src = RNG.choice(photos_of(col, sid))
        while True:
            name = "BK-" + secrets.token_hex(2)
            if name not in used: used.add(name); break
        sha = blind_image(src, os.path.join(outdir, name + ".webp"))
        items[name] = dict(answers(col, col["specs"][sid], details[sid]), id=sid, side=side, source_photo=os.path.relpath(src, ROOT), sha256=sha, why=why)
    files = "\n".join(f"- {k}.webp" for k in sorted(items))
    with open(os.path.join(outdir, "PROMPT.md"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("<!-- doc-status: current; normative: yes (for this test) -->\n" + PROMPT.format(set=which, made=made.strftime("%Y-%m-%d"), n=len(items), files=files))
    key = {"schema": "bakeoff-key/1", "set": which, "made": made.strftime("%Y-%m-%dT%H:%M:%SZ"), "prompt_version": PROMPT_VERSION,
           "pack": os.path.relpath(outdir, ROOT), "note": "ANSWER KEY. Claude only. Never paste it into a prompt, feedback or the repo.", "items": items}
    os.makedirs(key_out, exist_ok=True)
    kp = os.path.join(key_out, f"bakeoff_key_{stamp}-{which}.json")
    head = {k: v for k, v in key.items() if k != "items"}   # one item per line: small enough to upload through the Drive connector
    blob = (json.dumps(head, ensure_ascii=False)[:-1] + ', "items": {\n' + ",\n".join(json.dumps(k) + ": " + json.dumps(v, ensure_ascii=False, separators=(",", ":"))
            for k, v in items.items()) + "\n}}\n").encode("utf-8")
    with open(kp, "wb") as fh: fh.write(blob)
    pack_sha = hashlib.sha256("".join(sorted(v["sha256"] for v in items.values())).encode()).hexdigest()
    with open(os.path.join(HERE, "commitments.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps({"made": key["made"], "set": which, "n": len(items), "pack": key["pack"], "prompt_version": PROMPT_VERSION,
                             "key_sha256": hashlib.sha256(blob).hexdigest(), "photos_sha256": pack_sha, "key_home": "Drive _locked (answer keys: Claude only)"}) + "\n")
    print(f"{which}: {len(items)} photos -> {key['pack']}/ ; key -> {kp} (upload to Drive _locked, never commit); commitment added")


if __name__ == "__main__":
    main(sys.argv[1:])
