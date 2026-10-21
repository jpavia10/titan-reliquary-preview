"""Neon Vault (neon) score: "Wet Asphalt" -- neon-noir trip-hop in C minor, 84 bpm, 16 bars.
Stems: bed (tube-hum + analog pads + sub bass), drive (half-time drums, shaker, vinyl), lead (Rhodes motif
through a dotted-eighth tape delay + muted-horn line), shimmer (glass bell arpeggios for an open coin).
Plus intro stinger and the UI set. Run: python3 tools/music/score/neon.py"""
import os, sys, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from dsp import *

OUT = os.path.join(os.path.dirname(__file__), "../../../audio/score/neon"); os.makedirs(OUT, exist_ok=True)
BPM = 84; B = 60 / BPM; BAR = 4 * B; BARS = 16; LEN = BARS * BAR
IR_HALL = reverb_ir(3.8, 5200, 0.03); IR_PLATE = reverb_ir(2.2, 8000, 0.01, 5)

# Cm9 | Abmaj9 | Fm9 | G7b9sus->G7b9  (2 bars each), second half: Cm9 | Ebmaj7/Bb | Fm9 | Db maj7#11 -> G7
C1 = [("Cm9", 36, [48, 55, 58, 62, 63]), ("Abmaj9", 32, [48, 55, 56, 58, 63]), ("Fm9", 29, [48, 51, 55, 56, 60]), ("G7b9", 31, [47, 53, 56, 59, 62])]
C2 = [("Cm9", 36, [48, 55, 58, 62, 63]), ("Ebmaj7", 34, [50, 55, 58, 62, 67]), ("Fm9", 29, [48, 51, 55, 56, 60]), ("Dbmaj7#11", 37, [48, 53, 55, 56, 60])]
PROG = C1 + C2
def chord_at(i): return PROG[i]

# ---------- bed ----------
bed = Track(LEN, 7)
for i, (nm, root, notes) in enumerate(PROG):
    t0 = i * 2 * BAR; dur = 2 * BAR + 0.6
    for m in notes:
        s = supersaw(mtof(m), dur, 5, 0.009, 1100)
        s = sweep_lp(s, 600, 1500, 24) if i % 2 == 0 else sweep_lp(s, 1500, 700, 24)
        s *= env_adsr(s.shape[1], 1.2, 0.5, 0.85, 1.4)
        bed.add(t0, s, gain=0.11)
    # sub bass: root on 1, a ghosted octave on the "and" of 3, glide feel through saturation
    for b, (off, oct, v) in enumerate([(0, 0, 1.0), (2.5, 12, 0.45), (4, 0, 0.9), (6.75, 7, 0.4)]):
        n = secs(B * 1.6); t = np.arange(n) / SR; f = mtof(root + oct)
        s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
        s = np.tanh(1.8 * s) * env_adsr(n, 0.01, 0.3, 0.6, 0.35) * v
        bed.add(t0 + off * B, lp(s, 420), gain=0.36)
# neon tube hum: 120 Hz + harmonics, slowly breathing, flicker dropouts
n = bed.L; t = np.arange(n) / SR
hum = sum(np.sin(2 * np.pi * 120 * k * t) / k ** 1.4 for k in (1, 2, 3, 5, 7))
breath = 0.6 + 0.4 * np.sin(2 * np.pi * t / LEN * 2)
flick = np.ones(n)
for k in range(9):
    a = rng.integers(0, n - secs(0.4)); flick[a:a + secs(rng.uniform(0.04, 0.25))] *= 0.15
hum = bp(hum * breath * lp(flick, 60), 100, 2500)
bed.add(0, np.vstack([hum, np.roll(hum, 400)]), gain=0.018)
# rain-on-glass tone bed (filtered noise, very low) so the score breathes with the street
rain = bp(noise(n), 2500, 9000) * 0.02
bed.add(0, np.vstack([rain, np.roll(rain, 9000)]))
bed_x = reverb(bed.looped(), IR_HALL, 0.35)

