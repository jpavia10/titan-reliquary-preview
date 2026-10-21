"""Offline studio renderer for Titan Reliquary theme scores (tools/music/score/).
Everything here is original synthesis (no third-party audio), rendered at 48 kHz stereo, then mastered
and encoded by encode(). Each theme script builds stems of identical length that loop seamlessly
(the reverb/delay tail past the loop end is folded back onto the start)."""
import numpy as np, subprocess, json, os
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
rng = np.random.default_rng(7)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12.0)
def secs(n): return int(round(n * SR))

class Track:
    def __init__(self, length, tail=6.0):
        self.L = secs(length); self.buf = np.zeros((2, self.L + secs(tail)))
    def add(self, t0, sig, pan=0.0, gain=1.0):
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.vstack([sig * l * 1.414, sig * r * 1.414])
        i = secs(t0); n = min(sig.shape[1], self.buf.shape[1] - i)
        if n > 0: self.buf[:, i:i + n] += sig[:, :n] * gain
    def looped(self):
        out = self.buf[:, :self.L].copy(); tail = self.buf[:, self.L:]
        k = 0
        while k < tail.shape[1]:
            n = min(self.L, tail.shape[1] - k); out[:, :n] += tail[:, k:k + n]; k += n
        return out

def env_adsr(n, a, d, s, r, sus_len=None):
    a, d, r = secs(a), secs(d), secs(r)
    sl = max(0, (n - a - d - r) if sus_len is None else secs(sus_len))
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(sl, s), np.linspace(s, 0, max(r, 1))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))

def lp(x, f, order=2): return sosfilt(butter(order, min(f, SR * 0.45), "low", fs=SR, output="sos"), x, axis=-1)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=-1)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=-1)

def sweep_lp(x, f0, f1, steps=64):
    """time-varying low-pass (block-wise crossfaded) for filter sweeps"""
    out = np.zeros_like(x); n = x.shape[-1]; edges = np.linspace(0, n, steps + 1).astype(int)
    for k in range(steps):
        f = f0 * (f1 / f0) ** (k / max(steps - 1, 1)); a, b = edges[k], edges[k + 1]
        seg = lp(x[..., max(0, a - 2048):b], f)
        out[..., a:b] = seg[..., -(b - a):] if b > a else 0
    return out

def saw(f, n, phase=0.0):
    t = np.arange(n) / SR; p = (f * t + phase) % 1.0
    return 2 * p - 1

def supersaw(f, dur, voices=5, detune=0.012, cutoff=1400):
    n = secs(dur); L = np.zeros(n); R = np.zeros(n)
    for v in range(voices):
        d = 1 + detune * (v - (voices - 1) / 2) / ((voices - 1) / 2 or 1)
        s = saw(f * d, n, rng.random())
        w = (v / (voices - 1)) if voices > 1 else 0.5
        L += s * (1 - w); R += s * w
    return lp(np.vstack([L, R]) / voices, cutoff, 2)

def fm(fc, ratio, index, dur, idx_decay=1.5, amp_env=None):
    n = secs(dur); t = np.arange(n) / SR
    I = index * np.exp(-t * idx_decay)
    s = np.sin(2 * np.pi * fc * t + I * np.sin(2 * np.pi * fc * ratio * t))
    return s * (amp_env if amp_env is not None else 1)

def epiano(m, dur, vel=0.8):
    f = mtof(m); n = secs(dur + 1.2); t = np.arange(n) / SR
    body = fm(f, 1.0, 1.6 * vel, dur + 1.2, 2.2) * np.exp(-t * 1.1)
    tine = fm(f * 1, 14.0, 0.9 * vel, dur + 1.2, 25) * np.exp(-t * 9) * 0.35
    s = (body + tine) * vel
    rel = np.ones(n); k = secs(dur); rel[k:] = np.linspace(1, 0, n - k)
    s *= rel
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * 4.6 * t)
    return np.vstack([s * (0.6 + 0.4 * trem), s * (0.6 + 0.4 * (1 - trem))]) * 0.5

