#!/usr/bin/env python3
"""Regression test CL-WORLD-01 (2026-10-29): the world contract every theme is built on (docs/design/THEME_FRAMEWORK.md, section 3).

One GPU world (fx/kit.js TitanFXK) runs as the backdrop, the opening and the theme's room. In the real app, phone and desktop:
  1. every GPU world boots as the backdrop through the real lazy path (phone: all of them; desktop: the three reference worlds), with no
     page or shader errors, mode "backdrop" and the default view
  2. the contract: three modes; setView ignores an unknown mode and numbers that are not finite, clamps the camera and every look control
     to the world's room limits, drops unknown look ids; resetView gives the backdrop view back
  3. for every world with a room: a camera move and a look change reach the world (its debug), and resetView puts its camera back
  4. six theme switches leave one world canvas and at most one animation loop (no piling up)
  5. the room in the app: Step inside opens it over the live world (the app hidden), Escape closes it and the view is the backdrop again;
     a theme without a GPU world gets the basic room
  6. the launch opening on the engine (?splash=1): the splash goes transparent over the running world, the view runs in mode "opening",
     then the app appears over the same world in mode "backdrop" (one canvas)
  7. every theme in wings/room.js OPENINGS has an opening path in its room data
  8. the tier the worlds get is TitanQuality's (Low, Medium, High, Ultra, Max: ?q=)
  9. Motion Off: one still frame, no loop; a view change draws one new frame
  python3 tools/smoke/test_regress_cl_world_contract.py [--shots DIR] [--only phone|desktop]      Exit code 0 = all pass.
"""
import functools, http.server, os, re, socket, sys, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, CHROMIUM
from playwright.sync_api import sync_playwright

REF = ["supercell", "tourbillon", "silverscreen"]
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


