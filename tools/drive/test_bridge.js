#!/usr/bin/env node
/* Test of the Drive side of the intake bridge (tools/drive/intake_bridge.gs) with stand-ins for the Apps Script services:
     node tools/drive/test_bridge.js
   It cannot run in Google from here, so this checks the script's logic: the key, the listing (text, Google-Doc files, the size caps,
   STAGING), the tick (trash merged + duplicate, .REJECTED.txt notes, leave held and changed files), the WORK QUEUE doc copies (only when a
   page changed; the doc-status line dropped), a tick pinned to a commit, and finally that tools/bridge/intake.py accepts the listing. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), os = require("os"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..", "..");
let fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log("FAIL " + msg); } }

/* ---------- stand-ins ---------- */
let nextId = 1;
function iter(list) { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; }
class File {
  constructor(name, text, opts = {}) {
    this.id = opts.id || "f" + nextId++; this.name = name; this.text = text; this.mime = opts.mime || "text/plain";
    this.updated = opts.updated || new Date("2026-10-10T08:00:00Z"); this.trashed = false; this.size = opts.size != null ? opts.size : Buffer.byteLength(text || "");
  }
  getId() { return this.id; } getName() { return this.name; } getSize() { return this.size; } getMimeType() { return this.mime; }
  getLastUpdated() { return this.updated; } isTrashed() { return this.trashed; } setTrashed(v) { this.trashed = v; }
  getBlob() { const t = this.text; return { getDataAsString: () => t }; }
}
class Folder {
  constructor(name) { this.name = name; this.files = []; this.folders = []; }
  add(f) { this.files.push(f); return f; }
  sub(name) { const f = new Folder(name); this.folders.push(f); return f; }
  getFiles() { return iter(this.files.slice()); }
  getFoldersByName(n) { return iter(this.folders.filter(f => f.name === n)); }
  getFilesByName(n) { return iter(this.files.filter(f => f.name === n && !f.trashed)); }
  createFile(name, text, mime) { return this.add(new File(name, text, { mime })); }
  searchFiles(q) {
    const m = /title contains '([^']+)'/.exec(q);
    return iter(this.files.filter(f => !f.trashed && f.mime === "application/vnd.google-apps.document" && f.name.includes(m[1])));
  }
}
const root = new Folder("Titan Reliquary");
const drop = root.sub("collection-incoming (AI change files)");
const staging = root.sub("STAGING (drop coin photos here)");
root.sub("bakeoff (blind photo test)");
const docs = {};
for (const ai of ["Grok", "Muse", "Gemini"]) {
  const d = root.add(new File(`WORK QUEUE for ${ai} (keep going: when one task is done, start the next)`, "", { mime: "application/vnd.google-apps.document" }));
  docs[d.getId()] = { title: d.name, text: "old", writes: 0 };
}
const props = {};
const raw = {};            // url without query -> text (missing = 404)
const fetched = [];
const triggers = [];
const sandbox = {
  console,
  DriveApp: { getFolderById: () => root },
  DocumentApp: { openById: id => ({ getBody: () => ({ setText: t => { docs[id].text = t; docs[id].writes++; } }) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
  UrlFetchApp: { fetch: url => { fetched.push(url); const u = url.split("?")[0]; const has = u in raw;
    return { getResponseCode: () => (has ? 200 : 404), getContentText: () => raw[u] }; } },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
  Utilities: { getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
               computeDigest: (alg, text) => Array.from(crypto.createHash("sha256").update(text, "utf8").digest()).map(b => (b > 127 ? b - 256 : b)) },
  ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1),
               newTrigger: h => ({ timeBased: () => ({ everyHours: () => ({ create: () => triggers.push({ getHandlerFunction: () => h }) }) }) }),
               getService: () => ({ getUrl: () => "https://script.google.com/macros/s/ABC/dev" }) },
  MimeType: { PLAIN_TEXT: "text/plain" },
  Logger: { log: () => {} },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "intake_bridge.gs"), "utf8"), sandbox, { filename: "intake_bridge.gs" });
