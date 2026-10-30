#!/usr/bin/env python3
"""Capture a theme as it is today, for whoever builds its new world (theme framework, phase D; docs/design/THEME_FRAMEWORK.md).

  python3 tools/rooms/capture_theme.py ID OUT_DIR

Writes OUT_DIR/ID.glsl (every shader the first engine, TitanFX, compiles for the theme: its whole effect, library code included),
OUT_DIR/ID_app.png (the Hall on a phone with the theme) and OUT_DIR/ID_effect.png (the effect alone: the basic room, collection hidden).
Needs playwright + Chromium; runs the app from this repo on a free local port.
"""
import functools, http.server, os, socket, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROMIUM = "/opt/pw-browsers/chromium"
HOOK = """(() => { window.__sh = []; const P = WebGL2RenderingContext.prototype, o = P.shaderSource;
  P.shaderSource = function (sh, src) { try { if (this.canvas && this.canvas.id === 'titan-fx' && window.__sh.indexOf(src) < 0) window.__sh.push(src); } catch (e) {} return o.call(this, sh, src); }; })();"""


def main(argv):
    tid, out = argv[0], argv[1]; os.makedirs(out, exist_ok=True)
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    class S(http.server.ThreadingHTTPServer):
        def handle_error(self, *a): pass
    httpd = S(("127.0.0.1", port), functools.partial(H, directory=ROOT)); threading.Thread(target=httpd.serve_forever, daemon=True).start()
    from playwright.sync_api import sync_playwright
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], **kw)
        p = b.new_page(viewport={"width": 390, "height": 844})
        p.add_init_script(HOOK + "localStorage.setItem('tr_atmo_v1', %r); localStorage.setItem('tr_quality', 'high');" % tid)
        p.goto("http://127.0.0.1:%d/?nosplash#hall" % port); p.wait_for_timeout(9000)
        p.screenshot(path=os.path.join(out, tid + "_app.png"))
        p.evaluate("TitanRoom.open().then((c) => c.el.querySelectorAll('.troom-top,.troom-bar,.troom-hint').forEach((e) => e.style.visibility = 'hidden'))")
        p.wait_for_timeout(2500); p.screenshot(path=os.path.join(out, tid + "_effect.png"))
        srcs = p.evaluate("window.__sh"); playing = p.evaluate("(() => { try { return TitanFX.state().playing; } catch (e) { return null; } })()")
        b.close()
    httpd.shutdown()
    with open(os.path.join(out, tid + ".glsl"), "w", encoding="utf-8") as f:
        f.write("// the first engine's shaders for %s (preset %s), as compiled in the app\n" % (tid, playing))
        for i, x in enumerate(srcs): f.write("// ===== shader %d (%d chars) =====\n%s\n\n" % (i, len(x), x))
    print("%s: %d shaders (%s), %s_app.png, %s_effect.png" % (tid, len(srcs), playing, tid, tid))


if __name__ == "__main__":
    main(sys.argv[1:])