def serve():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    class S(http.server.ThreadingHTTPServer):
        def handle_error(self, *a): pass            # a page closed mid-transfer (broken pipe) is not a test failure
    httpd = S(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/"


fails = []
def check(ok, msg):
    print(("ok:   " if ok else "FAIL: ") + msg, flush=True)
    if not ok: fails.append(msg)


def gpu_worlds():
    src = open(os.path.join(ROOT, "fx", "kit.js"), encoding="utf-8").read()
    m = re.search(r"K\.lazy = K\.lazy \|\| \{(.*?)\};", src, re.S)
    return re.findall(r"([a-z0-9]+):", m.group(1)) if m else []


def openings():
    src = open(os.path.join(ROOT, "wings", "room.js"), encoding="utf-8").read()
    m = re.search(r"var OPENINGS = \{(.*?)\};", src)
    return re.findall(r"([a-z0-9]+):", m.group(1)) if m else []


def main(argv):
    shots = argv[argv.index("--shots") + 1] if "--shots" in argv else None
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    if shots: os.makedirs(shots, exist_ok=True)
    base = serve(); worlds = gpu_worlds(); ops = openings()
    check(len(worlds) >= 18, f"{len(worlds)} GPU worlds in the kit's lazy map")
    kw = {"args": GL}
    if os.path.exists(CHROMIUM): kw["executable_path"] = CHROMIUM
    with sync_playwright() as pw:
        b = pw.chromium.launch(**kw)
        for dev, vp, mobile in (("phone", {"width": 390, "height": 844}, True), ("desktop", {"width": 1280, "height": 800}, False)):
            if only and only != dev: continue
            def page(theme, q="low", extra=""):
                ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile); p = ctx.new_page(); errs = []
                p.on("pageerror", lambda e: errs.append(str(e))); p.on("console", lambda m: errs.append(m.text) if "[fxk]" in m.text else None)
                p.add_init_script("try { localStorage.setItem('tr_atmo_v1', %r); } catch (e) {}" % theme)
                p.goto(f"{base}?nosplash&q={q}{extra}#hall")
                return ctx, p, errs
            def wait_world(p, theme, n=2, ms=90000):
                try: p.wait_for_function("([id, n]) => { const d = window.TitanFXK && TitanFXK.debug(); return d && d.id === id && d.frames >= n; }", arg=[theme, n], timeout=ms); return True
                except Exception: return False

            # 1 + 3. every world boots as the backdrop; a world with a room takes the view
            booted, bad, viewbad, nroom = 0, [], [], 0
            for w in (worlds if dev == "phone" else REF):
                ctx, p, errs = page(w)
                ok = wait_world(p, w)
                d = p.evaluate("TitanFXK.debug()") if ok else {}
                if ok and not errs and d.get("view", {}).get("mode") == "backdrop" and d.get("canvases") == 1: booted += 1
                else: bad.append(f"{w}: {'no frames' if not ok else ''}{errs[:1]}{d.get('view')}")
                if ok and shots: p.screenshot(path=os.path.join(shots, f"world_{dev}_{w}.png"))
                R = p.evaluate("(id) => TitanFXK.room(id)", w) if ok else None
                if R:
                    nroom += 1
                    c0 = p.evaluate("() => TitanFXK.debug().worlds[0] || {}")
                    p.evaluate("(R) => { const L = {}; (R.look || []).forEach((c) => { L[c.id] = c.max; }); TitanFXK.setView({ mode: 'room', yaw: R.yaw[1], pitch: R.pitch[1], move: R.move[1], up: R.up[1], look: L }); }", R)
                    f = p.evaluate("TitanFXK.frames"); p.wait_for_function("(f) => TitanFXK.frames > f + 1", arg=f, timeout=90000)
                    c1 = p.evaluate("() => TitanFXK.debug().worlds[0] || {}")
                    if shots: p.screenshot(path=os.path.join(shots, f"room_{dev}_{w}.png"))
                    p.evaluate("TitanFXK.resetView()"); f = p.evaluate("TitanFXK.frames"); p.wait_for_function("(f) => TitanFXK.frames > f + 1", arg=f, timeout=90000)
                    c2 = p.evaluate("() => TitanFXK.debug().worlds[0] || {}")
                    if not (c0.get("cam") != c1.get("cam") and c1.get("look") != c0.get("look") and c2.get("cam") == c0.get("cam")):
                        viewbad.append(f"{w}: cam {c0.get('cam')} -> {c1.get('cam')} -> {c2.get('cam')}, look {c0.get('look')} -> {c1.get('look')}")
                ctx.close()
            n = len(worlds) if dev == "phone" else len(REF)
            check(booted == n, f"[{dev}] {booted} of {n} GPU worlds boot as the backdrop, one canvas, no errors" + ("; " + "; ".join(bad[:4]) if bad else ""))
            check(not viewbad, f"[{dev}] the view reaches all {nroom} worlds with a room, and resetView puts the camera back" + ("; " + "; ".join(viewbad[:3]) if viewbad else ""))

            # 2. the contract itself
            ctx, p, errs = page("supercell"); wait_world(p, "supercell")
            r = p.evaluate("""() => { const K = TitanFXK, R = K.room('supercell'), out = {};
              out.modes = K.MODES.join(',');
              K.setView({ mode: 'room' }); K.setView({ mode: 'flying' }); out.badMode = K.view.mode;
              K.setView({ yaw: NaN, pitch: Infinity, move: 'far', up: null }); out.badNum = [K.view.yaw, K.view.pitch, K.view.move, K.view.up].join(',');
              K.setView({ yaw: 99, pitch: -99, move: 99, up: 99, look: { rain: 99, nonsense: 3, sun: 'x' } });
              out.clamp = [K.view.yaw === R.yaw[1], K.view.pitch === R.pitch[0], K.view.move === R.move[1], K.view.up === R.up[1]].join(',');
              out.look = JSON.stringify(K.view.look); out.rainMax = R.look.filter((c) => c.id === 'rain')[0].max;
              let threw = false; try { K.setView(null); K.setView(42); K.setView({ look: 'x' }); } catch (e) { threw = true; } out.threw = threw;
              K.resetView(); out.reset = JSON.stringify(K.view); return out; }""")
            check(r["modes"] == "backdrop,opening,room", f"[{dev}] three modes: {r['modes']}")
            check(r["badMode"] == "room", f"[{dev}] an unknown mode is ignored (kept {r['badMode']})")
            check(r["badNum"] == "0,0,0,0", f"[{dev}] numbers that are not finite are ignored ({r['badNum']})")
            check(r["clamp"] == "true,true,true,true", f"[{dev}] the camera is clamped to the room limits ({r['clamp']})")
            check(r["look"] == '{"rain":%s}' % r["rainMax"], f"[{dev}] look controls clamped, unknown ids and bad values dropped ({r['look']})")
            check(not r["threw"], f"[{dev}] malformed settings never throw")
            check(r["reset"] == '{"mode":"backdrop","yaw":0,"pitch":0,"move":0,"up":0,"look":{}}', f"[{dev}] resetView gives the backdrop view back")

            # 4. six theme switches: one canvas, at most one loop
            seq = ["tourbillon", "afterhours", "silverscreen", "supercell", "neon", "supercell"]
            for t in seq:
                p.evaluate("(t) => { document.documentElement.dataset.atmo = t; }", t); p.wait_for_timeout(2500)
            wait_world(p, "supercell")
            d = p.evaluate("TitanFXK.debug()")
            check(d["canvases"] == 1 and d["loop"] <= 1 and d["id"] == "supercell", f"[{dev}] six theme switches: {d['canvases']} world canvas, {d['loop']} loop, on {d['id']}")
            check(not errs, f"[{dev}] no page errors through the switches" + (": " + errs[0][:120] if errs else ""))

            # 5. the room in the app
            r = p.evaluate("""() => TitanRoom.open().then((c) => new Promise((ok) => setTimeout(() => ok({ kit: c.kit, open: !!document.getElementById('troom'),
              hidden: document.documentElement.classList.contains('tr-room'), mode: TitanFXK.view.mode,
              app: getComputedStyle(document.getElementById('app') || document.body).visibility }), 600)))""")
            check(r["kit"] and r["open"] and r["hidden"] and r["mode"] == "room" and r["app"] == "hidden", f"[{dev}] Step inside: the room opens over the live world, the app hidden ({r})")
            if shots: p.screenshot(path=os.path.join(shots, f"inapp_room_{dev}_supercell.png"))
            p.keyboard.press("Escape"); p.wait_for_timeout(500)
            r = p.evaluate("({ open: !!document.getElementById('troom'), cls: document.documentElement.classList.contains('tr-room'), view: JSON.stringify(TitanFXK.view) })")
            check(not r["open"] and not r["cls"] and '"mode":"backdrop"' in r["view"] and '"yaw":0' in r["view"], f"[{dev}] Escape closes the room, the view is the backdrop again")
            p.evaluate("() => { document.documentElement.dataset.atmo = 'afterhours'; }"); p.wait_for_timeout(1500)
            r = p.evaluate("TitanRoom.open().then((c) => { const o = { kit: c.kit, open: !!document.getElementById('troom'), look: !!document.querySelector('#troom .troom-bar button') }; c.close(); return o; })")
            check(r["open"] and not r["kit"] and r["look"], f"[{dev}] a theme without a GPU world gets the basic room ({r})")
            ctx.close()

            # 6. the launch opening on the engine, handed to the app
            if ops:
                w = ops[0]; ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile); p = ctx.new_page(); errs = []
                p.on("pageerror", lambda e: errs.append(str(e)))
                p.add_init_script("try { localStorage.setItem('tr_atmo_v1', %r); } catch (e) {}" % w)
                p.goto(f"{base}?splash=1&q=low"); seen = set(); t0 = time.time(); shot = False
                while time.time() - t0 < 90:
                    s = p.evaluate("(() => { const h = document.documentElement.classList, K = window.TitanFXK; return [h.contains('ts-on'), h.contains('ts-engine'), K && K.view ? K.view.mode : '-']; })()")
                    if s[1]: seen.add("engine")
                    if s[2] == "opening": seen.add("opening")
                    if s[2] == "opening" and shots and not shot and time.time() - t0 > 4: p.screenshot(path=os.path.join(shots, f"opening_{dev}_{w}.png")); shot = True
                    if not s[0] and "opening" in seen: break
                    time.sleep(.2)
                p.wait_for_timeout(1500)
                e = p.evaluate("(() => { const d = TitanFXK.debug(); return { mode: d.view.mode, canvases: d.canvases, id: d.id, on: document.documentElement.classList.contains('ts-on'), app: getComputedStyle(document.getElementById('app')).visibility }; })()")
                check("engine" in seen and "opening" in seen, f"[{dev}] {w}: the launch opening plays on the theme's own world (seen {sorted(seen)})")
                check(not e["on"] and e["mode"] == "backdrop" and e["canvases"] == 1 and e["id"] == w and e["app"] == "visible", f"[{dev}] {w}: the app appears over the same world, as the backdrop ({e})")
                check(not errs, f"[{dev}] no page errors in the opening" + (": " + errs[0][:120] if errs else ""))
                ctx.close()

            # 8. tiers come from TitanQuality
            tb = []
            for q in ("low", "medium", "high", "ultra", "max"):
                ctx, p, errs = page("supercell", q)
                if not wait_world(p, "supercell", 1): tb.append(q + ": no frame"); ctx.close(); continue
                t = p.evaluate("(() => [String(TitanQuality.tier()), TitanFXK.debug().tier, TitanFXK.debug().worlds[0].tier])()")
                if not (t[0] == q and t[1] == q and t[2] == ("max" if q == "ultra" else q)): tb.append(f"{q}: {t}")
                ctx.close()
                if dev == "desktop": break
            check(not tb, f"[{dev}] the worlds get TitanQuality's tier" + ("; " + "; ".join(tb) if tb else ""))

            # 9. Motion Off: a still frame, no loop; a view change draws one more
            ctx, p, errs = page("supercell")
            p.evaluate("() => { document.documentElement.dataset.motion = 'off'; }"); wait_world(p, "supercell", 1); p.wait_for_timeout(2500)
            f1 = p.evaluate("TitanFXK.frames"); p.wait_for_timeout(2500); f2 = p.evaluate("TitanFXK.frames"); lp = p.evaluate("TitanFXK.debug().loop")
            p.evaluate("TitanFXK.setView({ mode: 'room', yaw: .5 })"); p.wait_for_timeout(4000); f3 = p.evaluate("TitanFXK.frames")
            check(f2 == f1 and lp == 0, f"[{dev}] Motion Off: a still frame, no loop ({f1} -> {f2} frames, loop {lp})")
            check(f3 == f2 + 1, f"[{dev}] Motion Off: a view change draws one new frame ({f2} -> {f3})")
            ctx.close()
        b.close()

    # 7. the openings list and the room data agree
    src = {w: open(os.path.join(ROOT, "fx", w + ".js"), encoding="utf-8").read() for w in ops}
    missing = [w for w in ops if not re.search(r"\broom:\s*\{.*?\bopening:\s*\{", src[w], re.S)]
    check(not missing, "every theme in OPENINGS has an opening path in its room data" + (": missing " + ", ".join(missing) if missing else ""))
    print("CL-WORLD-01:", "ALL GOOD" if not fails else f"{len(fails)} FAILED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
