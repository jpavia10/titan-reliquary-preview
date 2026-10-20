<!-- doc-status: current; normative: yes (for the owner); fix list #105. One page: print it and keep it in the safe. -->
# Titan Reliquary recovery card

Printed on ____________ (date). Keep it with the coins. If something is lost, start at the top.

## Where everything lives
| What | Where | Owned by |
|---|---|---|
| The app | https://jpavia10.github.io/titan-reliquary-preview/ | GitHub account **jpavia10** |
| The code and the master record of every coin | https://github.com/jpavia10/titan-reliquary-preview (folder `collection/`) | GitHub account **jpavia10** |
| Daily backup of the whole site (about 25 MB) | https://github.com/jpavia10/titan-reliquary-preview/releases/download/site-backup/titan-reliquary-site.zip | GitHub account **jpavia10** |
| Original coin photos, album page photos, the AIs' files | Google Drive folder **Titan Reliquary** | Joseph's Google account |
| Copy of the backup on Drive | Drive `Titan Reliquary/site-backups/` (only after the one-time Apps Script install, fix list #92; until then the newest Drive copy is from 2026-09-28) | Joseph's Google account |
| The collection as a spreadsheet | https://jpavia10.github.io/titan-reliquary-preview/data/export/coins.csv (also `album_holes.csv`, `lots.csv`, `collection.json` with every source) | rebuilt on every publish |
| A printable list for insurance | https://jpavia10.github.io/titan-reliquary-preview/data/inventory.html | rebuilt on every publish |

The AIs (Claude, Grok, Muse, Gemini, ChatGPT) are helpers only. Losing any of their accounts loses nothing: everything they make lands in GitHub or Drive.

## The two accounts that matter
Write the recovery codes here by hand (never in a file, never in a chat):

- GitHub **jpavia10**, two-factor on. Recovery codes: ______________________________________________
- Google (the Drive owner), two-factor on. Recovery codes: _________________________________________

## If the app stops loading
1. Open https://www.githubstatus.com. If GitHub is down, wait.
2. Otherwise on github.com open the repo, open `DEPLOY_STAMP.txt`, press the pencil, change one character, press **Commit changes**. GitHub Pages rebuilds the site in a few minutes (the Actions tab shows "pages build and deployment").

## If GitHub itself is gone (account lost or the repo deleted)
1. Get the backup zip: the Drive copy in `Titan Reliquary/site-backups/`, or any downloaded copy of `titan-reliquary-site.zip`.
2. Unzip it on any computer with Python 3. In that folder run `python3 -m http.server 8000` and open http://localhost:8000: the app works from the copy, offline included.
3. To check the copy is whole: `pip install jsonschema` then `python3 tools/backup/restore_drill.py --zip titan-reliquary-site.zip --work NEW_EMPTY_FOLDER --no-smoke`. It rebuilds everything from the master record and checks the result (the full drill with the browser test, last run 2026-10-08: passed; it repeats by itself on the 3rd of every month).
4. To put it online again: make a new GitHub repository, upload the unzipped folder, then Settings > Pages > deploy from the main branch.
5. Not in the compact zip, by design: the opening films and the sound recordings. They are in the GitHub repo; without them the app plays its built-in opening and generated sound.

## If you only need the list
Open `coins.csv` from the export link above in Excel, Numbers or Google Sheets: every coin with its year, mint, catalogue numbers, value, and for each fact how sure we are and where it came from. Album holes and lots are in the two other files.

Policy: hold, do not sell. Values are estimates for insurance and planning, not offers.
