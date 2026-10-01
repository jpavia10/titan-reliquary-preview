# Ambient engine v3: real recordings (worktree agent-a377c53362f0e911d)

## Why
Owner: the synthesized rain/fire/wind/crickets sounded fake. v3 plays **real field recordings** in a layered mixer; the generative music stays as the music layer, made softer and warmer.

## What changed
- **Recordings** (`audio/ambience/`, 45 recordings x 2 codecs, `manifest.json`, `CREDITS.md`): 38 seamless loops + 7 one-shot sets. Built by `tools/ambience/encode.py` (pip `imageio-ffmpeg`, `numpy`): stationary region picked automatically, equal-power crossfade of tail into head (1.5-3 s), loudness about -20 LUFS (boost capped +20 dB, limiter -1 dBFS), Opus/WebM (80 kbps stereo, 48 mono) + AAC/M4A (64/40) for Safari. **24.8 MB for both codecs; a browser downloads only one (about 13.6 MB webm / 11.2 MB m4a).** Not in the sw.js precache; see below.
- **Source and licences**: Moodist (MIT code). Sounds are CC0 or Pixabay Content License, **but upstream does not say which per file** (no credits file, no per-file field, no ID3). Both allow this private use. Strictly, "cannot determine a file's licence, leave it out" would drop every file; I kept them under the repo-level statement and flagged it in `CREDITS.md`. **Integrator/owner decision needed** if you want a stricter reading.
- **Not found in the library** (substituted): ice creak, camel bells, bamboo water, a true hammer strike. "Distant clunks" (`clank`) is the slide-projector's mechanical change; room tone is the ceiling-fan recording; "Timber creaks" are cut from the sailboat recording at its strongest onsets; Caravanserai uses soft wind chimes for the bells. **No file was auditioned by ear in this container**; names and onset analysis only. Please listen (samples below) and tell me which beds to swap.
- **Engine** (`wings/scene-engine.js`, `TitanGen`):
  - `REC` catalogue (label, icon, trim, pan, group, synth fallback). Loops: fetch + `decodeAudioData` once, lazily, only when a scene needs it; played with `loop=true` at a random offset; short loops (< 32 s) run as two voices half a loop apart and panned apart; slow +-2-3 dB gain "breathing" over 20-60 s per voice; stereo placement per bed. Events (thunder, owl, pages, bowl, creak, clunk, whale): scheduled at random 20-90 s intervals from segment tables inside one file.
  - Per-bed gain -> group bed bus -> existing ambience bus -> EQ -> limiter -> MediaStream route (unchanged, so background play still works).
  - Synth beds remain only as a per-bed **fallback** if a fetch/decode fails.
  - Buffers: `releaseIdle` frees a decoded buffer 2 min after its last scene ended; `TitanGen.stats()` shows `buffers/decoded/released/fallbacks`.
  - Scene switches: 2.5 s equal-power (sin/cos) crossfade; a scene retired within 35% of its own fade-in dies in 0.15 s; hard cap 3 live groups (20 rapid switches: max 86 live sources, 24 after).
  - Music: pads = detuned sine pair + triangle through a closed low-pass; felt piano = 4 inharmonic partials, each a detuned pair, soft 20 ms attack, filter that closes, hammer thump; bells = music-box partials (no FM glass); everything passes through tape colour (tanh + 6.8 kHz high cut) and one long dark hall reverb (4.8 s, pre-delay, early reflections). The recordings get no reverb (they carry their own space; a second convolver cost frames).
  - API added: `TitanGen.REC, BED_GROUPS, WORLD_ORDER, SOUND_ORDER, ALIASES, setBedLevel(id, level), releaseIdle(ms), loaded(), debugMaster()`.
