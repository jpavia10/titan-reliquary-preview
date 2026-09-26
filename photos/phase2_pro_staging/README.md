# 🏛️ Titan Reliquary — Multi-Model Photo Staging & Ingestion Hub
**Google Drive Shared Location:** `G:\My Drive\Titan Reliquary\PHOTO_STAGING_PHASE2\`
**Alternate Path:** `G:\My Drive\Titan Reliquary\photos\phase2_pro_staging\`

> **DIRECTIVE FOR ALL COLLABORATING AGENTS & MODELS (Grok, Claude, Gemini, GPT-4o, DeepSeek):**
> This directory is the unified physical staging station for Joseph's coin collection.
> Regardless of which AI is processing data, all models must adhere to the standardized Stage 1 vs. Stage 2 protocol and the geometric master photo specification detailed below.

---

## 🧭 The 3-Step Ingestion & Labeling Architecture

### Phase 1: Rapid Intake & Online Attribution
* **Purpose:** Register new coins without requiring immediate systematic ordering or studio photography.
* **Input:** Fast preliminary photo or inventory line item.
* **Processing:**
  * If no handwritten text is present on the flip, it is treated as **Stage 1 Intake**.
  * Online numismatic metadata is fetched (Numista, Krause KM#, ASW silver weight, mintage, composition).
  * Assigned a provisional intake scan ID (`C###`).

### Interim Step: Automated AI Batch Renaming & Systematic Sequencing
* **Core Rule:** *Random physical scanning order must NEVER dictate the permanent collection catalog.*
* **Action:** Once a batch of coins is uploaded to Stage 1, an AI agent re-evaluates the entire batch and generates clean, hierarchical Serial IDs (SER):
  * Pattern: `{CONTINENT}-{ISO}-{COUNT}` (e.g., `EU-CH-008`, `NA-MX-001`, `AS-JP-004`).
  * Grouped logically by sovereign nation, denomination, and year.

### Phase 2: Dual-Sided Labeling & Professional Macro Scan
* **Physical Flip Orientation:**
  * Joseph's physical reference point is the **staple orientation** (which side of the staple is clinching), NOT coin die rotation.
  * **Side 1:** Joseph's handwritten historical label (Country, Year, Denomination, Provenance, Notes).
  * **Side 2:** The newly assigned systematic Serial ID (`SER` / `C###`).
* **Studio Macro Capture:**
  * Tethered 1:1 camera rig scans of both sides:
    * `<SER>_<YEAR>_<DENOM>_side1.tif` (or `_obv.tif`)
    * `<SER>_<YEAR>_<DENOM>_side2.tif` (or `_rev.tif`)
  * Vision models extract the handwritten notes from Side 1 and reconcile with the Serial ID on Side 2.

---

## 📐 Standardized 2600×2600 Master Photo Specification
All automated crop and warp routines are implemented in `G:\My Drive\Titan Reliquary\pipeline\photomaster.py`:
1. **Canvas:** `2600 x 2600 px`, sRGB, JPEG q95, no EXIF.
2. **Cardboard Flip:** 4-corner perspective warp to exactly `2400 x 2400 px` (47.244 px/mm), centered at (100,100)-(2500,2500) leaving a uniform 100px border.
3. **Background:** `#1A1A1A` (26, 26, 26) neutral dark grey, painted.
4. **Color Calibration:** White balance normalized on flip cardboard (median 235, 235, 235).
5. **Coin Crop:** Square `1200 px`, coin diameter = 86% of frame, rim intact, zero cardboard intrusion.
6. **Label Crop:** Square `800 px`, coin aperture filled with neutral cardboard tone.

---

## 📁 Directory Structure in Google Drive
* `01_RAW_INBOX_UNPROCESSED/`: Drop all new raw macro photos here.
* `02_PRIORITY_TOP5_MASTERPIECES/`:
  * `C114_Mexico_1914_5c/`: Mexico 1914 Chihuahua Revolutionary Ingot Strike
  * `C223_Netherlands_1967_1Gulden/`: Netherlands 1967 Juliana 0.720 Silver
  * `C073_USA_1976_Bicentennial/`: USA 1976 Bicentennial Drummer Boy
  * `C066_Switzerland_1966_1Franc/`: Switzerland 1966 Standing Helvetia 0.835 Silver
  * `C065_Switzerland_1968_1Franc/`: Switzerland 1968 Helvetia Cu-Ni Transition
* `03_PROCESSED_MASTERS_2600px/`: Standardized, QC-approved publication masters.
* `pipeline/`: Reusable Python tools (`photomaster.py`, `photo_pipeline.py`, `parse_vault.py`).