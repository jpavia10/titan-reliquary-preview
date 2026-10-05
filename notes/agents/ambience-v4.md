# Ambience v4 (branch claude/amb-beds)

No audio was auditioned (no ears in the container). Everything below is measured.

## What changed (wings/scene-engine.js, small hooks in wings/scene.js, styles/scene.css)
- **Granular beds**: loops are no longer looped. Overlapping 4-12 s chunks, equal-power sin/cos crossfades (1-3 s; 40-120 ms for clock/keys/vinyl/drips/train), at most 2 sounding sources per bed (3 counting one in the look-ahead). Chunks play straight through (no `loop=true`, no wrap), stay 0.15 s inside both file ends (AAC priming/padding, seam) and never span a baked-in level step (`CUTS`, found by `findCuts`; rainUmbrella 9.63 s, leaves 35.13 s, windTrees, library, labHum, trainIn ...). Start picker: 14 candidates, must be far from the last two starts, then least-recently-played 0.5 s bins win (walks the whole file before repeating). Texture beds get +-2.5 % rate (+-4.5 % for files < 45 s); short texture files also get a per-chunk tilt/pan; rainHeavy/waterfall/brown/pink play every other chunk reversed (doubles the material). Chunks <= 30 % of the usable file.
- **Weather arcs**: per bed multiplier over 3-10 min (`ARCK`), storm cycle when a scene has thunder (rain/wind build, thunder louder, more frequent, closer, then recede), wind gusts. Clamped 0.35x .. +4 dB. Scene `arc: {depth, period, storm, off, beds:{id:{lo,hi,per}}}`.
- **3D**: `place()` = air low-pass -> PannerNode (HRTF, cap 5 live, equalpower beyond) / StereoPanner (touch default) / off. Events: thunder sweeps across, owl overhead, pages near, bowl front, creak around, clank far, whale far and low. Loops: birds/gulls fly over, chimes/drips spots, clock/keys fixed, train pass with Doppler-like rate drop. Scene `spat: {bedId:{k,d,y,az,gap,len}}` overrides (crypt drips close around you, nightcity traffic `pass` left-right, blacksite telemetry fixed, xenohold spots).
- **Time of day** (`setTimeAware`, default on): dawn adds birds to outdoor scenes, night -45 % crowd/city/cafe, +40 % crickets/frogs/owl, more owl calls.
- **Loudness**: BS.1770-style K-weighted gated LUFS per decoded buffer (async, 3 s slices), norm to -20 LUFS clamped -6..+4.5 dB (sparse beds -3..+3), applied as an eased level change; `trim` stays artistic.
- **Master safety**: soft clipper (identity to 0.8, tops at 0.99) after the compressor and master gain; analyser is after it.
- **Lag fixes**: decodes limited to 2 at once (1 on touch), first slot goes to the loudest loop; noise buffers and the music hall IR built lazily / 1.5 s after start; loudness async; a quiet synth bridge fades in after 0.4 s if a recording is not ready, then crossfades out.
- **New scenes** (WORLD_ORDER now 22): `xenohold` (underwater, drips, labHum, telemetry; whole-tone pads, bells) and `samadhi` (windHowl, bowl, chimes, birds; pentatonic drone). All 22 world + 9 sound scenes have distinct bed sets (checked). Theme map is the integrator's.

## API (header of the file has the same text)
`duck(db, ms)`, `uiBus() -> {ctx,input,volume(),wake()}`, `musicBus() -> {ctx,input}` (input = E.musBus), `setSpatial/getSpatial`, `setTimeAware`, `setArcs`, `loudness()`, `debugSpeed/Hour/Log/Groups/Cuts`, `stats()` (+chunks, maxBedLive, hrtf, spatial). Scene.js mix now carries `arc` and `spat`; settings `spatial`, `timeAware` persist in the existing scene settings; Settings has a checkbox + a select.
**Merge notes for the music branch**: `g.mus`, `g.rel`, `g.tickers`, `g.src`, `E.musBus` are unchanged. `buildGroup(mix)` changed (beds are ordered, arcs built, `arcTicker(g)` added before the music call): keep your `musicStart(g, mix)` call at the same place as the old `buildMusic` line. `g.src(s, extra)` takes an optional node list. The master chain is now `bus -> duckG -> EQ -> comp -> master -> safety -> out` (`debugMaster()` returns `out`; MediaStream/destination hang off `out`; UI input joins at `safety`).