# ---------- drive ----------
dr = Track(LEN, 5)
swing = 0.14
for bar in range(BARS):
    t0 = bar * BAR
    dr.add(t0, kick(), gain=0.8)
    dr.add(t0 + 2.75 * B, kick(), gain=0.45)
    if bar % 4 == 3: dr.add(t0 + 3.5 * B, kick(), gain=0.5)
    dr.add(t0 + 2 * B, reverb(snare(), IR_PLATE, 0.45), gain=0.6)   # half-time backbeat on 3
    for e in range(8):
        sw = swing * B if e % 2 else 0
        dr.add(t0 + e * B / 2 + sw, hat(), pan=0.35, gain=0.55 if e % 2 == 0 else 0.35)
    for s16 in range(16):
        if rng.random() < 0.55:
            dr.add(t0 + s16 * B / 4 + (0.08 * B if s16 % 2 else 0), shaker(), pan=-0.45, gain=rng.uniform(0.3, 0.7))
    if bar % 2 == 1: dr.add(t0 + 3.5 * B + swing * B, hat(open_=True), pan=0.3, gain=0.4)
# vinyl crackle
n = dr.L; cr = np.zeros(n); idx = rng.integers(0, n, 2600); cr[idx] = rng.standard_normal(2600)
cr = hp(cr, 1500) * 0.25 + lp(noise(n), 400) * 0.004
dr.add(0, np.vstack([cr, np.roll(cr, 777)]))
drive_x = tape(reverb(dr.looped(), IR_PLATE, 0.12), 1.2) * 0.9

# ---------- lead ----------
ld = Track(LEN, 7)
# Rhodes comping: syncopated chord stabs, voiced high
for i, (nm, root, notes) in enumerate(PROG):
    t0 = i * 2 * BAR
    for off, L, v in [(0.5, 1.2, 0.55), (1.75, 0.6, 0.4), (4.5, 1.5, 0.5), (6.0, 1.6, 0.35)]:
        for k, m in enumerate(notes[1:]):
            ld.add(t0 + off * B + k * 0.012, epiano(m + 12, L * B, v), gain=0.13)
# muted-horn motif (formant-filtered saw w/ delayed vibrato), call in bars 1-2, answer in 9-10 etc.
MOTIF = [(0, 67, 1.5), (1.5, 70, 0.5), (2, 72, 2.5), (5, 70, 0.5), (5.5, 67, 0.5), (6, 63, 2.0)]
ANS = [(0, 65, 1.0), (1, 67, 0.5), (1.5, 68, 1.5), (3.5, 67, 0.5), (4, 63, 1.0), (5, 62, 3.0)]
def horn(m, dur):
    n = secs(dur + 0.3); t = np.arange(n) / SR; f = mtof(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.6)
    ph = np.cumsum(f * vib) / SR; s = 2 * (ph % 1) - 1
    s = bp(s, 500, 1600) * 1.4 + bp(s, 2200, 3200) * 0.4
    return s * env_adsr(n, 0.07, 0.2, 0.75, 0.3, dur - 0.27)
for start, ph in [(0, MOTIF), (4, ANS), (8, MOTIF), (12, ANS)]:
    for off, m, d in ph:
        ld.add(start * BAR + 0.5 * B + off * B, horn(m, d * B), pan=-0.15, gain=0.16)
lead_x = ld.looped()
lead_x = delay(lead_x, 0.75 * B, 0.38, 0.32)
lead_x = reverb(lead_x, IR_HALL, 0.32)

# ---------- shimmer ----------
sh = Track(LEN, 8)
for i, (nm, root, notes) in enumerate(PROG):
    t0 = i * 2 * BAR; arp = sorted(notes[1:]) + [notes[1] + 12]
    for k in range(16):
        m = arp[(k * 3) % len(arp)] + 24
        sh.add(t0 + k * B / 2, bell(m, 3.0, 3.5, 1.6, 1.6), pan=np.sin(k * 0.9) * 0.7, gain=0.11 * (0.6 + 0.4 * (k % 4 == 0)))
