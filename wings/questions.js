/* Titan Reliquary · Questions for the owner (#questions) and the "Confirm" on certainty labels (fix list #36 + #43).
   Questions come from data/questions.json (built by tools/pipeline/publish.py from collection/owner_questions.json; open ones only).
   Answers and confirmations wait on this device (localStorage "titan.answers") until the owner sends them as one file,
   answers_owner_{YYYYMMDD-HHMM}.json, dropped in Drive "collection-incoming (AI change files)" (or pasted to Claude).
   tools/pipeline/owner_answers.py turns that file into verified owner change events. Nothing here changes the collection by itself.
   Reuses the Health view's high-contrast look (styles/health.css) plus styles/questions.css.
   Notes ride in the same file (2026-10-09): a speed report from Health (fix list #25) and "where did they come from?" (#77, the one fact no
   catalogue knows). owner_answers.py files the speed report in docs/perf/phone_reports.jsonl and turns origins into owner acquisition records.
   Sent + received (2026-10-15; owner: "How do I know that you got those three answers?"): "Send to Claude" opens a pre-filled GitHub issue
   (title "Titan answers YYYYMMDD-HHMM"; only the repository owner's issues are merged, by .github/workflows/owner-answers.yml). Every batch
   sent any way (GitHub, chat copy, file) moves to "titan.answers.sent" and stays visible as "sent, waiting" until data/answers_received.json
   (written by publish.py from owner_answers.py's receipts) lists its `made` time: then it shows "Received" with the counts.
   API: TitanQuestions.open(), .close(), .queueConfirm(scan, fact, label), .queueNote(kind, key, data, label), .status(scan, fact), .pending(), .count() */
