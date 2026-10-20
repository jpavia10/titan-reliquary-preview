#!/usr/bin/env python3
"""Regression test GRK-V-01 (2026-10-20): the 3D coin on the coin page (wings/coin3d.js).
  1. opening a coin shows the WebGL coin (and hides the flat faces); flipping lands on the other face (yaw ~ pi)
  2. "Flat photos" brings the flat faces back and is remembered; "View in 3D" returns
  3. reduced motion: no flip-in (the coin starts at rest)
  4. no page errors
  python3 tools/smoke/test_regress_grk_v01.py      Exit code 0 = all pass.
"""
import functools, http.server, math, os, socket, sys, threading
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
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + ("  " + str(info) if info and not ok else ""))
        if not ok: fails.append(name)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"], **kw)
        p = b.new_page(viewport={"width": 390, "height": 844}); errs = []
        p.on("pageerror", lambda e: errs.append(str(e)))
        p.goto(base + "?nosplash#coin=C001"); p.wait_for_timeout(4500)
        st = p.evaluate("({ a: TitanCoin3D.active(), c: !!document.querySelector('#drawer-body .c3d-canvas'), hid: getComputedStyle(document.querySelector('#drawer-body .gxd-faces')).display })")
        check("the coin page shows the 3D coin and hides the flat faces", st["a"] and st["c"] and st["hid"] == "none", st)
        p.evaluate("TitanCoin3D.flip()"); p.wait_for_timeout(2200)
        y = p.evaluate("TitanCoin3D.state().yaw")
        check("a flip lands on the other face", abs(abs(y) % (2 * math.pi) - math.pi) < 0.05, y)
        p.click("#drawer-body .c3d-wrap .c3d-toggle"); p.wait_for_timeout(300)
        st = p.evaluate("({ a: TitanCoin3D.active(), on: TitanCoin3D.isOn(), hid: getComputedStyle(document.querySelector('#drawer-body .gxd-faces')).display, bar: !!document.querySelector('#drawer-body .c3d-flatbar') })")
        check("Flat photos shows the flat faces and offers View in 3D", not st["a"] and not st["on"] and st["hid"] != "none" and st["bar"], st)
        p.click("#drawer-body .c3d-flatbar"); p.wait_for_timeout(500)
        check("View in 3D brings the coin back", p.evaluate("TitanCoin3D.active() && TitanCoin3D.isOn()"))
        r = p.evaluate("(() => { const ws = TitanWorlds.worlds, all = typeof ws === 'function' ? ws() : ws, have = TitanCoin3D.worlds(); return all.filter((w) => have.indexOf(w.id) < 0).map((w) => w.id); })()")
        check("every theme has its own 3D world around the coin", not r, r)
        check("the world is drawn behind the coin", p.evaluate("!!document.querySelector('#drawer-body .c3d-world') && TitanCoin3D.state().world > 0"))
        check("no page errors", not errs, errs[:3])
        c2 = b.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce"); p2 = c2.new_page()
        p2.goto(base + "?nosplash#coin=C001"); p2.wait_for_timeout(3000)
        s2 = p2.evaluate("TitanCoin3D.state()")
        check("reduced motion: no flip-in", s2 is not None and abs(s2["yaw"]) < 0.01 and abs(s2["scale"] - 1) < 0.01, s2)
        c3 = b.new_context(viewport={"width": 390, "height": 844}); c3.add_init_script("localStorage.setItem('tr_lite_v1', '1')"); p3 = c3.new_page()
        p3.goto(base + "?nosplash#coin=C001"); p3.wait_for_timeout(3000)
        l = p3.evaluate("({ lite: window.TitanLite === true && document.documentElement.classList.contains('tr-lite'), on: TitanCoin3D.active(), n: TitanCoin3D.state().world })")
        check("weak-device fallback: lite mode keeps the 3D coin with a lighter world", l["lite"] and l["on"] and 0 < l["n"] <= 40, l)
        b.close()
    sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
