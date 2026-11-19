# Data build — 2026-11-19 04:10 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 7993 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8184 companies; 2025 values found — revenue 4718, cogs 2969, gross 2442, opIncome 4683, netIncome 5949, ocf 5807, capex 3583, interest 1093, assets 6236, equity 5844, debtLT 2746, debtST 1673, cash 5010, shares 5396 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 205 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7291 stocks, with industry: 6522 |
| Companies with BOTH SEC financials and a live price | PASS | 6401 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 27 min.
