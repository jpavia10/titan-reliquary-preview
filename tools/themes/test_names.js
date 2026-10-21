#!/usr/bin/env node
/* Theme names test (Grok 2026-10-20). Each id must either read as its display name (the id's word is in the name, ignoring case
   and spaces), or be listed in TITAN_WORLD_ALIASES with exactly that name. Every failure line prints "Display Name (id)". */
const fs = require("fs"), path = require("path"), vm = require("vm");
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../wings/themes/manifest.js"), "utf8"), { window: win });
const W = win.TITAN_WORLDS, AL = win.TITAN_WORLD_ALIASES || {}, label = win.TitanWorldLabel;
let bad = 0;
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
for (const w of W) {
  const reads = norm(w.name).includes(norm(w.id));
  if (!reads && AL[w.id] !== w.name) { bad++; console.log("FAIL: " + label(w.id) + " reads like a different name; add it to TITAN_WORLD_ALIASES"); }
  else if (reads && AL[w.id]) { bad++; console.log("FAIL: " + label(w.id) + " is listed as an alias but its id already reads as its name"); }
}
for (const id of Object.keys(AL)) if (!W.some((w) => w.id === id)) { bad++; console.log("FAIL: alias for unknown id " + id); }
if (label("valhalla") !== "Gilded Armory (valhalla)") { bad++; console.log("FAIL: label() must print Display Name (id)"); }
console.log(bad ? bad + " FAILED" : "ALL PASS (" + W.length + " themes, " + Object.keys(AL).length + " aliases)"); process.exit(bad ? 1 : 0);
