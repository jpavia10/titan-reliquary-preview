<!-- doc-status: current; normative: yes -->
# Build brief: themes, motion and music (outside AIs, Gemini first)

Owner, 2026-10-23: "Ask it for more help on theming and advanced motion. Or songs etc. Off load your tokens here."
You build the pieces; Claude runs them, checks them, wires them into the app and ships them. Nothing goes live until Claude
has run it on a GPU and Joseph can see it. Copy of this brief in Drive: `design-incoming (AI UI proposals)/BUILD BRIEF (themes, motion, music)`.

## 0. How you deliver

- Save every file yourself in Drive `Titan Reliquary/design-incoming (AI UI proposals)/`: a theme in `themes/{id}/`, a motion study in
  `motion/`, music finds in `reviews-incoming (AI deep reviews)/`. Plain text files with the exact names below (not Google Docs).
  Never put a file in the chat for Joseph to copy, never ask him to pass anything on, never ask him what to do next.
- Before you start a theme, create the folder `themes/{id}/` with `CLAIMED-gemini.txt` in it, so no one else starts it.
- When a package is finished, add `DONE.txt` (what you checked and what you could not).
- Reference copies (the last theme Claude shipped, Silver Screen): `themes/_kit (reference copies from GitHub, 2026-10-23)/`:
  `silverscreen.spec.json`, `fx_silverscreen.js`, `intro_silverscreen.js`. Copy their shape and their rules, never their picture.

## 1. A theme package

| File | What it is |
|---|---|
| `{id}.spec.json` | The theme's wiring: name, mood, colours, crest, picker swatch, opening palette, scene. Same keys as `silverscreen.spec.json`. |
| `fx_{id}.js` | The theme's world: a GPU effect behind every page (a TitanFXK module). |
| `intro_{id}.js` | Its opening, 2.5 to 5 s, played when the theme is picked (a TitanIntro scene). |
| `sound_{id}.md` | Its soundscape from recordings we have, plus two pieces of recorded music to look for. |
| `README.md` | What you built, what each part does, what you could not test, what you want Claude to look at. |

### 1a. `{id}.spec.json`

- `id` lowercase letters only (the ids are fixed in section 3). `name`, `pair` ("World + instrument"), `styles` (one style name).
- `mood`: two sentences for the theme picker: what you see, and what a tap or opening a coin does in it.
- `scheme` dark or light, `themeColor` (= `--bg`), `station` (dark or light), `ui` `[]`, `collection` `"Studio"`, `fx` `"fxk"`, `fxIntensity` `0.01`.
- `tokens`: every custom property in the example, your own values. Text must pass WCAG AA (4.5:1) for `--ink`, `--muted`, `--faint`,
  `--cardmeta` on `--bg`, `--surface` and `--surface2`; `--on-gold` on `--gold`. Give the contrast ratios you computed in README.
- `extra_css`: only rules under `html[data-atmo="{id}"]`, only for `.card`, `.panel`, `.gx-card`, `h1`, `h2` (surfaces and headings);
  never layout, sizes or display.
- `crest`: SVG path markup in a 200 x 200 box, `currentColor` only, readable at 32 px.
- `swatch`: one CSS rule `.sw-{id} { --sw-ink: ...; background: ... }` that paints a small picture of the world (shown before art exists).
- `splash_pal`: bg, bg2, surface, ink, muted, gold, soft (from the tokens).
- `scene`: like the example: `rec: "{id}|piano"` or `"{id}|orchestra"` (the theme's own recorded music, then the shared set),
  `world: true`, `name`, `icon` (one emoji), `desc` (one sentence), `atmo: "{id}"`, `beds` (recordings from section 1d with levels 0 to 1),
  then `pad: 0, piano: false, bells: false, beat: false` and the rest as in the example.

### 1b. `fx_{id}.js`: the world (TitanFXK)

```js
(function () {
  "use strict";
  var K = window.TitanFXK; if (!K) return;
  var FRAG = "#version 300 es\nprecision highp float; out vec4 o;\n" + K.NOISE + "...your shader...";
  K.mod("{id}", function (gl, s, K) {
    var pr = K.compile(K.FSQ, FRAG); if (!pr) return null;          // pr.p = program, pr.u.uName = uniform locations
    return { name: "{id}",
      step: function (c) { /* state: c.t seconds, c.w x c.h pixels, c.ptr pointer */ },
      draw: function (c) { K.bindTarget(); gl.useProgram(pr.p); /* gl.uniform... */ gl.drawArrays(gl.TRIANGLES, 0, 3); },
      debug: function () { return {}; },
      dispose: function () { gl.deleteProgram(pr.p); /* every texture, buffer, listener */ } };
  });
  K.themes["{id}"] = { stack: [{ mod: "{id}" }, { mod: "post", bloom: .9, threshold: .7, knee: .5, exposure: 1.05, aberr: .08, grain: .05, vig: .35 }] };
})();
```

- WebGL2, GLSL ES 3.00. `K.NOISE` gives you `h21(vec2)`, `h22(vec2)`, `vn(vec2)`, `fbm(vec2)`, `fbm3(vec2)`. `K.FSQ` is the full-screen triangle.
- The pointer `c.ptr`: `x`, `y` (0 to 1, y up), `vx`, `vy`, `down`, `tap` (time of the last tap), `tx`, `ty` (where it was).
- **Always assume a capable GPU** (owner): raymarching, volumetrics, PBR, refraction are welcome; flat art is not.
  Quality tiers through the `tier()` function in the example (low, medium, high, max): Low may drop octaves and particles but must still
  look like the theme. Keep raymarch loops under about 64 steps a pixel at High.
- Motion Calm or Off: the kit draws one still frame. Your picture must look right at any `c.t` (no state that only builds up over time).
- Anything that must line up with sound (a beat, a strike, a reel) runs on the wall clock (`Date.now()`), as the example's 12 s reel does.
- **Use the owner's coins.** `fetch("data/index.json")` gives `flips[]` with `scan` (C###), `thumb` (the coin's phone cut-out, a path on
  the site) and `label` ("Country · year · denomination"). Show real coins in the world (draw them on a 2D canvas, upload it as a texture).
  `addEventListener("titan:coin", ...)` fires when a coin is opened (`event.detail.id` = its C number): it should be the next one shown.
