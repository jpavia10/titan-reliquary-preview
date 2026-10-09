#!/usr/bin/env python3
"""One command to publish the collection master to the app's view files. Never touches git: the caller commits and pushes.

usage (repo root):
    python3 tools/pipeline/publish.py [--collection collection/] [--out data/] [--version version.json] [--incoming collection/_incoming]
                                      [--no-incoming] [--dry-run] [--now 2026-10-02T18:30:00Z] [--parity [--golden data_v254/]]

Steps (stops with exit code 1 at the first failure, leaving data/ and version.json untouched):
  1. apply every pending collection/_incoming/changes_*.jsonl (apply_changes.py; processed files move to _incoming/applied/ or
     _incoming/rejected/ with a .report.txt; a rejected file never blocks the others and never changes anything)
  2. validate collection/ (tools/schema/validate.py, refreshes manifest.json)  -> must be CLEAN or nothing is published
  3. write version.json: generated_at = now, ledger_version = "v3:" + first 16 hex of the manifest content hash, counts refreshed
  4. rebuild data/ (index.json, detail/*.json, search.json) with build_app_data.py
  5. checks: board arithmetic, silver/gold oz against the board, every specimen has an index row + detail record + search entry,
     id counters; with --parity also runs test_parity.py against the golden data
  6. print a summary (what changed, headline totals, rejected files)
  7. (real publish only) turn the research loop: tools/agents/homework.py closes answered homework, settles disagreements, hands out
     new assignments and rewrites docs/agents/QUEUE_*.md; its summary goes into data/status.json `loop`
Needs python3 + jsonschema.
"""
import atexit, contextlib, datetime, glob, hashlib, io, json, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "schema"))
import apply_changes as A
import build_app_data as B
import display as D
import build_wants as W
import build_reshoot as R
import dupes as DUP
import owner_answers as OA
import integrity as I

STEP1_CHANGED = False      # set once pending change files were merged into collection/ (step 1)
def fail(msg):
    print(f"\nPUBLISH REFUSED: {msg}\n(data/ and version.json were not changed)", file=sys.stderr)
    if STEP1_CHANGED:   # Grok's review GRK-3-12: collection/ already took the merged files, so say loudly that the site data is now behind it
        print("WARNING: collection/ WAS changed (pending change files were merged and moved to _incoming/applied/), but data/ was NOT rebuilt.\n"
              "Fix the problem above, then run: python3 tools/pipeline/publish.py --no-incoming", file=sys.stderr)
    return 1

def arg(argv, name, default):
    return argv[argv.index(name) + 1] if name in argv else default

def check_outputs(col, out, board_snapshot, root=None):
    """-> list of problems (empty = all good)."""
    p = []
    idx = B.load(f"{out}/index.json")
    b = idx["board"]
    parts = sum(b[k]["usd"] for k in ("flips", "bullion", "housing", "stamps", "sets", "albums"))
    tokens = round(sum(s["value"].get("est_usd") or 0 for s in col["specs"].values() if D.is_token(col["types"][s["type"]])) - board_snapshot["basis"]["token_usd"], 2)
    if abs(parts + tokens - b["grand"]) > 0.011: p.append(f"board grand {b['grand']} != sum of its lines {round(parts, 2)} + token change {tokens}")
    if abs(b["silver"]["oz"] * b["silver"]["spot"] - b["silver"]["melt"]) > 0.6: p.append("silver melt != oz x spot")
    if abs(b["gold"]["oz"] * b["gold"]["spot"] - b["gold"]["melt"]) > 0.6: p.append("gold melt != oz x spot")
    flips = {f["scan"] for f in idx["flips"]}
    if flips != set(col["specs"]): p.append(f"index.flips != specimens (missing {sorted(set(col['specs']) - flips)[:5]}, extra {sorted(flips - set(col['specs']))[:5]})")
    if idx["counts"]["flips"] != len(col["specs"]): p.append("counts.flips != number of specimens")
    detail = {}
    for f in glob.glob(f"{out}/detail/*.json"): detail.update(B.load(f))
    if set(detail) != set(col["specs"]): p.append("detail records != specimens")
    srch = B.load(f"{out}/search.json")
    if set(srch) != set(col["specs"]): p.append("search.json does not cover exactly the specimens (every specimen must be searchable)")
    for f in idx["flips"]:
        if f["est"] is not None and f["est"] < 0: p.append(f"{f['scan']}: negative estimate")
    p += I.problems(col, out, root)          # referential integrity + orphans across the whole graph (zero tolerance)
    return p

