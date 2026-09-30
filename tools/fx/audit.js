#!/usr/bin/env node
/* Titan Reliquary: ambience + FX audit (Node + Playwright, no build step).

   Usage (serve the repo first:  python3 -m http.server 8147):
     NODE_PATH=/opt/node22/lib/node_modules node tools/fx/audit.js [options]

   Options:
     --window=S      seconds measured per atmosphere (default 6)
     --settle=S      seconds to wait after a switch before measuring (default 2.2)
     --only=a,b      only these atmospheres
     --layers        also solo every synthesized layer and print its band spectrum
     --layer=a,b     with --layers: only these layers
     --no-atmos      skip the per-atmosphere table and the leak check
     --json=FILE     write the raw results as JSON
     --url=URL       page to load (default http://localhost:8147/index.html?nosplash)

   What it does: loads the app in headless Chromium, taps every connection to an
   AudioDestinationNode (monkey-patched AudioNode.connect, so it measures exactly
   what the speakers get), then for each of the 20 atmospheres calls
   TitanSetAtmo(atmo) and records:
     preset   the ambience preset the engine switched to (must equal the atmosphere)
     LUFS~    ungated K-weighted loudness (BS.1770 filter pair, no gating)
     RMS/peak unweighted, dBFS; crest = peak - RMS
     L-R      channel balance in dB
     bands    share of energy in sub/low/lowmid/mid/presence/air
     clip     samples with |x| >= 0.999
     fx       visual FX flags that are on, and whether the FX canvas is visible
   It then switches through all 20 atmospheres twice more, quickly, and checks
   that pending timers, intervals and window/document listeners do not grow.
   Exit code is non-zero on: missing preset, clipping, silence (< -60 LUFS~),
   or a timer/listener leak. Recorded (hotlinked) loops cannot load in the
   sandbox, so the numbers describe the synthesized engine only. */
"use strict";
const { chromium } = require("playwright");

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] == null ? true : m[2]] : [a, true];
}));
const WINDOW = parseFloat(args.window || "6");
const SETTLE = parseFloat(args.settle || "2.2");
const URL_ = args.url || "http://localhost:8147/index.html?nosplash";
const ATMOS = [
  "afterhours", "conservator", "colossus", "nocturne", "odyssey", "cursedwing", "kaleido", "abyss",
  "neon", "notepad", "construct", "xeno", "solaris", "alchemist", "glacier", "valhalla",
  "dynasty", "zen", "samadhi", "silkroad",
];
const only = args.only ? String(args.only).split(",") : null;
const list = args["no-atmos"] ? [] : only ? ATMOS.filter((a) => only.includes(a)) : ATMOS;

