import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import { fmtPrice, fmtPct, pctClass, statusBadgeClass, ddClass, sortRows, filterRows } from '../lib/utils'

const COLS_PORTFOLIO = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'company', label: 'Company' },
  { key: 'sector', label: 'Sector' },
  { key: 'price', label: 'Price', num: true },
  { key: 'ath', label: 'ATH', num: true },
  { key: 'dd', label: 'Δ ATH', num: true },
  { key: 'dayChangePct', label: 'Δ Today', num: true },
  { key: 'weekChangePct', label: 'Δ 7d', num: true },
  { key: 'status', label: 'Status' },
]

const COLS_WATCHLIST = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'company', label: 'Company' },
  { key: 'sector', label: 'Sector' },
  { key: 'thesis', label: 'Thesis' },
  { key: 'price', label: 'Price', num: true },
  { key: 'ath', label: 'ATH', num: true },
  { key: 'dd', label: 'Δ ATH', num: true },
  { key: 'dayChangePct', label: 'Δ Today', num: true },
  { key: 'weekChangePct', label: 'Δ 7d', num: true },
  { key: 'status', label: 'Status' },
]

function SortIcon({ col, sort }) {
  if (sort.key !== col) return <ChevronsUpDown size={10} className="opacity-30 ml-1" />
  return sort.dir === 'asc'
    ? <ChevronUp size={10} className="text-electric-400 ml-1" />
    : <ChevronDown size={10} className="text-electric-400 ml-1" />
}