def write_version(vpath, col, now, manifest):
    old = B.load(vpath) if os.path.exists(vpath) else {}
    utc, pt, iso = D.stamps(now)
    specs = col["specs"]
    coins = sorted((s for s in specs.values() if s["id"].startswith("C")), key=lambda s: int(s["id"][1:]))
    v = dict(old)
    v.update({"generated_at": utc, "generated_at_pt": pt, "generated_at_iso": iso, "content_hash": manifest["content_hash"][:16], "ledger_version": "v3:" + manifest["content_hash"][:16], "flips": len(specs)})
    if coins: v["newest_flip"] = coins[-1]["id"]; v["newest_ser"] = coins[-1].get("ser")
    ph = col["photos"]
    live = [x for x in ph if I._live(x)]
    p2 = {x["specimen"] for x in live if x.get("phase") == 2}
    v["photos"] = {"images": len(ph), "coins_with_photos": len({x["specimen"] for x in live}), "phase2_done": len(p2), "photographed": len({x["specimen"] for x in live})}
    with open(vpath, "w", encoding="utf-8", newline="\n") as f: json.dump(v, f, indent=2, ensure_ascii=False); f.write("\n")
    return v

DOCS = ("CLAUDE.md", "AI_START_HERE.md")
def sync_docs(st):
    """Rewrite the generated block between <!-- status:begin --> and <!-- status:end --> in each doc from data/status.json."""
    sp, ph, al = st["specimens"], st["photos"], st["albums"]
    lots = ", ".join(f"{n} {k}" for k, n in st["lots"].items())
    txt = (f"<!-- status:begin (generated by tools/pipeline/publish.py from data/status.json; do not edit by hand) -->\n"
           f"- Collection as of {st['generated_at']} (build {st['build']}, schema {st['schema_version']}, hash {str(st['collection_hash'])[:16]}):\n"
           f"  {sp['total']} specimens in flips ({sp['coins']} coins + {sp['tokens']} tokens), {st['countries']} countries; lots: {lots}.\n"
           f"  Albums: {al['volumes']} volumes in {al['families']} families, {al['slots_filled']} of {al['slots']} slots filled (tracked occupants, not catalogued specimens).\n"
           f"  Photos: {ph['live']} live photo records; {ph['specimens_with_any']} specimens have a photo ({ph['phase1_specimens']} Phase 1, {ph['phase2_specimens']} Phase 2), "
           f"{ph['specimens_with_both_sides']} have both sides; {ph['still_needed']} still need a phone photo.\n"
           f"  Open research questions: {st['research']['open_questions']} on {st['research']['specimens_with_open_questions']} specimens. Integrity problems: {st['integrity']['problems']}.\n"
           + (f"  Phase 1 finish line: {st['phase1']['done']} of {st['phase1']['total']} pieces through ({st['phase1']['pct']} %). "
              f"Trust: {st['trust']['cited_or_confirmed']:,} of {st['trust']['facts']:,} facts cited or confirmed ({st['trust']['pct_cited']} %).\n" if st.get("phase1") and st.get("trust") else "") +
           f"<!-- status:end -->")
    for n in DOCS:
        p = os.path.join(ROOT, n)
        if not os.path.exists(p): continue
        s = open(p, encoding="utf-8").read()
        s2 = re.sub(r"<!-- status:begin.*?<!-- status:end -->", lambda m: txt, s, flags=re.S)
        if s2 != s: open(p, "w", encoding="utf-8", newline="\n").write(s2)

def research_loop(now):
    """Step 7 (docs/agents/RESEARCH_LOOP.md): close answered assignments, settle disagreements, hand out new homework, rewrite every AI's page.
    -> the small `loop` block for data/status.json, or None when the loop could not run (the publish itself still stands)."""
    try:
        sys.path.insert(0, os.path.join(ROOT, "tools", "agents"))
        import homework as HW
        r = HW.run(ROOT, now)
        print("research loop: " + ("; ".join(r["log"]) or "no change"))
        bad = HW.check(r["roles"], r["queues"], r["state"])
        if bad: print("research loop WARNING: " + "; ".join(bad))
        return HW.summary(r["state"], r["pool"], r["metrics"], r["roles"])
    except Exception as x:          # never let the homework pages block a publish of good data
        print(f"research loop FAILED ({type(x).__name__}: {x}); data/ is published, the AI pages are not refreshed: run python3 tools/agents/homework.py")
        return None

