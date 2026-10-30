#!/usr/bin/env python3
"""Regression test GRK-P-02 (rewritten 2026-10-30): no opening films. Owner, 2026-10-30: "Right i dont want films".

The AI-generated opening films (art/splash/, 430 MB) are gone; every theme opens on its own engine (its GPU world, or its motion
splash). On a phone and a desktop, with the opening forced on (?splash=1), for a theme with an engine opening and one without:
  1. no request for a video file (.mp4 / .webm) and no request under art/splash/
  2. no <video> element is ever added to the splash
  3. the opening ends and the app is visible
  4. an Opening setting stored before the change ("both", "film", "mix") reads as the theme's own opening

  python3 tools/smoke/test_regress_grk_p02.py      (serves this repo itself, like smoke.py; needs playwright + Chromium)
Exit code 0 = all pass.
"""
import functools, http.server, os, socket, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, CHROMIUM
from playwright.sync_api import sync_playwright


def serve():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    class S(http.server.ThreadingHTTPServer):
        def handle_error(self, *a): pass
    httpd = S(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d/" % port, httpd


def main():
    base, httpd = serve(); fails = []
    def check(ok, msg):
        print(("ok:   " if ok else "FAIL: ") + msg, flush=True)
        if not ok: fails.append(msg)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], **kw)
        for dev, vp, mobile in (("phone", {"width": 390, "height": 844}, True), ("desktop", {"width": 1280, "height": 800}, False)):
            for theme, stored in (("supercell", "both"), ("kaleido", "film")):
                ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile); p = ctx.new_page(); vids = []
                p.on("request", lambda r: vids.append(r.url) if ("/art/splash/" in r.url or r.url.split("?")[0].endswith((".mp4", ".webm"))) else None)
                p.add_init_script("localStorage.setItem('tr_atmo_v1', %r); localStorage.setItem('titan.opening', %r); localStorage.setItem('tr_quality', 'low');"
                                  "new MutationObserver(function (m) { m.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.tagName === 'VIDEO' && n.closest && n.closest('#tr-splash')) window.__vid = 1; }); }); })"
                                  ".observe(document, { childList: true, subtree: true });" % (theme, stored))
                p.goto(base + "?splash=1#hall")
                choice = p.evaluate("window.TitanOpening ? TitanOpening.choice() : null")
                check(choice == "motion", f"[{dev}] {theme}: a stored Opening '{stored}' reads as the theme's own opening ({choice})")
                try: p.wait_for_function("() => !document.getElementById('tr-splash')", timeout=90000, polling=500); ended = True
                except Exception: ended = False
                check(ended, f"[{dev}] {theme}: the opening ends")
                vis = p.evaluate("getComputedStyle(document.getElementById('app') || document.body).visibility")
                check(vis == "visible", f"[{dev}] {theme}: the app is visible after it ({vis})")
                check(not vids, f"[{dev}] {theme}: no film or video file is requested ({vids[:2]})")
                check(not p.evaluate("!!window.__vid"), f"[{dev}] {theme}: no <video> is added to the opening")
                ctx.close()
        b.close()
    httpd.shutdown()
    print("GRK-P-02 (no films): " + ("ALL GOOD" if not fails else "%d FAILED" % len(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