## Tests (Playwright, chromium, desktop unless noted)
- No page errors in any run. Live sources: 12 beds 215 s -> max 28 sources, max 3 per bed (thunder 5-6 only because debugSpeed 8 stacks events), HRTF <= 5. 20 rapid switches: max 70-111 sources, 2-3 groups, 21 after settle.
- Peak at master, all 31 scenes at volume 1: 0.72 max, 0 samples >= 1.0 (scene RMS -12.6 .. -23 dBFS).
- Start regions (215 s, 12 beds): min consecutive start distance 2.2 s on the 7.6 s noise file, 4-9 s elsewhere; no same segment back to back for events.
- Arc bounds: max +4.0 dB, min 0.36x. Time of day: hour 3/6/12/23 behave as designed (birds appear only at 6); off switch works. duck(12): -11.0 dB, restored +0.4 dB. UI beep through uiBus with no scene: level 0.21, ctx resumed.
- Crossfade fireside -> cabin: no dip (level min/max 0.0066/0.0364, sparse scene). Background play path unchanged.
- **Rain cut investigation** (decoded webm, 10 ms windows): rawSeam of the old raw loop is not a click in the webm decode (rainHeavy 15.5x local, rainLight 16x), the AAC priming gap cannot be tested here (webm only); chunks now avoid 0.15 s at both ends regardless. Internal steps found: rainUmbrella 9.63 s (+15.8 dB sustained), leaves 35.13 s (+7.4 dB); the "11 dB / 9 dB in 12 ms" reported are these plus dense drop onsets; both are excluded from chunks (+-0.1 s).
- **Capture of the master (AudioWorklet), 3 min, volume 0.8, past the first 4 s**:
  - Rainy archive, beds only (no music, no thunder): max |sample step| 0.19 (a rain drop; raw files reach 0.36 inside themselves), step/local-average ratio max 19.7 (source interior: rainWindow 19.2); worst 10 ms RMS dip vs 1 s median -6.4 dB, once in 14.8k windows (others <= -5.4); 4 of the 5 worst dips sit in crossfade zones (equal-power sum of uncorrelated rain: about -3 dB to -5 dB by nature).
  - Rainy archive full (music + thunder): dips down to -12 dB (75-113 windows < -6 dB of 16.5k): these are piano/bell decays and thunder tails, not bed seams (the beds-only run has none).
  - Thunderstorm full: max step 0.31 (thunder onsets), ratio max 13.5, worst dip -8.9 dB (3 windows < -6 dB of 15.4k), at a thunder tail.
  So the "no sample jump above 0.02" target is not met in absolute terms (rain drops step by 0.05-0.19 by themselves); relative to the source material the chunks add no new discontinuity that the metrics can see. The 6 dB dip target is met for the beds.
- **First 2 s after Play** (Pixel 7, 4x CPU, with a long-task observer): rainy first audible 110 ms (earlier 140-220), storm 130 ms-1.0 s (bridge plays until rainHeavy decodes at ~1.3 s), 0 dropouts >= 30 ms in all runs, recordings decode one at a time (1.3 / 2.5 / 3.5 / 4.1 s for 4 beds). Long tasks (50-330 ms) occur at the same rate silent as playing under 4x throttle (silent: 76 tasks / 5.6 s total in 7 s; storm first 7 s: 62 / 5.6 s): they are the page's own load, not the engine.
- Hall scroll fps (Pixel 7, 4x CPU, 3 runs): silent 50-55; storm stereo 38-57; storm 3d 37-46; nightcity 3d 37-50; cabin 3d 37-56. Noisy (+-8) but 3D is about 5-10 fps below silent; touch defaults to stereo. A harness page crashed once on the 5th launch (memory in the test box).
- Loudness table (LUFS / norm dB): most beds -19..-20 (norm about -1..0); fire -24.3 (+4.3), roomTone -24.5 (+4.5), ship -23.7 (+3.7), leaves/library -22.7 (+2.7), clank -23.5 (+3.0), crickets -21.5 (+1.5), thunder -17.7 (-2.3).
- Samples (30 s master captures, 64 kbps Opus, debugSpeed 4): `notes/agents/ambience-v4-samples/{storm,samadhi,nightcity}.webm`.

## Open
- By-ear check of everything (arcs depth, HRTF placement, reversed rain, +4.5 dB room tone/fire norm, bridge synth level).
- M4A/AAC path untested (CUTS found on the webm decode; PAD 0.1 s covers small differences).
- HRTF costs 5-10 fps on throttled mobile; default stereo on touch.
- A true offline (OfflineAudioContext) render was not used; the live master was captured instead.
