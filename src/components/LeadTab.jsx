import React, { useState, useEffect, useRef } from 'react'
import { APPS_SCRIPT_URL, jsonp } from '../lib/api'
import { oddsLabel } from '../lib/odds'
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Calendar, Sparkles } from 'lucide-react'
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
// ── News Radar — a briefing, not a log. Separate from the MC Score. ──
const rdAge = iso => {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'
}
const rdAgoLong = iso => { const a = rdAge(iso); return a ? a.replace(/m$/, ' min').replace(/h$/, 'h').replace(/d$/, 'd') + ' ago' : '' }
const RD_SUFFIX_RE = /\b(inc|corp|corporation|co|company|ltd|limited|plc|holdings?|group|class [a-z]|adr|sa|nv|ag|se)\b\.?/gi
const rdShortName = (name, ticker, names) => {
  const n = (names && names[ticker]) || name || ''
  return n.replace(RD_SUFFIX_RE, '').replace(/[,.]+\s*$/, '').replace(/\s{2,}/g, ' ').trim().split(' ').slice(0, 3).join(' ') || ticker
}
const rdClean = (h, ticker) => {
  let s = String(h || '')
    .replace(/\((?:NASDAQ|NYSE|NYSE American|AMEX|OTC|Nasdaq)\s*:\s*[A-Z.]+\)/g, '')
    .replace(new RegExp('\\(' + ticker + '(?:\\.US)?\\)', 'g'), '')
    .replace(new RegExp('^' + ticker + '\\s+(Stock|Shares)\\s*[:\\-–]?\\s*', 'i'), '')
    .replace(/\$[A-Z]{1,5}\b/g, '').replace(/\s+-\s+[A-Z][\w .&]+$/, '').replace(/\s{2,}/g, ' ').trim()
  if (s.length > 92) s = s.slice(0, 89).replace(/\s+\S*$/, '') + '…'
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const rdLine = (s) => s.summary || rdClean(s.headline, s.ticker)
const rdDots = strength => { const n = strength === 'High' ? 3 : strength === 'Medium' ? 2 : 1; return [0, 1, 2].map(i => i < n) }
const rdStatus = s => {
  if (s.against) return { text: 'Moving against it', tone: 'text-terminal-red' }
  if (s.late) return { text: s.statedMove >= 10 ? `Already ${s.dir > 0 ? 'up' : 'down'} ${s.statedMove}%` : 'Already moved', tone: 'text-terminal-amber' }
  if (s.confirmed && s.dp != null) return { text: `${s.dp > 0 ? '+' : ''}${Number(s.dp).toFixed(1)}% today`, tone: s.dp >= 0 ? 'text-terminal-green' : 'text-terminal-red' }
  return { text: 'Not moving yet', tone: 'text-slate-500' }
}
const rdLinkPlain = s => s.link === 'named' ? 'The company is named in the news'
  : s.link === 'ai' ? (s.aiOnly ? 'Inferred by AI — not yet confirmed by the market or company news' : 'Inferred by AI and confirmed')
  : s.link === 'name' ? 'Matched by company name' : 'Industry theme: ' + (s.via || '')

const RD_VOTE_KEY = 'mc_radar_votes'
const rdVotes = () => { try { return JSON.parse(localStorage.getItem(RD_VOTE_KEY) || '{}') } catch (e) { return {} } }
function RadarRating({ s }) {
  const key = s.ticker + '|' + (s.time || '')
  const [vote, setVote] = useState(() => rdVotes()[key] || null)
  const [err, setErr] = useState(null)
  const send = v => {
    const next = vote === v ? null : v
    setVote(next); setErr(null)
    try { const all = rdVotes(); if (next) all[key] = next; else delete all[key]; localStorage.setItem(RD_VOTE_KEY, JSON.stringify(all)) } catch (e) {}
    jsonp(`${APPS_SCRIPT_URL}?action=rateRadar&ticker=${encodeURIComponent(s.ticker)}&time=${encodeURIComponent(s.time || '')}&vote=${next || 'clear'}`)
      .then(r => { if (r && r.error) setErr(r.error) }).catch(e => setErr('Not saved — ' + e.message))
  }
  const btn = (v, label) => (
    <button key={v} onClick={() => send(v)} aria-pressed={vote === v}
      className={`text-[12px] px-2.5 py-1 rounded-md border transition-colors ${vote === v ? 'border-electric-400/60 bg-electric-500/15 text-slate-100' : 'border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'}`}>{label}</button>
  )
  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <span className="text-[11px] text-slate-500">Was this signal right?</span>
      {btn('right', '👍 Right')}{btn('wrong', '👎 Wrong')}{btn('irrelevant', 'Not relevant')}
      {vote && !err && <span className="text-[11px] text-slate-600">Saved — it counts toward the Radar's accuracy</span>}
      {err && <span className="text-[11px] text-terminal-red">{err}</span>}
    </div>
  )
}

function RadarDetails({ s, onAnalyze, onClose }) {
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 font-display">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <a href={s.url || undefined} target="_blank" rel="noopener noreferrer" className="text-[13px] text-slate-200 hover:text-white leading-snug">{s.headline}</a>
          <div className="text-[11px] text-slate-500 mt-1">{s.source}{s.time ? ' · ' + rdAgoLong(s.time) : ''}{s.sources > 1 ? ` · reported by ${s.sources} sources` : ''}</div>
        </div>
        <button onClick={onClose} aria-label="Close details" className="text-slate-500 hover:text-slate-300 text-[13px] flex-shrink-0">✕</button>
      </div>
      <div className="mt-3 space-y-1.5 text-[12px] text-slate-400">
        <div>{rdLinkPlain(s)}</div>
        {s.sec && <div className="text-slate-400">The company also filed {/^8/.test(s.sec.form) ? 'an' : 'a'} <a href={s.sec.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.sec.form} on {s.sec.date}</a> — open it to see if it's related</div>}
        {s.aiOnly
          ? <div className="text-terminal-amber/90">AI reasoning: {s.aiReason || s.evidence}</div>
          : s.evidence ? <div className="text-terminal-green/80">Evidence: {s.evidenceUrl ? <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.evidence}</a> : s.evidence}</div> : null}
        {s.volRatio != null && s.volRatio >= 2 && <div>Trading at {s.volRatio}× its normal volume</div>}
        {s.role === 'target' && <div>This company is the target of a proposed acquisition</div>}
        {s.smallCap && <div>Small company — news can move it sharply in both directions</div>}
      </div>
      <RadarRating s={s} />
      <button onClick={() => onAnalyze && onAnalyze(s.ticker)} className="mt-3 text-[12px] text-electric-400 hover:text-electric-300">Open full analysis →</button>
    </div>
  )
}

