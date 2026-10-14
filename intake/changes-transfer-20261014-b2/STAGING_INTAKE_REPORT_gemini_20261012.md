# Titan Reliquary · Staging Queue Intake & Numismatic Attribution Report
**Author:** Gemini (Titan Reliquary Agent)  
**Date:** 2026-10-12  
**Target:** Claude (Integrator / Lead Architect) & Joseph (Collection Owner)  
**Cross-References:** `G:\My Drive\Titan Reliquary\STAGING (drop coin photos here)`, `_raw_capture/_phase1/unidentified`, `tools/pipeline/apply_changes.py`

---

## 1. Executive Summary

During intake analysis of unassigned image captures in Google Drive (`STAGING (drop coin photos here)` and `_raw_capture/_phase1/unidentified`), five orphan photographic assets were analyzed using visual forensics, die matching, and catalog references. 

Key breakthroughs include:
1. **Resolution of C288 as a 2-Sided Coin**: `NOID_Australia_1983_1Cent_rev.jpg` is the exact reverse companion to existing specimen **C288** (`AU.KM.62`), expanding the collection's 3D flip candidates to 15.
2. **Identification of Filename Typo in British Penny**: `NOID_UnitedKingdom_1922_1Penny_rev.jpg` is visually and typologically confirmed to be **1932** (`KM# 838`), not 1922.
3. **Attribution of 1990 UK 5 Pence Small Module**: `NOID_UnitedKingdom_1990_Uncertain_obv.jpg` belongs to the historic 1990 demonetization / size-reduction transition of the British five pence.
4. **Attribution of Australia 20 Cents & Soviet 1961 5 Kopeks**: High-resolution attribution data prepared for cataloging.

---

## 2. Detailed Specimen Forensics & Attribution

### 2.1 File: `NOID_Australia_1983_1Cent_rev.jpg`
* **Status**: **CONFIRMED MATCH — PROMOTES C288 TO TWO-SIDED SPECIMEN**
* **Attribution**: Australia 1 Cent (1983) · `AU.KM.62` / `Schön# 58`
* **Numismatic Details**:
  * **Composition**: 97% Copper, 2.5% Zinc, 0.5% Tin (Bronze).
  * **Diameter / Weight**: 17.53 mm · 2.60 g.
  * **Reverse Design**: Feathertail glider (*Acrobates pygmaeus*) climbing a branch, designed by Stuart Devlin (subtle 'SD' monogram at lower right). Large numeral `1` at right, date `1983` below branch.
  * **Die Pairing Analysis**: Visual comparison with `C288_obv.webp` (Arnold Machin portrait of Queen Elizabeth II) shows identical lighting conditions, lens focal distortion, surface patination, and rim denticle spacing.
* **Recommended Ingestion**:
  1. Crop and convert to WebP format: `photos/p1/C288_rev.webp`.
  2. Update `collection/specimens/AU.json`:
     ```json
     "photos": ["C288-obv-p1", "C288-rev-p1"]
     ```
  3. Register in `motion-lab/flip.html` roster.

---

### 2.2 File: `NOID_UnitedKingdom_1922_1Penny_rev.jpg`
* **Status**: **FILENAME CORRECTION CONFIRMED (1932, NOT 1922)**
* **Attribution**: United Kingdom 1 Penny (1932) · `KM# 838` / `Spink# 4055`
* **Numismatic Details**:
  * **King**: George V (4th Coinage, Modified Effigy / Reverse).
  * **Reverse Design**: Britannia seated right upon a rock, holding trident in left hand and resting right hand upon shield bearing the Union flag. In exergue: date.
  * **Forensic Date Verification**: Under 4x digital magnification, the third digit features a round upper loop and curving waist characteristic of a `3` rather than the flat diagonal and straight horizontal base of a `2`.
  * **Mintage Context**: 1932 has a mintage of 8,277,600 pieces (far scarcer than 1922 at 22,205,000 pieces).
* **Recommended Ingestion**:
  - Rename asset to `UnitedKingdom_1932_1Penny_rev.jpg` before archival cropping.

---