const B = sandbox;
const RAW = "https://raw.githubusercontent.com/jpavia10/titan-reliquary-preview/";
const page = ai => fs.readFileSync(path.join(ROOT, "docs", "agents", `QUEUE_${ai}.md`), "utf8");
for (const ai of ["grok", "muse", "gemini"]) raw[RAW + `main/docs/agents/QUEUE_${ai}.md`] = page(ai);

/* ---------- install ---------- */
B.installAll();
ok(props.BR_KEY && props.BR_KEY.length === 64, "installAll makes a 64-character key");
ok(triggers.length === 1 && triggers[0].getHandlerFunction() === "tick", "installAll sets one hourly tick");
B.installAll();
ok(triggers.length === 1, "running installAll twice still leaves one tick trigger");
ok(B.showSecret() === props.BR_KEY, "showSecret prints the key (the URL comes from the Deploy dialog)");
const key = props.BR_KEY;
const gemDoc = Object.values(docs).find(d => d.title.startsWith("WORK QUEUE for Gemini"));
ok(gemDoc.writes === 1 && gemDoc.text.startsWith("# WORK QUEUE for Gemini"), "the first tick copies the page into the doc, without the doc-status line");
B.tick();
ok(gemDoc.writes === 1, "an unchanged page is not written again");
raw[RAW + "main/docs/agents/QUEUE_gemini.md"] = page("gemini") + "\nnew line\n";
B.tick();
ok(gemDoc.writes === 2 && gemDoc.text.endsWith("new line\n"), "a changed page is written again");

/* ---------- the listing ---------- */
const call = q => JSON.parse(B.doGet({ parameter: q }).s);
ok(call({ key: "wrong", op: "list" }).error === "bad key", "a wrong key gets nothing");
ok(call({ op: "list" }).error === "bad key", "no key gets nothing");
const sheet = fs.readFileSync(path.join(ROOT, "docs", "agents", "homework", "sheets", "HW-gemini-verify-20261009-1.jsonl"), "utf8").split("\n")[0];
const ev = JSON.parse(sheet); ev.source = "https://en.numista.com/catalogue/pieces112.html: mintage table row '2003 A' = 20 475 000"; ev.ts = "2026-10-10T08:30:00Z";
const fGood = drop.add(new File("changes_gemini_20261010-0830.jsonl", JSON.stringify(ev) + "\n"));
const fDoc = drop.add(new File("changes_muse_20261010-0831.jsonl", "", { mime: "application/vnd.google-apps.document", size: 0 }));
const fBig = drop.add(new File("changes_grok_20261010-0832.jsonl", "x", { size: 4000000 }));
const fNote = drop.add(new File("access_gemini_20261010-0833.txt", "a: ok"));
const fOld = drop.add(new File("changes_muse_20261008-2302.jsonl.REJECTED.txt", "old note"));
const fGone = drop.add(new File("changes_muse_20261001-0000.jsonl", "{}")); fGone.trashed = true;
staging.add(new File("NOID_Peru_1990_sol_obv.jpg", "", { updated: new Date("2026-10-10T07:00:00Z") }));
staging.add(new File("NOID_Peru_1990_sol_rev.jpg", "", { updated: new Date("2026-10-10T07:01:00Z") }));
const L = call({ key, op: "list" });
ok(L.kind === "titan-bridge/1" && !L.error, "the listing has the right kind");
const byName = Object.fromEntries(L.drop.map(f => [f.name, f]));
ok(byName["changes_gemini_20261010-0830.jsonl"].text === fGood.text, "a change file comes with its text");
ok(byName["changes_muse_20261010-0831.jsonl"].note && !("text" in byName["changes_muse_20261010-0831.jsonl"]), "a Google Doc named like a change file is flagged, not read");
ok(!("text" in byName["changes_grok_20261010-0832.jsonl"]) && byName["changes_grok_20261010-0832.jsonl"].size === 4000000, "a file over 3 MB is listed without text");
ok(!("text" in byName["access_gemini_20261010-0833.txt"]), "a note is listed without text");
ok(!byName["changes_muse_20261001-0000.jsonl"], "trashed files are not listed");
ok(L.staging.count === 2 && L.staging.newest[0].name === "NOID_Peru_1990_sol_rev.jpg", "STAGING: count and newest first");
ok(L.tick && L.tick.at, "the listing reports the last tick");
// the 8 MB cap per listing defers the rest
const many = []; for (let i = 0; i < 4; i++) many.push(drop.add(new File(`changes_muse_20261010-09${i}0.jsonl`, "y".repeat(2500000))));
const L2 = call({ key, op: "list" });
ok(L2.drop.filter(f => f.deferred).length >= 1, "past 8 MB in one listing, the rest is deferred");
many.forEach(f => (f.trashed = true));

