# Serial reassignment plan (DRY RUN)

> **NOT APPLIED. Run after Phase 1 completes** (every coin has its initial metadata). Nothing in `collection/` was changed by this file; `ser` values in the records are still the ledger's.

Method: sort by continent, then country, then year (no-date last), then face value; ties are broken by a hash of the permanent `id` (salt `titan-reliquary/ser-reassign/v1`), not by scan order. New `ser` = continent code + ISO + a 3-digit sequence from 001 within each ISO. The permanent key `id` (`C###`/`T###`) never changes.

- specimens: 273; ser values that would change: 89; unchanged: 184; all new values unique: yes

Regenerate: `python3 tools/schema/reassign_ser.py collection/` (deterministic). Applying the plan is a separate, owner-approved step: rewrite `ser` in `specimens/*.json` and `boot.json`, append one ChangeEvent per specimen (`field: ser`), refresh the manifest, then tell the photo workflow the new numbers.


## Africa / Eritrea (ER)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C212 | 1997 | 50 Cents | AF-ER-001 | AF-ER-001 (same) |

## Africa / Nigeria (NG)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C201 | 1976 | 10 Kobo | AF-NG-001 | AF-NG-001 (same) |

## Asia / Hong Kong (HK)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C146 | 1998 | $1 | AS-HK-001 | AS-HK-001 (same) |

## Asia / India (IN)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C203 | 2001 | 1 Rupee | AS-IN-001 | AS-IN-001 (same) |

## Asia / Japan (JP)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C222 | 1965 | 1 Yen | AS-JP-001 | AS-JP-001 (same) |
| C206 | 1976 | 1 Yen | AS-JP-002 | AS-JP-002 (same) |
| C220 | 1982 | 10 Yen | AS-JP-003 | AS-JP-003 (same) |
| C270 | 1988 | 10 Yen | AS-JP-004 | AS-JP-004 (same) |

## Asia / Philippines (PH)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C246 | 1971 | 10 Sentimos | AS-PH-001 | AS-PH-001 (same) |
| C163 | 1984 | 50 Sentimo | AS-PH-002 | AS-PH-002 (same) |

## Asia / Saudi Arabia (SA)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C231 | AH 1378 (1958) | 1 Qirsh | AS-SA-001 | AS-SA-001 (same) |

## Asia / Singapore (SG)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C250 | 1967 | 20 Cents | AS-SG-001 | AS-SG-001 (same) |
| C264 | 1973 | 10 Cents | AS-SG-002 | AS-SG-002 (same) |

## Asia / South Korea (KR)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C247 | 1966 | 1 Won | AS-KR-001 | AS-KR-001 (same) |
| C210 | 2000 | 100 Won | AS-KR-002 | AS-KR-002 (same) |
| C266 | 2012 | 10 Won | AS-KR-003 | AS-KR-003 (same) |
| C267 | 2013 | 10 Won | AS-KR-004 | AS-KR-004 (same) |

## Asia / Taiwan (ROC) (TW)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C200 | 1978 | 1 Yuan | AS-TW-001 | AS-TW-001 (same) |

## Asia / Thailand (TH)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C162 | 2006 | 1 Baht | AS-TH-001 | AS-TH-001 (same) |

## Asia / Vietnam (VN)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C258 | 1953 | 20 Su | AS-VN-001 | AS-VN-001 (same) |
| C232 | 2003 | 1000 Đồng | AS-VN-002 | AS-VN-002 (same) |

