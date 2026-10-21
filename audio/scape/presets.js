/* Titan Reliquary · SCAPE presets, batch 1 (Grok, soundscape worker). One preset per fx scene id (fx/demo.html ids).
   Each build(k) gets the kit: k.L(id,label,gain,{wet}) makes a mixer layer; grains/noiseBed/poisson/oneShot/Voice/mover/S.
   Positions are metres, listener at origin facing -z (x right, y up). Events in: preset.on({type,x,y,dist,power}). */
(function () {
  var TS = window.TitanScape; if (!TS) return;
  var SEG = { thunder: [[0, 15], [15.5, 15], [31, 15]], whale: [[0, 26]], bowl: [[0, 26]], clank: [[0, 2.6], [3.1, 2.6], [6.2, 2.6], [9.3, 2.6]], owl: [[0, 3.4], [3.9, 3.2]] };
  function drive(L, k, f, ms) { (function t() { if (L.dead) return; L.mod = f(); L.level(.12); L.timers.push(setTimeout(t, ms || 80)); })(); }
  function sx(x) { return (x - .5) * 8; } // screen x -> metres in front of you
  /* lightning + thunder with physical delay: flash now, sound after dist/343 s (dist in km) */
  function strike(k, L, dist, x) {
    var c = k.ctx, t = c.currentTime, px = x == null ? k.rr(-1, 1) : (x - .5) * 2, d = Math.max(.15, dist), delay = d * 1000 / 343;
    k.emit("flash", { dist: d, x: (px + 1) / 2, power: Math.max(.2, 1 - d / 8) });
    var V = k.Voice(L.g, [px * 300 * d, 200, -400 * d], { ref: 400, roll: .25 });
    k.S.thunder(V.in, t + delay, d, { gain: 1.1 });
    if (d > 1.2) k.oneShot(V.in, "thunder", { t: t + delay + .2, segs: SEG.thunder, gain: .55, rate: k.rr(.85, 1.05) });
  }
  function storm(k, gain, every) {
    var L = k.L("thunder", "Thunder", gain || 1, { wet: .6 });
    k.poisson(L, function () { return (every || 1 / 18) * (.4 + k.P.intensity); }, function () { strike(k, L, k.rr(.3, 1) * Math.max(.5, k.P.storm) * 1.6); });
    return L;
  }
  function car(k, L, wet) { // a car hissing past on the road with Doppler
    var dir = Math.random() < .5 ? 1 : -1, z = -k.rr(6, 22), sp = k.rr(11, 19), len = 120, dur = len / sp;
    k.mover(L, dur, function (u) { return [dir * (u - .5) * len, 0, z]; }, function (dest) {
      var c = k.ctx, n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), o = c.createOscillator(), og = c.createGain(), olp = c.createBiquadFilter();
      n.buffer = k.noiseBuf; n.loop = true; bp.type = "bandpass"; bp.frequency.value = wet ? 2600 : 900; bp.Q.value = .6; g.gain.value = wet ? .9 : .5;
      o.type = "sawtooth"; o.frequency.value = k.rr(38, 60); olp.type = "lowpass"; olp.frequency.value = 220; og.gain.value = .25;
      n.connect(bp); bp.connect(g); g.connect(dest); o.connect(olp); olp.connect(og); og.connect(dest); var t = c.currentTime; n.start(t, Math.random() * 4); o.start(t);
      var f0 = o.frequency.value; return { rate: function (r) { n.playbackRate.setTargetAtTime(r, c.currentTime, .04); o.frequency.setTargetAtTime(f0 * r, c.currentTime, .04); },
        stop: function () { try { n.stop(); o.stop(); } catch (e) {} } };
    }, { ref: 4 });
  }
  function nb(k) { if (!k.noiseBuf) { var c = k.ctx, b = c.createBuffer(1, c.sampleRate * 6, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; k.noiseBuf = b; } }

  /* 1. NEON STREET: rain on a city street at night, buzzing tubes, gutter, tyres on wet asphalt, distant storm */
  TS.define("neon", { name: "Neon street at night", space: "street", params: { rain: .8, storm: 4, tod: 23 },
    build: function (k) { nb(k);
      var rain = k.L("rain", "Rain", .8);
      k.grains(rain, "rainHeavy", { grain: 2.2, density: 3, spread: .9 }); k.grains(rain, "rainUmbrella", { grain: 1.4, density: 2, spread: .7, rate: .97 });
      k.noiseBed(rain, "pink", { f: 5200, q: .4, gain: .18, walk: [3500, 7500] });
      drive(rain, "rain", function () { return .35 + k.P.rain * .8; }, 300);
      var drops = k.L("drops", "Drips and splashes", .7);
      k.poisson(drops, function () { return 6 + k.P.rain * 30; }, function (t) { var V = k.Voice(drops.g, [k.rr(-5, 5), k.rr(-1.5, 2), k.rr(-6, 1.5)], { ref: 1 }); k.S.drop(V.in, t, { gain: .18 }); setTimeout(function () { V.pan.disconnect(); }, 600); });
      var gut = k.L("gutter", "Gutter", .45); var gv = k.Voice(gut.g, [-3, -1, -2], { ref: 1.5 }); k.grains(gut, "river", { grain: 1.5, density: 3, dest: gv.in, rate: 1.3, spread: 0 }); gv.lp.frequency.value = 3500;
      var hum = k.L("neon", "Neon tubes", .32, { wet: .3 }); var hv = k.Voice(hum.g, [2.5, 3, -3], { ref: 1.5 });
      var c = k.ctx, hg = c.createGain(); hg.gain.value = .5; hg.connect(hv.in);
      [120, 240, 360, 600, 960, 2880].forEach(function (f, i) { var o = c.createOscillator(); o.type = i ? "sine" : "triangle"; o.frequency.value = f * (1 + (Math.random() - .5) * .002); var g = c.createGain(); g.gain.value = [.35, .2, .14, .06, .03, .02][i]; o.connect(g); g.connect(hg); o.start(); hum.nodes.push(o); });
      k.poisson(hum, function () { return .25; }, function (t) { var n = k.rr(2, 7); for (var i = 0; i < n; i++) { var tt = t + i * k.rr(.03, .09); hg.gain.setValueAtTime(.05, tt); hg.gain.setValueAtTime(.5, tt + k.rr(.02, .06)); k.S.crackle(hv.in, tt, { f: 4500, gain: .3 }); } });
      var city = k.L("city", "Distant city", .5, { wet: .8 }); var cv = k.Voice(city.g, [0, 10, -60], { ref: 30, roll: .2 }); k.grains(city, "city", { grain: 3, density: 2, dest: cv.in, spread: 0 }); cv.lp.frequency.value = 900;
      var cars = k.L("cars", "Passing cars", .7); k.poisson(cars, function () { return 1 / 9; }, function () { car(k, cars, true); });
      storm(k, .75, 1 / 30);
    },
    on: function (d, t) { if (d.type === "lightning") return; }
  });

  /* 2. SAND: open desert, a million grains moving; drag to hear sand pour under the rake */
  TS.define("sand", { name: "Desert wind and moving sand", space: "open", params: { wind: .6, tod: 17 },
    build: function (k) {
      var wind = k.L("wind", "Wind", .8, { wet: .4 });
      k.grains(wind, "windHowl", { grain: 3.2, density: 2.2, spread: .9, rate: .9 });
      k.noiseBed(wind, "pink", { f: 500, q: 1.2, gain: .6, walk: [220, 1400], walkMs: 1400, gainWalk: [.3, 1.1] });
      var whistle = k.noiseBed(wind, "white", { f: 1800, q: 22, gain: .05, walk: [900, 3200], walkMs: 2200, gainWalk: [0, 1] });
      drive(wind, "wind", function () { return .35 + k.P.wind; }, 300);
      var hiss = k.L("sand", "Blowing sand", .45);
      k.noiseBed(hiss, "white", { type: "highpass", f: 4500, q: .5, gain: .25, walk: [3800, 8000], gainWalk: [.3, 1], walkMs: 700 });
      k.poisson(hiss, function () { return 40 * (.3 + k.P.wind); }, function (t) { k.S.crackle(hiss.g, t, { f: k.rr(6000, 11000), gain: .05, burst: 1 }); });
      var rake = k.L("rake", "Rake (drag)", .9); k.noiseBed(rake, "white", { f: 3000, q: .6, gain: .5, walk: [1800, 5200], walkMs: 300 });
      k.poisson(rake, function () { return k.P.drag * 260; }, function (t) { var V = k.Voice(rake.g, [(k.P.px - .5) * 6, -1, -1.5], { ref: 1 }); k.S.crackle(V.in, t, { f: k.rr(3000, 9000), gain: .12, burst: 2 }); setTimeout(function () { V.pan.disconnect(); }, 400); });
      drive(rake, "drag", function () { return Math.min(1, k.P.drag * 2.4); }, 50);
      var far = k.L("chime", "Far bell", .2, { wet: .9 }); var fv = k.Voice(far.g, [-40, 5, -80], { ref: 20, roll: .3 });
      k.poisson(far, function () { return 1 / 40; }, function (t) { k.oneShot(fv.in, "bowl", { t: t, rate: k.rr(.97, 1.03), gain: .4 }); });
    } });

  /* 3. SMOKE AND LIGHT: a vast dark nave, breathing air, slow light; drag to move the light and the air brightens */
  TS.define("smoke", { name: "Smoke in a cathedral", space: "cathedral", params: {},
    build: function (k) { var c = k.ctx;
      var air = k.L("air", "Breathing air", .55, { wet: 1.2 });
      [[196, 9], [294, 12], [440, 14], [587, 18]].forEach(function (fq, i) { k.noiseBed(air, "pink", { f: fq[0], q: fq[1], gain: .9, walk: [fq[0] * .97, fq[0] * 1.03], walkMs: 3000, gainWalk: [.2, 1], walkT: 3 }); });
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
      drive(air, "light", function () { return .7 + (1 - k.P.py) * .5; }, 200);
      var sub = k.L("sub", "Low drone", .4, { wet: .6 });
      [55, 55.31, 82.4].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = [.5, .5, .18][i]; o.connect(g); g.connect(sub.g); o.start(); sub.nodes.push(o); });
      var ember = k.L("smoulder", "Smoulder", .3); var ev = k.Voice(ember.g, [1.5, -1, -3]); k.grains(ember, "fire", { grain: 1.8, density: 2.5, dest: ev.in, rate: .8, spread: 0 }); ev.lp.frequency.value = 1600;
      var room = k.L("room", "Stone room tone", .35, { wet: .5 }); k.grains(room, "hall", { grain: 3, density: 2, spread: .8 });
      var bell = k.L("bell", "Distant bowl", .35, { wet: 1.5 }); var bv = k.Voice(bell.g, [-12, 6, -30], { ref: 10, roll: .4 });
      k.poisson(bell, function () { return 1 / 26; }, function (t) { bv.at(k.rr(-25, 25), 6, -k.rr(20, 45)); k.oneShot(bv.in, "bowl", { t: t, rate: k.rr(.8, .84), gain: .55 }); });
    } });

  /* 4. LIQUID METAL: a foundry; furnace roar, molten glops, distant metal; touch to make the metal hiss */
  TS.define("metal", { name: "Molten metal foundry", space: "cave", params: {},
    build: function (k) { var c = k.ctx;
      var roar = k.L("furnace", "Furnace roar", .7, { wet: .5 });
      k.noiseBed(roar, "brown", { type: "lowpass", f: 260, q: 2, gain: 1.1, walk: [160, 420], walkMs: 350, gainWalk: [.7, 1.2], walkT: .25 });
      var fv = k.Voice(roar.g, [-2, 0, -4]); k.grains(roar, "fire", { grain: 1.2, density: 3, rate: .55, dest: fv.in, spread: 0, jitter: .08 }); fv.lp.frequency.value = 2500;
      var glop = k.L("glops", "Molten glops", .6, { wet: .7 });
      var glp = c.createBiquadFilter(); glp.type = "lowpass"; glp.frequency.value = 900; glp.connect(glop.g);
      k.poisson(glop, function () { return 2.2; }, function (t) { k.S.bubble(glp, t, { size: k.rr(4, 9), gain: .5 }); if (Math.random() < .3) k.S.boom(glp, t, { f: k.rr(60, 110), len: .25, gain: .25, bright: 400 }); });
      var sub = k.L("sub", "Deep hum", .3); [41.2, 61.7].forEach(function (f) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = .45; o.connect(g); g.connect(sub.g); o.start(); sub.nodes.push(o); });
      var far = k.L("works", "Distant works", .45, { wet: 1.3 }); var wv = k.Voice(far.g, [15, 2, -40], { ref: 10, roll: .4 });
      k.poisson(far, function () { return 1 / 7; }, function (t) { wv.at(k.rr(-30, 30), 2, -k.rr(25, 60)); k.oneShot(wv.in, "clank", { t: t, segs: SEG.clank, gain: .5, rate: k.rr(.6, .9) }); });
      this._hiss = k.L("hiss", "Touch hiss", .8);
    },
    on: function (d, t) { if (d.type !== "touch" && d.type !== "splash") return; var k = this._k, L = this._hiss; if (!L || L.dead) return; var c = TS.ctx, V = TS._voice;
      var n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(), b = c.createBuffer(1, c.sampleRate, c.sampleRate), dd = b.getChannelData(0); for (var i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      n.buffer = b; hp.type = "highpass"; hp.frequency.value = 3500; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.6, t + .02); g.gain.exponentialRampToValueAtTime(1e-4, t + .9);
      var p = c.createStereoPanner(); p.pan.value = ((d.x || .5) - .5) * 1.6; n.connect(hp); hp.connect(g); g.connect(p); p.connect(L.g); n.start(t); n.stop(t + 1);
      for (var j = 0; j < 14; j++) TS._S.crackle(p, t + Math.random() * .6, { f: 5000, gain: .25 }); } });

  /* 5. LIVING CORAL: on a reef; snapping shrimp, bubbles, current, far whales; touch to release bubbles */
  TS.define("coral", { name: "Coral reef underwater", space: "water", params: {},
    build: function (k) { var c = k.ctx;
      var sea = k.L("sea", "Underwater", .75); k.grains(sea, "underwater", { grain: 2.6, density: 2.4, spread: .8 });
      k.noiseBed(sea, "brown", { type: "lowpass", f: 180, q: 1, gain: .7, walk: [90, 320], walkMs: 2500, gainWalk: [.5, 1.1], walkT: 2 });
      var reef = k.L("reef", "Snapping shrimp", .35);
      k.poisson(reef, function () { return 55; }, function (t) { var V = k.Voice(reef.g, [k.rr(-10, 10), -k.rr(1, 4), -k.rr(1, 14)], { ref: 1 }); k.S.crackle(V.in, t, { f: k.rr(2500, 7000), gain: .16, burst: 1 }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      var bub = k.L("bubbles", "Bubbles", .5);
      k.poisson(bub, function () { return 1.4; }, function (t) { var n = Math.random() < .3 ? 6 : 1, x = k.rr(-4, 4); for (var i = 0; i < n; i++) { var V = k.Voice(bub.g, [x, k.rr(-1, 1), -k.rr(1, 5)], { ref: 1 }); k.S.bubble(V.in, t + i * k.rr(.02, .12), { size: k.rr(.4, 1.6), gain: .12 }); } });
      var wh = k.L("whale", "Far whales", .4, { wet: 1.4 }); var wv = k.Voice(wh.g, [-80, -20, -300], { ref: 50, roll: .2 }); wv.lp.frequency.value = 1400;
      k.poisson(wh, function () { return 1 / 45; }, function (t) { wv.at(k.rr(-300, 300), -20, -k.rr(200, 500)); k.oneShot(wv.in, "whale", { t: t, gain: .6, rate: k.rr(.85, 1.05) }); });
      this._bub = bub; this._k = k;
    },
    on: function (d, t) { if (d.type !== "touch") return; var k = this._k, L = this._bub; if (!L || L.dead) return; for (var i = 0; i < 18; i++) { var V = k.Voice(L.g, [(d.x - .5) * 6, k.rr(-1, 1), -1.5], { ref: 1 }); k.S.bubble(V.in, t + i * k.rr(.015, .06), { size: k.rr(.3, 1.4), gain: .2 }); } } });

  /* 6. INK FLUID: dark water in a glass room; drag to stir and the swirl follows your speed */
  TS.define("fluid", { name: "Ink in deep water", space: "hall", params: {},
    build: function (k) { var c = k.ctx;
      var pad = k.L("glass", "Glass resonance", .35, { wet: 1.4 }); // inharmonic filtered-noise resonance: texture, not a chord
      [173, 311, 547, 829].forEach(function (f) { k.noiseBed(pad, "pink", { f: f, q: 28, gain: .8, walk: [f * .96, f * 1.04], walkMs: 4000, gainWalk: [.1, 1], walkT: 4 }); });
      var water = k.L("water", "Still water", .45, { wet: .7 }); k.grains(water, "drips", { grain: 2, density: 2.5, spread: .8, rate: .8 });
      k.noiseBed(water, "brown", { type: "lowpass", f: 300, gain: .5, walk: [200, 500], walkMs: 2000 });
      var stir = k.L("stir", "Stir (drag)", 1); var sb = k.noiseBed(stir, "pink", { f: 600, q: 2.5, gain: .9 });
      drive(stir, "drag", function () { var dr = k.P.drag; sb.f.frequency.setTargetAtTime(350 + dr * 1600, c.currentTime, .08); return Math.min(1, dr * 2.2); }, 50);
      k.poisson(stir, function () { return k.P.drag * 40; }, function (t) { k.S.bubble(stir.g, t, { size: k.rr(1.5, 3.5), gain: .15 }); });
      this._k = k; this._w = water;
    },
    on: function (d, t) { if (d.type !== "touch") return; var k = this._k; if (!this._w || this._w.dead) return; var V = k.Voice(this._w.g, [(d.x - .5) * 6, 0, -2]); k.S.drop(V.in, t, { f: k.rr(500, 900), len: .25, gain: .5 }); } });

  /* 7. THUNDERSTORM (for the storm scene): heavy rain, wind, branching thunder delayed by distance (P.storm km) */
  TS.define("storm", { name: "Thunderstorm", space: "forest", params: { rain: 1, wind: .7, storm: 2.5 },
    build: function (k) {
      var rain = k.L("rain", "Rain", .9); k.grains(rain, "rainHeavy", { grain: 2.4, density: 3.2, spread: 1 }); k.grains(rain, "leaves", { grain: 2, density: 2, spread: .9 });
      k.noiseBed(rain, "pink", { f: 4000, q: .3, gain: .25, walk: [2500, 7000], gainWalk: [.6, 1.2] }); drive(rain, "rain", function () { return .3 + k.P.rain * .9; }, 300);
      var wind = k.L("wind", "Wind", .55); k.grains(wind, "windTrees", { grain: 3, density: 2, spread: .9 }); k.noiseBed(wind, "pink", { f: 400, q: 1, gain: .4, walk: [200, 1100], walkMs: 1200, gainWalk: [.3, 1.2] });
      drive(wind, "wind", function () { return .3 + k.P.wind; }, 300);
      var drops = k.L("drops", "Near drips", .5); k.poisson(drops, function () { return 20 * k.P.rain; }, function (t) { var V = k.Voice(drops.g, [k.rr(-3, 3), k.rr(-1, 2), k.rr(-3, 1)], { ref: 1 }); k.S.drop(V.in, t, { gain: .14 }); setTimeout(function () { V.pan.disconnect(); }, 500); });
      this._t = storm(k, 1, 1 / 9); this._k = k;
    },
    on: function (d) { if (d.type === "lightning" && this._t && !this._t.dead) strike(this._k, this._t, d.dist || 2, d.x); } });

  /* 8. FIRE (for the fire scene): a campfire at night; embers, pops, the low roar, crickets after dark */
  TS.define("fire", { name: "Campfire at night", space: "forest", params: { tod: 22, intensity: 1 },
    build: function (k) { var c = k.ctx;
      var fire = k.L("fire", "Fire", .8); var fv = k.Voice(fire.g, [0, -.5, -2], { ref: 1.5 }); k.grains(fire, "fire", { grain: 1.6, density: 3, dest: fv.in, spread: 0, jitter: .05 });
      k.noiseBed(fire, "brown", { type: "lowpass", f: 220, gain: .8, walk: [140, 380], walkMs: 300, gainWalk: [.6, 1.2], walkT: .2, dest: fv.in });
      var cr = k.L("crackle", "Crackle", .7); k.poisson(cr, function () { return 14 * k.P.intensity; }, function (t) { var V = k.Voice(cr.g, [k.rr(-.6, .6), k.rr(-.6, .3), -2 + k.rr(-.4, .4)], { ref: 1 }); k.S.crackle(V.in, t, { gain: .45, burst: 4 }); setTimeout(function () { V.pan.disconnect(); }, 300); });
      k.poisson(cr, function () { return .5 * k.P.intensity; }, function (t) { k.S.boom(fv.in, t, { f: k.rr(90, 160), len: .12, gain: .25, bright: 5000 }); k.S.crackle(fv.in, t, { gain: .9, burst: 6 }); });
      var night = k.L("night", "Crickets", .35, { wet: .6 }); k.grains(night, "crickets", { grain: 2.5, density: 2, spread: 1 });
      drive(night, "tod", function () { var h = k.P.tod; return (h > 19 || h < 5) ? 1 : 0; }, 1000);
      var owl = k.L("owl", "Owl", .4, { wet: 1 }); var ov = k.Voice(owl.g, [-20, 8, -30], { ref: 8 });
      k.poisson(owl, function () { var h = k.P.tod; return (h > 20 || h < 4) ? 1 / 50 : 0; }, function (t) { ov.at(k.rr(-30, 30), 8, -k.rr(15, 40)); k.oneShot(ov.in, "owl", { t: t, segs: SEG.owl, gain: .5 }); });
    } });

  /* fix-ups: give touch handlers access to the kit */
  ["metal"].forEach(function (id) { var p = TS.presets[id], b = p.build; p.build = function (k) { this._k = k; return b.call(this, k); }; });
})();
