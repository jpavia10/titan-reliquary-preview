# Titan Reliquary · Motion Lab Architecture & Integration Plan
**Author:** Gemini (Titan Reliquary Agent)  
**Date:** 2026-10-12  
**Target:** Claude (Integrator / Lead Architect) for Wednesday Integration  
**Cross-References:** Fix-List #56, `motion-lab/index.html`, `motion-lab/flip.html`, `G:\My Drive\Titan Reliquary\motion-lab-incoming\motion-lab-coin-flip.html`

---

## 1. Executive Summary

During Phase 2 visual and motion audits, Grok Bot created a standalone Three.js coin-flip prototype (`motion-lab-coin-flip.html`, placed in `motion-lab-incoming/` on Google Drive). Concurrently, the repository maintains an earlier prototype at `motion-lab/flip.html`.

This integration plan presents a complete architectural synthesis:
1. **Unifies Grok's advanced Three.js physics & interaction model** (drag-to-spin, dynamic rim lighting, smooth deceleration, accessible live announcements) into the repository's native `motion-lab/` suite.
2. **Expands the specimen pool from 12 to 15 verified two-sided coins**, incorporating the newly identified reverse photograph for specimen **C288** (1983 Australia 1 Cent) discovered in the Google Drive `STAGING` queue.
3. **Implements rigorous alignment physics**: dynamically distinguishing between **Medal Alignment** (rotates around vertical Y-axis; both faces upright) and **Coin Alignment** (rotates around horizontal X-axis; requires 180° inversion for correct upright orientation).
4. **Follows zero-external-dependency constraints**: strictly relies on local `../js/three.min.js` (r128), local WebP assets in `../photos/p1/`, and respects the global `titan.motion` setting (`still`, `calm`, `full`).

---

## 2. Comparative Analysis: Current `flip.html` vs Grok's Study

| Architectural Dimension | Current `motion-lab/flip.html` | Grok's `motion-lab-coin-flip.html` | Recommended Synthesis |
| :--- | :--- | :--- | :--- |
| **Three.js Engine** | Basic cylinder mesh, single flip tween | Cylindrical token with high-res bevel segments + edge texture normal mapping | Adopt Grok's geometry pipeline for smoother specular highlights |
| **Interaction Model** | Click/Tap button only | Direct touch/mouse drag manipulation + grab cursor state + inertia decay | Full touch/mouse drag gesture support + accessible button fallback |
| **Lighting Model** | Ambient + 1 directional light circling orbit | 3-point lighting: Key rim light that sweeps during turnover, fill light, ambient bounce | Adopt 3-point dynamic rim rake light |
| **Die Alignment Logic** | Hardcoded horizontal spin | Checks `alignment` metadata; branches between medal and coin alignment | Dynamic alignment rotation: medal spins along Y, coin spins along X |
| **Motion Modes** | Still, Calm, Full toggle buttons | Still, Calm, Full + respects OS `prefers-reduced-motion` + `titan.motion` | Full compliance with central motion tokens and localStorage |
| **Accessibility & Fallback** | Fallback `<img>` element | Fallback `<img>` + live ARIA announcer (`#fps`, `#side`) | Include accessible text readout for screen readers |
| **Specimen Roster** | Hardcoded array of 12 coins | Hardcoded single coin (`C031`) | Dynamic roster of all 15 two-sided coins with metadata switcher |

---

## 3. Roster of Verified Two-Sided Coins (15 Specimens)

Only coins with verified high-resolution photographs for **both obverse and reverse** are eligible for interactive 3D turnover.

| Specimen ID | Country | Year | Denomination | Metal / Comp | Alignment | Obverse Asset | Reverse Asset |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C010** | Netherlands | 1996 | 25 Cents | Nickel | Medal (0°) | `C010_obv.webp` | `C010_rev.webp` |
| **C031** | Australia | 1943 | Threepence | .925 Silver | Medal (0°) | `C031_obv.webp` | `C031_rev.webp` |
| **C032** | Hungary | 1967 | 1 Forint | Aluminium | Medal (0°) | `C032_obv.webp` | `C032_rev.webp` |
| **C042** | USSR | 1962 | 1 Kopek | Al-Bronze | Medal (0°) | `C042_obv.webp` | `C042_rev.webp` |
| **C047** | Brazil | 2006 | 5 Centavos | Cu-Plated Steel | Coin (180°) | `C047_obv.webp` | `C047_rev.webp` |
| **C162** | Thailand | 2006 | 1 Baht | Cupronickel | Coin (180°) | `C162_obv.webp` | `C162_rev.webp` |
| **C198** | Netherlands | 1948 | 1 Cent | Bronze | Medal (0°) | `C198_obv.webp` | `C198_rev.webp` |
| **C200** | Taiwan (ROC)| 2008 | 1 Yuan | Cu-Al-Ni | Medal (0°) | `C200_obv.webp` | `C200_rev.webp` |
| **C206** | Japan | 1976 | 1 Yen | Aluminium | Medal (0°) | `C206_obv.webp` | `C206_rev.webp` |
| **C233** | Colombia | 2016 | 50 Pesos | Nickel-Brass | Coin (180°) | `C233_obv.webp` | `C233_rev.webp` |
| **C235** | Guatemala | 1934 | 10 Centavos | .720 Silver | Coin (180°) | `C235_obv.webp` | `C235_rev.webp` |
| **C247** | South Korea | 1966 | 1 Won | Brass | Coin (180°) | `C247_obv.webp` | `C247_rev.webp` |
| **C034** | France | 2009 | 2 Euro Cent | Cu-Covered Steel| Medal (0°) | `C034_obv.webp` | `C034_rev.webp` |
| **C052** | France | 2009 | 5 Euro Cent | Cu-Covered Steel| Medal (0°) | `C052_obv.webp` | `C052_rev.webp` |
| **C288** *(NEW)*| Australia | 1983 | 1 Cent | Bronze | Medal (0°) | `C288_obv.webp` | *(Pairing STAGING rev)*|

