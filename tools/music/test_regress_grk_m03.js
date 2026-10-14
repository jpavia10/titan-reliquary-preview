#!/usr/bin/env node
/* Regression test for Grok review GRK-M-03 (node tools/music/test_regress_grk_m03.js).
   wings/music-recorded.js: when the engine is paused during the 3-8 s gap after a track (or an 800 ms retry), the queued next() used to
   start the next recording anyway, into a suspended AudioContext: it played on silently and was mid-piece at resume. Runs the real module
   in a vm with stand-ins for window, Audio, fetch and timers. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..", "..");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL " + m); } else console.log("ok   " + m); };

const listeners = {}, timers = [];
const audios = [];
class Audio {
  constructor() { this.paused = true; this.ended = false; this.ev = {}; this.plays = 0; audios.push(this); }
  addEventListener(t, fn) { (this.ev[t] = this.ev[t] || []).push(fn); }
  removeAttribute() {} load() {}
  play() { this.paused = false; this.plays++; return Promise.resolve(); }
  pause() { this.paused = true; }
  fire(t) { (this.ev[t] || []).forEach((f) => f()); }
}
const win = {
  addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
  dispatchEvent: (e) => { (listeners[e.type] || []).forEach((f) => f(e)); return true; },
};
const sandbox = {
  window: win, document: { readyState: "loading" }, Audio, Math, Set, Promise,
  CustomEvent: class { constructor(type, o) { this.type = type; this.detail = (o || {}).detail; } },
  fetch: () => Promise.resolve({ ok: true, json: () => ({ tracks: [{ id: "a", file: "a.ogg", moods: ["piano"] }, { id: "b", file: "b.ogg", moods: ["piano"] }] }) }),
  setTimeout: (fn, ms) => { timers.push(fn); return timers.length; }, clearTimeout: () => {},
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "wings", "music-recorded.js"), "utf8"), sandbox);
const R = sandbox.window.TitanRecMusic;
const gain = { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} };
const ctx = { currentTime: 0, createGain: () => ({ gain, connect() {}, disconnect() {} }), createMediaElementSource: () => ({ connect() {}, disconnect() {} }) };
const gen = (type) => win.dispatchEvent(new sandbox.CustomEvent("titan:gen", { detail: { type } }));

R.load().then(() => {
  R.start({ rel: [], dead: false }, "piano", { ctx, input: {} });
  const first = audios[0];
  ok(first && first.plays === 1, "first track starts");
  first.fire("playing"); first.ended = true; first.paused = true; first.fire("ended");   // track ends: the gap timer is queued
  gen("pause");                                                                         // the listener pauses during the gap
  timers.shift()();                                                                     // the gap ends while still paused
  const second = audios[1];
  ok(second && second.plays === 0 && second.paused, "the next track does not start while paused");
  gen("play");                                                                          // resume
  ok(second.plays === 1 && !second.paused, "it starts on resume");
  console.log(fails ? `${fails} FAILED` : "all passed"); process.exit(fails ? 1 : 0);
});
