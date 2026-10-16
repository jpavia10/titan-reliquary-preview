"""Phone screenshots of each theme: live stylesheet (L) vs Gemini's 2026-10-14 copy (G). Motion off in both.
usage: serve the repo (python3 -m http.server 8811), then BASE=http://127.0.0.1:8811/ python3 ab_shots.py OUTDIR GEMDIR theme...
(GEMDIR holds <theme>.css from git show adcf6d9:intake/gemini-code-20261014/atmocss_<theme>.css)"""
import os, sys
from playwright.sync_api import sync_playwright

OUT, GEM = sys.argv[1:3]; THEMES = sys.argv[3:]
BASE = os.environ["BASE"]
VARS = os.environ.get("VARS", "L,G").split(",")
VIEWS = os.environ.get("VIEWS", "hall,gallery,coin=C258").split(",")


def router(css, t):
    tail = f"/styles/atmo/{t}.css"
    def handle(route):
        u = route.request.url
        if not u.startswith(BASE):
            route.abort()
        elif css is not None and u.split("?")[0].endswith(tail):
            route.fulfill(status=200, content_type="text/css", body=css)
        else:
            route.continue_()
    return handle


with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for t in THEMES:
        for var in VARS:
            ctx = br.new_context(viewport={"width": 390, "height": 844}, service_workers="block", device_scale_factor=2,
                                 is_mobile=True, has_touch=True, reduced_motion="reduce")
            ctx.add_init_script("try { localStorage.setItem('tr_atmo_v1', '%s'); localStorage.setItem('titan.motion', 'off'); "
                                "sessionStorage.setItem('tr_splash_v1', '1'); } catch (e) {}" % t)
            css = open(os.path.join(GEM, t + ".css"), encoding="utf-8").read() if var == "G" else None
            ctx.route("**/*", router(css, t))
            p = ctx.new_page()
            for h in VIEWS:
                p.goto(BASE + "?nosplash#" + h, wait_until="domcontentloaded", timeout=30000); p.wait_for_timeout(2600)
                if p.evaluate("document.documentElement.getAttribute('data-atmo')") != t:
                    print("WRONG THEME", t, var, h, flush=True)
                p.screenshot(path=os.path.join(OUT, f"{t}_{h.split('=')[0]}_{var}.png"))
            ctx.close()
        print("shot", t, flush=True)
    br.close()
