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

