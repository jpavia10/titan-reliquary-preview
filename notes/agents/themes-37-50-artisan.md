# Artisan pass: themes #37-#50 (Grok, theme-37-50 worker)

Bar: Awwwards SOTD / Lusion / Active Theory. Floor device S24 Ultra (Adreno 750) at 60 fps; scale up on RTX 4090 ultrawide; iPad Safari checked.
Each theme is critiqued before it ships and again after each follow-up push. "Ship" means a working version passed the tests; it is not "finished".
Shared GPU kit (fx/: kit.js, atmos.js, particles-gpu.js) landed at tr190. From Ferrofluid v2 on, every theme runs on it: my own modules plug into TitanFXK.mod().

## #37 Ferrofluid (ferro), v1
**What works**
- Intro is a real concept, not a template: the name *is* the magnet. It's rendered to a blurred field texture, and a raymarched heightfield grows Rosensweig spikes only where the field is. Drop, ring-out, a left-to-right magnet sweep, then the spikes sharpen. It stays legible on phone (stacked) and spans the full ultrawide width.
- Background: a raymarched mirror-black pool with a hex spike lattice that rises under your finger, under a wandering magnet, and in a travelling ring after each tap. The "surge" moment sends a wave across the whole pool.
- UI: glass-black panels with a softbox highlight and cyan rim, a magnetic hover bulge, and gradient-metal headings.
**Below the bar (next rounds)**
1. Spikes read teal-matte in software-GL captures. They need true black-mirror PBR: an HDR environment probe, a 2-light orbit with bloom on spike tips, and ACES tonemap. Real GPU will look better than the captures, but don't count on it.
2. It's not a real simulation yet. Next: a GPU height/velocity sim (ping-pong FBO) so spikes have inertia and wobble and merge when the field moves, plus 1M-particle iron filings in the intro sweep once the fx/ toolkit lands.
3. Signature interaction: hold to "charge" the magnet. Spikes grow taller with haptic ticks, and letting go splashes them flat.
4. The coin-page world is still the shared 2D particle canvas (rising cyan motes). It needs a ferro pool under the 3D coin that reacts to the coin's spin. That's coin3d.js, which the foundation worker owns, so it needs a hook from them.
5. Sound: a procedural scene (C# phrygian, lab hum) plus intro cues. Add granular "spike crackle" tied to field strength in the background.
Verdict: ship v1 (passes tests, real GPU raymarch, unique intro). Rounds 1-3 go next.

---
# Queue of the theme-rebuild worker (owner of fx/), resume here
1. [LIVE tr190] Neon Vault (neon) v1: fx/ kit + atmos + GPU rain. Toolkit base (fx/kit.js, atmos.js, particles-gpu.js, themes.js, textures.css) is now ON MAIN.
2. [LIVE tr194] FX SIM TOOLKIT + demo fx/demo.html. Not built: WebGPU compute path.
3. NEXT: Neon Vault v2 on the toolkit (+ rain/neon sound + tap sound; coin-page shot after it settles) (bloom/ACES, raymarched fog, electric-hum UI voice in wings/ui-sounds.js, coin-page reflections).
4. Zen Garden (zen): 1M sand on curl field + rake + coins as obstacles, raked rings/rocks (atmos sand layer exists), petals, mist, moon rays, fluid for water. Don't touch js/intros/zen.js.
5. Nocturne (nocturne): full rebuild + new intro (claim js/intros/nocturne.js in SHARED_LOG first).
6. Theme #35 Tron-inspired (original name, e.g. "Gridrunner"); 7. Theme #36 R&M vibes (e.g. "Multiverse Garage"). Via tools/themes/add_theme.py + intro + ui-sounds voice + coin3d WORLD row. NOTE: check numbering vs the theme-37-50 worker.
8. FX audit (/workspace/themes-review/FX_AUDIT.md) then artisan re-pass of all themes worst-first.

## #37 Ferrofluid (ferro), v2 (on fx/)
**Fixed from v1**
1. Lighting: the pool is a black mirror with Fresnel clearcoat in an HDR studio (key softbox, tall strip, cyan horizon rim, cool kicker). The image now goes through bright-pass, quarter-res separable blur and ACES filmic tonemap, so the spike tips bloom. Flats stay glassy black; only the spike flanks and tips catch light.
2. Real simulation: the fluid's magnetisation is a GPU spring-and-wave sim (320x320 half-float ping-pong, 3 substeps per frame). Spikes overshoot, wobble, merge and ring out as the field moves. The field comes from two magnets wandering under the pool, the pointer, tap rings and a periodic surge wave.
3. Signature move: press and hold anywhere for about 0.3 s and the magnet charges. A crown of tall spikes rises under your finger, with a rising hum and (on Android) vibration ticks. Let go and it collapses with a splash wave that rolls across the pool.
4. Intro: a million iron filings (two million on a big screen), one GPU point each. A bar magnet slides under them and they snap into the classic dipole field-line pattern. Then they stream along curling paths into the letters of the name, standing up and glinting, and the liquid rises through them in the same letters as they melt in. Sound follows each act (hiss, magnet hum, swarm whoosh, spike crackle, glint).
5. Fine iron dust (kit GPU particles, about 84k on a phone) hangs in the light above the pool.
**Still below the bar**
- The coin page is still the shared 2D particle world. I've asked the foundation worker for a hook in SHARED_LOG.
- The bloom is one level; a multi-level mip bloom with lens dirt would be richer.
- The spike lattice is procedural, scaled by the sim. A true per-spike instability (Rosensweig solved at its own wavelength) would let spikes split and coalesce on their own.
- I couldn't check fps on a real Adreno 750; the box only has software GL. The kit's governor drops render scale and step count if frames run long.
Verdict: ship v2.

## #40 Supercell (supercell), v1 (Claude, 2026-10-21; theme work moved to Claude for the week)
**What works**
- A real raymarched volume (`fx/supercell.js`): updraft tower with turrets that leans downwind, a flat anvil with an overshooting dome and
  mammatus under it, a striated base that flares outward and turns (spiral plates), a lowered wall cloud, rain curtains. Rendered into its
  own reduced-resolution buffer (tier .32-.66) and upscaled with a soft 5-tap filter, like `fx/volume.js`.
- Light: a low dusk sun behind the camera (warm front faces, blue undersides, the anvil's underside catching the afterglow) and lightning
  as point lights INSIDE the cloud with return strokes; a flash brightens the whole sky and the wet plains.
- Sound sync both ways: the "storm" soundscape's own flashes (titan:scape) become flashes here (under 1.4 km = a ground strike), and a tap is
  a ground strike that tells the soundscape (titan:fx lightning, dist .7) so the thunder answers. Silent schedule when no soundscape plays.
- Intro (`js/intros/supercell.js`): three in-cloud flashes show the carved, backlit name, a ground strike stamps it white-hot, it cools to
  silver; wind, thunder delayed by distance, the close crack.
**Below the bar (next rounds)**
1. Tuned only on software GL (swiftshader). No fps from a real phone yet; volume cost per tier is a guess (26/38/56/80 steps).
2. The tower still reads a little "solid"; true cauliflower billows need a second, smaller noise band and a silver lining on the sun side.
3. Bolts are screen-space (one branch). A real branching tree with a stepped-leader phase before the return stroke would sell it.
4. No picker card yet: requested in the art queue (`artreq_20261021-1900_theme-cards-supercell`, rule 9); the CSS swatch stands in.
5. Music: Beethoven's Pastoral IV (Thunderstorm) and Vivaldi's Summer Presto queued in `docs/music/wanted.json`; recorded orchestra until then.
6. Coin page: the shared 2D world (rain, `wings/coin3d.js` WORLD row); its own storm under the coin waits on the coin3d world hook.
Verdict: ship v1.

## #41 Tourbillon (tourbillon), v1 (Claude, 2026-10-21)
**What works**
- One full-resolution pass (`fx/tourbillon.js`) draws the movement as layered parts with heights: dark ruthenium plate with overlapping
  perlage, gilt train (barrel, centre, third wheel, steel pinions), rhodium bridges with one Cotes de Geneve pass across the movement and
  mirror-polished anglage, blued screws, rubies in gold chatons, a sunburst ratchet + crown wheel + click, two repeater gongs with hammers,
  a seconds ring, and a flying tourbillon. Parallax by height; every layer shadows the ones below along the ray to the lamp.
- The teeth mesh: phases solved from tooth counts (barrel 96/12, centre 80/10, third 80/10, fixed seconds wheel 72/8, ratchet 60/24), so
  every wheel turns at its true ratio. The cage turns once a minute on the REAL seconds (its arrow reads the ring) and steps 1 degree per
  beat; the escape wheel rolls round the fixed wheel at 9 turns per cage turn (half a tooth per beat); fork with ruby stones; screw
  balance at 21,600 vph with exact analytic motion blur (a 10 ms shutter, no strobing) and a hairspring that breathes.
- The lamp is the pointer: Cotes stripes ripple, perlage spots flicker, bevels flash, black polish turns black to white. Idle, it drifts
  over the lower half so the title stays clear (plus a calmer top and a drop shadow under h1).
- Sound only from recordings (`audio/scape` preset "movement"): the escapement ticks 6/s with a real tick and tock cut from the clock
  recording, scheduled on the wall clock like the picture (getOutputTimestamp), so they agree without messages. Tap = wind (ratchet clicks
  + the balance swings wider for ~20 s); hold = minute repeater striking the current time on two gongs cut from one chime strike.
- Intro (`js/intros/tourbillon.js`): the crown winds the ratchet tooth by tooth, the camera dives to the balance swinging up, the train
  cascades out wheel by wheel (meshing, stepping on the beat), blued Breguet hands sweep a turn and lock at 10:10, engraving the name.
- Cost on software GL is below Supercell and Event Horizon (429 ms/frame at 640x380 vs 1000 and 600).
**Below the bar (next rounds)**
1. Tuned only on software GL; no fps from a real phone yet. If it is heavy, Low already drops the overlapping perlage and wheel shadows.
2. Bridges cover pivots but the train is still a little sparse at the left edge on wide screens; a second barrel or a power-reserve
   differential would fill it.
3. The hammers read small on phones; the gongs are thin. A close-up "repeater" camera move during a hold would show them properly.
4. The intro uses real recordings only after they are in memory (first play: short filtered clicks and a two-note gong).
5. No picker card yet: `artreq_20261021-2300_theme-cards-tourbillon` (rule 9); the CSS swatch stands in.
6. Music: Haydn's Clock symphony (II), Mozart's K. 608 for a mechanical organ, Haydn's musical-clock pieces queued in
   `docs/music/wanted.json`; recorded piano until then.
Verdict: ship v1.

## #42 Darkroom (darkroom), v1 (Claude, 2026-10-22)
**What works**
- The prints are the collection (`fx/darkroom.js`): every 26 s a sheet slides into the developer and one of your photographed coins
  (its phone cut-out, black and white, on black velvet, with an archive caption "COUNTRY · YEAR · DENOMINATION / No. C###") comes up
  out of the white paper, shadows first and a little unevenly where the developer flows; at the bell it is lifted toward the stop
  bath and the next one goes in. Open a coin in the app and its print is next (titan:coin). First print is the name.
- A real liquid surface: the tray rocks (first sloshing mode along the tray, a little across), taps and the paper make rings,
  crossing capillary wavelets; it refracts the print and the ribbed bottom, focuses the safelight into caustics (its curvature) and
  reflects the safelight, which wobbles. Rim, wet counter with drops near the lamp, stop bath at the edge, dust in the red light, a
  GraLab-style timer whose luminous marks are the one green thing in the room.
- Sound from recordings only (`audio/scape` "darkroom"): vent hum + room, a lowpassed river cut each time the tray rocks, the timer's
  tick once a second while the print develops (the clock recording), its bell (three strikes cut from the chimes recording), the
  paper going in; tap = a stronger slosh and a drip. The cycle sits on the wall clock, so picture and sound agree without messages.
- Intro (`js/intros/darkroom.js`): safelight up, the enlarger projects the name in white light on the easel, the sheet slides into
  the developer, the name comes up black; timer ticks and bell.
- The cheapest of the new themes on software GL (143 ms/frame at 640x380; Tourbillon 429, Supercell 1000).
**Below the bar (next rounds)**
1. Tuned only on software GL; no real-phone fps yet.
2. The scene is top-down; a slight perspective (looking along the tray row: developer, stop, fixer) would read more like a room.
3. Prints drying on a line above the trays, a print being lifted with tongs (drips running off it) would sell the pull-out.
4. The intro uses real recordings only after they are in memory (first play: filtered clicks, a swish, a synthesized bell).
5. No picker card yet: `artreq_20261022-0100_theme-cards-darkroom` (rule 9); the CSS swatch stands in.
6. Music: Chopin Nocturne Op. 48 No. 1, Satie Gnossienne No. 3, Ravel Le Gibet queued; recorded piano until then.
Verdict: ship v1.


## #43 Silver Screen (silverscreen), v1 (Claude, 2026-10-22)
**What works**
- The film is the collection (`fx/silverscreen.js`): a silent newsreel on a 4:3 screen, 12 s a subject on the wall clock: an
  art deco intertitle tinted amber (— from the collection —, COUNTRY, year · denomination, No. C###), then the coin's own shot (its
  phone cut-out in silver black and white, a slow push-in), closing on an iris; open a coin in the app and it is the next subject
  (titan:coin). The first subject is the title card (the collection presents TITAN RELIQUARY); with no coin loaded it holds.
- Real projection at 18 frames a second: each frame has its own gate weave, flicker, grain (in screen pixels), a speck of dust and
  now and then a scratch; the projector's hot spot. The screen's light falls on the drapes, the gilded proscenium, the swag valance
  and the rims of the seat backs.
- The beam comes from the booth behind and above you, so it rises out of the picture and widens toward you (in the image every ray
  meets the booth's mirror point below the screen); each ray carries the light of the picture along its line, so the streaks
  change with every shot; drifting haze and motes; tap the beam and the dust swirls there.
- A picture palace from the stalls: velvet drapes gathered at the sides, a swag valance, a fluted gilded frame, footlights, deco
  wall sconces on the side walls (wide screens), rows of seats in perspective. Phone and desktop have their own layouts.
- Sound from recordings only (`audio/scape` "picturehouse"): the projector's intermittent at 18 frames a second (the clock recording,
  sped up and dulled by the booth glass) over its motor (the laboratory recording, low-passed), the changeover between subjects (the
  slide-projector recording) as the iris closes, the hall (the church recording) with a full house murmuring and a seat creaking now
  and then. Frames and changeovers sit on the wall clock, so picture and sound agree without messages.
- Intro (`js/intros/silverscreen.js`): house lights down, the curtain parts and gathers into the theme's drapes, the leader flickers,
  the beam rises, an iris opens on the title card; the organ is the opening phrase of Bach's Toccata BWV 565 (Ashtar Moïra, public
  domain; a 5.3 s cut in `audio/cuts/organ`), the projector winds up to 18 fps (clock recording), its motor hums. It ends on the
  theme's own composition, so the reel goes on from it.
- The cheapest of the new themes on software GL (87 ms/frame at 640x380, same method: Darkroom 138, Tourbillon 364).
**Below the bar (next rounds)**
1. Tuned only on software GL; no real-phone fps yet.
2. Low quality saves little (motes and one haze octave); a half-resolution beam pass would be the real saving.
3. The audience is only seat backs; heads in silhouette against the screen (a few, slowly shifting) would make it a full house.
4. The intro's organ and projector use recordings only after they are in memory (first play: filtered clicks and a hum, no organ).
5. No picker card yet: `artreq_20261022-0200_theme-cards-silverscreen` (rule 9); the CSS swatch stands in.
6. Music: Joplin (Maple Leaf Rag, Solace, The Entertainer) and Debussy's Golliwogg's Cakewalk queued; recorded piano until then.
Verdict: ship v1.
