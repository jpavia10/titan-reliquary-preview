/**
 * Titan Reliquary · intake bridge, the Drive side (Google Apps Script; fix list #92). Install once (docs/INTAKE_BRIDGE.md).
 *
 * The GitHub job .github/workflows/intake.yml cannot see inside Drive folders, so this script does two things for it:
 *  1. doGet (a web app, "Execute as: me", "Anyone"; every call needs the secret key):
 *       ?key=K&op=list           lists the drop folder "collection-incoming (AI change files)" with the text of every change file
 *                                (changes_{agent}_{YYYYMMDD-HHMM}.jsonl, answers_owner_*.json; at most 3 MB each, 8 MB per listing),
 *                                plus how many photos wait in STAGING and how many blind photo tests wait in "bakeoff (blind photo test)".
 *                                It never changes anything.
 *       ?key=K&op=tick&sha=S     the GitHub job calls this right after it pushed commit S: run tick() against that exact commit.
 *  2. tick (hourly trigger, and on op=tick):
 *       - reads docs/agents/bridge/processed.json from GitHub (what the job did with each Drive file, by file id + last-updated time):
 *         merged or duplicate -> the file goes to the Drive trash (recoverable for 30 days; owner rule: a processed file is deleted);
 *         rejected -> a note {name}.REJECTED.txt with the reasons is left next to it, and the file goes to the trash;
 *         held -> left alone (Claude looks at it). A file changed since the job saw it is left alone too: the next job run reads it.
 *       - copies docs/agents/QUEUE_{grok,muse,gemini}.md into the Drive docs "WORK QUEUE for {AI}" whenever the page changed.
 * The only secret is the key (Script properties, made by installAll). The repo is public, so nothing secret is ever read from it.
 *
 * Install (the whole guide: docs/INTAKE_BRIDGE.md):
 *  1. script.google.com -> New project "Titan Reliquary". Code.gs = tools/drive/sync_to_drive.gs (the daily backup); add a script file
 *     "Bridge" = this file. Save.
 *  2. Run installAll once and approve the permissions (Drive, Docs, external requests).
 *  3. Deploy -> New deployment -> type Web app -> Execute as: Me, Who has access: Anyone -> Deploy. Copy the Web app URL (ends in /exec)
 *     into the GitHub repo secret DRIVE_BRIDGE_URL (the repo -> Settings -> Secrets and variables -> Actions -> New repository secret).
 *  4. Run showSecret: it prints the key. Put it into a second repo secret, DRIVE_BRIDGE_KEY. Never paste either into a chat.
 *  (The URL comes from the Deploy dialog because ScriptApp.getService().getUrl() can return the editor's test URL instead.)
 */
var BR_REPO = "jpavia10/titan-reliquary-preview";
var BR_BRANCH = "main";
var BR_ROOT_ID = "1c1GrFz7QbDYtBG6f77zprlpVJrOBuPvU";          // Drive "Titan Reliquary" (the same folder as sync_to_drive.gs)
var BR_DROP = "collection-incoming (AI change files)";
var BR_STAGING = "STAGING (drop coin photos here)";
var BR_BAKEOFF = "bakeoff (blind photo test)";
var BR_QUEUES = { grok: "WORK QUEUE for Grok", muse: "WORK QUEUE for Muse", gemini: "WORK QUEUE for Gemini" };
var BR_TEXT_RE = /^(changes_[a-z0-9][a-z0-9-]{0,30}_\d{8}-\d{4}\.jsonl|answers_owner_\d{8}-\d{4}\.json)$/;
var BR_MAX_FILE = 3000000, BR_MAX_TOTAL = 8000000;

/* ---------- install ---------- */
function installAll() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty("BR_KEY")) p.setProperty("BR_KEY", Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, ""));
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "tick") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("tick").timeBased().everyHours(1).create();
  var st = tick();
  Logger.log("Bridge installed: hourly tick on. First tick: " + JSON.stringify(st));
  if (typeof install === "function") install();   // the daily backup (sync_to_drive.gs), when it is in the same project
  Logger.log("Next: Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone); copy its Web app URL into the GitHub " +
             "secret DRIVE_BRIDGE_URL; then run showSecret.");
}

