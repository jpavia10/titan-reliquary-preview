#!/usr/bin/env python3
"""Regression test GRK-P-02 (rewritten 2026-11-07): the 1080p opening film first, then the theme's own opening, then the app.

Owner, 2026-11-07: "The 1080p video splashes should go first then followed by the theme intro." (tr267-tr275 had no films: the owner's
2026-10-30 "Right i dont want films" was read as the main film too.) History of the rule: tr117 skipped the film whenever
navigator.connection.downlink read under 5 Mbps, and Chrome's estimate often reads 1-2 Mbps on a fast line (tr126 fixed it); GRK-P-01
stops the film's download when it is skipped.

  1. default Opening ("both"), phone and desktop, a theme with an engine opening (Supercell) and one with a motion splash (Kaleido):
     an .mp4 under art/splash/ is requested (never .webm), a <video> plays; at the film's end the theme's own opening runs (the world
     for Supercell: html.ts-engine; the motion canvas for Kaleido: #tr-splash.ts-motion); the opening ends and the app is visible
  2. the GPU world holds still under the film (html.ts-filmplay; the kit draws a few frames, then waits)
  3. an Opening "motion" stored while the film was not on offer (tr267-tr275, no titan.opening.v) reads as "both" once; one chosen
     after this build (titan.opening.v = 2) stays "motion": no film, the theme's opening only
  4. a low reported downlink (1.4 Mbps) on 4g still plays the film; Data Saver, 3g, 2g and slow-2g skip it (no request under
     art/splash/) and the theme's opening runs instead
  5. skipping the film stops its download (GRK-P-01): the <video> loses its source and no more film bytes arrive
  6. Motion Calm never plays the film
  7. when the film was heard (sound allowed), the theme's own sound (its recordings + music) starts with the theme's opening, no tap
  8. coming back to an open Hall (owner 2026-11-07: "The main splash hasn't been appearing on titan for a while"): after 5 min nothing;
     after 25 min the page reloads and the film plays again; with sound still playing, no reload: only the theme's opening as an overlay
Graphics Low through the user's choice key tr_quality_v1 (wings/quality.js rewrites the tr_quality mirror on load).

  python3 tools/smoke/test_regress_grk_p02.py      (serves this repo itself, like smoke.py; needs playwright + Chromium)
Exit code 0 = all pass.
"""
import functools, http.server, os, socket, sys, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, CHROMIUM           # same repo root and browser lookup as the smoke test
from playwright.sync_api import sync_playwright

