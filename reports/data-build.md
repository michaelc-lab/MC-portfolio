# Data build — 2026-11-07 02:47 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 8004 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8150 companies; 2025 values found — revenue 4708, cogs 2964, gross 2438, opIncome 4674, netIncome 5932, ocf 5795, capex 3574, interest 1091, assets 6205, equity 5809, debtLT 2724, debtST 1660, cash 4968, shares 5371 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 205 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7062 stocks, with industry: 6381 |
| Companies with BOTH SEC financials and a live price | PASS | 6208 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 28 min.
