<!-- doc-status: current; normative: yes; fix list #106. Every way anything can change the app, its data or its backups. Review on every new access. -->
# Who can change what (reviewed 2026-10-20)

Rule of thumb: the coin record changes only through the pipeline (`tools/pipeline/publish.py`), which checks every line, keeps the change log
append-only (hash chain, `collection/changes.chain`) and refuses anything without a source. Everything below is a way in, how wide it is, and
what guards it.

## GitHub (repo jpavia10/titan-reliquary-preview, branch main = the live site)
| Who / what | Can do | Guard | Wider than needed? |
|---|---|---|---|
| Joseph (account jpavia10) | everything | two-factor (recovery card) | no: the owner |
| Claude (the Claude GitHub app, cloud sessions) | push to any branch, open issues and PRs | integrity + smoke run on every push to main; never pushes a token; never edits data/ by hand | no, but its pushes do not start GitHub Pages: a deploy needs the next row |
| The GitHub connector in Claude's sessions (acts as Joseph) | edit files through the API (used only for `DEPLOY_STAMP.txt`, to start Pages) | used per CLAUDE.md rule 0 only | acts as the owner; keep its use to the deploy stamp |
| grok-bot (Grok's reviews and theme work, commits on main since 2026-10-19) | push code straight to main | integrity + smoke run after the push; nothing blocks a bad push | **yes**: it bypasses the change-file contract and review. Proposed (owner decides, fix list #127): Grok pushes to `grok/*` branches and Claude merges when integrity + smoke are green |
| GitHub Actions jobs (`GITHUB_TOKEN`) | see the next table | each job declares its own permissions | narrowed today: integrity, smoke and restore-drill now read only |

| Job | Token can | Why |
|---|---|---|
| prices (daily 22:15 UTC) | write contents + pages | commits the day's spot prices and the republished data |
| intake (hourly, merges the AIs' files) | write contents + pages + actions | commits merges, starts Pages + integrity + smoke (its own pushes start nothing) |
| owner-answers (on Joseph's "Titan answers" issues only) | write contents + issues + pages + actions | merges the answers, comments the receipt; the issue author must be the repo owner |
| backup-zip (daily 09:20 UTC) | write contents | uploads the site-backup release asset |
| art-intake, music-intake, coin-values | write contents | commit imported art, recordings, collector values |
| integrity, smoke, restore-drill, verify-live | read only | checks; write nothing |

Repo secrets: `DRIVE_BRIDGE_URL` and `DRIVE_BRIDGE_KEY` (the intake bridge; not set until the one-time install, docs/INTAKE_BRIDGE.md) and
`NUMISTA_API_KEY` (not set; the collector-values job stays off). No other keys exist; nobody, Claude included, ever sees or pastes them.

## Google Drive (folder Titan Reliquary, Joseph's Google account)
| Who / what | Can do | Guard | Wider than needed? |
|---|---|---|---|
| Joseph | everything | two-factor | no |
| Claude (Google Drive connector, in sessions) | read, create, move and trash files anywhere in Joseph's Drive | Claude only trashes processed AI files and duplicates (owner rule 2026-10-02); trash is recoverable for 30 days | the connector reaches the whole Drive, not only this folder |
| Grok, Muse, Gemini (each through its own Google connection) | read and write in Joseph's Drive | every file they write is only a proposal: change files go through the pipeline, photos are checked by eye | **yes**: each AI can reach the whole Drive. Narrower option: a separate Google account that holds only a shared `Titan Reliquary` folder (fix list #127) |
| The Apps Script (intake bridge + Drive sync, once installed) | list the drop folder, trash merged files, write the WORK QUEUE docs and the backups | key-protected web app; only the GitHub job knows the key | no |

## Things anyone on the internet can read
The site is public GitHub Pages (owner decision: only Joseph and his dad use it; `noindex` hides it from search). That includes every coin,
every value, the printable inventory and the plain export (`data/export/`, new today), and the backup zip on the releases page. Nobody can change
any of it without one of the accounts above. If the values ever need to be private, the move is a private repo with a paid Pages plan or
a password-protected host; nothing in the app would change.

## What was narrowed in this review
- integrity, smoke and restore-drill jobs: `permissions: contents: read` (they had the repo default).
- Open for the owner (fix list #127): grok-bot on `grok/*` branches instead of main; a Drive-only Google account for the outside AIs.
