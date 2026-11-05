# Data source check — 2026-11-05 16:10 UTC

Measured live from GitHub's servers. PASS = usable for the design as planned.

| Check | Result | Detail |
|---|---|---|
| SEC ticker list | PASS | HTTP 200, 10409 tickers mapped to SEC company IDs |
| Sample of 50 (large + small caps) found at SEC | PASS | 50/50 found; missing: none |
| Company financials (SEC XBRL) | PASS | 50/50 companies returned; field coverage: GrossProfit 33/50, Revenue 50/50, NetIncome 50/50, OperatingCashFlow 50/50, Assets 50/50, Equity 50/50, Debt 47/50, Cash 50/50, SharesOutstanding 49/50 |
| History depth (years of net income) | PASS | median 17 years, min 1, max 19 |
| Filing dates present (needed to avoid look-ahead) | PASS | 49/50 companies have a filing date on every fact |
| All-company snapshot in one call (XBRL frames) | PASS | HTTP 200, 6279 companies, 0.4s |
| 8-K item codes in filing history | PASS | Apple: 101 8-Ks in the recent list, item codes on ≥90%: True, oldest 2015-10-27 |
| Historical filing index (2012) | PASS | HTTP 200, 19348 8-K filings listed for Q1 2012 |

**Live filing feed — watched for 15 minutes, polled every 60 s**

| Check | Result | Detail |
|---|---|---|
| Live filings latency (alerts) | PASS | 15/15 polls OK; 41 new filings seen; time from SEC acceptance to our poll: median 49s, 90% within 73s, max 83s |

| Check | Result | Detail |
|---|---|---|
| Daily price history (Stooq) | FAIL | HTTP 200, 3 days for AAPL since (async()=>{const c="AAAAAGrsrgeZNT5OFLJVkyGjilz-vvrAFHbnuhCR2TTEsN1wUg_DM0xVGNY" |
| Prices for delisted stocks (avoids survivorship bias) | FAIL | Twitter (taken private 2022): no; Activision (acquired 2023): no; First Republic (failed 2023): no |
| Press releases: GlobeNewswire | FAIL | HTTP 403  |
| Press releases: PR Newswire | PASS | HTTP 200 newest item 1 min old, 21 items |
| Press releases: Business Wire | PASS | HTTP 200 newest item 83 min old, 32 items |
| Press releases: Accesswire | FAIL | HTTP 404  |
| Telegram (phone alerts) reachable | PASS | HTTP 200 |
| Finnhub free tier | SKIPPED | add a FINNHUB_KEY repository secret to test it |

**12 of 16 checks passed.** Finished 16:25 UTC.
