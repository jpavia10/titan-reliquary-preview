"""Curation queue for the v1 -> v2 bootstrap (2026-09-30): "update all outdated metadata".

Every value changed here is written to changes.jsonl as a ChangeEvent (by model:sonnet-5.5, verified false). When the data
does not settle a question the raw value is KEPT and the question is listed in CURATION_OPEN.md. Nothing here is guessed silently.

Tables are keyed by the type ids the migration produces (after catalog-priority keying: KM > Y > Schön > JNDA).
"""

BY = "model:sonnet-5.5"
TS = "2026-09-30T00:00:00Z"   # bootstrap date (day precision keeps the output reproducible)

def event(ctx, entity, id, field, old, new, source, verified=False):
    ctx["events"].append({"ts": TS, "by": BY, "entity": entity, "id": id, "field": field, "old": old, "new": new, "source": source, "verified": verified})

def opened(ctx, kind, ids, what, why):
    ctx["open"].append({"kind": kind, "ids": ids, "what": what, "why": why})

# ---------------------------------------------------------------------------------------------------------------------
# 1. Type conflicts: two or more specimens of the same type carry different text for the same type-level field.
#    (type id, field path) -> canonical value.  "BASE" keeps the first specimen's value.
#    Canonical wording = the most specific sibling text, with per-coin detail (date, 'not shown') removed.
# ---------------------------------------------------------------------------------------------------------------------
CONFLICTS = {
    ("CH.KM.21a", "design.text"): dict(
        new="standing Helvetia (obv) · 2 Fr. in oak + alpine wreath (rev) · engravers Antoine Bovy / Albert Walch",
        source="sibling records C003/C067/C077/C115/C116 (same type KM#21a); wording differences only ('value in wreath' vs '2 Fr. in oak + alpine wreath')"),
    ("DE.X.spielmarke-20-gr", "design.text"): dict(
        new="Fraktur GR + stars (13 counted on T001; 'ring of stars' on T002) // large 20 in closed laurel wreath",
        source="T001 vs T002 (same Spielmarke); both facts kept in one sentence",
        open="T001 says '13 stars', T002 says 'ring of stars'. Count the stars on both tokens; if the counts differ these are two different varieties and need two types."),
    ("NL.KM.204", "design.text"): dict(
        new="obverse Beatrix portrait · reverse squared grid field with large 25 · ct · date",
        source="sibling records C010/C104 (same type KM#204); wording differences only"),
    ("IT.KM.95.1", "design.text"): dict(
        new="obverse Italia / Republic head oak-crowned (Romagnoli) · reverse Vulcan at anvil with hammer · L.50 · date · R (Giampaoli)",
        source="C011 is the more complete description of the same type as C199 (KM#95.1)"),
    ("SU.Y.126a", "design.text"): dict(
        new="obverse USSR arms СССР (15-ribbon type 1961–91) · reverse big 1 КОПЕЙКА · wheat ears · date",
        source="sibling records C042/C044 (same type Y#126a); wording differences only"),
    ("CH.KM.27", "design.text"): dict(
        new="Libertas right (obv) · 10 in wreath (rev) · engravers Karl Schwenzer / Carl Friedrich Voigt",
        source="C082 and C242 are the same type (KM#27, stated in C082); C082 has the full engraver names"),
    ("CH.KM.27", "composition.text"): dict(
        new="CuNi 75/25",
        source="C082 gives the alloy 'CuNi 75/25'; C242 'CuNi' (same type KM#27, same 3.00 g / 19.15 mm)"),
    ("CH.KM.24a", "design.text"): dict(
        new="standing Helvetia (obv) · value in oak + alpine wreath (rev) · engravers Antoine Bovy / Albert Walch / Fr. Fisch",
        source="sibling records C093/C094 (same type KM#24a); wording differences only"),
    ("ES.KM.1040", "design.text"): dict(
        new="national side Cathedral of Santiago de Compostela (Garcilaso Rollán) + 12 EU stars · common side Europe map (Luc Luycx, design from 2007)",
        source="C139 (2014) and C140 (2008): both post-2007 coins carry the map-of-Europe common side; C140's 'globe side' is the pre-2007 design. Reference: euro common-side redesign 2007.",
        open="Confirm the KM# for Spain 1 euro cent: C140 (2008) and C139 (2014) share KM#1040 in the ledger, but the Spanish design changed again in 2010 and Krause may give 2010+ a different number. Also check the common side on C140."),
    ("NO.KM.460", "design.text"): dict(
        new="obverse crowned Harald V monogram + crossed-hammers mintmark · reverse Nidhogg dragon (Urnes stave-church portal) · 50 ØRE · NORGE (1998) / NOREG (2000) · date · engraver GJL (Grażyna Jolanta Lindau)",
        source="C144 (1998) and C268 (2000) are both KM#460 (C268 names the type); C268 is the fuller description; the legend spelling differs by year",
        open="Schön# differs between the two records (C144 Schön#76, C268 Schön#107). Check which Schön number belongs to KM#460. Also confirm the NORGE/NOREG alternation by year."),
    ("NO.KM.460", "catalogs"): dict(
        new=[{"number": "460", "system": "KM"}, {"number": "76", "system": "Schön"}, {"number": "107", "system": "Schön"}],
        source="C144 lists Schön#76, C268 lists Schön#107 for the same KM#460; both kept until checked (see the design entry)"),
    ("NO.KM.460", "composition.text"): dict(
        new="bronze (97% Cu · 2.5% Zn · 0.5% Sn)",
        source="C268 gives the full alloy; C144's 'copper alloy (CuZn)' is a loose description of the same 1996–2011 bronze 50 øre (standard reference: Norges Bank / Krause)"),
    ("NO.KM.460", "legal_tender"): dict(
        new={"status": "demonetized", "until": "2012-05-01", "text": "demonetized 1 May 2012 (no longer legal tender)"},
        source="C144 'withdrawn 2012' and C268 'demonetized 1 May 2012'; Norges Bank withdrew the 50 øre coin on 1 May 2012 (standard reference)"),
    ("GB.KM.989", "design.text"): dict(
        new="obverse Ian Rank-Broadley Elizabeth II · reverse crowned lion passant · TEN PENCE (Ironside)",
        source="C152 (2001) is unambiguous KM#989; C153 (2008) describes a transition year",
        open="C153 (2008 10 pence): the ledger says 'lion or Royal Shield segment (transition year)' and lists both KM#989 and KM#1110. Look at the reverse. If it is the Shield (Matthew Dent) design, move C153 to type GB.KM.1110."),
    ("GB.KM.989", "catalogs"): dict(new="BASE", source="C153 also lists KM#1110 (mid-2008 Shield design); the type keeps KM#989 only, the alternative is an open question (see design)"),
    ("GB.KM.1109d", "design.text"): dict(
        new="obverse Ian Rank-Broadley Elizabeth II · reverse Royal Shield segment · FIVE PENCE (Matthew Dent)",
        source="C180 (2012) is unambiguous KM#1109d; C183 (2015) describes a portrait transition year",
        open="C183 (2015 5 pence): ledger lists KM#1109d (Rank-Broadley portrait) and KM#1334 (Jody Clark portrait, 2015+). Check the obverse portrait. If Clark, move C183 to type GB.KM.1334."),
    ("GB.KM.1109d", "catalogs"): dict(new="BASE", source="C183 also lists KM#1334 (Clark portrait, 2015+); the type keeps KM#1109d only, see design"),
    ("KY.KM.88a", "design.text"): dict(
        new="obverse Maklouf Elizabeth II right · CAYMAN ISLANDS · ELIZABETH II · date · reverse shrimp / crayfish",
        source="sibling records C185/C214 (same type KM#88a, 'year twin'); C214 only lacks a reverse photo"),
    ("KY.KM.132", "design.text"): dict(
        new="obverse Rank-Broadley Elizabeth II · CAYMAN ISLANDS · ELIZABETH II · date · reverse shrimp",
        source="sibling records C186/C215 (same type KM#132); wording differences only (year in text)"),
    ("JP.Y.74", "design.text"): dict(
        new="young tree / 日本国 · 一円 // big 1 · Showa regnal-year date (昭和 40 = 1965, 51 = 1976)",
        source="sibling records C206/C222 (same type Y#74); only the year differs"),
    ("JP.Y.73a", "design.text"): dict(
        new="Phoenix Hall / Byodoin temple · 日本国 · 十円 // big 10 · bay laurel (evergreen, tokiwa) wreath · Showa regnal-year date (昭和 57 = 1982, 63 = 1988)",
        source="sibling records C220/C270 (same type Y#73a); only the year differs"),
    ("JP.Y.73a", "composition.text"): dict(
        new="bronze (Cu 95% · Zn 3–4% · Sn 1–2%)",
        source="C270 gives the alloy; C220 says 'bronze' (same type Y#73a, same 4.5 g / 23.5 mm)"),
    ("MX.KM.440", "design.text"): dict(
        new="reverse Pyramid of the Sun at Teotihuacan · Popocatépetl & Iztaccíhuatl · radiant Phrygian cap · big 20 · CENTAVOS · date · Mo · national arms obverse",
        source="sibling records C244/C257 (same type KM#440, stated in C257); wording differences only"),
    ("YU.KM.86", "design.text"): dict(
        new="obverse SFRY arms (torch and wheat) · reverse big 1 · bilingual ДИНАР / DINAR legend · date · beaded rim",
        source="sibling records C251/C262 (same type KM#86); only the order of the two scripts differs"),
    ("KR.KM.103", "design.text"): dict(
        new="value side curved date · large centered 10 · 한국은행 (Bank of Korea) · beaded rim · reverse Dabotap Pagoda (십 원) · designer unknown",
        source="sibling records C266/C267 (same type KM#103); wording differences only"),
}

