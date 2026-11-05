#!/usr/bin/env python3
"""Make an image with a Gemini image model on the owner's keys (CLAUDE.md rule 13; rule 9: images come from an image AI, never drawn in code).

  python3 tools/gemini/image.py --prompt "..." --out /path/out.png [--model gemini-3-pro-image] [--aspect 1:1] [--image ref.png ...]

Tries each key in turn (~/.gemini_key, ~/.gemini_key_old, ~/.gemini_key_3) and the next model in --fallback when one is out of quota.
Prints one line: model, key number, bytes written. Exit 1 when no key and model could make it.
"""
import argparse, base64, json, mimetypes, os, sys, urllib.error, urllib.request

API = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"
KEY_FILES = ("~/.gemini_key", "~/.gemini_key_old", "~/.gemini_key_3")


def keys():
    out = [os.environ["GEMINI_API_KEY"]] if os.environ.get("GEMINI_API_KEY") else []
    for f in KEY_FILES:
        p = os.path.expanduser(f)
        if os.path.exists(p):
            out.append(open(p).read().strip())
    return out


def make(prompt, model, key, aspect, refs):
    parts = [{"text": prompt}]
    for r in refs:
        parts.append({"inline_data": {"mime_type": mimetypes.guess_type(r)[0] or "image/png", "data": base64.b64encode(open(r, "rb").read()).decode()}})
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": {"aspectRatio": aspect}}}
    req = urllib.request.Request(API % model, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=240) as r:
        d = json.load(r)
    for c in d.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            blob = p.get("inline_data") or p.get("inlineData")
            if blob and blob.get("data"):
                return base64.b64decode(blob["data"])
    raise RuntimeError("no image in the answer: " + json.dumps(d)[:300])


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--prompt", required=True); a.add_argument("--out", required=True)
    a.add_argument("--model", default="gemini-3-pro-image"); a.add_argument("--fallback", default="gemini-3.1-flash-image,gemini-2.5-flash-image")
    a.add_argument("--aspect", default="1:1"); a.add_argument("--image", action="append", default=[])
    o = a.parse_args()
    prompt = open(o.prompt).read() if os.path.exists(o.prompt) else o.prompt
    last = ""
    for model in [o.model] + [m for m in o.fallback.split(",") if m]:
        for i, k in enumerate(keys(), 1):
            try:
                data = make(prompt, model, k, o.aspect, o.image)
                open(o.out, "wb").write(data)
                print(f"{model} key{i} {len(data)} bytes -> {o.out}")
                return 0
            except urllib.error.HTTPError as e:
                last = f"{model} key{i}: HTTP {e.code} {e.read()[:200]!r}"
            except Exception as e:  # noqa: BLE001
                last = f"{model} key{i}: {e}"[:300]
            print(last, file=sys.stderr)
    print("FAILED: " + last, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
