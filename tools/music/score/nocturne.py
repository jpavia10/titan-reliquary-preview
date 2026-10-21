"""Nocturne (nocturne): designed sound around the songs -- the intro stinger (needle drop, reverse brass swell, C minor hit)
and the UI set. The songs themselves are licensed recordings (audio/score/nocturne/manifest.json, audio/score/CREDITS.md). Run: python3 tools/music/score/nocturne.py"""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from dsp import *

OUT = os.path.join(os.path.dirname(__file__), "../../../audio/score/nocturne"); os.makedirs(OUT, exist_ok=True)
BPM = 84; B = 60 / BPM; BAR = 4 * B; BARS = 16; LEN = BARS * BAR
IR_HALL = reverb_ir(3.8, 5200, 0.03); IR_PLATE = reverb_ir(2.2, 8000, 0.01, 5)

# Cm9 | Abmaj9 | Fm9 | G7b9sus->G7b9  (2 bars each), second half: Cm9 | Ebmaj7/Bb | Fm9 | Db maj7#11 -> G7
C1 = [("Cm9", 36, [48, 55, 58, 62, 63]), ("Abmaj9", 32, [48, 55, 56, 58, 63]), ("Fm9", 29, [48, 51, 55, 56, 60]), ("G7b9", 31, [47, 53, 56, 59, 62])]
C2 = [("Cm9", 36, [48, 55, 58, 62, 63]), ("Ebmaj7", 34, [50, 55, 58, 62, 67]), ("Fm9", 29, [48, 51, 55, 56, 60]), ("Dbmaj7#11", 37, [48, 53, 55, 56, 60])]
PROG = C1 + C2
def chord_at(i): return PROG[i]

meta = {}

# ---------- intro stinger (non-looping, ~5.5 s): tube ignition -> reverse swell -> Cm9 hit + bell ----------
st = Track(6.0, 5)
n = secs(2.2); t = np.arange(n) / SR
ign = sum(np.sin(2 * np.pi * (60 + 900 * (t / 2.2) ** 2) * k * t) / k for k in (1, 2, 3, 5)) * (t / 2.2) ** 2
ign *= (rng.random(n) > 0.04 * (1 - t / 2.2)).astype(float)
st.add(0, bp(ign, 90, 4000) * 0.12)
sw = Track(2.4, 0)
for m in [48, 55, 58, 62, 63, 70, 74]: sw.add(0, bell(m + 12, 2.4, 2.0, 2.5, 0.6), pan=(m % 5 - 2) / 3, gain=0.2)
rv = reverb(sw.looped(), IR_HALL, 0.9)[:, ::-1]
st.add(0.0, rv * np.linspace(0, 1, rv.shape[1]) ** 2, gain=0.8)
hit = 2.4
st.add(hit, kick(1.2), gain=1.0)
for m in [36, 48]:
    nn = secs(3.5); tt = np.arange(nn) / SR
    st.add(hit, lp(np.tanh(2 * np.sin(2 * np.pi * mtof(m) * tt)) * np.exp(-tt * 0.9), 500), gain=0.35)
for m in [48, 55, 58, 62, 63]:
    s = supersaw(mtof(m), 3.4, 5, 0.012, 2600) * env_adsr(secs(3.4), 0.005, 0.6, 0.5, 2.0)
    st.add(hit, s, gain=0.16)
    st.add(hit, epiano(m + 12, 2.0, 0.9), gain=0.18)
st.add(hit + 0.02, bell(84, 5, 3.5, 2.4, 0.7), pan=0.2, gain=0.35)
stg = reverb(st.buf, IR_HALL, 0.4)
stg *= 10 ** ((-14 - rms_db(stg[:, secs(hit):secs(hit + 1.5)])) / 20)
fade = np.ones(stg.shape[1]); fade[-secs(1.0):] = np.linspace(1, 0, secs(1.0))
meta["stinger"] = write_and_encode(os.path.join(OUT, "stinger"), tape(stg * fade, 1.1), loop=False, bitrate="192k")
meta["stinger"]["hit"] = hit

# ---------- UI set: tap, open, back, search, coin ----------
def one(name, x, peak_db=-6):
    x = x if x.ndim == 2 else np.vstack([x, x])
    x = x / (np.abs(x).max() + 1e-9) * 10 ** (peak_db / 20)
    meta["ui_" + name] = write_and_encode(os.path.join(OUT, "ui-" + name), x, loop=False, bitrate="128k")
def tube_tick():
    n = secs(0.18); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 2093 * t) * np.exp(-t * 60) + 0.4 * bp(noise(n), 3000, 9000) * np.exp(-t * 200)
    s += 0.25 * sum(np.sin(2 * np.pi * 120 * k * t) for k in (1, 3, 5)) * np.exp(-t * 30)
    return reverb(s, IR_PLATE, 0.2)
one("tap", tube_tick(), -9)
op = Track(1.6, 1)
for k, m in enumerate([72, 79, 84]): op.add(k * 0.06, bell(m, 1.4, 2.0, 1.2, 3), pan=(k - 1) * 0.4)
one("open", reverb(op.buf, IR_PLATE, 0.35), -8)
bk = Track(1.4, 1)
for k, m in enumerate([84, 79, 72]): bk.add(k * 0.05, bell(m, 1.2, 2.0, 1.0, 4), pan=(1 - k) * 0.4)
one("back", reverb(bk.buf, IR_PLATE, 0.3), -10)
n = secs(0.7); t = np.arange(n) / SR
sweep = sweep_lp(bp(noise(n), 800, 12000), 400, 9000, 24) * np.sin(np.pi * t / 0.7)
srch = Track(1.2, 1); srch.add(0, sweep * 0.5); srch.add(0.45, bell(91, 0.7, 3.5, 1.0, 5), gain=0.8)
one("search", reverb(srch.buf, IR_PLATE, 0.3), -10)
cn = Track(3.5, 1)
cn.add(0, bell(84, 3.4, 2.76, 3.2, 1.3), pan=-0.2); cn.add(0.01, bell(91, 3.0, 5.4, 1.5, 1.8), pan=0.25, gain=0.6)
cn.add(0, epiano(60, 1.5, 0.7), gain=0.5)
one("coin", reverb(cn.buf, IR_HALL, 0.35), -6)

# the songs are recorded human music (owner rule); this script only renders the designed sounds around them
p = os.path.join(OUT, "manifest.json"); man = json.load(open(p))
man["stinger"] = dict(file="stinger.m4a", **meta["stinger"]); man["ui"] = {k: "ui-" + k + ".m4a" for k in ["tap", "open", "back", "search", "coin"]}
json.dump(man, open(p, "w"), indent=1)
