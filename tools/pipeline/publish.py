#!/usr/bin/env python3
"""One command to publish the collection master to the app's view files. Never touches git: the caller commits and pushes.

usage (repo root):
    python3 tools/pipeline/publish.py [--collection collection/] [--out data/] [--version version.json] [--incoming collection/_incoming]
                                      [--no-incoming] [--dry-run] [--now 2026-10-02T18:30:00Z] [--parity [--golden data_v254/]]

Steps (stops with exit code 1 at the first failure, leaving data/ and version.json untouched):
  1. apply every pending collection/_incoming/changes_*.jsonl (apply_changes.py; processed files move to _incoming/applied/ or
     _incoming/rejected/ with a .report.txt; a rejected file never blocks the others and never changes anything)
  2. validate collection/ (tools/schema/validate.py, refreshes manifest.json)  -> must be CLEAN or nothing is published
  3. write version.json: generated_at = now, ledger_version = "v2:" + first 16 hex of the manifest content hash, counts refreshed
  4. rebuild data/ (index.json, detail/*.json, search.json) with build_app_data.py
  5. checks: board arithmetic, silver/gold oz against the board, every specimen has an index row + detail record + search entry,
     id counters; with --parity also runs test_parity.py against the golden data
  6. print a summary (what changed, headline totals, rejected files)
Needs python3 + jsonschema.
"""
import contextlib, datetime, glob, hashlib, io, json, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "schema"))
import apply_changes as A
import build_app_data as B
import display as D

def fail(msg):
    print(f"\nPUBLISH REFUSED: {msg}\n(data/ and version.json were not changed)", file=sys.stderr)
    return 1

def arg(argv, name, default):
    return argv[argv.index(name) + 1] if name in argv else default

def check_outputs(col, out, board_snapshot):
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
    if not set(srch) <= set(col["specs"]) or len(srch) < len(col["specs"]) * 0.95: p.append("search.json does not cover the specimens")
    for f in idx["flips"]:
        if f["est"] is not None and f["est"] < 0: p.append(f"{f['scan']}: negative estimate")
    return p

def write_version(vpath, col, now, manifest):
    old = B.load(vpath) if os.path.exists(vpath) else {}
    utc, pt, iso = D.stamps(now)
    specs = col["specs"]
    coins = sorted((s for s in specs.values() if s["id"].startswith("C")), key=lambda s: int(s["id"][1:]))
    v = dict(old)
    v.update({"generated_at": utc, "generated_at_pt": pt, "generated_at_iso": iso, "content_hash": manifest["content_hash"][:16], "ledger_version": "v2:" + manifest["content_hash"][:16], "flips": len(specs)})
    if coins: v["newest_flip"] = coins[-1]["id"]; v["newest_ser"] = coins[-1].get("ser")
    ph = col["photos"]
    v["photos"] = {"images": len(ph), "coins_with_photos": len({x["specimen"] for x in ph}), "phase2_done": old.get("photos", {}).get("phase2_done", 0), "photographed": old.get("photos", {}).get("photographed", 0)}
    with open(vpath, "w", encoding="utf-8", newline="\n") as f: json.dump(v, f, indent=2, ensure_ascii=False); f.write("\n")
    return v

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
            if status == "applied": applied_events += len(ev)
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
    tmpd = tempfile.mkdtemp(prefix="publish-"); vuse = os.path.join(tmpd, "version.json"); outuse = os.path.join(tmpd, "data")
    if os.path.exists(vpath): shutil.copyfile(vpath, vuse)
    ver = write_version(vuse, col, now, col["manifest"])
    r = subprocess.run([sys.executable, os.path.join(HERE, "build_app_data.py"), coll, outuse, "--version-json", vuse], capture_output=True, text=True)
    if r.returncode != 0: print(r.stdout, r.stderr); return fail("build_app_data.py failed")
    print(r.stdout.strip().replace(outuse, out))
    # 5. checks
    problems = check_outputs(col, outuse, col["board"])
    if "--parity" in argv:
        rp = subprocess.run([sys.executable, os.path.join(HERE, "test_parity.py"), coll, arg(argv, "--golden", os.path.join(ROOT, "data"))], capture_output=True, text=True)
        print(rp.stdout.strip().splitlines()[-1])
        if rp.returncode != 0: problems.append("parity with the golden data failed (run tools/pipeline/test_parity.py)")
    if problems:
        print("\n".join("CHECK FAILED: " + x for x in problems))
        return fail("post-build checks failed")
    # 6. install (only now) and summary
    if not dry:
        os.makedirs(os.path.join(out, "detail"), exist_ok=True)
        for f in glob.glob(os.path.join(out, "detail", "*.json")): os.remove(f)
        for f in glob.glob(os.path.join(outuse, "detail", "*.json")): shutil.copyfile(f, os.path.join(out, "detail", os.path.basename(f)))
        for n in ("index.json", "search.json"): shutil.copyfile(os.path.join(outuse, n), os.path.join(out, n))
        shutil.copyfile(vuse, vpath)
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
