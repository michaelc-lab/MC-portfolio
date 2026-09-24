import React, { useState } from 'react'
import { usePortfolioData } from './hooks/usePortfolioData'
import { useDevice } from './hooks/useDevice'
import Header from './components/Header'
import LeadTab from './components/LeadTab'
import StockTable from './components/StockTable'
import WorkstationTab from './components/WorkstationTab'
import CustomPortfolios from './components/CustomPortfolios'
import { SkeletonCard, SkeletonTable } from './components/Skeleton'

const TABS = [
  { id: 'lead',        label: 'Lead'         },
  { id: 'portfolio',   label: 'Portfolio'    },
  { id: 'watchlist',   label: 'Watchlist'    },
  { id: 'workstation', label: 'Workstation'  },
  { id: 'myportfolios',label: 'My Portfolios'},
]


function SplashScreen() {
  const [dot, setDot] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setDot(d => (d + 1) % 4), 400)
    return () => clearInterval(id)
  }, [])
  const dots = '.'.repeat(dot)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #020817 0%, #060d1f 50%, #0a1628 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 32,
    }}>
      {/* Animated logo */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid rgba(14,165,233,0.3)',
          background: 'rgba(14,165,233,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(14,165,233,0.2)',
          animation: 'splashGlow 2s ease-in-out infinite',
        }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 28, color: '#38bdf8' }}>MC</span>
        </div>
        {/* Spinning ring */}
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#0ea5e9',
          borderRightColor: 'rgba(14,165,233,0.3)',
          animation: 'spin 1.2s linear infinite',
        }} />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 28, color: 'white', letterSpacing: '-0.5px' }}>
          MC <span style={{ color: '#38bdf8', fontWeight: 300, fontStyle: 'italic' }}>Portfolio</span>
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#334155', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 6 }}>
          Live · Multi-Sector · Real-Time
        </div>
      </div>

      {/* Loading bar */}
      <div style={{ width: 200, height: 2, background: 'rgba(14,165,233,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
          animation: 'loadBar 1.5s ease-in-out infinite',
        }} />
      </div>

      {/* Status text */}
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Loading market data{dots}
      </div>

      <style>{`
        @keyframes splashGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(14,165,233,0.2); }
          50% { box-shadow: 0 0 50px rgba(14,165,233,0.5), 0 0 80px rgba(14,165,233,0.2); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes loadBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}

function LoadingSkeleton({ isMobile }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <SkeletonCard /><SkeletonCard />
        {!isMobile && <SkeletonCard />}
      </div>
      <SkeletonTable rows={isMobile ? 4 : 6} />
      <SkeletonTable rows={isMobile ? 3 : 5} />
    </div>
  )
}

export default function App() {
  const { data, loading, error, lastUpdated, refresh } = usePortfolioData()

  // Hide the HTML splash screen as soon as React renders
  React.useEffect(() => {
    if (window.__hideSplash) window.__hideSplash()
  }, [])
  const { isMobile, isSmall } = useDevice()
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

      <main className={`max-w-[1600px] mx-auto ${isMobile ? 'px-3 py-3' : 'px-6 py-6'}`}>
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
            {tab === 'lead'         && <LeadTab portfolio={portfolio} indexes={indexes} onAnalyze={handleAnalyze} isMobile={isMobile} />}
            {tab === 'portfolio'    && <StockTable rows={portfolio} isWatchlist={false} onAnalyze={handleAnalyze} isMobile={isMobile} />}
            {tab === 'watchlist'    && <StockTable rows={watchlist}  isWatchlist={true}  onAnalyze={handleAnalyze} isMobile={isMobile} />}
            {tab === 'workstation'  && <WorkstationTab portfolio={portfolio} watchlist={watchlist} initialTicker={wsAnalyzeTicker} isMobile={isMobile} />}
            {tab === 'myportfolios' && <CustomPortfolios onAnalyze={handleAnalyze} isMobile={isMobile} />}
          </>
        )}
      </main>

      {!isMobile && (
        <footer className="max-w-[1600px] mx-auto px-6 py-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
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
