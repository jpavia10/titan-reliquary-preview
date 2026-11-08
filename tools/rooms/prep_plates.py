#!/usr/bin/env python3
"""Prepare a theme's photographic layer set for the photograph engine (wings/plate.js: the backdrop, the opening and the room; owner
2026-10-30 and 2026-11-08: every theme is a photograph made by an image AI, and the app lays its own live light, particles, depth and
sound over it). After a run, give the theme's entry in wings/plate.js its front depth (fd: the "front" value in plate.json), which
switches it from its own picture to this set; the art/rooms/{ID}/plate.json "hero" file of the interim plate is replaced.

    python3 tools/rooms/prep_plates.py SRC_DIR ID [PREFIX] [--out art/rooms]

SRC_DIR holds the art queue's layer set for one room, every layer cut from the same wide photo (docs/art/requests/*room-layers*):
  {PREFIX}{ID}_back.png    the room with the front object removed (what shows behind it when the view moves)
  {PREFIX}{ID}_front.png   the front object on flat green
  {PREFIX}{ID}_depth.png   white = near, black = far
  {PREFIX}{ID}_lights.png  white where light comes from (windows, lamps, fire, shafts)
Writes art/rooms/{ID}/back.webp (the plate), front.webp (the object, green keyed out to transparency, the green spill pulled off its edge)
and map.webp (half size: R = the depth of the back plate, G = light) and plate.json (size, how near the front object is, how much
of the frame it covers). The depth map was made from the wide photo, front object included, so under the object it says "near" while
the back plate shows the room behind it: there the depth is filled in from the room around the object (nearest visible depth, then
smoothed), or the revealed background would slide like the object.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter


def blur121(x):
    """a small separable [1 2 1] blur, twice (numpy only)"""
    for _ in range(2):
        x = np.pad(x, 1, mode="edge"); x = (x[:-2] + 2 * x[1:-1] + x[2:]) / 4
        x = (x[:, :-2] + 2 * x[:, 1:-1] + x[:, 2:]) / 4
    return x


def push_pull(v, known):
    """fill where known == 0 from the known pixels around it, smoothly (push-pull pyramid; numpy only)"""
    levels = [(v * known, known.astype(np.float64))]
    while min(levels[-1][0].shape) > 4:
        vw, ww = levels[-1]; h, w = vw.shape
        def down(x): x = np.pad(x, ((0, h % 2), (0, w % 2)), mode="edge"); return x.reshape((h + 1) // 2, 2, (w + 1) // 2, 2).sum((1, 3))
        levels.append((down(vw), down(ww)))
    vw, ww = levels[-1]; est = vw / np.maximum(ww, 1e-6)
    for vw, ww in reversed(levels[:-1]):
        h, w = vw.shape
        up = blur121(np.repeat(np.repeat(est, 2, 0), 2, 1)[:h, :w])
        a = np.clip(ww, 0, 1)
        est = a * (vw / np.maximum(ww, 1e-6)) + (1 - a) * up
    return est


def key_green(rgb):
    """flat green screen -> RGBA; the threshold follows this image's own green (Gemini's greens run from #0AD60A to #0EFA06)"""
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    e = g - np.maximum(r, b)                                   # how much greener than anything else
    bg = np.median(e[e > 100]) if (e > 100).any() else 200.0
    t0, t1 = bg * 0.22, bg * 0.62                              # below t0 = the object, above t1 = the screen
    alpha = np.clip((t1 - e) / (t1 - t0), 0, 1)
    am = Image.fromarray((alpha * 255).astype(np.uint8))
    am = am.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # pull the edge in a pixel: no green fringe
    alpha = np.asarray(am).astype(np.float32) / 255
    g2 = np.minimum(g, np.maximum(r, b) + 6)                   # spill: no pixel of the object stays greener than its other channels
    g = np.where(e > 0, g2, g)
    out = np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    out[alpha < 0.02] = 0                                      # fully keyed pixels carry no colour (smaller file, no halo on filtering)
    return Image.fromarray(out, "RGBA")


def main(argv):
    pos = [x for x in argv if not x.startswith("--")]
    src, rid = pos[0], pos[1]
    pre = pos[2] if len(pos) > 2 else ""
    out = argv[argv.index("--out") + 1] if "--out" in argv else "art/rooms"
    def load(k): return Image.open(os.path.join(src, f"{pre}{rid}_{k}.png"))
    back, front, depth, lights = load("back").convert("RGB"), load("front").convert("RGB"), load("depth").convert("L"), load("lights").convert("L")
    W, H = back.size
    d = os.path.join(out, rid); os.makedirs(d, exist_ok=True)
    back.save(os.path.join(d, "back.webp"), "WEBP", quality=86, method=6)
    fr = key_green(np.asarray(front.resize((W, H))))
    fr.save(os.path.join(d, "front.webp"), "WEBP", quality=88, method=6, exact=False)
    hw, hh = W // 2, H // 2
    dep_full = np.asarray(depth.resize((W, H))).astype(np.float32)
    a = np.asarray(fr)[..., 3].astype(np.float32) / 255
    near = float(dep_full[a > .5].mean() / 255) if (a > .5).any() else 1.0
    hole = np.asarray(Image.fromarray(((a > .05) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13))) > 0   # the object + a margin
    if hole.any():
        fill = push_pull(dep_full.astype(np.float64), (~hole).astype(np.float64))   # depth of the room around the object, carried in
        dep_full = np.where(hole, fill, dep_full)
    dep = Image.fromarray(dep_full.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)).resize((hw, hh), Image.LANCZOS)
    lit = lights.resize((hw, hh), Image.LANCZOS)
    m = Image.merge("RGB", (dep, lit, Image.new("L", (hw, hh), 0)))
    m.save(os.path.join(d, "map.webp"), "WEBP", quality=92, method=6)
    cover = float((np.asarray(fr)[..., 3] > 128).mean())
    json.dump({"w": W, "h": H, "front": round(near, 3), "cover": round(cover, 3)}, open(os.path.join(d, "plate.json"), "w"))
    sizes = {f: os.path.getsize(os.path.join(d, f)) for f in ("back.webp", "front.webp", "map.webp")}
    print(f"{rid}: {W}x{H}, front covers {cover:.0%} at depth {near:.2f}, " + ", ".join(f"{k} {v // 1024} KB" for k, v in sizes.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
