# Data build — 2026-11-25 05:25 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 7988 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8189 companies; 2025 values found — revenue 4720, cogs 2971, gross 2444, opIncome 4686, netIncome 5953, ocf 5812, capex 3585, interest 1094, assets 6241, equity 5849, debtLT 2748, debtST 1673, cash 5012, shares 5400 |
| Gaps filled from full company records (S&P 500 + Nasdaq-100) | PASS | 204 companies had gaps, 112 numbers filled; still missing revenue/profit/assets: APA, ASML, CCEP, DTE, FER, FITB, GS, HONA, MS, RF, SKYD, SYF, TFC, TRI, VMRK, VYLR, WFC, XEL, XOM |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 7343 stocks, with industry: 6557 |
| Companies with BOTH SEC financials and a live price | PASS | 6440 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 512/519; missing: BF-B, EA, FDXF, HONA, KVUE, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**7 of 7 steps passed.** Took 27 min.
