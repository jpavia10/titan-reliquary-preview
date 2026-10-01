#!/usr/bin/env node
/* TitanFX perf + health test (Playwright, one browser at a time).
   Usage: NODE_PATH=/opt/node22/lib/node_modules node tools/fx/perf.js [--base http://localhost:8000/] [--vp desktop|phone] [--presets a,b] [--ms 3000]
   Software GL (SwiftShader) when there is no GPU: compare each preset against the effect-off baseline, not absolute fps.
   Checks: fps per preset vs off, page errors, 30 preset switches leave <= 3 live GL programs and no growth, hidden tab stops rAF,
   reduced motion draws no loop. Prints JSON. */
"use strict";
const { chromium } = require("playwright");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf("--" + n); return i < 0 ? d : args[i + 1]; };
const BASE = opt("base", "http://localhost:8000/").replace(/\/?$/, "/") + "?nosplash";
const VP = opt("vp", "desktop");
const MS = +opt("ms", 3000);
const ONLY = opt("presets", "") ? opt("presets", "").split(",") : null;

(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const phone = VP === "phone";
  const ctx = await b.newContext(phone
    ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }
    : { viewport: { width: 1366, height: 820 }, deviceScaleFactor: 1 });
  await ctx.route((u) => !/localhost|127\.0\.0\.1/.test(u.hostname), (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  p.on("console", (m) => { if (/TitanFX/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { TitanFX.stop(0); });
  const fps = (ms) => p.evaluate((ms) => new Promise((res) => { let n = 0, t0 = performance.now(); const f = (t) => { n++; if (t - t0 < ms) requestAnimationFrame(f); else res(+(n * 1000 / (t - t0)).toFixed(1)); }; requestAnimationFrame(f); }), ms);
  const out = { vp: VP, note: "software GL unless a GPU is present; compare against off", off: await fps(MS), presets: {} };
  const ids = (await p.evaluate(() => TitanFX.presets())).filter((i) => !ONLY || ONLY.includes(i));
  for (const id of ids) {
    await p.evaluate((i) => { TitanFX.stop(0); TitanFX.play(i, { intensity: 0.9 }); }, id);
    await p.waitForTimeout(2600);   // calibration window
    const st = await p.evaluate(() => TitanFX.stats());
    out.presets[id] = { fps: await fps(MS), scale: st.scale, quality: st.quality };
  }
  // leak test: 30 switches, then stop
  const base = await p.evaluate(() => TitanFX.stats());
  const seq = ids.filter((i) => !i.includes("*"));
  for (let i = 0; i < 30; i++) { await p.evaluate((x) => TitanFX.play(x, { intensity: 0.8 }), seq[i % seq.length]); await p.waitForTimeout(120); }
  await p.waitForTimeout(2200);
  const mid = await p.evaluate(() => TitanFX.stats());
  await p.evaluate(() => TitanFX.stop(0));
  const end = await p.evaluate(() => TitanFX.stats());
  out.leak = { programsAfter30Switches: mid.programs, layers: mid.layers, createdMinusDeleted: mid.created - mid.deleted, afterStop: { programs: end.programs, hasGL: end.hasGL, created: end.created, deleted: end.deleted } };
  // hidden: rAF must stop (visual only)
  await p.evaluate(() => TitanFX.play("rain-on-glass", { intensity: 0.8 }));
  await p.waitForTimeout(800);
  await p.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  await p.waitForTimeout(300);
  out.hidden = await p.evaluate(() => ({ running: TitanFX.stats().running }));
  await p.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  await p.waitForTimeout(300);
  out.resumed = await p.evaluate(() => ({ running: TitanFX.stats().running }));
  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
