#!/usr/bin/env python3
"""Merge contribution files into the v2 master (collection/).

usage (repo root):
    python3 tools/pipeline/apply_changes.py [--collection collection/] [--dry-run] [--archive] changes_{agent}_{YYYYMMDD-HHMM}.jsonl [...]

A contribution file is JSON Lines, one ChangeEvent per line (format: collection/README.md; worked examples:
collection/templates/phase1_template.jsonl and phase2_template.jsonl). Per file the tool is ALL-OR-NOTHING:
every event is checked, applied to a scratch copy of collection/, the scratch copy is run through tools/schema/validate.py,
and only when everything is clean are the records, boot.json, valuations.jsonl, changes.jsonl and manifest.json written back.
A file with any problem is rejected with a readable report and changes nothing. Re-applying a file that is already
applied does nothing (idempotent). Needs: python3 + jsonschema (pip install jsonschema) for the final validation.

Event fields
    ts, by, entity, id, field, new                 required   (entity: type | specimen | lot | album | issuer | photo)
    old                                            optional   if given it must equal the current value (stale-edit guard)
    source                                         required for by=model:* (where the fact came from: "photo IMG_0412.jpg", "Numista N#1234", ...)
    verified                                       default false. true only for by=owner (or person:<name>); models never verify
    op                                             "set" (default) or "create" (new specimen / type / lot / photo / issuer with its record in `new`)
    supersedes                                     ts of the verified event being deliberately overwritten (required to change a verified field)
    phase, confidence                              optional notes (1 | 1.5 | 2; low | med | high); stored inside `source` in the audit log
"""
import contextlib, copy, datetime, io, json, os, re, shutil, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools", "schema"))
import collection_io as C

RETIRED = {"C297", "C298", "C299", "C300"}          # never reuse (collection/README.md, identity rules)
ENTITIES = ("type", "specimen", "lot", "album", "issuer", "photo")
ALLOWED = {"ts", "by", "entity", "id", "field", "new", "old", "source", "verified", "op", "supersedes", "phase", "confidence"}
TS = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")
CONT_OF = {"Africa": "AF", "Antarctica": "AN", "Asia": "AS", "Europe": "EU", "North America": "NA", "Oceania": "OC", "South America": "SA"}
LOT_PREFIX = {"bullion": "B", "set": "S", "housing": "H", "stamp": "P"}

class Reject(Exception): pass

# ------------------------------------------------------------------------------------------------ skeletons
def skeleton_specimen():
    return {"acquisition": {"acquired_on": None, "family": None, "logged_at": None, "price_paid_usd": None, "source": None}, "authenticity": None,
            "condition": {"cert": None, "cleaned": None, "damage": [], "grade": None, "grader": None, "luster": None, "strike": None, "text": None, "toning": None},
            "disposal_plan": None, "featured": None, "housing": {"kind": None, "location": None, "text": None}, "id": None, "insurance": None, "invoice_ref": None,
            "issue": None, "lifecycle": {"removed_on": None, "removed_reason": None, "status": "Logged"}, "measured": {"diameter_mm": None, "magnetic": None, "thickness_mm": None, "weight_g": None},
            "notes": "", "photos": [], "provenance_chain": None, "related_specimens": None, "seller_type": None, "sentimental": None, "ser": None, "serial_number": None,
            "sort_weight": None, "storage_env": None, "story": None, "tags": [], "tax_lot": None, "type": None,
            "value": {"confidence": "low", "est_usd": None, "face": {"amount": None, "currency": None}}, "want_priority": None, "year_raw": None}

def skeleton_issue():
    return {"mint_marks": [], "mint_text": None, "mintage": None, "mintage_text": None, "qualifier": None, "year": None}

