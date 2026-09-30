/**
 * Titan Reliquary · GitHub → Google Drive sync (Google Apps Script). Install once; runs daily.
 *
 * What it does (into the Drive folder "Titan Reliquary", id ROOT_FOLDER_ID):
 *  1. site-backups/  : saves a zip of the whole site (the repo's main branch) as
 *                      titan-reliquary-site_{YYYY-MM-DD}_{build}.zip, once per day; keeps the newest KEEP_ZIPS.
 *  2. collection/    : mirrors every file listed in the repo's collection/manifest.json (the v2 master:
 *                      coins, types, albums, lots, valuations, change log). Unchanged files (same sha256,
 *                      stored in the Drive file's description) are skipped; changed files are updated IN PLACE,
 *                      so Drive ids and links stay stable.
 *  3. collection/_incoming/ : created if missing. Agents without GitHub access drop ChangeEvent files here
 *                      (changes_{agent}_{YYYYMMDD-HHMM}.jsonl); the integrator validates and merges them.
 *  4. collection/_SYNC_STATUS.json : when it last ran, which build, what changed, any errors.
 * It never deletes files. Old zips beyond KEEP_ZIPS go to the Drive trash (recoverable for 30 days).
 *
 * Install:
 *  1. https://script.google.com → New project → name it "Titan Reliquary sync".
 *  2. Paste this file into Code.gs and save.
 *  3. Run the function  install  once and approve the Drive + external-request permissions.
 *     It runs syncAll immediately and then every day at about 03:00 (script time zone).
 *  4. uninstall  removes the daily trigger.
 */
var REPO = "jpavia10/titan-reliquary-preview";
var BRANCH = "main";
var ROOT_FOLDER_ID = "1c1GrFz7QbDYtBG6f77zprlpVJrOBuPvU"; // Drive "Titan Reliquary"
var KEEP_ZIPS = 14;
var TZ = "America/Los_Angeles";

function install() {
  uninstall();
  ScriptApp.newTrigger("syncAll").timeBased().everyDays(1).atHour(3).create();
  syncAll();
}

function uninstall() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncAll") ScriptApp.deleteTrigger(t);
  });
}

function syncAll() {
  var status = { started_at: new Date().toISOString(), repo: REPO, branch: BRANCH, build: null,
                 zip: null, collection: { updated: [], created: [], unchanged: 0 }, errors: [] };
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  try { status.build = fetchJson_(raw_("version.json")).build || null; } catch (e) { status.errors.push("version.json: " + e); }
  try { status.zip = backupSite_(root, status.build); } catch (e) { status.errors.push("zip: " + e); }
  var coll = folder_(root, "collection");
  folder_(coll, "_incoming");
  try { mirrorCollection_(coll, status.collection); } catch (e) { status.errors.push("collection: " + e); }
  status.finished_at = new Date().toISOString();
  upsertText_(coll, "_SYNC_STATUS.json", JSON.stringify(status, null, 2), "application/json", null);
  Logger.log(JSON.stringify(status));
  return status;
}

/* ---------- 1. site zip ---------- */
function backupSite_(root, build) {
  var dir = folder_(root, "site-backups");
  var day = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  var name = "titan-reliquary-site_" + day + "_" + (build || "build") + ".zip";
  if (dir.getFilesByName(name).hasNext()) return name + " (already saved today)";
  var res = UrlFetchApp.fetch("https://github.com/" + REPO + "/archive/refs/heads/" + BRANCH + ".zip",
                              { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error("HTTP " + res.getResponseCode());
  dir.createFile(res.getBlob().setName(name)).setDescription("Daily site backup from " + REPO + "@" + BRANCH);
  // keep the newest KEEP_ZIPS of OUR zips (by name prefix); trash the rest (recoverable)
  var zips = [], it = dir.getFiles();
  while (it.hasNext()) { var f = it.next(); if (/^titan-reliquary-site_\d{4}-\d{2}-\d{2}_.*\.zip$/.test(f.getName())) zips.push(f); }
  zips.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  zips.slice(KEEP_ZIPS).forEach(function (f) { f.setTrashed(true); });
  return name;
}

/* ---------- 2. collection mirror ---------- */
function mirrorCollection_(coll, out) {
  var manifestText = fetchText_(raw_("collection/manifest.json"));
  var manifest = JSON.parse(manifestText);
  (manifest.files || []).forEach(function (entry) {
    var parts = String(entry.path).split("/");
    var name = parts.pop();
    var dir = coll;
    parts.forEach(function (p) { dir = folder_(dir, p); });
    var existing = dir.getFilesByName(name);
    var file = existing.hasNext() ? existing.next() : null;
    if (file && file.getDescription() === entry.sha256) { out.unchanged++; return; }
    var text = fetchText_(raw_("collection/" + entry.path));
    var mime = /\.json$/.test(name) ? "application/json" : "text/plain";
    upsertText_(dir, name, text, mime, entry.sha256);
    (file ? out.updated : out.created).push(entry.path);
  });
  upsertText_(coll, "manifest.json", manifestText, "application/json", null); // last, so it never points at missing files
}

/* ---------- helpers ---------- */
function raw_(path) { return "https://raw.githubusercontent.com/" + REPO + "/" + BRANCH + "/" + path; }
function fetchText_(url) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error("HTTP " + res.getResponseCode() + " for " + url);
  return res.getContentText("UTF-8");
}
function fetchJson_(url) { return JSON.parse(fetchText_(url)); }
function folder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function upsertText_(dir, name, text, mime, sha) {
  var it = dir.getFilesByName(name);
  var file = it.hasNext() ? it.next() : null;
  if (file) file.setContent(text); else file = dir.createFile(name, text, mime);
  if (sha) file.setDescription(sha);
  return file;
}
