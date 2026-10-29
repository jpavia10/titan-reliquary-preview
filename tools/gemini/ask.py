#!/usr/bin/env python3
"""Ask a Gemini model from the session (CLAUDE.md rule 13: the owner's free-tier key, used to save Claude's own tokens).

  python3 tools/gemini/ask.py --prompt BRIEF.md [--file F ...] [--model gemini-3.6-flash] [--out OUT] [--code] [--max-tokens N]
  python3 tools/gemini/ask.py --text "one line question"

The key comes from $GEMINI_API_KEY or ~/.gemini_key (never from the repository; a new session copies it from the Drive file named in
CLAUDE.md rule 13). Each --file is appended as "=== FILE: path ===" + its text. The answer streams (server-sent events), so a long answer
is not lost to an idle connection; network errors, 429 and 5xx are retried 4 times (2, 4, 8, 16 s). --code keeps only the longest
fenced code block. One line goes to stdout: model, tokens in/out, finish reason. Exit 0 = the answer finished (STOP); 2 = cut short.
Everything Gemini writes passes the same checks as any contributor's work before it is used.
"""
import argparse, json, os, re, ssl, sys, time, urllib.error, urllib.request

API = "https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse"


def key():
    k = os.environ.get("GEMINI_API_KEY") or ""
    p = os.path.expanduser("~/.gemini_key")
    if not k and os.path.exists(p): k = open(p).read().strip()
    if not k: sys.exit("no key: set GEMINI_API_KEY or write ~/.gemini_key (CLAUDE.md rule 13)")
    return k


def context():
    for f in (os.environ.get("SSL_CERT_FILE"), os.environ.get("REQUESTS_CA_BUNDLE"), "/root/.ccr/ca-bundle.crt"):
        if f and os.path.exists(f): return ssl.create_default_context(cafile=f)
    return ssl.create_default_context()


def ask(text, model, max_tokens, temperature, system=None):
    body = {"contents": [{"role": "user", "parts": [{"text": text}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature}}
    if system: body["systemInstruction"] = {"parts": [{"text": system}]}
    data = json.dumps(body).encode()
    for attempt in range(5):
        out, finish, usage = [], None, {}
        try:
            req = urllib.request.Request(API % model, data=data, headers={"Content-Type": "application/json", "x-goog-api-key": key()})
            with urllib.request.urlopen(req, timeout=600, context=context()) as r:
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
            msg = e.read().decode("utf-8", "replace")[:400]
            if e.code not in (429, 500, 502, 503, 504) or attempt == 4: sys.exit("HTTP %d: %s" % (e.code, msg))
        except Exception as e:  # dropped connection, timeout
            if attempt == 4: sys.exit("failed: %s" % e)
        time.sleep(2 ** (attempt + 1))


def longest_block(s):
    blocks = re.findall(r"```[a-zA-Z0-9_-]*\n(.*?)```", s, re.S)
    return max(blocks, key=len) if blocks else s


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--prompt"); a.add_argument("--text"); a.add_argument("--system"); a.add_argument("--file", action="append", default=[])
    a.add_argument("--model", default="gemini-3.6-flash"); a.add_argument("--out"); a.add_argument("--code", action="store_true")
    a.add_argument("--max-tokens", type=int, default=65536); a.add_argument("--temperature", type=float, default=0.2)
    o = a.parse_args()
    text = (open(o.prompt, encoding="utf-8").read() if o.prompt else "") + (o.text or "")
    for f in o.file: text += "\n\n=== FILE: %s ===\n%s" % (f, open(f, encoding="utf-8").read())
    system = open(o.system, encoding="utf-8").read() if o.system else None
    ans, finish, usage = ask(text, o.model, o.max_tokens, o.temperature, system)
    if o.code: ans = longest_block(ans)
    if o.out: open(o.out, "w", encoding="utf-8").write(ans)
    else: sys.stdout.write(ans + "\n")
    print("%s: %s in, %s out, finish %s" % (o.model, usage.get("promptTokenCount"), usage.get("candidatesTokenCount"), finish), file=sys.stderr if not o.out else sys.stdout)
    sys.exit(0 if finish == "STOP" else 2)


if __name__ == "__main__":
    main()
