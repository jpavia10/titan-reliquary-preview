#!/usr/bin/env bash
# Copy the app's world code and the sounds a room needs into the owner's test site (jpavia10/titan-v6-splash-viewer, folder rooms/),
# so the rooms there always run the app's own engine (owner, 2026-10-29: "u can use my other github site"). The room shell itself
# (rooms/index.html, room.html, room.js, room.css) lives only in the test site. Usage: tools/rooms/sync_test_site.sh [path-to-test-site]
set -euo pipefail
APP="$(cd "$(dirname "$0")/../.." && pwd)"; SITE="${1:-$APP/../titan-v6-splash-viewer}"; R="$SITE/rooms"
[ -d "$SITE/.git" ] || { echo "no test site at $SITE"; exit 1; }
mkdir -p "$R/fx" "$R/audio/scape/ir" "$R/audio/ambience" "$R/fonts"
cp "$APP"/fx/kit.js "$APP"/fx/post.js "$R/fx/"
for w in supercell; do cp "$APP/fx/$w.js" "$R/fx/"; done
cp "$APP"/audio/scape/engine.js "$APP"/audio/scape/presets.js "$R/audio/scape/"
for s in forest; do cp "$APP"/audio/scape/ir/$s.{m4a,webm} "$R/audio/scape/ir/"; done
for a in rainHeavy leaves windTrees thunder; do cp "$APP"/audio/ambience/$a.{m4a,webm} "$R/audio/ambience/"; done
cp "$APP"/audio/ambience/CREDITS.md "$R/audio/ambience/"
cp "$APP"/fonts/Fraunces-600.woff2 "$APP"/fonts/CREDITS.md "$R/fonts/"
echo "$(git -C "$APP" rev-parse --short HEAD) $(date -u +%FT%TZ)" > "$R/fx/FROM_APP.txt"
echo "synced into $R"
