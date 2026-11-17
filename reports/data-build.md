# Data build — 2026-11-17 05:04 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 7997 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8181 companies; 2025 values found — revenue 4714, cogs 2968, gross 2441, opIncome 4679, netIncome 5942, ocf 5802, capex 3579, interest 1092, assets 6234, equity 5842, debtLT 2746, debtST 1671, cash 5007, shares 5394 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 205 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7264 stocks, with industry: 6512 |
| Companies with BOTH SEC financials and a live price | PASS | 6382 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 26 min.
