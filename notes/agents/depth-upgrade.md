<!-- doc-status: current; normative: no -->
# Depth upgrade: one world engine for the backdrop, the opening and a theme room (plan, 2026-10-29)

Claude owns this (owner, 2026-10-29: "You are in charge of adding depth and expanding the ambient features once again in conjunction
with the overall UI and expansion of the Atmosphere, fx and ambient drastic upgrades"). The rules it serves are CLAUDE.md rule 12.

## What the owner asked for
1. **Openings on the theme's own engine:** "the same physics and atmosphere engine as the themes have. Not mpeg or stuff thats
   prerendered", rendered live from code at the device's quality tier.
2. **A theme room per theme:** "a secondary location to experience the vibe away from the collection and to play around with the
   graphics and particle engine for the various effects and ambient engine".
3. **Scene Studio rebuilt:** theme selection, sound, ambience and effects "completely reworked ... high fidelity and somehow 3d vibes
   ... layers that interact with depth", and it leads into the room.

## Where things stand
- 18 themes have a GPU world on the TitanFXK kit (`fx/kit.js` + `fx/{id}.js`: Supercell, Tourbillon, Silver Screen, Darkroom, Cloud
  Forest, The Glasshouse, Low Orbit, Sahel Futurism, Nocturne, Zen Garden, Salt Mirror, Light Well, Obsidian Sun, Kintsugi, Event
  Horizon, Rift Garage, Lumen Circuit, Ferrofluid). Each draws one fixed view behind the page: the camera is a constant inside its
  shader. The other 32 themes use TitanFX presets (`wings/fx/engine.js`, full-screen 2D effects with a parallax and front layer).
- Openings are separate small scenes (`js/intros/{id}.js` on `js/intros/kit.js`, their own GL context). None uses its theme's world.
  Every new launch still plays a Grok film first (default opening "Film, then theme motion"; `splash.js`, `art/splash/`, 430 MB
  of the site's 924 MB).
- Ambience: `wings/scene-engine.js` (beds as overlapping chunks, one-shots, HRTF on desktop, stereo on touch), 45 sounds, all
  excerpts of the Moodist pack (licence "CC0 or Pixabay", not recorded per file). Music: 65 recordings, 17 themes with none of their own.
- Quality: one setting for everything (`wings/quality.js`, TitanQuality: Low to Max, auto picks a start tier once, never lowered
  mid-session; floor = Galaxy S24 Ultra, top = RTX 4090 on a 45" ultrawide).

## The design
**One world, three modes.** Every theme's world runs in three modes from the same code:
- *backdrop*: behind the collection, as now (dimmed, kept clear of text);
- *opening*: a 3-5 s camera move through the same world that ends on the title (and the coin of the day), then hands the same
  running world to the app as its backdrop, so the opening dissolves into the theme instead of cutting to it;
- *room*: full screen, no collection UI. You move through it (drag to look, pinch or scroll to move in, tilt on the phone), touch it
  (each world's own interaction: a strike, a wipe of the fog, a wind-up of the crown), and its sound sits in the space.
To do this each world takes a camera (position, direction, field of view) and a mode as inputs instead of constants, plus a
"look" block of named controls (fog, light, particles, speed, colour) that the room shows as sliders. Tiers as today.

**Depth everywhere.** The UI floats in front of the world on a few planes (world, mid fog, cards, glass panels, chrome). The planes
move against each other with the pointer, the phone's tilt and scrolling; the world's light falls on the planes in front of it; panels
are real frosted glass over the live world. Calm motion keeps the planes still; Off shows a still frame.

**Scene Studio v4.** The live world fills the screen behind it. Themes are cards on a curved shelf in depth that you spin through;
the card in front shows its world live, and "Step inside" takes you into its room. Sound and effects are layers you can see: each
sound is an object placed in the room's space (closer = louder and drier, farther = quieter and more reverb), each effect a plane with
its own slider. The current Themes / Sound / Settings content stays reachable; nothing is removed.

**Ambience v5.** Each room has a soundscape built from its five sounds (two beds, three details, from the sound hunt) placed in 3D;
details fire from the world's events (a lightning flash, a tick, a drip) at their position; music sits under it and ducks for details.
The Moodist sounds are replaced as licence-clean recordings arrive.

## Steps (each one shipped, checked on phone and desktop sizes, then the next)
1. **World contract + tier manager.** Camera, mode and look inputs on the kit; three worlds converted first (Supercell, Tourbillon,
   Silver Screen). Backdrop looks exactly as before.
2. **Room v1 for those three:** `#room=ID`, free look, the look sliders, their sounds placed in space; a "Step inside" entry in Scene
   Studio. Runs on its own page first (`/rooms/`, not linked) so the app does not change until the owner has tried it on his phone.
3. **Openings on the engine for those three:** opening mode replaces `js/intros/{id}.js` for them; Calm = one still frame.
4. **Scene Studio v4** (depth shelf, live world, layered sound and effect panels).
5. **The other 15 GPU worlds**, then the 32 themes without one (each needs a world before it can have a room).
6. **Ambience v5** with the sound-hunt recordings as they pass review.

## Status (2026-10-29)
- **Test site (owner: "Grok already made a github test pave for them u can use my other github site"):** the rooms and openings are
  tried on `jpavia10/titan-v6-splash-viewer`, folder `rooms/` (`https://jpavia10.github.io/titan-v6-splash-viewer/rooms/`). The room shell
  (`rooms/room.html`, `room.js`, `room.css`, hub `index.html`) lives only there; the world code and the sounds are the app's own, copied by
  `tools/rooms/sync_test_site.sh` (never edit them in the test site). Pages there also needs a stamp commit through the connector
  (`rooms/DEPLOY_STAMP.txt`), like rule 0.
- **Step 1 done for Supercell:** the kit has the world contract (`K.view` mode/yaw/pitch/move/up/look, `K.look(id, def)`, `K.tap(x, y)`,
  `ctx.view`); `fx/supercell.js` takes its camera from uniforms (backdrop unchanged: same frame within run-to-run noise, smoke 38/38),
  orbits the storm in the room (yaw circles a pivot 15 km ahead, so the storm stays in view from every side, backlit from the far
  side), keeps bolts in world space, and lists its room in `K.themes.supercell.room` (limits, four look controls with their soundscape
  parameters, the touch, the opening path). Soundscape: `TitanScape.face(yaw, pitch)` turns the listener with the camera.
- **Room v1 + opening v1 for Supercell** on the test site: drag orbits, pinch or scroll moves in, tap = a ground strike and its
  thunder, tilt the phone to look, Look / Sound / Quality panels as frosted glass planes that slide against each other, and the
  opening in the same world (out of black, the camera swings in, a strike, the name). Not yet on a real phone.
- **Grok's ideas carried into the contract next** (from `gold-live`, `notes/agents/reviews/GROK_OBSIDIAN_20261029.md`): `K.shock(x, y, p)`
  and `K.audioCouple(analyser)` so a sound's low end (a boom, thunder) pushes a world's particles, and a render scale per tier.
  The Obsidian room starts from gold-live's black-glass point on the shared kit.
- Next: Tourbillon and Silver Screen rooms, then the Obsidian room, then step 3 (the app's openings on the engine).
- **Later on 2026-10-29 (owner: "get the framework for all of the themes locked"): the framework is locked and steps 1-3 are in the
  app** for the three reference worlds. The plan from here is `docs/design/THEME_FRAMEWORK.md` (normative: one engine, the slots, the
  gate CL-WORLD-01, who does what, phases A-F); per-theme status `docs/themes/FRAMEWORK_STATUS.md`. The room lives in the app now
  (Scene Studio > Step inside; `wings/room.js` + `wings/room-shell.js`), so the test site's own shell is superseded: it runs the app's
  shell and worlds (`tools/rooms/sync_test_site.sh`). The other GPU worlds go through Gemini's conversion (`tools/gemini/convert_world.py`)
  and the conversion gate; the 31 themes without a world are Grok's homework (task 12).

## Decisions for the owner (asked in the readiness report)
- The Grok opening films: under rule 12 they stop playing; remove them from the site (frees about 430 MB of the 1 GB limit) or keep
  them as files only.
- Rooms first on their own page (recommended) or straight into the app.