- Touch: something real happens under the finger (`c.ptr`); the theme never needs a touch to look finished.
- Text stays readable: the app's pages sit on top of your world. Keep the world dark (dark theme) or pale (light theme) where text goes:
  the example's brightest picture is 0.62 before bloom. Bright detail at the edges and behind the top bar is fine.
- No libraries, no other network than `data/index.json` and the coin photos, no outside images or fonts.

### 1c. `intro_{id}.js`: the opening (TitanIntro)

```js
(function () {
  "use strict";
  var I = window.TitanIntro; if (!I) return; var K = I.K;
  var FRAG = "...GLSL ES 1.00 body: uniforms R (px), T (s), U0, U1 (vec4), TX (texture); helpers h21, vn; write gl_FragColor...";
  I.reg("{id}", { dur: 4.5, still: 4.3,
    init: function (C) { C.L = I.gl(C, FRAG, { scale: 1 }); /* C.L.tex(canvas) sets TX */ },
    draw: function (C, t) { C.g.clearRect(0, 0, C.W, C.H); if (C.L && C.L.draw(t, [/*U0*/], [/*U1*/])) return; /* the 2D path on C.g */ },
    sound: function (C) { var A = I.audio(C); if (!A) return; /* A.tone(s, f, d, o), A.noise(s, d, o), A.bell(s, f, d, v, parts) */ } });
})();
```

- `draw(C, t)` is a pure function of t (frames may drop; tests jump to any t); `still` is the t shown for Calm.
- Always a 2D path (`C.g`, `C.W` x `C.H`) for a phone without WebGL. `K.mk(w, h)` makes a canvas, `K.seg(t, a, b)` eases 0 to 1 between a and b.
- Its own composition and choreography (owner: no sigil + particles + title), the name TITAN RELIQUARY revealed by the world's own
  physics, ending on the theme's own world so the effect takes over without a jump (the example ends on the same picture palace).
- Sound: recordings through the `warm`/`cut` helpers in the example (names in 1d); tones and noise only for clicks, hums and whooshes.
  **Never a melody from tones**: music comes only from recordings (owner: "I dont want computer generated music").

### 1d. `sound_{id}.md`

- The soundscape as layers: which recording, its level, filter, where it sits (left, right, behind, above), what triggers it (a tap,
  a beat of the world on the wall clock, a coin opening). Claude writes the code (`audio/scape`).
