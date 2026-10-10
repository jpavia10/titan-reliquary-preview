#!/usr/bin/env python3
"""The intake bridge (fix list #92): the research loop turns without a chat.

    Drive drop folder --(Apps Script web app, tools/drive/intake_bridge.gs)--> GitHub job (.github/workflows/intake.yml) --> this script
    --> publish.py (all the usual gates) --> checks + tests --> push --> Pages
    Apps Script, hourly: reads docs/agents/bridge/processed.json from GitHub, trashes merged files, leaves {name}.REJECTED.txt notes,
    and copies each docs/agents/QUEUE_{ai}.md into its Drive doc "WORK QUEUE for {AI}".

What merges by itself, and what waits for Claude (docs/agents/bridge/INBOX.md):
  - merged automatically: `changes_{agent}_{YYYYMMDD-HHMM}.jsonl` named for an outside AI in docs/agents/roles.json (grok, muse, gemini,
    chatgpt; grok-bot is grok) whose every line is written as that AI (`by: model:<it>`) and never `verified: true`.
  - rejected (the AI gets a .REJECTED.txt note in the drop folder): whatever apply_changes rejects; a file over 3 MB; a line written as
    another AI; a new file under a name that was already merged or rejected.
  - held for Claude, untouched in Drive: owner answers (answers_owner_*.json: they become Verified facts, so a person reads them first),
    files named for Claude, the owner or a script, files with lines written as the owner or marked verified, and everything in a run
    whose publish or checks failed. Other files (notes, photos lists) are only listed.

    python3 tools/bridge/intake.py run (--bridge-url URL | --listing FILE) [--now ISO] [--outcomes FILE] [--dry-run]
        exit 0 = done (state written; commit it), 3 = nothing new, 2 = publish refused (nothing written but --outcomes: run `hold`)
    python3 tools/bridge/intake.py hold --outcomes FILE --reason "why" [--now ISO]   after a failed publish or failed checks (tree reset first)
    python3 tools/bridge/intake.py reviewed NAME [NAME...]                         Claude scored these submissions (rule 2)
    python3 tools/bridge/intake.py resolve NAME (--merged | --rejected "why" | --retry)   Claude handled a held file
    python3 tools/bridge/intake.py inbox                                            re-render INBOX.md from the stored state
"""
import datetime, hashlib, json, os, re, shutil, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import provenance as PV  # noqa: E402

BR = os.path.join(ROOT, "docs", "agents", "bridge")
PROCESSED, RUNS, INBOX, REVIEWED = (os.path.join(BR, n) for n in ("processed.json", "runs.jsonl", "INBOX.md", "reviewed.json"))
INCOMING = os.path.join(ROOT, "collection", "_incoming")
CHANGE_RE = re.compile(r"^changes_([a-z0-9][a-z0-9-]{0,30})_(\d{8})-(\d{4})\.jsonl$")
ANSWERS_RE = re.compile(r"^answers_owner_\d{8}-\d{4}\.json$")
OUR_NOTES = (".REJECTED.txt", ".SUPERSEDED.txt", "REFILED-NOTE")
MAX_BYTES = 3_000_000
KEEP_GONE_DAYS = 7          # a processed entry is forgotten this long after its file left the drop folder
TICK_LATE_H = 3             # INBOX warns when the Apps Script's hourly tick is older than this


def now_utc(): return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _load(p, default=None):
    if not os.path.exists(p): return default
    with open(p, encoding="utf-8") as fh: return json.load(fh)


def _write(p, text):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as fh: fh.write(text)


def _days_between(a, b):
    f = lambda s: datetime.datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")
    return (f(b) - f(a)).total_seconds() / 86400


def auto_agents():
    roles = _load(os.path.join(ROOT, "docs", "agents", "roles.json"), {"agents": {}})
    return set(roles.get("agents", {}))