def bell(m, dur=4.0, ratio=3.5, index=2.2, decay=1.2):
    f = mtof(m); n = secs(dur); t = np.arange(n) / SR
    s = fm(f, ratio, index, dur, 3.0) * np.exp(-t * decay) * np.minimum(1, t * 400)
    s += 0.3 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * decay * 2)
    return s * 0.5

def noise(n): return rng.standard_normal(n)

def kick(dur=0.6):
    n = secs(dur); t = np.arange(n) / SR
    f = 44 + 90 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5) + 0.25 * lp(noise(n), 3000) * np.exp(-t * 120)
    return np.tanh(s * 1.6) * 0.9

def snare(dur=0.5):
    n = secs(dur); t = np.arange(n) / SR
    s = 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 22) + bp(noise(n), 1200, 9000) * np.exp(-t * 14) * 0.8
    return s * 0.7

def hat(dur=0.09, open_=False):
    n = secs(0.4 if open_ else dur); t = np.arange(n) / SR
    return hp(noise(n), 7000, 4) * np.exp(-t * (9 if open_ else 55)) * 0.35

def shaker(dur=0.12):
    n = secs(dur); t = np.arange(n) / SR
    e = np.minimum(1, t * 60) * np.exp(-t * 30)
    return bp(noise(n), 4000, 12000) * e * 0.25

def reverb_ir(seconds=3.2, bright=6000, predelay=0.02, seed=3):
    r = np.random.default_rng(seed); n = secs(seconds); t = np.arange(n) / SR
    ir = r.standard_normal((2, n)) * np.exp(-t * 6.9 / seconds)
    ir = lp(ir, bright); ir[:, :secs(predelay)] = 0
    # early reflections
    for k, d in enumerate([0.011, 0.019, 0.027, 0.037, 0.049]):
        ir[k % 2, secs(predelay + d)] += 0.5 / (k + 1)
    return ir / np.sqrt((ir ** 2).sum() / 2)

def reverb(x, ir, wet=0.3):
    if x.ndim == 1: x = np.vstack([x, x])
    w = np.vstack([fftconvolve(x[0], ir[0])[:x.shape[1]], fftconvolve(x[1], ir[1])[:x.shape[1]]])
    w = hp(w, 180)
    return x * (1 - wet) + w * wet * 0.35

def delay(x, sec, fb=0.35, wet=0.3, cutoff=3500, pingpong=True):
    if x.ndim == 1: x = np.vstack([x, x])
    d = secs(sec); out = x.copy(); tap = x.copy()
    for k in range(1, 7):
        tap = lp(tap, cutoff) * fb
        sh = np.zeros_like(x); sh[:, d * k:] = tap[:, :x.shape[1] - d * k] if d * k < x.shape[1] else 0
        if pingpong and k % 2: sh = sh[::-1]
        out += sh * wet / fb if k == 1 else sh * wet
    return out

def tape(x, drive=1.3): return np.tanh(x * drive) / np.tanh(drive)

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

def write_and_encode(path_noext, x, pad=0.5, loop=True, bitrate="160k"):
    """loop files get [last pad s] + loop + [first pad s] so the player can loop between pad..pad+L
    regardless of encoder priming. returns metadata"""
    import soundfile as sf
    L = x.shape[1]
    if loop:
        p = secs(pad); y = np.concatenate([x[:, -p:], x, x[:, :p]], axis=1)
    else:
        p = 0; y = x
    y = np.clip(y, -0.999, 0.999)
    sf.write(path_noext + ".wav", y.T, SR, subtype="PCM_24")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path_noext + ".wav", "-c:a", "aac", "-b:a", bitrate, path_noext + ".m4a"], check=True)
    os.remove(path_noext + ".wav")
    return {"pad": pad if loop else 0, "len": L / SR, "total": y.shape[1] / SR}