## Europe / France (FR)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C243 | 1946 | 5 Francs | EU-FR-001 | EU-FR-001 (same) |
| C118 | 1960 | 1 Franc | EU-FR-004 | EU-FR-002 |
| C059 | 1960 | 1 Franc | EU-FR-002 | EU-FR-003 |
| C117 | 1960 | 1 Franc | EU-FR-003 | EU-FR-004 |
| C012 | 1962 | 1 Franc | EU-FR-005 | EU-FR-005 (same) |
| C007 | 1963 | 10 Centimes | EU-FR-006 | EU-FR-006 (same) |
| C025 | 1965 | 1 Franc | EU-FR-007 | EU-FR-007 (same) |
| C124 | 1967 | 10 Centimes | EU-FR-008 | EU-FR-008 (same) |
| C033 | 1969 | ½ Franc | EU-FR-009 | EU-FR-009 (same) |
| C060 | 1971 | ½ Franc | EU-FR-010 | EU-FR-010 (same) |
| C193 | 1973 | 5 Centimes | EU-FR-011 | EU-FR-011 (same) |
| C041 | 1974 | 20 Centimes | EU-FR-012 | EU-FR-012 (same) |
| C119 | 1977 | 1 Franc | EU-FR-013 | EU-FR-013 (same) |
| C194 | 1980 | 5 Centimes | EU-FR-014 | EU-FR-014 (same) |
| C125 | 1984 | 10 Centimes | EU-FR-015 | EU-FR-015 (same) |
| C005 | 1986 | 20 Centimes | EU-FR-017 | EU-FR-016 |
| C221 | 1986 | ½ Franc | EU-FR-016 | EU-FR-017 |
| C049 | 1989 | 10 Francs | EU-FR-018 | EU-FR-018 (same) |
| C063 | 1995 | 10 Centimes | EU-FR-019 | EU-FR-019 (same) |
| C062 | 1998 | 10 Centimes | EU-FR-020 | EU-FR-020 (same) |
| C095 | 1999 | 10 Euro Cent | EU-FR-022 | EU-FR-021 |
| C017 | 1999 | 1 Franc | EU-FR-021 | EU-FR-022 |
| C129 | 2000 | 20 Euro Cent | EU-FR-024 | EU-FR-023 |
| C130 | 2000 | 20 Euro Cent | EU-FR-025 | EU-FR-024 |
| C072 | 2000 | 2 Euro | EU-FR-023 | EU-FR-025 |
| C096 | 2002 | 10 Euro Cent | EU-FR-026 | EU-FR-026 (same) |
| C141 | 2009 | 1 Euro Cent | EU-FR-027 | EU-FR-027 (same) |
| C034 | 2009 | 2 Euro Cent | EU-FR-028 | EU-FR-028 (same) |
| C052 | 2009 | 5 Euro Cent | EU-FR-029 | EU-FR-029 (same) |
| C127 | 2010 | 2 Euro Cent | EU-FR-031 | EU-FR-030 |
| C054 | 2010 | 10 Euro Cent | EU-FR-030 | EU-FR-031 |
| C097 | 2015 | 10 Euro Cent | EU-FR-032 | EU-FR-032 (same) |
| C128 | 2017 | 2 Euro Cent | EU-FR-033 | EU-FR-033 (same) |

