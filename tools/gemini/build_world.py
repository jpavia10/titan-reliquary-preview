#!/usr/bin/env python3
"""Ask Gemini to build a NEW GPU world for a theme still on the first engine (theme framework, phase D; docs/design/THEME_FRAMEWORK.md).

  python3 tools/gemini/build_world.py OUT_DIR ID [ID ...] [--model gemini-3.6-flash]

For each ID: the brief tools/gemini/prompts/build_world.md + the theme (name, mood, styles from wings/themes/manifest.js; its palette from
styles/atmo/<id>.css; its soundscape preset from audio/scape/bridge.js; the source of its current TitanFX presets from wings/fx/*.js) + a
reference world on the same contract (fx/kintsugi.js) go to Gemini; the answer is saved as OUT_DIR/ID.js and one line is printed
("ID : model: N in, M out, finish F"). Nothing is installed here: every file goes through tools/rooms/check_conversion.py ID FILE --new
(parses, contract markers, boots with no errors, draws a picture, camera and look reach the world), then Claude's contact-sheet review.
With TITAN_CAPTURES=DIR (tools/rooms/capture_theme.py output) the theme's compiled shaders and its two pictures go along too.
"""
import glob, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, "tools", "gemini", "prompts")
FALLBACK = {"gemini-3.6-flash": "gemini-3-flash-preview", "gemini-3-flash-preview": "gemini-3.5-flash-lite", "gemini-3.5-flash-lite": "gemini-3.1-flash-lite"}
REF = [os.path.join("fx", "kintsugi.js"), os.path.join("fx", "horizon.js")]
CAP = os.environ.get("TITAN_CAPTURES", "")   # tools/rooms/capture_theme.py output: ID.glsl, ID_app.png, ID_effect.png


def read(*p): return open(os.path.join(ROOT, *p), encoding="utf-8").read()


def block(src, start):
    """the balanced (...) after src[start] (a register call)"""
    i = src.index("(", start); depth = 0
    for j in range(i, len(src)):
        ch = src[j]
        if ch == "(": depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0: return src[start:j + 1]
    return src[start:start + 6000]


def preset_source(name):
    for f in sorted(glob.glob(os.path.join(ROOT, "wings", "fx", "*.js"))):
        s = open(f, encoding="utf-8").read(); m = re.search(r'FX\.register\("%s",' % re.escape(name), s)
        if m:
            # the comment block that describes it, right above the call
            head = s[max(0, m.start() - 2500):m.start()]; k = head.rfind("/*"); desc = head[k:] if k >= 0 else ""
            return "/* from %s */\n%s%s" % (os.path.relpath(f, ROOT), desc, block(s, m.start())[:9000])
    return "(preset %s not found)" % name


def theme(tid):
    man = read("wings", "themes", "manifest.js")
    m = re.search(r'\{ id: "%s", name: "([^"]+)"(.*?)tokens:' % re.escape(tid), man, re.S)
    name, rest = m.group(1), m.group(2)
    get = lambda k: (re.search(r'%s: "([^"]*)"' % k, rest) or [None, ""])[1]
    styles = (re.search(r"styles: \[([^\]]*)\]", rest) or [None, ""])[1]
    css = read("styles", "atmo", tid + ".css") if os.path.exists(os.path.join(ROOT, "styles", "atmo", tid + ".css")) else ""
    pal = "\n".join(l.strip() for l in css.splitlines() if re.match(r"\s*--(bg|bg2|surface|surface2|ink|muted|gold|gold-soft|accent|acc|accent2|line|glow)\s*:", l))[:1500]
    head = css.split("*/", 1)[0][:1800] if css.startswith("/*") else ""
    sc = (re.search(r'\b%s: "([a-z]+)"' % re.escape(tid), read("audio", "scape", "bridge.js")) or [None, ""])[1]
    fx = get("fx"); presets = [x.split("*")[0] for x in fx.split("+") if x]
    return name, get("mood"), styles, get("collection"), pal, head, sc, fx, presets


def main(argv):
    model = argv[argv.index("--model") + 1] if "--model" in argv else "gemini-3.6-flash"
    args = [a for i, a in enumerate(argv) if a != "--model" and (i == 0 or argv[i - 1] != "--model")]
    out, ids = args[0], args[1:]
    os.makedirs(out, exist_ok=True)
    brief = read("tools", "gemini", "prompts", "build_world.md")
    for n, tid in enumerate(ids):
        if n: time.sleep(13)
        name, mood, styles, coll, pal, head, sc, fx, presets = theme(tid)
        src = "\n\n".join(preset_source(p) for p in presets)
        glsl = os.path.join(CAP, tid + ".glsl") if CAP else ""
        if glsl and os.path.exists(glsl): src += "\n\n/* THE EFFECT TODAY, IN FULL: the compiled shaders */\n" + open(glsl, encoding="utf-8").read()[:60000]
        imgs = [x for x in (os.path.join(CAP, tid + "_app.png"), os.path.join(CAP, tid + "_effect.png")) if CAP and os.path.exists(x)]
        txt = brief + ("\n\nTHIS THEME\n- id: \"%s\" (the module name and K.themes key), name: %s, group: %s\n- mood: %s\n- styles: %s\n"
                       "- soundscape preset for room.sound: \"%s\"\n- palette (its pages' CSS colours):\n%s\n- its notes:\n%s\n"
                       "- its effect today on the old engine (%s):\n```js\n%s\n```\n" % (tid, name, coll, mood, styles, sc, pal, head, fx, src))
        pr = os.path.join(out, tid + ".prompt.md"); open(pr, "w", encoding="utf-8").write(txt)
        for m in (model, FALLBACK.get(model, model)):
            cmd = [sys.executable, os.path.join(ROOT, "tools", "gemini", "ask.py"), "--prompt", pr, "--model", m, "--code", "--out", os.path.join(out, tid + ".js")]
            for f in REF: cmd += ["--file", f]
            for f in imgs: cmd += ["--image", f]
            r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            line = [x for x in (r.stdout + "\n" + r.stderr).splitlines() if x.strip()]
            msg = next((x for x in reversed(line) if " in, " in x and "finish" in x), (line or ["no answer"])[-1][:200])
            if r.returncode == 0: break
            time.sleep(13)
        print("%s : %s" % (tid, msg), flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
