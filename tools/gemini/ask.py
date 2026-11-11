#!/usr/bin/env python3
"""Ask a Gemini model from the session (CLAUDE.md rule 13: the owner's free-tier key, used to save Claude's own tokens).

  python3 tools/gemini/ask.py --prompt BRIEF.md [--file F ...] [--model gemini-3.6-flash] [--out OUT] [--code] [--max-tokens N]
  python3 tools/gemini/ask.py --text "one line question"

The keys come from $GEMINI_API_KEY, ~/.gemini_key_old, ~/.gemini_key_3 and ~/.gemini_key (never from the repository; a new session copies them from the
Drive files named in CLAUDE.md rule 13). Owner, 2026-11-11: "Only use the gemini paid stuff with best models like carbon. Use my free stuff as much as
you want / possible": the two free keys go first for every model, and the Titan key (~/.gemini_key, paid since 2026-11-09) is tried only for the
best models (BEST below) once the free keys cannot answer; any other model stops when the free keys are out of quota. A call moves on to the next
key when one is out of quota, has no free quota for the model (limit 0) or lacks the model. Each --file is appended as "=== FILE: path ===" + its text; each --image is sent as a picture the model sees. The answer streams (server-sent events), so a long answer
is not lost to an idle connection; network errors, 429 and 5xx are retried 4 times (2, 4, 8, 16 s). --code keeps only the longest
fenced code block. --thinking caps the model's thinking (auto: low on 3 Flash and the lite models). One line goes to stdout: model, tokens in/out, finish reason. Exit 0 = the answer finished (STOP); 2 = cut short.
Everything Gemini writes passes the same checks as any contributor's work before it is used.
"""
import argparse, base64, json, mimetypes, os, re, ssl, sys, time, urllib.error, urllib.request

API = "https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse"


FREE_KEY_FILES = ("~/.gemini_key_old", "~/.gemini_key_3")   # the owner's two free keys (2026-11-01), each its own Google project with its own
                                                             # daily quota: used first and as much as they allow (owner, 2026-11-11)
PAID_KEY_FILE = "~/.gemini_key"                              # the Titan key: paid tier since 2026-11-09 ($5 + $10 bonus); only for BEST
BEST = ("gemini-4-carbon", "gemini-4-argon",                 # the best text models; the free tier has none of their quota (limit 0, 2026-11-11)
        "gemini-3-pro-image", "gemini-3-pro-image-preview", "nano-banana-pro-preview")   # the best image model (Nano Banana Pro)


def paid_ok(model): return model in BEST


def keys(model=None):
    """The keys a call to `model` may use, in order: $GEMINI_API_KEY, the free keys, then the paid Titan key only when the model is one of BEST
    (owner, 2026-11-11). A call moves to the next key when one is out of quota or the model is closed to it."""
    out = [os.environ["GEMINI_API_KEY"]] if os.environ.get("GEMINI_API_KEY") else []
    for f in FREE_KEY_FILES + ((PAID_KEY_FILE,) if paid_ok(model) else ()):
        p = os.path.expanduser(f)
        if os.path.exists(p):
            k = open(p).read().strip()
            if k and k not in out: out.append(k)
    if not out: sys.exit("no key: write ~/.gemini_key_old and ~/.gemini_key_3 from Drive (CLAUDE.md rule 13)")
    return out


def key(model=None): return keys(model)[0]


def context():
    for f in (os.environ.get("SSL_CERT_FILE"), os.environ.get("REQUESTS_CA_BUNDLE"), "/root/.ccr/ca-bundle.crt"):
        if f and os.path.exists(f): return ssl.create_default_context(cafile=f)
    return ssl.create_default_context()


