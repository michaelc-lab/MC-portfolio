// My Portfolios — the money math, kept apart from the screen so it can be tested on its own.
// Method: AVERAGE COST (as most brokers show it). A sale takes the same fraction out of every purchase (lot),
// so the average buy price of what is left does not change; the profit of the sale is (sale price − average cost).
// Every lot keeps `orig` (the quantity originally bought) so the S&P 500 comparison can replay what really happened.

export const lotsOf = p => (p.lots && p.lots.length ? p.lots : [{ qty: p.qty, buyPrice: p.buyPrice, buyDate: p.buyDate || '' }])
  .map(l => ({ ...l, orig: l.orig != null ? l.orig : l.qty }))

const round = (v, n = 8) => Math.round(v * 10 ** n) / 10 ** n

// Record a sale. Returns the updated position, or throws with a plain-English reason.
export function recordSale(p, { qty, price, date }) {
  qty = Number(qty); price = Number(price)
  const held = Number(p.qty) || 0
  if (!(qty > 0)) throw new Error('Enter how many shares you sold')
  if (qty > held + 1e-9) throw new Error(`You hold only ${held} shares`)
  if (!(price > 0)) throw new Error('Enter the sale price')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Enter the sale date')
  const f = Math.min(1, qty / held), left = qty >= held - 1e-9 ? 0 : round(held - qty)
  const lots = lotsOf(p).map(l => ({ ...l, qty: left === 0 ? 0 : round(l.qty * (1 - f)) }))
  const sale = { date, qty, price, cost: Number(p.buyPrice), heldBefore: held }
  const dates = lots.map(l => l.buyDate).filter(Boolean).sort()
  return { ...p, qty: left, lots, buyDate: p.buyDate || (dates.length === lots.length ? dates[0] : ''), sales: [...(p.sales || []), sale] }
}

export function recordDividend(p, { amount, date }) {
  amount = Number(amount)
  if (!(amount > 0)) throw new Error('Enter the dividend amount')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Enter the date it was paid')
  return { ...p, divs: [...(p.divs || []), { date, amount }] }
}

// in the stock's own currency
export const realizedOf = p => (p.sales || []).reduce((a, s) => a + s.qty * (s.price - s.cost), 0)
export const proceedsOf = p => (p.sales || []).reduce((a, s) => a + s.qty * s.price, 0)
export const dividendsOf = p => (p.divs || []).reduce((a, d) => a + Number(d.amount || 0), 0)
export const isClosed = p => !(Number(p.qty) > 1e-9) && ((p.sales || []).length > 0)

// ── Price history helpers ─────────────────────────────────────
// series = { d: ['2026-01-02', …], c: [101.2, …] } (dates ascending). Price on a day = last close on or before it.
export function priceOn(series, date) {
  if (!series || !series.d || !series.d.length) return null
  const d = series.d
  if (date < d[0]) return null
  let lo = 0, hi = d.length - 1
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (d[mid] <= date) lo = mid; else hi = mid - 1 }
  return series.c[lo]
}
// the first trading day on or after a date (the start of a period)
export function firstOnOrAfter(series, date) {
  const i = series.d.findIndex(x => x >= date)
  return i < 0 ? null : series.d[i]
}

// period start for 1M / YTD / 1Y / ALL (ALL → null)
export function periodStart(period, today = new Date()) {
  const iso = d => d.toISOString().slice(0, 10)
  if (period === 'YTD') return `${today.getUTCFullYear() - 1}-12-31`
  if (period === '1M') { const d = new Date(today); d.setUTCMonth(d.getUTCMonth() - 1); return iso(d) }
  if (period === '1Y') { const d = new Date(today); d.setUTCFullYear(d.getUTCFullYear() - 1); return iso(d) }
  return null
}

