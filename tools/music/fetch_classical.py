#!/usr/bin/env python3
"""Fetch recorded classical music for the app from Wikimedia Commons (owner 2026-10-08: "make the music better, at minimum the classical
music, it has to be royalty free by now"). Runs on a GitHub Actions runner (.github/workflows/music-intake.yml): the cloud container that
builds the site cannot reach Wikimedia.

    python3 tools/music/fetch_classical.py [docs/music/wanted.json] [--out audio/music] [--report docs/music/intake_report.json] [--dry]

For every piece in wanted.json it searches Commons (File namespace, audio only), reads each candidate's license and description, and keeps
only recordings that are
  - Public Domain, CC0, or CC BY / CC BY-SA (the RECORDING's license; every composition here is long out of copyright),
  - by a real performer: a MIDI, synth, MuseScore or "computer" rendering is refused,
  - the right piece: every word in `must` (or any one of them when `any` is true) appears in the title or description,
  - 1 to 20 minutes long.
The best candidate (a named ensemble or pianist, Musopen / Kimiko Ishizaka / a US military band, PD over CC, a bigger file) is downloaded,
loudness-normalised (EBU R128, -20 LUFS, the ambience target) and encoded as AAC 96 kb/s (.m4a, plays in every browser), cut at 7 minutes
with a fade. Writes audio/music/{id}.m4a, audio/music/manifest.json (what the app reads), audio/music/CREDITS.md and an intake report with
every candidate and why it was kept or refused. Nothing is merged without Claude reviewing the report.
"""
import datetime, json, os, re, subprocess, sys, tempfile, time, unicodedata, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "TitanReliquaryMusicIntake/1.0 (https://github.com/jpavia10/titan-reliquary-preview; private collection app; GitHub Actions)"
OK_LIC = re.compile(r"^\s*(public domain|pd\b|pd-|cc0|cc-zero|cc[ -]by(-sa)?[ -][1-4](\.[05])?)", re.I)
BAD = re.compile(r"\bmidi\b|\.mid\b|synth|musescore|sibelius|finale\b|8-?bit|chiptune|ringtone|karaoke|lilypond|timidity|fluidsynth|soundfont|"
                 r"virtual piano|computer[- ]generated|rendered|vocaloid|music box|ocarina|whistl|kazoo|ukulele|harmonica|recorder|"
                 r"sintetizzatore|virtuale|gigasampler|sampler|parody|ragtime|howitzer|remix|mashup", re.I)
# Category signals (Claude's review of the first intake, 2026-10-08): a source Commons cannot vouch for, or a recording that is public domain
# in Europe only. A historical transfer (Public Domain Project / Swiss foundation, 78 rpm) is accepted only when recorded in 1925 or earlier:
# US sound recordings from 1923-1946 stay protected for 100 years after publication.
BAD_CATS = re.compile(r"Template Unknown \(source\)|PD EU Audio|PD-EU", re.I)
HISTORIC = re.compile(r"PDP-CH|Swiss Foundation Public Domain|publicdomainproject|78 ?rpm|HMV|Columbia Records", re.I)
GOOD = re.compile(r"musopen|ishizaka|marine band|army band|navy band|air force band|orchestra|philharmon|symphon|quartet|ensemble|pianist|"
                  r"performed by|played by|concert", re.I)
