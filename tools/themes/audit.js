#!/usr/bin/env node
/* Titan Reliquary · atmosphere (theme) audit
 * ------------------------------------------------------------------------
 * For every atmosphere x wing x viewport it:
 *   (a) measures WCAG contrast of the token pairs that matter and of every
 *       visible text element (effective fg composited over its effective bg),
 *   (b) finds colours that do not follow the theme (hard-coded fg/bg that stay
 *       identical in all atmospheres) and maps them to CSS rules / inline
 *       styles; plus a static scan of styles.css and app.js for literals,
 *   (c) screenshots every state and builds a contact sheet per atmosphere and
 *       overview sheets per wing,
 *   (d) checks that every atmosphere has a swatch, a crest, a picker card, a
 *       pre-paint entry, an ATMOS entry and the full token contract.
 *
 * Usage (serve the repo root first, e.g. `python3 -m http.server 8148`):
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/themes/audit.js [options]
 * Options:
 *   --base URL        app root (default http://localhost:8148/)
 *   --out DIR         output dir (default tools/themes/out)
 *   --themes a,b      only these atmospheres (default: all, from app.js ATMO_ORDER)
 *   --wings a,b       default hall,gallery,vault,study,lab
 *   --vps a,b         desktop (1300x820), phone (390x844); default both
 *   --no-shots        skip screenshots/contact sheets (faster)
 *   --static          static checks only (no browser)
 *   --scroll N        also capture a second shot N px down each wing (default 0 = off)
 * Outputs: OUT/report.json, OUT/report.md, OUT/sheets/<theme>.jpg,
 *          OUT/sheets/_overview_<vp>_<wing>.jpg, OUT/shots/*.jpg
 * One browser, one page; atmospheres are switched in place. Animations and
 * transitions are frozen (reduced motion + injected CSS) for stable colours.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);
function opt(name, def) {
  const i = args.indexOf("--" + name);
  if (i === -1) return def;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const BASE = String(opt("base", "http://localhost:8148/")).replace(/\/?$/, "/");
const OUT = path.resolve(String(opt("out", path.join(ROOT, "tools/themes/out"))));
const WINGS = String(opt("wings", "hall,gallery,vault,study,lab")).split(",").filter(Boolean);
const VPS_ALL = { desktop: { width: 1300, height: 820 }, phone: { width: 390, height: 844 } };
const VPS = String(opt("vps", "desktop,phone")).split(",").filter((v) => VPS_ALL[v]);
const SHOTS = !opt("no-shots", false);
const STATIC_ONLY = !!opt("static", false);
const SCROLL = Number(opt("scroll", 0)) || 0;

/* ---------------- token contract (keep in sync with notes/agents/themes.md) --------------- */
const CONTRACT = {
  core: ["--bg", "--bg2", "--surface", "--surface2", "--ink", "--muted", "--faint", "--gold", "--gold-soft",
    "--gold-deep", "--line", "--line-strong", "--ok", "--warn", "--bad", "--shadow"],
  component: ["--th-bg", "--tabgrad1", "--tabgrad2", "--foot-bg", "--ph-bg", "--sel-bg", "--hold-bg",
    "--drawerbar-bg", "--cardmeta", "--skeleton1", "--skeleton2", "--toastgrad1", "--toastgrad2", "--row-hover", "--grain-op"],
  semantic: ["--on-gold", "--focus", "--elev-1", "--elev-2", "--elev-3", "--scrim", "--scheme"],
  motion: ["--wing-dur", "--wing-rise"],
};
/* per-theme design choices that may legitimately inherit the default */
const OPTIONAL = ["--font", "--mono", "--serif", "--radius", "--ease-out"];
const REQUIRED = [...CONTRACT.core, ...CONTRACT.component];
/* token pairs: [fg, bg, minimum ratio, label] */
const PAIRS = [
  ["--ink", "--bg", 7, "body text on page"],
  ["--ink", "--surface", 7, "body text on cards"],
  ["--ink", "--surface2", 4.5, "text on raised surface"],
  ["--ink", "--th-bg", 7, "table header text"],
  ["--muted", "--bg", 4.5, "secondary text on page"],
  ["--muted", "--surface", 4.5, "secondary text on cards"],
  ["--muted", "--surface2", 4.5, "secondary text on chips"],
  ["--faint", "--bg", 3, "hint text / disabled (non-body)"],
  ["--faint", "--surface", 3, "hint text on cards"],
  ["--gold", "--bg", 4.5, "accent text on page"],
  ["--gold", "--surface", 4.5, "accent text on cards"],
  ["--gold-soft", "--surface", 4.5, "soft accent on cards"],
  ["--gold-soft", "--bg", 4.5, "soft accent on page"],
  ["--cardmeta", "--surface", 4.5, "card meta text"],
  ["--ok", "--surface", 4.5, "OK chip text"],
  ["--warn", "--surface", 4.5, "warning chip text"],
  ["--bad", "--surface", 4.5, "error chip text"],
  ["--on-gold", "--gold", 4.5, "text on gold buttons"],
  ["--focus", "--bg", 3, "focus ring vs page (non-text)"],
  ["--focus", "--surface", 3, "focus ring vs cards (non-text)"],
];

