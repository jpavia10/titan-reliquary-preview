#!/usr/bin/env python3
"""Check a world-contract conversion before it replaces fx/<id>.js (theme framework, phase B; docs/design/THEME_FRAMEWORK.md).

  python3 tools/rooms/check_conversion.py ID NEW_FILE [--install] [--new]
  (a world written on the stage library, fx/stage.js, is checked together with the library, which carries its view, look and debug)

1. the new file parses (node --check) and has the contract's markers: the look guard, `c.view || {}`, a `room: { name:` block with
   yaw/pitch/move/up, look, touch, opening, and debug cam/look
2. the backdrop is unchanged: the app's kit + post + the world, Motion Off (one still frame), phone and desktop, old file vs new file,
   measured against the new file's own run-to-run difference (a moving scene never gives the same frame twice)
3. a camera move and a look change at the room limits reach the world (its debug)
--new: a world for a theme that had none (phase D): no old backdrop to match, so 2 becomes "draws a picture" (not black, not flat) and
the frame rate at Low on this machine's software GL is reported (a floor of 1 frame a second catches a runaway shader).
--install copies NEW_FILE over fx/<id>.js when every check passes. Exit 0 = all pass. Needs playwright + pillow.
"""
import functools, http.server, io, os, re, shutil, socket, subprocess, sys, tempfile, threading

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROMIUM = "/opt/pw-browsers/chromium"
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


def serve(directory):
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    class S(http.server.ThreadingHTTPServer):
        def handle_error(self, *a): pass
    httpd = S(("127.0.0.1", port), functools.partial(H, directory=directory))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d/" % port, httpd


def page(tid, script_url, motion):
    return ('<!doctype html><html data-atmo="%s"%s><head><meta name=viewport content="width=device-width,initial-scale=1"></head>'
            '<body style="margin:0;background:#000"><script src="wings/quality.js"></script><script>window.__W=%r</script><script src="fx/kit.js"></script><script src="fx/post.js"></script>'
            '<script src="fx/atmos.js"></script><script src="fx/particles-gpu.js"></script>'
            '<script>(function(){var o=TitanFXK.lazy[%r];TitanFXK.lazy[%r]=Array.isArray(o)?o.slice(0,-1).concat([window.__W]):window.__W;})();</script></body></html>') % (
        tid, ' data-motion="off"' if motion == "off" else "", script_url, tid, tid)


def shots(base, tid, script_url, b):
    html = page(tid, script_url, "off"); out = {}
    for name, vp in (("phone", {"width": 390, "height": 844}), ("desk", {"width": 1280, "height": 800})):
        p = b.new_page(viewport=vp); errs = []
        p.on("pageerror", lambda e: errs.append(str(e))); p.on("console", lambda m: errs.append(m.text) if "[fxk]" in m.text else None)
        p.route(re.compile(r".*/__harness\.html.*"), lambda route, req=None: route.fulfill(status=200, content_type="text/html", body=html))
        p.add_init_script("localStorage.setItem('tr_quality','high')")
        p.goto(base + "__harness.html", wait_until="load"); p.wait_for_timeout(6000)
        out[name] = (p.screenshot(timeout=120000), p.evaluate("() => TitanFXK.debug()"), errs)
        p.close()
    return out


def stats(a):
    from PIL import Image, ImageStat
    s = ImageStat.Stat(Image.open(io.BytesIO(a)).convert("L")); return s.mean[0], s.stddev[0]


def diff(a, b):
    from PIL import Image, ImageChops, ImageStat
    x = Image.open(io.BytesIO(a)).convert("RGB"); y = Image.open(io.BytesIO(b)).convert("RGB")
    return sum(ImageStat.Stat(ImageChops.difference(x, y)).mean) / 3


