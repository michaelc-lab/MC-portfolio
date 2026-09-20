import React, { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Activity, Calendar } from 'lucide-react'
import { fmtPrice, fmtPct, fmtLarge } from '../lib/utils'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUQqqI6PAa64xq5ZALeJSUWuy86pVtSEG6rIMhgNOQ-7XS-t7PJRRncJ1mi7OAwd0/exec'

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout')) }, 20000)
    function cleanup() { clearTimeout(timeout); delete window[cbName]; if (script.parentNode) script.parentNode.removeChild(script) }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('Failed')) }
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}

// ── Market open/closed indicator ──────────────────────────────
function MarketStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    function compute() {
      // US Eastern time
      const now = new Date()
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const day = et.getDay() // 0=Sun,6=Sat
      const h = et.getHours()
      const m = et.getMinutes()
      const mins = h * 60 + m
      const isWeekday = day >= 1 && day <= 5
      const isMarketHours = mins >= 570 && mins < 960 // 9:30–16:00
      const isPreMarket = isWeekday && mins >= 240 && mins < 570   // 4:00–9:30
      const isAfterHours = isWeekday && mins >= 960 && mins < 1200 // 16:00–20:00

      if (isWeekday && isMarketHours) setStatus('open')
      else if (isPreMarket || isAfterHours) setStatus('extended')
      else setStatus('closed')
    }
    compute()
    const id = setInterval(compute, 60000)
    return () => clearInterval(id)
  }, [])

  const cfg = {
    open:     { color: 'bg-terminal-green', text: 'Market Open',    ring: 'shadow-terminal-green/40' },
    extended: { color: 'bg-terminal-amber', text: 'Extended Hours', ring: 'shadow-terminal-amber/40' },
    closed:   { color: 'bg-terminal-red',   text: 'Market Closed',  ring: 'shadow-terminal-red/40'   },
  }
  const c = cfg[status] || cfg.closed

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border border-white/10 bg-white/[0.03] text-[11px] font-mono`}>
      <span className={`w-2 h-2 rounded-full ${c.color} shadow-lg ${c.ring} animate-pulse-slow`} />
      <span className="text-slate-400 uppercase tracking-wider">{c.text}</span>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'accent', icon: Icon }) {
  const colorMap = {
    accent: 'text-electric-400',
    green:  'text-terminal-green',
    red:    'text-terminal-red',
    amber:  'text-terminal-amber',
  }
  return (
    <div className="panel p-5 relative overflow-hidden group hover:border-electric-500/25 transition-all">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/30 to-transparent" />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{label}</span>
        {Icon && <Icon size={14} className="text-slate-600" />}
      </div>
      <div className={`font-display font-bold text-4xl leading-none ${colorMap[color]} drop-shadow-lg`}>{value}</div>
      {sub && <div className="mt-2 text-[11px] font-mono text-slate-600">{sub}</div>}
    </div>
  )
}

// ── Indexes row ───────────────────────────────────────────────
function IndexesRow({ indexes }) {
  const items = [
    { key: 'SPY',  label: 'S&P 500 (SPY)'  },
    { key: 'QQQ',  label: 'Nasdaq (QQQ)'   },
    { key: 'SOXX', label: 'Semis (SOXX)'   },
    { key: 'VIX',  label: 'VIX'            },
  ]
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-electric-400" />
        <span className="font-display font-semibold text-[13px] text-slate-200">Market Indexes</span>
        <MarketStatus />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.map(({ key, label }) => {
          const price  = indexes?.[key]
          const change = indexes?.[key + '_change']
          const isPos  = change > 0
          const isNeg  = change < 0
          return (
            <div key={key} className="bg-navy-800/40 border border-white/8 rounded-lg p-3 hover:border-electric-500/20 transition-colors">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-1">{label}</div>
              <div className="font-mono font-bold text-[16px] text-slate-100">
                {price != null ? fmtPrice(price) : '—'}
              </div>
              {change != null && (
                <div className={`font-mono text-[11px] mt-0.5 ${isPos ? 'positive' : isNeg ? 'negative' : 'neutral'}`}>
                  {fmtPct(change)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Mover tables ──────────────────────────────────────────────
function MoverRow({ r, useWeek }) {
  const chg = useWeek ? r.weekChangePct : r.dayChangePct
  return (
    <tr>
      <td className="py-2.5 px-3"><span className="font-mono font-semibold text-[13px] text-electric-300">{r.ticker}</span></td>
      <td className="py-2.5 px-3"><span className="text-[12px] text-slate-400">{r.company}</span></td>
      <td className="py-2.5 px-3 text-right"><span className="font-mono text-[12px] text-slate-300">{fmtPrice(r.price)}</span></td>
      <td className="py-2.5 px-3 text-right">
        <span className={`font-mono text-[12px] font-semibold ${chg > 0 ? 'positive' : 'negative'}`}>{fmtPct(chg)}</span>
      </td>
    </tr>
  )
}

function MoverTable({ title, rows, meta, useWeek = false, type = 'gain' }) {
  const Icon = type === 'gain' ? TrendingUp : TrendingDown
  const iconColor = type === 'gain' ? 'text-terminal-green' : 'text-terminal-red'
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Icon size={14} className={iconColor} />
          <span className="font-display font-semibold text-[13px] text-slate-200">{title}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">{meta}</span>
      </div>
      <table className="data-table">
        <thead><tr><th>Ticker</th><th>Company</th><th className="text-right">Price</th><th className="text-right">{useWeek ? 'Δ 7d' : 'Δ Today'}</th></tr></thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={4} className="text-center py-6 text-slate-600 font-mono text-[11px]">No data</td></tr>
            : rows.map(r => <MoverRow key={r.ticker} r={r} useWeek={useWeek} />)
          }
        </tbody>
      </table>
    </div>
  )
}

// ── ATH table ─────────────────────────────────────────────────
function ATHTable({ rows }) {
  if (!rows.length) return (
    <div className="panel p-8 text-center font-mono text-[11px] text-slate-600 uppercase tracking-wider">No tickers at ATH</div>
  )
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Zap size={14} className="text-electric-400" />
        <span className="font-display font-semibold text-[13px] text-slate-200">At All-Time High</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-600">within 0.5%</span>
      </div>
      <table className="data-table">
        <thead><tr><th>Ticker</th><th>Company</th><th>Sector</th><th className="text-right">Price</th><th className="text-right">Δ Today</th><th className="text-right">Δ 7d</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.ticker}>
              <td><span className="font-mono font-semibold text-[13px] text-electric-300">{r.ticker}</span></td>
              <td><span className="text-[12px] text-slate-400">{r.company}</span></td>
              <td><span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">{r.sector}</span></td>
              <td className="text-right"><span className="font-mono text-[12px] font-semibold text-slate-200">{fmtPrice(r.price)}</span></td>
              <td className="text-right"><span className={`font-mono text-[12px] ${r.dayChangePct > 0 ? 'positive' : r.dayChangePct < 0 ? 'negative' : 'neutral'}`}>{r.dayChangePct != null ? fmtPct(r.dayChangePct) : '—'}</span></td>
              <td className="text-right"><span className={`font-mono text-[12px] ${r.weekChangePct > 0 ? 'positive' : r.weekChangePct < 0 ? 'negative' : 'neutral'}`}>{r.weekChangePct != null ? fmtPct(r.weekChangePct) : '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Upcoming Earnings (30 days) ───────────────────────────────
function UpcomingEarnings() {
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    jsonp(`${APPS_SCRIPT_URL}?action=getUpcomingEarnings`)
      .then(data => { setEarnings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setEarnings([]); setLoading(false) })
  }, [])

  const formatDate = (d) => {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const daysUntil = (d) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
    return diff
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Calendar size={14} className="text-terminal-amber" />
        <span className="font-display font-semibold text-[13px] text-slate-200">Upcoming Earnings</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-600">Next 30 days · My portfolio</span>
      </div>
      {loading ? (
        <div className="p-6 text-center font-mono text-[11px] text-slate-600 uppercase tracking-wider animate-pulse">Loading…</div>
      ) : !earnings?.length ? (
        <div className="p-6 text-center font-mono text-[11px] text-slate-600 uppercase tracking-wider">No earnings scheduled in the next 30 days</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Date</th>
              <th>In</th>
              <th>Time</th>
              <th className="text-right">EPS Est.</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((e, i) => {
              const days = daysUntil(e.date)
              return (
                <tr key={i}>
                  <td><span className="font-mono font-semibold text-[13px] text-electric-300">{e.ticker}</span></td>
                  <td><span className="font-mono text-[12px] text-slate-300">{formatDate(e.date)}</span></td>
                  <td>
                    <span className={`font-mono text-[11px] ${days <= 3 ? 'text-terminal-amber' : 'text-slate-500'}`}>
                      {days != null ? `${days}d` : '—'}
                    </span>
                  </td>
                  <td>
                    {e.hour && (
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${e.hour === 'bmo' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-purple-500/30 text-purple-400 bg-purple-500/10'}`}>
                        {e.hour === 'bmo' ? 'BMO' : 'AMC'}
                      </span>
                    )}
                  </td>
                  <td className="text-right"><span className="font-mono text-[12px] text-slate-400">{e.estimate != null ? '$' + e.estimate.toFixed(2) : '—'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function LeadTab({ portfolio, indexes }) {
  const withDay    = portfolio.filter(r => r.dayChangePct != null)
  const withWeek   = portfolio.filter(r => r.weekChangePct != null)
  const atATH      = portfolio.filter(r => r.atATH)
  const deepDisc   = portfolio.filter(r => r.dd != null && r.dd <= -50)

  const sortedDay  = [...withDay].sort((a, b) => b.dayChangePct - a.dayChangePct)
  const sortedWeek = [...withWeek].sort((a, b) => b.weekChangePct - a.weekChangePct)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Holdings"      value={portfolio.length} sub={`${portfolio.filter(r => r.price != null).length} priced`} color="accent" icon={Activity} />
        <KpiCard label="At ATH"        value={atATH.length}     sub="within 0.5% of high" color="green" icon={Zap} />
        <KpiCard label="Deep Discount" value={deepDisc.length}  sub=">50% off ATH"        color="red"   icon={AlertTriangle} />
      </div>

      {/* Indexes */}
      <IndexesRow indexes={indexes} />

      {/* Daily movers */}
      <div className="grid grid-cols-2 gap-4">
        <MoverTable title="Top 5 Gainers Today"  rows={sortedDay.slice(0, 5)}          meta="Portfolio · 1D"     type="gain" />
        <MoverTable title="Top 5 Losers Today"   rows={sortedDay.slice(-5).reverse()}   meta="Portfolio · 1D"     type="loss" />
      </div>

      {/* Weekly movers */}
      <div className="grid grid-cols-2 gap-4">
        <MoverTable title="Top 5 Winners (7d)"   rows={sortedWeek.slice(0, 5)}         meta="Portfolio · Weekly" type="gain" useWeek />
        <MoverTable title="Top 5 Losers (7d)"    rows={sortedWeek.slice(-5).reverse()}  meta="Portfolio · Weekly" type="loss" useWeek />
      </div>

      {/* Upcoming earnings */}
      <UpcomingEarnings />

      {/* ATH */}
      <ATHTable rows={atATH} />
    </div>
  )
}
