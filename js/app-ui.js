/* Titan Reliquary · small UI helpers split out of app.js (fix list #32, step 1; see notes/agents/app-split.md).
   Loaded before app.js; app.js reads them from window.TitanAppUI (and falls back to plain no-motion versions if this file is missing).
   Nothing here depends on app.js. */
(() => {
  "use strict";
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const toast = (m) => { try { window.__galleryBridge && window.__galleryBridge.showToast(m); } catch (_) {} };

  // Pre-render static noise texture once to eliminate Edge SVG feTurbulence re-rasterization lockups
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const id = g.createImageData(128, 128);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
      d[i + 3] = (Math.random() * 45 + 15) | 0;
    }
    g.putImageData(id, 0, 0);
    document.documentElement.style.setProperty("--grain-url", `url("${c.toDataURL("image/png")}")`);
  } catch (_) {}

  /* --- Gold dust motes: slow ambient particles drifting up the page.
         Pure atmosphere — gold in every theme, embers in the Cursed Wing. --- */
  function goldDust() {
    if (document.getElementById("dust-layer")) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.id = "dust-layer";
    layer.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 14; i++) {
      const m = document.createElement("i");
      const s = 2 + Math.random() * 3;
      m.style.left = (Math.random() * 100).toFixed(1) + "vw";
      m.style.width = m.style.height = s.toFixed(1) + "px";
      m.style.animationDuration = (16 + Math.random() * 18).toFixed(1) + "s";
      m.style.animationDelay = (-Math.random() * 30).toFixed(1) + "s";
      m.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
      layer.appendChild(m);
    }
    document.body.appendChild(layer);
  }

  /** Count-up animation for a big figure; respects prefers-reduced-motion. */
  function countUp(el, target, fmt) {
    if (!el) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target == null || Number.isNaN(Number(target))) { el.textContent = fmt(target); return; }
    const dur = 1200, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* --- Reveal-on-scroll: .reveal tiles/cards stagger in, 70ms apart --- */
  let revealObs = null;
  function observeReveals(root = document) {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    if (!revealObs) {
      revealObs = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("in");
          revealObs.unobserve(en.target);
        }
      }, { rootMargin: "60px" });
    }
    $$(".reveal:not(.in)", root).forEach((el, i) => {
      el.style.setProperty("--rd", ((i % 8) * 70) + "ms");
      revealObs.observe(el);
    });
  }

  /* --- Easter egg: the Konami code. The curator sees you. --- */
  (() => {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let pos = 0;
    window.addEventListener("keydown", (e) => {
      if (e.key !== seq[pos]) { pos = e.key === seq[0] ? 1 : 0; return; }
      pos += 1;
      if (pos === seq.length) {
        pos = 0;
        const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) {
          document.body.classList.remove("curator-sees-you");
          void document.body.offsetWidth;
          document.body.classList.add("curator-sees-you");
          setTimeout(() => document.body.classList.remove("curator-sees-you"), 900);
        }
        toast("THE CURATOR SEES YOU");
      }
    });
  })();

  window.TitanAppUI = { goldDust, countUp, observeReveals };
})();