def main(argv):
    tid, new = argv[0], argv[1]; fails = []
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + ("  " + str(info)[:300] if info and not ok else ""), flush=True)
        if not ok: fails.append(name)
    src = open(new, encoding="utf-8").read()
    r = subprocess.run(["node", "--check", new], capture_output=True, text=True)
    check("parses", r.returncode == 0, r.stderr[-300:])
    if "K.stage(" in src:   # a world on the stage library (fx/stage.js): the view, look and debug parts of the contract live there
        src = src + "\n" + open(os.path.join(ROOT, "fx", "stage.js"), encoding="utf-8").read().replace("var look = K.look || function (i, d)", "var look = K.look || function")
    check("look guard", "var look = K.look || function" in src)
    check("reads c.view with a guard", "c.view || {}" in src)
    room = src.split("room:", 1)[1] if re.search(r"\broom:\s*\{\s*name:", src) else ""
    check("room block with limits, look, touch, opening", all(k in room for k in ("yaw:", "pitch:", "move:", "up:", "look:", "touch:", "opening:")))
    dbg = src.split("debug:", 1)[-1][:1500] if "debug:" in src else ""
    check("debug reports cam and look", "cam:" in dbg and "look:" in dbg)
    if fails: print("%s: %d FAILED" % (tid, len(fails))); return 1
    tmp = tempfile.mkdtemp(prefix="conv_")
    try:
        shutil.copy(new, os.path.join(ROOT, "fx", "__new_" + tid + ".js"))
        base, httpd = serve(ROOT)
        from playwright.sync_api import sync_playwright
        kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=GL, **kw)
            new_world = "--new" in argv
            old = None if new_world else shots(base, tid, "fx/%s.js" % tid, b)
            n1 = shots(base, tid, "fx/__new_%s.js" % tid, b); n2 = None if new_world else shots(base, tid, "fx/__new_%s.js" % tid, b)
            for v in ("phone", "desk"):
                check(v + ": the new world boots with no shader or page errors", n1[v][1].get("id") == tid and not n1[v][2], n1[v][2][:2])
                if new_world:
                    mean, sd = stats(n1[v][0])
                    check(v + ": draws a picture (not black, not flat)", mean > 6 and sd > 5, {"mean": round(mean, 1), "stddev": round(sd, 1)})
                    continue
                d_old, d_run = diff(old[v][0], n1[v][0]), diff(n1[v][0], n2[v][0])
                check(v + ": backdrop unchanged (old vs new within 1.6x run-to-run + 1.5)", d_old <= d_run * 1.6 + 1.5, {"old_vs_new": round(d_old, 2), "run_to_run": round(d_run, 2)})
            p = b.new_page(viewport={"width": 390, "height": 844}); html = page(tid, "fx/__new_%s.js" % tid, "full")
            p.route(re.compile(r".*/__room\.html.*"), lambda route, req=None: route.fulfill(status=200, content_type="text/html", body=html))
            p.add_init_script("localStorage.setItem('tr_quality','low')")
            p.goto(base + "__room.html"); p.wait_for_function("() => TitanFXK.frames > 2", timeout=60000)
            f0, t0 = p.evaluate("TitanFXK.frames"), p.evaluate("performance.now()"); p.wait_for_timeout(5000)
            fps = (p.evaluate("TitanFXK.frames") - f0) / ((p.evaluate("performance.now()") - t0) / 1000)
            print("info: %.1f frames a second at Low on this machine's software GL" % fps, flush=True)
            if "--new" in argv: check("at least 1 frame a second at Low (software GL)", fps >= 1, round(fps, 2))
            c0 = p.evaluate("() => (TitanFXK.debug().worlds || [])[0]")
            p.evaluate("(id) => { const R = TitanFXK.room(id); const L = {}; (R.look || []).forEach((c) => { L[c.id] = c.max; }); TitanFXK.setView({ mode: 'room', yaw: R.yaw[1], pitch: R.pitch[1], move: R.move[1], up: R.up[1], look: L }); }", tid)
            f0 = p.evaluate("TitanFXK.frames"); p.wait_for_function("(f) => TitanFXK.frames > f + 2", arg=f0, timeout=60000)
            c1 = p.evaluate("() => (TitanFXK.debug().worlds || [])[0]")
            check("a camera move reaches the world", bool(c0 and c1 and c0.get("cam") != c1.get("cam")), [c0, c1])
            check("a look change reaches the world", bool(c1 and c1.get("look") and c1["look"] != (c0 or {}).get("look")), [c0, c1])
            p.close(); b.close()
        httpd.shutdown()
    finally:
        try: os.remove(os.path.join(ROOT, "fx", "__new_" + tid + ".js"))
        except OSError: pass
        shutil.rmtree(tmp, ignore_errors=True)
    if not fails and "--install" in argv:
        t = src if src.endswith("\n") else src + "\n"
        open(os.path.join(ROOT, "fx", tid + ".js"), "w", encoding="utf-8").write(t); print("installed fx/%s.js" % tid)
    print(("%s: ALL GOOD" % tid) if not fails else "%s: %d FAILED" % (tid, len(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
