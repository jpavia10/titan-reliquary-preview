#!/usr/bin/env python3
"""Wire a new token-only theme into every place the app reads themes from (2026-10-20, owner: "Make sure theres at least one theme
for all of these and expand with more ... Ship them one at a time").

    python3 tools/themes/add_theme.py tools/themes/specs/ID.json        (idempotent: a place that already has the theme is left alone)

The spec (JSON) carries: id, name, collection, mood, pair, scheme ("light"|"dark"), themeColor, station, ui [list], styles [list],
fx, fxIntensity, tokens (the CSS declarations of styles/atmo/ID.css, one string), crest (SVG markup, viewBox 0 0 200 200),
swatch (one CSS rule for .sw-ID), splash_pal (motion-splash palette object), scene (the TitanGen World scene, a JS object literal
string) and optionally splash_js (path to a JS file with `STYLES.ID = {...}` for js/motion-splash.js).
The theme's GPU effect lives in wings/fx/styles-e.js (registered by id = spec.fx); this script only loads that file once.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda *p: os.path.join(ROOT, *p)
log = []


def rd(f): return open(P(f), encoding="utf-8").read()
def wr(f, s): open(P(f), "w", encoding="utf-8", newline="\n").write(s)


def insert_after(text, anchor, new, what):
    i = text.find(anchor)
    if i < 0: raise SystemExit(f"anchor not found for {what}: {anchor[:60]!r}")
    j = i + len(anchor)
    return text[:j] + new + text[j:]


def last_line_with(text, needle):
    """end index of the last line containing needle"""
    i = text.rfind(needle)
    if i < 0: return -1
    return text.find("\n", i)


def main(spec_path):
    s = json.load(open(spec_path, encoding="utf-8"))
    tid = s["id"]; assert re.fullmatch(r"[a-z][a-z0-9]*", tid), tid
    js = json.dumps

    # 1. the token file
    f = f"styles/atmo/{tid}.css"
    if not os.path.exists(P(f)):
        head = (f"/* ============================================================================\n"
                f"   Atmosphere: {s['name'].upper()} ({tid}) · {', '.join(s.get('styles') or [])}\n"
                f"   {s['mood']}\n"
                f"   Token-only (Signature rule 1, notes/agents/theme-pot.md): the shared treatments in styles/style-layer.css are switched on by\n"
                f"   the theme's `ui` list in wings/themes/manifest.js (html[data-ui]); the effect is {s['fx']} (wings/fx/styles-e.js).\n"
                f"   Legibility: checked with tools/themes/check_theme.js (ink 7:1, muted 6:1, faint 4.5:1, accent 4.5:1).\n"
                f"   ========================================================================== */\n")
        wr(f, head + f'html[data-atmo="{tid}"] {{\n' + s["tokens"].rstrip() + "\n}\n" + (s.get("extra_css") or ""))
        log.append(f)

    # 2. service worker: the token file + the effect file
    t = rd("sw.js")
    if f'"styles/atmo/{tid}.css' not in t:
        t = insert_after(t, '"styles/atmo/terminal.css?v=" + BUILD,', f'\n  "styles/atmo/{tid}.css?v=" + BUILD,', "sw atmo"); log.append("sw.js atmo")
    if "wings/fx/styles-e.js" not in t:
        t = insert_after(t, '"wings/fx/styles-d.js?v=" + BUILD,', '\n  "wings/fx/styles-e.js?v=" + BUILD,', "sw fx"); log.append("sw.js fx")
    wr("sw.js", t)

    # 3. index.html: pre-paint lists, crest, picker card, effect script
    t = rd("index.html")
    m = re.search(r'var __tr_ok = \[([^\]]*)\];', t)
    if f'"{tid}"' not in m.group(1):
        t = t[:m.end(1)] + f',"{tid}"' + t[m.end(1):]; log.append("index __tr_ok")
    if s.get("ui"):
        m = re.search(r'var __tr_ui = \{([^}]*)\};', t)
        if f" {tid}:" not in m.group(1):
            t = t[:m.end(1)] + f', {tid}: "{" ".join(s["ui"])}"' + t[m.end(1):]; log.append("index __tr_ui")
    if f'id="crest-{tid}"' not in t:
        k = t.find('<symbol id="crest-terminal"'); e = t.find("</symbol>", k) + len("</symbol>")
        t = t[:e] + f'\n      <symbol id="crest-{tid}" viewBox="0 0 200 200">{s["crest"]}</symbol>' + t[e:]; log.append("index crest")
    if f'data-atmo-val="{tid}"' not in t:
        k = t.find('data-atmo-val="terminal"'); e = t.find("</button>", k) + len("</button>")
        card = (f'\n          <button type="button" class="atmo-card" data-atmo-val="{tid}">\n'
                f'            <span class="atmo-swatch sw-{tid}" aria-hidden="true"></span>\n'
                f'            <span class="atmo-card-name">{s["name"]}</span>\n'
                f'            <span class="atmo-card-desc">{s["mood"]}</span>\n'
                f'            <span class="atmo-card-pair">Pairs with · {s["pair"]}</span>\n'
                f'            <span class="atmo-card-scene" data-scene="{tid}">Set the scene →</span>\n'
                f'          </button>')
        t = t[:e] + card + t[e:]; log.append("index card")
    if "wings/fx/styles-e.js" not in t:
        m = re.search(r'<script src="wings/fx/styles-d\.js\?v=(tr\d+)"></script>', t)
        t = t[:m.end()] + f'<script src="wings/fx/styles-e.js?v={m.group(1)}"></script>' + t[m.end():]; log.append("index fx script")
    wr("index.html", t)

    # 4. app.js: the ATMOS table + order
    t = rd("app.js")
    if f"\n    {tid}:" not in t and f"\n    {tid} :" not in t:
        line = (f'\n    {tid + ":":<12} {{ name: {js(s["name"])}, themeColor: {js(s["themeColor"])}, preset: {js(tid)}, '
                f'station: {js(s["station"])}, pair: {js(s["pair"])} }},')
        e = last_line_with(t, '    terminal:    { name: "Grand Terminal"')
        t = t[:e] + line + t[e:]; log.append("app ATMOS")
    m = re.search(r'const ATMO_ORDER = \[([^\]]*)\];', t)
    if f'"{tid}"' not in m.group(1):
        body = m.group(1).rstrip()
        t = t[:m.start(1)] + body + f', "{tid}"\n  ' + t[m.end(1):]; log.append("app ATMO_ORDER")
    wr("app.js", t)

    # 5. wings/fx/ui.js: the theme's effect
    t = rd("wings/fx/ui.js")
    if f" {tid}: [" not in t:
        t = insert_after(t, 'terminal: ["style-splitflap", 0.85],', f' {tid}: [{js(s["fx"])}, {s["fxIntensity"]}],', "fx ui"); log.append("fx ui")
    wr("wings/fx/ui.js", t)

    # 6. the World manifest
    t = rd("wings/themes/manifest.js")
    if f'id: "{tid}"' not in t:
        entry = (f',\n    {{ id: {js(tid)}, name: {js(s["name"])}, collection: {js(s["collection"])}, tier: "signature", art: null, '
                 f'ui: {js(s.get("ui") or [])}, styles: {js(s.get("styles") or [])},\n      mood: {js(s["mood"])}, fx: {js(s["fx"])}, '
                 f'fxIntensity: {s["fxIntensity"]}, scene: {js(tid)}, tokens: {{}} }}')
        k = t.find('{ id: "terminal"'); e = t.find("tokens: {} }", k) + len("tokens: {} }")
        t = t[:e] + entry + t[e:]; log.append("manifest")
    wr("wings/themes/manifest.js", t)

    # 7. the picker swatch
    t = rd("styles/themes.css")
    if f".sw-{tid} " not in t and f".sw-{tid}{{" not in t:
        e = last_line_with(t, ".sw-terminal")
        nxt = t.find("\n", e + 1) if t[e + 1:e + 3] == "  " else e
        t = t.rstrip("\n") + "\n" + s["swatch"].strip() + "\n"; log.append("themes.css swatch")
    wr("styles/themes.css", t)

    # 8. motion splash: palette + optional style
    t = rd("js/motion-splash.js")
    if f"\n    {tid}:" not in t.split("function palette(")[0]:
        pal = ", ".join(f"{k}: {js(v)}" for k, v in s["splash_pal"].items())
        e = last_line_with(t.split("function palette(")[0], '    terminal:   { bg: "#0d0f12"')
        t = t[:e] + "," + f"\n    {tid + ':':<11} {{ {pal} }}" + t[e:]; log.append("splash palette")
    if s.get("splash_js") and f"STYLES.{tid} =" not in t:
        code = open(P(s["splash_js"]), encoding="utf-8").read().rstrip() + "\n\n"
        t = t.replace("  /* ============================== settings row ============================== */", code + "  /* ============================== settings row ============================== */", 1)
        log.append("splash style")
    wr("js/motion-splash.js", t)

    # 9. the TitanGen World scene
    t = rd("wings/scene-engine.js")
    if f'\n    "{tid}": {{' not in t:
        k = t.find('"terminal": { rec: "orchestra", world: true'); e = t.find("vol: 0.5 },", k) + len("vol: 0.5 },")
        t = t[:e] + f'\n    "{tid}": ' + s["scene"].strip() + "," + t[e:]; log.append("scene")
    wr("wings/scene-engine.js", t)

    print(f"{tid}: " + (", ".join(log) if log else "already wired everywhere"))


if __name__ == "__main__":
    main(sys.argv[1])