# ------------------------------------------------------------------------------------------------------------------------- the listing
def fetch_listing(url, tries=3):
    u = url + ("&" if "?" in url else "?") + "op=list"
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(u, timeout=90) as r: data = json.loads(r.read().decode("utf-8"))
            return check_listing(data)
        except Exception as x:          # one bad answer (Apps Script cold start, quota) must not lose the run: retry, then fail loudly
            last = x; time.sleep(5 * (i + 1))
    raise SystemExit(f"the Drive bridge did not answer: {type(last).__name__}: {str(last)[:200]}")


def check_listing(data):
    if not isinstance(data, dict) or data.get("kind") != "titan-bridge/1" or not isinstance(data.get("drop"), list):
        raise SystemExit("the Drive bridge answered, but not with a titan-bridge/1 listing (wrong URL or key?): " + json.dumps(data)[:200])
    if data.get("error"): raise SystemExit("the Drive bridge reported: " + str(data["error"])[:300])
    for f in data["drop"]:
        if not all(isinstance(f.get(k), str) for k in ("id", "name", "updated")): raise SystemExit(f"bad listing entry: {json.dumps(f)[:200]}")
    return data


# ------------------------------------------------------------------------------------------------------------------------- classify
def line_problems(text, agent_key):
    """-> (held_reasons, rejected_reasons). A file named for an AI may only carry that AI's own lines; owner / verified lines go to Claude."""
    held, rej = [], []
    for n, raw in enumerate(text.splitlines(), 1):
        raw = raw.strip()
        if not raw: continue
        try: e = json.loads(raw)
        except ValueError: continue                      # apply_changes rejects it with the line number
        if not isinstance(e, dict): continue
        by = str(e.get("by", ""))
        if by == "owner" or by.startswith(("person:", "script:")): held.append(f"line {n} is written as '{by}'")
        elif e.get("verified") is True: held.append(f"line {n} is marked verified: true")
        elif by.startswith("model:") and PV.agent_of(by) != agent_key: rej.append(f"line {n} is written as '{by}'; a file named for {agent_key} may only carry {agent_key}'s own lines")
    return held[:10], rej[:10]


def sha(text): return hashlib.sha256(text.encode("utf-8")).hexdigest()


HINTS = [   # common rejections -> what to do instead (goes into the AI's .REJECTED.txt note)
    (r"specimen field '(country|denomination|year|mint_mark|class)'",
     "HOW TO FIX: a new coin's country and denomination belong to its TYPE, not to the specimen. Pick the existing type, or create one "
     "({ISO}.X.{denomination}, e.g. GB.X.1-penny), then create the specimen: op create, id NEW-1, field '(new record)', new = {type, year_raw, "
     "issue: {year, mint_marks, mint_text}, story}. Value goes in a separate line (value.est_usd, value.confidence). See "
     "collection/templates/INSTRUCTIONS.md section 3, 'New specimen', and the example files it names."),
    (r"NEW-\d+ (does not exist|is not created|unknown)|specimen NEW-\d+",
     "HOW TO FIX: NEW-1, NEW-2 exist only inside the file that creates them. Put a correction in the same new file (send the whole new coin "
     "again, corrected, under a new time stamp), or wait until the coin has its real C### id."),
    (r"provenance", "HOW TO FIX: the provenance object's format is in collection/templates/INSTRUCTIONS.md section 2 (model, prompt_version, "
                    "workflow, inputs as [{\"file\": ...}], run_id; nothing else, no ts inside)."),
    (r"exact|EXACT_REF|brand", "HOW TO FIX: a catalogue fact needs the exact entry in source: the Numista N# with its URL, or the NGC/PCGS page URL, "
                               "and the row you read."),
]


def hints(report):
    text = " ".join(report or [])
    return [h for rx, h in HINTS if re.search(rx, text)]


def _same(path, text):
    try:
        with open(path, encoding="utf-8") as fh: return fh.read() == text
    except OSError: return False


