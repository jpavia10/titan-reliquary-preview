#!/usr/bin/env python3
"""A change log that can never be quietly rewritten (fix list #76).

collection/changes.chain holds one line per line of collection/changes.jsonl: `n line chain`, where `line` is the first 16 hex of
sha256(the exact bytes of line n) and `chain` = sha256(chain of line n-1 + ":" + line hash), 16 hex (the full 64 on every 100th line).
Changing, removing or reordering any earlier line changes every chain value after it, so:
  - collection_io.Collection.save() refuses to write a changes.jsonl whose existing lines differ from the chained ones (only appending works);
  - tools/schema/validate.py checks the chain matches the file;
  - `chain.py verify --against origin/main` (CI) checks the chain in git only ever grew: the old file must be a prefix of the new one;
  - the tip is published in data/status.json (`chain`), so a copy of the site from any day pins the history up to that day.
A correction is always a new line in changes.jsonl, never an edit of an old one.

    python3 tools/pipeline/chain.py verify [collection/] [--against GIT_REF]
    python3 tools/pipeline/chain.py update [collection/]          append lines for new events (refuses if history changed)
    python3 tools/pipeline/chain.py rechain [collection/] --reason "..."   emergency only: rebuild after a deliberate, owner-approved rewrite;
                                                                  the old tip and the reason are appended to collection/changes.rechain.jsonl
"""
import datetime, hashlib, json, os, subprocess, sys

GENESIS = hashlib.sha256(b"titan-reliquary collection/changes.jsonl hash chain v1").hexdigest()
FULL_EVERY = 100


class HistoryRewritten(Exception): pass


def _lines(path):
    if not os.path.exists(path): return []
    with open(path, "rb") as fh: data = fh.read()
    return [ln for ln in data.split(b"\n") if ln.strip()]


def compute(lines):
    """-> [(n, line16, chain_full)] for the given raw lines."""
    out, c = [], GENESIS
    for n, ln in enumerate(lines, 1):
        lh = hashlib.sha256(ln).hexdigest()
        c = hashlib.sha256(f"{c}:{lh}".encode()).hexdigest()
        out.append((n, lh[:16], c))
    return out


def fmt(rows):
    return "".join(f"{n} {lh} {c if n % FULL_EVERY == 0 else c[:16]}\n" for n, lh, c in rows)


def parse(text):
    rows = []
    for ln in text.splitlines():
        if not ln.strip() or ln.startswith("#"): continue
        n, lh, c = ln.split()
        rows.append((int(n), lh, c))
    return rows


def paths(coll):
    return os.path.join(coll, "changes.jsonl"), os.path.join(coll, "changes.chain")


def problems(coll):
    """-> list of problems: the stored chain must describe changes.jsonl exactly."""
    cp, kp = paths(coll)
    if not os.path.exists(kp): return []
    want = compute(_lines(cp))
    with open(kp, encoding="utf-8") as fh: have = parse(fh.read())
    out = []
    for (n, lh, c), (n2, lh2, c2) in zip(want, have):
        if n != n2 or lh != lh2 or not c.startswith(c2):
            out.append(f"changes.jsonl line {n} is not the line that was chained (history rewritten or chain stale): run python3 tools/pipeline/chain.py verify")
            break
    if len(have) > len(want): out.append(f"changes.chain has {len(have)} lines but changes.jsonl only {len(want)}: lines were removed from the change log")
    elif len(have) < len(want) and not out: out.append(f"changes.chain covers {len(have)} of {len(want)} lines: run python3 tools/pipeline/chain.py update")
    return out


def update(coll):
    """Append chain lines for new events. Refuses (HistoryRewritten) when an already-chained line changed."""
    cp, kp = paths(coll)
    want = compute(_lines(cp))
    have = []
    if os.path.exists(kp):
        with open(kp, encoding="utf-8") as fh: have = parse(fh.read())
    for (n, lh, c), (n2, lh2, c2) in zip(want, have):
        if lh != lh2 or not c.startswith(c2):
            raise HistoryRewritten(f"changes.jsonl line {n} differs from the line chained earlier: the change log is append-only "
                                   f"(a correction is a NEW line). Nothing was written.")
    if len(have) > len(want):
        raise HistoryRewritten(f"changes.jsonl has {len(want)} lines but {len(have)} were chained: lines were removed. Nothing was written.")
    if len(want) == len(have) and os.path.exists(kp): return 0
    with open(kp, "a" if have else "w", encoding="utf-8", newline="\n") as fh: fh.write(fmt(want[len(have):]))
    return len(want) - len(have)


def tip(coll):
    rows = compute(_lines(paths(coll)[0]))
    return {"lines": len(rows), "tip": rows[-1][2] if rows else GENESIS}


def verify_against(coll, ref, repo=None):
    """The chain in git at `ref` must be a prefix of the current one (the log only ever grows)."""
    repo = repo or os.path.dirname(os.path.abspath(coll))
    rel = os.path.relpath(paths(coll)[1], repo).replace(os.sep, "/")
    r = subprocess.run(["git", "-C", repo, "show", f"{ref}:{rel}"], capture_output=True, text=True)
    if r.returncode != 0: return [f"no {rel} at {ref} (first chained commit?)"], True
    old = parse(r.stdout)
    with open(paths(coll)[1], encoding="utf-8") as fh: new = parse(fh.read())
    if len(new) < len(old): return [f"the chain shrank from {len(old)} to {len(new)} lines since {ref}"], False
    for a, b in zip(old, new):
        if a != b: return [f"chain line {a[0]} changed since {ref}: the change log was rewritten"], False
    return [], False


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    cmd = args[0] if args else "verify"
    coll = args[1] if len(args) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "collection")
    if cmd == "update":
        try: n = update(coll)
        except HistoryRewritten as x: print(f"REFUSED: {x}"); return 1
        print(f"chained {n} new line(s); tip {tip(coll)['tip'][:16]} at line {tip(coll)['lines']}"); return 0
    if cmd == "rechain":
        if "--reason" not in argv: print("rechain needs --reason \"...\" (owner-approved)"); return 2
        reason = argv[argv.index("--reason") + 1]
        cp, kp = paths(coll)
        old = None
        if os.path.exists(kp):
            with open(kp, encoding="utf-8") as fh: rows = parse(fh.read())
            old = {"lines": len(rows), "tip16": rows[-1][2][:16] if rows else None}
        with open(os.path.join(coll, "changes.rechain.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
            fh.write(json.dumps({"ts": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "old": old, "reason": reason}, ensure_ascii=False) + "\n")
        if os.path.exists(kp): os.remove(kp)
        update(coll); print(f"re-chained; the old tip and the reason are in collection/changes.rechain.jsonl"); return 0
    p = problems(coll)
    if "--against" in argv:
        q, first = verify_against(coll, argv[argv.index("--against") + 1])
        if first: print(q[0])
        else: p += q
    t = tip(coll)
    print("\n".join(p) or f"chain OK: {t['lines']} lines, tip {t['tip'][:16]}")
    return 1 if p else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
