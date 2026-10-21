#!/usr/bin/env python3
"""Coin cutouts (Grok 2026-10-20): every published coin photo -> a tight, edge-feathered alpha cutout plus a small sprite.
The Phase 1 crops (crop_coin.py cut) keep a 3 % ring of flip background so a rim is never clipped. For sprites that overlap
and cast shadows that ring shows as a grey halo, so this step finds the coin's real edge again and cuts on it.

  python3 tools/photos/cutouts.py [--only C001] [--force]

In:  photos/p1/*.webp (never modified).  Out: photos/cut/<stem>.webp (512 px, alpha) and photos/cut/t/<stem>.webp (160 px),
     photos/cut/manifest.json: per photo the source file, its sha256, the fitted circle, a fit confidence, ok/why, tool version.
Quality check: the edge must be a clear ring (confidence = how far the edge contrast on the fitted circle stands above other
radii, in standard deviations) and the circle must sit where the crop put the coin. A photo that fails gets ok:false and no file;
the app then uses the original photo. Re-runs skip photos whose source hash and tool version are unchanged.
Needs: pillow, numpy, opencv-python-headless (only for the blur). Never writes to data/."""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC, OUT = os.path.join(ROOT, "photos", "p1"), os.path.join(ROOT, "photos", "cut")
TOOL_VERSION = "1"; FULL, THUMB = 512, 160; MIN_CONF = 3.0; FEATHER = 1.6

def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

def fit(im):
    """Best circle near the centre whose edge is the strongest light/dark ring. Returns cx, cy, r, confidence."""
    g = np.asarray(im.convert("L").filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32); H, W = g.shape
    a = np.asarray(im.getchannel("A"), dtype=np.float32) if "A" in im.getbands() else np.full_like(g, 255)
    R0 = min(W, H) / 2 / 1.03; angs = np.linspace(0, 2 * np.pi, 240, endpoint=False); ca, sa = np.cos(angs), np.sin(angs)
    def ring(cx, cy, rr):
        xi = np.clip((cx + ca * (rr - 2)).astype(int), 0, W - 1); yi = np.clip((cy + sa * (rr - 2)).astype(int), 0, H - 1)
        xo = np.clip((cx + ca * (rr + 2)).astype(int), 0, W - 1); yo = np.clip((cy + sa * (rr + 2)).astype(int), 0, H - 1)
        ok = (a[yi, xi] > 200) & (a[yo, xo] > 200)
        return float(np.median(np.abs(g[yi, xi] - g[yo, xo])[ok])) if ok.sum() > 60 else 0.0
    best = (0, W / 2, H / 2, R0); scores = []
    def scan(cxs, cys, rs, keep):
        nonlocal best
        for cx in cxs:
            for cy in cys:
                for rr in rs:
                    s = ring(cx, cy, rr)
                    if keep: scores.append(s)
                    if s > best[0]: best = (s, cx, cy, rr)
    scan([W / 2 + d for d in range(-8, 9, 4)], [H / 2 + d for d in range(-8, 9, 4)], np.arange(R0 * 0.84, R0 * 1.012, 1.0), True)   # coarse
    b = best; scan([b[1] + d for d in (-2, -1, 0, 1, 2)], [b[2] + d for d in (-2, -1, 0, 1, 2)], np.arange(b[3] - 2, b[3] + 2.01, 0.5), False)  # fine
    sc = np.array(scores); conf = (best[0] - np.median(sc)) / (sc.std() + 1e-6)
    return best[1], best[2], best[3], float(conf)

def cut(im, cx, cy, r, size):
    W, H = im.size; yy, xx = np.mgrid[0:H, 0:W]; d = np.hypot(xx - cx + 0.5, yy - cy + 0.5)
    edge = np.clip((r - d) / FEATHER + 0.5, 0, 1)                          # feathered edge, ~1.6 px wide
    alpha = (np.asarray(im.getchannel("A"), np.float32) / 255 if "A" in im.getbands() else 1) * edge
    rgba = np.dstack([np.asarray(im.convert("RGB")), (alpha * 255).astype(np.uint8)])
    box = (int(cx - r - 1), int(cy - r - 1), int(cx + r + 1), int(cy + r + 1))
    return Image.fromarray(rgba, "RGBA").crop(box).resize((size, size), Image.LANCZOS)

def main(argv):
    only = argv[argv.index("--only") + 1] if "--only" in argv else None; force = "--force" in argv
    os.makedirs(os.path.join(OUT, "t"), exist_ok=True)
    mp = os.path.join(OUT, "manifest.json"); man = json.load(open(mp)) if os.path.exists(mp) else {}
    rows = man.get("photos", {}); n_ok = n_bad = n_skip = 0
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".webp") or (only and not f.startswith(only)): continue
        stem, src = f[:-5], os.path.join(SRC, f); h = sha(src)
        old = rows.get(stem)
        if old and not force and old.get("source_sha256") == h and old.get("tool_version") == TOOL_VERSION: n_skip += 1; continue
        im = Image.open(src); im.load(); W, H = im.size
        cx, cy, r, conf = fit(im)
        why = None
        if conf < MIN_CONF: why = f"edge not clear (confidence {conf:.1f} < {MIN_CONF})"
        elif r < min(W, H) / 2 / 1.03 * 0.85: why = "fitted circle much smaller than the crop"
        rec = {"source_file": "photos/p1/" + f, "source_sha256": h, "cx": round(cx, 1), "cy": round(cy, 1), "r": round(r, 1),
               "confidence": round(conf, 2), "ok": why is None, "tool_version": TOOL_VERSION}
        if why: rec["why"] = why; n_bad += 1
        else:
            c = cut(im, cx, cy, r, FULL); c.save(os.path.join(OUT, stem + ".webp"), "WEBP", quality=86, method=6)
            c.resize((THUMB, THUMB), Image.LANCZOS).save(os.path.join(OUT, "t", stem + ".webp"), "WEBP", quality=82, method=6)
            rec.update(file="photos/cut/" + stem + ".webp", thumb="photos/cut/t/" + stem + ".webp", v=h[:8]); n_ok += 1
        rows[stem] = rec
        if (n_ok + n_bad) % 20 == 0: json.dump({"photos": rows}, open(mp, "w"))   # progress survives an interrupt
    man = {"_doc": "Generated by tools/photos/cutouts.py. Do not edit. ok:false = the app uses the original photo.",
           "tool_version": TOOL_VERSION, "min_confidence": MIN_CONF, "photos": dict(sorted(rows.items()))}
    json.dump(man, open(mp, "w"), indent=1); print(f"cutouts: {n_ok} cut, {n_bad} kept original (failed the check), {n_skip} unchanged")

if __name__ == "__main__":
    main(sys.argv[1:])
