#!/usr/bin/env python3
"""Printable inventory of the whole collection (fix list #64), for insurance and family. Written by publish.py on every publish:

  data/inventory.html          every piece with its photo, what it is, where it came from, its value and how sure we are (insurance copy)
  data/inventory-family.html   the same without any values (the family copy; the owner decides which copies to hand out)

One self-contained page each (inline CSS, large type, prints on Letter or A4; photos are the Phase 1 cut-outs, loaded from ../photos/).
Pure function of the built data/ (index.json + detail/*.json) and data/status.json; never edits anything.
    python3 tools/pipeline/inventory.py [data/]      writes both pages next to the data
"""
import glob, html, json, os, sys

E = html.escape
LV = {"verified": "Verified by the owner", "owner": "Owner", "checked": "Checked (two sources)", "reference": "Catalogue source",
      "photo": "Read from the photo", "ai": "AI estimate", "imported": "From the original ledger", "review": "Being checked"}


def _cert(d, fact):
    c = d.get("certainty") or {}
    e = c.get(fact) or {"level": "imported"}
    if "like" in e and e["like"] in c: e = dict(c[e["like"]], level=e["level"])
    return LV.get(e.get("level"), "")


def page(out, values=True):
    idx = json.load(open(os.path.join(out, "index.json"), encoding="utf-8"))
    st = json.load(open(os.path.join(out, "status.json"), encoding="utf-8")) if os.path.exists(os.path.join(out, "status.json")) else {}
    det = {}
    for f in sorted(glob.glob(os.path.join(out, "detail", "*.json"))): det.update(json.load(open(f, encoding="utf-8")))
    b = idx["board"]
    when = (st.get("generated_at") or idx.get("generated_at") or "")[:10]
    flips = sorted((f for f in idx["flips"] if f.get("scan")), key=lambda f: (f.get("continent") or "", f.get("country") or "", str(f.get("year") or ""), f["scan"]))
    rows, last = [], None
    for f in flips:
        d = det.get(f["scan"]) or {}
        if f.get("country") != last:
            last = f.get("country")
            n = sum(1 for x in flips if x.get("country") == last)
            rows.append(f'<tr class="grp"><th colspan="{6 if values else 5}">{E(last or "Unknown")} <span>{n} piece{"s" if n != 1 else ""}</span></th></tr>')
        img = f'<img src="../{E(f["thumb"])}" alt="" loading="lazy">' if f.get("thumb") else '<span class="nophoto">no photo yet</span>'
        what = " · ".join(x for x in (str(f.get("year") or ""), f.get("denom") or "", ("mint " + f["mint"]) if f.get("mint") and f["mint"].lower() not in ("unknown", "n/a", "none") else "") if x)
        extra = " · ".join(x for x in (d.get("refs") or "", d.get("metal") or "") if x)
        cells = [f'<td class="ph">{img}</td>', f'<td class="id">{E(f["scan"])}</td>',
                 f'<td><b>{E(what)}</b><br><span class="sub">{E(extra[:140])}</span><br><span class="sure">Year: {E(_cert(d, "year"))} · Catalogue: {E(_cert(d, "catalog"))}</span></td>',
                 f'<td class="from">{E(d.get("origin") or "")}</td>']
        if values: cells.append(f'<td class="val">{"$%.2f" % f["est"] if f.get("est") is not None else "not set"}<br><span class="sure">{E(_cert(d, "value"))}</span></td>')
        cells.append('<td class="chk"></td>')
        rows.append("<tr>" + "".join(cells) + "</tr>")
    lots = []
    for kind, label in (("bullion", "Bullion"), ("sets", "Mint and proof sets"), ("stamps", "Stamps"), ("housing", "Storage (safes, boxes)")):
        for l in idx.get(kind) or []:
            lots.append(f'<tr><td class="id">{E(l.get("scan") or "")}</td><td><b>{E(label)}</b>: {E(l.get("denom_line") or l.get("denom") or "")}<br><span class="sub">{E((l.get("metal") or "")[:160])}</span></td>'
                        + (f'<td class="val">{"$%.2f" % l["est"] if l.get("est") is not None else ""}</td>' if values else "") + '<td class="chk"></td></tr>')
    albums = "".join(f'<tr><td><b>{E(a["family"])}</b><br><span class="sub">{E(a.get("ids") or "")}</span></td><td>{a.get("coins", 0)} coins</td>'
                     + (f'<td class="val">${(a.get("total") or 0):,.2f}</td>' if values else "") + "</tr>" for a in idx.get("albums_glance") or [])
    total = (f'<p class="big">Estimated value of everything: <b>${b["grand"]:,.2f}</b> on {E(when)} (metal at that day\'s price; collector values are estimates, '
             f'see "How sure" on each line). Silver {b["silver"]["oz"]} oz, gold {b["gold"]["oz"]} oz.</p>') if values else ""
    trust = st.get("trust") or {}
    title = "Titan Reliquary inventory" + ("" if values else " (family copy, no values)")
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>{E(title)}</title>
<style>
:root {{ --ink: #111; --muted: #444; --line: #888; --bg: #fff; }}
body {{ margin: 0; padding: 24px; background: var(--bg); color: var(--ink); font: 18px/1.4 Georgia, "Times New Roman", serif; }}
h1 {{ font-size: 32px; margin: 0 0 4px; }} h2 {{ font-size: 24px; margin: 28px 0 8px; break-after: avoid; }}
.big {{ font-size: 20px; }} .note {{ color: var(--muted); font-size: 16px; }}
table {{ width: 100%; border-collapse: collapse; }} td, th {{ border-bottom: 1px solid var(--line); padding: 6px 8px; vertical-align: top; text-align: left; }}
tr {{ break-inside: avoid; }} tr.grp th {{ background: #eee; font-size: 20px; padding-top: 12px; }} tr.grp th span {{ font-weight: normal; color: var(--muted); font-size: 16px; }}
.ph img {{ width: 72px; height: 72px; object-fit: contain; }} .nophoto {{ color: var(--muted); font-size: 13px; }}
.id {{ white-space: nowrap; font-family: ui-monospace, Menlo, monospace; font-size: 16px; }} .sub, .sure {{ color: var(--muted); font-size: 14px; }}
.val {{ white-space: nowrap; text-align: right; }} .from {{ font-size: 15px; max-width: 14em; }} .chk {{ width: 28px; border-left: 1px solid var(--line); }}
.print {{ font: inherit; font-size: 20px; padding: 12px 24px; min-height: 56px; border: 2px solid var(--ink); background: #fff; border-radius: 10px; cursor: pointer; }}
@media print {{ body {{ padding: 0; font-size: 12pt; }} .print {{ display: none; }} .ph img {{ width: 0.8in; height: 0.8in; }} @page {{ margin: 0.5in; }} }}
</style></head><body>
<h1>{E(title)}</h1>
<p class="note">Joseph Pavia's collection: {len(flips)} pieces in 2x2 flips from {idx["counts"].get("countries", "")} countries, plus bullion, sets and {b["albums"].get("folders", "")} albums.
Made {E(when)} from the master record (build {E(str(st.get("build") or ""))}). {trust.get("pct_cited", "")} % of the facts in the app are cited or confirmed; each line says how sure we are of its year,
catalogue number{" and value" if values else ""}. The empty column on the right is for ticking off each piece during a check.</p>
{total}
<p><button class="print" onclick="window.print()">Print</button></p>
<h2>Coins and tokens in flips</h2>
<table><thead><tr><th>Photo</th><th>Id</th><th>What it is</th><th>Where it came from</th>{"<th>Value</th>" if values else ""}<th>✓</th></tr></thead><tbody>
{"".join(rows)}
</tbody></table>
<h2>Bullion, sets, stamps and storage</h2>
<table><tbody>{"".join(lots)}</tbody></table>
<h2>Albums</h2>
<table><tbody>{albums}</tbody></table>
<p class="note">Values are estimates for insurance and planning, not offers. Policy: hold, do not sell.</p>
</body></html>
'''


def write(out):
    for name, values in (("inventory.html", True), ("inventory-family.html", False)):
        with open(os.path.join(out, name), "w", encoding="utf-8", newline="\n") as fh: fh.write(page(out, values))


if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
    write(o); print("wrote inventory.html and inventory-family.html in", o)