## Europe / Germany (DE)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C023 | 1918 | 20 Pfennig | EU-DE-001 | EU-DE-001 (same) |
| C265 | 1950 | 5 Pfennig | EU-DE-002 | EU-DE-002 (same) |
| C224 | 1966 | 10 Pfennig | EU-DE-003 | EU-DE-003 (same) |
| C021 | 1970 | 10 Pfennig | EU-DE-004 | EU-DE-004 (same) |
| C237 | 1971 | 5 Pfennig | EU-DE-006 | EU-DE-005 |
| C195 | 1971 | 5 Pfennig | EU-DE-005 | EU-DE-006 |
| C035 | 1971 | 50 Pfennig | EU-DE-007 | EU-DE-007 (same) |
| C029 | 1972 | 1 Pfennig | EU-DE-008 | EU-DE-008 (same) |
| C238 | 1973 | 2 Deutsche Mark | EU-DE-009 | EU-DE-009 (same) |
| C225 | 1977 | 10 Pfennig | EU-DE-010 | EU-DE-010 (same) |
| C226 | 1980 | 10 Pfennig | EU-DE-011 | EU-DE-011 (same) |
| C019 | 1981 | 10 Pfennig | EU-DE-012 | EU-DE-012 (same) |
| C091 | 1982 | 10 Pfennig | EU-DE-017 | EU-DE-013 |
| C092 | 1982 | 10 Pfennig | EU-DE-018 | EU-DE-014 |
| C030 | 1982 | 10 Pfennig | EU-DE-015 | EU-DE-015 (same) |
| C090 | 1982 | 10 Pfennig | EU-DE-016 | EU-DE-016 (same) |
| C057 | 1982 | 50 Pfennig | EU-DE-019 | EU-DE-017 |
| C050 | 1982 | 1 Deutsche Mark | EU-DE-013 | EU-DE-018 |
| C103 | 1982 | 1 Deutsche Mark | EU-DE-014 | EU-DE-019 |
| C122 | 1983 | 2 Pfennig | EU-DE-021 | EU-DE-020 |
| C018 | 1983 | 2 Pfennig | EU-DE-020 | EU-DE-021 |
| C227 | 1984 | 10 Pfennig | EU-DE-023 | EU-DE-022 |
| C006 | 1984 | 1 Deutsche Mark | EU-DE-022 | EU-DE-023 |
| C188 | 1985 | 1 Pfennig | EU-DE-025 | EU-DE-024 |
| C187 | 1985 | 1 Pfennig | EU-DE-024 | EU-DE-025 |
| C189 | 1985 | 1 Pfennig | EU-DE-026 | EU-DE-026 (same) |
| C190 | 1985 | 1 Pfennig | EU-DE-027 | EU-DE-027 (same) |
| C058 | 1985 | 50 Pfennig | EU-DE-028 | EU-DE-028 (same) |
| C191 | 1986 | 1 Pfennig | EU-DE-029 | EU-DE-029 (same) |
| C051 | 1986 | 10 Pfennig | EU-DE-030 | EU-DE-030 (same) |
| C196 | 1987 | 5 Pfennig | EU-DE-032 | EU-DE-031 |
| C009 | 1987 | 5 Deutsche Mark | EU-DE-031 | EU-DE-032 |
| C123 | 1988 | 2 Pfennig | EU-DE-033 | EU-DE-033 (same) |
| C022 | 1989 | 10 Pfennig | EU-DE-034 | EU-DE-034 (same) |
| C228 | 1989 | 10 Pfennig | EU-DE-035 | EU-DE-035 (same) |
| C229 | 1990 | 10 Pfennig | EU-DE-036 | EU-DE-036 (same) |
| C192 | 1991 | 1 Pfennig | EU-DE-037 | EU-DE-037 (same) |
| C197 | 1992 | 5 Pfennig | EU-DE-038 | EU-DE-038 (same) |
| C048 | 1993 | 1 Deutsche Mark | EU-DE-039 | EU-DE-039 (same) |
| C089 | 1995 | 10 Pfennig | EU-DE-040 | EU-DE-040 (same) |
| C132 | 2002 | 1 Euro Cent | EU-DE-042 | EU-DE-041 |
| C133 | 2002 | 1 Euro Cent | EU-DE-043 | EU-DE-042 |
| C134 | 2002 | 1 Euro Cent | EU-DE-044 | EU-DE-043 |
| C126 | 2002 | 2 Euro Cent | EU-DE-047 | EU-DE-044 |
| C100 | 2002 | 2 Euro Cent | EU-DE-046 | EU-DE-045 |
| C099 | 2002 | 5 Euro Cent | EU-DE-049 | EU-DE-046 |
| C037 | 2002 | 10 Euro Cent | EU-DE-045 | EU-DE-047 |
| C131 | 2002 | 20 Euro Cent | EU-DE-048 | EU-DE-048 (same) |
| C026 | 2002 | 50 Euro Cent | EU-DE-050 | EU-DE-049 |
| C080 | 2002 | 1 Euro | EU-DE-041 | EU-DE-050 |
| C071 | 2003 | 2 Euro | EU-DE-051 | EU-DE-051 (same) |
| C135 | 2008 | 1 Euro Cent | EU-DE-052 | EU-DE-052 (same) |
| C136 | 2009 | 1 Euro Cent | EU-DE-053 | EU-DE-053 (same) |
| C046 | 2010 | 2 Euro Cent | EU-DE-054 | EU-DE-054 (same) |
| C053 | 2011 | 20 Euro Cent | EU-DE-055 | EU-DE-055 (same) |
| C137 | 2012 | 1 Euro Cent | EU-DE-056 | EU-DE-056 (same) |
| C121 | 2014 | 5 Euro Cent | EU-DE-057 | EU-DE-057 (same) |
| C138 | 2015 | 1 Euro Cent | EU-DE-058 | EU-DE-058 (same) |
| C102 | 2015 | 20 Euro Cent | EU-DE-059 | EU-DE-059 (same) |
| T001 | ND | Spielmarke “20” (GR) | EU-DE-060 | EU-DE-060 (same) |
| T002 | ND | Spielmarke “20” (GR) | EU-DE-061 | EU-DE-061 (same) |

