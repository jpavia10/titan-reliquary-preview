"""Graphics quality setting (wings/quality.js): Lite users migrate to Low, a saved choice wins, Auto is fixed per device,
the panel opens from the URL, the scene bar and the UI picker, and closes with Escape. Serves the repo locally."""
import functools, http.server, socketserver, sys, threading, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=ROOT)
srv = socketserver.TCPServer(("127.0.0.1", 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:%d/?nosplash" % srv.server_address[1]; bad = 0
def ok(c, m):
    global bad; print(("ok:   " if c else "FAIL: ") + m); bad += (not c)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(U); pg.evaluate("()=>{localStorage.clear();localStorage.setItem('tr_lite_v1','1')}"); pg.goto(U); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>TitanQuality.tier()==='low'&&TitanQuality.choice==='low'&&TitanLite===true&&document.documentElement.classList.contains('tr-lite')"), "an old Lite user is migrated to Low")
    pg.evaluate("()=>localStorage.setItem('tr_quality_v1','ultra')"); pg.goto(U); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>TitanQuality.tier()==='ultra'&&TitanLite===false&&localStorage.getItem('tr_lite_v1')==='0'"), "a saved choice wins and clears Lite")
    ok(pg.evaluate("()=>['low','medium','high','ultra','max'].every(k=>['particles','simRes','dpr','renderScale','bloom','post','volSteps','shadow','aa','fx','fps'].every(n=>typeof TitanQuality.TIERS[k][n]==='number'))"), "every tier sets every shared knob")
    ok(pg.evaluate("()=>typeof TitanQuality.tier==='function'&&String(TitanQuality.tier)===TitanQuality.tier()&&localStorage.getItem('tr_quality')===TitanQuality.tier()"), "tier() is callable and mirrored to tr_quality")
    ok(pg.evaluate("()=>TitanQuality.ORDER.every((k,i,a)=>!i||TitanQuality.TIERS[k].particles>TitanQuality.TIERS[a[i-1]].particles)"), "tiers scale up in order")
    pg.evaluate("()=>localStorage.setItem('tr_quality_v1','low')"); pg.goto(U + "&graphics"); pg.wait_for_timeout(1500)
    ok(pg.evaluate("()=>!!document.querySelector('.tq[role=dialog] canvas.tq-pv')&&/\\d|--/.test(document.querySelector('.tq-fps b').textContent)"), "?graphics opens the panel with a live preview and FPS readout")
    pg.keyboard.press("Escape"); ok(pg.evaluate("()=>!document.querySelector('.tq')"), "Escape closes it")
    pg.evaluate("()=>document.getElementById('btn-gfx').click()"); ok(pg.evaluate("()=>!!document.querySelector('.tq')"), "the scene-bar Graphics button opens it"); pg.keyboard.press("Escape")
    pg.evaluate("()=>document.getElementById('btn-ui').click()"); pg.evaluate("()=>document.querySelector('[data-gfx]').click()"); ok(pg.evaluate("()=>!!document.querySelector('.tq')"), "the UI picker opens it (reachable from every UI)"); pg.keyboard.press("Escape")
    ok(pg.evaluate("()=>typeof TitanShell.svc.quality==='function'"), "shells get svc.quality()")
    ok(not errs, "no page errors " + str(errs[:2]))
    b.close()
print("QUALITY: %s" % ("ALL GOOD" if not bad else "%d FAILED" % bad)); sys.exit(1 if bad else 0)
