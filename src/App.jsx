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

        {/* Loading skeleton — show immediately on first load */}
        {loading && !data && <LoadingSkeleton isMobile={isMobile} />}
        {!loading && !data && !error && <LoadingSkeleton isMobile={isMobile} />}

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
