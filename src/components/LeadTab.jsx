import React, { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Activity, Calendar, Sparkles } from 'lucide-react'
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
function KpiCard({ label, value, sub, color = 'accent', icon: Icon, onClick, clickable, isMobile }) {
  const colorMap = {
    accent: 'text-electric-400',
    green:  'text-terminal-green',
    red:    'text-terminal-red',
    amber:  'text-terminal-amber',
  }
  return (
    <div
      onClick={onClick}
      className={`panel relative overflow-hidden transition-all ${isMobile ? 'p-3' : 'p-5'} ${clickable ? 'cursor-pointer hover:border-electric-500/40 hover:bg-electric-500/[0.04]' : 'hover:border-electric-500/25'}`}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/30 to-transparent" />
      <div className={`flex items-start justify-between ${isMobile ? 'mb-1.5' : 'mb-3'}`}>
        <span className={`font-mono uppercase tracking-[0.15em] text-slate-500 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
        <div className="flex items-center gap-1">
          {clickable && !isMobile && <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">click to view</span>}
          {clickable && isMobile && <span className="text-[8px] font-mono text-slate-600">tap</span>}
          {Icon && <Icon size={isMobile ? 11 : 14} className="text-slate-600" />}
        </div>
      </div>
      <div className={`font-display font-bold leading-none ${colorMap[color]} drop-shadow-lg ${isMobile ? 'text-3xl' : 'text-4xl'}`}>{value}</div>
      {sub && <div className={`font-mono text-slate-600 mt-1 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>{sub}</div>}
    </div>
  )
}