def classify(f, state, agents):
    """-> (kind, reasons). kind: seen | ignore | other | stage | duplicate | rejected | held."""
    name = f["name"]
    if name.endswith(OUR_NOTES) or any(t in name for t in OUR_NOTES): return "ignore", []
    prev = state["files"].get(f["id"])
    if prev and prev.get("updated") == f["updated"]: return "seen", []
    if ANSWERS_RE.match(name):
        return "held", ["owner answers are merged by Claude: they become Verified facts, so a person reads the file first "
                        "(python3 tools/pipeline/owner_answers.py FILE)"]
    m = CHANGE_RE.match(name)
    if not m: return "other", []
    if f.get("deferred"): return "deferred", []          # the listing was full: the next run reads it, once the files before it are cleaned up
    if f.get("text") is None:
        if (f.get("size") or 0) > MAX_BYTES: return "rejected", [f"the file is {f['size']:,} bytes; send it as files under {MAX_BYTES // 1_000_000} MB"]
        return "held", ["the bridge could not read the file's text" + (f" ({f['note']})" if f.get("note") else "")]
    text = f["text"]
    if len(text.encode("utf-8")) > MAX_BYTES: return "rejected", [f"the file is over {MAX_BYTES // 1_000_000} MB; send it as smaller files"]
    agent_key = PV.agent_of("model:" + m.group(1))
    if agent_key not in agents:
        return "held", [f"files named for '{m.group(1)}' are merged by Claude, not automatically (only the outside AIs' files are)"]
    for sub, word in (("applied", "merged"), ("rejected", "rejected")):
        p = os.path.join(INCOMING, sub, name)
        if os.path.exists(p):
            if _same(p, text): return "duplicate", [f"the same file was already {word}"]
            return "rejected", [f"a file named {name} was already {word}; send new or corrected lines under a new time stamp in the name"]
    if os.path.exists(os.path.join(INCOMING, name)) and not _same(os.path.join(INCOMING, name), text):
        return "held", ["a different file with this name is already waiting in collection/_incoming/"]
    held, rej = line_problems(text, agent_key)
    if rej: return "rejected", rej
    if held: return "held", held + ["Claude checks lines written as the owner, or marked verified, by hand"]
    return "stage", []


# ------------------------------------------------------------------------------------------------------------------------- publish
def parse_publish(out, names):
    """publish.py prints each file's apply report: 'APPLIED name: ...' / 'REJECTED name: ...' / 'WARNING name: ...' / 'name: already ...',
    each followed by indented notes. -> {name: {"head": str, "notes": [str]}}"""
    res, cur = {}, None
    for ln in out.splitlines():
        hit = None
        for nm in names:
            if ln.startswith((f"APPLIED {nm}:", f"REJECTED {nm}:", f"WARNING {nm}:", f"{nm}:")): hit = nm; break
        if hit:
            cur = res.setdefault(hit, {"head": "", "notes": []})
            if not ln.startswith("WARNING"): cur["head"] = ln
            else: cur["notes"].append(ln)
        elif cur is not None and ln.startswith("  "): cur["notes"].append(ln.strip())
        else: cur = None
    return res


def summary_of(head, name):
    s = head.split(": ", 1)[1] if ": " in head else head
    s = re.sub(r",? \d+ file\(s\) updated", "", s)
    return s.strip()


def events_of(head):
    m = re.search(r"(\d+) event\(s\) merged", head or "")
    return int(m.group(1)) if m else 0


def run_publish():
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "pipeline", "publish.py")], capture_output=True, text=True, cwd=ROOT)
    return r.returncode, r.stdout + ("\n" + r.stderr if r.stderr else "")


# ------------------------------------------------------------------------------------------------------------------------- state
def empty_state(): return {"schema": "bridge/1", "updated": None, "files": {}, "last_listing": None}


def load_state():
    st = _load(PROCESSED) or empty_state()
    st.setdefault("files", {}); return st


def entry(f, outcome, now, run_id, summary="", report=None, agent=None):
    e = {"name": f["name"], "agent": agent, "updated": f["updated"], "sha256": sha(f["text"]) if f.get("text") is not None else None,
         "outcome": outcome, "at": now, "run": run_id, "summary": summary[:300]}
    if report: e["report"] = [str(x)[:300] for x in report[:40]]
    return e


