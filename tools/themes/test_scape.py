#!/usr/bin/env python3
"""Every theme in the registry has an ambient soundscape (Grok, soundscape worker).
Checks: each theme id in wings/themes/manifest.js has a THEME_SCAPE entry in audio/scape/bridge.js; every mapped scape is a
preset defined in audio/scape/presets.js; every PARAMS variant key is a real theme. Exit 1 on any problem."""
import os, re, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
rd = lambda p: open(os.path.join(R, p), encoding="utf-8").read()
themes = sorted(set(re.findall(r'\bid: "([a-z0-9]+)"', rd("wings/themes/manifest.js"))))
br = rd("audio/scape/bridge.js")
m = re.search(r"THEME_SCAPE = \{(.*?)\};", br, re.S); mapping = dict(re.findall(r'([a-z0-9]+): "([a-z0-9]+)"', m.group(1)))
pm = re.search(r"var PARAMS = \{(.*?)\n  \};", br, re.S); variants = re.findall(r"^\s+([a-z0-9]+): \{", pm.group(1), re.M)
presets = set(re.findall(r'TS\.define\("([a-z0-9]+)"', rd("audio/scape/presets.js")))
bad = [f"theme without a scape: {t}" for t in themes if t not in mapping]
bad += [f"{t} -> unknown scape {s}" for t, s in mapping.items() if s not in presets]
bad += [f"variant for unknown theme: {v}" for v in variants if v not in themes]
for b in bad: print("FAIL:", b)
print(f"scape: {len(themes)} themes, {len(presets)} presets, {len(variants)} variants; " + ("ALL MAPPED" if not bad else f"{len(bad)} problem(s)"))
sys.exit(1 if bad else 0)