def ask(text, model, max_tokens, temperature, system=None, thinking=None, images=()):
    parts = [{"text": text}] + [{"inline_data": {"mime_type": mimetypes.guess_type(f)[0] or "image/png", "data": base64.b64encode(open(f, "rb").read()).decode()}} for f in images]
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature}}
    if thinking: body["generationConfig"]["thinkingConfig"] = {"thinkingLevel": thinking}   # its thinking counts against maxOutputTokens
    if system: body["systemInstruction"] = {"parts": [{"text": system}]}
    data = json.dumps(body).encode()
    ks = keys(model); ki = 0
    for attempt in range(5 + len(ks)):
        out, finish, usage = [], None, {}
        try:
            req = urllib.request.Request(API % model, data=data, headers={"Content-Type": "application/json", "x-goog-api-key": ks[ki]})
            with urllib.request.urlopen(req, timeout=240, context=context()) as r:   # a stream silent for 4 minutes has stalled
                for raw in r:
                    line = raw.decode("utf-8", "replace").strip()
                    if not line.startswith("data:"): continue
                    o = json.loads(line[5:])
                    for c in o.get("candidates", [])[:1]:
                        for part in (c.get("content") or {}).get("parts", []):
                            if part.get("text") and not part.get("thought"): out.append(part["text"])
                        finish = c.get("finishReason") or finish
                    usage = o.get("usageMetadata") or usage
            return "".join(out), finish, usage
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:4000]
            daily = e.code == 429 and any(x in msg for x in ("free_tier", "PerDay", "limit: 0"))   # the day's quota, or no free quota for this model
            closed = e.code == 404 and "no longer available" in msg                     # a model retired for newer keys
            if (daily or closed) and ki + 1 < len(ks): ki += 1; continue                  # the next key has its own quota and models
            if daily and not paid_ok(model): sys.exit("HTTP 429: the free keys are out of quota for %s; the paid key is only for %s (owner, 2026-11-11)" % (model, ", ".join(BEST[:2])))
            if e.code not in (429, 500, 502, 503, 504) or attempt >= 4 + ki or daily: sys.exit("HTTP %d: %s" % (e.code, msg[:400]))
        except Exception as e:  # dropped connection, timeout (a stalled model is tried twice, not five times)
            if attempt >= 4 + ki or ("timed out" in str(e) and attempt >= 1 + ki): sys.exit("failed: %s" % e)
        time.sleep(2 ** (attempt + 1))


def longest_block(s):
    blocks = re.findall(r"```[a-zA-Z0-9_-]*\n(.*?)```", s, re.S)
    return max(blocks, key=len) if blocks else s


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--prompt"); a.add_argument("--text"); a.add_argument("--system"); a.add_argument("--file", action="append", default=[]); a.add_argument("--image", action="append", default=[], help="an image the model looks at (png/jpg/webp)")
    a.add_argument("--model", default="gemini-3.6-flash"); a.add_argument("--out"); a.add_argument("--code", action="store_true")
    a.add_argument("--max-tokens", type=int, default=65536); a.add_argument("--temperature", type=float, default=0.2)
    a.add_argument("--thinking", default="auto", help="low | medium | high | none; auto = low for gemini-3-flash-preview and the lite models (mechanical work)")
    o = a.parse_args()
    text = (open(o.prompt, encoding="utf-8").read() if o.prompt else "") + (o.text or "")
    for f in o.file: text += "\n\n=== FILE: %s ===\n%s" % (f, open(f, encoding="utf-8").read())
    system = open(o.system, encoding="utf-8").read() if o.system else None
    th = o.thinking if o.thinking not in ("auto", "none") else (("low" if o.model == "gemini-3-flash-preview" or "lite" in o.model else None) if o.thinking == "auto" else None)
    ans, finish, usage = ask(text, o.model, o.max_tokens, o.temperature, system, th, o.image)
    if o.code: ans = longest_block(ans)
    if o.out: open(o.out, "w", encoding="utf-8").write(ans)
    else: sys.stdout.write(ans + "\n")
    print("%s: %s in, %s out, finish %s" % (o.model, usage.get("promptTokenCount"), usage.get("candidatesTokenCount"), finish), file=sys.stderr if not o.out else sys.stdout)
    sys.exit(0 if finish == "STOP" else 2)


if __name__ == "__main__":
    main()
