#!/usr/bin/env python3
"""Regression test for the opening-film rule (GRK-P-02 / tr126). Grok (Titan Reliquary), 2026-10-20.

tr117 skipped the film whenever navigator.connection.downlink read under 5 Mbps; Chrome's estimate often reads 1-2 Mbps
on a fast line, so Chrome users got no film for five days (tr126 fixed it). This test pins the rule in splash.js slowNet():
  1. a low reported downlink (1.4 Mbps) on a 4g line still plays the film
  2. Data Saver skips the film (no request under art/splash/)
  3. effectiveType 3g, 2g and slow-2g skip the film
  4. skipping the film stops its download (GRK-P-01): the <video> loses its source and no more film bytes arrive

  python3 tools/smoke/test_regress_grk_p02.py      (serves this repo itself, like smoke.py; needs playwright + Chromium)
Exit code 0 = all pass.
"""
import functools, http.server, os, socket, sys, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, CHROMIUM           # same repo root and browser lookup as the smoke test
from playwright.sync_api import sync_playwright

SENT = {"film": 0}                         # film bytes the server actually wrote (counted server-side, so nothing can hide them)
SLOW = {"on": False}                       # pace film bytes to ~4 Mbps so a clip is still downloading when the test skips it


def serve():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
        def copyfile(self, src, dst):
            if FILM not in self.path: return super().copyfile(src, dst)
            while True:
                buf = src.read(64 * 1024)
                if not buf: return
                try: dst.write(buf); dst.flush()
                except (BrokenPipeError, ConnectionResetError): return     # the browser dropped the film: stop sending
                SENT["film"] += len(buf)
                if SLOW["on"]: time.sleep(0.128)                          # 64 KB / 0.128 s = 4 Mbps
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/", httpd

CONN = """(() => { const c = %s; try { Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => Object.assign(new EventTarget(), c) }); } catch (e) {} })();"""
FILM = "/art/splash/"


def launch(p):
    kw = {"args": ["--autoplay-policy=no-user-gesture-required"]}
    if os.path.exists(CHROMIUM): kw["executable_path"] = CHROMIUM
    return p.chromium.launch(**kw)


def open_splash(browser, base, conn, throttle_kbps=None):
    ctx = browser.new_context(viewport={"width": 412, "height": 915}, is_mobile=True, has_touch=True)
    ctx.add_init_script(CONN % conn)
    page = ctx.new_page()
    film = {"reqs": 0}
    SLOW["on"] = bool(throttle_kbps); SENT["film"] = 0
    page.on("request", lambda r: FILM in r.url and film.__setitem__("reqs", film["reqs"] + 1))
    page.goto(base + "?splash=1")
    return ctx, page, film


def main():
    base, httpd = serve()
    fails = []
    def check(label, ok, detail=""):
        print(f"  {'ok  ' if ok else 'FAIL'} {label}" + (f" ({detail})" if detail else ""))
        if not ok: fails.append(label)
    with sync_playwright() as p:
        b = launch(p)
        # 1. low reported downlink on 4g: the film must still be requested and attached
        ctx, page, film = open_splash(b, base, "{ downlink: 1.4, effectiveType: '4g', saveData: false, rtt: 50 }")
        page.wait_for_timeout(4000)
        has = page.evaluate("!!document.querySelector('video.ts-film')")
        check("downlink 1.4 Mbps on 4g still plays the film", film["reqs"] > 0 and has, f"film requests {film['reqs']}, video element {has}")
        ctx.close()
        # 2 + 3. Data Saver, 3g, 2g, slow-2g: no film request at all
        for name, conn in [("Data Saver", "{ downlink: 50, effectiveType: '4g', saveData: true }"),
                           ("3g", "{ downlink: 1.2, effectiveType: '3g', saveData: false }"),
                           ("2g", "{ downlink: 0.2, effectiveType: '2g', saveData: false }"),
                           ("slow-2g", "{ downlink: 0.05, effectiveType: 'slow-2g', saveData: false }")]:
            ctx, page, film = open_splash(b, base, conn)
            page.wait_for_timeout(3000)
            has = page.evaluate("!!document.querySelector('video.ts-film')")
            check(f"{name} skips the film", film["reqs"] == 0 and not has, f"film requests {film['reqs']}, video element {has}")
            ctx.close()
        # 4. skip stops the download (throttled to 4 Mbps so the 12+ MB clip is still downloading when we skip)
        ctx, page, film = open_splash(b, base, "{ downlink: 10, effectiveType: '4g', saveData: false }", throttle_kbps=4000)
        t0 = time.time()
        while time.time() - t0 < 10 and SENT["film"] < 200_000: page.wait_for_timeout(200)
        started = SENT["film"]
        page.keyboard.press("Escape")            # any key skips (splash.js); a tap does the same
        page.wait_for_timeout(2500)              # the zoom-through exit (~1 s) then the video is dropped
        at_skip = SENT["film"]
        page.wait_for_timeout(3000)
        after = SENT["film"]
        src = page.evaluate("(() => { const v = document.querySelector('video.ts-film'); return v ? (v.getAttribute('src') || '') : null; })()")
        check("film was downloading before the skip", started >= 200_000, f"{started} bytes")
        check("after the skip the video has no source", not src, f"src {src!r}")
        check("after the skip no more film bytes arrive", after - at_skip < 64_000, f"{after - at_skip} bytes in the 3 s after the exit")
        SLOW["on"] = False; ctx.close(); b.close()
    httpd.shutdown()
    print("FILM RULE: ALL GOOD" if not fails else f"FILM RULE: {len(fails)} FAILED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
