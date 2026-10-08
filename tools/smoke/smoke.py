#!/usr/bin/env python3
"""Smoke test of the whole app (fix list #31): every wing and the main features, in a real browser, phone and desktop.

  python3 tools/smoke/smoke.py [--url http://localhost:8766/] [--only phone|desktop] [--shots DIR]

Without --url it serves this repo on a free local port. Needs playwright (Chromium). Checks, per viewport:
  splash (forced, then skipped), Hall (value + as-of line), Gallery (carousel + tiles), search (palette finds a coin),
  coin view (certainty labels + history), Vault, Study, Lab, 3D table (opens, has a canvas, closes), Simple view, Health,
  Questions, Scene Studio (opens, Sound tab), and offline (service worker installed, reload with the network off).
Fails on any uncaught page error, any failed same-origin request (404 etc.) and any failed check. Exit code 0 = all good.
"""
import contextlib, functools, http.server, os, socket, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROMIUM = "/opt/pw-browsers/chromium"     # the cloud container's browser; elsewhere playwright finds its own


def serve():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/", httpd


class Run:
    def __init__(self, page, base, name, shots):
        self.p, self.base, self.name, self.shots = page, base, name, shots
        self.fails, self.passes = [], 0
        self.errors, self.bad, self.offline = [], [], False
        page.on("pageerror", lambda e: self.errors.append(str(e)[:200]))
        # ERR_ABORTED = the page itself cancelled the request (e.g. the splash film when the intro ends): not a failure
        page.on("requestfailed", lambda r: r.url.startswith(base) and not self.offline and "ERR_ABORTED" not in str(r.failure) and self.bad.append(f"{r.url[len(base):]} ({r.failure})"))
        page.on("response", lambda r: r.url.startswith(base) and r.status >= 400 and self.bad.append(f"{r.url[len(base):]} -> {r.status}"))

    def check(self, label, ok, detail=""):
        if ok: self.passes += 1
        else: self.fails.append(f"{label}" + (f": {detail}" if detail else ""))
        print(f"  [{self.name}] {'ok  ' if ok else 'FAIL'} {label}" + (f" ({detail})" if detail and not ok else ""))

    def go(self, hash_, wait=2500):
        self.p.goto(self.base + "?nosplash#" + hash_); self.p.wait_for_timeout(wait)

    def shot(self, tag):
        if self.shots: self.p.screenshot(path=os.path.join(self.shots, f"{self.name}_{tag}.png"))

    def visible_text(self, sel):
        el = self.p.query_selector(sel)
        return el.inner_text() if el and el.is_visible() else ""


