# Data build — 2026-11-20 03:58 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 7993 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8186 companies; 2025 values found — revenue 4719, cogs 2970, gross 2443, opIncome 4684, netIncome 5950, ocf 5809, capex 3584, interest 1093, assets 6239, equity 5847, debtLT 2747, debtST 1673, cash 5011, shares 5398 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 204 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7298 stocks, with industry: 6529 |
| Companies with BOTH SEC financials and a live price | PASS | 6405 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 5.0 MB |

**7 of 7 steps passed.** Took 27 min.
