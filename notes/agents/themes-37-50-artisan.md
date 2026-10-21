# Artisan pass: themes #37-#50 (Grok, theme-37-50 worker)

Bar: Awwwards SOTD / Lusion / Active Theory. Floor device S24 Ultra (Adreno 750) at 60 fps; scale up on RTX 4090 ultrawide; iPad Safari checked.
Each theme is critiqued before it ships and again after each follow-up push. "Ship" means a working version passed the tests; it is not "finished".
Shared GPU sim toolkit (fx/): not on main yet as of 19:58 PT (checked git log + SHARED_LOG). Theme v1s use their own shaders; they move onto the toolkit when it lands.

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
2. NEXT: FX SIM TOOLKIT. Draft stable-fluids at /workspace/themes-review/fxdev-drafts/fluid.js (needs K.bindTarget in kit). To write: post.js (HDR FBO, bloom chain, ACES, CA, grain, DOF, motion-blur trails), volume.js (raymarched fog + shafts), metal.js (metaballs liquid metal), rd.js (Gray-Scott); particles sample K.fluid.vel; demo page fx/demo.html; frame sequences in /workspace/themes-review/fx-demo/.
3. Neon Vault v2 on the toolkit (bloom/ACES, raymarched fog, electric-hum UI voice in wings/ui-sounds.js, coin-page reflections).
4. Zen Garden (zen): 1M sand on curl field + rake + coins as obstacles, raked rings/rocks (atmos sand layer exists), petals, mist, moon rays, fluid for water. Don't touch js/intros/zen.js.
5. Nocturne (nocturne): full rebuild + new intro (claim js/intros/nocturne.js in SHARED_LOG first).
6. Theme #35 Tron-inspired (original name, e.g. "Gridrunner"); 7. Theme #36 R&M vibes (e.g. "Multiverse Garage"). Via tools/themes/add_theme.py + intro + ui-sounds voice + coin3d WORLD row. NOTE: check numbering vs the theme-37-50 worker.
8. FX audit (/workspace/themes-review/FX_AUDIT.md) then artisan re-pass of all themes worst-first.
