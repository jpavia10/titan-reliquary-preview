#!/usr/bin/env python3
"""The owner's fix list, rendered from data (2026-10-09; it used to be hand-edited HTML, and its text copy silently lost sections).

    python3 tools/fixlist/render.py OUT.html            writes the artifact page (published by Claude) and docs/FIX_LIST.md

Source: docs/fixlist/items.json (items keep their numbers forever; sections, chains, "waiting on you" and the state-of-the-union text).
Read live, never typed: the headline numbers (data/status.json, data/index.json), the open owner questions (data/questions.json) and
"The other AIs" (docs/agents/roles.json, queues.json and the research loop's homework state, docs/agents/homework/).
Template pieces (fonts, styles, the tick-and-copy script) live next to this file.
"""
import datetime, html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
E = html.escape
SIZE = {"small": "chip", "medium": "chip", "large": "chip big"}
ACC = {"grok": "#c0392b", "muse": "#7d3c98", "chatgpt": "#138d75", "gemini": "#2e86c1"}


def J(*p, default=None):
    f = os.path.join(ROOT, *p)
    if not os.path.exists(f): return default
    with open(f, encoding="utf-8") as fh: return json.load(fh)


def stats():
    st = J("data", "status.json", default={}); idx = J("data", "index.json", default={}); b = idx.get("board") or {}
    sp, ph, p1, tr, al = st.get("specimens", {}), st.get("photos", {}), st.get("phase1", {}), st.get("trust", {}), st.get("albums", {})
    lv = tr.get("by_level", {})
    return [
        (f"{sp.get('total', 0)}", f"pieces in flips ({sp.get('coins', 0)} coins, {sp.get('tokens', 0)} tokens), {st.get('countries', 0)} countries"),
        (f"${b.get('grand', 0):,.0f}", f"headline value at the latest metal prices (silver ${(b.get('silver') or {}).get('spot', 0):,.2f}, gold ${(b.get('gold') or {}).get('spot', 0):,.0f})"),
        (f"{ph.get('specimens_with_any', 0)}", f"pieces with a phone photo; {ph.get('still_needed', 0)} still need one, {ph.get('specimens_with_both_sides', 0)} have both sides"),
        (f"{p1.get('done', 0)} / {p1.get('total', 0)}", f"pieces through Phase 1 ({p1.get('pct', 0)} %): " + ", ".join(f"{n} need a {k if k != 'mint' else 'mint mark read'}" for k, n in (p1.get('missing') or {}).items() if n)),
        (f"{al.get('slots_filled', 0)} / {al.get('slots', 0)}", "album slots filled, all 33 albums read from your page photos"),
        (f"{tr.get('pct_cited', 0)} %", f"of the {tr.get('facts', 0):,} facts on screen are cited or confirmed; {lv.get('checked', 0)} are Checked by two independent sources"),
    ]


def item_li(n, it):
    tags = []
    if it.get("partly"): tags.append('<span class="chip done">partly done</span>')
    if it.get("size"): tags.append(f'<span class="{SIZE[it["size"]]}">{it["size"]}</span>')
    if it.get("you"): tags.append('<span class="chip you">needs you</span>')
    if it.get("new"): tags.append('<span class="chip new">new</span>')
    pre = []
    if it.get("needs"): pre.append(f'<b>Needs first:</b> {E(it["needs"])}')
    if it.get("unlocks"): pre.append(f'<b>Unlocks:</b> {E(it["unlocks"])}')
    pre_html = f'<span class="d needs">{" · ".join(pre)}</span>' if pre else ""
    if it.get("state") == "done":
        tags = [f'<span class="chip done">{E(it.get("note") or "done")}</span>']
        return (f'      <li><div class="item" style="display:grid;grid-template-columns:30px 2.2em 1fr;gap:10px;padding:13px 16px"><span aria-hidden="true" style="font-size:1.2rem;color:var(--ok)">✓</span>'
                f'<span class="num">{n}</span><span class="txt"><span class="t">{E(it["title"])}</span><span class="d">{E(it.get("desc") or "")}</span><span class="tags">{"".join(tags)}</span></span></div></li>\n')
    return (f'      <li><label class="item"><input type="checkbox" id="i{n}" data-n="{n}"><span class="num">{n}</span><span class="txt">'
            f'<span class="t">{E(it["title"])}</span><span class="d">{E(it.get("desc") or "")}</span>{pre_html}<span class="tags">{"".join(tags)}</span></span></label></li>\n')


