You convert one GPU world of the Titan Reliquary app to the shared world contract. You get three things after this brief:
the reference diff (how fx/supercell.js was converted), and the world file to convert. Return the COMPLETE converted file in ONE
```js code block and nothing else: no explanation, no "rest unchanged" placeholders, no shortened code. Every line of the original
that you do not need to change stays exactly as it is.

THE CONTRACT (fx/kit.js, already in the app)
- Every frame the kit calls the world's step(c) and draw(c). c.view = { mode: "backdrop" | "opening" | "room", yaw, pitch, move, up, look }.
  yaw and pitch are radians, move and up are in the world's own units (metres, km, or screen fractions for a flat world).
  The kit clamps them to the limits the world declares in its room block, so the world never has to clamp.
- K.look(id, def) returns the named look control or def when it is not set. Older cached copies of the kit lack K.look and c.view,
  so the world must work without them.

WHAT TO CHANGE (and only this)
1. Near the top of the IIFE, right after K is known, add exactly:
     var look = K.look || function (id, def) { return def; };   // an older cached kit has no world contract: the backdrop as before
2. In step(c) and/or draw(c), read the view once with a guard:  var v = c.view || {};
3. Camera. With yaw = pitch = move = up = 0 the picture must be EXACTLY the backdrop it draws today (same camera, same framing).
   - A raymarched 3D world (it builds a ray origin and direction in the shader): pass the view as uniforms and apply it to the ray:
     rotate the ray direction by yaw (around the up axis) and pitch (around the right axis), move the origin along the view direction
     by move and up by up. Keep the original constants as the starting point. If the world has one subject at the centre (a coin, a
     plinth, a tree, a storm), make yaw ORBIT the camera around that subject so it stays in view, like the reference diff.
   - A flat or 2.5D world (it draws in screen space): yaw pans sideways, pitch tilts / pans vertically, move zooms toward the centre,
     up lifts the view. Apply it to the uv or the scene coordinates before anything else is computed, so every layer moves together.
   - Add uniforms with new names (uView, uOrbit ...) only; never rename or remove existing uniforms. Every new uniform must be set
     every frame (gl.uniform... after useProgram), also when c.view is missing (then all zero).
4. Look controls: 3 or 4 named controls that change what is already there, each as a multiplier with default 1 (so default = today):
   for example fog or haze density, light or glow strength, particle or dust amount, speed of the motion, rain, colour warmth.
   Read each with look("id", 1) in step/draw and multiply the existing value. Pick the controls that make sense for THIS world.
5. In the room (v.mode === "room") the room shell reads the pointer itself: if the world sways its camera with c.ptr (parallax),
   turn that sway off in room mode only (as the reference does with `sway`). Taps (c.ptr.tap) still reach the world in every mode.
6. debug(): keep everything it returns and add  cam: [the current camera values as numbers, rounded to 3 decimals]  and
   look: { every look control id: its current value }. cam must change when the view changes.
7. Add a room block to K.themes.<id> next to stack (stack stays exactly as it is):
     room: { name: "<a short evocative name for being inside this world>", yaw: [min, max], pitch: [min, max], move: [min, max], up: [min, max],
       unit: "<m | km | screen>", sound: "<the scape preset given below>",
       look: [{ id: "...", label: "<one or two words>", min: 0, max: <2 to 4>, def: 1 }, ...],
       touch: "<one sentence: what a tap does in this world, from its existing tap code>",
       opening: { dur: <4.5 to 6>, from: { yaw: .., pitch: .., move: .., up: .. }, to: { yaw: 0, pitch: 0, move: 0, up: 0 }, hit: <seconds>, at: [<x 0..1>, <y 0..1>] } }
   Limits: wide enough to explore, never so wide the subject leaves the screen or the camera goes through a wall or the floor.
   The opening is a camera move that ends exactly on the backdrop view, with one tap (`hit` seconds in, at screen point `at`, y up)
   where the world reacts visibly.
8. Do not change anything else: no new effects, no renamed variables, no reformatting, no removed comments, GLSL ES 3.00 stays.
   Comments you add are short, plain English, in the same style as the file.
