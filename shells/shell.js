/* TitanShell (Grok 2026-10-20): the app can be moved through with different UIs ("shells"). Classic (the wings) is the safe
   default; others are self-contained modules under shells/<id>/ that mount over Classic and only talk to it through svc.
   A theme can give a shell its own hand-made design at themes/<theme>/<shell>/ (listed in themes/manifest.json); a theme
   without one gets that shell's neutral house look. Nothing is ever reskinned automatically. See docs/design/THEME_CONTRACT.md.
   Setting: localStorage "tr.shell" (persists); ?ui=<id> overrides for one visit. API: TitanShell.list(), .current(), .set(id), .choose() */
(function () {
  "use strict";
  const SHELLS = [
    { id: "classic", name: "Classic", desc: "The wings: Hall, Gallery, Vault, Study and Lab, as before." },
    { id: "field", name: "The Field", desc: "Everything on one table: place down, year across. Tap a coin and fly to it.", module: "shells/field/field.js", css: "shells/field/field.css" },
    { id: "cabinet", name: "The Cabinet", desc: "Every coin as itself, at its true size, in velvet trays. Sort by country, year, value or what's new; tap a coin to lift it out and turn it over.", module: "shells/cabinet/cabinet.js", css: "shells/cabinet/cabinet.css" },
    /* Experimental (exp worker): each is one folder + one line here; see docs/design/UI_REGISTRY.md to remove */
    { id: "hologram", exp: true, name: "Hologram", desc: "Millions of light particles. The ring of your collection surrounds you; tap one and every particle spirals in to form that coin.", module: "shells/hologram/hologram.js", css: "shells/hologram/hologram.css" },
    { id: "orrery", exp: true, name: "Orrery", desc: "A brass orrery in space. The sun is today; each decade is an orbit, older coins circle farther out and slower. Tap a coin and time stops.", module: "shells/orrery/orrery.js", css: "shells/orrery/orrery.css" },
    { id: "deck", exp: true, name: "Deck", desc: "Every coin is a foil card. Flick through a springy fan, or shuffle and deal a three-card reading from any suit.", module: "shells/deck/deck.js", css: "shells/deck/deck.css" }
  ];
  const KEY = "tr.shell", B = () => window.TITAN_BUILD || "";
  let cur = "classic", live = null, root = null, manifest = null, themeLink = null, busy = Promise.resolve();
  const byId = (id) => SHELLS.find((s) => s.id === id);
  const lite = () => window.TitanLite === true || document.documentElement.classList.contains("tr-lite");
  const svc = {
    lite,
    isMuted: () => !!(window.TitanLofi && window.TitanLofi.isMuted && window.TitanLofi.isMuted()),
    setMuted: (m) => { try { window.TitanLofi && window.TitanLofi.setMuted && window.TitanLofi.setMuted(!!m); } catch (e) { /* ignore */ } },
    openCoin: (scan) => { location.hash = "coin=" + encodeURIComponent(scan); },
    search: () => { const b = document.getElementById("btn-search"); if (b) b.click(); },
    coverOpen: () => { const d = document.getElementById("drawer"); return !!(d && !d.hidden) || !!document.querySelector(".shell-pick:not([hidden])"); },
    chooseUI: () => choose(),
    quality: () => window.TitanQuality && window.TitanQuality.open()   // the Graphics panel, reachable from every UI
  };
  function css(href, id) { let l = document.getElementById(id); if (!href) { if (l) l.remove(); return null; }
    if (!l) { l = document.createElement("link"); l.rel = "stylesheet"; l.id = id; document.head.appendChild(l); } l.href = href + "?v=" + B(); return l; }
  function loadManifest() { if (manifest) return Promise.resolve(manifest);
    return fetch("themes/manifest.json?v=" + B()).then((r) => r.json()).catch(() => ({})).then((m) => (manifest = m || {})); }
  /* the theme x shell design, or the shell's neutral look when the theme has none for this shell */
  function themeFor() { if (cur === "classic") { css(null, "shell-theme"); return; }
    loadManifest().then((m) => { const atmo = document.documentElement.dataset.atmo, list = (m[cur] || []);
      themeLink = css(list.indexOf(atmo) >= 0 ? "themes/" + atmo + "/" + cur + "/theme.css" : null, "shell-theme");
      document.documentElement.dataset.shellTheme = list.indexOf(atmo) >= 0 ? atmo : "neutral"; }); }
  function unmount() { if (live && live.unmount) { try { live.unmount(); } catch (e) { /* ignore */ } } live = null;
    if (root) { root.remove(); root = null; } css(null, "shell-css"); document.documentElement.classList.remove("shell-" + cur + "-on"); }
  function mount(id) {
    const s = byId(id) || byId("classic");
    busy = busy.then(() => {
      if (s.id === cur && (s.id === "classic" || live)) return;
      unmount(); cur = s.id; document.documentElement.dataset.shell = cur;
      if (!s.module) { themeFor(); emit(); return; }
      css(s.css, "shell-css");
      root = document.createElement("div"); root.id = "shell-" + s.id; root.className = "shell"; root.setAttribute("aria-label", s.name);
      document.body.appendChild(root); document.documentElement.classList.add("shell-" + s.id + "-on");
      return import(new URL(s.module + "?v=" + B(), document.baseURI).href).then((m) => m.mount(root, svc)).then((api) => { live = api; themeFor(); emit(); })
        .catch((e) => { console.warn("shell failed, back to Classic", e); unmount(); cur = "classic"; document.documentElement.dataset.shell = cur; emit(); });
    });
    return busy;
  }
  function emit() { syncBtn(); try { window.dispatchEvent(new CustomEvent("titan:shell", { detail: { shell: cur } })); } catch (e) { /* ignore */ } }
  function set(id) { if (!byId(id)) return Promise.resolve(); try { localStorage.setItem(KEY, id); } catch (e) { /* ignore */ } return mount(id); }
  /* the toggle: one button in the scene bar (Classic) or the shell's own header, opening a small chooser */
  let pick = null;
  function choose() {
    if (!pick) { pick = document.createElement("div"); pick.className = "shell-pick"; pick.setAttribute("role", "dialog"); pick.setAttribute("aria-modal", "true"); pick.setAttribute("aria-label", "Choose a UI"); pick.hidden = true;
      document.body.appendChild(pick);
      pick.addEventListener("click", (e) => { if (e.target.closest("[data-gfx]")) { pick.hidden = true; window.TitanQuality.open(); return; } const b = e.target.closest("[data-shell]"); if (b) { pick.hidden = true; set(b.dataset.shell); } else if (e.target === pick || e.target.closest(".shell-x")) pick.hidden = true; });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pick && !pick.hidden) { e.stopPropagation(); pick.hidden = true; } }, true); }
    pick.innerHTML = '<div class="shell-card"><div class="shell-top"><h2>Choose a UI</h2><button type="button" class="shell-x" aria-label="Close">✕</button></div>' +
      (window.TitanQuality ? '<button type="button" class="shell-opt shell-gfx" data-gfx="1"><b>Graphics: ' + TitanQuality.NAMES[TitanQuality.choice] + (TitanQuality.choice === "auto" ? " (" + TitanQuality.NAMES[TitanQuality.tier()] + ")" : "") + '</b><span>Quality from Low to Max, with a live preview.</span></button>' : "") +
      SHELLS.map((s, k) => (s.exp && !(SHELLS[k - 1] || {}).exp ? '<h3 class="shell-exp">Experimental</h3>' : "") + '<button type="button" class="shell-opt" data-shell="' + s.id + '" aria-pressed="' + (s.id === cur) + '"><b>' + s.name + '</b><span>' + s.desc + "</span></button>").join("") + "</div>";
    pick.hidden = false; const f = pick.querySelector('[aria-pressed="true"]') || pick.querySelector(".shell-opt"); f && f.focus();
  }
  function syncBtn() { const bar = document.getElementById("scene-bar"); if (!bar) return; let b = document.getElementById("btn-ui");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "btn-ui"; b.className = "sb-btn sb-ui"; b.setAttribute("aria-haspopup", "dialog"); b.addEventListener("click", choose);
      const sc = document.getElementById("btn-atmo"); bar.insertBefore(b, sc || null);
      if (window.TitanQuality && !document.getElementById("btn-gfx")) { const g = document.createElement("button"); g.type = "button"; g.id = "btn-gfx"; g.className = "sb-btn sb-gfx"; g.setAttribute("aria-haspopup", "dialog");
        g.innerHTML = '<span class="sb-lbl">Graphics</span><span class="sb-sub">' + TitanQuality.NAMES[TitanQuality.tier()] + "</span>"; g.setAttribute("aria-label", "Graphics quality (now " + TitanQuality.NAMES[TitanQuality.tier()] + ")");
        g.addEventListener("click", () => TitanQuality.open()); bar.insertBefore(g, sc || null); } }
    b.innerHTML = '<span class="sb-lbl">UI</span><span class="sb-sub">' + byId(cur).name + "</span>"; b.setAttribute("aria-label", "Choose a UI (now " + byId(cur).name + ")"); }
  window.addEventListener("titan:atmo", () => themeFor());
  function boot() {
    let want = "classic"; try { want = localStorage.getItem(KEY) || "classic"; } catch (e) { /* ignore */ }
    const q = new URLSearchParams(location.search).get("ui"); if (q && byId(q)) want = q;
    syncBtn(); document.documentElement.dataset.shell = "classic"; if (want !== "classic") mount(want);
  }
  window.TitanShell = { list: () => SHELLS.map((s) => ({ id: s.id, name: s.name, desc: s.desc })), current: () => cur, set, choose, mounted: () => live, ready: () => busy, svc };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
