# Music layer v2 ("TitanMusic", `wings/music-engine.js`)

Branch `claude/amb-music`. Not merged, no build numbers bumped. **Nobody has listened to this**: the container has no audio output. Everything below was checked by numbers (pitch content, peaks, voice counts, timing), not by ear. Please listen to the four samples before merging.

## What it is
A new, self-contained generative music engine (all synthesized, no samples). `wings/scene-engine.js` hands the music of a scene to it when `window.TitanMusic` exists; otherwise the old `buildMusic` path still runs.

- **Harmony** (data table `TitanMusic.SPECS`, one entry per scene): key, mode, bpm, `chordBeats`, progressions as roman numerals in sections **A** and **B** (case = quality; suffixes `7 maj7 add9 sus2 sus4 6 9`, `b`/`#` prefix), voicing style, instrument set, mood, melody settings. Chords are **voice-led** (`voiceLead()`: tries every assignment of chord tones to 4 (or 3) voices, minimises total semitone movement, always keeps root, third and seventh, keeps voice order and spacing). Measured average movement is about 5 semitones per chord change over all voices (max 8 to 14).
- **Never a 4-bar loop**: each cycle picks a form (`AABA`, `ABAB`, `AAB`, `ABBA`); plain chords sometimes get a 7th / add9 / 6 (`ext`); the motif mutates every 3rd cycle; every 3rd cycle (`modEvery`) the key moves (+2, +5, +7, -2, -5 from home, then usually back home) through a dominant-7 pivot chord in major / minor / dorian (modal scenes just step across). In the slow scenes a cycle is about 3 minutes, so the first modulation comes after roughly 9 to 12 minutes.
- **Instruments**: felt piano (kept, with velocity brightness, stereo by pitch; melody notes keep the closing filter, soft comping chords use a static filter because an automated biquad costs a coefficient update every audio block), strings pad (two detuned saws per note, slow low-pass with LFO, two-voice stereo chorus), warm pad (the old sine pair + triangle), glass pad, **harp** (Karplus-Strong string rendered per pitch into a cached 22.05 kHz buffer, allpass-tuned: Web Audio cannot do KS in a feedback loop above about 344 Hz), music box and **celesta**, **upright** bass (pluck with closing filter, optional walking line with approach notes) and **sub** bass, **brush / lo-fi drums** (pre-rendered kick, brush swish, hat with swing and humanised timing), **choir "ooh"** (detuned saws through 310 / 870 / 2250 Hz formant bands with shared vibrato).
- **Melody**: a motif of 3 to 4 notes (random rhythm and contour) developed by transpose, inversion, augmentation, diminution, retrograde, fragment and cadence (section A and B weight the operations differently). Phrases start on the half-beat grid and are followed by long rests (density 0.14 to 0.5); first, last and long notes snap to chord tones, a long note is never a semitone off a chord tone; timing jitter of about 14 ms, velocity arch, an occasional dropped inner note. About 10 to 20 notes per minute.
- **Mix**: all voices go into one session output gain, which feeds the scene's music gain (`g.mus`), so the existing path applies unchanged: group crossfade, `musBus` level and duck, tape colour (tanh + 6.8 kHz cut) and the 4.8 s dark hall. (For use without that chain, `start(..., { colour: true })` builds a port of the same tape + hall.) Per-scene loudness trims (`VOL`) were set from offline RMS to a common value.
- **Scheduling / performance**: one Worker tick (250 ms) shared by all sessions; a chord is planned when it enters the 2.5 s look-ahead window; planned events sit in a queue and are only turned into nodes inside the window, at most 12 per tick; a **voice budget** (`CAP` 64 oscillator-equivalents, 44 on phones, low-priority instruments are refused first); phones also drop detuned copies and upper partials (`LITE`); every voice disconnects its whole chain when its last source ends; stop kills every source.

