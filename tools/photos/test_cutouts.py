#!/usr/bin/env python3
"""Cutouts check (Grok 2026-10-20): photos/cut/manifest.json agrees with the photos.
  every row names its source photo; the source exists and its sha256 matches (originals untouched, provenance true);
  every ok row has both files, transparent at the corners and solid in the middle; every failed row says why and has no file;
  every source photo has a row (run tools/photos/cutouts.py after adding photos)."""
import hashlib, json, os, sys
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
m = json.load(open(os.path.join(ROOT, "photos", "cut", "manifest.json")))["photos"]; bad = []
for stem, r in m.items():
    src = os.path.join(ROOT, r["source_file"])
    if not os.path.exists(src): bad.append(f"{stem}: source {r['source_file']} missing"); continue
    if hashlib.sha256(open(src, "rb").read()).hexdigest() != r["source_sha256"]: bad.append(f"{stem}: source changed since the cut (re-run cutouts.py)")
    if r["ok"]:
        for k in ("file", "thumb"):
            p = os.path.join(ROOT, r[k])
            if not os.path.exists(p): bad.append(f"{stem}: {r[k]} missing"); continue
            im = Image.open(p)
            if im.mode != "RGBA" or im.getpixel((0, 0))[3] != 0 or im.getpixel((im.width // 2, im.height // 2))[3] < 250: bad.append(f"{stem}: {r[k]} is not a clean alpha cutout")
    elif not r.get("why") or os.path.exists(os.path.join(ROOT, "photos", "cut", stem + ".webp")): bad.append(f"{stem}: a failed row must say why and have no file")
for f in os.listdir(os.path.join(ROOT, "photos", "p1")):
    if f.endswith(".webp") and f[:-5] not in m: bad.append(f"{f}: no cutout row (run tools/photos/cutouts.py)")
for b in bad: print("FAIL: " + b)
ok = sum(1 for r in m.values() if r["ok"])
print(f"cutouts: {ok} cut, {len(m) - ok} use the original; " + ("ALL GOOD" if not bad else f"{len(bad)} problem(s)")); sys.exit(1 if bad else 0)