/* ---------------- colour maths ---------------- */
function parseRGBA(s) {
  if (!s) return null;
  s = String(s).trim();
  let m = s.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  return null;
}
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function over(top, bot) { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; }
function ratio(fg, bg) { const a = lum(fg) + 0.05, b = lum(bg) + 0.05; return a > b ? a / b : b / a; }
function hex(c) { return c ? "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") : "?"; }

/* ---------------- tiny CSS parser (rules with line numbers; skips keyframes/font-face) ---------------- */
function parseCss(text, file) {
  const rules = [];
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  let i = 0, line = 1, prelude = "", preludeLine = 1;
  const stack = [];
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === "\n") line++;
    if (ch === '"' || ch === "'") { // strings in preludes (attribute selectors)
      const q = ch; let j = i + 1;
      while (j < n && src[j] !== q) { if (src[j] === "\\") j++; if (src[j] === "\n") line++; j++; }
      prelude += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (ch === "{") {
      const pre = prelude.trim();
      if (/^@(-webkit-)?keyframes|^@font-face|^@property|^@page/i.test(pre)) {
        let depth = 1, j = i + 1;
        while (j < n && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; else if (src[j] === "\n") line++; j++; }
        i = j; prelude = ""; continue;
      }
      if (pre.startsWith("@")) { stack.push(pre); prelude = ""; i++; continue; }
      // style rule: read body until matching } (respect strings and parens)
      let j = i + 1, depth = 0, body = "", q = null;
      const bodyLine = line;
      while (j < n) {
        const c = src[j];
        if (q) { if (c === "\\") { body += c + src[j + 1]; j += 2; continue; } if (c === q) q = null; }
        else if (c === '"' || c === "'") q = c;
        else if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === "}" && depth <= 0) break;
        if (c === "\n") line++;
        body += c; j++;
      }
      const decls = [];
      let buf = "", d = 0, qq = null, dl = bodyLine;
      for (let k = 0; k <= body.length; k++) {
        const c = body[k];
        if (c === undefined || (c === ";" && !d && !qq)) {
          const t = buf.trim();
          const ci = t.indexOf(":");
          if (ci > 0) decls.push({ prop: t.slice(0, ci).trim().toLowerCase(), value: t.slice(ci + 1).trim(), line: dl + (buf.match(/^\s*/)[0].split("\n").length - 1) });
          dl += (buf.match(/\n/g) || []).length; buf = ""; continue;
        }
        if (qq) { if (c === qq) qq = null; } else if (c === '"' || c === "'") qq = c; else if (c === "(") d++; else if (c === ")") d--;
        buf += c;
      }
      rules.push({ file, selector: pre.replace(/\s+/g, " "), line: preludeLine, at: stack.slice(), decls });
      i = j + 1; prelude = ""; continue;
    }
    if (ch === "}") { stack.pop(); prelude = ""; i++; continue; }
    if (ch === ";" && prelude.trim().startsWith("@")) { prelude = ""; i++; continue; } // @import/@charset
    if (!prelude.trim()) preludeLine = line;
    prelude += ch; i++;
  }
  return rules;
}
const COLOR_LIT = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black)\b/i;
function literalOnly(v) { return COLOR_LIT.test(v) && !/var\(/.test(v); }

/* ---------------- static checks ---------------- */
function readMaybe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return null; } }
function listCss() {
  const files = ["styles.css"];
  for (const dir of ["styles", "styles/atmo"]) {
    const d = path.join(ROOT, dir);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) if (f.endsWith(".css") && !f.startsWith("_")) files.push(dir + "/" + f);
  }
  return files;
}
function staticAudit() {
  const indexHtml = readMaybe(path.join(ROOT, "index.html")) || "";
  const appJs = readMaybe(path.join(ROOT, "app.js")) || "";
  const orderM = appJs.match(/const ATMO_ORDER = \[([\s\S]*?)\]/);
  const order = orderM ? [...orderM[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]) : [];
  const atmosM = appJs.match(/const ATMOS = \{([\s\S]*?)\n\s*\};/);
  const atmosKeys = atmosM ? [...atmosM[1].matchAll(/^\s*"?([a-z0-9-]+)"?\s*:\s*\{/gm)].map((m) => m[1]) : [];
  const preM = indexHtml.match(/__tr_ok\s*=\s*\[([^\]]*)\]/);
  const prepaint = preM ? [...preM[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]) : [];
  const cssFiles = listCss();
  const allRules = [];
  for (const f of cssFiles) allRules.push(...parseCss(readMaybe(path.join(ROOT, f)) || "", f));
  const themes = order.length ? order : atmosKeys;

  // token declarations per theme (a selector list item exactly `html[data-atmo="x"]`, or :root for the default)
  const declared = {};
  const rootDecl = new Set();
  for (const t of themes) declared[t] = new Set();
  for (const r of allRules) {
    if (r.at.some((a) => /prefers-reduced-motion|print/.test(a))) continue;
    const sels = r.selector.split(",").map((s) => s.trim());
    for (const s of sels) {
      if (s === ":root" || s === "html") r.decls.forEach((d) => d.prop.startsWith("--") && rootDecl.add(d.prop));
      const m = s.match(/^html\[data-atmo=["']?([a-z0-9-]+)["']?\]$/);
      if (m && declared[m[1]]) r.decls.forEach((d) => d.prop.startsWith("--") && declared[m[1]].add(d.prop));
    }
  }
  const union = new Set();
  for (const t of themes) declared[t].forEach((p) => union.add(p));
  const coverage = {};
  for (const t of themes) {
    const have = new Set(declared[t]);
    if (t === "afterhours") rootDecl.forEach((p) => have.add(p)); // :root IS afterhours
    const missingRequired = REQUIRED.filter((p) => !have.has(p));
    const missingSemantic = CONTRACT.semantic.filter((p) => !have.has(p));
    const missingMotion = CONTRACT.motion.filter((p) => !have.has(p));
    const missingVsOthers = [...union].filter((p) => !have.has(p) && !REQUIRED.includes(p) && !CONTRACT.semantic.includes(p) && !CONTRACT.motion.includes(p) && !OPTIONAL.includes(p));
    coverage[t] = { missingRequired, missingSemantic, missingMotion, missingVsOthers };
  }

  // presence checks (static half; runtime re-checks crest/swatch/card rendering)
  const presence = {};
  const crestJs = {};
  const atmoJsDir = path.join(ROOT, "wings/atmo");
  if (fs.existsSync(atmoJsDir)) for (const f of fs.readdirSync(atmoJsDir)) {
    const txt = readMaybe(path.join(atmoJsDir, f)) || "";
    for (const m of txt.matchAll(/TitanAtmoCrest\(\s*["']([a-z0-9-]+)["']\s*,\s*[`"']/g)) crestJs[m[1]] = "wings/atmo/" + f;
  }
  for (const t of themes) {
    const swatch = allRules.some((r) => r.selector.split(",").some((s) => s.trim() === ".sw-" + t));
    presence[t] = {
      atmosEntry: atmosKeys.includes(t),
      prepaint: prepaint.includes(t),
      card: indexHtml.includes(`data-atmo-val="${t}"`),
      crest: indexHtml.includes(`id="crest-${t}"`) || !!crestJs[t],
      crestOverride: crestJs[t] || null,
      swatch,
    };
  }
  const listDrift = {
    prepaintExtra: prepaint.filter((t) => !themes.includes(t)),
    prepaintMissing: themes.filter((t) => !prepaint.includes(t)),
    atmosMissing: themes.filter((t) => !atmosKeys.includes(t)),
  };

  // hard-coded colours in CSS: declarations outside theme-scoped rules
  const cssHard = [];
  const PROPS = /^(color|-webkit-text-fill-color|background|background-color|background-image|border|border-(top|right|bottom|left)(-color)?|border-color|outline(-color)?|fill|stroke|caret-color|accent-color)$/;
  for (const r of allRules) {
    if (r.file !== "styles.css") continue;
    const scoped = r.selector.split(",").every((s) => /^\s*(html\[data-atmo|:root|\.sw-|#notepad|#construct|#matrix|#kaleido|#neon|#xeno|#odyssey)/.test(s));
    if (scoped) continue;
    for (const d of r.decls) {
      if (!PROPS.test(d.prop) || !literalOnly(d.value)) continue;
      if (/^(border|outline)/.test(d.prop) && /rgba\([^)]*,\s*0?\.0\d\)/.test(d.value)) continue; // near-invisible hairlines
      const kind = /^(color|-webkit-text-fill-color|fill|caret-color)$/.test(d.prop) ? "text" : /^background/.test(d.prop) ? "surface" : "line";
      cssHard.push({ kind, file: r.file, line: d.line, selector: r.selector.slice(0, 160), prop: d.prop, value: d.value.slice(0, 120) });
    }
  }
  // hard-coded colours in app.js templates / inline style writes
  const jsHard = [];
  appJs.split("\n").forEach((ln, i) => {
    const inTpl = /style\s*=\s*["'`][^"'`]*?(#[0-9a-f]{3,8}\b|rgba?\()/i.test(ln) ||
      /\.style\.(color|background|backgroundColor|borderColor|fill|stroke)\s*=\s*["'`][^"'`]*(#[0-9a-f]{3,8}\b|rgba?\()/i.test(ln) ||
      /(fill|stroke|stop-color)\s*=\s*["'`]?(#[0-9a-f]{3,8}\b|rgba?\()/i.test(ln) ||
      /(color|background)\s*:\s*(#[0-9a-f]{3,8}\b|rgba?\()/i.test(ln);
    if (inTpl) jsHard.push({ line: i + 1, text: ln.trim().slice(0, 200) });
  });
  return { themes, order, atmosKeys, prepaint, cssFiles, coverage, presence, listDrift, cssHard, jsHard, union: [...union].sort() };
}

/* ---------------- in-page scanners (serialised into the page) ---------------- */
function pageTokens(names) {
  const cs = getComputedStyle(document.documentElement);
  const probe = document.createElement("i");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const out = {};
  for (const n of names) {
    const raw = cs.getPropertyValue(n).trim();
    let rgba = null;
    if (raw && !/gradient|url\(/.test(raw)) {
      probe.style.color = "";
      probe.style.color = raw;
      if (probe.style.color) rgba = getComputedStyle(probe).color;
    }
    out[n] = { raw, rgba };
  }
  probe.remove();
  out.__scheme = cs.colorScheme;
  return out;
}

function pageScan(opts) {
  const A = (window.__audit = window.__audit || { ids: new WeakMap(), next: 1, fg: new Map(), bg: new Map(), refs: new Map() });
  const csCache = new Map();
  const cs = (el) => { let c = csCache.get(el); if (!c) { c = getComputedStyle(el); csCache.set(el, c); } return c; };
  const P = (s) => {
    const m = s && s.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
    if (!m) return null;
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  };
  const L = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (t, b) => { const a = t[3]; return [t[0] * a + b[0] * (1 - a), t[1] * a + b[1] * (1 - a), t[2] * a + b[2] * (1 - a), 1]; };
  const R = (f, b) => { const x = L(f) + 0.05, y = L(b) + 0.05; return x > y ? x / y : y / x; };
  const H = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const rootBg = P(cs(document.body).backgroundColor);
  const htmlBg = P(cs(document.documentElement).backgroundColor);
  let base = rootBg && rootBg[3] > 0 ? rootBg : htmlBg && htmlBg[3] > 0 ? htmlBg : [255, 255, 255, 1];
  if (base[3] < 1) base = over(base, [255, 255, 255, 1]);

  // effective background candidates (darkest + lightest) under an element
  const bgMemo = new Map();
  function bgOf(el) {
    if (bgMemo.has(el)) return bgMemo.get(el);
    let res;
    if (!el || el === document.body || el === document.documentElement) res = { c: [base, base], img: false, layers: 0 };
    else {
      const s = cs(el);
      const under = bgOf(el.parentElement);
      if (under.img) res = under;
      else {
        const bi = s.backgroundImage;
        if (bi && bi !== "none" && /url\(/.test(bi) && !/url\(["']?data:image\/svg/.test(bi)) res = { c: under.c, img: true };
        else {
          let cands = under.c;
          const layer = [];
          if (bi && bi !== "none" && /gradient/.test(bi)) {
            const stops = (bi.match(/rgba?\([^)]*\)/g) || []).map(P).filter(Boolean);
            if (stops.length) layer.push(stops);
          }
          const bc = P(s.backgroundColor);
          const op = parseFloat(s.opacity);
          const next = [];
          for (const u of cands) {
            let v = u;
            if (bc && bc[3] > 0) v = over([bc[0], bc[1], bc[2], bc[3] * (op < 1 ? op : 1)], v);
            if (layer.length) for (const st of layer[0]) next.push(over(st, v)); else next.push(v);
          }
          next.sort((a, b) => L(a) - L(b));
          cands = next.length > 2 ? [next[0], next[next.length - 1]] : next;
          res = { c: cands, img: false };
        }
      }
    }
    bgMemo.set(el, res);
    return res;
  }
  function opacityChain(el) {
    let o = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e);
      o *= parseFloat(s.opacity);
      if (s.visibility === "hidden" || s.display === "none") return 0;
    }
    return o;
  }
  function sig(el) {
    const cls = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + [...e.classList].slice(0, 3).map((c) => "." + c).join("");
    const p = el.parentElement;
    return (p && p !== document.body ? cls(p) + " > " : "") + cls(el);
  }
  const roots = [document.getElementById("pane-" + opts.wing), ...opts.chrome.map((s) => document.querySelector(s))].filter(Boolean);
  const vh = innerHeight;
  const seen = new Set();
  const fails = [];
  let checked = 0, skippedImg = 0, smallTight = 0, minRatio = 99;
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.nodeValue.trim()) continue;
      const el = tn.parentElement;
      if (!el || seen.has(el) || el.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
      seen.add(el);
      if (el.closest("[aria-hidden='true'],[hidden],script,style,noscript,.pane:not(.active),#tr-splash")) continue;
      const rects = el.getClientRects();
      if (!rects.length) continue;
      const r0 = el.getBoundingClientRect();
      if (r0.width < 2 || r0.height < 2) continue;
      if (opts.viewportOnly && (r0.bottom < 0 || r0.top > vh)) continue;
      const s = cs(el);
      const op = opacityChain(el);
      if (op < 0.08) continue;
      const fill = s.webkitTextFillColor;
      if (fill && P(fill) && P(fill)[3] === 0) continue; // gradient text (background-clip:text)
      const fgRaw = P(fill && fill !== s.color ? fill : s.color);
      if (!fgRaw || fgRaw[3] === 0) continue;
      const bg = bgOf(el);
      if (bg.img) { skippedImg++; continue; }
      checked++;
      const fg = [fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * op];
      let worst = 99, worstBg = bg.c[0];
      for (const b of bg.c) { const rr = R(over(fg, b), b); if (rr < worst) { worst = rr; worstBg = b; } }
      const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      if (worst < minRatio) minRatio = worst;
      let id = A.ids.get(el);
      if (!id) { id = A.next++; A.ids.set(el, id); A.refs.set(id, new WeakRef(el)); }
      if (opts.track) {
        if (!A.fg.has(id)) { A.fg.set(id, new Set()); A.bg.set(id, new Set()); }
        A.fg.get(id).add(H(fgRaw) + (fgRaw[3] < 1 ? "/" + fgRaw[3].toFixed(2) : ""));
        A.bg.get(id).add(H(worstBg));
      }
      if (size < 13 && worst >= need && worst < 7) smallTight++;
      if (worst < need) {
        fails.push({ id, sig: sig(el), text: tn.nodeValue.trim().slice(0, 40), ratio: +worst.toFixed(2), need, fg: H(over(fg, worstBg)), bg: H(worstBg), size: +size.toFixed(1), inline: /(#[0-9a-f]{3,8}|rgba?\()/i.test(el.getAttribute("style") || "") ? (el.getAttribute("style") || "").slice(0, 120) : "" });
      }
    }
  }
  return { checked, skippedImg, smallTight, minRatio: +minRatio.toFixed(2), fails };
}

/* resolve which rules paint a fixed colour on the given element ids */
function pageSources(ids) {
  const A = window.__audit;
  const lit = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\bwhite\b|\bblack\b/i;
  const rules = [];
  const walk = (list, href) => {
    for (const r of list) {
      if (r.cssRules && !r.selectorText) { try { walk(r.cssRules, href); } catch (_) {} continue; }
      if (!r.selectorText || !r.style) continue;
      const fg = r.style.getPropertyValue("color") || r.style.getPropertyValue("-webkit-text-fill-color");
      const bg = r.style.getPropertyValue("background-color") || r.style.getPropertyValue("background-image") || r.style.getPropertyValue("background");
      const fgLit = fg && lit.test(fg) && !/var\(/.test(fg) ? fg : "";
      const bgLit = bg && lit.test(bg) && !/var\(/.test(bg) ? bg : "";
      if (fgLit || bgLit) rules.push({ sel: r.selectorText, href, fg: fgLit, bg: bgLit });
    }
  };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, (sh.href || "inline").replace(location.origin, "").split("?")[0]); } catch (_) {} }
  const out = {};
  for (const id of ids) {
    const el = A.refs.get(id) && A.refs.get(id).deref();
    if (!el) continue;
    const fgSet = A.fg.get(id), bgSet = A.bg.get(id);
    const hits = [];
    // walk the element and its ancestors for bg sources, the element only for fg
    for (let e = el, depth = 0; e && e !== document.body && depth < 6; e = e.parentElement, depth++) {
      for (const r of rules) {
        if (/data-atmo/.test(r.sel)) continue;
        if (depth > 0 && !r.bg) continue;
        let m = false; try { m = e.matches(r.sel); } catch (_) {}
        if (m) hits.push({ depth, sel: r.sel.slice(0, 140), href: r.href, fg: depth ? "" : r.fg.slice(0, 60), bg: r.bg.slice(0, 80) });
      }
      const st = e.getAttribute("style") || "";
      if (lit.test(st)) hits.push({ depth, inline: st.slice(0, 140) });
      if (hits.length >= 6) break;
    }
    out[id] = { fgVariants: fgSet ? fgSet.size : 0, bgVariants: bgSet ? bgSet.size : 0, fgs: fgSet ? [...fgSet].slice(0, 4) : [], hits: hits.slice(0, 6) };
  }
  return out;
}

/* finish every running CSS animation so we measure/screenshot end states
   (headless frames are sparse under load; entrance fades can sit at opacity 0) */
function settle() {
  for (const a of document.getAnimations()) { try { a.finish(); } catch (_) { try { a.cancel(); } catch (__) {} } }
}

/* ---------------- runtime audit ---------------- */
async function runtimeAudit(st) {
  const { chromium } = require("playwright");
  const themes = String(opt("themes", "")).split(",").filter(Boolean);
  const list = themes.length ? st.themes.filter((t) => themes.includes(t)) : st.themes;
  fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "sheets"), { recursive: true });
  let browser, ctx, page, restarts = 0;
  const consoleErrors = [];
  const origin = new URL(BASE).origin;
  async function boot(vp) {
    for (let i = 0; ; i++) {
      try { return await boot1(vp); } catch (e) {
        if (i >= 4) throw e;
        console.log(`\n  ! boot failed (${String(e.message || e).split("\n")[0].slice(0, 100)}), retrying`);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }
  async function boot1(vp) {
    if (browser) { try { await browser.close(); } catch (_) {} }
    browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
    ctx = await browser.newContext({ viewport: VPS_ALL[vp], deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "dark" });
    await ctx.route("**/*", (route) => { const u = route.request().url(); if (u.startsWith(origin) || u.startsWith("data:") || u.startsWith("blob:")) return route.continue(); return route.abort(); });
    page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error" && !/ERR_TUNNEL|ERR_FAILED|net::ERR_/.test(m.text())) consoleErrors.push(m.text().slice(0, 240)); });
    page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 240)));
    await page.addInitScript(() => { try { localStorage.setItem("tr_atmo_v1", "afterhours"); } catch (_) {} });
    await page.goto(BASE + "index.html?nosplash", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TitanSetAtmo && window.setWing && window.TitanVault && window.TitanVault(), null, { timeout: 45000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;caret-color:transparent!important}#toast,.toast{display:none!important}" });
  }
  await boot(VPS[0]);
  const allTokens = [...CONTRACT.core, ...CONTRACT.component, ...CONTRACT.semantic, "--row-hover"];
  const result = { themes: {}, consoleErrors, states: 0, restarts: 0 };
  const chrome = ["header", ".topbar", "nav.wings", ".wings", ".foot", "#nav"];
  const t0 = Date.now();
  for (const t of list) result.themes[t] = { tokens: null, pairs: [], states: {}, fails: 0, failSigs: {}, checked: 0, smallTight: 0, runtime: {} };
  async function themeVp(t, vp) {
    await page.evaluate((a) => window.TitanSetAtmo(a, false, false), t);
    await page.waitForTimeout(120);
    await page.evaluate(settle);
    const T = result.themes[t];
    if (!T.tokens) {
      const tokens = await page.evaluate(pageTokens, allTokens);
      const pairs = [];
      for (const [f, b, need, label] of PAIRS) {
        const fc = parseRGBA(tokens[f] && tokens[f].rgba), bc = parseRGBA(tokens[b] && tokens[b].rgba);
        if (!fc || !bc) { pairs.push({ fg: f, bg: b, need, label, ratio: null, pass: null, note: !fc ? f + " undefined" : b + " undefined" }); continue; }
        const bgo = bc[3] < 1 ? over(bc, parseRGBA(tokens["--bg"].rgba) || [0, 0, 0, 1]) : bc;
        const rr = ratio(over(fc, bgo), bgo);
        pairs.push({ fg: f, bg: b, need, label, ratio: +rr.toFixed(2), pass: rr >= need });
      }
      T.runtime = await page.evaluate((a) => {
        const sym = document.getElementById("crest-" + a);
        const card = document.querySelector(`.atmo-card[data-atmo-val="${a}"]`);
        const sw = card && card.querySelector(".atmo-swatch");
        const scs = sw && getComputedStyle(sw);
        return {
          crestShapes: sym ? sym.querySelectorAll("path,circle,ellipse,polygon,rect,line,polyline").length : 0,
          crestSrc: sym ? sym.getAttribute("data-crest-src") || "index.html" : null,
          card: !!card, cardName: card ? (card.querySelector(".atmo-card-name") || {}).textContent : null,
          swatchPainted: !!(scs && (scs.backgroundImage !== "none" || !/rgba\(0, 0, 0, 0\)/.test(scs.backgroundColor))),
          scheme: getComputedStyle(document.documentElement).colorScheme,
        };
      }, t);
      T.tokens = tokens; T.pairs = pairs;
    }
    const rows = [];
    for (const w of WINGS) {
      await page.evaluate((w) => { window.setWing(w); window.scrollTo(0, 0); }, w);
      await page.waitForTimeout(w === "gallery" ? 450 : 250);
      await page.evaluate(settle);
      const scan = await page.evaluate(pageScan, { wing: w, chrome, viewportOnly: false, track: vp === VPS[0] });
      if (SHOTS) {
        const ts = Date.now();
        await page.screenshot({ path: path.join(OUT, "shots", `${t}_${vp}_${w}.jpg`), type: "jpeg", quality: 62, timeout: 90000 });
        if (process.env.AUDIT_DEBUG) console.log(" shot", t, w, Date.now() - ts, "ms");
        if (SCROLL) {
          await page.evaluate((y) => window.scrollTo(0, y), SCROLL);
          await page.waitForTimeout(120);
          await page.screenshot({ path: path.join(OUT, "shots", `${t}_${vp}_${w}_s.jpg`), type: "jpeg", quality: 62, timeout: 90000 });
        }
      }
      rows.push([w, scan]);
    }
    for (const [w, scan] of rows) {
      const key = vp + "/" + w;
      T.states[key] = { checked: scan.checked, fails: scan.fails.length, minRatio: scan.minRatio, skippedImg: scan.skippedImg };
      T.fails += scan.fails.length; T.checked += scan.checked; T.smallTight += scan.smallTight;
      for (const f of scan.fails) {
        const s = (T.failSigs[f.sig] = T.failSigs[f.sig] || { sig: f.sig, n: 0, min: 99, text: f.text, fg: f.fg, bg: f.bg, need: f.need, size: f.size, where: new Set(), ids: new Set(), inline: f.inline });
        s.n++; s.where.add(key); s.ids.add(f.id);
        if (f.ratio < s.min) { s.min = f.ratio; s.fg = f.fg; s.bg = f.bg; s.text = f.text; }
      }
      result.states++;
    }
  }
  for (const vp of VPS) {
    await page.setViewportSize(VPS_ALL[vp]);
    for (const t of list) {
      for (let attempt = 0; ; attempt++) {
        try { await themeVp(t, vp); break; } catch (e) {
          if (attempt >= 2) throw e;
          result.restarts = ++restarts;
          console.log(`\n  ! ${t}/${vp}: ${String(e.message || e).split("\n")[0].slice(0, 120)} -> restarting browser`);
          await boot(vp);
        }
      }
      process.stdout.write(`\r${vp} ${t.padEnd(12)} ${result.states} states  ${((Date.now() - t0) / 1000).toFixed(0)}s   `);
    }
  }
  process.stdout.write("\n");
  // cross-theme: which failing elements keep the same colour in every atmosphere?
  const ids = new Set();
  for (const t of list) for (const s of Object.values(result.themes[t].failSigs)) [...s.ids].slice(0, 2).forEach((i) => ids.add(i));
  const src = ids.size ? await page.evaluate(pageSources, [...ids]) : {};
  const hardFails = {};
  for (const t of list) {
    const T = result.themes[t];
    T.failSigs = Object.values(T.failSigs).map((s) => {
      const info = [...s.ids].map((i) => src[i]).find(Boolean);
      const fixedFg = !!(info && info.fgVariants === 1 && list.length > 3);
      const fixedBg = !!(info && info.bgVariants === 1 && list.length > 3);
      const out = { sig: s.sig, n: s.n, min: s.min, need: s.need, text: s.text, fg: s.fg, bg: s.bg, size: s.size, where: [...s.where], fixedFg, fixedBg, inline: s.inline, sources: info ? info.hits : [] };
      if (fixedFg || fixedBg) {
        const h = (hardFails[s.sig] = hardFails[s.sig] || { sig: s.sig, themes: [], fixedFg, fixedBg, text: s.text, sources: out.sources, inline: s.inline });
        h.themes.push(t);
      }
      return out;
    }).sort((a, b) => a.min - b.min);
  }
  result.hardFails = Object.values(hardFails).sort((a, b) => b.themes.length - a.themes.length);

  // contact sheets
  if (SHOTS) {
    const sheet = await ctx.newPage();
    const img = (f) => { const p = path.join(OUT, "shots", f); return fs.existsSync(p) ? "data:image/jpeg;base64," + fs.readFileSync(p).toString("base64") : ""; };
    const css = "body{margin:0;background:#1b1b1d;color:#eee;font:13px system-ui,sans-serif;padding:14px}h1{font:600 20px system-ui;margin:0 0 4px}.meta{color:#aaa;margin-bottom:10px}.row{display:flex;gap:8px;margin-bottom:10px;align-items:flex-start}.cell{display:flex;flex-direction:column;gap:3px}.cell img{display:block;border:1px solid #333}.lbl{color:#bbb;font-size:12px}.chips{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0 10px}.chip{display:flex;align-items:center;gap:4px;font:11px ui-monospace,monospace;color:#ccc;background:#262629;padding:2px 6px 2px 2px;border-radius:4px}.chip i{width:16px;height:16px;border-radius:3px;border:1px solid #555;display:inline-block}.bad{color:#ff8a80}.good{color:#9ccc65}.grid{display:grid;gap:10px}";
    for (const t of list) {
      const T = result.themes[t];
      const chips = ["--bg", "--surface", "--surface2", "--ink", "--muted", "--faint", "--gold", "--gold-soft", "--gold-deep", "--ok", "--warn", "--bad"].map((k) => `<span class="chip"><i style="background:${(T.tokens[k] || {}).raw || "transparent"}"></i>${k.slice(2)}</span>`).join("");
      const pf = T.pairs.filter((p) => p.pass === false).length;
      const rows = VPS.map((vp) => `<div class="row">${WINGS.map((w) => `<div class="cell"><img src="${img(`${t}_${vp}_${w}.jpg`)}" width="${vp === "desktop" ? 380 : 170}"><span class="lbl">${vp} · ${w} · ${(T.states[vp + "/" + w] || {}).fails ?? "?"} fails</span></div>`).join("")}</div>`).join("");
      await sheet.setContent(`<style>${css}</style><h1>${t}</h1><div class="meta">text contrast fails: <b class="${T.fails ? "bad" : "good"}">${T.fails}</b> of ${T.checked} checked · token-pair fails: <b class="${pf ? "bad" : "good"}">${pf}</b> · scheme: ${T.runtime.scheme}</div><div class="chips">${chips}</div>${rows}`);
      await sheet.waitForTimeout(60);
      await sheet.screenshot({ path: path.join(OUT, "sheets", `${t}.jpg`), type: "jpeg", quality: 70, fullPage: true });
    }
    for (const vp of VPS) for (const w of WINGS) {
      const cols = vp === "desktop" ? 5 : 10, width = vp === "desktop" ? 300 : 150;
      const cells = list.map((t) => `<div class="cell"><img src="${img(`${t}_${vp}_${w}.jpg`)}" width="${width}"><span class="lbl">${t} · ${(result.themes[t].states[vp + "/" + w] || {}).fails ?? "?"} fails</span></div>`).join("");
      await sheet.setContent(`<style>${css}</style><h1>${vp} · ${w}</h1><div class="grid" style="grid-template-columns:repeat(${cols},${width}px)">${cells}</div>`);
      await sheet.waitForTimeout(60);
      await sheet.screenshot({ path: path.join(OUT, "sheets", `_overview_${vp}_${w}.jpg`), type: "jpeg", quality: 70, fullPage: true });
    }
    await sheet.close();
  }
  await browser.close();
  result.seconds = Math.round((Date.now() - t0) / 1000);
  return result;
}

/* ---------------- report ---------------- */
function writeReport(st, rt) {
  fs.mkdirSync(OUT, { recursive: true });
  const rep = { generated: new Date().toISOString(), base: BASE, wings: WINGS, vps: VPS, static: st, runtime: rt };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(rep, null, 1));
  const L = [];
  L.push(`# Atmosphere audit · ${rep.generated}`, "");
  L.push(`Wings: ${WINGS.join(", ")} · viewports: ${VPS.join(", ")}${rt ? ` · ${rt.states} states in ${rt.seconds}s` : " · static only"}`, "");
  const d = st.listDrift;
  L.push("## Registry drift", "", `- pre-paint list extra: ${d.prepaintExtra.join(", ") || "none"}; missing: ${d.prepaintMissing.join(", ") || "none"}`, `- ATMOS missing: ${d.atmosMissing.join(", ") || "none"}`, "");
  L.push("## Per-theme summary", "", "| theme | text fails | fail sigs | min ratio | pair fails | small<7:1 | missing required | missing semantic | swatch | crest | card | pre-paint |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
  let totFails = 0, totPairs = 0, totMissing = 0, totSig = 0;
  for (const t of st.themes) {
    const c = st.coverage[t], p = st.presence[t], T = rt && rt.themes[t];
    const pf = T ? T.pairs.filter((x) => x.pass === false) : [];
    const min = T ? Math.min(...Object.values(T.states).map((s) => s.minRatio)) : null;
    if (T) { totFails += T.fails; totPairs += pf.length; totSig += T.failSigs.length; }
    totMissing += c.missingRequired.length;
    L.push(`| ${t} | ${T ? T.fails : "-"} | ${T ? T.failSigs.length : "-"} | ${T ? min.toFixed(2) : "-"} | ${T ? pf.length : "-"} | ${T ? T.smallTight : "-"} | ${c.missingRequired.join(" ") || "0"} | ${c.missingSemantic.length} | ${p.swatch ? "y" : "NO"}${T && !T.runtime.swatchPainted ? "(unpainted)" : ""} | ${p.crest ? "y" : "NO"}${T ? "(" + T.runtime.crestShapes + ")" : ""}${p.crestOverride ? "*" : ""} | ${p.card ? "y" : "NO"} | ${p.prepaint ? "y" : "NO"} |`);
  }
  L.push("", `**Totals:** text contrast fails ${rt ? totFails : "-"} (unique signatures ${rt ? totSig : "-"}), token-pair fails ${rt ? totPairs : "-"}, missing required tokens ${totMissing}, hard-coded CSS literals ${st.cssHard.length} (text ${st.cssHard.filter((x) => x.kind === "text").length}), app.js literal lines ${st.jsHard.length}` + (rt ? `, theme-blind failing elements ${rt.hardFails.length}, console errors ${rt.consoleErrors.length}` : ""), "");
  if (rt) {
    L.push("## Token pairs (failures only)", "");
    for (const t of st.themes) {
      const T = rt.themes[t]; if (!T) continue;
      const pf = T.pairs.filter((x) => x.pass === false);
      if (pf.length) L.push(`- **${t}**: ` + pf.map((x) => `${x.fg.slice(2)}/${x.bg.slice(2)} ${x.ratio} (<${x.need})`).join(", "));
    }
    L.push("", "## Theme-blind colours that fail somewhere (fixed fg or bg in every atmosphere)", "");
    for (const h of rt.hardFails.slice(0, 60)) {
      const s = (h.sources || []).map((x) => x.inline ? `inline(${x.inline.slice(0, 70)})` : `${x.href}: \`${x.sel}\` ${x.fg ? "color:" + x.fg : ""} ${x.bg ? "bg:" + x.bg.slice(0, 40) : ""}`).slice(0, 3).join(" ; ");
      L.push(`- \`${h.sig}\` "${h.text}" — ${h.fixedFg ? "fixed fg" : ""}${h.fixedFg && h.fixedBg ? " + " : ""}${h.fixedBg ? "fixed bg" : ""}; fails in ${h.themes.length}: ${h.themes.join(", ")}. Source: ${s || "?"}`);
    }
    L.push("", "## Worst failing signatures per theme (top 8)", "");
    for (const t of st.themes) {
      const T = rt.themes[t]; if (!T || !T.failSigs.length) continue;
      L.push(`### ${t}`, "");
      for (const s of T.failSigs.slice(0, 8)) L.push(`- ${s.min} (<${s.need}) \`${s.sig}\` "${s.text}" fg ${s.fg} on ${s.bg}, ${s.size}px, x${s.n} in ${s.where.join(" ")}${s.fixedFg ? " [fixed fg]" : ""}${s.fixedBg ? " [fixed bg]" : ""}`);
      L.push("");
    }
    if (rt.consoleErrors.length) L.push("## Console errors", "", ...rt.consoleErrors.map((e) => "- " + e), "");
  }
  L.push("## Missing tokens vs other themes (non-contract extras)", "");
  for (const t of st.themes) if (st.coverage[t].missingVsOthers.length) L.push(`- ${t}: ${st.coverage[t].missingVsOthers.join(" ")}`);
  L.push("", "## app.js lines with literal colours (for wing owners)", "", ...st.jsHard.map((j) => `- app.js:${j.line} \`${j.text.replace(/`/g, "'").slice(0, 150)}\``), "");
  L.push("## styles.css text colours hard-coded outside theme blocks", "", ...st.cssHard.filter((x) => x.kind === "text").map((x) => `- ${x.file}:${x.line} \`${x.selector.slice(0, 90)}\` ${x.prop}: ${x.value}`), "");
  fs.writeFileSync(path.join(OUT, "report.md"), L.join("\n"));
  return { totFails, totPairs, totMissing, totSig };
}

(async () => {
  const st = staticAudit();
  let rt = null;
  if (!STATIC_ONLY) rt = await runtimeAudit(st);
  const tot = writeReport(st, rt);
  console.log(`themes ${st.themes.length} · text fails ${rt ? tot.totFails : "-"} (${rt ? tot.totSig : "-"} sigs) · pair fails ${rt ? tot.totPairs : "-"} · missing required ${tot.totMissing} · css literals ${st.cssHard.length} · app.js literal lines ${st.jsHard.length}${rt ? " · console errors " + rt.consoleErrors.length : ""}`);
  console.log("report: " + path.join(OUT, "report.md"));
})().catch((e) => { console.error(e); process.exit(1); });
