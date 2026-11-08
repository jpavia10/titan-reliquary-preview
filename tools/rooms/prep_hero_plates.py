#!/usr/bin/env python3
"""Interim plates for the themes whose photographic layer set has not come in yet (owner 2026-11-08: every theme is a photograph
with the app's live layers over it, never a world drawn in code; the layer sets are on the art queue, artreq_20261108-1500_room-layers-all).

    python3 tools/rooms/prep_hero_plates.py [ID ...] [--all]

Reads the theme's own picture (art/themes/{ID}.webp, made by the image AIs for the theme picker) and writes art/rooms/{ID}/map.webp
(half size, the same layout as tools/rooms/prep_plates.py: R = depth, G = light) and plate.json with "hero": true. The plate engine
(wings/plate.js) uses the picture itself as the back plate, so no second copy of it is stored. Nothing is drawn: the depth is estimated
from the picture (sharp detail is near, the lower part of the frame is nearer than the top, as on a floor) and the light mask is the
brightest few per cent of it. A theme that already has a full layer set (art/rooms/{ID}/back.webp) is skipped: the real set wins.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

THEMES = "art/themes"
OUT = "art/rooms"
FLAT = {"banknote", "bauhaus", "notepad", "sketch", "marbled", "pulp", "arcade"}   # graphic pictures: almost no depth
LIGHT_BG = {"banknote", "bauhaus", "conservator", "diorama", "marbled", "notepad", "papercut", "pulp", "sketch", "y2k"}


def smooth(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255


def plate(tid):
    src = os.path.join(THEMES, tid + ".webp")
    d = os.path.join(OUT, tid)
    if os.path.exists(os.path.join(d, "back.webp")):
        return f"{tid}: has its own layer set, skipped"
    im = Image.open(src).convert("RGB")
    W, H = im.size
    hw, hh = W // 2, H // 2
    a = np.asarray(im.resize((hw, hh), Image.LANCZOS)).astype(np.float32) / 255
    lum = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    # depth: a floor (bottom near, top far) + detail (sharp = in focus = the subject, near)
    lap = np.abs(4 * lum - np.roll(lum, 1, 0) - np.roll(lum, -1, 0) - np.roll(lum, 1, 1) - np.roll(lum, -1, 1))
    lap = smooth(lap / max(np.percentile(lap, 97), 1e-4), 10)
    lap = lap / max(lap.max(), 1e-4)
    floor = np.linspace(.18, .82, hh, dtype=np.float32)[:, None] * np.ones((1, hw), np.float32)
    depth = .62 * floor + .38 * lap
    if tid in FLAT:
        depth = .45 + .1 * (depth - .5)
    depth = smooth(depth, 6)
    # light: the brightest part of the picture, by its own levels (a dark room's lamp, a bright room's window)
    if tid in LIGHT_BG:
        light = np.zeros_like(lum)
    else:
        lb = smooth(lum, 1.5)
        t0 = max(.5, float(np.percentile(lb, 90)))
        t1 = max(t0 + .12, float(np.percentile(lb, 99.6)))
        light = np.clip((lb - t0) / (t1 - t0), 0, 1)
        light = light * light * (3 - 2 * light)
        light = smooth(light, 2)
    os.makedirs(d, exist_ok=True)
    m = Image.merge("RGB", tuple(Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)) for c in (depth, light, np.zeros_like(light))))
    m.save(os.path.join(d, "map.webp"), "WEBP", quality=90, method=6)
    json.dump({"w": W, "h": H, "front": None, "cover": 0, "hero": True, "back": f"{THEMES}/{tid}.webp"}, open(os.path.join(d, "plate.json"), "w"))
    return f"{tid}: {W}x{H}, light {float((light > .5).mean()):.1%}, map {os.path.getsize(os.path.join(d, 'map.webp')) // 1024} KB"


def main(argv):
    ids = [x for x in argv if not x.startswith("--")]
    if "--all" in argv or not ids:
        ids = sorted(f[:-5] for f in os.listdir(THEMES) if f.endswith(".webp") and not f.endswith("-card.webp"))
    for tid in ids:
        print(plate(tid))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