MIMES = {"application/ogg", "audio/ogg", "audio/webm", "video/webm", "audio/flac", "audio/x-flac", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp3"}
MAX_SEC = 420


def fold(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F).lower()


def strip_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def api(params):
    params = dict(params, format="json", formatversion="2")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    last = None
    for i in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:      # noqa: BLE001
            last = e; time.sleep(2 ** i)
    raise RuntimeError(f"Commons API failed: {last}")


def search(q, n=30):
    d = api({"action": "query", "list": "search", "srsearch": q + " filetype:audio", "srnamespace": 6, "srlimit": n})
    return [x["title"] for x in d.get("query", {}).get("search", [])]


def info(titles):
    out = []
    for i in range(0, len(titles), 20):
        d = api({"action": "query", "titles": "|".join(titles[i:i + 20]), "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata|metadata",
                 "iiextmetadatafilter": "LicenseShortName|Artist|ImageDescription|Credit|Categories|ObjectName|AttributionRequired"})
        for p in d.get("query", {}).get("pages", []):
            ii = (p.get("imageinfo") or [None])[0]
            if not ii: continue
            md = {}
            for m in ii.get("metadata") or []:
                if isinstance(m, dict) and "name" in m: md[m["name"]] = m.get("value")
            em = {k: (v.get("value") if isinstance(v, dict) else v) for k, v in (ii.get("extmetadata") or {}).items()}
            dur = md.get("length") or md.get("playtime_seconds") or md.get("duration")
            try: dur = float(dur) if dur not in (None, "") else None
            except (TypeError, ValueError): dur = None
            out.append({"file": p["title"], "url": ii["url"], "size": ii.get("size") or 0, "mime": ii.get("mime"), "duration": dur,
                        "license": strip_html(em.get("LicenseShortName")), "artist": strip_html(em.get("Artist")),
                        "desc": strip_html(em.get("ImageDescription"))[:600], "credit": strip_html(em.get("Credit"))[:300],
                        "cats": strip_html(em.get("Categories"))[:400],
                        "page": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(p["title"].replace(" ", "_"))})
    return out


def judge(c, w):
    """-> (score or None, reason)"""
    text = " ".join([c["file"], c["artist"], c["desc"], c["credit"], c["cats"]])
    ft = fold(text)
    if not c["license"] or not OK_LIC.search(c["license"]): return None, f"license not allowed: {c['license']!r}"
    if c["mime"] not in MIMES: return None, f"not an audio file: {c['mime']}"
    if BAD.search(text): return None, "MIDI / synth / toy-instrument rendering, or a parody / medley"
    if c["file"] in set(w.get("reject") or []): return None, "rejected in Claude's review"
    if BAD_CATS.search(c["cats"]): return None, "source unknown, or public domain in Europe only"
    if HISTORIC.search(text):
        # the RECORDING's year (release / recording date, the 'Music in YYYY' category), never a composer's or arranger's life dates
        src = c["desc"] + " | " + c["cats"]
        yrs = [int(y) for y in re.findall(r"(?:release date|recording date|recorded)[^0-9|]{0,20}(\d{4})|Music in (\d{4})|(\d{4})s music", src) for y in y if y]
        if not yrs or max(yrs) > 1925: return None, "historical recording after 1925 (or undated): still protected in the US"
    must = [fold(m) for m in w.get("must", [])]
    hit = [m for m in must if m in ft]
    if must and ((w.get("any") and not hit) or (not w.get("any") and len(hit) < len(must))): return None, "not this piece (" + ", ".join(must) + ")"
    if fold(w["composer"].split()[-1]) not in ft and fold(w["composer"].split()[0]) not in ft: return None, "composer not named"
    if c["duration"] is not None and not (60 <= c["duration"] <= 1200): return None, f"length {c['duration']:.0f} s"
    s = 0.0
    if GOOD.search(text): s += 5
    if re.search(r"public domain|^pd|cc0|cc-zero", c["license"], re.I): s += 3
    s += min(3.0, c["size"] / 3e6)
    s += sum(2 for p in w.get("prefer", []) if fold(p) in ft)
    if re.search(r"\.(flac|wav)$", c["file"], re.I): s += 1
    return s, "ok"


def encode(src, dst):
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", src], capture_output=True, text=True)
    dur = float(probe.stdout.strip() or 0)
    af = "loudnorm=I=-20:TP=-2:LRA=11"
    cut = []
    if dur > MAX_SEC:
        af += f",afade=t=out:st={MAX_SEC - 8}:d=8"; cut = ["-t", str(MAX_SEC)]
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, *cut, "-af", af, "-ac", "2", "-ar", "44100", "-c:a", "aac", "-b:a", "96k",
                    "-movflags", "+faststart", dst], check=True)
    return min(dur, MAX_SEC)


