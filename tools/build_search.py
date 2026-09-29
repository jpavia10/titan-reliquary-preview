#!/usr/bin/env python3
"""Build data/search.json: {scan: normalized full text} for the app's lazy notes search.

Reads data/detail/*.json, keeping only scans listed in data/index.json flips (index is the
authority; detail files can hold stale records). Text is normalized exactly like norm() in app.js
(NFD accent strip, lowercase, o/ae/ss folds, single spaces). Run from the repo root.
Fields already matched from index.json (country, year, mint...) are left out.
"""
import json, re, sys, unicodedata
from pathlib import Path

FIELDS = ["scan_note", "continent_line", "year_line", "denom_line", "refs", "metal", "specs",
          "mintage", "design", "tender", "face_line", "label", "parked", "photo", "notes"]

def norm(s):
    s = unicodedata.normalize("NFD", str(s if s is not None else ""))
    s = "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F).lower()
    s = s.replace("ø", "o").replace("æ", "ae").replace("ß", "ss")
    return re.sub(r"\s+", " ", s).strip()

def main(root=Path("data")):
    live = {f["scan"] for f in json.loads((root / "index.json").read_text(encoding="utf-8"))["flips"]}
    out = {}
    for p in sorted((root / "detail").glob("*.json")):
        for scan, rec in json.loads(p.read_text(encoding="utf-8")).items():
            if scan not in live or not isinstance(rec, dict):
                continue
            text = norm(" ".join(str(rec[k]) for k in FIELDS if rec.get(k)))
            if text:
                out[scan] = text
    (root / "search.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} entries, {(root / 'search.json').stat().st_size} bytes")

if __name__ == "__main__":
    main()
