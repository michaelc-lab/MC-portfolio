import React, { useState, useEffect, useRef } from 'react'
import { Search, BarChart2, TrendingUp, Newspaper, Award } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from 'recharts'
import { fmtPrice, fmtPct, fmtLarge, fmt } from '../lib/utils'
import { fetchWorkstationData, fetchCompareData } from '../hooks/usePortfolioData'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUQqqI6PAa64xq5ZALeJSUWuy86pVtSEG6rIMhgNOQ-7XS-t7PJRRncJ1mi7OAwd0/exec'

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout')) }, 30000)
    function cleanup() { clearTimeout(timeout); delete window[cbName]; if (script.parentNode) script.parentNode.removeChild(script) }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('Script load failed')) }
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}

// ── Shared helpers ────────────────────────────────────────────
const PERIODS = ['1D', '1W', '1M', '1Q', '6M', '1Y', 'YTD']

function filterByPeriod(data, period) {
  if (!data || !data.length) return []
  const last = new Date(data[data.length - 1].date)
  let cutoff
  switch (period) {
    case '1D':  cutoff = new Date(last); cutoff.setDate(cutoff.getDate() - 1); break
    case '1W':  cutoff = new Date(last); cutoff.setDate(cutoff.getDate() - 7); break
    case '1M':  cutoff = new Date(last); cutoff.setMonth(cutoff.getMonth() - 1); break
    case '1Q':  cutoff = new Date(last); cutoff.setMonth(cutoff.getMonth() - 3); break
    case '6M':  cutoff = new Date(last); cutoff.setMonth(cutoff.getMonth() - 6); break
    case '1Y':  cutoff = new Date(last); cutoff.setFullYear(cutoff.getFullYear() - 1); break
    case 'YTD': cutoff = new Date(last.getFullYear(), 0, 1); break
    default:    return data
  }
  return data.filter(d => new Date(d.date) >= cutoff)
}