def main(argv):
    pos = [a for a in argv if not a.startswith("--")]
    def opt(name, dflt):
        return argv[argv.index(name) + 1] if name in argv else dflt
    wanted = json.load(open(pos[0] if pos else "docs/music/wanted.json", encoding="utf-8"))
    out = opt("--out", "audio/music"); rep_path = opt("--report", "docs/music/intake_report.json"); dry = "--dry" in argv
    os.makedirs(out, exist_ok=True)
    report, tracks = [], []
    for w in wanted["pieces"]:
        titles = list(w.get("files") or [])        # exact Commons file titles (e.g. from Grok's music check) are tried first, same checks apply
        for q in [w["query"], w["query"] + " " + w["composer"].split()[-1], w["title"]]:
            for t in search(q):
                if t not in titles: titles.append(t)
            if len(titles) >= 40: break
        cands = info(titles) if titles else []
        rows = []
        for c in cands:
            sc, why = judge(c, w)
            rows.append(dict(c, score=sc, why=why))
        exact = set(w.get("files") or [])
        for r in rows:
            if r["file"] in exact and r["score"] is not None: r["score"] += 100      # a reviewed exact pick wins when it passes the checks
        ok = sorted([r for r in rows if r["score"] is not None], key=lambda r: -r["score"])
        pick = None
        for r in ok[:3]:
            if dry: pick = r; break
            try:
                with tempfile.TemporaryDirectory() as td:
                    src = os.path.join(td, "in" + os.path.splitext(r["file"])[1])
                    req = urllib.request.Request(r["url"], headers={"User-Agent": UA})
                    with urllib.request.urlopen(req, timeout=300) as resp, open(src, "wb") as fh: fh.write(resp.read())
                    dur = encode(src, os.path.join(out, w["id"] + ".m4a"))
                if dur < 60: raise RuntimeError(f"too short after download ({dur:.0f} s)")
                r["encoded_sec"] = round(dur, 1); pick = r; break
            except Exception as e:      # noqa: BLE001
                r["why"] = f"download/encode failed: {e}"
        report.append({"id": w["id"], "title": w["title"], "picked": pick and pick["file"], "candidates": rows})
        if pick:
            perf = pick["artist"] or pick["credit"] or "see source page"
            tracks.append({"id": w["id"], "title": w["title"], "composer": w["composer"], "performer": perf[:160], "license": pick["license"],
                           "source": pick["page"], "file": w["id"] + ".m4a", "duration": pick.get("encoded_sec") or pick["duration"], "moods": w["moods"]})
        print(f"{w['id']:<28} {'PICK ' + pick['file'] if pick else 'none'}  ({len(ok)} ok of {len(rows)})", flush=True)
        time.sleep(1)
    made = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if not dry:
        json.dump({"schema": "music/1", "made": made, "note": "Recorded classical music (tools/music/fetch_classical.py). Every recording is Public "
                   "Domain, CC0 or CC BY(-SA); credits in CREDITS.md and in the app's Scene Studio.", "tracks": tracks},
                  open(os.path.join(out, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        with open(os.path.join(out, "CREDITS.md"), "w", encoding="utf-8") as fh:
            fh.write("<!-- doc-status: current; normative: no -->\n# Recorded music: credits\n\nEvery recording below comes from Wikimedia Commons "
                     "under the license shown (the composition itself is in the public domain). Loudness-normalised and re-encoded as AAC; "
                     "cut at 7 minutes with a fade where longer.\n\n| Piece | Composer | Performer | License | Source |\n|---|---|---|---|---|\n")
            for t in tracks:
                fh.write(f"| {t['title']} | {t['composer']} | {t['performer']} | {t['license']} | {t['source']} |\n")
    os.makedirs(os.path.dirname(rep_path) or ".", exist_ok=True)
    json.dump({"made": made, "pieces": report}, open(rep_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(tracks)} of {len(wanted['pieces'])} pieces found")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