// Injected before any page script runs.
function tapInit() {
  // The app's version poll reloads the page when version.json and data/index.json
  // disagree on generated_at (they currently do); switch auto-refresh off for the audit.
  try { localStorage.setItem("tr_auto_refresh_v1", "0"); } catch (e) { /* ignore */ }
  const T = (window.__fxAudit = {
    timers: new Set(), intervals: new Set(), listeners: 0, meters: null, trace: false, sites: {},
  });
  // --- timer / listener accounting (leak check) ---
  const sT = window.setTimeout, cT = window.clearTimeout, sI = window.setInterval, cI = window.clearInterval;
  window.setTimeout = function (fn, ms, ...r) {
    let id;
    const wrap = typeof fn === "function" ? function () { T.timers.delete(id); return fn.apply(this, arguments); } : fn;
    id = sT.call(window, wrap, ms, ...r); T.timers.add(id); return id;
  };
  window.clearTimeout = function (id) { T.timers.delete(id); return cT.call(window, id); };
  window.setInterval = function (...a) { const id = sI.apply(window, a); T.intervals.add(id); return id; };
  window.clearInterval = function (id) { T.intervals.delete(id); return cI.call(window, id); };
  for (const tgt of [window, document]) {
    const add = tgt.addEventListener.bind(tgt), rem = tgt.removeEventListener.bind(tgt);
    const seen = new Map();
    tgt.addEventListener = function (type, fn, opt) {
      const k = type + "|" + (opt && typeof opt === "object" ? !!opt.capture : !!opt);
      let s = seen.get(k); if (!s) seen.set(k, (s = new Set()));
      if (fn && !s.has(fn)) {
        s.add(fn); T.listeners++;
        if (T.trace) { const site = type + " @ " + ((new Error().stack || "").split("\n")[2] || "").trim(); T.sites[site] = (T.sites[site] || 0) + 1; }
      }
      return add(type, fn, opt);
    };
    tgt.removeEventListener = function (type, fn, opt) {
      const k = type + "|" + (opt && typeof opt === "object" ? !!opt.capture : !!opt);
      const s = seen.get(k);
      if (s && s.has(fn)) { s.delete(fn); T.listeners--; }
      return rem(type, fn, opt);
    };
  }
  // --- audio tap: meter everything that reaches a destination ---
  const origConnect = AudioNode.prototype.connect;
  function meters(ctx) {
    if (ctx.__fxMeters) return ctx.__fxMeters;
    const m = { ctx, raw: null, kw: null, an: null, reset() {} };
    const acc = { n: 0, ss: [0, 0], peak: 0, clip: 0, kss: 0, spec: null, specN: 0 };
    m.acc = acc;
    const sink = ctx.createGain(); sink.gain.value = 0; origConnect.call(sink, ctx.destination);
    const input = ctx.createGain();
    // raw meter
    const sp = ctx.createScriptProcessor(4096, 2, 2);
    sp.onaudioprocess = (e) => {
      if (!m.on) return;
      const L = e.inputBuffer.getChannelData(0), R = e.inputBuffer.getChannelData(1);
      for (let i = 0; i < L.length; i++) {
        const l = L[i], r = R[i];
        acc.ss[0] += l * l; acc.ss[1] += r * r;
        const a = Math.max(Math.abs(l), Math.abs(r));
        if (a > acc.peak) acc.peak = a;
        if (a >= 0.999) acc.clip++;
      }
      acc.n += L.length;
    };
    origConnect.call(input, sp); origConnect.call(sp, sink);
    // K-weighting (BS.1770 stage 1 high shelf + stage 2 high-pass), mono-summed power
    const shelf = ctx.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 1681; shelf.gain.value = 4;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
    const kp = ctx.createScriptProcessor(4096, 2, 2);
    kp.onaudioprocess = (e) => {
      if (!m.on) return;
      const L = e.inputBuffer.getChannelData(0), R = e.inputBuffer.getChannelData(1);
      for (let i = 0; i < L.length; i++) acc.kss += L[i] * L[i] + R[i] * R[i];
    };
    origConnect.call(input, shelf); origConnect.call(shelf, hp); origConnect.call(hp, kp); origConnect.call(kp, sink);
    // spectrum
    const an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0;
    origConnect.call(input, an);
    const fbuf = new Float32Array(an.frequencyBinCount);
    m.poll = setInterval(() => {
      if (!m.on) return;
      an.getFloatFrequencyData(fbuf);
      if (!acc.spec) acc.spec = new Float64Array(fbuf.length);
      for (let i = 0; i < fbuf.length; i++) acc.spec[i] += Math.pow(10, fbuf[i] / 10);
      acc.specN++;
    }, 150);
    m.input = input;
    m.start = () => { acc.n = 0; acc.ss = [0, 0]; acc.peak = 0; acc.clip = 0; acc.kss = 0; acc.spec = null; acc.specN = 0; m.on = true; };
    m.stop = () => {
      m.on = false;
      const db = (x) => (x > 0 ? 10 * Math.log10(x) : -120);
      const n = Math.max(1, acc.n);
      const rmsL = db(acc.ss[0] / n), rmsR = db(acc.ss[1] / n);
      const rms = db((acc.ss[0] + acc.ss[1]) / (2 * n));
      const lufs = -0.691 + db(acc.kss / n);
      const bands = { sub: [20, 60], low: [60, 250], lowmid: [250, 1000], mid: [1000, 4000], pres: [4000, 8000], air: [8000, 20000] };
      const out = {};
      if (acc.spec) {
        const hz = ctx.sampleRate / an.fftSize;
        let tot = 0;
        for (const k of Object.keys(bands)) out[k] = 0;
        for (let i = 1; i < acc.spec.length; i++) {
          const f = i * hz;
          for (const [k, [a, b]] of Object.entries(bands)) if (f >= a && f < b) { out[k] += acc.spec[i]; tot += acc.spec[i]; }
        }
        for (const k of Object.keys(out)) out[k] = tot > 0 ? Math.round((out[k] / tot) * 100) : 0;
      }
      return { lufs, rms, rmsL, rmsR, peak: db(acc.peak * acc.peak), clip: acc.clip, bands: out, secs: acc.n / ctx.sampleRate };
    };
    ctx.__fxMeters = m;
    T.meters = m;
    return m;
  }
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (typeof AudioDestinationNode !== "undefined" && dest instanceof AudioDestinationNode) {
      const m = meters(this.context);
      if (this !== m.input) origConnect.call(this, m.input);
    }
    return origConnect.call(this, dest, ...rest);
  };
}

