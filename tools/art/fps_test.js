// Hall scroll fps on Pixel 7 emulation at 4x CPU, with the Prism hero backdrop off and on.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/art/fps_test.js [port]
const { chromium, devices } = require("playwright");
const port = process.argv[2] || "8167";
(async () => {
  const b = await chromium.launch();
  for (const bd of [false, true]) {
    const ctx = await b.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
    const p = await ctx.newPage();
    const c = await ctx.newCDPSession(p);
    await c.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.goto(`http://localhost:${port}/?nosplash`, { waitUntil: "load" });
    await p.waitForTimeout(1500);
    await p.evaluate((on) => { window.TITAN_WORLD_BACKDROP = on; window.TitanWorlds.apply("kaleido"); }, bd);
    await p.waitForTimeout(1500);
    const fps = await p.evaluate(() => new Promise((res) => {
      let n = 0, t0 = performance.now(), y = 0;
      const step = () => { n++; y += 14; window.scrollTo(0, y % 3000); if (performance.now() - t0 < 3000) requestAnimationFrame(step); else res(n / ((performance.now() - t0) / 1000)); };
      requestAnimationFrame(step);
    }));
    console.log("backdrop", bd, "fps", fps.toFixed(1), "heroart attr", await p.evaluate(() => document.documentElement.hasAttribute("data-world-art")));
    await ctx.close();
  }
  await b.close();
})();
