# Sound & FX integration (worktree branch worktree-agent-a1694112f7ed3cef1, base tr53)

## Dead-URL table
This container cannot reach any audio host: every CONNECT to incompetech.com,
audionautix.com, assets.mixkit.co, files.freemusicarchive.org, archive.org and
cdn.pixabay.com is answered `403` by the egress policy (a blocked host, not a dead link).
So NO URL could be verified; NONE was replaced and NONE was disabled on a guess.

| Source | Unique URLs | Status from here | Action |
|---|---|---|---|
| incompetech.com (Kevin MacLeod) | 266 (20 stations) | unverifiable (403 at proxy) | kept; runtime dead-memory skips the real failures |
| audionautix.com (Jason Shaw) | 20 | unverifiable | kept, same |
| assets.mixkit.co ambient loops (rain 2394, thunder 2395, fire 1330, wind 2483, crickets 1789, forest 1213, crowd 444, room 447, scifi 2507) | 9 | unverifiable; optional layers | 404 / no-CORS handled (see below) |

Only the 12 original lofi tracks were ever verified (CHANGELOG, 2026-09-25). The other
~390 file names were never verified, and the "Skipped a dead track" toasts mean some are
dead. To finish from a machine WITH network:
1. Open the site and run `await TitanLofi.audit()` in the console (probes every track with a
   scratch `<audio>`, returns `{ok, dead, slow}`, prints a table of dead ones). Or per URL:
   `curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" --max-time 15 -r 0-2047 URL`.
2. For each dead track, fix the file name or retire it: add its exact title to
   `DISABLED = { "<station>": ["Title"] }` in `js/playlist.js` (it is then listed in
   `TITAN_DISABLED_TRACKS` and not played). Replace only with a source verified to serve
   audio AND licensed for free streaming.

## Attempts reviewed
- **A `origin/claude/rescue-fx`** (base 8079876; applied cleanly to tr53 with `git apply --3way`):
  ADOPTED whole, then tested. audio v3 (no boot fetch, silent skipping, one summary toast,
  5 dead in a row then "Radio unavailable", offline state, 24 h dead-track memory, load
  watchdog, mute + volume persistence, `TitanLofi.audit()`); ambient v6 (gesture-gated
  AudioContext, suspend when hidden, synth voices stopped while hidden, recorded-loop CORS ->
  plain-element fallback -> one "Unavailable" note, sleep-timer restore, click-free
  crossfades, live reduced-motion, pause under the 3D modal, DPR cap 1.5); app.js
  `fxCanvasLoop` (managed fps-capped canvas torn down by `clearThemeFx`); `setAtmo` no longer
  re-applies the preset when the atmosphere did not change.
- **B `origin/claude/rescue-fx-engine-...`** (base 5ef9717; ambient.js rewrite + tools/fx/audit.js):
  NOT merged. It replaces the whole mixer (40+ layers, new groups, a tonal bus that yields
  to music, loudness calibration) on a base several merges old, needs matching mixer UI/CSS,
  was never run against tr53 and cannot be taken piecemeal. Worth a later separate pass:
  duck pitched ambient layers while music plays; per-layer loudness calibration; audio-clock
  scheduling of rhythmic layers. `tools/fx/audit.js` lives on that branch.
- **New**: `styles/fx.css` (the music bar is always `rgba(18,16,12,.94) !important` but its text
  used theme ink, so in Conservator the title was rgb(34,28,18) on near-black; now light),
  retire-track mechanism in `js/playlist.js`.

## Measurements (harness in /tmp/fx-agent: lib.js, hidden.js, switch.js, player.js, engine.js, fxloop.js)
| | before (tr53) | after |
|---|---|---|
| AudioContexts | 2 (audio.js made an unused one) | 1, created only after a gesture |
| Hidden tab, rain FX on | rAF 0/s, ctx still running | rAF 0/s, ctx suspended, master 0, synths stopped, 0 timers |
| Timers alive after 30 atmosphere switches + preset off | 1 timeout (audio.js), 18 ambient timeouts, 1 interval | 0 |
| Window/document listeners after 30 switches | no growth | no growth |
| Live fx canvases after 10 switches (TitanFX loop) | n/a (unmanaged setInterval) | 0; rain canvas hidden when off |
| FX canvas | window size, unmanaged | DPR <= 1.5 (1.0 touch), 15-25 fps cap, none under reduced motion, 0 rAF hidden |
| Music requests at boot | 1 (preload) | 0 |
| All tracks dead | up to 20 toasts | 5 requests, 1 toast, "Radio unavailable right now" |
| Offline | error loop | 0 requests, "Radio unavailable offline", recovers on `online` |
| Some tracks dead | toast per track | 1 "Skipped 3 unavailable tracks"; next visit makes 0 requests for them |
Mute and volume persist across reload. Zero pageerror in every scenario.

## Notes
- The 20 atmospheres' own visuals (`wings/atmo/*`, CSS) use no rAF or timers; nothing to manage.
- `styles/fx.css` is not in `sw.js` SHELL_URLS (out of scope): integrator adds it.
- Not tested on a real phone; real-network streaming was not testable here.

## Status
DONE on branch, committed; not pushed or merged. Open: dead-URL verification needs a networked run.
