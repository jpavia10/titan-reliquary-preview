#!/usr/bin/env python3
"""Put a theme on its GPU world (theme framework, phase D; docs/design/THEME_FRAMEWORK.md). Run after the world passed
tools/rooms/check_conversion.py ID fx/ID.js --new and its contact sheet was reviewed.

  python3 tools/themes/wire_world.py ID [ID ...] [--no-opening]

For each ID (a world file fx/ID.js): the kit's lazy map (fx/kit.js; a world written on the stage library loads fx/stage.js first),
the offline list (sw.js), the first engine's theme map (wings/fx/ui.js: "fxk"), the manifest (wings/themes/manifest.js: fx "fxk",
fxIntensity 0.01) and the openings on the engine (wings/room.js OPENINGS, unless --no-opening). Idempotent; prints what changed.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def rw(rel, fn):
    p = os.path.join(ROOT, rel); s = open(p, encoding="utf-8").read(); t = fn(s)
    if t != s: open(p, "w", encoding="utf-8").write(t); return True
    return False


def wire(tid, opening=True):
    src = open(os.path.join(ROOT, "fx", tid + ".js"), encoding="utf-8").read()
    stage = "K.stage(" in src
    done = []
    def kit(s):
        m = re.search(r"K\.lazy = K\.lazy \|\| \{(.*?)\};", s, re.S)
        if re.search(r"\b%s: " % tid, m.group(1)): return s
        entry = '%s: %s' % (tid, '["fx/stage.js", "fx/%s.js"]' % tid if stage else '"fx/%s.js"' % tid)
        return s[:m.start(1)] + m.group(1).rstrip() + ", " + entry + " " + s[m.end(1):]
    if rw("fx/kit.js", kit): done.append("kit lazy")
    def sw(s):
        out = s
        for f in (["fx/stage.js"] if stage else []) + ["fx/%s.js" % tid]:
            if '"%s?v=" + BUILD' % f in out: continue
            out = out.replace('  "fx/kintsugi.js?v=" + BUILD,', '  "fx/kintsugi.js?v=" + BUILD,\n  "%s?v=" + BUILD,' % f, 1)
        return out
    if rw("sw.js", sw): done.append("sw.js")
    if rw("wings/fx/ui.js", lambda s: re.sub(r'\b%s: \["[^"]*", [0-9.]+\]' % tid, '%s: ["fxk", 0.01]' % tid, s, 1)): done.append("ui.js")
    def man(s):
        m = re.search(r'\{ id: "%s",.*?fx: "([^"]*)", fxIntensity: ([0-9.]+)' % tid, s, re.S)
        if not m or m.group(1) == "fxk": return s
        return s[:m.start(1)] + "fxk" + s[m.end(1):m.start(2)] + "0.01" + s[m.end(2):]
    if rw("wings/themes/manifest.js", man): done.append("manifest")
    if opening:
        def op(s):
            m = re.search(r"OPENINGS = \{(.*?)\};", s, re.S)
            if re.search(r"\b%s: 1" % tid, m.group(1)): return s
            return s[:m.start(1)] + m.group(1).rstrip() + ", %s: 1 " % tid + s[m.end(1):]
        if rw("wings/room.js", op): done.append("OPENINGS")
    print("%s: %s" % (tid, ", ".join(done) or "already wired"))


if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if not a.startswith("--")]
    for t in ids: wire(t, "--no-opening" not in sys.argv)
