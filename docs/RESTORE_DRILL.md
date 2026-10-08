<!-- doc-status: current; normative: no; result of the last restore drill (fix list #58) -->
# Restore drill

**Question:** if GitHub, this laptop and the live site all vanished, could the whole app be rebuilt from the backup?
**Answer (2026-10-08): yes.** Rebuilt from the backup zip in an empty folder; the data came out identical and the restored site passed
all 27 smoke checks on a phone and a desktop screen, offline included.

## Last run: 2026-10-08, by Claude
| step | result |
|---|---|
| backup file | `titan-reliquary-site.zip`, 24,172,680 bytes, made 2026-10-08 05:22 UTC (build tr99, commit 46132da), sha256 e5f5906b3190b8bb… |
| zip intact | yes |
| contents | app shell, `collection/` master, `data/`, the pipeline, 222 phone photos, 49 applied change files (the full change history) |
| master validates | CLEAN: 0 schema errors, 0 broken references |
| rebuild from the master | 285 flips, headline $5,369.19, 49 detail files: identical to the backed-up `data/` |
| smoke test on the restored copy | phone 27/27, desktop 27/27 |
| not in the backup, by design | the opening films (`art/splash/`) and ambience recordings (`audio/`): they stay in git and the full repo; without them the opening shows its 3D scene instead of a film, and sound uses the built-in generator |

## Repeat it
- Automatically: `.github/workflows/restore-drill.yml`, the 3rd of every month (and by hand from the Actions tab).
- By hand: `python3 tools/backup/restore_drill.py --work EMPTY_FOLDER --report report.txt` (or `--zip FILE` for a copy from Drive).
- Still to do: run it on the Drive copy once `tools/drive/sync_to_drive.gs` is installed (the owner installs it once; see CLAUDE.md).
