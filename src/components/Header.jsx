import React, { useState, useEffect } from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { fmtPrice, fmtPct, formatTime } from '../lib/utils'

function useMarketStatus() {
  const [status, setStatus] = useState('closed')
  useEffect(() => {
    function compute() {
      const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const day = et.getDay()
      const mins = et.getHours() * 60 + et.getMinutes()
      const isWeekday = day >= 1 && day <= 5
      if (isWeekday && mins >= 570 && mins < 960) setStatus('open')
      else if (isWeekday && ((mins >= 240 && mins < 570) || (mins >= 960 && mins < 1200))) setStatus('extended')
      else setStatus('closed')
    }
    compute()
    const id = setInterval(compute, 60000)
    return () => clearInterval(id)
  }, [])
  return status
}

// Minutes since the US open (9:30 New York) on a weekday, else null
export function minutesSinceOpen(now = new Date()) {
  const o = {}
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).forEach(p => { o[p.type] = p.value })
  if (o.weekday === 'Sat' || o.weekday === 'Sun') return null
  const m = (+o.hour % 24) * 60 + +o.minute
  return m >= 570 && m < 960 ? m - 570 : null
}
// Google Finance can get stuck while the page still "updates": warn when no US price has changed for 40+ min
// during the regular session (from 45 min after the open; the background check must itself be recent)
export function pricesStuckMin(prices, now = new Date()) {
  if (!prices || !prices.movedAt || !prices.seenAt) return null
  const open = minutesSinceOpen(now)
  if (open === null || open < 45) return null
  if (now - new Date(prices.seenAt) > 40 * 60e3) return null
  const m = Math.floor((now - new Date(prices.movedAt)) / 60e3)
  return m >= 40 ? Math.min(m, open) : null
}

function MarketIndicator({ compact }) {
  const status = useMarketStatus()
  const cfg = {
    open:     { color: 'bg-terminal-green', text: compact ? 'Open'     : 'Market Open',    border: 'border-terminal-green/30', bg: 'bg-terminal-green/10', txt: 'text-terminal-green' },
    extended: { color: 'bg-terminal-amber', text: compact ? 'Extended' : 'Extended Hours', border: 'border-terminal-amber/30', bg: 'bg-terminal-amber/10', txt: 'text-terminal-amber' },
    closed:   { color: 'bg-terminal-red',   text: compact ? 'Closed'   : 'Market Closed',  border: 'border-terminal-red/30',   bg: 'bg-terminal-red/10',   txt: 'text-terminal-red'   },
  }
  const c = cfg[status]
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border font-mono ${compact ? 'text-[10px]' : 'text-[11px]'} ${c.border} ${c.bg} ${c.txt}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.color} animate-pulse-slow`} />
      <span className="uppercase tracking-wider">{c.text}</span>
    </div>
  )
}

function StripItem({ icon, label, value, change, iconBg, compact }) {
  const isPos = change > 0, isNeg = change < 0
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border border-white/5 bg-white/[0.02] flex-shrink-0 ${compact ? '' : 'px-3 py-1.5 gap-2.5'}`}>
      {icon && <span className={`rounded-full flex items-center justify-center font-bold text-navy-950 flex-shrink-0 ${compact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[9px]'} ${iconBg}`}>{icon}</span>}
      {!compact && <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>}
      {compact  && <span className="text-[9px] font-mono text-slate-500 uppercase">{label}</span>}
      <span className={`font-mono font-semibold text-slate-200 ${compact ? 'text-[11px]' : 'text-sm'}`}>{value}</span>
      {change != null && (
        <span className={`font-mono ${compact ? 'text-[9px]' : 'text-[11px]'} ${isPos ? 'text-terminal-green' : isNeg ? 'text-terminal-red' : 'text-slate-500'}`}>
          {fmtPct(change)}
        </span>
      )}
    </div>
  )
}