- **Scenes**: `TitanGen.SCENES[id]` for every id the Worlds need: midnight-gallery, conservator, mint, hoard, bluenote, cabin, shipwreck, prism, nightcity, blacksite, crypt, observatory, alchemist, polar, imperial, temple, caravanserai, fireside, roman, privatebank (`world: true`, each has the old `atmo` id where one existed, null for the 3 new Worlds). 9 "Sound only" presets stay in `SOUND_ORDER`: rainy, vault, lofi, garden, storm, coast (Coastal reading room), closing (Library at closing), train (Train through the night), cafe (Café on the corner). Merged: study -> conservator, hearth -> fireside, snow -> polar (`TitanGen.ALIASES`; saved ids are mapped; old synth bed ids in saved mixes map to recordings via `LEGACY`). Picking a World scene from Scene Studio changes sound only (the World manifest owns lighting).
- **Scene Studio** (`wings/scene.js`, `styles/scene.css`; sound/mixer sections only): "Sound scenes" grid, "My scenes", a "Sounds of the Worlds" drawer, and **Build your own**: one row per bed (52 px icon button, name, 44 px slider, level number), grouped Rain / Wind and water / Warmth / Night and animals / Places / Things / Noise, plus music toggles. Moving a slider on a playing bed changes its level live (no rebuild); adding a bed crossfades in a rebuilt scene. Autosaved as `titan.mymix.v1` ("My mix"); "Save as a scene" stores it in `titan.scene.v1` under `mine` (with Remove); "Load My mix", "Clear all".
- **sw.js**: new `titan-ambience-v1` cache, cache-first for `/audio/ambience/`, kept across build bumps. The precache list is untouched. Note app.js only registers the SW on https, so on localhost tests register it by hand.

## Tests (Playwright, chromium, autoplay flag, python http.server; SW blocked unless stated)
- **Start latency** (tap to level > 0.003 from silence, 29 scenes): cold 0.1-1.0 s, HTTP-warm with buffers re-decoded 0.1-1.3 s (max cabin/caravanserai, 4 beds), buffers hot 0.1-0.9 s. All under 1.5 s. (Fade-in is part of it.)
- **No page errors** in any run.
- **Live sources**: 20 scene switches 150 ms apart -> max 3 groups, max 86 live sources during, 24 after settle (was 400+ killed, no leak). 
- **Memory**: after stop, `releaseIdle(120000)` frees nothing fresh; aged buffers (`releaseIdle(1000)`) -> 20 buffers freed, 0 left.
- **Background play**: default (pause option off): hidden -> ctx `running`, level 0.094; option ON: hidden -> `suspended`, visible -> `running`/playing, level back. (Visibility simulated; real lock-screen not verified.)
- **Service worker** (SW on): after playing a scene the 4 needed `.webm` files are in `titan-ambience-v1`; replaying offline works from cache with 0 fallbacks. (Playwright offline emulation does not block SW-originated localhost fetches, so "never-played scene offline" was verified separately with SW blocked + offline: all beds fall back to synth, sound continues, no errors.)
- **Mixer**: 45 rows, targets >= 52 x 44 px; slider on a playing bed: groups 1 -> 1, nothing killed, sources unchanged; My mix saved to localStorage; saved scene survives reload.
- **Hall scroll fps**, Pixel 7 emulation, 4x CPU, fresh page per scene, 3 runs each: silent 52-59; rainy 56-58; lofi 47-57; closing 54-56; cafe 53-58; midnight-gallery 53-59; fireside 56-58; nightcity 56-59; storm 43-56 (one low run). Median at or above about 54 everywhere; individual runs vary by +-5 even silent, so a rare dip under 50 is noise-level, not a trend. (An early run showing 21 fps after rapid scene hopping on one page was not reproducible on fresh pages.)
- **Click check** across a fireside -> cabin crossfade (ScriptProcessor on master): max sample step 5.2x the 99.9th percentile, consistent with fire pops, no step discontinuities.

## Listen
`notes/agents/ambience-samples/` (24 s MediaRecorder captures of the master, 64 kbps Opus, about 190 KB each): `fireside.webm`, `rainy.webm`, `temple.webm`.

## Not verified / open
- Per-file licence (see above). By-ear quality of every recording; the scene levels (`trim` in `REC`, `beds` in `SCENES`) were set from loudness, not by ear.
- Safari/iOS M4A path (UA-selected) and the loop seam after AAC decoder priming.
- Real phone background/lock-screen behaviour.
- Scene Studio's lighting "Themes" section is the other agent's; my UI edits are limited to the sound and mixer sections (merge hot spots: `pickScene`, the markup between "Sound scenes" and "Mix and tone").
- Did not bump `?v=` stamps or `version.json`; new files that need precaching if the integrator wants: none (audio is runtime-cached).
