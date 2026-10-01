import sys,json
from PIL import Image
import numpy as np
def lin(c):
    c=c/255.0; return np.where(c<=0.03928,c/12.92,((c+0.055)/1.055)**2.4)
def lum(rgb): l=lin(np.asarray(rgb,float)); return 0.2126*l[...,0]+0.7152*l[...,1]+0.0722*l[...,2]
def ratio(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
d,vp,atmo=sys.argv[1:4]; ids=sys.argv[4:]
R=[r for r in json.load(open(f"{d}/rects-{vp}-{atmo}.json")) if not r.get("tick") and not (240<=r["y"]<=300 and vp=="desktop") and not (r["y"]>=0 and "$" in r["t"] and r["y"]<300)]; off=np.asarray(Image.open(f"{d}/_off-{vp}-{atmo}.png").convert("RGB")).astype(float)
def meas(img,r):
    x,y,w,h=r["x"],r["y"],r["w"],r["h"]
    sc=img.shape[1]/off.shape[1]
    a=off[y:y+h,x:x+w].reshape(-1,3); b=img[y:y+h,x:x+w].reshape(-1,3)
    med=np.median(a,axis=0); dist=np.abs(a-med).sum(1); mask=dist>90
    if mask.sum()<4 or (~mask).sum()<4: return None
    return ratio(b[mask].mean(0),np.median(b[~mask],axis=0)), ratio(a[mask].mean(0),np.median(a[~mask],axis=0))
res={}
for i in ids:
    try: im=np.asarray(Image.open(f"{d}/{i}-{vp}-{atmo}.png").convert("RGB")).astype(float)
    except Exception: continue
    ms=[(meas(im,r),r) for r in R]; ms=[(m,r) for m,r in ms if m]
    fails=[(round(m[0],2),round(m[1],2),r["t"]) for m,r in ms if m[1]>=(3.0 if (r["fs"]>=24 or (r["fs"]>=18.6 and r["fw"]>=700)) else 4.5) and m[0]<(3.0 if (r["fs"]>=24 or (r["fs"]>=18.6 and r["fw"]>=700)) else 4.5)]
    worst=min(ms,key=lambda t:t[0][0]-t[0][1]) if ms else None
    res[i]=dict(n=len(ms),newFails=len(fails),minDrop=round(min((m[0]/m[1] for m,r in ms),default=1),3),meanDrop=round(float(np.mean([m[0]/m[1] for m,r in ms])),3),examples=fails[:3])
print(json.dumps(res,indent=1))
