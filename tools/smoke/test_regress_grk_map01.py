"""Map view (Study > World Atlas): the scene bar buttons never overlap on a phone, the atlas header badges wrap,
and the country dossier uses coin cutouts where one passed its check. Serves the repo locally."""
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
    b = p.chromium.launch(); errs = []
    for vw in (360, 412, 1600):
        pg = b.new_page(viewport={"width": vw, "height": 900}); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(U + "#study"); pg.wait_for_timeout(2500)
        ov = pg.evaluate("()=>{const bs=[...document.querySelectorAll('#scene-bar > *')].filter(e=>e.offsetWidth).map(e=>e.getBoundingClientRect());let o=0;for(let i=1;i<bs.length;i++)if(bs[i].left<bs[i-1].right-1)o++;return o}")
        ok(ov == 0, "%dpx: scene bar buttons do not overlap (%d)" % (vw, ov))
        ok(pg.evaluate("()=>{const w=document.querySelector('#titan-world-atlas-wrap .atlas-badges');return !!w&&w.scrollWidth<=w.clientWidth+1}"), "%dpx: atlas header badges fit" % vw)
        pg.evaluate("()=>TitanAtlas.selectCountry('MX',true)"); pg.wait_for_timeout(800)
        ok(pg.evaluate("()=>document.querySelectorAll('.atlas-dossier-coin-thumb.is-cutout').length>0"), "%dpx: dossier shows coin cutouts" % vw)
        pg.close()
    ok(not errs, "no page errors " + str(errs[:2]))
    b.close()
print("MAP: %s" % ("ALL GOOD" if not bad else "%d FAILED" % bad)); sys.exit(1 if bad else 0)