export default function Header({ data, loading, error, lastUpdated, onRefresh, isMobile }) {
  const [, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(id) }, [])
  const ageMin = lastUpdated ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000) : null
  const stuck = pricesStuckMin(data?.prices)
  const fx = data?.fx || {}
  const crypto = data?.crypto || {}
  const commodities = data?.commodities || {}
  const indexes = data?.indexes || {}
  const portfolio = data?.portfolio || []
  const resolved = portfolio.filter(r => r.price != null).length

  if (isMobile) {
    return (
      <header className="border-b border-electric-500/10 bg-navy-900/[0.97] sticky top-0 z-50">
        {/* Mobile brand bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-electric-500/40 bg-electric-500/10 flex items-center justify-center">
              <span className="font-display font-bold text-[11px] text-electric-400">MC</span>
            </div>
            <span className="font-display font-bold text-[15px] text-white">MC <span className="text-electric-400 font-light italic">Portfolio</span></span>
          </div>
          <div className="flex items-center gap-2">
            <MarketIndicator compact />
            <div className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] ${error ? 'border-red-500/30 bg-red-500/10 text-red-400' : loading ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-terminal-green/30 bg-terminal-green/10 text-terminal-green'}`}>
              <Activity size={9} />
              <span>{error ? 'Err' : loading ? '…' : `${resolved}/${portfolio.length}`}</span>
            </div>
            {lastUpdated && <span data-testid="updated-ago" title="Refreshes by itself every 5 min · Google Finance prices can be up to 20 min delayed"
              className={`font-mono text-[10px] ${ageMin > 15 ? 'text-terminal-amber' : 'text-slate-500'}`}>{ageMin < 1 ? 'just now' : `${ageMin} min ago`}</span>}
            {stuck != null && <span data-testid="prices-stuck" title={`No price has changed for ${stuck} min during market hours — Google Finance may be stuck. Check your broker before trading.`}
              className="font-mono text-[10px] text-terminal-amber cursor-help">⚠ stuck?</span>}
            <button onClick={onRefresh} disabled={loading}
              className="p-1.5 rounded border border-electric-500/20 bg-electric-500/5 text-electric-400 disabled:opacity-40">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Mobile markets — 2 scrollable rows */}
        <div className="px-2 py-1.5 space-y-1">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <StripItem icon="₪" label="USD" value={fx.USD_ILS ? fx.USD_ILS.toFixed(3) : '—'} change={fx.USD_ILS_change} iconBg="bg-blue-400" compact />
            <StripItem icon="€" label="EUR" value={fx.EUR_ILS ? fx.EUR_ILS.toFixed(3) : '—'} change={fx.EUR_ILS_change} iconBg="bg-purple-400" compact />
            <StripItem icon="₿" label="BTC" value={crypto.BTC ? '$' + (crypto.BTC/1000).toFixed(1)+'k' : '—'} change={crypto.BTC_change} iconBg="bg-amber-400" compact />
            <StripItem icon="Ξ" label="ETH" value={crypto.ETH ? fmtPrice(crypto.ETH) : '—'} change={crypto.ETH_change} iconBg="bg-indigo-400" compact />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <StripItem icon="Au" label="Gold"  value={commodities.GOLD   ? '$'+(commodities.GOLD/1000).toFixed(1)+'k' : '—'} change={commodities.GOLD_change}   iconBg="bg-yellow-400" compact />
            <StripItem icon="Ag" label="Ag"    value={commodities.SILVER ? fmtPrice(commodities.SILVER) : '—'} change={commodities.SILVER_change} iconBg="bg-slate-300" compact />
            <StripItem label="SPY"  value={indexes.SPY  ? fmtPrice(indexes.SPY)  : '—'} change={indexes.SPY_change}  compact />
            <StripItem label="QQQ"  value={indexes.QQQ  ? fmtPrice(indexes.QQQ)  : '—'} change={indexes.QQQ_change}  compact />
            <StripItem label="SOXX" value={indexes.SOXX ? fmtPrice(indexes.SOXX) : '—'} change={indexes.SOXX_change} compact />
            <StripItem label="VIX"  value={indexes.VIX  ? indexes.VIX.toFixed(1) : '—'} change={indexes.VIX_change}  compact />
          </div>
        </div>
      </header>
    )
  }

  // Desktop header
  return (
    <header className="border-b border-electric-500/10 bg-navy-900/[0.97] sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-9 h-9 rounded-full border border-electric-500/40 bg-electric-500/10 flex items-center justify-center animate-glow">
              <span className="font-display font-bold text-sm text-electric-400">MC</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-terminal-green border-2 border-navy-900 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white tracking-tight leading-none">MC <span className="text-electric-400 font-light italic">Portfolio</span></h1>
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em] mt-0.5">Live · Multi-Sector · Real-Time</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MarketIndicator />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] ${error ? 'border-red-500/30 bg-red-500/10 text-red-400' : loading ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 'border-terminal-green/30 bg-terminal-green/10 text-terminal-green'}`}>
            <Activity size={10} />
            <span className="uppercase tracking-wider">{error ? 'Error' : loading ? 'Loading…' : `Prices · ${resolved}/${portfolio.length}`}</span>
          </div>
          {lastUpdated && <span title={'Last refreshed ' + formatTime(lastUpdated) + ' · refreshes by itself every 5 min · Google Finance prices can be up to 20 min delayed'}
            className={`font-mono text-[11px] ${ageMin > 15 ? 'text-terminal-amber' : 'text-slate-600'}`} data-testid="updated-ago">
            {ageMin === null ? '' : ageMin < 1 ? 'Updated just now' : `Updated ${ageMin} min ago`}{ageMin > 15 ? ' — may be outdated' : ''}
          </span>}
          {stuck != null && <span data-testid="prices-stuck" title="Google Finance may be stuck — check your broker before trading" className="font-mono text-[11px] text-terminal-amber">
            ⚠ Prices haven't moved for {stuck} min
          </span>}
          <button onClick={onRefresh} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-electric-500/20 bg-electric-500/5 text-electric-400 text-[11px] font-mono uppercase tracking-wider hover:border-electric-500/40 hover:bg-electric-500/10 transition-all disabled:opacity-40">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>
      <div className="px-6 py-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">FX</span>
          <StripItem icon="₪" label="USD→ILS" value={fx.USD_ILS ? fx.USD_ILS.toFixed(4) : '—'} change={fx.USD_ILS_change} iconBg="bg-blue-400" />
          <StripItem icon="€" label="EUR→ILS" value={fx.EUR_ILS ? fx.EUR_ILS.toFixed(4) : '—'} change={fx.EUR_ILS_change} iconBg="bg-purple-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">CRYPTO</span>
          <StripItem icon="₿" label="BTC" value={crypto.BTC ? '$' + crypto.BTC.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} change={crypto.BTC_change} iconBg="bg-amber-400" />
          <StripItem icon="Ξ" label="ETH" value={crypto.ETH ? fmtPrice(crypto.ETH) : '—'} change={crypto.ETH_change} iconBg="bg-indigo-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">METALS</span>
          <StripItem icon="Au" label="Gold"   value={commodities.GOLD   ? fmtPrice(commodities.GOLD)          : '—'} change={commodities.GOLD_change}   iconBg="bg-yellow-400" />
          <StripItem icon="Ag" label="Silver" value={commodities.SILVER ? fmtPrice(commodities.SILVER)        : '—'} change={commodities.SILVER_change} iconBg="bg-slate-300"  />
          <StripItem icon="Cu" label="Copper" value={commodities.COPPER ? '$' + commodities.COPPER.toFixed(2) : '—'} change={commodities.COPPER_change} iconBg="bg-orange-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 w-14 flex-shrink-0">INDEX</span>
          <StripItem label="SPY"  value={indexes.SPY  ? fmtPrice(indexes.SPY)  : '—'} change={indexes.SPY_change}  />
          <StripItem label="QQQ"  value={indexes.QQQ  ? fmtPrice(indexes.QQQ)  : '—'} change={indexes.QQQ_change}  />
          <StripItem label="SOXX" value={indexes.SOXX ? fmtPrice(indexes.SOXX) : '—'} change={indexes.SOXX_change} />
          <StripItem label="VIX"  value={indexes.VIX  ? indexes.VIX.toFixed(2) : '—'} change={indexes.VIX_change}  />
        </div>
      </div>
    </header>
  )
}