## Europe / Greece (GR)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C245 | 1970 | 2 Drachmai | EU-GR-001 | EU-GR-001 (same) |
| C248 | 1982 | 2 Drachmes | EU-GR-002 | EU-GR-002 (same) |

## Europe / Hungary (HU)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C032 | 1967 | 1 Forint | EU-HU-001 | EU-HU-001 (same) |

## Europe / Ireland (IE)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C101 | 2002 | 1 Euro Cent | EU-IE-001 | EU-IE-001 (same) |
| C143 | 2004 | 1 Euro Cent | EU-IE-002 | EU-IE-002 (same) |
| C120 | 2013 | 5 Euro Cent | EU-IE-003 | EU-IE-003 (same) |

## Europe / Italy (IT)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C240 | 1965 | 100 Lire | EU-IT-001 | EU-IT-001 (same) |
| C011 | 1970 | 50 Lire | EU-IT-002 | EU-IT-002 (same) |
| C199 | 1978 | 50 Lire | EU-IT-003 | EU-IT-003 (same) |
| C211 | 1987 | 500 Lire | EU-IT-004 | EU-IT-004 (same) |
| C027 | 2002 | 20 Euro Cent | EU-IT-006 | EU-IT-005 |
| C061 | 2002 | 20 Euro Cent | EU-IT-007 | EU-IT-006 |
| C055 | 2002 | 50 Euro Cent | EU-IT-008 | EU-IT-007 |
| C084 | 2002 | 1 Euro | EU-IT-005 | EU-IT-008 |
| C036 | 2007 | 10 Euro Cent | EU-IT-009 | EU-IT-009 (same) |
| C039 | 2010 | 2 Euro Cent | EU-IT-010 | EU-IT-010 (same) |

## Europe / Malta (MT)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C043 | 2008 | 10 Euro Cent | EU-MT-002 | EU-MT-001 |
| C064 | 2008 | 1 Euro | EU-MT-001 | EU-MT-002 |
| C028 | 2013 | 5 Euro Cent | EU-MT-003 | EU-MT-003 (same) |

## Europe / Netherlands (NL)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C255 | 1892 | 1 Cent | EU-NL-001 | EU-NL-001 (same) |
| C198 | 1948 | 1 Cent | EU-NL-002 | EU-NL-002 (same) |
| C223 | 1967 | 1 Gulden | EU-NL-003 | EU-NL-003 (same) |
| C104 | 1996 | 25 Cents | EU-NL-005 | EU-NL-004 |
| C010 | 1996 | 25 Cents | EU-NL-004 | EU-NL-005 |
| C142 | 2000 | 1 Euro Cent | EU-NL-006 | EU-NL-006 (same) |
| C004 | 2000 | 5 Euro Cent | EU-NL-007 | EU-NL-007 (same) |
| C040 | 2001 | 20 Euro Cent | EU-NL-008 | EU-NL-008 (same) |
| C070 | 2002 | 2 Euro | EU-NL-009 | EU-NL-009 (same) |
| C045 | 2014 | 5 Euro Cent | EU-NL-010 | EU-NL-010 (same) |

## Europe / Norway (NO)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C144 | 1998 | 50 Øre | EU-NO-001 | EU-NO-001 (same) |
| C268 | 2000 | 50 Øre | EU-NO-002 | EU-NO-002 (same) |

## Europe / Portugal (PT)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C056 | 2002 | 20 Euro Cent | EU-PT-001 | EU-PT-001 (same) |

## Europe / Slovakia (SK)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C038 | 2009 | 2 Euro Cent | EU-SK-001 | EU-SK-001 (same) |

## Europe / Spain (ES)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C098 | 2000 | 5 Euro Cent | EU-ES-001 | EU-ES-001 (same) |
| C140 | 2008 | 1 Euro Cent | EU-ES-002 | EU-ES-002 (same) |
| C139 | 2014 | 1 Euro Cent | EU-ES-003 | EU-ES-003 (same) |

