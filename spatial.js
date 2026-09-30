/**
 * TITAN RELIQUARY · SPATIAL 3D NUMISMATIC MUSEUM TABLE ENGINE (PHASE H)
 * Interactive Three.js WebGL & WebXR physical examination room.
 * Features:
 *   - Unified Solid 3D Holder Rotation (The ENTIRE card/slab turns, never just the coin inside)
 *   - Guaranteed 100% Upright Coin Orientation on both Obverse & Reverse (Medal alignment)
 *   - Distinct Front Pedigree Label vs Back Security Hologram Foil Seal
 *   - Virtual Trackball & Arcball Direct Specimen Drag-to-Rotate (360° fluid manipulation with momentum inertia)
 *   - Snap 90° Reeded Edge Inspection & Snap 180° Specimen Toss
 *   - Procedural Studio PMREM Environment Map for dynamic specular reflections and Fresnel glints
 *   - Hyper-detailed Lucite Slab with beveled ExtrudeGeometry chamfers and ultrasonic weld seam
 *   - Aero Frosted Glass & Silicone Gasket insert with stochastic sandblast noise and water-clear aperture
 *   - 4 Edge-View silicone retaining prongs exposing full 3D reeded coin rim
 *   - 2048px Relief Bump Maps for die inscriptions, dentils, and sovereign heraldry
 *   - Solid Mahogany Table, Indigo Velvet Mat with stitched gold trim, and Lucite Display Easel
 *   - 3 Lighting Atmospheres (Warm Gallery, 5000K Daylight Loupe, Grazing Raking Relief)
 *   - USDZ QuickLook AR & Mobile QR Export
 */
