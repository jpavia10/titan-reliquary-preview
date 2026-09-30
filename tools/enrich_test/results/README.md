# Closed-book enrichment test, run 2026-09-30 (30 coins, no tools, one run each)

| | Opus 5.5 | Sonnet 5.5 |
|---|---|---|
| KM# correct | 22 of 30 | 8 of 30 |
| KM# confidently wrong | 4 (all off-by-one near misses: C028, C056, C159, C212) | 2 (C001, C031) |
| KM# declined | 4 | 20 |
| Mintage vs ledger | 1 correct of 13, 0 wrong | 0 of 13, all declined |
| Mint mark | 3 of 4 correct | 2 of 4 correct |
| Stated "high" confidence | 3 of 3 correct | never used |

Where both models answered with the same KM#, all 8 were correct (C005, C006, C011, C013, C032, C088, C160, C223).
Caveats: one run, 30 coins, the ledger is itself AI-researched (a disagreement is a record to verify, not proof of error), no web access.
Rerun: `python3 tools/enrich_test/score.py tools/enrich_test/results/<file>.json --detail`
