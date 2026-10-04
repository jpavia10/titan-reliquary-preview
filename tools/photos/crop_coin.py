#!/usr/bin/env python3
"""Cut one coin out of a Phase 1 photo as a round, transparent image, rim intact.

  detect:  crop_coin.py detect RAW.jpg OUT_DIR            -> OUT_DIR/{stem}.detect.jpg (numbered candidate circles) + JSON on stdout
  check:   crop_coin.py check RAW.jpg OUT_DIR cx cy r [rot] -> OUT_DIR/{stem}.check.jpg (circle on the photo + edge zoom strips)
  cut:     crop_coin.py cut RAW.jpg OUT.webp cx cy r [rot]  -> 512 px WebP, transparent outside the circle

cx, cy, r are in ORIGINAL photo pixels (EXIF orientation applied). r is the radius of the coin's OUTER EDGE (the
rim's outside). `cut` adds RIM_PAD (3 %) of extra radius so the rim is never clipped; a thin ring of the flip
background is fine, a clipped rim is not. rot (degrees, counter-clockwise) turns the coin upright.
Needs: pillow, numpy, opencv-python-headless.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps, ImageFont

RIM_PAD = 1.03
SIZE = 512

def load(path):
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")

def detect(path):
    import cv2
    im = load(path); W, H = im.size
    s = 900 / max(W, H); small = np.array(im.resize((round(W * s), round(H * s)), Image.LANCZOS))
    g = cv2.medianBlur(cv2.cvtColor(small, cv2.COLOR_RGB2GRAY), 5)
    mn = min(small.shape[:2])
    out = []
    for p2 in (60, 45, 35, 28):
        cs = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1.2, minDist=mn * 0.12, param1=110, param2=p2,
                              minRadius=int(mn * 0.06), maxRadius=int(mn * 0.55))
        if cs is not None:
            for x, y, r in cs[0][:12]:
                c = (round(x / s), round(y / s), round(r / s))
                if all(abs(c[0] - o[0]) + abs(c[1] - o[1]) + abs(c[2] - o[2]) > 0.05 * mn / s for o in out): out.append(c)
        if len(out) >= 6: break
    return im, [refine(im, *c) for c in out[:8]]

def refine(im, cx, cy, r):
    """Push r outward to the strongest edge ring near r, so the circle sits on the coin's outside edge."""
    a = np.asarray(im.convert("L"), dtype=np.float32); H, W = a.shape
    best, br = -1, r
    angs = np.linspace(0, 2 * np.pi, 180, endpoint=False)
    for rr in range(int(r * 0.92), int(r * 1.10) + 1, max(1, r // 120)):
        xi = np.clip((cx + np.cos(angs) * rr).astype(int), 0, W - 1); yi = np.clip((cy + np.sin(angs) * rr).astype(int), 0, H - 1)
        xo = np.clip((cx + np.cos(angs) * (rr + 3)).astype(int), 0, W - 1); yo = np.clip((cy + np.sin(angs) * (rr + 3)).astype(int), 0, H - 1)
        sc = np.median(np.abs(a[yi, xi] - a[yo, xo]))
        if sc > best: best, br = sc, rr
    return (cx, cy, br)

def font(n):
    try: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", n)
    except OSError: return ImageFont.load_default()

def draw_detect(im, cands, out):
    W, H = im.size; s = 1000 / max(W, H)
    v = im.resize((round(W * s), round(H * s))); d = ImageDraw.Draw(v); f = font(28)
    for i, (x, y, r) in enumerate(cands):
        d.ellipse((x * s - r * s, y * s - r * s, x * s + r * s, y * s + r * s), outline=(255, 0, 0), width=3)
        d.text((x * s - 8, y * s - 14), str(i), fill=(255, 0, 0), font=f, stroke_width=2, stroke_fill=(255, 255, 255))
    v.save(out, quality=88)

def draw_check(im, cx, cy, r, rot, out):
    """Left: coin with red = r (outer edge) and green = r + pad (what is kept). Middle: zooms on the N/E/S/W edge.
    Right: the final cut. Correct when, in all four zooms, red lies ON the coin's outside edge and green is just outside it."""
    R = r * RIM_PAD; m = int(R * 1.25)
    box = im.crop((cx - m, cy - m, cx + m, cy + m)).resize((600, 600)); k = 600 / (2 * m)
    d = ImageDraw.Draw(box)
    d.ellipse((300 - R * k, 300 - R * k, 300 + R * k, 300 + R * k), outline=(0, 220, 0), width=2)
    d.ellipse((300 - r * k, 300 - r * k, 300 + r * k, 300 + r * k), outline=(255, 0, 0), width=1)
    sheet = Image.new("RGB", (600 + 300 + 300 + 300, 600), (60, 60, 60)); sheet.paste(box, (0, 0))
    z = max(12, int(r * 0.16))
    for i, (dx, dy) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0))):
        ex, ey = cx + dx * r, cy + dy * r
        tile = im.crop((ex - z, ey - z, ex + z, ey + z)).resize((300, 300), Image.NEAREST); kk = 300 / (2 * z)
        td = ImageDraw.Draw(tile)
        for rad, col in ((r, (255, 0, 0)), (R, (0, 220, 0))):
            # the circle near this edge point, in tile coords
            pts = []
            for t in np.linspace(-0.35, 0.35, 40):
                a = np.arctan2(dy, dx) + t
                pts.append((150 + (cx + np.cos(a) * rad - ex) * kk, 150 + (cy + np.sin(a) * rad - ey) * kk))
            td.line(pts, fill=col, width=2)
        td.text((8, 6), "NESW"[i], fill=(255, 255, 0), font=font(30), stroke_width=2, stroke_fill=(0, 0, 0))
        sheet.paste(tile, (600 + (i % 2) * 300, (i // 2) * 300))
    pv = Image.new("RGB", (SIZE, SIZE), (60, 60, 60)); c = cut_img(im, cx, cy, r, rot); pv.paste(c, (0, 0), c)
    sheet.paste(pv.resize((300, 300), Image.LANCZOS), (1200, 150))
    ImageDraw.Draw(sheet).text((1210, 460), "final cut (rot %g)" % rot, fill=(255, 255, 255), font=font(20))
    sheet.save(out, quality=90)

def cut_img(im, cx, cy, r, rot=0):
    R = r * RIM_PAD
    c = im.crop((round(cx - R), round(cy - R), round(cx + R), round(cy + R))).resize((SIZE, SIZE), Image.LANCZOS)
    if rot: c = c.rotate(rot, resample=Image.BICUBIC)
    c = ImageEnhance.Contrast(c).enhance(1.06)
    big = Image.new("L", (SIZE * 4, SIZE * 4), 0); ImageDraw.Draw(big).ellipse((0, 0, SIZE * 4 - 1, SIZE * 4 - 1), fill=255)
    o = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)); o.paste(c, (0, 0), big.resize((SIZE, SIZE), Image.LANCZOS))
    return o

def main(a):
    cmd, raw = a[0], a[1]; stem = os.path.splitext(os.path.basename(raw))[0]
    if cmd == "detect":
        im, cands = detect(raw); os.makedirs(a[2], exist_ok=True)
        draw_detect(im, cands, os.path.join(a[2], stem + ".detect.jpg"))
        print(json.dumps({"size": im.size, "candidates": [dict(i=i, cx=x, cy=y, r=r) for i, (x, y, r) in enumerate(cands)]}))
    elif cmd == "check":
        cx, cy, r = map(float, a[3:6]); rot = float(a[6]) if len(a) > 6 else 0
        os.makedirs(a[2], exist_ok=True); draw_check(load(raw), cx, cy, r, rot, os.path.join(a[2], stem + ".check.jpg"))
    elif cmd == "cut":
        cx, cy, r = map(float, a[3:6]); rot = float(a[6]) if len(a) > 6 else 0
        c = cut_img(load(raw), cx, cy, r, rot); c.save(a[2], "WEBP", quality=82, method=6)
        pv = Image.new("RGB", (SIZE, SIZE), (60, 60, 60)); pv.paste(c, (0, 0), c); pv.save(os.path.splitext(a[2])[0] + ".preview.jpg", quality=88)
    else: sys.exit(__doc__)

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1:])