function PeriodButtons({ period, setPeriod }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map(p => (
        <button key={p} onClick={() => setPeriod(p)}
          className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-all ${
            period === p
              ? 'bg-electric-500 text-navy-950 border-electric-500 font-bold'
              : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
          }`}>
          {p}
        </button>
      ))}
    </div>
  )
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-navy-800/40 border border-white/8 rounded-lg p-4 hover:border-electric-500/20 transition-colors">
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600 mb-2">{label}</div>
      <div className="font-mono font-semibold text-[17px] text-slate-100">{value}</div>
      {sub && <div className="text-[10px] font-mono text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

// ── Price chart tooltip ───────────────────────────────────────
const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="panel-bright px-3 py-2 text-[11px] font-mono">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.stroke }}>{p.name}: {fmtPrice(p.value)}</div>
      ))}
    </div>
  )
}

// ── Single-stock price chart ──────────────────────────────────
function PriceChart({ chart, earnings, period, setPeriod }) {
  const filtered   = filterByPeriod(chart, period)
  const firstPrice = filtered.length ? filtered[0].close : null
  const lastPrice  = filtered.length ? filtered[filtered.length - 1].close : null
  const pctChange  = firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : null
  const isPos      = pctChange !== null && pctChange >= 0
  const earningsDates = (earnings || []).map(e => e.period).filter(Boolean)

  if (!filtered.length) {
    return <div className="flex items-center justify-center h-full text-[11px] font-mono text-slate-600 uppercase tracking-wider">No data for this period</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {lastPrice && <span className="font-mono font-bold text-lg text-slate-100">{fmtPrice(lastPrice)}</span>}
          {pctChange !== null && (
            <span className={`font-mono text-sm font-semibold ${isPos ? 'positive' : 'negative'}`}>
              {fmtPct(pctChange)} ({period})
            </span>
          )}
        </div>
        <PeriodButtons period={period} setPeriod={setPeriod} />
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="date"
              tickFormatter={d => { const dt = new Date(d); return dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) }}
              tick={{ fontSize: 9, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false}
              interval={Math.max(1, Math.floor(filtered.length / 6))}
            />
            <YAxis tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0))}
              tick={{ fontSize: 9, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false} width={55} domain={['auto', 'auto']}
            />
            <Tooltip content={<PriceTooltip />} />
            {earningsDates.map(d => (
              <ReferenceLine key={d} x={d} stroke="rgba(255,184,0,0.4)" strokeWidth={1} strokeDasharray="3 3" />
            ))}
            <Line type="monotone" dataKey="close" name="Price"
              stroke={isPos ? '#00ff88' : '#ff4466'} strokeWidth={1.5} dot={false}
              activeDot={{ r: 4, fill: isPos ? '#00ff88' : '#ff4466', stroke: 'none' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Revenue chart ─────────────────────────────────────────────
const RevTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="panel-bright px-3 py-2 text-[11px] font-mono">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.filter(p => p.value != null).map(p => (
        <div key={p.dataKey} className="text-electric-300">
          {p.dataKey === 'actual' ? 'Actual: ' : 'Estimate: '}{'$'}{fmtLarge(p.value)}
        </div>
      ))}
    </div>
  )
}

function RevenueChart({ revenueData }) {
  if (!revenueData?.quarters?.length) {
    return <div className="flex items-center justify-center h-full text-[11px] font-mono text-slate-600 uppercase tracking-wider">No revenue data available</div>
  }
  const data = revenueData.quarters.map(q => ({ label: q.label, actual: q.actual, estimate: q.estimate }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="25%" barGap={3}>
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={v => '$' + fmtLarge(v)} tick={{ fontSize: 9, fill: '#475569', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={60} />
        <Tooltip content={<RevTooltip />} />
        <Bar dataKey="actual"   name="Actual"   fill="rgba(14,165,233,0.85)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="estimate" name="Estimate" fill="rgba(251,191,36,0.45)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Analyst bar ───────────────────────────────────────────────
function AnalystBar({ analyst }) {
  if (!analyst) return <div className="text-[11px] font-mono text-slate-600 text-center py-4">No analyst data</div>
  const total = (analyst.strongBuy || 0) + (analyst.buy || 0) + (analyst.hold || 0) + (analyst.sell || 0) + (analyst.strongSell || 0)
  if (!total) return <div className="text-[11px] font-mono text-slate-600 text-center py-4">No analyst data</div>
  const pct  = n => total ? (n / total * 100) : 0
  const buys = (analyst.strongBuy || 0) + (analyst.buy || 0)
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-bold text-3xl text-terminal-green">{buys}</span>
        <span className="font-mono text-[11px] text-slate-500">of {total} analysts say BUY</span>
      </div>
      <div className="flex h-5 rounded overflow-hidden border border-white/10">
        {analyst.strongBuy  > 0 && <div style={{ width: pct(analyst.strongBuy)  + '%' }} className="bg-emerald-600  flex items-center justify-center text-[9px] font-mono font-bold text-white">{analyst.strongBuy}</div>}
        {analyst.buy        > 0 && <div style={{ width: pct(analyst.buy)        + '%' }} className="bg-terminal-green flex items-center justify-center text-[9px] font-mono font-bold text-navy-950">{analyst.buy}</div>}
        {analyst.hold       > 0 && <div style={{ width: pct(analyst.hold)       + '%' }} className="bg-terminal-amber flex items-center justify-center text-[9px] font-mono font-bold text-navy-950">{analyst.hold}</div>}
        {analyst.sell       > 0 && <div style={{ width: pct(analyst.sell)       + '%' }} className="bg-terminal-red  flex items-center justify-center text-[9px] font-mono font-bold text-white">{analyst.sell}</div>}
        {analyst.strongSell > 0 && <div style={{ width: pct(analyst.strongSell) + '%' }} className="bg-red-800       flex items-center justify-center text-[9px] font-mono font-bold text-white">{analyst.strongSell}</div>}
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        {[['Str. Buy','bg-emerald-600'],['Buy','bg-terminal-green'],['Hold','bg-terminal-amber'],['Sell','bg-terminal-red'],['Str. Sell','bg-red-800']].map(([l,c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <span className={`w-2 h-2 rounded-sm ${c}`} />{l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Dual-stock chart for Compare ──────────────────────────────
function DualChart({ chartA, chartB, tickerA, tickerB }) {
  const [period, setPeriod] = useState('1Y')

  const filtA = filterByPeriod(chartA, period)
  const filtB = filterByPeriod(chartB, period)

  // Normalise both to 100 at start so they're comparable on the same axis
  const baseA = filtA.length ? filtA[0].close : null
  const baseB = filtB.length ? filtB[0].close : null

  // Merge by date
  const dateMap = {}
  filtA.forEach(d => { dateMap[d.date] = { date: d.date } })
  filtB.forEach(d => { if (!dateMap[d.date]) dateMap[d.date] = { date: d.date } })

  const merged = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).map(row => {
    const a = filtA.find(d => d.date === row.date)
    const b = filtB.find(d => d.date === row.date)
    return {
      date: row.date,
      [tickerA]: a && baseA ? +((a.close / baseA - 1) * 100).toFixed(2) : null,
      [tickerB]: b && baseB ? +((b.close / baseB - 1) * 100).toFixed(2) : null,
    }
  })

  const DualTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="panel-bright px-3 py-2 text-[11px] font-mono">
        <div className="text-slate-400 mb-1">{label}</div>
        {payload.map(p => p.value != null && (
          <div key={p.dataKey} style={{ color: p.stroke }}>
            {p.dataKey}: {p.value > 0 ? '+' : ''}{p.value.toFixed(2)}%
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span style={{ color: '#0ea5e9' }}>● {tickerA}</span>
          <span style={{ color: '#f59e0b' }}>● {tickerB}</span>
          <span className="text-slate-600">indexed to 100</span>
        </div>
        <PeriodButtons period={period} setPeriod={setPeriod} />
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="date"
              tickFormatter={d => { const dt = new Date(d); return dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) }}
              tick={{ fontSize: 9, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false}
              interval={Math.max(1, Math.floor(merged.length / 6))}
            />
            <YAxis tickFormatter={v => (v > 0 ? '+' : '') + v + '%'}
              tick={{ fontSize: 9, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false} width={55}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <Tooltip content={<DualTooltip />} />
            <Line type="monotone" dataKey={tickerA} stroke="#0ea5e9" strokeWidth={1.5} dot={false} connectNulls />
            <Line type="monotone" dataKey={tickerB} stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Analyze view ──────────────────────────────────────────────
function AnalyzeView({ portfolio, watchlist, initialTicker }) {
  const [ticker,      setTicker]      = useState('')
  const [selectVal,   setSelectVal]   = useState('')
  const [data,        setData]        = useState(null)
  const [revenueData, setRevenueData] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [chartPeriod, setChartPeriod] = useState('1Y')
  const hasAutoRun = useRef(false)

  const run = async (t) => {
    const target = (t || ticker || selectVal || '').trim().toUpperCase()
    if (!target) return
    setLoading(true); setError(null); setData(null); setRevenueData(null); setChartPeriod('1Y')
    try {
      const d = await fetchWorkstationData(target)
      if (!d?.profile?.name) throw new Error('No data for "' + target + '" — may not be on Finnhub free tier')
      setData(d)
      try {
        const rev = await jsonp(APPS_SCRIPT_URL + '?action=getRevenueData&ticker=' + encodeURIComponent(target))
        setRevenueData(rev)
      } catch (e) { /* optional */ }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialTicker && !hasAutoRun.current) {
      hasAutoRun.current = true
      setTicker(initialTicker)
      run(initialTicker)
    }
  }, [initialTicker])

  const allStocks = [...(portfolio || []), ...(watchlist || [])]
  const livePrice = data ? allStocks.find(r => r.ticker === data.ticker) : null
  const m   = data?.metrics || {}
  const pe  = m.peNormalizedAnnual  ?? m.peBasicExclExtraTTM
  const eps = m.epsAnnual           ?? m.epsTTM
  const margin = m.netProfitMarginAnnual ?? m.netProfitMarginTTM
  const roe    = m.roeRfy           ?? m.roeTTM

  return (
    <div className="space-y-4">
      {/* Selector bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={selectVal} onChange={e => { setSelectVal(e.target.value); setTicker('') }}
          className="bg-navy-800/60 border border-white/10 rounded px-3 py-2.5 text-[12px] font-mono text-slate-400 focus:outline-none focus:border-electric-500/40 flex-1 min-w-48 appearance-none cursor-pointer">
          <option value="">— Pick from my list —</option>
          {allStocks.map(r => <option key={r.ticker} value={r.ticker}>{r.ticker} — {r.company}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={ticker} onChange={e => { setTicker(e.target.value); setSelectVal('') }}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="…or type any US ticker (NVDA, AAPL)"
            className="w-full bg-navy-800/60 border border-white/10 rounded px-8 py-2.5 text-[12px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40" />
        </div>
        <button onClick={() => run()} disabled={loading}
          className="btn-primary px-5 py-2.5 rounded font-mono text-[12px] uppercase tracking-wider font-semibold disabled:opacity-40 flex items-center gap-2">
          <BarChart2 size={13} />{loading ? 'Loading…' : 'Analyze'}
        </button>
      </div>

      {error   && <div className="panel p-4 border-red-500/20 bg-red-500/5 text-[12px] font-mono text-red-400">{error}</div>}
      {loading && <div className="panel p-12 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-electric-400 animate-pulse">Fetching fundamentals & news…</div>}

      {data && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Header */}
          <div className="panel-bright p-5">
            <div className="flex items-center gap-4 flex-wrap">
              {data.profile?.logo && <img src={data.profile.logo} alt="" className="w-14 h-14 rounded-xl bg-navy-800 p-1.5 border border-white/10 object-contain" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display font-bold text-2xl text-white">{data.profile.name}</h2>
                  <span className="font-mono text-sm text-electric-400">{data.ticker}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                  {data.profile.finnhubIndustry} · {data.profile.exchange} · IPO {data.profile.ipo || '—'}
                </div>
              </div>
              {livePrice && (
                <div className="text-right">
                  <div className="font-display font-bold text-3xl text-white">{fmtPrice(livePrice.price)}</div>
                  <div className={`font-mono text-sm mt-1 ${livePrice.dayChangePct > 0 ? 'positive' : livePrice.dayChangePct < 0 ? 'negative' : 'neutral'}`}>
                    {fmtPct(livePrice.dayChangePct)} today
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Market Cap"   value={'$' + fmtLarge((data.profile.marketCapitalization || 0) * 1e6)} />
            <MetricCard label="P/E Ratio"    value={pe     != null ? fmt(pe, 1)       : '—'} />
            <MetricCard label="EPS (Annual)" value={eps    != null ? '$' + fmt(eps, 2) : '—'} />
            <MetricCard label="Net Margin"   value={margin != null ? fmt(margin, 1) + '%' : '—'} />
            <MetricCard label="ROE"          value={roe    != null ? fmt(roe, 1) + '%' : '—'} />
            <MetricCard label="52W High"     value={m['52WeekHigh'] ? fmtPrice(m['52WeekHigh']) : '—'} sub={m['52WeekHighDate']} />
            <MetricCard label="52W Low"      value={m['52WeekLow']  ? fmtPrice(m['52WeekLow'])  : '—'} sub={m['52WeekLowDate']}  />
            <MetricCard label="Beta"         value={m.beta != null ? fmt(m.beta, 2) : '—'} />
          </div>

          {/* Price chart (full width) */}
          <div className="panel p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-electric-400" />
              <span className="font-display font-semibold text-[13px] text-slate-200">Price Chart</span>
              {data.earnings?.length > 0 && <span className="ml-auto font-mono text-[10px] text-slate-600 uppercase tracking-wider">dashed = earnings dates</span>}
            </div>
            <div className="h-72">
              <PriceChart chart={data.chart} earnings={data.earnings} period={chartPeriod} setPeriod={setChartPeriod} />
            </div>
          </div>

          {/* Analyst + EPS + Revenue */}
          <div className="grid grid-cols-3 gap-4">
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <Award size={14} className="text-electric-400" />
                <span className="font-display font-semibold text-[13px] text-slate-200">Analyst Consensus</span>
              </div>
              <AnalystBar analyst={data.analyst} />
            </div>

            <div className="panel overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="font-display font-semibold text-[13px] text-slate-200">EPS vs Estimate</span>
              </div>
              <div className="overflow-auto max-h-56">
                <table className="data-table">
                  <thead><tr><th>Period</th><th className="text-right">Est.</th><th className="text-right">Actual</th><th className="text-right">Surprise</th></tr></thead>
                  <tbody>
                    {!data.earnings?.length
                      ? <tr><td colSpan={4} className="text-center py-6 text-slate-600 text-[11px]">No data</td></tr>
                      : data.earnings.map((e, i) => (
                        <tr key={i}>
                          <td className="font-mono text-[12px] text-slate-400">{e.period}</td>
                          <td className="text-right font-mono text-[12px] text-slate-400">{e.estimate != null ? '$' + fmt(e.estimate, 2) : '—'}</td>
                          <td className="text-right font-mono text-[12px] text-slate-200">{e.actual   != null ? '$' + fmt(e.actual,   2) : '—'}</td>
                          <td className={`text-right font-mono text-[12px] font-semibold ${e.surprisePercent > 0 ? 'positive' : e.surprisePercent < 0 ? 'negative' : 'neutral'}`}>
                            {e.surprisePercent != null ? fmtPct(e.surprisePercent, 1) : '—'}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={14} className="text-electric-400" />
                <span className="font-display font-semibold text-[13px] text-slate-200">Quarterly Revenue</span>
                <span className="ml-auto font-mono text-[10px] text-slate-600 uppercase tracking-wider">Last 4 qtrs</span>
              </div>
              <div className="h-48">
                {revenueData
                  ? <RevenueChart revenueData={revenueData} />
                  : <div className="flex items-center justify-center h-full text-[11px] font-mono text-slate-600 uppercase tracking-wider animate-pulse">Loading…</div>
                }
              </div>
            </div>
          </div>

          {/* News */}
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <Newspaper size={13} className="text-electric-400" />
              <span className="font-display font-semibold text-[13px] text-slate-200">Latest News</span>
              <span className="ml-auto font-mono text-[10px] text-slate-600 uppercase">30 days</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/5 overflow-auto max-h-64">
              {!data.news?.length
                ? <div className="p-6 text-center text-slate-600 font-mono text-[11px] col-span-2">No news</div>
                : data.news.map((n, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <a href={n.url} target="_blank" rel="noopener noreferrer"
                      className="text-[12px] text-slate-300 hover:text-electric-300 font-medium leading-snug block mb-1 transition-colors">
                      {n.headline}
                    </a>
                    <div className="font-mono text-[10px] text-slate-600">
                      {n.source} · {n.datetime ? new Date(n.datetime * 1000).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Compare view ──────────────────────────────────────────────
function CompareView({ portfolio, watchlist }) {
  const [tickerA, setTickerA] = useState('')
  const [tickerB, setTickerB] = useState('')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const run = async () => {
    const a = tickerA.trim().toUpperCase()
    const b = tickerB.trim().toUpperCase()
    if (!a || !b || a === b) return
    setLoading(true); setError(null); setData(null)
    try { setData(await fetchCompareData(a, b)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const allStocks = [...(portfolio || []), ...(watchlist || [])]

  const METRICS = data ? [
    { label: 'Market Cap',    a: (data.a.profile?.marketCapitalization || 0) * 1e6, b: (data.b.profile?.marketCapitalization || 0) * 1e6, fmt: v => '$' + fmtLarge(v), higher: true  },
    { label: 'P/E (Annual)',  a: data.a.metrics?.peNormalizedAnnual,  b: data.b.metrics?.peNormalizedAnnual,  fmt: v => v != null ? fmt(v, 1)       : '—', higher: false },
    { label: 'EPS (Annual)',  a: data.a.metrics?.epsAnnual,           b: data.b.metrics?.epsAnnual,           fmt: v => v != null ? '$' + fmt(v, 2) : '—', higher: true  },
    { label: 'Net Margin %',  a: data.a.metrics?.netProfitMarginAnnual, b: data.b.metrics?.netProfitMarginAnnual, fmt: v => v != null ? fmt(v, 1) + '%' : '—', higher: true },
    { label: 'ROE %',         a: data.a.metrics?.roeRfy,              b: data.b.metrics?.roeRfy,              fmt: v => v != null ? fmt(v, 1) + '%' : '—', higher: true  },
    { label: '1Y Return',     a: data.a.metrics?.['52WeekPriceReturnDaily'], b: data.b.metrics?.['52WeekPriceReturnDaily'], fmt: v => v != null ? fmt(v, 1) + '%' : '—', higher: true },
    { label: '52W High',      a: data.a.metrics?.['52WeekHigh'],      b: data.b.metrics?.['52WeekHigh'],      fmt: v => v != null ? fmtPrice(v)    : '—', higher: null  },
    { label: 'Beta',          a: data.a.metrics?.beta,                b: data.b.metrics?.beta,                fmt: v => v != null ? fmt(v, 2)      : '—', higher: null  },
  ] : []

  return (
    <div className="space-y-4">
      {/* Ticker selector */}
      <div className="flex gap-2 items-center flex-wrap">
        {[['A', tickerA, setTickerA], ['B', tickerB, setTickerB]].map(([label, val, set]) => (
          <div key={label} className="flex gap-2 flex-1 min-w-64">
            <span className="flex items-center justify-center w-8 h-10 rounded border border-electric-500/30 bg-electric-500/10 font-display font-bold text-electric-400 flex-shrink-0">{label}</span>
            <select value={allStocks.some(r => r.ticker === val) ? val : ''} onChange={e => set(e.target.value)}
              className="flex-1 bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-slate-400 focus:outline-none focus:border-electric-500/40 appearance-none cursor-pointer">
              <option value="">— My list —</option>
              {allStocks.map(r => <option key={r.ticker} value={r.ticker}>{r.ticker} — {r.company}</option>)}
            </select>
            <input value={val} onChange={e => set(e.target.value.toUpperCase())} placeholder="or type"
              className="w-24 bg-navy-800/60 border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40 uppercase" />
          </div>
        ))}
        <button onClick={run} disabled={loading || !tickerA || !tickerB}
          className="btn-primary px-5 py-2.5 rounded font-mono text-[12px] uppercase tracking-wider font-semibold disabled:opacity-40">
          {loading ? 'Loading…' : 'Compare'}
        </button>
      </div>

      {error && <div className="panel p-4 border-red-500/20 bg-red-500/5 text-[12px] font-mono text-red-400">{error}</div>}

      {data && !loading && (
        <div className="animate-slide-up space-y-4">
          {/* Split layout: table left, chart right */}
          <div className="grid grid-cols-2 gap-4">
            {/* Metrics table — left half */}
            <div className="panel overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-1/3">Metric</th>
                    <th className="text-right" style={{ color: '#0ea5e9' }}>{data.a.ticker}</th>
                    <th className="text-right" style={{ color: '#f59e0b' }}>{data.b.ticker}</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(m => {
                    const va = m.fmt(m.a), vb = m.fmt(m.b)
                    let clsA = 'font-mono text-[12px] text-slate-300', clsB = 'font-mono text-[12px] text-slate-300'
                    if (m.higher !== null && m.a != null && m.b != null) {
                      if ((m.higher && m.a > m.b) || (!m.higher && m.a < m.b))       { clsA = 'font-mono text-[12px] font-bold positive'; clsB = 'font-mono text-[12px] text-slate-500' }
                      else if ((m.higher && m.b > m.a) || (!m.higher && m.b < m.a))  { clsB = 'font-mono text-[12px] font-bold positive'; clsA = 'font-mono text-[12px] text-slate-500' }
                    }
                    return (
                      <tr key={m.label}>
                        <td className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{m.label}</td>
                        <td className={'text-right ' + clsA}>{va}</td>
                        <td className={'text-right ' + clsB}>{vb}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 text-[10px] font-mono text-slate-600 border-t border-white/5">
                Green = better · Lower P/E / Beta = better
              </div>
            </div>

            {/* Dual price chart — right half */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-electric-400" />
                <span className="font-display font-semibold text-[13px] text-slate-200">Price Performance</span>
              </div>
              <div className="h-80">
                <DualChart
                  chartA={data.a.chart} chartB={data.b.chart}
                  tickerA={data.a.ticker} tickerB={data.b.ticker}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────
export default function WorkstationTab({ portfolio, watchlist, initialTicker }) {
  const [sub, setSub] = useState('analyze')
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2">
        {[['analyze', '🔍 Analyze'], ['compare', '⚖️ Compare']].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            className={'px-4 py-2 rounded text-[12px] font-mono uppercase tracking-wider border transition-all ' +
              (sub === id ? 'bg-electric-500 text-navy-950 border-electric-500 font-semibold' : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20')}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'analyze'
        ? <AnalyzeView portfolio={portfolio} watchlist={watchlist} initialTicker={initialTicker} />
        : <CompareView portfolio={portfolio} watchlist={watchlist} />
      }
    </div>
  )
}