def agent_for(name):
    m = CHANGE_RE.match(name)
    return PV.agent_of("model:" + m.group(1)) if m else ("owner" if ANSWERS_RE.match(name) else None)


def snapshot(listing, now):
    """What INBOX.md needs from the last listing (never the files' text)."""
    return {"at": now, "made": listing.get("made"), "tick": listing.get("tick"),
            "drop": [{k: f.get(k) for k in ("id", "name", "size", "updated")} for f in listing["drop"]],
            "staging": listing.get("staging"), "bakeoff": listing.get("bakeoff")}


def prune(state, listing, now):
    present = {f["id"] for f in listing["drop"]}
    for i in [i for i, e in state["files"].items() if i not in present and _days_between(e["at"], now) > KEEP_GONE_DAYS]:
        del state["files"][i]


def save(state, run, listing, now):
    state["updated"] = now
    if listing is not None: state["last_listing"] = snapshot(listing, now)
    _write(PROCESSED, json.dumps(state, ensure_ascii=False, indent=1) + "\n")
    if run is not None:
        os.makedirs(BR, exist_ok=True)
        with open(RUNS, "a", encoding="utf-8", newline="\n") as fh: fh.write(json.dumps(run, ensure_ascii=False) + "\n")
    _write(INBOX, inbox(state, now))


# ------------------------------------------------------------------------------------------------------------------------- inbox
def _runs(limit=200):
    if not os.path.exists(RUNS): return []
    with open(RUNS, encoding="utf-8") as fh: rows = [json.loads(l) for l in fh if l.strip()]
    return rows[-limit:]


def recent_for(agent, n=5, root=None):
    """The last n outcomes of this AI's files (homework.py puts them on its WORK QUEUE page)."""
    p = os.path.join(root or ROOT, "docs", "agents", "bridge", "runs.jsonl")
    if not os.path.exists(p): return []
    with open(p, encoding="utf-8") as fh: rows = [json.loads(l) for l in fh if l.strip()]
    out = [dict(f, at=r["at"]) for r in rows for f in r.get("files", []) if f.get("agent") == agent and f.get("outcome") != "seen"]
    return out[-n:][::-1]


