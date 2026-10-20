#!/usr/bin/env python3
"""Release stamps (trNNN) in one place. Grok (Titan Reliquary), 2026-10-20.

A release changes the build stamp by hand in several files; a missed one leaves phones on a stale offline copy. This tool
does it in one step and checks it in CI.

  python3 tools/release/bump.py --check                 CI: every stamp agrees and the service worker precaches every
                                                        ?v= file the page loads (exit 1 on any problem, nothing written)
  python3 tools/release/bump.py --next [--dry-run]      trNNN -> trNNN+1 in sw.js (header + BUILD), index.html (every ?v=
  python3 tools/release/bump.py tr130 [--dry-run]       and window.TITAN_BUILD) and version.json "build"
  python3 tools/release/bump.py --stamp "title (sha)"   the deploy commit: DEPLOY_STAMP.txt = "trNNN YYYY-MM-DD title (sha)"
                                                        (UTC date, like the existing stamps)

Not touched: data/ (generated), styles/atmo/all.css (legacy tr69 links, not loaded), docs and logs.
DEPLOY_STAMP.txt may lag BUILD by one release (the release commit comes before its deploy commit), so --check accepts
DEPLOY_STAMP at BUILD or BUILD-1.
"""
import datetime, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda *a: os.path.join(ROOT, *a)
RE_BUILD = re.compile(r'^const BUILD = "(tr\d+)";', re.M)
RE_HEAD = re.compile(r"^(/\* Titan Reliquary service worker · build )(tr\d+)", re.M)
RE_V = re.compile(r"\?v=(tr\d+)")
RE_TB = re.compile(r'(window\.TITAN_BUILD = ")(tr\d+)(")')
RE_ASSET = re.compile(r'(?:src|href)="([^"?#:]+)\?v=tr\d+"')


def read(*a): return open(P(*a), encoding="utf-8").read()
def write(path, s): open(P(path), "w", encoding="utf-8", newline="\n").write(s)
def num(b): return int(b[2:])


def state():
    sw, html = read("sw.js"), read("index.html")
    m = RE_BUILD.search(sw)
    if not m: sys.exit("sw.js: no `const BUILD = \"trNNN\";` line")
    return sw, html, m.group(1)


def sw_precache(sw):
    """Every path the service worker precaches with the build stamp: "path?v=" + BUILD."""
    return set(re.findall(r'"([^"]+)\?v=" \+ BUILD', sw))


def check():
    sw, html, build = state(); probs = []
    h = RE_HEAD.search(sw)
    if not h or h.group(2) != build: probs.append(f"sw.js header says {h.group(2) if h else '?'} but BUILD is {build}")
    bad = sorted({v for v in RE_V.findall(html) if v != build})
    if bad: probs.append(f"index.html has ?v= stamps {', '.join(bad)} (BUILD is {build})")
    tb = RE_TB.search(html)
    if not tb or tb.group(2) != build: probs.append(f"index.html window.TITAN_BUILD is {tb.group(2) if tb else 'missing'} (BUILD is {build})")
    try:
        vb = json.loads(read("version.json")).get("build")
        if vb != build: probs.append(f'version.json "build" is {vb} (BUILD is {build})')
    except FileNotFoundError: pass
    try:
        ds = read("DEPLOY_STAMP.txt").split()[0]
        if not re.fullmatch(r"tr\d+", ds) or num(ds) not in (num(build), num(build) - 1):
            probs.append(f"DEPLOY_STAMP.txt is {ds}; expected {build} or the release before it")
    except (FileNotFoundError, IndexError): probs.append("DEPLOY_STAMP.txt missing or empty")
    # the page's ?v= files must all be precached (else that file is missing offline), and every precached file must exist
    live = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    pre = sw_precache(sw)
    for a in sorted(set(RE_ASSET.findall(live))):
        if a not in pre: probs.append(f"index.html loads {a}?v= but sw.js does not precache it")
    for a in sorted(pre):
        if not os.path.exists(P(a)): probs.append(f"sw.js precaches {a} but the file does not exist")
    for p in probs: print("  FAIL", p)
    print(f"release stamps: {build}, {len(set(RE_ASSET.findall(live)))} page files, {len(pre)} precached: " + ("ALL GOOD" if not probs else f"{len(probs)} problem(s)"))
    return 1 if probs else 0


def bump(new, dry):
    sw, html, build = state()
    if not re.fullmatch(r"tr\d+", new) or num(new) <= num(build): sys.exit(f"new build {new} must be trNNN and newer than {build}")
    sw2 = RE_HEAD.sub(lambda m: m.group(1) + new, RE_BUILD.sub(f'const BUILD = "{new}";', sw))
    html2 = RE_TB.sub(lambda m: m.group(1) + new + m.group(3), RE_V.sub("?v=" + new, html))
    vj = read("version.json"); vj2 = re.sub(r'("build":\s*")tr\d+(")', lambda m: m.group(1) + new + m.group(2), vj)
    n = len(RE_V.findall(html))
    print(f"{build} -> {new}: sw.js header + BUILD, index.html {n} ?v= + TITAN_BUILD, version.json build" + ("  (dry run, nothing written)" if dry else ""))
    if not dry:
        write("sw.js", sw2); write("index.html", html2)
        if vj2 != vj: write("version.json", vj2)
    return 0


def stamp(title, dry):
    _, _, build = state()
    line = f"{build} {datetime.datetime.now(datetime.timezone.utc):%Y-%m-%d} {title}\n"
    print("DEPLOY_STAMP.txt = " + line.strip() + ("  (dry run)" if dry else ""))
    if not dry: write("DEPLOY_STAMP.txt", line)
    return 0


def main(argv):
    dry = "--dry-run" in argv; argv = [a for a in argv if a != "--dry-run"]
    if not argv or argv[0] in ("-h", "--help"): print(__doc__); return 0
    if argv[0] == "--check": return check()
    if argv[0] == "--next": return bump("tr" + str(num(state()[2]) + 1), dry)
    if argv[0] == "--stamp" and len(argv) > 1: return stamp(" ".join(argv[1:]), dry)
    if re.fullmatch(r"tr\d+", argv[0]): return bump(argv[0], dry)
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
