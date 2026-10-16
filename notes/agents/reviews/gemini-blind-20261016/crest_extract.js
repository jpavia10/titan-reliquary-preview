// usage: node extract.js DIR REPO -> DIR/crests.json  {theme: {before, now, gemini}} each {vb, svg}
const fs = require("fs"), path = require("path"), vm = require("vm");
const [dir, repo] = process.argv.slice(2);
function sprite(html) {
  const out = {}, re = /<symbol\s+id="crest-([a-z]+)"([^>]*)>([\s\S]*?)<\/symbol>/g; let m;
  while ((m = re.exec(html))) { const vb = (/viewBox="([^"]+)"/.exec(m[2]) || [, "0 0 200 200"])[1]; out[m[1]] = { vb, svg: m[3].trim() }; }
  return out;
}
function runCrest(file) {
  const got = {};
  const win = { TitanAtmoCrest: (n, mk, vb) => { got[n] = { vb: vb || "0 0 200 200", svg: String(mk) }; },
                TitanAtmo: { defineCrest: (n, mk, vb) => { got[n] = { vb: vb || "0 0 200 200", svg: String(mk) }; }, setCard: () => {} } };
  win.window = win;
  try { vm.runInNewContext(fs.readFileSync(file, "utf8"), { window: win, document: { addEventListener() {}, readyState: "complete" } }); } catch (e) { got.__err = String(e); }
  return got;
}
const before = sprite(fs.readFileSync(path.join(dir, "index_before.html"), "utf8"));
const now = sprite(fs.readFileSync(path.join(dir, "index_now.html"), "utf8"));
// live per-theme JS overrides (wings/atmo/<name>.js that call TitanAtmoCrest)
for (const f of fs.readdirSync(path.join(repo, "wings/atmo"))) {
  if (!/^[a-z]+\.js$/.test(f) || f === "core.js") continue;
  const g = runCrest(path.join(repo, "wings/atmo", f));
  for (const [n, v] of Object.entries(g)) if (n !== "__err") now[n] = Object.assign({ override: "wings/atmo/" + f }, v);
}
const res = {};
for (const f of fs.readdirSync(dir)) {
  const m = /^gem_([a-z]+)\.js$/.exec(f); if (!m) continue;
  const g = runCrest(path.join(dir, f));
  if (g.__err) console.log("ERR", m[1], g.__err);
  res[m[1]] = { before: before[m[1]] || null, now: now[m[1]] || null, gemini: g[m[1]] || null };
}
fs.writeFileSync(path.join(dir, "crests.json"), JSON.stringify(res, null, 1));
for (const [t, v] of Object.entries(res)) {
  const same = v.now && v.gemini && v.now.svg.replace(/\s+/g, "") === v.gemini.svg.replace(/\s+/g, "");
  const changed = v.before && v.now && v.before.svg.replace(/\s+/g, "") !== v.now.svg.replace(/\s+/g, "");
  console.log(t.padEnd(12), "gem", v.gemini ? v.gemini.svg.length : "-", "now", v.now ? v.now.svg.length : "-", v.now && v.now.override ? "(js)" : "", "live==gemini:", !!same, "changed since before:", !!changed);
}
