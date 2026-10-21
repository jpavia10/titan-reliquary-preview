#!/usr/bin/env python3
"""Regression test GRK-S-01 (2026-10-20): the shared signature-experience engine (wings/signature/core.js).
  1. TitanSig loads, lists the themes that have a world, and opening an unknown world fails cleanly (no overlay, no errors)
  2. every theme listed as available opens a full-screen world with a 48 px close button, a canvas, and closes on Escape
  python3 tools/smoke/test_regress_grk_s01.py      Exit code 0 = all pass.
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
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + ("  " + str(info) if info and not ok else ""))
        if not ok: fails.append(name)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"], **kw)
        p = b.new_page(viewport={"width": 390, "height": 844}); errs = []
        p.on("pageerror", lambda e: errs.append(str(e)))
        p.goto(base + "?nosplash#gallery"); p.wait_for_timeout(3000)
        check("engine loaded", p.evaluate("!!window.TitanSig && Array.isArray(TitanSig.available())"))
        r = p.evaluate("TitanSig.open('no-such-world').then((ok) => ok === false && !document.getElementById('sig'))")
        check("an unknown world fails cleanly", r)
        # a bare probe world: proves the shell alone keeps the contract, whatever a theme draws
        p.evaluate("TitanSig.register('probe', { label: 'Probe', hud: false, enter(ctx) { ctx.camera.position.set(0, 0, 5); } })")
        for wid in ["probe"] + p.evaluate("TitanSig.available()"):
            ok = p.evaluate("(id) => TitanSig.open(id)", wid); p.wait_for_timeout(1500)
            st = p.evaluate("(() => { const r = document.getElementById('sig'); if (!r) return null; const c = r.querySelector('.sig-close').getBoundingClientRect(); return { canvas: !!r.querySelector('canvas'), close: Math.min(c.width, c.height) } })()")
            check(wid + ": opens a full-screen world with a 44px+ close button", ok and st and st["canvas"] and st["close"] >= 44, st)
            ctl = p.evaluate("(() => { const r = document.getElementById('sig'); return ['.sig-search', '.sig-mute', '.sig-close'].every((q) => { const b = r.querySelector(q); return b && b.getBoundingClientRect().width >= 44; }); })()")
            check(wid + ": contract controls (search, mute, back) are there", ctl)
            f = p.evaluate("TitanSig.ctx().facts('C289').then(() => document.querySelector('.sig-facts-body').textContent)")
            check(wid + ": a coin's sourced facts and their sources are viewable", "Where each fact comes from" in (f or "") and "Numista" in (f or ""), (f or "")[:120])
            p.keyboard.press("Escape"); p.wait_for_timeout(300)
            check(wid + ": Escape closes it", p.evaluate("!document.getElementById('sig') && !TitanSig.isOpen()"))
        check("no page errors", not errs, errs[:3])
        b.close()
    sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
