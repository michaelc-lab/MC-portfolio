import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Edit2, Trash2, Check, TrendingUp, DollarSign, BarChart2, Search, ChevronDown } from 'lucide-react'
import { fmtPrice, fmtPct, fmtLarge } from '../lib/utils'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUQqqI6PAa64xq5ZALeJSUWuy86pVtSEG6rIMhgNOQ-7XS-t7PJRRncJ1mi7OAwd0/exec'
const STORAGE_KEY = 'mc_custom_portfolios_v1'
const QUOTE_CACHE = {}
const QUOTE_TTL = 120000 // 2 min cache

// ── Storage helpers ───────────────────────────────────────────
function loadPortfolios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePortfolios(portfolios) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolios)) } catch {}
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── JSONP quote fetcher ───────────────────────────────────────
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout')) }, 15000)
    function cleanup() { clearTimeout(timeout); delete window[cbName]; if (script.parentNode) script.parentNode.removeChild(script) }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('Failed')) }
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}

async function fetchQuote(ticker) {
  const now = Date.now()
  if (QUOTE_CACHE[ticker] && now - QUOTE_CACHE[ticker].ts < QUOTE_TTL) {
    return QUOTE_CACHE[ticker].data
  }
  try {
    const data = await jsonp(`${APPS_SCRIPT_URL}?action=getQuote&ticker=${encodeURIComponent(ticker)}`)
    if (data && data.price != null) {
      QUOTE_CACHE[ticker] = { ts: now, data }
      return data
    }
    return null
  } catch { return null }
}

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
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Portfolio Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Tech Bets, My Holdings, Crypto Plays"
              className="w-full bg-navy-800/60 border border-white/10 rounded px-4 py-2.5 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">Portfolio Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'tracking', icon: TrendingUp, title: 'Tracking', desc: 'Watch prices & changes. No buy price needed.' },
                { id: 'investment', icon: DollarSign, title: 'Investment', desc: 'Track P&L. Enter avg buy price & quantity.' },
              ].map(({ id, icon: Icon, title, desc }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    type === id
                      ? 'border-electric-500/60 bg-electric-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <Icon size={16} className={type === id ? 'text-electric-400 mb-2' : 'text-slate-500 mb-2'} />
                  <div className={`font-display font-semibold text-[13px] mb-1 ${type === id ? 'text-white' : 'text-slate-400'}`}>{title}</div>
                  <div className="text-[11px] font-mono text-slate-600 leading-relaxed">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded border border-white/10 text-[12px] font-mono text-slate-500 hover:text-slate-300 hover:border-white/20 transition-all">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 btn-primary px-4 py-2.5 rounded text-[12px] font-mono font-semibold uppercase tracking-wider disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Position Modal (Investment type) ──────────────────────
function AddPositionModal({ onClose, onAdd }) {
  const [ticker, setTicker] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [qty, setQty] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    const t = ticker.trim().toUpperCase()
    const p = parseFloat(buyPrice)
    const q = parseFloat(qty)
    if (!t) return setError('Enter a ticker')
    if (isNaN(p) || p <= 0) return setError('Enter a valid buy price')
    if (isNaN(q) || q <= 0) return setError('Enter a valid quantity')
    onAdd({ ticker: t, buyPrice: p, qty: q, addedAt: Date.now() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-bright w-full max-w-sm mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-[16px] text-white">Add Position</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Ticker</label>
            <input autoFocus value={ticker} onChange={e => { setTicker(e.target.value.toUpperCase()); setError('') }}
              placeholder="NVDA"
              className="w-full bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[13px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-electric-500/40 uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Avg Buy Price ($)</label>
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
          {error && <div className="text-[11px] font-mono text-terminal-red">{error}</div>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded border border-white/10 text-[12px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
          <button onClick={handleAdd} className="flex-1 btn-primary px-4 py-2 rounded text-[12px] font-mono font-semibold uppercase tracking-wider">Add</button>
        </div>
      </div>
    </div>
  )
}

// ── Tracking Portfolio Table ──────────────────────────────────
function TrackingTable({ positions, onRemove, onAnalyze }) {
  const [quotes, setQuotes] = useState({})
  const [loadingTickers, setLoadingTickers] = useState(new Set())
  const [search, setSearch] = useState('')
  const [addTicker, setAddTicker] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    positions.forEach(async (p) => {
      if (quotes[p.ticker]) return
      setLoadingTickers(prev => new Set([...prev, p.ticker]))
      const q = await fetchQuote(p.ticker)
      if (q) setQuotes(prev => ({ ...prev, [p.ticker]: q }))
      setLoadingTickers(prev => { const s = new Set(prev); s.delete(p.ticker); return s })
    })
  }, [positions])

  const handleAdd = async () => {
    const t = addTicker.trim().toUpperCase()
    if (!t || positions.find(p => p.ticker === t)) return
    setAdding(true)
    onAdd(t)
    setAddTicker('')
    setAdding(false)
  }

  const filtered = positions.filter(p =>
    p.ticker.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Add ticker bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={addTicker} onChange={e => setAddTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add ticker (e.g. NVDA, AAPL)…"
            className="w-full bg-navy-800/60 border border-white/10 rounded px-8 py-2 text-[12px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40 uppercase"
          />
        </div>
        <button onClick={handleAdd} disabled={!addTicker.trim() || adding}
          className="btn-primary px-4 py-2 rounded text-[11px] font-mono font-semibold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1.5">
          <Plus size={12} /> Add
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="panel p-12 text-center">
          <TrendingUp size={24} className="text-slate-700 mx-auto mb-3" />
          <div className="font-mono text-[12px] text-slate-600 uppercase tracking-wider">No stocks yet — add your first ticker above</div>
        </div>
      ) : (
        <div className="panel overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th className="text-right">Price</th>
                <th className="text-right">Δ Today</th>
                <th className="text-right">Δ 7d</th>
                <th className="text-right">ATH Drawdown</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const q = quotes[p.ticker]
                const isLoading = loadingTickers.has(p.ticker)
                return (
                  <tr key={p.ticker} className="group">
                    <td><span className="font-mono font-bold text-[13px] text-electric-300">{p.ticker}</span></td>
                    <td className="text-right">
                      {isLoading ? <span className="text-slate-600 text-[11px] animate-pulse">loading…</span>
                        : q ? <span className="font-mono font-semibold text-slate-200">{fmtPrice(q.price)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {q?.dayChangePct != null
                        ? <span className={`font-mono text-[12px] ${q.dayChangePct > 0 ? 'positive' : q.dayChangePct < 0 ? 'negative' : 'neutral'}`}>{fmtPct(q.dayChangePct)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {q?.weekChangePct != null
                        ? <span className={`font-mono text-[12px] ${q.weekChangePct > 0 ? 'positive' : q.weekChangePct < 0 ? 'negative' : 'neutral'}`}>{fmtPct(q.weekChangePct)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {q?.dd != null
                        ? <span className={`font-mono text-[12px] ${q.dd >= -0.5 ? 'positive' : q.dd >= -20 ? 'accent' : q.dd >= -50 ? 'text-yellow-500' : 'negative'}`}>{fmtPct(q.dd, 1)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onAnalyze && (
                          <button onClick={() => onAnalyze(p.ticker)}
                            className="text-[10px] font-mono text-electric-400 hover:text-electric-300 border border-electric-500/20 hover:border-electric-500/40 px-2 py-0.5 rounded transition-all">
                            Analyze →
                          </button>
                        )}
                        <button onClick={() => onRemove(p.ticker)} className="text-slate-600 hover:text-terminal-red transition-colors">
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

// ── Investment Portfolio Table ────────────────────────────────
function InvestmentTable({ positions, onRemove, onAdd, onAnalyze }) {
  const [quotes, setQuotes] = useState({})
  const [loadingTickers, setLoadingTickers] = useState(new Set())
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    positions.forEach(async (p) => {
      if (quotes[p.ticker]) return
      setLoadingTickers(prev => new Set([...prev, p.ticker]))
      const q = await fetchQuote(p.ticker)
      if (q) setQuotes(prev => ({ ...prev, [p.ticker]: q }))
      setLoadingTickers(prev => { const s = new Set(prev); s.delete(p.ticker); return s })
    })
  }, [positions])

  // Totals
  const totals = positions.reduce((acc, p) => {
    const q = quotes[p.ticker]
    if (!q?.price) return acc
    const cost = p.buyPrice * p.qty
    const value = q.price * p.qty
    acc.cost += cost
    acc.value += value
    acc.pnl += value - cost
    return acc
  }, { cost: 0, value: 0, pnl: 0 })

  const totalPnlPct = totals.cost > 0 ? (totals.pnl / totals.cost) * 100 : null

  return (
    <div className="space-y-3">
      {/* Add position button */}
      <div className="flex justify-between items-center">
        <button onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2 rounded text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Plus size={12} /> Add Position
        </button>
        {totals.value > 0 && (
          <div className="flex items-center gap-4 font-mono text-[12px]">
            <span className="text-slate-500">Total Value: <span className="text-slate-200 font-semibold">{fmtPrice(totals.value)}</span></span>
            <span className="text-slate-500">P&L: <span className={`font-semibold ${totals.pnl >= 0 ? 'positive' : 'negative'}`}>{totals.pnl >= 0 ? '+' : ''}${fmtLarge(Math.abs(totals.pnl))} ({totalPnlPct != null ? fmtPct(totalPnlPct) : '—'})</span></span>
          </div>
        )}
      </div>

      {positions.length === 0 ? (
        <div className="panel p-12 text-center">
          <DollarSign size={24} className="text-slate-700 mx-auto mb-3" />
          <div className="font-mono text-[12px] text-slate-600 uppercase tracking-wider">No positions yet — add your first position above</div>
        </div>
      ) : (
        <div className="panel overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Avg Buy</th>
                <th className="text-right">Current</th>
                <th className="text-right">Value</th>
                <th className="text-right">P&L $</th>
                <th className="text-right">P&L %</th>
                <th className="text-right">Δ Today</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => {
                const q = quotes[p.ticker]
                const isLoading = loadingTickers.has(p.ticker)
                const currentPrice = q?.price
                const value = currentPrice != null ? currentPrice * p.qty : null
                const cost = p.buyPrice * p.qty
                const pnlAbs = value != null ? value - cost : null
                const pnlPct = pnlAbs != null ? (pnlAbs / cost) * 100 : null

                return (
                  <tr key={p.ticker} className="group">
                    <td><span className="font-mono font-bold text-[13px] text-electric-300">{p.ticker}</span></td>
                    <td className="text-right"><span className="font-mono text-[12px] text-slate-300">{p.qty}</span></td>
                    <td className="text-right"><span className="font-mono text-[12px] text-slate-400">{fmtPrice(p.buyPrice)}</span></td>
                    <td className="text-right">
                      {isLoading ? <span className="text-slate-600 text-[11px] animate-pulse">…</span>
                        : currentPrice != null ? <span className="font-mono font-semibold text-slate-200">{fmtPrice(currentPrice)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {value != null ? <span className="font-mono text-[12px] text-slate-200">{fmtPrice(value)}</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {pnlAbs != null
                        ? <span className={`font-mono text-[12px] font-semibold ${pnlAbs >= 0 ? 'positive' : 'negative'}`}>{pnlAbs >= 0 ? '+' : '-'}${fmtLarge(Math.abs(pnlAbs))}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {pnlPct != null
                        ? <span className={`font-mono text-[12px] font-semibold ${pnlPct >= 0 ? 'positive' : 'negative'}`}>{fmtPct(pnlPct)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="text-right">
                      {q?.dayChangePct != null
                        ? <span className={`font-mono text-[12px] ${q.dayChangePct > 0 ? 'positive' : q.dayChangePct < 0 ? 'negative' : 'neutral'}`}>{fmtPct(q.dayChangePct)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onAnalyze && (
                          <button onClick={() => onAnalyze(p.ticker)}
                            className="text-[10px] font-mono text-electric-400 hover:text-electric-300 border border-electric-500/20 hover:border-electric-500/40 px-2 py-0.5 rounded transition-all">
                            Analyze →
                          </button>
                        )}
                        <button onClick={() => onRemove(p.ticker)} className="text-slate-600 hover:text-terminal-red transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* Totals row */}
              {totals.value > 0 && (
                <tr className="border-t border-electric-500/20">
                  <td colSpan={4} className="font-mono text-[11px] uppercase tracking-wider text-slate-500 pt-3">Portfolio Total</td>
                  <td className="text-right font-mono font-bold text-slate-200">{fmtPrice(totals.value)}</td>
                  <td className="text-right font-mono font-bold">
                    <span className={totals.pnl >= 0 ? 'positive' : 'negative'}>
                      {totals.pnl >= 0 ? '+' : '-'}${fmtLarge(Math.abs(totals.pnl))}
                    </span>
                  </td>
                  <td className="text-right font-mono font-bold">
                    {totalPnlPct != null && <span className={totalPnlPct >= 0 ? 'positive' : 'negative'}>{fmtPct(totalPnlPct)}</span>}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddPositionModal
          onClose={() => setShowAddModal(false)}
          onAdd={(pos) => { onAdd(pos); setShowAddModal(false) }}
        />
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────
export default function CustomPortfolios({ onAnalyze }) {
  const [portfolios, setPortfolios] = useState(loadPortfolios)
  const [activeId, setActiveId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Persist on every change
  useEffect(() => { savePortfolios(portfolios) }, [portfolios])

  // Auto-select first portfolio
  useEffect(() => {
    if (portfolios.length && !activeId) setActiveId(portfolios[0].id)
    if (!portfolios.find(p => p.id === activeId) && portfolios.length) setActiveId(portfolios[0].id)
  }, [portfolios])

  const active = portfolios.find(p => p.id === activeId)

  const handleCreate = (portfolio) => {
    setPortfolios(prev => [...prev, portfolio])
    setActiveId(portfolio.id)
  }

  const handleRename = (id) => {
    const val = renameVal.trim()
    if (!val) return
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, name: val } : p))
    setRenamingId(null)
    setRenameVal('')
  }

  const handleDelete = (id) => {
    setPortfolios(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
    if (activeId === id) setActiveId(null)
  }

  // Add ticker (tracking)
  const handleAddTracking = (ticker) => {
    setPortfolios(prev => prev.map(p =>
      p.id === activeId && !p.positions.find(pos => pos.ticker === ticker)
        ? { ...p, positions: [...p.positions, { ticker, addedAt: Date.now() }] }
        : p
    ))
  }

  // Add position (investment)
  const handleAddInvestment = (position) => {
    setPortfolios(prev => prev.map(p =>
      p.id === activeId && !p.positions.find(pos => pos.ticker === position.ticker)
        ? { ...p, positions: [...p.positions, position] }
        : p
    ))
  }

  const handleRemove = (ticker) => {
    setPortfolios(prev => prev.map(p =>
      p.id === activeId
        ? { ...p, positions: p.positions.filter(pos => pos.ticker !== ticker) }
        : p
    ))
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Portfolio tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {portfolios.map(p => (
          <div key={p.id} className="relative group/tab">
            {renamingId === p.id ? (
              <div className="flex items-center gap-1 px-3 py-2 rounded border border-electric-500/40 bg-electric-500/10">
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') { setRenamingId(null); setRenameVal('') } }}
                  className="bg-transparent text-[12px] font-mono text-white focus:outline-none w-32"
                />
                <button onClick={() => handleRename(p.id)} className="text-terminal-green"><Check size={12} /></button>
                <button onClick={() => { setRenamingId(null); setRenameVal('') }} className="text-slate-500"><X size={12} /></button>
              </div>
            ) : (
              <button
                onClick={() => setActiveId(p.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded border text-[12px] font-mono transition-all ${
                  activeId === p.id
                    ? 'border-electric-500/50 bg-electric-500/10 text-electric-300'
                    : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${p.type === 'investment' ? 'bg-terminal-amber' : 'bg-terminal-green'}`} />
                {p.name}
                <span className="text-[10px] text-slate-600">({p.positions.length})</span>
              </button>
            )}

            {/* Tab actions on hover */}
            {renamingId !== p.id && (
              <div className="absolute -top-2 -right-2 hidden group-hover/tab:flex items-center gap-0.5 bg-navy-900 border border-white/10 rounded-full px-1 py-0.5 z-10">
                <button
                  onClick={() => { setRenamingId(p.id); setRenameVal(p.name) }}
                  className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
                  title="Rename"
                >
                  <Edit2 size={10} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(p.id)}
                  className="text-slate-500 hover:text-terminal-red p-0.5 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* New portfolio button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded border border-dashed border-white/20 text-[12px] font-mono text-slate-600 hover:text-slate-300 hover:border-white/30 transition-all"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="panel p-4 border-terminal-red/20 bg-terminal-red/5 flex items-center justify-between">
          <span className="font-mono text-[12px] text-slate-300">
            Delete <span className="text-white font-semibold">"{portfolios.find(p => p.id === deleteConfirm)?.name}"</span>? This cannot be undone.
          </span>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded border border-white/10 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="px-3 py-1.5 rounded border border-terminal-red/40 bg-terminal-red/10 text-[11px] font-mono text-terminal-red hover:bg-terminal-red/20 transition-all">Delete</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {portfolios.length === 0 && (
        <div className="panel p-16 text-center">
          <BarChart2 size={32} className="text-slate-700 mx-auto mb-4" />
          <div className="font-display font-semibold text-[16px] text-slate-400 mb-2">No portfolios yet</div>
          <div className="font-mono text-[12px] text-slate-600 mb-6">Create your first portfolio to start tracking stocks</div>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-6 py-2.5 rounded font-mono text-[12px] font-semibold uppercase tracking-wider inline-flex items-center gap-2">
            <Plus size={14} /> Create Portfolio
          </button>
        </div>
      )}

      {/* Active portfolio content */}
      {active && (
        <div className="space-y-3">
          {/* Portfolio header */}
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${
              active.type === 'investment'
                ? 'border-terminal-amber/30 bg-terminal-amber/10 text-terminal-amber'
                : 'border-terminal-green/30 bg-terminal-green/10 text-terminal-green'
            }`}>
              {active.type === 'investment' ? '💰 Investment' : '👁 Tracking'}
            </span>
            <span className="font-mono text-[11px] text-slate-600">{active.positions.length} position{active.positions.length !== 1 ? 's' : ''}</span>
          </div>

          {active.type === 'tracking' ? (
            <TrackingTable
              positions={active.positions}
              onRemove={handleRemove}
              onAdd={handleAddTracking}
              onAnalyze={onAnalyze}
            />
          ) : (
            <InvestmentTable
              positions={active.positions}
              onRemove={handleRemove}
              onAdd={handleAddInvestment}
              onAnalyze={onAnalyze}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
