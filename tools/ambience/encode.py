#!/usr/bin/env python3
"""Build audio/ambience/*.webm (Opus) and *.m4a (AAC) from Moodist field recordings.

  pip install imageio-ffmpeg numpy
  python3 tools/ambience/encode.py [--raw DIR] [--only id,id]

Downloads the raw mp3/wav files from the Moodist repo (MIT code; sounds are CC0 or Pixabay
Content License, see audio/ambience/CREDITS.md) into --raw (default: a temp folder, not committed),
turns each into a seamless loop (stationary region + equal-power crossfade of the tail into the head),
loudness-normalises to about -20 LUFS and writes both codecs.  One-shot sounds are cut into segments
that are concatenated into one file; the segment table goes to audio/ambience/manifest.json.
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.request
import numpy as np
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
BASE = "https://raw.githubusercontent.com/remvze/moodist/main/public/sounds/"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "audio", "ambience")
SR = 48000
TARGET_LUFS = -20.0
MAX_BOOST_DB = 20.0
LOOP_SEC = 40.0

# id: (source path in the Moodist repo, loop seconds or None=auto, crossfade seconds, extra)
LOOPS = {
    "rainLight":    ("rain/light-rain.mp3",          LOOP_SEC, 3.0, {}),
    "rainHeavy":    ("rain/heavy-rain.mp3",          None,     2.0, {}),
    "rainWindow":   ("rain/rain-on-window.mp3",      None,     2.0, {}),
    "rainUmbrella": ("rain/rain-on-umbrella.mp3",    None,     2.0, {}),
    "leaves":       ("rain/rain-on-leaves.mp3",      LOOP_SEC, 3.0, {}),
    "wind":         ("nature/wind.mp3",              LOOP_SEC, 3.0, {}),
    "windHowl":     ("nature/howling-wind.mp3",      LOOP_SEC, 3.0, {}),
    "windTrees":    ("nature/wind-in-trees.mp3",     LOOP_SEC, 3.0, {}),
    "fire":         ("nature/campfire.mp3",          LOOP_SEC, 3.0, {}),
    "river":        ("nature/river.mp3",             LOOP_SEC, 3.0, {}),
    "waves":        ("nature/waves.mp3",             LOOP_SEC, 3.0, {}),
    "crickets":     ("animals/crickets.mp3",         LOOP_SEC, 3.0, {}),
    "frogs":        ("animals/frog.mp3",             LOOP_SEC, 3.0, {}),
    "birds":        ("animals/birds.mp3",            LOOP_SEC, 3.0, {}),
    "gulls":        ("animals/seagulls.mp3",         LOOP_SEC, 3.0, {}),
    "village":      ("places/night-village.mp3",     LOOP_SEC, 3.0, {}),
    "library":      ("places/library.mp3",           LOOP_SEC, 3.0, {}),
    "cafe":         ("places/cafe.mp3",              LOOP_SEC, 3.0, {}),
    "hall":         ("places/church.mp3",            LOOP_SEC, 3.0, {}),
    "trainIn":      ("transport/inside-a-train.mp3", LOOP_SEC, 3.0, {}),
    "train":        ("transport/train.mp3",          24.0,     3.0, {"start": 6.0}),
    "clock":        ("things/clock.mp3",             14.0,     0.0, {"start": 0.0, "exact": True}),
    "vinyl":        ("things/vinyl-effect.mp3",      LOOP_SEC, 3.0, {}),
    "keys":         ("things/keyboard.mp3",          None,     1.5, {}),
    "chimes":       ("things/wind-chimes.mp3",       LOOP_SEC, 3.0, {}),
    "roomTone":     ("things/ceiling-fan.mp3",       None,     2.0, {}),
    "labHum":       ("places/laboratory.mp3",        None,     2.0, {}),
    "telemetry":    ("things/morse-code.mp3",        LOOP_SEC, 3.0, {}),
    "temple":       ("places/temple.mp3",            LOOP_SEC, 3.0, {}),
    "crowd":        ("urban/crowd.mp3",              LOOP_SEC, 3.0, {}),
    "club":         ("places/crowded-bar.mp3",       LOOP_SEC, 3.0, {}),
    "city":         ("urban/busy-street.mp3",        LOOP_SEC, 3.0, {}),
    "underwater":   ("places/underwater.mp3",        LOOP_SEC, 3.0, {}),
    "drips":        ("nature/droplets.mp3",          LOOP_SEC, 3.0, {}),
    "waterfall":    ("nature/waterfall.mp3",         None,     2.0, {}),
    "ship":         ("transport/sailboat.mp3",       LOOP_SEC, 3.0, {}),
    "brown":        ("noise/brown-noise.wav",        None,     1.5, {}),
    "pink":         ("noise/pink-noise.wav",         None,     1.5, {}),
}
# one-shots: id: (source, [(start, dur, fade_out)], gain_db_trim)
EVENTS = {
    "thunder": ("rain/thunder.mp3",         [(0.3, 15.0, 4.0), (21.0, 15.0, 4.0), (48.0, 15.0, 4.0)], 0.0),
    "owl":     ("animals/owl.mp3",          [(3.0, 3.4, 0.4), (9.6, 3.2, 0.2)],                          0.0),
    "pages":   ("things/paper.mp3",         [(0.6, 3.2, 0.3), (5.6, 3.2, 0.3), (10.6, 3.4, 0.3)],        0.0),
    "bowl":    ("things/singing-bowl.mp3",  [(0.0, 26.0, 5.0)],                                           0.0),
    # hull/timber creaks cut around the strongest onsets of the sailboat recording; clunks = the slide-projector's mechanical change
    "creak":   ("transport/sailboat.mp3",  [(82.8, 3.6, 1.2), (108.0, 3.6, 1.2), (128.3, 3.6, 1.2), (132.1, 3.6, 1.2), (148.8, 3.6, 1.2)], 0.0),
    "clank":   ("things/slide-projector.mp3", [(2.2, 2.6, 1.2), (12.3, 2.6, 1.2), (22.2, 2.6, 1.2), (42.3, 2.6, 1.2)], 0.0),
    "whale":   ("animals/whale.mp3",       [(0.0, 26.0, 6.0)],                                            0.0),
}
PAD = 0.5  # seconds of silence between concatenated event segments


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, **kw)


def fetch(path, raw_dir):
    out = os.path.join(raw_dir, path.replace("/", "__"))
    if not os.path.exists(out) or os.path.getsize(out) < 1000:
        print("  download", path)
        with open(out, "wb") as f:
            f.write(urllib.request.urlopen(BASE + path, timeout=180).read())
    return out


def decode(path):
    info = sh([FF, "-hide_banner", "-i", path]).stderr.decode("utf8", "ignore")
    ch = 1 if re.search(r"Audio:.*mono", info) else 2
    raw = sh([FF, "-v", "error", "-i", path, "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"]).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).copy()
    return x, ch


def lufs(x, ch):
    r = sh([FF, "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-", "-af", "ebur128", "-f", "null", "-"],
           input=x.astype(np.float32).tobytes()).stderr.decode("utf8", "ignore")
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    return float(m[-1]) if m else None


def stationary_start(x, L, X, margin=1.0):
    """Start index of the length L+X window whose short-term level varies least (avoids one-off events and fades)."""
    n = len(x)
    need = int((L + X) * SR)
    m = int(margin * SR)
    if n - 2 * m < need:
        return max(0, (n - need) // 2)
    mono = x.mean(1)
    h = SR // 4
    k = len(mono) // h
    env = 20 * np.log10(np.sqrt((mono[: k * h].reshape(k, h) ** 2).mean(1)) + 1e-5)
    w = int((L + X) * 4)
    best, bi = 1e9, 0
    for i in range(int(margin * 4), k - w - int(margin * 4), 2):
        seg = env[i:i + w]
        s = seg.std() + 0.15 * abs(seg.mean() - np.median(env))
        if s < best:
            best, bi = s, i
    return bi * h


def make_loop(x, L, X, start=None, exact=False):
    n = len(x)
    if exact:                       # periodic material (clock): cut an exact whole number of periods in silence
        s = int(start * SR)
        out = x[s:s + int(L * SR)].copy()
        f = int(0.01 * SR)
        out[:f] *= np.linspace(0, 1, f)[:, None]; out[-f:] *= np.linspace(1, 0, f)[:, None]
        return out
    xs = int(X * SR)
    if L is None:
        L = (n / SR) - X - 0.4
    ls = int(L * SR)
    if start is None:
        s = stationary_start(x, L, X)
    else:
        s = int(start * SR)
    seg = x[s:s + ls + xs]
    if len(seg) < ls + xs:          # not enough material: shorten the loop
        ls = len(seg) - xs
    out = seg[:ls].copy()
    t = np.linspace(0, np.pi / 2, xs)[:, None]
    fin, fout = np.sin(t), np.cos(t)           # equal power
    out[:xs] = seg[:xs] * fin + seg[ls:ls + xs] * fout
    return out


def encode(x, ch, name, gain_db):
    g = 10 ** (gain_db / 20)
    y = (x * g).astype(np.float32)
    raw = y.tobytes()
    base = os.path.join(OUT, name)
    common = [FF, "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-", "-af", "alimiter=limit=0.89:attack=5:release=50"]
    br_opus = "80k" if ch == 2 else "48k"
    br_aac = "64k" if ch == 2 else "40k"
    sh(common + ["-c:a", "libopus", "-b:a", br_opus, "-vbr", "on", "-application", "audio", base + ".webm"], input=raw)
    sh(common + ["-c:a", "aac", "-b:a", br_aac, "-movflags", "+faststart", base + ".m4a"], input=raw)
    return os.path.getsize(base + ".webm"), os.path.getsize(base + ".m4a")


def process_gain(x, ch):
    i = lufs(x, ch)
    if i is None:
        return 0.0, None
    return min(MAX_BOOST_DB, TARGET_LUFS - i), i


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=os.path.join(tempfile.gettempdir(), "titan-ambience-raw"))
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    only = set(filter(None, a.only.split(",")))
    os.makedirs(a.raw, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, "manifest.json")
    keep = set(LOOPS) | set(EVENTS)
    if not only:                      # drop files of beds that are no longer in the spec
        for fn in os.listdir(OUT):
            if fn.rsplit(".", 1)[0] not in keep and fn.endswith((".webm", ".m4a")):
                os.remove(os.path.join(OUT, fn))
        if os.path.exists(mpath): os.remove(mpath)
    man = json.load(open(mpath)) if os.path.exists(mpath) else {"loops": {}, "events": {}}
    tot = 0
    for bid, (src, L, X, ex) in LOOPS.items():
        if only and bid not in only: continue
        x, ch = decode(fetch(src, a.raw))
        loop = make_loop(x, L, X, ex.get("start"), ex.get("exact", False))
        gdb, i0 = process_gain(loop, ch)
        w, m = encode(loop, ch, bid, gdb)
        man["loops"][bid] = {"sec": round(len(loop) / SR, 2), "ch": ch, "src": src, "gainDb": round(gdb, 1), "webm": w, "m4a": m}
        tot += w + m
        print("%-13s %5.1fs ch%d  %+5.1f dB  webm %4d KB  m4a %4d KB" % (bid, len(loop) / SR, ch, gdb, w // 1024, m // 1024))
    for eid, (src, segs, trim) in EVENTS.items():
        if only and eid not in only: continue
        x, ch = decode(fetch(src, a.raw))
        parts, table, pos = [], [], 0.0
        for (s, d, fo) in segs:
            seg = x[int(s * SR):int((s + d) * SR)].copy()
            f_in = int(0.02 * SR); f_out = int(fo * SR)
            seg[:f_in] *= np.linspace(0, 1, f_in)[:, None]
            seg[-f_out:] *= (np.linspace(1, 0, f_out) ** 1.5)[:, None]
            parts.append(seg); parts.append(np.zeros((int(PAD * SR), ch), np.float32))
            table.append([round(pos, 3), round(len(seg) / SR, 3)]); pos += len(seg) / SR + PAD
        y = np.concatenate(parts)
        gdb, i0 = process_gain(y, ch)
        gdb += trim
        w, m = encode(y, ch, eid, gdb)
        man["events"][eid] = {"sec": round(len(y) / SR, 2), "ch": ch, "src": src, "gainDb": round(gdb, 1), "segs": table, "webm": w, "m4a": m}
        tot += w + m
        print("%-13s %5.1fs ch%d  %+5.1f dB  webm %4d KB  m4a %4d KB  segs %s" % (eid, len(y) / SR, ch, gdb, w // 1024, m // 1024, table))
    json.dump(man, open(mpath, "w"), indent=1, sort_keys=True)
    allw = sum(v["webm"] for k in ("loops", "events") for v in man[k].values())
    allm = sum(v["m4a"] for k in ("loops", "events") for v in man[k].values())
    print("TOTAL webm %.1f MB, m4a %.1f MB, both %.1f MB" % (allw / 1e6, allm / 1e6, (allw + allm) / 1e6))


if __name__ == "__main__":
    main()