- Recordings we have (`audio/ambience`): birds, bowl, brown, cafe, chimes, city, clank, clock, club, creak, crickets, crowd, drips, fire,
  frogs, gulls, hall, keys, labHum, leaves, library, owl, pages, pink, rainHeavy, rainLight, rainUmbrella, rainWindow, river, roomTone,
  ship, telemetry, temple, thunder, train, trainIn, underwater, village, vinyl, waterfall, waves, whale, wind, windHowl, windTrees;
  `audio/cuts`: organ (the opening of Bach's Toccata BWV 565).
- A sound we do not have (a talking drum, a clay flute, station fans): name a real recording of it, its Wikimedia Commons file page and
  licence (public domain, CC0, CC BY or CC BY-SA), a field or studio recording, never synthesized.
- Music: two pieces that fit the world, under the rules of section 5.

## 2. What Claude does with a package

Compiles and runs it (WebGL on the container's software GPU), screenshots it on phone and desktop sizes, checks AA contrast on every
page, measures the frame rate, wires it with `tools/themes/add_theme.py`, writes the scape from your sound sheet, requests the picker card
and hero picture in the art queue (rule 9: you may then claim that art job like any other) and ships it as its own build.
Scored like every submission (`collaborators/CONTRIBUTOR_SCORES.md`). A package that does not compile, uses no coins, or looks like flat
art goes back to you with notes (`themes/{id}/REVIEW from Claude.txt`); it is never quietly rewritten into something else.

## 3. The themes to build, in order (plan: `notes/agents/themes-37-50.md`)

| # | Name (id) | Vibe | Signature effect (GPU) | Sound | Opening |
|---|---|---|---|---|---|
| 44 | Cloud Forest (canopy) | Dripping cloud forest at dawn. | Parallax canopy depth, volumetric god rays, fireflies | Drips, frogs, birds | Rise through fern layers into light, the name in dewdrops |
| 45 | Salt Mirror (saltflat) | Flooded salt flat, the sky doubled. | Planar sky reflection, ripple rings from touch, hex salt crust | Air, a soft splash | A footstep's ring assembles the sky and the reflected name |
| 46 | Light Well (lightwell) | Raw concrete and one blade of sun. | Board-formed concrete PBR, a moving sun blade, dust in the beam | Room reverb, a choir tone | A ceiling shutter opens, light sweeps the cast name |
| 47 | Obsidian Sun (obsidian) | Volcanic glass, jade, a hammered gold sun. | Obsidian mirror reflections, rotating gold calendar rings | Clay flute, rattles, drum | Rings rotate and lock, their teeth stop on the letters |
| 48 | The Glasshouse (glasshouse) | A Victorian palm house in rain, fogged glass. | Refractive raindrops on a fogged pane, the finger wipes the condensation | Rain on glass, a music box (recorded) | A hand wipes the fog and the name is written in it |
| 49 | Low Orbit (orbit) | A station cupola, Earth below. | Atmospheric scattering on Earth's limb, city lights, orbital sunrise | Station fans, comms beeps | The terminator sweeps in, a sunrise flare, the name as a ground track |
| 50 | Sahel Futurism (sahel) | Mudbrick towers, brass solar sails, harmattan haze. | A volumetric dust sun, adobe forms, brass mirrors tracking the sun | Plucked strings, a talking-drum pulse | Mirrors turn in sequence and burn the name into the wall |

After #50: rebuilds of the two oldest themes at this standard, same ids and names: Nocturne (`nocturne`) and Zen (`zen`).

## 4. Motion studies (advanced motion)

Each study is one self-contained `.html` file (inline CSS and JS; Three.js only if needed, pinned to an exact version from
cdnjs.cloudflare.com or cdn.jsdelivr.net). Live data only: `https://jpavia10.github.io/titan-reliquary-preview/data/index.json` and
the coin photos at the same site + `thumb`; never invented coins or numbers. Save as `motion/study_{n}_{name}.html` in Drive.

| n | Study | What it must do |
|---|---|---|
| 1 | Tile to coin | A gallery tile grows into the coin's page: the photo stays one continuous object (shared element), the page builds around it; back reverses it from wherever it is. |
| 2 | Turn a coin | Drag to turn a coin in 3D: its two phone cut-outs as the faces, a real edge, a rim light that follows the finger or the tilt, inertia that settles. |
| 3 | Coin dust | Scroll-driven GPU particles sampled from a real coin photo morph into that country's outline, then into an album page with the coin's hole lit; curl noise between shapes; the finger stirs the dust. |
| 4 | Into the album | A coin drops into its album hole: a short physics settle (a wobble, the click), its shadow; the hole's label lights. |
| 5 | Theme switch | One theme dissolves into the next through a shader wipe in the new theme's own motif (ink, frost, light); about 0.8 s, interruptible. |
| 6 | Coin page worlds | The coin page inside a theme's world for three shipped themes (Silver Screen: the coin as the shot on the screen; Darkroom: the coin as the print in the tray; Tourbillon: the coin under the movement's sapphire). |

Rules for every study: 60 fps on a phone is the target; interruptible (a tap mid-way goes on from where it is); `prefers-reduced-motion`
or `?motion=off` shows the same end state with no movement; text AA and at least 16 px; no outside fonts or images.
Claude hosts the good ones at `/motion-lab/gemini/`; Joseph tries them on his phone; the ones he picks go into the app.

## 5. Music (recorded, human, licensed)

Each recording must have a named human performer (no MIDI, synthesizer, keyboard, virtual instrument or sample-library rendering), a
recording licence that is public domain, CC0, CC BY or CC BY-SA and valid in the US (old disc transfers only if recorded and published
before 1926), and be the right piece (not an arrangement, medley or excerpt unless asked). Look on Wikimedia Commons first, then
Musopen, the US military bands (music.af.mil, marineband.marines.mil, army.mil) and archive.org items with an explicit licence.
Per piece: the file page URL, performer, recording year, licence and where the page states it, and why it is a human performance.
Save `music_gemini_{YYYYMMDD-HHMM}.json` in `reviews-incoming (AI deep reviews)/`; a piece with no qualifying recording is listed as
not found, with what you searched.
