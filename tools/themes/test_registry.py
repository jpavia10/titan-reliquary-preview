#!/usr/bin/env python3
"""Theme registry check (Grok 2026-10-20). ONE registry: window.TITAN_WORLDS (wings/themes/manifest.js). Every other place
that knows about themes must agree with it exactly, both ways (nothing missing, nothing orphaned):
  picker cards, intros (TitanOpening styles), sound scene (TitanGen.SCENES, and each scene's atmo back-link), UI sound voice (TitanUISounds),
  coin-page 3D world (TitanCoin3D), FX presets (TitanFX), classic stylesheets (styles/atmo/<id>.css), aliases (names).
Every line names the theme as "Display Name (id)". Exit 0 = all agree."""
import functools, http.server, os, socket, sys, threading
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "smoke"))
from smoke import ROOT, CHROMIUM
from playwright.sync_api import sync_playwright

JS = r"""() => {
  const W = window.TITAN_WORLDS, ids = W.map(w => w.id), L = window.TitanWorldLabel, out = [];
  const st = (window.TitanOpening && TitanOpening._debug && TitanOpening._debug.STYLES) || {};
  const G = window.TitanGen || {}, scenes = G.SCENES || {}, order = G.WORLD_ORDER || null;
  const voices = (window.TitanUISounds && TitanUISounds.voices()) || [], c3 = (window.TitanCoin3D && TitanCoin3D.worlds()) || [];
  const fx = (window.TitanFX && TitanFX.presets && TitanFX.presets()) || [];
  const cards = [...document.querySelectorAll('[data-atmo-id], [data-world]')].map(e => e.dataset.atmoId || e.dataset.world);
  const both = (name, set) => { for (const id of ids) if (!set.includes(id)) out.push(`missing ${name}: ${L(id)}`);
    for (const k of set) if (!ids.includes(k)) out.push(`orphan ${name}: "${k}" is not in the registry`); };
  for (const w of W) {
    if (!st[w.id]) out.push(`missing intro: ${L(w.id)}`);
    if (!w.scene || !scenes[w.scene]) out.push(`missing sound scene: ${L(w.id)} (scene "${w.scene}")`);
    else if (scenes[w.scene].atmo && scenes[w.scene].atmo !== w.id && !W.some(x => x.id === scenes[w.scene].atmo)) out.push(`scene "${w.scene}" points at unknown theme "${scenes[w.scene].atmo}"`);
    for (const part of String(w.fx || "").split("+").filter(Boolean)) { const p = part.split("*")[0]; if (!fx.includes(p)) out.push(`missing FX preset "${p}": ${L(w.id)}`); }
  }
  both("UI sound voice", voices); both("coin-page 3D world", c3);
  for (const [k, sc] of Object.entries(scenes)) if (sc.atmo && !ids.includes(sc.atmo)) out.push(`sound scene "${k}" points at unknown theme "${sc.atmo}"`);
  const R = window.TitanRegistry; if (!R || R.ids().join() !== ids.join() || R.label("valhalla") !== "Gilded Armory (valhalla)") out.push("TitanRegistry must expose the same ids and Display Name (id) labels");
  const introIds = Object.keys(st).filter(k => !k.startsWith("__") && st[k] && st[k].native);
  for (const k of introIds) if (!ids.includes(k)) out.push(`orphan intro: "${k}" is not in the registry`);
  return { ids, classic: W.filter(w => w.tier === "classic").map(w => w.id), labels: Object.fromEntries(ids.map(i => [i, L(i)])), out };
}"""

def main():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(**kw); p = b.new_page()
        p.goto(f"http://127.0.0.1:{port}/?nosplash"); p.wait_for_timeout(3000)
        p.evaluate("() => Promise.all((TitanOpening.INTROS || []).map((i) => TitanOpening.need(i)))")   # the scenes load on demand
        r = p.evaluate(JS); r["intros"] = p.evaluate("TitanOpening.INTROS || []"); b.close()
    out = r["out"]
    for i in r["classic"]:
        if not os.path.exists(os.path.join(ROOT, "styles", "atmo", i + ".css")): out.append(f"missing stylesheet styles/atmo/{i}.css: {r['labels'][i]}")
    for f in os.listdir(os.path.join(ROOT, "styles", "atmo")):
        if f.endswith(".css") and not f.startswith("_") and f != "all.css" and f[:-4] not in r["ids"]: out.append(f"orphan stylesheet styles/atmo/{f}")
    for f in os.listdir(os.path.join(ROOT, "js", "intros")):
        if f.endswith(".js") and f != "kit.js" and f[:-3] not in r["ids"]: out.append(f"orphan intro file js/intros/{f}")
        if f.endswith(".js") and f != "kit.js" and f[:-3] not in r["intros"]: out.append(f"intro file js/intros/{f} is not in TitanOpening INTROS (js/motion-splash.js), so it never loads")
    for line in out: print("FAIL: " + line)
    print(f"registry: {len(r['ids'])} themes; " + ("ALL AGREE" if not out else f"{len(out)} mismatch(es)"))
    sys.exit(1 if out else 0)

if __name__ == "__main__":
    main()