function showSecret() {
  var key = PropertiesService.getScriptProperties().getProperty("BR_KEY");
  if (!key) throw new Error("Run installAll first.");
  Logger.log("DRIVE_BRIDGE_KEY = " + key);
  Logger.log("Put everything after 'DRIVE_BRIDGE_KEY = ' into the GitHub repo secret DRIVE_BRIDGE_KEY. Never paste it into a chat. " +
             "The other secret, DRIVE_BRIDGE_URL, is the Web app URL from Deploy -> Manage deployments (it ends in /exec).");
  return key;
}

function uninstallBridge() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "tick") ScriptApp.deleteTrigger(t); });
  PropertiesService.getScriptProperties().deleteProperty("BR_KEY");   // the GitHub job stops at once (bad key)
}

/* ---------- 1. the web app ---------- */
function doGet(e) {
  var out;
  try {
    var key = PropertiesService.getScriptProperties().getProperty("BR_KEY");
    var q = (e && e.parameter) || {};
    if (!key || q.key !== key) out = { kind: "titan-bridge/1", error: "bad key", drop: [] };
    else if (q.op === "list") out = brListing_();
    else if (q.op === "tick") out = tick(/^[0-9a-f]{7,40}$/.test(q.sha || "") ? q.sha : null);
    else out = { kind: "titan-bridge/1", error: "unknown op", drop: [] };
  } catch (x) { out = { kind: "titan-bridge/1", error: String(x).slice(0, 300), drop: [] }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function brListing_() {
  var root = DriveApp.getFolderById(BR_ROOT_ID), drop = brFolder_(root, BR_DROP);
  var files = [], total = 0, it = drop.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    var name = f.getName(), size = f.getSize(), mime = f.getMimeType();
    var rec = { id: f.getId(), name: name, size: size, updated: f.getLastUpdated().toISOString(), mime: mime };
    if (BR_TEXT_RE.test(name)) {
      if (/^application\/vnd\.google-apps\./.test(mime)) rec.note = "it is a Google " + mime.split(".").pop() + ", not a plain text file";
      else if (size > BR_MAX_FILE) { /* the job rejects it with the size */ }
      else if (total + size > BR_MAX_TOTAL) rec.deferred = true;
      else { rec.text = f.getBlob().getDataAsString("UTF-8"); total += size; }
    }
    files.push(rec);
  }
  return { kind: "titan-bridge/1", made: new Date().toISOString(), tick: brLastTick_(), drop: files,
           staging: brSummary_(root, BR_STAGING), bakeoff: brSummary_(root, BR_BAKEOFF) };
}

function brSummary_(root, name) {
  var it = root.getFoldersByName(name);
  if (!it.hasNext()) return { count: 0, newest: [] };
  var list = [], fi = it.next().getFiles();
  while (fi.hasNext()) { var f = fi.next(); if (!f.isTrashed()) list.push({ name: f.getName(), updated: f.getLastUpdated().toISOString() }); }
  list.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
  return { count: list.length, newest: list.slice(0, 20) };
}

function brLastTick_() {
  var s = PropertiesService.getScriptProperties().getProperty("BR_TICK");
  if (!s) return null;
  try { var t = JSON.parse(s); return { at: t.at, ref: t.ref, trashed: (t.trashed || []).length, notes: (t.notes || []).length, queues: t.queues, errors: t.errors }; }
  catch (x) { return null; }
}

/* ---------- 2. the tick ---------- */
function tick(sha) {
  var ref = sha || BR_BRANCH;
  var status = { at: new Date().toISOString(), ref: ref, trashed: [], notes: [], queues: [], errors: [] };
  var root = DriveApp.getFolderById(BR_ROOT_ID);
  try {
    var st = brFetchJson_(brRaw_("docs/agents/bridge/processed.json", ref));
    if (st && st.files) brCleanup_(brFolder_(root, BR_DROP), st.files, status);
  } catch (x) { status.errors.push("cleanup: " + String(x).slice(0, 200)); }
  try { brQueues_(root, ref, status); } catch (x) { status.errors.push("queues: " + String(x).slice(0, 200)); }
  PropertiesService.getScriptProperties().setProperty("BR_TICK", JSON.stringify(status).slice(0, 8000));
  return status;
}

function brCleanup_(drop, records, status) {
  var it = drop.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    var e = records[f.getId()];
    if (!e || e.updated !== f.getLastUpdated().toISOString()) continue;   // unknown, or changed since the job saw it
    try {
      if (e.outcome === "merged" || e.outcome === "duplicate") { f.setTrashed(true); status.trashed.push(f.getName()); }
      else if (e.outcome === "rejected") {
        var note = f.getName() + ".REJECTED.txt";
        if (!drop.getFilesByName(note).hasNext()) { drop.createFile(note, brRejectText_(e), MimeType.PLAIN_TEXT); status.notes.push(note); }
        f.setTrashed(true); status.trashed.push(f.getName());
      }
    } catch (x) { status.errors.push(f.getName() + ": " + String(x).slice(0, 160)); }
  }
}

