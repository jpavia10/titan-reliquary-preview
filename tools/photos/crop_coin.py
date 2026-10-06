#!/usr/bin/env python3
"""Cut one coin out of a Phase 1 photo as a round, transparent image, rim intact.

  detect:  crop_coin.py detect RAW.jpg OUT_DIR            -> OUT_DIR/{stem}.detect.jpg (numbered candidate circles) + JSON on stdout
  check:   crop_coin.py check RAW.jpg OUT_DIR cx cy r [rot] -> OUT_DIR/{stem}.check.jpg (circle on the photo + edge zoom strips)
  cut:     crop_coin.py cut RAW.jpg OUT.webp cx cy r [rot] [--size N]  -> N px WebP (default 512), transparent outside the circle
                                                              (Phase 2 circles: --size 1200)
  cut2x2:  crop_coin.py cut2x2 RAW.jpg OUT.webp cx cy r [rot] [--size 1600] [--id C001 | --diameter-mm D] [--box CX CY SIDE]
                                                           -> square crop of the whole 2x2 flip (WebP or JPEG by the extension),
                                                              levelled by the same rot; also OUT.2x2check.jpg + JSON on stdout

Both `cut` and `cut2x2` print a JSON line {"crop": {...}}: the settings (source file, centre, radius, pad, rotation, output size, tool version)
that register_photos.py stores on the photo record (`crop`, schema Crop) so any cut can be compared or redone.

cx, cy, r are in ORIGINAL photo pixels (EXIF orientation applied). r is the radius of the coin's OUTER EDGE (the
rim's outside). `cut` adds RIM_PAD (3 %) of extra radius so the rim is never clipped; a thin ring of the flip
background is fine, a clipped rim is not. rot (degrees, counter-clockwise) turns the coin upright.
cut2x2 looks for the flip's cardboard square (a near-square outline around the coin; if the flip leans a few degrees off
the coin's upright, the square is levelled and rot is nudged to match). If none is found it uses a square centred on the
coin with side = 2r * 50.8 / diameter_mm (a 2x2 flip is 50.8 mm; diameter from --diameter-mm or the record via --id).
With neither a square nor a diameter it stops and asks for --box CX CY SIDE (centre and side in photo pixels).
"method" in the JSON says which was used (detected | diameter | explicit); always look at OUT.2x2check.jpg.
Needs: pillow, numpy, opencv-python-headless.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps, ImageFont

RIM_PAD = 1.03
SIZE = 512
TOOL_VERSION = "1"      # bump when cut_img / cut2x2_img / RIM_PAD change in a way that alters the pixels; stored on every photo record's `crop`

def crop_record(kind, source_file, cx, cy, r, rot, out_px, ts=None, source_sha256=None, box=None, box_method=None):
    """The `crop` object of a photo record (schema Crop): every setting needed to redo or compare this cut.
    kind: "circle" (cut) or "2x2" (cut2x2); box = (box_cx, box_cy, box_side) for a 2x2."""
    rec = {"source_file": source_file, "source_sha256": source_sha256, "method": f"crop_coin.py {'circle' if kind == 'circle' else '2x2'} v{TOOL_VERSION}", "tool_version": TOOL_VERSION,
           "cx": cx, "cy": cy, "r": r, "pad_pct": round((RIM_PAD - 1) * 100, 2), "rotation_deg": rot or 0, "out_px": out_px, "ts": ts}
    if box: rec.update(box_cx=round(box[0], 1), box_cy=round(box[1], 1), box_side=round(box[2], 1), box_method=box_method)
    return rec

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

def cut_img(im, cx, cy, r, rot=0, size=SIZE):
    R = r * RIM_PAD
    c = im.crop((round(cx - R), round(cy - R), round(cx + R), round(cy + R))).resize((size, size), Image.LANCZOS)
    if rot: c = c.rotate(rot, resample=Image.BICUBIC)
    c = ImageEnhance.Contrast(c).enhance(1.06)
    big = Image.new("L", (size * 4, size * 4), 0); ImageDraw.Draw(big).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    o = Image.new("RGBA", (size, size), (0, 0, 0, 0)); o.paste(c, (0, 0), big.resize((size, size), Image.LANCZOS))
    return o

# ---------------------------------------------------------------------------------------------- 2x2 flip square
FLIP_MM = 50.8
LAST = {}      # side information from plan_2x2 for the JSON line

def diameter_of(cid):
    """Coin diameter (mm) from the collection record of specimen `cid`, or None."""
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(here, "..", "pipeline"))
    import collection_io
    col = collection_io.Collection(os.path.join(here, "..", "..", "collection"))
    sp = col.specs.get(cid)
    if not sp: return None
    n = (col.types.get(sp["type"]) or {}).get("nominal") or {}
    return n.get("diameter_mm") if n.get("diameter_mm") is not None else n.get("diameter_max_mm")

def find_flip(im, cx, cy, r, expect_side=None):
    """The cardboard square around the coin: {cx, cy, side, tilt, quad} in photo pixels, or None.
    tilt = counter-clockwise degrees (in [-45, 45]) that level the square. Candidates are near-square, well-filled outlines that
    contain the whole coin; with expect_side (from the diameter) the one closest to that size wins, else the biggest plausible one."""
    import cv2
    W, H = im.size; sc = 1400 / max(W, H) if max(W, H) > 1400 else 1.0
    small = np.array(im.resize((round(W * sc), round(H * sc)), Image.LANCZOS)) if sc != 1.0 else np.array(im)
    g = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_RGB2GRAY), (5, 5), 0)
    ccx, ccy, cr = cx * sc, cy * sc, r * sc
    cands = []
    for lo in (25, 50, 90):
        m = cv2.dilate(cv2.Canny(g, lo, lo * 3), np.ones((3, 3), np.uint8), iterations=1)
        cs, _ = cv2.findContours(m, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in cs:
            if len(c) < 40: continue
            rect = cv2.minAreaRect(c); (rx, ry), (w, h), _ = rect
            if min(w, h) < 1: continue
            side = (w + h) / 2; asp = min(w, h) / max(w, h)
            if asp < 0.9 or side < 2 * cr * 1.25 or side > 2 * cr * 5.2: continue
            fill = cv2.contourArea(cv2.convexHull(c)) / (w * h)
            if fill < 0.88: continue
            off = math.hypot(rx - ccx, ry - ccy)
            if off > 0.22 * side or side < 2 * cr * 1.1 + 2 * off: continue          # roughly centred, and the coin fits inside
            pts = cv2.boxPoints(rect); dx, dy = pts[1] - pts[0]
            phi = math.degrees(math.atan2(-dy, dx)); tilt = -((phi + 45) % 90 - 45)
            cands.append(dict(cx=rx / sc, cy=ry / sc, side=side / sc, tilt=round(tilt, 2), fill=round(fill, 3), quad=(pts / sc).round(1).tolist()))
    if not cands: return None
    if expect_side:
        good = [c for c in cands if abs(c["side"] - expect_side) <= 0.2 * expect_side]
        return min(good, key=lambda c: abs(c["side"] - expect_side) + 200 * (1 - c["fill"])) if good else None
    return max(cands, key=lambda c: c["side"] * c["fill"] ** 4)

def cut2x2_img(im, bx, by, side, rot, size=1600):
    """Square of `side` px centred on (bx, by), rotated ccw by rot, resized to size x size. Area off the photo is white."""
    half = side * 0.75
    c = im.crop((round(bx - half), round(by - half), round(bx + half), round(by + half)))
    if rot: c = c.rotate(rot, resample=Image.BICUBIC, fillcolor=(255, 255, 255))
    lo = (c.size[0] - side) / 2
    return c.crop((round(lo), round(lo), round(lo + side), round(lo + side))).resize((size, size), Image.LANCZOS)

def plan_2x2(im, cx, cy, r, rot, diameter_mm=None, box=None):
    """-> (bx, by, side, rot_used, method); exits with a clear message when it cannot decide."""
    if box: return box[0], box[1], box[2], rot, "explicit"
    expect = 2 * r * FLIP_MM / diameter_mm if diameter_mm else None
    f = find_flip(im, cx, cy, r, expect)
    if f:
        cand = f["tilt"] + 90 * round((rot - f["tilt"]) / 90); LAST["card_tilt_off"] = round(abs(cand - rot), 1)
        return f["cx"], f["cy"], f["side"], round(cand if abs(cand - rot) <= 10 else rot, 2), "detected"   # level the square only when that barely moves the coin's upright
    if expect: return cx, cy, expect, rot, "diameter"
    sys.exit("cut2x2: no cardboard square found and the record has no diameter. Pass --diameter-mm D, --id C### (diameter from the collection) or --box CX CY SIDE.")

def draw_2x2_check(im, cx, cy, r, bx, by, side, rot, method, crop, out):
    """Left: the photo with the kept square (green) and the coin (red). Right: the result."""
    W, H = im.size; s = 900 / max(W, H)
    v = im.resize((round(W * s), round(H * s))); d = ImageDraw.Draw(v)
    a = math.radians(rot); h = side / 2          # a rot-ccw turn of the photo puts the square upright, so the square sits rot-cw in the photo
    pts = [(bx + x * math.cos(a) - y * math.sin(a), by + x * math.sin(a) + y * math.cos(a)) for x, y in ((-h, -h), (h, -h), (h, h), (-h, h))]
    d.line([(x * s, y * s) for x, y in pts + [pts[0]]], fill=(0, 220, 0), width=3)
    d.ellipse(((cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s), outline=(255, 0, 0), width=2)
    d.text((8, 6), method, fill=(255, 255, 0), font=font(26), stroke_width=2, stroke_fill=(0, 0, 0))
    sheet = Image.new("RGB", (v.size[0] + 700, max(v.size[1], 700)), (60, 60, 60)); sheet.paste(v, (0, 0)); sheet.paste(crop.resize((700, 700), Image.LANCZOS), (v.size[0], 0))
    sheet.save(out, quality=88)

def opt(a, name, n=1, cast=float):
    """Pop `--name v1 [v2 ...]` from the argument list; returns the value (n=1) or list, or None."""
    if name not in a: return None
    i = a.index(name); vals = [cast(x) for x in a[i + 1:i + 1 + n]]; del a[i:i + 1 + n]
    return vals[0] if n == 1 else vals

def main(a):
    a = list(a)
    size = opt(a, "--size"); size = int(size) if size else None
    dmm = opt(a, "--diameter-mm"); cid = opt(a, "--id", cast=str); box = opt(a, "--box", n=3)
    cmd, raw = a[0], a[1]; stem = os.path.splitext(os.path.basename(raw))[0]
    if cmd == "detect":
        im, cands = detect(raw); os.makedirs(a[2], exist_ok=True)
        draw_detect(im, cands, os.path.join(a[2], stem + ".detect.jpg"))
        print(json.dumps({"size": im.size, "candidates": [dict(i=i, cx=x, cy=y, r=r) for i, (x, y, r) in enumerate(cands)]}))
    elif cmd == "check":
        cx, cy, r = map(float, a[3:6]); rot = float(a[6]) if len(a) > 6 else 0
        os.makedirs(a[2], exist_ok=True); draw_check(load(raw), cx, cy, r, rot, os.path.join(a[2], stem + ".check.jpg"))
    elif cmd == "cut":
        cx, cy, r = map(float, a[3:6]); rot = float(a[6]) if len(a) > 6 else 0; n = size or SIZE
        c = cut_img(load(raw), cx, cy, r, rot, n); c.save(a[2], "WEBP", quality=82, method=6)
        print(json.dumps({"crop": crop_record("circle", os.path.basename(raw), cx, cy, r, rot, n)}))
        pv = Image.new("RGB", (n, n), (60, 60, 60)); pv.paste(c, (0, 0), c); pv.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.splitext(a[2])[0] + ".preview.jpg", quality=88)
    elif cmd == "cut2x2":
        cx, cy, r = map(float, a[3:6]); rot = float(a[6]) if len(a) > 6 else 0; n = size or 1600
        im = load(raw); dmm = dmm or (diameter_of(cid) if cid else None)
        bx, by, side, used, method = plan_2x2(im, cx, cy, r, rot, dmm, box)
        W, H = im.size; off = max(0, side / 2 - bx, bx + side / 2 - W, side / 2 - by, by + side / 2 - H)
        c = cut2x2_img(im, bx, by, side, used, n)
        if os.path.splitext(a[2])[1].lower() in (".jpg", ".jpeg"): c.save(a[2], "JPEG", quality=90)
        else: c.save(a[2], "WEBP", quality=85, method=6)
        draw_2x2_check(im, cx, cy, r, bx, by, side, used, method, c, os.path.splitext(a[2])[0] + ".2x2check.jpg")
        print(json.dumps({"crop": crop_record("2x2", os.path.basename(raw), cx, cy, r, used, n, box=(bx, by, side), box_method=method)}))
        print(json.dumps({"method": method, "box_cx": round(bx, 1), "box_cy": round(by, 1), "side": round(side, 1), "rot": used, "size": n, "diameter_mm": dmm,
                          "coin_fraction": round(2 * r / side, 3), "off_photo_px": round(off), "card_vs_coin_upright_deg": LAST.get("card_tilt_off"),
                          "warn": ("square reaches outside the photo: check the 2x2check image; " if off > 0.03 * side else "") + ("the card leans %s deg off the coin's upright; the coin's rot was used: check the 2x2check image" % LAST["card_tilt_off"] if (LAST.get("card_tilt_off") or 0) > 10 else "")}))
    else: sys.exit(__doc__)

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1:])
