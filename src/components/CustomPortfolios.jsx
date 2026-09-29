import React, { useState, useEffect, useRef, useCallback } from 'react'
import { APPS_SCRIPT_URL, jsonp } from '../lib/api'
import { Plus, X, Edit2, Trash2, Check, TrendingUp, DollarSign, BarChart2, Search } from 'lucide-react'
import { fmtMoney, fmtPrice, fmtPct, fmtLarge } from '../lib/utils'

const QUOTE_CACHE = {}
const QUOTE_TTL = 120000

// ── User ID — persisted in localStorage, syncs data to Sheet ─
function saveId(id) {
  try { localStorage.setItem('mc_user_id', id) } catch(e) {}
  document.cookie = 'mc_user_id=' + encodeURIComponent(id) + '; max-age=31536000; path=/; SameSite=Lax'
}

function getSavedId() {
  let id = null
  try { id = localStorage.getItem('mc_user_id') } catch(e) {}
  if (!id) {
    const m = document.cookie.match(/mc_user_id=([^;]+)/)
    if (m) id = decodeURIComponent(m[1])
  }
  return id || null
}

// ── JSONP helper ──────────────────────────────────────────────

// ── Backend sync ──────────────────────────────────────────────
async function loadFromSheet(userId) {
  try {
    const d = await jsonp(`${APPS_SCRIPT_URL}?action=getCustomPortfolios&userId=${encodeURIComponent(userId)}`)
    return Array.isArray(d?.portfolios) ? d.portfolios : []
  } catch { return null }
}

// Saves in small pieces: a whole portfolio set is too long for one request address.
// Throws on failure, so the screen can say so (it used to show "saved" even when nothing reached the Sheet).
export async function saveToSheet(userId, portfolios, send = jsonp) {
  const json = JSON.stringify(portfolios), size = 1500, parts = []
  for (let i = 0; i < json.length; i += size) parts.push(json.slice(i, i + size))
  if (!parts.length) parts.push('[]')
  const saveId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  for (let i = 0; i < parts.length; i++) {
    let r = null, err = null
    for (let a = 0; a < 2 && !r; a++) {
      try { r = await send(`${APPS_SCRIPT_URL}?action=saveCustomPortfoliosChunk&userId=${encodeURIComponent(userId)}&saveId=${saveId}&part=${i}&total=${parts.length}&chunk=${encodeURIComponent(parts[i])}`) }
      catch (e) { err = e }
    }
    if (!r || r.ok === false) throw new Error((r && r.error) || (err && err.message) || 'Save failed')
    if (i === parts.length - 1 && !r.complete) throw new Error('Save incomplete')
  }
}

// ── Quote fetcher ─────────────────────────────────────────────
const YEAR = new Date().getFullYear()

// All prices in ONE request (was one request per stock — big portfolios hit Google's ~30-at-once limit).
// force = skip the 2-minute browser cache (used by the 5-minute refresh)
export async function fetchQuotes(tickers, force = false, send = jsonp) {
  const now = Date.now(), out = {}, need = []
  tickers.forEach(t => { const c = QUOTE_CACHE[t]; if (!force && c && now - c.ts < QUOTE_TTL) out[t] = c.data; else need.push(t) })
  if (!need.length) return out
  try {
    const r = await send(`${APPS_SCRIPT_URL}?action=getQuotes&tickers=${encodeURIComponent(need.join(','))}`)
    const qs = (r && r.quotes) || {}
    if (!r || !r.quotes) throw new Error('No batch answer')
    need.forEach(t => { const q = qs[t]; if (q && q.price != null) { QUOTE_CACHE[t] = { ts: now, data: q }; out[t] = q } })
  } catch (e) {
    for (let i = 0; i < need.length; i += 4) {                     // fallback: one request per stock, 4 at a time
      const chunk = need.slice(i, i + 4), res = await Promise.all(chunk.map(t => fetchQuote(t)))
      chunk.forEach((t, k) => { if (res[k]) out[t] = res[k] })
    }
  }
  return out
}

async function fetchQuote(ticker) {
  const now = Date.now()
  if (QUOTE_CACHE[ticker] && now - QUOTE_CACHE[ticker].ts < QUOTE_TTL) return QUOTE_CACHE[ticker].data
  // Try up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await jsonp(`${APPS_SCRIPT_URL}?action=getQuote&ticker=${encodeURIComponent(ticker)}`)
      if (data && data.price != null) {
        QUOTE_CACHE[ticker] = { ts: now, data }
        return data
      }
    } catch(e) {
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000)) // wait 1s before retry
    }
  }
  return null
}

