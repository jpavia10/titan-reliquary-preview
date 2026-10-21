#!/usr/bin/env python3
"""Regression test GRK-R-01 (2026-10-20): photo-derived relief (wings/relief.js) on the 3D coin.
  1. TitanRelief.derive turns a photo into normal/roughness/height maps, the same result every time
  2. a flat grey image gives flat normals (no invented relief)
  3. a coin page with photos puts relief on its faces
  4. no page errors
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import CHROMIUM
from test_regress_grk_v01 import serve
from playwright.sync_api import sync_playwright

JS = """() => { const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d');
  x.fillStyle = '#777'; x.fillRect(0,0,200,200); x.fillStyle = '#ddd'; x.font = 'bold 90px serif'; x.fillText('E', 60, 140);
  const sum = (cv) => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let s = 0, v = 0; for (let i = 0; i < d.length; i += 4) { s += d[i] * (i % 997); v += Math.abs(d[i] - 128); } return [s, v / (d.length / 4)]; };
  const a = TitanRelief.derive(c, {size: 128}), b = TitanRelief.derive(c, {size: 128});
  const f = document.createElement('canvas'); f.width = f.height = 200; const fx = f.getContext('2d'); fx.fillStyle = '#777'; fx.fillRect(0,0,200,200);
  const g = TitanRelief.derive(f, {size: 128});
  return { same: sum(a.normal)[0] === sum(b.normal)[0], slope: sum(a.normal)[1], flat: sum(g.normal)[1] }; }"""

def main():
    base = serve(); fails = []
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + ("  " + str(info) if not ok else ""))
        if not ok: fails.append(name)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"], **kw)
        p = b.new_page(viewport={"width": 390, "height": 844}); errs = []
        p.on("pageerror", lambda e: errs.append(str(e)))
        p.goto(base + "?nosplash"); p.wait_for_timeout(2500)
        r = p.evaluate(JS)
        check("relief is deterministic", r["same"], r)
        check("a struck design gives sloped normals", r["slope"] > 2, r)
        check("a blank photo gives flat normals", r["flat"] < 1.5, r)
        p.goto(base + "?nosplash#coin=C001"); p.wait_for_timeout(6000)
        st = p.evaluate("TitanCoin3D.state()")
        photos = p.evaluate("document.querySelectorAll('#drawer-body .gxd-faces img').length")
        check("a coin with photos gets relief on its faces", photos == 0 or (st and st["relief"] >= 1), {"st": st, "photos": photos})
        check("no page errors", not errs, errs[:3])
        b.close()
    print("ALL PASS" if not fails else f"{len(fails)} FAILED"); sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
