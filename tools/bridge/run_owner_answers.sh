#!/usr/bin/env bash
# The owner's answers from the app, sent as a GitHub issue (2026-10-15). Called by .github/workflows/owner-answers.yml from a fresh
# checkout of main, only for an issue the repository owner opened with the title "Titan answers YYYYMMDD-HHMM".
#
#   ISSUE_BODY, ISSUE_TITLE, ISSUE  the issue (text read by tools/bridge/owner_answers_issue.py, never by the shell)
#   GH_TOKEN + REPO                 comment on and close the issue, start the Pages build and the integrity + smoke runs
#   ANSWERS_DRY=1                   rehearsal: merge and check, but no commit, push or GitHub calls
#
# 1. the answers file out of the issue -> tools/pipeline/owner_answers.py (owner events + receipt) -> publish.py
# 2. the same checks as integrity.yml; any failure: nothing is pushed, the issue gets a "not merged yet" comment and stays open
# 3. commit + push (replays on top when main moved), Pages build, integrity + smoke runs
# 4. the receipt as a comment; the issue is closed unless Claude still has follow-ups to do by hand
set -uo pipefail
cd "$(dirname "$0")/../.."
TMPD="${RUNNER_TEMP:-$(mktemp -d)}"; LOG="$TMPD/answers.log"; : > "$LOG"
BEFORE=$(git rev-parse HEAD)
api() { [ -n "${ANSWERS_DRY:-}" ] && { echo "(dry) $1 $2"; return 0; }
        curl -fsS -o /dev/null -X "$1" -H "Accept: application/vnd.github+json" -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/$REPO/$2" ${3:+--data-binary "@$3"}; }
say() {   # say STATUS: the receipt comment; closes the issue when everything is done
  python3 tools/bridge/owner_answers_issue.py receipt "$LOG" "$1" > "$TMPD/comment.json"; keep=$?
  api POST "issues/$ISSUE/comments" "$TMPD/comment.json" || echo "::warning::could not comment on issue #$ISSUE"
  if [ "$keep" -eq 0 ]; then echo '{"state":"closed","state_reason":"completed"}' > "$TMPD/close.json"; api PATCH "issues/$ISSUE" "$TMPD/close.json" || true; fi
}
fail() { echo "::error::$1"; git reset -q --hard "$BEFORE"; git clean -fdq -- collection data docs; say "$1"; exit 1; }

F=$(python3 tools/bridge/owner_answers_issue.py extract "$TMPD") || { echo "no answers file in this issue" > "$LOG"; say "the issue has no answers file in it (a \`\`\`json block)"; exit 1; }
echo "answers file: $(basename "$F")"
python3 tools/pipeline/owner_answers.py "$F" | tee "$LOG"; [ "${PIPESTATUS[0]}" -eq 0 ] || fail "owner_answers.py could not read the file"
python3 tools/pipeline/publish.py > "$TMPD/publish.log" 2>&1 || { tail -30 "$TMPD/publish.log"; fail "publish refused the merge"; }
tail -5 "$TMPD/publish.log"
python3 tools/pipeline/chain.py verify collection --against "$BEFORE" || fail "the change log check failed"
python3 tools/schema/validate.py collection/ > "$TMPD/validate.log" || { tail -20 "$TMPD/validate.log"; fail "the collection did not validate"; }
python3 tools/agents/homework.py --check || fail "the research loop check failed"
python3 tools/pipeline/test_pipeline.py > "$TMPD/test.log" 2>&1 || { tail -40 "$TMPD/test.log"; fail "the pipeline tests failed"; }

git add -A collection data docs version.json CLAUDE.md AI_START_HERE.md
if git diff --cached --quiet; then say ok; exit 0; fi
[ -n "${ANSWERS_DRY:-}" ] && { echo "(dry) would commit: $(git diff --cached --stat | tail -1)"; say ok; exit 0; }
git commit -q -m "Owner answers $(basename "$F" .json) (issue #$ISSUE)"
pushed=""
for attempt in 1 2 3; do
  if git push -q origin HEAD:main; then pushed=1; break; fi
  git fetch -q origin main
  git rebase -q origin/main || { git rebase --abort 2>/dev/null; break; }
done
[ -n "$pushed" ] || fail "the push failed (main kept moving)"
echo "pushed $(git rev-parse HEAD)"
api POST pages/builds || echo "::warning::could not start the Pages build"
echo '{"ref":"main"}' > "$TMPD/ref.json"
for wf in integrity.yml smoke.yml; do api POST "actions/workflows/$wf/dispatches" "$TMPD/ref.json" || echo "::warning::could not start $wf"; done
say ok