function newId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// ── Create Portfolio Modal ────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('tracking')

  const handleCreate = () => {
    const n = name.trim()
    if (!n) return
    onCreate({ id: newId(), name: n, type, positions: [] })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-bright w-full max-w-md mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-lg text-white">New Portfolio</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Portfolio Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Tech Bets, My Holdings, Crypto Plays"
              className="w-full bg-navy-800/60 border border-white/10 rounded px-4 py-2.5 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40" />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">Portfolio Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'tracking',   icon: TrendingUp, title: 'Tracking',   desc: 'Watch prices & changes. No buy price needed.' },
                { id: 'investment', icon: DollarSign,  title: 'Investment', desc: 'Track P&L. Enter avg buy price & quantity.' },
              ].map(({ id, icon: Icon, title, desc }) => (
                <button key={id} onClick={() => setType(id)}
                  className={`p-4 rounded-lg border text-left transition-all ${type === id ? 'border-electric-500/60 bg-electric-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                  <Icon size={16} className={type === id ? 'text-electric-400 mb-2' : 'text-slate-500 mb-2'} />
                  <div className={`font-display font-semibold text-[13px] mb-1 ${type === id ? 'text-white' : 'text-slate-400'}`}>{title}</div>
                  <div className="text-[11px] font-mono text-slate-600 leading-relaxed">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded border border-white/10 text-[12px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim()}
            className="flex-1 btn-primary px-4 py-2.5 rounded text-[12px] font-mono font-semibold uppercase tracking-wider disabled:opacity-40">
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Position Modal ────────────────────────────────────────
function AddPositionModal({ onClose, onAdd, initial }) {
  const editing = !!initial
  const [ticker, setTicker] = useState(initial ? initial.ticker : '')
  const [buyPrice, setBuyPrice] = useState(initial ? String(initial.buyPrice) : '')
  const [qty, setQty] = useState(initial ? String(initial.qty) : '')
  const [buyDate, setBuyDate] = useState(initial && initial.buyDate ? initial.buyDate : '')
  const [error, setError] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const year = new Date().getFullYear()

  const handleAdd = () => {
    const t = ticker.trim().toUpperCase()
    const p = parseFloat(buyPrice)
    const q = parseFloat(qty)
    if (!t) return setError('Enter a ticker')
    if (isNaN(p) || p <= 0) return setError('Enter a valid buy price')
    if (isNaN(q) || q <= 0) return setError('Enter a valid quantity')
    if (buyDate && buyDate > today) return setError('Purchase date cannot be in the future')
    const pos = { ticker: t, buyPrice: p, qty: q, addedAt: initial ? (initial.addedAt || Date.now()) : Date.now() }
    if (buyDate) pos.buyDate = buyDate
    onAdd(pos)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-bright w-full max-w-sm mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-[16px] text-white">{editing ? 'Edit Position' : 'Add Position'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Ticker</label>
            <input autoFocus={!editing} disabled={editing} value={ticker} onChange={e => { setTicker(e.target.value.toUpperCase()); setError('') }}
              placeholder="NVDA" onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="w-full bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40 uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Avg Buy Price <span className="normal-case text-slate-600">(in the stock's own currency — e.g. AUD for .AX)</span></label>
              <input value={buyPrice} onChange={e => { setBuyPrice(e.target.value); setError('') }}
                placeholder="180.00" type="number" min="0" step="0.01"
                className="w-full bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40" />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Quantity</label>
              <input value={qty} onChange={e => { setQty(e.target.value); setError('') }}
                placeholder="10" type="number" min="0" step="any"
                className="w-full bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Purchase date (optional)</label>
            <input value={buyDate} onChange={e => { setBuyDate(e.target.value); setError('') }} type="date" max={today}
              className="w-full bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[13px] font-mono text-slate-200 focus:outline-none focus:border-electric-500/40" />
            <div className="text-[10px] font-mono text-slate-600 mt-1">Used for YTD P&amp;L. Leave empty if you bought before {year}.</div>
          </div>
          {error && <div className="text-[11px] font-mono text-terminal-red">{error}</div>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded border border-white/10 text-[12px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
          <button onClick={handleAdd} className="flex-1 btn-primary px-4 py-2 rounded text-[12px] font-mono font-semibold uppercase tracking-wider">{editing ? 'Save' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Shared table styles ───────────────────────────────────────
const thStyle = (align = 'right', sortable = false) => ({
  textAlign: align,
  padding: '10px 12px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#334155',
  borderBottom: '1px solid rgba(14,165,233,0.08)',
  background: '#060d1f',
  whiteSpace: 'nowrap',
  cursor: sortable ? 'pointer' : 'default',
  userSelect: 'none',
})

const tdStyle = (align = 'right') => ({
  padding: '11px 12px',
  borderBottom: '1px solid rgba(14,165,233,0.04)',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '12px',
  textAlign: align,
  overflow: 'hidden',
})

function SortIcon({ col, sort }) {
  if (sort.key !== col) return <span style={{opacity:0.3, marginLeft:3}}>↕</span>
  return <span style={{color:'#38bdf8', marginLeft:3}}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Tracking Table ────────────────────────────────────────────
function TrackingTable({ positions, onRemove, onAdd, onAnalyze }) {
  const [quotes, setQuotes]       = useState({})
  const [loading, setLoading]     = useState(new Set())
  const [addTicker, setAddTicker] = useState('')
  const [adding, setAdding]       = useState(false)
  const [sort, setSort]           = useState({ key: null, dir: 'desc' })

  useEffect(() => {
    const missing = positions.filter(p => !quotes[p.ticker])
    if (!missing.length) return
    setLoading(new Set(missing.map(p => p.ticker)))
    fetchQuotes(missing.map(p => p.ticker)).then(map => {
      setQuotes(prev => ({ ...prev, ...map }))
      setLoading(new Set())
    })
  }, [positions.map(p => p.ticker).join(',')])
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible' || !positions.length) return
      fetchQuotes(positions.map(p => p.ticker), true).then(map => setQuotes(prev => ({ ...prev, ...map })))
    }, 5 * 60000)
    return () => clearInterval(id)
  }, [positions.map(p => p.ticker).join(',')])

  const handleAdd = async () => {
    const t = addTicker.trim().toUpperCase()
    if (!t || positions.find(p => p.ticker === t)) return
    setAdding(true)
    onAdd(t)
    setAddTicker('')
    setAdding(false)
  }

  const handleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  const sorted = [...positions].sort((a, b) => {
    if (!sort.key) return 0
    const qa = quotes[a.ticker], qb = quotes[b.ticker]
    const va = qa?.[sort.key] ?? null
    const vb = qb?.[sort.key] ?? null
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return sort.dir === 'asc' ? va - vb : vb - va
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={addTicker} onChange={e => setAddTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add ticker (e.g. NVDA, AAPL)…"
            className="w-full bg-navy-800/60 border border-white/10 rounded px-8 py-2 text-[12px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40 uppercase" />
        </div>
        <button onClick={handleAdd} disabled={!addTicker.trim() || adding}
          className="btn-primary px-4 py-2 rounded text-[11px] font-mono font-semibold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5">
          <Plus size={12} /> Add
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="panel p-12 text-center">
          <TrendingUp size={24} className="text-slate-700 mx-auto mb-3" />
          <div className="font-mono text-[12px] text-slate-600 uppercase tracking-wider">Add your first ticker above</div>
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'45px'}} />
              <col style={{width:'90px'}} />
              <col style={{width:'120px'}} />
              <col style={{width:'110px'}} />
              <col style={{width:'100px'}} />
              <col style={{width:'100px'}} />
              <col style={{width:'110px'}} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle('center')}>#</th>
                <th style={thStyle('left')}>Ticker</th>
                <th style={thStyle('right', true)} onClick={() => handleSort('price')}>Price <SortIcon col="price" sort={sort} /></th>
                <th style={thStyle('right', true)} onClick={() => handleSort('dayChangePct')}>Δ Today <SortIcon col="dayChangePct" sort={sort} /></th>
                <th style={thStyle('right', true)} onClick={() => handleSort('weekChangePct')}>Δ 7d <SortIcon col="weekChangePct" sort={sort} /></th>
                <th style={thStyle('right', true)} onClick={() => handleSort('dd')}>Δ ATH <SortIcon col="dd" sort={sort} /></th>
                <th style={thStyle('right')}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => {
                const q = quotes[p.ticker]
                const isLoading = loading.has(p.ticker)
                return (
                  <tr key={p.ticker} className="group">
                    <td style={{...tdStyle('center'), color:'#334155', fontSize:'11px'}}>{idx + 1}</td>
                    <td style={tdStyle('left')}><span style={{fontWeight:'700',fontSize:'13px',color:'#7dd3fc'}}>{p.ticker}</span></td>
                    <td style={tdStyle()}>
                      {isLoading ? <span style={{color:'#475569',fontSize:'11px'}}>…</span>
                        : q?.price != null ? <span style={{fontWeight:'600',color:'#f1f5f9'}}>{fmtPrice(q.price)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      {q?.dayChangePct != null
                        ? <span style={{color:q.dayChangePct>0?'#00ff88':q.dayChangePct<0?'#ff4466':'#64748b'}}>{fmtPct(q.dayChangePct)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      {q?.weekChangePct != null
                        ? <span style={{color:q.weekChangePct>0?'#00ff88':q.weekChangePct<0?'#ff4466':'#64748b'}}>{fmtPct(q.weekChangePct)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      {q?.dd != null
                        ? <span style={{color:q.dd>=-0.5?'#00ff88':q.dd>=-20?'#38bdf8':q.dd>=-50?'#eab308':'#ff4466'}}>{fmtPct(q.dd,1)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {onAnalyze && (
                          <button onClick={() => onAnalyze(p.ticker)}
                            style={{fontSize:'10px',fontFamily:'IBM Plex Mono',color:'#38bdf8',border:'1px solid rgba(14,165,233,0.2)',padding:'2px 8px',borderRadius:'4px',background:'transparent',cursor:'pointer'}}>
                            Analyze →
                          </button>
                        )}
                        <button onClick={() => onRemove(p.ticker)} style={{color:'#475569',background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center'}}>
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Investment Table ──────────────────────────────────────────
function InvestmentTable({ positions, onRemove, onAdd, onUpdate, onAnalyze }) {
  const [quotes, setQuotes]       = useState({})
  const [loading, setLoading]     = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editPos, setEditPos]     = useState(null)
  const [sort, setSort]           = useState({ key: null, dir: 'desc' })

  useEffect(() => {
    const missing = positions.filter(p => !quotes[p.ticker])
    if (!missing.length) return
    setLoading(new Set(missing.map(p => p.ticker)))
    fetchQuotes(missing.map(p => p.ticker)).then(map => {
      setQuotes(prev => ({ ...prev, ...map }))
      setLoading(new Set())
    })
  }, [positions.map(p => p.ticker).join(',')])
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible' || !positions.length) return
      fetchQuotes(positions.map(p => p.ticker), true).then(map => setQuotes(prev => ({ ...prev, ...map })))
    }, 5 * 60000)
    return () => clearInterval(id)
  }, [positions.map(p => p.ticker).join(',')])

  const handleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  // Compute rows with derived values
  const rows = positions.map(p => {
    const q = quotes[p.ticker]
    const currentPrice = q?.price ?? null
    // prices are in the stock's own currency; money columns and totals are converted to USD at today's rate
    const cur          = q?.currency || 'USD'
    const fx           = cur === 'USD' ? 1 : (q?.fxToUsd ?? null)
    const cost         = fx != null ? p.buyPrice * p.qty * fx : null
    const value        = currentPrice != null && fx != null ? currentPrice * p.qty * fx : null
    const pnlAbs       = value != null && cost != null ? value - cost : null
    const pnlPct       = pnlAbs != null && cost ? (pnlAbs / cost) * 100 : null
    // YTD start price: your buy price if bought this year, otherwise the last close of the previous year.
    // No Dec 31 price (listed this year, or a data gap) and no 2026 purchase date → no YTD, never a guess.
    const boughtThisYear = !!(p.buyDate && Number(p.buyDate.slice(0, 4)) === YEAR)
    const noYearEnd      = !!(q && q.price != null && q.ytdBase == null)
    const ytdStart       = boughtThisYear ? p.buyPrice : (q?.ytdBase ?? null)
    const ytdFrom        = boughtThisYear ? `your buy price (bought ${p.buyDate})` : q?.ytdBase ? `the Dec 31 close ${fmtPrice(q.ytdBase)}` : null
    const ytdAbs         = currentPrice != null && ytdStart && fx != null ? (currentPrice - ytdStart) * p.qty * fx : null
    const ytdPct         = currentPrice != null && ytdStart ? (currentPrice / ytdStart - 1) * 100 : null
    const assumed        = !p.buyDate && q?.ytdBase != null
    const noStart        = noYearEnd && !boughtThisYear
    return { ...p, cur, fx, currentPrice, cost, value, pnlAbs, pnlPct, dayChangePct: q?.dayChangePct ?? null, ytdStart, ytdFrom, ytdAbs, ytdPct, assumed, noStart }
  })

  const sorted = [...rows].sort((a, b) => {
    if (!sort.key) return 0
    const va = a[sort.key] ?? null, vb = b[sort.key] ?? null
    if (va == null && vb == null) return 0
    if (va == null) return 1; if (vb == null) return -1
    return sort.dir === 'asc' ? va - vb : vb - va
  })

  // Totals
  // only positions whose price has loaded count — otherwise a loading row showed as a big fake loss
  const priced = rows.filter(r => r.cost != null && r.value != null)
  const totals = priced.reduce((acc, r) => { acc.cost += r.cost; acc.value += r.value; return acc }, { cost: 0, value: 0 })
  const pendingCount = rows.filter(r => r.currentPrice == null).length                      // price not loaded yet
  const noRate  = [...new Set(rows.filter(r => r.currentPrice != null && r.fx == null).map(r => r.cur))] // no exchange rate
  const foreign = [...new Set(rows.filter(r => r.cur !== 'USD' && r.fx != null).map(r => r.cur))]
  totals.pnl    = totals.value - totals.cost
  totals.pnlPct = totals.cost > 0 ? (totals.pnl / totals.cost) * 100 : null
  // YTD for the whole portfolio: total YTD $ ÷ total starting value (weighted, as brokers show it)
  const ytdRows = rows.filter(r => r.ytdAbs != null)
  totals.ytd      = ytdRows.reduce((s, r) => s + r.ytdAbs, 0)
  totals.ytdStart = ytdRows.reduce((s, r) => s + r.ytdStart * r.qty * r.fx, 0)
  totals.ytdPct   = totals.ytdStart > 0 ? (totals.ytd / totals.ytdStart) * 100 : null
  const money = v => (v >= 0 ? '+' : '−') + '$' + fmtLarge(Math.abs(v))
  const moneyExact = v => (v >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US')
  const pnlColor = v => v >= 0 ? '#00ff88' : '#ff4466'

  const SH = (label, key) => (
    <th style={thStyle('right', !!key)}
      onClick={() => key && handleSort(key)}>
      {label}{key && <SortIcon col={key} sort={sort} />}
    </th>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => setShowModal(true)}
          className="btn-primary px-4 py-2 rounded text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Plus size={12} /> Add Position
        </button>
        {ytdRows.length > 0 && (
          <div className="flex items-baseline gap-5 flex-wrap font-mono ml-auto" data-testid="ytd-summary">
            <span className="text-[12px] text-slate-500">{YEAR} so far{' '}
              <span style={{ color: pnlColor(totals.ytd), fontWeight: 700, fontSize: '15px' }}>{moneyExact(totals.ytd)}</span>{' '}
              <span style={{ color: pnlColor(totals.ytd), fontWeight: 600 }}>({fmtPct(totals.ytdPct)})</span>
            </span>
            {totals.value > 0 && (
              <span className="text-[12px] text-slate-500">All-time{' '}
                <span style={{ color: pnlColor(totals.pnl), fontWeight: 600 }}>{moneyExact(totals.pnl)} ({fmtPct(totals.pnlPct)})</span>
              </span>
            )}
          </div>
        )}
      </div>
      {(foreign.length > 0 || noRate.length > 0 || pendingCount > 0) && (
        <div className="text-[10px] font-mono text-slate-600">
          {foreign.length > 0 && <>Totals in USD · {foreign.join(', ')} prices converted at today's exchange rate. </>}
          {noRate.length > 0 && <span className="text-terminal-amber">No exchange rate right now for {noRate.join(', ')} — left out of the totals. </span>}
          {pendingCount > 0 && <>{pendingCount} position{pendingCount === 1 ? '' : 's'} still loading — not yet in the totals.</>}
        </div>
      )}

      {positions.length === 0 ? (
        <div className="panel p-12 text-center">
          <DollarSign size={24} className="text-slate-700 mx-auto mb-3" />
          <div className="font-mono text-[12px] text-slate-600 uppercase tracking-wider">Add your first position above</div>
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'40px'}} />
              <col style={{width:'90px'}} />
              <col style={{width:'65px'}} />
              <col style={{width:'110px'}} />
              <col style={{width:'110px'}} />
              <col style={{width:'115px'}} />
              <col style={{width:'115px'}} />
              <col style={{width:'100px'}} />
              <col style={{width:'100px'}} />
              <col style={{width:'105px'}} />
              <col style={{width:'105px'}} />
              <col style={{width:'115px'}} />
              <col style={{width:'100px'}} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle('center')}>#</th>
                <th style={thStyle('left')}>Ticker</th>
                <th style={thStyle('right')}>Qty</th>
                <th style={thStyle('right')}>Avg Buy</th>
                {SH('Current',        'currentPrice')}
                {SH('Cost Basis',     'cost')}
                {SH('Mkt Value',      'value')}
                {SH('P&L ($)',        'pnlAbs')}
                {SH('P&L (%)',        'pnlPct')}
                {SH(`YTD P&L ($)`,    'ytdAbs')}
                {SH(`YTD P&L (%)`,    'ytdPct')}
                {SH('Day Chg',        'dayChangePct')}
                <th style={thStyle('right')}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                const isLoading = loading.has(r.ticker)
                return (
                  <tr key={r.ticker} className="group">
                    <td style={{...tdStyle('center'), color:'#334155', fontSize:'11px'}}>{idx + 1}</td>
                    <td style={tdStyle('left')}><span style={{fontWeight:'700',fontSize:'13px',color:'#7dd3fc'}}>{r.ticker}</span></td>
                    <td style={tdStyle()}><span style={{color:'#cbd5e1'}}>{r.qty}</span></td>
                    <td style={tdStyle()}><span style={{color:'#94a3b8'}}>{fmtMoney(r.buyPrice, r.cur)}</span></td>
                    <td style={tdStyle()}>
                      {isLoading ? <span style={{color:'#475569',fontSize:'11px'}}>…</span>
                        : r.currentPrice != null ? <span style={{fontWeight:'600',color:'#f1f5f9'}}>{fmtMoney(r.currentPrice, r.cur)}{quotes[r.ticker]?.pxCheck?.status === 'warn' && <span title={`Price sources disagree (Finnhub ${fmtPrice(quotes[r.ticker].pxCheck.fh)}, ${quotes[r.ticker].pxCheck.diff}%) — check your broker`} style={{color:'#ffb800',marginLeft:4,cursor:'help'}}>⚠</span>}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()} title={r.cur !== 'USD' ? (r.fx != null ? `Converted to USD at today's rate (1 ${r.cur === 'GBX' ? 'penny' : r.cur === 'ILA' ? 'agora' : r.cur} = $${r.fx.toPrecision(3)}). Your buy price is taken as ${r.cur}.` : `No ${r.cur} exchange rate available right now — left out of the totals`) : undefined}><span style={{color:'#94a3b8'}}>{r.cost != null ? fmtPrice(r.cost) : '—'}</span></td>
                    <td style={tdStyle()}>
                      {r.value != null ? <span style={{fontWeight:'600',color:'#f1f5f9'}}>{fmtPrice(r.value)}</span> : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      {r.pnlAbs != null
                        ? <span style={{fontWeight:'700',color:r.pnlAbs>=0?'#00ff88':'#ff4466'}}>{r.pnlAbs>=0?'+':'−'}${fmtLarge(Math.abs(r.pnlAbs))}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      {r.pnlPct != null
                        ? <span style={{fontWeight:'700',color:r.pnlPct>=0?'#00ff88':'#ff4466'}}>{fmtPct(r.pnlPct)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()} title={r.ytdFrom ? `YTD from ${r.ytdFrom}` : r.noStart ? 'No Dec 31 price available — add a purchase date (✎) if you bought it this year' : 'Start-of-year price not available yet'}>
                      {r.ytdAbs != null
                        ? <span style={{fontWeight:'700',color:pnlColor(r.ytdAbs)}}>{money(r.ytdAbs)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()} title={r.ytdFrom ? `YTD from ${r.ytdFrom}` : r.noStart ? 'No Dec 31 price available — add a purchase date (✎) if you bought it this year' : 'Start-of-year price not available yet'}>
                      {r.ytdPct != null
                        ? <span style={{fontWeight:'700',color:pnlColor(r.ytdPct)}}>{fmtPct(r.ytdPct)}{r.assumed && <span title="No purchase date — counted from the Dec 31 close. If you bought it this year, add the date with ✎." style={{color:'#475569',fontWeight:400,cursor:'help'}}> *</span>}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      {r.dayChangePct != null
                        ? <span style={{color:r.dayChangePct>0?'#00ff88':r.dayChangePct<0?'#ff4466':'#64748b'}}>{fmtPct(r.dayChangePct)}</span>
                        : <span style={{color:'#475569'}}>—</span>}
                    </td>
                    <td style={tdStyle()}>
                      <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {onAnalyze && (
                          <button onClick={() => onAnalyze(r.ticker)}
                            style={{fontSize:'10px',fontFamily:'IBM Plex Mono',color:'#38bdf8',border:'1px solid rgba(14,165,233,0.2)',padding:'2px 8px',borderRadius:'4px',background:'transparent',cursor:'pointer'}}>
                            Analyze →
                          </button>
                        )}
                        {onUpdate && (
                          <button onClick={() => setEditPos(positions.find(p => p.ticker === r.ticker))} title="Edit quantity, buy price or purchase date" aria-label={`Edit ${r.ticker}`}
                            style={{color:'#64748b',background:'transparent',border:'none',cursor:'pointer',fontSize:'13px'}}>✎</button>
                        )}
                        <button onClick={() => onRemove(r.ticker)} style={{color:'#475569',background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center'}}>
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* Totals row */}
              {totals.value > 0 && (
                <tr style={{borderTop:'2px solid rgba(14,165,233,0.2)',background:'rgba(14,165,233,0.03)'}}>
                  <td style={{...tdStyle('center'), color:'#475569', fontSize:'11px', padding:'12px'}}></td>
                  <td colSpan={4} style={{padding:'12px',fontFamily:'IBM Plex Mono,monospace',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.1em',color:'#475569'}}>
                    Total ({positions.length} positions)
                  </td>
                  <td style={{padding:'12px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',fontSize:'13px',color:'#94a3b8'}}>
                    {fmtPrice(totals.cost)}
                  </td>
                  <td style={{padding:'12px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',fontSize:'13px',color:'#f1f5f9'}}>
                    {fmtPrice(totals.value)}
                  </td>
                  <td style={{padding:'12px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',fontSize:'13px',color:totals.pnl>=0?'#00ff88':'#ff4466'}}>
                    {totals.pnl>=0?'+':'−'}${fmtLarge(Math.abs(totals.pnl))}
                  </td>
                  <td style={{padding:'12px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',fontSize:'13px',color:totals.pnlPct!=null&&totals.pnlPct>=0?'#00ff88':'#ff4466'}}>
                    {totals.pnlPct != null ? fmtPct(totals.pnlPct) : '—'}
                  </td>
                  <td style={{padding:'12px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',fontSize:'13px',color:pnlColor(totals.ytd)}}>
                    {ytdRows.length ? money(totals.ytd) : '—'}
                  </td>
                  <td style={{padding:'12px',textAlign:'right',fontFamily:'IBM Plex Mono,monospace',fontWeight:'700',fontSize:'13px',color:totals.ytdPct!=null&&totals.ytdPct>=0?'#00ff88':'#ff4466'}}>
                    {totals.ytdPct != null ? fmtPct(totals.ytdPct) : '—'}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <AddPositionModal onClose={() => setShowModal(false)} onAdd={(pos) => { onAdd(pos); setShowModal(false) }} />}
      {editPos && <AddPositionModal initial={editPos} onClose={() => setEditPos(null)} onAdd={(pos) => { onUpdate(pos); setEditPos(null) }} />}
    </div>
  )
}



function ImportIdSection({ onClose }) {
  const [val, setVal] = useState('')
  const [applied, setApplied] = useState(false)

  const handleApply = () => {
    const id = val.trim()
    if (!id.startsWith('u_')) return
    try { localStorage.setItem('mc_user_id', id) } catch(e) {}
    // Also save to cookie for Safari
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 2)
    document.cookie = 'mc_user_id=' + id + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax'
    setApplied(true)
    setTimeout(() => {
      onClose()
      window.location.reload()
    }, 1000)
  }

  return (
    <div>
      <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Import ID from another device</div>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Paste ID here (u_...)"
          className="flex-1 bg-navy-900 border border-white/10 rounded px-3 py-1.5 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40"
        />
        <button
          onClick={handleApply}
          disabled={!val.startsWith('u_')}
          className={`px-3 py-1.5 rounded text-[11px] font-mono font-semibold border transition-all flex-shrink-0 ${
            applied
              ? 'border-terminal-green/40 bg-terminal-green/10 text-terminal-green'
              : 'border-electric-500/30 bg-electric-500/10 text-electric-400 hover:border-electric-500/50 disabled:opacity-40'
          }`}
        >
          {applied ? '✓ Applied!' : 'Apply'}
        </button>
      </div>
    </div>
  )
}

// ── User ID Badge ─────────────────────────────────────────────
function UserIdBadge({ userId, onReset }) {
  const [copied, setCopied] = useState(false)
  const [show, setShow] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(userId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShow(s => !s)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 bg-white/[0.02] hover:border-electric-500/30 hover:bg-electric-500/5 transition-all"
        title="Device sync ID"
      >
        <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">Sync ID</span>
        <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse-slow" />
      </button>

      {show && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          zIndex: 9999,
          width: 320,
          background: '#0a1628',
          border: '1px solid rgba(14,165,233,0.3)',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        }}>
          <div className="font-mono text-[11px] text-slate-400 mb-2 uppercase tracking-wider">Your Device Sync ID</div>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 font-mono text-[11px] text-electric-300 bg-navy-900 px-3 py-2 rounded border border-white/10 truncate">
              {userId}
            </code>
            <button
              onClick={handleCopy}
              className={`px-3 py-2 rounded text-[11px] font-mono font-semibold border transition-all flex-shrink-0 ${
                copied
                  ? 'border-terminal-green/40 bg-terminal-green/10 text-terminal-green'
                  : 'border-electric-500/30 bg-electric-500/10 text-electric-400 hover:border-electric-500/50'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="font-mono text-[10px] text-slate-500 mb-3 leading-relaxed">
            To sync on another device, copy your ID above, open the dashboard on that device, paste it below and click Apply.
          </div>
          <ImportIdSection onClose={() => setShow(false)} />
          <button onClick={() => { onReset && onReset(); setShow(false) }} className="w-full mt-3 py-1.5 rounded border border-terminal-red/30 bg-terminal-red/10 text-[10px] font-mono text-terminal-red hover:bg-terminal-red/20 transition-all">Switch to different ID</button>
          <button onClick={() => setShow(false)} className="absolute top-3 right-3 text-slate-600 hover:text-slate-400 font-mono text-[12px]">✕</button>
        </div>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────
export default function CustomPortfolios({ onAnalyze }) {
  const [portfolios,   setPortfolios]   = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const [deleteConfirm,setDeleteConfirm]= useState(null)
  const [syncing,      setSyncing]      = useState(false)
  const [syncStatus,   setSyncStatus]   = useState('') // 'saved' | 'error' | ''
  const [userId,  setUserId]  = useState(() => getSavedId())
  const [loadTick, setLoadTick] = useState(0)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const saveTimer = useRef(null)
  // Saves always go to the CURRENT ID, and only after that ID's portfolios have loaded —
  // otherwise a save could write an empty/other list over what is stored in the Sheet
  const uidRef = useRef(userId); uidRef.current = userId
  const loadedFor = useRef(null), firstLoad = useRef(true)

  const applyId = async (raw) => {
    const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (clean.length < 3) { setPinError('At least 3 characters'); return }
    const newId = clean.startsWith('u_') ? clean : 'u_' + clean
    
    // Check if there's an old random ID to migrate from
    const oldId = getSavedId()
    if (oldId && oldId !== newId && oldId.startsWith('u_') && oldId.length > 15) {
      // Looks like a random ID — trigger server-side migration
      try {
        await jsonp(APPS_SCRIPT_URL + '?action=migratePortfolioId&oldId=' + encodeURIComponent(oldId) + '&newId=' + encodeURIComponent(newId))
      } catch(e) {}
    }
    
    saveId(newId)
    setUserId(newId)
    setPinError('')
  }

  // Load from Sheet whenever the ID is set or changes
  useEffect(() => {
    if (!userId) return
    let alive = true
    loadedFor.current = null
    setSyncing(true)
    const localCopy = () => { try { return JSON.parse(localStorage.getItem('mc_custom_portfolios_v1') || '[]') } catch { return [] } }
    loadFromSheet(userId).then(data => {
      if (!alive || uidRef.current !== userId) return                 // an answer for an ID that is no longer active
      if (data === null && !firstLoad.current) {                      // switched ID but the Sheet didn't answer: show nothing, save nothing, retry
        setPortfolios([]); setActiveId(null); setSyncStatus('error'); setSyncing(false)
        setTimeout(() => alive && setLoadTick(t => t + 1), 15000)
        return
      }
      if (data && data.length > 0) { setPortfolios(data); setActiveId(data[0].id) }
      else if (firstLoad.current) {                                   // this browser's copy (offline, or one-time migration) — as before
        const local = localCopy()
        setPortfolios(local); setActiveId(local.length ? local[0].id : null)
      } else { setPortfolios([]); setActiveId(null) }                 // a different ID with nothing stored yet
      if (data !== null) setSyncStatus('')
      firstLoad.current = false
      loadedFor.current = userId
      setSyncing(false)
    })
    return () => { alive = false }
  }, [userId, loadTick])

  // Auto-save to Sheet with debounce
  const persistPortfolios = useCallback((updated) => {
    setPortfolios(updated)
    try { localStorage.setItem('mc_custom_portfolios_v1', JSON.stringify(updated)) } catch (e) {}   // a full/blocked browser store must not stop the cloud save
    clearTimeout(saveTimer.current)
    const uid = uidRef.current
    if (!uid) return                                                   // no ID yet → this browser only
    const attempt = async (retry) => {
      if (uidRef.current !== uid) return                               // ID changed since → never write to the old one
      if (loadedFor.current !== uid) { saveTimer.current = setTimeout(() => attempt(retry), 1500); return }   // wait for the load
      try {
        await saveToSheet(uid, updated)
        setSyncStatus('saved')
        setTimeout(() => setSyncStatus(''), 2000)
      } catch {
        setSyncStatus('error')                                   // stays visible until a save succeeds
        if (retry) saveTimer.current = setTimeout(() => attempt(false), 15000)
      }
    }
    saveTimer.current = setTimeout(() => attempt(true), 1000)
  }, [])

  useEffect(() => {
    if (portfolios.length && !portfolios.find(p => p.id === activeId)) setActiveId(portfolios[0].id)
  }, [portfolios])

  const active = portfolios.find(p => p.id === activeId)

  const handleCreate = (portfolio) => { persistPortfolios([...portfolios, portfolio]); setActiveId(portfolio.id) }
  const handleRename = (id) => {
    const val = renameVal.trim()
    if (!val) return
    persistPortfolios(portfolios.map(p => p.id === id ? { ...p, name: val } : p))
    setRenamingId(null); setRenameVal('')
  }
  const handleDelete = (id) => { persistPortfolios(portfolios.filter(p => p.id !== id)); setDeleteConfirm(null) }
  const handleAddTracking = (ticker) => {
    persistPortfolios(portfolios.map(p =>
      p.id === activeId && !p.positions.find(pos => pos.ticker === ticker)
        ? { ...p, positions: [...p.positions, { ticker, addedAt: Date.now() }] } : p
    ))
  }
  const handleAddInvestment = (position) => {
    persistPortfolios(portfolios.map(p =>
      p.id === activeId && !p.positions.find(pos => pos.ticker === position.ticker)
        ? { ...p, positions: [...p.positions, position] } : p
    ))
  }
  const handleUpdateInvestment = (position) => {
    persistPortfolios(portfolios.map(p =>
      p.id === activeId ? { ...p, positions: p.positions.map(pos => pos.ticker === position.ticker ? { ...pos, ...position, buyDate: position.buyDate } : pos) } : p
    ))
  }
  const handleRemove = (ticker) => {
    persistPortfolios(portfolios.map(p =>
      p.id === activeId ? { ...p, positions: p.positions.filter(pos => pos.ticker !== ticker) } : p
    ))
  }


  // Show setup screen if no ID saved
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
        <div className="panel-bright w-full max-w-sm p-6 space-y-5">
          <div className="text-center">
            <div className="font-display font-bold text-xl text-white mb-2">Set Your Portfolio ID</div>
            <div className="font-mono text-[11px] text-slate-500 leading-relaxed">
              Choose any name you remember. Type the same name on any device to access your portfolios.
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">Your ID</label>
            <input autoFocus value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError('') }}
              onKeyDown={e => e.key === 'Enter' && applyId(pinInput)}
              placeholder="e.g. michael, mc2026"
              className="w-full bg-navy-800/60 border border-white/10 rounded px-4 py-3 text-[14px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40"
            />
            {pinError && <div className="font-mono text-[11px] text-terminal-red mt-1">{pinError}</div>}
            <div className="font-mono text-[10px] text-slate-600 mt-1">Letters and numbers only, min 3 chars.</div>
          </div>
          <button onClick={() => applyId(pinInput)} disabled={!pinInput.trim()}
            className="w-full btn-primary py-3 rounded font-mono text-[13px] font-semibold uppercase tracking-wider disabled:opacity-40">
            Save & Continue →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tabs row */}
      <div className="flex items-center gap-2 flex-wrap">
        {portfolios.map(p => (
          <div key={p.id} className="relative group/tab">
            {renamingId === p.id ? (
              <div className="flex items-center gap-1 px-3 py-2 rounded border border-electric-500/40 bg-electric-500/10">
                <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') { setRenamingId(null); setRenameVal('') } }}
                  className="bg-transparent text-[12px] font-mono text-white focus:outline-none w-32" />
                <button onClick={() => handleRename(p.id)} className="text-terminal-green"><Check size={12} /></button>
                <button onClick={() => { setRenamingId(null); setRenameVal('') }} className="text-slate-500"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => setActiveId(p.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded border text-[12px] font-mono transition-all ${
                  activeId === p.id ? 'border-electric-500/50 bg-electric-500/10 text-electric-300' : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.type === 'investment' ? 'bg-terminal-amber' : 'bg-terminal-green'}`} />
                {p.name}
                <span className="text-[10px] text-slate-600">({p.positions.length})</span>
              </button>
            )}
            {renamingId !== p.id && (
              <div className="absolute -top-2 -right-2 hidden group-hover/tab:flex items-center gap-0.5 bg-navy-900 border border-white/10 rounded-full px-1 py-0.5 z-10">
                <button onClick={() => { setRenamingId(p.id); setRenameVal(p.name) }} className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors" title="Rename"><Edit2 size={10} /></button>
                <button onClick={() => setDeleteConfirm(p.id)} className="text-slate-500 hover:text-terminal-red p-0.5 transition-colors" title="Delete"><Trash2 size={10} /></button>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded border border-dashed border-white/20 text-[12px] font-mono text-slate-600 hover:text-slate-300 hover:border-white/30 transition-all">
          <Plus size={12} /> New
        </button>

        {/* Sync status + User ID */}
        <div className="ml-auto flex items-center gap-3">
          {syncing && <span className="font-mono text-[10px] text-slate-600 uppercase tracking-wider animate-pulse">Syncing…</span>}
          {syncStatus === 'saved' && <span className="font-mono text-[10px] text-terminal-green uppercase tracking-wider">✓ Saved</span>}
          {syncStatus === 'error' && <span title="Your changes are kept on this device and will be saved again automatically. If this persists, check your connection." className="font-mono text-[10px] text-terminal-red uppercase tracking-wider">⚠ Not saved to the cloud — kept on this device</span>}
          <UserIdBadge userId={userId} onReset={() => { clearTimeout(saveTimer.current); saveId(''); setUserId(null); setPortfolios([]); setActiveId(null) }} />
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="panel p-4 border-terminal-red/20 bg-terminal-red/5 flex items-center justify-between">
          <span className="font-mono text-[12px] text-slate-300">Delete <span className="text-white font-semibold">"{portfolios.find(p => p.id === deleteConfirm)?.name}"</span>? Cannot be undone.</span>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded border border-white/10 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="px-3 py-1.5 rounded border border-terminal-red/40 bg-terminal-red/10 text-[11px] font-mono text-terminal-red hover:bg-terminal-red/20 transition-all">Delete</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {portfolios.length === 0 && !syncing && (
        <div className="panel p-16 text-center">
          <BarChart2 size={32} className="text-slate-700 mx-auto mb-4" />
          <div className="font-display font-semibold text-[16px] text-slate-400 mb-2">No portfolios yet</div>
          <div className="font-mono text-[12px] text-slate-600 mb-6">Create your first portfolio to start tracking stocks</div>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-6 py-2.5 rounded font-mono text-[12px] font-semibold uppercase tracking-wider inline-flex items-center gap-2">
            <Plus size={14} /> Create Portfolio
          </button>
        </div>
      )}

      {syncing && !active && (
        <div className="panel p-12 text-center font-mono text-[11px] text-slate-600 uppercase tracking-wider animate-pulse">Loading your portfolios…</div>
      )}

      {/* Active portfolio */}
      {active && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${
              active.type === 'investment' ? 'border-terminal-amber/30 bg-terminal-amber/10 text-terminal-amber' : 'border-terminal-green/30 bg-terminal-green/10 text-terminal-green'
            }`}>
              {active.type === 'investment' ? '💰 Investment' : '👁 Tracking'}
            </span>
            <span className="font-mono text-[11px] text-slate-600">{active.positions.length} position{active.positions.length !== 1 ? 's' : ''}</span>
          </div>
          {active.type === 'tracking'
            ? <TrackingTable positions={active.positions} onRemove={handleRemove} onAdd={handleAddTracking} onAnalyze={onAnalyze} />
            : <InvestmentTable positions={active.positions} onRemove={handleRemove} onAdd={handleAddInvestment} onUpdate={handleUpdateInvestment} onAnalyze={onAnalyze} />
          }
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
