import React, { useState, useEffect, useRef } from 'react'
import { Search, BarChart2, TrendingUp, Newspaper, Award, Users, Target, Star, Shield, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from 'recharts'
import { fmtPrice, fmtPct, fmtLarge, fmt } from '../lib/utils'
import { fetchWorkstationData, fetchCompareData } from '../hooks/usePortfolioData'


// ── InfoTip Component ─────────────────────────────────────────
function InfoTip({ text, children }) {
  const [show, setShow] = React.useState(false)
  const [align, setAlign] = React.useState('center')
  const ref = React.useRef(null)

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const tooltipWidth = 260
      const spaceLeft  = rect.left
      const spaceRight = window.innerWidth - rect.right
      if (spaceLeft < tooltipWidth / 2 + 10) setAlign('left')
      else if (spaceRight < tooltipWidth / 2 + 10) setAlign('right')
      else setAlign('center')
    }
    setShow(true)
  }

  const posStyle = align === 'left'
    ? { left: 0,    transform: 'none' }
    : align === 'right'
    ? { right: 0,   transform: 'none' }
    : { left: '50%', transform: 'translateX(-50%)' }

  return (
    <span ref={ref} className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}>
      {children}
      <span className="ml-1 text-slate-600 hover:text-electric-400 cursor-help text-[10px] select-none">ⓘ</span>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          ...posStyle,
          zIndex: 9999,
          width: 260,
          background: '#0a1628',
          border: '1px solid rgba(14,165,233,0.35)',
          borderRadius: 8,
          padding: '10px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#94a3b8', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      )}
    </span>
  )
}

const TOOLTIPS = {
  sharpe: `<b>Sharpe Ratio</b> — risk-adjusted return.<br/>
    🟢 &gt;1.0 = Good<br/>
    🟡 0–1.0 = Acceptable<br/>
    🔴 &lt;0 = Losing money per unit of risk<br/><br/>
    <i>Higher = better return for the risk taken</i>`,

  sortino: `<b>Sortino Ratio</b> — like Sharpe but only counts downside volatility.<br/>
    🟢 &gt;1.0 = Good<br/>
    🟡 0–1.0 = Acceptable<br/>
    🔴 &lt;0 = Poor<br/><br/>
    <i>Better than Sharpe for growth stocks with occasional big up-days</i>`,

  volatility: `<b>Annualized Volatility</b> — how much the stock swings per year.<br/>
    🟢 &lt;20% = Low (stable)<br/>
    🟡 20–35% = Medium<br/>
    🔴 &gt;35% = High (volatile)<br/><br/>
    <i>S&amp;P 500 avg is ~15%. Individual stocks typically 25–50%</i>`,

  maxDrawdown: `<b>Max Drawdown</b> — worst peak-to-trough drop in the period.<br/>
    🟢 &gt;-15% = Mild<br/>
    🟡 -15% to -30% = Moderate<br/>
    🔴 &lt;-30% = Severe<br/><br/>
    <i>Key for position sizing — can you stomach this drop?</i>`,

  grossMargin: `<b>Gross Margin</b> — revenue minus cost of goods sold.<br/>
    🟢 &gt;50% = Excellent (software, pharma)<br/>
    🟡 30–50% = Good<br/>
    🔴 &lt;20% = Low (retail, hardware)<br/><br/>
    <i>Arrow shows trend vs 3-year average</i>`,

  ebitMargin: `<b>EBIT Margin</b> — operating profit as % of revenue.<br/>
    🟢 &gt;25% = Excellent<br/>
    🟡 10–25% = Good<br/>
    🔴 &lt;10% = Thin<br/><br/>
    <i>Strips out interest &amp; taxes — pure operating efficiency</i>`,

  netMargin: `<b>Net Margin</b> — bottom-line profit as % of revenue.<br/>
    🟢 &gt;20% = Excellent<br/>
    🟡 5–20% = Good<br/>
    🔴 &lt;5% = Thin<br/><br/>
    <i>After all costs including taxes &amp; interest</i>`,

  revenueGrowth: `<b>Revenue CAGR</b> — compound annual growth rate over 3 or 5 years.<br/>
    🟢 &gt;15% = High growth<br/>
    🟡 5–15% = Moderate<br/>
    🔴 &lt;5% = Slow<br/><br/>
    <i>Consistency matters more than a single big year</i>`,

  earningsGrowth: `<b>Earnings CAGR</b> — net income compound growth rate.<br/>
    🟢 &gt;15% = Strong<br/>
    🟡 5–15% = Decent<br/>
    🔴 Negative = Declining profits<br/><br/>
    <i>Should grow faster than revenue for margin expansion</i>`,

  fairValue: `<b>Fair Value</b> — computed by Eulerpool using two models:<br/>
    • <b>Income model</b>: DCF on projected net income<br/>
    • <b>Revenue model</b>: P/S multiple vs peers<br/><br/>
    <i>Use as a reference, not a precise target. ±20% is normal uncertainty</i>`,

  earningsQuality: `<b>Earnings Quality Score (0–10)</b><br/>
    Based on how consistently the company beats EPS estimates.<br/>
    🟢 8–10 = Excellent (reliable beats)<br/>
    🟡 5–7 = Average<br/>
    🔴 0–4 = Poor (frequent misses)<br/><br/>
    <i>A high score = management guides conservatively and executes well</i>`,

  priceTarget: `<b>Analyst Price Targets</b> — aggregated from major brokerages via FMP.<br/>
    • <b>Bull</b>: most optimistic analyst<br/>
    • <b>Consensus</b>: average of all analysts<br/>
    • <b>Bear</b>: most pessimistic analyst<br/><br/>
    <i>Wide spread = high analyst disagreement = more uncertainty</i>`,

  insiderActivity: `<b>Insider Activity</b> — executives buying/selling their own stock.<br/>
    🟢 Open Mkt Buy = strong bullish signal<br/>
    ⚪ Plan/ESPP Buy = payroll-plan purchase, not a discretionary bet — excluded from the verdict<br/>
    🔴 Open Mkt Sale = may be liquidity, not bearish<br/><br/>
    <i>Buys are meaningful. Sales are often planned (diversification, taxes) — less significant unless large &amp; sudden</i>`,
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUQqqI6PAa64xq5ZALeJSUWuy86pVtSEG6rIMhgNOQ-7XS-t7PJRRncJ1mi7OAwd0/exec'

function jsonpOnce(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout')) }, timeoutMs)
    function cleanup() { clearTimeout(timeout); delete window[cbName]; if (script.parentNode) script.parentNode.removeChild(script) }
    window[cbName] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('Script load failed')) }
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cbName + '&cb=' + Date.now()
    document.head.appendChild(script)
  })
}