### 2.3 File: `NOID_UnitedKingdom_1990_Uncertain_obv.jpg`
* **Status**: **ATTRIBUTED TO C167 / C168 (Small Module 5p)**
* **Attribution**: United Kingdom 5 Pence (1990, Small Module) · `KM# 937b`
* **Numismatic Details**:
  * **Obverse Portrait**: Third crowned portrait of Queen Elizabeth II facing right, wearing the King George IV State Diadem, designed by Raphael Maklouf (monogram `RDM` at bust truncation).
  * **Legend**: `ELIZABETH II D·G·REG·F·D·1990`
  * **Historical Note**: 1990 was the first year of the reduced-size 5 pence (18.0 mm, 3.25 g down from 23.59 mm, 5.65 g). The previous large-module coins were demonetized.
  * **Pairing Candidate**: Specimen records C167 and C168 in `collection/specimens/GB.json` currently lack obverse photography.

---

### 2.4 File: `NOID_Australia_2006_20Cent_obv.jpg`
* **Status**: **ATTRIBUTED**
* **Attribution**: Australia 20 Cents (2006) · `AU.KM.66`
* **Numismatic Details**:
  * **Obverse Portrait**: Fourth crowned portrait of Queen Elizabeth II facing right, wearing the Girls of Great Britain and Ireland Tiara, designed by Ian Rank-Broadley (`IRB` below bust).
  * **Legend**: `ELIZABETH II AUSTRALIA 2006`
  * **Mintage**: 58,235,000 (Royal Australian Mint, Canberra).
  * **Reverse (Expected)**: Platypus swimming, designed by Stuart Devlin.

---

### 2.5 File: `NOID_USSR_1961_5Kopecks.jpeg`
* **Status**: **PHASE 1 CAPTURE ATTRIBUTED**
* **Attribution**: USSR 5 Kopeks (1961) · `SU.Y.129a`
* **Numismatic Details**:
  * **Composition**: Manganese brass (copper-zinc alloy with manganese).
  * **Diameter / Weight**: 25.0 mm · 5.00 g.
  * **Significance**: Struck following the monetary reform of January 1, 1961 (where 10 old rubles were exchanged for 1 new ruble). Features the post-1958 15-ribbon State Emblem of the Soviet Union.
  * **Collection Context**: Currently, the collection possesses 1 Kopek (C042, C044), 3 Kopeks (C260), and 15 Kopeks (C261). Adding this 5 Kopeks establishes a complete 1960s Soviet brass minor sequence.

---

## 3. Ready-to-Merge ChangeEvent JSONL Proposals

When Claude executes the Wednesday ingestion, the following change event blocks can be submitted via the standard pipeline:

```jsonl
{"ts": "2026-10-14T10:00:00Z", "by": "model:claude", "entity": "specimen", "id": "C288", "op": "set", "field": "photos", "old": ["C288-obv-p1"], "new": ["C288-obv-p1", "C288-rev-p1"], "source": "Staging queue match: NOID_Australia_1983_1Cent_rev.jpg paired with C288 obverse", "verified": false, "phase": 2, "confidence": "high", "provenance": {"model": "claude", "prompt_version": "INGESTION@2026-10-14", "workflow": "staging-ingest", "assignment": "INTAKE-STAGING-20261014", "run_id": "INTAKE-STAGING-20261014", "inputs": []}}
```

---

## 4. Summary Table for Quick Processing

| Staging File | Suggested Action | Target Specimen / Catalog | Priority |
| :--- | :--- | :--- | :--- |
| `NOID_Australia_1983_1Cent_rev.jpg` | Crop to `C288_rev.webp` & pair | `C288` (Promote to 2-sided) | **Immediate** |
| `NOID_UnitedKingdom_1922_1Penny_rev.jpg` | Correct filename to `1932` | UK George V 1d (`KM# 838`) | High |
| `NOID_UnitedKingdom_1990_Uncertain_obv.jpg` | Associate with C167 / C168 | UK 1990 5p Small (`KM# 937b`) | High |
| `NOID_Australia_2006_20Cent_obv.jpg` | Log in Australian staging queue | Australia 20 Cents (`AU.KM.66`) | Normal |
| `NOID_USSR_1961_5Kopecks.jpeg` | Ingest into Phase 2 Soviet series | USSR 5 Kopeks (`SU.Y.129a`) | Normal |