def inbox(state, now):
    rev = set((_load(REVIEWED) or {}).get("names", []))
    ll = state.get("last_listing") or {}
    tick = (ll.get("tick") or {}).get("at")
    L = ["<!-- doc-status: current; normative: yes (for Claude); generated by tools/bridge/intake.py: do not edit -->",
         f"# Intake bridge: what waits for Claude (updated {now[:16].replace('T', ' ')} UTC)", "",
         "Once installed (docs/INTAKE_BRIDGE.md), the bridge merges the outside AIs' change files by itself, about once an hour. Read this at the start of every session.", ""]
    L += ["## Bridge health", ""]
    if not ll: L.append("- No listing yet: the Drive bridge is not installed or has not answered (secrets DRIVE_BRIDGE_URL + DRIVE_BRIDGE_KEY, docs/INTAKE_BRIDGE.md).")
    else:
        L.append(f"- Last listing from Drive: {str(ll.get('made') or ll.get('at'))[:16].replace('T', ' ')} UTC.")
        if tick:
            late = _days_between(tick, now) * 24
            L.append(f"- Apps Script hourly tick: {tick[:16].replace('T', ' ')} UTC" + (f" **(late: {late:.0f} h; check the trigger in script.google.com)**" if late > TICK_LATE_H else " (on time)") + ".")
            if (ll.get("tick") or {}).get("errors"): L.append("- Its last errors: " + "; ".join(str(x)[:160] for x in ll["tick"]["errors"][:5]))
        else: L.append("- The Apps Script has not reported an hourly tick yet (run installAll once).")
    runs = _runs()
    if runs:
        r = runs[-1]
        L.append(f"- Last run {r['run']} at {r['at'][:16].replace('T', ' ')} UTC: publish {r.get('publish')}; " +
                 ", ".join(f"{len(r.get(k, []))} {k}" for k in ("merged", "rejected", "held", "duplicate")) + ".")
    files = sorted(state["files"].values(), key=lambda e: e["at"])
    score = [e for e in files if e["outcome"] == "merged" and e["name"] not in rev]
    L += ["", f"## Score these (rule 2): {len(score)}", ""]
    L += [f"- `{e['name']}` ({PV.NAMES.get(e['agent'], e['agent'])}, merged {e['at'][:16].replace('T', ' ')}): {e['summary']}" for e in score] or ["- Nothing new."]
    if score: L += ["", "Score each in collaborators/CONTRIBUTOR_SCORES.md and its FEEDBACK doc, then: `python3 tools/bridge/intake.py reviewed NAME...`"]
    held = [e for e in files if e["outcome"] == "held"]
    L += ["", f"## Held for Claude (left in the drop folder): {len(held)}", ""]
    for e in held:
        L.append(f"- `{e['name']}` ({e['at'][:16].replace('T', ' ')}): " + "; ".join(e.get("report") or [e["summary"]]))
    if not held: L.append("- Nothing held.")
    rej = [e for e in files if e["outcome"] == "rejected"]
    L += ["", f"## Rejected (the AI gets a .REJECTED.txt note): {len(rej)}", ""]
    L += [f"- `{e['name']}` ({e['at'][:16].replace('T', ' ')}): {e['summary']}" + (f" (+{k - 1} more)" if (k := sum(1 for x in e.get("report") or [] if x.startswith("  "))) > 1 else "")
          for e in rej] or ["- None."]
    seen = {e["name"] for e in files}
    other = [f for f in (ll.get("drop") or []) if f["name"] not in seen and not f["name"].endswith(OUR_NOTES) and not any(t in f["name"] for t in OUR_NOTES)
             and not CHANGE_RE.match(f["name"])]
    L += ["", f"## Other files in the drop folder (not change files; read them): {len(other)}", ""]
    L += [f"- `{f['name']}` ({str(f.get('updated'))[:16].replace('T', ' ')})" for f in other] or ["- None."]
    for key, title in (("staging", "Photos waiting in STAGING (Claude files and cuts them)"), ("bakeoff", "Blind photo tests waiting to be scored")):
        s = ll.get(key) or {}
        L += ["", f"## {title}: {s.get('count', 0)}", ""]
        L += [f"- {x['name']} ({str(x.get('updated'))[:16].replace('T', ' ')})" for x in (s.get("newest") or [])[:20]] or ["- None."]
    return "\n".join(L).rstrip() + "\n"


