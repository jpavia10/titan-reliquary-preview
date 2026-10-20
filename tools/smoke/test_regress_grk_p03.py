#!/usr/bin/env python3
"""Regression test GRK-P-03 (2026-10-20): an update must never close the Scene studio.

Joseph: "It always kicks off the scene selector then I have to go back in after several seconds."
Cause: every build ships a new sw.js; the page reloaded ~1 s after the new worker took control (and on a newer
version.json), even with the Scene sheet open. Rule pinned here:
  1. with the Scene studio open, an update request (TitanReload) does NOT reload, and the sheet stays open
  2. after the sheet is closed and the user is idle, the deferred reload happens
  3. a user-requested update (TitanReload(true), Health's "Update now") reloads at once
  python3 tools/smoke/test_regress_grk_p03.py      Exit code 0 = all pass.
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

def main():
    base = serve(); fails = []
    def check(name, ok):
        print(("ok:   " if ok else "FAIL: ") + name)
        if not ok: fails.append(name)
    with sync_playwright() as pw:
        b = pw.chromium.launch(**({"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}))
        p = b.new_page(viewport={"width": 390, "height": 844})
        p.goto(base + "?nosplash#hall"); p.wait_for_timeout(2500)
        p.evaluate("window.__alive = 1; window.TitanScene && window.TitanScene.open()"); p.wait_for_timeout(600)
        check("scene studio opened", p.evaluate("!!document.querySelector('#scene-sheet') && !document.querySelector('#scene-sheet').hidden"))
        p.evaluate("window.TitanReload()"); p.wait_for_timeout(4000)
        check("no reload while the scene studio is open", p.evaluate("window.__alive === 1"))
        check("scene studio still open after the update request", p.evaluate("!document.querySelector('#scene-sheet').hidden"))
        p.evaluate("window.TitanScene.close()")
        p.wait_for_function("window.__alive !== 1", timeout=15000) if True else None
        check("deferred reload happens once the studio is closed and idle", p.evaluate("window.__alive !== 1"))
        p.wait_for_timeout(2500)
        p.evaluate("window.__alive = 2"); p.evaluate("window.TitanReload(true)")
        try: p.wait_for_function("window.__alive !== 2", timeout=5000); ok = True
        except Exception: ok = False
        check("user-requested update reloads at once", ok)
        b.close()
    sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
