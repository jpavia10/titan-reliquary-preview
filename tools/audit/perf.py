#!/usr/bin/env python3
"""Load-speed audit on a throttled phone profile (the Lighthouse mobile profile: 150 ms round trip, 1.6 Mbit/s down, 0.75 up, CPU 4x slower).

    python3 tools/audit/perf.py [--out docs/audit/perf] [--url-extra "&x=1"] [--label baseline]

Three runs on a 390x844 phone: (A) first visit, the app's default opening (the 1080p film first, owner rule);
(B) first visit with ?nosplash (how fast the app itself is usable); (C) a return visit (HTTP cache + service worker).
For each: first contentful paint, largest contentful paint, layout shift, long-task blocking time, the first 2 s quiet window
after FCP ("interactive"), requests and bytes by type, and a filmstrip (what is on screen at 0.5 .. 12 s).
Software GL in this container: frame rates here say nothing about a phone's GPU; load, parse and layout numbers do.
Writes {out}/{label}.json and filmstrip_{label}_{run}.jpg. Exit 0 always (it is a measurement, not a gate)."""
import json, os, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import serve

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]
NET = {"offline": False, "latency": 150, "downloadThroughput": 1.6 * 1024 * 1024 / 8, "uploadThroughput": 750 * 1024 / 8}
OBS = """
(() => { const m = (window.__perf = { fcp: null, lcp: null, cls: 0, long: [], shifts: [] });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { m.lcp = e.startTime; m.lcpEl = (e.element && (e.element.id || e.element.className || e.element.tagName) || '') + ''; m.lcpSize = e.size; } }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { m.cls += e.value; m.shifts.push([Math.round(e.startTime), +e.value.toFixed(4), (e.sources || []).slice(0, 2).map((s) => s.node && (s.node.id || s.node.className || s.node.nodeName) || '').join('|').slice(0, 80)]); } }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
})();
"""
STRIP = (0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12)


def run(b, base, path, label, out, warm_from=None, watch=14.0):
    from PIL import Image, ImageDraw
    ctx = warm_from or b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    p = ctx.new_page(); errs = []
    p.on("pageerror", lambda e: errs.append(str(e)[:160]))
    p.add_init_script(OBS)
    cdp = ctx.new_cdp_session(p)
    cdp.send("Network.enable"); cdp.send("Network.emulateNetworkConditions", NET); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    t0 = time.time(); shots = []
    p.goto(base + path, wait_until="commit")
    for s in STRIP:
        dt = s - (time.time() - t0)
        if dt > 0: p.wait_for_timeout(int(dt * 1000))
        try: shots.append((round(time.time() - t0, 2), p.screenshot(type="jpeg", quality=60)))
        except Exception: pass
    rest = watch - (time.time() - t0)
    if rest > 0: p.wait_for_timeout(int(rest * 1000))
    m = p.evaluate("""() => { const m = window.__perf || {}; const nav = performance.getEntriesByType('navigation')[0] || {};
      const res = performance.getEntriesByType('resource'); const by = {};
      for (const r of res) { const ext = (r.name.split('?')[0].split('.').pop() || '').toLowerCase(); const k = ['js','css','json','webp','png','jpg','mp4','mp3','ogg','woff2','svg','webm','m4a'].includes(ext) ? ext : 'other';
        by[k] = by[k] || { n: 0, transfer: 0, decoded: 0 }; by[k].n++; by[k].transfer += r.transferSize || 0; by[k].decoded += r.decodedBodySize || 0; }
      return { fcp: m.fcp, lcp: m.lcp, lcpEl: m.lcpEl, cls: m.cls, shifts: m.shifts, long: m.long, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, html: nav.transferSize, requests: res.length, by,
        build: window.TITAN_BUILD || null, dom: document.getElementsByTagName('*').length }; }""")
    long = m.get("long") or []; fcp = m.get("fcp") or 0
    m["tbt"] = sum(max(0, d - 50) for s, d in long if s >= fcp)
    quiet = fcp                                                    # first 2 s window after FCP with no long task
    for s, d in sorted(long):
        if s + d < quiet: continue
        if s - quiet >= 2000: break
        quiet = s + d
    m["interactive"] = round(quiet); m["longest"] = max([d for _, d in long], default=0); m["long_n"] = len(long); m["errors"] = errs[:3]
    m["transfer_total"] = sum(v["transfer"] for v in m["by"].values()) + (m.get("html") or 0)
    del m["long"]
    if shots:
        ims = [Image.open(__import__("io").BytesIO(s)).convert("RGB").resize((195, 422)) for _, s in shots]
        sheet = Image.new("RGB", (len(ims) * 199, 440), (20, 20, 20)); d = ImageDraw.Draw(sheet)
        for i, im in enumerate(ims): sheet.paste(im, (i * 199, 18)); d.text((i * 199 + 4, 3), f"{shots[i][0]:.1f} s", fill=(255, 255, 0))
        sheet.save(os.path.join(out, f"filmstrip_{label}.jpg"), quality=78)
    p.close()
    return m, ctx


def main(argv):
    out = argv[argv.index("--out") + 1] if "--out" in argv else os.path.join(ROOT, "docs", "audit", "perf")
    label = argv[argv.index("--label") + 1] if "--label" in argv else "baseline"
    page = argv[argv.index("--page") + 1] if "--page" in argv else ""          # e.g. next.html: measure another page with the same profile
    os.makedirs(out, exist_ok=True)
    base = serve(ROOT); rep = {"profile": "390x844 phone, 150 ms RTT, 1.6/0.75 Mbit/s, CPU 4x slowdown, gzip like Pages", "runs": {}}
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=GL)
        m, c = run(b, base, page, f"{label}_A_first_visit", out); rep["runs"]["A_first_visit_default"] = m; c.close()
        m, c = run(b, base, page + "?nosplash", f"{label}_B_first_visit_nosplash", out); rep["runs"]["B_first_visit_nosplash"] = m
        c.pages and None
        w = c.new_page(); w.goto(base + page + "?nosplash"); w.wait_for_timeout(6000); w.close()      # let the service worker finish installing (unthrottled)
        m, c = run(b, base, page + "?nosplash", f"{label}_C_return_visit", out, warm_from=c); rep["runs"]["C_return_visit_nosplash"] = m; c.close()
        b.close()
    json.dump(rep, open(os.path.join(out, f"{label}.json"), "w"), indent=1)
    for k, m in rep["runs"].items():
        print(f"{k}: FCP {m['fcp'] and round(m['fcp'])} ms, LCP {m['lcp'] and round(m['lcp'])} ms ({m.get('lcpEl')}), interactive {m['interactive']} ms, TBT {round(m['tbt'])} ms (longest {m['longest']}), CLS {m['cls']:.3f}, DCL {m['dcl'] and round(m['dcl'])}, load {m['load'] and round(m['load'])}, {m['requests']} requests, {m['transfer_total'] // 1024} KB, DOM {m['dom']}, errors {m['errors']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
