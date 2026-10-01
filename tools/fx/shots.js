const { launch, URL } = require("./lib.js");
const out = process.argv[2], vp = process.argv[3] || "desktop", atmo = process.argv[4] || "afterhours";
const only = process.argv[5] ? process.argv[5].split(",") : null;
const fs=require("fs");
(async () => {
  const { b, p } = await launch(vp);
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.evaluate((a) => { window.TitanSetAtmo(a); }, atmo);
  await p.waitForTimeout(500);
  await p.evaluate((q) => { TitanFX.stop(0); TitanFX.setQuality(q); }, +(process.env.Q || 2));
  await p.waitForTimeout(800);
  const rects = await p.evaluate(() => {
    const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      const t = n.textContent.trim(); if (t.length < 3) continue;
      const e = n.parentElement; if (!e || e.closest("#scene-sheet,.lofi-bar,svg,script,style")) continue;
      const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.5) continue;
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
      if (b.width < 24 || b.height < 8 || b.bottom < 60 || b.top > innerHeight - 90 || b.left < 0 || b.right > innerWidth) continue;
      out.push({ x: Math.floor(b.left), y: Math.floor(b.top), w: Math.ceil(b.width), h: Math.ceil(b.height), fs: parseFloat(cs.fontSize), fw: +cs.fontWeight, t: t.slice(0, 24) });
      if (out.length >= 60) break;
    } return out; });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(`${out}/rects-${vp}-${atmo}.json`, JSON.stringify(rects));
  await p.screenshot({ path: `${out}/_off-${vp}-${atmo}.png` });
  const ids = await p.evaluate(() => TitanFX.presets());
  console.log("presets", ids.join(" "));
  fs.mkdirSync(out, { recursive: true });
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    await p.evaluate((i) => { TitanFX.stop(0); TitanFX.play(i, { intensity: 1 }); }, id);
    await p.waitForTimeout(+(process.env.W || 3000));
    if (id === "storm") { await p.evaluate(() => TitanFX.thunder({})); await p.waitForTimeout(90); }
    await p.screenshot({ path: `${out}/${id}-${vp}-${atmo}.png` });
    console.log(id, JSON.stringify(await p.evaluate(() => TitanFX.stats())));
  }
  console.log("errors", p.errors);
  await b.close();
})();