/* ---------- the tick ---------- */
const fRej = drop.add(new File("changes_grok_20261010-0836.jsonl", "{}"));
const fHeld = drop.add(new File("answers_owner_20261010-0834.json", "{}"));
const fChanged = drop.add(new File("changes_muse_20261010-0840.jsonl", "{}"));
const fDup = drop.add(new File("changes_grok_20261001-1821.jsonl", "{}"));
const rec = (f, outcome, extra = {}) => Object.assign({ name: f.name, updated: f.updated.toISOString(), outcome, at: "2026-10-10T09:00:00Z", run: "bridge-test", summary: outcome }, extra);
const processed = { files: {
  [fGood.id]: rec(fGood, "merged"), [fDup.id]: rec(fDup, "duplicate"),
  [fRej.id]: rec(fRej, "rejected", { report: ["line 1 is written as 'model:muse'; a file named for grok may only carry grok's own lines"] }),
  [fHeld.id]: rec(fHeld, "held"),
  [fChanged.id]: rec(fChanged, "merged", { updated: "2026-10-10T07:59:00.000Z" }),
} };
raw[RAW + "abc1234/docs/agents/bridge/processed.json"] = JSON.stringify(processed);
for (const ai of ["grok", "muse", "gemini"]) raw[RAW + `abc1234/docs/agents/QUEUE_${ai}.md`] = page(ai);
const st = call({ key, op: "tick", sha: "abc1234" });
ok(st.ref === "abc1234" && fetched.some(u => u.startsWith(RAW + "abc1234/docs/agents/bridge/processed.json")), "op=tick reads the files at that exact commit");
ok(fGood.trashed && fDup.trashed, "merged and duplicate files go to the trash");
ok(fRej.trashed && drop.files.some(f => f.name === "changes_grok_20261010-0836.jsonl.REJECTED.txt" && /may only carry grok's own lines/.test(f.text) && /NEW time stamp/.test(f.text)),
   "a rejected file is trashed and leaves a note with the reason");
ok(!fHeld.trashed && !fChanged.trashed && !fNote.trashed && !fOld.trashed, "held, changed and other files stay");
ok(st.errors.length === 0, "the tick had no errors: " + JSON.stringify(st.errors));
B.tick("abc1234");
ok(drop.files.filter(f => f.name.endsWith("0836.jsonl.REJECTED.txt")).length === 1, "a second tick does not write the note twice");
ok(call({ key, op: "tick", sha: "not a sha;rm" }).ref === "main", "a malformed sha falls back to main");
ok(call({ key, op: "nope" }).error === "unknown op", "an unknown op is refused");

/* ---------- the other half accepts the listing ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-js-"));
try {
  const lp = path.join(tmp, "listing.json"); fs.writeFileSync(lp, JSON.stringify(L));
  const r = cp.spawnSync("python3", [path.join(ROOT, "tools", "bridge", "intake.py"), "run", "--listing", lp, "--dry-run", "--now", "2026-10-10T09:00:00Z"], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  ok(r.status === 0, "intake.py takes the listing (exit " + r.status + "): " + out.slice(-400));
  ok(/stage\s+changes_gemini_20261010-0830\.jsonl/.test(out), "intake.py would merge the Gemini file");
  ok(/held\s+changes_muse_20261010-0831\.jsonl: the bridge could not read the file's text \(it is a Google document/.test(out), "intake.py holds the Google Doc with the bridge's note");
  ok(/rejected\s+changes_grok_20261010-0832\.jsonl: the file is 4,000,000 bytes/.test(out), "intake.py rejects the 4 MB file");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
