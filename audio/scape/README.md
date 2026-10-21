<!-- doc-status: current; normative: yes; audience: any agent -->
# SCAPE: ambient soundscape engine (owner: Grok, soundscape worker)

Environment audio, separate from theme music. `engine.js` (window.TitanScape) + `presets.js` (one preset per fx scene id).
Hear it: `fx/demo.html` -> "Sound off" button (top right) -> each scene plays its own soundscape, with a live mixer.

## API
- `TitanScape.play(id, params?)`, `.stop()`, `.unlock()` (call from a tap; Safari/iOS), `.presets`, `.current`
- `.setParam(k, v)`: `intensity` 0..2, `rain` 0..1, `wind` 0..1.5, `storm` km, `tod` hours 0..24
- `.layers()`, `.setLayer(id, gain0to2)` (chill-mode mixer), `.setVolume(v)`, `.setMuted(m)`, `.sleep(minutes)`
- Music worker: share the context `TitanScape.ctx`; `TitanScape.duck(db, sec)` or `TitanScape.sidechain(musicNode, {depth, threshold})` ducks the ambient beds under the score.
- Visual sync: fx scenes dispatch `window.dispatchEvent(new CustomEvent("titan:fx", {detail:{type, x, y, dist, power}}))`
  with types `lightning` (dist km), `burst` (fireworks), `splash`, `touch`. The engine emits `titan:scape` `{type:"flash", dist, x, power}`
  for lightning it schedules itself, so visuals flash first and thunder lands dist/343 s later.
- Mute shares `tr_mute_v1` and the `titan:mute` event. iOS `navigator.audioSession.type = "ambient"` so the silent switch silences it.
- Quality: reads `window.TitanQuality.tier` (low..max) as a CPU budget for event density and HRTF.

## Engine
Granular clouds over field recordings (random offsets, Hann grains, rate jitter: no loop seam, no audible repeat), procedural
layers (pink/brown/white noise with random-walk filters, Minnaert droplets and bubbles, ember crackle, procedural thunder),
Poisson event schedulers, HRTF PannerNodes with air absorption and occlusion lowpass, Doppler on moving sources (cars),
per-space convolution reverb (forest, cave, cathedral, street, space, hall, open, water), RMS loudness normaliser to about
-20 dBFS plus a peak limiter.

## Sources and licences
Recordings are the vendored set in `audio/ambience/` (see its CREDITS.md: CC0 or Pixabay Content License, Opus webm + AAC m4a for Safari).
Impulse responses: recorded OpenAIR IRs (CC BY 4.0) for forest, snow, cave, cathedral, street, hall, space; see CREDITS.md. Generated IRs remain for open and water and as the instant fallback while a recorded IR decodes.
All procedural synthesis is original code.