def scenario(r):
    p = r.p
    # splash: forced once, then a plain ?nosplash load must not show it
    p.goto(r.base + "?splash=1"); p.wait_for_timeout(900)
    r.check("splash shows when forced", p.evaluate("document.documentElement.classList.contains('ts-on') || sessionStorage.getItem('tr_splash_v1') === '1'"))
    r.go("hall", 4000)
    r.check("splash skipped with ?nosplash", not p.evaluate("[...document.querySelectorAll('[class*=splash]')].some(e => e.offsetParent && getComputedStyle(e).opacity > 0.5 && e.getBoundingClientRect().height > innerHeight * 0.8)"))
    hero = r.visible_text("#hero-grand"); r.check("Hall shows the collection value", hero.startswith("$") and hero != "$0.00", hero)
    r.check("Hall shows the spot as-of line", "spot as of" in r.visible_text("#hall-asof"))
    cap = r.visible_text(".hero-cap").lower()
    r.check("headline caption names the price date", " prices)" in cap or "at spot" in cap, cap[:120])
    r.shot("hall")
    r.go("gallery", 3500)
    r.check("Gallery carousel has cards", p.evaluate("document.querySelectorAll('#gallery-coverflow-wrap .cf-card').length") > 0)
    n = p.evaluate("document.querySelectorAll('#pane-gallery [data-scan]').length")
    r.check("Gallery has coin tiles", n >= 10, f"{n} tiles")
    r.shot("gallery")
    # search
    p.click("#btn-search"); p.wait_for_timeout(400); p.fill("#palette-q", "Switzerland"); p.wait_for_timeout(900)
    n = p.evaluate("document.querySelectorAll('#palette-results [role=option], #palette-results button, #palette-results a').length")
    r.check("search finds coins", n > 0, f"{n} results"); p.keyboard.press("Escape"); p.wait_for_timeout(300)
    # coin view
    r.go("coin=C094", 3500)
    r.check("coin view has certainty labels", p.evaluate("document.querySelectorAll('.gxd-cert').length") >= 3)
    r.check("coin view has a History", p.evaluate("!!document.querySelector('.gxd-history')"))
    r.shot("coin")
    for wing, sel in (("vault", "#pane-vault"), ("study", "#pane-study"), ("lab", "#pane-lab")):
        r.go(wing, 3000)
        txt = r.visible_text(sel)
        r.check(f"{wing.capitalize()} renders", len(txt) > 200, f"{len(txt)} chars")
        r.shot(wing)
    # 3D table
    r.go("gallery", 2500)
    p.evaluate("window.__galleryBridge.launchSpatial()"); p.wait_for_timeout(5000)
    r.check("3D table opens with a canvas", p.evaluate("(() => { const m = document.getElementById('spatial-museum-modal'); return !!m && !m.hidden && !!m.querySelector('canvas'); })()"))
    r.shot("table")
    p.keyboard.press("Escape"); p.wait_for_timeout(800)
    r.check("3D table closes", p.evaluate("document.getElementById('spatial-museum-modal').hidden"))
    for h, sel, words in (("simple", "body", "Do I have"), ("health", "#health-view", "About this copy"), ("questions", "#questions-view", "Questions for you")):
        r.go(h, 3000)
        r.check(f"{h} view opens", words in r.visible_text(sel))
    # Scene Studio
    r.go("hall", 2500)
    p.click("#btn-atmo"); p.wait_for_timeout(1000)
    r.check("Scene Studio opens", p.evaluate("!!document.querySelector('#ss-title') && document.querySelector('#ss-title').offsetParent !== null"))
    tab = p.query_selector("#ss-tab-sound")
    if tab: tab.click(); p.wait_for_timeout(400)
    r.check("Scene Studio Sound tab has the tempo slider", p.evaluate("!!document.querySelector('#ss-tempo')"))
    p.keyboard.press("Escape")
    # offline: wait for the service worker, then reload without network
    r.go("hall", 1500)
    # the app registers sw.js only on https (GitHub Pages); register it here so offline is tested locally too
    p.evaluate("navigator.serviceWorker && navigator.serviceWorker.register('sw.js').catch(() => null)")
    ok = False
    for _ in range(30):
        if p.evaluate("navigator.serviceWorker && navigator.serviceWorker.controller ? true : false"): ok = True; break
        p.wait_for_timeout(1000); p.reload(); p.wait_for_timeout(500)
    r.check("service worker controls the page", ok)
    if ok:
        # Grok's review GRK-3-01/02/11: offline must cover more than the Hall. Save the data the way the app does when idle, then go offline
        # and open a coin that was never opened online, and the Questions page (cards or an honest "can't load", never "No open questions").
        warm = p.evaluate("window.TitanWarm ? window.TitanWarm(false) : null")
        r.check("data saved for offline", bool(warm and warm.get("ok")), str(warm))
        p.context.set_offline(True); r.offline = True      # fresh-only fetches (version checks, ?t= data) are expected to fail offline
        try:
            p.reload(); p.wait_for_timeout(3500)
            hero = r.visible_text("#hero-grand"); r.check("works offline (Hall value shows)", hero.startswith("$") and hero != "$0.00", hero)
            p.goto(r.base + "?nosplash#coin=C258"); p.wait_for_timeout(3500)
            r.check("offline: a coin never opened before still opens", p.evaluate("document.querySelectorAll('.gxd-cert').length") >= 3)
            p.goto(r.base + "?nosplash#questions"); p.wait_for_timeout(2500)
            qt = r.visible_text("#questions-view")
            r.check("offline: Questions never claims there are none", "No open questions" not in qt and (p.evaluate("document.querySelectorAll('.qv-q').length") > 0 or "Can't load" in qt), qt[:120])
        finally:
            p.context.set_offline(False); p.wait_for_timeout(500); r.offline = False


def main(argv):
    from playwright.sync_api import sync_playwright
    url = argv[argv.index("--url") + 1] if "--url" in argv else None
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    shots = argv[argv.index("--shots") + 1] if "--shots" in argv else None
    if shots: os.makedirs(shots, exist_ok=True)
    httpd = None
    if not url: url, httpd = serve()
    total_fail = []
    with sync_playwright() as pw:
        kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
        browser = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"], **kw)
        for name, vp, mobile in (("phone", {"width": 412, "height": 900}, True), ("desktop", {"width": 1400, "height": 900}, False)):
            if only and only != name: continue
            ctx = browser.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile)
            r = Run(ctx.new_page(), url, name, shots)
            print(f"{name} {vp['width']}x{vp['height']}")
            t0 = time.time()
            try: scenario(r)
            except Exception as e: r.check("scenario finished", False, f"{type(e).__name__}: {str(e)[:160]}")
            r.check("no page errors", not r.errors, "; ".join(dict.fromkeys(r.errors))[:400])
            r.check("no failed requests", not r.bad, "; ".join(dict.fromkeys(r.bad))[:400])
            print(f"  [{name}] {r.passes} passed, {len(r.fails)} failed in {time.time() - t0:.0f}s")
            total_fail += [f"{name}: {f}" for f in r.fails]
            ctx.close()
        browser.close()
    if httpd: httpd.shutdown()
    print("SMOKE: " + ("ALL GOOD" if not total_fail else f"{len(total_fail)} FAILED\n  " + "\n  ".join(total_fail)))
    if os.environ.get("GITHUB_ACTIONS"):          # one annotation per failure, so the run page (and the API) says what broke
        for f in total_fail: print("::error title=smoke::" + f.replace("\n", " ")[:300])
    return 1 if total_fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
