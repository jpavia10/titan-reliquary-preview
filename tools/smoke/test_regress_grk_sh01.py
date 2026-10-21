#!/usr/bin/env python3
"""Regression test GRK-SH-01 (2026-10-20): UI shells (shells/shell.js) and The Field (shells/field/).
  Classic is the default; the UI choice persists; The Field meets every contract point:
  (1) any coin in a couple of steps  (2) sourced facts + provenance  (3) a way back / home  (4) mute  (5) search.
  A theme with no Field design gets the neutral look (no auto-reskin). Switching back unmounts cleanly. No page errors.
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
        check("Classic is the default UI", p.evaluate("TitanShell.current()") == "classic" and not p.query_selector("#shell-field"))
        check("the UI toggle is in the scene bar and lists each UI with a description",
              p.evaluate("!!document.getElementById('btn-ui') && TitanShell.list().every(s => s.name && s.desc) && TitanShell.list().length >= 2"))
        p.click("#btn-ui"); p.wait_for_timeout(200); p.click('.shell-opt[data-shell="field"]'); p.wait_for_timeout(5000)
        check("choosing The Field mounts it", p.evaluate("TitanShell.current() === 'field' && !!window.__field && __field.state() === 'field'"))
        p.reload(); p.wait_for_timeout(6000)
        check("the choice persists across a reload", p.evaluate("TitanShell.current() === 'field' && !!window.__field"))
        check("a theme with no Field design gets the neutral look", p.evaluate("document.documentElement.dataset.shellTheme === 'neutral' && !document.getElementById('shell-theme')"))
        # (1) reach a coin: one tap in List & search, one tap on the coin
        p.click("#fld-btn-list"); p.wait_for_timeout(200); p.fill("#fld-q", "Switzerland"); p.wait_for_timeout(200)
        n = p.evaluate("document.querySelectorAll('#fld-list button[data-i]').length")
        check("(5) search finds coins", n > 0, n)
        p.click("#fld-list button[data-i]"); p.wait_for_timeout(2600)
        check("(1) a coin opens in two taps", p.evaluate("__field.state()") == "coin")
        # (2) facts with provenance
        st = p.evaluate("({ facts: document.querySelectorAll('#fld-sheet .facts dt').length, lvl: document.querySelectorAll('#fld-sheet .lvl').length, hold: !!document.getElementById('fld-btn-hold') })")
        check("(2) the sheet shows sourced facts with their provenance", st["facts"] > 0 and st["lvl"] > 0 and st["hold"], st)
        p.click("#fld-btn-hold"); p.wait_for_timeout(2500)
        check("(2) Hold it opens the full coin page above The Field", p.evaluate("!document.getElementById('drawer').hidden && !!document.getElementById('shell-field')"))
        p.keyboard.press("Escape"); p.wait_for_timeout(800)
        check("closing the coin page returns to The Field", p.evaluate("document.getElementById('drawer').hidden && __field.state() === 'coin'"))
        # (3) back
        p.click("#fld-btn-back3"); p.wait_for_timeout(1500)
        check("(3) Back returns to the whole table", p.evaluate("__field.state()") == "field")
        # (4) mute
        m0 = p.evaluate("TitanShell.svc.isMuted()"); p.click("#fld-mute"); p.wait_for_timeout(200)
        check("(4) the mute control toggles sound", p.evaluate("TitanShell.svc.isMuted()") != m0)
        p.click("#fld-mute")
        # filters
        p.evaluate("__field.applyFilter('photo')"); p.wait_for_timeout(900)
        check("the To photograph filter says how many still need a photo", "still need a phone photo" in p.inner_text("#fld-fnote"))
        p.evaluate("__field.applyFilter('all')"); p.wait_for_timeout(800)
        # home: back to Classic
        p.click("#fld-ui"); p.wait_for_timeout(200); p.click('.shell-opt[data-shell="classic"]'); p.wait_for_timeout(800)
        check("(3) the UI switch goes home to Classic and unmounts The Field", p.evaluate("TitanShell.current() === 'classic' && !document.getElementById('shell-field') && !window.__field"))
        check("Classic's bars are back", p.evaluate("getComputedStyle(document.getElementById('scene-bar')).display !== 'none'"))
        check("no page errors", not errs, errs[:3])
        b.close()
    print("ALL PASS" if not fails else f"{len(fails)} FAILED"); sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