# ---------------------------------------------------------------------------------------------------------------------
# 2. Denominations the parser could not read (12 specimens / 9 types).  specimen id -> new denomination.
# ---------------------------------------------------------------------------------------------------------------------
DENOMS = {
    "T001": dict(value=None, unit="Spielmarke", currency=None, named="“20” (GR)", display="Spielmarke “20” (GR)", source="ledger denom text; a play-money token, no numeric value (the 20 is a device, not a denomination)"),
    "T002": dict(value=None, unit="Spielmarke", currency=None, named="“20” (GR)", display="Spielmarke “20” (GR)", source="ledger denom text; same token family as T001"),
    "C020": dict(value=0.5, unit="new penny", currency="GBP", named=None, display=None, source="ledger denom '½ new penny · GBP (decimal)'"),
    "C031": dict(value=3, unit="pence", currency="AUD", named="threepence", display="Threepence (3d)", source="ledger denom 'threepence (3d) · AUD pre-decimal'; 3d = 3 pence"),
    "C033": dict(value=0.5, unit="franc", currency="FRF", named=None, display=None, source="ledger denom '½ franc · FRF (nouveau franc)'"),
    "C060": dict(value=0.5, unit="franc", currency="FRF", named=None, display=None, source="ledger denom '½ franc · FRF (nouveau franc)'"),
    "C221": dict(value=0.5, unit="franc", currency="FRF", named=None, display=None, source="ledger denom '½ franc · FRF (nouveau franc)'"),
    "C164": dict(value=0.5, unit="penny", currency="GBP", named=None, display=None, source="ledger denom '½ penny · GBP (pre-decimal)'"),
    "T003": dict(value=None, unit="ride token", currency=None, named="Sandy the Pony · Meijer", display="Ride token (Sandy the Pony · Meijer)", source="ledger denom text (promotional token, no face value)"),
    "T004": dict(value=None, unit="novelty slug", currency=None, named="miniature “penny” in printed cardboard flap", display="Miniature “penny” in printed cardboard flap", source="ledger denom 'none · miniature “penny” in printed cardboard flap' (political novelty, no face value)"),
    "T005": dict(value=1, unit="$", currency=None, named="prop", display="Prop $1 (Series 2013 style)", source="ledger denom 'prop $1 · Series 2013 style · serial LL 62033872 F'; motion-picture prop, not currency"),
    "T006": dict(value=50, unit="$", currency=None, named="prop", display="Prop $50 (Series 2009 style)", source="ledger denom 'prop $50 · Series 2009 style · serial JH 05118234 A'; motion-picture prop, not currency"),
}
SERIALS = {"T005": "LL 62033872 F", "T006": "JH 05118234 A"}   # moved out of the denomination text into specimen.serial_number

