# UI registry (plain words)

| UI | Commit | What it is | How to remove it |
|---|---|---|---|
| Classic | (original) | The wings: Hall, Gallery, Vault, Study, Lab. Safe default. | Not removable; every other UI falls back to it. |
| The Field | see git log "The Field as a UI" | Everything on one 3D table: rows are countries by continent, year runs across, equal coins stack. Tap a coin and the camera flies to it. Filters: album holes as gold rings, silver & gold, still to photograph. "Hold it" opens the full coin page with the photo-relief coin. | `git revert` that commit, or delete `shells/field/`, its entry in `shells/shell.js` and its lines in `sw.js`. |
