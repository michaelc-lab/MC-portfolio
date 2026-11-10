# Data build — 2026-11-10 04:37 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 8009 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8155 companies; 2025 values found — revenue 4710, cogs 2966, gross 2439, opIncome 4675, netIncome 5935, ocf 5797, capex 3576, interest 1091, assets 6210, equity 5814, debtLT 2730, debtST 1666, cash 4974, shares 5376 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 205 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7127 stocks, with industry: 6427 |
| Companies with BOTH SEC financials and a live price | PASS | 6258 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 29 min.
