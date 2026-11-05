# Price source check — 2026-11-05 17:14 UTC

Measured live from GitHub's servers. Needed: 15+ years of daily prices for today's stocks AND for stocks that stopped trading (so a history test is not flattered by only counting survivors).

**Yahoo Finance (no key)**

| Check | Result | Detail |
|---|---|---|
| Yahoo Finance (no key): history depth (AAPL) | FAIL | HTTP 429; no data |
| Yahoo Finance (no key): 20 current stocks | FAIL | 0/20 returned; missing: AAPL, MSFT, NVDA, JPM, XOM, KO, BRK-B, COST, LLY, TSLA, PLTR, SOFI, RIVN, CROX, ETSY, MARA, AMC, PLUG, RKLB, IONQ; not up to date: none; HTTP codes seen: [429] |
| Yahoo Finance (no key): stocks that no longer trade | FAIL | 0/6 — Twitter (taken private 2022): no; Activision (acquired 2023): no; First Republic (failed 2023): no; SVB Financial (failed 2023): no; Celgene (acquired 2019): no; Xilinx (acquired 2022): no |

**Nasdaq.com (no key)**

| Check | Result | Detail |
|---|---|---|
| Nasdaq.com (no key): history depth (AAPL) | FAIL | HTTP 200; 2016-11-04 → 2026-11-04, 2513 days, ~10 years, split/dividend-adjusted series: no |
| Nasdaq.com (no key): 20 current stocks | PASS | 20/20 returned; missing: none; not up to date: none; HTTP codes seen: [200] |
| Nasdaq.com (no key): stocks that no longer trade | FAIL | 0/6 — Twitter (taken private 2022): no; Activision (acquired 2023): no; First Republic (failed 2023): no; SVB Financial (failed 2023): no; Celgene (acquired 2019): no; Xilinx (acquired 2022): no |

**Tiingo (free account key)**

| Check | Result | Detail |
|---|---|---|
| Tiingo (free account key): history depth (AAPL) | PASS | HTTP 200; 2005-01-03 → 2026-11-04, 5495 days, ~22 years, split/dividend-adjusted series: yes |
| Tiingo (free account key): 20 current stocks | PASS | 20/20 returned; missing: none; not up to date: none; HTTP codes seen: [200] |
| Tiingo (free account key): stocks that no longer trade | FAIL | 2/6 — Twitter (taken private 2022): yes, to 2022-10-28; Activision (acquired 2023): yes, to 2023-10-13; First Republic (failed 2023): no; SVB Financial (failed 2023): no; Celgene (acquired 2019): no; Xilinx (acquired 2022): no |

**3 of 9 checks passed.** Finished 17:17 UTC.
