#!/usr/bin/env python3
"""Regression test GRK-M-04 (2026-10-20): every theme has sound.

Joseph: Dynasty had NO sound. Cause: a first tap inside the Scene studio never starts sound, and following the theme only worked
once something was already playing, so opening the studio first and picking a theme stayed silent. This pins:
  1. every theme in wings/themes/manifest.js maps to a scene that exists and has REAL RECORDED music (its own songs or recorded
     classical; owner 2026-10-21: "I dont want computer generated music!!!!"), and no music generator is loaded
  2. every theme has its own interface voice, and the tap / theme / coin-open / coin-close sounds exist
  3. a fresh visit whose first tap is inside the studio, then picks Dynasty, is playing Dynasty's scene
  python3 tools/smoke/test_regress_grk_m04.py      Exit code 0 = all pass.
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

MAP = """() => { const G = TitanGen, W = TitanWorlds.worlds, ws = typeof W === "function" ? W() : W, voices = TitanUISounds.voices(), bad = [];
  for (const w of ws) { let id = w.scene; if (G.ALIASES && G.ALIASES[id]) id = G.ALIASES[id]; const s = G.SCENES[id];
    if (!s) { bad.push(w.id + ": no scene " + w.scene); continue; }
    if (!s.score && !s.rec) bad.push(w.id + ": scene " + id + " has no recorded music");
    if (voices.indexOf(w.id) < 0) bad.push(w.id + ": no interface voice"); }
  const k = TitanUISounds.kinds(); for (const n of ["tap", "theme", "coin-open", "coin-close"]) if (k.indexOf(n) < 0) bad.push("missing sound " + n);
  if (typeof window.TitanMusic !== "undefined") bad.push("the generated-music engine (TitanMusic) is loaded");
  return { n: ws.length, bad }; }"""

def main():
    base = serve(); fails = []
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + (" " + str(info) if info and not ok else ""))
        if not ok: fails.append(name)
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"], **({"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}))
        p = b.new_page(viewport={"width": 390, "height": 844})
        p.add_init_script("try { localStorage.setItem('tr_atmo_v1', 'afterhours'); } catch (e) {}")
        p.goto(base + "?nosplash#hall"); p.wait_for_timeout(2500)
        r = p.evaluate(MAP)
        check("all %d themes have a scene, real recorded music and their own interface voice" % r["n"], r["n"] >= 30 and not r["bad"], r["bad"])
        p.evaluate("TitanScene.open('themes')"); p.wait_for_timeout(500)
        p.locator("#scene-sheet").click(position={"x": 5, "y": 300}, force=True); p.wait_for_timeout(300)
        p.evaluate("TitanSetAtmo('dynasty')"); p.wait_for_timeout(2500)
        st = p.evaluate("({ active: TitanGen.isActive(), scene: TitanScene.state().scene })")
        check("picking Dynasty in the studio after a tap plays Dynasty's scene", st["active"] and st["scene"] == "imperial", st)
        b.close()
    sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
