#!/usr/bin/env python3
"""Regression test GRK-T-01 (2026-10-20): tilting the phone moves the scene.
  1. after the first touch, a device-orientation reading sets --tilt-x / --tilt-y on <html>
  2. TitanFX.setTilt(false) turns it off and clears them
  3. reduced motion: tilt does nothing
  python3 tools/smoke/test_regress_grk_t01.py      Exit code 0 = all pass.
"""
import functools, http.server, os, socket, sys, threading
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

TILT = """(g) => new Promise((res) => { const fire = (b, gg) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { alpha: 0, beta: b, gamma: gg }));
  fire(40, 0); setTimeout(() => { fire(40, g); setTimeout(() => res(getComputedStyle(document.documentElement).getPropertyValue("--tilt-x").trim()), 80); }, 60); })"""

def main():
    base = serve(); fails = []
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + ("  " + str(info) if info and not ok else ""))
        if not ok: fails.append(name)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(**kw)
        for rm in ("no-preference", "reduce"):
            c = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, reduced_motion=rm); p = c.new_page()
            p.goto(base + "?nosplash#hall"); p.wait_for_timeout(2500)
            p.evaluate("document.body.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))"); p.wait_for_timeout(100)
            v = p.evaluate(TILT, 15)
            if rm == "reduce":
                check("reduced motion: tilt does nothing", v == "", v)
            else:
                check("a tilt reading moves the scene (--tilt-x set)", v not in ("", "0", "0.000"), v)
                p.evaluate("TitanFX.setTilt(false)")
                check("setTilt(false) turns it off", p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--tilt-x').trim()") == "")
                p.evaluate("TitanFX.setTilt(true)")
            c.close()
        b.close()
    sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
