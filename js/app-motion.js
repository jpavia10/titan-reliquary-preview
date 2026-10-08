/* Titan Reliquary · one motion setting + haptics (fix list #59 and the owner's "haptics on phones for clicking", 2026-10-08).
   Loaded in <head> before any other script, so everything that asks the browser "reduce motion?" already gets the answer.

   TitanMotion: Full / Calm / Off for ALL movement (GPU effects, page transitions, count-up, scroll reveals, the opening film, 3D drift,
   the Motion Lab).
     full   everything moves
     calm   what the app does for a phone set to "reduce motion": effects become a still picture, no count-up, no film, no drift;
            short fades stay
     off    no movement at all: no effects, no opening film, every animation and transition stopped
   Default: Full, or Calm when the phone itself asks to reduce motion. A choice made here wins over the phone's setting.
   How it reaches the code without touching each wing: every script asks matchMedia("(prefers-reduced-motion: reduce)"); that one query
   answers from this setting (with working change listeners), and the CSS written for that media query is copied under
   html[data-motion="calm"|"off"]. html[data-motion] is set before the first paint.
     TitanMotion.level() -> "full"|"calm"|"off"; .set(level); .choice() -> the stored choice or null (= follow the phone); .reduced()

   TitanHaptics: a short tick on phones when a button, link, chip or tab is tapped; a double tick for a confirm or an answer.
   Android (and other browsers with navigator.vibrate) vibrate; iPhone (iOS 18+, no vibrate API) gets the system tick of a hidden
   <input type="checkbox" switch>, toggled inside the same tap. Default on for touch screens; off with the setting.
     TitanHaptics.tick(kind) kind "tap"|"success"|"warn"; .enabled(); .set(bool); .supported()
   Both settings live in Scene Studio > Settings (mount(sheet)) and are shown in Health. Storage: localStorage titan.motion, titan.haptics. */
