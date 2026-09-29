import React, { useState, useEffect, Suspense, lazy } from 'react'
import { usePortfolioData } from './hooks/usePortfolioData'
import { useDevice } from './hooks/useDevice'
import Header from './components/Header'
import LeadTab from './components/LeadTab'
import StockTable from './components/StockTable'
// loaded on demand: the first screen appears without waiting for the charts
const loadWorkstation = () => import('./components/WorkstationTab')
const WorkstationTab = lazy(loadWorkstation)
const CustomPortfolios = lazy(() => import('./components/CustomPortfolios'))
import { SkeletonCard, SkeletonTable } from './components/Skeleton'

const TABS = [
  { id: 'lead',        label: 'Lead'         },
  { id: 'portfolio',   label: 'Portfolio'    },
  { id: 'watchlist',   label: 'Watchlist'    },
  { id: 'workstation', label: 'Workstation'  },
  { id: 'myportfolios',label: 'My Portfolios'},
]


class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Dashboard error:', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', background: '#020817', color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}>
        <div style={{ fontSize: 32 }}>⚠</div>
        <div style={{ fontSize: 14, color: '#e2e8f0' }}>Something went wrong showing this view.</div>
        <div style={{ fontSize: 11, color: '#475569', maxWidth: 480 }}>{this.state.error.message}</div>
        <button onClick={() => this.setState({ error: null })}
          style={{ marginTop: 8, padding: '10px 20px', borderRadius: 6, border: '1px solid rgba(14,165,233,0.4)', background: 'rgba(14,165,233,0.1)', color: '#38bdf8', fontFamily: 'inherit', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    )
  }
}



export default function App() {
  const { data, loading, error, lastUpdated, refresh } = usePortfolioData()

  // Hide splash only when data is ready or after 30 seconds max
  React.useEffect(() => {
    if (data || error) {
      if (window.__hideSplash) window.__hideSplash()
    }
  }, [data, error])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (window.__hideSplash) window.__hideSplash()
    }, 30000)
    return () => clearTimeout(timer)
  }, [])
  const { isMobile } = useDevice()
  // after the first screen is up, fetch the Analyze page quietly so opening it is still instant
  useEffect(() => { const t = setTimeout(() => { loadWorkstation().catch(() => {}) }, 2500); return () => clearTimeout(t) }, [])
  const [tab, setTab] = useState('lead')
  const [wsAnalyzeTicker, setWsAnalyzeTicker] = useState(null)

  const portfolio = data?.portfolio || []
  const watchlist = data?.watchlist || []
  const indexes   = data?.indexes   || {}

  const handleAnalyze = (ticker) => {
    setWsAnalyzeTicker(ticker)
    setTab('workstation')
  }

  return (
    <div className="min-h-screen grid-bg scanline">
      <Header data={data} loading={loading} error={error} lastUpdated={lastUpdated} onRefresh={refresh} isMobile={isMobile} />

      <main className={`w-full ${isMobile ? 'px-3 py-3' : 'px-6 py-6'}`}>
        {/* Tabs */}
        <div className={`flex border-b border-white/8 mb-4 ${isMobile ? 'overflow-x-auto scrollbar-hide gap-0' : 'gap-1'}`}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 font-display font-medium border-b-2 transition-all ${
                isMobile ? 'px-3 py-2.5 text-[12px]' : 'px-5 py-3 text-[14px]'
              } ${tab === t.id ? 'tab-active' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              {isMobile ? t.label.replace(' ', '\n') : t.label}
            </button>
          ))}
        </div>



        {/* Error */}
        {error && !loading && (
          <div className="panel-bright p-8 text-center border-red-500/20">
            <div className="font-mono text-[11px] uppercase tracking-wider text-red-400 mb-2">Connection Error</div>
            <div className="font-mono text-[12px] text-slate-500 mb-4">{error}</div>
            <button onClick={refresh} className="btn-primary px-6 py-2 rounded font-mono text-[11px] uppercase tracking-wider">Retry</button>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            <ErrorBoundary key={tab + ':' + (wsAnalyzeTicker || '')}>
              {tab === 'lead'         && <LeadTab portfolio={portfolio} indexes={indexes} onAnalyze={handleAnalyze} isMobile={isMobile} />}
              {tab === 'portfolio'    && <StockTable rows={portfolio} isWatchlist={false} onAnalyze={handleAnalyze} isMobile={isMobile} />}
              {tab === 'watchlist'    && <StockTable rows={watchlist}  isWatchlist={true}  onAnalyze={handleAnalyze} isMobile={isMobile} />}
              <Suspense fallback={<div className="space-y-4"><SkeletonCard /><SkeletonTable /></div>}>
                {tab === 'workstation'  && <WorkstationTab portfolio={portfolio} watchlist={watchlist} initialTicker={wsAnalyzeTicker} isMobile={isMobile} />}
                {tab === 'myportfolios' && <CustomPortfolios onAnalyze={handleAnalyze} isMobile={isMobile} />}
              </Suspense>
            </ErrorBoundary>
          </>
        )}
      </main>

      {!isMobile && (
        <footer className="w-full px-6 py-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div className="font-mono text-[10px] text-slate-700 uppercase tracking-[0.2em]">
            MC Portfolio · {lastUpdated ? lastUpdated.toLocaleString() : '—'}
          </div>
          <div className="font-mono text-[10px] text-slate-700 uppercase tracking-[0.2em]">
            Google Sheets · Finnhub · Eulerpool · gold-api.com
          </div>
        </footer>
      )}
    </div>
  )
}
