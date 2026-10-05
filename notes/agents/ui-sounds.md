# Interface sounds (branch claude/amb-react)

## What
`wings/ui-sounds.js` (`TitanUISounds`): short synthesized Web Audio cues that answer what the user does. No samples, one shared noise buffer per context, no convolvers, max 4 concurrent voices, 60 ms rate limit per kind.

| Trigger | Sound | Duck |
|---|---|---|
| Gallery tile flip (`turnTile`) | coin tink: 4 inharmonic partials (x1, 2.32, 3.87, 5.41) + click + settle, random pitch +-14% | 1.5 dB / 300 ms |
| Coin view opens | velvet bandpass whoosh (380 to 1300 Hz) + tiny 880/1318 Hz chime; held reading duck 4 dB until close | 1.5 dB / 300 ms, then hold 4 dB |
| Coin view closes | softer reverse whoosh + low chime; hold released | 1 dB / 250 ms |
| Enter Vault wing | 95 to 42 Hz thump + low-passed noise, two metallic latch ticks, low bolt slide, about 0.9 s | 2 dB / 700 ms |
| Other wing switch | very quiet 1.9 kHz tick (only when the wing really changes) | none |
| Search opens | airy bandpass whoosh | 1 dB / 250 ms |
| Simple view (#simple) | no UI sounds at all; hold duck 6 dB while open | hold 6 dB |

Rules: nothing before the first gesture (pointerdown/keydown/touchstart); global mute (`titan:mute` + `tr_mute_v1`) silences all; setting "Interface sounds" (default on) and "Interface volume" in Scene Studio > Sound > Settings, persisted in `titan.uisound.v1`.

## Contract with the beds agent
- `TitanGen.uiBus()` -> `{ctx, input}` used when present (feature-detected each call); otherwise a private AudioContext is created on first gesture and goes straight to destination.
- `TitanGen.duck(db, ms)`: positive dB = reduction. Assumed to be timed (releases after `ms`). The reading hold re-issues `duck(db, 20000)` every 15 s and ends with `duck(0, 400)`, so it also works if `duck` has no sustain. If the beds agent's `duck(0, ms)` does not mean "restore now", adjust `releaseDuck()`.

## Hooks (all one-liners dispatching `titan:ui`, `detail.kind`)
- `app.js` `setWing` (`wing`, `detail.wing`), `openDrawer` when it was hidden (`coin-open`), `closeDrawer` (`coin-close`), `openPalette` (`search`).
- `wings/simple.js` open/close (`simple-open` / `simple-close`).
- `wings/gallery.js` `turnTile`: `TitanUISounds.play("flip")`, falling back to the old staple click if the module is absent (so the tile flip no longer plays the old oscillator click; other staple clicks elsewhere are unchanged).
- `wings/scene.js`: `TitanUISounds.mount(sheet)` next to the TitanFX hook (settings rows).
- `index.html` script tag after scene-engine.js; `sw.js` precache entry. Build stamps not bumped.

## Tests (Playwright, http.server, SW blocked, ?nosplash)
Run twice: with a mocked `TitanGen.uiBus/duck`, and without (own context).
- Pre-gesture: wing change skipped (`nogesture`). After a click: each trigger plays exactly once (flip 1, coin-open 1, coin-close 1, vault 1, search 1, wings counted once per real change).
- Duck calls (mock): flip/open 1.5 dB 300 ms; open then hold `[4, 20000]`; close gives `[0, 400]` then `[1, 250]`; `stats().hold` 4 then 0; simple view hold 6 then 0.
- Simple view blocks `play()`; mute blocks; setting off blocks; 20-call spam: voices capped at 4, rest skipped as `rate`/`voices`.
- Own-context fallback: AudioContext `running`, same results. Zero page errors in all runs.
- Levels (analyser on the bus at default volume 0.7, peak): flip 0.10-0.11, wing tick 0.014-0.025, coin open 0.056, close 0.017, vault 0.095. No clipping.
- Gallery scroll, Pixel-like emulation, 4x CPU, 3 s rAF count, interleaved: with 51/53/48/53, without 55/51/52 fps. Noise level (the module is idle during scroll; listeners only fire on `titan:ui`). An earlier non-interleaved run showed 54/46/41 for "with", which did not reproduce in interleaved order (machine drift).
- Sample: `notes/agents/ui-sounds-samples/clickthrough.webm` (about 20 s MediaRecorder of the UI bus: 3 flips, wing hop, coin open and close, vault, search). **I cannot hear audio in this container**: levels and timing are verified from analyser data only; please listen, especially the vault thump on phone speakers (mostly sub-100 Hz, may be inaudible there) and the tink pitch.

## Open items
- Verify against the real `TitanGen.uiBus`/`duck` once the beds branch merges (master gain dip not measured here because those functions do not exist on this branch).
- Music-engine agent: reading-mode duck should cover music as well (`duck` is said to cover ambience+music).
- Tuning by ear: volumes, vault low-end, whether coin-close sound is wanted.
- Other `playStapleClick` callers (Lab etc.) still use the old oscillator on a separate context.
