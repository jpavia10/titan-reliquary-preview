<!-- doc-status: current; normative: yes (install guide + how the intake bridge works; fix list #92) -->
# The intake bridge: the research loop turns without a chat

**What it does.** Once an hour a GitHub job asks Google Drive for new change files in `Titan Reliquary/collection-incoming (AI change files)/`. It merges the outside AIs' files through the same gates as a hand merge: the pipeline's rejections, the change chain, the schema check, the homework check and all the test suites. Then it publishes, rebuilds the live site and hands each AI its next homework. On the Drive side, a merged file goes to the trash. A rejected file gets a note `{name}.REJECTED.txt` that says why, with a HOW TO FIX line. The AIs' `WORK QUEUE` docs are refreshed. Anything that needs judgement waits for Claude: owner answers, a file written as the owner, a failed check, or an unreadable file.

**Why it needs an install.** The GitHub job can't see inside Drive. A small Google Apps Script, running as you, lists the drop folder for it and does the clean-up afterwards. No GitHub token is stored anywhere. The job uses GitHub's own short-lived token, and the Drive side is reached through a private web address plus a key.

## Install (once, about 10 minutes)

This one Apps Script project also installs the daily Drive backup (site zip, `collection/` mirror, coin photos). That backup was never installed until now.

1. Open https://script.google.com, signed in with the Google account that owns the Titan Reliquary folder, and click **New project**. Name it **Titan Reliquary**.
2. In `Code.gs`, delete what is there and paste the whole of https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/tools/drive/sync_to_drive.gs.
3. Click **+** next to Files, then **Script**, and name it **Bridge**. Paste the whole of https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/main/tools/drive/intake_bridge.gs. Click **Save** (the disk icon).
4. In the function menu at the top, pick **installAll**, then click **Run**. Google asks for permission:
   - Click **Review permissions** and pick your account.
   - On "Google hasn't verified this app", click **Advanced**, then **Go to Titan Reliquary (unsafe)**. It is your own script, so this warning is normal.
   - Click **Allow**. The script needs Drive, Docs and external requests.

   The first run copies the backup and may take a few minutes. If it stops with "Exceeded maximum execution time", run **installAll** again: it skips what is already copied.
5. Click **Deploy**, then **New deployment**. Click the gear and choose **Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then click **Deploy**. Copy the **Web app URL** (it ends in `/exec`).
6. On GitHub, open the repo **titan-reliquary-preview**, then **Settings**, then **Secrets and variables**, then **Actions**, then **New repository secret**:
   - Name: `DRIVE_BRIDGE_URL`. Secret: the Web app URL from step 5. Click **Add secret**.
7. Back in Apps Script, pick **showSecret** in the function menu and click **Run**. The log shows `DRIVE_BRIDGE_KEY = ...`. Make a second repository secret:
   - Name: `DRIVE_BRIDGE_KEY`. Secret: everything after `DRIVE_BRIDGE_KEY = `. Click **Add secret**.
8. Tell Claude "the bridge is installed". Claude starts the first run and checks it. You can also start it yourself: on GitHub, open **Actions**, then **intake**, then **Run workflow**.

**Never paste the URL or the key into a chat**, including with Claude. They belong only in the two GitHub secrets.

## How to switch it off

- **Pause:** on GitHub, open **Actions**, then **intake**, then **...**, then **Disable workflow**.
- **Stop the Drive side:** in Apps Script, run **uninstallBridge**. It removes the hourly trigger and the key, so the old key stops working at once. The backup keeps running; **uninstall** stops that.
- **New key:** run **uninstallBridge**, then **installAll**, then **showSecret**, and update `DRIVE_BRIDGE_KEY` on GitHub.

## What happens to each file in the drop folder

| File | What the bridge does |
|---|---|
| `changes_{ai}_{YYYYMMDD-HHMM}.jsonl` from Grok, Muse, Gemini or ChatGPT, every line written as that AI | **merged** when the pipeline accepts it. The file goes to the Drive trash; the repo keeps a copy in `collection/_incoming/applied/`. |
| the same, but the pipeline rejects it, it carries a line written as another AI, it is over 3 MB, or it reuses the name of a file already handled | **rejected**: `{name}.REJECTED.txt` (reasons + HOW TO FIX) is left in the folder and the file goes to the trash. The AI's WORK QUEUE page shows it under "Your recent files". |
| `answers_owner_*.json`, files named for Claude, owner or a script, lines written as the owner or a person, lines marked `verified` | **held for Claude**: left in the folder. |
| any file whose merge failed a check | **held**: nothing is merged. The run turns red and the file waits for Claude. |
| a Google Doc named like a change file | **held**, with a note: Drive can't hand over a Doc's text as a file. |
| anything else (notes, photos) | listed for Claude; never touched. |

Photos in `STAGING (drop coin photos here)` and blind photo tests in `bakeoff (blind photo test)` are counted, not processed. Reading a coin photo stays with Claude.

## Claude's part (every session; `docs/agents/RESEARCH_LOOP.md` section 7)

1. Read `docs/agents/bridge/INBOX.md`. It lists the bridge's health, the files to score, the held files, the rejected files, other files and the waiting photos.
2. Score every merged or rejected file (rule 2: `collaborators/CONTRIBUTOR_SCORES.md` + the AI's Drive FEEDBACK doc). Then run `python3 tools/bridge/intake.py reviewed NAME...`.
3. Handle each held file by hand (owner answers: `tools/pipeline/owner_answers.py`). Then run `python3 tools/bridge/intake.py resolve NAME --merged`, `--rejected "why"` or `--retry`. The next tick does the Drive clean-up.

## Parts

- `tools/drive/intake_bridge.gs`: the Drive side.
  - The web app takes `op=list` (read only) and `op=tick&sha=...`.
  - `tick` runs every hour and right after each push. It does the clean-up from `docs/agents/bridge/processed.json` at that exact commit and copies `docs/agents/QUEUE_{grok,muse,gemini}.md` into the WORK QUEUE docs when they change.
  - Test: `node tools/drive/test_bridge.js`.
- `.github/workflows/intake.yml` (hourly at :23, or Run workflow) runs `tools/bridge/run_intake.sh`. The script does: intake → checks → commit → push → Pages build → integrity + smoke runs → tick.
  - A commit pushed by the job's own token starts neither the Pages build nor the other workflows, so the script starts them through the API.
  - If main moved during the run, the script replays the merge on top. If both touched the same files, it leaves the merge to the next run.
- `tools/bridge/intake.py`: classifies files, stages them, runs `publish.py` and records the outcomes in `docs/agents/bridge/` (`processed.json`, `runs.jsonl`, `INBOX.md`, `reviewed.json`). Test: `python3 tools/bridge/test_intake.py`.
- A file is known by its Drive id and its last-changed time. A file changed after the job saw it is left alone on Drive and read again on the next run.
