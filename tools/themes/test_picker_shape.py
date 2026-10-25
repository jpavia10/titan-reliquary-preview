#!/usr/bin/env python3
"""Picker shape + grouping check (Grok 2026-10-20). A theme's stylesheet must never restyle the shared Themes picker.
Opens the picker, then loads every theme's styles/atmo/<id>.css in turn and checks that each tile picture, the now-showing
picture and the now-playing header keep the same size and stay rectangles (no pill/circle radius, no clip-path) as under the default theme.
Also: every theme sits in a named group (no "New and more"), and every theme not on the legacy list has a 640x400 card
portrait art/themes/<id>-card.webp. Every line names the theme as "Display Name (id)". Exit 0 = all pass."""
import functools, http.server, os, socket, struct, sys, threading
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "smoke"))
from smoke import ROOT, CHROMIUM
from playwright.sync_api import sync_playwright

# themes from before portraits were required; they show their CSS swatch. Do not add new ids here.
LEGACY_NO_ART = {"marbled", "cathedral", "contour", "banknote", "freefall", "sketch", "papercut", "y2k"}
# owner rule 9 (CLAUDE.md): art is never rendered by code; a theme whose card is requested in the art queue shows its CSS swatch until it lands
AWAITING_ART = {"canopy", "glasshouse", "orbit", "sahel"}   # docs/art/requests/artreq_20261024-0900_theme-art-canopy-silverscreen.json (supercell, tourbillon, darkroom, silverscreen cards landed 2026-10-24, Gemini)
LEGACY_NO_ART |= AWAITING_ART

MEASURE = r"""() => {
  const q = (s) => [...document.querySelectorAll(s)].slice(0, 6).map(e => { const c = getComputedStyle(e), r = e.getBoundingClientRect();
    return [c.borderTopLeftRadius, c.borderBottomRightRadius, c.clipPath, Math.round(r.width), Math.round(r.height)].join(" "); });
  return { tile: q("#ss-themes .th-tile .th-img"), card: q("#ss-themes .th-tile"), hero: q("#ss-themes .th-hero-img"), now: q("#ss-now-pic") };
}"""
SWAP = r"""(id) => new Promise(res => { const l = document.getElementById("atmo-css"); document.documentElement.setAttribute("data-atmo", id);
  const n = document.createElement("link"); n.rel = "stylesheet"; n.id = "atmo-css"; n.href = "styles/atmo/" + id + ".css?t=" + Date.now();
  n.onload = n.onerror = () => res(1); l.replaceWith(n); })"""

def webp_size(path):
    b = open(path, "rb").read(40)
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP": return None
    if b[12:16] == b"VP8 ": w, h = struct.unpack("<HH", b[26:30]); return w & 0x3FFF, h & 0x3FFF
    if b[12:16] == b"VP8L": v = struct.unpack("<I", b[21:25])[0]; return (v & 0x3FFF) + 1, ((v >> 14) & 0x3FFF) + 1
    if b[12:16] == b"VP8X": return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")

def same(a, b):
    """Same tile size and still a rectangle: corner radius may vary (square corners are a style), but never round past a
    quarter of the short side (999px pills/circles), and no clip-path."""
    if len(a) != len(b): return False
    for x, y in zip(a, b):
        r1, r2, clip, w, h = x.split(" ")[0], x.split(" ")[1], x.split(" ")[2], int(x.split(" ")[-2]), int(x.split(" ")[-1])
        yw, yh = int(y.split(" ")[-2]), int(y.split(" ")[-1])
        if (w, h) != (yw, yh) or clip != "none": return False
        for r in (r1, r2):
            if r.endswith("%") or float(r.rstrip("px") or 0) > min(w, h) / 4: return False
    return True

def main():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    out = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(**kw); p = b.new_page(viewport={"width": 412, "height": 900})
        p.goto(f"http://127.0.0.1:{port}/?nosplash"); p.wait_for_timeout(2500)
        p.evaluate("() => { TitanScene.open('themes'); TitanScene.setTab('themes'); }"); p.wait_for_timeout(600)
        info = p.evaluate("""() => ({ W: TITAN_WORLDS.map(w => ({ id: w.id, art: w.art && w.art.card })), L: Object.fromEntries(TITAN_WORLDS.map(w => [w.id, TitanWorldLabel(w.id)])),
          groups: TitanWorlds.groups().map(g => ({ name: g.name, ids: g.list.map(w => w.id) })) })""")
        L = info["L"]
        p.evaluate(SWAP, "afterhours"); p.wait_for_timeout(150); base = p.evaluate(MEASURE)
        if not base["tile"]: out.append("picker did not render any tiles")
        for w in info["W"]:
            p.evaluate(SWAP, w["id"]); p.wait_for_timeout(120); m = p.evaluate(MEASURE)
            for k in base:
                if not same(m[k], base[k]): out.append(f"{L[w['id']]} stylesheet changes the picker {k} shape: {m[k][:1]} vs default {base[k][:1]}")
        b.close()
    for g in info["groups"]:
        if g["name"] == "New and more": out.append("ungrouped themes (add them to GROUPS in wings/themes/worlds.js): " + ", ".join(L[i] for i in g["ids"]))
    for w in info["W"]:
        if w["id"] in LEGACY_NO_ART: continue
        if not w["art"]: out.append(f"missing card portrait (manifest art): {L[w['id']]}"); continue
        f = os.path.join(ROOT, "art", "themes", w["art"])
        if not os.path.exists(f): out.append(f"missing file art/themes/{w['art']}: {L[w['id']]}")
        elif webp_size(f) != (640, 400): out.append(f"art/themes/{w['art']} must be a 640x400 webp (is {webp_size(f)}): {L[w['id']]}")
    for line in out: print("FAIL: " + line)
    print(f"picker shape: {len(info['W'])} themes; " + ("ALL PASS" if not out else f"{len(out)} problem(s)"))
    sys.exit(1 if out else 0)

if __name__ == "__main__":
    main()
