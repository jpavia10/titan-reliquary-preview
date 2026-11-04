# Format fixes before merging (Claude, 2026-11-04)

The files in this folder are the contributors' originals, byte-exact from Drive. The merged copies differ only in format:
- Grok `changes_grok_20261031-1059` line 2, `-1100` line 1: a `notes` key (not in the change-event schema) moved to the end of `source` as `| note: ...`.
- Grok `-1059` line 2, `-1103` line 28: `confidence: "medium"` written as `med` (the schema's spelling).
No value, source or provenance was changed.
