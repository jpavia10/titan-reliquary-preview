/**
 * TITAN RELIQUARY · THE EXAMINATION TABLE (3D)
 *
 * A lamp-lit mahogany table with an indigo velvet pad. The piece being examined stands on an
 * acrylic plinth and can be turned in the hand (drag / arcball with inertia, snap 90° edge,
 * 180° flip). Other pieces from the collection (coins in their 2x2 flips, bullion bars, rounds,
 * tubes, assay cards, mint sets) can be laid out on the pad and picked up with a tap.
 *
 * Units: 1 world unit = 1 cm. Three.js r128 API (outputEncoding / sRGBEncoding / PMREM).
 * Everything is procedural (no photos exist yet) and every printed word comes from the record.
 * Coin *appearance* (copper vs cupronickel vs brass) is an estimate from the denomination when the
 * record has no metal field; it is never shown as a fact in the HUD.
 *
 * Public API (unchanged): window.TitanSpatial.open(recOrScan, format), close(), setSpecimen(rec),
 * setFormat('slab'|'planchet'|'flip'), setLighting('gallery'|'loupe'|'raking'), flip(), flip90(),
 * resetFront(), next(), prev(), exportAR(). Deep link: ?specimen=SCAN&format=flip&ar=1
 */
(function (window, document) {
  "use strict";

  var THREE = window.THREE;
  var LS_KEY = "titan.table.layout.v1";
  var MAX_ON_TABLE = 9;

  // ---------------------------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------------------------
  function mk(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hash(s) { s = String(s || ""); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var t = seed >>> 0; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  function gray(v) { var n = Math.round(clamp(v, 0, 1) * 255); return "rgb(" + n + "," + n + "," + n + ")"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function prefersReducedMotion() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function isSmallScreen() { return Math.min(window.innerWidth, window.innerHeight) < 600; }
  function isTouch() { return ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0; }
  function toast(msg) { if (typeof window.showToast === "function") window.showToast(msg); }
  function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  function mixHex(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  var SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
  var MONO = '"Cascadia Code", Consolas, Menlo, "Courier New", monospace';
  var SANS = '"Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif';
  function fitFont(ctx, text, maxW, px, weight, family) {
    var size = px;
    do { ctx.font = (weight || 600) + " " + size + "px " + (family || SERIF); if (ctx.measureText(text).width <= maxW) break; size -= 2; } while (size > 8);
    return size;
  }

  // ---------------------------------------------------------------------------------------------
  // Data access (read-only: window.vault)
  // ---------------------------------------------------------------------------------------------
  function vaultLists() {
    var v = window.vault || {};
    return { flips: v.flips || [], bullion: v.bullion || [], sets: v.sets || [] };
  }
  function kindOf(rec) { if (!rec) return "flip"; if (rec.kind === "bullion") return "bullion"; if (rec.kind === "set") return "set"; return "flip"; }
  function listFor(rec) { var L = vaultLists(); var k = kindOf(rec); return k === "bullion" ? L.bullion : (k === "set" ? L.sets : L.flips); }
  function findRec(key) {
    if (!key) return null;
    var K = String(key).toUpperCase(), L = vaultLists();
    var all = L.flips.concat(L.bullion, L.sets);
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].scan || "").toUpperCase() === K || String(all[i].ser || "").toUpperCase() === K) return all[i];
    }
    return null;
  }
  function recKey(rec) { return rec ? String(rec.scan || rec.ser || "") : ""; }
  function titleOf(rec) {
    if (!rec) return "";
    if (kindOf(rec) === "flip") return [rec.year, rec.country, rec.denom].filter(Boolean).join(" ");
    return rec.label || [rec.year, rec.country, rec.denom].filter(Boolean).join(" ");
  }

  // ---------------------------------------------------------------------------------------------
  // Appearance: metal presets and the estimate used when the record carries no metal.
  // ---------------------------------------------------------------------------------------------
  var METALS = {
    silver: { base: "#d7d8db", hi: "#ffffff", lo: "#7c7f86", rough: 0.22, edgeRough: 0.26 },
    gold:   { base: "#e3b24a", hi: "#fff0b3", lo: "#8a5f14", rough: 0.2, edgeRough: 0.24 },
    copper: { base: "#bd6f48", hi: "#f0b08a", lo: "#5e2a14", rough: 0.36, edgeRough: 0.38 },
    bronze: { base: "#a66c43", hi: "#d9a378", lo: "#51301a", rough: 0.4, edgeRough: 0.42 },
    brass:  { base: "#cda955", hi: "#f3dc98", lo: "#6e5623", rough: 0.32, edgeRough: 0.34 },
    cuni:   { base: "#c3c2bb", hi: "#eeede6", lo: "#6f6e67", rough: 0.34, edgeRough: 0.36 },
    steel:  { base: "#b8bcc1", hi: "#e8ebee", lo: "#686c71", rough: 0.3, edgeRough: 0.32 },
    alu:    { base: "#cdd0d3", hi: "#f2f3f4", lo: "#85888c", rough: 0.46, edgeRough: 0.48 }
  };
  // Returns { metal, ring?, known } ; `known` is true only when the record itself says so.
  function appearanceFor(rec) {
    var txt = [rec.metal, rec.cat, rec.label].join(" ");
    if (rec.is_gold || /\bAu\b|gold/i.test(txt)) return { metal: "gold", known: true };
    if (rec.is_silver || (rec.asw_oz > 0) || /\bAg\b|silver/i.test(txt)) return { metal: "silver", known: true };
    var d = String(rec.denom || "").toLowerCase(), n = parseFloat((d.match(/[\d.]+/) || [])[0] || (/½/.test(d) ? 0.5 : NaN));
    if (/^1 euro\b/.test(d)) return { metal: "cuni", ring: "brass" };
    if (/^2 euro\b/.test(d)) return { metal: "brass", ring: "cuni" };
    if (/euro cent/.test(d)) return { metal: n <= 5 ? "copper" : "brass" };
    if (/pfennig/.test(d)) return { metal: n <= 2 ? "copper" : (n <= 10 ? "brass" : "cuni") };
    if (/yen/.test(d)) return { metal: n === 1 ? "alu" : (n === 5 ? "brass" : (n === 10 ? "bronze" : "cuni")) };
    if (/penny|pence|halfpenny|kopek/.test(d)) return { metal: n <= 2 ? "bronze" : "cuni" };
    if (/\bcents?\b|centavos?|centimes?|sentimo|øre|rappen/.test(d)) return { metal: n <= 1 ? "copper" : (/rappen/.test(d) && n <= 5 ? "brass" : "cuni") };
    if (/token|spielmarke/.test(d)) return { metal: "brass" };
    return { metal: "cuni" };
  }

  // ---------------------------------------------------------------------------------------------
  // Coin specification derived from a record (all text comes from the record)
  // ---------------------------------------------------------------------------------------------
  function splitDenom(denom) {
    var d = String(denom || "").trim();
    var m = d.match(/^(\$?\s*[\d½¼¾]+(?:[\/.,]\d+)?)\s*(.*)$/);
    if (m) return { big: m[1].replace(/\s+/g, ""), unit: (m[2] || "").replace(/[()]/g, "").trim() };
    return { big: "", unit: d };
  }
  function ozOf(text) {
    var m = String(text || "").match(/(\d+\/\d+|\d+(?:\.\d+)?)\s*(?:troy\s*)?(oz|ounce)/i);
    if (!m) return null;
    var p = m[1].split("/");
    return p.length === 2 ? (+p[0] / +p[1]) : +p[0];
  }
  function purityOf(text) { var m = String(text || "").match(/(\.\d{3,4}|999[.,]9|\b\d{2}K\b)/); return m ? m[1] : ""; }
  function designNameOf(rec) {
    var parts = String(rec.label || "").split("·").map(function (s) { return s.trim(); });
    var out = parts.filter(function (p, i) {
      if (i === 0) return false;
      if (/^\d{4}/.test(p) || /\boz\b|×|^\d+\s*g$/i.test(p) || /^\.\d+/.test(p)) return false;
      return true;
    }).join(" ").replace(/\b(1 oz|oz|silver|gold|BU|round|rounds)\b/gi, "").replace(/\s+/g, " ").trim();
    return out;
  }
  function coinSpecFor(rec, variant) {
    var ap = appearanceFor(rec), k = kindOf(rec), oz = ozOf(rec.label) || ozOf(rec.denom);
    var spec = {
      seed: hash(recKey(rec) + (variant || "")),
      metal: ap.metal, ring: ap.ring || null,
      finish: "circ", edge: "plain", d: 2.4, t: 0.16,
      legend: String(rec.country || "").toUpperCase(),
      year: /^\d{4}/.test(String(rec.year || "")) ? String(rec.year).slice(0, 4) : "",
      mint: (rec.mint && String(rec.mint).length <= 3 && !/^n\/?a$/i.test(rec.mint)) ? String(rec.mint) : "",
      center: String(rec.iso || rec.country || "").toUpperCase().slice(0, 3),
      motif: hash(rec.iso || rec.country) % 3,
      security: null
    };
    var dn = splitDenom(rec.denom);
    spec.big = dn.big; spec.unit = dn.unit.toUpperCase();
    if (k === "flip") {
      if (ap.metal === "silver" || ap.metal === "cuni" || ap.metal === "steel" || ap.ring) spec.edge = "reeded";
      if (ap.metal === "silver" && rec.asw_oz) spec.d = 2.4 + Math.min(1.4, rec.asw_oz * 2.6);
      if (spec.legend.length > 22) spec.legend = spec.legend.slice(0, 22);
    } else {
      var txt = [rec.metal, rec.notes].join(" ");
      spec.finish = /proof/i.test(rec.metal || "") ? "proof" : "bu";
      spec.edge = "reeded";
      oz = oz || 1;
      spec.d = ap.metal === "gold" ? (oz <= 0.1 ? 1.65 : (oz <= 0.25 ? 2.2 : 3.26)) : (oz <= 0.25 ? 2.7 : (oz <= 0.5 ? 3.2 : 3.9));
      spec.t = oz <= 0.1 ? 0.12 : (oz <= 0.25 ? 0.18 : 0.29);
      spec.security = /radial/i.test(txt) ? "radial" : (/wave|guilloch/i.test(txt) ? "waves" : null);
      var name = designNameOf(rec).toUpperCase();
      spec.legend = (name || String(rec.country || "")).toUpperCase().slice(0, 26);
      spec.center = String(rec.country || "").toUpperCase().slice(0, 4);
      var pur = purityOf(rec.metal);
      spec.big = oz >= 1 ? "1 OZ" : (oz === 0.25 ? "¼ OZ" : (oz === 0.1 ? "1/10 OZ" : (oz ? oz + " OZ" : "")));
      spec.unit = (ap.metal === "gold" ? "FINE GOLD" : "FINE SILVER") + (pur ? " " + pur : "");
      spec.mint = "";
    }
    return spec;
  }

  // ---------------------------------------------------------------------------------------------
  // Canvas painting: colour + roughness + relief maps painted together (as the splash coin does)
  // ---------------------------------------------------------------------------------------------
  var FINISH = {
    proof: { field: 0.05, dev: 0.46, bump: 0.2 },
    bu:    { field: 0.2,  dev: 0.3,  bump: 0.26 },
    circ:  { field: 0.3, dev: 0.24, bump: 0.3 }
  };
  function paintCoinFace(spec, side, S) {
    var cv = [mk(S), mk(S), mk(S)];
    var g = cv[0].getContext("2d"), r = cv[1].getContext("2d"), b = cv[2].getContext("2d");
    var C = S / 2, R = S / 2, fin = FINISH[spec.finish] || FINISH.circ, rand = rng(spec.seed + (side === "rev" ? 7 : 0));
    var M = METALS[spec.metal] || METALS.cuni, RING = spec.ring ? METALS[spec.ring] : null;

    function metalDisc(ctx, m, rad) {
      var gr = ctx.createRadialGradient(C * 0.78, C * 0.7, rad * 0.05, C, C, rad);
      gr.addColorStop(0, mixHex(m.base, m.hi, 0.35)); gr.addColorStop(0.6, m.base); gr.addColorStop(1, mixHex(m.base, m.lo, 0.35));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(C, C, rad, 0, 7); ctx.fill();
    }
    g.fillStyle = (RING || M).base; g.fillRect(0, 0, S, S);
    if (RING) { metalDisc(g, RING, R); metalDisc(g, M, R * 0.64); } else metalDisc(g, M, R);
    r.fillStyle = gray(fin.field); r.fillRect(0, 0, S, S);
    b.fillStyle = gray(fin.bump); b.fillRect(0, 0, S, S);

    // Field texture before devices: cartwheel luster (BU), security lines (bullion), wear (circulated)
    r.save(); r.translate(C, C);
    if (spec.finish === "bu") {
      for (var i = 0; i < 360; i++) { var a = i / 360 * Math.PI * 2; r.strokeStyle = "rgba(255,255,255," + (0.03 + (i % 4) * 0.012) + ")"; r.lineWidth = S / 700; r.beginPath(); r.moveTo(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1); r.lineTo(Math.cos(a) * R, Math.sin(a) * R); r.stroke(); }
    }
    r.restore();
    if (spec.security) {
      [r, b].forEach(function (ctx, li) {
        ctx.save(); ctx.translate(C, C); ctx.lineWidth = S / 900;
        ctx.strokeStyle = li === 0 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.22)";
        if (spec.security === "radial") {
          for (var i = 0; i < 420; i++) { var a = i / 420 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); ctx.lineTo(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93); ctx.stroke(); }
        } else {
          for (var k = 0; k < 34; k++) { ctx.beginPath(); for (var t = 0; t <= 200; t++) { var aa = t / 200 * Math.PI * 2, rr = R * (0.22 + k * 0.021) + Math.sin(aa * 12 + k) * S * 0.004; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.stroke(); }
        }
        ctx.restore();
      });
    }

    // Layered drawing: each call paints the same shape on colour, roughness and bump layers.
    var devTint = spec.finish === "proof" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)";
    var L = [
      { c: g, dev: devTint, field: "rgba(0,0,0,0.22)" },
      { c: r, dev: gray(fin.dev), field: gray(Math.max(0.03, fin.field - 0.04)) },
      { c: b, dev: "#ffffff", field: gray(0.06) }
    ];
    function each(mode, fn) { L.forEach(function (l) { l.c.fillStyle = l.c.strokeStyle = l[mode]; fn(l.c); }); }
    function ring(rad, w, mode) { each(mode || "dev", function (c) { c.lineWidth = w; c.beginPath(); c.arc(C, C, rad, 0, 7); c.stroke(); }); }
    function beads(rad, n, size) { each("dev", function (c) { for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; c.beginPath(); c.arc(C + Math.cos(a) * rad, C + Math.sin(a) * rad, size, 0, 7); c.fill(); } }); }
    function arcText(text, rad, px, bottom) {
      if (!text) return;
      each("dev", function (c) {
        c.font = "600 " + px + "px " + SERIF; c.textAlign = "center"; c.textBaseline = "middle";
        var track = px * 0.14, widths = [], total = 0;
        for (var i = 0; i < text.length; i++) { var w = c.measureText(text[i]).width + track; widths.push(w); total += w; }
        var span = Math.min(total / rad, Math.PI * 1.25), scale = span / (total / rad), acc = 0;
        for (var j = 0; j < text.length; j++) {
          var mid = (acc + widths[j] / 2) / rad * scale; acc += widths[j];
          var a = bottom ? (Math.PI / 2 + span / 2 - mid) : (-Math.PI / 2 - span / 2 + mid);
          c.save(); c.translate(C + Math.cos(a) * rad, C + Math.sin(a) * rad); c.rotate(bottom ? a - Math.PI / 2 : a + Math.PI / 2); c.fillText(text[j], 0, 0); c.restore();
        }
      });
    }
    function centerText(text, y, px, maxW, weight) {
      if (!text) return;
      each("dev", function (c) { fitFont(c, text, maxW, px, weight || 600); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, C, y); });
    }
    function laurel(rad, fromA, toA, leaves, size) {
      each("dev", function (c) {
        for (var side = -1; side <= 1; side += 2) {
          for (var k = 0; k < leaves; k++) {
            var t = k / (leaves - 1), a = Math.PI / 2 - side * (fromA + t * (toA - fromA));
            var px = C + Math.cos(a) * rad, py = C + Math.sin(a) * rad;
            c.save(); c.translate(px, py); c.rotate(a + (side < 0 ? Math.PI / 2 : -Math.PI / 2) + side * 0.55);
            c.beginPath(); c.ellipse(0, 0, size * (0.34 + (1 - t) * 0.2), size * (1 - t * 0.2), 0, 0, 7); c.fill(); c.restore();
          }
          c.lineWidth = size * 0.16; c.beginPath();
          c.arc(C, C, rad, Math.PI / 2 - side * fromA, Math.PI / 2 - side * toA, side > 0); c.stroke();
        }
      });
    }

    ring(R * 0.985, S * 0.012);
    var beaded = spec.finish !== "circ" || (spec.seed % 2 === 0);
    if (beaded) beads(R * 0.935, Math.round(96 + (spec.seed % 5) * 8), S * 0.0055);
    if (RING) ring(R * 0.64, S * 0.008, "field");

    if (side !== "rev") {
      arcText(spec.legend, R * 0.8, Math.round(S * 0.074), false);
      if (spec.year) arcText(spec.year, R * 0.8, Math.round(S * 0.072), true);
      var motif = spec.motif;
      if (motif === 0) {
        laurel(R * 0.52, 0.28, 2.35, 13, S * 0.03);
        centerText(spec.center, C, Math.round(S * 0.2), R * 0.72, 700);
      } else if (motif === 1) {
        each("dev", function (c) {
          var w = R * 0.62, h = R * 0.74, x0 = C - w / 2, y0 = C - h * 0.52;
          c.lineWidth = S * 0.012; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + w, y0); c.lineTo(x0 + w, y0 + h * 0.55);
          c.quadraticCurveTo(x0 + w, y0 + h * 0.92, C, y0 + h); c.quadraticCurveTo(x0, y0 + h * 0.92, x0, y0 + h * 0.55); c.closePath(); c.stroke();
          c.beginPath(); c.moveTo(x0 + w * 0.08, y0 + h * 0.62); c.lineTo(C, y0 + h * 0.34); c.lineTo(x0 + w * 0.92, y0 + h * 0.62); c.lineWidth = S * 0.03; c.stroke();
        });
        centerText(spec.center, C - R * 0.2, Math.round(S * 0.085), R * 0.5, 700);
        each("dev", function (c) { for (var i = 0; i < 3; i++) { var px = C + (i - 1) * R * 0.17, py = C + R * 0.2 + (i === 1 ? R * 0.08 : 0); star(c, px, py, S * 0.022); } });
      } else {
        each("dev", function (c) {
          for (var i = 0; i < 40; i++) { var a = i / 40 * Math.PI * 2, lg = i % 2 === 0, r0 = R * 0.3, r1 = R * (lg ? 0.62 : 0.52), hw = lg ? 0.03 : 0.022; c.beginPath(); c.moveTo(C + Math.cos(a - hw) * r0, C + Math.sin(a - hw) * r0); c.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); c.lineTo(C + Math.cos(a + hw) * r0, C + Math.sin(a + hw) * r0); c.closePath(); c.fill(); }
          c.beginPath(); c.arc(C, C, R * 0.3, 0, 7); c.fill();
        });
        each("field", function (c) { fitFont(c, spec.center, R * 0.48, Math.round(S * 0.13), 700); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(spec.center, C, C + S * 0.006); });
      }
    } else {
      var hasBig = !!spec.big;
      if (hasBig) {
        centerText(spec.big, C - R * 0.12, Math.round(S * (spec.big.length > 3 ? 0.2 : 0.3)), R * 1.0, 700);
        centerText(spec.unit, C + R * 0.2, Math.round(S * 0.07), R * 1.05, 600);
      } else {
        var words = spec.unit.split(/\s+/), lines = [], cur = "";
        words.forEach(function (w) { if ((cur + " " + w).trim().length > 12) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
        if (cur) lines.push(cur); lines = lines.slice(0, 3);
        lines.forEach(function (ln, i) { centerText(ln, C + (i - (lines.length - 1) / 2) * S * 0.1, Math.round(S * 0.085), R * 1.1, 600); });
      }
      if (spec.finish === "circ") laurel(R * 0.7, 0.55, 1.95, 11, S * 0.026);
      else arcText(spec.legend, R * 0.8, Math.round(S * 0.062), false);
      if (spec.finish !== "circ" && spec.year) arcText(spec.year, R * 0.8, Math.round(S * 0.062), true);
      if (spec.mint) centerText(spec.mint, C + R * 0.44, Math.round(S * 0.06), R * 0.3, 700);
      each("dev", function (c) { star(c, C, C - R * 0.56, S * 0.02); });
    }

    // Circulation: toning towards the rim, scattered contact marks and hairlines.
    if (spec.finish === "circ") {
      var tone = g.createRadialGradient(C, C, R * 0.45, C, C, R);
      var warm = /copper|bronze/.test(spec.metal);
      tone.addColorStop(0, "rgba(0,0,0,0)"); tone.addColorStop(1, warm ? "rgba(58,26,10,0.36)" : "rgba(40,36,28,0.12)");
      g.fillStyle = tone; g.fillRect(0, 0, S, S);
      for (var s = 0; s < 40; s++) {
        var x = C + (rand() - 0.5) * S * 0.9, y = C + (rand() - 0.5) * S * 0.9, rad = S * (0.01 + rand() * 0.05);
        var sp = g.createRadialGradient(x, y, 0, x, y, rad);
        sp.addColorStop(0, warm ? "rgba(60,25,8,0.12)" : "rgba(30,30,24,0.08)"); sp.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = sp; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      r.strokeStyle = "rgba(255,255,255,0.14)"; b.strokeStyle = "rgba(0,0,0,0.05)";
      for (var h = 0; h < 45; h++) {
        var x1 = rand() * S, y1 = rand() * S, ang = rand() * Math.PI, len = S * (0.01 + rand() * 0.04);
        [r, b].forEach(function (ctx) { ctx.lineWidth = S / 2000; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len); ctx.stroke(); });
      }
    }
    return cv;
  }
  function star(c, x, y, rad) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? rad * 0.45 : rad; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }

  // ---------------------------------------------------------------------------------------------
  // Scene state
  // ---------------------------------------------------------------------------------------------
  var ST = {
    open: false, built: false, failed: false,
    renderer: null, scene: null, camera: null, controls: null, env: null,
    lights: {}, room: {}, maxAniso: 1,
    specimen: null,        // { root, rec, halfH, radius, box }
    pieces: [],            // laid pieces [{ key, rec, wrap }]
    rec: null, format: "flip", lighting: "gallery", view: "specimen",
    raf: null, running: false, needs: 0, lastT: 0,
    offs: [], ro: null,
    dpr: 1, dprMin: 0.75, perf: [], perfDone: false,
    drag: null, spin: { yaw: 0, pitch: 0 }, snap: null, lift: 0,
    tweens: [], lastFocus: null, arStream: null, arOn: false,
    shared: {}, hintShown: false
  };
  var MAT_TOP = 0.5;       // velvet pad top surface (table top at y = 0)
  var PLINTH_H = 0.9;
  var SPEC_Z = 6;          // where the plinth sits on the pad

  function on(t, type, fn, opt) { t.addEventListener(type, fn, opt); ST.offs.push(function () { t.removeEventListener(type, fn, opt); }); }
  function wake(frames) {
    ST.needs = Math.max(ST.needs, frames || 2);
    if (!ST.running && ST.open && ST.renderer && !document.hidden) { ST.running = true; ST.lastT = performance.now(); ST.raf = requestAnimationFrame(tick); }
  }

  function canvasTex(canvas, srgb, opts) {
    var t = new THREE.CanvasTexture(canvas);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = Math.min(ST.maxAniso, (opts && opts.aniso) || 8);
    if (opts && opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    return t;
  }

  // ---------------------------------------------------------------------------------------------
  // Environment (reflections) and the room
  // ---------------------------------------------------------------------------------------------
  function buildEnvironment() {
    var c = mk(1024, 512), x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#2e2820"); g.addColorStop(0.3, "#4d4234"); g.addColorStop(0.48, "#6e5d47"); g.addColorStop(0.53, "#3a2616"); g.addColorStop(1, "#0b0705");
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    if (x.filter !== undefined) x.filter = "blur(9px)";
    function box(x0, y0, w, h, col) { x.fillStyle = col; x.fillRect(x0, y0, w, h); }
    box(330, 10, 360, 96, "#fff8ec");       // overhead lamp softbox
    box(70, 100, 200, 230, "#ffeccc");      // key softbox (left)
    box(730, 90, 90, 250, "#e2eaff");       // cool strip (right) for edge contrast
    box(880, 150, 110, 120, "#a89a86");     // pale wall panel
    box(520, 150, 120, 60, "#8d7350");      // distant warm wall wash
    box(0, 256, 1024, 12, "#a07a40");       // horizon glow
    box(0, 290, 1024, 60, "#3a1f10");       // mahogany bounce
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
    var pm = new THREE.PMREMGenerator(ST.renderer);
    var rt = pm.fromEquirectangular(tex);
    tex.dispose(); pm.dispose();
    ST.env = rt;
    ST.scene.environment = rt.texture;
  }

  function valueNoise(seed) {
    var P = new Uint8Array(512), r = rng(seed);
    for (var i = 0; i < 256; i++) P[i] = i;
    for (var j = 255; j > 0; j--) { var k = Math.floor(r() * (j + 1)), t = P[j]; P[j] = P[k]; P[k] = t; }
    for (var m = 0; m < 256; m++) P[m + 256] = P[m];
    var V = new Float32Array(256); for (var n = 0; n < 256; n++) V[n] = r();
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var X = xi & 255, Y = yi & 255;
      var a = V[P[P[X] + Y]], bq = V[P[P[X + 1] + Y]], cq = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]];
      return a + (bq - a) * u + (cq - a) * v + (a - bq - cq + d) * u * v;
    };
  }

  function paintWood(W, H) {
    var col = mk(W, H), rough = mk(W, H);
    var gc = col.getContext("2d"), rc = rough.getContext("2d");
    var ci = gc.createImageData(W, H), ri = rc.createImageData(W, H), cd = ci.data, rd = ri.data;
    var n1 = valueNoise(11), n2 = valueNoise(23), n3 = valueNoise(37);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        // grain runs along X; rings are warped bands in Y
        var warp = n1(x * 0.003, y * 0.012) * 60 + n2(x * 0.02, y * 0.08) * 5;
        var ring = Math.pow(Math.sin((y + warp) * 0.11 + n3(x * 0.002, y * 0.004) * 6) * 0.5 + 0.5, 1.6);
        var fine = n3(x * 0.6, y * 0.9);
        var fig = n2(x * 0.012, y * 0.012);
        var v = 0.6 + ring * 0.2 + fig * 0.24 - fine * 0.12;
        var i = (y * W + x) * 4;
        cd[i] = 64 * v + 22; cd[i + 1] = 28 * v + 8; cd[i + 2] = 14 * v + 4; cd[i + 3] = 255;
        var pore = fine > 0.8 ? 1 : 0;
        var rr = 60 + ring * 30 + pore * 70;
        rd[i] = rd[i + 1] = rd[i + 2] = rr; rd[i + 3] = 255;
      }
    }
    gc.putImageData(ci, 0, 0); rc.putImageData(ri, 0, 0);
    return { col: col, rough: rough };
  }

  function paintVelvet(W, H) {
    var c = mk(W, H), x = c.getContext("2d");
    var g = x.createRadialGradient(W / 2, H / 2, W * 0.05, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, "#161d3d"); g.addColorStop(1, "#0b0f22");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // velvet nap: a 256 px noise tile repeated (cheap), plus a few broad crush marks
    var tile = mk(256), tx = tile.getContext("2d"), id = tx.createImageData(256, 256), d = id.data, r = rng(5), n = valueNoise(3);
    for (var ty = 0; ty < 256; ty++) for (var txx = 0; txx < 256; txx++) {
      var i = (ty * 256 + txx) * 4, k = (r() - 0.5) * 34 + (n(txx * 0.05, ty * 0.05) - 0.5) * 20;
      var v = k > 0 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.min(255, Math.abs(k) * 1.4);
    }
    tx.putImageData(id, 0, 0);
    x.save(); x.globalAlpha = 0.16; x.fillStyle = x.createPattern(tile, "repeat"); x.fillRect(0, 0, W, H); x.restore();
    for (var cmk = 0; cmk < 14; cmk++) {
      var cx = r() * W, cy = r() * H, cr = W * (0.04 + r() * 0.08), cg = x.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cg.addColorStop(0, r() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.06)"); cg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = cg; x.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    }
    // saddle-stitched gold border, 1.6 cm in from the edge (texture spans the 64 x 42 cm pad)
    var inset = W * (1.6 / 64);
    x.save(); x.setLineDash([W * 0.007, W * 0.005]); x.lineCap = "round";
    x.strokeStyle = "rgba(0,0,0,0.45)"; x.lineWidth = W * 0.0028; x.strokeRect(inset + 1, inset + 2, W - 2 * inset, H - 2 * inset);
    x.strokeStyle = "#c9a54e"; x.lineWidth = W * 0.0022; x.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset);
    x.restore();
    return c;
  }

  function roundedRect(w, h, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  // Rounded slab lying flat: footprint w (x) by d (z), thickness h (y); top at y = h
  function roundedSlabGeo(w, d, h, r, bevel, curveSeg) {
    var b = Math.min(bevel, h * 0.45);
    var geo = new THREE.ExtrudeGeometry(roundedRect(w - 2 * b, d - 2 * b, Math.max(0.01, r - b)), { depth: Math.max(0.001, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: curveSeg || 8 });
    geo.translate(0, 0, b); geo.rotateX(-Math.PI / 2);   // extrusion (+Z) becomes +Y
    return geo;
  }

  function buildRoom() {
    var small = isSmallScreen();
    // Table
    var wood = paintWood(small ? 512 : 1024, small ? 256 : 512);
    var woodMap = canvasTex(wood.col, true, { repeat: [1 / 70, 1 / 70], aniso: 8 });
    var woodRough = canvasTex(wood.rough, false, { repeat: [1 / 70, 1 / 70] });
    var tableGeo = new THREE.ExtrudeGeometry(roundedRect(136, 86, 4), { depth: 3, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 4, curveSegments: 10 });
    tableGeo.rotateX(-Math.PI / 2); tableGeo.translate(0, -3.6, 0);
    var tableMat = new THREE.MeshPhysicalMaterial({ map: woodMap, roughnessMap: woodRough, roughness: 1, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.22, envMapIntensity: 0.55 });
    var table = new THREE.Mesh(tableGeo, tableMat);
    table.receiveShadow = true;
    ST.scene.add(table);

    // Velvet pad (64 x 42 cm, 5 mm thick)
    var velvet = canvasTex(paintVelvet(small ? 1024 : 1600, small ? 672 : 1050), true, { aniso: 8 });
    velvet.repeat.set(1 / 64, 1 / 42); velvet.offset.set(0.5, 0.5);
    var padGeo = new THREE.ExtrudeGeometry(roundedRect(63.6, 41.6, 1.2), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 3, curveSegments: 8 });
    padGeo.rotateX(-Math.PI / 2); padGeo.translate(0, 0.2, 0);
    var padMat = new THREE.MeshPhysicalMaterial({ map: velvet, roughness: 1, metalness: 0, envMapIntensity: 0.25, sheen: new THREE.Color(0x0d1226) });
    var pad = new THREE.Mesh(padGeo, padMat);
    pad.receiveShadow = true;
    ST.scene.add(pad);
    ST.room = { table: table, pad: pad };

    // Acrylic plinth for the piece under examination
    var plinthMat = acrylicMaterial(0.35);
    var plinth = new THREE.Mesh(roundedSlabGeo(1, 1, PLINTH_H, 0.12, 0.08, 6), plinthMat);
    plinth.position.set(0, MAT_TOP, SPEC_Z);
    plinth.renderOrder = 3;
    ST.scene.add(plinth);
    ST.room.plinth = plinth;
  }

  function buildLights() {
    var L = ST.lights;
    L.hemi = new THREE.HemisphereLight(0xfff0d8, 0x1a0f08, 0.35);
    ST.scene.add(L.hemi);
    L.key = new THREE.SpotLight(0xffe2b8, 1.6, 0, Math.PI / 7, 0.65, 1);
    L.key.position.set(-22, 70, 42);
    L.key.target.position.set(0, 2, 2);
    L.key.castShadow = true;
    var sm = isSmallScreen() ? 1024 : 2048;
    L.key.shadow.mapSize.set(sm, sm);
    L.key.shadow.camera.near = 40; L.key.shadow.camera.far = 130;
    L.key.shadow.bias = -0.0004; L.key.shadow.radius = isSmallScreen() ? 2 : 4;
    ST.scene.add(L.key); ST.scene.add(L.key.target);
    L.rim = new THREE.DirectionalLight(0xa9bcff, 0.45);
    L.rim.position.set(40, 30, -50);
    ST.scene.add(L.rim);
    L.fill = new THREE.DirectionalLight(0xffd9a8, 0.25);
    L.fill.position.set(35, 20, 40);
    ST.scene.add(L.fill);
  }

  function applyLighting(mode) {
    ST.lighting = mode;
    var L = ST.lights; if (!L.key) return;
    var envScale = 1;
    if (mode === "loupe") {
      L.key.color.setHex(0xffffff); L.key.intensity = 1.9; L.key.position.set(-8, 72, 30); L.key.angle = Math.PI / 6;
      L.hemi.color.setHex(0xf4f8ff); L.hemi.intensity = 0.55; L.rim.intensity = 0.35; L.fill.intensity = 0.45;
      ST.renderer.toneMappingExposure = 1.12; envScale = 1.25;
    } else if (mode === "raking") {
      L.key.color.setHex(0xffd49a); L.key.intensity = 2.6; L.key.position.set(-70, 7, 12); L.key.angle = Math.PI / 5;
      L.hemi.color.setHex(0x3a3140); L.hemi.intensity = 0.07; L.rim.intensity = 0.12; L.fill.intensity = 0;
      ST.renderer.toneMappingExposure = 1.05; envScale = 0.3;
    } else {
      L.key.color.setHex(0xffe2b8); L.key.intensity = 1.6; L.key.position.set(-22, 70, 42); L.key.angle = Math.PI / 7;
      L.hemi.color.setHex(0xfff0d8); L.hemi.intensity = 0.35; L.rim.intensity = 0.45; L.fill.intensity = 0.25;
      ST.renderer.toneMappingExposure = 1.08; envScale = 1;
    }
    ST.envScale = envScale;
    ST.scene.traverse(function (o) {
      if (!o.material) return;
      var m = o.material;
      if (m.userData.env0 == null) m.userData.env0 = m.envMapIntensity == null ? 1 : m.envMapIntensity;
      m.envMapIntensity = m.userData.env0 * envScale;
    });
    wake(3);
  }

  // ---------------------------------------------------------------------------------------------
  // Shared resources (built once per open, disposed on close)
  // ---------------------------------------------------------------------------------------------
  function shared(name, make) { if (!ST.shared[name]) ST.shared[name] = make(); return ST.shared[name]; }
  function blobTexture() {
    return shared("blob", function () {
      var c = mk(128), x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,0.85)"); g.addColorStop(0.45, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    });
  }
  function reedTexture(bandFrom, bandTo, reeds) {
    return shared("reed" + reeds + "_" + bandFrom.toFixed(3), function () {
      var W = 2048, H = 104, c = mk(W, H), x = c.getContext("2d");
      x.fillStyle = "#808080"; x.fillRect(0, 0, W, H);
      var y0 = Math.round((1 - bandTo) * H), y1 = Math.round((1 - bandFrom) * H), step = W / reeds;
      for (var i = 0; i < reeds; i++) {
        var gx = x.createLinearGradient(i * step, 0, (i + 1) * step, 0);
        gx.addColorStop(0, "#202020"); gx.addColorStop(0.5, "#f2f2f2"); gx.addColorStop(1, "#202020");
        x.fillStyle = gx; x.fillRect(i * step, y0, step, y1 - y0);
      }
      return new THREE.CanvasTexture(c);
    });
  }
  function paperTexture() {
    return shared("paper", function () {
      var c = mk(256), x = c.getContext("2d");
      x.fillStyle = "#efebe2"; x.fillRect(0, 0, 256, 256);
      var id = x.getImageData(0, 0, 256, 256), d = id.data, r = rng(9);
      for (var i = 0; i < d.length; i += 4) { var k = (r() - 0.5) * 9; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
      x.putImageData(id, 0, 0);
      x.strokeStyle = "rgba(120,110,90,0.08)";
      for (var f = 0; f < 60; f++) { x.beginPath(); var sx = r() * 256, sy = r() * 256; x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 30, sy + (r() - 0.5) * 30); x.stroke(); }
      var t = canvasTex(c, true, { repeat: [1 / 5, 1 / 5] });
      return t;
    });
  }
  function acrylicMaterial(opacity) {
    // Clear plastic: almost no diffuse (black albedo), so it only adds reflections and a faint tint.
    return new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: opacity == null ? 0.14 : opacity, envMapIntensity: 2.2, depthWrite: false });
  }
  function noExport(mesh) { mesh.userData.noExport = true; mesh.castShadow = false; mesh.renderOrder = 2; return mesh; }

  // ---------------------------------------------------------------------------------------------
  // Piece builders. Standing pieces face +Z, centred on the origin.
  // ---------------------------------------------------------------------------------------------
  function buildCoin(spec, res, faces) {
    var R = spec.d / 2, T = spec.t, w = R * 0.075, hr = Math.min(T * 0.14, 0.03), hf = T / 2 - hr, c = Math.min(T * 0.24, 0.04);
    var V = function (x, y) { return new THREE.Vector2(x, y); };
    var pts = [V(R - w, -hf), V(R - w * 0.72, -(hf + hr)), V(R - c, -(hf + hr))];
    var i, a;
    for (i = 1; i <= 4; i++) { a = -Math.PI / 2 + i / 4 * Math.PI / 2; pts.push(V(R - c + Math.cos(a) * c, -(hf + hr) + c + Math.sin(a) * c)); }
    pts.push(V(R, (hf + hr) - c));
    for (i = 1; i <= 4; i++) { a = i / 4 * Math.PI / 2; pts.push(V(R - c + Math.cos(a) * c, (hf + hr) - c + Math.sin(a) * c)); }
    pts.push(V(R - w * 0.72, hf + hr)); pts.push(V(R - w, hf));
    var n = pts.length, seg = res >= 512 ? 160 : 72;
    var bodyGeo = new THREE.LatheGeometry(pts, seg);
    bodyGeo.rotateX(Math.PI / 2);
    var edgeM = METALS[spec.ring || spec.metal] || METALS.cuni;
    var bodyMat = new THREE.MeshStandardMaterial({ color: lin(edgeM.base), metalness: 1, roughness: edgeM.edgeRough, envMapIntensity: 1.3 });
    if (spec.edge === "reeded") {
      bodyMat.bumpMap = reedTexture(6 / (n - 1), 7 / (n - 1), Math.round(clamp(spec.d * 50, 80, 200)));
      bodyMat.bumpScale = 0.35;
    }
    var coin = new THREE.Group();
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true; body.receiveShadow = true;
    coin.add(body);

    function faceMat(cv) {
      var map = canvasTex(cv[0], true), rough = canvasTex(cv[1], false), bump = canvasTex(cv[2], false);
      return new THREE.MeshStandardMaterial({ map: map, roughnessMap: rough, roughness: 1, metalness: 1, bumpMap: bump, bumpScale: res >= 512 ? 0.9 : 0.6, envMapIntensity: 1.8 });
    }
    function plainMat() {
      var M = METALS[spec.metal] || METALS.cuni;
      return new THREE.MeshStandardMaterial({ color: lin(M.base), metalness: 1, roughness: M.rough + 0.1, envMapIntensity: 1.2 });
    }
    var faceGeo = new THREE.CircleGeometry(R - w + 0.002, seg);
    var obv = new THREE.Mesh(faceGeo, faces === "none" ? plainMat() : faceMat(paintCoinFace(spec, "obv", res)));
    obv.position.z = hf; obv.castShadow = true;
    coin.add(obv);
    var rev = new THREE.Mesh(faceGeo, faces === "obv" || faces === "none" ? plainMat() : faceMat(paintCoinFace(spec, "rev", res)));
    rev.position.z = -hf; rev.rotation.y = Math.PI; rev.castShadow = true;
    coin.add(rev);
    coin.userData.size = { w: spec.d, h: spec.d, t: spec.t };
    return coin;
  }

  function labelCanvas(W, H, paint) { var c = mk(W, H), x = c.getContext("2d"); paint(x, W, H); return c; }
  function slabLabelFront(rec) {
    return labelCanvas(1140, 400, function (x, W, H) {
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#f7f2e6"); g.addColorStop(1, "#ece4d0");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = "#b08d3a"; x.lineWidth = 6; x.strokeRect(14, 14, W - 28, H - 28);
      x.lineWidth = 1.5; x.strokeRect(26, 26, W - 52, H - 52);
      x.fillStyle = "#8a6a22"; x.font = "600 30px " + SANS; x.textBaseline = "alphabetic";
      x.fillText("TITAN RELIQUARY", 60, 82);
      x.textAlign = "right"; x.fillText(String(rec.ser || rec.scan || ""), W - 60, 82); x.textAlign = "left";
      x.fillStyle = "#1d1812";
      fitFont(x, titleOf(rec), W - 120, 76, 700); x.fillText(titleOf(rec), 60, 190);
      x.fillStyle = "#4a4236"; x.font = "500 34px " + SANS;
      var meta = [rec.mint ? "Mint " + rec.mint : "", rec.scan ? "Scan " + rec.scan : "", rec.added ? "Logged " + rec.added : ""].filter(Boolean).join("   ·   ");
      fitFont(x, meta, W - 120, 34, 500, SANS); x.fillText(meta, 60, 262);
      var v = [rec.asw_oz ? rec.asw_oz + " oz ASW" : "", rec.est != null ? "Est. $" + Number(rec.est).toFixed(2) : "", rec.status || ""].filter(Boolean).join("   ·   ");
      x.fillStyle = "#7a6a45"; fitFont(x, v, W - 120, 30, 500, SANS); x.fillText(v, 60, 328);
    });
  }
  function slabLabelBack(rec) {
    return labelCanvas(1140, 400, function (x, W, H) {
      x.fillStyle = "#1b1712"; x.fillRect(0, 0, W, H);
      x.strokeStyle = "#b08d3a"; x.lineWidth = 3; x.strokeRect(20, 20, W - 40, H - 40);
      x.fillStyle = "#d9c38a"; x.textAlign = "center"; x.font = "600 44px " + SERIF;
      x.fillText("Titan Reliquary", W / 2, 150);
      x.font = "500 32px " + MONO; x.fillStyle = "#b9ab8a";
      x.fillText([rec.ser, rec.scan].filter(Boolean).join("  ·  "), W / 2, 225);
      if (rec.face) { x.font = "500 28px " + SANS; x.fillText(String(rec.face).slice(0, 60), W / 2, 290); }
    });
  }

  function buildSlab(rec, spec, res) {
    var g = new THREE.Group(), W = 6.35, H = 8.6, D = 0.95;
    var shell = new THREE.Mesh(roundedSlabGeo(W, H, D, 0.35, 0.09, 10), acrylicMaterial(0.16));
    shell.rotation.x = Math.PI / 2; shell.position.z = -D / 2;  // lying geo → standing (thickness along z)
    g.add(noExport(shell));
    // raised inner frame so the shell reads as moulded plastic
    var frameShape = roundedRect(W - 0.5, H - 0.5, 0.26), hole = roundedRect(W - 1.0, H - 1.0, 0.18);
    frameShape.holes.push(hole);
    var frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: D + 0.02, bevelEnabled: false, curveSegments: 8 });
    frameGeo.translate(0, 0, -(D + 0.02) / 2);
    g.add(noExport(new THREE.Mesh(frameGeo, acrylicMaterial(0.3))));
    // label
    var labelH = 2.05, labelY = H / 2 - 0.45 - labelH / 2;
    var lf = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.9, labelH), new THREE.MeshStandardMaterial({ map: canvasTex(slabLabelFront(rec), true), roughness: 0.62, metalness: 0 }));
    lf.position.set(0, labelY, 0.06); g.add(lf);
    var lb = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.9, labelH), new THREE.MeshStandardMaterial({ map: canvasTex(slabLabelBack(rec), true), roughness: 0.5, metalness: 0 }));
    lb.position.set(0, labelY, -0.06); lb.rotation.y = Math.PI; g.add(lb);
    // insert: a frosted ring holding the coin by its edge
    var coinY = -0.95, coinR = spec.d / 2;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(coinR + 0.12, 0.1, 12, 72), new THREE.MeshStandardMaterial({ color: lin("#6f757c"), roughness: 0.35, metalness: 0, envMapIntensity: 0.8 }));
    ring.position.y = coinY; ring.castShadow = true; g.add(ring);
    var coin = buildCoin(spec, res);
    coin.position.y = coinY; g.add(coin);
    g.userData.size = { w: W, h: H, t: D };
    return g;
  }

  function flipDecal(text1, text2, W, H, mono) {
    return labelCanvas(1024, Math.round(1024 * H / W), function (x, cw, ch) {
      x.fillStyle = "#efebe2"; x.fillRect(0, 0, cw, ch);
      x.fillStyle = "#23201a"; x.textAlign = "center"; x.textBaseline = "middle";
      if (text2) {
        fitFont(x, text1, cw * 0.92, Math.round(ch * 0.4), 600, mono ? MONO : SERIF); x.fillText(text1, cw / 2, ch * 0.3);
        x.fillStyle = "#4b453a"; fitFont(x, text2, cw * 0.92, Math.round(ch * 0.3), 500, SANS); x.fillText(text2, cw / 2, ch * 0.72);
      } else {
        fitFont(x, text1, cw * 0.92, Math.round(ch * 0.5), 600, mono ? MONO : SERIF); x.fillText(text1, cw / 2, ch * 0.52);
      }
    });
  }
  function buildFlip2x2(rec, spec, res, lite) {
    var g = new THREE.Group(), S = spec.d > 3.2 ? 6.35 : 5.08, T = Math.max(0.12, spec.t * 0.8), rw = spec.d / 2 + 0.16;
    var shape = roundedRect(S, S, 0.12);
    var holeP = new THREE.Path(); holeP.absarc(0, 0, rw, 0, Math.PI * 2, true); shape.holes.push(holeP);
    var geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: lite ? 24 : 48 });
    geo.translate(0, 0, -T / 2);
    var card = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.88, metalness: 0, envMapIntensity: 0.4 }));
    card.castShadow = true; card.receiveShadow = true; g.add(card);
    var bandH = Math.max(0.45, (S / 2 - rw) - 0.28), bandY = rw + 0.1 + bandH / 2;
    var decalMat = function (cv) { return new THREE.MeshStandardMaterial({ map: canvasTex(cv, true), roughness: 0.86, metalness: 0, envMapIntensity: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }); };
    var top = String(rec.ser || rec.scan || "");
    var line1 = [rec.country, rec.year].filter(Boolean).join(" · "), line2 = [rec.denom, rec.mint ? "Mint " + rec.mint : ""].filter(Boolean).join(" · ");
    var ft = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.5, bandH), decalMat(flipDecal(top, rec.scan && rec.ser ? rec.scan : "", S - 0.5, bandH, true)));
    ft.position.set(0, bandY, T / 2 + 0.003); g.add(ft);
    var fb = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.5, bandH), decalMat(flipDecal(line1 || titleOf(rec), line2, S - 0.5, bandH, false)));
    fb.position.set(0, -bandY, T / 2 + 0.003); g.add(fb);
    // staples: left, right and bottom (the fold is at the top)
    var stapleMat = new THREE.MeshStandardMaterial({ color: lin("#b9bdc2"), metalness: 1, roughness: 0.3 });
    var sv = new THREE.BoxGeometry(0.05, 0.9, 0.025), sh = new THREE.BoxGeometry(0.9, 0.05, 0.025);
    [[-S / 2 + 0.24, 0, sv], [S / 2 - 0.24, 0, sv], [0, -S / 2 + 0.24, sh]].forEach(function (p) {
      [1, -1].forEach(function (sd) { var m = new THREE.Mesh(p[2], stapleMat); m.position.set(p[0], p[1], sd * (T / 2 + 0.012)); g.add(m); });
    });
    // mylar windows
    var mylar = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.12, envMapIntensity: 2, depthWrite: false });
    var wGeo = new THREE.CircleGeometry(rw, lite ? 32 : 64);
    var w1 = new THREE.Mesh(wGeo, mylar); w1.position.z = T / 2 - 0.005; g.add(noExport(w1));
    var w2 = new THREE.Mesh(wGeo, mylar); w2.position.z = -T / 2 + 0.005; w2.rotation.y = Math.PI; g.add(noExport(w2));
    var coin = buildCoin(spec, res, lite ? "obv" : "both");
    g.add(coin);
    g.userData.size = { w: S, h: S, t: T };
    return g;
  }

  function buildRawCoin(rec, spec, res) { var c = buildCoin(spec, res); return c; }

  function stampCanvas(lines, metal, W, H) {
    var M = METALS[metal] || METALS.silver;
    var cv = [mk(W, H), mk(W, H), mk(W, H)];
    var g = cv[0].getContext("2d"), r = cv[1].getContext("2d"), b = cv[2].getContext("2d");
    var gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, mixHex(M.base, M.hi, 0.3)); gr.addColorStop(1, mixHex(M.base, M.lo, 0.2));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    r.fillStyle = gray(0.16); r.fillRect(0, 0, W, H);
    b.fillStyle = gray(0.5); b.fillRect(0, 0, W, H);
    var L = [{ c: g, s: "rgba(0,0,0,0.25)" }, { c: r, s: gray(0.42) }, { c: b, s: gray(0.12) }];
    L.forEach(function (l) {
      var c = l.c; c.fillStyle = c.strokeStyle = l.s; c.lineWidth = W * 0.012;
      c.strokeRect(W * 0.07, H * 0.05, W * 0.86, H * 0.9);
      c.textAlign = "center"; c.textBaseline = "middle";
      lines.forEach(function (ln, i) {
        var y = H * (0.18 + i * (0.64 / Math.max(1, lines.length - 1)));
        fitFont(c, ln.t, W * 0.78, Math.round(W * (ln.s || 0.1)), 700, ln.f === "sans" ? SANS : SERIF); c.fillText(ln.t, W / 2, y);
      });
    });
    return cv;
  }
  function buildBar(rec, opts) {
    var metal = opts.metal, W = opts.w, H = opts.h, D = opts.t, M = METALS[metal];
    var g = new THREE.Group();
    var body = new THREE.Mesh(roundedSlabGeo(W, H, D, Math.min(W, H) * 0.06, Math.min(D * 0.3, 0.08), 6), new THREE.MeshStandardMaterial({ color: lin(M.base), metalness: 1, roughness: M.rough, envMapIntensity: 1.3 }));
    body.rotation.x = Math.PI / 2; body.position.z = -D / 2; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    var cv = stampCanvas(opts.lines, metal, 512, Math.round(512 * H / W));
    var stamp = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.92), new THREE.MeshStandardMaterial({ map: canvasTex(cv[0], true), roughnessMap: canvasTex(cv[1], false), roughness: 1, metalness: 1, bumpMap: canvasTex(cv[2], false), bumpScale: 0.5, envMapIntensity: 1.4, polygonOffset: true, polygonOffsetFactor: -2 }));
    stamp.position.z = D / 2 + 0.002; g.add(stamp);
    g.userData.size = { w: W, h: H, t: D };
    return g;
  }
  function barLines(rec, metal) {
    var oz = ozOf(rec.label) || ozOf(rec.metal), grams = (String(rec.label).match(/(\d+(?:\.\d+)?)\s*g\b/) || [])[1];
    var brand = String(rec.label || "").split("·")[0].trim();
    if (/^(USA|UK|CAN|AUS|MEX)$/i.test(brand)) brand = "";
    var pur = purityOf(rec.metal) || purityOf(rec.label);
    var out = [];
    if (brand) out.push({ t: brand.toUpperCase(), s: 0.1 });
    out.push({ t: grams ? grams + " GRAM" : (oz ? (oz >= 2 ? oz + " TROY OUNCES" : oz + " TROY OZ") : ""), s: 0.11 });
    out.push({ t: (pur ? pur + " " : "") + (metal === "gold" ? "FINE GOLD" : "FINE SILVER"), s: 0.085, f: "sans" });
    return out.filter(function (l) { return l.t; });
  }

  function bullionType(rec) {
    var t = [rec.cat, rec.label, rec.parked, rec.metal].join(" ").toLowerCase();
    if (/assay/.test(t)) return "assay";
    if (/\bbars?\b/.test(t)) return (rec.qty_n || 1) > 1 ? "bars" : "bar";
    if ((rec.qty_n || 1) > 1) { if (/empty plastic tube|fanned/.test(t)) return "fanned"; if (/tube/.test(t)) return "tube"; return "stack"; }
    if (/capsule/.test(t)) return "capsule";
    return "coin";
  }
  function barOpts(rec) {
    var gold = appearanceFor(rec).metal === "gold", oz = ozOf(rec.label) || ozOf(rec.metal) || 1;
    var grams = (String(rec.label).match(/(\d+(?:\.\d+)?)\s*g\b/) || [])[1];
    var o = { metal: gold ? "gold" : "silver", lines: barLines(rec, gold ? "gold" : "silver") };
    if (grams) { o.w = 0.9; o.h = 1.5; o.t = 0.08; }
    else if (oz >= 5) { o.w = 5.0; o.h = 9.0; o.t = oz >= 10 ? 0.66 : 0.4; }
    else { o.w = 2.8; o.h = 5.0; o.t = 0.22; }
    return o;
  }
  function buildAssayCard(rec) {
    var g = new THREE.Group(), W = 5.4, H = 8.6, T = 0.1;
    var card = new THREE.Mesh(roundedSlabGeo(W, H, T, 0.3, 0.02, 6), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7, metalness: 0 }));
    card.rotation.x = Math.PI / 2; card.position.z = -T / 2; card.castShadow = true; g.add(card);
    var parts = String(rec.label || "").split("·").map(function (s) { return s.trim(); });
    var cv = labelCanvas(540, 860, function (x, cw, ch) {
      x.fillStyle = "#f4f2ec"; x.fillRect(0, 0, cw, ch);
      x.fillStyle = "#1e1a14"; x.textAlign = "center";
      fitFont(x, parts[0] || "", cw * 0.8, 64, 700); x.fillText(parts[0] || "", cw / 2, 110);
      x.fillStyle = "#8a6a22"; x.font = "600 30px " + SANS; x.fillText("FINE GOLD", cw / 2, 160);
      x.strokeStyle = "rgba(0,0,0,0.25)"; x.lineWidth = 2; x.strokeRect(cw * 0.3, 260, cw * 0.4, 320);
      x.fillStyle = "#3a342a"; x.font = "500 30px " + SANS;
      [parts[1], parts[2], parts[3] ? "Cert " + parts[3] : ""].filter(Boolean).forEach(function (t, i) { fitFont(x, t, cw * 0.84, 34, 500, SANS); x.fillText(t, cw / 2, 660 + i * 50); });
    });
    var face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, H - 0.1), new THREE.MeshStandardMaterial({ map: canvasTex(cv, true), roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.position.z = T / 2 + 0.003; g.add(face);
    var bar = buildBar(rec, barOpts(rec)); bar.position.set(0, 0.35, T / 2 + 0.05); g.add(bar);
    var blister = new THREE.Mesh(roundedSlabGeo(1.6, 2.4, 0.18, 0.2, 0.06, 6), acrylicMaterial(0.2));
    blister.rotation.x = Math.PI / 2; blister.position.set(0, 0.35, T / 2); g.add(noExport(blister));
    g.userData.size = { w: W, h: H, t: T + 0.2 };
    return g;
  }

  function setCoinsFromRecord(rec) {
    var src = (String(rec.notes || "").match(/Contents:\s*([^.]*)/) || [])[1] || (String(rec.denom || "").match(/\(([^)]*)\)/) || [])[1] || "";
    var toks = src.split("·").map(function (s) { return s.trim(); }).filter(Boolean);
    var DIAM = { 1: 1.905, 5: 2.121, 10: 1.791, 25: 2.426, 50: 3.061, 100: 2.65 };
    var out = [];
    toks.forEach(function (tk) {
      var c = tk.match(/(\d+)\s*¢/), dl = /\$\s*1\b/.test(tk);
      if (!c && !dl) return;
      var v = dl ? 100 : +c[1];
      var metal = /\bAg\b/.test(tk) ? "silver" : (v === 1 ? "copper" : (v === 100 && /native|sacagawea/i.test(tk) ? "brass" : "cuni"));
      out.push({ v: v, d: DIAM[v] || 2.4, metal: metal, label: dl ? "$1" : v + "¢" });
    });
    var m = String(rec.denom || "").match(/(\d+)-coin/);
    if (!out.length && m) for (var i = 0; i < +m[1]; i++) out.push({ v: 0, d: 2.2, metal: "cuni", label: "" });
    return out;
  }
  function buildSetCase(rec, res) {
    var coins = setCoinsFromRecord(rec);
    var gap = 0.7, len = coins.reduce(function (s, c) { return s + c.d; }, 0) + gap * (coins.length + 1);
    var W = Math.max(10, len), H = 7.2, T = 0.9;
    var redFlock = /red/i.test([rec.metal, rec.parked].join(" "));
    var g = new THREE.Group();
    var base = new THREE.Mesh(roundedSlabGeo(W, H, T, 0.35, 0.1, 6), new THREE.MeshStandardMaterial({ color: lin("#121214"), roughness: 0.45, metalness: 0, envMapIntensity: 0.8 }));
    base.rotation.x = Math.PI / 2; base.position.z = -T / 2; base.castShadow = true; g.add(base);
    var title = [rec.year, String(rec.denom || "").replace(/\(.*\)/, "").trim()].filter(Boolean).join(" · ");
    var ins = labelCanvas(2048, Math.round(2048 * (H - 0.6) / (W - 0.6)), function (x, cw, ch) {
      if (redFlock) { x.fillStyle = "#5c0d14"; x.fillRect(0, 0, cw, ch); }
      else { var gg = x.createLinearGradient(0, 0, 0, ch); gg.addColorStop(0, "#0c0c10"); gg.addColorStop(1, "#15151b"); x.fillStyle = gg; x.fillRect(0, 0, cw, ch); }
      var n = rng(4); x.fillStyle = "rgba(255,255,255,0.03)"; for (var i = 0; i < 3000; i++) x.fillRect(n() * cw, n() * ch, 2, 2);
      x.fillStyle = "#cfae5c"; x.textAlign = "center"; fitFont(x, title, cw * 0.9, Math.round(ch * 0.09), 600); x.fillText(title, cw / 2, ch * 0.12);
    });
    var insert = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, H - 0.6), new THREE.MeshStandardMaterial({ map: canvasTex(ins, true), roughness: 0.95, metalness: 0, envMapIntensity: 0.2 }));
    insert.position.z = T / 2 + 0.003; g.add(insert);
    var x = -len / 2 + gap;
    coins.forEach(function (c, i) {
      var spec = { seed: hash(recKey(rec) + i), metal: c.metal, finish: "proof", edge: c.metal === "copper" ? "plain" : "reeded", d: c.d, t: 0.15, legend: String(rec.country || "").toUpperCase() === "USA" ? "UNITED STATES OF AMERICA" : String(rec.country || "").toUpperCase(), year: String(rec.year || "").slice(0, 4), mint: (String(rec.year || "").match(/-([A-Z])/) || [])[1] || "", center: "", motif: i % 3, big: c.label.replace("¢", ""), unit: c.label.indexOf("¢") > 0 ? "CENTS" : "DOLLAR" };
      if (spec.big === "1" && spec.unit === "CENTS") spec.unit = "CENT";
      var coin = buildCoin(spec, res, "obv");
      coin.position.set(x + c.d / 2, -0.4, T / 2 + spec.t / 2 + 0.02);
      g.add(coin); x += c.d + gap;
    });
    var lens = new THREE.Mesh(roundedSlabGeo(len + 0.2, 3.9, 0.45, 0.3, 0.08, 6), acrylicMaterial(0.18));
    lens.rotation.x = Math.PI / 2; lens.position.set(0, -0.4, T / 2); g.add(noExport(lens));
    g.userData.size = { w: W, h: H, t: T + 0.5 };
    return g;
  }

  // Lying pieces for lots (built directly in the lying frame, y up)
  function lay(obj) { var p = new THREE.Group(); obj.rotation.x = -Math.PI / 2; p.add(obj); return p; }
  function buildLot(rec, type, res) {
    var spec = coinSpecFor(rec), n = Math.max(1, rec.qty_n || 1), g = new THREE.Group(), r = rng(hash(recKey(rec)));
    var coinRes = Math.min(res, 256);
    if (type === "stack") {
      for (var i = 0; i < n; i++) {
        var c = buildCoin(spec, coinRes, i === n - 1 ? "obv" : "none");
        c.rotation.x = -Math.PI / 2; c.rotation.z = r() * Math.PI * 2;
        c.position.set((r() - 0.5) * 0.18, spec.t / 2 + i * spec.t * 1.01, (r() - 0.5) * 0.18);
        g.add(c);
      }
    } else if (type === "fanned") {
      var span = Math.min(1.9, 0.26 * (n - 1));
      for (var j = 0; j < n; j++) {
        var a = -span / 2 + (n === 1 ? 0 : j / (n - 1) * span), rad = spec.d * 1.25;
        var cf = buildCoin(spec, coinRes, "obv");
        cf.rotation.x = -Math.PI / 2; cf.rotation.z = r() * 0.8;
        cf.position.set(Math.sin(a) * rad, spec.t / 2 + j * spec.t * 0.42, -Math.cos(a) * rad + rad * 0.6);
        g.add(cf);
      }
      if (/tube/i.test([rec.metal, rec.parked].join(" "))) {
        var cap = +((String(rec.metal || "") + String(rec.parked || "")).match(/capacity ~?(\d+)|cap marked (\d+)/i) || [])[1] || 20;
        var tube = buildTube(spec, 0, cap);
        tube.position.set(0, spec.d / 2 + 0.12, spec.d * 1.1 + 0.8); tube.rotation.y = 0.05;
        g.add(tube);
      }
    } else if (type === "tube") {
      var capN = +((String(rec.parked || "")).match(/capacity ~?(\d+)/i) || [])[1] || Math.max(20, n);
      var tb = buildTube(spec, n, capN); tb.position.y = spec.d / 2 + 0.12; g.add(tb);
    } else if (type === "bars") {
      var o = barOpts(rec);
      for (var k = 0; k < n; k++) { var b = lay(buildBar(rec, o)); b.position.set((k - (n - 1) / 2) * (o.w + 0.9), o.t / 2, (r() - 0.5) * 0.4); b.rotation.y = (r() - 0.5) * 0.12; g.add(b); }
    }
    return g;
  }
  function buildTube(spec, count, capacity) {
    var g = new THREE.Group(), R = spec.d / 2 + 0.1, L = capacity * spec.t * 1.02 + 0.6;
    var wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true), acrylicMaterial(0.22));
    wall.material.side = THREE.DoubleSide;
    g.add(noExport(wall));
    var capMat = new THREE.MeshStandardMaterial({ color: lin("#e8e8e4"), roughness: 0.35, metalness: 0, transparent: true, opacity: 0.85 });
    var capGeo = new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.7, 48);
    var c1 = new THREE.Mesh(capGeo, capMat); c1.position.y = L / 2; g.add(noExport(c1));
    var bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 48), acrylicMaterial(0.3)); bottom.rotation.x = Math.PI / 2; bottom.position.y = -L / 2; g.add(noExport(bottom));
    for (var i = 0; i < count; i++) {
      var c = buildCoin(spec, 128, "none"); c.rotation.x = Math.PI / 2; c.position.y = -L / 2 + 0.05 + spec.t / 2 + i * spec.t * 1.02; g.add(c);
    }
    g.rotation.z = Math.PI / 2;    // lie along X
    return g;
  }

  // Build a piece. mode: "inspect" (standing, full detail) | "table" (lying, lighter)
  function buildPiece(rec, mode, format) {
    var k = kindOf(rec), inspect = mode === "inspect";
    var res = inspect ? (isSmallScreen() ? 768 : 1024) : 256;
    var obj;
    if (k === "flip") {
      var spec = coinSpecFor(rec);
      var f = inspect ? format : "flip";
      obj = f === "slab" ? buildSlab(rec, spec, res) : (f === "planchet" ? buildRawCoin(rec, spec, res) : buildFlip2x2(rec, spec, res, !inspect));
    } else if (k === "set") {
      obj = buildSetCase(rec, inspect ? 512 : 256);
    } else {
      var type = bullionType(rec);
      if (type === "assay") obj = buildAssayCard(rec);
      else if (type === "bar") obj = buildBar(rec, barOpts(rec));
      else if (inspect && (type === "bars")) obj = buildBar(rec, barOpts(rec));
      else if (inspect || type === "coin" || type === "capsule") {
        obj = buildCoin(coinSpecFor(rec), inspect ? res : 256, inspect ? "both" : "obv");
        if (type === "capsule") {
          var s = coinSpecFor(rec), cap = new THREE.Mesh(new THREE.CylinderGeometry(s.d / 2 + 0.3, s.d / 2 + 0.3, s.t + 0.4, 48), acrylicMaterial(0.22));
          cap.rotation.x = Math.PI / 2; obj.add(noExport(cap));
        }
      } else {
        return { root: buildLot(rec, type, res), lying: true };
      }
    }
    if (mode === "table") return { root: lay(obj), lying: true };
    return { root: obj, lying: false };
  }

  // ---------------------------------------------------------------------------------------------
  // Disposal
  // ---------------------------------------------------------------------------------------------
  var SHARED_TEX = function (t) { for (var k in ST.shared) if (ST.shared[k] === t) return true; return false; };
  function disposeObject(root, keepShared) {
    if (!root) return;
    root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          ["map", "roughnessMap", "bumpMap", "normalMap", "alphaMap"].forEach(function (key) { if (m[key] && !(keepShared && SHARED_TEX(m[key]))) m[key].dispose(); });
          m.dispose();
        });
      }
    });
    if (root.parent) root.parent.remove(root);
  }

  // ---------------------------------------------------------------------------------------------
  // The piece under examination
  // ---------------------------------------------------------------------------------------------
  function setSpecimen(rec, keepPose) {
    if (!ST.scene || !rec) return;
    var prevQ = keepPose && ST.specimen ? ST.specimen.root.quaternion.clone() : null;
    if (ST.specimen) { disposeObject(ST.specimen.root, true); ST.specimen = null; }
    ST.rec = rec;
    var built = buildPiece(rec, "inspect", ST.format);
    var root = built.root;
    root.traverse(function (o) { if (o.isMesh && !o.userData.noExport) o.castShadow = true; });
    var sz = root.userData.size || { w: 3, h: 3, t: 0.3 };
    var box = new THREE.Box3(new THREE.Vector3(-sz.w / 2, -sz.h / 2, -sz.t / 2), new THREE.Vector3(sz.w / 2, sz.h / 2, sz.t / 2));
    ST.specimen = { root: root, rec: rec, box: box, halfH: sz.h / 2, radius: Math.sqrt(sz.w * sz.w + sz.h * sz.h + sz.t * sz.t) / 2 };
    if (prevQ) root.quaternion.copy(prevQ);
    // plinth sized to the piece
    var p = ST.room.plinth;
    p.scale.set(Math.max(sz.w * 0.8, 2.6), 1, Math.max(sz.t + 2.2, 2.6));
    root.position.set(0, MAT_TOP + PLINTH_H + sz.h / 2 + 0.02, SPEC_Z);
    ST.scene.add(root);
    ST.spin.yaw = ST.spin.pitch = 0; ST.snap = null; ST.lift = 0;
    applyLighting(ST.lighting);
    syncTableVisibility();
    updateLift(true);
    updateHUD();
    if (ST.view === "specimen") frameSpecimen(!ST.firstFrameDone);
    wake(3);
  }

  function specimenRestY() { return MAT_TOP + PLINTH_H + ST.specimen.halfH + 0.02; }
  var _corner = new THREE.Vector3();
  function updateLift(instant) {
    if (!ST.specimen) return false;
    var b = ST.specimen.box, q = ST.specimen.root.quaternion, minY = Infinity;
    for (var i = 0; i < 8; i++) {
      _corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyQuaternion(q);
      if (_corner.y < minY) minY = _corner.y;
    }
    var need = Math.max(0, -minY - ST.specimen.halfH);
    var target = need > 0.001 ? need + 0.25 : 0;
    var prev = ST.lift;
    ST.lift = instant ? target : ST.lift + (target - ST.lift) * 0.25;
    if (Math.abs(ST.lift - target) < 0.002) ST.lift = target;
    ST.specimen.root.position.y = specimenRestY() + ST.lift;
    return Math.abs(prev - ST.lift) > 0.0005;
  }

  var AX_Y = new THREE.Vector3(), AX_X = new THREE.Vector3();
  function rotateSpecimen(dyaw, dpitch) {
    if (!ST.specimen) return;
    AX_Y.set(0, 1, 0).applyQuaternion(ST.camera.quaternion);
    AX_X.set(1, 0, 0).applyQuaternion(ST.camera.quaternion);
    var root = ST.specimen.root;
    root.rotateOnWorldAxis(AX_Y, dyaw);
    root.rotateOnWorldAxis(AX_X, dpitch);
  }

  function snapTo(q) {
    if (!ST.specimen) return;
    ST.spin.yaw = ST.spin.pitch = 0;
    if (prefersReducedMotion()) { ST.specimen.root.quaternion.copy(q); updateLift(true); wake(2); return; }
    ST.snap = { from: ST.specimen.root.quaternion.clone(), to: q.clone(), t0: performance.now(), dur: 650 };
    wake(2);
  }
  var Q_FRONT = new THREE.Quaternion();
  function flip180() {
    if (!ST.specimen) return;
    var fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(ST.specimen.root.quaternion);
    var showingFront = fwd.z >= 0;
    snapTo(showingFront ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI) : Q_FRONT);
  }
  function flip90() { snapTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)); }
  function resetFront() { snapTo(Q_FRONT); }

  // ---------------------------------------------------------------------------------------------
  // Pieces laid on the table
  // ---------------------------------------------------------------------------------------------
  var SLOTS = [
    { x: -15, z: 6, m: 10 }, { x: 15, z: 6, m: 10 },
    { x: -24, z: -6, m: 13 }, { x: 24, z: -6, m: 13 },
    { x: -10, z: -12, m: 20 }, { x: 10, z: -12, m: 20 },
    { x: -26, z: 12, m: 9 }, { x: 26, z: 12, m: 9 }, { x: 0, z: -16, m: 22 }
  ];
  function loadLayout() {
    try { var v = JSON.parse(localStorage.getItem(LS_KEY) || "null"); if (Array.isArray(v)) return v.slice(0, MAX_ON_TABLE); } catch (e) { /* storage blocked */ }
    // First visit: lay out a few real pieces so the bullion has a place on the table.
    var L = vaultLists(), picks = [];
    function pick(list, test) { for (var i = 0; i < list.length; i++) if (test(list[i]) && picks.indexOf(recKey(list[i])) < 0) { picks.push(recKey(list[i])); return; } }
    pick(L.bullion, function (r) { return bullionType(r) === "bar"; });
    pick(L.bullion, function (r) { return bullionType(r) === "fanned" || bullionType(r) === "tube"; });
    pick(L.sets, function () { return true; });
    pick(L.bullion, function (r) { return bullionType(r) === "coin"; });
    pick(L.bullion, function (r) { return bullionType(r) === "stack"; });
    return picks;
  }
  function saveLayout() { try { localStorage.setItem(LS_KEY, JSON.stringify(ST.pieces.map(function (p) { return p.key; }))); } catch (e) { /* ignore */ } }

  function placePiece(rec) {
    var built = buildPiece(rec, "table");
    var wrap = new THREE.Group();
    wrap.add(built.root);
    built.root.traverse(function (o) { if (o.isMesh && !o.userData.noExport) { o.castShadow = true; } });
    wrap.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(built.root);
    var size = new THREE.Vector3(); box.getSize(size);
    built.root.position.y += MAT_TOP - box.min.y + 0.005;
    built.root.position.x -= (box.min.x + box.max.x) / 2;
    built.root.position.z -= (box.min.z + box.max.z) / 2;
    var blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55, color: 0x000000 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = MAT_TOP + 0.01; blob.scale.set(size.x * 1.25 + 0.6, size.z * 1.25 + 0.6, 1);
    blob.userData.noExport = true; blob.renderOrder = 1;
    wrap.add(blob);
    wrap.userData.rec = rec; wrap.userData.foot = Math.max(size.x, size.z);
    return wrap;
  }
  function arrangePieces() {
    var used = {};
    ST.pieces.forEach(function (p) {
      var foot = p.wrap.userData.foot, best = -1;
      for (var i = 0; i < SLOTS.length; i++) if (!used[i] && SLOTS[i].m >= foot) { best = i; break; }
      if (best < 0) for (var j = 0; j < SLOTS.length; j++) if (!used[j]) { best = j; break; }
      used[best] = true;
      var s = SLOTS[best] || SLOTS[0], r = rng(hash(p.key));
      p.wrap.position.set(s.x, 0, s.z);
      p.wrap.rotation.y = (r() - 0.5) * 0.3 + (foot > 12 ? 0 : 0);
    });
    wake(2);
  }
  function setLayout(keys) {
    ST.pieces.forEach(function (p) { disposeObject(p.wrap, true); });
    ST.pieces = [];
    keys.forEach(function (k) {
      var rec = findRec(k); if (!rec || ST.pieces.length >= MAX_ON_TABLE) return;
      try { var wrap = placePiece(rec); ST.scene.add(wrap); ST.pieces.push({ key: recKey(rec), rec: rec, wrap: wrap }); }
      catch (e) { if (window.console) console.warn("table: could not build", k, e); }
    });
    arrangePieces(); syncTableVisibility(); saveLayout(); renderDrawerList();
  }
  function isOnTable(rec) { var k = recKey(rec); return ST.pieces.some(function (p) { return p.key === k; }); }
  function toggleOnTable(rec) {
    var k = recKey(rec), keys = ST.pieces.map(function (p) { return p.key; }), i = keys.indexOf(k);
    if (i >= 0) keys.splice(i, 1);
    else { if (keys.length >= MAX_ON_TABLE) { toast("The table holds " + MAX_ON_TABLE + " pieces. Remove one first."); return; } keys.push(k); }
    setLayout(keys);
    announce(i >= 0 ? "Removed from the table." : "Placed on the table.");
  }
  function syncTableVisibility() {
    var k = recKey(ST.rec);
    ST.pieces.forEach(function (p) { p.wrap.visible = p.key !== k; });
  }

  // ---------------------------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------------------------
  function fitDistance(radius) {
    var cam = ST.camera, vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    var f = Math.min(vf, hf);
    return radius / Math.sin(f / 2) * 1.08;
  }
  function tweenCamera(pos, target, instant) {
    if (!ST.controls) return;
    if (instant || prefersReducedMotion()) { ST.camera.position.copy(pos); ST.controls.target.copy(target); ST.controls.update(); wake(2); return; }
    ST.tweens = [{ p0: ST.camera.position.clone(), p1: pos.clone(), t0v: ST.controls.target.clone(), t1v: target.clone(), start: performance.now(), dur: 900 }];
    wake(2);
  }
  function frameSpecimen(instant) {
    if (!ST.specimen) return;
    var rad = ST.specimen.radius, c = new THREE.Vector3(0, specimenRestY(), SPEC_Z);
    var dist = fitDistance(rad * (isSmallScreen() ? 1.05 : 1.2));
    var dir = new THREE.Vector3(0, 0.5, 1).normalize();
    ST.controls.minDistance = Math.max(2.5, rad * 1.2);
    ST.controls.maxDistance = 140;
    tweenCamera(c.clone().add(dir.multiplyScalar(dist)), c, instant);
  }
  function frameTable(instant) {
    var aspect = ST.camera.aspect, dist = aspect < 1 ? 120 / Math.max(0.55, aspect) * 0.62 : 88;
    var target = new THREE.Vector3(0, 0, -1);
    var dir = new THREE.Vector3(0, 0.95, 0.72).normalize();
    tweenCamera(target.clone().add(dir.multiplyScalar(dist)), target, instant);
  }
  function setView(v) {
    ST.view = v;
    if (v === "table") frameTable(); else frameSpecimen();
    updateHUD();
  }

  // ---------------------------------------------------------------------------------------------
  // Render loop (render on demand)
  // ---------------------------------------------------------------------------------------------
  function tick(now) {
    ST.raf = null;
    if (!ST.open || !ST.renderer) { ST.running = false; return; }
    var dt = Math.min(64, now - ST.lastT); ST.lastT = now;
    var active = false;

    if (ST.tweens.length) {
      var tw = ST.tweens[0], p = clamp((now - tw.start) / tw.dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
      ST.camera.position.lerpVectors(tw.p0, tw.p1, e);
      ST.controls.target.lerpVectors(tw.t0v, tw.t1v, e);
      if (p >= 1) ST.tweens.shift();
      active = true;
    }
    if (ST.controls && ST.controls.update()) active = true;
    if (ST.specimen) {
      if (ST.snap) {
        var sp = clamp((now - ST.snap.t0) / ST.snap.dur, 0, 1), se = sp < 0.5 ? 4 * sp * sp * sp : 1 - Math.pow(-2 * sp + 2, 3) / 2;
        ST.specimen.root.quaternion.slerpQuaternions(ST.snap.from, ST.snap.to, se);
        if (sp >= 1) ST.snap = null;
        active = true;
      } else if (!ST.drag && (Math.abs(ST.spin.yaw) > 0.00002 || Math.abs(ST.spin.pitch) > 0.00002)) {
        rotateSpecimen(ST.spin.yaw * dt, ST.spin.pitch * dt);
        var decay = Math.exp(-dt / 260);
        ST.spin.yaw *= decay; ST.spin.pitch *= decay;
        active = true;
      }
      if (updateLift(false)) active = true;
    }
    if (active || ST.needs > 0) {
      var t0 = performance.now();
      ST.renderer.render(ST.scene, ST.camera);
      if (!ST.firstFrameDone) { ST.firstFrameDone = true; hideVeil(); }
      ST.renderCount = (ST.renderCount || 0) + 1;
      if (active) sampleFrame(now);
      if (ST.needs > 0) ST.needs--;
      void t0;
    }
    if (active || ST.needs > 0) ST.raf = requestAnimationFrame(tick);
    else { ST.running = false; ST.perfLast = 0; }
  }
  // Adaptive resolution: if continuous interaction runs slower than ~30 fps, step the pixel ratio down.
  function sampleFrame(now) {
    if (ST.perfDone) return;
    if (ST.perfLast) ST.perf.push(now - ST.perfLast);
    ST.perfLast = now;
    if (ST.perf.length >= 40) {
      var s = ST.perf.slice().sort(function (a, b) { return a - b; }), med = s[20];
      ST.perf = [];
      if (med > 34 && ST.dpr > ST.dprMin + 0.01) {
        ST.dpr = Math.max(ST.dprMin, ST.dpr - 0.25);
        ST.renderer.setPixelRatio(ST.dpr); resize();
      } else if (med <= 34) ST.perfDone = true;
    }
  }
  function resize() {
    var host = document.getElementById("spatial-canvas-container");
    if (!host || !ST.renderer) return;
    var w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    ST.camera.aspect = w / h; ST.camera.updateProjectionMatrix();
    ST.renderer.setSize(w, h, false);
    wake(2);
  }

  // ---------------------------------------------------------------------------------------------
  // Pointer interaction: drag the piece to turn it; drag elsewhere to orbit; tap a laid piece to
  // pick it up; double-tap the piece to flip it.
  // ---------------------------------------------------------------------------------------------
  var raycaster = null, ndc = null;
  function hitTest(clientX, clientY) {
    var rect = ST.renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, ST.camera);
    var targets = [];
    if (ST.specimen) targets.push(ST.specimen.root);
    ST.pieces.forEach(function (p) { if (p.wrap.visible) targets.push(p.wrap); });
    var hits = raycaster.intersectObjects(targets, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object; if (o.userData.noExport && o.material && o.material.isMeshBasicMaterial) continue;
      var specRoot = ST.specimen ? ST.specimen.root : null;
      while (o && o.parent && o !== specRoot && !o.userData.rec) o = o.parent;
      if (specRoot && o === specRoot) return { type: "specimen" };
      if (o && o.userData.rec) return { type: "piece", rec: o.userData.rec };
    }
    return null;
  }
  function bindPointer(el) {
    var lastTap = 0;
    on(el, "pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      var h = hitTest(e.clientX, e.clientY);
      ST.press = { x: e.clientX, y: e.clientY, t: performance.now(), hit: h, id: e.pointerId, moved: false };
      if (h && h.type === "specimen" && e.isPrimary) {
        ST.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
        ST.snap = null; ST.spin.yaw = ST.spin.pitch = 0;
        if (ST.controls) ST.controls.enabled = false;
        try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        el.classList.add("is-turning");
      }
    });
    on(el, "pointermove", function (e) {
      if (ST.press && e.pointerId === ST.press.id && Math.hypot(e.clientX - ST.press.x, e.clientY - ST.press.y) > 6) ST.press.moved = true;
      if (ST.drag && e.pointerId === ST.drag.id) {
        var now = performance.now(), dx = e.clientX - ST.drag.x, dy = e.clientY - ST.drag.y, dt = Math.max(8, now - ST.drag.t);
        var k = 0.0105 * (isTouch() ? 1.15 : 1);
        rotateSpecimen(dx * k, dy * k);
        if (!prefersReducedMotion()) { ST.spin.yaw = ST.spin.yaw * 0.4 + (dx * k / dt) * 0.6; ST.spin.pitch = ST.spin.pitch * 0.4 + (dy * k / dt) * 0.6; }
        ST.drag.x = e.clientX; ST.drag.y = e.clientY; ST.drag.t = now;
        wake(2);
      } else if (e.pointerType === "mouse" && !e.buttons) {
        var h = hitTest(e.clientX, e.clientY);
        el.style.cursor = h ? (h.type === "piece" ? "pointer" : "grab") : "";
      }
    });
    function end(e) {
      var p = ST.press; ST.press = null;
      if (ST.drag && e.pointerId === ST.drag.id) {
        if (performance.now() - ST.drag.t > 90) { ST.spin.yaw = ST.spin.pitch = 0; }
        ST.drag = null; if (ST.controls) ST.controls.enabled = true;
        el.classList.remove("is-turning");
        wake(2);
      }
      if (p && !p.moved && e.type === "pointerup" && performance.now() - p.t < 450) {
        if (p.hit && p.hit.type === "piece") { inspect(p.hit.rec); }
        else if (p.hit && p.hit.type === "specimen") {
          var now = performance.now();
          if (now - lastTap < 320) { flip180(); lastTap = 0; } else lastTap = now;
        }
      }
    }
    on(el, "pointerup", end); on(el, "pointercancel", end);
    on(el, "dblclick", function (e) { e.preventDefault(); });
    on(el, "contextmenu", function (e) { e.preventDefault(); });
  }

  // ---------------------------------------------------------------------------------------------
  // HUD (built once into #spatial-museum-modal, themed with the app's CSS tokens)
  // ---------------------------------------------------------------------------------------------
  var ICON = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
    flip: '<path d="M4.5 9.5A8 8 0 0 1 18.8 7"/><path d="M19.5 14.5A8 8 0 0 1 5.2 17"/><path d="M19 3v4h-4"/><path d="M5 21v-4h4"/>',
    edge: '<rect x="9.5" y="3" width="5" height="18" rx="2.5"/><path d="M12 6v12" stroke-dasharray="1.5 1.5"/>',
    front: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>',
    light: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    table: '<path d="M3 16.5l3.5-8h11l3.5 8z"/><path d="M6 16.5v3M18 16.5v3"/>',
    piece: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8.5v7M8.5 12h7" stroke-width="1.4"/>',
    browse: '<path d="M4 6h10M4 12h7M4 18h10"/><circle cx="17" cy="14" r="3.2"/><path d="M19.4 16.4L21.5 18.5"/>',
    ar: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON[name] + "</svg>"; }
  var LIGHT_NAMES = { gallery: "Warm", loupe: "Daylight", raking: "Raking" };
  var $ = function (id) { return document.getElementById(id); };

  function buildHUD(modal) {
    if (modal.getAttribute("data-trt") === "1") return;
    modal.setAttribute("data-trt", "1");
    modal.classList.add("trt");
    modal.setAttribute("aria-label", "Examination table (3D)");
    modal.innerHTML =
      '<div class="spatial-canvas-container trt-stage" id="spatial-canvas-container" aria-hidden="true"></div>' +
      '<div class="trt-vignette" aria-hidden="true"></div>' +
      '<p class="trt-sr" id="trt-live" aria-live="polite"></p>' +
      '<header class="trt-top">' +
        '<div class="trt-plate">' +
          '<div class="trt-kicker"><span id="trt-kind"></span><span class="trt-ser" id="trt-ser"></span></div>' +
          '<h2 class="trt-title" id="trt-title"></h2>' +
          '<div class="trt-meta" id="trt-meta"></div>' +
          '<button type="button" class="trt-record" id="trt-record" hidden title="Leave the table and open this coin\'s full record: how sure we are of each fact, sources and history">How sure we are · full record ›</button>' +
        '</div>' +
        '<div class="trt-actions">' +
          '<button type="button" class="trt-btn trt-btn-pill" id="trt-browse" aria-haspopup="dialog" aria-controls="trt-drawer" title="Choose pieces (B)">' + icon("browse") + '<span>Collection</span></button>' +
          '<button type="button" class="trt-btn trt-btn-pill trt-icon-only" id="trt-ar" title="View in your room (AR)" aria-label="View in your room (AR)">' + icon("ar") + '</button>' +
          '<button type="button" class="trt-exit" id="trt-exit" aria-label="Leave the table" title="Leave the table (Esc)">' + icon("close") + '<span>Exit</span></button>' +
        '</div>' +
      '</header>' +
      '<nav class="trt-dock" aria-label="Table controls">' +
        '<button type="button" class="trt-btn trt-icon-only" id="trt-prev" aria-label="Previous piece" title="Previous (←)">' + icon("prev") + '</button>' +
        '<div class="trt-seg" role="radiogroup" aria-label="Holder" id="trt-format">' +
          '<button type="button" role="radio" data-format="flip">2×2 flip</button>' +
          '<button type="button" role="radio" data-format="slab">Slab</button>' +
          '<button type="button" role="radio" data-format="planchet">Bare</button>' +
        '</div>' +
        '<span class="trt-sep" aria-hidden="true"></span>' +
        '<button type="button" class="trt-btn trt-primary" id="trt-flip" title="Turn over (Space)">' + icon("flip") + '<span>Turn over</span></button>' +
        '<button type="button" class="trt-btn" id="trt-edge" title="Show the edge (E)">' + icon("edge") + '<span>Edge</span></button>' +
        '<button type="button" class="trt-btn" id="trt-front" title="Face front (R)">' + icon("front") + '<span>Front</span></button>' +
        '<span class="trt-sep" aria-hidden="true"></span>' +
        '<button type="button" class="trt-btn" id="trt-light" title="Change the light (L)">' + icon("light") + '<span id="trt-light-name">Warm</span></button>' +
        '<button type="button" class="trt-btn" id="trt-view" aria-pressed="false" title="Look at the whole table (V)">' + icon("table") + '<span id="trt-view-name">Table</span></button>' +
        '<button type="button" class="trt-btn trt-icon-only" id="trt-next" aria-label="Next piece" title="Next (→)">' + icon("next") + '</button>' +
      '</nav>' +
      '<p class="trt-hint" id="trt-hint" aria-hidden="true"></p>' +
      '<aside class="trt-drawer" id="trt-drawer" role="dialog" aria-modal="false" aria-labelledby="trt-drawer-title" hidden>' +
        '<div class="trt-drawer-head"><h3 id="trt-drawer-title">The collection</h3>' +
          '<button type="button" class="trt-btn trt-icon-only" id="trt-drawer-close" aria-label="Close the collection list">' + icon("close") + '</button></div>' +
        '<label class="trt-search"><span class="trt-sr">Search the collection</span>' +
          '<input type="search" id="trt-q" placeholder="Country, year, denomination, serial" autocomplete="off" spellcheck="false" /></label>' +
        '<div class="trt-tabs" role="tablist" aria-label="Kind" id="trt-tabs">' +
          '<button type="button" role="tab" data-tab="all" aria-selected="true">All</button>' +
          '<button type="button" role="tab" data-tab="flip" aria-selected="false">Coins</button>' +
          '<button type="button" role="tab" data-tab="bullion" aria-selected="false">Bullion</button>' +
          '<button type="button" role="tab" data-tab="set" aria-selected="false">Sets</button>' +
        '</div>' +
        '<div class="trt-ontable"><span id="trt-count"></span><button type="button" class="trt-link" id="trt-clear">Clear the table</button></div>' +
        '<ul class="trt-list" id="trt-list"></ul>' +
      '</aside>' +
      '<div class="trt-veil" id="trt-veil" role="status"><div class="trt-veil-card"><div class="trt-spinner" aria-hidden="true"></div>' +
        '<h3 id="trt-veil-title">Setting the table</h3><p id="trt-veil-text">Polishing the lamp and laying out the pieces.</p>' +
        '<div class="trt-veil-actions" id="trt-veil-actions"></div></div></div>' +
      '<div class="trt-qr" id="trt-qr" role="dialog" aria-modal="true" aria-labelledby="trt-qr-title" hidden><div class="trt-qr-card">' +
        '<div class="trt-drawer-head"><h3 id="trt-qr-title">Open on your phone</h3><button type="button" class="trt-btn trt-icon-only" id="trt-qr-close" aria-label="Close">' + icon("close") + '</button></div>' +
        '<div class="trt-qr-code" id="trt-qr-code"></div>' +
        '<p>Scan with the phone camera. On iPhone and iPad the piece opens in AR Quick Look, life-size on your desk.</p>' +
        '<button type="button" class="trt-btn trt-btn-pill" id="trt-usdz">Download .usdz model</button></div></div>';

    $("trt-exit").addEventListener("click", function () { api.close(); });
    // #44: the table draws the piece; how sure we are of each fact lives in the coin view (certainty labels + history)
    $("trt-record").addEventListener("click", function () {
      var rec = ST.rec, B = window.__galleryBridge; if (!rec || !rec.scan || !B) return;
      api.close();
      try { B.setWing("gallery", false); B.openDrawer(rec.scan); } catch (e) { /* ignore */ }
    });
    $("trt-prev").addEventListener("click", function () { api.prev(); });
    $("trt-next").addEventListener("click", function () { api.next(); });
    $("trt-flip").addEventListener("click", flip180);
    $("trt-edge").addEventListener("click", flip90);
    $("trt-front").addEventListener("click", resetFront);
    $("trt-light").addEventListener("click", function () { var o = ["gallery", "loupe", "raking"]; api.setLighting(o[(o.indexOf(ST.lighting) + 1) % 3]); });
    $("trt-view").addEventListener("click", function () { setView(ST.view === "table" ? "specimen" : "table"); });
    [].forEach.call(modal.querySelectorAll("#trt-format [data-format]"), function (b) { b.addEventListener("click", function () { api.setFormat(b.getAttribute("data-format")); }); });
    $("trt-browse").addEventListener("click", function () { toggleDrawer(); });
    $("trt-drawer-close").addEventListener("click", function () { toggleDrawer(false); });
    $("trt-q").addEventListener("input", renderDrawerList);
    [].forEach.call(modal.querySelectorAll("#trt-tabs [data-tab]"), function (b) {
      b.addEventListener("click", function () { ST.tab = b.getAttribute("data-tab"); [].forEach.call(modal.querySelectorAll("#trt-tabs [data-tab]"), function (x) { x.setAttribute("aria-selected", String(x === b)); }); renderDrawerList(); });
    });
    $("trt-clear").addEventListener("click", function () { setLayout([]); announce("The table is clear."); });
    $("trt-list").addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]"), row = e.target.closest("[data-pick]");
      if (add) { var r1 = findRec(add.getAttribute("data-add")); if (r1) toggleOnTable(r1); return; }
      if (row) { var r2 = findRec(row.getAttribute("data-pick")); if (r2) { inspect(r2); if (isSmallScreen()) toggleDrawer(false); } }
    });
    $("trt-ar").addEventListener("click", function () { api.exportAR(); });
    $("trt-qr-close").addEventListener("click", function () { $("trt-qr").hidden = true; });
    $("trt-usdz").addEventListener("click", function () {
      exportUSDZ(function (url) { var a = document.createElement("a"); a.href = url; a.download = (recKey(ST.rec) || "titan-piece") + ".usdz"; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000); });
    });
  }

  function announce(msg) { var el = $("trt-live"); if (el) { el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 30); } }

  function updateHUD() {
    var rec = ST.rec; if (!rec || !$("trt-title")) return;
    var k = kindOf(rec);
    var kind = k === "flip" ? (ST.format === "slab" ? "Coin · shown slabbed" : (ST.format === "planchet" ? "Coin · out of the flip" : "Coin · 2×2 flip")) :
      (k === "set" ? "Mint set" : "Bullion" + (rec.qty_n > 1 ? " · 1 of " + rec.qty_n + " shown" : ""));
    $("trt-kind").textContent = kind;
    $("trt-ser").textContent = [rec.ser, rec.scan].filter(Boolean).join(" · ");
    $("trt-title").textContent = titleOf(rec);
    var meta = [];
    if (rec.mint && k === "flip") meta.push("Mint " + rec.mint);
    if (rec.asw_oz) meta.push(rec.asw_oz + " oz silver");
    if (rec.agw_oz) meta.push(rec.agw_oz + " oz gold");
    if (rec.est != null) meta.push("Est. $" + Number(rec.est).toFixed(2));
    if (rec.status) meta.push(rec.status);
    meta.push("A drawing from the record, not a photo");
    $("trt-meta").textContent = meta.join(" · ");
    var recBtn = $("trt-record"); if (recBtn) recBtn.hidden = k !== "flip" || !rec.scan || !(window.__galleryBridge && window.__galleryBridge.openDrawer);
    var seg = $("trt-format"); seg.hidden = k !== "flip";
    [].forEach.call(seg.querySelectorAll("[data-format]"), function (b) { var onF = b.getAttribute("data-format") === ST.format; b.setAttribute("aria-checked", String(onF)); b.tabIndex = onF ? 0 : -1; });
    $("trt-light-name").textContent = LIGHT_NAMES[ST.lighting] || "Warm";
    $("trt-view").setAttribute("aria-pressed", String(ST.view === "table"));
    $("trt-view-name").textContent = ST.view === "table" ? "Piece" : "Table";
    var list = listFor(rec); $("trt-prev").disabled = $("trt-next").disabled = list.length < 2;
    var br = $("trt-browse"); if (br) br.setAttribute("aria-expanded", String(!$("trt-drawer").hidden));
    renderDrawerList();
  }

  function toggleDrawer(force) {
    var d = $("trt-drawer"); if (!d) return;
    var show = force == null ? d.hidden : !!force;
    d.hidden = !show;
    $("trt-browse").setAttribute("aria-expanded", String(show));
    ST.stageEl && ST.stageEl.parentNode && ST.stageEl.parentNode.classList.toggle("trt-drawer-open", show);
    if (show) { renderDrawerList(); setTimeout(function () { try { $("trt-q").focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30); }
    else { try { $("trt-browse").focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  function renderDrawerList() {
    var ul = $("trt-list"); if (!ul || $("trt-drawer").hidden) { var cnt0 = $("trt-count"); if (cnt0) cnt0.textContent = ST.pieces.length + " of " + MAX_ON_TABLE + " on the table"; return; }
    var L = vaultLists(), tab = ST.tab || "all", q = ($("trt-q").value || "").trim().toLowerCase();
    var rows = [];
    if (tab === "all" || tab === "set") rows = rows.concat(L.sets);
    if (tab === "all" || tab === "bullion") rows = rows.concat(L.bullion);
    if (tab === "all" || tab === "flip") rows = rows.concat(L.flips);
    if (q) {
      var terms = q.split(/\s+/);
      rows = rows.filter(function (r) { var hay = [r.label, r.country, r.year, r.denom, r.ser, r.scan, r.iso, r.mint, r.cat].join(" ").toLowerCase(); return terms.every(function (t) { return hay.indexOf(t) >= 0; }); });
    }
    var total = rows.length, cur = recKey(ST.rec);
    rows = rows.slice(0, 160);
    $("trt-count").textContent = ST.pieces.length + " of " + MAX_ON_TABLE + " on the table";
    ul.innerHTML = rows.map(function (r) {
      var k = recKey(r), placed = isOnTable(r), metalDot = r.is_gold ? "au" : ((r.is_silver || r.asw_oz) ? "ag" : "");
      var sub = [kindOf(r) === "flip" ? "Coin" : (kindOf(r) === "set" ? "Set" : "Bullion"), r.ser, r.scan].filter(Boolean).join(" · ");
      return '<li class="trt-row' + (k === cur ? " is-current" : "") + '">' +
        '<button type="button" class="trt-pick" data-pick="' + esc(k) + '"' + (k === cur ? ' aria-current="true"' : "") + '>' +
          '<span class="trt-dot ' + metalDot + '" aria-hidden="true"></span>' +
          '<span class="trt-row-text"><span class="trt-row-title">' + esc(titleOf(r)) + '</span><span class="trt-row-sub">' + esc(sub) + (metalDot ? (metalDot === "au" ? " · gold" : " · silver") : "") + '</span></span></button>' +
        '<button type="button" class="trt-add' + (placed ? " is-on" : "") + '" data-add="' + esc(k) + '" aria-pressed="' + placed + '" aria-label="' + (placed ? "Take off the table: " : "Place on the table: ") + esc(titleOf(r)) + '" title="' + (placed ? "On the table (tap to remove)" : "Place on the table") + '">' + icon(placed ? "check" : "plus") + '</button></li>';
    }).join("") + (total > rows.length ? '<li class="trt-more">' + (total - rows.length) + " more. Refine the search.</li>" : "") + (!total ? '<li class="trt-more">Nothing matches.</li>' : "");
  }

  function showVeil(state, title, text, actions) {
    var v = $("trt-veil"); if (!v) return;
    v.hidden = false; v.classList.remove("is-gone"); v.setAttribute("data-state", state || "loading");
    $("trt-veil-title").textContent = title || "Setting the table";
    $("trt-veil-text").textContent = text || "Polishing the lamp and laying out the pieces.";
    var box = $("trt-veil-actions"); box.innerHTML = "";
    (actions || []).forEach(function (a) { var b = document.createElement("button"); b.type = "button"; b.className = "trt-btn trt-btn-pill" + (a.primary ? " trt-primary" : ""); b.textContent = a.label; b.addEventListener("click", a.fn); box.appendChild(b); });
  }
  function hideVeil() { var v = $("trt-veil"); if (!v) return; v.classList.add("is-gone"); setTimeout(function () { if (v.classList.contains("is-gone")) v.hidden = true; }, 450); }
  function showHint() {
    var h = $("trt-hint"); if (!h) return;
    h.textContent = isTouch() ? "Drag the piece to turn it · drag the table to look around · pinch to zoom · tap a piece on the pad to pick it up"
      : "Drag the piece to turn it · drag the table to look around · scroll to zoom · click a piece on the pad to pick it up";
    if (ST.hintShown) { h.classList.remove("is-on"); return; }
    ST.hintShown = true; h.classList.add("is-on");
    setTimeout(function () { h.classList.remove("is-on"); }, 7000);
  }

  // ---------------------------------------------------------------------------------------------
  // Keyboard (captured while the table is open so app-level shortcuts do not fire underneath)
  // ---------------------------------------------------------------------------------------------
  function onKey(e) {
    if (!ST.open) return;
    var modal = $("spatial-museum-modal");
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA";
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      if (!$("trt-qr").hidden) { $("trt-qr").hidden = true; return; }
      if (!$("trt-drawer").hidden) { toggleDrawer(false); return; }
      api.close(); return;
    }
    if (e.key === "Tab") { trapFocus(e, modal); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    var onButton = tag === "BUTTON";
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    var handled = true;
    if (k === " " && !onButton) flip180();
    else if (k === "e") flip90();
    else if (k === "r") resetFront();
    else if (k === "ArrowLeft" && !onButton) api.prev();
    else if (k === "ArrowRight" && !onButton) api.next();
    else if (k === "ArrowUp") { snapTo(ST.specimen.root.quaternion.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 12))); }
    else if (k === "ArrowDown") { snapTo(ST.specimen.root.quaternion.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 12))); }
    else if (k === "f" && kindOf(ST.rec) === "flip") { var fo = ["flip", "slab", "planchet"]; api.setFormat(fo[(fo.indexOf(ST.format) + 1) % 3]); }
    else if (k === "l") $("trt-light").click();
    else if (k === "v" || k === "o") $("trt-view").click();
    else if (k === "b" || k === "/") toggleDrawer(true);
    else if (k === "+" || k === "=") zoom(0.85);
    else if (k === "-" || k === "_") zoom(1.18);
    else handled = false;
    if (handled) e.preventDefault();
  }
  function zoom(f) {
    if (!ST.controls) return;
    var t = ST.controls.target, off = ST.camera.position.clone().sub(t);
    var len = clamp(off.length() * f, ST.controls.minDistance, ST.controls.maxDistance);
    ST.camera.position.copy(t).add(off.setLength(len)); wake(3);
  }
  function trapFocus(e, modal) {
    var f = [].filter.call(modal.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])"), function (el) { return !el.disabled && el.offsetParent !== null && !el.closest("[hidden]"); });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  // ---------------------------------------------------------------------------------------------
  // WebGL availability, build and teardown
  // ---------------------------------------------------------------------------------------------
  function webglAvailable() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))); }
    catch (e) { return false; }
  }
  function failNoGL(reason) {
    ST.failed = true;
    var r = ST.rec;
    showVeil("error", "The 3D table needs WebGL",
      (reason || "This browser or device has 3D graphics turned off.") + (r ? " You were opening " + titleOf(r) + (r.ser ? " (" + r.ser + ")" : "") + "." : ""),
      [{ label: "Back to the collection", primary: true, fn: function () { api.close(); } }]);
  }

  function buildScene() {
    var host = $("spatial-canvas-container");
    var small = isSmallScreen();
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !small || (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: "high-performance" });
    } catch (e) { return false; }
    ST.renderer = renderer;
    ST.maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    ST.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    ST.dprMin = small ? 1 : 0.85;
    ST.perf = []; ST.perfDone = false; ST.perfLast = 0;
    renderer.setPixelRatio(ST.dpr);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x0a0806, 1);
    var canvas = renderer.domElement;
    canvas.className = "trt-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.innerHTML = ""; host.appendChild(canvas);
    ST.stageEl = host;
    on(canvas, "webglcontextlost", function (ev) {
      ev.preventDefault();
      showVeil("error", "The 3D view was interrupted", "The graphics processor reset (this can happen when the device is low on memory).",
        [{ label: "Rebuild the table", primary: true, fn: function () { var r = ST.rec, f = ST.format; teardown(); api.open(r, f); } }, { label: "Leave", fn: function () { api.close(); } }]);
    });

    ST.scene = new THREE.Scene();
    ST.scene.background = new THREE.Color(0x0a0806);
    ST.scene.fog = new THREE.Fog(0x0a0806, 95, 230);
    ST.camera = new THREE.PerspectiveCamera(small ? 40 : 34, 1, 0.5, 400);
    buildEnvironment();
    buildLights();
    buildRoom();

    raycaster = new THREE.Raycaster(); ndc = new THREE.Vector2();
    if (THREE.OrbitControls) {
      var c = new THREE.OrbitControls(ST.camera, canvas);
      c.enableDamping = !prefersReducedMotion(); c.dampingFactor = 0.08;
      c.rotateSpeed = 0.6; c.zoomSpeed = 0.9; c.panSpeed = 0.8;
      c.maxPolarAngle = Math.PI * 0.46; c.minPolarAngle = 0.05;
      c.screenSpacePanning = true;
      c.addEventListener("change", function () {
        var t = c.target; t.x = clamp(t.x, -34, 34); t.z = clamp(t.z, -24, 24); t.y = clamp(t.y, 0, 25);
        wake(1);
      });
      c.addEventListener("start", function () { ST.tweens = []; wake(2); });
      ST.controls = c;
    }
    bindPointer(canvas);
    if (window.ResizeObserver) { ST.ro = new ResizeObserver(function () { resize(); }); ST.ro.observe(host); }
    else on(window, "resize", resize);
    resize();
    return true;
  }

  function teardown() {
    if (ST.raf) cancelAnimationFrame(ST.raf);
    ST.raf = null; ST.running = false;
    ST.offs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); ST.offs = [];
    if (ST.ro) { ST.ro.disconnect(); ST.ro = null; }
    stopCameraBackdrop();
    if (ST.controls) { ST.controls.dispose(); ST.controls = null; }
    if (ST.scene) {
      ST.pieces.forEach(function (p) { disposeObject(p.wrap, false); });
      if (ST.specimen) disposeObject(ST.specimen.root, false);
      var rest = ST.scene.children.slice();
      rest.forEach(function (o) { disposeObject(o, false); });
      ST.scene.environment = null; ST.scene.background = null;
    }
    for (var k in ST.shared) { try { ST.shared[k].dispose(); } catch (e) { /* ignore */ } }
    ST.shared = {};
    if (ST.env) { ST.env.dispose(); ST.env = null; }
    if (ST.renderer) {
      var cv = ST.renderer.domElement;
      ST.renderer.dispose();
      try { ST.renderer.forceContextLoss(); } catch (e) { /* ignore */ }
      if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    }
    ST.renderer = null; ST.scene = null; ST.camera = null; ST.specimen = null; ST.pieces = []; ST.lights = {}; ST.room = {};
    ST.tweens = []; ST.snap = null; ST.drag = null; ST.press = null; ST.built = false; ST.firstFrameDone = false; ST.failed = false;
  }

  // ---------------------------------------------------------------------------------------------
  // AR / export
  // ---------------------------------------------------------------------------------------------
  function exportRoot() {
    if (!ST.specimen) return null;
    var src = ST.specimen.root.clone(true);
    src.position.set(0, 0, 0); src.quaternion.identity(); src.rotation.set(0, 0, 0);
    var remove = [];
    src.traverse(function (o) {
      if (o.isMesh && (o.userData.noExport || Array.isArray(o.material) || !o.material.isMeshStandardMaterial || o.material.transparent)) remove.push(o);
    });
    remove.forEach(function (o) { o.parent.remove(o); });
    var g = new THREE.Group();
    g.scale.setScalar(0.01);                                  // cm → m (USDZ metersPerUnit = 1)
    g.add(src);
    src.position.y = (ST.specimen.halfH || 1);                 // stand the piece on the floor plane
    g.updateMatrixWorld(true);
    return g;
  }
  function exportUSDZ(done) {
    if (!THREE || !THREE.USDZExporter || !window.fflate) { toast("The AR exporter is not available in this build."); return; }
    var root = exportRoot(); if (!root) return;
    toast("Preparing the AR model");
    new THREE.USDZExporter().parse(root).then(function (buf) {
      var url = URL.createObjectURL(new Blob([buf], { type: "model/vnd.usdz+zip" }));
      done(url);
    }).catch(function (err) { if (window.console) console.error("USDZ export error:", err); toast("Could not build the AR model."); });
  }
  function arUrl() {
    var key = recKey(ST.rec);
    return window.location.origin + window.location.pathname + "?specimen=" + encodeURIComponent(key) + "&format=" + encodeURIComponent(ST.format) + "&ar=1";
  }
  function showQR() {
    var box = $("trt-qr-code"); if (!box) return;
    box.innerHTML = "";
    if (typeof window.QRCode !== "undefined") {
      try { new window.QRCode(box, { text: arUrl(), width: 200, height: 200, colorDark: "#0b0a08", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { box.textContent = arUrl(); }
    } else box.textContent = arUrl();
    $("trt-qr").hidden = false;
    try { $("trt-qr-close").focus(); } catch (e) { /* ignore */ }
  }
  function startCameraBackdrop() {
    if (ST.arOn) { stopCameraBackdrop(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("This browser has no camera access."); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(function (stream) {
      if (!ST.open || !ST.renderer) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      ST.arStream = stream;
      var v = document.createElement("video");
      v.id = "trt-camera"; v.className = "trt-camera"; v.autoplay = true; v.muted = true; v.playsInline = true; v.setAttribute("playsinline", "");
      v.srcObject = stream;
      ST.stageEl.insertBefore(v, ST.stageEl.firstChild);
      ST.scene.background = null; ST.scene.fog = null; ST.renderer.setClearColor(0x000000, 0);
      ST.room.table.visible = ST.room.pad.visible = false;
      ST.pieces.forEach(function (p) { p.wrap.visible = false; });
      ST.arOn = true; $("trt-ar").classList.add("is-on");
      toast("Camera view: turn the piece over your own desk.");
      wake(2);
    }).catch(function () { toast("Camera permission was declined or no camera is available."); });
  }
  function stopCameraBackdrop() {
    if (ST.arStream) { ST.arStream.getTracks().forEach(function (t) { t.stop(); }); ST.arStream = null; }
    var v = document.getElementById("trt-camera"); if (v) { v.srcObject = null; v.remove(); }
    if (ST.arOn && ST.scene) {
      ST.scene.background = new THREE.Color(0x0a0806); ST.scene.fog = new THREE.Fog(0x0a0806, 95, 230);
      ST.renderer.setClearColor(0x0a0806, 1);
      ST.room.table.visible = ST.room.pad.visible = true; syncTableVisibility();
      wake(2);
    }
    ST.arOn = false; var b = $("trt-ar"); if (b) b.classList.remove("is-on");
  }

  // ---------------------------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------------------------
  function inspect(rec) {
    if (!rec || !ST.scene) return;
    ST.view = "specimen";
    setSpecimen(rec);
    renderDrawerList();
    announce("Now examining " + titleOf(rec) + ".");
  }

  var api = {
    open: function (recOrScan, format) {
      var modal = $("spatial-museum-modal"); if (!modal) return;
      buildHUD(modal);
      var rec = recOrScan && typeof recOrScan === "object" ? recOrScan : findRec(recOrScan);
      if (!rec) { var L = vaultLists(); rec = L.flips[0] || L.bullion[0] || L.sets[0] || null; }
      if (format === "slab" || format === "planchet" || format === "flip") ST.format = format;
      if (!ST.open) ST.lastFocus = document.activeElement;
      ST.open = true;
      ST.rec = rec;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      document.body.classList.add("trt-open");
      window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: true } }));
      on(window, "keydown", onKey, true);
      on(document, "visibilitychange", function () { if (document.hidden) { if (ST.raf) cancelAnimationFrame(ST.raf); ST.raf = null; ST.running = false; } else wake(2); });
      // Focus the dialog itself (not a button) so Space/E/R reach the table instead of activating Exit.
      modal.setAttribute("tabindex", "-1");
      setTimeout(function () { try { modal.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 40);
      updateHUDSafe();

      if (!rec) {
        showVeil("error", "The collection is still loading", "Try again in a moment.", [{ label: "Leave", primary: true, fn: function () { api.close(); } }]);
        return;
      }
      if (ST.built && ST.renderer) { inspect(rec); return; }
      if (!THREE || !webglAvailable()) { failNoGL(!THREE ? "The 3D engine did not load." : null); return; }
      showVeil("loading");
      var fontsReady = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load('600 64px "Fraunces"'), new Promise(function (r) { setTimeout(r, 900); })]) : Promise.resolve();
      fontsReady.catch(function () { /* ignore */ }).then(function () {
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          if (!ST.open || ST.built) return;
          try {
            var tb = performance.now();
            if (!buildScene()) { failNoGL(); return; }
            ST.built = true;
            ST.view = "specimen";
            setSpecimen(ST.rec);
            setLayout(loadLayout());
            frameSpecimen(true);
            ST.buildMs = Math.round(performance.now() - tb);
            showHint();
            wake(3);
          } catch (err) {
            if (window.console) console.error("3D table build failed:", err);
            teardown(); ST.built = false;
            failNoGL("Something went wrong while building the scene.");
          }
        }); });
      });
    },

    close: function () {
      var modal = $("spatial-museum-modal");
      if (!ST.open && (!modal || modal.hidden)) return;
      ST.open = false;
      teardown();
      if (modal) modal.hidden = true;
      var d = $("trt-drawer"); if (d) d.hidden = true;
      var q = $("trt-qr"); if (q) q.hidden = true;
      document.body.style.overflow = "";
      document.body.classList.remove("trt-open");
      window.dispatchEvent(new CustomEvent("titan:overlay", { detail: { open: false } }));
      var lf = ST.lastFocus; ST.lastFocus = null;
      if (lf && lf.focus && document.contains(lf)) { var refocus = function () { try { lf.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }; refocus(); setTimeout(function () { if (!ST.open && (document.activeElement === document.body || !document.activeElement)) refocus(); }, 60); }
    },

    setSpecimen: function (rec) { if (rec) { if (ST.scene) inspect(rec); else ST.rec = rec; } },
    setFormat: function (format) {
      if (["slab", "planchet", "flip"].indexOf(format) < 0) return;
      ST.format = format;
      if (ST.scene && ST.rec && kindOf(ST.rec) === "flip") { setSpecimen(ST.rec, true); }
      updateHUDSafe();
    },
    setLighting: function (mode) {
      if (!LIGHT_NAMES[mode]) return;
      ST.lighting = mode;
      if (ST.scene) applyLighting(mode);
      updateHUDSafe();
      announce(LIGHT_NAMES[mode] + " light.");
    },
    flip: flip180, flip90: flip90, resetFront: resetFront,
    next: function () { step(1); }, prev: function () { step(-1); },
    exportAR: function () {
      var ua = navigator.userAgent || "";
      var apple = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
      var android = /Android/i.test(ua);
      if (apple) {
        exportUSDZ(function (url) {
          var a = document.createElement("a"); a.rel = "ar"; a.href = url; a.appendChild(document.createElement("img"));
          document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 2000);
        });
      } else if (android || (isTouch() && isSmallScreen())) startCameraBackdrop();
      else showQR();
    },
    get isOpen() { return ST.open; }
  };
  function updateHUDSafe() { try { updateHUD(); } catch (e) { /* HUD not built yet */ } }
  function step(d) {
    if (!ST.rec) return;
    var list = listFor(ST.rec); if (list.length < 2) return;
    var i = list.indexOf(ST.rec); if (i < 0) i = 0;
    var next = list[(i + d + list.length) % list.length];
    if (ST.scene) inspect(next); else ST.rec = next;
  }
  api._debug = {
    state: function () { return { buildMs: ST.buildMs, open: ST.open, built: ST.built, running: ST.running, renders: ST.renderCount || 0, dpr: ST.dpr, pieces: ST.pieces.map(function (p) { return p.key; }), rec: recKey(ST.rec), format: ST.format, view: ST.view, lighting: ST.lighting, failed: ST.failed, listeners: ST.offs.length, info: ST.renderer ? { geo: ST.renderer.info.memory.geometries, tex: ST.renderer.info.memory.textures, calls: ST.renderer.info.render.calls } : null }; },
    spin: function (yaw, pitch) { rotateSpecimen(yaw || 0, pitch || 0); wake(2); },
    view: setView, camera: function () { return ST.camera ? ST.camera.position.toArray().concat(ST.controls.target.toArray()) : null; },
    appearance: appearanceFor, bullionType: bullionType
  };
  window.TitanSpatial = api;

  // Deep link: ?specimen=SCAN&format=flip&ar=1 (from the desktop QR code)
  function handleUrlParams() {
    var params; try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    var key = params.get("specimen") || params.get("scan");
    if (!key) return;
    var fmt = params.get("format") || "flip", ar = params.get("ar") === "1", tries = 0;
    (function waitVault() {
      if ((window.vault && window.vault.flips) || tries > 40) {
        api.open(key, fmt);
        if (ar) setTimeout(function () { if (ST.open && ST.built) api.exportAR(); }, 1200);
        return;
      }
      tries++; setTimeout(waitVault, 150);
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", handleUrlParams);
  else handleUrlParams();
})(window, document);