## Europe / Sweden (SE)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C165 | 1973 | 1 Krona | EU-SE-001 | EU-SE-001 (same) |

## Europe / Switzerland (CH)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C242 | 1883 | 10 Rappen | EU-CH-001 | EU-CH-001 (same) |
| C256 | 1959 | 20 Rappen | EU-CH-002 | EU-CH-002 (same) |
| C002 | 1963 | 5 Rappen | EU-CH-004 | EU-CH-003 |
| C068 | 1963 | 20 Rappen | EU-CH-003 | EU-CH-004 |
| C008 | 1968 | ½ Franc | EU-CH-005 | EU-CH-005 (same) |
| C115 | 1968 | 2 Francs | EU-CH-007 | EU-CH-006 |
| C003 | 1968 | 2 Francs | EU-CH-006 | EU-CH-007 |
| C078 | 1969 | 20 Rappen | EU-CH-009 | EU-CH-008 |
| C001 | 1969 | 1 Franc | EU-CH-008 | EU-CH-009 |
| C093 | 1970 | 1 Franc | EU-CH-010 | EU-CH-010 (same) |
| C015 | 1971 | ½ Franc | EU-CH-011 | EU-CH-011 (same) |
| C014 | 1974 | 2 Francs | EU-CH-012 | EU-CH-012 (same) |
| C066 | 1978 | 5 Francs | EU-CH-013 | EU-CH-013 (same) |
| C082 | 1979 | 10 Rappen | EU-CH-014 | EU-CH-014 (same) |
| C083 | 1981 | 10 Rappen | EU-CH-015 | EU-CH-015 (same) |
| C116 | 1981 | 2 Francs | EU-CH-017 | EU-CH-016 |
| C067 | 1981 | 2 Francs | EU-CH-016 | EU-CH-017 |
| C075 | 1982 | 5 Rappen | EU-CH-018 | EU-CH-018 (same) |
| C081 | 1983 | 5 Rappen | EU-CH-019 | EU-CH-019 (same) |
| C094 | 1986 | 1 Franc | EU-CH-020 | EU-CH-020 (same) |
| C076 | 1989 | 20 Rappen | EU-CH-021 | EU-CH-021 (same) |
| C079 | 1991 | 20 Rappen | EU-CH-023 | EU-CH-022 |
| C077 | 1991 | 2 Francs | EU-CH-022 | EU-CH-023 |
| C065 | 2014 | 5 Francs | EU-CH-024 | EU-CH-024 (same) |

## Europe / Turkey (TR)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C208 | 2011 | 10 Kuruş | EU-TR-001 | EU-TR-001 (same) |

## Europe / USSR (SU)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C260 | 1931 | 3 Kopecks | EU-SU-001 | EU-SU-001 (same) |
| C261 | 1932 | 15 Kopecks | EU-SU-002 | EU-SU-002 (same) |
| C042 | 1962 | 1 Kopek | EU-SU-003 | EU-SU-003 (same) |
| C044 | 1974 | 1 Kopek | EU-SU-004 | EU-SU-004 (same) |