# ---------------------------------------------------------------------------------------------------------------------
# 3. Tender statuses the parser could not read (2).
# ---------------------------------------------------------------------------------------------------------------------
TENDER = {
    "C165": dict(status="superseded", until=None, source="ledger text 'still SEK system (type superseded; face tiny)': the record itself calls the type superseded",
                 open="Sweden: is the 1973 Gustaf VI Adolf 1 krona still accepted at the Riksbank / in shops, or demonetized? Ledger wording is ambiguous ('still SEK system')."),
}
# C144 (Norway) is resolved by the NO.KM.460 legal_tender conflict above.

# ---------------------------------------------------------------------------------------------------------------------
# 4. Issuer variants (3): the ledger writes the issuer into the country name.
# ---------------------------------------------------------------------------------------------------------------------
ISSUERS = {
    "Germany (Empire)": dict(id="DE-EMP", iso="DE", name="German Empire", from_=1871, to=1918, note="Ledger country name 'Germany (Empire)'. Kaiserreich issues (Mark system) 1871-1918."),
    "Mexico (Chihuahua)": dict(id="MX-CHI", iso="MX", name="Mexico (Chihuahua, revolutionary)", from_=1913, to=1915, note="Ledger country name 'Mexico (Chihuahua)'; ledger text: revolutionary issue 1913-1915."),
    "Vietnam (State of Vietnam)": dict(id="VN-SOV", iso="VN", name="State of Vietnam", from_=1949, to=1955, note="Ledger country name 'Vietnam (State of Vietnam)'; 1949-1955 (standard reference)."),
}