def section(title, sub, body, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'  <section{c}>\n    <h2>{E(title)} <span>{E(sub)}</span></h2>\n{body}  </section>\n\n'


def ai_cards():
    roles = J("docs", "agents", "roles.json", default={"agents": {}}); q = J("docs", "agents", "queues.json", default={"agents": []})
    st = J("docs", "agents", "homework", "assignments.json", default={"assignments": []}); met = (J("docs", "agents", "homework", "metrics.json", default={}) or {}).get("agents", {})
    sys.path.insert(0, os.path.join(ROOT, "tools", "agents"))
    import homework as HW
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = []
    for aid, ag in roles["agents"].items():
        proj = next((a for a in q["agents"] if a["id"] == aid), {"tasks": []})["tasks"]
        mine = [a for a in st["assignments"] if a["agent"] == aid and a["status"] == "open"]
        cal = HW.calibration_due(roles, ROOT, aid, now)
        rows = "".join(f'<li><b>Now</b> {E(t["title"])} <span class="fx">{E(t["fix"])}</span></li>' for t in proj if t["state"] == "now")
        rows += "".join(f'<li><b>Test</b> Blind photo test, the {E(p["id"])} pack ({p["photos"]} coins) <span class="fx">{"#19" if p["id"] == "locked" else "#4"}</span></li>' for p in cal)
        rows += "".join(f'<li><span class="q">Homework</span> {E(roles["kinds"][a["kind"]]["role"])}: {len(a["items"])} items, due {a["lease_until"][5:10]} <span class="fx">{E(a["id"])}</span></li>' for a in mine)
        rows += "".join(f'<li><span class="q">Then</span> {E(t["title"])} <span class="fx">{E(t["fix"])}</span></li>' for t in proj if t["state"] in ("next", "later"))
        rows += "".join(f'<li><span class="q">Always</span> {E(t["title"])}</li>' for t in proj if t["state"] == "always")
        m = met.get(aid) or {}
        num = (f'{m["checked_n"]} of its facts checked by another AI: {m["confirmed"]} confirmed, {m["wrong"]} wrong.' if m.get("checked_n") else "None of its facts checked by another AI yet.")
        chip = '<span class="chip done">active</span>' if ag["status"] == "active" else f'<span class="chip">{E(ag["status"])}</span>'
        out.append(f'      <div class="ai" style="--acc:{ACC.get(aid, "var(--brass)")}"><div class="ai-h"><b>{E(ag["name"])}</b>{chip}</div><p class="ai-s">{E(ag["strength"])}</p>'
                   f'<ul class="ai-q">{rows}</ul><p class="ai-r"><b>Measured:</b> {E(num)} <b>Gets work:</b> {E(ag["reach"])}</p></div>\n')
    return ('    <p class="ai-intro">The research loop hands out homework from the data after every update (docs/agents/RESEARCH_LOOP.md): '
            'each AI gets the kinds it is best at, never its own facts to check, and a different AI checks every fact. Their full pages: Drive '
            '“WORK QUEUE for …” docs, and docs/agents/ in the repo.</p>\n    <div class="ais-grid">\n' + "".join(out) + "    </div>\n")


def questions():
    qs = (J("data", "questions.json", default={}) or {}).get("questions", [])
    rows = "".join(f'      <div><span class="q">{E(q.get("coin") or "?")}</span><span>{E(q["ask"])}</span></div>\n' for q in qs)
    rows += '      <div><span class="q">→</span><span>Answer them in the app: Hall footer → Questions. Tap your answers, then “Save answers file” into the Drive change-file folder, or “Copy for chat” and paste it to me.</span></div>\n'
    return len(qs), '    <div class="qa">\n' + rows + "    </div>\n"


def render(out_html):
    d = J("docs", "fixlist", "items.json"); items = {int(k): v for k, v in d["items"].items()}
    st = J("data", "status.json", default={}); build = st.get("build") or "?"; day = (st.get("generated_at") or "")[:10]
    parts = [f'<div class="wrap">\n  <header>\n    <h1>Titan Fix List</h1>\n    <p>{E(d["intro"]).replace("BUILD", E(build))}</p>\n'
             '    <div class="legend"><span class="chip">small</span> about an hour <span class="chip">medium</span> a session <span class="chip big">large</span> several sessions '
             '<span class="chip you">needs you</span> you supply something</div>\n  </header>\n\n']
    s = d["sotu"]
    so = (f'    <p class="one"><b>The one thing to be best in the world at:</b> {E(s["one"])}</p>\n    <div class="stats">\n'
          + "".join(f'      <div class="stat"><b>{E(a)}</b><span>{E(b)}</span></div>\n' for a, b in stats()) + "    </div>\n")
    for h, key in (("What is strong", "strong"), ("What is holding it back", "holding"), ("The next three moves, in order", "next")):
        so += f"    <h3>{h}</h3>\n    <ul>\n" + "".join(f"      <li><b>{E(b)}</b> {E(t)}</li>\n" for b, t in s[key]) + "    </ul>\n"
    parts.append(f'  <section class="sotu" aria-labelledby="sotu-h">\n    <h2 id="sotu-h">State of the union <span>{E(day)}, build {E(build)}</span></h2>\n{so}  </section>\n\n')
    parts.append(section("What unlocks what", "read right to left: do the last link first",
                         '    <ul class="chain">\n' + "".join(f'      <li><b>{E(a)}</b><span>{E(b)}</span></li>\n' for a, b in d["chains"]) + "    </ul>\n"))
    parts.append(section("Waiting on you", "not tickable: only you can do these",
                         '    <div class="todo">\n' + "".join(f'      <div><i class="dot"></i><span><b>{E(a)}</b> {E(b)}</span></div>\n' for a, b in d["you"]) + "    </div>\n"))
    nq, qbody = questions()
    parts.append(section("Questions for you", f"{nq} open, all in the app; only the coin itself can answer", qbody))
    parts.append(f'  <section class="ais" id="ais">\n    <h2>The other AIs <span>what each one is doing now (updated {E(day)})</span></h2>\n{ai_cards()}  </section>\n\n')
    placed = set()
    for sec in d["sections"]:
        body = ""
        for g in sec["groups"]:
            if g.get("label"): body += f'      <li class="grp" aria-hidden="false">{E(g["label"])}</li>\n'
            for n in g["items"]: body += item_li(n, items[n]); placed.add(n)
        parts.append(section(sec["title"], sec["sub"], "    <ul>\n" + body + "    </ul>\n", sec.get("cls", "")))
    done = [n for n in d.get("done_order", []) if items[n]["state"] == "done"]
    done += sorted((n for n, it in items.items() if it["state"] == "done" and n not in done and n not in placed), reverse=True)
    parts.append(section("Done", "shipped and checked", "    <ul>\n" + "".join(item_li(n, items[n]) for n in done) + "    </ul>\n"))
    missing = [n for n, it in items.items() if it["state"] != "done" and n not in placed]
    if missing: raise SystemExit(f"open items not placed in any section: {missing}")
    body = "".join(parts) + "</div>\n"
    head = open(os.path.join(HERE, "template_head.html"), encoding="utf-8").read()
    script = open(os.path.join(HERE, "template_script.html"), encoding="utf-8").read()
    bar = ('<div class="bar" role="region" aria-label="Your picks">\n  <div class="in">\n    <span class="count" id="count">0 picked</span>\n'
           '    <span class="picked" id="picked">Tick items above.</span>\n    <button type="button" class="ghost" id="clear">Clear</button>\n'
           '    <button type="button" id="copy">Copy my picks</button>\n    <span class="copied" id="copied" hidden>Copied</span>\n  </div>\n</div>\n\n')
    with open(out_html, "w", encoding="utf-8", newline="\n") as fh: fh.write(head + "\n\n" + body + "\n" + bar + script + "\n")
    write_md(body, build, day)
    return len(items), sum(1 for it in items.values() if it["state"] != "done")


def write_md(body, build, day):
    T = lambda x: html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x))).strip().replace(" :", ":").replace(" ,", ",")
    out = ["<!-- doc-status: current; normative: no -->", "# Titan Fix List (text copy)", "",
           f"Text copy of the owner's live checklist (claude.ai/artifact/Aogoa4MfwCVPpck9xKUV8M), rendered from docs/fixlist/items.json by tools/fixlist/render.py "
           f"together with the artifact, so the two never differ. Item numbers never change. Copied {day}, build {build}.", ""]
    for sec in re.findall(r"<section[^>]*>(.*?)</section>", body, re.S):
        h = re.search(r"<h2[^>]*>(.*?)</h2>", sec, re.S).group(1)
        sub = re.search(r"<span>(.*?)</span>", h)
        out += [f"## {T(re.sub(r'<span>.*?</span>', '', h))}" + (f" ({T(sub.group(1))})" if sub else ""), ""]
        for m in re.finditer(r'<p class="(?:one|ai-intro)">(.*?)</p>|<div class="stat"><b>(.*?)</b><span>(.*?)</span></div>|<h3>(.*?)</h3>|<li class="grp"[^>]*>(.*?)</li>'
                             r'|<div class="ai"[^>]*><div class="ai-h"><b>(.*?)</b>(.*?)</div><p class="ai-s">(.*?)</p><ul class="ai-q">(.*?)</ul><p class="ai-r">(.*?)</p></div>'
                             r'|<li>(<(?:label|div) class="item".*?)</li>|<li><b>(.*?)</b>(.*?)</li>|<div><i class="dot"></i><span>(.*?)</span></div>|<div><span class="q">(.*?)</span><span>(.*?)</span></div>', sec, re.S):
            g = m.groups()
            if g[0]: out += [T(g[0]), ""]
            elif g[1]: out.append(f"- **{T(g[1])}** {T(g[2])}")
            elif g[3]: out += ["", f"### {T(g[3])}", ""]
            elif g[4]: out += ["", f"### {T(g[4])}", ""]
            elif g[5]:
                out += ["", f"### {T(g[5])} ({T(g[6])})", "", T(g[7]), ""] + [f"- {T(x)}" for x in re.findall(r"<li>(.*?)</li>", g[8], re.S)] + ["", T(g[9]), ""]
            elif g[10]:
                li = g[10]; n = re.search(r'<span class="num">(.*?)</span>', li).group(1); t = re.search(r'<span class="t">(.*?)</span>', li, re.S).group(1)
                ds = re.findall(r'<span class="d(?: needs)?">(.*?)</span>(?=<span class="(?:d|tags))', li, re.S)
                tags = [T(x) for x in re.findall(r'<span class="chip[^"]*">(.*?)</span>', li)]
                out.append(f"- {'[x]' if '✓' in li[:300] else '[ ]'} **#{n} {T(t)}**: " + " ".join(T(x) for x in ds) + (f" _[{', '.join(tags)}]_" if tags else ""))
            elif g[11]: out.append(f"- **{T(g[11])}** {T(g[12])}")
            elif g[13]: out.append(f"- {T(g[13])}")
            elif g[14]: out.append(f"- **{T(g[14])}** {T(g[15])}")
        out.append("")
    with open(os.path.join(ROOT, "docs", "FIX_LIST.md"), "w", encoding="utf-8", newline="\n") as fh: fh.write("\n".join(out).rstrip() + "\n")


if __name__ == "__main__":
    n, o = render(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs", "fixlist", "fix-list.html"))
    print(f"{n} items, {o} open -> {sys.argv[1] if len(sys.argv) > 1 else 'docs/fixlist/fix-list.html'} + docs/FIX_LIST.md")
