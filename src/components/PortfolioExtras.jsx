// My Portfolios — the extras: summary, performance vs the S&P 500, allocation, sales/dividends/cash forms, closed positions
import React, { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { APPS_SCRIPT_URL, jsonp } from '../lib/api'
import { fmtPrice, fmtPct, fmtMoney } from '../lib/utils'
import { compareToSP, periodStart, allocation, lotsOf, realizedOf, dividendsOf, yearEnd } from '../lib/portfolioMath'

const today = () => new Date().toISOString().slice(0, 10)
export const moneyExact = v => v == null ? '—' : (v >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US')
const usd = v => v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US')
const pnlColor = v => v == null ? '#64748b' : v >= 0 ? '#00ff88' : '#ff4466'
const label = 'block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5'
const input = 'w-full bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40'

// ── Price history (one request per 12 stocks, kept for this visit) ──
const HIST = {}
export async function fetchHistory(tickers, from, send = jsonp) {
  const want = [...new Set(tickers)], out = {}, need = []
  want.forEach(t => { const h = HIST[t]; if (h && h.from <= from) out[t] = h; else need.push(t) })
  const missing = []
  for (let i = 0; i < need.length; i += 12) {
    const chunk = need.slice(i, i + 12)
    const r = await send(`${APPS_SCRIPT_URL}?action=getHistory&tickers=${encodeURIComponent(chunk.join(','))}&from=${from}`, { timeout: 45000, retryTimeout: 60000 })
    if (!r || r.error) throw new Error((r && r.error) || 'Price history unavailable')
    Object.entries(r.series || {}).forEach(([t, s]) => { HIST[t] = s; out[t] = s })
    missing.push(...(r.missing || []))
  }
  return { hist: out, missing }
}
export function resetHistoryCache() { Object.keys(HIST).forEach(k => delete HIST[k]) }

// ── Summary cards ──
export function PortfolioSummary({ rows, positions, cash, onEditCash }) {
  const open = rows.filter(r => r.value != null)
  const stocks = open.reduce((a, r) => a + r.value, 0), cost = open.reduce((a, r) => a + r.cost, 0)
  const fxOf = t => (rows.find(r => r.ticker === t) || {}).fx ?? 1
  const realized = positions.reduce((a, p) => a + realizedOf(p) * fxOf(p.ticker), 0)
  const divs = positions.reduce((a, p) => a + dividendsOf(p) * fxOf(p.ticker), 0)
  const Card = ({ title, children, testid }) => (
    <div className="panel px-4 py-3 min-w-[170px] flex-1" data-testid={testid}>
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1">{title}</div>
      {children}
    </div>
  )
  return (
    <div className="flex gap-3 flex-wrap">
      <Card title="Total value" testid="sum-total">
        <div className="font-mono text-[18px] text-slate-100 font-semibold">{usd(stocks + (cash || 0))}</div>
        <div className="font-mono text-[11px] text-slate-500">stocks {usd(stocks)} · cash <button onClick={onEditCash} className="text-electric-400 hover:text-electric-300" title="Set the cash in this portfolio">{usd(cash || 0)} ✎</button></div>
      </Card>
      <Card title="Open profit" testid="sum-open">
        <div className="font-mono text-[18px] font-semibold" style={{ color: pnlColor(stocks - cost) }}>{moneyExact(stocks - cost)}</div>
        <div className="font-mono text-[11px] text-slate-500">{cost > 0 ? fmtPct((stocks - cost) / cost * 100) : '—'} on what you still hold</div>
      </Card>
      <Card title="Taken out" testid="sum-realized">
        <div className="font-mono text-[18px] font-semibold" style={{ color: pnlColor(realized + divs) }}>{moneyExact(realized + divs)}</div>
        <div className="font-mono text-[11px] text-slate-500">sales {moneyExact(realized)} · dividends {moneyExact(divs)}</div>
      </Card>
    </div>
  )
}

// ── Performance vs the S&P 500 (same money, same dates) ──
const PERIODS = [['1M', '1M'], ['YTD', 'YTD'], ['1Y', '1Y'], ['ALL', 'Since you bought']]
export function PerformancePanel({ positions, rows, isMobile }) {
  const [period, setPeriod] = useState('YTD')
  const [state, setState] = useState({ loading: true })
  const tickers = positions.map(p => p.ticker)
  // undated purchases count from the Dec 31 close, so that day is always fetched
  const earliest = positions.flatMap(p => lotsOf(p).map(l => l.buyDate || yearEnd(today()))).sort()[0]
  const start = periodStart(period)
  const from = [period === 'ALL' ? earliest : start, positions.some(p => lotsOf(p).some(l => !l.buyDate)) ? yearEnd(today()) : null].filter(Boolean).sort()[0] || today()
  const key = tickers.join(',') + '|' + from
  useEffect(() => {
    let alive = true
    setState(s => ({ ...s, loading: true, error: null }))
    fetchHistory([...tickers, 'SPY'], from).then(r => alive && setState({ loading: false, ...r })).catch(e => alive && setState({ loading: false, error: e.message }))
    return () => { alive = false }
  }, [key])
  const res = useMemo(() => {
    if (!state.hist) return null
    const fx = {}, prices = {}
    rows.forEach(r => { if (r.fx != null) fx[r.ticker] = r.fx; if (r.currentPrice != null) prices[r.ticker] = r.currentPrice })
    return compareToSP(positions, { hist: state.hist, fx, prices, start: period === 'ALL' ? null : start, today: today() })
  }, [state.hist, period, rows.map(r => r.currentPrice).join(','), positions])
  const ahead = res && res.invested > 0 ? res.diff >= 0 : null
  return (
    <div className="panel p-4" data-testid="perf-panel">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="font-display text-[14px] text-slate-200">Your picks vs the S&amp;P 500 <span className="text-[11px] text-slate-500">— same money, same days</span></div>
        <div className="flex gap-1.5">
          {PERIODS.map(([id, txt]) => (
            <button key={id} onClick={() => setPeriod(id)} aria-pressed={period === id}
              className={`text-[11px] font-mono px-2.5 py-1 rounded border ${period === id ? 'border-electric-400/60 bg-electric-500/15 text-slate-100' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>{txt}</button>
          ))}
        </div>
      </div>
      {state.loading && <div className="py-10 text-center font-mono text-[11px] text-slate-500 animate-pulse">Loading price history… (the first time can take ~15 seconds)</div>}
      {!state.loading && state.error && <div className="py-8 text-center font-mono text-[12px] text-terminal-amber">Price history unavailable right now — {state.error}</div>}
      {!state.loading && res && res.error && <div className="py-8 text-center font-mono text-[12px] text-terminal-amber">{res.error}</div>}
      {!state.loading && res && !res.error && !(res.invested > 0) && <div className="py-8 text-center font-mono text-[12px] text-slate-500">Nothing to compare in this period{res.excluded.length ? ' — see the note below' : ''}.</div>}
      {!state.loading && res && res.invested > 0 && (
        <>
          <div className={`grid gap-3 mb-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`} data-testid="perf-numbers">
            <div><div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Your picks</div>
              <div className="font-mono text-[16px] font-semibold" style={{ color: pnlColor(res.you) }}>{moneyExact(res.you)} <span className="text-[12px]">({fmtPct(res.youPct, 1)})</span></div></div>
            <div><div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Same money in the S&amp;P 500</div>
              <div className="font-mono text-[16px] font-semibold" style={{ color: pnlColor(res.sp) }}>{moneyExact(res.sp)} <span className="text-[12px]">({fmtPct(res.spPct, 1)})</span></div></div>
            <div><div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Difference</div>
              <div className="font-mono text-[16px] font-semibold" style={{ color: pnlColor(res.diff) }}>{ahead ? 'Ahead by ' : 'Behind by '}{usd(Math.abs(res.diff))}</div></div>
          </div>
          {res.series && res.series.length > 1 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={res.series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10, fontFamily: 'IBM Plex Mono' }} tickFormatter={d => d.slice(5)} minTickGap={40} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10, fontFamily: 'IBM Plex Mono' }} tickFormatter={v => (v < 0 ? '−$' : '$') + Math.abs(v) / 1000 + 'K'} width={60} />
                  <ReferenceLine y={0} stroke="rgba(148,163,184,0.25)" />
                  <Tooltip contentStyle={{ background: '#0b1428', border: '1px solid rgba(148,163,184,0.2)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                    formatter={(v, n) => [moneyExact(v), n === 'you' ? 'Your picks' : 'S&P 500']} />
                  <Line type="monotone" dataKey="you" stroke="#38bdf8" dot={false} strokeWidth={2} name="you" isAnimationActive={false} />
                  <Line type="monotone" dataKey="sp" stroke="#94a3b8" dot={false} strokeWidth={1.5} strokeDasharray="4 3" name="sp" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 text-[10px] font-mono text-slate-600 leading-relaxed" data-testid="perf-note">
            Profit in dollars, price change only (dividends are counted separately above). Each purchase is matched by buying the S&amp;P 500 with the same money on the same day; each sale sells the same share of it.
            {period !== 'ALL' && ' What you already held at the start of the period counts as bought on that day.'}
            {res.assumed.length > 0 && <span> No purchase date, so counted as bought at the Dec 31 close: {res.assumed.join(', ')}.</span>}
            {res.excluded.length > 0 && <span className="text-terminal-amber"> Left out: {res.excluded.map(x => `${x.ticker} (${x.why})`).join(', ')}.</span>}
            {state.missing && state.missing.length > 0 && <span className="text-terminal-amber"> No price history for {state.missing.join(', ')}.</span>}
          </div>
        </>
      )}
    </div>
  )
}

// ── Allocation ──
export function AllocationPanel({ rows, cash, sectors }) {
  const [view, setView] = useState('stocks')
  const a = allocation(rows.filter(r => r.value != null).map(r => ({ ticker: r.ticker, value: r.value, sector: sectors[r.ticker] })), cash || 0)
  if (!(a.total > 0)) return null
  const list = view === 'stocks' ? a.stocks : a.sectors
  const top = list.filter(x => !x.cash).slice(0, 10), rest = list.filter(x => !x.cash).slice(10), cashRow = list.find(x => x.cash)
  const items = [...top, ...(rest.length ? [{ name: `${rest.length} others`, value: rest.reduce((s, x) => s + x.value, 0), pct: rest.reduce((s, x) => s + x.pct, 0) }] : []), ...(cashRow ? [cashRow] : [])]
  const max = Math.max(...items.map(x => x.pct))
  return (
    <div className="panel p-4" data-testid="alloc-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-[14px] text-slate-200">Allocation</div>
        <div className="flex gap-1.5">
          {[['stocks', 'By stock'], ['sectors', 'By sector']].map(([id, txt]) => (
            <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
              className={`text-[11px] font-mono px-2.5 py-1 rounded border ${view === id ? 'border-electric-400/60 bg-electric-500/15 text-slate-100' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>{txt}</button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map(x => (
          <div key={x.name} className="flex items-center gap-3 font-mono text-[12px]">
            <span className={`w-28 flex-shrink-0 truncate ${x.cash ? 'text-slate-400' : 'text-slate-200'}`}>{x.name}</span>
            <div className="flex-1 h-2.5 rounded bg-white/[0.04]"><div className="h-2.5 rounded" style={{ width: (x.pct / max * 100) + '%', background: x.cash ? '#475569' : '#0ea5e9' }} /></div>
            <span className="w-12 text-right text-slate-300">{x.pct.toFixed(1)}%</span>
            <span className="w-20 text-right text-slate-500">{usd(x.value)}</span>
          </div>
        ))}
      </div>
      {a.warn && <div className="mt-3 text-[11px] font-mono text-terminal-amber" data-testid="alloc-warn">⚠ {a.warn}</div>}
    </div>
  )
}

// ── Forms ──
function Modal({ title, onClose, children, onSave, saveText = 'Save', error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-bright w-full max-w-sm mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-[16px] text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-4">{children}{error && <div className="text-[11px] font-mono text-terminal-red">{error}</div>}</div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded border border-white/10 text-[12px] font-mono text-slate-500 hover:text-slate-300">Cancel</button>
          <button onClick={onSave} className="flex-1 btn-primary px-4 py-2 rounded text-[12px] font-mono font-semibold uppercase tracking-wider">{saveText}</button>
        </div>
      </div>
    </div>
  )
}
const CashBox = ({ checked, onChange, text }) => (
  <label className="flex items-center gap-2 text-[12px] font-mono text-slate-400 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {text}
  </label>
)

export function SellModal({ position, price, cur, fx, onClose, onSave }) {
  const [qty, setQty] = useState(String(position.qty))
  const [px, setPx] = useState(price != null ? String(price) : '')
  const [date, setDate] = useState(today())
  const [toCash, setToCash] = useState(true)
  const [error, setError] = useState('')
  const q = Number(qty), p = Number(px)
  const profit = q > 0 && p > 0 ? q * (p - position.buyPrice) : null
  return (
    <Modal title={`Sell ${position.ticker}`} onClose={onClose} saveText="Record sale" error={error}
      onSave={() => { try { onSave({ qty: q, price: p, date, toCash }) } catch (e) { setError(e.message) } }}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={label}>Shares sold</label><input className={input} type="number" min="0" step="any" value={qty} onChange={e => { setQty(e.target.value); setError('') }} />
          <div className="text-[10px] font-mono text-slate-600 mt-1">You hold {position.qty}</div></div>
        <div><label className={label}>Sale price</label><input className={input} type="number" min="0" step="0.01" value={px} onChange={e => { setPx(e.target.value); setError('') }} />
          <div className="text-[10px] font-mono text-slate-600 mt-1">in {cur || 'USD'}</div></div>
      </div>
      <div><label className={label}>Sale date</label><input className={input} type="date" max={today()} value={date} onChange={e => { setDate(e.target.value); setError('') }} /></div>
      {profit != null && <div className="text-[12px] font-mono text-slate-400">Profit on this sale: <span style={{ color: pnlColor(profit) }}>{fmtMoney(profit, cur)}</span> <span className="text-slate-600">(vs your average buy {fmtMoney(position.buyPrice, cur)})</span></div>}
      <CashBox checked={toCash} onChange={setToCash} text={`Add the ${q > 0 && p > 0 ? usd(q * p * (fx ?? 1)) : 'money'} to this portfolio's cash`} />
    </Modal>
  )
}

export function DividendModal({ position, cur, fx, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [toCash, setToCash] = useState(true)
  const [error, setError] = useState('')
  return (
    <Modal title={`Dividend — ${position.ticker}`} onClose={onClose} saveText="Record dividend" error={error}
      onSave={() => { try { onSave({ amount: Number(amount), date, toCash }) } catch (e) { setError(e.message) } }}>
      <div><label className={label}>Total received</label><input autoFocus className={input} type="number" min="0" step="0.01" placeholder="25.40" value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
        <div className="text-[10px] font-mono text-slate-600 mt-1">The total for all your shares, in {cur || 'USD'}</div></div>
      <div><label className={label}>Date paid</label><input className={input} type="date" max={today()} value={date} onChange={e => { setDate(e.target.value); setError('') }} /></div>
      <CashBox checked={toCash} onChange={setToCash} text="Add it to this portfolio's cash" />
    </Modal>
  )
}

export function CashModal({ cash, onClose, onSave }) {
  const [v, setV] = useState(cash != null ? String(cash) : '0')
  const [error, setError] = useState('')
  return (
    <Modal title="Cash in this portfolio" onClose={onClose} error={error}
      onSave={() => { const n = Number(v); if (!isFinite(n) || n < 0) return setError('Enter an amount (0 or more)'); onSave(n) }}>
      <div><label className={label}>Available cash (USD)</label><input autoFocus className={input} type="number" min="0" step="0.01" value={v} onChange={e => { setV(e.target.value); setError('') }} />
        <div className="text-[10px] font-mono text-slate-600 mt-1">Money in the account that is not invested. Sales and dividends can add to it automatically.</div></div>
    </Modal>
  )
}

// ── Closed positions (fully sold) ──
export function ClosedPositions({ positions, fxOf, onRemove }) {
  const [open, setOpen] = useState(false)
  if (!positions.length) return null
  const total = positions.reduce((a, p) => a + (realizedOf(p) + dividendsOf(p)) * fxOf(p.ticker), 0)
  return (
    <div className="panel p-4" data-testid="closed-panel">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between font-mono text-[12px] text-slate-400">
        <span>Sold positions ({positions.length}) · <span style={{ color: pnlColor(total) }}>{moneyExact(total)}</span> profit taken</span>
        <span className="text-slate-600">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-1.5">
          {positions.map(p => {
            const sales = p.sales || [], last = sales[sales.length - 1], r = realizedOf(p) * fxOf(p.ticker), d = dividendsOf(p) * fxOf(p.ticker)
            return (
              <div key={p.ticker} className="flex items-center gap-3 font-mono text-[12px]">
                <span className="w-16 text-sky-300 font-semibold">{p.ticker}</span>
                <span className="flex-1 text-slate-500">sold {sales.reduce((a, s) => a + s.qty, 0)} shares{last ? ', last on ' + last.date : ''}</span>
                <span style={{ color: pnlColor(r) }}>{moneyExact(r)}</span>
                {d > 0 && <span className="text-slate-500">+ div {usd(d)}</span>}
                <button onClick={() => onRemove(p.ticker)} title="Remove from the list (its profit is no longer counted)" className="text-slate-600 hover:text-terminal-red"><X size={12} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
