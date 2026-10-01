#!/usr/bin/env node
/* "What's missing" browser check: A026 shows exactly the master's 18 missing years, no page errors, 48px targets, 18px body,
   AA contrast on several atmospheres, screenshots (Pixel 7 + 1366x820), print preview + PDF, one offline check.
   usage: NODE_PATH=/opt/node22/lib/node_modules node tools/wants_check.js [base=http://localhost:8412/] [outdir] */
const { chromium, devices } = require("playwright");
const fs = require("fs"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8412/";
const OUT = process.argv[3] || "/tmp/wants-shots";
fs.mkdirSync(OUT, { recursive: true });
const master = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "collection", "albums.json"), "utf8"));
const a26 = master.find((a) => a.id === "A026");
const expectYears = a26.slots.filter((s) => s.state === "empty").map((s) => s.label);
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };

const CONTRAST = () => {
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgb = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bgOf = (el) => { let x = el; const layers = []; while (x) { const c = rgb(getComputedStyle(x).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= .99) break; } x = x.parentElement; } let base = [255, 255, 255]; for (const c of layers.reverse()) base = base.map((v, i) => c[i] * c[3] + v * (1 - c[3])); return base; };
  const root = document.getElementById("wants-view"); const bad = []; let n = 0, min = 99;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode; if (!t.nodeValue.trim()) continue; const el = t.parentElement; if (seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || el.offsetParent === null) continue;
    const fg = rgb(cs.color), bg = bgOf(el); const fgc = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const L1 = lum(fgc), L2 = lum(bg); const r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); n++; min = Math.min(min, r);
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    if (r < need) bad.push(el.className + " " + t.nodeValue.trim().slice(0, 24) + " " + r.toFixed(2));
  }
  return { n, min: +min.toFixed(2), bad };
};

