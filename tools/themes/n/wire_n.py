#!/usr/bin/env python3
"""Wire one of the new themes #37-#50 (Grok theme-37-50 worker): runs tools/themes/add_theme.py on the spec, then adds what that
script does not: wings/fx/styles-n.js (once), js/intros/<id>.js, the coin-page world row (wings/coin3d.js WORLD) and the UI sound
voice (wings/ui-sounds.js VOICE). Idempotent.   python3 tools/themes/n/wire_n.py tools/themes/specs/<id>.json"""
import json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
P = lambda *p: os.path.join(ROOT, *p)
rd = lambda f: open(P(f), encoding="utf-8").read()
def wr(f, s): open(P(f), "w", encoding="utf-8", newline="\n").write(s)
spec = sys.argv[1]; s = json.load(open(spec)); tid = s["id"]
subprocess.check_call([sys.executable, P("tools/themes/add_theme.py"), spec])
t = rd("index.html")
if "wings/fx/styles-n.js" not in t:
    m = re.search(r'<script src="wings/fx/styles-e\.js\?v=(tr\d+)"></script>', t)
    t = t[:m.end()] + f'<script src="wings/fx/styles-n.js?v={m.group(1)}"></script>' + t[m.end():]
if f"js/intros/{tid}.js" not in t:
    m = re.search(r'\n  <script src="js/intros/y2k\.js\?v=(tr\d+)"></script>', t)
    t = t[:m.end()] + f'\n  <script src="js/intros/{tid}.js?v={m.group(1)}"></script>' + t[m.end():]
wr("index.html", t)
t = rd("sw.js")
if "wings/fx/styles-n.js" not in t: t = t.replace('"wings/fx/styles-e.js?v=" + BUILD,', '"wings/fx/styles-e.js?v=" + BUILD,\n  "wings/fx/styles-n.js?v=" + BUILD,', 1)
if f'"js/intros/{tid}.js' not in t: t = t.replace('"js/intros/y2k.js?v=" + BUILD,', f'"js/intros/y2k.js?v=" + BUILD, "js/intros/{tid}.js?v=" + BUILD,', 1)
wr("sw.js", t)
t = rd("wings/coin3d.js")
if f" {tid}: [" not in t:
    t = t.replace('y2k: ["drift", 0xffffff, 70, 0.08],', 'y2k: ["drift", 0xffffff, 70, 0.08], ' + f'{tid}: {s["world"]},', 1)
wr("wings/coin3d.js", t)
t = rd("wings/ui-sounds.js")
if f" {tid}: [" not in t:
    t = t.replace('y2k: [1046, "sine", [1, 2, 3], 0.2, 7000, [0, 4, 7, 11, 14]],', 'y2k: [1046, "sine", [1, 2, 3], 0.2, 7000, [0, 4, 7, 11, 14]], ' + f'{tid}: {s["voice"]},', 1)
wr("wings/ui-sounds.js", t)
print(tid, "wired (+ styles-n, intro, world, voice)")
