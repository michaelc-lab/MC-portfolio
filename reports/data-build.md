# Data build — 2026-11-05 17:26 UTC

| Step | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 8004 companies |
| SEC financials, all companies (years 2023–2025) | PASS | 8145 companies; 2025 values found — revenue 4391, cogs 2962, gross 2436, opIncome 4672, netIncome 5705, ocf 5793, capex 3573, interest 1090, assets 6198, equity 5801, debtLT 2718, debtST 1652, cash 4961, shares 5363 |
| Nasdaq stock list (price, market value, industry) | PASS | HTTP 200, 6952 stocks, with industry: 6300 |
| Companies with BOTH SEC financials and a live price | PASS | 6144 tickers |
| 1-year price history, S&P 500 + Nasdaq-100 | PASS | 508/519; missing: AMAT, BF.B, CSCO, EA, FDXF, HONA, KVUE, PANW, PM, VYLR, WBD |
| Data file written | PASS | data/fundamentals.json, 4.9 MB |

**6 of 6 steps passed.** Took 25 min.