## Europe / United Kingdom (GB)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C164 | 1932 | ½ Penny | EU-GB-001 | EU-GB-001 (same) |
| C234 | 1968 | 10 New Pence | EU-GB-002 | EU-GB-002 (same) |
| C105 | 1971 | 1 Penny | EU-GB-003 | EU-GB-003 (same) |
| C216 | 1971 | 1 Penny | EU-GB-004 | EU-GB-004 (same) |
| C013 | 1971 | 2 New Pence | EU-GB-005 | EU-GB-005 (same) |
| C020 | 1973 | ½ New Penny | EU-GB-006 | EU-GB-006 (same) |
| C106 | 1975 | 1 Penny | EU-GB-007 | EU-GB-007 (same) |
| C024 | 1977 | 2 New Pence | EU-GB-008 | EU-GB-008 (same) |
| C205 | 1982 | 20 Pence | EU-GB-009 | EU-GB-009 (same) |
| C107 | 1987 | 1 Penny | EU-GB-010 | EU-GB-010 (same) |
| C108 | 1988 | 1 Penny | EU-GB-011 | EU-GB-011 (same) |
| C168 | 1990 | 5 Pence | EU-GB-013 | EU-GB-012 |
| C167 | 1990 | 5 Pence | EU-GB-012 | EU-GB-013 |
| C213 | 1991 | 2 Pence | EU-GB-014 | EU-GB-014 (same) |
| C169 | 1992 | 5 Pence | EU-GB-020 | EU-GB-015 |
| C148 | 1992 | 10 Pence | EU-GB-016 | EU-GB-016 (same) |
| C150 | 1992 | 10 Pence | EU-GB-018 | EU-GB-017 |
| C151 | 1992 | 10 Pence | EU-GB-019 | EU-GB-018 |
| C147 | 1992 | 10 Pence | EU-GB-015 | EU-GB-019 |
| C149 | 1992 | 10 Pence | EU-GB-017 | EU-GB-020 |
| C110 | 1995 | 1 Penny | EU-GB-022 | EU-GB-021 |
| C109 | 1995 | 1 Penny | EU-GB-021 | EU-GB-022 |
| C111 | 1996 | 1 Penny | EU-GB-023 | EU-GB-023 (same) |
| C171 | 1996 | 5 Pence | EU-GB-025 | EU-GB-024 |
| C170 | 1996 | 5 Pence | EU-GB-024 | EU-GB-025 |
| C241 | 1997 | 1 Penny | EU-GB-026 | EU-GB-026 (same) |
| C172 | 1997 | 5 Pence | EU-GB-027 | EU-GB-027 (same) |
| C217 | 1998 | 1 Penny | EU-GB-028 | EU-GB-028 (same) |
| C173 | 1998 | 5 Pence | EU-GB-029 | EU-GB-029 (same) |
| C174 | 2000 | 5 Pence | EU-GB-030 | EU-GB-030 (same) |
| C175 | 2001 | 5 Pence | EU-GB-032 | EU-GB-031 |
| C152 | 2001 | 10 Pence | EU-GB-031 | EU-GB-032 |
| C112 | 2003 | 1 Penny | EU-GB-033 | EU-GB-033 (same) |
| C113 | 2007 | 1 Penny | EU-GB-034 | EU-GB-034 (same) |
| C176 | 2007 | 5 Pence | EU-GB-035 | EU-GB-035 (same) |
| C153 | 2008 | 10 Pence | EU-GB-036 | EU-GB-036 (same) |
| C177 | 2009 | 5 Pence | EU-GB-037 | EU-GB-037 (same) |
| C218 | 2010 | 1 Penny | EU-GB-038 | EU-GB-038 (same) |
| C178 | 2010 | 5 Pence | EU-GB-040 | EU-GB-039 |
| C179 | 2010 | 5 Pence | EU-GB-041 | EU-GB-040 |
| C154 | 2010 | 10 Pence | EU-GB-039 | EU-GB-041 |
| C180 | 2012 | 5 Pence | EU-GB-042 | EU-GB-042 (same) |
| C156 | 2013 | 10 Pence | EU-GB-044 | EU-GB-043 |
| C155 | 2013 | 10 Pence | EU-GB-043 | EU-GB-044 |
| C181 | 2014 | 5 Pence | EU-GB-046 | EU-GB-045 |
| C182 | 2014 | 5 Pence | EU-GB-047 | EU-GB-046 |
| C157 | 2014 | 10 Pence | EU-GB-045 | EU-GB-047 |
| C183 | 2015 | 5 Pence | EU-GB-048 | EU-GB-048 (same) |
| C184 | 2016 | 5 Pence | EU-GB-050 | EU-GB-049 |
| C158 | 2016 | 10 Pence | EU-GB-049 | EU-GB-050 |

## Europe / Vatican City (VA)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C254 | 1951 | 10 Lire | EU-VA-001 | EU-VA-001 (same) |

## Europe / Yugoslavia (YU)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C262 | 1984 | 1 Dinar | EU-YU-002 | EU-YU-001 |
| C251 | 1984 | 1 Dinar | EU-YU-001 | EU-YU-002 |

## North America / Canada (CA)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C160 | 1939 | 5 Cents | NA-CA-001 | NA-CA-001 (same) |

