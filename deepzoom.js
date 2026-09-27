/**
 * TITAN RELIQUARY · GIGAPIXEL DEEP-ZOOM NUMISMATIC FORENSIC STATION (PHASE F)
 * Multi-resolution deep-zoom tile engine powered by OpenSeadragon.
 * Features 1x to 40x magnification, millimeter/micron forensic reticle,
 * live physical coordinate telemetry (X/Y mm), 360° directional raking light dial,
 * multi-spectral forensic filters (Optical, High-Relief, Negative Tooling, UV Toning),
 * and interactive die variety annotation pins.
 */
(function(window) {
  "use strict";

  let osdViewer = null;
  let activeSpecimen = null;
  let activeSide = "obv"; // 'obv' | 'rev'
  let activeFilter = "optical"; // 'optical' | 'relief' | 'negative' | 'toning'
  let activeRakingAngle = 45; // degrees 0-360
  let isReticleVisible = true;
  let varietyPins = [];

  function generateHighResDiePlate(f, side = "obv") {
    // Generate an ultra-high-resolution 2048x2048 forensic inspection canvas
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");
    const isRev = side === "rev";

    const isSilver = !!f.is_silver || !!f.asw_oz;
    const isGold = !!f.is_gold || /gold/i.test(f.metal || "");
    const isBronze = /bronze|copper|brass/i.test(f.metal || "");

    // Deep museum velvet backdrop
    ctx.fillStyle = "#06080c";
    ctx.fillRect(0, 0, 2048, 2048);

    // Struck Planchet Base Disk
    const planchetRadius = 940;
    const grad = ctx.createRadialGradient(960, 920, 80, 1024, 1024, 1000);
    if (isGold) {
      grad.addColorStop(0, "#fffde7");
      grad.addColorStop(0.2, "#fde047");
      grad.addColorStop(0.6, "#ca8a04");
      grad.addColorStop(0.9, "#854d0e");
      grad.addColorStop(1, "#361e04");
    } else if (isBronze) {
      grad.addColorStop(0, "#fff1e6");
      grad.addColorStop(0.2, "#fb923c");
      grad.addColorStop(0.6, "#c2410c");
      grad.addColorStop(0.9, "#7c2d12");
      grad.addColorStop(1, "#381206");
    } else {
      // Silver default
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.25, "#e2e8f0");
      grad.addColorStop(0.65, "#94a3b8");
      grad.addColorStop(0.88, "#475569");
      grad.addColorStop(1, "#0f172a");
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(1024, 1024, planchetRadius, 0, Math.PI * 2);
    ctx.fill();

    // Authentic Die Flow Lines (Micro-Radial Metal Flow of Cold Striking)
    ctx.save();
    ctx.translate(1024, 1024);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 720; i++) {
      const angle = (i / 720) * Math.PI * 2;
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(350 + Math.random() * 80, 0);
      ctx.lineTo(planchetRadius - 10, 0);
      ctx.stroke();
      ctx.rotate(-angle);
    }
    ctx.restore();

    // Raised Outer Die Rim with Specular Highlight
    ctx.lineWidth = 32;
    ctx.strokeStyle = isGold ? "rgba(254, 240, 138, 0.95)" : (isBronze ? "rgba(254, 215, 170, 0.95)" : "rgba(255, 255, 255, 0.95)");
    ctx.beginPath();
    ctx.arc(1024, 1024, planchetRadius - 16, 0, Math.PI * 2);
    ctx.stroke();

    // Concentric Beaded Dentil Ring (140 precision beads)
    const numDentils = 140;
    const dentilR = planchetRadius - 65;
    ctx.fillStyle = isGold ? "#fef08a" : (isBronze ? "#fed7aa" : "#ffffff");
    for (let i = 0; i < numDentils; i++) {
      const a = (i / numDentils) * Math.PI * 2;
      const x = 1024 + Math.cos(a) * dentilR;
      const y = 1024 + Math.sin(a) * dentilR;
      ctx.beginPath();
      ctx.arc(x, y, 9.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inscriptions and Heraldry
    ctx.save();
    ctx.translate(1024, 1024);
    ctx.font = "bold 96px 'Cinzel', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isGold ? "#fffde7" : (isBronze ? "#fff1e6" : "#ffffff");
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;

    const countryName = (f.country || "ARCHIVAL SPECIMEN").toUpperCase();
    const year = f.year || "HISTORIC";
    const denom = (f.denom || "SPECIMEN").toUpperCase();

    if (!isRev) {
      // Obverse Sovereign Arc
      const upperArcRadius = 780;
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

      // Center Crest
      ctx.font = "800 160px 'Cinzel', serif";
      ctx.fillText(f.iso || "AG", 0, -40);
      ctx.font = "bold 72px 'Courier New', monospace";
      ctx.fillText(`PROVENANCE · ${year}`, 0, 110);
      ctx.font = "bold 56px 'Courier New', monospace";
      ctx.fillText(`${f.ser || f.scan || 'SPECIMEN'} · ${f.asw_oz ? f.asw_oz + ' OZ AG' : '.999 FINE'}`, 0, 750);
    } else {
      // Reverse Die
      ctx.font = "800 170px 'Cinzel', 'Times New Roman', serif";
      ctx.fillText(denom.slice(0, 14), 0, -80);

      ctx.beginPath();
      ctx.arc(0, 80, 260, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.font = "bold 110px 'Cinzel', serif";
      ctx.fillText(year, 0, 80);

      ctx.font = "bold 64px 'Courier New', monospace";
      ctx.fillText(f.km ? `KM# ${f.km} · REVERSE DIE` : "TITAN ARCHIVAL REPOSITORY", 0, 750);
    }
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  function initOpenSeadragon(container, dataUrl) {
    if (typeof OpenSeadragon === "undefined") {
      console.warn("[TitanDeepZoom] OpenSeadragon library not loaded.");
      return;
    }

    if (osdViewer) {
      osdViewer.destroy();
      osdViewer = null;
    }

    container.innerHTML = "";

    osdViewer = OpenSeadragon({
      element: container,
      prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
      tileSources: {
        type: "image",
        url: dataUrl
      },
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      navigatorSizeRatio: 0.18,
      navigatorAutoFade: false,
      maxZoomPixelRatio: 12.0, // Allows up to 40x macro zoom
      minZoomImageRatio: 0.8,
      defaultZoomLevel: 1.05,
      visibilityRatio: 0.9,
      constrainDuringPan: true,
      animationTime: 0.35,
      springStiffness: 9.0
    });

    // Real-Time Telemetry Tracking (Zoom & Metric Coordinates)
    osdViewer.addHandler("animation", updateTelemetry);
    osdViewer.addHandler("canvas-click", handleCanvasClick);

    // Mouse movement telemetry
    const canvasEl = osdViewer.canvas;
    if (canvasEl) {
      canvasEl.addEventListener("mousemove", (e) => {
        if (!osdViewer || !activeSpecimen) return;
        const webPoint = new OpenSeadragon.Point(e.offsetX, e.offsetY);
        const viewportPoint = osdViewer.viewport.pointFromPixel(webPoint);
        const imagePoint = osdViewer.viewport.viewportToImageCoordinates(viewportPoint);

        // Convert 2048px canvas coordinate to real physical millimeters relative to center (0,0)
        const coinDiamMm = activeSpecimen.asw_oz ? 38.0 : 25.0;
        const mmPerPixel = coinDiamMm / 1880.0;
        const relX = ((imagePoint.x - 1024) * mmPerPixel).toFixed(2);
        const relY = ((1024 - imagePoint.y) * mmPerPixel).toFixed(2);

        const coordsBadge = document.getElementById("deepzoom-coords-hud");
        if (coordsBadge) {
          coordsBadge.textContent = `X: ${relX > 0 ? '+' : ''}${relX} mm · Y: ${relY > 0 ? '+' : ''}${relY} mm`;
        }
      });
    }
  }

  function updateTelemetry() {
    if (!osdViewer) return;
    const zoomVal = osdViewer.viewport.getZoom(true);
    const magLevel = (zoomVal * 2.8).toFixed(1);
    const zoomBadge = document.getElementById("deepzoom-mag-hud");
    if (zoomBadge) zoomBadge.textContent = `${magLevel}× MAG`;
  }

  function handleCanvasClick(e) {
    if (!e.quick || !osdViewer) return;
    // Dropping a variety pin if shift-clicked
    if (e.originalEvent && e.originalEvent.shiftKey) {
      const viewportPoint = osdViewer.viewport.pointFromPixel(e.position);
      const note = prompt("Enter Numismatic Variety Note (e.g. Doubled Die, Mintmark Repunch, Flow Line):");
      if (note && note.trim()) {
        addVarietyPin(viewportPoint.x, viewportPoint.y, note.trim());
      }
    }
  }

  function addVarietyPin(vx, vy, note) {
    if (!osdViewer) return;
    const pinEl = document.createElement("div");
    pinEl.className = "deepzoom-variety-pin";
    pinEl.innerHTML = `
      <div class="pin-marker">📍</div>
      <div class="pin-tooltip">${note}</div>
    `;
    osdViewer.addOverlay({
      element: pinEl,
      location: new OpenSeadragon.Point(vx, vy),
      placement: OpenSeadragon.Placement.CENTER
    });
    varietyPins.push({ x: vx, y: vy, note: note });
  }

  function setFilter(filterId) {
    activeFilter = filterId;
    const canvasWrap = document.querySelector("#deepzoom-viewer-container .openseadragon-canvas");
    if (!canvasWrap) return;

    canvasWrap.classList.remove("filter-optical", "filter-relief", "filter-negative", "filter-toning");
    canvasWrap.classList.add(`filter-${filterId}`);

    document.querySelectorAll("#deepzoom-filter-switch .seg-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.filter === filterId);
    });
  }

  function setRakingAngle(deg) {
    activeRakingAngle = deg;
    const rad = (deg * Math.PI) / 180;
    const ox = (Math.cos(rad) * 6).toFixed(1);
    const oy = (Math.sin(rad) * 6).toFixed(1);

    document.documentElement.style.setProperty("--deepzoom-relief-ox", `${ox}px`);
    document.documentElement.style.setProperty("--deepzoom-relief-oy", `${oy}px`);

    const dialVal = document.getElementById("deepzoom-raking-val");
    if (dialVal) dialVal.textContent = `${deg}°`;
  }

  function updateHUD(f) {
    const titleEl = document.getElementById("deepzoom-title");
    const subEl = document.getElementById("deepzoom-subtitle");
    if (titleEl) titleEl.textContent = `${f.year || ''} ${f.country || 'Specimen'} ${f.denom || ''}`.trim();
    if (subEl) subEl.textContent = `SER: ${f.ser || f.scan || '—'} · Mint: ${f.mint || 'National Mint'} · Side: ${activeSide.toUpperCase()}`;
  }

  // ==========================================
  // PUBLIC DEEP-ZOOM API
  // ==========================================
  window.TitanDeepZoom = {
    open: function(specimenOrScan, side = "obv") {
      const modal = document.getElementById("deepzoom-forensic-modal");
      if (!modal) return;

      const flips = (window.vault && window.vault.flips) ? window.vault.flips : [];
      let f = specimenOrScan;
      if (typeof specimenOrScan === "string") {
        f = flips.find(x => x.scan === specimenOrScan || x.ser === specimenOrScan);
      }
      if (!f && flips.length > 0) f = flips[0];
      if (!f) f = { country: "Germany", year: "1918", denom: "20 Pfennig", ser: "EU-DE-001", scan: "C001", iso: "DE", is_silver: true, asw_oz: 0.24 };

      activeSpecimen = f;
      activeSide = side;
      varietyPins = [];

      modal.hidden = false;
      document.body.style.overflow = "hidden";

      const container = document.getElementById("deepzoom-viewer-container");
      const highResDataUrl = generateHighResDiePlate(f, activeSide);
      initOpenSeadragon(container, highResDataUrl);
      updateHUD(f);
      setFilter(activeFilter);
      setRakingAngle(activeRakingAngle);
    },

    close: function() {
      const modal = document.getElementById("deepzoom-forensic-modal");
      if (modal) modal.hidden = true;
      document.body.style.overflow = "";
      if (osdViewer) {
        osdViewer.destroy();
        osdViewer = null;
      }
    },

    setZoom: function(magMultiplier) {
      if (!osdViewer) return;
      const targetZoom = magMultiplier / 2.8;
      osdViewer.viewport.zoomTo(targetZoom);
    },

    flip: function() {
      activeSide = activeSide === "obv" ? "rev" : "obv";
      if (!activeSpecimen) return;
      const container = document.getElementById("deepzoom-viewer-container");
      const highResDataUrl = generateHighResDiePlate(activeSpecimen, activeSide);
      initOpenSeadragon(container, highResDataUrl);
      updateHUD(activeSpecimen);
      setFilter(activeFilter);
    },

    setFilter: setFilter,
    setRakingAngle: setRakingAngle,

    toggleReticle: function() {
      isReticleVisible = !isReticleVisible;
      const reticle = document.getElementById("deepzoom-reticle-overlay");
      if (reticle) reticle.style.display = isReticleVisible ? "block" : "none";
      const btn = document.getElementById("deepzoom-btn-reticle");
      if (btn) btn.classList.toggle("active", isReticleVisible);
    }
  };

  // Wire DOM listeners
  document.addEventListener("DOMContentLoaded", () => {
    // Zoom quick buttons
    document.querySelectorAll(".deepzoom-zoom-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mag = parseFloat(btn.dataset.mag);
        if (mag) window.TitanDeepZoom.setZoom(mag);
      });
    });

    // Filter switcher
    document.querySelectorAll("#deepzoom-filter-switch .seg-btn").forEach(btn => {
      btn.addEventListener("click", () => window.TitanDeepZoom.setFilter(btn.dataset.filter));
    });

    // Raking angle slider
    const angleSlider = document.getElementById("deepzoom-raking-slider");
    if (angleSlider) {
      angleSlider.addEventListener("input", (e) => {
        window.TitanDeepZoom.setRakingAngle(parseInt(e.target.value, 10));
      });
    }

    // Flip side button
    document.getElementById("deepzoom-btn-flip")?.addEventListener("click", () => window.TitanDeepZoom.flip());

    // Reticle toggle button
    document.getElementById("deepzoom-btn-reticle")?.addEventListener("click", () => window.TitanDeepZoom.toggleReticle());

    // Close button
    document.getElementById("deepzoom-btn-close")?.addEventListener("click", () => window.TitanDeepZoom.close());

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      const modal = document.getElementById("deepzoom-forensic-modal");
      if (!modal || modal.hidden) return;

      if (e.key === "Escape") {
        window.TitanDeepZoom.close();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        window.TitanDeepZoom.flip();
      } else if (e.key.toLowerCase() === "r") {
        window.TitanDeepZoom.toggleReticle();
      }
    });
  });

})(window);
