"""Write docs/fleet/fleet-claude.json: Claude's status for Joseph's Fleet Command dashboard (Drive folder 'Fleet Command',
spec 'START HERE - Fleet Command.md'). Only facts it can check: the Titan scheduled jobs and their last run (GitHub API, when
reachable), Claude's recent commits on main, and the live work named on the command line. Nothing is guessed: a job whose
last run cannot be read gets last_run null and last_status "never".

usage (repo root):
    python3 tools/fleet/fleet_status.py [--live "name|task"]...    (no --live = docked: "live": [])
"""
import datetime, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "docs", "fleet", "fleet-claude.json")
REPO = "jpavia10/titan-reliquary-preview"
JOBS = [  # (workflow file, display name, schedule as people read it)
    ("intake.yml", "Hourly intake of the other AIs' change files", "hourly at :23 UTC"),
    ("prices.yml", "Daily metal prices and portfolio value", "daily 22:15 UTC"),
    ("backup-zip.yml", "Daily site backup zip", "daily 09:20 UTC"),
    ("restore-drill.yml", "Monthly restore drill from the backup", "monthly, 3rd at 10:40 UTC"),
]


def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def git(*a):
    return subprocess.run(["git", "-C", ROOT, *a], capture_output=True, text=True).stdout


def last_run(wf):
    try:
        r = subprocess.run(["gh", "api", f"repos/{REPO}/actions/workflows/{wf}/runs?per_page=1&status=completed"],
                           capture_output=True, text=True, timeout=30)
        runs = json.loads(r.stdout).get("workflow_runs") or []
    except Exception:
        return None, "never"
    if not runs:
        return None, "never"
    return runs[0]["updated_at"], "ok" if runs[0]["conclusion"] == "success" else "error"


def main(argv):
    live = []
    for i, a in enumerate(argv):
        if a == "--live" and i + 1 < len(argv):
            name, _, task = argv[i + 1].partition("|")
            live.append({"id": "session-" + now()[:16].replace(":", "").replace("-", ""), "name": name, "project": "titan",
                         "task": task or name, "status": "running", "started_at": now(), "elapsed_s": 0, "last_activity_s": 0})
    scheduled = []
    for wf, name, sched in JOBS:
        at, st = last_run(wf)
        scheduled.append({"id": wf.removesuffix(".yml"), "name": name, "project": "titan", "schedule": sched,
                          "last_run": at, "last_status": st, "next_run": None})
    recent = []
    for line in git("log", "origin/main", "--author=Claude", "-15", "--format=%h|%cI|%s").splitlines():
        h, at, subj = line.split("|", 2)
        at = datetime.datetime.fromisoformat(at).astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        recent.append({"id": h, "name": subj[:80], "project": "titan", "status": "done", "completed_at": at, "summary": subj})
    feed = {"ai": "claude", "label": "Claude", "updated_at": now(),
            "specialists": [{"id": "titan", "name": "Titan Integrator", "specialty": "titan",
                             "status": "on_duty" if live else "standby"}],
            "live": live, "scheduled": scheduled, "recent": recent}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(feed, fh, indent=2, ensure_ascii=False); fh.write("\n")
    print(f"wrote {os.path.relpath(OUT, ROOT)}: {len(live)} live, {len(scheduled)} scheduled, {len(recent)} recent")


if __name__ == "__main__":
    main(sys.argv[1:])