# ---------------------------------------------------------------------------------------------------------------------
# 5. Things the data cannot settle.  (Listed in CURATION_OPEN.md; the raw value stays.)
# ---------------------------------------------------------------------------------------------------------------------
OPEN_EXTRA = [
    dict(kind="catalog", ids=["C001", "C093", "C094"], what="Swiss 1 franc: C001 is KM#24a.1, C093/C094 are KM#24a (types CH.KM.24a.1 and CH.KM.24a)",
         why="C093's own notes say it is the same type as C001. Confirm whether '.1' is only a sub-number of the same type; if yes merge the two types."),
    dict(kind="catalog", ids=["C023"], what="German Empire 20 Pfennig 1918 iron: no catalog number in the ledger",
         why="Ledger: 'no standard imperial iron 20 Pf KM; wartime iron Notgeld / ID soft'. Look up in Jaeger (J.) / Kahnt, or confirm it is Notgeld rather than a Reichsmünze."),
    dict(kind="catalog", ids=["T001", "T002", "T003", "T004", "T005", "T006"], what="Six tokens / novelties / prop notes have no catalog number (catalogs is empty)",
         why="They are exonumia or props; no KM exists. Only needs an owner decision if you want a Numista or Lauer number recorded."),
    dict(kind="issuer", ids=["C?? (EC)"], what="East Caribbean States uses ISO 'EC', which is Ecuador's code",
         why="The ledger's ser uses EC for East Caribbean States (XCD). ISO 3166 has no alpha-2 for it. Decide whether to keep EC (current) or use a private code before the ser reassignment."),
]
