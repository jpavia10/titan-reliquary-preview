"""Read and write a v2 collection folder in the exact layout tools/schema/migrate_v1_to_v2.py produced
(one record per line, sorted keys, so git diffs show exactly which record changed). Stdlib only."""
import collections, glob, json, os

J = lambda o: json.dumps(o, separators=(",", ":"), ensure_ascii=False, sort_keys=True)

def read_json(p):
    with open(p, encoding="utf-8") as f: return json.load(f)

def read_jsonl(p):
    if not os.path.exists(p): return []
    with open(p, encoding="utf-8") as f: return [json.loads(ln) for ln in f if ln.strip()]

def _w(path, text):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f: f.write(text)

def dump_map(path, m):
    _w(path, "{\n" + ",\n".join(f"{json.dumps(k, ensure_ascii=False)}:{J(v)}" for k, v in sorted(m.items())) + "\n}\n")

def dump_list(path, rows):
    _w(path, "[\n" + ",\n".join(J(r) for r in rows) + "\n]\n")

def dump_jsonl(path, rows):
    _w(path, "".join(J(r) + "\n" for r in rows))

def dump_albums(path, vols):
    parts = []
    for v in vols:
        head = {k: x for k, x in v.items() if k != "slots"}
        parts.append(J(head)[:-1] + ',"slots":[\n' + ",\n".join("  " + J(s) for s in v["slots"]) + "\n]}")
    _w(path, "[\n" + ",\n".join(parts) + "\n]\n")

class Collection:
    """In-memory copy of collection/ with load() / save()."""
    def __init__(self, d):
        self.d = d
        self.types_by_iso = {os.path.basename(p)[:-5]: read_json(p) for p in sorted(glob.glob(f"{d}/types/*.json"))}
        self.specs_by_iso = {os.path.basename(p)[:-5]: read_json(p) for p in sorted(glob.glob(f"{d}/specimens/*.json"))}
        self.lots = read_json(f"{d}/lots.json"); self.albums = read_json(f"{d}/albums.json")
        self.issuers = read_json(f"{d}/ref/issuers.json"); self.photos = read_json(f"{d}/photos.json")
        self.valuations = read_jsonl(f"{d}/valuations.jsonl"); self.changes = read_jsonl(f"{d}/changes.jsonl")
        self.disagreements = read_jsonl(f"{d}/disagreements.jsonl")    # fix list #18: kept AI disagreements (one record per line)
        self.boot = read_json(f"{d}/boot.json")

    # -- lookups
    @property
    def types(self): return {k: t for m in self.types_by_iso.values() for k, t in m.items()}
    @property
    def specs(self): return {k: s for m in self.specs_by_iso.values() for k, s in m.items()}
    def spec_iso(self, sid): return next((i for i, m in self.specs_by_iso.items() if sid in m), None)
    def type_iso(self, tid): return next((i for i, m in self.types_by_iso.items() if tid in m), None)
    def lot(self, lid): return next((l for l in self.lots if l["id"] == lid), None)
    def album(self, aid): return next((a for a in self.albums if a["id"] == aid), None)
    def issuer(self, iid): return next((i for i in self.issuers if i["id"] == iid), None)

    def save(self):
        d = self.d
        for iso, m in self.types_by_iso.items(): dump_map(f"{d}/types/{iso}.json", m)
        for iso, m in self.specs_by_iso.items(): dump_map(f"{d}/specimens/{iso}.json", m)
        dump_list(f"{d}/lots.json", self.lots); dump_albums(f"{d}/albums.json", self.albums)
        dump_list(f"{d}/ref/issuers.json", sorted(self.issuers, key=lambda i: i["id"]))
        dump_list(f"{d}/photos.json", self.photos)
        import chain                                                   # fix list #76: refuse to rewrite chained history (raises chain.HistoryRewritten)
        old_changes = f"{d}/changes.jsonl"
        if os.path.exists(f"{d}/changes.chain") and os.path.exists(old_changes):
            new_text = "".join(J(r) + "\n" for r in self.changes).encode()
            stored = chain._lines(old_changes); new_lines = [ln for ln in new_text.split(b"\n") if ln.strip()]
            if new_lines[: len(stored)] != stored:
                raise chain.HistoryRewritten("changes.jsonl: an existing line would change; the change log is append-only (a correction is a new line)")
        dump_jsonl(f"{d}/valuations.jsonl", self.valuations); dump_jsonl(f"{d}/changes.jsonl", self.changes)
        chain.update(d)
        if self.disagreements or os.path.exists(f"{d}/disagreements.jsonl"): dump_jsonl(f"{d}/disagreements.jsonl", self.disagreements)
        self.rebuild_boot()
        write_boot(f"{d}/boot.json", self.boot)

    def rebuild_boot(self):
        self.boot = make_boot(self.specs, self.types)

def make_boot(specs, types):
    """boot.json payload from the records (same columns / coding as the migration)."""
    rows_src = list(specs.values())
    iso_list = sorted({types[s["type"]]["country"] for s in rows_src}); iso_ix = {k: i for i, k in enumerate(iso_list)}
    type_list = sorted(types); type_ix = {k: i for i, k in enumerate(type_list)}
    den_list = sorted({types[s["type"]]["denomination"]["unit"] for s in rows_src}); den_ix = {k: i for i, k in enumerate(den_list)}
    conf_ix = {"low": 0, "med": 1, "high": 2}; status_ix = {"Logged": 0, "Photographed": 1, "Verified": 2, "Removed": 3}; yq = ["", "circa", "ND", "unparsed"]
    rows = []
    for s in sorted(rows_src, key=lambda s: s["id"]):
        t = types[s["type"]]
        flags = (0 if s["photos"] else 1) + (2 if t["class"] != "coin" else 0) + (4 if (t["precious"]["asw_oz"] or t["precious"]["agw_oz"]) else 0)
        rows.append([s["id"], s["ser"], iso_ix[t["country"]], s["issue"]["year"], yq.index(s["issue"]["qualifier"] or ""), t["denomination"]["value"], den_ix[t["denomination"]["unit"]],
                     round((s["value"]["est_usd"] or 0) * 100), conf_ix[s["value"]["confidence"] or "low"], status_ix[s["lifecycle"]["status"]], flags, type_ix[s["type"]]])
    return {"v": 2, "cols": ["id", "ser", "iso", "year", "yq", "denom_v", "denom_u", "est_cents", "conf", "status", "flags", "type"], "yq": yq, "iso": iso_list, "denom_units": den_list, "types": type_list,
            "conf": ["low", "med", "high"], "status": ["Logged", "Photographed", "Verified", "Removed"], "flags_doc": "bit1 = no photo yet, bit2 = not a coin (token/prop/medal), bit4 = holds silver or gold", "rows": rows}

def write_boot(path, boot):
    _w(path, J({k: v for k, v in boot.items() if k != "rows"})[:-1] + ',"rows":[\n' + ",\n".join(J(r) for r in boot["rows"]) + "\n]}\n")