function RadarCard({ s, open, onToggle, onAnalyze, names }) {
  const bull = s.dir > 0, st = rdStatus(s)
  return (
    <button onClick={onToggle} aria-expanded={open}
      className={`text-left rounded-xl border p-4 transition-colors font-display ${open ? 'border-electric-500/40 bg-electric-500/[0.04]' : 'border-white/10 hover:border-white/20 bg-white/[0.015]'}`}>
      <div className="flex items-center justify-between">
        <span onClick={e => { e.stopPropagation(); onAnalyze && onAnalyze(s.ticker) }} className="font-mono text-[18px] text-slate-100 hover:text-electric-300">{s.ticker}</span>
        <span className={`text-[11px] px-2.5 py-0.5 rounded-md ${bull ? 'bg-terminal-green/10 text-terminal-green' : 'bg-terminal-red/10 text-terminal-red'}`}>{bull ? 'Bullish' : 'Bearish'}</span>
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{rdShortName(s.name, s.ticker, names)}</div>
      <div className="text-[13px] text-slate-300 leading-snug mt-3 min-h-[36px]">{rdLine(s)}</div>
      <div className="flex items-center justify-between mt-4 text-[11px]">
        <span className="flex gap-1" aria-label={`Confidence ${s.strength}`}>{rdDots(s.strength).map((on, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-slate-200' : 'bg-slate-700'}`} />)}</span>
        <span className={st.tone}>{st.text}<span className="text-slate-600"> · {rdAge(s.time)}</span></span>
      </div>
    </button>
  )
}

function NewsRadar({ onAnalyze, isMobile, names }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [openKey, setOpenKey] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [showTrack, setShowTrack] = useState(false)
  const [track, setTrack] = useState(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    jsonp(`${APPS_SCRIPT_URL}?action=getNewsRadar`).then(d => setData(d)).catch(e => setErr(e.message))
  }, [])
  const toggleTrack = () => {
    const next = !showTrack
    setShowTrack(next)
    if (next && !track) jsonp(`${APPS_SCRIPT_URL}?action=getNewsRadarTrack`).then(t => setTrack(t)).catch(e => setTrack({ error: e.message }))
  }

  const meta = data && data.meta
  const sigs = ((data && data.signals) || []).filter(s => s.dir !== 0)
  const ageH = s => s.time ? (Date.now() - new Date(s.time).getTime()) / 3600000 : 99
  const score = s => (s.aiOnly ? 0 : 5) + (s.late ? 0 : 10) + (s.points || 0) - Math.min(ageH(s), 72) / 24
  const top = sigs.filter(s => !s.against && (s.strength === 'High' || s.strength === 'Medium')).sort((a, b) => score(b) - score(a)).slice(0, 3)
  const rest = sigs.filter(s => top.indexOf(s) < 0).sort((a, b) => score(b) - score(a))
  const restShown = showAll ? rest : rest.slice(0, 5)
  const openTop = top.find(s => s.ticker === openKey)
  const ai = meta && meta.ai
  const aiOn = ai && ai.used && !ai.error

  return (
    <div className="panel p-5 font-display">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-[16px] text-slate-100">News radar</span>
          {meta && <span className="text-[12px] text-slate-500">Updated {rdAgoLong(meta.lastRun)} · {meta.headlines} headlines read</span>}
          {meta && <span title={ai && ai.error ? ai.error : aiOn ? 'AI reading news: ' + ai.model : 'Rules only'} className={`inline-block w-1.5 h-1.5 rounded-full ${aiOn ? 'bg-electric-400' : 'bg-slate-600'}`} />}
        </div>
        <button onClick={toggleTrack} className="text-[12px] text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 rounded-md px-3 py-1">{showTrack ? 'Hide track record' : 'Track record'}</button>
      </div>

      {showTrack && (
        <div className="mb-5 rounded-lg border border-white/10 p-4">
          {!track && <div className="text-[12px] text-slate-500 animate-pulse">Checking what flagged stocks did next…</div>}
          {track && track.error && <div className="text-[12px] text-terminal-red">{track.error}</div>}
          {track && !track.error && track.computing && <div className="text-[12px] text-slate-500">Preparing your track record — it's calculated in the background after each scan. Check back in a few minutes.</div>}
          {track && !track.error && !track.computing && track.matured === 0 && <div className="text-[12px] text-slate-500">Collecting results — {track.total} signal{track.total === 1 ? '' : 's'} logged so far. Results appear once signals are a day old.</div>}
          {track && !track.error && !track.computing && track.matured > 0 && (
            <div className="space-y-1.5 text-[12px]">
              {track.buckets.concat(track.sectors && track.sectors.n ? [{ strength: 'Sector pulse', ...track.sectors }] : [], track.ai && track.ai.n ? [{ strength: 'AI-inferred', ...track.ai }] : []).filter(b => b.n).map(b => (
                <div key={b.strength} className="flex justify-between gap-3 flex-wrap text-slate-400">
                  <span>{b.strength === 'High' ? 'Strong signals' : b.strength === 'Medium' ? 'Moderate signals' : b.strength === 'Low' ? 'Weak signals' : b.strength}</span>
                  <span><span className="text-slate-200">{b.hitRate == null ? '—' : b.hitRate.toFixed(0) + '%'}</span> moved as expected
                    {b.beatMarketRate != null && <> · <span className="text-slate-200">{b.beatMarketRate.toFixed(0)}%</span> beat the market</>}
                    <span className="text-slate-600"> · {b.n} signals · avg {b.avgMove == null ? '—' : (b.avgMove >= 0 ? '+' : '') + b.avgMove.toFixed(1) + '%'}</span></span>
                </div>
              ))}
              {track.baseline && track.baseline.n > 0 && (
                <div className="pt-2 text-[11px] text-slate-500 leading-relaxed">
                  For comparison: the S&amp;P 500 itself moved the predicted way {track.baseline.marketSameWay.toFixed(0)}% of the time, and a coin flip is right 50%.
                  {' '}A signal only adds value if it clearly beats both.
                </div>
              )}
            </div>
          )}
          {track && !track.error && track.feedback && track.feedback.all.n > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5 text-[12px] text-slate-400">
              Your ratings: <span className="text-slate-200">{track.feedback.all.n}</span> rated
              {track.feedback.all.accuracy != null && <> · <span className="text-slate-200">{track.feedback.all.accuracy.toFixed(0)}%</span> right</>}
              {track.feedback.named.accuracy != null && <span className="text-slate-600"> · named in news {track.feedback.named.accuracy.toFixed(0)}%</span>}
              {track.feedback.ai.accuracy != null && <span className="text-slate-600"> · AI-inferred {track.feedback.ai.accuracy.toFixed(0)}%</span>}
            </div>
          )}
        </div>
      )}

      {!data && !err && <div className="py-8 text-center text-[12px] text-slate-500 animate-pulse">Reading the news…</div>}
      {err && <div className="py-8 text-center text-[12px] text-terminal-red">{err}</div>}
      {data && !meta && <div className="py-8 text-center text-[12px] text-slate-500">Not started yet — run installNewsRadarTrigger once in Apps Script.</div>}
      {data && meta && !sigs.length && <div className="py-8 text-center text-[13px] text-slate-500">A quiet news day — nothing worth your attention right now.</div>}

      {top.length > 0 && (
        <>
          <div className="text-[12px] text-slate-500 mb-2">Top signals</div>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {top.map(s => <RadarCard key={s.ticker} s={s} names={names} open={openKey === s.ticker} onAnalyze={onAnalyze} onToggle={() => setOpenKey(openKey === s.ticker ? null : s.ticker)} />)}
          </div>
          {openTop && <RadarDetails s={openTop} onAnalyze={onAnalyze} onClose={() => setOpenKey(null)} />}
        </>
      )}

      {meta && meta.sectors && meta.sectors.length > 0 && (
        <div className="mt-6">
          <div className="text-[12px] text-slate-500 mb-2">Sector pulse</div>
          <div className="flex flex-wrap gap-2">
            {meta.sectors.map(x => {
              const mixed = x.against && !x.moving
              const status = x.moving ? 'stocks following' : x.against ? (x.dir > 0 ? 'rally fading' : 'stocks shrugging it off') : 'not in prices yet'
              return (
                <span key={x.theme + x.dir} title={x.headline + (x.source ? ' — ' + x.source : '') + '\nWatch: ' + x.tickers.map(t => t.ticker).join(', ')}
                  className="text-[13px] px-3 py-1.5 rounded-md border border-white/10 text-slate-200">
                  <span className={mixed ? 'text-slate-500' : x.dir > 0 ? 'text-terminal-green' : 'text-terminal-red'}>{mixed ? '◆' : x.dir > 0 ? '▲' : '▼'}</span>{' '}
                  {x.theme.split(' / ')[0]}<span className="text-slate-500"> · {status}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-6">
          <div className="text-[12px] text-slate-500 mb-1">Also on the radar</div>
          <div className="border-t border-white/5">
            {restShown.map(s => {
              const open = openKey === s.ticker, st = rdStatus(s)
              return (
                <div key={s.ticker} className="border-b border-white/5">
                  <button onClick={() => setOpenKey(open ? null : s.ticker)} aria-expanded={open} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/[0.02]">
                    <span className={`w-3 text-[12px] ${s.dir > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>{s.dir > 0 ? '▲' : '▼'}</span>
                    <span className="font-mono text-[13px] text-slate-200 w-14 flex-shrink-0">{s.ticker}</span>
                    <span className={`text-[13px] text-slate-400 flex-1 min-w-0 ${isMobile ? '' : 'truncate'}`}>{rdLine(s)}</span>
                    {(s.against || s.late) && !isMobile && <span className={`text-[11px] ${st.tone} flex-shrink-0`}>{st.text}</span>}
                    <span className="text-[11px] text-slate-600 w-8 text-right flex-shrink-0">{rdAge(s.time)}</span>
                  </button>
                  {open && <div className="pb-3"><RadarDetails s={s} onAnalyze={onAnalyze} onClose={() => setOpenKey(null)} /></div>}
                </div>
              )
            })}
          </div>
          {rest.length > 5 && (
            <button onClick={() => setShowAll(v => !v)} className="mt-2 text-[12px] text-slate-500 hover:text-slate-300">{showAll ? 'Show less' : `Show ${rest.length - 5} more`}</button>
          )}
        </div>
      )}

      {meta && sigs.length > 0 && <div className="mt-5 text-[11px] text-slate-600">Speculative — news-driven moves often reverse. Tap any signal for its evidence.</div>}
    </div>
  )
}

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
        <span style={{ color: c }} className="font-mono text-[10px] w-[96px] text-right">{oddsLabel(r.label)}</span>
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


      {/* News Radar */}
      <NewsRadar onAnalyze={onAnalyze} isMobile={isMobile} names={Object.fromEntries((portfolio || []).map(r => [r.ticker, r.company]))} />

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
      <SystemHealth where="footer" />
    </div>
  )
}
