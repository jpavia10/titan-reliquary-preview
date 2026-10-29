#!/usr/bin/env python3
"""Ask Gemini to convert GPU worlds to the world contract (theme framework, docs/design/THEME_FRAMEWORK.md, phase B).

  python3 tools/gemini/convert_world.py OUT_DIR ID [ID ...] [--model gemini-3.6-flash]

For each ID: the brief tools/gemini/prompts/convert_world.md + the theme's scape preset (audio/scape/bridge.js THEME_SCAPE) + the
reference diff (Supercell's conversion) + fx/ID.js go to Gemini; the answer's code is saved as OUT_DIR/ID.js and one line is printed
("ID : model: N in, M out, finish F"). Requests are 13 s apart (free tier: 5 a minute). Nothing is installed here: every file goes
through tools/rooms/check_conversion.py first (parses, contract markers, backdrop unchanged, camera and look reach the world).
"""
import os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FALLBACK = {"gemini-3.6-flash": "gemini-3.8-flash", "gemini-3.8-flash": "gemini-3-flash-preview"}
P = os.path.join(ROOT, "tools", "gemini", "prompts")


def scape(tid):
    m = re.search(r'\b%s: "([a-z]+)"' % re.escape(tid), open(os.path.join(ROOT, "audio", "scape", "bridge.js"), encoding="utf-8").read())
    return m.group(1) if m else ""


def main(argv):
    model = argv[argv.index("--model") + 1] if "--model" in argv else "gemini-3.6-flash"
    args = [a for i, a in enumerate(argv) if a != "--model" and (i == 0 or argv[i - 1] != "--model")]
    out, ids = args[0], args[1:]
    os.makedirs(out, exist_ok=True)
    brief = open(os.path.join(P, "convert_world.md"), encoding="utf-8").read()
    for n, tid in enumerate(ids):
        if n: time.sleep(13)
        pr = os.path.join(out, tid + ".prompt.md")
        open(pr, "w", encoding="utf-8").write(brief + "\n\nTHIS WORLD: id \"%s\", file fx/%s.js, scape preset for room.sound: \"%s\".\n" % (tid, tid, scape(tid)))
        for m in (model, FALLBACK.get(model, model)):          # one retry, on another free model, when an answer fails or is cut short
            r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "gemini", "ask.py"), "--prompt", pr,
                                "--file", os.path.join("tools", "gemini", "prompts", "ref_supercell_conversion.diff"), "--file", os.path.join("fx", tid + ".js"),
                                "--model", m, "--code", "--out", os.path.join(out, tid + ".js")], cwd=ROOT, capture_output=True, text=True)
            line = [x for x in (r.stdout + "\n" + r.stderr).splitlines() if x.strip()]
            msg = next((x for x in reversed(line) if " in, " in x and "finish" in x), (line or ["no answer"])[-1][:200])
            if r.returncode == 0: break
            time.sleep(13)
        print("%s : %s" % (tid, msg), flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