# ------------------------------------------------------------------------------------------------------------------------- commands
def cmd_run(argv):
    now = argv[argv.index("--now") + 1] if "--now" in argv else now_utc()
    dry = "--dry-run" in argv
    outcomes_path = argv[argv.index("--outcomes") + 1] if "--outcomes" in argv else None
    if "--listing" in argv: listing = check_listing(_load(argv[argv.index("--listing") + 1]))
    elif "--bridge-url" in argv: listing = fetch_listing(argv[argv.index("--bridge-url") + 1])
    else: raise SystemExit("give --bridge-url URL or --listing FILE")
    run_id = f"bridge-{now[:19].replace('-', '').replace(':', '').replace('T', '-')}" + (f"-gh{os.environ['GITHUB_RUN_ID']}" if os.environ.get("GITHUB_RUN_ID") else "")
    state = load_state(); agents = auto_agents()
    plan = []
    for f in sorted(listing["drop"], key=lambda f: f["name"]):
        kind, reasons = classify(f, state, agents)
        plan.append((f, kind, reasons))
    todo = [p for p in plan if p[1] not in ("seen", "ignore", "other", "deferred")]
    if any(p[1] == "deferred" for p in plan): print(f"{sum(1 for p in plan if p[1] == 'deferred')} file(s) deferred to the next run (listing size cap)")
    if not todo:
        print(f"nothing new in the drop folder ({sum(1 for p in plan if p[1] == 'seen')} file(s) already handled, {sum(1 for p in plan if p[1] == 'other')} other)")
        return 3
    staged = [f for f, k, _ in todo if k == "stage"]
    results = {}
    for f, k, reasons in todo:
        if k != "stage": results[f["name"]] = (k, "; ".join(reasons), reasons)
    pub = "not run"
    if staged and not dry:
        os.makedirs(INCOMING, exist_ok=True)
        for f in staged: _write(os.path.join(INCOMING, f["name"]), f["text"])
        rc, out = run_publish()
        print(out)
        rep = parse_publish(out, [f["name"] for f in staged])
        if rc != 0:
            pub = "refused"
            tail = [ln for ln in out.strip().splitlines() if ln.strip()][-12:]
            for f in staged: results[f["name"]] = ("held", "publish refused after the merge", ["publish refused after the merge; the run was reset:"] + tail)
        else:
            pub = "ok"
            for f in staged:
                nm = f["name"]; r = rep.get(nm, {"head": "", "notes": []})
                if os.path.exists(os.path.join(INCOMING, "applied", nm)):
                    results[nm] = ("merged", summary_of(r["head"], nm) or "merged", r["notes"])
                elif os.path.exists(os.path.join(INCOMING, "rejected", nm)):
                    rpt = _load_text(os.path.join(INCOMING, "rejected", nm + ".report.txt")).splitlines() or [r["head"]]
                    first = next((x.strip() for x in rpt[1:] if x.strip() and not x.strip().startswith("notes:")), rpt[0])
                    results[nm] = ("rejected", first, rpt + hints(rpt))
                else: results[nm] = ("held", "publish did not process the file", [r["head"]] + r["notes"])
    elif staged and dry:
        for f in staged: results[f["name"]] = ("stage", "would merge", [])
    run = {"run": run_id, "at": now, "publish": pub, "bridge_tick": (listing.get("tick") or {}).get("at"), "files": []}
    staged_names = {f["name"] for f in staged}
    for f, k, _ in todo:
        outcome, summ, rpt = results[f["name"]]
        ag = agent_for(f["name"])
        x = {"name": f["name"], "agent": ag, "outcome": outcome, "summary": summ[:300], "staged": f["name"] in staged_names}
        if outcome == "merged": x["events"] = events_of(summ)
        run["files"].append(x)
        state["files"][f["id"]] = entry(f, outcome, now, run_id, summ, rpt if outcome in ("rejected", "held") else [r for r in rpt if r.startswith("WARNING")][:5], ag)
    for k in ("merged", "rejected", "held", "duplicate"): run[k] = [x["name"] for x in run["files"] if x["outcome"] == k]
    run["events"] = sum(x.get("events", 0) for x in run["files"])
    if outcomes_path: _write(outcomes_path, json.dumps({"run": run, "drop": {f["id"]: f for f, _, _ in todo}, "listing": snapshot(listing, now)}, ensure_ascii=False))
    print(f"\n==== bridge {run_id} ====\npublish {pub}; merged {len(run['merged'])} ({run['events']} events), rejected {len(run['rejected'])}, "
          f"held {len(run['held'])}, duplicate {len(run['duplicate'])}")
    for x in run["files"]: print(f"  {x['outcome']:<9} {x['name']}: {x['summary'][:160]}")
    if dry: return 0
    if pub == "refused": return 2
    prune(state, listing, now)
    save(state, run, listing, now)
    # re-render the AIs' pages so each one sees what happened to its file (publish turned the loop before the outcomes were known)
    hw = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "agents", "homework.py"), "--now", now], capture_output=True, text=True, cwd=ROOT)
    if hw.returncode != 0: print("WARNING: homework.py failed after the merge:\n" + (hw.stdout + hw.stderr)[-1500:])
    commit_msg = message(run)
    _write(os.path.join(BR, ".commit_message"), commit_msg)
    return 0


def _load_text(p):
    try:
        with open(p, encoding="utf-8") as fh: return fh.read()
    except OSError: return ""


