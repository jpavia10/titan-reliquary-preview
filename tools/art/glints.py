#!/usr/bin/env python3
"""Prism glints: a seamless 5 s loop of light leaks, prism flares and soft bokeh on black.
For mix-blend-mode: screen. 1280x720 VP9 .webm, no alpha, <= 1.5 MB.

    pip install pillow numpy imageio-ffmpeg     (do NOT download wheels into the repo)
    python3 tools/art/glints.py                 -> art/fx/kaleido-glints.webm
All motion is a function of the loop phase t in [0,1) built from sin/cos of 2*pi*k*t (k integer), so frame 120 == frame 0.
"""
import colorsys
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H, FPS, SECS = 1280, 720, 24, 5
N = FPS * SECS
rng = np.random.default_rng(21)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def hue(h, s=0.85, v=1.0):
    return np.array(colorsys.hsv_to_rgb(h % 1.0, s, v), dtype=np.float32)


# light leaks: wide soft diagonal bands whose rainbow hue slides along their length
leaks = [dict(a=math.radians(rng.uniform(-35, 35)), c=rng.uniform(0.15, 0.85), w=rng.uniform(0.05, 0.11), ph=rng.uniform(0, 1),
              k=int(rng.integers(1, 3)), h0=rng.uniform(0, 1), amp=rng.uniform(0.05, 0.11)) for _ in range(5)]
# prism flares: 4-point glints
flares = [dict(x=rng.uniform(0.08, 0.92) * W, y=rng.uniform(0.08, 0.92) * H, r=rng.uniform(26, 70), ph=rng.uniform(0, 1),
               k=int(rng.integers(1, 3)), h=rng.uniform(0, 1)) for _ in range(9)]
# bokeh
bokeh = [dict(x=rng.uniform(0, W), y=rng.uniform(0, H), r=rng.uniform(14, 46), ph=rng.uniform(0, 1), h=rng.uniform(0, 1),
              dx=rng.uniform(-40, 40), dy=rng.uniform(-25, 25)) for _ in range(16)]


def frame(t):
    img = np.zeros((H, W, 3), np.float32)
    for L in leaks:
        # band centre sways with the loop; coordinate along/across the band
        sway = 0.06 * math.sin(2 * math.pi * (L["k"] * t + L["ph"]))
        nx, ny = math.cos(L["a"] + math.pi / 2), math.sin(L["a"] + math.pi / 2)
        d = ((xx / W - 0.5) * nx * (W / H) + (yy / H - 0.5) * ny) - (L["c"] - 0.5 + sway)
        along = (xx / W - 0.5) * math.cos(L["a"]) * (W / H) + (yy / H - 0.5) * math.sin(L["a"])
        band = np.exp(-(d / L["w"]) ** 2)
        h = L["h0"] + 0.35 * along + 0.1 * math.sin(2 * math.pi * (t + L["ph"]))
        # hue as a smooth rainbow along the band (vectorised hsv -> rgb)
        hh = (h % 1.0) * 6
        i = np.floor(hh)
        f = hh - i
        q, p_ = 1 - f, f
        r = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [1, q, 0, 0, p_, 1])
        g = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [p_, 1, 1, q, 0, 0])
        b = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [0, 0, p_, 1, 1, q])
        pulse = 0.55 + 0.45 * math.sin(2 * math.pi * (t + L["ph"])) ** 2
        img += (band * L["amp"] * 2.2 * pulse)[..., None] * np.stack([r, g, b], -1)
    for F in flares:
        a = 0.5 + 0.5 * math.sin(2 * math.pi * (F["k"] * t + F["ph"]))
        a = a ** 3
        if a < 0.02:
            continue
        dx, dy = xx - F["x"], yy - F["y"]
        r = F["r"] * (0.6 + 0.4 * a)
        core = np.exp(-(dx * dx + dy * dy) / (2 * (r * 0.09) ** 2))
        cross = (np.exp(-(dy / (r * 0.05)) ** 2) * np.exp(-np.abs(dx) / r) + np.exp(-(dx / (r * 0.05)) ** 2) * np.exp(-np.abs(dy) / r)) * 0.5
        img += (a * (core * 1.4 + cross))[..., None] * hue(F["h"] + 0.1 * math.sin(2 * math.pi * t), 0.45)[None, None, :]
    for B in bokeh:
        a = 0.5 + 0.5 * math.sin(2 * math.pi * (t + B["ph"]))
        cx = B["x"] + B["dx"] * math.sin(2 * math.pi * t + B["ph"] * 6)
        cy = B["y"] + B["dy"] * math.cos(2 * math.pi * t + B["ph"] * 6)
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / B["r"]
        disc = np.clip(1.0 - (d - 0.9) / 0.1, 0, 1) * (d < 1.0) * 0.5 + np.exp(-d * d * 3) * 0.2
        img += (disc * a * 0.22)[..., None] * hue(B["h"] + 0.15 * t, 0.7)[None, None, :]
    return np.clip(img, 0, 1)


def main():
    import imageio_ffmpeg
    out = os.path.join(ROOT, "art", "fx", "kaleido-glints.webm")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    crf = int(sys.argv[1]) if len(sys.argv) > 1 else 36
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", str(crf), "-pix_fmt", "yuv420p", "-row-mt", "1",
           "-deadline", "good", "-cpu-used", "2", "-g", "48", "-an", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(N):
        f = frame(i / N)
        # soften slightly; dither against banding
        im = Image.fromarray((f * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        a = np.asarray(im, dtype=np.float32) + rng.normal(0, 0.9, (H, W, 1))
        p.stdin.write(np.clip(a, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close()
    p.wait()
    print(out, os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    main()