const pad = (s, n) => String(s).padEnd(n);
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "  -  ");

const BAND_KEYS = ["sub", "low", "lowmid", "mid", "pres", "air"];
const bandStr = (b) => BAND_KEYS.map((k) => String(b && b[k] != null ? b[k] : "-").padStart(3)).join(" ");

// The sandbox is shared: another process may kill Chromium mid-run. Every step
// therefore goes through step(), which reopens the page (and replays the setup)
// and retries once when the browser disappears.
let browser = null, page = null, navs = 0, preGesture = null;
const errors = [];
async function openPage() {
  if (browser) { try { await browser.close(); } catch (e) { /* gone */ } }
  browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  // Service workers blocked: the SW's controllerchange reload would restart the page mid-audit.
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, serviceWorkers: "block" });
  page = await context.newPage();
  navs = 0;
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) navs++; });
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_TUNNEL|ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(tapInit);
  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.TitanAmbient && window.TitanSetAtmo, null, { timeout: 20000 });
  // Autoplay rule: nothing may run before a gesture (checked on the first open only).
  const st = await page.evaluate(() => (window.__fxAudit.meters ? window.__fxAudit.meters.ctx.state : "no-context"));
  if (preGesture == null) preGesture = st;
  await page.mouse.click(5, 5); // stands in for the user's first gesture
}
async function step(fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      if (!page || page.isClosed()) await openPage();
      return await fn(page);
    } catch (e) {
      if (attempt >= 2 || !/closed|crash|Target|destroyed/i.test(String(e))) throw e;
      console.error(`\n  (browser went away: ${String(e).split("\n")[0]}; reopening)`);
      page = null;
    }
  }
}