// ── "Same money, same dates" — what your picks did vs the S&P 500 (SPY) ──────────────────────────────────────
// Every purchase also "buys" SPY with the same dollars on the same day; every sale "sells" the same fraction of
// that SPY. For a period (1M / YTD / 1Y) what you already held at the start counts as bought at the start price.
// Price change only — dividends are shown separately (yours as you record them; SPY's ~1.2% a year is not added).
// hist = { TICKER: series, SPY: series }, fx = { TICKER: USD per unit (today) }, prices = { TICKER: price now }.
export function compareToSP(positions, { hist, fx = {}, prices = {}, start = null, today }) {
  const spy = hist && hist.SPY
  const res = { invested: 0, you: 0, sp: 0, included: [], excluded: [], series: null }
  if (!spy || !spy.d.length) { res.error = 'S&P 500 prices unavailable'; return res }
  const spyNow = spy.c[spy.c.length - 1]
  const s0 = start ? firstOnOrAfter(spy, start) : null
  const events = []                      // for the chart: one entry per position
  for (const p of positions) {
    const t = p.ticker, series = hist[t], rate = fx[t] != null ? fx[t] : 1, now = prices[t] != null ? prices[t] : (series ? series.c[series.c.length - 1] : null)
    const lots = lotsOf(p)
    if (lots.some(l => !l.buyDate)) { res.excluded.push({ ticker: t, why: 'no purchase date' }); continue }
    const soldQty = (p.sales || []).reduce((a, x) => a + x.qty, 0)
    if (Math.abs(lots.reduce((a, l) => a + l.orig, 0) - soldQty - (Number(p.qty) || 0)) > 1e-6) { res.excluded.push({ ticker: t, why: 'edited after a sale — purchase history incomplete' }); continue }
    if (start && !series) { res.excluded.push({ ticker: t, why: 'no price history' }); continue }
    if (now == null) { res.excluded.push({ ticker: t, why: 'no current price' }); continue }
    const ev = [...lots.map(l => ({ date: l.buyDate, kind: 'buy', qty: l.orig, price: l.buyPrice })),
      ...(p.sales || []).map(s => ({ date: s.date, kind: 'sell', qty: s.qty, price: s.price }))]
      .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === 'buy' ? -1 : 1)
    let h = 0, sh = 0, invested = 0, procYou = 0, procSp = 0, started = !s0, bad = false
    const flows = []
    const begin = () => {                // what is held when the period starts counts as bought at the start price
      started = true
      if (h > 1e-9) {
        const px = priceOn(series, s0), spx = priceOn(spy, s0)
        if (px == null || spx == null) { bad = true; return }
        const amt = h * px * rate
        invested += amt; sh += amt / spx; flows.push({ date: s0, kind: 'start', qty: h, amt })
      }
    }
    for (const e of ev) {
      if (!started && e.date >= s0) begin()
      if (bad) break
      if (e.kind === 'buy') {
        h += e.qty
        if (started) {
          const spx = priceOn(spy, e.date)
          if (spx == null) { bad = true; break }
          const amt = e.qty * e.price * rate
          invested += amt; sh += amt / spx; flows.push({ date: e.date, kind: 'buy', qty: e.qty, amt })
        }
      } else {
        const f = h > 1e-9 ? Math.min(1, e.qty / h) : 0
        if (started) {
          const spx = priceOn(spy, e.date)
          if (spx == null) { bad = true; break }
          procYou += e.qty * e.price * rate; procSp += sh * f * spx; sh *= (1 - f)
          flows.push({ date: e.date, kind: 'sell', qty: e.qty, amt: e.qty * e.price * rate, f })
        }
        h -= e.qty
      }
    }
    if (!bad && !started) begin()
    if (bad) { res.excluded.push({ ticker: t, why: 'no price on a purchase/sale date' }); continue }
    if (invested <= 0) continue          // nothing held during this period
    const youEnd = Math.max(0, h) * now * rate + procYou, spEnd = sh * spyNow + procSp
    res.invested += invested; res.you += youEnd - invested; res.sp += spEnd - invested
    res.included.push(t)
    events.push({ t, rate, flows, series })
  }
  res.youPct = res.invested > 0 ? res.you / res.invested * 100 : null
  res.spPct = res.invested > 0 ? res.sp / res.invested * 100 : null
  res.diff = res.you - res.sp
  res.series = gainSeries(events, spy, s0, today)
  return res
}

// Daily "profit so far" lines for the chart: yours vs the same money in the S&P 500. Max ~260 points.
export function gainSeries(events, spy, s0, today) {
  if (!events.length) return []
  const firstFlow = events.reduce((m, e) => e.flows.length && e.flows[0].date < m ? e.flows[0].date : m, '9999')
  const days = spy.d.filter(d => d >= (s0 || firstFlow) && (!today || d <= today))
  if (!days.length) return []
  const step = Math.max(1, Math.ceil(days.length / 260))
  const pick = days.filter((d, i) => i % step === 0 || i === days.length - 1)
  return pick.map(day => {
    let you = 0, sp = 0, inv = 0
    for (const e of events) {
      let h = 0, sh = 0, procY = 0, procS = 0, invested = 0
      for (const fl of e.flows) {
        if (fl.date > day) break
        const spx = priceOn(spy, fl.date)
        if (fl.kind === 'start' || fl.kind === 'buy') { h += fl.qty; invested += fl.amt; sh += fl.amt / spx }
        else { procY += fl.amt; procS += sh * fl.f * spx; sh *= (1 - fl.f); h -= fl.qty }
      }
      if (invested <= 0) continue
      const px = priceOn(e.series, day)
      if (px == null) continue
      you += Math.max(0, h) * px * e.rate + procY - invested
      sp += sh * priceOn(spy, day) + procS - invested
      inv += invested
    }
    return { date: day, you: Math.round(you), sp: Math.round(sp), invested: Math.round(inv) }
  })
}

// ── Allocation ────────────────────────────────────────────────
// rows: [{ ticker, value (USD), sector }], cash (USD). Returns shares of the total, biggest first.
export function allocation(rows, cash = 0) {
  const items = rows.filter(r => r.value > 0)
  const total = items.reduce((a, r) => a + r.value, 0) + Math.max(0, cash || 0)
  if (!(total > 0)) return { total: 0, stocks: [], sectors: [], warn: null }
  const stocks = items.map(r => ({ name: r.ticker, value: r.value, pct: r.value / total * 100 })).sort((a, b) => b.value - a.value)
  const bySec = {}
  items.forEach(r => { const k = r.sector || 'Other'; bySec[k] = (bySec[k] || 0) + r.value })
  const sectors = Object.entries(bySec).map(([name, value]) => ({ name, value, pct: value / total * 100 })).sort((a, b) => b.value - a.value)
  if (cash > 0) { const c = { name: 'Cash', value: cash, pct: cash / total * 100, cash: true }; stocks.push(c); sectors.push({ ...c }) }
  const big = stocks.find(s => !s.cash && s.pct > 20)
  return { total, stocks, sectors, warn: big ? `${big.name} is ${big.pct.toFixed(0)}% of this portfolio — a big bet on one stock` : null }
}