function StatusBadge({ status }) {
  if (!status) return null
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${statusBadgeClass(status)}`}>
      {status}
    </span>
  )
}

function DdCell({ dd }) {
  if (dd == null) return <span className="dim">—</span>
  const cls = dd >= -0.5 ? 'positive' : dd >= -20 ? 'accent' : dd >= -50 ? 'text-yellow-500' : 'negative'
  return <span className={`font-mono ${cls}`}>{fmtPct(dd, 1)}</span>
}

export default function StockTable({ rows, isWatchlist = false, onAnalyze }) {
  const [sort, setSort] = useState({ key: 'dd', dir: 'asc' })
  const [filter, setFilter] = useState({ q: '', sector: '', status: '' })
  const cols = isWatchlist ? COLS_WATCHLIST : COLS_PORTFOLIO

  const sectors = useMemo(() => {
    const s = new Set(rows.map(r => r.sector))
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() =>
    filterRows(rows, filter, isWatchlist),
    [rows, filter, isWatchlist]
  )

  const sorted = useMemo(() =>
    sortRows(filtered, sort.key, sort.dir),
    [filtered, sort]
  )

  const sectorCounts = useMemo(() => {
    const c = {}
    rows.forEach(r => { c[r.sector] = (c[r.sector] || 0) + 1 })
    return c
  }, [rows])

  const handleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const clearFilters = () => setFilter({ q: '', sector: '', status: '' })
  const hasFilters = filter.q || filter.sector || filter.status

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Sector pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter(f => ({ ...f, sector: '' }))}
          className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all border ${!filter.sector ? 'bg-electric-500 text-navy-950 border-electric-500 font-semibold' : 'border-white/10 text-slate-500 hover:border-electric-500/30 hover:text-slate-300'}`}
        >
          ALL <span className="opacity-60">{rows.length}</span>
        </button>
        {sectors.map(s => (
          <button
            key={s}
            onClick={() => setFilter(f => ({ ...f, sector: f.sector === s ? '' : s }))}
            className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all border ${filter.sector === s ? 'bg-electric-500 text-navy-950 border-electric-500 font-semibold' : 'border-white/10 text-slate-500 hover:border-electric-500/30 hover:text-slate-300'}`}
          >
            {s} <span className="opacity-60">{sectorCounts[s]}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={filter.q}
            onChange={e => setFilter(f => ({ ...f, q: e.target.value }))}
            placeholder={isWatchlist ? "Search ticker, company, sector, thesis…" : "Search ticker, company, or sector…"}
            className="w-full bg-navy-800/60 border border-white/10 rounded px-8 py-2 text-[12px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40 transition-colors"
          />
        </div>
        <select
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-slate-400 focus:outline-none focus:border-electric-500/40 appearance-none cursor-pointer"
        >
          <option value="">All Status</option>
          <option>ATH</option><option>UP</option><option>DOWN</option><option>FLAT</option>
        </select>
        <select
          value={sort.key}
          onChange={e => setSort(s => ({ ...s, key: e.target.value }))}
          className="bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-slate-400 focus:outline-none focus:border-electric-500/40 appearance-none cursor-pointer"
        >
          <option value="ticker">Sort: Ticker</option>
          <option value="dd">Sort: Δ ATH</option>
          <option value="dayChangePct">Sort: Δ Today</option>
          <option value="weekChangePct">Sort: Δ 7d</option>
          <option value="price">Sort: Price</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded border border-white/10 text-[11px] font-mono text-slate-500 hover:text-slate-300 hover:border-white/20 transition-all">
            <X size={11} /> Clear
          </button>
        )}
        <span className="text-[11px] font-mono text-slate-600 ml-auto">{sorted.length} of {rows.length}</span>
      </div>

      {/* Table */}
      <div className="panel overflow-auto max-h-[600px]">
        <table className="data-table">
          <thead>
            <tr>
              {cols.map(c => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className={c.num ? 'text-right' : ''}
                >
                  <span className="inline-flex items-center">
                    {c.label}
                    <SortIcon col={c.key} sort={sort} />
                  </span>
                </th>
              ))}
              {onAnalyze && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="text-center py-10 text-slate-600 font-mono text-[11px] uppercase tracking-wider">No matches</td></tr>
            ) : sorted.map(r => (
              <tr key={r.ticker} className="group cursor-default">
                <td>
                  <span className="font-mono font-bold text-[13px] text-electric-300">{r.ticker}</span>
                </td>
                <td>
                  <span className="text-slate-300 text-[12px]">{r.company}</span>
                </td>
                <td>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">{r.sector}</span>
                </td>
                {isWatchlist && (
                  <td className="max-w-[200px]">
                    <span className="text-slate-500 text-[11px] italic truncate block">{r.thesis || '—'}</span>
                  </td>
                )}
                <td className="text-right">
                  {r.price == null
                    ? <span className="dim text-[11px]">…</span>
                    : <span className="font-mono font-semibold text-slate-200">{fmtPrice(r.price)}</span>
                  }
                </td>
                <td className="text-right">
                  <span className="font-mono text-slate-500 text-[12px]">{r.ath ? fmtPrice(r.ath) : '—'}</span>
                </td>
                <td className="text-right"><DdCell dd={r.dd} /></td>
                <td className="text-right">
                  <span className={`font-mono text-[12px] ${pctClass(r.dayChangePct) === 'positive' ? 'positive' : pctClass(r.dayChangePct) === 'negative' ? 'negative' : 'neutral'}`}>
                    {r.dayChangePct != null ? fmtPct(r.dayChangePct) : '—'}
                  </span>
                </td>
                <td className="text-right">
                  <span className={`font-mono text-[12px] ${pctClass(r.weekChangePct) === 'positive' ? 'positive' : pctClass(r.weekChangePct) === 'negative' ? 'negative' : 'neutral'}`}>
                    {r.weekChangePct != null ? fmtPct(r.weekChangePct) : '—'}
                  </span>
                </td>
                <td><StatusBadge status={r.status} /></td>
                {onAnalyze && (
                  <td>
                    <button
                      onClick={() => onAnalyze(r.ticker)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-electric-400 hover:text-electric-300 border border-electric-500/20 hover:border-electric-500/40 px-2 py-0.5 rounded transition-all"
                    >
                      Analyze →
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
