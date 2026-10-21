# Serial reassignment plan (DRY RUN)

> **NOT APPLIED. Run after Phase 1 completes** (every coin has its initial metadata). Nothing in `collection/` was changed by this file; `ser` values in the records are still the ledger's.

Method: sort by continent, then country, then year (no-date last), then face value; ties are broken by a hash of the permanent `id` (salt `titan-reliquary/ser-reassign/v1`), not by scan order. New `ser` = continent code + ISO + a 3-digit sequence from 001 within each ISO. The permanent key `id` (`C###`/`T###`) never changes.

- specimens: 306; ser values that would change: 166; unchanged: 140; all new values unique: yes

**The owner decides first (fix list #5): numbers that mean something, or no pattern?** Column *new ser* groups each country's coins (EU-CH-001, EU-CH-002 ... in year order). Column *or no pattern* is a plain 4-digit number in a salted-hash order that says nothing about the coin (it would need the schema's `ser` pattern widened). Either way the number written on the flip's back is the one chosen.

Ready to apply?
- Phase 1 finish line: 216 of 306 pieces (70.6 %); the plan is applied only at 100 %, so the numbers below still move.
- Open owner question q-ec-code (East Caribbean filed as EC, which is Ecuador's code; XC?): the answer changes those coins' country code.

Regenerate: `python3 tools/schema/reassign_ser.py collection/` (deterministic). Applying the plan is a separate, owner-approved step: rewrite `ser` in `specimens/*.json` and `boot.json`, append one ChangeEvent per specimen (`field: ser`), refresh the manifest, then tell the photo workflow the new numbers.


## Africa / Eritrea (ER)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C212 | 1997 | 50 Cents | AF-ER-001 | AF-ER-001 (same) | 0232 |

## Africa / Nigeria (NG)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C201 | 1976 | 10 Kobo | AF-NG-001 | AF-NG-001 (same) | 0094 |

## Asia / Hong Kong (HK)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C146 | 1998 | $1 | AS-HK-001 | AS-HK-001 (same) | 0077 |

## Asia / India (IN)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C203 | 2001 | 1 Rupee | AS-IN-001 | AS-IN-001 (same) | 0053 |

## Asia / Japan (JP)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C222 | 1965 | 1 Yen | AS-JP-001 | AS-JP-001 (same) | 0208 |
| C206 | 1976 | 1 Yen | AS-JP-002 | AS-JP-002 (same) | 0002 |
| C220 | 1982 | 10 Yen | AS-JP-003 | AS-JP-003 (same) | 0286 |
| C270 | 1988 | 10 Yen | AS-JP-004 | AS-JP-004 (same) | 0226 |

## Asia / Philippines (PH)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C246 | 1971 | 10 Sentimos | AS-PH-001 | AS-PH-001 (same) | 0297 |
| C163 | 1984 | 50 Sentimo | AS-PH-002 | AS-PH-002 (same) | 0230 |
| C279 | 1997 | 1 Piso | AS-PH-003 | AS-PH-003 (same) | 0145 |

## Asia / Saudi Arabia (SA)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C231 | AH 1378 (1958) | 1 Qirsh | AS-SA-001 | AS-SA-001 (same) | 0262 |

## Asia / Singapore (SG)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C250 | 1967 | 20 Cents | AS-SG-001 | AS-SG-001 (same) | 0277 |
| C264 | 1973 | 10 Cents | AS-SG-002 | AS-SG-002 (same) | 0287 |

## Asia / South Korea (KR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C247 | 1966 | 1 Won | AS-KR-001 | AS-KR-001 (same) | 0186 |
| C210 | 2000 | 100 Won | AS-KR-002 | AS-KR-002 (same) | 0167 |
| C266 | 2012 | 10 Won | AS-KR-003 | AS-KR-003 (same) | 0173 |
| C267 | 2013 | 10 Won | AS-KR-004 | AS-KR-004 (same) | 0078 |

## Asia / Taiwan (ROC) (TW)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C200 | 2008 | 1 Yuan | AS-TW-001 | AS-TW-001 (same) | 0265 |

## Asia / Thailand (TH)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C162 | 2006 | 1 Baht | AS-TH-001 | AS-TH-001 (same) | 0304 |

## Asia / Vietnam (VN)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C258 | 1953 | 20 Su | AS-VN-001 | AS-VN-001 (same) | 0296 |
| C232 | 2003 | 1000 Đồng | AS-VN-002 | AS-VN-002 (same) | 0275 |

## Europe / Austria (AT)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C272 | 1925 | 2 Groschen | EU-AT-001 | EU-AT-001 (same) | 0174 |

## Europe / France (FR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C243 | 1946 | 5 Francs | EU-FR-001 | EU-FR-001 (same) | 0264 |
| C118 | 1960 | 1 Franc | EU-FR-004 | EU-FR-002 | 0149 |
| C059 | 1960 | 1 Franc | EU-FR-002 | EU-FR-003 | 0235 |
| C117 | 1960 | 1 Franc | EU-FR-003 | EU-FR-004 | 0293 |
| C012 | 1962 | 1 Franc | EU-FR-005 | EU-FR-005 (same) | 0195 |
| C007 | 1963 | 10 Centimes | EU-FR-006 | EU-FR-006 (same) | 0130 |
| C025 | 1965 | 1 Franc | EU-FR-007 | EU-FR-007 (same) | 0306 |
| C124 | 1967 | 10 Centimes | EU-FR-008 | EU-FR-008 (same) | 0069 |
| C033 | 1969 | ½ Franc | EU-FR-009 | EU-FR-009 (same) | 0110 |
| C060 | 1971 | ½ Franc | EU-FR-010 | EU-FR-010 (same) | 0058 |
| C193 | 1973 | 5 Centimes | EU-FR-011 | EU-FR-011 (same) | 0161 |
| C041 | 1974 | 20 Centimes | EU-FR-012 | EU-FR-012 (same) | 0225 |
| C119 | 1977 | 1 Franc | EU-FR-013 | EU-FR-013 (same) | 0267 |
| C194 | 1980 | 5 Centimes | EU-FR-014 | EU-FR-014 (same) | 0033 |
| C125 | 1984 | 10 Centimes | EU-FR-015 | EU-FR-015 (same) | 0044 |
| C005 | 1986 | 20 Centimes | EU-FR-017 | EU-FR-016 | 0096 |
| C221 | 1986 | ½ Franc | EU-FR-016 | EU-FR-017 | 0021 |
| C049 | 1989 | 10 Francs | EU-FR-018 | EU-FR-018 (same) | 0060 |
| C281 | 1994 | 5 Francs | EU-FR-034 | EU-FR-019 | 0183 |
| C063 | 1995 | 10 Centimes | EU-FR-019 | EU-FR-020 | 0282 |
| C062 | 1998 | 10 Centimes | EU-FR-020 | EU-FR-021 | 0175 |
| C095 | 1999 | 10 Euro Cent | EU-FR-022 | EU-FR-022 (same) | 0025 |
| C017 | 1999 | 1 Franc | EU-FR-021 | EU-FR-023 | 0027 |
| C129 | 2000 | 20 Euro Cent | EU-FR-024 | EU-FR-024 (same) | 0014 |
| C130 | 2000 | 20 Euro Cent | EU-FR-025 | EU-FR-025 (same) | 0101 |
| C072 | 2000 | 2 Euro | EU-FR-023 | EU-FR-026 | 0254 |
| C096 | 2002 | 10 Euro Cent | EU-FR-026 | EU-FR-027 | 0179 |
| C141 | 2009 | 1 Euro Cent | EU-FR-027 | EU-FR-028 | 0299 |
| C034 | 2009 | 2 Euro Cent | EU-FR-028 | EU-FR-029 | 0301 |
| C052 | 2009 | 5 Euro Cent | EU-FR-029 | EU-FR-030 | 0139 |
| C127 | 2010 | 2 Euro Cent | EU-FR-031 | EU-FR-031 (same) | 0038 |
| C054 | 2010 | 10 Euro Cent | EU-FR-030 | EU-FR-032 | 0147 |
| C097 | 2015 | 10 Euro Cent | EU-FR-032 | EU-FR-033 | 0026 |
| C128 | 2017 | 2 Euro Cent | EU-FR-033 | EU-FR-034 | 0155 |

## Europe / Germany (DE)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C023 | 1918 | 20 Pfennig | EU-DE-001 | EU-DE-001 (same) | 0205 |
| C265 | 1950 | 5 Pfennig | EU-DE-002 | EU-DE-002 (same) | 0248 |
| C224 | 1966 | 10 Pfennig | EU-DE-003 | EU-DE-003 (same) | 0079 |
| C021 | 1970 | 10 Pfennig | EU-DE-004 | EU-DE-004 (same) | 0073 |
| C237 | 1971 | 5 Pfennig | EU-DE-006 | EU-DE-005 | 0159 |
| C195 | 1971 | 5 Pfennig | EU-DE-005 | EU-DE-006 | 0169 |
| C035 | 1971 | 50 Pfennig | EU-DE-007 | EU-DE-007 (same) | 0016 |
| C029 | 1972 | 1 Pfennig | EU-DE-008 | EU-DE-008 (same) | 0011 |
| C238 | 1973 | 2 Deutsche Mark | EU-DE-009 | EU-DE-009 (same) | 0260 |
| C225 | 1977 | 10 Pfennig | EU-DE-010 | EU-DE-010 (same) | 0083 |
| C226 | 1980 | 10 Pfennig | EU-DE-011 | EU-DE-011 (same) | 0294 |
| C019 | 1981 | 10 Pfennig | EU-DE-012 | EU-DE-012 (same) | 0305 |
| C091 | 1982 | 10 Pfennig | EU-DE-017 | EU-DE-013 | 0010 |
| C092 | 1982 | 10 Pfennig | EU-DE-018 | EU-DE-014 | 0187 |
| C030 | 1982 | 10 Pfennig | EU-DE-015 | EU-DE-015 (same) | 0192 |
| C090 | 1982 | 10 Pfennig | EU-DE-016 | EU-DE-016 (same) | 0045 |
| C057 | 1982 | 50 Pfennig | EU-DE-019 | EU-DE-017 | 0018 |
| C050 | 1982 | 1 Deutsche Mark | EU-DE-013 | EU-DE-018 | 0242 |
| C103 | 1982 | 1 Deutsche Mark | EU-DE-014 | EU-DE-019 | 0211 |
| C122 | 1983 | 2 Pfennig | EU-DE-021 | EU-DE-020 | 0074 |
| C018 | 1983 | 2 Pfennig | EU-DE-020 | EU-DE-021 | 0115 |
| C227 | 1984 | 10 Pfennig | EU-DE-023 | EU-DE-022 | 0233 |
| C006 | 1984 | 1 Deutsche Mark | EU-DE-022 | EU-DE-023 | 0097 |
| C188 | 1985 | 1 Pfennig | EU-DE-025 | EU-DE-024 | 0004 |
| C187 | 1985 | 1 Pfennig | EU-DE-024 | EU-DE-025 | 0104 |
| C189 | 1985 | 1 Pfennig | EU-DE-026 | EU-DE-026 (same) | 0197 |
| C190 | 1985 | 1 Pfennig | EU-DE-027 | EU-DE-027 (same) | 0302 |
| C058 | 1985 | 50 Pfennig | EU-DE-028 | EU-DE-028 (same) | 0177 |
| C191 | 1986 | 1 Pfennig | EU-DE-029 | EU-DE-029 (same) | 0194 |
| C051 | 1986 | 10 Pfennig | EU-DE-030 | EU-DE-030 (same) | 0150 |
| C196 | 1987 | 5 Pfennig | EU-DE-032 | EU-DE-031 | 0217 |
| C009 | 1987 | 5 Deutsche Mark | EU-DE-031 | EU-DE-032 | 0087 |
| C123 | 1988 | 2 Pfennig | EU-DE-033 | EU-DE-033 (same) | 0189 |
| C022 | 1989 | 10 Pfennig | EU-DE-034 | EU-DE-034 (same) | 0022 |
| C228 | 1989 | 10 Pfennig | EU-DE-035 | EU-DE-035 (same) | 0172 |
| C229 | 1990 | 10 Pfennig | EU-DE-036 | EU-DE-036 (same) | 0070 |
| C192 | 1991 | 1 Pfennig | EU-DE-037 | EU-DE-037 (same) | 0220 |
| C197 | 1992 | 5 Pfennig | EU-DE-038 | EU-DE-038 (same) | 0112 |
| C048 | 1993 | 1 Deutsche Mark | EU-DE-039 | EU-DE-039 (same) | 0134 |
| C089 | 1995 | 10 Pfennig | EU-DE-040 | EU-DE-040 (same) | 0100 |
| C132 | 2002 | 1 Euro Cent | EU-DE-042 | EU-DE-041 | 0054 |
| C133 | 2002 | 1 Euro Cent | EU-DE-043 | EU-DE-042 | 0107 |
| C134 | 2002 | 1 Euro Cent | EU-DE-044 | EU-DE-043 | 0209 |
| C126 | 2002 | 2 Euro Cent | EU-DE-047 | EU-DE-044 | 0121 |
| C100 | 2002 | 2 Euro Cent | EU-DE-046 | EU-DE-045 | 0178 |
| C099 | 2002 | 5 Euro Cent | EU-DE-049 | EU-DE-046 | 0204 |
| C037 | 2002 | 10 Euro Cent | EU-DE-045 | EU-DE-047 | 0023 |
| C283 | 2002 | 10 Euro Cent | EU-DE-063 | EU-DE-048 | 0063 |
| C131 | 2002 | 20 Euro Cent | EU-DE-048 | EU-DE-049 | 0056 |
| C026 | 2002 | 50 Euro Cent | EU-DE-050 | EU-DE-050 (same) | 0082 |
| C080 | 2002 | 1 Euro | EU-DE-041 | EU-DE-051 | 0062 |
| C071 | 2003 | 2 Euro | EU-DE-051 | EU-DE-052 | 0163 |
| C273 | 2005 | 1 Euro Cent | EU-DE-062 | EU-DE-053 | 0031 |
| C135 | 2008 | 1 Euro Cent | EU-DE-052 | EU-DE-054 | 0032 |
| C136 | 2009 | 1 Euro Cent | EU-DE-053 | EU-DE-055 | 0148 |
| C046 | 2010 | 2 Euro Cent | EU-DE-054 | EU-DE-056 | 0280 |
| C053 | 2011 | 20 Euro Cent | EU-DE-055 | EU-DE-057 | 0066 |
| C137 | 2012 | 1 Euro Cent | EU-DE-056 | EU-DE-058 | 0153 |
| C121 | 2014 | 5 Euro Cent | EU-DE-057 | EU-DE-059 | 0137 |
| C138 | 2015 | 1 Euro Cent | EU-DE-058 | EU-DE-060 | 0024 |
| C102 | 2015 | 20 Euro Cent | EU-DE-059 | EU-DE-061 | 0268 |
| T001 | ND | Spielmarke “20” (GR) | EU-DE-060 | EU-DE-062 | 0141 |
| T002 | ND | Spielmarke “20” (GR) | EU-DE-061 | EU-DE-063 | 0292 |

## Europe / Greece (GR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C245 | 1970 | 2 Drachmai | EU-GR-001 | EU-GR-001 (same) | 0255 |
| C248 | 1982 | 2 Drachmes | EU-GR-002 | EU-GR-002 (same) | 0236 |

## Europe / Hungary (HU)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C032 | 1967 | 1 Forint | EU-HU-001 | EU-HU-001 (same) | 0271 |

## Europe / Ireland (IE)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C101 | 2002 | 1 Euro Cent | EU-IE-001 | EU-IE-001 (same) | 0132 |
| C143 | 2004 | 1 Euro Cent | EU-IE-002 | EU-IE-002 (same) | 0295 |
| C120 | 2013 | 5 Euro Cent | EU-IE-003 | EU-IE-003 (same) | 0288 |

## Europe / Italy (IT)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C240 | 1965 | 100 Lire | EU-IT-001 | EU-IT-001 (same) | 0156 |
| C011 | 1970 | 50 Lire | EU-IT-002 | EU-IT-002 (same) | 0283 |
| C298 | 1978 | 50 Lire | EU-IT-012 | EU-IT-003 | 0201 |
| C199 | 1978 | 50 Lire | EU-IT-003 | EU-IT-004 | 0303 |
| C299 | 1979 | 50 Lire | EU-IT-013 | EU-IT-005 | 0086 |
| C287 | 1979 | 50 Lire | EU-IT-011 | EU-IT-006 | 0198 |
| C211 | 1987 | 500 Lire | EU-IT-004 | EU-IT-007 | 0196 |
| C027 | 2002 | 20 Euro Cent | EU-IT-006 | EU-IT-008 | 0095 |
| C061 | 2002 | 20 Euro Cent | EU-IT-007 | EU-IT-009 | 0158 |
| C055 | 2002 | 50 Euro Cent | EU-IT-008 | EU-IT-010 | 0019 |
| C084 | 2002 | 1 Euro | EU-IT-005 | EU-IT-011 | 0034 |
| C036 | 2007 | 10 Euro Cent | EU-IT-009 | EU-IT-012 | 0231 |
| C039 | 2010 | 2 Euro Cent | EU-IT-010 | EU-IT-013 | 0143 |

## Europe / Malta (MT)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C043 | 2008 | 10 Euro Cent | EU-MT-002 | EU-MT-001 | 0215 |
| C064 | 2008 | 1 Euro | EU-MT-001 | EU-MT-002 | 0263 |
| C028 | 2013 | 5 Euro Cent | EU-MT-003 | EU-MT-003 (same) | 0029 |

## Europe / Netherlands (NL)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C255 | 1892 | 1 Cent | EU-NL-001 | EU-NL-001 (same) | 0017 |
| C198 | 1948 | 1 Cent | EU-NL-002 | EU-NL-002 (same) | 0114 |
| C223 | 1967 | 1 Gulden | EU-NL-003 | EU-NL-003 (same) | 0289 |
| C104 | 1996 | 25 Cents | EU-NL-005 | EU-NL-004 | 0120 |
| C010 | 1996 | 25 Cents | EU-NL-004 | EU-NL-005 | 0210 |
| C142 | 2000 | 1 Euro Cent | EU-NL-006 | EU-NL-006 (same) | 0065 |
| C004 | 2000 | 5 Euro Cent | EU-NL-007 | EU-NL-007 (same) | 0042 |
| C040 | 2001 | 20 Euro Cent | EU-NL-008 | EU-NL-008 (same) | 0165 |
| C070 | 2002 | 2 Euro | EU-NL-009 | EU-NL-009 (same) | 0118 |
| C045 | 2014 | 5 Euro Cent | EU-NL-010 | EU-NL-010 (same) | 0129 |

## Europe / Norway (NO)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C144 | 1998 | 50 Øre | EU-NO-001 | EU-NO-001 (same) | 0206 |
| C268 | 2000 | 50 Øre | EU-NO-002 | EU-NO-002 (same) | 0036 |

## Europe / Portugal (PT)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C056 | 2002 | 20 Euro Cent | EU-PT-001 | EU-PT-001 (same) | 0256 |

## Europe / Slovakia (SK)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C038 | 2009 | 2 Euro Cent | EU-SK-001 | EU-SK-001 (same) | 0048 |
| C285 | 2009 | 5 Euro Cent | EU-SK-002 | EU-SK-002 (same) | 0040 |

## Europe / Spain (ES)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C098 | 2000 | 5 Euro Cent | EU-ES-001 | EU-ES-001 (same) | 0274 |
| C140 | 2008 | 1 Euro Cent | EU-ES-002 | EU-ES-002 (same) | 0190 |
| C139 | 2014 | 1 Euro Cent | EU-ES-003 | EU-ES-003 (same) | 0009 |

## Europe / Sweden (SE)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C165 | 1973 | 1 Krona | EU-SE-001 | EU-SE-001 (same) | 0239 |

## Europe / Switzerland (CH)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C242 | 1883 | 10 Rappen | EU-CH-001 | EU-CH-001 (same) | 0135 |
| C256 | 1959 | 20 Rappen | EU-CH-002 | EU-CH-002 (same) | 0154 |
| C002 | 1963 | 5 Rappen | EU-CH-004 | EU-CH-003 | 0171 |
| C068 | 1963 | 20 Rappen | EU-CH-003 | EU-CH-004 | 0269 |
| C008 | 1968 | ½ Franc | EU-CH-005 | EU-CH-005 (same) | 0281 |
| C115 | 1968 | 2 Francs | EU-CH-007 | EU-CH-006 | 0039 |
| C003 | 1968 | 2 Francs | EU-CH-006 | EU-CH-007 | 0089 |
| C078 | 1969 | 20 Rappen | EU-CH-009 | EU-CH-008 | 0250 |
| C001 | 1969 | 1 Franc | EU-CH-008 | EU-CH-009 | 0181 |
| C093 | 1970 | 1 Franc | EU-CH-010 | EU-CH-010 (same) | 0064 |
| C015 | 1971 | ½ Franc | EU-CH-011 | EU-CH-011 (same) | 0068 |
| C014 | 1974 | 2 Francs | EU-CH-012 | EU-CH-012 (same) | 0099 |
| C066 | 1978 | 5 Francs | EU-CH-013 | EU-CH-013 (same) | 0007 |
| C082 | 1979 | 10 Rappen | EU-CH-014 | EU-CH-014 (same) | 0030 |
| C278 | 1980 | 20 Rappen | EU-CH-025 | EU-CH-015 | 0224 |
| C083 | 1981 | 10 Rappen | EU-CH-015 | EU-CH-016 | 0249 |
| C116 | 1981 | 2 Francs | EU-CH-017 | EU-CH-017 (same) | 0185 |
| C067 | 1981 | 2 Francs | EU-CH-016 | EU-CH-018 | 0241 |
| C075 | 1982 | 5 Rappen | EU-CH-018 | EU-CH-019 | 0105 |
| C081 | 1983 | 5 Rappen | EU-CH-019 | EU-CH-020 | 0170 |
| C094 | 1986 | 1 Franc | EU-CH-020 | EU-CH-021 | 0270 |
| C076 | 1989 | 20 Rappen | EU-CH-021 | EU-CH-022 | 0188 |
| C079 | 1991 | 20 Rappen | EU-CH-023 | EU-CH-023 (same) | 0180 |
| C077 | 1991 | 2 Francs | EU-CH-022 | EU-CH-024 | 0123 |
| C065 | 2014 | 5 Francs | EU-CH-024 | EU-CH-025 | 0013 |

## Europe / Turkey (TR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C208 | 2011 | 10 Kuruş | EU-TR-001 | EU-TR-001 (same) | 0012 |

## Europe / USSR (SU)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C260 | 1931 | 3 Kopecks | EU-SU-001 | EU-SU-001 (same) | 0093 |
| C261 | 1932 | 15 Kopecks | EU-SU-002 | EU-SU-002 (same) | 0015 |
| C042 | 1962 | 1 Kopek | EU-SU-003 | EU-SU-003 (same) | 0245 |
| C044 | 1974 | 1 Kopek | EU-SU-004 | EU-SU-004 (same) | 0290 |

## Europe / United Kingdom (GB)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C302 | 1922 | 1 Penny | EU-GB-056 | EU-GB-001 | 0098 |
| C164 | 1932 | ½ Penny | EU-GB-001 | EU-GB-002 | 0228 |
| C234 | 1968 | 10 New Pence | EU-GB-002 | EU-GB-003 | 0061 |
| C105 | 1971 | 1 Penny | EU-GB-003 | EU-GB-004 | 0057 |
| C216 | 1971 | 1 Penny | EU-GB-004 | EU-GB-005 | 0109 |
| C013 | 1971 | 2 New Pence | EU-GB-005 | EU-GB-006 | 0142 |
| C020 | 1973 | ½ New Penny | EU-GB-006 | EU-GB-007 | 0052 |
| C106 | 1975 | 1 Penny | EU-GB-007 | EU-GB-008 | 0279 |
| C024 | 1977 | 2 New Pence | EU-GB-008 | EU-GB-009 | 0051 |
| C205 | 1982 | 20 Pence | EU-GB-009 | EU-GB-010 | 0151 |
| C107 | 1987 | 1 Penny | EU-GB-010 | EU-GB-011 | 0059 |
| C297 | 1988 | 1 Penny | EU-GB-055 | EU-GB-012 | 0071 |
| C108 | 1988 | 1 Penny | EU-GB-011 | EU-GB-013 | 0246 |
| C168 | 1990 | 5 Pence | EU-GB-013 | EU-GB-014 | 0140 |
| C167 | 1990 | 5 Pence | EU-GB-012 | EU-GB-015 | 0278 |
| C296 | 1990 | 5 Pence | EU-GB-054 | EU-GB-016 | 0284 |
| C213 | 1991 | 2 Pence | EU-GB-014 | EU-GB-017 | 0222 |
| C169 | 1992 | 5 Pence | EU-GB-020 | EU-GB-018 | 0152 |
| C275 | 1992 | 5 Pence | EU-GB-051 | EU-GB-019 | 0251 |
| C148 | 1992 | 10 Pence | EU-GB-016 | EU-GB-020 | 0006 |
| C150 | 1992 | 10 Pence | EU-GB-018 | EU-GB-021 | 0116 |
| C151 | 1992 | 10 Pence | EU-GB-019 | EU-GB-022 | 0128 |
| C147 | 1992 | 10 Pence | EU-GB-015 | EU-GB-023 | 0200 |
| C149 | 1992 | 10 Pence | EU-GB-017 | EU-GB-024 | 0214 |
| C110 | 1995 | 1 Penny | EU-GB-022 | EU-GB-025 | 0049 |
| C109 | 1995 | 1 Penny | EU-GB-021 | EU-GB-026 | 0090 |
| C111 | 1996 | 1 Penny | EU-GB-023 | EU-GB-027 | 0253 |
| C171 | 1996 | 5 Pence | EU-GB-025 | EU-GB-028 | 0080 |
| C170 | 1996 | 5 Pence | EU-GB-024 | EU-GB-029 | 0193 |
| C241 | 1997 | 1 Penny | EU-GB-026 | EU-GB-030 | 0227 |
| C172 | 1997 | 5 Pence | EU-GB-027 | EU-GB-031 | 0075 |
| C217 | 1998 | 1 Penny | EU-GB-028 | EU-GB-032 | 0212 |
| C173 | 1998 | 5 Pence | EU-GB-029 | EU-GB-033 | 0285 |
| C174 | 2000 | 5 Pence | EU-GB-030 | EU-GB-034 | 0127 |
| C175 | 2001 | 5 Pence | EU-GB-032 | EU-GB-035 | 0144 |
| C152 | 2001 | 10 Pence | EU-GB-031 | EU-GB-036 | 0005 |
| C292 | 2002 | 1 Penny | EU-GB-053 | EU-GB-037 | 0160 |
| C112 | 2003 | 1 Penny | EU-GB-033 | EU-GB-038 | 0113 |
| C113 | 2007 | 1 Penny | EU-GB-034 | EU-GB-039 | 0050 |
| C176 | 2007 | 5 Pence | EU-GB-035 | EU-GB-040 | 0102 |
| C153 | 2008 | 10 Pence | EU-GB-036 | EU-GB-041 | 0168 |
| C177 | 2009 | 5 Pence | EU-GB-037 | EU-GB-042 | 0124 |
| C218 | 2010 | 1 Penny | EU-GB-038 | EU-GB-043 | 0238 |
| C178 | 2010 | 5 Pence | EU-GB-040 | EU-GB-044 | 0037 |
| C179 | 2010 | 5 Pence | EU-GB-041 | EU-GB-045 | 0237 |
| C154 | 2010 | 10 Pence | EU-GB-039 | EU-GB-046 | 0219 |
| C180 | 2012 | 5 Pence | EU-GB-042 | EU-GB-047 | 0162 |
| C290 | 2013 | 1 Penny | EU-GB-052 | EU-GB-048 | 0041 |
| C156 | 2013 | 10 Pence | EU-GB-044 | EU-GB-049 | 0184 |
| C155 | 2013 | 10 Pence | EU-GB-043 | EU-GB-050 | 0257 |
| C181 | 2014 | 5 Pence | EU-GB-046 | EU-GB-051 | 0122 |
| C182 | 2014 | 5 Pence | EU-GB-047 | EU-GB-052 | 0176 |
| C157 | 2014 | 10 Pence | EU-GB-045 | EU-GB-053 | 0133 |
| C183 | 2015 | 5 Pence | EU-GB-048 | EU-GB-054 | 0244 |
| C184 | 2016 | 5 Pence | EU-GB-050 | EU-GB-055 | 0199 |
| C158 | 2016 | 10 Pence | EU-GB-049 | EU-GB-056 | 0273 |

## Europe / Vatican City (VA)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C254 | 1951 | 10 Lire | EU-VA-001 | EU-VA-001 (same) | 0008 |

## Europe / Yugoslavia (YU)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C282 | 1965 | 50 Para | EU-YU-003 | EU-YU-001 | 0276 |
| C262 | 1984 | 1 Dinar | EU-YU-002 | EU-YU-002 (same) | 0131 |
| C251 | 1984 | 1 Dinar | EU-YU-001 | EU-YU-003 | 0191 |

## North America / Bahamas (BS)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C291 | 1984 | 5 Cents | NA-BS-002 | NA-BS-001 | 0202 |
| C300 | 1984 | 25 Cents | NA-BS-003 | NA-BS-002 | 0046 |
| C276 | 2015 | 1 Cent | NA-BS-001 | NA-BS-003 | 0157 |

## North America / Belize (BZ)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C280 | 2007 | 25 Cents | NA-BZ-001 | NA-BZ-001 (same) | 0164 |

## North America / Bermuda (BM)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C277 | 2004 | 10 Cents | NA-BM-001 | NA-BM-001 (same) | 0213 |

## North America / Canada (CA)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C160 | 1939 | 5 Cents | NA-CA-001 | NA-CA-001 (same) | 0084 |

## North America / Cayman Islands (KY)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C269 | 1990 | 1 Cent | NA-KY-005 | NA-KY-001 | 0085 |
| C185 | 1996 | 5 Cents | NA-KY-001 | NA-KY-002 | 0229 |
| C214 | 1996 | 5 Cents | NA-KY-002 | NA-KY-003 | 0240 |
| C186 | 2002 | 5 Cents | NA-KY-003 | NA-KY-004 | 0298 |
| C215 | 2008 | 5 Cents | NA-KY-004 | NA-KY-005 | 0259 |

## North America / Costa Rica (CR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C016 | 1985 | 5 Colones | NA-CR-001 | NA-CR-001 (same) | 0043 |

## North America / Cuba (CU)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C252 | 1962 | 20 Centavos | NA-CU-001 | NA-CU-001 (same) | 0106 |

## North America / East Caribbean States (EC)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C159 | 2004 | 10 Cents | NA-EC-001 | NA-EC-001 (same) | 0111 |

## North America / Guatemala (GT)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C235 | 1934 | 10 Centavos | NA-GT-001 | NA-GT-001 (same) | 0203 |
| C202 | 2010 | 10 Centavos | NA-GT-002 | NA-GT-002 (same) | 0088 |

## North America / Honduras (HN)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C286 | 2012 | 50 Centavos | NA-HN-001 | NA-HN-001 (same) | 0092 |

## North America / Jamaica (JM)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C069 | 1975 | 50 Cents | NA-JM-001 | NA-JM-001 (same) | 0072 |
| C253 | 1993 | 10 Cents | NA-JM-002 | NA-JM-002 (same) | 0234 |
| C219 | 2015 | 1 Dollar | NA-JM-003 | NA-JM-003 (same) | 0258 |
| C230 | 2015 | 10 Dollars | NA-JM-004 | NA-JM-004 (same) | 0182 |

## North America / Mexico (MX)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C114 | 1914 | 5 Centavos | NA-MX-001 | NA-MX-001 (same) | 0146 |
| C259 | 1940 | 1 Centavo | NA-MX-002 | NA-MX-002 (same) | 0103 |
| C166 | 1944 | 5 Centavos | NA-MX-003 | NA-MX-003 (same) | 0136 |
| C161 | 1945 | 10 Centavos | NA-MX-004 | NA-MX-004 (same) | 0138 |
| C263 | 1950 | 25 Centavos | NA-MX-005 | NA-MX-005 (same) | 0207 |
| C244 | 1964 | 20 Centavos | NA-MX-006 | NA-MX-006 (same) | 0091 |
| C257 | 1967 | 20 Centavos | NA-MX-007 | NA-MX-007 (same) | 0218 |
| C294 | 1969 | 5 Centavos | NA-MX-014 | NA-MX-008 | 0243 |
| C304 | 1981 | 20 Pesos | NA-MX-016 | NA-MX-009 | 0261 |
| C209 | 1987 | 5 Pesos | NA-MX-008 | NA-MX-010 | 0247 |
| C293 | 1988 | 500 Pesos | NA-MX-013 | NA-MX-011 | 0166 |
| C301 | 1989 | 500 Pesos | NA-MX-015 | NA-MX-012 | 0047 |
| C274 | 1995 | 10 Centavos | NA-MX-011 | NA-MX-013 | 0055 |
| C284 | 2009 | 50 Centavos | NA-MX-012 | NA-MX-014 | 0125 |
| C236 | 2010 | 2 Pesos | NA-MX-009 | NA-MX-015 | 0119 |
| C271 | 2013 | 50 Centavos | NA-MX-010 | NA-MX-016 | 0252 |

## North America / Trinidad and Tobago (TT)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C204 | 2014 | 25 Cents | NA-TT-001 | NA-TT-001 (same) | 0108 |
| C207 | 2016 | 10 Cents | NA-TT-002 | NA-TT-002 (same) | 0223 |

## North America / USA (US)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C088 | 1957 | 10¢ Roosevelt | NA-US-001 | NA-US-001 (same) | 0126 |
| T004 | ca. 1970s | Miniature “penny” in printed cardboard flap | NA-US-006 | NA-US-002 | 0300 |
| C073 | 1976 | 25 Cents | NA-US-002 | NA-US-003 | 0266 |
| T006 | 2009 | Prop $50 (Series 2009 style) | NA-US-003 | NA-US-004 | 0221 |
| T005 | 2013 | Prop $1 (Series 2013 style) | NA-US-004 | NA-US-005 | 0003 |
| T003 | ND | Ride token (Sandy the Pony · Meijer) | NA-US-005 | NA-US-006 | 0020 |

## Oceania / Australia (AU)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C031 | 1943 | Threepence (3d) | OC-AU-001 | OC-AU-001 (same) | 0035 |
| C239 | 1944 | 1 Penny | OC-AU-002 | OC-AU-002 (same) | 0216 |
| C249 | 1966 | 20 Cents | OC-AU-003 | OC-AU-003 (same) | 0272 |
| C288 | 1983 | 1 Cent | OC-AU-004 | OC-AU-004 (same) | 0001 |
| C303 | 1983 | 1 Cent | OC-AU-006 | OC-AU-005 | 0067 |
| C295 | 2006 | 10 Cents | OC-AU-005 | OC-AU-006 | 0081 |

## South America / Argentina (AR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C289 | 1954 | 5 Centavos | SA-AR-001 | SA-AR-001 (same) | 0117 |

## South America / Brazil (BR)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C047 | 2006 | 5 Centavos | SA-BR-001 | SA-BR-001 (same) | 0291 |

## South America / Chile (CL)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C145 | 1996 | 50 Pesos | SA-CL-001 | SA-CL-001 (same) | 0028 |

## South America / Colombia (CO)

| id | year | denomination | old ser | new ser | or no pattern |
|---|---|---|---|---|---|
| C233 | 2016 | 50 Pesos | SA-CO-001 | SA-CO-001 (same) | 0076 |
