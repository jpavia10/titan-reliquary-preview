#!/usr/bin/env bash
# Copy the app's theme rooms into the owner's test server (jpavia10/titan-v6-splash-viewer, folder rooms/; owner, 2026-10-29: "That repo
# is my test server for any features"). Everything in rooms/ except DEPLOY_STAMP.txt is generated here from the app: the GPU kit and
# every world, the room shell (wings/room.js, wings/room-shell.js, styles/room*.css), the quality setting, the sound engine with its
# presets, rooms and recordings, the theme names and fonts, the coin index and cut-outs the worlds show, plus rooms/index.html (one card per world with a room) and rooms/room.html.
# Never edit them in the test site. Usage: tools/rooms/sync_test_site.sh [path-to-test-site]; then commit there and stamp
# rooms/DEPLOY_STAMP.txt through the GitHub connector (Pages there does not rebuild for the app's pushes, like rule 0).
set -euo pipefail
APP="$(cd "$(dirname "$0")/../.." && pwd)"; SITE="${1:-$APP/../titan-v6-splash-viewer}"; R="$SITE/rooms"
[ -d "$SITE/.git" ] || { echo "no test site at $SITE"; exit 1; }
find "$R" -mindepth 1 -maxdepth 1 ! -name DEPLOY_STAMP.txt -exec rm -rf {} +
mkdir -p "$R/fx" "$R/wings/themes" "$R/styles" "$R/audio/scape/ir" "$R/audio/ambience" "$R/audio/cuts" "$R/fonts"
cp "$APP"/fx/*.js "$R/fx/"
cp "$APP"/wings/room.js "$APP"/wings/room-shell.js "$APP"/wings/quality.js "$R/wings/"
cp "$APP"/wings/themes/manifest.js "$R/wings/themes/"
cp "$APP"/styles/room.css "$APP"/styles/room-shell.css "$R/styles/"
cp "$APP"/audio/scape/engine.js "$APP"/audio/scape/presets.js "$APP"/audio/scape/CREDITS.md "$R/audio/scape/"
cp "$APP"/audio/scape/ir/* "$R/audio/scape/ir/"
cp "$APP"/audio/ambience/* "$R/audio/ambience/"
[ -d "$APP/audio/cuts" ] && cp -r "$APP"/audio/cuts/* "$R/audio/cuts/" || true
cp "$APP"/fonts/Fraunces-600.woff2 "$APP"/fonts/CREDITS.md "$R/fonts/"
mkdir -p "$R/data" "$R/photos/p1"; cp "$APP"/data/index.json "$R/data/"; cp "$APP"/photos/p1/* "$R/photos/p1/"   # the worlds that show your coins (Silver Screen, Darkroom, ...)
python3 - "$APP" "$R" <<'PY'
import html, os, re, sys
app, out = sys.argv[1], sys.argv[2]
names = dict(re.findall(r'\{ id: "([a-z0-9]+)", name: "([^"]+)"', open(os.path.join(app, "wings/themes/manifest.js"), encoding="utf-8").read()))
ops = set(re.findall(r"([a-z0-9]+):", re.search(r"var OPENINGS = \{(.*?)\};", open(os.path.join(app, "wings/room.js")).read(), re.S).group(1)))
cards = []
for f in sorted(os.listdir(os.path.join(app, "fx"))):
    src = open(os.path.join(app, "fx", f), encoding="utf-8").read()
    m = re.search(r"K\.themes\.([a-z0-9]+) = \{.*?\broom:\s*\{\s*name:\s*\"([^\"]+)\".*?touch:\s*\"([^\"]+)\"", src, re.S)
    if not m: continue
    tid, room, touch = m.groups()
    cards.append('<a class="c" href="room.html?w=%s"><b>%s</b><span>%s</span><i>%s</i>%s</a>' % (tid, html.escape(names.get(tid, tid)), html.escape(room), html.escape(touch),
                 ('<a class="o" href="room.html?w=%s&amp;opening">Play its opening</a>' % tid) if tid in ops else ""))
page = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Theme rooms</title><meta name="robots" content="noindex">
<style>:root{color-scheme:dark}body{margin:0;background:#07080c;color:#e8e6df;font:15px/1.4 system-ui,-apple-system,sans-serif}
main{max-width:760px;margin:0 auto;padding:18px 16px 48px}h1{font:600 26px/1.15 Georgia,serif;margin:8px 0 6px}p{color:#b9b6ad;margin:0 0 16px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.c{display:block;padding:14px 16px;border-radius:14px;background:#11131c;border:1px solid #23273a;color:inherit;text-decoration:none}
.c b{display:block;font:600 17px Georgia,serif}.c span{display:block;color:#f3d48a;font-size:13.5px;margin:2px 0 6px}.c i{display:block;font-style:normal;color:#9a978f;font-size:13px}
.o{display:inline-block;margin-top:10px;padding:8px 12px;border-radius:18px;background:#f3d48a;color:#15120c;text-decoration:none;font-weight:600;font-size:13px}</style></head>
<body><main><h1>Theme rooms</h1><p>Each theme's own world on the app's engine, away from the collection. Drag to look around, pinch to move,
tap the world, tilt the phone; Look, Sound and Opening at the bottom. Generated from the app (%s worlds with a room); the same room is in
the app under Scene Studio &gt; Step inside. <a href="../" style="color:#f3d48a">Test server home</a></p><div class="g">%s</div></main></body></html>
""" % (len(cards), "\n".join(cards))
open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(page)
room = """<!doctype html><html lang="en" data-motion="full"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Theme room</title><meta name="robots" content="noindex">
<script>(function () { var w = (/[?&]w=([a-z0-9]+)/.exec(location.search) || [])[1] || "supercell"; document.documentElement.dataset.atmo = w; })();</script>
<link rel="stylesheet" href="styles/room.css"><style>html,body{margin:0;height:100%%;background:#000;overflow:hidden}
#wait{position:fixed;inset:0;display:grid;place-items:center;color:#cfc8b8;font:15px system-ui,sans-serif}</style></head>
<body><p id="wait">Loading the world...</p>
<script src="wings/quality.js"></script><script src="wings/themes/manifest.js"></script>
<script src="fx/kit.js"></script><script src="fx/atmos.js"></script><script src="fx/particles-gpu.js"></script><script src="fx/fluid.js"></script><script src="fx/post.js"></script><script src="fx/volume.js"></script><script src="fx/metal.js"></script><script src="fx/rd.js"></script><script src="fx/themes.js"></script>
<script src="audio/scape/engine.js"></script><script src="audio/scape/presets.js"></script><script src="wings/room.js"></script>
<script>(function () {
  var id = document.documentElement.dataset.atmo, K = window.TitanFXK, opening = /[?&]opening\\b/.test(location.search), t0 = Date.now();
  (function wait() {
    var d = K && K.debug(); if (!(d && d.id === id && d.frames > 1)) { if (Date.now() - t0 < 30000) return setTimeout(wait, 100); document.getElementById("wait").textContent = "This world did not start here."; return; }
    document.getElementById("wait").remove();
    TitanRoom.open().then(function (c) {
      if (opening && K.room(id) && K.room(id).opening) setTimeout(function () { var b = [].slice.call(c.el.querySelectorAll(".troom-bar button")).filter(function (x) { return x.textContent === "Opening"; })[0]; if (b) { b.click(); var p = c.el.querySelector(".troom-btns button"); if (p) p.click(); } }, 300);
      (function watch() { if (TitanRoom.current()) return setTimeout(watch, 300); location.href = "./"; })();
    });
  })();
})();</script></body></html>
"""
open(os.path.join(out, "room.html"), "w", encoding="utf-8").write(room)
print("rooms/index.html: %d worlds with a room" % len(cards))
PY
echo "$(git -C "$APP" rev-parse --short HEAD) $(date -u +%FT%TZ)" > "$R/FROM_APP.txt"
du -sh "$R" | cut -f1 | sed 's/^/rooms\/ size: /'
echo "synced into $R"