def skeleton_type():
    return {"catalogs": [], "class": "coin", "composition": {"fineness": None, "metal_class": "other", "text": ""}, "country": None,
            "denomination": {"currency": None, "display": None, "named": None, "unit": "", "value": None},
            "design": {"designers": [], "legend": None, "obverse": None, "reverse": None, "text": ""}, "die_variety": None, "error_type": None, "id": None, "image_ref": None,
            "issuer": None, "issues": [], "legal_tender": {"status": "unknown", "text": "", "until": None},
            "nominal": {"alignment": None, "diameter_approx": False, "diameter_max_mm": None, "diameter_min_mm": None, "diameter_mm": None, "edge": None, "shape": None, "thickness_mm": None,
                        "weight_approx": False, "weight_g": None, "weight_max_g": None, "weight_min_g": None},
            "population": None, "precious": {"agw_oz": None, "asw_oz": None}, "price_guide": None, "rarity_scale": None, "related_types": None, "series": None, "tags": []}

def skeleton_lot():
    return {"id": None, "kind": None, "country": None, "year_raw": None, "denom_text": None, "composition_text": None, "qty": 1, "asw_oz": None, "agw_oz": None,
            "est_usd": None, "melt_usd": None, "confidence": "low", "storage_text": None, "notes": "", "logged_at": None}

def skeleton_issuer():
    return {"id": None, "name": None, "iso": None, "continent": None, "from": None, "to": None, "successor": None, "note": None}

def merge(base, over):
    """Deep-merge `over` into a copy of `base`; `over` wins; dicts merge, everything else replaces."""
    out = copy.deepcopy(base)
    for k, v in over.items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else copy.deepcopy(v)
    return out

# ------------------------------------------------------------------------------------------------ helpers
def j(o): return json.dumps(o, sort_keys=True, ensure_ascii=False, separators=(",", ":"))

def event_key(e): return (e["ts"], e["by"], e["entity"], e["id"], e["field"], j(e.get("new")))

def create_key(e):
    return (e["ts"], e["by"], e["entity"], j(e.get("new")))      # id excluded: a NEW-n placeholder gets its real id at apply time

PH = re.compile(r"^NEW(-[\w]+)?$")

def parse_path(field):
    return [int(p) if p.isdigit() else p for p in field.split(".")]

def get_at(rec, path):
    cur = rec
    for p in path:
        if isinstance(cur, list) and isinstance(p, int) and p < len(cur): cur = cur[p]
        elif isinstance(cur, dict) and p in cur: cur = cur[p]
        else: raise KeyError(p)
    return cur

def set_at(rec, path, value):
    parent = get_at(rec, path[:-1]) if len(path) > 1 else rec
    last = path[-1]
    if isinstance(parent, list):
        if not (isinstance(last, int) and last < len(parent)): raise KeyError(last)
        parent[last] = value
    elif isinstance(parent, dict): parent[last] = value       # a NEW leaf key is allowed here; the schema check rejects unknown names
    else: raise KeyError(last)

def overlap(a, b):
    return a == b or a.startswith(b + ".") or b.startswith(a + ".")

def next_number(ids, prefix):
    nums = [int(i[1:]) for i in ids if i[:1] == prefix and i[1:].isdigit()]
    n = (max(nums) if nums else 0) + 1
    while f"{prefix}{n:03d}" in RETIRED: n += 1
    return f"{prefix}{n:03d}"

