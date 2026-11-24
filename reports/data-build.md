# Data build — 2026-11-24 06:56 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 7992 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8188 companies; 2025 values found — revenue 4719, cogs 2970, gross 2443, opIncome 4685, netIncome 5951, ocf 5809, capex 3584, interest 1093, assets 6240, equity 5848, debtLT 2748, debtST 1673, cash 5012, shares 5400 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 204 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7300 stocks, with industry: 6528 |
| Companies with BOTH SEC financials and a live price | PASS | 6410 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 28 min.