// Analyzing a stock chains ~12 external API calls server-side, and the background
// scorer can add contention; a slow-but-working request shouldn't surface as an error.
// One retry with a longer budget absorbs that, without masking a genuinely broken request.
async function jsonp(url) {
  try {
    return await jsonpOnce(url, 30000)
  } catch (e) {
    return await jsonpOnce(url, 45000)
  }
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

// ── MC Score panel (v2) ───────────────────────────────────────
const MC_SCORE_TIP = `<b>MC Score (0–10)</b> — computed by a fixed-rule model: 7 factors, 30+ research-backed signals. AI never picks the number.<br/><br/>
  🟢 8–10 Strong Buy · 6.5–8 Buy<br/>
  🟡 4.5–6.5 Hold<br/>
  🔴 3–4.5 Sell · 0–3 Strong Sell<br/><br/>
  <i>Benchmarked against sector medians, adjusted for the market regime, and it learns from its own 30-day results.</i>`

const RANGE_TIP = `<b>Likely range</b> — how far the score could move if the data were slightly different.<br/>Narrow = factors agree. Wide = the stock is controversial: strong on some factors, weak on others.<br/><br/><i>Two stocks with the same score but different ranges are very different bets.</i>`

const AGREE_TIP = `<b>Factor agreement</b><br/>🟢 Strong agreement — all factors point the same way (higher conviction)<br/>🟡 Mixed — some disagreement<br/>🔴 Conflicted — e.g. great momentum but terrible value. Size positions smaller.`

const REGIME_TIP = `<b>Market regime</b> — read from the VIX and the S&amp;P 500 vs its 200-day average.<br/><br/>
  🔴 <b>Risk-off</b> (VIX ≥ 25 or S&amp;P below its 200d): momentum weight cut, quality &amp; low-risk raised. Momentum strategies historically crash in stressed markets (Daniel &amp; Moskowitz, 2016).<br/>
  🟡 <b>Neutral</b>: research base weights.<br/>
  🟢 <b>Risk-on</b> (VIX &lt; 16, S&amp;P rising): momentum &amp; growth raised.`

const LEARN_TIP = `<b>Self-learning weights</b><br/>Every stock in your universe is scored daily and logged. After 30 days the model checks which factors actually predicted returns vs the S&amp;P 500 — on YOUR stocks.<br/><br/>
  Weights move only when a factor's edge is statistically significant (Fama-MacBeth regression, Bonferroni-corrected 95% bar). Tested on 60 simulated markets: it found the real signals and ignored noise.<br/><br/><i>Needs ~3 months of results before it changes anything.</i>`

const IC_TIP = `<b>Information coefficient (IC)</b> — rank correlation between the score and the next 30-day return vs the S&amp;P 500.<br/><br/>0.00 = no skill · 0.05+ = useful · 0.10+ = excellent (top quant funds live around 0.05–0.10)<br/><br/><i>t-stat shows how confident we are it's not luck.</i>`

const FACTOR_TIPS = {
  momentum: `<b>Momentum &amp; Trend</b><br/>• 12-1 month return (Jegadeesh &amp; Titman, 1993)<br/>• Risk-adjusted momentum (Barroso &amp; Santa-Clara, 2015)<br/>• Strength vs S&amp;P 500<br/>• Nearness to 52-week high (George &amp; Hwang, 2004)<br/>• Trend smoothness — steady gains persist more than jumps (Da, Gurun &amp; Warachka, 2014)<br/>• 50/200-day trend`,
  value: `<b>Value</b><br/>• Fair value upside (Eulerpool)<br/>• P/E vs sector median and PEG<br/>• Free cash flow yield<br/>• Analyst targets, discounted ~10% for their historical optimism<br/><br/><i>Cheap stocks outperform over long horizons (Fama &amp; French).</i>`,
  quality: `<b>Quality &amp; Balance Sheet</b><br/>• Margins vs sector (Novy-Marx, 2013)<br/>• ROE / ROIC, margin trend, debt<br/>• Piotroski F-Score — 9 accounting health tests (2000)<br/>• Accruals — are earnings backed by cash? (Sloan, 1996)<br/>• Share dilution vs buybacks (Pontiff &amp; Woodgate, 2008)`,
  growth: `<b>Growth</b><br/>• 3-year revenue &amp; earnings CAGR<br/>• Latest 12-month revenue &amp; EPS growth<br/>• Acceleration — is growth speeding up or slowing?`,
  earnings: `<b>Earnings Surprises</b><br/>Stocks drift after surprises for weeks (Bernard &amp; Thomas, 1989).<br/>• Beat rate &amp; average surprise<br/>• Standardized surprise (SUE) — surprise ÷ its usual size<br/>• The effect fades with time since the report`,
  smart: `<b>Smart Money</b><br/>• Insider open-market <b>purchases</b> — strongest signal, especially several insiders at once (Lakonishok &amp; Lee, 2001)<br/>• Recent buys count more (90-day half-life)<br/>• Insider sales count lightly — often taxes or diversification<br/>• Analyst upgrade/downgrade trend (Womack, 1996)`,
  risk: `<b>Risk</b><br/>Low-volatility stocks deliver better risk-adjusted returns (Frazzini &amp; Pedersen, 2014).<br/>Volatility, max drawdown, Sharpe ratio, beta.<br/><br/><i>Weight rises automatically in stressed markets.</i>`,
}

const mcColor = s => s == null ? '#475569' : s >= 6.5 ? '#00ff88' : s >= 4.5 ? '#ffb800' : '#ff4466'
const REGIME_STYLE = {
  'risk-off': { c: '#ff4466', t: 'Risk-off' },
  'neutral':  { c: '#ffb800', t: 'Neutral market' },
  'risk-on':  { c: '#00ff88', t: 'Risk-on' },
}
const AGREE_COLOR = { 'Strong agreement': '#00ff88', 'Mixed signals': '#ffb800', 'Conflicted': '#ff4466' }
const FACTOR_NAMES = { momentum: 'Momentum', value: 'Value', quality: 'Quality', growth: 'Growth', earnings: 'Earnings', smart: 'Smart Money', risk: 'Risk' }
const Chip = ({ color, children }) => (
  <span style={{ color, borderColor: color + '55', background: color + '14' }} className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap">{children}</span>
)
const th = { padding: '6px 8px', fontFamily: 'IBM Plex Mono', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid rgba(14,165,233,0.08)', whiteSpace: 'nowrap' }
const td = { padding: '6px 8px', fontFamily: 'IBM Plex Mono', fontSize: 11, whiteSpace: 'nowrap' }
const pctColor = v => v == null ? '#475569' : v >= 0 ? '#00ff88' : '#ff4466'

const MCScorePanel = React.memo(function MCScorePanel({ mc, ticker, isMobile, aiSummary, aiLoading, aiError, onGenerate }) {
  const [openKey, setOpenKey] = useState(null)
  const [showTrack, setShowTrack] = useState(false)
  const [track, setTrack] = useState(null)
  const [trackLoading, setTrackLoading] = useState(false)

  if (!mc) {
    return (
      <div className="panel p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-electric-400" />
          <span className="font-display font-semibold text-[13px] text-slate-200">MC Score</span>
        </div>
        <div className="font-mono text-[11px] text-slate-600 mt-3">Score unavailable — not enough data for {ticker}.</div>
      </div>
    )
  }

  const col = mcColor(mc.score)
  const confCol = mc.confidence === 'High' ? '#00ff88' : mc.confidence === 'Medium' ? '#ffb800' : '#ff4466'
  const reg = REGIME_STYLE[(mc.regime && mc.regime.name) || 'neutral'] || REGIME_STYLE.neutral
  const range = mc.range || { low: mc.score, high: mc.score }
  const learning = mc.learning || {}

  const toggleTrack = async () => {
    const next = !showTrack
    setShowTrack(next)
    if (!next || track || trackLoading) return
    setTrackLoading(true)
    try { setTrack(await jsonp(APPS_SCRIPT_URL + '?action=getScoreTrackRecord')) }
    catch (e) { setTrack({ error: e.message }) }
    finally { setTrackLoading(false) }
  }

  return (
    <div className="panel p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles size={14} className="text-electric-400" />
          <InfoTip text={MC_SCORE_TIP}><span className="font-display font-semibold text-[13px] text-slate-200">MC Score</span></InfoTip>
          <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">v{mc.version} · 7 factors · 30+ signals</span>
          <Chip color={confCol}>{mc.confidence} confidence · {mc.coverage}% data</Chip>
          <InfoTip text={REGIME_TIP + (mc.regime && mc.regime.note ? `<br/><br/><b>Now:</b> ${mc.regime.note}${mc.regime.vix != null ? ` (VIX ${Number(mc.regime.vix).toFixed(1)})` : ''}` : '')}>
            <Chip color={reg.c}>{reg.t}</Chip>
          </InfoTip>
          <InfoTip text={LEARN_TIP}>
            <Chip color={learning.active ? '#38bdf8' : '#64748b'}>{learning.active ? `Self-tuned · ${learning.periods} mo` : 'Self-learning · collecting'}</Chip>
          </InfoTip>
        </div>
        <button onClick={toggleTrack}
          className="font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-electric-400 border border-white/10 hover:border-electric-500/30 px-2.5 py-1 rounded transition-all">
          {showTrack ? 'Hide' : 'Track record'}
        </button>
      </div>

      <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`}>
        {/* Headline score */}
        <div className={isMobile ? '' : 'col-span-3'}>
          <div className="flex items-end gap-2">
            <span style={{ color: col, fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 56, lineHeight: 1 }}>{mc.score.toFixed(1)}</span>
            <span className="font-mono text-[13px] text-slate-600 mb-2">/10</span>
          </div>
          <div style={{ color: col }} className="font-display font-bold text-[18px] mt-1">{mc.label}</div>
          <div className="relative h-2 rounded mt-3" style={{ background: 'linear-gradient(90deg,#ff4466 0%,#ff4466 30%,#ffb800 45%,#ffb800 65%,#00ff88 80%,#00ff88 100%)', opacity: 0.85 }}>
            <div className="absolute -top-1 h-4 rounded-sm"
              style={{ left: range.low * 10 + '%', width: Math.max(0.5, (range.high - range.low) * 10) + '%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)' }} />
            <div style={{ left: `calc(${mc.score * 10}% - 6px)`, borderColor: col }} className="absolute -top-1 w-3 h-4 rounded-sm bg-navy-950 border-2" />
          </div>
          <div className="flex justify-between font-mono text-[8px] text-slate-600 mt-1 uppercase tracking-wider">
            <span>Sell</span><span>Hold</span><span>Buy</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="font-mono text-[10px] text-slate-400">
              <InfoTip text={RANGE_TIP}><span>Likely range {range.low.toFixed(1)}–{range.high.toFixed(1)}</span></InfoTip>
            </div>
            {mc.agreement && (
              <InfoTip text={AGREE_TIP}><Chip color={AGREE_COLOR[mc.agreement] || '#64748b'}>{mc.agreement}</Chip></InfoTip>
            )}
            {mc.universe && (
              <div className="font-mono text-[10px] text-slate-400">
                <span className="text-electric-300 font-semibold">#{mc.universe.rank}</span> of {mc.universe.n} in your universe
                {mc.universe.beats != null && <span className="text-slate-600"> · beats {mc.universe.beats}%</span>}
              </div>
            )}
            {mc.sector && <div className="font-mono text-[10px] text-slate-600">Benchmarked vs {mc.sector} peers</div>}
          </div>
          {mc.caps && mc.caps.length > 0 && (
            <div className="mt-3 space-y-1">
              {mc.caps.map((c, i) => <div key={i} className="font-mono text-[10px] text-terminal-amber leading-snug">⚠ {c}</div>)}
            </div>
          )}
        </div>

        {/* Factor breakdown */}
        <div className={isMobile ? '' : 'col-span-5'}>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-2">Factor breakdown · tap for detail</div>
          <div className="space-y-1">
            {mc.factors.map(f => {
              const base = f.baseWeight != null ? f.baseWeight : f.weight
              const delta = f.weight - base
              return (
                <div key={f.key}>
                  <button onClick={() => setOpenKey(openKey === f.key ? null : f.key)}
                    className="w-full flex items-center gap-2 py-1 text-left">
                    <span className="font-mono text-[11px] text-slate-300 w-[140px] flex-shrink-0 truncate">
                      <InfoTip text={FACTOR_TIPS[f.key]}>{f.name}</InfoTip>
                    </span>
                    <span className="font-mono text-[9px] text-slate-600 w-10 flex-shrink-0"
                      title={Math.abs(delta) >= 0.005 ? `Adjusted from ${Math.round(base * 100)}% (market regime / learned results)` : 'Research base weight'}>
                      {Math.round(f.weight * 100)}%{Math.abs(delta) >= 0.005 && <span style={{ color: delta > 0 ? '#00ff88' : '#ff4466' }}>{delta > 0 ? '↑' : '↓'}</span>}
                    </span>
                    <div className="flex-1 h-1.5 bg-navy-800 rounded overflow-hidden">
                      <div style={{ width: f.score == null ? 0 : f.score * 10 + '%', background: mcColor(f.score) }} className="h-full rounded" />
                    </div>
                    <span style={{ color: mcColor(f.score) }} className="font-mono text-[11px] font-semibold w-8 text-right flex-shrink-0">
                      {f.score == null ? '—' : f.score.toFixed(1)}
                    </span>
                  </button>
                  {openKey === f.key && (
                    <div className="ml-2 mb-2 pl-3 border-l border-electric-500/20 space-y-0.5">
                      {f.metrics.map(m => (
                        <div key={m.label} className="flex justify-between gap-3 font-mono text-[10px]">
                          <span className="text-slate-500">{m.label}</span>
                          <span className="text-slate-300 text-right">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Signals */}
        <div className={isMobile ? '' : 'col-span-4'}>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-2">Key signals · most important first</div>
          <div className="space-y-1.5">
            {mc.flags.green.map((s, i) => (
              <div key={'g' + i} className="flex gap-2 font-mono text-[11px] text-slate-300 leading-snug"><span className="text-terminal-green flex-shrink-0">▲</span>{s}</div>
            ))}
            {mc.flags.red.map((s, i) => (
              <div key={'r' + i} className="flex gap-2 font-mono text-[11px] text-slate-300 leading-snug"><span className="text-terminal-red flex-shrink-0">▼</span>{s}</div>
            ))}
            {!mc.flags.green.length && !mc.flags.red.length && (
              <div className="font-mono text-[11px] text-slate-600">No strong signals either way.</div>
            )}
          </div>
        </div>
      </div>

      {/* Track record */}
      {showTrack && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-2">
            Model track record · 30-day return after each score, vs S&amp;P 500
          </div>
          {trackLoading && <div className="font-mono text-[11px] text-slate-500 animate-pulse">Checking every past score against what happened next…</div>}
          {track && track.error && <div className="font-mono text-[11px] text-terminal-red">{track.error}</div>}
          {track && !track.error && track.matured === 0 && (
            <div className="font-mono text-[11px] text-slate-500 leading-relaxed">
              Collecting data: {track.total} score{track.total === 1 ? '' : 's'} logged{track.firstDate ? ' since ' + track.firstDate : ''}.
              {track.firstResults && <> First 30-day results on <span className="text-slate-300">{track.firstResults}</span>.</>}
              {' '}Your whole universe is scored automatically every day, so evidence builds fast.
            </div>
          )}
          {track && !track.error && track.matured > 0 && (
            <div className="space-y-3">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Rating', 'Outcomes', 'Avg 30d', 'vs S&P 500', 'Beat S&P'].map((h, i) => (
                      <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {track.buckets.map(b => (
                      <tr key={b.label}>
                        <td style={{ ...td, color: '#cbd5e1' }}>{b.label}</td>
                        <td style={{ ...td, color: '#64748b', textAlign: 'right' }}>{b.n}</td>
                        <td style={{ ...td, textAlign: 'right', color: pctColor(b.avgReturn) }}>{b.avgReturn == null ? '—' : fmtPct(b.avgReturn, 1)}</td>
                        <td style={{ ...td, fontWeight: 700, textAlign: 'right', color: pctColor(b.avgVsSpy) }}>{b.avgVsSpy == null ? '—' : fmtPct(b.avgVsSpy, 1)}</td>
                        <td style={{ ...td, color: '#94a3b8', textAlign: 'right' }}>{b.beatSpyRate == null ? '—' : b.beatSpyRate.toFixed(0) + '%'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {track.icScore && track.icScore.mean != null && (
                <div className="font-mono text-[11px] text-slate-400">
                  <InfoTip text={IC_TIP}><span>Model skill (IC)</span></InfoTip>{' '}
                  <span style={{ color: track.icScore.mean >= 0.05 ? '#00ff88' : track.icScore.mean > 0 ? '#ffb800' : '#ff4466', fontWeight: 700 }}>
                    {track.icScore.mean >= 0 ? '+' : ''}{track.icScore.mean.toFixed(3)}
                  </span>
                  <span className="text-slate-600"> · t={track.icScore.t != null ? track.icScore.t.toFixed(1) : '—'} over {track.periods} independent period{track.periods === 1 ? '' : 's'}</span>
                </div>
              )}
              {track.factors && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>{['Factor', 'IC', 't-stat', 'Weight now'].map((h, i) => (
                        <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {track.factors.map(f => (
                        <tr key={f.key}>
                          <td style={{ ...td, color: '#cbd5e1' }}>{FACTOR_NAMES[f.key] || f.key}</td>
                          <td style={{ ...td, textAlign: 'right', color: f.ic == null ? '#475569' : f.ic > 0 ? '#00ff88' : '#ff4466' }}>{f.ic == null ? '—' : (f.ic >= 0 ? '+' : '') + f.ic.toFixed(3)}</td>
                          <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>{f.t == null ? '—' : f.t.toFixed(1)}</td>
                          <td style={{ ...td, textAlign: 'right', color: f.mult > 1.005 ? '#00ff88' : f.mult < 0.995 ? '#ff4466' : '#64748b' }}>×{(f.mult == null ? 1 : f.mult).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="font-mono text-[10px] text-slate-600 leading-relaxed">
                {track.matured} outcomes. A working model shows Strong Buy &gt; Buy &gt; Hold &gt; Sell in "vs S&amp;P 500".
                {' '}{track.learning && track.learning.active ? `Weights self-tuned from ${track.learning.periods} independent periods.` : 'Weights stay at the research base until ~3 months of significant evidence.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Claude explanation */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">Analyst explanation · Claude</span>
          {!aiSummary && !aiLoading && (
            <button onClick={onGenerate}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-electric-500/30 bg-electric-500/10 text-electric-400 text-[10px] font-mono uppercase tracking-wider hover:border-electric-500/50 hover:bg-electric-500/15 transition-all">
              <Sparkles size={10} /> Explain this score
            </button>
          )}
        </div>
        {aiLoading && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-4 h-4 rounded-full border-2 border-electric-500/30 border-t-electric-500 animate-spin flex-shrink-0" />
            <div className="font-mono text-[12px] text-slate-500 animate-pulse">Claude is reviewing the factors and headlines for {ticker}…</div>
          </div>
        )}
        {aiError && <div className="font-mono text-[11px] text-terminal-red py-1">{aiError}</div>}
        {aiSummary && (
          <div className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap border-l-2 border-electric-500/30 pl-4">{aiSummary}</div>
        )}
        {!aiSummary && !aiLoading && !aiError && (
          <div className="font-mono text-[11px] text-slate-600">Claude explains what drives the score and checks recent headlines for risks the numbers can't see (~$0.002).</div>
        )}
      </div>

      <div className="font-mono text-[9px] text-slate-700 mt-4">
        Systematic model output, not financial advice. No model predicts the future — use the range, agreement and track record to size positions.
      </div>
    </div>
  )
}, (prev, next) => (
  prev.mc === next.mc && prev.ticker === next.ticker && prev.isMobile === next.isMobile &&
  prev.aiSummary === next.aiSummary && prev.aiLoading === next.aiLoading && prev.aiError === next.aiError
))

// ── Stock Selector — isolated so typing doesn't re-render the score panel ──
const StockSelector = React.memo(function StockSelector({ allStocks, loading, onRun, presetTicker }) {
  const [ticker,   setTicker]   = React.useState(presetTicker || '')
  const [selectVal,setSelectVal]= React.useState('')
  const lastPreset = React.useRef(presetTicker)

  React.useEffect(() => {
    if (presetTicker && presetTicker !== lastPreset.current) {
      lastPreset.current = presetTicker
      setTicker(presetTicker)
      setSelectVal('')
    }
  }, [presetTicker])

  const handleRun = () => {
    const t = (ticker || selectVal || '').trim().toUpperCase()
    if (t) onRun(t)
  }

  // Sync select back to empty when parent resets
  return (
    <div className="flex gap-2 flex-wrap items-center">
      <select value={selectVal} onChange={e => { setSelectVal(e.target.value); setTicker('') }}
        className="bg-navy-800/60 border border-white/10 rounded px-3 py-2.5 text-[12px] font-mono text-slate-400 focus:outline-none focus:border-electric-500/40 flex-1 min-w-48 appearance-none cursor-pointer">
        <option value="">— Pick from my list —</option>
        {allStocks.map(r => <option key={r.ticker} value={r.ticker}>{r.ticker} — {r.company}</option>)}
      </select>
      <div className="relative flex-1 min-w-48">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={ticker} onChange={e => { setTicker(e.target.value.toUpperCase()); setSelectVal('') }}
          onKeyDown={e => e.key === 'Enter' && handleRun()}
          placeholder="…or type any US ticker (NVDA, AAPL)"
          className="w-full bg-navy-800/60 border border-white/10 rounded px-8 py-2.5 text-[12px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-electric-500/40" />
      </div>
      <button onClick={handleRun} disabled={loading}
        className="btn-primary px-5 py-2.5 rounded font-mono text-[12px] uppercase tracking-wider font-semibold disabled:opacity-40 flex items-center gap-2">
        <BarChart2 size={13} />{loading ? 'Loading…' : 'Analyze'}
      </button>
    </div>
  )
})

// ── Analyze view ──────────────────────────────────────────────
function AnalyzeView({ portfolio, watchlist, initialTicker, isMobile }) {
  const [data,        setData]        = useState(null)
  const [revenueData, setRevenueData] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [chartPeriod, setChartPeriod] = useState('1Y')
  const [aiSummary,   setAiSummary]   = useState(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState(null)
  const lastAutoTicker = useRef(null)

  const run = async (t) => {
    const target = (t || '').trim().toUpperCase()
    if (!target) return
    setLoading(true); setError(null); setData(null); setRevenueData(null); setChartPeriod('1Y')
    setAiSummary(null); setAiError(null)
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

  const fetchAISummary = React.useCallback(async () => {
    if (!data) return
    setAiLoading(true); setAiError(null)
    try {
      const result = await jsonp(APPS_SCRIPT_URL + '?action=getAISummary&ticker=' + encodeURIComponent(data.ticker))
      if (result.error) setAiError(result.error)
      else setAiSummary(result.summary)
    } catch (e) { setAiError(e.message) }
    finally { setAiLoading(false) }
  }, [data])

  useEffect(() => {
    if (initialTicker && initialTicker !== lastAutoTicker.current) {
      lastAutoTicker.current = initialTicker
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
      {/* Selector bar — isolated to prevent score panel flicker */}
      <StockSelector
        allStocks={allStocks}
        loading={loading}
        onRun={run}
        presetTicker={initialTicker}
      />

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
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
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
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
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

          {/* MC Score — quantitative model + Claude explanation */}
          <MCScorePanel
            mc={data.mcScore}
            ticker={data.ticker}
            isMobile={isMobile}
            aiSummary={aiSummary}
            aiLoading={aiLoading}
            aiError={aiError}
            onGenerate={fetchAISummary}
          />

          {/* Phase 1: Earnings Quality + Price Targets + Insider Activity */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>

            {/* Earnings Quality Score */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <Star size={14} className="text-terminal-amber" />
                <InfoTip text={TOOLTIPS.earningsQuality}><span className="font-display font-semibold text-[13px] text-slate-200">Earnings Quality</span></InfoTip>
              </div>
              {(() => {
                const earnings = data.earnings || []
                if (!earnings.length) return <div className="text-[11px] font-mono text-slate-600">No data</div>
                const withSurprise = earnings.filter(e => e.surprisePercent != null)
                const beats = withSurprise.filter(e => e.surprisePercent > 0).length
                const total = withSurprise.length
                const avgSurprise = total ? withSurprise.reduce((s,e) => s + e.surprisePercent, 0) / total : 0
                const score = total ? Math.round((beats / total) * 10) : null
                const scoreColor = score >= 8 ? '#00ff88' : score >= 5 ? '#ffb800' : '#ff4466'
                const scoreLabel = score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Average' : 'Poor'
                return (
                  <div>
                    <div className="flex items-end gap-2 mb-3">
                      <span style={{fontFamily:'Space Grotesk',fontWeight:700,fontSize:42,color:scoreColor,lineHeight:1}}>{score ?? '—'}</span>
                      <span className="font-mono text-[11px] text-slate-500 mb-1">/10</span>
                      <span style={{color:scoreColor}} className="font-mono text-[12px] mb-1 font-semibold">{scoreLabel}</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Beat rate</span>
                        <span className="text-slate-200">{beats}/{total} quarters</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg surprise</span>
                        <span className={avgSurprise >= 0 ? 'positive' : 'negative'}>{avgSurprise > 0 ? '+' : ''}{avgSurprise.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 mt-3">
                      {withSurprise.slice().reverse().map((e, i) => (
                        <div key={i} title={e.period + ': ' + (e.surprisePercent > 0 ? 'Beat' : 'Miss') + ' ' + e.surprisePercent?.toFixed(1) + '%'}
                          style={{flex:1, height:24, borderRadius:3, background: e.surprisePercent > 0 ? 'rgba(0,255,136,0.7)' : 'rgba(255,68,102,0.7)'}} />
                      ))}
                    </div>
                    <div className="font-mono text-[9px] text-slate-600 mt-1 text-center">Last {withSurprise.length} quarters ← oldest · newest →</div>
                  </div>
                )
              })()}
            </div>

            {/* Price Target Distribution */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-electric-400" />
                <InfoTip text={TOOLTIPS.priceTarget}><span className="font-display font-semibold text-[13px] text-slate-200">Price Targets</span></InfoTip>
              </div>
              {(() => {
                const pt = data.priceTargets
                const currentPrice = livePrice?.price
                if (!pt || !pt.targetMean) return <div className="text-[11px] font-mono text-slate-600">No analyst targets</div>
                const upside = currentPrice ? ((pt.targetMean - currentPrice) / currentPrice) * 100 : null
                const upsideHigh = currentPrice ? ((pt.targetHigh - currentPrice) / currentPrice) * 100 : null
                const upsideLow = currentPrice && pt.targetLow ? ((pt.targetLow - currentPrice) / currentPrice) * 100 : null
                return (
                  <div className="space-y-3">
                    <div className="flex items-end gap-2">
                      <span className="font-display font-bold text-[28px] text-slate-100 leading-none">{fmtPrice(pt.targetMean)}</span>
                      {upside != null && <span className={`font-mono text-[13px] font-semibold mb-0.5 ${upside >= 0 ? 'positive' : 'negative'}`}>{upside > 0 ? '+' : ''}{upside.toFixed(1)}%</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Consensus target</div>
                    <div className="space-y-2">
                      {[
                        { label: 'Bull (High)', value: pt.targetHigh, upside: upsideHigh, color: '#00ff88' },
                        { label: 'Consensus', value: pt.targetMean, upside, color: '#38bdf8' },
                        { label: 'Bear (Low)', value: pt.targetLow, upside: upsideLow, color: '#ff4466' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-500">{row.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200">{row.value ? fmtPrice(row.value) : '—'}</span>
                            {row.upside != null && <span style={{color:row.color}}>({row.upside > 0 ? '+' : ''}{row.upside.toFixed(1)}%)</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Insider Activity */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-electric-400" />
                <InfoTip text={TOOLTIPS.insiderActivity}><span className="font-display font-semibold text-[13px] text-slate-200">Insider Activity</span></InfoTip>
              </div>
              {(() => {
                const insiders = data.insiders || []
                if (!insiders.length) return <div className="text-[11px] font-mono text-slate-600">No recent insider transactions</div>
                const allBuys  = insiders.filter(t => t.transactionCode === 'P')
                const planBuys = allBuys.filter(t => t.isPlanBuy === true)
                const buys     = allBuys.filter(t => t.isPlanBuy !== true)   // genuine, discretionary buys only
                const sells    = insiders.filter(t => t.transactionCode === 'S')
                const netSentiment = buys.length > sells.length ? 'Bullish' : buys.length < sells.length ? 'Bearish' : 'Neutral'
                const sentColor = buys.length > sells.length ? '#00ff88' : buys.length < sells.length ? '#ff4466' : '#64748b'
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-y-1">
                      <div className="flex gap-3 flex-wrap">
                        <span className="font-mono text-[12px]"><span className="positive font-bold">{buys.length} BUY</span></span>
                        <span className="font-mono text-[12px]"><span className="negative font-bold">{sells.length} SELL</span></span>
                        {planBuys.length > 0 && (
                          <span className="font-mono text-[12px] text-slate-500">{planBuys.length} plan/ESPP</span>
                        )}
                      </div>
                      <span style={{color:sentColor}} className="font-mono text-[11px] font-semibold">{netSentiment}</span>
                    </div>
                    {planBuys.length > 0 && (
                      <div className="font-mono text-[9px] text-slate-600 leading-snug">
                        {planBuys.length} of the buys below are payroll-plan purchases (several insiders, same day, same price) — excluded from the verdict above.
                      </div>
                    )}
                    {(() => {
                      const txLabel = code => {
                        switch(code) {
                          case 'P': return { label: 'Open Mkt Buy',  color: '#00ff88', signal: '🟢 Strong signal' }
                          case 'PLAN': return { label: 'Plan/ESPP Buy', color: '#64748b', signal: '' }
                          case 'S': return { label: 'Open Mkt Sale', color: '#ff4466', signal: '🔴 Sale' }
                          case 'A': return { label: 'Award/Grant',   color: '#475569', signal: '' }
                          case 'F': return { label: 'Tax Withhold',  color: '#475569', signal: '' }
                          case 'M': return { label: 'Option Exer.',  color: '#64748b', signal: '' }
                          default:  return { label: code || 'Other', color: '#475569', signal: '' }
                        }
                      }
                      const meaningful = insiders.filter(t => ['P','S'].includes(t.transactionCode))
                      const all = insiders
                      return (
                        <div className="space-y-1 overflow-auto max-h-48">
                          {all.slice(0, 8).map((t, i) => {
                            const tx = txLabel(t.isPlanBuy === true ? 'PLAN' : t.transactionCode)
                            const isMeaningful = t.transactionCode === 'P' || t.transactionCode === 'S'
                            // Skip non-meaningful transaction types
                          if (['F','A','M'].includes(t.transactionCode)) return null
                          return (
                              <div key={i} className="flex items-start justify-between py-1.5 border-b border-white/5 last:border-0">
                                <div className="min-w-0 flex-1 mr-2">
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(t.name + ' ' + data.ticker + ' insider executive')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="font-mono text-[11px] text-electric-300 hover:text-electric-200 hover:underline truncate block transition-colors cursor-pointer"
                                    title="Search on Google"
                                  >{t.name}</a>
                                  {t.role && (
                                    <div className="font-mono text-[9px] text-slate-500 truncate">{t.role}</div>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span style={{color: tx.color, fontSize:'9px', fontFamily:'IBM Plex Mono', fontWeight:700}}>
                                      {tx.label}
                                    </span>
                                    {tx.signal && <span style={{fontSize:'8px'}}>{tx.signal.split(' ')[0]}</span>}
                                  </div>
                                  <div className="font-mono text-[9px] text-slate-600">{t.date}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div style={{color: tx.color}} className="font-mono text-[11px] font-bold">
                                    {t.transactionCode === 'P' ? '+' : '−'}
                                    {Math.abs(t.change || 0).toLocaleString()}
                                  </div>
                                  {t.value > 0 && (
                                    <div className="font-mono text-[9px] text-slate-500">
                                      ${fmtLarge(t.value)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {meaningful.length === 0 && (
                            <div className="font-mono text-[10px] text-slate-600 text-center py-2">No open-market transactions recently</div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Phase 2: Risk Profile + Fair Value + Margins + Growth */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>

            {/* Risk Profile */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={14} className="text-terminal-red" />
                <span className="font-display font-semibold text-[13px] text-slate-200">Risk Profile</span>
                <span className="ml-auto font-mono text-[9px] text-slate-600 uppercase">1Y</span>
              </div>
              {data.riskProfile ? (() => {
                const r = data.riskProfile
                const sharpeColor = r.sharpeRatio > 1 ? '#00ff88' : r.sharpeRatio > 0 ? '#ffb800' : '#ff4466'
                const volColor = r.annualizedVolatility < 20 ? '#00ff88' : r.annualizedVolatility < 35 ? '#ffb800' : '#ff4466'
                return (
                  <div className="space-y-2.5">
                    {[
                      { label: <InfoTip text={TOOLTIPS.volatility}>Volatility (Ann.)</InfoTip>, value: r.annualizedVolatility ? r.annualizedVolatility.toFixed(1) + '%' : '—', color: volColor },
                      { label: <InfoTip text={TOOLTIPS.maxDrawdown}>Max Drawdown</InfoTip>,     value: r.maxDrawdown ? r.maxDrawdown.toFixed(1) + '%' : '—',           color: '#ff4466' },
                      { label: <InfoTip text={TOOLTIPS.sharpe}>Sharpe Ratio</InfoTip>,     value: r.sharpeRatio  ? r.sharpeRatio.toFixed(2)  : '—',               color: sharpeColor },
                      { label: <InfoTip text={TOOLTIPS.sortino}>Sortino Ratio</InfoTip>,    value: r.sortinoRatio ? r.sortinoRatio.toFixed(2) : '—',               color: sharpeColor },
                      { label: 'Total Return 1Y',  value: r.totalReturn  != null ? (r.totalReturn > 0 ? '+' : '') + r.totalReturn.toFixed(1) + '%' : '—', color: r.totalReturn >= 0 ? '#00ff88' : '#ff4466' },
                      { label: 'Best Day',         value: r.bestDay  ? '+' + r.bestDay.toFixed(1) + '%'  : '—', color: '#00ff88' },
                      { label: 'Worst Day',        value: r.worstDay ? r.worstDay.toFixed(1) + '%' : '—', color: '#ff4466' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="font-mono text-[10px] text-slate-500">{label}</span>
                        <span style={{ color }} className="font-mono text-[11px] font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                )
              })() : <div className="font-mono text-[11px] text-slate-600">No risk data</div>}
            </div>

            {/* Fair Value */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-terminal-amber" />
                <InfoTip text={TOOLTIPS.fairValue}><span className="font-display font-semibold text-[13px] text-slate-200">Fair Value</span></InfoTip>
                <span className="ml-auto font-mono text-[9px] text-slate-600 uppercase">Eulerpool</span>
              </div>
              {data.fairValue ? (() => {
                const fv = data.fairValue
                const currentPrice = livePrice?.price
                const upside = fv.fairValue && currentPrice ? ((fv.fairValue - currentPrice) / currentPrice) * 100 : fv.upside
                const isUnder = upside > 0
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-600 mb-1">Fair Value</div>
                      <div className="flex items-end gap-2">
                        <span className="font-display font-bold text-[28px] text-slate-100 leading-none">{fv.fairValue ? '$' + fv.fairValue.toFixed(0) : '—'}</span>
                        {upside != null && (
                          <span className={`font-mono text-[13px] font-bold mb-0.5 ${isUnder ? 'positive' : 'negative'}`}>
                            {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className={`font-mono text-[10px] mt-1 ${isUnder ? 'text-terminal-green' : 'text-terminal-red'}`}>
                        {isUnder ? '▼ Undervalued' : '▲ Overvalued'}
                      </div>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="space-y-1.5">
                      {[
                        { label: 'Income Model',  value: fv.fairValueIncome  ? '$' + fv.fairValueIncome.toFixed(0)  : '—' },
                        { label: 'Revenue Model', value: fv.fairValueRevenue ? '$' + fv.fairValueRevenue.toFixed(0) : '—' },
                        { label: 'Current Price', value: currentPrice ? '$' + currentPrice.toFixed(2) : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between">
                          <span className="font-mono text-[10px] text-slate-500">{label}</span>
                          <span className="font-mono text-[11px] text-slate-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })() : <div className="font-mono text-[11px] text-slate-600">No fair value data</div>}
            </div>

            {/* Margins Trend */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-electric-400" />
                <span className="font-display font-semibold text-[13px] text-slate-200">Margins</span>
              </div>
              {data.margins ? (() => {
                const m = data.margins
                const trendIcon = (a, b) => a != null && b != null ? (a > b ? '▲' : a < b ? '▼' : '→') : ''
                const trendColor = (a, b) => a != null && b != null ? (a > b ? '#00ff88' : a < b ? '#ff4466' : '#64748b') : '#64748b'
                return (
                  <div className="space-y-3">
                    {[
                      { label: <InfoTip text={TOOLTIPS.grossMargin}>Gross Margin</InfoTip>, v1: m.gross1y, v3: m.gross3y },
                      { label: <InfoTip text={TOOLTIPS.ebitMargin}>EBIT Margin</InfoTip>,  v1: m.ebit1y,  v3: m.ebit3y  },
                      { label: <InfoTip text={TOOLTIPS.netMargin}>Net Margin</InfoTip>,   v1: m.net1y,   v3: m.net3y   },
                    ].map(({ label, v1, v3 }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-slate-500">{label}</span>
                          <div className="flex items-center gap-1.5">
                            {v3 != null && (
                              <span className="font-mono text-[9px] text-slate-600">3Y: {v3.toFixed(1)}%</span>
                            )}
                            <span style={{ color: trendColor(v1, v3) }} className="font-mono text-[10px]">
                              {trendIcon(v1, v3)}
                            </span>
                            <span className="font-mono text-[12px] font-semibold text-slate-200">
                              {v1 != null ? v1.toFixed(1) + '%' : '—'}
                            </span>
                          </div>
                        </div>
                        {v1 != null && (
                          <div className="h-1.5 bg-navy-800 rounded overflow-hidden">
                            <div className="h-full rounded" style={{ width: Math.min(v1, 100) + '%', background: trendColor(v1, v3) }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })() : <div className="font-mono text-[11px] text-slate-600">No margin data</div>}
            </div>

            {/* Growth Rates */}
            <div className="panel p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-terminal-green" />
                <span className="font-display font-semibold text-[13px] text-slate-200">Growth (CAGR)</span>
              </div>
              {data.growth ? (() => {
                const g = data.growth
                return (
                  <div className="space-y-2.5">
                    {[
                      { label: <InfoTip text={TOOLTIPS.revenueGrowth}>Revenue 3Y</InfoTip>,  value: g.revenue3y },
                      { label: <InfoTip text={TOOLTIPS.revenueGrowth}>Revenue 5Y</InfoTip>,  value: g.revenue5y },
                      { label: <InfoTip text={TOOLTIPS.earningsGrowth}>Earnings 3Y</InfoTip>, value: g.income3y  },
                      { label: <InfoTip text={TOOLTIPS.earningsGrowth}>Earnings 5Y</InfoTip>, value: g.income5y  },
                      { label: <InfoTip text={TOOLTIPS.ebitMargin}>EBIT 3Y</InfoTip>,     value: g.ebit3y    },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="font-mono text-[10px] text-slate-500">{label}</span>
                        <span className={`font-mono text-[12px] font-semibold ${value == null ? 'text-slate-600' : value >= 10 ? 'positive' : value >= 0 ? 'text-terminal-amber' : 'negative'}`}>
                          {value != null ? (value > 0 ? '+' : '') + value.toFixed(1) + '%' : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })() : <div className="font-mono text-[11px] text-slate-600">No growth data</div>}
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
function CompareView({ portfolio, watchlist, isMobile }) {
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
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
export default function WorkstationTab({ portfolio, watchlist, initialTicker, isMobile }) {
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
        ? <AnalyzeView portfolio={portfolio} watchlist={watchlist} initialTicker={initialTicker} isMobile={isMobile} />
        : <CompareView portfolio={portfolio} watchlist={watchlist} isMobile={isMobile} />
      }
    </div>
  )
}