(function () {
  "use strict";
  if (window.TitanQuestions) return;
  const KEY = "titan.answers", SENT = "titan.answers.sent", REPO = "jpavia10/titan-reliquary-preview";
  let root = null, lastFocus = null, data = null, loading = null, received = null;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function readQ() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeQ(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: answers live only until reload */ mem = list; } badge(); }
  let mem = null, memSent = null;
  const queue = () => mem || readQ();
  function readSent() { try { const v = JSON.parse(localStorage.getItem(SENT) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return memSent || []; } }
  function writeSent(list) { try { localStorage.setItem(SENT, JSON.stringify(list)); } catch (e) { memSent = list; } badge(); }
  const sent = () => memSent || readSent();
  const madeKey = (iso) => String(iso || "").slice(0, 19) + "Z";       // owner_answers.py keeps the batch time to the second
  const waiting = () => sent().filter((b) => !b.received);
  /* receipts: data/answers_received.json lists every answers file Claude's pipeline has merged (by its `made` time) */
  function checkReceipts() {
    return fetch("data/answers_received.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d || !Array.isArray(d.batches)) return;
      received = new Map(d.batches.map((x) => [madeKey(x.made), x]));
      let changed = false; const old = Date.now() - 30 * 864e5;
      const list = sent().map((b) => {
        const r = received.get(madeKey(b.made));
        if (r && !b.received) { changed = true; return Object.assign({}, b, { received: { at: r.processed, recorded: r.recorded, facts: r.facts, skipped: r.skipped, followups: r.followups } }); }
        return b;
      }).filter((b) => !(b.received && Date.parse(b.received.at || 0) < old));
      if (changed || list.length !== sent().length) writeSent(list);
      if (root && !root.hidden) render();
    }).catch(() => { /* offline: the batches simply stay "sent, waiting" */ });
  }
  function load() {
    if (data) return Promise.resolve(data);
    // Grok's review GRK-3-02: a failed load (offline, not saved yet) is NOT "no questions": never remember it, and say so
    if (!loading) loading = fetch("data/questions.json").then((r) => { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then((d) => (data = d)).catch(() => { loading = null; return { questions: [], error: true }; });
    return loading;
  }
  function openCount() {
    const done = new Set(queue().filter((a) => a.q).map((a) => a.q));
    return data ? data.questions.filter((q) => !done.has(q.id)).length : 0;
  }
  function badge() {
    const b = document.getElementById("btn-questions");
    if (!b) return;
    const n = openCount(), p = queue().length, w = waiting().reduce((t, x) => t + (x.n || 0), 0);
    b.textContent = "Questions" + (n ? ` (${n})` : "") + (p ? ` · ${p} not sent` : "") + (w ? ` · ${w} sent, waiting` : "");
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
  const hasConf = (list, scan, fact) => list.some((a) => a.confirm && a.confirm.scan === scan && a.confirm.fact === fact);
  /* "saved" (only on this phone) | "sent" (waiting for a receipt) | "received" | null */
  function status(scan, fact) {
    if (hasConf(queue(), scan, fact)) return "saved";
    const b = sent().slice().reverse().find((x) => hasConf(x.items || [], scan, fact));
    return b ? (b.received ? "received" : "sent") : null;
  }
  const isQueuedConfirm = (scan, fact) => status(scan, fact) != null;
  function queueNote(kind, key, dataObj, label) {
    const list = queue().filter((a) => !(a.note && a.note.kind === kind && a.note.key === key));
    list.push({ note: Object.assign({ kind, key }, dataObj), label: label || undefined, at: new Date().toISOString() });
    writeQ(list);
    return list.length;
  }

  function stamp(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
  }
  function payload(items, made) {
    const t = made ? new Date(made) : new Date();
    return { name: `answers_owner_${stamp(t)}.json`,
      body: { kind: "owner-answers", made: t.toISOString(), answers: (items || queue()).map((a) => (a.confirm ? { confirm: a.confirm } : a.note ? { note: a.note } : { q: a.q, choice: a.choice, text: a.text })) } };
  }
  function plain(items) {
    const qs = data ? Object.fromEntries(data.questions.map((q) => [q.id, q])) : {};
    return (items || queue()).map((a) => a.confirm ? `Confirmed: ${a.confirm.scan} ${a.confirm.fact}${a.label ? " (" + a.label + ")" : ""}`
      : a.note ? (a.label || a.note.kind)
      : `${qs[a.q] ? qs[a.q].ask : a.q} -> ${a.choice}${a.text ? " (" + a.text + ")" : ""}`).join("\n");
  }
  const VIA = { github: "GitHub", copy: "a chat copy", file: "a file" };
  /* the batch leaves the "not sent" list and waits as "sent" until its receipt arrives (or the owner deletes it) */
  function markSent(items, made, name, via, fromQueue) {
    const list = sent().filter((b) => madeKey(b.made) !== madeKey(made));
    list.push({ made, name, n: items.length, at: new Date().toISOString(), via, items });
    writeSent(list);
    if (fromQueue) writeQ([]);          // a resent older batch leaves newer unsent answers alone
  }
  function issueUrl(name, body, items) {
    const text = "Titan answers from the app. Press Submit: nothing else to do. A robot merges them and answers here within a few minutes.\n\n"
      + plain(items) + "\n\n```json\n" + JSON.stringify(body) + "\n```\n";
    return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent("Titan answers " + name.replace(/^answers_owner_|\.json$/g, ""))}&body=${encodeURIComponent(text)}`;
  }
  async function send(how, again) {
    const prev = again ? sent().find((b) => madeKey(b.made) === again) : null;
    const items = prev ? prev.items : queue();
    if (!items.length) return;
    const { name, body } = payload(items, prev && prev.made);
    const json = JSON.stringify(body, null, 1);
    if (how === "github") {
      if (navigator.onLine === false) return say("You're offline. Your answers stay saved on this phone; send them when you're back online.");
      const url = issueUrl(name, body, items);
      if (url.length > 7800) return say("Too many answers for one GitHub page. Use Save answers file (or Copy for chat) instead.");
      const w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url;
      markSent(items, body.made, name, "github", !prev);
      return say("GitHub opened with your answers: press Submit there. This page shows them as received once they are in.");
    }
    if (how === "copy") {
      const text = "Titan answers file " + name + "\n" + plain(items) + "\n\n" + json;
      try { await navigator.clipboard.writeText(text); markSent(items, body.made, name, "copy", !prev); say("Copied. Paste it to Claude in chat; it shows as received once Claude merged it."); }
      catch (e) { say("Could not copy on this device; use Save answers file."); }
      return;
    }
    const file = typeof File === "function" ? new File([json], name, { type: "application/json" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name, text: "Titan Reliquary answers: save to Drive, folder collection-incoming (AI change files)" }); markSent(items, body.made, name, "file", !prev); say("Shared. Save it to Drive, in the folder collection-incoming (AI change files)."); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    markSent(items, body.made, name, "file", !prev);
    say("Saved " + name + ". Put it in Drive, folder collection-incoming (AI change files).");
  }
  const when = (iso) => { try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch (e) { return iso; } };
  function sentHtml() {
    const list = sent().slice().reverse();
    if (!list.length) return "";
    return `<h2>Sent</h2><ul class="qv-sent">${list.map((b) => {
      const k = esc(madeKey(b.made));
      if (b.received) {
        const r = b.received;
        return `<li class="qv-rcv"><b>✓ Received ${esc(when(r.at))}:</b> ${esc(b.n)} answer${b.n === 1 ? "" : "s"} (sent ${esc(when(b.at))} by ${esc(VIA[b.via] || b.via)})${r.facts != null ? `, ${esc(r.facts)} fact${r.facts === 1 ? "" : "s"} now Verified` : ""}${r.skipped ? `, ${esc(r.skipped)} skipped` : ""}${r.followups ? `; Claude still does ${esc(r.followups)} by hand` : ""}.</li>`;
      }
      const late = Date.now() - Date.parse(b.at) > 2 * 3600e3;
      return `<li class="qv-wait"><b>Sent ${esc(when(b.at))}</b> by ${esc(VIA[b.via] || b.via)}: ${esc(b.n)} answer${b.n === 1 ? "" : "s"}, <b>not received yet</b>.
        ${b.via === "github" ? "If you did not press Submit on GitHub, send it again." : "Claude merges it at the next session."}${late ? " It has been a while: send it again, or Copy for chat." : ""}
        <span class="qv-again"><button type="button" class="hv-btn" data-again="${k}" data-how="github">Send again</button> <button type="button" class="hv-btn" data-again="${k}" data-how="copy">Copy for chat</button> <button type="button" class="qv-undo" data-forget="${k}">Delete</button></span></li>`;
    }).join("")}</ul>`;
  }
  function say(msg) { if (!root) return; root.dataset.say = msg || ""; const s = root.querySelector("#qv-say"); if (s && msg) { s.textContent = msg; s.hidden = false; } }

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
  function render(failed) {
    const body = root.querySelector("#qv-body");
    if (failed && !data) {   // GRK-3-02: say it could not load; never "No open questions"
      body.innerHTML = `<p class="hv-status hv-warn">Can't load the questions right now (no connection, and they aren't saved on this device yet).</p>
        <button type="button" class="hv-btn hv-primary" data-retry>Try again</button>`;
      return;
    }
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
    const confirms = q.filter((a) => a.confirm), notes = q.filter((a) => a.note);
    body.innerHTML = `
      ${qs.length ? `<ol class="qv-list">${qs.map(card).join("")}</ol>` : `<p class="hv-status">No open questions right now. Thank you!</p>`}
      ${confirms.length ? `<h2>Facts you confirmed</h2><ul class="qv-conf">${confirms.map((a) => `<li>${esc(a.confirm.scan)} · ${esc(a.confirm.fact)}${a.label ? " · " + esc(a.label) : ""} <button type="button" class="qv-undo" data-undo="${esc(a.confirm.scan + "|" + a.confirm.fact)}">Undo</button></li>`).join("")}</ul>` : ""}
      ${originHtml()}
      ${notes.length ? `<h2>Also in your answers file</h2><ul class="qv-conf">${notes.map((a) => `<li>${esc(a.label || a.note.kind)} <button type="button" class="qv-undo" data-unnote="${esc(a.note.kind + "|" + a.note.key)}">Undo</button></li>`).join("")}</ul>` : ""}
      <h2>Send your answers</h2>
      <p class="hv-sub">${q.length ? `<b>${q.length} answer${q.length === 1 ? "" : "s"} saved on this phone only. Not sent yet.</b>` : "Nothing new to send. Answer a question above, or tap Confirm on a fact in a coin's view."}
        ${q.length && navigator.onLine === false ? " You're offline: they stay saved here until you send them." : ""}</p>
      <div class="qv-send">
        <button type="button" class="hv-btn hv-primary" data-send="github"${q.length ? "" : " disabled"}>Send to Claude</button>
        <button type="button" class="hv-btn" data-send="copy"${q.length ? "" : " disabled"}>Copy for chat</button>
        <button type="button" class="hv-btn" data-send="file"${q.length ? "" : " disabled"}>Save answers file</button>
      </div>
      <p class="hv-sub qv-how">Send to Claude opens GitHub with your answers filled in: press Submit. A robot merges them within minutes and this page then says <b>Received</b>.</p>
      <p class="qv-say" id="qv-say" role="status" hidden></p>
      ${sentHtml()}`;
  }
  /* ---------- #77 where each coin came from (bought, inherited, found ...): the one fact no catalogue knows ---------- */
  const HOW = ["Bought", "Inherited", "A gift", "Found in change", "Brought back from a trip", "Don't know"];
  let flips = null, org = { open: false, how: "", who: "", when: "", country: "", picked: new Set() };
  function loadFlips() {
    if (flips) return Promise.resolve(flips);
    return fetch("data/index.json").then((r) => r.json()).then((d) => (flips = (d.flips || []).filter((f) => f.scan))).catch(() => (flips = []));
  }
  function originHtml() {
    if (!org.open) return `<h2>Where did they come from?</h2><p class="hv-sub">Bought, inherited, a gift, found in change: only you know, and it is what makes the
      collection worth keeping for 50 years. Pick a group of coins and say where they came from once.</p>
      <button type="button" class="hv-btn" data-org-open>Tell where coins came from</button>`;
    const countries = [...new Set((flips || []).map((f) => f.country))].sort();
    const inC = (flips || []).filter((f) => f.country === org.country);
    return `<h2>Where did they come from?</h2>
      <p class="qv-ask">1. How did you get them?</p>
      <div class="qv-opts" role="group" aria-label="How you got them">${HOW.map((h) => `<button type="button" class="hv-btn qv-opt${org.how === h ? " is-on" : ""}" data-org-how="${esc(h)}" aria-pressed="${org.how === h}">${esc(h)}</button>`).join("")}</div>
      <label class="qv-free">From whom or where (optional) <input type="text" data-org-who maxlength="120" value="${esc(org.who)}" placeholder="e.g. Dad, a coin show, a trip to Germany"></label>
      <label class="qv-free">When (optional) <input type="text" data-org-when maxlength="40" value="${esc(org.when)}" placeholder="e.g. 1995, the 1980s"></label>
      <p class="qv-ask">2. Which coins?</p>
      <label class="qv-free">Country <select data-org-country class="qv-select"><option value="">Choose a country</option>${countries.map((c) => `<option${c === org.country ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
      ${org.country ? `<p><button type="button" class="hv-btn" data-org-all>Pick all ${inC.length} from ${esc(org.country)}</button></p>
        <ul class="qv-picks">${inC.map((f) => `<li><label><input type="checkbox" data-org-pick="${esc(f.scan)}"${org.picked.has(f.scan) ? " checked" : ""}> ${esc(f.scan)} · ${esc(f.year)} · ${esc(f.denom)}</label></li>`).join("")}</ul>` : ""}
      <p class="hv-sub">${org.picked.size} coin${org.picked.size === 1 ? "" : "s"} picked (you can pick from several countries).</p>
      <button type="button" class="hv-btn hv-primary" data-org-add${org.how && org.picked.size ? "" : " disabled"}>Add to my answers file</button>`;
  }
  function addOrigin() {
    const coins = [...org.picked].sort();
    const key = coins.join(",");
    const label = `Where ${coins.length} coin${coins.length === 1 ? "" : "s"} came from: ${org.how}${org.who ? ", " + org.who : ""}${org.when ? ", " + org.when : ""} (${coins.slice(0, 6).join(", ")}${coins.length > 6 ? " ..." : ""})`;
    queueNote("origin", key, { coins, how: org.how, who: org.who || null, when: org.when || null }, label);
    org = { open: true, how: "", who: "", when: "", country: org.country, picked: new Set() };
    render(); say("Added. Send the answers file when you are done.");
  }

  function build() {
    root = document.createElement("div");
    root.id = "questions-view"; root.className = "health-view questions-view"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "qv-title");
    root.innerHTML = `<div class="hv-shell">
      <div class="hv-top"><h1 id="qv-title" tabindex="-1">Questions for you</h1><button type="button" class="hv-btn" data-close>Close</button></div>
      <p class="hv-sub">Things only you can settle by looking at a coin. No rush: most can wait for the pro-photo session. Tap an answer; send them all at the end.</p>
      <div id="qv-body"><p class="hv-status">Loading…</p></div></div>`;
    document.body.appendChild(root);
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-close]")) return close(true);
      if (t.closest("[data-retry]")) { const b = t.closest("[data-retry]"); b.disabled = true; b.textContent = "Trying…"; return load().then((d) => { render(d && d.error); badge(); }); }
      const opt = t.closest(".qv-opt");
      if (opt) {
        const x = data.questions.find((qq) => qq.id === opt.dataset.q), o = x && x.options[+opt.dataset.i];
        if (o) { setAnswer(x.id, o.label, ""); render(); const f = root.querySelector(`[data-free="${x.id}"]`); if (f) f.focus(); }
        return;
      }
      const coin = t.closest("[data-coin]");
      if (coin) { e.preventDefault(); const s = coin.dataset.coin; close(true); setTimeout(() => { try { window.__galleryBridge.setWing("gallery", false); window.__galleryBridge.openDrawer(s); } catch (err) { location.hash = "coin=" + s; } }, 60); return; }
      if (t.closest("[data-org-open]")) { org.open = true; return loadFlips().then(() => render()); }
      const how = t.closest("[data-org-how]");
      if (how) { org.how = how.dataset.orgHow; return render(); }
      if (t.closest("[data-org-all]")) { (flips || []).filter((f) => f.country === org.country).forEach((f) => org.picked.add(f.scan)); return render(); }
      if (t.closest("[data-org-add]")) return addOrigin();
      const un = t.closest("[data-unnote]");
      if (un) { const [k, key] = un.dataset.unnote.split("|"); writeQ(queue().filter((a) => !(a.note && a.note.kind === k && a.note.key === key))); render(); return; }
      const undo = t.closest("[data-undo]");
      if (undo) { const [s, f] = undo.dataset.undo.split("|"); writeQ(queue().filter((a) => !(a.confirm && a.confirm.scan === s && a.confirm.fact === f))); render(); return; }
      const snd = t.closest("[data-send]");
      if (snd) return send(snd.dataset.send).then(() => render()).then(() => say(root.dataset.say || ""));
      const ag = t.closest("[data-again]");
      if (ag) return send(ag.dataset.how, ag.dataset.again).then(() => render()).then(() => say(root.dataset.say || ""));
      const fg = t.closest("[data-forget]");
      if (fg) { if (confirm("Delete this sent batch from the phone? Only do this if it reached Claude another way.")) { writeSent(sent().filter((b) => madeKey(b.made) !== fg.dataset.forget)); render(); } return; }
    });
    root.addEventListener("change", (e) => {
      const c = e.target.closest("[data-org-country]");
      if (c) { org.country = c.value; render(); return; }
      const pk = e.target.closest("[data-org-pick]");
      if (pk) { if (pk.checked) org.picked.add(pk.dataset.orgPick); else org.picked.delete(pk.dataset.orgPick); const b = root.querySelector("[data-org-add]"); if (b) b.disabled = !(org.how && org.picked.size); const sub = pk.closest("ul").nextElementSibling; if (sub) sub.textContent = `${org.picked.size} coin${org.picked.size === 1 ? "" : "s"} picked (you can pick from several countries).`; }
    });
    root.addEventListener("input", (e) => {
      if (e.target.closest("[data-org-who]")) { org.who = e.target.value.trim(); return; }
      if (e.target.closest("[data-org-when]")) { org.when = e.target.value.trim(); return; }
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
    root.dataset.say = "";
    load().then((d) => { if (!root.hidden) render(d && d.error); badge(); });
    checkReceipts();
  }
  function close(navigate) {
    if (!root || root.hidden) return;
    root.hidden = true; document.body.style.overflow = "";
    if (navigate && /^#questions/i.test(location.hash)) location.hash = "hall";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
  }
  function route() { if (/^#questions(\b|$)/i.test(location.hash)) open(); else close(false); }
  window.addEventListener("hashchange", route);
  window.addEventListener("online", () => { checkReceipts(); if (!data) load().then((d) => { if (root && !root.hidden) render(d && d.error); badge(); }); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && waiting().length) checkReceipts(); });
  window.addEventListener("titan:atmo", applyTone);
  window.TitanQuestions = { open, close, queueConfirm, isQueuedConfirm, status, queueNote, pending: () => queue().length, waiting: () => waiting().length, count: () => load().then((d) => (d && d.error ? null : openCount())) };
  const boot = () => { route(); load().then(badge); if (waiting().length) checkReceipts(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
