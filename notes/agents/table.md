# Wing: 3D Table (`spatial.js`): audit and plan

Agent: table wing, branch `claude/wing-table`, base `main` @ 5ef9717 (tr50).

## Audit (state at tr50)

Screenshots before: `scratchpad/table/before_*.png` (900x600 SwiftShader).

### Bugs
1. `startCameraARMode()` references an undefined `shadowPlane`, so a ReferenceError fires in strict mode and the Android camera mode never finishes switching. The renderer is also created with `alpha:false`, so the camera video could never show through anyway.
2. `buildSpecimenObjects()` disposes only the meshes that are direct children of `specimenGroup`. The other two holder variants, their nested meshes, and every CanvasTexture (about 12 textures of 1024 px each per specimen) leak on every prev/next.
3. Nothing is disposed on exit. The WebGL context, the PMREM env, and the global `pointermove`/`pointerup`/`resize` listeners stay alive for the whole session. `pointermove` also keeps moving a light while the table is closed.
4. The app's bottom navigation (`.wings`, z-index 100100) draws on top of the table modal (z 99999) and covers the table's own control deck. On a phone the lighting controls and hint cannot be reached.
5. No WebGL guard. If `new THREE.WebGLRenderer()` throws, the modal opens black and the error goes to the console.
6. Global `keydown`: Space also triggers the Hall's flip button, ←/→ also step the dossier, and 1-5 switch wings underneath the table.
7. Console warnings on every open. The r128 build has no `thickness`, `specularIntensity`, or `specularColor` on MeshPhysicalMaterial.
8. There is no `renderer.outputEncoding` and no texture encoding, so every colour is treated as linear and the look is washed out and muddy. `transmission` on six materials forces an extra full-scene transmission pass every frame, which is expensive on phones.
9. USDZ export is at the wrong scale (1 unit = 1 m, so the coin comes out about 2 m wide). It also includes transparent shells, which come out opaque white, and it uses a material array (the flip) that the exporter cannot handle.

### Honesty problems (invented data)
- The HUD and slab label show made-up grading and custody claims: "TITAN GEM PROOF", "CERT #", "ACTIVE VAULT CUSTODY", "TAMPER-EVIDENT", "PARITY VERIFIED", ".999 FINE" on non-silver coins, "Constitutional Silver", "Struck Specimen Planchet", a fake barcode, and a fake QR watermark.
- With no data it falls back to an invented specimen ("1918 Germany 20 Pfennig").

### Visual quality
- The composition is a floating coin in a black void. The camera is so close that the table and velvet are barely visible, and the "contact shadow" is a hard black rectangle.
- The coin is a flat cylinder with a painted texture. It has no real raised rim, reeding on every coin, and bright white text with drop shadows painted into the albedo. Every non-gold coin renders as silver (268 of 273 flips have no metal field), so a copper penny and a euro cent look identical.
- The wood is flat stripes and the "velvet" is noise. The env map is a cool-blue studio with a yellow strip.
- The "2x2 flip" is an invented frosted-acrylic mount with holograms. The owner's 273 coins are actually in white cardboard 2x2 flips.

### Interaction and performance
- Arcball drag works (world-Y + camera-right axes) with frame-based inertia. Snap 90/180 works. OrbitControls handles pinch and pan.
- It renders every frame forever while open, even when idle, which drains phone batteries. There is no adaptive quality and shadows are on full-time. Frame-rate-dependent inertia and snaps.
- No loading state, no focus management, no reduced-motion handling, and emoji-only buttons.

## Ranked improvements (impact / effort / risk)

| # | Item | Impact | Effort | Risk |
|---|------|--------|--------|------|
| 1 | Fix colour pipeline (sRGB output + texture encodings), drop transmission, studio env map | High | S | Low |
| 2 | Rebuild the coin: lathe body with raised rim and rounded edge, reeded or plain edge band, colour/roughness/relief maps painted together (splash technique), finish (circulated/BU/proof) and appearance metal from the record | High | M | Low |
| 3 | Real holders: cardboard 2x2 flip (what the owner has), clear slab with an honest label, bare coin on an acrylic plinth | High | M | Low |
| 4 | Room rebuild: lacquered mahogany (grain, roughness, clearcoat), indigo velvet pad with sheen and gold stitching, spot-lit pool, soft blob shadows | High | M | Low |
| 5 | Lay-out table: place bullion (bars, fanned rounds + tube, stacks, assay card, capsule) and mint sets, plus any coin from a searchable collection drawer. Tap a piece to pick it up | High | M-L | Med |
| 6 | Render-on-demand, adaptive pixel ratio, pause when hidden, full dispose on exit, listener registry | High (battery) | M | Med |
| 7 | New HUD: theme-token panels, SVG icons, big Exit, table/specimen view toggle, loading veil, no-WebGL and context-lost states, focus trap/restore, key shielding | High | M | Low |
| 8 | Honest labels (real fields only) and no invented fallback specimen | Med | S | Low |
| 9 | USDZ at correct scale (cm to m), opaque parts only, no material arrays | Med | S | Low |
| 10 | Time-based inertia/snaps, reduced motion, double-tap to flip | Med | S | Low |

## Decision

I will do all ten. `spatial.js` is rewritten in place because it is this wing's file and is already precached by `sw.js`. The public API (`TitanSpatial.open/close/setSpecimen/setFormat/setLighting/flip/flip90/resetFront/next/prev/exportAR`) and the `?specimen=&format=&ar=1` deep link are unchanged. The table DOM is generated by `spatial.js` inside the existing `#spatial-museum-modal`, so the only `index.html` edits are the two hook lines. Styles live in `styles/table.css`.

### Not doing (and why)
- Real per-type coin designs or photos. None exist, and I will not invent them. Faces are generic, honest compositions that use only record text (country, year, denomination, mint).
- Metal from data. Flips have no metal field. The *appearance* is guessed from the denomination (for example euro 1/2/5 cent looks copper), but the HUD never states a metal unless the record has `is_silver`/`is_gold`/`asw_oz`.
- WebXR session / Android Scene Viewer. There is no GLTF exporter bundled. The iOS Quick Look path (USDZ) and the desktop QR path stay. On Android the "camera backdrop" mode stays and is fixed.
- Transmission/refraction glass. It costs a full extra render pass. The acrylic uses clear-coat reflections instead.
- Edits to `sw.js`. The integrator must add `styles/table.css` to the precache list.
