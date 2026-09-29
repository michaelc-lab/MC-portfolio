import { useState, useEffect, useCallback, useRef } from 'react'
import { APPS_SCRIPT_URL, jsonp } from '../lib/api'

const AUTO_REFRESH_MS = 5 * 60000

export function usePortfolioData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const lastRef = useRef(0)
  // quiet = background refresh: no loading screen, and a failure keeps the current data on screen
  const fetchData = useCallback(async (quiet) => {
    if (!quiet) { setLoading(true); setError(null) }
    try {
      const json = await jsonp(APPS_SCRIPT_URL + '?action=getAllData', { timeout: 60000, retryTimeout: 60000 })
      setData(json); const now = new Date(); setLastUpdated(now); lastRef.current = now.getTime(); setError(null)
    } catch (e) { if (!quiet) setError(e.message) }
    finally { if (!quiet) setLoading(false) }
  }, [])
  useEffect(() => { fetchData(false) }, [fetchData])
  // prices refresh by themselves every 5 min while the page is visible, and right away when you come back to it
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible' && lastRef.current && Date.now() - lastRef.current > AUTO_REFRESH_MS) fetchData(true) }
    const id = setInterval(tick, 60000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [fetchData])
  return { data, loading, error, lastUpdated, refresh: () => fetchData(false) }
}
export function fetchWorkstationData(ticker) { return jsonp(APPS_SCRIPT_URL + '?action=getWorkstationData&ticker=' + encodeURIComponent(ticker)) }
export function fetchCompareData(tickerA, tickerB) { return jsonp(APPS_SCRIPT_URL + '?action=getCompareData&tickerA=' + encodeURIComponent(tickerA) + '&tickerB=' + encodeURIComponent(tickerB)) }
