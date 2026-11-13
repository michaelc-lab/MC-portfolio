# Data build — 2026-11-13 03:24 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 8002 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8161 companies; 2025 values found — revenue 4712, cogs 2966, gross 2439, opIncome 4676, netIncome 5938, ocf 5799, capex 3578, interest 1092, assets 6216, equity 5820, debtLT 2740, debtST 1668, cash 4984, shares 5383 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 205 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7233 stocks, with industry: 6498 |
| Companies with BOTH SEC financials and a live price | PASS | 6341 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 28 min.
