"""Possible duplicate records (fix list #41): specimens that share type, year and mint marks.

Owning several of the same coin is normal, so a match is only a question, never an error. Each group is ranked:
  same-photo  two records were cut from the same photo file (the same coin may have been logged twice)
  late-add    one record was created by a change file after the ledger import while a ledger record already matched
  multiple    same type/year/mint, different photos or none (most likely genuine multiples)
publish.py writes data/dupes.json from find(); run this file for a printed report.  Usage: python3 tools/pipeline/dupes.py
"""
import collections, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools", "pipeline"))
import collection_io as C  # noqa: E402

RANK = {"same-photo": 0, "late-add": 1, "multiple": 2}


def find(coll_dir=None):
    coll_dir = coll_dir or os.path.join(ROOT, "collection")
    specs = {}
    for f in sorted(os.listdir(os.path.join(coll_dir, "specimens"))):
        if f.endswith(".json"): specs.update(C.read_json(os.path.join(coll_dir, "specimens", f)))
    photos = C.read_json(os.path.join(coll_dir, "photos.json"))
    photos = photos if isinstance(photos, list) else list(photos.values())
    src = collections.defaultdict(set)
    for p in photos:
        f = (p.get("crop") or {}).get("source_file")
        if f and not p.get("superseded_by"): src[p.get("specimen")].add(f)
    late = set()
    for e in C.read_jsonl(os.path.join(coll_dir, "changes.jsonl")):
        if e.get("entity") == "specimen" and e.get("field") == "(new record)": late.add(e.get("id"))
    groups = collections.defaultdict(list)
    for sid, s in specs.items():
        i = s.get("issue") or {}
        groups[(s.get("type"), i.get("year"), tuple(i.get("mint_marks") or []))].append(sid)
    out = []
    for (tid, year, mints), ids in groups.items():
        if len(ids) < 2: continue
        ids.sort()
        shared = sorted(set.intersection(*(src.get(i, set()) for i in ids)))
        kind = "same-photo" if shared else ("late-add" if any(i in late for i in ids) and any(i not in late for i in ids) else "multiple")
        out.append({"type": tid, "year": year, "mint_marks": list(mints), "ids": ids, "kind": kind, "shared_photos": shared,
                    "added_later": [i for i in ids if i in late]})
    out.sort(key=lambda g: (RANK[g["kind"]], str(g["type"]), str(g["year"])))
    return out


def main():
    groups = find()
    for g in groups:
        extra = (" photo " + ", ".join(g["shared_photos"])) if g["shared_photos"] else (" added later: " + ", ".join(g["added_later"]) if g["added_later"] else "")
        print(f"{g['kind']:10} {g['type']} {g['year']} {''.join(g['mint_marks'])}: {', '.join(g['ids'])}{extra}")
    print(f"{len(groups)} group(s); {sum(g['kind'] != 'multiple' for g in groups)} worth a look")


if __name__ == "__main__":
    main()