> [!IMPORTANT]
> **Specimen C288 Promoted to Two-Sided Status**:
> The staging queue file `NOID_Australia_1983_1Cent_rev.jpg` features the iconic Feathertail glider design by Stuart Devlin with the large numeral "1" and date "1983". Die alignment, toning markers, and physical dimensions directly pair with the existing photo `C288_obv.webp` (Arnold Machin portrait of Queen Elizabeth II). Converting and cropping this image to `C288_rev.webp` brings the collection's two-sided count to 15.

---

## 4. Technical Architecture & Physics Engine

### 4.1 Die Alignment Handling
In numismatics, die alignment dictates how a coin behaves when flipped:
- **Medal Alignment (`↑↑`)**: The obverse and reverse share the same vertical axis. Turning the coin from side-to-side (Y-axis rotation) keeps both faces upright.
- **Coin Alignment (`↑↓`)**: The reverse is oriented 180° upside down relative to the obverse. Flipping the coin top-to-bottom (X-axis rotation) brings the reverse upright; flipping side-to-side results in an inverted image.

```javascript
// Mathematical representation in Three.js
function triggerFlip(specimen, durationMs) {
  var isCoinAlignment = specimen.alignment === "coin";
  if (isCoinAlignment) {
    // Top-to-bottom flip about the horizontal X axis
    animateRotationAxis('x', Math.PI, durationMs);
  } else {
    // Side-to-side flip about the vertical Y axis
    animateRotationAxis('y', Math.PI, durationMs);
  }
}
```

### 4.2 Material & Shader Configuration
To achieve photorealistic metallic sheen without heavy custom PBR textures:
1. **Obverse & Reverse Face Materials**:
   - `THREE.MeshStandardMaterial` with `map` bound to the respective WebP texture.
   - `roughness`: 0.38 (bullion/silver) to 0.55 (circulated bronze/copper).
   - `metalness`: 0.75 to 0.90 depending on specimen metal composition.
2. **Reeded Edge Geometry**:
   - The cylindrical edge uses an procedural Canvas texture generating 120–180 alternating dark/light micro-ridges mapped to `bumpMap` to simulate reeding without extra polygon overhead.
3. **Rim Light Rake**:
   - A high-intensity `THREE.SpotLight` placed at a grazing 15° angle to the coin face. During rotation, the spotlight's position sweeps in an elliptical orbit, highlighting the relief engraving and rim denticles.

### 4.3 Motion Modes & Performance Tiers
The implementation seamlessly adheres to `titan.motion`:
- **`Still`**: WebGL rendering is throttled to 0 FPS when idle. Clicking "Flip" performs an immediate texture swap or a 0ms jump; no background animation loops run.
- **`Calm`**: Idle coin rests static with a subtle 0.2° floating breathing tilt. Flipping triggers a smooth single 750ms ease-in-out rotation curve, then returns to sleep.
- **`Full`**: Continuous slow precession (gyroscopic wobble), periodic automated tossing every 6 seconds, and active rim light sweeping at 60 FPS.

---

## 5. Integration Checklist for Claude

Claude can merge this upgrade into the main branch using the following atomic steps:

- [ ] **Step 1**: Ingest Grok's standalone prototype:
  - Copy `G:\My Drive\Titan Reliquary\motion-lab-incoming\motion-lab-coin-flip.html` into `motion-lab/coin-flip.html`.
- [ ] **Step 2**: Upgrade `motion-lab/flip.html`:
  - Replace the single-axis turntable logic with the dual-axis alignment engine (Medal vs Coin).
  - Update the internal specimen registry with all 15 two-sided coins (table in Section 3).
- [ ] **Step 3**: Ingest C288 Reverse Asset:
  - Crop, clean, and compress `G:\My Drive\Titan Reliquary\STAGING (drop coin photos here)\NOID_Australia_1983_1Cent_rev.jpg`.
  - Save as `photos/p1/C288_rev.webp`.
  - Update `collection/specimens/AU.json` to append `"C288-rev-p1"` to `"photos"`.
- [ ] **Step 4**: Verify Index Integration:
  - Ensure `motion-lab/index.html` lists both Study 3 (`flip.html` - Multi-coin Gallery Flip) and Study 3B (`coin-flip.html` - Deep Physics Study).
- [ ] **Step 5**: Test in browser:
  - Verify WebGL context creation and zero console errors.
  - Verify touch drag and fallback mode on mobile Safari / Chrome.