// ── Expandable stock list modal ───────────────────────────────
function StockListModal({ title, rows, color, onClose, onAnalyze }) {
  const colorMap = { green: '#00ff88', red: '#ff4466', amber: '#ffb800' }
  const clr = colorMap[color] || '#38bdf8'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="panel-bright w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span style={{color: clr}} className="font-display font-bold text-[16px]">{rows.length}</span>
            <span className="font-display font-semibold text-[15px] text-slate-200">{title}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            ✕ Close
          </button>
        </div>
        {/* List */}
        <div className="overflow-auto flex-1">
          {rows.length === 0 ? (
            <div className="p-10 text-center font-mono text-[12px] text-slate-600 uppercase tracking-wider">None</div>
          ) : (
            <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
              <colgroup>
                <col style={{width:'90px'}} />
                <col style={{width:'180px'}} />
                <col style={{width:'120px'}} />
                <col style={{width:'100px'}} />
                <col style={{width:'100px'}} />
                <col style={{width:'100px'}} />
                <col style={{width:'110px'}} />
              </colgroup>
              <thead>
                <tr>
                  {['Ticker','Company','Sector','Price','Δ ATH','Δ Today','Δ 7d'].map((h,i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'right',
                      padding:'10px 14px',
                      fontFamily:'IBM Plex Mono,monospace',
                      fontSize:'10px',
                      letterSpacing:'0.15em',
                      textTransform:'uppercase',
                      color:'#334155',
                      borderBottom:'1px solid rgba(14,165,233,0.08)',
                      background:'#0a1628',
                      whiteSpace:'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.ticker} className="group"
                    onClick={() => { if (onAnalyze) { onAnalyze(r.ticker); onClose() } }}
                    style={{cursor: onAnalyze ? 'pointer' : 'default'}}
                  >
                    {[
                      <span style={{fontWeight:'700',fontSize:'13px',color:'#7dd3fc'}}>{r.ticker}</span>,
                      <span style={{color:'#94a3b8',fontSize:'12px'}}>{r.company}</span>,
                      <span style={{fontFamily:'IBM Plex Mono',fontSize:'10px',textTransform:'uppercase',color:'#64748b',background:'rgba(255,255,255,0.05)',padding:'2px 6px',borderRadius:'4px'}}>{r.sector}</span>,
                      <span style={{color:'#e2e8f0',fontWeight:'600'}}>{r.price ? '$'+r.price.toFixed(2) : '—'}</span>,
                      <span style={{color: r.dd >= -0.5 ? '#00ff88' : r.dd >= -20 ? '#38bdf8' : r.dd >= -50 ? '#eab308' : '#ff4466', fontWeight:'600'}}>
                        {r.dd != null ? (r.dd > 0 ? '+' : '') + r.dd.toFixed(1) + '%' : '—'}
                      </span>,
                      <span style={{color: r.dayChangePct > 0 ? '#00ff88' : r.dayChangePct < 0 ? '#ff4466' : '#64748b'}}>
                        {r.dayChangePct != null ? (r.dayChangePct > 0 ? '+' : '') + r.dayChangePct.toFixed(2) + '%' : '—'}
                      </span>,
                      <span style={{color: r.weekChangePct > 0 ? '#00ff88' : r.weekChangePct < 0 ? '#ff4466' : '#64748b'}}>
                        {r.weekChangePct != null ? (r.weekChangePct > 0 ? '+' : '') + r.weekChangePct.toFixed(2) + '%' : '—'}
                      </span>,
                    ].map((cell, i) => (
                      <td key={i} style={{
                        padding:'11px 14px',
                        borderBottom:'1px solid rgba(14,165,233,0.04)',
                        fontFamily:'IBM Plex Mono,monospace',
                        fontSize:'12px',
                        textAlign: i === 0 ? 'left' : 'right',
                        overflow:'hidden',
                      }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {onAnalyze && rows.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 flex-shrink-0">
            <span className="font-mono text-[10px] text-slate-600 uppercase tracking-wider">Click any row to analyze in Workstation</span>
          </div>
        )}
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


// ── Sector Pulse ──────────────────────────────────────────────
function SectorPulse({ portfolio, isMobile }) {
  // Group by sector, compute average daily change per sector
  const sectorMap = {}
  portfolio.forEach(r => {
    if (!r.sector || r.dayChangePct == null) return
    if (!sectorMap[r.sector]) sectorMap[r.sector] = { sum: 0, count: 0 }
    sectorMap[r.sector].sum += r.dayChangePct
    sectorMap[r.sector].count += 1
  })

  const sectors = Object.entries(sectorMap)
    .map(([name, { sum, count }]) => ({ name, avg: sum / count }))
    .sort((a, b) => b.avg - a.avg)

  const best  = sectors[0]
  const worst = sectors[sectors.length - 1]

  return (
    <div className={`panel relative overflow-hidden group hover:border-electric-500/25 transition-all ${isMobile ? 'p-3' : 'p-5'}`}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/30 to-transparent" />
      <div className={`flex items-start justify-between ${isMobile ? 'mb-1.5' : 'mb-3'}`}>
        <span className={`font-mono uppercase tracking-[0.15em] text-slate-500 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>Sector Pulse</span>
        <TrendingUp size={14} className="text-slate-600" />
      </div>
      {best && (
        <div className="space-y-2">
          {/* Best sector */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-600 mb-0.5">Leading</div>
              <div className={`font-display font-bold text-white leading-tight ${isMobile ? 'text-[13px]' : 'text-[15px]'}`}>{best.name}</div>
            </div>
            <div className="font-mono font-bold text-[22px] text-terminal-green">{fmtPct(best.avg)}</div>
          </div>
          <div className="h-px bg-white/5" />
          {/* Worst sector */}
          {worst && worst.name !== best.name && (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-slate-600 mb-0.5">Lagging</div>
                <div className={`font-display font-semibold text-slate-400 leading-tight ${isMobile ? 'text-[11px]' : 'text-[13px]'}`}>{worst.name}</div>
              </div>
              <div className={`font-mono font-semibold text-terminal-red ${isMobile ? 'text-[13px]' : 'text-[16px]'}`}>{fmtPct(worst.avg)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
// ── MC Score Leaders — whole universe, rescored automatically every day ──
const lbColor = s => s >= 6.5 ? '#00ff88' : s >= 4.5 ? '#ffb800' : '#ff4466'
const LB_REGIME = { 'risk-off': ['#ff4466', 'Risk-off'], 'neutral': ['#ffb800', 'Neutral'], 'risk-on': ['#00ff88', 'Risk-on'] }

function LeaderRow({ r, i, onAnalyze, isMobile, weak }) {
  const c = lbColor(r.score)
  return (
    <button onClick={() => onAnalyze && onAnalyze(r.ticker)}
      className="w-full flex items-center gap-3 px-4 py-2 border-b border-white/5 last:border-0 hover:bg-electric-500/[0.04] transition-colors text-left">
      <span className="font-mono text-[10px] text-slate-600 w-4 text-right flex-shrink-0">{i + 1}</span>
      <span className="font-mono font-bold text-[13px] text-electric-300 w-16 flex-shrink-0">{r.ticker}</span>
      {!isMobile && <span className={`font-mono text-[11px] truncate flex-1 min-w-0 ${weak && r.risk ? 'text-terminal-red/80' : 'text-slate-500'}`}>{(weak ? r.risk : r.signal) || r.name}</span>}
      <span className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {!isMobile && r.low !== '' && r.high !== '' && <span className="font-mono text-[9px] text-slate-600">{Number(r.low).toFixed(1)}–{Number(r.high).toFixed(1)}</span>}
        <span style={{ color: c, borderColor: c + '55', background: c + '14' }} className="font-mono text-[12px] font-bold px-2 py-0.5 rounded border w-12 text-center">{Number(r.score).toFixed(1)}</span>
        <span style={{ color: c }} className="font-mono text-[10px] w-[72px] text-right">{r.label}</span>
      </span>
    </button>
  )
}

function ScoreLeaders({ onAnalyze, isMobile }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    jsonp(`${APPS_SCRIPT_URL}?action=getScoreLeaders`)
      .then(d => setData(d))
      .catch(e => setErr(e.message))
  }, [])

  const reg = data && data.regime ? (LB_REGIME[data.regime.regime] || LB_REGIME.neutral) : null
  const updated = data && data.updated ? new Date(data.updated).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-electric-400" />
          <span className="font-display font-semibold text-[13px] text-slate-200">MC Score Leaders</span>
          {reg && <span style={{ color: reg[0], borderColor: reg[0] + '55', background: reg[0] + '14' }} className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border">{reg[1]}</span>}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {data ? `${data.scored}/${data.universe} scored${updated ? ' · ' + updated : ''}` : 'Your universe · daily'}
        </span>
      </div>
      {!data && !err && <div className="p-6 text-center font-mono text-[11px] text-slate-600 uppercase tracking-wider animate-pulse">Loading scores…</div>}
      {err && <div className="p-6 text-center font-mono text-[11px] text-terminal-red">{err}</div>}
      {data && data.scored === 0 && (
        <div className="p-6 text-center font-mono text-[11px] text-slate-500 leading-relaxed">
          No scores yet. Once the background scorer is installed, your whole universe is scored automatically —
          or analyze any stock in Workstation to add it now.
        </div>
      )}
      {data && data.scored > 0 && (
        <div className={`grid ${isMobile || !data.bottom.length ? 'grid-cols-1' : 'grid-cols-2'} divide-white/5 ${isMobile ? '' : 'divide-x'}`}>
          <div>
            <div className="px-4 pt-2 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-terminal-green">▲ Highest scores</div>
            {data.top.map((r, i) => <LeaderRow key={r.ticker} r={r} i={i} onAnalyze={onAnalyze} isMobile={isMobile} />)}
          </div>
          {data.bottom.length > 0 && (
            <div>
              <div className="px-4 pt-2 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-terminal-red">▼ Weakest — review these</div>
              {data.bottom.map((r, i) => <LeaderRow key={r.ticker} r={r} i={i} onAnalyze={onAnalyze} isMobile={isMobile} weak />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LeadTab({ portfolio, onAnalyze, isMobile }) {
  const withDay    = portfolio.filter(r => r.dayChangePct != null)
  const withWeek   = portfolio.filter(r => r.weekChangePct != null)
  const atATH      = portfolio.filter(r => r.atATH)
  const deepDisc   = portfolio.filter(r => r.dd != null && r.dd <= -50)
  const [modal, setModal] = useState(null) // 'ath' | 'discount' | null

  const sortedDay  = [...withDay].sort((a, b) => b.dayChangePct - a.dayChangePct)
  const sortedWeek = [...withWeek].sort((a, b) => b.weekChangePct - a.weekChangePct)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPIs */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <SectorPulse portfolio={portfolio} isMobile={isMobile} />
        <KpiCard label="At ATH" value={atATH.length} sub="within 0.5% of high" color="green" icon={Zap}
          clickable onClick={() => setModal('ath')} isMobile={isMobile} />
        <KpiCard label="Deep Discount" value={deepDisc.length} sub=">50% off ATH" color="red" icon={AlertTriangle}
          clickable onClick={() => setModal('discount')} isMobile={isMobile} />
      </div>


      {/* MC Score Leaders */}
      <ScoreLeaders onAnalyze={onAnalyze} isMobile={isMobile} />

      {/* Daily movers */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <MoverTable title="Top 5 Gainers Today"  rows={sortedDay.slice(0, 5)}          meta="Portfolio · 1D"     type="gain" />
        <MoverTable title="Top 5 Losers Today"   rows={sortedDay.slice(-5).reverse()}   meta="Portfolio · 1D"     type="loss" />
      </div>

      {/* Weekly movers */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <MoverTable title="Top 5 Winners (7d)"   rows={sortedWeek.slice(0, 5)}         meta="Portfolio · Weekly" type="gain" useWeek />
        <MoverTable title="Top 5 Losers (7d)"    rows={sortedWeek.slice(-5).reverse()}  meta="Portfolio · Weekly" type="loss" useWeek />
      </div>

      {/* Upcoming earnings */}
      <UpcomingEarnings />

      {/* Modals */}
      {modal === 'ath' && (
        <StockListModal
          title="Stocks At All-Time High"
          rows={atATH}
          color="green"
          onClose={() => setModal(null)}
          onAnalyze={onAnalyze}
        />
      )}
      {modal === 'discount' && (
        <StockListModal
          title="Deep Discount — >50% off ATH"
          rows={deepDisc.sort((a,b) => a.dd - b.dd)}
          color="red"
          onClose={() => setModal(null)}
          onAnalyze={onAnalyze}
        />
      )}
    </div>
  )
}