(async () => {
  const browser = await chromium.launch({ executablePath: fs.readdirSync("/opt/pw-browsers").some((d) => d === "chromium") ? undefined : undefined });
  const errs = [];
  for (const [name, ctxOpts] of [["pixel7", { ...devices["Pixel 7"], serviceWorkers: "block" }], ["desktop", { viewport: { width: 1366, height: 820 }, serviceWorkers: "block" }]]) {
    const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(name + ": " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(name + " console: " + m.text()); });
    await page.goto(BASE + "?nosplash", { waitUntil: "load" });
    await page.waitForSelector(".hall-wants-entry", { timeout: 15000 });
    await page.screenshot({ path: `${OUT}/${name}-hall.png` });
    const tile = await page.$eval(".hall-wants-entry", (e) => e.getBoundingClientRect().height);
    ok(tile >= 48, `${name}: Hall tile >= 48px tall (${Math.round(tile)})`);
    await page.click(".hall-wants-entry");
    await page.waitForSelector("#wants-view:not([hidden]) .wants-card");
    ok(true, `${name}: view opens from the Hall tile`);
    // A026
    const y = await page.$$eval('[data-vol="A026"] .wants-cell.is-missing .wants-year', (els) => els.map((e) => e.textContent));
    ok(JSON.stringify(y) === JSON.stringify(expectYears), `${name}: A026 shows exactly the master's ${expectYears.length} missing (${y.length}: ${y.join(",")})`);
    const head = await page.$eval('[data-vol="A026"] .wants-count', (e) => e.textContent.trim());
    ok(head === "18 of 36 years missing", `${name}: headline "${head}"`);
    const bodyPx = await page.$eval("#wants-view", (e) => parseFloat(getComputedStyle(e).fontSize));
    ok(bodyPx >= 18, `${name}: body font ${bodyPx}px`);
    const small = await page.$$eval("#wants-view *", (els) => els.filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()) && parseFloat(getComputedStyle(e).fontSize) < 17.9).map((e) => e.className));
    ok(small.length === 0, `${name}: no text under 18px (${small.slice(0, 4).join(",")})`);
    const tiny = await page.$$eval("#wants-view button, #wants-view input:not([type=checkbox]), #wants-view select", (els) => els.filter((e) => e.getBoundingClientRect().height < 48 || e.getBoundingClientRect().width < 48).map((e) => e.id || e.className));
    ok(tiny.length === 0, `${name}: touch targets >= 48px (${tiny.join(",")})`);
    const hx = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(hx, `${name}: no horizontal scroll`);
    // count-only caveat, inferred wording
    const co = await page.$eval('[data-vol="A005"] .wants-caveat', (e) => e.textContent);
    ok(/specific years unknown until the album scan \(Phase 1\.5\)/.test(co), `${name}: count-only caveat: ${co}`);
    ok((await page.$$('[data-vol="A021"] .wants-cell.is-probably')).length > 0, `${name}: inferred-filled slots say "probably here"`);
    // the app's own numbers now come from the master
    await page.screenshot({ path: `${OUT}/${name}-wants-top.png` });
    await page.evaluate(() => { const v = document.getElementById("wants-view"); const c = document.querySelector('[data-vol="A026"]'); v.scrollTop = c.getBoundingClientRect().top - v.getBoundingClientRect().top + v.scrollTop - 8; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/${name}-wants-A026.png` });
    // search / filter
    await page.fill("#wants-q", "silver eagle");
    const vols = await page.$$eval(".wants-card", (e) => e.map((x) => x.dataset.vol));
    ok(vols.join() === "A025,A026" || vols.join() === "A026,A025", `${name}: search "silver eagle" -> ${vols}`);
    await page.fill("#wants-q", "");
    await page.selectOption("#wants-family", "Kennedy halves");
    ok((await page.$$(".wants-card")).length === 3, `${name}: series filter Kennedy halves -> 3 albums`);
    await page.selectOption("#wants-family", "");
    // contrast on several atmospheres
    for (const th of ["afterhours", "notepad", "solaris", "glacier", "neon", "conservator", "zen", "nocturne"]) {
      await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" }).catch(() => {}); await page.evaluate((t) => { document.documentElement.setAttribute("data-atmo", t); }, th);
      await page.waitForTimeout(700);
      const r = await page.evaluate(CONTRAST);
      ok(r.bad.length === 0, `${name}: contrast ${th}: ${r.n} text nodes, min ${r.min}${r.bad.length ? " BAD " + r.bad.slice(0, 3).join(" | ") : ""}`);
      if (name === "desktop" && (th === "notepad" || th === "afterhours")) await page.screenshot({ path: `${OUT}/${name}-wants-${th}.png` });
    }
    await page.evaluate(() => document.documentElement.setAttribute("data-atmo", "afterhours"));
    // print
    await page.fill("#wants-q", "silver eagle");
    await page.evaluate(() => { window.print = () => {}; });
    await page.click("[data-wants-print]");
    await page.emulateMedia({ media: "print" });
    const pr = await page.evaluate(() => { const s = document.getElementById("wants-print"); const cs = getComputedStyle(s); return { disp: cs.display, size: cs.fontSize, color: cs.color, bg: cs.backgroundColor, view: getComputedStyle(document.getElementById("wants-view")).display, hall: document.querySelector("main").getClientRects().length ? "block" : "none", text: s.innerText.slice(0, 400) }; });
    ok(pr.disp === "block" && pr.view === "none" && pr.hall === "none", `${name}: print shows only the list (${JSON.stringify({ d: pr.disp, v: pr.view, m: pr.hall })})`);
    ok(parseFloat(pr.size) >= 24 && pr.color === "rgb(0, 0, 0)" && pr.bg === "rgb(255, 255, 255)", `${name}: print 18pt (${pr.size}) black on white`);
    ok(/1988/.test(pr.text) && /Silver Eagles/.test(pr.text), `${name}: print text has the series and 1988`);
    await page.screenshot({ path: `${OUT}/${name}-print-preview.png`, fullPage: false });
    await page.emulateMedia({ media: "screen" });
    await ctx.close();
  }
  { // print-to-PDF in a fresh context (theme animations on a long-lived page make page.pdf crawl)
    const c = await browser.newContext({ viewport: { width: 1366, height: 820 }, serviceWorkers: "block" }); const p = await c.newPage();
    await p.goto(BASE + "?nosplash"); await p.waitForSelector(".hall-wants-entry"); await p.click(".hall-wants-entry"); await p.waitForSelector("#wants-view:not([hidden]) .wants-card");
    await p.fill("#wants-q", "silver eagle"); await p.evaluate(() => { window.print = () => {}; }); await p.click("[data-wants-print]");
    await p.emulateMedia({ media: "print" }); await p.pdf({ path: `${OUT}/want-list.pdf`, format: "Letter", printBackground: true });
    ok(fs.statSync(`${OUT}/want-list.pdf`).size > 2000, "print PDF written"); await c.close();
  }
  // Study entry + offline (service worker on)
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 } }); const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push("sw: " + e.message));
  await page.goto(BASE + "?nosplash"); await page.waitForSelector(".hall-wants-entry");
  await page.evaluate(() => navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready)); await page.waitForTimeout(4000);   // app.js registers only on https await page.reload(); await page.waitForSelector(".hall-wants-entry"); await page.waitForTimeout(1500);
  await page.click('.wing[data-wing="study"]'); await page.waitForSelector("#study-body [data-open-wants]");
  await page.click("#study-body [data-open-wants]"); await page.waitForSelector("#wants-view:not([hidden]) .wants-card");
  ok(true, "Study button opens the view"); await page.keyboard.press("Escape");
  ok(await page.$eval("#wants-view", (e) => e.hidden), "Escape closes the view");
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector(".wing[data-wing=hall]", { timeout: 15000 }); await page.click(".wing[data-wing=hall]"); await page.waitForSelector(".hall-wants-entry:visible", { timeout: 15000 });
  await page.click(".hall-wants-entry:visible"); await page.waitForSelector("#wants-view:not([hidden]) .wants-card", { timeout: 8000 });
  const off = await page.$$eval('[data-vol="A026"] .wants-cell.is-missing', (e) => e.length);
  ok(off === 18, `offline: A026 still shows 18 missing (${off})`);
  await ctx.close(); await browser.close();
  ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED"); process.exit(fails ? 1 : 0);
})();
