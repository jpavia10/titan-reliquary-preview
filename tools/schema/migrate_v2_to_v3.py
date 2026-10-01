#!/usr/bin/env python3
"""ONE-TIME (2026-10-01): upgrade collection/ from schema v2 to v3 in place. Idempotent.

usage (repo root):  python3 tools/schema/migrate_v2_to_v3.py collection/

v3 = v2 + phase tiers (schema/v3/field_tiers.json) + a few nullable fields:
  Specimen.research {phase, phase1_at, phase1_by, phase2_at, phase2_by, open_questions}   (system; phase 0 = ledger import only)
  Specimen.variety, Specimen.measured.die_axis_deg                                         (Phase 2)
  Type.period, Type.ruler, Type.commemorates                                                (Phase 2)
No existing value changes. research.phase starts at 0 for every specimen: the 2026-09-30 bootstrap curation events (tagged
[phase 2] in changes.jsonl) were ledger clean-up, not the owner's Phase 2 (pro photos + critical analysis).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "pipeline")); sys.path.insert(0, HERE)
import collection_io as C, manifest as mf

RESET = "--reset-research" in sys.argv

def main(d):
    col = C.Collection(d); n_s = n_t = 0
    for m in col.specs_by_iso.values():
        for sid, s in m.items():
            if "research" not in s or RESET: s["research"] = {"phase": 0, "phase1_at": None, "phase1_by": None, "phase2_at": None, "phase2_by": None, "open_questions": []}; n_s += 1
            s.setdefault("variety", None); s["measured"].setdefault("die_axis_deg", None)
    for m in col.types_by_iso.values():
        for t in m.values():
            for k in ("period", "ruler", "commemorates"):
                if k not in t: t[k] = None; n_t += 1
    col.save()
    mf.write(d)
    print(f"v3: {n_s} specimens and {sum(len(m) for m in col.types_by_iso.values())} types upgraded; manifest schema_version {mf.SCHEMA_VERSION}")

if __name__ == "__main__":
    main(next((a for a in sys.argv[1:] if not a.startswith("--")), "collection"))