shimmer_x = reverb(delay(sh.looped(), 1.5 * B, 0.3, 0.25, 6000), IR_HALL, 0.55)

# ---------- master: common gain so the browse mix sits at ~-20 dB RMS, peaks safe ----------
browse = bed_x * 1.25 + drive_x * 0.42 * 0.9 + lead_x * 1.3 * 0.8
g = 10 ** ((-20 - rms_db(browse)) / 20)
# stem trims from an EBU R128 pass: bed ~-21, drive ~-24, lead ~-24, shimmer ~-23 LUFS
stems = {"bed": bed_x * 1.25, "drive": drive_x * 0.42, "lead": lead_x * 1.3, "shimmer": shimmer_x * 2.8}
meta = {}
for k, x in stems.items():
    meta[k] = write_and_encode(os.path.join(OUT, k), tape(x * g, 1.05))

# ---------- intro stinger (non-looping, ~5.5 s): tube ignition -> reverse swell -> Cm9 hit + bell ----------
st = Track(6.0, 5)
n = secs(2.2); t = np.arange(n) / SR
ign = sum(np.sin(2 * np.pi * 120 * k * t) / k for k in (1, 2, 3, 4, 6, 8)) * (t / 2.2) ** 2
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
for k, m in enumerate([72, 79, 86]): op.add(k * 0.06, bell(m, 1.4, 2.0, 1.2, 3), pan=(k - 1) * 0.4)
one("open", reverb(op.buf, IR_PLATE, 0.35), -8)
bk = Track(1.4, 1)
for k, m in enumerate([86, 79, 72]): bk.add(k * 0.05, bell(m, 1.2, 2.0, 1.0, 4), pan=(1 - k) * 0.4)
one("back", reverb(bk.buf, IR_PLATE, 0.3), -10)
n = secs(0.7); t = np.arange(n) / SR
sweep = sweep_lp(bp(noise(n), 800, 12000), 400, 9000, 24) * np.sin(np.pi * t / 0.7)
srch = Track(1.2, 1); srch.add(0, sweep * 0.5); srch.add(0.45, bell(91, 0.7, 3.5, 1.0, 5), gain=0.8)
one("search", reverb(srch.buf, IR_PLATE, 0.3), -10)
cn = Track(3.5, 1)
cn.add(0, bell(84, 3.4, 2.76, 3.2, 1.3), pan=-0.2); cn.add(0.01, bell(91, 3.0, 5.4, 1.5, 1.8), pan=0.25, gain=0.6)
cn.add(0, epiano(60, 1.5, 0.7), gain=0.5)
one("coin", reverb(cn.buf, IR_HALL, 0.35), -6)

man = {"theme": "neon", "title": "Wet Asphalt", "bpm": BPM, "bars": BARS, "key": "C minor",
       "stems": {k: dict(file=k + ".m4a", **meta[k]) for k in stems},
       "states": {"browse": {"bed": 1, "drive": 0.9, "lead": 0.8, "shimmer": 0},
                  "coin": {"bed": 0.9, "drive": 0.3, "lead": 0.25, "shimmer": 1},
                  "search": {"bed": 0.85, "drive": 0.6, "lead": 0, "shimmer": 0.35},
                  "idle": {"bed": 0.8, "drive": 0, "lead": 0.2, "shimmer": 0}},
       "stinger": dict(file="stinger.m4a", **meta["stinger"]),
       "ui": {k: "ui-" + k + ".m4a" for k in ["tap", "open", "back", "search", "coin"]},
       "license": "Original composition and synthesis for Titan Reliquary (no third-party audio). CC0."}
json.dump(man, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
print(json.dumps(meta, indent=0)[:600])