(async () => {
  let failed = false;
  const results = [];
  for (const atmo of list) {
    const r = await step(async (pg) => {
      await pg.evaluate((a) => window.TitanSetAtmo(a), atmo);
      await pg.waitForTimeout(SETTLE * 1000);
      await pg.evaluate(() => window.__fxAudit.meters && window.__fxAudit.meters.start());
      await pg.waitForTimeout(WINDOW * 1000);
      return pg.evaluate(() => {
        const m = window.__fxAudit.meters;
        const meas = m ? m.stop() : null;
        let st = {};
        try { st = JSON.parse(localStorage.getItem("tr_ambient_v3") || "{}"); } catch (e) { /* ignore */ }
        const api = window.TitanAmbient;
        const cur = api.current ? api.current() : st.preset;
        const known = api.presets().map((p) => p.key);
        const fx = st.fx ? Object.keys(st.fx).filter((k) => st.fx[k]) : [];
        const cv = document.getElementById("rain-canvas");
        return { meas, preset: cur, known: known.includes(cur), fx, canvas: !!(cv && !cv.hidden) };
      });
    });
    r.atmo = atmo;
    results.push(r);
    const m = r.meas || {};
    if (!(r.preset === atmo && r.known) || !(m.lufs > -60) || (m.clip || 0) > 0) failed = true;
    process.stdout.write(".");
  }
  process.stdout.write("\n\n");

  console.log(`Autoplay: AudioContext before first gesture = ${preGesture}`);
  console.log("");
  console.log(pad("atmosphere", 12) + pad("preset", 12) + pad("ok", 4) + pad("LUFS~", 7) + pad("RMS", 7) + pad("peak", 7) + pad("crest", 7) + pad("L-R", 6) + pad("clip", 6) + pad("sub/low/lmid/mid/pres/air %", 29) + pad("canvas", 8) + "fx");
  for (const r of results) {
    const m = r.meas || {};
    console.log(
      pad(r.atmo, 12) + pad(r.preset || "(none)", 12) + pad(r.preset === r.atmo && r.known ? "yes" : "NO", 4) +
      pad(f1(m.lufs), 7) + pad(f1(m.rms), 7) + pad(f1(m.peak), 7) + pad(f1(m.peak - m.rms), 7) +
      pad(f1(m.rmsL - m.rmsR), 6) + pad(m.clip || 0, 6) + pad(bandStr(m.bands), 29) + pad(r.canvas ? "yes" : "no", 8) + (r.fx.join(",") || "-")
    );
  }
  const lu = results.map((r) => r.meas && r.meas.lufs).filter(Number.isFinite);
  if (lu.length) {
    const mean = lu.reduce((a, b) => a + b, 0) / lu.length;
    console.log(`\nLoudness spread: min ${Math.min(...lu).toFixed(1)}  max ${Math.max(...lu).toFixed(1)}  mean ${mean.toFixed(1)} LUFS~ (range ${(Math.max(...lu) - Math.min(...lu)).toFixed(1)} dB)`);
  }

  // Leak check: cycle all atmospheres twice, compare pending timers/listeners.
  if (!args["no-atmos"]) {
  const leakRes = await step(async (pg) => {
    const snap = () => pg.evaluate(() => ({ t: window.__fxAudit.timers.size, i: window.__fxAudit.intervals.size, l: window.__fxAudit.listeners, n: document.body.children.length }));
    await pg.evaluate(() => window.TitanSetAtmo("afterhours"));
    await pg.waitForTimeout(2500);
    const before = await snap();
    await pg.evaluate(() => { window.__fxAudit.trace = true; window.__fxAudit.sites = {}; });
    for (let k = 0; k < 2; k++) {
      for (const a of ATMOS) { await pg.evaluate((x) => window.TitanSetAtmo(x), a); await pg.waitForTimeout(120); }
    }
    await pg.evaluate(() => window.TitanSetAtmo("afterhours"));
    await pg.waitForTimeout(3000);
    const sites = await pg.evaluate(() => window.__fxAudit.sites);
    return { before, after: await snap(), sites };
  });
  const { before, after, sites } = leakRes;
  const leak = after.i > before.i || after.l > before.l || after.t > before.t + 6 || after.n > before.n;
  console.log(`\nLeak check (afterhours -> 40 switches -> afterhours): timers ${before.t}->${after.t}, intervals ${before.i}->${after.i}, listeners ${before.l}->${after.l}, body children ${before.n}->${after.n}  ${leak ? "LEAK?" : "ok"}`);
  if (leak) {
    failed = true;
    const top = Object.entries(sites || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    for (const [s, n] of top) console.log(`   +${n}  ${s}`);
  }
  }

  if (args.layers) {
    console.log("\nSolo layers (synthesized), vol 0.7:");
    console.log(pad("layer", 14) + pad("LUFS~", 7) + pad("RMS", 7) + pad("peak", 7) + pad("crest", 7) + "sub/low/lmid/mid/pres/air %");
    const ids = await step((pg) => pg.evaluate(() => (window.TitanAmbient.layers ? window.TitanAmbient.layers().filter((l) => !l.recorded).map((l) => l.id) : [])));
    const onlyLayers = args.layer ? String(args.layer).split(",") : null;
    const layerRes = [];
    for (const id of ids) {
      if (onlyLayers && !onlyLayers.includes(id)) continue;
      const m = await step(async (pg) => {
        await pg.evaluate(() => window.TitanAmbient.applyPreset("off"));
        await pg.waitForTimeout(1600);
        await pg.evaluate((x) => { window.TitanAmbient.setVol(x, 0.7); window.TitanAmbient.setOn(x, true); }, id);
        await pg.waitForTimeout(1500);
        await pg.evaluate(() => window.__fxAudit.meters.start());
        await pg.waitForTimeout(WINDOW * 1000);
        const mm = await pg.evaluate(() => window.__fxAudit.meters.stop());
        await pg.evaluate((x) => window.TitanAmbient.setOn(x, false), id);
        return mm;
      });
      layerRes.push({ id, m });
      console.log(pad(id, 14) + pad(f1(m.lufs), 7) + pad(f1(m.rms), 7) + pad(f1(m.peak), 7) + pad(f1(m.peak - m.rms), 7) + bandStr(m.bands));
      if (m.clip > 0) failed = true;
    }
    results.push({ layers: layerRes });
  }

  if (navs > 1) { console.log(`\nWARNING: page navigated ${navs - 1} extra time(s) during the audit (reload?)`); failed = true; }
  if (errors.length) {
    console.log("\nConsole errors:");
    for (const e of errors.slice(0, 20)) console.log("  " + e);
    failed = true;
  } else console.log("\nConsole: clean (blocked external hosts ignored)");
  if (args.json) require("fs").writeFileSync(args.json, JSON.stringify(results, null, 1));
  try { await browser.close(); } catch (e) { /* gone */ }
  console.log(failed ? "\nAUDIT: FAIL" : "\nAUDIT: PASS");
  process.exit(failed ? 1 : 0);
})().catch(async (e) => { console.error(e); try { await browser.close(); } catch (_) { /* gone */ } process.exit(2); });
