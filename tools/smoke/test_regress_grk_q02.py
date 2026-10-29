#!/usr/bin/env python3
"""Regression test GRK-Q-02 (2026-10-20): every intro reads the graphics-quality tier, not the old Lite flag.

Joseph: one quality setting (Low / Medium / High / Ultra / Max, wings/quality.js) drives everything. For the opening intros:
  1. no intro file reads window.TitanLite, html.tr-lite or tr_lite_v1 directly (they read C.tier / C.lite, set from TitanQuality.tier())
  2. ?q=low   -> every intro runs with C.tier "low", C.lite true, and draws no GPU layer (the flat version)
  3. ?q=high  -> every intro runs with C.tier "high", C.lite false
  4. higher tiers scale detail up: TitanIntro.res / count grow low < medium < high < ultra < max, and a GPU intro's buffer at Max
     is larger than at High
  5. no automatic downgrade: after playing through, C.tier and TitanQuality.tier() are unchanged
  python3 tools/smoke/test_regress_grk_q02.py      Exit code 0 = all pass.
"""
import functools, glob, http.server, os, re, socket, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, CHROMIUM
from playwright.sync_api import sync_playwright

def serve():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/"

fails = []
def check(ok, msg):
    print(("ok:   " if ok else "FAIL: ") + msg)
    if not ok: fails.append(msg)

# 1. static
bad = [os.path.basename(f) for f in glob.glob(os.path.join(ROOT, "js", "intros", "*.js")) if re.search(r"TitanLite|tr-lite|tr_lite_v1", open(f).read())]
check(not bad, "no intro reads the old Lite flag directly" + (": " + ", ".join(bad) if bad else ""))

STATE = """() => { const D = TitanOpening._debug, C = D.C || {}; const gl = [...document.querySelectorAll('#tr-splash canvas.ts-mogl')].filter(c => c.isConnected && c.style.display !== 'none' && c.width > 2);
  return { tier: C.tier, lite: C.lite, gl: gl.length, px: gl.reduce((a, c) => a + c.width * c.height, 0), q: String(TitanQuality.tier()) }; }"""

base = serve()
with sync_playwright() as p:
    kw = {"args": ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]}
    if os.path.exists(CHROMIUM): kw["executable_path"] = CHROMIUM
    b = p.chromium.launch(**kw); ctx = b.new_context(viewport={"width": 412, "height": 915}); pg = ctx.new_page()
    def load(tier, theme):
        pg.goto(f"{base}?q={tier}&opening=motion&theme={theme}&splashhold&splash=1")
        pg.wait_for_function("window.TitanOpening && TitanOpening._debug.api && TitanOpening._debug.C", timeout=30000)
        pg.evaluate("TitanOpening._debug.api.seek(2.0)"); pg.wait_for_timeout(120)
        return pg.evaluate(STATE)
    pg.goto(f"{base}?q=high"); pg.wait_for_function("window.TitanOpening && TitanOpening.need", timeout=30000)
    pg.evaluate("() => Promise.all(TitanOpening.INTROS.map((i) => TitanOpening.need(i)))")   # the scenes load on demand
    ids = pg.evaluate("TitanIntro.ids()")
    # 4a. the scaling helpers grow with the tier
    grow = pg.evaluate("""() => { const T = ["low","medium","high","ultra","max"], r = T.map(t => TitanIntro.res({ tier: t, detail: {low:.6,medium:.8,high:1,ultra:1.3,max:1.6}[t], W: 400, H: 800 }, 1)),
      n = T.map(t => TitanIntro.count({ tier: t }, 10000)); return { r, n }; }""")
    check(all(grow["n"][i] < grow["n"][i + 1] for i in range(4)), f"particle counts grow with the tier {grow['n']}")
    check(all(grow["r"][i] <= grow["r"][i + 1] for i in range(4)) and grow["r"][4] > grow["r"][2], f"render scale grows with the tier {[round(x, 2) for x in grow['r']]}")
    lowbad, highbad = [], []
    for i in ids:
        s = load("low", i)
        if s["tier"] != "low" or s["lite"] is not True or s["gl"]: lowbad.append(f"{i} {s}")
        s = load("high", i)
        if s["tier"] != "high" or s["lite"] is not False: highbad.append(f"{i} {s}")
    check(not lowbad, f"Low: all {len(ids)} intros flat (tier low, no GPU layer)" + ("; " + "; ".join(lowbad[:6]) if lowbad else ""))
    check(not highbad, f"High: all {len(ids)} intros run at tier high" + ("; " + "; ".join(highbad[:6]) if highbad else ""))
    h = load("high", "alchemist"); m = load("max", "alchemist")
    check(m["tier"] == "max" and m["px"] > h["px"] > 0, f"Max renders more pixels than High (alchemist {m['px']} > {h['px']})")
    pg.evaluate("TitanOpening._debug.api.seek(4.9)"); pg.wait_for_timeout(200); pg.evaluate("TitanOpening._debug.api.seek(1.0)"); pg.wait_for_timeout(200)
    s = pg.evaluate(STATE)
    check(s["tier"] == "max" and s["q"] == "max", "no automatic downgrade: still Max after playing through")
    b.close()
print("q02:", "ALL GOOD" if not fails else f"{len(fails)} FAILED")
sys.exit(1 if fails else 0)
