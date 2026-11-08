#!/usr/bin/env python3
"""Regression test CL-WORLD-02 (2026-11-08): every theme is a photograph (docs/design/THEME_FRAMEWORK.md, section 3).

Owner, 2026-11-08: "I explicitly didnt want 3d worlds because your implementation is poor ... have my slaves make super high quality
third spaces as images then layering on it"; "Do it for all 50". One canvas (wings/plate.js TitanPlate, #tr-plate) shows the theme's
photograph with the app's live layers as the backdrop, the opening and the room. In the real app, phone and desktop:
  1. every theme in the manifest has a photograph: its plate entry and files (a full layer set in art/rooms/{id}/ or, until that comes,
     the theme's own picture art/themes/{id}.webp + an estimated map) (static)
  2. every theme boots with its photograph as the backdrop (phone: all of them; desktop: three), no page errors, one canvas, no
     code-built world (fx/kit.js draws none) and no old screen effect running
  3. six theme switches leave one canvas and at most one loop, on the last theme
  4. the room: Step inside shows the photograph at full brightness with the app hidden (nothing of it showing through), a drag pans it,
     Escape closes it and the photograph is the backdrop again
  5. the launch opening (?splash=1, no film in the test browser): the splash goes transparent over the photograph, the push in plays
     (mode "opening"), then the app appears over the same photograph as the backdrop
  6. Motion Off: a still frame, no loop; a look change draws one new frame
  python3 tools/smoke/test_regress_cl_world_contract.py [--shots DIR] [--only phone|desktop]      Exit code 0 = all pass.
"""
import functools, http.server, os, re, socket, sys, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, CHROMIUM
from playwright.sync_api import sync_playwright

REF = ["supercell", "abyss", "kaleido"]
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


def themes():
    man = open(os.path.join(ROOT, "wings", "themes", "manifest.js"), encoding="utf-8").read()
    return re.findall(r'\{ id: "([a-z0-9]+)", name:', man)


def plates():
    """theme id -> True when it has a full layer set (fd = the front object's depth), False when its own picture stands in"""
    src = open(os.path.join(ROOT, "wings", "plate.js"), encoding="utf-8").read()
    return {m.group(1): "fd:" in m.group(2) for m in re.finditer(r'^    ([a-z0-9]+): C\("[^"]+", [-.0-9]+, \[[^\]]*\](.*?)\),?$', src, re.M)}


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