function brRejectText_(e) {
  return "Your file " + e.name + " was NOT merged (checked " + e.at + ", " + e.run + ").\n\nWhy:\n" +
    (e.report || [e.summary]).map(function (r) { return "  " + r; }).join("\n") +
    "\n\nNothing from this file was changed. Fix it, then send it again under a NEW time stamp in the name " +
    "(changes_{you}_{YYYYMMDD-HHMM}.jsonl). Rules: Drive doc 'AI_START_HERE (any AI reads this first)' and " +
    "collection/templates/INSTRUCTIONS.md on GitHub. This note was written by the intake bridge; Claude reads every rejection too.\n";
}

function brQueues_(root, ref, status) {
  var props = PropertiesService.getScriptProperties();
  Object.keys(BR_QUEUES).forEach(function (ai) {
    try {
      var text = brFetchText_(brRaw_("docs/agents/QUEUE_" + ai + ".md", ref));
      if (text === null) return;
      text = text.replace(/^<!--[^\n]*-->\s*\n/, "");                 // the doc-status line is for the repo, not for the AI
      var h = brHash_(text);
      if (props.getProperty("BR_Q_" + ai) === h) return;
      var doc = brFindDoc_(root, BR_QUEUES[ai]);
      if (!doc) { status.errors.push("no Drive doc named '" + BR_QUEUES[ai] + "...'"); return; }
      DocumentApp.openById(doc.getId()).getBody().setText(text);
      props.setProperty("BR_Q_" + ai, h);
      status.queues.push(ai);
    } catch (x) { status.errors.push("queue " + ai + ": " + String(x).slice(0, 160)); }
  });
}

/* ---------- helpers ---------- */
function brRaw_(path, ref) {
  return "https://raw.githubusercontent.com/" + BR_REPO + "/" + (ref || BR_BRANCH) + "/" + path + (ref && ref !== BR_BRANCH ? "" : "?t=" + Date.now());
}
function brFetchText_(url) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() === 404) return null;
  if (res.getResponseCode() !== 200) throw new Error("HTTP " + res.getResponseCode() + " for " + url.split("?")[0]);
  return res.getContentText("UTF-8");
}
function brFetchJson_(url) { var t = brFetchText_(url); return t === null ? null : JSON.parse(t); }
function brFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (!it.hasNext()) throw new Error("no folder '" + name + "' in Titan Reliquary");
  return it.next();
}
function brFindDoc_(root, title) {
  var it = root.searchFiles("title contains '" + title.replace(/'/g, "\\'") + "' and mimeType = 'application/vnd.google-apps.document' and trashed = false");
  return it.hasNext() ? it.next() : null;
}
function brHash_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ("0" + ((b + 256) % 256).toString(16)).slice(-2); }).join("");
}
