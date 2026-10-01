// Themes picker test: screenshots (Pixel 7 + 1366x820), page errors, horizontal scroll, Hall fps with hero art.
//   python3 -m http.server 8167 &   NODE_PATH=/opt/node22/lib/node_modules node tools/art/ui_test.js [--port 8167] [--out notes/agents/theme-art]
const { chromium, devices } = require("playwright");
const fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = arg("port", "8167"), OUT = arg("out", "notes/agents/theme-art"), BASE = `http://localhost:${PORT}/`;
const SHOW = (arg("themes", "kaleido,afterhours,glacier,neon")).split(",");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const [label, ctxOpts] of [["phone", { ...devices["Pixel 7"], serviceWorkers: "block" }], ["desk", { viewport: { width: 1366, height: 820 }, serviceWorkers: "block" }]]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
    await page.goto(BASE + "?nosplash", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.click("#btn-atmo");
    await page.waitForSelector("#scene-sheet:not([hidden]) .th-card");
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/themes-${label}.png` });
    for (const id of SHOW) {
      await page.click(`.th-card[data-world="${id}"]`);
      await page.waitForTimeout(900);
      await page.evaluate(() => window.TitanScene && window.TitanScene.close());
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/applied-${id}-${label}.png` });
      await page.evaluate(() => window.TitanScene.openThemes());
      await page.waitForTimeout(300);
    }
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    report.push({ label, errors, horizontalScroll: hs });
    await ctx.close();
  }
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