def message(run):
    by = sorted({PV.NAMES.get(x["agent"], x["agent"] or "?") for x in run["files"] if x["outcome"] == "merged"})
    parts = [f"merged {len(run['merged'])} file(s)" + (f" from {', '.join(by)}" if by else "") + f" ({run['events']} events)"]
    for k in ("rejected", "held", "duplicate"):
        if run[k]: parts.append(f"{len(run[k])} {k}")
    return "intake: " + "; ".join(parts) + f"\n\n{run['run']} (tools/bridge/intake.py, docs/agents/bridge/INBOX.md)\n"


def cmd_hold(argv):
    now = argv[argv.index("--now") + 1] if "--now" in argv else now_utc()
    o = _load(argv[argv.index("--outcomes") + 1])
    reason = argv[argv.index("--reason") + 1] if "--reason" in argv else "the checks after the merge failed"
    state = load_state(); run = o["run"]; run["publish"] = run.get("publish", "?") + f" -> held: {reason}"
    for x in run["files"]:
        if x.get("staged"):               # everything this run merged or rejected is undone by the reset: Claude looks at it
            x.update(outcome="held", summary=f"held: {reason}"); x.pop("events", None)
    for k in ("merged", "rejected", "held", "duplicate"): run[k] = [x["name"] for x in run["files"] if x["outcome"] == k]
    run["events"] = 0
    for i, f in o["drop"].items():
        x = next(r for r in run["files"] if r["name"] == f["name"])
        state["files"][i] = entry(f, x["outcome"], now, run["run"], x["summary"], [x["summary"]] if x["outcome"] == "held" else (state["files"].get(i) or {}).get("report"), x["agent"])
    state["last_listing"] = o.get("listing") or state.get("last_listing")
    save(state, run, None, now)
    _write(os.path.join(BR, ".commit_message"), f"intake: held {len(run['held'])} file(s) for Claude ({reason})\n\n{run['run']}\n")
    print(f"held {len(run['held'])} file(s): {reason}")
    return 0


def cmd_reviewed(argv):
    names = [a for a in argv if not a.startswith("--")]
    r = _load(REVIEWED) or {"names": []}
    r["names"] = sorted(set(r["names"]) | set(names))
    _write(REVIEWED, json.dumps(r, ensure_ascii=False, indent=1) + "\n")
    _write(INBOX, inbox(load_state(), now_utc()))
    print(f"{len(names)} marked as scored")
    return 0


def cmd_resolve(argv):
    """Claude handled a held file by hand: --merged (it merged it), --rejected "why" (the AI gets the note), --retry (let the bridge try again)."""
    names = [a for a in argv if not a.startswith("--") and not (argv.index(a) > 0 and argv[argv.index(a) - 1] == "--rejected")]
    state = load_state(); now = now_utc(); n = 0
    for i, e in list(state["files"].items()):
        if e["name"] not in names: continue
        if "--retry" in argv: del state["files"][i]
        elif "--merged" in argv: e.update(outcome="merged", at=now, summary="merged by Claude"); e.pop("report", None)
        elif "--rejected" in argv:
            why = argv[argv.index("--rejected") + 1]
            e.update(outcome="rejected", at=now, summary=why, report=[why])
        else: raise SystemExit("say --merged, --rejected \"why\" or --retry")
        n += 1
    if not n: raise SystemExit(f"no bridge record for {', '.join(names)}")
    save(state, None, None, now)
    print(f"{n} record(s) updated; the Drive side acts on its next tick (commit and push docs/agents/bridge/)")
    return 0


def main(argv):
    if not argv: print(__doc__); return 1
    cmd, rest = argv[0], argv[1:]
    if cmd == "run": return cmd_run(rest)
    if cmd == "hold": return cmd_hold(rest)
    if cmd == "reviewed": return cmd_reviewed(rest)
    if cmd == "resolve": return cmd_resolve(rest)
    if cmd == "inbox": _write(INBOX, inbox(load_state(), now_utc())); return 0
    print(__doc__); return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