## API
```
TitanMusic.forMix(mix, name)  -> { id, spec } | null   // scene spec by mix.scene or scene name when the music flags still match; else derived from the legacy flags (pad/piano/bells/beat/root/mode/prog/bpm); spec null = no music (storm)
TitanMusic.start(spec|id, { ctx, input, exclusive, fadeIn, colour, seed }) -> session { stop(fade), setLevel(x), setTempoScale(x), stats() }
TitanMusic.stop(fade) / .setLevel(x) / .setTempoScale(x)   // every live session
TitanMusic.stats(), .sessions(), .simulate(spec, seconds, { ctx, seed })   // simulate plans on an OfflineAudioContext and reports peak voices
```
`input` defaults to `TitanGen.musicBus().input` if that exists. `exclusive` (default true) fades older sessions; the scene-engine bridge passes `exclusive: false` and manages lifetime itself.

## Integration points (all in `wings/scene-engine.js`, marked `TitanMusic integration`)
1. `buildGroup`: if `window.TitanMusic` is present, `musicStart(g, mix)` runs instead of `buildMusic`. It asks `forMix`; `null` falls back to the old path, a spec of `null` means silence for that scene.
2. `musicStart` + `musicBusOf` (new functions just above `buildGroup`): the session's `input` is the group's `g.mus` (so the 2.5 s equal-power crossfade, the 3-group cap and `g.kill` all work), `g.rel.push(() => sess.stop(0))` releases it. If a group has no `g.mus` it uses `TitanGen.musicBus()` (the beds agent's contract, `{ ctx, input }`) and finally `E.musBus`.
3. After the `window.TitanGen = {...}` literal: `TitanGen.setMusicTempo(x)` (calls `TitanMusic.setTempoScale`). Tempo changes apply from the next planned chord.
4. `index.html`: `<script src="wings/music-engine.js?v=tr88">` just before `scene-engine.js`. `sw.js`: file added to the precache list. `wings/scene.js` is untouched (the scene is found by name; "My mix" uses the legacy-flag path, so the Soft pads / Piano / Bells / Beat toggles still work).

Merge hot spots with the beds work: `buildGroup` (the old `buildMusic` call line) and the end of the file.

## Scenes
29 specs (20 Worlds + 9 sound scenes), `storm` is `null` (no music, as before). Beats (brush or lo-fi drums + upright bass): rainy, lofi, nightcity (lo-fi), bluenote, cafe (soft brushes, walking bass). Choir: crypt, temple, imperial. Harp-led: garden, hoard, cabin, imperial, caravanserai, roman. Keys / modes follow the old table (dorian for the evening rooms, phrygian for stone, lydian for glass / water / ice, pentatonic melody over sus chords for garden / temple / imperial / observatory).

## Tests (Playwright, chromium, autoplay flag, http.server, service workers blocked, `?nosplash`)
- **No errors**: no page errors in any run (only the usual blocked external fetches).
- **Voices over 5 simulated minutes**, all 28 music scenes (`simulate(id, 300)`): peak 23 to 56 concurrent oscillator-equivalents, cap 64. Pixel 7 emulation (cap 44, lite): peak 40 on lofi (the busiest). Live, 75 s: 13 to 58 scheduled sources.
- **Clipping**: offline renders of 60 s: peak 0.18 to 0.54 pre-master. Live master (ScriptProcessor on the master after the limiter), 75 s each: peak 0.41 to 0.55, **0 samples at or above 0.999**. RMS of the live master: new 0.13 to 0.19 (crypt 0.16, midnight-gallery 0.17, prism 0.15, lofi 0.13) against old 0.09 to 0.24 (crypt 0.09, midnight-gallery 0.12, prism 0.14, lofi 0.24): comparable overall, slightly louder on the quiet old scenes, quieter on the old lo-fi beat.
- **Render cost** (offline, best of 3, desktop): 4x to 17x realtime depending on the scene (about 10x typical; bluenote 4x is the heaviest, temple and prism 16x). Piano notes are the most expensive voice.
- **Main thread** (Pixel 7 emulation, 4x CPU): `S.step` mean 0.8 ms per tick, p95 4 to 9 ms, worst plan 11 ms; first step at scene start about 58 ms (drum buffers, first chord).
- **Hall scroll fps** (Pixel 7, 4x CPU, 25 x 300 px, 4 interleaved runs, shared noisy box): silent 45, old lofi 42, new lofi 35, old midnight-gallery 37, new midnight-gallery 38 (medians; single runs vary 16 to 49 on this box, one outlier of about 20 in every case). No regression beyond noise on midnight-gallery; lofi new was lower in this run (35 vs 42) but the first 3-scene run had new 35 / 33 / 36 against old 43 / 38 / 40, so **a drop of up to about 5 fps with a drum scene is possible**: main-thread cost is small, the likely cost is graph mutation while the audio thread is busy. Worth re-measuring on a quiet box or a real phone.
- **Bridge behaviour**: scene found by name; storm has 0 sessions; 8 scenes started 150 ms apart peak at 3 sessions (the group cap) and settle to 1; custom mix goes through the legacy path (`id: custom`); `setMusicTempo(1.4)` and `setLevel(0.7)` reach the session; `TitanGen.stop(0.4)` leaves 0 sessions, 0 sources.
- **Pitch / harmony**: Karplus-Strong tuning within the 6 cent measurement resolution (MIDI 48 to 84). The 40 s samples' pitch classes match the keys (below).

## Samples (`notes/agents/music-v2-samples/`, 64 kbps Opus, music only: no ambience beds, volume 0.8, the master chain recorded; each 34 to 42 s, taken from 6 s into the scene)
- `lofi.webm` (C dorian, 76 bpm): lo-fi drums (soft kick on 1 and sometimes the "and" of 2, brush on 2 and 4, swung off-beat hats), upright bass on the roots, a warm pad underneath, felt piano comping off the beat plus a sparse piano / celesta melody. Measured: C 32 %, F 22 %, G 20 %, D 10 %.
- `crypt.webm` (E phrygian, 46 bpm): slow strings with a formant "ooh" choir swelling on most chords, a deep sub bass, a rare music-box note. Almost no onsets. Measured: E and F (the phrygian minor second) 95 % of the energy.
- `imperial.webm` (D major, pentatonic melody): plucked harp arpeggios in eighth-beat steps over sus2 / add9 chords, a strings pad, a faint choir, a few music-box notes. Measured: B, E, D, A, F# (D major pentatonic plus the vi chord).
- `midnight-gallery.webm` (A dorian, 60 bpm): strings pad and sub bass, rolled soft piano chords at each change, a sparse piano melody (about 1 note every 5 s), a harp arpeggio now and then. Measured: A 39 %, D 29 %, G 24 %.

## Open items
- **Listen**: balance of the instruments (all levels were set from RMS, not by ear), whether the strings pad is warm enough or too saw-like, choir realism, drum feel. Tuning knobs are per spec (`inst` levels, `density`, `ext`, `swing`, `choirP`, `harpP`) and `VOL`.
- Hall fps with a drum scene on a real phone; consider `hat` density or dropping the chorus on `LITE`.
- Modulation only appears after about 9 to 12 minutes in the slow scenes (set `modEvery: 2` per spec to hear it sooner).
- `TitanGen.musicBus()` does not exist yet on this branch: the bridge uses `g.mus` and only falls back to the contract if a group has no `g.mus`. If the beds rewrite removes `g.mus`/`g.rel`, adjust `musicStart` only.
- Scene Studio has no UI for the new tempo trim; `TitanGen.setMusicTempo(x)` is there for it.
- Per-session level is one number; there is no per-instrument mute in the UI (the Soft pads / Piano / Bells / Beat toggles map to the legacy-spec path).