## North America / Cayman Islands (KY)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C269 | 1990 | 1 Cent | NA-KY-005 | NA-KY-001 |
| C185 | 1996 | 5 Cents | NA-KY-001 | NA-KY-002 |
| C214 | 1996 | 5 Cents | NA-KY-002 | NA-KY-003 |
| C186 | 2002 | 5 Cents | NA-KY-003 | NA-KY-004 |
| C215 | 2008 | 5 Cents | NA-KY-004 | NA-KY-005 |

## North America / Costa Rica (CR)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C016 | 1985 | 5 Colones | NA-CR-001 | NA-CR-001 (same) |

## North America / Cuba (CU)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C252 | 1962 | 20 Centavos | NA-CU-001 | NA-CU-001 (same) |

## North America / East Caribbean States (EC)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C159 | 2004 | 10 Cents | NA-EC-001 | NA-EC-001 (same) |

## North America / Guatemala (GT)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C235 | 1934 | 10 Centavos | NA-GT-001 | NA-GT-001 (same) |
| C202 | 2010 | 10 Centavos | NA-GT-002 | NA-GT-002 (same) |

## North America / Jamaica (JM)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C069 | 1975 | 50 Cents | NA-JM-001 | NA-JM-001 (same) |
| C253 | 1993 | 10 Cents | NA-JM-002 | NA-JM-002 (same) |
| C219 | 2015 | 1 Dollar | NA-JM-003 | NA-JM-003 (same) |
| C230 | 2015 | 10 Dollars | NA-JM-004 | NA-JM-004 (same) |

## North America / Mexico (MX)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C114 | 1914 | 5 Centavos | NA-MX-001 | NA-MX-001 (same) |
| C259 | 1940 | 1 Centavo | NA-MX-002 | NA-MX-002 (same) |
| C166 | 1944 | 5 Centavos | NA-MX-003 | NA-MX-003 (same) |
| C161 | 1945 | 10 Centavos | NA-MX-004 | NA-MX-004 (same) |
| C263 | 1950 | 25 Centavos | NA-MX-005 | NA-MX-005 (same) |
| C244 | 1964 | 20 Centavos | NA-MX-006 | NA-MX-006 (same) |
| C257 | 1967 | 20 Centavos | NA-MX-007 | NA-MX-007 (same) |
| C209 | 1987 | 5 Pesos | NA-MX-008 | NA-MX-008 (same) |
| C236 | 2010 | 2 Pesos | NA-MX-009 | NA-MX-009 (same) |
| C271 | 2013 | 50 Centavos | NA-MX-010 | NA-MX-010 (same) |

## North America / Trinidad and Tobago (TT)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C204 | 2014 | 25 Cents | NA-TT-001 | NA-TT-001 (same) |
| C207 | 2016 | 10 Cents | NA-TT-002 | NA-TT-002 (same) |

## North America / USA (US)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C088 | 1957 | 10¢ Roosevelt | NA-US-001 | NA-US-001 (same) |
| T004 | ca. 1970s | Miniature “penny” in printed cardboard flap | NA-US-006 | NA-US-002 |
| C073 | 1976 | 25 Cents | NA-US-002 | NA-US-003 |
| T006 | 2009 | Prop $50 (Series 2009 style) | NA-US-003 | NA-US-004 |
| T005 | 2013 | Prop $1 (Series 2013 style) | NA-US-004 | NA-US-005 |
| T003 | ND | Ride token (Sandy the Pony · Meijer) | NA-US-005 | NA-US-006 |

## Oceania / Australia (AU)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C031 | 1943 | Threepence (3d) | OC-AU-001 | OC-AU-001 (same) |
| C239 | 1944 | 1 Penny | OC-AU-002 | OC-AU-002 (same) |
| C249 | 1966 | 20 Cents | OC-AU-003 | OC-AU-003 (same) |

## South America / Brazil (BR)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C047 | 2006 | 5 Centavos | SA-BR-001 | SA-BR-001 (same) |

## South America / Chile (CL)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C145 | 1996 | 50 Pesos | SA-CL-001 | SA-CL-001 (same) |

## South America / Colombia (CO)

| id | year | denomination | old ser | new ser |
|---|---|---|---|---|
| C233 | 2016 | 50 Pesos | SA-CO-001 | SA-CO-001 (same) |