# ------------------------------------------------------------------------------------------------ one event
class Applier:
    def __init__(self, col):
        self.c = col
        self.done = {event_key(e) for e in col.changes}
        self.done_create = {create_key(e): e["id"] for e in col.changes if e["field"] == "(new record)"}
        self.ph = {}                                         # NEW-1 -> C272 (placeholder ids allocated in this file)
        self.verified = {}                                   # (entity,id,field) -> latest verified event
        for e in col.changes:
            if e.get("verified"): self.verified[(e["entity"], e["id"], e["field"])] = e
        self.log = []                                        # messages for the report
        self.new_events = []

    def record(self, entity, rid):
        c = self.c
        if entity == "type": return c.types.get(rid)
        if entity == "specimen": return c.specs.get(rid)
        if entity == "lot": return c.lot(rid)
        if entity == "album": return c.album(rid)
        if entity == "issuer": return c.issuer(rid)
        return None

    # -- schema of the incoming event itself
    def check_event(self, e):
        errs = []
        for k in ("ts", "by", "entity", "id", "field", "new"):
            if k not in e: errs.append(f"missing '{k}'")
        if errs: return errs
        extra = sorted(set(e) - ALLOWED)
        if extra: errs.append(f"unknown key(s) {extra} (allowed: {sorted(ALLOWED)})")
        if not (isinstance(e["ts"], str) and TS.match(e["ts"])): errs.append(f"ts '{e['ts']}' must look like 2026-10-02T18:30:00Z")
        if e["entity"] not in ENTITIES: errs.append(f"entity '{e['entity']}' must be one of {ENTITIES}")
        if e.get("op", "set") not in ("set", "create"): errs.append(f"op '{e.get('op')}' must be 'set' or 'create'")
        if not isinstance(e["by"], str) or not re.match(r"^(owner|model:[\w.\-]+|script:[\w.\-]+|person:[\w.\- ]+)$", e["by"]): errs.append(f"by '{e['by']}' must be owner, model:<id>, script:<name> or person:<name>")
        if e.get("verified") and not (e["by"] == "owner" or e["by"].startswith("person:")): errs.append("only the owner (by: owner / person:<name>) can set verified: true; an AI never verifies its own work")
        if e["by"].startswith("model:") and not (e.get("source") or "").strip(): errs.append("a model's fact needs a real 'source' (photo file, catalog, URL, reference)")
        if "phase" in e and e["phase"] not in (1, 1.5, 2): errs.append("phase must be 1, 1.5 or 2")
        if "confidence" in e and e["confidence"] not in ("low", "med", "high"): errs.append("confidence must be low, med or high")
        return errs

    def log_event(self, e, old, new=None):
        src = e.get("source")
        notes = [f"phase {e['phase']}" for _ in [0] if "phase" in e] + ([f"confidence {e['confidence']}"] if "confidence" in e else [])
        if notes: src = ((src + " ") if src else "") + "[" + "; ".join(notes) + "]"
        ev = {"ts": e["ts"], "by": e["by"], "entity": e["entity"], "id": e["id"], "field": e["field"], "old": old, "new": e["new"] if new is None else new, "source": src, "verified": bool(e.get("verified", False))}
        self.c.changes.append(ev); self.new_events.append(ev)
        if ev["verified"]: self.verified[(ev["entity"], ev["id"], ev["field"])] = ev

    # -- apply
    def apply(self, e):
        e = copy.deepcopy(e); op = e.get("op", "set")
        if op == "create" and e["field"] == "(new record)" and create_key(e) in self.done_create:
            real = self.done_create[create_key(e)]
            if PH.match(str(e["id"])): self.ph[e["id"]] = real
            self.log.append(f"already applied: create {e['entity']} {real}"); return "skipped"
        if e["id"] in self.ph: e["id"] = self.ph[e["id"]]
        if isinstance(e.get("new"), dict) and e["new"].get("specimen") in self.ph: e["new"]["specimen"] = self.ph[e["new"]["specimen"]]
        if event_key(e) in self.done:
            self.log.append(f"already applied: {e['entity']} {e['id']} {e['field']}"); return "skipped"
        (self.create if op == "create" else self.set)(e)
        self.done.add(event_key(e))
        return "applied"

    def set(self, e):
        ent, rid, field = e["entity"], e["id"], e["field"]
        if ent == "photo": raise Reject("photo events must use op: create")
        rec = self.record(ent, rid)
        if rec is None: raise Reject(f"{ent} {rid} does not exist (use op: create to add it)")
        if field in ("id",) or field.startswith("id."): raise Reject("an id is permanent and cannot be changed")
        if ent == "specimen" and field == "ser": raise Reject("ser is changed only by the one-time reassignment (tools/schema/reassign_ser.py), never by a contribution")
        if field == "story" and e["by"] != "owner": raise Reject("story is the owner's own words; only by: owner may set it")
        path = parse_path(field)
        try: old = copy.deepcopy(get_at(rec, path))
        except KeyError:
            try: parent = get_at(rec, path[:-1]) if len(path) > 1 else rec
            except KeyError: parent = None
            if not isinstance(parent, dict): raise Reject(f"{ent} {rid} has no field '{field}' (check the spelling; fields are dotted paths like condition.grade)")
            old = None          # a new optional leaf (e.g. quantity); the schema check rejects a misspelt name
        if "old" in e and e["old"] != old: raise Reject(f"stale edit: {ent} {rid} {field} is now {j(old)[:80]}, the contribution expected {j(e['old'])[:80]} (re-read the record and resubmit)")
        if old == e["new"]:
            self.log.append(f"no change (value already set): {ent} {rid} {field}"); return
        self.check_verified(e, old)
        copies = self.issue_copies(rec, path) if ent == "type" else []
        set_at(rec, path, copy.deepcopy(e["new"]))
        self.log_event(e, old)
        for sp in copies:                                   # specimens carry a copy of their issue; keep it in step with the type (the type event is the audit record)
            try: set_at(sp["issue"], path[2:], copy.deepcopy(e["new"]))
            except KeyError: pass
        self.after_set(e, rec, copies)

    def check_verified(self, e, old):
        hit = [ev for (en, i, f), ev in self.verified.items() if en == e["entity"] and i == e["id"] and overlap(f, e["field"])]
        if not hit:
            if e.get("supersedes"): raise Reject(f"'supersedes' {e['supersedes']} names no verified event for {e['entity']} {e['id']} {e['field']}")
            return
        newest = max(hit, key=lambda x: x["ts"])
        if e.get("supersedes") != newest["ts"]:
            raise Reject(f"{e['entity']} {e['id']} {e['field']} was VERIFIED by {newest['by']} on {newest['ts']}; to overwrite it add \"supersedes\": \"{newest['ts']}\" and a 'source' explaining why")
        if not (e.get("source") or "").strip(): raise Reject("overwriting a verified fact needs a 'source'")
        self.log.append(f"SUPERSEDED verified fact: {e['entity']} {e['id']} {e['field']} (was verified by {newest['by']} {newest['ts']})")

    def issue_copies(self, t, path):
        """Specimens whose issue copy belongs to the type issue that `path` (issues.N.<leaf>) edits."""
        if len(path) < 3 or path[0] != "issues" or not isinstance(path[1], int) or path[1] >= len(t["issues"]): return []
        i = t["issues"][path[1]]
        return [s for s in self.c.specs.values() if s["type"] == t["id"] and s["issue"]["year"] == i["year"] and s["issue"]["mint_marks"] == i["mint_marks"] and s["issue"].get("qualifier") == i.get("qualifier")]

    def after_set(self, e, rec, copies=()):
        c = self.c
        if e["entity"] == "specimen" and overlap(e["field"], "value.est_usd") and e["field"] in ("value.est_usd", "value"):
            est = rec["value"]["est_usd"]
            if est is not None: self.upsert_valuation(rec["id"], e["ts"][:10], est, e)
        if e["entity"] == "specimen" and e["field"].startswith("issue"): self.ensure_issue(rec, e)
        m = re.match(r"^issues\.(\d+)\.mintage$", e["field"]) if e["entity"] == "type" else None
        if m and e["new"] is not None:
            iss = rec["issues"][int(m.group(1))]
            if iss.get("mintage_text") and f"{e['new']:,}" not in iss["mintage_text"]:       # the old free text would contradict the new number
                old_t = iss["mintage_text"]; iss["mintage_text"] = None
                for sp in copies: sp["issue"]["mintage_text"] = None
                ev = {"ts": e["ts"], "by": e["by"], "entity": "type", "id": rec["id"], "field": f"issues.{m.group(1)}.mintage_text", "old": old_t, "new": None,
                      "source": f"cleared: it disagreed with the new mintage {e['new']:,}", "verified": False}
                self.c.changes.append(ev); self.new_events.append(ev)
        if e["entity"] == "lot" and e["field"] == "est_usd" and rec["est_usd"] is not None: self.upsert_valuation(rec["id"], e["ts"][:10], rec["est_usd"], e)

    def upsert_valuation(self, rid, at, est, e):
        method = "owner" if e["by"] == "owner" else ("ai" if e["by"].startswith("model:") else "comps")
        line = {"id": rid, "at": at, "est_usd": est, "method": method, "spot_ag": None, "spot_au": None, "source": e.get("source")}
        vs = self.c.valuations
        for i, v in enumerate(vs):
            if v["id"] == rid and v["at"] == at: vs[i] = line; return
        vs.append(line)

    def ensure_issue(self, spec, e):
        t = self.c.types.get(spec["type"])
        if t is None: return
        marks = spec["issue"]["mint_marks"]; year = spec["issue"]["year"]
        if any(i["year"] == year and i["mint_marks"] == marks for i in t["issues"]): return
        iss = merge(skeleton_issue(), {k: v for k, v in spec["issue"].items()})
        old = copy.deepcopy(t["issues"]); t["issues"].append(iss)
        t["issues"].sort(key=lambda i: (i["year"] or 0, i["mint_text"] or ""))
        self.c.changes.append({"ts": e["ts"], "by": e["by"], "entity": "type", "id": t["id"], "field": "issues", "old": old, "new": copy.deepcopy(t["issues"]),
                               "source": f"issue {year}{''.join(marks) and ' ' + '/'.join(marks)} added because specimen {spec['id']} needs it" + (f"; {e['source']}" if e.get("source") else ""), "verified": False})
        self.new_events.append(self.c.changes[-1])

    # -- create
    def create(self, e):
        ent, rid, c = e["entity"], e["id"], self.c
        orig = copy.deepcopy(e)
        if e["field"] != "(new record)": raise Reject("op create needs \"field\": \"(new record)\"")
        if not isinstance(e["new"], dict): raise Reject("op create needs the record (an object) in `new`")
        if ent == "album": raise Reject("albums are created only from the owner's Phase 1.5 scans by the album tools, not by a contribution")
        if self.record(ent, rid) is not None or (ent == "photo" and any(p["id"] == rid for p in c.photos)): raise Reject(f"{ent} {rid} already exists; ids are never reused (use op set to change it)")
        new = copy.deepcopy(e["new"])
        if "id" in new and new["id"] != rid: raise Reject(f"record id {new['id']} differs from event id {rid}")
        rid = getattr(self, "create_" + ent)(e, rid, new) or rid
        e["id"] = rid
        self.done_create[create_key(orig)] = rid
        self.log_event(e, None)

    def expect_counter(self, rid, prefix, ids):
        want = next_number(ids, prefix)
        if rid in RETIRED: raise Reject(f"{rid} is a retired id and must never appear")
        if rid != want: raise Reject(f"new id {rid} does not follow the counter: the next free '{prefix}' id is {want} (highest existing + 1; retired ids are skipped)")

    def create_specimen(self, e, rid, new):
        c = self.c
        t = c.types.get(new.get("type"))
        if t is None: raise Reject(f"type '{new.get('type')}' does not exist: create the type first (an earlier line of the same file) or pick an existing type id")
        prefix = "C" if t["class"] == "coin" else "T"
        if PH.match(rid):
            ph, rid = rid, next_number(c.specs.keys(), prefix); self.ph[ph] = rid
        if not re.match(r"^[CT]\d{3,}$", rid): raise Reject(f"specimen id {rid} must look like C### (coin) or T### (token/prop/medal)")
        if rid[0] != prefix: raise Reject(f"type {t['id']} is class '{t['class']}', so its specimens use the '{prefix}' counter, not '{rid[0]}'")
        self.expect_counter(rid, prefix, c.specs.keys())
        rec = merge(skeleton_specimen(), new); rec["id"] = rid
        if rec["issue"] is None: rec["issue"] = {}
        rec["issue"] = merge(skeleton_issue(), rec["issue"])
        if rec["year_raw"] is None:
            rec["year_raw"] = "ND" if rec["issue"]["qualifier"] == "ND" else (str(rec["issue"]["year"]) if rec["issue"]["year"] is not None else None)
        if rec["year_raw"] is None: raise Reject("a specimen needs year_raw (as read from the coin, e.g. '1971', 'ND') or issue.year")
        if rec["issue"]["year"] is None and rec["issue"]["qualifier"] is None and rec["year_raw"].isdigit() and len(rec["year_raw"]) == 4: rec["issue"]["year"] = int(rec["year_raw"])
        if rec["acquisition"]["logged_at"] is None: rec["acquisition"]["logged_at"] = e["ts"][:10]
        if rec["ser"] is None:
            cont = CONT_OF.get(c.issuer(t.get("issuer") or t["country"])["continent"])
            same = [s["ser"] for s in c.specs.values() if s.get("ser") and s["ser"].startswith(f"{cont}-{t['country']}-")]
            n = max([int(x.rsplit('-', 1)[1]) for x in same] or [0]) + 1
            rec["ser"] = f"{cont}-{t['country']}-{n:03d}"; self.log.append(f"provisional ser {rec['ser']} for {rid} (display serial; reassigned once after Phase 1)")
        iso = t["country"]
        c.specs_by_iso.setdefault(iso, {})[rid] = rec
        self.ensure_issue(rec, e)
        if rec["value"]["est_usd"] is not None: self.upsert_valuation(rid, e["ts"][:10], rec["value"]["est_usd"], e)
        return rid

    def create_type(self, e, rid, new):
        c = self.c
        pre = rid.split(".")[0]
        if not re.match(r"^[A-Z]{2}(-[A-Z0-9]+)?\.[A-Za-z]+\.[\w.\-]+$", rid): raise Reject(f"type id '{rid}' must look like CH.KM.24a.1 or (no catalog number) CH.X.5-rappen")
        rec = merge(skeleton_type(), new); rec["id"] = rid
        iss = c.issuer(pre)
        if iss is None: raise Reject(f"type id prefix '{pre}' is not an issuer id (see ref/issuers.json; create the issuer first)")
        rec["country"] = iss["iso"]
        if pre != iss["iso"]: rec["issuer"] = pre
        rec["issues"] = [merge(skeleton_issue(), i) for i in rec["issues"]]
        c.types_by_iso.setdefault(rec["country"], {})[rid] = rec
        return rid

    def create_lot(self, e, rid, new):
        c = self.c
        kind = new.get("kind")
        if kind not in LOT_PREFIX: raise Reject(f"lot kind must be one of {sorted(LOT_PREFIX)}")
        if PH.match(rid):
            ph, rid = rid, next_number([l["id"] for l in c.lots], LOT_PREFIX[kind]); self.ph[ph] = rid
        self.expect_counter(rid, LOT_PREFIX[kind], [l["id"] for l in c.lots])
        rec = merge(skeleton_lot(), new); rec["id"] = rid
        if rec["logged_at"] is None: rec["logged_at"] = e["ts"][:10]
        c.lots.append(rec)
        if rec["est_usd"] is not None: self.upsert_valuation(rid, e["ts"][:10], rec["est_usd"], e)
        return rid

    def create_issuer(self, e, rid, new):
        rec = merge(skeleton_issuer(), new); rec["id"] = rid
        if rec["name"] is None or rec["iso"] is None or rec["continent"] is None: raise Reject("an issuer needs name, iso and continent")
        self.c.issuers.append(rec)
        return rid

    def create_photo(self, e, rid, new):
        c = self.c
        sp = c.specs.get(new.get("specimen"))
        if sp is None: raise Reject(f"photo {rid}: specimen '{new.get('specimen')}' does not exist")
        rec = merge({"sha256": None, "width": None, "height": None, "captured_at": None, "review": {"status": "pending", "reason": None}, "superseded_by": None}, new); rec["id"] = rid
        c.photos.append(rec)
        sp["photos"].append(rid)
        return rid

