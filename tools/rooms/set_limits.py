#!/usr/bin/env python3
"""Set a world's room limits (theme framework, docs/design/THEME_FRAMEWORK.md slot 3) without hand-editing the file.

  python3 tools/rooms/set_limits.py ID yaw=-.15,.15 pitch=-.12,.12 [move=-.4,.6] [up=-.08,.08]

Rewrites `yaw: [a, b]` etc. inside K.themes[ID].room in fx/ID.js (one line or many) and pulls the opening's start (`from`) inside the
new limits. Look at the world's contact sheet after: on a phone the subject must stay on screen at every limit.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main(argv):
    tid, sets = argv[0], dict(a.split("=", 1) for a in argv[1:])
    p = os.path.join(ROOT, "fx", tid + ".js"); t = open(p, encoding="utf-8").read()
    i = re.search(r"\broom:\s*\{", t).start(); head, room = t[:i], t[i:]
    lim = {}
    for k, v in sets.items():
        a, b = (float(x) for x in v.split(","))
        lim[k] = (a, b)
        room, n = re.subn(r"\b%s:\s*\[\s*[-\d.]+\s*,\s*[-\d.]+\s*\]" % k, "%s: [%s, %s]" % (k, fmt(a), fmt(b)), room, count=1)
        if not n: sys.exit("no %s limit in the room of %s" % (k, tid))
    m = re.search(r"from:\s*\{([^}]*)\}", room)
    if m:
        f = dict((k, float(v)) for k, v in re.findall(r"(yaw|pitch|move|up):\s*([-\d.]+)", m.group(1)))
        for k, (a, b) in lim.items():
            if k in f: f[k] = min(max(f[k], a * .8), b * .8)
        room = room[:m.start()] + "from: { " + ", ".join("%s: %s" % (k, fmt(f[k])) for k in ("yaw", "pitch", "move", "up") if k in f) + " }" + room[m.end():]
    open(p, "w", encoding="utf-8").write(head + room); print("%s: %s" % (tid, " ".join("%s=%s" % kv for kv in sets.items())))


def fmt(x):
    s = ("%.3f" % x).rstrip("0").rstrip(".")
    return s.replace("0.", ".", 1) if s.startswith("0.") else s.replace("-0.", "-.", 1)


if __name__ == "__main__":
    main(sys.argv[1:])
