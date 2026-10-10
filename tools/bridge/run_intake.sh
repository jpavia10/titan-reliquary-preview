#!/usr/bin/env bash
# The intake job (fix list #92). Called by .github/workflows/intake.yml from a fresh checkout of main; also runs locally for rehearsals.
#
#   BRIDGE_URL + BRIDGE_KEY  the Drive bridge's web app URL (".../exec", GitHub secret DRIVE_BRIDGE_URL) and its key (DRIVE_BRIDGE_KEY);
#             or BRIDGE = the URL with ?key=... already on it (rehearsals)
#   GH_TOKEN  + REPO (owner/name): start the Pages build and the integrity + smoke runs after a push (a push with the default token
#             starts neither); left out locally
#   INTAKE_FAST=1        rehearsals only: skip the slow test suites (the chain, validate and homework checks always run)
#   INTAKE_EXTRA_CHECK   rehearsals only: one more check command (e.g. "false" to rehearse the hold path)
#
# 1. tools/bridge/intake.py run: classify the drop folder, merge the outside AIs' files with publish.py, record every outcome
# 2. the same checks as integrity.yml (+ parity and the bridge's own test); any failure, or a refused publish: reset to main and only
#    record the files as held for Claude (docs/agents/bridge/INBOX.md); the run then ends red
# 3. commit + push (main moved meanwhile: replay on top when the commits touch different files, else leave it to the next run)
# 4. Pages build, integrity + smoke runs, and a tick to the Drive side (it trashes merged files, leaves .REJECTED.txt notes and copies
#    the new WORK QUEUE pages into the AIs' Drive docs at once, instead of at its next hourly run)
set -uo pipefail
cd "$(dirname "$0")/../.."
if [ -z "${BRIDGE:-}" ] && [ -n "${BRIDGE_URL:-}" ] && [ -n "${BRIDGE_KEY:-}" ]; then
  u=$(printf '%s' "$BRIDGE_URL" | tr -d '[:space:]'); k=$(printf '%s' "$BRIDGE_KEY" | tr -d '[:space:]')
  case "$u" in *\?*) BRIDGE="$u&key=$k" ;; *) BRIDGE="$u?key=$k" ;; esac
fi
: "${BRIDGE:?the Drive bridge is not set (BRIDGE_URL + BRIDGE_KEY, or BRIDGE)}"
TMPD="${RUNNER_TEMP:-$(mktemp -d)}"; OUT="$TMPD/outcomes.json"
BEFORE=$(git rev-parse HEAD)

checks() {
  python3 tools/pipeline/chain.py verify collection --against "$1" || return 1
  python3 tools/schema/validate.py collection/ >/dev/null || { python3 tools/schema/validate.py collection/ | tail -20; return 1; }
  python3 tools/agents/homework.py --check || return 1
  if [ -z "${INTAKE_FAST:-}" ]; then
    for t in tools/agents/test_homework.py tools/pipeline/test_migrations.py tools/pipeline/test_pipeline.py tools/pipeline/test_parity.py tools/bridge/test_intake.py; do
      echo "== $t"; python3 "$t" > "$TMPD/test.log" 2>&1 || { tail -40 "$TMPD/test.log"; echo "FAILED: $t"; return 1; }
      tail -3 "$TMPD/test.log"
    done
  fi
  if [ -n "${INTAKE_EXTRA_CHECK:-}" ]; then bash -c "$INTAKE_EXTRA_CHECK" || return 1; fi
  return 0
}

python3 tools/bridge/intake.py run --bridge-url "$BRIDGE" --outcomes "$OUT"; rc=$?
case $rc in
  3) exit 0 ;;                                     # nothing new
  0|2) ;;
  *) echo "::error::tools/bridge/intake.py stopped (exit $rc); nothing was merged or recorded"; exit "$rc" ;;
esac

held=""
if [ "$rc" -eq 2 ]; then held="publish refused after the merge"
elif ! checks "$BEFORE"; then held="a check failed after the merge (intake run ${GITHUB_RUN_ID:-local})"; fi
if [ -n "$held" ]; then
  echo "::warning::$held: resetting to main and holding the files for Claude"
  git reset -q --hard "$BEFORE" && git clean -fdq -- collection data docs
  python3 tools/bridge/intake.py hold --outcomes "$OUT" --reason "$held" || exit 1
fi

git add -A collection data docs version.json CLAUDE.md AI_START_HERE.md
if git diff --cached --quiet; then echo "nothing to commit"; [ -n "$held" ] && exit 1; exit 0; fi
git commit -q -F docs/agents/bridge/.commit_message
pushed=""
for attempt in 1 2 3; do
  if git push -q origin HEAD:main; then pushed=1; break; fi
  git fetch -q origin main
  if ! git rebase -q origin/main; then
    git rebase --abort 2>/dev/null
    echo "::warning::main moved under this merge and the commits touch the same files; the files stay in Drive and the next run merges them on the new main"
    exit 0
  fi
done
[ -n "$pushed" ] || { echo "::error::the push failed 3 times"; exit 1; }
SHA=$(git rev-parse HEAD); echo "pushed $SHA"

if [ -n "${GH_TOKEN:-}" ] && [ -n "${REPO:-}" ]; then
  api() { curl -fsS -o /dev/null -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/$REPO/$1" ${2:+-d "$2"}; }
  api pages/builds || echo "::warning::could not start the Pages build"
  for wf in integrity.yml smoke.yml; do api "actions/workflows/$wf/dispatches" '{"ref":"main"}' || echo "::warning::could not start $wf"; done
fi
sleep "${INTAKE_TICK_WAIT:-5}"
curl -fsSL --max-time 300 -o /dev/null "$BRIDGE&op=tick&sha=$SHA" || echo "::warning::the Drive side did not answer the tick; its hourly run cleans up instead"
if [ -n "$held" ]; then echo "::error::files were held for Claude: $held (docs/agents/bridge/INBOX.md)"; exit 1; fi
exit 0
