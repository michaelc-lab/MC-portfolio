import React from 'react'
import { useState } from 'react'
import { usePortfolioData } from './hooks/usePortfolioData'
import Header from './components/Header'
import LeadTab from './components/LeadTab'
import StockTable from './components/StockTable'
import WorkstationTab from './components/WorkstationTab'

const TABS = [
  { id: 'lead', label: 'Lead' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'workstation', label: 'Workstation' },
]

export default function App() {
  const { data, loading, error, lastUpdated, refresh } = usePortfolioData()
  const [tab, setTab] = useState('lead')
  const [wsAnalyzeTicker, setWsAnalyzeTicker] = useState(null)

  const portfolio = data?.portfolio || []
  const watchlist = data?.watchlist || []

  const handleAnalyze = (ticker) => {
    setWsAnalyzeTicker(ticker)
    setTab('workstation')
  }

  return (
    <div className="min-h-screen grid-bg scanline">
      <Header data={data} loading={loading} error={error} lastUpdated={lastUpdated} onRefresh={refresh} />

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/8 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 font-display font-medium text-[14px] tracking-tight border-b-2 transition-all ${tab === t.id ? 'tab-active' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-electric-500/30 border-t-electric-500 animate-spin" />
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-electric-400 animate-pulse cursor-blink">
              Loading portfolio
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="panel-bright p-8 text-center border-red-500/20">
            <div className="font-mono text-[11px] uppercase tracking-wider text-red-400 mb-2">Connection Error</div>
            <div className="font-mono text-[12px] text-slate-500 mb-4">{error}</div>
            <button onClick={refresh} className="btn-primary px-6 py-2 rounded font-mono text-[11px] uppercase tracking-wider">
              Retry
            </button>
          </div>
        )}

        {/* Tab content */}
        {data && !loading && (
          <>
            {tab === 'lead' && <LeadTab portfolio={portfolio} />}
            {tab === 'portfolio' && <StockTable rows={portfolio} isWatchlist={false} onAnalyze={handleAnalyze} />}
            {tab === 'watchlist' && <StockTable rows={watchlist} isWatchlist={true} onAnalyze={handleAnalyze} />}
            {tab === 'workstation' && <WorkstationTab portfolio={portfolio} watchlist={watchlist} initialTicker={wsAnalyzeTicker} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-[1600px] mx-auto px-6 py-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
        <div className="font-mono text-[10px] text-slate-700 uppercase tracking-[0.2em]">
          MC Portfolio · {lastUpdated ? lastUpdated.toLocaleString() : '—'}
        </div>
        <div className="font-mono text-[10px] text-slate-700 uppercase tracking-[0.2em]">
          Google Sheets · GOOGLEFINANCE · Finnhub · gold-api.com
        </div>
      </footer>
    </div>
  )
}
