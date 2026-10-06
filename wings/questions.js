/* Titan Reliquary · Questions for the owner (#questions) and the "Confirm" on certainty labels (fix list #36 + #43).
   Questions come from data/questions.json (built by tools/pipeline/publish.py from collection/owner_questions.json; open ones only).
   Answers and confirmations wait on this device (localStorage "titan.answers") until the owner sends them as one file,
   answers_owner_{YYYYMMDD-HHMM}.json, dropped in Drive "collection-incoming (AI change files)" (or pasted to Claude).
   tools/pipeline/owner_answers.py turns that file into verified owner change events. Nothing here changes the collection by itself.
   Reuses the Health view's high-contrast look (styles/health.css) plus styles/questions.css.
   API: TitanQuestions.open(), .close(), .queueConfirm(scan, fact, label), .pending() */
(function () {
  "use strict";
  if (window.TitanQuestions) return;
  const KEY = "titan.answers";
  let root = null, lastFocus = null, data = null, loading = null;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function readQ() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeQ(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: answers live only until reload */ mem = list; } badge(); }
  let mem = null;
  const queue = () => mem || readQ();

  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch("data/questions.json").then((r) => (r.ok ? r.json() : { questions: [] })).catch(() => ({ questions: [] })).then((d) => (data = d));
    return loading;
  }
  function openCount() {
    const done = new Set(queue().filter((a) => a.q).map((a) => a.q));
    return data ? data.questions.filter((q) => !done.has(q.id)).length : 0;
  }
  function badge() {
    const b = document.getElementById("btn-questions");
    if (!b) return;
    const n = openCount(), p = queue().length;
    b.textContent = "Questions" + (n ? ` (${n})` : "") + (p ? ` · ${p} to send` : "");
  }

  /* ---------- queue ---------- */
  function setAnswer(q, choice, text) {
    const list = queue().filter((a) => a.q !== q);
    list.push({ q, choice, text: text || undefined, at: new Date().toISOString() });
    writeQ(list);
  }
  function queueConfirm(scan, fact, label) {
    const list = queue().filter((a) => !(a.confirm && a.confirm.scan === scan && a.confirm.fact === fact));
    list.push({ confirm: { scan, fact }, label: label || undefined, at: new Date().toISOString() });
    writeQ(list);
    return list.length;
  }
  const isQueuedConfirm = (scan, fact) => queue().some((a) => a.confirm && a.confirm.scan === scan && a.confirm.fact === fact);

  function stamp(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
  }
  function payload() {
    const now = new Date();
    return { name: `answers_owner_${stamp(now)}.json`,
      body: { kind: "owner-answers", made: now.toISOString(), answers: queue().map((a) => (a.confirm ? { confirm: a.confirm } : { q: a.q, choice: a.choice, text: a.text })) } };
  }
  function plain() {
    const qs = data ? Object.fromEntries(data.questions.map((q) => [q.id, q])) : {};
    return queue().map((a) => a.confirm ? `Confirmed: ${a.confirm.scan} ${a.confirm.fact}${a.label ? " (" + a.label + ")" : ""}`
      : `${qs[a.q] ? qs[a.q].ask : a.q} -> ${a.choice}${a.text ? " (" + a.text + ")" : ""}`).join("\n");
  }
  async function send(how) {
    const { name, body } = payload();
    const json = JSON.stringify(body, null, 1);
    if (how === "copy") {
      const text = "Titan answers file " + name + "\n" + plain() + "\n\n" + json;
      try { await navigator.clipboard.writeText(text); say("Copied. Paste it to Claude in chat."); } catch (e) { say("Could not copy on this device; use Save answers file."); }
      return;
    }
    const file = typeof File === "function" ? new File([json], name, { type: "application/json" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name, text: "Titan Reliquary answers: save to Drive, folder collection-incoming (AI change files)" }); say("Shared. Save it to Drive, in the folder collection-incoming (AI change files)."); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    say("Saved " + name + ". Put it in Drive, folder collection-incoming (AI change files).");
  }
  function say(msg) { const s = root && root.querySelector("#qv-say"); if (s) { s.textContent = msg; s.hidden = false; } }

  /* ---------- view ---------- */
  function applyTone() {
    if (!root) return;
    let dark = true;
    try {
      const m = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim().match(/^#([0-9a-f]{6})$/i);
      if (m) { const v = parseInt(m[1], 16); dark = (0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255 < 0.5; }
      else dark = !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
    } catch (e) { /* keep dark */ }
    root.dataset.tone = dark ? "dark" : "light";
  }
  function render() {
    const body = root.querySelector("#qv-body");
    const q = queue(), mine = Object.fromEntries(q.filter((a) => a.q).map((a) => [a.q, a]));
    const qs = (data && data.questions) || [];
    const card = (x) => {
      const got = mine[x.id];
      const opts = x.options.map((o, i) => `<button type="button" class="hv-btn qv-opt${got && got.choice === o.label ? " is-on" : ""}" data-q="${esc(x.id)}" data-i="${i}" aria-pressed="${got && got.choice === o.label ? "true" : "false"}">${esc(o.label)}</button>`).join("");
      const free = x.options.find((o) => o.free && got && got.choice === o.label);
      return `<li class="qv-q${got ? " is-answered" : ""}">
        <p class="qv-ask">${esc(x.ask)}</p>
        ${x.why ? `<p class="qv-why">${esc(x.why)}</p>` : ""}
        ${x.coin ? `<p class="qv-coin"><a href="#" data-coin="${esc(x.coin)}">Open ${esc(x.coin)} in the app</a></p>` : ""}
        <div class="qv-opts" role="group" aria-label="Your answer">${opts}</div>
        ${free ? `<label class="qv-free">${esc(free.free)} <input type="text" data-free="${esc(x.id)}" value="${esc(got.text || "")}" maxlength="200"></label>` : ""}
        ${got ? `<p class="qv-saved">Saved on this phone: <b>${esc(got.choice)}</b>. Not sent yet.</p>` : ""}
      </li>`;
    };
    const confirms = q.filter((a) => a.confirm);
    body.innerHTML = `
      ${qs.length ? `<ol class="qv-list">${qs.map(card).join("")}</ol>` : `<p class="hv-status">No open questions right now. Thank you!</p>`}
      ${confirms.length ? `<h2>Facts you confirmed</h2><ul class="qv-conf">${confirms.map((a) => `<li>${esc(a.confirm.scan)} · ${esc(a.confirm.fact)}${a.label ? " · " + esc(a.label) : ""} <button type="button" class="qv-undo" data-undo="${esc(a.confirm.scan + "|" + a.confirm.fact)}">Undo</button></li>`).join("")}</ul>` : ""}
      <h2>Send your answers</h2>
      <p class="hv-sub">${q.length ? `${q.length} answer${q.length === 1 ? "" : "s"} saved on this phone.` : "Nothing to send yet. Answer a question above, or press Confirm on a fact label in a coin's view."}
        Claude turns them into checked records the next time the Drive folder is processed.</p>
      <div class="qv-send">
        <button type="button" class="hv-btn hv-primary" data-send="file"${q.length ? "" : " disabled"}>Save answers file</button>
        <button type="button" class="hv-btn" data-send="copy"${q.length ? "" : " disabled"}>Copy for chat</button>
        <button type="button" class="hv-btn" data-sent${q.length ? "" : " disabled"}>I sent them: clear this list</button>
      </div>
      <p class="qv-say" id="qv-say" role="status" hidden></p>`;
  }
  function build() {
    root = document.createElement("div");
    root.id = "questions-view"; root.className = "health-view questions-view"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "qv-title");
    root.innerHTML = `<div class="hv-shell">
      <div class="hv-top"><h1 id="qv-title" tabindex="-1">Questions for you</h1><button type="button" class="hv-btn" data-close>Close</button></div>
      <p class="hv-sub">Things only you can settle by looking at a coin. Tap an answer; send them all at the end.</p>
      <div id="qv-body"><p class="hv-status">Loading…</p></div></div>`;
    document.body.appendChild(root);
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-close]")) return close(true);
      const opt = t.closest(".qv-opt");
      if (opt) {
        const x = data.questions.find((qq) => qq.id === opt.dataset.q), o = x && x.options[+opt.dataset.i];
        if (o) { setAnswer(x.id, o.label, ""); render(); const f = root.querySelector(`[data-free="${x.id}"]`); if (f) f.focus(); }
        return;
      }
      const coin = t.closest("[data-coin]");
      if (coin) { e.preventDefault(); const s = coin.dataset.coin; close(true); setTimeout(() => { try { window.__galleryBridge.setWing("gallery", false); window.__galleryBridge.openDrawer(s); } catch (err) { location.hash = "coin=" + s; } }, 60); return; }
      const undo = t.closest("[data-undo]");
      if (undo) { const [s, f] = undo.dataset.undo.split("|"); writeQ(queue().filter((a) => !(a.confirm && a.confirm.scan === s && a.confirm.fact === f))); render(); return; }
      const snd = t.closest("[data-send]");
      if (snd) return send(snd.dataset.send);
      if (t.closest("[data-sent]")) { if (confirm("Clear the answers saved on this phone? Do this only after the file reached Drive or Claude.")) { writeQ([]); render(); say("Cleared."); } }
    });
    root.addEventListener("input", (e) => {
      const f = e.target.closest("[data-free]");
      if (f) { const a = queue().find((x) => x.q === f.dataset.free); if (a) setAnswer(a.q, a.choice, f.value.trim()); }
    });
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  }
  function open() {
    if (!root) build();
    if (!root.hidden) return;
    lastFocus = document.activeElement; applyTone();
    root.hidden = false; document.body.style.overflow = "hidden"; root.scrollTop = 0;
    root.querySelector("#qv-title").focus({ preventScroll: true });
    load().then(() => { if (!root.hidden) render(); badge(); });
  }
  function close(navigate) {
    if (!root || root.hidden) return;
    root.hidden = true; document.body.style.overflow = "";
    if (navigate && /^#questions/i.test(location.hash)) location.hash = "hall";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
  }
  function route() { if (/^#questions(\b|$)/i.test(location.hash)) open(); else close(false); }
  window.addEventListener("hashchange", route);
  window.addEventListener("titan:atmo", applyTone);
  window.TitanQuestions = { open, close, queueConfirm, isQueuedConfirm, pending: () => queue().length };
  const boot = () => { route(); load().then(badge); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
