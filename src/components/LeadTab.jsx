import React from 'react'
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Activity } from 'lucide-react'
import { fmtPrice, fmtPct, pctClass, ddClass } from '../lib/utils'

function KpiCard({ label, value, sub, color = 'accent', icon: Icon }) {
  const colorMap = {
    accent: 'text-electric-400 shadow-electric-500/20',
    green: 'text-terminal-green shadow-terminal-green/20',
    red: 'text-terminal-red shadow-terminal-red/20',
    amber: 'text-terminal-amber shadow-terminal-amber/20',
  }
  return (
    <div className="panel p-5 relative overflow-hidden group hover:border-electric-500/25 transition-all">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-electric-500/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-electric-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{label}</span>
        {Icon && <Icon size={14} className="text-slate-600" />}
      </div>
      <div className={`font-display font-bold text-4xl leading-none ${colorMap[color]} drop-shadow-lg`}>{value}</div>
      {sub && <div className="mt-2 text-[11px] font-mono text-slate-600">{sub}</div>}
    </div>
  )
}

function MoverRow({ r, useWeek = false }) {
  const chg = useWeek ? r.weekChangePct : r.dayChangePct
  const isPos = chg > 0
  return (
    <tr className="group">
      <td className="py-2.5 px-3">
        <span className="font-mono font-semibold text-[13px] text-electric-300">{r.ticker}</span>
      </td>
      <td className="py-2.5 px-3">
        <span className="text-[12px] text-slate-400 font-body">{r.company}</span>
      </td>
      <td className="py-2.5 px-3 text-right">
        <span className="font-mono text-[12px] text-slate-300">{fmtPrice(r.price)}</span>
      </td>
      <td className="py-2.5 px-3 text-right">
        <span className={`font-mono text-[12px] font-semibold ${isPos ? 'positive' : 'negative'}`}>
          {fmtPct(chg)}
        </span>
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
      <div className="overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th><th>Company</th>
              <th className="text-right">Price</th>
              <th className="text-right">{useWeek ? 'Δ 7d' : 'Δ Today'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-600 font-mono text-[11px]">No data</td></tr>
            ) : rows.map(r => <MoverRow key={r.ticker} r={r} useWeek={useWeek} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ATHTable({ rows }) {
  if (!rows.length) return (
    <div className="panel p-8 text-center font-mono text-[11px] text-slate-600 uppercase tracking-wider">
      No tickers at ATH
    </div>
  )
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Zap size={14} className="text-electric-400" />
        <span className="font-display font-semibold text-[13px] text-slate-200">At All-Time High</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-600">within 0.5%</span>
      </div>
      <div className="overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th><th>Company</th><th>Sector</th>
              <th className="text-right">Price</th>
              <th className="text-right">Δ Today</th>
              <th className="text-right">Δ 7d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ticker} className="group">
                <td className="py-2.5 px-3">
                  <span className="font-mono font-semibold text-[13px] text-electric-300">{r.ticker}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-[12px] text-slate-400">{r.company}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">{r.sector}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="font-mono text-[12px] font-semibold text-slate-200">{fmtPrice(r.price)}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`font-mono text-[12px] ${r.dayChangePct > 0 ? 'positive' : r.dayChangePct < 0 ? 'negative' : 'neutral'}`}>
                    {r.dayChangePct != null ? fmtPct(r.dayChangePct) : '—'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`font-mono text-[12px] ${r.weekChangePct > 0 ? 'positive' : r.weekChangePct < 0 ? 'negative' : 'neutral'}`}>
                    {r.weekChangePct != null ? fmtPct(r.weekChangePct) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function LeadTab({ portfolio }) {
  const withDay = portfolio.filter(r => r.dayChangePct != null)
  const withWeek = portfolio.filter(r => r.weekChangePct != null)
  const atATH = portfolio.filter(r => r.atATH)
  const deepDiscount = portfolio.filter(r => r.dd != null && r.dd <= -50)
  const withDd = portfolio.filter(r => r.dd != null)

  const sortedDay = [...withDay].sort((a, b) => b.dayChangePct - a.dayChangePct)
  const sortedWeek = [...withWeek].sort((a, b) => b.weekChangePct - a.weekChangePct)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Holdings" value={portfolio.length} sub={`${portfolio.filter(r => r.price != null).length} priced`} color="accent" icon={Activity} />
        <KpiCard label="At ATH" value={atATH.length} sub="within 0.5% of high" color="green" icon={Zap} />
        <KpiCard label="Deep Discount" value={deepDiscount.length} sub=">50% off ATH" color="red" icon={AlertTriangle} />
      </div>

      {/* Daily movers */}
      <div className="grid grid-cols-2 gap-4">
        <MoverTable title="Top 5 Gainers Today" rows={sortedDay.slice(0, 5)} meta="Portfolio · 1D" type="gain" />
        <MoverTable title="Top 5 Losers Today" rows={sortedDay.slice(-5).reverse()} meta="Portfolio · 1D" type="loss" />
      </div>

      {/* Weekly movers */}
      <div className="grid grid-cols-2 gap-4">
        <MoverTable title="Top 5 Winners (7d)" rows={sortedWeek.slice(0, 5)} meta="Portfolio · Weekly" useWeek type="gain" />
        <MoverTable title="Top 5 Losers (7d)" rows={sortedWeek.slice(-5).reverse()} meta="Portfolio · Weekly" useWeek type="loss" />
      </div>

      {/* ATH */}
      <ATHTable rows={atATH} />
    </div>
  )
}
