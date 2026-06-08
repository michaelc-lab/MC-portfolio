import React from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { fmtPrice, fmtPct, formatTime } from '../lib/utils'

function StripItem({ icon, label, value, change, iconBg }) {
  const isPos = change > 0
  const isNeg = change < 0
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {icon && (
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-navy-950 flex-shrink-0 ${iconBg}`}>
          {icon}
        </span>
      )}
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-sm font-semibold text-slate-200">{value}</span>
      {change != null && (
        <span className={`font-mono text-[11px] ${isPos ? 'text-terminal-green' : isNeg ? 'text-terminal-red' : 'text-slate-500'}`}>
          {fmtPct(change)}
        </span>
      )}
    </div>
  )
}

export default function Header({ data, loading, error, lastUpdated, onRefresh }) {
  const fx = data?.fx || {}
  const crypto = data?.crypto || {}
  const commodities = data?.commodities || {}
  const indexes = data?.indexes || {}
  const portfolio = data?.portfolio || []
  const resolved = portfolio.filter(r => r.price != null).length

  return (
    <header className="border-b border-electric-500/10 bg-navy-900/80 backdrop-blur-xl sticky top-0 z-50">
      {/* Brand bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-9 h-9 rounded-full border border-electric-500/40 bg-electric-500/10 flex items-center justify-center animate-glow">
              <span className="font-display font-bold text-sm text-electric-400">MC</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-terminal-green border-2 border-navy-900 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white tracking-tight leading-none">
              MC <span className="text-electric-400 font-light italic">Portfolio</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] mt-0.5">Live · Multi-Sector · Real-Time</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] ${
            error ? 'border-red-500/30 bg-red-500/10 text-red-400'
            : loading ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            : 'border-terminal-green/30 bg-terminal-green/10 text-terminal-green'
          }`}>
            <Activity size={10} />
            <span className="uppercase tracking-wider">
              {error ? 'Error' : loading ? 'Loading…' : `Live · ${resolved}/${portfolio.length}`}
            </span>
          </div>
          {lastUpdated && <span className="text-slate-600 font-mono text-[11px] hidden sm:block">{formatTime(lastUpdated)}</span>}
          <button onClick={onRefresh} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-electric-500/20 bg-electric-500/5 text-electric-400 text-[11px] font-mono uppercase tracking-wider hover:border-electric-500/40 hover:bg-electric-500/10 transition-all disabled:opacity-40">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Markets strips */}
      <div className="px-6 py-2 flex flex-col gap-1.5">

        {/* FX row — with 24h change */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">FX</span>
          <StripItem icon="₪" label="USD→ILS" value={fx.USD_ILS ? fx.USD_ILS.toFixed(4) : '—'} change={fx.USD_ILS_change} iconBg="bg-blue-400" />
          <StripItem icon="€" label="EUR→ILS" value={fx.EUR_ILS ? fx.EUR_ILS.toFixed(4) : '—'} change={fx.EUR_ILS_change} iconBg="bg-purple-400" />
        </div>

        {/* Crypto row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">CRYPTO</span>
          <StripItem icon="₿" label="BTC" value={crypto.BTC ? '$' + crypto.BTC.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} change={crypto.BTC_change} iconBg="bg-amber-400" />
          <StripItem icon="Ξ" label="ETH" value={crypto.ETH ? fmtPrice(crypto.ETH) : '—'} change={crypto.ETH_change} iconBg="bg-indigo-400" />
        </div>

        {/* Metals row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">METALS</span>
          <StripItem icon="Au" label="Gold" value={commodities.GOLD ? fmtPrice(commodities.GOLD) : '—'} change={commodities.GOLD_change} iconBg="bg-yellow-400" />
          <StripItem icon="Ag" label="Silver" value={commodities.SILVER ? fmtPrice(commodities.SILVER) : '—'} change={commodities.SILVER_change} iconBg="bg-slate-300" />
          <StripItem icon="Cu" label="Copper" value={commodities.COPPER ? '$' + commodities.COPPER.toFixed(2) : '—'} change={commodities.COPPER_change} iconBg="bg-orange-400" />
        </div>

        {/* Indexes row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">INDEX</span>
          <StripItem label="SPY" value={indexes.SPY ? fmtPrice(indexes.SPY) : '—'} change={indexes.SPY_change} iconBg="bg-electric-400" />
          <StripItem label="QQQ" value={indexes.QQQ ? fmtPrice(indexes.QQQ) : '—'} change={indexes.QQQ_change} iconBg="bg-electric-400" />
          <StripItem label="SOXX" value={indexes.SOXX ? fmtPrice(indexes.SOXX) : '—'} change={indexes.SOXX_change} iconBg="bg-electric-400" />
        </div>

      </div>
    </header>
  )
}
