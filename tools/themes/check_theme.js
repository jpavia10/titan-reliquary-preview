#!/usr/bin/env node
/* Standard per-theme checker.  usage: NODE_PATH=/opt/node22/lib/node_modules node tools/themes/check_theme.js NAME PORT OUTDIR [--phone]
   Loads http://localhost:PORT/index.html?nosplash, forces data-atmo=NAME, visits hall/gallery/vault/study/lab, saves a desktop screenshot of each
   (and phone with --phone), and reports WCAG contrast failures of every visible text element (needs 4.5:1, or 3:1 for large text). Reuses ONE browser. */
const { chromium } = require('playwright');
const fs = require('fs');
const [name, port, out] = process.argv.slice(2);
const phone = process.argv.includes('--phone');
if (!name || !port || !out) { console.error(__doc__ || 'usage: check_theme.js NAME PORT OUTDIR [--phone]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const WINGS = ['hall', 'gallery', 'vault', 'study', 'lab'];
const contrastFn = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); if (c && c.a > 0) stack.push(c); if (c && c.a >= 1) break; } let base = { r: 0, g: 0, b: 0, a: 1 }; const root = parse(getComputedStyle(document.body).backgroundColor); if (root && root.a > 0) base = { ...root, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base); return base; };
  const bad = []; let n = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode() && n < 1500) {
    const t = walker.currentNode; if (!t.nodeValue.trim()) continue; const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight * 3) continue;
    if (el.closest('#tr-splash,script,style,[aria-hidden="true"]')) continue;
    const fg = parse(cs.color); if (!fg) continue; n++;
    const bg = bgOf(el); const c = ratio(over(fg, bg), bg);
    const px = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight) || 400; const large = px >= 24 || (px >= 18.66 && w >= 700);
    if (c < (large ? 3 : 4.5)) bad.push({ c: +c.toFixed(2), sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''), txt: t.nodeValue.trim().slice(0, 28), px });
  }
  bad.sort((a, b) => a.c - b.c); return { checked: n, failures: bad.length, worst: bad.slice(0, 6) };
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const sizes = [['d', { width: 1300, height: 820 }]].concat(phone ? [['p', { width: 390, height: 844 }]] : []);
  const report = { theme: name, wings: {} };
  for (const [tag, vp] of sizes) {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
    await p.goto(`http://localhost:${port}/index.html?nosplash`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4500);
    await p.evaluate((n) => document.documentElement.setAttribute('data-atmo', n), name); await p.waitForTimeout(500);
    for (const w of WINGS) {
      await p.evaluate((w) => window.setWing && window.setWing(w), w); await p.waitForTimeout(w === 'vault' ? 1800 : 900);
      if (w === 'vault') { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(600); }
      await p.screenshot({ path: `${out}/${name}_${w}_${tag}.png` });
      if (tag === 'd') report.wings[w] = await p.evaluate(contrastFn);
    }
    if (tag === 'd') report.tokens = await p.evaluate(() => Object.fromEntries(['--bg', '--surface', '--ink', '--muted', '--faint', '--gold', '--gold-soft', '--line', '--elev-1', '--focus', '--on-gold'].map((k) => [k, getComputedStyle(document.documentElement).getPropertyValue(k).trim() || null])));
    report.errors = (report.errors || []).concat(errs);
    await ctx.close();
  }
  await b.close();
  const total = Object.values(report.wings).reduce((s, w) => s + w.failures, 0);
  console.log(JSON.stringify(report, null, 1)); console.log(`\nTOTAL contrast failures: ${total} across ${WINGS.length} wings (desktop)`);
})();
