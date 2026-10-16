import sys, glob, os
from PIL import Image, ImageChops
d = sys.argv[1]
for f in sorted(glob.glob(os.path.join(d, "*_L.png"))):
    g = f[:-6] + "_G.png"
    if not os.path.exists(g): continue
    a, b = Image.open(f).convert("RGB"), Image.open(g).convert("RGB")
    diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 12 else 0)
    n = sum(1 for v in diff.getdata() if v)
    print(f"{os.path.basename(f)[:-6]:28s} {100*n/(a.width*a.height):6.2f}% pixels differ")