# ------------------------------------------------------------------------------------------------ file level
def read_events(path):
    errs, events = [], []
    with open(path, encoding="utf-8") as f:
        for n, ln in enumerate(f, 1):
            if not ln.strip() or ln.lstrip().startswith("//"): continue
            try: e = json.loads(ln)
            except ValueError as x: errs.append(f"line {n}: not valid JSON ({x})"); continue
            if not isinstance(e, dict): errs.append(f"line {n}: each line must be a JSON object"); continue
            events.append((n, e))
    return events, errs

def validate_dir(d):
    import validate as V
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = V.main(d, update_manifest=True)
    return rc, buf.getvalue()

def tree_sync(src, dst):
    changed = []
    for root, dirs, files in os.walk(src):
        dirs[:] = [x for x in dirs if x != "_incoming"]
        for f in files:
            a = os.path.join(root, f); b = os.path.join(dst, os.path.relpath(a, src))
            if not os.path.exists(b) or open(a, "rb").read() != open(b, "rb").read():
                os.makedirs(os.path.dirname(b), exist_ok=True); shutil.copyfile(a, b); changed.append(os.path.relpath(a, src))
    return changed

def apply_file(path, coll, dry_run=False):
    """-> (status, report lines, list of new events).  status: applied | already-applied | rejected"""
    name = os.path.basename(path)
    events, problems = read_events(path)
    if not events and not problems: problems.append("the file has no events")
    work = tempfile.mkdtemp(prefix="apply-"); wdir = os.path.join(work, "collection")
    shutil.copytree(coll, wdir, ignore=shutil.ignore_patterns("_incoming"))
    col = C.Collection(wdir); ap = Applier(col); results = []
    for n, e in events:
        errs = ap.check_event(e)
        if errs: problems += [f"line {n}: {m}" for m in errs]; continue
        try: results.append(ap.apply(e))
        except Reject as r: problems.append(f"line {n}: {r}")
        except KeyError as r: problems.append(f"line {n}: unknown field path {r} in {e.get('entity')} {e.get('id')} {e.get('field')}")
    if not problems and results and all(r == "skipped" for r in results):
        shutil.rmtree(work, ignore_errors=True)
        return "already-applied", [f"{name}: every event is already in changes.jsonl; nothing to do"], []
    if not problems:
        col.save()
        try: rc, out = validate_dir(wdir)
        except ImportError: rc, out = 1, "the 'jsonschema' package is missing: pip install jsonschema"
        if rc != 0: problems += ["validation of the merged collection failed:"] + ["    " + ln for ln in out.strip().splitlines()[-25:]]
    if problems:
        shutil.rmtree(work, ignore_errors=True)
        return "rejected", [f"REJECTED {name}: {len(problems)} problem(s); nothing was changed"] + ["  " + p for p in problems] + (["  notes: " + m for m in ap.log] if ap.log else []), []
    changed = [] if dry_run else tree_sync(wdir, coll)
    shutil.rmtree(work, ignore_errors=True)
    rep = [f"APPLIED {name}: {sum(1 for r in results if r == 'applied')} event(s) merged" + (" (dry run, nothing written)" if dry_run else f", {len(changed)} file(s) updated")] + ["  " + m for m in ap.log]
    return "applied", rep, ap.new_events

def main(argv):
    coll = os.path.join(ROOT, "collection"); dry = "--dry-run" in argv; archive = "--archive" in argv
    files = []; it = iter(argv)
    for x in it:
        if x == "--collection": coll = next(it)
        elif not x.startswith("--"): files.append(x)
    if "--next-ids" in argv:
        col = C.Collection(coll)
        print(json.dumps({"coin": next_number(col.specs.keys(), "C"), "token": next_number(col.specs.keys(), "T"), **{k: next_number([l["id"] for l in col.lots], p) for k, p in LOT_PREFIX.items()}}))
        return 0
    if not files: print(__doc__); return 2
    worst = 0
    for f in files:
        status, rep, _ = apply_file(f, coll, dry)
        print("\n".join(rep))
        if status == "rejected": worst = 1
        if archive and not dry:
            dest = os.path.join(os.path.dirname(os.path.abspath(f)), "applied" if status != "rejected" else "rejected"); os.makedirs(dest, exist_ok=True)
            if status == "rejected": open(os.path.join(dest, os.path.basename(f) + ".report.txt"), "w", encoding="utf-8").write("\n".join(rep) + "\n")
            shutil.move(f, os.path.join(dest, os.path.basename(f)))
    return worst

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
