# Ambience recordings: sources and licenses

All recordings in this folder are re-encoded excerpts of field recordings published in the **Moodist** project
(https://github.com/remvze/moodist, `public/sounds/`). Moodist's code is MIT. Its README ("Third-Party Assets") states that the
sounds are sourced from third parties under one of two licenses:

- **CC0 1.0** (public domain dedication): https://creativecommons.org/publicdomain/zero/1.0/
- **Pixabay Content License**: https://pixabay.com/service/license-summary/ (free for commercial and non-commercial use, no attribution required; the one restriction is that the files may not be redistributed as a standalone sound collection)

**Per-file licence is NOT itemised upstream.** Moodist has no credits or licence list file (`CREDITS.md`, `SOUNDS.md`, `LICENSES.md` all 404 on `main`), no licence field in
`src/data/sounds/*.tsx`, and no usable ID3 metadata in the mp3s. So each file below is "CC0 or Pixabay Content License" and which of the two could not be determined per file.
Both licences allow the use here (a private two-person app, no resale of the audio, no attribution required). If the owner ever makes the app public or wants a strict per-file record,
the sounds must be re-verified or replaced; this is the one open item. Because both licences forbid selling or redistributing the sounds *as a collection*, keep this folder out of any public
"sounds pack" or template.

Processing (`tools/ambience/encode.py`): trimmed to the most stationary 10-48 s region, tail crossfaded into the head (equal power, 1.5-3 s) for a seamless loop, loudness-normalised to about -20 LUFS
(boost capped at +20 dB, peak limiter at -1 dBFS), written as Opus in WebM (96 kbps stereo / 56 kbps mono) and AAC in M4A (72 / 48 kbps) for Safari.
One-shot sounds (thunder, owl, pages, bowl) are several short segments joined into one file; the segment table is in `manifest.json`.

| id | kind | upstream file | length | size (webm + m4a) |
|---|---|---|---|---|
| `birds` | loop | `public/sounds/animals/birds.mp3` | 48.0 s | 1098 KB |
| `brown` | loop | `public/sounds/noise/brown-noise.wav` | 7.61 s | 97 KB |
| `cafe` | loop | `public/sounds/places/cafe.mp3` | 48.0 s | 839 KB |
| `clock` | loop | `public/sounds/things/clock.mp3` | 14.0 s | 162 KB |
| `crickets` | loop | `public/sounds/animals/crickets.mp3` | 48.0 s | 1230 KB |
| `fire` | loop | `public/sounds/nature/campfire.mp3` | 48.0 s | 1034 KB |
| `frogs` | loop | `public/sounds/animals/frog.mp3` | 48.0 s | 1058 KB |
| `gulls` | loop | `public/sounds/animals/seagulls.mp3` | 40.47 s | 504 KB |
| `hall` | loop | `public/sounds/places/church.mp3` | 48.0 s | 595 KB |
| `keys` | loop | `public/sounds/things/keyboard.mp3` | 10.25 s | 218 KB |
| `library` | loop | `public/sounds/places/library.mp3` | 48.0 s | 935 KB |
| `pink` | loop | `public/sounds/noise/pink-noise.wav` | 7.61 s | 131 KB |
| `rainHeavy` | loop | `public/sounds/rain/heavy-rain.mp3` | 19.39 s | 387 KB |
| `rainLight` | loop | `public/sounds/rain/light-rain.mp3` | 48.0 s | 958 KB |
| `rainTent` | loop | `public/sounds/rain/rain-on-tent.mp3` | 48.0 s | 1054 KB |
| `rainUmbrella` | loop | `public/sounds/rain/rain-on-umbrella.mp3` | 24.15 s | 633 KB |
| `rainWindow` | loop | `public/sounds/rain/rain-on-window.mp3` | 30.74 s | 635 KB |
| `river` | loop | `public/sounds/nature/river.mp3` | 48.0 s | 1084 KB |
| `train` | loop | `public/sounds/transport/train.mp3` | 24.0 s | 467 KB |
| `trainIn` | loop | `public/sounds/transport/inside-a-train.mp3` | 48.0 s | 936 KB |
| `typewriter` | loop | `public/sounds/things/typewriter.mp3` | 19.38 s | 426 KB |
| `village` | loop | `public/sounds/places/night-village.mp3` | 48.0 s | 952 KB |
| `vinyl` | loop | `public/sounds/things/vinyl-effect.mp3` | 48.0 s | 1088 KB |
| `waves` | loop | `public/sounds/nature/waves.mp3` | 48.0 s | 948 KB |
| `wind` | loop | `public/sounds/nature/wind.mp3` | 48.0 s | 942 KB |
| `windHowl` | loop | `public/sounds/nature/howling-wind.mp3` | 48.0 s | 826 KB |
| `windTrees` | loop | `public/sounds/nature/wind-in-trees.mp3` | 48.0 s | 957 KB |
| `bowl` | event | `public/sounds/things/singing-bowl.mp3` | 26.5 s | 530 KB |
| `owl` | event | `public/sounds/animals/owl.mp3` | 7.6 s | 88 KB |
| `pages` | event | `public/sounds/things/paper.mp3` | 11.3 s | 195 KB |
| `thunder` | event | `public/sounds/rain/thunder.mp3` | 46.5 s | 869 KB |