(function(window) {
  "use strict";

  let scene, camera, renderer, controls;
  let tableMesh, velvetMesh, easelGroup, specimenGroup;
  let slabMesh, planchetMesh, flipMesh;
  let spotLight, rakingLight, penLight, ambientLight;
  let studioEnvMap = null;

  let isInitialized = false;
  let isFlipped = false;
  let isAnimatingFlip = false;
  let flipProgress = 0;
  const flipStartQuat = new THREE.Quaternion();
  const flipTargetQuat = new THREE.Quaternion();

  // Direct Specimen 360° Drag & Inertia
  let isDraggingSpecimen = false;
  let prevPointerX = 0, prevPointerY = 0;
  let spinVelocityX = 0, spinVelocityY = 0;
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  let activeFormat = "slab"; // 'slab' | 'planchet' | 'flip'
  let activeLighting = "gallery"; // 'gallery' | 'loupe' | 'raking'
  let currentSpecimen = null;
  let currentSpecimenIndex = 0;
  let animFrameId = null;

  // Cache for procedural textures
  const textureCache = new Map();

  // ==========================================
  // PROCEDURAL STUDIO PMREM ENVIRONMENT MAP
  // ==========================================
  function generateStudioEnvironment(renderer) {
    if (typeof THREE.PMREMGenerator === "undefined") return null;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Rich studio ambient gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
    bgGrad.addColorStop(0, "#080c14");
    bgGrad.addColorStop(0.35, "#141c2b");
    bgGrad.addColorStop(0.7, "#0c1018");
    bgGrad.addColorStop(1, "#040508");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Softbox 1: Overhead key softbox (broad warm daylight)
    const softbox1 = ctx.createRadialGradient(512, 110, 15, 512, 110, 240);
    softbox1.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    softbox1.addColorStop(0.25, "rgba(255, 248, 235, 0.9)");
    softbox1.addColorStop(0.65, "rgba(255, 230, 200, 0.35)");
    softbox1.addColorStop(1, "rgba(255, 230, 200, 0)");
    ctx.fillStyle = softbox1;
    ctx.fillRect(200, 0, 624, 280);

    // Softbox 2: High-contrast strip light left (cool blue-white rim for glass edge)
    const stripLeft = ctx.createLinearGradient(40, 0, 180, 0);
    stripLeft.addColorStop(0, "rgba(255, 255, 255, 0)");
    stripLeft.addColorStop(0.5, "rgba(235, 245, 255, 0.95)");
    stripLeft.addColorStop(1, "rgba(200, 225, 255, 0)");
    ctx.fillStyle = stripLeft;
    ctx.fillRect(40, 70, 140, 360);

    // Softbox 3: High-contrast strip light right (warm champagne gold rim)
    const stripRight = ctx.createLinearGradient(844, 0, 984, 0);
    stripRight.addColorStop(0, "rgba(200, 169, 74, 0)");
    stripRight.addColorStop(0.5, "rgba(254, 240, 138, 0.95)");
    stripRight.addColorStop(1, "rgba(200, 169, 74, 0)");
    ctx.fillStyle = stripRight;
    ctx.fillRect(844, 70, 140, 360);

    // Studio floor bounce fill
    const floorBounce = ctx.createRadialGradient(512, 460, 40, 512, 460, 380);
    floorBounce.addColorStop(0, "rgba(25, 38, 60, 0.7)");
    floorBounce.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = floorBounce;
    ctx.fillRect(80, 320, 864, 192);

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(canvasTexture).texture;
    pmremGenerator.dispose();
    return envMap;
  }

  // ==========================================
  // PROCEDURAL TEXTURES & GEOMETRIES
  // ==========================================
  function createWoodTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Deep warm mahogany base
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, "#1f0f08");
    grad.addColorStop(0.5, "#2a150b");
    grad.addColorStop(1, "#180c06");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine wood grain rings and fibers
    ctx.fillStyle = "rgba(10, 5, 2, 0.15)";
    for (let i = 0; i < 600; i++) {
      const y = Math.random() * 1024;
      const h = Math.random() * 4 + 1;
      ctx.fillRect(0, y, 1024, h);
    }

    // Subtle grain variation lines
    ctx.strokeStyle = "rgba(70, 35, 18, 0.25)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 1024; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(x * 0.05) * 8, 0);
      ctx.bezierCurveTo(
        x + Math.sin(x * 0.02) * 25, 340,
        x - Math.cos(x * 0.03) * 20, 680,
        x + Math.sin(x * 0.04) * 12, 1024
      );
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  function createVelvetTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Luxurious deep midnight royal blue / archival indigo
    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 360);
    grad.addColorStop(0, "#0c1424");
    grad.addColorStop(0.7, "#080c16");
    grad.addColorStop(1, "#04060b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Velvet micro-nap fiber noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Gold stitched running border around velvet mat
    ctx.strokeStyle = "rgba(200, 169, 74, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(16, 16, 480, 480);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  function createReededEdgeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#888888";
    ctx.fillRect(0, 0, 1024, 64);

    // 140 authentic precision vertical reeding teeth grooves
    for (let x = 0; x < 1024; x += 7) {
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(x, 0, 3, 64);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 3, 0, 2, 64);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  function createCoinFaceCanvas(f, side = "obv") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const isRev = side === "rev";

    const isSilver = !!f.is_silver || !!f.asw_oz;
    const isGold = !!f.is_gold || /gold/i.test(f.metal || "");
    const isBronze = /bronze|copper|brass/i.test(f.metal || "");

    // Metallic planchet base gradient with radial luster
    const grad = ctx.createRadialGradient(480, 460, 40, 512, 512, 500);
    if (isGold) {
      grad.addColorStop(0, "#fffde7");
      grad.addColorStop(0.25, "#e6c34a");
      grad.addColorStop(0.65, "#b89228");
      grad.addColorStop(1, "#5a430c");
    } else if (isBronze) {
      grad.addColorStop(0, "#ffcca3");
      grad.addColorStop(0.25, "#c87d46");
      grad.addColorStop(0.65, "#8e4c1e");
      grad.addColorStop(1, "#441e06");
    } else {
      // Silver default
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.22, "#e2e8f0");
      grad.addColorStop(0.65, "#94a3b8");
      grad.addColorStop(0.88, "#475569");
      grad.addColorStop(1, "#1e293b");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Outer raised rim
    ctx.lineWidth = 18;
    ctx.strokeStyle = isGold ? "rgba(254, 240, 138, 0.95)" : (isBronze ? "rgba(254, 215, 170, 0.95)" : "rgba(255, 255, 255, 0.95)");
    ctx.beginPath();
    ctx.arc(512, 512, 492, 0, Math.PI * 2);
    ctx.stroke();

    // Beaded dentils ring (110 beads around circumference)
    ctx.fillStyle = isGold ? "#fef08a" : (isBronze ? "#fed7aa" : "#ffffff");
    const numDentils = 110;
    const dentilRadius = 468;
    for (let i = 0; i < numDentils; i++) {
      const angle = (i / numDentils) * Math.PI * 2;
      const dx = 512 + Math.cos(angle) * dentilRadius;
      const dy = 512 + Math.sin(angle) * dentilRadius;
      ctx.beginPath();
      ctx.arc(dx, dy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Circular inscription legend
    const countryName = (f.country || "ARCHIVAL SPECIMEN").toUpperCase();
    const year = f.year || "HISTORIC";
    const denom = (f.denom || "SPECIMEN").toUpperCase();

    ctx.save();
    ctx.translate(512, 512);
    ctx.font = "bold 46px 'Cinzel', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isGold ? "#fffde7" : (isBronze ? "#fff1e6" : "#ffffff");
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    if (!isRev) {
      // Obverse: Sovereign Title on Upper Arc (Guaranteed Upright from 10 to 2 o'clock)
      const upperArcRadius = 405;
      const text = countryName.slice(0, 24);
      const arcSpan = Math.min(Math.PI * 0.9, (text.length * 0.08));
      const startAngle = -Math.PI / 2 - arcSpan / 2;
      for (let i = 0; i < text.length; i++) {
        const charAngle = startAngle + (i / Math.max(1, text.length - 1)) * arcSpan;
        ctx.save();
        ctx.rotate(charAngle + Math.PI / 2);
        ctx.fillText(text[i], 0, -upperArcRadius);
        ctx.restore();
      }

      // Center Crest Heraldry
      ctx.font = "800 68px 'Cinzel', serif";
      ctx.fillText(f.iso || "AG", 0, -20);
      ctx.font = "600 36px 'Courier New', monospace";
      ctx.fillText(`PROVENANCE · ${year}`, 0, 60);

      // Bottom Arc Inscription
      ctx.font = "bold 34px 'Courier New', monospace";
      ctx.fillText(`${f.ser || f.scan || 'SPECIMEN'} · ${f.asw_oz ? f.asw_oz + ' OZ AG' : '.999 FINE'}`, 0, 390);
    } else {
      // Reverse: Denomination & Year (Guaranteed 100% Upright)
      ctx.font = "800 84px 'Cinzel', 'Times New Roman', serif";
      ctx.fillText(denom.slice(0, 14), 0, -40);

      ctx.beginPath();
      ctx.arc(0, 45, 140, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = "bold 52px 'Cinzel', serif";
      ctx.fillText(year, 0, 45);

      ctx.font = "bold 32px 'Courier New', monospace";
      ctx.fillText(f.km ? `KM# ${f.km} · 180° REVERSE` : "TITAN ARCHIVAL REPOSITORY", 0, 390);
    }
    ctx.restore();

    return canvas;
  }

  function createCoinBumpCanvas(f, side = "obv") {
    // Generate height bump map: neutral grey base, white for raised elements
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const isRev = side === "rev";

    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 1024, 1024);

    // Raised rim
    ctx.lineWidth = 18;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(512, 512, 492, 0, Math.PI * 2);
    ctx.stroke();

    // Dentils
    ctx.fillStyle = "#ffffff";
    const numDentils = 110;
    const dentilRadius = 468;
    for (let i = 0; i < numDentils; i++) {
      const angle = (i / numDentils) * Math.PI * 2;
      const dx = 512 + Math.cos(angle) * dentilRadius;
      const dy = 512 + Math.sin(angle) * dentilRadius;
      ctx.beginPath();
      ctx.arc(dx, dy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const countryName = (f.country || "ARCHIVAL SPECIMEN").toUpperCase();
    const year = f.year || "HISTORIC";
    const denom = (f.denom || "SPECIMEN").toUpperCase();

    ctx.save();
    ctx.translate(512, 512);
    ctx.font = "bold 46px 'Cinzel', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";

    if (!isRev) {
      const upperArcRadius = 405;
      const text = countryName.slice(0, 24);
      const arcSpan = Math.min(Math.PI * 0.9, (text.length * 0.08));
      const startAngle = -Math.PI / 2 - arcSpan / 2;
      for (let i = 0; i < text.length; i++) {
        const charAngle = startAngle + (i / Math.max(1, text.length - 1)) * arcSpan;
        ctx.save();
        ctx.rotate(charAngle + Math.PI / 2);
        ctx.fillText(text[i], 0, -upperArcRadius);
        ctx.restore();
      }
      ctx.font = "800 68px 'Cinzel', serif";
      ctx.fillText(f.iso || "AG", 0, -20);
      ctx.font = "600 36px 'Courier New', monospace";
      ctx.fillText(`PROVENANCE · ${year}`, 0, 60);
      ctx.font = "bold 34px 'Courier New', monospace";
      ctx.fillText(`${f.ser || f.scan || 'SPECIMEN'}`, 0, 390);
    } else {
      ctx.font = "800 84px 'Cinzel', 'Times New Roman', serif";
      ctx.fillText(denom.slice(0, 14), 0, -40);
      ctx.beginPath();
      ctx.arc(0, 45, 140, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.font = "bold 52px 'Cinzel', serif";
      ctx.fillText(year, 0, 45);
    }
    ctx.restore();

    return canvas;
  }

  // ==========================================
  // BEVELED LUCITE SLAB GEOMETRY (ExtrudeGeometry)
  // ==========================================
  function createBeveledSlabGeometry(w, h, d, radius, bevel) {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    const r = radius;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    const extrudeSettings = {
      depth: Math.max(0.01, d - bevel * 2),
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 16
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }

  // ==========================================
  // AERO FROSTED GASKET CANVAS (Ultra-Detailed, Hardware-Accelerated)
  // ==========================================
  let cachedNoisePattern = null;
  function getNoisePattern(ctx) {
    if (!cachedNoisePattern) {
      const nc = document.createElement("canvas");
      nc.width = 128;
      nc.height = 128;
      const nctx = nc.getContext("2d");
      const idata = nctx.createImageData(128, 128);
      const d = idata.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() > 0.5 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = (Math.random() * 24) | 0;
      }
      nctx.putImageData(idata, 0, 0);
      cachedNoisePattern = ctx.createPattern(nc, "repeat");
    }
    return cachedNoisePattern;
  }

  let cachedGasketTexture = null;

  function createAeroFrostedGasketTexture(f) {
    if (cachedGasketTexture) return cachedGasketTexture;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");

    // Base satin frosted acrylic body (luminous frosted platinum / aero glass)
    const baseGrad = ctx.createLinearGradient(0, 0, 1024, 1400);
    baseGrad.addColorStop(0, "#cbd5e1");
    baseGrad.addColorStop(0.35, "#f1f5f9");
    baseGrad.addColorStop(0.7, "#94a3b8");
    baseGrad.addColorStop(1, "#64748b");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 1400);

    // Fast Hardware-Accelerated Noise Pattern (0.1ms vs 300ms loop)
    ctx.save();
    ctx.fillStyle = getNoisePattern(ctx);
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, 1024, 1400);
    ctx.restore();

    // Frosted Chamfer Border Line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, 968, 1344);

    ctx.strokeStyle = "rgba(200, 169, 74, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, 952, 1328);

    // Corner alignment chevrons
    function drawChevron(cx, cy, angle) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(200, 169, 74, 0.7)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(0, -16);
      ctx.lineTo(16, 0);
      ctx.stroke();
      ctx.restore();
    }
    drawChevron(60, 60, Math.PI / 4);
    drawChevron(964, 60, -Math.PI / 4);
    drawChevron(60, 1340, (3 * Math.PI) / 4);
    drawChevron(964, 1340, -(3 * Math.PI) / 4);

    // Top Label Cavity Frame
    ctx.fillStyle = "rgba(6, 9, 14, 0.9)";
    ctx.fillRect(48, 54, 928, 330);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 54, 928, 330);

    // Stepped Inner Aperture for Coin
    // Clear Circular Cutout (Water-Clear Window for Coin)
    const coinCenterX = 512;
    const coinCenterY = 880;
    const coinApertureRadius = 380;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(coinCenterX, coinCenterY, coinApertureRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stepped Beveled Retaining Ring & Edge-View Prongs
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(coinCenterX, coinCenterY, coinApertureRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(coinCenterX, coinCenterY, coinApertureRadius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Precision Edge-View Silicone Grip Prongs at 12, 3, 6, 9 o'clock
    const prongs = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    ctx.fillStyle = "rgba(200, 215, 235, 0.9)";
    prongs.forEach(ang => {
      const px = coinCenterX + Math.cos(ang) * (coinApertureRadius - 8);
      const py = coinCenterY + Math.sin(ang) * (coinApertureRadius - 8);
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();

    cachedGasketTexture = new THREE.CanvasTexture(canvas);
    return cachedGasketTexture;
  }

  function createSlabLabelCanvas(f) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    // Iridescent certified grading label header
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, "#080c14");
    grad.addColorStop(0.3, "#16233b");
    grad.addColorStop(0.5, "#253b64");
    grad.addColorStop(0.7, "#16233b");
    grad.addColorStop(1, "#080c14");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 360);

    // Gold holographic top border
    ctx.fillStyle = "#c8a94a";
    ctx.fillRect(0, 0, 1024, 16);
    ctx.fillRect(0, 344, 1024, 16);

    // Archival Pedigree
    ctx.fillStyle = "#c8a94a";
    ctx.font = "bold 34px 'Courier New', monospace";
    ctx.fillText("🏛️ TITAN ARCHIVAL REPOSITORY · LEDGER RECORD", 48, 64);

    // Specimen Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 52px 'Cinzel', 'Times New Roman', serif";
    const title = `${f.year || ''} ${f.country || 'SPECIMEN'} ${f.denom || ''}`.trim();
    ctx.fillText(title.slice(0, 28), 48, 140);

    // Secondary Meta & Serial
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 32px 'Courier New', monospace";
    ctx.fillText(`SERIAL: ${f.ser || f.scan || 'EU-001'} · ASW: ${f.asw_oz ? f.asw_oz + ' oz Ag' : 'Pure Silver'}`, 48, 205);
    ctx.fillText(`LEDGER # ${f.scan || '—'} · ${String(f.status || 'Logged').toUpperCase()}`, 48, 260);

    // Barcode stripes (right-aligned)
    ctx.fillStyle = "#ffffff";
    for (let x = 800; x < 980; x += 6) {
      const w = (x % 12 === 0) ? 4 : 2;
      ctx.fillRect(x, 100, w, 150);
    }
    ctx.font = "24px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(f.scan || "C100", 890, 280);

    return new THREE.CanvasTexture(canvas);
  }

  function createSlabBackLabelCanvas(f) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    // Holographic rainbow diffraction foil base
    const grad = ctx.createLinearGradient(0, 0, 1024, 360);
    grad.addColorStop(0, "#0a1120");
    grad.addColorStop(0.2, "#1e293b");
    grad.addColorStop(0.4, "#0284c7");
    grad.addColorStop(0.6, "#7c3aed");
    grad.addColorStop(0.8, "#db2777");
    grad.addColorStop(1, "#0a1120");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 360);

    // Guilloche security wavy linework
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.5;
    for (let y = 10; y < 350; y += 12) {
      ctx.beginPath();
      for (let x = 0; x < 1024; x += 20) {
        const dy = Math.sin(x * 0.03 + y * 0.1) * 8;
        if (x === 0) ctx.moveTo(x, y + dy);
        else ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }

    // Gold security border
    ctx.strokeStyle = "rgba(200, 169, 74, 0.85)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 992, 328);

    // Security Hologram Seal (Left)
    ctx.fillStyle = "rgba(200, 169, 74, 0.25)";
    ctx.beginPath();
    ctx.arc(160, 180, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c8a94a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "800 56px 'Cinzel', serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.iso || "AG", 160, 180);

    // Security Text (Center)
    ctx.textAlign = "left";
    ctx.font = "bold 36px 'Cinzel', serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("TITAN ARCHIVAL REPOSITORY", 320, 110);

    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.fillStyle = "#c8a94a";
    ctx.fillText("TAMPER-EVIDENT ARCHIVAL SEAL", 320, 160);

    ctx.font = "24px 'Courier New', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`SECURITY CERT: ${f.scan || 'C001'} · ISO: ${f.iso || 'GL'}`, 320, 210);
    ctx.fillText("PARITY VERIFIED · ZERO RESIDUE HOUSING", 320, 255);

    // Security QR watermark (Right)
    ctx.fillStyle = "#ffffff";
    for (let x = 860; x < 970; x += 10) {
      for (let y = 120; y < 230; y += 10) {
        if ((x + y) % 3 === 0) {
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  function createFlipAeroTexture(f, side = "obv") {
    const isRev = side === "rev";
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Luxury Frosted Aero Acrylic Mount Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
    bgGrad.addColorStop(0, "#1a2538");
    bgGrad.addColorStop(1, "#0a0f1a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Fast Hardware-Accelerated Frosted Sandblast Noise
    ctx.save();
    ctx.fillStyle = getNoisePattern(ctx);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.restore();

    // Crystalline beveled edge border line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 992, 992);

    // Inner gasket border
    ctx.strokeStyle = "rgba(200, 169, 74, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, 952, 952);

    // Central circular aperture cutout
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(512, 512, 360, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Aperture inner frosted silicone rim ring
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(512, 512, 360, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Silicone Edge-View Tabs
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(504, 140, 16, 24); // North
    ctx.fillRect(504, 860, 16, 24); // South
    ctx.fillRect(140, 504, 24, 16); // West
    ctx.fillRect(860, 504, 24, 16); // East

    // Laser-etched metallic typography (Top & Bottom bars)
    const country = (f.country || 'TITAN ARCHIVE').toUpperCase();
    const year = f.year || '—';
    const denom = (f.denom || f.label || 'SPECIMEN').toUpperCase();
    const ser = f.ser || f.scan || 'TITAN-001';

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px 'Cinzel', 'Trajan Pro', Georgia, serif";
    ctx.fillText(`${country} · ${isRev ? "REV" : year}`, 70, 95);

    ctx.fillStyle = "#c8a94a";
    ctx.font = "bold 32px 'JetBrains Mono', 'Courier New', monospace";
    ctx.fillText(ser, 70, 145);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px 'Cinzel', 'Trajan Pro', Georgia, serif";
    ctx.fillText(denom, 70, 925);

    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 30px 'JetBrains Mono', 'Courier New', monospace";
    const purity = f.is_silver
      ? (f.asw_oz ? `${f.asw_oz} oz ASW Silver` : ".999 Fine Silver")
      : (f.is_gold ? ".999 Gold" : (f.km ? `KM# ${f.km}` : "Base metal"));
    ctx.fillText(purity, 70, 968);

    if (isRev) {
      // Iridescent Holographic Security Foil on Reverse Face
      const holoGrad = ctx.createLinearGradient(600, 890, 950, 970);
      holoGrad.addColorStop(0, "#ec4899");
      holoGrad.addColorStop(0.33, "#38bdf8");
      holoGrad.addColorStop(0.66, "#eab308");
      holoGrad.addColorStop(1, "#a855f7");
      ctx.fillStyle = holoGrad;
      ctx.fillRect(680, 900, 270, 65);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(680, 900, 270, 65);

      ctx.fillStyle = "#08090c";
      ctx.font = "bold 20px 'JetBrains Mono', monospace";
      ctx.fillText("★ TITAN SECURE ★", 705, 930);
      ctx.fillText(`ARCHIVE ${ser}`, 715, 954);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    return tex;
  }

  // ==========================================
  // INITIALIZATION & ENVIRONMENT
  // ==========================================
  function initThree(container) {
    if (isInitialized && renderer) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.08);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 2.3, 5.4);

    // 3. Renderer
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x06070a, 1.0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Studio PMREM Environment Map
    studioEnvMap = generateStudioEnvironment(renderer);
    if (studioEnvMap) {
      scene.environment = studioEnvMap;
    }

    // 5. OrbitControls (for table navigation when not dragging coin)
    if (typeof THREE.OrbitControls !== "undefined") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI * 0.48; // Don't look below table
      controls.minDistance = 1.8;
      controls.maxDistance = 8.5;
      controls.target.set(0, 1.6, 0);
    }

    // 6. Lighting Suite
    ambientLight = new THREE.AmbientLight(0xfff8ed, 0.55);
    scene.add(ambientLight);

    // Overhead Gallery Spotlight
    spotLight = new THREE.SpotLight(0xfff1dc, 3.8);
    spotLight.position.set(0, 7.5, 2.5);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.6;
    spotLight.castShadow = true;
    const shadowMapSize = isMobile ? 1024 : 2048;
    spotLight.shadow.mapSize.width = shadowMapSize;
    spotLight.shadow.mapSize.height = shadowMapSize;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 15;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);

    // Raking Grazing Relief Light
    rakingLight = new THREE.DirectionalLight(0xd4af37, 1.2);
    rakingLight.position.set(-6, 0.9, 2);
    rakingLight.castShadow = true;
    scene.add(rakingLight);

    // Interactive Penlight following mouse cursor
    penLight = new THREE.PointLight(0xffffff, 1.8, 12);
    penLight.position.set(0, 2.5, 3);
    scene.add(penLight);

    // 7. Table, Velvet Mat & Display Easel
    buildEnvironment();

    // 8. Specimen Group (Hosts the entire 3D holder + coin together)
    specimenGroup = new THREE.Group();
    specimenGroup.position.set(0, 1.85, 0);
    scene.add(specimenGroup);

    // ==========================================
    // DIRECT SPECIMEN 360° DRAG-TO-ROTATE (VIRTUAL ARCBALL)
    // The WHOLE 3D card/slab rotates as one solid piece!
    // ==========================================
    container.addEventListener("pointerdown", (e) => {
      const rect = container.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointerNDC, camera);

      // Check if specimen was clicked
      const hits = raycaster.intersectObjects(specimenGroup.children, true);
      if (hits.length > 0) {
        isDraggingSpecimen = true;
        if (controls) controls.enabled = false;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
        spinVelocityX = 0;
        spinVelocityY = 0;
        isAnimatingFlip = false;
        container.style.cursor = "grabbing";
      }
    });

    window.addEventListener("pointermove", (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (penLight) {
        penLight.position.x = nx * 3.5;
        penLight.position.y = 2.2 + ny * 1.5;
      }

      if (isDraggingSpecimen && specimenGroup) {
        const dx = e.clientX - prevPointerX;
        const dy = e.clientY - prevPointerY;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;

        const rotSpeed = 0.011;
        // World Y rotation for horizontal mouse drag (Rotates WHOLE 3D card)
        specimenGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * rotSpeed);
        // Camera right-axis rotation for vertical mouse drag (Rotates WHOLE 3D card)
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        specimenGroup.rotateOnWorldAxis(camRight, dy * rotSpeed);

        spinVelocityX = dx * rotSpeed;
        spinVelocityY = dy * rotSpeed;
      }
    });

    window.addEventListener("pointerup", () => {
      if (isDraggingSpecimen) {
        isDraggingSpecimen = false;
        if (controls) controls.enabled = true;
        container.style.cursor = "default";
      }
    });

    window.addEventListener("resize", onWindowResize);

    isInitialized = true;
    animate();
  }

  function buildEnvironment() {
    // Solid Mahogany Wooden Table
    const tableGeo = new THREE.BoxGeometry(16, 0.4, 12);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x22120a,
      roughness: 0.35,
      metalness: 0.08,
      map: createWoodTexture()
    });
    tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.set(0, -0.2, 0);
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // Velvet Examination Mat (Deep Indigo Navy)
    const velvetGeo = new THREE.BoxGeometry(4.8, 0.03, 3.8);
    const velvetMat = new THREE.MeshStandardMaterial({
      color: 0x090f1c,
      roughness: 0.85,
      metalness: 0.02,
      map: createVelvetTexture()
    });
    velvetMesh = new THREE.Mesh(velvetGeo, velvetMat);
    velvetMesh.position.set(0, 0.015, 0);
    velvetMesh.receiveShadow = true;
    scene.add(velvetMesh);

    // Soft Contact Shadow on Velvet Mat
    const shadowGeo = new THREE.PlaneGeometry(3.6, 2.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, 0.032, 0);
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);

    // Lucite Museum Display Easel Stand
    easelGroup = new THREE.Group();
    const easelMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.94,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.2,
      transparent: true,
      opacity: 0.9
    });

    // Base plate
    const baseGeo = new THREE.BoxGeometry(2.2, 0.04, 1.4);
    const baseMesh = new THREE.Mesh(baseGeo, easelMat);
    baseMesh.position.set(0, 0.035, 0.1);
    easelGroup.add(baseMesh);

    // Front cradle hooks
    const hookGeo = new THREE.BoxGeometry(0.18, 0.35, 0.12);
    const hookLeft = new THREE.Mesh(hookGeo, easelMat);
    hookLeft.position.set(-0.85, 0.2, 0.6);
    const hookRight = new THREE.Mesh(hookGeo, easelMat);
    hookRight.position.set(0.85, 0.2, 0.6);
    easelGroup.add(hookLeft, hookRight);

    // Angled back brace
    const braceGeo = new THREE.BoxGeometry(0.16, 1.8, 0.06);
    const braceMesh = new THREE.Mesh(braceGeo, easelMat);
    braceMesh.position.set(0, 0.85, -0.4);
    braceMesh.rotation.x = -Math.PI * 0.12;
    easelGroup.add(braceMesh);

    scene.add(easelGroup);
  }

  // ==========================================
  // SPECIMEN BUILDER (SLAB, PLANCHET, FLIP)
  // Guaranteed 100% Upright Coin Orientation on Both Faces
  // ==========================================
  function buildSpecimenObjects(f) {
    if (!specimenGroup) return;

    // Clear existing meshes
    while (specimenGroup.children.length > 0) {
      const obj = specimenGroup.children[0];
      specimenGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    const obvTex = new THREE.CanvasTexture(createCoinFaceCanvas(f, "obv"));
    const revTex = new THREE.CanvasTexture(createCoinFaceCanvas(f, "rev"));
    const obvBump = new THREE.CanvasTexture(createCoinBumpCanvas(f, "obv"));
    const revBump = new THREE.CanvasTexture(createCoinBumpCanvas(f, "rev"));
    const reededTex = createReededEdgeTexture();

    const isGold = !!f.is_gold || /gold/i.test(f.metal || "");
    const isBronze = /bronze|copper|brass/i.test(f.metal || "");
    const coinColor = isGold ? 0xffdf6d : (isBronze ? 0xd9823b : 0xe2e8f0);

    // ==========================================
    // 1. RAW STRUCK PLANCHET (COIN ASSEMBLY)
    // Front face points +Z (upright), Back face points -Z (upright when flipped)
    // ==========================================
    const coinRadius = 0.95;
    const coinThickness = 0.12;

    planchetMesh = new THREE.Group();

    // Reeded edge cylinder (no caps, open ended)
    const edgeGeo = new THREE.CylinderGeometry(coinRadius, coinRadius, coinThickness, 64, 1, true);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: coinColor,
      roughness: 0.35,
      metalness: 0.95,
      bumpMap: reededTex,
      bumpScale: 0.05
    });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.rotation.x = Math.PI / 2; // Orient cylinder along Z axis
    planchetMesh.add(edgeMesh);

    // Obverse face disk (Normal points +Z towards front, 100% upright)
    const obvGeo = new THREE.CircleGeometry(coinRadius, 64);
    const obvMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.95,
      map: obvTex,
      bumpMap: obvBump,
      bumpScale: 0.04
    });
    const obvMesh = new THREE.Mesh(obvGeo, obvMat);
    obvMesh.position.set(0, 0, coinThickness / 2 + 0.001);
    planchetMesh.add(obvMesh);

    // Reverse face disk (Normal points -Z towards back, 100% upright when flipped 180°)
    const revGeo = new THREE.CircleGeometry(coinRadius, 64);
    const revMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.95,
      map: revTex,
      bumpMap: revBump,
      bumpScale: 0.04
    });
    const revMesh = new THREE.Mesh(revGeo, revMat);
    revMesh.position.set(0, 0, -coinThickness / 2 - 0.001);
    revMesh.rotation.y = Math.PI; // Face backwards so when slab flips 180° it is right side up!
    planchetMesh.add(revMesh);

    // ==========================================
    // 2. BEVELED LUCITE SLAB WITH AERO FROSTED GASKET
    // The entire slab (shell + gasket + label + coin) is one solid 3D card
    // ==========================================
    slabMesh = new THREE.Group();

    // Outer Crystal Beveled Shell (Width: 2.6, Height: 3.5, Depth: 0.26)
    const beveledAcrylicGeo = createBeveledSlabGeometry(2.6, 3.5, 0.26, 0.18, 0.045);
    const acrylicMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.96,
      opacity: 1.0,
      transparent: true,
      roughness: 0.02,
      ior: 1.52,
      thickness: 0.35,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.2
    });
    const acrylicBody = new THREE.Mesh(beveledAcrylicGeo, acrylicMat);
    acrylicBody.castShadow = true;
    acrylicBody.receiveShadow = true;
    slabMesh.add(acrylicBody);

    // Ultrasonic Perimeter Weld Line
    const weldGeo = new THREE.BoxGeometry(2.5, 3.4, 0.08);
    const weldMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.88,
      roughness: 0.12,
      opacity: 0.5,
      transparent: true
    });
    const weldMesh = new THREE.Mesh(weldGeo, weldMat);
    slabMesh.add(weldMesh);

    // 4 Corner Gold/Chrome Rivets
    const rivetGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.29, 24);
    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.15
    });
    const rivetOffsets = [
      [-1.15, 1.6], [1.15, 1.6],
      [-1.15, -1.6], [1.15, -1.6]
    ];
    rivetOffsets.forEach(([rx, ry]) => {
      const rMesh = new THREE.Mesh(rivetGeo, rivetMat);
      rMesh.position.set(rx, ry, 0);
      rMesh.rotation.x = Math.PI / 2;
      slabMesh.add(rMesh);
    });

    // Aero Frosted Glass & Silicone Insert Gasket
    const gasketGeo = new THREE.BoxGeometry(2.38, 3.28, 0.1);
    const frostedTex = createAeroFrostedGasketTexture(f);
    const gasketMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.04,
      transmission: 0.35,
      thickness: 0.18,
      map: frostedTex,
      transparent: true,
      opacity: 0.95,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3
    });
    const gasketMesh = new THREE.Mesh(gasketGeo, gasketMat);
    slabMesh.add(gasketMesh);

    // Front: Printed Holographic Grading Pedigree Label
    const labelTexFront = createSlabLabelCanvas(f);
    const labelGeo = new THREE.PlaneGeometry(2.3, 0.8);
    const labelMatFront = new THREE.MeshBasicMaterial({ map: labelTexFront, transparent: true });
    const labelMeshFront = new THREE.Mesh(labelGeo, labelMatFront);
    labelMeshFront.position.set(0, 1.05, 0.138);
    slabMesh.add(labelMeshFront);

    // Back: Holographic Security Foil Seal
    const labelTexBack = createSlabBackLabelCanvas(f);
    const labelMatBack = new THREE.MeshBasicMaterial({ map: labelTexBack, transparent: true });
    const labelMeshBack = new THREE.Mesh(labelGeo, labelMatBack);
    labelMeshBack.position.set(0, 1.05, -0.138);
    labelMeshBack.rotation.y = Math.PI; // Face backwards
    slabMesh.add(labelMeshBack);

    // Coin Mounted inside Slab Aperture (Firmly anchored into slab)
    const slabCoin = planchetMesh.clone();
    slabCoin.position.set(0, -0.42, 0);
    slabMesh.add(slabCoin);

    // ==========================================
    // 3. AERO FROSTED 2x2 ACRYLIC MOUNT
    // Crystalline beveled edge chamfers, 4 gold rivets & frosted silicone gasket
    // ==========================================
    flipMesh = new THREE.Group();

    // Front & Back Aero Frosted Texture Maps
    const flipFrontTex = createFlipAeroTexture(f, "obv");
    const flipBackTex = createFlipAeroTexture(f, "rev");

    const flipMatFront = new THREE.MeshStandardMaterial({
      map: flipFrontTex,
      roughness: 0.28,
      metalness: 0.12,
      transparent: true
    });
    const flipMatBack = new THREE.MeshStandardMaterial({
      map: flipBackTex,
      roughness: 0.28,
      metalness: 0.12,
      transparent: true
    });
    const flipMatSide = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transmission: 0.92,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      ior: 1.5
    });

    const flipMaterials = [
      flipMatSide, // right
      flipMatSide, // left
      flipMatSide, // top
      flipMatSide, // bottom
      flipMatFront, // front (obv)
      flipMatBack   // back (rev)
    ];

    const flipCardGeo = new THREE.BoxGeometry(2.6, 2.6, 0.08);
    const flipCard = new THREE.Mesh(flipCardGeo, flipMaterials);
    flipCard.castShadow = true;
    flipMesh.add(flipCard);

    // 4 Precision Corner Gold Rivets
    const flipRivetGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.09, 16);
    const flipRivetMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.18
    });
    flipRivetGeo.rotateX(Math.PI / 2);
    [
      [-1.15, 1.15],
      [1.15, 1.15],
      [-1.15, -1.15],
      [1.15, -1.15]
    ].forEach(([rx, ry]) => {
      const rivet = new THREE.Mesh(flipRivetGeo, flipRivetMat);
      rivet.position.set(rx, ry, 0);
      flipMesh.add(rivet);
    });

    // Mylar transparent optical window
    const mylarGeo = new THREE.CylinderGeometry(0.96, 0.96, 0.085, 32);
    const mylarMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.96,
      opacity: 0.6,
      transparent: true,
      roughness: 0.04,
      ior: 1.52
    });
    const mylarWindow = new THREE.Mesh(mylarGeo, mylarMat);
    mylarWindow.rotation.x = Math.PI / 2;
    flipMesh.add(mylarWindow);

    // Coin inside flip (Anchored firmly into flip)
    const flipCoin = planchetMesh.clone();
    flipCoin.position.set(0, 0, 0);
    flipMesh.add(flipCoin);

    // Set active format in scene
    updateActiveFormatVisibility();
  }

  function updateActiveFormatVisibility() {
    if (!specimenGroup) return;
    specimenGroup.clear();

    if (activeFormat === "slab") {
      specimenGroup.add(slabMesh);
      specimenGroup.position.set(0, 1.85, 0);
      if (easelGroup) easelGroup.visible = true;
    } else if (activeFormat === "planchet") {
      specimenGroup.add(planchetMesh);
      specimenGroup.position.set(0, 1.35, 0);
      if (easelGroup) easelGroup.visible = false;
    } else if (activeFormat === "flip") {
      specimenGroup.add(flipMesh);
      specimenGroup.position.set(0, 1.55, 0);
      if (easelGroup) easelGroup.visible = true;
    }
  }

  function setLighting(mode) {
    activeLighting = mode;
    if (!spotLight || !rakingLight || !ambientLight) return;

    if (mode === "gallery") {
      // Warm 3200K gallery spot
      ambientLight.color.setHex(0xfff8ed);
      ambientLight.intensity = 0.55;
      spotLight.color.setHex(0xfff1dc);
      spotLight.intensity = 3.8;
      spotLight.position.set(0, 7.5, 2.5);
      rakingLight.intensity = 1.0;
      renderer.toneMappingExposure = 1.15;
    } else if (mode === "loupe") {
      // 5000K Pure Daylight inspection light
      ambientLight.color.setHex(0xf0f6ff);
      ambientLight.intensity = 0.7;
      spotLight.color.setHex(0xffffff);
      spotLight.intensity = 4.5;
      spotLight.position.set(0, 6.0, 1.0);
      rakingLight.intensity = 0.5;
      renderer.toneMappingExposure = 1.25;
    } else if (mode === "raking") {
      // Low-angle grazing light to expose die relief & cracks
      ambientLight.color.setHex(0x101520);
      ambientLight.intensity = 0.25;
      spotLight.intensity = 0.8;
      rakingLight.color.setHex(0xf59e0b);
      rakingLight.intensity = 4.2;
      rakingLight.position.set(-7, 0.4, 1.2);
      renderer.toneMappingExposure = 1.4;
    }
  }

  // ==========================================
  // SNAP ROTATION ACTIONS (90° EDGE & 180° FLIP)
  // Entire 3D Card rotates smoothly together
  // ==========================================
  function flipSpecimen180() {
    if (isAnimatingFlip || !specimenGroup) return;
    isAnimatingFlip = true;
    flipProgress = 0;
    flipStartQuat.copy(specimenGroup.quaternion);

    isFlipped = !isFlipped;
    // Turn directly to exact 180° back face or 0° front face
    if (isFlipped) {
      flipTargetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    } else {
      flipTargetQuat.identity();
    }
  }

  function flipSpecimen90() {
    if (isAnimatingFlip || !specimenGroup) return;
    isAnimatingFlip = true;
    flipProgress = 0;
    flipStartQuat.copy(specimenGroup.quaternion);

    // Turn directly to exact 90° side edge profile
    flipTargetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  }

  function resetFrontFace() {
    if (isAnimatingFlip || !specimenGroup) return;
    isAnimatingFlip = true;
    flipProgress = 0;
    flipStartQuat.copy(specimenGroup.quaternion);
    flipTargetQuat.identity();
    isFlipped = false;
  }

  function onWindowResize() {
    const container = document.getElementById("spatial-canvas-container");
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    const modal = document.getElementById("spatial-museum-modal");
    if (!modal || modal.hidden) {
      animFrameId = null;
      return;
    }
    animFrameId = requestAnimationFrame(animate);

    // Direct drag momentum & inertia damping (Rotates WHOLE 3D card)
    if (!isDraggingSpecimen && !isAnimatingFlip && specimenGroup) {
      if (Math.abs(spinVelocityX) > 0.0001 || Math.abs(spinVelocityY) > 0.0001) {
        specimenGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), spinVelocityX);
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        specimenGroup.rotateOnWorldAxis(camRight, spinVelocityY);
        spinVelocityX *= 0.93;
        spinVelocityY *= 0.93;
      }
    }

    // Smooth rotational snap animation (Rotates WHOLE 3D card)
    if (isAnimatingFlip && specimenGroup) {
      flipProgress += 0.045;
      const p = Math.min(1, flipProgress);
      // Cubic ease out
      const ease = 1 - Math.pow(1 - p, 3);
      specimenGroup.quaternion.slerpQuaternions(flipStartQuat, flipTargetQuat, ease);

      if (p >= 1) {
        specimenGroup.quaternion.copy(flipTargetQuat);
        isAnimatingFlip = false;
      }
    }

    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // Auto-pause WebGL when tab is hidden or backgrounded
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    } else {
      const modal = document.getElementById("spatial-museum-modal");
      if (modal && !modal.hidden && animFrameId == null) {
        animFrameId = requestAnimationFrame(animate);
      }
    }
  });

  function updateHUD(f) {
    const titleEl = document.getElementById("spatial-specimen-title");
    const metaEl = document.getElementById("spatial-specimen-meta");
    const badgeCert = document.getElementById("spatial-badge-cert");
    const badgeIso = document.getElementById("spatial-badge-iso");
    const badgeAsw = document.getElementById("spatial-badge-asw");

    if (titleEl) titleEl.textContent = `${f.year || ''} ${f.country || 'Specimen'} ${f.denom || ''}`.trim();
    if (metaEl) metaEl.textContent = `SER: ${f.ser || f.scan || '—'} · Struck Planchet · Mint: ${f.mint || 'National Mint'}`;
    if (badgeCert) badgeCert.textContent = `LEDGER ${f.scan || ''}`.trim();
    if (badgeIso) badgeIso.textContent = `${f.iso || 'GL'} · ${(f.country || 'GLOBAL').toUpperCase()}`;
    if (badgeAsw) badgeAsw.textContent = f.asw_oz ? `${f.asw_oz} oz ASW` : (f.is_silver ? "Constitutional Silver" : "Archival Alloy");
  }

  async function exportUSDZ(onSuccess) {
    if (typeof THREE.USDZExporter === "undefined" || typeof window.fflate === "undefined") {
      if (typeof showToast === "function") showToast("USDZ Exporter or fflate unavailable.");
      return;
    }
    const exporter = new THREE.USDZExporter();
    const targetObj = activeFormat === "slab" ? slabMesh : (activeFormat === "planchet" ? planchetMesh : flipMesh);
    if (!targetObj) return;

    try {
      if (typeof showToast === "function") showToast("Compiling 3D USDZ Model...");
      const usdzArrayBuffer = await exporter.parse(targetObj);
      const blob = new Blob([usdzArrayBuffer], { type: "model/vnd.usdz+zip" });
      const url = URL.createObjectURL(blob);
      if (onSuccess) onSuccess(url, blob);
      return url;
    } catch (err) {
      console.error("USDZ export error:", err);
      if (typeof showToast === "function") showToast("Failed to compile USDZ: " + err.message);
    }
  }

  let activeCameraStream = null;
  let isCameraARActive = false;

  async function startCameraARMode() {
    if (isCameraARActive) {
      stopCameraARMode();
      return;
    }
    const container = document.getElementById("spatial-canvas-container");
    if (!container || !renderer) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof showToast === "function") showToast("Camera access unavailable on this browser.");
      return;
    }

    try {
      if (typeof showToast === "function") showToast("Activating Real-World AR Camera Feed...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      activeCameraStream = stream;

      let videoEl = document.getElementById("spatial-ar-camera");
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.id = "spatial-ar-camera";
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;";
        container.insertBefore(videoEl, container.firstChild);
      }
      videoEl.srcObject = stream;
      videoEl.style.display = "block";

      // Make Three.js canvas transparent
      renderer.setClearColor(0x000000, 0);
      if (tableMesh) tableMesh.visible = false;
      if (shadowPlane) shadowPlane.visible = true; // keep realistic contact shadow
      isCameraARActive = true;

      // Update AR button text
      const arBtn = document.getElementById("spatial-btn-ar");
      if (arBtn) {
        arBtn.textContent = "✕ Exit AR";
        arBtn.style.background = "#ef4444";
        arBtn.style.color = "#fff";
      }
      if (typeof showToast === "function") showToast("AR Active: Drag or rotate coin on your physical surface!");
    } catch (err) {
      console.error("Camera AR error:", err);
      if (typeof showToast === "function") showToast("Camera permission denied or camera unavailable.");
    }
  }

  function stopCameraARMode() {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach(t => t.stop());
      activeCameraStream = null;
    }
    const videoEl = document.getElementById("spatial-ar-camera");
    if (videoEl) videoEl.style.display = "none";

    if (renderer) renderer.setClearColor(0x080b12, 1);
    if (tableMesh) tableMesh.visible = true;
    isCameraARActive = false;

    const arBtn = document.getElementById("spatial-btn-ar");
    if (arBtn) {
      arBtn.innerHTML = `<span>📱 View in AR</span>`;
      arBtn.style.background = "";
      arBtn.style.color = "";
    }
  }

  // ==========================================
  // PUBLIC CONTROLLER API
  // ==========================================
  window.TitanSpatial = {
    open: function(specimenOrScan, initialFormat = "slab") {
      const modal = document.getElementById("spatial-museum-modal");
      if (!modal) return;

      const flips = (window.vault && window.vault.flips) ? window.vault.flips : [];
      let f = specimenOrScan;
      if (typeof specimenOrScan === "string") {
        f = flips.find(x => x.scan === specimenOrScan || x.ser === specimenOrScan);
      }
      if (!f && flips.length > 0) f = flips[0];
      if (!f) f = { country: "Germany", year: "1918", denom: "20 Pfennig", ser: "EU-DE-001", scan: "C001", iso: "DE", is_silver: true, asw_oz: 0.24 };

      currentSpecimen = f;
      currentSpecimenIndex = flips.indexOf(f);
      if (currentSpecimenIndex === -1) currentSpecimenIndex = 0;
      activeFormat = initialFormat;

      modal.hidden = false;
      document.body.style.overflow = "hidden";

      const canvasContainer = document.getElementById("spatial-canvas-container");
      initThree(canvasContainer);
      buildSpecimenObjects(f);
      updateHUD(f);
      setLighting(activeLighting);
      onWindowResize();

      if (controls) {
        controls.target.set(0, 1.6, 0);
        camera.position.set(0, 2.5, 6.6);
        controls.update();
      }

      if (animFrameId == null) {
        animFrameId = requestAnimationFrame(animate);
      }
    },

    close: function() {
      stopCameraARMode();
      const modal = document.getElementById("spatial-museum-modal");
      if (modal) modal.hidden = true;
      document.body.style.overflow = "";
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    },

    setSpecimen: function(f) {
      if (!f) return;
      currentSpecimen = f;
      buildSpecimenObjects(f);
      updateHUD(f);
    },

    setFormat: function(format) {
      activeFormat = format;
      updateActiveFormatVisibility();
      document.querySelectorAll("#spatial-format-switch .seg-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.format === format);
      });
    },

    setLighting: function(mode) {
      setLighting(mode);
      document.querySelectorAll("#spatial-lighting-switch .seg-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.light === mode);
      });
    },

    flip: flipSpecimen180,
    flip90: flipSpecimen90,
    resetFront: resetFrontFace,

    next: function() {
      const flips = (window.vault && window.vault.flips) ? window.vault.flips : [];
      if (flips.length === 0) return;
      currentSpecimenIndex = (currentSpecimenIndex + 1) % flips.length;
      window.TitanSpatial.setSpecimen(flips[currentSpecimenIndex]);
    },

    prev: function() {
      const flips = (window.vault && window.vault.flips) ? window.vault.flips : [];
      if (flips.length === 0) return;
      currentSpecimenIndex = (currentSpecimenIndex - 1 + flips.length) % flips.length;
      window.TitanSpatial.setSpecimen(flips[currentSpecimenIndex]);
    },

    exportAR: function() {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ("ontouchend" in document && window.innerWidth < 1024);
      const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent) && ("ontouchend" in document || navigator.maxTouchPoints > 0);
      const isAndroid = /Android/i.test(navigator.userAgent);

      if (isApple) {
        exportUSDZ((url) => {
          const anchor = document.createElement("a");
          anchor.rel = "ar";
          anchor.href = url;
          anchor.appendChild(document.createElement("img"));
          document.body.appendChild(anchor);
          anchor.click();
          setTimeout(() => document.body.removeChild(anchor), 2000);
        });
      } else if (isAndroid || isMobile) {
        startCameraARMode();
      } else {
        // Desktop: open QR modal pointing to the exact specimen mobile AR URL
        const scanKey = currentSpecimen?.scan || currentSpecimen?.ser || "C001";
        const arUrl = `${window.location.origin}${window.location.pathname}?specimen=${encodeURIComponent(scanKey)}&format=${activeFormat}&ar=1`;
        const qrModal = document.getElementById("spatial-qr-modal");
        const qrContainer = document.getElementById("spatial-qr-container");
        if (qrModal && qrContainer) {
          qrContainer.innerHTML = "";
          if (typeof QRCode !== "undefined") {
            new QRCode(qrContainer, {
              text: arUrl,
              width: 190,
              height: 190,
              colorDark: "#08090c",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.M
            });
          }
          qrModal.hidden = false;
        }
      }
    }
  };

  // Handle URL query parameters for direct specimen AR loading
  function handleUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const specimenParam = params.get("specimen") || params.get("scan");
      const arParam = params.get("ar") === "1";
      const formatParam = params.get("format") || "slab";

      if (specimenParam) {
        setTimeout(() => {
          window.TitanSpatial.open(specimenParam, formatParam);
          if (arParam) {
            setTimeout(() => {
              window.TitanSpatial.exportAR();
            }, 800);
          }
        }, 350);
      }
    } catch (_) {}
  }

  // Wire UI event bindings
  document.addEventListener("DOMContentLoaded", () => {
    // Format switcher
    document.querySelectorAll("#spatial-format-switch .seg-btn").forEach(btn => {
      btn.addEventListener("click", () => window.TitanSpatial.setFormat(btn.dataset.format));
    });

    // Lighting switcher
    document.querySelectorAll("#spatial-lighting-switch .seg-btn").forEach(btn => {
      btn.addEventListener("click", () => window.TitanSpatial.setLighting(btn.dataset.light));
    });

    // Snap buttons
    document.getElementById("spatial-btn-flip")?.addEventListener("click", flipSpecimen180);
    document.getElementById("spatial-btn-edge")?.addEventListener("click", flipSpecimen90);
    document.getElementById("spatial-btn-front")?.addEventListener("click", resetFrontFace);

    // Prev / Next buttons
    document.getElementById("spatial-btn-prev")?.addEventListener("click", () => window.TitanSpatial.prev());
    document.getElementById("spatial-btn-next")?.addEventListener("click", () => window.TitanSpatial.next());

    // Close button
    document.getElementById("spatial-btn-close")?.addEventListener("click", () => window.TitanSpatial.close());

    // AR & QR buttons
    document.getElementById("spatial-btn-ar")?.addEventListener("click", () => window.TitanSpatial.exportAR());
    document.getElementById("spatial-btn-qr")?.addEventListener("click", () => {
      const qrModal = document.getElementById("spatial-qr-modal");
      const qrContainer = document.getElementById("spatial-qr-container");
      if (qrModal && qrContainer) {
        qrContainer.innerHTML = "";
        const scanKey = currentSpecimen?.scan || currentSpecimen?.ser || "C001";
        const arUrl = `${window.location.origin}${window.location.pathname}?specimen=${encodeURIComponent(scanKey)}&format=${activeFormat}&ar=1`;
        if (typeof QRCode !== "undefined") {
          new QRCode(qrContainer, {
            text: arUrl,
            width: 190,
            height: 190,
            colorDark: "#08090c",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        }
        qrModal.hidden = false;
      }
    });

    handleUrlParams();

    document.getElementById("spatial-qr-close")?.addEventListener("click", () => {
      const qrModal = document.getElementById("spatial-qr-modal");
      if (qrModal) qrModal.hidden = true;
    });

    document.getElementById("spatial-download-usdz")?.addEventListener("click", () => {
      exportUSDZ((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentSpecimen ? currentSpecimen.scan || 'specimen' : 'titan-specimen'}.usdz`;
        a.click();
      });
    });

    // Keyboard navigation
    window.addEventListener("keydown", (e) => {
      const modal = document.getElementById("spatial-museum-modal");
      if (!modal || modal.hidden) return;

      if (e.key === "Escape") {
        window.TitanSpatial.close();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        flipSpecimen180();
      } else if (e.key.toLowerCase() === "e") {
        flipSpecimen90();
      } else if (e.key.toLowerCase() === "r") {
        resetFrontFace();
      } else if (e.key === "ArrowLeft") {
        window.TitanSpatial.prev();
      } else if (e.key === "ArrowRight") {
        window.TitanSpatial.next();
      } else if (e.key.toLowerCase() === "f") {
        const formats = ["slab", "planchet", "flip"];
        const nextIdx = (formats.indexOf(activeFormat) + 1) % formats.length;
        window.TitanSpatial.setFormat(formats[nextIdx]);
      } else if (e.key.toLowerCase() === "l") {
        const lights = ["gallery", "loupe", "raking"];
        const nextIdx = (lights.indexOf(activeLighting) + 1) % lights.length;
        window.TitanSpatial.setLighting(lights[nextIdx]);
      }
    });
  });

})(window);
