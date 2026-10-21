# fx/ credits and licences

Every effect in fx/ is vendored locally (no CDN). Ports and the techniques they follow:

| File / scene | Source | Licence |
|---|---|---|
| fx/scenes-nms.js `nebula` | "Star Nest" by Pablo Roman Andrioli (Kali), Shadertoy XlfGRj. Ported to the TitanFXK scene API with a recoloured palette, HDR output, tier-scaled volume steps, drag/tap controls. | MIT |
| fx/scenes-nms.js `blackhole` | Photon-path integration with the Schwarzschild term a = -1.5 h² r/|r|⁵, as popularised by Riccardo Antonelli's "starless" write-up and Shadertoy Gargantua ports. Shader written fresh for this kit. | technique, own code |
| fx/scenes-nms.js `rainforest` god rays | Screen-space volumetric light scattering, Kenny Mitchell, GPU Gems 3 ch. 13 (NVIDIA). | technique, own code |
| fx/scenes-nms.js `bubbles` | Thin-film interference, three-wavelength approximation (Glassner, "Soap Bubbles"; Belcour & Barla 2017). | technique, own code |
| fx/scenes-nms.js `shatter` | Polar Voronoi crack pattern (F2-F1 edges, after Inigo Quilez's Voronoi edge-distance articles). | technique, own code |
| fx/scenes-nms.js `aurora` | Curtain technique after nimitz's "Auroras" (Shadertoy XtGGRt): stacked planes of rotated triangle noise with colour by height. Re-written for this kit (no code copied). | technique, own code (original is CC BY-NC-SA 3.0) |
| fx/scenes-nms.js `galaxy` | Logarithmic spiral-arm density with fbm warp, emission/absorption volume march. | technique, own code |
| fx/scenes-nms.js `lava` | Domain warping (Inigo Quilez, "Warp") and flow noise (Perlin & Neyret 2001) with Voronoi crust plates. | technique, own code |
| fx/scenes-nms.js `crystals` | Hexagonal-prism SDF and raymarching (Inigo Quilez, "distance functions", MIT); three-IOR dispersion. | MIT (SDF), own code |
| fx/scenes-nms.js `arcane` | Procedural sigil (segment/ring SDFs) on a perspective floor plane. | own code |

Personal, non-commercial project. CC BY-NC-SA Shadertoy ports, when added, are listed here with author and link.
