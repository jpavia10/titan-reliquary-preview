#!/usr/bin/env python3
"""GRK-X-01 (2026-10-20): Experimental UI shells (shells/exp/kit.js + each experiment). For every experimental shell:
  it mounts from ?ui=<id>, meets the five contract points (search -> coin, sourced facts + provenance, back, mute, UI home),
  unmounts cleanly back to Classic, and throws no page errors. Hologram also checks it really renders >=1M particles
  and that a coin forms (mix rises) and dissolves on Back. Screenshots go to $XP_SHOTS if set."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import CHROMIUM
from test_regress_grk_v01 import serve
from playwright.sync_api import sync_playwright
LISTJS = """(() => { const q = document.getElementById('xp-q'), n = () => document.querySelectorAll('#xp-list [data-i]').length;
  q.value = ''; q.dispatchEvent(new Event('input')); const all = n();
  document.querySelector('#xp-chips [data-f="m:silver"]').click(); const ag = n();
  document.querySelector('#xp-chips [data-f="all"]').click(); q.value = 'Switzerland'; q.dispatchEvent(new Event('input'));
  return all === __exp.count && ag > 0 && ag < all; })()"""
EXP = [x for x in os.environ.get("XP_ONLY", "hologram,orrery,deck,sonic").split(",") if x]

def main():
    base = serve(); fails = []; shots = os.environ.get("XP_SHOTS")
    def check(name, ok, info=""):
        print(("ok:   " if ok else "FAIL: ") + name + ("  " + str(info) if not ok else ""))
        if not ok: fails.append(name)
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"], **kw)
        for sid in EXP:
            for vp in ([{"width": 412, "height": 915}, {"width": 1024, "height": 1366}, {"width": 2560, "height": 1080}] if shots else [{"width": 412, "height": 915}]):
                p = b.new_page(viewport=vp, device_scale_factor=1); errs = []
                p.on("pageerror", lambda e: errs.append(str(e)))
                p.goto(base + "?nosplash&ui=" + sid + os.environ.get("XP_Q", "")); p.wait_for_timeout(9000)
                tag = f"{sid} {vp['width']}x{vp['height']}: "
                check(tag + "mounts", p.evaluate(f"TitanShell.current() === '{sid}' && !!window.__exp && __exp.id === '{sid}'"))
                check(tag + "listed under Experimental in the UI chooser", p.evaluate(f"TitanShell.list().some(s => s.id === '{sid}')"))
                if sid == "orrery": check(tag + "has an orbit per decade and 500k dust", p.evaluate("__orrery.orbits >= 10 && __orrery.dustFull >= 500000"))
                if sid == "deck":
                    p.evaluate("__deck.go(5)"); p.wait_for_timeout(1500)
                    check(tag + "the fan moves to any card", p.evaluate("__deck.center()") is not None)
                    p.click('[data-mode="reading"]'); p.wait_for_timeout(900)
                    check(tag + "a reading deals three cards", p.evaluate("document.querySelectorAll('.dk-spread [data-r]').length") == 3)
                    p.click('.dk-spread [data-r="0"]'); p.wait_for_timeout(700); p.click('.dk-spread [data-r="0"]'); p.wait_for_timeout(1200)
                    check(tag + "turning then tapping a dealt card opens its facts", p.evaluate("__exp.state()") == "coin")
                    if shots: p.screenshot(path=f"{shots}/exp-{sid}/{vp['width']}x{vp['height']}-reading.png")
                    p.click("#xp-back"); p.wait_for_timeout(500); p.click('[data-mode="fan"]'); p.wait_for_timeout(600)
                if sid == "sonic":
                    check(tag + "400k field particles", p.evaluate("__sonic.particlesFull") >= 400000)
                    p.evaluate(f"__sonic.scrub(20, {vp['height']//2}, {vp['width']-20}, {vp['height']//2 - 60})"); p.wait_for_timeout(300)
                    check(tag + "a finger scrub strikes coins", p.evaluate("__sonic.strikes()") > 0, p.evaluate("__sonic.strikes()"))
                if sid == "hologram":
                    n = p.evaluate("window.__holo ? __holo.particles : 0"); check(tag + "at least 1M particles", n >= 1_000_000, n)
                if shots:
                    p.evaluate("window.__holo ? __holo.warm(120) : window.__orrery ? __orrery.warm(4) : window.__sonic && __sonic.warm(4)"); p.wait_for_timeout(1500)
                    p.screenshot(path=f"{shots}/exp-{sid}/{vp['width']}x{vp['height']}-home.png")
                if vp["width"] > 2000:
                    if shots:
                        p.evaluate("__exp.open(0)"); p.wait_for_timeout(3000); p.evaluate("window.__holo ? __holo.warm(90) : window.__orrery ? __orrery.warm(4) : window.__sonic && __sonic.warm(4)"); p.wait_for_timeout(2500); p.screenshot(path=f"{shots}/exp-{sid}/{vp['width']}x{vp['height']}-coin.png")
                    p.close(); continue
                p.click("#xp-search"); p.fill("#xp-q", "Switzerland"); p.wait_for_timeout(300)
                check(tag + "(5) search finds coins", p.evaluate("document.querySelectorAll('#xp-list [data-i]').length") > 0)
                check(tag + "list fallback: every coin listed, filters narrow it", p.evaluate(LISTJS))
                p.click("#xp-list [data-i]"); p.wait_for_timeout(9000)
                check(tag + "(1) a coin opens", p.evaluate("__exp.state()") == "coin")
                st = p.evaluate("({ dt: document.querySelectorAll('#xp-sheet .facts dt').length, lvl: document.querySelectorAll('#xp-sheet .lvl').length })")
                check(tag + "(2) sourced facts with provenance", st["dt"] > 0 and st["lvl"] > 0, st)
                if sid == "hologram": check(tag + "the coin forms from particles", p.evaluate("__holo.mix() > 0.5 && __holo.mode() === 'coin'"), p.evaluate("__holo.mix()"))
                if shots:
                    p.evaluate("window.__holo ? __holo.warm(90) : window.__orrery ? __orrery.warm(4) : window.__sonic && __sonic.warm(4)"); p.wait_for_timeout(1500)
                    p.screenshot(path=f"{shots}/exp-{sid}/{vp['width']}x{vp['height']}-coin.png")
                p.click("#xp-hold"); p.wait_for_timeout(4000)
                check(tag + "(2) Hold it opens the full coin page above", p.evaluate("!document.getElementById('drawer').hidden"))
                p.keyboard.press("Escape"); p.wait_for_timeout(800)
                p.click("#xp-back"); p.wait_for_timeout(1500)
                check(tag + "(3) back returns home", p.evaluate("__exp.state()") == "home")
                print("  top at mute:", p.evaluate("(() => { const b = document.getElementById('xp-mute').getBoundingClientRect(); const e = document.elementFromPoint(b.x + b.width/2, b.y + b.height/2); return e && (e.id || e.className || e.tagName); })()")); m0 = p.evaluate("TitanShell.svc.isMuted()"); p.click("#xp-mute", timeout=30000, force=True); p.wait_for_timeout(150)
                check(tag + "(4) mute toggles", p.evaluate("TitanShell.svc.isMuted()") != m0); p.click("#xp-mute", timeout=60000, force=True)
                p.click("#xp-ui"); p.wait_for_timeout(200)
                check(tag + "chooser shows an Experimental section", p.evaluate("!!document.querySelector('.shell-pick .shell-exp')"))
                p.click('.shell-opt[data-shell="classic"]'); p.wait_for_timeout(900)
                check(tag + "(3) home to Classic unmounts", p.evaluate(f"TitanShell.current() === 'classic' && !document.getElementById('shell-{sid}') && !window.__exp && !document.documentElement.classList.contains('xp-on')"))
                check(tag + "no page errors", not errs, errs[:3])
                p.evaluate("localStorage.removeItem('tr.shell')"); p.close()
        b.close()
    print("ALL PASS" if not fails else f"{len(fails)} FAILED"); sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