def main(argv):
    shots = argv[argv.index("--shots") + 1] if "--shots" in argv else None
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    if shots: os.makedirs(shots, exist_ok=True)

    # 1. every theme has its photograph
    T, P = themes(), plates()
    check(len(T) >= 50, f"{len(T)} themes in the manifest")
    check(set(T) <= set(P), "every theme has a photograph in wings/plate.js" + ("; missing " + ", ".join(sorted(set(T) - set(P))) if set(T) - set(P) else ""))
    nofile = []
    for t in T:
        d = os.path.join(ROOT, "art", "rooms", t)
        need = [os.path.join(d, "map.webp")] + ([os.path.join(d, f) for f in ("back.webp", "front.webp")] if P.get(t) else [os.path.join(ROOT, "art", "themes", t + ".webp")])
        nofile += [os.path.relpath(f, ROOT) for f in need if not os.path.exists(f)]
    check(not nofile, f"every photograph's files are there ({sum(P.values())} full layer sets, {len(T) - sum(P.values())} on the theme's own picture)" + ("; missing " + ", ".join(nofile[:5]) if nofile else ""))

    base = serve(); kw = {"args": GL}
    if os.path.exists(CHROMIUM): kw["executable_path"] = CHROMIUM
    with sync_playwright() as pw:
        b = pw.chromium.launch(**kw)
        for dev, vp, mobile in (("phone", {"width": 390, "height": 844}, True), ("desktop", {"width": 1280, "height": 800}, False)):
            if only and only != dev: continue
            def page(theme, q="low", extra=""):
                ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile); p = ctx.new_page(); errs = []
                p.on("pageerror", lambda e: errs.append(str(e))); p.on("console", lambda m: errs.append(m.text) if "[plate]" in m.text or "[fxk]" in m.text else None)
                p.add_init_script("try { localStorage.setItem('tr_atmo_v1', %r); } catch (e) {}" % theme)
                p.goto(f"{base}?nosplash&q={q}{extra}#hall")
                return ctx, p, errs
            def wait_plate(p, theme, n=2, ms=60000):
                try: p.wait_for_function("([id, n]) => { const d = window.TitanPlate && TitanPlate.debug(); return d && d.id === id && d.ready && d.frames >= n; }", arg=[theme, n], timeout=ms); return True
                except Exception: return False
            STATE = """() => { const d = TitanPlate.debug(), K = window.TitanFXK, kd = K && K.debug ? K.debug() : {}, FX = window.TitanFX, fs = FX && FX.state ? FX.state() : {};
              return { d, world: kd.id || null, fx: fs.playing || null, kitShown: [...document.querySelectorAll('canvas#fxk')].some((c) => +getComputedStyle(c).opacity > 0) }; }"""

            # 2. every theme boots on its photograph
            booted, bad = 0, []
            for t in (T if dev == "phone" else REF):
                ctx, p, errs = page(t)
                ok = wait_plate(p, t)
                s = p.evaluate(STATE) if ok else {"d": {}}
                d = s["d"]
                if ok and not errs and d.get("mode") == "backdrop" and d.get("canvases") == 1 and not s.get("world") and not s.get("kitShown") and not s.get("fx"): booted += 1
                else: bad.append(f"{t}: {'not drawn' if not ok else ''}{errs[:1]} {s}")
                if ok and shots: p.screenshot(path=os.path.join(shots, f"plate_{dev}_{t}.png"))
                ctx.close()
            n = len(T) if dev == "phone" else len(REF)
            check(booted == n, f"[{dev}] {booted} of {n} themes boot on their photograph: one canvas, no code-built world, no old screen effect, no errors" + ("; " + "; ".join(bad[:4]) if bad else ""))

            # 3. six theme switches
            ctx, p, errs = page("supercell"); wait_plate(p, "supercell")
            for t in ["kaleido", "afterhours", "notepad", "abyss", "neon", "supercell"]:
                p.evaluate("(t) => { document.documentElement.dataset.atmo = t; }", t); p.wait_for_timeout(1800)
            wait_plate(p, "supercell")
            d = p.evaluate("TitanPlate.debug()")
            check(d["canvases"] == 1 and d["id"] == "supercell" and d["mode"] == "backdrop", f"[{dev}] six theme switches: {d['canvases']} canvas, on {d['id']}, {d['mode']}")
            check(not errs, f"[{dev}] no page errors through the switches" + (": " + errs[0][:120] if errs else ""))

            # 4. the room in the app (the Hall scrolled to its showcase first: its slide sets visibility: visible itself, tr266)
            p.evaluate("() => { const e = document.querySelector('.exhibit-slide.on'); if (e) e.scrollIntoView({ block: 'center' }); }"); p.wait_for_timeout(600)
            r = p.evaluate("""() => TitanRoom.open().then((c) => new Promise((ok) => setTimeout(() => { const d = TitanPlate.debug(), cv = document.getElementById('tr-plate');
              ok({ plate: !!c.plate, open: !!document.getElementById('troom'), hidden: document.documentElement.classList.contains('tr-room'), mode: d.mode, dim: d.dim,
                shown: !!cv && getComputedStyle(cv).visibility === 'visible' && +getComputedStyle(cv).opacity > .5, app: getComputedStyle(document.getElementById('app') || document.body).visibility }); }, 1600)))""")
            check(r["plate"] and r["open"] and r["hidden"] and r["mode"] == "room" and r["dim"] > .97 and r["shown"] and r["app"] == "hidden",
                  f"[{dev}] Step inside: the photograph at full brightness, the app hidden ({r})")
            leak = p.evaluate("""() => { const out = []; document.querySelectorAll('body *').forEach((e) => { if (e.closest('#troom') || e.id === 'tr-plate' || e.id === 'fxk' || e.id === 'titan-fx') return;
              if (getComputedStyle(e).visibility !== 'visible') return; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return;
              let op = 1, x = e; while (x && x !== document.documentElement) { op *= +getComputedStyle(x).opacity; x = x.parentElement; } if (op >= .02) out.push(e.tagName + '.' + String(e.className).split(' ')[0]); });
              return out.slice(0, 5); }""")
            check(not leak, f"[{dev}] Step inside: no part of the app shows through the room ({leak})")
            p0 = p.evaluate("TitanPlate.debug().pan[0]")
            p.evaluate("() => TitanRoom.current().plate.drag(-160, 0)"); p.wait_for_timeout(300)
            p1 = p.evaluate("TitanPlate.debug().pan[0]")
            check(p1 != p0, f"[{dev}] a drag pans across the photograph ({p0} -> {p1})")
            if shots: p.screenshot(path=os.path.join(shots, f"room_{dev}_supercell.png"))
            p.keyboard.press("Escape"); p.wait_for_timeout(1500)
            r = p.evaluate("({ open: !!document.getElementById('troom'), cls: document.documentElement.classList.contains('tr-room'), d: TitanPlate.debug() })")
            check(not r["open"] and not r["cls"] and r["d"]["mode"] == "backdrop" and r["d"]["canvases"] == 1, f"[{dev}] Escape closes the room; the photograph is the backdrop again ({r['d']['mode']}, dim {r['d']['dim']})")
            ctx.close()

            # 5. the launch opening on the photograph, handed to the app
            w = "abyss"; ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile); p = ctx.new_page(); errs = []
            p.on("pageerror", lambda e: errs.append(str(e)))
            p.add_init_script("try { localStorage.setItem('tr_atmo_v1', %r); } catch (e) {}" % w)
            p.goto(f"{base}?splash=1&q=low"); seen = set(); t0 = time.time(); shot = False
            while time.time() - t0 < 90:
                s = p.evaluate("(() => { const h = document.documentElement.classList, P = window.TitanPlate, d = P ? P.debug() : {}; return [h.contains('ts-on'), h.contains('ts-engine'), d.mode || '-', d.anim || '-']; })()")
                if s[1]: seen.add("engine")
                if s[2] == "opening": seen.add("opening")
                if s[3] == "open": seen.add("push")
                if s[2] == "opening" and shots and not shot and time.time() - t0 > 3: p.screenshot(path=os.path.join(shots, f"opening_{dev}_{w}.png")); shot = True
                if not s[0] and "opening" in seen: break
                time.sleep(.2)
            p.wait_for_timeout(1500)
            e = p.evaluate("(() => { const d = TitanPlate.debug(); return { mode: d.mode, canvases: d.canvases, id: d.id, on: document.documentElement.classList.contains('ts-on'), app: getComputedStyle(document.getElementById('app')).visibility }; })()")
            check({"engine", "opening", "push"} <= seen, f"[{dev}] {w}: the launch opening pushes into the theme's photograph (seen {sorted(seen)})")
            check(not e["on"] and e["mode"] == "backdrop" and e["canvases"] == 1 and e["id"] == w and e["app"] == "visible", f"[{dev}] {w}: the app appears over the same photograph, as the backdrop ({e})")
            check(not errs, f"[{dev}] no page errors in the opening" + (": " + errs[0][:120] if errs else ""))
            ctx.close()

            # 6. Motion Off: a still frame, no loop; a look change draws one more
            ctx, p, errs = page("supercell")
            p.evaluate("() => { document.documentElement.dataset.motion = 'off'; }"); wait_plate(p, "supercell", 1); p.wait_for_timeout(2500)
            f1 = p.evaluate("TitanPlate.debug().frames"); p.wait_for_timeout(2500); d2 = p.evaluate("TitanPlate.debug()")
            p.evaluate("TitanPlate.setLook('supercell', 'light', 1.3)"); p.wait_for_timeout(1500); f3 = p.evaluate("TitanPlate.debug().frames")
            p.evaluate("TitanPlate.resetLook('supercell')")
            check(d2["frames"] == f1 and not d2["loop"], f"[{dev}] Motion Off: a still frame, no loop ({f1} -> {d2['frames']} frames, loop {d2['loop']})")
            check(f3 >= d2["frames"] + 1 and f3 <= d2["frames"] + 2, f"[{dev}] Motion Off: a look change draws a new frame ({d2['frames']} -> {f3})")
            ctx.close()
        b.close()
    print("CL-WORLD-02:", "ALL GOOD" if not fails else f"{len(fails)} FAILED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
