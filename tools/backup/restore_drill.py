#!/usr/bin/env python3
"""Restore drill (fix list #58): prove the backup works by rebuilding the whole site from it, in an empty folder.

    python3 tools/backup/restore_drill.py [--zip titan-reliquary-site.zip] [--work DIR] [--no-smoke]

Without --zip it downloads the rolling backup (GitHub release `site-backup`, asset titan-reliquary-site.zip, made by
.github/workflows/backup-zip.yml; the same file the Drive sync copies). Then, inside the extracted copy only:
  1. the files are there: app shell, collection/ master, data/, phone photos, the change history (collection/_incoming/applied/)
  2. the master validates (tools/schema/validate.py)
  3. the pipeline rebuilds data/ from collection/ into a scratch folder and it matches the backed-up data/ (same flips, same counts,
     same headline, same detail files; only timestamps may differ)
  4. the restored site is served on a free port and the smoke test runs against it (phone + desktop, offline included)
Writes a short report (stdout + --report FILE). Never touches the working repository.
"""
import glob, hashlib, http.server, json, os, shutil, socket, subprocess, sys, tempfile, threading, zipfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
ASSET = "repos/jpavia10/titan-reliquary-preview/releases"


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def download(dest):
    rel = json.loads(subprocess.run(["gh", "api", f"{ASSET}/tags/site-backup"], capture_output=True, text=True, check=True).stdout)   # metadata only
    a = next(x for x in rel["assets"] if x["name"] == "titan-reliquary-site.zip")
    url = a["browser_download_url"]   # public file (github.com -> release-assets host): plain HTTPS, no token needed
    subprocess.run(["curl", "-sSfL", "-o", dest, url], check=True)
    return {"asset_updated": a["updated_at"], "size": a["size"], "notes": rel.get("body", "")}


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def main():
    report, ok = [], True
    def say(line, good=True):
        nonlocal ok
        ok = ok and good; report.append(("PASS " if good else "FAIL ") + line); print(report[-1], flush=True)
    work = arg("--work") or tempfile.mkdtemp(prefix="restore-drill-")
    os.makedirs(work, exist_ok=True)
    if os.listdir(work): sys.exit(f"--work {work} is not empty: the drill must start from an empty folder")
    z = arg("--zip")
    if not z:
        z = os.path.join(work, "titan-reliquary-site.zip"); meta = download(z)
        say(f"downloaded the backup ({meta['size']:,} bytes, updated {meta['asset_updated']}; {meta['notes'].split('Last: ')[-1]})")
    sha = hashlib.sha256(open(z, "rb").read()).hexdigest()
    with zipfile.ZipFile(z) as zf:
        bad = zf.testzip(); say("zip is intact" if bad is None else f"zip is damaged at {bad}", bad is None)
        zf.extractall(os.path.join(work, "x"))
    site = os.path.join(work, "x", "titan-reliquary-preview")
    # 1. files
    need = ["index.html", "app.js", "sw.js", "version.json", "collection/manifest.json", "collection/changes.jsonl", "data/index.json", "data/status.json", "tools/pipeline/publish.py"]
    miss = [n for n in need if not os.path.exists(os.path.join(site, n))]
    say("app shell, master, data and pipeline are in the backup" if not miss else "missing from the backup: " + ", ".join(miss), not miss)
    st = json.load(open(os.path.join(site, "data", "status.json"), encoding="utf-8"))
    photos = len(glob.glob(os.path.join(site, "photos", "p1", "*.webp")))
    applied = len(glob.glob(os.path.join(site, "collection", "_incoming", "applied", "*.jsonl")))
    say(f"build {st['build']}: {st['specimens']['total']} pieces, {photos} phone photos, {applied} applied change files in the history", photos >= st["photos"]["live"] - 5 and applied > 0)
    # 2. validate
    r = subprocess.run([sys.executable, "-I", os.path.join(site, "tools", "schema", "validate.py"), os.path.join(site, "collection")], capture_output=True, text=True, cwd=site)
    last = (r.stdout.strip().splitlines() or ["?"])[-1]
    say("the master validates: " + last, r.returncode == 0)
    # 3. rebuild into scratch and compare
    out = os.path.join(work, "rebuilt"); vj = os.path.join(work, "version.json"); shutil.copyfile(os.path.join(site, "version.json"), vj)
    r = subprocess.run([sys.executable, os.path.join(site, "tools", "pipeline", "publish.py"), "--no-incoming", "--collection", os.path.join(site, "collection"),
                        "--out", out, "--version", vj], capture_output=True, text=True, cwd=site)
    say("the pipeline rebuilt data/ from the backed-up master" if r.returncode == 0 else "rebuild failed: " + (r.stdout + r.stderr)[-400:], r.returncode == 0)
    if r.returncode == 0:
        a = json.load(open(os.path.join(site, "data", "index.json"), encoding="utf-8")); b = json.load(open(os.path.join(out, "index.json"), encoding="utf-8"))
        same_flips = [f["scan"] for f in a["flips"]] == [f["scan"] for f in b["flips"]]
        same_board = a.get("board", {}).get("grand") == b.get("board", {}).get("grand")
        det_a = sorted(os.listdir(os.path.join(site, "data", "detail"))); det_b = sorted(os.listdir(os.path.join(out, "detail")))
        diff = [n for n in det_a if n in det_b and json.load(open(os.path.join(site, "data", "detail", n), encoding="utf-8")) != json.load(open(os.path.join(out, "detail", n), encoding="utf-8"))]
        say(f"rebuilt data matches the backup: {len(b['flips'])} flips, headline ${b['board']['grand']:,.2f}, {len(det_b)} detail files" + (f"; {len(diff)} detail files differ ({', '.join(diff[:5])})" if diff else ""),
            same_flips and same_board and det_a == det_b and not diff)
    # 4. serve + smoke
    if "--no-smoke" not in sys.argv:
        port = free_port()
        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a): pass
        handler = lambda *a, **k: Quiet(*a, directory=site, **k)
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
        # the compact backup leaves out the opening films and ambience recordings (backup-zip.yml): the app must still work without them
        r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "smoke", "smoke.py"), "--url", f"http://127.0.0.1:{port}/", "--allow-missing", "art/splash/,audio/"],
                           capture_output=True, text=True, timeout=900)
        miss = sorted({m for l in r.stdout.splitlines() if "missing as expected" in l for m in __import__("re").findall(r"(art/splash/\S+|audio/\S+) -> 404", l)})
        if miss: report.append("INFO not in the compact backup by design (they stay in git): " + ", ".join(miss)); print(report[-1])
        srv.shutdown()
        tail = [l for l in r.stdout.splitlines() if "passed" in l.lower() or "checks" in l.lower() or "FAIL" in l][-4:]
        say("smoke test on the restored copy: " + " | ".join(tail or [r.stdout[-300:]]), r.returncode == 0)
    say(f"zip sha256 {sha[:16]}..., work folder {work}")
    print("\nRESTORE DRILL: " + ("PASSED" if ok else "FAILED"))
    if arg("--report"):
        with open(arg("--report"), "w", encoding="utf-8", newline="\n") as fh: fh.write("\n".join(report) + "\nRESTORE DRILL: " + ("PASSED" if ok else "FAILED") + "\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