def main(argv):
    coll = arg(argv, "--collection", os.path.join(ROOT, "collection")); out = arg(argv, "--out", os.path.join(ROOT, "data"))
    vpath = arg(argv, "--version", os.path.join(ROOT, "version.json")); incoming = arg(argv, "--incoming", os.path.join(coll, "_incoming"))
    dry = "--dry-run" in argv
    now = arg(argv, "--now", datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    summary = []; rejected = []; applied_events = 0
    # 1. pending contributions
    if "--no-incoming" not in argv and os.path.isdir(incoming):
        for f in sorted(glob.glob(os.path.join(incoming, "changes_*.jsonl"))):
            status, rep, ev = A.apply_file(f, coll, dry_run=dry)
            print("\n".join(rep))
            if status == "rejected": rejected.append(os.path.basename(f))
            if status == "applied":
                applied_events += len(ev)
                if not dry: globals()["STEP1_CHANGED"] = True
            if not dry:
                dest = os.path.join(incoming, "rejected" if status == "rejected" else "applied"); os.makedirs(dest, exist_ok=True)
                if status == "rejected": open(os.path.join(dest, os.path.basename(f) + ".report.txt"), "w", encoding="utf-8").write("\n".join(rep) + "\n")
                shutil.move(f, os.path.join(dest, os.path.basename(f)))
    # 2. validate
    import validate as V
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): rc = V.main(coll, update_manifest=not dry)
    if rc != 0: print(buf.getvalue()); return fail("collection/ does not validate")
    print("validate: " + buf.getvalue().strip().splitlines()[-1])
    col = B.load_collection(coll)
    if col["board"] is None: return fail("collection/board.json is missing")
    # 3. version + 4. rebuild: always into a scratch folder first, so a failing check leaves data/ and version.json untouched
    tmpd = tempfile.mkdtemp(prefix="publish-"); atexit.register(shutil.rmtree, tmpd, True)   # never leave scratch builds in /tmp (they once filled it)
    vuse = os.path.join(tmpd, "version.json"); outuse = os.path.join(tmpd, "data")
    if os.path.exists(vpath): shutil.copyfile(vpath, vuse)
    ver = write_version(vuse, col, now, col["manifest"])
    r = subprocess.run([sys.executable, os.path.join(HERE, "build_app_data.py"), coll, outuse, "--version-json", vuse], capture_output=True, text=True)
    if r.returncode != 0: print(r.stdout, r.stderr); return fail("build_app_data.py failed")
    print(r.stdout.strip().replace(outuse, out))
    with open(f"{outuse}/wants.json", "w", encoding="utf-8", newline="\n") as f: json.dump(W.build(col["albums"], ver["generated_at"]), f, ensure_ascii=False, separators=(",", ":"))
    import phase1 as P1
    with open(f"{outuse}/reshoot.json", "w", encoding="utf-8", newline="\n") as f: json.dump(R.build(col, ver["generated_at"], details=P1.details_from(outuse)), f, ensure_ascii=False, separators=(",", ":"))
    qs = OA.load_questions(coll); done = OA.answered_ids(coll)
    with open(f"{outuse}/questions.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump({"generated_at": ver["generated_at"], "questions": [dict({k: q[k] for k in ("id", "coin", "ask", "why") if k in q}, options=[{k: o[k] for k in ("label", "free") if k in o} for o in q["options"]]) for q in qs.values() if q["id"] not in done]}, f, ensure_ascii=False, separators=(",", ":"))
    dg = DUP.find(coll)
    with open(f"{outuse}/dupes.json", "w", encoding="utf-8", newline="\n") as f: json.dump({"generated_at": ver["generated_at"], "groups": dg}, f, ensure_ascii=False, separators=(",", ":"))
    if any(g["kind"] != "multiple" for g in dg): print("dupes: " + "; ".join(f"{g['kind']} {', '.join(g['ids'])}" for g in dg if g["kind"] != "multiple") + " (possible double entries; data/dupes.json)")
    import truth_checks as TC
    with open(f"{outuse}/truth.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump({"generated_at": ver["generated_at"], "summary": TC.summary(TC.findings(col)), "findings": TC.findings(col)}, f, ensure_ascii=False, indent=0)
    with open(f"{outuse}/status.json", "w", encoding="utf-8", newline="\n") as f: json.dump(I.status(col, outuse, ver.get("build"), ver["generated_at"], os.path.dirname(os.path.abspath(coll))), f, ensure_ascii=False, indent=1)
    import inventory as INV          # fix list #64: the printable inventory (insurance copy with values, family copy without)
    INV.write(outuse)
    # 5. checks
    problems = check_outputs(col, outuse, col["board"], os.path.dirname(os.path.abspath(coll)))
    if "--parity" in argv:
        rp = subprocess.run([sys.executable, os.path.join(HERE, "test_parity.py"), coll, arg(argv, "--golden", os.path.join(ROOT, "data"))], capture_output=True, text=True)
        print(rp.stdout.strip().splitlines()[-1])
        if rp.returncode != 0: problems.append("parity with the golden data failed (run tools/pipeline/test_parity.py)")
    if problems:
        print("\n".join("CHECK FAILED: " + x for x in problems))
        return fail("post-build checks failed")
    # 6. install (only now) and summary
    if not dry:
        # Muse MUS-3-02 / Grok GRK-3-12: install atomically. The new detail folder is complete before it replaces the old one, and each
        # top-level file lands with os.replace, so a crash or a full disk never leaves the app with an empty or half-written data/.
        os.makedirs(out, exist_ok=True)
        stage = os.path.join(out, ".detail.new"); old_dir = os.path.join(out, ".detail.old")
        for d in (stage, old_dir): shutil.rmtree(d, ignore_errors=True)
        shutil.copytree(os.path.join(outuse, "detail"), stage)
        if os.path.isdir(os.path.join(out, "detail")): os.replace(os.path.join(out, "detail"), old_dir)
        os.replace(stage, os.path.join(out, "detail")); shutil.rmtree(old_dir, ignore_errors=True)
        for n in ("index.json", "search.json", "wants.json", "reshoot.json", "dupes.json", "questions.json", "prices.json", "truth.json", "status.json", "inventory.html", "inventory-family.html"):
            shutil.copyfile(os.path.join(outuse, n), os.path.join(out, n + ".new")); os.replace(os.path.join(out, n + ".new"), os.path.join(out, n))
        shutil.copyfile(vuse, vpath)
        if os.path.abspath(out) == os.path.join(ROOT, "data"):     # only the real publish turns the research loop and rewrites the docs
            loop_summary = research_loop(now)
            if loop_summary is not None:
                st = B.load(os.path.join(out, "status.json")); st["loop"] = loop_summary
                with open(os.path.join(out, "status.json"), "w", encoding="utf-8", newline="\n") as f: json.dump(st, f, ensure_ascii=False, indent=1)
            sync_docs(B.load(os.path.join(out, "status.json")))
    idx = B.load(f"{outuse}/index.json"); b = idx["board"]; snap = col["board"]["index"]["board"]
    print("\n==== publish summary" + (" (DRY RUN: nothing written)" if dry else "") + " ====")
    print(f"ledger_version  {ver['ledger_version']}   generated {ver['generated_at']}")
    print(f"specimens {len(col['specs'])}  lots {len(col['lots'])}  types {len(col['types'])}  countries {idx['counts']['countries']}")
    print(f"headline        ${b['grand']:,.2f}   Ag {b['silver']['oz']} oz   Au {b['gold']['oz']} oz   (ledger v254 snapshot: ${snap['grand']:,.2f}, Ag {snap['silver']['oz']}, Au {snap['gold']['oz']}; delta = records added since)")
    print(f"contributions   {applied_events} event(s) applied this run; {len(rejected)} file(s) rejected" + (": " + ", ".join(rejected) if rejected else ""))
    print("next            review `git status`, commit collection/ data/ version.json, push (publish never pushes)")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