(function () {
  "use strict";
  if (window.TitanMotion) return;
  var Q = "(prefers-reduced-motion: reduce)", LSM = "titan.motion", LSH = "titan.haptics";
  var LEVELS = ["full", "calm", "off"];
  var nativeMM = window.matchMedia ? window.matchMedia.bind(window) : null;
  var osq = nativeMM ? nativeMM(Q) : null;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked: this visit only */ } }
  var mem = get(LSM);
  function choice() { return LEVELS.indexOf(mem) >= 0 ? mem : null; }
  function level() { return choice() || (osq && osq.matches ? "calm" : "full"); }
  function reduced() { return level() !== "full"; }

  /* ---------- the one media query, answered from the setting ---------- */
  var listeners = [];
  var mql = {
    media: Q,
    get matches() { return reduced(); },
    onchange: null,
    addEventListener: function (t, fn) { if (t === "change" && fn && listeners.indexOf(fn) < 0) listeners.push(fn); },
    removeEventListener: function (t, fn) { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    addListener: function (fn) { this.addEventListener("change", fn); },
    removeListener: function (fn) { this.removeEventListener("change", fn); },
    dispatchEvent: function () { return true; }
  };
  if (nativeMM) {
    window.matchMedia = function (q) {
      if (String(q).replace(/\s+/g, "") === "(prefers-reduced-motion:reduce)") return mql;
      return nativeMM(q);
    };
  }
  var lastReduced = reduced();
  function changed() {
    var r = reduced(), lv = level();
    document.documentElement.setAttribute("data-motion", lv);
    if (r !== lastReduced) {
      lastReduced = r;
      var ev = { matches: r, media: Q };
      listeners.slice().forEach(function (fn) { try { fn.call(mql, ev); } catch (e) { /* a listener's own bug */ } });
      if (typeof mql.onchange === "function") try { mql.onchange(ev); } catch (e) { /* ignore */ }
    }
    var fx = window.TitanFX;
    if (fx && fx.state) {   // Off stops the effects for real (Calm leaves them as a still picture: the engine draws once when reduced)
      if (lv === "off" && fx.state().playing) { fxWasOn = fx.state().playing; fx.stop(0.3); }
      else if (lv !== "off" && fxWasOn && window.TitanFXUI && window.TitanFXUI.apply) { fxWasOn = null; window.TitanFXUI.apply(); }
    }
    try { window.dispatchEvent(new CustomEvent("titan:motion", { detail: { level: lv, reduced: r } })); } catch (e) { /* old browser */ }
  }
  var fxWasOn = null;
  if (osq) { var onOs = function () { if (!choice()) changed(); }; if (osq.addEventListener) osq.addEventListener("change", onOs); else if (osq.addListener) osq.addListener(onOs); }
  document.documentElement.setAttribute("data-motion", level());

  function set(lv) {
    mem = LEVELS.indexOf(lv) >= 0 ? lv : null;
    put(LSM, mem);
    changed();
  }

  /* ---------- CSS: copy the reduced-motion rules under html[data-motion=calm|off] ---------- */
  var done = typeof WeakSet === "function" ? new WeakSet() : null;
  function scope(sel, lv) {
    return sel.split(",").map(function (s) {
      s = s.trim(); var a = 'html[data-motion="' + lv + '"]';
      if (/^html\b/i.test(s)) return s.replace(/^html/i, a);
      if (/^:root\b/i.test(s)) return s.replace(/^:root/i, a);
      return a + " " + s;
    }).join(", ");
  }
  function copyRules(sheet) {
    var rules; try { rules = sheet.cssRules; } catch (e) { return; }   // a cross-origin sheet (fonts): nothing to copy
    if (!rules || (done && done.has(sheet))) return;
    if (done) done.add(sheet);
    var out = [];
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.type === 4 && /prefers-reduced-motion\s*:\s*reduce/i.test(r.conditionText || (r.media && r.media.mediaText) || "")) {
        for (var j = 0; j < r.cssRules.length; j++) {
          var x = r.cssRules[j];
          if (x.type === 1 && x.selectorText) { out.push(scope(x.selectorText, "calm") + "{" + x.style.cssText + "}"); out.push(scope(x.selectorText, "off") + "{" + x.style.cssText + "}"); }
        }
      }
    }
    if (!out.length) return;
    var st = document.createElement("style"); st.setAttribute("data-motion-copy", "");
    st.textContent = out.join("\n");
    (document.head || document.documentElement).appendChild(st);
    if (done) done.add(st.sheet);
  }
  function scan() { for (var i = 0; i < document.styleSheets.length; i++) { var s = document.styleSheets[i]; if (s.ownerNode && s.ownerNode.hasAttribute && s.ownerNode.hasAttribute("data-motion-copy")) continue; copyRules(s); } }
  document.addEventListener("DOMContentLoaded", scan);
  window.addEventListener("load", function () { scan(); setTimeout(scan, 1500); });
  window.addEventListener("titan:atmo", function () { setTimeout(scan, 400); });
  document.addEventListener("load", function (e) { if (e.target && e.target.tagName === "LINK") setTimeout(scan, 0); }, true);

  /* ---------- haptics ---------- */
  var coarse = nativeMM ? nativeMM("(pointer: coarse)").matches : false;
  var canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  var iosSwitch = null, busy = false, last = 0;
  function hapticsSupported() { return coarse && (canVibrate || isIOS()); }
  function isIOS() { return /iP(hone|ad|od)/.test(navigator.platform || "") || (/Mac/.test(navigator.platform || "") && navigator.maxTouchPoints > 1); }
  function hEnabled() { var v = get(LSH); return v == null ? hapticsSupported() : v === "1"; }
  function hSet(on) { put(LSH, on ? "1" : "0"); }
  function iosTick() {
    if (!iosSwitch) {
      var lab = document.createElement("label"), inp = document.createElement("input");
      inp.type = "checkbox"; inp.setAttribute("switch", ""); inp.tabIndex = -1;
      lab.setAttribute("aria-hidden", "true"); lab.setAttribute("data-haptic-switch", "");
      lab.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
      lab.appendChild(inp); document.body.appendChild(lab); iosSwitch = lab;
    }
    busy = true; try { iosSwitch.click(); } finally { busy = false; }
  }
  var PATTERN = { tap: 8, success: [10, 60, 14], warn: [30, 40, 30] };
  function tick(kind) {
    if (!hEnabled() || !coarse) return false;
    var now = Date.now(); if (now - last < 45) return false; last = now;
    if (canVibrate) { try { return navigator.vibrate(PATTERN[kind] || PATTERN.tap); } catch (e) { return false; } }
    if (isIOS()) { iosTick(); return true; }   // one system tick per tap (a second one would need a fresh tap)
    return false;
  }
  var TAPPABLE = "button, a[href], summary, [role=button], [role=tab], [role=radio], [role=switch], [role=menuitem], input[type=checkbox], input[type=radio], select, label.ss-check, .chip, .ss-chip";
  var SUCCESS = ".rs-cf, .gxd-confirm, .qv-opt, [data-haptic=success]";
  document.addEventListener("click", function (e) {
    if (busy || !e.isTrusted) return;
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest("[data-haptic-switch]") || t.closest("[data-haptic=none]")) return;
    var el = t.closest(TAPPABLE); if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
    tick(el.matches(SUCCESS) ? "success" : "tap");
  }, true);

  /* ---------- settings (Scene Studio > Settings) ---------- */
  var WORDS = { full: "Full", calm: "Calm", off: "Off" };
  function mount(sheet) {
    if (!sheet || sheet.querySelector(".ss-motion-set")) return;
    var host = sheet.querySelector("#ss-follow"); host = host ? host.closest(".in") : null;
    if (!host) return;
    var box = document.createElement("div");
    box.className = "ss-fx ss-motion-set";
    box.innerHTML = '<div class="ss-fx-h" id="ss-mo-lbl">Motion (everything that moves)</div>' +
      '<div class="ss-chips" role="radiogroup" aria-labelledby="ss-mo-lbl">' +
      LEVELS.map(function (l) { return '<button type="button" class="ss-chip" role="radio" data-motion-level="' + l + '" aria-checked="' + (level() === l) + '">' + WORDS[l] + "</button>"; }).join("") +
      '</div><p class="ss-note" id="ss-mo-note"></p>' +
      (hapticsSupported() ? '<label class="ss-check"><input type="checkbox" id="ss-haptics"><span>Tiny vibration when you tap a button</span></label>' : "");
    host.insertBefore(box, host.firstChild);
    var note = box.querySelector("#ss-mo-note");
    function say() {
      var c = choice();
      note.textContent = (level() === "full" ? "Full: effects, the opening film and page movement all play." : level() === "calm" ? "Calm: effects hold still, no opening film, numbers appear without counting up." : "Off: nothing moves.") +
        (c ? "" : " (Following this phone's reduce-motion setting.)");
      box.querySelectorAll("[data-motion-level]").forEach(function (x) { x.setAttribute("aria-checked", String(x.dataset.motionLevel === level())); });
    }
    say();
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-motion-level]"); if (b) { set(b.dataset.motionLevel); say(); } });
    var hp = box.querySelector("#ss-haptics");
    if (hp) { hp.checked = hEnabled(); hp.addEventListener("change", function () { hSet(hp.checked); if (hp.checked) tick("success"); }); }
  }

  window.TitanMotion = { level: level, set: set, choice: choice, reduced: reduced, mount: mount, LEVELS: LEVELS.slice() };
  window.TitanHaptics = { tick: tick, enabled: hEnabled, set: hSet, supported: hapticsSupported };
})();
