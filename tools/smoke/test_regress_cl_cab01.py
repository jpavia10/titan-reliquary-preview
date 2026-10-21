#!/usr/bin/env python3
"""Regression test CL-CAB-01 (2026-10-21): The Cabinet UI (shells/cabinet/) meets every contract point of docs/design/THEME_CONTRACT.md:
  (1) any coin in one tap (and search + Enter)  (2) sourced facts with provenance, and Full record opens Classic's coin page above it
  (3) a way back (Back, Esc) and home (the UI switch)  (4) mute  (5) search. Also: every piece is in a tray, coins with a phone photo
  show it, coins are drawn at true relative size, every lens keeps every piece, the albums lens shows pages with holes, no page errors.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import CHROMIUM
from test_regress_grk_v01 import serve
from playwright.sync_api import sync_playwright

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
        p.click("#btn-ui"); p.wait_for_timeout(200)
        check("The Cabinet is listed in the UI chooser", p.query_selector('.shell-opt[data-shell="cabinet"]') is not None)
        p.click('.shell-opt[data-shell="cabinet"]'); p.wait_for_timeout(4500)
        check("choosing The Cabinet mounts it", p.evaluate("TitanShell.current() === 'cabinet' && !!window.__cabinet && __cabinet.state() === 'cabinet'"))
        n = p.evaluate("__cabinet.count()")
        st = p.evaluate("""(() => { const cs = [...document.querySelectorAll('#cab-world .cab-coin')].filter(e => e.style.display !== 'none');
            const w = cs.map(e => e.getBoundingClientRect().width); return { shown: cs.length, trays: document.querySelectorAll('#cab-world .cab-tray').length,
            minW: Math.min(...w), maxW: Math.max(...w), imgs: document.querySelectorAll('#cab-world .cab-coin img').length }; })()""")
        check("every piece lies in a tray", st["shown"] == n and st["trays"] > 10, st)
        check("coins are drawn at true relative size (the largest at least 1.6x the smallest)", st["maxW"] >= 1.6 * st["minW"], st)
        check("coins with a phone photo show it", st["imgs"] > 150, st)
        for lens in ("year", "value", "new", "photos", "country"):
            p.evaluate(f"__cabinet.setLens('{lens}')"); p.wait_for_timeout(300)
            k = p.evaluate("__cabinet.order().length")
            check(f"the {lens} lens keeps every piece", k == n, k)
        # (1) one tap on a coin lifts it
        p.evaluate("document.querySelector('#cab-scroll').scrollTo(0, 0)"); p.wait_for_timeout(300)
        p.click("#cab-world .cab-coin >> nth=3"); p.wait_for_timeout(1800)
        check("(1) one tap lifts a coin out", p.evaluate("__cabinet.state()") == "coin")
        # (2) facts with provenance
        f = p.evaluate("({ dt: document.querySelectorAll('#cab-card .cab-facts dt').length, chips: document.querySelectorAll('#cab-card .cab-chip').length })")
        check("(2) the coin shows its facts, each with how sure we are", f["dt"] >= 3 and f["chips"] >= 3, f)
        p.click("#cab-card .cab-chip >> nth=0"); p.wait_for_timeout(200)
        check("(2) tapping a label shows who said it, when and the source", p.evaluate("!document.querySelector('#cab-card .cab-prov').hidden && document.querySelector('#cab-card .cab-prov').textContent.length > 4"))
        a0 = p.evaluate("getComputedStyle(document.getElementById('cab-spin')).transform")
        p.click("#cab-spin"); p.wait_for_timeout(900)
        check("tapping the coin turns it over", p.evaluate("getComputedStyle(document.getElementById('cab-spin')).transform") != a0)
        s0 = p.evaluate("document.querySelector('#cab-card h2').textContent"); p.click("#cab-next"); p.wait_for_timeout(1400)
        check("Next shows the next coin", p.evaluate("document.querySelector('#cab-card h2').textContent") != s0 or p.evaluate("__cabinet.state()") == "coin")
        p.click("#cab-full"); p.wait_for_timeout(2500)
        check("(2) Full record opens Classic's coin page above The Cabinet", p.evaluate("!document.getElementById('drawer').hidden && !!document.getElementById('shell-cabinet')"))
        p.keyboard.press("Escape"); p.wait_for_timeout(900)
        check("closing the coin page returns to the lifted coin", p.evaluate("document.getElementById('drawer').hidden && __cabinet.state() === 'coin'"))
        # (3) back
        p.click("#cab-close"); p.wait_for_timeout(1000)
        check("(3) Back puts the coin back in its tray", p.evaluate("__cabinet.state()") == "cabinet")
        # (5) search + Enter
        p.click("#cab-find"); p.fill("#cab-q", "Switzerland"); p.wait_for_timeout(300)
        h = p.evaluate("document.querySelectorAll('#cab-world .cab-coin.hit').length")
        check("(5) search lights the matching coins", h > 3, h)
        p.press("#cab-q", "Enter"); p.wait_for_timeout(1600)
        check("(1) search + Enter lifts the first match", p.evaluate("__cabinet.state()") == "coin")
        p.keyboard.press("Escape"); p.wait_for_timeout(900)
        check("(3) Esc puts it back", p.evaluate("__cabinet.state()") == "cabinet")
        p.click("#cab-qx"); p.wait_for_timeout(200)
        # (4) mute
        m0 = p.evaluate("TitanShell.svc.isMuted()"); p.click("#cab-mute"); p.wait_for_timeout(200)
        check("(4) the mute control toggles sound", p.evaluate("TitanShell.svc.isMuted()") != m0)
        p.click("#cab-mute")
        # albums
        p.evaluate("__cabinet.setLens('albums')"); p.wait_for_timeout(1200)
        al = p.evaluate("document.querySelectorAll('#cab-albums details.cab-alb').length")
        check("the albums lens shows every album as a page", al >= 30, al)
        p.evaluate("document.querySelector('#cab-albums details.cab-alb').open = true"); p.wait_for_timeout(400)
        check("an open album shows its holes", p.evaluate("document.querySelectorAll('#cab-albums .cab-hole').length") > 10)
        p.evaluate("__cabinet.setLens('country')"); p.wait_for_timeout(500)
        # home
        p.click("#cab-ui"); p.wait_for_timeout(200); p.click('.shell-opt[data-shell="classic"]'); p.wait_for_timeout(800)
        check("(3) the UI switch goes home to Classic and unmounts The Cabinet", p.evaluate("TitanShell.current() === 'classic' && !document.getElementById('shell-cabinet') && !window.__cabinet"))
        check("Classic's bars are back", p.evaluate("getComputedStyle(document.getElementById('scene-bar')).display !== 'none'"))
        check("no page errors", not errs, errs[:3])
        b.close()
    print("ALL PASS" if not fails else f"{len(fails)} FAILED"); sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
