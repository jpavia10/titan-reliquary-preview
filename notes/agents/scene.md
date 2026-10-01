# Scene Studio (tr57 worktree)

## Why
Owner: "Set the scene needs work, overlaps on mobile, ambient engine upgrade not visible." Cause: two floating 48px buttons over content, a dark player bar plus stacked toasts, music hotlinked from dead hosts, and a mixer UI nobody could read.

## What changed
- **Scene bar** (`#scene-bar`, in `index.html`, `styles/scene.css`): one slim sticky bar at the top of every wing, in the page flow, so nothing floats over content. Holds `#btn-search` (44px, labelled) and `#btn-atmo` (now the Scene button; label shows the playing scene or the lighting name in `#atmo-name`). It replaces the floating "Set the scene" pill, the floating search button, and the hero row (Search / Atmosphere / Ambience). Why top and not the dock: the dock already has 6 tabs at 60px each on a 360px phone. Sticky needed `html, body { overflow-x: clip }` (hidden made sticky inert). The Plaintext atmosphere's own sticky menu bar is accounted for.
- **Scene Studio** (`wings/scene.js`): bottom sheet on phones, side panel on desktop. Top part stays pinned: status, Volume, Play/Pause, Off. Then 8 one-tap scenes, 20 lighting chips, "Build your own sound" (9 ambient beds + pads/piano/bells/lo-fi beat toggles), "Mix and tone" (music/ambience level + 3-band EQ), Internet radio (optional, inline status line only), Settings (on-screen weather, background pause, and the moved Auto-refresh + "checked Ns ago" line). Own dark palette, 15-18px text, 44-48px targets.
- **Engine** (`wings/scene-engine.js`, `window.TitanGen`): generative, offline, no files.
  - Beds: rain on glass, distant thunder, fireplace, quiet room, wind, night insects, vault hum, clock tick, vinyl crackle. Rain/fire/crickets/clock/vinyl/beat are pre-rendered once into short looping buffers, so playing them costs the main thread nothing.
  - Music: chord pads (modes + progressions per scene, overlapped chord changes), sparse piano and FM-bell motifs that follow the chord tones, a swung lo-fi beat (kick/snare/hat) aligned to the chord changes, soft bass.
  - Chain: beds/music buses -> shared reverb -> 3-band EQ -> high-pass -> soft limiter (compressor) -> master. Crossfades 1-3 s, all gain changes via ramps (no clicks). Groups are killed after the fade; sources are counted (`TitanGen.stats()`).
  - Background play (owner requirement): master goes through `MediaStreamAudioDestinationNode` into a hidden `<audio>` (fallback: `ctx.destination`), `mediaSession` metadata + play/pause/stop handlers. Look-ahead scheduler (2.5 s, Worker-driven tick, falls back to setInterval). Sound KEEPS PLAYING hidden/locked by default. Option "Pause sound when the app is in the background" (default off, saved) sets `TITAN_BG_PAUSE`; a user pause stays paused after return; context resumes on visible/next touch if the OS interrupted it.
- **Old engine** (`ambient.js`): audio is dormant (`SCENE_OWNS_AUDIO`); it now only draws the weather canvas (rain, embers...), default ON desktop, OFF on touch (battery), toggle in Settings. Its hidden-tab suspend is gated by `TITAN_BG_PAUSE`. `openMixer()` opens the studio. `#btn-rain` kept hidden for its code.
- **Radio** (`audio.js`): bar/pill hidden; no toasts; status goes to the studio via `titan:radio`; mediaSession added; `TitanLofi.status/setVolume/getVolume`. While radio plays the generative music steps aside (beds stay).
- **One toast**: `#toast` only (audio.js's own toast removed), moved to the top below the bar, 3.2 s, one at a time. `window.showToast` was never defined, so spatial.js/Lab/Study toasts silently did nothing; now exposed.
- `app.js`: `openAtmoSheet` opens the studio, `setTheScene` is lighting only, `titan:atmo` event, overlay manager knows `#scene-sheet`.

## Scenes
Quiet study (conservator), Rainy archive (afterhours), Midnight vault (nocturne), Hearth (valhalla), Lo-fi evening (neon), Night garden (zen), Snowed in (glacier), Thunderstorm (odyssey), plus Off.

## Measurements (Pixel 7 profile, 6x CPU, Hall scroll, offline)
| | silent | rainy | lo-fi | hearth |
|---|---|---|---|---|
| fps (before pass: lofi pill + radio, n/a) | 57-58 | ~50 | ~50 | ~49 |
Node counts: 20 scene switches in 3 s -> 1 live group, ~20-30 live sources, 400+ killed (no leak). Background test (visibility override): option OFF -> context `running`, level > 0; option ON -> `suspended`, back to `running` on return; user-paused stays paused. Zero pageerror; works with all non-localhost requests aborted. Peak RMS 0.02-0.12 across scenes.
Layout: no Scene bar/toast overlap with content at rest (bbox check), only `.wings` is fixed on the page.

## Screenshots
`notes/agents/scene/` before-/after-/studio-/toast- (phone + desktop).

## Not verified
Real phone lock-screen behaviour (headless only), iOS Safari MediaStream route. Radio hosts unreachable from the container.

## sw.js precache (new files)
`wings/scene-engine.js`, `wings/scene.js`, `styles/scene.css`. (`styles/fx.css` unchanged.)
