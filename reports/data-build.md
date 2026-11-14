# Data build — 2026-11-14 03:12 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 7997 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8173 companies; 2025 values found — revenue 4712, cogs 2967, gross 2440, opIncome 4678, netIncome 5940, ocf 5800, capex 3578, interest 1092, assets 6227, equity 5833, debtLT 2743, debtST 1670, cash 4998, shares 5387 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 205 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7252 stocks, with industry: 6508 |
| Companies with BOTH SEC financials and a live price | PASS | 6363 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 27 min.