FILM = "/art/splash/"
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
    class S(http.server.ThreadingHTTPServer):
        def handle_error(self, *a): pass
    httpd = S(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d/" % port, httpd


CONN = """(() => { const c = %s; try { Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => Object.assign(new EventTarget(), c) }); } catch (e) {} })();"""
# flags the test reads afterwards: a film was attached, the world opening ran, the motion splash ran, the world held during the film
WATCH = """(() => {
  new MutationObserver(() => {
    const H = document.documentElement; if (!H) return;      // the init script runs before <html> exists
    if (H.classList.contains('ts-engine')) window.__eng = 1;
    if (H.classList.contains('ts-filmplay')) window.__hold = 1;
    const r = document.getElementById('tr-splash');
    if (r && r.classList.contains('ts-motion')) window.__mo = 1;
    if (r && r.querySelector('video.ts-film')) window.__vid = 1;
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();"""


# for 8: a page whose visibility and clock the test controls (the skew survives the reload in sessionStorage)
RETURN = """
(() => {
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return window.__vis || 'visible'; } });
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return (window.__vis || 'visible') === 'hidden'; } });
  const _now = Date.now; Date.now = () => _now() + (+sessionStorage.getItem('__skew') || 0);
  if (!sessionStorage.getItem('__init')) { sessionStorage.setItem('__init', '1'); sessionStorage.setItem('tr_splash_v1', '1');
    localStorage.setItem('tr_seen_at', String(Date.now())); localStorage.setItem('tr_atmo_v1', 'kaleido'); localStorage.setItem('tr_quality_v1', 'low'); }
  window.__loads = (+sessionStorage.getItem('__loads') || 0) + 1; sessionStorage.setItem('__loads', String(window.__loads));
})();"""


def main():
    base, httpd = serve(); fails = []
    def check(ok, msg):
        print(("ok:   " if ok else "FAIL: ") + msg, flush=True)
        if not ok: fails.append(msg)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                                     "--autoplay-policy=no-user-gesture-required"], **kw)

        def open_page(vp, mobile, theme, store="", conn=None, query="?splash=1#hall"):
            ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile); p = ctx.new_page(); reqs = []
            p.on("request", lambda r: reqs.append(r.url) if (FILM in r.url or r.url.split("?")[0].endswith((".mp4", ".webm"))) else None)
            if conn: p.add_init_script(CONN % conn)
            p.add_init_script("localStorage.setItem('tr_atmo_v1', %r); localStorage.setItem('tr_quality_v1', 'low');%s" % (theme, store))
            p.add_init_script(WATCH)
            p.goto(base + query)
            return ctx, p, reqs

        def ends(p, ms=90000):
            try: p.wait_for_function("() => !document.getElementById('tr-splash')", timeout=ms, polling=500); return True
            except Exception: return False

        def to_end(p):
            """jump the film to its last second, so it hands over now instead of in 15 s"""
            try:
                p.wait_for_function("() => { const v = document.querySelector('video.ts-film'); return v && v.readyState >= 1 && v.duration > 2; }", timeout=20000, polling=200)
                p.evaluate("(() => { const v = document.querySelector('video.ts-film'); v.currentTime = v.duration - 1.0; })()")
                return True
            except Exception: return False

        # 1 + 2. the default order: film, then the theme's opening, then the app
        for dev, vp, mobile in (("phone", {"width": 390, "height": 844}, True), ("desktop", {"width": 1280, "height": 800}, False)):
            for theme, flag, what in (("supercell", "__eng", "its world opening"), ("kaleido", "__mo", "its motion splash")):
                ctx, p, reqs = open_page(vp, mobile, theme)
                got = p.evaluate("[TitanOpening.choice(), TitanOpening.pick(), TitanOpening.after()]")
                check(got == ["both", "film", True], f"[{dev}] {theme}: default Opening is film then theme ({got})")
                heard = p.evaluate("(() => { const v = document.querySelector('video.ts-film'); return !!v && !v.muted; })()")
                seeked = to_end(p)
                check(seeked, f"[{dev}] {theme}: the film loads and plays")
                mp4 = [u for u in reqs if u.split("?")[0].endswith(".mp4") and FILM in u]
                check(bool(mp4) and not any(u.split("?")[0].endswith(".webm") for u in reqs), f"[{dev}] {theme}: an .mp4 film is requested, never .webm ({[u.rsplit('/', 1)[-1] for u in reqs][:2]})")
                check(p.evaluate("!!window.__hold"), f"[{dev}] {theme}: the GPU world holds still under the film")
                try: p.wait_for_function("() => window.%s" % flag, timeout=30000, polling=250); ran = True
                except Exception: ran = False
                check(ran, f"[{dev}] {theme}: after the film, {what} runs")
                check(ends(p), f"[{dev}] {theme}: the opening ends")
                vis = p.evaluate("getComputedStyle(document.getElementById('app') || document.body).visibility")
                check(vis == "visible", f"[{dev}] {theme}: the app is visible after it ({vis})")
                check(not p.evaluate("document.documentElement.classList.contains('ts-filmplay')"), f"[{dev}] {theme}: the world draws again after the opening")
                if heard:
                    snd = p.evaluate("!!(window.TitanGen && TitanGen.isActive && TitanGen.isActive())")
                    check(snd, f"[{dev}] {theme}: the film was heard, so the theme's own sound starts with its opening (no tap)")
                ctx.close()

        phone = ({"width": 390, "height": 844}, True)
        # 3. the setting saved while there was no film
        ctx, p, reqs = open_page(*phone, "kaleido", " if (!localStorage.getItem('titan.opening.v')) localStorage.setItem('titan.opening', 'motion');")
        got = p.evaluate("[TitanOpening.choice(), localStorage.getItem('titan.opening.v')]")
        check(got == ["both", "2"], f"a 'motion' saved in tr267-tr275 reads as film then theme, once ({got})")
        ctx.close()
        ctx, p, reqs = open_page(*phone, "kaleido", " localStorage.setItem('titan.opening', 'motion'); localStorage.setItem('titan.opening.v', '2');")
        got = p.evaluate("TitanOpening.choice()")
        ok = ends(p, 30000)
        check(got == "motion" and ok and not reqs and not p.evaluate("!!window.__vid") and p.evaluate("!!window.__mo"),
              f"'The theme's opening only' chosen now: no film, the theme's opening, the app ({got}, {len(reqs)} film requests)")
        ctx.close()

        # 4. the network rule
        ctx, p, reqs = open_page(*phone, "kaleido", conn="{ downlink: 1.4, effectiveType: '4g', saveData: false, rtt: 50 }")
        p.wait_for_timeout(3000)
        check(bool(reqs) and p.evaluate("!!window.__vid"), f"downlink 1.4 Mbps on 4g still plays the film ({len(reqs)} film requests)")
        ctx.close()
        for name, conn in (("Data Saver", "{ downlink: 50, effectiveType: '4g', saveData: true }"),
                           ("3g", "{ downlink: 1.2, effectiveType: '3g', saveData: false }"),
                           ("2g", "{ downlink: 0.2, effectiveType: '2g', saveData: false }"),
                           ("slow-2g", "{ downlink: 0.05, effectiveType: 'slow-2g', saveData: false }")):
            ctx, p, reqs = open_page(*phone, "kaleido", conn=conn)
            p.wait_for_timeout(2500)
            check(not reqs and not p.evaluate("!!window.__vid") and p.evaluate("!!window.__mo"), f"{name} skips the film and plays the theme's opening ({len(reqs)} film requests)")
            ctx.close()

        # 5. a skip stops the download (throttled to 4 Mbps so the 12+ MB clip is still downloading when we skip)
        SLOW["on"] = True; SENT["film"] = 0
        ctx, p, reqs = open_page(*phone, "kaleido", conn="{ downlink: 10, effectiveType: '4g', saveData: false }")
        t0 = time.time()
        while time.time() - t0 < 10 and SENT["film"] < 200_000: p.wait_for_timeout(200)
        started = SENT["film"]
        p.keyboard.press("Escape")               # any key skips (splash.js); a tap does the same
        p.wait_for_timeout(2500)                 # the zoom-through exit (~1 s) then the video is dropped
        at_skip = SENT["film"]
        p.wait_for_timeout(3000)
        after = SENT["film"]
        src = p.evaluate("(() => { const v = document.querySelector('video.ts-film'); return v ? (v.getAttribute('src') || '') : null; })()")
        check(started >= 200_000, f"the film was downloading before the skip ({started} bytes)")
        check(not src, f"after the skip the video has no source ({src!r})")
        check(after - at_skip < 64_000, f"after the skip no more film bytes arrive ({after - at_skip} bytes in the 3 s after the exit)")
        SLOW["on"] = False; ctx.close()

        # 6. Motion Calm: never the film
        ctx, p, reqs = open_page(*phone, "kaleido", " localStorage.setItem('titan.motion', 'calm');")
        lv = p.evaluate("window.TitanMotion ? TitanMotion.level() : null")
        p.wait_for_timeout(2000)
        check(lv != "calm" or (not reqs and not p.evaluate("!!window.__vid")), f"Motion Calm plays no film (level {lv}, {len(reqs)} film requests)")
        ctx.close()
        # 8. coming back to the open app
        def away(p, mins):
            p.evaluate("window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange'))")
            p.evaluate("sessionStorage.setItem('__skew', String((+sessionStorage.getItem('__skew') || 0) + %d * 60000))" % mins)
            try: p.evaluate("window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange'))")
            except Exception: pass                 # the page may reload during the call
        def state(p): return p.evaluate("[window.__loads, document.documentElement.classList.contains('ts-on'), !!document.querySelector('video.ts-film'), !!document.querySelector('.ts-switch')]")
        for sound in (False, True):
            ctx = b.new_context(viewport=phone[0], is_mobile=True, has_touch=True); p = ctx.new_page()
            p.add_init_script(RETURN); p.goto(base + "#hall"); p.wait_for_timeout(3500)
            if sound: p.evaluate("TitanScene.playTheme('kaleido')"); p.wait_for_timeout(2500)
            away(p, 5); p.wait_for_timeout(1500); s5 = state(p)
            away(p, 25); p.wait_for_timeout(3000); s25 = state(p)
            if not sound:
                check(s5 == [1, False, False, False], f"back to the open Hall after 5 min: nothing plays ({s5})")
                check(s25[0] == 2 and s25[1] and s25[2], f"back after 25 min: the page reloads and the film plays again ({s25})")
            else:
                check(s25[0] == 1 and s25[3] and not s25[2], f"back after 25 min with sound still playing: no reload, the theme's opening over the app ({s25})")
            ctx.close()
        b.close()
    httpd.shutdown()
    print("GRK-P-02 (film, then the theme's opening): " + ("ALL GOOD" if not fails else "%d FAILED" % len(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
