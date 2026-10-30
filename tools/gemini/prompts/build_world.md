You build ONE new GPU world for a theme of Titan Reliquary, a private coin-collection app. The world is the theme: it runs full screen
behind the app as the backdrop, plays the theme's opening (a camera move on this same world), and is the theme's room (a space to be in
the theme with the collection hidden, where you look around, move, touch it and change its look). Return the COMPLETE file fx/<id>.js in
ONE ```js code block and nothing else: no explanation, no placeholders, no "...", every function written out.

WHAT YOU GET AFTER THIS BRIEF
- THIS THEME: its id, name, mood, styles, palette (CSS colours of its pages), soundscape preset, and the source of the effect it has today
  on the old engine. Keep that effect's idea as the world's signature (the same motion and the same feel), but make it a full place
  with depth, light and atmosphere, not a flat overlay.
- A REFERENCE WORLD (fx/kintsugi.js): a complete world on the same kit with the room data, the view, the look controls and debug. Copy its
  structure exactly (the IIFE, K.mod, the returned part, K.themes[id] = { stack, room }); never its picture.

THE EFFECT TODAY, IN FULL (when given): every shader the old engine compiles for this theme, and two pictures: the theme in the app
today, and its effect alone with the collection hidden. That effect is the theme's identity: port its shader math faithfully (the
same shapes, motion, colours, moments) as the world's signature layer, now drawn OPAQUE as part of a full environment built from the
palette (the old effect was a transparent overlay over the page's CSS background: you now draw that background too, and more).
Old engine -> kit: uTime -> c.t; uRes -> canvas size; uBg, uInk, uAcc, uTint -> constants from the palette; uInt, uFade -> 1;
uQ (quality 0..3) -> from the tier (low 0, medium 1, high 2, ultra and max 3); uPtr, uPar -> pointer parallax (off in room mode);
uTap -> your tap array; uMoment (age, seed, dur, index) -> your own scheduler in JS (the same "every [min, max] seconds, dur" the preset
declares); uFlash, uBolt, uAudio, uPulse -> 0 or your own; uSafe, uSafeK, uSafeMix (a text mask) -> remove; the film pass -> leave it
out (the kit's post module does grain and vignette); instanced particle passes -> the kit's particle module in the stack (see
fx/horizon.js: { mod: "particles", count, shape: "dot" | "mote" | "streak", size, curl, scale, speed, life, c1, c2, alpha, blend: "add",
depth, glint, rake, gravity, drift, spawn }) or your own; a 2D canvas texture (uTex drawn by a JS draw function) -> port the draw
function and upload it with gl.texImage2D when it changes.

THE KIT (fx/kit.js, already in the app; do not redefine anything it provides)
- K = window.TitanFXK. K.mod(name, function (gl, s, K) { ... return part; }) registers a module; the theme entry
  K.themes.<id> = { stack: [ { mod: "<id>" }, { mod: "post", bloom, threshold, knee, exposure, aberr, grain, vig } ], room: { ... } }.
- part = { name: "<id>", step: function (c) {...}, draw: function (c) {...}, debug: function () {...}, dispose: function () {...} }.
  c = { t (seconds), dt, w, h (canvas pixels), ptr: { x, y (0..1, y up), down, tap (time of the last tap), tx, ty (where), vx, vy },
  still (true = one still frame: Motion Calm/Off), lite, view: { mode, yaw, pitch, move, up, look } }.
- K.compile(K.FSQ, fragmentSource) -> { p, u } (u = uniform locations by name) or null; K.FSQ is the full-screen vertex shader; draw with
  gl.useProgram(pr.p); ...uniforms...; gl.drawArrays(gl.TRIANGLES, 0, 3). K.NOISE is a GLSL string with float h21(vec2), vec2 h22(vec2),
  float vn(vec2), float fbm(vec2), float fbm3(vec2), vec2 curl(vec2, float); K.NOISE3 adds float h31(vec3), vn(vec3), fbm(vec3), fbm3(vec3).
  Put  K.NOISE + K.NOISE3  after the precision line, and never define functions with those names yourself. Shaders are GLSL ES 3.00 ("#version 300 es", precision highp float, out vec4 o).
- K.bindTarget() binds the frame target before drawing (the post module composites); call it at the start of draw.
- var look = K.look || function (id, def) { return def; };  (the room's look controls; an older cached kit lacks K.look)
- Quality tier: read it once at the top: var T = (function () { try { var q = String(window.TitanQuality.tier()).toLowerCase(); if (/^(low|medium|high|ultra|max)$/.test(q)) return q; } catch (e) {} return "high"; })();
  and scale loop counts and resolution with it (Low must stay light enough for an old phone; Max may be rich). Never lower it yourself.

THE WORLD CONTRACT (each point is checked by a test before anything ships)
1. step/draw read  var v = c.view || {};  and keep lastView = v for debug. Camera: with yaw = pitch = move = up = 0 the world shows its
   backdrop view. A 3D world (rays from a camera): yaw orbits the subject, pitch tilts, move goes TOWARD the subject, up lifts.
   A flat or 2.5D world: p = (p - vec2(yaw, pitch + up)) * exp(-move) applied to the screen coordinates before anything else.
   New uniforms only for these (uView vec4 is fine); set every uniform every frame.
2. Depth: at least three layers at different distances (far, middle, near) that move against each other when the camera moves
   (parallax), plus fine particles (dust, motes, embers, sparks, snow, spores: whatever fits) in the near layer.
3. Look controls: 3 or 4, each a multiplier with default 1 that leaves the picture as it is at 1 (multiply by look("id", 1); never
   x * (1 - look * k)). Typical: light or glow, haze or fog, particles, motion speed (a speed control is an offset on the clock:
   off += c.dt * (look("speed", 1) - 1), reset to 0 when c.view.mode is "backdrop"; never multiply the time).
4. Touch: a tap (c.ptr.tap changes) makes the world react where it was tapped (a ripple, a burst, a flare, a strike); keep the last few
   taps in a small uniform array with their age. In room mode (v.mode === "room") ignore pointer parallax (the room reads the pointer).
5. The collection sits on top of the backdrop: keep the middle of the screen calm and mid-dark (no bright flashing behind text; the
   brightest light toward the edges or the top), and no text, letters or logos in the world.
6. Motion Calm/Off (c.still): draw one good still frame; nothing may depend on frames having been drawn before.
7. Cost: one or two full-screen passes; a half-resolution offscreen target for anything heavy (raymarching, volumes), composited in a
   second pass, is the right pattern. No outside files, libraries, textures, images or video; everything is procedural.
8. debug() returns { tier: T, cam: [the view numbers, 3 decimals], look: { every look id: its value } } plus anything useful.
9. dispose() deletes every program, texture and framebuffer it made.
10. room: { name: "<a short evocative name for being there>", yaw: [min, max], pitch: [min, max], move: [min, max], up: [min, max],
    unit: "<m | screen>", sound: "<the soundscape preset given below>", look: [{ id, label, min, max, def: 1 }, ...],
    touch: "<one sentence: what a tap does>",
    opening: { dur: <5 to 6>, from: { yaw, pitch, move, up }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: <seconds>, at: [x, y] } }
    Limits: the subject must stay fully on a phone screen (about .46 screen heights wide) at every limit. A flat world: yaw within
    [-.15, .15], pitch within [-.12, .12], up within [-.08, .08], move within [-.4, .6]. A 3D world that orbits may turn further.
    The opening is a camera move that ends exactly on the backdrop view, with the tap at `hit` seconds where the world reacts visibly.
11. Close every bracket: K.themes.<id> = { stack: [ ... ], room: { ... } }; and the IIFE.

QUALITY BAR: this world replaces the theme's whole look. It must feel like being in the place the mood describes, at the level of the
app's best worlds (a raymarched storm, a watch movement at true gear ratios, a picture palace with a projector beam): real light (one key
light, soft shadows or occlusion, atmosphere that the light passes through), believable materials, slow living motion, a sense of scale.
Not a coin in a ring in the middle of the screen, not a flat gradient with noise, not a template shared with other themes.
