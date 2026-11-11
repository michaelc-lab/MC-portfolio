import React, { useState, useEffect, useRef } from 'react'
import { APPS_SCRIPT_URL, jsonp, safeUrl, fetchNews, stripSource } from '../lib/api'
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Calendar } from 'lucide-react'
import { fmtPrice, fmtPct } from '../lib/utils'




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


// ── Upcoming Earnings (30 days) ───────────────────────────────
function UpcomingEarnings() {
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [failed, setFailed] = useState(false), [missing, setMissing] = useState(0)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    // a failure must never read as "nothing scheduled"
    jsonp(`${APPS_SCRIPT_URL}?action=getUpcomingEarningsV2`)
      .then(data => {
        if (Array.isArray(data)) setEarnings(data)                    // older backend
        else if (data && Array.isArray(data.list)) { setEarnings(data.list); setMissing(Number(data.missingDays) || 0) }
        else { setEarnings([]); setFailed(true) }
        setLoading(false)
      })
      .catch(() => { setEarnings([]); setFailed(true); setLoading(false) })
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
      ) : failed ? (
        <div className="p-6 text-center text-[12px] text-terminal-amber" data-testid="earn-failed">Earnings calendar unavailable right now — dates unknown, check before trading</div>
      ) : !earnings?.length && missing ? (
        <div className="p-6 text-center text-[12px] text-terminal-amber">{missing} of 31 days couldn't be loaded — dates unknown, check before trading</div>
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
            {(showAll ? earnings : earnings.slice(0, 10)).map((e, i) => {
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
                    {(e.hour === 'bmo' || e.hour === 'amc') && (
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${e.hour === 'bmo' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-purple-500/30 text-purple-400 bg-purple-500/10'}`}>
                        {e.hour === 'bmo' ? 'BMO' : 'AMC'}
                      </span>
                    )}
                  </td>
                  <td className="text-right"><span className="font-mono text-[12px] text-slate-400">{typeof e.estimate === 'number' ? (e.estimate < 0 ? '-$' : '$') + Math.abs(e.estimate).toFixed(2) : '—'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {!failed && missing > 0 && earnings?.length > 0 && (
        <div className="px-4 py-2 text-[11px] text-terminal-amber border-t border-white/5" data-testid="earn-missing">{missing} of 31 days couldn't be loaded — some reports may be missing</div>
      )}
      {earnings?.length > 10 && (
        <button onClick={() => setShowAll(v => !v)} className="w-full px-4 py-2 text-left text-[12px] text-slate-500 hover:text-slate-300 border-t border-white/5">
          {showAll ? 'Show fewer' : `+ ${earnings.length - 10} more`}
        </button>
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
// ── News helpers ──
const rdAge = iso => {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'
}
const rdAgoLong = iso => { const a = rdAge(iso); return a ? a.replace(/m$/, ' min').replace(/h$/, 'h').replace(/d$/, 'd') + ' ago' : '' }

const SEC_PLAIN = items => (items || []).join(' · ')

function NewsDetails({ e, onAnalyze }) {
  const reports = (e.reports || []).filter(r => r.source !== 'Price data')
  return (
    <div className="mt-1 mb-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 font-display">
      <div className="text-[11px] text-slate-500 mb-2">{e.name} · {e.label}{e.sector ? ' · ' + e.sector : ''}</div>
      {reports.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-500">Reported by {reports.length} source{reports.length === 1 ? '' : 's'}</div>
          {reports.slice(0, 8).map((r, i) => (
            <div key={i} className="text-[12px] text-slate-300 leading-snug">
              <span className="text-slate-500">{r.source}:</span>{' '}
              {safeUrl(r.url) ? <a href={safeUrl(r.url)} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">{stripSource(r.headline, r.source)} ↗</a> : stripSource(r.headline, r.source)}
            </div>
          ))}
          {reports.length > 8 && <div className="text-[11px] text-slate-600">+{reports.length - 8} more</div>}
        </div>
      )}
      {e.sec && <div className="mt-3 text-[12px] text-slate-400">Official filing ({e.sec.form}, {e.sec.date}): {safeUrl(e.sec.url) ? <a href={safeUrl(e.sec.url)} target="_blank" rel="noopener noreferrer" className="hover:underline">{SEC_PLAIN(e.sec.items)} ↗</a> : SEC_PLAIN(e.sec.items)}</div>}
      <button onClick={() => onAnalyze && onAnalyze(e.ticker)} className="mt-3 text-[12px] text-electric-400 hover:text-electric-300">Open full analysis →</button>
    </div>
  )
}

// ── Important news — every S&P 500 company, several sources, no buy/sell direction ──
export function NewsFeed({ onAnalyze, isMobile, mine = [] }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [openKey, setOpenKey] = useState(null)
  const [scope, setScope] = useState('all')      // 'all' | 'mine'
  const [showSmall, setShowSmall] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { let alive = true; fetchNews().then(d => alive && setData(d)).catch(e => alive && setErr(e.message)); return () => { alive = false } }, [])

  const mineSet = new Set((mine || []).map(t => String(t).toUpperCase()))
  const t = e => new Date(e.time).getTime() || 0
  const all = ((data && data.events) || []).slice().sort((a, b) => t(b) - t(a))
  const scoped = scope === 'mine' ? all.filter(e => mineSet.has(e.ticker)) : all
  const main = scoped.filter(e => e.tier !== 2), small = scoped.filter(e => e.tier === 2)
  const list = showSmall ? scoped : main
  const shown = showAll ? list : list.slice(0, 12)
  const key = e => e.ticker + '|' + e.type
  const nMine = all.filter(e => mineSet.has(e.ticker)).length
  const chip = (id, label) => (
    <button key={id} onClick={() => { setScope(id); setShowAll(false) }} aria-pressed={scope === id}
      className={`text-[12px] px-3 py-1 rounded-md border transition-colors ${scope === id ? 'border-electric-400/60 bg-electric-500/15 text-slate-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>{label}</button>
  )
  const more = (r) => { const n = (r.sourceCount || 1) - 1; return n > 0 ? ` +${n}` : '' }

  return (
    <div className="panel p-5 font-display" data-testid="news-feed">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-[16px] text-slate-100">Important news</span>
          {data && data.asOf && <span className="text-[12px] text-slate-500">S&amp;P 500 · updated {rdAgoLong(data.asOf)} · last 2 days</span>}
        </div>
        <div className="flex gap-2">{chip('all', 'All S&P 500')}{chip('mine', `My stocks${data ? ' (' + nMine + ')' : ''}`)}</div>
      </div>

      {!data && !err && <div className="py-8 text-center text-[12px] text-slate-500 animate-pulse">Loading the news…</div>}
      {err && <div className="py-8 text-center text-[12px] text-terminal-amber">News unavailable right now — {err}</div>}
      {data && !data.asOf && <div className="py-8 text-center text-[12px] text-slate-500">The news scanner hasn't run yet.</div>}
      {data && data.asOf && !list.length && (
        <div className="py-8 text-center text-[13px] text-slate-500">{scope === 'mine' ? 'No important news on your S&P 500 stocks in the last 2 days.' : 'No important news in the last 2 days.'}</div>
      )}

      {shown.length > 0 && (
        <div className="border-t border-white/5">
          {shown.map(e => {
            const k = key(e), open = openKey === k, yours = mineSet.has(e.ticker)
            return (
              <div key={k} className="border-b border-white/5">
                <button onClick={() => setOpenKey(open ? null : k)} aria-expanded={open} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/[0.02]">
                  <span className="font-mono text-[13px] text-slate-200 w-14 flex-shrink-0">{e.ticker}{yours && <span title="One of your stocks" className="text-electric-400"> •</span>}</span>
                  {!isMobile && <span className="text-[11px] text-slate-500 w-[150px] flex-shrink-0 truncate">{e.label}</span>}
                  <span className={`text-[13px] text-slate-300 flex-1 min-w-0 ${isMobile ? '' : 'truncate'}`}>{stripSource(e.headline, e.source)}</span>
                  {!isMobile && <span className="text-[11px] text-slate-500 flex-shrink-0 max-w-[170px] truncate">{e.official ? 'Official · ' : ''}{e.source}{more(e)}</span>}
                  <span className="text-[11px] text-slate-600 w-8 text-right flex-shrink-0">{rdAge(e.time)}</span>
                </button>
                {open && <NewsDetails e={e} onAnalyze={onAnalyze} />}
              </div>
            )
          })}
        </div>
      )}
      <div className="flex gap-4 mt-2">
        {list.length > 12 && <button onClick={() => setShowAll(v => !v)} className="text-[12px] text-slate-500 hover:text-slate-300">{showAll ? 'Show less' : `Show ${list.length - 12} more`}</button>}
        {small.length > 0 && <button onClick={() => setShowSmall(v => !v)} className="text-[12px] text-slate-500 hover:text-slate-300">{showSmall ? 'Hide smaller stories' : `+ ${small.length} smaller stories (one minor source)`}</button>}
      </div>
    </div>
  )
}

// ── System health: when did each background job last work? A banner only when something is actually broken ──
let SH_P = null, SH_AT = 0
const healthOnce = () => { if (!SH_P || Date.now() - SH_AT > 120000) { SH_AT = Date.now(); SH_P = jsonp(`${APPS_SCRIPT_URL}?action=getSystemHealth`).catch(e => { SH_P = null; throw e }) } return SH_P }
const shAge = m => m == null ? 'not yet' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`
export function SystemHealth({ where }) {
  const [h, setH] = useState(null)
  useEffect(() => { let alive = true; healthOnce().then(x => alive && setH(x)).catch(() => {}); return () => { alive = false } }, [])
  if (!h || !h.jobs) return null
  const bad = h.jobs.filter(j => !j.optional && (j.status === 'down' || j.status === 'stale'))
  if (where === 'banner') {
    if (!bad.length) return null
    return (
      <div className="panel px-4 py-3 border border-terminal-amber/40 font-display text-[13px] text-terminal-amber" data-testid="health-banner">
        ⚠ {bad.map(j => j.status === 'down' ? `${j.name} is failing` : `${j.name} hasn't run since ${shAge(j.lastOkMin)}`).join(' · ')}
        {bad[0].error ? <span className="text-slate-500"> — {bad[0].error}</span> : null}
        <span className="text-slate-500"> · Information from {bad.length === 1 ? 'it' : 'these'} may be out of date.</span>
      </div>
    )
  }
  const shown = h.jobs.filter(j => j.lastOkMin != null || !j.optional)
  return (
    <div className="font-display text-[11px] text-slate-600 px-1" data-testid="health-footer">
      System health <span className={h.ok ? 'text-terminal-green/80' : 'text-terminal-amber'}>{h.ok ? '✓' : '⚠'}</span>
      {shown.map(j => <span key={j.id}> · {j.name} {j.status === 'down' ? <span className="text-terminal-amber">failing</span> : shAge(j.lastOkMin)}</span>)}
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
      <SystemHealth where="banner" />
      {/* KPIs */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <SectorPulse portfolio={portfolio} isMobile={isMobile} />
        <KpiCard label="At ATH" value={atATH.length} sub="within 0.5% of high" color="green" icon={Zap}
          clickable onClick={() => setModal('ath')} isMobile={isMobile} />
        <KpiCard label="Deep Discount" value={deepDisc.length} sub=">50% off ATH" color="red" icon={AlertTriangle}
          clickable onClick={() => setModal('discount')} isMobile={isMobile} />
      </div>


      {/* Important news — S&P 500 */}
      <NewsFeed onAnalyze={onAnalyze} isMobile={isMobile} mine={(portfolio || []).map(r => r.ticker)} />

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
      <SystemHealth where="footer" />
    </div>
  )
}
