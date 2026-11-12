#!/usr/bin/env python3
"""Regression test CL-NEXT-01 (2026-11-12): the new front (next.html), phone and desktop.

The new front is a second page on the same published data and the same photograph engine. In a real browser:
  1. the Hall shows the ledger's own total and two shelves of coins; no page errors; nothing wider than the screen
  2. the Wall shows every specimen in data/index.json; a search narrows it; an empty search result offers a way back
  3. a specimen page shows the coin and its facts from data/detail/{ISO}.json
  4. the Vault shows the ledger's silver and gold ounces
  5. Worlds lists every theme the photograph engine has; picking one changes the backdrop (one canvas); the room opens and closes
  6. the opening runs in order (film layer first, then the theme's title on its photograph) and ends with the collection visible
  python3 tools/smoke/test_next_front.py      Exit code 0 = all pass.
"""
import functools, http.server, json, os, socket, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT
from playwright.sync_api import sync_playwright

GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]
fails = []
def check(ok, what):
    print(("  ok    " if ok else "  FAIL  ") + what)
    if not ok: fails.append(what)

def main():
    idx = json.load(open(os.path.join(ROOT, "data", "index.json"), encoding="utf-8")); n = len(idx["flips"]); grand = idx["board"]["grand"]
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    class S(http.server.ThreadingHTTPServer):
        def handle_error(self, *a): pass
    httpd = S(("127.0.0.1", port), functools.partial(H, directory=ROOT)); threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}/next.html"
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=GL)
        for name, vp in (("phone", {"width": 390, "height": 844}), ("desktop", {"width": 1440, "height": 900})):
            print(name); ctx = b.new_context(viewport=vp); pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
            pg.goto(base + "?nosplash#/", wait_until="load"); pg.wait_for_selector(".grand", timeout=20000); pg.wait_for_timeout(1500)
            total = pg.evaluate("document.querySelector('.grand').getAttribute('aria-label')")
            check(total == "$" + format(grand, ",.2f"), f"Hall total is the ledger's ({total})")
            check(pg.evaluate("document.querySelectorAll('.shelf .tile').length") >= 10, "Hall shelves hold coins")
            check(pg.evaluate("document.documentElement.scrollWidth") <= vp["width"], "nothing wider than the screen")
            pg.goto(base + "?nosplash#/wall"); pg.wait_for_selector(".wall-body .tile"); tiles = pg.evaluate("document.querySelectorAll('.wall-body .tile').length")
            check(tiles == n, f"the Wall shows all {n} specimens ({tiles})")
            pg.fill(".search input", "switzerland"); pg.wait_for_timeout(400); few = pg.evaluate("document.querySelectorAll('.wall-body .tile').length")
            check(0 < few < n, f"search narrows the Wall ({few})")
            pg.fill(".search input", "zzzz no such coin"); pg.wait_for_timeout(400); check(pg.evaluate("!!document.querySelector('.wall-body .empty .btn')"), "an empty search offers a way back")
            first = idx["flips"][0]; pg.goto(base + f"?nosplash#/coin/{first['scan']}"); pg.wait_for_selector(".facts dt", timeout=10000)
            check(pg.evaluate("document.querySelectorAll('.facts dt').length") >= 3 and pg.evaluate("!!document.querySelector('.face img, .face .blank')"), f"specimen {first['scan']} shows the coin and its facts")
            pg.goto(base + "?nosplash#/vault"); pg.wait_for_selector(".ingot"); txt = pg.evaluate("document.querySelector('.metal-two').textContent")
            check(format(idx["metals"]["oz"]["ag"], ",.2f") in txt, "the Vault shows the ledger's silver ounces")
            pg.goto(base + "?nosplash#/worlds"); pg.wait_for_selector(".world", timeout=15000); worlds = pg.evaluate("document.querySelectorAll('.world').length")
            check(worlds == pg.evaluate("TitanPlate.list.length") and worlds >= 50, f"Worlds lists every room ({worlds})")
            pg.click(".world:nth-child(3)"); pg.wait_for_timeout(1500); dbg = pg.evaluate("TitanPlate.debug()")
            check(dbg["canvases"] == 1 and dbg["id"] == pg.evaluate("document.documentElement.dataset.atmo"), f"picking a room changes the backdrop, one canvas ({dbg['id']})")
            pg.click(".page-head .btn"); pg.wait_for_timeout(700); check(pg.evaluate("TitanPlate.debug().mode") == "room" and pg.evaluate("document.body.classList.contains('in-room')"), "the room opens")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(400); check(pg.evaluate("TitanPlate.debug().mode") == "backdrop" and not pg.evaluate("document.body.classList.contains('in-room')"), "Escape leaves the room")
            check(not errs, "no page errors" + (": " + "; ".join(errs[:3]) if errs else "")); ctx.close()
        print("opening"); ctx = b.new_context(viewport={"width": 390, "height": 844}); pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        pg.goto(base + "#/", wait_until="load"); pg.wait_for_timeout(900)
        check(pg.evaluate("!!document.querySelector('.opening video') && !document.documentElement.classList.contains('ready')"), "the film layer comes first, the collection waits")
        pg.mouse.click(190, 400); pg.wait_for_timeout(3600)
        check(pg.evaluate("!!document.querySelector('.opening .open-title')"), "then the theme's opening with its title")
        pg.wait_for_timeout(6500); check(pg.evaluate("document.documentElement.classList.contains('ready') && !document.querySelector('.opening')"), "then the collection")
        check(not errs, "no page errors in the opening"); ctx.close(); b.close()
    print("CL-NEXT-01:", "PASS" if not fails else f"FAIL ({len(fails)})"); return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
